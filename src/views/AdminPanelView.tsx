/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Ghaule Calculator - Admin Panel View
 * Features:
 * - Super Admin (aayushinepalenergy@gmail.com) & Calendar Manager (Rajan) RBAC
 * - Isolated 2083, 2084, and 2085 BS Calendar Management
 * - Month, Date, Festival, and Holiday Editors
 * - Remove Incorrect Data
 * - Pre-Publish Integrity Validation & Confirmation
 * - Point-in-time Snapshot Backups & 1-Click Restore
 * - JSON and CSV Export / Import
 * - Immutable Audit Trail
 * - User Role Management (Super Admin Exclusive)
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Calendar,
  History,
  Database,
  Users,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Save,
  Trash2,
  Edit3,
  X,
  Plus,
  ArrowRight,
  FileText,
  Lock,
  RefreshCw,
  LogOut,
  ChevronRight,
  Crown,
} from 'lucide-react';
import {
  Language,
  UserProfile,
  UserRole,
  CalendarYearDataset,
  CalendarDayEntry,
  CalendarAuditLog,
  CalendarBackupSnapshot,
  AdminUserRecord,
} from '../types';
import { adminRoleManager, SUPER_ADMIN_EMAIL } from '../utils/adminRoleManager';
import { calendarVersionManager, SUPPORTED_CALENDAR_YEARS } from '../utils/calendarVersionManager';
import { playSuccessSound, playTapSound } from '../utils/audio';
import { downloadTextFile } from '../utils/androidBridge';

