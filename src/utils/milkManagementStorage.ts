/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  MilkCustomer,
  DailyMilkRecord,
  MonthlyMilkBill,
  MilkPayment,
  MilkNotificationItem,
  MilkPaymentMethod,
  NoMilkDayRecord,
  MilkAuditLog,
  MilkRateHistoryItem,
  MilkFinalBill,
  PaymentAllocation,
} from '../types/milkManagement';
import {
  bsToAd,
  adToBs,
  getBSDaysInMonth,
  toDevanagari,
  NEPALI_MONTHS,
  formatDateToBS,
} from './nepaliCalendar';
import { authManager } from './authManager';
import { db } from '../firebase/config';
import { doc, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import {
  buildGauleDoodhBillSummary,
  generateGauleDoodhWhatsAppText,
} from './gauleDoodhBillEngine';
import { openExternalUrl, downloadTextFile } from './androidBridge';

const KEYS = {
  CUSTOMERS: 'ghaule_milk_customers_v2',
  DAILY_RECORDS: 'ghaule_milk_daily_records_v2',
  PAYMENTS: 'ghaule_milk_payments_v2',
  PAYMENT_ALLOCATIONS: 'ghaule_milk_payment_allocations_v2',
  NOTIFICATIONS: 'ghaule_milk_notifications_v2',
  DISMISSED_NOTIFS: 'ghaule_milk_dismissed_notifs_v2',
  SENT_LOCAL_NOTIFS: 'ghaule_milk_sent_local_notifs_v2',
  NO_MILK_DAYS: 'ghaule_milk_no_milk_days_v2',
  AUDIT_LOGS: 'ghaule_milk_audit_logs_v2',
  RATE_HISTORY: 'ghaule_milk_rate_history_v2',
  FINAL_BILLS: 'ghaule_milk_final_bills_v2',
  SYNC_TIMESTAMP: 'ghaule_milk_last_sync_v2',
};

function getStorageKey(base: string): string {
  const user = authManager.getCurrentUser();
  const uid = user ? user.uid : 'guest_local';
  return `${base}_${uid}`;
}

export function getTodayISOLocal(): string {
  const todayBS = adToBs(new Date());
  try {
    return bsToAd(todayBS.year, todayBS.month, todayBS.day).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export function getEffectiveRatesForDate(
  customer: MilkCustomer,
  dateISO: string
): { morningRate: number; eveningRate: number } {
  const history = getStoredRateHistory(customer.id)
    .filter((h) => h.effectiveDateISO <= dateISO)
    .sort((a, b) => b.effectiveDateISO.localeCompare(a.effectiveDateISO) || b.createdAt - a.createdAt);

  if (history.length > 0) {
    const latest = history[0];
    const mRate = latest.morningRate ?? latest.rate;
    const eRate = latest.eveningRate ?? latest.rate;
    return { morningRate: mRate, eveningRate: eRate };
  }

  if (customer.futureRate && dateISO >= customer.futureRate.effectiveDateISO) {
    return {
      morningRate: customer.futureRate.rate,
      eveningRate: customer.futureRate.eveningRate ?? customer.futureRate.rate,
    };
  }

  return {
    morningRate: customer.milkRate,
    eveningRate: customer.eveningMilkRate ?? customer.milkRate,
  };
}

// -------------------------------------------------------------
// 1. CUSTOMER MANAGEMENT
// -------------------------------------------------------------

const DEMO_CUSTOMER_IDS = new Set(['mcust_1', 'mcust_2', 'mcust_3']);
const DEMO_PAYMENT_IDS = new Set(['mpay_demo_1']);
const DEMO_PURGED_KEY = 'ghaule_milk_demo_purged_v1';

function isDemoRecordId(id: string): boolean {
  return (
    id.startsWith('mrec_mcust_1_') ||
    id.startsWith('mrec_mcust_2_') ||
    id.startsWith('mrec_mcust_3_')
  );
}

function purgeLegacyDemoMilkDataIfNeeded(force: boolean = false): void {
  if (typeof window === 'undefined') return;
  try {
    const flagKey = getStorageKey(DEMO_PURGED_KEY);
    if (!force && localStorage.getItem(flagKey) === '1') return;

    let removedAny = false;

    const custKey = getStorageKey(KEYS.CUSTOMERS);
    const custRaw = localStorage.getItem(custKey);
    if (custRaw) {
      const parsed = JSON.parse(custRaw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((c: any) => !DEMO_CUSTOMER_IDS.has(c?.id));
        if (filtered.length !== parsed.length) {
          localStorage.setItem(custKey, JSON.stringify(filtered));
          removedAny = true;
        }
      }
    }

    const dailyKey = getStorageKey(KEYS.DAILY_RECORDS);
    const dailyRaw = localStorage.getItem(dailyKey);
    if (dailyRaw) {
      const parsed = JSON.parse(dailyRaw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(
          (r: any) => !DEMO_CUSTOMER_IDS.has(r?.customerId) && !isDemoRecordId(String(r?.id || ''))
        );
        if (filtered.length !== parsed.length) {
          localStorage.setItem(dailyKey, JSON.stringify(filtered));
          removedAny = true;
        }
      }
    }

    const payKey = getStorageKey(KEYS.PAYMENTS);
    const payRaw = localStorage.getItem(payKey);
    if (payRaw) {
      const parsed = JSON.parse(payRaw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(
          (p: any) => !DEMO_PAYMENT_IDS.has(p?.id) && !DEMO_CUSTOMER_IDS.has(p?.customerId)
        );
        if (filtered.length !== parsed.length) {
          localStorage.setItem(payKey, JSON.stringify(filtered));
          removedAny = true;
        }
      }
    }

    const customerScopedKeys = [
      KEYS.PAYMENT_ALLOCATIONS,
      KEYS.NO_MILK_DAYS,
      KEYS.RATE_HISTORY,
      KEYS.FINAL_BILLS,
      KEYS.AUDIT_LOGS,
    ];
    customerScopedKeys.forEach((baseKey) => {
      const k = getStorageKey(baseKey);
      const rawVal = localStorage.getItem(k);
      if (!rawVal) return;
      const parsed = JSON.parse(rawVal);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((item: any) => !DEMO_CUSTOMER_IDS.has(item?.customerId));
        if (filtered.length !== parsed.length) {
          localStorage.setItem(k, JSON.stringify(filtered));
          removedAny = true;
        }
      }
    });

    localStorage.setItem(flagKey, '1');
    if (removedAny) {
      triggerBackgroundCloudSync();
    }
  } catch (err) {
    console.warn('Error purging legacy demo milk data:', err);
  }
}

export function getStoredMilkCustomers(): MilkCustomer[] {
  if (typeof window === 'undefined') return [];
  purgeLegacyDemoMilkDataIfNeeded();
  try {
    const raw = localStorage.getItem(getStorageKey(KEYS.CUSTOMERS));
    if (raw === null) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Error reading milk customers:', err);
    return [];
  }
}

export function saveMilkCustomer(
  data: Omit<MilkCustomer, 'id' | 'createdAt' | 'updatedAt'>,
  editId?: string
): MilkCustomer {
  const customers = getStoredMilkCustomers();
  const now = Date.now();
  const user = authManager.getCurrentUser();
  const ownerUid = user?.uid || 'guest_local';
  let target: MilkCustomer;
  let isEdit = false;
  let prevCustomer: MilkCustomer | undefined;

  if (editId) {
    const index = customers.findIndex((c) => c.id === editId);
    if (index >= 0) {
      isEdit = true;
      prevCustomer = customers[index];
      target = {
        ...customers[index],
        ...data,
        ownerUid,
        updatedAt: now,
      };
      customers[index] = target;
    } else {
      target = {
        ...data,
        ownerUid,
        id: editId,
        createdAt: now,
        updatedAt: now,
      };
      customers.unshift(target);
    }
  } else {
    target = {
      ...data,
      ownerUid,
      id: `mcust_${now}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    customers.unshift(target);
  }

  localStorage.setItem(getStorageKey(KEYS.CUSTOMERS), JSON.stringify(customers));

  saveAuditLog({
    customerId: target.id,
    customerName: target.name,
    action: isEdit ? 'update_customer' : 'create_customer',
    targetDateBS: target.startBsDate,
    description: isEdit
      ? `ग्राहक विवरण अपडेट गरियो (${target.name} • दर: रु ${target.milkRate}/L)`
      : `नयाँ ग्राहक दर्ता गरियो: ${target.name} (सुरु मिति: ${target.startBsDate})`,
    prevData: prevCustomer ? { name: prevCustomer.name, rate: prevCustomer.milkRate, status: prevCustomer.status } : undefined,
    newData: { name: target.name, rate: target.milkRate, status: target.status },
  });

  triggerBackgroundCloudSync();
  return target;
}

export function deleteMilkCustomer(id: string): void {
  const customers = getStoredMilkCustomers().filter((c) => c.id !== id);
  localStorage.setItem(getStorageKey(KEYS.CUSTOMERS), JSON.stringify(customers));

  const daily = getStoredDailyMilkRecords().filter((r) => r.customerId !== id);
  localStorage.setItem(getStorageKey(KEYS.DAILY_RECORDS), JSON.stringify(daily));

  const payments = getStoredMilkPayments().filter((p) => p.customerId !== id);
  localStorage.setItem(getStorageKey(KEYS.PAYMENTS), JSON.stringify(payments));

  const allocs = getStoredPaymentAllocations().filter((a) => a.customerId !== id);
  localStorage.setItem(getStorageKey(KEYS.PAYMENT_ALLOCATIONS), JSON.stringify(allocs));

  const noMilk = getStoredNoMilkDays().filter((n) => n.customerId !== id);
  localStorage.setItem(getStorageKey(KEYS.NO_MILK_DAYS), JSON.stringify(noMilk));

  const rates = getStoredRateHistory().filter((r) => r.customerId !== id);
  localStorage.setItem(getStorageKey(KEYS.RATE_HISTORY), JSON.stringify(rates));

  triggerBackgroundCloudSync();
}

export function toggleMilkCustomerStatus(
  id: string,
  newStatus: 'active' | 'stopped' | 'inactive',
  reason?: string
): MilkCustomer | null {
  const customers = getStoredMilkCustomers();
  const index = customers.findIndex((c) => c.id === id);
  if (index < 0) return null;

  const prev = customers[index];
  const todayBS = adToBs(new Date());
  const todayBSStr = `${todayBS.year}-${String(todayBS.month).padStart(2, '0')}-${String(
    todayBS.day
  ).padStart(2, '0')}`;

  const updated: MilkCustomer = {
    ...prev,
    status: newStatus,
    stoppedDate: newStatus !== 'active' ? getTodayISOLocal() : undefined,
    stoppedBsDate: newStatus !== 'active' ? todayBSStr : undefined,
    stoppedReason: newStatus !== 'active' ? reason || 'ग्राहकको अनुरोधमा दूध बन्द' : undefined,
    updatedAt: Date.now(),
  };

  customers[index] = updated;
  localStorage.setItem(getStorageKey(KEYS.CUSTOMERS), JSON.stringify(customers));

  saveAuditLog({
    customerId: updated.id,
    customerName: updated.name,
    action: 'status_change',
    targetDateBS: todayBSStr,
    description: `ग्राहक स्थिति परिवर्तन: ${prev.status} → ${newStatus}${reason ? ` (${reason})` : ''}`,
    prevData: { status: prev.status },
    newData: { status: newStatus, reason },
  });

  triggerBackgroundCloudSync();
  return updated;
}

// -------------------------------------------------------------
// 2. DAILY MILK RECORD MANAGEMENT
// -------------------------------------------------------------

export function getStoredDailyMilkRecords(customerId?: string): DailyMilkRecord[] {
  if (typeof window === 'undefined') return [];
  purgeLegacyDemoMilkDataIfNeeded();
  try {
    const raw = localStorage.getItem(getStorageKey(KEYS.DAILY_RECORDS));
    if (raw === null) {
      return [];
    }
    const records: DailyMilkRecord[] = JSON.parse(raw);
    if (!Array.isArray(records)) return [];
    if (customerId) {
      return records.filter((r) => r.customerId === customerId);
    }
    return records;
  } catch (err) {
    console.warn('Error reading daily milk records:', err);
    return [];
  }
}

export function saveDailyMilkRecord(
  data: Omit<DailyMilkRecord, 'id' | 'createdAt' | 'updatedAt'>,
  editId?: string
): DailyMilkRecord {
  const records = getStoredDailyMilkRecords();
  const now = Date.now();
  const user = authManager.getCurrentUser();
  const ownerUid = user?.uid || 'guest_local';
  let target: DailyMilkRecord;
  let wasEdit = false;
  let prevRecord: DailyMilkRecord | undefined;

  const existingSameDateIndex = records.findIndex(
    (r) => r.customerId === data.customerId && r.date === data.date && r.id !== editId
  );

  if (editId) {
    const idx = records.findIndex((r) => r.id === editId);
    if (idx >= 0) {
      wasEdit = true;
      prevRecord = records[idx];
      target = { ...records[idx], ...data, ownerUid, updatedAt: now };
      records[idx] = target;
    } else {
      target = { ...data, ownerUid, id: editId, createdAt: now, updatedAt: now };
      records.unshift(target);
    }
  } else if (existingSameDateIndex >= 0) {
    wasEdit = true;
    prevRecord = records[existingSameDateIndex];
    target = {
      ...records[existingSameDateIndex],
      ...data,
      ownerUid,
      updatedAt: now,
    };
    records[existingSameDateIndex] = target;
  } else {
    target = {
      ...data,
      ownerUid,
      id: `mrec_${now}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    records.unshift(target);
  }

  // If this date was previously marked as No Milk Day and now milk > 0 is recorded, remove from no_milk_days
  if (!data.isNoMilk && data.totalMilk > 0) {
    const noMilkList = getStoredNoMilkDays();
    const filteredNoMilk = noMilkList.filter(
      (n) => !(n.customerId === data.customerId && (n.bsDate === data.bsDate || n.isoDate === data.date))
    );
    if (filteredNoMilk.length !== noMilkList.length) {
      localStorage.setItem(getStorageKey(KEYS.NO_MILK_DAYS), JSON.stringify(filteredNoMilk));
    }
  }

  records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  localStorage.setItem(getStorageKey(KEYS.DAILY_RECORDS), JSON.stringify(records));

  // Record Audit Log for edits or new daily entries
  if (wasEdit && prevRecord && !data.isNoMilk) {
    saveAuditLog({
      customerId: data.customerId,
      customerName: data.customerName,
      action: 'edit_daily_entry',
      targetDateBS: data.bsDate,
      description: `${data.bsDate} को दूध रेकर्ड सम्पादन: ${prevRecord.totalMilk}L (रु ${prevRecord.totalAmount}) → ${data.totalMilk}L (रु ${data.totalAmount})`,
      prevData: { morning: prevRecord.morningMilk, evening: prevRecord.eveningMilk, total: prevRecord.totalMilk, amount: prevRecord.totalAmount },
      newData: { morning: data.morningMilk, evening: data.eveningMilk, total: data.totalMilk, amount: data.totalAmount },
    });
  } else if (!wasEdit && !data.isNoMilk) {
    saveAuditLog({
      customerId: data.customerId,
      customerName: data.customerName,
      action: 'daily_entry',
      targetDateBS: data.bsDate,
      description: `${data.bsDate}: बिहान ${data.morningMilk}L + बेलुका ${data.eveningMilk}L = ${data.totalMilk}L (रु ${data.totalAmount})`,
      newData: { morning: data.morningMilk, evening: data.eveningMilk, total: data.totalMilk, amount: data.totalAmount },
    });
  }

  triggerBackgroundCloudSync();
  return target;
}

export function getMissingRegularMilkDaysSummary(customer: MilkCustomer): {
  missingDaysCount: number;
  estimatedAmount: number;
  fromIso: string;
  toIso: string;
} {
  const dailyLtr = (customer.morningMilk || 0) + (customer.eveningMilk || 0);
  const todayIso = getTodayISOLocal();
  if (customer.status !== 'active' || dailyLtr <= 0 || !customer.startDate || customer.startDate > todayIso) {
    return { missingDaysCount: 0, estimatedAmount: 0, fromIso: customer.startDate || todayIso, toIso: todayIso };
  }

  const existingDates = new Set(getStoredDailyMilkRecords(customer.id).map((r) => r.date));
  const noMilkDates = new Set(getStoredNoMilkDays(customer.id).map((n) => n.isoDate));

  let missingDaysCount = 0;
  let estimatedAmount = 0;
  let cur = new Date(customer.startDate + 'T00:00:00Z');
  const end = new Date(todayIso + 'T00:00:00Z');
  const maxLoop = 400; // safeguard for ~13 months
  let steps = 0;

  while (cur <= end && steps < maxLoop) {
    const iso = cur.toISOString().split('T')[0];
    if (!existingDates.has(iso) && !noMilkDates.has(iso)) {
      const rates = getEffectiveRatesForDate(customer, iso);
      missingDaysCount++;
      estimatedAmount += Math.round(
        (customer.morningMilk || 0) * rates.morningRate + (customer.eveningMilk || 0) * rates.eveningRate
      );
    }
    cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
    steps++;
  }

  return {
    missingDaysCount,
    estimatedAmount,
    fromIso: customer.startDate,
    toIso: todayIso,
  };
}

export function autoFillMissingDailyEntriesForCycle(
  customer: MilkCustomer,
  fromIso: string,
  toIso: string
): number {
  const allRecords = getStoredDailyMilkRecords();
  const existing = allRecords.filter((r) => r.customerId === customer.id);
  const noMilk = getStoredNoMilkDays(customer.id);
  const todayIso = getTodayISOLocal();
  const capEndIso = toIso < todayIso ? toIso : todayIso;
  if (!fromIso || fromIso > capEndIso) return 0;

  const user = authManager.getCurrentUser();
  const ownerUid = user?.uid || 'guest_local';
  const existingDates = new Set(existing.map((r) => r.date));
  const noMilkDates = new Set(noMilk.map((n) => n.isoDate));

  let added = 0;
  const now = Date.now();
  let cur = new Date(fromIso + 'T00:00:00Z');
  const end = new Date(capEndIso + 'T00:00:00Z');
  let steps = 0;

  while (cur <= end && steps < 400) {
    const iso = cur.toISOString().split('T')[0];
    if (!existingDates.has(iso) && !noMilkDates.has(iso)) {
      const bs = adToBs(cur);
      const bsStr = `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`;
      const rates = getEffectiveRatesForDate(customer, iso);
      const m = customer.morningMilk || 0;
      const e = customer.eveningMilk || 0;
      const totalMilk = Math.round((m + e) * 100) / 100;
      const totalAmount = Math.round(m * rates.morningRate + e * rates.eveningRate);

      allRecords.unshift({
        id: `mrec_${now}_${steps}_${Math.random().toString(36).substring(2, 6)}`,
        ownerUid,
        customerId: customer.id,
        customerName: customer.name,
        date: iso,
        bsDate: bsStr,
        bsYear: bs.year,
        bsMonth: bs.month,
        bsDay: bs.day,
        morningMilk: m,
        eveningMilk: e,
        totalMilk,
        ratePerLtr: rates.morningRate,
        eveningRatePerLtr: rates.eveningRate,
        totalAmount,
        isNoMilk: false,
        note: 'नियमित दैनिक स्वचालित प्रविष्टि (Auto-fill)',
        createdAt: now,
        updatedAt: now,
      });
      added++;
    }
    cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
    steps++;
  }

  if (added > 0) {
    allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(getStorageKey(KEYS.DAILY_RECORDS), JSON.stringify(allRecords));
    saveAuditLog({
      customerId: customer.id,
      customerName: customer.name,
      action: 'daily_entry',
      targetDateBS: customer.startBsDate,
      description: `स्वतः प्रविष्टि: ${added} दिनको नियमित दूध रेकर्ड गरियो (${fromIso} → ${capEndIso})`,
      newData: { added, fromIso, toIso: capEndIso },
    });
    triggerBackgroundCloudSync();
  }

  return added;
}

export function saveBatchDailyMilkRecords(
  entries: Array<{
    customerId: string;
    customerName: string;
    morningMilk: number;
    eveningMilk: number;
    ratePerLtr: number;
    eveningRatePerLtr?: number;
    isNoMilk: boolean;
    note?: string;
  }>,
  dateISO: string,
  bsDate: string
): void {
  const bsParts = bsDate.split('-').map((p) => parseInt(p, 10));
  const bsYear = bsParts[0] || 2083;
  const bsMonth = bsParts[1] || 1;
  const bsDay = bsParts[2] || 1;

  entries.forEach((item) => {
    const totalMilk = item.isNoMilk
      ? 0
      : Math.round((item.morningMilk + item.eveningMilk) * 100) / 100;
    const eRate = item.eveningRatePerLtr ?? item.ratePerLtr;
    const totalAmount = item.isNoMilk
      ? 0
      : Math.round(item.morningMilk * item.ratePerLtr + item.eveningMilk * eRate);

    saveDailyMilkRecord({
      customerId: item.customerId,
      customerName: item.customerName,
      date: dateISO,
      bsDate,
      bsYear,
      bsMonth,
      bsDay,
      morningMilk: item.isNoMilk ? 0 : item.morningMilk,
      eveningMilk: item.isNoMilk ? 0 : item.eveningMilk,
      totalMilk,
      ratePerLtr: item.ratePerLtr,
      eveningRatePerLtr: eRate,
      totalAmount,
      isNoMilk: item.isNoMilk,
      note: item.note,
    });
  });
}

export function deleteDailyMilkRecord(id: string): void {
  const all = getStoredDailyMilkRecords();
  const target = all.find((r) => r.id === id);
  const records = all.filter((r) => r.id !== id);
  localStorage.setItem(getStorageKey(KEYS.DAILY_RECORDS), JSON.stringify(records));
  if (target) {
    saveAuditLog({
      customerId: target.customerId,
      customerName: target.customerName,
      action: 'delete_daily_entry',
      targetDateBS: target.bsDate,
      description: `${target.bsDate} को दैनिक दूध रेकर्ड हटाइयो (${target.totalMilk}L, रु ${target.totalAmount})`,
      prevData: target,
    });
  }
  triggerBackgroundCloudSync();
}

// -------------------------------------------------------------
// 3. AUTOMATIC MONTHLY BILLING CYCLES + FIFO PAYMENT ALLOCATION
// -------------------------------------------------------------

export function getStoredPaymentAllocations(customerId?: string): PaymentAllocation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getStorageKey(KEYS.PAYMENT_ALLOCATIONS));
    if (!raw) return [];
    const list: PaymentAllocation[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return customerId ? list.filter((a) => a.customerId === customerId) : list;
  } catch {
    return [];
  }
}

function countExactDaysInclusive(startIso: string, endIso: string): number {
  const s = new Date(`${startIso}T00:00:00Z`).getTime();
  const e = new Date(`${endIso}T00:00:00Z`).getTime();
  if (isNaN(s) || isNaN(e) || e < s) return 0;
  return Math.round((e - s) / 86400000) + 1;
}

function countExactElapsedDays(startIso: string, endIso: string): number {
  const s = new Date(`${startIso}T00:00:00Z`).getTime();
  const e = new Date(`${endIso}T00:00:00Z`).getTime();
  if (isNaN(s) || isNaN(e) || e < s) return 0;
  return Math.round((e - s) / 86400000);
}

function addDaysISO(baseIso: string, deltaDays: number): string {
  const ms = new Date(`${baseIso}T00:00:00Z`).getTime();
  const d = new Date((isNaN(ms) ? Date.now() : ms) + deltaDays * 86400000);
  return d.toISOString().split('T')[0];
}

function isoToBsFormatted(iso: string): {
  year: number;
  month: number;
  day: number;
  bsDate: string;
  monthNameNe: string;
} {
  const d = new Date(`${iso}T00:00:00Z`);
  const bs = adToBs(isNaN(d.getTime()) ? new Date() : d);
  const bsDate = `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`;
  const monthNameNe = NEPALI_MONTHS[bs.month - 1]?.nameNe || `महिना ${bs.month}`;
  return { ...bs, bsDate, monthNameNe };
}

/**
 * Calculates billing periods for a customer based on the exact number of days
 * between their Milk Start Date and today's date (30 exact-day intervals anchored to startDate,
 * never shifting or drifting across variable 29/30/31/32-day calendar months).
 * Guarantees:
 * 1. Exact start-date-to-today day-count billing periods with zero overlapping or skipped days.
 * 2. Active current period ends cleanly on today's date (or latest record date if future records exist),
 *    reporting exact elapsed days in the period.
 * 3. Clear FIFO Payment Allocation across periods so no payment is ever deducted twice.
 */
export function calculateCustomerBillingCycles(customer: MilkCustomer): MonthlyMilkBill[] {
  const dailyRecords = getStoredDailyMilkRecords(customer.id);
  const payments = getStoredMilkPayments(customer.id);

  const todayIso = getTodayISOLocal();
  let startIso = customer.startDate;
  if (!startIso) {
    const sy = customer.startBsYear || 2083;
    const sm = customer.startBsMonth || 1;
    const sd = Math.min(customer.startBsDay || 1, getBSDaysInMonth(sy, sm));
    try {
      startIso = bsToAd(sy, sm, sd).toISOString().split('T')[0];
    } catch {
      startIso = todayIso;
    }
  }

  let maxRecordIso = todayIso;
  dailyRecords.forEach((r) => {
    if (r.date && r.date > maxRecordIso) {
      maxRecordIso = r.date;
    }
  });

  const spanEndIso = maxRecordIso > todayIso ? maxRecordIso : todayIso;
  const totalSpanDays = startIso <= spanEndIso ? countExactDaysInclusive(startIso, spanEndIso) : 1;
  const CYCLE_DAYS = 30;
  const cycleCount = Math.max(1, Math.ceil(totalSpanDays / CYCLE_DAYS));

  interface RawCycle {
    cycleNum: number;
    cycleId: string;
    cycleName: string;
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
    fromAdMs: number;
  }

  const rawCycles: RawCycle[] = [];

  for (let i = 0; i < cycleCount; i++) {
    const cycleNum = i + 1;
    const fromIso = addDaysISO(startIso, i * CYCLE_DAYS);
    const fullCycleEndIso = addDaysISO(startIso, (i + 1) * CYCLE_DAYS - 1);
    // Current ongoing cycle ends on spanEndIso (today, or maxRecordIso if future entries exist);
    // completed cycles span the exact 30 days. If startIso is in the future, clamp to startIso.
    const toIso =
      startIso > spanEndIso
        ? fromIso
        : fullCycleEndIso <= spanEndIso
        ? fullCycleEndIso
        : spanEndIso;
    const dueDateISO = addDaysISO(startIso, (i + 1) * CYCLE_DAYS);

    const fromBsInfo = isoToBsFormatted(fromIso);
    const toBsInfo = isoToBsFormatted(toIso);
    const dueBsInfo = isoToBsFormatted(dueDateISO);

    const cycleRecords = dailyRecords.filter((r) => r.date >= fromIso && r.date <= toIso);
    const totalDays = Math.max(1, countExactDaysInclusive(fromIso, toIso));

    const cycleName = `${toDevanagari(fromBsInfo.day)} ${fromBsInfo.monthNameNe} - ${toDevanagari(toBsInfo.day)} ${toBsInfo.monthNameNe}`;

    const suppliedDays = cycleRecords.filter((r) => !r.isNoMilk && r.totalMilk > 0).length;
    const noMilkDays = cycleRecords.filter((r) => r.isNoMilk).length;
    const totalMilkLtr =
      Math.round(cycleRecords.reduce((sum, r) => sum + (r.totalMilk || 0), 0) * 100) / 100;
    const currentBillAmount = Math.round(
      cycleRecords.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
    );

    rawCycles.push({
      cycleNum,
      cycleId: `mbill_${customer.id}_cycle_${cycleNum}`,
      cycleName,
      fromBsDate: fromBsInfo.bsDate,
      toBsDate: toBsInfo.bsDate,
      fromIso,
      toIso,
      dueDateBS: dueBsInfo.bsDate,
      dueDateISO,
      totalDays,
      suppliedDays,
      noMilkDays,
      totalMilkLtr,
      currentBillAmount,
      fromAdMs: new Date(`${fromIso}T00:00:00Z`).getTime(),
    });
  }

  // Include any pre-start daily records (dated before Cycle #1) into prior pending so no bill is ever lost
  const earliestCycleIso = rawCycles[0]?.fromIso || customer.startDate || '';
  const preStartAmount = earliestCycleIso
    ? Math.round(
        dailyRecords
          .filter((r) => !r.isNoMilk && r.date < earliestCycleIso)
          .reduce((sum, r) => sum + (r.totalAmount || 0), 0)
      )
    : 0;

  // FIFO Payment Allocation (opening/prior balance first, then oldest unpaid cycle first!)
  const allocatedPerCycle = new Array<number>(rawCycles.length).fill(0);
  const chronologicalPayments = [...payments].sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt
  );

  let remainingOpening = Math.max(0, Math.round((customer.openingBalance || 0) + preStartAmount));
  let unallocatedAdvance = 0;

  chronologicalPayments.forEach((pay) => {
    let remainingPay = Math.round(pay.amount || 0);
    if (remainingPay <= 0) return;

    // 1. Settle opening/pre-start prior pending balance first if present
    if (remainingOpening > 0) {
      const appliedOpening = Math.min(remainingOpening, remainingPay);
      remainingOpening -= appliedOpening;
      remainingPay -= appliedOpening;
    }

    // 2. Allocate remaining payment to oldest unpaid cycles first (FIFO)
    for (let i = 0; i < rawCycles.length && remainingPay > 0; i++) {
      const cycleUnpaid = Math.max(0, rawCycles[i].currentBillAmount - allocatedPerCycle[i]);
      if (cycleUnpaid > 0) {
        const applied = Math.min(cycleUnpaid, remainingPay);
        allocatedPerCycle[i] += applied;
        remainingPay -= applied;
      }
    }

    if (remainingPay > 0) {
      unallocatedAdvance += remainingPay;
    }
  });

  // Build final MonthlyMilkBill objects with cumulative carry-forward pending
  const cycles: MonthlyMilkBill[] = [];
  let runningPending = remainingOpening;

  for (let i = 0; i < rawCycles.length; i++) {
    const rc = rawCycles[i];
    const allocatedPaid = Math.round(allocatedPerCycle[i]);
    const previousPendingAmount = Math.round(runningPending);
    const totalPayable = rc.currentBillAmount + previousPendingAmount;

    const isLast = i === rawCycles.length - 1;
    const advanceCredit = isLast ? Math.round(unallocatedAdvance) : 0;

    // Own unpaid balance for this cycle
    const ownRemaining = Math.max(0, rc.currentBillAmount - allocatedPaid);
    const remainingBalance = Math.max(0, previousPendingAmount + ownRemaining);

    runningPending = remainingBalance;

    let status: 'due' | 'paid' | 'partial' | 'overdue' = 'due';
    if (remainingBalance <= 0) {
      status = 'paid';
    } else if (todayIso > rc.dueDateISO) {
      status = 'overdue';
    } else if (allocatedPaid > 0) {
      status = 'partial';
    } else {
      status = 'due';
    }

    cycles.push({
      id: rc.cycleId,
      ownerUid: customer.ownerUid,
      customerId: customer.id,
      customerName: customer.name,
      customerMobile: customer.mobile,
      cycleNumber: rc.cycleNum,
      cycleName: rc.cycleName,
      fromBsDate: rc.fromBsDate,
      toBsDate: rc.toBsDate,
      fromIso: rc.fromIso,
      toIso: rc.toIso,
      dueDateBS: rc.dueDateBS,
      dueDateISO: rc.dueDateISO,
      totalDays: rc.totalDays,
      suppliedDays: rc.suppliedDays,
      noMilkDays: rc.noMilkDays,
      totalMilkLtr: rc.totalMilkLtr,
      currentBillAmount: rc.currentBillAmount,
      previousPendingAmount,
      totalPayable,
      totalPaid: allocatedPaid + advanceCredit,
      allocatedPaid,
      advanceCredit,
      remainingBalance,
      status,
      createdAt: rc.fromAdMs,
      updatedAt: Date.now(),
    });
  }

  // Return sorted so the latest active cycle is first
  return cycles.reverse();
}

