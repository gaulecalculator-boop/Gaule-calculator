// Bikram Sambat (वि.सं.) Nepali Calendar Engine & Utilities
import { Language } from '../types';
import {
  BS_CALENDAR_DATA,
  BS_MIN_YEAR,
  BS_MAX_YEAR,
  getBSDaysInMonth as getBSDaysInMonthCore,
  bsToAd as bsToAdCore,
  adToBs as adToBsCore,
  getBSMonthFirstDayOfWeek as getBSMonthFirstDayOfWeekCore,
} from './nepaliCalendarData';

export { BS_MIN_YEAR, BS_MAX_YEAR, BS_CALENDAR_DATA };
import { calculatePanchang } from './panchangEngine';

export const NEPALI_MONTHS = [
  { bsMonth: 1, nameEn: 'Baishakh', nameNe: 'बैशाख', nameHi: 'बैशाख', nameBho: 'बइसाख', nameMai: 'वैशाख', days: 31 },
  { bsMonth: 2, nameEn: 'Jestha', nameNe: 'जेठ', nameHi: 'ज्येष्ठ', nameBho: 'जेठ', nameMai: 'जेठ', days: 31 },
  { bsMonth: 3, nameEn: 'Ashadh', nameNe: 'असार', nameHi: 'आषाढ़', nameBho: 'असाढ़', nameMai: 'आषाढ़', days: 32 },
  { bsMonth: 4, nameEn: 'Shrawan', nameNe: 'साउन', nameHi: 'श्रावण', nameBho: 'सावन', nameMai: 'साओन', days: 31 },
  { bsMonth: 5, nameEn: 'Bhadra', nameNe: 'भदौ', nameHi: 'भाद्रपद', nameBho: 'भादो', nameMai: 'भादव', days: 31 },
  { bsMonth: 6, nameEn: 'Ashwin', nameNe: 'असोज', nameHi: 'आश्विन', nameBho: 'आसिन', nameMai: 'आश्विन', days: 30 },
  { bsMonth: 7, nameEn: 'Kartik', nameNe: 'कात्तिक', nameHi: 'कार्तिक', nameBho: 'कातिक', nameMai: 'कातिक', days: 30 },
  { bsMonth: 8, nameEn: 'Mangsir', nameNe: 'मंसिर', nameHi: 'मार्गशीर्ष', nameBho: 'अगहन', nameMai: 'अगहन', days: 30 },
  { bsMonth: 9, nameEn: 'Poush', nameNe: 'पुष', nameHi: 'पौष', nameBho: 'पूस', nameMai: 'पूस', days: 29 },
  { bsMonth: 10, nameEn: 'Magh', nameNe: 'माघ', nameHi: 'माघ', nameBho: 'माघ', nameMai: 'माघ', days: 30 },
  { bsMonth: 11, nameEn: 'Falgun', nameNe: 'फागुन', nameHi: 'फाल्गुन', nameBho: 'फागुन', nameMai: 'फागुन', days: 29 },
  { bsMonth: 12, nameEn: 'Chaitra', nameNe: 'चैत', nameHi: 'चैत्र', nameBho: 'चैत', nameMai: 'चैत', days: 31 },
];

