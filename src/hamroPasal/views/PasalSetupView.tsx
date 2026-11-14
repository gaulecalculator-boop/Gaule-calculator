/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * First-Time Shop Setup View — Hamro Pasal
 * Professional onboarding form asking for Shop Name, Owner, Mobile, Address,
 * Business Type (10 Categories), PAN/VAT, and preferences.
 */

import React, { useState } from 'react';
import {
  Store,
  User,
  Phone,
  MapPin,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { ShopProfile, BusinessType } from '../types';
import { Language } from '../../types';
import { BUSINESS_TYPE_OPTIONS } from '../data/defaultMenu';
import { pasalStorage } from '../storage/pasalStorage';
import { pasalFirestoreSync } from '../storage/pasalFirestoreSync';
import { playTapSound, playSuccessSound } from '../../utils/audio';
import { pick5 } from '../../utils/i18nHelper';

interface PasalSetupViewProps {
  language?: Language;
  onSetupComplete: (shop: ShopProfile) => void;
  onCancel?: () => void;
  existingShop?: ShopProfile | null;
}

export const PasalSetupView: React.FC<PasalSetupViewProps> = ({
  language: appLanguage = 'ne',
  onSetupComplete,
  onCancel,
  existingShop,
}) => {
  const p = (en: string, hi: string, bho: string, mai: string, ne: string, ctx = 'PasalSetupView') =>
    pick5(appLanguage, { en, hi, bho, mai, ne }, ctx);

  const [shopName, setShopName] = useState<string>(existingShop?.name || '');
  const [ownerName, setOwnerName] = useState<string>(existingShop?.ownerName || '');
  const [mobile, setMobile] = useState<string>(existingShop?.mobile || '');
  const [address, setAddress] = useState<string>(existingShop?.address || '');
  const [businessType, setBusinessType] = useState<BusinessType>(existingShop?.businessType || 'hotel_restaurant');
  const [panNumber, setPanNumber] = useState<string>(existingShop?.panNumber || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      setError(p('Please enter shop or business name', 'कृपया दुकान या व्यवसाय का नाम लिखें', 'कृपया दोकान भा कारोबार के नाम लिखीं', 'कृपया दोकान वा व्यवसाय के नाम लिखू', 'कृपया पसल वा व्यवसायको नाम लेख्नुहोस्'));
      return;
    }
    if (!ownerName.trim()) {
      setError(p('Please enter owner name', 'कृपया मालिक का नाम लिखें', 'कृपया मालिक के नाम लिखीं', 'कृपया मालिक के नाम लिखू', 'कृपया सञ्चालकको नाम लेख्नुहोस्'));
      return;
    }
    if (!mobile.trim()) {
      setError(p('Please enter mobile number', 'कृपया मोबाइल नंबर लिखें', 'कृपया मोबाइल नम्बर लिखीं', 'कृपया मोबाइल नम्बर लिखू', 'कृपया मोबाइल नम्बर लेख्नुहोस्'));
      return;
    }

    const shopLang: 'ne' | 'hi' | 'en' = appLanguage === 'en' ? 'en' : appLanguage === 'ne' ? 'ne' : 'hi';
    const shopToSave: ShopProfile = {
      id: existingShop?.id || 'shop_' + Date.now(),
      name: shopName.trim(),
      ownerName: ownerName.trim(),
      mobile: mobile.trim(),
      address: address.trim() || p('Local', 'स्थानीय', 'स्थानीय', 'स्थानीय', 'नेपाल'),
      businessType,
      panNumber: panNumber.trim() || undefined,
      currency: 'NPR',
      language: shopLang,
      vatPercent: 0,
      serviceChargePercent: 0,
      createdAt: existingShop?.createdAt || Date.now(),
      updatedAt: Date.now(),
      ownerUid: 'local_user',
    };

    const saved = pasalStorage.saveShop(shopToSave, !existingShop);
    pasalFirestoreSync.syncShopToCloud(saved);
    playSuccessSound();
    onSetupComplete(saved);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-800 p-3 sm:p-5 flex items-center justify-center font-sans antialiased">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-6 relative overflow-hidden select-none">
          <div className="relative z-10 flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md p-1 border border-white/20 flex items-center justify-center text-3xl shadow-md flex-shrink-0">
              🏪
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-xl tracking-tight">
                  {p('MY SHOP KHATA', 'हमारा दुकान खाता', 'हमर दोकान खाता', 'हमर दोकान खाता', 'हाम्रो पसल')}
                </h1>
                <span className="text-[10px] bg-amber-400 text-slate-900 font-extrabold px-2 py-0.5 rounded-full uppercase">
                  {p('Setup', 'सेटअप', 'सेटअप', 'सेटअप', 'सेटअप')}
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium mt-0.5">
                {existingShop
                  ? p('Edit shop details', 'दुकान का विवरण संपादित करें', 'दोकान के विवरण सुधारीं', 'दोकानक विवरण सुधारू', 'पसलको विवरण सम्पादन गर्नुहोस्')
                  : p('Register your shop or restaurant', 'अपनी दुकान या रेस्टोरेंट रजिस्टर करें', 'आपन दोकान भा रेस्टुरेन्ट दर्ज करीं', 'अपन दोकान वा रेस्टुरेन्ट दर्ज करू', 'आफ्नो पसल वा रेस्टुरेन्ट दर्ता गर्नुहोस्')}
              </p>
            </div>
          </div>
          {/* Subtle background graphic */}
          <div className="absolute right-4 -bottom-4 text-7xl opacity-15 select-none pointer-events-none">
            🛍️
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          {/* 1. Basic Shop Info */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {p('Shop / Business Name', 'दुकान / व्यवसाय का नाम', 'दोकान / कारोबार के नाम', 'दोकान / व्यवसायक नाम', 'पसल / व्यवसायको नाम')}{' '}
                  <strong className="text-rose-500">*</strong>
                </span>
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => {
                  setShopName(e.target.value);
                  setError(null);
                }}
                placeholder={p('e.g. Shrestha Kirana Store', 'उदा: ठाकुर किराना स्टोर', 'जइसे: ठाकुर किराना दोकान', 'जेना: ठाकुर किराना दोकान', 'उदा: श्रेष्ठ किराना पसल')}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {p('Owner Name', 'मालिक का नाम', 'मालिक के नाम', 'मालिकक नाम', 'सञ्चालकको नाम')}{' '}
                    <strong className="text-rose-500">*</strong>
                  </span>
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder={p('Your name', 'आपका नाम', 'राउर नाम', 'अहाँक नाम', 'तपाईंको नाम')}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {p('Mobile Number', 'मोबाइल नंबर', 'मोबाइल नम्बर', 'मोबाइल नम्बर', 'सम्पर्क मोबाइल')}{' '}
                    <strong className="text-rose-500">*</strong>
                  </span>
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="98xxxxxxxx"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>{p('Shop Address', 'दुकान का पता', 'दोकान के पता', 'दोकानक पता', 'पसलको ठेगाना')}</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={p('City / Village', 'शहर / गाँव', 'गाँव / शहर', 'गाम / शहर', 'ठेगाना')}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:bg-white focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  <span>{p('PAN / VAT No. (Optional)', 'PAN / VAT नंबर (ऐच्छिक)', 'PAN / VAT नम्बर (जरूरी नइखे)', 'PAN / VAT नम्बर (ऐच्छिक)', 'PAN / VAT नम्बर (ऐच्छिक)')}</span>
                </label>
                <input
                  type="text"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value)}
                  placeholder={p('PAN No. (Optional)', 'PAN नंबर (ऐच्छिक)', 'PAN नम्बर', 'PAN नम्बर', 'PAN नम्बर (ऐच्छिक)')}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:bg-white focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* 2. Business Type Selector (10 Specific Categories) */}
          <div className="pt-2">
            <label className="block text-xs font-black text-slate-800 mb-2">
              {p('Select Business Category:', 'व्यवसाय का प्रकार चुनें:', 'कारोबार के किसिम चुनीं:', 'व्यवसायक प्रकार चुनू:', 'व्यवसायको प्रकार छान्नुहोस्:')}
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
              {BUSINESS_TYPE_OPTIONS.map((cat) => {
                const isSelected = businessType === cat.id;
                const title = pick5(
                  appLanguage,
                  { en: cat.titleEn, hi: cat.titleHi, bho: cat.titleBho, mai: cat.titleMai, ne: cat.titleNe },
                  `BusinessType.title.${cat.id}`
                );
                const desc = pick5(
                  appLanguage,
                  { en: cat.descEn, hi: cat.descHi, bho: cat.descBho, mai: cat.descMai, ne: cat.description },
                  `BusinessType.desc.${cat.id}`
                );
                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      playTapSound();
                      setBusinessType(cat.id);
                    }}
                    className={`p-2.5 rounded-2xl border transition cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                        : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <span className="text-2xl flex-shrink-0">{cat.icon}</span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs text-slate-900 leading-tight">{title}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              {error}
            </p>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center gap-3">
            <button
              type="submit"
              className="flex-1 py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-sm shadow-lg shadow-blue-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                {existingShop
                  ? p('Update Shop Details', 'विवरण अपडेट करें', 'विवरण अपडेट करीं', 'विवरण अपडेट करू', 'विवरण अद्यावधिक गर्नुहोस्')
                  : p('Start Shop', 'दुकान शुरू करें', 'दोकान सुरु करीं', 'दोकान शुरू करू', 'पसल सुरु गर्नुहोस्')}
              </span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  onCancel();
                }}
                className="py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs cursor-pointer"
              >
                {p('Cancel', 'रद्द करें', 'बंद करीं', 'रद्द करू', 'रद्द')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
