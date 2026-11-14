/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A4 PDF & Share Export Engine for Bank & Investment Module
 * Supports:
 * - Individual Calculator PDF Reports (all 20 calculators)
 * - Full Financial Reports PDF (all 10 report views)
 * - WhatsApp / Copy / Web Share text formatter
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Currency, Language } from '../types';
import { adStrToBsStr, adTag, bsStrToAdStr, bsTag, formatMoney, getTodayDual, t5 } from './i18n';
import { PortfolioMetricsSummary } from './insightsAndReminders';
import { CalcResult } from './calculations';
import { saveJsPdfDocument, printCurrentView } from '../utils/androidBridge';

export function exportCalculatorPDF(params: {
  calculatorTitle: string;
  inputs: Array<{ label: string; value: string }>;
  result: CalcResult;
  notes?: string;
}): void {
  const today = getTodayDual();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`GAULE BANK & INVESTMENT — ${params.calculatorTitle.toUpperCase()}`, 14, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date: ${today.bsStr} BS (${today.adStr} AD)`, 14, 28);

  // Result Banner
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14, 33, 182, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 64, 175);
  doc.text(params.result.primaryLabel, 18, 41);
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(`Rs. ${params.result.primaryValue.toLocaleString('en-IN')}`, 18, 50);

  if (params.result.secondaryLabel) {
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`${params.result.secondaryLabel}:`, 130, 41);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(String(params.result.secondaryValue ?? ''), 130, 49);
  }

  // Inputs Table
  autoTable(doc, {
    startY: 60,
    head: [['Input Parameter', 'Value']],
    body: params.inputs.map((i) => [i.label, i.value]),
    theme: 'grid',
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    styles: { fontSize: 9 },
  });

  const afterInputsY = (doc as any).lastAutoTable?.finalY || 110;

  // Breakdown Table
  autoTable(doc, {
    startY: afterInputsY + 8,
    head: [['Calculated Metric', 'Result']],
    body: params.result.metrics.map((m) => [m.label, m.value]),
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    styles: { fontSize: 9 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 160;
  let yCursor = finalY + 8;

  if (params.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Notes: ${params.notes}`, 14, yCursor);
    yCursor += 6;
  }

  if (params.result.disclaimer) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Disclaimer: ${params.result.disclaimer}`, 14, yCursor);
  }

  const slug = params.calculatorTitle.replace(/[^a-zA-Z0-9]+/g, '_');
  saveJsPdfDocument(doc, `Gaule_${slug}_${today.bsStr}.pdf`);
}

export function exportFinancialReportPDF(params: {
  reportTitle: string;
  subtitle: string;
  summary: PortfolioMetricsSummary;
  columns: string[];
  rows: Array<Array<string | number>>;
}): void {
  const today = getTodayDual();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(`GAULE BANK & INVESTMENT — ${params.reportTitle.toUpperCase()}`, 14, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`${params.subtitle}  |  Generated: ${today.bsStr} BS (${today.adStr} AD)`, 14, 28);

  // Summary Matrix
  const summaryPairs = [
    ['Total Invested', `Rs. ${params.summary.totalInvested.toLocaleString('en-IN')}`, 'Total Loan Original', `Rs. ${params.summary.totalLoanOriginal.toLocaleString('en-IN')}`],
    ['Current Investment Val', `Rs. ${params.summary.currentInvestmentValue.toLocaleString('en-IN')}`, 'Total EMI Paid', `Rs. ${params.summary.totalEmiPaid.toLocaleString('en-IN')}`],
    ['Total Profit / Loss', `Rs. ${params.summary.totalProfitLoss.toLocaleString('en-IN')}`, 'Remaining Loan', `Rs. ${params.summary.remainingLoan.toLocaleString('en-IN')}`],
    ['Monthly SIP Commitment', `Rs. ${params.summary.monthlyInvestmentCommitment.toLocaleString('en-IN')}`, 'Upcoming Dues (30d)', `Rs. ${params.summary.upcomingPaymentsTotal.toLocaleString('en-IN')}`],
    ['Bank & Cash Savings', `Rs. ${params.summary.totalBankAndCash.toLocaleString('en-IN')}`, 'TOTAL NET WORTH', `Rs. ${params.summary.totalNetWorth.toLocaleString('en-IN')}`],
  ];

  autoTable(doc, {
    startY: 33,
    head: [['Asset / Investment Metric', 'Value', 'Liability / Cashflow Metric', 'Value']],
    body: summaryPairs,
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  const nextY = ((doc as any).lastAutoTable?.finalY || 80) + 8;

  if (params.rows.length > 0) {
    autoTable(doc, {
      startY: nextY,
      head: [params.columns],
      body: params.rows.map((r) => r.map((c) => String(c))),
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 },
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.text('No records recorded for this report filter yet.', 14, nextY + 4);
  }

  const slug = params.reportTitle.replace(/[^a-zA-Z0-9]+/g, '_');
  saveJsPdfDocument(doc, `Gaule_Report_${slug}_${today.bsStr}.pdf`);
}

export function buildReportShareText(params: {
  reportTitle: string;
  summary: PortfolioMetricsSummary;
  rows: Array<Array<string | number>>;
  language?: Language;
  currency?: Currency;
}): string {
  const lang: Language = params.language || 'en';
  const cur: Currency = params.currency || 'NPR';
  const today = getTodayDual();
  const brand = t5(
    lang,
    'GAULE BANK & INVESTMENT',
    'गौले बैंक और निवेश',
    'गौले बैंक आ निवेश',
    'गौले बैंक आ निवेश',
    'गाउँले बैंक र लगानी'
  );
  let txt = `*🏦 ${brand} — ${params.reportTitle}*\n`;
  txt += `📅 ${today.bsStr} ${bsTag(lang)} (${today.adStr} ${adTag(lang)})\n`;
  txt += `-----------------------------\n`;
  txt += `• ${t5(lang, 'Total Invested', 'कुल निवेश', 'कुल लगावल पूंजी', 'कुल निवेश', 'कुल लगानी')}: ${formatMoney(params.summary.totalInvested, cur, lang)}\n`;
  txt += `• ${t5(lang, 'Current Investment Value', 'वर्तमान निवेश मूल्य', 'अभी के निवेश मूल्य', 'वर्तमान निवेश मूल्य', 'हालको लगानी मूल्य')}: ${formatMoney(params.summary.currentInvestmentValue, cur, lang)}\n`;
  txt += `• ${t5(lang, 'Profit / Loss', 'लाभ / हानि', 'फायदा / घाटा', 'लाभ / हानि', 'नाफा / नोक्सान')}: ${formatMoney(params.summary.totalProfitLoss, cur, lang)}\n`;
  txt += `• ${t5(lang, 'Remaining Loan', 'शेष लोन', 'बाकी कर्जा', 'बाकी कर्जा', 'बाँकी ऋण')}: ${formatMoney(params.summary.remainingLoan, cur, lang)}\n`;
  txt += `• ${t5(lang, 'Total EMI Paid', 'कुल EMI भुगतान', 'कुल जमा भइल EMI', 'कुल EMI भुगतान', 'कुल तिरिएको EMI')}: ${formatMoney(params.summary.totalEmiPaid, cur, lang)}\n`;
  txt += `• ${t5(lang, 'Upcoming Payments (30d)', 'आगामी भुगतान (30 दिन)', 'आवे वाला भुगतान (30 दिन)', 'आगामी भुगतान (30 दिन)', 'आगामी भुक्तानी (३० दिन)')}: ${formatMoney(params.summary.upcomingPaymentsTotal, cur, lang)}\n`;
  txt += `*• ${t5(lang, 'Total Net Worth', 'कुल शुद्ध संपत्ति', 'कुल शुद्ध संपत्ति', 'कुल शुद्ध संपत्ति', 'कुल खुद सम्पत्ति')}: ${formatMoney(params.summary.totalNetWorth, cur, lang)}*\n`;
  if (params.rows.length > 0) {
    txt += `-----------------------------\n`;
    params.rows.slice(0, 12).forEach((r, idx) => {
      txt += `${idx + 1}. ${r.join(' | ')}\n`;
    });
    if (params.rows.length > 12) {
      txt += `${t5(
        lang,
        `...and ${params.rows.length - 12} more rows.`,
        `...और ${params.rows.length - 12} अन्य पंक्तियां।`,
        `...आ ${params.rows.length - 12} गो अउर लाइन।`,
        `...आ ${params.rows.length - 12} टा आओर पंक्ति।`,
        `...र थप ${params.rows.length - 12} पङ्क्ति।`
      )}\n`;
    }
  }
  return txt;
}

export async function shareTextReport(title: string, text: string): Promise<'shared' | 'copied'> {
  if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
    try {
      await (navigator as any).share({ title, text });
      return 'shared';
    } catch {}
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }
  return 'copied';
}

export function safePrintCurrentView(): void {
  printCurrentView('Gaule Bank & Investment Report');
}

// Re-export dual helpers to prevent unused-import warnings if consumers need them
export { adStrToBsStr, bsStrToAdStr };
