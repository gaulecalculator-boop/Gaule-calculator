/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Customer Search & Permanent Khata View — Hamro Pasal
 * CRITICAL REQUIREMENT:
 * - Search by customer name or mobile number
 * - Complete breakdown of previous visits & orders
 * - Food item breakdown (plates, bottles, prices)
 * - Atomic calculation: Previous Balance + New Order - Payment = Total Due
 * - Partial payment history & Collect Payment modal
 * - "NEW ORDER" and "COLLECT PAYMENT" buttons
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  User,
  Phone,
  Clock,
  PlusCircle,
  Banknote,
  ChevronRight,
  Receipt,
  FileText,
  Calendar,
  Share2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { CustomerRecord, CustomerOrder, CustomerPaymentRecord, ShopProfile } from '../types';
import { pasalStorage } from '../storage/pasalStorage';
import { CollectPaymentModal } from '../components/CollectPaymentModal';
import { ReceiptPrintModal } from '../components/ReceiptPrintModal';
import { playTapSound } from '../../utils/audio';
import { formatDateToBS, formatDateToBSWithTime } from '../../utils/nepaliCalendar';
import { openExternalUrl } from '../../utils/androidBridge';

interface CustomerKhataViewProps {
  shop: ShopProfile;
  onStartNewOrderForCustomer: (customer: CustomerRecord) => void;
  preSelectedCustomerId?: string | null;
}

