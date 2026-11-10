import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase.js';
import { isUserAdmin } from './challengeService.js';

const USERS_COLLECTION = 'users';
const SETTINGS_COLLECTION = 'settings';
const MONETIZATION_DOC = 'monetization';

export const DEFAULT_PASS_PRICE_KES = 300;
export const PASS_DURATION_DAYS = 90;

/**
 * Safely convert Firestore Timestamp, Date, number, or ISO string to epoch milliseconds.
 */
export const toMillis = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.seconds === 'number') return val.seconds * 1000;
  const parsed = Date.parse(val);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Determine whether a user profile currently holds a valid 90-day unlock-all pass.
 */
export const hasActive90DayPass = (userProfile) => {
  if (!userProfile?.passExpiresAt) return false;
  return toMillis(userProfile.passExpiresAt) > Date.now();
};

/**
 * Compute remaining days on the user's 90-day pass (0 if inactive).
 */
export const getRemainingPassDays = (userProfile) => {
  const expiresMs = toMillis(userProfile?.passExpiresAt);
  if (!expiresMs || expiresMs <= Date.now()) return 0;
  return Math.ceil((expiresMs - Date.now()) / (1000 * 60 * 60 * 24));
};

/**
 * Check whether the current user/guest can play a challenge.
 * Q1-Q10 are always open to guests; free custom challenges are open;
 * paid custom challenges require admin role, an active 90-day pass, or per-challenge unlock.
 */
export const canAccessChallenge = (challenge, userProfile, isAdmin = false) => {
  if (!challenge) return true;
  if (!challenge.isCustom) return true; // Official Q1-Q10 stay free for guests
  if (isAdmin) return true;
  const price = Number(challenge.price) || 0;
  if (price <= 0) return true;
  if (hasActive90DayPass(userProfile)) return true;
  return Boolean(userProfile?.unlockedChallengeIds?.includes(challenge.id));
};

/**
 * Create or update the user document on Google sign-in without overwriting entitlements.
 */
export const syncUserProfileOnLogin = async (user) => {
  if (!isFirebaseConfigured || !db || !user?.uid) return null;
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  const existing = await getDoc(userRef);

  if (!existing.exists()) {
    const newProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Student Driver',
      photoURL: user.photoURL || '',
      role: isUserAdmin(user) ? 'admin' : 'student',
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      completedChallenges: [],
      unlockedChallengeIds: [],
      passExpiresAt: null,
      totalAttempts: 0,
      totalPassed: 0
    };
    await setDoc(userRef, newProfile, { merge: true });
    return newProfile;
  }

  const repeatUpdates = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || existing.data()?.displayName || 'Student Driver',
    photoURL: user.photoURL || existing.data()?.photoURL || '',
    lastSeenAt: serverTimestamp()
  };
  if (isUserAdmin(user) && existing.data()?.role !== 'admin') {
    repeatUpdates.role = 'admin';
  }
  await setDoc(userRef, repeatUpdates, { merge: true });
  return { id: existing.id, ...existing.data() };
};

/**
 * Live Firestore listener for the signed-in user's profile and unlocks.
 */
export const subscribeToUserProfile = (uid, onUpdate, onError) => {
  if (!isFirebaseConfigured || !db || !uid) {
    onUpdate(null);
    return () => {};
  }
  const userRef = doc(db, USERS_COLLECTION, uid);
  return onSnapshot(
    userRef,
    (snap) => {
      onUpdate(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    },
    (err) => {
      console.warn('User profile listener error:', err);
      if (onError) onError(err);
    }
  );
};

/**
 * Record an evaluated driving attempt and persist completed challenge IDs.
 */
export const recordChallengeAttempt = async (user, challengeId, isValid) => {
  if (!isFirebaseConfigured || !db || !user?.uid || !challengeId) return;
  try {
    const userRef = doc(db, USERS_COLLECTION, user.uid);
    const updates = {
      lastSeenAt: serverTimestamp(),
      totalAttempts: increment(1)
    };
    if (isValid) {
      updates.totalPassed = increment(1);
      updates.completedChallenges = arrayUnion(challengeId);
    }
    await updateDoc(userRef, updates);
  } catch (err) {
    console.warn('Could not record challenge attempt:', err);
  }
};

/**
 * Listen to global monetization configuration (90-Day Pass price in KES).
 */
export const subscribeToMonetizationSettings = (onUpdate) => {
  if (!isFirebaseConfigured || !db) {
    onUpdate({ passPriceKes: DEFAULT_PASS_PRICE_KES, passDurationDays: PASS_DURATION_DAYS });
    return () => {};
  }
  const ref = doc(db, SETTINGS_COLLECTION, MONETIZATION_DOC);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate({
          passPriceKes: Number(data.passPriceKes) > 0 ? Number(data.passPriceKes) : DEFAULT_PASS_PRICE_KES,
          passDurationDays: PASS_DURATION_DAYS,
          updatedAt: data.updatedAt || null
        });
      } else {
        onUpdate({ passPriceKes: DEFAULT_PASS_PRICE_KES, passDurationDays: PASS_DURATION_DAYS });
      }
    },
    (err) => {
      console.warn('Settings listener warning:', err);
      onUpdate({ passPriceKes: DEFAULT_PASS_PRICE_KES, passDurationDays: PASS_DURATION_DAYS });
    }
  );
};

