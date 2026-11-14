/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GAULE CALCULATOR — Android APK Production Upgrade Automated Test Suite
 * Verifies:
 * 1. User-isolated Byaj Ledger storage & multi-account switching isolation
 * 2. Dairy Branding user isolation & timestamp-safe cloud hydration
 * 3. Unlimited Milk batch splitting & pagination (zero .slice truncation)
 * 4. ESC/POS 58mm (32-col) and 80mm (48-col) command encoding & Devanagari ASCII normalization
 * 5. Android Bridge calls (WhatsApp/external intents, Base64 MediaStore downloads, PrintManager, Bluetooth ESC/POS)
 * 6. Native Android /android/ project structure, Manifest, ProGuard, Kotlin classes & zero fake prod credentials
 */

import fs from 'node:fs';
import path from 'node:path';

// Minimal DOM/Storage mock for Node test execution
const memStorage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => (k in memStorage ? memStorage[k] : null),
  setItem: (k: string, v: string) => {
    memStorage[k] = String(v);
  },
  removeItem: (k: string) => {
    delete memStorage[k];
  },
  clear: () => {
    Object.keys(memStorage).forEach((k) => delete memStorage[k]);
  },
  key: (i: number) => Object.keys(memStorage)[i] ?? null,
  get length() {
    return Object.keys(memStorage).length;
  },
};

const dispatchedEvents: string[] = [];
(globalThis as any).window = {
  location: { origin: 'https://appassets.androidplatform.net', hostname: 'appassets.androidplatform.net' },
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: (ev: any) => {
    dispatchedEvents.push(ev?.type || 'unknown');
    return true;
  },
};
(globalThis as any).CustomEvent = class MockCustomEvent {
  type: string;
  detail: any;
  constructor(type: string, init?: { detail?: any }) {
    this.type = type;
    this.detail = init?.detail;
  }
};

import { dairyBranding, DEFAULT_DAIRY_PROFILE } from '../utils/dairyBranding';
import { splitIntoBatches, MILK_SHARD_PAGE_SIZE, FIRESTORE_SAFE_BATCH_OPS } from '../utils/milkManagementStorage';
import { buildUniversalReceiptEscPos, buildMilkBillEscPos } from '../utils/thermalEscPosBuilder';
import {
  isAndroidNativeApp,
  openExternalUrl,
  downloadTextFile,
  downloadDataUrlFile,
  saveJsPdfDocument,
  printHtmlDocument,
  getPairedBluetoothPrinters,
  sendEscPosToBluetoothPrinter,
} from '../utils/androidBridge';
import { getStoredByajLedger, saveByajLedgerEntry } from '../utils/storage';

