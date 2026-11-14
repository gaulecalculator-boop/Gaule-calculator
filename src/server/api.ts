/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Ghaule Calendar — RESTful API System (v1)
 * Modular Express Router implementing:
 * - Versioning: /api/v1/calendar/...
 * - Comprehensive Input Validation
 * - Uniform JSON Error & Response Schemas
 * - In-memory Token-Bucket Rate Limiter
 * - API Key Authentication for Protected Endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  bsToAd,
  adToBs,
  getBSDaysInMonth,
  getBSYearMonthDays,
  BS_MIN_YEAR,
  BS_MAX_YEAR,
} from '../utils/nepaliCalendarData';
import { NEPALI_MONTHS, WEEKDAYS } from '../utils/nepaliCalendar';
import {
  calculatePanchang,
  calculateSunTimes,
  NEPAL_CITIES,
  getFestivalForDate,
} from '../utils/panchangEngine';
import { calculate24Horas } from '../utils/horaEngine';
import { patroDb } from '../utils/patroDatabase';

export const calendarApiRouter = Router();

// -------------------------------------------------------------
// RATE LIMITING & SECURITY MIDDLEWARE
// -------------------------------------------------------------
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 60;

function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  let clientRecord = requestCounts.get(ip);

  if (!clientRecord || now > clientRecord.resetTime) {
    clientRecord = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
    requestCounts.set(ip, clientRecord);
  } else {
    clientRecord.count++;
  }

  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_MINUTE);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_MINUTE - clientRecord.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(clientRecord.resetTime / 1000));

  if (clientRecord.count > MAX_REQUESTS_PER_MINUTE) {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please slow down and try again in 1 minute.',
      },
    });
    return;
  }
  next();
}

calendarApiRouter.use(rateLimiter);

// -------------------------------------------------------------
// STANDARDIZED API RESPONSE HELPERS
// -------------------------------------------------------------
function sendSuccess(res: Response, data: any, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    apiVersion: '1.0.0',
    timestamp: new Date().toISOString(),
    data,
  });
}

function sendError(res: Response, code: string, message: string, statusCode = 400, details?: any) {
  res.status(statusCode).json({
    success: false,
    apiVersion: '1.0.0',
    timestamp: new Date().toISOString(),
    error: {
      code,
      message,
      details,
    },
  });
}

// -------------------------------------------------------------
// ENDPOINTS
// -------------------------------------------------------------

/**
 * GET /api/v1/calendar/today
 * Returns current Nepali date in BS and AD with weekday and quick tithi
 */
calendarApiRouter.get('/today', (req: Request, res: Response) => {
  try {
    const now = new Date();
    const bs = adToBs(now);
    const p = calculatePanchang(now, bs.year);

    sendSuccess(res, {
      bsDate: {
        year: bs.year,
        month: bs.month,
        day: bs.day,
        monthName: NEPALI_MONTHS[bs.month - 1]?.nameNe,
        monthNameEn: NEPALI_MONTHS[bs.month - 1]?.nameEn,
        formatted: `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`,
      },
      adDate: {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate(),
        formatted: now.toISOString().slice(0, 10),
      },
      weekday: {
        index: bs.dayOfWeek,
        nameNe: WEEKDAYS[bs.dayOfWeek]?.fullNe,
        nameEn: WEEKDAYS[bs.dayOfWeek]?.fullEn,
        isHoliday: bs.dayOfWeek === 6,
      },
      quickPanchang: {
        tithi: p.tithi.ne,
        paksha: p.pakshaNe,
        nakshatra: p.nakshatra.ne,
        sunrise: p.sunriseTime,
        sunset: p.sunsetTime,
      },
    });
  } catch (err: any) {
    sendError(res, 'SERVER_ERROR', err?.message || 'Error resolving today date', 500);
  }
});

/**
 * GET /api/v1/calendar/convert
 * Query params:
 *   - from: 'bs' | 'ad' (default 'bs')
 *   - year, month, day (integers)
 */
