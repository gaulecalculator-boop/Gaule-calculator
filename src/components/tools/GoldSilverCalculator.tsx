/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Nepal Gold & Silver Calculator (नेपाल सुन–चाँदी आसान हिसाब)
 * Designed for rural, village, and urban users across Nepal.
 * Supports:
 * - 24K, 22K (Tejabi), 21K, 20K, 18K, 14K Gold
 * - 999, 925, 900, 800 Silver
 * - Tola, Aana, Laal, Gram, Kilogram, Compound unit input
 * - BUY & SELL modes with pure metal adjustments
 * - 4-Step Easy Mode for rural users + Advanced Mode
 * - Live FENERGOSIDA market rates with Admin Firestore update capability
 * - WhatsApp share, Save to History/Notebook, and Printable Receipt
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Scale,
  ShoppingBag,
  ArrowRightLeft,
  Share2,
  Copy,
  Save,
  RotateCcw,
  Receipt,
  Edit3,
  Check,
  TrendingUp,
  Clock,
  Shield,
  HelpCircle,
  FileText,
  DollarSign,
} from 'lucide-react';
import { Language, Currency } from '../../types';
import {
  MetalType,
  CalculationMode,
  WeightUnit,
  GOLD_PURITIES,
  SILVER_PURITIES,
  calculateGoldSilver,
  convertToGrams,
  formatNPR,
  toDevDigits,
  CalculationResult,
  GRAMS_PER_TOLA,
} from '../../utils/goldSilverEngine';
import {
  goldSilverRateManager,
  MarketRates,
} from '../../utils/goldSilverRateManager';
import { adminRoleManager } from '../../utils/adminRoleManager';
import { authManager } from '../../utils/authManager';
import { saveCalculationToHistory, saveNote } from '../../utils/storage';
import { playSuccessSound, playTapSound } from '../../utils/audio';
import { formatDateToBS } from '../../utils/nepaliCalendar';
import { ReceiptModal } from '../ReceiptModal';
import { openExternalUrl } from '../../utils/androidBridge';

interface GoldSilverCalculatorProps {
  language: Language;
  currency: Currency;
  initialMetal?: MetalType;
  onOpenNotebook?: () => void;
  showToast: (msg: string) => void;
}

