/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Gaule Calculator — Runtime Integrity Lock
 * Freezes critical runtime configuration & static registries against accidental or
 * malicious mutation while keeping DevTools debugging and accessibility 100% intact.
 */

import { firebaseConfig } from '../firebase/config';
import { ALL_CALCULATORS } from '../data/calculatorList';
import { SUPPORTED_LANGUAGES } from './universalTranslator';

let initialized = false;

export function initAppIntegrityLock(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // Freeze critical immutable configuration & tool/language registries in memory
  try {
    Object.freeze(firebaseConfig);
    ALL_CALCULATORS.forEach((item) => Object.freeze(item));
    Object.freeze(ALL_CALCULATORS);
    SUPPORTED_LANGUAGES.forEach((lang) => Object.freeze(lang));
    Object.freeze(SUPPORTED_LANGUAGES);
  } catch {
    // Ignore if already frozen
  }
}
