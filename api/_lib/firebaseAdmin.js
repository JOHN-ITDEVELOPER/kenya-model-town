import crypto from 'crypto';

const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FIREBASE_PUBLIC_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedAccessToken = null;
let cachedCerts = { map: null, expiresAtMs: 0 };

function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecodeToString(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLen), 'base64').toString('utf8');
}

export function parseServiceAccountFromEnv() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    if (rawJson.includes('"type":"service_account",...') || rawJson === '{"type":"service_account",...}') {
      const err = new Error(
        'FIREBASE_SERVICE_ACCOUNT_JSON still contains the example "..." placeholder. Paste the full JSON from Firebase Console -> Project Settings -> Service accounts -> Generate new private key.'
      );
      err.statusCode = 500;
      throw err;
    }

    let parsed;
    try {
      const jsonText = rawJson.startsWith('{')
        ? rawJson
        : Buffer.from(rawJson, 'base64').toString('utf8');
      parsed = JSON.parse(jsonText);
    } catch (parseErr) {
      const err = new Error(
        `Invalid FIREBASE_SERVICE_ACCOUNT_JSON format: ${parseErr.message}`
      );
      err.statusCode = 500;
      throw err;
    }

    if (parsed.private_key) {
      parsed.private_key = String(parsed.private_key).replace(/\\n/g, '\n');
    }

    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      const err = new Error(
        'FIREBASE_SERVICE_ACCOUNT_JSON is missing project_id, client_email, or private_key.'
      );
      err.statusCode = 500;
      throw err;
    }

    return parsed;
  }

  const projectId = (
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    ''
  ).trim();
  const clientEmail = (
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    process.env.FIREBASE_CLIENT_EMAIL ||
    ''
  ).trim();
  const privateKey = (
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
    process.env.FIREBASE_PRIVATE_KEY ||
    ''
  ).replace(/\\n/g, '\n').trim();

  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey
    };
  }

  return null;
}

export function isFirebaseAdminConfigured() {
  try {
    return Boolean(parseServiceAccountFromEnv());
  } catch {
    return false;
  }
}

export function getRequiredServiceAccount() {
  const sa = parseServiceAccountFromEnv();
  if (!sa) {
    const err = new Error(
      'Firebase Admin credentials are missing on the server. Set FIREBASE_SERVICE_ACCOUNT_JSON (or FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY) in environment variables and redeploy.'
    );
    err.statusCode = 500;
    throw err;
  }
  return sa;
}

