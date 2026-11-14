/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Universal Multilingual & User-Data Translation Engine
 * Supports: English (en), Hindi (hi), Bhojpuri (bho), Maithili (mai), Nepali (ne)
 * 100% Offline-ready with bidirectional Devanagari <-> Roman transliteration,
 * multi-language domain phrase mapping, and React-safe DOM translation.
 */

import { useEffect } from 'react';
import { Language } from '../types';

export interface LanguageOption {
  code: Language;
  nativeName: string;
  englishName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', flag: '🇬🇧' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', flag: '🇮🇳' },
  { code: 'bho', nativeName: 'भोजपुरी', englishName: 'Bhojpuri', flag: '🪷' },
  { code: 'mai', nativeName: 'मैथिली', englishName: 'Maithili', flag: '🏛️' },
  { code: 'ne', nativeName: 'नेपाली', englishName: 'Nepali', flag: '🇳🇵' },
];

export function isDevanagariLanguage(lang: Language): boolean {
  return lang === 'ne' || lang === 'hi' || lang === 'bho' || lang === 'mai';
}

const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export function toAsciiDigits(text: string): string {
  return String(text).replace(/[०-९]/g, (ch) => String(DEVANAGARI_DIGITS.indexOf(ch)));
}

export function toDevanagariDigits(text: string): string {
  return toAsciiDigits(text);
}

export function localizeNumberString(val: string | number, _lang?: Language): string {
  return toAsciiDigits(String(val));
}

// ---------------------------------------------------------------------------
// DEVANAGARI <-> ROMAN TRANSLITERATION (For user names, addresses, custom notes)
// ---------------------------------------------------------------------------

const DEV_CONSONANTS: Record<string, string> = {
  क: 'k', ख़: 'kh', ख: 'kh', ग़: 'g', ग: 'g', घ: 'gh', ङ: 'ng',
  च: 'ch', छ: 'chh', ज़: 'z', ज: 'j', झ: 'jh', ञ: 'ny',
  ट: 't', ठ: 'th', ड: 'd', ड़: 'r', ढ: 'dh', ढ़: 'rh', ण: 'n',
  त: 't', थ: 'th', द: 'd', ध: 'dh', न: 'n',
  प: 'p', फ़: 'f', फ: 'ph', ब: 'b', भ: 'bh', म: 'm',
  य: 'y', र: 'r', ल: 'l', व: 'w',
  श: 'sh', ष: 'sh', स: 's', ह: 'h',
  क़: 'q',
};

const DEV_VOWELS: Record<string, string> = {
  अ: 'a', आ: 'aa', इ: 'i', ई: 'ee', उ: 'u', ऊ: 'oo',
  ऋ: 'ri', ए: 'e', ऐ: 'ai', ओ: 'o', औ: 'au',
  अं: 'an', अः: 'ah',
};

const DEV_MATRAS: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
  'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
};

const CUSTOM_DEV_TO_ROMAN_WORDS: Record<string, string> = {
  राम: 'Ram', बहादुर: 'Bahadur', श्रेष्ठ: 'Shrestha', सीता: 'Sita', देवी: 'Devi',
  पौडेल: 'Paudel', कृष्ण: 'Krishna', गोपाल: 'Gopal', मानन्धर: 'Manandhar',
  राजन: 'Rajan', कुमार: 'Kumar', ठाकुर: 'Thakur', शर्मा: 'Sharma', थापा: 'Thapa',
  बनेपा: 'Banepa', काभ्रे: 'Kavre', धुलिखेल: 'Dhulikhel', पनौती: 'Panauti',
  काठमाडौं: 'Kathmandu', जनकपुर: 'Janakpur', बिराटनगर: 'Biratnagar', वीरगन्ज: 'Birgunj',
  रौतहट: 'Rautahat', सर्लाही: 'Sarlahi', महोत्तरी: 'Mahottari', धनुषा: 'Dhanusha',
  सिराहा: 'Siraha', सप्तरी: 'Saptari', बारा: 'Bara', पर्सा: 'Parsa',
  नेपाल: 'Nepal', भारत: 'India', बिहार: 'Bihar', पटना: 'Patna',
  गाउँले: 'Gaule', हाम्रो: 'Hamro', पसल: 'Pasal', दूध: 'Milk', दुध: 'Milk',
  गाई: 'Cow', भैंसी: 'Buffalo', घर: 'Home', दुकान: 'Shop', होटेल: 'Hotel', होटल: 'Hotel',
  कर्जा: 'Loan', ब्याज: 'Interest', साँवा: 'Principal', किस्ता: 'Installment',
  रकम: 'Amount', भुक्तानी: 'Payment', बाँकी: 'Due', खाता: 'Ledger',
};