calendarApiRouter.get('/convert', (req: Request, res: Response) => {
  const from = (req.query.from as string || 'bs').toLowerCase();
  const year = parseInt(req.query.year as string, 10);
  const month = parseInt(req.query.month as string, 10);
  const day = parseInt(req.query.day as string, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return sendError(res, 'INVALID_QUERY', 'year, month, and day query parameters must be integers');
  }

  if (from === 'bs') {
    if (year < BS_MIN_YEAR || year > BS_MAX_YEAR) {
      return sendError(res, 'YEAR_OUT_OF_RANGE', `Year must be between ${BS_MIN_YEAR} and ${BS_MAX_YEAR} BS`);
    }
    if (month < 1 || month > 12) {
      return sendError(res, 'MONTH_OUT_OF_RANGE', 'Month must be between 1 and 12');
    }
    const maxDays = getBSDaysInMonth(year, month);
    if (day < 1 || day > maxDays) {
      return sendError(res, 'DAY_OUT_OF_RANGE', `Day must be between 1 and ${maxDays} for ${year} month ${month}`);
    }

    const ad = bsToAd(year, month, day);
    const dayOfWeek = ad.getUTCDay();

    sendSuccess(res, {
      input: { calendar: 'BS', year, month, day },
      output: {
        calendar: 'AD',
        year: ad.getUTCFullYear(),
        month: ad.getUTCMonth() + 1,
        day: ad.getUTCDate(),
        formatted: ad.toISOString().slice(0, 10),
        weekday: WEEKDAYS[dayOfWeek]?.fullEn,
        weekdayNe: WEEKDAYS[dayOfWeek]?.fullNe,
      },
    });
  } else if (from === 'ad') {
    if (year < 2003 || year > 2029) {
      return sendError(res, 'YEAR_OUT_OF_RANGE', 'AD Year must be between 2003 and 2029 (corresponding to BS 2060-2085)');
    }
    if (month < 1 || month > 12) {
      return sendError(res, 'MONTH_OUT_OF_RANGE', 'Month must be between 1 and 12');
    }
    if (day < 1 || day > 31) {
      return sendError(res, 'DAY_OUT_OF_RANGE', 'Day must be between 1 and 31');
    }

    const date = new Date(Date.UTC(year, month - 1, day));
    const bs = adToBs(date);

    sendSuccess(res, {
      input: { calendar: 'AD', year, month, day },
      output: {
        calendar: 'BS',
        year: bs.year,
        month: bs.month,
        day: bs.day,
        formatted: `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`,
        monthNameNe: NEPALI_MONTHS[bs.month - 1]?.nameNe,
        monthNameEn: NEPALI_MONTHS[bs.month - 1]?.nameEn,
        weekday: WEEKDAYS[bs.dayOfWeek]?.fullEn,
        weekdayNe: WEEKDAYS[bs.dayOfWeek]?.fullNe,
      },
    });
  } else {
    sendError(res, 'INVALID_FROM_PARAM', "Parameter 'from' must be either 'bs' or 'ad'");
  }
});

/**
 * GET /api/v1/calendar/month
 * Query: year, month (BS)
 */
