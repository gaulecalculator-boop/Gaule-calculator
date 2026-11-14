/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * UDHAR KHATA (CUSTOMER CREDIT LEDGER) — हाम्रो पसल
 * Complete Centralized Credit & Customer Ledger System
 * 
 * Works across all 10 shop categories (Hotel/Restaurant, Grocery, Clothing, etc.)
 * Real-time Firebase Firestore Sync + Offline-first Local Storage
 */

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Users,
  FileText,
  Printer,
  Share2,
  Calendar,
  Trash2,
  Clock,
  ChevronRight,
  ShieldCheck,
  Scale,
  X,
  Phone,
  MessageCircle,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import {
  ShopProfile,
  CustomerRecord,
  CustomerOrder,
  CustomerPaymentRecord,
  PaymentMethod,
  OrderLineItem,
} from '../types';
import { pasalStorage } from '../storage/pasalStorage';
import { pasalFirestoreSync } from '../storage/pasalFirestoreSync';
import { CollectPaymentModal } from '../components/CollectPaymentModal';
import { ReceiptPrintModal } from '../components/ReceiptPrintModal';
import { playTapSound } from '../../utils/audio';
import { Language } from '../../types';
import {
  translateUserData,
  localizeNumberString,
} from '../../utils/universalTranslator';
import { formatDateToBS } from '../../utils/nepaliCalendar';
import { pick5 } from '../../utils/i18nHelper';
import { NepaliBSDatePicker } from '../../components/common/NepaliBSDatePicker';
import { openExternalUrl } from '../../utils/androidBridge';

interface UdharKhataViewProps {
  shop: ShopProfile;
  initialCustomerId?: string;
  onNavigateToOrder?: (customer: CustomerRecord) => void;
  appLanguage?: Language;
}

