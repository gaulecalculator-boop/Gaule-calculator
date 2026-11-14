/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * UNIVERSAL RECEIPT & BILL MANAGEMENT ENGINE
 * Gaule Calculator - Offline Smart Billing & Invoicing Engine
 * 
 * Unifies all calculators (Milk, Village Interest, Udhar Khata, Gold/Silver,
 * Shop/Price-Weight, Advance/Collection, Finance) into a single, high-fidelity
 * receipt system with:
 * - Single-source shop/dairy branding
 * - Customer auto-detection & selection from all app modules
 * - Duplicate prevention & persistence
 * - BS + AD date calculation
 * - Dynamic Status: PAID / PARTIAL / DUE
 * - 58mm & 80mm thermal receipts
 * - PDF generation & download
 * - WhatsApp instant rich receipt sharing
 * - Customer payment & bill ledger history
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { dairyBranding, DairyBrandingProfile } from './dairyBranding';
import { adToBs } from './nepaliCalendar';
import { getStoredCustomers } from './storage';
import { getStoredMilkCustomers } from './milkManagementStorage';
import { getStoredByajLedger } from './storage';
import { Language } from '../types';
import { pick5 } from './i18nHelper';
import { saveJsPdfDocument } from './androidBridge';

export type BillModuleType =
  | 'milk'
  | 'byaj'
  | 'udhar'
  | 'gold_silver'
  | 'shop'
  | 'advance_payment'
  | 'payment_collection'
  | 'finance_general';

export type PaymentStatusType = 'PAID' | 'PARTIAL' | 'DUE';

export interface BillLineItem {
  id?: string;
  description: string;
  quantity?: number | string;
  unit?: string;
  rate?: number;
  subtotal: number;
  details?: string;
}

export interface UniversalBill {
  id: string; // Unique bill ID
  billNumber: string; // User-facing sequence number, e.g. "GH-83-1025"
  moduleType: BillModuleType;
  moduleTitle: string;
  
  // Customer info
  customerId?: string;
  customerName: string;
  customerMobile?: string;
  customerAddress?: string;

  // Dates
  dateAD: string; // YYYY-MM-DD
  dateBS: string; // e.g. "२०८३-०१-१५"
  createdAt: number;

  // Items & Calculations
  items: BillLineItem[];
  subtotal: number;
  discount: number;
  taxAmount?: number;
  totalAmount: number;
  paidAmount: number;
  remainingDue: number; // totalAmount - paidAmount
  paymentStatus: PaymentStatusType;
  paymentMethod?: 'cash' | 'esewa' | 'khalti' | 'bank' | 'udhar';

  // Branding snapshot
  branding: DairyBrandingProfile;

  notes?: string;
  categorySpecificData?: Record<string, any>;
}

export interface CustomerSummaryResult {
  name: string;
  mobile: string;
  address?: string;
  source: 'milk' | 'udhar' | 'byaj' | 'bill';
  totalBills: number;
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
}

const BILLS_STORAGE_KEY = 'ghaule_universal_bills_v2';
const BILL_SEQ_KEY = 'ghaule_universal_bill_seq_v2';

// ---------------------------------------------------------------------------
// 1. BILL NUMBER & DATE HELPERS
// ---------------------------------------------------------------------------

export function getFormattedCurrentBSDate(): string {
  try {
    const todayBS = adToBs(new Date());
    const m = String(todayBS.month).padStart(2, '0');
    const d = String(todayBS.day).padStart(2, '0');
    return `${todayBS.year}-${m}-${d}`;
  } catch {
    return '2083-01-01';
  }
}

