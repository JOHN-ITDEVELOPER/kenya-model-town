import crypto from 'crypto';

export function getDarajaConfig() {
  const env =
    (process.env.DARAJA_ENV || process.env.MPESA_ENV || 'sandbox').toLowerCase() ===
    'production'
      ? 'production'
      : 'sandbox';

  const baseUrl =
    env === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

  const shortCode =
    process.env.DARAJA_SHORTCODE ||
    process.env.MPESA_SHORTCODE ||
    (env === 'sandbox' ? '174379' : '');

  const partyB =
    process.env.DARAJA_PARTY_B ||
    process.env.MPESA_PARTY_B ||
    shortCode;

  return {
    env,
    baseUrl,
    consumerKey: (process.env.DARAJA_CONSUMER_KEY || process.env.MPESA_CONSUMER_KEY || '').trim(),
    consumerSecret: (process.env.DARAJA_CONSUMER_SECRET || process.env.MPESA_CONSUMER_SECRET || '').trim(),
    passkey: (process.env.DARAJA_PASSKEY || process.env.MPESA_PASSKEY || '').trim(),
    shortCode: shortCode.trim(),
    partyB: partyB.trim(),
    transactionType: (
      process.env.DARAJA_TRANSACTION_TYPE ||
      process.env.MPESA_TRANSACTION_TYPE ||
      'CustomerPayBillOnline'
    ).trim(),
    callbackUrl: (process.env.DARAJA_CALLBACK_URL || process.env.MPESA_CALLBACK_URL || '').trim(),
    callbackSecret: (process.env.DARAJA_CALLBACK_SECRET || '').trim()
  };
}

export function assertDarajaConfigured(cfg) {
  const missing = [];
  if (!cfg.consumerKey) missing.push('DARAJA_CONSUMER_KEY');
  if (!cfg.consumerSecret) missing.push('DARAJA_CONSUMER_SECRET');
  if (!cfg.passkey) missing.push('DARAJA_PASSKEY');
  if (!cfg.shortCode) missing.push('DARAJA_SHORTCODE');
  if (missing.length > 0) {
    const err = new Error(
      `Daraja M-Pesa credentials missing on server: ${missing.join(', ')}.`
    );
    err.statusCode = 500;
    throw err;
  }
}

/**
 * Normalize Kenyan Safaricom phone numbers into 2547XXXXXXXX or 2541XXXXXXXX.
 */
export function normalizeKenyanPhone(phoneInput) {
  const raw = String(phoneInput || '').replace(/[\s\-()+]/g, '');
  let normalized = raw;

  if (/^0(7|1)\d{8}$/.test(raw)) {
    normalized = `254${raw.slice(1)}`;
  } else if (/^(7|1)\d{8}$/.test(raw)) {
    normalized = `254${raw}`;
  }

  if (!/^254(7|1)\d{8}$/.test(normalized)) {
    const err = new Error(
      'Enter a valid Kenyan Safaricom number (e.g. 0712345678, 0112345678, or 254712345678).'
    );
    err.statusCode = 400;
    throw err;
  }

  return normalized;
}

/**
 * Format timestamp as YYYYMMDDHHmmss in Africa/Nairobi (UTC+3).
 */
export function getDarajaTimestamp(date = new Date()) {
  const nairobi = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return [
    nairobi.getUTCFullYear(),
    pad(nairobi.getUTCMonth() + 1),
    pad(nairobi.getUTCDate()),
    pad(nairobi.getUTCHours()),
    pad(nairobi.getUTCMinutes()),
    pad(nairobi.getUTCSeconds())
  ].join('');
}

export function generateDarajaPassword(shortCode, passkey, timestamp) {
  return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
}

export function generateCallbackNonce() {
  return crypto.randomBytes(16).toString('hex');
}

export function resolveCallbackUrl(req, cfg, nonce) {
  let baseCallback = cfg.callbackUrl;

  if (!baseCallback) {
    const forwardedHost = req.headers?.['x-forwarded-host'] || req.headers?.host || '';
    const isLocalHost =
      !forwardedHost ||
      forwardedHost.includes('localhost') ||
      forwardedHost.includes('127.0.0.1');

    if (!isLocalHost) {
      baseCallback = `https://${forwardedHost}/api/mpesa/callback`;
    } else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      baseCallback = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/mpesa/callback`;
    } else if (process.env.VERCEL_URL) {
      baseCallback = `https://${process.env.VERCEL_URL}/api/mpesa/callback`;
    }
  }

  if (
    !baseCallback ||
    !baseCallback.startsWith('https://') ||
    baseCallback.includes('localhost') ||
    baseCallback.includes('127.0.0.1')
  ) {
    const err = new Error(
      'Daraja requires a public HTTPS CallBackURL. Set DARAJA_CALLBACK_URL in .env (for example your deployed Vercel URL https://your-app.vercel.app/api/mpesa/callback or an ngrok HTTPS URL).'
    );
    err.statusCode = 400;
    throw err;
  }

  const url = new URL(baseCallback);
  url.searchParams.set('nonce', nonce);
  if (cfg.callbackSecret) {
    url.searchParams.set('secret', cfg.callbackSecret);
  }
  return url.toString();
}