/**
 * Update the global 90-Day Pass price (Admin only).
 */
export const updatePassPrice = async (adminUser, passPriceKes) => {
  if (!isUserAdmin(adminUser)) {
    throw new Error('Access Denied: Admin privileges required.');
  }
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured.');
  }
  const cleanPrice = Math.max(0, Math.round(Number(passPriceKes) || 0));
  const ref = doc(db, SETTINGS_COLLECTION, MONETIZATION_DOC);
  await setDoc(
    ref,
    {
      passPriceKes: cleanPrice,
      passDurationDays: PASS_DURATION_DAYS,
      updatedBy: adminUser.email,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
  return cleanPrice;
};

/**
 * Fetch all registered platform users (Admin Dashboard only).
 */
export const fetchAllUsers = async (adminUser) => {
  if (!isUserAdmin(adminUser)) {
    throw new Error('Access Denied: Admin privileges required.');
  }
  if (!isFirebaseConfigured || !db) return [];
  const q = query(collection(db, USERS_COLLECTION), orderBy('lastSeenAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Grant a specific custom challenge unlock to a user (Admin manual/test activation).
 */
export const grantChallengeUnlock = async (adminUser, targetUid, challengeId) => {
  if (!isUserAdmin(adminUser)) throw new Error('Access Denied: Admin only.');
  if (!db || !targetUid || !challengeId) return;
  await updateDoc(doc(db, USERS_COLLECTION, targetUid), {
    unlockedChallengeIds: arrayUnion(challengeId)
  });
};

/**
 * Revoke a specific custom challenge unlock from a user (Admin only).
 */
export const revokeChallengeUnlock = async (adminUser, targetUid, challengeId) => {
  if (!isUserAdmin(adminUser)) throw new Error('Access Denied: Admin only.');
  if (!db || !targetUid || !challengeId) return;
  await updateDoc(doc(db, USERS_COLLECTION, targetUid), {
    unlockedChallengeIds: arrayRemove(challengeId)
  });
};

/**
 * Grant or extend a 90-day Unlock-All Pass for a user (Admin manual/test activation).
 */
export const grant90DayPass = async (adminUser, targetUid, days = PASS_DURATION_DAYS) => {
  if (!isUserAdmin(adminUser)) throw new Error('Access Denied: Admin only.');
  if (!db || !targetUid) return;
  const userRef = doc(db, USERS_COLLECTION, targetUid);
  const snap = await getDoc(userRef);
  const currentExp = snap.exists() ? toMillis(snap.data()?.passExpiresAt) : 0;
  const baseMs = Math.max(Date.now(), currentExp);
  const nextExpMs = baseMs + days * 24 * 60 * 60 * 1000;
  await updateDoc(userRef, {
    passExpiresAt: Timestamp.fromMillis(nextExpMs)
  });
};

/**
 * Revoke a user's active 90-day pass (Admin only).
 */
export const revoke90DayPass = async (adminUser, targetUid) => {
  if (!isUserAdmin(adminUser)) throw new Error('Access Denied: Admin only.');
  if (!db || !targetUid) return;
  await updateDoc(doc(db, USERS_COLLECTION, targetUid), {
    passExpiresAt: null
  });
};
