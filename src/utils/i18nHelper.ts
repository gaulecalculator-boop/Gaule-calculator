import { Language } from '../types';

const warnedKeys = new Set<string>();

/**
 * Logs a deduplicated development warning when a Bhojpuri translation is missing
 * or falls back unexpectedly, without spamming the console.
 */
export function warnMissingBhojpuri(context: string, detail?: string): void {
  if (!import.meta.env?.DEV) return;
  const sig = `${context}::${detail || ''}`;
  if (warnedKeys.has(sig)) return;
  warnedKeys.add(sig);
  console.warn(`[i18n:bho] Missing or invalid Bhojpuri translation in ${context}${detail ? `: "${detail}"` : ''}`);
}

export interface FiveLangMap<T = string> {
  en: T;
  hi: T;
  bho: T;
  mai: T;
  ne: T;
}

/**
 * Strictly selects the value for the exact active language across all 5 supported languages.
 * Never silently routes Bhojpuri ('bho') to Nepali ('ne') or Hindi ('hi').
 */
export function pick5<T = string>(lang: Language, map: FiveLangMap<T>, context = 'pick5'): T {
  if (lang === 'bho') {
    const val = map.bho;
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      warnMissingBhojpuri(context, typeof map.en === 'string' ? map.en : 'empty');
      return map.en;
    }
    return val;
  }
  if (lang === 'hi') return map.hi;
  if (lang === 'mai') return map.mai;
  if (lang === 'ne') return map.ne;
  return map.en;
}
