import React, { useState } from 'react';
import {
  RotateCcw,
  Copy,
  Save,
  Receipt as ReceiptIcon,
  Plus,
  Trash2,
  Share2,
  ArrowRightLeft,
  BookOpen,
  Scale,
  Sparkles,
} from 'lucide-react';
import { Language, Currency, CalculatorMeta } from '../../../types';
import { translations } from '../../../data/translations';
import { formatCurrency, toDevanagari } from '../../../utils/nepaliCalendar';
import { playSuccessSound, playTapSound } from '../../../utils/audio';
import { saveCalculationToHistory } from '../../../utils/storage';
import { ReceiptModal } from '../../ReceiptModal';
import { openExternalUrl } from '../../../utils/androidBridge';

interface ShopToolsProps {
  tool: CalculatorMeta;
  language: Language;
  currency: Currency;
  showToast: (msg: string) => void;
}

interface BillItem {
  id: string;
  name: string;
  qty: number;
  rate: number;
}

interface KhataEntry {
  id: string;
  customerName: string;
  amount: number;
  type: 'udharo' | 'jama'; // udharo = customer owes shop; jama = customer paid
  date: string;
}

export const ShopTools: React.FC<ShopToolsProps> = ({
  tool,
  language,
  currency,
  showToast,
}) => {
  const t = translations[language];
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // 1. Standard Pocket Calculator State
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcPrev, setCalcPrev] = useState<number | null>(null);
  const [calcOp, setCalcOp] = useState<string | null>(null);

  // 2. Percentage State
  const [pctMode, setPctMode] = useState<1 | 2 | 3>(1); // 1: X% of Y | 2: X is what % of Y | 3: % Change
  const [pctX, setPctX] = useState<number>(15);
  const [pctY, setPctY] = useState<number>(5000);

  // 3. Shop Billing State
  const [customerName, setCustomerName] = useState<string>('राम प्रसाद');
  const [billItems, setBillItems] = useState<BillItem[]>([
    { id: '1', name: 'चामल (Rice 1kg)', qty: 2, rate: 110 },
    { id: '2', name: 'तेल (Mustard Oil 1L)', qty: 1, rate: 260 },
    { id: '3', name: 'चिनी (Sugar 1kg)', qty: 3, rate: 95 },
  ]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemRate, setNewItemRate] = useState('');
  const [billDiscount, setBillDiscount] = useState<number>(0);

  // 4. Profit & Loss State
  const [costPrice, setCostPrice] = useState<number>(800);
  const [sellingPrice, setSellingPrice] = useState<number>(1050);

  // 5. Discount State
  const [originalPrice, setOriginalPrice] = useState<number>(2500);
  const [discountPercent, setDiscountPercent] = useState<number>(20);

  // 6. Unit Converter State
  const [unitCategory, setUnitCategory] = useState<'length' | 'weight' | 'area' | 'volume'>('weight');
  const [unitInputValue, setUnitInputValue] = useState<number>(1);
  const [fromUnit, setFromUnit] = useState<string>('kg');
  const [toUnit, setToUnit] = useState<string>('gram');

  // 7. Smart Khata State
  const [khataCustomer, setKhataCustomer] = useState('');
  const [khataAmount, setKhataAmount] = useState('');
  const [khataType, setKhataType] = useState<'udharo' | 'jama'>('udharo');
  const [khataList, setKhataList] = useState<KhataEntry[]>([
    { id: '1', customerName: 'हरि शर्मा', amount: 1500, type: 'udharo', date: '२०८३/०७/१२' },
    { id: '2', customerName: 'हरि शर्मा', amount: 500, type: 'jama', date: '२०८३/०७/१५' },
    { id: '3', customerName: 'श्याम श्रेष्ठ', amount: 3200, type: 'udharo', date: '२०८३/०७/१८' },
  ]);

  // Calculations:
  // Percentage calculations
  const calculatePercentage = () => {
    if (pctMode === 1) return (pctX * pctY) / 100;
    if (pctMode === 2) return pctY !== 0 ? +((pctX / pctY) * 100).toFixed(2) : 0;
    if (pctMode === 3) return pctX !== 0 ? +(((pctY - pctX) / pctX) * 100).toFixed(2) : 0;
    return 0;
  };
  const percentageResult = calculatePercentage();

  // Shop Billing calculations
  const billSubtotal = billItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const billGrandTotal = Math.max(0, billSubtotal - billDiscount);

  // Profit & Loss calculations
  const profitLossAmount = sellingPrice - costPrice;
  const isProfit = profitLossAmount >= 0;
  const profitLossPercent = costPrice > 0 ? +((Math.abs(profitLossAmount) / costPrice) * 100).toFixed(2) : 0;
  const marginPercent = sellingPrice > 0 ? +((profitLossAmount / sellingPrice) * 100).toFixed(2) : 0;

  // Discount calculations
  const discountSavedAmount = Math.round((originalPrice * discountPercent) / 100);
  const finalDiscountedPrice = originalPrice - discountSavedAmount;

  // Unit Converter calculations
  const convertUnits = (val: number, cat: string, from: string, to: string): number => {
    if (cat === 'weight') {
      // Base: Grams
      const toGrams: Record<string, number> = {
        kg: 1000,
        gram: 1,
        pav: 250,
        dharni: 2400,
        pound: 453.592,
        tola: 11.664,
      };
      const grams = val * (toGrams[from] || 1);
      return +(grams / (toGrams[to] || 1)).toFixed(3);
    }
    if (cat === 'length') {
      // Base: Meters
      const toMeters: Record<string, number> = {
        meter: 1,
        feet: 0.3048,
        inch: 0.0254,
        cm: 0.01,
        km: 1000,
        mile: 1609.34,
        haat: 0.4572, // 1 Haat = 1.5 ft
      };
      const meters = val * (toMeters[from] || 1);
      return +(meters / (toMeters[to] || 1)).toFixed(3);
    }
    if (cat === 'area') {
      // Base: Sq.Feet
      const toSqFt: Record<string, number> = {
        sqft: 1,
        sqm: 10.7639,
        ropani: 5476,
        aana: 342.25,
        paisa: 85.56,
        bigha: 72900,
        kattha: 3645,
        dhur: 182.25,
      };
      const sqft = val * (toSqFt[from] || 1);
      return +(sqft / (toSqFt[to] || 1)).toFixed(3);
    }
    if (cat === 'volume') {
      // Base: Liter
      const toLiters: Record<string, number> = {
        liter: 1,
        ml: 0.001,
        gallon: 3.78541,
        cft: 28.3168,
        mana: 0.568, // 1 Mana approx 0.568 L
        pathi: 4.544, // 1 Pathi = 8 Mana
      };
      const liters = val * (toLiters[from] || 1);
      return +(liters / (toLiters[to] || 1)).toFixed(3);
    }
    return val;
  };
  const unitResult = convertUnits(unitInputValue, unitCategory, fromUnit, toUnit);

  // Smart Khata calculations
  const totalUdharo = khataList
    .filter((k) => k.type === 'udharo')
    .reduce((s, k) => s + k.amount, 0);
  const totalJama = khataList
    .filter((k) => k.type === 'jama')
    .reduce((s, k) => s + k.amount, 0);
  const netDue = totalUdharo - totalJama;

  // Pocket Calc Handler
  const handleCalcPress = (val: string) => {
    playTapSound();
    if (val === 'C') {
      setCalcDisplay('0');
      setCalcPrev(null);
      setCalcOp(null);
      return;
    }
    if (['+', '-', '×', '÷'].includes(val)) {
      setCalcPrev(parseFloat(calcDisplay));
      setCalcOp(val);
      setCalcDisplay('0');
      return;
    }
    if (val === '=') {
      if (calcPrev !== null && calcOp) {
        const cur = parseFloat(calcDisplay);
        let res = 0;
        if (calcOp === '+') res = calcPrev + cur;
        if (calcOp === '-') res = calcPrev - cur;
        if (calcOp === '×') res = calcPrev * cur;
        if (calcOp === '÷') res = cur !== 0 ? calcPrev / cur : 0;
        setCalcDisplay(String(+res.toFixed(6)));
        setCalcPrev(null);
        setCalcOp(null);
        playSuccessSound();
      }
      return;
    }
    if (calcDisplay === '0' && val !== '.') {
      setCalcDisplay(val);
    } else {
      setCalcDisplay(calcDisplay + val);
    }
  };

  const handleAddBillItem = () => {
    if (!newItemName.trim() || !newItemRate) return;
    playTapSound();
    const item: BillItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      qty: parseFloat(newItemQty) || 1,
      rate: parseFloat(newItemRate) || 0,
    };
    setBillItems([...billItems, item]);
    setNewItemName('');
    setNewItemQty('1');
    setNewItemRate('');
  };

  const handleRemoveBillItem = (id: string) => {
    playTapSound();
    setBillItems(billItems.filter((i) => i.id !== id));
  };

  const handleAddKhataEntry = () => {
    if (!khataCustomer.trim() || !khataAmount) return;
    playSuccessSound();
    const entry: KhataEntry = {
      id: Date.now().toString(),
      customerName: khataCustomer.trim(),
      amount: parseFloat(khataAmount) || 0,
      type: khataType,
      date: new Date().toLocaleDateString('ne-NP'),
    };
    setKhataList([entry, ...khataList]);
    setKhataCustomer('');
    setKhataAmount('');
    showToast('खाता प्रविष्टि थपियो!');
  };

  const handleSaveCurrent = (title: string, summary: string, amount: number) => {
    playSuccessSound();
    saveCalculationToHistory({
      toolId: tool.id,
      toolName: language === 'ne' ? tool.nameNe : tool.nameEn,
      date: new Date().toLocaleDateString('en-GB'),
      title,
      summary,
      amount,
      currency,
      details: {
        Tool: tool.nameEn,
        Date: new Date().toLocaleDateString('en-GB'),
      },
    });
    showToast(t.savedToast);
  };

  const handleCopyText = (text: string) => {
    playTapSound();
    navigator.clipboard.writeText(text);
    showToast(t.copiedToast);
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* Tool Header */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-extrabold text-white">
              {language === 'ne' ? tool.nameNe : tool.nameEn}
            </h4>
            <span className="bg-white/20 text-white text-[10px] font-black px-1.5 py-0.2 rounded-md">
              Shop & Dukaan
            </span>
          </div>
          <p className="text-xs text-amber-100 mt-0.5">
            {language === 'ne' ? tool.descNe : tool.descEn}
          </p>
        </div>
      </div>

      {/* 1. Pocket Mathematical Calculator */}
      {tool.id === 'calculator' && (
        <div className="bg-slate-900 text-white rounded-3xl p-4 shadow-xl border border-slate-800 space-y-3">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-right">
            <div className="text-xs text-slate-500 h-4">
              {calcPrev !== null && `${calcPrev} ${calcOp}`}
            </div>
            <div className="text-3xl font-mono font-bold text-emerald-400 truncate">
              {calcDisplay}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-sm font-bold">
            {['C', '±', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='].map(
              (k) => (
                <button
                  key={k}
                  onClick={() => handleCalcPress(k)}
                  className={`p-3.5 rounded-2xl transition active:scale-95 ${
                    k === '='
                      ? 'col-span-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-lg shadow-md shadow-emerald-500/30'
                      : ['+', '-', '×', '÷'].includes(k)
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : k === 'C'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                  }`}
                >
                  {k}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* 2. Percentage (%) Calculator */}
      {tool.id === 'percentage' && (
        <div className="space-y-4">
          <div className="flex bg-slate-200/80 p-1 rounded-2xl text-xs font-bold gap-1">
            <button
              onClick={() => { playTapSound(); setPctMode(1); }}
              className={`flex-1 py-2.5 rounded-xl transition ${pctMode === 1 ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700'}`}
            >
              X% of Y
            </button>
            <button
              onClick={() => { playTapSound(); setPctMode(2); }}
              className={`flex-1 py-2.5 rounded-xl transition ${pctMode === 2 ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700'}`}
            >
              X is what % of Y
            </button>
            <button
              onClick={() => { playTapSound(); setPctMode(3); }}
              className={`flex-1 py-2.5 rounded-xl transition ${pctMode === 3 ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700'}`}
            >
              % Change
            </button>
          </div>

          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  {pctMode === 1 ? 'प्रतिशत (Percentage X %):' : 'पहिलो मान (Value X):'}
                </label>
                <input
                  type="number"
                  value={pctX}
                  onChange={(e) => setPctX(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2 px-3 text-sm font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  {pctMode === 1 ? 'जम्मा रकम (Total Y):' : 'दोस्रो मान (Value Y):'}
                </label>
                <input
                  type="number"
                  value={pctY}
                  onChange={(e) => setPctY(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2 px-3 text-sm font-bold outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">नतिजा (Result)</span>
            <div className="text-3xl font-black text-amber-400">
              {pctMode === 1 && `रु ${percentageResult.toLocaleString('en-IN')}`}
              {pctMode === 2 && `${percentageResult}%`}
              {pctMode === 3 && `${percentageResult > 0 ? `+${percentageResult}% वृद्धि` : `${percentageResult}% घटबढ`}`}
            </div>
            <p className="text-xs text-slate-300">
              {pctMode === 1 && `${pctY} को ${pctX}% = ${percentageResult}`}
              {pctMode === 2 && `${pctX} भन्नाले ${pctY} को ${percentageResult}% हो`}
              {pctMode === 3 && `(${pctY} - ${pctX}) ÷ ${pctX} = ${percentageResult}%`}
            </p>
            <button
              onClick={() => handleSaveCurrent('Percentage Calc', `Result: ${percentageResult}`, percentageResult)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs"
            >
              हिसाब सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}

      {/* 3. Shop Billing / Retail Cash Memo */}
      {tool.id === 'shop-billing' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">ग्राहकको नाम (Customer Name):</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2 px-3 text-xs font-bold outline-none"
              />
            </div>

            {/* Add Item form */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 block">नयाँ सामान थप्नुहोस् (Add Item):</span>
              <div className="grid grid-cols-12 gap-1.5">
                <input
                  type="text"
                  placeholder="सामानको नाम"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="col-span-5 bg-white border border-slate-300 rounded-xl py-1.5 px-2 text-xs font-semibold outline-none"
                />
                <input
                  type="number"
                  placeholder="मात्रा"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  className="col-span-3 bg-white border border-slate-300 rounded-xl py-1.5 px-2 text-xs font-semibold outline-none text-center"
                />
                <input
                  type="number"
                  placeholder="दर रु"
                  value={newItemRate}
                  onChange={(e) => setNewItemRate(e.target.value)}
                  className="col-span-4 bg-white border border-slate-300 rounded-xl py-1.5 px-2 text-xs font-semibold outline-none text-center"
                />
              </div>
              <button
                onClick={handleAddBillItem}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> सामान थप्नुहोस् (Add)
              </button>
            </div>

            {/* Item List */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase">बिल सूची ({billItems.length} सामान):</span>
              {billItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-500">{item.qty} × रु {item.rate}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-blue-700">रु {item.qty * item.rate}</span>
                    <button onClick={() => handleRemoveBillItem(item.id)} className="text-rose-500 hover:text-rose-700 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Discount */}
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs font-bold text-slate-700">विशेष छुट (Discount रु):</span>
              <input
                type="number"
                value={billDiscount}
                onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
                className="w-24 bg-slate-100 border border-slate-300 rounded-xl py-1 px-2 text-xs font-bold text-right outline-none"
              />
            </div>
          </div>

          {/* Grand Total Card */}
          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">जम्मा तिर्नुपर्ने रकम</span>
                <div className="text-3xl font-black text-amber-400 mt-0.5">
                  रु {billGrandTotal.toLocaleString('en-IN')}
                </div>
              </div>
              <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full text-slate-300 border border-white/20">
                ग्राहक: {customerName}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  playTapSound();
                  setIsReceiptOpen(true);
                }}
                className="py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95"
              >
                <ReceiptIcon className="w-3.5 h-3.5" /> बिल रसिद (Print)
              </button>
              <button
                onClick={() => {
                  playTapSound();
                  const billText = `*🛒 GHAULE DUKAAN BILL*\nग्राहक: ${customerName}\n${billItems.map(i => `${i.name}: ${i.qty} x ${i.rate} = रु ${i.qty * i.rate}`).join('\n')}\nछुट: रु ${billDiscount}\n*कुल रकम: रु ${billGrandTotal}*`;
                  openExternalUrl(`https://wa.me/?text=${encodeURIComponent(billText)}`);
                }}
                className="py-2.5 bg-[#00C853] hover:bg-[#00B048] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" /> WhatsApp सेयर
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Profit & Loss Calculator */}
      {tool.id === 'profit-loss' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">खरिद मूल्य (Cost Price):</label>
                <input
                  type="number"
                  value={costPrice}
                  onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2 px-3 text-sm font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">बिक्री मूल्य (Selling Price):</label>
                <input
                  type="number"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2 px-3 text-sm font-bold outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3.5 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {isProfit ? 'कुल खुद नाफा (Net Profit)' : 'कुल घाटा (Net Loss)'}
            </span>
            <div className={`text-3xl font-black ${isProfit ? 'text-[#00E676]' : 'text-rose-400'}`}>
              {isProfit ? `+ रु ${profitLossAmount.toLocaleString('en-IN')}` : `- रु ${Math.abs(profitLossAmount).toLocaleString('en-IN')}`}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">नाफा/घाटा प्रतिशत</span>
                <p className={`font-extrabold text-sm mt-0.5 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {profitLossPercent}%
                </p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">मार्जिन प्रतिशत (Margin)</span>
                <p className="font-extrabold text-amber-300 text-sm mt-0.5">{marginPercent}%</p>
              </div>
            </div>
            <button
              onClick={() => handleSaveCurrent('Profit/Loss', `${isProfit ? 'Profit' : 'Loss'}: रु ${profitLossAmount}`, profitLossAmount)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs"
            >
              हिसाब सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}

      {/* 5. Discount Calculator */}
      {tool.id === 'discount' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">सामानको साविक मूल्य (Original Price):</label>
              <input
                type="number"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2.5 px-3 text-sm font-bold outline-none"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-800">छुट प्रतिशत (Discount %):</label>
                <span className="text-xs font-bold text-rose-600">{discountPercent}% OFF</span>
              </div>
              <input
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2 px-3 text-sm font-bold outline-none"
              />
              <div className="flex gap-1.5 mt-2 text-xs font-bold">
                {[5, 10, 15, 20, 25, 50].map((d) => (
                  <button
                    key={d}
                    onClick={() => { playTapSound(); setDiscountPercent(d); }}
                    className={`py-1 px-2.5 rounded-xl border text-[11px] ${discountPercent === d ? 'bg-rose-600 text-white' : 'bg-slate-50 text-slate-700'}`}
                  >
                    {d}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3.5 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">छुट पछिको अन्तिम मूल्य (Final Price)</span>
            <div className="text-3xl font-black text-[#00E676]">
              रु {finalDiscountedPrice.toLocaleString('en-IN')}
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-xs flex justify-between items-center">
              <span className="text-slate-400">तपाईंको कुल बचत (You Save):</span>
              <span className="font-extrabold text-amber-400 text-sm">रु {discountSavedAmount.toLocaleString('en-IN')} ({discountPercent}%)</span>
            </div>
            <button
              onClick={() => handleSaveCurrent('Discount Calc', `रु ${finalDiscountedPrice} (Saved रु ${discountSavedAmount})`, finalDiscountedPrice)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs"
            >
              हिसाब सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}

      {/* 6. Unit Converter */}
      {tool.id === 'unit-conv' && (
        <div className="space-y-4">
          <div className="flex bg-slate-200/80 p-1 rounded-2xl text-xs font-bold gap-1 overflow-x-auto">
            {(['weight', 'length', 'area', 'volume'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  playTapSound();
                  setUnitCategory(cat);
                  if (cat === 'weight') { setFromUnit('kg'); setToUnit('gram'); }
                  if (cat === 'length') { setFromUnit('meter'); setToUnit('feet'); }
                  if (cat === 'area') { setFromUnit('ropani'); setToUnit('sqft'); }
                  if (cat === 'volume') { setFromUnit('liter'); setToUnit('ml'); }
                }}
                className={`flex-1 py-2 px-3 rounded-xl capitalize transition whitespace-nowrap ${unitCategory === cat ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700'}`}
              >
                {cat === 'weight' ? 'तौल (Weight)' : cat === 'length' ? 'लम्बाइ (Length)' : cat === 'area' ? 'क्षेत्रफल (Area)' : 'आयतन (Volume)'}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">मान (Value to Convert):</label>
              <input
                type="number"
                value={unitInputValue}
                onChange={(e) => setUnitInputValue(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2 px-3 text-sm font-bold outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">यसबाट (From):</label>
                <select
                  value={fromUnit}
                  onChange={(e) => setFromUnit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-2 text-xs font-bold capitalize outline-none"
                >
                  {unitCategory === 'weight' && (
                    <>
                      <option value="kg">किलोग्राम (Kg)</option>
                      <option value="gram">ग्राम (Gram)</option>
                      <option value="pav">पाव (Pav 250g)</option>
                      <option value="dharni">धार्नी (Dharni 2.4kg)</option>
                      <option value="pound">पाउन्ड (Pound)</option>
                      <option value="tola">तोला (Tola 11.66g)</option>
                    </>
                  )}
                  {unitCategory === 'length' && (
                    <>
                      <option value="meter">मिटर (Meter)</option>
                      <option value="feet">फिट (Feet)</option>
                      <option value="inch">इन्च (Inch)</option>
                      <option value="cm">सेन्टिमिटर (cm)</option>
                      <option value="km">किलोमिटर (km)</option>
                      <option value="haat">हात (Haat 1.5ft)</option>
                    </>
                  )}
                  {unitCategory === 'area' && (
                    <>
                      <option value="ropani">रोपनी (Ropani)</option>
                      <option value="aana">आना (Aana)</option>
                      <option value="paisa">पैसा (Paisa)</option>
                      <option value="bigha">बिघा (Bigha)</option>
                      <option value="kattha">कठ्ठा (Kattha)</option>
                      <option value="dhur">धुर (Dhur)</option>
                      <option value="sqft">वर्ग फिट (Sq.Ft)</option>
                    </>
                  )}
                  {unitCategory === 'volume' && (
                    <>
                      <option value="liter">लिटर (Liter)</option>
                      <option value="ml">मिलिलिटर (ML)</option>
                      <option value="gallon">ग्यालन (Gallon)</option>
                      <option value="cft">क्युबिक फिट (CFT)</option>
                      <option value="mana">माना (Mana)</option>
                      <option value="pathi">पाथी (Pathi)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">यसमा (To):</label>
                <select
                  value={toUnit}
                  onChange={(e) => setToUnit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-2 text-xs font-bold capitalize outline-none"
                >
                  {unitCategory === 'weight' && (
                    <>
                      <option value="gram">ग्राम (Gram)</option>
                      <option value="kg">किलोग्राम (Kg)</option>
                      <option value="pav">पाव (Pav 250g)</option>
                      <option value="dharni">धार्नी (Dharni 2.4kg)</option>
                      <option value="tola">तोला (Tola 11.66g)</option>
                      <option value="pound">पाउन्ड (Pound)</option>
                    </>
                  )}
                  {unitCategory === 'length' && (
                    <>
                      <option value="feet">फिट (Feet)</option>
                      <option value="meter">मिटर (Meter)</option>
                      <option value="inch">इन्च (Inch)</option>
                      <option value="cm">सेन्टिमिटर (cm)</option>
                      <option value="km">किलोमिटर (km)</option>
                      <option value="haat">हात (Haat 1.5ft)</option>
                    </>
                  )}
                  {unitCategory === 'area' && (
                    <>
                      <option value="sqft">वर्ग फिट (Sq.Ft)</option>
                      <option value="ropani">रोपनी (Ropani)</option>
                      <option value="aana">आना (Aana)</option>
                      <option value="bigha">बिघा (Bigha)</option>
                      <option value="kattha">कठ्ठा (Kattha)</option>
                      <option value="dhur">धुर (Dhur)</option>
                    </>
                  )}
                  {unitCategory === 'volume' && (
                    <>
                      <option value="ml">मिलिलिटर (ML)</option>
                      <option value="liter">लिटर (Liter)</option>
                      <option value="cft">क्युबिक फिट (CFT)</option>
                      <option value="gallon">ग्यालन (Gallon)</option>
                      <option value="mana">माना (Mana)</option>
                      <option value="pathi">पाथी (Pathi)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">रूपान्तरित मान (Converted Result)</span>
            <div className="text-3xl font-black text-amber-400">
              {unitResult} {toUnit}
            </div>
            <p className="text-xs text-slate-300">
              {unitInputValue} {fromUnit} = {unitResult} {toUnit}
            </p>
            <button
              onClick={() => handleSaveCurrent('Unit Conversion', `${unitInputValue} ${fromUnit} = ${unitResult} ${toUnit}`, unitResult)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs"
            >
              हिसाब सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}

      {/* 7. Smart Khata (उधारो / जमा खाता) */}
      {tool.id === 'smart-khata' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">नयाँ लेनदेन प्रविष्टि (New Entry):</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="ग्राहकको नाम"
                value={khataCustomer}
                onChange={(e) => setKhataCustomer(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl py-2 px-2.5 text-xs font-bold outline-none"
              />
              <input
                type="number"
                placeholder="रकम रु"
                value={khataAmount}
                onChange={(e) => setKhataAmount(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl py-2 px-2.5 text-xs font-bold outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setKhataType('udharo')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${khataType === 'udharo' ? 'bg-rose-600 text-white' : 'bg-slate-50 text-slate-700'}`}
              >
                उधारो दियो (Due)
              </button>
              <button
                onClick={() => setKhataType('jama')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${khataType === 'jama' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-700'}`}
              >
                रकम बुझ्यो (Paid)
              </button>
            </div>
            <button
              onClick={handleAddKhataEntry}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs"
            >
              खातामा चढाउनुहोस्
            </button>
          </div>

          {/* Ledger summary */}
          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">उठ्न बाँकी कुल रकम (Net Receivable)</span>
                <div className="text-3xl font-black text-amber-400 mt-0.5">
                  रु {netDue.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">कुल उधारो</span>
                <p className="font-extrabold text-rose-400 text-sm mt-0.5">रु {totalUdharo.toLocaleString('en-IN')}</p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">कुल असुली (जम्मा)</span>
                <p className="font-extrabold text-emerald-400 text-sm mt-0.5">रु {totalJama.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          {/* Recent Khata List */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-2">
            <span className="text-xs font-bold text-slate-700 block">हालैका खाता रेकर्डहरू:</span>
            {khataList.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <p className="font-bold text-slate-800">{entry.customerName}</p>
                  <p className="text-[10px] text-slate-400">{entry.date}</p>
                </div>
                <div className="text-right">
                  <span className={`font-extrabold text-xs ${entry.type === 'udharo' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {entry.type === 'udharo' ? `+ रु ${entry.amount} उधारो` : `- रु ${entry.amount} जमा`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Universal Bill Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        moduleType="shop"
        title="दुकान तथा किराना क्यास मेमो (Shop Cash Memo)"
        initialCustomerName={customerName}
        totalAmountText={formatCurrency(billGrandTotal, currency, language)}
        initialDiscount={billDiscount}
        items={billItems.map((item) => ({
          label: item.name,
          value: `रु ${item.qty * item.rate}`,
          quantity: item.qty,
          unit: 'थान/pcs',
          rate: item.rate,
          subtotal: item.qty * item.rate,
        }))}
        note="GHAULE CALCULATOR 100% Offline Shop System"
        language={language}
      />
    </div>
  );
};
