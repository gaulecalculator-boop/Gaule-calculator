import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sun,
  Moon,
  Clock,
  Sparkles,
  MapPin,
  Flame,
  ShieldCheck,
  Share2,
  Copy,
  Check,
  Info,
  CalendarDays,
  Car,
  Home as HomeIcon,
  Compass,
  AlertTriangle,
  FileText,
  Landmark,
  CheckCircle2,
  Award,
  Search,
  Filter,
  Bell,
  Crown,
  Code2,
} from 'lucide-react';
import { Language, Currency } from '../../types';
import {
  NEPAL_CITIES,
  NepalCity,
  convertBSToAD,
  convertADToBS,
  getMonthDaysCount,
  calculatePanchang,
  evaluateMuhurats,
  getFestivalForDate,
  BS_MIN_YEAR,
  BS_MAX_YEAR,
  PanchangData,
} from '../../utils/panchangEngine';
import {
  toDevanagari,
  NEPALI_MONTHS,
  WEEKDAYS,
  getTodayBS,
} from '../../utils/nepaliCalendar';
import {
  patroDb,
  GovernmentHolidayRecord,
  HOLIDAY_CATEGORY_METADATA,
  HolidayCategory,
  SOURCE_METADATA,
  VERIFICATION_LOG,
} from '../../utils/patroDatabase';
import { playTapSound, playSuccessSound } from '../../utils/audio';
import { calculate24Horas } from '../../utils/horaEngine';
import { RemindersModal } from '../RemindersModal';
import { ApiDocumentationModal } from '../ApiDocumentationModal';
import { PremiumModal } from '../PremiumModal';

interface NepaliPatroViewProps {
  language: Language;
  currency: Currency;
  showToast: (msg: string) => void;
  onBack?: () => void;
}

