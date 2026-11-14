/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Ghaule Premium & Pro Entitlement Modal
 * Honest, transparent subscription and license manager:
 * - Free: ALL 28 Calculators, 101-Year Patro & Basic Panchang 100% Free
 * - Pro: 24-Hora Timeline, Muhurat Export, Custom Nepali Date Reminders, Receipt PDFs
 */

import React, { useState } from 'react';
import {
  X,
  Crown,
  Sparkles,
  Check,
  ShieldCheck,
  Lock,
  RefreshCw,
  KeyRound,
  CalendarCheck2,
  Clock,
  Layers,
} from 'lucide-react';
import { Language } from '../types';
import { premiumEngine, PremiumEntitlement } from '../utils/premiumEngine';
import { playTapSound, playSuccessSound } from '../utils/audio';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  showToast: (msg: string) => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({
  isOpen,
  onClose,
  language,
  showToast,
}) => {
  const [entitlement, setEntitlement] = useState<PremiumEntitlement>(() =>
    premiumEngine.getEntitlement()
  );
  const [licenseKeyInput, setLicenseKeyInput] = useState<string>('');
  const [isActivating, setIsActivating] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleActivate = () => {
    if (!licenseKeyInput.trim()) {
      showToast(language === 'ne' ? 'कृपया लाइसेन्स कोड लेख्नुहोस्' : 'Please enter license key');
      return;
    }
    setIsActivating(true);
    playTapSound();

    setTimeout(() => {
      const res = premiumEngine.activateLicense(licenseKeyInput);
      setIsActivating(false);
      showToast(res.message);
      if (res.success && res.entitlement) {
        playSuccessSound();
        setEntitlement(res.entitlement);
      }
    }, 400);
  };

  const handleRestore = () => {
    playTapSound();
    const res = premiumEngine.restorePurchases();
    showToast(res.message);
    setEntitlement(res.entitlement);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white p-5 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center border border-white/30 shadow-inner">
              <Crown className="w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base leading-tight">
                  GHAULE PRO MEMBERSHIP
                </h3>
                {entitlement.isActive && (
                  <span className="bg-emerald-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-100">
                {language === 'ne'
                  ? 'उन्नत ज्योतिष, होरा तथा असीमित रिमाइन्डर'
                  : 'Advanced Jyotish, Hora & Unlimited Reminders'}
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
          {/* Honest Guarantee Notice */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-emerald-950">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">
                {language === 'ne' ? 'निःशुल्क ग्यारेन्टी:' : 'Free Tier Guarantee:'}
              </span>{' '}
              {language === 'ne'
                ? 'सबै २८ क्याल्कुलेटर, प्रमाणित पात्रो (२०६०–२०८५) र दैनिक पञ्चाङ्ग सधैं १००% निःशुल्क र अफलाइन रहनेछन्।'
                : 'All 28 calculators, the verified calendar (2060–2085 BS), and daily Panchang are 100% free forever.'}
            </div>
          </div>

          {/* Plan Comparison */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              {language === 'ne' ? 'विशेषता तुलना' : 'Feature Comparison'}
            </h4>
            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-slate-50/50">
              <div className="p-2.5 flex items-center justify-between text-slate-700">
                <span>{language === 'ne' ? 'सबै २८ क्याल्कुलेटर टूल्स' : 'All 28 Calculator Tools'}</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Free & Pro
                </span>
              </div>
              <div className="p-2.5 flex items-center justify-between text-slate-700">
                <span>{language === 'ne' ? 'प्रमाणित क्यालेन्डर (२०६०–२०८५)' : 'Verified Calendar (2060–2085 BS)'}</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Free & Pro
                </span>
              </div>
              <div className="p-2.5 flex items-center justify-between text-slate-700 bg-amber-50/40">
                <span>{language === 'ne' ? '२४-घण्टे ग्रहीय होरा (Hora Timeline)' : '24-Planetary Hora Timeline'}</span>
                <span className="font-extrabold text-amber-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Pro Only
                </span>
              </div>
              <div className="p-2.5 flex items-center justify-between text-slate-700 bg-amber-50/40">
                <span>{language === 'ne' ? 'मुहूर्त जाँच तथा निर्यात (PDF Export)' : 'Muhurat Suitability PDF Export'}</span>
                <span className="font-extrabold text-amber-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Pro Only
                </span>
              </div>
              <div className="p-2.5 flex items-center justify-between text-slate-700 bg-amber-50/40">
                <span>{language === 'ne' ? 'असीमित नेपाली तिथि/पर्व रिमाइन्डर' : 'Unlimited Tithi & Festival Reminders'}</span>
                <span className="font-extrabold text-amber-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Pro Only
                </span>
              </div>
            </div>
          </div>

          {/* License Activation Section */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2 text-slate-800 font-bold">
              <KeyRound className="w-4 h-4 text-blue-600" />
              <span>{language === 'ne' ? 'लाइसेन्स कोड वा भौचर सक्रिय गर्नुहोस्' : 'Activate License Key or Voucher'}</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                placeholder="e.g. GHAULE-PRO-LIFETIME-2083"
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-900 outline-none focus:border-amber-500"
              />
              <button
                onClick={handleActivate}
                disabled={isActivating}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold rounded-xl transition disabled:opacity-50"
              >
                {isActivating ? '...' : language === 'ne' ? 'सक्रिय' : 'Activate'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Valid sample keys: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">GHAULE-PRO-LIFETIME-2083</code> or <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">GHAULE-PRO-YEARLY-2083</code>
            </p>
          </div>

          {/* Restore Purchases Button */}
          <button
            onClick={handleRestore}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-bold transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === 'ne' ? 'खरिद पुन: प्राप्त गर्नुहोस् (Restore Purchases)' : 'Restore Previous Purchases'}</span>
          </button>
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
