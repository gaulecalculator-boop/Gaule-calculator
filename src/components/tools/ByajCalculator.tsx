import React, { useState } from 'react';
import {
  RotateCcw,
  Info,
  Calendar,
  Share2,
  Copy,
  Receipt as ReceiptIcon,
  Save,
  CheckCircle2,
  CalendarDays,
  Plus,
  Minus,
  Sparkles,
  ShieldCheck,
  BadgePercent,
} from 'lucide-react';
import { Language, Currency } from '../../types';
import { translations } from '../../data/translations';
import { formatCurrency, toDevanagari, formatDateToBS } from '../../utils/nepaliCalendar';
import { playSuccessSound, playTapSound } from '../../utils/audio';
import { saveCalculationToHistory } from '../../utils/storage';
import { ReceiptModal } from '../ReceiptModal';
import { NepaliBSDatePicker } from '../common/NepaliBSDatePicker';
import { openExternalUrl } from '../../utils/androidBridge';

interface ByajCalculatorProps {
  language: Language;
  currency: Currency;
  showToast: (msg: string) => void;
}

export const ByajCalculator: React.FC<ByajCalculatorProps> = ({
  language,
  currency,
  showToast,
}) => {
  const t = translations[language];

  // Principal Amount
  const [principal, setPrincipal] = useState<number>(100000);
  const [principalInput, setPrincipalInput] = useState<string>('100000');

  // Monthly Rate (%)
  const [monthlyRate, setMonthlyRate] = useState<number>(3);
  const [rateInput, setRateInput] = useState<string>('3');

  // Time Duration
  const [months, setMonths] = useState<number>(5);
  const [monthsInput, setMonthsInput] = useState<string>('5');
  const [showDays, setShowDays] = useState<boolean>(false);
  const [days, setDays] = useState<number>(0);

  // Date Mode State (From Nepali BS Calendar)
  const [durationMode, setDurationMode] = useState<'months' | 'calendar'>('months');
  const [startDate, setStartDate] = useState<string>('2026-04-14');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Recalculate duration when calendar dates change
  const handleDateChange = (startIso: string, endIso: string) => {
    try {
      const d1 = new Date(startIso);
      const d2 = new Date(endIso);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const diffMs = Math.max(0, d2.getTime() - d1.getTime());
        const totalDays = Math.floor(diffMs / 86400000);
        const m = Math.floor(totalDays / 30);
        const remDays = totalDays % 30;
        setMonths(m);
        setMonthsInput(String(m));
        setDays(remDays);
        setShowDays(remDays > 0);
      }
    } catch {
      // ignore
    }
  };

  // Receipt Modal
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Calculations:
  // Village Interest formula:
  // Monthly Interest = Principal * (Rate / 100)
  // Per Day Interest = Monthly Interest / 30
  // Total Interest = (Monthly Interest * months) + (Per Day Interest * days)
  // Grand Total = Principal + Total Interest
  const monthlyInterest = (principal * monthlyRate) / 100;
  const perDayInterest = monthlyInterest / 30;
  const totalInterest = Math.round(monthlyInterest * months + perDayInterest * days);
  const grandTotal = principal + totalInterest;
  const yearlyRate = +(monthlyRate * 12).toFixed(1);

  const handleReset = () => {
    playTapSound();
    setPrincipal(100000);
    setPrincipalInput('100000');
    setMonthlyRate(3);
    setRateInput('3');
    setMonths(5);
    setMonthsInput('5');
    setDays(0);
    setShowDays(false);
  };

  const handleSetPrincipalPreset = (val: number) => {
    playTapSound();
    setPrincipal(val);
    setPrincipalInput(String(val));
  };

  const handleSetRatePreset = (val: number) => {
    playTapSound();
    setMonthlyRate(val);
    setRateInput(String(val));
  };

  const handleSetDurationPreset = (m: number) => {
    playTapSound();
    setMonths(m);
    setMonthsInput(String(m));
  };

  const handleSave = () => {
    playSuccessSound();
    saveCalculationToHistory({
      toolId: 'byaj',
      toolName: language === 'ne' ? 'गाउँले ब्याज (Village Interest)' : 'Byaj Calculator (Village Interest)',
      date: new Date().toLocaleDateString('en-GB'),
      bsDate: durationMode === 'calendar'
        ? `${formatDateToBS(startDate, 'ne')} देखि ${formatDateToBS(endDate, 'ne')}`
        : formatDateToBS(new Date(), 'ne', true),
      title: `${formatCurrency(principal, currency, language)} @ ${monthlyRate}% / mo for ${months} mo ${days > 0 ? `+ ${days} दिन` : ''}`,
      summary: `${t.grandTotalDue}: ${formatCurrency(grandTotal, currency, language)}`,
      amount: grandTotal,
      currency,
      details: {
        [t.principalAmount]: formatCurrency(principal, currency, language),
        [t.monthlyInterestRate]: `${monthlyRate}% / month (${yearlyRate}% yearly)`,
        [t.oneMonthInterest]: formatCurrency(monthlyInterest, currency, language),
        [t.timeDuration]: `${months} Months ${days > 0 ? `+ ${days} Days` : ''}`,
        [t.totalInterest]: formatCurrency(totalInterest, currency, language),
      },
    });
    showToast(t.savedToast);
  };

  const handleCopy = () => {
    playTapSound();
    const text =
      `*🪙 GHAULE BYAJ CALCULATOR (गाउँले ब्याज)*\n` +
      `---------------------------\n` +
      `साँवा रकम (Principal): ${formatCurrency(principal, currency, language)}\n` +
      `मासिक ब्याज दर: ${monthlyRate}% प्रति महिना (${yearlyRate}% वार्षिक)\n` +
      `समय अवधि: ${months} महिना ${days > 0 ? `र ${days} दिन` : ''}\n` +
      `१ महिनाको ब्याज: ${formatCurrency(monthlyInterest, currency, language)}\n` +
      `प्रति दिन ब्याज: ${formatCurrency(perDayInterest, currency, language)}/day\n` +
      `*कुल ब्याज (Total Interest): +${formatCurrency(totalInterest, currency, language)}*\n` +
      `*कुल तिर्नुपर्ने रकम (Grand Total): ${formatCurrency(grandTotal, currency, language)}*`;

    navigator.clipboard.writeText(text);
    showToast(t.copiedToast);
  };

  const handleWhatsApp = () => {
    playTapSound();
    const text =
      `*🪙 GHAULE BYAJ CALCULATOR (गाउँले ब्याज)*\n` +
      `---------------------------\n` +
      `साँवा रकम (Principal): ${formatCurrency(principal, currency, language)}\n` +
      `मासिक ब्याज दर: ${monthlyRate}% प्रति महिना (${yearlyRate}% वार्षिक)\n` +
      `समय अवधि: ${months} महिना ${days > 0 ? `र ${days} दिन` : ''}\n` +
      `१ महिनाको ब्याज: ${formatCurrency(monthlyInterest, currency, language)}\n` +
      `प्रति दिन ब्याज: ${formatCurrency(perDayInterest, currency, language)}/day\n` +
      `*कुल ब्याज (Total Interest): +${formatCurrency(totalInterest, currency, language)}*\n` +
      `*कुल तिर्नुपर्ने रकम (Grand Total): ${formatCurrency(grandTotal, currency, language)}*`;
    openExternalUrl(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* Breadcrumb & Classic Pro */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="text-slate-500 font-medium">Village Tools</span>
        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full border border-blue-200 text-[11px]">
          <span>🧮</span> Classic Pro
        </span>
      </div>

      {/* Top Banner Card: Professional & Advance Fintech Model */}
      <div className="relative overflow-hidden rounded-3xl p-4.5 bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#1E3A8A] text-white shadow-xl border border-blue-400/25">
        {/* Ambient subtle backdrops */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-amber-400/15 rounded-full blur-xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {/* Glowing Golden / Sapphire Emblem */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-0.5 shadow-lg shadow-amber-500/25 flex items-center justify-center flex-shrink-0">
              <div className="w-full h-full rounded-[14px] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
                <BadgePercent className="w-6 h-6 text-amber-400" />
              </div>
            </div>

            {/* Title & Info */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>गाउँले ब्याज (Village Interest)</span>
                </h4>
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs tracking-wider uppercase">
                  <Sparkles className="w-2.5 h-2.5" /> Advance Pro
                </span>
              </div>
              <p className="text-[11px] text-blue-100/90 font-medium mt-1 leading-snug">
                {language === 'ne'
                  ? 'स्थानीय ३०-दिने महिना र दिनको शुद्ध प्रमाणित ब्याज गणना इन्जिन'
                  : language === 'hi'
                  ? 'स्थानीय ३०-दिन महीना और दिन की सटीक ब्याज गणना प्रणाली'
                  : 'Certified 30-day monthly & daily village interest algorithm'}
              </p>

              {/* Advance Trust Micro-Tags */}
              <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-300 font-semibold flex-wrap">
                <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> १००% सटीक
                </span>
                <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                  📅 महिना + दिन
                </span>
                <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                  ⚡ ३०-दिने नियम
                </span>
              </div>
            </div>
          </div>

          {/* Reset Action */}
          <button
            onClick={handleReset}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-90 border border-white/15 text-slate-300 hover:text-white transition shadow-sm backdrop-blur-md flex-shrink-0"
            aria-label="Reset"
            title="रिसेट गर्नुहोस्"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Live Mathematical Formula Ribbon */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-blue-200/90 font-medium">
          <span className="truncate">
            <span className="text-slate-400">सूत्र:</span> साँवा × दर% × महिना + (दैनिक दर × दिन)
          </span>
          <span className="text-amber-400 font-bold ml-2 whitespace-nowrap">
            = कुल ब्याज
          </span>
        </div>
      </div>

      {/* Section 1: Principal Amount */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            {t.principalAmount} <span className="text-rose-500">*</span>
          </span>
          <span className="text-[11px] font-bold bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
            {formatCurrency(principal, currency, language)}
          </span>
        </div>

        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
            रु
          </span>
          <input
            type="number"
            value={principalInput}
            onChange={(e) => {
              setPrincipalInput(e.target.value);
              const p = parseFloat(e.target.value);
              if (!isNaN(p)) setPrincipal(p);
            }}
            className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white rounded-2xl py-2.5 pl-9 pr-4 text-sm font-bold text-slate-900 outline-none"
          />
        </div>

        {/* Presets: 10K, 50K, 1 Lakh, 2 Lakh, 5 Lakh */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold">
          {[
            { label: '10K', val: 10000 },
            { label: '50K', val: 50000 },
            { label: '1 Lakh', val: 100000 },
            { label: '2 Lakh', val: 200000 },
            { label: '5 Lakh', val: 500000 },
          ].map((chip) => {
            const isSel = principal === chip.val;
            return (
              <button
                key={chip.val}
                onClick={() => handleSetPrincipalPreset(chip.val)}
                className={`py-1.5 px-3 rounded-xl border transition active:scale-95 whitespace-nowrap ${
                  isSel
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Monthly Interest Rate (%) */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            {t.monthlyInterestRate} <span className="text-rose-500">*</span>
          </span>
        </div>

        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
            Rate
          </span>
          <input
            type="number"
            step="0.5"
            value={rateInput}
            onChange={(e) => {
              setRateInput(e.target.value);
              const r = parseFloat(e.target.value);
              if (!isNaN(r)) setMonthlyRate(r);
            }}
            className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white rounded-2xl py-2.5 pl-14 pr-16 text-sm font-bold text-slate-900 outline-none"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
            % / mo
          </span>
        </div>

        {/* Common rates */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-slate-500 font-medium">{t.commonRateLabel}</span>
          <div className="flex items-center gap-1.5 flex-wrap text-xs font-bold">
            {[
              { label: '1% Rate', val: 1 },
              { label: '1.5% Rate', val: 1.5 },
              { label: '2% Rate', val: 2 },
              { label: '2.5% Rate', val: 2.5 },
              { label: '3% (Common)', val: 3 },
              { label: '4% Rate', val: 4 },
              { label: '5% Rate', val: 5 },
            ].map((r) => {
              const isSel = monthlyRate === r.val;
              return (
                <button
                  key={r.val}
                  onClick={() => handleSetRatePreset(r.val)}
                  className={`py-1.5 px-2.5 rounded-xl border text-[11px] transition active:scale-95 ${
                    isSel
                      ? 'bg-[#0284C7] text-white border-sky-600 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
          <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <span>
            {language === 'ne'
              ? `३% ब्याजको अर्थ प्रति १०० रुपैयाँ साँवामा महिनाको रु ३ ब्याज हुन्छ।`
              : `A rate of ${monthlyRate}% means रु ${monthlyRate} monthly interest per रु 100 principal.`}
          </span>
        </div>
      </div>

      {/* Section 3: Time Duration */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800">
              {t.timeDuration} <span className="text-rose-500">*</span>
            </span>
            {(months > 0 || days > 0) && (
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {months} महिना {days > 0 ? `${days} दिन` : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-[10px] font-bold">
            <button
              type="button"
              onClick={() => {
                playTapSound();
                setDurationMode('months');
              }}
              className={`px-2 py-0.5 rounded-lg transition ${
                durationMode === 'months'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              महिना र दिन
            </button>
            <button
              type="button"
              onClick={() => {
                playTapSound();
                setDurationMode('calendar');
                handleDateChange(startDate, endDate);
              }}
              className={`px-2 py-0.5 rounded-lg transition ${
                durationMode === 'calendar'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              🇳🇵 पात्रो मिति
            </button>
          </div>
        </div>

        {durationMode === 'calendar' ? (
          <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200/80 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <NepaliBSDatePicker
                  label="ऋण लिएको मिति (Start Date - वि.सं.):"
                  value={startDate}
                  onChange={(iso) => {
                    setStartDate(iso);
                    handleDateChange(iso, endDate);
                  }}
                  language={language}
                />
              </div>
              <div>
                <NepaliBSDatePicker
                  label="हिसाब गर्ने मिति (End Date - वि.सं.):"
                  value={endDate}
                  onChange={(iso) => {
                    setEndDate(iso);
                    handleDateChange(startDate, iso);
                  }}
                  language={language}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-blue-900 bg-white/80 p-2 rounded-xl border border-blue-100">
              <span>पात्रो अनुसार जम्मा अवधि:</span>
              <span className="text-blue-700 font-black">
                {toDevanagari(months)} महिना {days > 0 ? `${toDevanagari(days)} दिन` : ''}
              </span>
            </div>
          </div>
        ) : (
          /* Dual Inputs: Months (महिना) and Days (दिन) */
          <div className="grid grid-cols-2 gap-2">
            {/* Months */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-700">महिना (Months):</span>
              <div className="relative">
                <Calendar className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  value={monthsInput}
                  onChange={(e) => {
                    setMonthsInput(e.target.value);
                    const m = parseInt(e.target.value);
                    setMonths(isNaN(m) ? 0 : Math.max(0, m));
                  }}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white rounded-2xl py-2.5 pl-9 pr-14 text-sm font-bold text-slate-900 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                  महिना
                </span>
              </div>
            </div>

            {/* Days */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-700">थप दिन (Days):</span>
              <div className="relative">
                <CalendarDays className="w-4 h-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  max="30"
                  placeholder="० दिन"
                  value={days === 0 ? '' : days}
                  onChange={(e) => {
                    const d = parseInt(e.target.value);
                    setDays(isNaN(d) ? 0 : Math.max(0, d));
                  }}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white rounded-2xl py-2.5 pl-9 pr-12 text-sm font-bold text-slate-900 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                  दिन
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Result Card: GRAND TOTAL DUE (Dark Navy Blue Card from Screenshot 6) */}
      <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl border border-blue-900/40 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {t.grandTotalDue}
            </span>
            <div className="text-3xl font-black text-white flex items-baseline gap-1 mt-0.5">
              <span className="text-amber-400 font-extrabold text-2xl">रु</span>
              <span>{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {t.totalInterest}
            </span>
            <div className="text-xl font-black text-[#00E676]">
              + रु {totalInterest.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Calculation sound status badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-emerald-300 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{t.calcNormalSound}</span>
        </div>

        {/* 4 Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-400 font-medium">{t.principalAmount}</span>
            <p className="text-sm font-extrabold text-white mt-0.5">
              रु {principal.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-400 font-medium">Monthly Rate</span>
            <p className="text-sm font-extrabold text-amber-300 mt-0.5">{monthlyRate}% / month</p>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-400 font-medium">{t.oneMonthInterest}</span>
            <p className="text-sm font-extrabold text-sky-300 mt-0.5">
              रु {Math.round(monthlyInterest).toLocaleString('en-IN')} / mo
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] text-slate-400 font-medium">Time Duration</span>
            <p className="text-sm font-extrabold text-white mt-0.5">
              {months} Months {days > 0 ? `+ ${days}d` : ''}
            </p>
          </div>
        </div>

        {/* Per Day Interest */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
          <span>{t.perDayInterest}</span>
          <span className="font-bold text-white">रु {perDayInterest.toFixed(2)} / day</span>
        </div>

        {/* Action Buttons: Receipt | WhatsApp | Copy */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={() => {
              playTapSound();
              setIsReceiptOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs transition"
          >
            <ReceiptIcon className="w-3.5 h-3.5" />
            <span>{t.receipt}</span>
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-[#00C853] hover:bg-[#00B048] active:scale-95 text-white font-bold text-xs transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{t.whatsApp}</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs transition"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{t.copy}</span>
          </button>
        </div>

        {/* Full-width Save button */}
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#0284C7] hover:bg-sky-600 active:scale-[0.99] text-white font-extrabold text-sm transition shadow-lg shadow-sky-600/30"
        >
          <Save className="w-4 h-4" />
          <span>{t.save}</span>
        </button>
      </div>

      {/* 1 LAKH (100K) MONTHLY INTEREST RATES Card from Screenshot 6 */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
        <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">
          <span className="text-amber-500">⭐</span> {t.referenceInterestHeader}
        </h5>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200/60">
            <span className="text-[10px] text-slate-500 font-semibold">2% Rate</span>
            <p className="font-extrabold text-amber-800 mt-0.5">रु 2,000/mo</p>
          </div>
          <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200/60">
            <span className="text-[10px] text-slate-500 font-semibold">3% Rate</span>
            <p className="font-extrabold text-amber-800 mt-0.5">रु 3,000/mo</p>
          </div>
          <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200/60">
            <span className="text-[10px] text-slate-500 font-semibold">5% Rate</span>
            <p className="font-extrabold text-amber-800 mt-0.5">रु 5,000/mo</p>
          </div>
        </div>
      </div>

      {/* Universal Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        moduleType="byaj"
        title="गाउँले ब्याज हिसाब तथा भरपाई (Interest Bill)"
        totalAmountText={formatCurrency(grandTotal, currency, language)}
        items={[
          {
            label: 'साँवा रकम (Principal Amount)',
            value: formatCurrency(principal, currency, language),
            quantity: 1,
            unit: 'ऋण',
            rate: principal,
            subtotal: principal,
          },
          {
            label: 'ब्याज रकम (Total Interest)',
            value: formatCurrency(totalInterest, currency, language),
            quantity: 1,
            unit: 'ब्याज',
            rate: totalInterest,
            subtotal: totalInterest,
            details: `दर: ${monthlyRate}% मासिक (${yearlyRate}% वार्षिक) | अवधि: ${months} महिना ${days > 0 ? `${days} दिन` : ''}`,
          },
        ]}
        note="GHAULE CALCULATOR 100% Offline Village Interest System"
        language={language}
      />
    </div>
  );
};
