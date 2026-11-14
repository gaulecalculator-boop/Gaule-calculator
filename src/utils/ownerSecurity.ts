/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * OWNER SAFE PIN SECURITY MANAGER
 * Protects critical actions (delete customer, clear database, wipe ledger)
 * so staff/helpers cannot accidentally or maliciously delete owner records.
 */

const PIN_STORAGE_KEY = 'ghaule_owner_security_pin_v1';
const PIN_ENABLED_KEY = 'ghaule_owner_pin_enabled_v1';

export const ownerSecurity = {
  isPinSet(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(PIN_STORAGE_KEY);
  },

  isPinEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(PIN_ENABLED_KEY) === 'true';
  },

  setPin(pin: string): boolean {
    if (!pin || pin.length < 4) return false;
    localStorage.setItem(PIN_STORAGE_KEY, pin);
    localStorage.setItem(PIN_ENABLED_KEY, 'true');
    return true;
  },

  disablePin(currentPin: string): boolean {
    if (this.verifyPin(currentPin)) {
      localStorage.setItem(PIN_ENABLED_KEY, 'false');
      return true;
    }
    return false;
  },

  verifyPin(inputPin: string): boolean {
    if (!this.isPinEnabled()) return true;
    const saved = localStorage.getItem(PIN_STORAGE_KEY);
    if (!saved) return true;
    return saved === inputPin;
  },

  removePin(currentPin: string): boolean {
    if (this.verifyPin(currentPin)) {
      localStorage.removeItem(PIN_STORAGE_KEY);
      localStorage.removeItem(PIN_ENABLED_KEY);
      return true;
    }
    return false;
  },
};
