/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Offline-First Account-Isolated Database & Encrypted Backup Engine
 * for Bank & Investment Management System
 *
 * Features:
 * - Schema versioning & deterministic migrations (v1 -> v2)
 * - Account-isolated storage prefix via authManager.getActiveStoragePrefix()
 * - Works 100% offline with NO compulsory login
 * - Duplicate prevention for EMI payments, SIP installments, bills, & transactions
 * - Passphrase-encrypted AES-GCM (256-bit) + PBKDF2-SHA256 export & restore
 */

import { authManager } from '../utils/authManager';
import {
  BankAccountRecord,
  BankCalendarEvent,
  BankInvestmentDatabase,
  BankLedgerTransaction,
  BankLoanRecord,
  BankReminderPreferences,
  BudgetCategoryRecord,
  CreditCardBillRecord,
  CreditCardRecord,
  EncryptedBackupEnvelope,
  IncomeExpenseRecord,
  InsurancePolicyRecord,
  LoanInstallmentPayment,
  MutualFundRecord,
  RecurringPaymentRecord,
  SavedCalculatorRecord,
  SavingsGoalRecord,
  SipPlanRecord,
} from './types';
import { getTodayDual } from './i18n';

export const CURRENT_SCHEMA_VERSION = 2;
const DB_SUFFIX = 'bank_investment_db_v2';
const LEGACY_V1_SUFFIX = 'bank_investment_db_v1';

const memoryFallbackStore = new Map<string, string>();
const listeners = new Set<() => void>();

function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {}
  return memoryFallbackStore.get(key) ?? null;
}

function safeSetItem(key: string, val: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
      return;
    }
  } catch {}
  memoryFallbackStore.set(key, val);
}

export function getActiveBankDbKey(): string {
  try {
    return `${authManager.getActiveStoragePrefix()}${DB_SUFFIX}`;
  } catch {
    return `ghaule_default_${DB_SUFFIX}`;
  }
}

export function createEmptyBankDatabase(): BankInvestmentDatabase {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: Date.now(),
    savedCalculations: [],
    loans: [],
    sips: [],
    mutualFunds: [],
    calendarEvents: [],
    creditCards: [],
    creditCardBills: [],
    insurancePolicies: [],
    bankAccounts: [],
    bankTransactions: [],
    budgetCategories: [],
    incomeExpenses: [],
    savingsGoals: [],
    recurringPayments: [],
    reminderPrefs: {
      enabled: true,
      leadDaysOptions: [1, 3, 7],
      customLeadDays: 0,
      notifyTime: '08:00',
      enableBrowserNotifications: true,
      enableAndroidBridge: true,
      dismissedAlertKeys: {},
    },
    processedDedupeKeys: [],
  };
}

/**
 * Deterministic Schema Migration Runner (v1 -> v2+)
 */
