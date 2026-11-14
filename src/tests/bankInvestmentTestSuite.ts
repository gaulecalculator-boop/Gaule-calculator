/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comprehensive Automated Verification Suite for Bank & Investment Management System
 */

import {
  advanceDateByFrequency,
  buildLoanAmortizationSchedule,
  calcAnnualInterest,
  calcBankSavingsInterest,
  calcCompoundInterest,
  calcCreditCardPayoff,
  calcDailyInterest,
  calcDividend,
  calcEmergencyFund,
  calcFD,
  calcGoldInvestment,
  calcInflation,
  calcLoanBalanceTransfer,
  calcLoanPrepayment,
  calcLumpsum,
  calcMutualFund,
  calcNepalIncomeTax,
  calcNetWorth,
  calcPPF,
  calcRD,
  calcRetirement,
  calcSharePnL,
  calcSimpleInterest,
  calcSIP,
  calcStepUpSIP,
  calcStockAverage,
  calcSTP,
  calcSWP,
  calculatePeriodicEMI,
  calculateXIRR,
  evaluateMutualFund,
  evaluateSipSummary,
  generateSipSchedule,
} from '../bankInvestment/calculations';
import {
  bankDb,
  createEmptyBankDatabase,
  exportEncryptedBankBackup,
  getActiveBankDbKey,
  migrateBankDatabase,
  restoreEncryptedBankBackup,
} from '../bankInvestment/db';
import {
  adStrToBsStr,
  bsStrToAdStr,
  diffDaysAD,
} from '../bankInvestment/i18n';
import {
  buildAllCalendarEvents,
  collectUpcomingAlerts,
  computePortfolioSummary,
  generateSmartFinancialInsights,
} from '../bankInvestment/insightsAndReminders';
import { BankLoanRecord, MutualFundRecord, SipPlanRecord } from '../bankInvestment/types';
import { authManager } from '../utils/authManager';

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

function approx(actual: number, expected: number, tolerance = 1): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

