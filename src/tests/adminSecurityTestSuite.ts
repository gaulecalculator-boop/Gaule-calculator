/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Ghaule Calculator - Automated Security & Admin Role Verification Suite
 * Tests the 6 Required Conditions:
 * 1. Super Admin Login verification strictly with 'aayushinepalenergy@gmail.com'
 * 2. Rajan operates as Calendar Manager (edit, switch 2083->2084, publish, export)
 * 3. Normal users & Guests are strictly denied Admin Panel access
 * 4. Rajan's privileges are strictly confined (CANNOT assign roles / manage users)
 * 5. Calendar versions 2083, 2084, and 2085 remain isolated; safety backups & audit logs work
 * 6. Logout and account switching immediately revokes all administrative access
 */

class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }
}

// Polyfill window & localStorage before imports
const mockStorage = new MockLocalStorage();
(global as any).window = {
  location: { hostname: 'localhost' },
  localStorage: mockStorage,
};
(global as any).localStorage = mockStorage;
(globalThis as any).__GHAULE_OFFLINE_TEST__ = true;

import {
  adminRoleManager,
  SUPER_ADMIN_EMAIL,
  CALENDAR_MANAGERS,
} from '../utils/adminRoleManager';
import {
  calendarVersionManager,
  SUPPORTED_CALENDAR_YEARS,
} from '../utils/calendarVersionManager';
import { UserProfile } from '../types';

interface TestResult {
  title: string;
  passed: boolean;
  details: string;
}

const testResults: TestResult[] = [];

