/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Date Save & Account (Cloud Backup & Restore Modal)
 * Google Drive appDataFolder with AES-256-GCM encryption
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CloudUpload,
  CloudDownload,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Lock,
  Trash2,
  RefreshCw,
  Clock,
  HardDrive,
  Users,
  Milk,
  Receipt,
  LogOut,
  ChevronRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Language } from '../types';
import { playTapSound, playSuccessSound } from '../utils/audio';
import {
  googleDriveBackupEngine,
  BackupMetadata,
} from '../utils/googleDriveBackupEngine';

interface DateSaveAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  showToast: (msg: string) => void;
  onDataRestored?: () => void;
}

export const DateSaveAccountModal: React.FC<DateSaveAccountModalProps> = ({
  isOpen,
  onClose,
  language,
  showToast,
  onDataRestored,
}) => {
  const [connectedUser, setConnectedUser] = useState(
    googleDriveBackupEngine.getConnectedUser()
  );
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  // Backup In-Progress State
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupStatusMessage, setBackupStatusMessage] = useState('');
  const [lastSavedBackup, setLastSavedBackup] = useState<BackupMetadata | null>(null);

  // Restore State
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreStatusMessage, setRestoreStatusMessage] = useState('');
  const [confirmRestoreItem, setConfirmRestoreItem] = useState<BackupMetadata | null>(null);

  // Error State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const user = googleDriveBackupEngine.getConnectedUser();
      setConnectedUser(user);
      if (user) {
        loadBackupsList();
      }
    }
  }, [isOpen]);

  const loadBackupsList = async () => {
    setIsLoadingList(true);
    setErrorMessage(null);
    try {
      const list = await googleDriveBackupEngine.listBackups();
      setBackups(list);
    } catch (err: any) {
      console.warn('Could not load backup list:', err);
      setErrorMessage(err.message || 'Failed to load backups from Google Drive');
    } finally {
      setIsLoadingList(false);
    }
  };

  if (!isOpen) return null;

  const handleConnect = async (forcePicker = true) => {
    playTapSound();
    setErrorMessage(null);
    const res = await googleDriveBackupEngine.connectAccount(forcePicker);
    if (res.success && res.user) {
      playSuccessSound();
      setConnectedUser(res.user);
      showToast(
        language === 'ne'
          ? `गुगल खाता (${res.user.email}) जोडिएको छ! ✓`
          : `Connected Google Account (${res.user.email})! ✓`
      );
      loadBackupsList();
    } else if (res.error) {
      setErrorMessage(res.error);
    }
  };

  const handleDisconnect = async () => {
    playTapSound();
    await googleDriveBackupEngine.disconnectAccount();
    setConnectedUser(null);
    setBackups([]);
    setLastSavedBackup(null);
    showToast(
      language === 'ne'
        ? 'गुगल ड्राइभ खाता छुटाइयो'
        : 'Google Drive account disconnected'
    );
  };

  const handleSaveNow = async () => {
    playTapSound();
    if (!connectedUser) {
      await handleConnect(true);
      return;
    }

    setIsBackingUp(true);
    setBackupProgress(5);
    setBackupStatusMessage('Preparing backup...');
    setErrorMessage(null);

    try {
      const result = await googleDriveBackupEngine.createBackup(
        (percent, message) => {
          setBackupProgress(percent);
          setBackupStatusMessage(message);
        }
      );
      playSuccessSound();
      setLastSavedBackup(result);
      showToast(
        language === 'ne'
          ? 'गुगल ड्राइभमा इन्क्रिप्टेड ब्याकअप सुरक्षित भयो! ✓'
          : 'Encrypted backup saved to Google Drive successfully! ✓'
      );
      await loadBackupsList();
    } catch (err: any) {
      console.error('Backup error:', err);
      setErrorMessage(err.message || 'Backup failed to upload to Google Drive.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!confirmRestoreItem) return;
    playTapSound();
    const itemToRestore = confirmRestoreItem;
    setConfirmRestoreItem(null);
    setIsRestoring(true);
    setRestoreProgress(10);
    setRestoreStatusMessage('Connecting to Google Drive...');
    setErrorMessage(null);

    try {
      await googleDriveBackupEngine.restoreBackup(
        itemToRestore.id,
        (percent, message) => {
          setRestoreProgress(percent);
          setRestoreStatusMessage(message);
        }
      );
      playSuccessSound();
      showToast(
        language === 'ne'
          ? 'सबै रेकर्डहरू सफलतापूर्वक रिस्टोर गरियो! ✓'
          : 'All records restored successfully! ✓'
      );
      if (onDataRestored) {
        onDataRestored();
      }
    } catch (err: any) {
      console.error('Restore error:', err);
      setErrorMessage(err.message || 'Failed to restore backup.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white p-5 flex items-start justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md p-1 border border-white/20 flex items-center justify-center shadow-md flex-shrink-0">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg leading-tight tracking-tight">
                  {language === 'ne'
                    ? 'Date Save & Account'
                    : 'Date Save & Account'}
                </h3>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Cloud Backup
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium mt-0.5">
                {language === 'ne'
                  ? 'व्यक्तिगत गुगल ड्राइभमा इन्क्रिप्टेड सुरक्षित ब्याकअप'
                  : 'Encrypted Google Drive appDataFolder Backup & Restore'}
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs text-slate-800">
          {/* Section 1: Connected Google Account Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <span>👤</span>
                <span>
                  {language === 'ne' ? 'जोडिएको गुगल खाता' : 'Connected Google Account'}
                </span>
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  connectedUser
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {connectedUser ? 'CONNECTED' : 'NOT CONNECTED'}
              </span>
            </div>

            {connectedUser ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200 shadow-2xs">
                    {connectedUser.photoURL ? (
                      <img
                        src={connectedUser.photoURL}
                        alt={connectedUser.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      connectedUser.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-900 text-xs truncate">
                      {connectedUser.displayName}
                    </p>
                    <p className="text-[11px] font-mono text-blue-700 truncate font-semibold">
                      {connectedUser.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => handleConnect(true)}
                    className="py-1.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 active:scale-95 transition cursor-pointer"
                    title="अर्को गुगल खाता छान्नुहोस्"
                  >
                    <span>🔄 Switch Account</span>
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold active:scale-95 transition cursor-pointer"
                    title="खाता विच्छेद गर्नुहोस्"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  {language === 'ne'
                    ? 'आफ्नो व्यक्तिगत गुगल खाता जोड्नुहोस्। ब्याकअप सिधै तपाईंको आफ्नै Google Drive appDataFolder मा सुरक्षित रहन्छ।'
                    : 'Connect your personal Google account. All backups are saved privately to your personal Google Drive appDataFolder.'}
                </p>
                <button
                  onClick={() => handleConnect(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Cloud className="w-4 h-4" />
                  <span>
                    {language === 'ne'
                      ? 'गुगल खाता छान्नुहोस् र जोड्नुहोस् (Sign in with Google)'
                      : 'Choose & Connect Google Account'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: "Save Now" Action Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                  <CloudUpload className="w-4 h-4 text-blue-700" />
                  <span>
                    {language === 'ne' ? 'नयाँ क्लाउड ब्याकअप (Save Now)' : 'Cloud Backup (Save Now)'}
                  </span>
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  दूध हिसाब, ग्राहक विवरण, भुक्तानी, रसिद र पसलका सबै रेकर्ड सुरक्षित हुन्छ
                </p>
              </div>
            </div>

            {/* In-Progress Progress Bar */}
            {isBackingUp && (
              <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
                  <span>{backupStatusMessage}</span>
                  <span>{backupProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 rounded-full"
                    style={{ width: `${backupProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-bold">त्रुटि (Error):</p>
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Last Saved Success Card */}
            {lastSavedBackup && !isBackingUp && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-[11px] space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-black text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>ब्याकअप सुरक्षित भयो (Verified & Encrypted)</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-emerald-800 font-medium">
                  <p>• ID: {lastSavedBackup.backupId}</p>
                  <p>• मिति: {lastSavedBackup.bsDate}</p>
                  <p>• साइज: {Math.round(lastSavedBackup.sizeBytes / 1024)} KB</p>
                  <p>• ग्राहक: {lastSavedBackup.recordCounts.customers}</p>
                  <p>• दूध रेकर्ड: {lastSavedBackup.recordCounts.milkDailyRecords}</p>
                  <p>• चेकसम: {lastSavedBackup.checksum.substring(0, 10)}...</p>
                </div>
              </div>
            )}

            <button
              onClick={handleSaveNow}
              disabled={isBackingUp || isRestoring}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 active:scale-98 text-white font-black text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CloudUpload className="w-4 h-4" />
              <span>
                {isBackingUp
                  ? 'ब्याकअप हुँदैछ...'
                  : language === 'ne'
                  ? 'अहिले ब्याकअप गर्नुहोस् (Save Now)'
                  : 'Save Now (Create Cloud Backup)'}
              </span>
            </button>
          </div>

          {/* Section 3: Restore Progress */}
          {isRestoring && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-black text-amber-900">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-700" />
                  <span>{restoreStatusMessage}</span>
                </span>
                <span>{restoreProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-amber-100 overflow-hidden">
                <div
                  className="h-full bg-amber-600 transition-all duration-300 rounded-full"
                  style={{ width: `${restoreProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Section 4: Backup History & Restore List (10 latest backups) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-600" />
                <span>
                  {language === 'ne'
                    ? 'ब्याकअप इतिहास र रिस्टोर (Latest 10 Versions)'
                    : 'Backup History & Restore (Latest 10 Versions)'}
                </span>
              </h4>
              <button
                onClick={loadBackupsList}
                disabled={isLoadingList}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingList ? 'animate-spin' : ''}`} />
                <span>रिफ्रेस</span>
              </button>
            </div>

            {isLoadingList ? (
              <div className="p-6 text-center text-slate-400 space-y-1">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                <p className="text-[11px]">गुगल ड्राइभबाट ब्याकअप खोज्दैछ...</p>
              </div>
            ) : backups.length === 0 ? (
              <div className="p-5 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 space-y-1">
                <HardDrive className="w-6 h-6 mx-auto text-slate-400" />
                <p className="font-bold text-xs text-slate-700">कुनै ब्याकअप भेटिएन</p>
                <p className="text-[10px]">
                  माथिको <strong>"Save Now"</strong> थिचेर पहिलो क्लाउड ब्याकअप बनाउनुहोस्।
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map((bak, index) => {
                  const dateObj = new Date(bak.createdAt);
                  const formattedTime = dateObj.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const formattedDate = dateObj.toLocaleDateString();

                  return (
                    <div
                      key={bak.id}
                      className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-blue-300 transition space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-slate-900 text-xs">
                              {bak.bsDate ? `वि.सं. ${bak.bsDate}` : formattedDate}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              ({formattedTime})
                            </span>
                            {index === 0 && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.2 rounded">
                                LATEST
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                            ID: {bak.backupId} • {Math.round(bak.sizeBytes / 1024)} KB
                          </p>
                        </div>

                        <button
                          onClick={() => setConfirmRestoreItem(bak)}
                          disabled={isRestoring || isBackingUp}
                          className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs shadow-xs transition flex items-center gap-1 cursor-pointer flex-shrink-0 disabled:opacity-50"
                        >
                          <CloudDownload className="w-3.5 h-3.5" />
                          <span>रिस्टोर</span>
                        </button>
                      </div>

                      {/* Record counts chip strip */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[10px] text-slate-600 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3 text-blue-600" />
                          <strong>{bak.recordCounts.customers}</strong> ग्राहक
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Milk className="w-3 h-3 text-sky-600" />
                          <strong>{bak.recordCounts.milkDailyRecords}</strong> दूध रेकर्ड
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Receipt className="w-3 h-3 text-emerald-600" />
                          <strong>{bak.recordCounts.bills}</strong> बिल
                        </span>
                        <span className="ml-auto font-mono text-[9px] text-slate-400 truncate">
                          SHA: {bak.checksum.substring(0, 8)}...
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 5: Security Reassurance Info Banner */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>गोपनीयता तथा इन्क्रिप्सन सुरक्षा:</span>
            </div>
            <p className="leading-relaxed">
              • ब्याकअप फाइलहरू <strong>AES-256-GCM</strong> बाट इन्क्रिप्ट गरेर मात्र गुगल ड्राइभमा अपलोड हुन्छन्।
            </p>
            <p className="leading-relaxed">
              • यो ब्याकअप केवल तपाईंको व्यक्तिगत गुगल खाताको गोप्य <code>appDataFolder</code> मा बस्छ, अरु कसैले देख्न वा खोल्न सक्दैन।
            </p>
            <p className="leading-relaxed">
              • सिस्टमले सधैं नवीनतम <strong>१० वटा ब्याकअप</strong> सुरक्षित राख्छ।
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="py-2.5 px-6 rounded-xl bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 font-bold text-xs transition cursor-pointer"
          >
            बन्द गर्नुहोस् (Close)
          </button>
        </div>

        {/* Confirmation Modal for Restore (MANDATORY User Confirmation) */}
        {confirmRestoreItem && (
          <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3 shadow-2xl border border-amber-200 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-2xl">
                ⚠️
              </div>
              <div className="text-center space-y-1">
                <h4 className="font-black text-sm text-slate-900">
                  के तपाईं यो ब्याकअप रिस्टोर गर्न निश्चित हुनुहुन्छ?
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  यसले तपाईंको हालको स्थानीय दूध रेकर्ड, ग्राहकहरू र पसलको खातालाई ब्याकअप मिति (
                  <strong>{confirmRestoreItem.bsDate || confirmRestoreItem.createdAt}</strong>) को डेटासँग प्रतिस्थापन गर्नेछ।
                </p>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl text-[10px] space-y-0.5 text-slate-600 font-medium">
                <p>• ब्याकअप ID: {confirmRestoreItem.backupId}</p>
                <p>• ग्राहक संख्या: {confirmRestoreItem.recordCounts.customers}</p>
                <p>• दूध दैनिक रेकर्ड: {confirmRestoreItem.recordCounts.milkDailyRecords}</p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmRestoreItem(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs shadow-md shadow-amber-600/20 transition cursor-pointer"
                >
                  हो, रिस्टोर गर्नुहोस् ✓
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
