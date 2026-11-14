/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Nepal Gold & Silver Calculation Engine (नेपाल सुन–चाँदी हिसाब इन्जिन)
 * Conforms strictly to Nepali goldsmith & FENERGOSIDA market standards.
 * 
 * Standard Conversion Constants:
 * - 1 Tola = 11.6638038 grams
 * - 1 Gram = 0.085735 tola
 * - 1 Tola = 16 Aana
 * - 1 Aana = 0.7289877375 grams (11.6638038 / 16)
 * - 1 Laal = 0.1822469344 grams (11.6638038 / 64)
 * - 1 Tola = 100 Laal (in metric decimal points) or 64 traditional laal
 * - 1 Kilogram = 1000 grams = 85.735 tola
 */

export const GRAMS_PER_TOLA = 11.6638038;
export const AANA_PER_TOLA = 16;
export const GRAMS_PER_AANA = 11.6638038 / 16; // 0.7289877375
export const GRAMS_PER_LAAL = 0.1822469344;
export const LAAL_PER_TOLA_DECIMAL = 100;
export const LAAL_PER_TOLA_TRADITIONAL = 64;

export type MetalType = 'gold' | 'silver';
export type CalculationMode = 'buy' | 'sell';

export type WeightUnit = 'tola' | 'gram' | 'aana' | 'laal' | 'kilogram' | 'compound';

export interface GoldPurity {
  karat: string;
  nameEn: string;
  nameNe: string;
  nameHi: string;
  ratio: number; // fraction of 24K (e.g. 22/24 = 0.916666...)
  percentage: number;
}

export const GOLD_PURITIES: GoldPurity[] = [
  { karat: '24K', nameEn: '24 Karat (Fine Gold / Chhapawal)', nameNe: '२४ क्यारेट (छापावाल सुन)', nameHi: '२४ कैरेट (शुद्ध सोना)', ratio: 1.0, percentage: 99.99 },
  { karat: '22K', nameEn: '22 Karat (Tejabi / 916)', nameNe: '२२ क्यारेट (तेजाबी सुन ९१६)', nameHi: '२२ कैरेट (तेजाबी ९१६)', ratio: 22 / 24, percentage: 91.67 },
  { karat: '21K', nameEn: '21 Karat', nameNe: '२१ क्यारेट', nameHi: '२१ कैरेट', ratio: 21 / 24, percentage: 87.50 },
  { karat: '20K', nameEn: '20 Karat', nameNe: '२० क्यारेट', nameHi: '२० कैरेट', ratio: 20 / 24, percentage: 83.33 },
  { karat: '18K', nameEn: '18 Karat (Jewelry Gold)', nameNe: '१८ क्यारेट (गहना सुन)', nameHi: '१८ कैरेट (ज्वेलरी सोना)', ratio: 18 / 24, percentage: 75.00 },
  { karat: '14K', nameEn: '14 Karat', nameNe: '१४ क्यारेट', nameHi: '१४ कैरेट', ratio: 14 / 24, percentage: 58.33 },
];

export interface SilverPurity {
  code: string;
  nameEn: string;
  nameNe: string;
  nameHi: string;
  ratio: number;
  percentage: number;
}

export const SILVER_PURITIES: SilverPurity[] = [
  { code: '999', nameEn: 'Fine Silver 999 (Pure)', nameNe: 'शुद्ध चाँदी ९९९ (Fine Silver)', nameHi: 'शुद्ध चाँदी ९९९', ratio: 1.0, percentage: 99.9 },
  { code: '925', nameEn: 'Sterling Silver 925', nameNe: 'स्टर्लिङ चाँदी ९२५ (Sterling)', nameHi: 'स्टर्लिंग चाँदी ९२५', ratio: 0.925, percentage: 92.5 },
  { code: '900', nameEn: 'Silver 900 (Coin Silver)', nameNe: 'चाँदी ९०० (Coin Silver)', nameHi: 'चाँदी ९००', ratio: 0.900, percentage: 90.0 },
  { code: '800', nameEn: 'Silver 800 (Traditional)', nameNe: 'चाँदी ८०० (परम्परागत)', nameHi: 'चाँदी ८००', ratio: 0.800, percentage: 80.0 },
];

export interface WeightBreakdown {
  totalGrams: number;
  totalTola: number;
  tolas: number;
  aanas: number;
  laals: number;
  kilograms: number;
}

/**
 * Converts any weight input into standard grams and Nepali units breakdown
 */
