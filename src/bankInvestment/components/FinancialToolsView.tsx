/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 15 Additional Financial Tools Suite (Persistent & Interactive Calculators)
 * 1. Credit Card Bill Manager
 * 2. Credit Card Interest Calculator
 * 3. Insurance Premium Calendar
 * 4. Tax Calculator (Nepal Income Tax + CGT)
 * 5. Bank Savings Interest Calculator
 * 6. Loan Prepayment Calculator
 * 7. Loan Balance Transfer Calculator
 * 8. EMI Comparison Calculator
 * 9. Currency Converter (Offline Editable + Optional Live FX)
 * 10. Monthly Budget Planner
 * 11. Income & Expense Tracker
 * 12. Emergency Fund Planner
 * 13. Savings Goal Planner
 * 14. Recurring Payment Manager
 * 15. Bank Deposit & Withdrawal Ledger
 */

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Currency, Language } from '../../types';
import {
  advanceDateByFrequency,
  calcBankSavingsInterest,
  calcCreditCardPayoff,
  calcEmergencyFund,
  calcLoanBalanceTransfer,
  calcLoanPrepayment,
  calcNepalIncomeTax,
  calculatePeriodicEMI,
  OFFLINE_REFERENCE_FX_RATES_PER_USD,
  round2,
} from '../calculations';
import { bankDb, makeId } from '../db';
import { addBSMonths, adTag, bsTag, formatMoney, getTodayDual, parseBSDateStr, pick5, t5 } from '../i18n';
import {
  BankAccountRecord,
  BankCalendarEventType,
  BankInvestmentDatabase,
  CreditCardBillRecord,
  CreditCardRecord,
  IncomeExpenseRecord,
  InsurancePolicyRecord,
  InsuranceType,
  RecurringPaymentRecord,
  SavingsGoalRecord,
} from '../types';
import { ConfirmDialog, DualBSDatePicker } from './ConfirmDialog';

interface FinancialToolsViewProps {
  db: BankInvestmentDatabase;
  language: Language;
  currency: Currency;
  showToast: (msg: string) => void;
}

type ToolId =
  | 'cc_manager'
  | 'cc_interest'
  | 'insurance'
  | 'tax'
  | 'savings_interest'
  | 'loan_prepayment'
  | 'balance_transfer'
  | 'emi_compare'
  | 'currency'
  | 'budget'
  | 'income_expense'
  | 'emergency_fund'
  | 'savings_goals'
  | 'recurring'
  | 'bank_ledger';

const TOOL_LIST: Array<{
  id: ToolId;
  en: string;
  hi: string;
  bho: string;
  mai: string;
  ne: string;
}> = [
  {
    id: 'cc_manager',
    en: '1. Credit Card Bill Manager',
    hi: '1. क्रेडिट कार्ड बिल प्रबंधक',
    bho: '1. क्रेडिट कार्ड बिल मैनेजर',
    mai: '1. क्रेडिट कार्ड बिल प्रबन्धक',
    ne: '१. क्रेडिट कार्ड बिल',
  },
  {
    id: 'cc_interest',
    en: '2. Credit Card Interest Calc',
    hi: '2. क्रेडिट कार्ड ब्याज कैलकुलेटर',
    bho: '2. क्रेडिट कार्ड ब्याज हिसाब',
    mai: '2. क्रेडिट कार्ड ब्याज हिसाब',
    ne: '२. क्रेडिट कार्ड ब्याज',
  },
  {
    id: 'insurance',
    en: '3. Insurance Premium Calendar',
    hi: '3. बीमा प्रीमियम कैलेंडर',
    bho: '3. बीमा प्रीमियम कैलेंडर',
    mai: '3. बीमा प्रीमियम कैलेन्डर',
    ne: '३. बीमा प्रिमियम पात्रो',
  },
  {
    id: 'tax',
    en: '4. Tax Calculator (Nepal)',
    hi: '4. आयकर कैलकुलेटर (नेपाल)',
    bho: '4. आयकर हिसाब (नेपाल)',
    mai: '4. आयकर हिसाब (नेपाल)',
    ne: '४. आयकर (Tax) हिसाब',
  },
  {
    id: 'savings_interest',
    en: '5. Bank Savings Interest',
    hi: '5. बैंक बचत खाता ब्याज',
    bho: '5. बैंक बचत खाता ब्याज',
    mai: '5. बैंक बचत खाता ब्याज',
    ne: '५. बचत खाता ब्याज',
  },
  {
    id: 'loan_prepayment',
    en: '6. Loan Prepayment',
    hi: '6. ऋण पूर्व-भुगतान',
    bho: '6. कर्जा समय से पहिले चुकाव',
    mai: '6. ऋण पूर्व-भुगतान',
    ne: '६. ऋण पूर्वभुक्तानी',
  },
  {
    id: 'balance_transfer',
    en: '7. Loan Balance Transfer',
    hi: '7. ऋण बैलेंस ट्रांसफर',
    bho: '7. कर्जा दोसर बैंक में ट्रांसफर',
    mai: '7. ऋण बैलेन्स ट्रांसफर',
    ne: '७. ऋण ट्रान्सफर लाभ',
  },
  {
    id: 'emi_compare',
    en: '8. EMI Comparison',
    hi: '8. EMI तुलना',
    bho: '8. EMI तुलना',
    mai: '8. EMI तुलना',
    ne: '८. EMI तुलना',
  },
  {
    id: 'currency',
    en: '9. Currency Converter',
    hi: '9. मुद्रा विनिमय',
    bho: '9. मुद्रा बदलल (Currency)',
    mai: '9. मुद्रा विनिमय',
    ne: '९. मुद्रा विनिमय',
  },
  {
    id: 'budget',
    en: '10. Monthly Budget Planner',
    hi: '10. मासिक बजट योजना',
    bho: '10. महीना के बजट योजना',
    mai: '10. मासिक बजट योजना',
    ne: '१०. मासिक बजेट',
  },
  {
    id: 'income_expense',
    en: '11. Income & Expense Tracker',
    hi: '11. आय और खर्च ट्रैकर',
    bho: '11. आमदनी आ खरच खाता',
    mai: '11. आय आ खर्च खाता',
    ne: '११. आय र खर्च खाता',
  },
  {
    id: 'emergency_fund',
    en: '12. Emergency Fund Planner',
    hi: '12. आपातकालीन फंड योजना',
    bho: '12. इमरजेंसी फंड योजना',
    mai: '12. आपातकालीन कोष योजना',
    ne: '१२. आपत्कालीन कोष',
  },
  {
    id: 'savings_goals',
    en: '13. Savings Goal Planner',
    hi: '13. बचत लक्ष्य योजना',
    bho: '13. बचत लक्ष्य योजना',
    mai: '13. बचत लक्ष्य योजना',
    ne: '१३. बचत लक्ष्य',
  },
  {
    id: 'recurring',
    en: '14. Recurring Payment Manager',
    hi: '14. नियमित भुगतान प्रबंधक',
    bho: '14. नियमित भुगतान मैनेजर',
    mai: '14. नियमित भुगतान प्रबन्धक',
    ne: '१४. नियमित भुक्तानी',
  },
  {
    id: 'bank_ledger',
    en: '15. Bank Deposit & Withdrawal Ledger',
    hi: '15. बैंक जमा और निकासी खाता',
    bho: '15. बैंक जमा आ निकासी खाता',
    mai: '15. बैंक जमा आ निकासी खाता',
    ne: '१५. बैंक खाता लेजर',
  },
];

