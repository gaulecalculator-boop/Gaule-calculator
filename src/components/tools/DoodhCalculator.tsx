import React, { useState, useMemo } from 'react';
import {
  Minus,
  Plus,
  Check,
  Calendar,
  Share2,
  Copy,
  Receipt as ReceiptIcon,
  Save,
  Trash2,
  Milk,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Language, Currency } from '../../types';
import { translations } from '../../data/translations';
import {
  formatCurrency,
  toDevanagari,
  NEPALI_MONTHS,
  WEEKDAYS,
  bsToAd,
  adToBs,
  formatDateToBS,
  BS_MIN_YEAR,
  BS_MAX_YEAR,
  getTodayBS,
  getBSDaysInMonth,
  getBSMonthFirstDayOfWeek,
} from '../../utils/nepaliCalendar';
import { playSuccessSound, playTapSound } from '../../utils/audio';
import { saveCalculationToHistory, saveMilkDiaryEntry, getStoredMilkDiary, deleteMilkDiaryEntry } from '../../utils/storage';
import { ReceiptModal } from '../ReceiptModal';
import { NepaliBSDatePicker } from '../common/NepaliBSDatePicker';
import { openExternalUrl } from '../../utils/androidBridge';
export {
  calculatePendingBalance,
  type UnpaidMonthBreakdownItem,
  type PendingBalanceBreakdown,
} from '../../utils/milkManagementStorage';

/**
 * Formats exact day count cleanly without converting into estimated 30-day months
 * (e.g., 37 days -> "३७ दिन" / "37 दिन" / "37 Days").
 */
export function formatDurationMonthDays(
  daysCount: number,
  language: Language
): { text: string; months: number; days: number } {
  const safe = Math.max(0, daysCount);
  const displayNum = safe % 1 === 0 ? Math.round(safe) : +safe.toFixed(1);

  if (language === 'hi') {
    return { text: `${displayNum} दिन`, months: 0, days: displayNum };
  }

  if (language === 'ne') {
    return { text: `${toDevanagari(displayNum)} दिन`, months: 0, days: displayNum };
  }

  return {
    text: `${displayNum} ${displayNum === 1 ? 'Day' : 'Days'}`,
    months: 0,
    days: displayNum,
  };
}

interface DoodhCalculatorProps {
  language: Language;
  currency: Currency;
  onOpenNotebook: () => void;
  showToast: (msg: string) => void;
}

