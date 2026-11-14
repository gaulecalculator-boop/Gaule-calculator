/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { X, Check, CalendarDays, Plus, AlertCircle, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  MilkCustomer,
  DailyMilkRecord,
  MilkPayment,
  NoMilkDayRecord,
} from '../../types/milkManagement';
import { calculateCustomerBillingCycles, getTodayISOLocal } from '../../utils/milkManagementStorage';
import {
  NEPALI_MONTHS,
  WEEKDAYS,
  getBSDaysInMonth,
  getBSMonthFirstDayOfWeek,
  bsToAd,
} from '../../utils/nepaliCalendar';
import { playTapSound } from '../../utils/audio';
import { Language } from '../../types';
import { translateUserData, localizeNumberString } from '../../utils/universalTranslator';

interface MilkSmartCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: MilkCustomer[];
  targetCustomer: MilkCustomer | null;
  onSelectCustomer: (cust: MilkCustomer | null) => void;
  dailyRecords: DailyMilkRecord[];
  payments: MilkPayment[];
  noMilkDays: NoMilkDayRecord[];
  todayBS: { year: number; month: number; day: number };
  onQuickDailyEntry: (cust: MilkCustomer, dateISO: string) => void;
  onQuickNoMilkDay: (cust: MilkCustomer, dateISO: string) => void;
  onQuickPayment: (cust: MilkCustomer) => void;
  language?: Language;
}

