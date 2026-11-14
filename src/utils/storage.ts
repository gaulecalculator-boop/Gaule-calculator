import { CalculationHistoryItem, CustomerItem, MilkDiaryEntry, NoteItem, Language, Currency, ByajLedgerEntry, ByajPayment } from '../types';
import { authManager } from './authManager';
import { syncEngine } from '../firebase/syncEngine';
import { formatDateToBS } from './nepaliCalendar';

const BASE_KEYS = {
  LANGUAGE: 'lang',
  CURRENCY: 'currency',
  PINNED: 'pinned_tools',
  HISTORY: 'calc_history',
  NOTES: 'notes',
  CUSTOMERS: 'customers',
  MILK_DIARY: 'milk_diary',
  BYAJ_LEDGER: 'byaj_ledger',
  HAS_SEEN_STARTUP: 'has_seen_startup',
};

function getKey(baseKey: string): string {
  const prefix = authManager.getActiveStoragePrefix();
  return `${prefix}${baseKey}`;
}

// Seamless legacy migration helper
function migrateLegacyIfPresent(legacyKey: string, newKey: string) {
  if (typeof window === 'undefined') return;
  const legacyVal = localStorage.getItem(legacyKey);
  const newVal = localStorage.getItem(newKey);
  if (legacyVal && !newVal) {
    localStorage.setItem(newKey, legacyVal);
  }
}

export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'hi';
  migrateLegacyIfPresent('ghaule_lang', getKey(BASE_KEYS.LANGUAGE));
  return (localStorage.getItem(getKey(BASE_KEYS.LANGUAGE)) as Language) ||
    (localStorage.getItem('ghaule_lang') as Language) ||
    'hi';
}

export function setStoredLanguage(lang: Language): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getKey(BASE_KEYS.LANGUAGE), lang);
  localStorage.setItem('ghaule_lang', lang);
}

export function getStoredCurrency(): Currency {
  if (typeof window === 'undefined') return 'NPR';
  migrateLegacyIfPresent('ghaule_currency', getKey(BASE_KEYS.CURRENCY));
  return (localStorage.getItem(getKey(BASE_KEYS.CURRENCY)) as Currency) || 'NPR';
}

export function setStoredCurrency(curr: Currency): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getKey(BASE_KEYS.CURRENCY), curr);
  const user = authManager.getCurrentUser();
  if (user && !user.isGuest) {
    syncEngine.pushItemChange(user.uid, 'settings', 'prefs', { currency: curr }, 'set');
  }
}

export function getStoredPinnedTools(): string[] {
  const defaultPinned = ['doodh', 'byaj', 'price-weight', 'land-area'];
  if (typeof window === 'undefined') return defaultPinned;
  migrateLegacyIfPresent('ghaule_pinned_tools', getKey(BASE_KEYS.PINNED));
  const stored = localStorage.getItem(getKey(BASE_KEYS.PINNED));
  if (!stored) return defaultPinned;
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((id) => id !== 'nepali-patro')
      : defaultPinned;
  } catch {
    return defaultPinned;
  }
}

export function setStoredPinnedTools(tools: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getKey(BASE_KEYS.PINNED), JSON.stringify(tools));
  const user = authManager.getCurrentUser();
  if (user && !user.isGuest) {
    syncEngine.pushItemChange(user.uid, 'settings', 'prefs', { pinned: tools }, 'set');
  }
}

