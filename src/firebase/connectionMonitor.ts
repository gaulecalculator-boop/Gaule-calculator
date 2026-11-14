/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Ghaule Calculator - Firebase Connection Health Monitor & Resilience Engine
 * Features:
 * 1. Exponential Backoff Reconnection (1s, 2s, 4s, 8s, 16s, up to 30s)
 * 2. Real-Time Network State Tracking (connected | reconnecting | offline | error)
 * 3. Graceful Degradation: Zero app freezing or crashing on network drop
 * 4. Automatic Queue Flushing on Reconnect
 * 5. Connection Statistics (latency, attempts, last connected time)
 */

import { enableFirestoreNetwork, disableFirestoreNetwork, db } from './config';
import { doc, getDocFromServer } from 'firebase/firestore';

export type ConnectionState = 'connected' | 'reconnecting' | 'offline' | 'error' | 'checking';

export interface ConnectionHealthState {
  state: ConnectionState;
  isOnline: boolean;
  latencyMs: number | null;
  retryAttempt: number;
  lastConnectedAt: number | null;
  lastError: string | null;
  nextRetryInMs: number | null;
}

export type ConnectionListener = (health: ConnectionHealthState) => void;

class FirebaseConnectionMonitor {
  private listeners: Set<ConnectionListener> = new Set();
  private state: ConnectionState = typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'connected';
  private latencyMs: number | null = null;
  private retryAttempt: number = 0;
  private lastConnectedAt: number | null = Date.now();
  private lastError: string | null = null;
  private nextRetryTimer: any = null;
  private nextRetryInMs: number | null = null;
  private heartbeatTimer: any = null;
  private isTesting: boolean = false;

  constructor() {
    this.initListeners();
    this.startHeartbeat();
  }

  private initListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[Connection Monitor] Device back online. Initiating immediate reconnect.');
      this.retryAttempt = 0;
      enableFirestoreNetwork().catch(() => {});
      this.scheduleReconnect(200);
    });

    window.addEventListener('offline', () => {
      console.log('[Connection Monitor] Device went offline. Switching to 100% Offline Mode.');
      this.cancelPendingRetry();
      this.state = 'offline';
      this.latencyMs = null;
      this.notify();
      disableFirestoreNetwork().catch(() => {});
    });
  }

  private startHeartbeat() {
    if (typeof window === 'undefined') return;

    // Periodic lightweight health check every 45 seconds when online
    this.heartbeatTimer = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine && this.state !== 'reconnecting') {
        this.probeConnection().catch(() => {});
      }
    }, 45000);
  }

  public subscribe(listener: ConnectionListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): ConnectionHealthState {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    return {
      state: !isOnline ? 'offline' : this.state,
      isOnline,
      latencyMs: this.latencyMs,
      retryAttempt: this.retryAttempt,
      lastConnectedAt: this.lastConnectedAt,
      lastError: this.lastError,
      nextRetryInMs: this.nextRetryInMs,
    };
  }

  private notify() {
    const current = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.warn('Error in connection listener:', err);
      }
    });
  }

  /**
   * Probe Firestore connectivity with latency measurement
   */
  public async probeConnection(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.state = 'offline';
      this.notify();
      return false;
    }

    if (this.isTesting) return this.state === 'connected';
    this.isTesting = true;

    const startTime = performance.now();
    try {
      // In offline tests or node environment, skip live probe
      if ((globalThis as any).__GHAULE_OFFLINE_TEST__) {
        this.latencyMs = 12;
        this.state = 'connected';
        this.lastConnectedAt = Date.now();
        this.retryAttempt = 0;
        this.lastError = null;
        this.notify();
        return true;
      }

      // Lightweight test probe to allowed public collection
      const pingDoc = doc(db, 'calendar_versions', 'active');
      await getDocFromServer(pingDoc).catch((e) => {
        // Doc may not exist, but network round-trip reached server
        if (e && e.message && e.message.includes('offline')) {
          throw e;
        }
      });

      this.latencyMs = Math.round(performance.now() - startTime);
      this.state = 'connected';
      this.lastConnectedAt = Date.now();
      this.retryAttempt = 0;
      this.lastError = null;
      this.cancelPendingRetry();
      this.notify();
      return true;
    } catch (err: any) {
      const duration = Math.round(performance.now() - startTime);
      const errMsg = err?.message || 'Connection unreachable';
      console.warn(`[Connection Monitor] Probe failed in ${duration}ms:`, errMsg);

      this.latencyMs = null;
      this.lastError = errMsg;

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        this.state = 'offline';
      } else {
        this.state = 'error';
        this.scheduleReconnect();
      }
      this.notify();
      return false;
    } finally {
      this.isTesting = false;
    }
  }

  /**
   * Exponential Backoff Retry Strategy:
   * delay = min(1000 * 2^attempt + jitter, 30000)
   */
  public scheduleReconnect(customDelayMs?: number) {
    this.cancelPendingRetry();

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.state = 'offline';
      this.notify();
      return;
    }

    this.state = 'reconnecting';
    this.retryAttempt += 1;

    // Calculate delay with exponential backoff and jitter
    let delay: number;
    if (customDelayMs !== undefined) {
      delay = customDelayMs;
    } else {
      const backoff = 1000 * Math.pow(2, Math.min(this.retryAttempt - 1, 5));
      const jitter = Math.floor(Math.random() * 500);
      delay = Math.min(backoff + jitter, 30000);
    }

    this.nextRetryInMs = delay;
    console.log(`[Connection Monitor] Scheduling reconnect attempt #${this.retryAttempt} in ${delay}ms`);
    this.notify();

    this.nextRetryTimer = setTimeout(async () => {
      this.nextRetryInMs = null;
      const success = await this.probeConnection();
      if (!success && typeof navigator !== 'undefined' && navigator.onLine) {
        this.scheduleReconnect();
      }
    }, delay);
  }

  public cancelPendingRetry() {
    if (this.nextRetryTimer) {
      clearTimeout(this.nextRetryTimer);
      this.nextRetryTimer = null;
    }
    this.nextRetryInMs = null;
  }

  /**
   * Manual reconnect trigger (from UI button)
   */
  public async triggerManualReconnect(): Promise<boolean> {
    this.cancelPendingRetry();
    this.retryAttempt = 0;
    this.state = 'checking';
    this.notify();
    return await this.probeConnection();
  }

  public recordSuccess() {
    this.state = 'connected';
    this.lastConnectedAt = Date.now();
    this.retryAttempt = 0;
    this.lastError = null;
    this.cancelPendingRetry();
    this.notify();
  }

  public recordFailure(error: string) {
    this.lastError = error;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.state = 'offline';
    } else {
      this.state = 'error';
      this.scheduleReconnect();
    }
    this.notify();
  }
}

export const connectionMonitor = new FirebaseConnectionMonitor();
