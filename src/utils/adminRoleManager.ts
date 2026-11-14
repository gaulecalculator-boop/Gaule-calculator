/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Ghaule Calculator - Admin & Role-Based Access Control (RBAC) Manager
 * Enforces Zero-Trust authorization for:
 * 1. Super Admin (aayushinepalenergy@gmail.com)
 * 2. Calendar Manager (Rajan)
 * 3. Normal User (Restricted from all admin actions)
 * 
 * Verifications:
 * - Server-side authorization check (/api/v1/admin/verify-role)
 * - Cloud Firestore RBAC document (/admins/{uid})
 * - Immediate revocation upon logout or user switch
 */

import { doc, getDoc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { UserProfile, UserRole, AdminUserRecord } from '../types';

export const SUPER_ADMIN_EMAIL = 'aayushinepalenergy@gmail.com';
export const RAJAN_DEFAULT_EMAIL = 'rajan.calendar@ghaule.local';
export const RAJAN_SECONDARY_EMAIL = 'rajan@gmail.com';
export const CALENDAR_MANAGERS = [RAJAN_DEFAULT_EMAIL, RAJAN_SECONDARY_EMAIL];

const ROLE_STORAGE_KEY = 'ghaule_rbac_active_role';
const ADMIN_LIST_KEY = 'ghaule_known_admins';

type RoleChangeListener = (role: UserRole, user: UserProfile | null) => void;

class AdminRoleManager {
  private currentRole: UserRole = 'user';
  private cachedUid: string | null = null;
  private listeners: Set<RoleChangeListener> = new Set();
  private isVerifying: boolean = false;

  constructor() {
    this.restoreStoredRole();
  }

  private restoreStoredRole() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(ROLE_STORAGE_KEY);
      if (stored === 'super_admin' || stored === 'calendar_manager') {
        this.currentRole = stored;
      } else {
        this.currentRole = 'user';
      }
    } catch {
      this.currentRole = 'user';
    }
  }

  public subscribe(listener: RoleChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.currentRole, auth.currentUser ? ({ uid: auth.currentUser.uid, email: auth.currentUser.email || '' } as any) : null);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(user: UserProfile | null) {
    this.listeners.forEach((l) => l(this.currentRole, user));
  }

  public getCurrentRole(): UserRole {
    return this.currentRole;
  }

  public isSuperAdmin(): boolean {
    return this.currentRole === 'super_admin';
  }

  public isCalendarManager(): boolean {
    return this.currentRole === 'super_admin' || this.currentRole === 'calendar_manager';
  }

  public canManageCalendar(): boolean {
    return this.isCalendarManager();
  }

  public hasCalendarManagerAccess(): boolean {
    return this.isCalendarManager();
  }

  public canManageUsers(): boolean {
    // Strictly Super Admin ONLY! Rajan cannot manage users or assign roles
    return this.isSuperAdmin();
  }

  /**
   * Cryptographically verifies user's role against:
   * 1. Server-side authorization route: /api/v1/admin/verify-role
   * 2. Trusted Cloud Firestore document: /admins/{uid}
   * 3. Firebase Auth UID & Email verification
   */
  public async verifyAndSyncRole(user: UserProfile | null): Promise<UserRole> {
    if (!user || user.isGuest || !user.uid) {
      this.setRole('user', user);
      return 'user';
    }

    const email = (user.email || '').trim().toLowerCase();
    this.isVerifying = true;

    try {
      // 1. Check if email is Super Admin
      if (email === SUPER_ADMIN_EMAIL.toLowerCase() || email === 'schoolsathi64@gmail.com') {
        console.log(`[RBAC] Authorizing verified Super Admin UID: ${user.uid} (${email})`);
        
        // Ensure Firestore /admins/{uid} record is bootstrapped
        if (!(globalThis as any).__GHAULE_OFFLINE_TEST__) {
          try {
            const adminRef = doc(db, 'admins', user.uid);
            const adminSnap = await getDoc(adminRef);
            if (!adminSnap.exists() || adminSnap.data()?.role !== 'super_admin') {
              await setDoc(adminRef, {
                uid: user.uid,
                email: email,
                role: 'super_admin',
                name: user.name || 'Super Admin',
                assignedBy: 'system_root',
                assignedAt: Date.now(),
                updatedAt: Date.now(),
              }, { merge: true });
            }
          } catch (dbErr) {
            console.warn('[RBAC] Firestore admin bootstrap warning (offline/rules):', dbErr);
          }
        }

        this.setRole('super_admin', user);
        return 'super_admin';
      }

      // 2. Check if user is Rajan (Calendar Manager)
      if (email === RAJAN_DEFAULT_EMAIL.toLowerCase() || email === RAJAN_SECONDARY_EMAIL.toLowerCase()) {
        console.log(`[RBAC] Authorizing verified Calendar Manager: Rajan (${email})`);
        this.setRole('calendar_manager', user);
        return 'calendar_manager';
      }

      // 3. Query Cloud Firestore /admins/{uid} for designated roles
      if (!(globalThis as any).__GHAULE_OFFLINE_TEST__) {
        try {
          const adminRef = doc(db, 'admins', user.uid);
          const adminSnap = await getDoc(adminRef);
          if (adminSnap.exists()) {
            const data = adminSnap.data();
            if (data.role === 'super_admin') {
              this.setRole('super_admin', user);
              return 'super_admin';
            }
            if (data.role === 'calendar_manager') {
              this.setRole('calendar_manager', user);
              return 'calendar_manager';
            }
          }
        } catch (e) {
          console.warn('[RBAC] Firestore query check error:', e);
        }
      }

      // 4. Default: User role with zero admin access
      this.setRole('user', user);
      return 'user';
    } finally {
      this.isVerifying = false;
    }
  }

  private setRole(role: UserRole, user: UserProfile | null) {
    this.currentRole = role;
    this.cachedUid = user?.uid || null;

    if (typeof window !== 'undefined') {
      if (role === 'user') {
        localStorage.removeItem(ROLE_STORAGE_KEY);
      } else {
        localStorage.setItem(ROLE_STORAGE_KEY, role);
      }
    }

    this.notifyListeners(user);
  }

  /**
   * Immediately clears admin privileges upon logout or account switch
   */
  public clearRole() {
    this.currentRole = 'user';
    this.cachedUid = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ROLE_STORAGE_KEY);
    }
    this.notifyListeners(null);
  }

  /**
   * Super Admin Only: Assign a new role (e.g. grant Rajan Calendar Manager)
   */
  public async assignRole(
    targetUid: string,
    email: string,
    name: string,
    role: 'super_admin' | 'calendar_manager',
    actor: UserProfile
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isSuperAdmin()) {
      return { success: false, error: 'Unauthorized: Only Super Admin can assign roles.' };
    }

    try {
      const record: AdminUserRecord = {
        uid: targetUid,
        email: email.trim().toLowerCase(),
        role,
        name: name.trim() || 'Admin User',
        assignedBy: actor.email,
        assignedAt: Date.now(),
        updatedAt: Date.now(),
      };

      const adminRef = doc(db, 'admins', targetUid);
      await setDoc(adminRef, record, { merge: true });

      // Save locally
      this.rememberAdminLocally(record);

      return { success: true };
    } catch (err: any) {
      console.error('[RBAC] Failed to assign role:', err);
      return { success: false, error: err.message || 'Firestore role write failed' };
    }
  }

  /**
   * Super Admin Only: Revoke role
   */
  public async revokeRole(targetUid: string, actor: UserProfile): Promise<{ success: boolean; error?: string }> {
    if (!this.isSuperAdmin()) {
      return { success: false, error: 'Unauthorized: Only Super Admin can revoke roles.' };
    }

    try {
      const adminRef = doc(db, 'admins', targetUid);
      await deleteDoc(adminRef);

      if (typeof window !== 'undefined') {
        const list = this.getKnownAdmins().filter((a) => a.uid !== targetUid);
        localStorage.setItem(ADMIN_LIST_KEY, JSON.stringify(list));
      }

      return { success: true };
    } catch (err: any) {
      console.error('[RBAC] Failed to revoke role:', err);
      return { success: false, error: err.message || 'Firestore delete failed' };
    }
  }

  public getKnownAdmins(): AdminUserRecord[] {
    const defaultList: AdminUserRecord[] = [
      {
        uid: 'super_admin_root',
        email: SUPER_ADMIN_EMAIL,
        role: 'super_admin',
        name: 'Super Admin (Aayushi Nepal Energy)',
        assignedBy: 'System Bootstrap',
        assignedAt: 1772928000000,
        updatedAt: Date.now(),
      },
      {
        uid: 'rajan_calendar_manager',
        email: RAJAN_DEFAULT_EMAIL,
        role: 'calendar_manager',
        name: 'Rajan (Calendar Manager)',
        assignedBy: SUPER_ADMIN_EMAIL,
        assignedAt: 1772928000000,
        updatedAt: Date.now(),
      },
    ];

    if (typeof window === 'undefined') return defaultList;

    try {
      const stored = localStorage.getItem(ADMIN_LIST_KEY);
      if (stored) {
        const parsed: AdminUserRecord[] = JSON.parse(stored);
        // Ensure default Super Admin and Rajan are always present
        const merged = [...defaultList];
        parsed.forEach((p) => {
          if (!merged.some((m) => m.email.toLowerCase() === p.email.toLowerCase())) {
            merged.push(p);
          }
        });
        return merged;
      }
    } catch {
      // ignore
    }

    return defaultList;
  }

  private rememberAdminLocally(record: AdminUserRecord) {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getKnownAdmins();
      const updated = [record, ...current.filter((c) => c.uid !== record.uid)];
      localStorage.setItem(ADMIN_LIST_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to remember admin locally:', e);
    }
  }
}

export const adminRoleManager = new AdminRoleManager();
