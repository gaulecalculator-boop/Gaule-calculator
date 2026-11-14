import React, { useState } from 'react';
import { RotateCcw, Copy, Save, BookOpen, Receipt as ReceiptIcon, ArrowRightLeft, Scale } from 'lucide-react';
import { Language, Currency } from '../../types';
import { translations } from '../../data/translations';
import { formatCurrency, toDevanagari } from '../../utils/nepaliCalendar';
import { playSuccessSound, playTapSound } from '../../utils/audio';
import { saveCalculationToHistory } from '../../utils/storage';
import { ReceiptModal } from '../ReceiptModal';
import { pick5 } from '../../utils/i18nHelper';

interface PriceWeightCalculatorProps {
  language: Language;
  currency: Currency;
  onOpenNotebook: () => void;
  showToast: (msg: string) => void;
}

export const PriceWeightCalculator: React.FC<PriceWeightCalculatorProps> = ({
  language,
  currency,
  onOpenNotebook,
  showToast,
}) => {
  const t = translations[language];

  // Mode: 1: Money to Grams | 2: Grams to Money
  const [mode, setMode] = useState<1 | 2>(1);

  // Reference Rate
  const [refWeightGrams, setRefWeightGrams] = useState<number>(1000); // 1000g = 1kg
  const [refPrice, setRefPrice] = useState<number>(100);
  const [refPriceInput, setRefPriceInput] = useState<string>('100');

  // Input for Mode 1: Customer Paying Amount (Money)
  const [payingAmount, setPayingAmount] = useState<number>(5);
  const [payingAmountInput, setPayingAmountInput] = useState<string>('5');

  // Input for Mode 2: Wanted Weight (in grams)
  const [wantedGrams, setWantedGrams] = useState<number>(250);
  const [wantedGramsInput, setWantedGramsInput] = useState<string>('250');

  // Receipt Modal
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Calculations:
  // Mode 1: Weight in grams = (payingAmount / refPrice) * refWeightGrams
  const calculatedGrams = +( (payingAmount / Math.max(0.01, refPrice)) * refWeightGrams ).toFixed(2);
  const calculatedKg = +(calculatedGrams / 1000).toFixed(3);

  // Mode 2: Money = (wantedGrams / refWeightGrams) * refPrice
  const calculatedMoney = Math.round((wantedGrams / Math.max(1, refWeightGrams)) * refPrice);

  const handleReset = () => {
    playTapSound();
    setRefPrice(100);
    setRefPriceInput('100');
    setPayingAmount(5);
    setPayingAmountInput('5');
    setWantedGrams(250);
    setWantedGramsInput('250');
  };

  const handleSave = () => {
    playSuccessSound();
    if (mode === 1) {
      saveCalculationToHistory({
        toolId: 'price-weight',
        toolName: language === 'ne' ? 'रुपैयाँ ↔ तौल (Price to Weight)' : 'Price ↔ Weight Calculator',
        date: new Date().toLocaleDateString('en-GB'),
        title: `रु ${payingAmount} → ${calculatedGrams}g (${calculatedKg}kg)`,
        summary: `दर: रु ${refPrice} / ${refWeightGrams}g`,
        amount: payingAmount,
        currency,
        details: {
          'दर (Rate)': `${formatCurrency(refPrice, currency, language)} / ${refWeightGrams}g`,
          'ग्राहकको रकम': formatCurrency(payingAmount, currency, language),
          'प्राप्त हुने तौल (Grams)': `${calculatedGrams} ग्राम (g)`,
          'किलोग्राम (Kg)': `${calculatedKg} kg`,
        },
      });
    } else {
      saveCalculationToHistory({
        toolId: 'price-weight',
        toolName: language === 'ne' ? 'तौल ↔ रुपैयाँ (Weight to Price)' : 'Weight ↔ Price Calculator',
        date: new Date().toLocaleDateString('en-GB'),
        title: `${wantedGrams}g → रु ${calculatedMoney}`,
        summary: `दर: रु ${refPrice} / ${refWeightGrams}g`,
        amount: calculatedMoney,
        currency,
        details: {
          'दर (Rate)': `${formatCurrency(refPrice, currency, language)} / ${refWeightGrams}g`,
          'चाहिएको तौल': `${wantedGrams} ग्राम`,
          'तिर्नुपर्ने रकम': formatCurrency(calculatedMoney, currency, language),
        },
      });
    }
    showToast(t.savedToast);
  };

  const handleCopy = () => {
    playTapSound();
    const text =
      mode === 1
        ? `*⚖️ GHAULE PRICE ↔ WEIGHT*\n` +
          `दर: रु ${refPrice} प्रति ${refWeightGrams === 1000 ? '१ किलो' : `${refWeightGrams}g`}\n` +
          `ग्राहकको रकम: रु ${payingAmount}\n` +
          `*पाउने वजन: ${calculatedGrams} ग्राम (${calculatedKg} kg)*\n` +
          `फर्मूला: (${payingAmount} ÷ ${refPrice}) × ${refWeightGrams} = ${calculatedGrams}g`
        : `*⚖️ GHAULE WEIGHT ↔ PRICE*\n` +
          `दर: रु ${refPrice} प्रति ${refWeightGrams === 1000 ? '१ किलो' : `${refWeightGrams}g`}\n` +
          `सामानको वजन: ${wantedGrams} ग्राम\n` +
          `*तिर्नुपर्ने रकम: रु ${calculatedMoney}*\n` +
          `फर्मूला: (${wantedGrams} ÷ ${refWeightGrams}) × ${refPrice} = रु ${calculatedMoney}`;

    navigator.clipboard.writeText(text);
    showToast(t.copiedToast);
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* Breadcrumb & Classic Pro */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="text-slate-500 font-medium">Shop & Dukaan</span>
        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-full border border-blue-200 text-[11px]">
          <span>🧮</span> Classic Pro
        </span>
      </div>

      {/* Top Banner Card with Scales */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 p-2 flex items-center justify-center border border-white/30 text-2xl shadow-inner">
            ⚖️
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white">Price ↔ Weight Calculator</h4>
            <p className="text-[11px] text-amber-100 mt-0.5">
              Calculate grams from money & price from weight
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white active:scale-95 transition"
          aria-label="Reset"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Switcher: 1. Money -> Grams | 2. Grams -> Money */}
      <div className="flex items-center p-1 bg-slate-200/70 rounded-2xl gap-1 text-xs font-bold">
        <button
          onClick={() => {
            playTapSound();
            setMode(1);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl transition ${
            mode === 1
              ? 'bg-[#0284C7] text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>{t.moneyToGrams}</span>
        </button>
        <button
          onClick={() => {
            playTapSound();
            setMode(2);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl transition ${
            mode === 2
              ? 'bg-[#0284C7] text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>{t.gramsToMoney}</span>
        </button>
      </div>

      {/* Card 1: Reference Rate / Unit Price */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <span>{t.refRateHeader}</span>
        </div>

        <div>
          <label className="text-xs text-slate-600 font-medium block mb-1">
            {t.refWeightLabel}
          </label>
          <select
            value={refWeightGrams}
            onChange={(e) => setRefWeightGrams(parseInt(e.target.value))}
            className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2.5 px-3 text-xs font-bold text-slate-800 outline-none"
          >
            <option value={1000}>1 Kilogram (1000g)</option>
            <option value={500}>Half Kilogram (500g)</option>
            <option value={250}>1 Pav (250g)</option>
            <option value={100}>100 Grams (100g)</option>
            <option value={40000}>1 Man (40 Kilogram / धार्नी)</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-600 font-medium block mb-1">
            {t.priceForThisWeight}
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
              रु
            </span>
            <input
              type="number"
              value={refPriceInput}
              onChange={(e) => {
                setRefPriceInput(e.target.value);
                const p = parseFloat(e.target.value);
                if (!isNaN(p)) setRefPrice(p);
              }}
              className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white rounded-2xl py-2 pl-9 pr-4 text-sm font-bold text-slate-900 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Card 2: Customer Paying Amount (Mode 1) or Wanted Grams (Mode 2) */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <span className="flex items-center gap-1.5">
            <span className="text-amber-500">✨</span>
            <span>{mode === 1 ? t.customerPayingAmount : 'Customer Wanted Weight (Grams)'}</span>
          </span>
          <span className="text-slate-400 font-normal">e.g. {mode === 1 ? '5' : '250'}</span>
        </div>

        <div className="relative">
          {mode === 1 && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-blue-600">
              रु
            </span>
          )}
          <input
            type="number"
            value={mode === 1 ? payingAmountInput : wantedGramsInput}
            onChange={(e) => {
              if (mode === 1) {
                setPayingAmountInput(e.target.value);
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) setPayingAmount(val);
              } else {
                setWantedGramsInput(e.target.value);
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) setWantedGrams(val);
              }
            }}
            className={`w-full bg-slate-50 border border-blue-400/80 focus:border-blue-600 focus:bg-white rounded-2xl py-3 text-lg font-black text-slate-900 outline-none ${
              mode === 1 ? 'pl-9 pr-14' : 'pl-4 pr-16'
            }`}
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-700">
            {mode === 1 ? (currency === 'NPR' ? 'NPR' : 'INR') : 'GRAMS'}
          </span>
        </div>
      </div>

      {/* Card 3: CALCULATION RESULT (Dark Navy Blue Card from Screenshot 7) */}
      <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl border border-blue-900/40 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider text-sky-400 flex items-center gap-1.5 uppercase">
            <span>✨</span> {t.calculationResult}
          </span>
          <span className="text-[11px] font-bold bg-white/10 text-white px-2.5 py-0.5 rounded-full border border-white/20">
            {mode === 1 ? 'रुपैयाँ → ग्राम' : 'ग्राम → रुपैयाँ'}
          </span>
        </div>

        {mode === 1 ? (
          <div className="space-y-1 text-center py-1">
            <p className="text-xs text-slate-300 font-medium">
              {t.weightCustomerReceives} रु {payingAmount}:
            </p>
            <div className="text-4xl font-black text-amber-400 tracking-tight">
              {calculatedGrams} ग्राम (g)
            </div>
            <p className="text-xs text-sky-300 font-semibold">= {calculatedKg} किलोग्राम (kg)</p>
          </div>
        ) : (
          <div className="space-y-1 text-center py-1">
            <p className="text-xs text-slate-300 font-medium">
              Price customer pays for {wantedGrams} grams:
            </p>
            <div className="text-4xl font-black text-amber-400 tracking-tight">
              रु {calculatedMoney.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-sky-300 font-semibold">
              (= रु {refPrice} प्रति {refWeightGrams} ग्राम दर)
            </p>
          </div>
        )}

        {/* Formula Breakdown */}
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs space-y-1 font-mono">
          <div className="flex items-center justify-between text-[11px] text-sky-300 font-sans">
            <span className="flex items-center gap-1 font-bold">
              <span>ℹ️</span> {t.formulaBreakdown}
            </span>
            <span className="font-bold text-emerald-400">{t.hundredPercentAccurate}</span>
          </div>
          {mode === 1 ? (
            <>
              <p className="text-slate-300 font-sans text-[11px]">
                वजन = (ग्राहकको रकम ÷ १ किलोको दर) × १००० ग्राम
              </p>
              <p className="text-amber-300 text-[11px]">
                = (रु {payingAmount} ÷ रु {refPrice}) × {refWeightGrams}g = {calculatedGrams} ग्राम
              </p>
            </>
          ) : (
            <>
              <p className="text-slate-300 font-sans text-[11px]">
                रकम = (ग्राहकको वजन ÷ १ किलोको ग्राम) × दर
              </p>
              <p className="text-amber-300 text-[11px]">
                = ({wantedGrams} ÷ {refWeightGrams}) × रु {refPrice} = रु {calculatedMoney}
              </p>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs transition border border-white/10"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{t.copy}</span>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs transition shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t.saveHistory}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              playTapSound();
              onOpenNotebook();
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs transition border border-white/10"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t.notebook}</span>
          </button>
          <button
            onClick={() => {
              playTapSound();
              setIsReceiptOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs transition shadow-md"
          >
            <ReceiptIcon className="w-3.5 h-3.5" />
            <span>{t.viewBill}</span>
          </button>
        </div>
      </div>

      {/* Universal Printable Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        moduleType="shop"
        title={pick5(language, {
          en: 'Price to Weight Bill',
          hi: 'दाम एवं तौल बिल',
          bho: 'दाम आ तौल बिल',
          mai: 'दाम आ तौल बिल',
          ne: 'दाम तथा तौल हिसाब बिल (Price to Weight Bill)',
        }, 'PriceWeightCalculator')}
        totalAmountText={
          mode === 1
            ? formatCurrency(payingAmount, currency, language)
            : formatCurrency(calculatedMoney, currency, language)
        }
        items={[
          {
            label: pick5(language, {
              en: 'Item Description',
              hi: 'सामान विवरण',
              bho: 'सामान के विवरण',
              mai: 'सामान विवरण',
              ne: 'सामान विवरण (Item)',
            }, 'PriceWeightCalculator'),
            value: mode === 1
              ? `${pick5(language, { en: 'Weight', hi: 'वजन', bho: 'तौल', mai: 'तौल', ne: 'तौल' }, 'PriceWeightCalculator')}: ${calculatedGrams}g (${calculatedKg} kg)`
              : `${pick5(language, { en: 'Weight', hi: 'वजन', bho: 'तौल', mai: 'तौल', ne: 'तौल' }, 'PriceWeightCalculator')}: ${wantedGrams}g`,
            quantity: mode === 1 ? calculatedGrams : wantedGrams,
            unit: pick5(language, { en: 'g', hi: 'ग्राम', bho: 'ग्राम', mai: 'ग्राम', ne: 'ग्राम (g)' }, 'PriceWeightCalculator'),
            rate: Math.round((refPrice / (refWeightGrams || 1000)) * 1000),
            subtotal: mode === 1 ? payingAmount : calculatedMoney,
            details: `${pick5(language, { en: 'Rate', hi: 'दर', bho: 'दर', mai: 'दर', ne: 'दर' }, 'PriceWeightCalculator')}: ${language === 'en' ? 'Rs.' : 'रु'} ${refPrice} / ${refWeightGrams}g`,
          },
        ]}
        note="GHAULE CALCULATOR 100% Offline Shop & Weighing System"
        language={language}
      />
    </div>
  );
};