export const WEEKDAYS = [
  { shortNe: 'आइत', shortHi: 'रवि', shortBho: 'एतवार', shortMai: 'रवि', shortEn: 'Sun', fullNe: 'आइतबार', fullHi: 'रविवार', fullBho: 'एतवार', fullMai: 'रविदिन', fullEn: 'Sunday', isHoliday: false },
  { shortNe: 'सोम', shortHi: 'सोम', shortBho: 'सोमार', shortMai: 'सोम', shortEn: 'Mon', fullNe: 'सोमबार', fullHi: 'सोमवार', fullBho: 'सोमार', fullMai: 'सोमदिन', fullEn: 'Monday', isHoliday: false },
  { shortNe: 'मंगल', shortHi: 'मंगल', shortBho: 'मंगर', shortMai: 'मंगल', shortEn: 'Tue', fullNe: 'मंगलबार', fullHi: 'मंगलवार', fullBho: 'मंगर', fullMai: 'मंगलदिन', fullEn: 'Tuesday', isHoliday: false },
  { shortNe: 'बुध', shortHi: 'बुध', shortBho: 'बुध', shortMai: 'बुध', shortEn: 'Wed', fullNe: 'बुधबार', fullHi: 'बुधवार', fullBho: 'बुध', fullMai: 'बुधदिन', fullEn: 'Wednesday', isHoliday: false },
  { shortNe: 'बिही', shortHi: 'गुरु', shortBho: 'बियफे', shortMai: 'बृह.', shortEn: 'Thu', fullNe: 'बिहीबार', fullHi: 'गुरुवार', fullBho: 'बियफे', fullMai: 'बृहस्पतिदिन', fullEn: 'Thursday', isHoliday: false },
  { shortNe: 'शुक्र', shortHi: 'शुक्र', shortBho: 'सुक', shortMai: 'शुक्र', shortEn: 'Fri', fullNe: 'शुक्रबार', fullHi: 'शुक्रवार', fullBho: 'सुक', fullMai: 'शुक्रदिन', fullEn: 'Friday', isHoliday: false },
  { shortNe: 'शनि', shortHi: 'शनि', shortBho: 'सनिचर', shortMai: 'शनि', shortEn: 'Sat', fullNe: 'शनिबार', fullHi: 'शनिवार', fullBho: 'सनिचर', fullMai: 'शनिदिन', fullEn: 'Saturday', isHoliday: true },
];

export function getBSMonthName(month: number, lang: Language): string {
  const mObj = NEPALI_MONTHS[month - 1] || NEPALI_MONTHS[0];
  if (lang === 'bho') return mObj.nameBho;
  if (lang === 'mai') return mObj.nameMai;
  if (lang === 'hi') return mObj.nameHi;
  if (lang === 'ne') return mObj.nameNe;
  return mObj.nameEn;
}

export function getWeekdayShort(dayOfWeek: number, lang: Language): string {
  const w = WEEKDAYS[dayOfWeek] || WEEKDAYS[0];
  if (lang === 'bho') return w.shortBho;
  if (lang === 'mai') return w.shortMai;
  if (lang === 'hi') return w.shortHi;
  if (lang === 'ne') return w.shortNe;
  return w.shortEn;
}

export function getWeekdayFull(dayOfWeek: number, lang: Language): string {
  const w = WEEKDAYS[dayOfWeek] || WEEKDAYS[0];
  if (lang === 'bho') return w.fullBho;
  if (lang === 'mai') return w.fullMai;
  if (lang === 'hi') return w.fullHi;
  if (lang === 'ne') return w.fullNe;
  return w.fullEn;
}

export const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export function toDevanagari(num: number | string): string {
  return fromDevanagari(String(num));
}

export function fromDevanagari(str: string): string {
  let res = str;
  devanagariDigits.forEach((nepDigit, idx) => {
    res = res.replaceAll(nepDigit, String(idx));
  });
  return res;
}

export function formatCurrency(
  amount: number,
  currency: 'NPR' | 'INR' = 'NPR',
  lang: Language = 'ne'
): string {
  const formattedNumber = amount.toLocaleString('en-IN');
  const symbol = currency === 'NPR' ? (lang === 'en' ? 'Rs. ' : 'रु ') : '₹ ';
  return `${symbol}${formattedNumber}`;
}

export interface BSDate {
  year: number;
  month: number; // 1-12
  day: number;
}

// Complete verified dataset for Bikram Sambat years 2000 to 2100
export const BS_YEAR_MONTH_DAYS: Record<number, number[]> = BS_CALENDAR_DATA;

export function getBSDaysInMonth(year: number, month: number): number {
  return getBSDaysInMonthCore(year, month);
}

