/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HISTORY & UNIVERSAL BILL MANAGEMENT VIEW
 * Gaule Calculator - Offline Smart History & Invoice Ledger
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Clock,
  Trash2,
  Receipt as ReceiptIcon,
  Share2,
  Copy,
  Filter,
  X,
  Search,
  FileText,
  User,
  Calendar,
  DollarSign,
  Printer,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Language, Currency, CalculationHistoryItem } from '../types';
import { translations } from '../data/translations';
import { getStoredHistory, deleteHistoryItem, clearAllHistory } from '../utils/storage';
import { formatCurrency, formatDateToBS } from '../utils/nepaliCalendar';
import { playSuccessSound, playTapSound } from '../utils/audio';
import { ReceiptModal } from '../components/ReceiptModal';
import { NepaliBSDatePicker } from '../components/common/NepaliBSDatePicker';
import {
  UniversalBill,
  getAllUniversalBills,
  deleteUniversalBill,
} from '../utils/universalReceiptEngine';
import { translateUserData, localizeNumberString } from '../utils/universalTranslator';
import { openExternalUrl } from '../utils/androidBridge';

const pick5 = (lang: Language, m: Record<Language, string>): string => m[lang] || m.en;

interface HistoryViewProps {
  language: Language;
  currency: Currency;
  showToast: (msg: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  language,
  currency,
  showToast,
}) => {
  const t = translations[language];

  // Active Main SubTab: 'calculations' | 'bills'
  const [activeTab, setActiveTab] = useState<'bills' | 'calculations'>('bills');

  // Calculation History State
  const [history, setHistory] = useState<CalculationHistoryItem[]>(getStoredHistory());
  const [selectedCalcReceipt, setSelectedCalcReceipt] = useState<CalculationHistoryItem | null>(null);
  const [filterDate, setFilterDate] = useState<string>('');
  const [showDateFilter, setShowDateFilter] = useState<boolean>(false);

  // Universal Bills State
  const [bills, setBills] = useState<UniversalBill[]>(() => getAllUniversalBills());
  const [selectedUniversalBill, setSelectedUniversalBill] = useState<UniversalBill | null>(null);
  const [billSearchQuery, setBillSearchQuery] = useState('');
  const [billStatusFilter, setBillStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'DUE'>('ALL');

  useEffect(() => {
    const handleBillsUpdate = () => {
      setBills(getAllUniversalBills());
    };
    window.addEventListener('ghaule_bills_updated', handleBillsUpdate);
    return () => {
      window.removeEventListener('ghaule_bills_updated', handleBillsUpdate);
    };
  }, []);

  const handleDeleteCalc = (id: string) => {
    playTapSound();
    deleteHistoryItem(id);
    setHistory(getStoredHistory());
    showToast(
      pick5(language, {
        en: 'Calculation removed',
        hi: 'हिसाब हटाया गया',
        bho: 'हिसाब हटा दिहल गइल',
        mai: 'हिसाब हटा देल गेल',
        ne: 'हिसाब मेटाइयो',
      })
    );
  };

  const handleClearAllCalc = () => {
    playTapSound();
    const confirmMsg = pick5(language, {
      en: 'Clear all saved calculations?',
      hi: 'क्या सभी सुरक्षित हिसाब मिटाना चाहते हैं?',
      bho: 'का सब सेव कइल हिसाब मिटावल चाहत बानी?',
      mai: 'की सभ सुरक्षित हिसाब मेटाबय चाहैत छी?',
      ne: 'सबै हिसाब मेटाउने हो?',
    });
    if (window.confirm(confirmMsg)) {
      clearAllHistory();
      setHistory([]);
      showToast(
        pick5(language, {
          en: 'All history cleared',
          hi: 'सभी हिसाब हटा दिए गए',
          bho: 'सब हिसाब मिटा दिहल गइल',
          mai: 'सभ हिसाब मेटा देल गेल',
          ne: 'सबै हिसाब मेटाइयो',
        })
      );
    }
  };

  const handleDeleteBill = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playTapSound();
    const confirmMsg = pick5(language, {
      en: 'Delete this bill?',
      hi: 'क्या आप यह बिल हटाना चाहते हैं?',
      bho: 'का ई बिल हटावे के बा?',
      mai: 'की ई बिल मेटाउ?',
      ne: 'के यो बिल मेटाउन निश्चित हुनुहुन्छ?',
    });
    if (window.confirm(confirmMsg)) {
      deleteUniversalBill(id);
      setBills(getAllUniversalBills());
      showToast(
        pick5(language, {
          en: 'Bill deleted',
          hi: 'बिल हटाया गया',
          bho: 'बिल हटा दिहल गइल',
          mai: 'बिल हटा देल गेल',
          ne: 'बिल मेटाइयो',
        })
      );
    }
  };

  const formatCalcShareText = (item: CalculationHistoryItem) => {
    const dateLabel = pick5(language, { en: 'Date', hi: 'तारीख', bho: 'तारीख', mai: 'तारीख', ne: 'मिति' });
    const amountLabel = pick5(language, { en: 'Amount', hi: 'रकम', bho: 'पइसा', mai: 'रकम', ne: 'रकम' });
    const displayDate = item.bsDate
      ? translateUserData(item.bsDate, language)
      : formatDateToBS(item.date, language);
    return (
      `*🧾 ${translateUserData(item.toolName, language)}*\n` +
      `${dateLabel}: ${displayDate}\n` +
      `${translateUserData(item.title, language)}\n` +
      `*${amountLabel}: ${formatCurrency(item.amount, currency, language)}*\n` +
      Object.entries(item.details)
        .map(([k, v]) => `${translateUserData(k, language)}: ${translateUserData(String(v), language)}`)
        .join('\n')
    );
  };

  const handleCopyCalc = (item: CalculationHistoryItem) => {
    playTapSound();
    navigator.clipboard.writeText(formatCalcShareText(item));
    showToast(t.copiedToast);
  };

  const handleWhatsAppCalc = (item: CalculationHistoryItem) => {
    playTapSound();
    openExternalUrl(`https://wa.me/?text=${encodeURIComponent(formatCalcShareText(item))}`);
  };

  // Filtered Calculation History
  const filteredHistory = useMemo(() => {
    if (!filterDate) return history;
    const targetBs = formatDateToBS(filterDate, 'ne');
    return history.filter((item) => {
      if (item.bsDate && item.bsDate.includes(targetBs)) return true;
      if (item.date && item.date.includes(filterDate)) return true;
      const itemBs = formatDateToBS(item.date, 'ne');
      return itemBs.includes(targetBs);
    });
  }, [history, filterDate]);

  // Filtered Universal Bills
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (billStatusFilter !== 'ALL' && b.paymentStatus !== billStatusFilter) {
        return false;
      }
      if (billSearchQuery.trim()) {
        const q = billSearchQuery.toLowerCase();
        const matchName = b.customerName?.toLowerCase().includes(q);
        const matchMobile = b.customerMobile?.includes(q);
        const matchNumber = b.billNumber?.toLowerCase().includes(q);
        const matchTitle = b.moduleTitle?.toLowerCase().includes(q);
        if (!matchName && !matchMobile && !matchNumber && !matchTitle) return false;
      }
      return true;
    });
  }, [bills, billSearchQuery, billStatusFilter]);

  // Overall Financial Stats across all bills
  const billStats = useMemo(() => {
    let totalBilled = 0;
    let totalPaid = 0;
    let totalDue = 0;
    bills.forEach((b) => {
      totalBilled += b.totalAmount || 0;
      totalPaid += b.paidAmount || 0;
      totalDue += b.remainingDue || 0;
    });
    return { totalBilled, totalPaid, totalDue };
  }, [bills]);

  return (
    <div className="space-y-4 pb-24 select-none">
      
      {/* Top Main Mode Switcher: Universal Bills vs Calculation History */}
      <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center gap-1 shadow-2xs">
        <button
          onClick={() => {
            playTapSound();
            setActiveTab('bills');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'bills'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <ReceiptIcon className="w-4 h-4" />
          <span>{pick5(language, { en: 'Bills & Invoices', hi: 'जारी बिल और रसीद', bho: 'बिल आ रसीद', mai: 'बिल आ रसीद', ne: 'जारी गरिएका बिल रसिदहरू' })}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === 'bills' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-800'}`}>
            {localizeNumberString(bills.length, language)}
          </span>
        </button>

        <button
          onClick={() => {
            playTapSound();
            setActiveTab('calculations');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'calculations'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{pick5(language, { en: 'Calculation Log', hi: 'हिसाब लॉग', bho: 'हिसाब लॉग', mai: 'हिसाब लॉग', ne: 'क्याल्कुलेटर हिसाब लग' })}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${activeTab === 'calculations' ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-800'}`}>
            {localizeNumberString(history.length, language)}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: UNIVERSAL BILLS & INVOICES VIEW                                 */}
      {/* ========================================================================= */}
      {activeTab === 'bills' && (
        <div className="space-y-3.5">
          {/* Financial Summary Strip */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                {pick5(language, {
                  en: 'Total Billed',
                  hi: 'कुल बिल रकम',
                  bho: 'कुल बिल पइसा',
                  mai: 'कुल बिल रकम',
                  ne: 'कुल बिल रकम',
                })}
              </span>
              <p className="text-xs sm:text-sm font-black text-slate-900">
                {formatCurrency(billStats.totalBilled, currency, language)}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-0.5">
              <span className="text-[10px] font-bold text-emerald-700 uppercase">
                {pick5(language, {
                  en: 'Total Paid',
                  hi: 'कुल जमा',
                  bho: 'कुल जमा पइसा',
                  mai: 'कुल जमा रकम',
                  ne: 'जम्मा प्राप्त',
                })}
              </span>
              <p className="text-xs sm:text-sm font-black text-emerald-800">
                {formatCurrency(billStats.totalPaid, currency, language)}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-0.5">
              <span className="text-[10px] font-bold text-rose-700 uppercase">
                {pick5(language, {
                  en: 'Total Due',
                  hi: 'कुल बाकी',
                  bho: 'कुल बाकी पइसा',
                  mai: 'कुल बाँकी',
                  ne: 'कुल बाँकी',
                })}
              </span>
              <p className="text-xs sm:text-sm font-black text-rose-800">
                {formatCurrency(billStats.totalDue, currency, language)}
              </p>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={billSearchQuery}
                onChange={(e) => setBillSearchQuery(e.target.value)}
                placeholder={pick5(language, {
                  en: 'Search by customer name, phone or bill no...',
                  hi: 'ग्राहक का नाम, मोबाइल या बिल नं. खोजें...',
                  bho: 'ग्राहक के नाम, मोबाइल भा बिल नं. खोजीं...',
                  mai: 'ग्राहकक नाम, मोबाइल वा बिल नं. ताकू...',
                  ne: 'ग्राहकको नाम, मोबाइल वा बिल नं. खोज्नुहोस्...',
                })}
                className="w-full py-2 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
              />
              {billSearchQuery && (
                <button
                  onClick={() => setBillSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold">
              {[
                { id: 'ALL', label: pick5(language, { en: 'All', hi: 'सभी', bho: 'सब', mai: 'सभ', ne: 'सबै' }) },
                { id: 'PAID', label: pick5(language, { en: 'Paid', hi: 'चुकता', bho: 'चुकता', mai: 'चुकता', ne: 'चुक्ता' }) },
                { id: 'PARTIAL', label: pick5(language, { en: 'Partial', hi: 'आंशिक', bho: 'आंशिक', mai: 'आंशिक', ne: 'आंशिक' }) },
                { id: 'DUE', label: pick5(language, { en: 'Due', hi: 'बाकी', bho: 'बाकी', mai: 'बाँकी', ne: 'बाँकी' }) },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => {
                    playTapSound();
                    setBillStatusFilter(st.id as any);
                  }}
                  className={`py-1 px-2.5 rounded-lg whitespace-nowrap transition cursor-pointer ${
                    billStatusFilter === st.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bills List */}
          {filteredBills.length > 0 ? (
            <div className="space-y-2">
              {filteredBills.map((b) => (
                <div
                  key={b.id}
                  onClick={() => {
                    playTapSound();
                    setSelectedUniversalBill(b);
                  }}
                  className="p-3 bg-white hover:bg-blue-50/50 active:scale-[0.99] rounded-2xl border border-slate-200/90 shadow-2xs transition cursor-pointer space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-blue-900">#{b.billNumber}</span>
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                            b.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : b.paymentStatus === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {b.paymentStatus === 'PAID'
                            ? pick5(language, { en: 'PAID', hi: 'चुकता', bho: 'चुकता', mai: 'चुकता', ne: 'चुक्ता' })
                            : b.paymentStatus === 'PARTIAL'
                            ? pick5(language, { en: 'PARTIAL', hi: 'आंशिक', bho: 'आंशिक', mai: 'आंशिक', ne: 'आंशिक' })
                            : pick5(language, { en: 'DUE', hi: 'बाकी', bho: 'बाकी', mai: 'बाँकी', ne: 'बाँकी' })}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        <span>{translateUserData(b.customerName, language)}</span>
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {b.customerMobile
                          ? `${pick5(language, { en: 'Phone:', hi: 'फोन:', bho: 'फोन:', mai: 'फोन:', ne: 'फोन:' })} ${localizeNumberString(b.customerMobile, language)} • `
                          : ''}
                        {translateUserData(b.moduleTitle, language)} ({localizeNumberString(b.items?.length || 1, language)}{' '}
                        {pick5(language, { en: 'items', hi: 'सामान', bho: 'सामान', mai: 'वस्तु', ne: 'वस्तु' })})
                      </p>
                    </div>

                    <div className="text-right space-y-0.5">
                      <span className="text-sm font-black text-slate-900 block">
                        {formatCurrency(b.totalAmount, currency, language)}
                      </span>
                      {b.remainingDue > 0 ? (
                        <span className="text-[10px] font-bold text-rose-600 block">
                          {pick5(language, { en: 'Due:', hi: 'बाकी:', bho: 'बाकी:', mai: 'बाँकी:', ne: 'बाँकी:' })}{' '}
                          {formatCurrency(b.remainingDue, currency, language)}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-600 block">
                          {pick5(language, {
                            en: 'Full Paid',
                            hi: 'पूरा भुगतान',
                            bho: 'पूरा भुगतान',
                            mai: 'पूरा भुगतान',
                            ne: 'पूर्ण भुक्तानी',
                          })}
                        </span>
                      )}
                      <span className="text-[9px] text-slate-400 font-mono block">
                        BS: {localizeNumberString(b.dateBS, language)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[220px]">
                      {translateUserData(
                        b.branding?.dairyName ||
                          pick5(language, {
                            en: 'Shop Bill',
                            hi: 'दुकान बिल',
                            bho: 'दुकान बिल',
                            mai: 'दोकान बिल',
                            ne: 'पसल बिल',
                          }),
                        language
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 font-bold flex items-center gap-0.5">
                        {pick5(language, {
                          en: 'Open / Print',
                          hi: 'खोलें / प्रिंट',
                          bho: 'खोलीं / प्रिंट',
                          mai: 'खोलू / प्रिंट',
                          ne: 'खोल्नुहोस् / प्रिन्ट',
                        })}{' '}
                        <ChevronRight className="w-3 h-3" />
                      </span>
                      <button
                        onClick={(e) => handleDeleteBill(b.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                        title={pick5(language, {
                          en: 'Delete',
                          hi: 'हटाएं',
                          bho: 'हटाईं',
                          mai: 'मेटाउ',
                          ne: 'डिलिट गर्नुहोस्',
                        })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 space-y-2">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-xl">
                🧾
              </div>
              <h4 className="font-bold text-sm text-slate-800">
                {pick5(language, {
                  en: 'No Bills Found',
                  hi: 'कोई बिल रसीद नहीं मिली',
                  bho: 'कवनो बिल रसीद ना मिलल',
                  mai: 'कोनो बिल रसीद नहि भेटल',
                  ne: 'कुनै बिल रसिद फेला परेन',
                })}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {pick5(language, {
                  en: 'After calculating in any calculator (milk, interest, gold or shop), tap Generate Bill Receipt.',
                  hi: 'किसी भी कैलकुलेटर (दूध, ब्याज, सोना-चाँदी या किराना) में हिसाब करने के बाद "बिल रसीद बनाएं" दबाएं।',
                  bho: 'कवनो कैलकुलेटर (दूध, ब्याज, सोना-चाँदी भा दुकान) में हिसाब कइला के बाद "बिल रसीद बनाईं" दबाईं।',
                  mai: 'कोनो भी कैलकुलेटर (दूध, ब्याज, सोना-चान्ही वा दोकान) मे हिसाब केलाक बाद "बिल रसीद बनाउ" दबाउ।',
                  ne: 'कुनै पनि क्याल्कुलेटर (दूध, ब्याज, सुनचाँदी वा किराना) मा हिसाब गरेपछि "बिल रसिद बनाउनुहोस्" थिच्नुहोस्।',
                })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: CALCULATION HISTORY LOG                                         */}
      {/* ========================================================================= */}
      {activeTab === 'calculations' && (
        <div className="space-y-3.5">
          {history.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-600">
                {pick5(language, {
                  en: 'Saved Calculations',
                  hi: 'सुरक्षित हिसाब',
                  bho: 'सेव कइल हिसाब',
                  mai: 'सुरक्षित हिसाब',
                  ne: 'सुरक्षित हिसाबहरू',
                })} ({localizeNumberString(filteredHistory.length, language)}/{localizeNumberString(history.length, language)})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setShowDateFilter((prev) => !prev);
                  }}
                  className={`text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 transition ${
                    filterDate
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  <span>
                    {filterDate
                      ? formatDateToBS(filterDate, language)
                      : pick5(language, { en: 'Filter Date', hi: 'तारीख चुनें', bho: 'तारीख चुनीं', mai: 'तारीख चुनू', ne: 'मिति छान्नुहोस्' })}
                  </span>
                </button>

                <button
                  onClick={handleClearAllCalc}
                  className="text-xs text-red-500 hover:text-red-700 font-bold px-2 py-1 rounded-xl hover:bg-red-50 transition"
                >
                  {t.clearAll}
                </button>
              </div>
            </div>
          )}

          {/* Date Picker Filter Bar */}
          {showDateFilter && (
            <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  {pick5(language, {
                    en: 'Search by Nepali BS Date:',
                    hi: 'नेपाली वि.सं. तारीख अनुसार खोजें:',
                    bho: 'नेपाली वि.सं. तारीख से खोजीं:',
                    mai: 'नेपाली वि.सं. तारीख सँ ताकू:',
                    ne: 'नेपाली वि.सं. मिति अनुसार खोज्नुहोस्:',
                  })}
                </span>
                {filterDate && (
                  <button
                    onClick={() => setFilterDate('')}
                    className="text-[11px] text-red-500 font-bold hover:underline flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" />{' '}
                    {pick5(language, {
                      en: 'Clear Filter',
                      hi: 'फिल्टर हटाएं',
                      bho: 'फिल्टर हटाईं',
                      mai: 'फिल्टर हटाउ',
                      ne: 'फिल्टर हटाउनुहोस्',
                    })}
                  </button>
                )}
              </div>
              <NepaliBSDatePicker
                value={filterDate || new Date().toISOString().split('T')[0]}
                onChange={(adDate) => setFilterDate(adDate)}
                language={language}
              />
            </div>
          )}

          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Clock className="w-7 h-7 stroke-[1.5]" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-sm">
                {pick5(language, {
                  en: 'No Saved Calculations',
                  hi: 'कोई सुरक्षित हिसाब नहीं है',
                  bho: 'कवनो सेव हिसाब नइखे',
                  mai: 'कोनो सुरक्षित हिसाब नहि अछि',
                  ne: 'कुनै सुरक्षित हिसाब छैन',
                })}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {pick5(language, {
                  en: 'Saved calculations from any calculator will appear here.',
                  hi: 'किसी भी कैलकुलेटर से सेव किया गया हिसाब यहाँ दिखेगा।',
                  bho: 'कवनो भी कैलकुलेटर से सेव कइल हिसाब इहाँ देखाई।',
                  mai: 'कोनो भी कैलकुलेटर सँ सुरक्षित हिसाब एतय देखायत।',
                  ne: 'तपाईंले कुनै पनि क्याल्कुलेटरबाट सुरक्षित गरेको हिसाब यहाँ देखिनेछ।',
                })}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">
                        {translateUserData(item.toolName, language)}
                      </span>
                      <h4 className="font-extrabold text-slate-900 text-sm pt-0.5">
                        {translateUserData(item.title, language)}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {translateUserData(item.summary, language)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 text-base">
                        {formatCurrency(item.amount, item.currency, language)}
                      </span>
                      <div className="text-[10px] font-bold text-slate-400 flex flex-col items-end mt-0.5">
                        <span>{item.bsDate ? translateUserData(item.bsDate, language) : formatDateToBS(item.date, language)}</span>
                        <span className="text-[9px] text-slate-300">AD: {localizeNumberString(item.date, language)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Details pill list */}
                  {Object.keys(item.details).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-[11px] text-slate-600">
                      {Object.entries(item.details).map(([key, val]) => (
                        <span key={key} className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                          <strong className="text-slate-800">{translateUserData(key, language)}:</strong> {translateUserData(String(val), language)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => {
                        playTapSound();
                        setSelectedCalcReceipt(item);
                      }}
                      className="flex items-center gap-1 py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition"
                    >
                      <ReceiptIcon className="w-3.5 h-3.5" />
                      <span>{t.viewBill}</span>
                    </button>
                    <button
                      onClick={() => handleWhatsAppCalc(item)}
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition"
                      title="WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleCopyCalc(item)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
                      title="Copy"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCalc(item.id)}
                      className="p-2 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------- MODAL 1: CALCULATION RECEIPT MODAL ---------------- */}
      {selectedCalcReceipt && (
        <ReceiptModal
          isOpen={!!selectedCalcReceipt}
          onClose={() => setSelectedCalcReceipt(null)}
          title={selectedCalcReceipt.toolName}
          totalAmountText={formatCurrency(selectedCalcReceipt.amount, currency, language)}
          items={Object.entries(selectedCalcReceipt.details).map(([k, v]) => ({
            label: k,
            value: String(v),
            subtotal: 0,
          }))}
          note="GHAULE CALCULATOR 100% Offline Verified"
          language={language}
        />
      )}

      {/* ---------------- MODAL 2: UNIVERSAL BILL MODAL (REPRINT / HISTORY) ---------------- */}
      {selectedUniversalBill && (
        <ReceiptModal
          isOpen={!!selectedUniversalBill}
          onClose={() => setSelectedUniversalBill(null)}
          moduleType={selectedUniversalBill.moduleType}
          title={selectedUniversalBill.moduleTitle}
          initialBillData={selectedUniversalBill}
          language={language}
        />
      )}

    </div>
  );
};
