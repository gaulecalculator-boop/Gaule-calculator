export type Language = 'en' | 'ne' | 'hi' | 'bho' | 'mai';
export type Currency = 'NPR' | 'INR';

export type ToolCategory =
  | 'all'
  | 'milk'
  | 'shop'
  | 'finance'
  | 'construction'
  | 'dates';

export interface CalculatorMeta {
  id: string;
  nameEn: string;
  nameNe: string;
  nameHi?: string;
  nameBho?: string;
  nameMai?: string;
  category: ToolCategory;
  categoryNameEn: string;
  categoryNameNe: string;
  categoryNameHi?: string;
  categoryNameBho?: string;
  categoryNameMai?: string;
  iconType: string;
  colorGradient: string;
  bgColor: string;
  descEn: string;
  descNe: string;
  descHi?: string;
  descBho?: string;
  descMai?: string;
  isPopular?: boolean;
}

export interface CalculationHistoryItem {
  id: string;
  toolId: string;
  toolName: string;
  date: string;
  bsDate?: string;
  title: string;
  summary: string;
  amount: number;
  currency: Currency;
  details: Record<string, string | number>;
  timestamp: number;
}

export interface MilkDiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  bsDate: string;
  morningLtr: number;
  eveningLtr: number;
  totalLtr: number;
  ratePerLtr: number;
  totalPrice: number;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: 'Uncategorized' | 'Personal' | 'Daily Tasks' | 'Milk Ledger' | 'Shop';
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}

export interface ByajPayment {
  id: string;
  date: string;
  amount: number;
  type: 'interest' | 'principal';
  note?: string;
  direction?: 'received' | 'made';
  method?: 'cash' | 'bank' | 'esewa' | 'khalti' | 'qr';
  billPhoto?: string;
  returnDate?: string;
  interestRate?: number;
}

export interface ByajLedgerEntry {
  id: string;
  borrowerName: string;
  phone?: string;
  photoUrl?: string; // फोटो / ऋणी वा धितो फोटो (Base64 data or URL)
  principal: number; // साँवा रकम
  monthlyRate: number; // मासिक ब्याज दर % (उदा. २%, ३%)
  startDate: string; // ऋण लिएको मिति (YYYY-MM-DD)
  note?: string;
  payments: ByajPayment[];
  isSettled?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CustomerTransaction {
  id: string;
  date: string;
  type: 'gave' | 'got'; // gave (दिएको / udharo) or got (लिएको / received)
  amount: number;
  note: string;
}

export interface CustomerItem {
  id: string;
  name: string;
  phone: string;
  address?: string;
  balance: number; // positive = customer owes you, negative = you owe customer
  transactions: CustomerTransaction[];
  updatedAt: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  provider: 'google.com' | 'guest';
  createdAt: number | string;
  lastLogin: number | string;
  accountStatus: 'active' | 'guest';
  isGuest?: boolean;
  guestSessionId?: string;
  role?: UserRole;
}

export type UserRole = 'super_admin' | 'calendar_manager' | 'user';

export interface AdminUserRecord {
  uid: string;
  email: string;
  role: 'super_admin' | 'calendar_manager';
  name: string;
  assignedBy: string;
  assignedAt: number;
  updatedAt: number;
}

export interface CalendarDayEntry {
  id?: number;
  year: number;
  month: number;
  gate: number;
  baar: string;
  tithi: string;
  tithiEnds?: string;
  englishDate: string;
  festivals?: string;
  isHoliday?: boolean;
  holidayReason?: string;
  sunrise?: string;
  sunset?: string;
  moonSign?: string;
}

export interface CalendarMonthData {
  month: number;
  month_name_ne: string;
  month_name_en: string;
  total_days: number;
  data: CalendarDayEntry[];
}

export interface CalendarYearDataset {
  year_bs: number;
  status: string;
  total_months: number;
  total_days_count: number;
  updatedAt: number;
  publishedAt?: number;
  publishedBy?: string;
  months: CalendarMonthData[];
}

export interface CalendarAuditLog {
  id: string;
  action: string;
  targetYear: number;
  authorEmail: string;
  authorUid: string;
  authorRole: string;
  details: string;
  timestamp: number;
}

export interface CalendarBackupSnapshot {
  id: string;
  year: number;
  label: string;
  createdBy: string;
  timestamp: number;
  totalDays: number;
  dataSnapshot: CalendarYearDataset;
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'pending' | 'error';

export interface PendingSyncItem {
  id: string;
  action: 'set' | 'delete';
  collection: 'notes' | 'history' | 'customers' | 'milkDiary' | 'settings';
  data?: any;
  timestamp: number;
}