function transliterateDevanagariWordToRoman(word: string): string {
  const clean = toAsciiDigits(word);
  if (CUSTOM_DEV_TO_ROMAN_WORDS[clean]) return CUSTOM_DEV_TO_ROMAN_WORDS[clean];
  if (!/[\u0900-\u097F]/.test(clean)) return clean;

  const chars = Array.from(clean);
  let out = '';
  let i = 0;

  while (i < chars.length) {
    const ch = chars[i];
    const next = chars[i + 1];

    // Two-char nukta consonants
    if (next === '़' && DEV_CONSONANTS[ch + next]) {
      const base = DEV_CONSONANTS[ch + next];
      const after = chars[i + 2];
      if (after === '्') {
        out += base;
        i += 3;
      } else if (after && DEV_MATRAS[after] !== undefined) {
        out += base + DEV_MATRAS[after];
        i += 3;
      } else {
        const isWordEnd = i + 2 >= chars.length || !/[\u0900-\u097F]/.test(chars[i + 2]);
        out += base + (isWordEnd ? '' : 'a');
        i += 2;
      }
      continue;
    }

    // Special conjuncts: क्ष, त्र, ज्ञ, श्र
    if ((ch === 'क' && next === '्' && chars[i + 2] === 'ष') ||
        (ch === 'त' && next === '्' && chars[i + 2] === 'र') ||
        (ch === 'ज' && next === '्' && chars[i + 2] === 'ञ') ||
        (ch === 'श' && next === '्' && chars[i + 2] === 'र')) {
      const conj = ch === 'क' ? 'ksh' : ch === 'त' ? 'tr' : ch === 'ज' ? 'gy' : 'shr';
      const after = chars[i + 3];
      if (after === '्') {
        out += conj;
        i += 4;
      } else if (after && DEV_MATRAS[after] !== undefined) {
        out += conj + DEV_MATRAS[after];
        i += 4;
      } else {
        const isWordEnd = i + 3 >= chars.length || !/[\u0900-\u097F]/.test(chars[i + 3]);
        out += conj + (isWordEnd ? '' : 'a');
        i += 3;
      }
      continue;
    }

    if (DEV_VOWELS[ch] !== undefined) {
      out += DEV_VOWELS[ch];
      i += 1;
      continue;
    }

    if (DEV_CONSONANTS[ch] !== undefined) {
      const base = DEV_CONSONANTS[ch];
      if (next === '्') {
        out += base;
        i += 2;
      } else if (next && DEV_MATRAS[next] !== undefined) {
        out += base + DEV_MATRAS[next];
        i += 2;
      } else if (next === 'ं' || next === 'ँ') {
        out += base + 'an';
        i += 2;
      } else {
        const isWordEnd = i + 1 >= chars.length || !/[\u0900-\u097F]/.test(chars[i + 1]);
        out += base + (isWordEnd ? '' : 'a');
        i += 1;
      }
      continue;
    }

    if (ch === 'ं' || ch === 'ँ') {
      out += 'n';
      i += 1;
      continue;
    }
    if (ch === 'ः') {
      out += 'h';
      i += 1;
      continue;
    }
    if (ch === '।') {
      out += '.';
      i += 1;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out.length > 0 ? out.charAt(0).toUpperCase() + out.slice(1) : out;
}

export function devanagariToRoman(text: string): string {
  if (!text) return '';
  return text.replace(/[\u0900-\u097F]+/g, (segment) => transliterateDevanagariWordToRoman(segment));
}

const CUSTOM_ROMAN_TO_DEV_WORDS: Record<string, string> = {
  ram: 'राम', bahadur: 'बहादुर', shrestha: 'श्रेष्ठ', sita: 'सीता', devi: 'देवी',
  paudel: 'पौडेल', krishna: 'कृष्ण', gopal: 'गोपाल', manandhar: 'मानन्धर',
  rajan: 'राजन', kumar: 'कुमार', thakur: 'ठाकुर', sharma: 'शर्मा', thapa: 'थापा',
  banepa: 'बनेपा', kavre: 'काभ्रे', dhulikhel: 'धुलिखेल', panauti: 'पनौती',
  kathmandu: 'काठमांडू', janakpur: 'जनकपुर', patna: 'पटना', bihar: 'बिहार',
  nepal: 'नेपाल', india: 'भारत', gaule: 'गाउँले', hamro: 'हाम्रो', pasal: 'पसल',
  doodh: 'दूध', milk: 'दूध', byaj: 'ब्याज', interest: 'ब्याज', loan: 'कर्जा',
  cow: 'गाय', buffalo: 'भैंस', morning: 'सुबह', evening: 'शाम',
  customer: 'ग्राहक', payment: 'भुगतान', cash: 'नकद', bank: 'बैंक',
  paid: 'जमा', due: 'बकाया', pending: 'बाकी', total: 'कुल', amount: 'रकम',
  ltr: 'लीटर', liter: 'लीटर', liters: 'लीटर', kg: 'किलो', gram: 'ग्राम',
  shop: 'दुकान', note: 'नोट', home: 'घर', bill: 'बिल', receipt: 'रसीद',
  esewa: 'ई-सेवा', khalti: 'खल्ती', qr: 'QR', whatsapp: 'व्हाट्सएप', pdf: 'PDF',
  csv: 'CSV', npr: 'NPR', inr: 'INR', bs: 'BS', ad: 'AD', am: 'AM', pm: 'PM',
  ghee: 'घी', paneer: 'पनीर', curd: 'दही', dahi: 'दही', butter: 'मक्खन',
  khoya: 'खोया', rice: 'चावल', sugar: 'चीनी', oil: 'तेल', flour: 'आटा',
  dal: 'दाल', tea: 'चाय', gold: 'सोना', silver: 'चाँदी', tola: 'तोला',
  monthly: 'मासिक', daily: 'दैनिक', yearly: 'वार्षिक', advance: 'अग्रिम',
  balance: 'बकाया', remaining: 'बाकी', discount: 'छूट', full: 'पूरा',
  partial: 'आंशिक', cleared: 'चुकता', clear: 'चुकता', installment: 'किस्त',
  hotel: 'होटल', dairy: 'डेयरी', farmer: 'किसान', borrower: 'ऋणी',
  village: 'गाँव', ward: 'वार्ड', tole: 'टोल', chowk: 'चौक', bazar: 'बाजार',
};

const ROMAN_CONSONANT_DIGRAPHS: [string, string][] = [
  ['ksh', 'क्ष'], ['chh', 'छ'], ['sh', 'श'], ['ch', 'च'], ['kh', 'ख'],
  ['gh', 'घ'], ['jh', 'झ'], ['th', 'थ'], ['dh', 'ध'], ['ph', 'फ'],
  ['bh', 'भ'], ['ng', 'ङ'], ['ny', 'ञ'], ['gy', 'ज्ञ'], ['tr', 'त्र'],
  ['k', 'क'], ['g', 'ग'], ['j', 'ज'], ['t', 'त'], ['d', 'द'], ['n', 'न'],
  ['p', 'प'], ['f', 'फ'], ['b', 'ब'], ['m', 'म'], ['y', 'य'], ['r', 'र'],
  ['l', 'ल'], ['v', 'व'], ['w', 'व'], ['s', 'स'], ['h', 'ह'], ['c', 'क'],
  ['q', 'क'], ['z', 'ज'], ['x', 'क्स'],
];

const ROMAN_VOWEL_TO_INDEP: [string, string][] = [
  ['aa', 'आ'], ['ee', 'ई'], ['ii', 'ई'], ['oo', 'ऊ'], ['uu', 'ऊ'],
  ['ai', 'ऐ'], ['au', 'औ'], ['ou', 'औ'],
  ['a', 'अ'], ['i', 'इ'], ['u', 'उ'], ['e', 'ए'], ['o', 'ओ'],
];

const ROMAN_VOWEL_TO_MATRA: [string, string][] = [
  ['aa', 'ा'], ['ee', 'ी'], ['ii', 'ी'], ['oo', 'ू'], ['uu', 'ू'],
  ['ai', 'ै'], ['au', 'ौ'], ['ou', 'ौ'],
  ['a', ''], ['i', 'ि'], ['u', 'ु'], ['e', 'े'], ['o', 'ो'],
];

function transliterateRomanWordToDevanagari(word: string): string {
  const lower = word.toLowerCase();
  if (CUSTOM_ROMAN_TO_DEV_WORDS[lower]) return CUSTOM_ROMAN_TO_DEV_WORDS[lower];
  // Preserve short acronyms / codes / currency codes
  if (/^[A-Z0-9_-]{2,6}$/.test(word) && word === word.toUpperCase()) return word;

  let out = '';
  let i = 0;

  while (i < lower.length) {
    const rest = lower.slice(i);

    // Try vowel at start or after vowel
    const vMatch = ROMAN_VOWEL_TO_INDEP.find(([pat]) => rest.startsWith(pat));
    if (vMatch) {
      out += vMatch[1];
      i += vMatch[0].length;
      continue;
    }

    const cMatch = ROMAN_CONSONANT_DIGRAPHS.find(([pat]) => rest.startsWith(pat));
    if (cMatch) {
      out += cMatch[1];
      i += cMatch[0].length;

      const afterCons = lower.slice(i);
      if (afterCons.length === 0) {
        // Inherent vowel suppressed at end
        break;
      }
      const mMatch = ROMAN_VOWEL_TO_MATRA.find(([pat]) => afterCons.startsWith(pat));
      if (mMatch) {
        out += mMatch[1];
        i += mMatch[0].length;
      } else {
        // Next is another consonant -> check if double or cluster
        const nextCons = ROMAN_CONSONANT_DIGRAPHS.find(([pat]) => afterCons.startsWith(pat));
        if (nextCons && i < lower.length) {
          // Keep smooth readable output without over-inserting halant on simple clusters unless identical
          if (nextCons[1] === cMatch[1]) {
            out += '्';
          }
        }
      }
      continue;
    }

    out += word[i];
    i += 1;
  }

  return out;
}

export function romanToDevanagari(text: string): string {
  if (!text) return '';
  // Skip URLs, emails, base64/data URIs
  if (/^(https?:\/\/|data:|mailto:)/i.test(text.trim())) return text;
  // Temporarily mask inline emails/URLs so they stay intact
  const preserved: string[] = [];
  const masked = text.replace(/([^\s@]+@[^\s@]+\.[^\s@]+|https?:\/\/\S+)/gi, (m) => {
    const idx = preserved.push(m) - 1;
    return `__PRESERVED_${idx}__`;
  });
  const converted = masked.replace(/\b[A-Za-z]+\b/g, (word) => {
    if (word.startsWith('__PRESERVED_')) return word;
    return transliterateRomanWordToDevanagari(word);
  });
  return converted.replace(/__PRESERVED_(\d+)__/g, (_, i) => preserved[Number(i)] || '');
}

// ---------------------------------------------------------------------------
// 5-LANGUAGE PHRASE & DOMAIN DICTIONARY
// ---------------------------------------------------------------------------

interface PhraseEntry {
  en: string;
  hi: string;
  bho: string;
  mai: string;
  ne: string;
}

const PHRASE_ENTRIES: PhraseEntry[] = [
  // App Branding & Nav
  { en: 'Smart Nepal Calculator Hub', hi: 'स्मार्ट नेपाल कैलकुलेटर हब', bho: 'स्मार्ट नेपाल कैलकुलेटर हब', mai: 'स्मार्ट नेपाल कैलकुलेटर हब', ne: 'स्मार्ट नेपाल क्याल्कुलेटर हब' },
  { en: 'Nepal All-in-One Offline Calculator Hub', hi: 'नेपाल ऑल-इन-वन ऑफलाइन कैलकुलेटर हब', bho: 'नेपाल ऑल-इन-वन ऑफलाइन कैलकुलेटर हब', mai: 'नेपाल ऑल-इन-वन ऑफलाइन कैलकुलेटर हब', ne: 'नेपाल अल-इन-वन अफलाइन क्याल्कुलेटर हब' },
  { en: 'Home', hi: 'होम', bho: 'होम', mai: 'होम', ne: 'गृहपृष्ठ' },
  { en: 'Tools', hi: 'टूल्स', bho: 'टूल्स', mai: 'टूल्स', ne: 'सबै टुल' },
  { en: '3 Notebooks', hi: '३ नोटबुक खाता', bho: '३ खाता किताब', mai: '३ खाता पोथी', ne: '३ खाता नोटबुक' },
  { en: 'History', hi: 'इतिहास', bho: 'इतिहास', mai: 'इतिहास', ne: 'इतिहास' },
  { en: 'Settings', hi: 'सेटिंग्स', bho: 'सेटिंग्स', mai: 'सेटिंग्स', ne: 'सेटिङ्स' },
  { en: 'Settings & Backup', hi: 'सेटिंग्स और बैकअप', bho: 'सेटिंग्स आ बैकअप', mai: 'सेटिंग्स आ बैकअप', ne: 'सेटिङ्स र ब्याकअप' },
  { en: 'Calculation History', hi: 'हिसाब इतिहास', bho: 'हिसाब के इतिहास', mai: 'हिसाब केर इतिहास', ne: 'हिसाब इतिहास' },
  { en: 'All 28 Tools', hi: 'सभी २८ कैलकुलेटर', bho: 'सभे २८ कैलकुलेटर', mai: 'सभ २८ कैलकुलेटर', ne: 'सबै २८ क्याल्कुलेटर' },
  { en: 'Simple Notebook', hi: 'सिम्पल नोटबुक', bho: 'सादा नोटबुक', mai: 'सादा नोटबुक', ne: 'सिम्पल नोटबुक' },
  { en: 'Privacy Policy', hi: 'गोपनीयता नीति', bho: 'गोपनीयता नीति', mai: 'गोपनीयता नीति', ne: 'गोपनीयता नीति' },
  { en: 'Login', hi: 'लॉगिन', bho: 'लॉगिन', mai: 'लॉगिन', ne: 'लगइन' },

  // Settings & Language Card
  { en: 'App Language', hi: 'ऐप की भाषा', bho: 'ऐप के भाषा', mai: 'ऐप केर भाषा', ne: 'एपको भाषा' },
  { en: 'Select Currency', hi: 'मुद्रा चुनें', bho: 'रुपया चुनीं', mai: 'मुद्रा चुनू', ne: 'मुद्रा छान्नुहोस्' },
  { en: 'Nepali Rupee', hi: 'नेपाली रुपया', bho: 'नेपाली रुपिया', mai: 'नेपाली रूपैया', ne: 'नेपाली रुपैयाँ' },
  { en: 'Indian Rupee', hi: 'भारतीय रुपया', bho: 'भारतीय रुपिया', mai: 'भारतीय रूपैया', ne: 'भारतीय रुपया' },
  { en: 'Owner Security PIN / Password', hi: 'मालिक सुरक्षा पासवर्ड / पिन', bho: 'मालिक सुरक्षा पासवर्ड / पिन', mai: 'मालिक सुरक्षा पासवर्ड / पिन', ne: 'मालिक सुरक्षा पासवर्ड / पिन' },
  { en: 'Owner PIN Lock', hi: 'मालिक पिन लॉक', bho: 'मालिक पिन लॉक', mai: 'मालिक पिन लॉक', ne: 'मालिक पिन लक' },
  { en: 'Date Save & Account', hi: 'डेटा सेव और अकाउंट', bho: 'डेटा सेव आ खाता', mai: 'डेटा सेव आ खाता', ne: 'डेटा सेभ र खाता' },
  { en: 'Open', hi: 'खोलें', bho: 'खोलीं', mai: 'खोलू', ne: 'खोल्नुहोस्' },
  { en: 'ON', hi: 'चालू', bho: 'चालू', mai: 'चालू', ne: 'सक्रिय' },
  { en: 'OFF', hi: 'बंद', bho: 'बंद', mai: 'बंद', ne: 'बन्द' },
  { en: 'Change PIN', hi: 'पिन बदलें', bho: 'पिन बदलीं', mai: 'पिन बदलू', ne: 'पिन बदल्नुहोस्' },
  { en: 'Save PIN', hi: 'पिन सेव करें', bho: 'पिन सेव करीं', mai: 'पिन सेव करू', ne: 'पिन सुरक्षित गर्नुहोस्' },
  { en: 'Disable PIN', hi: 'पिन बंद करें', bho: 'पिन बंद करीं', mai: 'पिन बंद करू', ne: 'पिन बन्द गर्नुहोस्' },
  { en: 'Enable PIN', hi: 'पिन चालू करें', bho: 'पिन चालू करीं', mai: 'पिन चालू करू', ne: 'पिन सक्रिय गर्नुहोस्' },

  // Milk Management UI & Audit Descriptions
  { en: 'Milk Ledger', hi: 'दूध हिसाब', bho: 'दूध के हिसाब', mai: 'दूध केर हिसाब', ne: 'दूध हिसाब' },
  { en: 'Customer List', hi: 'ग्राहक सूची', bho: 'ग्राहक सूची', mai: 'ग्राहक सूची', ne: 'ग्राहक सूची' },
  { en: 'Add Customer', hi: 'नया ग्राहक जोड़ें', bho: 'नया ग्राहक जोड़ीं', mai: 'नव ग्राहक जोड़ू', ne: 'नयाँ ग्राहक थप्नुहोस्' },
  { en: 'New Customer', hi: 'नया ग्राहक', bho: 'नया ग्राहक', mai: 'नव ग्राहक', ne: 'नयाँ ग्राहक' },
  { en: 'Customer Name', hi: 'ग्राहक का नाम', bho: 'ग्राहक के नाम', mai: 'ग्राहक केर नाम', ne: 'ग्राहकको नाम' },
  { en: 'Mobile Number', hi: 'मोबाइल नंबर', bho: 'मोबाइल नंबर', mai: 'मोबाइल नंबर', ne: 'मोबाइल नं.' },
  { en: 'Mobile No.', hi: 'मोबाइल नं.', bho: 'मोबाइल नं.', mai: 'मोबाइल नं.', ne: 'मोबाइल नं.' },
  { en: 'Address', hi: 'पता', bho: 'पता', mai: 'पता', ne: 'ठेगाना' },
  { en: 'Morning Milk', hi: 'सुबह का दूध', bho: 'बिहान के दूध', mai: 'भोर केर दूध', ne: 'बिहानको दूध' },
  { en: 'Evening Milk', hi: 'शाम का दूध', bho: 'साँझ के दूध', mai: 'साँझ केर दूध', ne: 'बेलुकाको दूध' },
  { en: 'Morning', hi: 'सुबह', bho: 'बिहान', mai: 'भोर', ne: 'बिहान' },
  { en: 'Evening', hi: 'शाम', bho: 'साँझ', mai: 'साँझ', ne: 'बेलुका' },
  { en: 'Daily Milk', hi: 'दैनिक दूध', bho: 'रोज के दूध', mai: 'दैनिक दूध', ne: 'दैनिक दूध' },
  { en: 'Total Milk', hi: 'कुल दूध', bho: 'कुल दूध', mai: 'कुल दूध', ne: 'जम्मा दूध' },
  { en: 'Total Bill', hi: 'कुल बिल', bho: 'कुल बिल', mai: 'कुल बिल', ne: 'कुल बिल' },
  { en: 'Total Paid', hi: 'कुल भुगतान', bho: 'कुल जमा', mai: 'कुल जमा', ne: 'कुल भुक्तानी' },
  { en: 'Remaining Due', hi: 'बाकी बकाया', bho: 'बाकी बकाया', mai: 'बाँकी बकाया', ne: 'बाँकी रकम' },
  { en: 'Advance Credit', hi: 'एडवांस जमा', bho: 'अग्रिम जमा', mai: 'अग्रिम जमा', ne: 'पेश्की रकम' },
  { en: 'Collect Payment', hi: 'भुगतान लें', bho: 'पइसा लीं', mai: 'भुगतान लिअ', ne: 'रकम असुली' },
  { en: 'Payment Date', hi: 'भुगतान तारीख', bho: 'भुगतान तारीख', mai: 'भुगतान तारीख', ne: 'भुक्तानी मिति' },
  { en: 'Payment Method', hi: 'भुगतान तरीका', bho: 'भुगतान के तरीका', mai: 'भुगतान विधि', ne: 'भुक्तानी विधि' },
  { en: 'Payment History', hi: 'भुगतान इतिहास', bho: 'भुगतान के इतिहास', mai: 'भुगतान इतिहास', ne: 'भुक्तानी इतिहास' },
  { en: 'No Milk', hi: 'दूध नहीं गया', bho: 'दूध ना गइल', mai: 'दूध नहि गेल', ne: 'दूध गएन' },
  { en: 'Final Bill', hi: 'अंतिम बिल', bho: 'अंतिम बिल', mai: 'अंतिम बिल', ne: 'अन्तिम बिल' },
  { en: 'End Bill', hi: 'अंतिम बिल', bho: 'अंतिम बिल', mai: 'अंतिम बिल', ne: 'अन्तिम बिल' },
  { en: 'Active', hi: 'सक्रिय', bho: 'चालू', mai: 'सक्रिय', ne: 'सक्रिय' },
  { en: 'Stopped', hi: 'बंद', bho: 'बंद', mai: 'बंद', ne: 'बन्द' },
  { en: 'Inactive', hi: 'निष्क्रिय', bho: 'निष्क्रिय', mai: 'निष्क्रिय', ne: 'निष्क्रिय' },
  { en: 'Paid', hi: 'चुकता', bho: 'चुकता', mai: 'चुकता', ne: 'चुक्ता' },
  { en: 'Partial', hi: 'आंशिक', bho: 'आंशिक', mai: 'आंशिक', ne: 'आंशिक' },
  { en: 'Due', hi: 'बाकी', bho: 'बाकी', mai: 'बाँकी', ne: 'बाँकी' },
  { en: 'Overdue', hi: 'अतिदेय', bho: 'बकाया देरी', mai: 'अतिदेय', ne: 'म्याद नाघेको' },
  { en: 'Cash', hi: 'नकद', bho: 'नगद', mai: 'नगद', ne: 'नगद' },
  { en: 'Bank', hi: 'बैंक', bho: 'बैंक', mai: 'बैंक', ne: 'बैंक' },
  { en: 'No customers found', hi: 'कोई ग्राहक नहीं मिला', bho: 'कवनो ग्राहक ना मिलल', mai: 'कोनो ग्राहक नहि भेटल', ne: 'कुनै ग्राहक भेटिएन' },
  { en: 'New customer registered', hi: 'नया ग्राहक पंजीकृत किया गया', bho: 'नया ग्राहक दर्ज भइल', mai: 'नव ग्राहक दर्ता भेल', ne: 'नयाँ ग्राहक दर्ता गरियो' },
  { en: 'Customer details updated', hi: 'ग्राहक विवरण अपडेट किया गया', bho: 'ग्राहक के जानकारी अपडेट भइल', mai: 'ग्राहक विवरण अपडेट भेल', ne: 'ग्राहक विवरण अपडेट गरियो' },
  { en: 'Partial payment', hi: 'आंशिक भुगतान', bho: 'आंशिक भुगतान', mai: 'आंशिक भुगतान', ne: 'आंशिक भुक्तानी' },
  { en: 'Full payment', hi: 'पूरा भुगतान', bho: 'पूरा भुगतान', mai: 'पूरा भुगतान', ne: 'पूर्ण भुक्तानी' },
  { en: 'Advance payment', hi: 'एडवांस भुगतान', bho: 'अग्रिम भुगतान', mai: 'अग्रिम भुगतान', ne: 'पेश्की भुक्तानी' },

  // Byaj / Notebook / History
  { en: 'Village Interest Ledger', hi: 'गाँव ब्याज खाता', bho: 'गाँव के ब्याज खाता', mai: 'गामक ब्याज खाता', ne: 'गाउँले ब्याज खाता' },
  { en: 'Principal Amount', hi: 'मूलधन रकम', bho: 'मूलधन पइसा', mai: 'मूलधन रकम', ne: 'साँवा रकम' },
  { en: 'Monthly Interest', hi: 'मासिक ब्याज', bho: 'मासिक ब्याज', mai: 'मासिक ब्याज', ne: 'मासिक ब्याज' },
  { en: 'Total Accrued Interest', hi: 'कुल पका हुआ ब्याज', bho: 'कुल पाकल ब्याज', mai: 'कुल पाकल ब्याज', ne: 'कुल पाकेको ब्याज' },
  { en: 'Remaining Interest', hi: 'बाकी ब्याज', bho: 'बाकी ब्याज', mai: 'बाँकी ब्याज', ne: 'बाँकी ब्याज' },
  { en: 'Borrower Name', hi: 'ऋणी का नाम', bho: 'करजदार के नाम', mai: 'ऋणी केर नाम', ne: 'ऋणीको नाम' },
  { en: 'Loan Installment Payment', hi: 'कर्ज किस्त भुगतान', bho: 'करजा किस्त भुगतान', mai: 'कर्जा किस्त भुगतान', ne: 'कर्जा किस्ताको भुक्तानी' },
  { en: 'Bills & Invoices', hi: 'जारी किए गए बिल और रसीद', bho: 'बनवल बिल आ रसीद', mai: 'जारी भेल बिल आ रसीद', ne: 'जारी गरिएका बिल रसिदहरू' },
  { en: 'Calculation Log', hi: 'कैलकुलेटर हिसाब लॉग', bho: 'हिसाब लॉग', mai: 'कैलकुलेटर हिसाब लॉग', ne: 'क्याल्कुलेटर हिसाब लग' },
  { en: 'No calculations saved', hi: 'कोई हिसाब सेव नहीं है', bho: 'कवनो हिसाब सेव नइखे', mai: 'कोनो हिसाब सुरक्षित नहि अछि', ne: 'कुनै हिसाब सुरक्षित छैन' },
  { en: 'Clear All', hi: 'सभी हटाएं', bho: 'सब हटाईं', mai: 'सभ मेटाउ', ne: 'सबै मेटाउनुहोस्' },
  { en: 'All Notes', hi: 'सभी नोट्स', bho: 'सब नोट्स', mai: 'सभ नोट्स', ne: 'सबै नोटहरू' },
  { en: 'No Notes Yet', hi: 'कोई नोट नहीं है', bho: 'कवनो नोट नइखे', mai: 'कोनो नोट नहि अछि', ne: 'कुनै नोट छैन' },
  { en: 'General Customer', hi: 'साधारण ग्राहक', bho: 'साधारण ग्राहक', mai: 'साधारण ग्राहक', ne: 'साधारण ग्राहक' },
  { en: 'Shop Bill', hi: 'दुकान बिल', bho: 'दुकान बिल', mai: 'दुकान बिल', ne: 'पसल बिल' },
  { en: 'Milk Supply Bill', hi: 'दूध आपूर्ति बिल', bho: 'दूध सप्लाई बिल', mai: 'दूध आपूर्ति बिल', ne: 'दुध आपूर्ति बिल' },
  { en: 'Personal', hi: 'व्यक्तिगत', bho: 'निजी', mai: 'व्यक्तिगत', ne: 'व्यक्तिगत' },
  { en: 'Daily Tasks', hi: 'दैनिक कार्य', bho: 'रोज के काम', mai: 'दैनिक काज', ne: 'दैनिक कार्य' },

  // Durations & Calendar
  { en: 'Month', hi: 'महीना', bho: 'महीना', mai: 'माह', ne: 'महिना' },
  { en: 'Months', hi: 'महीने', bho: 'महीना', mai: 'माह', ne: 'महिना' },
  { en: 'Day', hi: 'दिन', bho: 'दिन', mai: 'दिन', ne: 'दिन' },
  { en: 'Days', hi: 'दिन', bho: 'दिन', mai: 'दिन', ne: 'दिन' },
  { en: 'Baishakh', hi: 'बैशाख', bho: 'बइसाख', mai: 'वैशाख', ne: 'बैशाख' },
  { en: 'Jestha', hi: 'ज्येष्ठ', bho: 'जेठ', mai: 'जेठ', ne: 'जेठ' },
  { en: 'Ashadh', hi: 'आषाढ़', bho: 'असाढ़', mai: 'आषाढ़', ne: 'असार' },
  { en: 'Shrawan', hi: 'श्रावण', bho: 'सावन', mai: 'साओन', ne: 'साउन' },
  { en: 'Bhadra', hi: 'भाद्रपद', bho: 'भादो', mai: 'भादव', ne: 'भदौ' },
  { en: 'Ashwin', hi: 'आश्विन', bho: 'आसिन', mai: 'आश्विन', ne: 'असोज' },
  { en: 'Kartik', hi: 'कार्तिक', bho: 'कातिक', mai: 'कार्तिक', ne: 'कात्तिक' },
  { en: 'Mangsir', hi: 'मार्गशीर्ष', bho: 'अगहन', mai: 'अगहन', ne: 'मंसिर' },
  { en: 'Poush', hi: 'पौष', bho: 'पूस', mai: 'पूस', ne: 'पुष' },
  { en: 'Magh', hi: 'माघ', bho: 'माघ', mai: 'माघ', ne: 'माघ' },
  { en: 'Falgun', hi: 'फाल्गुन', bho: 'फागुन', mai: 'फागुन', ne: 'फागुन' },
  { en: 'Chaitra', hi: 'चैत्र', bho: 'चैत', mai: 'चैत', ne: 'चैत' },
];

// Additional single-word & fragment translations (Nepali / Hindi / English -> all 5)
const WORD_PHRASES: PhraseEntry[] = [
  { en: 'Ltr', hi: 'लीटर', bho: 'लीटर', mai: 'लीटर', ne: 'लिटर' },
  { en: 'Liter', hi: 'लीटर', bho: 'लीटर', mai: 'लीटर', ne: 'लिटर' },
  { en: 'Liters', hi: 'लीटर', bho: 'लीटर', mai: 'लीटर', ne: 'लिटर' },
  { en: 'Rate', hi: 'दर', bho: 'दर', mai: 'दर', ne: 'दर' },
  { en: 'Amount', hi: 'रकम', bho: 'पइसा', mai: 'रकम', ne: 'रकम' },
  { en: 'Total', hi: 'कुल', bho: 'कुल', mai: 'कुल', ne: 'जम्मा' },
  { en: 'Date', hi: 'तारीख', bho: 'तारीख', mai: 'तारीख', ne: 'मिति' },
  { en: 'Save', hi: 'सेव करें', bho: 'सेव करीं', mai: 'सुरक्षित करू', ne: 'सुरक्षित गर्नुहोस्' },
  { en: 'Saved', hi: 'सुरक्षित', bho: 'सेव भइल', mai: 'सुरक्षित', ne: 'सुरक्षित' },
  { en: 'Delete', hi: 'हटाएं', bho: 'हटाईं', mai: 'मेटाउ', ne: 'मेटाउनुहोस्' },
  { en: 'Edit', hi: 'बदलें', bho: 'बदलीं', mai: 'संपादन', ne: 'सम्पादन' },
  { en: 'Cancel', hi: 'रद्द करें', bho: 'रद्द करीं', mai: 'रद्द करू', ne: 'रद्द' },
  { en: 'Close', hi: 'बंद करें', bho: 'बंद करीं', mai: 'बंद करू', ne: 'बन्द' },
  { en: 'Search', hi: 'खोजें', bho: 'खोजीं', mai: 'ताकू', ne: 'खोज्नुहोस्' },
  { en: 'Share', hi: 'शेयर करें', bho: 'शेयर करीं', mai: 'साझा करू', ne: 'साझा गर्नुहोस्' },
  { en: 'Copy', hi: 'कॉपी करें', bho: 'कॉपी करीं', mai: 'कॉपी करू', ne: 'कपि' },
  { en: 'Print', hi: 'प्रिंट', bho: 'प्रिंट', mai: 'प्रिंट', ne: 'प्रिन्ट' },
  { en: 'Customer', hi: 'ग्राहक', bho: 'ग्राहक', mai: 'ग्राहक', ne: 'ग्राहक' },
  { en: 'Customers', hi: 'ग्राहक', bho: 'ग्राहक लोग', mai: 'ग्राहक सभ', ne: 'ग्राहकहरू' },
  { en: 'Balance', hi: 'बकाया', bho: 'बाकी', mai: 'बाँकी', ne: 'बाँकी' },
  { en: 'Note', hi: 'नोट', bho: 'नोट', mai: 'नोट', ne: 'टिप्पणी' },
  { en: 'Notes', hi: 'नोट्स', bho: 'नोट्स', mai: 'नोट्स', ne: 'नोटहरू' },
  { en: 'Status', hi: 'स्थिति', bho: 'हालत', mai: 'स्थिति', ne: 'स्थिति' },
  { en: 'Calendar', hi: 'कैलेंडर', bho: 'कैलेंडर', mai: 'कैलेंडर', ne: 'पात्रो' },
  { en: 'Receipt', hi: 'रसीद', bho: 'रसीद', mai: 'रसीद', ne: 'रसिद' },
  { en: 'Backup', hi: 'बैकअप', bho: 'बैकअप', mai: 'बैकअप', ne: 'ब्याकअप' },
  { en: 'Restore', hi: 'रिस्टोर', bho: 'रिस्टोर', mai: 'रिस्टोर', ne: 'रिस्टोर' },
  { en: 'Milk', hi: 'दूध', bho: 'दूध', mai: 'दूध', ne: 'दूध' },
  { en: 'Interest', hi: 'ब्याज', bho: 'ब्याज', mai: 'ब्याज', ne: 'ब्याज' },
  { en: 'Principal', hi: 'मूलधन', bho: 'मूलधन', mai: 'मूलधन', ne: 'साँवा' },
  { en: 'Cow', hi: 'गाय', bho: 'गाय', mai: 'गाय', ne: 'गाई' },
  { en: 'Buffalo', hi: 'भैंस', bho: 'भैंस', mai: 'महिंस', ne: 'भैंसी' },
  { en: 'Today', hi: 'आज', bho: 'आज', mai: 'आई', ne: 'आज' },
  { en: 'Yesterday', hi: 'कल', bho: 'काल्ह', mai: 'काल्हि', ne: 'हिजो' },
  { en: 'Offline', hi: 'ऑफलाइन', bho: 'ऑफलाइन', mai: 'ऑफलाइन', ne: 'अफलाइन' },
  { en: 'Online', hi: 'ऑनलाइन', bho: 'ऑनलाइन', mai: 'ऑनलाइन', ne: 'अनलाइन' },
  { en: 'Monthly', hi: 'मासिक', bho: 'महीना के', mai: 'मासिक', ne: 'मासिक' },
  { en: 'Daily', hi: 'दैनिक', bho: 'रोज', mai: 'दैनिक', ne: 'दैनिक' },
  { en: 'Discount', hi: 'छूट', bho: 'छूट', mai: 'छूट', ne: 'छुट' },
  { en: 'Shop', hi: 'दुकान', bho: 'दुकान', mai: 'दुकान', ne: 'पसल' },
  { en: 'Dairy', hi: 'डेयरी', bho: 'डेयरी', mai: 'डेयरी', ne: 'डेरी' },
  { en: 'Loan', hi: 'कर्ज', bho: 'करजा', mai: 'कर्जा', ne: 'कर्जा' },
  { en: 'Advance', hi: 'अग्रिम', bho: 'अग्रिम', mai: 'अग्रिम', ne: 'पेश्की' },
  { en: 'Pending', hi: 'बाकी', bho: 'बाकी', mai: 'बाँकी', ne: 'बाँकी' },
  { en: 'Quantity', hi: 'मात्रा', bho: 'मात्रा', mai: 'मात्रा', ne: 'मात्रा' },
  { en: 'Price', hi: 'कीमत', bho: 'दाम', mai: 'दाम', ne: 'मूल्य' },
  { en: 'Gold', hi: 'सोना', bho: 'सोना', mai: 'सोना', ne: 'सुन' },
  { en: 'Silver', hi: 'चाँदी', bho: 'चाँदी', mai: 'चान्ही', ne: 'चाँदी' },
];

// Nepali/Hindi -> English/Hindi/Bhojpuri/Maithili extra exact & substring rules
const EXTRA_NEPALI_PHRASES: Array<[string, Partial<Record<Language, string>>]> = [
  ['ग्राहकको नाम', { en: 'Customer Name', hi: 'ग्राहक का नाम', bho: 'ग्राहक के नाम', mai: 'ग्राहक केर नाम' }],
  ['सुरु मिति', { en: 'Start Date', hi: 'शुरू तारीख', bho: 'शुरू तारीख', mai: 'शुरू तारीख' }],
  ['अन्तिम मिति', { en: 'End Date', hi: 'अंतिम तारीख', bho: 'अंतिम तारीख', mai: 'अंतिम तारीख' }],
  ['यस महिनाभर', { en: 'This Month', hi: 'इस महीने', bho: 'एह महीना', mai: 'एहि माह' }],
  ['अघिल्लो महिना', { en: 'Prev Month', hi: 'पिछले महीने', bho: 'पिछला महीना', mai: 'पाछिला माह' }],
  ['पछिल्लो १५ दिन', { en: 'Last 15 Days', hi: 'पिछले १५ दिन', bho: 'पिछला १५ दिन', mai: 'पाछिला १५ दिन' }],
  ['दूध नलिएको दिन', { en: 'No Milk Days', hi: 'दूध ना लेने के दिन', bho: 'दूध ना लेवे के दिन', mai: 'दूध नहि लेबाक दिन' }],
  ['यो दिनको हिसाब कुलबाट घटाइनेछ', { en: 'Absent days are deducted from total', hi: 'यह दिन कुल हिसाब से घट जाएगा', bho: 'ई दिन कुल हिसाब से घट जाई', mai: 'ई दिन कुल हिसाब सँ घटत' }],
  ['कुनै नोट छैन', { en: 'No Notes Yet', hi: 'कोई नोट नहीं है', bho: 'कवनो नोट नइखे', mai: 'कोनो नोट नहि अछि' }],
  ['कुनै हिसाब सुरक्षित छैन', { en: 'No calculations saved', hi: 'कोई हिसाब सेव नहीं है', bho: 'कवनो हिसाब सेव नइखे', mai: 'कोनो हिसाब सुरक्षित नहि अछि' }],
  ['सबै मेटाउनुहोस्', { en: 'Clear All', hi: 'सभी हटाएं', bho: 'सब हटाईं', mai: 'सभ मेटाउ' }],
  ['नयाँ ग्राहक दर्ता गरियो', { en: 'New customer registered', hi: 'नया ग्राहक पंजीकृत', bho: 'नया ग्राहक दर्ज भइल', mai: 'नव ग्राहक दर्ता भेल' }],
  ['ग्राहक विवरण अपडेट गरियो', { en: 'Customer details updated', hi: 'ग्राहक विवरण अपडेट', bho: 'ग्राहक विवरण अपडेट भइल', mai: 'ग्राहक विवरण अपडेट भेल' }],
  ['दैनिक दूध हिसाब', { en: 'Daily Milk Ledger', hi: 'दैनिक दूध हिसाब', bho: 'रोज के दूध हिसाब', mai: 'दैनिक दूध हिसाब' }],
  ['नयाँ दूध ग्राहक', { en: 'New Milk Customer', hi: 'नया दूध ग्राहक', bho: 'नया दूध ग्राहक', mai: 'नव दूध ग्राहक' }],
  ['रकम असुली', { en: 'Collect Payment', hi: 'रकम वसूली', bho: 'पइसा वसूली', mai: 'रकम असूली' }],
  ['भुक्तानी इतिहास', { en: 'Payment History', hi: 'भुगतान इतिहास', bho: 'भुगतान के इतिहास', mai: 'भुगतान इतिहास' }],
  ['कुलपाइने रकम', { en: 'Total Receivable', hi: 'कुल देय राशि', bho: 'कुल मिले वाला पइसा', mai: 'कुल देय राशि' }],
  ['कुल लगानी साँवा', { en: 'Total Principal Lent', hi: 'कुल निवेश मूलधन', bho: 'कुल लागल मूलधन', mai: 'कुल लागल मूलधन' }],
  ['जम्मा पाक्ने ब्याज', { en: 'Total Accrued Interest', hi: 'कुल पका ब्याज', bho: 'कुल पाकल ब्याज', mai: 'कुल पाकल ब्याज' }],
  ['कुल असुल जम्मा', { en: 'Total Collected', hi: 'कुल वसूली जमा', bho: 'कुल वसूली जमा', mai: 'कुल वसूली जमा' }],
  ['खाता जानकारी', { en: 'Account Summary', hi: 'खाता जानकारी', bho: 'खाता के जानकारी', mai: 'खाता जानकारी' }],
  ['विस्तृत विवरण हेर्नुहोस्', { en: 'View Full Details', hi: 'पूरा विवरण देखें', bho: 'पूरा विवरण देखीं', mai: 'पूरा विवरण देखू' }],
  ['साझा (WhatsApp)', { en: 'Share (WhatsApp)', hi: 'शेयर (WhatsApp)', bho: 'शेयर (WhatsApp)', mai: 'साझा (WhatsApp)' }],
  ['पाकेको ब्याज पूरा चुक्ता भयो', { en: 'Accrued interest fully settled', hi: 'पका हुआ ब्याज पूरा चुकता हुआ', bho: 'पाकल ब्याज पूरा चुकता भइल', mai: 'पाकल ब्याज पूरा चुकता भेल' }],
  ['गोपनीयता नीति', { en: 'Privacy Policy', hi: 'गोपनीयता नीति', bho: 'गोपनीयता नीति', mai: 'गोपनीयता नीति' }],
  ['सबै टुल', { en: 'All Tools', hi: 'सभी टूल्स', bho: 'सब टूल्स', mai: 'सभ टूल्स' }],
  ['दुकान हिसाब', { en: 'Shop & Dukaan', hi: 'दुकान हिसाब', bho: 'दुकान के हिसाब', mai: 'दुकान हिसाब' }],
  ['आर्थिक र गाउँले', { en: 'Finance & Village', hi: 'फाइनेंस और ग्रामीण', bho: 'फाइनेंस आ गाँव', mai: 'फाइनेंस आ गाम', ne: 'आर्थिक र गाउँले' }],
  ['निर्माण र जग्गा', { en: 'Construction & Land', hi: 'निर्माण और जमीन', bho: 'निर्माण आ जमीन', mai: 'निर्माण आ जमीन' }],
  ['मिति र पात्रो', { en: 'Dates & Calendar', hi: 'तारीख और पंचांग', bho: 'तारीख आ पंचांग', mai: 'तारीख आ पंचांग' }],
  ['नगद भुक्तानी', { en: 'Cash Payment', hi: 'नकद भुगतान', bho: 'नगद भुगतान', mai: 'नगद भुगतान' }],
  ['बैंक ट्रान्सफर', { en: 'Bank Transfer', hi: 'बैंक ट्रांसफर', bho: 'बैंक ट्रांसफर', mai: 'बैंक ट्रांसफर' }],
  ['ग्राहक खाता', { en: 'Customer Ledger', hi: 'ग्राहक खाता', bho: 'ग्राहक खाता', mai: 'ग्राहक खाता' }],
  ['पसल तथा व्यापार', { en: 'Shop & Business', hi: 'दुकान व व्यापार', bho: 'दुकान आ व्यापार', mai: 'दुकान आ व्यापार' }],
  ['ब्याज खाता', { en: 'Interest Ledger', hi: 'ब्याज खाता', bho: 'ब्याज खाता', mai: 'ब्याज खाता' }],
  ['नोटबुक', { en: 'Notebook', hi: 'नोटबुक', bho: 'नोटबुक', mai: 'नोटबुक' }],
  ['खोल्नुहोस्', { en: 'Open', hi: 'खोलें', bho: 'खोलीं', mai: 'खोलू' }],
  ['सुरक्षित गर्नुहोस्', { en: 'Save', hi: 'सेव करें', bho: 'सेव करीं', mai: 'सुरक्षित करू' }],
  ['मेटाउनुहोस्', { en: 'Delete', hi: 'हटाएं', bho: 'हटाईं', mai: 'मेटाउ' }],
  ['थप्नुहोस्', { en: 'Add', hi: 'जोड़ें', bho: 'जोड़ीं', mai: 'जोड़ू' }],
  ['बन्द गर्नुहोस्', { en: 'Close', hi: 'बंद करें', bho: 'बंद करीं', mai: 'बंद करू' }],
  ['रद्द गर्नुहोस्', { en: 'Cancel', hi: 'रद्द करें', bho: 'रद्द करीं', mai: 'रद्द करू' }],
  ['नयाँ थप्नुहोस्', { en: 'Add New', hi: 'नया जोड़ें', bho: 'नया जोड़ीं', mai: 'नव जोड़ू' }],
  ['पठाउनुहोस्', { en: 'Send', hi: 'भेजें', bho: 'भेजीं', mai: 'पठाउ' }],
  ['राख्नुहोस्', { en: 'Keep', hi: 'रखें', bho: 'राखीं', mai: 'राखू' }],
  ['बनाउनुहोस्', { en: 'Create', hi: 'बनाएं', bho: 'बनाईं', mai: 'बनाउ' }],
  ['लिनुहोस्', { en: 'Take', hi: 'लें', bho: 'लीं', mai: 'लिअ' }],
  ['दिनुहोस्', { en: 'Give', hi: 'दें', bho: 'दीं', mai: 'दिअ' }],
  ['हटाउनुहोस्', { en: 'Remove', hi: 'हटाएं', bho: 'हटाईं', mai: 'हटाउ' }],
  ['दोहोर्याउनुहोस्', { en: 'Confirm', hi: 'दोहराएं', bho: 'दोहराईं', mai: 'दोहराउ' }],
  ['दैनिक', { en: 'Daily', hi: 'दैनिक', bho: 'रोज', mai: 'दैनिक' }],
  ['मासिक', { en: 'Monthly', hi: 'मासिक', bho: 'महीना के', mai: 'मासिक' }],
  ['वार्षिक', { en: 'Yearly', hi: 'वार्षिक', bho: 'सालाना', mai: 'वार्षिक' }],
  ['प्रति लिटर', { en: 'per liter', hi: 'प्रति लीटर', bho: 'प्रति लीटर', mai: 'प्रति लीटर' }],
  ['लिटर', { en: 'Ltr', hi: 'लीटर', bho: 'लीटर', mai: 'लीटर' }],
  ['रुपैयाँ', { en: 'Rupees', hi: 'रुपये', bho: 'रुपिया', mai: 'रूपैया' }],
  ['महिना', { en: 'month', hi: 'महीना', bho: 'महीना', mai: 'माह' }],
  ['बाँकी', { en: 'Due', hi: 'बाकी', bho: 'बाकी', mai: 'बाँकी' }],
  ['भुक्तानी', { en: 'Payment', hi: 'भुगतान', bho: 'भुगतान', mai: 'भुगतान' }],
  ['रकम', { en: 'Amount', hi: 'रकम', bho: 'पइसा', mai: 'रकम' }],
  ['जम्मा', { en: 'Total', hi: 'कुल', bho: 'कुल', mai: 'कुल' }],
  ['साँवा', { en: 'Principal', hi: 'मूलधन', bho: 'मूलधन', mai: 'मूलधन' }],
  ['दर', { en: 'Rate', hi: 'दर', bho: 'दर', mai: 'दर' }],
  ['मिति', { en: 'Date', hi: 'तारीख', bho: 'तारीख', mai: 'तारीख' }],
  ['समय', { en: 'Time', hi: 'समय', bho: 'समय', mai: 'समय' }],
  ['नाम', { en: 'Name', hi: 'नाम', bho: 'नाम', mai: 'नाम' }],
  ['नम्बर', { en: 'No.', hi: 'नंबर', bho: 'नंबर', mai: 'नंबर' }],
  ['ठेगाना', { en: 'Address', hi: 'पता', bho: 'पता', mai: 'पता' }],
  ['अवधि', { en: 'Duration', hi: 'अवधि', bho: 'समय', mai: 'अवधि' }],
  ['उधारो', { en: 'Credit', hi: 'उधार', bho: 'उधार', mai: 'उधार' }],
  ['पसल', { en: 'Shop', hi: 'दुकान', bho: 'दुकान', mai: 'दोकान' }],
  ['किस्ता', { en: 'Installment', hi: 'किस्त', bho: 'किस्त', mai: 'किस्त' }],
  ['लगानी', { en: 'Investment', hi: 'निवेश', bho: 'निवेश', mai: 'निवेश' }],
  ['जग्गा', { en: 'Land', hi: 'जमीन', bho: 'जमीन', mai: 'जमीन' }],
  ['पेश्की', { en: 'Advance', hi: 'अग्रिम', bho: 'अग्रिम', mai: 'अग्रिम' }],
  ['चुक्ता', { en: 'Settled', hi: 'चुकता', bho: 'चुकता', mai: 'चुकता' }],
  ['पात्रो', { en: 'Calendar', hi: 'कैलेंडर', bho: 'कैलेंडर', mai: 'कैलेंडर' }],
  ['रसिद', { en: 'Receipt', hi: 'रसीद', bho: 'रसीद', mai: 'रसीद' }],
  ['ब्याकअप', { en: 'Backup', hi: 'बैकअप', bho: 'बैकअप', mai: 'बैकअप' }],
  ['रिस्टोर', { en: 'Restore', hi: 'रिस्टोर', bho: 'रिस्टोर', mai: 'रिस्टोर' }],
  ['भेटिएन', { en: 'Not found', hi: 'नहीं मिला', bho: 'ना मिलल', mai: 'नहि भेटल' }],
  ['सक्रिय', { en: 'Active', hi: 'सक्रिय', bho: 'चालू', mai: 'सक्रिय' }],
  ['गते', { en: '', hi: '', bho: '', mai: '' }],
  ['देखि', { en: 'From', hi: 'से', bho: 'से', mai: 'सँ' }],
  ['सम्म', { en: 'To', hi: 'तक', bho: 'ले', mai: 'धरि' }],
  ['तथा', { en: '&', hi: 'और', bho: 'आ', mai: 'आ' }],
  ['वा', { en: 'or', hi: 'या', bho: 'भा', mai: 'वा' }],
  ['र', { en: '&', hi: 'और', bho: 'आ', mai: 'आ' }],
  ['छ', { en: '', hi: 'है', bho: 'बा', mai: 'अछि' }],
  ['भए', { en: 'if', hi: 'होने पर', bho: 'भइला पर', mai: 'भेला पर' }],
  ['गर्न', { en: 'to', hi: 'करने के लिए', bho: 'करे खातिर', mai: 'करबाक लेल' }],
  ['भएको', { en: 'done', hi: 'हुआ', bho: 'भइल', mai: 'भेल' }],
  ['गरेको', { en: 'done', hi: 'किया हुआ', bho: 'कइल', mai: 'कएल' }],
  ['गर्नुहोस्', { en: '', hi: 'करें', bho: 'करीं', mai: 'करू' }],
  ['हेर्नुहोस्', { en: 'View', hi: 'देखें', bho: 'देखीं', mai: 'देखू' }],
  ['लेख्नुहोस्', { en: 'Enter', hi: 'लिखें', bho: 'लिखीं', mai: 'लिखू' }],
  ['छान्नुहोस्', { en: 'Select', hi: 'चुनें', bho: 'चुनीं', mai: 'चुनू' }],
  ['फेर्नुहोस्', { en: 'Change', hi: 'बदलें', bho: 'बदलीं', mai: 'बदलू' }],
  ['तपाईंको', { en: 'Your', hi: 'आपका', bho: 'राउर', mai: 'अहाँक' }],
  ['तपाईं', { en: 'You', hi: 'आप', bho: 'रउआ', mai: 'अहाँ' }],
  ['हाम्रो', { en: 'Our', hi: 'हमारा', bho: 'हमर', mai: 'हमर' }],
  ['नयाँ', { en: 'New', hi: 'नया', bho: 'नया', mai: 'नव' }],
  ['पुरानो', { en: 'Old', hi: 'पुराना', bho: 'पुरान', mai: 'पुरान' }],
  ['सबै', { en: 'All', hi: 'सभी', bho: 'सब', mai: 'सभ' }],
  ['कुनै', { en: 'Any', hi: 'कोई', bho: 'कवनो', mai: 'कोनो' }],
  ['छैन', { en: 'None', hi: 'नहीं है', bho: 'नइखे', mai: 'नहि अछि' }],
  ['छैनन्', { en: 'None', hi: 'नहीं हैं', bho: 'नइखे', mai: 'नहि अछि' }],
  ['लागि', { en: 'for', hi: 'के लिए', bho: 'खातिर', mai: 'लेल' }],
  ['बाट', { en: 'from', hi: 'से', bho: 'से', mai: 'सँ' }],
];

// Build reverse lookup map (normalized lowercase source -> target map)
const EXACT_LOOKUP = new Map<string, Partial<Record<Language, string>>>();
const SUBSTRING_MAP = new Map<string, Partial<Record<Language, string>>>();
const RAW_KEYS: string[] = [];

function registerPhrase(entry: Partial<Record<Language, string>>) {
  const langs: Language[] = ['en', 'hi', 'bho', 'mai', 'ne'];
  langs.forEach((l) => {
    const val = entry[l];
    if (!val || typeof val !== 'string') return;
    const trimmed = val.trim();
    const key = trimmed.toLowerCase();
    if (key && !EXACT_LOOKUP.has(key)) {
      EXACT_LOOKUP.set(key, entry);
    }
    if (trimmed.length >= 2) {
      if (!SUBSTRING_MAP.has(key)) {
        SUBSTRING_MAP.set(key, entry);
        RAW_KEYS.push(trimmed);
      }
    }
  });
}

PHRASE_ENTRIES.forEach(registerPhrase);
WORD_PHRASES.forEach(registerPhrase);
EXTRA_NEPALI_PHRASES.forEach(([src, entry]) => {
  const full: Partial<Record<Language, string>> = { ne: src, ...entry };
  const trimmed = src.trim();
  const key = trimmed.toLowerCase();
  EXACT_LOOKUP.set(key, full);
  if (trimmed.length >= 1 && !SUBSTRING_MAP.has(key)) {
    SUBSTRING_MAP.set(key, full);
    RAW_KEYS.push(trimmed);
  }
});

// Add NPR symbol handling
registerPhrase({ en: 'Rs.', hi: 'रु', bho: 'रु', mai: 'रु', ne: 'रु' });

// Sort longest first so multi-word phrases win over single words in alternation
RAW_KEYS.sort((a, b) => b.length - a.length);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ASCII_KEYS = RAW_KEYS.filter((k) => /^[A-Za-z0-9\s.&()/-]+$/.test(k) && k.length >= 3);
const DEV_KEYS = RAW_KEYS.filter((k) => !/^[A-Za-z0-9\s.&()/-]+$/.test(k));

// Use Devanagari boundaries (?<![\u0900-\u097F])...(?![\u0900-\u097F]) so short keys like "र" or "छ"
// NEVER corrupt substrings inside unrelated words like "दर", "लिटर", "राजन", or "छूट".
const COMBINED_REGEX = new RegExp(
  [
    ...DEV_KEYS.map((k) => `(?<![\\u0900-\\u097F])(?:${escapeRegex(k)})(?![\\u0900-\\u097F])`),
    ...ASCII_KEYS.map((k) => `\\b${escapeRegex(k)}\\b`),
  ].join('|'),
  'gi'
);

const NEPALI_LEAK_DETECTOR =
  /(छैन|छैनन्|गर्नुहोस्|तपाईंको|तपाईं|हाम्रो|रुपैयाँ|लिटर|हेर्नुहोस्|खोल्नुहोस्|छान्नुहोस्|फेर्नुहोस्|मेटाउनुहोस्|थप्नुहोस्|बनाउनुहोस्|पठाउनुहोस्|सुरक्षित गर्नुहोस्|(?<![\u0900-\u097F])(?:छ|र|रकम|भुक्तानी|साँवा|बाँकी|पसल|उधारो|नयाँ)(?![\u0900-\u097F]))/;
const warnedBhoLeaks = new Set<string>();

/**
 * Clean bilingual combined labels like:
 * - "ग्राहकको नाम / Customer Name"
 * - "नयाँ ग्राहक (New Customer)"
 */
function resolveBilingualLabel(text: string, targetLang: Language): string {
  const trimmed = text.trim();
  if (trimmed.includes(' / ')) {
    const parts = trimmed.split(' / ').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 2) {
      const aHasDev = /[\u0900-\u097F]/.test(parts[0]);
      const bHasAscii = /[A-Za-z]/.test(parts[1]) && !/[\u0900-\u097F]/.test(parts[1]);
      if (aHasDev && bHasAscii) {
        return targetLang === 'en' ? parts[1] : parts[0];
      }
      const aHasAscii = /[A-Za-z]/.test(parts[0]) && !/[\u0900-\u097F]/.test(parts[0]);
      const bHasDev = /[\u0900-\u097F]/.test(parts[1]);
      if (aHasAscii && bHasDev) {
        return targetLang === 'en' ? parts[0] : parts[1];
      }
    }
  }
  return text;
}

const uiTranslateCache = new Map<string, string>();
const UI_TRANSLATE_CACHE_MAX = 2500;

/**
 * Translate any UI string or stored user data into target language.
 * Preserves URLs, emails, invoice codes, and formatting safely.
 */
export function translateAppText(rawText: string, targetLang: Language, options?: { isUserData?: boolean }): string {
  if (!rawText || typeof rawText !== 'string') return rawText || '';
  const trimmed = rawText.trim();
  if (!trimmed) return rawText;

  // Never alter URLs, emails, data URIs, invoice IDs, or license keys
  if (/^(https?:\/\/|data:|mailto:|tel:)/i.test(trimmed)) return rawText;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return rawText;
  if (/^(GHAULE-PRO-|MILK-REC-|GD-|BILL-|INV-)/i.test(trimmed)) return rawText;

  const isUserData = !!options?.isUserData;
  const cacheKey = !isUserData && rawText.length <= 160 ? `${targetLang}\u0000${rawText}` : null;
  if (cacheKey) {
    const cached = uiTranslateCache.get(cacheKey);
    if (cached !== undefined) return cached;
  }

  const leadingWs = rawText.match(/^\s*/)?.[0] || '';
  const trailingWs = rawText.match(/\s*$/)?.[0] || '';

  let work = resolveBilingualLabel(trimmed, targetLang);

  // 1. Exact phrase match
  const exact = EXACT_LOOKUP.get(work.toLowerCase());
  if (exact && exact[targetLang] !== undefined && exact[targetLang] !== '') {
    const res = `${leadingWs}${localizeNumberString(exact[targetLang]!, targetLang)}${trailingWs}`;
    if (cacheKey) {
      if (uiTranslateCache.size >= UI_TRANSLATE_CACHE_MAX) uiTranslateCache.clear();
      uiTranslateCache.set(cacheKey, res);
    }
    return res;
  }

  // 2. Single-pass non-chaining phrase/word replacement
  work = work.replace(COMBINED_REGEX, (match) => {
    const entry = SUBSTRING_MAP.get(match.trim().toLowerCase());
    if (!entry) return match;
    const replacement = entry[targetLang];
    return replacement !== undefined ? replacement : match;
  });

  // 3. Clean up redundant whitespace or empty parens
  work = work.replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim();

  // 4. Transliterate remaining foreign script tokens (especially for user data like names/addresses/notes)
  if (targetLang === 'en') {
    if (/[\u0900-\u097F]/.test(work)) {
      work = devanagariToRoman(work);
    }
    work = toAsciiDigits(work);
  } else {
    if (isUserData && /[A-Za-z]/.test(work)) {
      work = romanToDevanagari(work);
    }
    work = toAsciiDigits(work);
  }

  if (import.meta.env?.DEV && targetLang === 'bho' && !isUserData && NEPALI_LEAK_DETECTOR.test(work)) {
    if (!warnedBhoLeaks.has(trimmed)) {
      warnedBhoLeaks.add(trimmed);
      console.warn(`[i18n:bho] Potential Nepali text remaining in UI string: "${trimmed}" -> "${work}"`);
    }
  }

  const finalRes = `${leadingWs}${work}${trailingWs}`;
  if (cacheKey) {
    if (uiTranslateCache.size >= UI_TRANSLATE_CACHE_MAX) uiTranslateCache.clear();
    uiTranslateCache.set(cacheKey, finalRes);
  }
  return finalRes;
}

/**
 * Convenience helper specifically for stored user data (customer names, notes, addresses,
 * history titles/details, payment notes, audit descriptions).
 * Keeps stored raw data untouched while rendering in the active language.
 */
export function translateUserData(text: string | undefined | null, lang: Language): string {
  if (!text) return '';
  return translateAppText(String(text), lang, { isUserData: true });
}

// ---------------------------------------------------------------------------
// REACT-SAFE GLOBAL DOM TEXT & PLACEHOLDER TRANSLATOR
// ---------------------------------------------------------------------------

const textNodeOriginals = new WeakMap<Text, { source: string; lastSet: string }>();
const attrOriginals = new WeakMap<Element, Map<string, { source: string; lastSet: string }>>();

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'NOSCRIPT',
  'SVG', 'PATH', 'CIRCLE', 'RECT', 'LINE', 'POLYGON', 'POLYLINE', 'ELLIPSE', 'G', 'CANVAS', 'IMG',
]);