export const GoldSilverCalculator: React.FC<GoldSilverCalculatorProps> = ({
  language,
  currency: _currency,
  initialMetal = 'gold',
  showToast,
  onOpenNotebook,
}) => {
  // Market rates subscription
  const [marketRates, setMarketRates] = useState<MarketRates>(
    goldSilverRateManager.getRates()
  );

  useEffect(() => {
    const unsub = goldSilverRateManager.subscribe((rates) => {
      setMarketRates(rates);
    });
    return unsub;
  }, []);

  // UI State
  const [metal, setMetal] = useState<MetalType>(initialMetal);
  const [mode, setMode] = useState<CalculationMode>('buy');
  const [isEasyMode, setIsEasyMode] = useState<boolean>(true);

  // Inputs
  const [ratePerTola, setRatePerTola] = useState<string>(
    String(marketRates.gold_rate_per_tola)
  );
  const [selectedPurity, setSelectedPurity] = useState<string>('24K');
  const [rateBasePurity, setRateBasePurity] = useState<string>('24K');

  const [weight, setWeight] = useState<string>('1');
  const [unit, setUnit] = useState<WeightUnit>('tola');

  // Compound weight inputs (Tola + Aana + Laal)
  const [compoundTola, setCompoundTola] = useState<string>('1');
  const [compoundAana, setCompoundAana] = useState<string>('0');
  const [compoundLaal, setCompoundLaal] = useState<string>('0');

  // Making charges & Extras
  const [makingChargeType, setMakingChargeType] = useState<
    'flat' | 'per_tola' | 'per_gram' | 'percent'
  >('flat');
  const [makingChargeValue, setMakingChargeValue] = useState<string>('0');
  const [otherCharges, setOtherCharges] = useState<string>('0');
  const [discount, setDiscount] = useState<string>('0');
  const [sellingDeductionPercent, setSellingDeductionPercent] = useState<string>('0');

  // Calculation output
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  // Admin Rate Editor Modal
  const [showAdminRateModal, setShowAdminRateModal] = useState<boolean>(false);
  const [adminGoldRateInput, setAdminGoldRateInput] = useState<string>(
    String(marketRates.gold_rate_per_tola)
  );
  const [adminSilverRateInput, setAdminSilverRateInput] = useState<string>(
    String(marketRates.silver_rate_per_tola)
  );
  const [adminSourceInput, setAdminSourceInput] = useState<string>(marketRates.source);
  const [adminSaving, setAdminSaving] = useState<boolean>(false);

  const canEditRates = adminRoleManager.isCalendarManager();

  // Sync rate when switching metal
  useEffect(() => {
    if (metal === 'gold') {
      setRatePerTola(String(marketRates.gold_rate_per_tola));
      setSelectedPurity('24K');
      setRateBasePurity('24K');
    } else {
      setRatePerTola(String(marketRates.silver_rate_per_tola));
      setSelectedPurity('999');
      setRateBasePurity('999');
    }
  }, [metal, marketRates]);

  // Live weight preview conversion
  const weightBreakdown = useMemo(() => {
    const numWeight = parseFloat(weight) || 0;
    const compound = {
      tola: parseFloat(compoundTola) || 0,
      aana: parseFloat(compoundAana) || 0,
      laal: parseFloat(compoundLaal) || 0,
    };
    return convertToGrams(numWeight, unit, compound);
  }, [weight, unit, compoundTola, compoundAana, compoundLaal]);

  // Execute calculation
  const handleCalculate = () => {
    playTapSound();
    try {
      const numRate = parseFloat(ratePerTola) || 0;
      const numWeight = parseFloat(weight) || 0;
      const compound = {
        tola: parseFloat(compoundTola) || 0,
        aana: parseFloat(compoundAana) || 0,
        laal: parseFloat(compoundLaal) || 0,
      };

      const res = calculateGoldSilver({
        metal,
        mode,
        ratePerTola: numRate,
        rateBasePurity,
        selectedPurity,
        weight: numWeight,
        unit,
        compoundWeight: compound,
        makingChargeType,
        makingChargeValue: parseFloat(makingChargeValue) || 0,
        otherCharges: parseFloat(otherCharges) || 0,
        discount: parseFloat(discount) || 0,
        sellingDeductionPercent: parseFloat(sellingDeductionPercent) || 0,
      });

      setResult(res);
      playSuccessSound();
    } catch (err: any) {
      showToast(err.message || 'त्रुटि: कृपया सही वजन र भाव हाल्नुहोस्');
    }
  };

  // Run calculation immediately on initial load
  useEffect(() => {
    handleCalculate();
  }, [metal, mode, isEasyMode]);

  // Reset form
  const handleReset = () => {
    playTapSound();
    setWeight('1');
    setCompoundTola('1');
    setCompoundAana('0');
    setCompoundLaal('0');
    setMakingChargeValue('0');
    setOtherCharges('0');
    setDiscount('0');
    setSellingDeductionPercent('0');
    if (metal === 'gold') {
      setRatePerTola(String(marketRates.gold_rate_per_tola));
      setSelectedPurity('24K');
    } else {
      setRatePerTola(String(marketRates.silver_rate_per_tola));
      setSelectedPurity('999');
    }
    showToast(
      language === 'ne' ? 'हिसाब रिसेट गरियो' : 'हिसाब रीसेट किया गया'
    );
  };

  // Save to History
  const handleSaveHistory = () => {
    if (!result) return;
    playTapSound();
    const summary = `${metal === 'gold' ? 'सोना (Gold)' : 'चाँदी (Silver)'} ${result.weightTola} तोला = ${formatNPR(result.finalTotal, language !== 'en')}`;
    saveCalculationToHistory({
      toolId: 'gold-silver',
      toolName: language === 'ne' ? 'सुन–चाँदी हिसाब' : 'सोना–चाँदी हिसाब',
      date: new Date().toISOString().split('T')[0],
      bsDate: formatDateToBS(new Date(), 'ne', true),
      title: `${metal === 'gold' ? 'सोना' : 'चाँदी'} (${result.purityKarat}): ${result.weightTola} तोला`,
      summary,
      amount: result.finalTotal,
      currency: 'NPR',
      details: {
        metal,
        mode,
        weightGrams: result.weightGrams,
        weightTola: result.weightTola,
        purity: result.purityKarat,
        ratePerTola: result.ratePerTola,
        rawMetalPrice: result.rawMetalPrice,
        makingCharge: result.makingCharge,
        finalTotal: result.finalTotal,
      },
    });
    playSuccessSound();
    showToast(
      language === 'ne'
        ? 'इतिहास (History) मा सेभ भयो!'
        : 'हिस्ट्री में सुरक्षित किया गया!'
    );
  };

  // Save to Notebook
  const handleSaveToNotebook = () => {
    if (!result) return;
    playTapSound();
    const title = `${metal === 'gold' ? 'सुन' : 'चाँदी'} रसिद: ${result.weightTola} तोला (${mode === 'buy' ? 'खरिद' : 'बिक्री'})`;
    const content = `धातु: ${metal === 'gold' ? 'सोना / सुन' : 'चाँदी'}\nशुद्धता: ${result.purityKarat} (${result.purityPercent}%)\nकुल वजन: ${result.weightTola} तोला (${result.weightGrams} ग्राम)\nदर प्रति तोला: रु. ${result.ratePerTola.toLocaleString('en-IN')}\nधातुको मूल्य: रु. ${result.rawMetalPrice.toLocaleString('en-IN')}\nज्याला/मजदूरी: रु. ${result.makingCharge.toLocaleString('en-IN')}\nछूट: रु. ${result.discount.toLocaleString('en-IN')}\nअन्तिम कुल रकम: ${formatNPR(result.finalTotal, true)}\nमिति: वि.सं. ${formatDateToBS(new Date(), 'ne')}`;

    saveNote({
      title,
      content,
      category: 'Shop',
    });
    playSuccessSound();
    showToast(
      language === 'ne' ? 'नोटबुकमा सुरक्षित गरियो!' : 'नोटबुक में सेव हो गया!'
    );
    if (onOpenNotebook) {
      setTimeout(onOpenNotebook, 600);
    }
  };

  // Generate WhatsApp Share Message
  const getWhatsAppReceipt = (): string => {
    if (!result) return '';
    const metalLabel = metal === 'gold' ? '🟡 सुन (Gold)' : '⚪ चाँदी (Silver)';
    const modeLabel = mode === 'buy' ? 'खरीद (Purchase)' : 'बिक्री (Sell)';
    return `💎 *नेपाल सुन–चाँदी हिसाब रसिद (GHAULE CALC)*\n` +
      `--------------------------------\n` +
      `कारोबार: ${modeLabel}\n` +
      `धातु: ${metalLabel}\n` +
      `शुद्धता: ${result.purityKarat} (${result.purityPercent}%)\n` +
      `कुल वजन: ${result.weightTola} तोला (${result.weightGrams} ग्राम)\n` +
      `विभाजन: ${result.weightDecomposed.tolas} तोला ${result.weightDecomposed.aanas} आना ${result.weightDecomposed.laals} लाल\n` +
      `दर प्रति तोला: रु. ${result.ratePerTola.toLocaleString('en-IN')}\n` +
      `धातु मूल्य: रु. ${result.rawMetalPrice.toLocaleString('en-IN')}\n` +
      (mode === 'buy'
        ? `ज्याला (Making): रु. ${result.makingCharge.toLocaleString('en-IN')}\n` +
          `अतिरिक्त शुल्क: रु. ${result.otherCharges.toLocaleString('en-IN')}\n` +
          `छूट (Discount): रु. ${result.discount.toLocaleString('en-IN')}\n`
        : `कटौती (Deduction): रु. ${result.deduction.toLocaleString('en-IN')}\n`) +
      `--------------------------------\n` +
      `*अन्तिम कुल रकम: ${formatNPR(result.finalTotal, false)}*\n` +
      `(${formatNPR(result.finalTotal, true)})\n` +
      `मिति: वि.सं. ${formatDateToBS(new Date(), 'ne')} (${new Date().toLocaleDateString('en-GB')} AD)\n` +
      `विश्वसनीय हिसाब: Ghaule Calculator App`;
  };

  const handleShareWhatsApp = () => {
    playTapSound();
    const text = encodeURIComponent(getWhatsAppReceipt());
    openExternalUrl(`https://wa.me/?text=${text}`);
  };

  const handleCopyText = () => {
    playTapSound();
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(getWhatsAppReceipt());
      setCopied(true);
      showToast(
        language === 'ne' ? 'रसिद कपी गरियो!' : 'रसीद कॉपी हो गई!'
      );
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Admin Rate Save Handler
  const handleSaveAdminRates = async () => {
    playTapSound();
    setAdminSaving(true);
    const user = authManager.getCurrentUser();
    const res = await goldSilverRateManager.updateRates(
      {
        gold_rate_per_tola: parseFloat(adminGoldRateInput) || marketRates.gold_rate_per_tola,
        silver_rate_per_tola: parseFloat(adminSilverRateInput) || marketRates.silver_rate_per_tola,
        source: adminSourceInput.trim() || marketRates.source,
        rate_type: 'manual',
      },
      user
    );
    setAdminSaving(false);
    if (res.success) {
      playSuccessSound();
      setShowAdminRateModal(false);
      showToast(
        language === 'ne'
          ? 'बजार भाव सफलतापुर्वक अपडेट भयो!'
          : 'बाजार भाव सफलतापूर्वक अपडेट हुआ!'
      );
    } else {
      showToast(res.error || 'दर अपडेट गर्न सकिएन');
    }
  };

  const isGold = metal === 'gold';

  return (
    <div className="space-y-4 pb-24 select-none font-sans">
      {/* ---------------- TOP BANNER & LIVE MARKET RATE ---------------- */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-4 rounded-3xl text-white shadow-lg border border-slate-700/80">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">💎</span>
            <div>
              <h2 className="text-sm font-black text-amber-300 tracking-tight leading-none">
                {language === 'ne'
                  ? 'नेपाल सुन–चाँदी बजार दर'
                  : language === 'hi'
                  ? 'नेपाल सोना–चाँदी बाजार भाव'
                  : 'Nepal Gold & Silver Rates'}
              </h2>
              <p className="text-[10px] text-slate-300 mt-0.5 truncate max-w-[220px]">
                {marketRates.source}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                marketRates.rate_type === 'official'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                  : 'bg-blue-950/80 text-blue-300 border-blue-500/50'
              }`}
            >
              {marketRates.rate_type === 'official'
                ? language === 'ne' ? 'आधिकारिक दर' : 'Official'
                : language === 'ne' ? 'म्यानुअल दर' : 'Manual'}
            </span>

            {canEditRates && (
              <button
                onClick={() => {
                  playTapSound();
                  setAdminGoldRateInput(String(marketRates.gold_rate_per_tola));
                  setAdminSilverRateInput(String(marketRates.silver_rate_per_tola));
                  setAdminSourceInput(marketRates.source);
                  setShowAdminRateModal(true);
                }}
                className="p-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black flex items-center gap-1 px-2 shadow-xs cursor-pointer active:scale-95 transition"
                title="Admin Rate Update"
              >
                <Edit3 className="w-3 h-3" />
                <span>{language === 'ne' ? 'दर फेर्ने' : 'Edit'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Rates Display Strip */}
        <div className="grid grid-cols-2 gap-2.5 mt-3 pt-2.5 border-t border-slate-700/60">
          <div className="bg-amber-950/40 border border-amber-500/30 p-2.5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-200">
                🟡 {language === 'ne' ? 'छापावाल सुन (24K)' : 'शुद्ध सोना (24K)'}
              </span>
              <p className="text-xs font-black text-amber-300 font-mono mt-0.5">
                रु. {marketRates.gold_rate_per_tola.toLocaleString('en-IN')}
              </p>
            </div>
            <span className="text-[10px] text-amber-400/80 font-medium">/तोला</span>
          </div>

          <div className="bg-slate-800/80 border border-slate-600/50 p-2.5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-200">
                ⚪ {language === 'ne' ? 'चाँदी (Fine 999)' : 'चाँदी (Fine 999)'}
              </span>
              <p className="text-xs font-black text-slate-100 font-mono mt-0.5">
                रु. {marketRates.silver_rate_per_tola.toLocaleString('en-IN')}
              </p>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">/तोला</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2">
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            <span>
              {goldSilverRateManager.formatLastUpdated(marketRates.updated_at, language)}
            </span>
          </span>
          <span className="text-slate-400 font-mono">
            १ तोला = ११.६६३८ ग्राम
          </span>
        </div>
      </div>

      {/* ---------------- 2 BIG CHOICES: GOLD OR SILVER ---------------- */}
      <div className="grid grid-cols-2 gap-3">
        {/* Gold Choice Card */}
        <button
          onClick={() => {
            playTapSound();
            setMetal('gold');
          }}
          className={`p-3.5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center text-center relative overflow-hidden active:scale-95 ${
            isGold
              ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30'
              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 shadow-xs'
          }`}
        >
          {isGold && (
            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-slate-950 text-amber-300 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          )}
          <span className="text-3xl mb-1 filter drop-shadow-xs">🟡</span>
          <span className="text-sm font-black tracking-tight">
            {language === 'ne'
              ? 'सुनको हिसाब'
              : language === 'hi'
              ? 'सोने का हिसाब'
              : 'Gold Calculator'}
          </span>
          <span
            className={`text-[10px] font-bold mt-0.5 ${
              isGold ? 'text-amber-950' : 'text-slate-400'
            }`}
          >
            {language === 'ne' ? '२४K, २२K, १८K गहना' : '24K, 22K, 18K Jewelry'}
          </span>
        </button>

        {/* Silver Choice Card */}
        <button
          onClick={() => {
            playTapSound();
            setMetal('silver');
          }}
          className={`p-3.5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center text-center relative overflow-hidden active:scale-95 ${
            !isGold
              ? 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-950 border-slate-400 shadow-md shadow-slate-400/30'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-xs'
          }`}
        >
          {!isGold && (
            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-slate-950 text-white flex items-center justify-center">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          )}
          <span className="text-3xl mb-1 filter drop-shadow-xs">⚪</span>
          <span className="text-sm font-black tracking-tight">
            {language === 'ne'
              ? 'चाँदीको हिसाब'
              : language === 'hi'
              ? 'चाँदी का हिसाब'
              : 'Silver Calculator'}
          </span>
          <span
            className={`text-[10px] font-bold mt-0.5 ${
              !isGold ? 'text-slate-900' : 'text-slate-400'
            }`}
          >
            {language === 'ne' ? '९९९, ९२५ स्टर्लिङ, सिक्का' : 'Fine 999, 925 Sterling'}
          </span>
        </button>
      </div>

      {/* ---------------- MODE TOGGLE: BUY (खरिद) vs SELL (बिक्री) & EASY vs ADVANCED ---------------- */}
      <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        {/* Buy / Sell Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => {
              playTapSound();
              setMode('buy');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              mode === 'buy'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>
              {language === 'ne'
                ? 'खरिद (BUY)'
                : language === 'hi'
                ? 'खरीद (BUY)'
                : 'BUY'}
            </span>
          </button>

          <button
            onClick={() => {
              playTapSound();
              setMode('sell');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              mode === 'sell'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>
              {language === 'ne'
                ? 'बिक्री (SELL)'
                : language === 'hi'
                ? 'बिक्री (SELL)'
                : 'SELL'}
            </span>
          </button>
        </div>

        {/* Easy vs Detailed Toggle */}
        <button
          onClick={() => {
            playTapSound();
            setIsEasyMode(!isEasyMode);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border flex items-center gap-1.5 ${
            isEasyMode
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : 'bg-blue-50 text-blue-900 border-blue-300'
          }`}
        >
          <span>{isEasyMode ? '⚡' : '⚙️'}</span>
          <span>
            {isEasyMode
              ? language === 'ne' ? 'सरल मोड' : 'सरल मोड'
              : language === 'ne' ? 'विस्तृत मोड' : 'विस्तृत मोड'}
          </span>
        </button>
      </div>

      {/* ---------------- CALCULATION CARD ---------------- */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/90 space-y-4">
        {/* Step Indicator Header in Easy Mode */}
        {isEasyMode && (
          <div className="p-2.5 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-amber-950 flex items-center gap-2 text-xs font-bold">
            <span className="w-5 h-5 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-xs shrink-0">
              ✓
            </span>
            <span>
              {language === 'ne'
                ? 'सरल ४-चरण: वजन र भाव हाल्नुहोस्, हिसाब तयार!'
                : 'सरल ४-चरण: वजन और भाव डालें, हिसाब तैयार!'}
            </span>
          </div>
        )}

        {/* 1. RATE INPUT */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <span>{isGold ? '🟡' : '⚪'}</span>
              <span>
                {isGold
                  ? language === 'ne' ? 'सुनको भाव (प्रति तोला रु.)' : 'सोने का भाव (प्रति तोला रु.)'
                  : language === 'ne' ? 'चाँदीको भाव (प्रति तोला रु.)' : 'चाँदी का भाव (प्रति तोला रु.)'}
              </span>
            </label>
            <button
              onClick={() => {
                playTapSound();
                setRatePerTola(
                  String(isGold ? marketRates.gold_rate_per_tola : marketRates.silver_rate_per_tola)
                );
              }}
              className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
            >
              {language === 'ne' ? 'बजार दर भर्नुहोस्' : 'बाजार भाव भरें'}
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
              रु.
            </span>
            <input
              type="number"
              value={ratePerTola}
              onChange={(e) => setRatePerTola(e.target.value)}
              placeholder="168000"
              className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-amber-500 focus:outline-none text-base font-black text-slate-900 bg-slate-50/50"
            />
          </div>
        </div>

        {/* 2. PURITY SELECTOR (In Advanced Mode or Gold) */}
        {!isEasyMode && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              {language === 'ne' ? 'शुद्धता छान्नुहोस् (Purity / Karat):' : 'शुद्धता चुनें (Purity / Karat):'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {isGold
                ? GOLD_PURITIES.map((g) => (
                    <button
                      key={g.karat}
                      onClick={() => {
                        playTapSound();
                        setSelectedPurity(g.karat);
                      }}
                      className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                        selectedPurity === g.karat
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <p className="font-black">{g.karat}</p>
                      <p className="text-[9px] opacity-80">{g.percentage}%</p>
                    </button>
                  ))
                : SILVER_PURITIES.map((s) => (
                    <button
                      key={s.code}
                      onClick={() => {
                        playTapSound();
                        setSelectedPurity(s.code);
                      }}
                      className={`p-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                        selectedPurity === s.code
                          ? 'bg-slate-700 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-black">{s.code}</p>
                      <p className="text-[9px] opacity-80">{s.percentage}%</p>
                    </button>
                  ))}
            </div>

            {/* Base Karat Clarification */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
              <span>
                {language === 'ne'
                  ? 'दर्ज भाव २४ क्यारेटको हो भने शुद्धता अनुसार स्वतः हिसाब हुनेछ।'
                  : 'दर्ज भाव २४K का है तो शुद्धता अनुपात से गणना होगी।'}
              </span>
            </div>
          </div>
        )}

        {/* 3. WEIGHT & UNIT INPUT */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {language === 'ne' ? 'तौल (वजन) हाल्नुहोस्:' : 'वजन (Weight) डालें:'}
              </span>
            </label>
            <span className="text-[10px] text-slate-500 font-medium">
              १ तोला = १६ आना = ६४ लाल
            </span>
          </div>

          {/* Unit Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(['tola', 'gram', 'aana', 'laal', 'compound', 'kilogram'] as WeightUnit[])
              .filter((u) => (isGold ? u !== 'kilogram' : true))
              .map((u) => (
                <button
                  key={u}
                  onClick={() => {
                    playTapSound();
                    setUnit(u);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                    unit === u
                      ? 'bg-slate-900 text-white border-slate-950 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {u === 'tola' && (language === 'ne' ? 'तोला (Tola)' : 'तोला')}
                  {u === 'gram' && (language === 'ne' ? 'ग्राम (Gram)' : 'ग्राम')}
                  {u === 'aana' && (language === 'ne' ? 'आना (Aana)' : 'आना')}
                  {u === 'laal' && (language === 'ne' ? 'लाल (Laal)' : 'लाल')}
                  {u === 'compound' && (language === 'ne' ? 'तोला+आना+लाल' : 'तोला+आना+लाल')}
                  {u === 'kilogram' && (language === 'ne' ? 'किलो (Kg)' : 'किलोग्राम')}
                </button>
              ))}
          </div>

          {/* Single Unit Input */}
          {unit !== 'compound' ? (
            <div className="relative">
              <input
                type="number"
                step="any"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="1"
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-amber-500 focus:outline-none text-xl font-black text-slate-900 bg-slate-50/50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">
                {unit}
              </span>
            </div>
          ) : (
            /* Compound Tola + Aana + Laal Input */
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-amber-50/60 border border-amber-200">
              <div>
                <label className="block text-[10px] font-bold text-amber-900 mb-1">
                  तोला (Tola)
                </label>
                <input
                  type="number"
                  value={compoundTola}
                  onChange={(e) => setCompoundTola(e.target.value)}
                  className="w-full p-2.5 text-center font-black rounded-xl border border-amber-300 bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-amber-900 mb-1">
                  आना (Aana)
                </label>
                <input
                  type="number"
                  max="15"
                  value={compoundAana}
                  onChange={(e) => setCompoundAana(e.target.value)}
                  className="w-full p-2.5 text-center font-black rounded-xl border border-amber-300 bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-amber-900 mb-1">
                  लाल (Laal)
                </label>
                <input
                  type="number"
                  value={compoundLaal}
                  onChange={(e) => setCompoundLaal(e.target.value)}
                  className="w-full p-2.5 text-center font-black rounded-xl border border-amber-300 bg-white text-slate-900"
                />
              </div>
            </div>
          )}

          {/* Real-time Weight Mirror (Village Taraju Helper) */}
          <div className="p-3 rounded-2xl bg-slate-100/80 border border-slate-200 text-slate-700 flex items-center justify-between text-xs font-semibold">
            <div>
              <span className="text-[10px] text-slate-500 block">कुल ग्राम:</span>
              <span className="font-bold font-mono text-slate-900">
                {weightBreakdown.totalGrams} g
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">कुल तोला:</span>
              <span className="font-bold font-mono text-slate-900">
                {weightBreakdown.totalTola} तोला
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">विभाजित:</span>
              <span className="font-bold font-mono text-amber-700">
                {weightBreakdown.tolas}T {weightBreakdown.aanas}A {weightBreakdown.laals}L
              </span>
            </div>
          </div>
        </div>

        {/* 4. MAKING CHARGES, OTHER CHARGES & DISCOUNT (Advanced Mode) */}
        {!isEasyMode && (
          <div className="space-y-3 pt-1 border-t border-slate-200/80">
            {mode === 'buy' ? (
              <>
                {/* Making Charge (मजदूरी / ज्याला) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      {language === 'ne' ? 'मजदूरी / ज्याला (Making Charge):' : 'मजदूरी (Making Charge):'}
                    </label>
                    <div className="flex items-center gap-1">
                      {(['flat', 'per_tola', 'percent'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            playTapSound();
                            setMakingChargeType(t);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            makingChargeType === t
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {t === 'flat' && 'रु.'}
                          {t === 'per_tola' && '/तोला'}
                          {t === 'percent' && '%'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    value={makingChargeValue}
                    onChange={(e) => setMakingChargeValue(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-slate-50"
                  />
                </div>

                {/* Other Charges (जर्ती, ढुङ्गा, अतिरिक्त) */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'ne' ? 'जर्ती / अन्य शुल्क (रु.):' : 'जर्ती / अन्य शुल्क:'}
                    </label>
                    <input
                      type="number"
                      value={otherCharges}
                      onChange={(e) => setOtherCharges(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'ne' ? 'छूट (Discount रु.):' : 'छूट (Discount):'}
                    </label>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-slate-50"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* SELL MODE: Deductions */
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  {language === 'ne'
                    ? 'गाल्ने नोक्सानी / जर्ती कटौती (%):'
                    : 'गालने पर कटौती / बट्टा (%):'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={sellingDeductionPercent}
                    onChange={(e) => setSellingDeductionPercent(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-slate-50"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                    %
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {language === 'ne'
                    ? 'बिक्री गर्दा ज्याला जोडिँदैन, शुद्ध धातुको मूल्यमा कटौती घटाइन्छ।'
                    : 'बिक्री में मजदूरी नहीं जुड़ती, केवल लागू कटौती घटाई जाती है।'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 5. CALCULATE & RESET BUTTONS */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleCalculate}
            className={`flex-1 py-4 px-4 rounded-2xl font-black text-sm tracking-wide text-slate-950 shadow-md transition active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 ${
              isGold
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 shadow-amber-500/25'
                : 'bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400 hover:from-slate-300 hover:to-slate-500 text-slate-950 shadow-slate-400/25'
            }`}
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>
              {language === 'ne'
                ? 'हिसाब गर्नुहोस् (Calculate)'
                : language === 'hi'
                ? 'हिसाब करें (Calculate)'
                : 'Calculate Price'}
            </span>
          </button>

          <button
            onClick={handleReset}
            className="p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer active:scale-95"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ---------------- RESULT DISPLAY CARD ---------------- */}
      {result && (
        <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-3xl p-5 text-white shadow-xl border border-slate-800 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                {mode === 'buy' ? 'खरीद हिसाब (BUY TOTAL)' : 'बिक्री हिसाब (SELL PAYOUT)'}
              </span>
              <p className="text-xs text-slate-400 mt-1">
                {isGold ? '🟡 सुन' : '⚪ चाँदी'} ({result.purityKarat}) • {result.weightTola} तोला ({result.weightGrams}g)
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-mono">
                {result.effectiveRatePerGram.toFixed(1)} / ग्राम
              </span>
            </div>
          </div>

          {/* Grand Total Highlight */}
          <div className="text-center py-2 bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 rounded-2xl border border-amber-400/30 p-4">
            <span className="text-[11px] font-bold text-amber-300 block uppercase tracking-wider">
              {mode === 'buy'
                ? language === 'ne' ? 'ग्राहकले तिर्नुपर्ने कुल रकम' : 'ग्राहक द्वारा देय कुल रकम'
                : language === 'ne' ? 'ग्राहकले पाउने कुल रकम' : 'ग्राहक को मिलने वाली रकम'}
            </span>
            <div className="text-3xl font-black text-amber-400 font-mono tracking-tight mt-1">
              {formatNPR(result.finalTotal, language !== 'en')}
            </div>
            <p className="text-[11px] text-slate-300 font-serif mt-0.5">
              ({formatNPR(result.finalTotal, true)})
            </p>
          </div>

          {/* Detailed Financial Breakdown */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span>{language === 'ne' ? 'धातुको मूल्य (Metal Value):' : 'धातु का मूल्य:'}</span>
              <span className="font-mono font-bold text-white">
                रु. {result.rawMetalPrice.toLocaleString('en-IN')}
              </span>
            </div>

            {mode === 'buy' ? (
              <>
                <div className="flex items-center justify-between text-slate-300">
                  <span>{language === 'ne' ? 'ज्याला / मजदूरी (Making):' : 'मजदूरी (Making):'}</span>
                  <span className="font-mono font-bold text-amber-300">
                    + रु. {result.makingCharge.toLocaleString('en-IN')}
                  </span>
                </div>

                {result.otherCharges > 0 && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span>{language === 'ne' ? 'जर्ती / अतिरिक्त शुल्क:' : 'अतिरिक्त शुल्क:'}</span>
                    <span className="font-mono font-bold text-amber-200">
                      + रु. {result.otherCharges.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {result.discount > 0 && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span>{language === 'ne' ? 'छूट (Discount):' : 'छूट:'}</span>
                    <span className="font-mono font-bold text-emerald-400">
                      - रु. {result.discount.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </>
            ) : (
              result.deduction > 0 && (
                <div className="flex items-center justify-between text-slate-300">
                  <span>{language === 'ne' ? 'कटौती / जर्ती (Deduction):' : 'कटौती / बट्टा:'}</span>
                  <span className="font-mono font-bold text-rose-400">
                    - रु. {result.deduction.toLocaleString('en-IN')}
                  </span>
                </div>
              )
            )}

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
              <span>शुद्ध धातु (Pure Content):</span>
              <span className="font-mono text-slate-200">
                {result.pureMetalGrams} g ({result.pureMetalTola} तोला)
              </span>
            </div>
          </div>

          {/* Action Buttons: WhatsApp, Receipt, Save, Copy */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <button
              onClick={handleShareWhatsApp}
              className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-xs cursor-pointer active:scale-95 transition"
            >
              <Share2 className="w-4 h-4" />
              <span className="text-[10px]">WhatsApp</span>
            </button>

            <button
              onClick={() => {
                playTapSound();
                setShowReceiptModal(true);
              }}
              className="p-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-xs cursor-pointer active:scale-95 transition"
            >
              <Receipt className="w-4 h-4" />
              <span className="text-[10px]">रसिद</span>
            </button>

            <button
              onClick={handleSaveHistory}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-xs cursor-pointer active:scale-95 transition"
            >
              <Save className="w-4 h-4" />
              <span className="text-[10px]">सेभ</span>
            </button>

            <button
              onClick={handleCopyText}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-xs cursor-pointer active:scale-95 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="text-[10px]">{copied ? 'Copied' : 'कपी'}</span>
            </button>
          </div>

          {/* Quick Notebook Link */}
          <button
            onClick={handleSaveToNotebook}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>नोटबुकमा रसिद राख्नुहोस् (Save Note)</span>
          </button>
        </div>
      )}

      {/* ---------------- UNIVERSAL RECEIPT & BILL MODAL ---------------- */}
      {showReceiptModal && result && (
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          moduleType="gold_silver"
          title={`नेपाल सुन–चाँदी हिसाब (${metal === 'gold' ? 'सुन' : 'चाँदी'} - ${result.purityKarat})`}
          totalAmountText={formatNPR(result.finalTotal, false)}
          initialDiscount={mode === 'buy' ? result.discount : 0}
          initialPaidAmount={result.finalTotal}
          items={[
            {
              label: `${metal === 'gold' ? 'सुन धातु' : 'चाँदी धातु'} (${result.purityKarat}) - ${mode === 'buy' ? 'खरिद' : 'बिक्री'}`,
              value: `रु ${result.rawMetalPrice.toLocaleString('en-IN')}`,
              quantity: result.weightTola,
              unit: 'तोला',
              rate: result.ratePerTola,
              subtotal: result.rawMetalPrice,
              details: `तौल: ${result.weightDecomposed.tolas} तोला ${result.weightDecomposed.aanas} आना ${result.weightDecomposed.laals} लाल (${result.weightGrams}g) @ रु ${result.ratePerTola.toLocaleString('en-IN')}/तोला`,
            },
            ...(mode === 'buy' && result.makingCharge > 0
              ? [
                  {
                    label: 'गहना ज्याला (Making Charge)',
                    value: `रु ${result.makingCharge.toLocaleString('en-IN')}`,
                    quantity: 1,
                    unit: 'गहना',
                    rate: result.makingCharge,
                    subtotal: result.makingCharge,
                  },
                ]
              : []),
            ...(mode === 'buy' && result.otherCharges > 0
              ? [
                  {
                    label: 'जर्ती तथा अन्य शुल्क (Jarti & Charges)',
                    value: `रु ${result.otherCharges.toLocaleString('en-IN')}`,
                    quantity: 1,
                    unit: 'शुल्क',
                    rate: result.otherCharges,
                    subtotal: result.otherCharges,
                  },
                ]
              : []),
            ...(mode === 'sell' && result.deduction > 0
              ? [
                  {
                    label: 'कटौती रकम (Deductions)',
                    value: `- रु ${result.deduction.toLocaleString('en-IN')}`,
                    quantity: 1,
                    unit: 'कटौती',
                    rate: -result.deduction,
                    subtotal: -result.deduction,
                  },
                ]
              : []),
          ]}
          note="GHAULE CALCULATOR 100% Offline Gold & Silver Billing"
          language={language}
        />
      )}

      {/* ---------------- ADMIN RATE EDITOR MODAL ---------------- */}
      {showAdminRateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="text-center border-b pb-3 border-slate-200">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-1">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                {language === 'ne'
                  ? 'सुन–चाँदी बजार दर सम्पादन (Admin)'
                  : 'सोना–चाँदी बाजार भाव सम्पादन'}
              </h3>
              <p className="text-xs text-slate-500">
                Authorized Super Admin &amp; Manager Only
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  🟡 सुन २४ क्यारेट दर (रु. प्रति तोला):
                </label>
                <input
                  type="number"
                  value={adminGoldRateInput}
                  onChange={(e) => setAdminGoldRateInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  ⚪ चाँदी ९९९ दर (रु. प्रति तोला):
                </label>
                <input
                  type="number"
                  value={adminSilverRateInput}
                  onChange={(e) => setAdminSilverRateInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  दर स्रोत (Source Label):
                </label>
                <input
                  type="text"
                  value={adminSourceInput}
                  onChange={(e) => setAdminSourceInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-900 bg-slate-50"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleSaveAdminRates}
                disabled={adminSaving}
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{adminSaving ? 'सुरक्षित गर्दै...' : 'नयाँ दर प्रकाशित गर्नुहोस्'}</span>
              </button>

              <button
                onClick={() => setShowAdminRateModal(false)}
                className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                रद्द गर्नुहोस् (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
