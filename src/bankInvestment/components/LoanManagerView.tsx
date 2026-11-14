/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Complete Bank Loan Management Module
 * - All 8 Loan Categories (Home, Personal, Business, Education, Vehicle, Agri, Gold, Custom)
 * - Fixed & Variable Rate support with effective-date rate change history
 *   (preserves already-paid historical EMIs untouched)
 * - Explicit user EMI payment confirmation & extra prepayment support
 * - Full Amortization Schedule & Closing Date (BS primary + AD secondary)
 */

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Percent,
  Landmark,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Currency, Language } from '../../types';
import {
  buildLoanAmortizationSchedule,
  calculatePeriodicEMI,
  getMonthsPerPeriod,
  getPeriodsPerYear,
  round2,
} from '../calculations';
import { bankDb } from '../db';
import {
  adTag,
  bsTag,
  formatMoney,
  getTodayDual,
  LOAN_CATEGORY_LABELS,
  pick5,
  t5,
} from '../i18n';
import {
  BankInvestmentDatabase,
  BankLoanRecord,
  InterestRateType,
  LoanCategory,
  LoanInstallmentPayment,
  PaymentFrequency,
} from '../types';
import { ConfirmDialog, DualBSDatePicker } from './ConfirmDialog';

interface LoanManagerViewProps {
  db: BankInvestmentDatabase;
  language: Language;
  currency: Currency;
  showToast: (msg: string) => void;
}

