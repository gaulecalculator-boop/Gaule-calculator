/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Plus,
  Search,
  Share2,
  Printer,
  FileSpreadsheet,
  Clock,
  Bell,
  Trash2,
  Edit3,
  Camera,
  X,
  PauseCircle,
  PlayCircle,
  Cloud,
  CloudOff,
  RefreshCw,
  Download,
  Upload,
  Receipt,
  DollarSign,
  CalendarDays,
  AlertCircle,
  FileText,
  Zap,
  TrendingUp,
  History,
  ChevronDown,
  ChevronUp,
  Lock,
  KeyRound,
  FileDown,
  Send,
} from 'lucide-react';
import {
  generateCustomerMonthlyBillPDF,
  printThermalReceipt,
  sendWhatsAppReminder,
} from '../../utils/milkExportUtils';
import { printCurrentView, downloadTextFile } from '../../utils/androidBridge';
import { ownerSecurity } from '../../utils/ownerSecurity';
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
} from '../../types/milkManagement';
import {
  getStoredMilkCustomers,
  saveMilkCustomer,
  deleteMilkCustomer,
  toggleMilkCustomerStatus,
  getStoredDailyMilkRecords,
  saveDailyMilkRecord,
  deleteDailyMilkRecord,
  autoFillMissingDailyEntriesForCycle,
  calculateCustomerBillingCycles,
  getStoredMilkPayments,
  saveMilkPayment,
  updateMilkPayment,
  deleteMilkPayment,
  generateMilkNotifications,
  dismissMilkNotification,
  dispatchDailyMilkLocalNotifications,
  requestLocalNotificationPermission,
  generateWhatsAppBillText,
  openWhatsAppShare,
  exportMilkDataToCSV,
  exportMilkBackupJSON,
  importMilkBackupJSON,
  syncMilkDataWithCloud,
  pullMilkDataFromCloud,
  getStoredNoMilkDays,
  saveNoMilkDay,
  deleteNoMilkDay,
  getStoredAuditLogs,
  getStoredRateHistory,
  saveRateHistory,
  getStoredFinalBills,
  generateFinalEndBill,
  getUnpaidMonthsDetail,
  calculatePendingBalance,
  getEffectiveRatesForDate,
  getTodayISOLocal,
  getMissingRegularMilkDaysSummary,
} from '../../utils/milkManagementStorage';
import {
  getTodayBS,
  formatDateToBS,
  adToBs,
  NEPALI_MONTHS,
} from '../../utils/nepaliCalendar';
import { Language } from '../../types';
import {
  translateUserData,
  localizeNumberString,
  isDevanagariLanguage,
} from '../../utils/universalTranslator';
import { NepaliBSDatePicker } from '../common/NepaliBSDatePicker';
import { playTapSound, playSuccessSound } from '../../utils/audio';
import { authManager } from '../../utils/authManager';
import { MilkSmartCalendarModal } from './MilkSmartCalendarModal';
import {
  NoMilkDayModal,
  EndBillModal,
  FinalBillViewerModal,
  StopResumeModal,
} from './MilkEndBillModals';
import {
  CustomerHistoryModal,
  MilkReportsModal,
} from './MilkHistoryAndReportsModal';
import { buildGauleDoodhBillSummary, formatDualDate } from '../../utils/gauleDoodhBillEngine';
import { GauleDoodhTraditionalBill } from './GauleDoodhTraditionalBill';

// Quick Presets for Milk Quantities (पाव, आधा, तीन पाव, १ केजी, १.५ केजी, आदि)
export const MILK_QTY_PRESETS = [
  { label: '0', value: '0', num: 0 },
  { label: 'पाव (0.25)', value: '0.25', num: 0.25 },
  { label: 'आधा (0.5)', value: '0.5', num: 0.5 },
  { label: '3 पाव (0.75)', value: '0.75', num: 0.75 },
  { label: '1 kg/L', value: '1', num: 1 },
  { label: '1.5 kg/L', value: '1.5', num: 1.5 },
  { label: '2 kg/L', value: '2', num: 2 },
];

export const getMilkQtyDisplayLabel = (qty: number | string): string => {
  const val = typeof qty === 'string' ? parseFloat(qty) : qty;
  if (isNaN(val) || val === 0) return '0 (कुनै छैन)';
  if (val === 0.25) return 'पाव भर (0.25 kg/L)';
  if (val === 0.5) return 'आधा केजी (0.5 kg/L)';
  if (val === 0.75) return 'तीन पाव (0.75 kg/L)';
  if (val === 1) return '1 केजी/लिटर';
  if (val === 1.5) return '1.5 केजी (डेढ kg/L)';
  if (val === 2) return '2 केजी/लिटर';
  return `${val} kg/L`;
};

export const formatMilkQtyLabel = (qty: number | string): string => {
  const val = typeof qty === 'string' ? parseFloat(qty) : qty;
  if (isNaN(val) || val === 0) return '0 Ltr';
  if (val === 0.25) return '0.25 L (पाव)';
  if (val === 0.5) return '0.5 L (आधा)';
  if (val === 0.75) return '0.75 L (3 पाव)';
  if (val === 1) return '1 L (1 kg)';
  if (val === 1.5) return '1.5 L (डेढ)';
  if (val === 2) return '2 L (2 kg)';
  return `${val} Ltr`;
};

interface AdvancedMilkManagerProps {
  language: Language;
  showToast: (msg: string) => void;
  onNavigateToCalendarTool?: () => void;
}

