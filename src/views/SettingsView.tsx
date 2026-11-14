import React, { useState } from 'react';
import {
  Check,
  ShieldCheck,
  Lock,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Language, Currency, UserProfile } from '../types';
import { translations } from '../data/translations';
import { playTapSound, playSuccessSound } from '../utils/audio';
import { ownerSecurity } from '../utils/ownerSecurity';
import { DateSaveAccountModal } from '../components/DateSaveAccountModal';
import { googleDriveBackupEngine } from '../utils/googleDriveBackupEngine';
import { SUPPORTED_LANGUAGES, localizeNumberString } from '../utils/universalTranslator';
import { pick5 } from '../utils/i18nHelper';

interface SettingsViewProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  currency: Currency;
  onCurrencyChange: (curr: Currency) => void;
  onOpen3DModal?: () => void;
  onOpenApkModal?: () => void;
  onOpenReminders?: () => void;
  onOpenPremium?: () => void;
  onOpenApiDocs?: () => void;
  user?: UserProfile | null;
  onOpenProfileModal?: () => void;
  onOpenLoginModal?: () => void;
  onOpenPrivacyModal?: () => void;
  showToast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  language,
  onLanguageChange,
  currency,
  onCurrencyChange,
  onOpenPrivacyModal,
  showToast,
}) => {
  const t = translations[language];

  // Password / Security PIN States
  const [isPinConfigured, setIsPinConfigured] = React.useState(() => ownerSecurity.isPinSet());
  const [isPinActive, setIsPinActive] = React.useState(() => ownerSecurity.isPinEnabled());
  const [currentPinInput, setCurrentPinInput] = React.useState('');
  const [newPinInput, setNewPinInput] = React.useState('');
  const [confirmPinInput, setConfirmPinInput] = React.useState('');
  const [pinErrorMessage, setPinErrorMessage] = React.useState('');
  const [showPasswordText, setShowPasswordText] = React.useState(false);
  const [isChangingPin, setIsChangingPin] = React.useState(false);

  // Date Save & Account (Google Drive Cloud Backup) Modal State
  const [isDateSaveModalOpen, setIsDateSaveModalOpen] = React.useState(false);
  const [driveAccount, setDriveAccount] = React.useState(() => googleDriveBackupEngine.getConnectedUser());

  const handleSaveNewPin = () => {
    if (newPinInput.length < 4) {
      setPinErrorMessage(
        pick5(language, {
          en: 'PIN must be at least 4 digits!',
          hi: 'पिन कम से कम ४ अंकों का होना चाहिए!',
          bho: 'पिन कम से कम ४ अंक के होखे के चाहीं!',
          mai: 'पिन कम सँ कम ४ अंकक होयबाक चाही!',
          ne: 'पिन कम्तीमा ४ अंकको हुनुपर्छ!',
        })
      );
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinErrorMessage(
        pick5(language, {
          en: 'PINs do not match! Please enter the same PIN.',
          hi: 'दोनों पिन मेल नहीं खाते! कृपया एक जैसा पिन दर्ज करें।',
          bho: 'दूनो पिन नइखे मिलत! कृपया एके जइसन पिन डालीं।',
          mai: 'दूनू पिन नहि मिलल! कृपया एकहि पिन डालू।',
          ne: 'दुवै पिन मिलेनन्! कृपया एउटै पिन हाल्नुहोस्।',
        })
      );
      return;
    }

    if (isPinConfigured && !ownerSecurity.verifyPin(currentPinInput)) {
      setPinErrorMessage(
        pick5(language, {
          en: 'Current PIN is incorrect!',
          hi: 'वर्तमान पुराना पिन गलत है!',
          bho: 'अभी वाला पुरान पिन गलत बा!',
          mai: 'वर्तमान पुरान पिन गलत अछि!',
          ne: 'हालको पुरानो पिन मिलेन!',
        })
      );
      return;
    }

    playSuccessSound();
    ownerSecurity.setPin(newPinInput);
    setIsPinConfigured(true);
    setIsPinActive(true);
    setIsChangingPin(false);
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setPinErrorMessage('');
    showToast(
      pick5(language, {
        en: 'Owner Security PIN set successfully! 🔒',
        hi: 'मालिक सुरक्षा पासवर्ड / पिन सुरक्षित हुआ! 🔒',
        bho: 'मालिक सुरक्षा पिन सुरक्षित सेव हो गइल! 🔒',
        mai: 'मालिक सुरक्षा पिन सुरक्षित भेल! 🔒',
        ne: 'मालिक सुरक्षा पासवर्ड / पिन सुरक्षित भयो! 🔒',
      })
    );
  };

  const handleTogglePinStatus = () => {
    if (isPinActive) {
      if (!currentPinInput) {
        setPinErrorMessage(
          pick5(language, {
            en: 'Enter current PIN to turn off security.',
            hi: 'पिन बंद करने के लिए वर्तमान पिन दर्ज करें।',
            bho: 'पिन बंद करे खातिर अभी वाला पिन लिखीं।',
            mai: 'पिन बंद करबाक लेल वर्तमान पिन लिखू।',
            ne: 'पिन बन्द गर्न हालको पिन लेख्नुहोस्।',
          })
        );
        return;
      }
      if (ownerSecurity.disablePin(currentPinInput)) {
        playSuccessSound();
        setIsPinActive(false);
        setCurrentPinInput('');
        setPinErrorMessage('');
        showToast(
          pick5(language, {
            en: 'Security PIN disabled.',
            hi: 'सुरक्षा पिन बंद किया गया।',
            bho: 'सुरक्षा पिन बंद क दिहल गइल।',
            mai: 'सुरक्षा पिन बंद कएल गेल।',
            ne: 'सुरक्षा पिन निष्कृय गरियो।',
          })
        );
      } else {
        setPinErrorMessage(
          pick5(language, {
            en: 'Incorrect PIN!',
            hi: 'गलत पिन!',
            bho: 'गलत पिन!',
            mai: 'गलत पिन!',
            ne: 'गलत पिन!',
          })
        );
      }
    } else {
      if (isPinConfigured) {
        ownerSecurity.setPin(localStorage.getItem('ghaule_owner_security_pin_v1') || '1234');
        setIsPinActive(true);
        showToast(
          pick5(language, {
            en: 'Security PIN activated! 🔒',
            hi: 'सुरक्षा पिन सक्रिय किया गया! 🔒',
            bho: 'सुरक्षा पिन चालू हो गइल! 🔒',
            mai: 'सुरक्षा पिन सक्रिय भेल! 🔒',
            ne: 'सुरक्षा पिन सक्रिय गरियो! 🔒',
          })
        );
      } else {
        setIsChangingPin(true);
      }
    }
  };

  return (
    <div className="space-y-4 pb-24 select-none">
      {/* App Password & Owner Security Card */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-600" />
            <span>
              {pick5(language, {
                en: 'Owner Security PIN / Password',
                hi: 'मालिक सुरक्षा पासवर्ड / पिन',
                bho: 'मालिक सुरक्षा पासवर्ड / पिन',
                mai: 'मालिक सुरक्षा पासवर्ड / पिन',
                ne: 'मालिक सुरक्षा पासवर्ड / पिन',
              })}
            </span>
          </span>
          <span
            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
              isPinActive
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isPinActive ? (
              <>
                <Lock className="w-2.5 h-2.5 text-emerald-700" />
                <span>
                  {pick5(language, {
                    en: 'Active (ON)',
                    hi: 'सक्रिय (ON)',
                    bho: 'चालू (ON)',
                    mai: 'सक्रिय (ON)',
                    ne: 'सक्रिय (ON)',
                  })}
                </span>
              </>
            ) : (
              <span>
                {pick5(language, {
                  en: 'Off (OFF)',
                  hi: 'बंद (OFF)',
                  bho: 'बंद (OFF)',
                  mai: 'बंद (OFF)',
                  ne: 'बन्द (OFF)',
                })}
              </span>
            )}
          </span>
        </div>

        <p className="text-[11px] text-slate-600 leading-relaxed">
          {pick5(language, {
            en: 'Protects customer accounts and milk ledger records from unauthorized deletion by staff or third parties.',
            hi: 'यह पासवर्ड ग्राहक के खाते, पुराने दूध रिकॉर्ड या बहीखाता को डिलीट होने से बचाता है। स्टाफ या हेल्पर आपकी अनुमति के बिना हिसाब नहीं मिटा सकेंगे।',
            bho: 'ई पासवर्ड ग्राहक के खाता, पुरान दूध रिकॉर्ड भा बहीखाता के मिटावे से बचावेला। राउर इजाजत बिना केहू हिसाब ना मिटा पाई।',
            mai: 'ई पासवर्ड ग्राहकक खाता, पुरान दूध रिकॉर्ड वा बहीखाता केँ मेटाबय सँ बचाबैत अछि। अहाँक अनुमति बिना कोनो व्यक्ति हिसाब नहि मेटा सकैत अछि।',
            ne: 'यस पासवर्डले ग्राहकको खाता, पुराना दूध रेकर्ड वा बहीखाता मेटाउनबाट जोगाउँछ। स्टाफ वा सहयोगीले तपाईंको अनुमति बिना हिसाब मेट्न सक्ने छैनन्।',
          })}
        </p>

        {/* PIN Configuration / Form Box */}
        {(!isPinConfigured || isChangingPin) ? (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-150">
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {isPinConfigured
                  ? pick5(language, {
                      en: 'Change Password / PIN',
                      hi: 'पासवर्ड / पिन बदलें',
                      bho: 'पासवर्ड / पिन बदलीं',
                      mai: 'पासवर्ड / पिन बदलू',
                      ne: 'पासवर्ड / पिन परिवर्तन गर्नुहोस्',
                    })
                  : pick5(language, {
                      en: 'Create New Password / PIN',
                      hi: 'नया पासवर्ड / पिन बनाएं',
                      bho: 'नया पासवर्ड / पिन बनाईं',
                      mai: 'नव पासवर्ड / पिन बनाउ',
                      ne: 'नयाँ पासवर्ड / पिन बनाउनुहोस्',
                    })}
              </span>
            </h4>

            {isPinConfigured && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  {pick5(language, {
                    en: 'Current Old PIN:',
                    hi: 'वर्तमान पुराना पिन:',
                    bho: 'अभी वाला पुरान पिन:',
                    mai: 'वर्तमान पुरान पिन:',
                    ne: 'हालको पुरानो पिन:',
                  })}
                </label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  maxLength={6}
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder={pick5(language, {
                    en: 'Old PIN',
                    hi: 'पुराना पिन',
                    bho: 'पुरान पिन',
                    mai: 'पुरान पिन',
                    ne: 'पुरानो पिन',
                  })}
                  className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 text-xs font-black outline-none focus:border-amber-500"
                />
              </div>
            )}

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                {pick5(language, {
                  en: 'New 4 or 6 digit PIN:',
                  hi: 'नया ४ या ६ अंकों का पिन:',
                  bho: 'नया ४ भा ६ अंक के पिन:',
                  mai: 'नव ४ वा ६ अंकक पिन:',
                  ne: 'नयाँ ४ वा ६ अंकको पिन:',
                })}
              </label>
              <div className="relative">
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  maxLength={6}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder={pick5(language, {
                    en: 'e.g. 1234',
                    hi: 'उदा. 1234',
                    bho: 'जइसे 1234',
                    mai: 'जेना 1234',
                    ne: 'उदा. 1234',
                  })}
                  className="w-full py-2 pl-3 pr-9 rounded-xl bg-white border border-slate-200 text-xs font-black outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPasswordText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                {pick5(language, {
                  en: 'Confirm New PIN:',
                  hi: 'नया पिन दोबारा पुष्टि करें:',
                  bho: 'नया पिन फेर से लिखीं:',
                  mai: 'नव पिन पुनः पुष्टि करू:',
                  ne: 'नयाँ पिन पुनः पुष्टि गर्नुहोस्:',
                })}
              </label>
              <input
                type={showPasswordText ? 'text' : 'password'}
                maxLength={6}
                value={confirmPinInput}
                onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder={pick5(language, {
                  en: 'Re-enter PIN',
                  hi: 'पिन दोबारा लिखें',
                  bho: 'पिन फेर से लिखीं',
                  mai: 'पिन फेर सँ लिखू',
                  ne: 'पिन दोहोर्याउनुहोस्',
                })}
                className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 text-xs font-black outline-none focus:border-amber-500"
              />
            </div>

            {pinErrorMessage && (
              <p className="text-[11px] font-bold text-rose-600">{pinErrorMessage}</p>
            )}

            <div className="flex items-center gap-2 pt-1">
              {isPinConfigured && (
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPin(false);
                    setPinErrorMessage('');
                  }}
                  className="w-1/3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition"
                >
                  {pick5(language, {
                    en: 'Cancel',
                    hi: 'रद्द',
                    bho: 'रद्द करीं',
                    mai: 'रद्द करू',
                    ne: 'रद्द',
                  })}
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveNewPin}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-black shadow-xs transition cursor-pointer"
              >
                {pick5(language, {
                  en: 'Save PIN ✓',
                  hi: 'पिन सेव करें ✓',
                  bho: 'पिन सेव करीं ✓',
                  mai: 'पिन सुरक्षित करू ✓',
                  ne: 'पिन सुरक्षित गर्नुहोस् ✓',
                })}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  🔒
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 block">
                    {pick5(language, {
                      en: 'Owner Security PIN is Set',
                      hi: 'मालिक सुरक्षा पिन सेट है',
                      bho: 'मालिक सुरक्षा पिन सेट बा',
                      mai: 'मालिक सुरक्षा पिन सेट अछि',
                      ne: 'मालिक सुरक्षा पिन सेट छ',
                    })}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {isPinActive
                      ? pick5(language, {
                          en: 'PIN will be required before deleting records',
                          hi: 'डिलीट करने पर पिन मांगा जाएगा',
                          bho: 'डिलीट करे खातिर पिन पूछल जाई',
                          mai: 'डिलीट करबाक लेल पिन पूछल जायत',
                          ne: 'डिलिट वा मेटाउने कार्यमा पिन सोधिनेछ',
                        })
                      : pick5(language, {
                          en: 'Security lock is currently turned off',
                          hi: 'वर्तमान में सुरक्षा बंद है',
                          bho: 'अभी सुरक्षा बंद बा',
                          mai: 'वर्तमान मे सुरक्षा बंद अछि',
                          ne: 'हाल सुरक्षा बन्द गरिएको छ',
                        })}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  setIsChangingPin(true);
                  setPinErrorMessage('');
                  setCurrentPinInput('');
                  setNewPinInput('');
                  setConfirmPinInput('');
                }}
                className="py-1.5 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-[11px] font-bold shadow-2xs active:scale-95 transition cursor-pointer"
              >
                {pick5(language, {
                  en: 'Change PIN',
                  hi: 'पिन बदलें',
                  bho: 'पिन बदलीं',
                  mai: 'पिन बदलू',
                  ne: 'पिन बदल्नुहोस्',
                })}
              </button>
            </div>

            {/* Turn OFF or ON quick input */}
            <div className="flex items-center gap-2">
              {isPinActive && (
                <input
                  type="password"
                  maxLength={6}
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder={pick5(language, {
                    en: 'Enter current PIN to turn off',
                    hi: 'पिन बंद करने के लिए वर्तमान पिन लिखें',
                    bho: 'पिन बंद करे खातिर अभी वाला पिन लिखीं',
                    mai: 'पिन बंद करबाक लेल वर्तमान पिन लिखू',
                    ne: 'पिन बन्द गर्न हालको पिन लेख्नुहोस्',
                  })}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold outline-none focus:bg-white focus:border-amber-500"
                />
              )}

              <button
                type="button"
                onClick={handleTogglePinStatus}
                className={`py-2 px-3.5 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer whitespace-nowrap ${
                  isPinActive
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                }`}
              >
                {isPinActive
                  ? pick5(language, {
                      en: 'Turn OFF PIN',
                      hi: 'पिन बंद करें',
                      bho: 'पिन बंद करीं',
                      mai: 'पिन बंद करू',
                      ne: 'पिन बन्द गर्नुहोस्',
                    })
                  : pick5(language, {
                      en: 'Turn ON PIN',
                      hi: 'पिन चालू करें (ON)',
                      bho: 'पिन चालू करीं (ON)',
                      mai: 'पिन चालू करू (ON)',
                      ne: 'पिन सक्रिय गर्नुहोस् (ON)',
                    })}
              </button>
            </div>

            {pinErrorMessage && (
              <p className="text-[11px] font-bold text-rose-600">{pinErrorMessage}</p>
            )}
          </div>
        )}
      </div>

      {/* Date Save & Account (Google Drive Cloud Backup Option) */}
      <div
        onClick={() => {
          playTapSound();
          setDriveAccount(googleDriveBackupEngine.getConnectedUser());
          setIsDateSaveModalOpen(true);
        }}
        className="p-4.5 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white shadow-md space-y-3 cursor-pointer hover:shadow-lg active:scale-[0.99] transition select-none border border-blue-400/30"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md p-1 border border-white/25 flex items-center justify-center text-2xl shadow-sm flex-shrink-0">
              ☁️
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-black text-white text-sm">
                  {pick5(language, {
                    en: 'Data Save & Account',
                    hi: 'डेटा सेव और अकाउंट',
                    bho: 'डेटा सेव आ खाता',
                    mai: 'डेटा सेव आ खाता',
                    ne: 'डेटा सेभ र खाता',
                  })}
                </h4>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Drive Backup
                </span>
              </div>
              <p className="text-[11px] text-blue-100 font-medium mt-0.5 truncate">
                {driveAccount
                  ? `${pick5(language, {
                      en: 'Connected Account:',
                      hi: 'जुड़ा हुआ खाता:',
                      bho: 'जोड़ल खाता:',
                      mai: 'जोड़ल खाता:',
                      ne: 'जोडिएको खाता:',
                    })} ${driveAccount.email}`
                  : pick5(language, {
                      en: 'Google Drive encrypted cloud backup & restore',
                      hi: 'गूगल ड्राइव पर एन्क्रिप्टेड क्लाउड बैकअप और रिस्टोर',
                      bho: 'गूगल ड्राइव में सुरक्षित क्लाउड बैकअप आ रिस्टोर',
                      mai: 'गूगल ड्राइव पर सुरक्षित क्लाउड बैकअप आ रिस्टोर',
                      ne: 'गुगल ड्राइभमा इन्क्रिप्टेड क्लाउड ब्याकअप र रिस्टोर',
                    })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="px-3 py-1.5 rounded-xl bg-white text-blue-900 font-black text-xs shadow-xs flex items-center gap-1">
              <span>
                {pick5(language, {
                  en: 'Open',
                  hi: 'खोलें',
                  bho: 'खोलीं',
                  mai: 'खोलू',
                  ne: 'खोल्नुहोस्',
                })}
              </span>
              <span>➔</span>
            </span>
          </div>
        </div>

        {/* Status Strip */}
        <div className="pt-2.5 border-t border-white/15 flex items-center justify-between text-[11px] text-blue-100">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>
              {pick5(language, {
                en: 'AES-256 Encryption • Google Drive Backup',
                hi: 'AES-256 सुरक्षा • गूगल ड्राइव बैकअप',
                bho: 'AES-256 सुरक्षा • गूगल ड्राइव बैकअप',
                mai: 'AES-256 सुरक्षा • गूगल ड्राइव बैकअप',
                ne: 'AES-256 इन्क्रिप्सन • गुगल ड्राइभ ब्याकअप',
              })}
            </span>
          </span>
          <span className="font-extrabold text-amber-300 whitespace-nowrap ml-2">
            {driveAccount
              ? pick5(language, {
                  en: '✓ Connected',
                  hi: '✓ खाता जुड़ा है',
                  bho: '✓ खाता जुड़ल बा',
                  mai: '✓ खाता जुड़ल अछि',
                  ne: '✓ खाता जोडिएको छ',
                })
              : pick5(language, {
                  en: '+ Connect Account',
                  hi: '+ खाता जोड़ें',
                  bho: '+ खाता जोड़ीं',
                  mai: '+ खाता जोड़ू',
                  ne: '+ खाता जोड्नुहोस्',
                })}
          </span>
        </div>
      </div>

      {/* App Language Card */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <span>🌐</span> {t.appLanguage}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {localizeNumberString(5, language)}{' '}
            {pick5(language, {
              en: 'Languages',
              hi: 'भाषाएं',
              bho: 'भाषा',
              mai: 'भाषा',
              ne: 'भाषा',
            })}
          </span>
        </div>

        <p className="text-[11px] text-slate-500 leading-snug">
          {pick5(language, {
            en: 'Changes the entire app & displays your saved data in the selected language (stored records stay safe).',
            hi: 'भाषा बदलने पर पूरा ऐप और आपका सेव किया हुआ डेटा भी चुनी गई भाषा में दिखेगा।',
            bho: 'भाषा बदलला पर पूरा ऐप आ राउर सेव डेटा भी चुनल भाषा में देखाई।',
            mai: 'भाषा बदलला पर पूरा ऐप आ अहाँक सुरक्षित डेटा सेहो चुनल भाषा मे देखायत।',
            ne: 'भाषा परिवर्तन गर्दा पूरा एप र तपाईंको सेभ गरिएको डेटा पनि छानिएको भाषामा देखिनेछ।',
          })}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs" data-no-translate="true">
          {SUPPORTED_LANGUAGES.map((opt) => {
            const isSelected = language === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => {
                  playTapSound();
                  onLanguageChange(opt.code);
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition active:scale-[0.98] cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-500/20'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xl">{opt.flag}</span>
                  {isSelected && <Check className="w-4 h-4 text-blue-600 stroke-[3]" />}
                </div>
                <div className="mt-2">
                  <p className="font-extrabold text-slate-900 text-xs">{opt.nativeName}</p>
                  <p className="text-[10px] text-slate-500">{opt.englishName}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Select Currency Card */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <span>🪙</span> {t.selectCurrency}
        </span>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* NPR Button */}
          <button
            onClick={() => {
              playTapSound();
              onCurrencyChange('NPR');
            }}
            className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition active:scale-[0.98] cursor-pointer ${
              currency === 'NPR'
                ? 'bg-amber-50/50 border-amber-400 shadow-sm'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🇳🇵</span>
              <div>
                <p className="font-extrabold text-slate-900 text-sm">रु NPR</p>
                <p className="text-[10px] text-slate-500">
                  {pick5(language, {
                    en: 'Nepalese Rupee',
                    hi: 'नेपाली रुपया',
                    bho: 'नेपाली रुपिया',
                    mai: 'नेपाली रूपैया',
                    ne: 'नेपाली रुपैयाँ',
                  })}
                </p>
              </div>
            </div>
            {currency === 'NPR' && <Check className="w-4 h-4 text-amber-600 stroke-[3]" />}
          </button>

          {/* INR Button */}
          <button
            onClick={() => {
              playTapSound();
              onCurrencyChange('INR');
            }}
            className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition active:scale-[0.98] cursor-pointer ${
              currency === 'INR'
                ? 'bg-amber-50/50 border-amber-400 shadow-sm'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🇮🇳</span>
              <div>
                <p className="font-extrabold text-slate-900 text-sm">₹ INR</p>
                <p className="text-[10px] text-slate-500">
                  {pick5(language, {
                    en: 'Indian Rupee',
                    hi: 'भारतीय रुपया',
                    bho: 'भारतीय रुपिया',
                    mai: 'भारतीय रूपैया',
                    ne: 'भारतीय रुपया',
                  })}
                </p>
              </div>
            </div>
            {currency === 'INR' && <Check className="w-4 h-4 text-amber-600 stroke-[3]" />}
          </button>
        </div>
      </div>

      {/* Privacy Policy Link */}
      {onOpenPrivacyModal && (
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <button
            onClick={() => {
              playTapSound();
              onOpenPrivacyModal();
            }}
            className="w-full flex items-center justify-between text-slate-800 font-semibold text-xs active:scale-[0.99] transition cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
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
            <span className="text-slate-400 font-bold">›</span>
          </button>
        </div>
      )}

      {/* Date Save & Account (Google Drive Backup) Modal */}
      <DateSaveAccountModal
        isOpen={isDateSaveModalOpen}
        onClose={() => {
          setIsDateSaveModalOpen(false);
          setDriveAccount(googleDriveBackupEngine.getConnectedUser());
        }}
        language={language}
        showToast={showToast}
        onDataRestored={() => {
          setDriveAccount(googleDriveBackupEngine.getConnectedUser());
          showToast(
            pick5(language, {
              en: 'Data restored successfully!',
              hi: 'डेटा सफलतापूर्वक रिस्टोर हुआ!',
              bho: 'डेटा बढ़िया से वापस आ गइल!',
              mai: 'डेटा सफलतापूर्वक रिस्टोर भेल!',
              ne: 'डेटा रिस्टोर भयो! कृपया आवश्यकता अनुसार पृष्ठ रिफ्रेस गर्नुहोस्।',
            })
          );
        }}
      />
    </div>
  );
};