async function getGoogleAccessToken(sa) {
  const nowMs = Date.now();
  if (
    cachedAccessToken &&
    cachedAccessToken.clientEmail === sa.client_email &&
    cachedAccessToken.expiresAtMs - 60000 > nowMs
  ) {
    return cachedAccessToken.token;
  }

  const nowSec = Math.floor(nowMs / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = base64UrlEncode(
    JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      scope: FIRESTORE_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: nowSec,
      exp: nowSec + 3600
    })
  );

  const signingInput = `${header}.${claimSet}`;
  let signature;
  try {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signingInput);
    signature = base64UrlEncode(signer.sign(sa.private_key));
  } catch (signErr) {
    const err = new Error(
      `Invalid Firebase service account private_key: ${signErr.message}`
    );
    err.statusCode = 500;
    throw err;
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${signingInput}.${signature}`
    }).toString()
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    const err = new Error(
      data.error_description ||
        data.error ||
        `Failed to obtain Google OAuth2 access token (HTTP ${res.status}).`
    );
    err.statusCode = 500;
    throw err;
  }

  cachedAccessToken = {
    clientEmail: sa.client_email,
    token: data.access_token,
    expiresAtMs: nowMs + (Number(data.expires_in) || 3600) * 1000
  };
  return data.access_token;
}

async function fetchFirebasePublicCerts(forceRefresh = false) {
  if (!forceRefresh && cachedCerts.map && Date.now() < cachedCerts.expiresAtMs) {
    return cachedCerts.map;
  }

  const res = await fetch(FIREBASE_PUBLIC_CERTS_URL);
  if (!res.ok) {
    throw new Error(`Could not fetch Firebase auth public keys (HTTP ${res.status}).`);
  }

  const certs = await res.json();
  const cacheControl = res.headers.get('cache-control') || '';
  const match = /max-age=(\d+)/i.exec(cacheControl);
  const maxAgeSec = match ? Number(match[1]) : 3600;

  cachedCerts = {
    map: certs,
    expiresAtMs: Date.now() + maxAgeSec * 1000
  };
  return certs;
}

export async function verifyFirebaseBearerToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    const err = new Error('Authentication required. Please sign in with Google first.');
    err.statusCode = 401;
    throw err;
  }

  const idToken = authHeader.slice(7).trim();
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    const err = new Error('Invalid authentication token.');
    err.statusCode = 401;
    throw err;
  }

  // Ensure server config is valid before checking Firebase auth audience
  const sa = getRequiredServiceAccount();
  const projectId = sa.project_id;

  let header;
  let payload;
  try {
    header = JSON.parse(base64UrlDecodeToString(parts[0]));
    payload = JSON.parse(base64UrlDecodeToString(parts[1]));
  } catch {
    const err = new Error('Malformed authentication token.');
    err.statusCode = 401;
    throw err;
  }

  if (header.alg !== 'RS256' || !header.kid) {
    const err = new Error('Unsupported authentication token algorithm.');
    err.statusCode = 401;
    throw err;
  }

  let certs = await fetchFirebasePublicCerts(false);
  if (!certs[header.kid]) {
    certs = await fetchFirebasePublicCerts(true);
  }
  const certPem = certs[header.kid];
  if (!certPem) {
    const err = new Error('Authentication token key ID not recognized. Sign in again.');
    err.statusCode = 401;
    throw err;
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${parts[0]}.${parts[1]}`);
  const sigBuf = Buffer.from(parts[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  if (!verifier.verify(certPem, sigBuf)) {
    const err = new Error('Invalid authentication signature. Please sign in again.');
    err.statusCode = 401;
    throw err;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    const err = new Error('Your login session expired. Please sign in again.');
    err.statusCode = 401;
    throw err;
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 300) {
    const err = new Error('Invalid token issued-at timestamp.');
    err.statusCode = 401;
    throw err;
  }
  if (payload.aud !== projectId) {
    const err = new Error('Authentication token project mismatch.');
    err.statusCode = 401;
    throw err;
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    const err = new Error('Authentication token issuer mismatch.');
    err.statusCode = 401;
    throw err;
  }
  if (typeof payload.sub !== 'string' || !payload.sub) {
    const err = new Error('Authentication token missing user ID.');
    err.statusCode = 401;
    throw err;
  }

  return {
    ...payload,
    uid: payload.sub,
    email: payload.email || '',
    name: payload.name || ''
  };
}

export function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (typeof val === 'object' && val.__timestampIso) {
    return { timestampValue: val.__timestampIso };
  }
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    return { mapValue: { fields: toFirestoreFields(val) } };
  }
  return { stringValue: String(val) };
}

export function toFirestoreFields(obj = {}) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  return fields;
}

export function fromFirestoreValue(val) {
  if (!val || typeof val !== 'object') return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('stringValue' in val) return val.stringValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map(fromFirestoreValue);
  }
  if ('mapValue' in val) {
    return fromFirestoreFields(val.mapValue?.fields || {});
  }
  return null;
}

export function fromFirestoreFields(fields = {}) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = fromFirestoreValue(v);
  }
  return out;
}

export function fsTimestamp(dateOrMs = new Date()) {
  const iso =
    dateOrMs instanceof Date
      ? dateOrMs.toISOString()
      : new Date(dateOrMs).toISOString();
  return { __timestampIso: iso };
}

export function getFirebaseAdmin() {
  const sa = getRequiredServiceAccount();
  const projectId = sa.project_id;
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

  const docName = (col, id) =>
    `projects/${projectId}/databases/(default)/documents/${col}/${id}`;

  const getDoc = async (col, id) => {
    const token = await getGoogleAccessToken(sa);
    const url = `${baseUrl}/${encodeURIComponent(col)}/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 404) {
      return { exists: false, id, data: null, updateTime: null };
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        json.error?.message || `Firestore read failed for ${col}/${id} (HTTP ${res.status}).`
      );
    }
    return {
      exists: true,
      id,
      data: fromFirestoreFields(json.fields || {}),
      updateTime: json.updateTime || null
    };
  };

  const commitWrites = async (writes) => {
    const token = await getGoogleAccessToken(sa);
    const res = await fetch(`${baseUrl}:commit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ writes })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const status = json.error?.status || '';
      const err = new Error(
        json.error?.message || `Firestore commit failed (HTTP ${res.status}).`
      );
      err.isConflict =
        res.status === 409 || status === 'ABORTED' || status === 'FAILED_PRECONDITION';
      throw err;
    }
    return json;
  };

  return {
    adminDb: {
      projectId,
      docName,
      getDoc,
      commitWrites
    }
  };
}
