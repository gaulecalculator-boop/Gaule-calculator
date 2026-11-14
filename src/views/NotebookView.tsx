import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  BookOpen,
  Trash2,
  Edit3,
  Share2,
  Phone,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Save,
  ExternalLink,
  AlertCircle,
  Receipt,
  Percent,
  Check,
  Camera,
  Building2,
  QrCode,
  Smartphone,
  User,
  RotateCcw,
  Wallet,
  ChevronDown,
  Download,
  Upload,
} from 'lucide-react';
import {
  Language,
  Currency,
  NoteItem,
  MilkDiaryEntry,
  ByajLedgerEntry,
  ByajPayment,
} from '../types';
import { translations } from '../data/translations';
import {
  getStoredNotes,
  saveNote,
  deleteNote,
  getStoredMilkDiary,
  saveMilkDiaryEntry,
  deleteMilkDiaryEntry,
  getStoredByajLedger,
  saveByajLedgerEntry,
  deleteByajLedgerEntry,
  addByajPayment,
  toggleByajSettled,
  deleteByajPayment,
} from '../utils/storage';
import { playSuccessSound, playTapSound } from '../utils/audio';
import { formatCurrency, getTodayBS, formatBSDate, formatDateToBS, formatDateToBSNumeric } from '../utils/nepaliCalendar';
import { translateUserData, localizeNumberString } from '../utils/universalTranslator';
import { pasalStorage } from '../hamroPasal/storage/pasalStorage';
import { ShopProfile } from '../hamroPasal/types';
import { UdharKhataView } from '../hamroPasal/views/UdharKhataView';
import { NepaliBSDatePicker } from '../components/common/NepaliBSDatePicker';
import { AdvancedMilkManager } from '../components/milk/AdvancedMilkManager';
import { ReceiptModal } from '../components/ReceiptModal';
import { openExternalUrl } from '../utils/androidBridge';

interface NotebookViewProps {
  language: Language;
  currency: Currency;
  showToast: (msg: string) => void;
  onNavigate?: (view: string) => void;
  initialTab?: NotebookTab;
}

type NotebookTab = 'pasal' | 'dudh' | 'byaj' | 'notes';

