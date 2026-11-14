/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 5-Language (EN / HI / BHO / MAI / NE) copy & Bikram Sambat / AD dual-date helpers
 */

import { Currency, Language } from '../types';
import {
  adToBs,
  bsToAd,
  formatBSDate,
  getBSDaysInMonth,
  getBSMonthName,
  getTodayBS,
  NEPALI_MONTHS,
  toDevanagari,
} from '../utils/nepaliCalendar';
import { pick5 } from '../utils/i18nHelper';
import { BankCalendarEventType, LoanCategory } from './types';

export { pick5 };

export function t5(
  lang: Language,
  en: string,
  hi: string,
  bho: string,
  mai: string,
  ne: string
): string {
  return pick5(lang, { en, hi, bho, mai, ne }, 'bankInvestment');
}

export function bsTag(lang: Language): string {
  return lang === 'en' ? 'BS' : 'वि.सं.';
}

export function adTag(lang: Language): string {
  return lang === 'en' ? 'AD' : 'ई.';
}

export function formatMoney(
  amount: number,
  currency: Currency = 'NPR',
  lang: Language = 'en',
  decimals: number = 0
): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const sign = safe < 0 ? '-' : '';
  const absVal = Math.abs(safe);
  const formatted = absVal.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const symbol = currency === 'NPR' ? (lang === 'en' ? 'Rs. ' : 'रु ') : '₹ ';
  return `${sign}${symbol}${formatted}`;
}

export function formatADDateStr(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatADLocalDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseADDateUTC(adStr: string): Date {
  const parts = adStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}

export function parseBSDateStr(bsStr: string): { year: number; month: number; day: number } {
  const parts = bsStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    const today = getTodayBS();
    return { year: today.year, month: today.month, day: today.day };
  }
  const year = Math.max(2000, Math.min(2100, parts[0]));
  const month = Math.max(1, Math.min(12, parts[1]));
  const maxDay = getBSDaysInMonth(year, month);
  const day = Math.max(1, Math.min(maxDay, parts[2]));
  return { year, month, day };
}

export function formatBSNumStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function bsStrToAdStr(bsStr: string): string {
  const { year, month, day } = parseBSDateStr(bsStr);
  const ad = bsToAd(year, month, day);
  return formatADDateStr(ad);
}

export function adStrToBsStr(adStr: string): string {
  const d = parseADDateUTC(adStr);
  const bs = adToBs(d);
  return formatBSNumStr(bs.year, bs.month, bs.day);
}