export const LoanManagerView: React.FC<LoanManagerViewProps> = ({
  db,
  language,
  currency,
  showToast,
}) => {
  const today = getTodayDual();
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(db.loans[0]?.id || null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BankLoanRecord | null>(null);
  const [showSchedule, setShowSchedule] = useState<boolean>(true);

  // Loan Form State
  const [category, setCategory] = useState<LoanCategory>('home');
  const [customCatName, setCustomCatName] = useState('');
  const [bankName, setBankName] = useState('');
  const [nickname, setNickname] = useState('');
  const [principal, setPrincipal] = useState<number>(2000000);
  const [rate, setRate] = useState<number>(10.5);
  const [startBS, setStartBS] = useState(today.bsStr);
  const [startAD, setStartAD] = useState(today.adStr);
  const [durationMonths, setDurationMonths] = useState<number>(120);
  const [customEmi, setCustomEmi] = useState<string>('');
  const [emiDay, setEmiDay] = useState<number>(15);
  const [interestType, setInterestType] = useState<InterestRateType>('fixed');
  const [frequency, setFrequency] = useState<PaymentFrequency>('monthly');
  const [processingFee, setProcessingFee] = useState<number>(0);
  const [extraMonthly, setExtraMonthly] = useState<number>(0);
  const [loanNotes, setLoanNotes] = useState('');

  // Rate Change Form State
  const [showRateModal, setShowRateModal] = useState(false);
  const [newRateVal, setNewRateVal] = useState<number>(11);
  const [rateEffBS, setRateEffBS] = useState(today.bsStr);
  const [rateEffAD, setRateEffAD] = useState(today.adStr);
  const [rateNote, setRateNote] = useState('');

  // Payment Confirmation Modal State
  const [payModalLoan, setPayModalLoan] = useState<BankLoanRecord | null>(null);
  const [payInstallmentNo, setPayInstallmentNo] = useState<number>(1);
  const [payDueBS, setPayDueBS] = useState(today.bsStr);
  const [payDueAD, setPayDueAD] = useState(today.adStr);
  const [payDateBS, setPayDateBS] = useState(today.bsStr);
  const [payDateAD, setPayDateAD] = useState(today.adStr);
  const [payScheduledEmi, setPayScheduledEmi] = useState<number>(0);
  const [payPrincipalComp, setPayPrincipalComp] = useState<number>(0);
  const [payInterestComp, setPayInterestComp] = useState<number>(0);
  const [payRateApplied, setPayRateApplied] = useState<number>(10);
  const [payExtra, setPayExtra] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<LoanInstallmentPayment['method']>('bank');
  const [payNote, setPayNote] = useState('');

  const openCreateForm = () => {
    setEditingLoanId(null);
    setCategory('home');
    setCustomCatName('');
    setBankName('');
    setNickname('');
    setPrincipal(2000000);
    setRate(10.5);
    setStartBS(today.bsStr);
    setStartAD(today.adStr);
    setDurationMonths(120);
    setCustomEmi('');
    setEmiDay(15);
    setInterestType('fixed');
    setFrequency('monthly');
    setProcessingFee(0);
    setExtraMonthly(0);
    setLoanNotes('');
    setShowForm(true);
  };

  const openEditForm = (loan: BankLoanRecord) => {
    setEditingLoanId(loan.id);
    setCategory(loan.category);
    setCustomCatName(loan.customCategoryName || '');
    setBankName(loan.bankName);
    setNickname(loan.nickname);
    setPrincipal(loan.principalAmount);
    setRate(loan.interestRate);
    setStartBS(loan.startDateBS);
    setStartAD(loan.startDateAD);
    setDurationMonths(loan.durationMonths);
    setCustomEmi(loan.customEmiAmount ? String(loan.customEmiAmount) : '');
    setEmiDay(loan.emiPaymentDay);
    setInterestType(loan.interestType);
    setFrequency(loan.paymentFrequency);
    setProcessingFee(loan.processingFee);
    setExtraMonthly(loan.plannedExtraPayment);
    setLoanNotes(loan.notes || '');
    setShowForm(true);
  };

  const handleSaveLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || principal <= 0 || durationMonths <= 0) {
      showToast(
        t5(
          language,
          'Enter valid Bank Name, Loan Amount & Duration',
          'सही बैंक नाम, लोन राशि और अवधि दर्ज करें',
          'बैंक के सही नाम, कर्जा के रकम आ समय डालीं',
          'सही बैंक नाम, कर्जा राशि आ अवधि लिखू',
          'बैंकको नाम, ऋण रकम र अवधि सही राख्नुहोस्'
        )
      );
      return;
    }
    const existing = editingLoanId ? db.loans.find((l) => l.id === editingLoanId) : undefined;
    const saved = bankDb.upsertLoan({
      id: editingLoanId || undefined,
      category,
      customCategoryName: category === 'custom' ? customCatName.trim() : undefined,
      bankName: bankName.trim(),
      nickname: nickname.trim() || `${bankName.trim()} ${pick5(language, LOAN_CATEGORY_LABELS[category], 'loan.defaultNickname')}`,
      principalAmount: principal,
      interestRate: rate,
      interestType,
      paymentFrequency: frequency,
      startDateAD: startAD,
      startDateBS: startBS,
      durationMonths,
      customEmiAmount: customEmi && Number(customEmi) > 0 ? Number(customEmi) : undefined,
      emiPaymentDay: Math.min(31, Math.max(1, emiDay)),
      processingFee,
      plannedExtraPayment: extraMonthly,
      rateChanges: existing?.rateChanges || [],
      payments: existing?.payments || [],
      status: existing?.status || 'active',
      notes: loanNotes.trim() || undefined,
    });
    setSelectedLoanId(saved.id);
    setShowForm(false);
    showToast(
      editingLoanId
        ? t5(language, 'Loan account updated', 'लोन खाता अपडेट हुआ', 'कर्जा खाता अपडेट हो गइल', 'कर्जा खाता अपडेट भेल', 'ऋण खाता अद्यावधिक भयो')
        : t5(language, 'Loan account added', 'लोन खाता जोड़ा गया', 'कर्जा खाता जुड़ गइल', 'कर्जा खाता जोड़ल गेल', 'ऋण खाता थपियो')
    );
  };

  const activeLoan = db.loans.find((l) => l.id === selectedLoanId) || db.loans[0] || null;
  const activeSchedule = activeLoan ? buildLoanAmortizationSchedule(activeLoan, today.adStr) : null;

  const previewAutoEmi = calculatePeriodicEMI(
    principal,
    rate,
    Math.max(1, Math.ceil(durationMonths / getMonthsPerPeriod(frequency))),
    getPeriodsPerYear(frequency)
  );

  const openConfirmPaymentForRow = (
    loan: BankLoanRecord,
    installmentNo: number,
    dueBS: string,
    dueAD: string,
    emiAmount: number,
    principalComp: number,
    interestComp: number,
    rateApplied: number
  ) => {
    setPayModalLoan(loan);
    setPayInstallmentNo(installmentNo);
    setPayDueBS(dueBS);
    setPayDueAD(dueAD);
    setPayDateBS(today.bsStr);
    setPayDateAD(today.adStr);
    setPayScheduledEmi(emiAmount);
    setPayPrincipalComp(principalComp);
    setPayInterestComp(interestComp);
    setPayRateApplied(rateApplied);
    setPayExtra(loan.plannedExtraPayment || 0);
    setPayMethod('bank');
    setPayNote('');
  };

  const handleConfirmPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalLoan) return;
    const totalPaid = round2(payScheduledEmi + Math.max(0, payExtra));
    const res = bankDb.confirmLoanPayment(payModalLoan.id, {
      installmentNo: payInstallmentNo,
      dueDateAD: payDueAD,
      dueDateBS: payDueBS,
      paidDateAD: payDateAD,
      paidDateBS: payDateBS,
      scheduledEmi: payScheduledEmi,
      principalComponent: payPrincipalComp,
      interestComponent: payInterestComp,
      extraPrincipalPaid: Math.max(0, payExtra),
      totalPaid,
      rateApplied: payRateApplied,
      method: payMethod,
      note: payNote.trim() || undefined,
    });
    if (res.duplicate) {
      showToast(
        t5(
          language,
          'This EMI payment was already recorded.',
          'इस EMI का भुगतान पहले ही दर्ज हो चुका है।',
          'ई EMI किस्त के भुगतान पहिले से दर्ज बा।',
          'ई EMI भुगतान पहिनहि सँ दर्ज अछि।',
          'यो EMI भुक्तानी पहिले नै दर्ता भइसकेको छ।'
        )
      );
    } else if (res.ok) {
      showToast(
        t5(
          language,
          'EMI Payment confirmed and ledger updated',
          'EMI भुगतान पुष्ट हुआ और खाता अपडेट हो गया',
          'EMI भुगतान पक्का भइल आ खाता अपडेट हो गइल',
          'EMI भुगतान पुष्टि भेल आ खाता अपडेट भेल',
          'EMI भुक्तानी पुष्टि भयो र खाता अद्यावधिक भयो'
        )
      );
    }
    setPayModalLoan(null);
  };

  const handleAddRateChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoan || newRateVal < 0) return;
    bankDb.addLoanRateChange(activeLoan.id, {
      effectiveDateAD: rateEffAD,
      effectiveDateBS: rateEffBS,
      newRate: newRateVal,
      note: rateNote.trim() || undefined,
    });
    setShowRateModal(false);
    setRateNote('');
    showToast(
      t5(
        language,
        'Variable interest rate change recorded from effective date',
        'प्रभावी तिथि से ब्याज दर में बदलाव दर्ज हो गया',
        'तय तारीख से नया ब्याज दर लागू हो गइल',
        'प्रभावी तिथि सँ ब्याज दर परिवर्तन दर्ज भेल',
        'लागू मितिबाट परिवर्तित ब्याजदर अभिलेख गरियो'
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-2xl border border-slate-200 p-3.5">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            {t5(language, 'Bank Loan & EMI Manager', 'बैंक लोन और EMI प्रबंधक', 'बैंक कर्जा आ EMI हिसाब', 'बैंक कर्जा आ EMI प्रबंधन', 'बैंक कर्जा तथा किस्ता व्यवस्थापन')}
          </h2>
          <p className="text-[11px] text-slate-500">
            {t5(
              language,
              'Supports fixed & variable rates, effective-date revisions, extra payments & full amortization.',
              'स्थिर और परिवर्तनशील ब्याज दर, प्रभावी तिथि संशोधन, अतिरिक्त भुगतान और पूरा किस्त चार्ट।',
              'तय आ घटत-बढ़त ब्याज दर, तारीख हिसाब से बदलाव, ऊपर से जमा आ पूरा किस्त तालिका।',
              'स्थिर आ परिवर्तनशील ब्याज दर, प्रभावी तिथि संशोधन, अतिरिक्त भुगतान आ पूरा किस्त तालिका।',
              'स्थिर/परिवर्तनशील ब्याजदर, मिति अनुसार दर संशोधन, अतिरिक्त भुक्तानी र पूरा किस्ता तालिका।'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="min-h-[42px] px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t5(language, 'Add New Loan', 'नया लोन जोड़ें', 'नया कर्जा जोड़ीं', 'नव कर्जा जोड़ू', 'नयाँ ऋण थप्नुहोस्')}</span>
        </button>
      </div>

      {/* Create / Edit Loan Form */}
      {showForm && (
        <form onSubmit={handleSaveLoan} className="bg-white rounded-2xl border border-blue-200 p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              {editingLoanId
                ? t5(language, 'Edit Loan Account', 'लोन खाता संपादित करें', 'कर्जा खाता सुधारीं', 'कर्जा खाता संपादित करू', 'ऋण खाता सम्पादन गर्नुहोस्')
                : t5(language, 'Create Loan Account', 'नया लोन खाता बनाएं', 'नया कर्जा खाता बनाईं', 'नव कर्जा खाता बनाउ', 'नयाँ ऋण खाता बनाउनुहोस्')}
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              {t5(language, 'Cancel', 'रद्द करें', 'रद्द करीं', 'रद्द करू', 'रद्द गर्नुहोस्')}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t5(language, 'Loan Category', 'लोन श्रेणी', 'कर्जा के किसिम', 'कर्जा श्रेणी', 'ऋणको प्रकार')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LoanCategory)}
                className="w-full min-h-[42px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              >
                {Object.entries(LOAN_CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {pick5(language, v, 'loan.category')}
                  </option>
                ))}
              </select>
            </div>
            {category === 'custom' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t5(language, 'Custom Type Name', 'कस्टम प्रकार का नाम', 'अपन श्रेणी के नाम', 'कस्टम प्रकारक नाम', 'अन्य प्रकारको नाम')}
                </label>
                <input
                  type="text"
                  value={customCatName}
                  onChange={(e) => setCustomCatName(e.target.value)}
                  placeholder={t5(language, 'e.g. Margin Lending', 'जैसे: मार्जिन लोन', 'जइसे: दोसर कर्जा', 'जेना: मार्जिन कर्जा', 'जस्तै: मार्जिन कर्जा')}
                  className="w-full min-h-[42px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t5(language, 'Bank / Institution Name *', 'बैंक / संस्था का नाम *', 'बैंक / संस्था के नाम *', 'बैंक / संस्थाक नाम *', 'बैंक / संस्थाको नाम *')}
              </label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder={t5(language, 'e.g. Nabil Bank / NIC Asia', 'जैसे: नबिल बैंक / एसबीआई', 'जइसे: नबिल बैंक / स्टेट बैंक', 'जेना: नबिल बैंक / सहकारी', 'जस्तै: नबिल बैंक / एनआइसी एशिया')}
                className="w-full min-h-[42px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t5(language, 'Loan Account Nickname', 'लोन खाता उपनाम', 'कर्जा खाता के पहचान नाम', 'कर्जा खाता उपनाम', 'ऋण खाताको नाम')}
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={t5(language, 'e.g. Kathmandu Home Loan', 'जैसे: घर का लोन', 'जइसे: घर बनावे के कर्जा', 'जेना: घर कर्जा', 'जस्तै: काठमाडौँ घर कर्जा')}
                className="w-full min-h-[42px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t5(language, 'Loan Amount *', 'लोन राशि *', 'कर्जा के रकम *', 'कर्जा राशि *', 'ऋण रकम *')}
              </label>
              <input
                type="number"
                min={1}
                required
                value={principal}
                onChange={(e) => setPrincipal(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t5(language, 'Interest Rate (% p.a.)', 'ब्याज दर (% वार्षिक)', 'ब्याज दर (% सालाना)', 'ब्याज दर (% वार्षिक)', 'ब्याज दर (% वार्षिक)')}
              </label>
              <input
                type="number"
                step="0.05"
                min={0}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t5(language, 'Duration (Months)', 'अवधि (महीने)', 'समय (महीना)', 'अवधि (मास)', 'अवधि (महिना)')}
              </label>
              <input
                type="number"
                min={1}
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t5(language, 'Interest Type', 'ब्याज प्रकार', 'ब्याज के प्रकार', 'ब्याज प्रकार', 'ब्याजको प्रकार')}
              </label>
              <select
                value={interestType}
                onChange={(e) => setInterestType(e.target.value as InterestRateType)}
                className="w-full min-h-[42px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              >
                <option value="fixed">{t5(language, 'Fixed Rate', 'स्थिर दर (Fixed)', 'तय दर (Fixed)', 'स्थिर दर (Fixed)', 'स्थिर दर (Fixed)')}</option>
                <option value="variable">{t5(language, 'Variable / Floating Rate', 'परिवर्तनशील दर (Floating)', 'घटत-बढ़त दर (Variable)', 'परिवर्तनशील दर (Variable)', 'परिवर्तनशील दर (Variable)')}</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t5(language, 'Payment Frequency', 'भुगतान अंतराल', 'किस्त के समय अंतराल', 'भुगतान अंतराल', 'भुक्तानी अन्तराल')}
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as PaymentFrequency)}
                className="w-full min-h-[42px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              >
                <option value="monthly">{t5(language, 'Monthly', 'मासिक', 'हर महीना', 'मासिक', 'मासिक')}</option>
                <option value="quarterly">{t5(language, 'Quarterly', 'तिमाही', 'हर तीन महीना', 'तिमाही', 'त्रैमासिक')}</option>
                <option value="yearly">{t5(language, 'Yearly', 'वार्षिक', 'हर साल', 'वार्षिक', 'वार्षिक')}</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t5(language, 'EMI Day of Month (1-31)', 'मासिक EMI दिन (1-31)', 'महीना के EMI तारीख (1-31)', 'मासिक EMI दिन (1-31)', 'महिनाको किस्ता दिन (१-३१)')}
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={emiDay}
                onChange={(e) => setEmiDay(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t5(language, 'EMI Override', 'कस्टम EMI', 'अपना मन से EMI', 'कस्टम EMI', 'कस्टम किस्ता')} ({t5(language, 'Auto', 'स्वतः', 'अपने आप', 'स्वतः', 'स्वतः')}: {round2(previewAutoEmi).toLocaleString('en-IN')})
              </label>
              <input
                type="number"
                min={0}
                value={customEmi}
                onChange={(e) => setCustomEmi(e.target.value)}
                placeholder={t5(language, 'Leave blank for auto EMI', 'स्वतः EMI के लिए खाली छोड़ें', 'अपने आप हिसाब खातिर खाली छोड़ीं', 'स्वतः EMI लेल खाली छोड़ू', 'स्वतः किस्ताका लागि खाली छोड्नुहोस्')}
                className="w-full min-h-[42px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t5(language, 'Processing Fee', 'प्रोसेसिंग शुल्क', 'प्रोसेसिंग फीस', 'प्रोसेसिंग शुल्क', 'सेवा शुल्क')}
              </label>
              <input
                type="number"
                min={0}
                value={processingFee}
                onChange={(e) => setProcessingFee(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t5(language, 'Planned Extra Payment / Period', 'नियोजित अतिरिक्त भुगतान / अवधि', 'हर किस्त पर एक्स्ट्रा जमा', 'नियोजित अतिरिक्त भुगतान / अवधि', 'अतिरिक्त भुक्तानी / किस्ता')}
              </label>
              <input
                type="number"
                min={0}
                value={extraMonthly}
                onChange={(e) => setExtraMonthly(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
              />
            </div>
          </div>

          <DualBSDatePicker
            label={t5(language, 'Loan Start Date', 'लोन प्रारंभ तिथि', 'कर्जा शुरू भइल तारीख', 'कर्जा प्रारंभ तिथि', 'ऋण सुरु मिति')}
            bsDate={startBS}
            adDate={startAD}
            language={language}
            onChange={(b, a) => {
              setStartBS(b);
              setStartAD(a);
            }}
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-[42px] px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
            >
              {t5(language, 'Cancel', 'रद्द करें', 'रद्द करीं', 'रद्द करू', 'रद्द गर्नुहोस्')}
            </button>
            <button
              type="submit"
              className="min-h-[42px] px-5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold cursor-pointer"
            >
              {editingLoanId
                ? t5(language, 'Update Loan', 'लोन अपडेट करें', 'कर्जा अपडेट करीं', 'कर्जा अपडेट करू', 'ऋण अद्यावधिक गर्नुहोस्')
                : t5(language, 'Save Loan', 'लोन सेव करें', 'कर्जा सेव करीं', 'कर्जा सेव करू', 'ऋण सुरक्षित गर्नुहोस्')}
            </button>
          </div>
        </form>
      )}

      {/* Loan Accounts List + Active Details */}
      {db.loans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <Landmark className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="text-sm font-bold text-slate-800">
            {t5(language, 'No Bank Loans Tracked Yet', 'अभी तक कोई बैंक लोन दर्ज नहीं है', 'अभी ले कवनो बैंक कर्जा दर्ज नइखे', 'एखन धरि कोनो बैंक कर्जा दर्ज नहि अछि', 'अहिलेसम्म कुनै बैंक ऋण दर्ता गरिएको छैन')}
          </div>
          <p className="text-xs text-slate-500">
            {t5(
              language,
              'Add Home, Personal, Business, Education, Vehicle, Agri or Gold loans to track EMI schedules and variable rate revisions.',
              'EMI तालिका और ब्याज दर बदलाव ट्रैक करने के लिए होम, पर्सनल, बिजनेस, शिक्षा, वाहन, कृषि या गोल्ड लोन जोड़ें।',
              'किस्त आ ब्याज दर के हिसाब रखे खातिर घर, निजी, व्यापार, पढ़ाई, गाड़ी, खेती या सोना के कर्जा जोड़ीं।',
              'EMI तालिका आ ब्याज दर संशोधन ट्रैक करबा लेल घर, व्यक्तिगत, व्यापार, शिक्षा, गाड़ी, कृषि वा सोना कर्जा जोड़ू।',
              'किस्ता तालिका र ब्याजदर परिवर्तन ट्र्याक गर्न घर, व्यक्तिगत, व्यवसाय, शिक्षा, सवारी, कृषि वा सुन कर्जा थप्नुहोस्।'
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Loan Selector List */}
          <div className="lg:col-span-4 space-y-2">
            {db.loans.map((loan) => {
              const sched = buildLoanAmortizationSchedule(loan, today.adStr);
              const isSelected = activeLoan?.id === loan.id;
              return (
                <div
                  key={loan.id}
                  onClick={() => setSelectedLoanId(loan.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{loan.nickname}</div>
                      <div className={`text-[11px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {loan.bankName} •{' '}
                        {loan.interestType === 'variable'
                          ? t5(language, 'Variable', 'परिवर्तनशील', 'बदले वाला', 'परिवर्तनशील', 'परिवर्तनशील')
                          : t5(language, 'Fixed', 'स्थिर', 'तय', 'स्थिर', 'स्थिर')}{' '}
                        {sched.currentActiveRate}%
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isSelected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {loan.customCategoryName || pick5(language, LOAN_CATEGORY_LABELS[loan.category], 'loan.badge')}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-baseline justify-between text-xs tabular-nums">
                    <div>
                      <span className={isSelected ? 'text-slate-400 text-[10px]' : 'text-slate-500 text-[10px]'}>
                        {t5(language, 'Remaining:', 'शेष:', 'बाकी:', 'बाकी:', 'बाँकी:')}
                      </span>{' '}
                      <span className="font-bold">
                        {formatMoney(sched.remainingPrincipal, currency, language)}
                      </span>
                    </div>
                    <div className="text-[11px]">
                      {sched.paidEmiCount}/{sched.paidEmiCount + sched.pendingEmiCount}{' '}
                      {t5(language, 'Paid', 'जमा', 'जमा', 'भुगतान', 'तिरेको')}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Loan Dashboard & Amortization Schedule */}
          {activeLoan && activeSchedule && (
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{activeLoan.nickname}</h3>
                    <div className="text-xs text-slate-500 tabular-nums">
                      {activeLoan.bankName} • {t5(language, 'Started', 'प्रारंभ', 'शुरू', 'प्रारंभ', 'सुरु')} {activeLoan.startDateBS} {bsTag(language)} ({activeLoan.startDateAD} {adTag(language)}) •{' '}
                      {t5(language, 'Closing:', 'समाप्ति:', 'खतम होखे के तारीख:', 'समाप्ति:', 'सकिने मिति:')}{' '}
                      <span className="font-semibold text-slate-800">
                        {activeSchedule.closingDateBS} {bsTag(language)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {activeLoan.interestType === 'variable' && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewRateVal(activeSchedule.currentActiveRate);
                          setShowRateModal(true);
                        }}
                        className="min-h-[38px] px-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Percent className="w-3.5 h-3.5" />
                        <span>{t5(language, 'Change Rate', 'दर बदलें', 'ब्याज दर बदलीं', 'दर बदलू', 'दर बदल्नुहोस्')}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const nextPending = activeSchedule.rows.find((r) => r.status !== 'paid');
                        if (nextPending) {
                          openConfirmPaymentForRow(
                            activeLoan,
                            nextPending.installmentNo,
                            nextPending.dueDateBS,
                            nextPending.dueDateAD,
                            nextPending.emiAmount,
                            nextPending.principalComponent,
                            nextPending.interestComponent,
                            nextPending.rateApplied
                          );
                        } else {
                          openConfirmPaymentForRow(activeLoan, 0, today.bsStr, today.adStr, 0, 0, 0, activeSchedule.currentActiveRate);
                        }
                      }}
                      className="min-h-[38px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t5(language, 'Confirm Next EMI / Prepay', 'अगली EMI पुष्टि / प्री-पे', 'अगिला EMI जमा / एक्स्ट्रा जमा', 'अगिला EMI पुष्टि / पूर्व भुगतान', 'अर्को EMI पुष्टि / अग्रीम भुक्तानी')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditForm(activeLoan)}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                      aria-label={t5(language, 'Edit Loan', 'लोन संपादित करें', 'कर्जा सुधारीं', 'कर्जा संपादित करू', 'ऋण सम्पादन गर्नुहोस्')}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(activeLoan)}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                      aria-label={t5(language, 'Delete Loan', 'लोन हटाएं', 'कर्जा हटाईं', 'कर्जा हटाउ', 'ऋण हटाउनुहोस्')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Loan Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] text-slate-500">
                      {t5(language, 'Monthly EMI Equiv.', 'मासिक EMI (लगभग)', 'महिना के EMI (अंदाजा)', 'मासिक EMI समतुल्य', 'मासिक किस्ता बराबर')}
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 tabular-nums mt-0.5">
                      {formatMoney(activeSchedule.monthlyEquivalentEmi, currency, language)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] text-slate-500">
                      {t5(language, 'Remaining Principal', 'शेष मूलधन', 'बाकी मूलधन', 'शेष मूलधन', 'बाँकी साँवा')}
                    </div>
                    <div className="text-sm font-extrabold text-rose-700 tabular-nums mt-0.5">
                      {formatMoney(activeSchedule.remainingPrincipal, currency, language)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] text-slate-500">
                      {t5(language, 'Remaining Interest', 'शेष ब्याज', 'बाकी ब्याज', 'शेष ब्याज', 'बाँकी ब्याज')}
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 tabular-nums mt-0.5">
                      {formatMoney(activeSchedule.remainingInterest, currency, language)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] text-slate-500">
                      {t5(language, 'Total Interest / Repay', 'कुल अनुमानित ब्याज', 'कुल ब्याज', 'कुल ब्याज', 'कुल ब्याज')}
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 tabular-nums mt-0.5">
                      {formatMoney(activeSchedule.totalInterestProjected, currency, language)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] text-slate-500">
                      {t5(language, 'Paid / Pending EMIs', 'जमा / शेष EMI', 'जमा / बाकी EMI', 'भुगतान / शेष EMI', 'तिरेको / बाँकी EMI')}
                    </div>
                    <div className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                      {activeSchedule.paidEmiCount} {t5(language, 'Paid', 'जमा', 'जमा', 'भुगतान', 'तिरेको')} / {activeSchedule.pendingEmiCount}{' '}
                      {t5(language, 'Pending', 'शेष', 'बाकी', 'शेष', 'बाँकी')}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] text-slate-500">
                      {t5(language, 'Total Repayment', 'कुल कुल चुकौती', 'कुल चुकावे के रकम', 'कुल चुकौती', 'कुल तिर्नुपर्ने रकम')}
                    </div>
                    <div className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                      {formatMoney(activeSchedule.totalRepaymentProjected, currency, language)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] text-slate-500">
                      {t5(language, 'Processing Fee', 'प्रोसेसिंग शुल्क', 'प्रोसेसिंग फीस', 'प्रोसेसिंग शुल्क', 'सेवा शुल्क')}
                    </div>
                    <div className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                      {formatMoney(activeLoan.processingFee, currency, language)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] text-slate-500">
                      {t5(language, 'Closing Date', 'समाप्ति तिथि', 'खतम होखे के तारीख', 'समाप्ति तिथि', 'सकिने मिति')} ({bsTag(language)} / {adTag(language)})
                    </div>
                    <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                      {activeSchedule.closingDateBS}
                      <div className="text-[10px] text-slate-500">{activeSchedule.closingDateAD}</div>
                    </div>
                  </div>
                </div>

                {/* Variable Rate Change History */}
                {activeLoan.rateChanges.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                    <div className="text-[11px] font-bold text-amber-900">
                      {t5(
                        language,
                        'Interest Rate Revision Log (Historical paid EMIs preserved)',
                        'ब्याज दर संशोधन इतिहास (पुरानी जमा EMI सुरक्षित)',
                        'ब्याज दर बदलाव के हिसाब (पहिले जमा किस्त जइसन के तइसन रही)',
                        'ब्याज दर संशोधन इतिहास (पुरान भुगतान कएल EMI सुरक्षित)',
                        'ब्याजदर संशोधन अभिलेख (पहिले तिरिएको EMI सुरक्षित)'
                      )}
                    </div>
                    {activeLoan.rateChanges.map((rc) => (
                      <div key={rc.id} className="text-[11px] text-amber-800 flex justify-between tabular-nums">
                        <span>
                          {t5(language, 'Effective', 'प्रभावी', 'लागू तारीख', 'प्रभावी', 'लागू')} {rc.effectiveDateBS} {bsTag(language)} ({rc.effectiveDateAD} {adTag(language)}){rc.note ? ` — ${rc.note}` : ''}
                        </span>
                        <span className="font-bold">{rc.newRate}% {t5(language, 'p.a.', 'वार्षिक', 'सालाना', 'वार्षिक', 'वार्षिक')}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Amortization Schedule Toggle & Table */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowSchedule((s) => !s)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <span>
                      {t5(language, 'Amortization Schedule', 'किस्त भुगतान तालिका', 'किस्त भुगतान तालिका', 'किस्त भुगतान तालिका', 'किस्ता भुक्तानी तालिका')} ({activeSchedule.rows.length}{' '}
                      {t5(language, 'installments', 'किस्तें', 'किस्त', 'किस्त', 'किस्ता')})
                    </span>
                    {showSchedule ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showSchedule && (
                    <div className="mt-2 border border-slate-200 rounded-xl overflow-x-auto max-h-[380px] overflow-y-auto">
                      <table className="w-full text-[11px] text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 text-slate-600 font-bold">
                          <tr>
                            <th className="py-2 px-2.5">#</th>
                            <th className="py-2 px-2.5">{t5(language, 'Due Date', 'देय तिथि', 'जमा तारीख', 'देय तिथि', 'भुक्तानी मिति')} ({bsTag(language)}/{adTag(language)})</th>
                            <th className="py-2 px-2.5 text-right">{t5(language, 'Rate', 'दर', 'दर', 'दर', 'दर')}</th>
                            <th className="py-2 px-2.5 text-right">{t5(language, 'EMI', 'EMI', 'किस्त', 'EMI', 'किस्ता')}</th>
                            <th className="py-2 px-2.5 text-right">{t5(language, 'Principal', 'मूलधन', 'मूलधन', 'मूलधन', 'साँवा')}</th>
                            <th className="py-2 px-2.5 text-right">{t5(language, 'Interest', 'ब्याज', 'ब्याज', 'ब्याज', 'ब्याज')}</th>
                            <th className="py-2 px-2.5 text-right">{t5(language, 'Balance', 'शेष', 'बाकी', 'शेष', 'बाँकी')}</th>
                            <th className="py-2 px-2.5 text-center">{t5(language, 'Status / Action', 'स्थिति / कार्रवाई', 'हालत / काम', 'स्थिति / क्रिया', 'अवस्था / कार्य')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 tabular-nums">
                          {activeSchedule.rows.map((row) => (
                            <tr key={row.installmentNo} className="hover:bg-slate-50">
                              <td className="py-2 px-2.5 font-bold text-slate-700">{row.installmentNo}</td>
                              <td className="py-2 px-2.5">
                                <div className="font-semibold text-slate-900">{row.dueDateBS}</div>
                                <div className="text-[10px] text-slate-400">{row.dueDateAD}</div>
                              </td>
                              <td className="py-2 px-2.5 text-right">{row.rateApplied}%</td>
                              <td className="py-2 px-2.5 text-right font-bold">{row.emiAmount.toLocaleString('en-IN')}</td>
                              <td className="py-2 px-2.5 text-right text-emerald-700">{row.principalComponent.toLocaleString('en-IN')}</td>
                              <td className="py-2 px-2.5 text-right text-slate-600">{row.interestComponent.toLocaleString('en-IN')}</td>
                              <td className="py-2 px-2.5 text-right font-semibold">{row.closingPrincipal.toLocaleString('en-IN')}</td>
                              <td className="py-2 px-2.5 text-center">
                                {row.status === 'paid' ? (
                                  <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                                    {t5(language, 'Paid', 'जमा', 'जमा भइल', 'भुगतान', 'तिरेको')} ({row.paidDateBS})
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openConfirmPaymentForRow(
                                        activeLoan,
                                        row.installmentNo,
                                        row.dueDateBS,
                                        row.dueDateAD,
                                        row.emiAmount,
                                        row.principalComponent,
                                        row.interestComponent,
                                        row.rateApplied
                                      )
                                    }
                                    className={`px-2 py-1 rounded-lg font-bold text-[10px] cursor-pointer ${
                                      row.status === 'overdue'
                                        ? 'bg-rose-600 text-white hover:bg-rose-700'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                  >
                                    {row.status === 'overdue'
                                      ? t5(language, 'Overdue • Pay', 'बकाया • भुगतान करें', 'बाकी • जमा करीं', 'बकाया • भुगतान करू', 'म्याद नाघ्यो • तिर्नुहोस्')
                                      : t5(language, 'Confirm Pay', 'भुगतान पुष्टि', 'जमा करीं', 'भुगतान पुष्टि', 'तिरेको पुष्टि')}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Variable Rate Change Modal */}
      {showRateModal && activeLoan && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form onSubmit={handleAddRateChange} className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>{t5(language, 'Record Variable Rate Change', 'परिवर्तनशील ब्याज दर दर्ज करें', 'ब्याज दर बदलाव दर्ज करीं', 'परिवर्तनशील दर बदलाव दर्ज करू', 'परिवर्तनशील ब्याजदर दर्ता गर्नुहोस्')}</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              {t5(
                language,
                'Applies only to remaining unpaid EMIs on or after the effective date. Historical paid EMIs remain untouched.',
                'प्रभावी तिथि के बाद केवल शेष अवैतनिक EMI पर लागू होगा। पहले की जमा EMI सुरक्षित रहेंगी।',
                'तय तारीख के बाद खाली बाकी किस्त पर लागू होई। पहिले से जमा किस्त में कवनो बदलाव ना होई।',
                'प्रभावी तिथि के बाद केवल शेष बकाया EMI पर लागू हेत। पुरान भुगतान कएल EMI अपरिवर्तित रहत।',
                'लागू मिति वा त्यसपछिका बाँकी किस्तामा मात्र लागू हुन्छ। पहिले तिरिएका किस्ता यथावत् रहन्छन्।'
              )}
            </p>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t5(language, 'New Annual Interest Rate (%)', 'नई वार्षिक ब्याज दर (%)', 'नया सालाना ब्याज दर (%)', 'नव वार्षिक ब्याज दर (%)', 'नयाँ वार्षिक ब्याजदर (%)')}
              </label>
              <input
                type="number"
                step="0.05"
                required
                value={newRateVal}
                onChange={(e) => setNewRateVal(Number(e.target.value))}
                className="w-full min-h-[42px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
              />
            </div>
            <DualBSDatePicker
              label={t5(language, 'Effective Date', 'प्रभावी तिथि', 'लागू होखे के तारीख', 'प्रभावी तिथि', 'लागू हुने मिति')}
              bsDate={rateEffBS}
              adDate={rateEffAD}
              language={language}
              onChange={(b, a) => {
                setRateEffBS(b);
                setRateEffAD(a);
              }}
            />
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t5(language, 'Bank Notice / Note', 'बैंक सूचना / टिप्पणी', 'बैंक सूचना / नोट', 'बैंक सूचना / नोट', 'बैंक सूचना / टिप्पणी')}
              </label>
              <input
                type="text"
                value={rateNote}
                onChange={(e) => setRateNote(e.target.value)}
                placeholder={t5(language, 'e.g. Base rate +2% adjustment', 'जैसे: बेस रेट +2% बदलाव', 'जइसे: बेस रेट +2% बढ़ल', 'जेना: बेस रेट +2% समायोजन', 'जस्तै: आधार दर +२% समायोजन')}
                className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowRateModal(false)}
                className="min-h-[40px] px-4 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
              >
                {t5(language, 'Cancel', 'रद्द करें', 'रद्द करीं', 'रद्द करू', 'रद्द गर्नुहोस्')}
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-4 rounded-xl bg-amber-600 text-white text-xs font-bold cursor-pointer"
              >
                {t5(language, 'Save Rate Revision', 'दर बदलाव सेव करें', 'बदलाव सेव करीं', 'दर संशोधन सेव करू', 'दर संशोधन सुरक्षित गर्नुहोस्')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm EMI Payment Modal */}
      {payModalLoan && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <form onSubmit={handleConfirmPaymentSubmit} className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900">
              {payInstallmentNo > 0
                ? `${t5(language, 'Confirm EMI', 'EMI पुष्टि करें', 'EMI जमा पक्का करीं', 'EMI पुष्टि करू', 'EMI पुष्टि गर्नुहोस्')} #${payInstallmentNo}`
                : t5(language, 'Standalone Principal Prepayment', 'अलग से मूलधन भुगतान', 'अलग से मूलधन जमा', 'अलग सँ मूलधन भुगतान', 'थप साँवा अग्रिम भुक्तानी')}
            </h3>
            <div className="text-xs text-slate-600 bg-slate-50 rounded-xl p-2.5 border border-slate-200 tabular-nums">
              {t5(language, 'Scheduled EMI:', 'निर्धारित EMI:', 'तय EMI:', 'निर्धारित EMI:', 'निर्धारित EMI:')}{' '}
              <span className="font-bold text-slate-900">{formatMoney(payScheduledEmi, currency, language)}</span> (
              {t5(language, 'Principal', 'मूलधन', 'मूलधन', 'मूलधन', 'साँवा')} {round2(payPrincipalComp).toLocaleString('en-IN')} +{' '}
              {t5(language, 'Interest', 'ब्याज', 'ब्याज', 'ब्याज', 'ब्याज')} {round2(payInterestComp).toLocaleString('en-IN')})
            </div>

            <DualBSDatePicker
              label={t5(language, 'Actual Paid Date', 'वास्तविक भुगतान तिथि', 'असली जमा तारीख', 'वास्तविक भुगतान तिथि', 'तिरेको वास्तविक मिति')}
              bsDate={payDateBS}
              adDate={payDateAD}
              language={language}
              onChange={(b, a) => {
                setPayDateBS(b);
                setPayDateAD(a);
              }}
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t5(language, 'Extra Principal Prepay', 'अतिरिक्त मूलधन भुगतान', 'एक्स्ट्रा मूलधन जमा', 'अतिरिक्त मूलधन भुगतान', 'थप साँवा भुक्तानी')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={payExtra}
                  onChange={(e) => setPayExtra(Number(e.target.value))}
                  className="w-full min-h-[40px] px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t5(language, 'Method', 'माध्यम', 'तरीका', 'माध्यम', 'भुक्तानी माध्यम')}
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full min-h-[40px] px-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="bank">{t5(language, 'Bank Transfer', 'बैंक ट्रांसफर', 'बैंक ट्रांसफर', 'बैंक ट्रांसफर', 'बैंक ट्रान्सफर')}</option>
                  <option value="auto_debit">{t5(language, 'Auto Debit', 'ऑटो डेबिट', 'ऑटो डेबिट', 'ऑटो डेबिट', 'अटो डेबिट')}</option>
                  <option value="cash">{t5(language, 'Cash', 'नकद', 'नगद', 'नगद', 'नगद')}</option>
                  <option value="esewa">{t5(language, 'eSewa', 'ई-सेवा', 'ई-सेवा', 'ई-सेवा', 'ई-सेवा')}</option>
                  <option value="khalti">{t5(language, 'Khalti', 'खल्ती', 'खल्ती', 'खल्ती', 'खल्ती')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {t5(language, 'Note (Optional)', 'टिप्पणी (वैकल्पिक)', 'नोट (चाहीं त)', 'नोट (वैकल्पिक)', 'टिप्पणी (ऐच्छिक)')}
              </label>
              <input
                type="text"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder={t5(language, 'Receipt / Reference #', 'रसीद / संदर्भ संख्या', 'रसीद / रेफरेंस नंबर', 'रसीद / संदर्भ #', 'रसिद / सन्दर्भ नं.')}
                className="w-full min-h-[40px] px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPayModalLoan(null)}
                className="min-h-[40px] px-4 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
              >
                {t5(language, 'Cancel', 'रद्द करें', 'रद्द करीं', 'रद्द करू', 'रद्द गर्नुहोस्')}
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                {t5(language, 'Confirm Payment', 'भुगतान पुष्टि करें', 'भुगतान पक्का करीं', 'भुगतान पुष्टि करू', 'भुक्तानी पुष्टि गर्नुहोस्')}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title={t5(language, 'Delete Loan Account', 'लोन खाता हटाएं', 'कर्जा खाता हटाईं', 'कर्जा खाता हटाउ', 'ऋण खाता हटाउनुहोस्')}
        message={t5(
          language,
          `Delete loan "${deleteTarget?.nickname || ''}" and all its payment records?`,
          `क्या "${deleteTarget?.nickname || ''}" और इसके सभी भुगतान रिकॉर्ड हटा दें?`,
          `का "${deleteTarget?.nickname || ''}" आ एकर सारा भुगतान रिकॉर्ड हटा दीं?`,
          `की "${deleteTarget?.nickname || ''}" आ एकर सभ भुगतान रिकॉर्ड हटा देब?`,
          `के "${deleteTarget?.nickname || ''}" र यसका सबै भुक्तानी अभिलेख हटाउने हो?`
        )}
        language={language}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            bankDb.deleteLoan(deleteTarget.id);
            showToast(t5(language, 'Loan account deleted', 'लोन खाता हटा दिया गया', 'कर्जा खाता हटा दिहल गइल', 'कर्जा खाता हटाएल गेल', 'ऋण खाता हटाइयो'));
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
};
