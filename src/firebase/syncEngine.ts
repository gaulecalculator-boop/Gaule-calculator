import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from './config';
import { connectionMonitor } from './connectionMonitor';
import {
  NoteItem,
  CalculationHistoryItem,
  CustomerItem,
  MilkDiaryEntry,
  ByajLedgerEntry,
  UserProfile,
  SyncStatus,
  PendingSyncItem,
} from '../types';

type SyncListener = (status: SyncStatus, lastSyncedTime?: number, pendingCount?: number) => void;
type DataUpdateCallback = (type: 'notes' | 'history' | 'customers' | 'milkDiary' | 'byaj' | 'branding' | 'settings') => void;

class SyncEngine {
  private listeners: Set<SyncListener> = new Set();
  private dataUpdateCallbacks: Set<DataUpdateCallback> = new Set();
  private currentStatus: SyncStatus = typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced';
  private lastSyncedTime: number = Date.now();
  private unsubs: Unsubscribe[] = [];
  private activeSyncUid: string | null = null;
  private syncHeartbeatTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[Multi-Device Sync] App back online: starting auto-sync and reconnecting');
        this.currentStatus = 'pending';
        this.notifyListeners();
        connectionMonitor.scheduleReconnect(0);
        this.flushPendingQueue();
        if (this.activeSyncUid) {
          this.startLiveMultiDeviceSync(this.activeSyncUid);
        }
      });

      window.addEventListener('offline', () => {
        console.log('[Multi-Device Sync] App offline: local-first cache active');
        this.currentStatus = 'offline';
        this.notifyListeners();
      });

      // Listen to connectionMonitor health changes
      connectionMonitor.subscribe((health) => {
        if (health.state === 'connected' && this.currentStatus !== 'syncing') {
          if (this.activeSyncUid && this.getPendingQueue(this.activeSyncUid).length > 0) {
            this.flushPendingQueue(this.activeSyncUid);
          } else {
            this.currentStatus = 'synced';
            this.notifyListeners();
          }
        } else if (health.state === 'offline') {
          this.currentStatus = 'offline';
          this.notifyListeners();
        } else if (health.state === 'error' && this.currentStatus !== 'syncing') {
          this.currentStatus = 'error';
          this.notifyListeners();
        }
      });

      // Cross-tab sync within same device
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.includes('notes')) {
          this.notifyDataUpdate('notes');
        } else if (e.key && e.key.includes('calc_history')) {
          this.notifyDataUpdate('history');
        } else if (e.key && e.key.includes('customers')) {
          this.notifyDataUpdate('customers');
        }
      });
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    const pendingCount = this.activeSyncUid ? this.getPendingQueue(this.activeSyncUid).length : 0;
    listener(this.currentStatus, this.lastSyncedTime, pendingCount);
    return () => this.listeners.delete(listener);
  }

  public onDataUpdate(callback: DataUpdateCallback): () => void {
    this.dataUpdateCallbacks.add(callback);
    return () => this.dataUpdateCallbacks.delete(callback);
  }

  private notifyDataUpdate(type: 'notes' | 'history' | 'customers' | 'milkDiary' | 'byaj' | 'branding' | 'settings') {
    this.dataUpdateCallbacks.forEach((cb) => {
      try {
        cb(type);
      } catch (err) {
        console.warn('Error in data update callback:', err);
      }
    });
  }

  public getStatus(): SyncStatus {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return 'offline';
    }
    return this.currentStatus;
  }

  public getLastSyncedTime(): number {
    return this.lastSyncedTime;
  }

  public getPendingCount(): number {
    if (!this.activeSyncUid) return 0;
    return this.getPendingQueue(this.activeSyncUid).length;
  }

  private notifyListeners() {
    const pendingCount = this.activeSyncUid ? this.getPendingQueue(this.activeSyncUid).length : 0;
    this.listeners.forEach((l) => l(this.currentStatus, this.lastSyncedTime, pendingCount));
  }

  private getPendingQueueKey(uid: string): string {
    return `ghaule_pending_sync_${uid}`;
  }

  public getPendingQueue(uid: string): PendingSyncItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(this.getPendingQueueKey(uid));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private setPendingQueue(uid: string, queue: PendingSyncItem[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getPendingQueueKey(uid), JSON.stringify(queue));
  }

  public enqueuePendingSync(uid: string, item: Omit<PendingSyncItem, 'timestamp'>) {
    const queue = this.getPendingQueue(uid);
    const filtered = queue.filter((q) => !(q.collection === item.collection && q.id === item.id));
    filtered.push({
      ...item,
      timestamp: Date.now(),
    });
    this.setPendingQueue(uid, filtered);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.currentStatus = 'offline';
    } else {
      this.currentStatus = 'pending';
    }
    this.notifyListeners();
  }

  /**
   * Start Real-Time Multi-Device Synchronization via Firestore Listeners
   * When Device B writes, Device A instantly receives updates through onSnapshot!
   */
  public startLiveMultiDeviceSync(uid: string) {
    if (!uid || uid.startsWith('guest_') || typeof window === 'undefined') return;

    // Avoid duplicate subscriptions
    if (this.activeSyncUid === uid && this.unsubs.length > 0) return;

    this.stopLiveMultiDeviceSync();
    this.activeSyncUid = uid;
    const prefix = `ghaule_u_${uid}_`;

    try {
      // 1. Listen to Notes: users/{uid}/notes
      const unsubNotes = onSnapshot(
        collection(db, 'users', uid, 'notes'),
        (snapshot) => {
          let hasChanges = false;
          const localRaw = localStorage.getItem(`${prefix}notes`);
          const localNotes: NoteItem[] = localRaw ? JSON.parse(localRaw) : [];
          const noteMap = new Map<string, NoteItem>();
          localNotes.forEach((n) => noteMap.set(n.id, n));

          snapshot.docChanges().forEach((change) => {
            const data = change.doc.data() as NoteItem;
            if (change.type === 'added' || change.type === 'modified') {
              const existing = noteMap.get(data.id);
              if (!existing || (data.updatedAt || 0) > (existing.updatedAt || 0)) {
                noteMap.set(data.id, data);
                hasChanges = true;
              }
            } else if (change.type === 'removed') {
              if (noteMap.has(change.doc.id)) {
                noteMap.delete(change.doc.id);
                hasChanges = true;
              }
            }
          });

          if (hasChanges) {
            localStorage.setItem(`${prefix}notes`, JSON.stringify(Array.from(noteMap.values())));
            this.lastSyncedTime = Date.now();
            this.notifyDataUpdate('notes');
            this.notifyListeners();
          }
        },
        (err) => {
          console.warn('[Multi-Device Notes Listener Error]:', err);
        }
      );
      this.unsubs.push(unsubNotes);

      // 2. Listen to History: users/{uid}/history
      const unsubHist = onSnapshot(
        collection(db, 'users', uid, 'history'),
        (snapshot) => {
          let hasChanges = false;
          const localRaw = localStorage.getItem(`${prefix}calc_history`);
          const localHist: CalculationHistoryItem[] = localRaw ? JSON.parse(localRaw) : [];
          const histMap = new Map<string, CalculationHistoryItem>();
          localHist.forEach((h) => histMap.set(h.id, h));

          snapshot.docChanges().forEach((change) => {
            const data = change.doc.data() as CalculationHistoryItem;
            if (change.type === 'added' || change.type === 'modified') {
              const existing = histMap.get(data.id);
              if (!existing || (data.timestamp || 0) > (existing.timestamp || 0)) {
                histMap.set(data.id, data);
                hasChanges = true;
              }
            } else if (change.type === 'removed') {
              if (histMap.has(change.doc.id)) {
                histMap.delete(change.doc.id);
                hasChanges = true;
              }
            }
          });

          if (hasChanges) {
            const sorted = Array.from(histMap.values()).sort((a, b) => b.timestamp - a.timestamp);
            localStorage.setItem(`${prefix}calc_history`, JSON.stringify(sorted));
            this.lastSyncedTime = Date.now();
            this.notifyDataUpdate('history');
            this.notifyListeners();
          }
        },
        (err) => {
          console.warn('[Multi-Device History Listener Error]:', err);
        }
      );
      this.unsubs.push(unsubHist);

      // 3. Listen to Saved Records: users/{uid}/savedRecords (Customers, MilkDiary, Byaj Ledger)
      const unsubRecords = onSnapshot(
        collection(db, 'users', uid, 'savedRecords'),
        (snapshot) => {
          let hasCustChanges = false;
          let hasMilkChanges = false;
          let hasByajChanges = false;

          const localCustRaw = localStorage.getItem(`${prefix}customers`);
          const localCust: CustomerItem[] = localCustRaw ? JSON.parse(localCustRaw) : [];
          const custMap = new Map<string, CustomerItem>();
          localCust.forEach((c) => custMap.set(c.id, c));

          const localMilkRaw = localStorage.getItem(`${prefix}milk_diary`);
          const localMilk: MilkDiaryEntry[] = localMilkRaw ? JSON.parse(localMilkRaw) : [];
          const milkMap = new Map<string, MilkDiaryEntry>();
          localMilk.forEach((m) => milkMap.set(m.id, m));

          const localByajRaw = localStorage.getItem(`${prefix}byaj_ledger`);
          const localByaj: ByajLedgerEntry[] = localByajRaw ? JSON.parse(localByajRaw) : [];
          const byajMap = new Map<string, ByajLedgerEntry>();
          localByaj.forEach((b) => byajMap.set(b.id, b));

          snapshot.docChanges().forEach((change) => {
            const d = change.doc.data() as any;
            const docId = d.id || change.doc.id;
            const isByaj =
              String(docId).startsWith('byaj_') ||
              ('principal' in d && 'monthlyRate' in d && 'borrowerName' in d);
            const isCust = !isByaj && (d.transactions || ('balance' in d && 'phone' in d));
            const isMilk = !isByaj && ('morningLtr' in d || 'ratePerLtr' in d);

            if (change.type === 'added' || change.type === 'modified') {
              if (isByaj) {
                const existing = byajMap.get(docId) as any;
                if (!existing || (d._syncedAt || d.updatedAt || 0) > (existing._syncedAt || existing.updatedAt || 0)) {
                  byajMap.set(docId, { ...d, id: docId } as ByajLedgerEntry);
                  hasByajChanges = true;
                }
              } else if (isCust) {
                const existing = custMap.get(docId) as any;
                if (!existing || (d._syncedAt || d.updatedAt || 0) > (existing._syncedAt || existing.updatedAt || 0)) {
                  custMap.set(docId, { ...d, id: docId } as CustomerItem);
                  hasCustChanges = true;
                }
              } else if (isMilk) {
                const existing = milkMap.get(docId) as any;
                if (!existing || (d._syncedAt || d.updatedAt || 0) > (existing._syncedAt || existing.updatedAt || 0)) {
                  milkMap.set(docId, { ...d, id: docId } as MilkDiaryEntry);
                  hasMilkChanges = true;
                }
              }
            } else if (change.type === 'removed') {
              if (byajMap.has(change.doc.id)) {
                byajMap.delete(change.doc.id);
                hasByajChanges = true;
              }
              if (custMap.has(change.doc.id)) {
                custMap.delete(change.doc.id);
                hasCustChanges = true;
              }
              if (milkMap.has(change.doc.id)) {
                milkMap.delete(change.doc.id);
                hasMilkChanges = true;
              }
            }
          });

          if (hasCustChanges) {
            localStorage.setItem(`${prefix}customers`, JSON.stringify(Array.from(custMap.values())));
            this.notifyDataUpdate('customers');
          }
          if (hasMilkChanges) {
            localStorage.setItem(`${prefix}milk_diary`, JSON.stringify(Array.from(milkMap.values())));
            this.notifyDataUpdate('milkDiary');
          }
          if (hasByajChanges) {
            const sortedByaj = Array.from(byajMap.values()).sort(
              (a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
            );
            localStorage.setItem(`${prefix}byaj_ledger`, JSON.stringify(sortedByaj));
            this.notifyDataUpdate('byaj');
          }
        },
        (err) => {
          console.warn('[Multi-Device Records Listener Error]:', err);
        }
      );
      this.unsubs.push(unsubRecords);

      // 4. Listen to Dairy / Shop Branding Profile: users/{uid}/settings/branding
      const unsubBranding = onSnapshot(
        doc(db, 'users', uid, 'settings', 'branding'),
        (snap) => {
          if (!snap.exists()) return;
          const remote = snap.data() as any;
          if (!remote?.dairyName) return;

          const brandingKey = `${prefix}dairy_branding_profile_v1`;
          const localRaw = localStorage.getItem(brandingKey);
          const localParsed = localRaw ? JSON.parse(localRaw) : null;
          const localUpdated = Number(localParsed?.updatedAt || 0);
          const remoteUpdated = Number(remote.updatedAt || 0);

          if (!localParsed || remoteUpdated > localUpdated) {
            localStorage.setItem(brandingKey, JSON.stringify(remote));
            localStorage.setItem('ghaule_dairy_branding_profile_v1', JSON.stringify(remote));
            window.dispatchEvent(new CustomEvent('ghaule_branding_cloud_applied', { detail: remote }));
            this.notifyDataUpdate('branding');
          }
        },
        (err) => {
          console.warn('[Multi-Device Branding Listener Error]:', err);
        }
      );
      this.unsubs.push(unsubBranding);

      // Background heartbeat for queue flushing every 25s
      this.syncHeartbeatTimer = setInterval(() => {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          this.flushPendingQueue(uid);
        }
      }, 25000);

      this.currentStatus = 'synced';
      this.notifyListeners();
    } catch (err) {
      console.warn('Failed to attach live Firestore listeners:', err);
    }
  }

  /**
   * Stop multi-device live sync listeners (on logout or switch)
   */
  public stopLiveMultiDeviceSync() {
    this.unsubs.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {
        // ignore
      }
    });
    this.unsubs = [];
    if (this.syncHeartbeatTimer) {
      clearInterval(this.syncHeartbeatTimer);
      this.syncHeartbeatTimer = null;
    }
    this.activeSyncUid = null;
  }

  public async syncUserProfile(user: UserProfile): Promise<void> {
    if (user.isGuest || !user.uid) return;
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return;
      }
      const userRef = doc(db, 'users', user.uid);
      await setDoc(
        userRef,
        {
          uid: user.uid,
          name: user.name || 'Anonymous User',
          email: user.email || '',
          photoURL: user.photoURL || '',
          provider: user.provider || 'google.com',
          createdAt: user.createdAt || new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          accountStatus: 'active',
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Failed to sync user profile document to Firestore:', err);
    }
  }

  public async pushItemChange(
    uid: string,
    collectionName: 'notes' | 'history' | 'savedRecords' | 'settings',
    itemId: string,
    data: any,
    action: 'set' | 'delete' = 'set'
  ): Promise<void> {
    if (!uid || uid.startsWith('guest_')) return;

    // 1. Idempotency Check: if identical version was already pushed, skip redundant upload
    const itemEpoch = data?._updatedAt || data?.updatedAt || data?.timestamp || 0;
    const cacheKey = `ghaule_synced_v_${uid}_${collectionName}_${itemId}`;
    if (typeof window !== 'undefined' && action === 'set' && itemEpoch > 0) {
      const lastSynced = localStorage.getItem(cacheKey);
      if (lastSynced && Number(lastSynced) === itemEpoch) {
        return; // Idempotent skip: already synced to cloud
      }
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.enqueuePendingSync(uid, {
        id: itemId,
        action,
        collection: collectionName as any,
        data,
      });
      return;
    }

    try {
      this.currentStatus = 'syncing';
      this.notifyListeners();

      const itemRef = doc(db, 'users', uid, collectionName, itemId);
      if (action === 'delete') {
        await deleteDoc(itemRef);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(cacheKey);
        }
      } else {
        await setDoc(itemRef, { ...data, _syncedAt: Date.now() }, { merge: true });
        if (typeof window !== 'undefined' && itemEpoch > 0) {
          localStorage.setItem(cacheKey, String(itemEpoch));
        }
      }

      this.currentStatus = 'synced';
      this.lastSyncedTime = Date.now();
      connectionMonitor.recordSuccess();
      this.notifyListeners();
    } catch (err: any) {
      console.warn(`Firestore write error for ${collectionName}/${itemId}:`, err);
      connectionMonitor.recordFailure(err?.message || 'Firestore write error');
      this.enqueuePendingSync(uid, {
        id: itemId,
        action,
        collection: collectionName as any,
        data,
      });
    }
  }

  public async flushPendingQueue(targetUid?: string): Promise<void> {
    const currentUid = targetUid || this.activeSyncUid || auth.currentUser?.uid;
    if (!currentUid || currentUid.startsWith('guest_')) return;

    const queue = this.getPendingQueue(currentUid);
    if (queue.length === 0) {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        this.currentStatus = 'synced';
        this.notifyListeners();
      }
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.currentStatus = 'offline';
      this.notifyListeners();
      return;
    }

    this.currentStatus = 'syncing';
    this.notifyListeners();

    const remaining: PendingSyncItem[] = [];

    for (const item of queue) {
      try {
        const itemRef = doc(db, 'users', currentUid, item.collection, item.id);
        if (item.action === 'delete') {
          await deleteDoc(itemRef);
        } else if (item.data) {
          await setDoc(itemRef, { ...item.data, _syncedAt: Date.now() }, { merge: true });
          const itemEpoch = item.data?._updatedAt || item.data?.updatedAt || item.data?.timestamp || 0;
          if (typeof window !== 'undefined' && itemEpoch > 0) {
            localStorage.setItem(`ghaule_synced_v_${currentUid}_${item.collection}_${item.id}`, String(itemEpoch));
          }
        }
        connectionMonitor.recordSuccess();
      } catch (err) {
        console.warn('Retrying pending item later:', item.id, err);
        remaining.push(item);
      }
    }

    this.setPendingQueue(currentUid, remaining);
    if (remaining.length === 0) {
      this.currentStatus = 'synced';
      this.lastSyncedTime = Date.now();
    } else {
      this.currentStatus = 'pending';
    }
    this.notifyListeners();
  }

  public async pullAllUserDataFromCloud(uid: string): Promise<{
    notes: NoteItem[];
    history: CalculationHistoryItem[];
    customers: CustomerItem[];
    milkDiary: MilkDiaryEntry[];
    byajLedger: ByajLedgerEntry[];
    branding?: Record<string, any>;
    settings?: Record<string, any>;
  }> {
    const result = {
      notes: [] as NoteItem[],
      history: [] as CalculationHistoryItem[],
      customers: [] as CustomerItem[],
      milkDiary: [] as MilkDiaryEntry[],
      byajLedger: [] as ByajLedgerEntry[],
      branding: undefined as Record<string, any> | undefined,
      settings: {} as Record<string, any>,
    };

    if (!uid || uid.startsWith('guest_')) return result;

    try {
      this.currentStatus = 'syncing';
      this.notifyListeners();

      const notesSnap = await getDocs(collection(db, 'users', uid, 'notes'));
      notesSnap.forEach((docSnap) => {
        result.notes.push(docSnap.data() as NoteItem);
      });

      const histSnap = await getDocs(collection(db, 'users', uid, 'history'));
      histSnap.forEach((docSnap) => {
        result.history.push(docSnap.data() as CalculationHistoryItem);
      });

      const savedSnap = await getDocs(collection(db, 'users', uid, 'savedRecords'));
      savedSnap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        const docId = d.id || docSnap.id;
        if (
          String(docId).startsWith('byaj_') ||
          ('principal' in d && 'monthlyRate' in d && 'borrowerName' in d)
        ) {
          result.byajLedger.push({ ...d, id: docId } as ByajLedgerEntry);
        } else if (d.transactions || ('balance' in d && 'phone' in d)) {
          result.customers.push({ ...d, id: docId } as CustomerItem);
        } else if ('morningLtr' in d || 'ratePerLtr' in d) {
          result.milkDiary.push({ ...d, id: docId } as MilkDiaryEntry);
        }
      });

      const settingsSnap = await getDoc(doc(db, 'users', uid, 'settings', 'prefs'));
      if (settingsSnap.exists()) {
        result.settings = settingsSnap.data();
      }

      const brandingSnap = await getDoc(doc(db, 'users', uid, 'settings', 'branding'));
      if (brandingSnap.exists()) {
        result.branding = brandingSnap.data();
      }

      this.currentStatus = 'synced';
      this.lastSyncedTime = Date.now();
      connectionMonitor.recordSuccess();
      this.notifyListeners();
    } catch (err: any) {
      console.warn('Failed to pull user cloud data (offline or permission):', err);
      connectionMonitor.recordFailure(err?.message || 'Failed to pull cloud data');
      this.currentStatus = typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error';
      this.notifyListeners();
    }

    return result;
  }
}

export const syncEngine = new SyncEngine();
