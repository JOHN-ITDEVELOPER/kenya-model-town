import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

const COLLECTION_NAME = 'challenges';

/**
 * Realtime subscription to custom Firestore challenges
 */
export const subscribeToCustomChallenges = (onUpdate, onError) => {
  if (!isFirebaseConfigured || !db) {
    onUpdate([]);
    return () => {};
  }

  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const challenges = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        onUpdate(challenges);
      },
      (error) => {
        console.error('Error listening to custom challenges:', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to set up challenge listener:', err);
    if (onError) onError(err);
    return () => {};
  }
};

/**
 * Fetch all custom challenges once
 */
export const fetchCustomChallenges = async () => {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (err) {
    console.error('Error fetching custom challenges:', err);
    return [];
  }
};

/**
 * Save or update a custom challenge in Firestore
 */
/**
 * Check if the current user has Administrator challenge creation privileges.
 * Strictly permits johnnjenga7852@gmail.com and any additional emails set in VITE_ADMIN_EMAIL.
 */
export const isUserAdmin = (user) => {
  if (!user || !user.email) return false;
  const userEmail = user.email.trim().toLowerCase();
  const envAdmin = (import.meta.env?.VITE_ADMIN_EMAIL || import.meta.env?.ADMIN_EMAIL || '').toLowerCase();
  const adminList = [
    'johnnjenga7852@gmail.com',
    ...envAdmin.split(',').map((e) => e.trim())
  ].filter(Boolean);
  return adminList.includes(userEmail);
};

export const saveCustomChallenge = async (challengeData, user) => {
  if (!isUserAdmin(user)) {
    throw new Error('Access Denied: Only the authorized administrator (johnnjenga7852@gmail.com) can create or modify challenges.');
  }
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured in .env. Please add your credentials.');
  }

  const challengeId =
    challengeData.id || `custom_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  const cleanData = {
    id: challengeId,
    title: challengeData.title?.trim() || 'Untitled NTSA Challenge',
    number: challengeData.number || 99,
    badge: challengeData.badge?.trim() || 'Instructor Custom',
    ruleApplied: challengeData.ruleApplied?.trim() || 'Apply standard NTSA Model Town Board rules.',
    carColor: challengeData.carColor || '#ef4444',
    carLabel: challengeData.carLabel || 'RED CAR',
    vehicleType: challengeData.vehicleType || 'saloon',
    startNode: challengeData.startNode,
    targetNode: challengeData.targetNode,
    blockedNodes: Array.isArray(challengeData.blockedNodes) ? challengeData.blockedNodes : [],
    parkedCars: Array.isArray(challengeData.parkedCars) ? challengeData.parkedCars : [],
    allowParkingShortcut: Boolean(challengeData.allowParkingShortcut),
    requiredWaypoints: Array.isArray(challengeData.requiredWaypoints) ? challengeData.requiredWaypoints : [],
    prompt: challengeData.prompt?.trim() || 'Drive safely to the target destination without violating NTSA rules.',
    hint: challengeData.hint?.trim() || '',
    solutionPath: Array.isArray(challengeData.solutionPath) ? challengeData.solutionPath : [],
    solutionSteps: Array.isArray(challengeData.solutionSteps) ? challengeData.solutionSteps : [],
    isCustom: true,
    authorUid: user?.uid || 'admin',
    authorEmail: user?.email || '',
    authorName: user?.displayName || 'Admin Instructor',
    updatedAt: serverTimestamp(),
    createdAt: challengeData.createdAt || serverTimestamp()
  };

  const docRef = doc(db, COLLECTION_NAME, challengeId);
  await setDoc(docRef, cleanData, { merge: true });
  return cleanData;
};

/**
 * Delete a custom challenge from Firestore
 */
export const deleteCustomChallenge = async (challengeId, user) => {
  if (user && !isUserAdmin(user)) {
    throw new Error('Access Denied: Only the authorized administrator (johnnjenga7852@gmail.com) can delete challenges.');
  }
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured in .env.');
  }
  const docRef = doc(db, COLLECTION_NAME, challengeId);
  await deleteDoc(docRef);
  return challengeId;
};

