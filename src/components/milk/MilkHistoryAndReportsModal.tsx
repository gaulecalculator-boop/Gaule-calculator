/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  Edit3,
  Trash2,
  Receipt,
  Share2,
  Printer,
  FileSpreadsheet,
  FileText,
  History,
} from 'lucide-react';
import {
  MilkCustomer,
  DailyMilkRecord,
  MonthlyMilkBill,
  MilkPayment,
  MilkPaymentMethod,
  NoMilkDayRecord,
  MilkAuditLog,
  MilkFinalBill,
} from '../../types/milkManagement';
import { NepaliBSDatePicker } from '../common/NepaliBSDatePicker';
import {
  calculateCustomerBillingCycles,
  exportMilkDataToCSV,
  getTodayISOLocal,
} from '../../utils/milkManagementStorage';
import { buildGauleDoodhBillSummary } from '../../utils/gauleDoodhBillEngine';
import { GauleDoodhTraditionalBill } from './GauleDoodhTraditionalBill';
import { playTapSound, playSuccessSound } from '../../utils/audio';
import { Language } from '../../types';
import { translateUserData, localizeNumberString } from '../../utils/universalTranslator';

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: MilkCustomer | null;
  activeTab: 'bills' | 'payments' | 'daily' | 'nomilk' | 'audit';
  onChangeTab: (tab: 'bills' | 'payments' | 'daily' | 'nomilk' | 'audit') => void;
  dailyRecords: DailyMilkRecord[];
  payments: MilkPayment[];
  noMilkDays: NoMilkDayRecord[];
  auditLogs: MilkAuditLog[];
  finalBills: MilkFinalBill[];
  onEditDailyRecord: (cust: MilkCustomer, rec: DailyMilkRecord) => void;
  onDeleteDailyRecord: (rec: DailyMilkRecord) => void;
  onUpdatePayment: (id: string, amount: number, method: MilkPaymentMethod, note?: string) => void;
  onDeletePayment: (pay: MilkPayment) => void;
  onDeleteNoMilkDay: (nm: NoMilkDayRecord) => void;
  onViewReceipt: (cust: MilkCustomer, pay: MilkPayment | null, bill: MonthlyMilkBill | null) => void;
  onShareWhatsAppBill: (cust: MilkCustomer, bill: MonthlyMilkBill) => void;
  onShareWhatsAppReceipt: (cust: MilkCustomer, pay: MilkPayment) => void;
  onViewFinalBill: (bill: MilkFinalBill) => void;
  language?: Language;
}

