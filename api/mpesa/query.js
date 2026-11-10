import {
  getFirebaseAdmin,
  verifyFirebaseBearerToken
} from '../_lib/firebaseAdmin.js';
import {
  getDarajaConfig,
  assertDarajaConfigured,
  queryStkPushStatus
} from '../_lib/daraja.js';
import { fulfillPaymentTransaction } from '../_lib/fulfillPayment.js';

const ADMIN_EMAIL = (
  process.env.VITE_ADMIN_EMAIL ||
  process.env.ADMIN_EMAIL ||
  'johnnjenga7852@gmail.com'
).toLowerCase();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const decodedUser = await verifyFirebaseBearerToken(req);
    const { checkoutRequestId } = req.body || {};
    if (!checkoutRequestId || typeof checkoutRequestId !== 'string') {
      return res.status(400).json({ error: 'checkoutRequestId is required.' });
    }

    const { adminDb } = getFirebaseAdmin();
    const paymentSnap = await adminDb.collection('payments').doc(checkoutRequestId).get();
    if (!paymentSnap.exists) {
      return res.status(404).json({ error: 'Payment transaction not found.' });
    }

    const payment = paymentSnap.data();
    const isAdmin = (decodedUser.email || '').toLowerCase() === ADMIN_EMAIL;
    if (payment.uid !== decodedUser.uid && !isAdmin) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Already finalized (e.g. via Daraja webhook callback)
    if (payment.status !== 'PENDING') {
      return res.status(200).json({
        status: payment.status,
        fulfilled: Boolean(payment.fulfilled),
        mpesaReceiptNumber: payment.mpesaReceiptNumber || null,
        resultDesc: payment.resultDesc || '',
        stillProcessing: false
      });
    }

    // Query Safaricom Daraja STK Status API directly (fallback if callback is slow or local dev)
    const cfg = getDarajaConfig();
    assertDarajaConfigured(cfg);

    const statusResult = await queryStkPushStatus({ cfg, checkoutRequestId });
    if (statusResult.stillProcessing) {
      return res.status(200).json({
        status: 'PENDING',
        fulfilled: false,
        stillProcessing: true,
        resultDesc: statusResult.resultDesc
      });
    }

    const finalized = await fulfillPaymentTransaction(adminDb, {
      checkoutRequestId,
      resultCode: statusResult.resultCode,
      resultDesc: statusResult.resultDesc,
      mpesaReceiptNumber: payment.mpesaReceiptNumber || null,
      paidAmount: payment.amount
    });

    return res.status(200).json({
      status: finalized.status,
      fulfilled: finalized.status === 'COMPLETED',
      mpesaReceiptNumber: finalized.mpesaReceiptNumber || null,
      resultDesc: finalized.resultDesc || statusResult.resultDesc || '',
      stillProcessing: false
    });
  } catch (err) {
    console.error('STK Query error:', err);
    return res.status(err.statusCode || 500).json({
      error: err.message || 'Could not query M-Pesa payment status.'
    });
  }
}

