/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comprehensive Verification Suite for the Advanced Milk Customer & Payment Management System
 */

import { adToBs, bsToAd, getBSDaysInMonth } from '../utils/nepaliCalendar';

// In-memory localStorage mock for Node/tsx execution
const memoryStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => (key in memoryStore ? memoryStore[key] : null),
  setItem: (key: string, val: string) => {
    memoryStore[key] = String(val);
  },
  removeItem: (key: string) => {
    delete memoryStore[key];
  },
  clear: () => {
    for (const k of Object.keys(memoryStore)) delete memoryStore[k];
  },
};

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, details?: string) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${name}`);
  } else {
    failed++;
    console.error(`[FAIL] ${name}${details ? ` — ${details}` : ''}`);
  }
}

async function runTests() {
  console.log('=== ADVANCED MILK MANAGEMENT SYSTEM VERIFICATION SUITE ===\n');

  // Dynamic import after initial module resolution so authManager doesn't attach browser listeners
  const storage = await import('../utils/milkManagementStorage');

  // Enable localStorage & window shims now for storage functions
  (globalThis as any).localStorage = mockLocalStorage;
  (globalThis as any).window = globalThis;
  mockLocalStorage.clear();

  // Helper to get BS + ISO shifted by N days from today
  const shiftToday = (offsetDays: number) => {
    const todayIso = storage.getTodayISOLocal();
    const baseMs = new Date(todayIso + 'T00:00:00Z').getTime();
    const d = new Date(baseMs + offsetDays * 86400000);
    const iso = d.toISOString().split('T')[0];
    const bs = adToBs(d);
    const bsStr = `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`;
    return { iso, bs, bsStr };
  };

  // Seed empty arrays so default demo data doesn't interfere with deterministic assertions
  localStorage.setItem('ghaule_milk_customers_v2_guest_local', '[]');
  localStorage.setItem('ghaule_milk_daily_records_v2_guest_local', '[]');
  localStorage.setItem('ghaule_milk_payments_v2_guest_local', '[]');
  localStorage.setItem('ghaule_milk_payment_allocations_v2_guest_local', '[]');
  localStorage.setItem('ghaule_milk_no_milk_days_v2_guest_local', '[]');
  localStorage.setItem('ghaule_milk_audit_logs_v2_guest_local', '[]');
  localStorage.setItem('ghaule_milk_rate_history_v2_guest_local', '[]');
  localStorage.setItem('ghaule_milk_final_bills_v2_guest_local', '[]');

  // -------------------------------------------------------------------
  // 1. CUSTOMER MANAGEMENT (All fields, Separate Evening Rate, Status)
  // -------------------------------------------------------------------
  const ramStartAd = bsToAd(2083, 1, 4);
  const ramStartIso = ramStartAd.toISOString().split('T')[0];

  const ram = storage.saveMilkCustomer({
    name: 'Ram Bahadur',
    address: 'Banepa-4',
    mobile: '9841000001',
    startDate: ramStartIso,
    startBsDate: '2083-01-04',
    startBsYear: 2083,
    startBsMonth: 1,
    startBsDay: 4,
    morningMilk: 2,
    eveningMilk: 1,
    milkRate: 80,
    eveningMilkRate: 90,
    status: 'active',
    notes: 'Buffalo + Cow milk',
  });

  check(
    '1.1 Create customer with unique ID & separate morning/evening rates',
    ram.id.startsWith('mcust_') && ram.milkRate === 80 && ram.eveningMilkRate === 90
  );

  const ramStopped = storage.toggleMilkCustomerStatus(ram.id, 'stopped', 'Temp travel');
  check('1.2 Toggle customer status to stopped', ramStopped?.status === 'stopped');

  const ramResumed = storage.toggleMilkCustomerStatus(ram.id, 'active');
  check('1.3 Resume customer status back to active', ramResumed?.status === 'active');

  // -------------------------------------------------------------------
  // 2. DAILY MILK ENTRY, RATE PRESERVATION & AUDIT LOGGING
  // -------------------------------------------------------------------
  const d1 = storage.saveDailyMilkRecord({
    customerId: ram.id,
    customerName: ram.name,
    date: ramStartIso,
    bsDate: '2083-01-04',
    bsYear: 2083,
    bsMonth: 1,
    bsDay: 4,
    morningMilk: 2,
    eveningMilk: 1,
    totalMilk: 3,
    ratePerLtr: 80,
    eveningRatePerLtr: 90,
    totalAmount: 2 * 80 + 1 * 90,
    isNoMilk: false,
  });

  // Save another record on same date without editId -> should update instead of duplicate!
  storage.saveDailyMilkRecord({
    customerId: ram.id,
    customerName: ram.name,
    date: ramStartIso,
    bsDate: '2083-01-04',
    bsYear: 2083,
    bsMonth: 1,
    bsDay: 4,
    morningMilk: 2.5,
    eveningMilk: 1,
    totalMilk: 3.5,
    ratePerLtr: 80,
    eveningRatePerLtr: 90,
    totalAmount: 2.5 * 80 + 1 * 90,
    isNoMilk: false,
  });

  const ramRecordsAfterDup = storage.getStoredDailyMilkRecords(ram.id);
  const ramAuditLogs = storage.getStoredAuditLogs(ram.id);
  check(
    '2.1 Duplicate daily entry on same BS date merges safely & writes edit_daily_entry audit log',
    ramRecordsAfterDup.length === 1 &&
      ramRecordsAfterDup[0].id === d1.id &&
      ramRecordsAfterDup[0].totalAmount === 290 &&
      ramAuditLogs.some((l) => l.action === 'edit_daily_entry')
  );

  // Rate history test: effective from 2083-01-15 -> Rs 100 morning / Rs 110 evening
  const rateEffIso = bsToAd(2083, 1, 15).toISOString().split('T')[0];
  storage.saveRateHistory({
    customerId: ram.id,
    rate: 100,
    morningRate: 100,
    eveningRate: 110,
    effectiveDateISO: rateEffIso,
    effectiveDateBS: '2083-01-15',
    note: 'Seasonal price adjustment',
  });

  const rateBefore = storage.getEffectiveRatesForDate(ram, ramStartIso);
  const rateOnEff = storage.getEffectiveRatesForDate(ram, rateEffIso);
  check(
    '2.2 Rate preservation: past date keeps Rs 80/90, effective date applies Rs 100/110',
    rateBefore.morningRate === 80 &&
      rateBefore.eveningRate === 90 &&
      rateOnEff.morningRate === 100 &&
      rateOnEff.eveningRate === 110
  );

  // -------------------------------------------------------------------
  // 3. NO MILK DAY & CONFLICT HANDLING
  // -------------------------------------------------------------------
  storage.saveNoMilkDay({
    customerId: ram.id,
    customerName: ram.name,
    isoDate: ramStartIso,
    bsDate: '2083-01-04',
    reason: 'Guest away',
  });
  const afterNoMilkRec = storage.getStoredDailyMilkRecords(ram.id).find((r) => r.date === ramStartIso);
  const noMilkList = storage.getStoredNoMilkDays(ram.id);
  check(
    '3.1 No Milk Day zeros morning/evening/amount and records in no_milk_days',
    noMilkList.length === 1 &&
      afterNoMilkRec?.isNoMilk === true &&
      afterNoMilkRec.totalMilk === 0 &&
      afterNoMilkRec.totalAmount === 0
  );

  // Restoring milk > 0 on that day removes it from no_milk_days
  storage.saveDailyMilkRecord({
    customerId: ram.id,
    customerName: ram.name,
    date: ramStartIso,
    bsDate: '2083-01-04',
    bsYear: 2083,
    bsMonth: 1,
    bsDay: 4,
    morningMilk: 1,
    eveningMilk: 0,
    totalMilk: 1,
    ratePerLtr: 80,
    eveningRatePerLtr: 90,
    totalAmount: 80,
    isNoMilk: false,
  });
  check(
    '3.2 Adding milk > 0 clears previous No Milk Day entry automatically',
    storage.getStoredNoMilkDays(ram.id).length === 0
  );

  // -------------------------------------------------------------------
  // 4. BILLING CYCLES EXACT-DAY BOUNDARY TESTS (30-day cycle zero-overlap)
  // -------------------------------------------------------------------
  const startDayOneIso = bsToAd(2083, 1, 1).toISOString().split('T')[0];
  const startDayOneCust = storage.saveMilkCustomer({
    name: 'FirstDay Customer',
    address: 'Kathmandu',
    mobile: '9800000002',
    startDate: startDayOneIso,
    startBsDate: '2083-01-01',
    startBsYear: 2083,
    startBsMonth: 1,
    startBsDay: 1,
    morningMilk: 1,
    eveningMilk: 0,
    milkRate: 80,
    status: 'active',
  });
  const dayOneCycles = [...storage.calculateCustomerBillingCycles(startDayOneCust)].reverse();
  const c1EndAd = new Date(new Date(startDayOneIso + 'T00:00:00Z').getTime() + 29 * 86400000);
  const c1DueAd = new Date(new Date(startDayOneIso + 'T00:00:00Z').getTime() + 30 * 86400000);
  const c1EndBs = adToBs(c1EndAd);
  const c1DueBs = adToBs(c1DueAd);
  const expectedToBs = `${c1EndBs.year}-${String(c1EndBs.month).padStart(2, '0')}-${String(c1EndBs.day).padStart(2, '0')}`;
  const expectedDueBs = `${c1DueBs.year}-${String(c1DueBs.month).padStart(2, '0')}-${String(c1DueBs.day).padStart(2, '0')}`;
  check(
    '4.1 Exact-day 30-day cycle ends on startDate + 29 days with zero overlap onto Cycle #2 (even in 31-day BS month)',
    dayOneCycles[0].fromBsDate === '2083-01-01' &&
      dayOneCycles[0].toBsDate === expectedToBs &&
      dayOneCycles[0].dueDateBS === expectedDueBs &&
      (dayOneCycles.length === 1 ||
        (dayOneCycles[0].totalDays === 30 && dayOneCycles[1].fromBsDate === expectedDueBs)),
    `Got from=${dayOneCycles[0]?.fromBsDate}, to=${dayOneCycles[0]?.toBsDate}, due=${dayOneCycles[0]?.dueDateBS}, totalDays=${dayOneCycles[0]?.totalDays}, c2From=${dayOneCycles[1]?.fromBsDate}`
  );

  // -------------------------------------------------------------------
  // 5. FIFO PAYMENT ALLOCATION (Master Prompt Example: 5400 + 5700 - 3000 = 8100)
  // -------------------------------------------------------------------
  const todayBS = adToBs(new Date());
  // Choose a start date 2 months before current BS month (always <= current BS year safely)
  let twoMonthsAgoYear = todayBS.year;
  let twoMonthsAgoMonth = todayBS.month - 2;
  if (twoMonthsAgoMonth <= 0) {
    twoMonthsAgoMonth += 12;
    twoMonthsAgoYear -= 1;
  }
  const fifoStartDay = Math.min(10, getBSDaysInMonth(twoMonthsAgoYear, twoMonthsAgoMonth));
  const fifoStartIso = bsToAd(twoMonthsAgoYear, twoMonthsAgoMonth, fifoStartDay).toISOString().split('T')[0];
  const fifoStartBS = `${twoMonthsAgoYear}-${String(twoMonthsAgoMonth).padStart(2, '0')}-${String(fifoStartDay).padStart(2, '0')}`;

  const fifoCust = storage.saveMilkCustomer({
    name: 'FIFO Test Customer',
    address: 'Patan',
    mobile: '9800000003',
    startDate: fifoStartIso,
    startBsDate: fifoStartBS,
    startBsYear: twoMonthsAgoYear,
    startBsMonth: twoMonthsAgoMonth,
    startBsDay: fifoStartDay,
    morningMilk: 2,
    eveningMilk: 1,
    milkRate: 100,
    status: 'active',
  });

  // Get first 2 cycles (chronological)
  const initialCycles = [...storage.calculateCustomerBillingCycles(fifoCust)].reverse();
  check('5.0 Customer has at least 2 billing cycles to test FIFO', initialCycles.length >= 2);

  if (initialCycles.length >= 2) {
    const cyc1 = initialCycles[0];
    const cyc2 = initialCycles[1];

    // Record exact Cycle 1 amount = 5400 and Cycle 2 amount = 5700 on their respective start dates
    storage.saveDailyMilkRecord({
      customerId: fifoCust.id,
      customerName: fifoCust.name,
      date: cyc1.fromIso,
      bsDate: cyc1.fromBsDate,
      bsYear: parseInt(cyc1.fromBsDate.split('-')[0], 10),
      bsMonth: parseInt(cyc1.fromBsDate.split('-')[1], 10),
      bsDay: parseInt(cyc1.fromBsDate.split('-')[2], 10),
      morningMilk: 54,
      eveningMilk: 0,
      totalMilk: 54,
      ratePerLtr: 100,
      totalAmount: 5400,
      isNoMilk: false,
    });

    storage.saveDailyMilkRecord({
      customerId: fifoCust.id,
      customerName: fifoCust.name,
      date: cyc2.fromIso,
      bsDate: cyc2.fromBsDate,
      bsYear: parseInt(cyc2.fromBsDate.split('-')[0], 10),
      bsMonth: parseInt(cyc2.fromBsDate.split('-')[1], 10),
      bsDay: parseInt(cyc2.fromBsDate.split('-')[2], 10),
      morningMilk: 57,
      eveningMilk: 0,
      totalMilk: 57,
      ratePerLtr: 100,
      totalAmount: 5700,
      isNoMilk: false,
    });

    // Pay Rs 3000 -> Cycle 1 paid 3000 (rem 2400), Cycle 2 prevPending 2400 + 5700 = 8100 (NO double deduction!)
    const payRes1 = storage.saveMilkPayment({
      customerId: fifoCust.id,
      customerName: fifoCust.name,
      date: cyc2.fromIso,
      bsDate: cyc2.fromBsDate,
      amount: 3000,
      paymentType: 'partial',
      paymentMethod: 'cash',
      remainingBalanceAfter: 8100,
    });

    const afterPay1Cycles = [...storage.calculateCustomerBillingCycles(fifoCust)].reverse();
    const c1After = afterPay1Cycles[0];
    const c2After = afterPay1Cycles[1];
    const unpaidDetail1 = storage.getUnpaidMonthsDetail(fifoCust);

    check(
      '5.1 FIFO exact arithmetic: 5400 + 5700 - 3000 = 8100 (no double deduction), unpaidMonths === 2',
      c1After.allocatedPaid === 3000 &&
        c1After.remainingBalance === 2400 &&
        c2After.previousPendingAmount === 2400 &&
        c2After.remainingBalance === 8100 &&
        unpaidDetail1.totalRemaining === 8100 &&
        unpaidDetail1.unpaidMonths === 2 &&
        unpaidDetail1.advanceCredit === 0,
      `Got c1.alloc=${c1After.allocatedPaid}, c2.rem=${c2After.remainingBalance}, totalRem=${unpaidDetail1.totalRemaining}, unpaidMonths=${unpaidDetail1.unpaidMonths}`
    );

    // Duplicate Payment Protection within 20 seconds
    const dupRes = storage.saveMilkPayment({
      customerId: fifoCust.id,
      customerName: fifoCust.name,
      date: cyc2.fromIso,
      bsDate: cyc2.fromBsDate,
      amount: 3000,
      paymentType: 'partial',
      paymentMethod: 'cash',
      remainingBalanceAfter: 5100,
    });
    check(
      '5.2 Duplicate payment protection flags identical amount within 20s',
      dupRes.duplicateDetected === true && dupRes.payment.id === payRes1.payment.id
    );

    // Advance Credit calculation: pay Rs 9000 on 8100 pending -> 900 advanceCredit, 0 remaining
    const payRes2 = storage.saveMilkPayment({
      customerId: fifoCust.id,
      customerName: fifoCust.name,
      date: shiftToday(0).iso,
      bsDate: shiftToday(0).bsStr,
      amount: 9000,
      paymentType: 'advance',
      paymentMethod: 'esewa',
      remainingBalanceAfter: 0,
      transactionRef: 'ESEWA-991',
    });

    const unpaidDetail2 = storage.getUnpaidMonthsDetail(fifoCust);
    check(
      '5.3 Advance payment clears all cycles and leaves exact Rs 900 advanceCredit',
      unpaidDetail2.totalRemaining === 0 &&
        unpaidDetail2.unpaidMonths === 0 &&
        unpaidDetail2.advanceCredit === 900,
      `Got totalRem=${unpaidDetail2.totalRemaining}, adv=${unpaidDetail2.advanceCredit}`
    );

    // Payment edit updates auditHistory & recalculates balance cleanly
    const updatedPay2 = storage.updateMilkPayment(payRes2.payment.id, 8100, 'bank', 'Corrected transfer');
    const unpaidDetail3 = storage.getUnpaidMonthsDetail(fifoCust);
    check(
      '5.4 Payment edit updates auditHistory and recalculates advanceCredit === 0',
      updatedPay2 !== null &&
        updatedPay2.auditHistory.length === 2 &&
        updatedPay2.amount === 8100 &&
        unpaidDetail3.totalRemaining === 0 &&
        unpaidDetail3.advanceCredit === 0
    );
  }

  // -------------------------------------------------------------------
  // 6. AUTOMATIC NOTIFICATION URGENCY ENGINE (3d, 2d, 1d, 0d, overdue)
  // -------------------------------------------------------------------
  // Under exact-day billing (CYCLE_DAYS = 30), Cycle #1 dueDateISO = startDate + 30 days.
  // So startDate = shiftToday(kDays - 30) guarantees dueDateISO === shiftToday(kDays).
  const makeDueInKDaysCustomer = (label: string, kDays: number) => {
    const startInfo = shiftToday(kDays - 30);
    const startIso = startInfo.iso;
    const startBS = startInfo.bsStr;
    const c = storage.saveMilkCustomer({
      name: label,
      address: 'Notif Ward',
      mobile: '9800000099',
      startDate: startIso,
      startBsDate: startBS,
      startBsYear: startInfo.bs.year,
      startBsMonth: startInfo.bs.month,
      startBsDay: startInfo.bs.day,
      morningMilk: 1,
      eveningMilk: 0,
      milkRate: 80,
      status: 'active',
    });
    storage.saveDailyMilkRecord({
      customerId: c.id,
      customerName: c.name,
      date: startIso,
      bsDate: startBS,
      bsYear: startInfo.bs.year,
      bsMonth: startInfo.bs.month,
      bsDay: startInfo.bs.day,
      morningMilk: 10,
      eveningMilk: 0,
      totalMilk: 10,
      ratePerLtr: 80,
      totalAmount: 800,
      isNoMilk: false,
    });
    return c;
  };

  makeDueInKDaysCustomer('Notif Overdue Customer', -3);
  makeDueInKDaysCustomer('Notif Today Customer', 0);
  makeDueInKDaysCustomer('Notif 1d Customer', 1);
  makeDueInKDaysCustomer('Notif 2d Customer', 2);
  makeDueInKDaysCustomer('Notif 3d Customer', 3);

  const notifs = storage.generateMilkNotifications();
  const hasOverdue = notifs.some((n) => n.type === 'overdue');
  const hasToday = notifs.some((n) => n.type === 'due_today');
  const has1d = notifs.some((n) => n.type === 'upcoming_due_1day');
  const has2d = notifs.some((n) => n.type === 'upcoming_due_2days');
  const has3d = notifs.some((n) => n.type === 'upcoming_due_3days');
  const isSortedMostUrgentFirst =
    notifs.length >= 2 &&
    notifs.every((n, idx) => idx === 0 || notifs[idx - 1].daysRemainingOrOverdue <= n.daysRemainingOrOverdue);

  check(
    '6.1 Notification engine fires Overdue, Due Today, 1-Day, 2-Day, 3-Day reminders sorted by urgency',
    hasOverdue && hasToday && has1d && has2d && has3d && isSortedMostUrgentFirst,
    `types=${notifs.map((n) => `${n.type}(${n.daysRemainingOrOverdue})`).join(',')}`
  );

  if (notifs.length > 0) {
    storage.dismissMilkNotification(notifs[0].id);
    const afterDismiss = storage.generateMilkNotifications().find((n) => n.id === notifs[0].id);
    check('6.2 Dismissing notification marks isDismissed===true', afterDismiss?.isDismissed === true);
  }

  // -------------------------------------------------------------------
  // 7. END BILL (FINAL BILL) GENERATION
  // -------------------------------------------------------------------
  const stopInfo = shiftToday(0);
  const finalBill = storage.generateFinalEndBill(ram, stopInfo.iso, stopInfo.bsStr, 'Completed settlement');
  const ramAfterFinal = storage.getStoredMilkCustomers().find((c) => c.id === ram.id);
  check(
    '7.1 generateFinalEndBill computes morning/evening breakdown, remaining balance & sets customer inactive',
    finalBill.totalMilkAmount === 80 &&
      finalBill.morningTotalMilk === 1 &&
      finalBill.eveningTotalMilk === 0 &&
      finalBill.finalRemainingBalance === 80 &&
      ramAfterFinal?.status === 'inactive'
  );

  // -------------------------------------------------------------------
  // 8. JSON BACKUP ROUNDTRIP & WHATSAPP FORMATTING
  // -------------------------------------------------------------------
  const backupJson = storage.exportMilkBackupJSON();
  const preBackupCount = storage.getStoredMilkCustomers().length;
  mockLocalStorage.clear();
  check('8.1 Cleared localStorage before restore', storage.getStoredMilkCustomers().length === 3); // defaults
  const restoreRes = storage.importMilkBackupJSON(backupJson);
  check(
    '8.2 importMilkBackupJSON restores exact pre-backup customers & final bills',
    restoreRes.success &&
      storage.getStoredMilkCustomers().length === preBackupCount &&
      storage.getStoredFinalBills(ram.id).length === 1
  );

  const waFinalText = storage.generateWhatsAppFinalBillText(ram, finalBill);
  check(
    '8.3 WhatsApp Final Bill formatter includes customer name, liters, and final remaining balance',
    waFinalText.includes(ram.name) && waFinalText.includes('FINAL END BILL')
  );

  // -------------------------------------------------------------------
  // 9. OPENING BALANCE, MISSING DAYS CATCH-UP & DEFAULT PENDING BALANCES
  // -------------------------------------------------------------------
  mockLocalStorage.clear();
  const defaultCusts = storage.getStoredMilkCustomers();
  const defaultDuesAllNonZero = defaultCusts.every(
    (c) => storage.getUnpaidMonthsDetail(c).totalRemaining > 0
  );
  check(
    '9.1 Default demo customers show real pending balances immediately (not zero/clear)',
    defaultCusts.length === 3 && defaultDuesAllNonZero,
    `dues=${defaultCusts.map((c) => storage.getUnpaidMonthsDetail(c).totalRemaining).join(',')}`
  );

  const fourDaysAgo = shiftToday(-4);
  const obCust = storage.saveMilkCustomer({
    name: 'Opening Balance Customer',
    address: 'Ward 5',
    mobile: '9800000077',
    startDate: fourDaysAgo.iso,
    startBsDate: fourDaysAgo.bsStr,
    startBsYear: fourDaysAgo.bs.year,
    startBsMonth: fourDaysAgo.bs.month,
    startBsDay: fourDaysAgo.bs.day,
    morningMilk: 2,
    eveningMilk: 0,
    milkRate: 100,
    openingBalance: 1500,
    status: 'active',
  });

  const missingSummary = storage.getMissingRegularMilkDaysSummary(obCust);
  check(
    '9.2 Missing regular days summary detects 5 days (start -> today inclusive) * Rs 200 = Rs 1000',
    missingSummary.missingDaysCount === 5 && missingSummary.estimatedAmount === 1000,
    `got days=${missingSummary.missingDaysCount}, est=${missingSummary.estimatedAmount}`
  );

  const addedDays = storage.autoFillMissingDailyEntriesForCycle(obCust, missingSummary.fromIso, missingSummary.toIso);
  const dueWithOb = storage.getUnpaidMonthsDetail(obCust);
  check(
    '9.3 Opening balance (1500) + auto-filled 5 days (1000) = 2500 pending',
    addedDays === 5 && dueWithOb.totalRemaining === 2500,
    `got added=${addedDays}, totalRem=${dueWithOb.totalRemaining}`
  );

  // -------------------------------------------------------------------
  // 10. CONSISTENT CLEANUP & AUDIT LOGGING INTEGRITY
  // -------------------------------------------------------------------
  const todayNM = shiftToday(0);
  const savedNm = storage.saveNoMilkDay({
    customerId: obCust.id,
    customerName: obCust.name,
    isoDate: todayNM.iso,
    bsDate: todayNM.bsStr,
    reason: 'Festival break',
  });
  storage.deleteNoMilkDay(savedNm.id);
  const stillHasNoMilkRec = storage
    .getStoredDailyMilkRecords(obCust.id)
    .some((r) => r.date === todayNM.iso && r.isNoMilk);
  check(
    '10.1 deleteNoMilkDay removes both no_milk_days entry and synced isNoMilk daily record',
    storage.getStoredNoMilkDays(obCust.id).length === 0 && !stillHasNoMilkRec
  );

  storage.saveRateHistory({
    customerId: obCust.id,
    rate: 110,
    morningRate: 110,
    eveningRate: 110,
    effectiveDateISO: todayNM.iso,
    effectiveDateBS: todayNM.bsStr,
  });
  const rateAudit = storage
    .getStoredAuditLogs(obCust.id)
    .find((l) => l.action === 'rate_change');
  check(
    '10.2 saveRateHistory populates customerName on rate_change audit log',
    rateAudit?.customerName === obCust.name
  );

  storage.saveMilkPayment({
    customerId: obCust.id,
    customerName: obCust.name,
    date: todayNM.iso,
    bsDate: todayNM.bsStr,
    amount: 500,
    paymentType: 'partial',
    paymentMethod: 'cash',
    remainingBalanceAfter: 2000,
  });
  storage.deleteMilkCustomer(obCust.id);
  check(
    '10.3 deleteMilkCustomer cleans up customer, records, payments, allocations, no-milk days, and rate history',
    storage.getStoredDailyMilkRecords(obCust.id).length === 0 &&
      storage.getStoredMilkPayments(obCust.id).length === 0 &&
      storage.getStoredPaymentAllocations(obCust.id).length === 0 &&
      storage.getStoredRateHistory(obCust.id).length === 0
  );

  // -------------------------------------------------------------------
  // 11. BILLING CYCLE SUM OF UNPAID BILLS, OVERDUE/PARTIAL & BOUNDARY RECORDS
  // -------------------------------------------------------------------
  mockLocalStorage.clear();
  localStorage.setItem('ghaule_milk_customers_v2_guest_local', '[]');
  localStorage.setItem('ghaule_milk_daily_records_v2_guest_local', '[]');
  localStorage.setItem('ghaule_milk_payments_v2_guest_local', '[]');

  // 11.1 Customer with openingBalance > 0 and 0 daily entries
  const obOnlyStart = shiftToday(-5);
  const obOnlyCust = storage.saveMilkCustomer({
    name: 'Opening Only Customer',
    address: 'Ward 1',
    mobile: '9800000081',
    startDate: obOnlyStart.iso,
    startBsDate: obOnlyStart.bsStr,
    startBsYear: obOnlyStart.bs.year,
    startBsMonth: obOnlyStart.bs.month,
    startBsDay: obOnlyStart.bs.day,
    morningMilk: 1,
    eveningMilk: 0,
    milkRate: 100,
    openingBalance: 1500,
    status: 'active',
  });
  const obOnlyDetail = storage.getUnpaidMonthsDetail(obOnlyCust);
  check(
    '11.1 Opening-balance-only customer reports unpaidPriorBalance=1500, unpaidBillsCount=1, status=due',
    obOnlyDetail.unpaidPriorBalance === 1500 &&
      obOnlyDetail.unpaidCycleBillsSum === 0 &&
      obOnlyDetail.totalRemaining === 1500 &&
      obOnlyDetail.unpaidBillsCount === 1 &&
      obOnlyDetail.status === 'due',
    `Got ${JSON.stringify(obOnlyDetail)}`
  );

  // Partial payment on opening balance -> status becomes 'partial'
  storage.saveMilkPayment({
    customerId: obOnlyCust.id,
    customerName: obOnlyCust.name,
    date: shiftToday(0).iso,
    bsDate: shiftToday(0).bsStr,
    amount: 500,
    paymentType: 'partial',
    paymentMethod: 'cash',
    remainingBalanceAfter: 1000,
  });
  const obPartialDetail = storage.getUnpaidMonthsDetail(obOnlyCust);
  check(
    '11.2 Partial payment on opening balance updates remainingBalance=1000 and status=partial',
    obPartialDetail.totalRemaining === 1000 &&
      obPartialDetail.unpaidPriorBalance === 1000 &&
      obPartialDetail.status === 'partial',
    `Got ${JSON.stringify(obPartialDetail)}`
  );

  // 11.3 Multi-cycle sum of unpaid bills & Overdue Cycle #1 + non-overdue Cycle #2
  let pastM = todayBS.month - 2;
  let pastY = todayBS.year;
  if (pastM <= 0) {
    pastM += 12;
    pastY -= 1;
  }
  const pastDay = Math.min(todayBS.day, getBSDaysInMonth(pastY, pastM));
  const multiStartIso = bsToAd(pastY, pastM, pastDay).toISOString().split('T')[0];
  const multiStartBS = `${pastY}-${String(pastM).padStart(2, '0')}-${String(pastDay).padStart(2, '0')}`;

  const multiCust = storage.saveMilkCustomer({
    name: 'Multi Cycle Unpaid Customer',
    address: 'Patan',
    mobile: '9800000082',
    startDate: multiStartIso,
    startBsDate: multiStartBS,
    startBsYear: pastY,
    startBsMonth: pastM,
    startBsDay: pastDay,
    morningMilk: 2,
    eveningMilk: 0,
    milkRate: 100,
    openingBalance: 400,
    status: 'active',
  });

  const multiCyclesInit = [...storage.calculateCustomerBillingCycles(multiCust)].reverse();
  const mc1 = multiCyclesInit[0];
  const mc2 = multiCyclesInit[1];
  // Add bills in Cycle #1 (Rs 2000), Cycle #2 (Rs 1500), plus a pre-start record (Rs 300), and a future record (+90 days) (Rs 700)
  const preStartRecInfo = {
    iso: new Date(new Date(multiStartIso + 'T00:00:00Z').getTime() - 5 * 86400000)
      .toISOString()
      .split('T')[0],
  };
  const preStartBSObj = adToBs(new Date(preStartRecInfo.iso + 'T00:00:00Z'));
  storage.saveDailyMilkRecord({
    customerId: multiCust.id,
    customerName: multiCust.name,
    date: preStartRecInfo.iso,
    bsDate: `${preStartBSObj.year}-${String(preStartBSObj.month).padStart(2, '0')}-${String(preStartBSObj.day).padStart(2, '0')}`,
    bsYear: preStartBSObj.year,
    bsMonth: preStartBSObj.month,
    bsDay: preStartBSObj.day,
    morningMilk: 3,
    eveningMilk: 0,
    totalMilk: 3,
    ratePerLtr: 100,
    totalAmount: 300,
    isNoMilk: false,
  });

  storage.saveDailyMilkRecord({
    customerId: multiCust.id,
    customerName: multiCust.name,
    date: mc1.fromIso,
    bsDate: mc1.fromBsDate,
    bsYear: parseInt(mc1.fromBsDate.split('-')[0], 10),
    bsMonth: parseInt(mc1.fromBsDate.split('-')[1], 10),
    bsDay: parseInt(mc1.fromBsDate.split('-')[2], 10),
    morningMilk: 20,
    eveningMilk: 0,
    totalMilk: 20,
    ratePerLtr: 100,
    totalAmount: 2000,
    isNoMilk: false,
  });

  storage.saveDailyMilkRecord({
    customerId: multiCust.id,
    customerName: multiCust.name,
    date: mc2.fromIso,
    bsDate: mc2.fromBsDate,
    bsYear: parseInt(mc2.fromBsDate.split('-')[0], 10),
    bsMonth: parseInt(mc2.fromBsDate.split('-')[1], 10),
    bsDay: parseInt(mc2.fromBsDate.split('-')[2], 10),
    morningMilk: 15,
    eveningMilk: 0,
    totalMilk: 15,
    ratePerLtr: 100,
    totalAmount: 1500,
    isNoMilk: false,
  });

  const futureRec = shiftToday(95);
  storage.saveDailyMilkRecord({
    customerId: multiCust.id,
    customerName: multiCust.name,
    date: futureRec.iso,
    bsDate: futureRec.bsStr,
    bsYear: futureRec.bs.year,
    bsMonth: futureRec.bs.month,
    bsDay: futureRec.bs.day,
    morningMilk: 7,
    eveningMilk: 0,
    totalMilk: 7,
    ratePerLtr: 100,
    totalAmount: 700,
    isNoMilk: false,
  });

  // Total billed = 400 (opening) + 300 (pre-start) + 2000 (c1) + 1500 (c2) + 700 (future) = 4900
  // Pay Rs 900 -> settles 400+300=700 prior + Rs 200 on Cycle #1, leaving Cycle #1 with Rs 1800 overdue unpaid, Cycle #2 Rs 1500 unpaid, Future Rs 700 unpaid -> Total = 4000
  storage.saveMilkPayment({
    customerId: multiCust.id,
    customerName: multiCust.name,
    date: shiftToday(0).iso,
    bsDate: shiftToday(0).bsStr,
    amount: 900,
    paymentType: 'partial',
    paymentMethod: 'cash',
    remainingBalanceAfter: 4000,
  });

  const multiDetail = storage.getUnpaidMonthsDetail(multiCust);
  const multiCyclesAfter = storage.calculateCustomerBillingCycles(multiCust);
  const cycleOwnUnpaidSum = multiCyclesAfter.reduce(
    (s, c) => s + Math.max(0, c.currentBillAmount - (c.allocatedPaid || 0)),
    0
  );

  check(
    '11.3 Sum of all unpaid milk bills (incl. pre-start & future cycles) === totalRemaining === 4000 & detects overdue Cycle #1',
    multiDetail.totalRemaining === 4000 &&
      multiDetail.unpaidCycleBillsSum === 4000 &&
      cycleOwnUnpaidSum === 4000 &&
      multiCyclesAfter[0].remainingBalance === 4000 &&
      multiDetail.unpaidMonths === 3 &&
      multiDetail.status === 'overdue',
    `Got detail=${JSON.stringify(multiDetail)}, cycleOwnUnpaidSum=${cycleOwnUnpaidSum}, latestRem=${multiCyclesAfter[0]?.remainingBalance}`
  );

  const pendingBreakdown = storage.calculatePendingBalance(multiCust);
  check(
    '11.4 calculatePendingBalance returns exact unpaidMonths list with billAmount, partialPaidApplied & remainingBalance=4000',
    pendingBreakdown.remainingBalance === 4000 &&
      pendingBreakdown.unpaidPriorBalance === 0 &&
      pendingBreakdown.priorPaymentApplied === 700 &&
      pendingBreakdown.unpaidMonths.length === 3 &&
      pendingBreakdown.unpaidMonths[0].billAmount === 2000 &&
      pendingBreakdown.unpaidMonths[0].partialPaidApplied === 200 &&
      pendingBreakdown.unpaidMonths[0].unpaidAmount === 1800 &&
      pendingBreakdown.unpaidCyclesTotalAmount === 4200 &&
      pendingBreakdown.unpaidCyclesPaidApplied === 200 &&
      pendingBreakdown.totalBilledAll === 4900 &&
      pendingBreakdown.totalPaymentsRecorded === 900,
    `Got breakdown=${JSON.stringify(pendingBreakdown)}`
  );

  // -------------------------------------------------------------------
  // 12. EXACT-DAY BILLING PERIOD & ACTUAL PENDING/OVERDUE DAYS COUNT
  // -------------------------------------------------------------------
  const exactStart = shiftToday(-36); // 37 exact inclusive days: -36 .. 0
  const exactCust = storage.saveMilkCustomer({
    name: 'Exact Days Customer',
    address: 'Ward 8',
    mobile: '9800000111',
    startDate: exactStart.iso,
    startBsDate: exactStart.bsStr,
    startBsYear: exactStart.bs.year,
    startBsMonth: exactStart.bs.month,
    startBsDay: exactStart.bs.day,
    morningMilk: 1,
    eveningMilk: 0,
    milkRate: 100,
    status: 'active',
  });
  for (let offset = -36; offset <= 0; offset++) {
    const dayInfo = shiftToday(offset);
    storage.saveDailyMilkRecord({
      customerId: exactCust.id,
      customerName: exactCust.name,
      date: dayInfo.iso,
      bsDate: dayInfo.bsStr,
      bsYear: dayInfo.bs.year,
      bsMonth: dayInfo.bs.month,
      bsDay: dayInfo.bs.day,
      morningMilk: 1,
      eveningMilk: 0,
      totalMilk: 1,
      ratePerLtr: 100,
      totalAmount: 100,
      isNoMilk: false,
    });
  }

  const exactBeforePay = storage.calculatePendingBalance(exactCust);
  check(
    '12.1 Exact billing days & unpaid days equal 37 exact days (not BS calendar months)',
    exactBeforePay.totalBillingDays === 37 &&
      exactBeforePay.pendingDays === 37 &&
      exactBeforePay.pendingSinceDays === 37 &&
      exactBeforePay.overdueDays === 6 &&
      exactBeforePay.remainingBalance === 3700,
    `Got billingDays=${exactBeforePay.totalBillingDays}, pendingDays=${exactBeforePay.pendingDays}, pendingSince=${exactBeforePay.pendingSinceDays}, overdueDays=${exactBeforePay.overdueDays}, rem=${exactBeforePay.remainingBalance}`
  );

  // Pay Rs 1000 (covers first 10 days) -> leaves 27 actual pending days (-26 .. 0)
  storage.saveMilkPayment({
    customerId: exactCust.id,
    customerName: exactCust.name,
    date: shiftToday(0).iso,
    bsDate: shiftToday(0).bsStr,
    amount: 1000,
    paymentType: 'partial',
    paymentMethod: 'cash',
    remainingBalanceAfter: 2700,
  });

  const exactAfterPay = storage.calculatePendingBalance(exactCust);
  check(
    '12.2 After 10 days partial payment, actual pendingDays === 27, pendingSinceDays === 27, overdueDays === 6',
    exactAfterPay.totalBillingDays === 37 &&
      exactAfterPay.pendingDays === 27 &&
      exactAfterPay.pendingSinceDays === 27 &&
      exactAfterPay.overdueDays === 6 &&
      exactAfterPay.remainingBalance === 2700,
    `Got billingDays=${exactAfterPay.totalBillingDays}, pendingDays=${exactAfterPay.pendingDays}, pendingSince=${exactAfterPay.pendingSinceDays}, overdueDays=${exactAfterPay.overdueDays}, rem=${exactAfterPay.remainingBalance}`
  );

  const { formatDurationMonthDays } = await import('../components/tools/DoodhCalculator');
  const durHi = formatDurationMonthDays(37, 'hi');
  const durNe = formatDurationMonthDays(37, 'ne');
  const durEn = formatDurationMonthDays(37, 'en');
  check(
    '12.3 formatDurationMonthDays returns actual days (37 दिन / ३७ दिन / 37 Days) instead of estimated months',
    durHi.text === '37 दिन' &&
      durHi.months === 0 &&
      durNe.text === '३७ दिन' &&
      durNe.months === 0 &&
      durEn.text === '37 Days' &&
      durEn.months === 0,
    `Got hi=${durHi.text}, ne=${durNe.text}, en=${durEn.text}`
  );

  console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