export function generateNextBillNumber(moduleType: BillModuleType): string {
  if (typeof window === 'undefined') return `GH-${Math.floor(100000 + Math.random() * 900000)}`;
  try {
    const raw = localStorage.getItem(BILL_SEQ_KEY);
    let seq = raw ? parseInt(raw, 10) : 1000;
    if (isNaN(seq) || seq < 1000) seq = 1000;
    seq += 1;
    localStorage.setItem(BILL_SEQ_KEY, String(seq));

    const prefixMap: Record<BillModuleType, string> = {
      milk: 'MK',
      byaj: 'BJ',
      udhar: 'UD',
      gold_silver: 'GS',
      shop: 'SH',
      advance_payment: 'AV',
      payment_collection: 'RC',
      finance_general: 'FN',
    };

    const todayBS = adToBs(new Date());
    const yearShort = String(todayBS.year || 2083).slice(-2);
    const prefix = prefixMap[moduleType] || 'GH';
    return `${prefix}-${yearShort}-${seq}`;
  } catch {
    return `GH-${Date.now().toString().slice(-6)}`;
  }
}

// ---------------------------------------------------------------------------
// 2. STORAGE & PERSISTENCE
// ---------------------------------------------------------------------------

export function getAllUniversalBills(): UniversalBill[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BILLS_STORAGE_KEY);
    if (!raw) return [];
    const list: UniversalBill[] = JSON.parse(raw);
    return Array.isArray(list) ? list.sort((a, b) => b.createdAt - a.createdAt) : [];
  } catch (err) {
    console.error('Error reading universal bills:', err);
    return [];
  }
}

export function saveUniversalBill(bill: UniversalBill): UniversalBill {
  if (typeof window === 'undefined') return bill;
  try {
    const bills = getAllUniversalBills();
    // Check duplicate
    const index = bills.findIndex((b) => b.id === bill.id);
    let updated: UniversalBill[];
    if (index >= 0) {
      updated = [...bills];
      updated[index] = bill;
    } else {
      updated = [bill, ...bills];
    }
    localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('ghaule_bills_updated', { detail: bill }));
    return bill;
  } catch (err) {
    console.error('Failed to save universal bill:', err);
    return bill;
  }
}

export function deleteUniversalBill(billId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const bills = getAllUniversalBills().filter((b) => b.id !== billId);
    localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(bills));
    window.dispatchEvent(new CustomEvent('ghaule_bills_updated'));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 3. AGGREGATED CUSTOMERS (SINGLE SOURCE ACROSS ALL MODULES)
// ---------------------------------------------------------------------------

