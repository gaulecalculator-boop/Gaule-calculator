/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * UNIVERSAL ADVANCED RECEIPT & BILL MANAGEMENT MODAL
 * Gaule Calculator - Offline Smart Billing, Thermal & PDF Slip Hub
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Share2,
  Copy,
  Check,
  Download,
  Save,
  Search,
  User,
  Phone,
  MapPin,
  Calendar,
  FileText,
  BadgePercent,
  History,
  Store,
  ChevronDown,
  Clock,
  Sparkles,
} from 'lucide-react';
import { playTapSound, playSuccessSound } from '../utils/audio';
import { Language } from '../types';
import {
  translateUserData,
  localizeNumberString,
} from '../utils/universalTranslator';
import { pick5 } from '../utils/i18nHelper';
import { dairyBranding, DairyBrandingProfile, DEFAULT_DAIRY_PROFILE } from '../utils/dairyBranding';
import {
  UniversalBill,
  BillModuleType,
  BillLineItem,
  PaymentStatusType,
  generateNextBillNumber,
  getFormattedCurrentBSDate,
  saveUniversalBill,
  getAllRegisteredCustomers,
  getCustomerBillsAndHistory,
  formatWhatsAppBillText,
  generateUniversalBillPDF,
} from '../utils/universalReceiptEngine';
import {
  openExternalUrl,
  printCurrentView,
  isBluetoothEscPosAvailable,
  getPairedBluetoothPrinters,
  sendEscPosToBluetoothPrinter,
  PairedBluetoothPrinter,
} from '../utils/androidBridge';
import { buildUniversalReceiptEscPos } from '../utils/thermalEscPosBuilder';

export interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  
  // Standard simple props (backwards-compatible)
  title?: string;
  totalAmountText?: string;
  items?: Array<{
    label: string;
    value: string | number;
    quantity?: number | string;
    unit?: string;
    rate?: number;
    subtotal?: number;
    details?: string;
  }>;
  note?: string;

  // Advanced Universal Bill Props
  moduleType?: BillModuleType;
  initialCustomerName?: string;
  initialCustomerMobile?: string;
  initialCustomerAddress?: string;
  initialDiscount?: number;
  initialPaidAmount?: number;
  initialPaymentMethod?: 'cash' | 'esewa' | 'khalti' | 'bank' | 'udhar';
  initialBillData?: Partial<UniversalBill>;
  onBillSaved?: (bill: UniversalBill) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  language,
  title,
  totalAmountText,
  items = [],
  note = '',
  moduleType = 'shop',
  initialCustomerName = '',
  initialCustomerMobile = '',
  initialCustomerAddress = '',
  initialDiscount = 0,
  initialPaidAmount,
  initialPaymentMethod = 'cash',
  initialBillData,
  onBillSaved,
}) => {
  const p = (en: string, hi: string, bho: string, mai: string, ne: string) =>
    pick5(language, { en, hi, bho, mai, ne }, 'ReceiptModal');
  const effectiveTitle = title || p('Bill & Receipt', 'हिसाब बिल एवं रसीद', 'हिसाब बिल आ रसीद', 'हिसाब बिल आ रसीद', 'हिसाब बिल तथा रसिद');

  // Active Tab: 'standard' (A4/Invoice) | 'thermal' (58/80mm POS) | 'history' (Customer Ledger)
  const [activeTab, setActiveTab] = useState<'standard' | 'thermal' | 'history'>('standard');
  const [thermalWidth, setThermalWidth] = useState<'58mm' | '80mm'>('58mm');

  // Single Source Branding
  const [branding, setBranding] = useState<DairyBrandingProfile>(() => dairyBranding.getProfile());

  // Customer selection & suggestions
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerMobile, setCustomerMobile] = useState(initialCustomerMobile);
  const [customerAddress, setCustomerAddress] = useState(initialCustomerAddress);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [allCustomers, setAllCustomers] = useState<Array<{ name: string; mobile: string; address: string; source: string }>>([]);

  // Bill Financial States
  const [billNumber, setBillNumber] = useState('');
  const [dateBS, setDateBS] = useState('');
  const [dateAD, setDateAD] = useState('');
  const [discount, setDiscount] = useState<number>(initialDiscount);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'esewa' | 'khalti' | 'bank' | 'udhar'>(initialPaymentMethod);
  const [billNotes, setBillNotes] = useState(note);
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pairedPrinters, setPairedPrinters] = useState<PairedBluetoothPrinter[]>([]);
  const [selectedPrinterAddr, setSelectedPrinterAddr] = useState<string>('');
  const [btStatusMsg, setBtStatusMsg] = useState<string | null>(null);

  const thermalPrintRef = useRef<HTMLDivElement>(null);

  const trData = (s?: string) => translateUserData(s || '', language);
  const trNum = (v: string | number) => localizeNumberString(v, language);
  const rsPrefix = language === 'en' ? 'Rs.' : 'रु';
  const fmtCur = (n: number) => `${rsPrefix} ${trNum((n || 0).toLocaleString())}`;

  // Sync latest branding & customers when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Load fresh single source branding
    setBranding(dairyBranding.getProfile());
    const unsubBrand = dairyBranding.subscribe((newBrand) => {
      setBranding(newBrand);
    });

    // Populate registered customers from milk, udhar, byaj, bills
    const custs = getAllRegisteredCustomers(language);
    setAllCustomers(custs);

    // If initialBillData provided (reopening old bill)
    if (initialBillData && initialBillData.id) {
      setBillNumber(initialBillData.billNumber || generateNextBillNumber(moduleType));
      setDateBS(initialBillData.dateBS || getFormattedCurrentBSDate());
      setDateAD(initialBillData.dateAD || new Date().toISOString().split('T')[0]);
      setCustomerName(initialBillData.customerName || '');
      setCustomerMobile(initialBillData.customerMobile || '');
      setCustomerAddress(initialBillData.customerAddress || '');
      setDiscount(initialBillData.discount || 0);
      setPaidAmount(initialBillData.paidAmount || 0);
      setPaymentMethod(initialBillData.paymentMethod || 'cash');
      setBillNotes(initialBillData.notes || '');
      setIsSaved(true);
    } else {
      // New Bill
      setBillNumber(generateNextBillNumber(moduleType));
      setDateBS(getFormattedCurrentBSDate());
      setDateAD(new Date().toISOString().split('T')[0]);
      setCustomerName(initialCustomerName || '');
      setCustomerMobile(initialCustomerMobile || '');
      setCustomerAddress(initialCustomerAddress || '');
      setDiscount(initialDiscount || 0);
      setBillNotes(note || '');
      setIsSaved(false);
    }

    if (isBluetoothEscPosAvailable()) {
      const printers = getPairedBluetoothPrinters();
      setPairedPrinters(printers);
      if (printers.length > 0 && !selectedPrinterAddr) {
        setSelectedPrinterAddr(printers[0].address);
      }
    }

    const onHardwareBack = (ev: Event) => {
      ev.preventDefault();
      onClose();
    };
    window.addEventListener('ghaule-hardware-back', onHardwareBack);

    return () => {
      unsubBrand();
      window.removeEventListener('ghaule-hardware-back', onHardwareBack);
    };
  }, [isOpen, moduleType, initialCustomerName, initialCustomerMobile, initialCustomerAddress, initialDiscount, note, initialBillData, language, onClose, selectedPrinterAddr]);

  // Construct Line Items
  const lineItems: BillLineItem[] = React.useMemo(() => {
    if (initialBillData?.items && initialBillData.items.length > 0) {
      return initialBillData.items;
    }
    if (items.length > 0) {
      return items.map((it, idx) => {
        let sub = it.subtotal !== undefined ? it.subtotal : 0;
        if (sub === 0 && typeof it.value === 'number') {
          sub = it.value;
        } else if (sub === 0 && it.value !== undefined) {
          const num = parseFloat(String(it.value).replace(/[^0-9.-]+/g, ''));
          sub = isNaN(num) ? 0 : num;
        }
        return {
          id: `item-${idx}`,
          description: it.label,
          quantity: it.quantity,
          unit: it.unit,
          rate: it.rate,
          subtotal: sub,
          details: it.details,
        };
      });
    }
    // Fallback if totalAmountText was given
    const fallbackNum = totalAmountText ? parseFloat(totalAmountText.replace(/[^0-9.-]+/g, '')) || 0 : 0;
    return [
      {
        id: 'item-0',
        description: effectiveTitle,
        subtotal: fallbackNum,
      },
    ];
  }, [items, initialBillData, effectiveTitle, totalAmountText]);

  // Compute Subtotal and Grand Total
  const subtotal = React.useMemo(() => {
    if (initialBillData?.subtotal !== undefined) return initialBillData.subtotal;
    return lineItems.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
  }, [lineItems, initialBillData]);

  const totalAmount = Math.max(0, subtotal - (discount || 0));

  // Initialize paid amount if not set
  useEffect(() => {
    if (initialPaidAmount !== undefined) {
      setPaidAmount(initialPaidAmount);
    } else if (initialBillData?.paidAmount !== undefined) {
      setPaidAmount(initialBillData.paidAmount);
    } else {
      setPaidAmount(totalAmount);
    }
  }, [totalAmount, initialPaidAmount, initialBillData]);

  const remainingDue = Math.max(0, totalAmount - (paidAmount || 0));

  const paymentStatus: PaymentStatusType = React.useMemo(() => {
    if (totalAmount <= 0) return 'PAID';
    if (paidAmount >= totalAmount) return 'PAID';
    if (paidAmount > 0 && paidAmount < totalAmount) return 'PARTIAL';
    return 'DUE';
  }, [totalAmount, paidAmount]);

  // Build the live UniversalBill Object
  const currentBill: UniversalBill = React.useMemo(() => {
    const defaultCustomer = p('General Customer', 'सामान्य ग्राहक', 'साधारण ग्राहक', 'सामान्य ग्राहक', 'साधारण ग्राहक');
    return {
      id: initialBillData?.id || `BILL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      billNumber: billNumber || `GH-83-1001`,
      moduleType,
      moduleTitle: effectiveTitle,
      customerName: customerName.trim() || defaultCustomer,
      customerMobile: customerMobile.trim(),
      customerAddress: customerAddress.trim(),
      dateAD: dateAD || new Date().toISOString().split('T')[0],
      dateBS: dateBS || getFormattedCurrentBSDate(),
      createdAt: initialBillData?.createdAt || Date.now(),
      items: lineItems,
      subtotal,
      discount,
      totalAmount,
      paidAmount,
      remainingDue,
      paymentStatus,
      paymentMethod,
      branding,
      notes: billNotes,
    };
  }, [
    initialBillData,
    billNumber,
    moduleType,
    effectiveTitle,
    customerName,
    customerMobile,
    customerAddress,
    dateAD,
    dateBS,
    lineItems,
    subtotal,
    discount,
    totalAmount,
    paidAmount,
    remainingDue,
    paymentStatus,
    paymentMethod,
    branding,
    billNotes,
  ]);

  // Customer previous history ledger summary
  const customerHistory = React.useMemo(() => {
    if (!customerName.trim()) return null;
    return getCustomerBillsAndHistory(customerName.trim());
  }, [customerName, isSaved]);

  if (!isOpen) return null;

  // Filtered customer suggestions
  const filteredCustomers = allCustomers.filter((c) => {
    if (!customerSearchTerm.trim()) return true;
    const term = customerSearchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || c.mobile.includes(term) || c.address.toLowerCase().includes(term);
  });

  // Action Handlers
  const handleSaveBill = () => {
    playSuccessSound();
    saveUniversalBill(currentBill);
    setIsSaved(true);
    if (onBillSaved) onBillSaved(currentBill);
  };

  const getLocalizedShareText = () => {
    return formatWhatsAppBillText(currentBill, language);
  };

  const handleCopySlip = () => {
    playTapSound();
    const text = getLocalizedShareText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    playTapSound();
    // Auto-save raw bill on share
    saveUniversalBill(currentBill);
    setIsSaved(true);

    const shareText = getLocalizedShareText();
    const cleanPhone = customerMobile.replace(/\D/g, '');
    let url = '';
    if (cleanPhone.length >= 10) {
      const fullNum = cleanPhone.startsWith('977') ? cleanPhone : `977${cleanPhone}`;
      url = `https://wa.me/${fullNum}?text=${encodeURIComponent(shareText)}`;
    } else {
      url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    }
    openExternalUrl(url);
  };

  const handleDownloadPDF = () => {
    playTapSound();
    saveUniversalBill(currentBill);
    setIsSaved(true);
    generateUniversalBillPDF(currentBill);
  };

  const handlePrint = () => {
    playTapSound();
    saveUniversalBill(currentBill);
    setIsSaved(true);
    printCurrentView(`Gaule Receipt #${currentBill.billNumber}`);
  };

  const handleBluetoothEscPosPrint = () => {
    playTapSound();
    saveUniversalBill(currentBill);
    setIsSaved(true);
    if (!isBluetoothEscPosAvailable()) {
      setBtStatusMsg(
        p(
          'Bluetooth ESC/POS printing works inside the Android APK. Using system print fallback.',
          'ब्लूटूथ ESC/POS प्रिंटिंग Android APK में काम करती है। सिस्टम प्रिंट उपयोग हो रहा है।',
          'ब्लूटूथ ESC/POS प्रिंटिंग Android APK में काम करेला। सिस्टम प्रिंट खुल रहल बा।',
          'ब्लूटूथ ESC/POS प्रिंटिंग Android APK मे काज करैत अछि। सिस्टम प्रिंट उपयोग हो रहल अछि।',
          'ब्लुटुथ ESC/POS प्रिन्ट Android APK मा चल्छ। सिस्टम प्रिन्ट खुल्दैछ।'
        )
      );
      printCurrentView(`Gaule Thermal #${currentBill.billNumber}`);
      return;
    }
    const bytes = buildUniversalReceiptEscPos(currentBill, branding, thermalWidth);
    const res = sendEscPosToBluetoothPrinter(bytes, selectedPrinterAddr || undefined);
    setBtStatusMsg(res.message);
  };

  const handleSelectCustomer = (c: { name: string; mobile: string; address: string }) => {
    playTapSound();
    setCustomerName(c.name);
    if (c.mobile) setCustomerMobile(c.mobile);
    if (c.address) setCustomerAddress(c.address);
    setShowCustomerDropdown(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[95vh] my-auto">
        
        {/* Top Header Bar */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between select-none border-b border-blue-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-base">
              🧾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white tracking-wide">
                  {language === 'en'
                    ? 'Universal Receipt & Bill Hub'
                    : language === 'hi'
                    ? 'यूनिवर्सल बिल एवं रसीद प्रणाली'
                    : language === 'bho'
                    ? 'यूनिवर्सल बिल आ रसीद सिस्टम'
                    : language === 'mai'
                    ? 'यूनिवर्सल बिल आ रसीद प्रणाली'
                    : 'युनिभर्सल बिल तथा रसिद प्रणाली'}
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  #{trNum(currentBill.billNumber)}
                </span>
              </div>
              <p className="text-[11px] text-blue-200/70 truncate max-w-[260px] sm:max-w-md">
                {trData(branding.dairyName)} • {trData(effectiveTitle)}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white transition cursor-pointer"
            title={p('Close', 'बंद करें', 'बंद करीं', 'बन्द करू', 'बन्द गर्नुहोस्')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                playTapSound();
                setActiveTab('standard');
              }}
              className={`py-1 px-3 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'standard'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>
                {language === 'en'
                  ? 'Standard Invoice'
                  : language === 'hi'
                  ? '📋 स्टैंडर्ड बिल (A4/Invoice)'
                  : language === 'bho'
                  ? '📋 स्टैंडर्ड बिल (A4/Invoice)'
                  : language === 'mai'
                  ? '📋 स्टैंडर्ड बिल (A4/Invoice)'
                  : '📋 स्ट्यान्डर्ड बिल (A4/Invoice)'}
              </span>
            </button>

            <button
              onClick={() => {
                playTapSound();
                setActiveTab('thermal');
              }}
              className={`py-1 px-3 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'thermal'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>
                {language === 'en'
                  ? 'Thermal Slip'
                  : language === 'hi'
                  ? '🖨️ थर्मल रसीद (58/80mm)'
                  : language === 'bho'
                  ? '🖨️ थर्मल रसीद (58/80mm)'
                  : language === 'mai'
                  ? '🖨️ थर्मल रसीद (58/80mm)'
                  : '🖨️ थर्मल रसिद (58/80mm)'}
              </span>
            </button>

          </div>

          {activeTab === 'thermal' && (
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
              <button
                onClick={() => setThermalWidth('58mm')}
                className={`px-2 py-0.5 rounded ${thermalWidth === '58mm' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
              >
                58mm
              </button>
              <button
                onClick={() => setThermalWidth('80mm')}
                className={`px-2 py-0.5 rounded ${thermalWidth === '80mm' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
              >
                80mm
              </button>
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-50 space-y-3.5">

          {/* TAB 1: STANDARD A4/INVOICE VIEW */}
          {activeTab === 'standard' && (
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4 font-sans text-slate-800">
              
              {/* Official Branding Header */}
              {(() => {
                const hasCustomName =
                  Boolean(branding.dairyName?.trim()) &&
                  branding.dairyName !== DEFAULT_DAIRY_PROFILE.dairyName;
                const hasCustomSlogan =
                  Boolean(branding.slogan?.trim()) &&
                  branding.slogan !== DEFAULT_DAIRY_PROFILE.slogan;
                const hasCustomAddress =
                  Boolean(branding.address?.trim()) &&
                  branding.address !== DEFAULT_DAIRY_PROFILE.address;
                const hasCustomMobile =
                  Boolean(branding.mobile?.trim()) &&
                  branding.mobile !== DEFAULT_DAIRY_PROFILE.mobile;
                const hasCustomProp =
                  Boolean(branding.proprietorName?.trim()) &&
                  branding.proprietorName !== DEFAULT_DAIRY_PROFILE.proprietorName;

                const centerTitle = hasCustomName
                  ? trData(branding.dairyName)
                  : moduleType === 'milk'
                  ? 'MILK DAIRY & COLLECTION CENTER'
                  : trData(branding.dairyName) ||
                    p(
                      'Our Shop & Dairy Center',
                      'हमारी दुकान एवं डेयरी केंद्र',
                      'हमार दोकान आ डेयरी केंद्र',
                      'हमर दोकान आ डेयरी केंद्र',
                      'हाम्रो पसल तथा डेरी केन्द्र'
                    );

                const subTagline = hasCustomSlogan
                  ? trData(branding.slogan)
                  : 'Smart Hisab, Easy Business';

                const billHeading =
                  moduleType === 'milk' ? 'MILK BILL / दूध बिल' : effectiveTitle;

                return (
                  <div className="text-center pb-3.5 border-b-2 border-slate-800 space-y-1.5 bg-gradient-to-b from-slate-50/80 to-white px-2 pt-1 rounded-t-xl">
                    <div className="space-y-0.5">
                      <h1 className="text-xl sm:text-2xl font-black tracking-wider text-slate-950 uppercase leading-none">
                        GAULE CALCULATOR
                      </h1>
                      <p className="text-xs sm:text-sm font-extrabold text-blue-800 tracking-wide">
                        गाउँले क्याल्कुलेटर
                      </p>
                    </div>

                    <div className="pt-1 border-t border-slate-200/80 space-y-0.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-base leading-none" aria-hidden="true">
                          {branding.shopType === 'dairy'
                            ? '🥛'
                            : branding.shopType === 'kirana'
                            ? '🛒'
                            : branding.shopType === 'jeweler'
                            ? '🪙'
                            : '🏪'}
                        </span>
                        <h2 className="text-sm sm:text-base font-black text-blue-950 tracking-wide uppercase">
                          {centerTitle}
                        </h2>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-600 italic">
                        {subTagline}
                      </p>
                    </div>

                    <div className="pt-0.5">
                      <span className="inline-block px-3.5 py-1 bg-slate-900 text-white text-[11px] font-black tracking-widest uppercase rounded-md">
                        {billHeading}
                      </span>
                    </div>

                    {(hasCustomAddress || hasCustomMobile || hasCustomProp || branding.panVatNumber) && (
                      <div className="text-[11px] text-slate-600 flex flex-wrap justify-center gap-x-3 gap-y-0.5 font-medium pt-0.5">
                        {hasCustomAddress && <span>📍 {trData(branding.address)}</span>}
                        {hasCustomMobile && <span>📞 {trNum(branding.mobile)}</span>}
                        {hasCustomProp && (
                          <span>
                            👤 {p('Prop.', 'प्रो.', 'प्रो.', 'प्रो.', 'प्रो.')}:{' '}
                            {trData(branding.proprietorName)}
                          </span>
                        )}
                        {branding.panVatNumber && (
                          <span>🏛️ PAN/VAT: {trNum(branding.panVatNumber)}</span>
                        )}
                      </div>
                    )}

                    <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase pt-0.5">
                      Powered by GAULE CALCULATOR
                    </p>
                  </div>
                );
              })()}

              {/* Bill & Customer Metadata Row */}
              <div className="grid grid-cols-2 text-xs gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">
                    {p('Bill To', 'ग्राहक विवरण (Bill To)', 'ग्राहक विवरण (Bill To)', 'ग्राहक विवरण (Bill To)', 'ग्राहक विवरण (Bill To)')}
                  </p>
                  <p className="font-extrabold text-slate-900 text-sm">{trData(currentBill.customerName)}</p>
                  {currentBill.customerMobile && <p className="text-slate-600">{p('Phone', 'फ़ोन', 'फोन', 'फोन', 'फोन')}: {trNum(currentBill.customerMobile)}</p>}
                  {currentBill.customerAddress && <p className="text-slate-600">{p('Address', 'पता', 'पता', 'पता', 'ठेगाना')}: {trData(currentBill.customerAddress)}</p>}
                </div>

                <div className="space-y-0.5 text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">
                    {p('Invoice Meta', 'बिल जानकारी (Invoice Meta)', 'बिल जानकारी (Invoice Meta)', 'बिल जानकारी (Invoice Meta)', 'बिल जानकारी (Invoice Meta)')}
                  </p>
                  <p className="font-extrabold text-blue-900">{p('Bill No', 'बिल नं.', 'बिल नं.', 'बिल नं.', 'बिल नं')}: #{trNum(currentBill.billNumber)}</p>
                  <p className="text-slate-600">{p('Date (BS)', 'तिथि (BS)', 'तारीख (BS)', 'तिथि (BS)', 'मिति (BS)')}: {trData(currentBill.dateBS)}</p>
                  <p className="text-slate-500 text-[10px]">Date (AD): {trNum(currentBill.dateAD)}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5 text-center w-10">{p('S.N.', 'क्र.सं.', 'क्र.सं.', 'क्र.सं.', 'क्र.सं.')}</th>
                      <th className="py-2 px-2.5">{p('Description', 'विवरण (Description)', 'विवरण (Description)', 'विवरण (Description)', 'विवरण (Description)')}</th>
                      <th className="py-2 px-2.5 text-center">{p('Qty', 'मात्रा (Qty)', 'मात्रा (Qty)', 'मात्रा (Qty)', 'मात्रा (Qty)')}</th>
                      <th className="py-2 px-2.5 text-right">{p('Rate', 'दर (Rate)', 'दर (Rate)', 'दर (Rate)', 'दर (Rate)')}</th>
                      <th className="py-2 px-2.5 text-right">{p('Total', 'रकम (Total)', 'रकम (Total)', 'रकम (Total)', 'रकम (Total)')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentBill.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2 px-2.5 text-center text-slate-500">{trNum(idx + 1)}</td>
                        <td className="py-2 px-2.5 font-bold text-slate-900">
                          <div>{trData(it.description)}</div>
                          {it.details && <div className="text-[10px] text-slate-500 font-normal">{trData(it.details)}</div>}
                        </td>
                        <td className="py-2 px-2.5 text-center text-slate-700 font-medium">
                          {it.quantity ? `${trNum(it.quantity)} ${it.unit ? trData(it.unit) : ''}` : '-'}
                        </td>
                        <td className="py-2 px-2.5 text-right text-slate-700 font-medium">
                          {it.rate ? fmtCur(it.rate) : '-'}
                        </td>
                        <td className="py-2 px-2.5 text-right font-black text-slate-900">
                          {fmtCur(it.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Calculation Summary Block */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
                <div className="space-y-1.5 text-xs text-slate-600 max-w-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold">{p('Payment Status', 'भुगतान स्थिति', 'भुगतान स्थिति', 'भुगतान स्थिति', 'भुक्तानी स्थिति')}:</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        paymentStatus === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : paymentStatus === 'PARTIAL'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {paymentStatus === 'PAID'
                        ? p('Paid in Full', 'पूर्ण चुकता', 'पूरा चुकता', 'पूर्ण चुकता', 'पूर्ण चुक्ता')
                        : paymentStatus === 'PARTIAL'
                        ? p('Partial Payment', 'आंशिक भुगतान', 'आंशिक भुगतान', 'आंशिक भुगतान', 'आंशिक भुक्तानी')
                        : p('Due', 'बाकी (DUE)', 'बाकी (DUE)', 'बाकी (DUE)', 'बाँकी (DUE)')}
                    </span>
                  </div>
                  {currentBill.notes && (
                    <p className="text-[11px] italic bg-slate-50 p-2 rounded-lg border border-slate-200">
                      {p('Note', 'नोट', 'नोट', 'नोट', 'नोट')}: {trData(currentBill.notes)}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    {p('Thank you for choosing our service! Visit again 🙏', 'हमारी सेवा चुनने के लिए हार्दिक धन्यवाद! फिर पधारें 🙏', 'हमार सेवा चुने खातिर हार्दिक धन्यवाद! फेर आईं 🙏', 'हमर सेवा चुनबाक लेल हार्दिक धन्यवाद! फेर आउ 🙏', 'हाम्रो सेवा रोज्नुभएकोमा हार्दिक धन्यवाद! फेरि पाल्नुहोला 🙏')}
                  </p>
                </div>

                <div className="w-full sm:w-64 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5 font-medium">
                  <div className="flex justify-between text-slate-600">
                    <span>{p('Subtotal', 'उप-कुल (Subtotal)', 'उप-कुल (Subtotal)', 'उप-कुल (Subtotal)', 'उप-कुल (Subtotal)')}:</span>
                    <span className="font-bold text-slate-900">{fmtCur(currentBill.subtotal)}</span>
                  </div>
                  {currentBill.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>{p('Discount', 'छूट (Discount)', 'छूट (Discount)', 'छूट (Discount)', 'छुट (Discount)')}:</span>
                      <span className="font-bold">- {fmtCur(currentBill.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 border-t border-dashed border-slate-300 pt-1.5">
                    <span>{p('Grand Total', 'कुल योग (Total)', 'कुल जोड़ (Total)', 'कुल जोड़ (Total)', 'कुल जम्मा (Total)')}:</span>
                    <span className="text-blue-700">{fmtCur(currentBill.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 border-t border-slate-200 pt-1">
                    <span>{p('Paid', 'भुगतान किया (Paid)', 'दिहल रकम (Paid)', 'देने रकम (Paid)', 'बुझाएको (Paid)')}:</span>
                    <span className="font-bold text-emerald-700">{fmtCur(currentBill.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black border-t border-dashed border-slate-300 pt-1">
                    <span>{p('Due Amount', 'बाकी राशि (Due)', 'बाकी रकम (Due)', 'बाकी रकम (Due)', 'बाँकी रकम (Due)')}:</span>
                    <span className={currentBill.remainingDue > 0 ? 'text-rose-600 font-black' : 'text-slate-700'}>
                      {fmtCur(currentBill.remainingDue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signature Line */}
              <div className="pt-6 flex justify-between items-end text-xs text-slate-600 border-t border-dashed border-slate-300">
                <div>
                  <p className="text-[10px] text-slate-400">Gaule Calculator Offline Hub</p>
                  <p className="text-[10px] text-slate-400">100% Verified Computation</p>
                </div>
                <div className="text-center">
                  <div className="w-36 border-b border-slate-400 mb-1" />
                  <p className="font-bold text-slate-800">
                    {trData(branding.proprietorName) || p('Authorized Sign', 'अधिकृत हस्ताक्षर (Authorized Sign)', 'अधिकृत हस्ताक्षर (Authorized Sign)', 'अधिकृत हस्ताक्षर (Authorized Sign)', 'अधिकृत हस्ताक्षर (Authorized Sign)')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: THERMAL PRINT 58mm / 80mm VIEW */}
          {activeTab === 'thermal' && (
            <div className="space-y-2.5">
              {/* Bluetooth ESC/POS Printer Bar (58mm & 80mm) */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                  <span className="font-bold text-slate-700 whitespace-nowrap">Bluetooth ESC/POS:</span>
                  {pairedPrinters.length > 0 ? (
                    <select
                      value={selectedPrinterAddr}
                      onChange={(e) => setSelectedPrinterAddr(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-800"
                    >
                      {pairedPrinters.map((pr) => (
                        <option key={pr.address} value={pr.address}>
                          {pr.name} ({pr.address})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[11px] text-slate-500">
                      {isBluetoothEscPosAvailable()
                        ? p('No paired Bluetooth printer found', 'कोई पेयर प्रिंटर नहीं मिला', 'कवनो पेयर प्रिंटर ना मिलल', 'कोनो पेयर प्रिंटर नहि भेटल', 'पेयर गरिएको ब्लुटुथ प्रिन्टर भेटिएन')
                        : `${thermalWidth} POS`}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleBluetoothEscPosPrint}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{`ESC/POS Print (${thermalWidth})`}</span>
                </button>
              </div>
              {btStatusMsg && (
                <div className="px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-semibold">
                  {btStatusMsg}
                </div>
              )}

              <div className="flex justify-center p-2 bg-slate-200 rounded-2xl">
              <div
                ref={thermalPrintRef}
                style={{ width: thermalWidth === '58mm' ? '280px' : '360px' }}
                className="bg-white p-4 rounded-xl shadow-md border border-slate-300 font-mono text-[11px] text-slate-900 leading-tight space-y-2 select-text"
              >
                {/* Thermal Header */}
                <div className="text-center space-y-0.5">
                  <h3 className="font-black text-sm uppercase tracking-wider">{trData(branding.dairyName)}</h3>
                  {branding.slogan && <p className="text-[10px] italic">"{trData(branding.slogan)}"</p>}
                  {branding.address && <p className="text-[10px]">{trData(branding.address)}</p>}
                  {branding.mobile && <p className="text-[10px]">{p('Phone', 'फ़ोन', 'फोन', 'फोन', 'फोन')}: {trNum(branding.mobile)}</p>}
                  {branding.panVatNumber && <p className="text-[10px] font-bold">PAN: {trNum(branding.panVatNumber)}</p>}
                </div>

                <div className="border-t border-dashed border-slate-400 my-1.5" />

                <div className="flex justify-between text-[10px]">
                  <span>{p('Bill No', 'बिल नं.', 'बिल नं.', 'बिल नं.', 'बिल नं')}: #{trNum(currentBill.billNumber)}</span>
                  <span>{trData(currentBill.dateBS)}</span>
                </div>
                <div className="text-[10px]">
                  <span>{p('Customer', 'ग्राहक', 'ग्राहक', 'ग्राहक', 'ग्राहक')}: <strong>{trData(currentBill.customerName)}</strong></span>
                  {currentBill.customerMobile && <span> ({trNum(currentBill.customerMobile)})</span>}
                </div>
                {currentBill.customerAddress && (
                  <div className="text-[10px] text-slate-600">{p('Address', 'पता', 'पता', 'पता', 'ठेगाना')}: {trData(currentBill.customerAddress)}</div>
                )}

                <div className="border-t border-dashed border-slate-400 my-1.5" />

                {/* Items */}
                <div className="space-y-1">
                  <div className="flex justify-between font-bold border-b border-slate-300 pb-0.5 text-[10px]">
                    <span className="w-1/2">{p('Item', 'विवरण', 'विवरण', 'विवरण', 'विवरण')}</span>
                    <span className="w-1/4 text-center">{p('Qty', 'मात्रा', 'मात्रा', 'मात्रा', 'मात्रा')}</span>
                    <span className="w-1/4 text-right">{p('Amt', 'राशि', 'रकम', 'राशि', 'रकम')}</span>
                  </div>
                  {currentBill.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[10px]">
                      <span className="w-1/2 truncate pr-1">{trData(it.description)}</span>
                      <span className="w-1/4 text-center">{trNum(it.quantity || 1)}</span>
                      <span className="w-1/4 text-right">{fmtCur(it.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-400 my-1.5" />

                {/* Totals */}
                <div className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between">
                    <span>{p('Subtotal', 'उप-कुल (Subtotal)', 'उप-कुल (Subtotal)', 'उप-कुल (Subtotal)', 'उप-कुल (Subtotal)')}:</span>
                    <span>{fmtCur(currentBill.subtotal)}</span>
                  </div>
                  {currentBill.discount > 0 && (
                    <div className="flex justify-between">
                      <span>{p('Discount', 'छूट (Discount)', 'छूट (Discount)', 'छूट (Discount)', 'छुट (Discount)')}:</span>
                      <span>- {fmtCur(currentBill.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                    <span>{p('Total', 'कुल योग (Total)', 'कुल जोड़ (Total)', 'कुल जोड़ (Total)', 'कुल जम्मा (Total)')}:</span>
                    <span>{fmtCur(currentBill.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{p('Paid', 'भुगतान किया (Paid)', 'दिहल रकम (Paid)', 'देने रकम (Paid)', 'बुझाएको रकम (Paid)')}:</span>
                    <span>{fmtCur(currentBill.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-dashed border-slate-300 pt-0.5">
                    <span>{p('Due', 'बाकी राशि (Due)', 'बाकी रकम (Due)', 'बाकी रकम (Due)', 'बाँकी रकम (Due)')}:</span>
                    <span className={currentBill.remainingDue > 0 ? 'text-rose-600' : ''}>
                      {fmtCur(currentBill.remainingDue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] pt-1">
                    <span>{p('Status', 'स्थिति', 'स्थिति', 'स्थिति', 'स्थिति')}:</span>
                    <span className="font-bold uppercase">{currentBill.paymentStatus}</span>
                  </div>
                </div>

                {/* Barcode Graphic Effect */}
                <div className="pt-2 text-center">
                  <div className="flex justify-center items-center gap-[2px] h-6 opacity-75">
                    {[2, 4, 1, 3, 5, 2, 1, 4, 3, 2, 5, 1, 3, 2, 4, 2, 1, 3, 4, 1, 2, 3, 5, 1, 2, 4].map(
                      (w, i) => (
                        <span
                          key={i}
                          style={{ width: `${w}px` }}
                          className="h-full bg-slate-800 inline-block"
                        />
                      )
                    )}
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1 font-sans">
                    {p('Thank you! Visit again 🙏', 'धन्यवाद! फिर पधारें 🙏', 'धन्यवाद! फेर आईं 🙏', 'धन्यवाद! फेर आउ 🙏', 'धन्यवाद! फेरि पाल्नुहोला 🙏')}
                  </p>
                </div>
              </div>
            </div>
            </div>
          )}

          {/* TAB 3: CUSTOMER BILL & PAYMENT HISTORY */}
          {activeTab === 'history' && (
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {`${trData(customerName) || p('Customer', 'ग्राहक', 'ग्राहक', 'ग्राहक', 'ग्राहक')} ${p('Bill & Payment History', 'के पुराने बिल एवं भुगतान इतिहास', 'के पुरान बिल आ भुगतान इतिहास', 'केर पुरान बिल आ भुगतान इतिहास', 'को पुराना बिल तथा भुक्तानी इतिहास')}`}
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    {p('All bills and remaining balance for this customer so far', 'इस ग्राहक द्वारा अब तक किए गए सभी हिसाब एवं बाकी राशि', 'एह ग्राहक के अभी ले कइल सगरी हिसाब आ बाकी रकम', 'एहि ग्राहक द्वारा अखन धरि कएल गेल सभ हिसाब आ बाकी रकम', 'यस ग्राहकले अहिलेसम्म गरेका सम्पूर्ण हिसाब तथा बाँकी रकम')}
                  </p>
                </div>

                {customerHistory && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">{p('Total Due Credit', 'कुल बाकी उधार', 'कुल बाकी उधार', 'कुल बाकी उधार', 'कुल बाँकी उधारो')}:</span>
                    <span className={`text-sm font-black ${customerHistory.totalDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {fmtCur(customerHistory.totalDue)}
                    </span>
                  </div>
                )}
              </div>

              {/* History Stats Cards */}
              {customerHistory && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 block">{p('Total Billed', 'कुल बिल राशि', 'कुल बिल रकम', 'कुल बिल राशि', 'कुल बिल रकम')}</span>
                    <span className="text-xs font-black text-slate-900">{fmtCur(customerHistory.totalBilled)}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                    <span className="text-[10px] text-emerald-700 block">{p('Total Paid', 'कुल भुगतान', 'कुल जमा', 'कुल जमा', 'जम्मा बुझाएको')}</span>
                    <span className="text-xs font-black text-emerald-800">{fmtCur(customerHistory.totalPaid)}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
                    <span className="text-[10px] text-rose-700 block">{p('Total Due', 'कुल बाकी (Due)', 'कुल बाकी (Due)', 'कुल बाकी (Due)', 'कुल बाँकी (Due)')}</span>
                    <span className="text-xs font-black text-rose-800">{fmtCur(customerHistory.totalDue)}</span>
                  </div>
                </div>
              )}

              {/* Bills List */}
              {customerHistory && customerHistory.bills.length > 0 ? (
                <div className="space-y-2">
                  {customerHistory.bills.map((b) => (
                    <div
                      key={b.id}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-xs transition"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-blue-900">#{trNum(b.billNumber)}</span>
                          <span className="text-[10px] text-slate-500 font-bold">{trData(b.dateBS)}</span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                              b.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : b.paymentStatus === 'PARTIAL'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {b.paymentStatus}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate max-w-[200px] sm:max-w-xs">
                          {trData(b.moduleTitle)} • {trNum(b.items.length)} {p('items', 'वस्तुएँ', 'सामान', 'वस्तु', 'वस्तु')}
                        </p>
                      </div>

                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="font-black text-slate-900">{fmtCur(b.totalAmount)}</p>
                          {b.remainingDue > 0 && (
                            <p className="text-[10px] text-rose-600 font-bold">{p('Due', 'बाकी', 'बाकी', 'बाकी', 'बाँकी')}: {fmtCur(b.remainingDue)}</p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            playTapSound();
                            // Switch back to view this exact bill!
                            setBillNumber(b.billNumber);
                            setDateBS(b.dateBS);
                            setDateAD(b.dateAD);
                            setCustomerName(b.customerName);
                            setCustomerMobile(b.customerMobile || '');
                            setCustomerAddress(b.customerAddress || '');
                            setDiscount(b.discount || 0);
                            setPaidAmount(b.paidAmount || 0);
                            setActiveTab('standard');
                          }}
                          className="py-1 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] active:scale-95 transition"
                        >
                          {p('Open', 'खोलें', 'खोलीं', 'खोलू', 'खोल्नुहोस्')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  {p('No previous bills found for this customer.', 'इस ग्राहक का कोई पिछला बिल नहीं मिला।', 'एह ग्राहक के कवनो पुरान बिल ना मिलल।', 'एहि ग्राहक केर कोनो पुरान बिल नहि भेटल।', 'यस ग्राहकको कुनै अघिल्लो बिल फेला परेन।')}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-3 bg-white border-t border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-2 select-none">
          
          {/* Save Bill Button */}
          <button
            onClick={handleSaveBill}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer shadow-xs ${
              isSaved
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>
              {isSaved
                ? p('Saved ✓', 'सुरक्षित ✓', 'सेव भइल ✓', 'सुरक्षित भेल ✓', 'सुरक्षित भयो ✓')
                : p('Save Bill', 'बिल सेव करें', 'बिल सेव करीं', 'बिल सेव करू', 'बिल सेभ (Save)')}
            </span>
          </button>

          {/* WhatsApp Share Button */}
          <button
            onClick={handleWhatsAppShare}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#25D366] hover:bg-[#20BD5A] active:scale-95 text-white rounded-xl text-xs font-black transition shadow-xs cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>

          {/* Download PDF Button */}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-black transition shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>
              {p('Download PDF', 'PDF डाउनलोड', 'PDF डाउनलोड', 'PDF डाउनलोड', 'PDF डाउनलोड')}
            </span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white rounded-xl text-xs font-black transition shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{p('Print', 'प्रिंट', 'प्रिंट', 'प्रिंट', 'प्रिन्ट')}</span>
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopySlip}
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 active:scale-95 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>
              {copied
                ? p('Copied!', 'कॉपी हो गया!', 'कॉपी भइल!', 'कॉपी भेल!', 'कपी भयो!')
                : p('Copy Slip', 'स्लिप कॉपी', 'रसीद कॉपी', 'स्लिप कॉपी', 'रसिद कपी')}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
