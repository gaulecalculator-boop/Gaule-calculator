/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bank & Investment Management System (बैंक तथा लगानी) — Master Shell
 * - 100% Offline-first, No compulsory login
 * - Bikram Sambat (BS) primary date + AD secondary date
 * - Clean banking UI: responsive from 375px smartphone up to desktop multi-column
 * - Bilingual EN + Nepali (plus Hindi compatibility)
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Calculator,
  CalendarDays,
  FileBarChart2,
  Landmark,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { Currency, Language } from '../../types';
import { playTapSound } from '../../utils/audio';
import { SUPPORTED_LANGUAGES } from '../../utils/universalTranslator';
import { bankDb, subscribeBankDb } from '../db';
import { adTag, bsTag, getTodayDual, pick5, t5 } from '../i18n';
import { collectUpcomingAlerts, dispatchBankReminders } from '../insightsAndReminders';
import { BankInvestmentDatabase, BankSectionTab } from '../types';
import { BankCalendarView } from '../components/BankCalendarView';
import { FinancialToolsView } from '../components/FinancialToolsView';
import { InvestmentCalculatorsView } from '../components/InvestmentCalculatorsView';
import { LoanManagerView } from '../components/LoanManagerView';
import { ReportsAndBackupView } from '../components/ReportsAndBackupView';
import { SipAndMutualFundView } from '../components/SipAndMutualFundView';

interface BankInvestmentMainViewProps {
  language: Language;
  currency: Currency;
  onLanguageChange: (lang: Language) => void;
  onCurrencyChange: (curr: Currency) => void;
  onReturnToCalculator: () => void;
}