export function migrateBankDatabase(raw: any): BankInvestmentDatabase {
  const empty = createEmptyBankDatabase();
  if (!raw || typeof raw !== 'object') return empty;

  const db: BankInvestmentDatabase = {
    ...empty,
    ...raw,
    savedCalculations: Array.isArray(raw.savedCalculations) ? raw.savedCalculations : [],
    loans: Array.isArray(raw.loans) ? raw.loans : [],
    sips: Array.isArray(raw.sips) ? raw.sips : [],
    mutualFunds: Array.isArray(raw.mutualFunds) ? raw.mutualFunds : [],
    calendarEvents: Array.isArray(raw.calendarEvents) ? raw.calendarEvents : [],
    creditCards: Array.isArray(raw.creditCards) ? raw.creditCards : [],
    creditCardBills: Array.isArray(raw.creditCardBills) ? raw.creditCardBills : [],
    insurancePolicies: Array.isArray(raw.insurancePolicies) ? raw.insurancePolicies : [],
    bankAccounts: Array.isArray(raw.bankAccounts) ? raw.bankAccounts : [],
    bankTransactions: Array.isArray(raw.bankTransactions) ? raw.bankTransactions : [],
    budgetCategories: Array.isArray(raw.budgetCategories) ? raw.budgetCategories : [],
    incomeExpenses: Array.isArray(raw.incomeExpenses) ? raw.incomeExpenses : [],
    savingsGoals: Array.isArray(raw.savingsGoals) ? raw.savingsGoals : [],
    recurringPayments: Array.isArray(raw.recurringPayments) ? raw.recurringPayments : [],
    reminderPrefs: {
      ...empty.reminderPrefs,
      ...(raw.reminderPrefs && typeof raw.reminderPrefs === 'object' ? raw.reminderPrefs : {}),
      leadDaysOptions: Array.isArray(raw.reminderPrefs?.leadDaysOptions)
        ? raw.reminderPrefs.leadDaysOptions
        : empty.reminderPrefs.leadDaysOptions,
      dismissedAlertKeys:
        raw.reminderPrefs?.dismissedAlertKeys && typeof raw.reminderPrefs.dismissedAlertKeys === 'object'
          ? raw.reminderPrefs.dismissedAlertKeys
          : {},
    },
    processedDedupeKeys: Array.isArray(raw.processedDedupeKeys) ? raw.processedDedupeKeys : [],
  };

  // V1 -> V2 Migration: ensure loan rateChanges, MF additions/redemptions/dividends & explicit confirmation flags
  if (!raw.schemaVersion || raw.schemaVersion < 2) {
    db.loans = db.loans.map((l: any) => ({
      ...l,
      paymentFrequency: l.paymentFrequency || 'monthly',
      rateChanges: Array.isArray(l.rateChanges) ? l.rateChanges : [],
      payments: Array.isArray(l.payments)
        ? l.payments.map((p: any) => ({ ...p, confirmedByUser: true }))
        : [],
      plannedExtraPayment: Number(l.plannedExtraPayment || 0),
    }));
    db.mutualFunds = db.mutualFunds.map((mf: any) => ({
      ...mf,
      navSource: mf.navSource || 'manual',
      additions: Array.isArray(mf.additions) ? mf.additions : [],
      redemptions: Array.isArray(mf.redemptions) ? mf.redemptions : [],
      dividends: Array.isArray(mf.dividends) ? mf.dividends : [],
    }));
    db.calendarEvents = db.calendarEvents.map((ev: any) => ({
      ...ev,
      isPaid: Boolean(ev.isPaid),
    }));
    db.schemaVersion = CURRENT_SCHEMA_VERSION;
  }

  return db;
}