export const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  isOpen,
  onClose,
  customer,
  activeTab,
  onChangeTab,
  dailyRecords,
  payments,
  noMilkDays,
  auditLogs,
  finalBills,
  onEditDailyRecord,
  onDeleteDailyRecord,
  onUpdatePayment,
  onDeletePayment,
  onDeleteNoMilkDay,
  onViewReceipt,
  onShareWhatsAppBill,
  onShareWhatsAppReceipt,
  onViewFinalBill,
  language = 'ne',
}) => {
  const trData = (v?: string | null) => translateUserData(v || '', language);
  const trNum = (v: string | number) => localizeNumberString(v, language);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPayAmount, setEditPayAmount] = useState('');
  const [editPayMethod, setEditPayMethod] = useState<MilkPaymentMethod>('cash');
  const [editPayNote, setEditPayNote] = useState('');

  useEffect(() => {
    setSearchTerm('');
    setEditingPaymentId(null);
  }, [isOpen, customer?.id]);

  const custCycles = useMemo(
    () => (customer ? calculateCustomerBillingCycles(customer) : []),
    [customer, dailyRecords, payments]
  );

  const custPayments = useMemo(() => {
    if (!customer) return [];
    const q = searchTerm.toLowerCase().trim();
    return payments
      .filter((p) => p.customerId === customer.id)
      .filter(
        (p) =>
          !q ||
          p.bsDate.includes(q) ||
          p.receiptNumber.toLowerCase().includes(q) ||
          p.paymentMethod.toLowerCase().includes(q) ||
          (p.transactionRef || '').toLowerCase().includes(q) ||
          (p.note || '').toLowerCase().includes(q)
      );
  }, [customer, payments, searchTerm]);

  const custDaily = useMemo(() => {
    if (!customer) return [];
    const q = searchTerm.toLowerCase().trim();
    return dailyRecords
      .filter((r) => r.customerId === customer.id)
      .filter((r) => !q || r.bsDate.includes(q) || (r.note || '').toLowerCase().includes(q));
  }, [customer, dailyRecords, searchTerm]);

  const custNoMilk = useMemo(() => {
    if (!customer) return [];
    const q = searchTerm.toLowerCase().trim();
    return noMilkDays
      .filter((n) => n.customerId === customer.id)
      .filter((n) => !q || n.bsDate.includes(q) || (n.reason || '').toLowerCase().includes(q));
  }, [customer, noMilkDays, searchTerm]);

  const custAudits = useMemo(() => {
    if (!customer) return [];
    const q = searchTerm.toLowerCase().trim();
    return auditLogs
      .filter((a) => a.customerId === customer.id)
      .filter(
        (a) =>
          !q ||
          a.description.toLowerCase().includes(q) ||
          (a.targetDateBS || '').includes(q) ||
          a.action.toLowerCase().includes(q)
      );
  }, [customer, auditLogs, searchTerm]);

  const custFinalBills = useMemo(() => {
    if (!customer) return [];
    return finalBills.filter((b) => b.customerId === customer.id);
  }, [customer, finalBills]);

  if (!isOpen || !customer) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[55] bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white w-full max-w-lg max-h-[94vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-800 to-blue-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <History className="w-5 h-5 text-blue-300 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-black truncate">
                ग्राहक पूर्ण इतिहास (Customer History)
              </h3>
              <p className="text-[11px] text-blue-200 truncate font-bold">
                {trData(customer.name)} • ID: {customer.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 5 Tabs Navigation */}
        <div className="px-3 pt-2.5 pb-2 border-b border-slate-100 bg-slate-50 flex items-center gap-1 overflow-x-auto shrink-0 text-[11px] font-black">
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onChangeTab('bills');
            }}
            className={`px-2.5 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
              activeTab === 'bills' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            🧾 बिल चक्र ({custCycles.length})
          </button>
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onChangeTab('payments');
            }}
            className={`px-2.5 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
              activeTab === 'payments' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            💵 भुक्तानी ({payments.filter((p) => p.customerId === customer.id).length})
          </button>
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onChangeTab('daily');
            }}
            className={`px-2.5 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
              activeTab === 'daily' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            🥛 दैनिक दूध ({dailyRecords.filter((r) => r.customerId === customer.id).length})
          </button>
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onChangeTab('nomilk');
            }}
            className={`px-2.5 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
              activeTab === 'nomilk' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            🚫 दूध गएन ({noMilkDays.filter((n) => n.customerId === customer.id).length})
          </button>
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onChangeTab('audit');
            }}
            className={`px-2.5 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
              activeTab === 'audit' ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            🛡️ अडिट लग ({auditLogs.filter((a) => a.customerId === customer.id).length})
          </button>
        </div>

        {/* Search Filter */}
        {activeTab !== 'bills' && (
          <div className="px-3.5 pt-2.5 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="BS मिति (2083-...), रसिद वा विवरण खोज्नुहोस्..."
                className="w-full pl-8 pr-3 py-1.5 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-3.5 overflow-y-auto space-y-2.5 flex-1">
          {/* TAB 1: MONTHLY BILLS & FINAL BILLS */}
          {activeTab === 'bills' && (
            <div className="space-y-2.5">
              {custFinalBills.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-black text-rose-700 uppercase">
                    अन्तिम बिलहरू (Final End Bills)
                  </div>
                  {custFinalBills.map((fb) => (
                    <div
                      key={fb.id}
                      className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-black text-rose-950">
                          🛑 Final Bill ({trNum(fb.startDateBS)} → {trNum(fb.endDateBS)})
                        </div>
                        <div className="text-[10px] text-rose-700 font-bold">
                          कुल दूध: {trNum(fb.totalMilkLtr)}L • रकम: रु {trNum(fb.totalMilkAmount.toLocaleString())}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onViewFinalBill(fb)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-600 text-white text-[10px] font-black cursor-pointer"
                      >
                        हेर्नुहोस्
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {custCycles.map((bill) => (
                <div
                  key={bill.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-black text-slate-900">
                        चक्र #{trNum(bill.cycleNumber)}: {trData(bill.cycleName)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold">
                        {trNum(bill.fromBsDate)} देखि {trNum(bill.toBsDate)} ({trNum(bill.totalDays)} दिन) • Due: {trNum(bill.dueDateBS)}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        bill.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : bill.status === 'overdue'
                          ? 'bg-rose-100 text-rose-800'
                          : bill.status === 'partial'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {bill.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 bg-white p-2 rounded-xl border border-slate-100 text-center text-[10px] font-bold">
                    <div>
                      <span className="text-slate-400 block">दूध</span>
                      <span className="text-slate-900 font-black">{bill.totalMilkLtr} L</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">अवधि बिल</span>
                      <span className="text-slate-900 font-black">रु {bill.currentBillAmount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">प्राप्त</span>
                      <span className="text-emerald-700 font-black">रु {(bill.allocatedPaid || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">बाँकी</span>
                      <span className="text-rose-700 font-black">रु {bill.remainingBalance.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onShareWhatsAppBill(customer, bill)}
                      className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black flex items-center gap-1 cursor-pointer"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onViewReceipt(customer, null, bill)}
                      className="px-2.5 py-1 rounded-xl bg-slate-200 text-slate-800 text-[10px] font-black flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3 h-3" />
                      <span>रसिद / प्रिन्ट</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: PAYMENTS (WITH INLINE EDIT + AUDIT TRAIL) */}
          {activeTab === 'payments' && (
            <div className="space-y-2">
              {custPayments.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">कुनै भुक्तानी भेटिएन।</p>
              ) : (
                custPayments.map((pay) => {
                  const isEditing = editingPaymentId === pay.id;
                  return (
                    <div
                      key={pay.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                    >
                      {isEditing ? (
                        <div className="space-y-2 bg-white p-2.5 rounded-xl border border-blue-200">
                          <div className="font-black text-blue-900">
                            भुक्तानी सम्पादन ({pay.receiptNumber})
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block">रकम (रु)</label>
                              <input
                                type="number"
                                value={editPayAmount}
                                onChange={(e) => setEditPayAmount(e.target.value)}
                                className="w-full p-1.5 rounded-lg border border-slate-200 font-black text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block">माध्यम</label>
                              <select
                                value={editPayMethod}
                                onChange={(e) => setEditPayMethod(e.target.value as MilkPaymentMethod)}
                                className="w-full p-1.5 rounded-lg border border-slate-200 font-bold text-xs"
                              >
                                <option value="cash">Cash (नगद)</option>
                                <option value="esewa">eSewa</option>
                                <option value="khalti">Khalti</option>
                                <option value="bank">Bank</option>
                                <option value="qr">QR</option>
                              </select>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={editPayNote}
                            onChange={(e) => setEditPayNote(e.target.value)}
                            placeholder="संशोधन कारण / टिप्पणी..."
                            className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-bold"
                          />
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingPaymentId(null)}
                              className="w-1/2 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px] cursor-pointer"
                            >
                              रद्द
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const amt = parseFloat(editPayAmount) || 0;
                                if (amt > 0) {
                                  playSuccessSound();
                                  onUpdatePayment(pay.id, amt, editPayMethod, editPayNote);
                                  setEditingPaymentId(null);
                                }
                              }}
                              className="w-1/2 py-1.5 rounded-lg bg-blue-600 text-white font-black text-[11px] cursor-pointer"
                            >
                              अपडेट सेभ
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-black text-emerald-800 text-sm">
                                रु {pay.amount.toLocaleString()}{' '}
                                <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded uppercase">
                                  {pay.paymentMethod} • {pay.paymentType}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                                📅 {trNum(pay.bsDate)} • रसिद: {pay.receiptNumber}
                                {pay.transactionRef ? ` • Ref: ${pay.transactionRef}` : ''}
                              </div>
                              {pay.billingPeriod && (
                                <div className="text-[10px] text-blue-700 font-bold">
                                  अवधि: {trNum(pay.billingPeriod)}
                                </div>
                              )}
                              {pay.note && (
                                <div className="text-[10px] text-slate-600 italic mt-0.5">
                                  &quot;{trData(pay.note)}&quot;
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onShareWhatsAppReceipt(customer, pay)}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 cursor-pointer"
                                title="WhatsApp"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onViewReceipt(customer, pay, null)}
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-700 cursor-pointer"
                                title="रसिद"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPaymentId(pay.id);
                                  setEditPayAmount(String(pay.amount));
                                  setEditPayMethod(pay.paymentMethod);
                                  setEditPayNote(pay.note || '');
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-blue-50 cursor-pointer"
                                title="भुक्तानी सम्पादन (Edit Payment)"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeletePayment(pay)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                                title="हटाउनुहोस्"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {pay.auditHistory && pay.auditHistory.length > 1 && (
                            <div className="bg-amber-50/70 rounded-xl p-2 border border-amber-200 text-[10px] text-amber-900 space-y-0.5">
                              <span className="font-black">संशोधन इतिहास:</span>
                              {pay.auditHistory.map((h, i) => (
                                <div key={i}>
                                  • {h.action.toUpperCase()}: {h.note} ({new Date(h.timestamp).toLocaleString()})
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: DAILY MILK RECORDS */}
          {activeTab === 'daily' && (
            <div className="space-y-1.5">
              {custDaily.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">कुनै दैनिक रेकर्ड भेटिएन।</p>
              ) : (
                custDaily.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-black text-slate-900 flex items-center gap-1.5">
                        <span>📅 {trNum(rec.bsDate)}</span>
                        {rec.isNoMilk ? (
                          <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-black">
                            🚫 दूध गएन (रु ०)
                          </span>
                        ) : (
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-black">
                            {trNum(rec.totalMilk)} L • रु {trNum(rec.totalAmount.toLocaleString())}
                          </span>
                        )}
                      </div>
                      {!rec.isNoMilk && (
                        <div className="text-[10px] text-slate-500 font-bold">
                          बिहान: {trNum(rec.morningMilk)}L • बेलुका: {trNum(rec.eveningMilk)}L (@ रु {trNum(rec.ratePerLtr)}/L)
                          {rec.note ? ` • ${trData(rec.note)}` : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditDailyRecord(customer, rec)}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
                        title="सम्पादन (Edit Entry)"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDailyRecord(rec)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                        title="हटाउनुहोस्"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: NO MILK DAYS */}
          {activeTab === 'nomilk' && (
            <div className="space-y-1.5">
              {custNoMilk.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">कुनै दूध नदिएको दिन दर्ता छैन।</p>
              ) : (
                custNoMilk.map((nm) => (
                  <div
                    key={nm.id}
                    className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-black text-amber-950">🚫 {trNum(nm.bsDate)} BS</div>
                      <div className="text-[10px] text-amber-800 font-bold">
                        कारण: {nm.reason ? trData(nm.reason) : 'छुट्टी / दूध गएन'} • रु ०
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteNoMilkDay(nm)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 cursor-pointer"
                      title="No Milk हटाउनुहोस्"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-1.5">
              {custAudits.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">कुनै अडिट लग उपलब्ध छैन।</p>
              ) : (
                custAudits.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="font-bold text-slate-800">{trData(log.description)}</div>
                    {log.targetDateBS && (
                      <div className="text-[10px] text-blue-700 font-bold">मिति: {trNum(log.targetDateBS)} BS</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// SECTION 14: DEDICATED REPORTS & STATEMENTS MODAL
// -------------------------------------------------------------

interface MilkReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: MilkCustomer[];
  initialCustomer: MilkCustomer | null;
  dailyRecords: DailyMilkRecord[];
  payments: MilkPayment[];
  finalBills: MilkFinalBill[];
  showToast: (msg: string) => void;
  language?: Language;
}

type ReportKind = 'daily' | 'monthly' | 'custom_range' | 'all_time' | 'pending_statement' | 'final_bill';

export const MilkReportsModal: React.FC<MilkReportsModalProps> = ({
  isOpen,
  onClose,
  customers,
  initialCustomer,
  dailyRecords,
  payments,
  finalBills,
  showToast,
  language = 'ne',
}) => {
  const trData = (v?: string | null) => translateUserData(v || '', language);
  const trNum = (v: string | number) => localizeNumberString(v, language);
  const [selectedCustId, setSelectedCustId] = useState<string>(
    initialCustomer?.id || customers[0]?.id || ''
  );
  const [reportKind, setReportKind] = useState<ReportKind>('custom_range');
  const [fromDateISO, setFromDateISO] = useState<string>(() => {
    const c = initialCustomer || customers[0];
    return c?.startDate || getTodayISOLocal();
  });
  const [toDateISO, setToDateISO] = useState<string>(() => getTodayISOLocal());
  const [selectedCycleIndex, setSelectedCycleIndex] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;
    const preferred = initialCustomer || customers[0];
    if (preferred) {
      setSelectedCustId(preferred.id);
      setFromDateISO(preferred.startDate || getTodayISOLocal());
      setToDateISO(getTodayISOLocal());
      setSelectedCycleIndex(0);
    }
  }, [isOpen, initialCustomer?.id]);

  const activeCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustId) || initialCustomer || customers[0] || null,
    [customers, selectedCustId, initialCustomer]
  );

  const custCycles = useMemo(
    () => (activeCustomer ? calculateCustomerBillingCycles(activeCustomer) : []),
    [activeCustomer, dailyRecords, payments]
  );

  const activeFinalBill = useMemo(
    () => (activeCustomer ? finalBills.find((b) => b.customerId === activeCustomer.id) || null : null),
    [activeCustomer, finalBills]
  );

  const billSummary = useMemo(() => {
    if (!activeCustomer) return null;

    let periodStartISO = activeCustomer.startDate;
    let periodEndISO = getTodayISOLocal();
    let title = 'दुध आपूर्ति तथा हिसाब बिल (MILK SUPPLY BILL)';
    let billNo: string | undefined;
    let includePostEnd = false;

    if (reportKind === 'daily') {
      periodStartISO = toDateISO;
      periodEndISO = toDateISO;
      title = 'दैनिक दुध बिल विवरण (DAY SUMMARY BILL)';
    } else if (reportKind === 'monthly') {
      const cyc = custCycles[selectedCycleIndex] || custCycles[0];
      if (cyc) {
        periodStartISO = cyc.fromIso;
        periodEndISO = cyc.toIso;
        title = `मासिक दुध बिल — चक्र #${cyc.cycleNumber} (${cyc.cycleName})`;
        billNo = `GD-C${cyc.cycleNumber}-${cyc.fromBsDate.replace(/-/g, '').slice(2)}`;
      }
    } else if (reportKind === 'custom_range') {
      periodStartISO = fromDateISO <= toDateISO ? fromDateISO : toDateISO;
      periodEndISO = fromDateISO <= toDateISO ? toDateISO : fromDateISO;
      title = 'अवधिगत दुध बिल (PERIOD MILK BILL)';
    } else if (reportKind === 'final_bill' && activeFinalBill) {
      periodStartISO = activeFinalBill.startDateISO;
      periodEndISO = activeFinalBill.endDateISO;
      title = 'अन्तिम दुध हिसाब तथा अन्तिम बिल (FINAL END BILL)';
      billNo = `GD-FINAL-${activeFinalBill.id.slice(-5).toUpperCase()}`;
      includePostEnd = true;
    } else if (reportKind === 'pending_statement') {
      periodStartISO = activeCustomer.startDate;
      periodEndISO = getTodayISOLocal();
      title = 'कुल बक्यौता तथा भुक्तानी विवरण (PENDING STATEMENT)';
      includePostEnd = true;
    } else {
      periodStartISO = activeCustomer.startDate;
      periodEndISO = getTodayISOLocal();
      title = 'सम्पूर्ण दुध हिसाब बिल (ALL-TIME STATEMENT)';
      includePostEnd = true;
    }

    return buildGauleDoodhBillSummary(activeCustomer, periodStartISO, periodEndISO, {
      billNumber: billNo,
      billTitle: title,
      includePostEndPayments: includePostEnd,
      dailyRecordsOverride: dailyRecords.filter((r) => r.customerId === activeCustomer.id),
      paymentsOverride: payments.filter((p) => p.customerId === activeCustomer.id),
    });
  }, [
    activeCustomer,
    reportKind,
    fromDateISO,
    toDateISO,
    selectedCycleIndex,
    custCycles,
    activeFinalBill,
    dailyRecords,
    payments,
  ]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[55] bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-slate-100 w-full max-w-2xl max-h-[94vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-blue-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-200" />
            <div>
              <h3 className="text-sm font-black">GAULE DOODH — बिल तथा रिपोर्ट (Bill &amp; Statements)</h3>
              <p className="text-[11px] text-blue-100">
                Start Date → End Date • पारम्परिक प्रिन्ट, A4 PDF, Download र WhatsApp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3 text-xs">
          {/* Customer Selector */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200">
            <span className="font-black text-slate-600 pl-1">ग्राहक:</span>
            <select
              value={activeCustomer?.id || ''}
              onChange={(e) => {
                playTapSound();
                const nextId = e.target.value;
                const nextCust = customers.find((c) => c.id === nextId);
                setSelectedCustId(nextId);
                if (nextCust?.startDate) setFromDateISO(nextCust.startDate);
                setSelectedCycleIndex(0);
              }}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-black text-slate-900 outline-none"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {trData(c.name)} ({trNum(c.startBsDate)})
                </option>
              ))}
            </select>
          </div>

          {/* Report Type Selector */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'custom_range', label: '🔍 मिति अवधि (Start → End)' },
              { id: 'monthly', label: '🗓 बिल चक्र (Billing Cycles)' },
              { id: 'all_time', label: '📚 सम्पूर्ण (All-Time)' },
              { id: 'pending_statement', label: '⏳ बाँकी विवरण (Pending)' },
              { id: 'daily', label: '📅 एक दिन (Single Day)' },
              ...(activeFinalBill
                ? [{ id: 'final_bill', label: '🛑 अन्तिम बिल (Final Bill)' }]
                : []),
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  playTapSound();
                  setReportKind(item.id as ReportKind);
                }}
                className={`px-2.5 py-1.5 rounded-xl font-black text-[11px] border transition cursor-pointer ${
                  reportKind === item.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Report Date Parameters */}
          {reportKind === 'monthly' && custCycles.length > 0 && (
            <select
              value={selectedCycleIndex}
              onChange={(e) => setSelectedCycleIndex(parseInt(e.target.value, 10))}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-black text-slate-800"
            >
              {custCycles.map((cyc, idx) => (
                <option key={cyc.id} value={idx}>
                  चक्र #{cyc.cycleNumber}: {cyc.cycleName} ({cyc.fromBsDate} → {cyc.toBsDate})
                </option>
              ))}
            </select>
          )}

          {reportKind === 'daily' && (
            <div className="bg-white p-2.5 rounded-2xl border border-slate-200">
              <label className="font-bold text-slate-700 block mb-1">मिति छान्नुहोस् (BS Date)</label>
              <NepaliBSDatePicker value={toDateISO} onChange={(iso) => setToDateISO(iso)} buttonClassName="w-full text-xs" />
            </div>
          )}

          {reportKind === 'custom_range' && (
            <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-2xl border border-slate-200">
              <div>
                <label className="font-bold text-slate-700 block mb-1">सुरु मिति (Start Date - BS)</label>
                <NepaliBSDatePicker value={fromDateISO} onChange={(iso) => setFromDateISO(iso)} buttonClassName="w-full text-xs" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">अन्तिम मिति (End Date - BS)</label>
                <NepaliBSDatePicker value={toDateISO} onChange={(iso) => setToDateISO(iso)} buttonClassName="w-full text-xs" />
              </div>
            </div>
          )}

          {/* GAULE DOODH Traditional Printed Bill (Period Summary Only — NO Daily Entries Table) */}
          {activeCustomer && billSummary && (
            <GauleDoodhTraditionalBill
              summary={billSummary}
              isFinalEndBill={reportKind === 'final_bill'}
              onToast={showToast}
              extraActionSlot={
                <button
                  type="button"
                  onClick={() => {
                    exportMilkDataToCSV(activeCustomer);
                    showToast(`${trData(activeCustomer.name)} को Excel CSV डाउनलोड भयो!`);
                  }}
                  className="w-full py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                  <span>ग्राहक Excel / CSV डेटा डाउनलोड (Backup Export)</span>
                </button>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};