export function convertToGrams(
  weight: number,
  unit: WeightUnit,
  compound?: { tola?: number; aana?: number; laal?: number }
): WeightBreakdown {
  let grams = 0;

  if (unit === 'compound' && compound) {
    const t = Number(compound.tola || 0);
    const a = Number(compound.aana || 0);
    const l = Number(compound.laal || 0);
    grams = t * GRAMS_PER_TOLA + a * GRAMS_PER_AANA + l * GRAMS_PER_LAAL;
  } else {
    const w = Number(weight || 0);
    switch (unit) {
      case 'tola':
        grams = w * GRAMS_PER_TOLA;
        break;
      case 'gram':
        grams = w;
        break;
      case 'aana':
        grams = w * GRAMS_PER_AANA;
        break;
      case 'laal':
        grams = w * GRAMS_PER_LAAL;
        break;
      case 'kilogram':
        grams = w * 1000;
        break;
      default:
        grams = w * GRAMS_PER_TOLA;
    }
  }

  // Calculate decomposed Tola-Aana-Laal
  const totalTola = grams / GRAMS_PER_TOLA;
  const tolas = Math.floor(totalTola);
  const remainingAfterTolaGrams = grams - tolas * GRAMS_PER_TOLA;
  const aanas = Math.floor(remainingAfterTolaGrams / GRAMS_PER_AANA);
  const remainingAfterAanaGrams = remainingAfterTolaGrams - aanas * GRAMS_PER_AANA;
  const laals = Number((remainingAfterAanaGrams / GRAMS_PER_LAAL).toFixed(2));
  const kilograms = grams / 1000;

  return {
    totalGrams: Number(grams.toFixed(6)),
    totalTola: Number(totalTola.toFixed(6)),
    tolas,
    aanas,
    laals,
    kilograms: Number(kilograms.toFixed(6)),
  };
}

export interface CalculationInput {
  metal: MetalType;
  mode: CalculationMode;
  ratePerTola: number; // NPR per tola
  rateBasePurity: string; // e.g. '24K' or '999'
  selectedPurity: string; // e.g. '22K' or '925'
  weight: number;
  unit: WeightUnit;
  compoundWeight?: { tola?: number; aana?: number; laal?: number };
  makingChargeType?: 'flat' | 'per_tola' | 'per_gram' | 'percent';
  makingChargeValue?: number;
  otherCharges?: number; // Jarti, stones, etc.
  discount?: number; // Flat discount
  sellingDeductionPercent?: number; // e.g. 5% melting/refining deduction in sell mode
}

export interface CalculationResult {
  metal: MetalType;
  mode: CalculationMode;
  weightGrams: number;
  weightTola: number;
  weightDecomposed: { tolas: number; aanas: number; laals: number };
  purityKarat: string;
  purityPercent: number;
  pureMetalGrams: number;
  pureMetalTola: number;
  ratePerTola: number;
  effectiveRatePerGram: number;
  rawMetalPrice: number;
  makingCharge: number;
  otherCharges: number;
  discount: number;
  deduction: number;
  finalTotal: number;
  timestamp: number;
}

/**
 * Centralized High-Precision Gold & Silver Calculation Engine
 */