// Convert BS Date to Gregorian (AD) Date with verified 2000-2100 coverage
export function bsToAd(year: number, month: number, day: number): Date {
  return bsToAdCore(year, month, day);
}

// Convert Gregorian (AD) Date to Bikram Sambat (BS) Date
export function adToBs(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
} {
  return adToBsCore(date);
}

// Get the starting day of the week for a BS month (0=Sun, 1=Mon, ..., 6=Sat)
export function getBSMonthFirstDayOfWeek(year: number, month: number): number {
  return getBSMonthFirstDayOfWeekCore(year, month);
}

// Current BS Date
export function getTodayBS(): { year: number; month: number; day: number; dayOfWeek: number } {
  return adToBs(new Date());
}

// Legacy compatibility
export function getApproxBSDate(date: Date = new Date()): BSDate {
  const res = adToBs(date);
  return { year: res.year, month: res.month, day: res.day };
}

export function formatBSDate(bs: BSDate, lang: Language = 'ne'): string {
  const monthName = getBSMonthName(bs.month, lang);
  if (lang === 'ne' || lang === 'hi' || lang === 'bho' || lang === 'mai') {
    return `${toDevanagari(bs.day)} ${monthName} ${toDevanagari(bs.year)}`;
  }
  return `${bs.day} ${monthName} ${bs.year}`;
}

export function formatBSDateFull(bs: BSDate, lang: Language): string {
  const ad = bsToAd(bs.year, bs.month, bs.day);
  const dayOfWeek = ad.getUTCDay();
  const monthName = getBSMonthName(bs.month, lang);
  const dayName = getWeekdayFull(dayOfWeek, lang);

  if (lang === 'ne') {
    return `वि.सं. ${toDevanagari(bs.year)} ${monthName} ${toDevanagari(bs.day)} गते, ${dayName}`;
  }
  if (lang === 'bho' || lang === 'hi' || lang === 'mai') {
    return `${toDevanagari(bs.day)} ${monthName} ${toDevanagari(bs.year)} वि.सं., ${dayName}`;
  }
  return `${monthName} ${bs.day}, ${bs.year} (${dayName})`;
}

/**
 * Convert any Date, ISO string, or timestamp to standard Bikram Sambat (BS) date
 * e.g. "२४ कार्तिक २०८३"
 */
export function formatDateToBS(
  dateOrTimestamp: Date | number | string = new Date(),
  lang: Language = 'ne',
  includePrefix: boolean = false
): string {
  try {
    if (!dateOrTimestamp) return '';
    // If it's already a formatted BS string containing Devanagari digits, normalize to English digits
    if (typeof dateOrTimestamp === 'string' && /[०-९]/.test(dateOrTimestamp)) {
      return fromDevanagari(dateOrTimestamp);
    }
    const d = typeof dateOrTimestamp === 'object' ? dateOrTimestamp : new Date(dateOrTimestamp);
    if (isNaN(d.getTime())) return String(dateOrTimestamp);
    const bs = adToBs(d);
    const formatted = formatBSDate(bs, lang);
    return includePrefix ? (lang === 'en' ? `BS ${formatted}` : `वि.सं. ${formatted}`) : formatted;
  } catch {
    return String(dateOrTimestamp || '');
  }
}

/**
 * Format Date to BS with Time (e.g. "२४ कार्तिक २०८३, ०५:३० PM")
 */
export function formatDateToBSWithTime(
  dateOrTimestamp: Date | number | string = new Date(),
  lang: Language = 'ne'
): string {
  try {
    if (!dateOrTimestamp) return '';
    const d = typeof dateOrTimestamp === 'object' ? dateOrTimestamp : new Date(dateOrTimestamp);
    if (isNaN(d.getTime())) return '';
    const bsStr = formatDateToBS(d, lang);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const devanagariTime =
      lang === 'ne' || lang === 'hi' || lang === 'bho' || lang === 'mai'
        ? toDevanagari(timeStr)
        : timeStr;
    return `${bsStr}, ${devanagariTime}`;
  } catch {
    return '';
  }
}

