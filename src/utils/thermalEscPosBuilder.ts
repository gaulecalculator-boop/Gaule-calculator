/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GAULE CALCULATOR — ESC/POS Thermal Printer Command Builder (58mm & 80mm)
 * Generates standard ESC/POS byte streams for Bluetooth SPP / USB thermal printers.
 */

import { DairyBrandingProfile } from './dairyBranding';
import { UniversalBill } from './universalReceiptEngine';
import { GauleDoodhBillSummary } from './gauleDoodhBillEngine';

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/**
 * Normalizes non-ASCII Devanagari digits & common currency symbols into printer-safe ASCII
 * so thermal printers without Unicode Devanagari ROM never output garbled bytes.
 */
function toPrinterSafeText(input: string): string {
  const devDigits: Record<string, string> = {
    '०': '0',
    '१': '1',
    '२': '2',
    '३': '3',
    '४': '4',
    '५': '5',
    '६': '6',
    '७': '7',
    '८': '8',
    '९': '9',
  };
  let out = String(input || '').replace(/[०-९]/g, (d) => devDigits[d] || d);
  out = out.replace(/रु\.?/g, 'Rs.');
  // Strip remaining non-printable / non-ASCII glyphs gracefully while keeping readable ASCII
  out = out.replace(/[^\x20-\x7E]/g, (ch) => (ch === '\n' ? '\n' : ''));
  return out.replace(/\s+/g, ' ').trim();
}

function padRow(left: string, right: string, width: number): string {
  const l = toPrinterSafeText(left);
  const r = toPrinterSafeText(right);
  if (l.length + r.length + 1 <= width) {
    return l + ' '.repeat(width - l.length - r.length) + r;
  }
  const maxLeft = Math.max(4, width - r.length - 1);
  return l.slice(0, maxLeft) + ' ' + r;
}

class EscPosEncoder {
  private bytes: number[] = [];

  public init(): this {
    this.bytes.push(ESC, 0x40); // ESC @ (Initialize printer)
    return this;
  }

  public align(mode: 'left' | 'center' | 'right'): this {
    const code = mode === 'center' ? 1 : mode === 'right' ? 2 : 0;
    this.bytes.push(ESC, 0x61, code);
    return this;
  }

