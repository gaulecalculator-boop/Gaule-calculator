/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MilkPaymentMethod = 'cash' | 'esewa' | 'khalti' | 'bank' | 'qr';

export interface FutureRateSchedule {
  rate: number;
  eveningRate?: number;
  effectiveDateBS: string; // e.g. "2083-09-01"
  effectiveDateISO: string; // e.g. "2026-12-16"
}

export interface MilkCustomer {
  id: string;
  ownerUid?: string;
  name: string;
  mobile: string;
  address: string;
  photoUrl?: string; // Base64 data URL
  startDate: string; // ISO "YYYY-MM-DD"
  startBsDate: string; // BS formatted e.g. "2083-07-22"
  startBsYear: number;
  startBsMonth: number;
  startBsDay: number; // e.g. 22
  morningMilk: number; // default daily liters (e.g. 2.5)
  eveningMilk: number; // default daily liters (e.g. 1.5)
  milkRate: number; // current morning/default rate per liter (e.g. 75)
  eveningMilkRate?: number; // optional separate evening rate
  futureRate?: FutureRateSchedule;
  status: 'active' | 'stopped' | 'inactive';
  stoppedDate?: string;
  stoppedBsDate?: string;
  stoppedReason?: string;
  notes?: string;
  openingBalance?: number; // अघिल्लो / पुरानो बाँकी रकम (Opening Previous Pending)
  finalBillGenerated?: boolean;
  finalBillDateBS?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DailyMilkRecord {
  id: string;
  ownerUid?: string;
  customerId: string;
  customerName: string;
  date: string; // ISO "YYYY-MM-DD"
  bsDate: string; // BS "2083-07-22"
  bsYear: number;
  bsMonth: number;
  bsDay: number;
  morningMilk: number;
  eveningMilk: number;
  totalMilk: number;
  ratePerLtr: number;
  eveningRatePerLtr?: number;
  totalAmount: number;
  isNoMilk: boolean; // छुट्टी / दूध बन्द
  note?: string;
  billedCycleId?: string; // Cycle ID where this record is included
  createdAt: number;
  updatedAt: number;
}

export interface NoMilkDayRecord {
  id: string;
  ownerUid?: string;
  customerId: string;
  customerName: string;
  bsDate: string; // "2083-07-22"
  isoDate: string;
  reason?: string;
  createdAt: number;
}

export interface MilkAuditLog {
  id: string;
  ownerUid?: string;
  customerId: string;
  customerName: string;
  action:
    | 'create_customer'
    | 'update_customer'
    | 'status_change'
    | 'daily_entry'
    | 'edit_daily_entry'
    | 'delete_daily_entry'
    | 'no_milk_day'
    | 'end_bill'
    | 'payment_received'
    | 'edit_payment'
    | 'delete_payment'
    | 'rate_change';
  targetDateBS?: string;
  description: string;
  prevData?: any;
  newData?: any;
  timestamp: number;
}

export interface MilkRateHistoryItem {
  id: string;
  ownerUid?: string;
  customerId: string;
  rate: number;
  morningRate?: number;
  eveningRate?: number;
  effectiveDateBS: string;
  effectiveDateISO: string;
  note?: string;
  createdAt: number;
}

export interface MonthlyMilkBill {
  id: string;
  ownerUid?: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  cycleNumber: number;
  cycleName: string; // e.g. "कात्तिक २२ - मंसिर २१"
  fromBsDate: string;
  toBsDate: string;
  fromIso: string;
  toIso: string;
  dueDateBS: string;
  dueDateISO: string;
  totalDays: number;
  suppliedDays: number;
  noMilkDays: number;
  totalMilkLtr: number;
  currentBillAmount: number;
  previousPendingAmount: number;
  totalPayable: number;
  totalPaid: number;
  allocatedPaid?: number;
  advanceCredit?: number;
  remainingBalance: number;
  status: 'due' | 'paid' | 'partial' | 'overdue';
  createdAt: number;
  updatedAt: number;
}

export interface PaymentAllocation {
  id: string;
  ownerUid?: string;
  paymentId: string;
  customerId: string;
  billId: string;
  cycleNumber: number;
  allocatedAmount: number;
  createdAt: number;
}

export interface MilkPaymentAudit {
  action: 'created' | 'updated' | 'cancelled';
  timestamp: number;
  prevAmount?: number;
  newAmount?: number;
  note?: string;
}

export interface MilkPayment {
  id: string;
  ownerUid?: string;
  customerId: string;
  customerName: string;
  billId?: string;
  billingPeriod?: string;
  totalBillAtPayment?: number;
  date: string; // ISO
  bsDate: string; // BS formatted
  amount: number;
  paymentType: 'full' | 'partial' | 'advance';
  paymentMethod: MilkPaymentMethod;
  receiptNumber: string;
  remainingBalanceAfter: number;
  transactionRef?: string;
  note?: string;
  auditHistory: MilkPaymentAudit[];
  createdAt: number;
  updatedAt: number;
}

export interface MilkFinalBill {
  id: string;
  ownerUid?: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerMobile: string;
  customerPhoto?: string;
  startDateBS: string;
  endDateBS: string;
  startDateISO: string;
  endDateISO: string;
  totalCalendarDays: number;
  actualDeliveryDays: number;
  morningMilkDays: number;
  eveningMilkDays: number;
  noMilkDays: number;
  noMilkDatesBS: string[];
  morningTotalMilk: number;
  eveningTotalMilk: number;
  totalMilkLtr: number;
  dailyRecords: DailyMilkRecord[];
  totalMilkAmount: number;
  previousPending: number;
  previousPayments: MilkPayment[];
  totalAmountReceived: number;
  finalRemainingBalance: number;
  status: 'paid' | 'partial' | 'due' | 'overdue';
  generatedAt: number;
}

export interface MilkNotificationItem {
  id: string;
  ownerUid?: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  type: 'upcoming_due_3days' | 'upcoming_due_2days' | 'upcoming_due_1day' | 'due_today' | 'overdue';
  title: string;
  message: string;
  dueDateBS: string;
  daysRemainingOrOverdue: number; // positive = days left, negative = days overdue
  amountDue: number;
  billId?: string;
  createdAt: number;
  isDismissed?: boolean;
}
