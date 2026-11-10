import {
  getFirebaseAdmin,
  verifyFirebaseBearerToken,
  toFirestoreFields,
  fsTimestamp
} from '../_lib/firebaseAdmin.js';
import {
  getDarajaConfig,
  assertDarajaConfigured,
  normalizeKenyanPhone,
  generateCallbackNonce,
  resolveCallbackUrl,
  initiateStkPush
} from '../_lib/daraja.js';
import { toMillisSafe } from '../_lib/fulfillPayment.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const decodedUser = await verifyFirebaseBearerToken(req);
    const { adminDb } = getFirebaseAdmin();
    const cfg = getDarajaConfig();
    assertDarajaConfigured(cfg);

    const rawBody =
      typeof req.body === 'string' && req.body.trim()
        ? JSON.parse(req.body)
        : req.body || {};
    const { plan, challengeId, phoneNumber } = rawBody;

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

    const userSnap = await adminDb.getDoc('users', decodedUser.uid);
    const userData = userSnap.exists ? userSnap.data : null;

    if (toMillisSafe(userData?.passExpiresAt) > Date.now() && plan === 'single') {
      return res.status(409).json({
        error: 'Your 90-Day Pass is already active and unlocks every custom challenge.'
      });
    }

    if (plan === 'pass90') {
      const settingsSnap = await adminDb.getDoc('settings', 'monetization');
      const configuredPrice = settingsSnap.exists
        ? Number(settingsSnap.data?.passPriceKes)
        : 300;
      amount = Math.round(configuredPrice > 0 ? configuredPrice : 300);
      accountReference = 'NTSA-90D';
      transactionDesc = '90-Day Full MTB Pass';
    } else {
      if (!challengeId || typeof challengeId !== 'string') {
        return res.status(400).json({ error: 'Challenge ID is required for single unlock.' });
      }
      const challengeSnap = await adminDb.getDoc('challenges', challengeId);
      if (!challengeSnap.exists) {
        return res.status(404).json({ error: 'Custom challenge not found.' });
      }
      const chData = challengeSnap.data;
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

    const nowTs = fsTimestamp(new Date());

    const paymentFields = {
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
      createdAt: nowTs,
      updatedAt: nowTs,
      completedAt: null
    };

    const internalFields = {
      checkoutRequestId,
      merchantRequestId,
      callbackNonce: nonce,
      uid: decodedUser.uid,
      createdAt: nowTs
    };

    await adminDb.commitWrites([
      {
        update: {
          name: adminDb.docName('payments', checkoutRequestId),
          fields: toFirestoreFields(paymentFields)
        }
      },
      {
        update: {
          name: adminDb.docName('mpesa_internal', checkoutRequestId),
          fields: toFirestoreFields(internalFields)
        }
      }
    ]);

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
