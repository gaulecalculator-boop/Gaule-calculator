/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GAULE DOODH — Period Milk Bill Calculation Engine
 * Pure calculation from existing database records (no daily table, no invented entries).
 */

import {
  DailyMilkRecord,
  MilkCustomer,
  MilkPayment,
  MilkRateHistoryItem,
  NoMilkDayRecord,
} from '../types/milkManagement';
import {
  adToBs,
  NEPALI_MONTHS,
  toDevanagari,
} from './nepaliCalendar';
import {
  getEffectiveRatesForDate,
  getStoredDailyMilkRecords,
  getStoredMilkPayments,
  getStoredNoMilkDays,
  getStoredRateHistory,
  getTodayISOLocal,
} from './milkManagementStorage';
import { dairyBranding, DairyBrandingProfile } from './dairyBranding';

export interface DualDateInfo {
  iso: string;
  bsNumeric: string; // "2083-07-22"
  bsDisplayNe: string; // "२२ कात्तिक २०८३"
  bsDisplayShort: string; // "२०८३-०७-२२"
  adDisplay: string; // "2026-11-08" (or formatted "08 Nov 2026")
}

export interface LitersAndMl {
  totalLiters: number;
  liters: number;
  milliliters: number;
  labelEn: string; // e.g. "42 Ltr 750 ml"
  labelNe: string; // e.g. "४२ लिटर ७५० मि.लि."
}

export interface RateBreakdownItem {
  ratePerLtr: number;
  liters: number;
  litersAndMl: LitersAndMl;
  amount: number;
  shiftLabel?: string; // e.g. "बिहान/नियमित" or "बेलुका"
}

export interface GauleDoodhPaymentItem {
  id: string;
  dateISO: string;
  bsDateNumeric: string;
  dualDate: DualDateInfo;
  amount: number;
  paymentMethod: MilkPayment['paymentMethod'];
  methodLabel: string;
  paymentType: MilkPayment['paymentType'];
  receiptNumber: string;
  transactionRef?: string;
  note?: string;
}

export interface GauleDoodhBillSummary {
  billNumber: string;
  billTitle: string;
  generatedAtISO: string;
  generatedDate: DualDateInfo;

  customer: {
    id: string;
    name: string;
    mobile: string;
    address: string;
    status: MilkCustomer['status'];
    startDateISO: string;
    startDateBS: string;
    photoUrl?: string;
  };

  // 1 & 2. Start & End Dates (BS Primary, AD Secondary)
  startDate: DualDateInfo;
  endDate: DualDateInfo;

  // 3, 4, 5. Day Counts
  totalCalendarDays: number;
  totalMilkSupplyDays: number;
  totalLossDays: number;
  excludedNonSupplyDays: number; // holidays / inactive / non-scheduled days not counted as loss

  // 6. Total Milk Supplied in Liters and Milliliters
  morningSupplyDays: number;
  eveningSupplyDays: number;
  morningMilk: LitersAndMl;
  eveningMilk: LitersAndMl;
  totalMilk: LitersAndMl;

  // 7. Milk Rate Per Liter (including split if rates changed during period)
  primaryRatePerLtr: number;
  eveningRatePerLtr?: number;
  hasMultipleRates: boolean;
  rateBreakdown: RateBreakdownItem[];
  rateDisplayText: string;

  // 8. Total Milk Amount
  totalMilkAmount: number;

  // 9. Previous Outstanding Balance
  previousOutstandingBalance: number;
  priorAdvanceCreditApplied: number; // Advance credit carried in from before startDate

  // 10. Complete Payment History
  paymentHistory: GauleDoodhPaymentItem[];

  // 11. Total Amount Paid
  totalAmountPaid: number;

  // 12. Advance Adjustments
  advancePaymentsInPeriod: number;
  totalAdvanceAdjusted: number; // Prior advance applied + advance credit adjustment
  advanceCreditRemaining: number; // Surplus advance carried forward if paid > total payable

  // 13. Final Remaining Due
  netPayableBeforeCurrentPayments: number;
  finalRemainingDue: number;
  status: 'paid' | 'partial' | 'due' | 'advance';
}

