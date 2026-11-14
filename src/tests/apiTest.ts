/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Automated QA Test for Ghaule REST API System
 */

import app from '../../server';
import http from 'http';

console.log('====================================================');
console.log('GHAULE REST API (v1) SYSTEM AUTOMATED TEST');
console.log('====================================================\n');

let total = 0;
let passed = 0;
let failed = 0;

function assert(cond: boolean, name: string, err?: string) {
  total++;
  if (cond) {
    passed++;
    console.log(`[PASS] ${name}`);
  } else {
    failed++;
    console.error(`[FAIL] ${name} - ${err || 'Failed'}`);
  }
}

// Start temporary server on port 3099 for testing
const testServer = http.createServer(app);
testServer.listen(3099, async () => {
  try {
    const base = 'http://127.0.0.1:3099';

    // 1. Health check
    const rHealth = await fetch(`${base}/api/health`).then((r) => r.json());
    assert(rHealth.status === 'healthy', 'Health check returns healthy status');

    // 2. Today endpoint
    const rToday = await fetch(`${base}/api/v1/calendar/today`).then((r) => r.json());
    assert(rToday.success === true, '/today returns success true');
    assert(Boolean(rToday.data.bsDate.year), '/today contains valid BS year');
    assert(Boolean(rToday.data.quickPanchang.tithi), '/today contains quick Panchang tithi');

    // 3. Convert endpoint: BS 2084 Kartik 1
    const rConv1 = await fetch(
      `${base}/api/v1/calendar/convert?from=bs&year=2084&month=7&day=1`
    ).then((r) => r.json());
    assert(rConv1.success === true, '/convert BS 2084 Kartik 1 returns success');
    assert(rConv1.data.output.formatted === '2027-10-17', 'BS 2084 Kartik 1 converts to 2027-10-17');
    assert(rConv1.data.output.weekday === 'Sunday', 'BS 2084 Kartik 1 is Sunday');

    // 4. Convert endpoint: AD to BS
    const rConv2 = await fetch(
      `${base}/api/v1/calendar/convert?from=ad&year=2027&month=10&day=17`
    ).then((r) => r.json());
    assert(rConv2.data.output.formatted === '2084-07-01', 'AD 2027-10-17 converts back to BS 2084-07-01');

    // 5. Month endpoint
    const rMonth = await fetch(
      `${base}/api/v1/calendar/month?year=2084&month=7`
    ).then((r) => r.json());
    assert(rMonth.data.daysCount === 30, 'BS 2084 Kartik month endpoint returns exactly 30 days');
    assert(rMonth.data.startWeekday === 0, 'BS 2084 Kartik starts on Sunday (weekday 0)');

    // 6. Panchang endpoint
    const rPanchang = await fetch(
      `${base}/api/v1/calendar/panchang?year=2083&month=6&day=25`
    ).then((r) => r.json());
    assert(rPanchang.success === true, '/panchang returns success true');
    assert(rPanchang.data.tithi.number === 1, 'Ghatasthapana 2083 tithi is #1 (Pratipada)');
    assert(Boolean(rPanchang.data.sunAndMoon.sunrise), 'Panchang returns sunrise time');

    // 7. Hora endpoint
    const rHora = await fetch(
      `${base}/api/v1/calendar/hora?year=2084&month=7&day=1`
    ).then((r) => r.json());
    assert(rHora.success === true, '/hora returns success true');
    assert(rHora.data.totalHoras === 24, '/hora returns 24 planetary horas');
    assert(rHora.data.horas[0].lordId === 'sun', 'Sunday 1st hora is Sun');

    // 8. Error handling
    const rBad = await fetch(
      `${base}/api/v1/calendar/convert?from=bs&year=3500&month=1&day=1`
    ).then((r) => r.json());
    assert(rBad.success === false, 'Out-of-range year properly returns error response');
    assert(rBad.error.code === 'YEAR_OUT_OF_RANGE', 'Error code is YEAR_OUT_OF_RANGE');

    console.log('\n====================================================');
    console.log(`API TESTS TOTAL:  ${total}`);
    console.log(`API TESTS PASSED: ${passed}`);
    console.log(`API TESTS FAILED: ${failed}`);
    console.log('====================================================');

    testServer.close(() => {
      process.exit(failed > 0 ? 1 : 0);
    });
  } catch (e) {
    console.error('API Test Error:', e);
    testServer.close(() => process.exit(1));
  }
});