interface AdminPanelViewProps {
  language: Language;
  user: UserProfile | null;
  onNavigateHome: () => void;
  showToast: (msg: string) => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  language,
  user,
  onNavigateHome,
  showToast,
}) => {
  const [role, setRole] = useState<UserRole>(adminRoleManager.getCurrentRole());
  const [activeTab, setActiveTab] = useState<'editor' | 'backups' | 'audit' | 'roles'>('editor');
  const [activeYear, setActiveYear] = useState<number>(calendarVersionManager.getActiveYear());
  const [activeMonth, setActiveMonth] = useState<number>(1);
  const [dataset, setDataset] = useState<CalendarYearDataset | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [editingDay, setEditingDay] = useState<CalendarDayEntry | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [isSwitchYearModalOpen, setIsSwitchYearModalOpen] = useState<boolean>(false);
  const [targetSwitchYear, setTargetSwitchYear] = useState<number>(2084);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [backupLabel, setBackupLabel] = useState<string>('');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [auditLogs, setAuditLogs] = useState<CalendarAuditLog[]>([]);
  const [backups, setBackups] = useState<CalendarBackupSnapshot[]>([]);
  const [adminsList, setAdminsList] = useState<AdminUserRecord[]>([]);

  // Super Admin: Add Manager modal
  const [newManagerEmail, setNewManagerEmail] = useState<string>('');
  const [newManagerName, setNewManagerName] = useState<string>('');

  useEffect(() => {
    const unsub = adminRoleManager.subscribe((newRole) => {
      setRole(newRole);
    });

    loadData();

    return () => unsub();
  }, [activeYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const ds = await calendarVersionManager.getYearDataset(activeYear);
      setDataset(ds);
      setAuditLogs(calendarVersionManager.getAuditLogs());
      setBackups(calendarVersionManager.getBackups(activeYear));
      setAdminsList(adminRoleManager.getKnownAdmins());
    } catch (e: any) {
      showToast(e.message || 'Error loading calendar data');
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin = role === 'super_admin';
  const isCalendarManager = role === 'super_admin' || role === 'calendar_manager';

  // Security Wall: If not authorized, block view completely
  if (!isCalendarManager) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-lg shadow-rose-200/50">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">
          {language === 'ne' ? 'प्रवेश निषेध (Access Denied)' : 'Unauthorized Access'}
        </h2>
        <p className="text-xs text-slate-600 mt-2 max-w-xs leading-relaxed">
          {language === 'ne'
            ? 'यो एडमिन प्यानल केवल आधिकारिक Super Admin (aayushinepalenergy@gmail.com) वा क्यालेन्डर म्यानेजर (Rajan) का लागि मात्र सुरक्षित गरिएको छ।'
            : 'The Admin Panel is strictly restricted to Super Admin (aayushinepalenergy@gmail.com) and Calendar Manager (Rajan).'}
        </p>
        <button
          onClick={onNavigateHome}
          className="mt-6 px-6 py-2.5 rounded-2xl bg-blue-600 text-white font-bold text-xs shadow-md active:scale-95 transition cursor-pointer"
        >
          {language === 'ne' ? 'होममा फर्कनुहोस्' : 'Return to Home'}
        </button>
      </div>
    );
  }

  // Handle Switching Year (e.g. 2083 -> 2084 -> 2085)
  const handleConfirmYearSwitch = async () => {
    playTapSound();
    try {
      await calendarVersionManager.switchYear(targetSwitchYear, user);
      setActiveYear(targetSwitchYear);
      setIsSwitchYearModalOpen(false);
      playSuccessSound();
      showToast(
        language === 'ne'
          ? `${targetSwitchYear} BS क्यालेन्डर सक्रिय भयो (अघिल्लो वर्ष सुरक्षित छ)`
          : `Switched to ${targetSwitchYear} BS (Previous year preserved safely)`
      );
    } catch (e: any) {
      showToast(e.message);
    }
  };

  // Handle Day Edit
  const handleSaveDayEdit = async () => {
    if (!editingDay || !dataset) return;
    playTapSound();
    try {
      const updatedDs = await calendarVersionManager.updateDayEntry(
        editingDay.year,
        editingDay.month,
        editingDay.gate,
        {
          festivals: editingDay.festivals,
          isHoliday: editingDay.isHoliday,
          holidayReason: editingDay.holidayReason,
          tithi: editingDay.tithi,
        },
        user || ({ uid: 'admin_local', email: 'admin@ghaule.local' } as any)
      );
      setDataset(updatedDs);
      setEditingDay(null);
      setAuditLogs(calendarVersionManager.getAuditLogs());
      playSuccessSound();
      showToast(language === 'ne' ? 'तारीख र चाडपर्व सुरक्षित गरियो' : 'Day entry saved');
    } catch (e: any) {
      showToast(e.message);
    }
  };

  // Handle Remove Incorrect Data
  const handleRemoveData = async (gate: number, clearType: 'festivals' | 'holiday' | 'all_extras') => {
    if (!dataset) return;
    playTapSound();
    try {
      const updatedDs = await calendarVersionManager.removeDayData(
        activeYear,
        activeMonth,
        gate,
        clearType,
        user || ({ uid: 'admin_local', email: 'admin@ghaule.local' } as any)
      );
      setDataset(updatedDs);
      setAuditLogs(calendarVersionManager.getAuditLogs());
      showToast(language === 'ne' ? 'गलत डाटा हटाइयो' : 'Data removed successfully');
    } catch (e: any) {
      showToast(e.message);
    }
  };

  // Handle Publish with Validation
  const handlePublishCalendar = async () => {
    if (!dataset) return;
    playTapSound();
    try {
      const res = await calendarVersionManager.publishDataset(
        dataset,
        user || ({ uid: 'admin_local', email: 'admin@ghaule.local' } as any)
      );
      if (res.success) {
        setIsPublishModalOpen(false);
        playSuccessSound();
        showToast(
          language === 'ne'
            ? `${activeYear} BS क्यालेन्डर सफलतापूर्वक प्रमाणित गरी प्रकाशित गरियो!`
            : `${activeYear} BS Calendar validated and published!`
        );
        loadData();
      } else {
        showToast(res.error || 'Validation failed');
      }
    } catch (e: any) {
      showToast(e.message);
    }
  };

  // Handle Create Backup Snapshot
  const handleCreateBackup = async () => {
    playTapSound();
    try {
      await calendarVersionManager.createBackup(
        activeYear,
        backupLabel || `Manual Snapshot ${activeYear}`,
        user || ({ uid: 'admin_local', email: 'admin@ghaule.local' } as any)
      );
      setIsBackupModalOpen(false);
      setBackupLabel('');
      setBackups(calendarVersionManager.getBackups(activeYear));
      setAuditLogs(calendarVersionManager.getAuditLogs());
      playSuccessSound();
      showToast(language === 'ne' ? 'ब्याकअप स्न्यापसट सुरक्षित गरियो' : 'Backup snapshot created');
    } catch (e: any) {
      showToast(e.message);
    }
  };

  // Handle Restore Backup Snapshot
  const handleRestoreBackup = async (backupId: string) => {
    playTapSound();
    const ok = window.confirm(
      language === 'ne'
        ? 'के तपाईं पुरानो स्न्यापसट रिस्टोर गर्न निश्चित हुनुहुन्छ? वर्तमान परिवर्तनहरू बदलिनेछन्।'
        : 'Are you sure you want to restore this backup? Current uncommitted changes will be replaced.'
    );
    if (!ok) return;

    try {
      const res = await calendarVersionManager.restoreBackup(
        backupId,
        user || ({ uid: 'admin_local', email: 'admin@ghaule.local' } as any)
      );
      if (res.success && res.restoredDataset) {
        setDataset(res.restoredDataset);
        setAuditLogs(calendarVersionManager.getAuditLogs());
        playSuccessSound();
        showToast(language === 'ne' ? 'पुरानो डाटा सफलतापूर्वक रिस्टोर भयो!' : 'Backup restored successfully!');
      } else {
        showToast(res.error || 'Restore failed');
      }
    } catch (e: any) {
      showToast(e.message);
    }
  };

  // Export JSON
  const handleExportJson = () => {
    if (!dataset) return;
    playTapSound();
    const jsonStr = calendarVersionManager.exportJson(dataset);
    void downloadTextFile(jsonStr, `BS_${activeYear}_Ghaule_Calendar.json`, 'application/json');
    showToast(`BS_${activeYear}.json Exported ✓`);
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!dataset) return;
    playTapSound();
    const csvStr = calendarVersionManager.exportCsv(dataset);
    void downloadTextFile(csvStr, `BS_${activeYear}_Holidays_Festivals.csv`, 'text/csv;charset=utf-8;');
    showToast(`BS_${activeYear}.csv Exported ✓`);
  };

  // Import JSON
  const handleImportJson = () => {
    if (!importJsonText.trim()) return;
    playTapSound();
    const res = calendarVersionManager.importJson(
      importJsonText,
      user || ({ uid: 'admin_local', email: 'admin@ghaule.local' } as any)
    );
    if (res.success && res.dataset) {
      setDataset(res.dataset);
      setActiveYear(res.dataset.year_bs);
      setIsImportModalOpen(false);
      setImportJsonText('');
      playSuccessSound();
      showToast(language === 'ne' ? 'क्यालेन्डर डाटा सफलतापूर्वक आयात गरियो!' : 'JSON Calendar imported!');
    } else {
      showToast(res.error || 'Import failed');
    }
  };

  // Super Admin: Assign Calendar Manager to Rajan or another email
  const handleAssignManager = async () => {
    if (!newManagerEmail.trim()) return;
    playTapSound();
    const targetUid = `mgr_${newManagerEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const res = await adminRoleManager.assignRole(
      targetUid,
      newManagerEmail,
      newManagerName || 'Calendar Manager',
      'calendar_manager',
      user || ({ email: SUPER_ADMIN_EMAIL } as any)
    );
    if (res.success) {
      setAdminsList(adminRoleManager.getKnownAdmins());
      setNewManagerEmail('');
      setNewManagerName('');
      playSuccessSound();
      showToast(language === 'ne' ? 'क्यालेन्डर म्यानेजर अधिकार प्रदान गरियो' : 'Calendar Manager role granted');
    } else {
      showToast(res.error || 'Failed to assign role');
    }
  };

  // Current Month Data
  const currentMonthData = dataset?.months.find((m) => m.month === activeMonth);

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      {/* Top Banner with Admin Badge and Identity */}
      <div className={`p-4 rounded-3xl text-white shadow-xl relative overflow-hidden ${
        isSuperAdmin
          ? 'bg-gradient-to-br from-amber-600 via-amber-700 to-slate-900 border border-amber-400/30'
          : 'bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 border border-blue-400/30'
      }`}>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
              isSuperAdmin ? 'bg-amber-400 text-slate-950 font-black' : 'bg-blue-400 text-slate-950 font-black'
            }`}>
              {isSuperAdmin ? <Crown className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {isSuperAdmin ? 'Super Admin' : 'Calendar Manager (Rajan)'}
                </span>
                <span className="text-[10px] text-emerald-300 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Verified RBAC
                </span>
              </div>
              <h1 className="text-base font-extrabold text-white mt-0.5">
                {isSuperAdmin ? 'Ghaule Control Center' : 'Rajan Calendar Management'}
              </h1>
              <p className="text-[11px] text-white/80 font-mono">
                {user?.email || SUPER_ADMIN_EMAIL}
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateHome}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition text-xs font-bold flex items-center gap-1"
          >
            <span>Exit</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Year Selector Ribbon */}
        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-white/90">
              {language === 'ne' ? 'सक्रिय वर्ष:' : 'Active Year:'}
            </span>
            <div className="flex bg-black/25 p-1 rounded-xl">
              {SUPPORTED_CALENDAR_YEARS.map((y) => (
                <button
                  key={y}
                  onClick={() => {
                    if (y !== activeYear) {
                      setTargetSwitchYear(y);
                      setIsSwitchYearModalOpen(true);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                    y === activeYear
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {y} BS
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              setTargetSwitchYear(activeYear === 2083 ? 2084 : activeYear === 2084 ? 2085 : 2083);
              setIsSwitchYearModalOpen(true);
            }}
            className="text-[11px] font-bold text-amber-200 hover:text-white flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-xl transition"
          >
            <span>Change Year</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200/80 gap-1 overflow-x-auto">
        <button
          onClick={() => {
            playTapSound();
            setActiveTab('editor');
          }}
          className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
            activeTab === 'editor' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Editor</span>
        </button>

        <button
          onClick={() => {
            playTapSound();
            setActiveTab('backups');
          }}
          className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
            activeTab === 'backups' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Backups</span>
        </button>

        <button
          onClick={() => {
            playTapSound();
            setActiveTab('audit');
          }}
          className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
            activeTab === 'audit' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Log</span>
        </button>

        {/* Users & Roles Tab (Strictly Super Admin Only) */}
        {isSuperAdmin && (
          <button
            onClick={() => {
              playTapSound();
              setActiveTab('roles');
            }}
            className={`flex-1 min-w-[70px] py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
              activeTab === 'roles' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-50'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Roles</span>
          </button>
        )}
      </div>

      {/* ----------------- TAB 1: CALENDAR EDITOR ----------------- */}
      {activeTab === 'editor' && (
        <div className="space-y-3.5">
          {/* Action Toolbar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsPublishModalOpen(true)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-xs active:scale-95 transition cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{language === 'ne' ? 'प्रमाणीकरण गरी प्रकाशित' : 'Validate & Publish'}</span>
              </button>

              <button
                onClick={() => setIsBackupModalOpen(true)}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-xs active:scale-95 transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-amber-300" />
                <span>Backup</span>
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleExportJson}
                title="Export JSON"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                title="Import JSON"
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Month Tabs */}
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200/80 gap-1 overflow-x-auto shadow-xs text-xs">
            {dataset?.months.map((m) => (
              <button
                key={m.month}
                onClick={() => {
                  playTapSound();
                  setActiveMonth(m.month);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                  activeMonth === m.month
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {m.month}. {m.month_name_ne}
              </button>
            ))}
          </div>

          {/* Month Summary Bar */}
          {currentMonthData && (
            <div className="flex items-center justify-between px-3 py-2 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-900 font-bold">
              <span>{activeYear} BS — {currentMonthData.month_name_ne} ({currentMonthData.month_name_en})</span>
              <span>{currentMonthData.total_days} {language === 'ne' ? 'दिनहरू' : 'Days'}</span>
            </div>
          )}

          {/* Day Table / Entries */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {currentMonthData?.data.map((day) => (
              <div
                key={day.gate}
                className={`p-3 flex items-start justify-between gap-3 transition ${
                  day.isHoliday ? 'bg-rose-50/50' : 'hover:bg-slate-50'
                }`}
              >
                {/* Left: Gate & Weekday */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-xs ${
                    day.isHoliday ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {day.gate}
                  </div>
                  <div>
                    <p className={`text-xs font-bold leading-tight ${day.isHoliday ? 'text-rose-700' : 'text-slate-900'}`}>
                      {day.baar}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono leading-tight">{day.englishDate}</p>
                  </div>
                </div>

                {/* Center: Festivals & Holiday description */}
                <div className="flex-1 min-w-0 pr-2">
                  {day.festivals ? (
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {day.festivals}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No festival</p>
                  )}

                  <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                    <span className="text-slate-500 font-mono">{day.tithi || 'Tithi'}</span>
                    {day.isHoliday && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-bold">
                        {day.holidayReason || 'सार्वजनिक बिदा'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditingDay({ ...day })}
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition active:scale-95"
                    title="Edit festivals & holiday"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {(day.festivals || day.isHoliday) && (
                    <button
                      onClick={() => handleRemoveData(day.gate, 'all_extras')}
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition active:scale-95"
                      title="Clear incorrect data"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: BACKUPS & VERSION RECOVERY ----------------- */}
      {activeTab === 'backups' && (
        <div className="space-y-3.5">
          {/* Action Row */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900">
                {language === 'ne' ? 'क्यालेन्डर संस्करण तथा ब्याकअप' : 'Calendar Snapshots & Backups'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {activeYear} BS ({backups.length} {language === 'ne' ? 'स्न्यापसटहरू' : 'Snapshots'})
              </p>
            </div>

            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-xs active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Snapshot</span>
            </button>
          </div>

          {/* Quick Tools */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportCsv}
              className="p-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-left transition shadow-xs cursor-pointer"
            >
              <FileText className="w-4 h-4 text-emerald-600 mb-1" />
              <p className="text-xs font-bold text-slate-900">Export Holidays CSV</p>
              <p className="text-[10px] text-slate-500">For Excel &amp; Gazette audit</p>
            </button>

            <button
              onClick={handleExportJson}
              className="p-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-left transition shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-600 mb-1" />
              <p className="text-xs font-bold text-slate-900">Export Full JSON</p>
              <p className="text-[10px] text-slate-500">Full 365 days Panchang</p>
            </button>
          </div>

          {/* Backup Snapshot List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {backups.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {language === 'ne' ? 'अहिले कुनै ब्याकअप स्न्यापसट छैन' : 'No backups saved yet for this year'}
              </div>
            ) : (
              backups.map((bkp) => (
                <div key={bkp.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{bkp.label}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {new Date(bkp.timestamp).toLocaleString()} • by {bkp.createdBy}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRestoreBackup(bkp.id)}
                    className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-1.5 px-3 rounded-xl shadow-xs active:scale-95 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: AUDIT TRAIL ----------------- */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900">
                {language === 'ne' ? 'अपरिवर्तनीय गतिविधि लग (Immutable Audit Trail)' : 'Immutable Audit Log'}
              </h3>
              <p className="text-[10px] text-slate-500">
                Recorded {auditLogs.length} verified operations
              </p>
            </div>
            <button
              onClick={() => setAuditLogs(calendarVersionManager.getAuditLogs())}
              className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No activity logs recorded yet
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-blue-700 font-mono uppercase bg-blue-50 px-1.5 py-0.5 rounded">
                      {log.action}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 leading-snug">{log.details}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    User: {log.authorEmail} ({log.authorRole}) • Year: {log.targetYear} BS
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAB 4: ROLES (SUPER ADMIN ONLY) ----------------- */}
      {activeTab === 'roles' && isSuperAdmin && (
        <div className="space-y-3.5 animate-in fade-in">
          {/* Super Admin Notice Card */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <Crown className="w-4 h-4 text-amber-600" />
              <span>Super Admin Exclusive Controls</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900">
              Only Super Admin (<strong>{SUPER_ADMIN_EMAIL}</strong>) can grant or revoke roles.
              Calendar Manager (Rajan) is restricted from opening this section.
            </p>
          </div>

          {/* Current Administrators List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
            <div className="p-3 bg-slate-50 font-black text-xs text-slate-800">
              Authorized Personnel &amp; Roles
            </div>
            {adminsList.map((adm) => (
              <div key={adm.uid} className="p-3.5 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-900">{adm.name}</p>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      adm.role === 'super_admin'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-blue-100 text-blue-800 border border-blue-300'
                    }`}>
                      {adm.role === 'super_admin' ? 'Super Admin' : 'Calendar Manager (Rajan)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{adm.email}</p>
                </div>

                {adm.role !== 'super_admin' && (
                  <button
                    onClick={async () => {
                      if (window.confirm(`Revoke ${adm.name}?`)) {
                        await adminRoleManager.revokeRole(adm.uid, user || ({ email: SUPER_ADMIN_EMAIL } as any));
                        setAdminsList(adminRoleManager.getKnownAdmins());
                        showToast('Role revoked');
                      }
                    }}
                    className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Assign Role to Rajan / New Manager */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-black text-slate-900">
              Assign Calendar Manager Role
            </h4>
            <div className="space-y-2">
              <input
                type="email"
                placeholder="Manager Google Email (e.g. rajan@gmail.com)"
                value={newManagerEmail}
                onChange={(e) => setNewManagerEmail(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="text"
                placeholder="Manager Display Name (e.g. Rajan)"
                value={newManagerName}
                onChange={(e) => setNewManagerName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={handleAssignManager}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs active:scale-95 transition"
              >
                Grant Calendar Manager Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: EDIT DAY ENTRY ----------------- */}
      {editingDay && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black text-slate-900">
                Edit {editingDay.year}/{editingDay.month}/{editingDay.gate} ({editingDay.baar})
              </h3>
              <button onClick={() => setEditingDay(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Festivals &amp; Events (चाडपर्व)</label>
                <input
                  type="text"
                  value={editingDay.festivals || ''}
                  onChange={(e) => setEditingDay({ ...editingDay, festivals: e.target.value })}
                  placeholder="e.g. विजयादशमी, मेष संक्रान्ति"
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tithi (संवत् तिथि)</label>
                <input
                  type="text"
                  value={editingDay.tithi || ''}
                  onChange={(e) => setEditingDay({ ...editingDay, tithi: e.target.value })}
                  placeholder="e.g. एकादशी, पूर्णिमा"
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Holiday Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 block text-xs">Public Holiday (सार्वजनिक बिदा)</span>
                  <span className="text-[10px] text-slate-500">Highlight in red calendar cell</span>
                </div>
                <input
                  type="checkbox"
                  checked={!!editingDay.isHoliday}
                  onChange={(e) => setEditingDay({ ...editingDay, isHoliday: e.target.checked })}
                  className="w-5 h-5 accent-rose-600 rounded cursor-pointer"
                />
              </div>

              {editingDay.isHoliday && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Holiday Reason (बिदाको कारण)</label>
                  <input
                    type="text"
                    value={editingDay.holidayReason || ''}
                    onChange={(e) => setEditingDay({ ...editingDay, holidayReason: e.target.value })}
                    placeholder="e.g. संविधान दिवस, शनिबार बिदा"
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setEditingDay(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDayEdit}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: SWITCH YEAR CONFIRMATION ----------------- */}
      {isSwitchYearModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-slate-900">
                {language === 'ne' ? 'वर्ष परिवर्तन पुष्टि (Switch Year)' : 'Confirm Year Switch'}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {language === 'ne'
                  ? `तपाईं ${activeYear} BS बाट ${targetSwitchYear} BS मा जाँदै हुनुहुन्छ। अघिल्लो वर्षको सम्पूर्ण डाटा पूर्ण रूपमा सुरक्षित रहनेछ।`
                  : `Switching active editor from ${activeYear} BS to ${targetSwitchYear} BS. Previous year dataset is safely preserved without data loss.`}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsSwitchYearModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmYearSwitch}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md"
              >
                Switch to {targetSwitchYear} BS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: VALIDATE & PUBLISH CONFIRMATION ----------------- */}
      {isPublishModalOpen && dataset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-slate-900">
                Publish {activeYear} BS Calendar
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Ready to publish validated 12 months ({dataset.total_days_count} days) for {activeYear} BS.
                An automatic backup snapshot will be captured before publishing.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span>Total Months:</span>
                <span className="font-bold">12 Months ✓</span>
              </div>
              <div className="flex justify-between">
                <span>Total Days:</span>
                <span className="font-bold">{dataset.total_days_count} Days ✓</span>
              </div>
              <div className="flex justify-between">
                <span>Publisher:</span>
                <span className="font-bold font-mono text-[11px] truncate max-w-[150px]">{user?.email || SUPER_ADMIN_EMAIL}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishCalendar}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
              >
                Confirm &amp; Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: CREATE BACKUP SNAPSHOT ----------------- */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-slate-900">
              Create {activeYear} BS Snapshot
            </h3>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Snapshot Label</label>
              <input
                type="text"
                placeholder="e.g. Pre-Dashain Gazette 2084"
                value={backupLabel}
                onChange={(e) => setBackupLabel(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsBackupModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBackup}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md"
              >
                Save Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: IMPORT JSON DATA ----------------- */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-black text-slate-900">Import Calendar JSON</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="p-1 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Paste JSON Content</label>
              <textarea
                rows={8}
                placeholder='{"year_bs": 2084, "months": [...]}'
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-[10px] focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleImportJson}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
              >
                Validate &amp; Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
