import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Helper to read env variables with or without VITE_ prefix (supports Vercel, Netlify, and local .env)
const getEnv = (key) => {
  return (
    import.meta.env[`VITE_${key}`] ||
    import.meta.env[key] ||
    ''
  );
};

const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY'),
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('FIREBASE_APP_ID')
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
export const ADMIN_EMAIL = getEnv('ADMIN_EMAIL');
