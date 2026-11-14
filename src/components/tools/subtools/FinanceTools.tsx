import React, { useState } from 'react';
import {
  RotateCcw,
  Copy,
  Save,
  Receipt as ReceiptIcon,
  Zap,
  Building,
  Landmark,
  ArrowRightLeft,
  Percent,
} from 'lucide-react';
import { Language, Currency, CalculatorMeta } from '../../../types';
import { translations } from '../../../data/translations';
import { getToolName, getToolDesc } from '../../../data/calculatorList';
import { formatCurrency, toDevanagari } from '../../../utils/nepaliCalendar';
import { playSuccessSound, playTapSound } from '../../../utils/audio';
import { saveCalculationToHistory } from '../../../utils/storage';
import { ReceiptModal } from '../../ReceiptModal';

interface FinanceToolsProps {
  tool: CalculatorMeta;
  language: Language;
  currency: Currency;
  showToast: (msg: string) => void;
}

export const FinanceTools: React.FC<FinanceToolsProps> = ({
  tool,
  language,
  currency,
  showToast,
}) => {
  const t = translations[language];
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    title: string;
    totalAmountText: string;
    items: Array<{ label: string; value: string | number; quantity?: number | string; unit?: string; rate?: number; subtotal: number; details?: string }>;
    note?: string;
  }>({
    title: 'वित्त तथा ऋण हिसाब बिल',
    totalAmountText: 'रु ०',
    items: [],
  });

  const openFinanceReceipt = (
    title: string,
    totalText: string,
    items: Array<{ label: string; value: string | number; quantity?: number | string; unit?: string; rate?: number; subtotal: number; details?: string }>,
    note: string
  ) => {
    playTapSound();
    setReceiptData({
      title,
      totalAmountText: totalText,
      items,
      note,
    });
    setIsReceiptOpen(true);
  };

  // EMI State (Home > EMI Calculator defaults: 12,00,000 | 16 Yrs | 8.6%)
  const [emiPrincipal, setEmiPrincipal] = useState<number>(1200000);
  const [emiRate, setEmiRate] = useState<number>(8.6); // annual %
  const [emiTenureYears, setEmiTenureYears] = useState<number>(16);

  // SIP Calculator State
  const [sipPeriod, setSipPeriod] = useState<'annually' | 'monthly' | 'quarterly' | 'half_yearly'>('annually');
  const [sipAmount, setSipAmount] = useState<number>(120000);
  const [sipRate, setSipRate] = useState<number>(12);
  const [sipYears, setSipYears] = useState<number>(10);

  // FD Calculator State
  const [fdPrincipal, setFdPrincipal] = useState<number>(500000);
  const [fdRate, setFdRate] = useState<number>(8.5);
  const [fdTenureYears, setFdTenureYears] = useState<number>(5);
  const [fdCompounding, setFdCompounding] = useState<1 | 2 | 4 | 12>(4);

  // VAT State
  const [vatAmount, setVatAmount] = useState<number>(10000);
  const [vatMode, setVatMode] = useState<'add' | 'extract'>('add');

  // NPR to INR State
  const [currencyAmount, setCurrencyAmount] = useState<number>(1000);
  const [nprToInrMode, setNprToInrMode] = useState<'nprToInr' | 'inrToNpr'>('nprToInr');
  const [customBatta, setCustomBatta] = useState<number>(1.60);

  // NEA Electricity Bill State
  const [neaUnits, setNeaUnits] = useState<number>(85);
  const [neaPhase, setNeaPhase] = useState<'5A' | '15A' | '30A'>('5A');

  // Income Tax State
  const [monthlySalary, setMonthlySalary] = useState<number>(75000);
  const [maritalStatus, setMaritalStatus] = useState<'single' | 'married'>('single');
  const [citDeduction, setCitDeduction] = useState<number>(0); // Provident Fund / CIT deduction

  // Land Valuation State
  const [landAreaUnits, setLandAreaUnits] = useState<'aana' | 'kattha'>('aana');
  const [landUnitsCount, setLandUnitsCount] = useState<number>(4); // e.g. 4 Aana
  const [govtMalpotRate, setGovtMalpotRate] = useState<number>(1500000); // 15 Lakh per Aana / Kattha
  const [marketRate, setMarketRate] = useState<number>(3500000); // 35 Lakh per Aana / Kattha

  // 1. EMI Calculation (Exact unrounded EMI before computing total payable)
  const emiMonths = Math.max(0, Math.round(emiTenureYears * 12));
  const r = Math.max(0, emiRate) / (12 * 100);
  const emiExact =
    emiPrincipal <= 0 || emiMonths <= 0
      ? 0
      : r === 0
      ? emiPrincipal / emiMonths
      : (emiPrincipal * r * Math.pow(1 + r, emiMonths)) / (Math.pow(1 + r, emiMonths) - 1);
  const emiMonthly = Math.round(emiExact);
  const emiTotalPayable = Math.round(emiExact * emiMonths);
  const emiTotalInterest = Math.max(0, emiTotalPayable - emiPrincipal);

  // 1b. SIP Calculation
  const sipPeriodsPerYear =
    sipPeriod === 'annually' ? 1 : sipPeriod === 'half_yearly' ? 2 : sipPeriod === 'quarterly' ? 4 : 12;
  const sipTotalPeriods = Math.max(0, Math.round(Math.max(0, sipYears) * sipPeriodsPerYear));
  const sipPeriodRate = Math.max(0, sipRate) / 100 / sipPeriodsPerYear;
  const sipTotalInvested = Math.round(Math.max(0, sipAmount) * sipTotalPeriods);
  const sipMaturityExact =
    sipAmount <= 0 || sipTotalPeriods <= 0
      ? 0
      : sipPeriodRate === 0
      ? sipAmount * sipTotalPeriods
      : sipAmount * (((Math.pow(1 + sipPeriodRate, sipTotalPeriods) - 1) / sipPeriodRate) * (1 + sipPeriodRate));
  const sipMaturityValue = Math.round(sipMaturityExact);
  const sipEstimatedReturn = Math.max(0, sipMaturityValue - sipTotalInvested);

  // 1c. FD Calculation
  const fdPrincipalSafe = Math.max(0, fdPrincipal);
  const fdRateSafe = Math.max(0, fdRate) / 100;
  const fdYearsSafe = Math.max(0, fdTenureYears);
  const fdMaturityExact = fdPrincipalSafe * Math.pow(1 + fdRateSafe / fdCompounding, fdCompounding * fdYearsSafe);
  const fdMaturityAmount = Math.round(fdMaturityExact);
  const fdInterestEarned = Math.max(0, fdMaturityAmount - fdPrincipalSafe);

  // 2. VAT Calculation
  const vatCalculated =
    vatMode === 'add'
      ? Math.round(vatAmount * 0.13)
      : Math.round(vatAmount - vatAmount / 1.13);
  const vatFinalTotal = vatMode === 'add' ? vatAmount + vatCalculated : vatAmount;

  // 3. NPR to INR Calculation
  const nprInrResult =
    nprToInrMode === 'nprToInr'
      ? +(currencyAmount / customBatta).toFixed(2)
      : +(currencyAmount * customBatta).toFixed(2);

  // 4. NEA Bill Calculation
  const calculateNeaBill = (units: number, phase: '5A' | '15A' | '30A') => {
    let serviceCharge = phase === '5A' ? 30 : phase === '15A' ? 50 : 75;
    let energyCharge = 0;
    if (units <= 20) {
      energyCharge = units * 3;
    } else if (units <= 30) {
      energyCharge = 20 * 3 + (units - 20) * 6.5;
    } else if (units <= 50) {
      energyCharge = 20 * 3 + 10 * 6.5 + (units - 30) * 8;
    } else if (units <= 150) {
      energyCharge = 20 * 3 + 10 * 6.5 + 20 * 8 + (units - 50) * 9.5;
    } else if (units <= 250) {
      energyCharge = 20 * 3 + 10 * 6.5 + 20 * 8 + 100 * 9.5 + (units - 150) * 10;
    } else {
      energyCharge = 20 * 3 + 10 * 6.5 + 20 * 8 + 100 * 9.5 + 100 * 10 + (units - 250) * 11;
    }
    return Math.round(serviceCharge + energyCharge);
  };
  const neaTotal = calculateNeaBill(neaUnits, neaPhase);

  // 5. Income Tax Calculation (Nepal Standard Tax Slabs)
  const annualGross = monthlySalary * 12;
  const annualTaxable = Math.max(0, annualGross - citDeduction * 12);
  const calculateNepalIncomeTax = (taxableIncome: number, isMarried: boolean) => {
    let tax = 0;
    const slab1Limit = isMarried ? 600000 : 500000;
    const slab2Limit = isMarried ? 800000 : 700000;
    const slab3Limit = isMarried ? 1100000 : 1000000;
    const slab4Limit = 2000000;
    const slab5Limit = 5000000;

    // Slab 1: 1% Social Security Tax
    const slab1 = Math.min(taxableIncome, slab1Limit);
    tax += slab1 * 0.01;

    // Slab 2: 10%
    if (taxableIncome > slab1Limit) {
      const slab2 = Math.min(taxableIncome, slab2Limit) - slab1Limit;
      tax += slab2 * 0.10;
    }
    // Slab 3: 20%
    if (taxableIncome > slab2Limit) {
      const slab3 = Math.min(taxableIncome, slab3Limit) - slab2Limit;
      tax += slab3 * 0.20;
    }
    // Slab 4: 30%
    if (taxableIncome > slab3Limit) {
      const slab4 = Math.min(taxableIncome, slab4Limit) - slab3Limit;
      tax += slab4 * 0.30;
    }
    // Slab 5: 36%
    if (taxableIncome > slab4Limit) {
      const slab5 = Math.min(taxableIncome, slab5Limit) - slab4Limit;
      tax += slab5 * 0.36;
    }
    // Slab 6: 39%
    if (taxableIncome > slab5Limit) {
      const slab6 = taxableIncome - slab5Limit;
      tax += slab6 * 0.39;
    }
    return Math.round(tax);
  };
  const annualTax = calculateNepalIncomeTax(annualTaxable, maritalStatus === 'married');
  const monthlyTax = Math.round(annualTax / 12);
  const monthlyTakeHome = monthlySalary - monthlyTax - citDeduction;

  // 6. Land Valuation Calculation
  const totalGovtValue = landUnitsCount * govtMalpotRate;
  const totalMarketValue = landUnitsCount * marketRate;
  const registryTaxRate = 0.05; // 5% municipality registry fee
  const estimatedRegistryTax = Math.round(totalGovtValue * registryTaxRate);
  const valuationDifference = totalMarketValue - totalGovtValue;

  const handleSaveCurrent = (title: string, summary: string, amount: number) => {
    playSuccessSound();
    saveCalculationToHistory({
      toolId: tool.id,
      toolName: language === 'ne' ? tool.nameNe : tool.nameEn,
      date: new Date().toLocaleDateString('en-GB'),
      title,
      summary,
      amount,
      currency,
      details: {
        Tool: tool.nameEn,
        Date: new Date().toLocaleDateString('en-GB'),
      },
    });
    showToast(t.savedToast);
  };

  const handleCopyText = (text: string) => {
    playTapSound();
    navigator.clipboard.writeText(text);
    showToast(t.copiedToast);
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* Tool Header */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-extrabold text-white">
              {getToolName(tool, language)}
            </h4>
            <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.2 rounded-md">
              Finance
            </span>
          </div>
          <p className="text-xs text-blue-100 mt-0.5">
            {getToolDesc(tool, language)}
          </p>
        </div>
      </div>

      {/* 1. EMI Loan Calculator */}
      {tool.id === 'emi' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[11px] font-bold text-slate-500">
                {language === 'ne' ? 'गृह कर्जा / EMI क्याल्कुलेटर' : language === 'hi' ? 'होम / EMI कैलकुलेटर' : 'Home › EMI Calculator'}
              </span>
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  setEmiPrincipal(1200000);
                  setEmiTenureYears(16);
                  setEmiRate(8.6);
                }}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{language === 'ne' ? 'रिसेट' : 'Reset'}</span>
              </button>
            </div>

            {/* Loan Amount (NPR) 0 - 15,00,000 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center gap-2">
                <label className="text-xs font-bold text-slate-800">
                  {language === 'ne' ? 'कर्जा रकम (NPR):' : language === 'hi' ? 'लोन राशि (NPR):' : 'Loan Amount (NPR):'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={emiPrincipal}
                  onChange={(e) => setEmiPrincipal(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-36 text-right bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl py-1.5 px-2.5 text-sm font-black text-slate-900 outline-none tabular-nums"
                />
              </div>
              <input
                type="range"
                min={0}
                max={1500000}
                step={10000}
                value={Math.min(1500000, emiPrincipal)}
                onChange={(e) => setEmiPrincipal(parseFloat(e.target.value) || 0)}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400 tabular-nums">
                <span>0</span>
                <span>15,00,000</span>
              </div>
            </div>

            {/* Loan Term (years) 0 - 20 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center gap-2">
                <label className="text-xs font-bold text-slate-800">
                  {language === 'ne' ? 'कर्जा अवधि (वर्ष):' : language === 'hi' ? 'लोन अवधि (वर्ष):' : 'Loan Term (years):'}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={emiTenureYears}
                    onChange={(e) => setEmiTenureYears(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-20 text-right bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl py-1.5 px-2.5 text-sm font-black text-slate-900 outline-none tabular-nums"
                  />
                  <span className="text-xs font-bold text-slate-500">Yrs</span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={Math.min(20, emiTenureYears)}
                onChange={(e) => setEmiTenureYears(parseFloat(e.target.value) || 0)}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400 tabular-nums">
                <span>0</span>
                <span>20 Yrs</span>
              </div>
            </div>

            {/* Interest Rate (%) 0 - 20 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center gap-2">
                <label className="text-xs font-bold text-slate-800">
                  {language === 'ne' ? 'ब्याज दर (%):' : language === 'hi' ? 'ब्याज दर (%):' : 'Interest Rate (%):'}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.1}
                    value={emiRate}
                    onChange={(e) => setEmiRate(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-20 text-right bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl py-1.5 px-2.5 text-sm font-black text-slate-900 outline-none tabular-nums"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                step={0.1}
                value={Math.min(20, emiRate)}
                onChange={(e) => setEmiRate(parseFloat(e.target.value) || 0)}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-bold text-slate-400 tabular-nums">
                <span>0</span>
                <span>20%</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3.5">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {language === 'ne' ? 'मासिक किस्ता (Monthly EMI)' : language === 'hi' ? 'मासिक ईएमआई (Monthly EMI)' : 'Monthly EMI'}
              </span>
              <div className="text-3xl font-black text-amber-400 mt-0.5 tabular-nums">
                {formatCurrency(emiMonthly, currency, language)}
              </div>
            </div>

            {emiTotalPayable > 0 && (
              <div className="space-y-1">
                <div className="h-2.5 w-full rounded-full overflow-hidden bg-slate-800 flex">
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${Math.round((emiPrincipal / emiTotalPayable) * 100)}%` }}
                  />
                  <div
                    className="bg-emerald-400 h-full"
                    style={{ width: `${Math.round((emiTotalInterest / emiTotalPayable) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-300 font-semibold">
                  <span>Principal {Math.round((emiPrincipal / emiTotalPayable) * 100)}%</span>
                  <span>Interest {Math.round((emiTotalInterest / emiTotalPayable) * 100)}%</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[11px]">
                  {language === 'ne' ? 'ब्याज रकम (Interest Amount)' : 'Interest Amount'}
                </span>
                <p className="font-extrabold text-emerald-400 text-sm mt-0.5 tabular-nums">
                  {formatCurrency(emiTotalInterest, currency, language)}
                </p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[11px]">
                  {language === 'ne' ? 'कुल तिर्नुपर्ने रकम' : 'Total Amount Payable'}
                </span>
                <p className="font-extrabold text-white text-sm mt-0.5 tabular-nums">
                  {formatCurrency(emiTotalPayable, currency, language)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() =>
                  handleCopyText(
                    `Monthly EMI: ${formatCurrency(emiMonthly, currency, 'en')} | Loan: ${formatCurrency(
                      emiPrincipal,
                      currency,
                      'en'
                    )} | Interest: ${formatCurrency(emiTotalInterest, currency, 'en')} | Total Payable: ${formatCurrency(
                      emiTotalPayable,
                      currency,
                      'en'
                    )}`
                  )
                }
                className="py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{language === 'ne' ? 'कपी' : 'Copy'}</span>
              </button>
              <button
                onClick={() =>
                  handleSaveCurrent(
                    'EMI Calculator',
                    `${formatCurrency(emiMonthly, currency, 'en')}/mo (${emiTenureYears} Yrs @ ${emiRate}%)`,
                    emiMonthly
                  )
                }
                className="py-2.5 bg-slate-700 hover:bg-slate-600 active:scale-95 rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{language === 'ne' ? 'सेभ' : 'Save'}</span>
              </button>
              <button
                onClick={() =>
                  openFinanceReceipt(
                    'ऋण तथा मासिक किस्ता बिल (EMI Loan Voucher)',
                    formatCurrency(emiTotalPayable, currency, language),
                    [
                      {
                        label: 'Loan Amount (Principal)',
                        value: formatCurrency(emiPrincipal, currency, language),
                        subtotal: emiPrincipal,
                      },
                      {
                        label: 'Interest Amount',
                        value: formatCurrency(emiTotalInterest, currency, language),
                        subtotal: emiTotalInterest,
                        details: `Rate: ${emiRate}% p.a. | Term: ${emiTenureYears} Yrs (${emiMonths} mo)`,
                      },
                      {
                        label: 'Monthly EMI',
                        value: formatCurrency(emiMonthly, currency, language),
                        subtotal: emiMonthly,
                      },
                    ],
                    `Monthly EMI: ${formatCurrency(emiMonthly, currency, language)} x ${emiMonths} months`
                  )
                }
                className="py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
              >
                <ReceiptIcon className="w-3.5 h-3.5" />
                <span>{language === 'ne' ? 'रसिद' : 'Receipt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1b. SIP Calculator */}
      {tool.id === 'sip-calc' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-4">
            {/* Investment Period */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                {language === 'ne' ? 'लगानी अवधि (Investment Period):' : language === 'hi' ? 'निवेश अवधि (Investment Period):' : 'Investment Period:'}
              </label>
              <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-2xl text-[11px] font-bold">
                {(
                  [
                    { id: 'annually', en: 'Annually', ne: 'वार्षिक' },
                    { id: 'monthly', en: 'Monthly', ne: 'मासिक' },
                    { id: 'quarterly', en: 'Quarterly', ne: 'त्रैमासिक' },
                    { id: 'half_yearly', en: 'Half-Yearly', ne: 'अर्धवार्षिक' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setSipPeriod(p.id);
                    }}
                    className={`py-2 px-1 rounded-xl transition cursor-pointer ${
                      sipPeriod === p.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {language === 'ne' ? p.ne : p.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Period Investment Amount */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center gap-2">
                <label className="text-xs font-bold text-slate-800">
                  {sipPeriod === 'annually'
                    ? language === 'ne'
                      ? 'वार्षिक लगानी (Annually Investment):'
                      : 'Annually Investment:'
                    : sipPeriod === 'monthly'
                    ? language === 'ne'
                      ? 'मासिक लगानी (Monthly Investment):'
                      : 'Monthly Investment:'
                    : sipPeriod === 'quarterly'
                    ? language === 'ne'
                      ? 'त्रैमासिक लगानी (Quarterly Investment):'
                      : 'Quarterly Investment:'
                    : language === 'ne'
                    ? 'अर्धवार्षिक लगानी (Half-Yearly Investment):'
                    : 'Half-Yearly Investment:'}
                </label>
                <span className="text-xs font-black text-blue-700 tabular-nums">
                  {formatCurrency(sipAmount, currency, language)}
                </span>
              </div>
              <input
                type="number"
                min={0}
                value={sipAmount}
                onChange={(e) => setSipAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-2xl py-2.5 px-3 text-sm font-bold outline-none tabular-nums"
              />
            </div>

            {/* Expected Annual Return (%) & Year(s) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  {language === 'ne' ? 'अनुमानित वार्षिक प्रतिफल (%):' : 'Expected Annual Return (%):'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={sipRate}
                  onChange={(e) => setSipRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-2xl py-2 px-3 text-sm font-bold outline-none tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  {language === 'ne' ? 'समय अवधि Year(s):' : 'Year(s):'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={sipYears}
                  onChange={(e) => setSipYears(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-2xl py-2 px-3 text-sm font-bold outline-none tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3.5">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {language === 'ne' ? 'कुल अनुमानित रकम (Total Maturity Value)' : 'Total Future Value'}
              </span>
              <div className="text-3xl font-black text-amber-400 mt-0.5 tabular-nums">
                {formatCurrency(sipMaturityValue, currency, language)}
              </div>
            </div>

            {sipMaturityValue > 0 && (
              <div className="h-2.5 w-full rounded-full overflow-hidden bg-slate-800 flex">
                <div
                  className="bg-blue-500 h-full"
                  style={{ width: `${Math.round((sipTotalInvested / sipMaturityValue) * 100)}%` }}
                />
                <div
                  className="bg-emerald-400 h-full"
                  style={{ width: `${Math.round((sipEstimatedReturn / sipMaturityValue) * 100)}%` }}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[11px]">
                  {language === 'ne' ? 'जम्मा लगानी (Total Invested)' : 'Total Invested'}
                </span>
                <p className="font-extrabold text-white text-sm mt-0.5 tabular-nums">
                  {formatCurrency(sipTotalInvested, currency, language)}
                </p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[11px]">
                  {language === 'ne' ? 'अनुमानित लाभ (Est. Returns)' : 'Est. Returns'}
                </span>
                <p className="font-extrabold text-emerald-400 text-sm mt-0.5 tabular-nums">
                  {formatCurrency(sipEstimatedReturn, currency, language)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() =>
                  handleCopyText(
                    `SIP (${sipPeriod}): Invested ${formatCurrency(sipTotalInvested, currency, 'en')} | Returns ${formatCurrency(
                      sipEstimatedReturn,
                      currency,
                      'en'
                    )} | Total ${formatCurrency(sipMaturityValue, currency, 'en')}`
                  )
                }
                className="py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{language === 'ne' ? 'कपी' : 'Copy'}</span>
              </button>
              <button
                onClick={() =>
                  handleSaveCurrent(
                    'SIP Calculator',
                    `${sipPeriod} ${formatCurrency(sipAmount, currency, 'en')} @ ${sipRate}% for ${sipYears}y → ${formatCurrency(
                      sipMaturityValue,
                      currency,
                      'en'
                    )}`,
                    sipMaturityValue
                  )
                }
                className="py-2.5 bg-slate-700 hover:bg-slate-600 active:scale-95 rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{language === 'ne' ? 'सेभ' : 'Save'}</span>
              </button>
              <button
                onClick={() =>
                  openFinanceReceipt(
                    'SIP लगानी अनुमानित विवरण (SIP Statement)',
                    formatCurrency(sipMaturityValue, currency, language),
                    [
                      {
                        label: `Investment (${sipPeriod})`,
                        value: formatCurrency(sipAmount, currency, language),
                        subtotal: sipTotalInvested,
                        details: `${sipTotalPeriods} installments (${sipYears} years)`,
                      },
                      {
                        label: 'Expected Annual Return',
                        value: `${sipRate}% p.a.`,
                        subtotal: sipEstimatedReturn,
                        details: 'Estimated wealth gain',
                      },
                    ],
                    'Illustrative SIP projection based on user-entered expected annual return'
                  )
                }
                className="py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
              >
                <ReceiptIcon className="w-3.5 h-3.5" />
                <span>{language === 'ne' ? 'रसिद' : 'Receipt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1c. FD (Fixed Deposit) Calculator */}
      {tool.id === 'fd-calc' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-800">
                  {language === 'ne' ? 'साँवा रकम (Principal Amount):' : language === 'hi' ? 'मूलधन राशि (Principal Amount):' : 'Principal Amount:'}
                </label>
                <span className="text-xs font-black text-blue-700 tabular-nums">
                  {formatCurrency(fdPrincipal, currency, language)}
                </span>
              </div>
              <input
                type="number"
                min={0}
                value={fdPrincipal}
                onChange={(e) => setFdPrincipal(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-2xl py-2.5 px-3 text-sm font-bold outline-none tabular-nums"
              />
              <div className="flex gap-1.5 mt-2 overflow-x-auto text-xs font-bold">
                {[100000, 300000, 500000, 1000000, 2500000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setFdPrincipal(amt);
                    }}
                    className={`py-1 px-2.5 rounded-xl border text-[11px] cursor-pointer ${
                      fdPrincipal === amt ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {amt / 100000}L
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  {language === 'ne' ? 'ब्याज दर (%):' : 'Interest Rate (%):'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  step={0.1}
                  value={fdRate}
                  onChange={(e) => setFdRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-2xl py-2 px-3 text-sm font-bold outline-none tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  {language === 'ne' ? 'अवधि (Tenure Years):' : 'Tenure (Years):'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  step={0.5}
                  value={fdTenureYears}
                  onChange={(e) => setFdTenureYears(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-2xl py-2 px-3 text-sm font-bold outline-none tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                {language === 'ne' ? 'चक्रवृद्धि प्रकार (Compounding):' : 'Interest Compounding:'}
              </label>
              <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-2xl text-[11px] font-bold">
                {(
                  [
                    { val: 4, label: 'Quarterly' },
                    { val: 1, label: 'Yearly' },
                    { val: 2, label: 'Half-Yr' },
                    { val: 12, label: 'Monthly' },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.val}
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setFdCompounding(c.val);
                    }}
                    className={`py-1.5 rounded-xl transition cursor-pointer ${
                      fdCompounding === c.val ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3.5">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {language === 'ne' ? 'कुल परिपक्वता रकम (Maturity Value)' : 'Total Maturity Amount'}
              </span>
              <div className="text-3xl font-black text-amber-400 mt-0.5 tabular-nums">
                {formatCurrency(fdMaturityAmount, currency, language)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[11px]">
                  {language === 'ne' ? 'साँवा रकम (Principal)' : 'Principal Amount'}
                </span>
                <p className="font-extrabold text-white text-sm mt-0.5 tabular-nums">
                  {formatCurrency(fdPrincipalSafe, currency, language)}
                </p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[11px]">
                  {language === 'ne' ? 'कुल ब्याज (Interest Earned)' : 'Total Interest Earned'}
                </span>
                <p className="font-extrabold text-emerald-400 text-sm mt-0.5 tabular-nums">
                  {formatCurrency(fdInterestEarned, currency, language)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() =>
                  handleCopyText(
                    `FD Maturity: ${formatCurrency(fdMaturityAmount, currency, 'en')} | Principal: ${formatCurrency(
                      fdPrincipalSafe,
                      currency,
                      'en'
                    )} | Interest: ${formatCurrency(fdInterestEarned, currency, 'en')}`
                  )
                }
                className="py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{language === 'ne' ? 'कपी' : 'Copy'}</span>
              </button>
              <button
                onClick={() =>
                  handleSaveCurrent(
                    'FD Calculator',
                    `${formatCurrency(fdPrincipalSafe, currency, 'en')} @ ${fdRate}% for ${fdTenureYears}y → ${formatCurrency(
                      fdMaturityAmount,
                      currency,
                      'en'
                    )}`,
                    fdMaturityAmount
                  )
                }
                className="py-2.5 bg-slate-700 hover:bg-slate-600 active:scale-95 rounded-xl font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{language === 'ne' ? 'सेभ' : 'Save'}</span>
              </button>
              <button
                onClick={() =>
                  openFinanceReceipt(
                    'मुद्दती निक्षेप विवरण (Fixed Deposit Statement)',
                    formatCurrency(fdMaturityAmount, currency, language),
                    [
                      {
                        label: 'Principal Deposit',
                        value: formatCurrency(fdPrincipalSafe, currency, language),
                        subtotal: fdPrincipalSafe,
                      },
                      {
                        label: 'Interest Earned',
                        value: formatCurrency(fdInterestEarned, currency, language),
                        subtotal: fdInterestEarned,
                        details: `Rate: ${fdRate}% p.a. | Tenure: ${fdTenureYears} Yrs`,
                      },
                    ],
                    `Compounded ${fdCompounding}x/yr | Tenure: ${fdTenureYears} Years`
                  )
                }
                className="py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
              >
                <ReceiptIcon className="w-3.5 h-3.5" />
                <span>{language === 'ne' ? 'रसिद' : 'Receipt'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. 13% VAT Calculator */}
      {tool.id === 'vat' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
            <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => { playTapSound(); setVatMode('add'); }}
                className={`flex-1 py-2.5 rounded-xl transition ${vatMode === 'add' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'}`}
              >
                + १३% भ्याट जोड्नुहोस् (Add VAT)
              </button>
              <button
                onClick={() => { playTapSound(); setVatMode('extract'); }}
                className={`flex-1 py-2.5 rounded-xl transition ${vatMode === 'extract' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'}`}
              >
                - १३% भ्याट छुट्याउनुहोस् (Extract)
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">मूल रकम (Amount):</label>
              <input
                type="number"
                value={vatAmount}
                onChange={(e) => setVatAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2.5 px-3 text-sm font-bold outline-none"
              />
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              {vatMode === 'add' ? 'भ्याट सहित कुल रकम (Gross Total)' : 'भ्याट बाहेक खुद रकम (Net Amount)'}
            </span>
            <div className="text-3xl font-black text-amber-400">
              रु {vatFinalTotal.toLocaleString('en-IN')}
            </div>
            <div className="p-3 bg-white/5 rounded-2xl text-xs flex justify-between border border-white/10">
              <span className="text-slate-400">१३% VAT रकम:</span>
              <span className="font-bold text-emerald-400">रु {vatCalculated.toLocaleString('en-IN')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSaveCurrent('13% VAT', `रु ${vatFinalTotal} (VAT: रु ${vatCalculated})`, vatFinalTotal)}
                className="py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-xs"
              >
                हिसाब सुरक्षित गर्नुहोस्
              </button>
              <button
                onClick={() =>
                  openFinanceReceipt(
                    'नेपाल १३% भ्याट हिसाब बिल (VAT Invoice)',
                    formatCurrency(vatFinalTotal, currency, language),
                    [
                      {
                        label: vatMode === 'add' ? 'वस्तु/सेवा आधार रकम (Base Amount)' : 'कुल रकम (Gross)',
                        value: formatCurrency(vatAmount, currency, language),
                        subtotal: vatAmount,
                      },
                      {
                        label: '१३% सरकारी भ्याट (13% VAT)',
                        value: formatCurrency(vatCalculated, currency, language),
                        subtotal: vatCalculated,
                        details: vatMode === 'add' ? '१३% थप गरिएको' : '१३% समावेश भएको',
                      },
                    ],
                    'GHAULE CALCULATOR 100% Offline Tax Verified'
                  )
                }
                className="py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs flex items-center justify-center gap-1 shadow-xs"
              >
                <ReceiptIcon className="w-3.5 h-3.5" />
                <span>भ्याट बिल रसिद</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. NPR ⇄ INR Currency Converter */}
      {tool.id === 'npr-inr' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
            <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => { playTapSound(); setNprToInrMode('nprToInr'); }}
                className={`flex-1 py-2.5 rounded-xl transition ${nprToInrMode === 'nprToInr' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'}`}
              >
                नेपाली (NPR) → भारु (INR)
              </button>
              <button
                onClick={() => { playTapSound(); setNprToInrMode('inrToNpr'); }}
                className={`flex-1 py-2.5 rounded-xl transition ${nprToInrMode === 'inrToNpr' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'}`}
              >
                भारु (INR) → नेपाली (NPR)
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                {nprToInrMode === 'nprToInr' ? 'रकम (नेपाली रुपैयाँ NPR):' : 'रकम (भारतीय रुपया INR):'}
              </label>
              <input
                type="number"
                value={currencyAmount}
                onChange={(e) => setCurrencyAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2.5 px-3 text-sm font-bold outline-none"
              />
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500 font-medium">विनिमय दर (Exchange Rate):</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-700 font-bold">१ INR = </span>
                <input
                  type="number"
                  step="0.01"
                  value={customBatta}
                  onChange={(e) => setCustomBatta(parseFloat(e.target.value) || 1.6)}
                  className="w-16 bg-slate-100 border border-slate-300 rounded-lg text-center font-bold text-blue-700 py-1"
                />
                <span className="text-slate-700 font-bold">NPR</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase">परिवर्तित रकम (Converted Result)</span>
            <div className="text-3xl font-black text-amber-400">
              {nprToInrMode === 'nprToInr' ? `₹ ${nprInrResult.toLocaleString('en-IN')} INR` : `रु ${nprInrResult.toLocaleString('en-IN')} NPR`}
            </div>
            <p className="text-xs text-slate-300">
              {nprToInrMode === 'nprToInr'
                ? `रु ${currencyAmount} ÷ ${customBatta} = ₹ ${nprInrResult}`
                : `₹ ${currencyAmount} × ${customBatta} = रु ${nprInrResult}`}
            </p>
            <button
              onClick={() => handleSaveCurrent('NPR ⇄ INR', `${currencyAmount} → ${nprInrResult}`, nprInrResult)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs"
            >
              हिसाब सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}

      {/* 4. NEA Electricity Bill Calculator */}
      {tool.id === 'nea-bill' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                खपत भएको युनिट (Electricity Units):
              </label>
              <input
                type="number"
                value={neaUnits}
                onChange={(e) => setNeaUnits(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2.5 px-3 text-sm font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">घरेलु मिटर क्षमता (Phase Ampere):</label>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                {(['5A', '15A', '30A'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => { playTapSound(); setNeaPhase(p); }}
                    className={`py-2 rounded-xl border ${neaPhase === p ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700'}`}
                  >
                    {p} Capacity
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase">अनुमानित बिजुली बिल (Estimated Bill)</span>
            <div className="text-3xl font-black text-amber-400">
              रु {neaTotal.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-sky-300">
              {neaUnits} युनिट ({neaPhase} मिटर स्ल्याब दर + न्यूनतम सेवा शुल्क)
            </p>
            <button
              onClick={() => handleSaveCurrent('NEA Electricity Bill', `रु ${neaTotal} (${neaUnits} Units)`, neaTotal)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs"
            >
              हिसाब सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}

      {/* 5. Income Tax Calculator (पारिश्रमिक कर) */}
      {tool.id === 'income-tax' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-3">
            <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => { playTapSound(); setMaritalStatus('single'); }}
                className={`flex-1 py-2 rounded-xl transition ${maritalStatus === 'single' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'}`}
              >
                अविवाहित (Single)
              </button>
              <button
                onClick={() => { playTapSound(); setMaritalStatus('married'); }}
                className={`flex-1 py-2 rounded-xl transition ${maritalStatus === 'married' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'}`}
              >
                विवाहित (Married/Couple)
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">मासिक तलब (Monthly Gross Salary):</label>
              <input
                type="number"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2.5 px-3 text-sm font-bold outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">मासिक कट्टी (EPF / CIT / Insurance):</label>
              <input
                type="number"
                value={citDeduction}
                onChange={(e) => setCitDeduction(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2 px-3 text-sm font-bold outline-none"
              />
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3.5">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">मासिक आयकर (Monthly TDS Deducted)</span>
              <div className="text-3xl font-black text-rose-400 mt-0.5">
                रु {monthlyTax.toLocaleString('en-IN')} / mo
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">हात पर्ने तलब (Net Pay)</span>
                <p className="font-extrabold text-emerald-400 text-sm mt-0.5">
                  रु {monthlyTakeHome.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">वार्षिक कुल कर (Annual)</span>
                <p className="font-extrabold text-amber-300 text-sm mt-0.5">
                  रु {annualTax.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSaveCurrent('Income Tax', `TDS: रु ${monthlyTax}/mo | Net: रु ${monthlyTakeHome}`, monthlyTax)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs"
            >
              हिसाब सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}

      {/* 6. Land Valuation Calculator (जग्गा मूल्याङ्कन) */}
      {tool.id === 'land-valuation' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-3">
            <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => { playTapSound(); setLandAreaUnits('aana'); }}
                className={`flex-1 py-2 rounded-xl transition ${landAreaUnits === 'aana' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'}`}
              >
                आना (पहाडी प्रणाली)
              </button>
              <button
                onClick={() => { playTapSound(); setLandAreaUnits('kattha'); }}
                className={`flex-1 py-2 rounded-xl transition ${landAreaUnits === 'kattha' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'}`}
              >
                कठ्ठा (तराई प्रणाली)
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                जग्गाको परिणाम ({landAreaUnits === 'aana' ? 'आना' : 'कठ्ठा'}):
              </label>
              <input
                type="number"
                value={landUnitsCount}
                onChange={(e) => setLandUnitsCount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2 px-3 text-sm font-bold outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">मालपोत सरकारी दर (रु):</label>
                <input
                  type="number"
                  value={govtMalpotRate}
                  onChange={(e) => setGovtMalpotRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-2.5 text-xs font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">बजार चलनचल्ती दर (रु):</label>
                <input
                  type="number"
                  value={marketRate}
                  onChange={(e) => setMarketRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-2.5 text-xs font-bold outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3.5">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">बजार कुल मूल्याङ्कन (Market Value)</span>
              <div className="text-3xl font-black text-amber-400 mt-0.5">
                रु {totalMarketValue.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">सरकारी मालपोत मूल्य</span>
                <p className="font-extrabold text-white text-sm mt-0.5">
                  रु {totalGovtValue.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">रजिष्ट्रेसन दस्तुर (५%)</span>
                <p className="font-extrabold text-emerald-400 text-sm mt-0.5">
                  रु {estimatedRegistryTax.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSaveCurrent('Land Valuation', `Market: रु ${totalMarketValue} | Govt: रु ${totalGovtValue}`, totalMarketValue)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs"
            >
              हिसाब सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}

      {/* Universal Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        moduleType="finance_general"
        title={receiptData.title}
        totalAmountText={receiptData.totalAmountText}
        items={receiptData.items}
        note={receiptData.note}
        language={language}
      />
    </div>
  );
};
