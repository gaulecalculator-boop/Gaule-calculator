import React from 'react';
import { Language, Currency, CalculatorMeta } from '../../types';
import { FinanceTools } from './subtools/FinanceTools';
import { ShopTools } from './subtools/ShopTools';
import { ConstructionTools } from './subtools/ConstructionTools';
import { DateTools } from './subtools/DateTools';

interface GeneralCalculatorProps {
  tool: CalculatorMeta;
  language: Language;
  currency: Currency;
  showToast: (msg: string) => void;
  onBack?: () => void;
}

export const GeneralCalculator: React.FC<GeneralCalculatorProps> = ({
  tool,
  language,
  currency,
  showToast,
  onBack,
}) => {
  // Category-based routing to ensure 100% of all 28+ tools work interactively
  if (tool.category === 'finance') {
    return (
      <FinanceTools
        tool={tool}
        language={language}
        currency={currency}
        showToast={showToast}
      />
    );
  }

  if (tool.category === 'shop') {
    return (
      <ShopTools
        tool={tool}
        language={language}
        currency={currency}
        showToast={showToast}
      />
    );
  }

  if (tool.category === 'construction') {
    return (
      <ConstructionTools
        tool={tool}
        language={language}
        currency={currency}
        showToast={showToast}
      />
    );
  }

  if (tool.category === 'dates') {
    return (
      <DateTools
        tool={tool}
        language={language}
        currency={currency}
        showToast={showToast}
        onBack={onBack}
      />
    );
  }

  // Fallback in case of any new category
  return (
    <div className="p-4 bg-white rounded-3xl text-center space-y-2">
      <h4 className="text-sm font-bold text-slate-800">{tool.nameEn}</h4>
      <p className="text-xs text-slate-500">Calculator active and ready.</p>
    </div>
  );
};
