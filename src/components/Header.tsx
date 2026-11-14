import React from 'react';
import { Menu, ArrowLeft } from 'lucide-react';
import { Language, UserProfile } from '../types';
import { translations } from '../data/translations';
import { playTapSound } from '../utils/audio';
import { pick5 } from '../utils/i18nHelper';

interface HeaderProps {
  currentView: string;
  activeToolTitle?: string;
  activeToolSubtitle?: string;
  onBack?: () => void;
  language: Language;
  onLanguageChange?: (lang: Language) => void;
  onOpenApkModal?: () => void;
  onOpenHamroPasal?: () => void;
  onOpenDrawer: () => void;
  user?: UserProfile | null;
  onOpenProfileModal?: () => void;
  onOpenLoginModal?: () => void;
  onOpenFirebaseDiag?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  activeToolTitle,
  activeToolSubtitle,
  onBack,
  language,
  onOpenDrawer,
  user,
  onOpenProfileModal,
  onOpenLoginModal,
}) => {
  const t = translations[language];
  const isHome = currentView === 'home';

  return (
    <header className="relative w-full bg-[#1D4ED8] text-white shadow-md z-30 select-none">
      {/* Top Header Row */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2.5">
        {/* Left Side: Back or Hamburger + App Branding */}
        <div className="flex items-center gap-2.5 min-w-0">
          {!isHome ? (
            <button
              onClick={() => {
                playTapSound();
                if (onBack) onBack();
              }}
              className="p-1.5 -ml-1 text-white hover:bg-white/10 active:scale-95 rounded-full transition"
              aria-label="Go Back"
            >
              <ArrowLeft className="w-6 h-6 stroke-[2.4]" />
            </button>
          ) : (
            <button
              onClick={() => {
                playTapSound();
                onOpenDrawer();
              }}
              className="p-1.5 -ml-1 text-white hover:bg-white/10 active:scale-95 rounded-lg transition"
              aria-label="Open Menu"
            >
              <Menu className="w-6 h-6 stroke-[2.4]" />
            </button>
          )}

          {isHome ? (
            <div className="flex items-center gap-2 min-w-0">
              {/* App Icon */}
              <div className="relative w-9 h-9 rounded-xl bg-white/10 p-0.5 border border-white/20 shadow-sm overflow-hidden flex-shrink-0">
                <img
                  src="/assets/aistudio/IMG_20261113_104800_d465bc78.png"
                  alt="Ghaule Calculator"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-base font-extrabold tracking-wide text-white leading-tight truncate">
                  {t.appTitle}
                </span>
                <span className="text-[11px] font-medium text-blue-100 leading-none truncate">
                  {t.appSubtitle}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col min-w-0 max-w-[210px] sm:max-w-none">
              <span className="text-base font-bold text-white leading-tight truncate">
                {activeToolTitle || t[currentView as keyof typeof t] || currentView}
              </span>
              <span className="text-[11px] font-medium text-blue-100 leading-none truncate">
                {activeToolSubtitle || t.appSubtitle}
              </span>
            </div>
          )}
        </div>

        {/* Right Action Buttons: User Profile / Login Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {user ? (
            <button
              onClick={() => {
                playTapSound();
                if (onOpenProfileModal) onOpenProfileModal();
              }}
              className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#1E40AF] hover:bg-[#1E3A8A] border border-blue-300/40 shadow-sm active:scale-95 transition overflow-hidden"
              title={user.name}
              aria-label="User Profile"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="font-bold text-xs text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
              {/* Online / Cloud Synced Indicator Dot */}
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white ${
                  user.isGuest ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
            </button>
          ) : (
            <button
              onClick={() => {
                playTapSound();
                if (onOpenLoginModal) onOpenLoginModal();
              }}
              className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-full shadow-sm transition"
              aria-label="Login or Guest"
            >
              <span>👤</span>
              <span>
                {pick5(language, {
                  en: 'Login',
                  hi: 'लॉगिन',
                  bho: 'लॉगिन',
                  mai: 'लॉगिन',
                  ne: 'लगइन',
                })}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Nepal Mountain Silhouette Banner on Home */}
      {isHome && (
        <div className="relative overflow-hidden bg-gradient-to-b from-[#1D4ED8] to-[#1E40AF] pt-1 pb-2.5 px-4 flex items-center justify-between">
          <p className="text-[12px] font-medium text-blue-100 tracking-wide z-10 flex items-center gap-1.5">
            <span>{t.subHeaderBanner}</span>
          </p>

          {/* Mountains Silhouette & Flag Graphic */}
          <div className="relative flex items-center gap-1 z-10">
            <svg
              className="w-16 h-5 text-blue-300/40 fill-current"
              viewBox="0 0 100 30"
              preserveAspectRatio="none"
            >
              <polygon points="0,30 20,12 35,22 55,5 75,25 90,14 100,30" />
              <polygon points="45,30 65,8 85,28" opacity="0.6" />
            </svg>
            <span className="text-base select-none">🇳🇵</span>
          </div>

          {/* Light wave accent line */}
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-blue-300/40 to-transparent" />
        </div>
      )}
    </header>
  );
};
