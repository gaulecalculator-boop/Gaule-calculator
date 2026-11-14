import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';
import {
  BS_MIN_YEAR,
  BS_MAX_YEAR,
  NEPALI_MONTHS,
  WEEKDAYS,
  getBSMonthName,
  getWeekdayShort,
  toDevanagari,
  getBSDaysInMonth,
  getBSMonthFirstDayOfWeek,
  bsToAd,
  adToBs,
  getTodayBS,
} from '../../utils/nepaliCalendar';
import { playTapSound, playSuccessSound } from '../../utils/audio';
import { Language } from '../../types';
import { localizeNumberString } from '../../utils/universalTranslator';
import { pick5 } from '../../utils/i18nHelper';

export interface NepaliBSDatePickerProps {
  value?: string; // ISO date string "YYYY-MM-DD"
  onChange: (dateIso: string, bsDate: { year: number; month: number; day: number; formatted: string }) => void;
  label?: string;
  placeholder?: string;
  inline?: boolean;
  className?: string;
  buttonClassName?: string;
  minYear?: number;
  maxYear?: number;
  language?: Language;
  disabled?: boolean;
}

export const NepaliBSDatePicker: React.FC<NepaliBSDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder,
  inline = false,
  className = '',
  buttonClassName = '',
  minYear = BS_MIN_YEAR,
  maxYear = BS_MAX_YEAR,
  language = 'ne',
  disabled = false,
}) => {
  const effectivePlaceholder =
    placeholder ||
    pick5(language, {
      en: 'Select Nepali Date',
      hi: 'नेपाली तारीख चुनें',
      bho: 'नेपाली तारीख चुनीं',
      mai: 'नेपाली तारीख चुनू',
      ne: 'नेपाली मिति छान्नुहोस्',
    });

  // Strict active boundary enforcement [BS 2060 to BS 2090]
  const effectiveMinYear = Math.max(BS_MIN_YEAR, minYear ?? BS_MIN_YEAR);
  const effectiveMaxYear = Math.min(BS_MAX_YEAR, maxYear ?? BS_MAX_YEAR);

  const todayBs = useMemo(() => getTodayBS(), []);

  // Parse initial date from value or fallback to today with hard boundary clamping
  const initialBs = useMemo(() => {
    if (!value) return todayBs;
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return todayBs;
      const bs = adToBs(d);
      const safeYear = Math.max(effectiveMinYear, Math.min(effectiveMaxYear, bs.year));
      const maxDays = getBSDaysInMonth(safeYear, bs.month);
      const safeDay = Math.max(1, Math.min(maxDays, bs.day));
      return { year: safeYear, month: bs.month, day: safeDay, dayOfWeek: bs.dayOfWeek };
    } catch {
      return todayBs;
    }
  }, [value, todayBs, effectiveMinYear, effectiveMaxYear]);

  const [isOpen, setIsOpen] = useState<boolean>(inline);
  const [currentYear, setCurrentYear] = useState<number>(initialBs.year);
  const [currentMonth, setCurrentMonth] = useState<number>(initialBs.month);
  const [selectedDay, setSelectedDay] = useState<number>(initialBs.day);

  // Sync internal view when value prop changes externally, strictly clamped
  useEffect(() => {
    if (value) {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          const bs = adToBs(d);
          const safeYear = Math.max(effectiveMinYear, Math.min(effectiveMaxYear, bs.year));
          const maxDays = getBSDaysInMonth(safeYear, bs.month);
          const safeDay = Math.max(1, Math.min(maxDays, bs.day));
          setCurrentYear(safeYear);
          setCurrentMonth(bs.month);
          setSelectedDay(safeDay);
        }
      } catch {
        // keep current
      }
    }
  }, [value, effectiveMinYear, effectiveMaxYear]);

  // Calendar calculations for current viewed month
  const daysInMonth = useMemo(() => {
    return getBSDaysInMonth(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Auto-clamp selectedDay when changing month/year if previous day exceeded new month's days
  useEffect(() => {
    const maxDays = getBSDaysInMonth(currentYear, currentMonth);
    if (selectedDay > maxDays) {
      setSelectedDay(maxDays);
    }
  }, [currentYear, currentMonth, selectedDay]);

  const firstDayOfWeek = useMemo(() => {
    return getBSMonthFirstDayOfWeek(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  const numFmt = (n: number) => localizeNumberString(n, language);

  // Gregorian AD Year range for this BS Year
  const adYearStart = currentYear - 57;
  const adYearEnd = currentYear - 56;
  const adYearText = `${numFmt(adYearStart)} / ${numFmt(adYearEnd)} AD`;

  // Selected date's full BS & AD string for display
  const selectedBsText = useMemo(() => {
    const sMonthName = getBSMonthName(currentMonth, language);
    return `${numFmt(selectedDay)} ${sMonthName} ${numFmt(currentYear)}`;
  }, [currentYear, currentMonth, selectedDay, language]);

  const selectedAdDate = useMemo(() => {
    return bsToAd(currentYear, currentMonth, selectedDay);
  }, [currentYear, currentMonth, selectedDay]);

  const selectedAdIso = useMemo(() => {
    const y = selectedAdDate.getUTCFullYear();
    const m = String(selectedAdDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(selectedAdDate.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [selectedAdDate]);

  // Navigation handlers strictly clamped to [effectiveMinYear, effectiveMaxYear]
  const handlePrevMonth = () => {
    playTapSound();
    if (currentMonth === 1) {
      if (currentYear > effectiveMinYear) {
        setCurrentYear((y) => y - 1);
        setCurrentMonth(12);
      }
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    playTapSound();
    if (currentMonth === 12) {
      if (currentYear < effectiveMaxYear) {
        setCurrentYear((y) => y + 1);
        setCurrentMonth(1);
      }
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handlePrevYear = () => {
    playTapSound();
    if (currentYear > effectiveMinYear) {
      setCurrentYear((y) => y - 1);
    }
  };

  const handleNextYear = () => {
    playTapSound();
    if (currentYear < effectiveMaxYear) {
      setCurrentYear((y) => y + 1);
    }
  };

  const handleJumpToToday = () => {
    playTapSound();
    const safeYear = Math.max(effectiveMinYear, Math.min(effectiveMaxYear, todayBs.year));
    setCurrentYear(safeYear);
    setCurrentMonth(todayBs.month);
    setSelectedDay(todayBs.day);
  };

  const handleSelectDay = (dayNum: number) => {
    playTapSound();
    const safeYear = Math.max(effectiveMinYear, Math.min(effectiveMaxYear, currentYear));
    const maxDays = getBSDaysInMonth(safeYear, currentMonth);
    const safeDay = Math.max(1, Math.min(maxDays, dayNum));
    setSelectedDay(safeDay);
    const ad = bsToAd(safeYear, currentMonth, safeDay);
    const y = ad.getUTCFullYear();
    const m = String(ad.getUTCMonth() + 1).padStart(2, '0');
    const d = String(ad.getUTCDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;

    const sMonthName = getBSMonthName(currentMonth, language);
    const formatted =
      language === 'en'
        ? `${safeDay} ${sMonthName} ${safeYear} BS`
        : `${toDevanagari(safeDay)} ${sMonthName} ${toDevanagari(safeYear)} वि.सं.`;

    onChange(iso, {
      year: safeYear,
      month: currentMonth,
      day: safeDay,
      formatted,
    });

    if (!inline) {
      setIsOpen(false);
    }
  };

  const handleConfirm = () => {
    playSuccessSound();
    handleSelectDay(selectedDay);
    if (!inline) {
      setIsOpen(false);
    }
  };

  // Label display on the button
  const displayButtonText = useMemo(() => {
    if (!value) return effectivePlaceholder;
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return effectivePlaceholder;
      const bs = adToBs(d);
      const mName = getBSMonthName(bs.month, language);
      return language === 'en'
        ? `${bs.day} ${mName} ${bs.year} BS`
        : `${toDevanagari(bs.day)} ${mName} ${toDevanagari(bs.year)} वि.सं.`;
    } catch {
      return effectivePlaceholder;
    }
  }, [value, effectivePlaceholder, language]);

  const displayAdText = useMemo(() => {
    if (!value) return '';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return '';
      return `${d.toISOString().split('T')[0]} AD`;
    } catch {
      return '';
    }
  }, [value]);

  const calendarContent = (
    <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-200 space-y-3.5 select-none text-slate-900 max-w-sm w-full mx-auto">
      {/* 1. Modal Top Bar (if not inline) */}
      {!inline && (
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
              🇳🇵
            </span>
            <div>
              <h3 className="text-xs font-black text-slate-800">
                {pick5(language, {
                  en: 'Nepali BS Calendar',
                  hi: 'नेपाली कैलेंडर (वि.सं.)',
                  bho: 'नेपाली कैलेंडर (वि.सं.)',
                  mai: 'नेपाली कैलेंडर (वि.सं.)',
                  ne: 'नेपाली पात्रो (वि.सं.)',
                })}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                {numFmt(effectiveMinYear)} – {numFmt(effectiveMaxYear)} BS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition active:scale-90"
            title={pick5(language, {
              en: 'Close',
              hi: 'बंद करें',
              bho: 'बंद करीं',
              mai: 'बंद करू',
              ne: 'बन्द गर्नुहोस्',
            })}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Calendar Header */}
      <div className="bg-gradient-to-br from-blue-50/70 via-sky-50/40 to-slate-50 rounded-2xl p-3 border border-blue-100/80 space-y-2.5">
        {/* Big Year and Small AD Year Header */}
        <div className="flex items-center justify-between">
          <div className="text-left">
            <div className="text-2xl sm:text-3xl font-black text-blue-900 tracking-tight leading-none">
              {numFmt(currentYear)}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              <small>{adYearText}</small>
            </div>
          </div>

          {/* Jump to Today Chip */}
          <button
            type="button"
            onClick={handleJumpToToday}
            className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[11px] font-bold shadow-xs transition flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>
              {pick5(language, {
                en: 'Today',
                hi: 'आज',
                bho: 'आज',
                mai: 'आई',
                ne: 'आज',
              })}
            </span>
          </button>
        </div>

        {/* Month Selector + Year Selector + Chevrons */}
        <div className="flex items-center justify-between gap-1 pt-1 border-t border-blue-100/60">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevYear}
              disabled={currentYear <= effectiveMinYear}
              className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 active:scale-90 transition"
              title={pick5(language, {
                en: 'Previous Year',
                hi: 'पिछला साल',
                bho: 'पिछला साल',
                mai: 'पाछिला बरख',
                ne: 'अघिल्लो वर्ष',
              })}
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={currentYear <= effectiveMinYear && currentMonth <= 1}
              className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 active:scale-90 transition"
              title={pick5(language, {
                en: 'Previous Month',
                hi: 'पिछला महीना',
                bho: 'पिछला महीना',
                mai: 'पाछिला माह',
                ne: 'अघिल्लो महिना',
              })}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-1 justify-center">
            {/* Month Dropdown */}
            <select
              value={currentMonth}
              onChange={(e) => {
                playTapSound();
                setCurrentMonth(parseInt(e.target.value));
              }}
              className="py-1 px-2 rounded-xl bg-white border border-blue-200 text-xs font-bold text-blue-950 shadow-xs outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {NEPALI_MONTHS.map((m) => (
                <option key={m.bsMonth} value={m.bsMonth}>
                  {getBSMonthName(m.bsMonth, language)} ({numFmt(m.bsMonth)})
                </option>
              ))}
            </select>

            {/* Year Dropdown */}
            <select
              value={currentYear}
              onChange={(e) => {
                playTapSound();
                const selectedY = parseInt(e.target.value);
                const safeY = Math.max(effectiveMinYear, Math.min(effectiveMaxYear, selectedY));
                setCurrentYear(safeY);
              }}
              className="py-1 px-2 rounded-xl bg-white border border-blue-200 text-xs font-bold text-blue-950 shadow-xs outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {Array.from({ length: effectiveMaxYear - effectiveMinYear + 1 }, (_, i) => effectiveMinYear + i).map((y) => (
                <option key={y} value={y}>
                  {language === 'en' ? `${y} BS` : `${numFmt(y)} वि.सं.`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={currentYear >= effectiveMaxYear && currentMonth >= 12}
              className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 active:scale-90 transition"
              title={pick5(language, {
                en: 'Next Month',
                hi: 'अगला महीना',
                bho: 'अगिला महीना',
                mai: 'आगू माह',
                ne: 'अर्को महिना',
              })}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNextYear}
              disabled={currentYear >= effectiveMaxYear}
              className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 active:scale-90 transition"
              title={pick5(language, {
                en: 'Next Year',
                hi: 'अगला साल',
                bho: 'अगिला साल',
                mai: 'आगू बरख',
                ne: 'अर्को वर्ष',
              })}
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Weekdays Header Row (Sun to Sat) */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold pt-1">
        {WEEKDAYS.map((w, idx) => (
          <div
            key={idx}
            className={`py-1 rounded-lg ${
              w.isHoliday
                ? 'text-rose-600 bg-rose-50 font-black'
                : 'text-slate-600'
            }`}
          >
            {getWeekdayShort(idx, language)}
          </div>
        ))}
      </div>

      {/* 4. Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs pt-1">
        {/* Leading spacer slots */}
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <div key={`spacer-${idx}`} className="h-12 rounded-xl bg-transparent" />
        ))}

        {/* Day buttons */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const adDate = bsToAd(currentYear, currentMonth, dayNum);
          const adDay = adDate.getUTCDate();
          const dayOfWeek = (firstDayOfWeek + i) % 7;
          const isSaturday = dayOfWeek === 6;
          const isToday =
            currentYear === todayBs.year &&
            currentMonth === todayBs.month &&
            dayNum === todayBs.day;
          const isSelected = dayNum === selectedDay;

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => handleSelectDay(dayNum)}
              className={`h-12 rounded-xl flex flex-col items-center justify-center p-0.5 transition active:scale-90 border ${
                isSelected
                  ? 'border-blue-600 bg-blue-600 text-white shadow-md font-bold'
                  : isToday
                  ? 'border-amber-400 bg-amber-50 text-amber-900 ring-2 ring-amber-400/50'
                  : isSaturday
                  ? 'border-rose-100 bg-rose-50/50 hover:bg-rose-100/70 text-rose-600'
                  : 'border-slate-100 bg-white hover:bg-slate-50 text-slate-800'
              }`}
            >
              <span
                className={`text-sm sm:text-base font-extrabold leading-tight ${
                  isSelected
                    ? 'text-white'
                    : isSaturday
                    ? 'text-rose-600'
                    : 'text-slate-900'
                }`}
              >
                {numFmt(dayNum)}
              </span>
              <span
                className={`text-[9px] font-mono leading-none ${
                  isSelected
                    ? 'text-blue-100 opacity-90'
                    : isSaturday
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {adDay}
              </span>
            </button>
          );
        })}
      </div>

      {/* 5. Selected Summary + Confirmation Bar */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="text-left">
          <div className="text-xs font-black text-blue-900">
            {language === 'en' ? `${selectedBsText} BS` : `${selectedBsText} वि.सं.`}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            {selectedAdIso} AD
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!inline && (
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold active:scale-95 transition"
            >
              {pick5(language, {
                en: 'Cancel',
                hi: 'रद्द',
                bho: 'रद्द करीं',
                mai: 'रद्द करू',
                ne: 'रद्द',
              })}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs active:scale-95 transition flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>
              {pick5(language, {
                en: 'Select',
                hi: 'चुनें',
                bho: 'चुनीं',
                mai: 'चुनू',
                ne: 'छान्नुहोस्',
              })}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  if (inline) {
    return <div className={className}>{calendarContent}</div>;
  }

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="text-xs font-bold text-slate-700 block mb-1">
          {label}
        </label>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          playTapSound();
          setIsOpen(true);
        }}
        className={`w-full flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-300 hover:border-blue-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-left transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-extrabold text-slate-900 block truncate">
              {displayButtonText}
            </span>
            {displayAdText && (
              <span className="text-[10px] text-slate-400 block font-mono">
                {displayAdText}
              </span>
            )}
          </div>
        </div>

        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200/80 shrink-0">
          {pick5(language, {
            en: 'Pick Date',
            hi: 'कैलेंडर चुनें',
            bho: 'कैलेंडर चुनीं',
            mai: 'कैलेंडर चुनू',
            ne: 'पात्रो छान्नुहोस्',
          })}
        </span>
      </button>

      {/* Modal Popup */}
      {isOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div className="animate-in zoom-in-95 duration-150 max-h-[96vh] overflow-y-auto">
            {calendarContent}
          </div>
        </div>
      )}
    </div>
  );
};
