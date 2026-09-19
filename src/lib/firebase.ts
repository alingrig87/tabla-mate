import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// Config is loaded from .env.local (VITE_ prefix makes it available to the browser bundle).
// Firebase Web API keys are safe to expose — security is enforced by Firestore Rules.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
// Some networks/proxies (school firewalls, some corporate networks) break the
// WebChannel streaming connection Firestore uses by default without failing
// outright — updates still arrive, but only after several seconds. Auto-detect
// falls back to long-polling on those networks instead of stalling on it.
export const db = initializeFirestore(firebaseApp, { experimentalAutoDetectLongPolling: true });