export const UdharKhataView: React.FC<UdharKhataViewProps> = ({
  shop,
  initialCustomerId,
  onNavigateToOrder: _onNavigateToOrder,
  appLanguage = 'ne',
}) => {
  const p = (en: string, hi: string, bho: string, mai: string, ne: string) =>
    pick5(appLanguage, { en, hi, bho, mai, ne }, 'UdharKhataView');
  const trData = (s?: string) => translateUserData(s || '', appLanguage);
  const trNum = (v: string | number) => localizeNumberString(v, appLanguage);
  const rsPrefix = appLanguage === 'en' ? 'Rs.' : 'रु';
  const fmtCur = (n: number) => `${rsPrefix} ${trNum((n || 0).toLocaleString())}`;
  const bsPrefix = appLanguage === 'en' ? 'BS' : 'वि.सं.';
  const [customers, setCustomers] = useState<CustomerRecord[]>(pasalStorage.getCustomers(shop.id));
  const [orders, setOrders] = useState<CustomerOrder[]>(pasalStorage.getOrders(shop.id));
  const [payments, setPayments] = useState<CustomerPaymentRecord[]>(pasalStorage.getPayments(shop.id));

  // Search & filter state
  type UdharFilterType = 'with_due' | 'today_credit' | 'today_paid' | 'cleared' | 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<UdharFilterType>('all');
  const [sortBy, setSortBy] = useState<'balance_desc' | 'recent' | 'name'>('balance_desc');
  const [udharDate, setUdharDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Selected customer for detailed ledger account
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialCustomerId || null);

  // Modals state
  const [isAddUdharModalOpen, setIsAddUdharModalOpen] = useState(false);
  const [isCollectPaymentModalOpen, setIsCollectPaymentModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [paymentTargetCustomer, setPaymentTargetCustomer] = useState<CustomerRecord | null>(null);
  const [printTargetOrder, setPrintTargetOrder] = useState<CustomerOrder | null>(null);

  // Add Udhar Form State
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [newCustomerMobile, setNewCustomerMobile] = useState<string>('');
  const [newCustomerAddress, setNewCustomerAddress] = useState<string>('');
  const [newCustomerPhoto, setNewCustomerPhoto] = useState<string>('');
  const [lineItems, setLineItems] = useState<OrderLineItem[]>([
    { productId: 'custom_1', productName: '', unitPrice: 0, quantity: 1, unit: 'pcs', total: 0 },
  ]);
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [udharNotes, setUdharNotes] = useState<string>('');

  // Robust image compression for gallery & camera photos (resizes to max 800px, quality 0.8 JPEG)
  const compressAndProcessImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 800; // Optimal for customer avatars without exceeding storage limits
            if (width > height && width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
              resolve(compressedDataUrl);
            } else {
              resolve(event.target?.result as string);
            }
          } catch {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = () => {
          // If image decoding fails, fallback to raw data URL
          resolve(event.target?.result as string);
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressAndProcessImage(file);
        setNewCustomerPhoto(compressed);
        playTapSound();
      } catch (err) {
        console.error('Error uploading photo:', err);
      }
      e.target.value = '';
    }
  };

  const handleUpdateCustomerPhotoDirectly = async (
    e: React.ChangeEvent<HTMLInputElement>,
    customer: CustomerRecord
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressAndProcessImage(file);
        const updated: CustomerRecord = {
          ...customer,
          photoUrl: compressed,
          updatedAt: Date.now(),
        };
        pasalStorage.saveCustomerRecord(updated);
        setCustomers(pasalStorage.getCustomers(shop.id));
        playTapSound();
      } catch (err) {
        console.error('Error updating customer photo:', err);
      }
      e.target.value = '';
    }
  };

  // Adjustment Form State
  const [adjType, setAdjType] = useState<'adjustment_credit' | 'adjustment_debit'>('adjustment_credit');
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjReason, setAdjReason] = useState<string>('');

  // Refresh data on storage change
  useEffect(() => {
    const unsub = pasalStorage.subscribe(() => {
      setCustomers(pasalStorage.getCustomers(shop.id));
      setOrders(pasalStorage.getOrders(shop.id));
      setPayments(pasalStorage.getPayments(shop.id));
    });
    return unsub;
  }, [shop.id]);

  // Handle initial customer selection
  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    }
  }, [initialCustomerId]);

  // Derived Udhar Khata Dashboard Metrics
  const metrics = pasalStorage.getUdharKhataMetrics(shop.id);

  const startOfTodayTimestamp = new Date(new Date().setHours(0, 0, 0, 0)).getTime();

  // IDs of customers who took credit today
  const todayCreditCustomerIds = new Set(
    orders
      .filter((o) => o.createdAt >= startOfTodayTimestamp && (o.totalBill - o.amountReceived) > 0)
      .map((o) => o.customerId)
  );

  // IDs of customers who made payment today
  const todayPaidCustomerIds = new Set(
    payments
      .filter((p) => p.timestamp >= startOfTodayTimestamp && p.entryType !== 'adjustment_debit')
      .map((p) => p.customerId)
  );

  const clearedCustomersCount = customers.filter((c) => (c.outstandingBalance || 0) === 0).length;

  // Filtered & Sorted Customer List
  const filteredCustomers = customers
    .filter((c) => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || (c.mobile && c.mobile.includes(q));
      if (!matchesSearch) return false;

      // Status filter
      if (activeFilter === 'with_due') return (c.outstandingBalance || 0) > 0;
      if (activeFilter === 'today_credit') return todayCreditCustomerIds.has(c.id);
      if (activeFilter === 'today_paid') return todayPaidCustomerIds.has(c.id);
      if (activeFilter === 'cleared') return (c.outstandingBalance || 0) === 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'balance_desc') return (b.outstandingBalance || 0) - (a.outstandingBalance || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return (b.lastVisitTimestamp || 0) - (a.lastVisitTimestamp || 0);
    });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;
  const customerOrders = selectedCustomer ? orders.filter((o) => o.customerId === selectedCustomer.id) : [];
  const customerPayments = selectedCustomer ? payments.filter((p) => p.customerId === selectedCustomer.id) : [];

  // Combined chronological ledger entries for selected customer
  type LedgerEntry =
    | { type: 'order'; data: CustomerOrder; timestamp: number }
    | { type: 'payment'; data: CustomerPaymentRecord; timestamp: number };

  const combinedLedgerEntries: LedgerEntry[] = [
    ...customerOrders.map((o) => ({ type: 'order' as const, data: o, timestamp: o.createdAt })),
    ...customerPayments.map((p) => ({ type: 'payment' as const, data: p, timestamp: p.timestamp })),
  ].sort((a, b) => b.timestamp - a.timestamp);

  // Line items math for Add Udhar modal
  const udharSubtotal = lineItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const udharRemainingDue = Math.max(0, udharSubtotal - (amountReceived || 0));

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        productId: 'custom_' + Date.now(),
        productName: '',
        unitPrice: 0,
        quantity: 1,
        unit: 'pcs',
        total: 0,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const handleUpdateLineItem = (index: number, field: keyof OrderLineItem, val: any) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = val;
    const qty = typeof updated[index].quantity === 'number' ? updated[index].quantity : parseFloat(updated[index].quantity as any) || 0;
    const price = typeof updated[index].unitPrice === 'number' ? updated[index].unitPrice : parseFloat(updated[index].unitPrice as any) || 0;
    updated[index].total = Math.round(qty * price * 100) / 100;
    setLineItems(updated);
  };

  // Submit Add Udhar
  const handleSaveAddUdhar = (e: React.FormEvent) => {
    e.preventDefault();
    if (udharSubtotal <= 0) {
      alert(p('Please enter at least one item and its amount.', 'कृपया कम से कम एक सामान और उसकी राशि दर्ज करें।', 'कृपया कम से कम एक सामान आ ओकर रकम भरीं।', 'कृपया कम सँ कम एकटा सामान आ ओकर राशि दर्ज करू।', 'कृपया कम्तीमा एउटा सामान र त्यसको रकम प्रविष्ट गर्नुहोस्।'));
      return;
    }

    if (!newCustomerName.trim()) {
      alert(p('Please enter customer name.', 'कृपया ग्राहक का नाम दर्ज करें।', 'कृपया ग्राहक के नाम भरीं।', 'कृपया ग्राहकक नाम दर्ज करू।', 'कृपया ग्राहकको नाम प्रविष्ट गर्नुहोस्।'));
      return;
    }

    const customerToUse = pasalStorage.findOrCreateCustomer(
      newCustomerName.trim(),
      newCustomerMobile.trim(),
      shop.id
    );

    let needsCustomerSave = false;
    if (newCustomerAddress.trim() && customerToUse.address !== newCustomerAddress.trim()) {
      customerToUse.address = newCustomerAddress.trim();
      needsCustomerSave = true;
    }
    if ((newCustomerPhoto || '') !== (customerToUse.photoUrl || '')) {
      customerToUse.photoUrl = newCustomerPhoto || undefined;
      needsCustomerSave = true;
    }
    if (needsCustomerSave) {
      pasalStorage.saveCustomerRecord(customerToUse);
    }

    // Filter valid line items (support 0.5 kg, 57 pcs, etc.)
    const validItems = lineItems
      .filter((i) => {
        const qty = typeof i.quantity === 'number' ? i.quantity : parseFloat(i.quantity as any) || 0;
        const price = typeof i.unitPrice === 'number' ? i.unitPrice : parseFloat(i.unitPrice as any) || 0;
        return i.productName.trim() && price > 0 && qty > 0;
      })
      .map((i) => {
        const qty = typeof i.quantity === 'number' ? i.quantity : parseFloat(i.quantity as any) || 0;
        const price = typeof i.unitPrice === 'number' ? i.unitPrice : parseFloat(i.unitPrice as any) || 0;
        return {
          ...i,
          quantity: qty,
          unitPrice: price,
          total: Math.round(qty * price * 100) / 100,
        };
      });

    if (validItems.length === 0) {
      alert(p('Please enter valid item name, quantity and rate.', 'कृपया सामान का नाम, मात्रा और दर सही भरें।', 'कृपया सामान के नाम, मात्रा आ भाव सही से भरीं।', 'कृपया सामानक नाम, मात्रा आ दर सही भरू।', 'कृपया सामानको नाम, परिमाण र मूल्य सही भर्नुहोस्।'));
      return;
    }

    // Save order
    const createdOrder = pasalStorage.createOrder({
      shopId: shop.id,
      orderType: 'dine_in',
      customerId: customerToUse.id,
      customerName: customerToUse.name,
      customerMobile: customerToUse.mobile,
      items: validItems,
      subtotal: udharSubtotal,
      discount: 0,
      taxAmount: 0,
      serviceChargeAmount: 0,
      totalBill: udharSubtotal,
      amountReceived: amountReceived || 0,
      remainingBalance: udharRemainingDue,
      paymentMethod: paymentMethod,
      status: 'completed',
      notes: udharNotes.trim() ? `[Udhar] ${udharNotes.trim()}` : '[Udhar Khata]',
      createdAt: udharDate ? new Date(udharDate).getTime() : Date.now(),
    } as any);

    // Cloud Firestore sync
    pasalFirestoreSync.syncOrderToCloud(createdOrder);
    pasalFirestoreSync.syncCustomerToCloud(customerToUse);

    // Reset and close
    setIsAddUdharModalOpen(false);
    setSelectedCustomerId(customerToUse.id);
    setLineItems([{ productId: 'custom_1', productName: '', unitPrice: 0, quantity: 1, unit: 'pcs', total: 0 }]);
    setAmountReceived(0);
    setUdharNotes('');
    setNewCustomerName('');
    setNewCustomerMobile('');
    setNewCustomerAddress('');
    setNewCustomerPhoto('');
  };

  // Submit Safe Audit Adjustment
  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (adjAmount <= 0) {
      alert(p('Please enter a valid adjustment amount.', 'कृपया मान्य समायोजन राशि दर्ज करें।', 'कृपया सही सुधार रकम भरीं।', 'कृपया मान्य समायोजन राशि दर्ज करू।', 'कृपया मान्य समायोजन रकम प्रविष्ट गर्नुहोस्।'));
      return;
    }
    if (!adjReason.trim()) {
      alert(p('Please enter a reason for adjustment.', 'कृपया समायोजन का कारण लिखें।', 'कृपया सुधार के कारण लिखीं।', 'कृपया समायोजनक कारण लिखू।', 'कृपया समायोजनको कारण लेख्नुहोस्।'));
      return;
    }

    const adj = pasalStorage.recordAuditAdjustment(
      selectedCustomer.id,
      adjAmount,
      adjType,
      adjReason.trim(),
      shop.id
    );

    pasalFirestoreSync.syncPaymentToCloud(adj);
    setIsAdjustmentModalOpen(false);
    setAdjAmount(0);
    setAdjReason('');
  };

  // WhatsApp bill statement generator
  const handleShareWhatsApp = (customer: CustomerRecord) => {
    const noPhoneText = p('Not available', 'उपलब्ध नहीं', 'उपलब्ध नइखे', 'उपलब्ध नहि', 'सम्पर्क उपलब्ध छैन');
    const rawText =
      `*${p('My Shop — Udhar Khata Statement', 'हमारा दुकान — उधार खाता विवरण', 'हमर दोकान — उधार खाता विवरण', 'हमर दोकान — उधार खाता विवरण', 'हाम्रो पसल — उधार खाता विवरण')}*\n\n` +
      `🏢 *${p('Shop', 'दुकान', 'दोकान', 'दोकान', 'पसल')}:* ${trData(shop.name)}\n` +
      `📞 *${p('Contact', 'संपर्क', 'सम्पर्क', 'सम्पर्क', 'सम्पर्क')}:* ${trNum(shop.mobile)}\n` +
      `👤 *${p('Customer', 'ग्राहक', 'ग्राहक', 'ग्राहक', 'ग्राहक')}:* ${trData(customer.name)} (${customer.mobile ? trNum(customer.mobile) : noPhoneText})\n` +
      `📅 *${p('Date', 'तारीख', 'तारीख', 'तिथि', 'मिति')}:* ${bsPrefix} ${formatDateToBS(new Date(), appLanguage)}\n\n` +
      `──────────────────────\n` +
      `📦 *${p('Total Billed', 'कुल कारोबार', 'कुल कारोबार', 'कुल कारोबार', 'कुल कारोबार')}:* ${fmtCur(customer.totalLifetimePurchases)}\n` +
      `💵 *${p('Total Paid', 'अब तक जमा', 'अभी ले जमा', 'अखन धरि जमा', 'हालसम्म जम्मा')}:* ${fmtCur(customer.totalAmountPaid)}\n` +
      `🔴 *${p('Due Udhar', 'बकाया उधार', 'बाकी उधार', 'बाकी उधार', 'बाँकी उधारो रकम')}:* *${fmtCur(customer.outstandingBalance)}*\n` +
      `──────────────────────\n` +
      `${p('Please pay your due amount on time. Thank you! 🙏', 'कृपया बकाया राशि समय पर जमा करें। धन्यवाद! 🙏', 'कृपया बाकी पइसा समय पर जमा कर देब। धन्यवाद! 🙏', 'कृपया बाकी राशि समय पर जमा करू। धन्यवाद! 🙏', 'कृपया बाँकी रकम समयमै भुक्तानी गरिदिनुहुन हार्दिक अनुरोध गर्दछौं। धन्यवाद! 🙏')}`;

    const encoded = encodeURIComponent(rawText);
    const phone = customer.mobile ? customer.mobile.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    openExternalUrl(url);
  };

  return (
    <div className="space-y-4 pb-24 select-none">
      {/* SEARCH & ACTIONS */}
      <div className="bg-white rounded-3xl p-3.5 shadow-sm border border-slate-200/80 space-y-3">
        {/* Search Bar + Add Udhar Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={p('Search customer name or mobile...', 'ग्राहक का नाम या मोबाइल खोजें...', 'ग्राहक के नाम भा मोबाइल नम्बर खोजीं...', 'ग्राहकक नाम वा मोबाइल नम्बर खोजू...', 'ग्राहकको नाम वा मोबाइल नम्बर खोज्नुहोस्...')}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-9 text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => {
              playTapSound();
              if (selectedCustomer) {
                setNewCustomerName(selectedCustomer.name);
                setNewCustomerMobile(selectedCustomer.mobile || '');
                setNewCustomerAddress(selectedCustomer.address || '');
                setNewCustomerPhoto(selectedCustomer.photoUrl || '');
              } else {
                setNewCustomerName('');
                setNewCustomerMobile('');
                setNewCustomerAddress('');
                setNewCustomerPhoto('');
              }
              setIsAddUdharModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2.5 rounded-2xl text-xs font-black shadow-sm active:scale-95 transition cursor-pointer flex-shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ {p('New Udhar', 'नया उधार', 'नया उधार', 'नव उधार', 'नयाँ उधार')}</span>
          </button>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE: CUSTOMER LIST & SELECTED CUSTOMER LEDGER */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
        {/* Left Column: Customer Directory (4 cols on wide, full on mobile) */}
        <div className="md:col-span-5 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">
              {p('Customer List', 'ग्राहक सूची', 'ग्राहक सूची', 'ग्राहक सूची', 'ग्राहक सूची')} ({trNum(filteredCustomers.length)})
            </span>
            <div className="flex items-center gap-2">
              {customers.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    if (confirm(p('Delete all customers and credit data for this shop? This cannot be undone.', 'क्या आप इस दुकान के सभी ग्राहक और उधार डेटा हटाना चाहते हैं? इसे वापस नहीं लाया जा सकता।', 'का रउआ एह दोकान के सब ग्राहक आ उधार डेटा मेटावल चाहत बानी? ई वापस ना हो पाई।', 'की अहाँ ई दोकानक सभ ग्राहक आ उधार डेटा मेटाबय चाहैत छी? ई वापस नहि होयत।', 'के तपाईं पसलको सबै ग्राहक तथा उधारो डाटा मेटाउन चाहनुहुन्छ? यो पूर्ववत गर्न सकिँदैन।'))) {
                      pasalStorage.clearShopData(shop.id);
                      setSelectedCustomerId(null);
                    }
                  }}
                  className="text-[10px] text-rose-600 font-extrabold hover:underline cursor-pointer flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200"
                  title={p('Clear all khata records', 'सभी डेटा हटाएं', 'सब डेटा मेटाईं', 'सभ डेटा मेटाउ', 'सबै डाटा हटाउनुहोस्')}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{p('Clear All Data', 'सभी डेटा हटाएं', 'सब डेटा मेटाईं', 'सभ डेटा मेटाउ', 'सबै डाटा हटाउनुहोस्')}</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5 md:max-h-[460px] md:overflow-y-auto pr-0.5">
            {filteredCustomers.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center text-slate-400 space-y-1 border border-slate-200/80">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">
                  {p('No customers found', 'कोई ग्राहक नहीं मिला', 'कवनो ग्राहक ना मिलल', 'कोनो ग्राहक नहि भेटल', 'कुनै ग्राहक भेटिएन')}
                </p>
                <p className="text-[10px]">
                  {p('Tap the button above to add a new credit.', 'नया उधार जोड़ने के लिए ऊपर बटन दबाएं।', 'नया उधार जोड़े खातिर ऊपर वाला बटन दबाईं।', 'नव उधार जोड़बाक लेल ऊपरक बटन दबाउ।', 'नयाँ उधारो थप्न माथिको बटन थिच्नुहोस्।')}
                </p>
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const isSelected = selectedCustomerId === cust.id;
                const hasDue = (cust.outstandingBalance || 0) > 0;

                return (
                  <div key={cust.id} className="space-y-2">
                    <div
                      onClick={() => {
                        playTapSound();
                        setSelectedCustomerId(isSelected ? null : cust.id);
                      }}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.01]'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center flex-shrink-0 overflow-hidden ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : hasDue
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {cust.photoUrl ? (
                            <img src={cust.photoUrl} alt={trData(cust.name)} className="w-full h-full object-cover" />
                          ) : (
                            (trData(cust.name) || cust.name).charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className={`font-black text-xs truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {trData(cust.name)}
                          </h4>
                          <p className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                            {cust.mobile ? trNum(cust.mobile) : p('No number', 'नंबर नहीं', 'नम्बर नइखे', 'नम्बर नहि', 'नम्बर छैन')}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                        <div
                          className={`text-xs font-black ${
                            isSelected
                              ? 'text-white'
                              : hasDue
                              ? 'text-rose-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {fmtCur(cust.outstandingBalance || 0)}
                        </div>
                        <div className={`text-[9px] font-semibold ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                          {hasDue
                            ? p('Due Udhar', 'बकाया उधार', 'बाकी उधार', 'बाकी उधार', 'बाँकी उधारो')
                            : p('✓ Cleared', '✓ चुकता', '✓ चुकता भइल', '✓ चुकता भेल', '✓ चुक्ता भएको')}
                        </div>
                        {hasDue && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playTapSound();
                              setPaymentTargetCustomer(cust);
                              setIsCollectPaymentModalOpen(true);
                            }}
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg active:scale-95 transition flex items-center gap-0.5 cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-xs'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                            }`}
                            title={p('Collect payment', 'उधार वसूली करें', 'उधार वसूली करीं', 'उधार वसूली करू', 'यस ग्राहकको उधारो असुली गर्नुहोस्')}
                          >
                            <span>{p('Collect', 'वसूली', 'वसूली', 'वसूली', 'असुली')}</span>
                            <span>💵</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Full Customer Details on Mobile (opens on click, closes on second click) */}
                    {isSelected && selectedCustomer && (
                      <div className="md:hidden bg-white rounded-3xl p-4 shadow-sm border border-blue-200 space-y-4 animate-in fade-in duration-150">
                        {/* Customer Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="relative group w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-lg flex items-center justify-center shadow-md overflow-hidden flex-shrink-0">
                              {selectedCustomer.photoUrl ? (
                                <img src={selectedCustomer.photoUrl} alt={trData(selectedCustomer.name)} className="w-full h-full object-cover" />
                              ) : (
                                (trData(selectedCustomer.name) || selectedCustomer.name).charAt(0).toUpperCase()
                              )}
                              <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition">
                                <ImageIcon className="w-4 h-4 text-white" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleUpdateCustomerPhotoDirectly(e, selectedCustomer)}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base font-black text-slate-900 leading-tight">
                                  {trData(selectedCustomer.name)}
                                </h3>
                                <label className="text-[10px] text-blue-600 font-extrabold hover:underline cursor-pointer flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                  <ImageIcon className="w-2.5 h-2.5" />
                                  <span>{p('Change Photo', 'फोटो बदलें', 'फोटो बदलीं', 'फोटो बदलू', 'फोटो बदल्नुहोस्')}</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleUpdateCustomerPhotoDirectly(e, selectedCustomer)}
                                    className="hidden"
                                  />
                                </label>
                                <span
                                  className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                                    selectedCustomer.outstandingBalance > 0
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {selectedCustomer.outstandingBalance > 0
                                    ? p('Due Udhar', 'उधार बकाया', 'उधार बाकी', 'उधार बाकी', 'उधार बाँकी')
                                    : p('Cleared', 'हिसाब चुकता', 'हिसाब चुकता', 'हिसाब चुकता', 'हिसाब चुक्ता')}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                                <span>📞 {selectedCustomer.mobile ? trNum(selectedCustomer.mobile) : p('Not available', 'उपलब्ध नहीं', 'उपलब्ध नइखे', 'उपलब्ध नहि', 'सम्पर्क उपलब्ध छैन')}</span>
                                {selectedCustomer.address && (
                                  <span>• 📍 {trData(selectedCustomer.address)}</span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {selectedCustomer.mobile && (
                              <a
                                href={`tel:${selectedCustomer.mobile}`}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center"
                                title={p('Call', 'कॉल करें', 'फोन करीं', 'फोन करू', 'फोन गर्नुहोस्')}
                              >
                                <Phone className="w-4 h-4 text-blue-600" />
                              </a>
                            )}
                            <button
                              onClick={() => {
                                playTapSound();
                                handleShareWhatsApp(selectedCustomer);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition shadow-xs active:scale-95 cursor-pointer"
                              title={p('Send statement on WhatsApp', 'WhatsApp पर हिसाब भेजें', 'WhatsApp पर हिसाब भेजीं', 'WhatsApp पर हिसाब पठाउ', 'WhatsApp मा हिसाब पठाउनुहोस्')}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                playTapSound();
                                if (confirm(`${p('Delete account & records for', 'क्या आप इनका खाता और सभी रिकॉर्ड हटाना चाहते हैं:', 'का रउआ इनकर खाता आ सब रिकॉर्ड मेटावल चाहत बानी:', 'की अहाँ हिनकर खाता आ सभ रिकॉर्ड मेटाबय चाहैत छी:', 'के तपाईं खाता र सबै रेकर्ड मेटाउन चाहनुहुन्छ:')} "${selectedCustomer.name}"?`)) {
                                  pasalStorage.deleteCustomer(shop.id, selectedCustomer.id);
                                  setSelectedCustomerId(null);
                                }
                              }}
                              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition flex items-center justify-center cursor-pointer border border-rose-200"
                              title={p('Delete Customer', 'ग्राहक हटाएं', 'ग्राहक हटाईं', 'ग्राहक मेटाउ', 'ग्राहकको खाता मेटाउनुहोस्')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* 4 Financial Metric Badges for this Customer */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/60">
                            <span className="text-[10px] font-bold text-slate-500 block">{p('Total Billed', 'कुल कारोबार', 'कुल कारोबार', 'कुल कारोबार', 'कुल कारोबार')}</span>
                            <span className="text-sm font-black text-slate-900">
                              {fmtCur(selectedCustomer.totalLifetimePurchases)}
                            </span>
                          </div>
                          <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/60">
                            <span className="text-[10px] font-bold text-slate-500 block">{p('Total Paid', 'कुल जमा', 'कुल जमा', 'कुल जमा', 'कुल जम्मा')}</span>
                            <span className="text-sm font-black text-emerald-600">
                              {fmtCur(selectedCustomer.totalAmountPaid)}
                            </span>
                          </div>
                          <div className="bg-rose-50 rounded-2xl p-2.5 border border-rose-200 col-span-2">
                            <span className="text-[10px] font-extrabold text-rose-700 block">{p('Due Balance', 'वर्तमान बकाया उधार', 'अखन के बाकी उधार', 'वर्तमान बाकी उधार', 'वर्तमान बाँकी उधारो')}</span>
                            <span className="text-base font-black text-rose-700">
                              {fmtCur(selectedCustomer.outstandingBalance)}
                            </span>
                          </div>
                        </div>

                        {/* Ledger Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            onClick={() => {
                              playTapSound();
                              setNewCustomerName(selectedCustomer.name);
                              setNewCustomerMobile(selectedCustomer.mobile || '');
                              setNewCustomerAddress(selectedCustomer.address || '');
                              setNewCustomerPhoto(selectedCustomer.photoUrl || '');
                              setIsAddUdharModalOpen(true);
                            }}
                            className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ {p('Add New Udhar', 'नया उधार जोड़ें', 'नया उधार जोड़ीं', 'नव उधार जोड़ू', 'नयाँ उधारो थप्नुहोस्')}</span>
                          </button>

                          <button
                            onClick={() => {
                              playTapSound();
                              setPaymentTargetCustomer(selectedCustomer);
                              setIsCollectPaymentModalOpen(true);
                            }}
                            className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>{p('Collect Payment', 'रकम वसूली (जमा)', 'पइसा वसूली (जमा)', 'राशि वसूली (जमा)', 'रकम असुली (जम्मा)')}</span>
                          </button>

                          <button
                            onClick={() => {
                              playTapSound();
                              setIsAdjustmentModalOpen(true);
                            }}
                            className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition active:scale-95 flex items-center gap-1 cursor-pointer"
                            title={p('Audit Adjustment', 'खाता समायोजन', 'हिसाब सुधार', 'खाता समायोजन', 'लेजर समायोजन')}
                          >
                            <Scale className="w-3.5 h-3.5 text-slate-600" />
                            <span className="hidden sm:inline">{p('Adjust', 'समायोजन', 'सुधार', 'समायोजन', 'समायोजन')}</span>
                          </button>
                        </div>

                        {/* Permanent Ledger Chronological History */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase">
                              <Clock className="w-3.5 h-3.5 text-blue-600" />
                              <span>{p('Permanent Ledger History', 'पूर्ण लेन-देन इतिहास', 'पूरा लेन-देन इतिहास', 'पूर्ण लेन-देन इतिहास', 'पूर्ण लेन-देन इतिहास')}</span>
                            </h4>
                            <span className="text-[10px] text-slate-500 font-bold">
                              {trNum(combinedLedgerEntries.length)} {p('entries', 'प्रविष्टियाँ', 'प्रविष्टि', 'प्रविष्टि', 'प्रविष्टिहरू')}
                            </span>
                          </div>

                          {combinedLedgerEntries.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">
                              {p('No transaction records for this customer.', 'इस ग्राहक का कोई लेन-देन रिकॉर्ड नहीं है।', 'एह ग्राहक के कवनो लेन-देन रिकॉर्ड नइखे।', 'ई ग्राहकक कोनो लेन-देन रिकॉर्ड नहि अछि।', 'यो ग्राहकको कुनै लेन-देन रेकर्ड छैन।')}
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                              {combinedLedgerEntries.map((entry) => {
                                if (entry.type === 'order') {
                                  const order = entry.data;
                                  const unpaid = Math.max(0, order.totalBill - order.amountReceived);

                                  return (
                                    <div
                                      key={order.id}
                                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 font-black text-slate-900">
                                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                                          <span>{p('Order Bill', 'ऑर्डर बिल', 'ऑर्डर बिल', 'ऑर्डर बिल', 'अर्डर बिल')} #{trNum(order.orderNumber)}</span>
                                          <span className="text-[10px] text-slate-500 font-medium">
                                            • {bsPrefix} {formatDateToBS(order.createdAt, appLanguage)}
                                          </span>
                                        </div>

                                        <button
                                          onClick={() => {
                                            playTapSound();
                                            setPrintTargetOrder(order);
                                            setIsPrintModalOpen(true);
                                          }}
                                          className="text-[10px] text-blue-600 hover:text-blue-800 font-extrabold flex items-center gap-0.5 p-1 rounded-md"
                                        >
                                          <Printer className="w-3 h-3" />
                                          <span>{p('View Bill', 'बिल देखें', 'बिल देखीं', 'बिल देखू', 'बिल हेर्नुहोस्')}</span>
                                        </button>
                                      </div>

                                      <div className="bg-white rounded-xl p-2 border border-slate-200/60 divide-y divide-slate-100">
                                        {order.items.map((item, iIdx) => (
                                          <div key={iIdx} className="flex items-center justify-between py-1 text-[11px]">
                                            <span className="font-bold text-slate-800">
                                              {trData(item.productName)} × {trNum(item.quantity)} {item.unit ? trData(item.unit) : ''}
                                            </span>
                                            <span className="font-extrabold text-slate-700">
                                              {fmtCur(item.total)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>

                                      <div className="flex items-center justify-between pt-1 text-[11px] font-bold">
                                        <span className="text-slate-600">
                                          {p('Bill:', 'बिल:', 'बिल:', 'बिल:', 'बिल रकम:')} <b className="text-slate-900">{fmtCur(order.totalBill)}</b>
                                        </span>
                                        <span className="text-emerald-600">
                                          {p('Paid:', 'जमा:', 'जमा:', 'जमा:', 'जम्मा:')} {fmtCur(order.amountReceived)}
                                        </span>
                                        <span className="text-rose-600 font-black">
                                          {p('Due:', 'बकाया:', 'बाकी:', 'बाकी:', 'बाँकी:')} {fmtCur(unpaid)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                } else {
                                  const payment = entry.data;
                                  const isAdjustment = payment.entryType === 'adjustment_credit' || payment.entryType === 'adjustment_debit';

                                  return (
                                    <div
                                      key={payment.id}
                                      className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                                        isAdjustment
                                          ? 'bg-amber-50/80 border-amber-200'
                                          : 'bg-emerald-50/70 border-emerald-200'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <div
                                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                                            isAdjustment
                                              ? 'bg-amber-100 text-amber-800'
                                              : 'bg-emerald-100 text-emerald-800'
                                          }`}
                                        >
                                          {isAdjustment ? '⚖️' : '💵'}
                                        </div>
                                        <div>
                                          <div className="font-black text-slate-900 flex items-center gap-1.5">
                                            <span>
                                              {isAdjustment
                                                ? p('Ledger Adjustment', 'खाता समायोजन', 'हिसाब सुधार', 'खाता समायोजन', 'लेजर समायोजन')
                                                : p('Payment Received', 'भुगतान जमा', 'पइसा जमा भइल', 'भुगतान जमा', 'भुक्तानी जम्मा')}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-normal">
                                              • {bsPrefix} {formatDateToBS(payment.timestamp, appLanguage)}
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-slate-600 font-medium">
                                            {payment.notes ? trData(payment.notes) : (payment.paymentMethod ? `${p('Method:', 'माध्यम:', 'तरीका:', 'माध्यम:', 'विधि:')} ${payment.paymentMethod}` : p('Cash deposit', 'नकद जमा', 'नगद जमा', 'नगद जमा', 'नगद जम्मा'))}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="text-right">
                                        <div
                                          className={`font-black text-sm ${
                                            payment.entryType === 'adjustment_debit'
                                              ? 'text-rose-600'
                                              : 'text-emerald-700'
                                          }`}
                                        >
                                          {payment.entryType === 'adjustment_debit' ? '+ ' : '- '}
                                          {fmtCur(payment.amount)}
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-500">
                                          {payment.paymentMethod.toUpperCase()}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                }
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Customer Detailed Udhar Khata Ledger (7 cols on wide) */}
        <div className="hidden md:block md:col-span-7">
          {selectedCustomer ? (
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-4">
              {/* Customer Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="relative group w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-lg flex items-center justify-center shadow-md overflow-hidden flex-shrink-0">
                    {selectedCustomer.photoUrl ? (
                      <img src={selectedCustomer.photoUrl} alt={trData(selectedCustomer.name)} className="w-full h-full object-cover" />
                    ) : (
                      (trData(selectedCustomer.name) || selectedCustomer.name).charAt(0).toUpperCase()
                    )}
                    {/* Fast Overlay for Changing Customer Photo from Gallery */}
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition">
                      <ImageIcon className="w-4 h-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUpdateCustomerPhotoDirectly(e, selectedCustomer)}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-slate-900 leading-tight">
                        {trData(selectedCustomer.name)}
                      </h3>
                      {/* Change photo button */}
                      <label className="text-[10px] text-blue-600 font-extrabold hover:underline cursor-pointer flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        <ImageIcon className="w-2.5 h-2.5" />
                        <span>{p('Change Photo', 'फोटो बदलें', 'फोटो बदलीं', 'फोटो बदलू', 'फोटो बदल्नुहोस्')}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleUpdateCustomerPhotoDirectly(e, selectedCustomer)}
                          className="hidden"
                        />
                      </label>
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          selectedCustomer.outstandingBalance > 0
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {selectedCustomer.outstandingBalance > 0
                          ? p('Due Udhar', 'उधार बकाया', 'उधार बाकी', 'उधार बाकी', 'उधार बाँकी')
                          : p('Cleared', 'हिसाब चुकता', 'हिसाब चुकता', 'हिसाब चुकता', 'हिसाब चुक्ता')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                      <span>📞 {selectedCustomer.mobile ? trNum(selectedCustomer.mobile) : p('Not available', 'उपलब्ध नहीं', 'उपलब्ध नइखे', 'उपलब्ध नहि', 'सम्पर्क उपलब्ध छैन')}</span>
                      {selectedCustomer.address && (
                        <span>• 📍 {trData(selectedCustomer.address)}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Quick Action Phone / WhatsApp Buttons + Delete Customer Button */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {selectedCustomer.mobile && (
                    <a
                      href={`tel:${selectedCustomer.mobile}`}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center"
                      title={p('Call', 'कॉल करें', 'फोन करीं', 'फोन करू', 'फोन गर्नुहोस्')}
                    >
                      <Phone className="w-4 h-4 text-blue-600" />
                    </a>
                  )}
                  <button
                    onClick={() => {
                      playTapSound();
                      handleShareWhatsApp(selectedCustomer);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition shadow-xs active:scale-95 cursor-pointer"
                    title={p('Send statement on WhatsApp', 'WhatsApp पर हिसाब भेजें', 'WhatsApp पर हिसाब भेजीं', 'WhatsApp पर हिसाब पठाउ', 'WhatsApp मा हिसाब पठाउनुहोस्')}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      if (confirm(`${p('Delete account & records for', 'क्या आप इनका खाता और सभी रिकॉर्ड हटाना चाहते हैं:', 'का रउआ इनकर खाता आ सब रिकॉर्ड मेटावल चाहत बानी:', 'की अहाँ हिनकर खाता आ सभ रिकॉर्ड मेटाबय चाहैत छी:', 'के तपाईं खाता र सबै रेकर्ड मेटाउन चाहनुहुन्छ:')} "${selectedCustomer.name}"?`)) {
                        pasalStorage.deleteCustomer(shop.id, selectedCustomer.id);
                        setSelectedCustomerId(null);
                      }
                    }}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition flex items-center justify-center cursor-pointer border border-rose-200"
                    title={p('Delete Customer', 'ग्राहक हटाएं', 'ग्राहक हटाईं', 'ग्राहक मेटाउ', 'ग्राहकको खाता मेटाउनुहोस्')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 4 Financial Metric Badges for this Customer */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-500 block">{p('Total Billed', 'कुल कारोबार', 'कुल कारोबार', 'कुल कारोबार', 'कुल कारोबार')}</span>
                  <span className="text-sm font-black text-slate-900">
                    {fmtCur(selectedCustomer.totalLifetimePurchases)}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-500 block">{p('Total Paid', 'कुल जमा', 'कुल जमा', 'कुल जमा', 'कुल जम्मा')}</span>
                  <span className="text-sm font-black text-emerald-600">
                    {fmtCur(selectedCustomer.totalAmountPaid)}
                  </span>
                </div>
                <div className="bg-rose-50 rounded-2xl p-2.5 border border-rose-200 col-span-2">
                  <span className="text-[10px] font-extrabold text-rose-700 block">{p('Due Balance', 'वर्तमान बकाया उधार', 'अखन के बाकी उधार', 'वर्तमान बाकी उधार', 'वर्तमान बाँकी उधारो')}</span>
                  <span className="text-base font-black text-rose-700">
                    {fmtCur(selectedCustomer.outstandingBalance)}
                  </span>
                </div>
              </div>

              {/* Ledger Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    playTapSound();
                    setNewCustomerName(selectedCustomer.name);
                    setNewCustomerMobile(selectedCustomer.mobile || '');
                    setNewCustomerAddress(selectedCustomer.address || '');
                    setNewCustomerPhoto(selectedCustomer.photoUrl || '');
                    setIsAddUdharModalOpen(true);
                  }}
                  className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ {p('Add New Udhar', 'नया उधार जोड़ें', 'नया उधार जोड़ीं', 'नव उधार जोड़ू', 'नयाँ उधारो थप्नुहोस्')}</span>
                </button>

                <button
                  onClick={() => {
                    playTapSound();
                    setPaymentTargetCustomer(selectedCustomer);
                    setIsCollectPaymentModalOpen(true);
                  }}
                  className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>{p('Collect Payment', 'रकम वसूली (जमा)', 'पइसा वसूली (जमा)', 'राशि वसूली (जमा)', 'रकम असुली (जम्मा)')}</span>
                </button>

                <button
                  onClick={() => {
                    playTapSound();
                    setIsAdjustmentModalOpen(true);
                  }}
                  className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition active:scale-95 flex items-center gap-1 cursor-pointer"
                  title={p('Audit Adjustment', 'खाता समायोजन', 'हिसाब सुधार', 'खाता समायोजन', 'लेजर समायोजन')}
                >
                  <Scale className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">{p('Adjust', 'समायोजन', 'सुधार', 'समायोजन', 'समायोजन')}</span>
                </button>
              </div>

              {/* Permanent Ledger Chronological History (Audit Protected) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>{p('Permanent Ledger History', 'पूर्ण लेन-देन इतिहास', 'पूरा लेन-देन इतिहास', 'पूर्ण लेन-देन इतिहास', 'पूर्ण लेन-देन इतिहास')}</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-bold">
                    {trNum(combinedLedgerEntries.length)} {p('entries', 'प्रविष्टियाँ', 'प्रविष्टि', 'प्रविष्टि', 'प्रविष्टिहरू')}
                  </span>
                </div>

                {combinedLedgerEntries.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">
                    {p('No transaction records for this customer.', 'इस ग्राहक का कोई लेन-देन रिकॉर्ड नहीं है।', 'एह ग्राहक के कवनो लेन-देन रिकॉर्ड नइखे।', 'ई ग्राहकक कोनो लेन-देन रिकॉर्ड नहि अछि।', 'यो ग्राहकको कुनै लेन-देन रेकर्ड छैन।')}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {combinedLedgerEntries.map((entry, idx) => {
                      if (entry.type === 'order') {
                        const order = entry.data;
                        const unpaid = Math.max(0, order.totalBill - order.amountReceived);

                        return (
                          <div
                            key={order.id}
                            className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-black text-slate-900">
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                <span>{p('Order Bill', 'ऑर्डर बिल', 'ऑर्डर बिल', 'ऑर्डर बिल', 'अर्डर बिल')} #{trNum(order.orderNumber)}</span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  • {bsPrefix} {formatDateToBS(order.createdAt, appLanguage)}
                                </span>
                              </div>

                              <button
                                onClick={() => {
                                  playTapSound();
                                  setPrintTargetOrder(order);
                                  setIsPrintModalOpen(true);
                                }}
                                className="text-[10px] text-blue-600 hover:text-blue-800 font-extrabold flex items-center gap-0.5 p-1 rounded-md"
                              >
                                <Printer className="w-3 h-3" />
                                <span>{p('View Bill', 'बिल देखें', 'बिल देखीं', 'बिल देखू', 'बिल हेर्नुहोस्')}</span>
                              </button>
                            </div>

                            {/* Line items breakdown */}
                            <div className="bg-white rounded-xl p-2 border border-slate-200/60 divide-y divide-slate-100">
                              {order.items.map((item, iIdx) => (
                                <div key={iIdx} className="flex items-center justify-between py-1 text-[11px]">
                                  <span className="font-bold text-slate-800">
                                    {trData(item.productName)} × {trNum(item.quantity)} {item.unit ? trData(item.unit) : ''}
                                  </span>
                                  <span className="font-extrabold text-slate-700">
                                    {fmtCur(item.total)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Order financial breakdown */}
                            <div className="flex items-center justify-between pt-1 text-[11px] font-bold">
                              <span className="text-slate-600">
                                {p('Bill:', 'बिल:', 'बिल:', 'बिल:', 'बिल रकम:')} <b className="text-slate-900">{fmtCur(order.totalBill)}</b>
                              </span>
                              <span className="text-emerald-600">
                                {p('Paid:', 'जमा:', 'जमा:', 'जमा:', 'जम्मा:')} {fmtCur(order.amountReceived)}
                              </span>
                              <span className="text-rose-600 font-black">
                                {p('Due:', 'बकाया:', 'बाकी:', 'बाकी:', 'बाँकी:')} {fmtCur(unpaid)}
                              </span>
                            </div>
                          </div>
                        );
                      } else {
                        const payment = entry.data;
                        const isAdjustment = payment.entryType === 'adjustment_credit' || payment.entryType === 'adjustment_debit';

                        return (
                          <div
                            key={payment.id}
                            className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                              isAdjustment
                                ? 'bg-amber-50/80 border-amber-200'
                                : 'bg-emerald-50/70 border-emerald-200'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                                  isAdjustment
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {isAdjustment ? '⚖️' : '💵'}
                              </div>
                              <div>
                                <div className="font-black text-slate-900 flex items-center gap-1.5">
                                  <span>
                                    {isAdjustment
                                      ? p('Ledger Adjustment', 'खाता समायोजन', 'हिसाब सुधार', 'खाता समायोजन', 'लेजर समायोजन')
                                      : p('Payment Received', 'भुगतान जमा', 'पइसा जमा भइल', 'भुगतान जमा', 'भुक्तानी जम्मा')}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-normal">
                                    • {bsPrefix} {formatDateToBS(payment.timestamp, appLanguage)}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-600 font-medium">
                                  {payment.notes ? trData(payment.notes) : (payment.paymentMethod ? `${p('Method:', 'माध्यम:', 'तरीका:', 'माध्यम:', 'विधि:')} ${payment.paymentMethod}` : p('Cash deposit', 'नकद जमा', 'नगद जमा', 'नगद जमा', 'नगद जम्मा'))}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <div
                                className={`font-black text-sm ${
                                  payment.entryType === 'adjustment_debit'
                                    ? 'text-rose-600'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {payment.entryType === 'adjustment_debit' ? '+ ' : '- '}
                                {fmtCur(payment.amount)}
                              </div>
                              <span className="text-[9px] font-bold text-slate-500">
                                {payment.paymentMethod.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-400 space-y-2 border border-slate-200/80">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-black text-slate-700">
                {p('No customer selected', 'कोई ग्राहक नहीं चुना गया', 'कवनो ग्राहक ना चुनल गइल बा', 'कोनो ग्राहक नहि चुनल गेल अछि', 'कुनै ग्राहक छनोट गरिएको छैन')}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {p('Select a customer from the left list to view full credit ledger, history and collect payments.', 'विस्तृत उधार खाता, इतिहास और भुगतान वसूली के लिए बाईं सूची से ग्राहक चुनें।', 'पूरा उधार खाता, इतिहास आ पइसा वसूली देखे खातिर बायाँ सूची से ग्राहक चुनीं।', 'विस्तृत उधार खाता, इतिहास आ भुगतान वसूली देखबाक लेल बामाँ सूची सँ ग्राहक चुनू।', 'विस्तृत उधार खाता, कारोबार इतिहास, र भुक्तानी असुली गर्न बायाँ सूचीबाट ग्राहक छनोट गर्नुहोस्।')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 5. ADD UDHAR MODAL */}
      {isAddUdharModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-black">
                  📕
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    {p('Add New Udhar Bill', 'नया उधार बिल जोड़ें', 'नया उधार बिल जोड़ीं', 'नव उधार बिल जोड़ू', 'नयाँ उधारो बिल थप्नुहोस्')}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {p('Add credit & items to customer account', 'ग्राहक के खाते में नया उधार व सामान दर्ज करें', 'ग्राहक के खाता में नया उधार आ सामान भरीं', 'ग्राहकक खाता मे नव उधार आ सामान भरू', 'ग्राहकको खातामा नयाँ उधारो तथा सामान प्रविष्टि')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUdharModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddUdhar} className="space-y-4 text-xs">
              {/* Customer Details with Photo Upload */}
              <div className="p-3.5 bg-gradient-to-br from-blue-50/90 to-indigo-50/60 rounded-2xl border border-blue-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-950 flex items-center gap-1.5 uppercase">
                    <span>👤</span>
                    <span>{p('Customer Details', 'ग्राहक विवरण', 'ग्राहक विवरण', 'ग्राहक विवरण', 'ग्राहक विवरण')}</span>
                  </span>

                  {/* Quick autofill option from existing customers */}
                  {customers.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-slate-500 font-semibold">{p('Or existing:', 'या पुराना:', 'भा पुरान:', 'वा पुरान:', 'वा पुरानो:')}</span>
                      <select
                        onChange={(e) => {
                          const c = customers.find((item) => item.id === e.target.value);
                          if (c) {
                            setNewCustomerName(c.name);
                            setNewCustomerMobile(c.mobile || '');
                            setNewCustomerAddress(c.address || '');
                            setNewCustomerPhoto(c.photoUrl || '');
                          }
                        }}
                        defaultValue=""
                        className="bg-white border border-blue-200 rounded-lg px-2 py-1 text-[10px] font-bold text-blue-900 outline-none"
                      >
                        <option value="" disabled>-- {p('Select existing customer', 'पुराना ग्राहक चुनें', 'पुरान ग्राहक चुनीं', 'पुरान ग्राहक चुनू', 'पुरानो ग्राहक छान्नुहोस्')} --</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {trData(c.name)} {c.mobile ? `(${trNum(c.mobile)})` : ''} — {fmtCur(c.outstandingBalance)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  {/* Photo Upload Box */}
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0 mx-auto sm:mx-0">
                    <div className="relative group w-20 h-20 rounded-2xl border-2 border-dashed border-blue-300 bg-white overflow-hidden flex flex-col items-center justify-center shadow-xs">
                      {newCustomerPhoto ? (
                        <>
                          <img
                            src={newCustomerPhoto}
                            alt="Customer"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              playTapSound();
                              setNewCustomerPhoto('');
                            }}
                            className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center text-xs shadow-md hover:bg-rose-700 cursor-pointer"
                            title={p('Remove Photo', 'फोटो हटाएं', 'फोटो हटाईं', 'फोटो हटाउ', 'फोटो हटाउनुहोस्')}
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full p-2 text-center hover:bg-blue-50/60 transition">
                          <ImageIcon className="w-6 h-6 text-blue-500 mb-0.5" />
                          <span className="text-[9px] font-black text-blue-700 leading-tight">{p('Gallery / Camera', 'गैलरी / कैमरा', 'गैलरी / कैमरा', 'गैलरी / कैमरा', 'ग्यालरी / क्यामरा')}</span>
                          <span className="text-[8px] text-slate-400">{p('Choose Photo', 'फोटो चुनें', 'फोटो चुनीं', 'फोटो चुनू', 'फोटो छान्नुहोस्')}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {/* Dedicated Gallery & Camera Action Triggers */}
                    <div className="flex items-center gap-1">
                      <label className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[9px] font-extrabold flex items-center gap-1 cursor-pointer border border-blue-200 transition shadow-2xs">
                        <ImageIcon className="w-3 h-3 text-blue-600" />
                        <span>{p('Gallery', 'गैलरी', 'गैलरी', 'गैलरी', 'ग्यालरी')}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                      <label className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[9px] font-extrabold flex items-center gap-1 cursor-pointer border border-slate-200 transition shadow-2xs">
                        <Camera className="w-3 h-3 text-slate-600" />
                        <span>{p('Camera', 'कैमरा', 'कैमरा', 'कैमरा', 'क्यामरा')}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Customer Text Inputs */}
                  <div className="flex-1 w-full space-y-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-700 block mb-0.5">
                        {p('Customer Name*', 'ग्राहक का नाम*', 'ग्राहक के नाम*', 'ग्राहकक नाम*', 'ग्राहकको नाम*')}
                      </label>
                      <input
                        type="text"
                        placeholder={p('e.g. Ram Bahadur, Sita...', 'उदा. राम, सीता...', 'जइसे: राम, सीता...', 'जेना: राम, सीता...', 'उदा. राम बहादुर, सीता...')}
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        required
                        className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-black text-slate-700 block mb-0.5">
                          {p('Mobile Number', 'मोबाइल नंबर', 'मोबाइल नम्बर', 'मोबाइल नम्बर', 'मोबाइल नम्बर')}
                        </label>
                        <input
                          type="tel"
                          placeholder="98XXXXXXXX"
                          value={newCustomerMobile}
                          onChange={(e) => setNewCustomerMobile(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-700 block mb-0.5">
                          {p('Address (Optional)', 'पता (ऐच्छिक)', 'पता (जरूरी नइखे)', 'पता (ऐच्छिक)', 'ठेगाना (ऐच्छिक)')}
                        </label>
                        <input
                          type="text"
                          placeholder={p('Village / Ward...', 'गाँव / वार्ड...', 'गाँव / टोल...', 'गाम / टोल...', 'ठेगाना / वडा...')}
                          value={newCustomerAddress}
                          onChange={(e) => setNewCustomerAddress(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items List with Flexible Units & Fractions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5">
                    <span>🛒</span>
                    <span>{p('Item Details *', 'सामान विवरण *', 'सामान विवरण *', 'सामान विवरण *', 'सामान विवरण *')}</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-[11px] text-blue-600 font-black hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>+ {p('Add Another Item', 'एक और सामान जोड़ें', 'एक अउर सामान जोड़ीं', 'एक आओर सामान जोड़ू', 'अर्को सामान थप्नुहोस्')}</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 shadow-2xs">
                      {/* Top: Product Name & Remove button */}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder={p('Item name (e.g. Sugar, Rice) *', 'सामान का नाम (उदा. चीनी, चावल) *', 'सामान के नाम (जइसे: चीनी, चाउर) *', 'सामानक नाम (जेना: चीनी, चाउर) *', 'सामानको नाम (उदा. चिनी, चामल) *')}
                          value={item.productName}
                          onChange={(e) => handleUpdateLineItem(idx, 'productName', e.target.value)}
                          required
                          className="flex-1 bg-white border border-slate-300 rounded-lg p-2 font-bold text-xs text-slate-800 outline-none focus:border-blue-500"
                        />

                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            title={p('Remove item', 'सामान हटाएं', 'सामान हटाईं', 'सामान हटाउ', 'सामान हटाउनुहोस्')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Middle: Quantity, Rate, and Total */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            {p('Quantity', 'मात्रा', 'मात्रा', 'मात्रा', 'परिमाण')}
                          </label>
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            placeholder="0.5 / 1"
                            value={item.quantity === 0 && item.productName === '' ? '' : item.quantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateLineItem(idx, 'quantity', val === '' ? '' : parseFloat(val) || 0);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 font-black text-xs text-slate-900 outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            {p('Rate', 'दर', 'भाव / दर', 'दर', 'दर')} ({rsPrefix})
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder={p('Rate', 'दर', 'भाव', 'दर', 'दर')}
                            value={item.unitPrice === 0 ? '' : item.unitPrice}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateLineItem(idx, 'unitPrice', val === '' ? '' : parseFloat(val) || 0);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg p-2 font-black text-xs text-slate-900 outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            {p('Total', 'कुल राशि', 'कुल पइसा', 'कुल राशि', 'कुल रकम')}
                          </label>
                          <div className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 font-black text-xs text-slate-900 text-center truncate">
                            {fmtCur(item.total || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation Box */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold">{p('Total Bill Amount:', 'कुल बिल राशि:', 'कुल बिल के रकम:', 'कुल बिल राशि:', 'कुल बिल रकम:')}</span>
                  <span className="font-black text-sm">{fmtCur(udharSubtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                  <span className="text-slate-300 font-bold">{p('Paid Today:', 'आज जमा राशि:', 'आज मिलल पइसा:', 'आइ जमा राशि:', 'आज जम्मा दिएको रकम:')}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-400 font-bold">{rsPrefix}</span>
                    <input
                      type="number"
                      min="0"
                      max={udharSubtotal}
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                      className="w-24 bg-white/15 border border-white/30 rounded-lg p-1 text-right font-black text-emerald-300 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                  <span className="text-rose-300 font-extrabold">{p('New Credit Due:', 'शेष नया उधार:', 'बाकी नया उधार:', 'बाकी नव उधार:', 'बाँकी नयाँ उधारो:')}</span>
                  <span className="font-black text-base text-rose-300">
                    {fmtCur(udharRemainingDue)}
                  </span>
                </div>
              </div>

              {/* Payment Method for Down Payment */}
              {amountReceived > 0 && (
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 block">
                    {p('Payment Method', 'भुगतान माध्यम', 'भुगतान के तरीका', 'भुगतानक माध्यम', 'जम्मा रकम भुक्तानी माध्यम')}
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['cash', 'esewa', 'khalti', 'bank_transfer'] as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`py-1.5 rounded-xl font-bold uppercase text-[10px] transition cursor-pointer border ${
                          paymentMethod === m
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {m === 'bank_transfer' ? 'BANK' : m === 'cash' ? p('Cash', 'नकद', 'नगद', 'नगद', 'नगद') : m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  {p('Notes / Remarks (Optional)', 'नोट / टिप्पणी (ऐच्छिक)', 'नोट / टिप्पणी (जरूरी नइखे)', 'नोट / टिप्पणी (ऐच्छिक)', 'थप कैफियत / नोट (ऐच्छिक)')}
                </label>
                <input
                  type="text"
                  placeholder={p('e.g. Will pay next week...', 'उदा. अगले हफ्ते देंगे...', 'जइसे: अगिला हफ्ता देब...', 'जेना: अगिला सप्ताह देब...', 'उदा. अर्को हप्ता तिर्ने...')}
                  value={udharNotes}
                  onChange={(e) => setUdharNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium text-slate-800 mb-2"
                />
              </div>

              {/* Transaction Date in BS */}
              <div>
                <NepaliBSDatePicker
                  label={p('Transaction Date (B.S.):', 'लेन-देन तिथि (वि.सं.):', 'लेन-देन के तारीख (वि.सं.):', 'लेन-देन तिथि (वि.सं.):', 'कारोबार मिति (वि.सं.):')}
                  value={udharDate}
                  language={appLanguage}
                  onChange={(iso) => setUdharDate(iso)}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUdharModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  {p('Cancel', 'रद्द करें', 'बंद करीं', 'रद्द करू', 'रद्द गर्नुहोस्')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-md transition active:scale-95 cursor-pointer"
                >
                  {p('Save to Udhar Khata ✓', 'उधार खाते में सेव करें ✓', 'उधार खाता में सेव करीं ✓', 'उधार खाता मे सेव करू ✓', 'उधारो खातामा सेभ गर्नुहोस् ✓')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. SAFE AUDIT ADJUSTMENT MODAL */}
      {isAdjustmentModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  ⚖️
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    {p('Ledger Adjustment', 'खाता समायोजन / सुधार', 'हिसाब सुधार', 'खाता समायोजन', 'लेजर समायोजन / सुधार')}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {trData(selectedCustomer.name)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <span className="font-black flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{p('Safe Audit Rule:', 'सुरक्षित ऑडिट नियम:', 'सुरक्षित ऑडिट नियम:', 'सुरक्षित ऑडिट नियम:', 'सुरक्षित अडिट नियम:')}</span>
                </span>
                <p>
                  {p('Old bills or payments are never silently deleted. If there is any mistake or discount, record an adjustment with a clear reason here.', 'पुराने बिल या भुगतान चुपचाप नहीं हटाए जाते। किसी त्रुटि या छूट के लिए यहाँ कारण लिखकर सुरक्षित समायोजन करें।', 'पुरान बिल भा पइसा चुपचाप ना हटावल जाला। कवनो भूल-चूक भा छूट होखे त इहाँ साफ कारण लिख के हिसाब सुधार करीं।', 'पुरान बिल वा भुगतान चुपचाप नहि हटायल जाइत अछि। कोनो गलती वा छूटक लेल एतय कारण लिखि सुरक्षित समायोजन करू।', 'पुराना बिल वा भुक्तानी चुपचाप मेट्न पाइने छैन। कुनै हिसाब गल्ती वा छुट भएमा यहाँबाट स्पष्ट कारण खुलाएर सुरक्षित समायोजन गर्नुपर्दछ।')}
                </p>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  {p('Adjustment Type *', 'समायोजन का प्रकार *', 'सुधार के किसिम *', 'समायोजनक प्रकार *', 'समायोजनको प्रकार *')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjType('adjustment_credit')}
                    className={`p-2.5 rounded-xl border font-bold text-center transition cursor-pointer ${
                      adjType === 'adjustment_credit'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{p('Reduce Credit (Discount)', 'उधार घटाएं (छूट)', 'उधार घटाईं (छूट)', 'उधार घटाउ (छूट)', 'ऋण घटाउने (छुट)')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjType('adjustment_debit')}
                    className={`p-2.5 rounded-xl border font-bold text-center transition cursor-pointer ${
                      adjType === 'adjustment_debit'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{p('Add Credit (Debit)', 'उधार जोड़ें (Debit)', 'उधार जोड़ीं (Debit)', 'उधार जोड़ू (Debit)', 'उधारो थप्ने (Debit)')}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  {p('Adjustment Amount *', 'समायोजन राशि *', 'सुधार रकम *', 'समायोजन राशि *', 'समायोजन रकम *')}
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={adjAmount || ''}
                  onChange={(e) => setAdjAmount(parseFloat(e.target.value) || 0)}
                  placeholder="200"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-black text-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  {p('Reason / Note *', 'समायोजन का कारण *', 'सुधार के कारण *', 'समायोजनक कारण *', 'समायोजनको कारण *')}
                </label>
                <input
                  type="text"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder={p('e.g. Discount on bill #102', 'उदा. बिल छूट, हिसाब सुधार...', 'जइसे: बिल में छूट, हिसाब सुधार...', 'जेना: बिल मे छूट, हिसाब सुधार...', 'उदा. बिल मा हिसाब छुट...')}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  {p('Cancel', 'रद्द', 'बंद करीं', 'रद्द', 'रद्द')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black shadow-md transition active:scale-95 cursor-pointer"
                >
                  {p('Save Adjustment ✓', 'समायोजन दर्ज करें ✓', 'सुधार सेव करीं ✓', 'समायोजन सेव करू ✓', 'समायोजन रेकर्ड गर्नुहोस् ✓')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. COLLECT PAYMENT MODAL */}
      {isCollectPaymentModalOpen && paymentTargetCustomer && (
        <CollectPaymentModal
          isOpen={isCollectPaymentModalOpen}
          customer={paymentTargetCustomer}
          appLanguage={appLanguage}
          onClose={() => {
            setIsCollectPaymentModalOpen(false);
            setPaymentTargetCustomer(null);
          }}
          onPaymentCollected={() => {
            setIsCollectPaymentModalOpen(false);
            setPaymentTargetCustomer(null);
          }}
        />
      )}

      {/* 8. PRINT RECEIPT / STATEMENT MODAL */}
      {isPrintModalOpen && printTargetOrder && (
        <ReceiptPrintModal
          isOpen={isPrintModalOpen}
          shop={shop}
          order={printTargetOrder}
          customer={selectedCustomer}
          appLanguage={appLanguage}
          onClose={() => {
            setIsPrintModalOpen(false);
            setPrintTargetOrder(null);
          }}
        />
      )}
    </div>
  );
};