export interface BuildGauleDoodhBillOptions {
  billNumber?: string;
  billTitle?: string;
  /**
   * For End-Bill / Final Settlement, payments recorded after endIso (for final settlement)
   * should still be included in paymentHistory & totalAmountPaid.
   */
  includePostEndPayments?: boolean;
  /**
   * Optional explicit collections (useful in pure unit tests or pre-filtered stores)
   */
  dailyRecordsOverride?: DailyMilkRecord[];
  paymentsOverride?: MilkPayment[];
  noMilkDaysOverride?: NoMilkDayRecord[];
  rateHistoryOverride?: MilkRateHistoryItem[];
  todayIsoOverride?: string;
}

const AD_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDualDate(isoDate: string, bsOverride?: string): DualDateInfo {
  const safeIso = (isoDate || getTodayISOLocal()).slice(0, 10);
  const parsed = new Date(`${safeIso}T00:00:00Z`);
  let bsNumeric = bsOverride || '';
  let bsYear = 2083;
  let bsMonth = 1;
  let bsDay = 1;

  if (bsNumeric && /^\d{4}-\d{1,2}-\d{1,2}$/.test(bsNumeric)) {
    const [y, m, d] = bsNumeric.split('-').map((n) => parseInt(n, 10));
    bsYear = y;
    bsMonth = m;
    bsDay = d;
    bsNumeric = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  } else if (!isNaN(parsed.getTime())) {
    const bs = adToBs(parsed);
    bsYear = bs.year;
    bsMonth = bs.month;
    bsDay = bs.day;
    bsNumeric = `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`;
  } else {
    bsNumeric = safeIso;
  }

  const monthObj = NEPALI_MONTHS[bsMonth - 1];
  const bsDisplayNe = monthObj
    ? `${toDevanagari(bsDay)} ${monthObj.nameNe} ${toDevanagari(bsYear)}`
    : toDevanagari(bsNumeric);
  const bsDisplayShort = toDevanagari(bsNumeric);

  let adDisplay = safeIso;
  if (!isNaN(parsed.getTime())) {
    const dNum = String(parsed.getUTCDate()).padStart(2, '0');
    const mName = AD_MONTHS_SHORT[parsed.getUTCMonth()] || '';
    const yNum = parsed.getUTCFullYear();
    adDisplay = `${dNum} ${mName} ${yNum}`;
  }

  return {
    iso: safeIso,
    bsNumeric,
    bsDisplayNe,
    bsDisplayShort,
    adDisplay,
  };
}

export function formatLitersAndMl(totalLitersInput: number): LitersAndMl {
  const safe = Math.max(0, Number(totalLitersInput) || 0);
  const totalMl = Math.round(safe * 1000);
  const liters = Math.floor(totalMl / 1000);
  const milliliters = totalMl % 1000;
  const normalizedTotal = Math.round(totalMl) / 1000;

  const mlPadded = milliliters > 0 ? String(milliliters) : '0';
  const labelEn =
    milliliters > 0
      ? `${liters} Ltr ${mlPadded} ml`
      : `${liters} Ltr 0 ml`;

  const labelNe =
    milliliters > 0
      ? `${toDevanagari(liters)} लिटर ${toDevanagari(milliliters)} मि.लि.`
      : `${toDevanagari(liters)} लिटर ० मि.लि.`;

  return {
    totalLiters: normalizedTotal,
    liters,
    milliliters,
    labelEn,
    labelNe,
  };
}

export function formatPaymentMethodLabel(method: MilkPayment['paymentMethod']): string {
  switch (method) {
    case 'cash':
      return 'नगद (Cash)';
    case 'esewa':
      return 'eSewa';
    case 'khalti':
      return 'Khalti';
    case 'bank':
      return 'बैंक (Bank)';
    case 'qr':
      return 'QR Pay';
    default:
      return String(method || 'Cash').toUpperCase();
  }
}

const NON_LOSS_REASON_REGEX =
  /holiday|चाड|पर्व|बिदा|inactive|stop|pause|paused|non[\s-]*supply|not\s*scheduled|निष्क्रिय|बसाइ|स्थायी\s*बन्द|अस्थायी/i;

