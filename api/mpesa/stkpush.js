import { FieldValue } from 'firebase-admin/firestore';
import {
  getFirebaseAdmin,
  verifyFirebaseBearerToken
} from '../_lib/firebaseAdmin.js';
import {
  getDarajaConfig,
  assertDarajaConfigured,
  normalizeKenyanPhone,
  generateCallbackNonce,
  resolveCallbackUrl,
  initiateStkPush
} from '../_lib/daraja.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const decodedUser = await verifyFirebaseBearerToken(req);
    const { adminDb } = getFirebaseAdmin();
    const cfg = getDarajaConfig();
    assertDarajaConfigured(cfg);

    const { plan, challengeId, phoneNumber } = req.body || {};
    if (plan !== 'single' && plan !== 'pass90') {
      return res.status(400).json({
        error: 'Invalid payment plan. Choose either single challenge or 90-day pass.'
      });
    }

    const normalizedPhone = normalizeKenyanPhone(phoneNumber);

    // Fetch authoritative server-side pricing from Firestore (never trust client price)
    let amount = 0;
    let resolvedChallengeId = null;
    let challengeTitle = null;
    let accountReference = 'NTSA-MTB';
    let transactionDesc = 'NTSA MTB Access';

    const userRef = adminDb.collection('users').doc(decodedUser.uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : null;

    if (userData?.passExpiresAt?.toMillis && userData.passExpiresAt.toMillis() > Date.now() && plan === 'single') {
      return res.status(409).json({
        error: 'Your 90-Day Pass is already active and unlocks every custom challenge.'
      });
    }

    if (plan === 'pass90') {
      const settingsSnap = await adminDb.collection('settings').doc('monetization').get();
      const configuredPrice = settingsSnap.exists
        ? Number(settingsSnap.data()?.passPriceKes)
        : 300;
      amount = Math.round(configuredPrice > 0 ? configuredPrice : 300);
      accountReference = 'NTSA-90D';
      transactionDesc = '90-Day Full MTB Pass';
    } else {
      if (!challengeId || typeof challengeId !== 'string') {
        return res.status(400).json({ error: 'Challenge ID is required for single unlock.' });
      }
      const challengeSnap = await adminDb.collection('challenges').doc(challengeId).get();
      if (!challengeSnap.exists) {
        return res.status(404).json({ error: 'Custom challenge not found.' });
      }
      const chData = challengeSnap.data();
      amount = Math.round(Number(chData?.price) || 0);
      if (amount < 1) {
        return res.status(400).json({
          error: 'This challenge is free and does not require M-Pesa payment.'
        });
      }
      if (userData?.unlockedChallengeIds?.includes(challengeId)) {
        return res.status(409).json({
          error: 'You have already unlocked this challenge. Close this popup to play.'
        });
      }
      resolvedChallengeId = challengeId;
      challengeTitle = chData?.title || 'Custom Challenge';
      accountReference = `NTSA-${challengeId.slice(0, 6).toUpperCase()}`;
      transactionDesc = `Unlock ${challengeTitle}`.slice(0, 32);
    }

    if (amount < 1) {
      return res.status(400).json({ error: 'Payment amount must be at least KES 1.' });
    }

    const nonce = generateCallbackNonce();
    const callbackUrl = resolveCallbackUrl(req, cfg, nonce);

    const stkResult = await initiateStkPush({
      cfg,
      phoneNumber: normalizedPhone,
      amount,
      accountReference,
      transactionDesc,
      callbackUrl
    });

    const checkoutRequestId = stkResult.CheckoutRequestID;
    const merchantRequestId = stkResult.MerchantRequestID;

    if (!checkoutRequestId || !merchantRequestId) {
      return res.status(502).json({
        error: 'Daraja returned an incomplete STK Push response.'
      });
    }

    const batch = adminDb.batch();
    const paymentRef = adminDb.collection('payments').doc(checkoutRequestId);
    const internalRef = adminDb.collection('mpesa_internal').doc(checkoutRequestId);

    batch.set(paymentRef, {
      checkoutRequestId,
      uid: decodedUser.uid,
      userEmail: decodedUser.email || '',
      userName: decodedUser.name || userData?.displayName || 'Student Driver',
      plan,
      challengeId: resolvedChallengeId,
      challengeTitle,
      amount,
      phoneNumber: normalizedPhone,
      environment: cfg.env,
      status: 'PENDING',
      fulfilled: false,
      mpesaReceiptNumber: null,
      transactionDate: null,
      resultCode: null,
      resultDesc: null,
      customerMessage:
        stkResult.CustomerMessage ||
        'Success. Request accepted for processing.',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: null
    });

    batch.set(internalRef, {
      checkoutRequestId,
      merchantRequestId,
      callbackNonce: nonce,
      uid: decodedUser.uid,
      createdAt: FieldValue.serverTimestamp()
    });

    await batch.commit();

    return res.status(200).json({
      checkoutRequestId,
      amount,
      plan,
      challengeId: resolvedChallengeId,
      challengeTitle,
      environment: cfg.env,
      customerMessage:
        stkResult.CustomerMessage ||
        'Check your phone and enter your M-Pesa PIN to complete payment.'
    });
  } catch (err) {
    console.error('STK Push initiation error:', err);
    return res.status(err.statusCode || 500).json({
      error: err.message || 'Could not start M-Pesa STK Push.'
    });
  }
}

