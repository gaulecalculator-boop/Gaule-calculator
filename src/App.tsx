/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Language, Currency, UserProfile, UserRole } from './types';
import {
  getStoredLanguage,
  setStoredLanguage,
  getStoredCurrency,
  setStoredCurrency,
  getStoredPinnedTools,
  setStoredPinnedTools,
} from './utils/storage';
import { authManager } from './utils/authManager';
import { adminRoleManager } from './utils/adminRoleManager';
import { ALL_CALCULATORS, getToolName, getToolDesc } from './data/calculatorList';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { LoginModal } from './components/auth/LoginModal';
import { syncEngine } from './firebase/syncEngine';
import { HomeView } from './views/HomeView';
import { playTapSound } from './utils/audio';
import { translateUserData, useGlobalLanguageTranslator } from './utils/universalTranslator';
import './utils/androidBridge';

// Code-split heavy views & modals so initial APK/web startup is fast
const ToolsView = lazy(() => import('./views/ToolsView').then((m) => ({ default: m.ToolsView })));
const NotebookView = lazy(() => import('./views/NotebookView').then((m) => ({ default: m.NotebookView })));
const HistoryView = lazy(() => import('./views/HistoryView').then((m) => ({ default: m.HistoryView })));
const SettingsView = lazy(() => import('./views/SettingsView').then((m) => ({ default: m.SettingsView })));
const AdminPanelView = lazy(() => import('./views/AdminPanelView').then((m) => ({ default: m.AdminPanelView })));
const DoodhCalculator = lazy(() => import('./components/tools/DoodhCalculator').then((m) => ({ default: m.DoodhCalculator })));
const ByajCalculator = lazy(() => import('./components/tools/ByajCalculator').then((m) => ({ default: m.ByajCalculator })));
const PriceWeightCalculator = lazy(() => import('./components/tools/PriceWeightCalculator').then((m) => ({ default: m.PriceWeightCalculator })));
const GoldSilverCalculator = lazy(() => import('./components/tools/GoldSilverCalculator').then((m) => ({ default: m.GoldSilverCalculator })));
const GeneralCalculator = lazy(() => import('./components/tools/GeneralCalculator').then((m) => ({ default: m.GeneralCalculator })));
const PasalMainView = lazy(() => import('./hamroPasal/views/PasalMainView').then((m) => ({ default: m.PasalMainView })));
const BankInvestmentMainView = lazy(() => import('./bankInvestment/views/BankInvestmentMainView').then((m) => ({ default: m.BankInvestmentMainView })));
const StartupAnimationModal = lazy(() => import('./components/StartupAnimationModal').then((m) => ({ default: m.StartupAnimationModal })));
const ApkInstallModal = lazy(() => import('./components/ApkInstallModal').then((m) => ({ default: m.ApkInstallModal })));
const FirebaseDiagnosticModal = lazy(() => import('./components/firebase/FirebaseDiagnosticModal').then((m) => ({ default: m.FirebaseDiagnosticModal })));
const RemindersModal = lazy(() => import('./components/RemindersModal').then((m) => ({ default: m.RemindersModal })));
const PremiumModal = lazy(() => import('./components/PremiumModal').then((m) => ({ default: m.PremiumModal })));
const ApiDocumentationModal = lazy(() => import('./components/ApiDocumentationModal').then((m) => ({ default: m.ApiDocumentationModal })));
const NavigationDrawer = lazy(() => import('./components/NavigationDrawer').then((m) => ({ default: m.NavigationDrawer })));
const UserProfileModal = lazy(() => import('./components/auth/UserProfileModal').then((m) => ({ default: m.UserProfileModal })));
const SessionManagementModal = lazy(() => import('./components/auth/SessionManagementModal').then((m) => ({ default: m.SessionManagementModal })));
const PrivacyPolicyModal = lazy(() => import('./components/privacy/PrivacyPolicyModal').then((m) => ({ default: m.PrivacyPolicyModal })));

