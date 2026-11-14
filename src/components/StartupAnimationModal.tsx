import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { playStartupFanfare, playTapSound } from '../utils/audio';
import { Sparkles, X, RotateCw, Check } from 'lucide-react';
import { Language } from '../types';

interface StartupAnimationModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const StartupAnimationModal: React.FC<StartupAnimationModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [animStage, setAnimStage] = useState(0);

  const triggerCelebration = () => {
    setAnimStage(0);
    playStartupFanfare();

    setTimeout(() => setAnimStage(1), 100);
    setTimeout(() => setAnimStage(2), 600);
    setTimeout(() => {
      setAnimStage(3);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563EB', '#00C853', '#F59E0B', '#DC2626', '#8B5CF6'],
      });
    }, 1100);
  };

  useEffect(() => {
    if (isOpen) {
      triggerCelebration();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 text-center text-white shadow-2xl border border-blue-500/30 overflow-hidden">
        {/* Ambient glow in background */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-blue-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={() => {
            playTapSound();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 3D App Icon Scene */}
        <div className="py-8 perspective-1000 flex items-center justify-center">
          <div
            className={`w-36 h-36 rounded-3xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-700 p-2.5 shadow-[0_20px_50px_rgba(29,78,216,0.6)] border-2 border-blue-300/40 transform transition-all duration-700 ${
              animStage === 0
                ? 'scale-0 rotate-[-45deg] opacity-0'
                : animStage === 1
                ? 'scale-110 rotate-[12deg] opacity-90'
                : animStage === 2
                ? 'scale-95 rotate-[-6deg] opacity-100'
                : 'scale-100 rotate-0 opacity-100 hover:rotate-2'
            }`}
            style={{
              transformStyle: 'preserve-3d',
              willChange: 'transform',
            }}
          >
            {/* Screen on 3D calc */}
            <div className="w-full h-10 rounded-xl bg-slate-900/90 border border-blue-400/40 flex items-center justify-between px-2 mb-2 text-emerald-400 font-mono text-xs font-bold">
              <span className="text-[10px] text-blue-300">GHAULE 3D</span>
              <span className="animate-pulse">रु 1,15,000</span>
            </div>

            {/* Glowing Keys Grid */}
            <div className="grid grid-cols-4 gap-1.5 text-center text-white text-[11px] font-bold">
              <span className="p-1 rounded-md bg-blue-400/30">7</span>
              <span className="p-1 rounded-md bg-blue-400/30">8</span>
              <span className="p-1 rounded-md bg-blue-400/30">9</span>
              <span className="p-1 rounded-md bg-amber-500/80">÷</span>
              <span className="p-1 rounded-md bg-blue-400/30">4</span>
              <span className="p-1 rounded-md bg-blue-400/30">5</span>
              <span className="p-1 rounded-md bg-blue-400/30">6</span>
              <span className="p-1 rounded-md bg-amber-500/80">×</span>
              <span className="p-1 rounded-md bg-blue-400/30">1</span>
              <span className="p-1 rounded-md bg-blue-400/30">2</span>
              <span className="p-1 rounded-md bg-blue-400/30">3</span>
              <span className="p-1 rounded-md bg-emerald-500 row-span-2 flex items-center justify-center font-extrabold text-sm shadow-md shadow-emerald-500/50">
                =
              </span>
              <span className="col-span-2 p-1 rounded-md bg-blue-600/60">0</span>
              <span className="p-1 rounded-md bg-blue-400/30">.</span>
            </div>
          </div>
        </div>

        {/* Title & Badge */}
        <div className="space-y-1.5 mb-6">
          <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[11px] font-extrabold px-3 py-0.5 rounded-full shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>3D SMART HUB</span>
          </div>
          <h2 className="text-2xl font-black tracking-wide bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
            GHAULE CALCULATOR
          </h2>
          <p className="text-xs text-blue-200">
            {language === 'ne'
              ? 'नेपालको पहिलो १००% अफलाइन स्मार्ट क्याल्कुलेटर हब'
              : language === 'hi'
              ? '१००% ऑफलाइन स्मार्ट कैलकुलेटर हब'
              : 'Nepal’s #1 All-in-One Offline Smart Calculator Hub'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              playTapSound();
              triggerCelebration();
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{language === 'ne' ? 'पुन: एनिमेसन' : language === 'hi' ? 'पुन: एनिमेशन' : 'Replay 3D Intro'}</span>
          </button>
          <button
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{language === 'ne' ? 'सुरु गरौं' : language === 'hi' ? 'शुरू करें' : 'Continue'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