function isNonLossReasonText(text?: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  // "दूध गएन (No Milk Day)" is a genuine loss day unless tagged with holiday/inactive/non-supply
  return NON_LOSS_REASON_REGEX.test(trimmed);
}

function addDaysISO(iso: string, deltaDays: number): string {
  const ms = new Date(`${iso}T00:00:00Z`).getTime();
  if (isNaN(ms)) return iso;
  return new Date(ms + deltaDays * 86400000).toISOString().split('T')[0];
}

function diffDaysInclusive(startIso: string, endIso: string): number {
  const s = new Date(`${startIso}T00:00:00Z`).getTime();
  const e = new Date(`${endIso}T00:00:00Z`).getTime();
  if (isNaN(s) || isNaN(e) || e < s) return 1;
  return Math.round((e - s) / 86400000) + 1;
}

function resolveRecordRates(
  rec: DailyMilkRecord,
  customer: MilkCustomer,
  rateHistory: MilkRateHistoryItem[]
): { morningRate: number; eveningRate: number } {
  if (rec.ratePerLtr > 0) {
    return {
      morningRate: rec.ratePerLtr,
      eveningRate: rec.eveningRatePerLtr && rec.eveningRatePerLtr > 0 ? rec.eveningRatePerLtr : rec.ratePerLtr,
    };
  }
  const hist = rateHistory
    .filter((h) => h.effectiveDateISO <= rec.date)
    .sort((a, b) => b.effectiveDateISO.localeCompare(a.effectiveDateISO) || b.createdAt - a.createdAt);
  if (hist.length > 0) {
    const latest = hist[0];
    return {
      morningRate: latest.morningRate ?? latest.rate,
      eveningRate: latest.eveningRate ?? latest.rate,
    };
  }
  return getEffectiveRatesForDate(customer, rec.date);
}