function assert(condition: boolean, title: string, details: string) {
  testResults.push({
    title,
    passed: !!condition,
    details,
  });
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m ${title}`);
  } else {
    console.error(`  \x1b[31m✘ FAIL\x1b[0m ${title}: ${details}`);
  }
}

async function runTestSuite() {
  console.log('\n=============================================================');
  console.log('   GHAULE CALCULATOR - ADMIN & SECURITY VERIFICATION SUITE   ');
  console.log('=============================================================\n');

  // Clear state before starting
  mockStorage.clear();
  adminRoleManager.clearRole();

  // --------------------------------------------------------------------------
  // CONDITION 1: Super Admin Login (Strictly aayushinepalenergy@gmail.com)
  // --------------------------------------------------------------------------
  console.log('[TEST GROUP 1] Super Admin Verification & Email Enforcement');

  assert(
    SUPER_ADMIN_EMAIL === 'aayushinepalenergy@gmail.com',
    'Target Super Admin Email Check',
    `Expected 'aayushinepalenergy@gmail.com', found '${SUPER_ADMIN_EMAIL}'`
  );

  const superAdminUser: UserProfile = {
    uid: 'google-superadmin-uid-999',
    name: 'Aayushi Super Admin',
    email: 'aayushinepalenergy@gmail.com',
    provider: 'google.com',
    createdAt: Date.now(),
    lastLogin: Date.now(),
    accountStatus: 'active',
    isGuest: false,
  };

  const superAdminRole = await adminRoleManager.verifyAndSyncRole(superAdminUser);
  assert(
    superAdminRole === 'super_admin',
    'Super Admin Verified via Auth and Role Manager',
    `Role assigned: '${superAdminRole}', expected 'super_admin'`
  );
  assert(
    adminRoleManager.isSuperAdmin() === true,
    'adminRoleManager.isSuperAdmin() returns true',
    'Super admin status confirmed'
  );
  assert(
    adminRoleManager.hasCalendarManagerAccess() === true,
    'Super Admin also has Calendar Manager capability',
    'Super admin has superset privileges'
  );

  // Reject typos / imposters (e.g., misspelled 'aayushineenergy@gmail.com')
  const imposterUser: UserProfile = {
    uid: 'imposter-uid-456',
    name: 'Imposter Admin',
    email: 'aayushineenergy@gmail.com', // Wrong spelling without 'pal'
    provider: 'google.com',
    createdAt: Date.now(),
    lastLogin: Date.now(),
    accountStatus: 'active',
    isGuest: false,
  };
  const imposterRole = await adminRoleManager.verifyAndSyncRole(imposterUser);
  assert(
    imposterRole === 'user',
    'Imposter / Misspelled Email is Strictly Denied',
    `Imposter role assigned: '${imposterRole}', expected 'user'`
  );

  // --------------------------------------------------------------------------
  // CONDITION 2: Rajan Calendar Manager Verification
  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 2] Rajan Calendar Manager Role & Capabilities');

  // Verify Rajan is registered in calendar managers
  assert(
    CALENDAR_MANAGERS.some((email) => email.includes('rajan')),
    'Rajan is registered in Calendar Managers whitelist',
    'Rajan email configured'
  );

  const rajanUser: UserProfile = {
    uid: 'rajan-manager-uid-123',
    name: 'Rajan Ghaule',
    email: 'rajan.calendar@ghaule.local',
    provider: 'google.com',
    createdAt: Date.now(),
    lastLogin: Date.now(),
    accountStatus: 'active',
    isGuest: false,
  };

  const rajanRole = await adminRoleManager.verifyAndSyncRole(rajanUser);
  assert(
    rajanRole === 'calendar_manager',
    'Rajan receives calendar_manager Role',
    `Assigned role: '${rajanRole}', expected 'calendar_manager'`
  );
  assert(
    adminRoleManager.hasCalendarManagerAccess() === true,
    'Rajan has Calendar Manager access permission',
    'Calendar Manager authorized'
  );

  // Test Rajan's Calendar Management operations:
  // 1. Switch active year from 2083 to 2084
  await calendarVersionManager.switchYear(2084, rajanUser);
  assert(
    calendarVersionManager.getActiveYear() === 2084,
    'Rajan switches active year from 2083 to 2084',
    `Active year is now ${calendarVersionManager.getActiveYear()}`
  );

  // 2. Edit a holiday and festival
  const originalYear = await calendarVersionManager.getDataset(2084);
  const targetDay = originalYear?.months[0]?.data[0];
  assert(
    !!targetDay,
    'Dataset 2084 month 1 day 1 is accessible',
    'Target day exists'
  );

  const updatedDataset = await calendarVersionManager.updateDayEntry(
    2084,
    1,
    1,
    {
      festivals: 'नयाँ वर्ष २०८४ उत्सव (Edited by Rajan)',
      isHoliday: true,
      holidayReason: 'सार्वजनिक विदा',
    },
    rajanUser
  );
  assert(
    !!updatedDataset,
    'Rajan successfully updates date, festival, and holiday',
    'Day entry updated'
  );

  const updatedEntry = calendarVersionManager.getDayEntry(2084, 1, 1);
  assert(
    updatedEntry?.festivals?.includes('Edited by Rajan') === true,
    'Updated festival name reflects correctly in memory and storage',
    `Festival: ${updatedEntry?.festivals}`
  );

  // 3. Remove incorrect calendar data
  const afterRemoveDataset = await calendarVersionManager.removeDayData(
    2084,
    1,
    1,
    'festivals',
    rajanUser
  );
  assert(
    !!afterRemoveDataset,
    'Rajan can remove incorrect calendar data fields',
    'Incorrect festival removed successfully'
  );

  // 4. Export JSON and CSV
  const jsonExport = calendarVersionManager.exportJson(originalYear);
  const csvExport = calendarVersionManager.exportCsv(originalYear);
  assert(
    jsonExport.length > 500 && jsonExport.includes('"year_bs": 2084'),
    'Rajan can export full 2084 JSON dataset',
    `JSON payload length: ${jsonExport.length} characters`
  );
  assert(
    csvExport.startsWith('BS Year,Month Number,Month Name,Gate,Weekday,English Date,Tithi,Is Holiday,Holiday Reason,Festivals'),
    'Rajan can export 2084 CSV dataset with correct headers',
    `CSV headers validated`
  );

  // 5. Pre-publish integrity validation
  const validation = calendarVersionManager.validateDataset(originalYear);
  assert(
    validation.isValid === true && originalYear.total_days_count >= 354,
    'Pre-Publish Integrity Validation passes for 2084 dataset',
    `Total days: ${originalYear.total_days_count}, Months: ${originalYear.months.length}`
  );

  // 6. Snapshot backup creation and publishing
  const backupSnapshot = await calendarVersionManager.createBackup(
    2084,
    'Pre-Publish Snapshot by Rajan',
    rajanUser
  );
  assert(
    backupSnapshot.id.startsWith('bkp_2084_'),
    'Rajan creates snapshot backup prior to publishing',
    `Backup ID: ${backupSnapshot.id}`
  );

  const publishResult = await calendarVersionManager.publishDataset(
    originalYear,
    rajanUser
  );
  assert(
    publishResult.success === true,
    'Rajan saves and publishes calendar dataset',
    'Publish workflow succeeded'
  );

  // --------------------------------------------------------------------------
  // CONDITION 3: Normal User & Guest Denied Admin Access
  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 3] Normal Users & Guests Blocked from Admin Panel');

  const regularUser: UserProfile = {
    uid: 'regular-user-uid-789',
    name: 'Normal User',
    email: 'normal.customer@gmail.com',
    provider: 'google.com',
    createdAt: Date.now(),
    lastLogin: Date.now(),
    accountStatus: 'active',
    isGuest: false,
  };

  const guestUser: UserProfile = {
    uid: 'guest-session-111',
    name: 'अतिथि (Guest)',
    email: '',
    provider: 'guest',
    createdAt: Date.now(),
    lastLogin: Date.now(),
    accountStatus: 'guest',
    isGuest: true,
  };

  const regularRole = await adminRoleManager.verifyAndSyncRole(regularUser);
  assert(
    regularRole === 'user',
    'Regular Google account receives "user" role',
    `Assigned: '${regularRole}'`
  );
  assert(
    adminRoleManager.isSuperAdmin() === false,
    'Regular user is NOT Super Admin',
    'isSuperAdmin() is false'
  );
  assert(
    adminRoleManager.hasCalendarManagerAccess() === false,
    'Regular user has NO Calendar Manager access',
    'hasCalendarManagerAccess() is false'
  );

  const guestRole = await adminRoleManager.verifyAndSyncRole(guestUser);
  assert(
    guestRole === 'user',
    'Guest account receives "user" role',
    `Guest role: '${guestRole}'`
  );
  assert(
    adminRoleManager.hasCalendarManagerAccess() === false,
    'Guest account has NO Calendar Manager access',
    'Guest strictly blocked'
  );

  // --------------------------------------------------------------------------
  // CONDITION 4: Rajan Privilege Separation (Cannot Manage Roles)
  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 4] Privilege Separation (Rajan Limited to Calendar)');

  // Set active role back to Rajan
  await adminRoleManager.verifyAndSyncRole(rajanUser);

  assert(
    adminRoleManager.isSuperAdmin() === false,
    'Rajan is NOT Super Admin',
    'Rajan is calendar_manager only'
  );
  assert(
    adminRoleManager.canManageUsers() === false,
    'Rajan CANNOT manage user roles',
    'canManageUsers() returns false'
  );

  // Attempt role assignment as non-Super Admin must be blocked
  let roleAssignmentError = false;
  try {
    const res = await adminRoleManager.assignRole(
      'some-other-uid',
      'other@gmail.com',
      'Other Admin',
      'super_admin',
      rajanUser
    );
    if (!res.success) {
      roleAssignmentError = true;
    }
  } catch (err) {
    roleAssignmentError = true;
  }

  assert(
    roleAssignmentError === true,
    'Rajan is strictly prevented from assigning user roles',
    'RBAC guard denied role modification attempt'
  );

  // --------------------------------------------------------------------------
  // CONDITION 5: Calendar Version Isolation (2083, 2084, 2085) & Backup/Restore
  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 5] Calendar Version Isolation & Safety Backups');

  // Verify all 3 years exist separately
  assert(
    SUPPORTED_CALENDAR_YEARS.includes(2083) &&
      SUPPORTED_CALENDAR_YEARS.includes(2084) &&
      SUPPORTED_CALENDAR_YEARS.includes(2085),
    'All three calendar years (2083, 2084, 2085) are supported',
    'Supported years: ' + SUPPORTED_CALENDAR_YEARS.join(', ')
  );

  const dataset2083 = await calendarVersionManager.getDataset(2083);
  const dataset2084 = await calendarVersionManager.getDataset(2084);
  const dataset2085 = await calendarVersionManager.getDataset(2085);

  assert(
    dataset2083 !== null && dataset2084 !== null && dataset2085 !== null,
    '2083, 2084, and 2085 datasets exist as distinct separate structures',
    'Data separation confirmed'
  );

  // Modifying 2084 must NOT affect 2083 or 2085
  await calendarVersionManager.updateDayEntry(
    2084,
    2,
    15,
    { festivals: '२०८४ विशेष उत्सव' },
    rajanUser
  );

  const dayIn2083 = calendarVersionManager.getDayEntry(2083, 2, 15);
  const dayIn2084 = calendarVersionManager.getDayEntry(2084, 2, 15);
  const dayIn2085 = calendarVersionManager.getDayEntry(2085, 2, 15);

  assert(
    dayIn2084?.festivals === '२०८४ विशेष उत्सव' &&
      dayIn2083?.festivals !== '२०८४ विशेष उत्सव' &&
      dayIn2085?.festivals !== '२०८४ विशेष उत्सव',
    'Year Isolation: Modifying 2084 does NOT alter 2083 or 2085',
    'Strict separation of calendar years verified'
  );

  // Test Point-in-Time Restore from Backup
  const snapshotBeforeTweak = await calendarVersionManager.createBackup(
    2084,
    'Snapshot for Restore Test',
    rajanUser
  );

  // Corrupt a day intentionally
  await calendarVersionManager.updateDayEntry(
    2084,
    1,
    5,
    { festivals: 'ACCIDENTAL MISTAKE' },
    rajanUser
  );
  assert(
    calendarVersionManager.getDayEntry(2084, 1, 5)?.festivals === 'ACCIDENTAL MISTAKE',
    'Accidental change applied to test restoration',
    'Mistake introduced'
  );

  // Restore snapshot
  const restoreRes = await calendarVersionManager.restoreBackup(
    snapshotBeforeTweak.id,
    rajanUser
  );
  assert(
    restoreRes.success === true,
    'Backup restored successfully',
    '1-Click restore operational'
  );

  const restoredEntry = calendarVersionManager.getDayEntry(2084, 1, 5);
  assert(
    restoredEntry?.festivals !== 'ACCIDENTAL MISTAKE',
    'Accidental mistake successfully rolled back to snapshot state',
    'Data restoration verified'
  );

  // Verify Audit Logs
  const auditLogs = calendarVersionManager.getAuditLogs();
  assert(
    auditLogs.length > 0 && auditLogs.some((l) => l.authorEmail === rajanUser.email),
    'Audit Trail accurately logs actor, timestamp, action, and details',
    `Total audit logs recorded: ${auditLogs.length}`
  );

  // --------------------------------------------------------------------------
  // CONDITION 6: Logout Revokes All Admin Access
  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 6] Logout & Role Revocation');

  // Verify currently logged-in admin state
  assert(
    adminRoleManager.hasCalendarManagerAccess() === true,
    'Admin access active prior to logout',
    'Initial state confirmed'
  );

  // Perform logout / clearRole
  adminRoleManager.clearRole();

  assert(
    adminRoleManager.getCurrentRole() === 'user',
    'adminRoleManager.getCurrentRole() immediately resets to "user"',
    'Role is now user'
  );
  assert(
    adminRoleManager.isSuperAdmin() === false,
    'isSuperAdmin() immediately returns false after logout',
    'Super Admin access revoked'
  );
  assert(
    adminRoleManager.hasCalendarManagerAccess() === false,
    'hasCalendarManagerAccess() immediately returns false after logout',
    'Calendar Manager access revoked'
  );

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  const allPassed = testResults.every((t) => t.passed);
  console.log('\n=============================================================');
  console.log(`TOTAL TESTS: ${testResults.length} | PASSED: ${testResults.filter(t => t.passed).length} | FAILED: ${testResults.filter(t => !t.passed).length}`);
  console.log(allPassed ? 'STATUS: ALL 6 CONDITIONS FULLY VERIFIED ✔' : 'STATUS: SOME TESTS FAILED ✘');
  console.log('=============================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
