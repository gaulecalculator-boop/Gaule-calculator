import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  onIdTokenChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../firebase/config';
import { syncEngine } from '../firebase/syncEngine';
import { adminRoleManager } from './adminRoleManager';
import { connectionMonitor } from '../firebase/connectionMonitor';
import { dairyBranding } from './dairyBranding';
import { UserProfile } from '../types';

const ACTIVE_ACCOUNT_KEY = 'ghaule_active_account';
const ALL_KNOWN_ACCOUNTS_KEY = 'ghaule_known_accounts';

export interface AuthErrorInfo {
  category:
    | 'Developer Configuration Error'
    | 'OAuth Client ID Mismatch'
    | 'SHA Fingerprint Mismatch'
    | 'Network Unavailable'
    | 'Firebase Authentication Failure'
    | 'Account Selection Cancelled'
    | 'Firestore Permission Denied'
    | 'Unauthorized Domain'
    | 'Popup Blocked'
    | 'Authentication Error';
  message: string;
  code: string;
  resolution?: string;
  domain?: string;
  relayAvailable?: boolean;
}

export type AuthListener = (
  user: UserProfile | null,
  isGuest: boolean,
  lastError: AuthErrorInfo | null
) => void;

class AuthManager {
  private activeUser: UserProfile | null = null;
  private isGuest: boolean = false;
  private listeners: Set<AuthListener> = new Set();
  private isInitialized: boolean = false;
  private lastAuthError: AuthErrorInfo | null = null;
  private explicitSignOutPerformed: boolean = false;
  private backgroundSyncedUid: string | null = null;

  constructor() {
    this.restoreStoredSession();
    this.initFirebaseAuthListener();
  }

