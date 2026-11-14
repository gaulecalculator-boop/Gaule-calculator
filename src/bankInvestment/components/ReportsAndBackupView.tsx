/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Financial Reports (10 Report Views), Smart Insights,
 * Smart Reminder Preferences, & AES-256-GCM Encrypted Backup & Restore
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  FileDown,
  Printer,
  Share2,
  BellRing,
  ShieldCheck,
  Download,
  Upload,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Currency, Language } from '../../types';
import {
  buildLoanAmortizationSchedule,
  evaluateMutualFund,
  evaluateSipSummary,
  generateSipSchedule,
  round2,
} from '../calculations';
import {
  bankDb,
  exportEncryptedBankBackup,
  restoreEncryptedBankBackup,
} from '../db';
import { downloadTextFile } from '../../utils/androidBridge';
import { adTag, bsTag, formatMoney, getTodayDual, parseBSDateStr, pick5, t5 } from '../i18n';
import {
  collectUpcomingAlerts,
  computePortfolioSummary,
  dispatchBankReminders,
  generateSmartFinancialInsights,
} from '../insightsAndReminders';
import {
  buildReportShareText,
  exportFinancialReportPDF,
  safePrintCurrentView,
  shareTextReport,
} from '../pdfExport';
import { BankInvestmentDatabase, FinancialReportType } from '../types';

interface ReportsAndBackupViewProps {
  db: BankInvestmentDatabase;
  language: Language;
  currency: Currency;
  showToast: (msg: string) => void;
}

interface ReportTypeMeta {
  id: FinancialReportType;
  en: string;
  hi: string;
  bho: string;
  mai: string;
  ne: string;
}

const REPORT_TYPES: ReportTypeMeta[] = [
  { id: 'daily', en: 'Daily Report', hi: 'दैनिक रिपोर्ट', bho: 'रोज़ के रिपोर्ट', mai: 'दैनिक रिपोर्ट', ne: 'दैनिक रिपोर्ट' },
  { id: 'monthly', en: 'Monthly Report', hi: 'मासिक रिपोर्ट', bho: 'महीनावार रिपोर्ट', mai: 'मासिक रिपोर्ट', ne: 'मासिक रिपोर्ट' },
  { id: 'yearly', en: 'Yearly Report', hi: 'वार्षिक रिपोर्ट', bho: 'सालाना रिपोर्ट', mai: 'वार्षिक रिपोर्ट', ne: 'वार्षिक रिपोर्ट' },
  { id: 'investment', en: 'Investment Report', hi: 'निवेश रिपोर्ट', bho: 'निवेश रिपोर्ट', mai: 'निवेश रिपोर्ट', ne: 'लगानी रिपोर्ट' },
  { id: 'loan', en: 'Loan Report', hi: 'ऋण रिपोर्ट', bho: 'कर्जा रिपोर्ट', mai: 'ऋण रिपोर्ट', ne: 'ऋण रिपोर्ट' },
  { id: 'sip', en: 'SIP Report', hi: 'SIP रिपोर्ट', bho: 'SIP रिपोर्ट', mai: 'SIP रिपोर्ट', ne: 'SIP रिपोर्ट' },
  { id: 'mutual_fund', en: 'Mutual Fund Report', hi: 'म्यूचुअल फंड रिपोर्ट', bho: 'म्यूचुअल फंड रिपोर्ट', mai: 'म्यूचुअल फंड रिपोर्ट', ne: 'म्युचुअल फण्ड रिपोर्ट' },
  { id: 'interest', en: 'Interest Report', hi: 'ब्याज रिपोर्ट', bho: 'ब्याज रिपोर्ट', mai: 'ब्याज रिपोर्ट', ne: 'ब्याज रिपोर्ट' },
  { id: 'income_expense', en: 'Income & Expense', hi: 'आय व खर्च रिपोर्ट', bho: 'कमाई आ खर्च रिपोर्ट', mai: 'आय आ खर्च रिपोर्ट', ne: 'आय र खर्च रिपोर्ट' },
  { id: 'assets_liabilities', en: 'Assets & Liabilities', hi: 'संपत्ति व देनदारी', bho: 'संपत्ति आ देनदारी', mai: 'संपत्ति आ दायित्व', ne: 'सम्पत्ति र दायित्व' },
];

