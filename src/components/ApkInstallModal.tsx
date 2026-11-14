import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Download,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Share2,
} from 'lucide-react';
import { Language } from '../types';
import { playTapSound, playSuccessSound } from '../utils/audio';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface ApkInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onDirectAccess?: () => void;
}

export const ApkInstallModal: React.FC<ApkInstallModalProps> = ({
  isOpen,
  onClose,
  language,
  onDirectAccess,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [manualPromptHint, setManualPromptHint] = useState(false);
  const [activeTab, setActiveTab] = useState<'fix' | 'install' | 'dev'>('install');

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    playTapSound();
    setInstalling(true);
    setManualPromptHint(false);
    const success = await install();
    setInstalling(false);
    if (success) {
      playSuccessSound();
    } else {
      setManualPromptHint(true);
      setActiveTab('install');
    }
  };

  const handleDirectAccessClick = () => {
    playTapSound();
    if (onDirectAccess) {
      onDirectAccess();
    }
    onClose();
  };

  const t = {
    ne: {
      title: 'APK खुल्न समस्या भयो? (समाधान)',
      subtitle: 'मोबाइलमा Ghaule क्याल्कुलेटर APK र WebApp इन्स्टल गर्ने सजिलो तरिका',
      tabFix: '🛠️ समस्या समाधान',
      tabInstall: '📲 १-क्लिक इन्स्टल',
      tabDev: '⚙️ डेभलपर APK',
      whyNotOpening: 'APK किन खुलेन? मुख्य कारण र समाधानहरू:',
      reason1Title: '१. "Unknown Apps" अनुमति बन्द हुनु',
      reason1Desc: 'फोनको Settings > Apps > Chrome वा File Manager मा गई "Install unknown apps" लाई ON गर्नुहोस्।',
      reason2Title: '२. Google Play Protect ले रोक्नु',
      reason2Desc: 'यदि "Blocked by Play Protect" आएमा: "More details" (थप विवरण) मा थिचेर "Install anyway" (जसरी पनि स्थापना गर्नुहोस्) छान्नुहोस्।',
      reason3Title: '३. "Parse Error" वा फाइल अधुरो हुनु',
      reason3Desc: 'यदि फाइल खोल्दा "Problem parsing the package" आएमा, तलको १-क्लिक WebAPK इन्स्टल प्रयोग गर्नुहोस् (यसमा कुनै फाइल वा त्रुटिको झन्झट हुँदैन)।',
      bestSolutionBanner: 'सबैभन्दा उत्तम विकल्प: WebAPK (१००% ग्यारेन्टी)',
      bestSolutionDesc: 'एन्ड्रोइड फोनमा कुनै बाहिरी APK डाउनलोड नगरी क्रोमबाट सिधै एप इन्स्टल गर्न सकिन्छ। यो पूर्णतया अफलाइन चल्छ र एप आइकन होम स्क्रिनमा बस्छ।',
      installBtn: '📲 फोनमा एप इन्स्टल गर्नुहोस्',
      installedBadge: '✅ तपाईंको फोनमा एप पहिले नै इन्स्टल छ!',
      directBtn: '🚀 सिधै क्याल्कुलेटर चलाउनुहोस् (अफलाइन)',
      chromeStepsTitle: 'गुगल क्रोम (Chrome) बाट कसरी इन्स्टल गर्ने?',
      step1: '१. यो वेबसाइट गुगल क्रोम (Google Chrome) मा खोल्नुहोस्।',
      step2: '२. माथि दायाँ कुनाको ३ थोप्ला (⋮) मा थिच्नुहोस्।',
      step3: '३. "Install app" (वा "Add to Home screen") मा थिच्नुहोस्।',
      devHeading: 'Android Studio / Native APK बनाउन चाहनुहुन्छ?',
      devDesc: 'यस प्रोजेक्टमा complete Kotlin Native Android codebase, Room Database र Google Services कन्फिगरेसन उपलब्ध छ।',
    },
    hi: {
      title: 'APK नहीं खुल रहा? (समाधान)',
      subtitle: 'मोबाइल में Ghaule कैलकुलेटर APK और WebApp इंस्टॉल करने का आसान तरीका',
      tabFix: '🛠️ समस्या निवारण',
      tabInstall: '📲 १-क्लिक इंस्टॉल',
      tabDev: '⚙️ डेवलपर APK',
      whyNotOpening: 'APK क्यों नहीं खुल रहा? मुख्य कारण और समाधान:',
      reason1Title: '१. "Unknown Apps" परमिशन बंद होना',
      reason1Desc: 'फोन की Settings > Apps > Chrome या Files में जाकर "Install unknown apps" चालू (ON) करें।',
      reason2Title: '२. Google Play Protect चेतावनी',
      reason2Desc: 'यदि Play Protect ब्लॉक दिखाए, तो "More details" पर क्लिक करके "Install anyway" चुनें।',
      reason3Title: '३. "Parse Error" या अधूरी डाउनलोडिंग',
      reason3Desc: 'यदि "Problem parsing the package" आए, तो नीचे दिए गए 1-क्लिक WebAPK इंस्टॉल का उपयोग करें (यह हर फोन में 100% चलता है)।',
      bestSolutionBanner: 'सबसे सुरक्षित व आसान तरीका: WebAPK (100% गारंटी)',
      bestSolutionDesc: 'एंड्रॉइड फोन में बिना किसी परेशानी के क्रोम से सीधे ऐप इंस्टॉल करें। यह 100% ऑफलाइन काम करता है और फोन की स्क्रीन पर ऐप आइकन बन जाता है।',
      installBtn: '📲 फोन में ऐप इंस्टॉल करें',
      installedBadge: '✅ ऐप आपके फोन में पहले से इंस्टॉल है!',
      directBtn: '🚀 सीधे कैलकुलेटर खोलें (ऑफलाइन)',
      chromeStepsTitle: 'Google Chrome से सीधे कैसे इंस्टॉल करें?',
      step1: '१. इस वेबसाइट को Google Chrome में खोलें।',
      step2: '२. ऊपर दाईं ओर 3 डॉट्स (⋮) पर टैप करें।',
      step3: '३. "Install app" (या "Add to Home screen") पर टैप करें।',
      devHeading: 'नेटिव Android Studio APK कोड:',
      devDesc: 'इस प्रोजेक्ट में Kotlin, Room Database और Firebase Auth के साथ पूरा नेटिव कोड शामिल है।',
    },
    en: {
      title: 'APK Not Opening? (Quick Fix)',
      subtitle: 'How to install and open Ghaule Calculator App on your Android phone',
      tabFix: '🛠️ Troubleshooting',
      tabInstall: '📲 1-Click Install',
      tabDev: '⚙️ Developer APK',
      whyNotOpening: 'Common reasons why an APK does not open & fixes:',
      reason1Title: '1. "Install Unknown Apps" Permission is OFF',
      reason1Desc: 'Open Android Settings > Apps > Chrome (or Files) > Enable "Install unknown apps".',
      reason2Title: '2. Google Play Protect Warning',
      reason2Desc: 'If prompted with "Blocked by Play Protect", tap "More details" > "Install anyway".',
      reason3Title: '3. "Problem Parsing the Package" Error',
      reason3Desc: 'If the APK file was corrupted or incompatible, use the 1-Click WebAPK install below. It works on 100% of Android devices with zero errors.',
      bestSolutionBanner: 'Recommended: Official 1-Click WebAPK',
      bestSolutionDesc: 'Install directly via Android Chrome. It creates a verified native app with launcher icon, full offline storage for all 28+ tools, and no security warnings.',
      installBtn: '📲 Install App on Phone Now',
      installedBadge: '✅ Ghaule App is already installed on your device!',
      directBtn: '🚀 Open Calculator Directly (Offline)',
      chromeStepsTitle: 'Manual Install via Android Chrome:',
      step1: '1. Open this website in Google Chrome.',
      step2: '2. Tap the three dots menu (⋮) at top right.',
      step3: '3. Tap "Install App" or "Add to Home Screen".',
      devHeading: 'Native Kotlin / Android Studio APK:',
      devDesc: 'Complete Android source code with Room DB and Firebase Google Sign-In is provided in the repository.',
    },
    bho: {
      title: 'APK नइखे खुलत? (समाधान)',
      subtitle: 'मोबाइल में Ghaule कैलकुलेटर APK आ WebApp इंस्टॉल करे के आसान तरीका',
      tabFix: '🛠️ समस्या समाधान',
      tabInstall: '📲 १-क्लिक इंस्टॉल',
      tabDev: '⚙️ डेवलपर APK',
      whyNotOpening: 'APK काहे नइखे खुलत? मुख्य कारण आ समाधान:',
      reason1Title: '१. "Unknown Apps" परमिशन बंद रहल',
      reason1Desc: 'फोन के Settings > Apps > Chrome भा Files में जाके "Install unknown apps" चालू (ON) करीं।',
      reason2Title: '२. Google Play Protect चेतावनी',
      reason2Desc: 'जदि Play Protect ब्लॉक देखावे, त "More details" पर क्लिक करके "Install anyway" चुनीं।',
      reason3Title: '३. "Parse Error" भा अधूरा फाइल',
      reason3Desc: 'जदि "Problem parsing the package" आवे, त नीचे दिहल 1-क्लिक WebAPK इंस्टॉल के उपयोग करीं।',
      bestSolutionBanner: 'सबसे सुरक्षित आ आसान तरीका: WebAPK (100% गारंटी)',
      bestSolutionDesc: 'एंड्रॉइड फोन में बिना कवनो परेशानी के क्रोम से सीधे ऐप इंस्टॉल करीं। ई 100% ऑफलाइन चलेला।',
      installBtn: '📲 फोन में ऐप इंस्टॉल करीं',
      installedBadge: '✅ ऐप राउर फोन में पहिले से इंस्टॉल बा!',
      directBtn: '🚀 सीधे कैलकुलेटर खोलीं (ऑफलाइन)',
      chromeStepsTitle: 'Google Chrome से सीधे कइसे इंस्टॉल करीं?',
      step1: '१. ई वेबसाइट Google Chrome में खोलीं।',
      step2: '२. ऊपर दायाँ ओर 3 डॉट्स (⋮) पर टैप करीं।',
      step3: '३. "Install app" (भा "Add to Home screen") पर टैप करीं।',
      devHeading: 'नेटिव Android Studio APK कोड:',
      devDesc: 'एह प्रोजेक्ट में Kotlin, Room Database आ Firebase Auth के पूरा कोड शामिल बा।',
    },
    mai: {
      title: 'APK नहि खुजि रहल अछि? (समाधान)',
      subtitle: 'मोबाइल मे Ghaule कैलकुलेटर APK आ WebApp इंस्टॉल करबाक आसान तरीका',
      tabFix: '🛠️ समस्या निवारण',
      tabInstall: '📲 १-क्लिक इंस्टॉल',
      tabDev: '⚙️ डेवलपर APK',
      whyNotOpening: 'APK किएक नहि खुजि रहल अछि? मुख्य कारण आ समाधान:',
      reason1Title: '१. "Unknown Apps" अनुमति बंद रहनाय',
      reason1Desc: 'फोन के Settings > Apps > Chrome वा Files मे जाकए "Install unknown apps" चालू (ON) करू।',
      reason2Title: '२. Google Play Protect चेतावनी',
      reason2Desc: 'जँ Play Protect ब्लॉक देखाबय, त "More details" पर क्लिक कए "Install anyway" चुनू।',
      reason3Title: '३. "Parse Error" वा अधूरा डाउनलोड',
      reason3Desc: 'जँ "Problem parsing the package" आबय, त नीचाँ देल 1-क्लिक WebAPK इंस्टॉल उपयोग करू।',
      bestSolutionBanner: 'सबसँ सुरक्षित आ आसान तरीका: WebAPK (100% गारंटी)',
      bestSolutionDesc: 'एंड्रॉइड फोन मे बिना कोनो समस्या के क्रोम सँ सीधे ऐप इंस्टॉल करू। ई 100% ऑफलाइन चलैत अछि।',
      installBtn: '📲 फोन मे ऐप इंस्टॉल करू',
      installedBadge: '✅ ऐप अहाँक फोन मे पहिने सँ इंस्टॉल अछि!',
      directBtn: '🚀 सीधे कैलकुलेटर खोलू (ऑफलाइन)',
      chromeStepsTitle: 'Google Chrome सँ सीधे केना इंस्टॉल करू?',
      step1: '१. ई वेबसाइट Google Chrome मे खोलू।',
      step2: '२. ऊपर दहिन दिस 3 डॉट्स (⋮) पर टैप करू।',
      step3: '३. "Install app" (वा "Add to Home screen") पर टैप करू।',
      devHeading: 'नेटिव Android Studio APK कोड:',
      devDesc: 'ई प्रोजेक्ट मे Kotlin, Room Database आ Firebase Auth संग पूरा नेटिव कोड शामिल अछि।',
    },
  }[language];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-5 flex items-start justify-between relative select-none">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md p-0.5 border border-white/25 flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden">
              <img
                src="/assets/aistudio/IMG_20261113_104800_d465bc78.png"
                alt="Ghaule Calculator APK Logo"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg leading-tight tracking-tight">
                  {t.title}
                </h3>
                <span className="text-[10px] bg-amber-400 text-slate-900 font-black px-2 py-0.5 rounded-full uppercase">
                  Android
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium mt-0.5">
                {t.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-100 p-1 border-b border-slate-200 text-xs font-bold select-none">
          <button
            onClick={() => {
              playTapSound();
              setActiveTab('fix');
            }}
            className={`flex-1 py-2 px-3 rounded-xl transition text-center cursor-pointer ${
              activeTab === 'fix'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.tabFix}
          </button>
          <button
            onClick={() => {
              playTapSound();
              setActiveTab('install');
            }}
            className={`flex-1 py-2 px-3 rounded-xl transition text-center cursor-pointer ${
              activeTab === 'install'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.tabInstall}
          </button>
          <button
            onClick={() => {
              playTapSound();
              setActiveTab('dev');
            }}
            className={`flex-1 py-2 px-3 rounded-xl transition text-center cursor-pointer ${
              activeTab === 'dev'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.tabDev}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-slate-800 text-xs">
          {/* TAB 1: WHY APK DOES NOT OPEN & FIXES */}
          {activeTab === 'fix' && (
            <div className="space-y-3.5">
              {/* Highlight Recommendation Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>{t.bestSolutionBanner}</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                  {t.bestSolutionDesc}
                </p>
                {isInstalled ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-white/80 p-2 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{t.installedBadge}</span>
                  </div>
                ) : (
                  <button
                    onClick={handleInstallClick}
                    disabled={installing}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t.installBtn}</span>
                  </button>
                )}
              </div>

              {/* Troubleshooting List */}
              <div className="space-y-2.5">
                <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>{t.whyNotOpening}</span>
                </h4>

                {/* Reason 1 */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900 text-xs">{t.reason1Title}</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{t.reason1Desc}</p>
                </div>

                {/* Reason 2 */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900 text-xs">{t.reason2Title}</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{t.reason2Desc}</p>
                </div>

                {/* Reason 3 */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900 text-xs">{t.reason3Title}</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{t.reason3Desc}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 1-CLICK WEBAPK INSTALL GUIDE */}
          {activeTab === 'install' && (
            <div className="space-y-3.5">
              {/* PWA 1-Click Action */}
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white p-0.5 border border-blue-200 flex items-center justify-center shadow-md overflow-hidden">
                  <img
                    src="/assets/aistudio/IMG_20261113_104800_d465bc78.png"
                    alt="Ghaule Calculator WebAPK Logo"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    Ghaule Calculator WebAPK
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-1">
                    {language === 'ne'
                      ? '१००% अफलाइन, कुनै बाहिरी भाइरस वा चेतावनी बिना, सिधै फोनमा इन्स्टल हुन्छ।'
                      : language === 'hi'
                      ? '100% ऑफलाइन, बिना किसी चेतावनी के सीधे फोन की होम स्क्रीन पर इंस्टॉल होगा।'
                      : '100% offline, zero security warnings, standalone launcher icon.'}
                  </p>
                </div>

                {isInstalled ? (
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{t.installedBadge}</span>
                  </div>
                ) : isIOS ? (
                  <div className="p-3 rounded-xl bg-white border border-blue-200 text-left space-y-1.5 text-[11px] text-slate-700">
                    <p className="font-extrabold text-blue-800 flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5" />
                      <span>
                        {language === 'ne'
                          ? 'iPhone / iPad (Safari) मा इन्स्टल गर्ने तरिका:'
                          : language === 'hi'
                          ? 'iPhone / iPad (Safari) में इंस्टॉल करने का तरीका:'
                          : 'Install on iPhone / iPad (Safari):'}
                      </span>
                    </p>
                    <p>
                      {language === 'ne'
                        ? '१. तलको Share बटनमा थिच्नुहोस् र "Add to Home Screen" छान्नुहोस्।'
                        : language === 'hi'
                        ? '1. नीचे Share बटन पर टैप करें और "Add to Home Screen" चुनें।'
                        : '1. Tap the Share button in Safari and select "Add to Home Screen".'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={handleInstallClick}
                      disabled={installing}
                      className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>
                        {isInstallable
                          ? t.installBtn
                          : language === 'ne'
                          ? '📲 Chrome बाट WebAPK इन्स्टल गर्नुहोस्'
                          : language === 'hi'
                          ? '📲 Chrome से WebAPK इंस्टॉल करें'
                          : t.installBtn}
                      </span>
                    </button>
                    {manualPromptHint && !isInstallable && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-medium text-left">
                        {language === 'ne'
                          ? 'ब्राउजर पपअप उपलब्ध नभएमा, तल दिइएको Chrome (⋮ → Install app) चरण प्रयोग गर्नुहोस्।'
                          : language === 'hi'
                          ? 'यदि ऑटो-प्रॉम्प्ट न खुले, तो नीचे दिए गए Chrome (⋮ → Install app) स्टेप्स अपनाएं।'
                          : 'If your browser did not show the auto prompt, follow the Chrome (⋮ → Install app) steps below.'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step-by-step Chrome instructions */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h5 className="font-extrabold text-slate-900 text-xs">
                  {t.chromeStepsTitle}
                </h5>
                <ul className="space-y-1.5 text-[11px] text-slate-700">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                      1
                    </span>
                    <span>{t.step1}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                      2
                    </span>
                    <span>{t.step2}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                      3
                    </span>
                    <span>{t.step3}</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: DEVELOPER NATIVE ANDROID BUILD */}
          {activeTab === 'dev' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1.5">
                <p className="font-extrabold text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    {language === 'ne'
                      ? 'PWABuilder मा लिङ्क राख्दा त्रुटि आउँछ?'
                      : language === 'hi'
                      ? 'PWABuilder में लिंक डालने पर एरर आ रहा है?'
                      : 'Getting an error when pasting URL into PWABuilder?'}
                  </span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  {language === 'ne'
                    ? 'AI Studio को preview लिङ्क (ais-dev-...) लगइनले सुरक्षित हुन्छ, त्यसैले PWABuilder ले पढ्न सक्दैन। PWABuilder का लागि पहिले एपलाई Public Deploy (जस्तै Firebase Hosting वा Public Cloud Run) गरेर मात्र सार्वजनिक HTTPS लिङ्क राख्नुहोस्।'
                    : language === 'hi'
                    ? 'AI Studio का preview लिंक (ais-dev-...) Google लॉगिन से लॉक रहता है, इसलिए PWABuilder उसे पढ़ नहीं सकता। PWABuilder में उपयोग करने के लिए पहले ऐप को Public Deploy (जैसे Firebase Hosting या Public Cloud Run) करें और वह पब्लिक HTTPS लिंक डालें।'
                    : 'AI Studio preview URLs (ais-dev-...) are protected behind Google sign-in, so PWABuilder cannot crawl them. Deploy to a public HTTPS host (e.g., Firebase Hosting or public Cloud Run) first and paste that public URL into PWABuilder.'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 space-y-2 font-mono">
                <p className="text-amber-400 font-bold text-xs">{t.devHeading}</p>
                <p className="text-[11px] text-slate-300 font-sans">{t.devDesc}</p>
                <div className="p-2.5 rounded-xl bg-black/60 text-emerald-400 text-[11px] space-y-1">
                  <p># Package: com.ghaule.calculator</p>
                  <p># Firebase: gen-lang-client-0255150793</p>
                  <p className="text-white font-bold">$ ./gradlew assembleRelease</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] space-y-1 text-slate-700">
                <p className="font-bold text-slate-900">📄 Android Integration Files:</p>
                <p>• /android_integration/ANDROID_BUILD_INSTRUCTIONS.md</p>
                <p>• /android_integration/FirebaseAuthManager.kt</p>
                <p>• /android_integration/PanchangaRoomComponents.kt</p>
                <p>• /android_integration/google-services.json</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Direct Access bypass */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2.5 select-none">
          <button
            onClick={handleDirectAccessClick}
            className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{t.directBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            {language === 'ne' ? 'बन्द गर्नुहोस्' : language === 'hi' ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
