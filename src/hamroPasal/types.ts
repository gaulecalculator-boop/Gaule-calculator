/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * HAMRO PASAL (हाम्रो पसल) — Data Types & Models
 * Complete Multi-Business Shop & Restaurant Management System
 */

export type BusinessType =
  | 'hotel_restaurant'      // Hotel / Restaurant / Khaja Ghar
  | 'grocery_kirana'        // Grocery / Kirana / General Store
  | 'clothing_garment'      // Clothing / Garment Shop
  | 'mobile_electronics'    // Mobile / Electronics Shop
  | 'hardware_store'        // Hardware Shop
  | 'cosmetics_beauty'      // Cosmetics Shop
  | 'footwear_shoes'        // Footwear Shop
  | 'stationery_book'       // Stationery Shop
  | 'wholesale_distributor' // Wholesale Shop
  | 'custom_other';         // Other / Custom Business

export type OrderType = 'dine_in' | 'takeaway' | 'delivery';
export type OrderStatus = 'pending' | 'preparing' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'esewa' | 'khalti' | 'bank_transfer' | 'credit_udhar';

export interface ShopProfile {
  id: string;
  name: string;
  ownerName: string;
  mobile: string;
  address: string;
  businessType: BusinessType;
  logoUrl?: string;
  panNumber?: string;
  currency: string; // 'NPR'
  language: 'ne' | 'hi' | 'en';
  vatPercent: number; // e.g. 13% or 0%
  serviceChargePercent: number; // e.g. 10% for restaurants
  createdAt: number;
  updatedAt: number;
  ownerUid: string;
}

export interface MenuItemOrProduct {
  id: string;
  shopId: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  stockQty: number; // for retail shops or tracked foods
  unit: string;     // 'plate', 'bottle', 'cup', 'kg', 'pcs', 'meter'
  barcode?: string;
  // Specific for clothing / electronics / hardware:
  variants?: {
    size?: string;
    color?: string;
    imei?: string;
    warrantyMonths?: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface OrderLineItem {
  productId: string;
  productName: string;
  category?: string;
  unitPrice: number;
  costPrice?: number;
  quantity: number;
  unit: string;
  notes?: string;
  total: number;
}

export interface CustomerOrder {
  id: string;
  shopId: string;
  orderNumber: number;
  orderType: OrderType;
  tableNumber?: string;
  customerId?: string;
  customerName: string;
  customerMobile?: string;
  items: OrderLineItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  totalBill: number;
  amountReceived: number;
  remainingBalance: number; // totalBill - amountReceived
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CustomerPaymentRecord {
  id: string;
  shopId: string;
  customerId: string;
  customerName: string;
  orderId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  transactionRef?: string;
  remainingBalanceAfterPayment: number;
  entryType?: 'payment' | 'adjustment_credit' | 'adjustment_debit';
  timestamp: number;
}

export interface CustomerRecord {
  id: string;
  shopId: string;
  name: string;
  mobile: string;
  address?: string;
  photoUrl?: string;
  totalLifetimePurchases: number;
  totalAmountPaid: number;
  outstandingBalance: number; // Unpaid / Udhar balance
  lastVisitTimestamp: number;
  createdAt: number;
  updatedAt: number;
}

export interface RestaurantTable {
  id: string;
  tableNumber: string;
  capacity: number;
  isOccupied: boolean;
  currentOrderId?: string;
}

export interface ShopExpense {
  id: string;
  shopId: string;
  category: 'rent' | 'electricity' | 'salary' | 'transport' | 'supplies' | 'other';
  title: string;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string; // YYYY-MM-DD
  notes?: string;
  timestamp: number;
}

export interface SupplierRecord {
  id: string;
  shopId: string;
  name: string;
  mobile: string;
  companyName: string;
  totalPurchased: number;
  totalPaid: number;
  outstandingBalance: number;
  updatedAt: number;
}