export function getAllRegisteredCustomers(language: Language = 'ne'): Array<{
  name: string;
  mobile: string;
  address: string;
  source: string;
}> {
  const map = new Map<string, { name: string; mobile: string; address: string; source: string }>();
  const srcMilk = pick5(language, { en: 'Milk Ledger', hi: 'दूध खाता (Milk)', bho: 'दूध खाता (Milk)', mai: 'दूध खाता (Milk)', ne: 'दुध खाता (Milk)' }, 'receiptEngine');
  const srcUdhar = pick5(language, { en: 'Udhar Khata', hi: 'उधार खाता (Udhar)', bho: 'उधार खाता (Udhar)', mai: 'उधार खाता (Udhar)', ne: 'उधार खाता (Udhar)' }, 'receiptEngine');
  const srcUdharShort = pick5(language, { en: 'Udhar Khata', hi: 'उधार खाता', bho: 'उधार खाता', mai: 'उधार खाता', ne: 'उधार खाता' }, 'receiptEngine');
  const srcByaj = pick5(language, { en: 'Interest Ledger', hi: 'ब्याज खाता (Byaj)', bho: 'ब्याज खाता (Byaj)', mai: 'ब्याज खाता (Byaj)', ne: 'ब्याज खाता (Byaj)' }, 'receiptEngine');
  const srcByajShort = pick5(language, { en: 'Interest Ledger', hi: 'ब्याज बही', bho: 'ब्याज बही', mai: 'ब्याज बही', ne: 'ब्याज बही' }, 'receiptEngine');
  const srcBills = pick5(language, { en: 'Previous Bills', hi: 'पुराने बिल (Bills)', bho: 'पुरान बिल (Bills)', mai: 'पुरान बिल (Bills)', ne: 'पुराना बिल (Bills)' }, 'receiptEngine');

  // 1. Milk Customers
  try {
    const milkCusts = getStoredMilkCustomers();
    milkCusts.forEach((c) => {
      if (c.name) {
        const key = c.name.trim().toLowerCase();
        map.set(key, {
          name: c.name.trim(),
          mobile: c.mobile || '',
          address: c.address || '',
          source: srcMilk,
        });
      }
    });
  } catch {}

  // 2. Udhar Khata Customers
  try {
    const udharCusts = getStoredCustomers();
    udharCusts.forEach((c) => {
      if (c.name) {
        const key = c.name.trim().toLowerCase();
        const existing = map.get(key);
        map.set(key, {
          name: c.name.trim(),
          mobile: c.phone || existing?.mobile || '',
          address: c.address || existing?.address || '',
          source: existing ? `${existing.source}, ${srcUdharShort}` : srcUdhar,
        });
      }
    });
  } catch {}

  // 3. Byaj Ledger Borrowers
  try {
    const byajLedger = getStoredByajLedger();
    byajLedger.forEach((b) => {
      if (b.borrowerName) {
        const key = b.borrowerName.trim().toLowerCase();
        const existing = map.get(key);
        map.set(key, {
          name: b.borrowerName.trim(),
          mobile: b.phone || existing?.mobile || '',
          address: existing?.address || '',
          source: existing ? `${existing.source}, ${srcByajShort}` : srcByaj,
        });
      }
    });
  } catch {}

  // 4. Bills already issued
  try {
    const bills = getAllUniversalBills();
    bills.forEach((b) => {
      if (b.customerName) {
        const key = b.customerName.trim().toLowerCase();
        const existing = map.get(key);
        map.set(key, {
          name: b.customerName.trim(),
          mobile: b.customerMobile || existing?.mobile || '',
          address: b.customerAddress || existing?.address || '',
          source: existing ? existing.source : srcBills,
        });
      }
    });
  } catch {}

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getCustomerBillsAndHistory(customerName: string): {
  bills: UniversalBill[];
  totalBilled: number;
  totalPaid: number;
  totalDue: number;
} {
  const allBills = getAllUniversalBills();
  const search = customerName.trim().toLowerCase();
  const bills = allBills.filter(
    (b) => b.customerName.trim().toLowerCase() === search || (b.customerMobile && b.customerMobile.includes(search))
  );

  let totalBilled = 0;
  let totalPaid = 0;
  let totalDue = 0;

  bills.forEach((b) => {
    totalBilled += b.totalAmount || 0;
    totalPaid += b.paidAmount || 0;
    totalDue += b.remainingDue || 0;
  });

  return {
    bills,
    totalBilled,
    totalPaid,
    totalDue,
  };
}

// ---------------------------------------------------------------------------
// 4. WHATSAPP RICH BILL SHARE FORMATTER
// ---------------------------------------------------------------------------

export function formatWhatsAppBillText(bill: UniversalBill, language: Language = 'ne'): string {
  const brand = bill.branding || dairyBranding.getProfile();
  const p = (en: string, hi: string, bho: string, mai: string, ne: string) =>
    pick5(language, { en, hi, bho, mai, ne }, 'formatWhatsAppBillText');
  const rs = language === 'en' ? 'Rs.' : 'रु';

  const statusEmoji =
    bill.paymentStatus === 'PAID'
      ? p('✅ PAID', '✅ PAID (चुकता)', '✅ PAID (चुकता)', '✅ PAID (चुकता)', '✅ PAID (चुक्ता)')
      : bill.paymentStatus === 'PARTIAL'
      ? p('⏳ PARTIAL', '⏳ PARTIAL (आंशिक)', '⏳ PARTIAL (आंशिक)', '⏳ PARTIAL (आंशिक)', '⏳ PARTIAL (आंशिक)')
      : p('🔴 DUE', '🔴 DUE (बाकी)', '🔴 DUE (बाकी)', '🔴 DUE (बाकी)', '🔴 DUE (बाँकी)');

  const defaultShop = p('Our Shop / Dairy', 'हमारी दुकान / डेयरी', 'हमार दोकान / डेयरी', 'हमर दोकान / डेयरी', 'हाम्रो पसल / डेरी');
  let t = `*🧾 ${brand.dairyName || defaultShop}*\n`;
  if (brand.slogan) t += `_"${brand.slogan}"_\n`;
  if (brand.address) t += `📍 ${p('Address', 'पता', 'पता', 'पता', 'ठेगाना')}: ${brand.address}\n`;
  if (brand.mobile) t += `📞 ${p('Contact', 'संपर्क', 'संपर्क', 'संपर्क', 'सम्पर्क')}: ${brand.mobile}${brand.alternateMobile ? ` / ${brand.alternateMobile}` : ''}\n`;
  if (brand.proprietorName) t += `👤 ${p('Proprietor', 'संचालक', 'मालिक', 'संचालक', 'सञ्चालक')}: ${brand.proprietorName}\n`;
  if (brand.panVatNumber) t += `🏛️ PAN/VAT: ${brand.panVatNumber}\n`;

  t += `================================\n`;
  t += `*📋 ${p('Bill No', 'बिल नं.', 'बिल नं.', 'बिल नं.', 'बिल नं')}:* #${bill.billNumber}\n`;
  t += `*📅 ${p('Date', 'तिथि', 'तारीख', 'तिथि', 'मिति')}:* ${bill.dateBS} (BS) | ${bill.dateAD} (AD)\n`;
  t += `*📂 ${p('Category', 'प्रकार', 'प्रकार', 'प्रकार', 'प्रकार')}:* ${bill.moduleTitle}\n`;
  t += `*👤 ${p('Customer', 'ग्राहक', 'ग्राहक', 'ग्राहक', 'ग्राहक')}:* *${bill.customerName}*\n`;
  if (bill.customerMobile) t += `📱 ${p('Mobile', 'मोबाइल', 'मोबाइल', 'मोबाइल', 'मोबाइल')}: ${bill.customerMobile}\n`;
  if (bill.customerAddress) t += `🏠 ${p('Address', 'पता', 'पता', 'पता', 'ठेगाना')}: ${bill.customerAddress}\n`;
  t += `--------------------------------\n`;

  t += `*${p('CALCULATION DETAILS:', 'विवरण (CALCULATION DETAILS):', 'विवरण (CALCULATION DETAILS):', 'विवरण (CALCULATION DETAILS):', 'विवरण (CALCULATION DETAILS):')}*\n`;
  bill.items.forEach((item, i) => {
    const qtyStr = item.quantity ? `${item.quantity} ${item.unit || ''}` : '';
    const rateStr = item.rate ? `@ ${rs} ${item.rate}` : '';
    t += `${i + 1}. *${item.description}*\n`;
    if (qtyStr || rateStr) {
      t += `   ${qtyStr} ${rateStr} = ${rs} ${item.subtotal.toLocaleString()}\n`;
    } else {
      t += `   ${p('Amount', 'राशि', 'रकम', 'राशि', 'रकम')}: ${rs} ${item.subtotal.toLocaleString()}\n`;
    }
    if (item.details) t += `   (${item.details})\n`;
  });

  t += `--------------------------------\n`;
  if (bill.discount > 0) {
    t += `${p('Subtotal', 'उप-कुल (Subtotal)', 'उप-कुल (Subtotal)', 'उप-कुल (Subtotal)', 'उप-कुल (Subtotal)')}: ${rs} ${bill.subtotal.toLocaleString()}\n`;
    t += `${p('Discount', 'छूट (Discount)', 'छूट (Discount)', 'छूट (Discount)', 'छुट (Discount)')}: - ${rs} ${bill.discount.toLocaleString()}\n`;
  }
  t += `*💰 ${p('GRAND TOTAL', 'कुल योग (GRAND TOTAL)', 'कुल जोड़ (GRAND TOTAL)', 'कुल जोड़ (GRAND TOTAL)', 'कुल जम्मा (GRAND TOTAL)')}: ${rs} ${bill.totalAmount.toLocaleString()}*\n`;
  t += `💵 ${p('PAID', 'भुगतान किया (PAID)', 'दिहल रकम (PAID)', 'देने रकम (PAID)', 'बुझाएको रकम (PAID)')}: ${rs} ${bill.paidAmount.toLocaleString()}\n`;
  t += `⚠️ ${p('REMAINING DUE', 'बाकी राशि (REMAINING DUE)', 'बाकी रकम (REMAINING DUE)', 'बाकी रकम (REMAINING DUE)', 'बाँकी रकम (REMAINING DUE)')}: *${rs} ${bill.remainingDue.toLocaleString()}*\n`;
  t += `📌 ${p('Status', 'स्थिति', 'स्थिति', 'स्थिति', 'स्थिति')}: ${statusEmoji}\n`;
  if (bill.paymentMethod) t += `💳 ${p('Payment Method', 'भुगतान माध्यम', 'भुगतान माध्यम', 'भुगतान माध्यम', 'भुक्तानी माध्यम')}: ${bill.paymentMethod.toUpperCase()}\n`;
  if (bill.notes) t += `📝 ${p('Note', 'नोट', 'नोट', 'नोट', 'नोट')}: ${bill.notes}\n`;
  t += `================================\n`;
  t += `${p('Thank you for choosing our service! 🙏', 'हमारी सेवा चुनने के लिए धन्यवाद! 🙏', 'हमार सेवा चुने खातिर धन्यवाद! 🙏', 'हमर सेवा चुनबाक लेल धन्यवाद! 🙏', 'हाम्रो सेवा रोज्नुभएकोमा धन्यवाद! 🙏')}\n`;
  t += `_Gaule Calculator - Universal Offline Smart System_`;

  return t;
}

// ---------------------------------------------------------------------------
// 5. PDF BILL GENERATOR (HIGH QUALITY & PRINT READY)
// ---------------------------------------------------------------------------

export function generateUniversalBillPDF(bill: UniversalBill): void {
  const brand = bill.branding || dairyBranding.getProfile();

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Top Accent Bar
  doc.setFillColor(30, 64, 175); // Royal blue
  doc.rect(0, 0, 210, 8, 'F');

  // Header Title - Shop/Dairy Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138);
  doc.text(brand.dairyName || 'GAULE CALCULATOR - INVOICE', 105, 20, { align: 'center' });

  // Subtitle / Slogan
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const subDetails = [
    brand.address ? `Address: ${brand.address}` : '',
    brand.mobile ? `Tel: ${brand.mobile}` : '',
    brand.proprietorName ? `Prop: ${brand.proprietorName}` : '',
    brand.panVatNumber ? `PAN/VAT: ${brand.panVatNumber}` : '',
  ]
    .filter(Boolean)
    .join('  |  ');

  doc.text(subDetails || 'Universal Calculation Bill & Receipt', 105, 26, { align: 'center' });

  if (brand.slogan) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`"${brand.slogan}"`, 105, 31, { align: 'center' });
  }

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 35, 196, 35);

  // Bill Metadata & Customer Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 38, 182, 26, 3, 3, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 38, 182, 26, 3, 3, 'D');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`CUSTOMER (Grahak): ${bill.customerName}`, 18, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(`Mobile: ${bill.customerMobile || 'N/A'}`, 18, 51);
  doc.text(`Address: ${bill.customerAddress || 'Local'}`, 18, 57);

  doc.setFont('helvetica', 'bold');
  doc.text(`INVOICE NO: #${bill.billNumber}`, 120, 45);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date BS: ${bill.dateBS}`, 120, 51);
  doc.text(`Date AD: ${bill.dateAD} | Type: ${bill.moduleType.toUpperCase()}`, 120, 57);

  // Table Rows
  const tableRows = bill.items.map((it, idx) => {
    const qtyStr = it.quantity ? `${it.quantity} ${it.unit || ''}` : '-';
    const rateStr = it.rate ? `Rs. ${it.rate.toLocaleString()}` : '-';
    const descWithDetails = it.details ? `${it.description}\n(${it.details})` : it.description;
    return [
      String(idx + 1),
      descWithDetails,
      qtyStr,
      rateStr,
      `Rs. ${it.subtotal.toLocaleString()}`,
    ];
  });

  autoTable(doc, {
    startY: 68,
    head: [['S.N.', 'Particulars / Description', 'Qty / Unit', 'Rate', 'Total Amount (Rs.)']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 9,
      cellPadding: 3.5,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 14 },
      1: { cellWidth: 80 },
      2: { halign: 'center', cellWidth: 28 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 30 },
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 110;
  const summaryY = finalY + 8;

  // Bottom Summary Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(110, summaryY, 86, 46, 3, 3, 'FD');
  doc.setDrawColor(203, 213, 225);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  doc.text('Subtotal:', 114, summaryY + 8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${bill.subtotal.toLocaleString()}`, 192, summaryY + 8, { align: 'right' });

  if (bill.discount > 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Discount:', 114, summaryY + 16);
    doc.setFont('helvetica', 'bold');
    doc.text(`- Rs. ${bill.discount.toLocaleString()}`, 192, summaryY + 16, { align: 'right' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Grand Total:', 114, summaryY + 25);
  doc.setTextColor(30, 64, 175);
  doc.text(`Rs. ${bill.totalAmount.toLocaleString()}`, 192, summaryY + 25, { align: 'right' });

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Paid Amount:', 114, summaryY + 33);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${bill.paidAmount.toLocaleString()}`, 192, summaryY + 33, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text('Remaining Balance:', 114, summaryY + 41);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(bill.remainingDue > 0 ? 220 : 22, bill.remainingDue > 0 ? 38 : 163, bill.remainingDue > 0 ? 38 : 74);
  doc.text(`Rs. ${bill.remainingDue.toLocaleString()}`, 192, summaryY + 41, { align: 'right' });

  // Status Badge on left
  doc.setFillColor(
    bill.paymentStatus === 'PAID' ? 220 : bill.paymentStatus === 'PARTIAL' ? 254 : 254,
    bill.paymentStatus === 'PAID' ? 252 : bill.paymentStatus === 'PARTIAL' ? 243 : 226,
    bill.paymentStatus === 'PAID' ? 231 : bill.paymentStatus === 'PARTIAL' ? 199 : 226
  );
  doc.roundedRect(14, summaryY, 85, 20, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(
    bill.paymentStatus === 'PAID' ? 21 : bill.paymentStatus === 'PARTIAL' ? 180 : 220,
    bill.paymentStatus === 'PAID' ? 128 : bill.paymentStatus === 'PARTIAL' ? 83 : 38,
    bill.paymentStatus === 'PAID' ? 61 : bill.paymentStatus === 'PARTIAL' ? 9 : 38
  );
  doc.text(`STATUS: ${bill.paymentStatus}`, 18, summaryY + 9);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    bill.paymentStatus === 'PAID'
      ? 'Payment received in full. Thank you!'
      : bill.paymentStatus === 'PARTIAL'
      ? `Partial payment. Due: Rs. ${bill.remainingDue.toLocaleString()}`
      : `Payment due. Total: Rs. ${bill.remainingDue.toLocaleString()}`,
    18,
    summaryY + 15
  );

  // Signature and Thank you
  const footerY = summaryY + 54;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('Thank you for your business! Calculated with Gaule Calculator Offline Hub.', 14, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`Authorized Signature (${brand.proprietorName || 'Manager'}): _______________________`, 14, footerY + 10);

  const cleanName = (bill.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Bill_${bill.billNumber}_${cleanName}.pdf`;
  saveJsPdfDocument(doc, filename);
}