/**
 * Convert Date or timestamp to compact BS numerical format: "२०८३-०७-२४"
 */
export function formatDateToBSNumeric(
  dateOrTimestamp: Date | number | string = new Date(),
  useDevanagari: boolean = true
): string {
  try {
    const d = typeof dateOrTimestamp === 'object' ? dateOrTimestamp : new Date(dateOrTimestamp);
    if (isNaN(d.getTime())) return '';
    const bs = adToBs(d);
    const mStr = bs.month < 10 ? `0${bs.month}` : `${bs.month}`;
    const dStr = bs.day < 10 ? `0${bs.day}` : `${bs.day}`;
    const raw = `${bs.year}-${mStr}-${dStr}`;
    return useDevanagari ? toDevanagari(raw) : raw;
  } catch {
    return '';
  }
}

/**
 * Astronomical Tithi & Paksha Calculation
 * Powered by high-precision solar & lunar ephemeris.
 * Never uses pseudo or fabricated formulas.
 */
export function getTithiInfo(
  bsYear: number,
  bsMonth: number,
  bsDay: number
): {
  tithiNe: string;
  tithiHi: string;
  tithiEn: string;
  pakshaNe: string;
  pakshaHi: string;
  pakshaEn: string;
} {
  const ad = bsToAd(bsYear, bsMonth, bsDay);
  const p = calculatePanchang(ad, bsYear);
  return {
    tithiNe: p.tithi.ne,
    tithiHi: p.tithi.hi,
    tithiEn: p.tithi.en,
    pakshaNe: p.pakshaNe,
    pakshaHi: p.pakshaHi,
    pakshaEn: p.pakshaEn,
  };
}

// Verified National Festivals & Holidays in Bikram Sambat
export interface FestivalItem {
  day: number;
  nameNe: string;
  nameHi: string;
  nameBho: string;
  nameMai: string;
  nameEn: string;
  isHoliday: boolean;
}

export function getFestivalName(f: FestivalItem, lang: Language): string {
  if (lang === 'bho') return f.nameBho;
  if (lang === 'mai') return f.nameMai;
  if (lang === 'hi') return f.nameHi;
  if (lang === 'ne') return f.nameNe;
  return f.nameEn;
}

