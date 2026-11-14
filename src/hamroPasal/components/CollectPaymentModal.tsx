/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Collect Payment Modal — Hamro Pasal
 * Allows collecting partial or full debt payment against customer outstanding balance
 */

import React, { useState } from 'react';
import { X, Check, Banknote, CreditCard, Wallet, Smartphone, ArrowRight } from 'lucide-react';
import { CustomerRecord, PaymentMethod } from '../types';
import { pasalStorage } from '../storage/pasalStorage';
import { pasalFirestoreSync } from '../storage/pasalFirestoreSync';
import { playTapSound, playSuccessSound } from '../../utils/audio';
import { Language } from '../../types';
import { translateUserData, localizeNumberString } from '../../utils/universalTranslator';
import { pick5 } from '../../utils/i18nHelper';

import { NepaliBSDatePicker } from '../../components/common/NepaliBSDatePicker';

interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerRecord;
  appLanguage?: Language;
  onPaymentCollected?: () => void;
}

export const CollectPaymentModal: React.FC<CollectPaymentModalProps> = ({
  isOpen,
  onClose,
  customer,
  appLanguage = 'ne',
  onPaymentCollected,
}) => {
  const p = (en: string, hi: string, bho: string, mai: string, ne: string) =>
    pick5(appLanguage, { en, hi, bho, mai, ne }, 'CollectPaymentModal');
  const trData = (s?: string) => translateUserData(s || '', appLanguage);
  const trNum = (v: string | number) => localizeNumberString(v, appLanguage);
  const rsPrefix = appLanguage === 'en' ? 'Rs.' : 'रु';
  const fmtCur = (n: number) => `${rsPrefix} ${trNum((n || 0).toLocaleString())}`;
  const [amountStr, setAmountStr] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const amount = parseFloat(amountStr) || 0;
  const currentBalance = customer.outstandingBalance;
  const remainingBalanceAfter = Math.max(0, currentBalance - amount);

  const handlePayFull = () => {
    playTapSound();
    setAmountStr(currentBalance.toString());
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError(p('Please enter payment amount', 'कृपया भुगतान राशि दर्ज करें', 'कृपया पइसा के रकम भरीं', 'कृपया भुगतान राशि दर्ज करू', 'कृपया भुक्तानी रकम प्रविष्ट गर्नुहोस्'));
      return;
    }

    try {
      const customTime = paymentDate ? new Date(paymentDate).getTime() : Date.now();
      const paymentRec = pasalStorage.collectCustomerPayment(
        customer.id,
        amount,
        paymentMethod,
        notes || 'Debt repayment',
        customer.shopId,
        customTime
      );
      pasalFirestoreSync.syncPaymentToCloud(paymentRec);
      const updatedCust = pasalStorage.getCustomerById(customer.id, customer.shopId);
      if (updatedCust) {
        pasalFirestoreSync.syncCustomerToCloud(updatedCust);
      }
      playSuccessSound();
      if (onPaymentCollected) onPaymentCollected();
      onClose();
    } catch (err: any) {
      setError(err?.message || p('Could not save payment', 'भुगतान दर्ज नहीं हो सका', 'भुगतान सेव ना हो सकल', 'भुगतान दर्ज नहि भ सकल', 'भुक्तानी दर्ता गर्न सकिएन'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {customer.photoUrl ? (
              <img src={customer.photoUrl} alt={trData(customer.name)} className="w-9 h-9 rounded-xl object-cover border border-white/20" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-white/20 text-white font-black text-sm flex items-center justify-center">
                {(trData(customer.name) || customer.name).charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-extrabold text-sm leading-tight">
                {p('Collect Credit Payment', 'उधार भुगतान वसूली', 'उधार वसूली / जमा', 'उधार भुगतान वसूली', 'उधारो भुक्तानी संकलन')}
              </h3>
              <p className="text-[11px] text-emerald-100 font-medium">{trData(customer.name)} {customer.mobile ? `(${trNum(customer.mobile)})` : ''}</p>
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

        {/* Balance Status Box */}
        <div className="p-4 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-800 uppercase">
              {p('Total Outstanding Credit', 'कुल बकाया उधार', 'कुल बाकी उधार', 'कुल बाकी उधार', 'हालको कुल बाँकी उधारो')}
            </p>
            <p className="text-xl font-black text-rose-600">{fmtCur(currentBalance)}</p>
          </div>
          <button
            type="button"
            onClick={handlePayFull}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-xs"
          >
            {p('Pay Full', 'पूरा चुकता', 'पूरा चुकता करीं', 'पूरा चुकता करू', 'पूरै चुक्ता')}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs text-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {p('Amount Received', 'प्राप्त भुगतान राशि', 'मिलल पइसा के रकम', 'प्राप्त भुगतान राशि', 'प्राप्त भएको भुक्तानी रकम')} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-slate-400">{rsPrefix}</span>
              <input
                type="number"
                step="any"
                min="1"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  setError(null);
                }}
                placeholder="0"
                autoFocus
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-3 pl-9 pr-3 text-base font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
              />
            </div>
          </div>

          {/* Payment Date in BS */}
          <div>
            <NepaliBSDatePicker
              label={p('Payment Date (B.S.):', 'भुगतान तिथि (वि.सं.):', 'भुगतान के तारीख (वि.सं.):', 'भुगतान तिथि (वि.सं.):', 'भुक्तानी मिति (वि.सं.):')}
              value={paymentDate}
              language={appLanguage}
              onChange={(iso) => setPaymentDate(iso)}
            />
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {p('Payment Method', 'भुगतान का माध्यम', 'भुगतान के तरीका', 'भुगतानक माध्यम', 'भुक्तानी माध्यम')}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'cash', label: p('Cash', 'नकद', 'नगद', 'नगद', 'नगद'), icon: Banknote },
                { id: 'esewa', label: 'eSewa', icon: Smartphone },
                { id: 'khalti', label: 'Khalti', icon: Wallet },
                { id: 'bank_transfer', label: p('Bank', 'बैंक', 'बैंक', 'बैंक', 'बैंक'), icon: CreditCard },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setPaymentMethod(m.id as PaymentMethod);
                    }}
                    className={`py-2 px-1.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-extrabold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-emerald-600" />
                    <span className="text-[10px] leading-tight text-center truncate w-full">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Calculation Preview */}
          <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-slate-600 text-[11px]">
              <span>{p('Previous Due:', 'पिछला बकाया:', 'पहिलका बाकी:', 'पछिलका बाकी:', 'अघिल्लो बाँकी:')}</span>
              <span className="font-bold">{fmtCur(currentBalance)}</span>
            </div>
            <div className="flex items-center justify-between text-emerald-700 font-bold text-[11px]">
              <span>{p('Paid Now:', 'अभी भुगतान:', 'अभी जमा भइल:', 'अखन जमा भेल:', 'प्राप्त रकम:')}</span>
              <span>− {fmtCur(amount)}</span>
            </div>
            <div className="pt-1.5 border-t border-slate-300/80 flex items-center justify-between font-extrabold text-xs">
              <span className="text-slate-900">{p('Remaining Due:', 'शेष बकाया:', 'बाकी बचल रकम:', 'बाकी बचल राशि:', 'भुक्तानीपछिको बाँकी:')}</span>
              <span className={remainingBalanceAfter > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                {fmtCur(remainingBalanceAfter)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {p('Remarks / Note (Optional)', 'टिप्पणी / नोट (ऐच्छिक)', 'टिप्पणी / नोट (जरूरी नइखे)', 'टिप्पणी / नोट (ऐच्छिक)', 'कैफियत / नोट (ऐच्छिक)')}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={p('e.g. Partial payment', 'उदाहरण: आंशिक भुगतान', 'जइसे: थोड़ा पइसा जमा', 'जेना: आंशिक भुगतान', 'उदाहरण: आंशिक भुक्तानी')}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:border-emerald-500"
            />
          </div>

          {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-xl">{error}</p>}

          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{p('Save Payment', 'भुगतान सुरक्षित करें', 'भुगतान सेव करीं', 'भुगतान सुरक्षित करू', 'भुक्तानी सुरक्षित गर्नुहोस्')}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playTapSound();
                onClose();
              }}
              className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
            >
              {p('Cancel', 'रद्द', 'बंद करीं', 'रद्द', 'रद्द')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
