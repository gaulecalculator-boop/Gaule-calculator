/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MILK & SHOP EXPORT UTILITIES:
 * 1. Traditional Printed GAULE DOODH A4 PDF, Print, and Download (Image/PNG)
 * 2. Thermal Receipt Printing (58mm/80mm via iframe — zero window.open)
 * 3. Excel/CSV Exporter (Daily Milk Records & Monthly Statements)
 * 4. 1-Click WhatsApp Reminder Templates
 */

import { jsPDF } from 'jspdf';
import { MilkCustomer, MonthlyMilkBill, DailyMilkRecord, MilkPayment } from '../types/milkManagement';
import { dairyBranding, DairyBrandingProfile } from './dairyBranding';
import {
  buildGauleDoodhBillSummary,
  GauleDoodhBillSummary,
  resolveGauleDoodhBrand,
} from './gauleDoodhBillEngine';
import {
  openExternalUrl,
  downloadDataUrlFile,
  downloadTextFile,
  saveJsPdfDocument,
  printHtmlDocument,
} from './androidBridge';

// ---------------------------------------------------------------------------
// 1. GAULE DOODH TRADITIONAL PRINTED A4 BILL CANVAS + PDF + DOWNLOAD + PRINT
// ---------------------------------------------------------------------------

const PAGE_W = 1240; // ~150 DPI A4 width (210mm)
const PAGE_H = 1754; // ~150 DPI A4 height (297mm)
const FONT_FAMILY =
  '"Noto Sans Devanagari", "Mukta", "Kalimati", "Mangal", "Segoe UI", system-ui, -apple-system, sans-serif';

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 3 && ctx.measureText(clipped + '…').width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return clipped + '…';
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function createA4BlankCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d')!;
  // Crisp warm dairy paper background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  // Outer traditional double-line dairy ledger border
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  ctx.strokeRect(42, 42, PAGE_W - 84, PAGE_H - 84);
  ctx.lineWidth = 1;
  ctx.strokeRect(50, 50, PAGE_W - 100, PAGE_H - 100);

  return { canvas, ctx };
}

