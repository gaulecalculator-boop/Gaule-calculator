/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Verified Financial Mathematics & Engines for Bank & Investment Module
 * Covers:
 * - All 20 Investment Calculators (with chart series & disclaimers)
 * - Bank Loan Amortization Engine (fixed + variable rates with effective dates, extra payments, never mutating paid history)
 * - Advanced SIP Installment & Projection Engine
 * - Mutual Fund Portfolio Valuation & Exact XIRR Solver (Newton-Raphson + Bisection fallback)
 * - Additional Financial Tools (Credit Card APR Trap, Nepal Tax Slabs, Savings Interest, Prepayment, Balance Transfer, EMI Comparison, Currency, Emergency Fund)
 */

import { Language } from '../types';
import {
  addBSMonths,
  adStrToBsStr,
  bsStrToAdStr,
  diffDaysAD,
  parseADDateUTC,
  t5,
} from './i18n';
import {
  BankLoanRecord,
  LoanAmortizationRow,
  MutualFundRecord,
  SipInstallmentRecord,
  SipPlanRecord,
} from './types';

function curSym(lang: Language): string {
  return lang === 'en' ? 'Rs.' : 'रु';
}

function yrTag(y: number, lang: Language): string {
  return lang === 'en' ? `Y${y}` : `${y}${t5(lang, 'Y', 'व.', 'ब.', 'ब.', 'व.')}`;
}

export function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

export interface ChartPoint {
  label: string;
  invested: number;
  value: number;
}

export interface CalcResult {
  primaryLabel: string;
  primaryValue: number;
  investedAmount: number;
  gainOrInterest: number;
  secondaryLabel?: string;
  secondaryValue?: string | number;
  metrics: Array<{ label: string; value: string }>;
  chartData: ChartPoint[];
  disclaimer?: string;
}

// ===========================================================================
// 1. ALL 20 INVESTMENT CALCULATORS
// ===========================================================================