export const DoodhCalculator: React.FC<DoodhCalculatorProps> = ({
  language,
  currency,
  onOpenNotebook,
  showToast,
}) => {
  const t = translations[language];

  // Active sub-tab: 'calendar' | 'quick' | 'diary'
  const [subTab, setSubTab] = useState<'calendar' | 'quick' | 'diary'>('quick');

  // Daily Quantity (in liters)
  const [dailyQty, setDailyQty] = useState<number>(1);

  // Rate per liter
  const [rate, setRate] = useState<number>(85);
  const [rateInput, setRateInput] = useState<string>('85');

  // Dynamic Today BS Date
  const todayBs = useMemo(() => getTodayBS(), []);

  // Calendar Log Tab State - Dynamic Start (1st of current BS month) & End (Today BS date)
  const [startDay, setStartDay] = useState<number>(1);
  const [startMonth, setStartMonth] = useState<number>(todayBs.month);
  const [startYear, setStartYear] = useState<number>(todayBs.year);

  const [endDay, setEndDay] = useState<number>(todayBs.day);
  const [endMonth, setEndMonth] = useState<number>(todayBs.month);
  const [endYear, setEndYear] = useState<number>(todayBs.year);

  const [absentDays, setAbsentDays] = useState<number>(0);
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end' | null>(null);

  // Calendar Payment / Paid Days State
  const [calendarPaidDays, setCalendarPaidDays] = useState<number>(0);

  // Quick Calc Tab State (Driven by BS Calendar Start & End Dates)
  const [quickStartBs, setQuickStartBs] = useState<{ year: number; month: number; day: number }>({
    year: todayBs.year,
    month: todayBs.month,
    day: 1,
  });
  const [quickEndBs, setQuickEndBs] = useState<{ year: number; month: number; day: number }>({
    year: todayBs.year,
    month: todayBs.month,
    day: todayBs.day,
  });
  const [quickCalViewYear, setQuickCalViewYear] = useState<number>(todayBs.year);
  const [quickCalViewMonth, setQuickCalViewMonth] = useState<number>(todayBs.month);
  const [quickCalPicking, setQuickCalPicking] = useState<'start' | 'end'>('start');
  const [isQuickCalOpen, setIsQuickCalOpen] = useState<boolean>(false);
  const [quickPaidAmount, setQuickPaidAmount] = useState<number>(0);
  const [quickPaidInput, setQuickPaidInput] = useState<string>('0');

  // Daily Diary State
  const [diaryDate, setDiaryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [morningLtr, setMorningLtr] = useState<string>('1');
  const [eveningLtr, setEveningLtr] = useState<string>('0.5');
  const [diaryRecords, setDiaryRecords] = useState(getStoredMilkDiary());

  const diaryBs = useMemo(() => {
    try {
      const d = new Date(diaryDate);
      return isNaN(d.getTime()) ? adToBs(new Date()) : adToBs(d);
    } catch {
      return adToBs(new Date());
    }
  }, [diaryDate]);

  const handleDiaryBsChange = (year: number, month: number, day: number) => {
    const maxDays = getBSDaysInMonth(year, month);
    const safeDay = Math.min(Math.max(1, day), maxDays);
    const ad = bsToAd(year, month, safeDay);
    const iso = ad.toISOString().split('T')[0];
    setDiaryDate(iso);
  };

  // Receipt Modal State
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Calculations for Calendar Log - Handles Same Month and Different Month Ranges!
  const totalDays = useMemo(() => {
    try {
      const sDate = bsToAd(startYear, startMonth, startDay);
      const eDate = bsToAd(endYear, endMonth, endDay);
      const diffMs = eDate.getTime() - sDate.getTime();
      const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, days);
    } catch {
      return Math.max(1, endDay - startDay + 1);
    }
  }, [startYear, startMonth, startDay, endYear, endMonth, endDay]);

  const effectiveDays = Math.max(0, totalDays - absentDays);
  const totalMilkCalendar = +(effectiveDays * dailyQty).toFixed(2);
  const totalBillCalendar = Math.round(totalMilkCalendar * rate);
  const calendarRemainingDays = Math.max(0, effectiveDays - calendarPaidDays);
  const calendarPaidAmount = Math.round(calendarPaidDays * dailyQty * rate);
  const calendarRemainingBill = Math.round(calendarRemainingDays * dailyQty * rate);

  // Calculations for Quick Calc (from BS Calendar range)
  const quickStartAdTime = useMemo(
    () => bsToAd(quickStartBs.year, quickStartBs.month, quickStartBs.day).getTime(),
    [quickStartBs]
  );
  const quickEndAdTime = useMemo(
    () => bsToAd(quickEndBs.year, quickEndBs.month, quickEndBs.day).getTime(),
    [quickEndBs]
  );
  const quickDays = useMemo(() => {
    const days = Math.round((quickEndAdTime - quickStartAdTime) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, days);
  }, [quickStartAdTime, quickEndAdTime]);

  const quickCalDaysCount = getBSDaysInMonth(quickCalViewYear, quickCalViewMonth);
  const quickCalFirstDayOfWeek = getBSMonthFirstDayOfWeek(quickCalViewYear, quickCalViewMonth);

  const getQuickMonthName = (m: number) => {
    const obj = NEPALI_MONTHS[m - 1] || NEPALI_MONTHS[0];
    return language === 'hi' ? obj.nameHi : language === 'ne' ? obj.nameNe : obj.nameEn;
  };
  const quickStartBsText = `${toDevanagari(quickStartBs.day)} ${getQuickMonthName(quickStartBs.month)} ${toDevanagari(quickStartBs.year)}`;
  const quickEndBsText = `${toDevanagari(quickEndBs.day)} ${getQuickMonthName(quickEndBs.month)} ${toDevanagari(quickEndBs.year)}`;

  const handleQuickCalendarDayClick = (d: number) => {
    playTapSound();
    const clicked = { year: quickCalViewYear, month: quickCalViewMonth, day: d };
    const clickedAd = bsToAd(clicked.year, clicked.month, clicked.day).getTime();

    if (quickCalPicking === 'start') {
      setQuickStartBs(clicked);
      if (clickedAd > quickEndAdTime) {
        setQuickEndBs(clicked);
      }
      setQuickCalPicking('end');
    } else {
      if (clickedAd < quickStartAdTime) {
        setQuickStartBs(clicked);
        setQuickCalPicking('end');
      } else {
        setQuickEndBs(clicked);
        setQuickCalPicking('start');
      }
    }
  };

  const quickTotalMilk = +(quickDays * dailyQty).toFixed(2);
  const quickTotalBill = Math.round(quickTotalMilk * rate);
  const dailyMilkBill = dailyQty * rate;
  const quickPaidDays = dailyMilkBill > 0 ? +(quickPaidAmount / dailyMilkBill).toFixed(1) : 0;
  const quickRemainingBill = Math.max(0, quickTotalBill - quickPaidAmount);
  const quickAdvanceAmount = Math.max(0, quickPaidAmount - quickTotalBill);
  const quickRemainingDays = dailyMilkBill > 0 ? +(quickRemainingBill / dailyMilkBill).toFixed(1) : 0;
  const quickRemainingMilk = rate > 0 ? +(quickRemainingBill / rate).toFixed(2) : 0;

  const startMonthObj = NEPALI_MONTHS[startMonth - 1] || NEPALI_MONTHS[6];
  const endMonthObj = NEPALI_MONTHS[endMonth - 1] || NEPALI_MONTHS[6];

  const startMonthName =
    language === 'hi'
      ? startMonthObj.nameHi
      : language === 'ne'
      ? startMonthObj.nameNe
      : startMonthObj.nameEn;
  const endMonthName =
    language === 'hi'
      ? endMonthObj.nameHi
      : language === 'ne'
      ? endMonthObj.nameNe
      : endMonthObj.nameEn;

  const startBsText = `${toDevanagari(startDay)} ${startMonthName} ${toDevanagari(startYear)}`;
  const endBsText = `${toDevanagari(endDay)} ${endMonthName} ${toDevanagari(endYear)}`;

  const targetYear = datePickerTarget === 'start' ? startYear : endYear;
  const targetMonth = datePickerTarget === 'start' ? startMonth : endMonth;
  const targetDaysCount = getBSDaysInMonth(targetYear, targetMonth);
  const targetFirstDayOfWeek = getBSMonthFirstDayOfWeek(targetYear, targetMonth);

  const handleSetRate = () => {
    playTapSound();
    const parsed = parseFloat(rateInput);
    if (!isNaN(parsed) && parsed > 0) {
      setRate(parsed);
      showToast(`Rate updated to ${formatCurrency(parsed, currency, language)}`);
    }
  };

  const handleAdjustRate = (delta: number) => {
    playTapSound();
    const newRate = Math.max(1, rate + delta);
    setRate(newRate);
    setRateInput(String(newRate));
  };

  const handleSaveToHistory = () => {
    playSuccessSound();
    const isCalendar = subTab === 'calendar';
    const totalD = isCalendar ? effectiveDays : quickDays;
    const paidAmt = isCalendar ? calendarPaidAmount : quickPaidAmount;
    const remD = isCalendar ? calendarRemainingDays : quickRemainingDays;
    const totalAmt = isCalendar ? totalBillCalendar : quickTotalBill;
    const remAmt = isCalendar ? calendarRemainingBill : quickRemainingBill;
    const milkQtyUsed = isCalendar ? totalMilkCalendar : quickTotalMilk;

    const totalDur = formatDurationMonthDays(totalD, language).text;
    const remDur = formatDurationMonthDays(remD, language).text;

    saveCalculationToHistory({
      toolId: 'doodh',
      toolName: language === 'ne' ? 'दूध हिसाब (Milk Ledger)' : 'Doodh Calculator (Milk)',
      date: new Date().toLocaleDateString('en-GB'),
      bsDate: isCalendar ? `${startBsText} - ${endBsText}` : `${quickStartBsText} - ${quickEndBsText}`,
      title: `${totalDur} - बाँकी: ${formatCurrency(remAmt, currency, language)}`,
      summary: `बाँकी: ${formatCurrency(remAmt, currency, language)} (कुल: ${formatCurrency(totalAmt, currency, language)})`,
      amount: remAmt,
      currency,
      details: {
        [t.dailyMilkQuantity]: `${dailyQty} L/day`,
        [t.milkRatePerLitre]: `${formatCurrency(rate, currency, language)}/L`,
        'कुल अवधि': totalDur,
        'दिएको / तिरेको रकम': formatCurrency(paidAmt, currency, language),
        'बाँकी रकम': `${formatCurrency(remAmt, currency, language)} (${remDur})`,
        [t.totalMilk]: `${milkQtyUsed} Liters`,
      },
    });

    showToast(t.savedToast);
  };

  const handleSaveDiaryEntry = () => {
    playSuccessSound();
    const m = parseFloat(morningLtr) || 0;
    const e = parseFloat(eveningLtr) || 0;
    const total = +(m + e).toFixed(2);
    const price = Math.round(total * rate);

    saveMilkDiaryEntry({
      date: diaryDate,
      bsDate: formatDateToBS(diaryDate, 'ne', true),
      morningLtr: m,
      eveningLtr: e,
      totalLtr: total,
      ratePerLtr: rate,
      totalPrice: price,
    });

    setDiaryRecords(getStoredMilkDiary());
    showToast(language === 'ne' ? 'डायरीमा सुरक्षित भयो!' : 'Diary entry saved!');
  };

  const handleDeleteDiary = (id: string) => {
    playTapSound();
    deleteMilkDiaryEntry(id);
    setDiaryRecords(getStoredMilkDiary());
  };

  const handleCopy = () => {
    playTapSound();
    const isCalendar = subTab === 'calendar';
    const totalD = isCalendar ? effectiveDays : quickDays;
    const remD = isCalendar ? calendarRemainingDays : quickRemainingDays;
    const totalAmt = isCalendar ? totalBillCalendar : quickTotalBill;
    const paidAmt = isCalendar ? calendarPaidAmount : quickPaidAmount;
    const remAmt = isCalendar ? calendarRemainingBill : quickRemainingBill;

    const totalDur = formatDurationMonthDays(totalD, language).text;
    const remDur = formatDurationMonthDays(remD, language).text;

    const text =
      `*🥛 GHAULE DOODH LEDGER (दूध हिसाब)*\n` +
      `---------------------------\n` +
      `दैनिक दूध: ${dailyQty} L/दिन\n` +
      `दर: ${formatCurrency(rate, currency, language)}/L\n` +
      `कुल अवधि: ${totalDur}\n` +
      `कुल रकम: ${formatCurrency(totalAmt, currency, language)}\n` +
      (paidAmt > 0
        ? `दिएको / तिरेको रकम: ${formatCurrency(paidAmt, currency, language)}\n`
        : '') +
      `---------------------------\n` +
      (remAmt > 0
        ? `🔴 *बाँकी रकम:* ${formatCurrency(remAmt, currency, language)} (${remDur})\n`
        : `✅ *हिसाब चुक्ता भयो (PAID)*\n`) +
      (isCalendar
        ? `अवधि: ${startBsText} देखि ${endBsText}\n`
        : `अवधि: ${quickStartBsText} देखि ${quickEndBsText}\n`) +
      `---------------------------`;

    navigator.clipboard.writeText(text);
    showToast(t.copiedToast);
  };

  const handleWhatsAppShare = () => {
    playTapSound();
    const isCalendar = subTab === 'calendar';
    const totalD = isCalendar ? effectiveDays : quickDays;
    const remD = isCalendar ? calendarRemainingDays : quickRemainingDays;
    const totalAmt = isCalendar ? totalBillCalendar : quickTotalBill;
    const paidAmt = isCalendar ? calendarPaidAmount : quickPaidAmount;
    const remAmt = isCalendar ? calendarRemainingBill : quickRemainingBill;

    const totalDur = formatDurationMonthDays(totalD, language).text;
    const remDur = formatDurationMonthDays(remD, language).text;

    const text =
      `*🥛 GHAULE DOODH LEDGER (दूध हिसाब)*\n` +
      `---------------------------\n` +
      `दैनिक दूध: ${dailyQty} L/दिन\n` +
      `दर: ${formatCurrency(rate, currency, language)}/L\n` +
      `कुल अवधि: ${totalDur}\n` +
      `कुल रकम: ${formatCurrency(totalAmt, currency, language)}\n` +
      (paidAmt > 0
        ? `दिएको / तिरेको रकम: ${formatCurrency(paidAmt, currency, language)}\n`
        : '') +
      `---------------------------\n` +
      (remAmt > 0
        ? `🔴 *बाँकी रकम:* ${formatCurrency(remAmt, currency, language)} (${remDur})\n`
        : `✅ *हिसाब चुक्ता भयो (PAID)*\n`) +
      (isCalendar
        ? `अवधि: ${startBsText} देखि ${endBsText}\n`
        : `अवधि: ${quickStartBsText} देखि ${quickEndBsText}\n`) +
      `---------------------------`;

    openExternalUrl(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* Quick Switch to Customer & Payment Management */}
      <div
        onClick={() => {
          playTapSound();
          onOpenNotebook();
        }}
        className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-3xl p-3.5 shadow-md flex items-center justify-between cursor-pointer active:scale-[0.99] transition"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0 shadow-inner">
            👥
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-white truncate">
              दुध ग्राहक तथा मासिक भुक्तानी व्यवस्थापन
            </h4>
            <p className="text-[10px] text-blue-100 font-medium truncate">
              दैनिक हाजिरी, ग्राहक अनुसार मासिक बिल, Due रिमाइन्डर र रसिद
            </p>
          </div>
        </div>
        <div className="bg-white text-blue-800 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 flex-shrink-0 shadow-xs">
          <span>खोल्नुहोस्</span>
          <span>➔</span>
        </div>
      </div>

      {/* Sub Tabs: Calendar Log | Quick Calc */}
      <div className="flex items-center p-1 bg-slate-200/70 rounded-2xl gap-1 text-xs font-bold">
        <button
          onClick={() => {
            playTapSound();
            setSubTab('calendar');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl transition ${
            subTab === 'calendar' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{t.calendarLog}</span>
        </button>
        <button
          onClick={() => {
            playTapSound();
            setSubTab('quick');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl transition ${
            subTab === 'quick' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🧮</span>
          <span>{t.quickCalc}</span>
        </button>
      </div>

      {/* Common Section 1: Daily Milk Quantity */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 tracking-wide flex items-center gap-1.5 uppercase">
            <span>🍼</span> {t.dailyMilkQuantity}
          </span>
          <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
            {dailyQty} Liter/day
          </span>
        </div>

        {/* 4 Presets Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: '1 Pav (250g)', sub: '250 ml / gm', val: 0.25 },
            { label: 'Half Liter', sub: '500 ml / gm', val: 0.5 },
            { label: '1 Liter', sub: '1000 ml / 1 L', val: 1 },
            { label: '1.5 Liter', sub: '1500 ml / 1.5 L', val: 1.5 },
          ].map((preset) => {
            const isSelected = dailyQty === preset.val;
            return (
              <button
                key={preset.val}
                onClick={() => {
                  playTapSound();
                  setDailyQty(preset.val);
                }}
                className={`p-3 rounded-2xl text-left border transition active:scale-[0.98] ${
                  isSelected
                    ? 'bg-[#0284C7] text-white border-blue-500 shadow-md shadow-sky-500/20'
                    : 'bg-slate-50/70 hover:bg-slate-100 text-slate-800 border-slate-200/80'
                }`}
              >
                <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                  {preset.label}
                </div>
                <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>
                  {preset.sub}
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Quantity Stepper */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-600 font-medium">{t.customQuantity}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playTapSound();
                setDailyQty((prev) => Math.max(0.1, +(prev - 0.25).toFixed(2)));
              }}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-700"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="min-w-[70px] text-center px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
              {dailyQty} L/Kg
            </div>
            <button
              onClick={() => {
                playTapSound();
                setDailyQty((prev) => +(prev + 0.25).toFixed(2));
              }}
              className="w-8 h-8 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 flex items-center justify-center text-white shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Common Section 2: Milk Rate per Litre */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 tracking-wide flex items-center gap-1.5 uppercase">
            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
              रु
            </span>{' '}
            {t.milkRatePerLitre}
          </span>
          <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
            {formatCurrency(rate, currency, language)} / L
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAdjustRate(-5)}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-xs font-bold text-slate-700 border border-slate-200"
          >
            -5
          </button>
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
              रु
            </span>
            <input
              type="number"
              value={rateInput}
              onChange={(e) => {
                setRateInput(e.target.value);
                const p = parseFloat(e.target.value);
                if (!isNaN(p) && p > 0) setRate(p);
              }}
              className="w-full bg-slate-50 border border-emerald-500/70 focus:border-emerald-600 focus:bg-white rounded-2xl py-2 pl-9 pr-8 text-sm font-bold text-slate-900 outline-none text-center"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
              /L
            </span>
          </div>
          <button
            onClick={() => handleAdjustRate(+5)}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-xs font-bold text-slate-700 border border-slate-200"
          >
            +5
          </button>
          <button
            onClick={handleSetRate}
            className="h-10 px-3.5 bg-[#00C853] hover:bg-[#00B048] active:scale-95 text-white rounded-2xl text-xs font-bold flex items-center gap-1 shadow-sm"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{t.setRate}</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Calendar Log */}
      {subTab === 'calendar' && (
        <>
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-600" />
                <span>{t.nepaliDateRange}</span>
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <span>🌐</span> {t.bikramSambat}
              </span>
            </div>

            {/* Start Date Card */}
            <div
              onClick={() => {
                playTapSound();
                setDatePickerTarget((prev) => (prev === 'start' ? null : 'start'));
              }}
              className={`p-3.5 rounded-2xl border transition cursor-pointer active:scale-[0.99] select-none ${
                datePickerTarget === 'start'
                  ? 'bg-blue-50/90 border-blue-500 shadow-sm ring-2 ring-blue-400/40'
                  : 'bg-slate-50 hover:bg-blue-50/40 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5 font-bold text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" /> {t.startDate} (सुरु मिति)
                </span>
                <span className="text-[10px] text-blue-600 font-bold">
                  {datePickerTarget === 'start'
                    ? language === 'ne' ? '▲ बन्द गर्नुहोस्' : language === 'hi' ? '▲ बंद करें' : '▲ Close'
                    : language === 'ne' ? '▼ सुरु मिति छान्नुहोस्' : language === 'hi' ? '▼ शुरू तारीख चुनें' : '▼ Set Start Date'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-extrabold text-xs flex items-center justify-center border border-sky-200 shadow-2xs">
                    {toDevanagari(startDay)}
                  </span>
                  <div>
                    <p className="text-xs font-black text-slate-900">{startBsText}</p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      ({startMonthName} • वि.सं. {toDevanagari(startYear)})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playTapSound();
                      setStartDay((d) => Math.max(1, d - 1));
                    }}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700 active:scale-95 transition"
                    title="-1 दिन"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playTapSound();
                      const maxDays = getBSDaysInMonth(startYear, startMonth);
                      setStartDay((d) => Math.min(maxDays, d + 1));
                    }}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700 active:scale-95 transition"
                    title="+1 दिन"
                  >
                    +
                  </button>
                  <span className="px-2 py-1 text-xs font-bold text-blue-600 bg-white border border-blue-200 rounded-lg shadow-2xs ml-1">
                    {datePickerTarget === 'start'
                      ? language === 'ne' ? 'खुला छ' : language === 'hi' ? 'खुला है' : 'Open'
                      : t.change}
                  </span>
                </div>
              </div>
            </div>

            {/* End Date Card */}
            <div
              onClick={() => {
                playTapSound();
                setDatePickerTarget((prev) => (prev === 'end' ? null : 'end'));
              }}
              className={`p-3.5 rounded-2xl border transition cursor-pointer active:scale-[0.99] select-none ${
                datePickerTarget === 'end'
                  ? 'bg-blue-50/90 border-blue-500 shadow-sm ring-2 ring-blue-400/40'
                  : 'bg-slate-50 hover:bg-blue-50/40 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5 font-bold text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" /> {t.endDate} (अन्तिम मिति)
                </span>
                <span className="text-[10px] text-blue-600 font-bold">
                  {datePickerTarget === 'end'
                    ? language === 'ne' ? '▲ बन्द गर्नुहोस्' : language === 'hi' ? '▲ बंद करें' : '▲ Close'
                    : language === 'ne' ? '▼ अन्तिम मिति छान्नुहोस्' : language === 'hi' ? '▼ अंतिम तारीख चुनें' : '▼ Set End Date'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-extrabold text-xs flex items-center justify-center border border-sky-200 shadow-2xs">
                    {toDevanagari(endDay)}
                  </span>
                  <div>
                    <p className="text-xs font-black text-slate-900">{endBsText}</p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      ({endMonthName} • वि.सं. {toDevanagari(endYear)})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playTapSound();
                      setEndDay((d) => Math.max(1, d - 1));
                    }}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700 active:scale-95 transition"
                    title="-1 दिन"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playTapSound();
                      const maxDays = getBSDaysInMonth(endYear, endMonth);
                      setEndDay((d) => Math.min(maxDays, d + 1));
                    }}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700 active:scale-95 transition"
                    title="+1 दिन"
                  >
                    +
                  </button>
                  <span className="px-2 py-1 text-xs font-bold text-blue-600 bg-white border border-blue-200 rounded-lg shadow-2xs ml-1">
                    {datePickerTarget === 'end'
                      ? language === 'ne' ? 'खुला छ' : language === 'hi' ? 'खुला है' : 'Open'
                      : t.change}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Bikram Sambat Visual Date Picker Sheet (100% Separate for Start vs End Date!) */}
            {datePickerTarget && (
              <div className="p-4 bg-gradient-to-b from-blue-50/90 to-sky-50/70 rounded-3xl border border-blue-300 shadow-md space-y-3 text-xs animate-in fade-in slide-in-from-top-2">
                {/* Master Prompt Header: Big BS Year & Small AD Year */}
                <div className="flex items-center justify-between pb-2 border-b border-blue-200/70">
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-blue-900 leading-none">
                      {toDevanagari(targetYear)}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      <small>{targetYear - 57} / {targetYear - 56} AD</small>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-blue-800 block">
                      {datePickerTarget === 'start' ? `सुरु: ${startBsText}` : `अन्तिम: ${endBsText}`}
                    </span>
                    <span className="text-[10px] text-blue-600 font-bold">
                      {datePickerTarget === 'start' ? 'Start Date' : 'End Date'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-blue-950 text-xs flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>
                        {datePickerTarget === 'start'
                          ? language === 'ne'
                            ? 'सुरु मिति सेट गर्नुहोस् (Start Date)'
                            : language === 'hi'
                            ? 'शुरू तारीख सेट करें (Start Date)'
                            : 'Set Start Date (Separate)'
                          : language === 'ne'
                            ? 'अन्तिम मिति सेट गर्नुहोस् (End Date)'
                            : language === 'hi'
                            ? 'अंतिम तारीख सेट करें (End Date)'
                            : 'Set End Date (Separate)'}
                      </span>
                    </span>
                  </div>

                  {/* Independent Month & Year Selector Controls */}
                  <div className="flex items-center gap-1">
                    {/* Month Dropdown for Target */}
                    <select
                      value={targetMonth}
                      onChange={(e) => {
                        playTapSound();
                        const newM = parseInt(e.target.value);
                        if (datePickerTarget === 'start') {
                          setStartMonth(newM);
                          const max = getBSDaysInMonth(startYear, newM);
                          if (startDay > max) setStartDay(max);
                        } else {
                          setEndMonth(newM);
                          const max = getBSDaysInMonth(endYear, newM);
                          if (endDay > max) setEndDay(max);
                        }
                      }}
                      className="py-1.5 px-2 rounded-xl bg-white border border-blue-300 font-bold text-blue-900 shadow-xs outline-none text-xs"
                    >
                      {NEPALI_MONTHS.map((m) => (
                        <option key={m.bsMonth} value={m.bsMonth}>
                          {language === 'hi' ? m.nameHi : language === 'ne' ? m.nameNe : m.nameEn}
                        </option>
                      ))}
                    </select>

                    {/* Year Dropdown for Target (2060 to 2100) */}
                    <select
                      value={targetYear}
                      onChange={(e) => {
                        playTapSound();
                        const newY = parseInt(e.target.value);
                        if (datePickerTarget === 'start') {
                          setStartYear(newY);
                          const max = getBSDaysInMonth(newY, startMonth);
                          if (startDay > max) setStartDay(max);
                        } else {
                          setEndYear(newY);
                          const max = getBSDaysInMonth(newY, endMonth);
                          if (endDay > max) setEndDay(max);
                        }
                      }}
                      className="py-1.5 px-2 rounded-xl bg-white border border-blue-300 font-bold text-blue-900 shadow-xs outline-none text-xs"
                    >
                      {Array.from({ length: BS_MAX_YEAR - BS_MIN_YEAR + 1 }, (_, i) => BS_MIN_YEAR + i).map((y) => (
                        <option key={y} value={y}>
                          {toDevanagari(y)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Weekday Labels Header */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-blue-900/80 pt-1 border-t border-blue-200/50">
                  {WEEKDAYS.map((w, idx) => (
                    <div key={idx} className={w.isHoliday ? 'text-rose-600 font-black' : ''}>
                      {language === 'hi' ? w.shortHi : language === 'ne' ? w.shortNe : w.shortEn}
                    </div>
                  ))}
                </div>

                {/* Calendar Days Matrix with Weekday Alignment */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold">
                  {/* Leading spacer slots */}
                  {Array.from({ length: targetFirstDayOfWeek }).map((_, idx) => (
                    <div key={`spacer-${idx}`} className="h-10" />
                  ))}

                  {/* Actual Days: Top Large BS, Bottom Small AD */}
                  {Array.from({ length: targetDaysCount }).map((_, i) => {
                    const d = i + 1;
                    const isSelected = datePickerTarget === 'start' ? d === startDay : d === endDay;
                    const isSat = (targetFirstDayOfWeek + i) % 7 === 6;
                    const adDate = bsToAd(targetYear, targetMonth, d);

                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          playTapSound();
                          if (datePickerTarget === 'start') {
                            setStartDay(d);
                          } else {
                            setEndDay(d);
                          }
                        }}
                        className={`h-10 rounded-xl flex flex-col items-center justify-center p-0.5 transition active:scale-95 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300 font-black'
                            : isSat
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60'
                            : 'bg-white hover:bg-blue-100/60 text-slate-700 border border-slate-200/60'
                        }`}
                      >
                        {/* Top: Large BS Date */}
                        <span className={`text-xs font-black leading-tight ${isSelected ? 'text-white' : isSat ? 'text-rose-600' : 'text-slate-800'}`}>
                          {toDevanagari(d)}
                        </span>
                        {/* Bottom: Small AD Date */}
                        <span className={`text-[8px] font-mono leading-none ${isSelected ? 'text-blue-100' : isSat ? 'text-rose-400' : 'text-slate-400'}`}>
                          {adDate.getUTCDate()}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Target Specific Presets & Done Action */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-blue-200/80">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {datePickerTarget === 'start' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            playTapSound();
                            setStartDay(1);
                          }}
                          className="py-1 px-2.5 rounded-lg bg-white border border-blue-200 text-blue-800 text-[11px] font-bold hover:bg-blue-50"
                        >
                          १ गते (सुरु)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playTapSound();
                            setStartDay(15);
                          }}
                          className="py-1 px-2.5 rounded-lg bg-white border border-blue-200 text-blue-800 text-[11px] font-bold hover:bg-blue-50"
                        >
                          १५ गते
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playTapSound();
                            setStartDay(16);
                          }}
                          className="py-1 px-2.5 rounded-lg bg-white border border-blue-200 text-blue-800 text-[11px] font-bold hover:bg-blue-50"
                        >
                          १६ गते
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            playTapSound();
                            setEndDay(15);
                          }}
                          className="py-1 px-2.5 rounded-lg bg-white border border-blue-200 text-blue-800 text-[11px] font-bold hover:bg-blue-50"
                        >
                          १५ गते
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playTapSound();
                            setEndDay(targetDaysCount);
                          }}
                          className="py-1 px-2.5 rounded-lg bg-white border border-blue-200 text-blue-800 text-[11px] font-bold hover:bg-blue-50"
                        >
                          {toDevanagari(targetDaysCount)} गते (अन्त्य)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playTapSound();
                            setEndDay(21);
                          }}
                          className="py-1 px-2.5 rounded-lg bg-white border border-blue-200 text-blue-800 text-[11px] font-bold hover:bg-blue-50"
                        >
                          २१ गते
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setDatePickerTarget(null);
                    }}
                    className="py-1.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl font-bold text-xs shadow-sm transition"
                  >
                    ठीक छ (Done) ✓
                  </button>
                </div>
              </div>
            )}


            {/* Absent Days Stepper */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">{t.absentDays}</p>
                <p className="text-[10px] text-slate-500">{t.absentSub}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    playTapSound();
                    setAbsentDays((prev) => Math.max(0, prev - 1));
                  }}
                  className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-700"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="min-w-[50px] text-center px-2 py-1 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
                  {toDevanagari(absentDays)} {t.daysCount}
                </div>
                <button
                  onClick={() => {
                    playTapSound();
                    setAbsentDays((prev) => prev + 1);
                  }}
                  className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* Result Card: TOTAL BILL (Dark Navy Card from Screenshot 5) */}
          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl border border-blue-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    {calendarPaidDays > 0 ? '🔴 बाँकी बुझाउनुपर्ने रकम' : t.totalBill}
                  </span>
                  <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                    {formatDurationMonthDays(calendarRemainingDays, language).text} बाँकी
                  </span>
                </div>
                <div className="text-3xl font-black text-white flex items-baseline gap-1 mt-0.5">
                  <span className="text-amber-400 font-extrabold text-2xl">रु</span>
                  <span>{calendarRemainingBill.toLocaleString('en-IN')}</span>
                  {calendarPaidDays > 0 && (
                    <span className="text-xs font-bold text-slate-400 line-through ml-2">
                      रु {totalBillCalendar.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {t.totalMilk}
                </span>
                <div className="text-xl font-black text-sky-400">
                  {totalMilkCalendar} Liters
                </div>
              </div>
            </div>

            {/* 4 Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 font-medium">कुल अवधि</span>
                <p className="text-sm font-extrabold text-white mt-0.5">
                  {toDevanagari(effectiveDays)} दिन
                </p>
                <p className="text-[10px] text-blue-300 font-semibold truncate">
                  {totalDays !== effectiveDays ? `कुल ${toDevanagari(totalDays)} दिन − ${toDevanagari(absentDays)} अनुपस्थित` : 'सटीक दिन गन्ती'}
                </p>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 font-medium">तिरेको दिन</span>
                <p className="text-sm font-extrabold text-emerald-300 mt-0.5">
                  {toDevanagari(calendarPaidDays)} दिन
                </p>
                <p className="text-[10px] text-emerald-200 font-semibold truncate">
                  रु {calendarPaidAmount.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 font-medium">{t.absent}</span>
                <p className="text-sm font-extrabold text-white mt-0.5">
                  {toDevanagari(absentDays)} {t.daysCount}
                </p>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] text-slate-400 font-medium">बाँकी अवधि</span>
                <p className="text-sm font-extrabold text-rose-400 mt-0.5">
                  {toDevanagari(calendarRemainingDays)} दिन
                </p>
                <p className="text-[10px] text-rose-300 font-black truncate">
                  {calendarRemainingDays > 0 ? 'बकाया अवधि (सटीक दिन)' : 'चुक्ता ✓'}
                </p>
              </div>
            </div>

            {/* Duration strip */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
              <span className="text-slate-400">{t.duration}:</span>
              <span className="font-semibold text-white">
                {startBsText} {t.from} {endBsText}
              </span>
            </div>

            {/* Action Buttons: रसीद | WhatsApp | कपि | सुरक्षित */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button
                onClick={() => {
                  playTapSound();
                  setIsReceiptOpen(true);
                }}
                className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs transition"
              >
                <ReceiptIcon className="w-3.5 h-3.5" />
                <span>{t.receipt}</span>
              </button>
              <button
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-[#00C853] hover:bg-[#00B048] active:scale-95 text-white font-bold text-xs transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{t.whatsApp}</span>
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{t.copy}</span>
              </button>
              <button
                onClick={handleSaveToHistory}
                className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t.save}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Sub-Tab 2: Quick Calc (from Screenshot 4) */}
      {subTab === 'quick' && (
        <div className="space-y-4">
          {/* Card 1: Nepali BS Calendar Date Range Picker */}
          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-3">
            <div
              onClick={() => {
                playTapSound();
                setIsQuickCalOpen((prev) => !prev);
              }}
              className="flex items-center justify-between gap-2 cursor-pointer select-none active:scale-[0.99] transition"
            >
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>
                  {language === 'hi'
                    ? 'नेपाली BS कैलेंडर (BS Calendar)'
                    : language === 'en'
                    ? 'Nepali BS Calendar'
                    : 'नेपाली पात्रो (BS Calendar)'}
                </span>
              </h4>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-black bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {formatDurationMonthDays(quickDays, language).text} ({quickDays} Days)
                </span>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50/70 px-1.5 py-0.5 rounded-lg border border-blue-200">
                  {isQuickCalOpen ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {/* Start Date & End Date Selector Pills */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  if (isQuickCalOpen && quickCalPicking === 'start') {
                    setIsQuickCalOpen(false);
                  } else {
                    setQuickCalPicking('start');
                    setQuickCalViewYear(quickStartBs.year);
                    setQuickCalViewMonth(quickStartBs.month);
                    setIsQuickCalOpen(true);
                  }
                }}
                className={`p-2.5 rounded-2xl border text-left transition cursor-pointer active:scale-[0.98] ${
                  isQuickCalOpen && quickCalPicking === 'start'
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-300/60 shadow-xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-blue-50/40'
                }`}
              >
                <span className="text-[10px] font-bold text-blue-700 block">
                  {language === 'hi' ? 'शुरू तारीख (Start)' : language === 'en' ? 'Start Date (BS)' : 'सुरु मिति (Start BS)'}
                </span>
                <span className="text-xs font-black text-slate-900 block truncate mt-0.5">
                  {quickStartBsText}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  if (isQuickCalOpen && quickCalPicking === 'end') {
                    setIsQuickCalOpen(false);
                  } else {
                    setQuickCalPicking('end');
                    setQuickCalViewYear(quickEndBs.year);
                    setQuickCalViewMonth(quickEndBs.month);
                    setIsQuickCalOpen(true);
                  }
                }}
                className={`p-2.5 rounded-2xl border text-left transition cursor-pointer active:scale-[0.98] ${
                  isQuickCalOpen && quickCalPicking === 'end'
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-300/60 shadow-xs'
                    : 'bg-slate-50 border-slate-200 hover:bg-blue-50/40'
                }`}
              >
                <span className="text-[10px] font-bold text-blue-700 block">
                  {language === 'hi' ? 'अंतिम तारीख (End)' : language === 'en' ? 'End Date (BS)' : 'अन्तिम मिति (End BS)'}
                </span>
                <span className="text-xs font-black text-slate-900 block truncate mt-0.5">
                  {quickEndBsText}
                </span>
              </button>
            </div>

            {/* Inline BS Calendar Sheet (Click-to-open / Click-again-to-close) */}
            {isQuickCalOpen && (
            <div className="p-3 bg-gradient-to-b from-blue-50/80 to-sky-50/50 rounded-2xl border border-blue-200/80 space-y-2.5">
              {/* Header: Big BS Year / Small AD Year & Today button */}
              <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                <div>
                  <div className="text-2xl font-black text-blue-900 leading-none">
                    {toDevanagari(quickCalViewYear)}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                    {quickCalViewYear - 57} / {quickCalViewYear - 56} AD
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-blue-700 bg-white/80 px-2 py-1 rounded-lg border border-blue-200">
                    {quickCalPicking === 'start'
                      ? language === 'hi' ? 'शुरू तारीख चुनें' : 'सुरु मिति छान्नुहोस्'
                      : language === 'hi' ? 'अंतिम तारीख चुनें' : 'अन्तिम मिति छान्नुहोस्'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setQuickCalViewYear(todayBs.year);
                      setQuickCalViewMonth(todayBs.month);
                    }}
                    className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold active:scale-95 transition cursor-pointer"
                  >
                    आज
                  </button>
                </div>
              </div>

              {/* Month / Year Navigation Controls */}
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    if (quickCalViewMonth === 1) {
                      if (quickCalViewYear > BS_MIN_YEAR) {
                        setQuickCalViewYear((y) => y - 1);
                        setQuickCalViewMonth(12);
                      }
                    } else {
                      setQuickCalViewMonth((m) => m - 1);
                    }
                  }}
                  disabled={quickCalViewYear <= BS_MIN_YEAR && quickCalViewMonth <= 1}
                  className="p-1.5 rounded-xl bg-white border border-blue-200 text-blue-900 hover:bg-blue-100/60 disabled:opacity-30 active:scale-95 transition cursor-pointer"
                  title="अघिल्लो महिना"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5">
                  <select
                    value={quickCalViewMonth}
                    onChange={(e) => {
                      playTapSound();
                      setQuickCalViewMonth(parseInt(e.target.value));
                    }}
                    className="py-1 px-2 rounded-xl bg-white border border-blue-200 font-bold text-blue-900 text-xs outline-none cursor-pointer"
                  >
                    {NEPALI_MONTHS.map((m) => (
                      <option key={m.bsMonth} value={m.bsMonth}>
                        {language === 'hi' ? m.nameHi : language === 'ne' ? m.nameNe : m.nameEn}
                      </option>
                    ))}
                  </select>

                  <select
                    value={quickCalViewYear}
                    onChange={(e) => {
                      playTapSound();
                      setQuickCalViewYear(parseInt(e.target.value));
                    }}
                    className="py-1 px-2 rounded-xl bg-white border border-blue-200 font-bold text-blue-900 text-xs outline-none cursor-pointer"
                  >
                    {Array.from({ length: BS_MAX_YEAR - BS_MIN_YEAR + 1 }, (_, i) => BS_MIN_YEAR + i).map((y) => (
                      <option key={y} value={y}>
                        {toDevanagari(y)}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    if (quickCalViewMonth === 12) {
                      if (quickCalViewYear < BS_MAX_YEAR) {
                        setQuickCalViewYear((y) => y + 1);
                        setQuickCalViewMonth(1);
                      }
                    } else {
                      setQuickCalViewMonth((m) => m + 1);
                    }
                  }}
                  disabled={quickCalViewYear >= BS_MAX_YEAR && quickCalViewMonth >= 12}
                  className="p-1.5 rounded-xl bg-white border border-blue-200 text-blue-900 hover:bg-blue-100/60 disabled:opacity-30 active:scale-95 transition cursor-pointer"
                  title="अर्को महिना"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekdays Header */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-blue-900/80 pt-1">
                {WEEKDAYS.map((w, idx) => (
                  <div key={idx} className={w.isHoliday ? 'text-rose-600 font-black' : ''}>
                    {language === 'hi' ? w.shortHi : language === 'ne' ? w.shortNe : w.shortEn}
                  </div>
                ))}
              </div>

              {/* BS Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold">
                {Array.from({ length: quickCalFirstDayOfWeek }).map((_, idx) => (
                  <div key={`q-spacer-${idx}`} className="h-10" />
                ))}

                {Array.from({ length: quickCalDaysCount }).map((_, i) => {
                  const d = i + 1;
                  const adDate = bsToAd(quickCalViewYear, quickCalViewMonth, d);
                  const cellTime = adDate.getTime();
                  const isSat = (quickCalFirstDayOfWeek + i) % 7 === 6;
                  const isStart =
                    quickStartBs.year === quickCalViewYear &&
                    quickStartBs.month === quickCalViewMonth &&
                    quickStartBs.day === d;
                  const isEnd =
                    quickEndBs.year === quickCalViewYear &&
                    quickEndBs.month === quickCalViewMonth &&
                    quickEndBs.day === d;
                  const isInRange = cellTime > quickStartAdTime && cellTime < quickEndAdTime;
                  const isToday =
                    todayBs.year === quickCalViewYear &&
                    todayBs.month === quickCalViewMonth &&
                    todayBs.day === d;

                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleQuickCalendarDayClick(d)}
                      className={`h-10 rounded-xl flex flex-col items-center justify-center p-0.5 transition active:scale-95 cursor-pointer border ${
                        isStart || isEnd
                          ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-300 font-black'
                          : isInRange
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : isToday
                          ? 'bg-amber-50 text-amber-900 border-amber-400 ring-1 ring-amber-300'
                          : isSat
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200/60'
                          : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-200/70'
                      }`}
                    >
                      <span
                        className={`text-xs font-black leading-tight ${
                          isStart || isEnd
                            ? 'text-white'
                            : isSat
                            ? 'text-rose-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {toDevanagari(d)}
                      </span>
                      <span
                        className={`text-[8px] font-mono leading-none ${
                          isStart || isEnd
                            ? 'text-blue-100'
                            : isSat
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {adDate.getUTCDate()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            )}

            {/* Selected Range & Total Days Footer */}
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-xs">
              <span className="text-slate-600 font-semibold truncate pr-2">
                {quickStartBsText} — {quickEndBsText}
              </span>
              <span className="font-black text-blue-700 shrink-0">
                कुल: {toDevanagari(quickDays)} दिन
              </span>
            </div>
          </div>

          {/* Card 2: Interactive Payment Made / Paid Amount (कति पैसा दियो / तिरेको रकम) */}
          <div className="bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-white rounded-3xl p-4.5 shadow-sm border border-emerald-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-emerald-900 flex items-center gap-1.5 uppercase">
                  <span>💰</span>{' '}
                  {language === 'hi'
                    ? 'कितना पैसा दिया (Paid Amount)'
                    : language === 'en'
                    ? 'Paid Amount (Money Given)'
                    : 'कति पैसा दियो / तिरेको रकम (Paid Amount)'}
                </h4>
                <p className="text-[10px] text-emerald-700 font-medium">
                  {language === 'ne'
                    ? 'ग्राहकले कति रुपैयाँ पैसा दियो / बुझायो?'
                    : language === 'hi'
                    ? 'ग्राहक ने कितने रुपये दिए?'
                    : 'How much money (Rs) did customer pay?'}
                </p>
              </div>
              <span className="text-[11px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
                {quickPaidAmount > 0
                  ? `रु ${quickPaidAmount.toLocaleString('en-IN')}`
                  : 'रु ० (कुनै छैन)'}
              </span>
            </div>

            {/* Quick Paid Amount Preset Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
              {[
                { val: 0, label: 'रु ० (बाँकी)' },
                { val: 500, label: 'रु ५००' },
                { val: 1000, label: 'रु १,०००' },
                { val: 1500, label: 'रु १,५००' },
                { val: 2000, label: 'रु २,०००' },
                { val: 3000, label: 'रु ३,०००' },
                { val: quickTotalBill, label: `पूरा चुक्ता (रु ${quickTotalBill.toLocaleString('en-IN')})` },
              ].map((chip, idx) => {
                const isSelected = quickPaidAmount === chip.val;
                return (
                  <button
                    key={`${chip.val}-${idx}`}
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setQuickPaidAmount(chip.val);
                      setQuickPaidInput(String(chip.val));
                    }}
                    className={`py-1.5 px-2.5 rounded-xl text-center whitespace-nowrap transition cursor-pointer active:scale-95 text-[11px] ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs font-black ring-2 ring-emerald-300'
                        : 'bg-white text-emerald-900 hover:bg-emerald-100/70 border border-emerald-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Paid Amount Input & Stepper */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-100">
              <span className="text-xs text-emerald-900 font-bold">
                {language === 'hi' ? 'दिया गया पैसा (रु):' : language === 'en' ? 'Amount Paid:' : 'दिएको पैसा (रु):'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    const next = Math.max(0, quickPaidAmount - 100);
                    setQuickPaidAmount(next);
                    setQuickPaidInput(String(next));
                  }}
                  className="w-8 h-8 rounded-xl bg-white border border-emerald-200 hover:bg-emerald-100 active:scale-95 flex items-center justify-center text-emerald-800 font-black cursor-pointer shadow-xs"
                  title="-100"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-emerald-700 font-black pointer-events-none">
                    रु
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={quickPaidInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setQuickPaidInput(raw);
                      if (raw.trim() === '') {
                        setQuickPaidAmount(0);
                        return;
                      }
                      const parsed = parseFloat(raw);
                      if (!isNaN(parsed)) {
                        setQuickPaidAmount(Math.max(0, Math.round(parsed)));
                      }
                    }}
                    placeholder="0"
                    className="w-28 text-center py-1.5 pl-7 pr-2 bg-white border border-emerald-300 focus:border-emerald-600 rounded-xl text-xs font-black text-emerald-900 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    const next = quickPaidAmount + 100;
                    setQuickPaidAmount(next);
                    setQuickPaidInput(String(next));
                  }}
                  className="w-8 h-8 rounded-xl bg-white border border-emerald-200 hover:bg-emerald-100 active:scale-95 flex items-center justify-center text-emerald-800 font-black cursor-pointer shadow-xs"
                  title="+100"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Calc Result Card with Milk Bottle */}
          <div className="bg-gradient-to-br from-sky-50 via-white to-blue-50 rounded-3xl p-5 border border-sky-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black tracking-wider text-rose-700 uppercase bg-rose-100/80 px-2 py-0.5 rounded-md border border-rose-200">
                    {quickRemainingBill > 0 ? '🔴 बाँकी रकम (REMAINING DUE)' : '✅ चुक्ता (PAID)'}
                  </span>
                  {quickAdvanceAmount > 0 ? (
                    <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow-xs">
                      अग्रिम: रु {quickAdvanceAmount.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full shadow-xs">
                      {quickRemainingBill > 0
                        ? `${formatDurationMonthDays(quickRemainingDays, language).text} बराबर बाँकी`
                        : '० बाँकी'}
                    </span>
                  )}
                </div>

                <div className="text-3xl font-black text-slate-900 mt-1 flex items-baseline gap-1">
                  <span className="text-amber-500 font-extrabold text-2xl">रु</span>
                  <span>{quickRemainingBill.toLocaleString('en-IN')}</span>
                  {quickPaidAmount > 0 && (
                    <span className="text-xs font-bold text-slate-400 line-through ml-2">
                      रु {quickTotalBill.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  {quickPaidAmount > 0
                    ? `कुल रु ${quickTotalBill.toLocaleString('en-IN')} − दिएको रु ${quickPaidAmount.toLocaleString('en-IN')} (@ रु ${rate}/L)`
                    : `${dailyQty} L x ${quickDays} दिन = ${quickTotalMilk} L @ रु ${rate}/L`}
                </p>
              </div>

              <div className="w-14 h-16 rounded-2xl bg-sky-100 flex items-center justify-center text-3xl shadow-xs flex-shrink-0">
                🥛
              </div>
            </div>

            {/* 3 Mini breakdown cards: 1. कुल हिसाब | 2. दिएको पैसा | 3. बाँकी रकम */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              {/* Card 1: Total Period */}
              <div className="p-2.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                <span className="text-[10px] text-slate-500 font-bold block truncate">
                  १. कुल हिसाब
                </span>
                <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                  रु {quickTotalBill.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-blue-700 font-black truncate">
                  {toDevanagari(quickDays)} दिन ({quickTotalMilk} L)
                </p>
                <p className="text-[10px] text-slate-600 font-bold mt-1 pt-1 border-t border-slate-100 truncate">
                  {toDevanagari(quickDays)} दिन अवधि
                </p>
              </div>

              {/* Card 2: Paid Amount */}
              <div className="p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 shadow-xs flex flex-col justify-between">
                <span className="text-[10px] text-emerald-800 font-bold block truncate">
                  २. दिएको पैसा
                </span>
                <p className="font-extrabold text-emerald-700 text-sm mt-0.5">
                  रु {quickPaidAmount.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-emerald-600 font-black truncate">
                  {quickPaidAmount > 0 && dailyMilkBill > 0
                    ? `${toDevanagari(quickPaidDays)} दिन बराबर`
                    : '० रु तिरेको'}
                </p>
                <p className="text-[10px] text-emerald-800 font-bold mt-1 pt-1 border-t border-emerald-100 truncate">
                  {quickPaidAmount > 0 ? 'भुक्तानी भयो' : 'कुनै छैन'}
                </p>
              </div>

              {/* Card 3: Remaining Due */}
              <div className="p-2.5 rounded-2xl bg-rose-50/90 border-2 border-rose-400 shadow-xs ring-2 ring-rose-200/50 flex flex-col justify-between">
                <span className="text-[10px] text-rose-800 font-black block truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                  ३. बाँकी रकम
                </span>
                <p className="font-black text-rose-700 text-sm mt-0.5">
                  रु {quickRemainingBill.toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-rose-700 font-black truncate">
                  {quickRemainingBill > 0 ? `${quickRemainingMilk} L बराबर` : 'चुक्ता भयो ✓'}
                </p>
                <p className="text-[10px] text-rose-900 font-black mt-1 pt-1 border-t border-rose-200 truncate">
                  {quickAdvanceAmount > 0
                    ? `अग्रिम: रु ${quickAdvanceAmount.toLocaleString('en-IN')}`
                    : quickRemainingBill > 0
                    ? `${toDevanagari(quickRemainingDays)} दिन बाँकी`
                    : 'रु ० बाँकी'}
                </p>
              </div>
            </div>

            {/* Quick Reference Strip */}
            <div className="p-2 bg-white/70 rounded-xl border border-sky-100 flex items-center justify-between text-[11px] text-slate-600">
              <span>
                <strong>१ दिन:</strong> रु {Math.round(dailyQty * rate)}
              </span>
              <span>
                <strong>७ दिन:</strong> रु {Math.round(7 * dailyQty * rate)}
              </span>
              <span>
                <strong>३० दिन:</strong> रु {Math.round(30 * dailyQty * rate)}
              </span>
            </div>

            {/* Action Buttons: रसीद | WhatsApp | कपि | सुरक्षित */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button
                onClick={() => {
                  playTapSound();
                  setIsReceiptOpen(true);
                }}
                className="py-2.5 px-1 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <ReceiptIcon className="w-3.5 h-3.5" />
                <span>{t.receipt}</span>
              </button>
              <button
                onClick={handleWhatsAppShare}
                className="py-2.5 px-1 rounded-xl bg-[#00C853] hover:bg-[#00B048] active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={handleCopy}
                className="py-2.5 px-1 rounded-xl bg-white hover:bg-slate-100 active:scale-95 text-slate-800 font-bold text-xs border border-slate-300 flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{t.copy}</span>
              </button>
              <button
                onClick={handleSaveToHistory}
                className="py-2.5 px-1 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t.save}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Daily Diary (from Screenshot 3) */}
      {subTab === 'diary' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-4">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span>📖</span> दैनिक दूध टिपोट डायरी
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">बिहान र बेलुकाको दूध छुट्टाएर टिप्नुहोस्</p>
            </div>

            <div className="space-y-3">
              <div>
                <NepaliBSDatePicker
                  label="नेपाली मिति (Date - वि.सं.):"
                  value={diaryDate}
                  onChange={(iso) => setDiaryDate(iso)}
                  language={language}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">बिहान (Ltr):</label>
                  <input
                    type="number"
                    step="0.25"
                    value={morningLtr}
                    onChange={(e) => setMorningLtr(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">बेलुका (Ltr):</label>
                  <input
                    type="number"
                    step="0.25"
                    value={eveningLtr}
                    onChange={(e) => setEveningLtr(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveDiaryEntry}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition"
              >
                <Save className="w-4 h-4" />
                <span>💾 डायरीमा सुरक्षित गर्नुहोस्</span>
              </button>
            </div>
          </div>

          {/* Past Diary Records List */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
            <h5 className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>रेकर्ड गरिएका दिनहरू ({diaryRecords.length})</span>
              <span className="text-[11px] text-blue-600">दर: रु {rate}/L</span>
            </h5>

            {diaryRecords.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">कुनै डायरी रेकर्ड छैन।</p>
            ) : (
              <div className="space-y-2">
                {diaryRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{rec.date}</p>
                      <p className="text-[11px] text-slate-500">
                        बिहान: {rec.morningLtr}L | बेलुका: {rec.eveningLtr}L = {rec.totalLtr}L
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-blue-700">रु {rec.totalPrice}</span>
                      <button
                        onClick={() => handleDeleteDiary(rec.id)}
                        className="p-1 text-slate-400 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable / Shareable Universal Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        moduleType="milk"
        title="दुध हिसाब बिल (Milk Ledger)"
        totalAmountText={formatCurrency(
          subTab === 'calendar' ? calendarRemainingBill : quickRemainingBill,
          currency,
          language
        )}
        items={[
          {
            label: 'दुध परिमाण (Milk Quantity)',
            value: `${subTab === 'calendar' ? totalMilkCalendar : quickTotalMilk} Liters`,
            quantity: subTab === 'calendar' ? totalMilkCalendar : quickTotalMilk,
            unit: 'Liters',
            rate: rate,
            subtotal: subTab === 'calendar' ? totalBillCalendar : quickTotalBill,
          },
          {
            label: 'कुल हिसाब अवधि (Total Duration)',
            value: formatDurationMonthDays(subTab === 'calendar' ? effectiveDays : quickDays, language).text,
            subtotal: 0,
          },
          ...((subTab === 'calendar' ? calendarPaidAmount : quickPaidAmount) > 0
            ? [
                {
                  label: 'तिरेको/बुझाएको (Paid Amount)',
                  value: formatCurrency(
                    subTab === 'calendar' ? calendarPaidAmount : quickPaidAmount,
                    currency,
                    language
                  ),
                  subtotal: -(subTab === 'calendar' ? calendarPaidAmount : quickPaidAmount),
                },
                {
                  label: '🔴 बाँकी रकम (Remaining Due)',
                  value: `${formatDurationMonthDays(subTab === 'calendar' ? calendarRemainingDays : quickRemainingDays, language).text} बराबर बाँकी`,
                  subtotal: subTab === 'calendar' ? calendarRemainingBill : quickRemainingBill,
                },
              ]
            : [
                {
                  label: 'बाँकी अवधि (Due Duration)',
                  value: `${formatDurationMonthDays(subTab === 'calendar' ? effectiveDays : quickDays, language).text} को पैसा बाँकी`,
                  subtotal: subTab === 'calendar' ? totalBillCalendar : quickTotalBill,
                },
              ]),
          {
            label: 'दैनिक दूध (Daily Supply)',
            value: `${dailyQty} L/दिन @ रु ${rate}/L`,
            subtotal: 0,
          },
        ]}
        note="GHAULE CALCULATOR 100% Offline Milk Ledger"
        language={language}
      />
    </div>
  );
};