export function renderGauleDoodhBillToCanvases(
  summary: GauleDoodhBillSummary,
  customProfile?: DairyBrandingProfile
): HTMLCanvasElement[] {
  const brand = resolveGauleDoodhBrand(customProfile);
  const pages: HTMLCanvasElement[] = [];

  const { canvas: firstCanvas, ctx } = createA4BlankCanvas();
  pages.push(firstCanvas);

  const marginX = 76;
  const contentW = PAGE_W - marginX * 2;
  let y = 82;

  // --- MASTHEAD (GAULE DOODH TRADITIONAL DAIRY HEADER) ---
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.font = `900 38px ${FONT_FAMILY}`;
  ctx.fillText('गौले दूध  •  GAULE DOODH', PAGE_W / 2, y + 30);
  y += 44;

  const customSubName =
    brand.dairyName && !brand.dairyName.toUpperCase().includes('GAULE')
      ? brand.dairyName
      : '';
  if (customSubName) {
    ctx.font = `700 20px ${FONT_FAMILY}`;
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText(fitText(ctx, customSubName, contentW - 40), PAGE_W / 2, y + 18);
    y += 28;
  }

  const contactParts = [
    brand.address ? `ठेगाना: ${brand.address}` : '',
    brand.mobile ? `सम्पर्क: ${brand.mobile}` : '',
    brand.proprietorName ? `प्रो.: ${brand.proprietorName}` : '',
    brand.panVatNumber ? `PAN: ${brand.panVatNumber}` : '',
  ].filter(Boolean);

  if (contactParts.length > 0) {
    ctx.font = `600 17px ${FONT_FAMILY}`;
    ctx.fillStyle = '#475569';
    ctx.fillText(fitText(ctx, contactParts.join('  |  '), contentW - 20), PAGE_W / 2, y + 16);
    y += 26;
  }

  if (brand.slogan) {
    ctx.font = `italic 600 15px ${FONT_FAMILY}`;
    ctx.fillStyle = '#64748b';
    ctx.fillText(`"${brand.slogan}"`, PAGE_W / 2, y + 14);
    y += 22;
  }

  // Title banner bar
  y += 8;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(marginX, y, contentW, 42);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 20px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText(summary.billTitle.toUpperCase(), PAGE_W / 2, y + 28);
  y += 58;

  // --- CUSTOMER & BILLING PERIOD TWO-COLUMN LEDGER BOX ---
  const infoBoxH = 148;
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, marginX, y, contentW, infoBoxH, 8);
  ctx.fill();
  ctx.stroke();

  // Vertical divider inside info box
  const midX = marginX + contentW * 0.52;
  ctx.beginPath();
  ctx.moveTo(midX, y + 12);
  ctx.lineTo(midX, y + infoBoxH - 12);
  ctx.strokeStyle = '#cbd5e1';
  ctx.stroke();

  ctx.textAlign = 'left';
  const leftPad = marginX + 18;
  const rightPad = midX + 20;
  const leftValMax = midX - leftPad - 16;
  const rightValMax = marginX + contentW - rightPad - 16;

  // Left: Customer details
  let ly = y + 30;
  ctx.font = `700 15px ${FONT_FAMILY}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText('ग्राहक विवरण (CUSTOMER DETAILS)', leftPad, ly);
  ly += 26;

  ctx.font = `800 21px ${FONT_FAMILY}`;
  ctx.fillStyle = '#0f172a';
  ctx.fillText(fitText(ctx, summary.customer.name, leftValMax), leftPad, ly);
  ly += 24;

  ctx.font = `600 16px ${FONT_FAMILY}`;
  ctx.fillStyle = '#334155';
  ctx.fillText(
    fitText(ctx, `सम्पर्क (Mobile): ${summary.customer.mobile || 'उल्लेख नभएको'}`, leftValMax),
    leftPad,
    ly
  );
  ly += 23;
  ctx.fillText(
    fitText(ctx, `ठेगाना (Address): ${summary.customer.address || 'स्थानीय'}`, leftValMax),
    leftPad,
    ly
  );
  ly += 23;
  ctx.font = `600 14px ${FONT_FAMILY}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Customer ID: ${summary.customer.id}`, leftPad, ly);

  // Right: Bill No + BS Primary / AD Secondary Dates
  let ry = y + 30;
  ctx.font = `700 15px ${FONT_FAMILY}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText(`बिल नं (Bill No): ${summary.billNumber}`, rightPad, ry);
  ry += 26;

  ctx.font = `700 17px ${FONT_FAMILY}`;
  ctx.fillStyle = '#0f172a';
  ctx.fillText(
    fitText(
      ctx,
      `सुरु (From): ${summary.startDate.bsDisplayShort} BS (${summary.startDate.adDisplay})`,
      rightValMax
    ),
    rightPad,
    ry
  );
  ry += 25;

  ctx.fillText(
    fitText(
      ctx,
      `अन्तिम (To): ${summary.endDate.bsDisplayShort} BS (${summary.endDate.adDisplay})`,
      rightValMax
    ),
    rightPad,
    ry
  );
  ry += 25;

  ctx.font = `600 15px ${FONT_FAMILY}`;
  ctx.fillStyle = '#475569';
  ctx.fillText(
    fitText(
      ctx,
      `जारी मिति (Issued): ${summary.generatedDate.bsDisplayShort} BS (${summary.generatedDate.adDisplay})`,
      rightValMax
    ),
    rightPad,
    ry
  );

  y += infoBoxH + 22;

  // --- DAY SUMMARY STRIP (3 TRADITIONAL BOXES) ---
  const cardGap = 14;
  const cardW = (contentW - cardGap * 2) / 3;
  const cardH = 74;
  const dayCards = [
    {
      label: 'कुल दिन (Calendar Days)',
      value: `${summary.totalCalendarDays} दिन`,
      bg: '#f1f5f9',
      border: '#94a3b8',
      color: '#0f172a',
    },
    {
      label: 'दुध आपूर्ति दिन (Supply Days)',
      value: `${summary.totalMilkSupplyDays} दिन`,
      bg: '#ecfdf5',
      border: '#6ee7b7',
      color: '#065f46',
    },
    {
      label: 'दुध नभएको दिन (Loss Days)',
      value: `${summary.totalLossDays} दिन`,
      bg: '#fff1f2',
      border: '#fda4af',
      color: '#9f1239',
    },
  ];

  dayCards.forEach((dc, idx) => {
    const cx = marginX + idx * (cardW + cardGap);
    ctx.fillStyle = dc.bg;
    ctx.strokeStyle = dc.border;
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, cx, y, cardW, cardH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = `700 15px ${FONT_FAMILY}`;
    ctx.fillStyle = '#475569';
    ctx.fillText(dc.label, cx + cardW / 2, y + 26);

    ctx.font = `900 25px ${FONT_FAMILY}`;
    ctx.fillStyle = dc.color;
    ctx.fillText(dc.value, cx + cardW / 2, y + 57);
  });

  y += cardH + (summary.excludedNonSupplyDays > 0 ? 22 : 16);
  if (summary.excludedNonSupplyDays > 0) {
    ctx.textAlign = 'left';
    ctx.font = `600 14px ${FONT_FAMILY}`;
    ctx.fillStyle = '#64748b';
    ctx.fillText(
      `* नोट: ग्राहक निष्क्रिय / बिदा / तालिका नपरेका ${summary.excludedNonSupplyDays} दिनलाई Loss Days मा गनिएको छैन।`,
      marginX,
      y
    );
    y += 18;
  }

  // --- SECTION 1: PERIOD MILK QUANTITY, RATE & AMOUNT SUMMARY TABLE (NO DAILY TABLE) ---
  ctx.textAlign = 'left';
  ctx.font = `800 18px ${FONT_FAMILY}`;
  ctx.fillStyle = '#0f172a';
  ctx.fillText('१. अवधिगत दुध तथा रकम विवरण (PERIOD MILK & BILL SUMMARY)', marginX, y + 18);
  y += 28;

  const drawTableHeader = (
    targetCtx: CanvasRenderingContext2D,
    startY: number,
    cols: Array<{ label: string; width: number; align?: CanvasTextAlign }>
  ) => {
    targetCtx.fillStyle = '#1e293b';
    targetCtx.fillRect(marginX, startY, contentW, 38);
    targetCtx.fillStyle = '#ffffff';
    targetCtx.font = `800 15px ${FONT_FAMILY}`;
    let cx = marginX;
    cols.forEach((col) => {
      const align = col.align || 'left';
      targetCtx.textAlign = align;
      const tx = align === 'right' ? cx + col.width - 14 : align === 'center' ? cx + col.width / 2 : cx + 14;
      targetCtx.fillText(col.label, tx, startY + 25);
      cx += col.width;
    });
    return startY + 38;
  };

  const drawTableRow = (
    targetCtx: CanvasRenderingContext2D,
    startY: number,
    height: number,
    cols: Array<{ text: string; width: number; align?: CanvasTextAlign; bold?: boolean; color?: string }>,
    shaded = false
  ) => {
    targetCtx.fillStyle = shaded ? '#f8fafc' : '#ffffff';
    targetCtx.fillRect(marginX, startY, contentW, height);
    targetCtx.strokeStyle = '#cbd5e1';
    targetCtx.lineWidth = 1;
    targetCtx.strokeRect(marginX, startY, contentW, height);

    let cx = marginX;
    cols.forEach((col, i) => {
      if (i > 0) {
        targetCtx.beginPath();
        targetCtx.moveTo(cx, startY);
        targetCtx.lineTo(cx, startY + height);
        targetCtx.stroke();
      }
      const align = col.align || 'left';
      targetCtx.textAlign = align;
      targetCtx.font = `${col.bold ? '800' : '600'} 16px ${FONT_FAMILY}`;
      targetCtx.fillStyle = col.color || '#0f172a';
      const tx = align === 'right' ? cx + col.width - 14 : align === 'center' ? cx + col.width / 2 : cx + 14;
      targetCtx.fillText(fitText(targetCtx, col.text, col.width - 24), tx, startY + height / 2 + 6);
      cx += col.width;
    });
    return startY + height;
  };

  const summaryCols = [
    { label: 'विवरण (Particulars)', width: contentW * 0.44, align: 'left' as CanvasTextAlign },
    { label: 'परिमाण (Quantity L & ml)', width: contentW * 0.24, align: 'right' as CanvasTextAlign },
    { label: 'दर (Rate/L)', width: contentW * 0.14, align: 'right' as CanvasTextAlign },
    { label: 'रकम (Amount)', width: contentW * 0.18, align: 'right' as CanvasTextAlign },
  ];

  y = drawTableHeader(ctx, y, summaryCols);

  if (summary.rateBreakdown.length <= 1) {
    const rateVal = summary.rateBreakdown[0]?.ratePerLtr ?? summary.primaryRatePerLtr;
    y = drawTableRow(
      ctx,
      y,
      44,
      [
        {
          text: `कुल दुध आपूर्ति (${summary.totalMilkSupplyDays} दिन • बिहान ${summary.morningMilk.labelEn} + बेलुका ${summary.eveningMilk.labelEn})`,
          width: summaryCols[0].width,
          bold: true,
        },
        { text: summary.totalMilk.labelEn, width: summaryCols[1].width, align: 'right', bold: true },
        { text: `रु ${rateVal}`, width: summaryCols[2].width, align: 'right' },
        {
          text: `रु ${summary.totalMilkAmount.toLocaleString()}`,
          width: summaryCols[3].width,
          align: 'right',
          bold: true,
        },
      ],
      false
    );
  } else {
    summary.rateBreakdown.forEach((rb, idx) => {
      y = drawTableRow(
        ctx,
        y,
        40,
        [
          {
            text: `दुध आपूर्ति${rb.shiftLabel ? ` (${rb.shiftLabel})` : ''} @ रु ${rb.ratePerLtr}/लिटर`,
            width: summaryCols[0].width,
          },
          { text: rb.litersAndMl.labelEn, width: summaryCols[1].width, align: 'right', bold: true },
          { text: `रु ${rb.ratePerLtr}`, width: summaryCols[2].width, align: 'right' },
          { text: `रु ${rb.amount.toLocaleString()}`, width: summaryCols[3].width, align: 'right', bold: true },
        ],
        idx % 2 === 1
      );
    });
    y = drawTableRow(
      ctx,
      y,
      42,
      [
        {
          text: `जम्मा दुध (${summary.totalMilkSupplyDays} दिन: बिहान ${summary.morningMilk.labelEn} + बेलुका ${summary.eveningMilk.labelEn})`,
          width: summaryCols[0].width,
          bold: true,
        },
        { text: summary.totalMilk.labelEn, width: summaryCols[1].width, align: 'right', bold: true, color: '#1e3a8a' },
        { text: 'Multi', width: summaryCols[2].width, align: 'right' },
        {
          text: `रु ${summary.totalMilkAmount.toLocaleString()}`,
          width: summaryCols[3].width,
          align: 'right',
          bold: true,
          color: '#1e3a8a',
        },
      ],
      true
    );
  }

  y += 22;

  // --- SECTION 2: FINANCIAL BALANCE SUMMARY BOX ---
  ctx.textAlign = 'left';
  ctx.font = `800 18px ${FONT_FAMILY}`;
  ctx.fillStyle = '#0f172a';
  ctx.fillText('२. हिसाब र बाँकी विवरण (FINANCIAL ACCOUNT SUMMARY)', marginX, y + 18);
  y += 28;

  const ledgerRows: Array<{ label: string; value: string; bold?: boolean; color?: string; bg?: string }> = [
    {
      label: 'कुल दुध रकम (Total Milk Amount)',
      value: `रु ${summary.totalMilkAmount.toLocaleString()}`,
    },
    {
      label: 'अघिल्लो बाँकी बक्यौता (Previous Outstanding Balance)',
      value: `रु ${summary.previousOutstandingBalance.toLocaleString()}`,
    },
  ];

  if (summary.priorAdvanceCreditApplied > 0) {
    ledgerRows.push({
      label: 'अघिल्लो एडभान्स समायोजन (Prior Advance Adjustment)',
      value: `- रु ${summary.priorAdvanceCreditApplied.toLocaleString()}`,
      color: '#047857',
    });
  }

  ledgerRows.push({
    label: `कुल भुक्तानी प्राप्त (Total Amount Paid — ${summary.paymentHistory.length} पटक)`,
    value: `- रु ${summary.totalAmountPaid.toLocaleString()}`,
    color: '#047857',
  });

  if (summary.advancePaymentsInPeriod > 0 || summary.advanceCreditRemaining > 0) {
    ledgerRows.push({
      label: 'एडभान्स विवरण (Advance Payments / Carry Credit)',
      value: `पेश्की: रु ${summary.advancePaymentsInPeriod.toLocaleString()} | बाँकी क्रेडिट: रु ${summary.advanceCreditRemaining.toLocaleString()}`,
      color: '#1d4ed8',
    });
  }

  ledgerRows.push({
    label:
      summary.advanceCreditRemaining > 0
        ? 'अन्तिम एडभान्स जम्मा (SURPLUS ADVANCE CREDIT)'
        : 'अन्तिम तिर्न बाँकी रकम (FINAL REMAINING DUE)',
    value:
      summary.advanceCreditRemaining > 0
        ? `रु ${summary.advanceCreditRemaining.toLocaleString()}`
        : `रु ${summary.finalRemainingDue.toLocaleString()}`,
    bold: true,
    color: summary.finalRemainingDue > 0 ? '#b91c1c' : '#047857',
    bg: summary.finalRemainingDue > 0 ? '#fef2f2' : '#ecfdf5',
  });

  ledgerRows.forEach((lr) => {
    const rh = lr.bold ? 48 : 38;
    ctx.fillStyle = lr.bg || '#ffffff';
    ctx.fillRect(marginX, y, contentW, rh);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = lr.bold ? 1.8 : 1;
    ctx.strokeRect(marginX, y, contentW, rh);

    ctx.textAlign = 'left';
    ctx.font = `${lr.bold ? '900' : '600'} ${lr.bold ? 18 : 16}px ${FONT_FAMILY}`;
    ctx.fillStyle = lr.color || '#1e293b';
    ctx.fillText(lr.label, marginX + 16, y + rh / 2 + 6);

    ctx.textAlign = 'right';
    ctx.font = `${lr.bold ? '900' : '700'} ${lr.bold ? 22 : 16}px ${FONT_FAMILY}`;
    ctx.fillText(lr.value, marginX + contentW - 16, y + rh / 2 + 6);
    y += rh;
  });

  y += 26;

  // --- SECTION 3: COMPLETE PAYMENT HISTORY (WITH PAGINATION IF NEEDED) ---
  let activeCanvasCtx = ctx;

  const drawPaymentSectionHeading = (targetCtx: CanvasRenderingContext2D, startY: number, continued = false) => {
    targetCtx.textAlign = 'left';
    targetCtx.font = `800 18px ${FONT_FAMILY}`;
    targetCtx.fillStyle = '#0f172a';
    targetCtx.fillText(
      continued
        ? '३. भुक्तानी इतिहास — क्रमशः (PAYMENT HISTORY CONT.)'
        : `३. सम्पूर्ण भुक्तानी इतिहास (COMPLETE PAYMENT HISTORY — ${summary.paymentHistory.length})`,
      marginX,
      startY + 18
    );
    return startY + 28;
  };

  const payCols = [
    { label: 'क्र.सं.', width: contentW * 0.08, align: 'center' as CanvasTextAlign },
    { label: 'भुक्तानी मिति (BS / AD)', width: contentW * 0.34, align: 'left' as CanvasTextAlign },
    { label: 'रसिद नं / विवरण', width: contentW * 0.24, align: 'left' as CanvasTextAlign },
    { label: 'माध्यम (Method)', width: contentW * 0.16, align: 'center' as CanvasTextAlign },
    { label: 'रकम (Amount)', width: contentW * 0.18, align: 'right' as CanvasTextAlign },
  ];

  y = drawPaymentSectionHeading(activeCanvasCtx, y, false);
  y = drawTableHeader(activeCanvasCtx, y, payCols);

  if (summary.paymentHistory.length === 0) {
    y = drawTableRow(
      activeCanvasCtx,
      y,
      44,
      [
        { text: '-', width: payCols[0].width, align: 'center' },
        { text: 'यस अवधिमा कुनै भुक्तानी रेकर्ड छैन (No payments recorded)', width: payCols[1].width + payCols[2].width + payCols[3].width, color: '#64748b' },
        { text: 'रु 0', width: payCols[4].width, align: 'right', bold: true },
      ],
      false
    );
  } else {
    summary.paymentHistory.forEach((p, idx) => {
      if (y + 42 > PAGE_H - 160) {
        const nextPage = createA4BlankCanvas();
        pages.push(nextPage.canvas);
        activeCanvasCtx = nextPage.ctx;
        y = 90;
        y = drawPaymentSectionHeading(activeCanvasCtx, y, true);
        y = drawTableHeader(activeCanvasCtx, y, payCols);
      }
      const dateStr = `${p.dualDate.bsDisplayShort} BS (${p.dualDate.adDisplay})`;
      const refStr = `${p.receiptNumber}${p.transactionRef ? ` • ${p.transactionRef}` : ''}`;
      y = drawTableRow(
        activeCanvasCtx,
        y,
        38,
        [
          { text: String(idx + 1), width: payCols[0].width, align: 'center' },
          { text: dateStr, width: payCols[1].width },
          { text: refStr, width: payCols[2].width },
          { text: p.methodLabel, width: payCols[3].width, align: 'center', bold: true },
          { text: `रु ${p.amount.toLocaleString()}`, width: payCols[4].width, align: 'right', bold: true, color: '#047857' },
        ],
        idx % 2 === 1
      );
    });
  }

  // --- FOOTER SIGNATURE & STAMP ---
  const footerY = Math.max(y + 40, PAGE_H - 135);
  if (footerY > PAGE_H - 95) {
    const lastPage = createA4BlankCanvas();
    pages.push(lastPage.canvas);
    activeCanvasCtx = lastPage.ctx;
  }
  const fY = PAGE_H - 125;
  activeCanvasCtx.strokeStyle = '#94a3b8';
  activeCanvasCtx.lineWidth = 1;
  activeCanvasCtx.beginPath();
  activeCanvasCtx.moveTo(marginX, fY - 14);
  activeCanvasCtx.lineTo(marginX + contentW, fY - 14);
  activeCanvasCtx.stroke();

  activeCanvasCtx.textAlign = 'left';
  activeCanvasCtx.font = `italic 600 14px ${FONT_FAMILY}`;
  activeCanvasCtx.fillStyle = '#475569';
  activeCanvasCtx.fillText(
    'नोट: यो आधिकारिक GAULE DOODH दुध हिसाब बिल हो। कृपया हिसाब समयमै चुक्ता गरिदिनुहोला।',
    marginX,
    fY + 14
  );

  activeCanvasCtx.textAlign = 'right';
  activeCanvasCtx.font = `700 16px ${FONT_FAMILY}`;
  activeCanvasCtx.fillStyle = '#0f172a';
  activeCanvasCtx.fillText(
    `हस्ताक्षर (${brand.proprietorName || 'GAULE DOODH'}): _____________________`,
    marginX + contentW,
    fY + 46
  );

  return pages;
}

