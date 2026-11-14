/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Receipt Print & Thermal Bill Modal — Hamro Pasal
 * Formats printable 58mm/80mm thermal receipt and instant WhatsApp bill sharing
 */

import React, { useRef } from 'react';
import { X, Printer, Share2, Check, Download } from 'lucide-react';
import { CustomerOrder, ShopProfile, CustomerRecord } from '../types';
import { playTapSound } from '../../utils/audio';
import { dairyBranding } from '../../utils/dairyBranding';
import { Language } from '../../types';
import {
  translateUserData,
  localizeNumberString,
} from '../../utils/universalTranslator';
import { pick5 } from '../../utils/i18nHelper';
import { printCurrentView, openExternalUrl } from '../../utils/androidBridge';

interface ReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: CustomerOrder;
  shop: ShopProfile;
  customer?: CustomerRecord | null;
  appLanguage?: Language;
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({
  isOpen,
  onClose,
  order,
  shop,
  customer,
  appLanguage = 'ne',
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const p = (en: string, hi: string, bho: string, mai: string, ne: string) =>
    pick5(appLanguage, { en, hi, bho, mai, ne }, 'ReceiptPrintModal');
  const trData = (s?: string) => translateUserData(s || '', appLanguage);
  const trNum = (v: string | number) => localizeNumberString(v, appLanguage);
  const rsPrefix = appLanguage === 'en' ? 'Rs.' : 'रु';
  const fmtCur = (n: number) => `${rsPrefix} ${trNum((n || 0).toLocaleString())}`;

  const brand = dairyBranding.getProfile();
  const shopName = brand.dairyName || shop.name;
  const shopAddress = brand.address || shop.address;
  const shopMobile = brand.mobile || shop.mobile;
  const shopPan = brand.panVatNumber || shop.panNumber;

  const handlePrint = () => {
    playTapSound();
    printCurrentView(`Hamro Pasal Receipt #${order.orderNumber}`);
  };

  const handleShareWhatsApp = () => {
    playTapSound();
    const itemsText = order.items
      .map((i) => `• ${trData(i.productName)} × ${trNum(i.quantity)} = ${fmtCur(i.total)}`)
      .join('\n');

    let text = `*${trData(shopName)}*\n`;
    if (brand.slogan) text += `"${trData(brand.slogan)}"\n`;
    if (shopAddress) text += `${p('Address', 'पता', 'पता', 'पता', 'ठेगाना')}: ${trData(shopAddress)}\n`;
    if (shopMobile) text += `${p('Contact', 'संपर्क', 'सम्पर्क', 'सम्पर्क', 'सम्पर्क')}: ${trNum(shopMobile)}\n`;
    if (shopPan) text += `PAN/VAT: ${trNum(shopPan)}\n`;
    text += `--------------------------------\n`;
    text += `${p('Bill No', 'बिल नं', 'बिल नं.', 'बिल नं.', 'बिल नं')}: #${trNum(order.orderNumber)} | ${p('Date', 'तारीख', 'तारीख', 'तिथि', 'मिति')}: ${trNum(new Date(order.createdAt).toLocaleDateString())}\n`;
    if (order.tableNumber) text += `${p('Table', 'टेबल', 'टेबल', 'टेबल', 'टेबल')}: ${trNum(order.tableNumber)} | ${p('Type', 'प्रकार', 'किसिम', 'प्रकार', 'प्रकार')}: ${order.orderType}\n`;
    text += `${p('Customer', 'ग्राहक', 'ग्राहक', 'ग्राहक', 'ग्राहक')}: *${trData(order.customerName)}* ${order.customerMobile ? `(${trNum(order.customerMobile)})` : ''}\n`;
    text += `--------------------------------\n`;
    text += `${itemsText}\n`;
    text += `--------------------------------\n`;
    text += `${p('Total Amount', 'कुल राशि', 'कुल पइसा', 'कुल राशि', 'कुल रकम')}: *${fmtCur(order.totalBill)}*\n`;
    text += `${p('Amount Paid', 'जमा राशि', 'मिलल पइसा', 'जमा राशि', 'प्राप्त रकम')}: ${fmtCur(order.amountReceived)}\n`;
    text += `${p('Bill Due', 'इस बिल का बकाया', 'एह बिल के बाकी', 'ई बिलक बाकी', 'यस बिलको बाँकी')}: ${fmtCur(order.remainingBalance)}\n`;

    if (customer && customer.outstandingBalance > 0) {
      text += `--------------------------------\n`;
      text += `*${p('Customer Total Credit Due', 'ग्राहक का कुल बकाया उधार', 'ग्राहक के कुल बाकी उधार', 'ग्राहकक कुल बाकी उधार', 'ग्राहकको कुल बाँकी उधारो')}: ${fmtCur(customer.outstandingBalance)}*\n`;
    }
    text += `--------------------------------\n${p('Thank you! Please visit again 🙏', 'धन्यवाद! फिर पधारें 🙏', 'धन्यवाद! फेरु आईं 🙏', 'धन्यवाद! फेरु आउ 🙏', 'धन्यवाद! फेरि पाल्नुहोला 🙏')}`;

    const encoded = encodeURIComponent(text);
    const phone = order.customerMobile ? order.customerMobile.replace(/\D/g, '') : '';
    const url = phone ? `https://wa.me/977${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    openExternalUrl(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧾</span>
            <div>
              <h3 className="font-extrabold text-xs">
                {p('Bill Receipt', 'बिल रसीद', 'बिल रसीद', 'बिल रसीद', 'बिल रसिद')} (#{trNum(order.orderNumber)})
              </h3>
              <p className="text-[10px] text-slate-400">{trData(shop.name)}</p>
            </div>
          </div>
          <button
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Paper Preview Box */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100 flex justify-center">
          <div
            ref={receiptRef}
            className="w-full max-w-[320px] bg-white p-5 rounded-2xl shadow-sm border border-slate-300 font-mono text-[11px] text-slate-800 leading-tight space-y-3"
          >
            {/* Header */}
            <div className="text-center space-y-1">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">{trData(shopName)}</h2>
              {brand.slogan && <p className="text-[10px] text-slate-500 italic">"{trData(brand.slogan)}"</p>}
              {shopAddress && <p className="text-[10px] text-slate-600 font-sans">{trData(shopAddress)}</p>}
              {shopMobile && <p className="text-[10px] text-slate-600 font-sans">{p('Phone', 'फोन', 'फोन', 'फोन', 'फोन')}: {trNum(shopMobile)}</p>}
              {shopPan && (
                <p className="text-[10px] text-slate-600 font-bold">PAN/VAT: {trNum(shopPan)}</p>
              )}
            </div>

            <div className="border-t border-dashed border-slate-300 my-2" />

            {/* Bill Meta */}
            <div className="flex justify-between text-[10px]">
              <span>{p('Bill No', 'बिल नं', 'बिल नं.', 'बिल नं.', 'बिल नं')}: #{trNum(order.orderNumber)}</span>
              <span>{trNum(new Date(order.createdAt).toLocaleDateString())}</span>
            </div>
            {order.tableNumber && (
              <div className="flex justify-between text-[10px]">
                <span>{p('Table', 'टेबल', 'टेबल', 'टेबल', 'टेबल')}: {trNum(order.tableNumber)}</span>
                <span className="uppercase">{order.orderType}</span>
              </div>
            )}
            <div className="text-[10px]">
              <span>{p('Customer', 'ग्राहक', 'ग्राहक', 'ग्राहक', 'ग्राहक')}: <strong className="font-sans">{trData(order.customerName)}</strong></span>
              {order.customerMobile && <span> ({trNum(order.customerMobile)})</span>}
            </div>

            <div className="border-t border-dashed border-slate-300 my-2" />

            {/* Items Table */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-bold border-b border-slate-200 pb-1 text-[10px]">
                <span className="w-1/2">{p('Item', 'विवरण', 'सामान', 'सामान', 'विवरण')}</span>
                <span className="w-1/4 text-center">{p('Qty', 'मात्रा', 'मात्रा', 'मात्रा', 'मात्रा')}</span>
                <span className="w-1/4 text-right">{p('Amount', 'रकम', 'रकम', 'राशि', 'रकम')}</span>
              </div>
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[10px]">
                  <span className="w-1/2 font-sans truncate pr-1">{trData(item.productName)}</span>
                  <span className="w-1/4 text-center">{trNum(item.quantity)}</span>
                  <span className="w-1/4 text-right">{fmtCur(item.total)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-300 my-2" />

            {/* Totals */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>{p('Subtotal:', 'उप-योग:', 'उप-जोड़:', 'उप-जोड़:', 'उप-कुल:')}</span>
                <span>{fmtCur(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>{p('Discount:', 'छूट:', 'छूट:', 'छूट:', 'छुट:')}</span>
                  <span>− {fmtCur(order.discount)}</span>
                </div>
              )}
              {order.serviceChargeAmount > 0 && (
                <div className="flex justify-between">
                  <span>{p('Service Charge:', 'सेवा शुल्क:', 'सेवा शुल्क:', 'सेवा शुल्क:', 'सेवा शुल्क:')}</span>
                  <span>+ {fmtCur(order.serviceChargeAmount)}</span>
                </div>
              )}
              {order.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>{p('Tax (VAT 13%):', 'कर (VAT 13%):', 'कर (VAT १३%):', 'कर (VAT १३%):', 'कर (VAT १३%):')}</span>
                  <span>+ {fmtCur(order.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300 text-slate-900">
                <span>{p('Total Bill:', 'कुल बिल:', 'कुल बिल:', 'कुल बिल:', 'कुल जम्मा:')}</span>
                <span>{fmtCur(order.totalBill)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-700">
                <span>{p('Amount Paid:', 'प्राप्त राशि:', 'मिलल पइसा:', 'प्राप्त राशि:', 'प्राप्त रकम:')}</span>
                <span>{fmtCur(order.amountReceived)}</span>
              </div>
              <div className="flex justify-between font-bold text-rose-600">
                <span>{p('Due:', 'बकाया:', 'बाकी:', 'बाकी:', 'बाँकी रकम:')}</span>
                <span>{fmtCur(order.remainingBalance)}</span>
              </div>
            </div>

            {/* Customer Overall Khata Status */}
            {customer && customer.outstandingBalance > 0 && (
              <div className="mt-3 p-2 rounded-xl bg-amber-50 border border-amber-200 text-center font-sans space-y-0.5">
                <p className="text-[10px] font-bold text-amber-900">
                  {p('Customer Total Outstanding Credit', 'ग्राहक का कुल बकाया खाता', 'ग्राहक के कुल बाकी खाता', 'ग्राहकक कुल बाकी खाता', 'ग्राहकको कुल बाँकी खाता')}
                </p>
                <p className="text-xs font-black text-rose-600">
                  {p('Total Due:', 'कुल बकाया:', 'कुल बाकी:', 'कुल बाकी:', 'कुल बाँकी:')} {fmtCur(customer.outstandingBalance)}
                </p>
              </div>
            )}

            <div className="border-t border-dashed border-slate-300 pt-3 text-center text-[10px] text-slate-500 font-sans">
              <p>{p('Thank you! Please visit again 🙏', 'धन्यवाद! फिर पधारें 🙏', 'धन्यवाद! फेरु आईं 🙏', 'धन्यवाद! फेरु आउ 🙏', 'धन्यवाद! फेरि पाल्नुहोला 🙏')}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{p('Print', 'प्रिंट', 'प्रिंट करीं', 'प्रिंट करू', 'प्रिन्ट')}</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="flex-1 py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{p('WhatsApp Bill', 'WhatsApp बिल', 'WhatsApp बिल', 'WhatsApp बिल', 'WhatsApp बिल')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