async function run() {
  console.log('=== BANK & INVESTMENT SYSTEM VERIFICATION SUITE ===');

  // -------------------------------------------------------------------------
  // 1. ALL 20 INVESTMENT CALCULATORS
  // -------------------------------------------------------------------------
  const sip = calcSIP(10000, 12, 10);
  check('1. SIP Calculator (10k/mo @ 12% for 10y)', approx(sip.primaryValue, 2323391, 5), `got ${sip.primaryValue}`);

  const stepSip = calcStepUpSIP(10000, 10, 12, 10);
  check(
    '2. Step-Up SIP beats flat SIP',
    stepSip.primaryValue > sip.primaryValue && stepSip.investedAmount > sip.investedAmount,
    `step=${stepSip.primaryValue}, flat=${sip.primaryValue}`
  );

  const lump = calcLumpsum(100000, 10, 5);
  check('3. Lumpsum Calculator (100k @ 10% for 5y)', approx(lump.primaryValue, 161051, 2), `got ${lump.primaryValue}`);

  const mfCalc = calcMutualFund(100000, 5000, 12, 5, 1);
  check('4. Mutual Fund Calc applies expense ratio net rate', mfCalc.secondaryValue === '11% p.a.' && mfCalc.primaryValue > 400000);

  const swp = calcSWP(1000000, 5000, 8, 5);
  check('5. SWP Calculator sustains 5k/mo on 10L @ 8%', swp.primaryValue > 1000000, `rem=${swp.primaryValue}`);

  const stp = calcSTP(600000, 10000, 6, 12, 5);
  check('6. STP Calculator grows combined portfolio', stp.primaryValue > 600000, `combined=${stp.primaryValue}`);

  const fd = calcFD(100000, 8, 2, 4, 6);
  const fdGross = 100000 * Math.pow(1 + 0.08 / 4, 8);
  const fdNetExp = fdGross - (fdGross - 100000) * 0.06;
  check('7. FD Calculator quarterly + 6% tax TDS', approx(fd.primaryValue, fdNetExp, 1), `got ${fd.primaryValue}, exp ${fdNetExp}`);

  const rd = calcRD(5000, 8, 24);
  check('8. RD Calculator accumulates > principal (120k)', rd.investedAmount === 120000 && rd.primaryValue > 128000, `got ${rd.primaryValue}`);

  const ci = calcCompoundInterest(100000, 10, 2, 4);
  check('9. Compound Interest quarterly', approx(ci.primaryValue, 121840.29, 0.5), `got ${ci.primaryValue}`);

  const si = calcSimpleInterest(100000, 10, 3);
  check('10. Simple Interest (100k @ 10% * 3y)', si.primaryValue === 130000 && si.gainOrInterest === 30000);

  const dailyInt = calcDailyInterest(365000, 10, 10, false, 365);
  check('11. Daily Interest (365k @ 10% for 10d = 1000)', approx(dailyInt.gainOrInterest, 1000, 0.1), `got ${dailyInt.gainOrInterest}`);

  const annualInt = calcAnnualInterest(100000, 10, 2, 'reinvest');
  check('12. Annual Interest reinvest = 121000', annualInt.primaryValue === 121000);

  const div = calcDividend(200, 450, 20, 'percent_of_par', 100, 5);
  // Gross = 200 * 100 * 20% = 4000; tax 5% = 200; net = 3800
  check('13. Dividend Calc net payout = 3800', div.primaryValue === 3800, `got ${div.primaryValue}`);

  const avgStock = calcStockAverage(
    [
      { qty: 100, price: 300 },
      { qty: 100, price: 400 },
    ],
    420
  );
  check('14. Stock Average Price = 350 & unrealized gain = 14000', avgStock.primaryValue === 350 && avgStock.gainOrInterest === 14000);

  const pnl = calcSharePnL(100, 500, 700, 0.4, 25, 7.5);
  check('15. Share Profit & Loss positive net after broker & CGT', pnl.primaryValue > 17000 && pnl.primaryValue < 20000, `got ${pnl.primaryValue}`);

  const gold = calcGoldInvestment(2, 140000, 165000, 5000, 2);
  check('16. Gold Investment net gain = 45000', gold.investedAmount === 285000 && gold.primaryValue === 330000 && gold.gainOrInterest === 45000);

  const ret = calcRetirement(30, 60, 80, 50000, 6, 12, 8, 500000);
  check('17. Retirement corpus & required SIP positive', ret.primaryValue > 50000000 && Number(ret.secondaryValue) > 0);

  const inf = calcInflation(100000, 6, 10);
  check('18. Inflation Calc 100k @ 6% for 10y', approx(inf.primaryValue, 179084.77, 1), `got ${inf.primaryValue}`);

  const ppf = calcPPF(120000, 8, 15, 0);
  check('19. PPF / EPF 15y accumulation > 3.5M', ppf.primaryValue > 3500000, `got ${ppf.primaryValue}`);

  const nw = calcNetWorth(
    { cashBank: 200000, fdRd: 300000, mfSip: 500000, shares: 0, gold: 100000, propertyOther: 0 },
    { homeLoan: 400000, personalVehicleLoan: 0, creditCardDebt: 25000, otherLoans: 0 }
  );
  check('20. Net Worth = 1.1M - 425k = 675k', nw.primaryValue === 675000 && nw.investedAmount === 1100000);

  // -------------------------------------------------------------------------
  // 2. BANK LOAN AMORTIZATION + VARIABLE RATE + NO MUTATING PAID HISTORY
  // -------------------------------------------------------------------------
  const emiCheck = calculatePeriodicEMI(1000000, 12, 120, 12);
  check('Loan Periodic EMI (10L @ 12%, 10y)', approx(emiCheck, 14347.09, 0.5), `got ${emiCheck}`);

  const sampleLoan: BankLoanRecord = {
    id: 'loan_test_1',
    category: 'home',
    bankName: 'Nabil Bank',
    nickname: 'Home Loan',
    principalAmount: 1000000,
    interestRate: 10,
    interestType: 'variable',
    startDateBS: '2082-01-01',
    startDateAD: bsStrToAdStr('2082-01-01'),
    durationMonths: 24,
    emiPaymentDay: 5,
    paymentFrequency: 'monthly',
    processingFee: 10000,
    plannedExtraPayment: 0,
    rateChanges: [
      {
        id: 'rc_1',
        effectiveDateBS: '2082-04-01',
        effectiveDateAD: bsStrToAdStr('2082-04-01'),
        newRate: 12,
        note: 'Base rate revision',
        createdAt: Date.now(),
      },
    ],
    payments: [
      {
        id: 'pay_1',
        installmentNo: 1,
        dueDateAD: bsStrToAdStr('2082-02-05'),
        dueDateBS: '2082-02-05',
        paidDateAD: bsStrToAdStr('2082-02-05'),
        paidDateBS: '2082-02-05',
        scheduledEmi: 46144.93,
        principalComponent: 37811.6,
        interestComponent: 8333.33,
        extraPrincipalPaid: 10000,
        totalPaid: 56144.93,
        rateApplied: 10,
        method: 'bank',
        confirmedByUser: true,
        createdAt: Date.now(),
      },
    ],
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const sched = buildLoanAmortizationSchedule(sampleLoan, bsStrToAdStr('2082-03-10'));
  check(
    'Loan preserves exact paid #1 history & rate stays 10% on #1-#2 (before 2082-04-01) then rises to 12% on #3+ (2082-04-05)',
    sched.rows[0].status === 'paid' &&
      sched.rows[0].rateApplied === 10 &&
      sched.rows[0].extraPrincipal === 10000 &&
      sched.rows[1].rateApplied === 10 &&
      sched.rows[2].rateApplied === 12 &&
      sched.paidEmiCount === 1 &&
      sched.remainingPrincipal === 952188.4,
    `row0=${sched.rows[0].rateApplied}, row1=${sched.rows[1].rateApplied}, row2=${sched.rows[2]?.rateApplied}, remP=${sched.remainingPrincipal}`
  );

  // Persist & test duplicate EMI payment blocking
  mockStore.clear();
  const savedLoan = bankDb.upsertLoan(sampleLoan);
  const dupAttempt = bankDb.confirmLoanPayment(savedLoan.id, {
    installmentNo: 1,
    dueDateAD: sampleLoan.payments[0].dueDateAD,
    dueDateBS: sampleLoan.payments[0].dueDateBS,
    paidDateAD: sampleLoan.payments[0].paidDateAD,
    paidDateBS: sampleLoan.payments[0].paidDateBS,
    scheduledEmi: 46144.93,
    principalComponent: 37811.6,
    interestComponent: 8333.33,
    extraPrincipalPaid: 0,
    totalPaid: 46144.93,
    rateApplied: 10,
    method: 'bank',
  });
  check('Loan duplicate EMI confirmation is strictly blocked', dupAttempt.ok === false && dupAttempt.duplicate === true);

  // -------------------------------------------------------------------------
  // 3. ADVANCED SIP ENGINE (PAUSE/STOP/STEP-UP/DUPLICATE GUARD)
  // -------------------------------------------------------------------------
  const sipPlan: SipPlanRecord = {
    id: 'sip_test_1',
    sipName: 'NIBL Growth',
    fundName: 'NIBL Sahabhagita Fund',
    monthlyInvestment: 5000,
    stepUpPercent: 10,
    startDateBS: '2082-01-01',
    startDateAD: bsStrToAdStr('2082-01-01'),
    sipDay: 10,
    durationMonths: 24,
    expectedReturnRate: 12,
    status: 'active',
    installments: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const savedSip = bankDb.upsertSip(sipPlan);
  const sipPay1 = bankDb.confirmSipInstallment(savedSip.id, 1, {
    paidDateBS: '2082-01-10',
    paidDateAD: bsStrToAdStr('2082-01-10'),
    amount: 5000,
    nav: 10.5,
  });
  const sipPayDup = bankDb.confirmSipInstallment(savedSip.id, 1, {
    paidDateBS: '2082-01-10',
    paidDateAD: bsStrToAdStr('2082-01-10'),
    amount: 5000,
  });
  check('SIP payment 1 succeeds & duplicate confirmation blocked', sipPay1.ok === true && sipPayDup.ok === false && sipPayDup.duplicate === true);

  const refreshedSip = bankDb.getAll().sips[0];
  const refAfter4MonthsAD = bsStrToAdStr('2082-04-20');
  const fullSipSched = generateSipSchedule(
    refreshedSip.startDateBS,
    refreshedSip.sipDay,
    refreshedSip.monthlyInvestment,
    refreshedSip.durationMonths,
    refreshedSip.stepUpPercent,
    refreshedSip.installments,
    refAfter4MonthsAD,
    'active'
  );
  const sipEval = evaluateSipSummary({ ...refreshedSip, installments: fullSipSched }, refAfter4MonthsAD);
  check(
    'SIP generates 24 installments, 10% step-up on month 13 (5500), detects missed installments when active',
    fullSipSched.length === 24 &&
      fullSipSched[0].status === 'paid' &&
      fullSipSched[12].amount === 5500 &&
      sipEval.actualInvestedAmount === 5000 &&
      sipEval.missedCount > 0,
    `len=${fullSipSched.length}, m13=${fullSipSched[12].amount}, missed=${sipEval.missedCount}`
  );

  // Pause status stops flagging unconfirmed dates as missed
  const pausedSched = generateSipSchedule(
    refreshedSip.startDateBS,
    refreshedSip.sipDay,
    refreshedSip.monthlyInvestment,
    refreshedSip.durationMonths,
    refreshedSip.stepUpPercent,
    refreshedSip.installments,
    refAfter4MonthsAD,
    'paused'
  );
  check('Paused SIP has 0 missed flags', pausedSched.every((s) => s.status !== 'missed'));

  // -------------------------------------------------------------------------
  // 4. MUTUAL FUND PORTFOLIO & EXACT XIRR SOLVER
  // -------------------------------------------------------------------------
  const xirrExact = calculateXIRR([
    { dateAD: '2025-01-01', amount: -100000 },
    { dateAD: '2026-01-01', amount: 112000 },
  ]);
  check('XIRR 1-year 12% exact convergence', xirrExact !== null && approx(xirrExact, 12, 0.05), `got ${xirrExact}`);

  const xirrInsufficient = calculateXIRR([{ dateAD: '2025-01-01', amount: -50000 }]);
  check('XIRR returns null when cash flows insufficient', xirrInsufficient === null);

  const mfRec: MutualFundRecord = {
    id: 'mf_test_1',
    fundName: 'Siddhartha Equity Fund',
    category: 'equity',
    investmentDateBS: '2081-01-01',
    investmentDateAD: '2024-04-13',
    purchaseNav: 10,
    unitsPurchased: 10000,
    currentNav: 12.5,
    navSource: 'manual',
    navLastUpdatedAD: '2025-06-15',
    navLastUpdatedBS: '2082-03-01',
    additions: [{ id: 'a1', dateBS: '2081-07-01', dateAD: '2024-10-17', amount: 22000, nav: 11, units: 2000, createdAt: Date.now() }],
    redemptions: [{ id: 'r1', dateBS: '2082-01-01', dateAD: '2025-04-14', unitsRedeemed: 2000, redemptionNav: 12, amountReceived: 24000, createdAt: Date.now() }],
    dividends: [{ id: 'd1', dateBS: '2081-09-01', dateAD: '2024-12-16', amount: 5000, createdAt: Date.now() }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const mfEval = evaluateMutualFund(mfRec, '2025-06-15');
  // Purchased = 12,000 units, redeemed = 2,000 => remaining = 10,000 units; Current Val = 125,000;
  // Total Inflow = 125,000 + 24,000 + 5,000 = 154,000; Invested Outflow = 100,000 + 22,000 = 122,000; Profit = 32,000
  check(
    'Mutual Fund evaluation (units, partial redemption, dividend, XIRR)',
    mfEval.remainingUnits === 10000 &&
      mfEval.totalProfitLoss === 32000 &&
      mfEval.xirrPercent !== null &&
      mfEval.xirrPercent > 15,
    `remU=${mfEval.remainingUnits}, pl=${mfEval.totalProfitLoss}, xirr=${mfEval.xirrPercent}`
  );

  // -------------------------------------------------------------------------
  // 5. CALENDAR + BS/AD CONVERSION + NEVER AUTO-PAID
  // -------------------------------------------------------------------------
  const testBS = '2083-05-15';
  const testAD = bsStrToAdStr(testBS);
  const backBS = adStrToBsStr(testAD);
  check('BS <-> AD bidirectional conversion exact round-trip', backBS === testBS, `${testBS} -> ${testAD} -> ${backBS}`);

  bankDb.upsertCalendarEvent({
    title: 'Planned FD Maturity Reminder',
    type: 'fd_maturity',
    bsDate: '2082-06-01',
    bsYear: 2082,
    bsMonth: 6,
    bsDay: 1,
    adDate: bsStrToAdStr('2082-06-01'),
    amount: 250000,
    reminderDaysBefore: 7,
    reminderEnabled: true,
    isPaid: false,
  });
  const allCal = buildAllCalendarEvents(bankDb.getAll(), bsStrToAdStr('2082-05-26'));
  const plannedFDEv = allCal.find((e) => e.title === 'Planned FD Maturity Reminder');
  const unpaidEmiEv = allCal.find((e) => e.linkedSourceType === 'loan' && e.title.includes('#2'));
  check(
    'Calendar merges custom & auto-linked events; planned events NEVER marked paid unless user confirms',
    Boolean(plannedFDEv && !plannedFDEv.isPaid && unpaidEmiEv && !unpaidEmiEv.isPaid)
  );

  // -------------------------------------------------------------------------
  // 6. ADDITIONAL FINANCIAL TOOLS
  // -------------------------------------------------------------------------
  const ccTrap = calcCreditCardPayoff(50000, 24, 900); // monthly int is 1000 > 900
  const ccOk = calcCreditCardPayoff(50000, 24, 5000);
  check('Credit Card APR trap detected & finite payoff when payment > interest', ccTrap.isMinimumTrap === true && ccOk.monthsToPayoff === 12);

  const taxSingle = calcNepalIncomeTax(1200000, 'single', 100000, 0, 20000, true);
  // Deductions = 120,000 => Taxable = 1,080,000 -> 500k*1%=5k + 200k*10%=20k + 300k*20%=60k + 80k*30%=24k => gross 109k; 10% female rebate => 98,100
  check('Nepal Income Tax slab + 10% female credit', taxSingle.grossTax === 109000 && taxSingle.netAnnualTax === 98100, `got ${taxSingle.netAnnualTax}`);

  const savInt = calcBankSavingsInterest(500000, 6, 365, 6);
  check('Bank Savings Interest (500k @ 6% * 365d - 6% tax = 28200)', savInt.grossInterest === 30000 && savInt.netInterest === 28200);

  const prepay = calcLoanPrepayment(1000000, 12, 120, 100000, 2000);
  check('Loan Prepayment saves interest & months', prepay.monthsSaved > 20 && prepay.interestSaved > 200000);

  const bt = calcLoanBalanceTransfer(1000000, 14, 10, 60, 15000);
  check('Loan Balance Transfer evaluates net benefit after fee', bt.isWorthTransferring === true && bt.netSavingsAfterFee > 80000);

  const ef = calcEmergencyFund(40000, 6, 80000, 20000);
  check('Emergency Fund target = 240k, gap = 160k, 8 months to reach', ef.targetCorpus === 240000 && ef.fundingGap === 160000 && ef.monthsToReachGoal === 8);

  const nextWeek = advanceDateByFrequency('2083-01-01', 'weekly');
  check('Weekly frequency advances exactly 7 AD days & converts cleanly to BS', diffDaysAD(bsStrToAdStr('2083-01-01'), nextWeek.adStr) === 7 && adStrToBsStr(nextWeek.adStr) === nextWeek.bsStr);

  // -------------------------------------------------------------------------
  // 7. REPORTS, REMINDERS & DETERMINISTIC SMART INSIGHTS
  // -------------------------------------------------------------------------
  const emptyInsights = generateSmartFinancialInsights(createEmptyBankDatabase(), bsStrToAdStr('2082-05-26'));
  check('Smart Insights produces 0 items on empty DB (never fake advice)', emptyInsights.length === 0);

  const realDb = bankDb.getAll();
  const realInsights = generateSmartFinancialInsights(realDb, bsStrToAdStr('2082-05-26'));
  const alerts = collectUpcomingAlerts(realDb, bsStrToAdStr('2082-05-26'), 7);
  const summary = computePortfolioSummary(realDb, bsStrToAdStr('2082-05-26'));
  check(
    'Portfolio summary, alerts & grounded insights populated strictly from DB',
    summary.remainingLoan > 0 && alerts.length > 0 && realInsights.length > 0
  );

  // -------------------------------------------------------------------------
  // 8. SCHEMA MIGRATION (v1 -> v2), ACCOUNT ISOLATION & AES-256-GCM BACKUP
  // -------------------------------------------------------------------------
  const v1Raw = {
    schemaVersion: 1,
    loans: [
      {
        id: 'legacy_1',
        category: 'personal',
        bankName: 'Legacy Bank',
        nickname: 'Old',
        principalAmount: 100000,
        interestRate: 12,
        interestType: 'fixed',
        startDateBS: '2081-01-01',
        startDateAD: '2024-04-13',
        durationMonths: 12,
        emiPaymentDay: 1,
        processingFee: 0,
        payments: [{ id: 'p1', installmentNo: 1, totalPaid: 8884 }],
        status: 'active',
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    mutualFunds: [{ id: 'mf_old', fundName: 'Old MF', category: 'Debt', investmentDateBS: '2081-01-01', investmentDateAD: '2024-04-13', purchaseNav: 10, unitsPurchased: 100, currentNav: 11, createdAt: 1, updatedAt: 1 }],
  };
  const migratedV2 = migrateBankDatabase(v1Raw);
  check(
    'Schema v1 -> v2 migration preserves loans/MFs & initializes new fields',
    migratedV2.schemaVersion === 2 &&
      migratedV2.loans[0].paymentFrequency === 'monthly' &&
      migratedV2.loans[0].payments[0].confirmedByUser === true &&
      Array.isArray(migratedV2.mutualFunds[0].redemptions) &&
      migratedV2.mutualFunds[0].navSource === 'manual'
  );

  // Account Isolation prefix check
  const guestPrefix = authManager.getActiveStoragePrefix();
  const key1 = getActiveBankDbKey();
  check('Offline-first DB works cleanly with no compulsory login', key1.startsWith(guestPrefix));

  // AES-256-GCM Backup & Restore
  const backupEnvelope = await exportEncryptedBankBackup('Ghaule@2083');
  const envelopeJson = JSON.stringify(backupEnvelope);
  check('Encrypted backup envelope uses AES-GCM + PBKDF2-SHA256', backupEnvelope.algorithm === 'AES-GCM' && backupEnvelope.kdf === 'PBKDF2-SHA256');

  let wrongPassFailed = false;
  try {
    await restoreEncryptedBankBackup(envelopeJson, 'WrongPassphrase');
  } catch {
    wrongPassFailed = true;
  }
  check('Wrong passphrase strictly rejected during restore', wrongPassFailed);

  // Wipe and restore
  bankDb.resetAll();
  check('DB wiped cleanly prior to restore test', bankDb.getAll().loans.length === 0);

  const restored = await restoreEncryptedBankBackup(envelopeJson, 'Ghaule@2083');
  check(
    'AES-256-GCM restore recovers exact loan, SIP & calendar state',
    restored.loans.length === 1 &&
      restored.loans[0].id === 'loan_test_1' &&
      restored.sips.length === 1 &&
      restored.calendarEvents.some((c) => c.title === 'Planned FD Maturity Reminder')
  );

  console.log(`\nSUMMARY: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test suite error:', err);
  process.exit(1);
});
