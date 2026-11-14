/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Shop Settings & Test Suite Runner — Hamro Pasal
 * Allows editing shop profile, business type, testing Raju scenarios, and returning to calculator.
 */

import React, { useState } from 'react';
import {
  Settings,
  Store,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { ShopProfile } from '../types';
import { runPasalTestSuite, TestResult } from '../tests/pasalTestSuite';
import { pasalStorage } from '../storage/pasalStorage';
import { playTapSound, playSuccessSound } from '../../utils/audio';

interface PasalSettingsViewProps {
  shop: ShopProfile;
  onEditShop: () => void;
  onReturnToCalculator: () => void;
}

export const PasalSettingsView: React.FC<PasalSettingsViewProps> = ({
  shop,
  onEditShop,
  onReturnToCalculator,
}) => {
  const [testResults, setTestResults] = useState<{
    allPassed: boolean;
    results: TestResult[];
  } | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const handleRunTests = () => {
    playTapSound();
    setIsRunningTests(true);
    setTimeout(() => {
      const res = runPasalTestSuite();
      setTestResults(res);
      setIsRunningTests(false);
      if (res.allPassed) {
        playSuccessSound();
      }
    }, 250);
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* Return to Ghaule Calculator Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/15 p-1 border border-white/20 flex items-center justify-center text-2xl">
            🧮
          </div>
          <div>
            <h3 className="font-extrabold text-sm leading-tight">Ghaule Calculator मा फर्कनुहोस्</h3>
            <p className="text-[11px] text-blue-100 font-medium">ब्याज, दूध, जग्गा तथा २८+ क्याल्कुलेटरहरू खोल्न यहाँ थिच्नुहोस्</p>
          </div>
        </div>

        <button
          onClick={() => {
            playTapSound();
            onReturnToCalculator();
          }}
          className="px-4 py-2.5 rounded-2xl bg-white text-blue-800 hover:bg-blue-50 active:scale-95 font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4 stroke-[3]" />
          <span>क्याल्कुलेटर खोल्नुहोस्</span>
        </button>
      </div>

      {/* Shop Profile Details Card */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
            <Store className="w-4 h-4 text-blue-600" />
            <span>पसल प्रोफाइल (Shop Profile)</span>
          </span>
          <button
            onClick={() => {
              playTapSound();
              onEditShop();
            }}
            className="text-xs font-extrabold text-blue-600 hover:underline"
          >
            सम्पादन गर्नुहोस् (Edit) ›
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] text-slate-400 font-bold uppercase">पसलको नाम</p>
            <p className="font-black text-slate-900 mt-0.5">{shop.name}</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] text-slate-400 font-bold uppercase">सञ्चालक</p>
            <p className="font-black text-slate-900 mt-0.5">{shop.ownerName}</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] text-slate-400 font-bold uppercase">सम्पर्क नम्बर</p>
            <p className="font-black text-slate-900 mt-0.5">{shop.mobile}</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <p className="text-[10px] text-slate-400 font-bold uppercase">व्यवसायको प्रकार</p>
            <p className="font-black text-blue-700 mt-0.5 uppercase">{shop.businessType.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Automated System Test Suite (Verifies TEST 1 to TEST 8 including Raju scenarios) */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧪</span>
            <div>
              <h3 className="font-extrabold text-xs text-slate-900">
                स्वचालित परीक्षण प्रणाली (Automated Test Suite)
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Test 1 देखि Test 8 सम्मका सबै ग्राहक र हिसाब परीक्षण गर्नुहोस्
              </p>
            </div>
          </div>

          <button
            onClick={handleRunTests}
            disabled={isRunningTests}
            className="py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{isRunningTests ? 'परीक्षण हुँदै...' : 'परीक्षण सुरु (Run Tests)'}</span>
          </button>
        </div>

        {/* Test Results Display */}
        {testResults && (
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div
              className={`p-3 rounded-2xl font-black text-xs flex items-center justify-between ${
                testResults.allPassed
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border border-rose-300'
              }`}
            >
              <span>{testResults.allPassed ? '✅ सबै ८ वटा परीक्षणहरू सफल भए!' : '⚠️ केही परीक्षण असफल भए'}</span>
              <span>{testResults.results.filter((r) => r.passed).length} / {testResults.results.length} PASSED</span>
            </div>

            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {testResults.results.map((res) => (
                <div
                  key={res.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] flex items-start justify-between gap-2"
                >
                  <div>
                    <p className="font-bold text-slate-900">{res.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{res.details}</p>
                  </div>
                  <span className="font-black text-xs flex-shrink-0">
                    {res.passed ? '🟢 PASS' : '🔴 FAIL'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
