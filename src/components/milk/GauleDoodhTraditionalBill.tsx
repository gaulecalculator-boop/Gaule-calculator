/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GAULE DOODH — Traditional Printed Dairy Bill View Component
 * Strictly period-summary based (NO daily milk entries table).
 * Displays all 13 required fields with Nepali BS primary + English AD secondary dates,
 * and provides A4 PDF, Print, Download (PNG), and WhatsApp actions.
 */

import React from 'react';
import { FileDown, Printer, Download, Share2 } from 'lucide-react';
import {
  GauleDoodhBillSummary,
  generateGauleDoodhWhatsAppText,
  resolveGauleDoodhBrand,
} from '../../utils/gauleDoodhBillEngine';
import { dairyBranding, DairyBrandingProfile } from '../../utils/dairyBranding';
import {
  downloadGauleDoodhBillImage,
  generateGauleDoodhBillPDF,
  printGauleDoodhBill,
} from '../../utils/milkExportUtils';
import { openWhatsAppShare } from '../../utils/milkManagementStorage';
import { playTapSound } from '../../utils/audio';

interface GauleDoodhTraditionalBillProps {
  summary: GauleDoodhBillSummary;
  isFinalEndBill?: boolean;
  customProfile?: DairyBrandingProfile;
  onToast?: (msg: string) => void;
  extraActionSlot?: React.ReactNode;
}