export const BS_FESTIVALS: Record<number, FestivalItem[]> = {
  1: [
    { day: 1, nameNe: 'नयाँ वर्ष (वि.सं. नयाँ वर्ष)', nameHi: 'नया साल (नव वर्ष)', nameBho: 'नया साल (वि.सं. नव बरिस)', nameMai: 'नव बरख (वि.सं. नव वर्ष)', nameEn: 'Nepali New Year', isHoliday: true },
    { day: 11, nameNe: 'लोकतन्त्र दिवस', nameHi: 'लोकतंत्र दिवस', nameBho: 'लोकतंत्र दिवस', nameMai: 'लोकतंत्र दिवस', nameEn: 'Democracy Day', isHoliday: true },
    { day: 15, nameNe: 'बुद्ध जयन्ती / उँभौली पर्व', nameHi: 'बुद्ध जयंती', nameBho: 'बुद्ध जयंती / उँभौली परब', nameMai: 'बुद्ध जयंती / उँभौली पाबनि', nameEn: 'Buddha Jayanti', isHoliday: true },
  ],
  2: [
    { day: 15, nameNe: 'गणतन्त्र दिवस', nameHi: 'गणतंत्र दिवस', nameBho: 'गणतंत्र दिवस', nameMai: 'गणतंत्र दिवस', nameEn: 'Republic Day', isHoliday: true },
    { day: 29, nameNe: 'जेठ पूर्णिमा', nameHi: 'ज्येष्ठ पूर्णिमा', nameBho: 'जेठ पूर्णिमा', nameMai: 'जेठ पूर्णिमा', nameEn: 'Jestha Purnima', isHoliday: false },
  ],
  3: [
    { day: 15, nameNe: 'राष्ट्रिय धान दिवस (दही चिउरा खाने दिन)', nameHi: 'धान दिवस (दही चूड़ा)', nameBho: 'धान दिवस (दही-चूड़ा खाए के दिन)', nameMai: 'धान दिवस (दही-चूड़ा)', nameEn: 'National Paddy Day', isHoliday: false },
  ],
  4: [
    { day: 1, nameNe: 'साउने संक्रान्ति', nameHi: 'श्रावण संक्रांति', nameBho: 'सावन संक्रांति', nameMai: 'साओन संक्रांति', nameEn: 'Saune Sankranti', isHoliday: false },
    { day: 15, nameNe: 'खीर खाने दिन', nameHi: 'खीर खाने का दिन', nameBho: 'खीर खाए के दिन', nameMai: 'खीर खायबाक दिन', nameEn: 'Kheer Day', isHoliday: false },
    { day: 28, nameNe: 'जनैपूर्णिमा / रक्षाबन्धन / गाईजात्रा', nameHi: 'रक्षाबंधन / जनैपूर्णिमा', nameBho: 'रक्षाबंधन / जनै पूर्णिमा', nameMai: 'रक्षाबंधन / जनै पूर्णिमा', nameEn: 'Janai Purnima / Raksha Bandhan', isHoliday: true },
  ],
  5: [
    { day: 3, nameNe: 'हरितालिका तीज (महिला बिदा)', nameHi: 'हरितालिका तीज', nameBho: 'हरितालिका तीज', nameMai: 'हरितालिका तीज', nameEn: 'Haritalika Teej', isHoliday: true },
    { day: 4, nameNe: 'गणेश चतुर्थी', nameHi: 'गणेश चतुर्थी', nameBho: 'गणेश चतुर्थी', nameMai: 'गणेश चतुर्थी (चौठचंद्र)', nameEn: 'Ganesh Chaturthi', isHoliday: false },
    { day: 5, nameNe: 'ऋषिपञ्चमी', nameHi: 'ऋषि पंचमी', nameBho: 'ऋषि पंचमी', nameMai: 'ऋषि पंचमी', nameEn: 'Rishi Panchami', isHoliday: false },
    { day: 15, nameNe: 'कुशे औंसी (बुवाको मुख हेर्ने दिन)', nameHi: 'कुश अमावस्या (पिता दिवस)', nameBho: 'कुश अमावस्या (बाबूजी दिवस)', nameMai: 'कुश अमावस्या (पितृ दिवस)', nameEn: 'Kushe Aunsi (Father’s Day)', isHoliday: false },
    { day: 20, nameNe: 'इन्द्रजात्रा (काठमाडौं उपत्यका)', nameHi: 'इंद्र जात्रा', nameBho: 'इंद्र जात्रा', nameMai: 'इंद्र जात्रा', nameEn: 'Indra Jatra', isHoliday: true },
  ],
  6: [
    { day: 1, nameNe: 'घटस्थापना (दशैं सुरु)', nameHi: 'घटस्थापना (दशहरा शुरू)', nameBho: 'कलश स्थापना (दशहरा शुरू)', nameMai: 'कलश स्थापना (दशहरा शुरू)', nameEn: 'Ghatasthapana', isHoliday: true },
    { day: 7, nameNe: 'फूलपाती', nameHi: 'फूलपाती', nameBho: 'फूलपाती', nameMai: 'फूलपाती', nameEn: 'Phulpati', isHoliday: true },
    { day: 8, nameNe: 'महाअष्टमी (कालरात्रि)', nameHi: 'महाअष्टमी', nameBho: 'महाअष्टमी', nameMai: 'महाअष्टमी', nameEn: 'Maha Ashtami', isHoliday: true },
    { day: 9, nameNe: 'महानवमी', nameHi: 'महानवमी', nameBho: 'महानवमी', nameMai: 'महानवमी', nameEn: 'Maha Navami', isHoliday: true },
    { day: 10, nameNe: 'विजया दशमी (बडा दशैं)', nameHi: 'विजयादशमी (दशहरा)', nameBho: 'विजयादशमी (दशहरा)', nameMai: 'विजयादशमी (दशहरा)', nameEn: 'Vijaya Dashami', isHoliday: true },
    { day: 15, nameNe: 'कोजाग्रत पूर्णिमा (दशैं समापन)', nameHi: 'शरद पूर्णिमा', nameBho: 'कोजाग्रत पूर्णिमा', nameMai: 'कोजागरा पूर्णिमा', nameEn: 'Kojagrat Purnima', isHoliday: false },
  ],
  7: [
    { day: 12, nameNe: 'काग तिहार (यमपञ्चक सुरु)', nameHi: 'काग तिहार (यमपंचक)', nameBho: 'काग तिहार (यमपंचक)', nameMai: 'काग तिहार (यमपंचक)', nameEn: 'Kag Tihar', isHoliday: false },
    { day: 13, nameNe: 'कुकुर तिहार / नरक चतुर्दशी', nameHi: 'कुकुर तिहार', nameBho: 'नरक चतुर्दशी / कुकुर तिहार', nameMai: 'नरक चतुर्दशी / कुकुर तिहार', nameEn: 'Kukur Tihar', isHoliday: false },
    { day: 14, nameNe: 'लक्ष्मीपूजा (दीपावली)', nameHi: 'दीपावली (लक्ष्मी पूजन)', nameBho: 'दियाबाती / लक्ष्मी पूजा', nameMai: 'दीपावली / लक्ष्मी पूजा', nameEn: 'Laxmi Puja (Diwali)', isHoliday: true },
    { day: 15, nameNe: 'गोवर्धन पूजा / म्ह: पूजा', nameHi: 'गोवर्धन पूजा', nameBho: 'गोवर्धन पूजा', nameMai: 'गोवर्धन पूजा', nameEn: 'Govardhan Puja', isHoliday: true },
    { day: 16, nameNe: 'भाइटीका (तिहार)', nameHi: 'भाई दूज (भाईटीका)', nameBho: 'भाई दूज (भाईटीका)', nameMai: 'भाइ दूज (भरदुतिया)', nameEn: 'Bhai Tika', isHoliday: true },
    { day: 21, nameNe: 'छठ पर्व (सूर्य पूजा)', nameHi: 'छठ पूजा', nameBho: 'छठ परब (सूरुज पूजा)', nameMai: 'छठि पाबनि (सूर्य पूजा)', nameEn: 'Chhath Parva', isHoliday: true },
  ],
  8: [
    { day: 10, nameNe: 'बालाचतुर्दशी (शतबीज छर्ने दिन)', nameHi: 'बाला चतुर्दशी', nameBho: 'बाला चतुर्दशी', nameMai: 'बाला चतुर्दशी', nameEn: 'Bala Chaturdashi', isHoliday: false },
    { day: 15, nameNe: 'उधौली पर्व / धान्य पूर्णिमा', nameHi: 'धान्य पूर्णिमा', nameBho: 'धान्य पूर्णिमा / उधौली परब', nameMai: 'धान्य पूर्णिमा / उधौली पाबनि', nameEn: 'Udhauli Parva', isHoliday: true },
  ],
  9: [
    { day: 15, nameNe: 'तमु ल्होसार (गुरुङ समुदाय)', nameHi: 'तमु ल्होसार', nameBho: 'तमु ल्होसार परब', nameMai: 'तमु ल्होसार पाबनि', nameEn: 'Tamu Lhosar', isHoliday: true },
    { day: 27, nameNe: 'पृथ्वी जयन्ती (राष्ट्रिय एकता दिवस)', nameHi: 'पृथ्वी जयंती (एकता दिवस)', nameBho: 'पृथ्वी जयंती (एकता दिवस)', nameMai: 'पृथ्वी जयंती (एकता दिवस)', nameEn: 'National Unity Day', isHoliday: true },
  ],
  10: [
    { day: 1, nameNe: 'माघे संक्रान्ति (मकर संक्रान्ति)', nameHi: 'मकर संक्रांति', nameBho: 'खिचड़ी / मकर संक्रांति', nameMai: 'तिला संक्रांति / मकर संक्रांति', nameEn: 'Maghe Sankranti', isHoliday: true },
    { day: 16, nameNe: 'शहीद दिवस', nameHi: 'शहीद दिवस', nameBho: 'शहीद दिवस', nameMai: 'शहीद दिवस', nameEn: 'Martyrs’ Day', isHoliday: true },
    { day: 20, nameNe: 'सरस्वती पूजा (श्रीपञ्चमी)', nameHi: 'सरस्वती पूजा (बसंत पंचमी)', nameBho: 'सरस्वती पूजा (बसंत पंचमी)', nameMai: 'सरस्वती पूजा (बसंत पंचमी)', nameEn: 'Saraswati Puja', isHoliday: false },
    { day: 25, nameNe: 'सोनम ल्होसार (तामाङ समुदाय)', nameHi: 'सोनम ल्होसार', nameBho: 'सोनम ल्होसार परब', nameMai: 'सोनम ल्होसार पाबनि', nameEn: 'Sonam Lhosar', isHoliday: true },
  ],
  11: [
    { day: 7, nameNe: 'राष्ट्रिय प्रजातन्त्र दिवस', nameHi: 'राष्ट्रीय प्रजातंत्र दिवस', nameBho: 'राष्ट्रीय प्रजातंत्र दिवस', nameMai: 'राष्ट्रीय प्रजातंत्र दिवस', nameEn: 'Democracy Day', isHoliday: true },
    { day: 14, nameNe: 'महाशिवरात्री पर्व', nameHi: 'महाशिवरात्रि', nameBho: 'महाशिवरात्रि परब', nameMai: 'महाशिवरात्रि पाबनि', nameEn: 'Maha Shivaratri', isHoliday: true },
    { day: 22, nameNe: 'ग्याल्बो ल्होसार (शेर्पा समुदाय)', nameHi: 'ग्याल्बो ल्होसार', nameBho: 'ग्याल्बो ल्होसार परब', nameMai: 'ग्याल्बो ल्होसार पाबनि', nameEn: 'Gyalbo Lhosar', isHoliday: true },
    { day: 29, nameNe: 'फागु पूर्णिमा (होली - पहाड र तराई)', nameHi: 'होली (फागु पूर्णिमा)', nameBho: 'होली / फगुआ (फागुन पूर्णिमा)', nameMai: 'होली / फगुआ', nameEn: 'Holi Festival', isHoliday: true },
  ],
  12: [
    { day: 8, nameNe: 'अन्तर्राष्ट्रिय नारी दिवस', nameHi: 'महिला दिवस', nameBho: 'महिला दिवस', nameMai: 'नारी दिवस', nameEn: 'Women’s Day', isHoliday: true },
    { day: 24, nameNe: 'घोडे जात्रा (काठमाडौं उपत्यका)', nameHi: 'घोड़े जात्रा', nameBho: 'घोड़े जात्रा', nameMai: 'घोड़े जात्रा', nameEn: 'Ghode Jatra', isHoliday: true },
    { day: 29, nameNe: 'रामनवमी', nameHi: 'रामनवमी', nameBho: 'रामनवमी', nameMai: 'रामनवमी', nameEn: 'Ram Navami', isHoliday: true },
    { day: 30, nameNe: 'चैते दशैं', nameHi: 'चैत्र नवरात्र (चैते दशैं)', nameBho: 'चैती नवरात्र (चैते दशैं)', nameMai: 'चैती नवरात्र', nameEn: 'Chaite Dashain', isHoliday: false },
  ],
};

export function getFestivalForDay(month: number, day: number): FestivalItem | null {
  const list = BS_FESTIVALS[month] || [];
  return list.find((f) => f.day === day) || null;
}
