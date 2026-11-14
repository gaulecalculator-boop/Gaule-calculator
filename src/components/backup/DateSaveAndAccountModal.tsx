/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Date Save & Account Modal (Cloud Backup & Restore)
 * Official Google Drive appDataFolder integration with AES-256-GCM encryption.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CloudUpload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Lock,
  ArrowRight,
  Database,
  Calendar,
  Clock,
  Trash2,
  Download,
  Users,
  FileText,
  DollarSign,
  Copy,
  LogOut,
  Sparkles,
} from 'lucide-react';
import {
  cloudBackupManager,
  ConnectedDriveUser,
  CloudBackupItem,
  BackupMetadata,
} from '../../utils/cloudBackupManager';
import { Language } from '../../types';
import { playTapSound, playSuccessSound } from '../../utils/audio';

interface DateSaveAndAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  showToast: (msg: string) => void;
  onDataRestored?: () => void;
}

export const DateSaveAndAccountModal: React.FC<DateSaveAndAccountModalProps> = ({
  isOpen,
  onClose,
  language,
  showToast,
  onDataRestored,
}) => {
  const [connectedUser, setConnectedUser] = useState<ConnectedDriveUser | null>(
    cloudBackupManager.getConnectedUser()
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStep, setBackupStep] = useState<string>('');
  const [backupProgress, setBackupProgress] = useState<number>(0);
  const [lastBackupResult, setLastBackupResult] = useState<BackupMetadata | null>(null);

  const [backups, setBackups] = useState<CloudBackupItem[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<CloudBackupItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStep, setRestoreStep] = useState<string>('');
  const [restoreProgress, setRestoreProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = cloudBackupManager.subscribe(() => {
      setConnectedUser(cloudBackupManager.getConnectedUser());
    });
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    if (isOpen && cloudBackupManager.isConnected()) {
      fetchBackupList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const fetchBackupList = async () => {
    setIsLoadingBackups(true);
    setErrorMessage(null);
    try {
      const list = await cloudBackupManager.listBackups();
      setBackups(list);
    } catch (err: any) {
      console.warn('[CloudBackup] List error:', err);
      setErrorMessage(err.message || 'Failed to list backups.');
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleConnectGoogle = async () => {
    playTapSound();
    setIsConnecting(true);
    setErrorMessage(null);
    const res = await cloudBackupManager.connectGoogleAccount();
    setIsConnecting(false);
    if (res.success && res.user) {
      playSuccessSound();
      showToast(
        language === 'ne'
          ? `गुगल खाता जोडिनुभयो: ${res.user.email} ✓`
          : `Connected Google account: ${res.user.email} ✓`
      );
      fetchBackupList();
    } else if (res.error) {
      setErrorMessage(res.error);
    }
  };

  const handleSwitchAccount = async () => {
    playTapSound();
    setIsConnecting(true);
    setErrorMessage(null);
    const res = await cloudBackupManager.switchGoogleAccount();
    setIsConnecting(false);
    if (res.success && res.user) {
      playSuccessSound();
      showToast(
        language === 'ne'
          ? `खाता परिवर्तन भयो: ${res.user.email} ✓`
          : `Switched account to: ${res.user.email} ✓`
      );
      fetchBackupList();
    } else if (res.error) {
      setErrorMessage(res.error);
    }
  };

  const handleDisconnect = () => {
    playTapSound();
    cloudBackupManager.disconnect();
    setBackups([]);
    setLastBackupResult(null);
    showToast(language === 'ne' ? 'गुगल खाता विच्छेद गरियो।' : 'Google account disconnected.');
  };

  const handleSaveNow = async () => {
    playTapSound();
    if (!cloudBackupManager.isConnected()) {
      handleConnectGoogle();
      return;
    }

    setIsBackingUp(true);
    setErrorMessage(null);
    setBackupProgress(10);
    setBackupStep('Preparing data...');

    try {
      const meta = await cloudBackupManager.uploadBackup((step, pct) => {
        setBackupStep(step);
        setBackupProgress(pct);
      });

      playSuccessSound();
      setLastBackupResult(meta);
      showToast(
        language === 'ne'
          ? 'गुगल ड्राइभमा सुरक्षित भयो! (Latest 10 Verified)'
          : 'Encrypted backup saved to Google Drive! ✓'
      );
      fetchBackupList();
    } catch (err: any) {
      console.error('[CloudBackup] Save error:', err);
      setErrorMessage(err.message || 'Backup failed. Please check internet connection.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    playTapSound();
    setIsRestoring(true);
    setRestoreProgress(15);
    setRestoreStep('Connecting to Google Drive...');

    try {
      await cloudBackupManager.restoreBackup(restoreTarget.id, (step, pct) => {
        setRestoreStep(step);
        setRestoreProgress(pct);
      });

      playSuccessSound();
      showToast(
        language === 'ne'
          ? 'सबै रेकर्डहरू सफलतापुर्वक रिस्टोर गरियो! ✓'
          : 'All records restored successfully! ✓'
      );
      setRestoreTarget(null);

      if (onDataRestored) {
        onDataRestored();
      }
    } catch (err: any) {
      console.error('[CloudBackup] Restore error:', err);
      setErrorMessage(err.message || 'Restore failed.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteBackup = async (fileId: string) => {
    playTapSound();
    const ok = window.confirm(
      language === 'ne'
        ? 'के तपाईं यो ब्याकअप फाइल गुगल ड्राइभबाट मेटाउन चाहनुहुन्छ?'
        : 'Delete this backup file from Google Drive?'
    );
    if (!ok) return;

    const success = await cloudBackupManager.deleteBackup(fileId);
    if (success) {
      showToast(language === 'ne' ? 'ब्याकअप मेटाइयो।' : 'Backup deleted.');
      fetchBackupList();
    } else {
      showToast('Failed to delete backup.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-5 flex items-start justify-between relative select-none">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md p-1 border border-white/20 flex items-center justify-center shadow-md flex-shrink-0">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg leading-tight tracking-tight">
                  Date Save & Account
                </h3>
                <span className="text-[10px] bg-amber-400 text-slate-900 font-black px-2 py-0.5 rounded-full uppercase">
                  Cloud Backup
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium mt-0.5">
                {language === 'ne'
                  ? 'व्यक्तिगत गुगल ड्राइभमा १००% इन्क्रिप्टेड सुरक्षित ब्याकअप'
                  : 'Encrypted backup to your personal Google Drive appDataFolder'}
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

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-slate-800 text-xs">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Connected Google Account Section */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <span>👤</span> {language === 'ne' ? 'जोडिएको गुगल खाता (Google Account)' : 'Connected Google Account'}
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  connectedUser
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {connectedUser ? 'CONNECTED ✓' : 'NOT CONNECTED'}
              </span>
            </div>

            {connectedUser ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs">
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
                      <p className="text-xs font-black text-slate-900 truncate">
                        {connectedUser.displayName}
                      </p>
                      <p className="text-[11px] font-bold text-blue-700 truncate">
                        {connectedUser.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={handleSwitchAccount}
                      disabled={isConnecting}
                      className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition cursor-pointer active:scale-95"
                      title="Switch Google Account"
                    >
                      {language === 'ne' ? 'खाता फेर्नुहोस्' : 'Switch'}
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer active:scale-95"
                      title="Disconnect Account"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-emerald-700 font-bold bg-emerald-50/70 p-2 rounded-xl border border-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    {language === 'ne'
                      ? 'तपाईंको आफ्नै Google Drive appDataFolder सुरक्षित जोडिएको छ। कुनै बाहिरी व्यक्तिले पढ्न सक्दैन।'
                      : 'Authenticated to your private Google Drive appDataFolder. End-to-end isolated.'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  {language === 'ne'
                    ? 'कृपया आफ्नो व्यक्तिगत गुगल खाता (Gmail) जोड्नुहोस्। ब्याकअप फाइलहरू तपाईंको आफ्नै गुगल ड्राइभमा गोप्य रूपमा रहनेछन्।'
                    : 'Connect your personal Google account. All backups are stored strictly in your own private Google Drive.'}
                </p>

                {/* Official Google Sign-In Button */}
                <button
                  onClick={handleConnectGoogle}
                  disabled={isConnecting}
                  className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-300 active:scale-95 text-slate-800 font-black text-xs flex items-center justify-center gap-3 transition shadow-xs cursor-pointer"
                >
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
                  <span>
                    {isConnecting
                      ? 'Connecting Google Account...'
                      : language === 'ne'
                      ? 'आफ्नो गुगल खाता छान्नुहोस् (Connect Google Account)'
                      : 'Connect with Personal Google Account'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Primary Action: SAVE NOW (ब्याकअप सुरक्षित गर्नुहोस्) */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50 to-white border-2 border-blue-200/90 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <CloudUpload className="w-4 h-4 text-blue-600" />
                  <span>{language === 'ne' ? 'अहिले ब्याकअप गर्नुहोस् (Save Now)' : 'Save Now (Cloud Backup)'}</span>
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {language === 'ne'
                    ? 'सबै दूध रेकर्ड, ग्राहक खाता, रसिद र सेटिङहरू सुरक्षित हुन्छन्।'
                    : 'Uploads an encrypted copy of all records to your Google Drive.'}
                </p>
              </div>
              <span className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-sm flex-shrink-0">
                🔒
              </span>
            </div>

            {/* Backing up progress bar */}
            {isBackingUp ? (
              <div className="p-3 rounded-2xl bg-white border border-blue-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-blue-900">
                  <span>{backupStep}</span>
                  <span>{backupProgress}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
                    style={{ width: `${backupProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleSaveNow}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-black text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <CloudUpload className="w-4 h-4" />
                <span>
                  {language === 'ne'
                    ? '💾 अहिले क्लाउडमा सुरक्षित गर्नुहोस् (Save Now)'
                    : '💾 Save Now to Google Drive'}
                </span>
              </button>
            )}

            {/* Verification Checklist */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-bold pt-1">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> AES-256-GCM Encryption
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> SHA-256 Checksum Verified
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Latest 10 Backups Kept
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Photos & Ledgers Included
              </span>
            </div>
          </div>

          {/* Last Backup Result Badge */}
          {lastBackupResult && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 text-emerald-800 font-black">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>ब्याकअप सुरक्षित भयो (Verified): {lastBackupResult.bsDate}</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                ग्राहक संख्या: <strong>{lastBackupResult.summary.customerCount}</strong> • दूध रेकर्ड: <strong>{lastBackupResult.summary.dailyRecordCount}</strong> • भुक्तानी: <strong>{lastBackupResult.summary.paymentCount}</strong>
              </p>
              <p className="text-[10px] text-slate-500 font-mono truncate">
                ID: {lastBackupResult.backupId} • Checksum: {lastBackupResult.checksum.substring(0, 16)}...
              </p>
            </div>
          )}

          {/* Version History List (Latest 10 Verified Backups) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  {language === 'ne'
                    ? 'पछिल्ला सुरक्षित ब्याकअपहरू (Version History)'
                    : 'Verified Backup History'}
                </span>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {backups.length}/10
                </span>
              </h4>

              {connectedUser && (
                <button
                  onClick={fetchBackupList}
                  disabled={isLoadingBackups}
                  className="p-1 text-slate-400 hover:text-slate-600 transition"
                  title="Refresh list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {!connectedUser ? (
              <p className="text-[11px] text-slate-400 text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                {language === 'ne'
                  ? 'ब्याकअप सूची हेर्न आफ्नो गुगल खाता जोड्नुहोस्।'
                  : 'Connect your Google account to view saved cloud backups.'}
              </p>
            ) : isLoadingBackups ? (
              <div className="p-6 text-center text-slate-500 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600" />
                <p className="text-[11px] font-bold">Google Drive appDataFolder बाट लोड हुँदैछ...</p>
              </div>
            ) : backups.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                <Cloud className="w-6 h-6 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">कुनै ब्याकअप भेटिएन।</p>
                <p className="text-[10px]">माथिको "Save Now" बटन थिचेर पहिलो ब्याकअप लिनुहोस्।</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {backups.map((bak, idx) => {
                  const meta = bak.metadata;
                  const dateStr = meta?.bsDate || new Date(bak.createdTime).toLocaleDateString();
                  const timeStr = new Date(bak.createdTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={bak.id}
                      className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 transition shadow-2xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black text-[10px] flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-blue-600" />
                              <span>{dateStr}</span>
                              <span className="text-[10px] text-slate-400 font-normal">({timeStr})</span>
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Size: {(bak.size / 1024).toFixed(1)} KB • v{meta?.appVersion || '1.0'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setRestoreTarget(bak)}
                            className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-[11px] shadow-xs transition cursor-pointer flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>{language === 'ne' ? 'रिस्टोर' : 'Restore'}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteBackup(bak.id)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {meta?.summary && (
                        <div className="flex items-center gap-2 text-[10px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span>👥 {meta.summary.customerCount} ग्राहक</span>
                          <span>•</span>
                          <span>🥛 {meta.summary.dailyRecordCount} रेकर्ड</span>
                          <span>•</span>
                          <span>💰 {meta.summary.paymentCount} भुक्तानी</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Restore Confirmation Modal Dialog (Mandatory per Safety Protocol) */}
        {restoreTarget && (
          <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black mx-auto text-xl">
                ⚠️
              </div>

              <div className="text-center space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900">
                  {language === 'ne' ? 'के तपाईं यो ब्याकअप रिस्टोर गर्न चाहनुहुन्छ?' : 'Confirm Data Restore?'}
                </h4>
                <p className="text-xs text-slate-600">
                  {language === 'ne'
                    ? 'यसले हालका रेकर्डहरूलाई यस ब्याकअपको तथ्यांकसँग सिंक गर्नेछ।'
                    : 'This will restore all records, customers, and milk ledgers from this backup.'}
                </p>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 mt-2">
                  मिति: {restoreTarget.metadata?.bsDate || restoreTarget.name}
                </div>
              </div>

              {isRestoring ? (
                <div className="space-y-2 py-2">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                    <span>{restoreStep}</span>
                    <span>{restoreProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300"
                      style={{ width: `${restoreProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setRestoreTarget(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                  >
                    {language === 'ne' ? 'रद्द गर्नुहोस्' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleConfirmRestore}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>{language === 'ne' ? 'हो, रिस्टोर गर्नुहोस् ✓' : 'Yes, Restore Now ✓'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between select-none">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Google Drive appDataFolder Isolated</span>
          </div>

          <button
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="py-2 px-5 rounded-2xl bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 text-slate-700 font-bold text-xs transition cursor-pointer shadow-xs"
          >
            {language === 'ne' ? 'बन्द गर्नुहोस्' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
