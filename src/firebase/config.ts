import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  memoryLocalCache,
} from 'firebase/firestore';

import firebaseAppletConfig from '../../firebase-applet-config.json';

export const firebaseConfig = firebaseAppletConfig;

// Initialize or retrieve Firebase App instance
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with browser local persistence (persists across tab restarts)
export const auth = getAuth(app);
try {
  if (typeof window !== 'undefined') {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('Firebase auth persistence setup notice:', err);
    });
  }
} catch (e) {
  console.warn('Auth persistence init:', e);
}

// Initialize Firestore safely across normal tabs, PWAs, Android webviews, and iframes
function getSafeFirestoreInstance() {
  const dbId = (firebaseConfig as any).firestoreDatabaseId;
  if (typeof window === 'undefined') {
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }

  let isInIframe = false;
  try {
    isInIframe = window.self !== window.top;
  } catch {
    isInIframe = true;
  }

  // Inside iframes, use memoryLocalCache to eliminate IndexedDB Web Lock collisions.
  // In standalone Android APK WebViews / PWAs / top-level browser tabs, enable persistentLocalCache!
  if (!isInIframe && typeof indexedDB !== 'undefined') {
    try {
      return dbId
        ? initializeFirestore(
            app,
            {
              localCache: persistentLocalCache({
                tabManager: persistentSingleTabManager({ forceOwnership: true }),
              }),
            },
            dbId
          )
        : initializeFirestore(app, {
            localCache: persistentLocalCache({
              tabManager: persistentSingleTabManager({ forceOwnership: true }),
            }),
          });
    } catch {
      // Fallback to memoryLocalCache if already initialized or IndexedDB restricted
    }
  }

  try {
    return dbId
      ? initializeFirestore(
          app,
          {
            localCache: memoryLocalCache(),
          },
          dbId
        )
      : initializeFirestore(app, {
          localCache: memoryLocalCache(),
        });
  } catch {
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
}

export const db = getSafeFirestoreInstance();

// Google Auth Provider setup with profile and email scopes (no sensitive Drive scope on login)
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('profile');
googleAuthProvider.addScope('email');
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

export const createDriveAuthProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  provider.addScope('https://www.googleapis.com/auth/drive.appdata');
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  return provider;
};

// Network status tracking to prevent duplicate enableNetwork / disableNetwork calls
import { enableNetwork, disableNetwork } from 'firebase/firestore';

let isNetworkDisabled = false;

export async function enableFirestoreNetwork(): Promise<boolean> {
  if (typeof window === 'undefined') return true;
  // If not explicitly disabled, avoid redundant enableNetwork calls that trigger write-stream assertions
  if (!isNetworkDisabled) return true;
  try {
    await enableNetwork(db);
    isNetworkDisabled = false;
    return true;
  } catch (err) {
    console.warn('[Firebase Config] enableNetwork note:', err);
    return false;
  }
}

export async function disableFirestoreNetwork(): Promise<boolean> {
  if (typeof window === 'undefined') return true;
  if (isNetworkDisabled) return true;
  try {
    await disableNetwork(db);
    isNetworkDisabled = true;
    return true;
  } catch (err) {
    console.warn('[Firebase Config] disableNetwork note:', err);
    return false;
  }
}

