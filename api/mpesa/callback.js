import { getFirebaseAdmin } from '../_lib/firebaseAdmin.js';
import { getDarajaConfig, extractCallbackMetadata } from '../_lib/daraja.js';
import { fulfillPaymentTransaction } from '../_lib/fulfillPayment.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ResultCode: 1, ResultDesc: 'Method not allowed' });
  }

  try {
    const rawBody =
      typeof req.body === 'string' && req.body.trim()
        ? JSON.parse(req.body)
        : req.body;
    const stkCallback = rawBody?.Body?.stkCallback;
    const checkoutRequestId = stkCallback?.CheckoutRequestID;
    const merchantRequestId = stkCallback?.MerchantRequestID;

    if (!stkCallback || !checkoutRequestId || !merchantRequestId) {
      return res.status(400).json({
        ResultCode: 1,
        ResultDesc: 'Malformed M-Pesa STK callback payload.'
      });
    }

    const cfg = getDarajaConfig();
    if (cfg.callbackSecret && req.query?.secret !== cfg.callbackSecret) {
      return res.status(403).json({
        ResultCode: 1,
        ResultDesc: 'Forbidden callback secret.'
      });
    }

    const { adminDb } = getFirebaseAdmin();
    const internalSnap = await adminDb
      .collection('mpesa_internal')
      .doc(checkoutRequestId)
      .get();

    if (!internalSnap.exists) {
      return res.status(404).json({
        ResultCode: 1,
        ResultDesc: 'Unknown transaction.'
      });
    }

    const internalData = internalSnap.data();

    if (internalData.merchantRequestId !== merchantRequestId) {
      return res.status(403).json({
        ResultCode: 1,
        ResultDesc: 'MerchantRequestID mismatch.'
      });
    }

    if (internalData.callbackNonce && req.query?.nonce !== internalData.callbackNonce) {
      return res.status(403).json({
        ResultCode: 1,
        ResultDesc: 'Invalid callback nonce.'
      });
    }

    const metadata = extractCallbackMetadata(stkCallback.CallbackMetadata?.Item);

    await fulfillPaymentTransaction(adminDb, {
      checkoutRequestId,
      resultCode: stkCallback.ResultCode,
      resultDesc: stkCallback.ResultDesc || '',
      mpesaReceiptNumber: metadata.mpesaReceiptNumber,
      transactionDate: metadata.transactionDate,
      paidAmount: metadata.amount
    });

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Accepted'
    });
  } catch (err) {
    console.error('M-Pesa callback processing error:', err);
    return res.status(500).json({
      ResultCode: 1,
      ResultDesc: 'Internal server error'
    });
  }
}
