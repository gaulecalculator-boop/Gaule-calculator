/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HAMRO PASAL (हाम्रो पसल) — Master Application Shell
 * Completely separate shop management module inside Ghaule Calculator APK.
 * 
 * Tabs:
 * 1. 🍽️ अर्डर (Fast Restaurant / Retail POS)
 * 2. 📖 ग्राहक खाता (Customer Search & Permanent Ledger)
 * 3. 📊 ड्यासबोर्ड (Real-time Analytics & Sales)
 * 4. 📦 मेनु / सामान (Menu & Inventory)
 * 5. 💰 खर्च / नाफा (Expenses & Profit)
 * 6. ⚙️ पसल सेटिङ (Shop Settings & Test Suite)
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ShopProfile } from '../types';
import { Language } from '../../types';
import { pasalStorage } from '../storage/pasalStorage';
import { pasalFirestoreSync } from '../storage/pasalFirestoreSync';
import { PasalSetupView } from './PasalSetupView';
import { UdharKhataView } from './UdharKhataView';
import { playTapSound } from '../../utils/audio';
import { pick5 } from '../../utils/i18nHelper';
import { translateUserData } from '../../utils/universalTranslator';

interface PasalMainViewProps {
  language?: Language;
  onReturnToCalculator: () => void;
}

export const PasalMainView: React.FC<PasalMainViewProps> = ({
  language = 'ne',
  onReturnToCalculator,
}) => {
  const [activeShop, setActiveShop] = useState<ShopProfile | null>(pasalStorage.getActiveShop());
  const [isEditingShop, setIsEditingShop] = useState<boolean>(false);

  const p = (en: string, hi: string, bho: string, mai: string, ne: string, ctx = 'PasalMainView') =>
    pick5(language, { en, hi, bho, mai, ne }, ctx);

  useEffect(() => {
    const unsub = pasalStorage.subscribe(() => {
      setActiveShop(pasalStorage.getActiveShop());
    });
    return unsub;
  }, []);

  // Live Cloud sync when shop is active
  useEffect(() => {
    if (activeShop) {
      pasalFirestoreSync.startLiveShopSync(activeShop.id, () => {
        setActiveShop(pasalStorage.getActiveShop());
      });
    }
    return () => {
      pasalFirestoreSync.stopLiveShopSync();
    };
  }, [activeShop?.id]);

  // If no shop exists yet, show setup view first
  if (!activeShop || isEditingShop) {
    return (
      <PasalSetupView
        language={language}
        existingShop={activeShop}
        onSetupComplete={(shop) => {
          setActiveShop(shop);
          setIsEditingShop(false);
        }}
        onCancel={activeShop ? () => setIsEditingShop(false) : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center items-start text-slate-800 font-sans antialiased">
      {/* Mobile Shell Container */}
      <div className="w-full max-w-xl min-h-screen bg-[#F4F6F9] flex flex-col shadow-2xl relative overflow-x-hidden">
        {/* HAMRO PASAL DEDICATED HEADER */}
        <header className="relative w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white shadow-md z-30 select-none">
          <div className="flex items-center justify-between px-3.5 pt-3 pb-2.5">
            {/* Left: Return to Calculator Button + Shop Brand */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => {
                  playTapSound();
                  onReturnToCalculator();
                }}
                className="p-1.5 -ml-1 text-white hover:bg-white/10 active:scale-95 rounded-xl transition flex items-center gap-1 bg-white/10 text-xs font-bold"
                title={p('Return to Calculator', 'कैलकुलेटर पर वापस जाएं', 'कैलकुलेटर पर वापस जाईं', 'कैलकुलेटर पर वापस जाउ', 'क्याल्कुलेटरमा फर्कनुहोस्')}
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">{p('Calculator', 'कैलकुलेटर', 'कैलकुलेटर', 'कैलकुलेटर', 'क्याल्कुलेटर')}</span>
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white/15 p-1 border border-white/20 flex items-center justify-center text-lg shadow-xs flex-shrink-0">
                  📕
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm font-black text-white leading-tight truncate">
                    {translateUserData(activeShop.name, language)}
                  </h1>
                  <p className="text-[10px] text-blue-200 font-medium leading-none truncate">
                    {p('My Shop • Udhar Khata', 'हमारा दुकान • उधार खाता', 'हमर दोकान • उधार खाता', 'हमर दोकान • उधार खाता', 'हाम्रो पसल • उधार खाता')}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Edit Shop + Quick Return to Calculator Button */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => {
                  playTapSound();
                  setIsEditingShop(true);
                }}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition text-xs flex items-center gap-1 font-bold"
                title={p('Edit shop details', 'दुकान विवरण सुधारें', 'दोकान के विवरण सुधारीं', 'दोकानक विवरण सुधारू', 'पसल विवरण सच्याउनुहोस्')}
              >
                <span>⚙️</span>
                <span className="hidden sm:inline text-[10px]">{p('Settings', 'सेटिंग्स', 'सेटिंग', 'सेटिंग्स', 'सेटिङ')}</span>
              </button>
              <button
                onClick={() => {
                  playTapSound();
                  onReturnToCalculator();
                }}
                className="py-1 px-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-900 text-[11px] font-black shadow-xs transition active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <span>🧮</span>
                <span>{p('Calculator', 'कैलकुलेटर', 'कैलकुलेटर', 'कैलकुलेटर', 'क्याल्कुलेटर')}</span>
              </button>
            </div>
          </div>
        </header>

        {/* MAIN BODY VIEW: DIRECT UDHAR KHATA */}
        <main className="flex-1 p-3.5">
          <UdharKhataView shop={activeShop} appLanguage={language} />
        </main>
      </div>
    </div>
  );
};
