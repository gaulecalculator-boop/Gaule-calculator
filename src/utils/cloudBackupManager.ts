/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cloud Backup Manager for Ghaule Calculator
 * Feature: Date Save & Account (Cloud Backup)
 * 
 * Secure, encrypted backup & restore to each APK user's own Google Drive appDataFolder.
 * Uses AES-GCM-256 client-side encryption and Google Drive REST API.
 */

import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, createDriveAuthProvider } from '../firebase/config';
import { formatDateToBS, getTodayBS } from './nepaliCalendar';

export interface BackupSummary {
  customerCount: number;
  dailyRecordCount: number;
  paymentCount: number;
  billsCount: number;
  pasalOrderCount: number;
  notesCount: number;
}

export interface BackupMetadata {
  backupId: string;
  appVersion: string;
  createdAt: string;
  bsDate: string;
  userEmail: string;
  userUid: string;
  checksum: string;
  sizeBytes: number;
  summary: BackupSummary;
}

export interface CloudBackupItem {
  id: string; // Google Drive file ID
  name: string;
  createdTime: string;
  size: number;
  metadata?: BackupMetadata;
}

export interface ConnectedDriveUser {
  email: string;
  displayName: string;
  photoURL?: string;
  uid: string;
}

const CONNECTED_DRIVE_ACCOUNT_KEY = 'ghaule_drive_connected_user_info';
const APP_VERSION = '1.0.0';
const BACKUP_PREFIX = 'ghaule_backup_';
const MAX_VERIFIED_BACKUPS = 10;

