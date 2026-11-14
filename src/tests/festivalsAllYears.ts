import { bsToAd } from '../utils/nepaliCalendarData';
import { BS_CALENDAR_DATA } from '../utils/nepaliCalendarData';
import { calculatePanchang, NEPAL_CITIES } from '../utils/panchangEngine';

const targetYears = [2083, 2084, 2085, 2086, 2087, 2088, 2089, 2090, 2095, 2100];
const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

console.log("=== DASHAIN, TIHAR & CHHATH IN TARGET BS YEARS ===");

for (const yr of targetYears) {
  // Check Ashwin (month 6) and Kartik (month 7)
  let ghatasthapana = null;
  let phulpati = null;
  let mahaAshtami = null;
  let mahaNavami = null;
  let vijayaDashami = null;
  let kagTihar = null;
  let kukurTihar = null;
  let laxmiPuja = null;
  let govardhanPuja = null;
  let bhaiTika = null;
  let chhathPuja = null;

  for (let m of [6, 7]) {
    const days = BS_CALENDAR_DATA[yr][m - 1];
    for (let d = 1; d <= days; d++) {
      const ad = bsToAd(yr, m, d);
      const p = calculatePanchang(ad, yr, NEPAL_CITIES[0]);
      const dateStr = `BS ${yr}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')} (${weekdayNames[ad.getUTCDay()]}, AD ${ad.getUTCFullYear()}-${String(ad.getUTCMonth()+1).padStart(2,'0')}-${String(ad.getUTCDate()).padStart(2,'0')})`;

      // Dashain: Ashwin Shukla Pratipada to Dashami
      if (m === 6 || (m === 7 && d <= 15)) {
        if (p.tithiNumber === 1 && !ghatasthapana) ghatasthapana = { dateStr, tithi: p.tithi.ne, endTime: p.tithiEndTime };
        if (p.tithiNumber === 7 && !phulpati) phulpati = { dateStr, tithi: p.tithi.ne, endTime: p.tithiEndTime };
        if (p.tithiNumber === 8 && !mahaAshtami) mahaAshtami = { dateStr, tithi: p.tithi.ne, endTime: p.tithiEndTime };
        if (p.tithiNumber === 9 && !mahaNavami) mahaNavami = { dateStr, tithi: p.tithi.ne, endTime: p.tithiEndTime };
        if (p.tithiNumber === 10 && !vijayaDashami) vijayaDashami = { dateStr, tithi: p.tithi.ne, endTime: p.tithiEndTime };
      }

      // Tihar: Kartik Krishna Trayodashi to Shukla Dwitiya
      if (m === 7) {
        if (p.tithiNumber === 28 && !kagTihar) kagTihar = { dateStr, tithi: p.tithi.ne, endTime: p.tithiEndTime };
        if (p.tithiNumber === 29 && !kukurTihar) kukurTihar = { dateStr, tithi: p.tithi.ne, endTime: p.tithiEndTime };
        if (p.tithiNumber === 30 && !laxmiPuja) laxmiPuja = { dateStr, tithi: p.tithi.ne, endTime: p.tithiEndTime };
        if (p.tithiNumber === 1 && !govardhanPuja && d > 10) govardhanPuja = { dateStr, tithi: p.tithi.ne, endTime: p.tithiEndTime };
        if (p.tithiNumber === 2 && !bhaiTika && d > 10) bhaiTika = { dateStr, tithi: p.tithi.ne, endTime: p.tithiEndTime };
        // Chhath: Kartik Shukla Shashthi
        if (p.tithiNumber === 6 && !chhathPuja && d > 15) chhathPuja = { dateStr, tithi: p.tithi.ne, endTime: p.tithiEndTime };
      }
    }
  }

  console.log(`\n--- BS ${yr} ---`);
  console.log(`  Ghatasthapana: ${ghatasthapana?.dateStr || 'N/A'} (Tithi ends: ${ghatasthapana?.endTime})`);
  console.log(`  Vijaya Dashami: ${vijayaDashami?.dateStr || 'N/A'} (Tithi ends: ${vijayaDashami?.endTime})`);
  console.log(`  Laxmi Puja:    ${laxmiPuja?.dateStr || 'N/A'} (Tithi ends: ${laxmiPuja?.endTime})`);
  console.log(`  Bhai Tika:     ${bhaiTika?.dateStr || 'N/A'} (Tithi ends: ${bhaiTika?.endTime})`);
  console.log(`  Chhath Puja:   ${chhathPuja?.dateStr || 'N/A'} (Tithi ends: ${chhathPuja?.endTime})`);
}