let passed = 0;
let failed = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function runSuite() {
  console.log('\n=== GAULE CALCULATOR: ANDROID APK UPGRADE TEST SUITE ===\n');

  // ------------------------------------------------------------------
  // 1. Multi-Account Byaj Ledger Isolation
  // ------------------------------------------------------------------
  localStorage.clear();
  localStorage.setItem('ghaule_active_account', JSON.stringify({ uid: 'uid_alice', email: 'alice@example.com', isGuest: false }));
  saveByajLedgerEntry({
    borrowerName: 'Ram Bahadur',
    principal: 50000,
    monthlyRate: 2,
    startDate: '2026-01-01',
    note: '2082-09-17 BS',
    payments: [],
    isSettled: false,
  });
  const aliceByaj = getStoredByajLedger();
  assert('1.1 Byaj entry stored under Account A prefix', aliceByaj.length === 1 && localStorage.getItem('ghaule_u_uid_alice_byaj_ledger') !== null);

  localStorage.setItem('ghaule_active_account', JSON.stringify({ uid: 'uid_bob', email: 'bob@example.com', isGuest: false }));
  const bobByaj = getStoredByajLedger();
  assert('1.2 Account B has isolated empty Byaj ledger (no leakage)', bobByaj.length === 0);

  // ------------------------------------------------------------------
  // 2. Dairy Branding User Isolation & Timestamp Cloud Hydration
  // ------------------------------------------------------------------
  localStorage.setItem('ghaule_active_account', JSON.stringify({ uid: 'uid_dairy_1', isGuest: false }));
  dairyBranding.saveProfile({
    ...DEFAULT_DAIRY_PROFILE,
    dairyName: 'Shree Ganesh Dairy',
    proprietorName: 'Hari Prasad',
    mobile: '9841000001',
    address: 'Pokhara',
  });
  assert(
    '2.1 Dairy branding stored in user-scoped key',
    JSON.parse(localStorage.getItem('ghaule_u_uid_dairy_1_dairy_branding_profile_v1') || '{}').dairyName === 'Shree Ganesh Dairy'
  );

  // Older remote should NOT overwrite newer local
  const newerLocalUpdatedAt = JSON.parse(localStorage.getItem('ghaule_u_uid_dairy_1_dairy_branding_profile_v1') || '{}').updatedAt;
  const rejectedOlder = dairyBranding.applyCloudBranding(
    { ...DEFAULT_DAIRY_PROFILE, dairyName: 'Old Cloud Dairy', updatedAt: newerLocalUpdatedAt - 50000 },
    'uid_dairy_1'
  );
  assert('2.2 Older cloud branding ignored when local is newer', rejectedOlder === false);

  // Newer remote SHOULD hydrate local
  const appliedNewer = dairyBranding.applyCloudBranding(
    { ...DEFAULT_DAIRY_PROFILE, dairyName: 'Synced Cloud Dairy', updatedAt: newerLocalUpdatedAt + 50000 },
    'uid_dairy_1'
  );
  assert(
    '2.3 Newer cloud branding hydrates scoped storage & emits event',
    appliedNewer === true &&
      dairyBranding.getProfile().dairyName === 'Synced Cloud Dairy' &&
      dispatchedEvents.includes('ghaule_branding_changed')
  );

  // ------------------------------------------------------------------
  // 3. Unlimited Milk Batching & Pagination Sharding
  // ------------------------------------------------------------------
  const daily1250 = Array.from({ length: 1250 }, (_, i) => ({ id: `mrec_${i}` }));
  const shards = splitIntoBatches(daily1250, MILK_SHARD_PAGE_SIZE);
  const totalReassembled = shards.reduce((acc, s) => acc + s.length, 0);
  assert(
    '3.1 Unlimited milk pagination splits 1,250 records cleanly without truncation',
    shards.length === 4 && shards[0].length === 400 && shards[3].length === 50 && totalReassembled === 1250,
    `shards=${shards.map((s) => s.length).join(',')}`
  );
  assert('3.2 Firestore writeBatch chunk size stays safely below 500 limit', FIRESTORE_SAFE_BATCH_OPS === 400);

  // ------------------------------------------------------------------
  // 4. ESC/POS 58mm & 80mm Command Generation
  // ------------------------------------------------------------------
  const sampleBill: any = {
    id: 'BILL-1',
    billNumber: 'GH-83-1001',
    moduleType: 'milk',
    moduleTitle: 'Milk Bill',
    customerName: 'Sita Devi',
    customerMobile: '9800000001',
    dateAD: '2026-04-14',
    dateBS: '२०८३-०१-०१',
    createdAt: Date.now(),
    items: [{ id: '1', description: 'गाईको दुध', quantity: 5, unit: 'L', rate: 80, subtotal: 400 }],
    subtotal: 400,
    discount: 0,
    totalAmount: 400,
    paidAmount: 200,
    remainingDue: 200,
    paymentStatus: 'PARTIAL',
    paymentMethod: 'cash',
    branding: { ...DEFAULT_DAIRY_PROFILE, dairyName: 'Gaule Dairy', mobile: '९८४१२३४५६७', address: 'Kathmandu' },
  };
  const esc58 = buildUniversalReceiptEscPos(sampleBill, sampleBill.branding, '58mm');
  const esc80 = buildUniversalReceiptEscPos(sampleBill, sampleBill.branding, '80mm');
  const text58 = Buffer.from(esc58).toString('latin1');
  const text80 = Buffer.from(esc80).toString('latin1');

  assert(
    '4.1 58mm ESC/POS starts with ESC @ (0x1B 0x40) and ends with GS V B 0 cut command',
    esc58[0] === 0x1b &&
      esc58[1] === 0x40 &&
      esc58[esc58.length - 4] === 0x1d &&
      esc58[esc58.length - 3] === 0x56 &&
      esc58[esc58.length - 2] === 0x42 &&
      esc58[esc58.length - 1] === 0x00
  );
  assert(
    '4.2 ESC/POS normalizes Devanagari digits (२०८३ -> 2083, ९८४१२३४५६७ -> 9841234567)',
    text58.includes('2083-01-01') && text58.includes('9841234567')
  );
  assert(
    '4.3 58mm uses 32-char divider and 80mm uses 48-char divider',
    text58.includes('-'.repeat(32)) && !text58.includes('-'.repeat(48)) && text80.includes('-'.repeat(48))
  );

  const milkEsc = buildMilkBillEscPos(
    {
      billNumber: 'GD-101',
      billTitle: 'Milk Bill',
      customer: { id: 'c1', name: 'Harihar', mobile: '9801112223' } as any,
      generatedDate: { adDisplay: '2026-04-14' } as any,
      startDate: { bsDisplayShort: '2083-01-01', adDisplay: '2026-04-14' } as any,
      endDate: { bsDisplayShort: '2083-01-30', adDisplay: '2026-05-13' } as any,
      totalCalendarDays: 30,
      totalMilkSupplyDays: 29,
      totalLossDays: 1,
      totalMilk: { labelEn: '45.0 Ltr (45 L 0 ml)' } as any,
      primaryRatePerLtr: 85,
      totalMilkAmount: 3825,
      previousOutstandingBalance: 500,
      totalAmountPaid: 2000,
      finalRemainingDue: 2325,
      advanceCreditRemaining: 0,
    } as any,
    sampleBill.branding,
    '80mm'
  );
  assert('4.4 buildMilkBillEscPos generates valid initialized ESC/POS buffer', milkEsc[0] === 0x1b && milkEsc[1] === 0x40);

  // ------------------------------------------------------------------
  // 5. Android Bridge Native Detection & Calls
  // ------------------------------------------------------------------
  const openedUrls: string[] = [];
  const savedFiles: Array<{ filename: string; mime: string; size: number }> = [];
  const printedJobs: string[] = [];
  let escPrintedAddr = '';

  (globalThis as any).window.AndroidApp = {
    openExternalUrl: (url: string) => {
      openedUrls.push(url);
      return true;
    },
    saveFileBase64: (b64: string, filename: string, mime: string) => {
      savedFiles.push({ filename, mime, size: b64.length });
      return true;
    },
    printHtml: (_html: string, jobName: string) => {
      printedJobs.push(jobName);
    },
  };
  (globalThis as any).window.AndroidThermalPrinter = {
    isSupported: () => true,
    getPairedPrintersJson: () => JSON.stringify([{ name: 'POS-58-BT', address: '00:11:22:33:44:55', bonded: true }]),
    printEscPosBase64: (b64: string, addr?: string) => {
      escPrintedAddr = addr || '';
      return JSON.stringify({ success: b64.length > 0, message: 'OK' });
    },
  };

  assert('5.1 isAndroidNativeApp detects WebView JavascriptInterfaces', isAndroidNativeApp() === true);
  openExternalUrl('https://wa.me/9779800000001?text=Hello');
  openExternalUrl('tel:+9779800000001');
  await downloadTextFile('a,b\n1,2', 'milk_export.csv', 'text/csv');
  downloadDataUrlFile('data:image/png;base64,iVBORw0KGgo=', 'bill.png');
  saveJsPdfDocument({ output: () => new Uint8Array([1, 2, 3, 4]).buffer, save: () => {} }, 'bill.pdf');
  printHtmlDocument('<html><body>Bill</body></html>', 'Milk Print Job');
  const printers = getPairedBluetoothPrinters();
  const printRes = sendEscPosToBluetoothPrinter(esc58, printers[0]?.address);

  assert(
    '5.2 androidBridge dispatches WhatsApp/tel intents, PDF/CSV/PNG base64 downloads, PrintManager & BT ESC/POS',
    openedUrls.length === 2 &&
      savedFiles.length === 3 &&
      savedFiles.some((f) => f.filename === 'milk_export.csv') &&
      savedFiles.some((f) => f.filename === 'bill.png') &&
      savedFiles.some((f) => f.filename === 'bill.pdf' && f.mime === 'application/pdf') &&
      printedJobs[0] === 'Milk Print Job' &&
      printRes.success === true &&
      escPrintedAddr === '00:11:22:33:44:55'
  );

  // ------------------------------------------------------------------
  // 6. Native Android Project Verification & Credential Hygiene
  // ------------------------------------------------------------------
  const requiredAndroidFiles = [
    'android/settings.gradle.kts',
    'android/build.gradle.kts',
    'android/gradle.properties',
    'android/gradle/wrapper/gradle-wrapper.properties',
    'android/keystore.properties.example',
    'android/local.properties.example',
    'android/app/build.gradle.kts',
    'android/app/proguard-rules.pro',
    'android/app/google-services.json.template',
    'android/app/src/main/AndroidManifest.xml',
    'android/app/src/main/kotlin/com/ghaule/calculator/GauleApplication.kt',
    'android/app/src/main/kotlin/com/ghaule/calculator/MainActivity.kt',
    'android/app/src/main/kotlin/com/ghaule/calculator/auth/FirebaseAuthManager.kt',
    'android/app/src/main/kotlin/com/ghaule/calculator/printer/BluetoothThermalPrinter.kt',
  ];
  const missingFiles = requiredAndroidFiles.filter((rel) => !fs.existsSync(path.resolve(process.cwd(), rel)));
  assert('6.1 Complete native Android Gradle + Kotlin files exist', missingFiles.length === 0, missingFiles.join(', '));

  const authKt = fs.readFileSync(path.resolve(process.cwd(), 'android/app/src/main/kotlin/com/ghaule/calculator/auth/FirebaseAuthManager.kt'), 'utf8');
  const appBuildGradle = fs.readFileSync(path.resolve(process.cwd(), 'android/app/build.gradle.kts'), 'utf8');
  assert(
    '6.2 Kotlin FirebaseAuthManager & build.gradle.kts contain no hardcoded placeholder OAuth client IDs',
    !authKt.includes('170188921418-web.apps.googleusercontent.com') && !appBuildGradle.includes('170188921418-web.apps.googleusercontent.com')
  );

  console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