export const GauleDoodhTraditionalBill: React.FC<GauleDoodhTraditionalBillProps> = ({
  summary,
  isFinalEndBill = false,
  customProfile,
  onToast,
  extraActionSlot,
}) => {
  const brand = resolveGauleDoodhBrand(customProfile || dairyBranding.getProfile());
  const subBrandName =
    brand.dairyName && !brand.dairyName.toUpperCase().includes('GAULE')
      ? brand.dairyName
      : '';

  const contactLine = [
    brand.address ? `ठेगाना: ${brand.address}` : '',
    brand.mobile ? `सम्पर्क: ${brand.mobile}` : '',
    brand.proprietorName ? `प्रो.: ${brand.proprietorName}` : '',
    brand.panVatNumber ? `PAN: ${brand.panVatNumber}` : '',
  ]
    .filter(Boolean)
    .join(' • ');

  const statusText =
    summary.status === 'advance'
      ? 'एडभान्स क्रेडिट (ADVANCE)'
      : summary.status === 'paid'
      ? 'चुक्ता (PAID)'
      : summary.status === 'partial'
      ? 'आंशिक (PARTIAL)'
      : 'बाँकी (DUE)';

  const statusClass =
    summary.status === 'advance'
      ? 'bg-blue-50 text-blue-900 border-blue-300'
      : summary.status === 'paid'
      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
      : summary.status === 'partial'
      ? 'bg-amber-50 text-amber-900 border-amber-300'
      : 'bg-rose-50 text-rose-900 border-rose-300';

  return (
    <div className="space-y-3">
      {/* Traditional Printed Dairy Bill Sheet */}
      <div className="bg-white border-2 border-slate-900 p-1 shadow-xs">
        <div className="border border-slate-900 p-3 sm:p-4 space-y-3 text-xs text-slate-900 tabular-nums">
          {/* Masthead */}
          <div className="text-center border-b-2 border-slate-900 pb-2.5 space-y-0.5">
            <div className="text-lg sm:text-xl font-black tracking-wide text-slate-950">
              गौले दूध • GAULE DOODH
            </div>
            {subBrandName && (
              <div className="text-[11px] font-bold text-blue-900">{subBrandName}</div>
            )}
            {contactLine && (
              <div className="text-[10px] font-medium text-slate-600">{contactLine}</div>
            )}
            {brand.slogan && (
              <div className="text-[10px] italic text-slate-500">&ldquo;{brand.slogan}&rdquo;</div>
            )}
          </div>

          {/* Bill Title Bar */}
          <div className="bg-slate-900 text-white px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px] font-black tracking-wide">
            <span className="truncate">{summary.billTitle}</span>
            <span className="shrink-0 font-mono text-[10px] text-slate-200">
              #{summary.billNumber}
            </span>
          </div>

          {/* Customer & Billing Dates Ledger Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-slate-300 bg-slate-50/70 p-2.5">
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                ग्राहक विवरण (Customer)
              </div>
              <div className="text-sm font-black text-slate-950">{summary.customer.name}</div>
              <div className="text-[11px] text-slate-700 font-semibold">
                सम्पर्क: {summary.customer.mobile || 'उल्लेख नभएको'}
              </div>
              <div className="text-[11px] text-slate-600">
                ठेगाना: {summary.customer.address || 'स्थानीय'}
              </div>
            </div>

            <div className="space-y-1 sm:border-l sm:border-slate-300 sm:pl-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  बिल अवधि (BS / AD)
                </span>
                <span className={`px-1.5 py-0.5 border text-[10px] font-black ${statusClass}`}>
                  {statusText}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2 text-[11px]">
                <span className="font-bold text-slate-600">सुरु (From):</span>
                <span className="font-black text-slate-950 text-right">
                  {summary.startDate.bsDisplayShort} BS{' '}
                  <span className="font-medium text-slate-500">({summary.startDate.adDisplay})</span>
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2 text-[11px]">
                <span className="font-bold text-slate-600">अन्तिम (To):</span>
                <span className="font-black text-slate-950 text-right">
                  {summary.endDate.bsDisplayShort} BS{' '}
                  <span className="font-medium text-slate-500">({summary.endDate.adDisplay})</span>
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2 text-[10px] text-slate-500">
                <span>जारी मिति:</span>
                <span>
                  {summary.generatedDate.bsDisplayShort} BS ({summary.generatedDate.adDisplay})
                </span>
              </div>
            </div>
          </div>

          {/* 3-Box Day Summary */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="border border-slate-300 bg-slate-50 p-2">
              <span className="text-[10px] font-bold text-slate-600 block">
                जम्मा दिन (Calendar)
              </span>
              <span className="text-sm font-black text-slate-950">
                {summary.totalCalendarDays} दिन
              </span>
            </div>
            <div className="border border-emerald-300 bg-emerald-50/70 p-2">
              <span className="text-[10px] font-bold text-emerald-800 block">
                दुध आपूर्ति (Supply)
              </span>
              <span className="text-sm font-black text-emerald-950">
                {summary.totalMilkSupplyDays} दिन
              </span>
            </div>
            <div className="border border-rose-300 bg-rose-50/70 p-2">
              <span className="text-[10px] font-bold text-rose-800 block">
                दुध नभएको (Loss)
              </span>
              <span className="text-sm font-black text-rose-950">
                {summary.totalLossDays} दिन
              </span>
            </div>
          </div>

          {summary.excludedNonSupplyDays > 0 && (
            <p className="text-[10px] font-semibold text-slate-600 -mt-1">
              * नोट: बिदा / ग्राहक निष्क्रिय / तालिका नपरेका {summary.excludedNonSupplyDays} दिनलाई Loss Days मा गनिएको छैन।
            </p>
          )}

          {/* Section 1: Period Milk Quantity & Rate Summary Table (NO DAILY ENTRIES TABLE) */}
          <div className="space-y-1">
            <div className="text-[11px] font-black uppercase tracking-wide border-l-2 border-slate-900 pl-1.5 text-slate-900">
              १. दुध परिमाण, दर र जम्मा रकम (Milk Supply &amp; Rate Summary)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-400 text-[11px]">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="border border-slate-700 px-2 py-1.5 text-left font-bold">
                      विवरण (Particulars)
                    </th>
                    <th className="border border-slate-700 px-2 py-1.5 text-right font-bold">
                      परिमाण (L &amp; ml)
                    </th>
                    <th className="border border-slate-700 px-2 py-1.5 text-right font-bold">
                      दर (Rate/L)
                    </th>
                    <th className="border border-slate-700 px-2 py-1.5 text-right font-bold">
                      रकम (Rs)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rateBreakdown.length <= 1 ? (
                    <tr>
                      <td className="border border-slate-300 px-2 py-1.5">
                        <div className="font-bold text-slate-900">
                          कुल दुध आपूर्ति ({summary.totalMilkSupplyDays} दिन)
                        </div>
                        <div className="text-[10px] text-slate-600">
                          बिहान: {summary.morningMilk.labelEn} ({summary.morningSupplyDays} दिन) • बेलुका:{' '}
                          {summary.eveningMilk.labelEn} ({summary.eveningSupplyDays} दिन)
                        </div>
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right font-black text-slate-950">
                        <div>{summary.totalMilk.labelEn}</div>
                        <div className="text-[10px] font-semibold text-slate-600">
                          {summary.totalMilk.labelNe}
                        </div>
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right font-bold">
                        रु {summary.rateBreakdown[0]?.ratePerLtr ?? summary.primaryRatePerLtr}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right font-black text-slate-950">
                        रु {summary.totalMilkAmount.toLocaleString()}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {summary.rateBreakdown.map((rb, idx) => (
                        <tr key={`${rb.ratePerLtr}_${rb.shiftLabel || idx}`}>
                          <td className="border border-slate-300 px-2 py-1 font-semibold">
                            दुध आपूर्ति{rb.shiftLabel ? ` (${rb.shiftLabel})` : ''} @ रु {rb.ratePerLtr}/L
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-right font-bold">
                            {rb.litersAndMl.labelEn}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-right">
                            रु {rb.ratePerLtr}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-right font-bold">
                            रु {rb.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-black">
                        <td className="border border-slate-300 px-2 py-1.5">
                          जम्मा दुध ({summary.totalMilkSupplyDays} दिन • बिहान {summary.morningMilk.labelEn} + बेलुका{' '}
                          {summary.eveningMilk.labelEn})
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right text-blue-950">
                          {summary.totalMilk.labelEn}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right">Multi</td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right text-blue-950">
                          रु {summary.totalMilkAmount.toLocaleString()}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Financial Ledger Summary */}
          <div className="space-y-1">
            <div className="text-[11px] font-black uppercase tracking-wide border-l-2 border-slate-900 pl-1.5 text-slate-900">
              २. हिसाब तथा बक्यौता विवरण (Financial Summary)
            </div>
            <table className="w-full border-collapse border border-slate-400 text-[11px]">
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-2 py-1.5 font-semibold text-slate-700">
                    कुल दुधको रकम (Total Milk Amount)
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right font-black text-slate-950">
                    रु {summary.totalMilkAmount.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1.5 font-semibold text-slate-700">
                    अघिल्लो बाँकी बक्यौता (Previous Outstanding Balance)
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right font-black text-slate-950">
                    रु {summary.previousOutstandingBalance.toLocaleString()}
                  </td>
                </tr>
                {summary.priorAdvanceCreditApplied > 0 && (
                  <tr className="bg-emerald-50/40">
                    <td className="border border-slate-300 px-2 py-1.5 font-semibold text-emerald-900">
                      अघिल्लो एडभान्स समायोजन (Prior Advance Adjustment)
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right font-black text-emerald-800">
                      - रु {summary.priorAdvanceCreditApplied.toLocaleString()}
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="border border-slate-300 px-2 py-1.5 font-semibold text-emerald-900">
                    कुल भुक्तानी प्राप्त (Total Amount Paid — {summary.paymentHistory.length} पटक)
                  </td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right font-black text-emerald-800">
                    - रु {summary.totalAmountPaid.toLocaleString()}
                  </td>
                </tr>
                {(summary.advancePaymentsInPeriod > 0 || summary.advanceCreditRemaining > 0) && (
                  <tr className="bg-blue-50/40">
                    <td className="border border-slate-300 px-2 py-1.5 font-semibold text-blue-900">
                      एडभान्स समायोजन / क्रेडिट (Advance Adjustments)
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right font-bold text-blue-900">
                      पेश्की: रु {summary.advancePaymentsInPeriod.toLocaleString()} • क्रेडिट: रु{' '}
                      {summary.advanceCreditRemaining.toLocaleString()}
                    </td>
                  </tr>
                )}
                <tr
                  className={
                    summary.finalRemainingDue > 0
                      ? 'bg-rose-50 text-rose-950'
                      : 'bg-emerald-50 text-emerald-950'
                  }
                >
                  <td className="border border-slate-400 px-2 py-2 text-xs font-black">
                    {summary.advanceCreditRemaining > 0
                      ? 'अन्तिम एडभान्स जम्मा (SURPLUS ADVANCE CREDIT)'
                      : 'अन्तिम तिर्न बाँकी रकम (FINAL REMAINING DUE)'}
                  </td>
                  <td className="border border-slate-400 px-2 py-2 text-right text-sm font-black">
                    रु{' '}
                    {(summary.advanceCreditRemaining > 0
                      ? summary.advanceCreditRemaining
                      : summary.finalRemainingDue
                    ).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Complete Payment History */}
          <div className="space-y-1">
            <div className="text-[11px] font-black uppercase tracking-wide border-l-2 border-slate-900 pl-1.5 text-slate-900">
              ३. सम्पूर्ण भुक्तानी इतिहास (Complete Payment History — {summary.paymentHistory.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-400 text-[11px]">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="border border-slate-700 px-1.5 py-1 text-center font-bold">#</th>
                    <th className="border border-slate-700 px-2 py-1 text-left font-bold">
                      मिति (BS / AD)
                    </th>
                    <th className="border border-slate-700 px-2 py-1 text-left font-bold">
                      रसिद / विवरण
                    </th>
                    <th className="border border-slate-700 px-2 py-1 text-center font-bold">
                      माध्यम
                    </th>
                    <th className="border border-slate-700 px-2 py-1 text-right font-bold">
                      रकम
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.paymentHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="border border-slate-300 px-2 py-2 text-center text-slate-500 font-semibold"
                      >
                        यस अवधिमा कुनै भुक्तानी रेकर्ड छैन (No payments recorded)
                      </td>
                    </tr>
                  ) : (
                    summary.paymentHistory.map((p, idx) => (
                      <tr key={p.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="border border-slate-300 px-1.5 py-1 text-center font-bold text-slate-600">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 px-2 py-1">
                          <div className="font-bold text-slate-900">
                            {p.dualDate.bsDisplayShort} BS
                          </div>
                          <div className="text-[10px] text-slate-500">{p.dualDate.adDisplay}</div>
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-slate-700">
                          <div className="font-semibold">{p.receiptNumber}</div>
                          {(p.transactionRef || p.note) && (
                            <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                              {p.transactionRef || p.note}
                            </div>
                          )}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-center font-bold text-slate-800">
                          {p.methodLabel}
                          {p.paymentType === 'advance' && (
                            <span className="block text-[9px] text-blue-700">Advance</span>
                          )}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-right font-black text-emerald-800">
                          रु {p.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature Footer */}
          <div className="border-t border-dashed border-slate-400 pt-2 flex items-end justify-between gap-2 text-[10px] text-slate-600">
            <span>GAULE DOODH — आधिकारिक दुध हिसाब बिल</span>
            <span className="font-bold text-slate-900">
              हस्ताक्षर ({brand.proprietorName || 'GAULE DOODH'}): ___________
            </span>
          </div>
        </div>
      </div>

      {/* Export / Print / Download / WhatsApp Action Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => {
            playTapSound();
            generateGauleDoodhBillPDF(summary, brand);
            onToast?.('GAULE DOODH A4 PDF डाउनलोड भयो!');
          }}
          className="py-2.5 px-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>A4 PDF</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playTapSound();
            printGauleDoodhBill(summary, brand);
          }}
          className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playTapSound();
            downloadGauleDoodhBillImage(summary, brand);
            onToast?.('GAULE DOODH बिल फोटो (PNG) डाउनलोड भयो!');
          }}
          className="py-2.5 px-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playTapSound();
            const text = generateGauleDoodhWhatsAppText(summary, brand, { isFinalEndBill });
            openWhatsAppShare(summary.customer.mobile, text);
          }}
          className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>WhatsApp</span>
        </button>
      </div>

      {extraActionSlot}
    </div>
  );
};
