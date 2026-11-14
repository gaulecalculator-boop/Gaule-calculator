/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 20 Investment Calculators Suite with Charts, History (Save/Edit/Delete), & PDF Report
 */

import React, { useMemo, useState } from 'react';
import {
  FileDown,
  Save,
  Trash2,
  Edit3,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { Currency, Language } from '../../types';
import {
  calcAnnualInterest,
  calcCompoundInterest,
  calcDailyInterest,
  calcDividend,
  calcFD,
  calcGoldInvestment,
  calcInflation,
  calcLumpsum,
  calcMutualFund,
  calcNetWorth,
  calcPPF,
  calcRD,
  calcRetirement,
  calcSharePnL,
  calcSimpleInterest,
  calcSIP,
  calcStepUpSIP,
  calcStockAverage,
  calcSTP,
  calcSWP,
  CalcResult,
} from '../calculations';
import { bankDb } from '../db';
import { adTag, bsTag, formatMoney, getTodayDual, pick5, t5 } from '../i18n';
import { computePortfolioSummary } from '../insightsAndReminders';
import { exportCalculatorPDF } from '../pdfExport';
import { BankInvestmentDatabase, InvestmentCalcId, SavedCalculatorRecord } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { GrowthChartSVG } from './SimpleCharts';

interface InvestmentCalculatorsViewProps {
  db: BankInvestmentDatabase;
  language: Language;
  currency: Currency;
  showToast: (msg: string) => void;
}

interface CalcDef {
  id: InvestmentCalcId;
  nameEn: string;
  nameHi: string;
  nameBho: string;
  nameMai: string;
  nameNe: string;
  group: 'sip_mf' | 'deposit_interest' | 'equity_gold' | 'wealth_retire';
  descEn: string;
  descHi: string;
  descBho: string;
  descMai: string;
  descNe: string;
}

const CALCULATOR_DEFS: CalcDef[] = [
  {
    id: 'sip',
    nameEn: 'SIP Calculator',
    nameHi: 'SIP कैलकुलेटर',
    nameBho: 'SIP कैलकुलेटर',
    nameMai: 'SIP कैलकुलेटर',
    nameNe: 'SIP क्याल्कुलेटर',
    group: 'sip_mf',
    descEn: 'Systematic monthly mutual fund projection',
    descHi: 'मासिक म्यूचुअल फंड निवेश का अनुमान',
    descBho: 'महीनावार म्यूचुअल फंड निवेश के अनुमान',
    descMai: 'मासिक म्यूचुअल फंड निवेशक अनुमान',
    descNe: 'मासिक म्युचुअल फण्ड लगानी प्रक्षेपण',
  },
  {
    id: 'step_up_sip',
    nameEn: 'Step-Up SIP',
    nameHi: 'स्टेप-अप SIP',
    nameBho: 'स्टेप-अप SIP',
    nameMai: 'स्टेप-अप SIP',
    nameNe: 'स्टेप-अप SIP',
    group: 'sip_mf',
    descEn: 'Annual increment SIP growth projection',
    descHi: 'वार्षिक बढ़ोतरी के साथ SIP वृद्धि अनुमान',
    descBho: 'सालाना बढ़ाव के साथ SIP बढ़ोतरी अनुमान',
    descMai: 'वार्षिक बढ़ोतरी संग SIP वृद्धि अनुमान',
    descNe: 'वार्षिक वृद्धि सहितको SIP प्रक्षेपण',
  },
  {
    id: 'lumpsum',
    nameEn: 'Lumpsum Investment',
    nameHi: 'एकमुश्त निवेश',
    nameBho: 'एकमुश्त निवेश',
    nameMai: 'एकमुश्त निवेश',
    nameNe: 'एकमुष्ट लगानी',
    group: 'sip_mf',
    descEn: 'One-time investment compounding',
    descHi: 'एकमुश्त निवेश का चक्रवृद्धि रिटर्न',
    descBho: 'एक बेर के निवेश पर चक्रवृद्धि रिटर्न',
    descMai: 'एक बेरक निवेश पर चक्रवृद्धि रिटर्न',
    descNe: 'एकमुष्ट लगानीको चक्रवृद्धि प्रतिफल',
  },
  {
    id: 'mutual_fund',
    nameEn: 'Mutual Fund Calc',
    nameHi: 'म्यूचुअल फंड हिसाब',
    nameBho: 'म्यूचुअल फंड हिसाब',
    nameMai: 'म्यूचुअल फंड हिसाब',
    nameNe: 'म्युचुअल फण्ड हिसाब',
    group: 'sip_mf',
    descEn: 'Lumpsum + SIP net of expense ratio',
    descHi: 'खर्च अनुपात घटाकर एकमुश्त + SIP रिटर्न',
    descBho: 'खर्च अनुपात घटा के एकमुश्त + SIP रिटर्न',
    descMai: 'खर्च अनुपात घटबैत एकमुश्त + SIP रिटर्न',
    descNe: 'खर्च अनुपात कटाएर एकमुष्ट + SIP प्रतिफल',
  },
  {
    id: 'swp',
    nameEn: 'SWP Calculator',
    nameHi: 'SWP निकासी हिसाब',
    nameBho: 'SWP निकासी हिसाब',
    nameMai: 'SWP निकासी हिसाब',
    nameNe: 'SWP निकासी हिसाब',
    group: 'sip_mf',
    descEn: 'Systematic monthly withdrawal longevity',
    descHi: 'नियमित मासिक निकासी और शेष राशि',
    descBho: 'नियमित महीनावार निकासी आ बचल पइसा',
    descMai: 'नियमित मासिक निकासी आ शेष राशि',
    descNe: 'नियमित मासिक निकासी र बाँकी कोष',
  },
  {
    id: 'stp',
    nameEn: 'STP Calculator',
    nameHi: 'STP ट्रांसफर हिसाब',
    nameBho: 'STP ट्रांसफर हिसाब',
    nameMai: 'STP ट्रांसफर हिसाब',
    nameNe: 'STP ट्रान्सफर हिसाब',
    group: 'sip_mf',
    descEn: 'Systematic source-to-target fund transfer',
    descHi: 'एक फंड से दूसरे फंड में नियमित ट्रांसफर',
    descBho: 'एगो फंड से दूसरा फंड में नियमित ट्रांसफर',
    descMai: 'एक फंड सँ दोसर फंड मे नियमित ट्रांसफर',
    descNe: 'एउटा फण्डबाट अर्कोमा नियमित स्थानान्तरण',
  },
  {
    id: 'fd',
    nameEn: 'FD Calculator',
    nameHi: 'सावधि जमा (FD) हिसाब',
    nameBho: 'फिक्स्ड डिपॉजिट (FD) हिसाब',
    nameMai: 'सावधि जमा (FD) हिसाब',
    nameNe: 'मुद्दती (FD) हिसाब',
    group: 'deposit_interest',
    descEn: 'Fixed Deposit maturity & TDS deduction',
    descHi: 'FD परिपक्वता राशि और TDS कटौती',
    descBho: 'FD पूरा होखला के रकम आ TDS कटौती',
    descMai: 'FD परिपक्वता राशि आ TDS कटौती',
    descNe: 'मुद्दती निक्षेप परिपक्वता र कर कटौती',
  },
  {
    id: 'rd',
    nameEn: 'RD Calculator',
    nameHi: 'आवर्ती जमा (RD) हिसाब',
    nameBho: 'आवर्ती जमा (RD) हिसाब',
    nameMai: 'आवर्ती जमा (RD) हिसाब',
    nameNe: 'आवर्ती (RD) हिसाब',
    group: 'deposit_interest',
    descEn: 'Recurring monthly deposit quarterly compound',
    descHi: 'त्रैमासिक चक्रवृद्धि के साथ मासिक RD जमा',
    descBho: 'तिमाही चक्रवृद्धि के साथ महीनावार RD जमा',
    descMai: 'तिमाही चक्रवृद्धि संग मासिक RD जमा',
    descNe: 'त्रैमासिक चक्रवृद्धि सहित मासिक आवर्ती बचत',
  },
  {
    id: 'compound_interest',
    nameEn: 'Compound Interest',
    nameHi: 'चक्रवृद्धि ब्याज',
    nameBho: 'चक्रवृद्धि ब्याज',
    nameMai: 'चक्रवृद्धि ब्याज',
    nameNe: 'चक्रवृद्धि ब्याज',
    group: 'deposit_interest',
    descEn: 'Daily to annual compounding & EAR',
    descHi: 'दैनिक से वार्षिक चक्रवृद्धि व प्रभावी दर',
    descBho: 'रोज़ से सालाना चक्रवृद्धि आ प्रभावी दर',
    descMai: 'दैनिक सँ वार्षिक चक्रवृद्धि आ प्रभावी दर',
    descNe: 'दैनिकदेखि वार्षिक चक्रवृद्धि र प्रभावकारी दर',
  },
  {
    id: 'simple_interest',
    nameEn: 'Simple Interest',
    nameHi: 'साधारण ब्याज',
    nameBho: 'साधारण ब्याज',
    nameMai: 'साधारण ब्याज',
    nameNe: 'साधारण ब्याज',
    group: 'deposit_interest',
    descEn: 'Flat annual simple interest breakdown',
    descHi: 'सीधे वार्षिक साधारण ब्याज का विवरण',
    descBho: 'सीधा सालाना साधारण ब्याज के विवरण',
    descMai: 'सीधा वार्षिक साधारण ब्याजक विवरण',
    descNe: 'वार्षिक साधारण ब्याजको विवरण',
  },
  {
    id: 'daily_interest',
    nameEn: 'Daily Interest',
    nameHi: 'दैनिक ब्याज',
    nameBho: 'रोज़ के ब्याज',
    nameMai: 'दैनिक ब्याज',
    nameNe: 'दैनिक ब्याज',
    group: 'deposit_interest',
    descEn: 'Day-count basis (365 / 360 days)',
    descHi: 'दिनों के आधार पर ब्याज (365 / 360 दिन)',
    descBho: 'दिन गिन के ब्याज (365 / 360 दिन)',
    descMai: 'दिनक आधार पर ब्याज (365 / 360 दिन)',
    descNe: 'दिनको आधारमा ब्याज (३६५ / ३६० दिन)',
  },
  {
    id: 'annual_interest',
    nameEn: 'Annual Interest',
    nameHi: 'वार्षिक ब्याज',
    nameBho: 'सालाना ब्याज',
    nameMai: 'वार्षिक ब्याज',
    nameNe: 'वार्षिक ब्याज',
    group: 'deposit_interest',
    descEn: 'Annual payout vs annual reinvestment',
    descHi: 'सालाना निकासी बनाम पुनर्निवेश तुलना',
    descBho: 'सालाना निकासी बनाम फेर से निवेश तुलना',
    descMai: 'वार्षिक निकासी बनाम पुनर्निवेश तुलना',
    descNe: 'वार्षिक भुक्तानी बनाम पुनरलगानी तुलना',
  },
  {
    id: 'dividend',
    nameEn: 'Dividend Calculator',
    nameHi: 'लाभांश (Dividend)',
    nameBho: 'लाभांश (Dividend)',
    nameMai: 'लाभांश (Dividend)',
    nameNe: 'लाभांश (Dividend)',
    group: 'equity_gold',
    descEn: 'Cash dividend payout, 5% tax & yield',
    descHi: 'नकद लाभांश, 5% कर व प्रतिफल दर',
    descBho: 'नगद लाभांश, 5% कर आ कमाई दर',
    descMai: 'नगद लाभांश, 5% कर आ प्रतिफल दर',
    descNe: 'नगद लाभांश, ५% कर र प्रतिफल दर',
  },
  {
    id: 'stock_average',
    nameEn: 'Stock Average Price',
    nameHi: 'शेयर औसत मूल्य',
    nameBho: 'शेयर औसत भाव',
    nameMai: 'शेयर औसत मूल्य',
    nameNe: 'सेयर औसत मूल्य',
    group: 'equity_gold',
    descEn: 'Multi-lot weighted average cost',
    descHi: 'कई लॉट खरीद का भारित औसत भाव',
    descBho: 'कई लॉट खरीद के औसत भाव',
    descMai: 'विभिन्न लॉट खरीदक औसत मूल्य',
    descNe: 'धेरै लट खरिदको औसत लागत मूल्य',
  },
  {
    id: 'share_pnl',
    nameEn: 'Share Profit & Loss',
    nameHi: 'शेयर लाभ / हानि',
    nameBho: 'शेयर फायदा / घाटा',
    nameMai: 'शेयर लाभ / हानि',
    nameNe: 'सेयर नाफा / नोक्सान',
    group: 'equity_gold',
    descEn: 'Includes broker, SEBON/DP & CGT fees',
    descHi: 'ब्रोकर, SEBON/DP शुल्क और पूंजीगत लाभ कर सहित',
    descBho: 'ब्रोकर, SEBON/DP फीस आ CGT कर के साथ',
    descMai: 'ब्रोकर, SEBON/DP शुल्क आ CGT कर सहित',
    descNe: 'ब्रोकर, SEBON/DP शुल्क र पुँजीगत लाभ कर सहित',
  },
  {
    id: 'gold_investment',
    nameEn: 'Gold Investment',
    nameHi: 'सोना निवेश हिसाब',
    nameBho: 'सोना निवेश हिसाब',
    nameMai: 'सोन निवेश हिसाब',
    nameNe: 'सुन लगानी हिसाब',
    group: 'equity_gold',
    descEn: 'Purchase vs current manual market CAGR',
    descHi: 'खरीद बनाम वर्तमान बाजार मूल्य व CAGR',
    descBho: 'खरीद बनाम आज के बाजार भाव आ CAGR',
    descMai: 'खरीद बनाम वर्तमान बाजार मूल्य आ CAGR',
    descNe: 'खरिद र हालको बजार मूल्य तथा CAGR हिसाब',
  },
  {
    id: 'retirement',
    nameEn: 'Retirement Planning',
    nameHi: 'रिटायरमेंट योजना',
    nameBho: 'रिटायरमेंट योजना',
    nameMai: 'सेवानिवृत्ति योजना',
    nameNe: 'अवकाश योजना',
    group: 'wealth_retire',
    descEn: 'Inflation-adjusted retirement corpus & SIP',
    descHi: 'महंगाई के अनुसार रिटायरमेंट कोष और मासिक SIP',
    descBho: 'महँगाई के हिसाब से रिटायरमेंट कोष आ SIP',
    descMai: 'महँगी अनुसार सेवानिवृत्ति कोष आ मासिक SIP',
    descNe: 'मुद्रास्फीति अनुसारको अवकाश कोष र SIP',
  },
  {
    id: 'inflation',
    nameEn: 'Inflation Calculator',
    nameHi: 'महंगाई (Inflation)',
    nameBho: 'महँगाई (Inflation)',
    nameMai: 'महँगी (Inflation)',
    nameNe: 'मुद्रास्फीति (Inflation)',
    group: 'wealth_retire',
    descEn: 'Future cost & purchasing power erosion',
    descHi: 'भविष्य की कीमत और क्रय शक्ति में कमी',
    descBho: 'आगे के कीमत आ पइसा के ताकत में कमी',
    descMai: 'भविष्यक लागत आ क्रय शक्ति मे कमी',
    descNe: 'भविष्यको लागत र क्रय शक्तिमा ह्रास',
  },
  {
    id: 'ppf',
    nameEn: 'PPF / Provident Fund',
    nameHi: 'संचय कोष / PPF',
    nameBho: 'संचय कोष / PPF',
    nameMai: 'संचय कोष / PPF',
    nameNe: 'सञ्चय कोष / PPF',
    group: 'wealth_retire',
    descEn: 'Annual contribution + employer match',
    descHi: 'वार्षिक योगदान + नियोक्ता अंशदान',
    descBho: 'सालाना जमा + कंपनी के योगदान',
    descMai: 'वार्षिक योगदान + नियोक्ता अंशदान',
    descNe: 'वार्षिक योगदान र रोजगारदाताको थप रकम',
  },
  {
    id: 'net_worth',
    nameEn: 'Net Worth Calculator',
    nameHi: 'कुल शुद्ध संपत्ति (Net Worth)',
    nameBho: 'कुल शुद्ध संपत्ति (Net Worth)',
    nameMai: 'कुल शुद्ध संपत्ति (Net Worth)',
    nameNe: 'खुद सम्पत्ति (Net Worth)',
    group: 'wealth_retire',
    descEn: 'Assets minus liabilities & debt ratio',
    descHi: 'संपत्ति में से कर्ज घटाकर कुल शुद्ध संपत्ति',
    descBho: 'संपत्ति में से कर्जा घटा के शुद्ध संपत्ति',
    descMai: 'संपत्ति सँ दायित्व घटाकय शुद्ध संपत्ति',
    descNe: 'सम्पत्तिबाट दायित्व घटाएर खुद सम्पत्ति हिसाब',
  },
];

const DEFAULT_INPUTS: Record<InvestmentCalcId, Record<string, any>> = {
  sip: { monthly: 10000, rate: 12, years: 10 },
  step_up_sip: { monthly: 10000, stepUp: 10, rate: 12, years: 10 },
  lumpsum: { principal: 200000, rate: 12, years: 8 },
  mutual_fund: { lumpsum: 100000, monthlySip: 5000, rate: 13, years: 7, expenseRatio: 1.2 },
  swp: { corpus: 2500000, withdrawal: 20000, rate: 9, years: 10 },
  stp: { sourceCorpus: 1000000, monthlyTransfer: 50000, sourceRate: 6, targetRate: 12, years: 3 },
  fd: { principal: 500000, rate: 8.5, years: 3, compounding: 4, tds: 6 },
  rd: { monthly: 5000, rate: 8, months: 36 },
  compound_interest: { principal: 100000, rate: 10, years: 5, compounding: 12 },
  simple_interest: { principal: 100000, rate: 10, years: 3 },
  daily_interest: { principal: 100000, rate: 9, days: 45, compoundedDaily: false, basis: 365 },
  annual_interest: { principal: 250000, rate: 9.5, years: 5, payoutMode: 'reinvest' },
  dividend: { shares: 500, sharePrice: 450, dividendVal: 20, mode: 'percent_of_par', parValue: 100, tax: 5 },
  stock_average: { q1: 100, p1: 520, q2: 150, p2: 410, q3: 0, p3: 0, cmp: 480 },
  share_pnl: { qty: 200, buyPrice: 380, sellPrice: 495, broker: 0.4, dpFee: 25, cgt: 7.5 },
  gold_investment: { units: 2, buyPrice: 135000, currentPrice: 162000, making: 8000, years: 2 },
  retirement: { curAge: 30, retAge: 60, lifeExp: 82, monthlyExp: 45000, inflation: 6, preRate: 11, postRate: 7.5, existing: 300000 },
  inflation: { presentCost: 100000, inflation: 6.5, years: 10 },
  ppf: { annual: 120000, rate: 7.1, years: 15, match: 100 },
  net_worth: { cashBank: 350000, fdRd: 400000, mfSip: 250000, shares: 150000, gold: 200000, propertyOther: 0, homeLoan: 0, personalLoan: 0, cardDebt: 0, otherLoans: 0 },
};

const getCalcName = (c: CalcDef, lang: Language) =>
  pick5(lang, { en: c.nameEn, hi: c.nameHi, bho: c.nameBho, mai: c.nameMai, ne: c.nameNe });

const getCalcDesc = (c: CalcDef, lang: Language) =>
  pick5(lang, { en: c.descEn, hi: c.descHi, bho: c.descBho, mai: c.descMai, ne: c.descNe });

export const InvestmentCalculatorsView: React.FC<InvestmentCalculatorsViewProps> = ({
  db,
  language,
  currency,
  showToast,
}) => {
  const [selectedId, setSelectedId] = useState<InvestmentCalcId>('sip');
  const [mobileShowDetail, setMobileShowDetail] = useState<boolean>(false);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<'all' | CalcDef['group']>('all');
  const [inputsByCalc, setInputsByCalc] = useState<Record<string, Record<string, any>>>(DEFAULT_INPUTS);
  const [customTitle, setCustomTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedCalculatorRecord | null>(null);

  const activeDef = CALCULATOR_DEFS.find((c) => c.id === selectedId) || CALCULATOR_DEFS[0];
  const inp = inputsByCalc[selectedId] || DEFAULT_INPUTS[selectedId];

  const yrsSuffix = t5(language, 'Yrs', 'वर्ष', 'बरिस', 'वर्ष', 'वर्ष');
  const mosSuffix = t5(language, 'Mos', 'माह', 'महीना', 'माह', 'महिना');
  const daysSuffix = t5(language, 'Days', 'दिन', 'दिन', 'दिन', 'दिन');

  const updateField = (key: string, value: any) => {
    setInputsByCalc((prev) => ({
      ...prev,
      [selectedId]: {
        ...(prev[selectedId] || DEFAULT_INPUTS[selectedId]),
        [key]: value,
      },
    }));
  };

  const filteredCalcs = useMemo(() => {
    return CALCULATOR_DEFS.filter((c) => {
      const gOk = groupFilter === 'all' || c.group === groupFilter;
      const q = search.trim().toLowerCase();
      const sOk =
        !q ||
        c.nameEn.toLowerCase().includes(q) ||
        getCalcName(c, language).toLowerCase().includes(q) ||
        c.descEn.toLowerCase().includes(q) ||
        getCalcDesc(c, language).toLowerCase().includes(q);
      return gOk && sOk;
    });
  }, [groupFilter, search, language]);

  const result: CalcResult = useMemo(() => {
    const num = (k: string, d = 0) => Math.max(0, Number(inp[k] ?? d) || 0);
    switch (selectedId) {
      case 'sip':
        return calcSIP(num('monthly'), num('rate'), Math.max(0.5, num('years', 1)), language);
      case 'step_up_sip':
        return calcStepUpSIP(num('monthly'), num('stepUp'), num('rate'), Math.max(1, num('years', 1)), language);
      case 'lumpsum':
        return calcLumpsum(num('principal'), num('rate'), num('years'), language);
      case 'mutual_fund':
        return calcMutualFund(num('lumpsum'), num('monthlySip'), num('rate'), Math.max(1, num('years', 1)), num('expenseRatio'), language);
      case 'swp':
        return calcSWP(num('corpus'), num('withdrawal'), num('rate'), Math.max(1, num('years', 1)), language);
      case 'stp':
        return calcSTP(num('sourceCorpus'), num('monthlyTransfer'), num('sourceRate'), num('targetRate'), Math.max(1, num('years', 1)), language);
      case 'fd':
        return calcFD(num('principal'), num('rate'), num('years'), (Number(inp.compounding) || 4) as 1 | 2 | 4 | 12, num('tds'), language);
      case 'rd':
        return calcRD(num('monthly'), num('rate'), Math.max(1, num('months', 12)), language);
      case 'compound_interest':
        return calcCompoundInterest(num('principal'), num('rate'), num('years'), (Number(inp.compounding) || 12) as 1 | 2 | 4 | 12 | 365, language);
      case 'simple_interest':
        return calcSimpleInterest(num('principal'), num('rate'), num('years'), language);
      case 'daily_interest':
        return calcDailyInterest(num('principal'), num('rate'), num('days'), Boolean(inp.compoundedDaily), (Number(inp.basis) || 365) as 365 | 360, language);
      case 'annual_interest':
        return calcAnnualInterest(num('principal'), num('rate'), num('years'), inp.payoutMode === 'payout' ? 'payout' : 'reinvest', language);
      case 'dividend':
        return calcDividend(num('shares'), num('sharePrice'), num('dividendVal'), inp.mode === 'per_share' ? 'per_share' : 'percent_of_par', num('parValue', 100), num('tax'), language);
      case 'stock_average':
        return calcStockAverage(
          [
            { qty: num('q1'), price: num('p1') },
            { qty: num('q2'), price: num('p2') },
            { qty: num('q3'), price: num('p3') },
          ].filter((l) => l.qty > 0),
          num('cmp'),
          language
        );
      case 'share_pnl':
        return calcSharePnL(num('qty'), num('buyPrice'), num('sellPrice'), num('broker'), num('dpFee'), num('cgt'), language);
      case 'gold_investment':
        return calcGoldInvestment(num('units'), num('buyPrice'), num('currentPrice'), num('making'), Math.max(0.1, num('years', 1)), language);
      case 'retirement':
        return calcRetirement(
          num('curAge', 30),
          Math.max(num('curAge', 30) + 1, num('retAge', 60)),
          Math.max(num('retAge', 60) + 1, num('lifeExp', 80)),
          num('monthlyExp'),
          num('inflation'),
          num('preRate'),
          num('postRate'),
          num('existing'),
          language
        );
      case 'inflation':
        return calcInflation(num('presentCost'), num('inflation'), num('years'), language);
      case 'ppf':
        return calcPPF(num('annual'), num('rate'), Math.max(1, num('years', 1)), num('match'), language);
      case 'net_worth':
        return calcNetWorth(
          {
            cashBank: num('cashBank'),
            fdRd: num('fdRd'),
            mfSip: num('mfSip'),
            shares: num('shares'),
            gold: num('gold'),
            propertyOther: num('propertyOther'),
          },
          {
            homeLoan: num('homeLoan'),
            personalVehicleLoan: num('personalLoan'),
            creditCardDebt: num('cardDebt'),
            otherLoans: num('otherLoans'),
          },
          language
        );
    }
  }, [inp, selectedId, language]);

  const handleSave = () => {
    const today = getTodayDual();
    const title = customTitle.trim() || `${getCalcName(activeDef, language)} (${today.bsStr})`;
    bankDb.saveCalculation({
      id: editingRecordId || undefined,
      calcId: selectedId,
      title,
      inputs: inp,
      summary: {
        primaryLabel: result.primaryLabel,
        primaryValue: result.primaryValue,
        investedAmount: result.investedAmount,
        gainOrInterest: result.gainOrInterest,
        secondaryLabel: result.secondaryLabel,
        secondaryValue: result.secondaryValue,
      },
      notes: notes.trim() || undefined,
      bsDate: today.bsStr,
      adDate: today.adStr,
    });
    showToast(
      editingRecordId
        ? t5(
            language,
            'Calculation updated in history',
            'इतिहास में हिसाब अपडेट हुआ',
            'इतिहास में हिसाब अपडेट भइल',
            'इतिहास मे हिसाब अपडेट भेल',
            'इतिहासमा हिसाब अपडेट गरियो'
          )
        : t5(
            language,
            'Saved to calculation history',
            'हिसाब इतिहास में सुरक्षित हुआ',
            'हिसाब इतिहास में सेव भइल',
            'हिसाब इतिहास मे सुरक्षित भेल',
            'हिसाब इतिहासमा सुरक्षित गरियो'
          )
    );
    setEditingRecordId(null);
    setCustomTitle('');
    setNotes('');
  };

  const handleEditRecord = (rec: SavedCalculatorRecord) => {
    setSelectedId(rec.calcId);
    setInputsByCalc((prev) => ({ ...prev, [rec.calcId]: { ...DEFAULT_INPUTS[rec.calcId], ...rec.inputs } }));
    setCustomTitle(rec.title);
    setNotes(rec.notes || '');
    setEditingRecordId(rec.id);
    setMobileShowDetail(true);
  };

  const handleExportPDF = () => {
    const inputPairs = Object.entries(inp).map(([k, v]) => ({
      label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
      value: String(v),
    }));
    exportCalculatorPDF({
      calculatorTitle: customTitle.trim() || activeDef.nameEn,
      inputs: inputPairs,
      result,
      notes: notes.trim() || undefined,
    });
    showToast(
      t5(
        language,
        'PDF report downloaded',
        'PDF रिपोर्ट डाउनलोड हुई',
        'PDF रिपोर्ट डाउनलोड भइल',
        'PDF रिपोर्ट डाउनलोड भेल',
        'PDF रिपोर्ट डाउनलोड भयो'
      )
    );
  };

  const handleAutofillNetWorthFromDb = () => {
    const summary = computePortfolioSummary(db);
    const homeDebt = db.loans
      .filter((l) => l.category === 'home' && l.status === 'active')
      .reduce((s, l) => s + l.principalAmount, 0);
    const otherLoanDebt = Math.max(0, summary.remainingLoan - homeDebt);
    const unpaidCard = db.creditCardBills
      .filter((b) => !b.isPaid)
      .reduce((s, b) => s + Math.max(0, b.billAmount - b.paidAmount), 0);

    setInputsByCalc((prev) => ({
      ...prev,
      net_worth: {
        ...prev.net_worth,
        cashBank: Math.round(summary.totalBankAndCash),
        mfSip: Math.round(summary.currentInvestmentValue),
        homeLoan: Math.round(Math.min(summary.remainingLoan, homeDebt)),
        personalLoan: Math.round(otherLoanDebt),
        cardDebt: Math.round(unpaidCard),
      },
    }));
    showToast(
      t5(
        language,
        'Populated from saved accounts, portfolio & loans',
        'बचत खाते, निवेश और ऋण डेटा से भर गया',
        'बचत खाता, निवेश आ कर्जा डेटा से भरा गइल',
        'बचत खाता, निवेश आ ऋण डेटा सँ भरल गेल',
        'बचत खाता, लगानी र ऋण डेटाबाट भरियो'
      )
    );
  };

  const savedHistoryForAll = db.savedCalculations;

  const numInput = (key: string, label: string, step = 'any', suffix?: string) => (
    <div key={key} className="space-y-1">
      <label className="block text-[11px] font-bold text-slate-700">{label}</label>
      <div className="relative">
        <input
          type="number"
          step={step}
          min={0}
          value={inp[key] ?? 0}
          onChange={(e) => updateField(key, e.target.value === '' ? 0 : Number(e.target.value))}
          className="w-full min-h-[42px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 tabular-nums outline-none focus:bg-white focus:border-blue-600"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );

  const renderInputs = () => {
    switch (selectedId) {
      case 'sip':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {numInput('monthly', t5(language, 'Monthly SIP Amount', 'मासिक SIP राशि', 'महीनावार SIP रकम', 'मासिक SIP राशि', 'मासिक SIP रकम'), '100')}
            {numInput('rate', t5(language, 'Expected Annual Return (%)', 'अपेक्षित वार्षिक रिटर्न (%)', 'उम्मीद के सालाना रिटर्न (%)', 'अपेक्षित वार्षिक रिटर्न (%)', 'अपेक्षित वार्षिक प्रतिफल (%)'), '0.1', '%')}
            {numInput('years', t5(language, 'Investment Duration (Years)', 'निवेश अवधि (वर्ष)', 'निवेश अवधि (बरिस)', 'निवेश अवधि (वर्ष)', 'लगानी अवधि (वर्ष)'), '0.5', yrsSuffix)}
          </div>
        );
      case 'step_up_sip':
        return (
          <div className="grid grid-cols-2 gap-3">
            {numInput('monthly', t5(language, 'Starting Monthly SIP', 'शुरुआती मासिक SIP', 'शुरुआती महीनावार SIP', 'शुरुआती मासिक SIP', 'सुरुवाती मासिक SIP'), '100')}
            {numInput('stepUp', t5(language, 'Annual Step-Up (%)', 'वार्षिक बढ़ोतरी (%)', 'सालाना बढ़ोतरी (%)', 'वार्षिक बढ़ोतरी (%)', 'वार्षिक वृद्धि (%)'), '1', '%')}
            {numInput('rate', t5(language, 'Expected Return (% p.a.)', 'अपेक्षित रिटर्न (% सालाना)', 'उम्मीद के रिटर्न (% सालाना)', 'अपेक्षित रिटर्न (% वार्षिक)', 'अपेक्षित प्रतिफल (% वार्षिक)'), '0.1', '%')}
            {numInput('years', t5(language, 'Duration (Years)', 'अवधि (वर्ष)', 'अवधि (बरिस)', 'अवधि (वर्ष)', 'अवधि (वर्ष)'), '1', yrsSuffix)}
          </div>
        );
      case 'lumpsum':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {numInput('principal', t5(language, 'Investment Amount', 'निवेश राशि', 'निवेश रकम', 'निवेश राशि', 'लगानी रकम'), '500')}
            {numInput('rate', t5(language, 'Expected Annual Return (%)', 'अपेक्षित वार्षिक रिटर्न (%)', 'उम्मीद के सालाना रिटर्न (%)', 'अपेक्षित वार्षिक रिटर्न (%)', 'अपेक्षित वार्षिक प्रतिफल (%)'), '0.1', '%')}
            {numInput('years', t5(language, 'Period (Years)', 'अवधि (वर्ष)', 'अवधि (बरिस)', 'अवधि (वर्ष)', 'अवधि (वर्ष)'), '0.5', yrsSuffix)}
          </div>
        );
      case 'mutual_fund':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {numInput('lumpsum', t5(language, 'Initial Lumpsum', 'शुरुआती एकमुश्त', 'शुरुआती एकमुश्त', 'शुरुआती एकमुश्त', 'सुरुवाती एकमुष्ट'), '500')}
            {numInput('monthlySip', t5(language, 'Monthly SIP', 'मासिक SIP', 'महीनावार SIP', 'मासिक SIP', 'मासिक SIP'), '500')}
            {numInput('rate', t5(language, 'Expected Gross Return (%)', 'कुल अपेक्षित रिटर्न (%)', 'कुल उम्मीद रिटर्न (%)', 'कुल अपेक्षित रिटर्न (%)', 'अपेक्षित कुल प्रतिफल (%)'), '0.1', '%')}
            {numInput('years', t5(language, 'Holding Years', 'होल्डिंग वर्ष', 'राखे के बरिस', 'अवधि (वर्ष)', 'अवधि (वर्ष)'), '1', yrsSuffix)}
            {numInput('expenseRatio', t5(language, 'Expense Ratio (%)', 'खर्च अनुपात (%)', 'खर्च अनुपात (%)', 'खर्च अनुपात (%)', 'खर्च अनुपात (%)'), '0.05', '%')}
          </div>
        );
      case 'swp':
        return (
          <div className="grid grid-cols-2 gap-3">
            {numInput('corpus', t5(language, 'Initial Corpus', 'शुरुआती जमा कोष', 'शुरुआती जमा रकम', 'शुरुआती जमा कोष', 'सुरुवाती कोष'), '1000')}
            {numInput('withdrawal', t5(language, 'Monthly Withdrawal', 'मासिक निकासी', 'महीनावार निकासी', 'मासिक निकासी', 'मासिक निकासी'), '500')}
            {numInput('rate', t5(language, 'Expected Annual Return (%)', 'अपेक्षित वार्षिक रिटर्न (%)', 'उम्मीद के सालाना रिटर्न (%)', 'अपेक्षित वार्षिक रिटर्न (%)', 'अपेक्षित वार्षिक प्रतिफल (%)'), '0.1', '%')}
            {numInput('years', t5(language, 'Withdrawal Years', 'निकासी वर्ष', 'निकासी बरिस', 'निकासी वर्ष', 'निकासी वर्ष'), '1', yrsSuffix)}
          </div>
        );
      case 'stp':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {numInput('sourceCorpus', t5(language, 'Source Fund Corpus', 'स्रोत फंड राशि', 'स्रोत फंड रकम', 'स्रोत फंड राशि', 'स्रोत फण्ड रकम'), '1000')}
            {numInput('monthlyTransfer', t5(language, 'Monthly Transfer', 'मासिक ट्रांसफर', 'महीनावार ट्रांसफर', 'मासिक ट्रांसफर', 'मासिक ट्रान्सफर'), '500')}
            {numInput('sourceRate', t5(language, 'Source Return (%)', 'स्रोत फंड रिटर्न (%)', 'स्रोत फंड रिटर्न (%)', 'स्रोत फंड रिटर्न (%)', 'स्रोत प्रतिफल (%)'), '0.1', '%')}
            {numInput('targetRate', t5(language, 'Target Return (%)', 'लक्ष्य फंड रिटर्न (%)', 'लक्ष्य फंड रिटर्न (%)', 'लक्ष्य फंड रिटर्न (%)', 'लक्ष्य प्रतिफल (%)'), '0.1', '%')}
            {numInput('years', t5(language, 'Duration (Years)', 'अवधि (वर्ष)', 'अवधि (बरिस)', 'अवधि (वर्ष)', 'अवधि (वर्ष)'), '1', yrsSuffix)}
          </div>
        );
      case 'fd':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {numInput('principal', t5(language, 'FD Deposit Amount', 'FD जमा राशि', 'FD जमा रकम', 'FD जमा राशि', 'FD निक्षेप रकम'), '1000')}
            {numInput('rate', t5(language, 'Interest Rate (% p.a.)', 'ब्याज दर (% सालाना)', 'ब्याज दर (% सालाना)', 'ब्याज दर (% वार्षिक)', 'ब्याज दर (% वार्षिक)'), '0.1', '%')}
            {numInput('years', t5(language, 'Tenure (Years)', 'अवधि (वर्ष)', 'अवधि (बरिस)', 'अवधि (वर्ष)', 'अवधि (वर्ष)'), '0.25', yrsSuffix)}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                {t5(language, 'Compounding', 'चक्रवृद्धि प्रकार', 'चक्रवृद्धि प्रकार', 'चक्रवृद्धि प्रकार', 'चक्रवृद्धि प्रकार')}
              </label>
              <select
                value={inp.compounding}
                onChange={(e) => updateField('compounding', Number(e.target.value))}
                className="w-full min-h-[42px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value={4}>{t5(language, 'Quarterly', 'त्रैमासिक', 'तिमाही', 'तिमाही', 'त्रैमासिक')}</option>
                <option value={12}>{t5(language, 'Monthly', 'मासिक', 'महीनावार', 'मासिक', 'मासिक')}</option>
                <option value={2}>{t5(language, 'Half-Yearly', 'अर्धवार्षिक', 'छमाही', 'छमाही', 'अर्धवार्षिक')}</option>
                <option value={1}>{t5(language, 'Yearly', 'वार्षिक', 'सालाना', 'वार्षिक', 'वार्षिक')}</option>
              </select>
            </div>
            {numInput('tds', t5(language, 'TDS / Tax on Interest (%)', 'ब्याज पर TDS / कर (%)', 'ब्याज पर TDS / कर (%)', 'ब्याज पर TDS / कर (%)', 'ब्याजमा कर / TDS (%)'), '0.5', '%')}
          </div>
        );
      case 'rd':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {numInput('monthly', t5(language, 'Monthly RD Deposit', 'मासिक RD जमा', 'महीनावार RD जमा', 'मासिक RD जमा', 'मासिक RD जम्मा'), '500')}
            {numInput('rate', t5(language, 'Interest Rate (% p.a.)', 'ब्याज दर (% सालाना)', 'ब्याज दर (% सालाना)', 'ब्याज दर (% वार्षिक)', 'ब्याज दर (% वार्षिक)'), '0.1', '%')}
            {numInput('months', t5(language, 'Tenure (Months)', 'अवधि (माह)', 'अवधि (महीना)', 'अवधि (माह)', 'अवधि (महिना)'), '1', mosSuffix)}
          </div>
        );
      case 'compound_interest':
        return (
          <div className="grid grid-cols-2 gap-3">
            {numInput('principal', t5(language, 'Principal Amount', 'मूलधन राशि', 'मूलधन रकम', 'मूलधन राशि', 'साँवा रकम'), '500')}
            {numInput('rate', t5(language, 'Annual Interest Rate (%)', 'वार्षिक ब्याज दर (%)', 'सालाना ब्याज दर (%)', 'वार्षिक ब्याज दर (%)', 'वार्षिक ब्याज दर (%)'), '0.1', '%')}
            {numInput('years', t5(language, 'Time (Years)', 'समय (वर्ष)', 'समय (बरिस)', 'समय (वर्ष)', 'समय (वर्ष)'), '0.5', yrsSuffix)}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                {t5(language, 'Frequency', 'आवृत्ति', 'ब्याज आवृत्ति', 'आवृत्ति', 'आवृत्ति')}
              </label>
              <select
                value={inp.compounding}
                onChange={(e) => updateField('compounding', Number(e.target.value))}
                className="w-full min-h-[42px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value={1}>{t5(language, 'Yearly', 'वार्षिक', 'सालाना', 'वार्षिक', 'वार्षिक')}</option>
                <option value={2}>{t5(language, 'Half-Yearly', 'अर्धवार्षिक', 'छमाही', 'छमाही', 'अर्धवार्षिक')}</option>
                <option value={4}>{t5(language, 'Quarterly', 'त्रैमासिक', 'तिमाही', 'तिमाही', 'त्रैमासिक')}</option>
                <option value={12}>{t5(language, 'Monthly', 'मासिक', 'महीनावार', 'मासिक', 'मासिक')}</option>
                <option value={365}>{t5(language, 'Daily', 'दैनिक', 'रोज़ाना', 'दैनिक', 'दैनिक')}</option>
              </select>
            </div>
          </div>
        );
      case 'simple_interest':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {numInput('principal', t5(language, 'Principal Amount', 'मूलधन राशि', 'मूलधन रकम', 'मूलधन राशि', 'साँवा रकम'), '500')}
            {numInput('rate', t5(language, 'Annual Interest Rate (%)', 'वार्षिक ब्याज दर (%)', 'सालाना ब्याज दर (%)', 'वार्षिक ब्याज दर (%)', 'वार्षिक ब्याज दर (%)'), '0.1', '%')}
            {numInput('years', t5(language, 'Time (Years)', 'समय (वर्ष)', 'समय (बरिस)', 'समय (वर्ष)', 'समय (वर्ष)'), '0.5', yrsSuffix)}
          </div>
        );
      case 'daily_interest':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {numInput('principal', t5(language, 'Principal Amount', 'मूलधन राशि', 'मूलधन रकम', 'मूलधन राशि', 'साँवा रकम'), '500')}
            {numInput('rate', t5(language, 'Annual Rate (%)', 'वार्षिक दर (%)', 'सालाना दर (%)', 'वार्षिक दर (%)', 'वार्षिक दर (%)'), '0.1', '%')}
            {numInput('days', t5(language, 'Number of Days', 'दिनों की संख्या', 'दिन के गिनती', 'दिनक संख्या', 'दिन संख्या'), '1', daysSuffix)}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                {t5(language, 'Day Basis', 'दिन आधार', 'दिन के आधार', 'दिन आधार', 'दिन आधार')}
              </label>
              <select
                value={inp.basis}
                onChange={(e) => updateField('basis', Number(e.target.value))}
                className="w-full min-h-[42px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value={365}>{t5(language, '365 Days / Year', '365 दिन / वर्ष', '365 दिन / बरिस', '365 दिन / वर्ष', '३६५ दिन / वर्ष')}</option>
                <option value={360}>{t5(language, '360 Days / Year', '360 दिन / वर्ष', '360 दिन / बरिस', '360 दिन / वर्ष', '३६० दिन / वर्ष')}</option>
              </select>
            </div>
            <label className="flex items-center gap-2 pt-5 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(inp.compoundedDaily)}
                onChange={(e) => updateField('compoundedDaily', e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <span>{t5(language, 'Daily Compounding', 'दैनिक चक्रवृद्धि', 'रोज़ चक्रवृद्धि', 'दैनिक चक्रवृद्धि', 'दैनिक चक्रवृद्धि')}</span>
            </label>
          </div>
        );
      case 'annual_interest':
        return (
          <div className="grid grid-cols-2 gap-3">
            {numInput('principal', t5(language, 'Principal Amount', 'मूलधन राशि', 'मूलधन रकम', 'मूलधन राशि', 'साँवा रकम'), '500')}
            {numInput('rate', t5(language, 'Annual Rate (%)', 'वार्षिक दर (%)', 'सालाना दर (%)', 'वार्षिक दर (%)', 'वार्षिक दर (%)'), '0.1', '%')}
            {numInput('years', t5(language, 'Years', 'वर्ष', 'बरिस', 'वर्ष', 'वर्ष'), '1', yrsSuffix)}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                {t5(language, 'Interest Mode', 'ब्याज मोड', 'ब्याज तरीका', 'ब्याज मोड', 'ब्याज मोड')}
              </label>
              <select
                value={inp.payoutMode}
                onChange={(e) => updateField('payoutMode', e.target.value)}
                className="w-full min-h-[42px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value="reinvest">{t5(language, 'Reinvest (Compounded)', 'पुनर्निवेश (चक्रवृद्धि)', 'फेर निवेश (चक्रवृद्धि)', 'पुनर्निवेश (चक्रवृद्धि)', 'पुनरलगानी (चक्रवृद्धि)')}</option>
                <option value="payout">{t5(language, 'Annual Payout (Simple)', 'वार्षिक निकासी (साधारण)', 'सालाना निकासी (साधारण)', 'वार्षिक निकासी (साधारण)', 'वार्षिक भुक्तानी (साधारण)')}</option>
              </select>
            </div>
          </div>
        );
      case 'dividend':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {numInput('shares', t5(language, 'Shares Owned', 'कुल शेयर संख्या', 'कुल शेयर गिनती', 'कुल शेयर संख्या', 'कुल सेयर कित्ता'), '1')}
            {numInput('sharePrice', t5(language, 'Buy / Market Price', 'खरीद / बाजार भाव', 'खरीद / बाजार भाव', 'खरीद / बाजार मूल्य', 'खरिद / बजार मूल्य'), '1')}
            {numInput(
              'dividendVal',
              inp.mode === 'per_share'
                ? t5(language, 'Dividend / Share', 'प्रति शेयर लाभांश', 'हर शेयर लाभांश', 'प्रति शेयर लाभांश', 'प्रति कित्ता लाभांश')
                : t5(language, 'Dividend % on Par', 'अंकित मूल्य पर लाभांश %', 'अंकित दाम पर लाभांश %', 'अंकित मूल्य पर लाभांश %', 'अंकित मूल्यमा लाभांश %'),
              '0.5'
            )}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                {t5(language, 'Dividend Basis', 'लाभांश आधार', 'लाभांश आधार', 'लाभांश आधार', 'लाभांश आधार')}
              </label>
              <select
                value={inp.mode}
                onChange={(e) => updateField('mode', e.target.value)}
                className="w-full min-h-[42px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
              >
                <option value="percent_of_par">{t5(language, '% of Par Value', 'अंकित मूल्य का %', 'अंकित दाम के %', 'अंकित मूल्यक %', 'अंकित मूल्यको %')}</option>
                <option value="per_share">{t5(language, 'Cash Per Share', 'प्रति शेयर नकद', 'हर शेयर नगद', 'प्रति शेयर नगद', 'प्रति कित्ता नगद')}</option>
              </select>
            </div>
            {numInput('parValue', t5(language, 'Par Value (e.g. 100)', 'अंकित मूल्य (जैसे 100)', 'अंकित दाम (जइसे 100)', 'अंकित मूल्य (जेना 100)', 'अंकित मूल्य (जस्तै १००)'), '10')}
            {numInput('tax', t5(language, 'Dividend Tax (%)', 'लाभांश कर (%)', 'लाभांश कर (%)', 'लाभांश कर (%)', 'लाभांश कर (%)'), '0.5', '%')}
          </div>
        );
      case 'stock_average':
        return (
          <div className="grid grid-cols-2 gap-3">
            {numInput('q1', t5(language, 'Lot 1 Quantity', 'लॉट 1 मात्रा', 'लॉट 1 गिनती', 'लॉट 1 मात्रा', 'लट १ कित्ता'), '1')}
            {numInput('p1', t5(language, 'Lot 1 Buy Price', 'लॉट 1 खरीद भाव', 'लॉट 1 खरीद भाव', 'लॉट 1 खरीद मूल्य', 'लट १ खरिद मूल्य'), '1')}
            {numInput('q2', t5(language, 'Lot 2 Quantity', 'लॉट 2 मात्रा', 'लॉट 2 गिनती', 'लॉट 2 मात्रा', 'लट २ कित्ता'), '1')}
            {numInput('p2', t5(language, 'Lot 2 Buy Price', 'लॉट 2 खरीद भाव', 'लॉट 2 खरीद भाव', 'लॉट 2 खरीद मूल्य', 'लट २ खरिद मूल्य'), '1')}
            {numInput('q3', t5(language, 'Lot 3 Qty (Optional)', 'लॉट 3 मात्रा (वैकल्पिक)', 'लॉट 3 गिनती (मन हो त)', 'लॉट 3 मात्रा (वैकल्पिक)', 'लट ३ कित्ता (ऐच्छिक)'), '1')}
            {numInput('p3', t5(language, 'Lot 3 Buy Price', 'लॉट 3 खरीद भाव', 'लॉट 3 खरीद भाव', 'लॉट 3 खरीद मूल्य', 'लट ३ खरिद मूल्य'), '1')}
            {numInput('cmp', t5(language, 'Current Manual Market Price', 'वर्तमान बाजार भाव', 'आज के बाजार भाव', 'वर्तमान बाजार मूल्य', 'हालको बजार मूल्य'), '1')}
          </div>
        );
      case 'share_pnl':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {numInput('qty', t5(language, 'Quantity (Shares)', 'मात्रा (शेयर)', 'गिनती (शेयर)', 'मात्रा (शेयर)', 'कित्ता (सेयर)'), '1')}
            {numInput('buyPrice', t5(language, 'Buy Price / Share', 'खरीद मूल्य / शेयर', 'खरीद भाव / शेयर', 'खरीद मूल्य / शेयर', 'खरिद मूल्य / कित्ता'), '1')}
            {numInput('sellPrice', t5(language, 'Sell Price / Share', 'बिक्री मूल्य / शेयर', 'बेचे के भाव / शेयर', 'बिक्री मूल्य / शेयर', 'बिक्री मूल्य / कित्ता'), '1')}
            {numInput('broker', t5(language, 'Broker Commission (%)', 'ब्रोकर कमीशन (%)', 'ब्रोकर कमीशन (%)', 'ब्रोकर कमीशन (%)', 'ब्रोकर कमिसन (%)'), '0.05', '%')}
            {numInput('dpFee', t5(language, 'SEBON / DP Fee / Side', 'SEBON / DP शुल्क', 'SEBON / DP फीस', 'SEBON / DP शुल्क', 'SEBON / DP शुल्क'), '5')}
            {numInput('cgt', t5(language, 'Capital Gains Tax (%)', 'पूंजीगत लाभ कर (%)', 'पूंजीगत लाभ कर (%)', 'पूंजीगत लाभ कर (%)', 'पुँजीगत लाभ कर (%)'), '0.5', '%')}
          </div>
        );
      case 'gold_investment':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {numInput('units', t5(language, 'Quantity (Tola / Gram)', 'मात्रा (तोला / ग्राम)', 'मात्रा (तोला / ग्राम)', 'मात्रा (तोला / ग्राम)', 'परिमाण (तोला / ग्राम)'), '0.1')}
            {numInput('buyPrice', t5(language, 'Purchase Price / Unit', 'खरीद भाव / इकाई', 'खरीद भाव / इकाई', 'खरीद मूल्य / इकाई', 'खरिद मूल्य / एकाइ'), '100')}
            {numInput('currentPrice', t5(language, 'Current Manual Price / Unit', 'वर्तमान भाव / इकाई', 'आज के भाव / इकाई', 'वर्तमान मूल्य / इकाई', 'हालको मूल्य / एकाइ'), '100')}
            {numInput('making', t5(language, 'Total Making / Wastage Cost', 'कुल गढ़ाई / जर्ती खर्च', 'कुल गढ़ाई / छीजन खर्च', 'कुल गढ़ाई / जर्ती खर्च', 'कुल ज्याला / जर्ती खर्च'), '100')}
            {numInput('years', t5(language, 'Holding Years', 'रखने के वर्ष', 'राखे के बरिस', 'अवधि (वर्ष)', 'राखेको वर्ष'), '0.5', yrsSuffix)}
          </div>
        );
      case 'retirement':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {numInput('curAge', t5(language, 'Current Age', 'वर्तमान आयु', 'अभी के उमर', 'वर्तमान आयु', 'हालको उमेर'), '1')}
            {numInput('retAge', t5(language, 'Retirement Age', 'रिटायरमेंट आयु', 'रिटायरमेंट उमर', 'सेवानिवृत्ति आयु', 'अवकाश उमेर'), '1')}
            {numInput('lifeExp', t5(language, 'Life Expectancy', 'जीवन प्रत्याशा', 'उम्मीद के उमर', 'अनुमानित आयु', 'अपेक्षित आयु'), '1')}
            {numInput('monthlyExp', t5(language, 'Current Monthly Expense', 'वर्तमान मासिक खर्च', 'अभी के महीनावार खर्च', 'वर्तमान मासिक खर्च', 'हालको मासिक खर्च'), '500')}
            {numInput('inflation', t5(language, 'Inflation (% p.a.)', 'महंगाई (% सालाना)', 'महँगाई (% सालाना)', 'महँगी (% वार्षिक)', 'मुद्रास्फीति (% वार्षिक)'), '0.1', '%')}
            {numInput('preRate', t5(language, 'Pre-Retire Return (%)', 'रिटायरमेंट से पहले रिटर्न (%)', 'रिटायरमेंट पहले रिटर्न (%)', 'सेवानिवृत्ति पूर्व रिटर्न (%)', 'अवकाश अघिको प्रतिफल (%)'), '0.1', '%')}
            {numInput('postRate', t5(language, 'Post-Retire Return (%)', 'रिटायरमेंट बाद रिटर्न (%)', 'रिटायरमेंट बाद रिटर्न (%)', 'सेवानिवृत्ति बाद रिटर्न (%)', 'अवकाश पछिको प्रतिफल (%)'), '0.1', '%')}
            {numInput('existing', t5(language, 'Existing Retirement Savings', 'मौजूदा रिटायरमेंट बचत', 'अभी के रिटायरमेंट बचत', 'मौजूदा सेवानिवृत्ति बचत', 'मौजुदा अवकाश बचत'), '1000')}
          </div>
        );
      case 'inflation':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {numInput('presentCost', t5(language, 'Present Cost / Value', 'वर्तमान कीमत / मूल्य', 'अभी के दाम / कीमत', 'वर्तमान लागत / मूल्य', 'हालको लागत / मूल्य'), '500')}
            {numInput('inflation', t5(language, 'Annual Inflation (%)', 'वार्षिक महंगाई (%)', 'सालाना महँगाई (%)', 'वार्षिक महँगी (%)', 'वार्षिक मुद्रास्फीति (%)'), '0.1', '%')}
            {numInput('years', t5(language, 'Years', 'वर्ष', 'बरिस', 'वर्ष', 'वर्ष'), '1', yrsSuffix)}
          </div>
        );
      case 'ppf':
        return (
          <div className="grid grid-cols-2 gap-3">
            {numInput('annual', t5(language, 'Annual Self Contribution', 'वार्षिक स्वयं योगदान', 'सालाना आपन जमा', 'वार्षिक अपन योगदान', 'वार्षिक व्यक्तिगत योगदान'), '1000')}
            {numInput('match', t5(language, 'Employer Match (%)', 'नियोक्ता अंशदान (%)', 'कंपनी योगदान (%)', 'नियोक्ता अंशदान (%)', 'रोजगारदाता थप (%)'), '5', '%')}
            {numInput('rate', t5(language, 'Interest Rate (% p.a.)', 'ब्याज दर (% सालाना)', 'ब्याज दर (% सालाना)', 'ब्याज दर (% वार्षिक)', 'ब्याज दर (% वार्षिक)'), '0.1', '%')}
            {numInput('years', t5(language, 'Duration (Years)', 'अवधि (वर्ष)', 'अवधि (बरिस)', 'अवधि (वर्ष)', 'अवधि (वर्ष)'), '1', yrsSuffix)}
          </div>
        );
      case 'net_worth':
        return (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAutofillNetWorthFromDb}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 hover:bg-blue-100 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>
                  {t5(
                    language,
                    'Auto-fill from Saved Portfolio & Loans',
                    'बचत खाता और ऋण से स्वतः भरें',
                    'बचत खाता आ कर्जा डेटा से अपने आप भरीं',
                    'बचत खाता आ ऋण डेटा सँ स्वतः भरू',
                    'मेरो खाता र ऋण डेटाबाट स्वतः भर्नुहोस्'
                  )}
                </span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {numInput('cashBank', t5(language, 'Cash & Bank Savings', 'नकद और बैंक बचत', 'नगद आ बैंक बचत', 'नगद आ बैंक बचत', 'नगद र बैंक बचत'), '1000')}
              {numInput('fdRd', t5(language, 'FD / RD Deposits', 'FD / RD जमा', 'FD / RD जमा', 'FD / RD जमा', 'FD / RD निक्षेप'), '1000')}
              {numInput('mfSip', t5(language, 'Mutual Funds & SIP', 'म्यूचुअल फंड व SIP', 'म्यूचुअल फंड आ SIP', 'म्यूचुअल फंड आ SIP', 'म्युचुअल फण्ड र SIP'), '1000')}
              {numInput('shares', t5(language, 'Shares / Equities', 'शेयर / इक्विटी', 'शेयर / इक्विटी', 'शेयर / इक्विटी', 'सेयर / इक्विटी'), '1000')}
              {numInput('gold', t5(language, 'Gold & Bullion', 'सोना / बुलियन', 'सोना / चांदी', 'सोन / बुलियन', 'सुन / चाँदी'), '1000')}
              {numInput('propertyOther', t5(language, 'Property / Other Assets', 'संपत्ति / अन्य', 'जमीन-घर / अन्य संपत्ति', 'संपत्ति / अन्य', 'घरजग्गा / अन्य सम्पत्ति'), '1000')}
              {numInput('homeLoan', t5(language, 'Home Loan Balance (-)', 'होम लोन बकाया (-)', 'घर कर्जा बाकी (-)', 'गृह ऋण बाँकी (-)', 'घर कर्जा बाँकी (-)'), '1000')}
              {numInput('personalLoan', t5(language, 'Personal / Vehicle Loan (-)', 'पर्सनल / वाहन ऋण (-)', 'निजी / गाड़ी कर्जा (-)', 'व्यक्तिगत / वाहन ऋण (-)', 'व्यक्तिगत / सवारी ऋण (-)'), '1000')}
              {numInput('cardDebt', t5(language, 'Credit Card Due (-)', 'क्रेडिट कार्ड बकाया (-)', 'क्रेडिट कार्ड बाकी (-)', 'क्रेडिट कार्ड बकाया (-)', 'क्रेडिट कार्ड बाँकी (-)'), '500')}
              {numInput('otherLoans', t5(language, 'Other Liabilities (-)', 'अन्य देनदारी (-)', 'बाकी देनदारी (-)', 'अन्य देनदारी (-)', 'अन्य दायित्व (-)'), '500')}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left Directory of 20 Calculators */}
      <div className={`lg:col-span-4 space-y-3 ${mobileShowDetail ? 'hidden lg:block' : 'block'}`}>
        <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t5(
                language,
                'Search 20 calculators...',
                '20 कैलकुलेटर खोजें...',
                '20 गो कैलकुलेटर खोजीं...',
                '20 टा कैलकुलेटर ताकू...',
                '२० क्याल्कुलेटर खोज्नुहोस्...'
              )}
              className="w-full min-h-[40px] pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {(
              [
                ['all', t5(language, 'All (20)', 'सभी (20)', 'सब (20)', 'सब (20)', 'सबै (२०)')],
                ['sip_mf', t5(language, 'SIP & MF', 'SIP व फंड', 'SIP आ फंड', 'SIP आ फंड', 'SIP र फण्ड')],
                ['deposit_interest', t5(language, 'FD / Interest', 'FD / ब्याज', 'FD / ब्याज', 'FD / ब्याज', 'FD / ब्याज')],
                ['equity_gold', t5(language, 'Shares / Gold', 'शेयर / सोना', 'शेयर / सोना', 'शेयर / सोन', 'सेयर / सुन')],
                ['wealth_retire', t5(language, 'Wealth', 'संपत्ति', 'संपत्ति', 'संपत्ति', 'सम्पत्ति')],
              ] as const
            ).map(([gid, label]) => (
              <button
                key={gid}
                type="button"
                onClick={() => setGroupFilter(gid)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer transition ${
                  groupFilter === gid
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
            {filteredCalcs.map((c, index) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(c.id);
                    setEditingRecordId(null);
                    setCustomTitle('');
                    setNotes('');
                    setMobileShowDetail(true);
                  }}
                  className={`w-full min-h-[50px] px-2.5 py-2.5 text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                    active ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">
                      <span className="text-slate-400 font-mono mr-1.5">{String(index + 1).padStart(2, '0')}</span>
                      {getCalcName(c, language)}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate pl-6">{getCalcDesc(c, language)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Active Calculator Workspace + History */}
      <div className={`lg:col-span-8 space-y-4 ${mobileShowDetail ? 'block' : 'hidden lg:block'}`}>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setMobileShowDetail(false)}
                className="lg:hidden min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-100 text-slate-700 cursor-pointer"
                aria-label={t5(language, 'Back to Calculator List', 'कैलकुलेटर सूची पर वापस जाएं', 'कैलकुलेटर लिस्ट पर वापस जाईं', 'कैलकुलेटर सूची पर वापस जाउ', 'क्याल्कुलेटर सूचीमा फर्कनुहोस्')}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {getCalcName(activeDef, language)}
                </h2>
                <p className="text-xs text-slate-500">{getCalcDesc(activeDef, language)}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportPDF}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>PDF</span>
            </button>
          </div>

          {/* Calculator Inputs */}
          {renderInputs()}

          {/* Result Highlight Panel */}
          <div className="rounded-2xl bg-slate-900 text-white p-4 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
                  {result.primaryLabel}
                </div>
                <div className="text-2xl font-extrabold tabular-nums text-white mt-0.5">
                  {formatMoney(result.primaryValue, currency, language)}
                </div>
              </div>
              {result.secondaryLabel && (
                <div className="text-right">
                  <div className="text-[11px] text-slate-300">{result.secondaryLabel}</div>
                  <div className="text-sm font-bold text-emerald-400 tabular-nums">
                    {typeof result.secondaryValue === 'number'
                      ? formatMoney(result.secondaryValue, currency, language)
                      : result.secondaryValue}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-700/80">
              {result.metrics.map((m) => (
                <div key={m.label}>
                  <div className="text-[10px] text-slate-400">{m.label}</div>
                  <div className="text-xs font-bold text-slate-100 tabular-nums">{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {result.disclaimer && (
            <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
              <span>{result.disclaimer}</span>
            </div>
          )}

          {/* Visual SVG Chart */}
          {result.chartData.length > 0 && (
            <div className="pt-1">
              <GrowthChartSVG
                data={result.chartData}
                investedLabel={
                  selectedId === 'swp'
                    ? t5(language, 'Withdrawn', 'निकासी', 'निकासी', 'निकासी', 'झिकिएको')
                    : selectedId === 'net_worth'
                    ? t5(language, 'Liabilities', 'देनदारी', 'देनदारी', 'दायित्व', 'दायित्व')
                    : t5(language, 'Invested', 'निवेश', 'निवेश', 'निवेश', 'लगानी')
                }
                valueLabel={
                  selectedId === 'net_worth'
                    ? t5(language, 'Assets / Net', 'संपत्ति / शुद्ध', 'संपत्ति / शुद्ध', 'संपत्ति / शुद्ध', 'सम्पत्ति / खुद')
                    : t5(language, 'Projected Value', 'अनुमानित मूल्य', 'अनुमानित रकम', 'अनुमानित मूल्य', 'अनुमानित मूल्य')
                }
              />
            </div>
          )}

          {/* Save / Edit History Controls */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={t5(
                language,
                'Title to save (optional)',
                'हिसाब का नाम (वैकल्पिक)',
                'हिसाब के नाम (चाहीं त)',
                'हिसाबक नाम (वैकल्पिक)',
                'हिसाबको नाम (ऐच्छिक)'
              )}
              className="sm:col-span-5 min-h-[42px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:border-blue-600"
            />
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t5(language, 'Notes (optional)', 'टिप्पणी (वैकल्पिक)', 'टिप्पणी (चाहीं त)', 'टिप्पणी (वैकल्पिक)', 'टिप्पणी (ऐच्छिक)')}
              className="sm:col-span-4 min-h-[42px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:border-blue-600"
            />
            <button
              type="button"
              onClick={handleSave}
              className="sm:col-span-3 min-h-[42px] px-3 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {editingRecordId ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>
                {editingRecordId
                  ? t5(language, 'Update Saved', 'अपडेट करें', 'अपडेट करीं', 'अपडेट करू', 'अपडेट गर्नुहोस्')
                  : t5(language, 'Save History', 'इतिहास सेव करें', 'इतिहास सेव करीं', 'इतिहास सुरक्षित करू', 'हिसाब सुरक्षित गर्नुहोस्')}
              </span>
            </button>
          </div>
        </div>

        {/* Saved Calculator History List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              {t5(
                language,
                'Saved Calculator History',
                'सुरक्षित हिसाब इतिहास',
                'सेव कइल हिसाब इतिहास',
                'सुरक्षित हिसाब इतिहास',
                'सुरक्षित हिसाब इतिहास'
              )}{' '}
              ({savedHistoryForAll.length})
            </h3>
          </div>

          {savedHistoryForAll.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 text-center">
              {t5(
                language,
                'No saved calculations yet. Run any calculator above and tap "Save History".',
                'अभी कोई सुरक्षित हिसाब नहीं है। ऊपर कोई भी कैलकुलेटर चलाकर सेव करें।',
                'अभी कोई हिसाब सेव नइखे। ऊपर कवनो कैलकुलेटर चला के सेव करीं।',
                'एखन धरि कोनो हिसाब सुरक्षित नहि अछि। ऊपर कोनो कैलकुलेटर चलाकय सुरक्षित करू।',
                'अहिलेसम्म कुनै हिसाब सुरक्षित गरिएको छैन। माथि गणना गरेर सुरक्षित गर्नुहोस्।'
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {savedHistoryForAll.map((rec) => (
                <div key={rec.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{rec.title}</div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      {rec.bsDate} {bsTag(language)} ({rec.adDate} {adTag(language)}) • {rec.summary.primaryLabel}:{' '}
                      <span className="font-bold text-slate-800">
                        {formatMoney(rec.summary.primaryValue, currency, language)}
                      </span>
                    </div>
                    {rec.notes && <div className="text-[11px] text-slate-400 truncate">{rec.notes}</div>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditRecord(rec)}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                      aria-label={t5(language, 'Edit saved calculation', 'संपादित करें', 'बदलीं', 'संपादित करू', 'सम्पादन गर्नुहोस्')}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(rec)}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                      aria-label={t5(language, 'Delete saved calculation', 'हटाएं', 'हटाईं', 'हटाउ', 'हटाउनुहोस्')}
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

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        language={language}
        title={t5(
          language,
          'Delete Saved Calculation',
          'सुरक्षित हिसाब हटाएं',
          'सेव कइल हिसाब हटाईं',
          'सुरक्षित हिसाब हटाउ',
          'सुरक्षित हिसाब हटाउनुहोस्'
        )}
        message={t5(
          language,
          `Remove "${deleteTarget?.title || ''}" permanently from your history?`,
          `क्या "${deleteTarget?.title || ''}" को इतिहास से हमेशा के लिए हटा दें?`,
          `का "${deleteTarget?.title || ''}" के इतिहास से हमेशा खातिर हटा दिहल जाव?`,
          `की "${deleteTarget?.title || ''}" केँ इतिहास सँ स्थायी रूपेँ हटा देल जाय?`,
          `के "${deleteTarget?.title || ''}" लाई इतिहासबाट स्थायी रूपमा हटाउने हो?`
        )}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            bankDb.deleteCalculation(deleteTarget.id);
            if (editingRecordId === deleteTarget.id) setEditingRecordId(null);
            showToast(
              t5(
                language,
                'Deleted saved calculation',
                'सुरक्षित हिसाब हटाया गया',
                'सेव कइल हिसाब हटा दिहल गइल',
                'सुरक्षित हिसाब हटाएल गेल',
                'सुरक्षित हिसाब हटाइयो'
              )
            );
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
};