export const AdvancedMilkManager: React.FC<AdvancedMilkManagerProps> = ({
  language,
  showToast,
  onNavigateToCalendarTool,
}) => {
  const trData = (val: string | undefined | null) => translateUserData(val || '', language);
  const trNum = (val: string | number) => localizeNumberString(val, language);
  const devNum = (n: number) => localizeNumberString(n, language);
  // Core Data States
  const [customers, setCustomers] = useState<MilkCustomer[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyMilkRecord[]>([]);
  const [payments, setPayments] = useState<MilkPayment[]>([]);
  const [notifications, setNotifications] = useState<MilkNotificationItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'offline' | 'syncing' | 'error'>('synced');

  // Customer Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'active' | 'due' | 'overdue' | 'stopped'>('all');

  // Selected Customer for Detailed Profile & Bills Modal
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  // Expanded Customer Card in list (first click opens full details, second click closes)
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTargetCustomer, setPaymentTargetCustomer] = useState<MilkCustomer | null>(null);

  const [isDailyEntryModalOpen, setIsDailyEntryModalOpen] = useState(false);
  const [dailyEntryCustomer, setDailyEntryCustomer] = useState<MilkCustomer | null>(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<MilkPayment | null>(null);
  const [activeReceiptCustomer, setActiveReceiptCustomer] = useState<MilkCustomer | null>(null);
  const [activeReceiptBill, setActiveReceiptBill] = useState<MonthlyMilkBill | null>(null);

  const [isStopResumeModalOpen, setIsStopResumeModalOpen] = useState(false);
  const [stopResumeCustomer, setStopResumeCustomer] = useState<MilkCustomer | null>(null);
  const [stopReasonInput, setStopReasonInput] = useState('');

  const [isDueCalendarOpen, setIsDueCalendarOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [reportsInitialCustomer, setReportsInitialCustomer] = useState<MilkCustomer | null>(null);

  const [isFutureRateOpen, setIsFutureRateOpen] = useState(false);
  const [futureRateTargetCustomer, setFutureRateTargetCustomer] = useState<MilkCustomer | null>(null);
  const [scheduledRateVal, setScheduledRateVal] = useState('85');
  const [scheduledEveningRateVal, setScheduledEveningRateVal] = useState('');
  const [scheduledRateDateISO, setScheduledRateDateISO] = useState(() => getTodayISOLocal());
  const [scheduledRateNote, setScheduledRateNote] = useState('');

  // Notifications Alert Strip State (NO Dashboard - only alerts drawer)
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [notifPermGranted, setNotifPermGranted] = useState<boolean>(
    () => typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  // In-App Delete Confirmation State (Bypasses iframe window.confirm restriction)
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    id: string;
    name: string;
    type: 'customer' | 'payment' | 'daily';
  } | null>(null);

  // Owner Security PIN Modal & States
  const [isSecurityPinModalOpen, setIsSecurityPinModalOpen] = useState(false);
  const [inputSecurityPin, setInputSecurityPin] = useState('');
  const [securityPinError, setSecurityPinError] = useState('');
  const [isSetPinMode, setIsSetPinMode] = useState(false);
  const [newPinValue, setNewPinValue] = useState('');

  // No Milk Day Modal States
  const [isNoMilkModalOpen, setIsNoMilkModalOpen] = useState(false);
  const [noMilkTargetCustomer, setNoMilkTargetCustomer] = useState<MilkCustomer | null>(null);
  const [noMilkDateISO, setNoMilkDateISO] = useState<string>(() => getTodayISOLocal());
  const [noMilkReasonInput, setNoMilkReasonInput] = useState('दूध गएन (No Milk)');
  const [noMilkConflictConfirm, setNoMilkConflictConfirm] = useState<{
    dateBS: string;
    existingLiters: number;
  } | null>(null);

  // End Bill Modal & Final Bill Viewer States
  const [isEndBillModalOpen, setIsEndBillModalOpen] = useState(false);
  const [endBillTargetCustomer, setEndBillTargetCustomer] = useState<MilkCustomer | null>(null);
  const [endBillStartDateISO, setEndBillStartDateISO] = useState<string>(() => getTodayISOLocal());
  const [endBillStopDateISO, setEndBillStopDateISO] = useState<string>(() => getTodayISOLocal());
  const [endBillReasonInput, setEndBillReasonInput] = useState('दूध बन्द');
  const [isFinalBillViewerOpen, setIsFinalBillViewerOpen] = useState(false);
  const [activeFinalBill, setActiveFinalBill] = useState<MilkFinalBill | null>(null);

  // Customer History Modal States
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTargetCustomer, setHistoryTargetCustomer] = useState<MilkCustomer | null>(null);
  const [historyActiveTab, setHistoryActiveTab] = useState<'bills' | 'payments' | 'daily' | 'nomilk' | 'audit'>('bills');

  // Customer Smart BS Calendar Target
  const [customerCalendarTarget, setCustomerCalendarTarget] = useState<MilkCustomer | null>(null);
  const [isBalanceBreakdownExpanded, setIsBalanceBreakdownExpanded] = useState(true);

  // Persistent storage arrays for extra features
  const [noMilkDays, setNoMilkDays] = useState<NoMilkDayRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<MilkAuditLog[]>([]);
  const [rateHistory, setRateHistory] = useState<MilkRateHistoryItem[]>([]);
  const [finalBills, setFinalBills] = useState<MilkFinalBill[]>([]);

  // Customer Form States (All Required Fields)
  const [custName, setCustName] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custMobile, setCustMobile] = useState('');
  const [custPhoto, setCustPhoto] = useState<string | undefined>(undefined);
  const [custStartDateISO, setCustStartDateISO] = useState<string>(() => getTodayISOLocal());
  const [custMorningMilk, setCustMorningMilk] = useState<string>('2.0');
  const [custEveningMilk, setCustEveningMilk] = useState<string>('1.0');
  const [custRate, setCustRate] = useState<string>('80');
  const [useSeparateEveningRate, setUseSeparateEveningRate] = useState<boolean>(false);
  const [custEveningRate, setCustEveningRate] = useState<string>('');
  const [custStatus, setCustStatus] = useState<'active' | 'stopped' | 'inactive'>('active');
  const [custOpeningBalance, setCustOpeningBalance] = useState<string>('0');
  const [autoFillNewCustomer, setAutoFillNewCustomer] = useState<boolean>(true);
  const [custNotes, setCustNotes] = useState<string>('');

  // Daily Entry Form State (for individual customer quick log & edit)
  const [editingDailyRecordId, setEditingDailyRecordId] = useState<string | null>(null);
  const [entryDateISO, setEntryDateISO] = useState<string>(() => getTodayISOLocal());
  const [entryMorningLtr, setEntryMorningLtr] = useState<number>(2.0);
  const [entryEveningLtr, setEntryEveningLtr] = useState<number>(1.0);
  const [entryIsNoMilk, setEntryIsNoMilk] = useState<boolean>(false);
  const [entryNote, setEntryNote] = useState<string>('');

  // Payment Form States
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  const [paymentTypeOption, setPaymentTypeOption] = useState<'full' | 'partial' | 'advance'>('full');
  const [paymentMethodOption, setPaymentMethodOption] = useState<MilkPaymentMethod>('cash');
  const [paymentDateISO, setPaymentDateISO] = useState<string>(() => getTodayISOLocal());
  const [paymentNoteInput, setPaymentNoteInput] = useState<string>('');
  const [paymentTxRefInput, setPaymentTxRefInput] = useState<string>('');
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);

  // Calendar Today BS
  const todayBS = useMemo(() => getTodayBS(), []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Initial Load & Refresh
  const reloadData = () => {
    const custs = getStoredMilkCustomers();
    setCustomers(custs);
    setDailyRecords(getStoredDailyMilkRecords());
    setPayments(getStoredMilkPayments());
    const notifs = generateMilkNotifications();
    setNotifications(notifs);
    setNoMilkDays(getStoredNoMilkDays());
    setAuditLogs(getStoredAuditLogs());
    setRateHistory(getStoredRateHistory());
    setFinalBills(getStoredFinalBills());
    return notifs;
  };

  useEffect(() => {
    let active = true;
    let lastUid: string | null = '__init__';

    const unsub = authManager.subscribe((user) => {
      if (!active) return;
      const uid = user ? user.uid : 'guest_local';
      if (uid === lastUid) return;
      lastUid = uid;

      const notifs = reloadData();
      dispatchDailyMilkLocalNotifications(notifs);
      if (user && !user.isGuest) {
        pullMilkDataFromCloud().then((pulled) => {
          if (pulled && active) {
            const syncedNotifs = reloadData();
            dispatchDailyMilkLocalNotifications(syncedNotifs);
          }
        });
      }
    });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  // Format English BS Date string helper: e.g. "2083 Kartik 22 (2083-07-22 BS)"
  const formatEnglishBSDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const bs = adToBs(isNaN(d.getTime()) ? new Date() : d);
      const monthObj = NEPALI_MONTHS[bs.month - 1];
      const mNameEn = monthObj ? monthObj.nameEn : `Month ${bs.month}`;
      return `${bs.year} ${mNameEn} ${bs.day} (${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')} BS)`;
    } catch {
      return isoStr;
    }
  };

  // Selected Customer Billing Cycles
  const selectedCustomerBillingCycles = useMemo(() => {
    if (!selectedCustomer) return [];
    return calculateCustomerBillingCycles(selectedCustomer);
  }, [selectedCustomer, dailyRecords, payments]);

  // Overall customer dues map with unpaid bills sum, prior balance, exact day counts & status
  const customerDuesMap = useMemo(() => {
    const map = new Map<
      string,
      {
        totalDue: number;
        totalBilled: number;
        totalPaid: number;
        status: 'paid' | 'due' | 'partial' | 'overdue';
        activeCycle?: MonthlyMilkBill;
        unpaidMonths: number;
        unpaidBillsCount: number;
        unpaidCycleBillsSum: number;
        unpaidPriorBalance: number;
        advanceCredit: number;
        totalBillingDays: number;
        pendingDays: number;
        pendingSinceDays: number;
        overdueDays: number;
        missingSummary: {
          missingDaysCount: number;
          estimatedAmount: number;
          fromIso: string;
          toIso: string;
        };
      }
    >();
    customers.forEach((c) => {
      const cycles = calculateCustomerBillingCycles(c);
      const latest = cycles[0];
      const detail = getUnpaidMonthsDetail(c);
      const custDailyTotal = Math.round(
        dailyRecords
          .filter((r) => r.customerId === c.id && !r.isNoMilk)
          .reduce((sum, r) => sum + (r.totalAmount || 0), 0)
      );
      const totalBilled = custDailyTotal + Math.max(0, Math.round(c.openingBalance || 0));
      const totalPaid = Math.round(
        payments
          .filter((p) => p.customerId === c.id)
          .reduce((sum, p) => sum + (p.amount || 0), 0)
      );
      const missingSummary = getMissingRegularMilkDaysSummary(c);

      map.set(c.id, {
        totalDue: detail.totalRemaining,
        totalBilled,
        totalPaid,
        status: detail.status,
        activeCycle: latest,
        unpaidMonths: detail.unpaidMonths,
        unpaidBillsCount: detail.unpaidBillsCount,
        unpaidCycleBillsSum: detail.unpaidCycleBillsSum,
        unpaidPriorBalance: detail.unpaidPriorBalance,
        advanceCredit: detail.advanceCredit,
        totalBillingDays: detail.totalBillingDays,
        pendingDays: detail.pendingDays,
        pendingSinceDays: detail.pendingSinceDays,
        overdueDays: detail.overdueDays,
        missingSummary,
      });
    });
    return map;
  }, [customers, dailyRecords, payments]);

  // Filtered Customer List
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        c.address.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const dueInfo = customerDuesMap.get(c.id);
      if (customerFilter === 'active') return c.status === 'active';
      if (customerFilter === 'stopped') return c.status === 'stopped' || c.status === 'inactive';
      if (customerFilter === 'due') return (dueInfo?.totalDue || 0) > 0;
      if (customerFilter === 'overdue') return dueInfo?.status === 'overdue';
      return true;
    });
  }, [customers, searchQuery, customerFilter, customerDuesMap]);

  // -------------------------------------------------------------
  // CUSTOMER ADD / EDIT HANDLERS
  // -------------------------------------------------------------

  const handleOpenAddCustomer = () => {
    playTapSound();
    setEditingCustomerId(null);
    setCustName('');
    setCustAddress('');
    setCustMobile('');
    setCustPhoto(undefined);
    setCustStartDateISO(getTodayISOLocal());
    setCustMorningMilk('1.0');
    setCustEveningMilk('0.5');
    setCustRate('80');
    setUseSeparateEveningRate(false);
    setCustEveningRate('');
    setCustStatus('active');
    setCustOpeningBalance('0');
    setAutoFillNewCustomer(true);
    setCustNotes('');
    setIsCustomerModalOpen(true);
  };

  const handleOpenEditCustomer = (cust: MilkCustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playTapSound();
    setEditingCustomerId(cust.id);
    setCustName(cust.name);
    setCustAddress(cust.address);
    setCustMobile(cust.mobile);
    setCustPhoto(cust.photoUrl);
    setCustStartDateISO(cust.startDate);
    setCustMorningMilk(String(cust.morningMilk));
    setCustEveningMilk(String(cust.eveningMilk));
    setCustRate(String(cust.milkRate));
    const hasSepEvening = cust.eveningMilkRate !== undefined && cust.eveningMilkRate !== cust.milkRate;
    setUseSeparateEveningRate(hasSepEvening);
    setCustEveningRate(hasSepEvening ? String(cust.eveningMilkRate) : '');
    setCustStatus(cust.status || 'active');
    setCustOpeningBalance(String(cust.openingBalance || 0));
    setAutoFillNewCustomer(false);
    setCustNotes(cust.notes || '');
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = () => {
    if (!custName.trim()) {
      showToast('कृपया ग्राहकको नाम लेख्नुहोस् (Please enter Customer Name)');
      return;
    }

    const startAd = new Date(custStartDateISO);
    const startBs = adToBs(isNaN(startAd.getTime()) ? new Date() : startAd);
    const startBsStr = `${startBs.year}-${String(startBs.month).padStart(2, '0')}-${String(
      startBs.day
    ).padStart(2, '0')}`;

    const m = parseFloat(custMorningMilk) || 0;
    const ev = parseFloat(custEveningMilk) || 0;
    const r = parseFloat(custRate) || 80;
    const evRateParsed = useSeparateEveningRate ? parseFloat(custEveningRate) : undefined;
    const finalEveningRate = evRateParsed && evRateParsed > 0 ? evRateParsed : undefined;
    const openingBal = Math.max(0, Math.round(parseFloat(custOpeningBalance) || 0));

    const existingCust = editingCustomerId ? customers.find((c) => c.id === editingCustomerId) : undefined;
    const finalStatus = editingCustomerId ? custStatus : 'active';

    playSuccessSound();
    const saved = saveMilkCustomer(
      {
        name: custName.trim(),
        address: custAddress.trim(),
        mobile: custMobile.trim(),
        photoUrl: custPhoto,
        startDate: custStartDateISO,
        startBsDate: startBsStr,
        startBsYear: startBs.year,
        startBsMonth: startBs.month,
        startBsDay: startBs.day,
        morningMilk: m,
        eveningMilk: ev,
        milkRate: r,
        eveningMilkRate: finalEveningRate,
        openingBalance: openingBal,
        futureRate: existingCust?.futureRate,
        status: finalStatus,
        notes: custNotes.trim(),
      },
      editingCustomerId || undefined
    );

    let autoFilledDays = 0;
    const todayIso = getTodayISOLocal();
    if (!editingCustomerId && autoFillNewCustomer && finalStatus === 'active' && m + ev > 0 && custStartDateISO <= todayIso) {
      autoFilledDays = autoFillMissingDailyEntriesForCycle(saved, custStartDateISO, todayIso);
    }

    setIsCustomerModalOpen(false);
    reloadData();
    showToast(
      autoFilledDays > 0
        ? `ग्राहक ${trData(saved.name)} सुरक्षित भयो (${trNum(autoFilledDays)} दिनको नियमित दूध हिसाब जोडियो)!`
        : `ग्राहक ${trData(saved.name)} सुरक्षित भयो! (Customer Saved)`
    );
  };

  const handleDeleteCustomer = (id: string, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playTapSound();
    setDeleteConfirmTarget({ id, name, type: 'customer' });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.8);
        setCustPhoto(compressed);
        playSuccessSound();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // -------------------------------------------------------------
  // DAILY MILK ENTRY PER CUSTOMER
  // -------------------------------------------------------------

  const handleOpenDailyEntry = (
    cust: MilkCustomer,
    e?: React.MouseEvent,
    targetDateISO?: string,
    existingRecord?: DailyMilkRecord
  ) => {
    if (e) e.stopPropagation();
    playTapSound();
    setDailyEntryCustomer(cust);

    if (existingRecord) {
      setEditingDailyRecordId(existingRecord.id);
      setEntryDateISO(existingRecord.date);
      setEntryMorningLtr(existingRecord.morningMilk);
      setEntryEveningLtr(existingRecord.eveningMilk);
      setEntryIsNoMilk(existingRecord.isNoMilk);
      setEntryNote(existingRecord.note || '');
    } else {
      setEditingDailyRecordId(null);
      const dateIso = targetDateISO || getTodayISOLocal();
      setEntryDateISO(dateIso);

      const existing = dailyRecords.find((r) => r.customerId === cust.id && r.date === dateIso);
      if (existing) {
        setEditingDailyRecordId(existing.id);
        setEntryMorningLtr(existing.morningMilk);
        setEntryEveningLtr(existing.eveningMilk);
        setEntryIsNoMilk(existing.isNoMilk);
        setEntryNote(existing.note || '');
      } else {
        setEntryMorningLtr(cust.morningMilk);
        setEntryEveningLtr(cust.eveningMilk);
        setEntryIsNoMilk(cust.status === 'stopped' || cust.status === 'inactive');
        setEntryNote('');
      }
    }
    setIsDailyEntryModalOpen(true);
  };

  const handleSaveDailyEntry = () => {
    if (!dailyEntryCustomer) return;
    playSuccessSound();

    const d = new Date(entryDateISO);
    const bs = adToBs(isNaN(d.getTime()) ? new Date() : d);
    const bsDateStr = `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`;

    const rates = getEffectiveRatesForDate(dailyEntryCustomer, entryDateISO);
    const totalMilk = entryIsNoMilk ? 0 : Math.round((entryMorningLtr + entryEveningLtr) * 100) / 100;
    const totalAmount = entryIsNoMilk
      ? 0
      : Math.round(entryMorningLtr * rates.morningRate + entryEveningLtr * rates.eveningRate);

    saveDailyMilkRecord(
      {
        customerId: dailyEntryCustomer.id,
        customerName: dailyEntryCustomer.name,
        date: entryDateISO,
        bsDate: bsDateStr,
        bsYear: bs.year,
        bsMonth: bs.month,
        bsDay: bs.day,
        morningMilk: entryIsNoMilk ? 0 : entryMorningLtr,
        eveningMilk: entryIsNoMilk ? 0 : entryEveningLtr,
        totalMilk,
        ratePerLtr: rates.morningRate,
        eveningRatePerLtr: rates.eveningRate,
        totalAmount,
        isNoMilk: entryIsNoMilk,
        note: entryNote.trim() || undefined,
      },
      editingDailyRecordId || undefined
    );

    setIsDailyEntryModalOpen(false);
    setEditingDailyRecordId(null);
    reloadData();
    showToast(
      entryIsNoMilk
        ? `${trData(dailyEntryCustomer.name)}: दूध गएन (रु ०) रेकर्ड भयो!`
        : `${trData(dailyEntryCustomer.name)}: ${trNum(totalMilk)}L दुध रेकर्ड भयो (रु ${trNum(totalAmount.toLocaleString())})!`
    );
  };

  // -------------------------------------------------------------
  // PAYMENT COLLECTION & DUPLICATE PROTECTION
  // -------------------------------------------------------------

  const handleOpenPaymentModal = (cust: MilkCustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playTapSound();
    setPaymentTargetCustomer(cust);

    const dueAmount = getUnpaidMonthsDetail(cust).totalRemaining;

    setPaymentAmountInput(dueAmount > 0 ? String(dueAmount) : '1000');
    setPaymentTypeOption(dueAmount > 0 ? 'full' : 'advance');
    setPaymentMethodOption('cash');
    setPaymentDateISO(getTodayISOLocal());
    setPaymentTxRefInput('');
    setPaymentNoteInput('');
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!paymentTargetCustomer || isPaymentSubmitting) return;

    const amt = parseFloat(paymentAmountInput) || 0;
    if (amt <= 0) {
      showToast('कृपया भुक्तानी रकम लेख्नुहोस् (Enter payment amount)');
      return;
    }

    setIsPaymentSubmitting(true);
    playSuccessSound();

    const payAd = new Date(paymentDateISO);
    const payBs = adToBs(isNaN(payAd.getTime()) ? new Date() : payAd);
    const payBsStr = `${payBs.year}-${String(payBs.month).padStart(2, '0')}-${String(payBs.day).padStart(2, '0')}`;

    const cycles = calculateCustomerBillingCycles(paymentTargetCustomer);
    const activeCycle = cycles[0];
    const prevDue = getUnpaidMonthsDetail(paymentTargetCustomer).totalRemaining;
    const remainingAfter = Math.max(0, prevDue - amt);

    const { payment, duplicateDetected } = saveMilkPayment({
      customerId: paymentTargetCustomer.id,
      customerName: paymentTargetCustomer.name,
      billId: activeCycle?.id,
      billingPeriod: activeCycle ? `${activeCycle.fromBsDate} → ${activeCycle.toBsDate}` : undefined,
      totalBillAtPayment: prevDue,
      date: paymentDateISO,
      bsDate: payBsStr,
      amount: amt,
      paymentType: paymentTypeOption,
      paymentMethod: paymentMethodOption,
      remainingBalanceAfter: remainingAfter,
      transactionRef: paymentTxRefInput.trim() || undefined,
      note: paymentNoteInput.trim() || undefined,
    });

    setIsPaymentSubmitting(false);
    setIsPaymentModalOpen(false);
    reloadData();

    if (duplicateDetected) {
      showToast('चेतावनी: डुप्लिकेट भुक्तानी रोकियो (Duplicate payment prevented)');
    } else {
      showToast(`रु ${amt.toLocaleString()} रकम भुक्तानी सुरक्षित भयो!`);
      setActiveReceiptPayment(payment);
      setActiveReceiptCustomer(paymentTargetCustomer);
      setActiveReceiptBill(activeCycle || null);
      setIsReceiptModalOpen(true);
    }
  };

  // -------------------------------------------------------------
  // NO MILK DAY HANDLERS (Section 4)
  // -------------------------------------------------------------

  const handleOpenNoMilkDayModal = (cust: MilkCustomer, e?: React.MouseEvent, targetDateISO?: string) => {
    if (e) e.stopPropagation();
    playTapSound();
    setNoMilkTargetCustomer(cust);
    setNoMilkDateISO(targetDateISO || getTodayISOLocal());
    setNoMilkReasonInput('दूध गएन (No Milk Day)');
    setNoMilkConflictConfirm(null);
    setIsNoMilkModalOpen(true);
  };

  const handleSaveNoMilkDayEntry = (overrideConflict = false) => {
    if (!noMilkTargetCustomer) return;
    const d = new Date(noMilkDateISO);
    const bs = adToBs(isNaN(d.getTime()) ? new Date() : d);
    const bsDateStr = `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`;

    if (!overrideConflict) {
      const existing = dailyRecords.find(
        (r) =>
          r.customerId === noMilkTargetCustomer.id &&
          (r.bsDate === bsDateStr || r.date === noMilkDateISO) &&
          !r.isNoMilk &&
          r.totalMilk > 0
      );
      if (existing) {
        setNoMilkConflictConfirm({
          dateBS: bsDateStr,
          existingLiters: existing.totalMilk,
        });
        return;
      }
    }

    playSuccessSound();
    saveNoMilkDay({
      customerId: noMilkTargetCustomer.id,
      customerName: noMilkTargetCustomer.name,
      bsDate: bsDateStr,
      isoDate: noMilkDateISO,
      reason: noMilkReasonInput.trim() || 'दूध गएन',
    });

    setNoMilkConflictConfirm(null);
    setIsNoMilkModalOpen(false);
    reloadData();
    showToast(`${trData(noMilkTargetCustomer.name)}: ${trNum(bsDateStr)} मा 'दूध गएन (No Milk)' रेकर्ड गरियो!`);
  };

  // -------------------------------------------------------------
  // END BILL (अन्तिम बिल) HANDLERS (Section 12)
  // -------------------------------------------------------------

  const handleOpenEndBillModal = (cust: MilkCustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playTapSound();
    setEndBillTargetCustomer(cust);
    setEndBillStartDateISO(cust.startDate || getTodayISOLocal());
    setEndBillStopDateISO(getTodayISOLocal());
    setEndBillReasonInput('दूध बन्द');
    setIsEndBillModalOpen(true);
  };

  const handleGenerateFinalBill = () => {
    if (!endBillTargetCustomer) return;
    playSuccessSound();
    const startD = new Date(`${endBillStartDateISO}T00:00:00Z`);
    const startBs = adToBs(isNaN(startD.getTime()) ? new Date() : startD);
    const startBsStr = `${startBs.year}-${String(startBs.month).padStart(2, '0')}-${String(startBs.day).padStart(2, '0')}`;

    const d = new Date(`${endBillStopDateISO}T00:00:00Z`);
    const bs = adToBs(isNaN(d.getTime()) ? new Date() : d);
    const bsDateStr = `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`;

    const bill = generateFinalEndBill(
      endBillTargetCustomer,
      endBillStopDateISO,
      bsDateStr,
      endBillReasonInput.trim() || undefined,
      endBillStartDateISO,
      startBsStr
    );

    setIsEndBillModalOpen(false);
    setActiveFinalBill(bill);
    setIsFinalBillViewerOpen(true);
    reloadData();
    showToast(`${trData(endBillTargetCustomer.name)} को अन्तिम बिल (Final Bill) सफलतापूर्वक तयार भयो!`);
  };

  // -------------------------------------------------------------
  // CUSTOMER HISTORY HANDLERS (Section 11)
  // -------------------------------------------------------------

  const handleOpenCustomerHistory = (cust: MilkCustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playTapSound();
    setHistoryTargetCustomer(cust);
    setHistoryActiveTab('bills');
    setIsHistoryModalOpen(true);
  };

  // -------------------------------------------------------------
  // SMART BS CALENDAR HANDLER (Section 6)
  // -------------------------------------------------------------

  const handleOpenCustomerSmartCalendar = (cust: MilkCustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playTapSound();
    setCustomerCalendarTarget(cust);
    setIsDueCalendarOpen(true);
  };

  // -------------------------------------------------------------
  // MILK STOP / RESUME
  // -------------------------------------------------------------

  const handleToggleStopResume = (cust: MilkCustomer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playTapSound();
    setStopResumeCustomer(cust);
    setStopReasonInput(cust.stoppedReason || '');
    setIsStopResumeModalOpen(true);
  };

  const handleConfirmStopResume = () => {
    if (!stopResumeCustomer) return;
    playSuccessSound();
    const isStopped = stopResumeCustomer.status === 'stopped' || stopResumeCustomer.status === 'inactive';
    const newStatus = isStopped ? 'active' : 'stopped';
    toggleMilkCustomerStatus(stopResumeCustomer.id, newStatus, stopReasonInput);
    setIsStopResumeModalOpen(false);
    reloadData();
    showToast(newStatus === 'stopped' ? 'दूध आपूर्ति बन्द गरियो (Paused)' : 'दूध आपूर्ति पुनः सुरु गरियो (Resumed)');
  };

  // -------------------------------------------------------------
  // FUTURE & DATE-WISE MILK RATE SCHEDULING
  // -------------------------------------------------------------

  const handleSaveFutureRate = () => {
    if (!futureRateTargetCustomer) return;
    const rateVal = parseFloat(scheduledRateVal);
    if (!rateVal || rateVal <= 0) {
      showToast('कृपया मान्य दर लेख्नुहोस्');
      return;
    }
    const evRateVal = scheduledEveningRateVal.trim() ? parseFloat(scheduledEveningRateVal) : undefined;
    const finalEvRate = evRateVal && evRateVal > 0 ? evRateVal : undefined;

    const d = new Date(scheduledRateDateISO);
    const bs = adToBs(isNaN(d.getTime()) ? new Date() : d);
    const bsDateStr = `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`;
    const todayIso = getTodayISOLocal();

    saveRateHistory({
      customerId: futureRateTargetCustomer.id,
      rate: rateVal,
      morningRate: rateVal,
      eveningRate: finalEvRate ?? rateVal,
      effectiveDateBS: bsDateStr,
      effectiveDateISO: scheduledRateDateISO,
      note: scheduledRateNote.trim() || undefined,
    });

    const isEffectiveTodayOrPast = scheduledRateDateISO <= todayIso;

    const updatedCustomer: Omit<MilkCustomer, 'id' | 'createdAt' | 'updatedAt'> = {
      ...futureRateTargetCustomer,
      milkRate: isEffectiveTodayOrPast ? rateVal : futureRateTargetCustomer.milkRate,
      eveningMilkRate: isEffectiveTodayOrPast ? finalEvRate : futureRateTargetCustomer.eveningMilkRate,
      futureRate: isEffectiveTodayOrPast
        ? undefined
        : {
            rate: rateVal,
            eveningRate: finalEvRate,
            effectiveDateISO: scheduledRateDateISO,
            effectiveDateBS: bsDateStr,
          },
    };

    saveMilkCustomer(updatedCustomer, futureRateTargetCustomer.id);
    setIsFutureRateOpen(false);
    reloadData();
    showToast(`नयाँ दर रु ${rateVal}/L (${bsDateStr} देखि) सुरक्षित भयो! पुराना रेकर्ड सुरक्षित छन्।`);
  };

  // -------------------------------------------------------------
  // WHATSAPP SHARE
  // -------------------------------------------------------------

  const handleShareWhatsAppBill = (cust: MilkCustomer, bill: MonthlyMilkBill) => {
    playTapSound();
    const text = generateWhatsAppBillText(cust, bill);
    openWhatsAppShare(cust.mobile, text);
  };

  const handleShareWhatsAppReceipt = (cust: MilkCustomer, pay: MilkPayment) => {
    playTapSound();
    const custDisp = trData(cust.name);
    const dateDisp = trNum(pay.bsDate);
    const amtDisp = trNum(pay.amount.toLocaleString());
    const remDisp = trNum(pay.remainingBalanceAfter.toLocaleString());
    const noteDisp = pay.note ? trData(pay.note) : '';
    const text =
      language === 'en'
        ? `*🥛 Payment Receipt*\n` +
          `---------------------------------\n` +
          `Receipt No: *${pay.receiptNumber}*\n` +
          `Customer: *${custDisp}*\n` +
          `Date: *${dateDisp}*\n` +
          `Amount Paid: *Rs. ${amtDisp}*\n` +
          `Method: *${pay.paymentMethod.toUpperCase()}*\n` +
          `Remaining Due: *Rs. ${remDisp}*\n` +
          (noteDisp ? `Remarks: ${noteDisp}\n` : '') +
          `---------------------------------\n` +
          `Thank you for your payment! 🙏`
        : `*🥛 भुक्तानी रसिद (Payment Receipt)*\n` +
          `---------------------------------\n` +
          `रसिद नं: *${pay.receiptNumber}*\n` +
          `ग्राहक: *${custDisp}*\n` +
          `मिति: *${dateDisp}*\n` +
          `भुक्तानी रकम: *रु ${amtDisp}*\n` +
          `विधि: *${pay.paymentMethod.toUpperCase()}*\n` +
          `बाँकी बक्यौता: *रु ${remDisp}*\n` +
          (noteDisp ? `कैफियत: ${noteDisp}\n` : '') +
          `---------------------------------\n` +
          `भुक्तानी गर्नुभएकोमा धन्यवाद! 🙏`;

    openWhatsAppShare(cust.mobile, text);
  };

  // -------------------------------------------------------------
  // CLOUD SYNC
  // -------------------------------------------------------------

  const handleCloudSync = async () => {
    playTapSound();
    setSyncStatus('syncing');
    const res = await syncMilkDataWithCloud();
    setSyncStatus(res);
    if (res === 'synced') showToast('क्लाउड सिंक सम्पन्न भयो! (Synced)');
    else if (res === 'offline') showToast('अफलाइन मोड: स्थानीय डेटा सुरक्षित छ');
    else showToast('सिंक त्रुटि: स्थानीय डेटा सुरक्षित छ');
  };

  const formatMonthDaysDuration = (totalDays: number): string => {
    const safe = Math.max(0, Math.round(totalDays));
    const months = Math.floor(safe / 30);
    const remDays = safe % 30;
    const fmt = (n: number) => (isDevanagariLanguage(language) ? localizeNumberString(n, language) : String(n));
    if (language === 'en') {
      const mLabel = months === 1 ? 'month' : 'months';
      const dLabel = remDays === 1 ? 'day' : 'days';
      if (months > 0 && remDays > 0) return `${months} ${mLabel} ${remDays} ${dLabel}`;
      if (months > 0) return `${months} ${mLabel}`;
      return `${remDays} ${dLabel}`;
    }
    const mWord = language === 'mai' ? 'माह' : language === 'hi' || language === 'bho' ? 'महीना' : 'महिना';
    const dWord = 'दिन';
    if (months > 0 && remDays > 0) {
      return `${fmt(months)} ${mWord} ${fmt(remDays)} ${dWord}`;
    }
    if (months > 0) {
      return `${fmt(months)} ${mWord}`;
    }
    return `${fmt(remDays)} ${dWord}`;
  };

  return (
    <div className="space-y-3.5 pb-20 select-none text-slate-900">
      {/* ========================================================= */}
      {/* 2. THE BIG PRIMARY "+ ADD CUSTOMER" BUTTON & TOOLS        */}
      {/* ========================================================= */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleOpenAddCustomer}
          className="flex-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white py-3.5 px-4 rounded-3xl text-sm font-black shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          <span>+ नयाँ ग्राहक थप्नुहोस् (+ Add Customer)</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 3. CUSTOMER-WISE SEARCH & FILTER BAR                     */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl p-3 shadow-xs border border-slate-200 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ग्राहकको नाम, मोबाइल वा ठेगाना खोज्नुहोस्..."
            className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. CUSTOMER CARDS LIST (SHOWING ALL FIELDS & ACTIONS)    */}
      {/* ========================================================= */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl shadow-inner">
            👥
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-900">कुनै ग्राहक दर्ता गरिएको छैन</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              माथिको "+ नयाँ ग्राहक थप्नुहोस्" बटन थिचेर नयाँ ग्राहकको नाम, ठेगाना, मोबाइल, सुरु मिति र दुध दर दर्ता गर्नुहोस्।
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddCustomer}
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-2xl text-xs font-black shadow-xs active:scale-95 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ नयाँ ग्राहक दर्ता गर्नुहोस्</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((cust) => {
            const dueInfo = customerDuesMap.get(cust.id);
            const hasPending = (dueInfo?.totalDue || 0) > 0;
            const isPaused = cust.status === 'stopped' || cust.status === 'inactive';
            const activeCycle = dueInfo?.activeCycle;
            const isExpanded = expandedCustomerId === cust.id;

            return (
              <div
                key={cust.id}
                onClick={() => {
                  playTapSound();
                  setExpandedCustomerId((prev) => (prev === cust.id ? null : cust.id));
                }}
                className={`bg-white rounded-3xl p-4 border transition shadow-xs cursor-pointer ${
                  isExpanded
                    ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                    : isPaused
                    ? 'border-slate-200 bg-slate-50/70'
                    : dueInfo?.status === 'overdue'
                    ? 'border-rose-300 ring-1 ring-rose-300/50'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                {/* Customer Top Header Info (tap card to open details, tap again to close) */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1 group">
                    {/* Customer Photo */}
                    {cust.photoUrl ? (
                      <img
                        src={cust.photoUrl}
                        alt={cust.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center text-base flex-shrink-0 shadow-xs">
                        {trData(cust.name).substring(0, 1)}
                      </div>
                    )}

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-700 transition truncate">
                          {trData(cust.name)}
                        </h3>
                        {isPaused ? (
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                            दूध बन्द
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                            सक्रिय
                          </span>
                        )}
                      </div>

                      {/* Address & Mobile */}
                      <div className="text-[11px] text-slate-600 font-medium flex items-center gap-2 flex-wrap">
                        {cust.address && <span>📍 {trData(cust.address)}</span>}
                        {cust.mobile && <span>📱 {trNum(cust.mobile)}</span>}
                      </div>

                      {/* Start Date (BS Date) & Exact Total Billing Days */}
                      <div className="text-[11px] text-blue-700 font-bold">
                        📅 सुरु मिति: {trNum(cust.startBsDate)} • कुल अवधि: {devNum(dueInfo?.totalBillingDays || 0)} दिन
                      </div>
                    </div>
                  </div>

                  {/* Due Amount, Status Badge & Quick Delete */}
                  <div className="text-right flex-shrink-0 flex flex-col items-end">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                      बाँकी पैसा (Pending)
                    </span>
                    <span
                      className={`text-base font-black ${
                        hasPending ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      रु {(dueInfo?.totalDue || 0).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap justify-end">
                      {dueInfo && dueInfo.advanceCredit > 0 && (
                        <span className="text-[9px] bg-blue-50 text-blue-700 font-black px-1.5 py-0.5 rounded-md border border-blue-200">
                          Advance: रु {dueInfo.advanceCredit.toLocaleString()}
                        </span>
                      )}
                      {dueInfo && hasPending ? (
                        dueInfo.overdueDays > 0 ? (
                          <span className="text-[9px] bg-rose-50 text-rose-700 font-black px-1.5 py-0.5 rounded-md border border-rose-200">
                            {formatMonthDaysDuration(dueInfo.pendingDays > 0 ? dueInfo.pendingDays : dueInfo.pendingSinceDays)} बाँकी ({formatMonthDaysDuration(dueInfo.overdueDays)} म्याद नाघ्यो)
                          </span>
                        ) : (dueInfo.pendingDays > 0 || dueInfo.pendingSinceDays > 0) ? (
                          <span className="text-[9px] bg-rose-50 text-rose-700 font-black px-1.5 py-0.5 rounded-md border border-rose-200">
                            {formatMonthDaysDuration(dueInfo.pendingDays > 0 ? dueInfo.pendingDays : dueInfo.pendingSinceDays)} बाँकी
                          </span>
                        ) : dueInfo.unpaidPriorBalance > 0 ? (
                          <span className="text-[9px] bg-rose-50 text-rose-700 font-black px-1.5 py-0.5 rounded-md border border-rose-200">
                            पुरानो बाँकी
                          </span>
                        ) : null
                      ) : null}
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                          dueInfo?.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : dueInfo?.status === 'overdue'
                            ? 'bg-rose-100 text-rose-800'
                            : dueInfo?.status === 'partial'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {dueInfo?.status === 'paid'
                          ? 'क्लियर (Paid)'
                          : dueInfo?.status === 'overdue'
                          ? 'म्याद नाघ्यो (Overdue)'
                          : dueInfo?.status === 'partial'
                          ? 'आंशिक (Partial)'
                          : 'बाँकी (Pending)'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteCustomer(cust.id, cust.name, e)}
                      className="p-1.5 mt-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      title="ग्राहक हटाउनुहोस् (Delete Customer)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Customer Details (shown on click, closed on second click) */}
                {isExpanded && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="animate-in fade-in duration-150 cursor-default"
                  >
                    {/* Daily Milk Quantities & Rate Banner */}
                    <div className="grid grid-cols-4 gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 mt-3 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">बिहान</span>
                        <span className="font-black text-slate-800">{formatMilkQtyLabel(cust.morningMilk)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">बेलुका</span>
                        <span className="font-black text-slate-800">{formatMilkQtyLabel(cust.eveningMilk)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">दैनिक जम्मा</span>
                        <span className="font-black text-slate-900">
                          {((cust.morningMilk || 0) + (cust.eveningMilk || 0)).toFixed(2)} L
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">दर (Rate)</span>
                        <span className="font-black text-blue-700">
                          रु {cust.milkRate}
                          {cust.eveningMilkRate && cust.eveningMilkRate !== cust.milkRate ? `/${cust.eveningMilkRate}` : ''}/L
                        </span>
                      </div>
                    </div>

                    {/* Clear Customer Account Summary: Total Billed | Total Paid | Remaining Pending */}
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-900 text-white p-2.5 rounded-2xl mt-2 text-center text-[11px]">
                      <div>
                        <span className="text-[9px] text-slate-300 font-bold block">कुल बिल (Total Bill)</span>
                        <span className="font-black text-white">रु {(dueInfo?.totalBilled || 0).toLocaleString()}</span>
                      </div>
                      <div className="border-x border-slate-700">
                        <span className="text-[9px] text-slate-300 font-bold block">भुक्तानी (Paid)</span>
                        <span className="font-black text-emerald-400">रु {(dueInfo?.totalPaid || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-300 font-bold block">कति पैसा बाँकी (Due)</span>
                        <span className={`font-black ${hasPending ? 'text-rose-400' : 'text-emerald-300'}`}>
                          रु {(dueInfo?.totalDue || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Customer Notes / Future Rate if present */}
                    {(cust.notes || cust.futureRate) && (
                      <div className="mt-2 space-y-1 text-[11px]">
                        {cust.notes && (
                          <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium">
                            📝 नोट: {trData(cust.notes)}
                          </div>
                        )}
                        {cust.futureRate && (
                          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-2.5 py-1.5 text-indigo-800 font-bold">
                            📈 नयाँ दर: रु {trNum(cust.futureRate.rate)}/L ({trNum(cust.futureRate.effectiveDateBS)} देखि लागु)
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inline Missing Regular Milk Catch-up Bar if customer has unfilled days since Start Date */}
                    {dueInfo && dueInfo.missingSummary.missingDaysCount > 0 && !isPaused && (
                      <div className="mt-2 bg-amber-50 border border-amber-200 rounded-2xl px-2.5 py-2 flex items-center justify-between gap-2 text-[11px]">
                        <div className="text-amber-900 font-bold leading-tight">
                          <span>⏳ {trNum(dueInfo.missingSummary.missingDaysCount)} दिनको दूध रेकर्ड छुटेको छ </span>
                          <span className="text-amber-700 font-black">
                            (+ रु {trNum(dueInfo.missingSummary.estimatedAmount.toLocaleString())})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playSuccessSound();
                            const added = autoFillMissingDailyEntriesForCycle(
                              cust,
                              dueInfo.missingSummary.fromIso,
                              dueInfo.missingSummary.toIso
                            );
                            reloadData();
                            showToast(`${trData(cust.name)}: ${trNum(added)} दिनको नियमित दूध हिसाब जोडियो!`);
                          }}
                          className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-xl text-[10px] font-black shadow-2xs active:scale-95 transition cursor-pointer"
                        >
                          हिसाब जोड्नुहोस्
                        </button>
                      </div>
                    )}

                    {/* Next Payment Date & Active Billing Cycle Info + 1-Click WhatsApp Reminder */}
                    <div className="flex items-center justify-between mt-2 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 bg-blue-50/60 rounded-xl border border-blue-100/70 flex-wrap gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span>🗓 अर्को भुक्तानी मिति:</span>
                        <span className="text-blue-900 font-black">{activeCycle ? trNum(activeCycle.dueDateBS) : '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasPending && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playTapSound();
                              sendWhatsAppReminder(
                                cust,
                                dueInfo?.totalDue || 0,
                                dueInfo?.pendingDays || dueInfo?.pendingSinceDays || dueInfo?.totalBillingDays || 1,
                                activeCycle?.dueDateBS
                              );
                            }}
                            className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 transition active:scale-95 shadow-2xs cursor-pointer"
                            title="WhatsApp बाँकी रकम ताकेता (Payment Reminder)"
                          >
                            <Send className="w-2.5 h-2.5" />
                            <span>रिमाइन्डर</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleOpenCustomerSmartCalendar(cust, e)}
                          className="text-[10px] text-blue-700 hover:text-blue-900 underline flex items-center gap-0.5 cursor-pointer"
                          title="स्मार्ट क्यालेन्डर हेर्नुहोस्"
                        >
                          <span>क्यालेन्डर</span>
                          <CalendarDays className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* 6 Essential Action Buttons (Strictly Zero Hajiri Button) */}
                    <div className="grid grid-cols-6 gap-1 mt-3 pt-3 border-t border-slate-100">
                      {/* Action 1: Payment Received */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenPaymentModal(cust, e)}
                        className="flex flex-col items-center justify-center py-2 px-0.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black shadow-xs transition active:scale-95 cursor-pointer"
                        title="भुक्तानी प्राप्त (Payment Received)"
                      >
                        <DollarSign className="w-3.5 h-3.5 mb-0.5" />
                        <span className="truncate">भुक्तानी</span>
                      </button>

                      {/* Action 2: Monthly Bill */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playTapSound();
                          setSelectedCustomerId(cust.id);
                        }}
                        className="flex flex-col items-center justify-center py-2 px-0.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black transition border border-indigo-200/80 active:scale-95 cursor-pointer"
                        title="बिल विवरण (Billing Periods)"
                      >
                        <Receipt className="w-3.5 h-3.5 mb-0.5" />
                        <span className="truncate">बिल विवरण</span>
                      </button>

                      {/* Action 3: No Milk Day */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenNoMilkDayModal(cust, e)}
                        className="flex flex-col items-center justify-center py-2 px-0.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-black transition border border-amber-200/80 active:scale-95 cursor-pointer"
                        title="दूध गएन (No Milk Day)"
                      >
                        <AlertCircle className="w-3.5 h-3.5 mb-0.5 text-amber-700" />
                        <span className="truncate">दूध गएन</span>
                      </button>

                      {/* Action 4: End Bill */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenEndBillModal(cust, e)}
                        className="flex flex-col items-center justify-center py-2 px-0.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-[10px] font-black transition border border-rose-200/80 active:scale-95 cursor-pointer"
                        title="अन्तिम बिल (End Bill)"
                      >
                        <FileText className="w-3.5 h-3.5 mb-0.5 text-rose-700" />
                        <span className="truncate">अन्तिम बिल</span>
                      </button>

                      {/* Action 5: Edit Customer */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditCustomer(cust, e)}
                        className="flex flex-col items-center justify-center py-2 px-0.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-black transition border border-slate-200 active:scale-95 cursor-pointer"
                        title="ग्राहक विवरण सम्पादन (Edit Customer)"
                      >
                        <Edit3 className="w-3.5 h-3.5 mb-0.5" />
                        <span className="truncate">सम्पादन</span>
                      </button>

                      {/* Action 6: Customer History */}
                      <button
                        type="button"
                        onClick={(e) => handleOpenCustomerHistory(cust, e)}
                        className="flex flex-col items-center justify-center py-2 px-0.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-[10px] font-black transition border border-blue-200/80 active:scale-95 cursor-pointer"
                        title="ग्राहक इतिहास (Customer History)"
                      >
                        <Clock className="w-3.5 h-3.5 mb-0.5 text-blue-700" />
                        <span className="truncate">इतिहास</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. ADD / EDIT CUSTOMER MODAL (ALL 8 REQUIRED FIELDS)      */}
      {/* ========================================================= */}
      {isCustomerModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCustomerModalOpen(false);
          }}
          className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl p-4 sm:p-5 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Title */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>{editingCustomerId ? 'ग्राहक विवरण सम्पादन' : 'नयाँ दुध ग्राहक फारम (New Customer Form)'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Field 1: Customer Photo (क्यामरा / अपलोड) */}
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              {custPhoto ? (
                <div className="relative">
                  <img
                    src={custPhoto}
                    alt="Customer"
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setCustPhoto(undefined)}
                    className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-white border-2 border-dashed border-blue-300 flex items-center justify-center text-blue-500 shadow-xs">
                  <Camera className="w-6 h-6" />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800 block">
                  ग्राहकको फोटो (Customer Photo)
                </label>
                <label className="inline-block bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold py-1.5 px-3 rounded-xl border border-slate-200 cursor-pointer transition shadow-2xs">
                  <span>फोटो छान्नुहोस् / क्यामरा</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Field 2: Customer Name */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                १. ग्राहकको पूरा नाम (Customer Name) *
              </label>
              <input
                type="text"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                placeholder="उदा. राम बहादुर श्रेष्ठ"
                className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Field 3: Address & Field 4: Mobile Number */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  २. ठेगाना (Address)
                </label>
                <input
                  type="text"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  placeholder="उदा. बनेपा-४, काभ्रे"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  ३. मोबाइल नम्बर (Mobile Number)
                </label>
                <input
                  type="tel"
                  value={custMobile}
                  onChange={(e) => setCustMobile(e.target.value)}
                  placeholder="98XXXXXXXX"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Field 5: Milk Start Date (Nepali BS Calendar) */}
            <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-100 space-y-1.5">
              <label className="text-xs font-black text-blue-900 block">
                ४. दूध सुरु मिति (Milk Start Date - BS Calendar) *
              </label>
              <NepaliBSDatePicker
                value={custStartDateISO}
                onChange={(iso) => setCustStartDateISO(iso)}
                buttonClassName="w-full bg-white text-xs font-bold py-2"
              />
              <div className="text-[11px] text-blue-800 font-bold mt-1">
                🗓 बिलिंग अवधि सुरु: {formatEnglishBSDate(custStartDateISO)}
              </div>
              <p className="text-[10px] text-slate-500">
                ग्राहकको बिलिंग अवधि र बकाया समय यही सुरु मितिदेखि आजसम्मको सटीक दिनको गन्ती (३० दिनको चक्र) अनुसार गणना हुनेछ।
              </p>
            </div>

            {/* Field 6: Morning Milk, Field 7: Evening Milk & Field 8: Milk Rate */}
            <div className="space-y-3 text-xs">
              {/* Field 5: Morning Milk */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/90 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🌅</span>
                    <span>५. बिहान दुध (Morning Milk)</span>
                  </label>
                  <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                    {getMilkQtyDisplayLabel(custMorningMilk)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    value={custMorningMilk}
                    onChange={(e) => setCustMorningMilk(e.target.value)}
                    placeholder="०.२५, ०.५, १.५..."
                    className="w-24 p-2 rounded-xl border border-slate-200 font-black text-center bg-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <div className="flex-1 flex flex-wrap gap-1">
                    {MILK_QTY_PRESETS.map((p) => {
                      const isSelected = parseFloat(custMorningMilk) === p.num;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setCustMorningMilk(p.value)}
                          className={`text-[10px] font-black px-2 py-1 rounded-lg border transition cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Field 6: Evening Milk */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/90 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🌇</span>
                    <span>६. बेलुका दुध (Evening Milk)</span>
                  </label>
                  <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                    {getMilkQtyDisplayLabel(custEveningMilk)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    value={custEveningMilk}
                    onChange={(e) => setCustEveningMilk(e.target.value)}
                    placeholder="०.२५, ०.५, १.५..."
                    className="w-24 p-2 rounded-xl border border-slate-200 font-black text-center bg-white text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <div className="flex-1 flex flex-wrap gap-1">
                    {MILK_QTY_PRESETS.map((p) => {
                      const isSelected = parseFloat(custEveningMilk) === p.num;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setCustEveningMilk(p.value)}
                          className={`text-[10px] font-black px-2 py-1 rounded-lg border transition cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Field 7: Milk Rate (+ Optional Separate Evening Rate) */}
              <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">
                    ७. दुध दर (Milk Rate प्रति Ltr/kg) *
                  </label>
                  <span className="text-[11px] font-black text-blue-700">
                    रु {custRate} / L
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-500">रु</span>
                  <input
                    type="number"
                    step="any"
                    value={custRate}
                    onChange={(e) => setCustRate(e.target.value)}
                    placeholder="80"
                    className="w-24 p-2 rounded-xl border border-blue-200 font-black text-center bg-white text-sm text-blue-700 focus:border-blue-500 focus:outline-none"
                  />
                  <div className="flex-1 flex flex-wrap gap-1">
                    {['60', '70', '75', '80', '85', '90', '100'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setCustRate(r)}
                        className={`text-[10px] font-black px-2 py-1 rounded-lg border transition cursor-pointer active:scale-95 ${
                          custRate === r
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        रु {r}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 text-[11px] font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSeparateEveningRate}
                    onChange={(e) => {
                      setUseSeparateEveningRate(e.target.checked);
                      if (e.target.checked && !custEveningRate) {
                        setCustEveningRate(custRate);
                      }
                    }}
                    className="rounded border-slate-300"
                  />
                  <span>बेलुकाको दूधको अलग दर राख्ने? (Separate Evening Rate)</span>
                </label>

                {useSeparateEveningRate && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] font-bold text-indigo-700">बेलुका दर: रु</span>
                    <input
                      type="number"
                      step="any"
                      value={custEveningRate}
                      onChange={(e) => setCustEveningRate(e.target.value)}
                      placeholder={custRate}
                      className="w-24 p-1.5 rounded-xl border border-indigo-200 font-black text-center bg-white text-xs text-indigo-700 focus:border-indigo-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">प्रति लिटर</span>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Status (Active / Stopped / Inactive) when Editing */}
            {editingCustomerId && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  ग्राहक स्थिति (Customer Status)
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs font-black">
                  {(
                    [
                      { id: 'active', label: 'सक्रिय (Active)' },
                      { id: 'stopped', label: 'रोकिएको (Stopped)' },
                      { id: 'inactive', label: 'बन्द (Inactive)' },
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setCustStatus(st.id)}
                      className={`py-2 rounded-xl border text-center cursor-pointer transition ${
                        custStatus === st.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Opening Previous Balance (Optional) */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                ८. अघिल्लो / पुरानो बाँकी रकम (Opening Balance - रु, Optional)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={custOpeningBalance}
                onChange={(e) => setCustOpeningBalance(e.target.value)}
                placeholder="0"
                className="w-full p-2.5 rounded-xl border border-slate-200 font-black text-xs text-rose-700 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {!editingCustomerId && (
              <label className="flex items-start gap-2 bg-blue-50/70 p-2.5 rounded-2xl border border-blue-100 text-[11px] font-bold text-blue-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoFillNewCustomer}
                  onChange={(e) => setAutoFillNewCustomer(e.target.checked)}
                  className="mt-0.5 rounded border-blue-300"
                />
                <span>
                  सुरु मितिदेखि आजसम्मको नियमित दूध रेकर्ड स्वतः जोड्नुहोस् (Auto-calculate daily milk from Start Date to Today)
                </span>
              </label>
            )}

            {/* Optional Notes */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                ९. कैफियत / नोट (Notes - Optional)
              </label>
              <input
                type="text"
                value={custNotes}
                onChange={(e) => setCustNotes(e.target.value)}
                placeholder="उदा. भैंसीको शुद्ध दुध, दैनिक नियमित"
                className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-xs focus:outline-none"
              />
            </div>

            {/* Save and Delete Actions */}
            <div className="pt-2 flex items-center justify-between gap-2">
              {editingCustomerId ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const cust = customers.find((c) => c.id === editingCustomerId);
                      if (cust) {
                        handleDeleteCustomer(cust.id, cust.name);
                        setIsCustomerModalOpen(false);
                      }
                    }}
                    className="py-3 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs flex items-center justify-center gap-1 transition border border-rose-200 cursor-pointer"
                    title="यो ग्राहक हटाउनुहोस्"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>हटाउनुहोस् (Delete)</span>
                  </button>
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      type="button"
                      onClick={() => setIsCustomerModalOpen(false)}
                      className="w-1/2 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                    >
                      रद्द
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCustomer}
                      className="w-1/2 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md active:scale-95 transition cursor-pointer"
                    >
                      अपडेट गर्नुहोस्
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsCustomerModalOpen(false)}
                    className="w-1/3 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                  >
                    रद्द गर्नुहोस्
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustomer}
                    className="w-2/3 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md active:scale-95 transition cursor-pointer"
                  >
                    सुरक्षित गर्नुहोस् (Save Customer)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. DAILY MILK ENTRY MODAL (FOR SELECTED CUSTOMER)        */}
      {/* ========================================================= */}
      {isDailyEntryModalOpen && dailyEntryCustomer && (() => {
        const effRates = getEffectiveRatesForDate(dailyEntryCustomer, entryDateISO);
        const liveTotalMilk = entryIsNoMilk ? 0 : Math.round((entryMorningLtr + entryEveningLtr) * 100) / 100;
        const liveTotalAmt = entryIsNoMilk
          ? 0
          : Math.round(entryMorningLtr * effRates.morningRate + entryEveningLtr * effRates.eveningRate);

        return (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsDailyEntryModalOpen(false);
                setEditingDailyRecordId(null);
              }
            }}
            className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 space-y-3.5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {editingDailyRecordId ? 'दैनिक दुध सम्पादन (Edit Milk Entry)' : 'दैनिक दुध प्रविष्टि (Daily Milk Entry)'}
                  </h3>
                  <p className="text-[11px] text-blue-600 font-bold">
                    {trData(dailyEntryCustomer.name)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDailyEntryModalOpen(false);
                    setEditingDailyRecordId(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Date Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  प्रविष्टि मिति (BS Date)
                </label>
                <NepaliBSDatePicker
                  value={entryDateISO}
                  onChange={(iso) => {
                    setEntryDateISO(iso);
                    const existing = dailyRecords.find(
                      (r) => r.customerId === dailyEntryCustomer.id && r.date === iso
                    );
                    if (existing) {
                      setEditingDailyRecordId(existing.id);
                      setEntryMorningLtr(existing.morningMilk);
                      setEntryEveningLtr(existing.eveningMilk);
                      setEntryIsNoMilk(existing.isNoMilk);
                      setEntryNote(existing.note || '');
                    } else {
                      setEditingDailyRecordId(null);
                      setEntryMorningLtr(dailyEntryCustomer.morningMilk);
                      setEntryEveningLtr(dailyEntryCustomer.eveningMilk);
                      setEntryIsNoMilk(false);
                      setEntryNote('');
                    }
                  }}
                  buttonClassName="w-full text-xs"
                />
              </div>

              {/* No Milk (छुट्टी) Toggle Button */}
              <button
                type="button"
                onClick={() => setEntryIsNoMilk(!entryIsNoMilk)}
                className={`w-full py-2.5 rounded-2xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  entryIsNoMilk
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {entryIsNoMilk ? '🚫 आज दूध बन्द छ (छुट्टी / रु ० रेकर्ड हुनेछ)' : 'आज दूध छुट्टी / बन्द गर्ने हो?'}
              </button>

              {!entryIsNoMilk ? (
                <div className="space-y-3">
                  <div className="space-y-2 text-xs">
                    {/* Morning Milk */}
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-800 flex items-center gap-1">
                          <span>🌅</span>
                          <span>बिहान दुध (Morning Ltr)</span>
                        </label>
                        <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          {getMilkQtyDisplayLabel(entryMorningLtr)} • रु {effRates.morningRate}/L
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="any"
                          value={entryMorningLtr === 0 ? '' : entryMorningLtr}
                          onChange={(e) => setEntryMorningLtr(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-20 p-2 rounded-xl border border-slate-200 font-black text-center bg-white text-sm"
                        />
                        <div className="flex-1 flex flex-wrap gap-1">
                          {MILK_QTY_PRESETS.map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => setEntryMorningLtr(p.num)}
                              className={`text-[10px] font-black px-1.5 py-1 rounded-lg border transition cursor-pointer active:scale-95 ${
                                entryMorningLtr === p.num
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Evening Milk */}
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-800 flex items-center gap-1">
                          <span>🌇</span>
                          <span>बेलुका दुध (Evening Ltr)</span>
                        </label>
                        <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                          {getMilkQtyDisplayLabel(entryEveningLtr)} • रु {effRates.eveningRate}/L
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="any"
                          value={entryEveningLtr === 0 ? '' : entryEveningLtr}
                          onChange={(e) => setEntryEveningLtr(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="w-20 p-2 rounded-xl border border-slate-200 font-black text-center bg-white text-sm"
                        />
                        <div className="flex-1 flex flex-wrap gap-1">
                          {MILK_QTY_PRESETS.map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => setEntryEveningLtr(p.num)}
                              className={`text-[10px] font-black px-1.5 py-1 rounded-lg border transition cursor-pointer active:scale-95 ${
                                entryEveningLtr === p.num
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Amount Calculation */}
                  <div className="bg-blue-50 p-3 rounded-2xl text-center text-xs border border-blue-100">
                    <span className="text-blue-800 font-bold block text-[11px]">
                      जम्मा दुध: {liveTotalMilk.toFixed(2)} Ltr (बिहान रु{effRates.morningRate} • बेलुका रु{effRates.eveningRate})
                    </span>
                    <span className="text-base font-black text-blue-900">
                      कुल दैनिक रकम: रु {liveTotalAmt.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-rose-50 text-rose-800 rounded-2xl text-center text-xs font-bold border border-rose-100">
                  🚫 यो मितिमा कुनै दुध आपूर्ति भएको छैन भनी रेकर्ड हुनेछ।
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  टिप्पणी / कैफियत (Remarks - Optional)
                </label>
                <input
                  type="text"
                  value={entryNote}
                  onChange={(e) => setEntryNote(e.target.value)}
                  placeholder="उदा. बिहान मात्र दूध लगियो"
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsDailyEntryModalOpen(false);
                    setEditingDailyRecordId(null);
                  }}
                  className="w-1/3 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  रद्द
                </button>
                <button
                  type="button"
                  onClick={handleSaveDailyEntry}
                  className="w-2/3 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md active:scale-95 transition cursor-pointer"
                >
                  {editingDailyRecordId ? 'अपडेट सुरक्षित गर्नुहोस्' : 'रेकर्ड सुरक्षित गर्नुहोस्'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* 7. CUSTOMER DETAILED PROFILE & MONTHLY BILLS MODAL        */}
      {/* ========================================================= */}
      {selectedCustomer && (() => {
        const custDueDetail = customerDuesMap.get(selectedCustomer.id);
        const latestCycle = selectedCustomerBillingCycles[0];
        const custFinalBills = finalBills.filter((b) => b.customerId === selectedCustomer.id);
        const custDaily = dailyRecords.filter((r) => r.customerId === selectedCustomer.id);
        const custPaymentsForProfile = payments.filter((p) => p.customerId === selectedCustomer.id);
        const todayIso = getTodayISOLocal();
        const daysLeftToDue = latestCycle
          ? Math.round(
              (new Date(latestCycle.dueDateISO + 'T00:00:00Z').getTime() -
                new Date(todayIso + 'T00:00:00Z').getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null;
        const isStoppedOrInactive =
          selectedCustomer.status === 'stopped' || selectedCustomer.status === 'inactive';

        const balanceBreakdown = calculatePendingBalance(
          selectedCustomer,
          selectedCustomerBillingCycles,
          custPaymentsForProfile,
          custDaily
        );
        const unpaidCycleBillsSum = Math.max(
          0,
          balanceBreakdown.unpaidCyclesTotalAmount - balanceBreakdown.unpaidCyclesPaidApplied
        );
        const unpaidPriorBalance = balanceBreakdown.unpaidPriorBalance;
        const profileRemainingBalance = balanceBreakdown.remainingBalance;
        const profileTotalBilled = balanceBreakdown.totalBilledAll;
        const profileTotalPaid = balanceBreakdown.totalPaymentsRecorded;
        const profileAdvanceCredit = balanceBreakdown.advanceCredit;
        const profilePendingStatus = balanceBreakdown.status;
        const unpaidCycleCount = balanceBreakdown.unpaidMonths.length;
        const totalBillingDays = balanceBreakdown.totalBillingDays;
        const profilePendingDays =
          balanceBreakdown.pendingDays > 0
            ? balanceBreakdown.pendingDays
            : balanceBreakdown.pendingSinceDays;
        const profileOverdueDays = balanceBreakdown.overdueDays;

        return (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedCustomerId(null);
            }}
            className="fixed inset-0 z-[45] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          >
            <div className="bg-white w-full max-w-lg max-h-[93vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedCustomer.photoUrl ? (
                    <img
                      src={selectedCustomer.photoUrl}
                      alt={selectedCustomer.name}
                      className="w-11 h-11 rounded-2xl object-cover border border-white/30 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-white/20 text-white font-black flex items-center justify-center text-base shadow-inner shrink-0">
                      {trData(selectedCustomer.name).substring(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-black text-white truncate">
                        {trData(selectedCustomer.name)}
                      </h3>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-white/20">
                        {selectedCustomer.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-100 truncate">
                      {selectedCustomer.address ? trData(selectedCustomer.address) : 'स्थानीय'} • सुरु: {trNum(selectedCustomer.startBsDate)}
                    </p>
                    <p className="text-[9px] text-blue-200/80 font-mono truncate">
                      ID: {selectedCustomer.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomer(selectedCustomer.id, selectedCustomer.name)}
                    className="p-2 bg-rose-500/20 hover:bg-rose-600 text-rose-100 hover:text-white rounded-xl transition cursor-pointer"
                    title="ग्राहक हटाउनुहोस्"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId(null)}
                    className="p-2 bg-white/15 hover:bg-white/25 text-white rounded-xl transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Profile Content */}
              <div className="p-4 overflow-y-auto space-y-3.5">
                {/* Profile Status & Pending Banner */}
                <div className="bg-slate-900 text-white rounded-2xl p-3 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-300 font-bold">
                          कुल बाँकी रकम (Remaining Balance)
                        </span>
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                            profilePendingStatus === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                              : profilePendingStatus === 'overdue'
                              ? 'bg-rose-500/25 text-rose-200 border border-rose-400/40'
                              : profilePendingStatus === 'partial'
                              ? 'bg-blue-500/25 text-blue-200 border border-blue-400/40'
                              : 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
                          }`}
                        >
                          {profilePendingStatus === 'paid'
                            ? 'चुक्ता (Paid ✓)'
                            : profilePendingStatus === 'overdue'
                            ? 'म्याद नाघ्यो (Overdue)'
                            : profilePendingStatus === 'partial'
                            ? 'आंशिक बाँकी (Partial)'
                            : 'बाँकी (Pending)'}
                        </span>
                      </div>
                      <span
                        className={`text-lg font-black block mt-0.5 ${
                          profileRemainingBalance > 0 ? 'text-white' : 'text-emerald-300'
                        }`}
                      >
                        रु {profileRemainingBalance.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-300 font-bold block">
                        {unpaidCycleCount > 0 && unpaidPriorBalance > 0
                          ? `${devNum(profilePendingDays)} दिन बाँकी (रु ${trNum(unpaidCycleBillsSum.toLocaleString())}) + पुरानो बाँकी (रु ${trNum(unpaidPriorBalance.toLocaleString())})`
                          : unpaidCycleCount > 0
                          ? `${devNum(profilePendingDays)} दिन बाँकी (${trNum(profilePendingDays)} unpaid days) • कुल अवधि: ${devNum(totalBillingDays)} दिन`
                          : unpaidPriorBalance > 0
                          ? `पुरानो / सुरुवाती बाँकी (${devNum(profilePendingDays)} दिन)`
                          : `सबै बिल चुक्ता • कुल अवधि: ${devNum(totalBillingDays)} दिन`}
                      </span>
                      {profileAdvanceCredit > 0 && (
                        <span className="text-[10px] text-emerald-300 font-black block mt-0.5">
                          Advance Credit: रु {trNum(profileAdvanceCredit.toLocaleString())}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-300 font-bold block">
                        अर्को भुक्तानी (Next Due)
                      </span>
                      <span className="font-black text-amber-300 block">
                        {latestCycle ? trNum(latestCycle.dueDateBS) : '—'}
                      </span>
                      {profileRemainingBalance > 0 && (
                        profileOverdueDays > 0 ? (
                          <span className="text-[10px] font-black text-rose-400">
                            {devNum(profileOverdueDays)} दिन म्याद नाघेको
                          </span>
                        ) : daysLeftToDue !== null ? (
                          <span
                            className={`text-[10px] font-black ${
                              daysLeftToDue < 0 ? 'text-rose-400' : daysLeftToDue <= 3 ? 'text-amber-300' : 'text-emerald-300'
                            }`}
                          >
                            {daysLeftToDue < 0
                              ? `${devNum(Math.abs(daysLeftToDue))} दिन म्याद नाघेको`
                              : daysLeftToDue === 0
                              ? 'आज भुक्तानी मिति!'
                              : `${devNum(daysLeftToDue)} दिन बाँकी`}
                          </span>
                        ) : null
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-700/80 text-center text-[10px]">
                    <div>
                      <span className="text-slate-400 block">कुल बिल (Total)</span>
                      <span className="font-black text-white">रु {profileTotalBilled.toLocaleString()}</span>
                    </div>
                    <div className="border-x border-slate-700/80">
                      <span className="text-slate-400 block">भुक्तानी (Paid)</span>
                      <span className="font-black text-emerald-400">रु {profileTotalPaid.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">बाँकी (Pending)</span>
                      <span
                        className={`font-black ${
                          profilePendingStatus === 'paid'
                            ? 'text-emerald-400'
                            : profilePendingStatus === 'partial'
                            ? 'text-amber-300'
                            : 'text-rose-400'
                        }`}
                      >
                        रु {profileRemainingBalance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Balance Breakdown View: Unpaid Months, Bill Amounts & Partial Payments Applied */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/90 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsBalanceBreakdownExpanded((prev) => !prev)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 bg-slate-100/80 hover:bg-slate-100 transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-black text-slate-900">
                        📊 बाँकी रकम विवरण (Balance Breakdown)
                      </span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                          profileRemainingBalance > 0
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {profileRemainingBalance > 0
                          ? `${devNum(profilePendingDays)} दिन बाँकी`
                          : 'Paid ✓'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-black text-slate-900">
                        रु {profileRemainingBalance.toLocaleString()}
                      </span>
                      {isBalanceBreakdownExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </button>

                  {isBalanceBreakdownExpanded && (
                    <div className="p-3 space-y-2 text-xs">
                      {balanceBreakdown.unpaidMonths.length === 0 && unpaidPriorBalance === 0 ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-bold flex items-center justify-between gap-2">
                          <span>✓ सबै बिलहरू चुक्ता भइसकेका छन्। (All bills paid)</span>
                          <span className="font-black shrink-0">रु ०</span>
                        </div>
                      ) : (
                        <>
                          {/* List of Unpaid Months */}
                          <div className="space-y-1.5">
                            {unpaidPriorBalance > 0 && (
                              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-black text-amber-950 text-[11px]">
                                      सुरुवाती / पुरानो बाँकी (Prior Balance)
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-amber-800 font-medium mt-0.5">
                                    सुरुको बाँकी: रु {balanceBreakdown.totalPriorBalance.toLocaleString()}
                                    {balanceBreakdown.priorPaymentApplied > 0 && (
                                      <span className="text-emerald-700 font-bold">
                                        {' '}• भुक्तानी: - रु {balanceBreakdown.priorPaymentApplied.toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-xs font-black text-rose-700 shrink-0">
                                  रु {unpaidPriorBalance.toLocaleString()}
                                </span>
                              </div>
                            )}

                            {balanceBreakdown.unpaidMonths.map((item) => (
                              <div
                                key={item.billId}
                                className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-black text-slate-900 text-[11px]">
                                      चक्र #{trNum(item.cycleNumber)}: {trData(item.cycleName)}
                                    </span>
                                    <span
                                      className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                        item.status === 'overdue'
                                          ? 'bg-rose-100 text-rose-800'
                                          : item.status === 'partial'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {item.status === 'overdue'
                                        ? 'Overdue'
                                        : item.status === 'partial'
                                        ? 'Partial'
                                        : 'Due'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                    बिल रकम: <span className="font-bold text-slate-700">रु {item.billAmount.toLocaleString()}</span>
                                    {item.partialPaidApplied > 0 ? (
                                      <span className="text-emerald-700 font-bold">
                                        {' '}• आंशिक भुक्तानी: - रु {item.partialPaidApplied.toLocaleString()}
                                      </span>
                                    ) : (
                                      <span> • भुक्तानी: रु ०</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[9px] text-slate-400 font-bold block">बाँकी</span>
                                  <span className="text-xs font-black text-rose-700">
                                    रु {item.unpaidAmount.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Step-by-Step Calculation Summary */}
                          <div className="p-2.5 rounded-xl bg-slate-900 text-white space-y-1 text-[11px]">
                            {unpaidPriorBalance > 0 && (
                              <div className="flex items-center justify-between text-slate-300">
                                <span>पुरानो बाँकी (Prior Due)</span>
                                <span className="font-bold">+ रु {unpaidPriorBalance.toLocaleString()}</span>
                              </div>
                            )}
                            {balanceBreakdown.unpaidCyclesTotalAmount > 0 && (
                              <div className="flex items-center justify-between text-slate-300">
                                <span>अनपेड अवधिको कुल बिल ({devNum(profilePendingDays)} दिन)</span>
                                <span className="font-bold">+ रु {balanceBreakdown.unpaidCyclesTotalAmount.toLocaleString()}</span>
                              </div>
                            )}
                            {balanceBreakdown.unpaidCyclesPaidApplied > 0 && (
                              <div className="flex items-center justify-between text-emerald-400">
                                <span>घटाइएको आंशिक भुक्तानी (Partial Payments Applied)</span>
                                <span className="font-bold">- रु {balanceBreakdown.unpaidCyclesPaidApplied.toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-700 font-black text-xs">
                              <span>अन्तिम बाँकी रकम (Remaining Balance)</span>
                              <span className="text-amber-300">रु {profileRemainingBalance.toLocaleString()}</span>
                            </div>
                            <div className="text-[9px] text-slate-400 pt-0.5">
                              जम्मा हिसाब: कुल बिल रु {profileTotalBilled.toLocaleString()} − कुल भुक्तानी रु {profileTotalPaid.toLocaleString()} = रु {profileRemainingBalance.toLocaleString()}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {selectedCustomer.notes && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl px-3 py-2 text-[11px] text-amber-900 font-bold">
                    📝 नोट: {trData(selectedCustomer.notes)}
                  </div>
                )}

                {selectedCustomer.futureRate && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-3 py-2 text-[11px] text-indigo-900 font-bold">
                    📈 तालिकाबद्ध नयाँ दर: रु {trNum(selectedCustomer.futureRate.rate)}/L ({trNum(selectedCustomer.futureRate.effectiveDateBS)} देखि लागु)
                  </div>
                )}

                {/* Profile Complete Action Toolbar */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-[10px] font-black">
                  <button
                    type="button"
                    onClick={() => handleOpenDailyEntry(selectedCustomer)}
                    className="py-2 px-1.5 rounded-xl bg-blue-600 text-white flex flex-col items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ दैनिक दूध</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenPaymentModal(selectedCustomer)}
                    className="py-2 px-1.5 rounded-xl bg-emerald-600 text-white flex flex-col items-center gap-0.5 cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>भुक्तानी</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenNoMilkDayModal(selectedCustomer)}
                    className="py-2 px-1.5 rounded-xl bg-amber-100 text-amber-900 flex flex-col items-center gap-0.5 cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>दूध गएन</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEndBillModal(selectedCustomer)}
                    className="py-2 px-1.5 rounded-xl bg-rose-100 text-rose-900 flex flex-col items-center gap-0.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>अन्तिम बिल</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStopResume(selectedCustomer)}
                    className="py-2 px-1.5 rounded-xl bg-slate-100 text-slate-800 flex flex-col items-center gap-0.5 cursor-pointer"
                  >
                    {isStoppedOrInactive ? (
                      <>
                        <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>पुनः सुरु</span>
                      </>
                    ) : (
                      <>
                        <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>दूध रोक्नुहोस्</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFutureRateTargetCustomer(selectedCustomer);
                      setScheduledRateVal(String(selectedCustomer.milkRate));
                      setScheduledEveningRateVal(
                        selectedCustomer.eveningMilkRate ? String(selectedCustomer.eveningMilkRate) : ''
                      );
                      setScheduledRateDateISO(getTodayISOLocal());
                      setScheduledRateNote('');
                      setIsFutureRateOpen(true);
                    }}
                    className="py-2 px-1.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 flex flex-col items-center gap-0.5 cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>दर व्यवस्थापन</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenCustomerSmartCalendar(selectedCustomer)}
                    className="py-2 px-1.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 flex flex-col items-center gap-0.5 cursor-pointer"
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>स्मार्ट पात्रो</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReportsInitialCustomer(selectedCustomer);
                      setIsReportsModalOpen(true);
                    }}
                    className="py-2 px-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 flex flex-col items-center gap-0.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>रिपोर्ट / Bill</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenCustomerHistory(selectedCustomer)}
                    className="py-2 px-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 flex flex-col items-center gap-0.5 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>पूरा इतिहास</span>
                  </button>
                  {latestCycle && (
                    <button
                      type="button"
                      onClick={() => {
                        playSuccessSound();
                        const added = autoFillMissingDailyEntriesForCycle(
                          selectedCustomer,
                          latestCycle.fromIso,
                          latestCycle.toIso
                        );
                        reloadData();
                        showToast(
                          added > 0
                            ? `${added} छुटेका दिनहरूको नियमित दूध रेकर्ड स्वतः भरियो!`
                            : 'यस चक्रका सबै दिन पहिले नै भरिएका छन्!'
                        );
                      }}
                      className="py-2 px-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex flex-col items-center gap-0.5 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>स्वतः भर्नुहोस्</span>
                    </button>
                  )}
                </div>

                {/* Final Bills Banner if generated */}
                {custFinalBills.length > 0 && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-black text-rose-900 block">
                        🛑 अन्तिम बिल (Final Bill) उपलब्ध छ
                      </span>
                      <span className="text-[10px] text-rose-700 font-bold">
                        {custFinalBills[0].startDateBS} → {custFinalBills[0].endDateBS} • कुल {custFinalBills[0].totalMilkLtr}L
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFinalBill(custFinalBills[0]);
                        setIsFinalBillViewerOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-[11px] font-black cursor-pointer"
                    >
                      अन्तिम बिल हेर्नुहोस्
                    </button>
                  </div>
                )}

                {/* Monthly Bills Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🧾</span>
                      <span>बिल अवधि चक्रहरू (Billing Periods • {devNum(totalBillingDays)} दिन)</span>
                    </h4>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                        profileRemainingBalance > 0
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {profileRemainingBalance > 0
                        ? `अनपेड बिल जम्मा: रु ${trNum(profileRemainingBalance.toLocaleString())}`
                        : 'सबै बिल चुक्ता (रु ०)'}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {selectedCustomerBillingCycles.map((bill) => {
                      const ownUnpaid = Math.max(0, bill.currentBillAmount - (bill.allocatedPaid || 0));
                      return (
                      <div
                        key={bill.id}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-slate-900">
                                चक्र #{trNum(bill.cycleNumber)}: {trData(bill.cycleName)} ({devNum(bill.totalDays)} दिन)
                              </span>
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                                  bill.status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : bill.status === 'overdue'
                                    ? 'bg-rose-100 text-rose-800'
                                    : bill.status === 'partial'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {bill.status === 'paid'
                                  ? 'चुक्ता (Paid)'
                                  : bill.status === 'overdue'
                                  ? 'म्याद नाघेको (Overdue)'
                                  : bill.status === 'partial'
                                  ? 'आंशिक (Partial)'
                                  : 'बाँकी (Due)'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {trNum(bill.fromBsDate)} → {trNum(bill.toBsDate)} ({trNum(bill.totalDays)} दिन) • Due: {trNum(bill.dueDateBS)} • {trNum(bill.totalMilkLtr)}L ({trNum(bill.suppliedDays)} दिन आपूर्ति, {trNum(bill.noMilkDays)} छुट्टी)
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-slate-400 font-bold block">
                              {bill.previousPendingAmount > 0 ? 'संचित जम्मा बाँकी' : 'बाँकी रकम'}
                            </span>
                            <span
                              className={`text-sm font-black ${
                                bill.remainingBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
                              }`}
                            >
                              रु {trNum(bill.remainingBalance.toLocaleString())}
                            </span>
                            {bill.previousPendingAmount > 0 && (
                              <span className="text-[10px] text-slate-500 font-bold block">
                                यस चक्रको बाँकी: रु {trNum(ownUnpaid.toLocaleString())}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Financial Detail Breakdown */}
                        <div className="grid grid-cols-3 gap-1 bg-white p-2 rounded-xl text-[11px] font-bold border border-slate-100 text-center">
                          <div>
                            <span className="text-slate-400 block text-[9px]">यस अवधि ({devNum(bill.totalDays)} दिन)</span>
                            <span className="text-slate-800">रु {trNum(bill.currentBillAmount.toLocaleString())}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">पुरानो बाँकी</span>
                            <span className="text-slate-800">रु {trNum(bill.previousPendingAmount.toLocaleString())}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px]">बाँडफाँट भुक्तानी</span>
                            <span className="text-emerald-700">रु {trNum((bill.allocatedPaid || 0).toLocaleString())}</span>
                          </div>
                        </div>

                        {/* View Bill, PDF Download, Print & WhatsApp Share Actions */}
                        <div className="flex items-center justify-end gap-1.5 pt-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              playTapSound();
                              setActiveReceiptCustomer(selectedCustomer);
                              setActiveReceiptPayment(null);
                              setActiveReceiptBill(bill);
                              setIsReceiptModalOpen(true);
                            }}
                            className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer"
                            title="GAULE DOODH बिल हेर्नुहोस् र प्रिन्ट गर्नुहोस्"
                          >
                            <FileText className="w-3 h-3" />
                            <span>बिल / Print</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              playTapSound();
                              generateCustomerMonthlyBillPDF(selectedCustomer, bill);
                              showToast('GAULE DOODH A4 PDF डाउनलोड भयो!');
                            }}
                            className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-xl text-xs font-bold transition border border-blue-200 cursor-pointer"
                            title="मासिक बिल A4 PDF डाउनलोड गर्नुहोस्"
                          >
                            <FileDown className="w-3 h-3 text-blue-600" />
                            <span>A4 PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              playTapSound();
                              printThermalReceipt(selectedCustomer, bill);
                            }}
                            className="flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 px-2.5 py-1 rounded-xl text-xs font-bold transition border border-amber-200 cursor-pointer"
                            title="थर्मल 58mm/80mm प्रिन्ट गर्नुहोस्"
                          >
                            <Printer className="w-3 h-3 text-amber-700" />
                            <span>थर्मल</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleShareWhatsAppBill(selectedCustomer, bill)}
                            className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-xl text-xs font-bold transition border border-emerald-200 cursor-pointer"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </button>
                        </div>
                      </div>
                      );
                    })}
                    {unpaidPriorBalance > 0 && (
                      <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-black text-amber-950 block">
                            ⏳ सुरुवाती / पुरानो बाँकी बक्यौता (Opening / Prior Pending)
                          </span>
                          <span className="text-[10px] text-amber-800 font-bold">
                            चक्र #१ अघिदेखिको बाँकी रकम (अनपेड बिल जम्मामा समावेश छ)
                          </span>
                        </div>
                        <span className="text-sm font-black text-rose-700 shrink-0">
                          रु {unpaidPriorBalance.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payments History for this customer */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>💵</span>
                    <span>भुक्तानी इतिहास ({payments.filter((p) => p.customerId === selectedCustomer.id).length})</span>
                  </h4>

                  {payments.filter((p) => p.customerId === selectedCustomer.id).length === 0 ? (
                    <p className="text-xs text-slate-500 py-1">कुनै भुक्तानी रेकर्ड छैन।</p>
                  ) : (
                    <div className="space-y-1.5">
                      {payments
                        .filter((p) => p.customerId === selectedCustomer.id)
                        .map((pay) => (
                          <div
                            key={pay.id}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-black text-slate-900">
                                रु {pay.amount.toLocaleString()} ({pay.paymentMethod.toUpperCase()})
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                📅 {pay.bsDate} • रसिद नं: {pay.receiptNumber}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleShareWhatsAppReceipt(selectedCustomer, pay)}
                                className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
                                title="WhatsApp रसिद"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveReceiptBill(null);
                                  setActiveReceiptPayment(pay);
                                  setActiveReceiptCustomer(selectedCustomer);
                                  setIsReceiptModalOpen(true);
                                }}
                                className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                                title="रसिद हेर्नुहोस्"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteConfirmTarget({
                                    id: pay.id,
                                    name: `रु ${pay.amount.toLocaleString()} को भुक्तानी`,
                                    type: 'payment',
                                  });
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="भुक्तानी हटाउनुहोस्"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Daily Milk Logs History for this customer */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🥛</span>
                      <span>दैनिक दुध रेकर्डहरू ({custDaily.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleOpenDailyEntry(selectedCustomer)}
                      className="text-[11px] font-black text-blue-700 hover:underline cursor-pointer"
                    >
                      + नयाँ प्रविष्टि
                    </button>
                  </div>

                  {custDaily.length === 0 ? (
                    <p className="text-xs text-slate-500 py-1">कुनै दैनिक रेकर्ड छैन।</p>
                  ) : (
                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {custDaily.slice(0, 30).map((rec) => (
                        <div
                          key={rec.id}
                          className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              <span>📅 {rec.bsDate}</span>
                              {rec.isNoMilk ? (
                                <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">
                                  🚫 दूध गएन (रु ०)
                                </span>
                              ) : (
                                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                                  {rec.totalMilk} Ltr
                                </span>
                              )}
                            </div>
                            {!rec.isNoMilk && (
                              <div className="text-[10px] text-slate-500">
                                बिहान: {rec.morningMilk}L • बेलुका: {rec.eveningMilk}L = रु {rec.totalAmount.toLocaleString()}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenDailyEntry(selectedCustomer, undefined, rec.date, rec)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="रेकर्ड सम्पादन गर्नुहोस्"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteConfirmTarget({
                                  id: rec.id,
                                  name: `${rec.bsDate} को ${rec.totalMilk}L दुध रेकर्ड`,
                                  type: 'daily',
                                });
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="दैनिक रेकर्ड हटाउनुहोस्"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* 8. PAYMENT COLLECTION MODAL                               */}
      {/* ========================================================= */}
      {isPaymentModalOpen && paymentTargetCustomer && (() => {
        const payCycles = calculateCustomerBillingCycles(paymentTargetCustomer);
        const activePayCycle = payCycles[0];
        const totalPending = getUnpaidMonthsDetail(paymentTargetCustomer).totalRemaining;
        const parsedPayAmt = parseFloat(paymentAmountInput) || 0;
        const remainingPreview = Math.max(0, totalPending - parsedPayAmt);
        const advancePreview = parsedPayAmt > totalPending ? parsedPayAmt - totalPending : 0;

        return (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsPaymentModalOpen(false);
            }}
            className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          >
            <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-3.5 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    रकम भुक्तानी संकलन (Payment Received)
                  </h3>
                  <p className="text-[11px] text-blue-600 font-bold">
                    {trData(paymentTargetCustomer.name)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Billing Period & Pending Breakdown */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">बिल अवधि (Period):</span>
                  <span className="font-black text-slate-900">
                    {activePayCycle ? activePayCycle.cycleName : 'नियमित हिसाब'}
                  </span>
                </div>
                {activePayCycle && (
                  <>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">यस अवधि ({activePayCycle.totalDays} दिन) + पुरानो बाँकी:</span>
                      <span className="font-bold text-slate-700">
                        रु {activePayCycle.currentBillAmount.toLocaleString()} + रु {activePayCycle.previousPendingAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1">
                      <span className="font-black text-rose-700">कुल बाँकी बिल (Total Due):</span>
                      <span className="font-black text-rose-700">रु {totalPending.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Full / Partial / Advance */}
              <div className="grid grid-cols-3 gap-1.5 text-[11px] font-black">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentTypeOption('full');
                    if (totalPending > 0) setPaymentAmountInput(String(totalPending));
                  }}
                  className={`py-2 rounded-xl border text-center transition cursor-pointer ${
                    paymentTypeOption === 'full'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  पूरा (Full)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentTypeOption('partial')}
                  className={`py-2 rounded-xl border text-center transition cursor-pointer ${
                    paymentTypeOption === 'partial'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  आंशिक (Partial)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentTypeOption('advance')}
                  className={`py-2 rounded-xl border text-center transition cursor-pointer ${
                    paymentTypeOption === 'advance'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  अग्रिम (Advance)
                </button>
              </div>

              {/* Payment Amount */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  प्राप्त रकम (Amount Received - रु) *
                </label>
                <input
                  type="number"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                  placeholder="उदा. 2500"
                  className="w-full text-lg font-black p-2.5 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:outline-none"
                />
                <div className="flex justify-between text-[11px] font-bold px-1">
                  <span className="text-slate-500">भुक्तानी पछि बाँकी (Remaining):</span>
                  {advancePreview > 0 ? (
                    <span className="text-indigo-700 font-black">
                      Advance Credit: रु {advancePreview.toLocaleString()}
                    </span>
                  ) : (
                    <span className={remainingPreview === 0 ? 'text-emerald-700 font-black' : 'text-rose-700 font-black'}>
                      रु {remainingPreview.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">भुक्तानी माध्यम (Method)</label>
                <div className="grid grid-cols-5 gap-1 text-[11px] font-bold">
                  {(['cash', 'esewa', 'khalti', 'bank', 'qr'] as MilkPaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethodOption(m)}
                      className={`py-1.5 rounded-xl border text-center uppercase transition cursor-pointer ${
                        paymentMethodOption === m
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {m === 'cash' ? 'नगद' : m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">भुक्तानी मिति (BS Date)</label>
                <NepaliBSDatePicker
                  value={paymentDateISO}
                  onChange={(iso) => setPaymentDateISO(iso)}
                  buttonClassName="w-full text-xs"
                />
              </div>

              {/* Transaction Reference & Remarks */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Ref / Tx ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentTxRefInput}
                    onChange={(e) => setPaymentTxRefInput(e.target.value)}
                    placeholder="उदा. TXN-9812"
                    className="w-full p-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    कैफियत (Remarks)
                  </label>
                  <input
                    type="text"
                    value={paymentNoteInput}
                    onChange={(e) => setPaymentNoteInput(e.target.value)}
                    placeholder="उदा. eSewa बाट प्राप्त"
                    className="w-full p-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  रद्द
                </button>
                <button
                  type="button"
                  disabled={isPaymentSubmitting}
                  onClick={handleConfirmPayment}
                  className="w-2/3 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md active:scale-95 transition cursor-pointer"
                >
                  {isPaymentSubmitting ? 'सुरक्षित हुँदै...' : 'भुक्तानी लिनुहोस् ✓'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* 9. PAYMENT RECEIPT & GAULE DOODH MONTHLY BILL MODAL       */}
      {/* ========================================================= */}
      {isReceiptModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsReceiptModalOpen(false);
              setActiveReceiptPayment(null);
              setActiveReceiptBill(null);
            }
          }}
          className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150"
        >
          {!activeReceiptPayment && activeReceiptBill && activeReceiptCustomer ? (
            <div className="bg-slate-100 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 max-h-[94vh] flex flex-col overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-slate-900 to-blue-900 text-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-black">GAULE DOODH — दुध हिसाब बिल</h3>
                  <p className="text-[11px] text-blue-200 font-bold">
                    {activeReceiptCustomer.name} • चक्र #{activeReceiptBill.cycleNumber} ({activeReceiptBill.totalDays} दिन: {activeReceiptBill.cycleName})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsReceiptModalOpen(false);
                    setActiveReceiptPayment(null);
                    setActiveReceiptBill(null);
                  }}
                  className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 sm:p-4 overflow-y-auto">
                <GauleDoodhTraditionalBill
                  summary={buildGauleDoodhBillSummary(
                    activeReceiptCustomer,
                    activeReceiptBill.fromIso,
                    activeReceiptBill.toIso,
                    {
                      billNumber: `GD-C${activeReceiptBill.cycleNumber}-${activeReceiptBill.fromBsDate.replace(/-/g, '').slice(2)}`,
                      billTitle: `दुध बिल — चक्र #${activeReceiptBill.cycleNumber} (${activeReceiptBill.totalDays} दिन: ${activeReceiptBill.cycleName})`,
                    }
                  )}
                  onToast={showToast}
                  extraActionSlot={
                    <button
                      type="button"
                      onClick={() => {
                        playTapSound();
                        printThermalReceipt(activeReceiptCustomer, activeReceiptBill);
                      }}
                      className="w-full py-2 rounded-xl bg-white hover:bg-slate-50 text-amber-900 border border-amber-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>थर्मल 58mm/80mm रसिद प्रिन्ट</span>
                    </button>
                  }
                />
              </div>
            </div>
          ) : (
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 space-y-4 border border-slate-200 max-h-[92vh] overflow-y-auto">
              <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-3">
                <div className="w-10 h-10 mx-auto rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl font-bold mb-1">
                  🥛
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  गौले दूध • GAULE DOODH
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  दुध हिसाब भुक्तानी रसिद (Payment Voucher)
                </p>
                {activeReceiptPayment && (
                  <div className="text-[10px] text-slate-400 font-bold">
                    रसिद नं: {activeReceiptPayment.receiptNumber}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-bold">ग्राहक (Customer):</span>
                  <span className="font-black text-slate-900">
                    {activeReceiptCustomer?.name ? trData(activeReceiptCustomer.name) : 'ग्राहक'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-bold">सम्पर्क (Mobile):</span>
                  <span className="font-bold text-slate-800">
                    {activeReceiptCustomer?.mobile ? trNum(activeReceiptCustomer.mobile) : 'N/A'}
                  </span>
                </div>

                {activeReceiptPayment && (() => {
                  const dual = formatDualDate(activeReceiptPayment.date, activeReceiptPayment.bsDate);
                  return (
                    <>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-bold">मिति (BS / AD):</span>
                        <span className="font-bold text-slate-800 text-right">
                          {dual.bsDisplayShort} BS ({dual.adDisplay})
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-bold">माध्यम (Method):</span>
                        <span className="font-black text-blue-700 uppercase">
                          {activeReceiptPayment.paymentMethod}
                        </span>
                      </div>
                      {activeReceiptPayment.billingPeriod && (
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-bold">बिल अवधि:</span>
                          <span className="font-bold text-slate-700">{activeReceiptPayment.billingPeriod}</span>
                        </div>
                      )}
                      {activeReceiptPayment.transactionRef && (
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-bold">Ref ID:</span>
                          <span className="font-bold text-slate-700">{activeReceiptPayment.transactionRef}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1.5 bg-emerald-50 px-2 rounded-xl text-emerald-900 font-black">
                        <span>भुक्तानी प्राप्त रकम:</span>
                        <span>रु {activeReceiptPayment.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between py-1 text-slate-700 font-bold">
                        <span>बाँकी बक्यौता:</span>
                        <span className="text-rose-600 font-black">
                          रु {activeReceiptPayment.remainingBalanceAfter.toLocaleString()}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => printCurrentView('Gaule Doodh Receipt')}
                  className="py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>प्रिन्ट</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!activeReceiptCustomer || !activeReceiptPayment) return;
                    handleShareWhatsAppReceipt(activeReceiptCustomer, activeReceiptPayment);
                  }}
                  className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsReceiptModalOpen(false);
                  setActiveReceiptPayment(null);
                  setActiveReceiptBill(null);
                }}
                className="w-full py-2 rounded-xl text-slate-500 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                बन्द गर्नुहोस्
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 10. SMART BS CALENDAR MODAL (6-COLOR AUTOMATIC WARNINGS)  */}
      {/* ========================================================= */}
      <MilkSmartCalendarModal
        isOpen={isDueCalendarOpen}
        onClose={() => setIsDueCalendarOpen(false)}
        customers={customers}
        targetCustomer={
          customerCalendarTarget
            ? customers.find((c) => c.id === customerCalendarTarget.id) || customerCalendarTarget
            : null
        }
        onSelectCustomer={(c) => setCustomerCalendarTarget(c)}
        dailyRecords={dailyRecords}
        payments={payments}
        noMilkDays={noMilkDays}
        todayBS={todayBS}
        onQuickDailyEntry={(cust, dateISO) => handleOpenDailyEntry(cust, undefined, dateISO)}
        onQuickNoMilkDay={(cust, dateISO) => handleOpenNoMilkDayModal(cust, undefined, dateISO)}
        onQuickPayment={(cust) => handleOpenPaymentModal(cust)}
        language={language}
      />

      {/* ========================================================= */}
      {/* 11. BACKUP, EXCEL EXPORT & REPORTS TOOLS MODAL            */}
      {/* ========================================================= */}
      {isBackupModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBackupModalOpen(false);
          }}
          className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-slate-900">
                एक्सेल रिपोर्ट तथा ब्याकअप (Tools)
              </h3>
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsBackupModalOpen(false);
                  setReportsInitialCustomer(customers[0] || null);
                  setIsReportsModalOpen(true);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-2xl font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>रिपोर्ट र स्टेटमेन्ट खोल्नुहोस्</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  exportMilkDataToCSV();
                  showToast('Excel CSV डाउनलोड भयो!');
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-2xl font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>एक्सेल (Excel CSV) डाउनलोड</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const json = exportMilkBackupJSON();
                  void downloadTextFile(json, `Milk_Backup_${Date.now()}.json`, 'application/json');
                  showToast('ब्याकअप डाउनलोड भयो!');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-2xl font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>JSON ब्याकअप डाउनलोड</span>
              </button>

              <label className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-2xl font-black flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>ब्याकअप फाइल रिस्टोर</span>
                <input
                  ref={backupInputRef}
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const res = importMilkBackupJSON(ev.target?.result as string);
                      if (res.success) {
                        reloadData();
                        setIsBackupModalOpen(false);
                      }
                      showToast(res.message);
                    };
                    reader.readAsText(file);
                  }}
                  className="hidden"
                />
              </label>

              {onNavigateToCalendarTool && (
                <button
                  type="button"
                  onClick={() => {
                    setIsBackupModalOpen(false);
                    onNavigateToCalendarTool();
                  }}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded-2xl font-bold border border-slate-200 cursor-pointer"
                >
                  🧮 {language === 'en' ? 'Open Quick Milk Calculator Tool' : 'छिटो दूध हिसाब क्याल्कुलेटर खोल्नुहोस्'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 12. RATE MANAGEMENT & HISTORY MODAL                       */}
      {/* ========================================================= */}
      {isFutureRateOpen && futureRateTargetCustomer && (() => {
        const custRates = rateHistory.filter((h) => h.customerId === futureRateTargetCustomer.id);
        return (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsFutureRateOpen(false);
            }}
            className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 space-y-3.5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    दुध दर व्यवस्थापन (Milk Rate Management)
                  </h3>
                  <p className="text-[11px] text-blue-600 font-bold">
                    {trData(futureRateTargetCustomer.name)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFutureRateOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-[10px] font-bold text-amber-900">
                नयाँ दर छानिएको मितिदेखि मात्र लागू हुनेछ — पुराना बिल र रेकर्ड परिवर्तन हुँदैनन्!
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      बिहान / मुख्य दर (रु/L) *
                    </label>
                    <input
                      type="number"
                      value={scheduledRateVal}
                      onChange={(e) => setScheduledRateVal(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-black text-blue-700"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      बेलुका दर (Optional)
                    </label>
                    <input
                      type="number"
                      value={scheduledEveningRateVal}
                      onChange={(e) => setScheduledEveningRateVal(e.target.value)}
                      placeholder={scheduledRateVal}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-black text-indigo-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    लागु हुने मिति (Effective Date - BS)
                  </label>
                  <NepaliBSDatePicker
                    value={scheduledRateDateISO}
                    onChange={(iso) => setScheduledRateDateISO(iso)}
                    buttonClassName="w-full text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    टिप्पणी (Note - Optional)
                  </label>
                  <input
                    type="text"
                    value={scheduledRateNote}
                    onChange={(e) => setScheduledRateNote(e.target.value)}
                    placeholder="उदा. सिजनल मूल्य समायोजन"
                    className="w-full p-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              {custRates.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] font-black text-slate-500 uppercase">
                    दर परिवर्तन इतिहास (Rate History)
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1">
                    {custRates.map((rh) => (
                      <div
                        key={rh.id}
                        className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <span className="font-black text-slate-800">{rh.effectiveDateBS} देखि</span>
                          {rh.note && <span className="text-slate-500 ml-1">({rh.note})</span>}
                        </div>
                        <span className="font-black text-blue-700">
                          रु {rh.morningRate ?? rh.rate}
                          {rh.eveningRate && rh.eveningRate !== (rh.morningRate ?? rh.rate)
                            ? ` / रु ${rh.eveningRate}`
                            : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsFutureRateOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  रद्द
                </button>
                <button
                  type="button"
                  onClick={handleSaveFutureRate}
                  className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs cursor-pointer"
                >
                  दर सुरक्षित गर्नुहोस्
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* 12B. NO MILK, END BILL, FINAL BILL, STOP/RESUME, HISTORY & REPORTS */}
      {/* ========================================================= */}
      <NoMilkDayModal
        isOpen={isNoMilkModalOpen}
        customer={noMilkTargetCustomer}
        dateISO={noMilkDateISO}
        onChangeDateISO={(iso) => setNoMilkDateISO(iso)}
        reason={noMilkReasonInput}
        onChangeReason={(r) => setNoMilkReasonInput(r)}
        conflict={noMilkConflictConfirm}
        onCancelConflict={() => setNoMilkConflictConfirm(null)}
        onConfirmSave={(override) => handleSaveNoMilkDayEntry(Boolean(override))}
        onClose={() => {
          setNoMilkConflictConfirm(null);
          setIsNoMilkModalOpen(false);
        }}
        language={language}
      />

      <EndBillModal
        isOpen={isEndBillModalOpen}
        customer={endBillTargetCustomer}
        startDateISO={endBillStartDateISO}
        onChangeStartDateISO={(iso) => setEndBillStartDateISO(iso)}
        stopDateISO={endBillStopDateISO}
        onChangeStopDateISO={(iso) => setEndBillStopDateISO(iso)}
        reason={endBillReasonInput}
        onChangeReason={(r) => setEndBillReasonInput(r)}
        onConfirmGenerate={handleGenerateFinalBill}
        onClose={() => setIsEndBillModalOpen(false)}
        language={language}
      />

      <FinalBillViewerModal
        isOpen={isFinalBillViewerOpen}
        bill={activeFinalBill}
        customer={
          activeFinalBill
            ? customers.find((c) => c.id === activeFinalBill.customerId) || null
            : null
        }
        allCustomerPayments={
          activeFinalBill
            ? payments.filter((p) => p.customerId === activeFinalBill.customerId)
            : []
        }
        onCollectPayment={(cust) => handleOpenPaymentModal(cust)}
        onToast={showToast}
        onClose={() => setIsFinalBillViewerOpen(false)}
        language={language}
      />

      <StopResumeModal
        isOpen={isStopResumeModalOpen}
        customer={stopResumeCustomer}
        reason={stopReasonInput}
        onChangeReason={(r) => setStopReasonInput(r)}
        onConfirm={handleConfirmStopResume}
        onClose={() => setIsStopResumeModalOpen(false)}
        language={language}
      />

      <CustomerHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        customer={
          historyTargetCustomer
            ? customers.find((c) => c.id === historyTargetCustomer.id) || historyTargetCustomer
            : null
        }
        activeTab={historyActiveTab}
        onChangeTab={(t) => setHistoryActiveTab(t)}
        dailyRecords={dailyRecords}
        payments={payments}
        noMilkDays={noMilkDays}
        auditLogs={auditLogs}
        finalBills={finalBills}
        onEditDailyRecord={(cust, rec) => handleOpenDailyEntry(cust, undefined, rec.date, rec)}
        onDeleteDailyRecord={(rec) =>
          setDeleteConfirmTarget({
            id: rec.id,
            name: `${rec.bsDate} को ${rec.totalMilk}L दुध रेकर्ड`,
            type: 'daily',
          })
        }
        onUpdatePayment={(id, amount, method, note) => {
          updateMilkPayment(id, amount, method, note);
          reloadData();
          showToast('भुक्तानी संशोधन सुरक्षित भयो!');
        }}
        onDeletePayment={(pay) =>
          setDeleteConfirmTarget({
            id: pay.id,
            name: `रु ${pay.amount.toLocaleString()} को भुक्तानी`,
            type: 'payment',
          })
        }
        onDeleteNoMilkDay={(nm) => {
          deleteNoMilkDay(nm.id);
          reloadData();
          showToast(`${trNum(nm.bsDate)} को No Milk रेकर्ड हटाइयो`);
        }}
        onViewReceipt={(cust, pay, bill) => {
          setActiveReceiptCustomer(cust);
          setActiveReceiptPayment(pay);
          setActiveReceiptBill(bill);
          setIsReceiptModalOpen(true);
        }}
        onShareWhatsAppBill={handleShareWhatsAppBill}
        onShareWhatsAppReceipt={handleShareWhatsAppReceipt}
        onViewFinalBill={(fb) => {
          setActiveFinalBill(fb);
          setIsFinalBillViewerOpen(true);
        }}
        language={language}
      />

      <MilkReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        customers={customers}
        initialCustomer={reportsInitialCustomer}
        dailyRecords={dailyRecords}
        payments={payments}
        finalBills={finalBills}
        showToast={showToast}
        language={language}
      />

      {/* ========================================================= */}
      {/* 13. IN-APP DELETE CONFIRMATION MODAL (100% IFRAME SAFE)   */}
      {/* ========================================================= */}
      {deleteConfirmTarget && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteConfirmTarget(null);
          }}
          className="fixed inset-0 z-[85] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 space-y-4 border border-rose-200">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl shadow-inner">
              <Trash2 className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                {deleteConfirmTarget.type === 'customer'
                  ? 'ग्राहक हटाउने निश्चित हुनुहुन्छ?'
                  : deleteConfirmTarget.type === 'payment'
                  ? 'भुक्तानी रेकर्ड हटाउने?'
                  : 'दैनिक दुध रेकर्ड हटाउने?'}
              </h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {deleteConfirmTarget.type === 'customer' ? (
                  <>
                    <strong className="text-slate-900 font-black">{trData(deleteConfirmTarget.name)}</strong> को सम्पूर्ण दुध रेकर्ड, मासिक बिल र भुक्तानी खाता सधैंका लागि हटाइनेछ।
                  </>
                ) : (
                  <>
                    <strong className="text-slate-900 font-black">{trData(deleteConfirmTarget.name)}</strong> सधैंका लागि हटाइनेछ। के तपाईं अगाडि बढ्न चाहनुहुन्छ?
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="w-1/2 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                रद्द (Cancel)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (ownerSecurity.isPinEnabled()) {
                    setIsSecurityPinModalOpen(true);
                    setSecurityPinError('');
                    setInputSecurityPin('');
                    setIsSetPinMode(false);
                    return;
                  }

                  playSuccessSound();
                  if (deleteConfirmTarget.type === 'customer') {
                    deleteMilkCustomer(deleteConfirmTarget.id);
                    if (selectedCustomerId === deleteConfirmTarget.id) setSelectedCustomerId(null);
                    if (editingCustomerId === deleteConfirmTarget.id) setIsCustomerModalOpen(false);
                    showToast(`${trData(deleteConfirmTarget.name)} हटाइयो (Customer Deleted)`);
                  } else if (deleteConfirmTarget.type === 'payment') {
                    deleteMilkPayment(deleteConfirmTarget.id);
                    showToast('भुक्तानी रेकर्ड हटाइयो');
                  } else if (deleteConfirmTarget.type === 'daily') {
                    deleteDailyMilkRecord(deleteConfirmTarget.id);
                    showToast('दैनिक रेकर्ड हटाइयो');
                  }
                  reloadData();
                  setDeleteConfirmTarget(null);
                }}
                className="w-1/2 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md active:scale-95 transition cursor-pointer"
              >
                हो, हटाउनुहोस् (Delete)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 14. OWNER SECURITY PIN MODAL (PROTECT DATA AGAINST TAMPER) */}
      {/* ========================================================= */}
      {isSecurityPinModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSecurityPinModalOpen(false);
          }}
          className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 space-y-4 border border-slate-200">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center text-2xl shadow-inner">
              <Lock className="w-6 h-6 stroke-[2.5]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                {isSetPinMode ? 'मालिक सुरक्षा पिन सेट गर्नुहोस् (Owner PIN)' : 'मालिक सुरक्षा पिन प्रविष्ट गर्नुहोस्'}
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {isSetPinMode
                  ? 'स्टाफ वा अरू कसैले पुराना रेकर्ड वा ग्राहक मेटाउन नसकून् भन्नाका लागि ४-अंकको गोप्य पिन राख्नुहोस्।'
                  : 'डेटा मेटाउन वा सुरक्षित गर्न कृपया आफ्नो ४-अंकको मालिक पिन प्रविष्ट गर्नुहोस्।'}
              </p>
            </div>

            {isSetPinMode ? (
              <div className="space-y-3">
                <input
                  type="password"
                  maxLength={6}
                  value={newPinValue}
                  onChange={(e) => setNewPinValue(e.target.value.replace(/\D/g, ''))}
                  placeholder="नयाँ ४ वा ६ अंकको पिन (उदा. 1234)"
                  className="w-full text-center text-lg tracking-widest font-black py-2.5 px-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 outline-none"
                />

                {securityPinError && (
                  <p className="text-xs font-bold text-rose-600 text-center">{securityPinError}</p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSecurityPinModalOpen(false)}
                    className="w-1/2 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs"
                  >
                    रद्द
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (newPinValue.length < 4) {
                        setSecurityPinError('कम्तीमा ४ अंकको पिन राख्नुहोस्!');
                        return;
                      }
                      ownerSecurity.setPin(newPinValue);
                      setIsSecurityPinModalOpen(false);
                      setNewPinValue('');
                      showToast('मालिक सुरक्षा पिन सफलतापूर्वक सेट भयो! 🔒');
                    }}
                    className="w-1/2 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md transition active:scale-95"
                  >
                    पिन सेभ गर्नुहोस्
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="password"
                  maxLength={6}
                  value={inputSecurityPin}
                  onChange={(e) => setInputSecurityPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="मालिक पिन (उदा. 1234)"
                  className="w-full text-center text-lg tracking-widest font-black py-2.5 px-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 outline-none"
                />

                {securityPinError && (
                  <p className="text-xs font-bold text-rose-600 text-center">{securityPinError}</p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSecurityPinModalOpen(false);
                      setInputSecurityPin('');
                      setSecurityPinError('');
                    }}
                    className="w-1/2 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs"
                  >
                    रद्द
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!ownerSecurity.verifyPin(inputSecurityPin)) {
                        setSecurityPinError('गलत पिन! कृपया सही मालिक पिन लेख्नुहोस्।');
                        return;
                      }

                      setIsSecurityPinModalOpen(false);
                      setInputSecurityPin('');
                      setSecurityPinError('');

                      // If there was a pending delete action, complete it
                      if (deleteConfirmTarget) {
                        playSuccessSound();
                        if (deleteConfirmTarget.type === 'customer') {
                          deleteMilkCustomer(deleteConfirmTarget.id);
                          if (selectedCustomerId === deleteConfirmTarget.id) setSelectedCustomerId(null);
                          if (editingCustomerId === deleteConfirmTarget.id) setIsCustomerModalOpen(false);
                          showToast(`${deleteConfirmTarget.name} हटाइयो (Customer Deleted)`);
                        } else if (deleteConfirmTarget.type === 'payment') {
                          deleteMilkPayment(deleteConfirmTarget.id);
                          showToast('भुक्तानी रेकर्ड हटाइयो');
                        } else if (deleteConfirmTarget.type === 'daily') {
                          deleteDailyMilkRecord(deleteConfirmTarget.id);
                          showToast('दैनिक रेकर्ड हटाइयो');
                        }
                        reloadData();
                        setDeleteConfirmTarget(null);
                      }
                    }}
                    className="w-1/2 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md transition active:scale-95"
                  >
                    पिन प्रमाणित गर्नुहोस् ✓
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
