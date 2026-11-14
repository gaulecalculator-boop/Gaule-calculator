/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Expense Tracker & Profit Reports — Hamro Pasal
 * Tracks Rent, Electricity, Staff Salary, Transport, Supplies
 * Computes Gross Profit & Net Profit accurately.
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, PieChart, Check } from 'lucide-react';
import { ShopProfile, ShopExpense } from '../types';
import { pasalStorage } from '../storage/pasalStorage';
import { playTapSound, playSuccessSound } from '../../utils/audio';

interface ExpenseTrackerViewProps {
  shop: ShopProfile;
}

export const ExpenseTrackerView: React.FC<ExpenseTrackerViewProps> = ({ shop }) => {
  const [expenses, setExpenses] = useState<ShopExpense[]>(pasalStorage.getExpenses(shop.id));
  const [metrics, setMetrics] = useState(pasalStorage.getFinancialSummary(shop.id));

  // Add Expense form
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<ShopExpense['category']>('rent');
  const [amountStr, setAmountStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  useEffect(() => {
    const unsub = pasalStorage.subscribe(() => {
      setExpenses(pasalStorage.getExpenses(shop.id));
      setMetrics(pasalStorage.getFinancialSummary(shop.id));
    });
    return unsub;
  }, [shop.id]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr);
    if (!title.trim() || isNaN(amount) || amount <= 0) return;

    pasalStorage.createExpense({
      shopId: shop.id,
      title: title.trim(),
      category,
      amount,
      paymentMethod: 'cash',
      date: new Date().toISOString().split('T')[0],
      notes: notes.trim() || undefined,
    });

    playSuccessSound();
    setTitle('');
    setAmountStr('');
    setNotes('');
    setIsAdding(false);
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('के तपाईं यो खर्च हटाउन निश्चित हुनुहुन्छ?')) {
      playTapSound();
      pasalStorage.deleteExpense(shop.id, id);
    }
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* Profit & Loss Report Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-sm uppercase text-slate-300">नाफा/नोक्सान हिसाब (Profit & Loss)</h2>
            <p className="text-xs text-blue-200">यो महिनाको वास्तविक विवरण</p>
          </div>
          <span className="p-2 rounded-2xl bg-white/10 text-emerald-400 font-black text-xs">
            {metrics.netProfit >= 0 ? '🟢 नाफा (Profit)' : '🔴 नोक्सान (Loss)'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
            <p className="text-[10px] text-blue-200 font-bold uppercase">कुल आम्दानी (Sales)</p>
            <p className="text-sm font-black text-white mt-1">रु {metrics.monthlySales.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md">
            <p className="text-[10px] text-rose-300 font-bold uppercase">कुल खर्च (Expenses)</p>
            <p className="text-sm font-black text-rose-300 mt-1">रु {metrics.totalExpenses.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/30">
            <p className="text-[10px] text-emerald-200 font-bold uppercase">खुद नाफा (Net Profit)</p>
            <p className="text-sm font-black text-emerald-300 mt-1">रु {metrics.netProfit.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Expenses List & Add Form */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 uppercase">खर्च विवरण (Expenses List)</span>
          <button
            onClick={() => {
              playTapSound();
              setIsAdding(!isAdding);
            }}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ खर्च थप्नुहोस्</span>
          </button>
        </div>

        {/* Add Form */}
        {isAdding && (
          <form onSubmit={handleAddExpense} className="p-3 rounded-2xl bg-slate-50 border border-slate-300 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="खर्च शीर्षक (उदा: सटर भाडा, बत्ती महसुल)"
                className="bg-white border border-slate-300 rounded-xl p-2 font-bold"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-xl p-2 font-bold"
              >
                <option value="rent">सटर भाडा (Rent)</option>
                <option value="electricity">बत्ती/पानी (Electricity)</option>
                <option value="salary">कर्मचारी तलब (Salary)</option>
                <option value="transport">ढुवानी (Transport)</option>
                <option value="supplies">सामग्री/ग्यास (Supplies)</option>
                <option value="other">अन्य खर्च (Other)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="रकम (NPR)"
                className="bg-white border border-slate-300 rounded-xl p-2 font-black text-rose-600"
              />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="कैफियत (ऐच्छिक)"
                className="bg-white border border-slate-300 rounded-xl p-2"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                सुरक्षित गर्नुहोस्
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold"
              >
                रद्द
              </button>
            </div>
          </form>
        )}

        {/* Expenses Feed */}
        <div className="space-y-2 max-h-[360px] overflow-y-auto">
          {expenses.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">कुनै खर्च दर्ता गरिएको छैन।</p>
          ) : (
            expenses.map((exp) => (
              <div
                key={exp.id}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-extrabold text-slate-900">{exp.title}</p>
                  <p className="text-[10px] text-slate-500">
                    {exp.category} • {exp.date} {exp.notes ? `(${exp.notes})` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="font-black text-rose-600 text-sm">
                    रु {exp.amount.toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