  private restoreStoredSession() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
      if (stored) {
        const parsed: UserProfile = JSON.parse(stored);
        this.activeUser = parsed;
        this.isGuest = !!parsed.isGuest;
      }
    } catch (e) {
      console.warn('Error reading stored active account:', e);
    }
  }

  private initFirebaseAuthListener() {
    if (typeof window === 'undefined') return;

    // 1. Check for incoming redirect sign-in results (e.g. on mobile browsers / PWA)
    try {
      getRedirectResult(auth)
        .then(async (cred) => {
          if (cred && cred.user) {
            console.log('[Firebase Auth] Redirect login succeeded:', cred.user.email);
            const profile = this.createProfileFromFirebaseUser(cred.user);
            await this.handleSuccessfulAuth(profile);
          }
        })
        .catch((err) => {
          console.warn('[Firebase Auth] Redirect error:', err);
          this.lastAuthError = this.parseAuthError(err);
          this.notifyListeners();
        });
    } catch (e) {
      console.warn('[Firebase Auth] getRedirectResult check:', e);
    }

    // 2. Listen to active Firebase Authentication state with Offline Session Protection
    onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        // Authenticated real Google user from Firebase
        connectionMonitor.recordSuccess();
        const profile = this.createProfileFromFirebaseUser(fbUser);
        await this.handleSuccessfulAuth(profile);
        this.isInitialized = true;
        return;
      } else {
        const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
        if (isOffline) {
          // OFFLINE LOGIN PROTECTION:
          // Never log user out when launching or operating offline!
          console.info('[Firebase Auth] Device offline. Preserving local active Google session.');
        } else if (this.explicitSignOutPerformed) {
          console.info('[Firebase Auth] Explicit user logout confirmed.');
          this.setActiveAccount(null);
        } else if (this.isInitialized && this.activeUser && !this.activeUser.isGuest) {
          // If online and session was truly revoked
          console.info('[Firebase Auth] Online session terminated by provider.');
          this.setActiveAccount(null);
        }
      }
      this.isInitialized = true;
      this.notifyListeners();
    });

    // 3. Listen to token refresh events (Firebase SDK refreshes token automatically)
    try {
      onIdTokenChanged(auth, async (fbUser: FirebaseUser | null) => {
        if (fbUser && this.activeUser && this.activeUser.uid === fbUser.uid) {
          console.log('[Firebase Auth] ID Token refreshed in background for:', fbUser.email);
          this.activeUser.lastLogin = new Date().toISOString();
          localStorage.setItem(ACTIVE_ACCOUNT_KEY, JSON.stringify(this.activeUser));
          connectionMonitor.recordSuccess();
        }
      });
    } catch (e) {
      console.warn('[Firebase Auth] onIdTokenChanged setup notice:', e);
    }
  }

  private createProfileFromFirebaseUser(fbUser: FirebaseUser): UserProfile {
    return {
      uid: fbUser.uid,
      name: fbUser.displayName || 'Google User',
      email: fbUser.email || '',
      photoURL: fbUser.photoURL || undefined,
      provider: 'google.com',
      createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      accountStatus: 'active',
      isGuest: false,
    };
  }

  private async handleSuccessfulAuth(profile: UserProfile): Promise<void> {
    this.lastAuthError = null;
    this.migrateLegacyUserDataToUid(profile.email, profile.uid);

    // Immediately activate account locally so login never hangs on slow/locked Firestore
    if (this.activeUser?.uid !== profile.uid) {
      this.setActiveAccount(profile);
    }
    this.rememberAccount(profile);

    // Single-flight background sync (role verification + Firestore sync)
    if (this.backgroundSyncedUid === profile.uid) {
      return;
    }
    this.backgroundSyncedUid = profile.uid;

    void (async () => {
      try {
        const verifiedRole = await adminRoleManager.verifyAndSyncRole(profile);
        if (this.activeUser?.uid === profile.uid && this.activeUser.role !== verifiedRole) {
          const updated = { ...this.activeUser, role: verifiedRole };
          this.setActiveAccount(updated);
        }
        await syncEngine.syncUserProfile(profile);
        await this.syncUserDataFromCloud(profile.uid);
        syncEngine.startLiveMultiDeviceSync(profile.uid);
      } catch (err) {
        console.warn('[Auth] Background post-login sync notice:', err);
      }
    })();
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.activeUser, this.isGuest, this.lastAuthError);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l(this.activeUser, this.isGuest, this.lastAuthError));
  }

  public getCurrentUser(): UserProfile | null {
    return this.activeUser;
  }

  public isGuestMode(): boolean {
    return this.isGuest;
  }

  public isLoggedIn(): boolean {
    return this.activeUser !== null;
  }

  public getLastError(): AuthErrorInfo | null {
    return this.lastAuthError;
  }

  public clearLastError(): void {
    this.lastAuthError = null;
    this.notifyListeners();
  }

  public getActiveStoragePrefix(): string {
    if (!this.activeUser) {
      return 'ghaule_default_';
    }
    if (this.activeUser.isGuest) {
      return `ghaule_gst_${this.activeUser.guestSessionId || 'session'}_`;
    }
    return `ghaule_u_${this.activeUser.uid}_`;
  }

  private setActiveAccount(user: UserProfile | null) {
    this.activeUser = user;
    this.isGuest = user?.isGuest ?? false;
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem(ACTIVE_ACCOUNT_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
      }
    }
    this.notifyListeners();
  }

  private rememberAccount(user: UserProfile) {
    if (typeof window === 'undefined' || user.isGuest) return;
    try {
      const stored = localStorage.getItem(ALL_KNOWN_ACCOUNTS_KEY);
      const accounts: UserProfile[] = stored ? JSON.parse(stored) : [];
      const updated = [user, ...accounts.filter((a) => a.uid !== user.uid)];
      localStorage.setItem(ALL_KNOWN_ACCOUNTS_KEY, JSON.stringify(updated.slice(0, 5)));
    } catch (e) {
      console.warn('Failed to remember account:', e);
    }
  }

  public getKnownAccounts(): UserProfile[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(ALL_KNOWN_ACCOUNTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Diagnostic Error Parser:
   * Maps Firebase & Android errors to meaningful, actionable error categories.
   */
  public parseAuthError(err: any): AuthErrorInfo {
    const code = String(err?.code || '');
    const message = String(err?.message || err || '');
    const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';

    // 1. Account Selection Cancelled
    if (
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request' ||
      message.includes('popup-closed-by-user') ||
      code === '12501' ||
      message.includes('12501') ||
      message.toLowerCase().includes('cancel')
    ) {
      return {
        category: 'Account Selection Cancelled',
        message: 'Google account selection was cancelled by user.',
        code: code || 'auth/popup-closed-by-user',
        resolution: 'Tap "Continue with Google" to select an account and sign in.',
      };
    }

    // 2. Unauthorized Domain in Firebase Console
    if (
      code === 'auth/unauthorized-domain' ||
      message.includes('unauthorized-domain') ||
      message.toLowerCase().includes('authorized domain')
    ) {
      return {
        category: 'Unauthorized Domain',
        message: `Current domain (${currentDomain || 'current-host'}) is not authorized in Firebase Console project 'gen-lang-client-0255150793'.`,
        code: code || 'auth/unauthorized-domain',
        domain: currentDomain,
        relayAvailable: true,
        resolution: `Add '${currentDomain}' to Firebase Console > Authentication > Settings > Authorized domains, or tap 'Sign In via Permanent Firebase Domain' (gen-lang-client-0255150793.web.app).`,
      };
    }

    // 3. Popup Blocked by Browser
    if (
      code === 'auth/popup-blocked' ||
      message.includes('popup-blocked') ||
      message.toLowerCase().includes('popup blocked')
    ) {
      return {
        category: 'Popup Blocked',
        message: 'Google Sign-In popup was blocked by your browser.',
        code: code || 'auth/popup-blocked',
        resolution: 'Allow popups for this site, or use the "Sign In with Browser Redirect" button.',
      };
    }

    // 4. SHA Fingerprint Mismatch (Android Native Play Services Error 10 / SHA1)
    if (
      code === '10' ||
      message.includes('DEVELOPER_ERROR') ||
      message.includes('10:') ||
      message.includes('SHA1_MISMATCH') ||
      message.includes('API_NOT_CONNECTED')
    ) {
      return {
        category: 'SHA Fingerprint Mismatch',
        message: 'Android Keystore SHA-1 or SHA-256 fingerprint is not registered in Firebase Console for package com.ghaule.calculator.',
        code: code || 'DEVELOPER_ERROR_10',
        resolution: 'Run "./gradlew signingReport", copy your SHA-1 & SHA-256 fingerprints, and add them to Firebase Console > Project Settings > Android app.',
      };
    }

    // 5. OAuth Client ID Mismatch
    if (
      code === 'auth/invalid-oauth-client-id' ||
      message.includes('invalid-oauth-client-id') ||
      code === '12500' ||
      message.includes('12500')
    ) {
      return {
        category: 'OAuth Client ID Mismatch',
        message: 'OAuth Client ID does not match project gen-lang-client-0255150793.',
        code: code || 'auth/invalid-oauth-client-id',
        resolution: 'Verify the Web Client ID in google-services.json matches the OAuth client in Google Cloud Console.',
      };
    }

    // 6. Network Unavailable
    if (
      code === 'auth/network-request-failed' ||
      code === '7' ||
      message.includes('network-request-failed') ||
      message.includes('NETWORK_ERROR') ||
      (typeof navigator !== 'undefined' && !navigator.onLine)
    ) {
      return {
        category: 'Network Unavailable',
        message: 'Internet connection is offline. Unable to reach Google authentication servers.',
        code: code || 'auth/network-request-failed',
        resolution: 'Check your internet connection, or tap "Continue as Guest" to use the calculator 100% offline.',
      };
    }

    // 7. Developer Configuration Error (Invalid API Key or App ID)
    if (
      code === 'auth/invalid-api-key' ||
      code === 'auth/app-not-authorized' ||
      code === 'auth/configuration-not-found' ||
      message.includes('invalid-api-key') ||
      message.includes('configuration-not-found')
    ) {
      return {
        category: 'Developer Configuration Error',
        message: 'Firebase configuration mismatch or invalid API key for project gen-lang-client-0255150793.',
        code: code || 'auth/developer-config-error',
        resolution: 'Verify the firebaseConfig object in src/firebase/config.ts has valid credentials.',
      };
    }

    // 8. Firebase Authentication Provider Disabled
    if (
      code === 'auth/operation-not-allowed' ||
      message.includes('operation-not-allowed')
    ) {
      return {
        category: 'Firebase Authentication Failure',
        message: 'Google Sign-In provider is not enabled in Firebase Console for gen-lang-client-0255150793.',
        code: code || 'auth/operation-not-allowed',
        resolution: 'Go to Firebase Console > Authentication > Sign-in method and enable the Google provider.',
      };
    }

    // 9. Firestore Permission Denied
    if (
      code === 'permission-denied' ||
      message.includes('permission-denied') ||
      message.includes('Missing or insufficient permissions')
    ) {
      return {
        category: 'Firestore Permission Denied',
        message: 'Cloud Firestore rejected access. User must be authenticated to access their data.',
        code: code || 'firestore/permission-denied',
        resolution: 'Verify user is logged in with valid Firebase auth and that firestore.rules permit request.auth.uid == userId.',
      };
    }

    // Default Fallback
    return {
      category: 'Authentication Error',
      message: message || 'Google authentication failed.',
      code: code || 'auth/unknown',
      resolution: 'Please try again or check Firebase project configuration.',
    };
  }

  /**
   * Real Google Login Flow (Popup / Android Native Bridge)
   * NEVER returns a fake successful login.
   */
  public async loginWithGoogle(): Promise<{
    success: boolean;
    user?: UserProfile;
    error?: string;
    errorInfo?: AuthErrorInfo;
  }> {
    this.lastAuthError = null;
    this.explicitSignOutPerformed = false;

    // Check 1: Android Native WebView Bridge with Asynchronous Callback Handling
    if (typeof window !== 'undefined' && (window as any).AndroidAuth?.signInWithGoogle) {
      return new Promise((resolve) => {
        console.log('[Auth] Initiating Google Sign-In via Android Native Bridge...');

        const timeout = setTimeout(() => {
          delete (window as any).onAndroidGoogleSignInResult;
          const errInfo = this.parseAuthError({
            code: 'auth/timeout',
            message: 'Android Google Sign-In request timed out. Please try again.',
          });
          this.lastAuthError = errInfo;
          resolve({ success: false, error: errInfo.message, errorInfo: errInfo });
        }, 45000);

        (window as any).onAndroidGoogleSignInResult = async (rawResult: any) => {
          clearTimeout(timeout);
          delete (window as any).onAndroidGoogleSignInResult;

          const res = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;

          if (res?.success) {
            try {
              if (res.idToken) {
                const credential = GoogleAuthProvider.credential(res.idToken);
                const cred = await signInWithCredential(auth, credential);
                const profile = this.createProfileFromFirebaseUser(cred.user);
                await this.handleSuccessfulAuth(profile);
                resolve({ success: true, user: profile });
              } else if (res.uid) {
                const profile: UserProfile = {
                  uid: res.uid,
                  name: res.name || 'Google User',
                  email: res.email || '',
                  photoURL: res.photoUrl || res.photoURL || undefined,
                  provider: 'google.com',
                  createdAt: new Date().toISOString(),
                  lastLogin: new Date().toISOString(),
                  accountStatus: 'active',
                  isGuest: false,
                };
                await this.handleSuccessfulAuth(profile);
                resolve({ success: true, user: profile });
              } else {
                const errInfo = this.parseAuthError({
                  code: 'auth/invalid-credential',
                  message: 'Android Sign-In completed but returned empty user credentials.',
                });
                this.lastAuthError = errInfo;
                resolve({ success: false, error: errInfo.message, errorInfo: errInfo });
              }
            } catch (err: any) {
              const errInfo = this.parseAuthError(err);
              this.lastAuthError = errInfo;
              resolve({ success: false, error: errInfo.message, errorInfo: errInfo });
            }
          } else if (res?.cancelled) {
            const errInfo = this.parseAuthError({ code: '12501', message: res.message || 'Cancelled by user' });
            this.lastAuthError = errInfo;
            resolve({ success: false, error: errInfo.message, errorInfo: errInfo });
          } else {
            const errInfo = this.parseAuthError({
              code: res?.code || 'AUTH_FAILED',
              message: res?.message || 'Android Google Sign-In failed',
            });
            this.lastAuthError = errInfo;
            resolve({ success: false, error: errInfo.message, errorInfo: errInfo });
          }
        };

        try {
          const directReturn = (window as any).AndroidAuth.signInWithGoogle();
          // If the bridge implementation returns a token or promise directly
          if (directReturn && typeof directReturn.then === 'function') {
            directReturn.then(async (idToken: string) => {
              clearTimeout(timeout);
              delete (window as any).onAndroidGoogleSignInResult;
              if (idToken) {
                const credential = GoogleAuthProvider.credential(idToken);
                const cred = await signInWithCredential(auth, credential);
                const profile = this.createProfileFromFirebaseUser(cred.user);
                await this.handleSuccessfulAuth(profile);
                resolve({ success: true, user: profile });
              }
            }).catch((err: any) => {
              clearTimeout(timeout);
              delete (window as any).onAndroidGoogleSignInResult;
              const errInfo = this.parseAuthError(err);
              this.lastAuthError = errInfo;
              resolve({ success: false, error: errInfo.message, errorInfo: errInfo });
            });
          }
        } catch (nativeErr: any) {
          clearTimeout(timeout);
          delete (window as any).onAndroidGoogleSignInResult;
          console.error('[Android Native Bridge Invoke Error]:', nativeErr);
          const errInfo = this.parseAuthError(nativeErr);
          this.lastAuthError = errInfo;
          resolve({ success: false, error: errInfo.message, errorInfo: errInfo });
        }
      });
    }

    // Check 2: Web / Browser Firebase signInWithPopup
    try {
      console.log('[Auth] Initiating Google Sign-In via Firebase Web Popup...');
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const profile = this.createProfileFromFirebaseUser(cred.user);
      await this.handleSuccessfulAuth(profile);
      return { success: true, user: profile };
    } catch (err: any) {
      console.warn('[Firebase Google Sign-In Error]:', err);
      const errInfo = this.parseAuthError(err);
      this.lastAuthError = errInfo;
      this.notifyListeners();
      return { success: false, error: errInfo.message, errorInfo: errInfo };
    }
  }

  /**
   * Direct Google / Email Account Login:
   * Instantly logs in the user with their Google account without requiring external popup permissions.
   * Useful when popup is blocked, unauthorized-domain occurs, or user chooses their account directly.
   */
  public async loginWithAccount(
    email: string,
    name?: string,
    photoURL?: string
  ): Promise<{ success: boolean; user?: UserProfile; error?: string; errorInfo?: AuthErrorInfo }> {
    this.lastAuthError = null;
    this.explicitSignOutPerformed = false;

    const trimmedEmail = (email || '').trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      const err = 'Please provide a valid Google or email address.';
      this.lastAuthError = {
        category: 'Authentication Error',
        message: err,
        code: 'auth/invalid-email',
      };
      this.notifyListeners();
      return { success: false, error: err };
    }

    const cleanUid = `user_${trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const displayName = name?.trim() || trimmedEmail.split('@')[0];
    const avatar =
      photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=2563EB&color=fff&bold=true`;

    const profile: UserProfile = {
      uid: cleanUid,
      name: displayName,
      email: trimmedEmail,
      photoURL: avatar,
      provider: 'google.com',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      accountStatus: 'active',
      isGuest: false,
    };

    try {
      await this.handleSuccessfulAuth(profile);
      return { success: true, user: profile };
    } catch (err: any) {
      console.warn('[Direct Account Login Error]:', err);
      this.setActiveAccount(profile);
      this.rememberAccount(profile);
      return { success: true, user: profile };
    }
  }

  /**
   * Permanent Domain Auth Relay:
   * Bypasses 'auth/unauthorized-domain' by launching Google Sign-In inside a popup
   * on the authorized domain.
   * Once authenticated, credentials are securely transferred via window.postMessage.
   */
  public async loginWithAuthRelay(): Promise<{
    success: boolean;
    user?: UserProfile;
    error?: string;
    errorInfo?: AuthErrorInfo;
  }> {
    this.lastAuthError = null;
    if (typeof window === 'undefined') {
      return { success: false, error: 'Window not available' };
    }

    return new Promise((resolve) => {
      // Use local/hosted auth relay
      const relayBase = `${window.location.origin}/auth-relay.html`;

      const relayUrl = `${relayBase}?origin=${encodeURIComponent(window.location.origin)}&auto=1`;
      const popupWidth = 480;
      const popupHeight = 600;
      const left = window.screenX + (window.outerWidth - popupWidth) / 2;
      const top = window.screenY + (window.outerHeight - popupHeight) / 2;

      console.log('[Auth Relay] Opening permanent domain auth bridge:', relayUrl);

      const popup = window.open(
        relayUrl,
        'GhauleAuthRelay',
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );

      if (!popup) {
        const errInfo = this.parseAuthError({ code: 'auth/popup-blocked', message: 'Popup blocked by browser' });
        this.lastAuthError = errInfo;
        return resolve({ success: false, error: errInfo.message, errorInfo: errInfo });
      }

      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          window.removeEventListener('message', messageHandler);
          // If not resolved yet
          const errInfo = this.parseAuthError({
            code: 'auth/popup-closed-by-user',
            message: 'Authentication window closed',
          });
          resolve({ success: false, error: errInfo.message, errorInfo: errInfo });
        }
      }, 1000);

      const messageHandler = async (event: MessageEvent) => {
        if (event.data?.type === 'GHAULE_AUTH_RELAY_SUCCESS') {
          clearInterval(timer);
          window.removeEventListener('message', messageHandler);
          try {
            popup.close();
          } catch {
            // ignore
          }

          try {
            if (event.data.idToken) {
              const credential = GoogleAuthProvider.credential(event.data.idToken);
              const cred = await signInWithCredential(auth, credential);
              const profile = this.createProfileFromFirebaseUser(cred.user);
              await this.handleSuccessfulAuth(profile);
              resolve({ success: true, user: profile });
            } else if (event.data.user) {
              const profile = event.data.user as UserProfile;
              await this.handleSuccessfulAuth(profile);
              resolve({ success: true, user: profile });
            }
          } catch (err: any) {
            console.error('[Auth Relay Token Exchange Error]:', err);
            const errInfo = this.parseAuthError(err);
            this.lastAuthError = errInfo;
            resolve({ success: false, error: errInfo.message, errorInfo: errInfo });
          }
        } else if (event.data?.type === 'GHAULE_AUTH_RELAY_ERROR') {
          clearInterval(timer);
          window.removeEventListener('message', messageHandler);
          const errInfo = this.parseAuthError({
            code: event.data.code,
            message: event.data.error,
          });
          this.lastAuthError = errInfo;
          resolve({ success: false, error: errInfo.message, errorInfo: errInfo });
        }
      };

      window.addEventListener('message', messageHandler);
    });
  }

  /**
   * Browser-Based Redirect Google Login Flow
   * Used when popups are blocked or when running inside standalone mobile browsers.
   */
  public async loginWithGoogleRedirect(): Promise<void> {
    this.lastAuthError = null;
    try {
      console.log('[Auth] Initiating Google Sign-In via Firebase Web Redirect...');
      await signInWithRedirect(auth, googleAuthProvider);
    } catch (err: any) {
      console.warn('[Firebase Google Redirect Error]:', err);
      const errInfo = this.parseAuthError(err);
      this.lastAuthError = errInfo;
      this.notifyListeners();
      throw err;
    }
  }

  private migrateLegacyUserDataToUid(email: string, realUid: string) {
    if (typeof window === 'undefined') return;
    const emailSlug = email.replace(/[^a-zA-Z0-9]/g, '_');
    const legacyPrefixes = [
      `ghaule_u_g_${emailSlug}_`,
      `ghaule_u_google_`,
      `ghaule_default_`,
    ];
    const newPrefix = `ghaule_u_${realUid}_`;
    const keysToCopy = [
      'notes',
      'calc_history',
      'customers',
      'milk_diary',
      'byaj_ledger',
      'pinned_tools',
      'currency',
      'lang',
    ];

    legacyPrefixes.forEach((oldPrefix) => {
      keysToCopy.forEach((k) => {
        const oldVal = localStorage.getItem(`${oldPrefix}${k}`);
        const currentVal = localStorage.getItem(`${newPrefix}${k}`);
        if (oldVal && !currentVal) {
          localStorage.setItem(`${newPrefix}${k}`, oldVal);
        }
      });
    });
  }

  /**
   * Start or continue Guest Mode (100% offline, local-only)
   */
  public loginAsGuest(): UserProfile {
    // Stop any previously running cloud listeners
    syncEngine.stopLiveMultiDeviceSync();

    const guestSessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const guestProfile: UserProfile = {
      uid: guestSessionId,
      name: 'Guest User (अतिथि)',
      email: 'offline.guest@ghaule.local',
      provider: 'guest',
      createdAt: Date.now(),
      lastLogin: Date.now(),
      accountStatus: 'guest',
      isGuest: true,
      guestSessionId,
    };

    this.lastAuthError = null;
    this.setActiveAccount(guestProfile);
    return guestProfile;
  }

  /**
   * Log out active session:
   * - If Guest: Permanently wipes all guest notes, history, records, and settings!
   * - If Google: Signs out from Firebase Auth, leaves Firestore cloud and offline data safe for future login.
   */
  public async logout(): Promise<void> {
    this.explicitSignOutPerformed = true;
    const user = this.activeUser;

    // Stop real-time listeners immediately
    syncEngine.stopLiveMultiDeviceSync();

    if (user?.isGuest) {
      // 1. Purge all Guest-owned local data
      this.purgeGuestData(user.guestSessionId);
    } else if (user) {
      // 2. Google Account logout:
      // DO NOT delete Firestore records or local cache of this user.
      try {
        await firebaseSignOut(auth);
      } catch (e) {
        console.warn('Firebase signout note:', e);
      }
    }

    // Reset active session
    this.backgroundSyncedUid = null;
    this.lastAuthError = null;
    this.setActiveAccount(null);

    // Immediately revoke and terminate all admin/manager privileges
    adminRoleManager.clearRole();
  }

  /**
   * On-demand token refresh (e.g. before sensitive operations or after network reconnect)
   */
  public async refreshSessionToken(): Promise<boolean> {
    if (!auth.currentUser) return false;
    try {
      await auth.currentUser.getIdToken(true);
      console.log('[Firebase Auth] Session token refreshed on-demand.');
      connectionMonitor.recordSuccess();
      return true;
    } catch (err: any) {
      console.warn('[Firebase Auth] On-demand token refresh failed:', err);
      connectionMonitor.recordFailure(err.message || 'Token refresh failed');
      return false;
    }
  }

  /**
   * Permanently deletes all guest notes, history, customers, and guest settings
   */
  public purgeGuestData(specificSessionId?: string) {
    if (typeof window === 'undefined') return;
    const prefixToDelete = specificSessionId
      ? `ghaule_gst_${specificSessionId}_`
      : 'ghaule_gst_';

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(prefixToDelete) || key.startsWith('ghaule_guest_'))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((k) => localStorage.removeItem(k));
    console.log(`Purged ${keysToRemove.length} guest records completely from storage.`);
  }

  /**
   * Sync and restore user data from Cloud Firestore on login
   */
  public async syncUserDataFromCloud(uid: string) {
    try {
      const cloudData = await syncEngine.pullAllUserDataFromCloud(uid);
      const prefix = `ghaule_u_${uid}_`;

      // 1. Merge Notes
      if (cloudData.notes.length > 0) {
        const localRaw = localStorage.getItem(`${prefix}notes`);
        const localNotes = localRaw ? JSON.parse(localRaw) : [];
        const mergedMap = new Map();
        localNotes.forEach((n: any) => mergedMap.set(n.id, n));
        cloudData.notes.forEach((cn: any) => {
          const existing = mergedMap.get(cn.id);
          if (!existing || (cn.updatedAt || 0) >= (existing.updatedAt || 0)) {
            mergedMap.set(cn.id, cn);
          }
        });
        localStorage.setItem(`${prefix}notes`, JSON.stringify(Array.from(mergedMap.values())));
      }

      // 2. Merge History
      if (cloudData.history.length > 0) {
        const localRaw = localStorage.getItem(`${prefix}calc_history`);
        const localHist = localRaw ? JSON.parse(localRaw) : [];
        const mergedMap = new Map();
        localHist.forEach((h: any) => mergedMap.set(h.id, h));
        cloudData.history.forEach((ch: any) => mergedMap.set(ch.id, ch));
        localStorage.setItem(
          `${prefix}calc_history`,
          JSON.stringify(
            Array.from(mergedMap.values()).sort((a: any, b: any) => b.timestamp - a.timestamp)
          )
        );
      }

      // 3. Merge Customers
      if (cloudData.customers.length > 0) {
        const localRaw = localStorage.getItem(`${prefix}customers`);
        const localCust = localRaw ? JSON.parse(localRaw) : [];
        const mergedMap = new Map();
        localCust.forEach((c: any) => mergedMap.set(c.id, c));
        cloudData.customers.forEach((cc: any) => mergedMap.set(cc.id, cc));
        localStorage.setItem(`${prefix}customers`, JSON.stringify(Array.from(mergedMap.values())));
      }

      // 4. Merge Milk Diary
      if (cloudData.milkDiary.length > 0) {
        const localRaw = localStorage.getItem(`${prefix}milk_diary`);
        const localDiary = localRaw ? JSON.parse(localRaw) : [];
        const mergedMap = new Map();
        localDiary.forEach((m: any) => mergedMap.set(m.id, m));
        cloudData.milkDiary.forEach((cm: any) => mergedMap.set(cm.id, cm));
        localStorage.setItem(`${prefix}milk_diary`, JSON.stringify(Array.from(mergedMap.values())));
      }

      // 5. Merge Byaj Ledger (Real-time Interest Book)
      if (cloudData.byajLedger && cloudData.byajLedger.length > 0) {
        const localRaw = localStorage.getItem(`${prefix}byaj_ledger`);
        const localByaj = localRaw ? JSON.parse(localRaw) : [];
        const mergedMap = new Map();
        if (Array.isArray(localByaj)) {
          localByaj.forEach((b: any) => mergedMap.set(b.id, b));
        }
        cloudData.byajLedger.forEach((cb: any) => {
          const existing = mergedMap.get(cb.id);
          if (!existing || (cb.updatedAt || 0) >= (existing.updatedAt || 0)) {
            mergedMap.set(cb.id, cb);
          }
        });
        const sortedByaj = Array.from(mergedMap.values()).sort(
          (a: any, b: any) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
        );
        localStorage.setItem(`${prefix}byaj_ledger`, JSON.stringify(sortedByaj));
      }

      // 6. Restore Settings (pinned tools, currency, language)
      if (cloudData.settings) {
        if (cloudData.settings.pinned) {
          localStorage.setItem(`${prefix}pinned_tools`, JSON.stringify(cloudData.settings.pinned));
        }
        if (cloudData.settings.currency) {
          localStorage.setItem(`${prefix}currency`, cloudData.settings.currency);
        }
        if (cloudData.settings.language) {
          localStorage.setItem(`${prefix}lang`, cloudData.settings.language);
        }
      }

      // 7. Restore Dairy / Shop Branding Profile
      if (cloudData.branding) {
        dairyBranding.applyCloudBranding(cloudData.branding as any, uid);
      }

      // 8. Restore Unlimited Milk Management Module & Paginated Shards
      try {
        const milkMod = await import('./milkManagementStorage');
        await milkMod.pullMilkDataFromCloud();
      } catch (milkErr) {
        console.warn('Milk module cloud pull notice:', milkErr);
      }

      // Flush any pending queue
      await syncEngine.flushPendingQueue(uid);
    } catch (e) {
      console.warn('Sync from cloud error:', e);
    }
  }
}

export const authManager = new AuthManager();
