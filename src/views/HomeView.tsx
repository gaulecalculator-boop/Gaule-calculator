import React, { useState } from 'react';
import { Search, Star, Landmark } from 'lucide-react';
import { Language, Currency } from '../types';
import { translations } from '../data/translations';
import { ALL_CALCULATORS, getToolName, getToolDesc, getCategoryName } from '../data/calculatorList';
import { CalculatorIcon } from '../components/CalculatorIcon';
import { playTapSound } from '../utils/audio';
import { pick5 } from '../utils/i18nHelper';

interface HomeViewProps {
  language: Language;
  currency: Currency;
  pinnedIds: string[];
  onTogglePin: (id: string, e: React.MouseEvent) => void;
  onSelectTool: (toolId: string, initialMetal?: 'gold' | 'silver') => void;
  onNavigate: (view: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  language,
  currency,
  pinnedIds,
  onTogglePin,
  onSelectTool,
  onNavigate,
}) => {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');

  // Filter pinned tools
  const pinnedTools = ALL_CALCULATORS.filter((tool) => pinnedIds.includes(tool.id));

  // Search filter across EN, NE, and active language
  const q = searchQuery.trim().toLowerCase();
  const filteredTools = q
    ? ALL_CALCULATORS.filter(
        (tool) =>
          tool.nameEn.toLowerCase().includes(q) ||
          tool.nameNe.toLowerCase().includes(q) ||
          tool.descEn.toLowerCase().includes(q) ||
          tool.descNe.toLowerCase().includes(q) ||
          getToolName(tool, language).toLowerCase().includes(q) ||
          getToolDesc(tool, language).toLowerCase().includes(q)
      )
    : [];

  return (
    <div className="space-y-4 pb-24 select-none">
      {/* Search Input Bar matching Screenshot 1 */}
      <div className="relative pt-1 px-1">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full bg-white border border-slate-200/90 rounded-2xl py-3 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 shadow-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 p-1"
          >
            ✕
          </button>
        )}
      </div>

      {searchQuery.trim() ? (
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
          <h4 className="text-xs font-bold text-slate-700">
            {language === 'ne'
              ? 'खोजिएका क्याल्कुलेटरहरू'
              : language === 'hi'
              ? 'खोजे गए कैलकुलेटर'
              : language === 'bho'
              ? 'खोजल गइल कैलकुलेटर'
              : language === 'mai'
              ? 'खोजल गेल कैलकुलेटर'
              : 'Search Results'} ({filteredTools.length})
          </h4>
          {filteredTools.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              {language === 'ne'
                ? 'कुनै क्याल्कुलेटर भेटिएन। अर्को नामले खोज्नुहोस्।'
                : language === 'hi'
                ? 'कोई कैलकुलेटर नहीं मिला। अन्य नाम से खोजें।'
                : language === 'bho'
                ? 'कवनो कैलकुलेटर ना मिलल। दोसर नाम से खोजीं।'
                : language === 'mai'
                ? 'कोनो कैलकुलेटर नहि भेटल। दोसर नाम सँ खोजू।'
                : 'No calculators found. Try another search.'}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredTools.map((calc) => (
                <div
                  key={calc.id}
                  onClick={() => {
                    playTapSound();
                    onSelectTool(calc.id);
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 active:scale-95 transition cursor-pointer"
                >
                  <CalculatorIcon
                    iconType={calc.iconType}
                    isPinned={pinnedIds.includes(calc.id)}
                    size="sm"
                    onTogglePin={(e) => onTogglePin(calc.id, e)}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {getToolName(calc, language)}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {getCategoryName(calc, language)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80">

            {/* Pinned Tools Horizontal / Flex Grid */}
            <div className="flex items-start gap-4 overflow-x-auto pb-1 pt-1">
              {/* Pinned Bank & Investment (When Starred) */}
              {pinnedIds.includes('bank_investment') && (
                <div
                  onClick={() => {
                    playTapSound();
                    onNavigate('bank_investment');
                  }}
                  className="flex flex-col items-center min-w-[76px] cursor-pointer group active:scale-95 transition"
                >
                  <div className="relative w-14 h-14 rounded-2xl bg-slate-900 p-0.5 border border-slate-700 shadow-md flex items-center justify-center text-white group-hover:scale-105 transition">
                    <Landmark className="w-6 h-6 text-blue-300" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playTapSound();
                        onTogglePin('bank_investment', e);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-amber-500 hover:scale-110 active:scale-90 transition border border-slate-100 cursor-pointer"
                      aria-label="Unpin Bank & Investment"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                    </button>
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 text-center mt-2 leading-tight group-hover:text-blue-600">
                    {pick5(language, {
                      en: 'Bank & Invest',
                      hi: 'बैंक और निवेश',
                      bho: 'बैंक आ निवेश',
                      mai: 'बैंक आ निवेश',
                      ne: 'बैंक तथा लगानी',
                    })}
                  </span>
                </div>
              )}

              {/* Pinned Hamro Pasal & Udhar Khata (When Starred) */}
              {pinnedIds.includes('hamro_pasal') && (
                <div
                  onClick={() => {
                    playTapSound();
                    onNavigate('hamro_pasal');
                  }}
                  className="flex flex-col items-center min-w-[76px] cursor-pointer group active:scale-95 transition"
                >
                  <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-0.5 border border-blue-400/30 shadow-md flex items-center justify-center text-2xl group-hover:scale-105 transition">
                    <span>🏪</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playTapSound();
                        onTogglePin('hamro_pasal', e);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-amber-500 hover:scale-110 active:scale-90 transition border border-slate-100 cursor-pointer"
                      title={pick5(language, {
                        en: 'Remove from favorites',
                        hi: 'पसंदीदा से हटाएं',
                        bho: 'मनपसंद से हटाईं',
                        mai: 'मनपसंद सँ हटाउ',
                        ne: 'मनपर्नेबाट हटाउनुहोस्',
                      })}
                      aria-label="Unpin Hamro Pasal"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                    </button>
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 text-center mt-2 leading-tight group-hover:text-blue-600">
                    {pick5(language, {
                      en: 'Hamro Pasal',
                      hi: 'हमारी दुकान',
                      bho: 'हमर दुकान',
                      mai: 'हमर दोकान',
                      ne: 'हाम्रो पसल',
                    })}
                  </span>
                </div>
              )}

              {pinnedTools.map((tool) => (
                <div
                  key={tool.id}
                  onClick={() => {
                    playTapSound();
                    onSelectTool(tool.id);
                  }}
                  className="flex flex-col items-center min-w-[76px] cursor-pointer group active:scale-95 transition"
                >
                  <CalculatorIcon
                    iconType={tool.iconType}
                    isPinned={true}
                    size="md"
                    onTogglePin={(e) => onTogglePin(tool.id, e)}
                  />
                  <span className="text-[11px] font-bold text-slate-800 text-center mt-2 leading-tight group-hover:text-blue-600">
                    {getToolName(tool, language)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