export function calculateGoldSilver(input: CalculationInput): CalculationResult {
  const {
    metal,
    mode,
    ratePerTola,
    rateBasePurity,
    selectedPurity,
    weight,
    unit,
    compoundWeight,
    makingChargeType = 'flat',
    makingChargeValue = 0,
    otherCharges = 0,
    discount = 0,
    sellingDeductionPercent = 0,
  } = input;

  const breakdown = convertToGrams(weight, unit, compoundWeight);
  const totalGrams = breakdown.totalGrams;

  if (ratePerTola <= 0 || totalGrams <= 0 || isNaN(ratePerTola) || isNaN(totalGrams)) {
    return {
      metal,
      mode,
      weightGrams: Math.max(0, Number(totalGrams.toFixed(4)) || 0),
      weightTola: Math.max(0, Number(breakdown.totalTola.toFixed(4)) || 0),
      weightDecomposed: {
        tolas: breakdown.tolas || 0,
        aanas: breakdown.aanas || 0,
        laals: breakdown.laals || 0,
      },
      purityKarat: selectedPurity,
      purityPercent: 0,
      pureMetalGrams: 0,
      pureMetalTola: 0,
      ratePerTola: Math.max(0, ratePerTola) || 0,
      effectiveRatePerGram: 0,
      rawMetalPrice: 0,
      makingCharge: 0,
      otherCharges: 0,
      discount: 0,
      deduction: 0,
      finalTotal: 0,
      timestamp: Date.now(),
    };
  }

  // Determine purity ratios
  let selectedRatio = 1.0;
  let baseRatio = 1.0;
  let purityPercent = 100;

  if (metal === 'gold') {
    const selectedObj = GOLD_PURITIES.find((g) => g.karat === selectedPurity) || GOLD_PURITIES[0];
    const baseObj = GOLD_PURITIES.find((g) => g.karat === rateBasePurity) || GOLD_PURITIES[0];
    selectedRatio = selectedObj.ratio;
    baseRatio = baseObj.ratio;
    purityPercent = selectedObj.percentage;
  } else {
    const selectedObj = SILVER_PURITIES.find((s) => s.code === selectedPurity) || SILVER_PURITIES[0];
    const baseObj = SILVER_PURITIES.find((s) => s.code === rateBasePurity) || SILVER_PURITIES[0];
    selectedRatio = selectedObj.ratio;
    baseRatio = baseObj.ratio;
    purityPercent = selectedObj.percentage;
  }

  // Adjust rate according to purity if the entered rate was for a different purity
  // e.g., if market rate is for 24K and user selects 22K: adjustedRate = rate * (selectedRatio / baseRatio)
  const adjustedRatePerTola = (ratePerTola * selectedRatio) / baseRatio;
  const effectiveRatePerGram = adjustedRatePerTola / GRAMS_PER_TOLA;

  const rawMetalPrice = totalGrams * effectiveRatePerGram;
  const pureMetalGrams = totalGrams * selectedRatio;
  const pureMetalTola = breakdown.totalTola * selectedRatio;

  let makingCharge = 0;
  let other = Math.max(0, Number(otherCharges) || 0);
  let disc = Math.max(0, Number(discount) || 0);
  let deduction = 0;
  let finalTotal = 0;

  if (mode === 'buy') {
    // BUY MODE: Customer pays for metal + making + extra - discount
    const mcVal = Math.max(0, Number(makingChargeValue) || 0);
    switch (makingChargeType) {
      case 'flat':
        makingCharge = mcVal;
        break;
      case 'per_tola':
        makingCharge = breakdown.totalTola * mcVal;
        break;
      case 'per_gram':
        makingCharge = totalGrams * mcVal;
        break;
      case 'percent':
        makingCharge = (rawMetalPrice * mcVal) / 100;
        break;
      default:
        makingCharge = mcVal;
    }

    finalTotal = Math.max(0, rawMetalPrice + makingCharge + other - disc);
  } else {
    // SELL MODE: Customer receives money for old gold/silver.
    // Making charge is NOT added.
    // Deductions (wastage, melting loss, or flat handling) are subtracted.
    if (sellingDeductionPercent > 0) {
      deduction = (rawMetalPrice * sellingDeductionPercent) / 100;
    }
    deduction += other; // in sell mode, other charges count as deductions
    finalTotal = Math.max(0, rawMetalPrice - deduction - disc);
  }

  return {
    metal,
    mode,
    weightGrams: Number(totalGrams.toFixed(4)),
    weightTola: Number(breakdown.totalTola.toFixed(4)),
    weightDecomposed: {
      tolas: breakdown.tolas,
      aanas: breakdown.aanas,
      laals: breakdown.laals,
    },
    purityKarat: selectedPurity,
    purityPercent,
    pureMetalGrams: Number(pureMetalGrams.toFixed(4)),
    pureMetalTola: Number(pureMetalTola.toFixed(4)),
    ratePerTola: Math.round(adjustedRatePerTola),
    effectiveRatePerGram: Number(effectiveRatePerGram.toFixed(2)),
    rawMetalPrice: Math.round(rawMetalPrice * 100) / 100,
    makingCharge: Math.round(makingCharge * 100) / 100,
    otherCharges: Math.round(other * 100) / 100,
    discount: Math.round(disc * 100) / 100,
    deduction: Math.round(deduction * 100) / 100,
    finalTotal: Math.round(finalTotal * 100) / 100,
    timestamp: Date.now(),
  };
}

/**
 * Formats an amount in Nepali Rupee format (e.g. रु. १,२५,०००.०० or Rs. 1,25,000.00)
 */
export function formatNPR(amount: number, inDevanagari: boolean = false): string {
  const parts = (amount || 0).toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // South Asian numbering system: last 3 digits, then groups of 2
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  if (!inDevanagari) return `Rs. ${formattedInt}.${decimalPart}`;
  return `रु. ${formattedInt}.${decimalPart}`;
}

/**
 * Normalizes digits to English ASCII numerals (0123456789)
 */
export function toDevDigits(val: number | string): string {
  const devToAscii: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  };
  return String(val)
    .split('')
    .map((c) => devToAscii[c] ?? c)
    .join('');
}
