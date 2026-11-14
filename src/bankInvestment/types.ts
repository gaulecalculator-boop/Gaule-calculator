/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Type definitions for Bank & Investment Management System (बैंक तथा लगानी)
 */

export type SupportedLang = 'en' | 'ne' | 'hi';

export type InvestmentCalcId =
  | 'sip'
  | 'step_up_sip'
  | 'lumpsum'
  | 'mutual_fund'
  | 'swp'
  | 'stp'
  | 'fd'
  | 'rd'
  | 'compound_interest'
  | 'simple_interest'
  | 'daily_interest'
  | 'annual_interest'
  | 'dividend'
  | 'stock_average'
  | 'share_pnl'
  | 'gold_investment'
  | 'retirement'
  | 'inflation'
  | 'ppf'
  | 'net_worth';

export interface SavedCalculatorRecord {
  id: string;
  calcId: InvestmentCalcId;
  title: string;
  inputs: Record<string, string | number | boolean>;
  summary: {
    primaryLabel: string;
    primaryValue: number;
    investedAmount?: number;
    gainOrInterest?: number;
    secondaryLabel?: string;
    secondaryValue?: number | string;
  };
  notes?: string;
  bsDate: string; // YYYY-MM-DD
  adDate: string; // YYYY-MM-DD
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// 3. BANK LOAN MANAGEMENT
// ---------------------------------------------------------------------------

export type LoanCategory =
  | 'home'
  | 'personal'
  | 'business'
  | 'education'
  | 'vehicle'
  | 'agricultural'
  | 'gold'
  | 'custom';

export type InterestRateType = 'fixed' | 'variable';
export type PaymentFrequency = 'monthly' | 'quarterly' | 'yearly';

export interface LoanRateChange {
  id: string;
  effectiveDateAD: string; // YYYY-MM-DD
  effectiveDateBS: string; // YYYY-MM-DD
  newRate: number; // % p.a.
  note?: string;
  createdAt: number;
}

export interface LoanInstallmentPayment {
  id: string;
  installmentNo: number; // 1-based installment index OR 0 for standalone extra prepayment
  dueDateAD: string;
  dueDateBS: string;
  paidDateAD: string;
  paidDateBS: string;
  scheduledEmi: number;
  principalComponent: number;
  interestComponent: number;
  extraPrincipalPaid: number;
  totalPaid: number;
  rateApplied: number;
  method: 'cash' | 'bank' | 'esewa' | 'khalti' | 'auto_debit' | 'other';
  note?: string;
  confirmedByUser: true;
  createdAt: number;
}

export interface BankLoanRecord {
  id: string;
  category: LoanCategory;
  customCategoryName?: string;
  bankName: string;
  nickname: string;
  principalAmount: number;
  interestRate: number; // Initial annual %
  interestType: InterestRateType;
  paymentFrequency: PaymentFrequency;
  startDateAD: string; // YYYY-MM-DD
  startDateBS: string; // YYYY-MM-DD
  durationMonths: number;
  customEmiAmount?: number; // Optional user override EMI
  emiPaymentDay: number; // 1-31 (day of month)
  processingFee: number;
  plannedExtraPayment: number; // Optional recurring extra payment
  rateChanges: LoanRateChange[];
  payments: LoanInstallmentPayment[];
  status: 'active' | 'closed';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface LoanAmortizationRow {
  installmentNo: number;
  dueDateAD: string;
  dueDateBS: string;
  openingPrincipal: number;
  rateApplied: number;
  emiAmount: number;
  principalComponent: number;
  interestComponent: number;
  extraPrincipal: number;
  closingPrincipal: number;
  status: 'paid' | 'pending' | 'overdue';
  paymentId?: string;
  paidDateAD?: string;
  paidDateBS?: string;
}

// ---------------------------------------------------------------------------
// 4. ADVANCED SIP MANAGEMENT
// ---------------------------------------------------------------------------

export type SipStatus = 'active' | 'paused' | 'stopped' | 'completed';
export type SipInstallmentStatus = 'paid' | 'pending' | 'missed';

export interface SipInstallmentRecord {
  id: string;
  installmentNo: number;
  dueDateAD: string;
  dueDateBS: string;
  amount: number;
  status: SipInstallmentStatus;
  paidDateAD?: string;
  paidDateBS?: string;
  unitsAllotted?: number;
  navAtPurchase?: number;
  note?: string;
  confirmedByUser: boolean;
}

export interface SipPlanRecord {
  id: string;
  sipName: string;
  fundName: string;
  monthlyInvestment: number;
  startDateAD: string;
  startDateBS: string;
  sipDay: number; // 1-28/31
  durationMonths: number;
  expectedReturnRate: number; // % p.a. assumption
  stepUpPercent: number; // Annual step-up % (0 if flat)
  manualCurrentValue?: number; // User-entered actual/latest value (optional override)
  status: SipStatus;
  installments: SipInstallmentRecord[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// 5. MUTUAL FUND PORTFOLIO
// ---------------------------------------------------------------------------

export type MutualFundCategory =
  | 'equity'
  | 'debt'
  | 'hybrid'
  | 'index'
  | 'balanced'
  | 'sectoral'
  | 'tax_saver'
  | 'other';

export interface MutualFundRedemption {
  id: string;
  dateAD: string;
  dateBS: string;
  unitsRedeemed: number;
  redemptionNav: number;
  amountReceived: number;
  note?: string;
  createdAt: number;
}

export interface MutualFundDividend {
  id: string;
  dateAD: string;
  dateBS: string;
  amount: number;
  reinvestedUnits?: number;
  note?: string;
  createdAt: number;
}

export interface MutualFundAddition {
  id: string;
  dateAD: string;
  dateBS: string;
  amount: number;
  nav: number;
  units: number;
  note?: string;
  createdAt: number;
}

export interface MutualFundRecord {
  id: string;
  fundName: string;
  category: MutualFundCategory;
  investmentDateAD: string;
  investmentDateBS: string;
  purchaseNav: number;
  unitsPurchased: number;
  currentNav: number;
  navSource: 'manual' | 'verified_live';
  navProviderName?: string;
  navProviderUrl?: string;
  navLastUpdatedAD: string;
  navLastUpdatedBS: string;
  additions: MutualFundAddition[];
  redemptions: MutualFundRedemption[];
  dividends: MutualFundDividend[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// 6. ADVANCED BANK & INVESTMENT CALENDAR
// ---------------------------------------------------------------------------

export type BankCalendarEventType =
  | 'sip_payment'
  | 'loan_emi'
  | 'mf_investment'
  | 'fd_maturity'
  | 'rd_deposit'
  | 'interest_credit'
  | 'dividend_payment'
  | 'insurance_premium'
  | 'credit_card_bill'
  | 'loan_due_date'
  | 'investment_reminder'
  | 'custom';

export interface BankCalendarEvent {
  id: string;
  title: string;
  type: BankCalendarEventType;
  bsYear: number;
  bsMonth: number; // 1-12
  bsDay: number; // 1-32
  bsDate: string; // YYYY-MM-DD
  adDate: string; // YYYY-MM-DD
  amount: number;
  notes?: string;
  reminderDaysBefore: number; // 0 = same day, 1, 3, 7, custom
  reminderEnabled: boolean;
  isPaid: boolean; // ONLY true on explicit user confirmation!
  paidDateAD?: string;
  paidDateBS?: string;
  linkedSourceType?: 'loan' | 'sip' | 'credit_card' | 'insurance' | 'bank_account' | 'recurring' | 'manual';
  linkedSourceId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CalendarDisplayEvent extends BankCalendarEvent {
  isAutoLinked: boolean;
  sourceLabel?: string;
}

// ---------------------------------------------------------------------------
// 7. ADDITIONAL PERSISTENT FINANCIAL TOOLS
// ---------------------------------------------------------------------------

export interface CreditCardRecord {
  id: string;
  cardName: string;
  bankName: string;
  lastFourDigits?: string;
  creditLimit: number;
  billingCycleDay: number; // 1-31
  dueDay: number; // 1-31
  aprPercent: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreditCardBillRecord {
  id: string;
  cardId: string;
  statementMonthBS: string; // YYYY-MM
  dueDateBS: string;
  dueDateAD: string;
  billAmount: number;
  minimumDue: number;
  paidAmount: number;
  isPaid: boolean;
  paidDateAD?: string;
  paidDateBS?: string;
  note?: string;
  createdAt: number;
}

export type InsuranceType = 'life' | 'health' | 'vehicle' | 'property' | 'term' | 'other';

export interface InsurancePolicyRecord {
  id: string;
  policyName: string;
  companyName: string;
  policyNumber?: string;
  insuranceType: InsuranceType;
  sumAssured: number;
  premiumAmount: number;
  frequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  nextDueDateBS: string;
  nextDueDateAD: string;
  maturityDateBS?: string;
  maturityDateAD?: string;
  paymentHistory: Array<{
    id: string;
    paidDateBS: string;
    paidDateAD: string;
    amount: number;
    note?: string;
  }>;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BankAccountRecord {
  id: string;
  bankName: string;
  accountNickname: string;
  accountType: 'savings' | 'current' | 'fd' | 'rd';
  accountNumberLast4?: string;
  openingBalance: number;
  interestRatePercent: number;
  maturityDateBS?: string;
  maturityDateAD?: string;
  maturityAmount?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BankLedgerTransaction {
  id: string;
  accountId: string;
  type: 'deposit' | 'withdrawal' | 'interest_credit' | 'transfer';
  amount: number;
  dateBS: string;
  dateAD: string;
  note?: string;
  refKey?: string;
  createdAt: number;
}

export interface BudgetCategoryRecord {
  id: string;
  category: string;
  monthlyLimit: number;
  monthBS: string; // YYYY-MM or 'default'
  createdAt: number;
  updatedAt: number;
}

export interface IncomeExpenseRecord {
  id: string;
  entryType: 'income' | 'expense';
  category: string;
  amount: number;
  dateBS: string;
  dateAD: string;
  paymentMethod: 'cash' | 'bank' | 'esewa' | 'khalti' | 'card' | 'other';
  note?: string;
  createdAt: number;
}

export interface SavingsGoalRecord {
  id: string;
  goalName: string;
  targetAmount: number;
  savedAmount: number;
  targetDateBS: string;
  targetDateAD: string;
  contributions: Array<{
    id: string;
    dateBS: string;
    dateAD: string;
    amount: number;
    note?: string;
  }>;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface RecurringPaymentRecord {
  id: string;
  title: string;
  category: BankCalendarEventType;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextDueDateBS: string;
  nextDueDateAD: string;
  isActive: boolean;
  history: Array<{
    id: string;
    paidDateBS: string;
    paidDateAD: string;
    amount: number;
  }>;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// 9 & 10. REMINDERS & INSIGHTS & SETTINGS
// ---------------------------------------------------------------------------

export interface BankReminderPreferences {
  enabled: boolean;
  leadDaysOptions: number[]; // e.g. [1, 3, 7]
  customLeadDays: number;
  notifyTime: string; // "08:00"
  enableBrowserNotifications: boolean;
  enableAndroidBridge: boolean;
  dismissedAlertKeys: Record<string, string>; // alertKey -> YYYY-MM-DD dismissed
}

export interface BankReminderAlert {
  id: string;
  title: string;
  category: BankCalendarEventType;
  dueDateBS: string;
  dueDateAD: string;
  daysRemaining: number; // negative = overdue
  amount: number;
  sourceLabel: string;
  isOverdue: boolean;
  eventRefId?: string;
  linkedSourceType?: BankCalendarEvent['linkedSourceType'];
  linkedSourceId?: string;
}

export interface SmartFinancialInsight {
  id: string;
  severity: 'info' | 'warning' | 'success' | 'alert';
  title: string;
  detail: string;
  metric?: string;
}

// ---------------------------------------------------------------------------
// 11. DATABASE ROOT SCHEMA & ENCRYPTED BACKUP
// ---------------------------------------------------------------------------

export interface BankInvestmentDatabase {
  schemaVersion: number;
  updatedAt: number;
  lastBackupAt?: number;
  savedCalculations: SavedCalculatorRecord[];
  loans: BankLoanRecord[];
  sips: SipPlanRecord[];
  mutualFunds: MutualFundRecord[];
  calendarEvents: BankCalendarEvent[];
  creditCards: CreditCardRecord[];
  creditCardBills: CreditCardBillRecord[];
  insurancePolicies: InsurancePolicyRecord[];
  bankAccounts: BankAccountRecord[];
  bankTransactions: BankLedgerTransaction[];
  budgetCategories: BudgetCategoryRecord[];
  incomeExpenses: IncomeExpenseRecord[];
  savingsGoals: SavingsGoalRecord[];
  recurringPayments: RecurringPaymentRecord[];
  reminderPrefs: BankReminderPreferences;
  processedDedupeKeys: string[]; // Prevents duplicate transactions/installments
}

export interface EncryptedBackupEnvelope {
  format: 'GHAULE_BANK_INVESTMENT_ENC_V1';
  algorithm: 'AES-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  saltBase64: string;
  ivBase64: string;
  ciphertextBase64: string;
  exportedAt: number;
  schemaVersion: number;
}

export type BankSectionTab =
  | 'calculators'
  | 'loans'
  | 'sip_mf'
  | 'calendar'
  | 'tools'
  | 'reports';

export type FinancialReportType =
  | 'daily'
  | 'monthly'
  | 'yearly'
  | 'investment'
  | 'loan'
  | 'sip'
  | 'mutual_fund'
  | 'interest'
  | 'income_expense'
  | 'assets_liabilities';
