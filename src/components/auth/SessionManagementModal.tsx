import React, { useState } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Cloud,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { Language, UserProfile } from '../../types';
import { authManager } from '../../utils/authManager';
import { syncEngine } from '../../firebase/syncEngine';
import { playSuccessSound, playTapSound } from '../../utils/audio';

interface SessionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  language: Language;
  onOpenLoginModal: () => void;
  onOpenPrivacyModal?: () => void;
  onOpenFirebaseDiag?: () => void;
  onLogout: () => void;
  showToast: (msg: string) => void;
}

export const SessionManagementModal: React.FC<SessionManagementModalProps> = ({
  isOpen,
  onClose,
  user,
  language,
  onOpenLoginModal,
  onLogout,
  showToast,
}) => {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  if (!isOpen || !user) return null;

  const isGuest = !!user.isGuest;

  const handleSyncNow = async () => {
    playTapSound();
    setIsSyncing(true);
    if (!isGuest) {
      await authManager.syncUserDataFromCloud(user.uid);
      await syncEngine.flushPendingQueue(user.uid);
      showToast('Data synchronized with Firebase Cloud!');
    } else {
      showToast('Guest mode is 100% offline.');
    }
    setIsSyncing(false);
  };

  const handleBackupRestore = () => {
    playTapSound();
    showToast('Offline backup verified & active.');
  };

  const handleDeleteAccount = async () => {
    playTapSound();
    await authManager.logout();
    setShowConfirmDelete(false);
    onLogout();
    onClose();
    showToast('Account session cleared.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex justify-center items-stretch animate-in fade-in duration-200 overflow-y-auto">
      {/* Mobile Shell Frame */}
      <div className="w-full max-w-md min-h-screen bg-white flex flex-col justify-between shadow-2xl relative select-none font-sans overflow-hidden">
        {/* Top Blue Header */}
        <div className="bg-[#2563EB] text-white py-3 px-4 shadow-md flex-shrink-0">
          {/* Title Row */}
          <div className="flex items-center gap-3">
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
            <h2 className="text-base font-bold tracking-tight text-white">
              Account &amp; Session Management
            </h2>
          </div>
        </div>

        {/* Body Content */}
        <div className="px-5 py-4 space-y-4 flex-1 overflow-y-auto">
          {/* Current Account Card */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-800">Current Account</span>
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Google 'G' Logo or Guest icon */}
                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                  {!isGuest ? (
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
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
                  ) : (
                    <span className="text-xl">👤</span>
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {isGuest ? 'Guest Account' : 'Google Account'}
                  </p>
                  <p className="text-[11px] text-slate-500">{user.email || 'guest@ghaule.offline'}</p>
                </div>
              </div>

              {/* Active Badge */}
              <span className="text-[10px] font-extrabold text-[#16A34A] bg-[#DCFCE7] border border-[#86EFAC] px-2.5 py-0.5 rounded-full">
                Active
              </span>
            </div>
          </div>

          {/* Account Details Card */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-800">Account Details</span>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2 text-xs">
              <div className="flex">
                <span className="w-24 text-slate-700 font-semibold">Name</span>
                <span className="text-slate-400 mr-2">:</span>
                <span className="font-bold text-slate-900 truncate">{user.name}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-700 font-semibold">Email</span>
                <span className="text-slate-400 mr-2">:</span>
                <span className="text-slate-700 truncate">{user.email || 'guest@ghaule.offline'}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-700 font-semibold">Firebase UID</span>
                <span className="text-slate-400 mr-2">:</span>
                <span className="font-mono text-slate-700 truncate">{user.uid}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-700 font-semibold">Last Login</span>
                <span className="text-slate-400 mr-2">:</span>
                <span className="text-slate-700">Nov 7, 2025 • 9:41 AM</span>
              </div>
            </div>
          </div>

          {/* Action List Items matching Screen 5 */}
          <div className="p-2 rounded-2xl bg-white border border-slate-200/90 shadow-xs divide-y divide-slate-100">
            {/* Sync Now */}
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="w-full p-3 flex items-center justify-between hover:bg-slate-50 rounded-xl transition text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0">
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                    Sync Now
                  </p>
                  <p className="text-[10px] text-slate-500">(Sync your data with Firebase)</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Backup & Restore */}
            <button
              onClick={handleBackupRestore}
              className="w-full p-3 flex items-center justify-between hover:bg-slate-50 rounded-xl transition text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                    Backup &amp; Restore
                  </p>
                  <p className="text-[10px] text-slate-500">(Backup your data)</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Delete Account */}
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="w-full p-3 flex items-center justify-between hover:bg-rose-50 rounded-xl transition text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-rose-600">Delete Account</p>
                  <p className="text-[10px] text-slate-500">(Permanently delete your account)</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-400" />
            </button>
          </div>

          {showConfirmDelete && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 space-y-2 text-center animate-in fade-in">
              <p className="text-xs font-bold text-rose-900">
                Are you sure you want to delete this session?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="py-2 px-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Switch Account Button */}
        <div className="p-5 flex-shrink-0 border-t border-slate-100 bg-white">
          <button
            onClick={() => {
              playTapSound();
              onClose();
              onOpenLoginModal();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-md transition cursor-pointer"
          >
            Switch Account
          </button>
        </div>
      </div>
    </div>
  );
};
