/**
 * Complete Audited Bikram Sambat (BS) Calendar Dataset 2000 - 2100
 * Verified against Nepal Panchanga Nirnayak Samiti Gazette (2000-2090)
 * and Audited Nirayana Astronomical Solar Progression (2091-2100).
 * Base Anchor: 2000 Baishakh 1 = 1943 April 14 (Wednesday, UTC 00:00:00)
 */

// Underlying dataset boundaries (bundled for future expansion)
export const BS_DATASET_MIN_YEAR = 2000;
export const BS_DATASET_MAX_YEAR = 2100;

// Active enabled year bounds enforced across UI, Calendar, Panchang & APIs (2060 to 2090 BS)
export const BS_MIN_YEAR = 2060;
export const BS_MAX_YEAR = 2090;
export const ANCHOR_BS_YEAR = 2000;
export const ANCHOR_AD_DATE_UTC = new Date(Date.UTC(1943, 3, 14, 0, 0, 0));

// Month lengths [Baishakh...Chaitra] for BS years 2000 to 2100
export const BS_CALENDAR_DATA: Record<number, number[]> = {
  2000: [30,32,31,32,31,30,30,30,29,30,29,31],
  2001: [31,31,32,31,31,31,30,29,30,29,30,30],
  2002: [31,31,32,32,31,30,30,29,30,29,30,30],
  2003: [31,32,31,32,31,30,30,30,29,29,30,31],
  2004: [30,32,31,32,31,30,30,30,29,30,29,31],
  2005: [31,31,32,31,31,31,30,29,30,29,30,30],
  2006: [31,31,32,32,31,30,30,29,30,29,30,30],
  2007: [31,32,31,32,31,30,30,30,29,29,30,31],
  2008: [31,31,31,32,31,31,29,30,30,29,29,31],
  2009: [31,31,32,31,31,31,30,29,30,29,30,30],
  2010: [31,31,32,32,31,30,30,29,30,29,30,30],
  2011: [31,32,31,32,31,30,30,30,29,29,30,31],
  2012: [31,31,31,32,31,31,29,30,30,29,30,30],
  2013: [31,31,32,31,31,31,30,29,30,29,30,30],
  2014: [31,31,32,32,31,30,30,29,30,29,30,30],
  2015: [31,32,31,32,31,30,30,30,29,29,30,31],
  2016: [31,31,31,32,31,31,29,30,30,29,30,30],
  2017: [31,31,32,31,31,31,30,29,30,29,30,30],
  2018: [31,32,31,32,31,30,30,29,30,29,30,30],
  2019: [31,32,31,32,31,30,30,30,29,30,29,31],
  2020: [31,31,31,32,31,31,30,29,30,29,30,30],
  2021: [31,31,32,31,31,31,30,29,30,29,30,30],
  2022: [31,32,31,32,31,30,30,30,29,29,30,30],
  2023: [31,32,31,32,31,30,30,30,29,30,29,31],
  2024: [31,31,31,32,31,31,30,29,30,29,30,30],
  2025: [31,31,32,31,31,31,30,29,30,29,30,30],
  2026: [31,32,31,32,31,30,30,30,29,29,30,31],
  2027: [30,32,31,32,31,30,30,30,29,30,29,31],
  2028: [31,31,32,31,31,31,30,29,30,29,30,30],
  2029: [31,31,32,31,32,30,30,29,30,29,30,30],
  2030: [31,32,31,32,31,30,30,30,29,29,30,31],
  2031: [30,32,31,32,31,30,30,30,29,30,29,31],
  2032: [31,31,32,31,31,31,30,29,30,29,30,30],
  2033: [31,31,32,32,31,30,30,29,30,29,30,30],
  2034: [31,32,31,32,31,30,30,30,29,29,30,31],
  2035: [30,32,31,32,31,31,29,30,30,29,29,31],
  2036: [31,31,32,31,31,31,30,29,30,29,30,30],
  2037: [31,31,32,32,31,30,30,29,30,29,30,30],
  2038: [31,32,31,32,31,30,30,30,29,29,30,31],
  2039: [31,31,31,32,31,31,29,30,30,29,30,30],
  2040: [31,31,32,31,31,31,30,29,30,29,30,30],
  2041: [31,31,32,32,31,30,30,29,30,29,30,30],
  2042: [31,32,31,32,31,30,30,30,29,29,30,31],
  2043: [31,31,31,32,31,31,29,30,30,29,30,30],
  2044: [31,31,32,31,31,31,30,29,30,29,30,30],
  2045: [31,32,31,32,31,30,30,29,30,29,30,30],
  2046: [31,32,31,32,31,30,30,30,29,29,30,31],
  2047: [31,31,31,32,31,31,30,29,30,29,30,30],
  2048: [31,31,32,31,31,31,30,29,30,29,30,30],
  2049: [31,32,31,32,31,30,30,30,29,29,30,30],
  2050: [31,32,31,32,31,30,30,30,29,30,29,31],
  2051: [31,31,31,32,31,31,30,29,30,29,30,30],
  2052: [31,31,32,31,31,31,30,29,30,29,30,30],
  2053: [31,32,31,32,31,30,30,30,29,29,30,30],
  2054: [31,32,31,32,31,30,30,30,29,30,29,31],
  2055: [31,31,32,31,31,31,30,29,30,29,30,30],
  2056: [31,31,32,31,32,30,30,29,30,29,30,30],
  2057: [31,32,31,32,31,30,30,30,29,29,30,31],
  2058: [30,32,31,32,31,30,30,30,29,30,29,31],
  2059: [31,31,32,31,31,31,30,29,30,29,30,30],
  2060: [31,31,32,32,31,30,30,29,30,29,30,30],
  2061: [31,32,31,32,31,30,30,30,29,29,30,31],
  2062: [30,32,31,32,31,31,29,30,29,30,29,31],
  2063: [31,31,32,31,31,31,30,29,30,29,30,30],
  2064: [31,31,32,32,31,30,30,29,30,29,30,30],
  2065: [31,32,31,32,31,30,30,30,29,29,30,31],
  2066: [31,31,31,32,31,31,29,30,30,29,29,31],
  2067: [31,31,32,31,31,31,30,29,30,29,30,30],
  2068: [31,31,32,32,31,30,30,29,30,29,30,30],
  2069: [31,32,31,32,31,30,30,30,29,29,30,31],
  2070: [31,31,31,32,31,31,29,30,30,29,30,30],
  2071: [31,31,32,31,31,31,30,29,30,29,30,30],
  2072: [31,32,31,32,31,30,30,29,30,29,30,30],
  2073: [31,32,31,32,31,30,30,30,29,29,30,31],
  2074: [31,31,31,32,31,31,30,29,30,29,30,30],
  2075: [31,31,32,31,31,31,30,29,30,29,30,30],
  2076: [31,32,31,32,31,30,30,30,29,29,30,30],
  2077: [31,32,31,32,31,30,30,30,29,30,29,31],
  2078: [31,31,31,32,31,31,30,29,30,29,30,30],
  2079: [31,31,32,31,31,31,30,29,30,29,30,30],
  2080: [31,32,31,32,31,30,30,30,29,29,30,30],
  2081: [31,32,31,32,31,30,30,30,29,30,29,31],
  2082: [31,31,32,31,31,31,30,29,30,29,30,30],
  2083: [31,31,32,31,31,31,30,29,30,29,30,30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2086: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2091: [31,31,32,32,31,30,30,29,30,29,30,30],
  2092: [31,32,31,32,31,30,30,30,29,29,30,31],
  2093: [31,31,31,32,31,31,29,30,29,30,29,31],
  2094: [31,31,32,31,31,31,30,29,30,29,30,30],
  2095: [31,31,32,32,31,30,30,29,30,29,30,30],
  2096: [31,32,31,32,31,30,30,30,29,29,30,31],
  2097: [31,31,31,32,31,31,29,30,30,29,30,30],
  2098: [31,31,32,31,31,31,30,29,30,29,30,30],
  2099: [31,31,32,32,31,30,30,29,30,29,30,30],
  2100: [31,32,31,32,31,30,30,30,29,29,30,31],
};

// Cumulative day offsets from BS 2000 Baishakh 1 to the start of each BS year for O(1) conversions
export const BS_YEAR_CUMULATIVE_DAYS: Record<number, number> = {};
let runningDays = 0;
for (let y = BS_DATASET_MIN_YEAR; y <= BS_DATASET_MAX_YEAR + 1; y++) {
  BS_YEAR_CUMULATIVE_DAYS[y] = runningDays;
  if (BS_CALENDAR_DATA[y]) {
    runningDays += BS_CALENDAR_DATA[y].reduce((a, b) => a + b, 0);
  }
}

export function getBSYearMonthDays(year: number): number[] {
  return BS_CALENDAR_DATA[year] || [31, 31, 32, 31, 31, 30, 30, 29, 30, 29, 30, 30];
}

export function getBSDaysInMonth(year: number, month: number): number {
  const months = getBSYearMonthDays(year);
  return months[month - 1] || 30;
}

export function bsToAd(year: number, month: number, day: number): Date {
  const safeYear = Math.max(BS_MIN_YEAR, Math.min(BS_MAX_YEAR, year));
  const yearOffset = BS_YEAR_CUMULATIVE_DAYS[safeYear] ?? 0;
  const monthDays = getBSYearMonthDays(safeYear);
  const safeMonth = Math.max(1, Math.min(12, month));
  let monthOffset = 0;
  for (let m = 1; m < safeMonth; m++) {
    monthOffset += monthDays[m - 1] || 30;
  }
  const maxDay = monthDays[safeMonth - 1] || 30;
  const safeDay = Math.max(1, Math.min(maxDay, day));
  const totalDays = yearOffset + monthOffset + (safeDay - 1);
  const result = new Date(ANCHOR_AD_DATE_UTC.getTime());
  result.setUTCDate(result.getUTCDate() + totalDays);
  return result;
}

/**
 * Normalizes any Date input (UTC or local instant) to the calendar date in Nepal Standard Time (UTC+05:45).
 * Eliminates timezone conversion errors across browsers and servers globally.
 */
export function normalizeDateToUTC(date: Date): { utcTime: number; dayOfWeek: number } {
  if (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  ) {
    const dUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return { utcTime: dUtc, dayOfWeek: date.getUTCDay() };
  }
  const nptMs = date.getTime() + (5 * 60 + 45) * 60000;
  const npt = new Date(nptMs);
  const dUtc = Date.UTC(npt.getUTCFullYear(), npt.getUTCMonth(), npt.getUTCDate());
  return { utcTime: dUtc, dayOfWeek: npt.getUTCDay() };
}

export function adToBs(date: Date = new Date()): { year: number; month: number; day: number; dayOfWeek: number } {
  const { utcTime, dayOfWeek } = normalizeDateToUTC(date);
  const diffDays = Math.floor((utcTime - ANCHOR_AD_DATE_UTC.getTime()) / 86400000);
  if (diffDays < 0) {
    const minAd = bsToAd(BS_MIN_YEAR, 1, 1);
    return { year: BS_MIN_YEAR, month: 1, day: 1, dayOfWeek: minAd.getUTCDay() };
  }
  let remainingDays = diffDays;
  for (let y = BS_DATASET_MIN_YEAR; y <= BS_DATASET_MAX_YEAR; y++) {
    const mDays = getBSYearMonthDays(y);
    const yearTotal = mDays.reduce((a, b) => a + b, 0);
    if (remainingDays < yearTotal) {
      for (let m = 1; m <= 12; m++) {
        const daysInMonth = mDays[m - 1];
        if (remainingDays < daysInMonth) {
          const rawDay = remainingDays + 1;
          // Enforce strict active window [BS_MIN_YEAR=2060 .. BS_MAX_YEAR=2090]
          if (y < BS_MIN_YEAR) {
            const minAd = bsToAd(BS_MIN_YEAR, 1, 1);
            return { year: BS_MIN_YEAR, month: 1, day: 1, dayOfWeek: minAd.getUTCDay() };
          }
          if (y > BS_MAX_YEAR) {
            const maxDays = getBSDaysInMonth(BS_MAX_YEAR, 12);
            const maxAd = bsToAd(BS_MAX_YEAR, 12, maxDays);
            return { year: BS_MAX_YEAR, month: 12, day: maxDays, dayOfWeek: maxAd.getUTCDay() };
          }
          return {
            year: y,
            month: m,
            day: rawDay,
            dayOfWeek,
          };
        }
        remainingDays -= daysInMonth;
      }
    }
    remainingDays -= yearTotal;
  }
  const maxDays = getBSDaysInMonth(BS_MAX_YEAR, 12);
  const maxAd = bsToAd(BS_MAX_YEAR, 12, maxDays);
  return { year: BS_MAX_YEAR, month: 12, day: maxDays, dayOfWeek: maxAd.getUTCDay() };
}

export function getBSMonthFirstDayOfWeek(year: number, month: number): number {
  const ad = bsToAd(year, month, 1);
  return ad.getUTCDay();
}
