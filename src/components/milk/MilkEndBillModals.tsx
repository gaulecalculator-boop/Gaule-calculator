/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  AlertCircle,
  AlertTriangle,
  FileText,
  DollarSign,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
} from 'lucide-react';
import { MilkCustomer, MilkFinalBill, MilkPayment } from '../../types/milkManagement';
import { NepaliBSDatePicker } from '../common/NepaliBSDatePicker';
import { buildGauleDoodhBillSummary } from '../../utils/gauleDoodhBillEngine';
import { GauleDoodhTraditionalBill } from './GauleDoodhTraditionalBill';
import { Language } from '../../types';
import { translateUserData, localizeNumberString } from '../../utils/universalTranslator';

interface NoMilkDayModalProps {
  isOpen: boolean;
  customer: MilkCustomer | null;
  dateISO: string;
  onChangeDateISO: (iso: string) => void;
  reason: string;
  onChangeReason: (r: string) => void;
  conflict: { dateBS: string; existingLiters: number } | null;
  onCancelConflict: () => void;
  onConfirmSave: (overrideConflict?: boolean) => void;
  onClose: () => void;
  language?: Language;
}

export const NoMilkDayModal: React.FC<NoMilkDayModalProps> = ({
  isOpen,
  customer,
  dateISO,
  onChangeDateISO,
  reason,
  onChangeReason,
  conflict,
  onCancelConflict,
  onConfirmSave,
  onClose,
  language = 'ne',
}) => {
  if (!isOpen || !customer) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[65] bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white w-full max-w-md max-h-[94vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-amber-100 bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <div>
              <h3 className="text-sm font-black">दूध गएन (No Milk Day)</h3>
              <p className="text-[11px] text-amber-100 font-bold">{translateUserData(customer.name, language)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 text-xs font-bold text-amber-900">
            कुन मितिमा दूध गएन? (Select date when milk was not supplied)
          </div>

          <NepaliBSDatePicker
            inline
            value={dateISO}
            language={language}
            onChange={(iso) => {
              onCancelConflict();
              onChangeDateISO(iso);
            }}
          />

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              कारण / कैफियत (Reason - Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => onChangeReason(e.target.value)}
              placeholder="उदा. ग्राहक घर बाहिर / चाडपर्व / बिदा"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:border-amber-500 focus:outline-none"
            />
          </div>

          {conflict ? (
            <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2 text-rose-900">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-black">
                    चेतावनी: मिति {localizeNumberString(conflict.dateBS, language)} मा पहिले नै {localizeNumberString(conflict.existingLiters, language)} लिटर दूध रेकर्ड छ!
                  </div>
                  <p className="text-[11px] text-rose-700 font-medium">
                    के तपाईं यो दिनको दूध हटाएर &quot;दूध गएन (० लिटर / रु ०)&quot; मा बदल्न निश्चित हुनुहुन्छ?
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCancelConflict}
                  className="w-1/2 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  रद्द (Keep Milk)
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmSave(true)}
                  className="w-1/2 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs cursor-pointer"
                >
                  हो, दूध गएन सेभ गर्नुहोस्
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                रद्द
              </button>
              <button
                type="button"
                onClick={() => onConfirmSave(false)}
                className="w-2/3 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md active:scale-95 transition cursor-pointer"
              >
                दूध गएन सुरक्षित गर्नुहोस् (Save No Milk)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface EndBillModalProps {
  isOpen: boolean;
  customer: MilkCustomer | null;
  startDateISO?: string;
  onChangeStartDateISO?: (iso: string) => void;
  stopDateISO: string;
  onChangeStopDateISO: (iso: string) => void;
  reason: string;
  onChangeReason: (r: string) => void;
  onConfirmGenerate: () => void;
  onClose: () => void;
  language?: Language;
}

export const EndBillModal: React.FC<EndBillModalProps> = ({
  isOpen,
  customer,
  startDateISO,
  onChangeStartDateISO,
  stopDateISO,
  onChangeStopDateISO,
  reason,
  onChangeReason,
  onConfirmGenerate,
  onClose,
  language = 'ne',
}) => {
  if (!isOpen || !customer) return null;

  const effectiveStartISO = startDateISO || customer.startDate;
  const isInvalidOrder = Boolean(effectiveStartISO && stopDateISO && stopDateISO < effectiveStartISO);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[65] bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white w-full max-w-md max-h-[94vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-rose-100 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <div>
              <h3 className="text-sm font-black">अन्तिम बिल (End Bill / Final Settlement)</h3>
              <p className="text-[11px] text-rose-100 font-bold">{translateUserData(customer.name, language)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3">
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs space-y-1">
            <div className="font-black text-rose-900">
              GAULE DOODH अन्तिम बिल अवधि छान्नुहोस् (Start Date → End Date)
            </div>
            <p className="text-[11px] text-rose-700">
              छानिएको सुरु मिति देखि अन्तिम मितिसम्मको सम्पूर्ण अवधिगत हिसाब, भुक्तानी इतिहास र बाँकी रकम सहितको पारम्परिक बिल तयार हुनेछ।
            </p>
          </div>

          {onChangeStartDateISO && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                सुरु मिति (Billing Start Date - BS)
              </label>
              <NepaliBSDatePicker
                value={effectiveStartISO}
                language={language}
                onChange={(iso) => onChangeStartDateISO(iso)}
                buttonClassName="w-full text-xs"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              अन्तिम मिति (Billing End / Milk Stop Date - BS)
            </label>
            <NepaliBSDatePicker
              inline
              value={stopDateISO}
              language={language}
              onChange={(iso) => onChangeStopDateISO(iso)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              बन्द गर्नुको कारण (Stop Reason)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => onChangeReason(e.target.value)}
              placeholder="उदा. दूध बन्द / बसाइँ सराइ"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:border-rose-500 focus:outline-none"
            />
          </div>

          {isInvalidOrder && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold">
              ⚠️ छानिएको अन्तिम मिति सुरु मिति भन्दा अगाडि छ। कृपया सुरु मिति वा पछिको मिति छान्नुहोस्।
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
            >
              रद्द
            </button>
            <button
              type="button"
              disabled={isInvalidOrder}
              onClick={onConfirmGenerate}
              className="w-2/3 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs shadow-md active:scale-95 transition cursor-pointer"
            >
              अन्तिम मिति पुष्टि र बिल बनाउनुहोस् ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FinalBillViewerModalProps {
  isOpen: boolean;
  bill: MilkFinalBill | null;
  customer: MilkCustomer | null;
  allCustomerPayments: MilkPayment[];
  onCollectPayment: (cust: MilkCustomer) => void;
  onToast?: (msg: string) => void;
  onClose: () => void;
  language?: Language;
}

export const FinalBillViewerModal: React.FC<FinalBillViewerModalProps> = ({
  isOpen,
  bill,
  customer,
  allCustomerPayments,
  onCollectPayment,
  onToast,
  onClose,
  language = 'ne',
}) => {
  if (!isOpen || !bill) return null;

  const custObj: MilkCustomer = customer || {
    id: bill.customerId,
    name: bill.customerName,
    mobile: bill.customerMobile,
    address: bill.customerAddress,
    startDate: bill.startDateISO,
    startBsDate: bill.startDateBS,
    startBsYear: 2083,
    startBsMonth: 1,
    startBsDay: 1,
    morningMilk: 0,
    eveningMilk: 0,
    milkRate: 0,
    status: 'inactive',
    createdAt: bill.generatedAt,
    updatedAt: bill.generatedAt,
  };

  const summary = buildGauleDoodhBillSummary(custObj, bill.startDateISO, bill.endDateISO, {
    billNumber: `GD-FINAL-${bill.id.slice(-5).toUpperCase()}`,
    billTitle: 'अन्तिम दुध हिसाब तथा अन्तिम बिल (FINAL END BILL)',
    includePostEndPayments: true,
    dailyRecordsOverride: customer ? undefined : bill.dailyRecords,
    paymentsOverride: allCustomerPayments,
  });

  const extraAction = (
    <div className="pt-1">
      {customer && summary.finalRemainingDue > 0 ? (
        <button
          type="button"
          onClick={() => {
            onClose();
            onCollectPayment(customer);
          }}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
        >
          <DollarSign className="w-4 h-4" />
          <span>बाँकी भुक्तानी लिनुहोस् (रु {summary.finalRemainingDue.toLocaleString()})</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>ठीक छ (Close)</span>
        </button>
      )}
    </div>
  );

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[75] bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-slate-100 w-full max-w-2xl max-h-[94vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-rose-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {bill.customerPhoto ? (
              <img
                src={bill.customerPhoto}
                alt={bill.customerName}
                className="w-10 h-10 rounded-2xl object-cover border border-white/30 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-lg font-black shrink-0">
                🧾
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-black truncate">
                GAULE DOODH — अन्तिम बिल (FINAL END BILL)
              </h3>
              <p className="text-[11px] text-rose-200 truncate">
                {translateUserData(bill.customerName, language)} • {bill.customerMobile ? localizeNumberString(bill.customerMobile, language) : 'N/A'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body (Traditional Printed Dairy Bill — NO Daily Table) */}
        <div className="p-3 sm:p-4 overflow-y-auto">
          <GauleDoodhTraditionalBill
            summary={summary}
            isFinalEndBill
            onToast={onToast}
            extraActionSlot={extraAction}
          />
        </div>
      </div>
    </div>
  );
};

interface StopResumeModalProps {
  isOpen: boolean;
  customer: MilkCustomer | null;
  reason: string;
  onChangeReason: (r: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  language?: Language;
}

export const StopResumeModal: React.FC<StopResumeModalProps> = ({
  isOpen,
  customer,
  reason,
  onChangeReason,
  onConfirm,
  onClose,
  language = 'ne',
}) => {
  if (!isOpen || !customer) return null;
  const isCurrentlyStopped = customer.status === 'stopped' || customer.status === 'inactive';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[65] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            {isCurrentlyStopped ? (
              <PlayCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <PauseCircle className="w-5 h-5 text-amber-600" />
            )}
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {isCurrentlyStopped ? 'दूध पुनः सुरु गर्नुहोस् (Resume)' : 'दूध अस्थायी बन्द (Pause Milk)'}
              </h3>
              <p className="text-[11px] text-slate-500 font-bold">{translateUserData(customer.name, language)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 font-medium">
          {isCurrentlyStopped
            ? 'यो ग्राहकको दूध आपूर्ति पुनः "Active" अवस्थामा ल्याउन चाहनुहुन्छ? पुराना सबै बिल र हिसाब सुरक्षित रहनेछन्।'
            : 'ग्राहकको दूध अस्थायी रूपमा बन्द (Paused) गर्दा पुराना बिल, भुक्तानी र हिसाब सुरक्षित रहनेछन्।'}
        </p>

        {!isCurrentlyStopped && (
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              बन्द गर्नुको कारण (Reason)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => onChangeReason(e.target.value)}
              placeholder="उदा. गाउँ गएको / केहि दिनको लागि बन्द"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold"
            />
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-1/2 py-2.5 rounded-2xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
          >
            रद्द
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`w-1/2 py-2.5 rounded-2xl text-white text-xs font-black shadow-sm cursor-pointer ${
              isCurrentlyStopped ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {isCurrentlyStopped ? 'सुरु गर्नुहोस् (Resume)' : 'बन्द गर्नुहोस् (Pause)'}
          </button>
        </div>
      </div>
    </div>
  );
};