export const NotebookView: React.FC<NotebookViewProps> = ({
  language,
  currency,
  showToast,
  onNavigate,
  initialTab = 'pasal',
}) => {
  const t = translations[language];
  const pick5 = (en: string, hi: string, bho: string, mai: string, ne: string) =>
    language === 'en' ? en : language === 'hi' ? hi : language === 'bho' ? bho : language === 'mai' ? mai : ne;
  const fmtCur = (amt: number) => formatCurrency(amt, currency, language);
  const fmtNum = (val: string | number) => localizeNumberString(val, language);

  // Active Notebook Tab (Default: initialTab or pasal)
  const [activeTab, setActiveTab] = useState<NotebookTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Universal Payment Receipt State
  const [selectedPaymentReceipt, setSelectedPaymentReceipt] = useState<{
    entry: ByajLedgerEntry;
    payment: ByajPayment;
  } | null>(null);

  // -------------------------------------------------------------
  // 1. HAMRO PASAL NOTEBOOK STATE
  // -------------------------------------------------------------
  const [activeShop, setActiveShop] = useState<ShopProfile | null>(() => {
    const existing = pasalStorage.getActiveShop();
    if (existing) return existing;
    const defaultShop: ShopProfile = {
      id: 'default_shop',
      name: 'हाम्रो पसल',
      ownerName: 'दुकानदार',
      mobile: '',
      address: '',
      businessType: 'grocery_kirana',
      currency: 'NPR',
      language: 'ne',
      vatPercent: 0,
      serviceChargePercent: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ownerUid: 'local_user',
    };
    try {
      pasalStorage.saveShop(defaultShop, true);
    } catch {}
    return defaultShop;
  });

  useEffect(() => {
    const unsub = pasalStorage.subscribe(() => {
      setActiveShop(pasalStorage.getActiveShop());
    });
    return unsub;
  }, []);

  // -------------------------------------------------------------
  // 2. DUDH HISAB (MILK LEDGER) STATE
  // -------------------------------------------------------------
  const [milkEntries, setMilkEntries] = useState<MilkDiaryEntry[]>(() => getStoredMilkDiary());
  const [isMilkModalOpen, setIsMilkModalOpen] = useState(false);
  const [milkDate, setMilkDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [morningLtr, setMorningLtr] = useState<string>('2.5');
  const [eveningLtr, setEveningLtr] = useState<string>('1.5');
  const [milkRate, setMilkRate] = useState<string>('70');
  const [milkNote, setMilkNote] = useState<string>('');

  const refreshMilk = () => {
    setMilkEntries(getStoredMilkDiary());
  };

  const handleSaveMilkEntry = () => {
    const m = parseFloat(morningLtr) || 0;
    const e = parseFloat(eveningLtr) || 0;
    const totalLtr = Math.round((m + e) * 100) / 100;
    const rate = parseFloat(milkRate) || 0;
    const totalPrice = Math.round(totalLtr * rate);

    if (totalLtr <= 0) {
      showToast(
        pick5(
          'Please enter milk quantity!',
          'कृपया दूध की मात्रा दर्ज करें!',
          'कृपया दूध के मात्रा लिखीं!',
          'कृपया दूधक मात्रा लिखू!',
          'कृपया दुधको परिमाण लेख्नुहोस्!'
        )
      );
      return;
    }

    playSuccessSound();
    const todayBS = getTodayBS();
    const bsStr = formatBSDate(todayBS, 'ne');

    saveMilkDiaryEntry({
      date: milkDate,
      bsDate: bsStr,
      morningLtr: m,
      eveningLtr: e,
      totalLtr,
      ratePerLtr: rate,
      totalPrice,
    });

    refreshMilk();
    setIsMilkModalOpen(false);
    showToast(
      pick5(
        `Milk entry saved: ${totalLtr} L = ${fmtCur(totalPrice)}`,
        `दूध हिसाब सुरक्षित हुआ: ${fmtNum(totalLtr)} लीटर = ${fmtCur(totalPrice)}`,
        `दूध हिसाब सेव भइल: ${fmtNum(totalLtr)} लीटर = ${fmtCur(totalPrice)}`,
        `दूध हिसाब सुरक्षित भेल: ${fmtNum(totalLtr)} लीटर = ${fmtCur(totalPrice)}`,
        `दुध हिसाब सुरक्षित भयो: ${fmtNum(totalLtr)} लिटर = ${fmtCur(totalPrice)}`
      )
    );
  };

  const handleDeleteMilk = (id: string) => {
    playTapSound();
    deleteMilkDiaryEntry(id);
    refreshMilk();
    showToast(
      pick5(
        'Record deleted',
        'रिकॉर्ड हटाया गया',
        'रिकॉर्ड हटावल गइल',
        'रिकॉर्ड हटाएल गेल',
        'रेकर्ड हटाइयो'
      )
    );
  };

  const handleShareMilkWhatsApp = (entry: MilkDiaryEntry) => {
    playTapSound();
    const dateDisplay = entry.bsDate ? translateUserData(entry.bsDate, language) : formatDateToBS(entry.date, language);
    const text =
      pick5(
        `*🥛 Milk Ledger Statement*\n` +
          `---------------------------------\n` +
          `📅 Date: ${dateDisplay}\n` +
          `🌅 Morning: ${entry.morningLtr} L\n` +
          `🌇 Evening: ${entry.eveningLtr} L\n` +
          `🥛 Total Milk: ${entry.totalLtr} L\n` +
          `💵 Rate: ${fmtCur(entry.ratePerLtr)} / L\n` +
          `💰 Total Amount: ${fmtCur(entry.totalPrice)}\n` +
          `---------------------------------\n` +
          `Please reconcile the account. Thank you! 🙏`,
        `*🥛 दूध हिसाब विवरण (Milk Ledger)*\n` +
          `---------------------------------\n` +
          `📅 तारीख: ${dateDisplay}\n` +
          `🌅 सुबह: ${fmtNum(entry.morningLtr)} लीटर\n` +
          `🌇 शाम: ${fmtNum(entry.eveningLtr)} लीटर\n` +
          `🥛 कुल दूध: ${fmtNum(entry.totalLtr)} लीटर\n` +
          `💵 दर: ${fmtCur(entry.ratePerLtr)} / लीटर\n` +
          `💰 कुल राशि: ${fmtCur(entry.totalPrice)}\n` +
          `---------------------------------\n` +
          `कृपया हिसाब मिलान करें। धन्यवाद! 🙏`,
        `*🥛 दूध हिसाब विवरण (Milk Ledger)*\n` +
          `---------------------------------\n` +
          `📅 तारीख: ${dateDisplay}\n` +
          `🌅 बिहान: ${fmtNum(entry.morningLtr)} लीटर\n` +
          `🌇 साँझ: ${fmtNum(entry.eveningLtr)} लीटर\n` +
          `🥛 कुल दूध: ${fmtNum(entry.totalLtr)} लीटर\n` +
          `💵 दर: ${fmtCur(entry.ratePerLtr)} / लीटर\n` +
          `💰 कुल रकम: ${fmtCur(entry.totalPrice)}\n` +
          `---------------------------------\n` +
          `कृपया हिसाब मिला लिहीं। धन्यवाद! 🙏`,
        `*🥛 दूध हिसाब विवरण (Milk Ledger)*\n` +
          `---------------------------------\n` +
          `📅 तिथि: ${dateDisplay}\n` +
          `🌅 भोर: ${fmtNum(entry.morningLtr)} लीटर\n` +
          `🌇 सांझ: ${fmtNum(entry.eveningLtr)} लीटर\n` +
          `🥛 कुल दूध: ${fmtNum(entry.totalLtr)} लीटर\n` +
          `💵 दर: ${fmtCur(entry.ratePerLtr)} / लीटर\n` +
          `💰 कुल राशि: ${fmtCur(entry.totalPrice)}\n` +
          `---------------------------------\n` +
          `कृपया हिसाब मिलान करब। धन्यवाद! 🙏`,
        `*🥛 दुध हिसाब विवरण (Milk Ledger)*\n` +
          `---------------------------------\n` +
          `📅 मिति: ${dateDisplay}\n` +
          `🌅 बिहान: ${fmtNum(entry.morningLtr)} लिटर\n` +
          `🌇 बेलुका: ${fmtNum(entry.eveningLtr)} लिटर\n` +
          `🥛 जम्मा दुध: ${fmtNum(entry.totalLtr)} लिटर\n` +
          `💵 दर: ${fmtCur(entry.ratePerLtr)} / लिटर\n` +
          `💰 कुल रकम: ${fmtCur(entry.totalPrice)}\n` +
          `---------------------------------\n` +
          `कृपया हिसाब मिलान गरिदिनुहोला। धन्यवाद! 🙏`
      );

    openExternalUrl(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  // Milk Totals
  const totalMilkLiters = milkEntries.reduce((acc, curr) => acc + (curr.totalLtr || 0), 0);
  const totalMilkRevenue = milkEntries.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
  const avgMilkRate =
    totalMilkLiters > 0 ? Math.round(totalMilkRevenue / totalMilkLiters) : 70;

  // -------------------------------------------------------------
  // 3. BYAJ (INTEREST) LEDGER STATE
  // -------------------------------------------------------------
  const [byajEntries, setByajEntries] = useState<ByajLedgerEntry[]>(() => getStoredByajLedger());
  const [isByajModalOpen, setIsByajModalOpen] = useState(false);
  const [isByajPaymentModalOpen, setIsByajPaymentModalOpen] = useState(false);
  const [selectedByajId, setSelectedByajId] = useState<string | null>(null);
  const [expandedByajId, setExpandedByajId] = useState<string | null>(null);

  // New Byaj Form
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('50000');
  const [monthlyRatePercent, setMonthlyRatePercent] = useState('2');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [byajNote, setByajNote] = useState('');

  // Payment Form States
  const [paymentDirection, setPaymentDirection] = useState<'received' | 'made'>('received');
  const [paymentCustomerName, setPaymentCustomerName] = useState('');
  const [paymentCustomerPhone, setPaymentCustomerPhone] = useState('');
  const [paymentDateIso, setPaymentDateIso] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentReturnDateIso, setPaymentReturnDateIso] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [isPaymentDatePickerOpen, setIsPaymentDatePickerOpen] = useState(false);
  const [isReturnDatePickerOpen, setIsReturnDatePickerOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'interest' | 'principal'>('interest');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'esewa' | 'khalti' | 'qr'>('cash');
  const [paymentBillPhoto, setPaymentBillPhoto] = useState<string>('');
  const [paymentNoteText, setPaymentNoteText] = useState('');
  const [paymentHasInterest, setPaymentHasInterest] = useState<boolean>(true);
  const [paymentInterestRate, setPaymentInterestRate] = useState<string>('2');

  // Payment History State
  const [isByajHistoryModalOpen, setIsByajHistoryModalOpen] = useState(false);
  const [historyByajId, setHistoryByajId] = useState<string | null>(null);
  const [historyFilterType, setHistoryFilterType] = useState<'all' | 'interest' | 'principal'>('all');
  const [previewBillPhoto, setPreviewBillPhoto] = useState<string | null>(null);
  const [deletePaymentConfirm, setDeletePaymentConfirm] = useState<{ entryId: string; paymentId: string } | null>(null);

  const refreshByaj = () => {
    setByajEntries(getStoredByajLedger());
  };

  const handleSaveByajLoan = () => {
    if (!borrowerName.trim()) {
      showToast(
        pick5(
          'Please enter borrower name!',
          'कृपया ऋणी का नाम दर्ज करें!',
          'कृपया ऋणी के नाम लिखीं!',
          'कृपया ऋणीक नाम लिखू!',
          'कृपया ऋणीको नाम लेख्नुहोस्!'
        )
      );
      return;
    }
    const p = parseFloat(principalAmount) || 0;
    const r = parseFloat(monthlyRatePercent) || 0;
    if (p <= 0 || r <= 0) {
      showToast(
        pick5(
          'Please enter principal amount and interest rate!',
          'कृपया मूलधन और ब्याज दर दर्ज करें!',
          'कृपया मूलधन आ ब्याज दर लिखीं!',
          'कृपया मूलधन आ ब्याज दर लिखू!',
          'कृपया साँवा रकम र ब्याज दर लेख्नुहोस्!'
        )
      );
      return;
    }

    playSuccessSound();
    saveByajLedgerEntry({
      borrowerName: borrowerName.trim(),
      phone: borrowerPhone.trim(),
      principal: p,
      monthlyRate: r,
      startDate,
      note: byajNote.trim(),
      payments: [],
      isSettled: false,
    });

    refreshByaj();
    setIsByajModalOpen(false);
    setBorrowerName('');
    setBorrowerPhone('');
    setPrincipalAmount('50000');
    setMonthlyRatePercent('2');
    setByajNote('');
    showToast(
      pick5(
        'New interest account saved!',
        'नया ब्याज खाता सुरक्षित हुआ!',
        'नया ब्याज खाता सेव भइल!',
        'नव ब्याज खाता सुरक्षित भेल!',
        'नयाँ ब्याज खाता सुरक्षित भयो!'
      )
    );
  };

  const formatBSWithAD = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      const bsNum = formatDateToBSNumeric(d, false);
      const adStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${bsNum} (${adStr})`;
    } catch {
      return isoStr;
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 600;
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
        setPaymentBillPhoto(compressed);
        playSuccessSound();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleResetPaymentForm = () => {
    playTapSound();
    setPaymentDirection('received');
    const existing = byajEntries.find((e) => e.id === selectedByajId);
    setPaymentCustomerName(existing ? existing.borrowerName : '');
    setPaymentCustomerPhone(existing ? (existing.phone || '') : '');
    setPaymentDateIso(new Date().toISOString().split('T')[0]);
    const ret = new Date();
    ret.setMonth(ret.getMonth() + 1);
    setPaymentReturnDateIso(ret.toISOString().split('T')[0]);
    setPaymentAmount('');
    setPaymentType('interest');
    setPaymentMethod('cash');
    setPaymentBillPhoto('');
    setPaymentNoteText('');
    setPaymentHasInterest(true);
    setPaymentInterestRate(existing ? String(existing.monthlyRate || '2') : '2');
    showToast(
      pick5(
        'Form reset',
        'फॉर्म रीसेट किया गया',
        'फॉर्म रीसेट भइल',
        'फॉर्म रीसेट कएल गेल',
        'फारम रिसेट गरियो'
      )
    );
  };

  const handleOpenPayment = (id: string) => {
    playTapSound();
    setSelectedByajId(id);
    const entry = byajEntries.find((e) => e.id === id);
    if (entry) {
      setPaymentCustomerName(entry.borrowerName);
      setPaymentCustomerPhone(entry.phone || '');
      setPaymentAmount('');
      setPaymentInterestRate(String(entry.monthlyRate || '2'));
    } else {
      setPaymentCustomerName('');
      setPaymentCustomerPhone('');
      setPaymentAmount('');
      setPaymentInterestRate('2');
    }
    setPaymentDirection('received');
    setPaymentType('interest');
    setPaymentMethod('cash');
    setPaymentBillPhoto('');
    setPaymentNoteText('');
    setPaymentDateIso(new Date().toISOString().split('T')[0]);
    const ret = new Date();
    ret.setMonth(ret.getMonth() + 1);
    setPaymentReturnDateIso(ret.toISOString().split('T')[0]);
    setPaymentHasInterest(true);
    setIsByajPaymentModalOpen(true);
  };

  const handleSavePayment = () => {
    const amt = parseFloat(paymentAmount) || 0;
    if (amt <= 0) {
      showToast(
        pick5(
          'Please enter payment amount!',
          'कृपया भुगतान राशि दर्ज करें!',
          'कृपया भुगतान रकम लिखीं!',
          'कृपया भुगतान राशि लिखू!',
          'कृपया भुक्तानी रकम लेख्नुहोस्!'
        )
      );
      return;
    }

    let targetId = selectedByajId;

    if (!targetId && !paymentCustomerName.trim()) {
      showToast(
        pick5(
          'Please enter customer name!',
          'कृपया ग्राहक का नाम दर्ज करें!',
          'कृपया ग्राहक के नाम लिखीं!',
          'कृपया ग्राहकक नाम लिखू!',
          'कृपया ग्राहकको नाम लेख्नुहोस्!'
        )
      );
      return;
    }

    playSuccessSound();

    if (!targetId) {
      const existing = byajEntries.find(
        (e) => e.borrowerName.toLowerCase() === paymentCustomerName.trim().toLowerCase()
      );
      if (existing) {
        targetId = existing.id;
      } else {
        const newEntry: ByajLedgerEntry = {
          id: 'byaj_' + Date.now(),
          borrowerName: paymentCustomerName.trim(),
          phone: paymentCustomerPhone.trim(),
          principal: amt,
          monthlyRate: parseFloat(paymentInterestRate) || 2,
          startDate: paymentDateIso,
          note: paymentNoteText,
          payments: [],
          isSettled: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        saveByajLedgerEntry(newEntry);
        targetId = newEntry.id;
      }
    }

    if (targetId) {
      addByajPayment(targetId, amt, paymentType, paymentNoteText, {
        date: paymentDateIso,
        direction: paymentDirection,
        method: paymentMethod,
        billPhoto: paymentBillPhoto || undefined,
        returnDate: paymentReturnDateIso || undefined,
        interestRate: paymentHasInterest ? parseFloat(paymentInterestRate) : 0,
      });
    }

    refreshByaj();
    setIsByajPaymentModalOpen(false);
    showToast(
      pick5(
        `Payment of ${fmtCur(amt)} saved!`,
        `${fmtCur(amt)} राशि भुगतान सुरक्षित हुआ!`,
        `${fmtCur(amt)} भुगतान सेव भइल!`,
        `${fmtCur(amt)} भुगतान सुरक्षित भेल!`,
        `${fmtCur(amt)} रकम भुक्तानी सुरक्षित भयो!`
      )
    );
  };

  const handleToggleSettled = (id: string) => {
    playTapSound();
    toggleByajSettled(id);
    refreshByaj();
    showToast(
      pick5(
        'Account status updated!',
        'खाता स्थिति अपडेट हुई!',
        'खाता स्थिति बदलल गइल!',
        'खाता स्थिति अपडेट भेल!',
        'खाता स्थिति परिवर्तन भयो!'
      )
    );
  };

  const handleDeleteByaj = (id: string) => {
    playTapSound();
    deleteByajLedgerEntry(id);
    refreshByaj();
    showToast(
      pick5(
        'Interest account deleted',
        'ब्याज खाता हटाया गया',
        'ब्याज खाता हटावल गइल',
        'ब्याज खाता हटाएल गेल',
        'ब्याज खाता हटाइयो'
      )
    );
  };

  const handleOpenHistory = (entryId: string | null = null) => {
    playTapSound();
    setHistoryByajId(entryId);
    setHistoryFilterType('all');
    setIsByajHistoryModalOpen(true);
  };

  const handleDeleteSinglePayment = (entryId: string, paymentId: string) => {
    playTapSound();
    deleteByajPayment(entryId, paymentId);
    refreshByaj();
    showToast(
      pick5(
        'Payment record deleted',
        'भुगतान रिकॉर्ड हटाया गया',
        'भुगतान रिकॉर्ड हटावल गइल',
        'भुगतान रिकॉर्ड हटाएल गेल',
        'भुक्तानी रेकर्ड हटाइयो'
      )
    );
  };

  const handleSharePaymentReceipt = (entry: ByajLedgerEntry, payment: ByajPayment) => {
    playTapSound();
    setSelectedPaymentReceipt({ entry, payment });
  };

  // Calculate Byaj Metrics
  const calculateByajMetrics = (entry: ByajLedgerEntry) => {
    const start = new Date(entry.startDate);
    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - start.getTime());
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(totalDays / 30);
    const remDays = totalDays % 30;

    const monthlyInterest = (entry.principal * entry.monthlyRate) / 100;
    const dailyInterest = monthlyInterest / 30;
    const totalAccruedInterest = Math.round(monthlyInterest * months + dailyInterest * remDays);

    const totalPaidInterest = (entry.payments || [])
      .filter((p) => p.type === 'interest')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPaidPrincipal = (entry.payments || [])
      .filter((p) => p.type === 'principal')
      .reduce((sum, p) => sum + p.amount, 0);

    const remainingPrincipal = Math.max(0, entry.principal - totalPaidPrincipal);
    const remainingInterest = Math.max(0, totalAccruedInterest - totalPaidInterest);
    const totalPayable = remainingPrincipal + remainingInterest;

    return {
      totalDays,
      months,
      remDays,
      monthlyInterest,
      totalAccruedInterest,
      totalPaidInterest,
      totalPaidPrincipal,
      remainingPrincipal,
      remainingInterest,
      totalPayable,
    };
  };

  const handleShareByajWhatsApp = (entry: ByajLedgerEntry) => {
    playTapSound();
    const m = calculateByajMetrics(entry);
    const borrowerDisp = translateUserData(entry.borrowerName, language);
    const bsDateDisp = formatDateToBS(entry.startDate, language);
    const durationDisp = pick5(
      `${m.months} months ${m.remDays} days`,
      `${fmtNum(m.months)} महीने ${fmtNum(m.remDays)} दिन`,
      `${fmtNum(m.months)} महीना ${fmtNum(m.remDays)} दिन`,
      `${fmtNum(m.months)} माह ${fmtNum(m.remDays)} दिन`,
      `${fmtNum(m.months)} महिना ${fmtNum(m.remDays)} दिन`
    );
    const text = pick5(
      `*🪙 Gaule Loan & Interest Statement*\n` +
        `---------------------------------\n` +
        `👤 Borrower: ${borrowerDisp}\n` +
        `📅 Loan Date: ${bsDateDisp}\n` +
        `💰 Principal: ${fmtCur(entry.principal)}\n` +
        `📈 Monthly Rate: ${entry.monthlyRate}% (${fmtCur(m.monthlyInterest)}/month)\n` +
        `⏳ Duration: ${durationDisp}\n` +
        `📊 Accrued Interest: ${fmtCur(m.totalAccruedInterest)}\n` +
        (m.totalPaidInterest > 0 ? `💵 Paid Interest: ${fmtCur(m.totalPaidInterest)}\n` : '') +
        (m.totalPaidPrincipal > 0 ? `💵 Returned Principal: ${fmtCur(m.totalPaidPrincipal)}\n` : '') +
        `---------------------------------\n` +
        `🔴 *Total Payable Balance: ${fmtCur(m.totalPayable)}*\n` +
        `---------------------------------\n` +
        `Please settle the account at your earliest convenience. Thank you! 🙏`,
      `*🪙 गाँवले ब्याज हिसाब विवरण (Loan & Interest Statement)*\n` +
        `---------------------------------\n` +
        `👤 ऋणी: ${borrowerDisp}\n` +
        `📅 ऋण लेने की तारीख: ${bsDateDisp}\n` +
        `💰 मूलधन राशि: ${fmtCur(entry.principal)}\n` +
        `📈 मासिक ब्याज दर: ${fmtNum(entry.monthlyRate)}% (प्रति माह ${fmtCur(m.monthlyInterest)})\n` +
        `⏳ अवधि: ${durationDisp}\n` +
        `📊 कुल अर्जित ब्याज: ${fmtCur(m.totalAccruedInterest)}\n` +
        (m.totalPaidInterest > 0 ? `💵 चुकाया गया ब्याज: ${fmtCur(m.totalPaidInterest)}\n` : '') +
        (m.totalPaidPrincipal > 0 ? `💵 वापस मूलधन: ${fmtCur(m.totalPaidPrincipal)}\n` : '') +
        `---------------------------------\n` +
        `🔴 *कुल बकाया चुकता राशि: ${fmtCur(m.totalPayable)}*\n` +
        `---------------------------------\n` +
        `कृपया जल्द से जल्द हिसाब क्लियर करें। धन्यवाद! 🙏`,
      `*🪙 गाँव के ब्याज हिसाब विवरण (Loan & Interest Statement)*\n` +
        `---------------------------------\n` +
        `👤 ऋणी: ${borrowerDisp}\n` +
        `📅 कर्जा लेवे के तारीख: ${bsDateDisp}\n` +
        `💰 मूलधन रकम: ${fmtCur(entry.principal)}\n` +
        `📈 मासिक ब्याज दर: ${fmtNum(entry.monthlyRate)}% (हर महीना ${fmtCur(m.monthlyInterest)})\n` +
        `⏳ अवधि: ${durationDisp}\n` +
        `📊 कुल पाकल ब्याज: ${fmtCur(m.totalAccruedInterest)}\n` +
        (m.totalPaidInterest > 0 ? `💵 देवल ब्याज: ${fmtCur(m.totalPaidInterest)}\n` : '') +
        (m.totalPaidPrincipal > 0 ? `💵 वापस मूलधन: ${fmtCur(m.totalPaidPrincipal)}\n` : '') +
        `---------------------------------\n` +
        `🔴 *कुल बाकी चुकता रकम: ${fmtCur(m.totalPayable)}*\n` +
        `---------------------------------\n` +
        `कृपया जल्दी हिसाब क्लियर कर दिहीं। धन्यवाद! 🙏`,
      `*🪙 गामक ब्याज हिसाब विवरण (Loan & Interest Statement)*\n` +
        `---------------------------------\n` +
        `👤 ऋणी: ${borrowerDisp}\n` +
        `📅 ऋण लेबाक तिथि: ${bsDateDisp}\n` +
        `💰 मूलधन राशि: ${fmtCur(entry.principal)}\n` +
        `📈 मासिक ब्याज दर: ${fmtNum(entry.monthlyRate)}% (प्रति माह ${fmtCur(m.monthlyInterest)})\n` +
        `⏳ अवधि: ${durationDisp}\n` +
        `📊 कुल पाकल ब्याज: ${fmtCur(m.totalAccruedInterest)}\n` +
        (m.totalPaidInterest > 0 ? `💵 देल गेल ब्याज: ${fmtCur(m.totalPaidInterest)}\n` : '') +
        (m.totalPaidPrincipal > 0 ? `💵 वापस मूलधन: ${fmtCur(m.totalPaidPrincipal)}\n` : '') +
        `---------------------------------\n` +
        `🔴 *कुल बाकी चुकता राशि: ${fmtCur(m.totalPayable)}*\n` +
        `---------------------------------\n` +
        `कृपया शीघ्र हिसाब क्लियर करू। धन्यवाद! 🙏`,
      `*🪙 गाउँले ब्याज हिसाब विवरण (Loan & Interest Statement)*\n` +
        `---------------------------------\n` +
        `👤 ऋणी: ${borrowerDisp}\n` +
        `📅 ऋण लिएको मिति: ${bsDateDisp}\n` +
        `💰 साँवा रकम: ${fmtCur(entry.principal)}\n` +
        `📈 मासिक ब्याज दर: ${fmtNum(entry.monthlyRate)}% (प्रति महिना ${fmtCur(m.monthlyInterest)})\n` +
        `⏳ अवधि: ${durationDisp}\n` +
        `📊 जम्मा पाक्ने ब्याज: ${fmtCur(m.totalAccruedInterest)}\n` +
        (m.totalPaidInterest > 0 ? `💵 बुझाएको ब्याज: ${fmtCur(m.totalPaidInterest)}\n` : '') +
        (m.totalPaidPrincipal > 0 ? `💵 फिर्ता साँवा: ${fmtCur(m.totalPaidPrincipal)}\n` : '') +
        `---------------------------------\n` +
        `🔴 *कुल बाँकी चुक्ता गर्नुपर्ने: ${fmtCur(m.totalPayable)}*\n` +
        `---------------------------------\n` +
        `कृपया यथाशीघ्र हिसाब क्लियर गरिदिनुहोला। धन्यवाद! 🙏`
    );

    const phone = entry.phone ? entry.phone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    openExternalUrl(url);
  };

  // Byaj Totals
  const totalPrincipalLent = byajEntries.reduce((sum, e) => sum + (e.principal || 0), 0);
  const totalAccruedInterestSum = byajEntries.reduce((sum, e) => {
    const m = calculateByajMetrics(e);
    return sum + m.totalAccruedInterest;
  }, 0);
  const totalCollectedSum = byajEntries.reduce((sum, e) => {
    const paid = (e.payments || []).reduce((pSum, p) => pSum + p.amount, 0);
    return sum + paid;
  }, 0);

  // -------------------------------------------------------------
  // 4. NOTES STATE (Legacy compatibility so notes aren't lost)
  // -------------------------------------------------------------
  const [notes, setNotes] = useState<NoteItem[]>(() => getStoredNotes());
  const [noteFilter, setNoteFilter] = useState<string>('All');
  const [noteSearch, setNoteSearch] = useState<string>('');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<NoteItem['category']>('Personal');

  const filteredNotes = notes.filter((n) => {
    const matchesCat = noteFilter === 'All' || n.category === noteFilter;
    const matchesSearch =
      !noteSearch.trim() ||
      n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
      n.content.toLowerCase().includes(noteSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleOpenNewNote = () => {
    playTapSound();
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('Personal');
    setIsNoteModalOpen(true);
  };

  const handleEditNote = (note: NoteItem) => {
    playTapSound();
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteCategory(note.category);
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = () => {
    if (!noteTitle.trim() && !noteContent.trim()) return;
    playSuccessSound();
    saveNote(
      {
        title: noteTitle.trim() || 'Untitled Note',
        content: noteContent.trim(),
        category: noteCategory,
      },
      editingNoteId || undefined
    );
    setNotes(getStoredNotes());
    setIsNoteModalOpen(false);
    showToast(
      pick5(
        'Note saved!',
        'नोट सुरक्षित हुआ!',
        'नोट सेव भइल!',
        'नोट सुरक्षित भेल!',
        'नोट सुरक्षित भयो!'
      )
    );
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playTapSound();
    deleteNote(id);
    setNotes(getStoredNotes());
  };

  return (
    <div className="space-y-4 pb-24 select-none">
      {/* ========================================================= */}
      {/* MASTER 3 NOTEBOOKS TAB SELECTOR                           */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl p-1.5 shadow-sm border border-slate-200/90 grid grid-cols-3 gap-1.5">
        {/* Notebook 1: Hamro Pasal */}
        <button
          type="button"
          onClick={() => {
            playTapSound();
            setActiveTab('pasal');
          }}
          className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl transition cursor-pointer ${
            activeTab === 'pasal'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 font-black'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-base">📕</span>
            <span className="text-xs tracking-tight">
              {pick5('My Shop', 'हमारा दुकान', 'हमार दोकान', 'हमर दोकान', 'हाम्रो पसल')}
            </span>
          </div>
          <span
            className={`text-[10px] mt-0.5 ${
              activeTab === 'pasal' ? 'text-rose-100' : 'text-slate-400'
            }`}
          >
            {pick5('Credit Ledger', 'उधार खाता', 'उधार खाता', 'उधार खाता', 'उधार खाता')}
          </span>
        </button>

        {/* Notebook 2: Dudh Hisab */}
        <button
          type="button"
          onClick={() => {
            playTapSound();
            setActiveTab('dudh');
          }}
          className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl transition cursor-pointer ${
            activeTab === 'dudh'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-black'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-base">🥛</span>
            <span className="text-xs tracking-tight">
              {pick5('Milk Ledger', 'दूध हिसाब', 'दूध हिसाब', 'दूध हिसाब', 'दुध हिसाब')}
            </span>
          </div>
          <span
            className={`text-[10px] mt-0.5 ${
              activeTab === 'dudh' ? 'text-blue-100' : 'text-slate-400'
            }`}
          >
            {pick5('Customers & Bills', 'ग्राहक व भुगतान', 'ग्राहक आ भुगतान', 'ग्राहक आ भुगतान', 'ग्राहक तथा भुक्तानी')}
          </span>
        </button>

        {/* Notebook 3: Byaj Hisab */}
        <button
          type="button"
          onClick={() => {
            playTapSound();
            setActiveTab('byaj');
          }}
          className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl transition cursor-pointer ${
            activeTab === 'byaj'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 font-black'
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-base">🪙</span>
            <span className="text-xs tracking-tight">
              {pick5('Interest Ledger', 'ब्याज हिसाब', 'ब्याज हिसाब', 'ब्याज हिसाब', 'ब्याज हिसाब')}
            </span>
          </div>
          <span
            className={`text-[10px] mt-0.5 ${
              activeTab === 'byaj' ? 'text-amber-100' : 'text-slate-400'
            }`}
          >
            {fmtNum(byajEntries.length)} {pick5('accounts', 'खाते', 'खाता', 'खाता', 'खाता')}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. NOTEBOOK 1: HAMRO PASAL KHATA                          */}
      {/* ========================================================= */}
      {activeTab === 'pasal' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {activeShop && <UdharKhataView shop={activeShop} appLanguage={language} />}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. NOTEBOOK 2: DUDH HISAB KHATA                           */}
      {/* ========================================================= */}
      {activeTab === 'dudh' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <AdvancedMilkManager
            language={language}
            showToast={showToast}
            onNavigateToCalendarTool={() => onNavigate && onNavigate('tool_doodh')}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. NOTEBOOK 3: BYAJ HISAB KHATA                           */}
      {/* ========================================================= */}
      {activeTab === 'byaj' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Top Byaj Metrics Card */}
          <div className="bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-white rounded-3xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                  🪙
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight text-white">
                    {pick5(
                      'Village Interest Ledger',
                      'गाँवले ब्याज खाता',
                      'गाँव के ब्याज खाता',
                      'गामक ब्याज खाता',
                      'गाउँले ब्याज खाता'
                    )}
                  </h3>
                  <p className="text-[11px] text-amber-100 font-medium">
                    {pick5(
                      'Monthly interest, principal lending & collection diary',
                      'मासिक ब्याज (सैकड़ा हिसाब), मूलधन और वसूली डायरी',
                      'हर महीना के ब्याज (सैकड़ा हिसाब), मूलधन आ वसूली डायरी',
                      'मासिक ब्याज (सैकड़ा हिसाब), मूलधन आ असुली डायरी',
                      'मासिक ब्याज (सैकड़ा हिसाब), साँवा लगानी तथा असुली डायरी'
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  setIsByajModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-white text-amber-800 hover:bg-amber-50 px-3.5 py-2 rounded-2xl text-xs font-black shadow-md active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>
                  {pick5('+ New Account', '+ नया ब्याज खाता', '+ नया ब्याज खाता', '+ नव ब्याज खाता', '+ नयाँ ब्याज खाता')}
                </span>
              </button>
            </div>

            {/* 3 Metric Pills */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-white/10 rounded-2xl p-2.5 border border-white/15">
                <span className="text-[10px] text-amber-200 block font-bold">
                  {pick5('Total Principal Lent', 'कुल निवेश मूलधन', 'कुल देवल मूलधन', 'कुल निवेश मूलधन', 'कुल लगानी साँवा')}
                </span>
                <span className="text-base font-black text-white">
                  {fmtCur(totalPrincipalLent)}
                </span>
              </div>
              <div className="bg-white/10 rounded-2xl p-2.5 border border-white/15">
                <span className="text-[10px] text-amber-200 block font-bold">
                  {pick5('Total Accrued Interest', 'कुल अर्जित ब्याज', 'कुल पाकल ब्याज', 'कुल पाकल ब्याज', 'जम्मा पाक्ने ब्याज')}
                </span>
                <span className="text-base font-black text-amber-200">
                  {fmtCur(totalAccruedInterestSum)}
                </span>
              </div>
              <div className="bg-white/10 rounded-2xl p-2.5 border border-white/15">
                <span className="text-[10px] text-amber-200 block font-bold">
                  {pick5('Total Collected', 'कुल वसूली', 'कुल वसूली', 'कुल असुली', 'कुल असुल जम्मा')}
                </span>
                <span className="text-base font-black text-emerald-300">
                  {fmtCur(totalCollectedSum)}
                </span>
              </div>
            </div>
          </div>

          {/* Byaj Records List */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200/80 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shadow-xs">
                  📋
                </span>
                <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  {pick5('Account Details', 'खाता विवरण', 'खाता के जानकारी', 'खाता विवरण', 'खाता जानकारी')} ({fmtNum(byajEntries.length)})
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenHistory(null)}
                  className="text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/90 px-2.5 py-1 rounded-xl flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-2xs"
                  title={pick5('View all payment history', 'सभी भुगतान इतिहास देखें', 'सब भुगतान इतिहास देखीं', 'सभ भुगतान इतिहास देखू', 'सबै भुक्तानी इतिहास हेर्नुहोस्')}
                >
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  <span>{pick5('Payment History', 'भुगतान इतिहास', 'भुगतान इतिहास', 'भुगतान इतिहास', 'भुक्तानी इतिहास')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    if (onNavigate) {
                      onNavigate('tool_byaj');
                    } else {
                      setIsByajModalOpen(true);
                    }
                  }}
                  className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition active:scale-95 cursor-pointer"
                >
                  <span>{pick5('View Full Details', 'विस्तृत विवरण देखें', 'पूरा विवरण देखीं', 'विस्तृत विवरण देखू', 'विस्तृत विवरण हेर्नुहोस्')}</span>
                  <span className="text-sm font-black">➔</span>
                </button>
              </div>
            </div>

            {byajEntries.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 border border-amber-100 flex items-center justify-center text-3xl">
                  🪙
                </div>
                <div className="space-y-1">
                  <h5 className="text-sm font-black text-slate-800">
                    {pick5('No Interest Accounts', 'कोई ब्याज खाता नहीं है', 'कवनो ब्याज खाता नइखे', 'कोनो ब्याज खाता नहि अछि', 'कुनै ब्याज खाता छैन')}
                  </h5>
                  <p className="text-xs text-slate-500">
                    {pick5(
                      'Tap "+ New Account" above to track loans, principal and 1%, 2%, 3% monthly interest.',
                      'गाँव के कर्ज, मूलधन और 1%, 2%, 3% मासिक ब्याज का हिसाब रखने के लिए ऊपर "+ नया ब्याज खाता" दबाएं।',
                      'गाँव के कर्जा, मूलधन आ १%, २%, ३% महीना के ब्याज हिसाब राखे खातिर ऊपर "+ नया ब्याज खाता" दबाईं।',
                      'गामक ऋण, मूलधन आ १%, २%, ३% मासिक ब्याज हिसाब राखबाक लेल ऊपर "+ नव ब्याज खाता" दबाउ।',
                      'गाउँले ऋण, साँवा र १%, २%, ३% मासिक ब्याज हिसाब राख्न माथि "+ नयाँ ब्याज खाता" थिच्नुहोस्।'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setIsByajModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-2xl text-xs font-black shadow-sm active:scale-95 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>
                    {pick5('+ Add New Interest Account', '+ नया ब्याज खाता जोड़ें', '+ नया ब्याज खाता जोड़ीं', '+ नव ब्याज खाता जोड़ू', '+ नयाँ ब्याज खाता थप्नुहोस्')}
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {byajEntries.map((entry) => {
                  const m = calculateByajMetrics(entry);
                  const clean = (entry.borrowerName || '').trim();
                  const parts = clean.split(/[\s.]+/).filter(Boolean);
                  const initials =
                    parts.length >= 2 && /^[a-zA-Z]/.test(parts[0])
                      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
                      : /^[a-zA-Z]/.test(clean)
                      ? clean.slice(0, 2).toUpperCase()
                      : parts.length >= 2
                      ? `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`
                      : clean.slice(0, 2) || 'Nj';
                  const isExpanded = expandedByajId === entry.id;

                  return (
                    <div
                      key={entry.id}
                      onClick={() => {
                        playTapSound();
                        setExpandedByajId((prev) => (prev === entry.id ? null : entry.id));
                      }}
                      className={`p-4 sm:p-5 rounded-3xl border transition shadow-xs space-y-3.5 bg-white cursor-pointer ${
                        isExpanded
                          ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-md'
                          : entry.isSettled
                          ? 'border-slate-200 opacity-80'
                          : 'border-slate-200/90 hover:border-purple-300'
                      }`}
                    >
                      {/* Top Header Section: Avatar + Details + Highlight Box */}
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#D6E4FF] text-slate-900 font-black text-lg sm:text-xl flex items-center justify-center shrink-0 shadow-xs">
                            {initials}
                          </div>

                          <div className="min-w-0">
                            <h5 className="font-black text-slate-900 text-sm sm:text-base truncate leading-snug">
                              {translateUserData(entry.borrowerName, language)}
                            </h5>

                            {entry.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1 font-semibold">
                                <Phone className="w-3.5 h-3.5 text-slate-800 stroke-[2.2] shrink-0" />
                                <span className="truncate">
                                  {pick5('Phone:', 'नंबर:', 'नंबर:', 'नम्बर:', 'नम्बर:')} {fmtNum(entry.phone)}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5 font-semibold">
                              <Calendar className="w-3.5 h-3.5 text-slate-800 stroke-[2.2] shrink-0" />
                              <span className="truncate">
                                {pick5('Date:', 'दिनांक:', 'तारीख:', 'तिथि:', 'भएको मिति:')} {formatDateToBS(entry.startDate, language)} ({pick5(`approx ${m.totalDays} days`, `लगभग ${fmtNum(m.totalDays)} दिन`, `लगभग ${fmtNum(m.totalDays)} दिन`, `अनुमानित ${fmtNum(m.totalDays)} दिन`, `लगभग ${fmtNum(m.totalDays)} दिन`)})
                              </span>
                            </div>

                            {entry.note && (
                              <p className="text-[11px] text-slate-400 italic mt-0.5 truncate">
                                {translateUserData(entry.note, language)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Top Right Highlight Box */}
                        <div className="bg-[#FFE5EB] border border-[#FECDD6] rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-center shrink-0 min-w-[115px]">
                          <span className="text-[11px] sm:text-xs font-bold text-[#9F1239] block">
                            {pick5('Monthly Interest', 'कुल मासिक ब्याज', 'कुल मासिक ब्याज', 'कुल मासिक ब्याज', 'कुल मासिक ब्याज')}
                          </span>
                          <span className="text-xl sm:text-2xl font-black text-[#E11D48] block leading-tight mt-0.5">
                            {fmtCur(m.monthlyInterest)}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Full Byaj Account Details */}
                      {isExpanded && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="space-y-3.5 animate-in fade-in duration-150 cursor-default"
                        >
                          {/* Principal & Monthly Rate Summary */}
                          <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200/80 rounded-2xl px-3.5 py-2 text-xs">
                            <span className="font-bold text-amber-950">
                              {pick5('Principal:', 'मूलधन राशि:', 'मूलधन रकम:', 'मूलधन राशि:', 'साँवा लगानी:')} <strong className="font-black">{fmtCur(entry.principal)}</strong>
                            </span>
                            <span className="font-bold text-amber-900">
                              {pick5('Rate:', 'ब्याज दर:', 'ब्याज दर:', 'ब्याज दर:', 'ब्याज दर:')} <strong className="font-black">{fmtNum(entry.monthlyRate)}% {pick5('monthly', 'मासिक', 'महीना के', 'मासिक', 'मासिक')}</strong>
                            </span>
                          </div>

                          {/* Middle Financial Row */}
                          <div className="grid grid-cols-3 divide-x divide-slate-200 border-t border-b border-slate-100 py-2.5 text-center">
                            <div className="px-1">
                              <span className="text-xs font-semibold text-slate-500 block mb-0.5">
                                {pick5('Monthly Interest', 'मासिक ब्याज', 'महीना के ब्याज', 'मासिक ब्याज', 'मासिक ब्याज')}
                              </span>
                              <span className="text-sm sm:text-base font-extrabold text-slate-900">
                                {fmtCur(m.monthlyInterest)}
                              </span>
                            </div>

                            <div className="px-1">
                              <span className="text-xs font-semibold text-slate-500 block mb-0.5">
                                {pick5('Due Interest', 'बकाया ब्याज', 'बाकी ब्याज', 'बाकी ब्याज', 'बाँकी ब्याज')}
                              </span>
                              <span className="text-sm sm:text-base font-extrabold text-amber-700">
                                {fmtCur(m.remainingInterest)}
                              </span>
                            </div>

                            <div className="px-1">
                              <span className="text-xs font-semibold text-slate-500 block mb-0.5">
                                {pick5('Total Receivable', 'कुल देय राशि', 'कुल मिले वाला रकम', 'कुल देय राशि', 'कुल पाउनुपर्ने रकम')}
                              </span>
                              <span className="text-sm sm:text-base font-black text-emerald-600">
                                {fmtCur(m.totalPayable)}
                              </span>
                            </div>
                          </div>

                          {/* Payment History Preview Strip */}
                          {(entry.payments?.length || 0) > 0 && (
                            <div className="flex items-center justify-between bg-purple-50/70 border border-purple-100/90 rounded-2xl px-3.5 py-2 text-xs">
                              <div className="flex items-center gap-1.5 text-purple-900 font-semibold truncate">
                                <Clock className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                                <span className="truncate">
                                  {pick5('Payment records:', 'भुगतान रिकॉर्ड:', 'भुगतान रिकॉर्ड:', 'भुगतान रिकॉर्ड:', 'भुक्तानी रेकर्ड:')}{' '}
                                  <strong className="font-black text-purple-950">
                                    {fmtNum(entry.payments.length)} {pick5('times', 'बार', 'बेरी', 'बेर', 'पटक')}
                                  </strong>{' '}
                                  ({fmtCur((entry.payments || []).reduce((s, p) => s + p.amount, 0))})
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenHistory(entry.id)}
                                className="font-black text-purple-700 hover:text-purple-950 bg-white hover:bg-purple-100 border border-purple-200 rounded-xl px-2.5 py-1 text-[11px] flex items-center gap-1 transition active:scale-95 shadow-2xs shrink-0 cursor-pointer"
                              >
                                <span>{pick5('View History', 'इतिहास देखें', 'इतिहास देखीं', 'इतिहास देखू', 'इतिहास हेर्नुहोस्')}</span>
                                <span className="text-xs">➔</span>
                              </button>
                            </div>
                          )}

                          {/* Action Buttons Row */}
                          <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(entry.id)}
                              className="flex-[2] min-w-[100px] py-2.5 px-3 bg-[#00A854] hover:bg-[#00944A] active:scale-95 text-white rounded-full text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                            >
                              <span className="text-sm font-black">{currency === 'NPR' ? 'रु' : '₹'}</span>
                              <span>{pick5('Collect', 'रकम वसूली', 'रकम वसूली', 'असुली', 'रकम असुली')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenHistory(entry.id)}
                              className="flex-[2] min-w-[100px] py-2.5 px-3 bg-[#F3E8FF] hover:bg-[#E9D5FF] active:scale-95 text-[#7E22CE] rounded-full text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 border border-[#D8B4FE] transition cursor-pointer"
                              title={pick5('View payment history', 'भुगतान इतिहास देखें', 'भुगतान इतिहास देखीं', 'भुगतान इतिहास देखू', 'भुक्तानी इतिहास हेर्नुहोस्')}
                            >
                              <Clock className="w-3.5 h-3.5 text-[#7E22CE] stroke-[2.2]" />
                              <span>{pick5('History', 'इतिहास', 'इतिहास', 'इतिहास', 'इतिहास')} ({fmtNum(entry.payments?.length || 0)})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleShareByajWhatsApp(entry)}
                              className="flex-[2] min-w-[110px] py-2.5 px-3 bg-[#DCE7FE] hover:bg-[#CCDDFE] active:scale-95 text-[#2563EB] rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Share2 className="w-4 h-4 text-[#2563EB] stroke-[2.2]" />
                              <span>{pick5('Share (WhatsApp)', 'साझा (WhatsApp)', 'भेजीं (WhatsApp)', 'साझा (WhatsApp)', 'साझा (WhatsApp)')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleSettled(entry.id)}
                              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border transition active:scale-90 cursor-pointer ${
                                entry.isSettled
                                  ? 'bg-slate-200 border-slate-300 text-slate-700'
                                  : 'bg-[#E0F7F6] border-[#A7F0EC] hover:bg-[#D0F4F2] text-[#00B4A7]'
                              }`}
                              title={pick5('Toggle settled status', 'हिसाब चुकता स्थिति बदलें', 'हिसाब चुकता स्थिति बदलीं', 'हिसाब चुकता स्थिति बदलू', 'हिसाब चुक्ता स्थिति बदल्नुहोस्')}
                            >
                              <CheckCircle2 className="w-5 h-5 text-[#00B4A7] fill-[#00B4A7]/15 stroke-[2.2]" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteByaj(entry.id)}
                              className="w-10 h-10 rounded-full bg-[#FEE2E2] border border-[#FECACA] hover:bg-[#FED4D4] active:scale-90 text-[#EF4444] flex items-center justify-center shrink-0 transition cursor-pointer"
                              title={pick5('Delete account', 'खाता हटाएं', 'खाता हटाईं', 'खाता हटाउ', 'मेटाउनुहोस्')}
                            >
                              <Trash2 className="w-4 h-4 text-[#EF4444] stroke-[2]" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. NOTEBOOK 4: PERSONAL NOTES (OPTIONAL TAB)             */}
      {/* ========================================================= */}
      {activeTab === 'notes' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1">
                <span>{pick5('My Notes', 'मेरे नोट्स', 'हमार नोट्स', 'हमर नोट्स', 'मेरा नोटहरू')}</span> <span>📖</span>
              </h3>
              <p className="text-[11px] text-slate-500">{t.tapNoteToEdit}</p>
            </div>
            <button
              onClick={handleOpenNewNote}
              className="flex items-center gap-1.5 bg-[#1D4ED8] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs py-2 px-3.5 rounded-full shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{t.newNote}</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={noteSearch}
              onChange={(e) => setNoteSearch(e.target.value)}
              placeholder={t.searchNotes}
              className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pl-9 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-xs outline-none focus:border-blue-500"
            />
          </div>

          {filteredNotes.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-sm space-y-4 my-2">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center text-4xl shadow-xs">
                📝
              </div>
              <div className="space-y-1 max-w-xs mx-auto">
                <h4 className="text-base font-extrabold text-slate-900">{t.noNotesYet}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{t.noNotesDesc}</p>
              </div>
              <button
                onClick={handleOpenNewNote}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-bold text-xs py-3 px-6 rounded-2xl shadow-lg shadow-blue-500/25 transition"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{t.writeNewNote}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleEditNote(note)}
                  className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-blue-300 shadow-xs hover:shadow-md transition active:scale-[0.99] cursor-pointer space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-extrabold text-slate-900 text-sm">{translateUserData(note.title, language)}</h4>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                        {translateUserData(note.category, language)}
                      </span>
                      <button
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="p-1 text-slate-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {translateUserData(note.content, language)}
                  </p>
                  <div className="text-[10px] text-slate-400 font-medium pt-1">
                    {formatDateToBS(note.updatedAt, language)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ADD MILK ENTRY                                   */}
      {/* ========================================================= */}
      {isMilkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🥛</span>
                <h4 className="font-black text-sm text-slate-900">
                  {pick5('Add Milk Entry', 'नया दूध हिसाब लिखें', 'नया दूध हिसाब लिखीं', 'नव दूध हिसाब लिखू', 'नयाँ दुध हिसाब लेख्नुहोस्')}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsMilkModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <NepaliBSDatePicker
                label={pick5('Date (BS):', 'तिथि (वि.सं.):', 'तारीख (वि.सं.):', 'तिथि (वि.सं.):', 'मिति (वि.सं.):')}
                value={milkDate}
                onChange={(iso) => setMilkDate(iso)}
                language={language}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  🌅 {pick5('Morning Milk (Ltr):', 'सुबह का दूध (लीटर):', 'बिहान के दूध (लीटर):', 'भोरक दूध (लीटर):', 'बिहानको दुध (लिटर):')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={morningLtr}
                  onChange={(e) => setMorningLtr(e.target.value)}
                  placeholder="2.5"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  🌇 {pick5('Evening Milk (Ltr):', 'शाम का दूध (लीटर):', 'साँझ के दूध (लीटर):', 'सांझक दूध (लीटर):', 'बेलुकाको दुध (लिटर):')}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={eveningLtr}
                  onChange={(e) => setEveningLtr(e.target.value)}
                  placeholder="1.5"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                {pick5('Rate per Liter:', 'दर प्रति लीटर:', 'दर प्रति लीटर:', 'दर प्रति लीटर:', 'दर प्रति लिटर:')}
              </label>
              <input
                type="number"
                value={milkRate}
                onChange={(e) => setMilkRate(e.target.value)}
                placeholder="70"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            {/* Calculated Preview */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-blue-600 font-bold block">
                  {pick5('Total Milk', 'कुल दूध', 'कुल दूध', 'कुल दूध', 'जम्मा दुध')}
                </span>
                <span className="text-sm font-black text-blue-900">
                  {fmtNum(((parseFloat(morningLtr) || 0) + (parseFloat(eveningLtr) || 0)).toFixed(1))}{' '}
                  {pick5('Liters', 'लीटर', 'लीटर', 'लीटर', 'लिटर')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-blue-600 font-bold block">
                  {pick5('Total Amount', 'कुल राशि', 'कुल रकम', 'कुल राशि', 'कुल रकम')}
                </span>
                <span className="text-sm font-black text-emerald-700">
                  {fmtCur(
                    ((parseFloat(morningLtr) || 0) + (parseFloat(eveningLtr) || 0)) *
                      (parseFloat(milkRate) || 0)
                  )}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveMilkEntry}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
            >
              <Save className="w-4 h-4" />
              <span>{pick5('Save Milk Entry', 'दूध हिसाब सुरक्षित करें', 'दूध हिसाब सेव करीं', 'दूध हिसाब सुरक्षित करू', 'दुध हिसाब सुरक्षित गर्नुहोस्')}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ADD BYAJ (LOAN) ENTRY                            */}
      {/* ========================================================= */}
      {isByajModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-3.5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🪙</span>
                <h4 className="font-black text-sm text-slate-900">
                  {pick5('Add New Interest Account', 'नया ब्याज खाता जोड़ें', 'नया ब्याज खाता जोड़ीं', 'नव ब्याज खाता जोड़ू', 'नयाँ ब्याज खाता थप्नुहोस्')}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsByajModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                {pick5('Borrower Name:', 'ऋणी का नाम:', 'ऋणी के नाम:', 'ऋणीक नाम:', 'ऋणीको नाम:')}
              </label>
              <input
                type="text"
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
                placeholder={pick5('e.g. Ram Bahadur Thapa', 'उदा. राम बहादुर थापा', 'जइसे राम बहादुर थापा', 'जेना राम बहादुर थापा', 'उदा. राम बहादुर थापा')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                {pick5('Contact Number (WhatsApp):', 'संपर्क नंबर (WhatsApp):', 'फोन नंबर (WhatsApp):', 'सम्पर्क नम्बर (WhatsApp):', 'सम्पर्क नम्बर (WhatsApp):')}
              </label>
              <input
                type="text"
                value={borrowerPhone}
                onChange={(e) => setBorrowerPhone(e.target.value)}
                placeholder="98..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                {pick5('Principal Amount:', 'मूलधन राशि:', 'मूलधन रकम:', 'मूलधन राशि:', 'साँवा रकम:')}
              </label>
              <input
                type="number"
                value={principalAmount}
                onChange={(e) => setPrincipalAmount(e.target.value)}
                placeholder="50000"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                {pick5('Monthly Interest Rate (%):', 'मासिक ब्याज दर (%):', 'हर महीना ब्याज दर (%):', 'मासिक ब्याज दर (%):', 'मासिक ब्याज दर (%):')}
              </label>
              <div className="flex items-center gap-1.5 mb-1.5">
                {['1', '1.5', '2', '2.5', '3', '5'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setMonthlyRatePercent(r);
                    }}
                    className={`flex-1 py-1 rounded-xl text-xs font-black border transition ${
                      monthlyRatePercent === r
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {r}%
                  </button>
                ))}
              </div>
              <input
                type="number"
                step="0.1"
                value={monthlyRatePercent}
                onChange={(e) => setMonthlyRatePercent(e.target.value)}
                placeholder="2"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {pick5('1 Month Interest:', '1 महीने का ब्याज:', '१ महीना के ब्याज:', '१ माहक ब्याज:', '१ महिनाको ब्याज:')}{' '}
                {fmtCur(((parseFloat(principalAmount) || 0) * (parseFloat(monthlyRatePercent) || 0)) / 100)}
              </span>
            </div>

            <div>
              <NepaliBSDatePicker
                label={pick5('Loan Date (BS Calendar):', 'ऋण लेने की तिथि (वि.सं.):', 'कर्जा लेवे के तारीख (वि.सं.):', 'ऋण लेबाक तिथि (वि.सं.):', 'ऋण लिएको मिति (वि.सं.):')}
                value={startDate}
                onChange={(iso) => setStartDate(iso)}
                language={language}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                {pick5('Notes / Collateral:', 'विवरण या गिरवी:', 'विवरण भा गिरवी:', 'विवरण वा धितो:', 'विवरण वा धितो:')}
              </label>
              <input
                type="text"
                value={byajNote}
                onChange={(e) => setByajNote(e.target.value)}
                placeholder={pick5('e.g. Household need or Land security', 'उदा. घरेलू खर्च या ज़मीन गिरवी', 'जइसे घर के खरच भा जमीन गिरवी', 'जेना घरेलू खर्च वा जमीन धितो', 'उदा. घरायसी खर्च वा जग्गा धितो')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveByajLoan}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
            >
              <Save className="w-4 h-4" />
              <span>{pick5('Save Interest Account', 'ब्याज खाता सुरक्षित करें', 'ब्याज खाता सेव करीं', 'ब्याज खाता सुरक्षित करू', 'ब्याज खाता सुरक्षित गर्नुहोस्')}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: RECORD BYAJ PAYMENT                              */}
      {/* ========================================================= */}
      {isByajPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[96vh] flex flex-col animate-in zoom-in-95">
            {/* 1. Header with purple gradient */}
            <div className="bg-gradient-to-r from-[#3B0764] via-[#4C1D95] to-[#6D28D9] text-white px-5 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center shrink-0 text-xl shadow-xs">
                  💵
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-white leading-tight">
                    {pick5('Payment Collection', 'रकम वसूली / भुगतान', 'रकम वसूली / भुगतान', 'असुली / भुगतान', 'रकम असुली / भुक्तानी')}
                  </h3>
                  <p className="font-extrabold text-xs text-[#FACC15] tracking-wide">
                    {pick5('Record interest or principal payment', 'ब्याज या मूलधन भुगतान दर्ज करें', 'ब्याज भा मूलधन भुगतान लिखीं', 'ब्याज वा मूलधन भुगतान दर्ज करू', 'ब्याज वा साँवा भुक्तानी रेकर्ड गर्नुहोस्')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsByajPaymentModalOpen(false)}
                className="w-8 h-8 rounded-full border-2 border-white/80 hover:bg-white/10 active:scale-95 flex items-center justify-center text-white transition cursor-pointer"
                title={pick5('Close', 'बंद करें', 'बंद करीं', 'बन्द करू', 'बन्द गर्नुहोस्')}
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              {/* 2. Direction Toggle */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentDirection('received')}
                  className={`p-2.5 sm:p-3 rounded-2xl border-2 font-bold text-center transition flex flex-col items-center justify-center cursor-pointer ${
                    paymentDirection === 'received'
                      ? 'bg-[#EEF2FF] border-[#6366F1] text-[#312E81] shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black">
                    <span className="text-base">📥</span>
                    <span>{pick5('Received Payment', 'भुगतान प्राप्त हुआ', 'पैसा मिलल', 'भुगतान प्राप्त भेल', 'भुक्तानी पाउनु भयो')}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentDirection('made')}
                  className={`p-2.5 sm:p-3 rounded-2xl border-2 font-bold text-center transition flex flex-col items-center justify-center cursor-pointer ${
                    paymentDirection === 'made'
                      ? 'bg-gradient-to-r from-[#4A0E8F] to-[#6D28D9] border-[#4A0E8F] text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black">
                    <span className="text-base">📤</span>
                    <span>{pick5('Make Payment', 'भुगतान किया', 'पैसा देनी', 'भुगतान कएल', 'भुक्तानी गर्नु भयो')}</span>
                  </div>
                </button>
              </div>

              {/* 3. Row 1: Customer Name & Mobile No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>{pick5('Customer Name', 'ग्राहक का नाम', 'ग्राहक के नाम', 'ग्राहकक नाम', 'ग्राहकको नाम')} <span className="text-red-500">*</span></span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 text-blue-600 pointer-events-none">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={paymentCustomerName}
                      onChange={(e) => setPaymentCustomerName(e.target.value)}
                      placeholder={pick5('Customer Name', 'ग्राहक का नाम', 'ग्राहक के नाम', 'ग्राहकक नाम', 'राम बहादुर श्रेष्ठ')}
                      className="w-full bg-[#f8fafc] border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pl-9 pr-8 text-xs font-bold text-slate-900 outline-none transition"
                    />
                    <div className="absolute right-3 text-slate-400 pointer-events-none">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>{pick5('Mobile No.', 'मोबाइल नं.', 'मोबाइल नंबर', 'मोबाइल नं.', 'मोबाइल नं.')}</span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 text-blue-600 pointer-events-none">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={paymentCustomerPhone}
                      onChange={(e) => setPaymentCustomerPhone(e.target.value)}
                      placeholder="9841234567"
                      className="w-full bg-[#f8fafc] border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pl-9 pr-3 text-xs font-bold text-slate-900 outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Row 2: Payment Date & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>{pick5('Payment Date', 'भुक्तान तिथि', 'भुगतान के तारीख', 'भुगतान तिथि', 'भुक्तानी मिति')} <span className="text-red-500">*</span></span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div
                      onClick={() => setIsPaymentDatePickerOpen(true)}
                      className="flex-1 bg-[#f8fafc] border border-slate-200 rounded-xl py-2 px-3 text-xs font-extrabold text-slate-900 truncate cursor-pointer hover:bg-slate-100"
                      title={pick5('Click to open calendar', 'कैलेंडर खोलने के लिए क्लिक करें', 'कैलेंडर खोले खातिर दबाईं', 'कैलेन्डर खोलबाक लेल क्लिक करू', 'पात्रो खोल्न क्लिक गर्नुहोस्')}
                    >
                      {formatBSWithAD(paymentDateIso)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPaymentDatePickerOpen(true)}
                      className="w-9 h-9 rounded-xl bg-[#5B13B5] hover:bg-[#4A0E8F] text-white flex items-center justify-center shrink-0 active:scale-95 transition shadow-xs cursor-pointer"
                      title={pick5('Open Calendar', 'कैलेंडर खोलें', 'कैलेंडर खोलीं', 'कैलेन्डर खोलू', 'पात्रो खोल्नुहोस्')}
                    >
                      <Calendar className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{pick5('Amount', 'राशि', 'केतना रकम?', 'राशि', 'कति रकम ?')} <span className="text-red-500">*</span></span>
                  </label>
                  <div className="relative flex items-center bg-[#EBFBF3] border-2 border-[#A7F3D0] rounded-xl px-3 py-1.5">
                    <span className="text-base font-black text-emerald-700 mr-2">{currency === 'NPR' ? 'रु' : '₹'}</span>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="10000"
                      className="w-full bg-transparent font-black text-base text-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Row 3: Payment Method */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1.5">
                  <Receipt className="w-3.5 h-3.5 text-blue-600" />
                  <span>{pick5('Payment Method', 'भुगतान माध्यम', 'भुगतान के तरीका', 'भुगतान माध्यम', 'भुक्तानी विधि')}</span>
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {/* Cash */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`relative py-2 px-1 rounded-2xl border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                      paymentMethod === 'cash'
                        ? 'bg-[#5B13B5] text-white border-[#5B13B5] shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {paymentMethod === 'cash' && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-white text-[#5B13B5] flex items-center justify-center text-[10px] font-black">
                        ✓
                      </span>
                    )}
                    <span className="text-base mb-0.5">💵</span>
                    <span className="text-[11px] font-black leading-tight">
                      {pick5('Cash', 'नकद', 'नगद', 'नगद', 'नगद')}
                    </span>
                  </button>

                  {/* Bank */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank')}
                    className={`relative py-2 px-1 rounded-2xl border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                      paymentMethod === 'bank'
                        ? 'bg-[#5B13B5] text-white border-[#5B13B5] shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {paymentMethod === 'bank' && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-white text-[#5B13B5] flex items-center justify-center text-[10px] font-black">
                        ✓
                      </span>
                    )}
                    <Building2 className={`w-4 h-4 mb-0.5 ${paymentMethod === 'bank' ? 'text-white' : 'text-blue-600'}`} />
                    <span className="text-[11px] font-black leading-tight">
                      {pick5('Bank', 'बैंक', 'बैंक', 'बैंक', 'बैंक')}
                    </span>
                  </button>

                  {/* eSewa */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('esewa')}
                    className={`relative py-2 px-1 rounded-2xl border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                      paymentMethod === 'esewa'
                        ? 'bg-[#5B13B5] text-white border-[#5B13B5] shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {paymentMethod === 'esewa' && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-white text-[#5B13B5] flex items-center justify-center text-[10px] font-black">
                        ✓
                      </span>
                    )}
                    <div className="w-5 h-5 rounded-full bg-[#60BB46] text-white flex items-center justify-center text-[11px] font-black mb-0.5 shadow-xs">
                      e
                    </div>
                    <span className="text-[11px] font-black leading-tight">eSewa</span>
                  </button>

                  {/* Khalti */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('khalti')}
                    className={`relative py-2 px-1 rounded-2xl border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                      paymentMethod === 'khalti'
                        ? 'bg-[#5B13B5] text-white border-[#5B13B5] shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {paymentMethod === 'khalti' && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-white text-[#5B13B5] flex items-center justify-center text-[10px] font-black">
                        ✓
                      </span>
                    )}
                    <div className="w-5 h-5 rounded bg-[#5C2D91] text-white flex items-center justify-center text-[11px] font-black mb-0.5 shadow-xs">
                      K
                    </div>
                    <span className="text-[11px] font-black leading-tight">Khalti</span>
                  </button>

                  {/* QR */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qr')}
                    className={`relative py-2 px-1 rounded-2xl border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                      paymentMethod === 'qr'
                        ? 'bg-[#5B13B5] text-white border-[#5B13B5] shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {paymentMethod === 'qr' && (
                      <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-white text-[#5B13B5] flex items-center justify-center text-[10px] font-black">
                        ✓
                      </span>
                    )}
                    <QrCode className={`w-4 h-4 mb-0.5 ${paymentMethod === 'qr' ? 'text-white' : 'text-blue-600'}`} />
                    <span className="text-[11px] font-black leading-tight">QR</span>
                  </button>
                </div>
              </div>

              {/* 6. Row 4: Photo Upload & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    <span>{pick5('Upload Photo', 'फोटो अपलोड करें', 'फोटो अपलोड करीं', 'फोटो अपलोड करू', 'फोटो अपलोड गर्नुहोस्')}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 min-h-[80px] border-2 border-dashed border-[#818CF8] rounded-2xl bg-[#EEF2FF]/60 hover:bg-[#EEF2FF] flex flex-col items-center justify-center p-2 text-center cursor-pointer transition">
                      <Camera className="w-5 h-5 text-[#4F46E5] mb-1" />
                      <span className="text-[11px] font-black text-[#312E81] leading-tight">
                        {pick5('Tap here to select photo', 'फोटो चुनने के लिए क्लिक करें', 'फोटो चुने खातिर दबाईं', 'फोटो चुनबाक लेल क्लिक करू', 'यहाँ क्लिक गरेर फोटो छान्नुहोस्')}
                      </span>
                      <span className="text-[9px] font-bold text-slate-500">(JPG/PNG)</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>

                    {paymentBillPhoto && (
                      <div className="relative w-20 h-[80px] rounded-xl border-2 border-slate-200 overflow-hidden shrink-0 shadow-sm bg-slate-100">
                        <img src={paymentBillPhoto} alt="Bill Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPaymentBillPhoto('')}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 active:scale-95 shadow-md cursor-pointer"
                          title={pick5('Remove photo', 'फोटो हटाएं', 'फोटो हटाईं', 'फोटो हटाउ', 'फोटो हटाउनुहोस्')}
                        >
                          <X className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>{pick5('Remarks', 'टिप्पणी / विवरण', 'विवरण / नोट', 'टिप्पणी / विवरण', 'कैफियत')}</span>
                  </label>
                  <div className="h-[80px] flex items-center">
                    <input
                      type="text"
                      value={paymentNoteText}
                      onChange={(e) => setPaymentNoteText(e.target.value)}
                      placeholder={pick5('Loan installment payment', 'ऋण किस्त का भुगतान', 'कर्जा किस्त के भुगतान', 'ऋण किस्तक भुगतान', 'कर्जा किस्ताको भुक्तानी')}
                      className="w-full h-full bg-[#f8fafc] border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl p-3 text-xs font-bold text-slate-900 outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* 9. Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleResetPaymentForm}
                  className="py-3 px-4 bg-[#E2E8F0] hover:bg-[#CBD5E1] text-slate-800 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                  <span>{pick5('Reset', 'रीसेट करें', 'रीसेट करीं', 'रीसेट करू', 'रिसेट गर्नुहोस्')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSavePayment}
                  className="py-3 px-4 bg-[#10B981] hover:bg-[#059669] text-white rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>{pick5('Save Record', 'रिकॉर्ड सुरक्षित करें', 'रिकॉर्ड सेव करीं', 'रिकॉर्ड सुरक्षित करू', 'रेकर्ड सुरक्षित गर्नुहोस्')}</span>
                </button>
              </div>
            </div>

            {/* BS Date Picker Modal for Payment Date */}
            {isPaymentDatePickerOpen && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
                <div className="bg-white rounded-3xl p-4 shadow-2xl max-h-[95vh] overflow-y-auto w-full max-w-sm">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b">
                    <h4 className="font-black text-sm text-slate-800">
                      {pick5('Select Payment Date (BS)', 'भुगतान तिथि चुनें (वि.सं.)', 'भुगतान के तारीख चुनीं (वि.सं.)', 'भुगतान तिथि चुनू (वि.सं.)', 'भुक्तानी मिति छान्नुहोस् (वि.सं.)')}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsPaymentDatePickerOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <NepaliBSDatePicker
                    inline
                    language={language}
                    value={paymentDateIso}
                    onChange={(iso) => {
                      setPaymentDateIso(iso);
                      setIsPaymentDatePickerOpen(false);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3B: BYAJ PAYMENT HISTORY                            */}
      {/* ========================================================= */}
      {isByajHistoryModalOpen && (() => {
        const targetEntry = historyByajId ? byajEntries.find((e) => e.id === historyByajId) : null;

        let paymentList: { entry: ByajLedgerEntry; payment: ByajPayment }[] = [];
        if (targetEntry) {
          paymentList = (targetEntry.payments || []).map((p) => ({ entry: targetEntry, payment: p }));
        } else {
          byajEntries.forEach((entry) => {
            (entry.payments || []).forEach((p) => {
              paymentList.push({ entry, payment: p });
            });
          });
        }

        const filteredPayments = paymentList.filter(({ payment }) => {
          if (historyFilterType === 'interest') return payment.type === 'interest';
          if (historyFilterType === 'principal') return payment.type === 'principal';
          return true;
        });

        const totalInterestPaid = paymentList
          .filter(({ payment }) => payment.type === 'interest')
          .reduce((sum, { payment }) => sum + payment.amount, 0);

        const totalPrincipalPaid = paymentList
          .filter(({ payment }) => payment.type === 'principal')
          .reduce((sum, { payment }) => sum + payment.amount, 0);

        const totalPaidAll = totalInterestPaid + totalPrincipalPaid;
        const metrics = targetEntry ? calculateByajMetrics(targetEntry) : null;

        const methodLabel = (m?: string) => {
          switch ((m || 'cash').toLowerCase()) {
            case 'bank':
              return pick5('Bank', 'बैंक', 'बैंक', 'बैंक', 'बैंक');
            case 'esewa':
              return 'eSewa';
            case 'khalti':
              return 'Khalti';
            case 'qr':
              return 'QR';
            default:
              return pick5('Cash', 'नकद', 'नगद', 'नगद', 'नगद');
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in">
            <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[96vh] flex flex-col animate-in zoom-in-95">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#4C1D95] via-[#6D28D9] to-[#7C3AED] text-white px-5 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center shrink-0 text-xl shadow-xs">
                    📜
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-base sm:text-lg text-white leading-tight truncate">
                      {targetEntry
                        ? `${translateUserData(targetEntry.borrowerName, language)} - ${pick5('Payment History', 'भुगतान इतिहास', 'भुगतान इतिहास', 'भुगतान इतिहास', 'भुक्तानी इतिहास')}`
                        : pick5('All Payments & Collections History', 'सभी भुगतान व वसूली इतिहास', 'सब भुगतान आ वसूली इतिहास', 'सभ भुगतान आ असुली इतिहास', 'सबै भुक्तानी तथा असुली इतिहास')}
                    </h3>
                    <p className="font-bold text-xs text-[#FDE047] truncate">
                      {targetEntry
                        ? `📞 ${targetEntry.phone || pick5('No phone', 'नंबर नहीं', 'नंबर नइखे', 'नम्बर नहि', 'नम्बर नभएको')} • ${pick5('Loan Date:', 'ऋण तिथि:', 'कर्जा तारीख:', 'ऋण तिथि:', 'ऋण मिति:')} ${formatDateToBS(targetEntry.startDate, language)}`
                        : pick5(
                            `Payment details across ${fmtNum(byajEntries.length)} accounts`,
                            `कुल ${fmtNum(byajEntries.length)} खातों का भुगतान विवरण`,
                            `कुल ${fmtNum(byajEntries.length)} खाता के भुगतान विवरण`,
                            `कुल ${fmtNum(byajEntries.length)} खाताक भुगतान विवरण`,
                            `कुल ${fmtNum(byajEntries.length)} खाताहरूका भुक्तानी विवरण`
                          )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsByajHistoryModalOpen(false)}
                  className="w-8 h-8 rounded-full border-2 border-white/80 hover:bg-white/10 active:scale-95 flex items-center justify-center text-white transition cursor-pointer shrink-0 ml-2"
                  title={pick5('Close', 'बंद करें', 'बंद करीं', 'बन्द करू', 'बन्द गर्नुहोस्')}
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
                {/* Borrower Selector */}
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-700 whitespace-nowrap pl-1">
                    {pick5('Select Borrower:', 'ऋणी चुनें:', 'ऋणी चुनीं:', 'ऋणी चुनू:', 'ऋणी छान्नुहोस्:')}
                  </span>
                  <select
                    value={historyByajId || 'all'}
                    onChange={(e) => {
                      playTapSound();
                      setHistoryByajId(e.target.value === 'all' ? null : e.target.value);
                    }}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="all">
                      🌐 {pick5('All Borrowers', 'सभी ऋणी', 'सब ऋणी', 'सभ ऋणी', 'सबै ऋणीहरू')} ({fmtNum(byajEntries.length)})
                    </option>
                    {byajEntries.map((e) => (
                      <option key={e.id} value={e.id}>
                        👤 {translateUserData(e.borrowerName, language)} ({fmtNum(e.payments?.length || 0)}{' '}
                        {pick5('payments', 'भुगतान', 'भुगतान', 'भुगतान', 'भुक्तानी')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Summary Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-2.5">
                    <span className="text-[10px] font-bold text-amber-800 block">
                      {pick5('Interest Collected', 'कुल वसूल ब्याज', 'कुल मिलल ब्याज', 'कुल असुल ब्याज', 'जम्मा असुल ब्याज')}
                    </span>
                    <span className="text-sm font-black text-amber-900 block mt-0.5">
                      {fmtCur(totalInterestPaid)}
                    </span>
                  </div>

                  <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-2.5">
                    <span className="text-[10px] font-bold text-blue-800 block">
                      {pick5('Principal Returned', 'कुल वापस मूलधन', 'कुल वापस मूलधन', 'कुल वापस मूलधन', 'जम्मा फिर्ता साँवा')}
                    </span>
                    <span className="text-sm font-black text-blue-900 block mt-0.5">
                      {fmtCur(totalPrincipalPaid)}
                    </span>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-2.5">
                    <span className="text-[10px] font-bold text-emerald-800 block">
                      {pick5('Total Received', 'कुल प्राप्त राशि', 'कुल मिलल रकम', 'कुल प्राप्त राशि', 'कुल प्राप्त रकम')}
                    </span>
                    <span className="text-sm font-black text-emerald-700 block mt-0.5">
                      {fmtCur(totalPaidAll)}
                    </span>
                  </div>

                  <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-2.5">
                    <span className="text-[10px] font-bold text-rose-800 block">
                      {targetEntry
                        ? pick5('Remaining Payable', 'शेष चुकता राशि', 'बाकी चुकता रकम', 'बाकी चुकता राशि', 'बाँकी चुक्ता गर्नुपर्ने')
                        : pick5('Total Payments', 'कुल भुगतान संख्या', 'कुल भुगतान संख्या', 'कुल भुगतान संख्या', 'जम्मा भुक्तानी संख्या')}
                    </span>
                    <span className="text-sm font-black text-rose-900 block mt-0.5">
                      {targetEntry && metrics
                        ? fmtCur(metrics.totalPayable)
                        : `${fmtNum(paymentList.length)} ${pick5('times', 'बार', 'बेरी', 'बेर', 'पटक')}`}
                    </span>
                  </div>
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setHistoryFilterType('all');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      historyFilterType === 'all'
                        ? 'bg-[#4C1D95] text-white shadow-xs font-black'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {pick5('All', 'सभी', 'सब', 'सभ', 'सबै')} ({fmtNum(paymentList.length)})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setHistoryFilterType('interest');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      historyFilterType === 'interest'
                        ? 'bg-amber-600 text-white shadow-xs font-black'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                    }`}
                  >
                    {pick5('Interest Paid', 'ब्याज भुगतान', 'ब्याज भुगतान', 'ब्याज भुगतान', 'ब्याज भुक्तानी')} (
                    {fmtNum(paymentList.filter(({ payment }) => payment.type === 'interest').length)})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setHistoryFilterType('principal');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      historyFilterType === 'principal'
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-800'
                    }`}
                  >
                    {pick5('Principal Returned', 'मूलधन वापसी', 'मूलधन वापसी', 'मूलधन वापसी', 'साँवा फिर्ता')} (
                    {fmtNum(paymentList.filter(({ payment }) => payment.type === 'principal').length)})
                  </button>
                </div>

                {/* Payments List */}
                {filteredPayments.length === 0 ? (
                  <div className="py-10 text-center space-y-3 bg-slate-50/70 rounded-3xl border border-dashed border-slate-200">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
                      📭
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-700">
                        {pick5('No Payment Records', 'कोई भुगतान रिकॉर्ड नहीं', 'कवनो भुगतान रिकॉर्ड नइखे', 'कोनो भुगतान रिकॉर्ड नहि अछि', 'कुनै भुक्तानी रेकर्ड छैन')}
                      </h5>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {targetEntry
                          ? pick5(
                              `${translateUserData(targetEntry.borrowerName, language)} has not made any payments yet.`,
                              `${translateUserData(targetEntry.borrowerName, language)} ने अभी तक कोई भुगतान नहीं किया है।`,
                              `${translateUserData(targetEntry.borrowerName, language)} अभी तक कवनो भुगतान नइखन कइले।`,
                              `${translateUserData(targetEntry.borrowerName, language)} अखन धरि कोनो भुगतान नहि कएलनि।`,
                              `${translateUserData(targetEntry.borrowerName, language)} ले अहिलेसम्म कुनै भुक्तानी गरेको छैन।`
                            )
                          : pick5(
                              'No payments found in the selected filter.',
                              'चुनी गई श्रेणी में कोई भुगतान नहीं मिला।',
                              'चुनल तरीका में कवनो भुगतान ना मिलल।',
                              'चुनल प्रकार मे कोनो भुगतान नहि भेटल।',
                              'छानिएको प्रकारमा कुनै भुक्तानी फेला परेन।'
                            )}
                      </p>
                    </div>
                    {targetEntry && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsByajHistoryModalOpen(false);
                          handleOpenPayment(targetEntry.id);
                        }}
                        className="inline-flex items-center gap-1.5 bg-[#00A854] hover:bg-[#00944A] text-white px-4 py-2 rounded-2xl text-xs font-black shadow-xs active:scale-95 transition cursor-pointer"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>
                          {pick5('+ Collect Payment Here', '+ इस खाते में भुगतान जोड़ें', '+ एह खाता में वसूली जोड़ीं', '+ एहि खाता मे असुली जोड़ू', '+ यस खातामा भुक्तानी असुल गर्नुहोस्')}
                        </span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredPayments.map(({ entry, payment }) => (
                      <div
                        key={payment.id}
                        className="bg-white border border-slate-200/90 hover:border-purple-300 rounded-2xl p-3 sm:p-3.5 shadow-2xs space-y-2 transition"
                      >
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            {!targetEntry && (
                              <span className="text-xs font-black text-purple-900 block mb-0.5">
                                👤 {translateUserData(entry.borrowerName, language)}
                              </span>
                            )}
                            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
                              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{formatDateToBS(payment.date, language)}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-base sm:text-lg font-black text-emerald-700 block leading-tight">
                              + {fmtCur(payment.amount)}
                            </span>
                          </div>
                        </div>

                        {/* Badges row */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                              payment.type === 'interest'
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : 'bg-blue-50 text-blue-900 border-blue-200'
                            }`}
                          >
                            {payment.type === 'interest'
                              ? `🪙 ${pick5('Interest Payment', 'ब्याज भुगतान', 'ब्याज भुगतान', 'ब्याज भुगतान', 'ब्याज भुक्तानी')}`
                              : `💰 ${pick5('Principal Returned', 'मूलधन वापसी', 'मूलधन वापसी', 'मूलधन वापसी', 'साँवा फिर्ता')}`}
                          </span>

                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            💳 {methodLabel(payment.method)}
                          </span>

                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                            {payment.direction === 'made'
                              ? `📤 ${pick5('Paid Out', 'भुगतान किया', 'देवल गइल', 'भुगतान कएल', 'भुक्तानी गर्नुभयो')}`
                              : `📥 ${pick5('Received', 'प्राप्त हुआ', 'मिलल', 'प्राप्त भेल', 'प्राप्त भयो')}`}
                          </span>
                        </div>

                        {/* Note & Thumbnail */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            {payment.billPhoto && (
                              <button
                                type="button"
                                onClick={() => setPreviewBillPhoto(payment.billPhoto || null)}
                                className="w-10 h-10 rounded-lg border border-purple-300 overflow-hidden shrink-0 shadow-2xs hover:opacity-80 active:scale-95 transition cursor-pointer"
                                title={pick5('View voucher photo', 'बिल / वाउचर फोटो देखें', 'बिल फोटो देखीं', 'बिल फोटो देखू', 'बिल / भौचर फोटो हेर्नुहोस्')}
                              >
                                <img src={payment.billPhoto} alt="Bill" className="w-full h-full object-cover" />
                              </button>
                            )}
                            <p className="text-slate-600 font-medium text-[11px] truncate">
                              {payment.note
                                ? translateUserData(payment.note, language)
                                : pick5('Loan installment payment', 'ऋण किस्त का भुगतान', 'कर्जा किस्त के भुगतान', 'ऋण किस्तक भुगतान', 'कर्जा किस्ताको भुक्तानी')}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSharePaymentReceipt(entry, payment)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition active:scale-90 cursor-pointer"
                              title={pick5('Share receipt on WhatsApp', 'WhatsApp पर रसीद साझा करें', 'WhatsApp पर रसीद भेजीं', 'WhatsApp पर रसीद साझा करू', 'WhatsApp मा रसिद साझा गर्नुहोस्')}
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletePaymentConfirm({ entryId: entry.id, paymentId: payment.id })}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition active:scale-90 cursor-pointer"
                              title={pick5('Delete this payment', 'यह भुगतान हटाएं', 'ई भुगतान हटाईं', 'ई भुगतान हटाउ', 'यो भुक्तानी मेटाउनुहोस्')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsByajHistoryModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold active:scale-95 transition cursor-pointer"
                >
                  {pick5('Close', 'बंद करें', 'बंद करीं', 'बन्द करू', 'बन्द गर्नुहोस्')}
                </button>

                {targetEntry && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsByajHistoryModalOpen(false);
                      handleOpenPayment(targetEntry.id);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-[#00A854] hover:bg-[#00944A] text-white text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>
                      {pick5('+ Add New Payment', '+ नया भुगतान जोड़ें', '+ नया वसूली जोड़ीं', '+ नव असुली जोड़ू', '+ नयाँ रकम असुली थप्नुहोस्')}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* In-App Confirm Delete Single Byaj Payment Modal */}
      {deletePaymentConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <h4 className="font-black text-sm text-slate-900">
              {pick5('Delete Payment?', 'भुगतान हटाएं?', 'भुगतान हटाईं?', 'भुगतान हटाउ?', 'भुक्तानी मेटाउने?')}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {pick5(
                'Are you sure you want to delete this payment record?',
                'क्या आप वाकई इस भुगतान रिकॉर्ड को हटाना चाहते हैं?',
                'का रउआ ई भुगतान रिकॉर्ड हटावल चाहत बानी?',
                'की अहाँ ई भुगतान रिकॉर्ड हटाबय चाहैत छी?',
                'के तपाईं यो भुक्तानी रेकर्ड मेटाउन निश्चित हुनुहुन्छ?'
              )}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletePaymentConfirm(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                {pick5('Cancel', 'रद्द करें', 'रद्द करीं', 'रद्द करू', 'रद्द गर्नुहोस्')}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteSinglePayment(deletePaymentConfirm.entryId, deletePaymentConfirm.paymentId);
                  setDeletePaymentConfirm(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black cursor-pointer"
              >
                {pick5('Delete', 'हटाएं', 'हटाईं', 'हटाउ', 'मेटाउनुहोस्')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Photo Enlarged Preview Modal */}
      {previewBillPhoto && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-3 space-y-2">
            <div className="flex items-center justify-between pb-1 border-b">
              <span className="text-xs font-black text-slate-800">
                {pick5('Voucher / Bill Photo Preview', 'वाउचर / बिल फोटो पूर्वावलोकन', 'वाउचर / बिल फोटो', 'वाउचर / बिल फोटो पूर्वावलोकन', 'भौचर / बिल फोटो पूर्वावलोकन')}
              </span>
              <button
                type="button"
                onClick={() => setPreviewBillPhoto(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center rounded-xl bg-slate-100 p-2">
              <img src={previewBillPhoto} alt="Voucher" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: NOTE CREATE/EDIT MODAL                           */}
      {/* ========================================================= */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-3 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-bold text-sm text-slate-900">
                {editingNoteId
                  ? pick5('Edit Note', 'नोट संपादित करें', 'नोट बदलीं', 'नोट सम्पादन करू', 'नोट सम्पादन गर्नुहोस्')
                  : pick5('Write New Note', 'नया नोट लिखें', 'नया नोट लिखीं', 'नव नोट लिखू', 'नयाँ नोट लेख्नुहोस्')}
              </h4>
              <button
                onClick={() => setIsNoteModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder={pick5('Title...', 'शीर्षक...', 'शीर्षक...', 'शीर्षक...', 'शीर्षक...')}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold outline-none"
            />

            <textarea
              rows={5}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder={pick5('Write your note or details here...', 'यहाँ अपना नोट या विवरण लिखें...', 'इहाँ आपन नोट भा बात लिखीं...', 'एतय अपन नोट वा विवरण लिखू...', 'यहाँ आफ्नो नोट वा विवरण लेख्नुहोस्...')}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-normal outline-none resize-none"
            />

            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">
                {pick5('Category:', 'श्रेणी:', 'वर्ग:', 'वर्ग:', 'वर्ग:')}
              </span>
              <select
                value={noteCategory}
                onChange={(e) => setNoteCategory(e.target.value as NoteItem['category'])}
                className="bg-slate-100 border border-slate-300 rounded-lg p-1 font-bold text-slate-800"
              >
                <option value="Personal">{pick5('Personal', 'व्यक्तिगत', 'निजी', 'व्यक्तिगत', 'व्यक्तिगत')}</option>
                <option value="Daily Tasks">{pick5('Daily Tasks', 'दैनिक कार्य', 'रोज के काम', 'दैनिक काज', 'दैनिक कार्य')}</option>
                <option value="Milk Ledger">{pick5('Milk Ledger', 'दूध खाता', 'दूध खाता', 'दूध खाता', 'दुध खाता')}</option>
                <option value="Shop">{pick5('Shop', 'दुकान', 'दोकान', 'दोकान', 'पसल')}</option>
                <option value="Uncategorized">{pick5('Uncategorized', 'अन्य', 'अन्य', 'अन्य', 'अन्य')}</option>
              </select>
            </div>

            <button
              onClick={handleSaveNote}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Save className="w-4 h-4" />
              <span>{pick5('Save Note', 'सुरक्षित करें', 'सेव करीं', 'सुरक्षित करू', 'सुरक्षित गर्नुहोस्')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Universal Payment Receipt Modal */}
      {selectedPaymentReceipt && (
        <ReceiptModal
          isOpen={!!selectedPaymentReceipt}
          onClose={() => setSelectedPaymentReceipt(null)}
          moduleType="advance_payment"
          title={`${pick5('Loan Payment & Collection Receipt', 'ऋण भुगतान व वसूली रसीद', 'कर्जा भुगतान आ वसूली रसीद', 'ऋण भुगतान आ असुली रसीद', 'ऋण भुक्तानी तथा असुली रसिद')} (${
            selectedPaymentReceipt.payment.type === 'interest'
              ? pick5('Interest', 'ब्याज', 'ब्याज', 'ब्याज', 'ब्याज')
              : pick5('Principal', 'मूलधन', 'मूलधन', 'मूलधन', 'साँवा')
          })`}
          initialCustomerName={selectedPaymentReceipt.entry.borrowerName}
          initialCustomerMobile={selectedPaymentReceipt.entry.phone}
          initialPaidAmount={selectedPaymentReceipt.payment.amount}
          totalAmountText={formatCurrency(selectedPaymentReceipt.payment.amount, currency, language)}
          items={[
            {
              label:
                selectedPaymentReceipt.payment.type === 'interest'
                  ? pick5('Interest Paid', 'ब्याज भुगतान', 'ब्याज भुगतान', 'ब्याज भुगतान', 'ब्याज भुक्तानी')
                  : pick5('Principal Returned', 'मूलधन वापसी', 'मूलधन वापसी', 'मूलधन वापसी', 'साँवा फिर्ता'),
              value: formatCurrency(selectedPaymentReceipt.payment.amount, currency, language),
              quantity: 1,
              unit: pick5('Installment', 'किस्त', 'किस्त', 'किस्त', 'किस्ता'),
              rate: selectedPaymentReceipt.payment.amount,
              subtotal: selectedPaymentReceipt.payment.amount,
              details: `${pick5('Borrower:', 'ऋणी:', 'ऋणी:', 'ऋणी:', 'ऋणी:')} ${translateUserData(selectedPaymentReceipt.entry.borrowerName, language)} | ${pick5('Date:', 'दिनांक:', 'तारीख:', 'तिथि:', 'मिति:')} ${formatDateToBS(selectedPaymentReceipt.payment.date, language)} | ${pick5('Method:', 'माध्यम:', 'तरीका:', 'माध्यम:', 'विधि:')} ${
                selectedPaymentReceipt.payment.method === 'bank'
                  ? pick5('Bank', 'बैंक', 'बैंक', 'बैंक', 'बैंक')
                  : selectedPaymentReceipt.payment.method === 'esewa'
                  ? 'eSewa'
                  : selectedPaymentReceipt.payment.method === 'khalti'
                  ? 'Khalti'
                  : selectedPaymentReceipt.payment.method === 'qr'
                  ? 'QR'
                  : pick5('Cash', 'नकद', 'नगद', 'नगद', 'नगद')
              }`,
            },
          ]}
          note={
            selectedPaymentReceipt.payment.note ||
            pick5('Loan installment payment receipt', 'ऋण किस्त भुगतान रसीद', 'कर्जा किस्त भुगतान रसीद', 'ऋण किस्त भुगतान रसीद', 'कर्जा किस्ता भुक्तानी भरपाई')
          }
          language={language}
        />
      )}
    </div>
  );
};
