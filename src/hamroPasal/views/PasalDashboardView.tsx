/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Hotel & Business Dashboard — Hamro Pasal
 * Real-time metrics computed directly from database:
 * - Today's Sales, Cash, Credit, Total Outstanding Customer Balance
 * - Today's Orders (Pending, Completed, Cancelled)
 * - Popular food items / products
 * - Daily sales timeline chart
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  AlertCircle,
  ShoppingBag,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  Utensils,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';
import { ShopProfile, CustomerOrder } from '../types';
import { pasalStorage } from '../storage/pasalStorage';
import { playTapSound } from '../../utils/audio';

interface PasalDashboardViewProps {
  shop: ShopProfile;
  onNavigateToTab: (tab: 'order' | 'customers' | 'inventory' | 'expenses' | 'udhar_khata') => void;
}

export const PasalDashboardView: React.FC<PasalDashboardViewProps> = ({
  shop,
  onNavigateToTab,
}) => {
  const [metrics, setMetrics] = useState(pasalStorage.getFinancialSummary(shop.id));
  const [orders, setOrders] = useState<CustomerOrder[]>(pasalStorage.getOrders(shop.id));
  const [refreshEpoch, setRefreshEpoch] = useState(Date.now());

  useEffect(() => {
    const unsub = pasalStorage.subscribe(() => {
      setMetrics(pasalStorage.getFinancialSummary(shop.id));
      setOrders(pasalStorage.getOrders(shop.id));
      setRefreshEpoch(Date.now());
    });
    return unsub;
  }, [shop.id]);

  // Compute status counts for today
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayOrders = orders.filter((o) => o.createdAt >= startOfToday);

  const completedCount = todayOrders.filter((o) => o.status === 'completed').length;
  const pendingCount = todayOrders.filter((o) => o.status === 'pending' || o.status === 'preparing').length;
  const cancelledCount = todayOrders.filter((o) => o.status === 'cancelled').length;

  // Compute popular items
  const itemCounts = new Map<string, { name: string; count: number; revenue: number }>();
  orders.forEach((o) => {
    if (o.status !== 'cancelled') {
      o.items.forEach((item) => {
        const existing = itemCounts.get(item.productId) || {
          name: item.productName,
          count: 0,
          revenue: 0,
        };
        existing.count += item.quantity;
        existing.revenue += item.total;
        itemCounts.set(item.productId, existing);
      });
    }
  });

  const popularItems = Array.from(itemCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Compute last 7 days sales for real bar graph
  const last7Days: { dateStr: string; dayName: string; sales: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const daySales = orders
      .filter((o) => o.createdAt >= dayStart && o.createdAt < dayEnd && o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.totalBill, 0);

    const dayName = d.toLocaleDateString('ne-NP', { weekday: 'short' });
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    last7Days.push({ dateStr, dayName, sales: daySales });
  }

  const maxDaySales = Math.max(...last7Days.map((d) => d.sales), 1000);

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* 4 PRIMARY METRIC CARDS (REAL DATABASE VALUES) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Today's Total Sales */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[11px] font-extrabold uppercase text-slate-500">आजको बिक्री (Sales)</span>
            <span className="p-1.5 rounded-xl bg-blue-50 text-blue-600 font-bold">रु</span>
          </div>
          <p className="text-xl font-black text-slate-900">रु {metrics.todaySales.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 font-medium">{metrics.todayOrdersCount} अर्डरहरू</p>
        </div>

        {/* Metric 2: Today's Cash Received */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-extrabold uppercase text-slate-500">नगद प्राप्त (Cash)</span>
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">💵</span>
          </div>
          <p className="text-xl font-black text-emerald-700">रु {metrics.todayCash.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-600 font-medium">आज उठेको नगद</p>
        </div>

        {/* Metric 3: Today's Credit Sales (Udhar) */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[11px] font-extrabold uppercase text-slate-500">आजको उधारो (Credit)</span>
            <span className="p-1.5 rounded-xl bg-amber-50 text-amber-600">📝</span>
          </div>
          <p className="text-xl font-black text-amber-700">रु {metrics.todayCredit.toLocaleString()}</p>
          <p className="text-[10px] text-amber-600 font-medium">आज थपिएको उधारो</p>
        </div>

        {/* Metric 4: Total Outstanding Customer Balance */}
        <div
          onClick={() => {
            playTapSound();
            onNavigateToTab('udhar_khata');
          }}
          className="p-4 rounded-3xl bg-rose-50/70 border border-rose-200/90 shadow-xs space-y-1 cursor-pointer hover:bg-rose-50 transition"
        >
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[11px] font-extrabold uppercase text-rose-800">कुल बाँकी उधारो</span>
            <span className="p-1.5 rounded-xl bg-rose-100 text-rose-700">⚠️</span>
          </div>
          <p className="text-xl font-black text-rose-600">रु {metrics.totalOutstanding.toLocaleString()}</p>
          <p className="text-[10px] text-rose-700 font-extrabold flex items-center gap-1">
            <span>उधार खाता हेर्नुहोस्</span>
            <span>›</span>
          </p>
        </div>
      </div>

      {/* PROMINENT DEDICATED MODULE: UDHAR KHATA (CUSTOMER CREDIT LEDGER) */}
      <div
        onClick={() => {
          playTapSound();
          onNavigateToTab('udhar_khata');
        }}
        className="p-4 rounded-3xl bg-gradient-to-r from-rose-900 via-indigo-950 to-slate-900 text-white shadow-lg shadow-rose-950/20 cursor-pointer active:scale-[0.99] transition relative overflow-hidden group border border-rose-500/40"
      >
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/25 p-1 border border-rose-400/40 flex items-center justify-center text-2xl shadow-md flex-shrink-0 group-hover:scale-110 transition">
              📕
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base tracking-tight leading-tight text-white">
                  उधार खाता (Udhar Khata Ledger)
                </h3>
                <span className="text-[10px] bg-rose-500 text-white font-black px-2 py-0.5 rounded-full uppercase">
                  ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-rose-200 font-medium mt-0.5 line-clamp-1">
                कुल बाँकी: रु {metrics.totalOutstanding.toLocaleString()} • आजको असुली, नयाँ उधारो र ग्राहक लेजर
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white/15 px-3 py-1.5 rounded-xl font-black text-xs flex-shrink-0 group-hover:bg-white/25 transition">
            <span>खाता खोल्नुहोस्</span>
            <span>›</span>
          </div>
        </div>
      </div>

      {/* Today's Order Status Breakdown */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            <span>आजको अर्डर स्थिति (Today's Orders: {todayOrders.length})</span>
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
            <p className="text-lg font-black text-emerald-700">{completedCount}</p>
            <p className="text-[10px] font-bold text-emerald-800">सम्पन्न (Completed)</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
            <p className="text-lg font-black text-amber-700">{pendingCount}</p>
            <p className="text-[10px] font-bold text-amber-800">तयारीमा (Preparing)</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-lg font-black text-slate-600">{cancelledCount}</p>
            <p className="text-[10px] font-bold text-slate-500">रद्द (Cancelled)</p>
          </div>
        </div>
      </div>

      {/* Last 7 Days Sales Graph (Real Database Data) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>पछिल्लो ७ दिनको दैनिक बिक्री (7-Day Sales Trend)</span>
          </span>
          <span className="text-xs font-black text-blue-700">
            महिनाको कुल: रु {metrics.monthlySales.toLocaleString()}
          </span>
        </div>

        {/* CSS Bar Chart */}
        <div className="h-40 flex items-end justify-between gap-2 pt-4 px-2">
          {last7Days.map((d, idx) => {
            const heightPercent = Math.max(8, Math.min(100, Math.round((d.sales / maxDaySales) * 100)));
            const isToday = idx === 6;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                {/* Tooltip on hover */}
                <span className="text-[9px] font-bold text-slate-500 font-mono">
                  {d.sales > 0 ? `रु ${d.sales}` : '0'}
                </span>

                {/* Animated Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full max-w-[32px] rounded-t-xl transition-all duration-300 ${
                    isToday ? 'bg-blue-600 shadow-sm' : 'bg-slate-200 group-hover:bg-blue-300'
                  }`}
                />

                {/* Day label */}
                <span className={`text-[10px] font-bold ${isToday ? 'text-blue-700' : 'text-slate-500'}`}>
                  {d.dateStr}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Popular Food Items / Products */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
            <Utensils className="w-4 h-4 text-amber-600" />
            <span>धेरै बिक्री हुने परिकारहरू (Popular Items)</span>
          </span>
          <button
            onClick={() => {
              playTapSound();
              onNavigateToTab('inventory');
            }}
            className="text-[10px] font-extrabold text-blue-600 hover:underline"
          >
            मेनु हेर्नुहोस् ›
          </button>
        </div>

        {popularItems.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">अझै कुनै अर्डर भएको छैन।</p>
        ) : (
          <div className="space-y-2">
            {popularItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="font-extrabold text-slate-900">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900">{item.count} अर्डर</p>
                  <p className="text-[10px] text-slate-500">रु {item.revenue.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
