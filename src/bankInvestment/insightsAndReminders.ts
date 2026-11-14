/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Calendar Aggregator, Smart Financial Insights, & Reminder Scheduler
 * - Merges Custom Calendar Events with scheduled Loan EMIs, SIP installments,
 *   Credit Card Bills, Insurance Premiums, Bank FD/RD Maturities, & Recurring Bills.
 * - STRICT PAYMENT RULE: Planned/auto-linked dues NEVER mark themselves as Paid
 *   unless explicitly confirmed by the user.
 * - Computes portfolio totals & deterministic offline insights strictly from real DB records.
 */

import { Language } from '../types';
import {
  buildLoanAmortizationSchedule,
  evaluateMutualFund,
  evaluateSipSummary,
  generateSipSchedule,
  round2,
} from './calculations';
import {
  adTag,
  bsStrToAdStr,
  bsTag,
  diffDaysAD,
  getTodayDual,
  parseBSDateStr,
  t5,
} from './i18n';
import {
  BankInvestmentDatabase,
  BankReminderAlert,
  CalendarDisplayEvent,
  SmartFinancialInsight,
} from './types';

export interface PortfolioMetricsSummary {
  totalInvested: number;
  currentInvestmentValue: number;
  totalProfitLoss: number;
  totalLoanOriginal: number;
  totalEmiPaid: number;
  remainingLoan: number;
  monthlyInvestmentCommitment: number;
  upcomingPaymentsTotal: number;
  totalBankAndCash: number;
  totalAssets: number;
  totalLiabilities: number;
  totalNetWorth: number;
}

/**
 * Computes real portfolio metrics strictly from saved DB records.
 */
export function computePortfolioSummary(
  db: BankInvestmentDatabase,
  referenceTodayAD?: string
): PortfolioMetricsSummary {
  const todayAD = referenceTodayAD || getTodayDual().adStr;

  // Loans
  let totalLoanOriginal = 0;
  let totalEmiPaid = 0;
  let remainingLoan = 0;

  for (const loan of db.loans) {
    totalLoanOriginal += loan.principalAmount;
    const sched = buildLoanAmortizationSchedule(loan, todayAD);
    totalEmiPaid += sched.totalEmiPaidAmount;
    remainingLoan += sched.remainingPrincipal;
  }

  // SIPs
  let sipInvested = 0;
  let sipCurrentVal = 0;
  let monthlySipCommitment = 0;
  for (const sip of db.sips) {
    const enriched = {
      ...sip,
      installments: generateSipSchedule(
        sip.startDateBS,
        sip.sipDay,
        sip.monthlyInvestment,
        sip.durationMonths,
        sip.stepUpPercent,
        sip.installments,
        todayAD,
        sip.status
      ),
    };
    const sum = evaluateSipSummary(enriched, todayAD);
    sipInvested += sum.actualInvestedAmount;
    sipCurrentVal += sum.displayCurrentValue;
    if (sip.status === 'active') {
      monthlySipCommitment += sip.monthlyInvestment;
    }
  }

  // Mutual Funds
  let mfInvested = 0;
  let mfCurrentVal = 0;
  for (const mf of db.mutualFunds) {
    const ev = evaluateMutualFund(mf, todayAD);
    mfInvested += ev.remainingCostBasis;
    mfCurrentVal += ev.currentMarketValue;
  }

  // Bank Accounts (Savings, Current, FD, RD)
  let totalBankAndCash = 0;
  for (const acc of db.bankAccounts) {
    const txs = db.bankTransactions.filter((t) => t.accountId === acc.id);
    const delta = txs.reduce((s, t) => {
      if (t.type === 'deposit' || t.type === 'interest_credit') return s + t.amount;
      if (t.type === 'withdrawal' || t.type === 'transfer') return s - t.amount;
      return s;
    }, 0);
    totalBankAndCash += Math.max(0, acc.openingBalance + delta);
  }

  // Credit Card Unpaid Debt
  const unpaidCardDebt = db.creditCardBills
    .filter((b) => !b.isPaid)
    .reduce((s, b) => s + Math.max(0, b.billAmount - b.paidAmount), 0);

  // Saved Goal Savings (if tracked separately or included)
  const totalGoalSaved = db.savingsGoals.reduce((s, g) => s + g.savedAmount, 0);

  // Upcoming 30-day unconfirmed/unpaid payments
  const alerts = collectUpcomingAlerts(db, todayAD, 30);
  const upcomingPaymentsTotal = alerts.reduce((s, a) => s + Math.max(0, a.amount), 0);

  const totalInvested = round2(sipInvested + mfInvested);
  const currentInvestmentValue = round2(sipCurrentVal + mfCurrentVal);
  const totalProfitLoss = round2(currentInvestmentValue - totalInvested);

  const totalAssets = round2(currentInvestmentValue + totalBankAndCash + totalGoalSaved);
  const totalLiabilities = round2(remainingLoan + unpaidCardDebt);
  const totalNetWorth = round2(totalAssets - totalLiabilities);

  return {
    totalInvested,
    currentInvestmentValue,
    totalProfitLoss,
    totalLoanOriginal: round2(totalLoanOriginal),
    totalEmiPaid: round2(totalEmiPaid),
    remainingLoan: round2(remainingLoan),
    monthlyInvestmentCommitment: round2(monthlySipCommitment),
    upcomingPaymentsTotal: round2(upcomingPaymentsTotal),
    totalBankAndCash: round2(totalBankAndCash),
    totalAssets,
    totalLiabilities,
    totalNetWorth,
  };
}

