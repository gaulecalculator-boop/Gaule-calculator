/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Food Menu & Product Inventory View — Hamro Pasal
 * Allows adding, editing, deleting, photo linking, and availability toggles.
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Package,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Utensils,
} from 'lucide-react';
import { ShopProfile, MenuItemOrProduct } from '../types';
import { pasalStorage } from '../storage/pasalStorage';
import { playTapSound, playSuccessSound } from '../../utils/audio';

interface ProductInventoryViewProps {
  shop: ShopProfile;
}

export const ProductInventoryView: React.FC<ProductInventoryViewProps> = ({ shop }) => {
  const [products, setProducts] = useState<MenuItemOrProduct[]>(pasalStorage.getProducts(shop.id));
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<MenuItemOrProduct | null>(null);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('Khana');
  const [priceStr, setPriceStr] = useState<string>('');
  const [costPriceStr, setCostPriceStr] = useState<string>('');
  const [unit, setUnit] = useState<string>('plate');
  const [stockQtyStr, setStockQtyStr] = useState<string>('99');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = pasalStorage.subscribe(() => {
      setProducts(pasalStorage.getProducts(shop.id));
    });
    return unsub;
  }, [shop.id]);

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesQ =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQ;
  });

  const handleOpenAddModal = () => {
    playTapSound();
    setEditingProduct(null);
    setName('');
    setCategory(shop.businessType === 'hotel_restaurant' ? 'Khana' : 'General');
    setPriceStr('');
    setCostPriceStr('');
    setUnit(shop.businessType === 'hotel_restaurant' ? 'plate' : 'pcs');
    setStockQtyStr('99');
    setImageUrl('');
    setDescription('');
    setIsAvailable(true);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod: MenuItemOrProduct) => {
    playTapSound();
    setEditingProduct(prod);
    setName(prod.name);
    setCategory(prod.category);
    setPriceStr(prod.price.toString());
    setCostPriceStr(prod.costPrice ? prod.costPrice.toString() : '');
    setUnit(prod.unit || 'plate');
    setStockQtyStr(prod.stockQty.toString());
    setImageUrl(prod.imageUrl || '');
    setDescription(prod.description || '');
    setIsAvailable(prod.isAvailable);
    setError(null);
    setIsModalOpen(true);
  };

  const handleToggleAvailability = (prod: MenuItemOrProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    playTapSound();
    pasalStorage.saveProduct({
      ...prod,
      isAvailable: !prod.isAvailable,
      updatedAt: Date.now(),
    });
  };

  const handleDeleteProduct = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('के तपाईं यो परिकार हटाउन निश्चित हुनुहुन्छ?')) {
      playTapSound();
      pasalStorage.deleteProduct(shop.id, productId);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('कृपया परिकार वा सामानको नाम लेख्नुहोस्');
      return;
    }
    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
      setError('कृपया मान्य मूल्य प्रविष्ट गर्नुहोस्');
      return;
    }

    const costPrice = parseFloat(costPriceStr) || Math.round(price * 0.6);
    const stockQty = parseInt(stockQtyStr, 10) || 99;

    const toSave: MenuItemOrProduct = {
      id: editingProduct ? editingProduct.id : 'item_' + Date.now(),
      shopId: shop.id,
      name: name.trim(),
      category: category.trim() || 'General',
      price,
      costPrice,
      unit: unit.trim() || 'pcs',
      stockQty,
      imageUrl: imageUrl.trim() || undefined,
      description: description.trim() || undefined,
      isAvailable,
      createdAt: editingProduct ? editingProduct.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    pasalStorage.saveProduct(toSave);
    playSuccessSound();
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* Top Action Header */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-sm text-slate-900 leading-tight">
            {shop.businessType === 'hotel_restaurant' ? 'खाना मेनु व्यवस्थापन (Menu)' : 'सामान स्टक व्यवस्थापन (Catalog)'}
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">कुल परिकार/सामान: {products.length}</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ नयाँ थप्नुहोस्</span>
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="bg-white p-3.5 rounded-3xl border border-slate-200/90 shadow-xs space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="नाम वा श्रेणीबाट खोज्नुहोस्..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 pl-9 pr-3 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                playTapSound();
                setSelectedCategory(cat);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'All' ? 'सबै (All)' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products & Food List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredProducts.map((p) => (
          <div
            key={p.id}
            className="p-3.5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0 border border-slate-200">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🍲</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-extrabold text-xs text-slate-900 truncate">{p.name}</p>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                      p.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {p.isAvailable ? 'उपलब्ध' : 'सकियो'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">{p.category} • प्रति {p.unit}</p>
                <p className="text-xs font-black text-blue-700 mt-0.5">
                  रु {p.price} <span className="text-[10px] font-normal text-slate-400">(लागत: रु {p.costPrice})</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Toggle Availability Button */}
              <button
                onClick={(e) => handleToggleAvailability(p, e)}
                title={p.isAvailable ? 'Mark as Unavailable' : 'Mark as Available'}
                className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              >
                {p.isAvailable ? (
                  <ToggleRight className="w-6 h-6 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-400" />
                )}
              </button>

              <button
                onClick={() => handleOpenEditModal(p)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 transition cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                onClick={(e) => handleDeleteProduct(p.id, e)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm">
                {editingProduct ? 'परिकार सम्पादन (Edit Item)' : 'नयाँ परिकार थप्नुहोस् (Add Item)'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-4 space-y-3 text-xs text-slate-800 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  परिकार वा सामानको नाम <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="उदा: Buff Momo / Chicken Khana"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">श्रेणी (Category)</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Momo, Khana, Drinks..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">इकाई (Unit)</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="plate, bottle, pcs, kg"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    बिक्री मूल्य (Selling Price NPR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={priceStr}
                    onChange={(e) => setPriceStr(e.target.value)}
                    placeholder="250"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-black text-blue-700 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">लागत मूल्य (Cost Price)</label>
                  <input
                    type="number"
                    value={costPriceStr}
                    onChange={(e) => setCostPriceStr(e.target.value)}
                    placeholder="150"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">फोटो लिङ्क (Image URL - Optional)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">विवरण (Description)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="खानाको सामग्री र स्वाद विवरण..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-xs text-slate-800">हाल बिक्रीको लागि उपलब्ध छ?</span>
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 rounded"
                />
              </div>

              {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-xl">{error}</p>}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs shadow-md transition cursor-pointer"
                >
                  सुरक्षित गर्नुहोस् (Save)
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  रद्द
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