export interface UnpaidMonthBreakdownItem {
  billId: string;
  cycleNumber: number;
  cycleName: string;
  fromBsDate: string;
  toBsDate: string;
  dueDateBS: string;
  dueDateISO: string;
  totalDays: number;
  totalMilkLtr: number;
  suppliedDays: number;
  billAmount: number;
  partialPaidApplied: number;
  unpaidAmount: number;
  isOverdue: boolean;
  overdueDays: number;
  status: 'due' | 'partial' | 'overdue';
}

export interface PendingBalanceBreakdown {
  customerId: string;
  totalBilledAll: number;
  totalPaymentsRecorded: number;
  totalPriorBalance: number;
  priorPaymentApplied: number;
  unpaidPriorBalance: number;
  unpaidMonths: UnpaidMonthBreakdownItem[];
  unpaidCyclesTotalAmount: number;
  unpaidCyclesPaidApplied: number;
  remainingBalance: number;
  advanceCredit: number;
  totalBillingDays: number; // exact days from startDate to today (inclusive)
  pendingDays: number; // actual unpaid milk days count via FIFO daily records
  pendingSinceDays: number; // exact days from earliest unpaid date/startDate to today
  overdueDays: number; // exact overdue days past earliest unpaid dueDateISO
  earliestUnpaidDateISO?: string;
  earliestUnpaidDueISO?: string;
  earliestUnpaidDueBS?: string;
  status: 'paid' | 'due' | 'partial' | 'overdue';
}

