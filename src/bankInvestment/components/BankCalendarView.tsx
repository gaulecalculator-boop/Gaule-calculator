/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Advanced Bank & Investment Calendar (Nepali BS Primary + English AD Secondary)
 * - Monthly & Yearly views, Prev/Next month, Year selector, Today button
 * - 12 color-coded & icon-badged event types
 * - Merges custom user events with scheduled EMIs, SIPs, FD/RD maturities,
 *   Credit Card bills, Insurance premiums, & Recurring payments
 * - STRICT: Planned items never show Paid unless explicitly confirmed by user
 * - Date selection shows all events for that BS+AD date, plus full Event History
 */

import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  History,
  CalendarDays,
  TrendingUp,
  Landmark,
  Shield,
  CreditCard,
  Coins,
  Bell,
  Repeat,
  Percent,
  Sparkles,
} from 'lucide-react';
import { Currency, Language } from '../../types';
import {
  bsToAd,
  getBSDaysInMonth,
  getBSMonthFirstDayOfWeek,
  getBSMonthName,
  getWeekdayShort,
  NEPALI_MONTHS,
  toDevanagari,
} from '../../utils/nepaliCalendar';
import { bankDb } from '../db';
import {
  adTag,
  bsStrToAdStr,
  bsTag,
  EVENT_TYPE_META,
  formatADDateStr,
  formatBSMonthHeader,
  formatBSNumStr,
  formatMoney,
  getTodayDual,
  pick5,
  t5,
} from '../i18n';
import { buildAllCalendarEvents } from '../insightsAndReminders';
import {
  BankCalendarEvent,
  BankCalendarEventType,
  BankInvestmentDatabase,
  CalendarDisplayEvent,
} from '../types';
import { ConfirmDialog, DualBSDatePicker } from './ConfirmDialog';

interface BankCalendarViewProps {
  db: BankInvestmentDatabase;
  language: Language;
  currency: Currency;
  showToast: (msg: string) => void;
}

export function renderEventIcon(type: BankCalendarEventType, cls = 'w-3.5 h-3.5') {
  switch (type) {
    case 'sip_payment':
      return <TrendingUp className={cls} />;
    case 'loan_emi':
    case 'loan_due_date':
      return <Landmark className={cls} />;
    case 'mf_investment':
      return <Sparkles className={cls} />;
    case 'fd_maturity':
    case 'rd_deposit':
      return <Repeat className={cls} />;
    case 'interest_credit':
      return <Percent className={cls} />;
    case 'dividend_payment':
      return <Coins className={cls} />;
    case 'insurance_premium':
      return <Shield className={cls} />;
    case 'credit_card_bill':
      return <CreditCard className={cls} />;
    case 'investment_reminder':
      return <Bell className={cls} />;
    default:
      return <CalendarDays className={cls} />;
  }
}