export const CustomerKhataView: React.FC<CustomerKhataViewProps> = ({
  shop,
  onStartNewOrderForCustomer,
  preSelectedCustomerId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<CustomerOrder | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'payments'>('orders');
  const [refreshEpoch, setRefreshEpoch] = useState(Date.now());

  // Subscribe to storage updates
  useEffect(() => {
    const unsub = pasalStorage.subscribe(() => {
      setRefreshEpoch(Date.now());
      if (selectedCustomer) {
        const fresh = pasalStorage.getCustomerById(selectedCustomer.id, shop.id);
        if (fresh) setSelectedCustomer(fresh);
      }
    });
    return unsub;
  }, [selectedCustomer, shop.id]);

  // Handle pre-selected customer if passed from POS
  useEffect(() => {
    if (preSelectedCustomerId) {
      const cust = pasalStorage.getCustomerById(preSelectedCustomerId, shop.id);
      if (cust) setSelectedCustomer(cust);
    }
  }, [preSelectedCustomerId, shop.id]);

  const searchResults = pasalStorage.searchCustomers(searchQuery, shop.id);
  const customerOrders = selectedCustomer
    ? pasalStorage.getCustomerOrders(selectedCustomer.id, shop.id)
    : [];
  const customerPayments = selectedCustomer
    ? pasalStorage.getCustomerPayments(selectedCustomer.id, shop.id)
    : [];

  const handleShareStatement = () => {
    if (!selectedCustomer) return;
    playTapSound();
    let text = `*${shop.name} — ग्राहक खाता स्टेटमेन्ट*\n`;
    text += `ग्राहक: *${selectedCustomer.name}*\n`;
    if (selectedCustomer.mobile) text += `मोबाइल: ${selectedCustomer.mobile}\n`;
    text += `--------------------------------\n`;
    text += `कुल किनमेल (Total Purchased): रु ${selectedCustomer.totalLifetimePurchases.toLocaleString()}\n`;
    text += `हालसम्म भुक्तान (Total Paid): रु ${selectedCustomer.totalAmountPaid.toLocaleString()}\n`;
    text += `*हाल बाँकी उधारो (OUTSTANDING DUE): रु ${selectedCustomer.outstandingBalance.toLocaleString()}*\n`;
    text += `--------------------------------\n`;
    text += `अन्तिम ५ कारोबार:\n`;

    customerOrders.slice(0, 5).forEach((o) => {
      text += `• अर्डर #${o.orderNumber} (वि.सं. ${formatDateToBS(o.createdAt, 'ne')}): रु ${o.totalBill} (बुझाएको: रु ${o.amountReceived})\n`;
    });

    text += `--------------------------------\nसम्पर्क: ${shop.mobile || shop.name}`;
    const encoded = encodeURIComponent(text);
    const phone = selectedCustomer.mobile ? selectedCustomer.mobile.replace(/\D/g, '') : '';
    const url = phone ? `https://wa.me/977${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    openExternalUrl(url);
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* Prominent Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs space-y-2">
        <label className="block text-xs font-black text-slate-800 flex items-center gap-2">
          <span>🔍</span>
          <span>ग्राहक खोज्नुहोस् (Search Customer by Name or Mobile)</span>
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ग्राहकको नाम वा मोबाइल नम्बर खोज्नुहोस् (उदा: Raju / 9800000000)"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 p-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Split Layout or Customer List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left Column: Customer Search Results List */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 uppercase flex items-center gap-1.5">
              <span>👥</span>
              <span>ग्राहक सूची ({searchResults.length})</span>
            </span>
            <span className="text-[10px] font-bold text-slate-500">
              कुल ग्राहक: {pasalStorage.getCustomers(shop.id).length}
            </span>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <p className="text-2xl">👤</p>
                <p className="text-xs font-bold">कुनै ग्राहक भेटिएन</p>
                <p className="text-[10px]">नयाँ अर्डर लिँदा ग्राहक स्वतः थपिनेछ वा माथि नाम खोज्नुहोस्।</p>
              </div>
            ) : (
              searchResults.map((cust) => {
                const isSelected = selectedCustomer?.id === cust.id;
                return (
                  <div
                    key={cust.id}
                    onClick={() => {
                      playTapSound();
                      setSelectedCustomer(cust);
                    }}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-400'
                        : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs flex-shrink-0 ${
                          cust.outstandingBalance > 0
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {cust.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-slate-900 truncate">{cust.name}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                          {cust.mobile ? (
                            <>
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{cust.mobile}</span>
                            </>
                          ) : (
                            <span>सम्पर्क नम्बर छैन</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p
                        className={`text-xs font-black ${
                          cust.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {cust.outstandingBalance > 0
                          ? `रु ${cust.outstandingBalance.toLocaleString()}`
                          : 'चुक्ता (0)'}
                      </p>
                      <span className="text-[9px] font-bold text-slate-400">
                        {cust.outstandingBalance > 0 ? 'बाँकी उधारो' : 'साफ'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (Span 2): Selected Customer Details, Khata Ledger & Action Buttons */}
        <div className="md:col-span-2 space-y-4">
          {selectedCustomer ? (
            <div className="space-y-4">
              {/* Customer Hero Profile Banner */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 p-1 border border-white/20 flex items-center justify-center font-black text-xl text-amber-300">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black tracking-tight">{selectedCustomer.name}</h2>
                        <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-bold">
                          ग्राहक खाता
                        </span>
                      </div>
                      <p className="text-xs text-blue-200 mt-0.5 flex items-center gap-1.5 font-medium">
                        <Phone className="w-3.5 h-3.5 text-blue-300" />
                        <span>{selectedCustomer.mobile || 'सम्पर्क नम्बर उपलब्ध छैन'}</span>
                      </p>
                    </div>
                  </div>

                  {/* WhatsApp Statement Share */}
                  <button
                    onClick={handleShareStatement}
                    className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>खाता स्टेटमेन्ट WhatsApp मा पठाउनुहोस्</span>
                  </button>
                </div>

                {/* 3 Metric Cards matching user scenario */}
                <div className="grid grid-cols-3 gap-2.5 mt-5">
                  <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                    <p className="text-[10px] font-bold text-blue-200 uppercase">कुल किनमेल (Total Bill)</p>
                    <p className="text-sm sm:text-base font-black text-white mt-1">
                      रु {selectedCustomer.totalLifetimePurchases.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                    <p className="text-[10px] font-bold text-emerald-300 uppercase">हालसम्म भुक्तानी (Paid)</p>
                    <p className="text-sm sm:text-base font-black text-emerald-300 mt-1">
                      रु {selectedCustomer.totalAmountPaid.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-rose-500/25 backdrop-blur-md border border-rose-400/30">
                    <p className="text-[10px] font-bold text-rose-200 uppercase">कुल बाँकी (UNPAID DUE)</p>
                    <p className="text-sm sm:text-base font-black text-rose-300 mt-1">
                      रु {selectedCustomer.outstandingBalance.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Action Buttons: 1. NEW ORDER 2. COLLECT PAYMENT */}
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/10">
                  <button
                    onClick={() => {
                      playTapSound();
                      onStartNewOrderForCustomer(selectedCustomer);
                    }}
                    className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                    <span>नयाँ अर्डर लिनुहोस् (NEW ORDER)</span>
                  </button>

                  <button
                    onClick={() => {
                      playTapSound();
                      setIsCollectModalOpen(true);
                    }}
                    disabled={selectedCustomer.outstandingBalance <= 0}
                    className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                  >
                    <Banknote className="w-4 h-4 stroke-[2.5]" />
                    <span>उधारो संकलन (COLLECT PAYMENT)</span>
                  </button>
                </div>
              </div>

              {/* Tabs: Orders History vs Payments History */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs space-y-3">
                <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold select-none">
                  <button
                    onClick={() => {
                      playTapSound();
                      setActiveTab('orders');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl transition text-center cursor-pointer ${
                      activeTab === 'orders'
                        ? 'bg-white text-blue-700 shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📋 अघिल्लो अर्डरहरू (Previous Orders - {customerOrders.length})
                  </button>
                  <button
                    onClick={() => {
                      playTapSound();
                      setActiveTab('payments');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl transition text-center cursor-pointer ${
                      activeTab === 'payments'
                        ? 'bg-white text-blue-700 shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    💰 भुक्तानी इतिहास (Payment History - {customerPayments.length})
                  </button>
                </div>

                {/* Tab 1: Detailed Orders Breakdown */}
                {activeTab === 'orders' && (
                  <div className="space-y-3">
                    {customerOrders.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">
                        यो ग्राहकको कुनै अर्डर फेला परेन।
                      </p>
                    ) : (
                      customerOrders.map((ord) => (
                        <div
                          key={ord.id}
                          className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">
                                अर्डर #{ord.orderNumber}
                              </span>
                              {ord.tableNumber && (
                                <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.2 rounded-full">
                                  टेबल {ord.tableNumber}
                                </span>
                              )}
                              <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.2 rounded uppercase">
                                {ord.orderType}
                              </span>
                            </div>
                            <span className="text-[10px] font-medium text-slate-500">
                              वि.सं. {formatDateToBSWithTime(ord.createdAt, 'ne')}
                            </span>
                          </div>

                          {/* Itemized Food List */}
                          <div className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-1.5 text-xs">
                            {ord.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-slate-700 text-[11px]">
                                <span className="font-semibold">
                                  • {item.productName} ({item.quantity} {item.unit})
                                </span>
                                <span className="font-mono font-bold text-slate-900">
                                  रु {item.total}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Billing breakdown */}
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 font-bold">
                            <div>
                              <span className="text-slate-500 text-[11px]">कुल बिल: </span>
                              <span className="text-slate-900">रु {ord.totalBill}</span>
                              <span className="mx-2 text-slate-300">|</span>
                              <span className="text-emerald-700 text-[11px]">तिरेको: </span>
                              <span className="text-emerald-700">रु {ord.amountReceived}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-rose-600 text-xs font-extrabold">
                                बाँकी: रु {ord.remainingBalance}
                              </span>
                              <button
                                onClick={() => {
                                  playTapSound();
                                  setViewingOrder(ord);
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold transition cursor-pointer"
                              >
                                रसिद (Bill)
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab 2: Payment History */}
                {activeTab === 'payments' && (
                  <div className="space-y-2.5">
                    {customerPayments.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">
                        कुनै भुक्तानी रेकर्ड छैन।
                      </p>
                    ) : (
                      customerPayments.map((pay) => (
                        <div
                          key={pay.id}
                          className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between text-xs"
                        >
                          <div className="space-y-0.5">
                            <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                              <span>✅</span>
                              <span>भुक्तानी प्राप्त भयो ({pay.paymentMethod.toUpperCase()})</span>
                            </p>
                            <p className="text-[10px] text-slate-500">
                              वि.सं. {formatDateToBSWithTime(pay.timestamp, 'ne')} {pay.notes ? `(${pay.notes})` : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-emerald-700 text-sm">
                              + रु {pay.amount.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-slate-600">
                              बाँकी: रु {pay.remainingBalanceAfterPayment.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Prompt when no customer is selected */
            <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xs text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-3xl">
                📖
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                स्थायी ग्राहक खाता तथा उधारो विवरण (Permanent Khata)
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                देब्रेपट्टीको ग्राहक सूचीबाट कुनै ग्राहक छान्नुहोस् वा माथि नाम/मोबाइल नम्बर खोज्नुहोस्। ग्राहकको अघिल्लो अर्डरहरू, खाएको खाना र बाँकी रकम हेर्न सकिन्छ।
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Collect Payment Modal */}
      {selectedCustomer && (
        <CollectPaymentModal
          isOpen={isCollectModalOpen}
          onClose={() => setIsCollectModalOpen(false)}
          customer={selectedCustomer}
          onPaymentCollected={() => {
            setRefreshEpoch(Date.now());
          }}
        />
      )}

      {/* Bill View / Print Modal */}
      {viewingOrder && (
        <ReceiptPrintModal
          isOpen={!!viewingOrder}
          onClose={() => setViewingOrder(null)}
          order={viewingOrder}
          shop={shop}
          customer={selectedCustomer}
        />
      )}
    </div>
  );
};
