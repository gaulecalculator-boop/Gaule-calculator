import React from 'react';
import {
  X,
  Home,
  LayoutGrid,
  BookOpen,
  Clock,
  Settings,
  ShieldCheck,
  Globe,
  Coins,
  ChevronRight,
  Calendar as CalendarIcon,
  Crown,
} from 'lucide-react';
import { Language, Currency, UserProfile, UserRole } from '../types';
import { playTapSound } from '../utils/audio';
import { SUPPORTED_LANGUAGES, localizeNumberString } from '../utils/universalTranslator';
import { pick5 } from '../utils/i18nHelper';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  currency: Currency;
  onCurrencyChange: (curr: Currency) => void;
  onOpenApkModal?: () => void;
  onOpen3DModal?: () => void;
  onOpenReminders?: () => void;
  onOpenPremium?: () => void;
  onOpenApiDocs?: () => void;
  user?: UserProfile | null;
  userRole?: UserRole;
  onOpenProfileModal?: () => void;
  onOpenLoginModal?: () => void;
  onOpenPrivacyModal?: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  currentView,
  onNavigate,
  language,
  onLanguageChange,
  currency,
  onCurrencyChange,
  onOpenPrivacyModal,
  userRole,
}) => {
  if (!isOpen) return null;

  const handleNav = (view: string) => {
    playTapSound();
    onNavigate(view);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => {
          playTapSound();
          onClose();
        }}
      />

      {/* Drawer Panel */}
      <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="bg-gradient-to-br from-[#1D4ED8] to-[#1E3A8A] text-white p-5 select-none relative">
          <button
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition cursor-pointer"
            aria-label="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 p-0.5 border border-white/25 shadow-md flex items-center justify-center overflow-hidden">
              <img
                src="/assets/aistudio/IMG_20261113_104800_d465bc78.png"
                alt="Ghaule"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div>
              <h3 className="font-extrabold text-lg tracking-wide leading-tight">
                {pick5(language, {
                  en: 'GHAULE',
                  hi: 'घाउले',
                  bho: 'घाउले',
                  mai: 'घाउले',
                  ne: 'घाउले',
                })}
              </h3>
              <p className="text-[11px] text-blue-200 font-medium">
                {pick5(language, {
                  en: 'Smart Nepal Hub',
                  hi: 'स्मार्ट नेपाल हब',
                  bho: 'स्मार्ट नेपाल हब',
                  mai: 'स्मार्ट नेपाल हब',
                  ne: 'स्मार्ट नेपाल हब',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 text-slate-700 text-sm">
          {/* Home */}
          <button
            onClick={() => handleNav('home')}
            className={`w-full flex items-center justify-between p-3 rounded-xl font-semibold transition cursor-pointer ${
              currentView === 'home' ? 'bg-blue-50 text-[#1D4ED8]' : 'hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-3">
              <Home className="w-5 h-5 text-blue-600" />
              <span>
                {pick5(language, {
                  en: 'Home',
                  hi: 'होम',
                  bho: 'होम',
                  mai: 'होम',
                  ne: 'गृहपृष्ठ',
                })}
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* All Tools */}
          <button
            onClick={() => handleNav('tools')}
            className={`w-full flex items-center justify-between p-3 rounded-xl font-semibold transition cursor-pointer ${
              currentView === 'tools' ? 'bg-blue-50 text-[#1D4ED8]' : 'hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-3">
              <LayoutGrid className="w-5 h-5 text-indigo-600" />
              <span>
                {pick5(language, {
                  en: 'All 31 Tools',
                  hi: 'सभी कैलकुलेटर',
                  bho: 'सभे कैलकुलेटर',
                  mai: 'सभ कैलकुलेटर',
                  ne: 'सबै क्याल्कुलेटर',
                })}
              </span>
            </span>
            <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
              {localizeNumberString(31, language)}
            </span>
          </button>

          {/* Simple Notebook */}
          <button
            onClick={() => handleNav('notebook')}
            className={`w-full flex items-center justify-between p-3 rounded-xl font-semibold transition cursor-pointer ${
              currentView === 'notebook' ? 'bg-blue-50 text-[#1D4ED8]' : 'hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-amber-600" />
              <span>
                {pick5(language, {
                  en: '3 Notebooks 📖',
                  hi: '३ नोटबुक खाता 📖',
                  bho: '३ खाता किताब 📖',
                  mai: '३ खाता पोथी 📖',
                  ne: '३ खाता नोटबुक 📖',
                })}
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* History */}
          <button
            onClick={() => handleNav('history')}
            className={`w-full flex items-center justify-between p-3 rounded-xl font-semibold transition cursor-pointer ${
              currentView === 'history' ? 'bg-blue-50 text-[#1D4ED8]' : 'hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-rose-600" />
              <span>
                {pick5(language, {
                  en: 'Calculation History',
                  hi: 'हिसाब इतिहास',
                  bho: 'हिसाब के इतिहास',
                  mai: 'हिसाब केर इतिहास',
                  ne: 'हिसाब इतिहास',
                })}
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Exclusive Admin Panel for Super Admin & Rajan ONLY */}
          {(userRole === 'super_admin' || userRole === 'calendar_manager') && (
            <button
              onClick={() => handleNav('admin_panel')}
              className={`w-full flex items-center justify-between p-3 rounded-xl font-bold transition cursor-pointer ${
                currentView === 'admin_panel'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-amber-50/80 text-amber-950 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-amber-600" />
                <span>
                  {userRole === 'super_admin'
                    ? pick5(language, {
                        en: 'Super Admin Panel',
                        hi: 'सुपर एडमिन पैनल',
                        bho: 'सुपर एडमिन पैनल',
                        mai: 'सुपर एडमिन पैनल',
                        ne: 'सुपर एडमिन प्यानल',
                      })
                    : pick5(language, {
                        en: 'Calendar Manager',
                        hi: 'कैलेंडर मैनेजर',
                        bho: 'कैलेंडर मैनेजर',
                        mai: 'कैलेंडर मैनेजर',
                        ne: 'पात्रो प्रबन्धक',
                      })}
                </span>
              </span>
              <span className="text-[10px] bg-amber-600 text-white font-extrabold px-2 py-0.5 rounded-full">
                ADMIN
              </span>
            </button>
          )}

          {/* Settings & Backup */}
          <button
            onClick={() => handleNav('settings')}
            className={`w-full flex items-center justify-between p-3 rounded-xl font-semibold transition cursor-pointer ${
              currentView === 'settings' ? 'bg-blue-50 text-[#1D4ED8]' : 'hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-slate-600" />
              <span>
                {pick5(language, {
                  en: 'Settings & Backup',
                  hi: 'सेटिंग्स और बैकअप',
                  bho: 'सेटिंग्स आ बैकअप',
                  mai: 'सेटिंग्स आ बैकअप',
                  ne: 'सेटिङ्स र ब्याकअप',
                })}
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Privacy Policy */}
          {onOpenPrivacyModal && (
            <button
              onClick={() => {
                playTapSound();
                onOpenPrivacyModal();
                onClose();
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>
                  {pick5(language, {
                    en: 'Privacy Policy',
                    hi: 'गोपनीयता नीति',
                    bho: 'गोपनीयता नीति',
                    mai: 'गोपनीयता नीति',
                    ne: 'गोपनीयता नीति',
                  })}
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Drawer Footer Controls */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2.5">
          <div className="space-y-1.5 text-xs">
            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>
                {pick5(language, {
                  en: 'Language:',
                  hi: 'भाषा:',
                  bho: 'भाषा:',
                  mai: 'भाषा:',
                  ne: 'भाषा:',
                })}
              </span>
            </span>
            <div className="flex flex-wrap gap-1 bg-slate-200 p-1 rounded-xl text-[11px] font-bold" data-no-translate="true">
              {SUPPORTED_LANGUAGES.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => {
                    playTapSound();
                    onLanguageChange(opt.code);
                  }}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                    language === opt.code ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {opt.nativeName}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-600" />
              <span>
                {pick5(language, {
                  en: 'Currency:',
                  hi: 'मुद्रा:',
                  bho: 'रुपिया:',
                  mai: 'मुद्रा:',
                  ne: 'मुद्रा:',
                })}
              </span>
            </span>
            <div className="flex bg-slate-200 p-0.5 rounded-lg text-[11px] font-bold">
              <button
                onClick={() => {
                  playTapSound();
                  onCurrencyChange('NPR');
                }}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  currency === 'NPR' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                रु NPR
              </button>
              <button
                onClick={() => {
                  playTapSound();
                  onCurrencyChange('INR');
                }}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  currency === 'INR' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                ₹ INR
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
