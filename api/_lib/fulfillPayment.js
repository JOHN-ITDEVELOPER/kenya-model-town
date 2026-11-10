import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export const PASS_DURATION_DAYS = 90;

const toMillisSafe = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.seconds === 'number') return val.seconds * 1000;
  const parsed = Date.parse(val);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Idempotently finalize a Daraja STK Push transaction and grant the user's
 * challenge unlock or 90-day pass inside an atomic Firestore transaction.
 */
export async function fulfillPaymentTransaction(
  adminDb,
  {
    checkoutRequestId,
    resultCode,
    resultDesc = '',
    mpesaReceiptNumber = null,
    transactionDate = null,
    paidAmount = null
  }
) {
  if (!checkoutRequestId) {
    throw new Error('checkoutRequestId is required.');
  }

  const paymentRef = adminDb.collection('payments').doc(checkoutRequestId);

  return adminDb.runTransaction(async (tx) => {
    const paymentSnap = await tx.get(paymentRef);
    if (!paymentSnap.exists) {
      return { found: false, status: 'NOT_FOUND' };
    }

    const payment = paymentSnap.data();

    // Prevent duplicate granting if webhook + polling race
    if (payment.fulfilled === true && payment.status === 'COMPLETED') {
      return {
        found: true,
        alreadyFulfilled: true,
        status: 'COMPLETED',
        payment
      };
    }

    const numericCode = Number(resultCode);

    if (numericCode === 0) {
      // Guard against partial/tampered amount callbacks
      if (
        paidAmount !== null &&
        paidAmount !== undefined &&
        Number(paidAmount) < Number(payment.amount)
      ) {
        tx.update(paymentRef, {
          status: 'FAILED',
          fulfilled: false,
          resultCode: numericCode,
          resultDesc: `Paid amount KES ${paidAmount} is less than required KES ${payment.amount}.`,
          updatedAt: FieldValue.serverTimestamp()
        });
        return {
          found: true,
          status: 'FAILED',
          resultDesc: 'Amount mismatch'
        };
      }

      const userRef = adminDb.collection('users').doc(payment.uid);
      const userSnap = await tx.get(userRef);
      const userData = userSnap.exists ? userSnap.data() : null;

      const userUpdates = {
        uid: payment.uid,
        lastSeenAt: FieldValue.serverTimestamp(),
        lastPaymentAt: FieldValue.serverTimestamp()
      };

      if (payment.plan === 'single' && payment.challengeId) {
        userUpdates.unlockedChallengeIds = FieldValue.arrayUnion(payment.challengeId);
      } else if (payment.plan === 'pass90') {
        const currentExpMs = toMillisSafe(userData?.passExpiresAt);
        const baseMs = Math.max(Date.now(), currentExpMs);
        const nextExpMs = baseMs + PASS_DURATION_DAYS * 24 * 60 * 60 * 1000;
        userUpdates.passExpiresAt = Timestamp.fromMillis(nextExpMs);
      }

      if (!userSnap.exists) {
        userUpdates.email = payment.userEmail || '';
        userUpdates.displayName = payment.userName || 'Student Driver';
        userUpdates.role = 'student';
        userUpdates.createdAt = FieldValue.serverTimestamp();
        userUpdates.completedChallenges = [];
        userUpdates.totalAttempts = 0;
        userUpdates.totalPassed = 0;
        if (!userUpdates.unlockedChallengeIds) {
          userUpdates.unlockedChallengeIds = [];
        }
        tx.set(userRef, userUpdates, { merge: true });
      } else {
        tx.update(userRef, userUpdates);
      }

      const completionUpdates = {
        status: 'COMPLETED',
        fulfilled: true,
        resultCode: 0,
        resultDesc: resultDesc || 'The service request is processed successfully.',
        mpesaReceiptNumber: mpesaReceiptNumber || payment.mpesaReceiptNumber || null,
        transactionDate: transactionDate || payment.transactionDate || null,
        paidAmount: paidAmount ?? payment.amount,
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };

      tx.update(paymentRef, completionUpdates);

      return {
        found: true,
        alreadyFulfilled: false,
        status: 'COMPLETED',
        mpesaReceiptNumber: completionUpdates.mpesaReceiptNumber,
        resultDesc: completionUpdates.resultDesc
      };
    }

    // Non-zero terminal code (e.g. 1032 cancelled by user, 1037 timeout, 1 insufficient balance)
    const terminalStatus = numericCode === 1032 ? 'CANCELLED' : 'FAILED';
    tx.update(paymentRef, {
      status: terminalStatus,
      fulfilled: false,
      resultCode: numericCode,
      resultDesc: resultDesc || 'M-Pesa payment was not completed.',
      updatedAt: FieldValue.serverTimestamp()
    });

    return {
      found: true,
      alreadyFulfilled: false,
      status: terminalStatus,
      resultCode: numericCode,
      resultDesc: resultDesc || 'M-Pesa payment was not completed.'
    };
  });
}