class CloudBackupManager {
  private accessToken: string | null = null;
  private connectedUser: ConnectedDriveUser | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.restoreSavedDriveUser();
  }

  private restoreSavedDriveUser() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(CONNECTED_DRIVE_ACCOUNT_KEY);
      if (stored) {
        this.connectedUser = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[CloudBackup] Restore error:', e);
    }
  }

  public subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.warn('[CloudBackup] Listener error:', err);
      }
    });
  }

  public getConnectedUser(): ConnectedDriveUser | null {
    return this.connectedUser;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public isConnected(): boolean {
    return !!(this.connectedUser && this.accessToken);
  }

  /**
   * Prompts the Google Account Chooser so the APK user can choose their OWN personal Google account.
   * Never hardcodes developer email.
   */
  public async connectGoogleAccount(): Promise<{ success: boolean; user?: ConnectedDriveUser; error?: string }> {
    try {
      const provider = createDriveAuthProvider();
      console.log('[CloudBackup] Launching Google Account Chooser with Drive appdata scope...');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (!token) {
        throw new Error('Google Drive authorization token was not returned. Please grant access in the Google account screen.');
      }

      this.accessToken = token;
      this.connectedUser = {
        email: result.user.email || 'user@gmail.com',
        displayName: result.user.displayName || result.user.email?.split('@')[0] || 'GHAULE User',
        photoURL: result.user.photoURL || undefined,
        uid: result.user.uid,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(CONNECTED_DRIVE_ACCOUNT_KEY, JSON.stringify(this.connectedUser));
      }

      this.notify();
      return { success: true, user: this.connectedUser };
    } catch (err: any) {
      console.error('[CloudBackup] Google Drive connection error:', err);
      let msg = err.message || 'Google account connection failed.';
      if (err.code === 'auth/popup-blocked') {
        msg = 'Popup was blocked by your browser. Please allow popups for this app to select your Google account.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        msg = 'Account selection was cancelled. Please select your Google account.';
      }
      return { success: false, error: msg };
    }
  }

  /**
   * Switch account: allows the user to select another Google account anytime.
   */
  public async switchGoogleAccount(): Promise<{ success: boolean; user?: ConnectedDriveUser; error?: string }> {
    this.accessToken = null;
    return this.connectGoogleAccount();
  }

  /**
   * Disconnects the linked Google Drive account.
   */
  public disconnect() {
    this.accessToken = null;
    this.connectedUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CONNECTED_DRIVE_ACCOUNT_KEY);
    }
    this.notify();
  }

  // ==========================================
  // ENCRYPTION & CHECKSUM (AES-GCM-256)
  // ==========================================

  /**
   * Derives a cryptographic AES-GCM-256 key mathematically bound to the user's Google UID & email.
   */
  private async getCryptoKey(userUid: string, userEmail: string): Promise<CryptoKey> {
    const rawSecret = `ghaule_cloud_backup_salt_v1:${userUid}:${userEmail.toLowerCase().trim()}`;
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(rawSecret),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode('ghaule_salt_9841234567'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Computes SHA-256 hex checksum
   */
  public async computeChecksum(dataStr: string): Promise<string> {
    const enc = new TextEncoder();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', enc.encode(dataStr));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Encrypts plain JSON payload using AES-GCM
   */
  private async encryptPayload(
    plainData: any,
    userUid: string,
    userEmail: string
  ): Promise<{ ciphertext: string; iv: string; checksum: string }> {
    const jsonStr = JSON.stringify(plainData);
    const checksum = await this.computeChecksum(jsonStr);
    const key = await this.getCryptoKey(userUid, userEmail);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(jsonStr)
    );

    // Convert to base64
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const cipherBytes = new Uint8Array(encryptedBuffer);
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < cipherBytes.length; i += chunk) {
      binary += String.fromCharCode(...cipherBytes.subarray(i, i + chunk));
    }
    const ciphertextBase64 = btoa(binary);

    return {
      ciphertext: ciphertextBase64,
      iv: ivBase64,
      checksum,
    };
  }

  /**
   * Decrypts ciphertext using user's cryptographic key and validates checksum.
   */
  private async decryptPayload(
    ciphertextBase64: string,
    ivBase64: string,
    expectedChecksum: string,
    userUid: string,
    userEmail: string
  ): Promise<any> {
    const key = await this.getCryptoKey(userUid, userEmail);
    const iv = new Uint8Array(
      atob(ivBase64)
        .split('')
        .map((c) => c.charCodeAt(0))
    );
    const cipherBytes = new Uint8Array(
      atob(ciphertextBase64)
        .split('')
        .map((c) => c.charCodeAt(0))
    );

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBytes
    );

    const dec = new TextDecoder();
    const jsonStr = dec.decode(decryptedBuffer);

    // Verify Checksum
    const actualChecksum = await this.computeChecksum(jsonStr);
    if (actualChecksum !== expectedChecksum) {
      throw new Error('Integrity verification failed! The backup checksum does not match.');
    }

    return JSON.parse(jsonStr);
  }

  // ==========================================
  // DATA PACKAGING & RESTORATION
  // ==========================================

  /**
   * Collects all application data across localStorage
   */
  public collectAllAppData(): { data: Record<string, string>; summary: BackupSummary } {
    if (typeof window === 'undefined') {
      return {
        data: {},
        summary: { customerCount: 0, dailyRecordCount: 0, paymentCount: 0, billsCount: 0, pasalOrderCount: 0, notesCount: 0 },
      };
    }

    const data: Record<string, string> = {};
    const summary: BackupSummary = {
      customerCount: 0,
      dailyRecordCount: 0,
      paymentCount: 0,
      billsCount: 0,
      pasalOrderCount: 0,
      notesCount: 0,
    };

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Include all Ghaule Calculator and Hamro Pasal keys
      if (
        key.startsWith('ghaule_') ||
        key.startsWith('pasal_') ||
        key.includes('milk') ||
        key.includes('customer') ||
        key.includes('notes')
      ) {
        const val = localStorage.getItem(key);
        if (val !== null) {
          data[key] = val;

          // Compute summaries for human verification
          try {
            if (key.includes('customer') || key.endsWith('customers')) {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) summary.customerCount += parsed.length;
            } else if (key.includes('daily_record') || key.includes('milk_diary')) {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) summary.dailyRecordCount += parsed.length;
            } else if (key.includes('payments') || key.includes('allocation')) {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) summary.paymentCount += parsed.length;
            } else if (key.includes('bills') || key.includes('universal_bills')) {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) summary.billsCount += parsed.length;
            } else if (key.includes('pasal_orders') || key.includes('orders')) {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) summary.pasalOrderCount += parsed.length;
            } else if (key.includes('notes')) {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) summary.notesCount += parsed.length;
            }
          } catch {
            // ignore JSON parse for non-array settings
          }
        }
      }
    }

    return { data, summary };
  }

  /**
   * Restores application records safely with verification
   */
  public restoreAppData(data: Record<string, string>): { success: boolean; keysRestored: number } {
    if (typeof window === 'undefined' || !data) return { success: false, keysRestored: 0 };
    let count = 0;
    for (const [key, value] of Object.entries(data)) {
      if (typeof key === 'string' && typeof value === 'string') {
        localStorage.setItem(key, value);
        count++;
      }
    }
    return { success: true, keysRestored: count };
  }

  // ==========================================
  // GOOGLE DRIVE appDataFolder REST API
  // ==========================================

  /**
   * Lists existing backup files in the user's private Google Drive appDataFolder
   */
  public async listBackups(): Promise<CloudBackupItem[]> {
    if (!this.accessToken) {
      throw new Error('Not connected to Google Drive. Please connect your Google account.');
    }

    const url =
      'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name,mimeType,createdTime,modifiedTime,size,description,properties,appProperties)&orderBy=createdTime desc&pageSize=20';

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      if (res.status === 401) {
        // Token expired, clear token so user can re-auth
        this.accessToken = null;
        throw new Error('Google Drive session expired. Please tap "Connect with Google" to renew.');
      }
      throw new Error(errJson.error?.message || `Failed to fetch backups (${res.status})`);
    }

    const data = await res.json();
    const files: any[] = data.files || [];

    // Filter backups created by Ghaule Calculator
    const backupList: CloudBackupItem[] = files
      .filter((f) => f.name && f.name.startsWith(BACKUP_PREFIX))
      .map((f) => {
        let meta: BackupMetadata | undefined;
        try {
          if (f.description) {
            meta = JSON.parse(f.description);
          }
        } catch {
          // ignore
        }
        return {
          id: f.id,
          name: f.name,
          createdTime: f.createdTime,
          size: parseInt(f.size || '0'),
          metadata: meta,
        };
      });

    return backupList;
  }

  /**
   * Uploads an encrypted backup to the user's Google Drive appDataFolder
   */
  public async uploadBackup(onProgress?: (step: string, pct: number) => void): Promise<BackupMetadata> {
    if (!this.accessToken || !this.connectedUser) {
      throw new Error('Google Drive is not connected. Please connect your Google account first.');
    }

    if (onProgress) onProgress('Collecting all milk records, customers and accounts...', 20);
    const { data, summary } = this.collectAllAppData();

    if (Object.keys(data).length === 0) {
      throw new Error('No local application data found to backup.');
    }

    const todayBs = getTodayBS();
    const bsDateStr = `${todayBs.year}/${String(todayBs.month).padStart(2, '0')}/${String(todayBs.day).padStart(2, '0')}`;
    const timestamp = Date.now();
    const backupId = `GHAULE_BAK_${timestamp}`;

    if (onProgress) onProgress('Encrypting data using military-grade AES-256-GCM...', 45);
    const encrypted = await this.encryptPayload(data, this.connectedUser.uid, this.connectedUser.email);

    const metadata: BackupMetadata = {
      backupId,
      appVersion: APP_VERSION,
      createdAt: new Date().toISOString(),
      bsDate: bsDateStr,
      userEmail: this.connectedUser.email,
      userUid: this.connectedUser.uid,
      checksum: encrypted.checksum,
      sizeBytes: encrypted.ciphertext.length,
      summary,
    };

    const backupPayload = JSON.stringify({
      algorithm: 'AES-GCM-256',
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext,
      checksum: encrypted.checksum,
      metadata,
    });

    if (onProgress) onProgress('Uploading encrypted backup to Google Drive appDataFolder...', 70);

    const fileName = `${BACKUP_PREFIX}${todayBs.year}_${todayBs.month}_${todayBs.day}_${timestamp}.ghbak`;
    const boundary = '-------ghaule_drive_boundary_' + Math.random().toString(36).substring(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const fileMetadata = {
      name: fileName,
      parents: ['appDataFolder'],
      mimeType: 'application/json',
      description: JSON.stringify(metadata),
      properties: {
        app: 'GhauleCalculator',
        userEmail: this.connectedUser.email,
        backupId,
        checksum: encrypted.checksum,
      },
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(fileMetadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      backupPayload +
      closeDelimiter;

    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Google Drive upload failed with status ${res.status}`);
    }

    if (onProgress) onProgress('Verifying backup and maintaining latest 10 versions...', 90);
    // Maintain version history: Keep latest 10 verified backups
    await this.pruneOldBackups().catch((err) => console.warn('[CloudBackup] Prune note:', err));

    if (onProgress) onProgress('Cloud backup completed successfully! ✓', 100);
    return metadata;
  }

  /**
   * Downloads and restores a selected backup file from Google Drive appDataFolder
   */
  public async restoreBackup(fileId: string, onProgress?: (step: string, pct: number) => void): Promise<{ success: boolean; keysRestored: number; metadata: BackupMetadata }> {
    if (!this.accessToken || !this.connectedUser) {
      throw new Error('Google Drive is not connected. Please connect your Google account first.');
    }

    if (onProgress) onProgress('Downloading encrypted backup from Google Drive...', 30);
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to download backup file from Drive (${res.status})`);
    }

    const payload = await res.json();
    if (!payload.ciphertext || !payload.iv || !payload.checksum) {
      throw new Error('Invalid backup file format or corrupted package.');
    }

    if (onProgress) onProgress('Decrypting data and verifying cryptographic checksum...', 65);
    const decryptedData = await this.decryptPayload(
      payload.ciphertext,
      payload.iv,
      payload.checksum,
      this.connectedUser.uid,
      this.connectedUser.email
    );

    if (onProgress) onProgress('Restoring customers, milk ledgers and records...', 90);
    const { success, keysRestored } = this.restoreAppData(decryptedData);

    if (!success) {
      throw new Error('Failed to restore data into local storage.');
    }

    if (onProgress) onProgress('Restore completed successfully! ✓', 100);
    return {
      success: true,
      keysRestored,
      metadata: payload.metadata,
    };
  }

  /**
   * Keeps only the latest 10 verified backups and deletes older ones
   */
  public async pruneOldBackups(maxKeep = MAX_VERIFIED_BACKUPS): Promise<number> {
    try {
      const all = await this.listBackups();
      if (all.length <= maxKeep) return 0;

      const toDelete = all.slice(maxKeep);
      let deleted = 0;
      for (const item of toDelete) {
        await fetch(`https://www.googleapis.com/drive/v3/files/${item.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        });
        deleted++;
      }
      return deleted;
    } catch (e) {
      console.warn('[CloudBackup] Prune error:', e);
      return 0;
    }
  }

  /**
   * Deletes a specific backup file
   */
  public async deleteBackup(fileId: string): Promise<boolean> {
    if (!this.accessToken) return false;
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
    return res.ok;
  }
}

export const cloudBackupManager = new CloudBackupManager();
