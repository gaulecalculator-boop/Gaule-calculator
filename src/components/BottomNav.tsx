import React from 'react';
import { Home, LayoutGrid, Clock, Settings, BookOpen } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../data/translations';
import { playTapSound } from '../utils/audio';

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  language: Language;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate, language }) => {
  const t = translations[language];

  const handleNav = (view: string) => {
    playTapSound();
    onNavigate(view);
  };

  const isHome = currentView === 'home';
  const isTools = currentView === 'tools' || currentView.startsWith('tool_');
  const isNotebook = currentView === 'notebook';
  const isHistory = currentView === 'history';
  const isSettings = currentView === 'settings';

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200/80 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-40 max-w-md mx-auto">
      <div className="relative flex items-center justify-around h-16 px-1">
        {/* 1. Home */}
        <button
          onClick={() => handleNav('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            isHome ? 'text-[#1D4ED8]' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className={`w-5 h-5 ${isHome ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[11px] mt-0.5 ${isHome ? 'font-bold' : 'font-medium'}`}>
            {t.home}
          </span>
          {isHome && (
            <span className="w-4 h-1 bg-[#1D4ED8] rounded-full mt-0.5 animate-in fade-in" />
          )}
        </button>

        {/* 2. Tools */}
        <button
          onClick={() => handleNav('tools')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            isTools ? 'text-[#1D4ED8]' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutGrid className={`w-5 h-5 ${isTools ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[11px] mt-0.5 ${isTools ? 'font-bold' : 'font-medium'}`}>
            {t.tools}
          </span>
          {isTools && (
            <span className="w-4 h-1 bg-[#1D4ED8] rounded-full mt-0.5 animate-in fade-in" />
          )}
        </button>

        {/* 3. Simple Notebook - Center Elevated Button */}
        <div className="relative flex-1 flex flex-col items-center justify-center -top-4">
          <button
            onClick={() => handleNav('notebook')}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 border-[3px] border-white ${
              isNotebook
                ? 'bg-gradient-to-tr from-[#1D4ED8] via-[#2563EB] to-[#06B6D4] shadow-blue-500/40 ring-2 ring-blue-400'
                : 'bg-gradient-to-tr from-[#2563EB] via-[#3B82F6] to-[#38BDF8] shadow-blue-400/30'
            }`}
            aria-label={
              language === 'ne'
                ? '३ नोटबुक (पसल • दुध • ब्याज)'
                : language === 'hi'
                ? '३ नोटबुक (दुकान • दूध • ब्याज)'
                : language === 'bho'
                ? '३ किताब (दोकान • दूध • ब्याज)'
                : language === 'mai'
                ? '३ पोथी (दोकान • दूध • ब्याज)'
                : '3 Notebooks (Shop • Milk • Interest)'
            }
            title={
              language === 'ne'
                ? '३ नोटबुक (पसल • दुध • ब्याज)'
                : language === 'hi'
                ? '३ नोटबुक (दुकान • दूध • ब्याज)'
                : language === 'bho'
                ? '३ किताब (दोकान • दूध • ब्याज)'
                : language === 'mai'
                ? '३ पोथी (दोकान • दूध • ब्याज)'
                : '3 Notebooks (Shop • Milk • Interest)'
            }
          >
            <div className="relative flex items-center justify-center">
              <span className="text-2xl filter drop-shadow">📒</span>
            </div>
          </button>
          <span
            className={`text-[10px] mt-1 whitespace-nowrap leading-none ${
              isNotebook ? 'text-[#1D4ED8] font-bold' : 'text-slate-600 font-medium'
            }`}
          >
            {language === 'ne'
              ? '३ खाता नोटबुक'
              : language === 'hi'
              ? '३ नोटबुक खाता'
              : language === 'bho'
              ? '३ खाता किताब'
              : language === 'mai'
              ? '३ खाता पोथी'
              : '3 Notebooks'}
          </span>
        </div>

        {/* 4. History */}
        <button
          onClick={() => handleNav('history')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            isHistory ? 'text-[#1D4ED8]' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className={`w-5 h-5 ${isHistory ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[11px] mt-0.5 ${isHistory ? 'font-bold' : 'font-medium'}`}>
            {t.history}
          </span>
          {isHistory && (
            <span className="w-4 h-1 bg-[#1D4ED8] rounded-full mt-0.5 animate-in fade-in" />
          )}
        </button>

        {/* 5. Settings */}
        <button
          onClick={() => handleNav('settings')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${
            isSettings ? 'text-[#1D4ED8]' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className={`w-5 h-5 ${isSettings ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[11px] mt-0.5 ${isSettings ? 'font-bold' : 'font-medium'}`}>
            {t.settings}
          </span>
          {isSettings && (
            <span className="w-4 h-1 bg-[#1D4ED8] rounded-full mt-0.5 animate-in fade-in" />
          )}
        </button>
      </div>
    </nav>
  );
};