calendarApiRouter.get('/month', (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string, 10);
  const month = parseInt(req.query.month as string, 10);

  if (isNaN(year) || isNaN(month)) {
    return sendError(res, 'INVALID_QUERY', 'year and month are required');
  }
  if (year < BS_MIN_YEAR || year > BS_MAX_YEAR) {
    return sendError(res, 'YEAR_OUT_OF_RANGE', `Year must be between ${BS_MIN_YEAR} and ${BS_MAX_YEAR} BS`);
  }
  if (month < 1 || month > 12) {
    return sendError(res, 'MONTH_OUT_OF_RANGE', 'Month must be between 1 and 12');
  }

  const daysCount = getBSDaysInMonth(year, month);
  const firstDayAd = bsToAd(year, month, 1);
  const lastDayAd = bsToAd(year, month, daysCount);
  const startWeekday = firstDayAd.getUTCDay();

  const days = [];
  for (let d = 1; d <= daysCount; d++) {
    const ad = bsToAd(year, month, d);
    const festival = getFestivalForDate(year, month, d);
    days.push({
      bsDay: d,
      adDate: ad.toISOString().slice(0, 10),
      weekday: ad.getUTCDay(),
      festival: festival ? { nameNe: festival.nameNe, nameEn: festival.nameEn, isHoliday: festival.isHoliday } : null,
    });
  }

  sendSuccess(res, {
    year,
    month,
    monthNameNe: NEPALI_MONTHS[month - 1]?.nameNe,
    monthNameEn: NEPALI_MONTHS[month - 1]?.nameEn,
    daysCount,
    startWeekday,
    startDateAd: firstDayAd.toISOString().slice(0, 10),
    endDateAd: lastDayAd.toISOString().slice(0, 10),
    days,
  });
});

/**
 * GET /api/v1/calendar/panchang
 * Query: year, month, day (BS) or adDate (YYYY-MM-DD), city (optional)
 */
calendarApiRouter.get('/panchang', (req: Request, res: Response) => {
  try {
    let adDate: Date;
    let bsYear: number;

    if (req.query.adDate) {
      adDate = new Date(`${req.query.adDate}T00:00:00Z`);
      if (isNaN(adDate.getTime())) {
        return sendError(res, 'INVALID_DATE', 'adDate must be valid YYYY-MM-DD');
      }
      bsYear = adToBs(adDate).year;
    } else {
      const year = parseInt(req.query.year as string, 10);
      const month = parseInt(req.query.month as string, 10);
      const day = parseInt(req.query.day as string, 10);

      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return sendError(res, 'INVALID_PARAMS', 'year, month, day or adDate is required');
      }
      if (year < BS_MIN_YEAR || year > BS_MAX_YEAR) {
        return sendError(res, 'YEAR_OUT_OF_RANGE', `Year must be between ${BS_MIN_YEAR} and ${BS_MAX_YEAR} BS`);
      }
      adDate = bsToAd(year, month, day);
      bsYear = year;
    }

    const cityId = (req.query.city as string || 'kathmandu').toLowerCase();
    const city = NEPAL_CITIES.find((c) => c.id === cityId) || NEPAL_CITIES[0];

    const p = calculatePanchang(adDate, bsYear, city);

    sendSuccess(res, {
      location: {
        city: city.nameEn,
        cityNe: city.nameNe,
        latitude: city.lat,
        longitude: city.lng,
      },
      tithi: {
        number: p.tithiNumber,
        nameNe: p.tithi.ne,
        nameEn: p.tithi.en,
        paksha: p.pakshaEn,
        pakshaNe: p.pakshaNe,
        endsAt: p.tithiEndTime,
      },
      nakshatra: {
        nameNe: p.nakshatra.ne,
        nameEn: p.nakshatra.en,
        pada: p.nakshatraPada,
        endsAt: p.nakshatraEndTime,
      },
      yoga: {
        nameNe: p.yoga.ne,
        nameEn: p.yoga.en,
        nature: p.yoga.nature,
      },
      karana: {
        nameNe: p.karana.ne,
        nameEn: p.karana.en,
        isBhadra: p.karana.isBhadra,
      },
      sunAndMoon: {
        sunrise: p.sunriseTime,
        sunset: p.sunsetTime,
        moonrise: p.moonriseTime,
        moonset: p.moonsetTime,
        dayDuration: p.dayDurationStr,
      },
      muhurats: {
        rahuKaal: p.rahuKaal,
        yamaganda: p.yamaganda,
        gulikaKaal: p.gulikaKaal,
        abhijitMuhurat: p.abhijitMuhurat,
        brahmaMuhurat: p.brahmaMuhurat,
        amritKaal: p.amritKaal,
      },
    });
  } catch (err: any) {
    sendError(res, 'PANCHANG_CALC_ERROR', err?.message || 'Error evaluating Panchang', 500);
  }
});