/**
 * Iterates through all unpaid billing periods for a customer,
 * sums their bill amounts, subtracts all recorded partial or full payments,
 * and computes exact billing days (startDate -> today) and exact pending/overdue days
 * for display inside Customer Cards & Customer Profile.
 */
export function calculatePendingBalance(
  customer: MilkCustomer,
  precomputedCycles?: MonthlyMilkBill[],
  precomputedPayments?: MilkPayment[],
  precomputedDailyRecords?: DailyMilkRecord[]
): PendingBalanceBreakdown {
  const cycles = precomputedCycles ?? calculateCustomerBillingCycles(customer);
  const payments = precomputedPayments ?? getStoredMilkPayments(customer.id);
  const dailyRecords = precomputedDailyRecords ?? getStoredDailyMilkRecords(customer.id);

  const todayIso = getTodayISOLocal();
  const totalBillingDays =
    customer.startDate && customer.startDate <= todayIso
      ? countExactDaysInclusive(customer.startDate, todayIso)
      : 0;

  const totalPaymentsRecorded = Math.round(
    payments.reduce((sum, p) => sum + (p.amount || 0), 0)
  );

  // Chronological order (Cycle #1 -> Latest)
  const chronological = [...cycles].reverse();
  const oldest = chronological[0];
  const earliestIso = oldest?.fromIso || customer.startDate || '';
  const preStartAmount = earliestIso
    ? Math.round(
        dailyRecords
          .filter((r) => !r.isNoMilk && r.date < earliestIso)
          .reduce((sum, r) => sum + (r.totalAmount || 0), 0)
      )
    : 0;
  const totalPriorBalance = Math.max(0, Math.round((customer.openingBalance || 0) + preStartAmount));

  let totalBilledCycles = 0;
  const unpaidMonths: UnpaidMonthBreakdownItem[] = [];
  let unpaidCyclesTotalAmount = 0;
  let unpaidCyclesPaidApplied = 0;

  // Iterate through every billing cycle and collect all unpaid periods
  for (const bill of chronological) {
    const billAmt = Math.round(bill.currentBillAmount || 0);
    const allocatedPaid = Math.round(bill.allocatedPaid || 0);
    totalBilledCycles += billAmt;

    const unpaidAmt = Math.max(0, billAmt - allocatedPaid);
    if (unpaidAmt > 0) {
      const isOverdue = todayIso > bill.dueDateISO;
      const itemOverdueDays = isOverdue ? countExactElapsedDays(bill.dueDateISO, todayIso) : 0;
      const itemStatus: 'due' | 'partial' | 'overdue' = isOverdue
        ? 'overdue'
        : allocatedPaid > 0
        ? 'partial'
        : 'due';

      unpaidMonths.push({
        billId: bill.id,
        cycleNumber: bill.cycleNumber,
        cycleName: bill.cycleName,
        fromBsDate: bill.fromBsDate,
        toBsDate: bill.toBsDate,
        dueDateBS: bill.dueDateBS,
        dueDateISO: bill.dueDateISO,
        totalDays: bill.totalDays,
        totalMilkLtr: bill.totalMilkLtr,
        suppliedDays: bill.suppliedDays,
        billAmount: billAmt,
        partialPaidApplied: allocatedPaid,
        unpaidAmount: unpaidAmt,
        isOverdue,
        overdueDays: itemOverdueDays,
        status: itemStatus,
      });

      unpaidCyclesTotalAmount += billAmt;
      unpaidCyclesPaidApplied += allocatedPaid;
    }
  }

  const unpaidPriorBalance = oldest
    ? Math.max(0, Math.round(oldest.previousPendingAmount || 0))
    : Math.max(0, totalPriorBalance - totalPaymentsRecorded);
  const priorPaymentApplied = Math.max(0, totalPriorBalance - unpaidPriorBalance);

  const totalBilledAll = totalPriorBalance + totalBilledCycles;
  const remainingFromTotals = Math.max(0, totalBilledAll - totalPaymentsRecorded);
  const remainingFromUnpaidSum = Math.max(
    0,
    unpaidPriorBalance + (unpaidCyclesTotalAmount - unpaidCyclesPaidApplied)
  );
  const remainingBalance = chronological.length > 0 ? remainingFromUnpaidSum : remainingFromTotals;
  const advanceCredit = Math.max(0, totalPaymentsRecorded - totalBilledAll);

  // Exact FIFO day-by-day pending days count over daily records
  const sortedSuppliedRecords = [...dailyRecords]
    .filter((r) => !r.isNoMilk && r.totalAmount > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  let payLeftAfterOpening = Math.max(0, totalPaymentsRecorded - Math.round(customer.openingBalance || 0));
  let unpaidRecordsDays = 0;
  let earliestUnpaidDateISO: string | undefined;

  if (unpaidPriorBalance > 0) {
    earliestUnpaidDateISO = customer.startDate || sortedSuppliedRecords[0]?.date;
  }

  for (const rec of sortedSuppliedRecords) {
    const recAmt = Math.round(rec.totalAmount || 0);
    if (recAmt <= 0) continue;
    if (payLeftAfterOpening >= recAmt) {
      payLeftAfterOpening -= recAmt;
    } else {
      const unpaidPortion = recAmt - payLeftAfterOpening;
      payLeftAfterOpening = 0;
      if (!earliestUnpaidDateISO) {
        earliestUnpaidDateISO = rec.date;
      }
      unpaidRecordsDays += unpaidPortion / recAmt;
    }
  }

  const pendingDays =
    remainingBalance <= 0
      ? 0
      : unpaidRecordsDays > 0
      ? Math.max(1, Math.round(unpaidRecordsDays))
      : 0;

  const pendingSinceDays =
    remainingBalance <= 0
      ? 0
      : earliestUnpaidDateISO && earliestUnpaidDateISO <= todayIso
      ? countExactDaysInclusive(earliestUnpaidDateISO, todayIso)
      : totalBillingDays;

  const oldestOverdueCycle = unpaidMonths.find((m) => m.isOverdue);
  const earliestUnpaidCycle = unpaidMonths[0];
  const earliestUnpaidDueISO = oldestOverdueCycle?.dueDateISO ?? earliestUnpaidCycle?.dueDateISO ?? oldest?.dueDateISO;
  const earliestUnpaidDueBS = oldestOverdueCycle?.dueDateBS ?? earliestUnpaidCycle?.dueDateBS ?? oldest?.dueDateBS;

  let overdueDays = 0;
  if (remainingBalance > 0) {
    if (oldestOverdueCycle) {
      overdueDays = oldestOverdueCycle.overdueDays;
    } else if (unpaidPriorBalance > 0 && oldest && todayIso > oldest.dueDateISO) {
      overdueDays = countExactElapsedDays(oldest.dueDateISO, todayIso);
    }
  }

  const hasOverdue =
    unpaidMonths.some((m) => m.isOverdue) ||
    (unpaidPriorBalance > 0 && oldest ? todayIso > oldest.dueDateISO : false);
  const hasPartial =
    unpaidMonths.some((m) => m.partialPaidApplied > 0) ||
    (unpaidPriorBalance > 0 && totalPaymentsRecorded > 0);

  let status: 'paid' | 'due' | 'partial' | 'overdue' = 'due';
  if (remainingBalance <= 0) {
    status = 'paid';
  } else if (hasOverdue) {
    status = 'overdue';
  } else if (hasPartial) {
    status = 'partial';
  } else {
    status = 'due';
  }

  return {
    customerId: customer.id,
    totalBilledAll,
    totalPaymentsRecorded,
    totalPriorBalance,
    priorPaymentApplied,
    unpaidPriorBalance,
    unpaidMonths,
    unpaidCyclesTotalAmount,
    unpaidCyclesPaidApplied,
    remainingBalance,
    advanceCredit,
    totalBillingDays,
    pendingDays,
    pendingSinceDays,
    overdueDays,
    earliestUnpaidDateISO,
    earliestUnpaidDueISO,
    earliestUnpaidDueBS,
    status,
  };
}

export function getUnpaidMonthsDetail(customer: MilkCustomer): {
  unpaidMonths: number;
  unpaidBillsCount: number;
  unpaidCycleBillsSum: number;
  unpaidPriorBalance: number;
  totalRemaining: number;
  advanceCredit: number;
  totalBillingDays: number;
  pendingDays: number;
  pendingSinceDays: number;
  overdueDays: number;
  status: 'paid' | 'due' | 'partial' | 'overdue';
} {
  const breakdown = calculatePendingBalance(customer);
  const unpaidMonths = breakdown.unpaidMonths.length;
  const unpaidCycleBillsSum = Math.max(
    0,
    breakdown.unpaidCyclesTotalAmount - breakdown.unpaidCyclesPaidApplied
  );
  return {
    unpaidMonths,
    unpaidBillsCount: unpaidMonths + (breakdown.unpaidPriorBalance > 0 ? 1 : 0),
    unpaidCycleBillsSum,
    unpaidPriorBalance: breakdown.unpaidPriorBalance,
    totalRemaining: breakdown.remainingBalance,
    advanceCredit: breakdown.advanceCredit,
    totalBillingDays: breakdown.totalBillingDays,
    pendingDays: breakdown.pendingDays,
    pendingSinceDays: breakdown.pendingSinceDays,
    overdueDays: breakdown.overdueDays,
    status: breakdown.status,
  };
}

// -------------------------------------------------------------
// 4. PAYMENT COLLECTION & AUDIT
// -------------------------------------------------------------

export function getStoredMilkPayments(customerId?: string): MilkPayment[] {
  if (typeof window === 'undefined') return [];
  purgeLegacyDemoMilkDataIfNeeded();
  try {
    const raw = localStorage.getItem(getStorageKey(KEYS.PAYMENTS));
    if (raw === null) {
      return [];
    }
    const parsed: MilkPayment[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (customerId) {
      return parsed.filter((p) => p.customerId === customerId);
    }
    return parsed;
  } catch (err) {
    console.warn('Error reading milk payments:', err);
    return [];
  }
}

export function saveMilkPayment(
  data: Omit<MilkPayment, 'id' | 'receiptNumber' | 'createdAt' | 'updatedAt' | 'auditHistory'>
): { payment: MilkPayment; duplicateDetected: boolean } {
  const payments = getStoredMilkPayments();
  const now = Date.now();
  const user = authManager.getCurrentUser();
  const ownerUid = user?.uid || 'guest_local';

  // Duplicate Payment Protection:
  // If payment with exact same customer and exact amount was saved in the last 20 seconds, flag as duplicate
  const recentDuplicate = payments.find(
    (p) =>
      p.customerId === data.customerId &&
      p.amount === data.amount &&
      now - p.createdAt < 20000
  );

  if (recentDuplicate) {
    return { payment: recentDuplicate, duplicateDetected: true };
  }

  const receiptNum = `MILK-REC-${toDevanagari(payments.length + 101)}`;

  const newPayment: MilkPayment = {
    ...data,
    ownerUid,
    id: `mpay_${now}_${Math.random().toString(36).substring(2, 7)}`,
    receiptNumber: receiptNum,
    auditHistory: [
      {
        action: 'created',
        timestamp: now,
        newAmount: data.amount,
        note: `भुक्तानी संकलन: रु ${data.amount.toLocaleString()} (${data.paymentMethod})${data.transactionRef ? ` • Ref: ${data.transactionRef}` : ''}`,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  payments.unshift(newPayment);
  localStorage.setItem(getStorageKey(KEYS.PAYMENTS), JSON.stringify(payments));

  // Save FIFO Payment Allocation records
  const customers = getStoredMilkCustomers();
  const cust = customers.find((c) => c.id === data.customerId);
  if (cust) {
    const cycles = calculateCustomerBillingCycles(cust).reverse(); // chronological
    const existingAllocs = getStoredPaymentAllocations();
    let rem = data.amount;
    for (const cyc of cycles) {
      if (rem <= 0) break;
      const alreadyAllocForBill = existingAllocs
        .filter((a) => a.billId === cyc.id && a.paymentId !== newPayment.id)
        .reduce((s, a) => s + a.allocatedAmount, 0);
      const dueInCycle = Math.max(0, cyc.currentBillAmount - alreadyAllocForBill);
      if (dueInCycle > 0) {
        const applied = Math.min(dueInCycle, rem);
        existingAllocs.push({
          id: `alloc_${now}_${cyc.cycleNumber}_${Math.random().toString(36).substring(2, 5)}`,
          ownerUid,
          paymentId: newPayment.id,
          customerId: data.customerId,
          billId: cyc.id,
          cycleNumber: cyc.cycleNumber,
          allocatedAmount: applied,
          createdAt: now,
        });
        rem -= applied;
      }
    }
    localStorage.setItem(getStorageKey(KEYS.PAYMENT_ALLOCATIONS), JSON.stringify(existingAllocs));
  }

  saveAuditLog({
    customerId: data.customerId,
    customerName: data.customerName,
    action: 'payment_received',
    targetDateBS: data.bsDate,
    description: `भुक्तानी प्राप्त: रु ${data.amount.toLocaleString()} (${data.paymentMethod.toUpperCase()}) • रसिद: ${receiptNum}`,
    newData: { amount: data.amount, method: data.paymentMethod, txRef: data.transactionRef },
  });

  triggerBackgroundCloudSync();
  return { payment: newPayment, duplicateDetected: false };
}

export function updateMilkPayment(
  id: string,
  newAmount: number,
  newMethod: MilkPaymentMethod,
  note?: string
): MilkPayment | null {
  const payments = getStoredMilkPayments();
  const index = payments.findIndex((p) => p.id === id);
  if (index < 0) return null;

  const current = payments[index];
  const now = Date.now();
  const updated: MilkPayment = {
    ...current,
    amount: newAmount,
    paymentMethod: newMethod,
    note: note !== undefined ? note : current.note,
    updatedAt: now,
    auditHistory: [
      ...(current.auditHistory || []),
      {
        action: 'updated',
        timestamp: now,
        prevAmount: current.amount,
        newAmount,
        note: note || `रकम परिवर्तन: रु ${current.amount} बाट रु ${newAmount}`,
      },
    ],
  };

  payments[index] = updated;
  localStorage.setItem(getStorageKey(KEYS.PAYMENTS), JSON.stringify(payments));

  saveAuditLog({
    customerId: current.customerId,
    customerName: current.customerName,
    action: 'edit_payment',
    targetDateBS: current.bsDate,
    description: `भुक्तानी सम्पादन (${current.receiptNumber}): रु ${current.amount} → रु ${newAmount}`,
    prevData: { amount: current.amount, method: current.paymentMethod },
    newData: { amount: newAmount, method: newMethod },
  });

  triggerBackgroundCloudSync();
  return updated;
}

export function deleteMilkPayment(id: string): void {
  const all = getStoredMilkPayments();
  const target = all.find((p) => p.id === id);
  const payments = all.filter((p) => p.id !== id);
  localStorage.setItem(getStorageKey(KEYS.PAYMENTS), JSON.stringify(payments));

  const allocs = getStoredPaymentAllocations().filter((a) => a.paymentId !== id);
  localStorage.setItem(getStorageKey(KEYS.PAYMENT_ALLOCATIONS), JSON.stringify(allocs));

  if (target) {
    saveAuditLog({
      customerId: target.customerId,
      customerName: target.customerName,
      action: 'delete_payment',
      targetDateBS: target.bsDate,
      description: `भुक्तानी रेकर्ड हटाइयो (${target.receiptNumber}): रु ${target.amount.toLocaleString()}`,
      prevData: target,
    });
  }
  triggerBackgroundCloudSync();
}

// -------------------------------------------------------------
// 5. AUTOMATIC NOTIFICATIONS ENGINE
// -------------------------------------------------------------

export function getDismissedNotificationIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getStorageKey(KEYS.DISMISSED_NOTIFS));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function dismissMilkNotification(notifId: string): void {
  const list = getDismissedNotificationIds();
  if (!list.includes(notifId)) {
    list.push(notifId);
    localStorage.setItem(getStorageKey(KEYS.DISMISSED_NOTIFS), JSON.stringify(list));
  }
}

export function generateMilkNotifications(): MilkNotificationItem[] {
  const customers = getStoredMilkCustomers().filter((c) => c.status !== 'inactive');
  const notifications: MilkNotificationItem[] = [];
  const dismissed = getDismissedNotificationIds();
  const todayIso = getTodayISOLocal();

  customers.forEach((customer) => {
    const cycles = calculateCustomerBillingCycles(customer);
    const activeCycle = cycles[0]; // latest cycle
    if (!activeCycle || activeCycle.remainingBalance <= 0) return;

    // Check earliest unpaid cycle due date so overdue reminders fire accurately
    const oldestUnpaidCycle = [...cycles].reverse().find((c) => c.remainingBalance > 0) || activeCycle;
    const dueTime = new Date(oldestUnpaidCycle.dueDateISO + 'T00:00:00Z').getTime();
    const todayTime = new Date(todayIso + 'T00:00:00Z').getTime();
    const diffDays = Math.round((dueTime - todayTime) / (1000 * 60 * 60 * 24));

    const notifIdBase = `${customer.id}_${oldestUnpaidCycle.id}`;
    const totalDueAmount = activeCycle.remainingBalance;

    if (diffDays === 3) {
      const id = `notif_due3_${notifIdBase}`;
      notifications.push({
        id,
        customerId: customer.id,
        customerName: customer.name,
        customerMobile: customer.mobile,
        type: 'upcoming_due_3days',
        title: `⚠️ MILK PAYMENT REMINDER (३ दिन बाँकी / 3 Days Left)`,
        message: `${customer.name} को दूधको पैसा लिन ३ दिन बाँकी छ (Due: ${oldestUnpaidCycle.dueDateBS} • ${oldestUnpaidCycle.totalDays} दिन)। बाँकी रकम: रु ${totalDueAmount.toLocaleString()}।`,
        dueDateBS: oldestUnpaidCycle.dueDateBS,
        daysRemainingOrOverdue: 3,
        amountDue: totalDueAmount,
        billId: oldestUnpaidCycle.id,
        createdAt: Date.now(),
        isDismissed: dismissed.includes(id),
      });
    } else if (diffDays === 2) {
      const id = `notif_due2_${notifIdBase}`;
      notifications.push({
        id,
        customerId: customer.id,
        customerName: customer.name,
        customerMobile: customer.mobile,
        type: 'upcoming_due_2days',
        title: `🟠 MILK PAYMENT REMINDER (२ दिन बाँकी / 2 Days Left)`,
        message: `${customer.name} को दूधको पैसा लिन २ दिन बाँकी छ (Due: ${oldestUnpaidCycle.dueDateBS} • ${oldestUnpaidCycle.totalDays} दिन)। बाँकी रकम: रु ${totalDueAmount.toLocaleString()}।`,
        dueDateBS: oldestUnpaidCycle.dueDateBS,
        daysRemainingOrOverdue: 2,
        amountDue: totalDueAmount,
        billId: oldestUnpaidCycle.id,
        createdAt: Date.now(),
        isDismissed: dismissed.includes(id),
      });
    } else if (diffDays === 1) {
      const id = `notif_due1_${notifIdBase}`;
      notifications.push({
        id,
        customerId: customer.id,
        customerName: customer.name,
        customerMobile: customer.mobile,
        type: 'upcoming_due_1day',
        title: `🔴 MILK PAYMENT REMINDER (भोलि भुक्तानी मिति / 1 Day Left)`,
        message: `${customer.name} को दूधको पैसा लिन भोलि (${oldestUnpaidCycle.dueDateBS} • ${oldestUnpaidCycle.totalDays} दिन) Due मिति हो। बाँकी रकम: रु ${totalDueAmount.toLocaleString()}।`,
        dueDateBS: oldestUnpaidCycle.dueDateBS,
        daysRemainingOrOverdue: 1,
        amountDue: totalDueAmount,
        billId: oldestUnpaidCycle.id,
        createdAt: Date.now(),
        isDismissed: dismissed.includes(id),
      });
    } else if (diffDays === 0) {
      const id = `notif_today_${notifIdBase}`;
      notifications.push({
        id,
        customerId: customer.id,
        customerName: customer.name,
        customerMobile: customer.mobile,
        type: 'due_today',
        title: `🚨 MILK PAYMENT REMINDER (आज Due मिति / Due Today!)`,
        message: `${customer.name} को ${oldestUnpaidCycle.totalDays} दिनको दूधको पैसा लिन बाँकी छ (Due: ${oldestUnpaidCycle.dueDateBS})। कृपया भुक्तानी लिनुहोस्। रकम: रु ${totalDueAmount.toLocaleString()}`,
        dueDateBS: oldestUnpaidCycle.dueDateBS,
        daysRemainingOrOverdue: 0,
        amountDue: totalDueAmount,
        billId: oldestUnpaidCycle.id,
        createdAt: Date.now(),
        isDismissed: dismissed.includes(id),
      });
    } else if (diffDays < 0) {
      const id = `notif_overdue_${notifIdBase}`;
      notifications.push({
        id,
        customerId: customer.id,
        customerName: customer.name,
        customerMobile: customer.mobile,
        type: 'overdue',
        title: `🔴 MILK PAYMENT OVERDUE (${Math.abs(diffDays)} दिन म्याद नाघेको)`,
        message: `${customer.name} को दूधको बिलको म्याद ${Math.abs(diffDays)} दिन अगाडि (${oldestUnpaidCycle.dueDateBS}) सकिएको छ। बाँकी रकम: रु ${totalDueAmount.toLocaleString()}`,
        dueDateBS: oldestUnpaidCycle.dueDateBS,
        daysRemainingOrOverdue: diffDays,
        amountDue: totalDueAmount,
        billId: oldestUnpaidCycle.id,
        createdAt: Date.now(),
        isDismissed: dismissed.includes(id),
      });
    }
  });

  // Sort most urgent first (overdue -> due today -> 1d -> 2d -> 3d)
  notifications.sort((a, b) => a.daysRemainingOrOverdue - b.daysRemainingOrOverdue);
  return notifications;
}

export function dispatchDailyMilkLocalNotifications(notifications: MilkNotificationItem[]): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const todayKey = getTodayISOLocal();
  let sentMap: Record<string, string> = {};
  try {
    sentMap = JSON.parse(localStorage.getItem(getStorageKey(KEYS.SENT_LOCAL_NOTIFS)) || '{}');
  } catch {}

  let changed = false;
  notifications.forEach((n) => {
    if (n.isDismissed) return;
    if (sentMap[n.id] === todayKey) return;
    dispatchOfflineLocalNotification(n.title, n.message);
    sentMap[n.id] = todayKey;
    changed = true;
  });

  if (changed) {
    localStorage.setItem(getStorageKey(KEYS.SENT_LOCAL_NOTIFS), JSON.stringify(sentMap));
  }
}

export function requestLocalNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return Promise.resolve(false);
  }
  return Notification.requestPermission().then((permission) => permission === 'granted');
}

export function dispatchOfflineLocalNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
      });
    } catch {
      // Ignore if background notification fails
    }
  }
}