// ----------------- CALCULATION HISTORY -----------------
export function getStoredHistory(): CalculationHistoryItem[] {
  if (typeof window === 'undefined') return [];
  migrateLegacyIfPresent('ghaule_calc_history', getKey(BASE_KEYS.HISTORY));
  const stored = localStorage.getItem(getKey(BASE_KEYS.HISTORY));
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveCalculationToHistory(
  item: Omit<CalculationHistoryItem, 'id' | 'timestamp'>
): CalculationHistoryItem {
  const history = getStoredHistory();
  const newItem: CalculationHistoryItem = {
    ...item,
    id: `calc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: Date.now(),
  };
  const updated = [newItem, ...history];
  localStorage.setItem(getKey(BASE_KEYS.HISTORY), JSON.stringify(updated));

  // Sync to Firestore for Google users
  const user = authManager.getCurrentUser();
  if (user && !user.isGuest) {
    syncEngine.pushItemChange(user.uid, 'history', newItem.id, newItem, 'set');
  }

  return newItem;
}

export function deleteHistoryItem(id: string): void {
  const history = getStoredHistory();
  const updated = history.filter((h) => h.id !== id);
  localStorage.setItem(getKey(BASE_KEYS.HISTORY), JSON.stringify(updated));

  const user = authManager.getCurrentUser();
  if (user && !user.isGuest) {
    syncEngine.pushItemChange(user.uid, 'history', id, null, 'delete');
  }
}

export function clearAllHistory(): void {
  const history = getStoredHistory();
  localStorage.setItem(getKey(BASE_KEYS.HISTORY), JSON.stringify([]));

  const user = authManager.getCurrentUser();
  if (user && !user.isGuest) {
    history.forEach((item) => {
      syncEngine.pushItemChange(user.uid, 'history', item.id, null, 'delete');
    });
  }
}

// ----------------- NOTES STORAGE -----------------
export function getStoredNotes(): NoteItem[] {
  if (typeof window === 'undefined') return [];
  migrateLegacyIfPresent('ghaule_notes', getKey(BASE_KEYS.NOTES));
  const stored = localStorage.getItem(getKey(BASE_KEYS.NOTES));
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveNote(
  note: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'>,
  editId?: string
): NoteItem {
  const notes = getStoredNotes();
  const now = Date.now();
  let targetNote: NoteItem;

  if (editId) {
    const updated = notes.map((n) => {
      if (n.id === editId) {
        targetNote = { ...n, ...note, updatedAt: now };
        return targetNote;
      }
      return n;
    });
    localStorage.setItem(getKey(BASE_KEYS.NOTES), JSON.stringify(updated));
    targetNote = updated.find((n) => n.id === editId)!;
  } else {
    targetNote = {
      ...note,
      id: `note_${now}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    };
    localStorage.setItem(getKey(BASE_KEYS.NOTES), JSON.stringify([targetNote, ...notes]));
  }

  // Cloud sync for Google users
  const user = authManager.getCurrentUser();
  if (user && !user.isGuest) {
    syncEngine.pushItemChange(user.uid, 'notes', targetNote.id, targetNote, 'set');
  }

  return targetNote;
}

export function deleteNote(id: string): void {
  const notes = getStoredNotes();
  const updated = notes.filter((n) => n.id !== id);
  localStorage.setItem(getKey(BASE_KEYS.NOTES), JSON.stringify(updated));

  const user = authManager.getCurrentUser();
  if (user && !user.isGuest) {
    syncEngine.pushItemChange(user.uid, 'notes', id, null, 'delete');
  }
}