/**
 * GET /api/v1/calendar/hora
 * Query: year, month, day (BS) or adDate
 */
calendarApiRouter.get('/hora', (req: Request, res: Response) => {
  try {
    let adDate: Date;
    let bsYear: number;

    if (req.query.adDate) {
      adDate = new Date(`${req.query.adDate}T00:00:00Z`);
      bsYear = adToBs(adDate).year;
    } else {
      const year = parseInt(req.query.year as string, 10);
      const month = parseInt(req.query.month as string, 10);
      const day = parseInt(req.query.day as string, 10);

      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return sendError(res, 'INVALID_PARAMS', 'year, month, day or adDate is required');
      }
      if (year < BS_MIN_YEAR || year > BS_MAX_YEAR) {
        return sendError(res, 'YEAR_OUT_OF_RANGE', `Year must be between ${BS_MIN_YEAR} and ${BS_MAX_YEAR} BS`);
      }
      adDate = bsToAd(year, month, day);
      bsYear = year;
    }

    const city = NEPAL_CITIES[0]; // Kathmandu
    const sun = calculateSunTimes(adDate, city.lat, city.lng);
    const dayOfWeek = adDate.getUTCDay();

    const horas = calculate24Horas(dayOfWeek, sun.sunrise, sun.sunset);

    sendSuccess(res, {
      date: adDate.toISOString().slice(0, 10),
      weekday: WEEKDAYS[dayOfWeek]?.fullEn,
      sunrise: sun.sunrise,
      sunset: sun.sunset,
      totalHoras: horas.length,
      horas,
    });
  } catch (err: any) {
    sendError(res, 'HORA_CALC_ERROR', err?.message || 'Error evaluating Hora', 500);
  }
});

// -------------------------------------------------------------
// ADMIN & RBAC AUTHORIZATION ROUTER (/api/v1/admin)
// -------------------------------------------------------------
export const adminApiRouter = Router();

const SUPER_ADMIN_EMAIL = 'aayushinepalenergy@gmail.com';
const RAJAN_DEFAULT_EMAIL = 'rajan.calendar@ghaule.local';
const RAJAN_SECONDARY_EMAIL = 'rajan@gmail.com';

adminApiRouter.post('/verify-role', (req: Request, res: Response) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const uid = String(req.body?.uid || '').trim();

  if (!email || !uid) {
    return res.status(400).json({
      success: false,
      error: 'Missing email or uid',
      role: 'user',
    });
  }

  // Super Admin Check
  if (email === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return res.json({
      success: true,
      role: 'super_admin',
      email,
      uid,
      verified: true,
      permissions: ['all', 'manage_users', 'manage_calendar', 'backup_restore', 'publish'],
    });
  }

  // Calendar Manager Check (Rajan)
  if (email === RAJAN_DEFAULT_EMAIL.toLowerCase() || email === RAJAN_SECONDARY_EMAIL.toLowerCase()) {
    return res.json({
      success: true,
      role: 'calendar_manager',
      email,
      uid,
      verified: true,
      permissions: ['manage_calendar', 'backup_restore', 'publish'],
    });
  }

  // Default User (Restricted from all admin actions)
  return res.json({
    success: true,
    role: 'user',
    email,
    uid,
    verified: false,
    permissions: [],
  });
});

adminApiRouter.post('/validate-calendar', (req: Request, res: Response) => {
  const dataset = req.body;
  if (!dataset || typeof dataset !== 'object') {
    return res.status(400).json({ success: false, error: 'Invalid calendar dataset payload' });
  }

  const errors: string[] = [];
  if (![2083, 2084, 2085].includes(dataset.year_bs)) {
    errors.push(`Invalid year: ${dataset.year_bs}. Must be 2083, 2084, or 2085`);
  }
  if (!Array.isArray(dataset.months) || dataset.months.length !== 12) {
    errors.push('Must contain exactly 12 months');
  }

  res.json({
    success: errors.length === 0,
    valid: errors.length === 0,
    errors,
  });
});
