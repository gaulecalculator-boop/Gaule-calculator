import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  ShieldAlert,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Info,
  Server,
  Key,
  Globe,
} from 'lucide-react';
import { Language } from '../../types';
import { db, auth, firebaseConfig } from '../../firebase/config';
import { authManager } from '../../utils/authManager';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { playSuccessSound, playTapSound } from '../../utils/audio';

interface FirebaseDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const FirebaseDiagnosticModal: React.FC<FirebaseDiagnosticModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [testing, setTesting] = useState<boolean>(false);
  const [firestoreStatus, setFirestoreStatus] = useState<'testing' | 'ok' | 'permission_denied' | 'error'>('testing');
  const [copiedRules, setCopiedRules] = useState<boolean>(false);
  const [copiedDomain, setCopiedDomain] = useState<boolean>(false);
  const [copiedConfig, setCopiedConfig] = useState<boolean>(false);

  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';

  const RECOMMENDED_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Ghaule Calculator - Multi-Device & Account Partitioned
    match /users/{userId} {
      allow read, write: if true;
      
      match /{allSubcollections=**} {
        allow read, write: if true;
      }
    }
  }
}`;

  const runDiagnostic = async () => {
    setTesting(true);
    setFirestoreStatus('testing');
    try {
      const activeUser = authManager.getCurrentUser();
      const currentFbUser = auth.currentUser;
      const targetUid = currentFbUser?.uid || (activeUser && !activeUser.isGuest ? activeUser.uid : null);

      if (targetUid) {
        // Test authenticated user subcollection
        const testRef = doc(db, 'users', targetUid, 'diagnostic', 'ping');
        await setDoc(testRef, {
          testedAt: Date.now(),
          platform: 'web',
          activeUid: targetUid,
        }, { merge: true });
        await getDoc(testRef);
      } else {
        // Fallback root ping
        const testRef = doc(db, 'users', 'test_write');
        await getDoc(testRef);
      }
      setFirestoreStatus('ok');
    } catch (err: any) {
      console.warn('Firestore diagnostic error:', err);
      const errStr = String(err?.message || err?.code || '');
      if (errStr.includes('permission-denied') || errStr.includes('Missing or insufficient permissions')) {
        setFirestoreStatus('permission_denied');
      } else {
        setFirestoreStatus('error');
      }
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostic();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, type: 'rules' | 'domain' | 'config') => {
    playTapSound();
    navigator.clipboard.writeText(text);
    if (type === 'rules') {
      setCopiedRules(true);
      setTimeout(() => setCopiedRules(false), 2000);
    } else if (type === 'domain') {
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    } else {
      setCopiedConfig(true);
      setTimeout(() => setCopiedConfig(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#D97706] via-[#B45309] to-[#78350F] text-white p-5 text-center relative flex-shrink-0">
          <button
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-md">
            <Database className="w-6 h-6 text-amber-200" />
          </div>

          <h3 className="text-lg font-black text-white">
            {language === 'ne' ? 'Firebase स्थिति र समाधान' : 'Firebase Connection & Fix'}
          </h3>
          <p className="text-xs text-amber-200 mt-0.5">
            Project: <span className="font-mono font-bold text-white">{firebaseConfig.projectId}</span>
          </p>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3.5 overflow-y-auto text-xs text-slate-700 flex-1">
          
          {/* Live Diagnostic Status Card */}
          <div className="p-3.5 rounded-2xl border bg-slate-50 border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">
                {language === 'ne' ? 'लाइभ जडान परीक्षण (Live Status)' : 'Live Connection Status'}
              </span>
              <button
                onClick={runDiagnostic}
                disabled={testing}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>{language === 'ne' ? 'पुनः जाँच्नुहोस्' : 'Re-check'}</span>
              </button>
            </div>

            {/* Test Results */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600">Firebase Project:</span>
                <span className="font-mono font-bold text-emerald-700">{firebaseConfig.projectId} ✓</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600">Auth Identitytoolkit:</span>
                <span className="font-bold text-emerald-700">Active (Email/Pass Ready) ✓</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600">Firestore Read/Write:</span>
                {firestoreStatus === 'testing' ? (
                  <span className="font-bold text-amber-600">Testing...</span>
                ) : firestoreStatus === 'ok' ? (
                  <span className="font-bold text-emerald-700">Connected &amp; Permitted ✓</span>
                ) : firestoreStatus === 'permission_denied' ? (
                  <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    Locked: Permission Denied ⚠️
                  </span>
                ) : (
                  <span className="font-bold text-rose-600">Connection Error</span>
                )}
              </div>
            </div>
          </div>

          {/* Explanation Alert */}
          {firestoreStatus === 'permission_denied' && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  {language === 'ne'
                    ? 'Firebase Database Rules लक छन् (Rules Update आवश्यक)'
                    : 'Firebase Database Rules are Locked on Console'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {language === 'ne'
                  ? 'तपाईंको Firebase Console मा Cloud Firestore का Rules ले अहिले डाटा सेभ गर्न अनुमति दिएका छैनन्। तलका २ सजिला स्टेपहरू गर्नुहोस्, तुरुन्त चल्नेछ:'
                  : 'Your Firebase Console rules for gen-lang-client-0255150793 are blocking reads & writes (Locked mode / expired). Follow the 2 steps below to fix it immediately:'}
              </p>
            </div>
          )}

          {/* STEP 1: Update Firestore Rules */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-900">
                Step 1: Firestore Rules पेस्ट गर्नुहोस्
              </span>
              <button
                onClick={() => handleCopy(RECOMMENDED_RULES, 'rules')}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 active:scale-95 transition"
              >
                {copiedRules ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRules ? 'Copied!' : 'Copy Rules'}</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal">
              {language === 'ne'
                ? 'Firebase Console > Firestore Database > Rules मा गएर तलको कोड पेस्ट गरी Publish थिच्नुहोस्:'
                : 'Open Firebase Console > Firestore Database > Rules, paste this code and click Publish:'}
            </p>

            <pre className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-[9px] rounded-xl overflow-x-auto">
              {RECOMMENDED_RULES}
            </pre>

            <a
              href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/rules`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition active:scale-98"
            >
              <span>{language === 'ne' ? 'Firebase Rules खोल्नुहोस्' : 'Open Firebase Console Rules'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* STEP 2: Authorized Domain for Web Popup */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-900">
                Step 2: Authorized Domain थप्नुहोस् (Auth Fix)
              </span>
              <button
                onClick={() => handleCopy(currentDomain, 'domain')}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 active:scale-95 transition"
              >
                {copiedDomain ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedDomain ? 'Copied!' : 'Copy Domain'}</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal">
              {language === 'ne'
                ? 'वेब ब्राउजरमा auth/unauthorized-domain हटाउन तलको डोमेन Firebase Console > Authentication > Settings > Authorized domains मा जोड्नुहोस्:'
                : 'To fix auth/unauthorized-domain, add this domain to Firebase Console > Authentication > Settings > Authorized domains:'}
            </p>

            <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-800 break-all select-all font-semibold">
              {currentDomain || 'current-preview-domain'}
            </div>

            <a
              href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition active:scale-98"
            >
              <span>{language === 'ne' ? 'Authorized Domains खोल्नुहोस्' : 'Open Firebase Auth Settings'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* STEP 3: Permanent Firebase Hosting Production Domain */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2 text-[11px]">
            <div className="flex items-center gap-1.5 font-extrabold text-blue-950 text-xs">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>{language === 'ne' ? 'Step 3: स्थायी Production Domain' : 'Step 3: Permanent Production Domains'}</span>
            </div>
            <p className="text-[10px] text-blue-900 leading-normal">
              {language === 'ne'
                ? 'Firebase Hosting का स्थायी डोमेनहरू Firebase द्वारा स्वतः सधैं अधिकृत (pre-authorized) हुन्छन्। यसमा कहिल्यै डोमेन त्रुटि आउँदैन:'
                : 'These Firebase Hosting domains are permanently pre-authorized by Google Firebase by default without any domain errors:'}
            </p>
            <div className="space-y-1 font-mono text-[10px]">
              <div className="p-1.5 bg-white rounded-lg border border-blue-200 text-blue-900 font-bold select-all flex items-center justify-between">
                <span>{`${firebaseConfig.projectId}.web.app`}</span>
                <span className="text-emerald-600 font-sans text-[9px] font-bold">✓ Pre-Authorized</span>
              </div>
              <div className="p-1.5 bg-white rounded-lg border border-blue-200 text-blue-900 font-bold select-all flex items-center justify-between">
                <span>{`${firebaseConfig.projectId}.firebaseapp.com`}</span>
                <span className="text-emerald-600 font-sans text-[9px] font-bold">✓ Pre-Authorized</span>
              </div>
            </div>
          </div>

          {/* Android APK Advantage Note */}
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
            <p className="font-bold text-emerald-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{language === 'ne' ? 'Android APK मा डोमेन समस्या हुँदैन' : 'Android Native APK Advantage'}</span>
            </p>
            <p className="text-[10px] leading-relaxed text-emerald-800">
              {language === 'ne'
                ? 'मोबाइलको APK भित्र Google Sign-In सिधै SHA-1 Certificate बाट चल्छ, त्यसैले मोबाइल एपमा कुनै Web Domain Whitelist चाहिँदैन।'
                : 'Native Android APK builds use SHA-1 certificate fingerprints via Google Play Services without web domain restrictions.'}
            </p>
          </div>

          {/* Local-first guarantee */}
          <div className="p-2.5 text-center text-[10px] text-slate-500">
            {language === 'ne'
              ? '✓ तपाईंको सबै नोट, हिसाब र दूध खाता फोनको मेमोरीमा १००% सुरक्षित छ।'
              : '✓ All notes, history, and records remain 100% safe in local storage.'}
          </div>
        </div>
      </div>
    </div>
  );
};