export function generateGauleDoodhBillPDF(
  summary: GauleDoodhBillSummary,
  customProfile?: DairyBrandingProfile
) {
  const brand = resolveGauleDoodhBrand(customProfile);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  if (typeof document !== 'undefined') {
    const canvases = renderGauleDoodhBillToCanvases(summary, brand);
    canvases.forEach((canvas, idx) => {
      if (idx > 0) doc.addPage('a4', 'portrait');
      const imgData = canvas.toDataURL('image/png', 1.0);
      doc.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    });
  } else {
    // Headless Node fallback
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('GAULE DOODH - MILK SUPPLY BILL', 105, 20, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Customer: ${summary.customer.name} (${summary.customer.mobile})`, 14, 34);
    doc.text(`Period (BS / AD): ${summary.startDate.bsNumeric} (${summary.startDate.adDisplay}) to ${summary.endDate.bsNumeric} (${summary.endDate.adDisplay})`, 14, 42);
    doc.text(`Total Calendar Days: ${summary.totalCalendarDays} | Supply Days: ${summary.totalMilkSupplyDays} | Loss Days: ${summary.totalLossDays}`, 14, 50);
    doc.text(`Total Milk: ${summary.totalMilk.labelEn} | Rate: Rs ${summary.primaryRatePerLtr}/L | Amount: Rs ${summary.totalMilkAmount}`, 14, 58);
    doc.text(`Previous Balance: Rs ${summary.previousOutstandingBalance} | Paid: Rs ${summary.totalAmountPaid} | Final Due: Rs ${summary.finalRemainingDue}`, 14, 66);
  }

  const safeCust = summary.customer.name.replace(/[^\p{L}\p{N}_-]+/gu, '_');
  const filename = `GAULE_DOODH_Bill_${safeCust}_${summary.startDate.bsNumeric}_to_${summary.endDate.bsNumeric}.pdf`;
  saveJsPdfDocument(doc, filename);
}

export function downloadGauleDoodhBillImage(
  summary: GauleDoodhBillSummary,
  customProfile?: DairyBrandingProfile
) {
  if (typeof document === 'undefined') return;
  const brand = resolveGauleDoodhBrand(customProfile);
  const canvases = renderGauleDoodhBillToCanvases(summary, brand);

  let exportCanvas = canvases[0];
  if (canvases.length > 1) {
    const stacked = document.createElement('canvas');
    stacked.width = PAGE_W;
    stacked.height = PAGE_H * canvases.length;
    const sCtx = stacked.getContext('2d')!;
    sCtx.fillStyle = '#ffffff';
    sCtx.fillRect(0, 0, stacked.width, stacked.height);
    canvases.forEach((c, idx) => sCtx.drawImage(c, 0, idx * PAGE_H));
    exportCanvas = stacked;
  }

  const safeCust = summary.customer.name.replace(/[^\p{L}\p{N}_-]+/gu, '_');
  const url = exportCanvas.toDataURL('image/png', 1.0);
  const filename = `GAULE_DOODH_Bill_${safeCust}_${summary.startDate.bsNumeric}_to_${summary.endDate.bsNumeric}.png`;
  downloadDataUrlFile(url, filename);
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildGauleDoodhBillPrintHTML(
  summary: GauleDoodhBillSummary,
  customProfile?: DairyBrandingProfile
): string {
  const brand = resolveGauleDoodhBrand(customProfile);
  const customSubName =
    brand.dairyName && !brand.dairyName.toUpperCase().includes('GAULE')
      ? brand.dairyName
      : '';

  const rateRowsHtml =
    summary.rateBreakdown.length <= 1
      ? `<tr>
          <td>
            <strong>कुल दुध आपूर्ति (${summary.totalMilkSupplyDays} दिन)</strong><br/>
            <span class="sub">बिहान: ${escapeHtml(summary.morningMilk.labelEn)} (${summary.morningSupplyDays} दिन) • बेलुका: ${escapeHtml(summary.eveningMilk.labelEn)} (${summary.eveningSupplyDays} दिन)</span>
          </td>
          <td class="num">${escapeHtml(summary.totalMilk.labelEn)}<br/><span class="sub">${escapeHtml(summary.totalMilk.labelNe)}</span></td>
          <td class="num">रु ${summary.rateBreakdown[0]?.ratePerLtr ?? summary.primaryRatePerLtr}/L</td>
          <td class="num"><strong>रु ${summary.totalMilkAmount.toLocaleString()}</strong></td>
        </tr>`
      : summary.rateBreakdown
          .map(
            (rb) => `<tr>
            <td>दुध आपूर्ति${rb.shiftLabel ? ` (${escapeHtml(rb.shiftLabel)})` : ''} @ रु ${rb.ratePerLtr}/L</td>
            <td class="num">${escapeHtml(rb.litersAndMl.labelEn)}</td>
            <td class="num">रु ${rb.ratePerLtr}/L</td>
            <td class="num">रु ${rb.amount.toLocaleString()}</td>
          </tr>`
          )
          .join('') +
        `<tr class="total-sub">
          <td><strong>जम्मा दुध (${summary.totalMilkSupplyDays} दिन • बिहान ${escapeHtml(summary.morningMilk.labelEn)} + बेलुका ${escapeHtml(summary.eveningMilk.labelEn)})</strong></td>
          <td class="num"><strong>${escapeHtml(summary.totalMilk.labelEn)}</strong></td>
          <td class="num">Multi</td>
          <td class="num"><strong>रु ${summary.totalMilkAmount.toLocaleString()}</strong></td>
        </tr>`;

  const paymentsRowsHtml =
    summary.paymentHistory.length === 0
      ? `<tr><td colspan="5" style="text-align:center;color:#64748b;">यस अवधिमा कुनै भुक्तानी रेकर्ड छैन (No payments recorded)</td></tr>`
      : summary.paymentHistory
          .map(
            (p, idx) => `<tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td><strong>${escapeHtml(p.dualDate.bsDisplayShort)} BS</strong> <span class="sub">(${escapeHtml(p.dualDate.adDisplay)})</span></td>
            <td>${escapeHtml(p.receiptNumber)}${p.transactionRef ? ` • ${escapeHtml(p.transactionRef)}` : ''}</td>
            <td style="text-align:center;">${escapeHtml(p.methodLabel)}</td>
            <td class="num"><strong>रु ${p.amount.toLocaleString()}</strong></td>
          </tr>`
          )
          .join('');

  return `<!DOCTYPE html>
<html lang="ne">
<head>
  <meta charset="utf-8" />
  <title>GAULE DOODH Bill - ${escapeHtml(summary.customer.name)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Noto Sans Devanagari", "Mukta", "Segoe UI", system-ui, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 0;
      font-size: 12px;
      line-height: 1.4;
      background: #fff;
    }
    .sheet {
      border: 2px solid #0f172a;
      outline: 1px solid #0f172a;
      outline-offset: -6px;
      padding: 18px 20px;
    }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }
    .brand { font-size: 24px; font-weight: 900; letter-spacing: 0.04em; color: #0f172a; }
    .subbrand { font-size: 13px; font-weight: 700; color: #1e3a8a; margin-top: 2px; }
    .meta { font-size: 11px; color: #475569; margin-top: 3px; }
    .banner { background: #0f172a; color: #fff; text-align: center; font-weight: 800; padding: 6px; font-size: 13px; margin-bottom: 12px; letter-spacing: 0.03em; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border: 1px solid #94a3b8; background: #f8fafc; padding: 10px 12px; margin-bottom: 12px; }
    .info-grid p { margin: 2px 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px; text-align: center; }
    .stat-box { border: 1px solid #94a3b8; padding: 8px; }
    .stat-box .lbl { font-size: 10px; color: #475569; font-weight: 700; display: block; }
    .stat-box .val { font-size: 16px; font-weight: 900; }
    h4 { margin: 12px 0 6px; font-size: 12px; font-weight: 800; text-transform: uppercase; border-left: 3px solid #0f172a; padding-left: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-variant-numeric: tabular-nums; }
    th { background: #1e293b; color: #fff; text-align: left; padding: 6px 8px; font-size: 11px; border: 1px solid #1e293b; }
    td { padding: 6px 8px; border: 1px solid #cbd5e1; vertical-align: middle; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .sub { font-size: 10px; color: #475569; }
    .total-sub { background: #f1f5f9; }
    .due-row { background: ${summary.finalRemainingDue > 0 ? '#fef2f2' : '#ecfdf5'}; font-size: 14px; font-weight: 900; color: ${summary.finalRemainingDue > 0 ? '#991b1b' : '#065f46'}; }
    .footer { margin-top: 22px; border-top: 1px dashed #64748b; padding-top: 10px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand">गौले दूध • GAULE DOODH</div>
      ${customSubName ? `<div class="subbrand">${escapeHtml(customSubName)}</div>` : ''}
      <div class="meta">
        ${[
          brand.address ? `ठेगाना: ${escapeHtml(brand.address)}` : '',
          brand.mobile ? `सम्पर्क: ${escapeHtml(brand.mobile)}` : '',
          brand.proprietorName ? `प्रो.: ${escapeHtml(brand.proprietorName)}` : '',
          brand.panVatNumber ? `PAN: ${escapeHtml(brand.panVatNumber)}` : '',
        ].filter(Boolean).join(' | ')}
      </div>
    </div>

    <div class="banner">${escapeHtml(summary.billTitle)}</div>

    <div class="info-grid">
      <div>
        <p style="font-size:10px;color:#64748b;font-weight:700;">ग्राहक विवरण (CUSTOMER)</p>
        <p style="font-size:14px;font-weight:900;">${escapeHtml(summary.customer.name)}</p>
        <p>सम्पर्क: <strong>${escapeHtml(summary.customer.mobile || 'उल्लेख नभएको')}</strong></p>
        <p>ठेगाना: ${escapeHtml(summary.customer.address || 'स्थानीय')}</p>
      </div>
      <div>
        <p style="font-size:10px;color:#64748b;font-weight:700;">बिल नं: ${escapeHtml(summary.billNumber)}</p>
        <p>सुरु (From): <strong>${escapeHtml(summary.startDate.bsDisplayShort)} BS</strong> <span class="sub">(${escapeHtml(summary.startDate.adDisplay)})</span></p>
        <p>अन्तिम (To): <strong>${escapeHtml(summary.endDate.bsDisplayShort)} BS</strong> <span class="sub">(${escapeHtml(summary.endDate.adDisplay)})</span></p>
        <p class="sub">जारी मिति: ${escapeHtml(summary.generatedDate.bsDisplayShort)} BS (${escapeHtml(summary.generatedDate.adDisplay)})</p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-box"><span class="lbl">जम्मा दिन (Calendar Days)</span><span class="val">${summary.totalCalendarDays} दिन</span></div>
      <div class="stat-box"><span class="lbl">दुध आपूर्ति दिन (Supply Days)</span><span class="val" style="color:#065f46;">${summary.totalMilkSupplyDays} दिन</span></div>
      <div class="stat-box"><span class="lbl">दुध नभएको दिन (Loss Days)</span><span class="val" style="color:#9f1239;">${summary.totalLossDays} दिन</span></div>
    </div>
    ${summary.excludedNonSupplyDays > 0 ? `<p class="sub" style="margin-top:-6px;margin-bottom:8px;">* नोट: बिदा / निष्क्रिय / तालिका नपरेका ${summary.excludedNonSupplyDays} दिन Loss Days मा समावेश गरिएको छैन।</p>` : ''}

    <h4>१. अवधिगत दुध तथा रकम विवरण (Milk Supply Summary)</h4>
    <table>
      <thead>
        <tr>
          <th>विवरण (Particulars)</th>
          <th class="num">परिमाण (Liters &amp; ml)</th>
          <th class="num">दर (Rate/L)</th>
          <th class="num">रकम (Amount)</th>
        </tr>
      </thead>
      <tbody>${rateRowsHtml}</tbody>
    </table>

    <h4>२. हिसाब तथा बाँकी विवरण (Account Balance Summary)</h4>
    <table>
      <tbody>
        <tr><td>कुल दुध रकम (Total Milk Amount)</td><td class="num"><strong>रु ${summary.totalMilkAmount.toLocaleString()}</strong></td></tr>
        <tr><td>अघिल्लो बाँकी बक्यौता (Previous Outstanding Balance)</td><td class="num"><strong>रु ${summary.previousOutstandingBalance.toLocaleString()}</strong></td></tr>
        ${summary.priorAdvanceCreditApplied > 0 ? `<tr><td>अघिल्लो एडभान्स समायोजन (Prior Advance Adjustment)</td><td class="num" style="color:#047857;"><strong>- रु ${summary.priorAdvanceCreditApplied.toLocaleString()}</strong></td></tr>` : ''}
        <tr><td>कुल भुक्तानी प्राप्त (Total Amount Paid)</td><td class="num" style="color:#047857;"><strong>- रु ${summary.totalAmountPaid.toLocaleString()}</strong></td></tr>
        ${summary.advancePaymentsInPeriod > 0 || summary.advanceCreditRemaining > 0 ? `<tr><td>एडभान्स समायोजन / क्रेडिट (Advance Adjustments)</td><td class="num" style="color:#1d4ed8;">पेश्की: रु ${summary.advancePaymentsInPeriod.toLocaleString()} | बाँकी क्रेडिट: रु ${summary.advanceCreditRemaining.toLocaleString()}</td></tr>` : ''}
        <tr class="due-row">
          <td>${summary.advanceCreditRemaining > 0 ? 'अन्तिम एडभान्स जम्मा (SURPLUS ADVANCE CREDIT)' : 'अन्तिम तिर्न बाँकी रकम (FINAL REMAINING DUE)'}</td>
          <td class="num">रु ${(summary.advanceCreditRemaining > 0 ? summary.advanceCreditRemaining : summary.finalRemainingDue).toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <h4>३. सम्पूर्ण भुक्तानी इतिहास (Complete Payment History — ${summary.paymentHistory.length})</h4>
    <table>
      <thead>
        <tr>
          <th style="text-align:center;">क्र.सं.</th>
          <th>भुक्तानी मिति (BS / AD)</th>
          <th>रसिद नं / विवरण</th>
          <th style="text-align:center;">माध्यम (Method)</th>
          <th class="num">रकम (Amount)</th>
        </tr>
      </thead>
      <tbody>${paymentsRowsHtml}</tbody>
    </table>

    <div class="footer">
      <div>धन्यवाद! यो आधिकारिक GAULE DOODH बिल हो।</div>
      <div style="font-weight:700;">अधिकृत हस्ताक्षर (${escapeHtml(brand.proprietorName || 'GAULE DOODH')}): _____________________</div>
    </div>
  </div>
</body>
</html>`;
}

function triggerHiddenIframePrint(html: string) {
  printHtmlDocument(html, 'Gaule Doodh Bill');
}

export function printGauleDoodhBill(
  summary: GauleDoodhBillSummary,
  customProfile?: DairyBrandingProfile
) {
  const html = buildGauleDoodhBillPrintHTML(summary, customProfile);
  triggerHiddenIframePrint(html);
}

/**
 * Generates an A4 Monthly Cycle PDF using the updated GAULE DOODH traditional printed bill format
 * (NO daily milk entries table).
 */
export function generateCustomerMonthlyBillPDF(
  customer: MilkCustomer,
  bill: MonthlyMilkBill,
  customProfile?: DairyBrandingProfile
) {
  const summary = buildGauleDoodhBillSummary(customer, bill.fromIso, bill.toIso, {
    billNumber: `GD-C${bill.cycleNumber}-${bill.fromBsDate.replace(/-/g, '').slice(2)}`,
    billTitle: `दुध बिल — चक्र #${bill.cycleNumber} (${bill.totalDays} दिन: ${bill.cycleName})`,
  });
  generateGauleDoodhBillPDF(summary, customProfile);
}

// ---------------------------------------------------------------------------
// 2. THERMAL RECEIPT PRINTING (58mm / 80mm ESC-POS via hidden iframe)
// ---------------------------------------------------------------------------

export function printThermalReceipt(
  customer: MilkCustomer,
  bill: MonthlyMilkBill,
  customProfile?: DairyBrandingProfile
) {
  const brand = resolveGauleDoodhBrand(customProfile);
  const summary = buildGauleDoodhBillSummary(customer, bill.fromIso, bill.toIso, {
    billNumber: `GD-C${bill.cycleNumber}`,
    billTitle: `दुध हिसाब रसिद (#${bill.cycleNumber} • ${bill.totalDays} दिन)`,
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>GAULE DOODH Receipt - ${escapeHtml(customer.name)}</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 54mm;
            margin: 2mm auto;
            padding: 0;
            font-size: 11px;
            line-height: 1.35;
            color: #000;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; gap: 4px; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 13px;">GAULE DOODH</div>
        ${brand.dairyName && !brand.dairyName.toUpperCase().includes('GAULE') ? `<div class="center" style="font-size: 10px;">${escapeHtml(brand.dairyName)}</div>` : ''}
        ${brand.address ? `<div class="center" style="font-size: 10px;">${escapeHtml(brand.address)}</div>` : ''}
        ${brand.mobile ? `<div class="center" style="font-size: 10px;">फोन: ${escapeHtml(brand.mobile)}</div>` : ''}
        <div class="center" style="font-size: 10px; margin-top: 2px;">मासिक दुध हिसाब रसिद</div>
        <div class="divider"></div>
        <div><b>ग्राहक:</b> ${escapeHtml(customer.name)}</div>
        <div><b>फोन:</b> ${escapeHtml(customer.mobile || '-')}</div>
        <div><b>सुरु (From):</b> ${escapeHtml(summary.startDate.bsDisplayShort)} BS (${escapeHtml(summary.startDate.adDisplay)})</div>
        <div><b>अन्तिम (To):</b> ${escapeHtml(summary.endDate.bsDisplayShort)} BS (${escapeHtml(summary.endDate.adDisplay)})</div>
        <div><b>दिन:</b> ${summary.totalCalendarDays} कुल • ${summary.totalMilkSupplyDays} आपूर्ति • ${summary.totalLossDays} Loss</div>
        <div class="divider"></div>
        <div class="row"><span>जम्मा दुध:</span><b>${escapeHtml(summary.totalMilk.labelEn)}</b></div>
        <div class="row"><span>दर (Rate):</span><b>रु ${summary.primaryRatePerLtr}/L</b></div>
        <div class="row"><span>अवधि रकम:</span><b>रु ${summary.totalMilkAmount.toLocaleString()}</b></div>
        <div class="row"><span>अघिल्लो बाँकी:</span><b>रु ${summary.previousOutstandingBalance.toLocaleString()}</b></div>
        <div class="row"><span>भुक्तानी प्राप्त:</span><b>रु ${summary.totalAmountPaid.toLocaleString()}</b></div>
        <div class="divider"></div>
        <div class="row bold" style="font-size: 12px;">
          <span>बाँकी रकम (DUE):</span>
          <span>रु ${summary.finalRemainingDue.toLocaleString()}</span>
        </div>
        <div class="divider"></div>
        <div class="center" style="font-size: 10px; margin-top: 5px;">
          भुक्तानी मिति: ${escapeHtml(bill.dueDateBS)}<br/>
          धन्यवाद! 🙏
        </div>
      </body>
    </html>
  `;

  triggerHiddenIframePrint(html);
}

// ---------------------------------------------------------------------------
// 3. EXCEL / CSV EXPORTER
// ---------------------------------------------------------------------------

export function exportMilkComprehensiveCSV(
  customers: MilkCustomer[],
  dailyRecords: DailyMilkRecord[],
  payments: MilkPayment[]
) {
  let csvContent = '\uFEFF';

  csvContent += '--- ग्राहक विवरण (CUSTOMERS LIST) ---\r\n';
  csvContent += 'Customer ID,Name,Mobile,Address,Start Date (BS),Morning Milk (L),Evening Milk (L),Milk Rate (Rs),Status\r\n';

  customers.forEach((c) => {
    const row = [
      `"${c.id}"`,
      `"${c.name}"`,
      `"${c.mobile || ''}"`,
      `"${c.address || ''}"`,
      `"${c.startBsDate}"`,
      c.morningMilk,
      c.eveningMilk,
      c.milkRate,
      `"${c.status}"`,
    ];
    csvContent += row.join(',') + '\r\n';
  });

  csvContent += '\r\n--- दैनिक दुध संकलन रेकर्ड (DAILY MILK RECORDS) ---\r\n';
  csvContent += 'Date (AD),Date (BS),Customer Name,Customer ID,Morning (L),Evening (L),Total Milk (L),Rate,Amount (Rs),Status\r\n';

  dailyRecords.forEach((d) => {
    const cust = customers.find((c) => c.id === d.customerId);
    const row = [
      `"${d.date}"`,
      `"${d.bsDate || ''}"`,
      `"${cust?.name || d.customerId}"`,
      `"${d.customerId}"`,
      d.isNoMilk ? 0 : d.morningMilk,
      d.isNoMilk ? 0 : d.eveningMilk,
      d.totalMilk,
      d.ratePerLtr,
      d.totalAmount,
      d.isNoMilk ? '"दूध गएन"' : '"सम्पन्न"',
    ];
    csvContent += row.join(',') + '\r\n';
  });

  csvContent += '\r\n--- भुक्तानी रेकर्ड (PAYMENTS & RECEIPTS) ---\r\n';
  csvContent += 'Receipt No,Date (AD),Date (BS),Customer Name,Amount (Rs),Payment Method,Notes\r\n';

  payments.forEach((p) => {
    const cust = customers.find((c) => c.id === p.customerId);
    const row = [
      `"${p.receiptNumber || p.id}"`,
      `"${p.date}"`,
      `"${p.bsDate || ''}"`,
      `"${cust?.name || p.customerId}"`,
      p.amount,
      `"${p.paymentMethod}"`,
      `"${(p.note || '').replace(/"/g, '""')}"`,
    ];
    csvContent += row.join(',') + '\r\n';
  });

  const filename = `MilkKhata_Export_${new Date().toISOString().split('T')[0]}.csv`;
  void downloadTextFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

// ---------------------------------------------------------------------------
// 4. ONE-CLICK WHATSAPP / SMS REMINDER
// ---------------------------------------------------------------------------

export function createDuePaymentReminderMessage(
  customer: MilkCustomer,
  dueAmount: number,
  pendingDays: number,
  dueDateBS?: string,
  dairyNameCustom?: string
): string {
  const dName = dairyNameCustom || dairyBranding.getProfile().dairyName;
  const brandTitle = dName.toUpperCase().includes('GAULE') ? dName : `GAULE DOODH — ${dName}`;
  return (
    `*नमस्ते ${customer.name} ज्यू,* 🙏\n\n` +
    `🏢 *${brandTitle}* बाट दुध हिसाब भुक्तानी सम्बन्धमा विनम्र अनुरोध:\n\n` +
    `🥛 *ग्राहक नाम:* ${customer.name}\n` +
    `📅 *बकाया अवधि:* ${pendingDays} दिनको हिसाब\n` +
    (dueDateBS ? `🗓 *भुक्तानी अन्तिम मिति:* ${dueDateBS}\n` : '') +
    `🔴 *कुल बाँकी रकम:* *रु. ${dueAmount.toLocaleString()}/-*\n\n` +
    `कृपया उक्त बाँकी रकम समयमै भुक्तानी गरी हिसाब चुक्ता गरिदिनुहुन हार्दिक अनुरोध गर्दछौं।\n\n` +
    `धन्यवाद! 🙏`
  );
}

export function sendWhatsAppReminder(
  customer: MilkCustomer,
  dueAmount: number,
  pendingDays: number,
  dueDateBS?: string,
  dairyNameCustom?: string
) {
  const msg = createDuePaymentReminderMessage(customer, dueAmount, pendingDays, dueDateBS, dairyNameCustom);
  const encoded = encodeURIComponent(msg);
  const phone = customer.mobile ? customer.mobile.replace(/[^0-9]/g, '') : '';
  const fullPhone = phone.length === 10 ? `977${phone}` : phone;
  const url = fullPhone ? `https://wa.me/${fullPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;

  openExternalUrl(url);
}
