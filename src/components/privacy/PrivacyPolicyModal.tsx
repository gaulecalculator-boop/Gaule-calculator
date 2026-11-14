import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  Trash2,
  Lock,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { Language } from '../../types';
import { playTapSound } from '../../utils/audio';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
}

type PolicySectionFilter = 'all' | 'privacy' | 'terms' | 'deletion';

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeSection, setActiveSection] = useState<PolicySectionFilter>('all');

  if (!isOpen) return null;

  const showPrivacy = activeSection === 'all' || activeSection === 'privacy';
  const showTerms = activeSection === 'all' || activeSection === 'terms';
  const showDeletion = activeSection === 'all' || activeSection === 'deletion';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex justify-center items-stretch animate-in fade-in duration-200 overflow-hidden">
      {/* Mobile Shell Frame */}
      <div className="w-full max-w-md h-full bg-white flex flex-col justify-between shadow-2xl relative select-none font-sans overflow-hidden">
        {/* Top Blue Header */}
        <div className="bg-[#2563EB] text-white py-3 px-4 shadow-md flex-shrink-0">
          {/* Title Row */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                playTapSound();
                onClose();
              }}
              className="p-1 -ml-1 text-white hover:bg-white/10 rounded-full transition cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
            </button>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white leading-tight">
                Complete Legal Policies
              </h2>
              <p className="text-[11px] text-blue-100 font-medium leading-tight">
                GAULE CALCULATOR
              </p>
            </div>
          </div>
        </div>

        {/* Content Body (Targeted Element) */}
        <div className="px-4 py-4 space-y-4 flex-1 overflow-y-auto select-text">
          {/* Shield Hero & App Metadata */}
          <div className="text-center pt-1 pb-1">
            <div className="w-14 h-14 mx-auto mb-2 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-14 h-14 text-[#2563EB] fill-current drop-shadow-sm">
                <path d="M50 5 L88 20 C88 55 68 85 50 95 C32 85 12 55 12 20 Z" />
                <rect x="36" y="48" width="28" height="24" rx="4" fill="white" />
                <path d="M42 48 L42 38 C42 33 45 28 50 28 C55 28 58 33 58 38 L58 48" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" />
                <circle cx="50" cy="58" r="3" fill="#2563EB" />
                <path d="M50 61 L50 66" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              GAULE CALCULATOR
            </h3>
            <p className="text-xs text-blue-700 font-bold">
              Complete Legal Policies
            </p>
          </div>

          {/* App Info Summary Card */}
          <div className="p-3.5 rounded-2xl bg-[#EAF2FF] border border-blue-100 text-[11px] text-slate-700 space-y-1 font-medium">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">App Name:</span>
              <span className="font-black text-slate-900">GAULE CALCULATOR</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Developer Name:</span>
              <span className="font-black text-slate-900">RAJAN KUMAR THAKUR</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Effective Date:</span>
              <span className="font-bold text-blue-700">November 13, 2026</span>
            </div>
          </div>

          {/* Section Filter Tabs */}
          <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-2xl text-[10px] font-bold select-none">
            {[
              { id: 'all', label: 'All' },
              { id: 'privacy', label: '1. Privacy' },
              { id: 'terms', label: '2. Terms' },
              { id: 'deletion', label: '3. Deletion' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playTapSound();
                  setActiveSection(tab.id as PolicySectionFilter);
                }}
                className={`py-2 px-1 rounded-xl transition cursor-pointer ${
                  activeSection === tab.id
                    ? 'bg-white text-[#2563EB] shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ========================================================= */}
          {/* 1. PRIVACY POLICY                                         */}
          {/* ========================================================= */}
          {showPrivacy && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1 pt-1">
                <div className="w-7 h-7 rounded-xl bg-[#2563EB] text-white flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-black text-slate-900">
                  1. Privacy Policy
                </h4>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#EAF2FF] border border-blue-100 space-y-3 text-[11px] text-slate-700 leading-relaxed font-medium">
                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">1.1 Introduction</h5>
                  <p>
                    Welcome to GAULE CALCULATOR. Your privacy is important to us. This Privacy Policy explains how your information may be collected, stored, and used when you use our application.
                  </p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">1.2 Information We May Collect</h5>
                  <p>Depending on the features you use, the application may store or process:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Customer names, mobile numbers, and addresses.</li>
                    <li>Milk records, quantities, rates, and payment details.</li>
                    <li>Loan, interest, and transaction records.</li>
                    <li>Photos and documents uploaded by you.</li>
                    <li>Google Account-related information, if you use Google Login or Backup features.</li>
                  </ul>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">1.3 How We Use Your Information</h5>
                  <p>Your information may be used to:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Maintain customer and dairy records.</li>
                    <li>Calculate milk quantities and payments.</li>
                    <li>Maintain loan and interest records.</li>
                    <li>Generate bills and payment receipts.</li>
                    <li>Provide backup and synchronization features, where available.</li>
                    <li>Improve application functionality and security.</li>
                  </ul>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">1.4 Data Storage and Google Services</h5>
                  <p>Your information may be stored on your device or processed through services used by the application.</p>
                  <p>
                    If Google Login, Firebase, or Google Drive Backup features are implemented and used, relevant information may be processed through those services under their respective privacy policies and terms.
                  </p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">1.5 Data Security</h5>
                  <p>
                    We make reasonable efforts to protect your information using appropriate technical measures. However, no digital storage or internet transmission method can be guaranteed to be completely secure.
                  </p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">1.6 Sharing of Information</h5>
                  <p>
                    We do not intend to sell your personal information. Information may be processed by service providers when necessary to operate application features or disclosed when required by applicable law.
                  </p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">1.7 Children&apos;s Privacy</h5>
                  <p>
                    Children should use this application with permission and guidance from a parent or legal guardian.
                  </p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">1.8 Changes to This Privacy Policy</h5>
                  <p>
                    We may update this Privacy Policy from time to time. Updated versions will be made available within the application or through its official policy page.
                  </p>
                </div>

                <div className="space-y-1 pt-1 border-t border-blue-200/70">
                  <h5 className="text-xs font-black text-slate-900">1.9 Contact Information</h5>
                  <p>Developer: <strong className="text-slate-900">RAJAN KUMAR THAKUR</strong></p>
                  <p>App Name: <strong className="text-slate-900">GAULE CALCULATOR</strong></p>
                  <p>
                    WhatsApp:{' '}
                    <a
                      href="https://wa.me/9779845723493"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 font-bold underline"
                    >
                      +9779845723493
                    </a>
                  </p>
                  <p className="break-all">
                    Facebook:{' '}
                    <a
                      href="https://www.facebook.com/profile.php?id=61596389766576"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 font-bold underline"
                    >
                      https://www.facebook.com/profile.php?id=61596389766576
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. TERMS & CONDITIONS                                     */}
          {/* ========================================================= */}
          {showTerms && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1 pt-1">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-black text-slate-900">
                  2. Terms &amp; Conditions
                </h4>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-[11px] text-slate-700 leading-relaxed font-medium">
                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">2.1 Acceptance of Terms</h5>
                  <p>
                    By downloading, installing, or using GAULE CALCULATOR, you agree to these Terms &amp; Conditions.
                  </p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">2.2 Purpose of the Application</h5>
                  <p>GAULE CALCULATOR is designed to help users manage everyday calculations and records, including:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Milk and dairy records.</li>
                    <li>Customer information.</li>
                    <li>Payments and receipts.</li>
                    <li>Loans and interest calculations.</li>
                    <li>Banking and financial calculations.</li>
                    <li>Other daily record-keeping activities.</li>
                  </ul>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">2.3 User Responsibilities</h5>
                  <p>
                    You are responsible for entering accurate information, including names, dates, quantities, rates, payments, and other records.
                  </p>
                  <p>
                    Incorrect information may result in incorrect calculations or reports.
                  </p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">2.4 Verification of Calculations</h5>
                  <p>
                    Users should independently verify important calculations, bills, receipts, interest amounts, and financial records before relying on them.
                  </p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">2.5 No Financial or Investment Advice</h5>
                  <p>
                    Calculations related to banking, SIP, loans, interest, or investments are provided for calculation and record-keeping purposes only. They do not constitute financial, banking, legal, or investment advice.
                  </p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">2.6 Data and Backup</h5>
                  <p>
                    Users are responsible for keeping appropriate backups of important records. Google Account, Cloud Backup, or synchronization features, where available, are subject to their availability and the terms of the relevant service providers.
                  </p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">2.7 Prohibited Use</h5>
                  <p>Users must not use the application for:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Illegal activities or fraud.</li>
                    <li>Unauthorized use of another person&apos;s information.</li>
                    <li>Activities that harm the application or its services.</li>
                    <li>Any purpose prohibited by applicable law.</li>
                  </ul>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">2.8 Application Changes</h5>
                  <p>
                    The developer may update, modify, add, or remove application features when necessary.
                  </p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">2.9 Limitation of Liability</h5>
                  <p>
                    To the extent permitted by applicable law, the developer shall not be responsible for losses arising from incorrect user-entered data, calculation errors, device failure, data loss, or interruptions in third-party services.
                  </p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">2.10 Changes to These Terms</h5>
                  <p>
                    These Terms &amp; Conditions may be updated from time to time. Updated terms will be published within the application or on its official policy page.
                  </p>
                </div>

                <div className="space-y-1 pt-1 border-t border-slate-200">
                  <h5 className="text-xs font-black text-slate-900">2.11 Contact Information</h5>
                  <p>Developer: <strong className="text-slate-900">RAJAN KUMAR THAKUR</strong></p>
                  <p>App Name: <strong className="text-slate-900">GAULE CALCULATOR</strong></p>
                  <p>
                    WhatsApp:{' '}
                    <a
                      href="https://wa.me/9779845723493"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 font-bold underline"
                    >
                      +9779845723493
                    </a>
                  </p>
                  <p className="break-all">
                    Facebook:{' '}
                    <a
                      href="https://www.facebook.com/profile.php?id=61596389766576"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 font-bold underline"
                    >
                      https://www.facebook.com/profile.php?id=61596389766576
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. DATA DELETION POLICY                                   */}
          {/* ========================================================= */}
          {showDeletion && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1 pt-1">
                <div className="w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-black text-slate-900">
                  3. Data Deletion Policy
                </h4>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-3 text-[11px] text-slate-700 leading-relaxed font-medium">
                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">3.1 Purpose</h5>
                  <p>
                    This Data Deletion Policy explains how users of GAULE CALCULATOR can request the deletion of their personal information and application records.
                  </p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">3.2 How to Request Data Deletion</h5>
                  <p>
                    If you want your information deleted, contact the developer using one of the following methods:
                  </p>
                  <p>
                    WhatsApp:{' '}
                    <a
                      href="https://wa.me/9779845723493"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 font-bold underline"
                    >
                      +9779845723493
                    </a>
                  </p>
                  <p className="break-all">
                    Facebook:{' '}
                    <a
                      href="https://www.facebook.com/profile.php?id=61596389766576"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 font-bold underline"
                    >
                      https://www.facebook.com/profile.php?id=61596389766576
                    </a>
                  </p>
                  <p>Please include the application name and details of the data you want deleted.</p>
                  <p className="text-rose-800 font-bold flex items-center gap-1.5 bg-white/80 p-2 rounded-xl border border-rose-200">
                    <Lock className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                    <span>For your security, never share your password or OTP.</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">3.3 Types of Data That May Be Deleted</h5>
                  <p>Depending on technical availability and applicable legal requirements, deletion may include:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Customer and personal records.</li>
                    <li>Milk and dairy records.</li>
                    <li>Payment and transaction history.</li>
                    <li>Loan and interest records.</li>
                    <li>Uploaded photos and documents.</li>
                    <li>Available cloud backup or account-related data.</li>
                  </ul>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">3.4 Data Deletion Process</h5>
                  <p>
                    The developer will review your request and explain the available deletion process. Deletion may take a reasonable amount of time.
                  </p>
                  <p>
                    Data stored by third-party service providers may also be subject to their deletion procedures and policies.
                  </p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">3.5 Backup and Legal Retention</h5>
                  <p>
                    Some information may remain in backup copies for a limited period or may need to be retained where required by applicable law.
                  </p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-black text-slate-900">3.6 Uninstalling the Application</h5>
                  <p>
                    Uninstalling GAULE CALCULATOR does not necessarily delete information stored in a Google Account, cloud backup, or external server. A separate deletion request may be necessary.
                  </p>
                </div>

                <div className="space-y-1 pt-1 border-t border-rose-200">
                  <h5 className="text-xs font-black text-slate-900">3.7 Contact Information</h5>
                  <p>Developer: <strong className="text-slate-900">RAJAN KUMAR THAKUR</strong></p>
                  <p>App Name: <strong className="text-slate-900">GAULE CALCULATOR</strong></p>
                  <p>
                    WhatsApp:{' '}
                    <a
                      href="https://wa.me/9779845723493"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 font-bold underline"
                    >
                      +9779845723493
                    </a>
                  </p>
                  <p className="break-all">
                    Facebook:{' '}
                    <a
                      href="https://www.facebook.com/profile.php?id=61596389766576"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 font-bold underline"
                    >
                      https://www.facebook.com/profile.php?id=61596389766576
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Developer Support Card */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2.5">
            <div>
              <h5 className="text-xs font-black tracking-wide">GAULE CALCULATOR</h5>
              <p className="text-[11px] text-slate-300 font-medium">
                Developed by: <strong className="text-white">RAJAN KUMAR THAKUR</strong>
              </p>
            </div>
            <div className="flex flex-col gap-2 text-[11px] font-bold">
              <a
                href="https://wa.me/9779845723493"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition"
              >
                <span className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Support: +9779845723493</span>
                </span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61596389766576"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition"
              >
                <span className="flex items-center gap-2 truncate">
                  <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Facebook Official Profile</span>
                </span>
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer with Effective Date */}
        <div className="p-3.5 text-center border-t border-slate-100 flex-shrink-0 bg-white">
          <p className="text-[10px] text-slate-400 font-medium">
            Effective Date: November 13, 2026 • GAULE CALCULATOR
          </p>
        </div>
      </div>
    </div>
  );
};
