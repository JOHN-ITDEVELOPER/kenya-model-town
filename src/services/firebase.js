import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Explicit static property reads so Vite `define` works reliably while never
// exposing broad server env prefixes (like FIREBASE_SERVICE_ACCOUNT_JSON) to client bundles.
const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || import.meta.env?.FIREBASE_API_KEY || '',
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env?.FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || import.meta.env?.FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env?.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env?.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || import.meta.env?.FIREBASE_APP_ID || ''
};

// Check if Firebase keys are provided in .env or Vercel
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'your_api_key_here'
);

let app = null;
let auth = null;
let googleProvider = null;
let db = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    db = getFirestore(app);
  } catch (err) {
    console.error('Firebase initialization error:', err);
  }
} else {
  console.info('Firebase credentials not set in .env or Vercel. Running in offline/local preset mode.');
}

export { app, auth, googleProvider, db };
export const ADMIN_EMAIL = import.meta.env?.VITE_ADMIN_EMAIL || import.meta.env?.ADMIN_EMAIL || '';