/**
 * Generates ALL Calendar Display Events (custom + auto-linked from Loans, SIPs, Cards, Insurance, FD/RD, Recurring)
 * Planned auto-linked dues are marked Paid ONLY if user explicitly confirmed them in their module.
 */
export function buildAllCalendarEvents(
  db: BankInvestmentDatabase,
  referenceTodayAD?: string,
  lang: Language = 'en'
): CalendarDisplayEvent[] {
  const todayAD = referenceTodayAD || getTodayDual().adStr;
  const list: CalendarDisplayEvent[] = [];
  const rs = lang === 'en' ? 'Rs.' : 'रु';

  // 1. User-created custom/manual calendar events
  for (const ev of db.calendarEvents) {
    list.push({
      ...ev,
      isAutoLinked: false,
      sourceLabel: t5(lang, 'Calendar Event', 'कैलेंडर कार्यक्रम', 'कैलेंडर घटना', 'कैलेंडर कार्यक्रम', 'पात्रो कार्यक्रम'),
    });
  }

  // 2. Loan EMIs
  for (const loan of db.loans) {
    if (loan.status === 'closed') continue;
    const sched = buildLoanAmortizationSchedule(loan, todayAD);
    for (const row of sched.rows) {
      const parsed = parseBSDateStr(row.dueDateBS);
      list.push({
        id: `auto_loan_${loan.id}_${row.installmentNo}`,
        title: `${loan.nickname || loan.bankName} — ${t5(lang, 'EMI', 'EMI', 'EMI किस्त', 'EMI', 'EMI')} #${row.installmentNo}`,
        type: 'loan_emi',
        bsYear: parsed.year,
        bsMonth: parsed.month,
        bsDay: parsed.day,
        bsDate: row.dueDateBS,
        adDate: row.dueDateAD,
        amount: row.emiAmount,
        notes: `${loan.bankName} | ${t5(lang, 'Rate', 'दर', 'ब्याज दर', 'दर', 'दर')} ${row.rateApplied}%`,
        reminderDaysBefore: 3,
        reminderEnabled: true,
        isPaid: row.status === 'paid',
        paidDateAD: row.paidDateAD,
        paidDateBS: row.paidDateBS,
        linkedSourceType: 'loan',
        linkedSourceId: loan.id,
        createdAt: loan.createdAt,
        updatedAt: loan.updatedAt,
        isAutoLinked: true,
        sourceLabel: `${loan.bankName} ${t5(lang, 'Loan', 'लोन', 'कर्जा', 'कर्जा', 'ऋण')}`,
      });
    }
  }

  // 3. SIP Installments
  for (const sip of db.sips) {
    if (sip.status === 'stopped') continue;
    const sched = generateSipSchedule(
      sip.startDateBS,
      sip.sipDay,
      sip.monthlyInvestment,
      sip.durationMonths,
      sip.stepUpPercent,
      sip.installments,
      todayAD,
      sip.status
    );
    for (const inst of sched) {
      const parsed = parseBSDateStr(inst.dueDateBS);
      list.push({
        id: `auto_sip_${sip.id}_${inst.installmentNo}`,
        title: `${sip.sipName} — SIP #${inst.installmentNo}`,
        type: 'sip_payment',
        bsYear: parsed.year,
        bsMonth: parsed.month,
        bsDay: parsed.day,
        bsDate: inst.dueDateBS,
        adDate: inst.dueDateAD,
        amount: inst.amount,
        notes: sip.fundName,
        reminderDaysBefore: 3,
        reminderEnabled: sip.status === 'active',
        isPaid: inst.status === 'paid' && inst.confirmedByUser,
        paidDateAD: inst.paidDateAD,
        paidDateBS: inst.paidDateBS,
        linkedSourceType: 'sip',
        linkedSourceId: sip.id,
        createdAt: sip.createdAt,
        updatedAt: sip.updatedAt,
        isAutoLinked: true,
        sourceLabel: t5(lang, 'SIP Plan', 'SIP योजना', 'SIP योजना', 'SIP योजना', 'SIP योजना'),
      });
    }
  }

  // 4. Credit Card Bills
  for (const bill of db.creditCardBills) {
    const card = db.creditCards.find((c) => c.id === bill.cardId);
    const parsed = parseBSDateStr(bill.dueDateBS);
    const ccFallback = t5(lang, 'Credit Card', 'क्रेडिट कार्ड', 'क्रेडिट कार्ड', 'क्रेडिट कार्ड', 'क्रेडिट कार्ड');
    list.push({
      id: `auto_ccbill_${bill.id}`,
      title: `${card?.cardName || ccFallback} ${t5(lang, 'Bill Due', 'बिल देय', 'बिल बाकी', 'बिल देय', 'बिल म्याद')}`,
      type: 'credit_card_bill',
      bsYear: parsed.year,
      bsMonth: parsed.month,
      bsDay: parsed.day,
      bsDate: bill.dueDateBS,
      adDate: bill.dueDateAD,
      amount: bill.billAmount,
      notes: bill.note || `${t5(lang, 'Min Due', 'न्यूनतम देय', 'कम से कम जमा', 'न्यूनतम देय', 'न्यूनतम तिर्नुपर्ने')}: ${rs} ${bill.minimumDue}`,
      reminderDaysBefore: 3,
      reminderEnabled: true,
      isPaid: bill.isPaid,
      paidDateAD: bill.paidDateAD,
      paidDateBS: bill.paidDateBS,
      linkedSourceType: 'credit_card',
      linkedSourceId: bill.id,
      createdAt: bill.createdAt,
      updatedAt: bill.createdAt,
      isAutoLinked: true,
      sourceLabel: card?.bankName || ccFallback,
    });
  }

  // 5. Insurance Premiums & Maturities
  for (const pol of db.insurancePolicies) {
    const parsed = parseBSDateStr(pol.nextDueDateBS);
    list.push({
      id: `auto_ins_${pol.id}_${pol.nextDueDateBS}`,
      title: `${pol.policyName} ${t5(lang, 'Premium', 'प्रीमियम', 'प्रीमियम', 'प्रीमियम', 'प्रिमियम')}`,
      type: 'insurance_premium',
      bsYear: parsed.year,
      bsMonth: parsed.month,
      bsDay: parsed.day,
      bsDate: pol.nextDueDateBS,
      adDate: pol.nextDueDateAD || bsStrToAdStr(pol.nextDueDateBS),
      amount: pol.premiumAmount,
      notes: `${pol.companyName} (${pol.frequency})`,
      reminderDaysBefore: 7,
      reminderEnabled: true,
      isPaid: false,
      linkedSourceType: 'insurance',
      linkedSourceId: pol.id,
      createdAt: pol.createdAt,
      updatedAt: pol.updatedAt,
      isAutoLinked: true,
      sourceLabel: pol.companyName,
    });
  }

  // 6. Bank FD / RD Maturities
  for (const acc of db.bankAccounts) {
    if ((acc.accountType === 'fd' || acc.accountType === 'rd') && acc.maturityDateBS) {
      const parsed = parseBSDateStr(acc.maturityDateBS);
      list.push({
        id: `auto_fd_${acc.id}`,
        title: `${acc.bankName} ${acc.accountType.toUpperCase()} ${t5(lang, 'Maturity', 'परिपक्वता', 'पूरा होखे के तारीख', 'परिपक्वता', 'परिपक्वता')}`,
        type: 'fd_maturity',
        bsYear: parsed.year,
        bsMonth: parsed.month,
        bsDay: parsed.day,
        bsDate: acc.maturityDateBS,
        adDate: acc.maturityDateAD || bsStrToAdStr(acc.maturityDateBS),
        amount: acc.maturityAmount || acc.openingBalance,
        notes: acc.accountNickname,
        reminderDaysBefore: 7,
        reminderEnabled: true,
        isPaid: false,
        linkedSourceType: 'bank_account',
        linkedSourceId: acc.id,
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt,
        isAutoLinked: true,
        sourceLabel: acc.bankName,
      });
    }
  }

  // 7. Recurring Payments
  for (const rec of db.recurringPayments) {
    if (!rec.isActive) continue;
    const parsed = parseBSDateStr(rec.nextDueDateBS);
    const recLabel = t5(lang, 'Recurring', 'नियमित', 'नियमित', 'नियमित', 'नियमित');
    list.push({
      id: `auto_rec_${rec.id}_${rec.nextDueDateBS}`,
      title: rec.title,
      type: rec.category,
      bsYear: parsed.year,
      bsMonth: parsed.month,
      bsDay: parsed.day,
      bsDate: rec.nextDueDateBS,
      adDate: rec.nextDueDateAD || bsStrToAdStr(rec.nextDueDateBS),
      amount: rec.amount,
      notes: `${recLabel} (${rec.frequency})`,
      reminderDaysBefore: 3,
      reminderEnabled: true,
      isPaid: false,
      linkedSourceType: 'recurring',
      linkedSourceId: rec.id,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
      isAutoLinked: true,
      sourceLabel: recLabel,
    });
  }

  return list.sort((a, b) => a.adDate.localeCompare(b.adDate));
}