export const BankInvestmentMainView: React.FC<BankInvestmentMainViewProps> = ({
  language,
  currency,
  onLanguageChange,
  onCurrencyChange,
  onReturnToCalculator,
}) => {
  const [db, setDb] = useState<BankInvestmentDatabase>(() => bankDb.getAll());
  const [activeTab, setActiveTab] = useState<BankSectionTab>('calculators');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    setDb(bankDb.getAll());
    const unsub = subscribeBankDb(() => {
      setDb(bankDb.getAll());
    });
    return unsub;
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  const today = getTodayDual();
  const alerts = useMemo(() => collectUpcomingAlerts(db, today.adStr, undefined, language), [db, today.adStr, language]);

  useEffect(() => {
    if (alerts.length > 0 && db.reminderPrefs.enabled) {
      dispatchBankReminders(alerts, db);
    }
  }, [alerts.length, db.reminderPrefs.enabled]);

  const tabs: Array<{
    id: BankSectionTab;
    labels: { en: string; hi: string; bho: string; mai: string; ne: string };
    mobileLabels: { en: string; hi: string; bho: string; mai: string; ne: string };
    icon: React.ReactNode;
  }> = [
    {
      id: 'calculators',
      labels: { en: 'Calculators', hi: 'कैलकुलेटर', bho: 'कैलकुलेटर', mai: 'कैलकुलेटर', ne: 'क्याल्कुलेटर' },
      mobileLabels: { en: 'Calc', hi: 'गणना', bho: 'हिसाब', mai: 'गणना', ne: 'गणना' },
      icon: <Calculator className="w-4 h-4" />,
    },
    {
      id: 'loans',
      labels: { en: 'Loans', hi: 'लोन / EMI', bho: 'कर्जा / EMI', mai: 'कर्जा / EMI', ne: 'कर्जा / EMI' },
      mobileLabels: { en: 'Loans', hi: 'लोन', bho: 'कर्जा', mai: 'कर्जा', ne: 'कर्जा' },
      icon: <Landmark className="w-4 h-4" />,
    },
    {
      id: 'sip_mf',
      labels: { en: 'SIP & MF', hi: 'SIP और फंड', bho: 'SIP आ फंड', mai: 'SIP आ फंड', ne: 'SIP र फण्ड' },
      mobileLabels: { en: 'SIP/MF', hi: 'SIP/फंड', bho: 'SIP/फंड', mai: 'SIP/फंड', ne: 'SIP/MF' },
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: 'calendar',
      labels: { en: 'Calendar', hi: 'कैलेंडर (वि.सं.)', bho: 'पतरा (वि.सं.)', mai: 'पात्रो (वि.सं.)', ne: 'पात्रो (वि.सं.)' },
      mobileLabels: { en: 'Calendar', hi: 'कैलेंडर', bho: 'पतरा', mai: 'पात्रो', ne: 'पात्रो' },
      icon: <CalendarDays className="w-4 h-4" />,
    },
    {
      id: 'tools',
      labels: { en: '15 Tools', hi: '15 टूल्स', bho: '१५ गो टूल', mai: '१५ टा टूल', ne: 'अन्य टुल' },
      mobileLabels: { en: 'Tools', hi: 'टूल्स', bho: 'टूल', mai: 'टूल', ne: 'टुलहरू' },
      icon: <Wrench className="w-4 h-4" />,
    },
    {
      id: 'reports',
      labels: { en: 'Reports', hi: 'रिपोर्ट और बैकअप', bho: 'रिपोर्ट आ बैकअप', mai: 'रिपोर्ट आ बैकअप', ne: 'रिपोर्ट र ब्याकअप' },
      mobileLabels: { en: 'Reports', hi: 'रिपोर्ट', bho: 'रिपोर्ट', mai: 'रिपोर्ट', ne: 'रिपोर्ट' },
      icon: <FileBarChart2 className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-900 font-sans antialiased flex flex-col">
      {/* Compact Sticky Top App Bar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 print:hidden">
        <div className="max-w-6xl mx-auto px-3 sm:px-5 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                playTapSound();
                onReturnToCalculator();
              }}
              className="min-h-[40px] px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              aria-label={t5(
                language,
                'Back to Calculator Home',
                'कैलकुलेटर होम पर वापस जाएं',
                'कैलकुलेटर होम पर वापस जाईं',
                'कैलकुलेटर होम पर वापस जाउ',
                'क्याल्कुलेटर होममा फर्कनुहोस्'
              )}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">
                {t5(language, 'GAULE', 'गाँवले', 'गाँवले', 'गामले', 'गाउँले')}
              </span>
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold leading-tight truncate">
                {t5(language, 'Bank & Investment', 'बैंक और निवेश', 'बैंक आ निवेश', 'बैंक आ निवेश', 'बैंक तथा लगानी')}
              </h1>
              <div className="text-[10px] text-slate-300 tabular-nums truncate">
                {today.bsStr} {bsTag(language)} ({today.adStr} {adTag(language)})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {alerts.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className="min-h-[36px] px-2.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer tabular-nums"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>
                  {alerts.length} {t5(language, 'Due', 'बकाया', 'बाकी', 'बाँकी', 'बाँकी')}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onCurrencyChange(currency === 'NPR' ? 'INR' : 'NPR')}
              className="min-h-[36px] px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"
            >
              {currency === 'NPR'
                ? language === 'en'
                  ? 'Rs. NPR'
                  : 'रु NPR'
                : '₹ INR'}
            </button>

            <button
              type="button"
              data-no-translate="true"
              onClick={() => {
                playTapSound();
                const idx = SUPPORTED_LANGUAGES.findIndex((l) => l.code === language);
                const next = SUPPORTED_LANGUAGES[(idx + 1) % SUPPORTED_LANGUAGES.length];
                onLanguageChange(next.code);
              }}
              className="min-h-[36px] px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName || language.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Desktop / Tablet Section Tab Strip */}
        <div className="hidden md:block bg-white border-b border-slate-200 text-slate-700">
          <div className="max-w-6xl mx-auto px-5 flex items-center gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setActiveTab(tab.id);
                  }}
                  className={`min-h-[44px] px-4 py-2 text-xs font-bold flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer transition ${
                    active
                      ? 'border-blue-700 text-blue-800 bg-blue-50/50'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.icon}
                  <span>{pick5(language, tab.labels, 'bank_tab')}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-5 pt-4 pb-24 md:pb-8">
        {activeTab === 'calculators' && (
          <InvestmentCalculatorsView
            db={db}
            language={language}
            currency={currency}
            showToast={showToast}
          />
        )}
        {activeTab === 'loans' && (
          <LoanManagerView
            db={db}
            language={language}
            currency={currency}
            showToast={showToast}
          />
        )}
        {activeTab === 'sip_mf' && (
          <SipAndMutualFundView
            db={db}
            language={language}
            currency={currency}
            showToast={showToast}
          />
        )}
        {activeTab === 'calendar' && (
          <BankCalendarView
            db={db}
            language={language}
            currency={currency}
            showToast={showToast}
          />
        )}
        {activeTab === 'tools' && (
          <FinancialToolsView
            db={db}
            language={language}
            currency={currency}
            showToast={showToast}
          />
        )}
        {activeTab === 'reports' && (
          <ReportsAndBackupView
            db={db}
            language={language}
            currency={currency}
            showToast={showToast}
          />
        )}
      </main>

      {/* Mobile Fixed Thumb-Zone Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 print:hidden">
        <div className="grid grid-cols-6 h-16 items-center">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playTapSound();
                  setActiveTab(tab.id);
                }}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition ${
                  active ? 'text-blue-700 font-extrabold' : 'text-slate-500 font-medium'
                }`}
              >
                {tab.icon}
                <span className="text-[10px] leading-tight truncate max-w-[60px]">
                  {pick5(language, tab.mobileLabels, 'bank_mobile_tab')}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Ephemeral Toast */}
      {toastMsg && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-slate-900 text-white text-xs font-bold py-2 px-4 rounded-full shadow-xl border border-slate-700">
          {toastMsg}
        </div>
      )}
    </div>
  );
};
