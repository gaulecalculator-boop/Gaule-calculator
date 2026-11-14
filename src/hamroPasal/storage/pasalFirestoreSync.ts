/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cloud Firestore Synchronization for Hamro Pasal
 * Handles live multi-device syncing, offline queue, and shop isolation
 */

import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { ShopProfile, CustomerRecord, CustomerOrder, CustomerPaymentRecord } from '../types';
import { pasalStorage } from './pasalStorage';

class PasalFirestoreSyncEngine {
  private activeUnsubscribers: (() => void)[] = [];
  private isSyncing = false;

  /**
   * Push newly created shop to Firestore
   */
  public async syncShopToCloud(shop: ShopProfile): Promise<boolean> {
    if (!auth.currentUser || (globalThis as any).__GHAULE_OFFLINE_TEST__) {
      return false;
    }
    try {
      const shopRef = doc(db, 'shops', shop.id);
      await setDoc(shopRef, {
        ...shop,
        ownerUid: auth.currentUser.uid,
        updatedAt: Date.now(),
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Hamro Pasal Cloud Sync] Failed to sync shop:', err);
      return false;
    }
  }

  /**
   * Push customer update to Firestore
   */
  public async syncCustomerToCloud(customer: CustomerRecord): Promise<boolean> {
    if (!auth.currentUser || (globalThis as any).__GHAULE_OFFLINE_TEST__) {
      return false;
    }
    try {
      const custRef = doc(db, 'shops', customer.shopId, 'customers', customer.id);
      await setDoc(custRef, {
        ...customer,
        updatedAt: Date.now(),
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Hamro Pasal Cloud Sync] Failed to sync customer:', err);
      return false;
    }
  }

  /**
   * Push order to Firestore
   */
  public async syncOrderToCloud(order: CustomerOrder): Promise<boolean> {
    if (!auth.currentUser || (globalThis as any).__GHAULE_OFFLINE_TEST__) {
      return false;
    }
    try {
      const orderRef = doc(db, 'shops', order.shopId, 'orders', order.id);
      await setDoc(orderRef, {
        ...order,
        updatedAt: Date.now(),
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Hamro Pasal Cloud Sync] Failed to sync order:', err);
      return false;
    }
  }

  /**
   * Push payment to Firestore
   */
  public async syncPaymentToCloud(payment: CustomerPaymentRecord): Promise<boolean> {
    if (!auth.currentUser || (globalThis as any).__GHAULE_OFFLINE_TEST__) {
      return false;
    }
    try {
      const payRef = doc(db, 'shops', payment.shopId, 'payments', payment.id);
      await setDoc(payRef, payment, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Hamro Pasal Cloud Sync] Failed to sync payment:', err);
      return false;
    }
  }

  /**
   * Start live multi-device listener for active shop
   */
  public startLiveShopSync(shopId: string, onUpdate?: () => void) {
    this.stopLiveShopSync();
    if (!auth.currentUser || (globalThis as any).__GHAULE_OFFLINE_TEST__) {
      return;
    }

    try {
      // Listen to customers subcollection
      const customersCol = collection(db, 'shops', shopId, 'customers');
      const unsubCust = onSnapshot(customersCol, (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data() as CustomerRecord;
            pasalStorage.saveCustomerRecord(data);
          }
        });
        if (onUpdate) onUpdate();
      }, (err) => {
        console.warn('[Hamro Pasal Live Listener] Customers snapshot warning:', err);
      });
      this.activeUnsubscribers.push(unsubCust);
    } catch (err) {
      console.warn('[Hamro Pasal Live Listener] Setup failed:', err);
    }
  }

  public stopLiveShopSync() {
    this.activeUnsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    this.activeUnsubscribers = [];
  }
}

export const pasalFirestoreSync = new PasalFirestoreSyncEngine();