export async function getDarajaAccessToken(cfg) {
  const credentials = Buffer.from(
    `${cfg.consumerKey}:${cfg.consumerSecret}`
  ).toString('base64');

  const response = await fetch(
    `${cfg.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`
      }
    }
  );

  const text = await response.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.errorMessage ||
        data.error_description ||
        `Failed to obtain Daraja OAuth token (HTTP ${response.status}).`
    );
  }

  return data.access_token;
}

function formatDarajaErrorMessage(data, fallback, envName) {
  if (data?.errorCode === '404.001.03') {
    return `Daraja 404.001.03 ("Invalid Access Token") on ${envName}: Your app OAuth key works, but "Lipa Na M-Pesa Sandbox" (M-Pesa Express / STK Push) is not enabled under Products for this App on developer.safaricom.co.ke (or DARAJA_ENV mismatches your keys).`;
  }
  return data?.errorMessage || data?.ResponseDescription || fallback;
}

export async function initiateStkPush({
  cfg,
  phoneNumber,
  amount,
  accountReference,
  transactionDesc,
  callbackUrl
}) {
  const accessToken = await getDarajaAccessToken(cfg);
  const timestamp = getDarajaTimestamp();
  const password = generateDarajaPassword(cfg.shortCode, cfg.passkey, timestamp);

  const payload = {
    BusinessShortCode: cfg.shortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: cfg.transactionType,
    Amount: Math.round(Number(amount)),
    PartyA: phoneNumber,
    PartyB: cfg.partyB,
    PhoneNumber: phoneNumber,
    CallBackURL: callbackUrl,
    AccountReference: String(accountReference || 'NTSA-MTB').slice(0, 12),
    TransactionDesc: String(transactionDesc || 'NTSA MTB Access').slice(0, 32)
  };

  const response = await fetch(`${cfg.baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok || data.ResponseCode !== '0') {
    const err = new Error(
      formatDarajaErrorMessage(
        data,
        `Daraja STK Push failed (HTTP ${response.status}).`,
        cfg.env
      )
    );
    err.statusCode = response.status >= 400 ? response.status : 502;
    throw err;
  }

  return data;
}

export async function queryStkPushStatus({ cfg, checkoutRequestId }) {
  const accessToken = await getDarajaAccessToken(cfg);
  const timestamp = getDarajaTimestamp();
  const password = generateDarajaPassword(cfg.shortCode, cfg.passkey, timestamp);

  const response = await fetch(`${cfg.baseUrl}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      BusinessShortCode: cfg.shortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId
    })
  });

  const text = await response.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  // Daraja returns 500.001.1001 while user has not finished entering their PIN
  if (data.errorCode === '500.001.1001') {
    return {
      stillProcessing: true,
      resultDesc: data.errorMessage || 'Transaction is still being processed on customer phone.'
    };
  }

  if (!response.ok && data.ResultCode === undefined) {
    const err = new Error(
      formatDarajaErrorMessage(
        data,
        `Daraja status query failed (HTTP ${response.status}).`,
        cfg.env
      )
    );
    err.statusCode = response.status >= 400 ? response.status : 502;
    throw err;
  }

  return {
    stillProcessing: false,
    resultCode: Number(data.ResultCode),
    resultDesc: data.ResultDesc || data.ResponseDescription || '',
    merchantRequestId: data.MerchantRequestID || '',
    checkoutRequestId: data.CheckoutRequestID || checkoutRequestId
  };
}

export function extractCallbackMetadata(items = []) {
  const map = {};
  if (!Array.isArray(items)) return map;
  for (const item of items) {
    if (item?.Name) {
      map[item.Name] = item.Value ?? null;
    }
  }
  return {
    amount: map.Amount !== undefined && map.Amount !== null ? Number(map.Amount) : null,
    mpesaReceiptNumber: map.MpesaReceiptNumber ? String(map.MpesaReceiptNumber) : null,
    transactionDate: map.TransactionDate ? String(map.TransactionDate) : null,
    phoneNumber: map.PhoneNumber ? String(map.PhoneNumber) : null
  };
}