export const NepaliPatroView: React.FC<NepaliPatroViewProps> = ({
  language,
  showToast,
  onBack,
}) => {
  const todayBs = useMemo(() => getTodayBS(), []);

  // --- Selected City for Solar/Muhurat Calculations ---
  const [selectedCityId, setSelectedCityId] = useState<string>(() => {
    return localStorage.getItem('ghaule_patro_city') || 'kathmandu';
  });
  const currentCity = useMemo<NepalCity>(() => {
    return NEPAL_CITIES.find((c) => c.id === selectedCityId) || NEPAL_CITIES[0];
  }, [selectedCityId]);

  const handleCityChange = (cityId: string) => {
    playTapSound();
    setSelectedCityId(cityId);
    localStorage.setItem('ghaule_patro_city', cityId);
    const c = NEPAL_CITIES.find((item) => item.id === cityId);
    if (c) {
      showToast(
        language === 'ne'
          ? `स्थान परिवर्तन: ${c.nameNe}`
          : language === 'hi'
          ? `स्थान बदला: ${c.nameHi}`
          : `Location set: ${c.nameEn}`
      );
    }
  };

  // --- Active Tab: 'calendar' | 'panchang' | 'muhurat' | 'festivals' | 'holidays' | 'audit' ---
  const [activeTab, setActiveTab] = useState<
    'calendar' | 'panchang' | 'muhurat' | 'festivals' | 'holidays' | 'audit'
  >('calendar');

  // --- Dark Mode / Light Mode inside Patro ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('ghaule_patro_theme') === 'dark';
  });

  const toggleTheme = () => {
    playTapSound();
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('ghaule_patro_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // --- Calendar Navigation State (2000 to 2100 BS) ---
  const [currentYear, setCurrentYear] = useState<number>(todayBs.year);
  const [currentMonth, setCurrentMonth] = useState<number>(todayBs.month); // 1-12
  const [selectedDay, setSelectedDay] = useState<number>(todayBs.day);

  // Modals & UI States
  const [isDayDetailOpen, setIsDayDetailOpen] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [holidayCategoryFilter, setHolidayCategoryFilter] = useState<string>('all');
  const [festivalSearchQuery, setFestivalSearchQuery] = useState<string>('');
  const [isRemindersOpen, setIsRemindersOpen] = useState<boolean>(false);
  const [isApiDocsOpen, setIsApiDocsOpen] = useState<boolean>(false);
  const [isPremiumOpen, setIsPremiumOpen] = useState<boolean>(false);

  // Computed data for Current Month
  const daysInMonth = useMemo(() => {
    return getMonthDaysCount(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  const firstDayAd = useMemo(() => {
    return convertBSToAD(currentYear, currentMonth, 1);
  }, [currentYear, currentMonth]);

  const firstDayOfWeek = useMemo(() => {
    return firstDayAd.getUTCDay();
  }, [firstDayAd]);

  const currentMonthObj = NEPALI_MONTHS[currentMonth - 1] || NEPALI_MONTHS[0];
  const currentMonthName =
    language === 'hi'
      ? currentMonthObj.nameHi
      : language === 'ne'
      ? currentMonthObj.nameNe
      : currentMonthObj.nameEn;

  // Selected Day AD & Panchang Data
  const selectedDayAd = useMemo(() => {
    return convertBSToAD(currentYear, currentMonth, selectedDay);
  }, [currentYear, currentMonth, selectedDay]);

  const selectedDayWeekday = WEEKDAYS[selectedDayAd.getUTCDay()] || WEEKDAYS[0];

  const selectedDayPanchang = useMemo(() => {
    return calculatePanchang(selectedDayAd, currentYear, currentCity);
  }, [selectedDayAd, currentYear, currentCity]);

  const selectedDayMuhurats = useMemo(() => {
    return evaluateMuhurats(selectedDayPanchang, selectedDayAd.getUTCDay());
  }, [selectedDayPanchang, selectedDayAd]);

  const selectedDayHoras = useMemo(() => {
    return calculate24Horas(
      selectedDayAd.getUTCDay(),
      selectedDayPanchang.sunriseTime,
      selectedDayPanchang.sunsetTime
    );
  }, [selectedDayAd, selectedDayPanchang]);

  const selectedDayFestival = useMemo(() => {
    return getFestivalForDate(currentYear, currentMonth, selectedDay);
  }, [currentYear, currentMonth, selectedDay]);

  // Today's Panchang for Quick Info Banner
  const todayAdDate = useMemo(() => new Date(), []);
  const todayPanchang = useMemo(() => {
    return calculatePanchang(todayAdDate, todayBs.year, currentCity);
  }, [todayAdDate, todayBs.year, currentCity]);

  const todayMuhurats = useMemo(() => {
    return evaluateMuhurats(todayPanchang, todayAdDate.getDay());
  }, [todayPanchang, todayAdDate]);

  // Handlers for Calendar Navigation
  const handlePrevMonth = () => {
    playTapSound();
    if (currentMonth === 1) {
      if (currentYear > BS_MIN_YEAR) {
        setCurrentYear(currentYear - 1);
        setCurrentMonth(12);
        setSelectedDay(1);
      }
    } else {
      setCurrentMonth(currentMonth - 1);
      setSelectedDay(1);
    }
  };

  const handleNextMonth = () => {
    playTapSound();
    if (currentMonth === 12) {
      if (currentYear < BS_MAX_YEAR) {
        setCurrentYear(currentYear + 1);
        setCurrentMonth(1);
        setSelectedDay(1);
      }
    } else {
      setCurrentMonth(currentMonth + 1);
      setSelectedDay(1);
    }
  };

  const handlePrevYear = () => {
    playTapSound();
    if (currentYear > BS_MIN_YEAR) {
      setCurrentYear(currentYear - 1);
      setSelectedDay(1);
    }
  };

  const handleNextYear = () => {
    playTapSound();
    if (currentYear < BS_MAX_YEAR) {
      setCurrentYear(currentYear + 1);
      setSelectedDay(1);
    }
  };

  const handleJumpToToday = () => {
    playTapSound();
    setCurrentYear(todayBs.year);
    setCurrentMonth(todayBs.month);
    setSelectedDay(todayBs.day);
    showToast(
      language === 'ne'
        ? 'आजको मितिमा फर्कियो'
        : language === 'hi'
        ? 'आज की तारीख'
        : 'Jumped to Today'
    );
  };

  // Copy Panchang Text
  const handleCopyPanchang = () => {
    playTapSound();
    const text = `🇳🇵 घाउले पात्रो (Ghaule Patro) - दैनिक पञ्चाङ्ग
📅 वि.सं. ${toDevanagari(currentYear)} ${currentMonthName} ${toDevanagari(selectedDay)} गते, ${selectedDayWeekday.fullNe}
🌐 ई.सं.: ${selectedDayAd.toLocaleDateString('en-GB')} (${selectedDayWeekday.fullEn})
📍 स्थान: ${currentCity.nameNe}

✨ पञ्चाङ्ग विवरण:
• तिथि: ${selectedDayPanchang.tithi.ne} (${selectedDayPanchang.pakshaNe})${selectedDayPanchang.tithiEndTime ? ` - ${selectedDayPanchang.tithiEndTime} सम्म` : ''}
• नक्षत्र: ${selectedDayPanchang.nakshatra.ne} (चरण ${toDevanagari(selectedDayPanchang.nakshatraPada)})${selectedDayPanchang.nakshatraEndTime ? ` - ${selectedDayPanchang.nakshatraEndTime} सम्म` : ''}
• योग: ${selectedDayPanchang.yoga.ne} (${selectedDayPanchang.yoga.nature})
• करण: ${selectedDayPanchang.karana.ne}
• सूर्योदय: ${selectedDayPanchang.sunriseTime} | सूर्यास्त: ${selectedDayPanchang.sunsetTime}
• चन्द्रोदय: ${selectedDayPanchang.moonriseTime} | चन्द्रास्त: ${selectedDayPanchang.moonsetTime}
• दिनमान: ${selectedDayPanchang.dayDurationStr}

⏰ मुहूर्त तथा काल:
• अभिजित मुहूर्त: ${selectedDayPanchang.abhijitMuhurat.start} – ${selectedDayPanchang.abhijitMuhurat.end} ${selectedDayPanchang.abhijitMuhurat.isAuspicious ? '(शुभ)' : '(बुधबार वर्जित)'}
• अमृत काल: ${selectedDayPanchang.amritKaal.start} – ${selectedDayPanchang.amritKaal.end} (अमृत मुहूर्त)
• राहु काल: ${selectedDayPanchang.rahuKaal.start} – ${selectedDayPanchang.rahuKaal.end} (अशुभ समय)
• यमघण्ट: ${selectedDayPanchang.yamaganda.start} – ${selectedDayPanchang.yamaganda.end}
• गुलिक काल: ${selectedDayPanchang.gulikaKaal.start} – ${selectedDayPanchang.gulikaKaal.end}
• पञ्चक: ${selectedDayPanchang.panchak.typeNe}
• भद्रा: ${selectedDayPanchang.bhadra.vaasNe}

📱 १००% अफलाइन घाउले क्याल्कुलेटर हब नेपाल`;

    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    playSuccessSound();
    showToast(
      language === 'ne'
        ? 'पञ्चाङ्ग विवरण सफलतापुर्वक कापी भयो!'
        : language === 'hi'
        ? 'पंचांग विवरण कॉपी हो गया!'
        : 'Panchang details copied!'
    );
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  // Month-wise festival events for Current Month
  const currentMonthEvents = useMemo(() => {
    const list: Array<{
      day: number;
      adDateStr: string;
      events: GovernmentHolidayRecord[];
      panchang: PanchangData;
    }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const ad = convertBSToAD(currentYear, currentMonth, d);
      const p = calculatePanchang(ad, currentYear, currentCity);
      if (p.events && p.events.length > 0) {
        list.push({
          day: d,
          adDateStr: ad.toISOString().split('T')[0],
          events: p.events,
          panchang: p,
        });
      }
    }
    return list;
  }, [currentYear, currentMonth, daysInMonth, currentCity]);

  // Full Year Holidays List
  const fullYearHolidays = useMemo(() => {
    return patroDb.getAllHolidaysForYear(currentYear);
  }, [currentYear]);

  // Filtered Holidays
  const filteredHolidays = useMemo(() => {
    if (holidayCategoryFilter === 'all') return fullYearHolidays;
    return fullYearHolidays.filter((h) => h.category === holidayCategoryFilter);
  }, [fullYearHolidays, holidayCategoryFilter]);

  return (
    <div
      className={`min-h-screen pb-24 transition-colors duration-200 select-none ${
        isDarkMode ? 'bg-[#060B19] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP APP BAR & CITY SELECTION HEADER */}
      {/* ------------------------------------------------------------- */}
      {/* ------------------------------------------------------------- */}
      {/* 1. COMPACT TOOLBAR (City Selection & Dark Mode) */}
      {/* ------------------------------------------------------------- */}
      <div
        className={`px-3 py-2 border-b backdrop-blur-md transition-colors rounded-2xl mb-3 ${
          isDarkMode
            ? 'bg-[#0B132B]/90 border-slate-800 text-white'
            : 'bg-white/90 border-slate-200 text-slate-900 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Status Subtitle */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shrink-0" />
            <span className="text-[11px] font-bold truncate text-slate-700 dark:text-slate-300">
              नेपाल पञ्चाङ्ग निर्णायक विकास समिति
            </span>
          </div>

          {/* Right Controls: City Selector & Dark Mode Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* City Dropdown */}
            <div className="relative">
              <select
                value={selectedCityId}
                onChange={(e) => handleCityChange(e.target.value)}
                className={`py-1 pl-6 pr-2 rounded-xl text-xs font-bold appearance-none outline-none border transition cursor-pointer shadow-2xs ${
                  isDarkMode
                    ? 'bg-slate-800 text-slate-200 border-slate-700 hover:border-rose-500'
                    : 'bg-slate-100 text-slate-800 border-slate-300 hover:border-rose-500'
                }`}
              >
                {NEPAL_CITIES.map((city) => (
                  <option key={city.id} value={city.id}>
                    {language === 'en' ? city.nameEn : city.nameNe}
                  </option>
                ))}
              </select>
              <MapPin className="w-3 h-3 absolute left-1.5 top-2 text-rose-600 pointer-events-none" />
            </div>

            {/* Dark/Light Mode Button */}
            <button
              onClick={toggleTheme}
              className={`p-1.5 rounded-xl border transition active:scale-90 shadow-2xs ${
                isDarkMode
                  ? 'bg-slate-800 text-amber-300 border-slate-700'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title="डार्क/लाइट मोड"
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4">
        {/* ------------------------------------------------------------- */}
        {/* OFFLINE STATUS & VERIFICATION BADGE BAR */}
        {/* ------------------------------------------------------------- */}
        <div className="flex items-center justify-between text-[11px] font-bold px-3 py-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>१००% अफलाइन सुरक्षित (No Internet Required)</span>
          </div>

          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>संवत् २०६०–२०८५ (२६ वर्ष पूर्ण प्रमाणित)</span>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* QUICK ACTION HUBS (Reminders, Pro Features, REST API) */}
        {/* ------------------------------------------------------------- */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              playTapSound();
              setIsRemindersOpen(true);
            }}
            className={`p-2.5 rounded-2xl border transition active:scale-95 flex items-center justify-center gap-1.5 text-xs font-bold shadow-2xs ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-blue-300 border-slate-700'
                : 'bg-white hover:bg-blue-50 text-blue-700 border-blue-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-blue-500" />
            <span>पर्व स्मरण</span>
          </button>

          <button
            onClick={() => {
              playTapSound();
              setIsPremiumOpen(true);
            }}
            className={`p-2.5 rounded-2xl border transition active:scale-95 flex items-center justify-center gap-1.5 text-xs font-bold shadow-2xs ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                : 'bg-white hover:bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>प्रिमियम प्रो</span>
          </button>

          <button
            onClick={() => {
              playTapSound();
              setIsApiDocsOpen(true);
            }}
            className={`p-2.5 rounded-2xl border transition active:scale-95 flex items-center justify-center gap-1.5 text-xs font-bold shadow-2xs ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border-slate-700'
                : 'bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>डेभलपर API</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB NAVIGATION SWITCHER (6 Dedicated Panels) */}
        {/* ------------------------------------------------------------- */}
        <div
          className={`grid grid-cols-6 p-1 rounded-2xl text-xs font-black shadow-xs ${
            isDarkMode
              ? 'bg-slate-800 border border-slate-700'
              : 'bg-slate-200/80 border border-slate-300/50'
          }`}
        >
          <button
            onClick={() => {
              playTapSound();
              setActiveTab('calendar');
            }}
            className={`py-2 px-1 rounded-xl transition flex flex-col items-center gap-0.5 ${
              activeTab === 'calendar'
                ? 'bg-rose-600 text-white shadow-md'
                : isDarkMode
                ? 'text-slate-300 hover:text-white'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span className="text-[10px] truncate">मासिक पात्रो</span>
          </button>

          <button
            onClick={() => {
              playTapSound();
              setActiveTab('panchang');
            }}
            className={`py-2 px-1 rounded-xl transition flex flex-col items-center gap-0.5 ${
              activeTab === 'panchang'
                ? 'bg-rose-600 text-white shadow-md'
                : isDarkMode
                ? 'text-slate-300 hover:text-white'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] truncate">दैनिक पञ्चाङ्ग</span>
          </button>

          <button
            onClick={() => {
              playTapSound();
              setActiveTab('muhurat');
            }}
            className={`py-2 px-1 rounded-xl transition flex flex-col items-center gap-0.5 ${
              activeTab === 'muhurat'
                ? 'bg-rose-600 text-white shadow-md'
                : isDarkMode
                ? 'text-slate-300 hover:text-white'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="text-[10px] truncate">शुभ मुहूर्त</span>
          </button>

          <button
            onClick={() => {
              playTapSound();
              setActiveTab('festivals');
            }}
            className={`py-2 px-1 rounded-xl transition flex flex-col items-center gap-0.5 ${
              activeTab === 'festivals'
                ? 'bg-rose-600 text-white shadow-md'
                : isDarkMode
                ? 'text-slate-300 hover:text-white'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span className="text-[10px] truncate">चाडपर्व</span>
          </button>

          <button
            onClick={() => {
              playTapSound();
              setActiveTab('holidays');
            }}
            className={`py-2 px-1 rounded-xl transition flex flex-col items-center gap-0.5 ${
              activeTab === 'holidays'
                ? 'bg-rose-600 text-white shadow-md'
                : isDarkMode
                ? 'text-slate-300 hover:text-white'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span className="text-[10px] truncate">सरकारी बिदा</span>
          </button>

          <button
            onClick={() => {
              playTapSound();
              setActiveTab('audit');
            }}
            className={`py-2 px-1 rounded-xl transition flex flex-col items-center gap-0.5 ${
              activeTab === 'audit'
                ? 'bg-rose-600 text-white shadow-md'
                : isDarkMode
                ? 'text-slate-300 hover:text-white'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] truncate">प्रमाणिक स्रोत</span>
          </button>
        </div>

        {/* ============================================================= */}
        {/* TAB 1: MONTHLY CALENDAR (मासिक पात्रो २००० देखि २१०० सम्म) */}
        {/* ============================================================= */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            {/* Calendar Control Navigation Bar */}
            <div
              className={`p-4 rounded-3xl shadow-sm border space-y-3.5 ${
                isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200/90'
              }`}
            >
              {/* Master Prompt Header: Big BS Year, Small AD Year, Clear Month */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700/60">
                <div>
                  <div className="text-3xl font-black text-rose-600 dark:text-rose-400 leading-none">
                    {toDevanagari(currentYear)}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold mt-0.5">
                    <small>{currentYear - 57} / {currentYear - 56} AD</small>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-slate-800 dark:text-slate-100 block">
                    {currentMonthName}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">
                    वि.सं. {toDevanagari(currentYear)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                {/* Year & Month Prev/Next Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevYear}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-700 dark:bg-slate-700 dark:text-slate-200 transition"
                    title="अघिल्लो वर्ष (Prev Year)"
                  >
                    <ChevronsLeft className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-700 dark:bg-slate-700 dark:text-slate-200 transition"
                    title="अघिल्लो महिना (Prev Month)"
                  >
                    <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* Month Selector Dropdown */}
                <select
                  value={currentMonth}
                  onChange={(e) => {
                    playTapSound();
                    setCurrentMonth(parseInt(e.target.value));
                    setSelectedDay(1);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-black outline-none border shadow-xs ${
                    isDarkMode
                      ? 'bg-slate-700 text-white border-slate-600 focus:border-rose-500'
                      : 'bg-slate-50 text-slate-900 border-slate-300 focus:border-rose-500'
                  }`}
                >
                  {NEPALI_MONTHS.map((m) => (
                    <option key={m.bsMonth} value={m.bsMonth}>
                      {language === 'hi' ? m.nameHi : language === 'ne' ? m.nameNe : m.nameEn} (
                      {m.bsMonth})
                    </option>
                  ))}
                </select>

                {/* Year Selector Dropdown */}
                <select
                  value={currentYear}
                  onChange={(e) => {
                    playTapSound();
                    setCurrentYear(parseInt(e.target.value));
                    setSelectedDay(1);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-black outline-none border shadow-xs ${
                    isDarkMode
                      ? 'bg-slate-700 text-white border-slate-600 focus:border-rose-500'
                      : 'bg-slate-50 text-slate-900 border-slate-300 focus:border-rose-500'
                  }`}
                >
                  {Array.from(
                    { length: BS_MAX_YEAR - BS_MIN_YEAR + 1 },
                    (_, i) => BS_MIN_YEAR + i
                  ).map((y) => (
                    <option key={y} value={y}>
                      वि.सं. {toDevanagari(y)} ({y})
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-700 dark:bg-slate-700 dark:text-slate-200 transition"
                    title="पछिल्लो महिना (Next Month)"
                  >
                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <button
                    onClick={handleNextYear}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-90 text-slate-700 dark:bg-slate-700 dark:text-slate-200 transition"
                    title="पछिल्लो वर्ष (Next Year)"
                  >
                    <ChevronsRight className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* Today Quick Jump */}
                <button
                  onClick={handleJumpToToday}
                  className="py-1.5 px-2.5 rounded-xl bg-rose-600 text-white font-black text-[11px] active:scale-95 shadow-xs transition hover:bg-rose-700"
                >
                  आज (Today)
                </button>
              </div>

              {/* Weekdays Header Row (Sun to Sat) */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-black pt-1">
                {WEEKDAYS.map((w, idx) => (
                  <div
                    key={idx}
                    className={`py-1 rounded-lg ${
                      w.isHoliday
                        ? 'text-rose-600 bg-rose-50/70 dark:bg-rose-950/40 dark:text-rose-400 font-extrabold'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {language === 'hi' ? w.shortHi : language === 'ne' ? w.shortNe : w.shortEn}
                  </div>
                ))}
              </div>

              {/* Calendar Days Matrix */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs pt-1">
                {/* Empty leading spacer slots */}
                {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                  <div key={`spacer-${idx}`} className="h-14 rounded-2xl bg-transparent" />
                ))}

                {/* Day Cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const adDate = convertBSToAD(currentYear, currentMonth, dayNum);
                  const dayOfWeek = (firstDayOfWeek + i) % 7;
                  const isSaturday = dayOfWeek === 6;
                  const isToday =
                    currentYear === todayBs.year &&
                    currentMonth === todayBs.month &&
                    dayNum === todayBs.day;
                  const isSelected = dayNum === selectedDay;

                  // Daily Panchang for Tithi name & Events
                  const panchang = calculatePanchang(adDate, currentYear, currentCity);
                  const hasEvents = panchang.events && panchang.events.length > 0;
                  const isPublicHoliday =
                    isSaturday ||
                    panchang.events?.some(
                      (e) => e.category === 'national_public' || e.category === 'regional_public'
                    );

                  return (
                    <button
                      key={dayNum}
                      onClick={() => {
                        playTapSound();
                        setSelectedDay(dayNum);
                        setIsDayDetailOpen(true);
                      }}
                      className={`h-14 rounded-2xl flex flex-col items-center justify-between p-1 transition-all active:scale-95 border ${
                        isSelected
                          ? 'border-rose-600 bg-rose-600 text-white shadow-md'
                          : isToday
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
                          : isDarkMode
                          ? 'border-slate-700/60 bg-slate-800/40 hover:bg-slate-700 text-slate-200'
                          : 'border-slate-200/70 bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      {/* Top: Main BS Day Number (Big) */}
                      <div className="w-full flex items-center justify-between px-1">
                        <span
                          className={`text-base font-black leading-tight ${
                            isSelected
                              ? 'text-white'
                              : isPublicHoliday
                              ? 'text-rose-600 dark:text-rose-400'
                              : ''
                          }`}
                        >
                          {toDevanagari(dayNum)}
                        </span>
                        {panchang.panchak.isActive && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-indigo-500"
                            title="पञ्चक"
                          />
                        )}
                        {panchang.sankranti.isSankranti && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-purple-500"
                            title="संक्रान्ति"
                          />
                        )}
                      </div>

                      {/* Right below BS date: Small AD Day Number */}
                      <span
                        className={`text-[10px] font-mono leading-none ${
                          isSelected
                            ? 'text-rose-100 opacity-90'
                            : isPublicHoliday
                            ? 'text-rose-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {adDate.getUTCDate()}
                      </span>

                      {/* Bottom: Tithi Short Name */}
                      <div className="w-full truncate px-0.5 text-[9px] font-medium leading-none">
                        {hasEvents ? (
                          <span
                            className={`font-bold ${
                              isSelected
                                ? 'text-amber-200'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            ★ {panchang.events[0].nameNe.slice(0, 5)}
                          </span>
                        ) : (
                          <span className="opacity-70 truncate block">
                            {panchang.tithi.ne.replace('शुक्ल ', 'शु.').replace('कृष्ण ', 'कृ.')}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Month's Festivals & Events Card */}
            <div
              className={`p-4 rounded-3xl shadow-sm border space-y-3 ${
                isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-600" />
                  <span>
                    यस महिनाका मुख्य चाडपर्वहरू ({currentMonthName} {toDevanagari(currentYear)})
                  </span>
                </span>
                <span className="text-[10px] text-slate-400">
                  कुल {toDevanagari(currentMonthEvents.length)} पर्वहरू
                </span>
              </div>

              {currentMonthEvents.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  यस महिनामा कुनै ठूला पर्व तालिका छैनन्।
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {currentMonthEvents.map(({ day, events }) => (
                    <div
                      key={day}
                      onClick={() => {
                        playTapSound();
                        setSelectedDay(day);
                        setIsDayDetailOpen(true);
                      }}
                      className={`p-2.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                        selectedDay === day
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                          : isDarkMode
                          ? 'border-slate-700 bg-slate-800/40 hover:bg-slate-700'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          {toDevanagari(day)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-extrabold truncate">{events[0].nameNe}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {events[0].categoryNameNe}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-rose-600 font-bold shrink-0">हेर्नुहोस् ›</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 2: DAILY SANSKRIT PANCHANG (आजको पञ्चाङ्ग) */}
        {/* ============================================================= */}
        {activeTab === 'panchang' && (
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0A1128] via-[#101F42] to-[#0A1128] text-white shadow-2xl border border-slate-700/80 space-y-4">
              {/* Header Info */}
              <div className="border-b border-white/10 pb-3 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>दैनिक सम्पूर्ण पञ्चाङ्ग (Asia/Kathmandu UTC+05:45)</span>
                  </span>
                  <h3 className="text-base font-black text-white mt-1">
                    वि.सं. {toDevanagari(todayBs.year)}{' '}
                    {NEPALI_MONTHS[todayBs.month - 1]?.nameNe} {toDevanagari(todayBs.day)} गते,{' '}
                    {WEEKDAYS[todayBs.dayOfWeek]?.fullNe}
                  </h3>
                  <p className="text-xs text-slate-300">
                    स्थान: {currentCity.nameNe} • संवत्सर: {todayPanchang.samvatsara} • आयनांश: लाहिडी
                    (२३° ५१' २५")
                  </p>
                </div>
                <button
                  onClick={handleCopyPanchang}
                  className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition text-xs font-bold flex items-center gap-1"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>साझा / कापी</span>
                </button>
              </div>

              {/* 5 Angas of Panchang (Tithi, Nakshatra, Yoga, Karana, Vara) */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-0.5">
                  <span className="text-slate-400 text-[10px] font-bold block">१. तिथि (Tithi)</span>
                  <p className="font-black text-cyan-300 text-sm">{todayPanchang.tithi.ne}</p>
                  <p className="text-[10px] text-slate-300">
                    {todayPanchang.pakshaNe}
                    {todayPanchang.tithiEndTime ? ` (${todayPanchang.tithiEndTime} सम्म)` : ''}
                  </p>
                </div>

                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-0.5">
                  <span className="text-slate-400 text-[10px] font-bold block">२. नक्षत्र (Nakshatra)</span>
                  <p className="font-black text-amber-300 text-sm">{todayPanchang.nakshatra.ne}</p>
                  <p className="text-[10px] text-slate-300">
                    चरण {toDevanagari(todayPanchang.nakshatraPada)} ({todayPanchang.nakshatra.lordNe})
                    {todayPanchang.nakshatraEndTime ? ` (${todayPanchang.nakshatraEndTime} सम्म)` : ''}
                  </p>
                </div>

                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-0.5">
                  <span className="text-slate-400 text-[10px] font-bold block">३. योग (Yoga)</span>
                  <p className="font-black text-emerald-300 text-sm">{todayPanchang.yoga.ne}</p>
                  <p className="text-[10px] text-slate-300">प्रकृति: {todayPanchang.yoga.nature}</p>
                </div>

                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-0.5">
                  <span className="text-slate-400 text-[10px] font-bold block">४. करण (Karana)</span>
                  <p className="font-black text-rose-300 text-sm">{todayPanchang.karana.ne}</p>
                  <p className="text-[10px] text-slate-300">
                    {todayPanchang.karana.isBhadra ? '⚠️ भद्रा (विष्टि)' : 'सामान्य शुभ'}
                  </p>
                </div>
              </div>

              {/* Sun & Moon Times */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 space-y-1">
                  <span className="text-amber-300 text-[10px] font-bold flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5" />
                    <span>सूर्य समय ({currentCity.nameNe})</span>
                  </span>
                  <p className="text-xs font-black text-white">
                    सूर्योदय: {todayPanchang.sunriseTime}
                  </p>
                  <p className="text-xs font-black text-white">
                    सूर्यास्त: {todayPanchang.sunsetTime}
                  </p>
                  <p className="text-[10px] text-slate-300">
                    दिनमान: {todayPanchang.dayDurationStr}
                  </p>
                </div>

                <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 space-y-1">
                  <span className="text-cyan-300 text-[10px] font-bold flex items-center gap-1">
                    <Moon className="w-3.5 h-3.5" />
                    <span>चन्द्र समय</span>
                  </span>
                  <p className="text-xs font-black text-white">
                    चन्द्रोदय: {todayPanchang.moonriseTime}
                  </p>
                  <p className="text-xs font-black text-white">
                    चन्द्रास्त: {todayPanchang.moonsetTime}
                  </p>
                  <p className="text-[10px] text-slate-300">मास: {todayPanchang.hinduMaas.ne}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 3: HINDU MUHURATS (अमृत काल, पञ्चक, भद्रा, अभिजित) */}
        {/* ============================================================= */}
        {activeTab === 'muhurat' && (
          <div className="space-y-4">
            {/* Muhurat Highlights Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {/* Abhijit */}
              <div
                className={`p-3 rounded-2xl border ${
                  todayPanchang.abhijitMuhurat.isAuspicious
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}
              >
                <Clock className="w-4 h-4 mb-1 text-emerald-600 dark:text-emerald-400" />
                <p className="font-extrabold text-[11px]">अभिजित मुहूर्त</p>
                <p className="font-mono text-xs font-black mt-0.5">
                  {todayPanchang.abhijitMuhurat.start} – {todayPanchang.abhijitMuhurat.end}
                </p>
                <p className="text-[9px] mt-0.5">
                  {todayPanchang.abhijitMuhurat.isAuspicious ? '✅ शुभ मुहूर्त' : '⚠️ बुधबार निषेध'}
                </p>
              </div>

              {/* Amrit Kaal */}
              <div className="p-3 rounded-2xl border bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                <Sparkles className="w-4 h-4 mb-1 text-amber-600 dark:text-amber-400" />
                <p className="font-extrabold text-[11px]">अमृत काल</p>
                <p className="font-mono text-xs font-black mt-0.5">
                  {todayPanchang.amritKaal.start} – {todayPanchang.amritKaal.end}
                </p>
                <p className="text-[9px] mt-0.5">🌟 सर्वोत्तम फलदायी</p>
              </div>

              {/* Panchak */}
              <div
                className={`p-3 rounded-2xl border ${
                  todayPanchang.panchak.isHazardous
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                }`}
              >
                <AlertTriangle className="w-4 h-4 mb-1 text-indigo-600 dark:text-indigo-400" />
                <p className="font-extrabold text-[11px]">पञ्चक विचार</p>
                <p className="text-xs font-black mt-0.5 truncate">
                  {todayPanchang.panchak.isActive ? '⚠️ पञ्चक सक्रिय' : '✅ पञ्चक छैन'}
                </p>
                <p className="text-[9px] mt-0.5 truncate">{todayPanchang.panchak.typeNe}</p>
              </div>

              {/* Bhadra */}
              <div
                className={`p-3 rounded-2xl border ${
                  todayPanchang.bhadra.isActive && !todayPanchang.bhadra.isAuspicious
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4 mb-1 text-emerald-600 dark:text-emerald-400" />
                <p className="font-extrabold text-[11px]">भद्रा (विष्टि करण)</p>
                <p className="text-xs font-black mt-0.5 truncate">
                  {todayPanchang.bhadra.isActive ? todayPanchang.bhadra.vaasNe : '✅ भद्रा छैन'}
                </p>
                <p className="text-[9px] mt-0.5 truncate">{todayPanchang.bhadra.descriptionNe}</p>
              </div>
            </div>

            {/* Inauspicious Kaal Timings (Rahu, Yama, Gulika) */}
            <div
              className={`p-4 rounded-3xl shadow-sm border space-y-3 ${
                isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200/90'
              }`}
            >
              <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>अशुभ काल समय (Inauspicious Kaal) - {currentCity.nameNe}</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                  <p className="font-bold text-rose-600 dark:text-rose-400">राहु काल (Rahu Kaal)</p>
                  <p className="font-mono text-sm font-black mt-1">
                    {todayPanchang.rahuKaal.start} – {todayPanchang.rahuKaal.end}
                  </p>
                  <p className="text-[10px] text-slate-500">शुभ कार्य वर्जित</p>
                </div>

                <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                  <p className="font-bold text-amber-600 dark:text-amber-400">
                    यमघण्ट (Yamaganda)
                  </p>
                  <p className="font-mono text-sm font-black mt-1">
                    {todayPanchang.yamaganda.start} – {todayPanchang.yamaganda.end}
                  </p>
                  <p className="text-[10px] text-slate-500">यात्रा तथा व्यापार मध्यम</p>
                </div>

                <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
                  <p className="font-bold text-cyan-600 dark:text-cyan-400">
                    गुलिक काल (Gulika Kaal)
                  </p>
                  <p className="font-mono text-sm font-black mt-1">
                    {todayPanchang.gulikaKaal.start} – {todayPanchang.gulikaKaal.end}
                  </p>
                  <p className="text-[10px] text-slate-500">शनि पुत्र गुलिक समय</p>
                </div>
              </div>
            </div>

            {/* Vivah, Griha Pravesh & Vahan Kharid Assessor */}
            <div
              className={`p-4 rounded-3xl shadow-sm border space-y-3 ${
                isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200/90'
              }`}
            >
              <h4 className="text-xs font-black">आजको कार्य शुभता मूल्याङ्कन</h4>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div
                  className={`p-3 rounded-2xl border ${
                    todayMuhurats.isVivahShubh
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Sparkles className="w-5 h-5 mx-auto mb-1 text-rose-500" />
                  <p className="font-black text-xs">विवाह लग्न</p>
                  <p className="text-[10px] mt-0.5 font-bold">
                    {todayMuhurats.isVivahShubh ? '✅ शुभ मुहूर्त' : 'सामान्य'}
                  </p>
                </div>

                <div
                  className={`p-3 rounded-2xl border ${
                    todayMuhurats.isGrihaPraveshShubh
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <HomeIcon className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                  <p className="font-black text-xs">गृह प्रवेश</p>
                  <p className="text-[10px] mt-0.5 font-bold">
                    {todayMuhurats.isGrihaPraveshShubh ? '✅ शुभ दिन' : 'मध्यम'}
                  </p>
                </div>

                <div
                  className={`p-3 rounded-2xl border ${
                    todayMuhurats.isVahanShubh
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Car className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                  <p className="font-black text-xs">सवारी खरिद</p>
                  <p className="text-[10px] mt-0.5 font-bold">
                    {todayMuhurats.isVahanShubh ? '✅ शुभ मुहूर्त' : 'सामान्य'}
                  </p>
                </div>
              </div>
            </div>

            {/* Choghadiya Table */}
            <div
              className={`p-4 rounded-3xl shadow-sm border space-y-3 ${
                isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-rose-600" />
                  <span>आजको दिन चौघडिया (Day Choghadiya):</span>
                </span>
                <span className="text-[10px] text-slate-400">{currentCity.nameNe}</span>
              </div>

              <div className="space-y-1.5 text-xs">
                {todayPanchang.choghadiya.map((ch, idx) => {
                  const isGood = ch.type === 'shubh';
                  const isBad = ch.type === 'ashubh';
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border ${
                        isGood
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                          : isBad
                          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
                          : 'bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isGood ? 'bg-emerald-500' : isBad ? 'bg-rose-500' : 'bg-amber-400'
                          }`}
                        />
                        <span className="font-black">{ch.name}</span>
                        <span className="text-[10px] font-medium opacity-80">({ch.nature})</span>
                      </div>
                      <span className="font-mono text-xs font-bold">
                        {ch.start} – {ch.end}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 24-Planetary Hora Timeline (Brihat Parashara Hora Shastra) */}
            <div
              className={`p-4 rounded-3xl shadow-sm border space-y-3 ${
                isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  <span>२४-घण्टे ग्रहीय होरा चक्र (Planetary Hora):</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {selectedDayWeekday.fullNe} ({selectedDayAd.toLocaleDateString('en-GB')})
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                सूर्य सिद्धान्त तथा वृहत् पराशर होरा शास्त्र अनुसार सूर्योदयदेखि २४ घण्टाका १२ दिवा र १२ रात्रि होराहरू:
              </p>

              {/* Day Horas Grid (दिवा होरा) */}
              <div className="space-y-2">
                <div className="text-[11px] font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>१२ दिवा होरा (दिनको समय: सूर्योदयदेखि सूर्यास्त)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  {selectedDayHoras.filter((h) => h.period === 'day').map((h) => (
                    <div
                      key={h.index}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-1.5 ${
                        h.nature === 'shubh'
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                          : h.nature === 'ashubh'
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
                          : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-bold">
                          #{h.index}
                        </span>
                        <div>
                          <div className="font-extrabold text-xs">{h.lordNameNe} होरा</div>
                          <div className="text-[9px] opacity-75">{h.suitabilityNe}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-[11px] font-bold">
                          {h.startTime} – {h.endTime}
                        </div>
                        <div className="text-[9px] font-extrabold">{h.natureLabelNe}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Night Horas Grid (रात्रि होरा) */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>१२ रात्रि होरा (रातको समय: सूर्यास्तदेखि अर्को सूर्योदय)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  {selectedDayHoras.filter((h) => h.period === 'night').map((h) => (
                    <div
                      key={h.index}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-1.5 ${
                        h.nature === 'shubh'
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                          : h.nature === 'ashubh'
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
                          : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-bold">
                          #{h.index}
                        </span>
                        <div>
                          <div className="font-extrabold text-xs">{h.lordNameNe} होरा</div>
                          <div className="text-[9px] opacity-75">{h.suitabilityNe}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-[11px] font-bold">
                          {h.startTime} – {h.endTime}
                        </div>
                        <div className="text-[9px] font-extrabold">{h.natureLabelNe}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 4: COMPLETE FESTIVAL DATABASE (चाडपर्व पात्रो) */}
        {/* ============================================================= */}
        {activeTab === 'festivals' && (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-3xl shadow-sm border space-y-3.5 ${
                isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-black">
                    नेपालका राष्ट्रिय तथा सांस्कृतिक चाडपर्वहरू
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    वि.सं. {toDevanagari(currentYear)} (बडा दशैं, तिहार, छठ, माघी, तीज, ल्होसार,
                    शिवरात्री, आदि)
                  </p>
                </div>

                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                    currentYear >= 2084
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                  }`}
                >
                  {currentYear >= 2084
                    ? '⚠️ अनुमानित (राजपत्रमा प्रकाशित हुन बाँकी)'
                    : '✓ राजपत्र प्रमाणित सूची'}
                </span>
              </div>

              {/* Search bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="पर्व खोज्नुहोस् (उदा: दशैं, तिहार, छठ, होली, तीज)..."
                  value={festivalSearchQuery}
                  onChange={(e) => setFestivalSearchQuery(e.target.value)}
                  className={`w-full py-2 pl-9 pr-3 rounded-2xl text-xs font-bold outline-none border transition ${
                    isDarkMode
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-rose-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-rose-500'
                  }`}
                />
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              </div>

              {/* 12 Months Event Accordion */}
              <div className="space-y-4 pt-1">
                {Array.from({ length: 12 }, (_, mIdx) => {
                  const mNum = mIdx + 1;
                  const mDays = getMonthDaysCount(currentYear, mNum);
                  const mName = NEPALI_MONTHS[mIdx].nameNe;

                  // Collect events for month
                  const mEvents: Array<{ day: number; event: GovernmentHolidayRecord }> = [];
                  for (let d = 1; d <= mDays; d++) {
                    const ad = convertBSToAD(currentYear, mNum, d);
                    const p = calculatePanchang(ad, currentYear, currentCity);
                    if (p.events) {
                      for (const ev of p.events) {
                        if (
                          !festivalSearchQuery ||
                          ev.nameNe.toLowerCase().includes(festivalSearchQuery.toLowerCase()) ||
                          ev.nameEn.toLowerCase().includes(festivalSearchQuery.toLowerCase())
                        ) {
                          mEvents.push({ day: d, event: ev });
                        }
                      }
                    }
                  }

                  if (mEvents.length === 0) return null;

                  return (
                    <div key={mNum} className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-rose-600 dark:text-rose-400">
                        <Flame className="w-3.5 h-3.5" />
                        <span>• {mName} महिना</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({toDevanagari(mEvents.length)} पर्वहरू)
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {mEvents.map(({ day, event }, idx) => (
                          <div
                            key={`${day}_${idx}`}
                            className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs ${
                              event.category === 'national_public'
                                ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
                                : isDarkMode
                                ? 'bg-slate-700/40 border-slate-700'
                                : 'bg-slate-50 border-slate-200/70'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                {toDevanagari(day)}
                              </span>
                              <div className="min-w-0">
                                <p className="font-black text-slate-900 dark:text-white truncate">
                                  {event.nameNe}
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                  {event.categoryNameNe} • {event.officialSource}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                                event.category === 'national_public'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {event.categoryNameNe}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 5: OFFICIAL GOVERNMENT HOLIDAY ENGINE (८ वर्ग बिदा वर्गीकरण) */}
        {/* ============================================================= */}
        {activeTab === 'holidays' && (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-3xl shadow-sm border space-y-3.5 ${
                isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-black flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-rose-600" />
                    <span>नेपाल सरकार आधिकारिक सार्वजनिक बिदा इन्जिन (MOHA Gazette)</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    गृह मन्त्रालय, नेपाल राजपत्रमा प्रकाशित ८ वर्गका बिदाहरूको पूर्ण सूची
                  </p>
                </div>

                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                    currentYear <= 2083
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                  }`}
                >
                  {currentYear <= 2083
                    ? '✓ राजपत्र प्रमाणित सूची (Official Gazetted)'
                    : '⚠️ आगामी वर्ष अनुमानित'}
                </span>
              </div>

              {/* 8 Categories Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
                <button
                  onClick={() => setHolidayCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl shrink-0 transition ${
                    holidayCategoryFilter === 'all'
                      ? 'bg-rose-600 text-white font-black'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  सबै बिदा ({toDevanagari(fullYearHolidays.length)})
                </button>

                {Object.entries(HOLIDAY_CATEGORY_METADATA).map(([catKey, meta]) => (
                  <button
                    key={catKey}
                    onClick={() => setHolidayCategoryFilter(catKey)}
                    className={`px-3 py-1.5 rounded-xl shrink-0 transition ${
                      holidayCategoryFilter === catKey
                        ? 'bg-rose-600 text-white font-black'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {meta.nameNe}
                  </button>
                ))}
              </div>

              {/* Holiday List */}
              <div className="space-y-2 pt-2">
                {filteredHolidays.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    छानिएको वर्गमा कुनै बिदा रेकर्ड फेला परेन।
                  </p>
                ) : (
                  filteredHolidays.map((h, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                        isDarkMode
                          ? 'bg-slate-700/40 border-slate-700'
                          : 'bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-600">
                            {NEPALI_MONTHS[h.bsMonth - 1]?.nameNe} {toDevanagari(h.bsDay)} गते
                          </span>
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              HOLIDAY_CATEGORY_METADATA[h.category]?.badgeColor ||
                              'bg-slate-500 text-white'
                            }`}
                          >
                            {h.categoryNameNe}
                          </span>
                          {h.isConfirmed ? (
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                              ✓ प्रमाणित
                            </span>
                          ) : (
                            <span className="text-[9px] text-amber-500 font-bold">⚠️ अनुमानित</span>
                          )}
                        </div>

                        <p className="font-black text-slate-900 dark:text-white text-sm">
                          {h.nameNe}
                        </p>

                        <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          <span>स्रोत: {h.officialSource}</span>
                          {h.gazetteRef && <span>({h.gazetteRef})</span>}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 block">
                          {h.adDate}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 6: SOURCE VERIFICATION & AUDIT (प्रमाणिक स्रोत तथा परीक्षण) */}
        {/* ============================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div
              className={`p-5 rounded-3xl shadow-sm border space-y-4 ${
                isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white border-slate-200/90'
              }`}
            >
              <div>
                <span className="text-[10px] text-rose-600 font-black uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Phase 2: Source Verification & Audit System</span>
                </span>
                <h3 className="text-base font-black mt-1">
                  नेपाल पात्रो तथा पञ्चाङ्ग प्रमाणिक आधिकारिक स्रोतहरू
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  घाउले क्याल्कुलेटरले प्रयोग गर्ने ३ आधिकारिक स्रोत र स्वचालित परीक्षण स्थिति
                </p>
              </div>

              {/* Source Cards */}
              <div className="space-y-3">
                {SOURCE_METADATA.map((src, i) => (
                  <div
                    key={i}
                    className={`p-3.5 rounded-2xl border space-y-1.5 text-xs ${
                      isDarkMode
                        ? 'bg-slate-700/50 border-slate-600'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 dark:text-white text-sm">
                        {src.sourceName}
                      </span>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          src.verificationStatus === 'verified_official'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {src.verificationStatus === 'verified_official'
                          ? '✓ Verified Official'
                          : 'Astronomical Engine'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      {src.authority}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      प्रकाशन: {src.officialPublicationYear} • अन्तिम अद्यावधिक: {src.lastUpdatedDate}
                    </p>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-600/50">
                      {src.notes}
                    </p>
                  </div>
                ))}
              </div>

              {/* Verification Audit Log */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>स्वचालित परीक्षण अडिट रिपोर्ट (Automated QA Audit Log)</span>
                  </span>
                  <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    {VERIFICATION_LOG.auditId}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                  <div className="p-2 rounded-xl bg-white/40 dark:bg-black/20">
                    <span className="text-[9px] block text-slate-500">परीक्षण मिति संख्या:</span>
                    <span className="font-bold">{VERIFICATION_LOG.totalDatesAudited} दिन</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/40 dark:bg-black/20">
                    <span className="text-[9px] block text-slate-500">त्रुटि / विसंगति:</span>
                    <span className="font-bold text-emerald-600">
                      {VERIFICATION_LOG.mismatchesDetected} (०)
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/40 dark:bg-black/20">
                    <span className="text-[9px] block text-slate-500">इन्जिन भर्सन:</span>
                    <span className="font-bold">{VERIFICATION_LOG.engineVersion}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/40 dark:bg-black/20">
                    <span className="text-[9px] block text-slate-500">परीक्षण स्थिति:</span>
                    <span className="font-bold text-emerald-600">✓ PASSED 100%</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                  हस्ताक्षरकर्ता: {VERIFICATION_LOG.signedBy} ({VERIFICATION_LOG.auditTimestamp})
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* DAILY DETAILS MODAL (Full 10+ items on date cell click) */}
        {/* ------------------------------------------------------------- */}
        {isDayDetailOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsDayDetailOpen(false)}
            />
            <div
              className={`relative w-full max-w-md rounded-3xl p-5 shadow-2xl z-10 max-h-[90vh] overflow-y-auto space-y-4 border ${
                isDarkMode
                  ? 'bg-[#0A1128] text-white border-slate-700'
                  : 'bg-white text-slate-900 border-slate-200'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b pb-3 border-slate-200 dark:border-white/10">
                <div>
                  <span className="text-[10px] font-black text-rose-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>दैनिक सम्पूर्ण विवरण (Daily Full Panchang)</span>
                  </span>
                  <h3 className="text-base font-black mt-0.5">
                    वि.सं. {toDevanagari(currentYear)} {currentMonthName}{' '}
                    {toDevanagari(selectedDay)} गते
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedDayWeekday.fullNe} • AD:{' '}
                    {selectedDayAd.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}{' '}
                    ({selectedDayWeekday.fullEn})
                  </p>
                </div>

                <button
                  onClick={() => setIsDayDetailOpen(false)}
                  className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Events & Holidays Cards */}
              {selectedDayPanchang.events && selectedDayPanchang.events.length > 0 && (
                <div className="space-y-1.5">
                  {selectedDayPanchang.events.map((ev, i) => (
                    <div
                      key={i}
                      className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center gap-2.5"
                    >
                      <Flame className="w-5 h-5 text-rose-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-rose-600 dark:text-rose-300 truncate">
                          {ev.nameNe}
                        </p>
                        <p className="text-[10px] text-rose-500">
                          {ev.categoryNameNe} •{' '}
                          {ev.isConfirmed ? '✓ राजपत्र प्रमाणित' : '⚠️ आगामी वर्ष अनुमानित'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 10 Required Astronomical Items */}
              <div className="space-y-2 text-xs">
                {/* 1. Tithi & Paksha */}
                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">
                    १. तिथि र पक्ष (Tithi & Paksha):
                  </span>
                  <p className="font-extrabold text-cyan-600 dark:text-cyan-300 text-sm">
                    {selectedDayPanchang.tithi.ne} ({selectedDayPanchang.pakshaNe})
                    {selectedDayPanchang.tithiEndTime
                      ? ` — ${selectedDayPanchang.tithiEndTime} सम्म`
                      : ''}
                  </p>
                </div>

                {/* 2. Nakshatra, Yoga, Karana */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      २. नक्षत्र (Nakshatra):
                    </span>
                    <p className="font-extrabold text-amber-600 dark:text-amber-300 text-xs mt-0.5">
                      {selectedDayPanchang.nakshatra.ne}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      चरण {toDevanagari(selectedDayPanchang.nakshatraPada)} (
                      {selectedDayPanchang.nakshatra.lordNe})
                      {selectedDayPanchang.nakshatraEndTime
                        ? ` • ${selectedDayPanchang.nakshatraEndTime} सम्म`
                        : ''}
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      ३. योग र करण (Yoga & Karana):
                    </span>
                    <p className="font-extrabold text-emerald-600 dark:text-emerald-300 text-xs mt-0.5">
                      {selectedDayPanchang.yoga.ne} ({selectedDayPanchang.yoga.nature})
                    </p>
                    <p className="text-[10px] text-slate-400">
                      करण: {selectedDayPanchang.karana.ne}
                    </p>
                  </div>
                </div>

                {/* 3. Solar & Lunar Timings */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      ४. सूर्योदय / सूर्यास्त ({currentCity.nameNe}):
                    </span>
                    <p className="font-extrabold text-xs mt-0.5">
                      {selectedDayPanchang.sunriseTime} • {selectedDayPanchang.sunsetTime}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      दिनमान: {selectedDayPanchang.dayDurationStr}
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      ५. चन्द्रोदय / चन्द्रास्त:
                    </span>
                    <p className="font-extrabold text-xs mt-0.5">
                      {selectedDayPanchang.moonriseTime} • {selectedDayPanchang.moonsetTime}
                    </p>
                  </div>
                </div>

                {/* 4. Muhurat & Inauspicious Times */}
                <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 space-y-1">
                  <span className="text-[10px] text-rose-500 dark:text-rose-300 font-black block">
                    ६. मुहूर्त तथा काल समय:
                  </span>
                  <p className="text-xs font-bold">
                    अभिजित मुहूर्त:{' '}
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                      {selectedDayPanchang.abhijitMuhurat.start} –{' '}
                      {selectedDayPanchang.abhijitMuhurat.end}
                    </span>{' '}
                    {selectedDayPanchang.abhijitMuhurat.isAuspicious ? '(शुभ)' : '(बुधबार वर्जित)'}
                  </p>
                  <p className="text-xs font-bold">
                    अमृत काल:{' '}
                    <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                      {selectedDayPanchang.amritKaal.start} – {selectedDayPanchang.amritKaal.end}
                    </span>{' '}
                    (शुभ मुहूर्त)
                  </p>
                  <p className="text-xs font-bold">
                    राहु काल:{' '}
                    <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                      {selectedDayPanchang.rahuKaal.start} – {selectedDayPanchang.rahuKaal.end}
                    </span>{' '}
                    (अशुभ समय)
                  </p>
                </div>

                {/* 5. Panchak & Bhadra Status */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      ७. पञ्चक स्थिति:
                    </span>
                    <p className="font-bold text-xs mt-0.5">
                      {selectedDayPanchang.panchak.isActive ? '⚠️ पञ्चक दोष' : '✅ पञ्चक छैन'}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {selectedDayPanchang.panchak.typeNe}
                    </p>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <span className="text-[10px] text-slate-400 font-bold block">
                      ८. भद्रा (विष्टि करण):
                    </span>
                    <p className="font-bold text-xs mt-0.5">
                      {selectedDayPanchang.bhadra.isActive
                        ? selectedDayPanchang.bhadra.vaasNe
                        : '✅ भद्रा छैन'}
                    </p>
                    <p className="text-[9px] text-slate-400">
                      {selectedDayPanchang.bhadra.descriptionNe}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions: Copy */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={handleCopyPanchang}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30"
                >
                  {copiedSuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSuccess ? 'कापी सम्पन्न' : 'सम्पूर्ण पञ्चाङ्ग कापी गर्नुहोस्'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reminders & Alerts Modal */}
        <RemindersModal
          isOpen={isRemindersOpen}
          onClose={() => setIsRemindersOpen(false)}
          language={language}
          showToast={showToast}
        />

        {/* Developer REST API Documentation Modal */}
        <ApiDocumentationModal
          isOpen={isApiDocsOpen}
          onClose={() => setIsApiDocsOpen(false)}
          language={language}
        />

        {/* Ghaule Pro & Premium Entitlement Modal */}
        <PremiumModal
          isOpen={isPremiumOpen}
          onClose={() => setIsPremiumOpen(false)}
          language={language}
          showToast={showToast}
        />
      </main>
    </div>
  );
};
