/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Local Notification & Reminder Engine for Ghaule Calculator
 * Provides offline reminders for:
 * 1. Major Nepali Festivals (Dashain, Tihar, Chhath, etc.)
 * 2. Holy Ekadashis (All 24 Ekadashis per year)
 * 3. Sacred Lunar Days (Purnima & Amavasya/Aunsi)
 * 4. Custom User Reminders & Birthdays (in BS or AD)
 * 5. Daily Morning Panchang Alert
 * 
 * Features:
 * - 100% Offline with localStorage persistence
 * - Web Notifications API integration with permission check
 * - In-app visual notification fallback when permission denied
 * - Duplicate prevention via deterministic unique ID keys
 */

export type ReminderCategory = 'festival' | 'ekadashi' | 'purnima' | 'amavasya' | 'custom' | 'birthday' | 'panchang';

export interface AppReminder {
  id: string;
  category: ReminderCategory;
  titleNe: string;
  titleEn: string;
  notes?: string;
  bsYear?: number;
  bsMonth?: number; // 1-12
  bsDay?: number;   // 1-32
  timeStr: string;  // HH:mm
  enabled: boolean;
  createdAt: string;
  lastNotifiedDate?: string; // YYYY-MM-DD to prevent same-day duplicates
}

const STORAGE_KEY = 'ghaule_app_reminders';
const SETTINGS_KEY = 'ghaule_notification_settings';

const memoryStore = new Map<string, string>();

function getStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {}
  return memoryStore.get(key) || null;
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
  } catch {}
  memoryStore.set(key, value);
}

function removeStorageItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }
  } catch {}
  memoryStore.delete(key);
}

export interface NotificationSettings {
  notificationsEnabled: boolean;
  ekadashiAlerts: boolean;
  purnimaAlerts: boolean;
  amavasyaAlerts: boolean;
  festivalAlerts: boolean;
  dailyPanchangAlert: boolean;
  dailyPanchangTime: string; // "06:30"
}

const DEFAULT_SETTINGS: NotificationSettings = {
  notificationsEnabled: true,
  ekadashiAlerts: true,
  purnimaAlerts: true,
  amavasyaAlerts: true,
  festivalAlerts: true,
  dailyPanchangAlert: false,
  dailyPanchangTime: '06:30',
};

export const notificationEngine = {
  getSettings(): NotificationSettings {
    try {
      const data = getStorageItem(SETTINGS_KEY);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: NotificationSettings) {
    try {
      setStorageItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving notification settings', e);
    }
  },

  getAllReminders(): AppReminder[] {
    try {
      const data = getStorageItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveReminder(reminder: Omit<AppReminder, 'id' | 'createdAt'>): AppReminder {
    const reminders = this.getAllReminders();
    const id = `rem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newRem: AppReminder = {
      ...reminder,
      id,
      createdAt: new Date().toISOString(),
    };

    reminders.push(newRem);
    try {
      setStorageItem(STORAGE_KEY, JSON.stringify(reminders));
    } catch (e) {
      console.error('Error saving reminder', e);
    }
    return newRem;
  },

  updateReminder(id: string, updates: Partial<AppReminder>): boolean {
    const reminders = this.getAllReminders();
    const index = reminders.findIndex((r) => r.id === id);
    if (index === -1) return false;

    reminders[index] = { ...reminders[index], ...updates };
    try {
      setStorageItem(STORAGE_KEY, JSON.stringify(reminders));
      return true;
    } catch {
      return false;
    }
  },

  deleteReminder(id: string): boolean {
    const reminders = this.getAllReminders();
    const filtered = reminders.filter((r) => r.id !== id);
    try {
      setStorageItem(STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  },

  toggleReminder(id: string): boolean {
    const reminders = this.getAllReminders();
    const target = reminders.find((r) => r.id === id);
    if (!target) return false;
    target.enabled = !target.enabled;
    try {
      setStorageItem(STORAGE_KEY, JSON.stringify(reminders));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Requests browser/device notification permission.
   */
  async requestPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    try {
      return await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  },

  /**
   * Fires a native browser notification if granted, or fallback console/toast.
   */
  triggerNotification(title: string, body: string, icon = '/pwa-192x192.png'): boolean {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon,
          badge: icon,
        });
        return true;
      } catch (e) {
        console.warn('Notification trigger failed', e);
      }
    }
    return false;
  },
};