export function loadBankDb(): BankInvestmentDatabase {
  const key = getActiveBankDbKey();
  let rawStr = safeGetItem(key);

  // Check if v1 legacy key exists for active prefix and migrate cleanly
  if (!rawStr) {
    let prefix = 'ghaule_default_';
    try {
      prefix = authManager.getActiveStoragePrefix();
    } catch {}
    const v1Str = safeGetItem(`${prefix}${LEGACY_V1_SUFFIX}`);
    if (v1Str) {
      rawStr = v1Str;
    }
  }

  if (!rawStr) {
    return createEmptyBankDatabase();
  }

  try {
    const parsed = JSON.parse(rawStr);
    const migrated = migrateBankDatabase(parsed);
    if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      safeSetItem(key, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return createEmptyBankDatabase();
  }
}

export function saveBankDb(db: BankInvestmentDatabase): BankInvestmentDatabase {
  const next: BankInvestmentDatabase = {
    ...db,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: Date.now(),
  };
  safeSetItem(getActiveBankDbKey(), JSON.stringify(next));
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
  return next;
}

export function subscribeBankDb(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ===========================================================================
// CRUD OPERATIONS WITH DEDUPLICATION GUARDS
// ===========================================================================

export const bankDb = {
  getAll(): BankInvestmentDatabase {
    return loadBankDb();
  },

  resetAll(): void {
    saveBankDb(createEmptyBankDatabase());
  },

  // --- Saved Calculator History ---
  saveCalculation(record: Omit<SavedCalculatorRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): SavedCalculatorRecord {
    const db = loadBankDb();
    const now = Date.now();
    if (record.id) {
      const idx = db.savedCalculations.findIndex((c) => c.id === record.id);
      if (idx >= 0) {
        const updated: SavedCalculatorRecord = {
          ...db.savedCalculations[idx],
          ...record,
          id: record.id,
          updatedAt: now,
        };
        db.savedCalculations[idx] = updated;
        saveBankDb(db);
        return updated;
      }
    }
    const created: SavedCalculatorRecord = {
      ...record,
      id: record.id || makeId('calc'),
      createdAt: now,
      updatedAt: now,
    };
    db.savedCalculations.unshift(created);
    saveBankDb(db);
    return created;
  },

  deleteCalculation(id: string): void {
    const db = loadBankDb();
    db.savedCalculations = db.savedCalculations.filter((c) => c.id !== id);
    saveBankDb(db);
  },

  // --- Loans ---
  upsertLoan(loan: Omit<BankLoanRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): BankLoanRecord {
    const db = loadBankDb();
    const now = Date.now();
    if (loan.id) {
      const idx = db.loans.findIndex((l) => l.id === loan.id);
      if (idx >= 0) {
        const updated: BankLoanRecord = { ...db.loans[idx], ...loan, id: loan.id, updatedAt: now };
        db.loans[idx] = updated;
        saveBankDb(db);
        return updated;
      }
    }
    const created: BankLoanRecord = {
      ...loan,
      id: loan.id || makeId('loan'),
      createdAt: now,
      updatedAt: now,
    };
    db.loans.unshift(created);
    saveBankDb(db);
    return created;
  },

  deleteLoan(id: string): void {
    const db = loadBankDb();
    db.loans = db.loans.filter((l) => l.id !== id);
    saveBankDb(db);
  },

  confirmLoanPayment(
    loanId: string,
    payment: Omit<LoanInstallmentPayment, 'id' | 'confirmedByUser' | 'createdAt'>
  ): { ok: boolean; duplicate?: boolean; loan?: BankLoanRecord } {
    const db = loadBankDb();
    const loan = db.loans.find((l) => l.id === loanId);
    if (!loan) return { ok: false };

    // Deduplicate scheduled EMI installment confirmation
    if (payment.installmentNo > 0) {
      const alreadyPaid = loan.payments.some((p) => p.installmentNo === payment.installmentNo);
      if (alreadyPaid) return { ok: false, duplicate: true, loan };
    } else {
      const dedupeKey = `loan_extra_${loanId}_${payment.paidDateAD}_${payment.totalPaid}`;
      if (db.processedDedupeKeys.includes(dedupeKey)) {
        return { ok: false, duplicate: true, loan };
      }
      db.processedDedupeKeys.push(dedupeKey);
    }

    const entry: LoanInstallmentPayment = {
      ...payment,
      id: makeId('emipay'),
      confirmedByUser: true,
      createdAt: Date.now(),
    };
    loan.payments.push(entry);
    loan.updatedAt = Date.now();
    saveBankDb(db);
    return { ok: true, loan };
  },

  addLoanRateChange(
    loanId: string,
    rateChange: { effectiveDateAD: string; effectiveDateBS: string; newRate: number; note?: string }
  ): BankLoanRecord | null {
    const db = loadBankDb();
    const loan = db.loans.find((l) => l.id === loanId);
    if (!loan) return null;
    loan.rateChanges.push({
      id: makeId('rate'),
      ...rateChange,
      createdAt: Date.now(),
    });
    loan.updatedAt = Date.now();
    saveBankDb(db);
    return loan;
  },

  // --- SIPs ---
  upsertSip(sip: Omit<SipPlanRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): SipPlanRecord {
    const db = loadBankDb();
    const now = Date.now();
    if (sip.id) {
      const idx = db.sips.findIndex((s) => s.id === sip.id);
      if (idx >= 0) {
        const updated: SipPlanRecord = { ...db.sips[idx], ...sip, id: sip.id, updatedAt: now };
        db.sips[idx] = updated;
        saveBankDb(db);
        return updated;
      }
    }
    const created: SipPlanRecord = {
      ...sip,
      id: sip.id || makeId('sip'),
      createdAt: now,
      updatedAt: now,
    };
    db.sips.unshift(created);
    saveBankDb(db);
    return created;
  },

  deleteSip(id: string): void {
    const db = loadBankDb();
    db.sips = db.sips.filter((s) => s.id !== id);
    saveBankDb(db);
  },

  confirmSipInstallment(
    sipId: string,
    installmentNo: number,
    payload: { paidDateAD: string; paidDateBS: string; amount: number; nav?: number; note?: string }
  ): { ok: boolean; duplicate?: boolean } {
    const db = loadBankDb();
    const sip = db.sips.find((s) => s.id === sipId);
    if (!sip) return { ok: false };

    const dedupeKey = `sip_paid_${sipId}_${installmentNo}`;
    if (db.processedDedupeKeys.includes(dedupeKey)) {
      return { ok: false, duplicate: true };
    }

    const existingIdx = sip.installments.findIndex((i) => i.installmentNo === installmentNo);
    const units = payload.nav && payload.nav > 0 ? Math.round((payload.amount / payload.nav) * 10000) / 10000 : undefined;

    if (existingIdx >= 0) {
      if (sip.installments[existingIdx].confirmedByUser) return { ok: false, duplicate: true };
      sip.installments[existingIdx] = {
        ...sip.installments[existingIdx],
        amount: payload.amount,
        status: 'paid',
        paidDateAD: payload.paidDateAD,
        paidDateBS: payload.paidDateBS,
        navAtPurchase: payload.nav,
        unitsAllotted: units,
        note: payload.note,
        confirmedByUser: true,
      };
    } else {
      sip.installments.push({
        id: makeId('sipi'),
        installmentNo,
        dueDateAD: payload.paidDateAD,
        dueDateBS: payload.paidDateBS,
        amount: payload.amount,
        status: 'paid',
        paidDateAD: payload.paidDateAD,
        paidDateBS: payload.paidDateBS,
        navAtPurchase: payload.nav,
        unitsAllotted: units,
        note: payload.note,
        confirmedByUser: true,
      });
    }
    db.processedDedupeKeys.push(dedupeKey);
    sip.updatedAt = Date.now();
    saveBankDb(db);
    return { ok: true };
  },

  // --- Mutual Funds ---
  upsertMutualFund(mf: Omit<MutualFundRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): MutualFundRecord {
    const db = loadBankDb();
    const now = Date.now();
    if (mf.id) {
      const idx = db.mutualFunds.findIndex((f) => f.id === mf.id);
      if (idx >= 0) {
        const updated: MutualFundRecord = { ...db.mutualFunds[idx], ...mf, id: mf.id, updatedAt: now };
        db.mutualFunds[idx] = updated;
        saveBankDb(db);
        return updated;
      }
    }
    const created: MutualFundRecord = {
      ...mf,
      id: mf.id || makeId('mf'),
      createdAt: now,
      updatedAt: now,
    };
    db.mutualFunds.unshift(created);
    saveBankDb(db);
    return created;
  },

  deleteMutualFund(id: string): void {
    const db = loadBankDb();
    db.mutualFunds = db.mutualFunds.filter((f) => f.id !== id);
    saveBankDb(db);
  },

  // --- Calendar Events ---
  upsertCalendarEvent(ev: Omit<BankCalendarEvent, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): BankCalendarEvent {
    const db = loadBankDb();
    const now = Date.now();
    if (ev.id) {
      const idx = db.calendarEvents.findIndex((e) => e.id === ev.id);
      if (idx >= 0) {
        const updated: BankCalendarEvent = { ...db.calendarEvents[idx], ...ev, id: ev.id, updatedAt: now };
        db.calendarEvents[idx] = updated;
        saveBankDb(db);
        return updated;
      }
    }
    const created: BankCalendarEvent = {
      ...ev,
      id: ev.id || makeId('cal'),
      createdAt: now,
      updatedAt: now,
    };
    db.calendarEvents.push(created);
    saveBankDb(db);
    return created;
  },

  deleteCalendarEvent(id: string): void {
    const db = loadBankDb();
    db.calendarEvents = db.calendarEvents.filter((e) => e.id !== id);
    saveBankDb(db);
  },

  markCalendarEventPaid(id: string, paid: boolean): void {
    const db = loadBankDb();
    const ev = db.calendarEvents.find((e) => e.id === id);
    if (!ev) return;
    const today = getTodayDual();
    ev.isPaid = paid;
    ev.paidDateAD = paid ? today.adStr : undefined;
    ev.paidDateBS = paid ? today.bsStr : undefined;
    ev.updatedAt = Date.now();
    saveBankDb(db);
  },

  // --- Credit Cards & Bills ---
  upsertCreditCard(card: Omit<CreditCardRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): CreditCardRecord {
    const db = loadBankDb();
    const now = Date.now();
    if (card.id) {
      const idx = db.creditCards.findIndex((c) => c.id === card.id);
      if (idx >= 0) {
        db.creditCards[idx] = { ...db.creditCards[idx], ...card, id: card.id, updatedAt: now };
        saveBankDb(db);
        return db.creditCards[idx];
      }
    }
    const created: CreditCardRecord = { ...card, id: card.id || makeId('cc'), createdAt: now, updatedAt: now };
    db.creditCards.unshift(created);
    saveBankDb(db);
    return created;
  },

  deleteCreditCard(id: string): void {
    const db = loadBankDb();
    db.creditCards = db.creditCards.filter((c) => c.id !== id);
    db.creditCardBills = db.creditCardBills.filter((b) => b.cardId !== id);
    saveBankDb(db);
  },

  addCreditCardBill(bill: Omit<CreditCardBillRecord, 'id' | 'createdAt'>): CreditCardBillRecord {
    const db = loadBankDb();
    const created: CreditCardBillRecord = { ...bill, id: makeId('ccb'), createdAt: Date.now() };
    db.creditCardBills.unshift(created);
    saveBankDb(db);
    return created;
  },

  confirmCreditCardBillPaid(billId: string, paidAmount: number): void {
    const db = loadBankDb();
    const bill = db.creditCardBills.find((b) => b.id === billId);
    if (!bill) return;
    const today = getTodayDual();
    bill.paidAmount = paidAmount;
    bill.isPaid = true;
    bill.paidDateAD = today.adStr;
    bill.paidDateBS = today.bsStr;
    saveBankDb(db);
  },

  deleteCreditCardBill(billId: string): void {
    const db = loadBankDb();
    db.creditCardBills = db.creditCardBills.filter((b) => b.id !== billId);
    saveBankDb(db);
  },

  // --- Insurance ---
  upsertInsurancePolicy(policy: Omit<InsurancePolicyRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): InsurancePolicyRecord {
    const db = loadBankDb();
    const now = Date.now();
    if (policy.id) {
      const idx = db.insurancePolicies.findIndex((p) => p.id === policy.id);
      if (idx >= 0) {
        db.insurancePolicies[idx] = { ...db.insurancePolicies[idx], ...policy, id: policy.id, updatedAt: now };
        saveBankDb(db);
        return db.insurancePolicies[idx];
      }
    }
    const created: InsurancePolicyRecord = { ...policy, id: policy.id || makeId('ins'), createdAt: now, updatedAt: now };
    db.insurancePolicies.unshift(created);
    saveBankDb(db);
    return created;
  },

  deleteInsurancePolicy(id: string): void {
    const db = loadBankDb();
    db.insurancePolicies = db.insurancePolicies.filter((p) => p.id !== id);
    saveBankDb(db);
  },

  // --- Bank Accounts & Transactions ---
  upsertBankAccount(acc: Omit<BankAccountRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): BankAccountRecord {
    const db = loadBankDb();
    const now = Date.now();
    if (acc.id) {
      const idx = db.bankAccounts.findIndex((a) => a.id === acc.id);
      if (idx >= 0) {
        db.bankAccounts[idx] = { ...db.bankAccounts[idx], ...acc, id: acc.id, updatedAt: now };
        saveBankDb(db);
        return db.bankAccounts[idx];
      }
    }
    const created: BankAccountRecord = { ...acc, id: acc.id || makeId('bk'), createdAt: now, updatedAt: now };
    db.bankAccounts.unshift(created);
    saveBankDb(db);
    return created;
  },

  deleteBankAccount(id: string): void {
    const db = loadBankDb();
    db.bankAccounts = db.bankAccounts.filter((a) => a.id !== id);
    db.bankTransactions = db.bankTransactions.filter((t) => t.accountId !== id);
    saveBankDb(db);
  },

  addBankTransaction(tx: Omit<BankLedgerTransaction, 'id' | 'createdAt'>): { ok: boolean; duplicate?: boolean; tx?: BankLedgerTransaction } {
    const db = loadBankDb();
    if (tx.refKey && db.processedDedupeKeys.includes(`bktx_${tx.refKey}`)) {
      return { ok: false, duplicate: true };
    }
    if (tx.refKey) db.processedDedupeKeys.push(`bktx_${tx.refKey}`);
    const created: BankLedgerTransaction = { ...tx, id: makeId('bktx'), createdAt: Date.now() };
    db.bankTransactions.unshift(created);
    saveBankDb(db);
    return { ok: true, tx: created };
  },

  deleteBankTransaction(id: string): void {
    const db = loadBankDb();
    db.bankTransactions = db.bankTransactions.filter((t) => t.id !== id);
    saveBankDb(db);
  },

  // --- Budgets ---
  upsertBudget(b: Omit<BudgetCategoryRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): BudgetCategoryRecord {
    const db = loadBankDb();
    const now = Date.now();
    if (b.id) {
      const idx = db.budgetCategories.findIndex((x) => x.id === b.id);
      if (idx >= 0) {
        db.budgetCategories[idx] = { ...db.budgetCategories[idx], ...b, id: b.id, updatedAt: now };
        saveBankDb(db);
        return db.budgetCategories[idx];
      }
    }
    const created: BudgetCategoryRecord = { ...b, id: b.id || makeId('bdg'), createdAt: now, updatedAt: now };
    db.budgetCategories.push(created);
    saveBankDb(db);
    return created;
  },

  deleteBudget(id: string): void {
    const db = loadBankDb();
    db.budgetCategories = db.budgetCategories.filter((x) => x.id !== id);
    saveBankDb(db);
  },

  // --- Income & Expense ---
  upsertIncomeExpense(ie: Omit<IncomeExpenseRecord, 'id' | 'createdAt'> & { id?: string }): IncomeExpenseRecord {
    const db = loadBankDb();
    if (ie.id) {
      const idx = db.incomeExpenses.findIndex((x) => x.id === ie.id);
      if (idx >= 0) {
        db.incomeExpenses[idx] = { ...db.incomeExpenses[idx], ...ie, id: ie.id };
        saveBankDb(db);
        return db.incomeExpenses[idx];
      }
    }
    const created: IncomeExpenseRecord = { ...ie, id: ie.id || makeId('ie'), createdAt: Date.now() };
    db.incomeExpenses.unshift(created);
    saveBankDb(db);
    return created;
  },

  deleteIncomeExpense(id: string): void {
    const db = loadBankDb();
    db.incomeExpenses = db.incomeExpenses.filter((x) => x.id !== id);
    saveBankDb(db);
  },

  // --- Savings Goals ---
  upsertSavingsGoal(g: Omit<SavingsGoalRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): SavingsGoalRecord {
    const db = loadBankDb();
    const now = Date.now();
    if (g.id) {
      const idx = db.savingsGoals.findIndex((x) => x.id === g.id);
      if (idx >= 0) {
        db.savingsGoals[idx] = { ...db.savingsGoals[idx], ...g, id: g.id, updatedAt: now };
        saveBankDb(db);
        return db.savingsGoals[idx];
      }
    }
    const created: SavingsGoalRecord = { ...g, id: g.id || makeId('goal'), createdAt: now, updatedAt: now };
    db.savingsGoals.unshift(created);
    saveBankDb(db);
    return created;
  },

  deleteSavingsGoal(id: string): void {
    const db = loadBankDb();
    db.savingsGoals = db.savingsGoals.filter((x) => x.id !== id);
    saveBankDb(db);
  },

  // --- Recurring Payments ---
  upsertRecurring(r: Omit<RecurringPaymentRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): RecurringPaymentRecord {
    const db = loadBankDb();
    const now = Date.now();
    if (r.id) {
      const idx = db.recurringPayments.findIndex((x) => x.id === r.id);
      if (idx >= 0) {
        db.recurringPayments[idx] = { ...db.recurringPayments[idx], ...r, id: r.id, updatedAt: now };
        saveBankDb(db);
        return db.recurringPayments[idx];
      }
    }
    const created: RecurringPaymentRecord = { ...r, id: r.id || makeId('rec'), createdAt: now, updatedAt: now };
    db.recurringPayments.unshift(created);
    saveBankDb(db);
    return created;
  },

  deleteRecurring(id: string): void {
    const db = loadBankDb();
    db.recurringPayments = db.recurringPayments.filter((x) => x.id !== id);
    saveBankDb(db);
  },

  // --- Reminder Preferences ---
  updateReminderPrefs(prefs: Partial<BankReminderPreferences>): BankReminderPreferences {
    const db = loadBankDb();
    db.reminderPrefs = { ...db.reminderPrefs, ...prefs };
    saveBankDb(db);
    return db.reminderPrefs;
  },
};

// ===========================================================================
// AES-256-GCM + PBKDF2 ENCRYPTED BACKUP & RESTORE
// ===========================================================================

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function getCryptoSubtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error('Web Crypto API (crypto.subtle) is not available in this environment.');
  }
  return c.subtle;
}