export const FinancialToolsView: React.FC<FinancialToolsViewProps> = ({
  db,
  language,
  currency,
  showToast,
}) => {
  const today = getTodayDual();
  const [activeTool, setActiveTool] = useState<ToolId>('cc_manager');
  const [mobileDetail, setMobileDetail] = useState(false);
  const [confirmDel, setConfirmDel] = useState<{ title: string; msg: string; onConfirm: () => void } | null>(null);

  // 1. Credit Card Bill Manager State
  const [ccName, setCcName] = useState('');
  const [ccBank, setCcBank] = useState('');
  const [ccLimit, setCcLimit] = useState(100000);
  const [ccDueDay, setCcDueDay] = useState(25);
  const [ccApr, setCcApr] = useState(24);
  const [billCardId, setBillCardId] = useState('');
  const [billAmount, setBillAmount] = useState(12000);
  const [billMinDue, setBillMinDue] = useState(600);
  const [billDueBS, setBillDueBS] = useState(today.bsStr);
  const [billDueAD, setBillDueAD] = useState(today.adStr);

  // 2. Credit Card Interest Calc
  const [ccBal, setCcBal] = useState(50000);
  const [ccCalcApr, setCcCalcApr] = useState(24);
  const [ccMonthlyPay, setCcMonthlyPay] = useState(3000);

  // 3. Insurance Premium Calendar
  const [insName, setInsName] = useState('');
  const [insComp, setInsComp] = useState('');
  const [insType, setInsType] = useState<InsuranceType>('life');
  const [insSum, setInsSum] = useState(1000000);
  const [insPrem, setInsPrem] = useState(25000);
  const [insFreq, setInsFreq] = useState<InsurancePolicyRecord['frequency']>('yearly');
  const [insDueBS, setInsDueBS] = useState(today.bsStr);
  const [insDueAD, setInsDueAD] = useState(today.adStr);

  // 4. Tax Calculator
  const [taxIncome, setTaxIncome] = useState(900000);
  const [taxStatus, setTaxStatus] = useState<'single' | 'couple'>('single');
  const [taxPf, setTaxPf] = useState(60000);
  const [taxCit, setTaxCit] = useState(0);
  const [taxIns, setTaxIns] = useState(20000);
  const [taxFemale, setTaxFemale] = useState(false);

  // 5. Savings Interest
  const [savBal, setSavBal] = useState(300000);
  const [savRate, setSavRate] = useState(5.5);
  const [savDays, setSavDays] = useState(90);
  const [savTds, setSavTds] = useState(6);

  // 6. Loan Prepayment
  const [prePrin, setPrePrin] = useState(1500000);
  const [preRate, setPreRate] = useState(11);
  const [preMos, setPreMos] = useState(120);
  const [preLump, setPreLump] = useState(200000);
  const [preExtraMo, setPreExtraMo] = useState(3000);

  // 7. Loan Balance Transfer
  const [btPrin, setBtPrin] = useState(1800000);
  const [btOldRate, setBtOldRate] = useState(12);
  const [btNewRate, setBtNewRate] = useState(9.75);
  const [btMos, setBtMos] = useState(96);
  const [btFee, setBtFee] = useState(15000);

  // 8. EMI Comparison
  const [cmpAmtA, setCmpAmtA] = useState(1000000);
  const [cmpRateA, setCmpRateA] = useState(10.5);
  const [cmpMosA, setCmpMosA] = useState(60);
  const [cmpFeeA, setCmpFeeA] = useState(10000);
  const [cmpAmtB, setCmpAmtB] = useState(1000000);
  const [cmpRateB, setCmpRateB] = useState(11.2);
  const [cmpMosB, setCmpMosB] = useState(60);
  const [cmpFeeB, setCmpFeeB] = useState(0);

  // 9. Currency Converter
  const [fxRates, setFxRates] = useState<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    Object.entries(OFFLINE_REFERENCE_FX_RATES_PER_USD).forEach(([k, v]) => {
      out[k] = v.ratePerUsd;
    });
    return out;
  });
  const [fxAmount, setFxAmount] = useState(100);
  const [fxFrom, setFxFrom] = useState('USD');
  const [fxTo, setFxTo] = useState('NPR');
  const [fxLiveDate, setFxLiveDate] = useState<string | null>(null);
  const [fxLoading, setFxLoading] = useState(false);

  // 10. Monthly Budget Planner
  const [bdgCategory, setBdgCategory] = useState('Groceries & Milk');
  const [bdgLimit, setBdgLimit] = useState(15000);

  // 11. Income & Expense Tracker
  const [ieType, setIeType] = useState<'income' | 'expense'>('expense');
  const [ieCat, setIeCat] = useState('Groceries & Milk');
  const [ieAmt, setIeAmt] = useState(1500);
  const [ieBS, setIeBS] = useState(today.bsStr);
  const [ieAD, setIeAD] = useState(today.adStr);
  const [ieMethod, setIeMethod] = useState<IncomeExpenseRecord['paymentMethod']>('cash');
  const [ieNote, setIeNote] = useState('');
  const [ieFilter, setIeFilter] = useState<'all' | 'income' | 'expense'>('all');

  // 12. Emergency Fund
  const [efMonthly, setEfMonthly] = useState(35000);
  const [efMonths, setEfMonths] = useState(6);
  const [efSaved, setEfSaved] = useState(80000);
  const [efCap, setEfCap] = useState(10000);

  // 13. Savings Goals
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState(500000);
  const [goalSaved, setGoalSaved] = useState(50000);
  const [goalBS, setGoalBS] = useState(addBSMonths(today.bsStr, 12).bsStr);
  const [goalAD, setGoalAD] = useState(addBSMonths(today.bsStr, 12).adStr);
  const [goalContribAmt, setGoalContribAmt] = useState<Record<string, number>>({});

  // 14. Recurring Payment
  const [recTitle, setRecTitle] = useState('');
  const [recCat, setRecCat] = useState<BankCalendarEventType>('custom');
  const [recAmt, setRecAmt] = useState(2000);
  const [recFreq, setRecFreq] = useState<RecurringPaymentRecord['frequency']>('monthly');
  const [recBS, setRecBS] = useState(today.bsStr);
  const [recAD, setRecAD] = useState(today.adStr);

  // 15. Bank Deposit & Withdrawal Ledger
  const [bkName, setBkName] = useState('');
  const [bkNick, setBkNick] = useState('');
  const [bkType, setBkType] = useState<BankAccountRecord['accountType']>('savings');
  const [bkOpen, setBkOpen] = useState(50000);
  const [bkRate, setBkRate] = useState(5.5);
  const [bkMatBS, setBkMatBS] = useState('');
  const [bkMatAD, setBkMatAD] = useState('');
  const [bkMatAmt, setBkMatAmt] = useState<number>(0);
  const [txAccId, setTxAccId] = useState('');
  const [txKind, setTxKind] = useState<'deposit' | 'withdrawal' | 'interest_credit'>('deposit');
  const [txAmt, setTxAmt] = useState(5000);
  const [txBS, setTxBS] = useState(today.bsStr);
  const [txAD, setTxAD] = useState(today.adStr);
  const [txNote, setTxNote] = useState('');

  const curBsMonthPrefix = `${today.bsYear}-${String(today.bsMonth).padStart(2, '0')}`;

  const fxConverted = useMemo(() => {
    const rFrom = fxRates[fxFrom] || 1;
    const rTo = fxRates[fxTo] || 1;
    return round2((fxAmount / rFrom) * rTo);
  }, [fxAmount, fxFrom, fxRates, fxTo]);

  const handleFetchFx = async () => {
    setFxLoading(true);
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error('HTTP error');
      const data = await res.json();
      if (data?.rates && data.rates.NPR) {
        const next: Record<string, number> = { ...fxRates };
        Object.keys(OFFLINE_REFERENCE_FX_RATES_PER_USD).forEach((k) => {
          if (typeof data.rates[k] === 'number') next[k] = data.rates[k];
        });
        setFxRates(next);
        setFxLiveDate(today.bsStr);
        showToast(
          t5(
            language,
            'Updated exchange rates',
            'विनिमय दरें अपडेट की गईं',
            'मुद्रा दर अपडेट भइल',
            'विनिमय दर अपडेट भेल',
            'विनिमय दर अद्यावधिक भयो'
          )
        );
      } else {
        throw new Error('Unexpected response');
      }
    } catch {
      showToast(
        t5(
          language,
          'Offline or API unavailable — using local FX rates',
          'ऑफलाइन या API उपलब्ध नहीं — स्थानीय दरें उपयोग में हैं',
          'ऑफलाइन भा API बंद बा — लोकल दर लागू बा',
          'ऑफलाइन वा API उपलब्ध नहि — स्थानीय दर उपयोग मे अछि',
          'अफलाइन वा API उपलब्ध छैन — स्थानीय दर प्रयोग भइरहेको छ'
        )
      );
    } finally {
      setFxLoading(false);
    }
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'yearly':
        return t5(language, 'Yearly', 'वार्षिक', 'सालाना', 'वार्षिक', 'वार्षिक');
      case 'half_yearly':
        return t5(language, 'Half-Yearly', 'अर्ध-वार्षिक', 'छह माही', 'अर्ध-वार्षिक', 'अर्धवार्षिक');
      case 'quarterly':
        return t5(language, 'Quarterly', 'तिमाही', 'तिमाही', 'तिमाही', 'त्रैमासिक');
      case 'weekly':
        return t5(language, 'Weekly', 'साप्ताहिक', 'हफ्ता के', 'साप्ताहिक', 'साप्ताहिक');
      default:
        return t5(language, 'Monthly', 'मासिक', 'महीना के', 'मासिक', 'मासिक');
    }
  };

  const getPaymentMethodLabel = (m: string) => {
    switch (m) {
      case 'cash':
        return t5(language, 'Cash', 'नकद', 'नगद', 'नगद', 'नगद');
      case 'bank':
        return t5(language, 'Bank', 'बैंक', 'बैंक', 'बैंक', 'बैंक');
      case 'card':
        return t5(language, 'Card', 'कार्ड', 'कार्ड', 'कार्ड', 'कार्ड');
      case 'esewa':
        return 'eSewa';
      case 'khalti':
        return 'Khalti';
      default:
        return m;
    }
  };

  const getBankTxTypeLabel = (type: string) => {
    switch (type) {
      case 'deposit':
        return t5(language, 'Deposit (+)', 'जमा (+)', 'जमा (+)', 'जमा (+)', 'जम्मा (+)');
      case 'withdrawal':
        return t5(language, 'Withdrawal (-)', 'निकासी (-)', 'निकासी (-)', 'निकासी (-)', 'झिकिएको (-)');
      default:
        return t5(language, 'Interest Credit (+)', 'ब्याज क्रेडिट (+)', 'ब्याज जमा (+)', 'ब्याज जमा (+)', 'ब्याज जम्मा (+)');
    }
  };

  const renderToolWorkspace = () => {
    switch (activeTool) {
      case 'cc_manager': {
        return (
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!ccName.trim() || !ccBank.trim()) return;
                bankDb.upsertCreditCard({
                  cardName: ccName.trim(),
                  bankName: ccBank.trim(),
                  creditLimit: ccLimit,
                  billingCycleDay: 1,
                  dueDay: ccDueDay,
                  aprPercent: ccApr,
                });
                setCcName('');
                setCcBank('');
                showToast(
                  t5(language, 'Credit card added', 'क्रेडिट कार्ड जोड़ा गया', 'क्रेडिट कार्ड जोड़ल गइल', 'क्रेडिट कार्ड जोड़ल गेल', 'क्रेडिट कार्ड थपियो')
                );
              }}
              className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200"
            >
              <input
                type="text"
                required
                value={ccName}
                onChange={(e) => setCcName(e.target.value)}
                placeholder={t5(language, 'Card Name', 'कार्ड का नाम', 'कार्ड के नाम', 'कार्डक नाम', 'कार्डको नाम')}
                className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
              <input
                type="text"
                required
                value={ccBank}
                onChange={(e) => setCcBank(e.target.value)}
                placeholder={t5(language, 'Bank', 'बैंक', 'बैंक', 'बैंक', 'बैंक')}
                className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
              <input
                type="number"
                value={ccLimit}
                onChange={(e) => setCcLimit(Number(e.target.value))}
                placeholder={t5(language, 'Limit', 'लिमिट', 'लिमिट', 'सीमा', 'सीमा')}
                className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs tabular-nums"
              />
              <input
                type="number"
                min={1}
                max={31}
                value={ccDueDay}
                onChange={(e) => setCcDueDay(Number(e.target.value))}
                placeholder={t5(language, 'Due Day', 'देय दिन', 'जमा तारीख', 'देय दिन', 'देय दिन')}
                className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs tabular-nums"
              />
              <button
                type="submit"
                className="min-h-[38px] px-3 bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {t5(language, '+ Add Card', '+ कार्ड जोड़ें', '+ कार्ड जोड़ीं', '+ कार्ड जोड़ू', '+ कार्ड थप्नुहोस्')}
              </button>
            </form>

            {db.creditCards.length > 0 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const cid = billCardId || db.creditCards[0]?.id;
                  if (!cid || billAmount <= 0) return;
                  const p = parseBSDateStr(billDueBS);
                  bankDb.addCreditCardBill({
                    cardId: cid,
                    statementMonthBS: `${p.year}-${String(p.month).padStart(2, '0')}`,
                    dueDateBS: billDueBS,
                    dueDateAD: billDueAD,
                    billAmount,
                    minimumDue: billMinDue,
                    paidAmount: 0,
                    isPaid: false,
                  });
                  showToast(
                    t5(
                      language,
                      'Credit card bill scheduled & linked to Calendar',
                      'क्रेडिट कार्ड बिल कैलेंडर से जुड़ गया',
                      'क्रेडिट कार्ड बिल कैलेंडर से जुड़ गइल',
                      'क्रेडिट कार्ड बिल कैलेन्डर सँ जुड़ल',
                      'क्रेडिट कार्ड बिल पात्रोमा थपियो'
                    )
                  );
                }}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5"
              >
                <div className="text-xs font-bold text-slate-800">
                  {t5(language, 'Add Statement / Bill Due', 'स्टेटमेंट / बिल जोड़ें', 'बिल आ स्टेटमेंट जोड़ीं', 'स्टेटमेन्ट / बिल जोड़ू', 'स्टेटमेन्ट / बिल थप्नुहोस्')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={billCardId || db.creditCards[0]?.id}
                    onChange={(e) => setBillCardId(e.target.value)}
                    className="min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                  >
                    {db.creditCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.cardName} ({c.bankName})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={billAmount}
                    onChange={(e) => setBillAmount(Number(e.target.value))}
                    placeholder={t5(language, 'Bill Amount', 'बिल राशि', 'बिल रकम', 'बिल राशि', 'बिल रकम')}
                    className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums"
                  />
                  <input
                    type="number"
                    min={0}
                    value={billMinDue}
                    onChange={(e) => setBillMinDue(Number(e.target.value))}
                    placeholder={t5(language, 'Minimum Due', 'न्यूनतम देय', 'कम से कम देय', 'न्यूनतम देय', 'न्यूनतम देय')}
                    className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums"
                  />
                </div>
                <DualBSDatePicker
                  label={t5(language, 'Bill Due Date', 'बिल देय तिथि', 'बिल जमा तारीख', 'बिल देय तिथि', 'बिल बुझाउने मिति')}
                  bsDate={billDueBS}
                  adDate={billDueAD}
                  language={language}
                  onChange={(b, a) => {
                    setBillDueBS(b);
                    setBillDueAD(a);
                  }}
                />
                <button
                  type="submit"
                  className="min-h-[38px] px-4 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {t5(language, 'Save Statement Bill', 'बिल सुरक्षित करें', 'बिल सेव करीं', 'बिल सुरक्षित करू', 'बिल सुरक्षित गर्नुहोस्')}
                </button>
              </form>
            )}

            <div className="space-y-2">
              {db.creditCards.map((card: CreditCardRecord) => (
                <div key={card.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{card.cardName}</div>
                    <div className="text-[11px] text-slate-500">
                      {card.bankName} • {t5(language, 'Limit:', 'लिमिट:', 'लिमिट:', 'सीमा:', 'सीमा:')} {formatMoney(card.creditLimit, currency, language)} • {t5(language, 'Due Day', 'देय दिन', 'जमा दिन', 'देय दिन', 'देय दिन')} {card.dueDay}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmDel({
                        title: t5(language, 'Delete Credit Card', 'क्रेडिट कार्ड हटाएं', 'क्रेडिट कार्ड हटाईं', 'क्रेडिट कार्ड हटाउ', 'क्रेडिट कार्ड हटाउनुहोस्'),
                        msg: t5(
                          language,
                          `Delete "${card.cardName}" and its bills?`,
                          `"${card.cardName}" और इसके बिल हटाएं?`,
                          `"${card.cardName}" आ एकर बिल हटाईं?`,
                          `"${card.cardName}" आ एकर बिल हटाउ?`,
                          `"${card.cardName}" र यसका बिलहरू हटाउने?`
                        ),
                        onConfirm: () => bankDb.deleteCreditCard(card.id),
                      })
                    }
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {db.creditCardBills.map((bill: CreditCardBillRecord) => {
                const c = db.creditCards.find((x) => x.id === bill.cardId);
                return (
                  <div key={bill.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">
                        {c?.cardName || t5(language, 'Card', 'कार्ड', 'कार्ड', 'कार्ड', 'कार्ड')} • {t5(language, 'Due', 'देय', 'जमा तारीख', 'देय', 'देय')} {bill.dueDateBS} {bsTag(language)} ({bill.dueDateAD} {adTag(language)})
                      </div>
                      <div className="text-[11px] text-slate-500 tabular-nums">
                        {t5(language, 'Bill:', 'बिल:', 'बिल:', 'बिल:', 'बिल:')} {formatMoney(bill.billAmount, currency, language)} • {t5(language, 'Min Due:', 'न्यूनतम:', 'कम से कम:', 'न्यूनतम:', 'न्यूनतम:')} {formatMoney(bill.minimumDue, currency, language)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {bill.isPaid ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                          {t5(language, 'Paid', 'चुक्ता', 'देवल', 'चुक्ता', 'तिरेको')} ({bill.paidDateBS})
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            bankDb.confirmCreditCardBillPaid(bill.id, bill.billAmount);
                            showToast(t5(language, 'Card bill marked Paid', 'कार्ड बिल चुक्ता चिह्नित', 'कार्ड बिल चुक्ता भइल', 'कार्ड बिल चुक्ता चिन्हित', 'कार्ड बिल तिरेको चिन्ह लगाइयो'));
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] cursor-pointer"
                        >
                          {t5(language, 'Confirm Paid', 'भुक्तान पुष्टि', 'जमा भइल', 'भुगतान पुष्टि', 'तिरेको पुष्टि')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDel({
                            title: t5(language, 'Delete Card Bill', 'कार्ड बिल हटाएं', 'कार्ड बिल हटाईं', 'कार्ड बिल हटाउ', 'कार्ड बिल हटाउनुहोस्'),
                            msg: t5(language, 'Delete this credit card bill?', 'क्या यह क्रेडिट कार्ड बिल हटाएं?', 'का ई क्रेडिट कार्ड बिल हटाईं?', 'की ई क्रेडिट कार्ड बिल हटाउ?', 'यो क्रेडिट कार्ड बिल हटाउने?'),
                            onConfirm: () => bankDb.deleteCreditCardBill(bill.id),
                          })
                        }
                        className="p-1 text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'cc_interest': {
        const res = calcCreditCardPayoff(ccBal, ccCalcApr, ccMonthlyPay);
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t5(language, 'Card Balance', 'कार्ड बकाया', 'कार्ड बकाया', 'कार्ड बकाया', 'कार्ड बाँकी रकम')}
                </label>
                <input
                  type="number"
                  value={ccBal}
                  onChange={(e) => setCcBal(Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t5(language, 'Annual APR (%)', 'वार्षिक ब्याज (%)', 'सालाना ब्याज (%)', 'वार्षिक ब्याज (%)', 'वार्षिक ब्याजदर (%)')}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={ccCalcApr}
                  onChange={(e) => setCcCalcApr(Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t5(language, 'Monthly Repayment', 'मासिक भुगतान', 'हर महीना किस्त', 'मासिक भुगतान', 'मासिक किस्ता भुक्तानी')}
                </label>
                <input
                  type="number"
                  value={ccMonthlyPay}
                  onChange={(e) => setCcMonthlyPay(Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                />
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 text-white grid grid-cols-3 gap-3 text-xs tabular-nums">
              <div>
                <div className="text-[10px] text-slate-400">
                  {t5(language, 'Months to Clear', 'चुकाने में महीने', 'चुकावे में महीना', 'चुकेबाक माह', 'सकिने महिना')}
                </div>
                <div className="text-base font-extrabold">
                  {res.isMinimumTrap
                    ? t5(language, 'Never (Debt Trap!)', 'कभी नहीं (कर्ज जाल!)', 'कबो ना (कर्जा जाल!)', 'कहियो नहि (ऋण जाल!)', 'कहिल्यै सकिन्न (ऋण जाल!)')
                    : `${res.monthsToPayoff} ${t5(language, 'months', 'महीने', 'महीना', 'माह', 'महिना')}`}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">
                  {t5(language, 'Total Interest Cost', 'कुल ब्याज खर्च', 'कुल ब्याज खरच', 'कुल ब्याज खर्च', 'कुल ब्याज खर्च')}
                </div>
                <div className="text-base font-extrabold text-amber-400">
                  {res.isMinimumTrap
                    ? t5(language, 'Infinite', 'अनंत', 'अनंत', 'अनन्त', 'अनन्त')
                    : formatMoney(res.totalInterestPaid, currency, language)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">
                  {t5(language, 'Total Paid', 'कुल भुगतान', 'कुल देवल रकम', 'कुल भुगतान', 'कुल तिरिएको रकम')}
                </div>
                <div className="text-base font-extrabold">
                  {res.isMinimumTrap ? '-' : formatMoney(res.totalRepayment, currency, language)}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'insurance': {
        return (
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!insName.trim() || !insComp.trim() || insPrem <= 0) return;
                bankDb.upsertInsurancePolicy({
                  policyName: insName.trim(),
                  companyName: insComp.trim(),
                  insuranceType: insType,
                  sumAssured: insSum,
                  premiumAmount: insPrem,
                  frequency: insFreq,
                  nextDueDateBS: insDueBS,
                  nextDueDateAD: insDueAD,
                  paymentHistory: [],
                });
                setInsName('');
                setInsComp('');
                showToast(
                  t5(language, 'Insurance policy scheduled on Bank Calendar', 'बीमा पॉलिसी कैलेंडर में जुड़ गई', 'बीमा पॉलिसी कैलेंडर में जुड़ गइल', 'बीमा पॉलिसी कैलेन्डर मे जुड़ल', 'बीमा पोलिसी पात्रोमा थपियो')
                );
              }}
              className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  value={insName}
                  onChange={(e) => setInsName(e.target.value)}
                  placeholder={t5(language, 'Policy Name *', 'पॉलिसी का नाम *', 'पॉलिसी के नाम *', 'पॉलिसीक नाम *', 'पोलिसीको नाम *')}
                  className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <input
                  type="text"
                  required
                  value={insComp}
                  onChange={(e) => setInsComp(e.target.value)}
                  placeholder={t5(language, 'Insurer (e.g. Nepal Life)', 'बीमा कंपनी', 'बीमा कंपनी', 'बीमा कम्पनी', 'बीमा कम्पनी (जस्तै नेपाल लाइफ)')}
                  className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <select
                  value={insType}
                  onChange={(e) => setInsType(e.target.value as InsuranceType)}
                  className="min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                >
                  <option value="life">{t5(language, 'Life Insurance', 'जीवन बीमा', 'जीवन बीमा', 'जीवन बीमा', 'जीवन बीमा')}</option>
                  <option value="health">{t5(language, 'Health Insurance', 'स्वास्थ्य बीमा', 'स्वास्थ्य बीमा', 'स्वास्थ्य बीमा', 'स्वास्थ्य बीमा')}</option>
                  <option value="vehicle">{t5(language, 'Vehicle Insurance', 'वाहन बीमा', 'गाड़ी बीमा', 'वाहन बीमा', 'सवारी बीमा')}</option>
                  <option value="term">{t5(language, 'Term Plan', 'टर्म प्लान', 'टर्म प्लान', 'टर्म प्लान', 'टर्म प्लान')}</option>
                  <option value="property">{t5(language, 'Property', 'संपत्ति बीमा', 'संपत्ति बीमा', 'सम्पत्ति बीमा', 'सम्पत्ति बीमा')}</option>
                </select>
                <input
                  type="number"
                  value={insPrem}
                  onChange={(e) => setInsPrem(Number(e.target.value))}
                  placeholder={t5(language, 'Premium Amount', 'प्रीमियम राशि', 'प्रीमियम रकम', 'प्रीमियम राशि', 'प्रिमियम रकम')}
                  className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums"
                />
                <input
                  type="number"
                  value={insSum}
                  onChange={(e) => setInsSum(Number(e.target.value))}
                  placeholder={t5(language, 'Sum Assured', 'बीमित राशि', 'बीमांक रकम', 'बीमित राशि', 'बीमाङ्क रकम')}
                  className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums"
                />
                <select
                  value={insFreq}
                  onChange={(e) => setInsFreq(e.target.value as any)}
                  className="min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                >
                  <option value="yearly">{getFrequencyLabel('yearly')}</option>
                  <option value="half_yearly">{getFrequencyLabel('half_yearly')}</option>
                  <option value="quarterly">{getFrequencyLabel('quarterly')}</option>
                  <option value="monthly">{getFrequencyLabel('monthly')}</option>
                </select>
              </div>
              <DualBSDatePicker
                label={t5(language, 'Next Premium Due Date', 'अगली प्रीमियम तिथि', 'अगिला प्रीमियम तारीख', 'आगाक प्रीमियम तिथि', 'अर्को प्रिमियम मिति')}
                bsDate={insDueBS}
                adDate={insDueAD}
                language={language}
                onChange={(b, a) => {
                  setInsDueBS(b);
                  setInsDueAD(a);
                }}
              />
              <button
                type="submit"
                className="min-h-[38px] px-4 bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {t5(language, '+ Add Policy', '+ पॉलिसी जोड़ें', '+ पॉलिसी जोड़ीं', '+ पॉलिसी जोड़ू', '+ पोलिसी थप्नुहोस्')}
              </button>
            </form>

            <div className="space-y-2">
              {db.insurancePolicies.map((pol) => (
                <div key={pol.id} className="p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{pol.policyName} ({pol.companyName})</div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      {t5(language, 'Next Due:', 'अगली तिथि:', 'अगिला तारीख:', 'आगाक तिथि:', 'अर्को मिति:')} {pol.nextDueDateBS} {bsTag(language)} ({pol.nextDueDateAD} {adTag(language)}) • {t5(language, 'Premium:', 'प्रीमियम:', 'प्रीमियम:', 'प्रीमियम:', 'प्रिमियम:')} {formatMoney(pol.premiumAmount, currency, language)} ({getFrequencyLabel(pol.frequency)})
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const next = advanceDateByFrequency(pol.nextDueDateBS, pol.frequency);
                        bankDb.upsertInsurancePolicy({
                          ...pol,
                          nextDueDateBS: next.bsStr,
                          nextDueDateAD: next.adStr,
                          paymentHistory: [
                            ...pol.paymentHistory,
                            {
                              id: makeId('inspay'),
                              paidDateBS: today.bsStr,
                              paidDateAD: today.adStr,
                              amount: pol.premiumAmount,
                            },
                          ],
                        });
                        showToast(
                          t5(
                            language,
                            `Premium paid; next due updated to ${next.bsStr} BS`,
                            `प्रीमियम जमा; अगली तिथि ${next.bsStr} वि.सं.`,
                            `प्रीमियम जमा भइल; अगिला तारीख ${next.bsStr} वि.सं.`,
                            `प्रीमियम जमा; आगाक तिथि ${next.bsStr} वि.सं.`,
                            `प्रिमियम तिरियो; अर्को मिति ${next.bsStr} वि.सं.`
                          )
                        );
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] cursor-pointer"
                    >
                      {t5(language, 'Mark Premium Paid', 'प्रीमियम जमा चिह्नित करें', 'प्रीमियम जमा भइल', 'प्रीमियम जमा चिन्हित करू', 'प्रिमियम तिरेको चिन्ह')}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDel({
                          title: t5(language, 'Delete Policy', 'पॉलिसी हटाएं', 'पॉलिसी हटाईं', 'पॉलिसी हटाउ', 'पोलिसी हटाउनुहोस्'),
                          msg: t5(language, `Delete "${pol.policyName}"?`, `"${pol.policyName}" हटाएं?`, `"${pol.policyName}" हटाईं?`, `"${pol.policyName}" हटाउ?`, `"${pol.policyName}" हटाउने?`),
                          onConfirm: () => bankDb.deleteInsurancePolicy(pol.id),
                        })
                      }
                      className="p-1 text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'tax': {
        const res = calcNepalIncomeTax(taxIncome, taxStatus, taxPf, taxCit, taxIns, taxFemale, language);
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t5(language, 'Annual Gross Income', 'वार्षिक कुल आय', 'सालाना कुल आमदनी', 'वार्षिक कुल आय', 'वार्षिक कुल आय')}
                </label>
                <input
                  type="number"
                  value={taxIncome}
                  onChange={(e) => setTaxIncome(Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t5(language, 'Assessment Status', 'कर निर्धारण स्थिति', 'कर श्रेणी', 'कर निर्धारण स्थिति', 'कर स्थिति')}
                </label>
                <select
                  value={taxStatus}
                  onChange={(e) => setTaxStatus(e.target.value as any)}
                  className="w-full min-h-[40px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="single">{t5(language, 'Individual (Single 5L Slab)', 'व्यक्तिगत (अविवाहित 5L स्लैब)', 'एकल (5 लाख स्लैब)', 'व्यक्तिगत (5L स्लैब)', 'एकल (अविवाहित ५ लाख)')}</option>
                  <option value="couple">{t5(language, 'Couple (Married 6L Slab)', 'दंपत्ति (विवाहित 6L स्लैब)', 'दंपत्ति (विवाहित 6L स्लैब)', 'दम्पत्ति (विवाहित 6L स्लैब)', 'दम्पती (विवाहित ६ लाख)')}</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t5(language, 'PF / SSF Contribution', 'PF / SSF योगदान', 'PF / SSF जमा', 'PF / SSF योगदान', 'संचय कोष / SSF')}
                </label>
                <input
                  type="number"
                  value={taxPf}
                  onChange={(e) => setTaxPf(Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t5(language, 'CIT Deposit', 'CIT जमा', 'CIT जमा', 'CIT जमा', 'नागरिक लगानी कोष (CIT)')}
                </label>
                <input
                  type="number"
                  value={taxCit}
                  onChange={(e) => setTaxCit(Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t5(language, 'Life Insurance (Max 40K)', 'जीवन बीमा (अधिकतम 40K)', 'जीवन बीमा (40K तक)', 'जीवन बीमा (अधिकतम 40K)', 'जीवन बीमा (अधिकतम ४० हजार)')}
                </label>
                <input
                  type="number"
                  value={taxIns}
                  onChange={(e) => setTaxIns(Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                />
              </div>
              <label className="flex items-center gap-2 pt-5 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxFemale}
                  onChange={(e) => setTaxFemale(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span>{t5(language, '10% Female Rebate', '10% महिला छूट', '10% महिला छूट', '10% महिला छूट', '१०% महिला कर छुट')}</span>
              </label>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 text-white grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
              <div>
                <div className="text-[10px] text-slate-400">{t5(language, 'Net Annual Tax', 'शुद्ध वार्षिक कर', 'कुल सालाना टैक्स', 'शुद्ध वार्षिक कर', 'खुद वार्षिक कर')}</div>
                <div className="text-base font-extrabold text-amber-400">
                  {formatMoney(res.netAnnualTax, currency, language)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">{t5(language, 'Monthly TDS', 'मासिक TDS', 'महीना के TDS', 'मासिक TDS', 'मासिक TDS')}</div>
                <div className="text-base font-extrabold">{formatMoney(res.monthlyTds, currency, language)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">{t5(language, 'Taxable Income', 'कर योग्य आय', 'टैक्स लागय आमदनी', 'कर योग्य आय', 'कर लाग्ने आय')}</div>
                <div className="text-sm font-bold">{formatMoney(res.taxableIncome, currency, language)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">{t5(language, 'Effective Tax Rate', 'प्रभावी कर दर', 'असरदार टैक्स दर', 'प्रभावी कर दर', 'प्रभावकारी कर दर')}</div>
                <div className="text-sm font-bold">{res.effectiveRatePercent}%</div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">{t5(language, 'Tax Slab', 'कर स्लैब', 'टैक्स स्लैब', 'कर स्लैब', 'कर स्ल्याब')}</th>
                    <th className="py-2 px-3">{t5(language, 'Rate', 'दर', 'दर', 'दर', 'दर')}</th>
                    <th className="py-2 px-3 text-right">{t5(language, 'Taxable Part', 'कर योग्य हिस्सा', 'टैक्स वाला हिस्सा', 'कर योग्य भाग', 'कर लाग्ने भाग')}</th>
                    <th className="py-2 px-3 text-right">{t5(language, 'Tax', 'कर', 'टैक्स', 'कर', 'कर')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {res.slabs.map((s) => (
                    <tr key={s.range}>
                      <td className="py-2 px-3">{s.range}</td>
                      <td className="py-2 px-3">{s.rate}</td>
                      <td className="py-2 px-3 text-right">{formatMoney(s.amount, currency, language)}</td>
                      <td className="py-2 px-3 text-right font-bold">{formatMoney(s.tax, currency, language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'savings_interest': {
        const res = calcBankSavingsInterest(savBal, savRate, savDays, savTds);
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'Avg Savings Balance', 'औसत बचत शेष', 'औसत बचत बैलेंस', 'औसत बचत शेष', 'औसत बचत मौज्दात')}</label>
                <input type="number" value={savBal} onChange={(e) => setSavBal(Number(e.target.value))} className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'Interest Rate (% p.a.)', 'ब्याज दर (% वार्षिक)', 'ब्याज दर (% सालाना)', 'ब्याज दर (% वार्षिक)', 'ब्याजदर (% वार्षिक)')}</label>
                <input type="number" step="0.1" value={savRate} onChange={(e) => setSavRate(Number(e.target.value))} className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'Quarter / Days', 'अवधि (दिन)', 'दिन के संख्या', 'अवधि (दिन)', 'अवधि (दिन)')}</label>
                <input type="number" value={savDays} onChange={(e) => setSavDays(Number(e.target.value))} className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'Bank Tax / TDS (%)', 'बैंक कर / TDS (%)', 'बैंक टैक्स / TDS (%)', 'बैंक कर / TDS (%)', 'बैंक कर / TDS (%)')}</label>
                <input type="number" step="0.5" value={savTds} onChange={(e) => setSavTds(Number(e.target.value))} className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" />
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 text-white grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
              <div><div className="text-[10px] text-slate-400">{t5(language, 'Gross Interest', 'कुल ब्याज', 'कुल ब्याज', 'कुल ब्याज', 'कुल ब्याज')}</div><div className="text-sm font-bold">{formatMoney(res.grossInterest, currency, language)}</div></div>
              <div><div className="text-[10px] text-slate-400">{t5(language, 'TDS Deducted', 'कटा हुआ TDS', 'कटल TDS', 'कटल TDS', 'कट्टी भएको कर')}</div><div className="text-sm font-bold text-rose-400">-{formatMoney(res.tdsAmount, currency, language)}</div></div>
              <div><div className="text-[10px] text-slate-400">{t5(language, 'Net Interest', 'शुद्ध ब्याज', 'शुद्ध ब्याज', 'शुद्ध ब्याज', 'खुद ब्याज')}</div><div className="text-sm font-extrabold text-emerald-400">{formatMoney(res.netInterest, currency, language)}</div></div>
              <div><div className="text-[10px] text-slate-400">{t5(language, 'Closing Balance', 'अंतिम शेष', 'आखिरी बैलेंस', 'अन्तिम शेष', 'अन्तिम मौज्दात')}</div><div className="text-sm font-extrabold">{formatMoney(res.closingBalance, currency, language)}</div></div>
            </div>
          </div>
        );
      }

      case 'loan_prepayment': {
        const res = calcLoanPrepayment(prePrin, preRate, preMos, preLump, preExtraMo);
        const mosLabel = t5(language, 'months', 'महीने', 'महीना', 'माह', 'महिना');
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div><label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'Remaining Loan', 'शेष ऋण', 'बाकी कर्जा', 'शेष ऋण', 'बाँकी ऋण')}</label><input type="number" value={prePrin} onChange={(e) => setPrePrin(Number(e.target.value))} className="w-full min-h-[40px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" /></div>
              <div><label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'Rate (%)', 'ब्याज दर (%)', 'ब्याज दर (%)', 'दर (%)', 'दर (%)')}</label><input type="number" step="0.1" value={preRate} onChange={(e) => setPreRate(Number(e.target.value))} className="w-full min-h-[40px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" /></div>
              <div><label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'Rem. Months', 'शेष महीने', 'बाकी महीना', 'शेष माह', 'बाँकी महिना')}</label><input type="number" value={preMos} onChange={(e) => setPreMos(Number(e.target.value))} className="w-full min-h-[40px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" /></div>
              <div><label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'Lumpsum Prepay', 'एकमुश्त जमा', 'एकमुश्त जमा', 'एकमुश्त जमा', 'एकमुष्ट भुक्तानी')}</label><input type="number" value={preLump} onChange={(e) => setPreLump(Number(e.target.value))} className="w-full min-h-[40px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" /></div>
              <div><label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'Extra Monthly EMI', 'अतिरिक्त मासिक EMI', 'बेसी मासिक किस्त', 'अतिरिक्त मासिक EMI', 'थप मासिक किस्ता')}</label><input type="number" value={preExtraMo} onChange={(e) => setPreExtraMo(Number(e.target.value))} className="w-full min-h-[40px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" /></div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 text-white grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
              <div><div className="text-[10px] text-slate-400">{t5(language, 'Interest Saved', 'बचा हुआ ब्याज', 'बचल ब्याज', 'बचल ब्याज', 'बचत भएको ब्याज')}</div><div className="text-base font-extrabold text-emerald-400">{formatMoney(res.interestSaved, currency, language)}</div></div>
              <div><div className="text-[10px] text-slate-400">{t5(language, 'Tenure Reduced', 'कम हुई अवधि', 'कम भइल समय', 'घटल अवधि', 'घटेको अवधि')}</div><div className="text-base font-extrabold">{res.monthsSaved} {mosLabel}</div></div>
              <div><div className="text-[10px] text-slate-400">{t5(language, 'Regular EMI', 'नियमित EMI', 'सामान्य किस्त', 'नियमित EMI', 'नियमित किस्ता')}</div><div className="text-sm font-bold">{formatMoney(res.regularEmi, currency, language)}</div></div>
              <div><div className="text-[10px] text-slate-400">{t5(language, 'New Tenure', 'नई अवधि', 'नया समय', 'नव अवधि', 'नयाँ अवधि')}</div><div className="text-sm font-bold">{res.newMonths} {mosLabel}</div></div>
            </div>
          </div>
        );
      }

      case 'balance_transfer': {
        const res = calcLoanBalanceTransfer(btPrin, btOldRate, btNewRate, btMos, btFee);
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div><label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'Balance Principal', 'शेष मूलधन', 'बाकी मूलधन', 'शेष मूलधन', 'बाँकी साँवा')}</label><input type="number" value={btPrin} onChange={(e) => setBtPrin(Number(e.target.value))} className="w-full min-h-[40px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" /></div>
              <div><label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'Current Rate (%)', 'वर्तमान दर (%)', 'अभी के दर (%)', 'वर्तमान दर (%)', 'हालको दर (%)')}</label><input type="number" step="0.05" value={btOldRate} onChange={(e) => setBtOldRate(Number(e.target.value))} className="w-full min-h-[40px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" /></div>
              <div><label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'New Bank Rate (%)', 'नए बैंक की दर (%)', 'नया बैंक के दर (%)', 'नव बैंक दर (%)', 'नयाँ बैंक दर (%)')}</label><input type="number" step="0.05" value={btNewRate} onChange={(e) => setBtNewRate(Number(e.target.value))} className="w-full min-h-[40px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" /></div>
              <div><label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'Rem. Months', 'शेष महीने', 'बाकी महीना', 'शेष माह', 'बाँकी महिना')}</label><input type="number" value={btMos} onChange={(e) => setBtMos(Number(e.target.value))} className="w-full min-h-[40px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" /></div>
              <div><label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'Transfer Fee', 'ट्रांसफर शुल्क', 'ट्रांसफर फीस', 'ट्रांसफर शुल्क', 'ट्रान्सफर शुल्क')}</label><input type="number" value={btFee} onChange={(e) => setBtFee(Number(e.target.value))} className="w-full min-h-[40px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" /></div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 text-white grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
              <div><div className="text-[10px] text-slate-400">{t5(language, 'Net Savings (After Fee)', 'शुद्ध बचत (शुल्क बाद)', 'कुल बचत (फीस काट के)', 'शुद्ध बचत', 'खुद बचत (शुल्क कटाएर)')}</div><div className={`text-base font-extrabold ${res.isWorthTransferring ? 'text-emerald-400' : 'text-rose-400'}`}>{formatMoney(res.netSavingsAfterFee, currency, language)}</div></div>
              <div><div className="text-[10px] text-slate-400">{t5(language, 'Monthly EMI Saved', 'मासिक EMI बचत', 'हर महीना किस्त बचत', 'मासिक EMI बचत', 'मासिक किस्ता बचत')}</div><div className="text-base font-extrabold">{formatMoney(res.monthlyEmiSavings, currency, language)}</div></div>
              <div><div className="text-[10px] text-slate-400">{t5(language, 'Current EMI', 'वर्तमान EMI', 'अभी के किस्त', 'वर्तमान EMI', 'हालको किस्ता')}</div><div className="text-sm font-bold">{formatMoney(res.currentEmi, currency, language)}</div></div>
              <div><div className="text-[10px] text-slate-400">{t5(language, 'New Bank EMI', 'नए बैंक की EMI', 'नया बैंक किस्त', 'नव बैंक EMI', 'नयाँ बैंक किस्ता')}</div><div className="text-sm font-bold">{formatMoney(res.newEmi, currency, language)}</div></div>
            </div>
          </div>
        );
      }

      case 'emi_compare': {
        const emiA = calculatePeriodicEMI(cmpAmtA, cmpRateA, cmpMosA, 12);
        const totA = round2(emiA * cmpMosA + cmpFeeA);
        const intA = round2(emiA * cmpMosA - cmpAmtA);
        const emiB = calculatePeriodicEMI(cmpAmtB, cmpRateB, cmpMosB, 12);
        const totB = round2(emiB * cmpMosB + cmpFeeB);
        const intB = round2(emiB * cmpMosB - cmpAmtB);
        const offerALabel = t5(language, 'Bank Offer A', 'बैंक ऑफर A', 'बैंक ऑफर A', 'बैंक ऑफर A', 'बैंक अफर A');
        const offerBLabel = t5(language, 'Bank Offer B', 'बैंक ऑफर B', 'बैंक ऑफर B', 'बैंक ऑफर B', 'बैंक अफर B');
        const cheaper = totA <= totB ? offerALabel : offerBLabel;
        const amtLabel = t5(language, 'Amount', 'राशि', 'रकम', 'राशि', 'रकम');
        const rateLabel = t5(language, 'Rate %', 'दर %', 'दर %', 'दर %', 'दर %');
        const mosLabel = t5(language, 'Months', 'महीने', 'महीना', 'माह', 'महिना');
        const feeLabel = t5(language, 'Fee', 'शुल्क', 'फीस', 'शुल्क', 'शुल्क');
        const totCostLabel = t5(language, 'Total Cost:', 'कुल खर्च:', 'कुल लागत:', 'कुल खर्च:', 'कुल लागत:');
        const intShortLabel = t5(language, 'Int:', 'ब्याज:', 'ब्याज:', 'ब्याज:', 'ब्याज:');
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-900">{offerALabel}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[10px] font-bold text-slate-600">{amtLabel}</label><input type="number" value={cmpAmtA} onChange={(e) => setCmpAmtA(Number(e.target.value))} className="w-full min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums" /></div>
                  <div><label className="text-[10px] font-bold text-slate-600">{rateLabel}</label><input type="number" step="0.1" value={cmpRateA} onChange={(e) => setCmpRateA(Number(e.target.value))} className="w-full min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums" /></div>
                  <div><label className="text-[10px] font-bold text-slate-600">{mosLabel}</label><input type="number" value={cmpMosA} onChange={(e) => setCmpMosA(Number(e.target.value))} className="w-full min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums" /></div>
                  <div><label className="text-[10px] font-bold text-slate-600">{feeLabel}</label><input type="number" value={cmpFeeA} onChange={(e) => setCmpFeeA(Number(e.target.value))} className="w-full min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums" /></div>
                </div>
                <div className="text-xs pt-1 tabular-nums">
                  EMI: <strong>{formatMoney(emiA, currency, language)}</strong> | {totCostLabel} <strong>{formatMoney(totA, currency, language)}</strong> ({intShortLabel} {formatMoney(intA, currency, language)})
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-900">{offerBLabel}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[10px] font-bold text-slate-600">{amtLabel}</label><input type="number" value={cmpAmtB} onChange={(e) => setCmpAmtB(Number(e.target.value))} className="w-full min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums" /></div>
                  <div><label className="text-[10px] font-bold text-slate-600">{rateLabel}</label><input type="number" step="0.1" value={cmpRateB} onChange={(e) => setCmpRateB(Number(e.target.value))} className="w-full min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums" /></div>
                  <div><label className="text-[10px] font-bold text-slate-600">{mosLabel}</label><input type="number" value={cmpMosB} onChange={(e) => setCmpMosB(Number(e.target.value))} className="w-full min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums" /></div>
                  <div><label className="text-[10px] font-bold text-slate-600">{feeLabel}</label><input type="number" value={cmpFeeB} onChange={(e) => setCmpFeeB(Number(e.target.value))} className="w-full min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums" /></div>
                </div>
                <div className="text-xs pt-1 tabular-nums">
                  EMI: <strong>{formatMoney(emiB, currency, language)}</strong> | {totCostLabel} <strong>{formatMoney(totB, currency, language)}</strong> ({intShortLabel} {formatMoney(intB, currency, language)})
                </div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 tabular-nums">
              {t5(
                language,
                `Lower Total Cost: ${cheaper} saves ${formatMoney(Math.abs(totA - totB), currency, language)} overall.`,
                `कम कुल लागत: ${cheaper} में कुल ${formatMoney(Math.abs(totA - totB), currency, language)} की बचत है।`,
                `कम लागत: ${cheaper} में कुल ${formatMoney(Math.abs(totA - totB), currency, language)} के बचत बा।`,
                `कम लागत: ${cheaper} मे कुल ${formatMoney(Math.abs(totA - totB), currency, language)} केर बचत अछि।`,
                `कम कुल लागत: ${cheaper} मा कुल ${formatMoney(Math.abs(totA - totB), currency, language)} बचत हुन्छ।`
              )}
            </div>
          </div>
        );
      }

      case 'currency': {
        const fxNoteText = fxLiveDate
          ? t5(
              language,
              `Live Reference (Updated ${fxLiveDate} BS)`,
              `लाइव संदर्भ (अपडेट ${fxLiveDate} वि.सं.)`,
              `लाइव दर (अपडेट ${fxLiveDate} वि.सं.)`,
              `लाइव सन्दर्भ (अपडेट ${fxLiveDate} वि.सं.)`,
              `लाइभ दर (अद्यावधिक ${fxLiveDate} वि.सं.)`
            )
          : t5(
              language,
              'Offline Reference Rates',
              'ऑफलाइन संदर्भ दरें',
              'ऑफलाइन संदर्भ दर',
              'ऑफलाइन सन्दर्भ दर',
              'अफलाइन सन्दर्भ दरहरू'
            );
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-600">{fxNoteText}</span>
              <button
                type="button"
                disabled={fxLoading}
                onClick={handleFetchFx}
                className="min-h-[36px] px-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fxLoading ? 'animate-spin' : ''}`} />
                <span>{t5(language, 'Refresh Live Rates', 'लाइव दरें ताज़ा करें', 'लाइव दर ताजा करीं', 'लाइव दर ताजा करू', 'लाइभ दर ताजा गर्नुहोस्')}</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'Amount', 'राशि', 'रकम', 'राशि', 'रकम')}</label>
                <input type="number" value={fxAmount} onChange={(e) => setFxAmount(Number(e.target.value))} className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'From', 'से', 'कौना मुद्रा से', 'कौना मुद्रा सँ', 'कुन मुद्राबाट')}</label>
                <select value={fxFrom} onChange={(e) => setFxFrom(e.target.value)} className="w-full min-h-[40px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold">
                  {Object.entries(OFFLINE_REFERENCE_FX_RATES_PER_USD).map(([k, v]) => (
                    <option key={k} value={k}>{k} — {v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'To', 'में', 'कौना मुद्रा में', 'कौना मुद्रा मे', 'कुन मुद्रामा')}</label>
                <select value={fxTo} onChange={(e) => setFxTo(e.target.value)} className="w-full min-h-[40px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold">
                  {Object.entries(OFFLINE_REFERENCE_FX_RATES_PER_USD).map(([k, v]) => (
                    <option key={k} value={k}>{k} — {v.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 text-white tabular-nums">
              <div className="text-xs text-slate-400">{fxAmount} {fxFrom} =</div>
              <div className="text-2xl font-extrabold">{fxConverted.toLocaleString('en-IN')} {fxTo}</div>
            </div>
          </div>
        );
      }

      case 'budget': {
        return (
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!bdgCategory.trim() || bdgLimit <= 0) return;
                bankDb.upsertBudget({ category: bdgCategory.trim(), monthlyLimit: bdgLimit, monthBS: curBsMonthPrefix });
                showToast(t5(language, 'Monthly budget limit saved', 'मासिक बजट सीमा सुरक्षित', 'महीना के बजट सीमा सेव भइल', 'मासिक बजट सीमा सुरक्षित', 'मासिक बजेट सीमा सुरक्षित भयो'));
              }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200"
            >
              <input type="text" value={bdgCategory} onChange={(e) => setBdgCategory(e.target.value)} placeholder={t5(language, 'Category', 'श्रेणी', 'मद / श्रेणी', 'श्रेणी', 'वर्ग / शीर्षक')} className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold" />
              <input type="number" min={1} value={bdgLimit} onChange={(e) => setBdgLimit(Number(e.target.value))} placeholder={t5(language, 'Monthly Limit', 'मासिक सीमा', 'महीना के सीमा', 'मासिक सीमा', 'मासिक सीमा')} className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums" />
              <button type="submit" className="min-h-[38px] px-3 bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer">
                {t5(language, '+ Set Budget', '+ बजट सेट करें', '+ बजट सेट करीं', '+ बजट सेट करू', '+ बजेट सेट गर्नुहोस्')}
              </button>
            </form>

            <div className="space-y-2">
              {db.budgetCategories.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6">
                  {t5(language, 'No budget categories set yet.', 'अभी कोई बजट श्रेणी सेट नहीं है।', 'अभी कवनो बजट श्रेणी सेट नइखे।', 'अखन धरि कोनो बजट श्रेणी सेट नहि अछि।', 'अहिलेसम्म कुनै बजेट वर्ग सेट गरिएको छैन।')}
                </div>
              ) : (
                db.budgetCategories.map((b) => {
                  const spent = db.incomeExpenses
                    .filter((x) => x.entryType === 'expense' && x.dateBS.startsWith(curBsMonthPrefix) && x.category.toLowerCase() === b.category.toLowerCase())
                    .reduce((s, x) => s + x.amount, 0);
                  const pct = b.monthlyLimit > 0 ? Math.min(100, Math.round((spent / b.monthlyLimit) * 100)) : 0;
                  return (
                    <div key={b.id} className="p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{b.category}</span>
                        <div className="flex items-center gap-2 tabular-nums">
                          <span>{formatMoney(spent, currency, language)} / {formatMoney(b.monthlyLimit, currency, language)}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDel({
                                title: t5(language, 'Delete Budget', 'बजट हटाएं', 'बजट हटाईं', 'बजट हटाउ', 'बजट हटाउनुहोस्'),
                                msg: t5(language, `Delete "${b.category}" budget?`, `"${b.category}" बजट हटाएं?`, `"${b.category}" बजट हटाईं?`, `"${b.category}" बजट हटाउ?`, `"${b.category}" बजेट हटाउने?`),
                                onConfirm: () => bankDb.deleteBudget(b.id),
                              })
                            }
                            className="text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full ${spent > b.monthlyLimit ? 'bg-rose-600' : 'bg-blue-600'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      }

      case 'income_expense': {
        const list = db.incomeExpenses.filter((x) => ieFilter === 'all' || x.entryType === ieFilter);
        const totInc = db.incomeExpenses.filter((x) => x.entryType === 'income').reduce((s, x) => s + x.amount, 0);
        const totExp = db.incomeExpenses.filter((x) => x.entryType === 'expense').reduce((s, x) => s + x.amount, 0);
        return (
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!ieCat.trim() || ieAmt <= 0) return;
                bankDb.upsertIncomeExpense({
                  entryType: ieType,
                  category: ieCat.trim(),
                  amount: ieAmt,
                  dateBS: ieBS,
                  dateAD: ieAD,
                  paymentMethod: ieMethod,
                  note: ieNote.trim() || undefined,
                });
                setIeNote('');
                showToast(
                  ieType === 'income'
                    ? t5(language, 'Income recorded', 'आय दर्ज हुई', 'आमदनी लिखल गइल', 'आय दर्ज भेल', 'आम्दानी रेकर्ड भयो')
                    : t5(language, 'Expense recorded', 'खर्च दर्ज हुआ', 'खरच लिखल गइल', 'खर्च दर्ज भेल', 'खर्च रेकर्ड भयो')
                );
              }}
              className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <select value={ieType} onChange={(e) => setIeType(e.target.value as any)} className="min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold">
                  <option value="expense">{t5(language, 'Expense (-)', 'खर्च (-)', 'खरच (-)', 'खर्च (-)', 'खर्च (-)')}</option>
                  <option value="income">{t5(language, 'Income (+)', 'आय (+)', 'आमदनी (+)', 'आय (+)', 'आम्दानी (+)')}</option>
                </select>
                <input type="text" required value={ieCat} onChange={(e) => setIeCat(e.target.value)} placeholder={t5(language, 'Category', 'श्रेणी', 'मद / श्रेणी', 'श्रेणी', 'शीर्षक')} className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold" />
                <input type="number" min={1} required value={ieAmt} onChange={(e) => setIeAmt(Number(e.target.value))} placeholder={t5(language, 'Amount', 'राशि', 'रकम', 'राशि', 'रकम')} className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums" />
                <select value={ieMethod} onChange={(e) => setIeMethod(e.target.value as any)} className="min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold">
                  <option value="cash">{getPaymentMethodLabel('cash')}</option>
                  <option value="bank">{getPaymentMethodLabel('bank')}</option>
                  <option value="esewa">eSewa</option>
                  <option value="khalti">Khalti</option>
                  <option value="card">{getPaymentMethodLabel('card')}</option>
                </select>
              </div>
              <DualBSDatePicker
                label={t5(language, 'Entry Date', 'प्रविष्टि तिथि', 'तारीख', 'तिथि', 'प्रविष्टि मिति')}
                bsDate={ieBS}
                adDate={ieAD}
                language={language}
                onChange={(b, a) => { setIeBS(b); setIeAD(a); }}
              />
              <div className="flex gap-2">
                <input type="text" value={ieNote} onChange={(e) => setIeNote(e.target.value)} placeholder={t5(language, 'Note (optional)', 'नोट (वैकल्पिक)', 'नोट (ऐच्छिक)', 'नोट (वैकल्पिक)', 'कैफियत (ऐच्छिक)')} className="flex-1 min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs" />
                <button type="submit" className="min-h-[38px] px-4 bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer">
                  {t5(language, '+ Save', '+ सुरक्षित करें', '+ सेव करीं', '+ सुरक्षित करू', '+ सुरक्षित गर्नुहोस्')}
                </button>
              </div>
            </form>

            <div className="grid grid-cols-3 gap-2 text-xs tabular-nums">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200"><div className="text-[10px] text-emerald-700">{t5(language, 'Total Income', 'कुल आय', 'कुल आमदनी', 'कुल आय', 'कुल आम्दानी')}</div><div className="font-extrabold text-emerald-900">{formatMoney(totInc, currency, language)}</div></div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200"><div className="text-[10px] text-rose-700">{t5(language, 'Total Expense', 'कुल खर्च', 'कुल खरच', 'कुल खर्च', 'कुल खर्च')}</div><div className="font-extrabold text-rose-900">{formatMoney(totExp, currency, language)}</div></div>
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200"><div className="text-[10px] text-slate-600">{t5(language, 'Net Cashflow', 'शुद्ध नकद', 'बाकी बचल नकद', 'शुद्ध नकद', 'खुद बचत')}</div><div className="font-extrabold text-slate-900">{formatMoney(totInc - totExp, currency, language)}</div></div>
            </div>

            <div className="flex gap-1.5">
              {(['all', 'income', 'expense'] as const).map((f) => (
                <button key={f} type="button" onClick={() => setIeFilter(f)} className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${ieFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {f === 'all'
                    ? t5(language, 'All', 'सभी', 'सब', 'सभ', 'सबै')
                    : f === 'income'
                    ? t5(language, 'Income', 'आय', 'आमदनी', 'आय', 'आम्दानी')
                    : t5(language, 'Expense', 'खर्च', 'खरच', 'खर्च', 'खर्च')}
                </button>
              ))}
            </div>

            <div className="divide-y divide-slate-100 max-h-[260px] overflow-y-auto text-xs">
              {list.map((row) => (
                <div key={row.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900">{row.category} {row.note ? `• ${row.note}` : ''}</div>
                    <div className="text-[10px] text-slate-500 tabular-nums">{row.dateBS} {bsTag(language)} ({row.dateAD} {adTag(language)}) • {getPaymentMethodLabel(row.paymentMethod)}</div>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className={`font-extrabold ${row.entryType === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {row.entryType === 'income' ? '+' : '-'}{formatMoney(row.amount, currency, language)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDel({
                          title: t5(language, 'Delete Entry', 'प्रविष्टि हटाएं', 'रिकॉर्ड हटाईं', 'प्रविष्टि हटाउ', 'प्रविष्टि हटाउनुहोस्'),
                          msg: t5(language, `Delete "${row.category}" entry?`, `"${row.category}" प्रविष्टि हटाएं?`, `"${row.category}" रिकॉर्ड हटाईं?`, `"${row.category}" प्रविष्टि हटाउ?`, `"${row.category}" प्रविष्टि हटाउने?`),
                          onConfirm: () => bankDb.deleteIncomeExpense(row.id),
                        })
                      }
                      className="text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'emergency_fund': {
        const res = calcEmergencyFund(efMonthly, efMonths, efSaved, efCap);
        const mosLabel = t5(language, 'months', 'महीने', 'महीना', 'माह', 'महिना');
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'Monthly Essentials', 'मासिक ज़रूरी खर्च', 'महीना के जरूरी खरच', 'मासिक आवश्यक खर्च', 'मासिक अत्यावश्यक खर्च')}</label><input type="number" value={efMonthly} onChange={(e) => setEfMonthly(Number(e.target.value))} className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" /></div>
              <div><label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'Target Cover (Months)', 'लक्ष्य अवधि (महीने)', 'केतना महीना के बैकअप', 'लक्ष्य अवधि (माह)', 'लक्ष्य अवधि (महिना)')}</label><input type="number" min={1} value={efMonths} onChange={(e) => setEfMonths(Number(e.target.value))} className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" /></div>
              <div><label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'Current Liquid Savings', 'वर्तमान तरल बचत', 'अभी मौजूद बचत', 'वर्तमान तरल बचत', 'हालको तरल बचत')}</label><input type="number" value={efSaved} onChange={(e) => setEfSaved(Number(e.target.value))} className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" /></div>
              <div><label className="block text-[11px] font-bold text-slate-700 mb-1">{t5(language, 'Monthly Saving Capacity', 'मासिक बचत क्षमता', 'हर महीना बचत क्षमता', 'मासिक बचत क्षमता', 'मासिक बचत क्षमता')}</label><input type="number" value={efCap} onChange={(e) => setEfCap(Number(e.target.value))} className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums" /></div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 text-white grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
              <div><div className="text-[10px] text-slate-400">{t5(language, 'Target Emergency Fund', 'लक्ष्य आपातकालीन फंड', 'लक्ष्य इमरजेंसी फंड', 'लक्ष्य आपातकालीन कोष', 'लक्ष्य आपत्कालीन कोष')}</div><div className="text-base font-extrabold">{formatMoney(res.targetCorpus, currency, language)}</div></div>
              <div><div className="text-[10px] text-slate-400">{t5(language, 'Funding Gap', 'बची हुई कमी', 'अभी के कमी', 'बचल कमी', 'अपुग रकम')}</div><div className="text-base font-extrabold text-amber-400">{formatMoney(res.fundingGap, currency, language)}</div></div>
              <div><div className="text-[10px] text-slate-400">{t5(language, 'Current Coverage', 'वर्तमान कवर', 'अभी के कवर', 'वर्तमान कवर', 'हालको कभरेज')}</div><div className="text-sm font-bold">{res.monthsCoveredCurrently} {mosLabel}</div></div>
              <div><div className="text-[10px] text-slate-400">{t5(language, 'Months to Complete', 'पूरा होने में महीने', 'पूरा होखे में महीना', 'पूर्ण होएबाक माह', 'पूरा हुन लाग्ने महिना')}</div><div className="text-sm font-bold">{res.monthsToReachGoal === null ? '-' : `${res.monthsToReachGoal} ${mosLabel}`}</div></div>
            </div>
          </div>
        );
      }

      case 'savings_goals': {
        return (
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!goalName.trim() || goalTarget <= 0) return;
                bankDb.upsertSavingsGoal({
                  goalName: goalName.trim(),
                  targetAmount: goalTarget,
                  savedAmount: goalSaved,
                  targetDateBS: goalBS,
                  targetDateAD: goalAD,
                  contributions: goalSaved > 0 ? [{ id: makeId('gc'), dateBS: today.bsStr, dateAD: today.adStr, amount: goalSaved }] : [],
                });
                setGoalName('');
                showToast(t5(language, 'Savings goal added', 'बचत लक्ष्य जोड़ा गया', 'बचत लक्ष्य जोड़ल गइल', 'बचत लक्ष्य जोड़ल गेल', 'बचत लक्ष्य थपियो'));
              }}
              className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input type="text" required value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder={t5(language, 'Goal Name (e.g. House / Bike)', 'लक्ष्य नाम (जैसे घर / गाड़ी)', 'लक्ष्य नाम (जइसे घर / गाड़ी)', 'लक्ष्य नाम (जेना घर / गाड़ी)', 'लक्ष्यको नाम (जस्तै घर / गाडी)')} className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold" />
                <input type="number" min={1} value={goalTarget} onChange={(e) => setGoalTarget(Number(e.target.value))} placeholder={t5(language, 'Target Amount', 'लक्ष्य राशि', 'लक्ष्य रकम', 'लक्ष्य राशि', 'लक्ष्य रकम')} className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums" />
                <input type="number" min={0} value={goalSaved} onChange={(e) => setGoalSaved(Number(e.target.value))} placeholder={t5(language, 'Already Saved', 'पहले से जमा', 'पहिले से जमा', 'पहिने सँ जमा', 'पहिले नै जम्मा')} className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums" />
              </div>
              <DualBSDatePicker label={t5(language, 'Target Date', 'लक्ष्य तिथि', 'लक्ष्य तारीख', 'लक्ष्य तिथि', 'लक्ष्य मिति')} bsDate={goalBS} adDate={goalAD} language={language} onChange={(b, a) => { setGoalBS(b); setGoalAD(a); }} />
              <button type="submit" className="min-h-[38px] px-4 bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer">
                {t5(language, '+ Add Goal', '+ लक्ष्य जोड़ें', '+ लक्ष्य जोड़ीं', '+ लक्ष्य जोड़ू', '+ लक्ष्य थप्नुहोस्')}
              </button>
            </form>

            <div className="space-y-2.5">
              {db.savingsGoals.map((g: SavingsGoalRecord) => {
                const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100)) : 0;
                const addVal = goalContribAmt[g.id] ?? 5000;
                return (
                  <div key={g.id} className="p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-900">{g.goalName}</div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {t5(language, 'Target:', 'लक्ष्य:', 'लक्ष्य:', 'लक्ष्य:', 'लक्ष्य:')} {g.targetDateBS} {bsTag(language)} • {pct}% {t5(language, 'complete', 'पूरा', 'पूरा', 'पूर्ण', 'पूरा')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDel({
                            title: t5(language, 'Delete Goal', 'लक्ष्य हटाएं', 'लक्ष्य हटाईं', 'लक्ष्य हटाउ', 'लक्ष्य हटाउनुहोस्'),
                            msg: t5(language, `Delete "${g.goalName}"?`, `"${g.goalName}" हटाएं?`, `"${g.goalName}" हटाईं?`, `"${g.goalName}" हटाउ?`, `"${g.goalName}" हटाउने?`),
                            onConfirm: () => bankDb.deleteSavingsGoal(g.id),
                          })
                        }
                        className="text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} /></div>
                    <div className="flex items-center justify-between gap-2 tabular-nums">
                      <span>{formatMoney(g.savedAmount, currency, language)} / {formatMoney(g.targetAmount, currency, language)}</span>
                      <div className="flex items-center gap-1.5">
                        <input type="number" min={1} value={addVal} onChange={(e) => setGoalContribAmt((p) => ({ ...p, [g.id]: Number(e.target.value) }))} className="w-24 min-h-[32px] px-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold" />
                        <button
                          type="button"
                          onClick={() => {
                            if (addVal <= 0) return;
                            bankDb.upsertSavingsGoal({
                              ...g,
                              savedAmount: g.savedAmount + addVal,
                              contributions: [...g.contributions, { id: makeId('gc'), dateBS: today.bsStr, dateAD: today.adStr, amount: addVal }],
                            });
                            showToast(t5(language, 'Contribution added to goal', 'लक्ष्य में राशि जोड़ी गई', 'लक्ष्य में रकम जोड़ल गइल', 'लक्ष्य मे राशि जोड़ल गेल', 'लक्ष्यमा रकम थपियो'));
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[10px] cursor-pointer"
                        >
                          {t5(language, '+ Add', '+ जोड़ें', '+ जोड़ीं', '+ जोड़ू', '+ थप्नुहोस्')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'recurring': {
        return (
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!recTitle.trim() || recAmt <= 0) return;
                bankDb.upsertRecurring({
                  title: recTitle.trim(),
                  category: recCat,
                  amount: recAmt,
                  frequency: recFreq,
                  nextDueDateBS: recBS,
                  nextDueDateAD: recAD,
                  isActive: true,
                  history: [],
                });
                setRecTitle('');
                showToast(t5(language, 'Recurring payment added & synced to Calendar', 'नियमित भुगतान कैलेंडर में जुड़ा', 'नियमित भुगतान कैलेंडर में जुड़ गइल', 'नियमित भुगतान कैलेन्डर मे जुड़ल', 'नियमित भुक्तानी पात्रोमा थपियो'));
              }}
              className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input type="text" required value={recTitle} onChange={(e) => setRecTitle(e.target.value)} placeholder={t5(language, 'Title (e.g. Internet / Rent)', 'शीर्षक (जैसे किराया / इंटरनेट)', 'शीर्षक (जइसे किराया / इंटरनेट)', 'शीर्षक (जेना भाड़ा / इन्टरनेट)', 'शीर्षक (जस्तै भाडा / इन्टरनेट)')} className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold" />
                <input type="number" min={1} value={recAmt} onChange={(e) => setRecAmt(Number(e.target.value))} placeholder={t5(language, 'Amount', 'राशि', 'रकम', 'राशि', 'रकम')} className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums" />
                <select value={recFreq} onChange={(e) => setRecFreq(e.target.value as any)} className="min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold">
                  <option value="monthly">{getFrequencyLabel('monthly')}</option>
                  <option value="weekly">{getFrequencyLabel('weekly')}</option>
                  <option value="quarterly">{getFrequencyLabel('quarterly')}</option>
                  <option value="yearly">{getFrequencyLabel('yearly')}</option>
                </select>
              </div>
              <DualBSDatePicker label={t5(language, 'Next Due Date', 'अगली तिथि', 'अगिला तारीख', 'आगाक तिथि', 'अर्को मिति')} bsDate={recBS} adDate={recAD} language={language} onChange={(b, a) => { setRecBS(b); setRecAD(a); }} />
              <button type="submit" className="min-h-[38px] px-4 bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer">
                {t5(language, '+ Add Recurring', '+ नियमित भुगतान जोड़ें', '+ नियमित भुगतान जोड़ीं', '+ नियमित भुगतान जोड़ू', '+ नियमित भुक्तानी थप्नुहोस्')}
              </button>
            </form>

            <div className="space-y-2">
              {db.recurringPayments.map((r) => (
                <div key={r.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{r.title}</div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      {t5(language, 'Next Due:', 'अगली तिथि:', 'अगिला तारीख:', 'आगाक तिथि:', 'अर्को मिति:')} {r.nextDueDateBS} {bsTag(language)} ({getFrequencyLabel(r.frequency)}) • {formatMoney(r.amount, currency, language)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const next = advanceDateByFrequency(r.nextDueDateBS, r.frequency);
                        bankDb.upsertRecurring({
                          ...r,
                          nextDueDateBS: next.bsStr,
                          nextDueDateAD: next.adStr,
                          history: [...r.history, { id: makeId('rh'), paidDateBS: today.bsStr, paidDateAD: today.adStr, amount: r.amount }],
                        });
                        showToast(
                          t5(
                            language,
                            `Paid; next due ${next.bsStr} BS`,
                            `भुगतान हुआ; अगली तिथि ${next.bsStr} वि.सं.`,
                            `जमा भइल; अगिला तारीख ${next.bsStr} वि.सं.`,
                            `भुगतान भेल; आगाक तिथि ${next.bsStr} वि.सं.`,
                            `तिरियाे; अर्को मिति ${next.bsStr} वि.सं.`
                          )
                        );
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] cursor-pointer"
                    >
                      {t5(language, 'Mark Paid', 'भुगतान हुआ', 'जमा भइल', 'भुगतान भेल', 'तिरेको चिन्ह')}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDel({
                          title: t5(language, 'Delete Recurring', 'नियमित भुगतान हटाएं', 'नियमित भुगतान हटाईं', 'नियमित भुगतान हटाउ', 'नियमित भुक्तानी हटाउनुहोस्'),
                          msg: t5(language, `Delete "${r.title}"?`, `"${r.title}" हटाएं?`, `"${r.title}" हटाईं?`, `"${r.title}" हटाउ?`, `"${r.title}" हटाउने?`),
                          onConfirm: () => bankDb.deleteRecurring(r.id),
                        })
                      }
                      className="p-1 text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'bank_ledger': {
        return (
          <div className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!bkName.trim()) return;
                bankDb.upsertBankAccount({
                  bankName: bkName.trim(),
                  accountNickname: bkNick.trim() || `${bkName.trim()} ${bkType.toUpperCase()}`,
                  accountType: bkType,
                  openingBalance: bkOpen,
                  interestRatePercent: bkRate,
                  maturityDateBS: bkMatBS || undefined,
                  maturityDateAD: bkMatAD || undefined,
                  maturityAmount: bkMatAmt > 0 ? bkMatAmt : undefined,
                });
                setBkName('');
                setBkNick('');
                showToast(t5(language, 'Bank account added', 'बैंक खाता जोड़ा गया', 'बैंक खाता जोड़ल गइल', 'बैंक खाता जोड़ल गेल', 'बैंक खाता थपियो'));
              }}
              className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
            >
              <div className="text-xs font-bold text-slate-800">
                {t5(language, 'Add Bank Account / FD / RD', 'बैंक खाता / FD / RD जोड़ें', 'बैंक खाता / FD / RD जोड़ीं', 'बैंक खाता / FD / RD जोड़ू', 'बैंक खाता / FD / RD थप्नुहोस्')}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <input type="text" required value={bkName} onChange={(e) => setBkName(e.target.value)} placeholder={t5(language, 'Bank Name *', 'बैंक का नाम *', 'बैंक के नाम *', 'बैंकक नाम *', 'बैंकको नाम *')} className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold" />
                <input type="text" value={bkNick} onChange={(e) => setBkNick(e.target.value)} placeholder={t5(language, 'Nickname', 'उपनाम', 'छोट नाम', 'उपनाम', 'उपनाम')} className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs" />
                <select value={bkType} onChange={(e) => setBkType(e.target.value as any)} className="min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold">
                  <option value="savings">{t5(language, 'Savings', 'बचत', 'बचत', 'बचत', 'बचत')}</option>
                  <option value="current">{t5(language, 'Current', 'चालू', 'चालू', 'चालू', 'चल्ती')}</option>
                  <option value="fd">{t5(language, 'Fixed Deposit (FD)', 'सावधि जमा (FD)', 'फिक्स डिपॉजिट (FD)', 'फिक्स डिपॉजिट (FD)', 'मुद्दती (FD)')}</option>
                  <option value="rd">{t5(language, 'Recurring Deposit (RD)', 'आवर्ती जमा (RD)', 'रेकरिंग (RD)', 'आवर्ती जमा (RD)', 'आवर्ती (RD)')}</option>
                </select>
                <input type="number" value={bkOpen} onChange={(e) => setBkOpen(Number(e.target.value))} placeholder={t5(language, 'Opening Balance', 'प्रारंभिक शेष', 'शुरू के बैलेंस', 'प्रारम्भिक शेष', 'सुरुवाती मौज्दात')} className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums" />
                <input type="number" step="0.1" value={bkRate} onChange={(e) => setBkRate(Number(e.target.value))} placeholder={t5(language, 'Interest Rate %', 'ब्याज दर %', 'ब्याज दर %', 'ब्याज दर %', 'ब्याजदर %')} className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums" />
                {(bkType === 'fd' || bkType === 'rd') && (
                  <input type="number" value={bkMatAmt} onChange={(e) => setBkMatAmt(Number(e.target.value))} placeholder={t5(language, 'Maturity Value', 'परिपक्वता राशि', 'मियाद पर मिले वाला रकम', 'परिपक्वता राशि', 'परिपक्व रकम')} className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums" />
                )}
              </div>
              {(bkType === 'fd' || bkType === 'rd') && (
                <DualBSDatePicker label={t5(language, 'Maturity Date', 'परिपक्वता तिथि', 'मियाद पूरा तारीख', 'परिपक्वता तिथि', 'परिपक्व मिति')} bsDate={bkMatBS || today.bsStr} adDate={bkMatAD || today.adStr} language={language} onChange={(b, a) => { setBkMatBS(b); setBkMatAD(a); }} />
              )}
              <button type="submit" className="min-h-[38px] px-4 bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer">
                {t5(language, '+ Add Bank Account', '+ बैंक खाता जोड़ें', '+ बैंक खाता जोड़ीं', '+ बैंक खाता जोड़ू', '+ बैंक खाता थप्नुहोस्')}
              </button>
            </form>

            {db.bankAccounts.length > 0 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const aid = txAccId || db.bankAccounts[0]?.id;
                  if (!aid || txAmt <= 0) return;
                  bankDb.addBankTransaction({
                    accountId: aid,
                    type: txKind,
                    amount: txAmt,
                    dateBS: txBS,
                    dateAD: txAD,
                    note: txNote.trim() || undefined,
                  });
                  setTxNote('');
                  showToast(t5(language, 'Bank transaction recorded', 'बैंक लेनदेन दर्ज हुआ', 'बैंक लेनदेन लिखल गइल', 'बैंक लेनदेन दर्ज भेल', 'बैंक कारोबार रेकर्ड भयो'));
                }}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
              >
                <div className="text-xs font-bold text-slate-800">
                  {t5(language, 'Record Deposit / Withdrawal / Interest Credit', 'जमा / निकासी / ब्याज प्रविष्टि', 'जमा / निकासी / ब्याज लिखीं', 'जमा / निकासी / ब्याज दर्ज करू', 'जम्मा / झिकिएको / ब्याज रेकर्ड')}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <select value={txAccId || db.bankAccounts[0]?.id} onChange={(e) => setTxAccId(e.target.value)} className="min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold">
                    {db.bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.accountNickname}</option>)}
                  </select>
                  <select value={txKind} onChange={(e) => setTxKind(e.target.value as any)} className="min-h-[38px] px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold">
                    <option value="deposit">{getBankTxTypeLabel('deposit')}</option>
                    <option value="withdrawal">{getBankTxTypeLabel('withdrawal')}</option>
                    <option value="interest_credit">{getBankTxTypeLabel('interest_credit')}</option>
                  </select>
                  <input type="number" min={1} value={txAmt} onChange={(e) => setTxAmt(Number(e.target.value))} placeholder={t5(language, 'Amount', 'राशि', 'रकम', 'राशि', 'रकम')} className="min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold tabular-nums" />
                </div>
                <DualBSDatePicker label={t5(language, 'Transaction Date', 'लेनदेन तिथि', 'लेनदेन तारीख', 'लेनदेन तिथि', 'कारोबार मिति')} bsDate={txBS} adDate={txAD} language={language} onChange={(b, a) => { setTxBS(b); setTxAD(a); }} />
                <div className="flex gap-2">
                  <input type="text" value={txNote} onChange={(e) => setTxNote(e.target.value)} placeholder={t5(language, 'Description / Cheque #', 'विवरण / चेक नं.', 'विवरण / चेक नंबर', 'विवरण / चेक नं.', 'विवरण / चेक नं.')} className="flex-1 min-h-[38px] px-2.5 bg-white border border-slate-300 rounded-lg text-xs" />
                  <button type="submit" className="min-h-[38px] px-4 bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer">
                    {t5(language, 'Save Entry', 'प्रविष्टि सहेजें', 'सेव करीं', 'प्रविष्टि सुरक्षित करू', 'रेकर्ड सुरक्षित')}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {db.bankAccounts.map((acc) => {
                const txs = db.bankTransactions.filter((t) => t.accountId === acc.id);
                const bal = acc.openingBalance + txs.reduce((s, t) => s + (t.type === 'withdrawal' ? -t.amount : t.amount), 0);
                return (
                  <div key={acc.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{acc.accountNickname} ({acc.accountType.toUpperCase()})</div>
                      <div className="text-[11px] text-slate-500 tabular-nums">
                        {acc.bankName} • {acc.interestRatePercent}% {t5(language, 'p.a.', 'वार्षिक', 'सालाना', 'वार्षिक', 'वार्षिक')}
                        {acc.maturityDateBS ? ` • ${t5(language, 'Mat:', 'परिपक्व:', 'मियाद:', 'परिपक्व:', 'परिपक्व:')} ${acc.maturityDateBS} ${bsTag(language)}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="font-extrabold text-slate-900">{formatMoney(bal, currency, language)}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDel({
                            title: t5(language, 'Delete Bank Account', 'बैंक खाता हटाएं', 'बैंक खाता हटाईं', 'बैंक खाता हटाउ', 'बैंक खाता हटाउनुहोस्'),
                            msg: t5(language, `Delete "${acc.accountNickname}" and its ledger?`, `"${acc.accountNickname}" और इसका लेजर हटाएं?`, `"${acc.accountNickname}" आ एकर लेजर हटाईं?`, `"${acc.accountNickname}" आ एकर लेजर हटाउ?`, `"${acc.accountNickname}" र यसको लेजर हटाउने?`),
                            onConfirm: () => bankDb.deleteBankAccount(acc.id),
                          })
                        }
                        className="text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {db.bankTransactions.length > 0 && (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl px-3 max-h-[220px] overflow-y-auto text-xs">
                  {db.bankTransactions.map((t) => {
                    const acc = db.bankAccounts.find((a) => a.id === t.accountId);
                    return (
                      <div key={t.id} className="py-2 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-800">{acc?.accountNickname || t5(language, 'Bank', 'बैंक', 'बैंक', 'बैंक', 'बैंक')} • {getBankTxTypeLabel(t.type)}</div>
                          <div className="text-[10px] text-slate-500 tabular-nums">{t.dateBS} {bsTag(language)} {t.note ? `• ${t.note}` : ''}</div>
                        </div>
                        <div className="flex items-center gap-2 tabular-nums">
                          <span className={`font-bold ${t.type === 'withdrawal' ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {t.type === 'withdrawal' ? '-' : '+'}{formatMoney(t.amount, currency, language)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDel({
                                title: t5(language, 'Delete Transaction', 'लेनदेन हटाएं', 'लेनदेन हटाईं', 'लेनदेन हटाउ', 'कारोबार हटाउनुहोस्'),
                                msg: t5(language, 'Remove this transaction?', 'क्या यह लेनदेन हटाएं?', 'का ई लेनदेन हटाईं?', 'की ई लेनदेन हटाउ?', 'यो कारोबार हटाउने?'),
                                onConfirm: () => bankDb.deleteBankTransaction(t.id),
                              })
                            }
                            className="text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      }
    }
  };

  const activeToolMeta = TOOL_LIST.find((t) => t.id === activeTool) || TOOL_LIST[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className={`lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-2 divide-y divide-slate-100 ${mobileDetail ? 'hidden lg:block' : 'block'}`}>
        {TOOL_LIST.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => {
              setActiveTool(tool.id);
              setMobileDetail(true);
            }}
            className={`w-full min-h-[44px] px-3 py-2 text-left text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTool === tool.id ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {pick5(language, tool, 'bankInvestment')}
          </button>
        ))}
      </div>

      <div className={`lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-4 space-y-4 ${mobileDetail ? 'block' : 'hidden lg:block'}`}>
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setMobileDetail(false)}
            className="lg:hidden min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-slate-100 text-slate-700 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base font-bold text-slate-900">
            {pick5(language, activeToolMeta, 'bankInvestment')}
          </h2>
        </div>

        {renderToolWorkspace()}
      </div>

      <ConfirmDialog
        isOpen={Boolean(confirmDel)}
        title={confirmDel?.title || t5(language, 'Confirm', 'पुष्टि करें', 'पक्का करीं', 'पुष्टि करू', 'पुष्टि गर्नुहोस्')}
        message={confirmDel?.msg || ''}
        language={language}
        onCancel={() => setConfirmDel(null)}
        onConfirm={() => {
          confirmDel?.onConfirm();
          setConfirmDel(null);
          showToast(t5(language, 'Deleted', 'हटाया गया', 'हटावल गइल', 'हटाएल गेल', 'हटाइयो'));
        }}
      />
    </div>
  );
};