/** 1. SIP Calculator (monthly annuity due / end-of-month standard MF SIP) */
export function calcSIP(
  monthlyInvestment: number,
  annualRatePercent: number,
  years: number,
  language: Language = 'en'
): CalcResult {
  const P = Math.max(0, monthlyInvestment);
  const n = Math.max(1, Math.round(years * 12));
  const i = Math.max(0, annualRatePercent) / 100 / 12;
  const rs = curSym(language);

  const totalInvested = P * n;
  const futureValue =
    i === 0 ? totalInvested : P * (((Math.pow(1 + i, n) - 1) / i) * (1 + i));

  const chartData: ChartPoint[] = [];
  const totalYears = Math.max(1, Math.ceil(years));
  for (let y = 1; y <= totalYears; y++) {
    const months = Math.min(n, y * 12);
    const invY = P * months;
    const valY = i === 0 ? invY : P * (((Math.pow(1 + i, months) - 1) / i) * (1 + i));
    chartData.push({ label: yrTag(y, language), invested: round2(invY), value: round2(valY) });
  }

  return {
    primaryLabel: t5(
      language,
      'Estimated Maturity Value',
      'अनुमानित परिपक्वता राशि',
      'अनुमानित पूरा होखे पर रकम',
      'अनुमानित परिपक्वता राशि',
      'अनुमानित परिपक्वता रकम'
    ),
    primaryValue: round2(futureValue),
    investedAmount: round2(totalInvested),
    gainOrInterest: round2(futureValue - totalInvested),
    secondaryLabel: t5(language, 'Wealth Multiple', 'संपत्ति गुणक', 'रकम के गुना', 'संपत्ति गुणक', 'सम्पत्ति गुणक'),
    secondaryValue: totalInvested > 0 ? `${round2(futureValue / totalInvested)}x` : '0x',
    metrics: [
      {
        label: t5(language, 'Monthly SIP', 'मासिक SIP', 'महिना के SIP', 'मासिक SIP', 'मासिक SIP'),
        value: `${rs} ${round2(P).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Duration', 'अवधि', 'समय', 'अवधि', 'अवधि'),
        value: `${n} ${t5(language, 'months', 'महीने', 'महीना', 'मास', 'महिना')}`,
      },
      {
        label: t5(language, 'Total Invested', 'कुल निवेश', 'कुल लगावल पूंजी', 'कुल निवेश', 'कुल लगानी'),
        value: `${rs} ${round2(totalInvested).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Estimated Gain', 'अनुमानित लाभ', 'अनुमानित फायदा', 'अनुमानित लाभ', 'अनुमानित नाफा'),
        value: `${rs} ${round2(futureValue - totalInvested).toLocaleString('en-IN')}`,
      },
    ],
    chartData,
    disclaimer: t5(
      language,
      'Expected return rate is an illustrative assumption, not guaranteed.',
      'अनुमानित रिटर्न दर केवल गणना के लिए है, इसकी कोई गारंटी नहीं है।',
      'अनुमानित फायदा दर खाली हिसाब खातिर बा, ई पक्का गारंटी नइखे।',
      'अनुमानित रिटर्न दर केवल गणना लेल अछि, एकर गारंटी नहि अछि।',
      'अनुमानित प्रतिफल दर केवल गणनाको लागि हो, यो सुनिश्चित हुँदैन।'
    ),
  };
}

/** 2. Step-Up SIP Calculator */
export function calcStepUpSIP(
  initialMonthly: number,
  annualStepUpPercent: number,
  annualRatePercent: number,
  years: number,
  language: Language = 'en'
): CalcResult {
  const P0 = Math.max(0, initialMonthly);
  const step = Math.max(0, annualStepUpPercent) / 100;
  const rMonth = Math.max(0, annualRatePercent) / 100 / 12;
  const totalMonths = Math.max(1, Math.round(years * 12));
  const rs = curSym(language);

  let invested = 0;
  let balance = 0;
  const chartData: ChartPoint[] = [];

  for (let m = 1; m <= totalMonths; m++) {
    const yearIdx = Math.floor((m - 1) / 12);
    const currentSip = P0 * Math.pow(1 + step, yearIdx);
    invested += currentSip;
    balance = (balance + currentSip) * (1 + rMonth);

    if (m % 12 === 0 || m === totalMonths) {
      chartData.push({
        label: yrTag(Math.ceil(m / 12), language),
        invested: round2(invested),
        value: round2(balance),
      });
    }
  }

  const finalSip = P0 * Math.pow(1 + step, Math.floor((totalMonths - 1) / 12));

  return {
    primaryLabel: t5(
      language,
      'Estimated Step-Up Corpus',
      'अनुमानित स्टेप-अप फंड',
      'अनुमानित स्टेप-अप कुल रकम',
      'अनुमानित स्टेप-अप कोष',
      'अनुमानित स्टेप-अप कोष'
    ),
    primaryValue: round2(balance),
    investedAmount: round2(invested),
    gainOrInterest: round2(balance - invested),
    secondaryLabel: t5(
      language,
      'Final Year Monthly SIP',
      'अंतिम वर्ष की मासिक SIP',
      'आखिरी साल के महिना SIP',
      'अंतिम वर्षक मासिक SIP',
      'अन्तिम वर्षको मासिक SIP'
    ),
    secondaryValue: round2(finalSip),
    metrics: [
      {
        label: t5(language, 'Starting Monthly SIP', 'शुरुआती मासिक SIP', 'शुरुआती महिना SIP', 'शुरुआती मासिक SIP', 'सुरुवाती मासिक SIP'),
        value: `${rs} ${round2(P0).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Final Year SIP', 'अंतिम वर्ष SIP', 'आखिरी साल SIP', 'अंतिम वर्ष SIP', 'अन्तिम वर्ष SIP'),
        value: `${rs} ${round2(finalSip).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Total Invested', 'कुल निवेश', 'कुल लगावल पूंजी', 'कुल निवेश', 'कुल लगानी'),
        value: `${rs} ${round2(invested).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Estimated Wealth Gain', 'अनुमानित लाभ', 'अनुमानित फायदा', 'अनुमानित लाभ', 'अनुमानित नाफा'),
        value: `${rs} ${round2(balance - invested).toLocaleString('en-IN')}`,
      },
    ],
    chartData,
    disclaimer: t5(
      language,
      'Expected return & annual step-up rates are illustrative assumptions.',
      'अनुमानित रिटर्न और वार्षिक वृद्धि दर केवल उदाहरण के लिए हैं।',
      'अनुमानित फायदा आ सालाना बढ़ोतरी दर खाली उदाहरण खातिर बा।',
      'अनुमानित रिटर्न आ वार्षिक वृद्धि दर केवल उदाहरण लेल अछि।',
      'अनुमानित प्रतिफल र वार्षिक वृद्धि दर केवल उदाहरणका लागि हुन्।'
    ),
  };
}

/** 3. Lumpsum Investment Calculator */
export function calcLumpsum(
  principal: number,
  annualRatePercent: number,
  years: number,
  language: Language = 'en'
): CalcResult {
  const P = Math.max(0, principal);
  const r = Math.max(0, annualRatePercent) / 100;
  const t = Math.max(0, years);
  const maturity = P * Math.pow(1 + r, t);
  const rs = curSym(language);

  const steps = Math.max(1, Math.ceil(t));
  const chartData: ChartPoint[] = [];
  for (let y = 1; y <= steps; y++) {
    const yr = Math.min(t, y);
    chartData.push({
      label: yrTag(y, language),
      invested: round2(P),
      value: round2(P * Math.pow(1 + r, yr)),
    });
  }

  return {
    primaryLabel: t5(language, 'Estimated Future Value', 'अनुमानित भविष्य मूल्य', 'अनुमानित आगे के रकम', 'अनुमानित भविष्य मूल्य', 'अनुमानित भविष्य मूल्य'),
    primaryValue: round2(maturity),
    investedAmount: round2(P),
    gainOrInterest: round2(maturity - P),
    secondaryLabel: t5(language, 'Absolute Return', 'कुल प्रतिशत रिटर्न', 'कुल प्रतिशत फायदा', 'कुल प्रतिशत रिटर्न', 'कुल प्रतिशत प्रतिफल'),
    secondaryValue: P > 0 ? `${round2(((maturity - P) / P) * 100)}%` : '0%',
    metrics: [
      {
        label: t5(language, 'One-Time Principal', 'एकमुश्त मूलधन', 'एकमुश्त पूंजी', 'एकमुश्त मूलधन', 'एकमुष्ट साँवा'),
        value: `${rs} ${round2(P).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Expected CAGR', 'अनुमानित CAGR', 'अनुमानित सालाना दर', 'अनुमानित CAGR', 'अनुमानित CAGR'),
        value: `${annualRatePercent}% ${t5(language, 'p.a.', 'वार्षिक', 'सालाना', 'वार्षिक', 'वार्षिक')}`,
      },
      {
        label: t5(language, 'Estimated Gain', 'अनुमानित लाभ', 'अनुमानित फायदा', 'अनुमानित लाभ', 'अनुमानित नाफा'),
        value: `${rs} ${round2(maturity - P).toLocaleString('en-IN')}`,
      },
    ],
    chartData,
    disclaimer: t5(
      language,
      'Market returns fluctuate; expected CAGR is not guaranteed.',
      'बाज़ार के रिटर्न घटते-बढ़ते रहते हैं; अपेक्षित CAGR की गारंटी नहीं है।',
      'बाजार के भाव घटत-बढ़त रहेला; अनुमानित फायदा के पक्का गारंटी नइखे।',
      'बाजारक रिटर्न घटैत-बढ़ैत रहैत अछि; अपेक्षित CAGR के गारंटी नहि अछि।',
      'बजार प्रतिफल घटबढ हुन सक्छ; अपेक्षित CAGR सुनिश्चित हुँदैन।'
    ),
  };
}

/** 4. Mutual Fund Calculator (Combined Lumpsum + SIP) */
export function calcMutualFund(
  lumpsum: number,
  monthlySip: number,
  annualRatePercent: number,
  years: number,
  expenseRatioPercent: number = 0,
  language: Language = 'en'
): CalcResult {
  const netRate = Math.max(0, annualRatePercent - Math.max(0, expenseRatioPercent));
  const lumpRes = calcLumpsum(lumpsum, netRate, years, language);
  const sipRes = monthlySip > 0 ? calcSIP(monthlySip, netRate, years, language) : null;
  const rs = curSym(language);

  const totalValue = round2(lumpRes.primaryValue + (sipRes?.primaryValue || 0));
  const totalInvested = round2(lumpRes.investedAmount + (sipRes?.investedAmount || 0));

  const chartData: ChartPoint[] = lumpRes.chartData.map((pt, idx) => ({
    label: pt.label,
    invested: round2(pt.invested + (sipRes?.chartData[idx]?.invested || 0)),
    value: round2(pt.value + (sipRes?.chartData[idx]?.value || 0)),
  }));

  const pa = t5(language, 'p.a.', 'वार्षिक', 'सालाना', 'वार्षिक', 'वार्षिक');

  return {
    primaryLabel: t5(language, 'Estimated Net Fund Value', 'अनुमानित शुद्ध फंड मूल्य', 'अनुमानित शुद्ध फंड रकम', 'अनुमानित शुद्ध फण्ड मूल्य', 'अनुमानित खुद फण्ड मूल्य'),
    primaryValue: totalValue,
    investedAmount: totalInvested,
    gainOrInterest: round2(totalValue - totalInvested),
    secondaryLabel: t5(language, 'Net Return Used', 'शुद्ध उपयोग दर', 'लगावल शुद्ध दर', 'शुद्ध उपयोग दर', 'प्रयुक्त खुद दर'),
    secondaryValue: `${round2(netRate)}% ${pa}`,
    metrics: [
      {
        label: t5(language, 'Total Invested', 'कुल निवेश', 'कुल लगावल पूंजी', 'कुल निवेश', 'कुल लगानी'),
        value: `${rs} ${totalInvested.toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Net Rate (after expense)', 'शुद्ध दर (खर्च के बाद)', 'खर्च का बाद शुद्ध दर', 'खर्चक बाद शुद्ध दर', 'खर्चपछिको खुद दर'),
        value: `${round2(netRate)}% ${pa}`,
      },
      {
        label: t5(language, 'Estimated Gain', 'अनुमानित लाभ', 'अनुमानित फायदा', 'अनुमानित लाभ', 'अनुमानित नाफा'),
        value: `${rs} ${round2(totalValue - totalInvested).toLocaleString('en-IN')}`,
      },
    ],
    chartData,
    disclaimer: t5(
      language,
      'Mutual fund investments are subject to market risks. Assumed return is not guaranteed.',
      'म्यूचुअल फंड निवेश बाज़ार जोखिमों के अधीन हैं। अनुमानित रिटर्न की गारंटी नहीं है।',
      'म्यूचुअल फंड बाजार के जोखिम पर निर्भर बा। मानल फायदा के गारंटी नइखे।',
      'म्यूचुअल फण्ड निवेश बाजारक जोखिम के अधीन अछि। मानल रिटर्न के गारंटी नहि अछि।',
      'म्युचुअल फण्ड लगानी बजार जोखिममा आधारित हुन्छ। अनुमानित प्रतिफल सुनिश्चित हुँदैन।'
    ),
  };
}

/** 5. SWP (Systematic Withdrawal Plan) Calculator */
export function calcSWP(
  initialCorpus: number,
  monthlyWithdrawal: number,
  annualReturnPercent: number,
  years: number,
  language: Language = 'en'
): CalcResult {
  let balance = Math.max(0, initialCorpus);
  const W = Math.max(0, monthlyWithdrawal);
  const rMonth = Math.max(0, annualReturnPercent) / 100 / 12;
  const months = Math.max(1, Math.round(years * 12));
  const rs = curSym(language);

  let totalWithdrawn = 0;
  let depletedMonth = 0;
  const chartData: ChartPoint[] = [];

  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + rMonth);
    if (balance >= W) {
      balance -= W;
      totalWithdrawn += W;
    } else {
      totalWithdrawn += balance;
      balance = 0;
      if (depletedMonth === 0) depletedMonth = m;
    }
    if (m % 12 === 0 || m === months) {
      chartData.push({
        label: yrTag(Math.ceil(m / 12), language),
        invested: round2(totalWithdrawn),
        value: round2(balance),
      });
    }
  }

  return {
    primaryLabel: t5(language, 'Remaining Corpus After SWP', 'SWP के बाद शेष राशि', 'SWP का बाद बचल रकम', 'SWP क बाद शेष राशि', 'SWP पछि बाँकी कोष'),
    primaryValue: round2(balance),
    investedAmount: round2(initialCorpus),
    gainOrInterest: round2(balance + totalWithdrawn - initialCorpus),
    secondaryLabel:
      depletedMonth > 0
        ? t5(language, 'Corpus Depleted In', 'फंड समाप्त होने में', 'रकम खतम होखे में', 'कोष समाप्त हेबाक समय', 'कोष सकिने अवधि')
        : t5(language, 'Total Withdrawn', 'कुल निकासी', 'कुल निकालल रकम', 'कुल निकासी', 'कुल झिकिएको रकम'),
    secondaryValue:
      depletedMonth > 0
        ? `${depletedMonth} ${t5(language, 'months', 'महीने', 'महीना', 'मास', 'महिना')}`
        : round2(totalWithdrawn),
    metrics: [
      {
        label: t5(language, 'Initial Investment', 'शुरुआती निवेश', 'शुरुआती जमा', 'शुरुआती निवेश', 'सुरुवाती लगानी'),
        value: `${rs} ${round2(initialCorpus).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Total Withdrawn', 'कुल निकासी', 'कुल निकालल रकम', 'कुल निकासी', 'कुल झिकिएको रकम'),
        value: `${rs} ${round2(totalWithdrawn).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Final Balance', 'अंतिम शेष राशि', 'आखिरी बचल रकम', 'अंतिम शेष राशि', 'अन्तिम बाँकी'),
        value: `${rs} ${round2(balance).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Status', 'स्थिति', 'हालत', 'स्थिति', 'अवस्था'),
        value:
          depletedMonth > 0
            ? t5(
                language,
                `Depleted at month ${depletedMonth}`,
                `महीना ${depletedMonth} में समाप्त`,
                `महीना ${depletedMonth} में खतम`,
                `मास ${depletedMonth} मे समाप्त`,
                `महिना ${depletedMonth} मा सकिन्छ`
              )
            : t5(
                language,
                'Sustainable for full period',
                'पूरी अवधि के लिए पर्याप्त',
                'पूरा समय खातिर टिकाऊ बा',
                'पूरा अवधि लेल पर्याप्त',
                'पूरा अवधिका लागि पर्याप्त'
              ),
      },
    ],
    chartData,
    disclaimer: t5(
      language,
      'Assumes constant monthly return; market volatility can cause earlier depletion.',
      'समान मासिक रिटर्न माना गया है; बाज़ार के उतार-चढ़ाव से राशि जल्दी समाप्त हो सकती है।',
      'हर महीना एक जइसन फायदा मानल गइल बा; बाजार गिरला पर रकम पहिले खतम हो सकेला।',
      'समान मासिक रिटर्न मानल गेल अछि; बाजार उतार-चढ़ाव सँ राशि जल्दी समाप्त भऽ सकैत अछि।',
      'समान मासिक प्रतिफल मानिएको छ; बजार उतारचढावले रकम छिटो सकिन सक्छ।'
    ),
  };
}

/** 6. STP (Systematic Transfer Plan) Calculator */
export function calcSTP(
  initialSourceCorpus: number,
  monthlyTransfer: number,
  sourceAnnualRate: number,
  targetAnnualRate: number,
  years: number,
  language: Language = 'en'
): CalcResult {
  let sourceBal = Math.max(0, initialSourceCorpus);
  let targetBal = 0;
  const T = Math.max(0, monthlyTransfer);
  const rSrc = Math.max(0, sourceAnnualRate) / 100 / 12;
  const rTgt = Math.max(0, targetAnnualRate) / 100 / 12;
  const months = Math.max(1, Math.round(years * 12));
  let totalTransferred = 0;
  const chartData: ChartPoint[] = [];
  const rs = curSym(language);

  for (let m = 1; m <= months; m++) {
    sourceBal *= 1 + rSrc;
    targetBal *= 1 + rTgt;
    const transfer = Math.min(sourceBal, T);
    sourceBal -= transfer;
    targetBal += transfer;
    totalTransferred += transfer;

    if (m % 12 === 0 || m === months) {
      chartData.push({
        label: yrTag(Math.ceil(m / 12), language),
        invested: round2(initialSourceCorpus),
        value: round2(sourceBal + targetBal),
      });
    }
  }

  const combined = round2(sourceBal + targetBal);
  return {
    primaryLabel: t5(language, 'Combined Portfolio Value', 'संयुक्त पोर्टफोलियो मूल्य', 'कुल मिला के पोर्टफोलियो रकम', 'संयुक्त पोर्टफोलियो मूल्य', 'संयुक्त पोर्टफोलियो मूल्य'),
    primaryValue: combined,
    investedAmount: round2(initialSourceCorpus),
    gainOrInterest: round2(combined - initialSourceCorpus),
    secondaryLabel: t5(language, 'Target Fund Balance', 'लक्ष्य फंड शेष', 'लक्ष्य फंड बचल रकम', 'लक्ष्य फण्ड शेष', 'लक्ष्य फण्ड बाँकी'),
    secondaryValue: round2(targetBal),
    metrics: [
      {
        label: t5(language, 'Source Fund Remaining', 'स्रोत फंड शेष', 'स्रोत फंड बचल', 'स्रोत फण्ड शेष', 'स्रोत फण्ड बाँकी'),
        value: `${rs} ${round2(sourceBal).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Target Fund Value', 'लक्ष्य फंड मूल्य', 'लक्ष्य फंड रकम', 'लक्ष्य फण्ड मूल्य', 'लक्ष्य फण्ड मूल्य'),
        value: `${rs} ${round2(targetBal).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Total Transferred', 'कुल ट्रांसफर राशि', 'कुल ट्रांसफर भइल रकम', 'कुल स्थानांतरित राशि', 'कुल ट्रान्सफर रकम'),
        value: `${rs} ${round2(totalTransferred).toLocaleString('en-IN')}`,
      },
    ],
    chartData,
    disclaimer: t5(
      language,
      'Assumes illustrative source & target fund return rates.',
      'स्रोत और लक्ष्य फंड की अनुमानित रिटर्न दरें उदाहरण के लिए हैं।',
      'स्रोत आ लक्ष्य फंड के फायदा दर खाली उदाहरण खातिर बा।',
      'स्रोत आ लक्ष्य फण्डक अनुमानित रिटर्न दर उदाहरण लेल अछि।',
      'स्रोत र लक्ष्य फण्डको प्रतिफल दर उदाहरणका लागि मानिएको छ।'
    ),
  };
}

/** 7. Fixed Deposit (FD) Calculator */
export function calcFD(
  principal: number,
  annualRatePercent: number,
  years: number,
  compoundingPerYear: 1 | 2 | 4 | 12 = 4,
  tdsPercent: number = 0,
  language: Language = 'en'
): CalcResult {
  const P = Math.max(0, principal);
  const r = Math.max(0, annualRatePercent) / 100;
  const t = Math.max(0, years);
  const n = compoundingPerYear;
  const rs = curSym(language);

  const grossMaturity = P * Math.pow(1 + r / n, n * t);
  const grossInterest = grossMaturity - P;
  const tdsAmount = grossInterest * (Math.max(0, tdsPercent) / 100);
  const netMaturity = grossMaturity - tdsAmount;

  const steps = Math.max(1, Math.ceil(t));
  const chartData: ChartPoint[] = [];
  for (let y = 1; y <= steps; y++) {
    const yr = Math.min(t, y);
    chartData.push({
      label: yrTag(y, language),
      invested: round2(P),
      value: round2(P * Math.pow(1 + r / n, n * yr)),
    });
  }

  return {
    primaryLabel:
      tdsPercent > 0
        ? t5(language, 'Net Maturity (After Tax)', 'शुद्ध परिपक्वता (कर के बाद)', 'टैक्स कटला के बाद शुद्ध रकम', 'शुद्ध परिपक्वता (करक बाद)', 'खुद परिपक्वता (करपछि)')
        : t5(language, 'Maturity Amount', 'परिपक्वता राशि', 'पूरा होखे पर रकम', 'परिपक्वता राशि', 'परिपक्वता रकम'),
    primaryValue: round2(netMaturity),
    investedAmount: round2(P),
    gainOrInterest: round2(grossInterest - tdsAmount),
    secondaryLabel: t5(language, 'Gross Interest', 'कुल ब्याज', 'कुल ब्याज', 'कुल ब्याज', 'कुल ब्याज'),
    secondaryValue: round2(grossInterest),
    metrics: [
      {
        label: t5(language, 'Deposit Principal', 'जमा मूलधन', 'जमा पूंजी', 'जमा मूलधन', 'जम्मा साँवा'),
        value: `${rs} ${round2(P).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Gross Interest', 'कुल ब्याज', 'कुल ब्याज', 'कुल ब्याज', 'कुल ब्याज'),
        value: `${rs} ${round2(grossInterest).toLocaleString('en-IN')}`,
      },
      {
        label: `${t5(language, 'Tax / TDS', 'कर / TDS', 'टैक्स / TDS', 'कर / TDS', 'कर / TDS')} (${tdsPercent}%)`,
        value: `${rs} ${round2(tdsAmount).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Net Maturity Value', 'शुद्ध परिपक्वता मूल्य', 'शुद्ध मिले वाला रकम', 'शुद्ध परिपक्वता मूल्य', 'खुद परिपक्वता रकम'),
        value: `${rs} ${round2(netMaturity).toLocaleString('en-IN')}`,
      },
    ],
    chartData,
  };
}

/** 8. Recurring Deposit (RD) Calculator (quarterly compounding standard) */
export function calcRD(
  monthlyDeposit: number,
  annualRatePercent: number,
  months: number,
  language: Language = 'en'
): CalcResult {
  const P = Math.max(0, monthlyDeposit);
  const r = Math.max(0, annualRatePercent) / 100;
  const N = Math.max(1, Math.round(months));
  const rs = curSym(language);

  let maturity = 0;
  for (let k = 0; k < N; k++) {
    const remYears = (N - k) / 12;
    maturity += P * Math.pow(1 + r / 4, 4 * remYears);
  }
  const totalDeposited = P * N;
  const chartData: ChartPoint[] = [];
  const years = Math.max(1, Math.ceil(N / 12));
  for (let y = 1; y <= years; y++) {
    const mLimit = Math.min(N, y * 12);
    let mVal = 0;
    for (let k = 0; k < mLimit; k++) {
      mVal += P * Math.pow(1 + r / 4, 4 * ((mLimit - k) / 12));
    }
    chartData.push({ label: yrTag(y, language), invested: round2(P * mLimit), value: round2(mVal) });
  }

  return {
    primaryLabel: t5(language, 'RD Maturity Value', 'RD परिपक्वता राशि', 'RD पूरा होखे पर रकम', 'RD परिपक्वता राशि', 'RD परिपक्वता रकम'),
    primaryValue: round2(maturity),
    investedAmount: round2(totalDeposited),
    gainOrInterest: round2(maturity - totalDeposited),
    secondaryLabel: t5(language, 'Effective Interest Earned', 'अर्जित प्रभावी ब्याज', 'मिलल कुल ब्याज', 'अर्जित प्रभावी ब्याज', 'प्राप्त प्रभावकारी ब्याज'),
    secondaryValue: round2(maturity - totalDeposited),
    metrics: [
      {
        label: t5(language, 'Monthly Deposit', 'मासिक जमा', 'हर महिना जमा', 'मासिक जमा', 'मासिक जम्मा'),
        value: `${rs} ${round2(P).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Total Deposited', 'कुल जमा राशि', 'कुल जमा भइल', 'कुल जमा राशि', 'कुल जम्मा रकम'),
        value: `${rs} ${round2(totalDeposited).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Interest Earned', 'अर्जित ब्याज', 'मिलल ब्याज', 'अर्जित ब्याज', 'प्राप्त ब्याज'),
        value: `${rs} ${round2(maturity - totalDeposited).toLocaleString('en-IN')}`,
      },
    ],
    chartData,
  };
}

/** 9. Compound Interest Calculator */
export function calcCompoundInterest(
  principal: number,
  annualRatePercent: number,
  years: number,
  compoundingFrequency: 1 | 2 | 4 | 12 | 365 = 12,
  language: Language = 'en'
): CalcResult {
  const P = Math.max(0, principal);
  const r = Math.max(0, annualRatePercent) / 100;
  const t = Math.max(0, years);
  const n = compoundingFrequency;
  const total = P * Math.pow(1 + r / n, n * t);
  const effAnnual = (Math.pow(1 + r / n, n) - 1) * 100;
  const rs = curSym(language);
  const pa = t5(language, 'p.a.', 'वार्षिक', 'सालाना', 'वार्षिक', 'वार्षिक');

  const steps = Math.max(1, Math.ceil(t));
  const chartData: ChartPoint[] = [];
  for (let y = 1; y <= steps; y++) {
    const yr = Math.min(t, y);
    chartData.push({ label: yrTag(y, language), invested: round2(P), value: round2(P * Math.pow(1 + r / n, n * yr)) });
  }

  return {
    primaryLabel: t5(language, 'Total Compound Amount', 'कुल चक्रवृद्धि राशि', 'चक्रवृद्धि जोड़ के कुल रकम', 'कुल चक्रवृद्धि राशि', 'कुल चक्रवृद्धि रकम'),
    primaryValue: round2(total),
    investedAmount: round2(P),
    gainOrInterest: round2(total - P),
    secondaryLabel: t5(language, 'Effective Annual Rate (EAR)', 'प्रभावी वार्षिक दर (EAR)', 'असली सालाना दर (EAR)', 'प्रभावी वार्षिक दर (EAR)', 'प्रभावकारी वार्षिक दर (EAR)'),
    secondaryValue: `${round2(effAnnual)}%`,
    metrics: [
      {
        label: t5(language, 'Principal', 'मूलधन', 'पूंजी / मूलधन', 'मूलधन', 'साँवा'),
        value: `${rs} ${round2(P).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Compound Interest', 'चक्रवृद्धि ब्याज', 'चक्रवृद्धि ब्याज', 'चक्रवृद्धि ब्याज', 'चक्रवृद्धि ब्याज'),
        value: `${rs} ${round2(total - P).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Effective Annual Rate', 'प्रभावी वार्षिक दर', 'असली सालाना दर', 'प्रभावी वार्षिक दर', 'प्रभावकारी वार्षिक दर'),
        value: `${round2(effAnnual)}% ${pa}`,
      },
    ],
    chartData,
  };
}

/** 10. Simple Interest Calculator */
export function calcSimpleInterest(
  principal: number,
  annualRatePercent: number,
  years: number,
  language: Language = 'en'
): CalcResult {
  const P = Math.max(0, principal);
  const r = Math.max(0, annualRatePercent) / 100;
  const t = Math.max(0, years);
  const si = P * r * t;
  const total = P + si;
  const rs = curSym(language);

  const steps = Math.max(1, Math.ceil(t));
  const chartData: ChartPoint[] = [];
  for (let y = 1; y <= steps; y++) {
    const yr = Math.min(t, y);
    chartData.push({ label: yrTag(y, language), invested: round2(P), value: round2(P + P * r * yr) });
  }

  return {
    primaryLabel: t5(language, 'Total Amount (P + I)', 'कुल राशि (मूल + ब्याज)', 'कुल रकम (मूलधन + ब्याज)', 'कुल राशि (मूलधन + ब्याज)', 'कुल रकम (साँवा + ब्याज)'),
    primaryValue: round2(total),
    investedAmount: round2(P),
    gainOrInterest: round2(si),
    secondaryLabel: t5(language, 'Yearly Interest', 'वार्षिक ब्याज', 'सालाना ब्याज', 'वार्षिक ब्याज', 'वार्षिक ब्याज'),
    secondaryValue: round2(P * r),
    metrics: [
      {
        label: t5(language, 'Principal', 'मूलधन', 'मूलधन', 'मूलधन', 'साँवा'),
        value: `${rs} ${round2(P).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Simple Interest', 'साधारण ब्याज', 'सीधा ब्याज', 'साधारण ब्याज', 'साधारण ब्याज'),
        value: `${rs} ${round2(si).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Monthly Avg Interest', 'मासिक औसत ब्याज', 'महिना के औसत ब्याज', 'मासिक औसत ब्याज', 'मासिक औसत ब्याज'),
        value: `${rs} ${round2((P * r) / 12).toLocaleString('en-IN')}`,
      },
    ],
    chartData,
  };
}

/** 11. Daily Interest Calculator */
export function calcDailyInterest(
  principal: number,
  annualRatePercent: number,
  days: number,
  compoundedDaily: boolean = false,
  dayCountBasis: 365 | 360 = 365,
  language: Language = 'en'
): CalcResult {
  const P = Math.max(0, principal);
  const r = Math.max(0, annualRatePercent) / 100;
  const d = Math.max(0, Math.round(days));
  const rs = curSym(language);

  const total = compoundedDaily
    ? P * Math.pow(1 + r / dayCountBasis, d)
    : P + (P * r * d) / dayCountBasis;
  const interest = total - P;
  const dailyRateAmt = (P * r) / dayCountBasis;

  const segments = Math.min(6, Math.max(2, d));
  const chartData: ChartPoint[] = [];
  for (let s = 1; s <= segments; s++) {
    const dStep = Math.round((d * s) / segments);
    const val = compoundedDaily
      ? P * Math.pow(1 + r / dayCountBasis, dStep)
      : P + (P * r * dStep) / dayCountBasis;
    chartData.push({
      label: language === 'en' ? `D${dStep}` : `${dStep}${t5(language, 'd', ' दि.', ' दि.', ' दि.', ' दि.')}`,
      invested: round2(P),
      value: round2(val),
    });
  }

  return {
    primaryLabel: t5(language, 'Total Payable / Receivable', 'कुल देय / प्राप्त राशि', 'कुल देवे / मिले वाला रकम', 'कुल देय / प्राप्त राशि', 'कुल तिर्नुपर्ने / पाउने रकम'),
    primaryValue: round2(total),
    investedAmount: round2(P),
    gainOrInterest: round2(interest),
    secondaryLabel: t5(language, 'Interest Per Day', 'प्रति दिन ब्याज', 'रोज के ब्याज', 'प्रति दिन ब्याज', 'दैनिक ब्याज'),
    secondaryValue: round2(dailyRateAmt),
    metrics: [
      {
        label: t5(language, 'Days Counted', 'गिने गए दिन', 'गिनल गइल दिन', 'गनल गेल दिन', 'गणना गरिएका दिन'),
        value: `${d} ${t5(language, 'days', 'दिन', 'दिन', 'दिन', 'दिन')} (${dayCountBasis} ${t5(language, 'basis', 'आधार', 'आधार', 'आधार', 'आधार')})`,
      },
      {
        label: t5(language, 'Per Day Interest', 'प्रति दिन ब्याज', 'रोज के ब्याज', 'प्रति दिन ब्याज', 'प्रति दिन ब्याज'),
        value: `${rs} ${round2(dailyRateAmt).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Total Interest', 'कुल ब्याज', 'कुल ब्याज', 'कुल ब्याज', 'कुल ब्याज'),
        value: `${rs} ${round2(interest).toLocaleString('en-IN')}`,
      },
    ],
    chartData,
  };
}

/** 12. Annual Interest Calculator */
export function calcAnnualInterest(
  principal: number,
  annualRatePercent: number,
  years: number,
  payoutMode: 'reinvest' | 'payout' = 'reinvest',
  language: Language = 'en'
): CalcResult {
  const res =
    payoutMode === 'reinvest'
      ? calcCompoundInterest(principal, annualRatePercent, years, 1, language)
      : calcSimpleInterest(principal, annualRatePercent, years, language);
  return {
    ...res,
    primaryLabel:
      payoutMode === 'reinvest'
        ? t5(language, 'Annual Compounded Total', 'वार्षिक चक्रवृद्धि कुल', 'सालाना चक्रवृद्धि जोड़ कुल', 'वार्षिक चक्रवृद्धि कुल', 'वार्षिक चक्रवृद्धि कुल')
        : t5(language, 'Annual Payout Cumulative', 'वार्षिक भुगतान कुल', 'सालाना भुगतान कुल रकम', 'वार्षिक भुगतान कुल', 'वार्षिक भुक्तानी कुल'),
  };
}

/** 13. Dividend Calculator */
export function calcDividend(
  sharesOwned: number,
  faceOrSharePrice: number,
  dividendPercentOrPerShare: number,
  mode: 'percent_of_par' | 'per_share' = 'percent_of_par',
  parValue: number = 100,
  taxRatePercent: number = 5,
  language: Language = 'en'
): CalcResult {
  const qty = Math.max(0, sharesOwned);
  const marketCost = qty * Math.max(0, faceOrSharePrice);
  const grossDividend =
    mode === 'percent_of_par'
      ? qty * parValue * (Math.max(0, dividendPercentOrPerShare) / 100)
      : qty * Math.max(0, dividendPercentOrPerShare);
  const tax = grossDividend * (Math.max(0, taxRatePercent) / 100);
  const netDividend = grossDividend - tax;
  const yieldPct = marketCost > 0 ? (netDividend / marketCost) * 100 : 0;
  const rs = curSym(language);

  return {
    primaryLabel: t5(language, 'Net Cash Dividend Received', 'प्राप्त शुद्ध नकद लाभांश', 'मिलल शुद्ध नगद लाभांश', 'प्राप्त शुद्ध नगद लाभांश', 'प्राप्त खुद नगद लाभांश'),
    primaryValue: round2(netDividend),
    investedAmount: round2(marketCost),
    gainOrInterest: round2(netDividend),
    secondaryLabel: t5(language, 'Net Dividend Yield', 'शुद्ध लाभांश उपज', 'शुद्ध लाभांश दर', 'शुद्ध लाभांश दर', 'खुद लाभांश प्रतिफल'),
    secondaryValue: `${round2(yieldPct)}%`,
    metrics: [
      {
        label: t5(language, 'Total Shares', 'कुल शेयर', 'कुल शेयर', 'कुल शेयर', 'कुल शेयर'),
        value: `${qty.toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Gross Dividend', 'कुल लाभांश', 'कुल लाभांश', 'कुल लाभांश', 'कुल लाभांश'),
        value: `${rs} ${round2(grossDividend).toLocaleString('en-IN')}`,
      },
      {
        label: `${t5(language, 'Dividend Tax', 'लाभांश कर', 'लाभांश टैक्स', 'लाभांश कर', 'लाभांश कर')} (${taxRatePercent}%)`,
        value: `${rs} ${round2(tax).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Net Yield on Cost', 'लागत पर शुद्ध उपज', 'लागत पर शुद्ध फायदा', 'लागत पर शुद्ध दर', 'लागतमा खुद प्रतिफल'),
        value: `${round2(yieldPct)}%`,
      },
    ],
    chartData: [
      {
        label: t5(language, 'Gross', 'कुल', 'कुल', 'कुल', 'कुल'),
        invested: round2(tax),
        value: round2(grossDividend),
      },
      {
        label: t5(language, 'Net Payout', 'शुद्ध भुगतान', 'शुद्ध मिलल', 'शुद्ध भुगतान', 'खुद भुक्तानी'),
        invested: 0,
        value: round2(netDividend),
      },
    ],
  };
}

/** 14. Stock Average Price Calculator */
export function calcStockAverage(
  lots: Array<{ qty: number; price: number }>,
  currentMarketPrice?: number,
  language: Language = 'en'
): CalcResult {
  let totalQty = 0;
  let totalCost = 0;
  lots.forEach((l) => {
    const q = Math.max(0, l.qty);
    const p = Math.max(0, l.price);
    totalQty += q;
    totalCost += q * p;
  });

  const avgPrice = totalQty > 0 ? totalCost / totalQty : 0;
  const mktVal = currentMarketPrice && currentMarketPrice > 0 ? totalQty * currentMarketPrice : totalCost;
  const rs = curSym(language);

  const chartData: ChartPoint[] = lots.map((l, idx) => ({
    label: `${t5(language, 'Lot', 'लॉट', 'लॉट', 'लॉट', 'लट')} ${idx + 1}`,
    invested: round2(l.qty * l.price),
    value: round2(l.price),
  }));

  return {
    primaryLabel: t5(language, 'Weighted Average Buy Price', 'भारित औसत खरीद मूल्य', 'औसत खरीद दाम', 'भारित औसत खरीद मूल्य', 'औसत खरिद मूल्य'),
    primaryValue: round2(avgPrice),
    investedAmount: round2(totalCost),
    gainOrInterest: round2(mktVal - totalCost),
    secondaryLabel: t5(language, 'Total Shares Held', 'कुल शेयर संख्या', 'कुल शेयर संख्या', 'कुल शेयर संख्या', 'कुल शेयर संख्या'),
    secondaryValue: totalQty,
    metrics: [
      {
        label: t5(language, 'Total Quantity', 'कुल मात्रा', 'कुल संख्या', 'कुल मात्रा', 'कुल कित्ता'),
        value: `${totalQty.toLocaleString('en-IN')} ${t5(language, 'units', 'यूनिट', 'कित्ता', 'इकाई', 'कित्ता')}`,
      },
      {
        label: t5(language, 'Total Investment', 'कुल निवेश', 'कुल लगावल पूंजी', 'कुल निवेश', 'कुल लगानी'),
        value: `${rs} ${round2(totalCost).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Average Price / Share', 'औसत मूल्य / शेयर', 'औसत दाम / शेयर', 'औसत मूल्य / शेयर', 'औसत मूल्य / शेयर'),
        value: `${rs} ${round2(avgPrice).toLocaleString('en-IN')}`,
      },
      ...(currentMarketPrice && currentMarketPrice > 0
        ? [
            {
              label: t5(language, 'Unrealized P/L', 'अनुमानित लाभ/हानि', 'अनुमानित नफा/घाटा', 'अनुमानित लाभ/हानि', 'अनुमानित नाफा/नोक्सान'),
              value: `${rs} ${round2(mktVal - totalCost).toLocaleString('en-IN')}`,
            },
          ]
        : []),
    ],
    chartData,
  };
}

/** 15. Share Profit & Loss Calculator */
export function calcSharePnL(
  qty: number,
  buyPrice: number,
  sellPrice: number,
  brokerPercent: number = 0.4,
  sebonDpFee: number = 25,
  cgtPercent: number = 7.5,
  language: Language = 'en'
): CalcResult {
  const q = Math.max(0, qty);
  const buyGross = q * Math.max(0, buyPrice);
  const sellGross = q * Math.max(0, sellPrice);
  const buyFee = buyGross * (Math.max(0, brokerPercent) / 100) + Math.max(0, sebonDpFee);
  const sellFee = sellGross * (Math.max(0, brokerPercent) / 100) + Math.max(0, sebonDpFee);
  const rs = curSym(language);

  const totalCost = buyGross + buyFee;
  const netBeforeTax = sellGross - sellFee;
  const rawGain = netBeforeTax - totalCost;
  const cgtTax = rawGain > 0 ? rawGain * (Math.max(0, cgtPercent) / 100) : 0;
  const netProfit = rawGain - cgtTax;
  const roiPct = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

  return {
    primaryLabel:
      netProfit >= 0
        ? t5(language, 'Net Realized Profit', 'शुद्ध वास्तविक लाभ', 'शुद्ध असली फायदा', 'शुद्ध वास्तविक लाभ', 'खुद नाफा')
        : t5(language, 'Net Realized Loss', 'शुद्ध वास्तविक हानि', 'शुद्ध असली घाटा', 'शुद्ध वास्तविक हानि', 'खुद नोक्सान'),
    primaryValue: round2(netProfit),
    investedAmount: round2(totalCost),
    gainOrInterest: round2(netProfit),
    secondaryLabel: t5(language, 'Return on Investment', 'निवेश पर रिटर्न (ROI)', 'लगावल पूंजी पर फायदा', 'निवेश पर रिटर्न', 'लगानीमा प्रतिफल'),
    secondaryValue: `${round2(roiPct)}%`,
    metrics: [
      {
        label: t5(language, 'Total Buy Cost (incl. fees)', 'कुल खरीद लागत (शुल्क सहित)', 'कुल खरीद खर्च (फीस समेत)', 'कुल खरीद लागत (शुल्क सहित)', 'कुल खरिद लागत (शुल्क सहित)'),
        value: `${rs} ${round2(totalCost).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Total Sell Proceeds', 'कुल बिक्री प्राप्ति', 'कुल बिक्री से मिलल', 'कुल बिक्री प्राप्ति', 'कुल बिक्री रकम'),
        value: `${rs} ${round2(netBeforeTax).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Total Brokerage & DP Fees', 'कुल ब्रोकरेज और DP शुल्क', 'कुल ब्रोकर आ DP फीस', 'कुल ब्रोकरेज आ DP शुल्क', 'कुल ब्रोकर र DP शुल्क'),
        value: `${rs} ${round2(buyFee + sellFee).toLocaleString('en-IN')}`,
      },
      {
        label: `${t5(language, 'Capital Gains Tax', 'पूंजीगत लाभ कर', 'पूंजीगत लाभ टैक्स', 'पूंजीगत लाभ कर', 'पुँजीगत लाभ कर')} (${cgtPercent}%)`,
        value: `${rs} ${round2(cgtTax).toLocaleString('en-IN')}`,
      },
    ],
    chartData: [
      {
        label: t5(language, 'Buy Cost', 'खरीद लागत', 'खरीद खर्च', 'खरीद लागत', 'खरिद लागत'),
        invested: round2(totalCost),
        value: round2(totalCost),
      },
      {
        label: t5(language, 'Net Sale', 'शुद्ध बिक्री', 'शुद्ध बिक्री', 'शुद्ध बिक्री', 'खुद बिक्री'),
        invested: round2(totalCost),
        value: round2(netBeforeTax - cgtTax),
      },
    ],
  };
}

/** 16. Gold Investment Calculator (Manual current market rate, no fake live rate) */
export function calcGoldInvestment(
  quantityUnits: number,
  buyPricePerUnit: number,
  currentPricePerUnit: number,
  makingAndWastageAmount: number = 0,
  holdingYears: number = 1,
  language: Language = 'en'
): CalcResult {
  const q = Math.max(0, quantityUnits);
  const totalCost = q * Math.max(0, buyPricePerUnit) + Math.max(0, makingAndWastageAmount);
  const currentValue = q * Math.max(0, currentPricePerUnit);
  const profit = currentValue - totalCost;
  const cagr =
    totalCost > 0 && currentValue > 0 && holdingYears > 0
      ? (Math.pow(currentValue / totalCost, 1 / holdingYears) - 1) * 100
      : 0;
  const rs = curSym(language);

  return {
    primaryLabel: t5(language, 'Current Gold Valuation', 'सोने का वर्तमान मूल्य', 'सोना के अभी के दाम', 'सोनाक वर्तमान मूल्य', 'सुनको हालको मूल्याङ्कन'),
    primaryValue: round2(currentValue),
    investedAmount: round2(totalCost),
    gainOrInterest: round2(profit),
    secondaryLabel: t5(language, 'Annualized CAGR', 'वार्षिक CAGR', 'सालाना वृद्धि दर', 'वार्षिक CAGR', 'वार्षिक CAGR'),
    secondaryValue: `${round2(cagr)}%`,
    metrics: [
      {
        label: t5(language, 'Total Purchase Outlay', 'कुल खरीद खर्च', 'कुल खरीद लागत', 'कुल खरीद खर्च', 'कुल खरिद खर्च'),
        value: `${rs} ${round2(totalCost).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Current Market Value', 'वर्तमान बाजार मूल्य', 'अभी के बाजार भाव', 'वर्तमान बाजार मूल्य', 'हालको बजार मूल्य'),
        value: `${rs} ${round2(currentValue).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Net Appreciation / Gain', 'शुद्ध मूल्य वृद्धि / लाभ', 'शुद्ध बढ़ोतरी / फायदा', 'शुद्ध लाभ / वृद्धि', 'खुद वृद्धि / नाफा'),
        value: `${rs} ${round2(profit).toLocaleString('en-IN')}`,
      },
    ],
    chartData: [
      {
        label: t5(language, 'Purchase', 'खरीद', 'खरीद', 'खरीद', 'खरिद'),
        invested: round2(totalCost),
        value: round2(totalCost),
      },
      {
        label: t5(language, 'Current', 'वर्तमान', 'अभी के', 'वर्तमान', 'हालको'),
        invested: round2(totalCost),
        value: round2(currentValue),
      },
    ],
    disclaimer: t5(
      language,
      'Based on user-entered gold market price (no simulated live rate).',
      'आपके द्वारा दर्ज किए गए सोने के भाव पर आधारित (कोई नकली लाइव दर नहीं)।',
      'रउआं द्वारा डालल सोना के भाव पर आधारित बा (कवनो नकली रेट नइखे)।',
      'अहाँ द्वारा देल गेल सोनाक बाजार भाव पर आधारित (कोनो नकली दर नहि)।',
      'तपाईंले राख्नुभएको सुनको बजार मूल्यमा आधारित (नक्कली लाइभ दर होइन)।'
    ),
  };
}

/** 17. Retirement Planning Calculator */
export function calcRetirement(
  currentAge: number,
  retirementAge: number,
  lifeExpectancy: number,
  currentMonthlyExpense: number,
  inflationPercent: number,
  preRetireReturnPercent: number,
  postRetireReturnPercent: number,
  existingSavings: number = 0,
  language: Language = 'en'
): CalcResult {
  const yrsToRetire = Math.max(1, retirementAge - currentAge);
  const yrsInRetirement = Math.max(1, lifeExpectancy - retirementAge);
  const inf = Math.max(0, inflationPercent) / 100;
  const preR = Math.max(0, preRetireReturnPercent) / 100;
  const postR = Math.max(0, postRetireReturnPercent) / 100;
  const rs = curSym(language);

  const monthlyExpAtRetire = currentMonthlyExpense * Math.pow(1 + inf, yrsToRetire);
  const annualExpAtRetire = monthlyExpAtRetire * 12;

  const realRate = (1 + postR) / (1 + inf) - 1;
  let requiredCorpus = 0;
  if (Math.abs(realRate) < 1e-6) {
    requiredCorpus = annualExpAtRetire * yrsInRetirement;
  } else {
    requiredCorpus =
      annualExpAtRetire * ((1 - Math.pow(1 + realRate, -yrsInRetirement)) / realRate) * (1 + realRate);
  }

  const futureExisting = existingSavings * Math.pow(1 + preR, yrsToRetire);
  const gap = Math.max(0, requiredCorpus - futureExisting);

  const monthsToRetire = yrsToRetire * 12;
  const rMonth = preR / 12;
  const requiredMonthlySip =
    gap === 0
      ? 0
      : rMonth === 0
      ? gap / monthsToRetire
      : gap / (((Math.pow(1 + rMonth, monthsToRetire) - 1) / rMonth) * (1 + rMonth));

  const chartData: ChartPoint[] = [];
  const agePrefix = t5(language, 'Age ', 'उम्र ', 'उमिर ', 'उमिर ', 'उमेर ');
  for (let y = 1; y <= yrsToRetire; y++) {
    const m = y * 12;
    const sipAccum =
      rMonth === 0
        ? requiredMonthlySip * m
        : requiredMonthlySip * (((Math.pow(1 + rMonth, m) - 1) / rMonth) * (1 + rMonth));
    const savAccum = existingSavings * Math.pow(1 + preR, y);
    chartData.push({
      label: `${agePrefix}${currentAge + y}`,
      invested: round2(existingSavings + requiredMonthlySip * m),
      value: round2(sipAccum + savAccum),
    });
  }

  return {
    primaryLabel: t5(language, 'Required Retirement Corpus', 'आवश्यक रिटायरमेंट फंड', 'रिटायरमेंट खातिर जरूरी रकम', 'आवश्यक रिटायरमेंट कोष', 'आवश्यक अवकाश कोष'),
    primaryValue: round2(requiredCorpus),
    investedAmount: round2(existingSavings + requiredMonthlySip * monthsToRetire),
    gainOrInterest: round2(requiredCorpus - (existingSavings + requiredMonthlySip * monthsToRetire)),
    secondaryLabel: t5(language, 'Monthly SIP Needed', 'आवश्यक मासिक SIP', 'जरूरी महिना SIP', 'आवश्यक मासिक SIP', 'आवश्यक मासिक SIP'),
    secondaryValue: round2(requiredMonthlySip),
    metrics: [
      {
        label: t5(language, 'Monthly Expense at Retirement', 'रिटायरमेंट पर मासिक खर्च', 'रिटायर होखे पर महिना के खर्च', 'रिटायरमेन्ट पर मासिक खर्च', 'अवकाशमा मासिक खर्च'),
        value: `${rs} ${round2(monthlyExpAtRetire).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Future Value of Current Savings', 'मौजूदा बचत का भविष्य मूल्य', 'अभी के बचत के आगे के रकम', 'वर्तमान बचतक भविष्य मूल्य', 'हालको बचतको भविष्य मूल्य'),
        value: `${rs} ${round2(futureExisting).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Monthly SIP Needed Today', 'आज से जरूरी मासिक SIP', 'आज से जरूरी महिना के SIP', 'आइ सँ आवश्यक मासिक SIP', 'आजैबाट आवश्यक मासिक SIP'),
        value: `${rs} ${round2(requiredMonthlySip).toLocaleString('en-IN')}`,
      },
    ],
    chartData,
    disclaimer: t5(
      language,
      'Projections depend on inflation and return assumptions.',
      'अनुमान मुद्रास्फीति और रिटर्न मान्यताओं पर निर्भर करते हैं।',
      'आगे के अनुमान महंगाई आ फायदा दर मान के निकालल गइल बा।',
      'अनुमान महंगाई आ रिटर्नक मान्यता पर निर्भर करैत अछि।',
      'प्रक्षेपण मुद्रास्फीति र प्रतिफल अनुमानमा निर्भर गर्दछ।'
    ),
  };
}

/** 18. Inflation Calculator */
export function calcInflation(
  presentCost: number,
  annualInflationPercent: number,
  years: number,
  language: Language = 'en'
): CalcResult {
  const P = Math.max(0, presentCost);
  const inf = Math.max(0, annualInflationPercent) / 100;
  const t = Math.max(0, years);
  const futureCost = P * Math.pow(1 + inf, t);
  const purchasingPowerOfP = inf > 0 ? P / Math.pow(1 + inf, t) : P;
  const rs = curSym(language);

  const steps = Math.max(1, Math.ceil(t));
  const chartData: ChartPoint[] = [];
  for (let y = 1; y <= steps; y++) {
    const yr = Math.min(t, y);
    chartData.push({
      label: yrTag(y, language),
      invested: round2(P),
      value: round2(P * Math.pow(1 + inf, yr)),
    });
  }

  return {
    primaryLabel: t5(language, 'Future Inflation-Adjusted Cost', 'मुद्रास्फीति के बाद भविष्य की लागत', 'महंगाई का बाद आगे के खर्च', 'महंगाईक बाद भविष्यक लागत', 'मुद्रास्फीतिपछिको भविष्यको लागत'),
    primaryValue: round2(futureCost),
    investedAmount: round2(P),
    gainOrInterest: round2(futureCost - P),
    secondaryLabel: t5(language, 'Future Purchasing Power', 'भविष्य की क्रय शक्ति', 'आगे के खरीद क्षमता', 'भविष्यक क्रय शक्ति', 'भविष्यको क्रयशक्ति'),
    secondaryValue: round2(purchasingPowerOfP),
    metrics: [
      {
        label: t5(language, 'Current Cost', 'वर्तमान लागत', 'अभी के खर्च', 'वर्तमान लागत', 'हालको लागत'),
        value: `${rs} ${round2(P).toLocaleString('en-IN')}`,
      },
      {
        label: t5(
          language,
          `Cost After ${t} Years`,
          `${t} वर्षों बाद लागत`,
          `${t} साल बाद खर्च`,
          `${t} वर्षक बाद लागत`,
          `${t} वर्षपछि लागत`
        ),
        value: `${rs} ${round2(futureCost).toLocaleString('en-IN')}`,
      },
      {
        label: t5(
          language,
          `Value of Today's ${rs} ${round2(P).toLocaleString('en-IN')}`,
          `आज के ${rs} ${round2(P).toLocaleString('en-IN')} का मूल्य`,
          `आज के ${rs} ${round2(P).toLocaleString('en-IN')} के असल कीमत`,
          `आइक ${rs} ${round2(P).toLocaleString('en-IN')} क मूल्य`,
          `आजको ${rs} ${round2(P).toLocaleString('en-IN')} को मूल्य`
        ),
        value: `${rs} ${round2(purchasingPowerOfP).toLocaleString('en-IN')}`,
      },
    ],
    chartData,
  };
}

/** 19. PPF / Provident Fund (EPF / CIT) Calculator */
export function calcPPF(
  annualContribution: number,
  annualRatePercent: number,
  years: number,
  employerMatchPercent: number = 0,
  language: Language = 'en'
): CalcResult {
  const totalAnnual = Math.max(0, annualContribution) * (1 + Math.max(0, employerMatchPercent) / 100);
  const r = Math.max(0, annualRatePercent) / 100;
  const yrs = Math.max(1, Math.round(years));
  const rs = curSym(language);

  let balance = 0;
  let totalContributed = 0;
  const chartData: ChartPoint[] = [];

  for (let y = 1; y <= yrs; y++) {
    totalContributed += totalAnnual;
    balance = (balance + totalAnnual) * (1 + r);
    chartData.push({
      label: yrTag(y, language),
      invested: round2(totalContributed),
      value: round2(balance),
    });
  }

  return {
    primaryLabel: t5(language, 'PF / PPF Maturity Balance', 'PF / PPF परिपक्वता राशि', 'PF / PPF पूरा होखे पर रकम', 'PF / PPF परिपक्वता राशि', 'PF / PPF परिपक्वता रकम'),
    primaryValue: round2(balance),
    investedAmount: round2(totalContributed),
    gainOrInterest: round2(balance - totalContributed),
    secondaryLabel: t5(language, 'Total Interest Earned', 'अर्जित कुल ब्याज', 'मिलल कुल ब्याज', 'अर्जित कुल ब्याज', 'प्राप्त कुल ब्याज'),
    secondaryValue: round2(balance - totalContributed),
    metrics: [
      {
        label: t5(language, 'Annual Contribution (incl. match)', 'वार्षिक योगदान (मैच सहित)', 'सालाना जमा (मैच समेत)', 'वार्षिक योगदान (मैच सहित)', 'वार्षिक योगदान (थप सहित)'),
        value: `${rs} ${round2(totalAnnual).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Total Principal Contributed', 'कुल मूलधन जमा', 'कुल मूलधन जमा', 'कुल मूलधन जमा', 'कुल साँवा जम्मा'),
        value: `${rs} ${round2(totalContributed).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Total Compounded Interest', 'कुल चक्रवृद्धि ब्याज', 'कुल चक्रवृद्धि ब्याज', 'कुल चक्रवृद्धि ब्याज', 'कुल चक्रवृद्धि ब्याज'),
        value: `${rs} ${round2(balance - totalContributed).toLocaleString('en-IN')}`,
      },
    ],
    chartData,
  };
}

/** 20. Net Worth Calculator */
export function calcNetWorth(
  assets: { cashBank: number; fdRd: number; mfSip: number; shares: number; gold: number; propertyOther: number },
  liabilities: { homeLoan: number; personalVehicleLoan: number; creditCardDebt: number; otherLoans: number },
  language: Language = 'en'
): CalcResult {
  const totalAssets =
    Math.max(0, assets.cashBank) +
    Math.max(0, assets.fdRd) +
    Math.max(0, assets.mfSip) +
    Math.max(0, assets.shares) +
    Math.max(0, assets.gold) +
    Math.max(0, assets.propertyOther);

  const totalLiabilities =
    Math.max(0, liabilities.homeLoan) +
    Math.max(0, liabilities.personalVehicleLoan) +
    Math.max(0, liabilities.creditCardDebt) +
    Math.max(0, liabilities.otherLoans);

  const netWorth = totalAssets - totalLiabilities;
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const rs = curSym(language);

  return {
    primaryLabel: t5(language, 'Total Net Worth', 'कुल शुद्ध संपत्ति', 'कुल शुद्ध संपत्ति', 'कुल शुद्ध संपत्ति', 'कुल खुद सम्पत्ति'),
    primaryValue: round2(netWorth),
    investedAmount: round2(totalAssets),
    gainOrInterest: round2(-totalLiabilities),
    secondaryLabel: t5(language, 'Debt-to-Asset Ratio', 'ऋण-से-संपत्ति अनुपात', 'कर्जा-संपत्ति अनुपात', 'कर्जा-संपत्ति अनुपात', 'ऋण-र-सम्पत्ति अनुपात'),
    secondaryValue: `${round2(debtRatio)}%`,
    metrics: [
      {
        label: t5(language, 'Total Assets', 'कुल संपत्ति', 'कुल संपत्ति', 'कुल संपत्ति', 'कुल सम्पत्ति'),
        value: `${rs} ${round2(totalAssets).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Total Liabilities', 'कुल देनदारियां (कर्ज)', 'कुल कर्जा / देनदारी', 'कुल देनदारी (कर्जा)', 'कुल दायित्व (ऋण)'),
        value: `${rs} ${round2(totalLiabilities).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Net Worth', 'शुद्ध संपत्ति', 'शुद्ध संपत्ति', 'शुद्ध संपत्ति', 'खुद सम्पत्ति'),
        value: `${rs} ${round2(netWorth).toLocaleString('en-IN')}`,
      },
      {
        label: t5(language, 'Debt-to-Asset Ratio', 'ऋण-संपत्ति अनुपात', 'कर्जा-संपत्ति अनुपात', 'कर्जा-संपत्ति अनुपात', 'ऋण-सम्पत्ति अनुपात'),
        value: `${round2(debtRatio)}%`,
      },
    ],
    chartData: [
      {
        label: t5(language, 'Assets', 'संपत्ति', 'संपत्ति', 'संपत्ति', 'सम्पत्ति'),
        invested: round2(totalLiabilities),
        value: round2(totalAssets),
      },
      {
        label: t5(language, 'Net Worth', 'शुद्ध संपत्ति', 'शुद्ध संपत्ति', 'शुद्ध संपत्ति', 'खुद सम्पत्ति'),
        invested: 0,
        value: round2(Math.max(0, netWorth)),
      },
    ],
  };
}

// ===========================================================================
// 2. BANK LOAN MANAGEMENT ENGINE
// ===========================================================================

export function calculatePeriodicEMI(
  principal: number,
  annualRatePercent: number,
  totalPeriods: number,
  periodsPerYear: number = 12
): number {
  const P = Math.max(0, principal);
  const n = Math.max(1, Math.round(totalPeriods));
  const r = Math.max(0, annualRatePercent) / 100 / periodsPerYear;
  if (P === 0) return 0;
  if (r === 0) return round2(P / n);
  const factor = Math.pow(1 + r, n);
  return round2((P * r * factor) / (factor - 1));
}

export function getPeriodsPerYear(freq: BankLoanRecord['paymentFrequency']): number {
  if (freq === 'quarterly') return 4;
  if (freq === 'yearly') return 1;
  return 12;
}

export function getMonthsPerPeriod(freq: BankLoanRecord['paymentFrequency']): number {
  if (freq === 'quarterly') return 3;
  if (freq === 'yearly') return 12;
  return 1;
}

/**
 * Generates the exact amortization schedule for a BankLoanRecord:
 * - Preserves already-paid historical installments cleanly using exact logged `payments`.
 * - For remaining unpaid periods, applies any variable rate changes from their `effectiveDateAD`
 *   onward on the REMAINING principal, recalculating remaining EMI cleanly unless custom EMI override is set.
 * - Never mutates paid history!
 */
export function buildLoanAmortizationSchedule(
  loan: BankLoanRecord,
  referenceTodayAD: string
): {
  rows: LoanAmortizationRow[];
  monthlyEquivalentEmi: number;
  currentActiveRate: number;
  totalInterestProjected: number;
  totalInterestPaid: number;
  totalRepaymentProjected: number;
  remainingPrincipal: number;
  remainingInterest: number;
  paidEmiCount: number;
  pendingEmiCount: number;
  totalEmiPaidAmount: number;
  closingDateBS: string;
  closingDateAD: string;
} {
  const periodsPerYear = getPeriodsPerYear(loan.paymentFrequency);
  const monthsPerPeriod = getMonthsPerPeriod(loan.paymentFrequency);
  const totalScheduledPeriods = Math.max(1, Math.ceil(loan.durationMonths / monthsPerPeriod));

  // Map confirmed user payments by installment number
  const paidByInstallment = new Map(
    loan.payments
      .filter((p) => p.confirmedByUser && p.installmentNo > 0)
      .map((p) => [p.installmentNo, p])
  );
  // Standalone extra prepayments (installmentNo === 0)
  const standaloneExtras = loan.payments.filter((p) => p.confirmedByUser && p.installmentNo === 0);

  const sortedRateChanges = [...(loan.rateChanges || [])].sort((a, b) =>
    a.effectiveDateAD.localeCompare(b.effectiveDateAD)
  );

  const rows: LoanAmortizationRow[] = [];
  let principal = Math.max(0, loan.principalAmount);
  let totalInterestPaid = 0;
  let totalInterestProjected = 0;
  let totalEmiPaidAmount = 0;
  let paidEmiCount = 0;
  let activeRate = loan.interestRate;

  let currentEmi =
    loan.customEmiAmount && loan.customEmiAmount > 0
      ? loan.customEmiAmount
      : calculatePeriodicEMI(principal, activeRate, totalScheduledPeriods, periodsPerYear);

  let lastScheduledRow: LoanAmortizationRow | null = null;
  let maxPeriodsGuard = Math.max(totalScheduledPeriods * 2, 600);

  for (let idx = 1; idx <= maxPeriodsGuard && principal > 0.01; idx++) {
    const due = addBSMonths(loan.startDateBS, idx * monthsPerPeriod, loan.emiPaymentDay);
    const dueAD = due.adStr;
    const dueBS = due.bsStr;

    const paidEntry = paidByInstallment.get(idx);

    if (paidEntry) {
      // STRICT HISTORICAL PRESERVATION: use exact stored payment amounts
      const opening = round2(principal);
      const interestComp = round2(paidEntry.interestComponent);
      const principalComp = round2(Math.min(opening, paidEntry.principalComponent));
      const extraComp = round2(Math.min(Math.max(0, opening - principalComp), paidEntry.extraPrincipalPaid));
      const closing = round2(Math.max(0, opening - principalComp - extraComp));

      totalInterestPaid += interestComp;
      totalInterestProjected += interestComp;
      totalEmiPaidAmount += paidEntry.totalPaid;
      paidEmiCount++;

      // Check if rate change became effective up to this date so next period uses it
      for (const rc of sortedRateChanges) {
        if (rc.effectiveDateAD <= dueAD) activeRate = rc.newRate;
      }

      const row: LoanAmortizationRow = {
        installmentNo: idx,
        dueDateAD: dueAD,
        dueDateBS: dueBS,
        openingPrincipal: opening,
        rateApplied: paidEntry.rateApplied || activeRate,
        emiAmount: round2(paidEntry.scheduledEmi),
        principalComponent: principalComp,
        interestComponent: interestComp,
        extraPrincipal: extraComp,
        closingPrincipal: closing,
        status: 'paid',
        paymentId: paidEntry.id,
        paidDateAD: paidEntry.paidDateAD,
        paidDateBS: paidEntry.paidDateBS,
      };
      rows.push(row);
      lastScheduledRow = row;
      principal = closing;

      // Apply standalone extra payments falling between this due date and next
      for (const ex of standaloneExtras) {
        if (ex.paidDateAD <= dueAD && !(ex as any)._applied) {
          principal = round2(Math.max(0, principal - ex.extraPrincipalPaid));
          totalEmiPaidAmount += ex.totalPaid;
          (ex as any)._applied = true;
        }
      }

      // If variable rate changed, recalculate remaining EMI on remaining balance
      const remainingPeriods = Math.max(1, totalScheduledPeriods - idx);
      if (loan.interestType === 'variable' && !(loan.customEmiAmount && loan.customEmiAmount > 0)) {
        currentEmi = calculatePeriodicEMI(principal, activeRate, remainingPeriods, periodsPerYear);
      }
      continue;
    }

    // Apply standalone extras before unpaid periods
    for (const ex of standaloneExtras) {
      if (!(ex as any)._applied) {
        principal = round2(Math.max(0, principal - ex.extraPrincipalPaid));
        totalEmiPaidAmount += ex.totalPaid;
        (ex as any)._applied = true;
      }
    }

    if (principal <= 0.01) break;

    // Check rate changes effective on or before this due date
    let rateChangedNow = false;
    for (const rc of sortedRateChanges) {
      if (rc.effectiveDateAD <= dueAD && rc.newRate !== activeRate) {
        activeRate = rc.newRate;
        rateChangedNow = true;
      }
    }
    if (rateChangedNow && !(loan.customEmiAmount && loan.customEmiAmount > 0)) {
      const remainingPeriods = Math.max(1, totalScheduledPeriods - idx + 1);
      currentEmi = calculatePeriodicEMI(principal, activeRate, remainingPeriods, periodsPerYear);
    }

    const opening = round2(principal);
    const periodRate = Math.max(0, activeRate) / 100 / periodsPerYear;
    const interestComp = round2(opening * periodRate);
    // Ensure amortization progresses if custom EMI is lower than interest by capping or handling gracefully
    const baseEmi = Math.min(round2(opening + interestComp), currentEmi);
    const principalComp = round2(Math.max(0, Math.min(opening, baseEmi - interestComp)));
    const extraComp = round2(Math.min(Math.max(0, opening - principalComp), Math.max(0, loan.plannedExtraPayment || 0)));
    const closing = round2(Math.max(0, opening - principalComp - extraComp));

    totalInterestProjected += interestComp;

    const status: LoanAmortizationRow['status'] = dueAD < referenceTodayAD ? 'overdue' : 'pending';

    const row: LoanAmortizationRow = {
      installmentNo: idx,
      dueDateAD: dueAD,
      dueDateBS: dueBS,
      openingPrincipal: opening,
      rateApplied: activeRate,
      emiAmount: round2(baseEmi),
      principalComponent: principalComp,
      interestComponent: interestComp,
      extraPrincipal: extraComp,
      closingPrincipal: closing,
      status,
    };
    rows.push(row);
    lastScheduledRow = row;
    principal = closing;
  }

  const pendingRows = rows.filter((r) => r.status !== 'paid');
  const remainingInterest = round2(pendingRows.reduce((s, r) => s + r.interestComponent, 0));
  const remainingPrincipal = round2(principal > 0.01 ? principal : rows.reduce((_, r) => r.closingPrincipal, 0));
  // Actual remaining principal is closing principal of last paid row (or initial if none paid), NOT end of schedule!
  const lastPaid = [...rows].reverse().find((r) => r.status === 'paid');
  const actualRemainingPrincipal = round2(
    loan.status === 'closed'
      ? 0
      : lastPaid
      ? Math.max(
          0,
          lastPaid.closingPrincipal -
            standaloneExtras
              .filter((ex) => !(ex as any)._countedInLastPaid)
              .reduce((s, e) => s + e.extraPrincipalPaid, 0)
        )
      : Math.max(
          0,
          loan.principalAmount -
            standaloneExtras.reduce((s, e) => s + e.extraPrincipalPaid, 0)
        )
  );

  const closingRow = lastScheduledRow;
  const fallbackClose = addBSMonths(loan.startDateBS, totalScheduledPeriods * monthsPerPeriod, loan.emiPaymentDay);

  const nextPendingRow = rows.find((r) => r.status !== 'paid');
  const monthlyEquivalentEmi =
    loan.paymentFrequency === 'monthly'
      ? round2(nextPendingRow ? nextPendingRow.emiAmount : currentEmi)
      : round2((nextPendingRow ? nextPendingRow.emiAmount : currentEmi) / monthsPerPeriod);

  // Latest active rate across all rateChanges
  let latestRate = loan.interestRate;
  for (const rc of sortedRateChanges) {
    if (rc.effectiveDateAD <= referenceTodayAD) latestRate = rc.newRate;
  }

  return {
    rows,
    monthlyEquivalentEmi,
    currentActiveRate: latestRate,
    totalInterestProjected: round2(totalInterestProjected),
    totalInterestPaid: round2(totalInterestPaid),
    totalRepaymentProjected: round2(loan.principalAmount + totalInterestProjected),
    remainingPrincipal: actualRemainingPrincipal,
    remainingInterest,
    paidEmiCount,
    pendingEmiCount: pendingRows.length,
    totalEmiPaidAmount: round2(totalEmiPaidAmount),
    closingDateBS: closingRow ? closingRow.dueDateBS : fallbackClose.bsStr,
    closingDateAD: closingRow ? closingRow.dueDateAD : fallbackClose.adStr,
  };
}

// ===========================================================================
// 3. ADVANCED SIP ENGINE
// ===========================================================================

export function generateSipSchedule(
  startDateBS: string,
  sipDay: number,
  monthlyInvestment: number,
  durationMonths: number,
  stepUpPercent: number,
  existingInstallments: SipInstallmentRecord[],
  referenceTodayAD: string,
  planStatus: SipPlanRecord['status']
): SipInstallmentRecord[] {
  const existingMap = new Map(existingInstallments.map((inst) => [inst.installmentNo, inst]));
  const result: SipInstallmentRecord[] = [];
  const totalMonths = Math.max(1, Math.round(durationMonths));

  for (let m = 1; m <= totalMonths; m++) {
    const existing = existingMap.get(m);
    const yearIdx = Math.floor((m - 1) / 12);
    const stepAmount = round2(monthlyInvestment * Math.pow(1 + Math.max(0, stepUpPercent) / 100, yearIdx));
    const due = addBSMonths(startDateBS, m - 1, sipDay);

    if (existing && existing.confirmedByUser) {
      result.push(existing);
      continue;
    }

    // If paused or stopped, keep future unconfirmed installments as pending without forcing missed unless past due while active
    const status: SipInstallmentRecord['status'] =
      existing?.status === 'paid'
        ? 'paid'
        : planStatus === 'active' && due.adStr < referenceTodayAD
        ? 'missed'
        : 'pending';

    result.push({
      id: existing?.id || `sip_inst_${m}_${due.bsStr}`,
      installmentNo: m,
      dueDateBS: due.bsStr,
      dueDateAD: due.adStr,
      amount: existing?.amount ?? stepAmount,
      status,
      paidDateAD: existing?.paidDateAD,
      paidDateBS: existing?.paidDateBS,
      unitsAllotted: existing?.unitsAllotted,
      navAtPurchase: existing?.navAtPurchase,
      note: existing?.note,
      confirmedByUser: false,
    });
  }
  return result;
}

export function evaluateSipSummary(sip: SipPlanRecord, referenceTodayAD: string): {
  actualInvestedAmount: number;
  projectedValueAtMaturity: number;
  estimatedCurrentValue: number;
  displayCurrentValue: number;
  profitLoss: number;
  paidCount: number;
  pendingCount: number;
  missedCount: number;
  maturityDateBS: string;
  maturityDateAD: string;
  chartData: ChartPoint[];
} {
  const paidInstallments = sip.installments.filter((i) => i.status === 'paid' && i.confirmedByUser);
  const actualInvested = round2(paidInstallments.reduce((s, i) => s + i.amount, 0));

  // Estimated compound value of actual paid installments to referenceTodayAD using expectedReturnRate
  const rAnnual = Math.max(0, sip.expectedReturnRate) / 100;
  let estVal = 0;
  for (const inst of paidInstallments) {
    const dStr = inst.paidDateAD || inst.dueDateAD;
    const days = Math.max(0, diffDaysAD(dStr, referenceTodayAD));
    estVal += inst.amount * Math.pow(1 + rAnnual, days / 365);
  }
  estVal = round2(estVal);

  const displayCurrentValue =
    sip.manualCurrentValue !== undefined && sip.manualCurrentValue >= 0
      ? round2(sip.manualCurrentValue)
      : estVal;

  const stepProj = calcStepUpSIP(
    sip.monthlyInvestment,
    sip.stepUpPercent || 0,
    sip.expectedReturnRate,
    sip.durationMonths / 12
  );

  const maturity = addBSMonths(sip.startDateBS, sip.durationMonths - 1, sip.sipDay);
  const missedCount = sip.installments.filter((i) => i.status === 'missed').length;
  const pendingCount = sip.installments.filter((i) => i.status === 'pending').length;

  return {
    actualInvestedAmount: actualInvested,
    projectedValueAtMaturity: stepProj.primaryValue,
    estimatedCurrentValue: estVal,
    displayCurrentValue,
    profitLoss: round2(displayCurrentValue - actualInvested),
    paidCount: paidInstallments.length,
    pendingCount,
    missedCount,
    maturityDateBS: maturity.bsStr,
    maturityDateAD: maturity.adStr,
    chartData: stepProj.chartData,
  };
}

// ===========================================================================
// 4. MUTUAL FUND PORTFOLIO & EXACT XIRR SOLVER
// ===========================================================================

export interface CashFlowPoint {
  dateAD: string;
  amount: number; // Negative = investment/outflow, Positive = dividend/redemption/terminal value
}

/**
 * Computes exact annualized XIRR using Newton-Raphson with Bisection fallback.
 * Returns null when cash flows are insufficient (< 2 flows, or missing both positive & negative signs).
 */
export function calculateXIRR(flows: CashFlowPoint[]): number | null {
  if (!flows || flows.length < 2) return null;
  const hasPos = flows.some((f) => f.amount > 0);
  const hasNeg = flows.some((f) => f.amount < 0);
  if (!hasPos || !hasNeg) return null;

  const sorted = [...flows].sort((a, b) => a.dateAD.localeCompare(b.dateAD));
  const t0 = parseADDateUTC(sorted[0].dateAD).getTime();
  const points = sorted.map((f) => ({
    years: (parseADDateUTC(f.dateAD).getTime() - t0) / (1000 * 60 * 60 * 24 * 365),
    amount: f.amount,
  }));

  // If all flows happen on same day, cannot compute annualized time rate
  if (points.every((p) => p.years === 0)) return null;

  const npv = (rate: number): number =>
    points.reduce((sum, p) => sum + p.amount / Math.pow(1 + rate, p.years), 0);

  const dNpv = (rate: number): number =>
    points.reduce((sum, p) => {
      if (p.years === 0) return sum;
      return sum - (p.years * p.amount) / Math.pow(1 + rate, p.years + 1);
    }, 0);

  // Newton-Raphson first
  let rate = 0.12;
  for (let i = 0; i < 60; i++) {
    if (rate <= -0.9999) break;
    const f = npv(rate);
    const df = dNpv(rate);
    if (Math.abs(f) < 1e-6) return round2(rate * 100);
    if (Math.abs(df) < 1e-10) break;
    const next = rate - f / df;
    if (!Number.isFinite(next) || next <= -0.9999 || next > 100) break;
    if (Math.abs(next - rate) < 1e-7) return round2(next * 100);
    rate = next;
  }

  // Bisection fallback on [-0.95, 20.0]
  let low = -0.95;
  let high = 20.0;
  let fLow = npv(low);
  let fHigh = npv(high);
  if (fLow * fHigh > 0) return null;

  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-6 || (high - low) / 2 < 1e-7) {
      return round2(mid * 100);
    }
    if (fLow * fMid <= 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }
  return round2(((low + high) / 2) * 100);
}

export function evaluateMutualFund(fund: MutualFundRecord, referenceTodayAD: string): {
  totalPurchasedUnits: number;
  totalRedeemedUnits: number;
  remainingUnits: number;
  totalInvestedOutflow: number;
  remainingCostBasis: number;
  totalRedeemedInflow: number;
  totalDividendInflow: number;
  currentMarketValue: number;
  totalProfitLoss: number;
  absoluteReturnPercent: number;
  xirrPercent: number | null;
} {
  const initialUnits = Math.max(0, fund.unitsPurchased);
  const initialCost = initialUnits * Math.max(0, fund.purchaseNav);
  const additionsCost = (fund.additions || []).reduce((s, a) => s + a.amount, 0);
  const additionsUnits = (fund.additions || []).reduce((s, a) => s + a.units, 0);

  const totalPurchasedUnits = round2(initialUnits + additionsUnits);
  const totalRedeemedUnits = round2((fund.redemptions || []).reduce((s, r) => s + r.unitsRedeemed, 0));
  const remainingUnits = round2(Math.max(0, totalPurchasedUnits - totalRedeemedUnits));

  const totalInvestedOutflow = round2(initialCost + additionsCost);
  const avgPurchaseCost = totalPurchasedUnits > 0 ? totalInvestedOutflow / totalPurchasedUnits : 0;
  const remainingCostBasis = round2(remainingUnits * avgPurchaseCost);

  const totalRedeemedInflow = round2((fund.redemptions || []).reduce((s, r) => s + r.amountReceived, 0));
  const totalDividendInflow = round2((fund.dividends || []).reduce((s, d) => s + d.amount, 0));
  const currentMarketValue = round2(remainingUnits * Math.max(0, fund.currentNav));

  const totalReturnValue = currentMarketValue + totalRedeemedInflow + totalDividendInflow;
  const totalProfitLoss = round2(totalReturnValue - totalInvestedOutflow);
  const absoluteReturnPercent =
    totalInvestedOutflow > 0 ? round2((totalProfitLoss / totalInvestedOutflow) * 100) : 0;

  // Build XIRR cash flows
  const flows: CashFlowPoint[] = [];
  if (initialCost > 0) {
    flows.push({ dateAD: fund.investmentDateAD, amount: -initialCost });
  }
  (fund.additions || []).forEach((a) => {
    if (a.amount > 0) flows.push({ dateAD: a.dateAD, amount: -a.amount });
  });
  (fund.redemptions || []).forEach((r) => {
    if (r.amountReceived > 0) flows.push({ dateAD: r.dateAD, amount: r.amountReceived });
  });
  (fund.dividends || []).forEach((d) => {
    if (d.amount > 0) flows.push({ dateAD: d.dateAD, amount: d.amount });
  });
  if (currentMarketValue > 0) {
    flows.push({ dateAD: referenceTodayAD, amount: currentMarketValue });
  }

  const earliestDate = flows.reduce((min, f) => (f.dateAD < min ? f.dateAD : min), referenceTodayAD);
  const hasMultipleDistinctDates = flows.some((f) => f.dateAD !== earliestDate);
  const xirrPercent = hasMultipleDistinctDates ? calculateXIRR(flows) : null;

  return {
    totalPurchasedUnits,
    totalRedeemedUnits,
    remainingUnits,
    totalInvestedOutflow,
    remainingCostBasis,
    totalRedeemedInflow,
    totalDividendInflow,
    currentMarketValue,
    totalProfitLoss,
    absoluteReturnPercent,
    xirrPercent,
  };
}

// ===========================================================================
// 5. ADDITIONAL FINANCIAL TOOLS FORMULAS
// ===========================================================================

/** Credit Card Revolving Interest & Payoff Calculator */
export function calcCreditCardPayoff(
  balance: number,
  annualAprPercent: number,
  monthlyPayment: number
): {
  monthsToPayoff: number | null;
  totalInterestPaid: number;
  totalRepayment: number;
  isMinimumTrap: boolean;
} {
  let bal = Math.max(0, balance);
  const rMonth = Math.max(0, annualAprPercent) / 100 / 12;
  const pay = Math.max(0, monthlyPayment);

  if (bal === 0) return { monthsToPayoff: 0, totalInterestPaid: 0, totalRepayment: 0, isMinimumTrap: false };
  if (pay <= bal * rMonth && rMonth > 0) {
    return { monthsToPayoff: null, totalInterestPaid: Infinity, totalRepayment: Infinity, isMinimumTrap: true };
  }

  let months = 0;
  let totalInt = 0;
  let totalPaid = 0;
  while (bal > 0.01 && months < 600) {
    months++;
    const interest = bal * rMonth;
    totalInt += interest;
    const due = bal + interest;
    const actualPay = Math.min(due, pay);
    totalPaid += actualPay;
    bal = due - actualPay;
  }

  return {
    monthsToPayoff: months >= 600 ? null : months,
    totalInterestPaid: round2(totalInt),
    totalRepayment: round2(totalPaid),
    isMinimumTrap: months >= 600,
  };
}

/** Nepal Income Tax Calculator (FY 2081/82 / 2082/83 Slabs) */
export function calcNepalIncomeTax(
  annualGrossIncome: number,
  status: 'single' | 'couple',
  ssfOrPfDeduction: number = 0,
  citDeduction: number = 0,
  lifeInsuranceDeduction: number = 0,
  isFemaleTaxCredit: boolean = false,
  language: Language = 'en'
): {
  taxableIncome: number;
  totalDeductions: number;
  slabs: Array<{ range: string; rate: string; amount: number; tax: number }>;
  grossTax: number;
  rebate: number;
  netAnnualTax: number;
  monthlyTds: number;
  effectiveRatePercent: number;
} {
  // Nepal statutory deductions cap: PF/SSF/CIT <= min(300,000 or 1/3rd gross, or 500,000 if SSF); life ins <= 40,000
  const maxRetirementCap = 500000;
  const retirementDed = Math.min(maxRetirementCap, Math.max(0, ssfOrPfDeduction) + Math.max(0, citDeduction));
  const insDed = Math.min(40000, Math.max(0, lifeInsuranceDeduction));
  const totalDeductions = round2(retirementDed + insDed);
  const taxable = round2(Math.max(0, annualGrossIncome - totalDeductions));

  const firstSlabLimit = status === 'single' ? 500000 : 600000;
  const lakhNum = (firstSlabLimit / 100000).toFixed(0);
  const bracketDefs: Array<{ cap: number; rate: number; label: string }> = [
    {
      cap: firstSlabLimit,
      rate: 0.01,
      label: t5(
        language,
        `First Rs. ${lakhNum}L (SST 1%)`,
        `प्रथम रु ${lakhNum} लाख (SST 1%)`,
        `पहिला रु ${lakhNum} लाख (SST 1%)`,
        `पहिल रु ${lakhNum} लाख (SST 1%)`,
        `पहिलो रु ${lakhNum} लाख (SST 1%)`
      ),
    },
    {
      cap: 200000,
      rate: 0.10,
      label: t5(
        language,
        'Next Rs. 2L (10%)',
        'अगला रु 2 लाख (10%)',
        'अगिला रु 2 लाख (10%)',
        'अगिला रु 2 लाख (10%)',
        'अर्को रु 2 लाख (10%)'
      ),
    },
    {
      cap: 300000,
      rate: 0.20,
      label: t5(
        language,
        'Next Rs. 3L (20%)',
        'अगला रु 3 लाख (20%)',
        'अगिला रु 3 लाख (20%)',
        'अगिला रु 3 लाख (20%)',
        'अर्को रु 3 लाख (20%)'
      ),
    },
    {
      cap: 1000000,
      rate: 0.30,
      label: t5(
        language,
        'Next Rs. 10L (30%)',
        'अगला रु 10 लाख (30%)',
        'अगिला रु 10 लाख (30%)',
        'अगिला रु 10 लाख (30%)',
        'अर्को रु 10 लाख (30%)'
      ),
    },
    {
      cap: 3000000,
      rate: 0.36,
      label: t5(
        language,
        'Rs. 20L–50L (36%)',
        'रु 20–50 लाख (36%)',
        'रु 20–50 लाख (36%)',
        'रु 20–50 लाख (36%)',
        'रु 20–50 लाख (36%)'
      ),
    },
    {
      cap: Infinity,
      rate: 0.39,
      label: t5(
        language,
        'Above Rs. 50L (39%)',
        'रु 50 लाख से ऊपर (39%)',
        'रु 50 लाख से ऊपर (39%)',
        'रु 50 लाख सँ ऊपर (39%)',
        'रु 50 लाखभन्दा माथि (39%)'
      ),
    },
  ];

  let remaining = taxable;
  const slabs: Array<{ range: string; rate: string; amount: number; tax: number }> = [];
  let grossTax = 0;

  for (const b of bracketDefs) {
    if (remaining <= 0) break;
    const portion = Math.min(remaining, b.cap);
    const t = round2(portion * b.rate);
    slabs.push({
      range: b.label,
      rate: `${Math.round(b.rate * 100)}%`,
      amount: round2(portion),
      tax: t,
    });
    grossTax += t;
    remaining -= portion;
  }

  grossTax = round2(grossTax);
  // 10% tax rebate for female salaried employees without other income
  const rebate = isFemaleTaxCredit ? round2(grossTax * 0.1) : 0;
  const netAnnualTax = round2(Math.max(0, grossTax - rebate));
  const effectiveRatePercent = annualGrossIncome > 0 ? round2((netAnnualTax / annualGrossIncome) * 100) : 0;

  return {
    taxableIncome: taxable,
    totalDeductions,
    slabs,
    grossTax,
    rebate,
    netAnnualTax,
    monthlyTds: round2(netAnnualTax / 12),
    effectiveRatePercent,
  };
}

/** Bank Savings Account Interest Calculator */
export function calcBankSavingsInterest(
  averageBalance: number,
  annualRatePercent: number,
  days: number = 90,
  tdsPercent: number = 6
): { grossInterest: number; tdsAmount: number; netInterest: number; closingBalance: number } {
  const grossInterest = round2((Math.max(0, averageBalance) * Math.max(0, annualRatePercent) / 100 * Math.max(0, days)) / 365);
  const tdsAmount = round2(grossInterest * (Math.max(0, tdsPercent) / 100));
  const netInterest = round2(grossInterest - tdsAmount);
  return {
    grossInterest,
    tdsAmount,
    netInterest,
    closingBalance: round2(Math.max(0, averageBalance) + netInterest),
  };
}

/** Loan Prepayment Impact Calculator */
export function calcLoanPrepayment(
  remainingPrincipal: number,
  annualRatePercent: number,
  remainingMonths: number,
  lumpSumPrepayment: number,
  extraMonthlyEmi: number
): {
  regularEmi: number;
  regularTotalInterest: number;
  newMonths: number;
  monthsSaved: number;
  newTotalInterest: number;
  interestSaved: number;
} {
  const P = Math.max(0, remainingPrincipal);
  const n = Math.max(1, Math.round(remainingMonths));
  const rMonth = Math.max(0, annualRatePercent) / 100 / 12;
  const regularEmi = calculatePeriodicEMI(P, annualRatePercent, n, 12);
  const regularTotalInterest = round2(regularEmi * n - P);

  let bal = Math.max(0, P - Math.max(0, lumpSumPrepayment));
  let newMonths = 0;
  let newInterest = 0;
  const payment = regularEmi + Math.max(0, extraMonthlyEmi);

  while (bal > 0.01 && newMonths < n * 2 + 120) {
    newMonths++;
    const interest = bal * rMonth;
    newInterest += interest;
    const paid = Math.min(bal + interest, payment);
    bal = bal + interest - paid;
  }

  return {
    regularEmi,
    regularTotalInterest: Math.max(0, regularTotalInterest),
    newMonths,
    monthsSaved: Math.max(0, n - newMonths),
    newTotalInterest: round2(newInterest),
    interestSaved: round2(Math.max(0, regularTotalInterest - newInterest)),
  };
}

/** Loan Balance Transfer Calculator */
export function calcLoanBalanceTransfer(
  remainingPrincipal: number,
  currentRatePercent: number,
  newRatePercent: number,
  remainingMonths: number,
  transferAndProcessingFee: number
): {
  currentEmi: number;
  newEmi: number;
  monthlyEmiSavings: number;
  grossInterestSaved: number;
  netSavingsAfterFee: number;
  isWorthTransferring: boolean;
} {
  const curEmi = calculatePeriodicEMI(remainingPrincipal, currentRatePercent, remainingMonths, 12);
  const newEmi = calculatePeriodicEMI(remainingPrincipal, newRatePercent, remainingMonths, 12);
  const curTotalInt = curEmi * remainingMonths - remainingPrincipal;
  const newTotalInt = newEmi * remainingMonths - remainingPrincipal;
  const grossInterestSaved = round2(curTotalInt - newTotalInt);
  const netSavingsAfterFee = round2(grossInterestSaved - Math.max(0, transferAndProcessingFee));
  return {
    currentEmi: curEmi,
    newEmi,
    monthlyEmiSavings: round2(curEmi - newEmi),
    grossInterestSaved,
    netSavingsAfterFee,
    isWorthTransferring: netSavingsAfterFee > 0,
  };
}

/** Advance BS date by frequency for recurring bills & insurance */
export function advanceDateByFrequency(
  bsStr: string,
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly'
): { bsStr: string; adStr: string } {
  if (frequency === 'weekly') {
    const ad = parseADDateUTC(bsStrToAdStr(bsStr));
    ad.setUTCDate(ad.getUTCDate() + 7);
    const adIso = ad.toISOString().slice(0, 10);
    const nextBs = adStrToBsStr(adIso);
    return { bsStr: nextBs, adStr: adIso };
  }
  const monthStep =
    frequency === 'monthly'
      ? 1
      : frequency === 'quarterly'
      ? 3
      : frequency === 'half_yearly'
      ? 6
      : 12;
  return addBSMonths(bsStr, monthStep);
}

/** Emergency Fund Planner */
export function calcEmergencyFund(
  monthlyEssentials: number,
  targetMonths: number,
  currentLiquidSavings: number,
  monthlySavingCapacity: number
): {
  targetCorpus: number;
  fundingGap: number;
  monthsCoveredCurrently: number;
  monthsToReachGoal: number | null;
} {
  const ess = Math.max(0, monthlyEssentials);
  const targetCorpus = round2(ess * Math.max(1, targetMonths));
  const cur = Math.max(0, currentLiquidSavings);
  const gap = round2(Math.max(0, targetCorpus - cur));
  const monthsCoveredCurrently = ess > 0 ? round2(cur / ess) : 0;
  const monthsToReachGoal =
    gap === 0 ? 0 : monthlySavingCapacity > 0 ? Math.ceil(gap / monthlySavingCapacity) : null;

  return {
    targetCorpus,
    fundingGap: gap,
    monthsCoveredCurrently,
    monthsToReachGoal,
  };
}

export const OFFLINE_REFERENCE_FX_RATES_PER_USD: Record<string, { name: string; ratePerUsd: number }> = {
  USD: { name: 'US Dollar ($)', ratePerUsd: 1 },
  NPR: { name: 'Nepalese Rupee (रु)', ratePerUsd: 134.5 },
  INR: { name: 'Indian Rupee (₹)', ratePerUsd: 84.06 },
  EUR: { name: 'Euro (€)', ratePerUsd: 0.92 },
  GBP: { name: 'British Pound (£)', ratePerUsd: 0.78 },
  AED: { name: 'UAE Dirham', ratePerUsd: 3.6725 },
  QAR: { name: 'Qatari Riyal', ratePerUsd: 3.64 },
  SAR: { name: 'Saudi Riyal', ratePerUsd: 3.75 },
  MYR: { name: 'Malaysian Ringgit', ratePerUsd: 4.38 },
  AUD: { name: 'Australian Dollar', ratePerUsd: 1.52 },
  JPY: { name: 'Japanese Yen', ratePerUsd: 153.5 },
  KRW: { name: 'South Korean Won', ratePerUsd: 1380 },
};