// -------------------------------------------------------------
// 6. WHATSAPP BILL SHARING
// -------------------------------------------------------------

export function generateWhatsAppBillText(
  customer: MilkCustomer,
  bill: MonthlyMilkBill,
  shopName: string = 'GAULE DOODH',
  shopPhone?: string
): string {
  const summary = buildGauleDoodhBillSummary(customer, bill.fromIso, bill.toIso, {
    billNumber: `GD-C${bill.cycleNumber}`,
    billTitle: `मासिक दुध बिल — चक्र #${bill.cycleNumber} (${bill.cycleName})`,
  });
  return generateGauleDoodhWhatsAppText(
    summary,
    {
      dairyName: shopName,
      proprietorName: '',
      mobile: shopPhone || '',
      address: '',
    },
    { isFinalEndBill: false }
  );
}

export function openWhatsAppShare(phone: string, text: string): void {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  let url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  if (cleanPhone) {
    const fullPhone = cleanPhone.length === 10 ? `977${cleanPhone}` : cleanPhone;
    url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  }
  openExternalUrl(url);
}

// -------------------------------------------------------------
// 7. EXCEL / CSV EXPORT
// -------------------------------------------------------------

export function exportMilkDataToCSV(customer?: MilkCustomer): void {
  const records = getStoredDailyMilkRecords(customer?.id);
  const rows: string[] = [];

  // CSV Headers with UTF-8 BOM
  rows.push(
    [
      'ग्राहकको नाम',
      'मोबाइल नम्बर',
      'नेपाली मिति (BS)',
      'अंग्रेजी मिति (AD)',
      'बिहान (Ltr)',
      'बेलुका (Ltr)',
      'जम्मा दुध (Ltr)',
      'दर (रु/Ltr)',
      'दैनिक रकम (रु)',
      'स्थिति (Status)',
      'कैफियत',
    ].join(',')
  );

  records.forEach((r) => {
    rows.push(
      [
        `"${r.customerName.replace(/"/g, '""')}"`,
        `"${customer?.mobile || ''}"`,
        `"${r.bsDate}"`,
        `"${r.date}"`,
        r.morningMilk,
        r.eveningMilk,
        r.totalMilk,
        r.ratePerLtr,
        r.totalAmount,
        r.isNoMilk ? '"दूध बन्द (No Milk)"' : '"आपूर्ति (Supplied)"',
        `"${(r.note || '').replace(/"/g, '""')}"`,
      ].join(',')
    );
  });

  const csvContent = '\uFEFF' + rows.join('\n');
  const filename = customer
    ? `Doodh_Record_${customer.name.replace(/\s+/g, '_')}_${Date.now()}.csv`
    : `Doodh_All_Customers_Record_${Date.now()}.csv`;
  void downloadTextFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

// -------------------------------------------------------------
// 8. BACKUP & RESTORE
// -------------------------------------------------------------

// -------------------------------------------------------------
// 7.1. NO MILK DAY RECORDS
// -------------------------------------------------------------

export function getStoredNoMilkDays(customerId?: string): NoMilkDayRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getStorageKey(KEYS.NO_MILK_DAYS));
    if (!raw) return [];
    const list: NoMilkDayRecord[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return customerId ? list.filter((r) => r.customerId === customerId) : list;
  } catch {
    return [];
  }
}

