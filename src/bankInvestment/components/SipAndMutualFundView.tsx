/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Advanced SIP Management & Mutual Fund Portfolio View
 * - SIP: Installment history (Paid/Pending/Missed), Pause/Resume/Stop, Step-up,
 *        Maturity Date (BS+AD), Manual current value & Performance SVG Chart.
 * - MF: Manual NAV vs Optional Verified Live NAV endpoint (no fake live prices),
 *       Exact XIRR, Absolute Return, Redemptions, Additions, & Dividend History.
 */

import React, { useState } from 'react';
import {
  Plus,
  Pause,
  Play,
  Square,
  CheckCircle2,
  Trash2,
  Edit3,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { Currency, Language } from '../../types';
import {
  evaluateMutualFund,
  evaluateSipSummary,
  generateSipSchedule,
  round2,
} from '../calculations';
import { bankDb, makeId } from '../db';
import { adTag, bsTag, formatMoney, getTodayDual, t5 } from '../i18n';
import {
  BankInvestmentDatabase,
  MutualFundCategory,
  MutualFundRecord,
  SipPlanRecord,
} from '../types';
import { ConfirmDialog, DualBSDatePicker } from './ConfirmDialog';
import { GrowthChartSVG } from './SimpleCharts';

interface SipAndMutualFundViewProps {
  db: BankInvestmentDatabase;
  language: Language;
  currency: Currency;
  showToast: (msg: string) => void;
}

export const SipAndMutualFundView: React.FC<SipAndMutualFundViewProps> = ({
  db,
  language,
  currency,
  showToast,
}) => {
  const today = getTodayDual();
  const [subTab, setSubTab] = useState<'sip' | 'mf'>('sip');

  const getSipStatusLabel = (status: string) => {
    if (status === 'active') return t5(language, 'Active', 'सक्रिय', 'चालू', 'सक्रिय', 'सक्रिय');
    if (status === 'paused') return t5(language, 'Paused', 'रोका गया', 'रोकल', 'रोकल', 'रोकिएको');
    if (status === 'stopped') return t5(language, 'Stopped', 'बंद', 'बंद', 'बंद', 'बन्द');
    return status;
  };

  const getInstStatusLabel = (status: string) => {
    if (status === 'paid') return t5(language, 'Paid', 'भुगतान हुआ', 'भुगतान भइल', 'भुगतान भेल', 'भुक्तानी भयो');
    if (status === 'missed') return t5(language, 'Missed', 'छूट गया', 'छूट गइल', 'छूटि गेल', 'छुट्यो');
    return t5(language, 'Pending', 'बाकी', 'बाकी', 'बाँकी', 'बाँकी');
  };

  const getMfCategoryLabel = (cat: MutualFundCategory) => {
    switch (cat) {
      case 'equity':
        return t5(language, 'Equity', 'इक्विटी', 'इक्विटी', 'इक्विटी', 'इक्विटी');
      case 'debt':
        return t5(language, 'Debt', 'डेट (ऋण)', 'डेट (कर्जा)', 'डेट (ऋण)', 'डेट (ऋणपत्र)');
      case 'hybrid':
        return t5(language, 'Hybrid', 'हाइब्रिड', 'हाइब्रिड', 'हाइब्रिड', 'हाइब्रिड');
      case 'index':
        return t5(language, 'Index', 'इंडेक्स', 'इंडेक्स', 'इंडेक्स', 'इन्डेक्स');
      case 'balanced':
        return t5(language, 'Balanced', 'बैलेंस्ड', 'बैलेंस्ड', 'संतुलित', 'सन्तुलित');
      case 'sectoral':
        return t5(language, 'Sectoral', 'सेक्टोरल', 'सेक्टोरल', 'सेक्टोरल', 'क्षेत्रगत');
      case 'tax_saver':
        return t5(language, 'Tax Saver (ELSS)', 'टैक्स सेवर (ELSS)', 'टैक्स सेवर (ELSS)', 'टैक्स सेवर (ELSS)', 'कर बचत (ELSS)');
      default:
        return t5(language, 'Other', 'अन्य', 'बाकी / अन्य', 'अन्य', 'अन्य');
    }
  };

  // --- SIP State ---
  const [selectedSipId, setSelectedSipId] = useState<string | null>(db.sips[0]?.id || null);
  const [showSipForm, setShowSipForm] = useState(false);
  const [editingSipId, setEditingSipId] = useState<string | null>(null);
  const [deleteSipTarget, setDeleteSipTarget] = useState<SipPlanRecord | null>(null);

  const [sipName, setSipName] = useState('');
  const [sipFundName, setSipFundName] = useState('');
  const [sipMonthly, setSipMonthly] = useState<number>(5000);
  const [sipStartBS, setSipStartBS] = useState(today.bsStr);
  const [sipStartAD, setSipStartAD] = useState(today.adStr);
  const [sipDay, setSipDay] = useState<number>(10);
  const [sipDuration, setSipDuration] = useState<number>(60);
  const [sipRate, setSipRate] = useState<number>(12);
  const [sipStepUp, setSipStepUp] = useState<number>(0);
  const [sipManualVal, setSipManualVal] = useState<string>('');
  const [sipNotes, setSipNotes] = useState('');

  // SIP Confirm Payment Modal
  const [confirmSipInst, setConfirmSipInst] = useState<{
    sipId: string;
    installmentNo: number;
    amount: number;
  } | null>(null);
  const [instPaidBS, setInstPaidBS] = useState(today.bsStr);
  const [instPaidAD, setInstPaidAD] = useState(today.adStr);
  const [instPaidAmt, setInstPaidAmt] = useState<number>(5000);
  const [instNav, setInstNav] = useState<string>('');

  // --- Mutual Fund State ---
  const [selectedMfId, setSelectedMfId] = useState<string | null>(db.mutualFunds[0]?.id || null);
  const [showMfForm, setShowMfForm] = useState(false);
  const [editingMfId, setEditingMfId] = useState<string | null>(null);
  const [deleteMfTarget, setDeleteMfTarget] = useState<MutualFundRecord | null>(null);

  const [mfName, setMfName] = useState('');
  const [mfCategory, setMfCategory] = useState<MutualFundCategory>('equity');
  const [mfDateBS, setMfDateBS] = useState(today.bsStr);
  const [mfDateAD, setMfDateAD] = useState(today.adStr);
  const [mfPurchaseNav, setMfPurchaseNav] = useState<number>(10);
  const [mfUnits, setMfUnits] = useState<number>(1000);
  const [mfCurrentNav, setMfCurrentNav] = useState<number>(12.5);
  const [mfNavSource, setMfNavSource] = useState<'manual' | 'verified_live'>('manual');
  const [mfProviderName, setMfProviderName] = useState('');
  const [mfProviderUrl, setMfProviderUrl] = useState('');
  const [mfNotes, setMfNotes] = useState('');

  // MF Tx Action Modal (redeem / dividend / add_units / update_nav)
  const [mfAction, setMfAction] = useState<{
    mf: MutualFundRecord;
    kind: 'redeem' | 'dividend' | 'add' | 'nav';
  } | null>(null);
  const [txDateBS, setTxDateBS] = useState(today.bsStr);
  const [txDateAD, setTxDateAD] = useState(today.adStr);
  const [txVal1, setTxVal1] = useState<number>(0);
  const [txVal2, setTxVal2] = useState<number>(0);
  const [txNote, setTxNote] = useState('');
  const [isFetchingLiveNav, setIsFetchingLiveNav] = useState(false);

  // ---------------- SIP Handlers ----------------
  const openSipCreate = () => {
    setEditingSipId(null);
    setSipName('');
    setSipFundName('');
    setSipMonthly(5000);
    setSipStartBS(today.bsStr);
    setSipStartAD(today.adStr);
    setSipDay(10);
    setSipDuration(60);
    setSipRate(12);
    setSipStepUp(0);
    setSipManualVal('');
    setSipNotes('');
    setShowSipForm(true);
  };

  const openSipEdit = (sip: SipPlanRecord) => {
    setEditingSipId(sip.id);
    setSipName(sip.sipName);
    setSipFundName(sip.fundName);
    setSipMonthly(sip.monthlyInvestment);
    setSipStartBS(sip.startDateBS);
    setSipStartAD(sip.startDateAD);
    setSipDay(sip.sipDay);
    setSipDuration(sip.durationMonths);
    setSipRate(sip.expectedReturnRate);
    setSipStepUp(sip.stepUpPercent);
    setSipManualVal(sip.manualCurrentValue !== undefined ? String(sip.manualCurrentValue) : '');
    setSipNotes(sip.notes || '');
    setShowSipForm(true);
  };

  const handleSaveSip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sipName.trim() || !sipFundName.trim() || sipMonthly <= 0 || sipDuration <= 0) {
      showToast(
        t5(
          language,
          'Enter valid SIP Name, Fund Name, Amount & Duration',
          'मान्य SIP नाम, फंड नाम, राशि और अवधि दर्ज करें',
          'सही SIP नाम, फंड नाम, रकम आ समय लिखीं',
          'मान्य SIP नाम, फंड नाम, राशि आ अवधि लिखू',
          'मान्य SIP नाम, फण्ड नाम, रकम र अवधि लेख्नुहोस्'
        )
      );
      return;
    }
    const existing = editingSipId ? db.sips.find((s) => s.id === editingSipId) : undefined;
    const saved = bankDb.upsertSip({
      id: editingSipId || undefined,
      sipName: sipName.trim(),
      fundName: sipFundName.trim(),
      monthlyInvestment: sipMonthly,
      startDateAD: sipStartAD,
      startDateBS: sipStartBS,
      sipDay: Math.min(31, Math.max(1, sipDay)),
      durationMonths: sipDuration,
      expectedReturnRate: sipRate,
      stepUpPercent: sipStepUp,
      manualCurrentValue: sipManualVal.trim() !== '' ? Number(sipManualVal) : undefined,
      status: existing?.status || 'active',
      installments: existing?.installments || [],
      notes: sipNotes.trim() || undefined,
    });
    setSelectedSipId(saved.id);
    setShowSipForm(false);
    showToast(
      editingSipId
        ? t5(language, 'SIP updated', 'SIP अपडेट हुआ', 'SIP अपडेट भइल', 'SIP अपडेट भेल', 'SIP अपडेट भयो')
        : t5(language, 'SIP created', 'SIP बनाया गया', 'नया SIP बनल', 'नव SIP बनल', 'नयाँ SIP थपियो')
    );
  };

  const handleSipStatusChange = (sip: SipPlanRecord, nextStatus: SipPlanRecord['status']) => {
    bankDb.upsertSip({ ...sip, status: nextStatus });
    const label = getSipStatusLabel(nextStatus);
    showToast(
      t5(
        language,
        `SIP marked ${label}`,
        `SIP की स्थिति "${label}" की गई`,
        `SIP स्थिति "${label}" कइल गइल`,
        `SIP स्थिति "${label}" कएल गेल`,
        `SIP स्थिति "${label}" गरियो`
      )
    );
  };

  const handleConfirmSipPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmSipInst) return;
    const res = bankDb.confirmSipInstallment(confirmSipInst.sipId, confirmSipInst.installmentNo, {
      paidDateAD: instPaidAD,
      paidDateBS: instPaidBS,
      amount: instPaidAmt,
      nav: instNav ? Number(instNav) : undefined,
    });
    if (res.duplicate) {
      showToast(
        t5(
          language,
          'This SIP installment is already confirmed.',
          'यह SIP किस्त पहले ही दर्ज हो चुकी है।',
          'ई SIP किस्त पहिले ही दर्ज हो चुकल बा।',
          'ई SIP किस्त पहिने सँ दर्ज अछि।',
          'यो SIP किस्ता पहिले नै प्रमाणित भइसकेको छ।'
        )
      );
    } else if (res.ok) {
      showToast(
        t5(
          language,
          'SIP installment confirmed as Paid',
          'SIP किस्त भुगतान दर्ज हुई',
          'SIP किस्त भुगतान दर्ज भइल',
          'SIP किस्त भुगतान दर्ज भेल',
          'SIP किस्ता भुक्तानी प्रमाणित भयो'
        )
      );
    }
    setConfirmSipInst(null);
  };

  // ---------------- Mutual Fund Handlers ----------------
  const openMfCreate = () => {
    setEditingMfId(null);
    setMfName('');
    setMfCategory('equity');
    setMfDateBS(today.bsStr);
    setMfDateAD(today.adStr);
    setMfPurchaseNav(10);
    setMfUnits(1000);
    setMfCurrentNav(10);
    setMfNavSource('manual');
    setMfProviderName('');
    setMfProviderUrl('');
    setMfNotes('');
    setShowMfForm(true);
  };

  const openMfEdit = (mf: MutualFundRecord) => {
    setEditingMfId(mf.id);
    setMfName(mf.fundName);
    setMfCategory(mf.category);
    setMfDateBS(mf.investmentDateBS);
    setMfDateAD(mf.investmentDateAD);
    setMfPurchaseNav(mf.purchaseNav);
    setMfUnits(mf.unitsPurchased);
    setMfCurrentNav(mf.currentNav);
    setMfNavSource(mf.navSource);
    setMfProviderName(mf.navProviderName || '');
    setMfProviderUrl(mf.navProviderUrl || '');
    setMfNotes(mf.notes || '');
    setShowMfForm(true);
  };

  const handleSaveMf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfName.trim() || mfPurchaseNav <= 0 || mfUnits <= 0) {
      showToast(
        t5(
          language,
          'Enter valid Fund Name, Purchase NAV & Units',
          'मान्य फंड नाम, खरीद NAV और यूनिट दर्ज करें',
          'सही फंड नाम, खरीद NAV आ यूनिट लिखीं',
          'मान्य फंड नाम, खरीद NAV आ यूनिट लिखू',
          'मान्य फण्ड नाम, खरिद NAV र एकाइ लेख्नुहोस्'
        )
      );
      return;
    }
    const existing = editingMfId ? db.mutualFunds.find((m) => m.id === editingMfId) : undefined;
    const saved = bankDb.upsertMutualFund({
      id: editingMfId || undefined,
      fundName: mfName.trim(),
      category: mfCategory,
      investmentDateBS: mfDateBS,
      investmentDateAD: mfDateAD,
      purchaseNav: mfPurchaseNav,
      unitsPurchased: mfUnits,
      currentNav: mfCurrentNav > 0 ? mfCurrentNav : mfPurchaseNav,
      navSource: mfNavSource,
      navProviderName: mfProviderName.trim() || undefined,
      navProviderUrl: mfProviderUrl.trim() || undefined,
      navLastUpdatedBS: today.bsStr,
      navLastUpdatedAD: today.adStr,
      additions: existing?.additions || [],
      redemptions: existing?.redemptions || [],
      dividends: existing?.dividends || [],
      notes: mfNotes.trim() || undefined,
    });
    setSelectedMfId(saved.id);
    setShowMfForm(false);
    showToast(
      editingMfId
        ? t5(language, 'Mutual Fund updated', 'म्यूचुअल फंड अपडेट हुआ', 'म्यूचुअल फंड अपडेट भइल', 'म्यूचुअल फंड अपडेट भेल', 'म्युचुअल फण्ड अपडेट भयो')
        : t5(language, 'Mutual Fund added', 'म्यूचुअल फंड जोड़ा गया', 'म्यूचुअल फंड जोड़ल गइल', 'म्यूचुअल फंड जोड़ल गेल', 'म्युचुअल फण्ड थपियो')
    );
  };

  const handleMfTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfAction) return;
    const mf = mfAction.mf;
    const evalRes = evaluateMutualFund(mf, today.adStr);

    if (mfAction.kind === 'nav') {
      if (txVal1 <= 0) return;
      bankDb.upsertMutualFund({
        ...mf,
        currentNav: txVal1,
        navSource: 'manual',
        navLastUpdatedAD: today.adStr,
        navLastUpdatedBS: today.bsStr,
      });
      showToast(
        t5(language, 'Manual NAV updated', 'मैनुअल NAV अपडेट हुआ', 'मैनुअल NAV अपडेट भइल', 'मैनुअल NAV अपडेट भेल', 'म्यानुअल NAV अपडेट भयो')
      );
    } else if (mfAction.kind === 'redeem') {
      if (txVal1 <= 0 || txVal2 <= 0) return;
      if (txVal1 > evalRes.remainingUnits + 0.0001) {
        showToast(
          t5(
            language,
            `Cannot redeem more than remaining ${evalRes.remainingUnits} units`,
            `शेष ${evalRes.remainingUnits} यूनिट से अधिक नहीं भुनाया जा सकता`,
            `बचल ${evalRes.remainingUnits} यूनिट से बेसी नइखे निकाल सकत`,
            `शेष ${evalRes.remainingUnits} यूनिट सँ बेसी नहि भुना सकैत छी`,
            `बाँकी ${evalRes.remainingUnits} युनिटभन्दा बढी निकाल्न मिल्दैन`
          )
        );
        return;
      }
      bankDb.upsertMutualFund({
        ...mf,
        redemptions: [
          ...mf.redemptions,
          {
            id: makeId('mfr'),
            dateBS: txDateBS,
            dateAD: txDateAD,
            unitsRedeemed: txVal1,
            redemptionNav: txVal2,
            amountReceived: round2(txVal1 * txVal2),
            note: txNote.trim() || undefined,
            createdAt: Date.now(),
          },
        ],
      });
      showToast(
        t5(language, 'Redemption logged', 'निकासी दर्ज हुई', 'यूनिट निकासी दर्ज भइल', 'यूनिट निकासी दर्ज भेल', 'एकाइ बिक्री दर्ता भयो')
      );
    } else if (mfAction.kind === 'dividend') {
      if (txVal1 <= 0) return;
      bankDb.upsertMutualFund({
        ...mf,
        dividends: [
          ...mf.dividends,
          {
            id: makeId('mfd'),
            dateBS: txDateBS,
            dateAD: txDateAD,
            amount: txVal1,
            note: txNote.trim() || undefined,
            createdAt: Date.now(),
          },
        ],
      });
      showToast(
        t5(language, 'Dividend payout recorded', 'लाभांश भुगतान दर्ज हुआ', 'लाभांश भुगतान दर्ज भइल', 'लाभांश भुगतान दर्ज भेल', 'लाभांश भुक्तानी दर्ता भयो')
      );
    } else if (mfAction.kind === 'add') {
      if (txVal1 <= 0 || txVal2 <= 0) return;
      bankDb.upsertMutualFund({
        ...mf,
        additions: [
          ...mf.additions,
          {
            id: makeId('mfa'),
            dateBS: txDateBS,
            dateAD: txDateAD,
            amount: round2(txVal1 * txVal2),
            units: txVal1,
            nav: txVal2,
            note: txNote.trim() || undefined,
            createdAt: Date.now(),
          },
        ],
      });
      showToast(
        t5(language, 'Additional purchase logged', 'अतिरिक्त खरीद दर्ज हुई', 'अतिरिक्त खरीद दर्ज भइल', 'अतिरिक्त खरीद दर्ज भेल', 'थप खरिद दर्ता भयो')
      );
    }

    setMfAction(null);
    setTxNote('');
  };

  const handleFetchVerifiedLiveNav = async (mf: MutualFundRecord) => {
    if (!mf.navProviderUrl) {
      showToast(
        t5(
          language,
          'Configure a verified JSON NAV provider URL in Edit Fund first (or update Manual NAV).',
          'पहले फंड संपादित करके सत्यापित JSON NAV URL डालें (या मैनुअल NAV अपडेट करें)।',
          'पहिले फंड संपादित करके सत्यापित JSON NAV URL डालीं (या मैनुअल NAV बदलीं)।',
          'पहिने फंड संपादित कय सत्यापित JSON NAV URL डालू (वा मैनुअल NAV अपडेट करू)।',
          'पहिले फण्ड सम्पादन गरी प्रमाणित JSON NAV URL राख्नुहोस् (वा म्यानुअल NAV अपडेट गर्नुहोस्)।'
        )
      );
      return;
    }
    setIsFetchingLiveNav(true);
    try {
      const resp = await fetch(mf.navProviderUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      const rawNav =
        json?.nav ??
        json?.currentNav ??
        json?.data?.[0]?.nav ??
        json?.scheme?.nav;
      const parsedNav = Number(rawNav);
      if (!Number.isFinite(parsedNav) || parsedNav <= 0) {
        throw new Error('NAV field not found in provider JSON');
      }
      bankDb.upsertMutualFund({
        ...mf,
        currentNav: parsedNav,
        navSource: 'verified_live',
        navLastUpdatedAD: today.adStr,
        navLastUpdatedBS: today.bsStr,
      });
      showToast(
        t5(
          language,
          `Verified Live NAV updated: ${parsedNav}`,
          `सत्यापित लाइव NAV अपडेट हुआ: ${parsedNav}`,
          `सत्यापित लाइव NAV अपडेट भइल: ${parsedNav}`,
          `सत्यापित लाइव NAV अपडेट भेल: ${parsedNav}`,
          `प्रमाणित लाइभ NAV अपडेट भयो: ${parsedNav}`
        )
      );
    } catch {
      showToast(
        t5(
          language,
          'Live NAV fetch failed (offline or CORS). Update Manual NAV instead.',
          'लाइव NAV प्राप्त नहीं हो सका (ऑफलाइन या CORS)। कृपया मैनुअल NAV अपडेट करें।',
          'लाइव NAV नइखे मिल पावल (ऑफलाइन भा CORS)। मैनुअल NAV अपडेट करीं।',
          'लाइव NAV नहि भेटल (ऑफलाइन वा CORS)। कृपया मैनुअल NAV अपडेट करू।',
          'लाइभ NAV ल्याउन असफल (अफलाइन वा CORS)। म्यानुअल NAV अपडेट गर्नुहोस्।'
        )
      );
    } finally {
      setIsFetchingLiveNav(false);
    }
  };

  const activeSip = db.sips.find((s) => s.id === selectedSipId) || db.sips[0] || null;
  const activeSipSchedule = activeSip
    ? generateSipSchedule(
        activeSip.startDateBS,
        activeSip.sipDay,
        activeSip.monthlyInvestment,
        activeSip.durationMonths,
        activeSip.stepUpPercent,
        activeSip.installments,
        today.adStr,
        activeSip.status
      )
    : [];
  const activeSipEval = activeSip
    ? evaluateSipSummary({ ...activeSip, installments: activeSipSchedule }, today.adStr)
    : null;

  const activeMf = db.mutualFunds.find((m) => m.id === selectedMfId) || db.mutualFunds[0] || null;
  const activeMfEval = activeMf ? evaluateMutualFund(activeMf, today.adStr) : null;

  const moShort = t5(language, 'mo', 'माह', 'महीना', 'माह', 'महिना');
  const unitsWord = t5(language, 'units', 'यूनिट', 'यूनिट', 'यूनिट', 'युनिट');
  const cancelTxt = t5(language, 'Cancel', 'रद्द करें', 'रद्द करीं', 'रद्द करू', 'रद्द गर्नुहोस्');

  return (
    <div className="space-y-4">
      {/* Sub-navigation Switch */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('sip')}
            className={`min-h-[40px] px-4 rounded-xl text-xs font-bold cursor-pointer transition ${
              subTab === 'sip' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t5(language, `SIP Plans (${db.sips.length})`, `SIP योजना (${db.sips.length})`, `SIP योजना (${db.sips.length})`, `SIP योजना (${db.sips.length})`, `SIP योजना (${db.sips.length})`)}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('mf')}
            className={`min-h-[40px] px-4 rounded-xl text-xs font-bold cursor-pointer transition ${
              subTab === 'mf' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t5(language, `Mutual Funds (${db.mutualFunds.length})`, `म्यूचुअल फंड (${db.mutualFunds.length})`, `म्यूचुअल फंड (${db.mutualFunds.length})`, `म्यूचुअल फंड (${db.mutualFunds.length})`, `म्युचुअल फण्ड (${db.mutualFunds.length})`)}
          </button>
        </div>

        <button
          type="button"
          onClick={subTab === 'sip' ? openSipCreate : openMfCreate}
          className="min-h-[40px] px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>
            {subTab === 'sip'
              ? t5(language, 'Add SIP Plan', 'SIP योजना जोड़ें', 'नया SIP जोड़ीं', 'नव SIP जोड़ू', 'SIP योजना थप्नुहोस्')
              : t5(language, 'Add Mutual Fund', 'म्यूचुअल फंड जोड़ें', 'म्यूचुअल फंड जोड़ीं', 'म्यूचुअल फंड जोड़ू', 'म्युचुअल फण्ड थप्नुहोस्')}
          </span>
        </button>
      </div>

      {/* ===================== SECTION A: SIP MANAGEMENT ===================== */}
      {subTab === 'sip' && (
        <>
          {showSipForm && (
            <form onSubmit={handleSaveSip} className="bg-white rounded-2xl border border-blue-200 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">
                  {editingSipId
                    ? t5(language, 'Edit SIP Plan', 'SIP योजना संपादित करें', 'SIP योजना बदलीं', 'SIP योजना संपादित करू', 'SIP योजना सम्पादन गर्नुहोस्')
                    : t5(language, 'New SIP Plan', 'नई SIP योजना', 'नया SIP योजना', 'नव SIP योजना', 'नयाँ SIP योजना')}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSipForm(false)}
                  className="text-xs font-semibold text-slate-500 cursor-pointer"
                >
                  {cancelTxt}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t5(language, 'SIP Name *', 'SIP नाम *', 'SIP नाम *', 'SIP नाम *', 'SIP नाम *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={sipName}
                    onChange={(e) => setSipName(e.target.value)}
                    placeholder={t5(language, 'e.g. Retirement SIP', 'जैसे रिटायरमेंट SIP', 'जइसे रिटायरमेंट SIP', 'जेना सेवानिवृत्ति SIP', 'जस्तै अवकाश SIP')}
                    className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t5(language, 'Fund Name *', 'फंड नाम *', 'फंड नाम *', 'फंड नाम *', 'फण्ड नाम *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={sipFundName}
                    onChange={(e) => setSipFundName(e.target.value)}
                    placeholder={t5(language, 'e.g. NIBL Sahabhagita Fund', 'जैसे NIBL सहभागिता फंड', 'जइसे NIBL सहभागिता फंड', 'जेना NIBL सहभागिता फंड', 'जस्तै NIBL सहभागिता फण्ड')}
                    className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t5(language, 'Monthly Investment *', 'मासिक निवेश *', 'महीनावार निवेश *', 'मासिक निवेश *', 'मासिक लगानी *')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={sipMonthly}
                    onChange={(e) => setSipMonthly(Number(e.target.value))}
                    className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t5(language, 'SIP Debit Day (1-31)', 'SIP कटौती दिन (1-31)', 'SIP कटे के तारीख (1-31)', 'SIP कटौती दिन (1-31)', 'SIP काटिने दिन (१-३१)')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={sipDay}
                    onChange={(e) => setSipDay(Number(e.target.value))}
                    className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t5(language, 'Duration (Months)', 'अवधि (माह)', 'अवधि (महीना)', 'अवधि (माह)', 'अवधि (महिना)')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={sipDuration}
                    onChange={(e) => setSipDuration(Number(e.target.value))}
                    className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t5(language, 'Expected Return (% Assumed)', 'अपेक्षित रिटर्न (% अनुमानित)', 'उम्मीद रिटर्न (% अनुमानित)', 'अपेक्षित रिटर्न (% अनुमानित)', 'अपेक्षित प्रतिफल (% अनुमानित)')}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={sipRate}
                    onChange={(e) => setSipRate(Number(e.target.value))}
                    className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t5(language, 'Annual Step-Up (%)', 'वार्षिक बढ़ोतरी (%)', 'सालाना बढ़ोतरी (%)', 'वार्षिक बढ़ोतरी (%)', 'वार्षिक वृद्धि (%)')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={sipStepUp}
                    onChange={(e) => setSipStepUp(Number(e.target.value))}
                    className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t5(language, 'Current Value (Manual Entry)', 'वर्तमान मूल्य (मैनुअल)', 'अभी के मूल्य (मैनुअल)', 'वर्तमान मूल्य (मैनुअल)', 'हालको मूल्य (म्यानुअल)')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={sipManualVal}
                    onChange={(e) => setSipManualVal(e.target.value)}
                    placeholder={t5(language, 'Optional manual market value', 'वैकल्पिक बाजार मूल्य', 'चाहीं त बाजार मूल्य लिखीं', 'वैकल्पिक बाजार मूल्य', 'ऐच्छिक बजार मूल्य')}
                    className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                  />
                </div>
              </div>
              <DualBSDatePicker
                label={t5(language, 'SIP Start Date', 'SIP शुरू तारीख', 'SIP शुरू तारीख', 'SIP प्रारंभ तिथि', 'SIP सुरु मिति')}
                language={language}
                bsDate={sipStartBS}
                adDate={sipStartAD}
                onChange={(b, a) => {
                  setSipStartBS(b);
                  setSipStartAD(a);
                }}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSipForm(false)}
                  className="min-h-[40px] px-4 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
                >
                  {cancelTxt}
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-5 rounded-xl bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  {editingSipId
                    ? t5(language, 'Update SIP', 'SIP अपडेट करें', 'SIP अपडेट करीं', 'SIP अपडेट करू', 'SIP अपडेट गर्नुहोस्')
                    : t5(language, 'Create SIP', 'SIP बनाएं', 'SIP बनाईं', 'SIP बनाउ', 'SIP थप्नुहोस्')}
                </button>
              </div>
            </form>
          )}

          {db.sips.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <TrendingUp className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-800">
                {t5(language, 'No SIP Plans Yet', 'अभी कोई SIP योजना नहीं है', 'अभी कोई SIP योजना नइखे', 'एखन धरि कोनो SIP योजना नहि अछि', 'अहिलेसम्म कुनै SIP योजना छैन')}
              </div>
              <p className="text-xs text-slate-500">
                {t5(
                  language,
                  'Create an open-ended or step-up SIP plan to track paid/pending/missed installments and performance.',
                  'भुगतान, बकाया व छूटी किस्तों तथा रिटर्न को ट्रैक करने के लिए एक SIP योजना बनाएं।',
                  'भुगतान, बाकी आ छूटल किस्त आ रिटर्न के हिसाब राखे खातिर एगो SIP योजना बनाईं।',
                  'भुगतान, बाँकी आ छूटल किस्त तथा रिटर्न ट्रैक करबाक लेल एकटा SIP योजना बनाउ।',
                  'भुक्तानी, बाँकी र छुटेका किस्ता तथा प्रतिफल ट्र्याक गर्न नयाँ SIP योजना थप्नुहोस्।'
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-4 space-y-2">
                {db.sips.map((sip) => {
                  const sched = generateSipSchedule(
                    sip.startDateBS,
                    sip.sipDay,
                    sip.monthlyInvestment,
                    sip.durationMonths,
                    sip.stepUpPercent,
                    sip.installments,
                    today.adStr,
                    sip.status
                  );
                  const evalS = evaluateSipSummary({ ...sip, installments: sched }, today.adStr);
                  const active = activeSip?.id === sip.id;
                  return (
                    <div
                      key={sip.id}
                      onClick={() => setSelectedSipId(sip.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                        active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{sip.sipName}</div>
                          <div className={`text-[11px] truncate ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                            {sip.fundName}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                            sip.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {getSipStatusLabel(sip.status)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs tabular-nums">
                        <span>{formatMoney(sip.monthlyInvestment, currency, language)}/{moShort}</span>
                        <span>
                          {evalS.paidCount}/{sip.durationMonths} {t5(language, 'paid', 'भुगतान', 'भरल', 'भुगतान', 'भुक्तान')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {activeSip && activeSipEval && (
                <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{activeSip.sipName}</h3>
                      <div className="text-xs text-slate-500 tabular-nums">
                        {activeSip.fundName} • {t5(language, 'Maturity', 'परिपक्वता', 'पूरा तारीख', 'परिपक्वता', 'परिपक्वता')}:{' '}
                        {activeSipEval.maturityDateBS} {bsTag(language)} ({activeSipEval.maturityDateAD} {adTag(language)})
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {activeSip.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => handleSipStatusChange(activeSip, 'paused')}
                          className="min-h-[36px] px-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>{t5(language, 'Pause', 'रोकें', 'रोकीं', 'रोकू', 'रोक्नुहोस्')}</span>
                        </button>
                      )}
                      {activeSip.status === 'paused' && (
                        <button
                          type="button"
                          onClick={() => handleSipStatusChange(activeSip, 'active')}
                          className="min-h-[36px] px-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>{t5(language, 'Resume', 'शुरू करें', 'फिर चालू करीं', 'फेरु शुरू करू', 'पुनः सुरु')}</span>
                        </button>
                      )}
                      {activeSip.status !== 'stopped' && (
                        <button
                          type="button"
                          onClick={() => handleSipStatusChange(activeSip, 'stopped')}
                          className="min-h-[36px] px-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>{t5(language, 'Stop', 'बंद करें', 'बंद करीं', 'बंद करू', 'बन्द गर्नुहोस्')}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openSipEdit(activeSip)}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteSipTarget(activeSip)}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border border-rose-200 text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500">
                        {t5(language, 'Actual Invested', 'कुल वास्तविक निवेश', 'असली जमा रकम', 'वास्तविक निवेश', 'वास्तविक लगानी')}
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 tabular-nums">
                        {formatMoney(activeSipEval.actualInvestedAmount, currency, language)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500">
                        {activeSip.manualCurrentValue !== undefined
                          ? t5(language, 'Current Value (Manual)', 'वर्तमान मूल्य (मैनुअल)', 'अभी के मूल्य (मैनुअल)', 'वर्तमान मूल्य (मैनुअल)', 'हालको मूल्य (म्यानुअल)')
                          : t5(language, 'Est. Value (@Assumed)', 'अनुमानित मूल्य', 'अनुमानित मूल्य', 'अनुमानित मूल्य', 'अनुमानित मूल्य')}
                      </div>
                      <div className="text-sm font-extrabold text-blue-700 tabular-nums">
                        {formatMoney(activeSipEval.displayCurrentValue, currency, language)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500">
                        {t5(language, 'Profit / Loss', 'लाभ / हानि', 'फायदा / घाटा', 'लाभ / हानि', 'नाफा / नोक्सान')}
                      </div>
                      <div
                        className={`text-sm font-extrabold tabular-nums ${
                          activeSipEval.profitLoss >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {formatMoney(activeSipEval.profitLoss, currency, language)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500">
                        {t5(language, 'Projected Maturity', 'अनुमानित परिपक्वता', 'अनुमानित पूरा रकम', 'अनुमानित परिपक्वता', 'अनुमानित परिपक्वता')}
                      </div>
                      <div className="text-sm font-bold text-slate-900 tabular-nums">
                        {formatMoney(activeSipEval.projectedValueAtMaturity, currency, language)}
                      </div>
                    </div>
                  </div>

                  {/* SIP Performance Chart */}
                  <GrowthChartSVG
                    data={activeSipEval.chartData}
                    investedLabel={t5(language, 'Cumulative Invested', 'कुल जमा निवेश', 'कुल जमा रकम', 'कुल संचयी निवेश', 'कुल जम्मा लगानी')}
                    valueLabel={`${t5(language, 'Projected', 'अनुमानित', 'अनुमानित', 'अनुमानित', 'अनुमानित')} @${activeSip.expectedReturnRate}%`}
                  />

                  {/* Installment History */}
                  <div>
                    <div className="text-xs font-bold text-slate-900 mb-2">
                      {t5(language, 'Installment Schedule', 'किस्त तालिका', 'किस्त के तालिका', 'किस्त तालिका', 'किस्ता तालिका')} (
                      {activeSipEval.paidCount} {t5(language, 'Paid', 'भुगतान', 'भरल', 'भुगतान', 'भुक्तान')} •{' '}
                      {activeSipEval.missedCount} {t5(language, 'Missed', 'छूटी', 'छूटल', 'छूटल', 'छुटेको')} •{' '}
                      {activeSipEval.pendingCount} {t5(language, 'Pending', 'बाकी', 'बाकी', 'बाँकी', 'बाँकी')})
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[280px] overflow-y-auto">
                      <table className="w-full text-[11px] text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 font-bold text-slate-600">
                          <tr>
                            <th className="py-2 px-2.5">#</th>
                            <th className="py-2 px-2.5">
                              {t5(
                                language,
                                `Due Date ${bsTag(language)} (${adTag(language)})`,
                                `देय तारीख ${bsTag(language)} (${adTag(language)})`,
                                `देय तारीख ${bsTag(language)} (${adTag(language)})`,
                                `देय तिथि ${bsTag(language)} (${adTag(language)})`,
                                `भुक्तानी मिति ${bsTag(language)} (${adTag(language)})`
                              )}
                            </th>
                            <th className="py-2 px-2.5 text-right">{t5(language, 'Amount', 'राशि', 'रकम', 'राशि', 'रकम')}</th>
                            <th className="py-2 px-2.5 text-center">{t5(language, 'Status', 'स्थिति', 'स्थिति', 'स्थिति', 'स्थिति')}</th>
                            <th className="py-2 px-2.5 text-right">{t5(language, 'Action', 'कार्य', 'काम', 'कार्य', 'कार्य')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 tabular-nums">
                          {activeSipSchedule.map((inst) => (
                            <tr key={inst.installmentNo}>
                              <td className="py-2 px-2.5 font-bold">{inst.installmentNo}</td>
                              <td className="py-2 px-2.5">
                                <span className="font-semibold">{inst.dueDateBS}</span>{' '}
                                <span className="text-slate-400">({inst.dueDateAD})</span>
                              </td>
                              <td className="py-2 px-2.5 text-right font-bold">
                                {formatMoney(inst.amount, currency, language)}
                              </td>
                              <td className="py-2 px-2.5 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                                    inst.status === 'paid'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : inst.status === 'missed'
                                      ? 'bg-rose-50 text-rose-700'
                                      : 'bg-amber-50 text-amber-800'
                                  }`}
                                >
                                  {getInstStatusLabel(inst.status)}
                                </span>
                              </td>
                              <td className="py-2 px-2.5 text-right">
                                {inst.confirmedByUser ? (
                                  <span className="text-[10px] text-slate-500">
                                    {t5(language, 'Paid', 'भुगतान', 'भरल', 'भुगतान', 'भुक्तान')} {inst.paidDateBS}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setConfirmSipInst({
                                        sipId: activeSip.id,
                                        installmentNo: inst.installmentNo,
                                        amount: inst.amount,
                                      });
                                      setInstPaidAmt(inst.amount);
                                      setInstPaidBS(today.bsStr);
                                      setInstPaidAD(today.adStr);
                                      setInstNav('');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] cursor-pointer"
                                  >
                                    {t5(language, 'Confirm Paid', 'भुगतान दर्ज करें', 'भुगतान पक्का करीं', 'भुगतान दर्ज करू', 'भुक्तान पक्का गर्नुहोस्')}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ===================== SECTION B: MUTUAL FUND PORTFOLIO ===================== */}
      {subTab === 'mf' && (
        <>
          {showMfForm && (
            <form onSubmit={handleSaveMf} className="bg-white rounded-2xl border border-blue-200 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">
                  {editingMfId
                    ? t5(language, 'Edit Mutual Fund Holding', 'म्यूचुअल फंड संपादित करें', 'म्यूचुअल फंड बदलीं', 'म्यूचुअल फंड संपादित करू', 'म्युचुअल फण्ड सम्पादन गर्नुहोस्')
                    : t5(language, 'Add Mutual Fund Holding', 'नया म्यूचुअल फंड जोड़ें', 'नया म्यूचुअल फंड जोड़ीं', 'नव म्यूचुअल फंड जोड़ू', 'नयाँ म्युचुअल फण्ड थप्नुहोस्')}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMfForm(false)}
                  className="text-xs font-semibold text-slate-500 cursor-pointer"
                >
                  {cancelTxt}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t5(language, 'Fund Name *', 'फंड नाम *', 'फंड नाम *', 'फंड नाम *', 'फण्ड नाम *')}
                  </label>
                  <input
                    type="text"
                    required
                    value={mfName}
                    onChange={(e) => setMfName(e.target.value)}
                    placeholder={t5(language, 'e.g. Nabil Flexi Cap Fund', 'जैसे Nabil Flexi Cap फंड', 'जइसे Nabil Flexi Cap फंड', 'जेना Nabil Flexi Cap फंड', 'जस्तै Nabil Flexi Cap फण्ड')}
                    className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t5(language, 'Fund Category', 'फंड श्रेणी', 'फंड के श्रेणी', 'फंड श्रेणी', 'फण्ड श्रेणी')}
                  </label>
                  <select
                    value={mfCategory}
                    onChange={(e) => setMfCategory(e.target.value as MutualFundCategory)}
                    className="w-full min-h-[40px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    <option value="equity">{getMfCategoryLabel('equity')}</option>
                    <option value="debt">{getMfCategoryLabel('debt')}</option>
                    <option value="hybrid">{getMfCategoryLabel('hybrid')}</option>
                    <option value="index">{getMfCategoryLabel('index')}</option>
                    <option value="balanced">{getMfCategoryLabel('balanced')}</option>
                    <option value="sectoral">{getMfCategoryLabel('sectoral')}</option>
                    <option value="tax_saver">{getMfCategoryLabel('tax_saver')}</option>
                    <option value="other">{getMfCategoryLabel('other')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t5(language, 'Purchase NAV *', 'खरीद NAV *', 'खरीद NAV *', 'खरीद NAV *', 'खरिद NAV *')}
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min={0.01}
                    required
                    value={mfPurchaseNav}
                    onChange={(e) => setMfPurchaseNav(Number(e.target.value))}
                    className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t5(language, 'Units Purchased *', 'खरीदे गए यूनिट *', 'कीनल गइल यूनिट *', 'कीनल गेल यूनिट *', 'खरिद गरिएको युनिट *')}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min={0.001}
                    required
                    value={mfUnits}
                    onChange={(e) => setMfUnits(Number(e.target.value))}
                    className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t5(language, 'Current NAV (Manual Entry)', 'वर्तमान NAV (मैनुअल)', 'अभी के NAV (मैनुअल)', 'वर्तमान NAV (मैनुअल)', 'हालको NAV (म्यानुअल)')}
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min={0.01}
                    value={mfCurrentNav}
                    onChange={(e) => {
                      setMfCurrentNav(Number(e.target.value));
                      setMfNavSource('manual');
                    }}
                    className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t5(language, 'Verified Live NAV JSON URL (Optional)', 'सत्यापित लाइव NAV JSON URL (वैकल्पिक)', 'लाइव NAV JSON URL (चाहीं त)', 'सत्यापित लाइव NAV JSON URL (वैकल्पिक)', 'प्रमाणित लाइभ NAV JSON URL (ऐच्छिक)')}
                  </label>
                  <input
                    type="url"
                    value={mfProviderUrl}
                    onChange={(e) => setMfProviderUrl(e.target.value)}
                    placeholder="https://api.mfapi.in/mf/..."
                    className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
              <DualBSDatePicker
                label={t5(language, 'Initial Investment Date', 'प्रारंभिक निवेश तारीख', 'शुरुआती निवेश तारीख', 'प्रारंभिक निवेश तिथि', 'सुरुवाती लगानी मिति')}
                language={language}
                bsDate={mfDateBS}
                adDate={mfDateAD}
                onChange={(b, a) => {
                  setMfDateBS(b);
                  setMfDateAD(a);
                }}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMfForm(false)}
                  className="min-h-[40px] px-4 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
                >
                  {cancelTxt}
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-5 rounded-xl bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  {editingMfId
                    ? t5(language, 'Update Fund', 'फंड अपडेट करें', 'फंड अपडेट करीं', 'फंड अपडेट करू', 'फण्ड अपडेट गर्नुहोस्')
                    : t5(language, 'Save Fund', 'फंड सेव करें', 'फंड सेव करीं', 'फंड सुरक्षित करू', 'फण्ड सुरक्षित गर्नुहोस्')}
                </button>
              </div>
            </form>
          )}

          {db.mutualFunds.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <TrendingUp className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-800">
                {t5(language, 'No Mutual Fund Holdings Recorded', 'कोई म्यूचुअल फंड दर्ज नहीं है', 'अभी कोई म्यूचुअल फंड दर्ज नइखे', 'कोनो म्यूचुअल फंड दर्ज नहि अछि', 'कुनै म्युचुअल फण्ड दर्ता गरिएको छैन')}
              </div>
              <p className="text-xs text-slate-500">
                {t5(
                  language,
                  'Add your Mutual Funds with purchase NAV, units, manual or verified NAV updates, redemptions, dividends, and XIRR calculation.',
                  'खरीद NAV, यूनिट, मैनुअल/लाइव NAV, निकासी, लाभांश और XIRR की गणना के लिए अपना म्यूचुअल फंड जोड़ें।',
                  'खरीद NAV, यूनिट, निकासी, लाभांश आ XIRR के हिसाब राखे खातिर आपन म्यूचुअल फंड जोड़ीं।',
                  'खरीद NAV, यूनिट, निकासी, लाभांश आ XIRR गणना लेल अपन म्यूचुअल फंड जोड़ू।',
                  'खरिद NAV, युनिट, म्यानुअल वा प्रमाणित NAV, बिक्री, लाभांश र XIRR हिसाबका लागि म्युचुअल फण्ड थप्नुहोस्।'
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-4 space-y-2">
                {db.mutualFunds.map((mf) => {
                  const ev = evaluateMutualFund(mf, today.adStr);
                  const active = activeMf?.id === mf.id;
                  return (
                    <div
                      key={mf.id}
                      onClick={() => setSelectedMfId(mf.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                        active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{mf.fundName}</div>
                          <div className={`text-[11px] uppercase ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                            {getMfCategoryLabel(mf.category)} • {ev.remainingUnits} {unitsWord}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                          {mf.navSource === 'verified_live'
                            ? t5(language, 'Verified NAV', 'लाइव NAV', 'लाइव NAV', 'सत्यापित NAV', 'प्रमाणित NAV')
                            : t5(language, 'Manual NAV', 'मैनुअल NAV', 'मैनुअल NAV', 'मैनुअल NAV', 'म्यानुअल NAV')}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs tabular-nums">
                        <span className="font-bold">{formatMoney(ev.currentMarketValue, currency, language)}</span>
                        <span className={ev.totalProfitLoss >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {ev.absoluteReturnPercent >= 0 ? '+' : ''}
                          {ev.absoluteReturnPercent}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {activeMf && activeMfEval && (
                <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{activeMf.fundName}</h3>
                      <div className="text-xs text-slate-500 tabular-nums">
                        NAV: {activeMf.currentNav} (
                        {activeMf.navSource === 'verified_live'
                          ? t5(language, 'Verified Live NAV', 'सत्यापित लाइव NAV', 'सत्यापित लाइव NAV', 'सत्यापित लाइव NAV', 'प्रमाणित लाइभ NAV')
                          : t5(language, 'Manual NAV', 'मैनुअल NAV', 'मैनुअल NAV', 'मैनुअल NAV', 'म्यानुअल NAV')}
                        ) • {t5(language, 'Updated', 'अपडेट', 'अपडेट', 'अपडेट', 'अपडेट')}{' '}
                        {activeMf.navLastUpdatedBS} {bsTag(language)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setTxVal1(activeMf.currentNav);
                          setMfAction({ mf: activeMf, kind: 'nav' });
                        }}
                        className="min-h-[36px] px-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold cursor-pointer"
                      >
                        {t5(language, 'Update Manual NAV', 'मैनुअल NAV अपडेट करें', 'मैनुअल NAV बदलीं', 'मैनुअल NAV अपडेट करू', 'म्यानुअल NAV अपडेट')}
                      </button>
                      {activeMf.navProviderUrl && (
                        <button
                          type="button"
                          disabled={isFetchingLiveNav}
                          onClick={() => handleFetchVerifiedLiveNav(activeMf)}
                          className="min-h-[36px] px-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLiveNav ? 'animate-spin' : ''}`} />
                          <span>{t5(language, 'Sync Verified NAV', 'लाइव NAV सिंक करें', 'लाइव NAV मिलाईं', 'लाइव NAV सिंक करू', 'लाइभ NAV सिङ्क')}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setTxVal1(100);
                          setTxVal2(activeMf.currentNav);
                          setMfAction({ mf: activeMf, kind: 'add' });
                        }}
                        className="min-h-[36px] px-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold cursor-pointer"
                      >
                        + {t5(language, 'Buy Units', 'यूनिट खरीदें', 'यूनिट कीनीं', 'यूनिट कीनू', 'युनिट किन्नुहोस्')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTxVal1(Math.min(100, activeMfEval.remainingUnits));
                          setTxVal2(activeMf.currentNav);
                          setMfAction({ mf: activeMf, kind: 'redeem' });
                        }}
                        className="min-h-[36px] px-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold cursor-pointer"
                      >
                        {t5(language, 'Redeem', 'निकासी / बेचें', 'बेचीं / निकालीं', 'निकासी / बेचू', 'बिक्री / निकासी')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTxVal1(500);
                          setMfAction({ mf: activeMf, kind: 'dividend' });
                        }}
                        className="min-h-[36px] px-2.5 rounded-xl bg-cyan-50 text-cyan-800 border border-cyan-200 text-xs font-bold cursor-pointer"
                      >
                        + {t5(language, 'Dividend', 'लाभांश', 'लाभांश', 'लाभांश', 'लाभांश')}
                      </button>
                      <button
                        type="button"
                        onClick={() => openMfEdit(activeMf)}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteMfTarget(activeMf)}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border border-rose-200 text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500">
                        {t5(language, 'Total Invested', 'कुल निवेश', 'कुल जमा निवेश', 'कुल निवेश', 'कुल लगानी')}
                      </div>
                      <div className="text-sm font-bold text-slate-900 tabular-nums">
                        {formatMoney(activeMfEval.totalInvestedOutflow, currency, language)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500">
                        {t5(language, 'Current Value', 'वर्तमान मूल्य', 'अभी के मूल्य', 'वर्तमान मूल्य', 'हालको मूल्य')}
                      </div>
                      <div className="text-sm font-extrabold text-blue-700 tabular-nums">
                        {formatMoney(activeMfEval.currentMarketValue, currency, language)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500">
                        {t5(language, 'Total Profit / Loss', 'कुल लाभ / हानि', 'कुल फायदा / घाटा', 'कुल लाभ / हानि', 'कुल नाफा / नोक्सान')}
                      </div>
                      <div
                        className={`text-sm font-extrabold tabular-nums ${
                          activeMfEval.totalProfitLoss >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {formatMoney(activeMfEval.totalProfitLoss, currency, language)} ({activeMfEval.absoluteReturnPercent}%)
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500">
                        {t5(language, 'Annualized XIRR', 'वार्षिक XIRR', 'सालाना XIRR', 'वार्षिक XIRR', 'वार्षिक XIRR')}
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 tabular-nums">
                        {activeMfEval.xirrPercent !== null
                          ? `${activeMfEval.xirrPercent}% p.a.`
                          : t5(language, 'Need >1 dated cashflow', '1 से अधिक लेनदेन चाहिए', 'कम से कम 2 लेनदेन चाहीं', '1 सँ अधिक लेनदेन चाही', 'कम्तिमा २ कारोबार चाहिन्छ')}
                      </div>
                    </div>
                  </div>

                  {/* Redemption & Dividend Histories */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="font-bold text-slate-800">
                        {t5(language, 'Redemption History', 'निकासी इतिहास', 'बिक्री / निकासी इतिहास', 'निकासी इतिहास', 'बिक्री इतिहास')} ({activeMf.redemptions.length})
                      </div>
                      {activeMf.redemptions.length === 0 ? (
                        <div className="text-[11px] text-slate-400">
                          {t5(language, 'No redemptions recorded.', 'कोई निकासी दर्ज नहीं है।', 'अभी कवनो निकासी नइखे।', 'कोनो निकासी दर्ज नहि अछि।', 'कुनै बिक्री दर्ता छैन।')}
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {activeMf.redemptions.map((r) => (
                            <div key={r.id} className="py-1.5 flex justify-between tabular-nums">
                              <span>
                                {r.dateBS} {bsTag(language)} • {r.unitsRedeemed}u @ {r.redemptionNav}
                              </span>
                              <span className="font-bold text-emerald-700">
                                +{formatMoney(r.amountReceived, currency, language)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="font-bold text-slate-800">
                        {t5(language, 'Dividend History', 'लाभांश इतिहास', 'लाभांश इतिहास', 'लाभांश इतिहास', 'लाभांश इतिहास')} ({activeMf.dividends.length})
                      </div>
                      {activeMf.dividends.length === 0 ? (
                        <div className="text-[11px] text-slate-400">
                          {t5(language, 'No dividends recorded.', 'कोई लाभांश दर्ज नहीं है।', 'अभी कवनो लाभांश नइखे।', 'कोनो लाभांश दर्ज नहि अछि।', 'कुनै लाभांश दर्ता छैन।')}
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {activeMf.dividends.map((d) => (
                            <div key={d.id} className="py-1.5 flex justify-between tabular-nums">
                              <span>{d.dateBS} {bsTag(language)}</span>
                              <span className="font-bold text-cyan-700">
                                +{formatMoney(d.amount, currency, language)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* SIP Confirm Payment Modal */}
      {confirmSipInst && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form onSubmit={handleConfirmSipPayment} className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                {t5(
                  language,
                  `Confirm SIP Installment #${confirmSipInst.installmentNo}`,
                  `SIP किस्त #${confirmSipInst.installmentNo} दर्ज करें`,
                  `SIP किस्त #${confirmSipInst.installmentNo} पक्का करीं`,
                  `SIP किस्त #${confirmSipInst.installmentNo} दर्ज करू`,
                  `SIP किस्ता #${confirmSipInst.installmentNo} प्रमाणित गर्नुहोस्`
                )}
              </span>
            </h3>
            <DualBSDatePicker
              label={t5(language, 'Paid Date', 'भुगतान तारीख', 'भुगतान तारीख', 'भुगतान तिथि', 'भुक्तानी मिति')}
              language={language}
              bsDate={instPaidBS}
              adDate={instPaidAD}
              onChange={(b, a) => {
                setInstPaidBS(b);
                setInstPaidAD(a);
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t5(language, 'Amount Paid', 'भुगतान राशि', 'देवल रकम', 'भुगतान राशि', 'तिरेको रकम')}
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={instPaidAmt}
                  onChange={(e) => setInstPaidAmt(Number(e.target.value))}
                  className="w-full min-h-[40px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t5(language, 'NAV (Optional)', 'NAV (वैकल्पिक)', 'NAV (चाहीं त)', 'NAV (वैकल्पिक)', 'NAV (ऐच्छिक)')}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={instNav}
                  onChange={(e) => setInstNav(e.target.value)}
                  className="w-full min-h-[40px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmSipInst(null)}
                className="min-h-[40px] px-4 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
              >
                {cancelTxt}
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
              >
                {t5(language, 'Confirm Paid', 'भुगतान दर्ज करें', 'भुगतान पक्का करीं', 'भुगतान दर्ज करू', 'भुक्तान पक्का गर्नुहोस्')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mutual Fund Transaction Modal */}
      {mfAction && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form onSubmit={handleMfTxSubmit} className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900">
              {mfAction.kind === 'nav'
                ? t5(language, 'Update Manual Current NAV', 'मैनुअल वर्तमान NAV अपडेट करें', 'मैनुअल आज के NAV बदलीं', 'मैनुअल वर्तमान NAV अपडेट करू', 'म्यानुअल हालको NAV अपडेट गर्नुहोस्')
                : mfAction.kind === 'redeem'
                ? t5(language, 'Redeem Mutual Fund Units', 'म्यूचुअल फंड यूनिट भुनाएं', 'म्यूचुअल फंड यूनिट निकालीं', 'म्यूचुअल फंड यूनिट भुनाउ', 'म्युचुअल फण्ड युनिट बिक्री गर्नुहोस्')
                : mfAction.kind === 'dividend'
                ? t5(language, 'Record Dividend Payout', 'लाभांश भुगतान दर्ज करें', 'लाभांश भुगतान दर्ज करीं', 'लाभांश भुगतान दर्ज करू', 'लाभांश भुक्तानी दर्ता गर्नुहोस्')
                : t5(language, 'Add Additional Purchase', 'अतिरिक्त खरीद जोड़ें', 'अतिरिक्त खरीद जोड़ीं', 'अतिरिक्त खरीद जोड़ू', 'थप खरिद जोड्नुहोस्')}
            </h3>
            {mfAction.kind !== 'nav' && (
              <DualBSDatePicker
                label={t5(language, 'Transaction Date', 'लेनदेन तारीख', 'लेनदेन तारीख', 'लेनदेन तिथि', 'कारोबार मिति')}
                language={language}
                bsDate={txDateBS}
                adDate={txDateAD}
                onChange={(b, a) => {
                  setTxDateBS(b);
                  setTxDateAD(a);
                }}
              />
            )}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {mfAction.kind === 'nav'
                  ? t5(language, 'Current NAV', 'वर्तमान NAV', 'अभी के NAV', 'वर्तमान NAV', 'हालको NAV')
                  : mfAction.kind === 'dividend'
                  ? t5(language, 'Net Dividend Amount', 'शुद्ध लाभांश राशि', 'शुद्ध लाभांश रकम', 'शुद्ध लाभांश राशि', 'खुद लाभांश रकम')
                  : t5(language, 'Units', 'यूनिट', 'यूनिट', 'यूनिट', 'युनिट')}
              </label>
              <input
                type="number"
                step="0.0001"
                min={0.0001}
                required
                value={txVal1}
                onChange={(e) => setTxVal1(Number(e.target.value))}
                className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
              />
            </div>
            {(mfAction.kind === 'redeem' || mfAction.kind === 'add') && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {mfAction.kind === 'redeem'
                    ? t5(language, 'Redemption NAV', 'निकासी NAV', 'बिक्री NAV', 'निकासी NAV', 'बिक्री NAV')
                    : t5(language, 'Purchase NAV', 'खरीद NAV', 'खरीद NAV', 'खरीद NAV', 'खरिद NAV')}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min={0.0001}
                  required
                  value={txVal2}
                  onChange={(e) => setTxVal2(Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                />
              </div>
            )}
            <input
              type="text"
              value={txNote}
              onChange={(e) => setTxNote(e.target.value)}
              placeholder={t5(language, 'Note (optional)', 'टिप्पणी (वैकल्पिक)', 'टिप्पणी (चाहीं त)', 'टिप्पणी (वैकल्पिक)', 'कैफियत (ऐच्छिक)')}
              className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMfAction(null)}
                className="min-h-[40px] px-4 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
              >
                {cancelTxt}
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-4 rounded-xl bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                {t5(language, 'Save', 'सेव करें', 'सेव करीं', 'सुरक्षित करू', 'सुरक्षित गर्नुहोस्')}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteSipTarget)}
        language={language}
        title={t5(language, 'Delete SIP Plan', 'SIP योजना हटाएं', 'SIP योजना हटाईं', 'SIP योजना हटाउ', 'SIP योजना हटाउनुहोस्')}
        message={t5(
          language,
          `Delete SIP plan "${deleteSipTarget?.sipName || ''}"?`,
          `क्या SIP योजना "${deleteSipTarget?.sipName || ''}" हटाएं?`,
          `का SIP योजना "${deleteSipTarget?.sipName || ''}" हटा दिहल जाव?`,
          `की SIP योजना "${deleteSipTarget?.sipName || ''}" हटाएल जाय?`,
          `के SIP योजना "${deleteSipTarget?.sipName || ''}" हटाउने हो?`
        )}
        onCancel={() => setDeleteSipTarget(null)}
        onConfirm={() => {
          if (deleteSipTarget) {
            bankDb.deleteSip(deleteSipTarget.id);
            showToast(t5(language, 'SIP deleted', 'SIP हटाया गया', 'SIP हटा दिहल गइल', 'SIP हटाएल गेल', 'SIP हटाइयो'));
          }
          setDeleteSipTarget(null);
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteMfTarget)}
        language={language}
        title={t5(language, 'Delete Mutual Fund', 'म्यूचुअल फंड हटाएं', 'म्यूचुअल फंड हटाईं', 'म्यूचुअल फंड हटाउ', 'म्युचुअल फण्ड हटाउनुहोस्')}
        message={t5(
          language,
          `Remove mutual fund "${deleteMfTarget?.fundName || ''}" and its transactions?`,
          `क्या म्यूचुअल फंड "${deleteMfTarget?.fundName || ''}" और इसके लेनदेन हटा दें?`,
          `का म्यूचुअल फंड "${deleteMfTarget?.fundName || ''}" आ एकर लेनदेन हटा दिहल जाव?`,
          `की म्यूचुअल फंड "${deleteMfTarget?.fundName || ''}" आ एकर लेनदेन हटा देल जाय?`,
          `के म्युचुअल फण्ड "${deleteMfTarget?.fundName || ''}" र यसका कारोबार हटाउने हो?`
        )}
        onCancel={() => setDeleteMfTarget(null)}
        onConfirm={() => {
          if (deleteMfTarget) {
            bankDb.deleteMutualFund(deleteMfTarget.id);
            showToast(
              t5(language, 'Mutual fund removed', 'म्यूचुअल फंड हटाया गया', 'म्यूचुअल फंड हटा दिहल गइल', 'म्यूचुअल फंड हटाएल गेल', 'म्युचुअल फण्ड हटाइयो')
            );
          }
          setDeleteMfTarget(null);
        }}
      />
    </div>
  );
};
