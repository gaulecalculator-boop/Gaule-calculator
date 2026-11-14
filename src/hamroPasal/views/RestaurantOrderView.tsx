/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Hotel & Restaurant POS Order View — Hamro Pasal
 * Rapid touch order-taking, table selection, food categories,
 * customer linking, partial payment, and automatic bill calculation.
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Check,
  Printer,
  User,
  Phone,
  UtensilsCrossed,
  ShoppingBag,
  Bike,
  Sparkles,
} from 'lucide-react';
import {
  ShopProfile,
  MenuItemOrProduct,
  OrderLineItem,
  OrderType,
  CustomerRecord,
  CustomerOrder,
  PaymentMethod,
} from '../types';
import { pasalStorage } from '../storage/pasalStorage';
import { ReceiptPrintModal } from '../components/ReceiptPrintModal';
import { playTapSound, playSuccessSound } from '../../utils/audio';

interface RestaurantOrderViewProps {
  shop: ShopProfile;
  initialCustomer?: CustomerRecord | null;
  onOrderSaved?: (order: CustomerOrder) => void;
  onOpenCustomerKhata?: (customerId?: string) => void;
}

export const RestaurantOrderView: React.FC<RestaurantOrderViewProps> = ({
  shop,
  initialCustomer,
  onOrderSaved,
  onOpenCustomerKhata,
}) => {
  // Menu items & categories
  const [products, setProducts] = useState<MenuItemOrProduct[]>(pasalStorage.getProducts(shop.id));
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchFoodQuery, setSearchFoodQuery] = useState<string>('');

  // Cart / Order state
  const [cartItems, setCartItems] = useState<OrderLineItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [selectedTable, setSelectedTable] = useState<string>('1');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');

  // Customer Linking
  const [customerName, setCustomerName] = useState<string>(initialCustomer?.name || '');
  const [customerMobile, setCustomerMobile] = useState<string>(initialCustomer?.mobile || '');
  const [matchedCustomer, setMatchedCustomer] = useState<CustomerRecord | null>(initialCustomer || null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);

  // Billing & Payment Inputs
  const [discountStr, setDiscountStr] = useState<string>('0');
  const [amountReceivedStr, setAmountReceivedStr] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [savedOrderForPrint, setSavedOrderForPrint] = useState<CustomerOrder | null>(null);
  const [orderNotice, setOrderNotice] = useState<string | null>(null);

  // Load products
  useEffect(() => {
    setProducts(pasalStorage.getProducts(shop.id));
  }, [shop.id]);

  // When initial customer passed
  useEffect(() => {
    if (initialCustomer) {
      setCustomerName(initialCustomer.name);
      setCustomerMobile(initialCustomer.mobile || '');
      setMatchedCustomer(initialCustomer);
    }
  }, [initialCustomer]);

  // Live customer search as owner types
  useEffect(() => {
    if (customerName.trim().length >= 2) {
      const results = pasalStorage.searchCustomers(customerName, shop.id);
      const exact = results.find(
        (c) => c.name.toLowerCase() === customerName.trim().toLowerCase()
      );
      if (exact) {
        setMatchedCustomer(exact);
        if (exact.mobile && !customerMobile) setCustomerMobile(exact.mobile);
      }
    }
  }, [customerName, shop.id, customerMobile]);

  // Categories list
  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  // Filtered menu
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesQuery =
      !searchFoodQuery.trim() ||
      p.name.toLowerCase().includes(searchFoodQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchFoodQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  // Cart operations
  const handleAddToCart = (product: MenuItemOrProduct) => {
    playTapSound();
    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + 1,
          total: (next[idx].quantity + 1) * next[idx].unitPrice,
        };
        return next;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            category: product.category,
            unitPrice: product.price,
            costPrice: product.costPrice,
            quantity: 1,
            unit: product.unit,
            total: product.price,
          },
        ];
      }
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    playTapSound();
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.productId === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            return {
              ...item,
              quantity: nextQty,
              total: nextQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter(Boolean) as OrderLineItem[];
    });
  };

  const handleRemoveItem = (productId: string) => {
    playTapSound();
    setCartItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Financial calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
  const discount = Math.min(subtotal, Math.max(0, parseFloat(discountStr) || 0));
  const serviceCharge = shop.serviceChargePercent > 0 ? (subtotal * shop.serviceChargePercent) / 100 : 0;
  const tax = shop.vatPercent > 0 ? ((subtotal - discount + serviceCharge) * shop.vatPercent) / 100 : 0;
  const totalBill = Math.round(subtotal - discount + serviceCharge + tax);

  // Amount received defaults or input
  const amountReceived = amountReceivedStr === '' ? totalBill : Math.max(0, parseFloat(amountReceivedStr) || 0);
  const remainingBalance = Math.max(0, totalBill - amountReceived);

  // Customer previous balance
  const previousCustomerBalance = matchedCustomer ? matchedCustomer.outstandingBalance : 0;
  const totalCustomerDue = previousCustomerBalance + remainingBalance;

  // Save Order
  const handleSaveOrder = () => {
    if (cartItems.length === 0) {
      alert('कृपया पहिले खानाका परिकारहरू छान्नुहोस्');
      return;
    }

    playSuccessSound();

    // Link or create customer if name is entered
    let linkedCustomerId: string | undefined = matchedCustomer?.id;
    let finalCustName = customerName.trim() || 'नगद ग्राहक (Walk-in Customer)';

    if (customerName.trim()) {
      const cust = pasalStorage.findOrCreateCustomer(customerName, customerMobile, shop.id);
      linkedCustomerId = cust.id;
      finalCustName = cust.name;
    }

    const newOrder = pasalStorage.createOrder({
      shopId: shop.id,
      orderType,
      tableNumber: orderType === 'dine_in' ? selectedTable : undefined,
      customerId: linkedCustomerId,
      customerName: finalCustName,
      customerMobile: customerMobile.trim() || undefined,
      items: cartItems,
      subtotal,
      discount,
      serviceChargeAmount: Math.round(serviceCharge),
      taxAmount: Math.round(tax),
      totalBill,
      amountReceived,
      remainingBalance,
      paymentMethod,
      status: 'completed',
      notes: specialInstructions,
    });

    // Reset cart
    setCartItems([]);
    setAmountReceivedStr('');
    setSpecialInstructions('');
    setDiscountStr('0');
    setSavedOrderForPrint(newOrder);

    // Refresh matched customer with fresh balance
    if (linkedCustomerId) {
      const fresh = pasalStorage.getCustomerById(linkedCustomerId, shop.id);
      setMatchedCustomer(fresh);
    }

    setOrderNotice(`अर्डर #${newOrder.orderNumber} सुरक्षित भयो!`);
    setTimeout(() => setOrderNotice(null), 3000);

    if (onOrderSaved) onOrderSaved(newOrder);
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* Top Banner Notice */}
      {orderNotice && (
        <div className="p-3 rounded-2xl bg-emerald-600 text-white font-extrabold text-xs shadow-md animate-in fade-in flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{orderNotice}</span>
          </div>
          <button
            onClick={() => setOrderNotice(null)}
            className="text-white font-bold p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Responsive Grid: Menu Selector (Left 60%) + Live Bill Panel (Right 40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: Food Menu Selection */}
        <div className="lg:col-span-7 space-y-3">
          {/* Order Type & Table Selector */}
          <div className="bg-white p-3.5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
            {/* Order Type Toggle: Dine In, Takeaway, Delivery */}
            <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              {[
                { id: 'dine_in', label: 'डाइन-इन', icon: UtensilsCrossed },
                { id: 'takeaway', label: 'प्याक/टेकअवे', icon: ShoppingBag },
                { id: 'delivery', label: 'डेलिभरी', icon: Bike },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = orderType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      playTapSound();
                      setOrderType(t.id as OrderType);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Table Selector (If Dine-In) */}
            {orderType === 'dine_in' && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span>टेबल:</span>
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-extrabold text-blue-700 outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                    <option key={num} value={num.toString()}>
                      Table {num}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Search Bar & Categories */}
          <div className="bg-white p-3.5 rounded-3xl border border-slate-200/90 shadow-xs space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFoodQuery}
                onChange={(e) => setSearchFoodQuery(e.target.value)}
                placeholder="खानाको परिकार खोज्नुहोस् (मःमः, खाना, चाउमिन, चिया...)"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 pl-9 pr-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    playTapSound();
                    setSelectedCategory(cat);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'All' ? 'सबै (All)' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Food Menu Grid Cards with Photos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredProducts.map((food) => {
              const inCart = cartItems.find((i) => i.productId === food.id);
              return (
                <div
                  key={food.id}
                  onClick={() => handleAddToCart(food)}
                  className={`p-2.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between active:scale-95 ${
                    inCart
                      ? 'bg-blue-50/70 border-blue-400 shadow-xs ring-1 ring-blue-300'
                      : 'bg-white hover:bg-slate-50 border-slate-200/90'
                  }`}
                >
                  {/* Food Image */}
                  <div className="w-full h-24 rounded-xl overflow-hidden bg-slate-100 mb-2 relative">
                    {food.imageUrl ? (
                      <img
                        src={food.imageUrl}
                        alt={food.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🍲
                      </div>
                    )}
                    {inCart && (
                      <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shadow-md">
                        {inCart.quantity}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="font-extrabold text-xs text-slate-900 leading-snug line-clamp-2">
                      {food.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">{food.category}</p>
                  </div>

                  <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="font-black text-xs text-blue-700">रु {food.price}</span>
                    <span className="text-[10px] text-slate-400 font-bold">/{food.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Order Cart, Customer Linking & Final Bill */}
        <div className="lg:col-span-5 space-y-3">
          {/* Customer Selection Card */}
          <div className="bg-white p-3.5 rounded-3xl border border-slate-200/90 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>ग्राहक (Customer / Khata)</span>
              </span>
              {matchedCustomer && (
                <button
                  onClick={() => {
                    playTapSound();
                    if (onOpenCustomerKhata) onOpenCustomerKhata(matchedCustomer.id);
                  }}
                  className="text-[10px] font-extrabold text-blue-600 hover:underline"
                >
                  खाता विवरण हेर्नुहोस् ›
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="ग्राहकको नाम (उदा: Raju)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
              />
              <input
                type="tel"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                placeholder="मोबाइल नम्बर"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
              />
            </div>

            {/* Matched Customer Balance Banner */}
            {matchedCustomer && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
                <div>
                  <p className="font-extrabold text-slate-900 leading-tight">
                    {matchedCustomer.name}
                  </p>
                  <p className="text-[10px] text-slate-600 font-medium">अघिल्लो बाँकी उधारो (Previous Balance):</p>
                </div>
                <span className="font-black text-rose-600 text-sm">
                  रु {matchedCustomer.outstandingBalance.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase">
                अर्डर गरिएका परिकार ({cartItems.length})
              </span>
              {cartItems.length > 0 && (
                <button
                  onClick={() => setCartItems([])}
                  className="text-[10px] font-bold text-rose-600 hover:underline"
                >
                  खाली गर्नुहोस्
                </button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-1">
                <p className="text-2xl">🍽️</p>
                <p className="text-xs font-bold">कुनै परिकार छानिएको छैन</p>
                <p className="text-[10px]">देब्रेपट्टीको मेनुबाट परिकार थप्नुहोस्।</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-bold text-slate-900 truncate">{item.productName}</p>
                      <p className="text-[10px] text-slate-500">
                        रु {item.unitPrice} × {item.quantity} = <strong>रु {item.total}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleUpdateQty(item.productId, -1)}
                        className="w-6 h-6 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-black text-xs text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQty(item.productId, 1)}
                        className="w-6 h-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item.productId)}
                        className="ml-1 text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Special Instructions */}
            <div>
              <input
                type="text"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="विशेष निर्देशन (उदा: पिरो कम, प्याज नराख्ने)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-[11px] text-slate-800 outline-none"
              />
            </div>

            {/* Bill Summary Breakdown */}
            <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>उप-कुल (Subtotal):</span>
                <span>रु {subtotal}</span>
              </div>

              {/* Discount Input */}
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600">छुट (Discount):</span>
                <input
                  type="number"
                  min="0"
                  value={discountStr}
                  onChange={(e) => setDiscountStr(e.target.value)}
                  className="w-16 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-right font-bold text-xs"
                />
              </div>

              <div className="flex justify-between font-black text-sm pt-1.5 border-t border-slate-300 text-slate-900">
                <span>कुल बिल (Total Bill):</span>
                <span className="text-blue-700 font-extrabold text-base">रु {totalBill}</span>
              </div>

              {/* Payment inputs */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>प्राप्त रकम (Amount Received):</span>
                    <button
                      type="button"
                      onClick={() => setAmountReceivedStr(totalBill.toString())}
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      पूरै रकम (Full)
                    </button>
                  </div>
                  <input
                    type="number"
                    value={amountReceivedStr}
                    onChange={(e) => setAmountReceivedStr(e.target.value)}
                    placeholder={totalBill.toString()}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 text-sm font-black text-emerald-700 outline-none"
                  />
                </div>

                <div className="flex justify-between text-xs font-extrabold">
                  <span className="text-slate-700">यस अर्डरको बाँकी (Due):</span>
                  <span className={remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                    रु {remainingBalance}
                  </span>
                </div>

                {/* Scenario Calculation Preview: Previous Balance + New Order - Received = Total Due */}
                {matchedCustomer && (
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] space-y-1 font-medium text-slate-800">
                    <div className="flex justify-between">
                      <span>अघिल्लो बाँकी (Previous Balance):</span>
                      <span className="font-bold">रु {previousCustomerBalance}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>नयाँ अर्डर (New Order):</span>
                      <span className="font-bold">+ रु {totalBill}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>प्राप्त भुक्तानी (Payment):</span>
                      <span>− रु {amountReceived}</span>
                    </div>
                    <div className="pt-1 border-t border-blue-300 flex justify-between font-black text-xs text-rose-700">
                      <span>ग्राहकको कुल बाँकी (TOTAL DUE):</span>
                      <span>रु {totalCustomerDue}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Save Order & Print Buttons */}
            <button
              onClick={handleSaveOrder}
              disabled={cartItems.length === 0}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>अर्डर सुरक्षित गर्नुहोस् र बिल जारी गर्नुहोस्</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {savedOrderForPrint && (
        <ReceiptPrintModal
          isOpen={!!savedOrderForPrint}
          onClose={() => setSavedOrderForPrint(null)}
          order={savedOrderForPrint}
          shop={shop}
          customer={matchedCustomer}
        />
      )}
    </div>
  );
};