export function saveNoMilkDay(entry: Omit<NoMilkDayRecord, 'id' | 'createdAt'>): NoMilkDayRecord {
  const all = getStoredNoMilkDays();
  const existingIndex = all.findIndex((r) => r.customerId === entry.customerId && r.bsDate === entry.bsDate);
  const now = Date.now();
  let item: NoMilkDayRecord;
  if (existingIndex >= 0) {
    item = { ...all[existingIndex], ...entry };
    all[existingIndex] = item;
  } else {
    item = {
      ...entry,
      id: `nomilk_${now}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
    };
    all.unshift(item);
  }
  localStorage.setItem(getStorageKey(KEYS.NO_MILK_DAYS), JSON.stringify(all));

  // Also update or create daily record with 0 milk and isNoMilk = true
  const daily = getStoredDailyMilkRecords();
  const existingDaily = daily.find((r) => r.customerId === entry.customerId && r.bsDate === entry.bsDate);
  const bsParts = entry.bsDate.split('-').map((p) => parseInt(p, 10));

  saveDailyMilkRecord(
    {
      customerId: entry.customerId,
      customerName: entry.customerName,
      date: entry.isoDate,
      bsDate: entry.bsDate,
      bsYear: bsParts[0] || 2083,
      bsMonth: bsParts[1] || 1,
      bsDay: bsParts[2] || 1,
      morningMilk: 0,
      eveningMilk: 0,
      totalMilk: 0,
      ratePerLtr: 0,
      totalAmount: 0,
      isNoMilk: true,
      note: entry.reason || 'दूध गएन (No Milk Day)',
    },
    existingDaily?.id
  );

  saveAuditLog({
    customerId: entry.customerId,
    customerName: entry.customerName,
    action: 'no_milk_day',
    targetDateBS: entry.bsDate,
    description: `${entry.bsDate} मा दूध गएन (No Milk Day) दर्ता गरियो।`,
    newData: entry,
  });

  triggerBackgroundCloudSync();
  return item;
}

export function deleteNoMilkDay(id: string): void {
  const existingAll = getStoredNoMilkDays();
  const target = existingAll.find((r) => r.id === id);
  const remaining = existingAll.filter((r) => r.id !== id);
  localStorage.setItem(getStorageKey(KEYS.NO_MILK_DAYS), JSON.stringify(remaining));

  if (target) {
    // Also remove synced isNoMilk daily record so Smart Calendar, Monthly Cycles, and Daily History stay consistent
    const allDaily = getStoredDailyMilkRecords();
    const cleanedDaily = allDaily.filter(
      (r) =>
        !(
          r.customerId === target.customerId &&
          r.isNoMilk &&
          (r.bsDate === target.bsDate || r.date === target.isoDate)
        )
    );
    if (cleanedDaily.length !== allDaily.length) {
      localStorage.setItem(getStorageKey(KEYS.DAILY_RECORDS), JSON.stringify(cleanedDaily));
    }

    saveAuditLog({
      customerId: target.customerId,
      customerName: target.customerName,
      action: 'delete_daily_entry',
      targetDateBS: target.bsDate,
      description: `${target.bsDate} को 'दूध गएन (No Milk Day)' रेकर्ड हटाइयो।`,
      prevData: target,
    });
  }

  triggerBackgroundCloudSync();
}

// -------------------------------------------------------------
// 7.2. AUDIT LOGS (Immutable History)
// -------------------------------------------------------------

export function getStoredAuditLogs(customerId?: string): MilkAuditLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getStorageKey(KEYS.AUDIT_LOGS));
    if (!raw) return [];
    const list: MilkAuditLog[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return customerId ? list.filter((a) => a.customerId === customerId) : list;
  } catch {
    return [];
  }
}

export function saveAuditLog(entry: Omit<MilkAuditLog, 'id' | 'timestamp'>): MilkAuditLog {
  const all = getStoredAuditLogs();
  const now = Date.now();
  const log: MilkAuditLog = {
    ...entry,
    id: `audit_${now}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: now,
  };
  all.unshift(log);
  if (all.length > 500) all.length = 500;
  localStorage.setItem(getStorageKey(KEYS.AUDIT_LOGS), JSON.stringify(all));
  triggerBackgroundCloudSync();
  return log;
}

// -------------------------------------------------------------
// 7.3. RATE HISTORY
// -------------------------------------------------------------

export function getStoredRateHistory(customerId?: string): MilkRateHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getStorageKey(KEYS.RATE_HISTORY));
    if (!raw) return [];
    const list: MilkRateHistoryItem[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return customerId ? list.filter((r) => r.customerId === customerId) : list;
  } catch {
    return [];
  }
}

