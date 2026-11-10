import { toFirestoreFields, fsTimestamp } from './firebaseAdmin.js';

export const PASS_DURATION_DAYS = 90;

export const toMillisSafe = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.seconds === 'number') return val.seconds * 1000;
  const parsed = Date.parse(val);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Idempotently finalize a Daraja STK Push transaction and grant the user's
 * challenge unlock or 90-day pass using an atomic Firestore `:commit` with
 * optimistic concurrency checks (`currentDocument.updateTime`).
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

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const paymentSnap = await adminDb.getDoc('payments', checkoutRequestId);
    if (!paymentSnap.exists) {
      return { found: false, status: 'NOT_FOUND' };
    }

    const payment = paymentSnap.data;

    // Prevent duplicate granting if callback + polling race
    if (payment.fulfilled === true && payment.status === 'COMPLETED') {
      return {
        found: true,
        alreadyFulfilled: true,
        status: 'COMPLETED',
        payment
      };
    }

    const numericCode = Number(resultCode);
    const nowTs = fsTimestamp(new Date());
    const paymentDocName = adminDb.docName('payments', checkoutRequestId);
    const paymentPrecondition = paymentSnap.updateTime
      ? { updateTime: paymentSnap.updateTime }
      : { exists: true };

    try {
      if (numericCode === 0) {
        // Guard against partial/tampered amount callbacks
        if (
          paidAmount !== null &&
          paidAmount !== undefined &&
          Number(paidAmount) < Number(payment.amount)
        ) {
          const mismatchFields = {
            status: 'FAILED',
            fulfilled: false,
            resultCode: numericCode,
            resultDesc: `Paid amount KES ${paidAmount} is less than required KES ${payment.amount}.`,
            updatedAt: nowTs
          };
          await adminDb.commitWrites([
            {
              update: {
                name: paymentDocName,
                fields: toFirestoreFields(mismatchFields)
              },
              updateMask: { fieldPaths: Object.keys(mismatchFields) },
              currentDocument: paymentPrecondition
            }
          ]);
          return {
            found: true,
            status: 'FAILED',
            resultDesc: 'Amount mismatch'
          };
        }

        const userSnap = await adminDb.getDoc('users', payment.uid);
        const userDocName = adminDb.docName('users', payment.uid);
        const userData = userSnap.exists ? userSnap.data : null;

        let nextPassTs = null;
        if (payment.plan === 'pass90') {
          const currentExpMs = toMillisSafe(userData?.passExpiresAt);
          const baseMs = Math.max(Date.now(), currentExpMs);
          nextPassTs = fsTimestamp(baseMs + PASS_DURATION_DAYS * 24 * 60 * 60 * 1000);
        }

        let userWrite;
        if (!userSnap.exists) {
          const newUserFields = {
            uid: payment.uid,
            email: payment.userEmail || '',
            displayName: payment.userName || 'Student Driver',
            role: 'student',
            createdAt: nowTs,
            lastSeenAt: nowTs,
            lastPaymentAt: nowTs,
            completedChallenges: [],
            unlockedChallengeIds:
              payment.plan === 'single' && payment.challengeId
                ? [payment.challengeId]
                : [],
            passExpiresAt: nextPassTs,
            totalAttempts: 0,
            totalPassed: 0
          };
          userWrite = {
            update: {
              name: userDocName,
              fields: toFirestoreFields(newUserFields)
            },
            currentDocument: { exists: false }
          };
        } else {
          const userUpdateFields = {
            uid: payment.uid,
            lastSeenAt: nowTs,
            lastPaymentAt: nowTs
          };
          if (nextPassTs) {
            userUpdateFields.passExpiresAt = nextPassTs;
          }
          userWrite = {
            update: {
              name: userDocName,
              fields: toFirestoreFields(userUpdateFields)
            },
            updateMask: { fieldPaths: Object.keys(userUpdateFields) },
            currentDocument: userSnap.updateTime
              ? { updateTime: userSnap.updateTime }
              : { exists: true }
          };
          if (payment.plan === 'single' && payment.challengeId) {
            userWrite.updateTransforms = [
              {
                fieldPath: 'unlockedChallengeIds',
                appendMissingElements: {
                  values: [{ stringValue: payment.challengeId }]
                }
              }
            ];
          }
        }

        const completionFields = {
          status: 'COMPLETED',
          fulfilled: true,
          resultCode: 0,
          resultDesc: resultDesc || 'The service request is processed successfully.',
          mpesaReceiptNumber: mpesaReceiptNumber || payment.mpesaReceiptNumber || null,
          transactionDate: transactionDate || payment.transactionDate || null,
          paidAmount: paidAmount ?? payment.amount,
          completedAt: nowTs,
          updatedAt: nowTs
        };

        const paymentWrite = {
          update: {
            name: paymentDocName,
            fields: toFirestoreFields(completionFields)
          },
          updateMask: { fieldPaths: Object.keys(completionFields) },
          currentDocument: paymentPrecondition
        };

        await adminDb.commitWrites([paymentWrite, userWrite]);

        return {
          found: true,
          alreadyFulfilled: false,
          status: 'COMPLETED',
          mpesaReceiptNumber: completionFields.mpesaReceiptNumber,
          resultDesc: completionFields.resultDesc
        };
      }

      // Non-zero terminal code (e.g. 1032 cancelled by user, 1037 timeout, 1 insufficient balance)
      const terminalStatus = numericCode === 1032 ? 'CANCELLED' : 'FAILED';
      const failedFields = {
        status: terminalStatus,
        fulfilled: false,
        resultCode: numericCode,
        resultDesc: resultDesc || 'M-Pesa payment was not completed.',
        updatedAt: nowTs
      };

      await adminDb.commitWrites([
        {
          update: {
            name: paymentDocName,
            fields: toFirestoreFields(failedFields)
          },
          updateMask: { fieldPaths: Object.keys(failedFields) },
          currentDocument: paymentPrecondition
        }
      ]);

      return {
        found: true,
        alreadyFulfilled: false,
        status: terminalStatus,
        resultCode: numericCode,
        resultDesc: failedFields.resultDesc
      };
    } catch (err) {
      if (err.isConflict && attempt < 2) {
        continue;
      }
      throw err;
    }
  }

  throw new Error('Could not finalize payment due to concurrent update.');
}
