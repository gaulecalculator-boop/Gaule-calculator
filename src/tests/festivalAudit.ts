import { bsToAd } from '../utils/nepaliCalendarData';
import { calculatePanchang } from '../utils/panchangEngine';

const targetYears = [2083, 2084, 2085, 2086, 2087, 2088, 2089, 2090, 2095, 2100];

console.log('=== REAL ASTRONOMICAL COMPUTATION OF DASHAIN, TIHAR & CHHATH ===');

for (const y of targetYears) {
  let ghatasthapana: any = null;
  let vijayaDashami: any = null;
  let laxmiPuja: any = null;
  let bhaiTika: any = null;
  let chhath: any = null;

  // Search Ashwin (6) and Kartik (7)
  for (let m = 6; m <= 7; m++) {
    for (let d = 1; d <= 32; d++) {
      try {
        const ad = bsToAd(y, m, d);
        const p = calculatePanchang(ad, y);

        // Ghatasthapana: Ashwin Shukla Pratipada (tithi id 1)
        if (m === 6 && d >= 1 && p.tithi.id === 1 && !ghatasthapana) {
          ghatasthapana = { m, d, ad: ad.toISOString().split('T')[0], tithi: p.tithi.ne, end: p.tithiEndTime };
        }
        // Vijaya Dashami: Ashwin Shukla Dashami (tithi id 10)
        if ((m === 6 || m === 7) && p.tithi.id === 10 && ghatasthapana && !vijayaDashami) {
          vijayaDashami = { m, d, ad: ad.toISOString().split('T')[0], tithi: p.tithi.ne, end: p.tithiEndTime };
        }
        // Laxmi Puja: Kartik Krishna Amavasya (tithi id 30)
        if ((m === 6 || m === 7) && p.tithi.id === 30 && vijayaDashami && !laxmiPuja) {
          laxmiPuja = { m, d, ad: ad.toISOString().split('T')[0], tithi: p.tithi.ne, end: p.tithiEndTime };
        }
        // Bhai Tika: Kartik Shukla Dwitiya (tithi id 2)
        if (m === 7 && p.tithi.id === 2 && laxmiPuja && !bhaiTika) {
          bhaiTika = { m, d, ad: ad.toISOString().split('T')[0], tithi: p.tithi.ne, end: p.tithiEndTime };
        }
        // Chhath: Kartik Shukla Shashthi (tithi id 6)
        if (m === 7 && p.tithi.id === 6 && bhaiTika && !chhath) {
          chhath = { m, d, ad: ad.toISOString().split('T')[0], tithi: p.tithi.ne, end: p.tithiEndTime };
        }
      } catch (e) {}
    }
  }

  console.log(`Year ${y}:`);
  console.log(`  - घटस्थापना (Ghatasthapana): ${ghatasthapana ? `${ghatasthapana.m} महिना ${ghatasthapana.d} गते (AD ${ghatasthapana.ad}) [${ghatasthapana.end} सम्म]` : 'N/A'}`);
  console.log(`  - विजया दशमी (Dashami):     ${vijayaDashami ? `${vijayaDashami.m} महिना ${vijayaDashami.d} गते (AD ${vijayaDashami.ad}) [${vijayaDashami.end} सम्म]` : 'N/A'}`);
  console.log(`  - लक्ष्मीपूजा (Laxmi Puja): ${laxmiPuja ? `${laxmiPuja.m} महिना ${laxmiPuja.d} गते (AD ${laxmiPuja.ad}) [${laxmiPuja.end} सम्म]` : 'N/A'}`);
  console.log(`  - भाइटीका (Bhai Tika):       ${bhaiTika ? `${bhaiTika.m} महिना ${bhaiTika.d} गते (AD ${bhaiTika.ad}) [${bhaiTika.end} सम्म]` : 'N/A'}`);
  console.log(`  - छठ पर्व (Chhath Parva):   ${chhath ? `${chhath.m} महिना ${chhath.d} गते (AD ${chhath.ad}) [${chhath.end} सम्म]` : 'N/A'}`);
}