function shouldSkipElement(el: Element | null): boolean {
  let curr: Element | null = el;
  while (curr) {
    if (SKIP_TAGS.has(curr.tagName)) return true;
    if (curr.getAttribute('data-no-translate') === 'true') return true;
    if (curr.getAttribute('contenteditable') === 'true') return true;
    curr = curr.parentElement;
  }
  return false;
}

function processTextNode(node: Text, lang: Language) {
  const parent = node.parentElement;
  if (!parent || shouldSkipElement(parent)) return;

  const currentVal = node.nodeValue ?? '';
  if (!currentVal.trim()) return;

  let record = textNodeOriginals.get(node);
  if (!record) {
    record = { source: currentVal, lastSet: currentVal };
    textNodeOriginals.set(node, record);
  } else if (currentVal !== record.lastSet) {
    // React updated this node's text dynamically -> capture new source
    record.source = currentVal;
  }

  // Fast-path for pure numbers / math symbols / currency symbols (avoids regex/map overhead in calculators)
  if (/^[\d०-९\s.,:%+\-×÷=()\/₹$]+$/.test(record.source)) {
    const fastVal = localizeNumberString(record.source, lang);
    if (fastVal !== currentVal) {
      record.lastSet = fastVal;
      node.nodeValue = fastVal;
    } else {
      record.lastSet = currentVal;
    }
    return;
  }

  const translated = translateAppText(record.source, lang, { isUserData: false });
  if (translated !== currentVal) {
    record.lastSet = translated;
    node.nodeValue = translated;
  } else {
    record.lastSet = currentVal;
  }
}

