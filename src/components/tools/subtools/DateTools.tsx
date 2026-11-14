import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Sparkles,
  ArrowRightLeft,
  Clock,
  Heart,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Copy,
  Save,
  Check,
  CalendarDays,
  Flame,
  Info,
} from 'lucide-react';
import { Language, Currency, CalculatorMeta } from '../../../types';
import { translations } from '../../../data/translations';
import { NepaliPatroView } from '../../panchang/NepaliPatroView';
import { NepaliBSDatePicker } from '../../common/NepaliBSDatePicker';
import {
  convertBSToAD,
  convertADToBS,
  BS_MIN_YEAR,
  BS_MAX_YEAR,
} from '../../../utils/panchangEngine';
import {
  toDevanagari,
  NEPALI_MONTHS,
  WEEKDAYS,
  bsToAd,
  adToBs,
  formatDateToBS,
  getTodayBS,
  getBSDaysInMonth,
  getBSMonthFirstDayOfWeek,
  formatBSDateFull,
  formatBSDate,
  getTithiInfo,
  getFestivalForDay,
  BS_FESTIVALS,
  FestivalItem,
} from '../../../utils/nepaliCalendar';
import { playSuccessSound, playTapSound } from '../../../utils/audio';
import { saveCalculationToHistory } from '../../../utils/storage';
import { getToolName, getToolDesc } from '../../../data/calculatorList';

interface DateToolsProps {
  tool: CalculatorMeta;
  language: Language;
  currency: Currency;
  showToast: (msg: string) => void;
  onBack?: () => void;
}

