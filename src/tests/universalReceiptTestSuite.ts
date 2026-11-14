/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * UNIVERSAL RECEIPT & BILL MANAGEMENT TEST SUITE
 * Gaule Calculator Verification
 */

import { dairyBranding, DEFAULT_DAIRY_PROFILE } from '../utils/dairyBranding';
import {
  UniversalBill,
  generateNextBillNumber,
  saveUniversalBill,
  getAllUniversalBills,
  getAllRegisteredCustomers,
  getCustomerBillsAndHistory,
  formatWhatsAppBillText,
} from '../utils/universalReceiptEngine';

export function runUniversalReceiptTests(): {
  total: number;
  passed: number;
  failed: number;
  results: Array<{ test: string; status: 'PASS' | 'FAIL'; error?: string }>;
} {
  // Polyfill window and localStorage if running in Node CLI environment
  if (typeof globalThis.window === 'undefined') {
    const memoryStore = new Map<string, string>();
    const mockStorage = {
      getItem: (k: string) => memoryStore.get(k) || null,
      setItem: (k: string, v: string) => memoryStore.set(k, String(v)),
      removeItem: (k: string) => memoryStore.delete(k),
      clear: () => memoryStore.clear(),
    };
    (globalThis as any).window = {
      localStorage: mockStorage,
      dispatchEvent: () => true,
    };
    (globalThis as any).localStorage = mockStorage;
  }

  const results: Array<{ test: string; status: 'PASS' | 'FAIL'; error?: string }> = [];

  function assert(name: string, condition: boolean, errorMsg?: string) {
    if (condition) {
      results.push({ test: name, status: 'PASS' });
    } else {
      results.push({ test: name, status: 'FAIL', error: errorMsg || 'Assertion failed' });
    }
  }

  // 1. Branding single source of truth test
  try {
    const testProfile = {
      ...DEFAULT_DAIRY_PROFILE,
      dairyName: 'सुपर टेस्ट डेरी तथा किराना',
      proprietorName: 'हरि शर्मा',
      mobile: '9841000000',
      address: 'दमक-५, झापा',
    };
    dairyBranding.saveProfile(testProfile);
    const readBack = dairyBranding.getProfile();
    assert(
      'Test 1: Branding Single Source of Truth Persistence',
      readBack.dairyName === 'सुपर टेस्ट डेरी तथा किराना' && readBack.proprietorName === 'हरि शर्मा'
    );
  } catch (e: any) {
    assert('Test 1: Branding Single Source of Truth Persistence', false, e?.message);
  }

  // 2. Bill number generation test
  try {
    const milkBillNo = generateNextBillNumber('milk');
    const byajBillNo = generateNextBillNumber('byaj');
    const goldBillNo = generateNextBillNumber('gold_silver');
    assert(
      'Test 2: Bill Number Generation with Module Prefixes',
      milkBillNo.startsWith('MK-') && byajBillNo.startsWith('BJ-') && goldBillNo.startsWith('GS-')
    );
  } catch (e: any) {
    assert('Test 2: Bill Number Generation with Module Prefixes', false, e?.message);
  }

  // 3. Financial calculations & status tests
  try {
    const mockBill: UniversalBill = {
      id: 'TEST_BILL_001',
      billNumber: 'GH-83-9999',
      moduleType: 'milk',
      moduleTitle: 'दुध हिसाब',
      customerName: 'राम बहादुर थापा',
      customerMobile: '9800000001',
      dateAD: '2026-11-12',
      dateBS: '2083-07-27',
      createdAt: Date.now(),
      items: [
        { description: 'गाईको दुध', quantity: 20, unit: 'L', rate: 80, subtotal: 1600 },
        { description: 'भैंसीको दुध', quantity: 10, unit: 'L', rate: 100, subtotal: 1000 },
      ],
      subtotal: 2600,
      discount: 100,
      totalAmount: 2500,
      paidAmount: 2000,
      remainingDue: 500,
      paymentStatus: 'PARTIAL',
      branding: dairyBranding.getProfile(),
    };

    saveUniversalBill(mockBill);
    const all = getAllUniversalBills();
    const saved = all.find((b) => b.id === 'TEST_BILL_001');

    assert(
      'Test 3: Universal Bill Saving & Persistence',
      !!saved && saved.totalAmount === 2500 && saved.remainingDue === 500 && saved.paymentStatus === 'PARTIAL'
    );

    // 4. Customer history query test
    const hist = getCustomerBillsAndHistory('राम बहादुर थापा');
    assert(
      'Test 4: Customer History Aggregation & Ledger',
      hist.bills.length > 0 && hist.totalDue >= 500
    );

    // 5. WhatsApp Rich Formatter test
    const waText = formatWhatsAppBillText(mockBill);
    assert(
      'Test 5: WhatsApp Unicode Nepali Rich Text Formatting',
      waText.includes('राम बहादुर थापा') &&
        waText.includes('2,500') &&
        waText.includes('500') &&
        waText.includes('सुपर टेस्ट डेरी तथा किराना')
    );
  } catch (e: any) {
    assert('Test 3-5: Universal Bill Operations', false, e?.message);
  }

  // 6. Registered Customer Aggregator test
  try {
    const custs = getAllRegisteredCustomers();
    assert(
      'Test 6: Universal Customer Registry Integration',
      Array.isArray(custs)
    );
  } catch (e: any) {
    assert('Test 6: Universal Customer Registry Integration', false, e?.message);
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log(`[Universal Receipt Tests] Passed: ${passed}/${results.length}, Failed: ${failed}`);
  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}