function processElementAttributes(el: Element, lang: Language) {
  if (el.getAttribute('data-no-translate') === 'true') return;
  if (el.closest('[data-no-translate="true"]')) return;

  const attrsToCheck = ['placeholder', 'title'];
  for (const attr of attrsToCheck) {
    const val = el.getAttribute(attr);
    if (!val || !val.trim()) continue;

    let map = attrOriginals.get(el);
    if (!map) {
      map = new Map();
      attrOriginals.set(el, map);
    }
    let rec = map.get(attr);
    if (!rec) {
      rec = { source: val, lastSet: val };
      map.set(attr, rec);
    } else if (val !== rec.lastSet) {
      rec.source = val;
    }

    const translated = translateAppText(rec.source, lang, { isUserData: false });
    if (translated !== val) {
      rec.lastSet = translated;
      el.setAttribute(attr, translated);
    } else {
      rec.lastSet = val;
    }
  }
}

function walkAndTranslate(root: Node, lang: Language) {
  if (root.nodeType === Node.TEXT_NODE) {
    processTextNode(root as Text, lang);
    return;
  }
  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as Element;
    if (SKIP_TAGS.has(el.tagName) || el.getAttribute('data-no-translate') === 'true' || el.getAttribute('contenteditable') === 'true') {
      return;
    }
    processElementAttributes(el, lang);
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode(node: Node): number {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          if (
            SKIP_TAGS.has(el.tagName) ||
            el.getAttribute('data-no-translate') === 'true' ||
            el.getAttribute('contenteditable') === 'true'
          ) {
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );
  let curr: Node | null = walker.nextNode();
  while (curr) {
    if (curr.nodeType === Node.TEXT_NODE) {
      processTextNode(curr as Text, lang);
    } else if (curr.nodeType === Node.ELEMENT_NODE) {
      processElementAttributes(curr as Element, lang);
    }
    curr = walker.nextNode();
  }
}

/**
 * Global hook attached at App root so EVERY view, modal, calculator,
 * and dynamic element updates immediately to the selected language.
 */
export function useGlobalLanguageTranslator(language: Language): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const rootEl = document.getElementById('root') || document.body;
    if (!rootEl) return;

    let isApplying = false;
    let scheduledRaf: number | null = null;
    const pendingNodes = new Set<Node>();
    const pendingAttrEls = new Set<Element>();

    const apply = (target: Node = rootEl) => {
      if (isApplying) return;
      isApplying = true;
      try {
        walkAndTranslate(target, language);
      } finally {
        isApplying = false;
      }
    };

    const flushPending = () => {
      scheduledRaf = null;
      if (isApplying) return;
      isApplying = true;
      try {
        pendingNodes.forEach((n) => {
          if (n.isConnected) {
            walkAndTranslate(n, language);
          }
        });
        pendingAttrEls.forEach((el) => {
          if (el.isConnected) {
            processElementAttributes(el, language);
          }
        });
      } finally {
        pendingNodes.clear();
        pendingAttrEls.clear();
        isApplying = false;
      }
    };

    // Immediate pass + frame pass after React commits
    apply(rootEl);
    const initialRafId = requestAnimationFrame(() => apply(rootEl));

    const observer = new MutationObserver((mutations) => {
      if (isApplying) return;
      for (const m of mutations) {
        if (m.type === 'characterData' && m.target.nodeType === Node.TEXT_NODE) {
          pendingNodes.add(m.target);
        } else if (m.type === 'childList') {
          m.addedNodes.forEach((n) => pendingNodes.add(n));
        } else if (m.type === 'attributes' && m.target.nodeType === Node.ELEMENT_NODE) {
          pendingAttrEls.add(m.target as Element);
        }
      }
      if ((pendingNodes.size > 0 || pendingAttrEls.size > 0) && scheduledRaf === null) {
        scheduledRaf = requestAnimationFrame(flushPending);
      }
    });

    observer.observe(rootEl, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title'],
    });

    return () => {
      cancelAnimationFrame(initialRafId);
      if (scheduledRaf !== null) {
        cancelAnimationFrame(scheduledRaf);
      }
      pendingNodes.clear();
      pendingAttrEls.clear();
      observer.disconnect();
    };
  }, [language]);
}