/**
 * Evaluates upcoming and overdue reminders based on lead-time preferences.
 */
export function collectUpcomingAlerts(
  db: BankInvestmentDatabase,
  referenceTodayAD?: string,
  overrideMaxLeadDays?: number,
  lang: Language = 'en'
): BankReminderAlert[] {
  const todayAD = referenceTodayAD || getTodayDual().adStr;
  const prefs = db.reminderPrefs;
  const maxLead =
    overrideMaxLeadDays ??
    Math.max(0, ...(prefs.leadDaysOptions || [1, 3, 7]), prefs.customLeadDays || 0);

  const events = buildAllCalendarEvents(db, todayAD, lang);
  const alerts: BankReminderAlert[] = [];

  for (const ev of events) {
    if (ev.isPaid) continue;
    const days = diffDaysAD(todayAD, ev.adDate);
    // Include overdue within last 30 days and upcoming within maxLead (or event custom reminderDaysBefore)
    const windowDays = Math.max(maxLead, ev.reminderDaysBefore || 0);
    if (days >= -30 && days <= windowDays) {
      if (prefs.dismissedAlertKeys?.[ev.id] === todayAD) continue;
      alerts.push({
        id: ev.id,
        title: ev.title,
        category: ev.type,
        dueDateBS: ev.bsDate,
        dueDateAD: ev.adDate,
        daysRemaining: days,
        amount: ev.amount,
        sourceLabel:
          ev.sourceLabel ||
          t5(lang, 'Bank & Investment', 'बैंक और निवेश', 'बैंक आ निवेश', 'बैंक आ निवेश', 'बैंक र लगानी'),
        isOverdue: days < 0,
        eventRefId: ev.isAutoLinked ? undefined : ev.id,
        linkedSourceType: ev.linkedSourceType,
        linkedSourceId: ev.linkedSourceId,
      });
    }
  }

  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Fires Browser Notification or Android WorkManager Native Bridge when active alerts exist.
 */
export function dispatchBankReminders(
  alerts: BankReminderAlert[],
  db: BankInvestmentDatabase,
  lang: Language = 'en'
): number {
  if (!db.reminderPrefs.enabled || alerts.length === 0) return 0;

  let dispatched = 0;
  const topAlerts = alerts.slice(0, 3);
  const rs = lang === 'en' ? 'Rs.' : 'रु';

  // 1. Native Android APK Bridge (WorkManager / NotificationManager hook)
  const w = typeof window !== 'undefined' ? (window as any) : null;
  if (db.reminderPrefs.enableAndroidBridge && w?.AndroidNotifications?.scheduleReminder) {
    for (const a of alerts) {
      try {
        w.AndroidNotifications.scheduleReminder(
          JSON.stringify({
            id: a.id,
            title: a.title,
            dueDateBS: a.dueDateBS,
            dueDateAD: a.dueDateAD,
            amount: a.amount,
            daysRemaining: a.daysRemaining,
          })
        );
        dispatched++;
      } catch {}
    }
  }

  // 2. Browser Notifications API
  if (
    db.reminderPrefs.enableBrowserNotifications &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    for (const a of topAlerts) {
      try {
        const absD = Math.abs(a.daysRemaining);
        const prefix = a.isOverdue
          ? t5(
              lang,
              `Overdue (${absD}d)`,
              `बाकी (${absD} दिन पहले)`,
              `बाकी (${absD} दिन पहिले)`,
              `बाकी (${absD} दिन पहिने)`,
              `म्याद नाघेको (${absD} दिन)`
            )
          : a.daysRemaining === 0
          ? t5(lang, 'Due Today', 'आज देय है', 'आज जमा करे के बा', 'आइ देय अछि', 'आज म्याद छ')
          : t5(
              lang,
              `Due in ${a.daysRemaining}d`,
              `${a.daysRemaining} दिन में देय`,
              `${a.daysRemaining} दिन में जमा करीं`,
              `${a.daysRemaining} दिन मे देय`,
              `${a.daysRemaining} दिनमा म्याद`
            );
        const brandTitle = t5(
          lang,
          'Ghaule Bank',
          'गौले बैंक',
          'गौले बैंक',
          'गौले बैंक',
          'गाउँले बैंक'
        );
        new Notification(`${brandTitle}: ${a.title}`, {
          body: `${prefix} • ${a.dueDateBS} ${bsTag(lang)} • ${rs} ${a.amount.toLocaleString('en-IN')}`,
          icon: '/pwa-192x192.png',
        });
        dispatched++;
      } catch {}
    }
  }

  return dispatched;
}

/**
 * Deterministic Smart Financial Insights generated strictly from real stored records.
 * Never invents numbers or returns fake advice.
 */
export function generateSmartFinancialInsights(
  db: BankInvestmentDatabase,
  referenceTodayAD?: string,
  lang: Language = 'en'
): SmartFinancialInsight[] {
  const todayAD = referenceTodayAD || getTodayDual().adStr;
  const insights: SmartFinancialInsight[] = [];
  const summary = computePortfolioSummary(db, todayAD);
  const rs = lang === 'en' ? 'Rs.' : 'रु';
  const bsL = bsTag(lang);
  const adL = adTag(lang);

  // 1. Loan EMI upcoming / principal reduction
  for (const loan of db.loans) {
    if (loan.status === 'closed') continue;
    const sched = buildLoanAmortizationSchedule(loan, todayAD);
    const nextDue = sched.rows.find((r) => r.status !== 'paid');
    const loanName = loan.nickname || loan.bankName;
    if (nextDue) {
      const days = diffDaysAD(todayAD, nextDue.dueDateAD);
      if (days <= 7) {
        insights.push({
          id: `ins_emi_${loan.id}`,
          severity: days < 0 ? 'alert' : 'warning',
          title:
            days < 0
              ? t5(
                  lang,
                  `Overdue EMI for ${loanName}`,
                  `${loanName} की EMI बकाया है`,
                  `${loanName} के EMI किस्त बाकी बा`,
                  `${loanName} क EMI बकाया अछि`,
                  `${loanName} को EMI म्याद नाघेको छ`
                )
              : t5(
                  lang,
                  `Next EMI for ${loanName} due in ${days} day${days === 1 ? '' : 's'}`,
                  `${loanName} की अगली EMI ${days} दिन में देय है`,
                  `${loanName} के अगिला EMI ${days} दिन में जमा करे के बा`,
                  `${loanName} क अगिला EMI ${days} दिन मे देय अछि`,
                  `${loanName} को अर्को EMI ${days} दिनमा बुझाउनुपर्नेछ`
                ),
          detail: t5(
            lang,
            `Due on ${nextDue.dueDateBS} ${bsL} (${nextDue.dueDateAD} ${adL}) at ${nextDue.rateApplied}% p.a.`,
            `देय तिथि: ${nextDue.dueDateBS} ${bsL} (${nextDue.dueDateAD} ${adL}) • दर ${nextDue.rateApplied}% वार्षिक`,
            `तारीख: ${nextDue.dueDateBS} ${bsL} (${nextDue.dueDateAD} ${adL}) • ब्याज दर ${nextDue.rateApplied}% सालाना`,
            `तिथि: ${nextDue.dueDateBS} ${bsL} (${nextDue.dueDateAD} ${adL}) • दर ${nextDue.rateApplied}% वार्षिक`,
            `म्याद: ${nextDue.dueDateBS} ${bsL} (${nextDue.dueDateAD} ${adL}) • दर ${nextDue.rateApplied}% वार्षिक`
          ),
          metric: `${rs} ${nextDue.emiAmount.toLocaleString('en-IN')}`,
        });
      }
    }

    const reduced = round2(loan.principalAmount - sched.remainingPrincipal);
    if (reduced > 0 && loan.principalAmount > 0) {
      const pct = round2((reduced / loan.principalAmount) * 100);
      insights.push({
        id: `ins_loan_prog_${loan.id}`,
        severity: 'success',
        title: t5(
          lang,
          `${loanName} principal reduced by ${pct}%`,
          `${loanName} का मूलधन ${pct}% कम हुआ`,
          `${loanName} के मूलधन ${pct}% कम भइल`,
          `${loanName} क मूलधन ${pct}% कम भेल`,
          `${loanName} को साँवा ${pct}% घट्यो`
        ),
        detail: t5(
          lang,
          `Paid ${rs} ${reduced.toLocaleString('en-IN')} of ${rs} ${loan.principalAmount.toLocaleString('en-IN')}. ${sched.pendingEmiCount} EMIs pending.`,
          `${rs} ${loan.principalAmount.toLocaleString('en-IN')} में से ${rs} ${reduced.toLocaleString('en-IN')} भुगतान हो गया। ${sched.pendingEmiCount} EMI शेष।`,
          `${rs} ${loan.principalAmount.toLocaleString('en-IN')} में से ${rs} ${reduced.toLocaleString('en-IN')} जमा हो गइल। ${sched.pendingEmiCount} किस्त बाकी बा।`,
          `${rs} ${loan.principalAmount.toLocaleString('en-IN')} मे सँ ${rs} ${reduced.toLocaleString('en-IN')} भुगतान भऽ गेल। ${sched.pendingEmiCount} EMI शेष।`,
          `${rs} ${loan.principalAmount.toLocaleString('en-IN')} मध्ये ${rs} ${reduced.toLocaleString('en-IN')} भुक्तानी भयो। ${sched.pendingEmiCount} EMI बाँकी।`
        ),
        metric: `${t5(lang, 'Rem', 'शेष', 'बाकी', 'शेष', 'बाँकी')}: ${rs} ${sched.remainingPrincipal.toLocaleString('en-IN')}`,
      });
    }
  }

  // 2. SIP pending/missed installments
  for (const sip of db.sips) {
    if (sip.status !== 'active') continue;
    const sched = generateSipSchedule(
      sip.startDateBS,
      sip.sipDay,
      sip.monthlyInvestment,
      sip.durationMonths,
      sip.stepUpPercent,
      sip.installments,
      todayAD,
      sip.status
    );
    const missed = sched.filter((i) => i.status === 'missed');
    if (missed.length > 0) {
      insights.push({
        id: `ins_sip_missed_${sip.id}`,
        severity: 'warning',
        title: t5(
          lang,
          `${missed.length} SIP installment${missed.length > 1 ? 's' : ''} awaiting confirmation for ${sip.sipName}`,
          `${sip.sipName} की ${missed.length} SIP किस्तें पुष्टि की प्रतीक्षा में हैं`,
          `${sip.sipName} के ${missed.length} गो SIP किस्त पुष्टि खातिर बाकी बा`,
          `${sip.sipName} क ${missed.length} SIP किस्त पुष्टिक प्रतीक्षा मे अछि`,
          `${sip.sipName} को ${missed.length} SIP किस्ता पुष्टि गर्न बाँकी छ`
        ),
        detail: t5(
          lang,
          `Earliest unconfirmed date: ${missed[0].dueDateBS} ${bsL}. Confirm if paid or pause SIP.`,
          `पहली अपुष्ट तिथि: ${missed[0].dueDateBS} ${bsL}। भुगतान होने पर पुष्टि करें या SIP रोकें।`,
          `पहिलका बकाया तारीख: ${missed[0].dueDateBS} ${bsL}। जमा भइल होखे त पक्का करीं या SIP रोकीं।`,
          `पहिल अपुष्ट तिथि: ${missed[0].dueDateBS} ${bsL}। भुगतान भेल अछि त पुष्टि करू वा SIP रोकू।`,
          `सुरुको अपुष्ट मिति: ${missed[0].dueDateBS} ${bsL}। तिरेको भए पुष्टि गर्नुहोस् वा SIP रोक्नुहोस्।`
        ),
        metric: `${rs} ${missed[0].amount.toLocaleString('en-IN')}/${t5(lang, 'mo', 'माह', 'महिना', 'मास', 'महिना')}`,
      });
    }
  }

  // 3. Bank FD/RD approaching maturity (<= 30 days)
  for (const acc of db.bankAccounts) {
    if ((acc.accountType === 'fd' || acc.accountType === 'rd') && acc.maturityDateAD) {
      const days = diffDaysAD(todayAD, acc.maturityDateAD);
      if (days >= 0 && days <= 30) {
        insights.push({
          id: `ins_fd_${acc.id}`,
          severity: 'info',
          title: t5(
            lang,
            `${acc.bankName} ${acc.accountType.toUpperCase()} matures in ${days} days`,
            `${acc.bankName} ${acc.accountType.toUpperCase()} ${days} दिनों में परिपक्व होगा`,
            `${acc.bankName} ${acc.accountType.toUpperCase()} ${days} दिन में पूरा हो जाई`,
            `${acc.bankName} ${acc.accountType.toUpperCase()} ${days} दिन मे परिपक्व हेत`,
            `${acc.bankName} ${acc.accountType.toUpperCase()} ${days} दिनमा परिपक्व हुन्छ`
          ),
          detail: t5(
            lang,
            `Maturity date: ${acc.maturityDateBS} ${bsL} (${acc.maturityDateAD} ${adL}).`,
            `परिपक्वता तिथि: ${acc.maturityDateBS} ${bsL} (${acc.maturityDateAD} ${adL})।`,
            `पूरा होखे के तारीख: ${acc.maturityDateBS} ${bsL} (${acc.maturityDateAD} ${adL})।`,
            `परिपक्वता तिथि: ${acc.maturityDateBS} ${bsL} (${acc.maturityDateAD} ${adL})।`,
            `परिपक्वता मिति: ${acc.maturityDateBS} ${bsL} (${acc.maturityDateAD} ${adL})।`
          ),
          metric: `${rs} ${(acc.maturityAmount || acc.openingBalance).toLocaleString('en-IN')}`,
        });
      }
    }
  }

  // 4. Credit Card unpaid bill warning
  for (const bill of db.creditCardBills) {
    if (bill.isPaid) continue;
    const days = diffDaysAD(todayAD, bill.dueDateAD);
    if (days <= 10) {
      const card = db.creditCards.find((c) => c.id === bill.cardId);
      const cName = card?.cardName || t5(lang, 'Card', 'कार्ड', 'कार्ड', 'कार्ड', 'कार्ड');
      insights.push({
        id: `ins_cc_${bill.id}`,
        severity: days < 0 ? 'alert' : 'warning',
        title:
          days < 0
            ? t5(
                lang,
                `Credit card bill (${cName}) due ${Math.abs(days)}d ago`,
                `क्रेडिट कार्ड बिल (${cName}) ${Math.abs(days)} दिन पहले से बकाया`,
                `क्रेडिट कार्ड बिल (${cName}) ${Math.abs(days)} दिन पहिले से बाकी बा`,
                `क्रेडिट कार्ड बिल (${cName}) ${Math.abs(days)} दिन पहिने सँ बकाया`,
                `क्रेडिट कार्ड बिल (${cName}) ${Math.abs(days)} दिनअघि नै म्याद नाघ्यो`
              )
            : t5(
                lang,
                `Credit card bill (${cName}) due in ${days}d`,
                `क्रेडिट कार्ड बिल (${cName}) ${days} दिन में देय`,
                `क्रेडिट कार्ड बिल (${cName}) ${days} दिन में जमा करे के बा`,
                `क्रेडिट कार्ड बिल (${cName}) ${days} दिन मे देय`,
                `क्रेडिट कार्ड बिल (${cName}) ${days} दिनमा तिर्नुपर्ने`
              ),
        detail: t5(
          lang,
          `Due ${bill.dueDateBS} ${bsL}. Pay full amount to avoid high revolving APR.`,
          `देय तिथि ${bill.dueDateBS} ${bsL}। भारी ब्याज से बचने के लिए पूरा भुगतान करें।`,
          `तारीख ${bill.dueDateBS} ${bsL}। बेसी ब्याज से बचे खातिर पूरा बिल जमा करीं।`,
          `देय तिथि ${bill.dueDateBS} ${bsL}। बेसी ब्याज सँ बचबा लेल पूरा भुगतान करू।`,
          `म्याद ${bill.dueDateBS} ${bsL}। उच्च ब्याजबाट बच्न पूरा रकम तिर्नुहोस्।`
        ),
        metric: `${rs} ${(bill.billAmount - bill.paidAmount).toLocaleString('en-IN')}`,
      });
    }
  }

  // 5. Portfolio overall P/L insight (only when invested > 0)
  if (summary.totalInvested > 0) {
    const pct = round2((summary.totalProfitLoss / summary.totalInvested) * 100);
    const sign = summary.totalProfitLoss >= 0 ? '+' : '';
    insights.push({
      id: 'ins_portfolio_pl',
      severity: summary.totalProfitLoss >= 0 ? 'success' : 'warning',
      title: t5(
        lang,
        `Recorded investment P/L is ${sign}${pct}%`,
        `दर्ज निवेश पर लाभ/हानि ${sign}${pct}% है`,
        `दर्ज निवेश पर फायदा/घाटा ${sign}${pct}% बा`,
        `दर्ज निवेश पर लाभ/हानि ${sign}${pct}% अछि`,
        `अभिलेखित लगानी नाफा/नोक्सान ${sign}${pct}% छ`
      ),
      detail: t5(
        lang,
        `Invested ${rs} ${summary.totalInvested.toLocaleString('en-IN')} across tracked SIP & Mutual Funds.`,
        `ट्रैक किए गए SIP और म्यूचुअल फंड में ${rs} ${summary.totalInvested.toLocaleString('en-IN')} निवेश।`,
        `SIP आ म्यूचुअल फंड में कुल ${rs} ${summary.totalInvested.toLocaleString('en-IN')} लागल बा।`,
        `ट्रैक कएल SIP आ म्यूचुअल फण्ड मे ${rs} ${summary.totalInvested.toLocaleString('en-IN')} निवेश।`,
        `ट्र्याक गरिएको SIP र म्युचुअल फण्डमा ${rs} ${summary.totalInvested.toLocaleString('en-IN')} लगानी।`
      ),
      metric: `${sign}${rs} ${summary.totalProfitLoss.toLocaleString('en-IN')}`,
    });
  }

  // 6. Monthly Expense Comparison (current BS month vs previous BS month from actual entries)
  const todayBS = parseBSDateStr(getTodayDual().bsStr);
  const curMonthPrefix = `${todayBS.year}-${String(todayBS.month).padStart(2, '0')}`;
  const prevYear = todayBS.month === 1 ? todayBS.year - 1 : todayBS.year;
  const prevMonth = todayBS.month === 1 ? 12 : todayBS.month - 1;
  const prevMonthPrefix = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  const curExpenses = db.incomeExpenses
    .filter((e) => e.entryType === 'expense' && e.dateBS.startsWith(curMonthPrefix))
    .reduce((s, e) => s + e.amount, 0);
  const prevExpenses = db.incomeExpenses
    .filter((e) => e.entryType === 'expense' && e.dateBS.startsWith(prevMonthPrefix))
    .reduce((s, e) => s + e.amount, 0);

  if (curExpenses > 0 && prevExpenses > 0) {
    const diffPct = round2(((curExpenses - prevExpenses) / prevExpenses) * 100);
    insights.push({
      id: 'ins_exp_mom',
      severity: diffPct > 15 ? 'warning' : 'info',
      title:
        diffPct >= 0
          ? t5(
              lang,
              `Monthly expenses are up ${diffPct}% vs last BS month`,
              `पिछले माह की तुलना में मासिक खर्च ${diffPct}% बढ़ा है`,
              `पिछला महीना से ई महीना के खर्च ${diffPct}% बढ़ल बा`,
              `पिछला मास सँ मासिक खर्च ${diffPct}% बढ़ल अछि`,
              `अघिल्लो महिनाभन्दा मासिक खर्च ${diffPct}% बढेको छ`
            )
          : t5(
              lang,
              `Monthly expenses are down ${Math.abs(diffPct)}% vs last BS month`,
              `पिछले माह की तुलना में मासिक खर्च ${Math.abs(diffPct)}% कम है`,
              `पिछला महीना से ई महीना के खर्च ${Math.abs(diffPct)}% कम बा`,
              `पिछला मास सँ मासिक खर्च ${Math.abs(diffPct)}% कम अछि`,
              `अघिल्लो महिनाभन्दा मासिक खर्च ${Math.abs(diffPct)}% घटेको छ`
            ),
      detail: t5(
        lang,
        `This month: ${rs} ${curExpenses.toLocaleString('en-IN')} vs previous month: ${rs} ${prevExpenses.toLocaleString('en-IN')}.`,
        `इस माह: ${rs} ${curExpenses.toLocaleString('en-IN')} बनाम पिछला माह: ${rs} ${prevExpenses.toLocaleString('en-IN')}।`,
        `ई महीना: ${rs} ${curExpenses.toLocaleString('en-IN')} आ पिछला महीना: ${rs} ${prevExpenses.toLocaleString('en-IN')}।`,
        `ई मास: ${rs} ${curExpenses.toLocaleString('en-IN')} बनाम पिछला मास: ${rs} ${prevExpenses.toLocaleString('en-IN')}।`,
        `यो महिना: ${rs} ${curExpenses.toLocaleString('en-IN')} र अघिल्लो महिना: ${rs} ${prevExpenses.toLocaleString('en-IN')}।`
      ),
      metric: `${rs} ${curExpenses.toLocaleString('en-IN')}`,
    });
  }

  return insights;
}
