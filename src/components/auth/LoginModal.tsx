import React, { useState } from 'react';
import {
  User,
  Check,
  Loader2,
  AlertCircle,
  X,
  Copy,
} from 'lucide-react';
import { Language, UserProfile } from '../../types';
import { authManager, AuthErrorInfo } from '../../utils/authManager';
import { playSuccessSound, playTapSound } from '../../utils/audio';

interface LoginModalProps {
  isOpen: boolean;
  canClose?: boolean;
  onClose: () => void;
  language: Language;
  onLanguageChange?: (lang: Language) => void;
  onLoginSuccess: (user: UserProfile) => void;
  onOpenPrivacyPolicy?: () => void;
  onOpenFirebaseDiag?: () => void;
  onOpenApkModal?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  canClose = false,
  onClose,
  language,
  onLoginSuccess,
  onOpenPrivacyPolicy,
  onOpenApkModal,
}) => {
  const [currentStep, setCurrentStep] = useState<'login' | 'guest_mode'>('login');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<AuthErrorInfo | null>(authManager.getLastError());
  const [copiedDomain, setCopiedDomain] = useState<boolean>(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  if (!isOpen) return null;

  const handleCopyDomain = () => {
    playTapSound();
    if (typeof navigator !== 'undefined' && currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  // Real Google Authentication via Firebase Web Popup / Android Native Bridge
  const handlePerformGoogleLogin = async () => {
    playTapSound();
    setLoading(true);
    setErrorMessage(null);
    setErrorInfo(null);

    const res = await authManager.loginWithGoogle();
    setLoading(false);

    if (res.success && res.user) {
      playSuccessSound();
      onLoginSuccess(res.user);
      setCurrentStep('login');
      onClose();
    } else {
      setErrorInfo(res.errorInfo || null);
      setErrorMessage(res.error || 'Google Sign-In failed. Please try again or use Browser Redirect.');
      setCurrentStep('login');
    }
  };

  // Redirect fallback if popup is blocked on mobile browser
  const handleGoogleRedirectLogin = async () => {
    playTapSound();
    setLoading(true);
    setErrorMessage(null);
    setErrorInfo(null);
    try {
      await authManager.loginWithGoogleRedirect();
    } catch (err: any) {
      setLoading(false);
      const parsed = authManager.parseAuthError(err);
      setErrorInfo(parsed);
      setErrorMessage(parsed.message);
    }
  };

  // Confirm guest mode login (100% offline)
  const handleConfirmGuest = () => {
    playTapSound();
    setLoading(true);
    setTimeout(() => {
      const guestUser = authManager.loginAsGuest();
      setLoading(false);
      playSuccessSound();
      onLoginSuccess(guestUser);
      setCurrentStep('login');
      onClose();
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-xs flex justify-center items-stretch animate-in fade-in duration-200 overflow-y-auto">
      {/* Mobile Frame Container (Max width 420px, full screen on phones) */}
      <div className="w-full max-w-md min-h-screen bg-white flex flex-col justify-between shadow-2xl relative select-none font-sans overflow-hidden">
        {/* Optional close button if allowed */}
        {canClose && (
          <button
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* ----------------- GUEST MODE CONFIRMATION SCREEN ----------------- */}
        {currentStep === 'guest_mode' && (
          <div className="w-full min-h-screen flex flex-col justify-between animate-in fade-in duration-200">
            <div className="px-6 flex-1 flex flex-col items-center justify-center text-center pt-8">
              <div className="relative mb-4 flex items-center justify-center">
                <span className="absolute -top-1 -left-4 text-amber-400 text-lg animate-pulse">
                  ✦
                </span>
                <span className="absolute top-4 -right-5 text-amber-400 text-sm animate-pulse">
                  ✦
                </span>
                <span className="absolute bottom-2 -right-3 text-amber-400 text-xs">★</span>

                <div className="w-32 h-32 rounded-full bg-gradient-to-b from-[#93C5FD] to-[#3B82F6] p-1 flex items-center justify-center shadow-lg shadow-blue-400/20">
                  <div className="w-full h-full rounded-full bg-[#BFDBFE] flex items-center justify-center overflow-hidden relative">
                    <svg viewBox="0 0 100 100" className="w-24 h-24">
                      <circle cx="50" cy="58" r="22" fill="#FBCFE8" />
                      <path
                        d="M26 44 C26 44 38 32 50 32 C62 32 74 44 74 44 C82 44 80 49 74 48 C68 47 32 47 26 48 C20 49 18 44 26 44 Z"
                        fill="#1E293B"
                      />
                      <ellipse cx="50" cy="38" rx="18" ry="8" fill="#0F172A" />
                      <rect x="36" y="38" width="28" height="3" fill="#3B82F6" />
                      <rect x="34" y="52" width="13" height="8" rx="2" fill="#0F172A" />
                      <rect x="53" y="52" width="13" height="8" rx="2" fill="#0F172A" />
                      <line x1="47" y1="55" x2="53" y2="55" stroke="#0F172A" strokeWidth="2" />
                      <path
                        d="M44 68 Q50 72 56 68"
                        stroke="#0F172A"
                        strokeWidth="1.8"
                        fill="none"
                        strokeLinecap="round"
                      />
                      <path d="M26 88 L50 78 L74 88 L74 100 L26 100 Z" fill="#1D4ED8" />
                      <path d="M42 78 L50 86 L58 78 Z" fill="#F8FAFC" />
                    </svg>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Guest Mode</h2>
              <p className="text-sm text-slate-600 mt-1 text-center font-medium">
                You are using the app as a Guest User
              </p>

              <div className="w-full max-w-sm mt-6 p-4 rounded-2xl bg-[#F0F5FA] border border-slate-200/60 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#16A34A] text-white flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 leading-snug">
                    Data will be stored only on this device (100% offline).
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#16A34A] text-white flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 leading-snug">
                    After logout, all guest data will be cleared safely.
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-3 w-full max-w-sm mx-auto">
              <button
                onClick={handleConfirmGuest}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md transition cursor-pointer disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <User className="w-4 h-4 fill-white" />
                    <span>Continue as Guest</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  playTapSound();
                  setCurrentStep('login');
                }}
                className="w-full py-3 px-4 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-sm transition cursor-pointer active:scale-[0.99]"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* ----------------- FULL SCREEN LOGIN SCREEN (ONLY GOOGLE OR GUEST) ----------------- */}
        {currentStep === 'login' && (
          <div className="w-full min-h-screen flex flex-col justify-between animate-in fade-in duration-200">
            {/* Center Content */}
            <div className="px-6 flex-1 flex flex-col items-center justify-center text-center pt-8">
              {/* App Icon: Blue Squircle with Math symbols and Gold Crown on top right */}
              <div className="relative mb-4">
                <div className="absolute -top-3.5 -right-3.5 text-2xl rotate-12 drop-shadow-md z-10 select-none">
                  👑
                </div>

                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#1E40AF] via-[#1D4ED8] to-[#0A1128] p-2.5 shadow-xl border-2 border-white/40 flex flex-col justify-between">
                  <div className="flex justify-between items-center px-1 pt-0.5">
                    <span className="text-white font-black text-lg leading-none">+</span>
                    <span className="text-amber-300 font-black text-lg leading-none">−</span>
                  </div>
                  <div className="flex justify-between items-center px-1 pb-0.5">
                    <span className="text-cyan-300 font-black text-lg leading-none">=</span>
                    <span className="text-white font-black text-lg leading-none">×</span>
                  </div>
                </div>
              </div>

              {/* Title & Subtitles */}
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Gaule Calculator
              </h1>
              <p className="text-xs font-bold text-slate-800 mt-1">
                Smart Nepal Calculator Hub &amp; Offline Patro
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                All-in-One Offline Utility &amp; Cloud Sync
              </p>

              {/* Error Box (if Google Sign-In fails or popup is blocked) */}
              {errorMessage && (
                <div className="mt-4 p-3 w-full max-w-xs rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-left text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>{errorInfo?.category || 'Google Sign-In Error'}</span>
                    </div>
                    <button
                      onClick={() => {
                        setErrorMessage(null);
                        setErrorInfo(null);
                      }}
                      className="text-amber-700 hover:text-amber-900 font-bold p-0.5 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-snug" data-no-translate="true">
                    {errorMessage}
                  </p>
                  {errorInfo?.resolution && (
                    <p className="text-[10px] text-amber-800 leading-snug" data-no-translate="true">
                      {errorInfo.resolution}
                    </p>
                  )}
                  {errorInfo?.code === 'auth/unauthorized-domain' && currentHostname && (
                    <div className="space-y-1.5 pt-1" data-no-translate="true">
                      <div className="p-1.5 rounded-lg bg-white border border-amber-200 font-mono text-[10px] text-slate-800 break-all select-all">
                        {currentHostname}
                      </div>
                      <button
                        onClick={handleCopyDomain}
                        className="w-full py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        {copiedDomain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedDomain ? 'Domain Copied!' : 'Copy Domain for Firebase Console'}</span>
                      </button>
                    </div>
                  )}
                  {(errorInfo?.code === 'auth/popup-blocked' ||
                    errorInfo?.code === 'auth/popup-closed-by-user' ||
                    errorInfo?.code === 'auth/cancelled-popup-request' ||
                    errorInfo?.code === 'auth/operation-not-supported-in-this-environment' ||
                    errorInfo?.code === 'auth/internal-error') && (
                    <button
                      onClick={handleGoogleRedirectLogin}
                      disabled={loading}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition active:scale-95 cursor-pointer"
                    >
                      Sign In with Browser Redirect
                    </button>
                  )}
                </div>
              )}

              {/* Action Buttons Container: Only Google Account & Guest Account */}
              <div className="w-full max-w-xs mt-6 space-y-3">
                {/* Button 1: Continue with Google */}
                <button
                  onClick={handlePerformGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-70"
                >
                  {loading ? (
                    <div className="flex items-center gap-2 text-white font-bold">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>
                        {language === 'ne'
                          ? 'गुगल खाता खुल्दैछ...'
                          : language === 'hi'
                          ? 'गूगल खाता खुल रहा है...'
                          : language === 'bho'
                          ? 'गूगल खाता खुलत बा...'
                          : language === 'mai'
                          ? 'गूगल खाता खुजि रहल अछि...'
                          : 'Signing in with Google...'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center shadow-xs flex-shrink-0">
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                      <span>
                        {language === 'ne'
                          ? 'गुगल खाताबाट लगइन गर्नुहोस्'
                          : language === 'hi'
                          ? 'गूगल अकाउंट से लॉगिन करें'
                          : language === 'bho'
                          ? 'गूगल खाता से लॉगिन करीं'
                          : language === 'mai'
                          ? 'गूगल खाता सँ लॉगिन करू'
                          : 'Continue with Google'}
                      </span>
                    </>
                  )}
                </button>

                {/* Button 2: Continue as Guest (100% Offline) */}
                <button
                  onClick={handleConfirmGuest}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 bg-[#16A34A] hover:bg-green-700 active:scale-[0.99] text-white py-3.5 px-4 rounded-2xl font-bold text-sm shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-70"
                >
                  <User className="w-4 h-4 fill-white" />
                  <span>
                    {language === 'ne'
                      ? 'अतिथि खाताबाट चलाउनुहोस् (अफलाइन)'
                      : language === 'hi'
                      ? 'गेस्ट अकाउंट से शुरू करें (ऑफलाइन)'
                      : language === 'bho'
                      ? 'गेस्ट खाता से शुरू करीं (ऑफलाइन)'
                      : language === 'mai'
                      ? 'गेस्ट खाता सँ शुरू करू (ऑफलाइन)'
                      : 'Continue as Guest (100% Offline)'}
                  </span>
                </button>

              </div>
            </div>

            {/* Footer with Privacy Policy & Bottom Wave */}
            <div className="relative w-full text-center flex-shrink-0 pt-2 pb-5">
              <p className="text-[11px] text-slate-500 font-medium">
                By continuing, you agree to our
              </p>
              <button
                onClick={() => {
                  playTapSound();
                  if (onOpenPrivacyPolicy) onOpenPrivacyPolicy();
                }}
                className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
              >
                Privacy Policy
              </button>

              <div className="w-full mt-2 overflow-hidden leading-none">
                <svg
                  className="w-full h-8 text-[#2563EB] fill-current"
                  viewBox="0 0 400 35"
                  preserveAspectRatio="none"
                >
                  <path d="M0,35 L400,35 L400,10 Q280,0 180,25 T0,5 Z" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

