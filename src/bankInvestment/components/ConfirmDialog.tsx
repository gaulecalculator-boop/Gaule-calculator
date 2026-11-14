/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared UI Helpers:
 * 1. ConfirmDialog (replaces forbidden window.confirm)
 * 2. DualBSDatePicker (Nepali BS primary + English AD secondary synchronized)
 */

import React from 'react';
import { AlertTriangle, Calendar, X } from 'lucide-react';
import { Language } from '../../types';
import { getBSDaysInMonth, getBSMonthName, NEPALI_MONTHS, toDevanagari } from '../../utils/nepaliCalendar';
import { adTag, bsStrToAdStr, bsTag, formatBSNumStr, parseBSDateStr, t5 } from '../i18n';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  language?: Language;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = true,
  language = 'en',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;
  const resolvedConfirm =
    confirmLabel || t5(language, 'Confirm Delete', 'हटाना पक्का करें', 'हटावल पक्का करीं', 'हटेनाइ पक्का करू', 'हटाउने निश्चित गर्नुहोस्');
  const resolvedCancel =
    cancelLabel || t5(language, 'Cancel', 'रद्द करें', 'रद्द करीं', 'रद्द करू', 'रद्द गर्नुहोस्');

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                danger ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 text-xs text-slate-600 leading-relaxed">{message}</div>
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[40px] px-4 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
          >
            {resolvedCancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`min-h-[40px] px-4 rounded-xl text-white text-xs font-bold cursor-pointer ${
              danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            {resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  );
};

interface DualBSDatePickerProps {
  label: string;
  bsDate: string; // YYYY-MM-DD
  adDate: string; // YYYY-MM-DD
  onChange: (nextBs: string, nextAd: string) => void;
  minBsYear?: number;
  maxBsYear?: number;
  language?: Language;
}

export const DualBSDatePicker: React.FC<DualBSDatePickerProps> = ({
  label,
  bsDate,
  adDate,
  onChange,
  minBsYear = 2070,
  maxBsYear = 2095,
  language = 'en',
}) => {
  const parsed = parseBSDateStr(bsDate);
  const maxDay = getBSDaysInMonth(parsed.year, parsed.month);
  const years = Array.from({ length: maxBsYear - minBsYear + 1 }, (_, i) => minBsYear + i);

  const updateParts = (y: number, m: number, d: number) => {
    const clampedDay = Math.min(d, getBSDaysInMonth(y, m));
    const nextBs = formatBSNumStr(y, m, clampedDay);
    const nextAd = bsStrToAdStr(nextBs);
    onChange(nextBs, nextAd);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>{label} ({bsTag(language)})</span>
        </label>
        <span className="text-[10px] font-mono text-slate-500 tabular-nums">
          {adTag(language)}: {adDate}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <select
          value={parsed.year}
          onChange={(e) => updateParts(Number(e.target.value), parsed.month, parsed.day)}
          className="min-h-[40px] px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 tabular-nums outline-none focus:border-blue-600"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {language === 'en' ? y : toDevanagari(y)} {bsTag(language)}
            </option>
          ))}
        </select>

        <select
          value={parsed.month}
          onChange={(e) => updateParts(parsed.year, Number(e.target.value), parsed.day)}
          className="min-h-[40px] px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-600"
        >
          {NEPALI_MONTHS.map((m) => (
            <option key={m.bsMonth} value={m.bsMonth}>
              {language === 'en' ? m.bsMonth : toDevanagari(m.bsMonth)}. {getBSMonthName(m.bsMonth, language)}
            </option>
          ))}
        </select>

        <select
          value={parsed.day}
          onChange={(e) => updateParts(parsed.year, parsed.month, Number(e.target.value))}
          className="min-h-[40px] px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 tabular-nums outline-none focus:border-blue-600"
        >
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {language === 'en' ? d : toDevanagari(d)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