export function getTodayDual(): { bsStr: string; adStr: string; bsYear: number; bsMonth: number; bsDay: number } {
  const now = new Date();
  const adStr = formatADLocalDateStr(now);
  const bs = adToBs(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
  return {
    bsStr: formatBSNumStr(bs.year, bs.month, bs.day),
    adStr,
    bsYear: bs.year,
    bsMonth: bs.month,
    bsDay: bs.day,
  };
}

export function addBSMonths(bsStr: string, monthsToAdd: number, preferredDay?: number): { bsStr: string; adStr: string } {
  const parsed = parseBSDateStr(bsStr);
  const totalMonths = (parsed.year * 12 + (parsed.month - 1)) + monthsToAdd;
  const newYear = Math.max(2000, Math.min(2100, Math.floor(totalMonths / 12)));
  const newMonth = ((totalMonths % 12) + 12) % 12 + 1;
  const maxDays = getBSDaysInMonth(newYear, newMonth);
  const targetDay = Math.max(1, Math.min(maxDays, preferredDay ?? parsed.day));
  const nextBs = formatBSNumStr(newYear, newMonth, targetDay);
  const nextAd = bsStrToAdStr(nextBs);
  return { bsStr: nextBs, adStr: nextAd };
}

export function diffDaysAD(fromAdStr: string, toAdStr: string): number {
  const d1 = parseADDateUTC(fromAdStr).getTime();
  const d2 = parseADDateUTC(toAdStr).getTime();
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function formatDualDateBadge(bsStr: string, adStr: string, lang: Language = 'en'): string {
  const bs = parseBSDateStr(bsStr);
  const label = formatBSDate(bs, lang);
  const mObj = NEPALI_MONTHS[bs.month - 1];
  const bsReadable = lang === 'en' ? `${bs.year} ${mObj?.nameEn || ''} ${bs.day}` : label;
  return `${bsReadable} ${bsTag(lang)} (${adStr} ${adTag(lang)})`;
}

export function formatBSMonthHeader(year: number, month: number, lang: Language): string {
  const mName = getBSMonthName(month, lang);
  if (lang === 'en') return `${mName} ${year} BS`;
  return `${toDevanagari(year)} ${mName}`;
}

export const EVENT_TYPE_META: Record<
  BankCalendarEventType,
  {
    en: string;
    hi: string;
    bho: string;
    mai: string;
    ne: string;
    color: string;
    bg: string;
    border: string;
    hex: string;
  }
> = {
  sip_payment: {
    en: 'SIP Payment',
    hi: 'SIP किस्त',
    bho: 'SIP किस्त',
    mai: 'SIP किस्त',
    ne: 'SIP किस्ता',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    hex: '#059669',
  },
  loan_emi: {
    en: 'Loan EMI',
    hi: 'लोन EMI किस्त',
    bho: 'कर्जा EMI किस्त',
    mai: 'कर्जा EMI किस्त',
    ne: 'ऋण EMI किस्ता',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    hex: '#DC2626',
  },
  mf_investment: {
    en: 'Mutual Fund Investment',
    hi: 'म्यूचुअल फंड निवेश',
    bho: 'म्यूचुअल फंड निवेश',
    mai: 'म्यूचुअल फंड निवेश',
    ne: 'म्युचुअल फण्ड लगानी',
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    hex: '#0D9488',
  },
  fd_maturity: {
    en: 'FD Maturity',
    hi: 'FD परिपक्वता',
    bho: 'FD पूरा होखे के तारीख',
    mai: 'FD परिपक्वता',
    ne: 'मुद्दती (FD) परिपक्वता',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    hex: '#2563EB',
  },
  rd_deposit: {
    en: 'RD Deposit',
    hi: 'RD जमा',
    bho: 'RD जमा',
    mai: 'RD जमा',
    ne: 'आवर्ती (RD) जम्मा',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    hex: '#4F46E5',
  },
  interest_credit: {
    en: 'Interest Credit',
    hi: 'ब्याज प्राप्ति',
    bho: 'ब्याज मिलल',
    mai: 'ब्याज प्राप्त',
    ne: 'ब्याज प्राप्त',
    color: 'text-lime-700',
    bg: 'bg-lime-50',
    border: 'border-lime-200',
    hex: '#65A30D',
  },
  dividend_payment: {
    en: 'Dividend Payment',
    hi: 'लाभांश (डिविडेंड)',
    bho: 'लाभांश (डिविडेंड)',
    mai: 'लाभांश (डिविडेंड)',
    ne: 'लाभांश (Dividend)',
    color: 'text-cyan-700',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    hex: '#0891B2',
  },
  insurance_premium: {
    en: 'Insurance Premium',
    hi: 'बीमा प्रीमियम',
    bho: 'बीमा प्रीमियम',
    mai: 'बीमा प्रीमियम',
    ne: 'बीमा प्रिमियम',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    hex: '#D97706',
  },
  credit_card_bill: {
    en: 'Credit Card Bill',
    hi: 'क्रेडिट कार्ड बिल',
    bho: 'क्रेडिट कार्ड बिल',
    mai: 'क्रेडिट कार्ड बिल',
    ne: 'क्रेडिट कार्ड बिल',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    hex: '#EA580C',
  },
  loan_due_date: {
    en: 'Loan Due Date',
    hi: 'लोन भुगतान अंतिम तिथि',
    bho: 'कर्जा चुकता करे के तारीख',
    mai: 'कर्जा चुकता करबाक तिथि',
    ne: 'ऋण भुक्तानी म्याद',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    hex: '#B91C1C',
  },
  investment_reminder: {
    en: 'Investment Reminder',
    hi: 'निवेश रिमाइंडर',
    bho: 'निवेश याददाश्त',
    mai: 'निवेश रिमाइंडर',
    ne: 'लगानी रिमाइन्डर',
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    hex: '#7C3AED',
  },
  custom: {
    en: 'Custom Event',
    hi: 'अन्य कार्यक्रम',
    bho: 'दोसर काम / घटना',
    mai: 'अन्य कार्यक्रम',
    ne: 'अन्य कार्यक्रम',
    color: 'text-slate-700',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    hex: '#475569',
  },
};

export const LOAN_CATEGORY_LABELS: Record<
  LoanCategory,
  { en: string; hi: string; bho: string; mai: string; ne: string }
> = {
  home: {
    en: 'Home Loan',
    hi: 'होम लोन (घर)',
    bho: 'घर के कर्जा (होम लोन)',
    mai: 'घर कर्जा (होम लोन)',
    ne: 'घर कर्जा (Home)',
  },
  personal: {
    en: 'Personal Loan',
    hi: 'पर्सनल लोन (व्यक्तिगत)',
    bho: 'निजी कर्जा (पर्सनल)',
    mai: 'व्यक्तिगत कर्जा (पर्सनल)',
    ne: 'व्यक्तिगत कर्जा (Personal)',
  },
  business: {
    en: 'Business Loan',
    hi: 'बिजनेस लोन (व्यापार)',
    bho: 'व्यापार कर्जा (बिजनेस)',
    mai: 'व्यापार कर्जा (बिजनेस)',
    ne: 'व्यवसाय कर्जा (Business)',
  },
  education: {
    en: 'Education Loan',
    hi: 'एजुकेशन लोन (शिक्षा)',
    bho: 'पढ़ाई कर्जा (एजुकेशन)',
    mai: 'शिक्षा कर्जा (एजुकेशन)',
    ne: 'शैक्षिक कर्जा (Education)',
  },
  vehicle: {
    en: 'Vehicle Loan',
    hi: 'वाहन लोन',
    bho: 'गाड़ी के कर्जा',
    mai: 'गाड़ी कर्जा',
    ne: 'सवारी कर्जा (Vehicle)',
  },
  agricultural: {
    en: 'Agricultural Loan',
    hi: 'कृषि लोन',
    bho: 'खेती-किसानी कर्जा',
    mai: 'कृषि कर्जा',
    ne: 'कृषि कर्जा (Agri)',
  },
  gold: {
    en: 'Gold Loan',
    hi: 'गोल्ड लोन (सोना गिरवी)',
    bho: 'सोना बंधक कर्जा',
    mai: 'सोना बंधक कर्जा',
    ne: 'सुन धितो कर्जा (Gold)',
  },
  custom: {
    en: 'Custom Loan',
    hi: 'अन्य लोन',
    bho: 'दोसर कर्जा',
    mai: 'अन्य कर्जा',
    ne: 'अन्य कर्जा (Custom)',
  },
};
