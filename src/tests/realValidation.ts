import { bsToAd, adToBs } from '../utils/nepaliCalendarData';
import { NEPALI_MONTHS } from '../utils/nepaliCalendar';
import { BS_CALENDAR_DATA } from '../utils/nepaliCalendarData';
import { calculatePanchang, calculateSunTimes, NEPAL_CITIES } from '../utils/panchangEngine';
import * as fs from 'fs';

const asheshData = JSON.parse(fs.readFileSync('ashesh_2080_2100.json', 'utf8'));
const targetYears = [2083, 2084, 2085, 2086, 2087, 2088, 2089, 2090, 2095, 2100];

console.log("=== 1. MONTH START & END DATES + WEEKDAYS AUDIT ===");
let totalMonthsTested = 0;
let monthDiscrepancies = 0;
let totalDatesTested = 0;
let dateDiscrepancies = 0;

const sampleMonthResults: any[] = [];
const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

for (const year of targetYears) {
  const asheshMonths = asheshData[String(year)];
  const localMonths = BS_CALENDAR_DATA[year];
  
  for (let m = 0; m < 12; m++) {
    totalMonthsTested++;
    const asheshDays = asheshMonths[m];
    const localDays = localMonths[m];
    
    if (asheshDays !== localDays) {
      console.error(`Discrepancy in Year ${year} Month ${m+1}: Ashesh=${asheshDays}, Local=${localDays}`);
      monthDiscrepancies++;
    }
    
    // Check start date (day 1) and end date (day localDays)
    const startAd = bsToAd(year, m + 1, 1);
    const endAd = bsToAd(year, m + 1, localDays);
    
    const startWeekday = startAd.getUTCDay();
    const endWeekday = endAd.getUTCDay();
    
    if (m === 0 || m === 6 || m === 11) { // Sample Baishakh, Kartik, Chaitra
      sampleMonthResults.push({
        year,
        monthName: NEPALI_MONTHS[m].nameEn,
        days: localDays,
        startBS: `${year}-${String(m+1).padStart(2,'0')}-01`,
        startAD: `${startAd.getUTCFullYear()}-${String(startAd.getUTCMonth()+1).padStart(2,'0')}-${String(startAd.getUTCDate()).padStart(2,'0')} (${weekdayNames[startWeekday]})`,
        endBS: `${year}-${String(m+1).padStart(2,'0')}-${localDays}`,
        endAD: `${endAd.getUTCFullYear()}-${String(endAd.getUTCMonth()+1).padStart(2,'0')}-${String(endAd.getUTCDate()).padStart(2,'0')} (${weekdayNames[endWeekday]})`,
      });
    }

    // Check all dates in month
    for (let d = 1; d <= localDays; d++) {
      totalDatesTested++;
      const ad = bsToAd(year, m + 1, d);
      const bsBack = adToBs(ad);
      if (bsBack.year !== year || bsBack.month !== (m + 1) || bsBack.day !== d) {
        dateDiscrepancies++;
      }
    }
  }
}

console.log(`Months Tested: ${totalMonthsTested}, Month Discrepancies: ${monthDiscrepancies}`);
console.log(`Dates Tested: ${totalDatesTested}, Roundtrip Discrepancies: ${dateDiscrepancies}`);

console.log("\n=== 2. EKADASHI, PURNIMA, AMAVASYA IN 2083, 2084, 2090, 2100 ===");
for (const yr of [2083, 2084, 2090, 2100]) {
  console.log(`\n--- Key Tithis in BS ${yr} (Baishakh to Ashadh) ---`);
  for (let m = 1; m <= 3; m++) {
    const days = BS_CALENDAR_DATA[yr][m - 1];
    for (let d = 1; d <= days; d++) {
      const ad = bsToAd(yr, m, d);
      const p = calculatePanchang(ad, yr, NEPAL_CITIES[0]);
      if (p.isEkadashi || p.isPurnima || p.isAmavasya) {
        const adStr = `${ad.getUTCFullYear()}-${String(ad.getUTCMonth()+1).padStart(2,'0')}-${String(ad.getUTCDate()).padStart(2,'0')}`;
        console.log(`BS ${yr}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')} (AD ${adStr}): ${p.tithi.en} (${p.tithi.ne}) | Nakshatra: ${p.nakshatra.en} | Ends: ${p.tithiEndTime}`);
      }
    }
  }
}

console.log("\n=== 3. RAHU KAAL & ABHIJIT MUHURAT FOR ALL 7 WEEKDAYS (Kathmandu) ===");
for (let d = 1; d <= 7; d++) {
  const ad = bsToAd(2083, 1, d);
  const p = calculatePanchang(ad, 2083, NEPAL_CITIES[0]);
  const adStr = `${ad.getUTCFullYear()}-${String(ad.getUTCMonth()+1).padStart(2,'0')}-${String(ad.getUTCDate()).padStart(2,'0')}`;
  console.log(`${weekdayNames[ad.getUTCDay()]} (${adStr} / BS 2083-01-0${d}): Sunrise ${p.sunriseTime} | Sunset ${p.sunsetTime} | Abhijit: ${p.abhijitMuhurat.start} - ${p.abhijitMuhurat.end} (${p.abhijitMuhurat.isAuspicious ? 'Auspicious' : 'Inauspicious on Wed'}) | Rahu Kaal: ${p.rahuKaal.start} - ${p.rahuKaal.end} | Yamaganda: ${p.yamaganda.start} - ${p.yamaganda.end} | Gulika: ${p.gulikaKaal.start} - ${p.gulikaKaal.end}`);
}