// ----------------- CUSTOMER LEDGER STORAGE -----------------
export function getStoredCustomers(): CustomerItem[] {
  if (typeof window === 'undefined') return [];
  migrateLegacyIfPresent('ghaule_customers', getKey(BASE_KEYS.CUSTOMERS));
  const stored = localStorage.getItem(getKey(BASE_KEYS.CUSTOMERS));
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveCustomer(
  customer: Omit<CustomerItem, 'id' | 'updatedAt'>,
  editId?: string
): CustomerItem {
  const customers = getStoredCustomers();
  const now = Date.now();
  let targetCustomer: CustomerItem;

  if (editId) {
    const updated = customers.map((c) => {
      if (c.id === editId) {
        targetCustomer = { ...c, ...customer, updatedAt: now };
        return targetCustomer;
      }
      return c;
    });
    localStorage.setItem(getKey(BASE_KEYS.CUSTOMERS), JSON.stringify(updated));
    targetCustomer = updated.find((c) => c.id === editId)!;
  } else {
    targetCustomer = {
      ...customer,
      id: `cust_${now}_${Math.random().toString(36).substr(2, 5)}`,
      updatedAt: now,
    };
    localStorage.setItem(getKey(BASE_KEYS.CUSTOMERS), JSON.stringify([targetCustomer, ...customers]));
  }

  const user = authManager.getCurrentUser();
  if (user && !user.isGuest) {
    syncEngine.pushItemChange(user.uid, 'savedRecords', targetCustomer.id, targetCustomer, 'set');
  }

  return targetCustomer;
}

export function deleteCustomer(id: string): void {
  const customers = getStoredCustomers();
  const updated = customers.filter((c) => c.id !== id);
  localStorage.setItem(getKey(BASE_KEYS.CUSTOMERS), JSON.stringify(updated));

  const user = authManager.getCurrentUser();
  if (user && !user.isGuest) {
    syncEngine.pushItemChange(user.uid, 'savedRecords', id, null, 'delete');
  }
}

// ----------------- MILK DIARY STORAGE -----------------
export function getStoredMilkDiary(): MilkDiaryEntry[] {
  if (typeof window === 'undefined') return [];
  migrateLegacyIfPresent('ghaule_milk_diary', getKey(BASE_KEYS.MILK_DIARY));
  const stored = localStorage.getItem(getKey(BASE_KEYS.MILK_DIARY));
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveMilkDiaryEntry(entry: Omit<MilkDiaryEntry, 'id'>): MilkDiaryEntry {
  const entries = getStoredMilkDiary();
  const newEntry: MilkDiaryEntry = {
    ...entry,
    id: `milk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
  };
  const updated = [newEntry, ...entries];
  localStorage.setItem(getKey(BASE_KEYS.MILK_DIARY), JSON.stringify(updated));

  const user = authManager.getCurrentUser();
  if (user && !user.isGuest) {
    syncEngine.pushItemChange(user.uid, 'savedRecords', newEntry.id, newEntry, 'set');
  }

  return newEntry;
}

export function deleteMilkDiaryEntry(id: string): void {
  const entries = getStoredMilkDiary();
  const updated = entries.filter((e) => e.id !== id);
  localStorage.setItem(getKey(BASE_KEYS.MILK_DIARY), JSON.stringify(updated));

  const user = authManager.getCurrentUser();
  if (user && !user.isGuest) {
    syncEngine.pushItemChange(user.uid, 'savedRecords', id, null, 'delete');
  }
}

// ----------------- BYAJ (INTEREST) LEDGER STORAGE -----------------
export function getStoredByajLedger(): ByajLedgerEntry[] {
  if (typeof window === 'undefined') return [];
  migrateLegacyIfPresent('ghaule_byaj_ledger', getKey(BASE_KEYS.BYAJ_LEDGER));
  const stored = localStorage.getItem(getKey(BASE_KEYS.BYAJ_LEDGER));
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveByajLedgerEntry(
  entry: Omit<ByajLedgerEntry, 'id' | 'createdAt' | 'updatedAt'>,
  id?: string
): ByajLedgerEntry {
  const entries = getStoredByajLedger();
  const now = Date.now();
  let updatedEntry: ByajLedgerEntry;

  if (id) {
    const existing = entries.find((e) => e.id === id);
    updatedEntry = {
      ...entry,
      id,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
    const updated = entries.map((e) => (e.id === id ? updatedEntry : e));
    localStorage.setItem(getKey(BASE_KEYS.BYAJ_LEDGER), JSON.stringify(updated));
  } else {
    updatedEntry = {
      ...entry,
      id: `byaj_${now}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [updatedEntry, ...entries];
    localStorage.setItem(getKey(BASE_KEYS.BYAJ_LEDGER), JSON.stringify(updated));
  }

  const user = authManager.getCurrentUser();
  if (user && !user.isGuest) {
    syncEngine.pushItemChange(user.uid, 'savedRecords', updatedEntry.id, updatedEntry, 'set');
  }

  return updatedEntry;
}

export function deleteByajLedgerEntry(id: string): void {
  const entries = getStoredByajLedger();
  const updated = entries.filter((e) => e.id !== id);
  localStorage.setItem(getKey(BASE_KEYS.BYAJ_LEDGER), JSON.stringify(updated));

  const user = authManager.getCurrentUser();
  if (user && !user.isGuest) {
    syncEngine.pushItemChange(user.uid, 'savedRecords', id, null, 'delete');
  }
}

export function addByajPayment(
  entryId: string,
  amount: number,
  type: 'interest' | 'principal',
  note?: string,
  extra?: {
    date?: string;
    direction?: 'received' | 'made';
    method?: 'cash' | 'bank' | 'esewa' | 'khalti' | 'qr';
    billPhoto?: string;
    returnDate?: string;
    interestRate?: number;
  }
): ByajLedgerEntry | null {
  const entries = getStoredByajLedger();
  const target = entries.find((e) => e.id === entryId);
  if (!target) return null;

  const payment: ByajPayment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    date: extra?.date || formatDateToBS(new Date(), 'ne'),
    amount,
    type,
    note: note || (type === 'interest' ? 'ब्याज भुक्तानी' : 'साँवा भुक्तानी'),
    direction: extra?.direction || 'received',
    method: extra?.method || 'cash',
    billPhoto: extra?.billPhoto,
    returnDate: extra?.returnDate,
    interestRate: extra?.interestRate,
  };

  const updatedPayments = [...(target.payments || []), payment];
  const updatedEntry: ByajLedgerEntry = {
    ...target,
    payments: updatedPayments,
    updatedAt: Date.now(),
  };

  const updated = entries.map((e) => (e.id === entryId ? updatedEntry : e));
  localStorage.setItem(getKey(BASE_KEYS.BYAJ_LEDGER), JSON.stringify(updated));

  const user = authManager.getCurrentUser();
  if (user && !user.isGuest) {
    syncEngine.pushItemChange(user.uid, 'savedRecords', updatedEntry.id, updatedEntry, 'set');
  }

  return updatedEntry;
}

export function toggleByajSettled(entryId: string): ByajLedgerEntry | null {
  const entries = getStoredByajLedger();
  const target = entries.find((e) => e.id === entryId);
  if (!target) return null;

  const updatedEntry: ByajLedgerEntry = {
    ...target,
    isSettled: !target.isSettled,
    updatedAt: Date.now(),
  };

  const updated = entries.map((e) => (e.id === entryId ? updatedEntry : e));
  localStorage.setItem(getKey(BASE_KEYS.BYAJ_LEDGER), JSON.stringify(updated));

  const user = authManager.getCurrentUser();
  if (user && !user.isGuest) {
    syncEngine.pushItemChange(user.uid, 'savedRecords', updatedEntry.id, updatedEntry, 'set');
  }

  return updatedEntry;
}

export function deleteByajPayment(entryId: string, paymentId: string): ByajLedgerEntry | null {
  const entries = getStoredByajLedger();
  const target = entries.find((e) => e.id === entryId);
  if (!target) return null;

  const updatedEntry: ByajLedgerEntry = {
    ...target,
    payments: (target.payments || []).filter((p) => p.id !== paymentId),
    updatedAt: Date.now(),
  };

  const updated = entries.map((e) => (e.id === entryId ? updatedEntry : e));
  localStorage.setItem(getKey(BASE_KEYS.BYAJ_LEDGER), JSON.stringify(updated));

  const user = authManager.getCurrentUser();
  if (user && !user.isGuest) {
    syncEngine.pushItemChange(user.uid, 'savedRecords', updatedEntry.id, updatedEntry, 'set');
  }

  return updatedEntry;
}

// ----------------- BACKUP & RESTORE -----------------
export function exportAppData(): string {
  const data = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    account: authManager.getCurrentUser(),
    pinned: getStoredPinnedTools(),
    history: getStoredHistory(),
    notes: getStoredNotes(),
    customers: getStoredCustomers(),
    milkDiary: getStoredMilkDiary(),
    byajLedger: getStoredByajLedger(),
    language: getStoredLanguage(),
    currency: getStoredCurrency(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAppData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.pinned) setStoredPinnedTools(data.pinned);
    if (data.history) localStorage.setItem(getKey(BASE_KEYS.HISTORY), JSON.stringify(data.history));
    if (data.notes) localStorage.setItem(getKey(BASE_KEYS.NOTES), JSON.stringify(data.notes));
    if (data.customers) localStorage.setItem(getKey(BASE_KEYS.CUSTOMERS), JSON.stringify(data.customers));
    if (data.milkDiary) localStorage.setItem(getKey(BASE_KEYS.MILK_DIARY), JSON.stringify(data.milkDiary));
    if (data.byajLedger) localStorage.setItem(getKey(BASE_KEYS.BYAJ_LEDGER), JSON.stringify(data.byajLedger));
    if (data.language) setStoredLanguage(data.language);
    if (data.currency) setStoredCurrency(data.currency);
    return true;
  } catch {
    return false;
  }
}
