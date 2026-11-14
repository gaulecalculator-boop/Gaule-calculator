/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  buildGauleDoodhBillSummary,
  formatDualDate,
  formatLitersAndMl,
  generateGauleDoodhWhatsAppText,
} from '../utils/gauleDoodhBillEngine';
import { generateGauleDoodhBillPDF } from '../utils/milkExportUtils';
import { DailyMilkRecord, MilkCustomer, MilkPayment, NoMilkDayRecord } from '../types/milkManagement';

const mockStore = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => mockStore.get(k) ?? null,
  setItem: (k: string, v: string) => {
    mockStore.set(k, String(v));
  },
  removeItem: (k: string) => {
    mockStore.delete(k);
  },
  clear: () => mockStore.clear(),
};

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

async function run() {
  console.log('=== GAULE DOODH BILL ENGINE VERIFICATION ===');

  const cust: MilkCustomer = {
    id: 'cust_test_gd',
    name: 'हरि प्रसाद शर्मा',
    mobile: '9841001122',
    address: 'बनेपा-५',
    startDate: '2026-10-01',
    startBsDate: '2083-06-15',
    startBsYear: 2083,
    startBsMonth: 6,
    startBsDay: 15,
    morningMilk: 1.5,
    eveningMilk: 1.0,
    milkRate: 80,
    openingBalance: 500,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Pre-period: Oct 1 (supplied 2L @ 80 = 160), Oct 2 payment = 200 -> Prev outstanding = 500 + 160 - 200 = 460
  // Selected period: Oct 10 to Oct 15 (6 calendar days), today = Oct 14
  // Oct 10: morning 1.5 + evening 0.25 = 1.75L @ 80 = 140
  // Oct 11: Holiday (Dashain Holiday -> excluded, NOT loss day)
  // Oct 12: No milk ("दूध गएन" -> Loss day #1)
  // Oct 13: morning 2.0 + evening 1.0 = 3.0L @ 90 (rate changed!) = 270
  // Oct 14: Unrecorded active scheduled day <= today -> Loss day #2
  // Oct 15: Future day (> today Oct 14) -> NOT loss day
  const dailyRecords: DailyMilkRecord[] = [
    {
      id: 'r_pre',
      customerId: cust.id,
      customerName: cust.name,
      date: '2026-10-01',
      bsDate: '2083-06-15',
      bsYear: 2083,
      bsMonth: 6,
      bsDay: 15,
      morningMilk: 2,
      eveningMilk: 0,
      totalMilk: 2,
      ratePerLtr: 80,
      totalAmount: 160,
      isNoMilk: false,
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'r_10',
      customerId: cust.id,
      customerName: cust.name,
      date: '2026-10-10',
      bsDate: '2083-06-24',
      bsYear: 2083,
      bsMonth: 6,
      bsDay: 24,
      morningMilk: 1.5,
      eveningMilk: 0.25,
      totalMilk: 1.75,
      ratePerLtr: 80,
      totalAmount: 140,
      isNoMilk: false,
      createdAt: 2,
      updatedAt: 2,
    },
    {
      id: 'r_11_hol',
      customerId: cust.id,
      customerName: cust.name,
      date: '2026-10-11',
      bsDate: '2083-06-25',
      bsYear: 2083,
      bsMonth: 6,
      bsDay: 25,
      morningMilk: 0,
      eveningMilk: 0,
      totalMilk: 0,
      ratePerLtr: 0,
      totalAmount: 0,
      isNoMilk: true,
      note: 'दशैं बिदा (Dashain Holiday)',
      createdAt: 3,
      updatedAt: 3,
    },
    {
      id: 'r_12_loss',
      customerId: cust.id,
      customerName: cust.name,
      date: '2026-10-12',
      bsDate: '2083-06-26',
      bsYear: 2083,
      bsMonth: 6,
      bsDay: 26,
      morningMilk: 0,
      eveningMilk: 0,
      totalMilk: 0,
      ratePerLtr: 0,
      totalAmount: 0,
      isNoMilk: true,
      note: 'दूध गएन (No Milk Day)',
      createdAt: 4,
      updatedAt: 4,
    },
    {
      id: 'r_13',
      customerId: cust.id,
      customerName: cust.name,
      date: '2026-10-13',
      bsDate: '2083-06-27',
      bsYear: 2083,
      bsMonth: 6,
      bsDay: 27,
      morningMilk: 2.0,
      eveningMilk: 1.0,
      totalMilk: 3.0,
      ratePerLtr: 90,
      totalAmount: 270,
      isNoMilk: false,
      createdAt: 5,
      updatedAt: 5,
    },
  ];

  const noMilkDays: NoMilkDayRecord[] = [
    {
      id: 'nm_11',
      customerId: cust.id,
      customerName: cust.name,
      isoDate: '2026-10-11',
      bsDate: '2083-06-25',
      reason: 'दशैं बिदा (Dashain Holiday)',
      createdAt: 3,
    },
  ];

  const payments: MilkPayment[] = [
    {
      id: 'p_pre',
      customerId: cust.id,
      customerName: cust.name,
      date: '2026-10-02',
      bsDate: '2083-06-16',
      amount: 200,
      paymentType: 'partial',
      paymentMethod: 'cash',
      receiptNumber: 'REC-01',
      remainingBalanceAfter: 460,
      auditHistory: [],
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'p_in',
      customerId: cust.id,
      customerName: cust.name,
      date: '2026-10-14',
      bsDate: '2083-06-28',
      amount: 300,
      paymentType: 'partial',
      paymentMethod: 'esewa',
      receiptNumber: 'REC-02',
      remainingBalanceAfter: 570,
      auditHistory: [],
      createdAt: 2,
      updatedAt: 2,
    },
  ];

  const summary = buildGauleDoodhBillSummary(cust, '2026-10-10', '2026-10-15', {
    dailyRecordsOverride: dailyRecords,
    paymentsOverride: payments,
    noMilkDaysOverride: noMilkDays,
    todayIsoOverride: '2026-10-14',
  });

  check(
    '1. Calendar days, supply days, holiday/future exclusion & loss days calculated accurately',
    summary.totalCalendarDays === 6 &&
      summary.totalMilkSupplyDays === 2 &&
      summary.totalLossDays === 2 &&
      summary.excludedNonSupplyDays === 2,
    JSON.stringify({
      cal: summary.totalCalendarDays,
      sup: summary.totalMilkSupplyDays,
      loss: summary.totalLossDays,
      excl: summary.excludedNonSupplyDays,
    })
  );

  check(
    '2. Total milk in Liters and Milliliters = 4 Ltr 750 ml (morning 3.5L, evening 1.25L)',
    summary.totalMilk.liters === 4 &&
      summary.totalMilk.milliliters === 750 &&
      summary.totalMilk.labelEn === '4 Ltr 750 ml' &&
      summary.morningMilk.labelEn === '3 Ltr 500 ml' &&
      summary.eveningMilk.labelEn === '1 Ltr 250 ml',
    JSON.stringify(summary.totalMilk)
  );

  check(
    '3. Multi-rate breakdown separates Rs 80/L and Rs 90/L entries cleanly',
    summary.hasMultipleRates === true &&
      summary.rateBreakdown.length === 2 &&
      summary.totalMilkAmount === 410,
    JSON.stringify(summary.rateBreakdown)
  );

  check(
    '4. Previous outstanding balance (460), total paid (300), and final remaining due (570)',
    summary.previousOutstandingBalance === 460 &&
      summary.totalAmountPaid === 300 &&
      summary.finalRemainingDue === 570 &&
      summary.paymentHistory.length === 1 &&
      summary.paymentHistory[0].paymentMethod === 'esewa',
    JSON.stringify({
      prev: summary.previousOutstandingBalance,
      paid: summary.totalAmountPaid,
      due: summary.finalRemainingDue,
    })
  );

  // 5. Advance carry-in & surplus credit test
  const advSummary = buildGauleDoodhBillSummary(
    { ...cust, openingBalance: 0, morningMilk: 0, eveningMilk: 0 },
    '2026-10-10',
    '2026-10-15',
    {
      dailyRecordsOverride: [dailyRecords[1]], // 140
      paymentsOverride: [
        payments[0], // 200 before start -> priorAdvanceCreditApplied = 200
        { ...payments[1], paymentType: 'advance', amount: 100 }, // total credit = 300 vs 140 = 160 advance remaining
      ],
      todayIsoOverride: '2026-10-14',
    }
  );
  check(
    '5. Advance adjustments compute prior credit applied, period advance, and surplus advance remaining',
    advSummary.priorAdvanceCreditApplied === 200 &&
      advSummary.advancePaymentsInPeriod === 100 &&
      advSummary.finalRemainingDue === 0 &&
      advSummary.advanceCreditRemaining === 160 &&
      advSummary.totalLossDays === 0,
    JSON.stringify({
      priorAdv: advSummary.priorAdvanceCreditApplied,
      advInPeriod: advSummary.advancePaymentsInPeriod,
      remDue: advSummary.finalRemainingDue,
      advCredit: advSummary.advanceCreditRemaining,
      lossDays: advSummary.totalLossDays,
    })
  );

  // 6. Dual Date & WhatsApp text (BS primary + AD secondary, GAULE DOODH, NO daily entries table)
  const dual = formatDualDate('2026-10-10');
  const waText = generateGauleDoodhWhatsAppText(summary);
  check(
    '6. WhatsApp bill has GAULE DOODH branding, BS+AD dates, Ltr+ml, payment history & no daily table',
    waText.includes('GAULE DOODH') &&
      waText.includes(dual.bsDisplayShort) &&
      waText.includes(dual.adDisplay) &&
      waText.includes('4 Ltr 750 ml') &&
      waText.includes('eSewa') &&
      !waText.includes('2083-06-27 BS'),
    waText
  );

  // 7. Non-browser PDF generator fallback runs without throwing
  let pdfOk = true;
  try {
    generateGauleDoodhBillPDF(summary);
  } catch (e) {
    pdfOk = false;
    console.error(e);
  }
  check('7. generateGauleDoodhBillPDF runs cleanly in Node fallback', pdfOk);

  // 8. Liters & ml formatting edge cases
  const mlTest = formatLitersAndMl(0.25 + 0.5);
  check('8. formatLitersAndMl formats 0.75 as 0 Ltr 750 ml', mlTest.labelEn === '0 Ltr 750 ml');

  console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