export function saveRateHistory(entry: Omit<MilkRateHistoryItem, 'id' | 'createdAt'>): MilkRateHistoryItem {
  const all = getStoredRateHistory();
  const now = Date.now();
  const item: MilkRateHistoryItem = {
    ...entry,
    id: `rate_${now}_${Math.random().toString(36).substring(2, 6)}`,
    createdAt: now,
  };
  all.unshift(item);
  localStorage.setItem(getStorageKey(KEYS.RATE_HISTORY), JSON.stringify(all));

  const customerName = getStoredMilkCustomers().find((c) => c.id === entry.customerId)?.name || '';

  saveAuditLog({
    customerId: entry.customerId,
    customerName,
    action: 'rate_change',
    targetDateBS: entry.effectiveDateBS,
    description: `नयाँ दर रु ${entry.rate}/L (${entry.effectiveDateBS} देखि लागू) सेट गरियो।`,
    newData: entry,
  });

  triggerBackgroundCloudSync();
  return item;
}

// -------------------------------------------------------------
// 7.4. FINAL BILL (END BILL) GENERATION & STORAGE
// -------------------------------------------------------------

export function getStoredFinalBills(customerId?: string): MilkFinalBill[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getStorageKey(KEYS.FINAL_BILLS));
    if (!raw) return [];
    const list: MilkFinalBill[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return customerId ? list.filter((b) => b.customerId === customerId) : list;
  } catch {
    return [];
  }
}