export default function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [navHistory, setNavHistory] = useState<string[]>(['home']);
  const [goldSilverInitialMetal, setGoldSilverInitialMetal] = useState<'gold' | 'silver'>('gold');
  const [language, setLanguage] = useState<Language>(getStoredLanguage());
  const [currency, setCurrency] = useState<Currency>(getStoredCurrency());
  const [pinnedIds, setPinnedIds] = useState<string[]>(getStoredPinnedTools());
  const [user, setUser] = useState<UserProfile | null>(authManager.getCurrentUser());
  const [userRole, setUserRole] = useState<UserRole>(adminRoleManager.getCurrentRole());
  const [accountEpoch, setAccountEpoch] = useState<number>(Date.now());

  // Modals & Drawers
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState<boolean>(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const [isFirebaseDiagOpen, setIsFirebaseDiagOpen] = useState<boolean>(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState<boolean>(false);
  const [is3DModalOpen, setIs3DModalOpen] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isRemindersOpen, setIsRemindersOpen] = useState<boolean>(false);
  const [isPremiumOpen, setIsPremiumOpen] = useState<boolean>(false);
  const [isApiDocsOpen, setIsApiDocsOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const prevUidRef = useRef<string | null>(authManager.getCurrentUser()?.uid || null);

  useEffect(() => {
    const unsubRole = adminRoleManager.subscribe((r) => {
      setUserRole(r);
    });

    const unsubAuth = authManager.subscribe((activeUser) => {
      const nextUid = activeUser?.uid || null;
      const uidChanged = nextUid !== prevUidRef.current;
      prevUidRef.current = nextUid;

      setUser(activeUser);
      if (activeUser) {
        setIsLoginModalOpen(false);
      }

      if (uidChanged) {
        setPinnedIds(getStoredPinnedTools());
        setCurrency(getStoredCurrency());
        setLanguage(getStoredLanguage());
        setAccountEpoch(Date.now());

        if (activeUser) {
          adminRoleManager.verifyAndSyncRole(activeUser).then((verifiedRole) => {
            setUserRole(verifiedRole);
            if (
              verifiedRole === 'super_admin' &&
              activeUser.email?.toLowerCase().trim() === 'aayushinepalenergy@gmail.com'
            ) {
              setCurrentView('admin_panel');
            }
          });
        } else {
          adminRoleManager.clearRole();
          setUserRole('user');
          setCurrentView((curr) => (curr === 'admin_panel' ? 'home' : curr));
        }
      }
    });

    // Multi-Device Real-Time Sync Listener:
    // When another device (Phone B) writes to Firestore, update views live on Phone A!
    const unsubData = syncEngine.onDataUpdate((type) => {
      console.log(`[Multi-Device Live Sync] Received ${type} update from cloud`);
      setAccountEpoch(Date.now());
    });

    // If user has not chosen any account yet, open login modal
    if (!authManager.isLoggedIn()) {
      setIsLoginModalOpen(true);
    }

    return () => {
      unsubRole();
      unsubAuth();
      unsubData();
    };
  }, []);

  // Global full-APK + saved-data language translation
  useGlobalLanguageTranslator(language);

  // Keep latest modal & navigation state accessible to Android hardware Back button
  const backContextRef = useRef<{
    currentView: string;
    canCloseLogin: boolean;
    closeTopModalIfOpen: () => boolean;
    goBack: () => void;
  }>({
    currentView: 'home',
    canCloseLogin: false,
    closeTopModalIfOpen: () => false,
    goBack: () => {},
  });

  backContextRef.current = {
    currentView,
    canCloseLogin: !!user,
    closeTopModalIfOpen: () => {
      if (isFirebaseDiagOpen) { setIsFirebaseDiagOpen(false); return true; }
      if (isPrivacyModalOpen) { setIsPrivacyModalOpen(false); return true; }
      if (isSessionModalOpen) { setIsSessionModalOpen(false); return true; }
      if (isProfileModalOpen) { setIsProfileModalOpen(false); return true; }
      if (isApiDocsOpen) { setIsApiDocsOpen(false); return true; }
      if (isPremiumOpen) { setIsPremiumOpen(false); return true; }
      if (isRemindersOpen) { setIsRemindersOpen(false); return true; }
      if (isApkModalOpen) { setIsApkModalOpen(false); return true; }
      if (is3DModalOpen) { setIs3DModalOpen(false); return true; }
      if (isDrawerOpen) { setIsDrawerOpen(false); return true; }
      if (isLoginModalOpen && user) { setIsLoginModalOpen(false); return true; }
      return false;
    },
    goBack: () => {
      if (currentView === 'bank_investment' || currentView === 'hamro_pasal' || currentView === 'admin_panel') {
        setNavHistory(['home']);
        setCurrentView('home');
        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }
      if (navHistory.length > 1) {
        const nextHistory = [...navHistory];
        nextHistory.pop();
        const prev = nextHistory[nextHistory.length - 1];
        setNavHistory(nextHistory);
        setCurrentView(prev || 'home');
      } else {
        setCurrentView('home');
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
  };

  useEffect(() => {
    window.__ghauleHandleBackPress = (): boolean => {
      const ctx = backContextRef.current;
      if (ctx.closeTopModalIfOpen()) {
        return true;
      }
      const ev = new CustomEvent('ghaule-hardware-back', { cancelable: true });
      const notCancelled = window.dispatchEvent(ev);
      if (!notCancelled || ev.defaultPrevented) {
        return true;
      }
      if (ctx.currentView !== 'home') {
        ctx.goBack();
        return true;
      }
      return false;
    };
    return () => {
      delete window.__ghauleHandleBackPress;
    };
  }, []);

  // Sync state to storage
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setStoredLanguage(lang);
  };

  const handleCurrencyChange = (curr: Currency) => {
    setCurrency(curr);
    setStoredCurrency(curr);
  };

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playTapSound();
    let updated: string[];
    if (pinnedIds.includes(id)) {
      updated = pinnedIds.filter((p) => p !== id);
    } else {
      updated = [...pinnedIds, id];
    }
    setPinnedIds(updated);
    setStoredPinnedTools(updated);
    showToast(
      updated.includes(id)
        ? language === 'en'
          ? 'Pinned to Home screen (★)'
          : language === 'hi'
          ? 'होम स्क्रीन पर जोड़ा गया (★)'
          : language === 'bho'
          ? 'होम स्क्रीन पर जोड़ल गइल (★)'
          : language === 'mai'
          ? 'होम स्क्रीन पर जोड़ल गेल (★)'
          : 'होम स्क्रिनमा थपियो (★)'
        : language === 'en'
        ? 'Removed from Home screen'
        : language === 'hi'
        ? 'होम स्क्रीन से हटाया गया'
        : language === 'bho'
        ? 'होम स्क्रीन से हटावल गइल'
        : language === 'mai'
        ? 'होम स्क्रीन सँ हटाओल गेल'
        : 'होम स्क्रिनबाट हटाइयो'
    );
  };

  const navigateTo = (view: string) => {
    if (view === currentView) return;
    setNavHistory((prev) => [...prev, view]);
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBack = () => {
    if (currentView === 'admin_panel') {
      setCurrentView('home');
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    if (navHistory.length > 1) {
      const nextHistory = [...navHistory];
      nextHistory.pop();
      const prev = nextHistory[nextHistory.length - 1];
      setNavHistory(nextHistory);
      setCurrentView(prev || 'home');
    } else {
      setCurrentView('home');
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleSelectTool = (toolId: string, initialMetal?: 'gold' | 'silver') => {
    if (initialMetal) {
      setGoldSilverInitialMetal(initialMetal);
    } else if (toolId === 'gold-silver') {
      setGoldSilverInitialMetal('gold');
    }
    navigateTo(`tool_${toolId}`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Determine active tool metadata if inside a tool view
  const isInsideTool = currentView.startsWith('tool_');
  const activeToolId = isInsideTool ? currentView.replace('tool_', '') : null;
  const activeTool = activeToolId
    ? ALL_CALCULATORS.find((c) => c.id === activeToolId)
    : null;

  // Complete separation for Bank & Investment (Works 100% offline, NO compulsory login)
  if (currentView === 'bank_investment') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm font-bold">Loading...</div>}>
        <BankInvestmentMainView
          key={`bank_inv_${accountEpoch}`}
          language={language}
          currency={currency}
          onLanguageChange={handleLanguageChange}
          onCurrencyChange={handleCurrencyChange}
          onReturnToCalculator={() => {
            navigateTo('home');
          }}
        />
      </Suspense>
    );
  }

  // Complete separation for Hamro Pasal 🏪
  if (currentView === 'hamro_pasal') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm font-bold">Loading...</div>}>
        <PasalMainView
          language={language}
          onReturnToCalculator={() => {
            navigateTo('home');
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-start text-slate-800 font-sans antialiased">
      {/* Mobile Shell Container (Max width mobile viewport) */}
      <div className="w-full max-w-md min-h-screen bg-[#F4F6F9] flex flex-col shadow-2xl relative overflow-x-hidden">
        {/* App Header */}
        <Header
          currentView={currentView}
          activeToolTitle={
            activeTool ? getToolName(activeTool, language) : undefined
          }
          activeToolSubtitle={
            activeTool ? getToolDesc(activeTool, language) : undefined
          }
          onBack={handleBack}
          language={language}
          onLanguageChange={handleLanguageChange}
          onOpenDrawer={() => setIsDrawerOpen(true)}
          user={user}
          onOpenApkModal={() => setIsApkModalOpen(true)}
          onOpenHamroPasal={() => navigateTo('hamro_pasal')}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onOpenFirebaseDiag={() => setIsFirebaseDiagOpen(true)}
        />

        {/* Main View Area */}
        <main className="flex-1 px-3.5 pt-3.5">
          {currentView === 'home' && (
            <HomeView
              key={`home_${accountEpoch}`}
              language={language}
              currency={currency}
              pinnedIds={pinnedIds}
              onTogglePin={handleTogglePin}
              onSelectTool={handleSelectTool}
              onNavigate={navigateTo}
            />
          )}

          <Suspense fallback={<div className="py-12 text-center text-xs font-bold text-slate-400">Loading...</div>}>
            {currentView === 'tools' && (
              <ToolsView
                language={language}
                currency={currency}
                pinnedIds={pinnedIds}
                onTogglePin={handleTogglePin}
                onSelectTool={handleSelectTool}
                onOpenHamroPasal={() => navigateTo('hamro_pasal')}
                onOpenBankInvestment={() => navigateTo('bank_investment')}
              />
            )}

            {(currentView === 'notebook' || currentView === 'notebook_dudh') && (
              <NotebookView
                key={`notebook_${accountEpoch}_${currentView}`}
                language={language}
                currency={currency}
                showToast={showToast}
                onNavigate={navigateTo}
                initialTab={currentView === 'notebook_dudh' ? 'dudh' : 'pasal'}
              />
            )}

            {currentView === 'history' && (
              <HistoryView
                key={`history_${accountEpoch}`}
                language={language}
                currency={currency}
                showToast={showToast}
              />
            )}

            {currentView === 'settings' && (
              <SettingsView
                key={`settings_${accountEpoch}`}
                language={language}
                onLanguageChange={handleLanguageChange}
                currency={currency}
                onCurrencyChange={handleCurrencyChange}
                onOpen3DModal={() => setIs3DModalOpen(true)}
                onOpenReminders={() => setIsRemindersOpen(true)}
                onOpenPremium={() => setIsPremiumOpen(true)}
                onOpenApiDocs={() => setIsApiDocsOpen(true)}
                onOpenApkModal={() => setIsApkModalOpen(true)}
                user={user}
                onOpenProfileModal={() => setIsProfileModalOpen(true)}
                onOpenLoginModal={() => setIsLoginModalOpen(true)}
                onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
                showToast={showToast}
              />
            )}

            {/* Deep Calculator Views */}
            {currentView === 'tool_doodh' && (
              <DoodhCalculator
                key={`doodh_${accountEpoch}`}
                language={language}
                currency={currency}
                onOpenNotebook={() => navigateTo('notebook_dudh')}
                showToast={showToast}
              />
            )}

            {currentView === 'tool_byaj' && (
              <ByajCalculator
                language={language}
                currency={currency}
                showToast={showToast}
              />
            )}

            {currentView === 'tool_price-weight' && (
              <PriceWeightCalculator
                language={language}
                currency={currency}
                onOpenNotebook={() => navigateTo('notebook')}
                showToast={showToast}
              />
            )}

            {currentView === 'tool_gold-silver' && (
              <GoldSilverCalculator
                key={`gold_silver_${goldSilverInitialMetal}`}
                language={language}
                currency={currency}
                initialMetal={goldSilverInitialMetal}
                onOpenNotebook={() => navigateTo('notebook')}
                showToast={showToast}
              />
            )}

            {/* Generic View for remaining tools */}
            {isInsideTool &&
              activeTool &&
              !['doodh', 'byaj', 'price-weight', 'gold-silver'].includes(activeTool.id) && (
                <GeneralCalculator
                  tool={activeTool}
                  language={language}
                  currency={currency}
                  showToast={showToast}
                  onBack={handleBack}
                />
              )}

            {/* Super Admin & Calendar Manager Dashboard */}
            {currentView === 'admin_panel' && (
              <AdminPanelView
                key={`admin_${accountEpoch}`}
                language={language}
                user={user}
                onNavigateHome={() => setCurrentView('home')}
                showToast={showToast}
              />
            )}
          </Suspense>
        </main>

        {/* Bottom Navigation */}
        <BottomNav
          currentView={currentView}
          onNavigate={navigateTo}
          language={language}
        />

        {/* Side Navigation Drawer */}
        {isDrawerOpen && (
          <Suspense fallback={null}>
            <NavigationDrawer
              isOpen={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              currentView={currentView}
              onNavigate={navigateTo}
              language={language}
              onLanguageChange={handleLanguageChange}
              currency={currency}
              onCurrencyChange={handleCurrencyChange}
              onOpen3DModal={() => setIs3DModalOpen(true)}
              onOpenReminders={() => setIsRemindersOpen(true)}
              onOpenPremium={() => setIsPremiumOpen(true)}
              onOpenApiDocs={() => setIsApiDocsOpen(true)}
              onOpenApkModal={() => setIsApkModalOpen(true)}
              user={user}
              userRole={userRole}
              onOpenProfileModal={() => setIsProfileModalOpen(true)}
              onOpenLoginModal={() => setIsLoginModalOpen(true)}
              onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
            />
          </Suspense>
        )}

        <Suspense fallback={null}>
          {/* 3D Startup Animation Modal */}
          {is3DModalOpen && (
            <StartupAnimationModal
              isOpen={is3DModalOpen}
              onClose={() => setIs3DModalOpen(false)}
              language={language}
            />
          )}

          {/* Android APK & WebAPK Install & Troubleshooting Modal */}
          {isApkModalOpen && (
            <ApkInstallModal
              isOpen={isApkModalOpen}
              onClose={() => setIsApkModalOpen(false)}
              language={language}
              onDirectAccess={() => {
                if (!user) {
                  const guestUser = authManager.loginAsGuest();
                  setUser(guestUser);
                  setIsLoginModalOpen(false);
                }
                setCurrentView('home');
              }}
            />
          )}

          {/* Reminders & Alerts Modal */}
          {isRemindersOpen && (
            <RemindersModal
              isOpen={isRemindersOpen}
              onClose={() => setIsRemindersOpen(false)}
              language={language}
              showToast={showToast}
            />
          )}

          {/* Ghaule Pro & Premium Modal */}
          {isPremiumOpen && (
            <PremiumModal
              isOpen={isPremiumOpen}
              onClose={() => setIsPremiumOpen(false)}
              language={language}
              showToast={showToast}
            />
          )}

          {/* Developer REST API Documentation Modal */}
          {isApiDocsOpen && (
            <ApiDocumentationModal
              isOpen={isApiDocsOpen}
              onClose={() => setIsApiDocsOpen(false)}
              language={language}
            />
          )}
        </Suspense>

        {/* Google Account & Guest Full Screen Login System */}
        <LoginModal
          isOpen={isLoginModalOpen || !user}
          canClose={!!user}
          onClose={() => setIsLoginModalOpen(false)}
          language={language}
          onLanguageChange={handleLanguageChange}
          onLoginSuccess={(loggedUser) => {
            setUser(loggedUser);
            setIsLoginModalOpen(false);
            setAccountEpoch(Date.now());
            showToast(
              loggedUser.isGuest
                ? language === 'en'
                  ? 'Guest session started (100% offline)'
                  : language === 'hi'
                  ? 'अतिथि सत्र शुरू हुआ (१००% ऑफलाइन)'
                  : language === 'bho'
                  ? 'गेस्ट खाता शुरू भइल (१००% ऑफलाइन)'
                  : language === 'mai'
                  ? 'अतिथि सत्र शुरू भेल (१००% ऑफलाइन)'
                  : 'अतिथि खाता सुरु भयो (१००% अफलाइन)'
                : language === 'en'
                ? `Welcome, ${translateUserData(loggedUser.name, language)}!`
                : language === 'hi' || language === 'mai'
                ? `स्वागत है, ${translateUserData(loggedUser.name, language)}!`
                : language === 'bho'
                ? `रउआ स्वागत बा, ${translateUserData(loggedUser.name, language)}!`
                : `स्वागत छ, ${translateUserData(loggedUser.name, language)}!`
            );
          }}
          onOpenPrivacyPolicy={() => setIsPrivacyModalOpen(true)}
          onOpenFirebaseDiag={() => setIsFirebaseDiagOpen(true)}
          onOpenApkModal={() => setIsApkModalOpen(true)}
        />

        {/* Screen 3: My Account Modal */}
        {isProfileModalOpen && (
          <Suspense fallback={null}>
            <UserProfileModal
              isOpen={isProfileModalOpen}
              onClose={() => setIsProfileModalOpen(false)}
              user={user}
              language={language}
              onOpenLoginModal={() => {
                setIsProfileModalOpen(false);
                setIsLoginModalOpen(true);
              }}
              onOpenSessionSettings={() => {
                setIsProfileModalOpen(false);
                setIsSessionModalOpen(true);
              }}
              onLogout={() => {
                adminRoleManager.clearRole();
                setUserRole('user');
                setUser(null);
                setAccountEpoch(Date.now());
                setCurrentView('home');
                setIsLoginModalOpen(true);
              }}
              showToast={showToast}
            />
          </Suspense>
        )}

        {/* Screen 5: Dedicated Account & Session Management Modal */}
        {isSessionModalOpen && (
          <Suspense fallback={null}>
            <SessionManagementModal
              isOpen={isSessionModalOpen}
              onClose={() => setIsSessionModalOpen(false)}
              user={user}
              language={language}
              onOpenLoginModal={() => {
                setIsSessionModalOpen(false);
                setIsLoginModalOpen(true);
              }}
              onOpenPrivacyModal={() => {
                setIsPrivacyModalOpen(true);
              }}
              onOpenFirebaseDiag={() => {
                setIsFirebaseDiagOpen(true);
              }}
              onLogout={() => {
                adminRoleManager.clearRole();
                setUserRole('user');
                setUser(null);
                setAccountEpoch(Date.now());
                setCurrentView('home');
                setIsLoginModalOpen(true);
              }}
              showToast={showToast}
            />
          </Suspense>
        )}

        {/* Dedicated Privacy Policy Modal */}
        {isPrivacyModalOpen && (
          <Suspense fallback={null}>
            <PrivacyPolicyModal
              isOpen={isPrivacyModalOpen}
              onClose={() => setIsPrivacyModalOpen(false)}
              language={language}
            />
          </Suspense>
        )}

        {/* Firebase Live Diagnostics & Fix Guide Modal */}
        {isFirebaseDiagOpen && (
          <Suspense fallback={null}>
            <FirebaseDiagnosticModal
              isOpen={isFirebaseDiagOpen}
              onClose={() => setIsFirebaseDiagOpen(false)}
              language={language}
            />
          </Suspense>
        )}

        {/* Offline Status Indicator */}
        <OfflineIndicator language={language} />

        {/* Ephemeral Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-bold py-2 px-4 rounded-full shadow-2xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-150 border border-slate-700">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}
