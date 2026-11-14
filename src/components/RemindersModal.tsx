/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Ghaule Calendar — Offline Reminders & Notifications Manager
 * Schedules holy Ekadashi alerts, Purnima/Amavasya notifications,
 * Nepali festival reminders, and custom birthdays & events.
 */

import React, { useState } from 'react';
import {
  X,
  Bell,
  BellRing,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  Check,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Language } from '../types';
import {
  notificationEngine,
  AppReminder,
  NotificationSettings,
  ReminderCategory,
} from '../utils/notificationEngine';
import { playTapSound, playSuccessSound } from '../utils/audio';

interface RemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  showToast: (msg: string) => void;
}

export const RemindersModal: React.FC<RemindersModalProps> = ({
  isOpen,
  onClose,
  language,
  showToast,
}) => {
  const [settings, setSettings] = useState<NotificationSettings>(() =>
    notificationEngine.getSettings()
  );
  const [reminders, setReminders] = useState<AppReminder[]>(() =>
    notificationEngine.getAllReminders()
  );
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<ReminderCategory>('festival');
  const [newMonth, setNewMonth] = useState<number>(7);
  const [newDay, setNewDay] = useState<number>(1);
  const [newTime, setNewTime] = useState<string>('07:00');
  const [newNotes, setNewNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleToggleSetting = (key: keyof NotificationSettings) => {
    playTapSound();
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    notificationEngine.saveSettings(updated);
    showToast(language === 'ne' ? 'सेटिङ्स सुरक्षित भयो' : 'Settings updated');
  };

  const handleRequestPermission = async () => {
    playTapSound();
    const perm = await notificationEngine.requestPermission();
    if (perm === 'granted') {
      playSuccessSound();
      showToast(language === 'ne' ? 'सूचना अनुमति प्राप्त भयो!' : 'Notification permission granted!');
    } else {
      showToast(
        language === 'ne'
          ? 'सूचना अनुमति अस्वीकृत वा असमर्थित।'
          : 'Notification permission denied or unsupported.'
      );
    }
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast(language === 'ne' ? 'कृपया शीर्षक लेख्नुहोस्' : 'Please enter reminder title');
      return;
    }

    playSuccessSound();
    const saved = notificationEngine.saveReminder({
      category: newCategory,
      titleNe: newTitle,
      titleEn: newTitle,
      notes: newNotes,
      bsMonth: newMonth,
      bsDay: newDay,
      timeStr: newTime,
      enabled: true,
    });

    setReminders(notificationEngine.getAllReminders());
    setIsAddingCustom(false);
    setNewTitle('');
    setNewNotes('');
    showToast(language === 'ne' ? 'नयाँ रिमाइन्डर थपियो!' : 'New reminder created!');
  };

  const handleDelete = (id: string) => {
    playTapSound();
    notificationEngine.deleteReminder(id);
    setReminders(notificationEngine.getAllReminders());
    showToast(language === 'ne' ? 'रिमाइन्डर हटाइयो' : 'Reminder deleted');
  };

  const handleToggle = (id: string) => {
    playTapSound();
    notificationEngine.toggleReminder(id);
    setReminders(notificationEngine.getAllReminders());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 text-white flex items-center justify-center border border-white/30">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                {language === 'ne' ? 'पर्व तथा तिथि स्मरण (Reminders)' : 'Calendar & Festival Reminders'}
              </h3>
              <p className="text-[11px] text-blue-200">
                {language === 'ne'
                  ? 'एकादशी, पूर्णिमा, चाडपर्व तथा व्यक्तिगत सूचना'
                  : 'Ekadashi, Purnima, Festivals & Custom Alerts'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Permission Card */}
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-indigo-900">
                {language === 'ne' ? 'डिभाइस सूचना अनुमति' : 'Device Notifications'}
              </div>
              <div className="text-[11px] text-indigo-700 mt-0.5">
                {language === 'ne'
                  ? 'समयमा रिमाइन्डर प्राप्त गर्न अनुमति आवश्यक छ।'
                  : 'Enable system notifications for timely alerts.'}
              </div>
            </div>
            <button
              onClick={handleRequestPermission}
              className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-[11px] transition flex-shrink-0"
            >
              {language === 'ne' ? 'अनुमति दिनुहोस्' : 'Enable'}
            </button>
          </div>

          {/* Automated Toggle Switches */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              {language === 'ne' ? 'स्वतः सूचना प्रकार' : 'Automated Alerts'}
            </h4>
            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-slate-50/50">
              <div
                onClick={() => handleToggleSetting('ekadashiAlerts')}
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-100/60"
              >
                <div>
                  <div className="font-bold text-slate-800">
                    {language === 'ne' ? 'हरि वासर एकादशी व्रत' : 'Holy Ekadashi Vrat Alerts'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {language === 'ne' ? 'वर्षभरिका सबै २४ एकादशीको अघिल्लो साँझ सूचना' : 'Alert on every sacred Ekadashi'}
                  </div>
                </div>
                {settings.ekadashiAlerts ? (
                  <ToggleRight className="w-6 h-6 text-blue-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-400" />
                )}
              </div>

              <div
                onClick={() => handleToggleSetting('purnimaAlerts')}
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-100/60"
              >
                <div>
                  <div className="font-bold text-slate-800">
                    {language === 'ne' ? 'पूर्णिमा (पूर्ण चन्द्र व्रत)' : 'Purnima (Full Moon) Alerts'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {language === 'ne' ? 'सत्यनारायण पूजा तथा दान पुण्य' : 'Sacred Purnima observances'}
                  </div>
                </div>
                {settings.purnimaAlerts ? (
                  <ToggleRight className="w-6 h-6 text-blue-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-400" />
                )}
              </div>

              <div
                onClick={() => handleToggleSetting('amavasyaAlerts')}
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-100/60"
              >
                <div>
                  <div className="font-bold text-slate-800">
                    {language === 'ne' ? 'औंसी (दर्श अमावस्या)' : 'Amavasya (New Moon / Aunsi) Alerts'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {language === 'ne' ? 'पितृ तर्पण तथा श्राद्ध' : 'Ancestral pitri tarpana'}
                  </div>
                </div>
                {settings.amavasyaAlerts ? (
                  <ToggleRight className="w-6 h-6 text-blue-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-400" />
                )}
              </div>

              <div
                onClick={() => handleToggleSetting('festivalAlerts')}
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-100/60"
              >
                <div>
                  <div className="font-bold text-slate-800">
                    {language === 'ne' ? 'राष्ट्रिय चाडपर्व (दशैं, तिहार, छठ)' : 'Major Festivals (Dashain, Tihar, Chhath)'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {language === 'ne' ? 'महत्वपूर्ण राष्ट्रिय तथा सांस्कृतिक पर्व' : 'Major national Nepali festivals'}
                  </div>
                </div>
                {settings.festivalAlerts ? (
                  <ToggleRight className="w-6 h-6 text-blue-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-400" />
                )}
              </div>
            </div>
          </div>

          {/* Custom Reminders List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                {language === 'ne' ? 'व्यक्तिगत रिमाइन्डर' : 'Custom Reminders'} ({reminders.length})
              </h4>
              <button
                onClick={() => setIsAddingCustom(!isAddingCustom)}
                className="text-blue-600 font-bold flex items-center gap-1 hover:text-blue-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'ne' ? 'नयाँ थप्नुहोस्' : 'Add New'}</span>
              </button>
            </div>

            {/* Add Custom Form */}
            {isAddingCustom && (
              <form
                onSubmit={handleAddReminder}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 animate-in fade-in"
              >
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    {language === 'ne' ? 'शीर्षक / पर्वको नाम' : 'Title / Event Name'}
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. मामाको जन्मदिन / ऋण किस्ता तिर्ने दिन"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      {language === 'ne' ? 'नेपाली महिना' : 'Month'}
                    </label>
                    <select
                      value={newMonth}
                      onChange={(e) => setNewMonth(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {m} महिना
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      {language === 'ne' ? 'गते (Day)' : 'Day'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={32}
                      value={newDay}
                      onChange={(e) => setNewDay(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      {language === 'ne' ? 'समय (Time)' : 'Time'}
                    </label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingCustom(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            {/* List */}
            {reminders.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-500">
                {language === 'ne'
                  ? 'अहिलेसम्म कुनै व्यक्तिगत रिमाइन्डर थपिएको छैन।'
                  : 'No custom reminders added yet.'}
              </div>
            ) : (
              <div className="space-y-1.5">
                {reminders.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{r.titleNe}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {r.bsMonth} महिना {r.bsDay} गते
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {r.timeStr}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(r.id)}
                        className={`text-xs font-bold px-2 py-1 rounded-lg ${
                          r.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {r.enabled ? 'ON' : 'OFF'}
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="py-2 px-5 rounded-xl bg-slate-900 text-white font-extrabold text-xs active:scale-95 transition"
          >
            {language === 'ne' ? 'बन्द गर्नुहोस्' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