export const BankCalendarView: React.FC<BankCalendarViewProps> = ({
  db,
  language,
  currency,
  showToast,
}) => {
  const today = getTodayDual();
  const [viewYear, setViewYear] = useState<number>(today.bsYear);
  const [viewMonth, setViewMonth] = useState<number>(today.bsMonth);
  const [selectedBsDate, setSelectedBsDate] = useState<string>(today.bsStr);
  const [viewMode, setViewMode] = useState<'month' | 'year' | 'history'>('month');
  const [typeFilter, setTypeFilter] = useState<'all' | BankCalendarEventType>('all');

  // Event Form Modal
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [evTitle, setEvTitle] = useState('');
  const [evType, setEvType] = useState<BankCalendarEventType>('custom');
  const [evBsDate, setEvBsDate] = useState(today.bsStr);
  const [evAdDate, setEvAdDate] = useState(today.adStr);
  const [evAmount, setEvAmount] = useState<number>(0);
  const [evNotes, setEvNotes] = useState('');
  const [evReminderEnabled, setEvReminderEnabled] = useState(true);
  const [evReminderDays, setEvReminderDays] = useState<number>(3);
  const [deleteTarget, setDeleteTarget] = useState<BankCalendarEvent | null>(null);

  const allEvents = useMemo(
    () => buildAllCalendarEvents(db, today.adStr, language),
    [db, today.adStr, language]
  );

  const filteredEvents = useMemo(() => {
    if (typeFilter === 'all') return allEvents;
    return allEvents.filter((e) => e.type === typeFilter);
  }, [allEvents, typeFilter]);

  const eventsByBsDate = useMemo(() => {
    const map = new Map<string, CalendarDisplayEvent[]>();
    for (const ev of filteredEvents) {
      const arr = map.get(ev.bsDate) || [];
      arr.push(ev);
      map.set(ev.bsDate, arr);
    }
    return map;
  }, [filteredEvents]);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => Math.max(2070, y - 1));
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => Math.min(2095, y + 1));
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    const t = getTodayDual();
    setViewYear(t.bsYear);
    setViewMonth(t.bsMonth);
    setSelectedBsDate(t.bsStr);
    setViewMode('month');
  };

  const openAddEvent = (targetBs?: string) => {
    const bs = targetBs || selectedBsDate || today.bsStr;
    setEditingEventId(null);
    setEvTitle('');
    setEvType('custom');
    setEvBsDate(bs);
    setEvAdDate(bsStrToAdStr(bs));
    setEvAmount(0);
    setEvNotes('');
    setEvReminderEnabled(true);
    setEvReminderDays(3);
    setShowEventModal(true);
  };

  const openEditEvent = (ev: CalendarDisplayEvent) => {
    if (ev.isAutoLinked) {
      showToast(
        t5(
          language,
          'Auto-linked schedule item: confirm payment or edit inside its Loan/SIP/Card screen.',
          'स्वतः जुड़ी प्रविष्टि: इसके लोन/SIP/कार्ड टैब में भुगतान पुष्टि या बदलाव करें।',
          'अपने आप जुड़ल आइटम: एकर कर्जा/SIP/कार्ड वाला हिस्सा में जाके भुगतान पक्का करीं या बदलीं।',
          'स्वतः जुड़ल मद: एकर कर्जा/SIP/कार्ड खंड मे भुगतान पुष्टि वा संपादन करू।',
          'स्वतः जोडिएको तालिका: ऋण/SIP/कार्ड खण्डमा गएर भुक्तानी पुष्टि वा सम्पादन गर्नुहोस्।'
        )
      );
      return;
    }
    setEditingEventId(ev.id);
    setEvTitle(ev.title);
    setEvType(ev.type);
    setEvBsDate(ev.bsDate);
    setEvAdDate(ev.adDate);
    setEvAmount(ev.amount);
    setEvNotes(ev.notes || '');
    setEvReminderEnabled(ev.reminderEnabled);
    setEvReminderDays(ev.reminderDaysBefore);
    setShowEventModal(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim()) {
      showToast(
        t5(
          language,
          'Please enter an event title',
          'कृपया कार्यक्रम का शीर्षक दर्ज करें',
          'कृपया काम/घटना के नाम लिखीं',
          'कृपया कार्यक्रमक शीर्षक लिखू',
          'कृपया कार्यक्रमको शीर्षक लेख्नुहोस्'
        )
      );
      return;
    }
    const [y, m, d] = evBsDate.split('-').map(Number);
    const existing = editingEventId ? db.calendarEvents.find((x) => x.id === editingEventId) : undefined;
    bankDb.upsertCalendarEvent({
      id: editingEventId || undefined,
      title: evTitle.trim(),
      type: evType,
      bsYear: y,
      bsMonth: m,
      bsDay: d,
      bsDate: evBsDate,
      adDate: evAdDate,
      amount: Math.max(0, evAmount),
      notes: evNotes.trim() || undefined,
      reminderEnabled: evReminderEnabled,
      reminderDaysBefore: Math.max(0, evReminderDays),
      isPaid: existing?.isPaid || false,
      paidDateAD: existing?.paidDateAD,
      paidDateBS: existing?.paidDateBS,
      linkedSourceType: existing?.linkedSourceType || 'manual',
    });
    setSelectedBsDate(evBsDate);
    setViewYear(y);
    setViewMonth(m);
    setShowEventModal(false);
    showToast(
      editingEventId
        ? t5(language, 'Calendar event updated', 'कैलेंडर कार्यक्रम अपडेट हुआ', 'कैलेंडर घटना अपडेट हो गइल', 'कैलेंडर कार्यक्रम अपडेट भेल', 'पात्रो कार्यक्रम अद्यावधिक भयो')
        : t5(language, 'Calendar event added', 'कैलेंडर कार्यक्रम जोड़ा गया', 'कैलेंडर घटना जुड़ गइल', 'कैलेंडर कार्यक्रम जोड़ल गेल', 'पात्रो कार्यक्रम थपियो')
    );
  };

  const handleConfirmAutoOrManualPaid = (ev: CalendarDisplayEvent) => {
    if (!ev.isAutoLinked) {
      bankDb.markCalendarEventPaid(ev.id, !ev.isPaid);
      showToast(
        !ev.isPaid
          ? t5(language, 'Confirmed Paid / Completed', 'भुगतान / पूर्ण पुष्टि हुई', 'भुगतान / पूरा भइल पक्का कइल गइल', 'भुगतान / पूर्ण पुष्टि भेल', 'भुक्तानी / सम्पन्न पुष्टि भयो')
          : t5(language, 'Marked Unpaid', 'अभुगतान के रूप में चिह्नित', 'बाकी के रूप में लिखल गइल', 'बकाया के रूप मे चिह्नित', 'बाँकी भनी चिनो लगाइयो')
      );
      return;
    }

    if (ev.isPaid) {
      showToast(
        t5(
          language,
          'Already confirmed paid in its source ledger.',
          'इसके मुख्य खाते में पहले ही भुगतान पुष्ट हो चुका है।',
          'एकर मुख्य खाता में पहिले से भुगतान पक्का हो चुकल बा।',
          'एकर मुख्य खाता मे पहिनहि सँ भुगतान पुष्टि भऽ चुकल अछि।',
          'यसको मुख्य खातामा पहिले नै भुक्तानी पुष्टि भइसकेको छ।'
        )
      );
      return;
    }

    if (ev.linkedSourceType === 'credit_card' && ev.linkedSourceId) {
      bankDb.confirmCreditCardBillPaid(ev.linkedSourceId, ev.amount);
      showToast(
        t5(
          language,
          'Credit card bill confirmed Paid',
          'क्रेडिट कार्ड बिल भुगतान पुष्ट हुआ',
          'क्रेडिट कार्ड बिल जमा भइल पक्का हो गइल',
          'क्रेडिट कार्ड बिल भुगतान पुष्टि भेल',
          'क्रेडिट कार्ड बिल भुक्तानी पुष्टि भयो'
        )
      );
    } else if (ev.linkedSourceType === 'sip' && ev.linkedSourceId) {
      const parts = ev.id.split('_');
      const instNo = Number(parts[parts.length - 1]);
      if (instNo > 0) {
        bankDb.confirmSipInstallment(ev.linkedSourceId, instNo, {
          paidDateAD: today.adStr,
          paidDateBS: today.bsStr,
          amount: ev.amount,
        });
        showToast(
          t5(
            language,
            'SIP installment confirmed Paid',
            'SIP किस्त भुगतान पुष्ट हुआ',
            'SIP किस्त जमा भइल पक्का हो गइल',
            'SIP किस्त भुगतान पुष्टि भेल',
            'SIP किस्ता भुक्तानी पुष्टि भयो'
          )
        );
      }
    } else if (ev.linkedSourceType === 'loan' && ev.linkedSourceId) {
      const loan = db.loans.find((l) => l.id === ev.linkedSourceId);
      const parts = ev.id.split('_');
      const instNo = Number(parts[parts.length - 1]);
      if (loan && instNo > 0) {
        bankDb.confirmLoanPayment(loan.id, {
          installmentNo: instNo,
          dueDateAD: ev.adDate,
          dueDateBS: ev.bsDate,
          paidDateAD: today.adStr,
          paidDateBS: today.bsStr,
          scheduledEmi: ev.amount,
          principalComponent: ev.amount,
          interestComponent: 0,
          extraPrincipalPaid: 0,
          totalPaid: ev.amount,
          rateApplied: loan.interestRate,
          method: 'bank',
        });
        showToast(
          t5(
            language,
            `EMI #${instNo} confirmed Paid`,
            `EMI #${instNo} भुगतान पुष्ट हुआ`,
            `EMI #${instNo} जमा भइल पक्का हो गइल`,
            `EMI #${instNo} भुगतान पुष्टि भेल`,
            `EMI #${instNo} भुक्तानी पुष्टि भयो`
          )
        );
      }
    } else {
      showToast(
        t5(
          language,
          'Open the linked Financial Tool tab to settle this recurring item.',
          'इस नियमित भुगतान को निपटाने के लिए संबंधित वित्तीय टूल टैब खोलें।',
          'ई नियमित खर्च चुकता करे खातिर जुड़ल वित्तीय टूल वाला हिस्सा खोलीं।',
          'ई नियमित भुगतान निबटेबा लेल संबंधित वित्तीय टूल टैब खोलू।',
          'यो नियमित भुक्तानी मिलाउन सम्बन्धित वित्तीय टूल ट्याब खोल्नुहोस्।'
        )
      );
    }
  };

  const daysInMonth = getBSDaysInMonth(viewYear, viewMonth);
  const firstWeekday = getBSMonthFirstDayOfWeek(viewYear, viewMonth);
  const selectedDayEvents = eventsByBsDate.get(selectedBsDate) || [];
  const yearsList = Array.from({ length: 21 }, (_, i) => 2075 + i);

  return (
    <div className="space-y-4">
      {/* Top Calendar Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 cursor-pointer"
              aria-label="Previous BS Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-2">
              <div className="text-sm font-extrabold text-slate-900">
                {formatBSMonthHeader(viewYear, viewMonth, language)}
              </div>
              <div className="text-[10px] text-slate-500 tabular-nums">
                {adTag(language)}: {formatADDateStr(bsToAd(viewYear, viewMonth, 1))} —{' '}
                {formatADDateStr(bsToAd(viewYear, viewMonth, daysInMonth))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 cursor-pointer"
              aria-label={t5(language, 'Next BS Month', 'अगला माह', 'अगिला महीना', 'अगिला मास', 'अर्को महिना')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <select
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="min-h-[38px] px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold tabular-nums"
              aria-label={t5(language, 'Select BS Year', 'वर्ष चुनें', 'साल चुनीं', 'वर्ष चुनू', 'वर्ष छान्नुहोस्')}
            >
              {yearsList.map((y) => (
                <option key={y} value={y}>
                  {language === 'en' ? `${y} BS` : `${toDevanagari(y)} ${bsTag(language)}`}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleJumpToday}
              className="min-h-[38px] px-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold cursor-pointer"
            >
              {t5(language, 'Today', 'आज', 'आज', 'आइ', 'आज')}
            </button>

            <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
              {(['month', 'year', 'history'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMode(m)}
                  className={`px-2.5 py-1.5 rounded-lg cursor-pointer ${
                    viewMode === m ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {m === 'month'
                    ? t5(language, 'Month', 'माह', 'महीना', 'मास', 'महिना')
                    : m === 'year'
                    ? t5(language, 'Year', 'वर्ष', 'साल', 'वर्ष', 'वर्ष')
                    : t5(language, 'History', 'इतिहास', 'पुराना हिसाब', 'इतिहास', 'इतिहास')}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => openAddEvent()}
              className="min-h-[38px] px-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t5(language, 'Add Event', 'कार्यक्रम जोड़ें', 'घटना जोड़ीं', 'कार्यक्रम जोड़ू', 'कार्यक्रम थप्नुहोस्')}</span>
            </button>
          </div>
        </div>

        {/* Category Filter Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
              typeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {t5(language, 'All Events', 'सभी कार्यक्रम', 'सभ घटना', 'सभ कार्यक्रम', 'सबै कार्यक्रम')} ({allEvents.length})
          </button>
          {(Object.keys(EVENT_TYPE_META) as BankCalendarEventType[]).map((typeKey) => {
            const meta = EVENT_TYPE_META[typeKey];
            const active = typeFilter === typeKey;
            return (
              <button
                key={typeKey}
                type="button"
                onClick={() => setTypeFilter(typeKey)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap flex items-center gap-1 border cursor-pointer ${
                  active ? `${meta.bg} ${meta.color} ${meta.border}` : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {renderEventIcon(typeKey, 'w-3 h-3')}
                <span>{pick5(language, meta, 'bankCalendar.eventType')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================== MONTH VIEW ===================== */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Calendar Grid */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-3">
            <div className="grid grid-cols-7 gap-1 mb-1.5">
              {Array.from({ length: 7 }, (_, idx) => (
                <div
                  key={idx}
                  className={`text-center text-[11px] font-bold py-1 ${
                    idx === 6 ? 'text-rose-600' : 'text-slate-500'
                  }`}
                >
                  {getWeekdayShort(idx, language)}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstWeekday }).map((_, idx) => (
                <div key={`blank_${idx}`} className="min-h-[60px] rounded-xl bg-slate-50/40" />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
                const bsKey = formatBSNumStr(viewYear, viewMonth, dayNum);
                const adDateObj = bsToAd(viewYear, viewMonth, dayNum);
                const adDay = adDateObj.getUTCDate();
                const isToday = bsKey === today.bsStr;
                const isSelected = bsKey === selectedBsDate;
                const dayEvents = eventsByBsDate.get(bsKey) || [];
                const isSat = (firstWeekday + dayNum - 1) % 7 === 6;

                return (
                  <button
                    key={bsKey}
                    type="button"
                    onClick={() => setSelectedBsDate(bsKey)}
                    className={`min-h-[64px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600'
                        : isToday
                        ? 'bg-amber-50/70 border-amber-400'
                        : 'bg-white border-slate-200/70 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <span
                        className={`text-xs font-extrabold tabular-nums ${
                          isToday
                            ? 'text-amber-800'
                            : isSat
                            ? 'text-rose-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {language === 'en' ? dayNum : toDevanagari(dayNum)}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono tabular-nums">{adDay}</span>
                    </div>

                    {/* Event color indicators */}
                    {dayEvents.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-1">
                        {dayEvents.slice(0, 4).map((ev) => (
                          <span
                            key={ev.id}
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: ev.isPaid ? '#16A34A' : EVENT_TYPE_META[ev.type].hex }}
                            title={ev.title}
                          />
                        ))}
                        {dayEvents.length > 4 && (
                          <span className="text-[8px] font-bold text-slate-500">+{dayEvents.length - 4}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Selected Date Event List */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <div className="text-sm font-extrabold text-slate-900 tabular-nums">
                  {selectedBsDate} {bsTag(language)}
                </div>
                <div className="text-[11px] text-slate-500 tabular-nums">
                  {adTag(language)}: {bsStrToAdStr(selectedBsDate)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => openAddEvent(selectedBsDate)}
                className="min-h-[38px] px-3 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t5(language, 'Add on Day', 'इस दिन जोड़ें', 'ई दिन जोड़ीं', 'एहि दिन जोड़ू', 'यस दिन थप्नुहोस्')}</span>
              </button>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CalendarDays className="w-7 h-7 text-slate-300 mx-auto" />
                <div className="text-xs font-bold text-slate-600">
                  {t5(language, 'No events on this date', 'इस तिथि पर कोई कार्यक्रम नहीं है', 'ई तारीख पर कवनो काम/घटना नइखे', 'एहि तिथि पर कोनो कार्यक्रम नहि अछि', 'यस मितिमा कुनै कार्यक्रम छैन')}
                </div>
                <p className="text-[11px] text-slate-400">
                  {t5(
                    language,
                    'Add a custom payment, FD maturity, dividend, or investment reminder.',
                    'भुक्तानी, FD परिपक्वता, लाभांश या निवेश रिमाइंडर जोड़ें।',
                    'कवनो भुगतान, FD तारीख, लाभांश या निवेश रिमाइंडर जोड़ीं।',
                    'भुगतान, FD परिपक्वता, लाभांश वा निवेश रिमाइंडर जोड़ू।',
                    'कुनै भुक्तानी, FD परिपक्वता, लाभांश वा लगानी रिमाइन्डर थप्नुहोस्।'
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto">
                {selectedDayEvents.map((ev) => {
                  const meta = EVENT_TYPE_META[ev.type];
                  return (
                    <div
                      key={ev.id}
                      className={`p-3 rounded-xl border space-y-2 ${
                        ev.isPaid ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className={`p-1.5 rounded-lg border ${meta.bg} ${meta.color} ${meta.border}`}>
                            {renderEventIcon(ev.type, 'w-4 h-4')}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900">{ev.title}</div>
                            <div className="text-[10px] text-slate-500">
                              {pick5(language, meta, 'bankCalendar.event')}
                              {ev.isAutoLinked
                                ? ` • ${t5(language, 'Linked', 'जुड़ा हुआ', 'जुड़ल', 'जुड़ल', 'जोडिएको')} (${ev.sourceLabel})`
                                : ''}
                            </div>
                          </div>
                        </div>
                        {ev.amount > 0 && (
                          <div className="text-xs font-extrabold text-slate-900 tabular-nums shrink-0">
                            {formatMoney(ev.amount, currency, language)}
                          </div>
                        )}
                      </div>

                      {ev.notes && <div className="text-[11px] text-slate-600">{ev.notes}</div>}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/70">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            ev.isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ev.isPaid
                            ? `${t5(language, 'Paid', 'भुगतान पूर्ण', 'जमा हो गइल', 'भुगतान पूर्ण', 'तिरेको')} (${ev.paidDateBS || t5(language, 'Confirmed', 'पुष्ट', 'पक्का', 'पुष्ट', 'पुष्टि')})`
                            : t5(language, 'Pending Confirmation', 'पुष्टि शेष', 'पक्का करे के बाकी', 'पुष्टि शेष', 'पुष्टि गर्न बाँकी')}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleConfirmAutoOrManualPaid(ev)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                              ev.isPaid
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>
                              {ev.isPaid
                                ? t5(language, 'Confirmed', 'पुष्ट', 'पक्का भइल', 'पुष्ट', 'पुष्टि भयो')
                                : t5(language, 'Mark Paid', 'भुगतान लिखें', 'जमा करीं', 'भुगतान चिह्नित करू', 'तिरेको लेख्नुहोस्')}
                            </span>
                          </button>

                          {!ev.isAutoLinked && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditEvent(ev)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                                aria-label={t5(language, 'Edit Event', 'संपादित करें', 'सुधारीं', 'संपादित करू', 'सम्पादन गर्नुहोस्')}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(ev)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                                aria-label={t5(language, 'Delete Event', 'हटाएं', 'हटाईं', 'हटाउ', 'हटाउनुहोस्')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== YEAR VIEW ===================== */}
      {viewMode === 'year' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {NEPALI_MONTHS.map((m) => {
            const prefix = `${viewYear}-${String(m.bsMonth).padStart(2, '0')}`;
            const monthEvents = filteredEvents.filter((e) => e.bsDate.startsWith(prefix));
            const unpaidCount = monthEvents.filter((e) => !e.isPaid).length;
            const totalAmt = monthEvents.reduce((s, e) => s + e.amount, 0);
            return (
              <button
                key={m.bsMonth}
                type="button"
                onClick={() => {
                  setViewMonth(m.bsMonth);
                  setViewMode('month');
                }}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                  viewMonth === m.bsMonth
                    ? 'bg-blue-50 border-blue-400'
                    : 'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="text-xs font-extrabold text-slate-900">
                  {getBSMonthName(m.bsMonth, language)} {language === 'en' ? viewYear : toDevanagari(viewYear)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                  {monthEvents.length} {t5(language, 'events', 'कार्यक्रम', 'घटना', 'कार्यक्रम', 'कार्यक्रम')} • {unpaidCount}{' '}
                  {t5(language, 'pending', 'शेष', 'बाकी', 'शेष', 'बाँकी')}
                </div>
                <div className="text-xs font-bold text-blue-700 mt-1 tabular-nums">
                  {formatMoney(totalAmt, currency, language)}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ===================== EVENT HISTORY VIEW ===================== */}
      {viewMode === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-600" />
              <span>
                {t5(
                  language,
                  'All Scheduled & Confirmed Events',
                  'सभी निर्धारित और पुष्ट कार्यक्रम',
                  'सभ तय आ पक्का भइल घटना',
                  'सभ निर्धारित आ पुष्ट कार्यक्रम',
                  'सबै निर्धारित तथा पुष्टि भएका कार्यक्रम'
                )}{' '}
                ({filteredEvents.length})
              </span>
            </h3>
          </div>
          {filteredEvents.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-6">
              {t5(language, 'No events recorded yet.', 'अभी तक कोई कार्यक्रम दर्ज नहीं है।', 'अभी ले कवनो घटना दर्ज नइखे।', 'एखन धरि कोनो कार्यक्रम दर्ज नहि अछि।', 'अहिलेसम्म कुनै कार्यक्रम दर्ता भएको छैन।')}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto text-xs">
              {filteredEvents.map((ev) => {
                const meta = EVENT_TYPE_META[ev.type];
                return (
                  <div key={ev.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{ev.title}</div>
                      <div className="text-[11px] text-slate-500 tabular-nums">
                        {ev.bsDate} {bsTag(language)} ({ev.adDate} {adTag(language)}) • {pick5(language, meta, 'bankCalendar.hist')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      <span className="font-bold text-slate-900">
                        {formatMoney(ev.amount, currency, language)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          ev.isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {ev.isPaid
                          ? t5(language, 'Paid', 'भुगतान पूर्ण', 'जमा भइल', 'भुगतान पूर्ण', 'तिरेको')
                          : t5(language, 'Pending', 'शेष', 'बाकी', 'शेष', 'बाँकी')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Calendar Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form onSubmit={handleSaveEvent} className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900">
              {editingEventId
                ? t5(language, 'Edit Calendar Event', 'कैलेंडर कार्यक्रम संपादित करें', 'कैलेंडर घटना सुधारीं', 'कैलेंडर कार्यक्रम संपादित करू', 'पात्रो कार्यक्रम सम्पादन गर्नुहोस्')
                : t5(language, 'Add Bank / Investment Event', 'बैंक / निवेश कार्यक्रम जोड़ें', 'बैंक / निवेश घटना जोड़ीं', 'बैंक / निवेश कार्यक्रम जोड़ू', 'बैंक / लगानी कार्यक्रम थप्नुहोस्')}
            </h3>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t5(language, 'Event Title *', 'कार्यक्रम शीर्षक *', 'घटना के नाम *', 'कार्यक्रम शीर्षक *', 'कार्यक्रम शीर्षक *')}
              </label>
              <input
                type="text"
                required
                value={evTitle}
                onChange={(e) => setEvTitle(e.target.value)}
                placeholder={t5(
                  language,
                  'e.g. Global IME FD Maturity / Dividend Credit',
                  'जैसे: बैंक FD परिपक्वता / लाभांश प्राप्ति',
                  'जइसे: बैंक FD पूरा होखे के तारीख / लाभांश',
                  'जेना: बैंक FD परिपक्वता / लाभांश प्राप्त',
                  'जस्तै: बैंक FD परिपक्वता / लाभांश प्राप्त'
                )}
                className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t5(language, 'Category', 'श्रेणी', 'श्रेणी', 'श्रेणी', 'प्रकार')}
                </label>
                <select
                  value={evType}
                  onChange={(e) => setEvType(e.target.value as BankCalendarEventType)}
                  className="w-full min-h-[40px] px-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  {(Object.keys(EVENT_TYPE_META) as BankCalendarEventType[]).map((k) => (
                    <option key={k} value={k}>
                      {pick5(language, EVENT_TYPE_META[k], 'bankCalendar.select')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t5(language, 'Amount', 'राशि', 'रकम', 'राशि', 'रकम')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={evAmount}
                  onChange={(e) => setEvAmount(Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                />
              </div>
            </div>

            <DualBSDatePicker
              label={t5(language, 'Event Date', 'कार्यक्रम तिथि', 'घटना के तारीख', 'कार्यक्रम तिथि', 'कार्यक्रम मिति')}
              bsDate={evBsDate}
              adDate={evAdDate}
              language={language}
              onChange={(b, a) => {
                setEvBsDate(b);
                setEvAdDate(a);
              }}
            />

            <div className="grid grid-cols-2 gap-2 items-center">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={evReminderEnabled}
                  onChange={(e) => setEvReminderEnabled(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span>{t5(language, 'Enable Reminder', 'रिमाइंडर चालू करें', 'याददाश्त चालू करीं', 'रिमाइंडर चालू करू', 'रिमाइन्डर सक्षम पार्नुहोस्')}</span>
              </label>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t5(language, 'Remind Days Before', 'कितने दिन पहले याद दिलाएं', 'कतना दिन पहिले याद दिआई', 'कतेक दिन पहिने याद देत', 'कति दिनअघि सम्झाउने')}
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={evReminderDays}
                  onChange={(e) => setEvReminderDays(Number(e.target.value))}
                  className="w-full min-h-[38px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t5(language, 'Notes', 'टिप्पणी', 'नोट / विवरण', 'नोट', 'टिप्पणी')}
              </label>
              <textarea
                rows={2}
                value={evNotes}
                onChange={(e) => setEvNotes(e.target.value)}
                placeholder={t5(
                  language,
                  'Account #, reference, bank branch...',
                  'खाता संख्या, संदर्भ, बैंक शाखा...',
                  'खाता नंबर, संदर्भ, बैंक शाखा...',
                  'खाता संख्या, संदर्भ, बैंक शाखा...',
                  'खाता नम्बर, सन्दर्भ, बैंक शाखा...'
                )}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="min-h-[40px] px-4 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
              >
                {t5(language, 'Cancel', 'रद्द करें', 'रद्द करीं', 'रद्द करू', 'रद्द गर्नुहोस्')}
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-5 rounded-xl bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                {editingEventId
                  ? t5(language, 'Update Event', 'अपडेट करें', 'अपडेट करीं', 'अपडेट करू', 'अद्यावधिक गर्नुहोस्')
                  : t5(language, 'Save Event', 'सेव करें', 'सेव करीं', 'सेव करू', 'सुरक्षित गर्नुहोस्')}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title={t5(language, 'Delete Calendar Event', 'कैलेंडर कार्यक्रम हटाएं', 'कैलेंडर घटना हटाईं', 'कैलेंडर कार्यक्रम हटाउ', 'पात्रो कार्यक्रम हटाउनुहोस्')}
        message={t5(
          language,
          `Delete "${deleteTarget?.title || ''}"?`,
          `क्या "${deleteTarget?.title || ''}" को हटाना चाहते हैं?`,
          `का "${deleteTarget?.title || ''}" के हटावे के बा?`,
          `की "${deleteTarget?.title || ''}" केँ हटाएब?`,
          `के "${deleteTarget?.title || ''}" हटाउने हो?`
        )}
        language={language}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            bankDb.deleteCalendarEvent(deleteTarget.id);
            showToast(t5(language, 'Calendar event deleted', 'कार्यक्रम हटा दिया गया', 'घटना हटा दिहल गइल', 'कार्यक्रम हटाएल गेल', 'कार्यक्रम हटाइयो'));
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
};