export const DateTools: React.FC<DateToolsProps> = ({
  tool,
  language,
  currency,
  showToast,
  onBack,
}) => {
  // If the user opened Bikram Sambat Patro, render the full professional Nepali Calendar & Sanskrit Panchang System
  if (tool.id === 'nepali-patro') {
    return (
      <NepaliPatroView
        language={language}
        currency={currency}
        showToast={showToast}
        onBack={onBack}
      />
    );
  }

  const t = translations[language];
  const todayBs = useMemo(() => getTodayBS(), []);

  // --- 1. Bikram Sambat Patro State ---
  const [patroYear, setPatroYear] = useState<number>(todayBs.year);
  const [patroMonth, setPatroMonth] = useState<number>(todayBs.month); // 1-12
  const [selectedDay, setSelectedDay] = useState<number>(todayBs.day);
  const [copiedDate, setCopiedDate] = useState<boolean>(false);

  // --- 2. Date Converter State ---
  const [convMode, setConvMode] = useState<'bsToAd' | 'adToBs'>('bsToAd');
  const [bsYearInput, setBsYearInput] = useState<number>(todayBs.year);
  const [bsMonthInput, setBsMonthInput] = useState<number>(todayBs.month);
  const [bsDayInput, setBsDayInput] = useState<number>(todayBs.day);
  const [adDateInput, setAdDateInput] = useState<string>(
    new Date().toISOString().split('T')[0] || '2026-11-07'
  );

  // Auto-clamp BS day input if selected day exceeds target month length
  useEffect(() => {
    const maxDays = getBSDaysInMonth(bsYearInput, bsMonthInput);
    if (bsDayInput > maxDays) {
      setBsDayInput(maxDays);
    }
  }, [bsYearInput, bsMonthInput, bsDayInput]);

  // --- 3. Age Calculator State ---
  const [birthYear, setBirthYear] = useState<number>(2055);
  const [birthMonth, setBirthMonth] = useState<number>(3);
  const [birthDay, setBirthDay] = useState<number>(15);

  // --- 4. Date Diff State ---
  const [diffDate1, setDiffDate1] = useState<string>('2026-01-01');
  const [diffDate2, setDiffDate2] = useState<string>(
    new Date().toISOString().split('T')[0] || '2026-11-07'
  );

  // --- Patro Calculations ---
  const daysInPatroMonth = useMemo(() => {
    return getBSDaysInMonth(patroYear, patroMonth);
  }, [patroYear, patroMonth]);

  const monthFirstDayOfWeek = useMemo(() => {
    return getBSMonthFirstDayOfWeek(patroYear, patroMonth);
  }, [patroYear, patroMonth]);

  const currentMonthObj = NEPALI_MONTHS[patroMonth - 1] || NEPALI_MONTHS[0];
  const currentMonthName =
    language === 'hi'
      ? currentMonthObj.nameHi
      : language === 'ne'
      ? currentMonthObj.nameNe
      : currentMonthObj.nameEn;

  // Selected Day Details
  const selectedDayAd = useMemo(() => {
    return bsToAd(patroYear, patroMonth, selectedDay);
  }, [patroYear, patroMonth, selectedDay]);

  const selectedDayWeekday = WEEKDAYS[selectedDayAd.getUTCDay()] || WEEKDAYS[0];
  const selectedDayFestival = useMemo(() => {
    return getFestivalForDay(patroMonth, selectedDay);
  }, [patroMonth, selectedDay]);

  const selectedDayTithi = useMemo(() => {
    return getTithiInfo(patroYear, patroMonth, selectedDay);
  }, [patroYear, patroMonth, selectedDay]);

  // Handle Month Navigation
  const handlePrevMonth = () => {
    playTapSound();
    if (patroMonth === 1) {
      setPatroYear((y) => Math.max(BS_MIN_YEAR, y - 1));
      setPatroMonth(12);
    } else {
      setPatroMonth((m) => m - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    playTapSound();
    if (patroMonth === 12) {
      setPatroYear((y) => Math.min(BS_MAX_YEAR, y + 1));
      setPatroMonth(1);
    } else {
      setPatroMonth((m) => m + 1);
    }
    setSelectedDay(1);
  };

  const handleJumpToToday = () => {
    playTapSound();
    setPatroYear(todayBs.year);
    setPatroMonth(todayBs.month);
    setSelectedDay(todayBs.day);
    showToast(
      language === 'ne'
        ? `आज: ${formatBSDate(todayBs, language)}`
        : language === 'hi'
        ? `आज: ${formatBSDate(todayBs, language)}`
        : `Today: ${todayBs.year}/${todayBs.month}/${todayBs.day}`
    );
  };

  const handleCopySelectedDate = () => {
    playTapSound();
    const adStr = selectedDayAd.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const weekdayName =
      language === 'hi'
        ? selectedDayWeekday.fullHi
        : language === 'ne'
        ? selectedDayWeekday.fullNe
        : selectedDayWeekday.fullEn;
    const text =
      `*📅 GHAULE BIKRAM SAMBAT CALENDAR*\n` +
      `वि.सं. ${toDevanagari(patroYear)} ${currentMonthName} ${toDevanagari(selectedDay)} गते, ${weekdayName}\n` +
      `AD: ${adStr} (${selectedDayWeekday.fullEn})\n` +
      `तिथि: ${selectedDayTithi.tithiNe} (${selectedDayTithi.pakshaNe})\n` +
      (selectedDayFestival ? `चाडपर्व: ${selectedDayFestival.nameNe}\n` : '') +
      `Calculated with Ghaule Calculator Hub (100% Offline)`;

    navigator.clipboard.writeText(text);
    setCopiedDate(true);
    setTimeout(() => setCopiedDate(false), 2000);
    showToast(t.copiedToast);
  };

  // Convert BS to AD Output (BS 2000 to 2100)
  const bsToAdResult = useMemo(() => {
    try {
      const ad = convertBSToAD(bsYearInput, bsMonthInput, bsDayInput);
      const dayOfWeek = ad.getUTCDay();
      const wd = WEEKDAYS[dayOfWeek] || WEEKDAYS[0];
      const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        formatted: `${ad.getUTCDate()} ${mNames[ad.getUTCMonth()]} ${ad.getUTCFullYear()}`,
        dayName: language === 'hi' ? wd.fullHi : language === 'ne' ? wd.fullNe : wd.fullEn,
        dateObj: ad,
      };
    } catch {
      return { formatted: 'Invalid Date', dayName: '', dateObj: new Date() };
    }
  }, [bsYearInput, bsMonthInput, bsDayInput, language]);

  // Convert AD to BS Output (BS 2000 to 2100)
  const adToBsResult = useMemo(() => {
    try {
      const parts = adDateInput.split('-').map(Number);
      const d = new Date(Date.UTC(parts[0], (parts[1] || 1) - 1, parts[2] || 1));
      const bs = convertADToBS(d);
      const mObj = NEPALI_MONTHS[bs.month - 1] || NEPALI_MONTHS[0];
      const mName = language === 'hi' ? mObj.nameHi : language === 'ne' ? mObj.nameNe : mObj.nameEn;
      const wd = WEEKDAYS[bs.dayOfWeek] || WEEKDAYS[0];
      const wdName = language === 'hi' ? wd.fullHi : language === 'ne' ? wd.fullNe : wd.fullEn;
      const tithi = getTithiInfo(bs.year, bs.month, bs.day);
      const fest = getFestivalForDay(bs.month, bs.day);
      return {
        formatted: `वि.सं. ${toDevanagari(bs.year)} ${mName} ${toDevanagari(bs.day)} गते`,
        dayName: wdName,
        tithi: `${tithi.tithiNe} (${tithi.pakshaNe})`,
        festival: fest?.nameNe,
        bs,
      };
    } catch {
      return {
        formatted: 'Invalid Date',
        dayName: '',
        tithi: '',
        festival: null,
        bs: { year: 2083, month: 7, day: 22, dayOfWeek: 6 },
      };
    }
  }, [adDateInput, language]);

  // Age Calculation with exact BS month day bounds and AD time difference
  const ageResult = useMemo(() => {
    let y = todayBs.year - birthYear;
    let m = todayBs.month - birthMonth;
    let d = todayBs.day - birthDay;

    if (d < 0) {
      m -= 1;
      const prevM = todayBs.month === 1 ? 12 : todayBs.month - 1;
      const prevY = todayBs.month === 1 ? todayBs.year - 1 : todayBs.year;
      const daysInPrevM = getBSDaysInMonth(prevY, prevM);
      d += daysInPrevM;
    }
    if (m < 0) {
      y -= 1;
      m += 12;
    }
    const birthAd = bsToAd(birthYear, birthMonth, birthDay);
    const todayAd = bsToAd(todayBs.year, todayBs.month, todayBs.day);
    const diffTime = todayAd.getTime() - birthAd.getTime();
    const totalDays = Math.max(0, Math.floor(diffTime / 86400000));
    const daysToBirthday = Math.max(0, (12 - m) * 30 - d);
    return { years: Math.max(0, y), months: Math.max(0, m), days: Math.max(0, d), totalDays, daysToBirthday };
  }, [birthYear, birthMonth, birthDay, todayBs]);

  // Date Diff Calculation
  const dateDiffResult = useMemo(() => {
    try {
      const d1 = new Date(diffDate1);
      const d2 = new Date(diffDate2);
      const diffMs = Math.abs(d2.getTime() - d1.getTime());
      const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const weeks = Math.floor(totalDays / 7);
      const remainingDays = totalDays % 7;
      const months = +(totalDays / 30.417).toFixed(1);
      return { totalDays, weeks, remainingDays, months };
    } catch {
      return { totalDays: 0, weeks: 0, remainingDays: 0, months: 0 };
    }
  }, [diffDate1, diffDate2]);

  const handleSaveCurrent = (title: string, summary: string, amount: number) => {
    playSuccessSound();
    saveCalculationToHistory({
      toolId: tool.id,
      toolName: getToolName(tool, language),
      date: new Date().toLocaleDateString('en-GB'),
      title,
      summary,
      amount,
      currency,
      details: {
        Tool: getToolName(tool, language),
        Date: new Date().toLocaleDateString('en-GB'),
      },
    });
    showToast(t.savedToast);
  };

  return (
    <div className="space-y-4 pb-24 select-none">
      {/* Tool Header Card */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 text-white shadow-md flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-extrabold text-white">
              {getToolName(tool, language)}
            </h4>
            <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              वि.सं. पात्रो (BS)
            </span>
          </div>
          <p className="text-xs text-rose-100 mt-0.5">
            {getToolDesc(tool, language)}
          </p>
        </div>
      </div>

      {/* =============================================================== */}
      {/* 1. NEPALI PATRO (वि.सं. क्यालेन्डर) - PRIMARY USER REQUEST */}
      {/* =============================================================== */}
      {tool.id === 'nepali-patro' && (
        <div className="space-y-4">
          {/* Calendar Header with Year & Month Controls */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3.5">
            {/* Master Prompt Header: Big BS Year, Small AD Year, Clear Month */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-rose-600 leading-none">
                  {toDevanagari(patroYear)}
                </div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">
                  <small>{patroYear - 57} / {patroYear - 56} AD</small>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-slate-800 block">
                  {currentMonthName}
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  वि.सं. {toDevanagari(patroYear)}
                </span>
              </div>
            </div>

            {/* Top Bar: Prev/Next & Jump to Today */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 transition"
                  title="अघिल्लो महिना"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 transition"
                  title="पछिल्लो महिना"
                >
                  <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Month & Year Title Dropdowns */}
              <div className="flex items-center gap-1.5 flex-1 justify-center">
                {/* Month Selector */}
                <select
                  value={patroMonth}
                  onChange={(e) => {
                    playTapSound();
                    setPatroMonth(parseInt(e.target.value));
                    setSelectedDay(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs font-black text-slate-900 outline-none focus:border-rose-500 shadow-xs"
                >
                  {NEPALI_MONTHS.map((m) => (
                    <option key={m.bsMonth} value={m.bsMonth}>
                      {language === 'hi' ? m.nameHi : language === 'ne' ? m.nameNe : m.nameEn}
                    </option>
                  ))}
                </select>

                {/* Year Selector (2000 to 2100 BS) */}
                <select
                  value={patroYear}
                  onChange={(e) => {
                    playTapSound();
                    setPatroYear(parseInt(e.target.value));
                    setSelectedDay(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2 text-xs font-black text-slate-900 outline-none focus:border-rose-500 shadow-xs"
                >
                  {Array.from({ length: BS_MAX_YEAR - BS_MIN_YEAR + 1 }, (_, i) => BS_MIN_YEAR + i).map((y) => (
                    <option key={y} value={y}>
                      {toDevanagari(y)} BS
                    </option>
                  ))}
                </select>
              </div>

              {/* Jump to Today button */}
              <button
                onClick={handleJumpToToday}
                className="py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs border border-rose-200 active:scale-95 transition flex items-center gap-1"
              >
                <span>आज</span>
              </button>
            </div>

            {/* Weekdays Bar (Sun to Sat) */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-extrabold pt-1">
              {WEEKDAYS.map((w, idx) => (
                <div
                  key={idx}
                  className={`py-1 rounded-lg ${
                    w.isHoliday ? 'text-rose-600 bg-rose-50/50' : 'text-slate-600'
                  }`}
                >
                  {language === 'hi' ? w.shortHi : language === 'ne' ? w.shortNe : w.shortEn}
                </div>
              ))}
            </div>

            {/* Calendar Days Matrix (with correct weekday offsets!) */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs pt-1">
              {/* Empty leading spacer slots */}
              {Array.from({ length: monthFirstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-12 rounded-2xl bg-transparent" />
              ))}

              {/* Month Day Cells */}
              {Array.from({ length: daysInPatroMonth }).map((_, i) => {
                const dayNum = i + 1;
                const adDate = bsToAd(patroYear, patroMonth, dayNum);
                const isSaturday = (monthFirstDayOfWeek + i) % 7 === 6;
                const isToday =
                  patroYear === todayBs.year &&
                  patroMonth === todayBs.month &&
                  dayNum === todayBs.day;
                const isSelected = dayNum === selectedDay;
                const fest = getFestivalForDay(patroMonth, dayNum);

                return (
                  <button
                    key={dayNum}
                    onClick={() => {
                      playTapSound();
                      setSelectedDay(dayNum);
                    }}
                    className={`h-12 rounded-2xl p-1 flex flex-col items-center justify-between relative transition active:scale-90 border ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/30'
                        : isToday
                        ? 'bg-blue-50/80 text-blue-900 border-blue-400 font-black shadow-xs ring-2 ring-blue-400/50'
                        : isSaturday
                        ? 'bg-rose-50/60 hover:bg-rose-100/70 text-rose-700 border-rose-100 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/70 font-semibold'
                    }`}
                  >
                    {/* Top: Day Number in Devanagari */}
                    <span
                      className={`text-xs leading-none font-bold ${
                        isSelected
                          ? 'text-white'
                          : isToday
                          ? 'text-blue-900 font-black'
                          : isSaturday
                          ? 'text-rose-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {toDevanagari(dayNum)}
                    </span>

                    {/* Bottom: Gregorian Day in small text */}
                    <span
                      className={`text-[9px] leading-none ${
                        isSelected
                          ? 'text-rose-100'
                          : isToday
                          ? 'text-blue-600'
                          : isSaturday
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {adDate.getDate()}
                    </span>

                    {/* Festival / Holiday Badge Marker */}
                    {fest && (
                      <span
                        className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-amber-300' : 'bg-rose-600 ring-1 ring-white'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Detail Card */}
          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3 border border-slate-800 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {language === 'ne'
                      ? 'छानिएको मिति विवरण'
                      : language === 'hi'
                      ? 'चयनित तारीख विवरण'
                      : 'Selected Date Details'}
                  </span>
                </span>
                <h3 className="text-base font-extrabold text-white mt-0.5">
                  वि.सं. {toDevanagari(patroYear)} {currentMonthName}{' '}
                  {toDevanagari(selectedDay)} गते,{' '}
                  {language === 'hi'
                    ? selectedDayWeekday.fullHi
                    : language === 'ne'
                    ? selectedDayWeekday.fullNe
                    : selectedDayWeekday.fullEn}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  AD:{' '}
                  {selectedDayAd.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}{' '}
                  ({selectedDayWeekday.fullEn})
                </p>
              </div>

              <button
                onClick={handleCopySelectedDate}
                className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition flex items-center gap-1 text-xs font-bold"
                title="कापी गर्नुहोस्"
              >
                {copiedDate ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-300" />
                )}
                <span>{copiedDate ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Panchang & Tithi Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-0.5">
                <span className="text-slate-400 text-[10px] flex items-center gap-1 font-semibold">
                  <Moon className="w-3 h-3 text-cyan-400" />
                  <span>पञ्चाङ्ग तिथि (Tithi)</span>
                </span>
                <p className="font-extrabold text-cyan-300 text-xs">
                  {selectedDayTithi.tithiNe}
                </p>
                <p className="text-[10px] text-slate-400">
                  {selectedDayTithi.pakshaNe}
                </p>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-0.5">
                <span className="text-slate-400 text-[10px] flex items-center gap-1 font-semibold">
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span>सूर्योदय / सूर्यास्त</span>
                </span>
                <p className="font-extrabold text-amber-300 text-xs">
                  ०६:१९ AM • ०५:१४ PM
                </p>
                <p className="text-[10px] text-slate-400">दिनमान: २७ घडी २८ पला</p>
              </div>
            </div>

            {/* If Festival on this day */}
            {selectedDayFestival && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-2xl flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/30 flex items-center justify-center text-rose-300">
                  <Flame className="w-4 h-4 fill-current" />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-rose-200 text-xs truncate">
                    {language === 'hi'
                      ? selectedDayFestival.nameHi
                      : selectedDayFestival.nameNe}
                  </p>
                  <p className="text-[10px] text-rose-300">
                    {selectedDayFestival.isHoliday
                      ? 'सार्वजनिक बिदा (Public Holiday)'
                      : 'चाडपर्व उत्सव (Festival)'}
                  </p>
                </div>
              </div>
            )}

            {/* Save to History Button */}
            <button
              onClick={() =>
                handleSaveCurrent(
                  `Bikram Sambat Patro`,
                  `वि.सं. ${patroYear} ${currentMonthName} ${selectedDay} | ${selectedDayTithi.tithiNe}`,
                  selectedDay
                )
              }
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30"
            >
              <Save className="w-4 h-4" />
              <span>
                {language === 'ne'
                  ? 'यो मिति सुरक्षित गर्नुहोस्'
                  : language === 'hi'
                  ? 'यह तारीख सुरक्षित करें'
                  : 'Save this BS Date'}
              </span>
            </button>
          </div>

          {/* List of Month Festivals / Holidays */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-rose-600" />
              <span>
                {currentMonthName} महिनाका मुख्य चाडपर्वहरू (
                {(BS_FESTIVALS[patroMonth] || []).length}):
              </span>
            </span>

            {(BS_FESTIVALS[patroMonth] || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                यस महिना कुनै विशेष सार्वजनिक बिदा छैन।
              </p>
            ) : (
              <div className="space-y-1.5">
                {(BS_FESTIVALS[patroMonth] || []).map((fest) => {
                  const isCurSel = fest.day === selectedDay;
                  return (
                    <div
                      key={fest.nameNe}
                      onClick={() => {
                        playTapSound();
                        setSelectedDay(fest.day);
                      }}
                      className={`flex justify-between items-center p-2.5 rounded-2xl border text-xs cursor-pointer transition ${
                        isCurSel
                          ? 'bg-rose-50 border-rose-300 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 font-extrabold text-[11px] flex items-center justify-center">
                          {toDevanagari(fest.day)}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">
                            {language === 'hi' ? fest.nameHi : fest.nameNe}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {fest.isHoliday ? 'सार्वजनिक बिदा' : 'पर्व'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-rose-600">
                        {toDevanagari(fest.day)} गते ›
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* 2. DATE CONVERTER (BS ⇄ AD) */}
      {/* =============================================================== */}
      {tool.id === 'date-conv' && (
        <div className="space-y-4">
          {/* Conversion Switcher */}
          <div className="flex bg-slate-200/80 p-1 rounded-2xl text-xs font-bold gap-1">
            <button
              onClick={() => {
                playTapSound();
                setConvMode('bsToAd');
              }}
              className={`flex-1 py-2.5 rounded-xl transition ${
                convMode === 'bsToAd'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-700'
              }`}
            >
              वि.सं. (BS) → ई.सं. (AD)
            </button>
            <button
              onClick={() => {
                playTapSound();
                setConvMode('adToBs');
              }}
              className={`flex-1 py-2.5 rounded-xl transition ${
                convMode === 'adToBs'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-700'
              }`}
            >
              ई.सं. (AD) → वि.सं. (BS)
            </button>
          </div>

          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-3">
            {convMode === 'bsToAd' ? (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  नेपाली मिति छान्नुहोस् (Bikram Sambat BS):
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">
                      वर्ष (Year)
                    </label>
                    <select
                      value={bsYearInput}
                      onChange={(e) => setBsYearInput(parseInt(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-1 text-center text-xs font-bold outline-none"
                    >
                      {Array.from({ length: BS_MAX_YEAR - BS_MIN_YEAR + 1 }, (_, i) => BS_MIN_YEAR + i).map((y) => (
                        <option key={y} value={y}>
                          {y} ({toDevanagari(y)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">
                      महिना (Month)
                    </label>
                    <select
                      value={bsMonthInput}
                      onChange={(e) => setBsMonthInput(parseInt(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-1 text-xs font-bold outline-none"
                    >
                      {NEPALI_MONTHS.map((m) => (
                        <option key={m.bsMonth} value={m.bsMonth}>
                          {m.nameNe} ({m.bsMonth})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">
                      गते (Day 1-{getBSDaysInMonth(bsYearInput, bsMonthInput)})
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={getBSDaysInMonth(bsYearInput, bsMonthInput)}
                      value={bsDayInput}
                      onChange={(e) => {
                        const maxD = getBSDaysInMonth(bsYearInput, bsMonthInput);
                        setBsDayInput(
                          Math.max(1, Math.min(maxD, parseInt(e.target.value) || 1))
                        );
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 text-center text-xs font-bold outline-none"
                    />
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-medium text-center pt-1">
                  प्रमाणित दायरा: वि.सं. २०६० देखि २०९० सम्म (100% Offline Certified)
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  अंग्रेजी मिति छान्नुहोस् (Gregorian AD Date):
                </label>
                <input
                  type="date"
                  value={adDateInput}
                  min="2003-04-14"
                  max="2034-04-13"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val < '2003-04-14') {
                      setAdDateInput('2003-04-14');
                    } else if (val > '2034-04-13') {
                      setAdDateInput('2034-04-13');
                    } else {
                      setAdDateInput(val);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2.5 px-3 text-xs font-bold outline-none"
                />
                <div className="text-[10px] text-slate-500 font-medium flex items-center justify-between">
                  <span>प्रमाणित AD दायरा: 2003-04-14 देखि 2034-04-13 सम्म</span>
                  <span className="text-blue-600 font-bold">BS 2060 – 2090</span>
                </div>
              </div>
            )}
          </div>

          {/* Converter Result Box */}
          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3.5 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {convMode === 'bsToAd'
                ? 'अंग्रेजी रूपान्तरण (AD Gregorian Date)'
                : 'नेपाली रूपान्तरण (BS Bikram Sambat)'}
            </span>

            <div className="text-2xl font-black text-amber-400">
              {convMode === 'bsToAd'
                ? bsToAdResult.formatted
                : adToBsResult.formatted}
            </div>

            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-1">
              <p className="font-bold text-white text-xs">
                बार: {convMode === 'bsToAd' ? bsToAdResult.dayName : adToBsResult.dayName}
              </p>
              {convMode === 'adToBs' && adToBsResult.tithi && (
                <p className="text-cyan-300 text-[11px]">
                  तिथि: {adToBsResult.tithi}
                </p>
              )}
            </div>

            <button
              onClick={() =>
                handleSaveCurrent(
                  'Date Converter',
                  convMode === 'bsToAd'
                    ? `${bsYearInput}/${bsMonthInput}/${bsDayInput} BS -> ${bsToAdResult.formatted} AD`
                    : `${adDateInput} AD -> ${adToBsResult.formatted}`,
                  1
                )
              }
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold text-xs shadow-md transition"
            >
              मिति सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* 3. AGE CALCULATOR (उमेर क्याल्कुलेटर) */}
      {/* =============================================================== */}
      {tool.id === 'age-calc' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">
              जन्म मिति (Date of Birth - वि.सं.):
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">
                  जन्म वर्ष
                </label>
                <input
                  type="number"
                  value={birthYear}
                  onChange={(e) =>
                    setBirthYear(parseInt(e.target.value) || 2050)
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 text-center text-xs font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">
                  महिना
                </label>
                <select
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-1 text-xs font-bold outline-none"
                >
                  {NEPALI_MONTHS.map((m) => (
                    <option key={m.bsMonth} value={m.bsMonth}>
                      {m.nameNe}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">
                  गते
                </label>
                <input
                  type="number"
                  value={birthDay}
                  onChange={(e) => setBirthDay(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 text-center text-xs font-bold outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3.5 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              यथार्थ उमेर (Exact Age)
            </span>
            <div className="text-3xl font-black text-[#00E676]">
              {ageResult.years} वर्ष, {ageResult.months} महिना, {ageResult.days} दिन
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">
                  बाँचेको जम्मा दिन
                </span>
                <p className="font-extrabold text-amber-300 text-xs mt-0.5">
                  {ageResult.totalDays.toLocaleString('en-IN')} दिन
                </p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">
                  अर्को जन्मदिन आउन
                </span>
                <p className="font-extrabold text-sky-300 text-xs mt-0.5">
                  {ageResult.daysToBirthday} दिन बाँकी
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                handleSaveCurrent(
                  'Age Calculation',
                  `${ageResult.years}y ${ageResult.months}m ${ageResult.days}d`,
                  ageResult.years
                )
              }
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold text-xs"
            >
              उमेर सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* 4. DATE DIFF (दुई मिति बीचको अन्तर) */}
      {/* =============================================================== */}
      {tool.id === 'date-diff' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-3">
            <div>
              <NepaliBSDatePicker
                label="सुरु मिति (Start Date - वि.सं.):"
                value={diffDate1}
                onChange={(iso) => setDiffDate1(iso)}
                language={language}
              />
            </div>
            <div>
              <NepaliBSDatePicker
                label="अन्तिम मिति (End Date - वि.सं.):"
                value={diffDate2}
                onChange={(iso) => setDiffDate2(iso)}
                language={language}
              />
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3.5 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              कुल दिन अन्तर (Total Days Difference)
            </span>
            <div className="text-3xl font-black text-amber-400">
              {dateDiffResult.totalDays} दिन
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">हप्ता तथा दिन</span>
                <p className="font-extrabold text-white text-xs mt-0.5">
                  {dateDiffResult.weeks} हप्ता {dateDiffResult.remainingDays} दिन
                </p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">लगभग महिना</span>
                <p className="font-extrabold text-sky-300 text-xs mt-0.5">
                  {dateDiffResult.months} महिना
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                handleSaveCurrent(
                  'Date Difference',
                  `${dateDiffResult.totalDays} Days`,
                  dateDiffResult.totalDays
                )
              }
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold text-xs"
            >
              हिसाब सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