export function saveFinalBill(bill: MilkFinalBill): void {
  const all = getStoredFinalBills();
  const existingIdx = all.findIndex((b) => b.id === bill.id);
  if (existingIdx >= 0) {
    all[existingIdx] = bill;
  } else {
    all.unshift(bill);
  }
  localStorage.setItem(getStorageKey(KEYS.FINAL_BILLS), JSON.stringify(all));
  triggerBackgroundCloudSync();
}

export function generateFinalEndBill(
  customer: MilkCustomer,
  stopDateISO: string,
  stopDateBS: string,
  reason?: string,
  customStartDateISO?: string,
  customStartDateBS?: string
): MilkFinalBill {
  const effectiveStartISO = customStartDateISO || customer.startDate;
  const effectiveStartBS = customStartDateBS || customer.startBsDate;
  const dailyRecords = getStoredDailyMilkRecords(customer.id);
  const payments = getStoredMilkPayments(customer.id);

  const recordsInPeriod = dailyRecords.filter(
    (r) => r.date >= effectiveStartISO && r.date <= stopDateISO
  );
  const paymentsFromStart = payments.filter((p) => p.date >= effectiveStartISO);

  const summary = buildGauleDoodhBillSummary(customer, effectiveStartISO, stopDateISO, {
    billTitle: 'अन्तिम दुध हिसाब तथा अन्तिम बिल (FINAL END BILL)',
    includePostEndPayments: true,
    dailyRecordsOverride: dailyRecords,
    paymentsOverride: payments,
  });

  const startAd = new Date(`${effectiveStartISO}T00:00:00Z`);
  const stopAd = new Date(`${stopDateISO}T00:00:00Z`);
  const totalCalendarDays = Math.max(
    1,
    Math.round((stopAd.getTime() - startAd.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  const actualDeliveryDays = summary.totalMilkSupplyDays;
  const morningMilkDays = summary.morningSupplyDays;
  const eveningMilkDays = summary.eveningSupplyDays;
  const noMilkDays = summary.totalLossDays;
  const noMilkDatesBS = recordsInPeriod
    .filter((r) => r.isNoMilk || r.totalMilk === 0)
    .map((r) => r.bsDate);

  const morningTotalMilk = summary.morningMilk.totalLiters;
  const eveningTotalMilk = summary.eveningMilk.totalLiters;
  const totalMilkLtr = summary.totalMilk.totalLiters;

  const totalMilkAmount = summary.totalMilkAmount;
  const previousPending = summary.previousOutstandingBalance;
  const totalAmountReceived = summary.totalAmountPaid;
  const finalRemainingBalance = summary.finalRemainingDue;

  const status: 'paid' | 'partial' | 'due' | 'overdue' =
    finalRemainingBalance <= 0 ? 'paid' : totalAmountReceived > 0 ? 'partial' : 'due';

  const bill: MilkFinalBill = {
    id: `mfinal_${customer.id}_${Date.now()}`,
    ownerUid: customer.ownerUid,
    customerId: customer.id,
    customerName: customer.name,
    customerAddress: customer.address,
    customerMobile: customer.mobile,
    customerPhoto: customer.photoUrl,
    startDateBS: effectiveStartBS,
    endDateBS: stopDateBS,
    startDateISO: effectiveStartISO,
    endDateISO: stopDateISO,
    totalCalendarDays,
    actualDeliveryDays,
    morningMilkDays,
    eveningMilkDays,
    noMilkDays,
    noMilkDatesBS,
    morningTotalMilk,
    eveningTotalMilk,
    totalMilkLtr,
    dailyRecords: recordsInPeriod,
    totalMilkAmount,
    previousPending,
    previousPayments: paymentsFromStart,
    totalAmountReceived,
    finalRemainingBalance,
    status,
    generatedAt: Date.now(),
  };

  saveFinalBill(bill);

  // Mark customer inactive/stopped (Data remains 100% intact!)
  toggleMilkCustomerStatus(
    customer.id,
    'inactive',
    reason || `अन्तिम बिल जारी: ${stopDateBS} मा दूध बन्द`
  );

  saveAuditLog({
    customerId: customer.id,
    customerName: customer.name,
    action: 'end_bill',
    targetDateBS: stopDateBS,
    description: `अन्तिम बिल (End Bill) जारी गरियो। बाँकी रकम: रु ${finalRemainingBalance.toLocaleString()}`,
    newData: { billId: bill.id, totalMilkLtr, finalRemainingBalance },
  });

  return bill;
}

export function generateWhatsAppFinalBillText(
  customer: MilkCustomer,
  bill: MilkFinalBill,
  shopName: string = 'GAULE DOODH',
  shopPhone?: string
): string {
  const summary = buildGauleDoodhBillSummary(customer, bill.startDateISO, bill.endDateISO, {
    billNumber: `GD-FINAL-${bill.id.slice(-5).toUpperCase()}`,
    billTitle: 'अन्तिम दुध हिसाब तथा अन्तिम बिल (FINAL END BILL)',
    includePostEndPayments: true,
    dailyRecordsOverride: bill.dailyRecords,
    paymentsOverride: bill.previousPayments,
  });
  return generateGauleDoodhWhatsAppText(
    summary,
    {
      dairyName: shopName,
      proprietorName: '',
      mobile: shopPhone || '',
      address: '',
    },
    { isFinalEndBill: true }
  );
}

export function getUnpaidMonthsCount(customer: MilkCustomer): number {
  const cycles = calculateCustomerBillingCycles(customer);
  return cycles.filter((c) => c.currentBillAmount > (c.allocatedPaid || 0)).length;
}

// -------------------------------------------------------------
// 8. BACKUP & RESTORE
// -------------------------------------------------------------

export function exportMilkBackupJSON(): string {
  const data = {
    exportDate: new Date().toISOString(),
    version: '3.1',
    customers: getStoredMilkCustomers(),
    dailyRecords: getStoredDailyMilkRecords(),
    payments: getStoredMilkPayments(),
    paymentAllocations: getStoredPaymentAllocations(),
    noMilkDays: getStoredNoMilkDays(),
    auditLogs: getStoredAuditLogs(),
    rateHistory: getStoredRateHistory(),
    finalBills: getStoredFinalBills(),
  };
  return JSON.stringify(data, null, 2);
}

export function importMilkBackupJSON(jsonString: string): { success: boolean; message: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.customers || !Array.isArray(parsed.customers)) {
      return { success: false, message: 'अमान्य ब्याकअप फाइल ढाँचा!' };
    }

    localStorage.setItem(getStorageKey(KEYS.CUSTOMERS), JSON.stringify(parsed.customers));

    if (Array.isArray(parsed.dailyRecords)) {
      localStorage.setItem(getStorageKey(KEYS.DAILY_RECORDS), JSON.stringify(parsed.dailyRecords));
    }

    if (Array.isArray(parsed.payments)) {
      localStorage.setItem(getStorageKey(KEYS.PAYMENTS), JSON.stringify(parsed.payments));
    }

    if (Array.isArray(parsed.paymentAllocations)) {
      localStorage.setItem(getStorageKey(KEYS.PAYMENT_ALLOCATIONS), JSON.stringify(parsed.paymentAllocations));
    }

    if (Array.isArray(parsed.noMilkDays)) {
      localStorage.setItem(getStorageKey(KEYS.NO_MILK_DAYS), JSON.stringify(parsed.noMilkDays));
    }

    if (Array.isArray(parsed.auditLogs)) {
      localStorage.setItem(getStorageKey(KEYS.AUDIT_LOGS), JSON.stringify(parsed.auditLogs));
    }

    if (Array.isArray(parsed.rateHistory)) {
      localStorage.setItem(getStorageKey(KEYS.RATE_HISTORY), JSON.stringify(parsed.rateHistory));
    }

    if (Array.isArray(parsed.finalBills)) {
      localStorage.setItem(getStorageKey(KEYS.FINAL_BILLS), JSON.stringify(parsed.finalBills));
    }

    triggerBackgroundCloudSync();
    return { success: true, message: 'ब्याकअप सफलतापूर्वक रिस्टोर भयो!' };
  } catch (err: any) {
    return { success: false, message: `रिस्टोर त्रुटि: ${err.message || 'फाइल पढ्न सकिएन'}` };
  }
}

// -------------------------------------------------------------
// 9. CLOUD SYNC ENGINE (UNLIMITED PAGINATED SHARDS + SAFE BATCHING)
// -------------------------------------------------------------

export const MILK_SHARD_PAGE_SIZE = 400;
export const FIRESTORE_SAFE_BATCH_OPS = 400;

export function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  if (!Array.isArray(items) || items.length === 0) return [];
  const size = Math.max(1, batchSize);
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

interface NormalizedSyncOp {
  colName: string;
  id: string;
  payload: Record<string, any>;
}

async function commitNormalizedOpsInBatches(ops: NormalizedSyncOp[], uid: string): Promise<number> {
  const batches = splitIntoBatches(ops, FIRESTORE_SAFE_BATCH_OPS);
  let committed = 0;
  for (const page of batches) {
    const batch = writeBatch(db);
    page.forEach((op) => {
      batch.set(doc(db, op.colName, op.id), { ...op.payload, ownerUid: uid }, { merge: true });
    });
    await batch.commit();
    committed += page.length;
  }
  return committed;
}

async function fetchPaginatedShards<T extends { id?: string }>(
  uid: string,
  shardPrefix: string,
  chunkCount: number,
  inlineItems: unknown
): Promise<T[]> {
  const combined: T[] = [];
  if (Array.isArray(inlineItems)) {
    combined.push(...(inlineItems as T[]));
  }
  if (chunkCount > 0) {
    const chunkSnaps = await Promise.all(
      Array.from({ length: chunkCount }, (_, idx) =>
        getDoc(doc(db, 'users', uid, 'modules', `${shardPrefix}${idx}`))
      )
    );
    chunkSnaps.forEach((cSnap) => {
      if (cSnap.exists()) {
        const data = cSnap.data();
        if (Array.isArray(data?.items)) {
          combined.push(...(data.items as T[]));
        }
      }
    });
  }
  const deduped = new Map<string, T>();
  combined.forEach((item, idx) => {
    const key = item?.id ? String(item.id) : `__idx_${idx}`;
    deduped.set(key, item);
  });
  return Array.from(deduped.values());
}

export async function pullMilkDataFromCloud(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  const user = authManager.getCurrentUser();
  if (!user || user.isGuest) return false;

  try {
    const userDocRef = doc(db, 'users', user.uid, 'modules', 'milk_management');
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return false;

    const remote = snap.data();
    const localSyncTs = Number(localStorage.getItem(getStorageKey(KEYS.SYNC_TIMESTAMP)) || '0');
    const remoteSyncTs = Number(remote.lastSyncedAt || '0');

    // Hydrate if local has no customer store yet or cloud snapshot is newer
    const hasLocalCustomers = localStorage.getItem(getStorageKey(KEYS.CUSTOMERS)) !== null;
    if (!hasLocalCustomers || remoteSyncTs > localSyncTs) {
      const [customers, dailyRecords, auditLogs] = await Promise.all([
        fetchPaginatedShards<MilkCustomer>(
          user.uid,
          'milk_management_cust_chunk_',
          Number(remote.customerChunkCount || 0),
          remote.customers
        ),
        fetchPaginatedShards<DailyMilkRecord>(
          user.uid,
          'milk_management_daily_chunk_',
          Number(remote.dailyChunkCount || 0),
          remote.dailyRecords
        ),
        fetchPaginatedShards<MilkAuditLog>(
          user.uid,
          'milk_management_audit_chunk_',
          Number(remote.auditChunkCount || 0),
          remote.auditLogs
        ),
      ]);

      if (customers.length > 0 || Array.isArray(remote.customers)) {
        localStorage.setItem(getStorageKey(KEYS.CUSTOMERS), JSON.stringify(customers));
      }
      if (dailyRecords.length > 0 || Array.isArray(remote.dailyRecords)) {
        localStorage.setItem(getStorageKey(KEYS.DAILY_RECORDS), JSON.stringify(dailyRecords));
      }
      if (Array.isArray(remote.payments)) {
        localStorage.setItem(getStorageKey(KEYS.PAYMENTS), JSON.stringify(remote.payments));
      }
      if (Array.isArray(remote.paymentAllocations)) {
        localStorage.setItem(getStorageKey(KEYS.PAYMENT_ALLOCATIONS), JSON.stringify(remote.paymentAllocations));
      }
      if (Array.isArray(remote.noMilkDays)) {
        localStorage.setItem(getStorageKey(KEYS.NO_MILK_DAYS), JSON.stringify(remote.noMilkDays));
      }
      if (auditLogs.length > 0 || Array.isArray(remote.auditLogs)) {
        localStorage.setItem(getStorageKey(KEYS.AUDIT_LOGS), JSON.stringify(auditLogs));
      }
      if (Array.isArray(remote.rateHistory)) {
        localStorage.setItem(getStorageKey(KEYS.RATE_HISTORY), JSON.stringify(remote.rateHistory));
      }
      if (Array.isArray(remote.finalBills)) {
        localStorage.setItem(getStorageKey(KEYS.FINAL_BILLS), JSON.stringify(remote.finalBills));
      }
      localStorage.setItem(getStorageKey(KEYS.SYNC_TIMESTAMP), String(remoteSyncTs));
      purgeLegacyDemoMilkDataIfNeeded(true);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Pull milk cloud data error:', err);
    return false;
  }
}

export async function syncMilkDataWithCloud(): Promise<'synced' | 'offline' | 'error'> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'offline';
  }

  const user = authManager.getCurrentUser();
  if (!user || user.isGuest) {
    return 'synced';
  }

  try {
    const userDocRef = doc(db, 'users', user.uid, 'modules', 'milk_management');
    const customers = getStoredMilkCustomers();
    const dailyRecords = getStoredDailyMilkRecords();
    const payments = getStoredMilkPayments();
    const paymentAllocations = getStoredPaymentAllocations();
    const noMilkDays = getStoredNoMilkDays();
    const auditLogs = getStoredAuditLogs();
    const rateHistory = getStoredRateHistory();
    const finalBills = getStoredFinalBills();
    const notifications = generateMilkNotifications();
    const now = Date.now();

    // 1. Shard large arrays into paginated documents so 1 MiB Firestore document limit is never exceeded
    const custPages =
      customers.length > MILK_SHARD_PAGE_SIZE ? splitIntoBatches(customers, MILK_SHARD_PAGE_SIZE) : [];
    const dailyPages =
      dailyRecords.length > MILK_SHARD_PAGE_SIZE ? splitIntoBatches(dailyRecords, MILK_SHARD_PAGE_SIZE) : [];
    const auditPages =
      auditLogs.length > MILK_SHARD_PAGE_SIZE ? splitIntoBatches(auditLogs, MILK_SHARD_PAGE_SIZE) : [];

    const shardWrites: Promise<void>[] = [];
    custPages.forEach((items, idx) => {
      shardWrites.push(
        setDoc(doc(db, 'users', user.uid, 'modules', `milk_management_cust_chunk_${idx}`), {
          pageIndex: idx,
          totalPages: custPages.length,
          items,
          lastSyncedAt: now,
        })
      );
    });
    dailyPages.forEach((items, idx) => {
      shardWrites.push(
        setDoc(doc(db, 'users', user.uid, 'modules', `milk_management_daily_chunk_${idx}`), {
          pageIndex: idx,
          totalPages: dailyPages.length,
          items,
          lastSyncedAt: now,
        })
      );
    });
    auditPages.forEach((items, idx) => {
      shardWrites.push(
        setDoc(doc(db, 'users', user.uid, 'modules', `milk_management_audit_chunk_${idx}`), {
          pageIndex: idx,
          totalPages: auditPages.length,
          items,
          lastSyncedAt: now,
        })
      );
    });
    if (shardWrites.length > 0) {
      await Promise.all(shardWrites);
    }

    // 2. Primary unified module manifest + inline payloads (when within page threshold)
    await setDoc(
      userDocRef,
      {
        customers: custPages.length > 0 ? [] : customers,
        customerChunkCount: custPages.length,
        customerCount: customers.length,
        dailyRecords: dailyPages.length > 0 ? [] : dailyRecords,
        dailyChunkCount: dailyPages.length,
        dailyRecordsCount: dailyRecords.length,
        payments,
        paymentAllocations,
        noMilkDays,
        auditLogs: auditPages.length > 0 ? [] : auditLogs,
        auditChunkCount: auditPages.length,
        rateHistory,
        finalBills,
        lastSyncedAt: now,
        updatedBy: user.email || user.uid,
      },
      { merge: true }
    );

    // 3. Sync ALL normalized collections with zero .slice() caps via safe 400-write batching
    const ops: NormalizedSyncOp[] = [];
    customers.forEach((c) => {
      ops.push({ colName: 'milk_customers', id: c.id, payload: c });
      const cycles = calculateCustomerBillingCycles(c);
      cycles.forEach((cyc) => {
        ops.push({ colName: 'billing_cycles', id: cyc.id, payload: cyc });
        ops.push({ colName: 'milk_bills', id: cyc.id, payload: cyc });
      });
    });
    dailyRecords.forEach((r) => ops.push({ colName: 'daily_milk_entries', id: r.id, payload: r }));
    noMilkDays.forEach((n) => ops.push({ colName: 'no_milk_days', id: n.id, payload: n }));
    payments.forEach((p) => {
      ops.push({ colName: 'milk_payments', id: p.id, payload: p });
      ops.push({ colName: 'payment_history', id: p.id, payload: p });
    });
    paymentAllocations.forEach((a) => ops.push({ colName: 'payment_allocations', id: a.id, payload: a }));
    rateHistory.forEach((rh) => ops.push({ colName: 'milk_rate_history', id: rh.id, payload: rh }));
    notifications.forEach((nf) => ops.push({ colName: 'notification_records', id: nf.id, payload: nf }));
    auditLogs.forEach((al) => ops.push({ colName: 'audit_logs', id: al.id, payload: al }));
    finalBills.forEach((fb) => ops.push({ colName: 'milk_bills', id: fb.id, payload: fb }));

    if (ops.length > 0) {
      await commitNormalizedOpsInBatches(ops, user.uid);
    }

    localStorage.setItem(getStorageKey(KEYS.SYNC_TIMESTAMP), String(now));
    return 'synced';
  } catch (err) {
    console.warn('Cloud sync background error (local-first storage protected):', err);
    return 'error';
  }
}

let syncTimeout: any = null;
function triggerBackgroundCloudSync() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncMilkDataWithCloud().catch(() => {});
  }, 1500);
}
