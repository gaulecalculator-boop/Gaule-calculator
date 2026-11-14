import React from 'react';
import { Star } from 'lucide-react';

interface CalculatorIconProps {
  iconType: string;
  isPinned?: boolean;
  onTogglePin?: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md' | 'lg';
}

export const CalculatorIcon: React.FC<CalculatorIconProps> = ({
  iconType,
  isPinned = false,
  onTogglePin,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12 rounded-[18px]',
    md: 'w-16 h-16 rounded-[22px]',
    lg: 'w-20 h-20 rounded-[26px]',
  };

  const svgSize = size === 'sm' ? 32 : size === 'md' ? 44 : 56;

  // Realistic Custom SVG Renderers for Every Single Tool
  const renderRealIcon = () => {
    switch (iconType) {
      // 0. GOLD & SILVER (3D Gold Ingot Bar & Silver Coin with Sparkles)
      case 'gold-silver':
      case 'gold':
      case 'silver':
        return {
          gradient: 'from-[#F59E0B] via-[#D97706] to-[#78350F]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <defs>
                <linearGradient id="goldBarGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FFFBEB" />
                  <stop offset="25%" stopColor="#FDE047" />
                  <stop offset="65%" stopColor="#D97706" />
                  <stop offset="100%" stopColor="#78350F" />
                </linearGradient>
                <linearGradient id="silverCoinGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="50%" stopColor="#CBD5E1" />
                  <stop offset="100%" stopColor="#64748B" />
                </linearGradient>
              </defs>
              {/* Silver Coin in background */}
              <ellipse cx="22" cy="24" rx="14" ry="14" fill="url(#silverCoinGrad)" stroke="#F8FAFC" strokeWidth="1.5" />
              <ellipse cx="22" cy="24" rx="10" ry="10" fill="none" stroke="#94A3B8" strokeWidth="1" strokeDasharray="2 2" />
              <text x="22" y="28" fontSize="8" fontWeight="900" fill="#334155" textAnchor="middle" fontFamily="sans-serif">
                999
              </text>

              {/* 3D Gold Bar Ingot in foreground */}
              <g filter="drop-shadow(0 4px 6px rgba(0,0,0,0.35))">
                <polygon points="20,44 46,30 56,36 30,50" fill="#B45309" />
                <polygon points="16,36 38,24 50,30 28,42" fill="url(#goldBarGrad)" stroke="#FEF08A" strokeWidth="1" />
                <polygon points="16,36 28,42 24,52 12,46" fill="#F59E0B" />
                <polygon points="28,42 50,30 52,38 30,50" fill="#D97706" />
                <text x="34" y="36" fontSize="7" fontWeight="900" fill="#78350F" textAnchor="middle" fontFamily="sans-serif" transform="rotate(-15 34 36)">
                  24K
                </text>
              </g>

              {/* Sparkle Glint */}
              <polygon points="46,14 48,18 52,19 48,20 46,24 44,20 40,19 44,18" fill="#FFF" />
              <circle cx="16" cy="18" r="1.5" fill="#FEF08A" />
            </svg>
          ),
        };

      // 1. DOODH (Milk bottle with glass & milk drops)
      case 'milk':
        return {
          gradient: 'from-[#0284C7] via-[#0369A1] to-[#075985]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <defs>
                <linearGradient id="milkGlass" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#E0F2FE" stopOpacity="0.85" />
                </linearGradient>
                <linearGradient id="bottleCap" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#0284C7" />
                </linearGradient>
              </defs>
              {/* Milk Bottle */}
              <rect x="22" y="8" width="20" height="7" rx="3" fill="url(#bottleCap)" />
              <path
                d="M26 15v5c0 3-6 5-6 10v20c0 4 3 6 8 6h16c5 0 8-2 8-6V30c0-5-6-7-6-10v-5H26z"
                fill="url(#milkGlass)"
                stroke="#BAE6FD"
                strokeWidth="1.5"
              />
              {/* Milk Level wave inside */}
              <path
                d="M21 34c3-1 6 1 11 0s7-2 11 0v16c0 3-2 5-6 5H27c-4 0-6-2-6-5V34z"
                fill="#FFFFFF"
              />
              {/* Glass Bottle Reflections */}
              <path d="M24 28v22" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
              <circle cx="36" cy="42" r="3" fill="#38BDF8" opacity="0.6" />
            </svg>
          ),
        };

      // 2. BYAJ (Real Gold Coins Stack with embossed Rupee)
      case 'coins':
        return {
          gradient: 'from-[#F59E0B] via-[#D97706] to-[#B45309]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <defs>
                <linearGradient id="goldCoin1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FEF08A" />
                  <stop offset="40%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#B45309" />
                </linearGradient>
                <linearGradient id="goldCoin2" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FFFBEB" />
                  <stop offset="50%" stopColor="#FBBF24" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
              </defs>
              {/* Back Coin */}
              <ellipse cx="26" cy="28" rx="16" ry="16" fill="url(#goldCoin1)" stroke="#FEF08A" strokeWidth="1.5" />
              <ellipse cx="26" cy="28" rx="12" ry="12" fill="none" stroke="#78350F" strokeWidth="1" strokeDasharray="2 2" />
              <text x="26" y="34" fontSize="13" fontWeight="900" fill="#78350F" textAnchor="middle" fontFamily="sans-serif">रु</text>

              {/* Front Coin with 3D offset */}
              <g filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))">
                <ellipse cx="40" cy="38" rx="17" ry="17" fill="url(#goldCoin2)" stroke="#FFF" strokeWidth="1.8" />
                <ellipse cx="40" cy="38" rx="13" ry="13" fill="none" stroke="#92400E" strokeWidth="1.2" strokeDasharray="3 2" />
                <text x="40" y="45" fontSize="15" fontWeight="900" fill="#78350F" textAnchor="middle" fontFamily="sans-serif">रु</text>
                {/* Shine spark */}
                <polygon points="50,26 52,30 56,31 52,32 50,36 48,32 44,31 48,30" fill="#FFF" />
              </g>
            </svg>
          ),
        };

      // 3. PRICE ↔ WEIGHT (Real Brass Balance Scale Taraju)
      case 'scale-orange':
        return {
          gradient: 'from-[#EA580C] via-[#C2410C] to-[#9A3412]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <defs>
                <linearGradient id="brassGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#FEF08A" />
                  <stop offset="50%" stopColor="#FBBF24" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
              </defs>
              {/* Central post */}
              <rect x="30" y="10" width="4" height="42" rx="2" fill="url(#brassGrad)" />
              <path d="M22 52h20v4H22z" rx="2" fill="url(#brassGrad)" />
              <circle cx="32" cy="14" r="4.5" fill="#FEF08A" stroke="#B45309" strokeWidth="1.5" />
              {/* Beam */}
              <path d="M12 18h40" stroke="url(#brassGrad)" strokeWidth="3" strokeLinecap="round" />
              {/* Left Pan */}
              <path d="M14 18l-5 18M14 18l5 18" stroke="#FDE68A" strokeWidth="1.2" />
              <path d="M7 36c0 6 14 6 14 0z" fill="url(#brassGrad)" stroke="#78350F" strokeWidth="1" />
              {/* Right Pan */}
              <path d="M50 18l-5 18M50 18l5 18" stroke="#FDE68A" strokeWidth="1.2" />
              <path d="M43 36c0 6 14 6 14 0z" fill="url(#brassGrad)" stroke="#78350F" strokeWidth="1" />
            </svg>
          ),
        };

      // 4. EMI (3D Rising Bank Growth Chart)
      case 'trending-up':
      case 'trend-line':
        return {
          gradient: 'from-[#059669] via-[#047857] to-[#065F46]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <defs>
                <linearGradient id="chartBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A7F3D0" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>
              {/* Bars */}
              <rect x="12" y="38" width="8" height="16" rx="2" fill="url(#chartBar)" opacity="0.7" />
              <rect x="24" y="28" width="8" height="26" rx="2" fill="url(#chartBar)" opacity="0.85" />
              <rect x="36" y="20" width="8" height="34" rx="2" fill="url(#chartBar)" />
              <rect x="48" y="12" width="8" height="42" rx="2" fill="#FFFFFF" />
              {/* Glowing Arrow Line */}
              <path
                d="M10 40l14-12 12 6 18-18"
                stroke="#FEF08A"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polygon points="56,14 56,22 48,14" fill="#FEF08A" />
            </svg>
          ),
        };

      // 4b. SIP CALCULATOR (Stacked growth ring & SIP upward coin)
      case 'sip':
        return {
          gradient: 'from-[#2563EB] via-[#1D4ED8] to-[#312E81]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="20" fill="#1E3A8A" stroke="#93C5FD" strokeWidth="2" />
              <path d="M16 40c6-4 10-8 16-8s8-6 16-14" stroke="#34D399" strokeWidth="4" strokeLinecap="round" />
              <polygon points="50,16 50,24 42,16" fill="#FDE047" />
              <circle cx="24" cy="24" r="6" fill="#FBBF24" stroke="#FFF" strokeWidth="1.2" />
              <text x="24" y="27" fontSize="8" fontWeight="900" fill="#78350F" textAnchor="middle">SIP</text>
            </svg>
          ),
        };

      // 4c. FD CALCULATOR (Vault Safe / Fixed Deposit Lockbox)
      case 'fd':
        return {
          gradient: 'from-[#0D9488] via-[#0F766E] to-[#134E4A]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <rect x="12" y="14" width="40" height="36" rx="7" fill="#CCFBF1" stroke="#5EEAD4" strokeWidth="2" />
              <rect x="16" y="18" width="32" height="28" rx="4" fill="#0F766E" />
              <circle cx="32" cy="32" r="9" fill="#FBBF24" stroke="#FEF08A" strokeWidth="1.5" />
              <text x="32" y="35" fontSize="8.5" fontWeight="900" fill="#78350F" textAnchor="middle">FD</text>
              <line x1="16" y1="52" x2="22" y2="52" stroke="#99F6E4" strokeWidth="3" strokeLinecap="round" />
              <line x1="42" y1="52" x2="48" y2="52" stroke="#99F6E4" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ),
        };

      // 5. LAND AREA (Land map survey plot with boundary markers)
      case 'map-pin':
        return {
          gradient: 'from-[#0D9488] via-[#0F766E] to-[#115E59]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              {/* Survey Cadastral Plot Grid */}
              <path
                d="M12 24l20-10 20 10-6 26-28 6z"
                fill="#2DD4BF"
                fillOpacity="0.3"
                stroke="#5EEAD4"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              <circle cx="32" cy="14" r="3" fill="#FFF" />
              <circle cx="12" cy="24" r="3" fill="#FFF" />
              <circle cx="52" cy="24" r="3" fill="#FFF" />
              <circle cx="46" cy="50" r="3" fill="#FFF" />
              <circle cx="18" cy="56" r="3" fill="#FFF" />
              {/* Real 3D Red Location Pin */}
              <g filter="drop-shadow(0 3px 5px rgba(0,0,0,0.4))">
                <path
                  d="M32 20c-5.5 0-10 4.5-10 10 0 7.5 10 18 10 18s10-10.5 10-18c0-5.5-4.5-10-10-10z"
                  fill="#EF4444"
                  stroke="#FFF"
                  strokeWidth="1.5"
                />
                <circle cx="32" cy="30" r="4" fill="#FFF" />
              </g>
            </svg>
          ),
        };

      // 6. POCKET CALCULATOR (Realistic Pocket Calculator with LCD & 3D keys)
      case 'calc':
        return {
          gradient: 'from-[#2563EB] via-[#1D4ED8] to-[#1E3A8A]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <rect x="14" y="8" width="36" height="48" rx="8" fill="#0F172A" stroke="#60A5FA" strokeWidth="2" />
              {/* Screen */}
              <rect x="19" y="14" width="26" height="10" rx="3" fill="#022C22" stroke="#10B981" strokeWidth="1" />
              <text x="42" y="22" fontSize="9" fontWeight="bold" fill="#34D399" textAnchor="end" fontFamily="monospace">
                12,500
              </text>
              {/* Keys */}
              <rect x="19" y="28" width="6" height="5" rx="1.5" fill="#38BDF8" />
              <rect x="29" y="28" width="6" height="5" rx="1.5" fill="#38BDF8" />
              <rect x="39" y="28" width="6" height="5" rx="1.5" fill="#F59E0B" />

              <rect x="19" y="36" width="6" height="5" rx="1.5" fill="#38BDF8" />
              <rect x="29" y="36" width="6" height="5" rx="1.5" fill="#38BDF8" />
              <rect x="39" y="36" width="6" height="5" rx="1.5" fill="#F59E0B" />

              <rect x="19" y="44" width="6" height="5" rx="1.5" fill="#38BDF8" />
              <rect x="29" y="44" width="16" height="5" rx="1.5" fill="#10B981" />
            </svg>
          ),
        };

      // 7. DATE CONVERTER (Desk Calendar with red header & flip pages)
      case 'calendar':
        return {
          gradient: 'from-[#E11D48] via-[#BE123C] to-[#9F1239]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              {/* Base calendar */}
              <rect x="12" y="14" width="40" height="40" rx="8" fill="#FFF" stroke="#FDA4AF" strokeWidth="1.5" />
              {/* Red Header */}
              <path d="M12 22c0-4.4 3.6-8 8-8h24c4.4 0 8 3.6 8 8v6H12v-6z" fill="#E11D48" />
              {/* Ring Binders */}
              <rect x="20" y="10" width="4" height="8" rx="2" fill="#FFF" stroke="#BE123C" strokeWidth="1" />
              <rect x="40" y="10" width="4" height="8" rx="2" fill="#FFF" stroke="#BE123C" strokeWidth="1" />
              {/* Nepali Date Text */}
              <text x="32" y="45" fontSize="18" fontWeight="900" fill="#881337" textAnchor="middle" fontFamily="sans-serif">
                २२
              </text>
              <text x="32" y="24" fontSize="8" fontWeight="bold" fill="#FFF" textAnchor="middle">
                वि.सं.
              </text>
            </svg>
          ),
        };

      // 8. PERCENTAGE (3D Vibrant Badge)
      case 'percent':
        return {
          gradient: 'from-[#9333EA] via-[#7E22CE] to-[#6B21A8]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="22" fill="#A855F7" fillOpacity="0.25" stroke="#E9D5FF" strokeWidth="2" />
              <circle cx="23" cy="23" r="5" fill="#FFF" />
              <circle cx="23" cy="23" r="2" fill="#7E22CE" />
              <circle cx="41" cy="41" r="5" fill="#FFF" />
              <circle cx="41" cy="41" r="2" fill="#7E22CE" />
              <path d="M44 18L20 46" stroke="#FFF" strokeWidth="4.5" strokeLinecap="round" />
            </svg>
          ),
        };

      // 9. AGE CALCULATOR (Birthday Cake with lit candle & sparkle stars)
      case 'sparkles':
        return {
          gradient: 'from-[#DB2777] via-[#BE185D] to-[#9D174D]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              {/* Cake base */}
              <rect x="14" y="34" width="36" height="18" rx="4" fill="#FCE7F3" stroke="#FFF" strokeWidth="1.5" />
              <path d="M14 42c4 2 8 0 12 2s8 0 12 2 8 0 12 2v6H14v-12z" fill="#F472B6" />
              {/* Candle */}
              <rect x="30" y="20" width="4" height="14" rx="2" fill="#FBBF24" />
              {/* Flame */}
              <path d="M32 10c-3 4-1 7 0 8 1-1 3-4 0-8z" fill="#EF4444" />
              <polygon points="18,14 20,18 24,19 20,20 18,24 16,20 12,19 16,18" fill="#FDE047" />
              <polygon points="46,18 48,22 52,23 48,24 46,28 44,24 40,23 44,22" fill="#FDE047" />
            </svg>
          ),
        };

      // 10. SHOP BILLING (Counter Cash Memo Invoice)
      case 'receipt':
        return {
          gradient: 'from-[#EA580C] via-[#C2410C] to-[#9A3412]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <path
                d="M16 10h32v44l-4-3-4 3-4-3-4 3-4-3-4 3-4-3-4 3V10z"
                fill="#FFF"
                stroke="#FED7AA"
                strokeWidth="1.5"
              />
              <line x1="22" y1="18" x2="42" y2="18" stroke="#9A3412" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="22" y1="26" x2="36" y2="26" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
              <line x1="22" y1="32" x2="38" y2="32" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
              <line x1="22" y1="38" x2="42" y2="38" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="38" cy="44" r="3" fill="#10B981" />
            </svg>
          ),
        };

      // 11. DISCOUNT (Retail Red Price Tag)
      case 'tag':
        return {
          gradient: 'from-[#DC2626] via-[#B91C1C] to-[#991B1B]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <g transform="rotate(-15 32 32)">
                <path
                  d="M16 26l16-16h18v18L34 44c-2 2-6 2-8 0L16 34c-2-2-2-6 0-8z"
                  fill="#FFF"
                  stroke="#FCA5A5"
                  strokeWidth="2"
                />
                <circle cx="42" cy="18" r="3.5" fill="#DC2626" />
                <text x="28" y="32" fontSize="9" fontWeight="900" fill="#DC2626" fontFamily="sans-serif">
                  %OFF
                </text>
              </g>
            </svg>
          ),
        };

      // 12. 13% VAT (Tax Stamp Seal)
      case 'badge-percent':
        return {
          gradient: 'from-[#6366F1] via-[#4F46E5] to-[#4338CA]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <polygon
                points="32,8 38,14 46,12 48,20 56,24 54,32 58,38 52,44 52,52 44,52 38,58 32,54 26,58 20,52 12,52 12,44 6,38 10,32 8,24 16,20 18,12 26,14"
                fill="#818CF8"
                stroke="#C7D2FE"
                strokeWidth="1.5"
              />
              <circle cx="32" cy="33" r="16" fill="#312E81" stroke="#A5B4FC" strokeWidth="1.5" />
              <text x="32" y="37" fontSize="11" fontWeight="900" fill="#FDE047" textAnchor="middle" fontFamily="sans-serif">
                13%
              </text>
              <text x="32" y="44" fontSize="6" fontWeight="bold" fill="#FFF" textAnchor="middle">
                VAT
              </text>
            </svg>
          ),
        };

      // 13. NPR ⇄ INR (Nepal Rupee & Indian Rupee exchange)
      case 'repeat':
        return {
          gradient: 'from-[#0284C7] via-[#0369A1] to-[#075985]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              {/* Nepal Flag badge */}
              <circle cx="20" cy="24" r="12" fill="#DC2626" stroke="#FFF" strokeWidth="1.5" />
              <text x="20" y="29" fontSize="11" fontWeight="900" fill="#FFF" textAnchor="middle">रु</text>

              {/* India Rupee badge */}
              <circle cx="44" cy="40" r="12" fill="#F97316" stroke="#FFF" strokeWidth="1.5" />
              <text x="44" y="45" fontSize="12" fontWeight="900" fill="#FFF" textAnchor="middle">₹</text>

              {/* Exchange Arrows */}
              <path d="M30 18h12l-4-4" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M34 46H22l4 4" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
        };

      // 14. UNIT CONVERTER (Scale & measuring tape)
      case 'scale-blue':
        return {
          gradient: 'from-[#3B82F6] via-[#2563EB] to-[#1D4ED8]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <rect x="10" y="24" width="44" height="16" rx="4" fill="#FDE047" stroke="#CA8A04" strokeWidth="1.5" />
              <line x1="16" y1="24" x2="16" y2="30" stroke="#713F12" strokeWidth="1.5" />
              <line x1="22" y1="24" x2="22" y2="34" stroke="#713F12" strokeWidth="2" />
              <line x1="28" y1="24" x2="28" y2="30" stroke="#713F12" strokeWidth="1.5" />
              <line x1="34" y1="24" x2="34" y2="34" stroke="#713F12" strokeWidth="2" />
              <line x1="40" y1="24" x2="40" y2="30" stroke="#713F12" strokeWidth="1.5" />
              <line x1="46" y1="24" x2="46" y2="34" stroke="#713F12" strokeWidth="2" />
              <circle cx="32" cy="48" r="4" fill="#FFF" />
            </svg>
          ),
        };

      // 15. SMART KHATA (Cloth bound Nepali Bahikhata ledger)
      case 'book-open':
        return {
          gradient: 'from-[#4F46E5] via-[#4338CA] to-[#3730A3]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              {/* Bahikhata book cover */}
              <rect x="14" y="10" width="36" height="44" rx="4" fill="#DC2626" stroke="#FEF08A" strokeWidth="2" />
              <rect x="14" y="10" width="8" height="44" fill="#991B1B" />
              {/* Golden Title Strip */}
              <rect x="26" y="22" width="20" height="12" rx="2" fill="#FEF08A" />
              <text x="36" y="31" fontSize="8" fontWeight="bold" fill="#7F1D1D" textAnchor="middle">
                खाता
              </text>
              {/* Bookmark string */}
              <path d="M30 10v48l-3-3-3 3V10" fill="#FBBF24" />
            </svg>
          ),
        };

      // 16. BRICK CALC (Realistic Construction Brick)
      case 'box':
        return {
          gradient: 'from-[#DC2626] via-[#B91C1C] to-[#7F1D1D]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              {/* Isometric 3D Brick */}
              <polygon points="12,24 36,12 52,20 28,32" fill="#F87171" stroke="#FFF" strokeWidth="1" />
              <polygon points="12,24 28,32 28,48 12,40" fill="#B91C1C" />
              <polygon points="28,32 52,20 52,36 28,48" fill="#DC2626" stroke="#991B1B" strokeWidth="1" />
              {/* Brick Frog (Indentation) */}
              <polygon points="22,23 34,17 42,21 30,27" fill="#991B1B" />
            </svg>
          ),
        };

      // 17. CEMENT CALC (Woven 50kg Cement Sack)
      case 'layers':
        return {
          gradient: 'from-[#475569] via-[#334155] to-[#1E293B]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <path
                d="M16 14c4-3 28-3 32 0v36c-4 3-28 3-32 0V14z"
                fill="#94A3B8"
                stroke="#E2E8F0"
                strokeWidth="1.5"
              />
              <rect x="20" y="24" width="24" height="16" rx="2" fill="#DC2626" />
              <text x="32" y="32" fontSize="7" fontWeight="900" fill="#FFF" textAnchor="middle">
                CEMENT
              </text>
              <text x="32" y="38" fontSize="6" fontWeight="bold" fill="#FEF08A" textAnchor="middle">
                ५० KG
              </text>
            </svg>
          ),
        };

      // 18. SAND & GRAVEL (River Sand Mound & Aggregates)
      case 'mountain':
        return {
          gradient: 'from-[#D97706] via-[#B45309] to-[#78350F]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              {/* Sand Pile */}
              <path d="M8 50C16 26 28 22 34 50z" fill="#FBBF24" />
              {/* Gravel Pile */}
              <path d="M26 50C36 18 50 16 58 50z" fill="#64748B" opacity="0.9" />
              {/* Stones texture */}
              <circle cx="44" cy="36" r="2" fill="#CBD5E1" />
              <circle cx="38" cy="42" r="3" fill="#94A3B8" />
              <circle cx="48" cy="44" r="2.5" fill="#475569" />
              <circle cx="20" cy="42" r="1.5" fill="#B45309" />
              <circle cx="24" cy="46" r="1.5" fill="#B45309" />
            </svg>
          ),
        };

      // 19. STEEL REBAR (Ribbed TMT Steel Bars)
      case 'hammer':
        return {
          gradient: 'from-[#0891B2] via-[#0E7490] to-[#155E75]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              {/* Rebar 1 */}
              <rect x="14" y="12" width="10" height="42" rx="4" fill="#94A3B8" stroke="#E2E8F0" strokeWidth="1.5" />
              <path d="M14 20l10-4M14 28l10-4M14 36l10-4M14 44l10-4" stroke="#475569" strokeWidth="2" />
              {/* Rebar 2 (Thicker) */}
              <rect x="32" y="8" width="16" height="48" rx="5" fill="#64748B" stroke="#E2E8F0" strokeWidth="2" />
              <path d="M32 18l16-6M32 28l16-6M32 38l16-6M32 48l16-6" stroke="#1E293B" strokeWidth="2.5" />
            </svg>
          ),
        };

      // 20. PAINT CALC (Paint Bucket & Roller)
      case 'roller':
        return {
          gradient: 'from-[#0D9488] via-[#0F766E] to-[#115E59]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              {/* Paint roller handle */}
              <path d="M34 24h10v16h-6v14h-4V36h10" stroke="#FEF08A" strokeWidth="2.5" strokeLinecap="round" />
              {/* Roller sponge */}
              <rect x="14" y="16" width="22" height="12" rx="3" fill="#38BDF8" stroke="#FFF" strokeWidth="1.5" />
              {/* Dripping paint */}
              <path d="M14 28c3 4 5 0 8 3s4 0 7 2" fill="#38BDF8" />
            </svg>
          ),
        };

      // 21. TILES & MARBLE (Floor Tile Grid with Marble Veins)
      case 'grid':
        return {
          gradient: 'from-[#059669] via-[#047857] to-[#065F46]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <rect x="12" y="12" width="18" height="18" rx="3" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
              <path d="M14 18c6 2 10 8 14 6" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
              <rect x="34" y="12" width="18" height="18" rx="3" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
              <rect x="12" y="34" width="18" height="18" rx="3" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
              <rect x="34" y="34" width="18" height="18" rx="3" fill="#34D399" stroke="#A7F3D0" strokeWidth="1.5" />
              <path d="M36 38l6 4 8-2" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ),
        };

      // 22. CFT & CBM (Round Timber Tree Log & Grain Rings)
      case 'tape':
        return {
          gradient: 'from-[#0284C7] via-[#0369A1] to-[#075985]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              {/* 3D Round Log */}
              <path d="M18 16h26c8 0 14 7 14 16s-6 16-14 16H18c-8 0-14-7-14-16s6-16 14-16z" fill="#B45309" />
              <ellipse cx="44" cy="32" rx="8" ry="16" fill="#FDE68A" stroke="#78350F" strokeWidth="2" />
              {/* Growth Rings */}
              <ellipse cx="44" cy="32" rx="4" ry="9" fill="none" stroke="#B45309" strokeWidth="1.5" />
              <circle cx="44" cy="32" r="1.5" fill="#78350F" />
              <text x="24" y="35" fontSize="8" fontWeight="bold" fill="#FEF08A">
                CFT
              </text>
            </svg>
          ),
        };

      // 23. LAND VALUATION (Courthouse / Malpot Building)
      case 'landmark':
        return {
          gradient: 'from-[#D97706] via-[#B45309] to-[#78350F]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              {/* Roof */}
              <polygon points="32,12 10,24 54,24" fill="#FEF08A" stroke="#78350F" strokeWidth="1.5" />
              {/* Pillars */}
              <rect x="14" y="24" width="5" height="22" fill="#FFF" />
              <rect x="24" y="24" width="5" height="22" fill="#FFF" />
              <rect x="35" y="24" width="5" height="22" fill="#FFF" />
              <rect x="45" y="24" width="5" height="22" fill="#FFF" />
              {/* Base */}
              <rect x="8" y="46" width="48" height="6" rx="2" fill="#FEF08A" stroke="#78350F" strokeWidth="1.5" />
            </svg>
          ),
        };

      // 24. NEPALI PATRO (Bikram Sambat with Nepal motif)
      case 'calendar-heart':
        return {
          gradient: 'from-[#E11D48] via-[#BE123C] to-[#881337]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <rect x="12" y="14" width="40" height="40" rx="8" fill="#FFF" stroke="#FDA4AF" strokeWidth="1.5" />
              <path d="M12 22c0-4.4 3.6-8 8-8h24c4.4 0 8 3.6 8 8v6H12v-6z" fill="#DC2626" />
              {/* Nepali Sun / Moon motif */}
              <circle cx="24" cy="38" r="5" fill="#DC2626" />
              <path d="M38 34c2 0 4 2 4 5s-2 5-4 5c3-1 4-4 3-7 0-2-2-3-3-3z" fill="#DC2626" />
            </svg>
          ),
        };

      // 25. DATE DIFF (Clock & Calendar Countdown)
      case 'clock':
        return {
          gradient: 'from-[#7E22CE] via-[#6B21A8] to-[#581C87]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="22" fill="#FFF" stroke="#C084FC" strokeWidth="2.5" />
              <circle cx="32" cy="32" r="3" fill="#581C87" />
              {/* Hands */}
              <line x1="32" y1="32" x2="32" y2="18" stroke="#581C87" strokeWidth="3" strokeLinecap="round" />
              <line x1="32" y1="32" x2="42" y2="32" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
              {/* Hour markers */}
              <circle cx="32" cy="14" r="1.5" fill="#9333EA" />
              <circle cx="50" cy="32" r="1.5" fill="#9333EA" />
              <circle cx="32" cy="50" r="1.5" fill="#9333EA" />
              <circle cx="14" cy="32" r="1.5" fill="#9333EA" />
            </svg>
          ),
        };

      // 26. NEA BILL (Electric Bolt & Meter Glow)
      case 'zap':
        return {
          gradient: 'from-[#F59E0B] via-[#D97706] to-[#EA580C]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="22" fill="#FEF3C7" fillOpacity="0.25" stroke="#FDE68A" strokeWidth="2" />
              <polygon
                points="36,8 18,34 32,34 26,56 48,26 34,26"
                fill="#FDE047"
                stroke="#B45309"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          ),
        };

      // 27. INCOME TAX / FILE TEXT
      case 'file-text':
      default:
        return {
          gradient: 'from-[#2563EB] via-[#1D4ED8] to-[#1E40AF]',
          content: (
            <svg width={svgSize} height={svgSize} viewBox="0 0 64 64" fill="none">
              <rect x="14" y="10" width="36" height="44" rx="6" fill="#FFF" stroke="#93C5FD" strokeWidth="2" />
              <path d="M38 10v12h12" fill="#BFDBFE" />
              <line x1="20" y1="24" x2="32" y2="24" stroke="#1D4ED8" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="20" y1="32" x2="44" y2="32" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
              <line x1="20" y1="40" x2="44" y2="40" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
              <circle cx="38" cy="46" r="4" fill="#10B981" />
            </svg>
          ),
        };
    }
  };

  const { gradient, content } = renderRealIcon();

  return (
    <div className="relative inline-block select-none">
      {/* 3D Tactile Icon Container with Specular Glass Curved Reflection */}
      <div
        className={`${sizeClasses[size]} bg-gradient-to-br ${gradient} flex items-center justify-center relative overflow-hidden transition-all duration-200 transform active:scale-90 hover:scale-105`}
        style={{
          boxShadow:
            '0 10px 20px -3px rgba(0, 0, 0, 0.22), 0 4px 6px -2px rgba(0, 0, 0, 0.1), inset 0 1px 1px 0 rgba(255, 255, 255, 0.45), inset 0 -2px 3px 0 rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.35)',
        }}
      >
        {/* Top Arc Gloss Highlight */}
        <div
          className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0.05) 80%, transparent 100%)',
            borderTopLeftRadius: 'inherit',
            borderTopRightRadius: 'inherit',
          }}
        />

        {/* Real Detailed Vector Artwork */}
        <div className="relative z-10 drop-shadow-sm flex items-center justify-center">
          {content}
        </div>
      </div>

      {/* Realistic Golden Pin Star Badge */}
      {onTogglePin ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(e);
          }}
          className={`absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition active:scale-75 z-20 ${
            isPinned
              ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 border border-amber-200'
              : 'bg-white/95 text-slate-400 hover:text-amber-500 border border-slate-200 hover:scale-110'
          }`}
          style={{
            boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
          }}
          aria-label={isPinned ? 'Unpin' : 'Pin to Home'}
        >
          <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-950 text-amber-950' : 'stroke-[2.2]'}`} />
        </button>
      ) : isPinned ? (
        <div
          className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 border border-amber-200 flex items-center justify-center shadow-md z-20"
        >
          <Star className="w-3.5 h-3.5 fill-amber-950 text-amber-950" />
        </div>
      ) : null}
    </div>
  );
};
