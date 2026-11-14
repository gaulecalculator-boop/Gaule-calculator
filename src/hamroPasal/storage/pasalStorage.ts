/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HAMRO PASAL — Local Storage & Ledger Engine
 * Offline-first, atomic balance calculation, permanent customer Khata
 */

import {
  ShopProfile,
  MenuItemOrProduct,
  CustomerOrder,
  CustomerRecord,
  CustomerPaymentRecord,
  ShopExpense,
  BusinessType,
} from '../types';

const SHOPS_KEY = 'hamro_pasal_shops';
const ACTIVE_SHOP_ID_KEY = 'hamro_pasal_active_shop_id';
const PRODUCTS_KEY = 'hamro_pasal_products_';
const ORDERS_KEY = 'hamro_pasal_orders_';
const CUSTOMERS_KEY = 'hamro_pasal_customers_';
const PAYMENTS_KEY = 'hamro_pasal_payments_';
const EXPENSES_KEY = 'hamro_pasal_expenses_';
const PASAL_DEMO_PURGED_KEY = 'hamro_pasal_demo_purged_v1';
const SEEDED_SAMPLE_ITEM_IDS = new Set([
  'food_1', 'food_2', 'food_3', 'food_4', 'food_5', 'food_6', 'food_7', 'food_8', 'food_9',
  'kirana_1', 'kirana_2', 'kirana_3', 'kirana_4', 'kirana_5',
  'cloth_1', 'cloth_2',
  'item_1', 'item_2',
]);

const memoryStore = new Map<string, string>();

function getStorage(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {}
  return memoryStore.get(key) || null;
}

function setStorage(key: string, val: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
    }
  } catch {}
  memoryStore.set(key, val);
}

function removeStorage(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {}
  memoryStore.delete(key);
}

type PasalChangeListener = () => void;

class PasalStorageEngine {
  private listeners: Set<PasalChangeListener> = new Set();

