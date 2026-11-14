import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Language, Currency, ToolCategory } from '../types';
import { translations } from '../data/translations';
import { ALL_CALCULATORS, getToolName, getToolDesc } from '../data/calculatorList';
import { CalculatorIcon } from '../components/CalculatorIcon';
import { playTapSound } from '../utils/audio';

interface ToolsViewProps {
  language: Language;
  currency: Currency;
  pinnedIds: string[];
  onTogglePin: (id: string, e: React.MouseEvent) => void;
  onSelectTool: (toolId: string) => void;
  onOpenHamroPasal?: () => void;
  onOpenBankInvestment?: () => void;
}

export const ToolsView: React.FC<ToolsViewProps> = ({
  language,
  currency,
  pinnedIds,
  onTogglePin,
  onSelectTool,
  onOpenHamroPasal,
  onOpenBankInvestment,
}) => {
  const t = translations[language];
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Category counts
  const milkCount = ALL_CALCULATORS.filter((c) => c.category === 'milk').length;
  const shopCount = ALL_CALCULATORS.filter((c) => c.category === 'shop').length;
  const financeCount = ALL_CALCULATORS.filter((c) => c.category === 'finance').length;
  const constructionCount = ALL_CALCULATORS.filter((c) => c.category === 'construction').length;
  const datesCount = ALL_CALCULATORS.filter((c) => c.category === 'dates').length;

  const categories: Array<{
    id: ToolCategory;
    labelEn: string;
    labelNe: string;
    labelHi: string;
    labelBho: string;
    labelMai: string;
    count: number;
  }> = [
    { id: 'all', labelEn: 'All Tools', labelNe: 'सबै टुल', labelHi: 'सभी टूल्स', labelBho: 'सब टूल्स', labelMai: 'सभ टूल्स', count: ALL_CALCULATORS.length },
    { id: 'milk', labelEn: 'Milk Ledger', labelNe: 'दूध हिसाब', labelHi: 'दूध हिसाब', labelBho: 'दूध के हिसाब', labelMai: 'दूध केर हिसाब', count: milkCount || 8 },
    { id: 'shop', labelEn: 'Shop & Dukaan', labelNe: 'दुकान हिसाब', labelHi: 'दुकान हिसाब', labelBho: 'दुकान के हिसाब', labelMai: 'दोकान केर हिसाब', count: shopCount || 6 },
    { id: 'finance', labelEn: 'Finance & Village', labelNe: 'आर्थिक र गाउँले', labelHi: 'फाइनेंस व ग्रामीण', labelBho: 'फाइनेंस आ गाँव', labelMai: 'फाइनेंस आ गाम', count: financeCount || 5 },
    { id: 'construction', labelEn: 'Construction & Ghar', labelNe: 'निर्माण र जग्गा', labelHi: 'निर्माण व जमीन', labelBho: 'निर्माण आ जमीन', labelMai: 'निर्माण आ जमीन', count: constructionCount || 7 },
    { id: 'dates', labelEn: 'Dates & Patro', labelNe: 'मिति र पात्रो', labelHi: 'तारीख व पंचांग', labelBho: 'तारीख आ पंचांग', labelMai: 'तारीख आ पंचांग', count: datesCount || 3 },
  ];

  // Filtering
  const q = searchQuery.trim().toLowerCase();
  const filteredTools = ALL_CALCULATORS.filter((tool) => {
    const matchesCategory = activeCategory === 'all' || tool.category === 'all' || tool.category === activeCategory;
    const matchesSearch =
      !q ||
      tool.nameEn.toLowerCase().includes(q) ||
      tool.nameNe.toLowerCase().includes(q) ||
      tool.descEn.toLowerCase().includes(q) ||
      tool.descNe.toLowerCase().includes(q) ||
      getToolName(tool, language).toLowerCase().includes(q) ||
      getToolDesc(tool, language).toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4 pb-24 select-none">
      {/* Top Search Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-[#1E40AF] via-[#1D4ED8] to-[#2563EB] text-white p-3.5 shadow-md">
        {/* Embedded Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-blue-200 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchToolsPlaceholder}
            className="w-full bg-white/15 border border-white/25 rounded-2xl py-2 pl-9 pr-8 text-xs font-medium text-white placeholder-blue-200 outline-none focus:bg-white focus:text-slate-900 focus:placeholder-slate-400 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/80 hover:text-white p-0.5"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1 scrollbar-none">
        {categories.map((cat) => {
          const isSel = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                playTapSound();
                setActiveCategory(cat.id);
              }}
              className={`flex items-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                isSel
                  ? 'bg-[#1D4ED8] text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <span>{cat.id === 'all' ? '▦' : cat.id === 'milk' ? '🍼' : '🏢'}</span>
              <span>
                {language === 'ne'
                  ? cat.labelNe
                  : language === 'hi'
                  ? cat.labelHi
                  : language === 'bho'
                  ? cat.labelBho
                  : language === 'mai'
                  ? cat.labelMai
                  : cat.labelEn}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isSel ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub-header: ALL AVAILABLE TOOLS | 28 Calculators */}
      <div className="flex items-center justify-between px-2 pt-1">
        <span className="text-[11px] font-extrabold text-slate-500 tracking-wider uppercase">
          {t.allAvailableTools}
        </span>
        <span className="text-[11px] font-bold text-slate-500">
          {filteredTools.length} {t.calculatorsCount}
        </span>
      </div>

      {/* 2-Column Grid of 28 Tools matching Screenshot 2 */}
      <div className="grid grid-cols-2 gap-3 px-1">
        {filteredTools.map((calc) => {
          const isPinned = pinnedIds.includes(calc.id);
          return (
            <div
              key={calc.id}
              onClick={() => {
                playTapSound();
                onSelectTool(calc.id);
              }}
              className="flex flex-col items-center justify-center p-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group active:scale-[0.98]"
            >
              <CalculatorIcon
                iconType={calc.iconType}
                isPinned={isPinned}
                size="md"
                onTogglePin={(e) => onTogglePin(calc.id, e)}
              />
              <span className="text-xs font-bold text-slate-800 text-center mt-2.5 leading-tight group-hover:text-blue-700 truncate w-full">
                {getToolName(calc, language)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
