/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DAIRY / SHOP PROFILE & BILL BRANDING MANAGER
 * Gaule Calculator Single Source of Truth for Receipts, Bills, and Exports
 * Now user-isolated & cloud-synced to Firestore users/{uid}/settings/branding.
 */

import { syncEngine } from '../firebase/syncEngine';

export interface DairyBrandingProfile {
  dairyName: string;
  proprietorName: string;
  mobile: string;
  alternateMobile?: string;
  address: string;
  slogan?: string;
  panVatNumber?: string;
  logoUrl?: string; // base64 or custom image URL
  shopType?: 'dairy' | 'kirana' | 'jeweler' | 'finance' | 'restaurant' | 'hardware' | 'general';
  updatedAt?: number;
}

const BRANDING_STORAGE_KEY = 'ghaule_dairy_branding_profile_v1';
const ACTIVE_ACCOUNT_KEY = 'ghaule_active_account';

export const DEFAULT_DAIRY_PROFILE: DairyBrandingProfile = {
  dairyName: 'हाम्रो दुध डेरी तथा संकलन केन्द्र',
  proprietorName: 'डेयरी सञ्चालक',
  mobile: '९८००००००००',
  alternateMobile: '',
  address: 'स्थानीय बजार, नेपाल',
  slogan: 'शुद्ध दुध, स्वस्थ जीवन',
  panVatNumber: '',
  shopType: 'dairy',
};

const listeners = new Set<(profile: DairyBrandingProfile) => void>();

function getActiveUserInfo(): { uid?: string; isGuest?: boolean } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getScopedBrandingKey(): string {
  const user = getActiveUserInfo();
  if (user?.uid && !user.isGuest) {
    return `ghaule_u_${user.uid}_dairy_branding_profile_v1`;
  }
  if (user?.isGuest && (user as any).guestSessionId) {
    return `ghaule_gst_${(user as any).guestSessionId}_dairy_branding_profile_v1`;
  }
  return BRANDING_STORAGE_KEY;
}

function notifyAllBrandingListeners(updated: DairyBrandingProfile) {
  listeners.forEach((fn) => {
    try {
      fn(updated);
    } catch (e) {
      console.error('Error in branding listener', e);
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ghaule_branding_changed', { detail: updated }));
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('ghaule_branding_cloud_applied', (ev: any) => {
    if (ev?.detail) {
      notifyAllBrandingListeners(ev.detail as DairyBrandingProfile);
    }
  });
}

export const dairyBranding = {
  getProfile(): DairyBrandingProfile {
    if (typeof window === 'undefined') return DEFAULT_DAIRY_PROFILE;
    try {
      const scopedKey = getScopedBrandingKey();
      let raw = localStorage.getItem(scopedKey);
      if (!raw && scopedKey !== BRANDING_STORAGE_KEY) {
        // Migrate legacy global branding only if user had customized it and has no scoped entry yet
        const legacyRaw = localStorage.getItem(BRANDING_STORAGE_KEY);
        if (legacyRaw) {
          raw = legacyRaw;
          localStorage.setItem(scopedKey, legacyRaw);
        }
      }
      if (!raw) return DEFAULT_DAIRY_PROFILE;
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_DAIRY_PROFILE,
        ...parsed,
      };
    } catch {
      return DEFAULT_DAIRY_PROFILE;
    }
  },

  saveProfile(profile: DairyBrandingProfile): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const updated: DairyBrandingProfile = {
        ...DEFAULT_DAIRY_PROFILE,
        ...profile,
        updatedAt: Date.now(),
      };
      const scopedKey = getScopedBrandingKey();
      localStorage.setItem(scopedKey, JSON.stringify(updated));
      localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(updated));

      notifyAllBrandingListeners(updated);

      // Push branding profile to Cloud Firestore for logged-in Google users
      const user = getActiveUserInfo();
      if (user?.uid && !user.isGuest) {
        syncEngine.pushItemChange(user.uid, 'settings', 'branding', updated, 'set');
      }

      // Also sync to HamroPasal profile if stored so all shop records stay unified
      try {
        const pasalKey = 'ghaule_hamro_pasal_profile_v1';
        const rawPasal = localStorage.getItem(pasalKey);
        if (rawPasal) {
          const p = JSON.parse(rawPasal);
          p.name = updated.dairyName;
          p.ownerName = updated.proprietorName;
          p.mobile = updated.mobile;
          p.address = updated.address;
          if (updated.panVatNumber) p.panNumber = updated.panVatNumber;
          if (updated.logoUrl) p.logoUrl = updated.logoUrl;
          localStorage.setItem(pasalKey, JSON.stringify(p));
        }
      } catch {}

      return true;
    } catch (e) {
      console.error('Failed to save dairy branding profile:', e);
      return false;
    }
  },

  /**
   * Hydrates branding received from Firestore without triggering a redundant push back.
   */
  applyCloudBranding(remoteProfile: DairyBrandingProfile | null | undefined, uid?: string): boolean {
    if (typeof window === 'undefined' || !remoteProfile || !remoteProfile.dairyName) return false;
    try {
      const targetKey =
        uid && !uid.startsWith('guest_')
          ? `ghaule_u_${uid}_dairy_branding_profile_v1`
          : getScopedBrandingKey();

      const localRaw = localStorage.getItem(targetKey);
      const localParsed: DairyBrandingProfile | null = localRaw ? JSON.parse(localRaw) : null;
      const localUpdated = Number(localParsed?.updatedAt || 0);
      const remoteUpdated = Number(remoteProfile.updatedAt || 0);

      if (!localParsed || remoteUpdated >= localUpdated) {
        const merged: DairyBrandingProfile = {
          ...DEFAULT_DAIRY_PROFILE,
          ...remoteProfile,
        };
        localStorage.setItem(targetKey, JSON.stringify(merged));
        localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(merged));
        notifyAllBrandingListeners(merged);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  subscribe(listener: (profile: DairyBrandingProfile) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