  public subscribe(listener: PasalChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // -------------------------------------------------------------
  // SHOP MANAGEMENT
  // -------------------------------------------------------------
  public getShops(): ShopProfile[] {
    try {
      const data = getStorage(SHOPS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public getActiveShopId(): string | null {
    return getStorage(ACTIVE_SHOP_ID_KEY);
  }

  public setActiveShopId(shopId: string) {
    setStorage(ACTIVE_SHOP_ID_KEY, shopId);
    this.notify();
  }

  public getActiveShop(): ShopProfile | null {
    const shops = this.getShops();
    const activeId = this.getActiveShopId();
    if (!activeId) return shops[0] || null;
    return shops.find((s) => s.id === activeId) || shops[0] || null;
  }

  public saveShop(shop: ShopProfile, _isNew: boolean = false): ShopProfile {
    const shops = this.getShops();
    const idx = shops.findIndex((s) => s.id === shop.id);
    let updated: ShopProfile[];
    if (idx >= 0) {
      updated = [...shops];
      updated[idx] = { ...shop, updatedAt: Date.now() };
    } else {
      updated = [...shops, { ...shop, createdAt: Date.now(), updatedAt: Date.now() }];
    }
    setStorage(SHOPS_KEY, JSON.stringify(updated));
    this.setActiveShopId(shop.id);

    this.notify();
    return shop;
  }

  private purgeLegacySampleProductsIfNeeded(shopId: string): void {
    try {
      const flagKey = `${PASAL_DEMO_PURGED_KEY}_${shopId}`;
      if (getStorage(flagKey) === '1') return;
      const data = getStorage(PRODUCTS_KEY + shopId);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((p: any) => !SEEDED_SAMPLE_ITEM_IDS.has(p?.id));
          if (filtered.length !== parsed.length) {
            setStorage(PRODUCTS_KEY + shopId, JSON.stringify(filtered));
          }
        }
      }
      setStorage(flagKey, '1');
    } catch {}
  }

  // -------------------------------------------------------------
  // PRODUCTS & MENU ITEMS
  // -------------------------------------------------------------
  public getProducts(shopId?: string): MenuItemOrProduct[] {
    const sId = shopId || this.getActiveShopId();
    if (!sId) return [];
    this.purgeLegacySampleProductsIfNeeded(sId);
    try {
      const data = getStorage(PRODUCTS_KEY + sId);
      if (!data) {
        return [];
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public saveProduct(product: MenuItemOrProduct): MenuItemOrProduct {
    const products = this.getProducts(product.shopId);
    const idx = products.findIndex((p) => p.id === product.id);
    let updated: MenuItemOrProduct[];
    if (idx >= 0) {
      updated = [...products];
      updated[idx] = { ...product, updatedAt: Date.now() };
    } else {
      updated = [{ ...product, createdAt: Date.now(), updatedAt: Date.now() }, ...products];
    }
    setStorage(PRODUCTS_KEY + product.shopId, JSON.stringify(updated));
    this.notify();
    return product;
  }

  public deleteProduct(shopId: string, productId: string) {
    const products = this.getProducts(shopId);
    const updated = products.filter((p) => p.id !== productId);
    setStorage(PRODUCTS_KEY + shopId, JSON.stringify(updated));
    this.notify();
  }

  // -------------------------------------------------------------
  // CUSTOMER DATABASE & PERMANENT KHATA
  // -------------------------------------------------------------
  public getCustomers(shopId?: string): CustomerRecord[] {
    const sId = shopId || this.getActiveShopId();
    if (!sId) return [];
    try {
      const data = getStorage(CUSTOMERS_KEY + sId);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public searchCustomers(query: string, shopId?: string): CustomerRecord[] {
    const customers = this.getCustomers(shopId);
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.mobile && c.mobile.includes(q))
    );
  }

  public getCustomerById(customerId: string, shopId?: string): CustomerRecord | null {
    const customers = this.getCustomers(shopId);
    return customers.find((c) => c.id === customerId) || null;
  }

  public findOrCreateCustomer(name: string, mobile?: string, shopId?: string): CustomerRecord {
    const sId = shopId || this.getActiveShopId() || 'default_shop';
    const customers = this.getCustomers(sId);
    const trimmedName = name.trim();
    const trimmedMobile = (mobile || '').trim();

    // Find existing customer by exact mobile or name
    let found = customers.find((c) => {
      if (trimmedMobile && c.mobile && c.mobile === trimmedMobile) return true;
      return c.name.toLowerCase() === trimmedName.toLowerCase();
    });

    if (found) {
      if (trimmedMobile && !found.mobile) {
        found.mobile = trimmedMobile;
        this.saveCustomerRecord(found);
      }
      return found;
    }

    // Create new customer
    const newCustomer: CustomerRecord = {
      id: 'cust_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      shopId: sId,
      name: trimmedName,
      mobile: trimmedMobile,
      totalLifetimePurchases: 0,
      totalAmountPaid: 0,
      outstandingBalance: 0,
      lastVisitTimestamp: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newCustomer, ...customers];
    setStorage(CUSTOMERS_KEY + sId, JSON.stringify(updated));
    this.notify();
    return newCustomer;
  }

  public saveCustomerRecord(customer: CustomerRecord): CustomerRecord {
    const customers = this.getCustomers(customer.shopId);
    const idx = customers.findIndex((c) => c.id === customer.id);
    let updated: CustomerRecord[];
    if (idx >= 0) {
      updated = [...customers];
      updated[idx] = { ...customer, updatedAt: Date.now() };
    } else {
      updated = [customer, ...customers];
    }
    setStorage(CUSTOMERS_KEY + customer.shopId, JSON.stringify(updated));
    this.notify();
    return customer;
  }

  public deleteCustomer(shopId: string, customerId: string) {
    const customers = this.getCustomers(shopId);
    const updatedCustomers = customers.filter((c) => c.id !== customerId);
    setStorage(CUSTOMERS_KEY + shopId, JSON.stringify(updatedCustomers));

    const orders = this.getOrders(shopId);
    const updatedOrders = orders.filter((o) => o.customerId !== customerId);
    setStorage(ORDERS_KEY + shopId, JSON.stringify(updatedOrders));

    const payments = this.getPayments(shopId);
    const updatedPayments = payments.filter((p) => p.customerId !== customerId);
    setStorage(PAYMENTS_KEY + shopId, JSON.stringify(updatedPayments));

    this.notify();
  }

  // -------------------------------------------------------------
  // ORDERS & ATOMIC LEDGER TRANSACTIONS
  // -------------------------------------------------------------
  public getOrders(shopId?: string): CustomerOrder[] {
    const sId = shopId || this.getActiveShopId();
    if (!sId) return [];
    try {
      const data = getStorage(ORDERS_KEY + sId);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public getCustomerOrders(customerId: string, shopId?: string): CustomerOrder[] {
    const orders = this.getOrders(shopId);
    return orders.filter((o) => o.customerId === customerId);
  }

  public getCustomerPayments(customerId: string, shopId?: string): CustomerPaymentRecord[] {
    const payments = this.getPayments(shopId);
    return payments.filter((p) => p.customerId === customerId);
  }

  public getPayments(shopId?: string): CustomerPaymentRecord[] {
    const sId = shopId || this.getActiveShopId();
    if (!sId) return [];
    try {
      const data = getStorage(PAYMENTS_KEY + sId);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Creates a new order, saves line items, deducts stock if applicable,
   * creates payment record if amountReceived > 0, and atomically updates customer Khata balance!
   */
  public createOrder(
    orderData: Omit<CustomerOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>
  ): CustomerOrder {
    const sId = orderData.shopId;
    const existingOrders = this.getOrders(sId);
    const nextOrderNumber = existingOrders.length > 0
      ? Math.max(...existingOrders.map((o) => o.orderNumber || 0)) + 1
      : 101;

    const newOrder: CustomerOrder = {
      ...orderData,
      id: 'ord_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      orderNumber: nextOrderNumber,
      createdAt: (orderData as any).createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    // 1. Save order to shop's order journal
    const updatedOrders = [newOrder, ...existingOrders];
    setStorage(ORDERS_KEY + sId, JSON.stringify(updatedOrders));

    // 2. If customer is linked, update their permanent Khata
    if (newOrder.customerId) {
      const customer = this.getCustomerById(newOrder.customerId, sId);
      if (customer) {
        // Record payment if customer paid anything upon order creation
        if (newOrder.amountReceived > 0) {
          const paymentRecord: CustomerPaymentRecord = {
            id: 'pay_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            shopId: sId,
            customerId: customer.id,
            customerName: customer.name,
            orderId: newOrder.id,
            amount: newOrder.amountReceived,
            paymentMethod: newOrder.paymentMethod,
            notes: `Payment for Order #${newOrder.orderNumber}`,
            remainingBalanceAfterPayment: 0, // Recalculated below
            timestamp: Date.now(),
          };
          const existingPayments = this.getPayments(sId);
          setStorage(PAYMENTS_KEY + sId, JSON.stringify([paymentRecord, ...existingPayments]));
        }

        // Recalculate customer lifetime purchases and outstanding balance
        this.recalculateCustomerBalance(customer.id, sId);
      }
    }

    // 3. Deduct stock for inventory products
    if (orderData.items && orderData.items.length > 0) {
      const products = this.getProducts(sId);
      let changed = false;
      const updatedProducts = products.map((prod) => {
        const matchingItem = orderData.items.find((i) => i.productId === prod.id);
        if (matchingItem && prod.stockQty > 0) {
          changed = true;
          return {
            ...prod,
            stockQty: Math.max(0, prod.stockQty - matchingItem.quantity),
            updatedAt: Date.now(),
          };
        }
        return prod;
      });
      if (changed) {
        setStorage(PRODUCTS_KEY + sId, JSON.stringify(updatedProducts));
      }
    }

    this.notify();
    return newOrder;
  }

  /**
   * Collects payment against customer's outstanding balance
   */
  public collectCustomerPayment(
    customerId: string,
    amount: number,
    paymentMethod: CustomerOrder['paymentMethod'],
    notes?: string,
    shopId?: string,
    customTimestamp?: number
  ): CustomerPaymentRecord {
    const sId = shopId || this.getActiveShopId() || 'default_shop';
    const customer = this.getCustomerById(customerId, sId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const currentBalance = customer.outstandingBalance;
    const newRemainingBalance = Math.max(0, currentBalance - amount);

    const paymentRecord: CustomerPaymentRecord = {
      id: 'pay_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      shopId: sId,
      customerId: customer.id,
      customerName: customer.name,
      amount: amount,
      paymentMethod: paymentMethod,
      notes: notes || 'Debt collection payment',
      remainingBalanceAfterPayment: newRemainingBalance,
      timestamp: customTimestamp || Date.now(),
    };

    const existingPayments = this.getPayments(sId);
    setStorage(PAYMENTS_KEY + sId, JSON.stringify([paymentRecord, ...existingPayments]));

    // Recalculate customer's balance
    this.recalculateCustomerBalance(customerId, sId);

    this.notify();
    return paymentRecord;
  }

  /**
   * Safe Audit Adjustment: logs corrections without silently tampering with old records
   */
  public recordAuditAdjustment(
    customerId: string,
    amount: number,
    type: 'adjustment_credit' | 'adjustment_debit',
    reason: string,
    shopId?: string
  ): CustomerPaymentRecord {
    const sId = shopId || this.getActiveShopId() || 'default_shop';
    const customer = this.getCustomerById(customerId, sId);
    if (!customer) {
      throw new Error('Customer not found for adjustment');
    }

    const adjustmentRecord: CustomerPaymentRecord = {
      id: 'adj_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      shopId: sId,
      customerId: customer.id,
      customerName: customer.name,
      amount: Math.abs(amount),
      paymentMethod: 'cash',
      notes: `[Audit Adjustment] ${reason}`,
      remainingBalanceAfterPayment: 0,
      entryType: type,
      timestamp: Date.now(),
    };

    const existingPayments = this.getPayments(sId);
    setStorage(PAYMENTS_KEY + sId, JSON.stringify([adjustmentRecord, ...existingPayments]));

    this.recalculateCustomerBalance(customerId, sId);
    this.notify();
    return adjustmentRecord;
  }

  /**
   * Recalculates customer's exact lifetime purchases, payments, and outstanding balance
   * Prevents drift or overwrite errors!
   */
  public recalculateCustomerBalance(customerId: string, shopId: string): CustomerRecord | null {
    const customer = this.getCustomerById(customerId, shopId);
    if (!customer) return null;

    const orders = this.getCustomerOrders(customerId, shopId);
    const payments = this.getCustomerPayments(customerId, shopId);

    // Total lifetime billed: orders + debit adjustments
    let totalLifetimePurchases = orders.reduce((sum, o) => sum + (o.totalBill || 0), 0);

    // Total lifetime payments received: regular payments + credit adjustments
    let totalAmountPaid = 0;

    payments.forEach((p) => {
      if (p.entryType === 'adjustment_debit') {
        totalLifetimePurchases += (p.amount || 0);
      } else {
        totalAmountPaid += (p.amount || 0);
      }
    });

    // Outstanding balance = Total Billed - Total Paid
    const outstandingBalance = Math.max(0, totalLifetimePurchases - totalAmountPaid);

    const updatedCustomer: CustomerRecord = {
      ...customer,
      totalLifetimePurchases,
      totalAmountPaid,
      outstandingBalance,
      lastVisitTimestamp: orders.length > 0 ? orders[0].createdAt : customer.lastVisitTimestamp,
      updatedAt: Date.now(),
    };

    this.saveCustomerRecord(updatedCustomer);
    return updatedCustomer;
  }

  // -------------------------------------------------------------
  // EXPENSES
  // -------------------------------------------------------------
  public getExpenses(shopId?: string): ShopExpense[] {
    const sId = shopId || this.getActiveShopId();
    if (!sId) return [];
    try {
      const data = getStorage(EXPENSES_KEY + sId);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public createExpense(expense: Omit<ShopExpense, 'id' | 'timestamp'>): ShopExpense {
    const sId = expense.shopId;
    const existing = this.getExpenses(sId);
    const newExpense: ShopExpense = {
      ...expense,
      id: 'exp_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: Date.now(),
    };
    const updated = [newExpense, ...existing];
    setStorage(EXPENSES_KEY + sId, JSON.stringify(updated));
    this.notify();
    return newExpense;
  }

  public deleteExpense(shopId: string, expenseId: string) {
    const existing = this.getExpenses(shopId);
    const updated = existing.filter((e) => e.id !== expenseId);
    setStorage(EXPENSES_KEY + shopId, JSON.stringify(updated));
    this.notify();
  }

  // -------------------------------------------------------------
  // FINANCIAL ANALYTICS & DASHBOARD METRICS
  // -------------------------------------------------------------
  public getFinancialSummary(shopId?: string) {
    const sId = shopId || this.getActiveShopId();
    if (!sId) {
      return {
        todaySales: 0,
        todayCash: 0,
        todayCredit: 0,
        todayOrdersCount: 0,
        totalOutstanding: 0,
        totalCustomersCount: 0,
        monthlySales: 0,
        totalExpenses: 0,
        netProfit: 0,
      };
    }

    const orders = this.getOrders(sId);
    const payments = this.getPayments(sId);
    const customers = this.getCustomers(sId);
    const expenses = this.getExpenses(sId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    // Today's orders
    const todayOrders = orders.filter((o) => o.createdAt >= startOfToday && o.status !== 'cancelled');
    const todaySales = todayOrders.reduce((sum, o) => sum + o.totalBill, 0);
    const todayCash = todayOrders.reduce((sum, o) => sum + o.amountReceived, 0);
    const todayCredit = Math.max(0, todaySales - todayCash);

    // Monthly orders
    const monthlyOrders = orders.filter((o) => o.createdAt >= startOfMonth && o.status !== 'cancelled');
    const monthlySales = monthlyOrders.reduce((sum, o) => sum + o.totalBill, 0);

    // Total Outstanding balance across all customers
    const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);

    // Total expenses this month
    const totalExpenses = expenses
      .filter((e) => e.timestamp >= startOfMonth)
      .reduce((sum, e) => sum + e.amount, 0);

    // Approximate Cost of Goods Sold (COGS)
    let totalCogs = 0;
    monthlyOrders.forEach((o) => {
      o.items.forEach((item) => {
        totalCogs += (item.costPrice || item.unitPrice * 0.6) * item.quantity;
      });
    });

    const grossProfit = Math.max(0, monthlySales - totalCogs);
    const netProfit = grossProfit - totalExpenses;

    return {
      todaySales,
      todayCash,
      todayCredit,
      todayOrdersCount: todayOrders.length,
      totalOutstanding,
      totalCustomersCount: customers.length,
      monthlySales,
      totalExpenses,
      netProfit,
    };
  }

  /**
   * Dedicated Metrics for UDHAR KHATA (Customer Credit Ledger)
   * 1. Total Outstanding (कुल बाकी उधार)
   * 2. Today's New Udhar (आज दिया गया नया उधार)
   * 3. Today's Recovered Udhar (आज वसूल किया गया पैसा)
   * 4. Total Debtors Count (कुल उधार वाले ग्राहक)
   * 5. Top Defaulters / Debtors (सबसे ज्यादा बकाया वाले ग्राहक)
   */
  public getUdharKhataMetrics(shopId?: string) {
    const sId = shopId || this.getActiveShopId();
    if (!sId) {
      return {
        totalOutstanding: 0,
        todayNewUdhar: 0,
        todayCollectedUdhar: 0,
        totalDebtorsCount: 0,
        totalCustomersCount: 0,
        topDebtors: [] as CustomerRecord[],
      };
    }

    const customers = this.getCustomers(sId);
    const orders = this.getOrders(sId);
    const payments = this.getPayments(sId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // 1. Total outstanding
    const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);

    // 2. Today's new udhar given (orders created today with remaining balance > 0)
    const todayOrders = orders.filter((o) => o.createdAt >= startOfToday && o.status !== 'cancelled');
    const todayNewUdhar = todayOrders.reduce((sum, o) => {
      const unpaid = Math.max(0, (o.totalBill || 0) - (o.amountReceived || 0));
      return sum + unpaid;
    }, 0);

    // 3. Today's collected payments (all payments / debt collections timestamped today)
    const todayPayments = payments.filter((p) => p.timestamp >= startOfToday && p.entryType !== 'adjustment_debit');
    const todayCollectedUdhar = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // 4. Customers with positive outstanding balance
    const debtors = customers.filter((c) => (c.outstandingBalance || 0) > 0);
    const totalDebtorsCount = debtors.length;

    // 5. Top debtors sorted by outstanding balance descending
    const topDebtors = [...debtors].sort((a, b) => (b.outstandingBalance || 0) - (a.outstandingBalance || 0)).slice(0, 5);

    return {
      totalOutstanding,
      todayNewUdhar,
      todayCollectedUdhar,
      totalDebtorsCount,
      totalCustomersCount: customers.length,
      topDebtors,
    };
  }

  // -------------------------------------------------------------
  // CLEAR ALL SHOP DATA (For testing or reset)
  // -------------------------------------------------------------
  public clearShopData(shopId: string) {
    removeStorage(PRODUCTS_KEY + shopId);
    removeStorage(ORDERS_KEY + shopId);
    removeStorage(CUSTOMERS_KEY + shopId);
    removeStorage(PAYMENTS_KEY + shopId);
    removeStorage(EXPENSES_KEY + shopId);
    this.notify();
  }
}

export const pasalStorage = new PasalStorageEngine();