async function deriveAesKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const subtle = getCryptoSubtle();
  const enc = new TextEncoder();
  const baseKey = await subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function exportEncryptedBankBackup(passphrase: string): Promise<EncryptedBackupEnvelope> {
  if (!passphrase || passphrase.length < 4) {
    throw new Error('Passphrase must be at least 4 characters long.');
  }
  const db = loadBankDb();
  const payload = JSON.stringify({
    ...db,
    lastBackupAt: Date.now(),
  });

  const subtle = getCryptoSubtle();
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const iterations = 100000;
  const key = await deriveAesKey(passphrase, salt, iterations);

  const encryptedBuf = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(payload)
  );

  const envelope: EncryptedBackupEnvelope = {
    format: 'GHAULE_BANK_INVESTMENT_ENC_V1',
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations,
    saltBase64: toBase64(salt),
    ivBase64: toBase64(iv),
    ciphertextBase64: toBase64(new Uint8Array(encryptedBuf)),
    exportedAt: Date.now(),
    schemaVersion: db.schemaVersion,
  };

  db.lastBackupAt = envelope.exportedAt;
  saveBankDb(db);
  return envelope;
}

export async function restoreEncryptedBankBackup(
  envelopeJson: string,
  passphrase: string
): Promise<BankInvestmentDatabase> {
  let envelope: EncryptedBackupEnvelope;
  try {
    envelope = JSON.parse(envelopeJson);
  } catch {
    throw new Error('Invalid backup file format (expected JSON).');
  }

  if (envelope?.format !== 'GHAULE_BANK_INVESTMENT_ENC_V1') {
    throw new Error('Unsupported backup file signature.');
  }
  if (!passphrase) {
    throw new Error('Please enter the backup passphrase.');
  }

  const subtle = getCryptoSubtle();
  const salt = fromBase64(envelope.saltBase64);
  const iv = fromBase64(envelope.ivBase64);
  const cipher = fromBase64(envelope.ciphertextBase64);
  const key = await deriveAesKey(passphrase, salt, envelope.iterations || 100000);

  let plainBuf: ArrayBuffer;
  try {
    plainBuf = await subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      cipher.buffer as ArrayBuffer
    );
  } catch {
    throw new Error('Incorrect passphrase or corrupted backup file.');
  }

  const plainText = new TextDecoder().decode(plainBuf);
  const parsedDb = JSON.parse(plainText);
  const migrated = migrateBankDatabase(parsedDb);
  return saveBankDb(migrated);
}