export const MilkSmartCalendarModal: React.FC<MilkSmartCalendarModalProps> = ({
  isOpen,
  onClose,
  customers,
  targetCustomer,
  onSelectCustomer,
  dailyRecords,
  payments,
  noMilkDays,
  todayBS,
  onQuickDailyEntry,
  onQuickNoMilkDay,
  onQuickPayment,
  language = 'ne',
}) => {
  const trData = (s?: string) => translateUserData(s || '', language);
  const trNum = (v: string | number) => localizeNumberString(v, language);
  const rsPrefix = language === 'en' ? 'Rs.' : 'रु';
  const fmtCur = (n: number) => `${rsPrefix} ${trNum((n || 0).toLocaleString())}`;
  const [calYear, setCalYear] = useState<number>(todayBS.year);
  const [calMonth, setCalMonth] = useState<number>(todayBS.month);
  const [selectedDayNum, setSelectedDayNum] = useState<number>(todayBS.day);

  useEffect(() => {
    if (isOpen) {
      setCalYear(todayBS.year);
      setCalMonth(todayBS.month);
      setSelectedDayNum(todayBS.day);
    }
  }, [isOpen, todayBS.year, todayBS.month, todayBS.day]);

  const todayIso = useMemo(() => getTodayISOLocal(), [isOpen]);

  const activeCust = targetCustomer;
  const custCycles = useMemo(
    () => (activeCust ? calculateCustomerBillingCycles(activeCust) : []),
    [activeCust, dailyRecords, payments]
  );

  const allCustomersDueByBsMap = useMemo(() => {
    const map = new Map<string, MilkCustomer[]>();
    if (activeCust) return map;
    customers
      .filter((c) => c.status !== 'inactive')
      .forEach((c) => {
        const cycles = calculateCustomerBillingCycles(c);
        cycles.forEach((cyc) => {
          const list = map.get(cyc.dueDateBS) || [];
          if (!list.some((existing) => existing.id === c.id)) {
            list.push(c);
          }
          map.set(cyc.dueDateBS, list);
        });
      });
    return map;
  }, [activeCust, customers, dailyRecords, payments]);

  const custDailyMap = useMemo(() => {
    const map = new Map<string, DailyMilkRecord>();
    if (!activeCust) return map;
    dailyRecords
      .filter((r) => r.customerId === activeCust.id)
      .forEach((r) => map.set(r.bsDate, r));
    return map;
  }, [activeCust, dailyRecords]);

  const custNoMilkMap = useMemo(() => {
    const map = new Map<string, NoMilkDayRecord>();
    if (!activeCust) return map;
    noMilkDays
      .filter((n) => n.customerId === activeCust.id)
      .forEach((n) => map.set(n.bsDate, n));
    return map;
  }, [activeCust, noMilkDays]);

  const custPaymentMap = useMemo(() => {
    const map = new Map<string, MilkPayment[]>();
    if (!activeCust) return map;
    payments
      .filter((p) => p.customerId === activeCust.id)
      .forEach((p) => {
        const list = map.get(p.bsDate) || [];
        list.push(p);
        map.set(p.bsDate, list);
      });
    return map;
  }, [activeCust, payments]);

  if (!isOpen) return null;

  const daysInMonth = getBSDaysInMonth(calYear, calMonth);
  const firstDow = getBSMonthFirstDayOfWeek(calYear, calMonth);

  const selectedBsStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(
    Math.min(selectedDayNum, daysInMonth)
  ).padStart(2, '0')}`;

  let selectedIso = todayIso;
  try {
    selectedIso = bsToAd(calYear, calMonth, Math.min(selectedDayNum, daysInMonth))
      .toISOString()
      .split('T')[0];
  } catch {}

  const selectedDayRecord = custDailyMap.get(selectedBsStr);
  const selectedDayNoMilk = custNoMilkMap.get(selectedBsStr);
  const selectedDayPayments = custPaymentMap.get(selectedBsStr) || [];
  const selectedDayDueCycle = custCycles.find((c) => c.dueDateBS === selectedBsStr);
  const isSelectedStartDay = activeCust?.startBsDate === selectedBsStr;

  const getDueColorStyle = (dueDateISO: string, remainingBalance: number) => {
    if (remainingBalance <= 0) {
      return {
        cellClass: 'bg-emerald-500 border-emerald-600 text-white shadow-xs',
        label: 'Paid ✓',
      };
    }
    const dueTime = new Date(dueDateISO + 'T00:00:00Z').getTime();
    const todayTime = new Date(todayIso + 'T00:00:00Z').getTime();
    const diffDays = Math.round((dueTime - todayTime) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        cellClass: 'bg-rose-900 border-rose-950 text-white shadow-xs',
        label: `${Math.abs(diffDays)}d Overdue`,
      };
    }
    if (diffDays === 0) {
      return {
        cellClass: 'bg-red-600 border-red-800 text-white ring-2 ring-red-400 shadow-sm',
        label: 'Due Today ✓',
      };
    }
    if (diffDays === 1) {
      return {
        cellClass: 'bg-red-500 border-red-600 text-white shadow-xs',
        label: '1d Left',
      };
    }
    if (diffDays === 2) {
      return {
        cellClass: 'bg-orange-400 border-orange-500 text-white shadow-xs',
        label: '2d Left',
      };
    }
    if (diffDays === 3) {
      return {
        cellClass: 'bg-yellow-200 border-yellow-400 text-yellow-900 shadow-xs',
        label: '3d Left',
      };
    }
    return {
      cellClass: 'bg-amber-50 border-amber-300 text-amber-900',
      label: 'Due ✓',
    };
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[55] bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-3 animate-in fade-in duration-150"
    >
      <div className="bg-white w-full max-w-md max-h-[94vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <CalendarDays className="w-5 h-5 text-blue-200 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-black truncate">
                स्मार्ट नेपाली BS क्यालेन्डर (Smart BS Calendar)
              </h3>
              <p className="text-[11px] text-blue-100 truncate">
                {activeCust
                  ? `${trData(activeCust.name)} • सुरु: ${trNum(activeCust.startBsDate)}`
                  : 'सबै ग्राहकहरूको भुक्तानी Due मिति'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3">
          {/* Customer Switcher */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <span className="text-[11px] font-black text-slate-600 pl-1 whitespace-nowrap">
              ग्राहक:
            </span>
            <select
              value={activeCust?.id || 'all'}
              onChange={(e) => {
                playTapSound();
                const val = e.target.value;
                onSelectCustomer(val === 'all' ? null : customers.find((c) => c.id === val) || null);
              }}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-900 outline-none cursor-pointer"
            >
              <option value="all">🌐 सबै ग्राहक (All Customers Due View)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  👤 {trData(c.name)} (सुरु: {trNum(c.startBsDate)})
                </option>
              ))}
            </select>
          </div>

          {/* Month/Year Navigation */}
          <div className="flex items-center justify-between bg-blue-50/70 px-3 py-2 rounded-2xl border border-blue-100">
            <button
              type="button"
              onClick={() => {
                playTapSound();
                if (calMonth === 1) {
                  setCalYear((y) => y - 1);
                  setCalMonth(12);
                } else {
                  setCalMonth((m) => m - 1);
                }
              }}
              className="w-8 h-8 rounded-xl bg-white border border-blue-200 text-blue-800 font-black flex items-center justify-center hover:bg-blue-100 active:scale-95 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <div className="text-center">
                <div className="text-sm font-black text-blue-950">
                  {language === 'en' ? NEPALI_MONTHS[calMonth - 1]?.nameEn : NEPALI_MONTHS[calMonth - 1]?.nameNe} {trNum(calYear)}
                </div>
                <div className="text-[10px] font-bold text-blue-600">
                  {NEPALI_MONTHS[calMonth - 1]?.nameEn} {calYear} BS
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  setCalYear(todayBS.year);
                  setCalMonth(todayBS.month);
                  setSelectedDayNum(todayBS.day);
                }}
                className="text-[10px] font-black bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded-lg cursor-pointer"
              >
                आज
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                playTapSound();
                if (calMonth === 12) {
                  setCalYear((y) => y + 1);
                  setCalMonth(1);
                } else {
                  setCalMonth((m) => m + 1);
                }
              }}
              className="w-8 h-8 rounded-xl bg-white border border-blue-200 text-blue-800 font-black flex items-center justify-center hover:bg-blue-100 active:scale-95 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => (
              <div
                key={w.shortEn}
                className={`text-[10px] font-black py-1 ${
                  w.isHoliday ? 'text-rose-600' : 'text-slate-500'
                }`}
              >
                {language === 'en' ? w.shortEn : w.shortNe}
              </div>
            ))}

            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`blank_${i}`} className="h-12 rounded-xl bg-slate-50/40" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const bsStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday =
                todayBS.year === calYear && todayBS.month === calMonth && todayBS.day === dayNum;
              const isSelected = selectedDayNum === dayNum;

              if (!activeCust) {
                // Global view: show how many customers have Due Date on this exact BS date
                const dueCustomers = allCustomersDueByBsMap.get(bsStr) || [];
                return (
                  <button
                    key={`g_${dayNum}`}
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setSelectedDayNum(dayNum);
                    }}
                    className={`h-12 rounded-xl p-1 border flex flex-col justify-between text-left transition cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-blue-500 border-blue-600 bg-blue-50'
                        : isToday
                        ? 'bg-blue-50 border-blue-400 font-black'
                        : dueCustomers.length > 0
                        ? 'bg-amber-50 border-amber-300'
                        : 'bg-white border-slate-100'
                    }`}
                  >
                    <span className={`text-[11px] font-black ${isToday ? 'text-blue-700' : 'text-slate-800'}`}>
                      {trNum(dayNum)}
                    </span>
                    {dueCustomers.length > 0 && (
                      <span className="text-[8px] font-black text-amber-900 bg-amber-200 px-1 rounded truncate w-full text-center">
                        ✓ {trNum(dueCustomers.length)} Due
                      </span>
                    )}
                  </button>
                );
              }

              // Per-Customer Smart BS Calendar View
              const daily = custDailyMap.get(bsStr);
              const noMilk = custNoMilkMap.get(bsStr) || daily?.isNoMilk;
              const dayPays = custPaymentMap.get(bsStr) || [];
              const dueCycle = custCycles.find((c) => c.dueDateBS === bsStr);
              const isStartDate = activeCust.startBsDate === bsStr;

              let cellClass = 'bg-white border-slate-100 text-slate-800 hover:bg-slate-50';
              if (dueCycle) {
                cellClass = getDueColorStyle(dueCycle.dueDateISO, dueCycle.remainingBalance).cellClass;
              } else if (dayPays.length > 0) {
                cellClass = 'bg-emerald-500 border-emerald-600 text-white shadow-xs';
              } else if (noMilk) {
                cellClass = 'bg-rose-50 border-rose-200 text-rose-800';
              } else if (isStartDate) {
                cellClass = 'bg-blue-600 border-blue-700 text-white shadow-xs';
              } else if (daily && daily.totalMilk > 0) {
                cellClass = 'bg-sky-50 border-sky-200 text-sky-900';
              }

              return (
                <button
                  key={`c_${dayNum}`}
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setSelectedDayNum(dayNum);
                  }}
                  className={`h-12 rounded-xl p-1 border flex flex-col justify-between text-left transition cursor-pointer relative ${cellClass} ${
                    isSelected ? 'ring-2 ring-indigo-600 ring-offset-1' : ''
                  } ${isToday && !dueCycle && dayPays.length === 0 ? 'border-blue-500 border-2' : ''}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] font-black leading-none">{trNum(dayNum)}</span>
                    {dueCycle && <Check className="w-3 h-3 stroke-[3]" />}
                    {!dueCycle && isStartDate && <span className="text-[8px] font-black">सुरु</span>}
                    {!dueCycle && !isStartDate && dayPays.length > 0 && (
                      <span className="text-[8px] font-black">₹</span>
                    )}
                  </div>

                  <div className="w-full text-center">
                    {noMilk ? (
                      <span className="text-[8px] font-black block leading-none">🚫 {trNum(0)}L</span>
                    ) : daily && daily.totalMilk > 0 ? (
                      <span className="text-[8px] font-black block leading-none truncate">
                        {trNum(daily.totalMilk)}L
                      </span>
                    ) : dueCycle ? (
                      <span className="text-[7px] font-black block leading-none truncate">
                        {dueCycle.remainingBalance <= 0 ? 'Paid' : 'DUE'}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 6-Color Automatic Warning Legend */}
          <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200 space-y-1.5">
            <div className="text-[10px] font-black text-slate-600 uppercase">
              रङ संकेत (Smart Calendar Color Guide)
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[9px] font-bold">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-yellow-200 border border-yellow-400 shrink-0" />
                <span>३ दिन बाँकी</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-orange-400 shrink-0" />
                <span>२ दिन बाँकी</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-500 shrink-0" />
                <span>१ दिन बाँकी</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-600 shrink-0" />
                <span>Due Date ✓</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-rose-900 shrink-0" />
                <span>Overdue (म्याद नाघेको)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
                <span>Paid / भुक्तानी ✓</span>
              </div>
            </div>
          </div>

          {/* Selected Day Details Card */}
          {activeCust ? (
            <div className="bg-white rounded-2xl p-3 border border-blue-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-900">
                    📅 मिति: {trNum(selectedBsStr)} BS
                  </span>
                  <span className="text-[10px] text-slate-500 block font-mono">
                    ({trNum(selectedIso)} AD)
                  </span>
                </div>
                {isSelectedStartDay && (
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-black">
                    🚀 दूध सुरु मिति (Start Date)
                  </span>
                )}
              </div>

              {selectedDayDueCycle && (
                <div
                  className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between ${
                    selectedDayDueCycle.remainingBalance <= 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <span>
                    ✓ बिल Due मिति ({trData(selectedDayDueCycle.cycleName)})
                  </span>
                  <span className="font-black">
                    {selectedDayDueCycle.remainingBalance <= 0
                      ? 'चुक्ता (Paid)'
                      : `बाँकी: ${fmtCur(selectedDayDueCycle.remainingBalance)}`}
                  </span>
                </div>
              )}

              {selectedDayNoMilk && (
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                  🚫 दूध गएन (No Milk Day): {selectedDayNoMilk.reason ? trData(selectedDayNoMilk.reason) : 'छुट्टी'}
                </div>
              )}

              {selectedDayRecord && !selectedDayRecord.isNoMilk && (
                <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-bold flex items-center justify-between">
                  <span>
                    🥛 बिहान: {trNum(selectedDayRecord.morningMilk)}L • बेलुका: {trNum(selectedDayRecord.eveningMilk)}L
                  </span>
                  <span className="font-black">
                    {trNum(selectedDayRecord.totalMilk)}L = {fmtCur(selectedDayRecord.totalAmount)}
                  </span>
                </div>
              )}

              {selectedDayPayments.map((pay) => (
                <div
                  key={pay.id}
                  className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between"
                >
                  <span>✅ भुक्तानी प्राप्त ({pay.paymentMethod.toUpperCase()})</span>
                  <span className="font-black">{fmtCur(pay.amount)}</span>
                </div>
              ))}

              {/* Quick Actions for Selected Day */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onQuickDailyEntry(activeCust, selectedIso);
                  }}
                  className="py-2 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>दूध प्रविष्टि</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onQuickNoMilkDay(activeCust, selectedIso);
                  }}
                  className="py-2 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>दूध गएन</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onQuickPayment(activeCust);
                  }}
                  className="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>भुक्तानी</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs">
              <div className="font-black text-slate-800 mb-1">
                📅 {trNum(selectedBsStr)} BS मा भुक्तानी Due भएका ग्राहकहरू:
              </div>
              {(() => {
                const dueList = allCustomersDueByBsMap.get(selectedBsStr) || [];
                if (dueList.length === 0) {
                  return <p className="text-slate-500 text-[11px]">यस मितिमा कुनै ग्राहकको Due मिति छैन।</p>;
                }
                return (
                  <div className="space-y-1">
                    {dueList.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          playTapSound();
                          onSelectCustomer(c);
                        }}
                        className="w-full text-left p-2 rounded-xl bg-white border border-slate-200 hover:border-blue-400 flex items-center justify-between cursor-pointer"
                      >
                        <span className="font-black text-slate-900">{trData(c.name)}</span>
                        <span className="text-[10px] font-bold text-blue-600">क्यालेन्डर हेर्नुहोस् ➔</span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