export function buildGauleDoodhBillSummary(
  customer: MilkCustomer,
  rawStartIso: string,
  rawEndIso: string,
  options: BuildGauleDoodhBillOptions = {}
): GauleDoodhBillSummary {
  const aIso = (rawStartIso || customer.startDate || getTodayISOLocal()).slice(0, 10);
  const bIso = (rawEndIso || getTodayISOLocal()).slice(0, 10);
  const startIso = aIso <= bIso ? aIso : bIso;
  const endIso = aIso <= bIso ? bIso : aIso;

  const todayIso = (options.todayIsoOverride || getTodayISOLocal()).slice(0, 10);

  const allDaily = options.dailyRecordsOverride ?? getStoredDailyMilkRecords(customer.id);
  const allPayments = options.paymentsOverride ?? getStoredMilkPayments(customer.id);
  const allNoMilk = options.noMilkDaysOverride ?? getStoredNoMilkDays(customer.id);
  const rateHistory = options.rateHistoryOverride ?? getStoredRateHistory(customer.id);

  // Deduplicate/sort actual daily records inside [startIso, endIso]
  const recordsInPeriod = allDaily
    .filter((r) => r.customerId === customer.id && r.date >= startIso && r.date <= endIso)
    .sort((a, b) => a.date.localeCompare(b.date));

  const recordByDate = new Map<string, DailyMilkRecord>();
  recordsInPeriod.forEach((r) => {
    recordByDate.set(r.date.slice(0, 10), r);
  });

  const noMilkByDate = new Map<string, NoMilkDayRecord>();
  allNoMilk
    .filter((n) => n.customerId === customer.id && n.isoDate >= startIso && n.isoDate <= endIso)
    .forEach((n) => {
      noMilkByDate.set(n.isoDate.slice(0, 10), n);
    });

  // 3. Total Calendar Days in selected range
  const totalCalendarDays = diffDaysInclusive(startIso, endIso);

  // 4 & 5. Actual Supply Days vs Schedule-aware Loss Days
  let totalMilkSupplyDays = 0;
  let totalLossDays = 0;
  let excludedNonSupplyDays = 0;
  let morningSupplyDays = 0;
  let eveningSupplyDays = 0;

  let morningTotalMl = 0;
  let eveningTotalMl = 0;
  let totalMilkAmount = 0;

  // Track exact per-entry rate breakdown
  const rateBuckets = new Map<string, { rate: number; ml: number; amount: number; shiftLabel?: string }>();
  const addRateBucket = (rate: number, liters: number, amount: number, shiftLabel?: string) => {
    if (liters <= 0) return;
    const key = `${rate}_${shiftLabel || 'all'}`;
    const existing = rateBuckets.get(key) || { rate, ml: 0, amount: 0, shiftLabel };
    existing.ml += Math.round(liters * 1000);
    existing.amount += amount;
    rateBuckets.set(key, existing);
  };

  const hasRegularDailySchedule = (customer.morningMilk || 0) + (customer.eveningMilk || 0) > 0;
  const custStartIso = (customer.startDate || startIso).slice(0, 10);
  const custStoppedIso =
    (customer.status === 'stopped' || customer.status === 'inactive') && customer.stoppedDate
      ? customer.stoppedDate.slice(0, 10)
      : undefined;

  // Iterate calendar days inside [startIso, endIso] safely (capped at 4000 days ~ 11 years)
  const loopDays = Math.min(totalCalendarDays, 4000);
  for (let i = 0; i < loopDays; i++) {
    const dayIso = addDaysISO(startIso, i);
    const rec = recordByDate.get(dayIso);
    const nm = noMilkByDate.get(dayIso);

    const hasActualSupply =
      Boolean(rec) &&
      !rec!.isNoMilk &&
      ((rec!.morningMilk || 0) > 0 || (rec!.eveningMilk || 0) > 0 || (rec!.totalMilk || 0) > 0);

    if (hasActualSupply && rec) {
      totalMilkSupplyDays++;
      const mQty = Math.max(0, Number(rec.morningMilk) || 0);
      const eQty = Math.max(0, Number(rec.eveningMilk) || 0);
      const tQty =
        mQty + eQty > 0 ? mQty + eQty : Math.max(0, Number(rec.totalMilk) || 0);

      if (mQty > 0) morningSupplyDays++;
      if (eQty > 0) eveningSupplyDays++;

      morningTotalMl += Math.round(mQty * 1000);
      eveningTotalMl += Math.round(eQty * 1000);

      const { morningRate, eveningRate } = resolveRecordRates(rec, customer, rateHistory);
      const recAmount =
        rec.totalAmount && rec.totalAmount > 0
          ? rec.totalAmount
          : Math.round(mQty * morningRate + eQty * eveningRate);
      totalMilkAmount += recAmount;

      if (morningRate === eveningRate) {
        addRateBucket(morningRate, tQty, recAmount);
      } else {
        const mAmt = mQty > 0 ? Math.round(mQty * morningRate) : 0;
        const eAmt = eQty > 0 ? Math.max(0, recAmount - mAmt) : 0;
        if (mQty > 0) addRateBucket(morningRate, mQty, mAmt, 'बिहान');
        if (eQty > 0) addRateBucket(eveningRate, eQty, eAmt, 'बेलुका');
      }
      continue;
    }

    // No supply on this day: determine whether it's an excluded non-supply day or a loss day
    const isBeforeStart = dayIso < custStartIso;
    const isAfterStopped = custStoppedIso ? dayIso > custStoppedIso : false;
    const isFutureDay = dayIso > todayIso;
    const reasonText = nm?.reason || rec?.note || '';
    const isTaggedNonLoss = isNonLossReasonText(reasonText);

    if (isBeforeStart || isAfterStopped || isFutureDay || isTaggedNonLoss) {
      excludedNonSupplyDays++;
      continue;
    }

    const isExplicitLossRecord = Boolean(nm) || Boolean(rec && (rec.isNoMilk || rec.totalMilk === 0));
    if (isExplicitLossRecord) {
      totalLossDays++;
    } else if (hasRegularDailySchedule) {
      // Customer was scheduled on an active non-holiday day with no supply entry
      totalLossDays++;
    } else {
      excludedNonSupplyDays++;
    }
  }

  // Fallback if period exceeds 4000 days (sum any remaining supplied records safely)
  if (totalCalendarDays > 4000) {
    recordsInPeriod.forEach((rec) => {
      if (rec.date > addDaysISO(startIso, 3999) && !rec.isNoMilk && rec.totalMilk > 0) {
        totalMilkSupplyDays++;
        const mQty = Math.max(0, Number(rec.morningMilk) || 0);
        const eQty = Math.max(0, Number(rec.eveningMilk) || 0);
        if (mQty > 0) morningSupplyDays++;
        if (eQty > 0) eveningSupplyDays++;
        morningTotalMl += Math.round(mQty * 1000);
        eveningTotalMl += Math.round(eQty * 1000);
        totalMilkAmount += rec.totalAmount || 0;
      }
    });
  }

  // 6. Liters and Milliliters
  const morningMilk = formatLitersAndMl(morningTotalMl / 1000);
  const eveningMilk = formatLitersAndMl(eveningTotalMl / 1000);
  const totalMilk = formatLitersAndMl((morningTotalMl + eveningTotalMl) / 1000);

  // 7. Rates Breakdown
  const rateBreakdown: RateBreakdownItem[] = Array.from(rateBuckets.values())
    .sort((a, b) => a.rate - b.rate)
    .map((b) => ({
      ratePerLtr: b.rate,
      liters: Math.round(b.ml) / 1000,
      litersAndMl: formatLitersAndMl(b.ml / 1000),
      amount: Math.round(b.amount),
      shiftLabel: b.shiftLabel,
    }));

  const uniqueRates = Array.from(new Set(rateBreakdown.map((r) => r.ratePerLtr)));
  const effectiveEndRates = getEffectiveRatesForDate(customer, endIso);
  const primaryRatePerLtr =
    uniqueRates.length === 1
      ? uniqueRates[0]
      : uniqueRates.length > 1
      ? uniqueRates[uniqueRates.length - 1]
      : effectiveEndRates.morningRate;
  const eveningRatePerLtr =
    effectiveEndRates.eveningRate !== effectiveEndRates.morningRate
      ? effectiveEndRates.eveningRate
      : undefined;
  const hasMultipleRates = rateBreakdown.length > 1;

  const rateDisplayText =
    rateBreakdown.length === 0
      ? `रु ${primaryRatePerLtr}/लिटर`
      : rateBreakdown.length === 1
      ? `रु ${rateBreakdown[0].ratePerLtr}/लिटर`
      : rateBreakdown
          .map(
            (rb) =>
              `${rb.shiftLabel ? `${rb.shiftLabel} ` : ''}रु ${rb.ratePerLtr}/L (${rb.litersAndMl.labelEn})`
          )
          .join(' • ');

  // 9. Previous Outstanding Balance & Prior Advance Credit
  const openingBal = Math.max(0, Math.round(customer.openingBalance || 0));
  const prePeriodMilkAmt = Math.round(
    allDaily
      .filter((r) => r.customerId === customer.id && !r.isNoMilk && r.date < startIso)
      .reduce((s, r) => s + (r.totalAmount || 0), 0)
  );
  const prePeriodPaid = Math.round(
    allPayments
      .filter((p) => p.customerId === customer.id && p.date < startIso)
      .reduce((s, p) => s + (p.amount || 0), 0)
  );

  const netBeforeStart = openingBal + prePeriodMilkAmt - prePeriodPaid;
  const previousOutstandingBalance = Math.max(0, netBeforeStart);
  const priorAdvanceCreditApplied = Math.max(0, -netBeforeStart);

  // 10 & 11. Complete Payment History inside period (or including post-end for Final Settlement)
  const relevantPayments = allPayments
    .filter((p) => {
      if (p.customerId !== customer.id) return false;
      if (p.date < startIso) return false;
      return options.includePostEndPayments ? true : p.date <= endIso;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);

  const paymentHistory: GauleDoodhPaymentItem[] = relevantPayments.map((p) => ({
    id: p.id,
    dateISO: p.date,
    bsDateNumeric: p.bsDate,
    dualDate: formatDualDate(p.date, p.bsDate),
    amount: Math.round(p.amount || 0),
    paymentMethod: p.paymentMethod,
    methodLabel: formatPaymentMethodLabel(p.paymentMethod),
    paymentType: p.paymentType,
    receiptNumber: p.receiptNumber,
    transactionRef: p.transactionRef,
    note: p.note,
  }));

  const totalAmountPaid = paymentHistory.reduce((s, p) => s + p.amount, 0);

  // 12 & 13. Advance Adjustments & Final Remaining Due
  const advancePaymentsInPeriod = relevantPayments
    .filter((p) => p.paymentType === 'advance')
    .reduce((s, p) => s + Math.round(p.amount || 0), 0);

  const grossCharges = previousOutstandingBalance + Math.round(totalMilkAmount);
  const netPayableBeforeCurrentPayments = Math.max(0, grossCharges - priorAdvanceCreditApplied);
  const finalRemainingDue = Math.max(0, netPayableBeforeCurrentPayments - totalAmountPaid);
  const advanceCreditRemaining = Math.max(
    0,
    totalAmountPaid + priorAdvanceCreditApplied - grossCharges
  );
  const totalAdvanceAdjusted = priorAdvanceCreditApplied + advancePaymentsInPeriod;

  const status: GauleDoodhBillSummary['status'] =
    advanceCreditRemaining > 0
      ? 'advance'
      : finalRemainingDue <= 0
      ? 'paid'
      : totalAmountPaid > 0 || priorAdvanceCreditApplied > 0
      ? 'partial'
      : 'due';

  const generatedAtISO = todayIso;
  const generatedDate = formatDualDate(generatedAtISO);

  return {
    billNumber:
      options.billNumber ||
      `GD-${startIso.replace(/-/g, '').slice(2)}-${endIso.replace(/-/g, '').slice(4)}`,
    billTitle: options.billTitle || 'दुध आपूर्ति तथा हिसाब बिल (MILK SUPPLY BILL)',
    generatedAtISO,
    generatedDate,
    customer: {
      id: customer.id,
      name: customer.name,
      mobile: customer.mobile || '',
      address: customer.address || '',
      status: customer.status,
      startDateISO: customer.startDate,
      startDateBS: customer.startBsDate,
      photoUrl: customer.photoUrl,
    },
    startDate: formatDualDate(startIso, startIso === customer.startDate ? customer.startBsDate : undefined),
    endDate: formatDualDate(endIso),
    totalCalendarDays,
    totalMilkSupplyDays,
    totalLossDays,
    excludedNonSupplyDays,
    morningSupplyDays,
    eveningSupplyDays,
    morningMilk,
    eveningMilk,
    totalMilk,
    primaryRatePerLtr,
    eveningRatePerLtr,
    hasMultipleRates,
    rateBreakdown,
    rateDisplayText,
    totalMilkAmount: Math.round(totalMilkAmount),
    previousOutstandingBalance,
    priorAdvanceCreditApplied,
    paymentHistory,
    totalAmountPaid,
    advancePaymentsInPeriod,
    totalAdvanceAdjusted,
    advanceCreditRemaining,
    netPayableBeforeCurrentPayments,
    finalRemainingDue,
    status,
  };
}

export function resolveGauleDoodhBrand(customProfile?: DairyBrandingProfile): DairyBrandingProfile {
  const base = customProfile || dairyBranding.getProfile();
  return {
    ...base,
    dairyName: base.dairyName || 'GAULE DOODH',
  };
}

/**
 * Traditional GAULE DOODH WhatsApp Bill Text (NO daily milk entries table)
 */
export function generateGauleDoodhWhatsAppText(
  summary: GauleDoodhBillSummary,
  customProfile?: DairyBrandingProfile,
  options: { isFinalEndBill?: boolean } = {}
): string {
  const brand = resolveGauleDoodhBrand(customProfile);
  const dairyTitle = brand.dairyName.toUpperCase().includes('GAULE')
    ? brand.dairyName
    : `GAULE DOODH — ${brand.dairyName}`;

  const lines: string[] = [
    `*🥛 ${dairyTitle}*`,
    options.isFinalEndBill
      ? `*🛑 अन्तिम दुध हिसाब बिल (FINAL END BILL)*`
      : `*🧾 ${summary.billTitle}*`,
    `------------------------------------------`,
    `📄 *बिल नं:* ${summary.billNumber}`,
    `👤 *ग्राहक:* ${summary.customer.name}`,
    `📱 *सम्पर्क:* ${summary.customer.mobile || 'उल्लेख नभएको'}`,
    `📍 *ठेगाना:* ${summary.customer.address || 'स्थानीय'}`,
    `------------------------------------------`,
    `📅 *सुरु मिति (From):* ${summary.startDate.bsDisplayShort} BS (${summary.startDate.adDisplay})`,
    `📅 *अन्तिम मिति (To):* ${summary.endDate.bsDisplayShort} BS (${summary.endDate.adDisplay})`,
    `🗓 *जम्मा दिन (Calendar Days):* ${summary.totalCalendarDays} दिन`,
    `🥛 *दुध आपूर्ति दिन (Supply Days):* ${summary.totalMilkSupplyDays} दिन`,
    `🚫 *दुध नभएको दिन (Loss Days):* ${summary.totalLossDays} दिन`,
    ...(summary.excludedNonSupplyDays > 0
      ? [`ℹ️ *बिदा/निष्क्रिय दिन (Excluded):* ${summary.excludedNonSupplyDays} दिन`]
      : []),
    `------------------------------------------`,
    `🌅 *बिहान दुध:* ${summary.morningMilk.labelEn} (${summary.morningSupplyDays} दिन)`,
    `🌇 *बेलुका दुध:* ${summary.eveningMilk.labelEn} (${summary.eveningSupplyDays} दिन)`,
    `📊 *कुल जम्मा दुध:* *${summary.totalMilk.labelEn}* (${summary.totalMilk.labelNe})`,
    `🏷 *दर (Rate/Ltr):* ${summary.rateDisplayText}`,
    `💵 *अवधि दुध रकम:* रु ${summary.totalMilkAmount.toLocaleString()}`,
    `⏳ *अघिल्लो बाँकी (Prev. Balance):* रु ${summary.previousOutstandingBalance.toLocaleString()}`,
  ];

  if (summary.priorAdvanceCreditApplied > 0) {
    lines.push(
      `💠 *अघिल्लो एडभान्स समायोजन:* - रु ${summary.priorAdvanceCreditApplied.toLocaleString()}`
    );
  }

  lines.push(`------------------------------------------`);
  if (summary.paymentHistory.length > 0) {
    lines.push(`💳 *भुक्तानी इतिहास (${summary.paymentHistory.length}):*`);
    summary.paymentHistory.forEach((p, idx) => {
      lines.push(
        `  ${idx + 1}. ${p.dualDate.bsDisplayShort} BS (${p.dualDate.adDisplay}) • ${p.methodLabel} • रु ${p.amount.toLocaleString()}`
      );
    });
  } else {
    lines.push(`💳 *भुक्तानी इतिहास:* यस अवधिमा भुक्तानी रेकर्ड छैन`);
  }

  lines.push(`✅ *कुल भुक्तानी प्राप्त (Total Paid):* रु ${summary.totalAmountPaid.toLocaleString()}`);

  if (summary.advancePaymentsInPeriod > 0 || summary.advanceCreditRemaining > 0) {
    lines.push(
      `💠 *एडभान्स विवरण (Advance):* अवधि एडभान्स रु ${summary.advancePaymentsInPeriod.toLocaleString()} | बाँकी एडभान्स क्रेडिट रु ${summary.advanceCreditRemaining.toLocaleString()}`
    );
  }

  lines.push(`------------------------------------------`);
  lines.push(
    summary.advanceCreditRemaining > 0
      ? `🟢 *एडभान्स जम्मा (Advance Credit):* *रु ${summary.advanceCreditRemaining.toLocaleString()}*`
      : `🔴 *अन्तिम तिर्न बाँकी रकम (Remaining Due):* *रु ${summary.finalRemainingDue.toLocaleString()}*`
  );
  lines.push(`------------------------------------------`);
  if (brand.mobile) lines.push(`सम्पर्क: ${brand.mobile}`);
  lines.push(`धन्यवाद! 🙏`);

  return lines.join('\n');
}
