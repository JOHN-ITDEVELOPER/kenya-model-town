import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function parseServiceAccountFromEnv() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    try {
      const jsonText = rawJson.startsWith('{')
        ? rawJson
        : Buffer.from(rawJson, 'base64').toString('utf8');
      const parsed = JSON.parse(jsonText);
      if (parsed.private_key) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      return parsed;
    } catch (err) {
      throw new Error(
        `Invalid FIREBASE_SERVICE_ACCOUNT_JSON format: ${err.message}`
      );
    }
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

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
  return Boolean(parseServiceAccountFromEnv());
}

export function getFirebaseAdmin() {
  if (!getApps().length) {
    const serviceAccount = parseServiceAccountFromEnv();
    if (!serviceAccount) {
      throw new Error(
        'Firebase Admin SDK is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON (or FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY) in environment variables.'
      );
    }
    initializeApp({
      credential: cert(serviceAccount)
    });
  }

  return {
    adminAuth: getAuth(),
    adminDb: getFirestore()
  };
}

export async function verifyFirebaseBearerToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    const err = new Error('Authentication required. Please sign in with Google first.');
    err.statusCode = 401;
    throw err;
  }

  const idToken = authHeader.slice(7).trim();
  if (!idToken) {
    const err = new Error('Missing Firebase ID token.');
    err.statusCode = 401;
    throw err;
  }

  const { adminAuth } = getFirebaseAdmin();
  try {
    return await adminAuth.verifyIdToken(idToken);
  } catch (verifyErr) {
    const err = new Error('Your login session expired. Please sign in again.');
    err.statusCode = 401;
    throw err;
  }
}