  public bold(on: boolean): this {
    this.bytes.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  public textSize(doubleWidth: boolean, doubleHeight: boolean): this {
    const n = (doubleWidth ? 0x10 : 0) | (doubleHeight ? 0x01 : 0);
    this.bytes.push(GS, 0x21, n);
    return this;
  }

  public line(text: string): this {
    const safe = toPrinterSafeText(text);
    for (let i = 0; i < safe.length; i++) {
      this.bytes.push(safe.charCodeAt(i) & 0x7f);
    }
    this.bytes.push(LF);
    return this;
  }

  public rawAsciiLine(text: string): this {
    for (let i = 0; i < text.length; i++) {
      this.bytes.push(text.charCodeAt(i) & 0x7f);
    }
    this.bytes.push(LF);
    return this;
  }

  public divider(width: number): this {
    return this.rawAsciiLine('-'.repeat(width));
  }

  public feed(lines = 3): this {
    this.bytes.push(ESC, 0x64, Math.max(1, Math.min(10, lines)));
    return this;
  }

  public cut(): this {
    this.bytes.push(GS, 0x56, 0x42, 0x00); // GS V B 0 (Partial cut with feed)
    return this;
  }

  public build(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

export function buildUniversalReceiptEscPos(
  bill: UniversalBill,
  brand: DairyBrandingProfile,
  paperWidth: '58mm' | '80mm' = '58mm'
): Uint8Array {
  const cols = paperWidth === '80mm' ? 48 : 32;
  const enc = new EscPosEncoder();

  enc
    .init()
    .align('center')
    .bold(true)
    .textSize(false, true)
    .line('GAULE CALCULATOR')
    .textSize(false, false)
    .line(toPrinterSafeText(brand.dairyName) || 'MILK DAIRY & COLLECTION CENTER')
    .bold(false);

  if (brand.address) enc.line(brand.address);
  if (brand.mobile) enc.line(`Ph: ${brand.mobile}`);
  if (brand.panVatNumber) enc.line(`PAN/VAT: ${brand.panVatNumber}`);

  enc
    .divider(cols)
    .align('left')
    .rawAsciiLine(padRow(`Bill: #${bill.billNumber}`, bill.dateAD || '', cols))
    .line(`BS Date: ${bill.dateBS || ''}`)
    .line(`Customer: ${bill.customerName || 'Walk-in'}`);

  if (bill.customerMobile) enc.line(`Mobile: ${bill.customerMobile}`);

  enc
    .divider(cols)
    .bold(true)
    .rawAsciiLine(padRow('Item', 'Amount', cols))
    .bold(false);

  bill.items.forEach((it) => {
    const desc = toPrinterSafeText(it.description) || 'Item';
    const amt = `Rs.${(it.subtotal || 0).toLocaleString('en-US')}`;
    enc.rawAsciiLine(padRow(desc, amt, cols));
    if (it.quantity) {
      enc.line(`  Qty: ${it.quantity} ${it.unit || ''} @ ${it.rate || ''}`);
    }
  });

  enc
    .divider(cols)
    .rawAsciiLine(padRow('Subtotal:', `Rs.${bill.subtotal.toLocaleString('en-US')}`, cols));

  if (bill.discount > 0) {
    enc.rawAsciiLine(padRow('Discount:', `-Rs.${bill.discount.toLocaleString('en-US')}`, cols));
  }

  enc
    .bold(true)
    .rawAsciiLine(padRow('GRAND TOTAL:', `Rs.${bill.totalAmount.toLocaleString('en-US')}`, cols))
    .bold(false)
    .rawAsciiLine(padRow('Paid:', `Rs.${bill.paidAmount.toLocaleString('en-US')}`, cols))
    .bold(true)
    .rawAsciiLine(padRow('DUE BALANCE:', `Rs.${bill.remainingDue.toLocaleString('en-US')}`, cols))
    .bold(false)
    .rawAsciiLine(padRow('Status:', bill.paymentStatus, cols))
    .divider(cols)
    .align('center')
    .line('Smart Hisab, Easy Business')
    .line('Powered by GAULE CALCULATOR')
    .line('Thank you! Visit again.')
    .feed(4)
    .cut();

  return enc.build();
}

export function buildMilkBillEscPos(
  summary: GauleDoodhBillSummary,
  brand: DairyBrandingProfile,
  paperWidth: '58mm' | '80mm' = '58mm'
): Uint8Array {
  const cols = paperWidth === '80mm' ? 48 : 32;
  const enc = new EscPosEncoder();

  enc
    .init()
    .align('center')
    .bold(true)
    .textSize(false, true)
    .line('GAULE DOODH BILL')
    .textSize(false, false)
    .line(toPrinterSafeText(brand.dairyName) || 'MILK DAIRY & COLLECTION CENTER')
    .bold(false);

  if (brand.address) enc.line(brand.address);
  if (brand.mobile) enc.line(`Ph: ${brand.mobile}`);

  enc
    .divider(cols)
    .align('left')
    .rawAsciiLine(padRow(`Bill #${summary.billNumber}`, summary.generatedDate.adDisplay, cols))
    .line(`Customer: ${summary.customer.name}`)
    .line(`Mobile: ${summary.customer.mobile || '-'}`)
    .line(`From: ${summary.startDate.bsDisplayShort} BS (${summary.startDate.adDisplay})`)
    .line(`To:   ${summary.endDate.bsDisplayShort} BS (${summary.endDate.adDisplay})`)
    .divider(cols)
    .rawAsciiLine(padRow('Total Days:', `${summary.totalCalendarDays}d (Sup:${summary.totalMilkSupplyDays}/Loss:${summary.totalLossDays})`, cols))
    .rawAsciiLine(padRow('Total Milk:', summary.totalMilk.labelEn, cols))
    .rawAsciiLine(padRow('Rate/Ltr:', `Rs.${summary.primaryRatePerLtr}/L`, cols))
    .divider(cols)
    .rawAsciiLine(padRow('Milk Amount:', `Rs.${summary.totalMilkAmount.toLocaleString('en-US')}`, cols))
    .rawAsciiLine(padRow('Prev Due:', `Rs.${summary.previousOutstandingBalance.toLocaleString('en-US')}`, cols))
    .rawAsciiLine(padRow('Paid:', `-Rs.${summary.totalAmountPaid.toLocaleString('en-US')}`, cols))
    .divider(cols)
    .bold(true)
    .rawAsciiLine(
      padRow(
        summary.advanceCreditRemaining > 0 ? 'ADVANCE CREDIT:' : 'FINAL DUE:',
        `Rs.${(summary.advanceCreditRemaining > 0 ? summary.advanceCreditRemaining : summary.finalRemainingDue).toLocaleString('en-US')}`,
        cols
      )
    )
    .bold(false)
    .divider(cols)
    .align('center')
    .line('Powered by GAULE CALCULATOR')
    .line('Thank you!')
    .feed(4)
    .cut();

  return enc.build();
}
