import React, { useEffect, useState } from 'react';
import { Language } from '../types';
import { pick5 } from '../utils/i18nHelper';

interface OfflineIndicatorProps {
  language: Language;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ language }) => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-amber-500 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-lg border border-amber-400">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      <span>
        {pick5(language, {
          en: 'Offline Mode — Cached tools ready',
          hi: 'ऑफलाइन मोड — कैश डेटा चालू है',
          bho: 'ऑफलाइन मोड — सब टूल चालू बा',
          mai: 'ऑफलाइन मोड — सब टूल चालू अछि',
          ne: 'अफलाइन मोड — क्यास गरिएको डेटा चालु छ',
        })}
      </span>
    </div>
  );
};
