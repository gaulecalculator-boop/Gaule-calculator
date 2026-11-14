import React, { useState } from 'react';
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Copy,
  Check,
  Clock,
  Radio,
  ArrowRightLeft,
  LogOut,
} from 'lucide-react';
import { Language, UserProfile } from '../../types';
import { authManager } from '../../utils/authManager';
import { playSuccessSound, playTapSound } from '../../utils/audio';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  language: Language;
  onOpenLoginModal: () => void;
  onOpenSessionSettings?: () => void;
  onLogout: () => void;
  showToast: (msg: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  language,
  onOpenLoginModal,
  onOpenSessionSettings,
  onLogout,
  showToast,
}) => {
  const [copiedUid, setCopiedUid] = useState<boolean>(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState<boolean>(false);

  if (!isOpen || !user) return null;

  const isGuest = !!user.isGuest;

  const handleCopyUid = () => {
    playTapSound();
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    showToast(language === 'ne' ? 'UID कपी भयो!' : 'UID copied!');
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleConfirmLogout = async () => {
    playTapSound();
    await authManager.logout();
    setShowConfirmLogout(false);
    onLogout();
    onClose();
    showToast(
      isGuest
        ? language === 'ne'
          ? 'अतिथि डाटा मेटाइयो'
          : 'Guest data deleted'
        : language === 'ne'
        ? 'लगआउट भयो'
        : 'Logged out'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex justify-center items-stretch animate-in fade-in duration-200 overflow-y-auto">
      {/* Mobile Shell Frame */}
      <div className="w-full max-w-md min-h-screen bg-white flex flex-col justify-between shadow-2xl relative select-none font-sans overflow-hidden">
        {/* Top Blue Header */}
        <div className="bg-[#2563EB] text-white py-3 px-4 shadow-md flex-shrink-0">
          {/* Nav Row */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                playTapSound();
                onClose();
              }}
              className="p-1 -ml-1 text-white hover:bg-white/10 rounded-full transition cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
            </button>

            <h2 className="text-lg font-bold tracking-tight text-white">
              My Account
            </h2>

            <button
              onClick={() => {
                playTapSound();
                if (onOpenSessionSettings) onOpenSessionSettings();
              }}
              className="p-1 -mr-1 text-white hover:bg-white/10 rounded-full transition cursor-pointer"
              aria-label="Settings"
            >
              <SettingsIcon className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Profile Content */}
        <div className="px-6 flex-1 flex flex-col items-center justify-center -mt-6">
          {/* Circular Photo with Green Ring & Google 'G' Badge */}
          <div className="relative mb-3">
            <div className="w-28 h-28 rounded-full p-0.5 border-[3px] border-[#16A34A] shadow-md overflow-hidden flex items-center justify-center bg-slate-100">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.name}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-3xl font-black text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Google Colorful 'G' Badge on Bottom-Right */}
            {!isGuest && (
              <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* User Name & Email */}
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            {user.name}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            {user.email || 'guest@ghaule.offline'}
          </p>

          {/* Account Pill Badge */}
          <div className="mt-2.5 inline-flex items-center gap-1.5 bg-[#16A34A] text-white text-xs font-bold px-3.5 py-1 rounded-full shadow-xs">
            <span>✔</span>
            <span>{isGuest ? 'Guest Account' : 'Google Account'}</span>
          </div>

          {/* Info Card matching Screen 3 */}
          <div className="w-full max-w-sm mt-5 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
            {/* UID */}
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span className="font-semibold text-slate-800">UID:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-600 truncate max-w-[190px]">
                  {user.uid}
                </span>
                <button
                  onClick={handleCopyUid}
                  className="text-slate-400 hover:text-blue-600 transition cursor-pointer p-0.5"
                  title="Copy UID"
                >
                  {copiedUid ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Last Sync */}
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Last Sync:</span>
              </span>
              <span className="text-slate-600 text-[11px] font-medium">
                {new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                • 9:41 AM
              </span>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Radio className="w-3.5 h-3.5 text-slate-500" />
                <span>Status:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                <span className="font-bold text-[#16A34A] text-xs">Online</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full max-w-sm mt-5 space-y-3">
            {/* Blue Switch Account Button */}
            <button
              onClick={() => {
                playTapSound();
                onClose();
                onOpenLoginModal();
              }}
              className="w-full flex items-center justify-center gap-2.5 bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md transition cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Switch Account</span>
            </button>

            {/* Red Logout Button */}
            {!showConfirmLogout ? (
              <button
                onClick={() => {
                  playTapSound();
                  setShowConfirmLogout(true);
                }}
                className="w-full flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-red-700 active:scale-[0.99] text-white py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            ) : (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 space-y-2 text-center animate-in fade-in">
                <p className="text-xs font-bold text-rose-900">
                  {isGuest
                    ? 'Confirm logout? All guest notes will be cleared.'
                    : 'Confirm logout? Your cloud data remains safe.'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmLogout}
                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                  >
                    Logout
                  </button>
                  <button
                    onClick={() => setShowConfirmLogout(false)}
                    className="py-2 px-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dummy Bottom Navigation Bar (Home, Tools, Notes, Settings) to mirror Screen 3 */}
        <div className="w-full bg-white border-t border-slate-200/80 px-6 py-2.5 flex items-center justify-between text-slate-500 text-[10px] font-semibold flex-shrink-0">
          <button onClick={onClose} className="flex flex-col items-center gap-1 cursor-pointer">
            <span className="text-base leading-none">🏠</span>
            <span>Home</span>
          </button>
          <button onClick={onClose} className="flex flex-col items-center gap-1 cursor-pointer">
            <span className="text-base leading-none">🧮</span>
            <span>Tools</span>
          </button>
          <button onClick={onClose} className="flex flex-col items-center gap-1 cursor-pointer">
            <span className="text-base leading-none">📖</span>
            <span>Notes</span>
          </button>
          <button onClick={onClose} className="flex flex-col items-center gap-1 text-[#2563EB] cursor-pointer">
            <span className="text-base leading-none">⚙️</span>
            <span>Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
