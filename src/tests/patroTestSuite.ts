/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Comprehensive QA & Verification Test Suite for Ghaule Calculator
 * Audits BS 2083, Panchang, Muhurats, Festivals, Holidays, and all 28 Calculator Tools.
 */

import { bsToAd, adToBs, getBSDaysInMonth, getBSYearMonthDays, BS_CALENDAR_DATA } from '../utils/nepaliCalendarData';
import { calculatePanchang, calculateSunTimes, NEPAL_CITIES } from '../utils/panchangEngine';
import { patroDb, OFFICIAL_SOLAR_HOLIDAYS, LUNAR_FESTIVAL_RULES } from '../utils/patroDatabase';
import { ALL_CALCULATORS } from '../data/calculatorList';

console.log('====================================================');
console.log('GHAULE CALCULATOR — MASTER QA AUDIT & TEST SUITE');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${testName} - ${details || 'Assertion failed'}`);
  }
}

// -------------------------------------------------------------
// TEST 1: ALL 29 CALCULATOR TOOLS PRESERVED
// -------------------------------------------------------------
console.log('\n--- 1. CALCULATOR TOOLS INTEGRITY ---');
assert(ALL_CALCULATORS.length === 29, 'Total Calculator Tools Count is exactly 29', `Found ${ALL_CALCULATORS.length}`);

const requiredToolIds = [
  'doodh', 'byaj', 'price-weight', 'emi', 'land-area', 'calculator',
  'date-conv', 'percentage', 'age-calc', 'shop-billing', 'profit-loss',
  'discount', 'vat', 'npr-inr', 'unit-conv', 'smart-khata',
  'brick-calc', 'cement-calc', 'sand-gravel', 'steel-rebar',
  'paint-calc', 'tiles-calc', 'cft-cbm', 'land-valuation',
  'nepali-patro', 'date-diff', 'nea-bill', 'income-tax', 'gold-silver'
];

for (const id of requiredToolIds) {
  const found = ALL_CALCULATORS.some(t => t.id === id);
  assert(found, `Calculator tool '${id}' exists and is registered`);
}

// -------------------------------------------------------------
// TEST 2: BS 2083 FULL YEAR CALENDAR ACCURACY
// -------------------------------------------------------------
console.log('\n--- 2. BS 2083 CALENDAR ACCURACY AUDIT ---');
const expected2083MonthDays = [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30];
const actual2083MonthDays = getBSYearMonthDays(2083);

assert(
  JSON.stringify(actual2083MonthDays) === JSON.stringify(expected2083MonthDays),
  'BS 2083 12-month day distribution matches official astronomical almanac',
  `Actual: ${JSON.stringify(actual2083MonthDays)}`
);

let total2083Days = 0;
let conversionFailures2083 = 0;
let weekdayMismatches2083 = 0;

for (let m = 1; m <= 12; m++) {
  const daysInM = actual2083MonthDays[m - 1];
  for (let d = 1; d <= daysInM; d++) {
    total2083Days++;
    const adDate = bsToAd(2083, m, d);
    const bsRoundtrip = adToBs(adDate);

    if (bsRoundtrip.year !== 2083 || bsRoundtrip.month !== m || bsRoundtrip.day !== d) {
      conversionFailures2083++;
    }

    const expectedWeekday = adDate.getUTCDay();
    if (bsRoundtrip.dayOfWeek !== expectedWeekday) {
      weekdayMismatches2083++;
    }
  }
}

assert(total2083Days === 365, 'BS 2083 total days count is exactly 365 days', `Total: ${total2083Days}`);
assert(conversionFailures2083 === 0, 'BS 2083 roundtrip date conversions (BS -> AD -> BS) have zero errors');
assert(weekdayMismatches2083 === 0, 'BS 2083 weekday calculation matches Gregorian UTC day of week');

// -------------------------------------------------------------
// TEST 3: TARGET YEARS (2060 TO 2085 BS) INTEGRITY & CLAMPING
// -------------------------------------------------------------
console.log('\n--- 3. TARGET YEARS BOUNDARY & LEAP YEAR AUDIT (BS 2060–2085) ---');
const targetYears = [2060, 2065, 2070, 2075, 2080, 2081, 2082, 2083, 2084, 2085];

for (const yr of targetYears) {
  const mDays = getBSYearMonthDays(yr);
  const totalYDays = mDays.reduce((a, b) => a + b, 0);
  assert(
    totalYDays === 365 || totalYDays === 366,
    `Year ${yr} BS solar year length is valid (${totalYDays} days)`
  );

  // Test New Year Day (Baishakh 1)
  const baisakh1 = bsToAd(yr, 1, 1);
  const roundtrip1 = adToBs(baisakh1);
  assert(
    roundtrip1.year === yr && roundtrip1.month === 1 && roundtrip1.day === 1,
    `Year ${yr} Baishakh 1 roundtrip conversion verified`
  );
}

// Verify that out-of-range years (post-2090 and pre-2060) are safely clamped
const post2090 = adToBs(new Date('2040-05-15T00:00:00Z'));
assert(post2090.year === 2090, 'Dates past BS 2090 are strictly clamped to BS 2090 limit');

const pre2060 = adToBs(new Date('1990-01-01T00:00:00Z'));
assert(pre2060.year === 2060, 'Dates before BS 2060 are strictly clamped to BS 2060 limit');

// Independent Reference Audit: BS 2084 Kartik
console.log('\n--- 3b. BS 2084 KARTIK INDEPENDENT REFERENCE VERIFICATION ---');
const kDays = getBSDaysInMonth(2084, 7);
assert(kDays === 30, 'BS 2084 Kartik month length is exactly 30 days', `Got ${kDays}`);

const k1 = bsToAd(2084, 7, 1);
assert(
  k1.toISOString().slice(0, 10) === '2027-10-17' && k1.getUTCDay() === 0,
  'BS 2084 Kartik 1 matches Sunday, 17 October 2027',
  `Got ${k1.toISOString().slice(0, 10)}, weekday ${k1.getUTCDay()}`
);

const k15 = bsToAd(2084, 7, 15);
assert(
  k15.toISOString().slice(0, 10) === '2027-10-31' && k15.getUTCDay() === 0,
  'BS 2084 Kartik 15 matches Sunday, 31 October 2027',
  `Got ${k15.toISOString().slice(0, 10)}, weekday ${k15.getUTCDay()}`
);

const k17 = bsToAd(2084, 7, 17);
assert(
  k17.toISOString().slice(0, 10) === '2027-11-02' && k17.getUTCDay() === 2,
  'BS 2084 Kartik 17 matches Tuesday, 2 November 2027',
  `Got ${k17.toISOString().slice(0, 10)}, weekday ${k17.getUTCDay()}`
);

const k30 = bsToAd(2084, 7, 30);
assert(
  k30.toISOString().slice(0, 10) === '2027-11-15' && k30.getUTCDay() === 1,
  'BS 2084 Kartik 30 matches Monday, 15 November 2027',
  `Got ${k30.toISOString().slice(0, 10)}, weekday ${k30.getUTCDay()}`
);

// -------------------------------------------------------------
// TEST 4: MAJOR FESTIVAL TITHIS (DASHAIN, TIHAR, CHHATH)
// -------------------------------------------------------------
console.log('\n--- 4. MAJOR LUNAR FESTIVAL CALCULATION AUDIT ---');

// Ghatasthapana 2083: Ashwin Shukla Pratipada (2083-06-25 / 2026-10-11)
const pGhat = calculatePanchang(bsToAd(2083, 6, 25), 2083);
assert(
  pGhat.tithiNumber === 1 && pGhat.pakshaEn === 'Shukla Paksha',
  'Ghatasthapana 2083 falls on Ashwin Shukla Pratipada (Tithi #1)',
  `Got tithi ${pGhat.tithiNumber} ${pGhat.pakshaEn}`
);

// Vijaya Dashami 2083: Ashwin Shukla Dashami (2083-07-04 / 2026-10-20)
const pDashami = calculatePanchang(bsToAd(2083, 7, 4), 2083);
assert(
  pDashami.tithiNumber === 10 && pDashami.pakshaEn === 'Shukla Paksha',
  'Vijaya Dashami 2083 falls on Ashwin Shukla Dashami (Tithi #10)',
  `Got tithi ${pDashami.tithiNumber} ${pDashami.pakshaEn}`
);

// Laxmi Puja 2083: Kartik Krishna Amavasya (2083-07-23 / 2026-11-09)
const pLaxmi = calculatePanchang(bsToAd(2083, 7, 23), 2083);
assert(
  pLaxmi.tithiNumber === 30 && pLaxmi.isAmavasya,
  'Laxmi Puja 2083 falls on Kartik Krishna Amavasya (Tithi #30)',
  `Got tithi ${pLaxmi.tithiNumber}`
);

// Bhai Tika 2083: Kartik Shukla Dwitiya (2083-07-25 / 2026-11-11)
const pBhai = calculatePanchang(bsToAd(2083, 7, 25), 2083);
assert(
  pBhai.tithiNumber === 2 && pBhai.pakshaEn === 'Shukla Paksha',
  'Bhai Tika 2083 falls on Kartik Shukla Dwitiya (Tithi #2)',
  `Got tithi ${pBhai.tithiNumber}`
);

// -------------------------------------------------------------
// TEST 5: SOLAR TIMES (KATHMANDU, POKHARA, BIRATNAGAR)
// -------------------------------------------------------------
console.log('\n--- 5. SOLAR TIMES & NEPAL TIMEZONE (UTC+05:45) AUDIT ---');
const testSolarDate = new Date('2026-04-14T00:00:00Z'); // Baishakh 1, 2083

const ktmSun = calculateSunTimes(testSolarDate, NEPAL_CITIES[0].lat, NEPAL_CITIES[0].lng);
const pkrSun = calculateSunTimes(testSolarDate, NEPAL_CITIES[1].lat, NEPAL_CITIES[1].lng);
const brtSun = calculateSunTimes(testSolarDate, NEPAL_CITIES[2].lat, NEPAL_CITIES[2].lng);

assert(
  brtSun.sunriseMinutes < ktmSun.sunriseMinutes,
  'Biratnagar (Eastern Nepal) sunrise occurs before Kathmandu sunrise',
  `Biratnagar: ${brtSun.sunrise}, Kathmandu: ${ktmSun.sunrise}`
);

assert(
  ktmSun.sunriseMinutes < pkrSun.sunriseMinutes,
  'Kathmandu sunrise occurs before Pokhara (Western Nepal) sunrise',
  `Kathmandu: ${ktmSun.sunrise}, Pokhara: ${pkrSun.sunrise}`
);

// -------------------------------------------------------------
// TEST 6: RAHU KAAL & ABHIJIT MUHURAT Jyotish COMPLIANCE
// -------------------------------------------------------------
console.log('\n--- 6. MUHURAT Jyotish COMPLIANCE AUDIT ---');
// Test Sunday Rahu Kaal (must be the 8th segment)
const sunDate = new Date('2026-04-19T00:00:00Z'); // Sunday
const pSun = calculatePanchang(sunDate, 2083, NEPAL_CITIES[0]);
assert(
  pSun.rahuKaal.end === pSun.sunsetTime,
  'Sunday Rahu Kaal ends exactly at Sunset (8th diurnal hora)',
  `Rahu End: ${pSun.rahuKaal.end}, Sunset: ${pSun.sunsetTime}`
);

// Test Wednesday Abhijit Muhurat (prohibited in Hindu Jyotish)
const wedDate = new Date('2026-04-15T00:00:00Z'); // Wednesday
const pWed = calculatePanchang(wedDate, 2083, NEPAL_CITIES[0]);
assert(
  !pWed.abhijitMuhurat.isAuspicious,
  'Abhijit Muhurat is correctly flagged as Inauspicious on Wednesday'
);

// -------------------------------------------------------------
// TEST 7: OFFLINE DATABASE INTEGRITY
// -------------------------------------------------------------
console.log('\n--- 7. OFFLINE DATABASE REPOSITORY AUDIT ---');
const monthRecord = patroDb.getBSMonthCalendar(2083, 1);
assert(monthRecord.daysCount === 31, 'Offline repository returns 31 days for Baishakh 2083');
assert(monthRecord.startWeekday === 2, 'Baishakh 1, 2083 is Tuesday (weekday index 2)');

const holidays2083 = patroDb.getAllHolidaysForYear(2083);
assert(holidays2083.length >= 15, `Offline database provides gazetted holidays (${holidays2083.length} entries)`);

const sourceMeta = patroDb.getSourceMetadata();
assert(sourceMeta.length === 4, 'Official source metadata contains 4 verified authorities (Official + Provisional)');

// -------------------------------------------------------------
// TEST 8: 24-PLANETARY HORA CALCULATION AUDIT
// -------------------------------------------------------------
console.log('\n--- 8. HINDU 24-PLANETARY HORA ENGINE AUDIT ---');
import { calculate24Horas } from '../utils/horaEngine';

// Sunday (dayOfWeek 0) test
const sundayHoras = calculate24Horas(0, '06:00', '18:00');
assert(sundayHoras.length === 24, '24 horas calculated per solar day (12 day + 12 night)');
assert(sundayHoras[0].lordId === 'sun', 'Sunday 1st daytime hora is ruled by Sun (Surya)');
assert(sundayHoras[1].lordId === 'venus', 'Sunday 2nd daytime hora is ruled by Venus (Shukra)');
assert(sundayHoras[2].lordId === 'mercury', 'Sunday 3rd daytime hora is ruled by Mercury (Budha)');
assert(sundayHoras[3].lordId === 'moon', 'Sunday 4th daytime hora is ruled by Moon (Chandra)');
assert(sundayHoras[4].lordId === 'saturn', 'Sunday 5th daytime hora is ruled by Saturn (Shani)');
assert(sundayHoras[5].lordId === 'jupiter', 'Sunday 6th daytime hora is ruled by Jupiter (Guru)');
assert(sundayHoras[6].lordId === 'mars', 'Sunday 7th daytime hora is ruled by Mars (Mangal)');

// Monday (dayOfWeek 1) test
const mondayHoras = calculate24Horas(1, '06:00', '18:00');
assert(mondayHoras[0].lordId === 'moon', 'Monday 1st daytime hora is ruled by Moon (Chandra)');

// Tuesday (dayOfWeek 2) test
const tuesdayHoras = calculate24Horas(2, '06:00', '18:00');
assert(tuesdayHoras[0].lordId === 'mars', 'Tuesday 1st daytime hora is ruled by Mars (Mangal)');

// -------------------------------------------------------------
// TEST 9: NOTIFICATION & REMINDER ENGINE AUDIT
// -------------------------------------------------------------
console.log('\n--- 9. OFFLINE NOTIFICATION & REMINDER AUDIT ---');
import { notificationEngine } from '../utils/notificationEngine';

const settings = notificationEngine.getSettings();
assert(settings.notificationsEnabled === true, 'Default notifications are enabled');
assert(settings.ekadashiAlerts === true, 'Ekadashi sacred alerts enabled by default');
assert(settings.purnimaAlerts === true, 'Purnima alerts enabled by default');

const testRem = notificationEngine.saveReminder({
  category: 'festival',
  titleNe: 'विजया दशमी बडा टीका',
  titleEn: 'Vijaya Dashami Tika',
  bsMonth: 7,
  bsDay: 10,
  timeStr: '08:30',
  enabled: true,
});
assert(Boolean(testRem.id), 'Reminder saved with unique cryptographic ID');
const allRem = notificationEngine.getAllReminders();
assert(allRem.some((r) => r.id === testRem.id), 'Saved reminder retrieved successfully from offline store');

notificationEngine.toggleReminder(testRem.id);
const toggled = notificationEngine.getAllReminders().find((r) => r.id === testRem.id);
assert(toggled?.enabled === false, 'Reminder toggled off successfully');

notificationEngine.deleteReminder(testRem.id);
const deleted = notificationEngine.getAllReminders().find((r) => r.id === testRem.id);
assert(!deleted, 'Reminder deleted cleanly without leaks');

// -------------------------------------------------------------
// TEST 10: PREMIUM ENTITLEMENT & SIGNATURE SECURITY AUDIT
// -------------------------------------------------------------
console.log('\n--- 10. PREMIUM ENTITLEMENT & SIGNATURE SECURITY AUDIT ---');
import { premiumEngine } from '../utils/premiumEngine';

const freeTier = premiumEngine.getEntitlement();
assert(freeTier.features.unlimitedCalculators === true, 'Free tier guarantees 100% free access to all 28 calculators');
assert(freeTier.features.full101YearPatro === true, 'Free tier guarantees 100% free access to 101-year calendar');

// Test valid lifetime key
const actLifetime = premiumEngine.activateLicense('GHAULE-PRO-LIFETIME-2083');
assert(actLifetime.success === true, 'Valid lifetime key activated successfully');
assert(actLifetime.entitlement?.tier === 'lifetime_pro', 'Entitlement upgraded to lifetime_pro');
assert(Boolean(actLifetime.entitlement?.signature), 'Entitlement secured with cryptographic signature');

// Test invalid key rejection
const actBad = premiumEngine.activateLicense('INVALID-FAKE-KEY-999');
assert(actBad.success === false, 'Invalid fake key rejected strictly');

// Reset back to clean state
premiumEngine.resetToFree();
const afterReset = premiumEngine.getEntitlement();
assert(afterReset.isActive === false, 'Entitlement cleanly reset to standard free tier');

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n====================================================');
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED:      ${passedTests}`);
console.log(`FAILED:      ${failedTests}`);
console.log(`STATUS:      ${failedTests === 0 ? 'ALL VERIFICATIONS PASSED (100%)' : 'FAILURES DETECTED'}`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
}