export const ReportsAndBackupView: React.FC<ReportsAndBackupViewProps> = ({
  db,
  language,
  currency,
  showToast,
}) => {
  const today = getTodayDual();
  const [reportType, setReportType] = useState<FinancialReportType>('investment');
  const [customLeadDays, setCustomLeadDays] = useState<number>(db.reminderPrefs.customLeadDays || 0);
  const [passphraseExport, setPassphraseExport] = useState('');
  const [passphraseRestore, setPassphraseRestore] = useState('');
  const [restoreJsonText, setRestoreJsonText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const summary = useMemo(() => computePortfolioSummary(db, today.adStr), [db, today.adStr]);
  const insights = useMemo(() => generateSmartFinancialInsights(db, today.adStr, language), [db, today.adStr, language]);
  const alerts = useMemo(() => collectUpcomingAlerts(db, today.adStr, undefined, language), [db, today.adStr, language]);

  const getReportLabel = (r: ReportTypeMeta) =>
    pick5(language, { en: r.en, hi: r.hi, bho: r.bho, mai: r.mai, ne: r.ne });

  const reportData = useMemo(() => {
    const todayBS = parseBSDateStr(today.bsStr);
    const monthPrefix = `${todayBS.year}-${String(todayBS.month).padStart(2, '0')}`;
    const yearPrefix = `${todayBS.year}-`;

    const bs = bsTag(language);
    const incWord = t5(language, 'INCOME', 'आय', 'कमाई', 'आय', 'आय');
    const expWord = t5(language, 'EXPENSE', 'खर्च', 'खर्च', 'खर्च', 'खर्च');
    const methodLabel = (m: string) => {
      if (m === 'cash') return t5(language, 'Cash', 'नकद', 'नगद', 'नगद', 'नगद');
      if (m === 'bank') return t5(language, 'Bank', 'बैंक', 'बैंक', 'बैंक', 'बैंक');
      if (m === 'card') return t5(language, 'Card', 'कार्ड', 'कार्ड', 'कार्ड', 'कार्ड');
      return m;
    };
    const bankTxLabel = (tp: string) => {
      if (tp === 'deposit') return t5(language, 'BANK DEPOSIT', 'बैंक जमा', 'बैंक जमा', 'बैंक जमा', 'बैंक जम्मा');
      if (tp === 'withdrawal') return t5(language, 'BANK WITHDRAWAL', 'बैंक निकासी', 'बैंक निकासी', 'बैंक निकासी', 'बैंक निकासी');
      return t5(language, 'BANK INTEREST', 'बैंक ब्याज', 'बैंक ब्याज', 'बैंक ब्याज', 'बैंक ब्याज');
    };

    let columns: string[] = [];
    let rows: Array<Array<string | number>> = [];
    let subtitle = `${today.bsStr} ${bs} (${today.adStr} ${adTag(language)})`;

    switch (reportType) {
      case 'daily': {
        subtitle = `${t5(language, 'Daily Activity', 'दैनिक गतिविधि', 'रोज़ के गतिविधि', 'दैनिक गतिविधि', 'दैनिक गतिविधि')}: ${today.bsStr} ${bs}`;
        columns = [
          t5(language, 'Type', 'प्रकार', 'प्रकार', 'प्रकार', 'प्रकार'),
          t5(language, 'Title / Category', 'शीर्षक / श्रेणी', 'शीर्षक / श्रेणी', 'शीर्षक / श्रेणी', 'शीर्षक / श्रेणी'),
          t5(language, 'Method / Source', 'माध्यम / स्रोत', 'तरीका / स्रोत', 'माध्यम / स्रोत', 'माध्यम / स्रोत'),
          t5(language, 'Amount', 'राशि', 'रकम', 'राशि', 'रकम'),
        ];
        db.incomeExpenses
          .filter((x) => x.dateBS === today.bsStr)
          .forEach((x) =>
            rows.push([
              x.entryType === 'income' ? incWord : expWord,
              x.category,
              methodLabel(x.paymentMethod),
              round2(x.amount),
            ])
          );
        db.bankTransactions
          .filter((t) => t.dateBS === today.bsStr)
          .forEach((t) => rows.push([bankTxLabel(t.type), t.note || t.accountId, t.dateBS, round2(t.amount)]));
        break;
      }
      case 'monthly': {
        subtitle = `${t5(language, 'Monthly Activity', 'मासिक गतिविधि', 'महीनावार गतिविधि', 'मासिक गतिविधि', 'मासिक गतिविधि')} (${monthPrefix} ${bs})`;
        columns = [
          `${t5(language, 'Date', 'तारीख', 'तारीख', 'तिथि', 'मिति')} ${bs}`,
          t5(language, 'Type', 'प्रकार', 'प्रकार', 'प्रकार', 'प्रकार'),
          t5(language, 'Category / Item', 'श्रेणी / मद', 'श्रेणी / सामान', 'श्रेणी / मद', 'श्रेणी / विवरण'),
          t5(language, 'Amount', 'राशि', 'रकम', 'राशि', 'रकम'),
        ];
        db.incomeExpenses
          .filter((x) => x.dateBS.startsWith(monthPrefix))
          .forEach((x) => rows.push([x.dateBS, x.entryType === 'income' ? incWord : expWord, x.category, round2(x.amount)]));
        break;
      }
      case 'yearly': {
        subtitle = `${t5(language, 'Yearly Overview', 'वार्षिक विवरण', 'सालाना विवरण', 'वार्षिक विवरण', 'वार्षिक विवरण')} (${todayBS.year} ${bs})`;
        columns = [
          `${t5(language, 'Date', 'तारीख', 'तारीख', 'तिथि', 'मिति')} ${bs}`,
          t5(language, 'Type', 'प्रकार', 'प्रकार', 'प्रकार', 'प्रकार'),
          t5(language, 'Item', 'विवरण', 'विवरण', 'विवरण', 'विवरण'),
          t5(language, 'Amount', 'राशि', 'रकम', 'राशि', 'रकम'),
        ];
        db.incomeExpenses
          .filter((x) => x.dateBS.startsWith(yearPrefix))
          .forEach((x) => rows.push([x.dateBS, x.entryType === 'income' ? incWord : expWord, x.category, round2(x.amount)]));
        break;
      }
      case 'investment': {
        subtitle = t5(language, 'All Active SIP & Mutual Fund Holdings', 'सभी सक्रिय SIP व म्यूचुअल फंड निवेश', 'सब चालू SIP आ म्यूचुअल फंड निवेश', 'सब सक्रिय SIP आ म्यूचुअल फंड निवेश', 'सबै सक्रिय SIP र म्युचुअल फण्ड लगानी');
        columns = [
          t5(language, 'Instrument', 'प्रकार', 'प्रकार', 'प्रकार', 'प्रकार'),
          t5(language, 'Name', 'नाम', 'नाम', 'नाम', 'नाम'),
          t5(language, 'Invested', 'निवेश', 'निवेश', 'निवेश', 'लगानी'),
          t5(language, 'Current Value', 'वर्तमान मूल्य', 'अभी के मूल्य', 'वर्तमान मूल्य', 'हालको मूल्य'),
          t5(language, 'P / L', 'लाभ / हानि', 'फायदा / घाटा', 'लाभ / हानि', 'नाफा / नोक्सान'),
        ];
        db.sips.forEach((s) => {
          const sched = generateSipSchedule(s.startDateBS, s.sipDay, s.monthlyInvestment, s.durationMonths, s.stepUpPercent, s.installments, today.adStr, s.status);
          const ev = evaluateSipSummary({ ...s, installments: sched }, today.adStr);
          rows.push(['SIP', s.sipName, ev.actualInvestedAmount, ev.displayCurrentValue, ev.profitLoss]);
        });
        db.mutualFunds.forEach((m) => {
          const ev = evaluateMutualFund(m, today.adStr);
          rows.push([
            t5(language, 'MF', 'म्यू. फंड', 'फंड', 'म्यू. फंड', 'फण्ड'),
            m.fundName,
            ev.remainingCostBasis,
            ev.currentMarketValue,
            ev.totalProfitLoss,
          ]);
        });
        break;
      }
      case 'loan': {
        subtitle = t5(language, 'All Bank Loans & EMI Positions', 'सभी बैंक ऋण व EMI स्थिति', 'सब बैंक कर्जा आ किस्त स्थिति', 'सब बैंक ऋण आ EMI स्थिति', 'सबै बैंक ऋण र EMI स्थिति');
        columns = [
          t5(language, 'Loan / Bank', 'ऋण / बैंक', 'कर्जा / बैंक', 'ऋण / बैंक', 'ऋण / बैंक'),
          t5(language, 'Rate', 'दर', 'दर', 'दर', 'दर'),
          t5(language, 'Monthly EMI', 'मासिक EMI', 'महीनावार EMI', 'मासिक EMI', 'मासिक EMI'),
          t5(language, 'EMI Paid', 'भुगतान EMI', 'देवल EMI', 'भुगतान EMI', 'तिरेको EMI'),
          t5(language, 'Remaining Principal', 'शेष मूलधन', 'बाकी मूलधन', 'शेष मूलधन', 'बाँकी साँवा'),
        ];
        db.loans.forEach((l) => {
          const sched = buildLoanAmortizationSchedule(l, today.adStr);
          rows.push([
            `${l.nickname} (${l.bankName})`,
            `${sched.currentActiveRate}%`,
            sched.monthlyEquivalentEmi,
            sched.totalEmiPaidAmount,
            sched.remainingPrincipal,
          ]);
        });
        break;
      }
      case 'sip': {
        subtitle = t5(language, 'Detailed SIP Progress & Maturity', 'विस्तृत SIP प्रगति व परिपक्वता', 'विस्तृत SIP प्रगति आ पूरा तारीख', 'विस्तृत SIP प्रगति आ परिपक्वता', 'विस्तृत SIP प्रगति र परिपक्वता');
        columns = [
          t5(language, 'SIP Name', 'SIP नाम', 'SIP नाम', 'SIP नाम', 'SIP नाम'),
          t5(language, 'Status', 'स्थिति', 'स्थिति', 'स्थिति', 'स्थिति'),
          t5(language, 'Paid/Total', 'भुगतान/कुल', 'भरल/कुल', 'भुगतान/कुल', 'भुक्तान/कुल'),
          t5(language, 'Invested', 'निवेश', 'निवेश', 'निवेश', 'लगानी'),
          t5(language, 'Est. Maturity', 'अनुमानित परिपक्वता', 'अनुमानित पूरा रकम', 'अनुमानित परिपक्वता', 'अनुमानित परिपक्वता'),
        ];
        db.sips.forEach((s) => {
          const sched = generateSipSchedule(s.startDateBS, s.sipDay, s.monthlyInvestment, s.durationMonths, s.stepUpPercent, s.installments, today.adStr, s.status);
          const ev = evaluateSipSummary({ ...s, installments: sched }, today.adStr);
          const stLbl =
            s.status === 'active'
              ? t5(language, 'ACTIVE', 'सक्रिय', 'चालू', 'सक्रिय', 'सक्रिय')
              : s.status === 'paused'
              ? t5(language, 'PAUSED', 'रोका गया', 'रोकल', 'रोकल', 'रोकिएको')
              : t5(language, 'STOPPED', 'बंद', 'बंद', 'बंद', 'बन्द');
          rows.push([s.sipName, stLbl, `${ev.paidCount}/${s.durationMonths}`, ev.actualInvestedAmount, ev.projectedValueAtMaturity]);
        });
        break;
      }
      case 'mutual_fund': {
        subtitle = t5(language, 'Mutual Fund Portfolio & XIRR', 'म्यूचुअल फंड पोर्टफोलियो व XIRR', 'म्यूचुअल फंड पोर्टफोलियो आ XIRR', 'म्यूचुअल फंड पोर्टफोलियो आ XIRR', 'म्युचुअल फण्ड पोर्टफोलियो र XIRR');
        columns = [
          t5(language, 'Fund Name', 'फंड नाम', 'फंड नाम', 'फंड नाम', 'फण्ड नाम'),
          t5(language, 'Units', 'यूनिट', 'यूनिट', 'यूनिट', 'युनिट'),
          t5(language, 'NAV (Src)', 'NAV (स्रोत)', 'NAV (स्रोत)', 'NAV (स्रोत)', 'NAV (स्रोत)'),
          t5(language, 'Value', 'मूल्य', 'मूल्य', 'मूल्य', 'मूल्य'),
          'XIRR %',
        ];
        db.mutualFunds.forEach((m) => {
          const ev = evaluateMutualFund(m, today.adStr);
          const src =
            m.navSource === 'verified_live'
              ? t5(language, 'Live', 'लाइव', 'लाइव', 'लाइव', 'लाइभ')
              : t5(language, 'Manual', 'मैनुअल', 'मैनुअल', 'मैनुअल', 'म्यानुअल');
          rows.push([
            m.fundName,
            ev.remainingUnits,
            `${m.currentNav} (${src})`,
            ev.currentMarketValue,
            ev.xirrPercent !== null ? `${ev.xirrPercent}%` : t5(language, 'N/A', 'उपलब्ध नहीं', 'नइखे', 'उपलब्ध नहि', 'उपलब्ध छैन'),
          ]);
        });
        break;
      }
      case 'interest': {
        subtitle = t5(language, 'Interest Paid (Loans) & Credited (Bank)', 'भुगतान किया ब्याज (ऋण) व प्राप्त ब्याज (बैंक)', 'देवल ब्याज (कर्जा) आ मिलल ब्याज (बैंक)', 'भुगतान ब्याज (ऋण) आ प्राप्त ब्याज (बैंक)', 'तिरेको ब्याज (ऋण) र प्राप्त ब्याज (बैंक)');
        columns = [
          t5(language, 'Source', 'स्रोत', 'स्रोत', 'स्रोत', 'स्रोत'),
          t5(language, 'Type', 'प्रकार', 'प्रकार', 'प्रकार', 'प्रकार'),
          t5(language, 'Details', 'विवरण', 'विवरण', 'विवरण', 'विवरण'),
          t5(language, 'Interest Amount', 'ब्याज राशि', 'ब्याज रकम', 'ब्याज राशि', 'ब्याज रकम'),
        ];
        db.loans.forEach((l) => {
          const sched = buildLoanAmortizationSchedule(l, today.adStr);
          rows.push([
            l.nickname,
            t5(language, 'Loan Interest Paid', 'ऋण ब्याज भुगतान', 'कर्जा ब्याज भुगतान', 'ऋण ब्याज भुगतान', 'ऋण ब्याज भुक्तान'),
            `${sched.paidEmiCount} ${t5(language, 'EMIs', 'EMI', 'EMI', 'EMI', 'EMI')}`,
            sched.totalInterestPaid,
          ]);
        });
        db.bankTransactions
          .filter((t) => t.type === 'interest_credit')
          .forEach((t) =>
            rows.push([
              t5(language, 'Bank Interest', 'बैंक ब्याज', 'बैंक ब्याज', 'बैंक ब्याज', 'बैंक ब्याज'),
              t5(language, 'Credit', 'जमा', 'जमा', 'जमा', 'जम्मा'),
              t.dateBS,
              t.amount,
            ])
          );
        break;
      }
      case 'income_expense': {
        subtitle = t5(language, 'Full Income & Expense Register', 'संपूर्ण आय व खर्च रजिस्टर', 'पूरा कमाई आ खर्च रजिस्टर', 'संपूर्ण आय आ खर्च रजिस्टर', 'सम्पूर्ण आय र खर्च दर्ता');
        columns = [
          `${t5(language, 'Date', 'तारीख', 'तारीख', 'तिथि', 'मिति')} ${bs}`,
          t5(language, 'Type', 'प्रकार', 'प्रकार', 'प्रकार', 'प्रकार'),
          t5(language, 'Category', 'श्रेणी', 'श्रेणी', 'श्रेणी', 'श्रेणी'),
          t5(language, 'Method', 'माध्यम', 'तरीका', 'माध्यम', 'माध्यम'),
          t5(language, 'Amount', 'राशि', 'रकम', 'राशि', 'रकम'),
        ];
        db.incomeExpenses.forEach((x) => {
          rows.push([x.dateBS, x.entryType === 'income' ? incWord : expWord, x.category, methodLabel(x.paymentMethod), x.amount]);
        });
        break;
      }
      case 'assets_liabilities': {
        subtitle = t5(language, 'Balance Sheet Overview (Real Saved Records)', 'बैलेंस शीट विवरण (सुरक्षित डेटा से)', 'बैलेंस शीट विवरण (सेव डेटा से)', 'बैलेंस शीट विवरण (सुरक्षित डेटा सँ)', 'ब्यालेन्स सिट विवरण (सुरक्षित डेटाबाट)');
        columns = [
          t5(language, 'Side', 'पक्ष', 'पक्ष', 'पक्ष', 'पक्ष'),
          t5(language, 'Category', 'श्रेणी', 'श्रेणी', 'श्रेणी', 'श्रेणी'),
          t5(language, 'Value', 'मूल्य', 'रकम', 'मूल्य', 'मूल्य'),
        ];
        const assetLbl = t5(language, 'ASSET', 'संपत्ति', 'संपत्ति', 'संपत्ति', 'सम्पत्ति');
        const liabLbl = t5(language, 'LIABILITY', 'देनदारी', 'देनदारी', 'दायित्व', 'दायित्व');
        const nwLbl = t5(language, 'NET WORTH', 'शुद्ध संपत्ति', 'शुद्ध संपत्ति', 'शुद्ध संपत्ति', 'खुद सम्पत्ति');
        rows.push([assetLbl, t5(language, 'Bank & Cash Accounts', 'बैंक व नकद खाता', 'बैंक आ नगद खाता', 'बैंक आ नगद खाता', 'बैंक र नगद खाता'), summary.totalBankAndCash]);
        rows.push([assetLbl, t5(language, 'SIP & Mutual Funds (Current)', 'SIP व म्यूचुअल फंड (वर्तमान)', 'SIP आ म्यूचुअल फंड (अभी)', 'SIP आ म्यूचुअल फंड (वर्तमान)', 'SIP र म्युचुअल फण्ड (हाल)'), summary.currentInvestmentValue]);
        rows.push([assetLbl, t5(language, 'Savings Goals', 'बचत लक्ष्य', 'बचत लक्ष्य', 'बचत लक्ष्य', 'बचत लक्ष्य'), db.savingsGoals.reduce((s, g) => s + g.savedAmount, 0)]);
        rows.push([liabLbl, t5(language, 'Remaining Bank Loans', 'शेष बैंक ऋण', 'बाकी बैंक कर्जा', 'शेष बैंक ऋण', 'बाँकी बैंक ऋण'), summary.remainingLoan]);
        rows.push([
          liabLbl,
          t5(language, 'Unpaid Credit Card Bills', 'बकाया क्रेडिट कार्ड बिल', 'बाकी क्रेडिट कार्ड बिल', 'बकाया क्रेडिट कार्ड बिल', 'बाँकी क्रेडिट कार्ड बिल'),
          db.creditCardBills.filter((b) => !b.isPaid).reduce((s, b) => s + Math.max(0, b.billAmount - b.paidAmount), 0),
        ]);
        rows.push([nwLbl, t5(language, 'Total Assets - Liabilities', 'कुल संपत्ति - देनदारी', 'कुल संपत्ति - देनदारी', 'कुल संपत्ति - दायित्व', 'कुल सम्पत्ति - दायित्व'), summary.totalNetWorth]);
        break;
      }
    }

    return { columns, rows, subtitle };
  }, [db, reportType, summary, today.adStr, today.bsStr, language]);

  const activeReportMeta = REPORT_TYPES.find((r) => r.id === reportType) || REPORT_TYPES[0];

  const handleToggleLeadOption = (d: number) => {
    const cur = db.reminderPrefs.leadDaysOptions || [];
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b);
    bankDb.updateReminderPrefs({ leadDaysOptions: next });
    showToast(
      t5(language, 'Reminder lead-time updated', 'रिमाइंडर समय अपडेट हुआ', 'रिमाइंडर समय बदलल गइल', 'रिमाइंडर समय अपडेट भेल', 'रिमाइन्डर समय अपडेट भयो')
    );
  };

  const handleRequestNotifications = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        const sent = dispatchBankReminders(alerts, db, language);
        showToast(
          t5(
            language,
            `Notifications enabled (${sent} active alerts checked)`,
            `सूचनाएं चालू हुईं (${sent} सक्रिय अलर्ट जांचे गए)`,
            `सूचना चालू भइल (${sent} गो अलर्ट जाँचल गइल)`,
            `सूचना सक्रिय भेल (${sent} सक्रिय अलर्ट जाँचल गेल)`,
            `सूचना सक्षम गरियो (${sent} सक्रिय अलर्ट जाँचियो)`
          )
        );
      } else {
        showToast(
          t5(
            language,
            'Browser notification permission denied — using in-app alert banner',
            'ब्राउज़र सूचना अनुमति नहीं मिली — ऐप के अंदर अलर्ट बैनर उपयोग हो रहा है',
            'ब्राउज़र सूचना अनुमति ना मिलल — ऐप के भीतर अलर्ट देखावल जाई',
            'ब्राउज़र सूचना अनुमति नहि भेटल — ऐप के भीतर अलर्ट बैनर उपयोग भ रहल अछि',
            'ब्राउजर सूचना अनुमति अस्वीकार — एप भित्रै अलर्ट देखाइनेछ'
          )
        );
      }
    } else {
      showToast(
        t5(
          language,
          'Using in-app & Android native reminder engine',
          'इन-ऐप व एंड्रॉइड नेटिव रिमाइंडर उपयोग हो रहा है',
          'ऐप आ एंड्रॉइड रिमाइंडर काम कर रहल बा',
          'इन-ऐप आ एंड्रॉइड रिमाइंडर सक्रिय अछि',
          'इन-एप र एन्ड्रोइड रिमाइन्डर सक्रिय छ'
        )
      );
    }
  };

  const handleExportEncrypted = async () => {
    try {
      const envelope = await exportEncryptedBankBackup(passphraseExport);
      await downloadTextFile(
        JSON.stringify(envelope, null, 2),
        `gaule_bank_backup_${today.bsStr}.enc.json`,
        'application/json'
      );
      setPassphraseExport('');
      showToast(
        t5(
          language,
          'AES-256 encrypted backup exported',
          'AES-256 एन्क्रिप्टेड बैकअप डाउनलोड हुआ',
          'AES-256 एन्क्रिप्टेड बैकअप डाउनलोड भइल',
          'AES-256 एन्क्रिप्टेड बैकअप डाउनलोड भेल',
          'AES-256 इन्क्रिप्टेड ब्याकअप निर्यात भयो'
        )
      );
    } catch (err: any) {
      showToast(
        err?.message ||
          t5(language, 'Backup export failed', 'बैकअप निर्यात विफल रहा', 'बैकअप निकाले में दिक्कत भइल', 'बैकअप निर्यात विफल भेल', 'ब्याकअप निर्यात असफल भयो')
      );
    }
  };

  const handleRestoreEncrypted = async () => {
    try {
      await restoreEncryptedBankBackup(restoreJsonText, passphraseRestore);
      setRestoreJsonText('');
      setPassphraseRestore('');
      showToast(
        t5(
          language,
          'Encrypted backup decrypted and restored!',
          'एन्क्रिप्टेड बैकअप डिक्रिप्ट और पुनर्स्थापित हुआ!',
          'एन्क्रिप्टेड बैकअप सफलता से वापस आ गइल!',
          'एन्क्रिप्टेड बैकअप डिक्रिप्ट आ पुनर्स्थापित भेल!',
          'इन्क्रिप्टेड ब्याकअप डिक्रिप्ट र पुनर्स्थापना भयो!'
        )
      );
    } catch (err: any) {
      showToast(
        err?.message ||
          t5(language, 'Restore failed', 'पुनर्स्थापना विफल', 'वापस लावे में दिक्कत भइल', 'पुनर्स्थापना विफल', 'पुनर्स्थापना असफल')
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRestoreJsonText(String(reader.result || ''));
      showToast(
        t5(
          language,
          'Backup file loaded — enter passphrase to decrypt & restore',
          'बैकअप फाइल लोड हुई — पुनर्स्थापित करने के लिए पासवर्ड दर्ज करें',
          'बैकअप फाइल लोड भइल — खोले खातिर पासवर्ड डालीं',
          'बैकअप फाइल लोड भेल — डिक्रिप्ट करबाक लेल पासवर्ड डालू',
          'ब्याकअप फाइल लोड भयो — पुनर्स्थापना गर्न पासवर्ड राख्नुहोस्'
        )
      );
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* 1. Core Summary Metrics Grid */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {t5(
                language,
                'Consolidated Financial Position',
                'समेकित वित्तीय स्थिति',
                'कुल मिला के आर्थिक स्थिति',
                'समेकित वित्तीय स्थिति',
                'समेकित वित्तीय स्थिति'
              )}
            </div>
            <div className="text-2xl font-extrabold tabular-nums mt-0.5">
              {formatMoney(summary.totalNetWorth, currency, language)}{' '}
              <span className="text-xs font-medium text-slate-400">
                {t5(language, 'Net Worth', 'शुद्ध संपत्ति', 'शुद्ध संपत्ति', 'शुद्ध संपत्ति', 'खुद सम्पत्ति')}
              </span>
            </div>
          </div>
          <div className="text-right text-xs text-slate-300 tabular-nums">
            <div>{today.bsStr} {bsTag(language)}</div>
            <div className="text-[10px] text-slate-400">{today.adStr} {adTag(language)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-700/80 text-xs tabular-nums">
          <div><div className="text-[10px] text-slate-400">{t5(language, 'Total Invested', 'कुल निवेश', 'कुल निवेश', 'कुल निवेश', 'कुल लगानी')}</div><div className="font-bold">{formatMoney(summary.totalInvested, currency, language)}</div></div>
          <div><div className="text-[10px] text-slate-400">{t5(language, 'Current Investment Val', 'वर्तमान निवेश मूल्य', 'अभी के निवेश मूल्य', 'वर्तमान निवेश मूल्य', 'हालको लगानी मूल्य')}</div><div className="font-bold text-blue-300">{formatMoney(summary.currentInvestmentValue, currency, language)}</div></div>
          <div><div className="text-[10px] text-slate-400">{t5(language, 'Total Profit / Loss', 'कुल लाभ / हानि', 'कुल फायदा / घाटा', 'कुल लाभ / हानि', 'कुल नाफा / नोक्सान')}</div><div className={`font-bold ${summary.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatMoney(summary.totalProfitLoss, currency, language)}</div></div>
          <div><div className="text-[10px] text-slate-400">{t5(language, 'Total Loan (Orig.)', 'कुल मूल ऋण', 'कुल असली कर्जा', 'कुल मूल ऋण', 'कुल मूल ऋण')}</div><div className="font-bold">{formatMoney(summary.totalLoanOriginal, currency, language)}</div></div>
          <div><div className="text-[10px] text-slate-400">{t5(language, 'Total EMI Paid', 'कुल भुगतान EMI', 'कुल देवल EMI', 'कुल भुगतान EMI', 'कुल तिरेको EMI')}</div><div className="font-bold text-emerald-300">{formatMoney(summary.totalEmiPaid, currency, language)}</div></div>
          <div><div className="text-[10px] text-slate-400">{t5(language, 'Remaining Loan', 'शेष ऋण', 'बाकी कर्जा', 'शेष ऋण', 'बाँकी ऋण')}</div><div className="font-bold text-amber-300">{formatMoney(summary.remainingLoan, currency, language)}</div></div>
          <div><div className="text-[10px] text-slate-400">{t5(language, 'Monthly SIP', 'मासिक SIP', 'महीनावार SIP', 'मासिक SIP', 'मासिक SIP')}</div><div className="font-bold">{formatMoney(summary.monthlyInvestmentCommitment, currency, language)}</div></div>
          <div><div className="text-[10px] text-slate-400">{t5(language, 'Upcoming Dues (30d)', 'आगामी बकाया (30 दिन)', 'आवे वाला देय (30 दिन)', 'आगामी बकाया (30 दिन)', 'आगामी भुक्तानी (३० दिन)')}</div><div className="font-bold text-rose-300">{formatMoney(summary.upcomingPaymentsTotal, currency, language)}</div></div>
        </div>
      </div>

      {/* 2. 10 Financial Reports Selector + Export Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900">
            {t5(language, 'Financial Reports (10 Modules)', 'वित्तीय रिपोर्ट (10 मॉड्यूल)', 'आर्थिक रिपोर्ट (10 भाग)', 'वित्तीय रिपोर्ट (10 मॉड्यूल)', 'वित्तीय रिपोर्ट (१० मोड्युल)')}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                exportFinancialReportPDF({
                  reportTitle: activeReportMeta.en,
                  subtitle: reportData.subtitle,
                  summary,
                  columns: reportData.columns,
                  rows: reportData.rows,
                });
                showToast(
                  t5(language, 'A4 PDF Report downloaded', 'A4 PDF रिपोर्ट डाउनलोड हुई', 'A4 PDF रिपोर्ट डाउनलोड भइल', 'A4 PDF रिपोर्ट डाउनलोड भेल', 'A4 PDF रिपोर्ट डाउनलोड भयो')
                );
              }}
              className="min-h-[38px] px-3 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>A4 PDF</span>
            </button>
            <button
              type="button"
              onClick={() => safePrintCurrentView()}
              className="min-h-[38px] px-3 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t5(language, 'Print', 'प्रिंट', 'प्रिंट', 'प्रिंट', 'प्रिन्ट')}</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                const localizedTitle = getReportLabel(activeReportMeta);
                const txt = buildReportShareText({
                  reportTitle: localizedTitle,
                  summary,
                  rows: reportData.rows,
                  language,
                  currency,
                });
                const mode = await shareTextReport(localizedTitle, txt);
                showToast(
                  mode === 'shared'
                    ? t5(language, 'Report shared', 'रिपोर्ट साझा हुई', 'रिपोर्ट साझा भइल', 'रिपोर्ट साझा भेल', 'रिपोर्ट साझा गरियो')
                    : t5(language, 'Report summary copied for WhatsApp / Share', 'रिपोर्ट सारांश व्हाट्सएप / शेयर के लिए कॉपी हुआ', 'रिपोर्ट सारांश व्हाट्सएप / शेयर खातिर कॉपी भइल', 'रिपोर्ट सारांश व्हाट्सएप / शेयर लेल कॉपी भेल', 'रिपोर्ट सारांश व्हाट्सएप / सेयरका लागि कपी भयो')
                );
              }}
              className="min-h-[38px] px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t5(language, 'Share / Copy', 'साझा / कॉपी', 'साझा / कॉपी', 'साझा / कॉपी', 'साझा / कपी')}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.id}
              type="button"
              onClick={() => setReportType(rt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                reportType === rt.id ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {getReportLabel(rt)}
            </button>
          ))}
        </div>

        <div className="text-[11px] font-semibold text-slate-500">{reportData.subtitle}</div>

        {reportData.rows.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            {t5(
              language,
              `No real records match "${getReportLabel(activeReportMeta)}" yet.`,
              `"${getReportLabel(activeReportMeta)}" के लिए अभी कोई डेटा नहीं है।`,
              `"${getReportLabel(activeReportMeta)}" खातिर अभी कवनो डेटा नइखे।`,
              `"${getReportLabel(activeReportMeta)}" लेल एखन धरि कोनो डेटा नहि अछि।`,
              `"${getReportLabel(activeReportMeta)}" का लागि अहिलेसम्म कुनै डेटा छैन।`
            )}
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                <tr>
                  {reportData.columns.map((c) => (
                    <th key={c} className="py-2 px-3">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {reportData.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((cell, ci) => (
                      <td key={ci} className="py-2 px-3 font-medium text-slate-800">
                        {typeof cell === 'number' ? formatMoney(cell, currency, language) : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Smart Financial Insights + Reminder Inbox & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Smart Insights */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            {t5(language, 'Smart Financial Insights', 'स्मार्ट वित्तीय विश्लेषण', 'स्मार्ट पइसा जानकारी', 'स्मार्ट वित्तीय जानकारी', 'स्मार्ट वित्तीय जानकारी')}
          </h3>
          {insights.length === 0 ? (
            <div className="text-xs text-slate-500 py-4">
              {t5(
                language,
                'Add Loans, SIPs, Mutual Funds, FDs, or Expenses to see verified insights from your real data.',
                'अपने वास्तविक डेटा से विश्लेषण देखने के लिए ऋण, SIP, म्यूचुअल फंड, FD या खर्च जोड़ें।',
                'आपन असली डेटा से विश्लेषण देखे खातिर कर्जा, SIP, म्यूचुअल फंड, FD भा खर्च जोड़ीं।',
                'अपन वास्तविक डेटा सँ विश्लेषण देखबाक लेल ऋण, SIP, म्यूचुअल फंड, FD वा खर्च जोड़ू।',
                'तपाईंको वास्तविक डेटाबाट विश्लेषण हेर्न ऋण, SIP, म्युचुअल फण्ड, FD वा खर्च थप्नुहोस्।'
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {insights.map((ins) => (
                <div
                  key={ins.id}
                  className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-2 ${
                    ins.severity === 'alert'
                      ? 'bg-rose-50 border-rose-200'
                      : ins.severity === 'warning'
                      ? 'bg-amber-50 border-amber-200'
                      : ins.severity === 'success'
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {ins.severity === 'alert' || ins.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                    ) : ins.severity === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
                    ) : (
                      <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-700" />
                    )}
                    <div>
                      <div className="font-bold text-slate-900">{ins.title}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5">{ins.detail}</div>
                    </div>
                  </div>
                  {ins.metric && (
                    <span className="font-extrabold text-slate-900 tabular-nums shrink-0">{ins.metric}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Smart Reminder Preferences & Active Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <BellRing className="w-4 h-4 text-blue-600" />
              <span>{t5(language, 'Smart Reminder System', 'स्मार्ट रिमाइंडर सिस्टम', 'स्मार्ट याद दिलावे वाला सिस्टम', 'स्मार्ट रिमाइंडर सिस्टम', 'स्मार्ट रिमाइन्डर प्रणाली')}</span>
            </h3>
            <button
              type="button"
              onClick={handleRequestNotifications}
              className="min-h-[34px] px-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold cursor-pointer"
            >
              {t5(language, 'Enable Notifications', 'सूचनाएं चालू करें', 'सूचना चालू करीं', 'सूचना सक्षम करू', 'सूचना सक्षम गर्नुहोस्')}
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="font-semibold text-slate-700">
              {t5(language, 'Remind Me Before Due Date:', 'नियत तिथि से पहले याद दिलाएं:', 'देय तारीख से पहिले याद दिलाईं:', 'देय तिथि सँ पहिने याद दियाउ:', 'भुक्तानी मिति अघि सम्झाउनुहोस्:')}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[1, 3, 7].map((d) => {
                const active = db.reminderPrefs.leadDaysOptions.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleToggleLeadOption(d)}
                    className={`px-3 py-1.5 rounded-lg font-bold border cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {t5(
                      language,
                      `${d} Day${d > 1 ? 's' : ''} Before`,
                      `${d} दिन पहले`,
                      `${d} दिन पहिले`,
                      `${d} दिन पहिने`,
                      `${d} दिन अघि`
                    )}
                  </button>
                );
              })}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">
                  {t5(language, 'Custom:', 'कस्टम:', 'आपन मन से:', 'कस्टम:', 'कस्टम:')}
                </span>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={customLeadDays}
                  onChange={(e) => setCustomLeadDays(Number(e.target.value))}
                  onBlur={() => {
                    bankDb.updateReminderPrefs({ customLeadDays: Math.max(0, customLeadDays) });
                    showToast(
                      t5(language, 'Custom lead days saved', 'कस्टम दिन सुरक्षित हुए', 'कस्टम दिन सेव भइल', 'कस्टम दिन सुरक्षित भेल', 'कस्टम दिन सुरक्षित गरियो')
                    );
                  }}
                  className="w-16 min-h-[34px] px-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5 max-h-[210px] overflow-y-auto pt-1">
            {alerts.length === 0 ? (
              <div className="text-xs text-slate-400 py-3">
                {t5(
                  language,
                  'No upcoming alerts inside selected lead window.',
                  'चयनित अवधि में कोई आगामी अलर्ट नहीं है।',
                  'चुनल समय में अभी कवनो अलर्ट नइखे।',
                  'चुनल अवधि मे कोनो आगामी अलर्ट नहि अछि।',
                  'छानिएको समय भित्र कुनै आगामी अलर्ट छैन।'
                )}
              </div>
            ) : (
              alerts.map((a) => (
                <div key={a.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{a.title}</div>
                    <div className="text-[10px] text-slate-500 tabular-nums">
                      {a.isOverdue
                        ? t5(language, `Overdue ${Math.abs(a.daysRemaining)}d`, `${Math.abs(a.daysRemaining)} दिन बकाया`, `${Math.abs(a.daysRemaining)} दिन बाकी`, `${Math.abs(a.daysRemaining)} दिन बकाया`, `${Math.abs(a.daysRemaining)} दिन ढिला`)
                        : a.daysRemaining === 0
                        ? t5(language, 'Due Today', 'आज देय', 'आज देय', 'आइ देय', 'आज अन्तिम मिति')
                        : t5(language, `In ${a.daysRemaining}d`, `${a.daysRemaining} दिन में`, `${a.daysRemaining} दिन में`, `${a.daysRemaining} दिन मे`, `${a.daysRemaining} दिनमा`)}{' '}
                      • {a.dueDateBS} {bsTag(language)} • {formatMoney(a.amount, currency, language)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      bankDb.updateReminderPrefs({
                        dismissedAlertKeys: { ...db.reminderPrefs.dismissedAlertKeys, [a.id]: today.adStr },
                      });
                      showToast(
                        t5(language, 'Reminder snoozed for today', 'आज के लिए रिमाइंडर बंद किया गया', 'आज खातिर रिमाइंडर टालल गइल', 'आइ लेल रिमाइंडर टारल गेल', 'आजका लागि रिमाइन्डर रोकियो')
                      );
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label={t5(language, 'Dismiss reminder', 'रिमाइंडर हटाएं', 'रिमाइंडर हटाईं', 'रिमाइंडर हटाउ', 'रिमाइन्डर हटाउनुहोस्')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. AES-256-GCM Encrypted Offline Backup & Restore */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>
                {t5(
                  language,
                  'AES-256 Encrypted Offline Backup & Restore',
                  'AES-256 एन्क्रिप्टेड ऑफलाइन बैकअप और रीस्टोर',
                  'AES-256 सुरक्षित ऑफलाइन बैकअप आ वापस पावे के सुविधा',
                  'AES-256 एन्क्रिप्टेड ऑफलाइन बैकअप आ पुनर्स्थापना',
                  'AES-256 इन्क्रिप्टेड अफलाइन ब्याकअप र पुनर्स्थापना'
                )}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              {t5(
                language,
                'Isolated per account prefix. Protected using PBKDF2-SHA256 + AES-GCM encryption before export.',
                'प्रत्येक खाते के लिए अलग। निर्यात से पहले PBKDF2-SHA256 + AES-GCM एन्क्रिप्शन से सुरक्षित।',
                'हर खाता खातिर अलग। निकाले से पहिले PBKDF2-SHA256 + AES-GCM सुरक्षा से ताला लागल।',
                'प्रत्येक खाता लेल अलग। निर्यात सँ पहिने PBKDF2-SHA256 + AES-GCM एन्क्रिप्शन सँ सुरक्षित।',
                'प्रत्येक खाताका लागि छुट्टै। निर्यात अघि PBKDF2-SHA256 + AES-GCM बाट सुरक्षित गरिएको।'
              )}
            </p>
          </div>
          {db.lastBackupAt && (
            <span className="text-[11px] text-slate-500">
              {t5(language, 'Last backup:', 'अंतिम बैकअप:', 'आखिरी बैकअप:', 'अंतिम बैकअप:', 'अन्तिम ब्याकअप:')} {new Date(db.lastBackupAt).toLocaleString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="text-xs font-bold text-slate-900">
              {t5(language, '1. Export Encrypted Backup', '1. एन्क्रिप्टेड बैकअप निर्यात करें', '1. सुरक्षित बैकअप निकालीं', '1. एन्क्रिप्टेड बैकअप निर्यात करू', '१. इन्क्रिप्टेड ब्याकअप निर्यात गर्नुहोस्')}
            </div>
            <input
              type="password"
              value={passphraseExport}
              onChange={(e) => setPassphraseExport(e.target.value)}
              placeholder={t5(
                language,
                'Enter encryption passphrase (min 4 chars)',
                'एन्क्रिप्शन पासवर्ड लिखें (कम से कम 4 अक्षर)',
                'पासवर्ड लिखीं (कम से कम 4 अक्षर)',
                'एन्क्रिप्शन पासवर्ड लिखू (कम सँ कम 4 अक्षर)',
                'इन्क्रिप्सन पासवर्ड लेख्नुहोस् (कम्तीमा ४ अक्षर)'
              )}
              className="w-full min-h-[40px] px-3 bg-white border border-slate-300 rounded-xl text-xs"
            />
            <button
              type="button"
              onClick={handleExportEncrypted}
              className="w-full min-h-[40px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {t5(
                  language,
                  'Export Encrypted File (.enc.json)',
                  'एन्क्रिप्टेड फाइल डाउनलोड करें (.enc.json)',
                  'सुरक्षित फाइल डाउनलोड करीं (.enc.json)',
                  'एन्क्रिप्टेड फाइल डाउनलोड करू (.enc.json)',
                  'इन्क्रिप्टेड फाइल डाउनलोड गर्नुहोस् (.enc.json)'
                )}
              </span>
            </button>
          </div>

          {/* Restore */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                {t5(language, '2. Restore Encrypted Backup', '2. एन्क्रिप्टेड बैकअप रीस्टोर करें', '2. सुरक्षित बैकअप वापस लीं', '2. एन्क्रिप्टेड बैकअप पुनर्स्थापित करू', '२. इन्क्रिप्टेड ब्याकअप पुनर्स्थापना गर्नुहोस्')}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
              >
                {t5(language, 'Choose .json file', '.json फाइल चुनें', '.json फाइल चुनीं', '.json फाइल चुनू', '.json फाइल छान्नुहोस्')}
              </button>
            </div>
            <textarea
              rows={2}
              value={restoreJsonText}
              onChange={(e) => setRestoreJsonText(e.target.value)}
              placeholder={t5(
                language,
                'Or paste encrypted JSON backup content here...',
                'या एन्क्रिप्टेड JSON बैकअप सामग्री यहाँ पेस्ट करें...',
                'भा एन्क्रिप्टेड JSON बैकअप इहाँ पेस्ट करीं...',
                'वा एन्क्रिप्टेड JSON बैकअप सामग्री एतय पेस्ट करू...',
                'वा इन्क्रिप्टेड JSON ब्याकअप यहाँ पेस्ट गर्नुहोस्...'
              )}
              className="w-full p-2 bg-white border border-slate-300 rounded-xl text-[11px] font-mono"
            />
            <div className="flex gap-2">
              <input
                type="password"
                value={passphraseRestore}
                onChange={(e) => setPassphraseRestore(e.target.value)}
                placeholder={t5(language, 'Backup passphrase', 'बैकअप पासवर्ड', 'बैकअप पासवर्ड', 'बैकअप पासवर्ड', 'ब्याकअप पासवर्ड')}
                className="flex-1 min-h-[40px] px-3 bg-white border border-slate-300 rounded-xl text-xs"
              />
              <button
                type="button"
                onClick={handleRestoreEncrypted}
                className="min-h-[40px] px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{t5(language, 'Restore', 'रीस्टोर', 'वापस लीं', 'पुनर्स्थापित करू', 'पुनर्स्थापना')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
