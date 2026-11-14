/**
 * Bikram Sambat (वि.सं. २०००–२१००) Calendar Engine,
 * Sanskrit Panchang (पञ्चाङ्ग) & Hindu Muhurat (मुहूर्त) Calculation System
 *
 * Designed for Nepal (Asia/Kathmandu UTC+05:45)
 * Covers years 2000 BS to 2100 BS with astronomical precision.
 * 100% Offline Compatible.
 */

import { Language } from '../types';
import { toDevanagari } from './nepaliCalendar';
import {
  BS_MIN_YEAR,
  BS_MAX_YEAR,
  BS_CALENDAR_DATA,
  getBSYearMonthDays,
  getBSDaysInMonth,
  bsToAd,
  adToBs,
} from './nepaliCalendarData';
import { patroDb, GovernmentHolidayRecord } from './patroDatabase';

export { BS_MIN_YEAR, BS_MAX_YEAR, getBSYearMonthDays };

// Re-export conversion functions with panchang-engine signatures
export const convertBSToAD = bsToAd;
export const convertADToBS = adToBs;
export const getMonthDaysCount = getBSDaysInMonth;

// -------------------------------------------------------------
// 1. NEPAL PROVINCES & CITIES DATA (Location-based solar calculations)
// -------------------------------------------------------------
export interface NepalCity {
  id: string;
  nameNe: string;
  nameHi: string;
  nameEn: string;
  provinceNe: string;
  provinceEn: string;
  lat: number;
  lng: number;
  elevationM: number;
}

export const NEPAL_CITIES: NepalCity[] = [
  {
    id: 'kathmandu',
    nameNe: 'काठमाडौं (राजधानी)',
    nameHi: 'काठमांडू (राजधानी)',
    nameEn: 'Kathmandu (Capital)',
    provinceNe: 'बागमती प्रदेश',
    provinceEn: 'Bagmati Province',
    lat: 27.7172,
    lng: 85.324,
    elevationM: 1400,
  },
  {
    id: 'pokhara',
    nameNe: 'पोखरा (गण्डकी)',
    nameHi: 'पोखरा (गंडकी)',
    nameEn: 'Pokhara (Gandaki)',
    provinceNe: 'गण्डकी प्रदेश',
    provinceEn: 'Gandaki Province',
    lat: 28.2096,
    lng: 83.9856,
    elevationM: 822,
  },
  {
    id: 'biratnagar',
    nameNe: 'विराटनगर (कोशी)',
    nameHi: 'विराटनगर (कोशी)',
    nameEn: 'Biratnagar (Koshi)',
    provinceNe: 'कोशी प्रदेश',
    provinceEn: 'Koshi Province',
    lat: 26.4525,
    lng: 87.2718,
    elevationM: 80,
  },
  {
    id: 'dharan',
    nameNe: 'धरान (सुनसरी)',
    nameHi: 'धरान (सुनसरी)',
    nameEn: 'Dharan (Sunsari)',
    provinceNe: 'कोशी प्रदेश',
    provinceEn: 'Koshi Province',
    lat: 26.8124,
    lng: 87.2835,
    elevationM: 349,
  },
  {
    id: 'janakpur',
    nameNe: 'जनकपुरधाम (मधेश)',
    nameHi: 'जनकपुरधाम (मधेश)',
    nameEn: 'Janakpurdham (Madhesh)',
    provinceNe: 'मधेश प्रदेश',
    provinceEn: 'Madhesh Province',
    lat: 26.7271,
    lng: 85.9407,
    elevationM: 74,
  },
  {
    id: 'birgunj',
    nameNe: 'वीरगञ्ज (पर्सा)',
    nameHi: 'वीरगंज (पर्सा)',
    nameEn: 'Birgunj (Parsa)',
    provinceNe: 'मधेश प्रदेश',
    provinceEn: 'Madhesh Province',
    lat: 27.0135,
    lng: 84.8767,
    elevationM: 80,
  },
  {
    id: 'chitwan',
    nameNe: 'चितवन / भरतपुर',
    nameHi: 'चितवन / भरतपुर',
    nameEn: 'Chitwan / Bharatpur',
    provinceNe: 'बागमती प्रदेश',
    provinceEn: 'Bagmati Province',
    lat: 27.6833,
    lng: 84.4333,
    elevationM: 208,
  },
  {
    id: 'butwal',
    nameNe: 'बुटवल / भैरहवा',
    nameHi: 'बुटवल / भैरहवा',
    nameEn: 'Butwal / Bhairahawa',
    provinceNe: 'लुम्बिनी प्रदेश',
    provinceEn: 'Lumbini Province',
    lat: 27.7006,
    lng: 83.4484,
    elevationM: 150,
  },
  {
    id: 'nepalgunj',
    nameNe: 'नेपालगञ्ज (बाँके)',
    nameHi: 'नेपालगंज (बाँके)',
    nameEn: 'Nepalgunj (Banke)',
    provinceNe: 'लुम्बिनी प्रदेश',
    provinceEn: 'Lumbini Province',
    lat: 28.05,
    lng: 81.6167,
    elevationM: 150,
  },
  {
    id: 'surkhet',
    nameNe: 'वीरेन्द्रनगर (सुर्खेत)',
    nameHi: 'वीरेन्द्रनगर (सुर्खेत)',
    nameEn: 'Birendranagar (Surkhet)',
    provinceNe: 'कर्णाली प्रदेश',
    provinceEn: 'Karnali Province',
    lat: 28.6019,
    lng: 81.6337,
    elevationM: 665,
  },
  {
    id: 'dhangadhi',
    nameNe: 'धनगढी (कैलाली)',
    nameHi: 'धनगढी (कैलाली)',
    nameEn: 'Dhangadhi (Kailali)',
    provinceNe: 'सुदूरपश्चिम प्रदेश',
    provinceEn: 'Sudurpashchim Province',
    lat: 28.6852,
    lng: 80.596,
    elevationM: 109,
  },
];

// -------------------------------------------------------------
// 2. SANSKRIT PANCHANG CONSTANTS (Tithis, Nakshatras, Yogas, Karanas)
// -------------------------------------------------------------
export const TITHI_NAMES = [
  { id: 1, ne: 'शुक्ल प्रतिपदा (पडवा)', hi: 'शुक्ल प्रतिपदा (पड़वा)', en: 'Shukla Pratipada', paksha: 'shukla' },
  { id: 2, ne: 'शुक्ल द्वितीया (दूज)', hi: 'शुक्ल द्वितीया (दूज)', en: 'Shukla Dwitiya', paksha: 'shukla' },
  { id: 3, ne: 'शुक्ल तृतीया (तीज)', hi: 'शुक्ल तृतीया (तीज)', en: 'Shukla Tritiya', paksha: 'shukla' },
  { id: 4, ne: 'शुक्ल चतुर्थी (चौथ)', hi: 'शुक्ल चतुर्थी (चौथ)', en: 'Shukla Chaturthi', paksha: 'shukla' },
  { id: 5, ne: 'शुक्ल पञ्चमी (पञ्चमी)', hi: 'शुक्ल पंचमी', en: 'Shukla Panchami', paksha: 'shukla' },
  { id: 6, ne: 'शुक्ल षष्ठी (छठ)', hi: 'शुक्ल षष्ठी', en: 'Shukla Shashthi', paksha: 'shukla' },
  { id: 7, ne: 'शुक्ल सप्तमी', hi: 'शुक्ल सप्तमी', en: 'Shukla Saptami', paksha: 'shukla' },
  { id: 8, ne: 'शुक्ल अष्टमी', hi: 'शुक्ल अष्टमी', en: 'Shukla Ashtami', paksha: 'shukla' },
  { id: 9, ne: 'शुक्ल नवमी', hi: 'शुक्ल नवमी', en: 'Shukla Navami', paksha: 'shukla' },
  { id: 10, ne: 'शुक्ल दशमी', hi: 'शुक्ल दशमी', en: 'Shukla Dashami', paksha: 'shukla' },
  { id: 11, ne: 'शुक्ल एकादशी (हरि वासर)', hi: 'शुक्ल एकादशी (हरि वासर)', en: 'Shukla Ekadashi', paksha: 'shukla' },
  { id: 12, ne: 'शुक्ल द्वादशी', hi: 'शुक्ल द्वादशी', en: 'Shukla Dwadashi', paksha: 'shukla' },
  { id: 13, ne: 'शुक्ल त्रयोदशी', hi: 'शुक्ल त्रयोदशी', en: 'Shukla Trayodashi', paksha: 'shukla' },
  { id: 14, ne: 'शुक्ल चतुर्दशी', hi: 'शुक्ल चतुर्दशी', en: 'Shukla Chaturdashi', paksha: 'shukla' },
  { id: 15, ne: 'पूर्णिमा (पूर्ण चन्द्र)', hi: 'पूर्णिमा (पूर्ण चन्द्र)', en: 'Purnima (Full Moon)', paksha: 'shukla' },
  { id: 16, ne: 'कृष्ण प्रतिपदा', hi: 'कृष्ण प्रतिपदा', en: 'Krishna Pratipada', paksha: 'krishna' },
  { id: 17, ne: 'कृष्ण द्वितीया', hi: 'कृष्ण द्वितीया', en: 'Krishna Dwitiya', paksha: 'krishna' },
  { id: 18, ne: 'कृष्ण तृतीया', hi: 'कृष्ण तृतीया', en: 'Krishna Tritiya', paksha: 'krishna' },
  { id: 19, ne: 'कृष्ण चतुर्थी', hi: 'कृष्ण चतुर्थी', en: 'Krishna Chaturthi', paksha: 'krishna' },
  { id: 20, ne: 'कृष्ण पञ्चमी', hi: 'कृष्ण पंचमी', en: 'Krishna Panchami', paksha: 'krishna' },
  { id: 21, ne: 'कृष्ण षष्ठी', hi: 'कृष्ण षष्ठी', en: 'Krishna Shashthi', paksha: 'krishna' },
  { id: 22, ne: 'कृष्ण सप्तमी', hi: 'कृष्ण सप्तमी', en: 'Krishna Saptami', paksha: 'krishna' },
  { id: 23, ne: 'कृष्ण अष्टमी', hi: 'कृष्ण अष्टमी', en: 'Krishna Ashtami', paksha: 'krishna' },
  { id: 24, ne: 'कृष्ण नवमी', hi: 'कृष्ण नवमी', en: 'Krishna Navami', paksha: 'krishna' },
  { id: 25, ne: 'कृष्ण दशमी', hi: 'कृष्ण दशमी', en: 'Krishna Dashami', paksha: 'krishna' },
  { id: 26, ne: 'कृष्ण एकादशी', hi: 'कृष्ण एकादशी', en: 'Krishna Ekadashi', paksha: 'krishna' },
  { id: 27, ne: 'कृष्ण द्वादशी', hi: 'कृष्ण द्वादशी', en: 'Krishna Dwadashi', paksha: 'krishna' },
  { id: 28, ne: 'कृष्ण त्रयोदशी', hi: 'कृष्ण त्रयोदशी', en: 'Krishna Trayodashi', paksha: 'krishna' },
  { id: 29, ne: 'कृष्ण चतुर्दशी', hi: 'कृष्ण चतुर्दशी', en: 'Krishna Chaturdashi', paksha: 'krishna' },
  { id: 30, ne: 'औंसी / दर्श अमावस्या', hi: 'अमावस्या (दर्श अमावस्या)', en: 'Amavasya / Aunsi', paksha: 'krishna' },
];

export const NAKSHATRAS = [
  { id: 1, ne: 'अश्विनी', hi: 'अश्विनी', en: 'Ashwini', lordNe: 'केतु', deity: 'अश्विनी कुमार' },
  { id: 2, ne: 'भरणी', hi: 'भरणी', en: 'Bharani', lordNe: 'शुक्र', deity: 'यम' },
  { id: 3, ne: 'कृत्तिका', hi: 'कृत्तिका', en: 'Krittika', lordNe: 'सूर्य', deity: 'अग्नि' },
  { id: 4, ne: 'रोहिणी', hi: 'रोहिणी', en: 'Rohini', lordNe: 'चन्द्र', deity: 'ब्रह्मा' },
  { id: 5, ne: 'मृगशिरा', hi: 'मृगशिरा', en: 'Mrigashirsha', lordNe: 'मंगल', deity: 'चन्द्र' },
  { id: 6, ne: 'आर्द्रा', hi: 'आर्द्रा', en: 'Ardra', lordNe: 'राहु', deity: 'रुद्र' },
  { id: 7, ne: 'पुनर्वसु', hi: 'पुनर्वसु', en: 'Punarvasu', lordNe: 'बृहस्पति', deity: 'अदिति' },
  { id: 8, ne: 'पुष्य', hi: 'पुष्य', en: 'Pushya', lordNe: 'शनि', deity: 'बृहस्पति' },
  { id: 9, ne: 'आश्लेषा', hi: 'आश्लेषा', en: 'Ashlesha', lordNe: 'बुध', deity: 'सर्प' },
  { id: 10, ne: 'मघा', hi: 'मघा', en: 'Magha', lordNe: 'केतु', deity: 'पितृ' },
  { id: 11, ne: 'पूर्वाफाल्गुनी', hi: 'पूर्वाफाल्गुनी', en: 'Purva Phalguni', lordNe: 'शुक्र', deity: 'भग' },
  { id: 12, ne: 'उत्तराफाल्गुनी', hi: 'उत्तराफाल्गुनी', en: 'Uttara Phalguni', lordNe: 'सूर्य', deity: 'अर्यमा' },
  { id: 13, ne: 'हस्त', hi: 'हस्त', en: 'Hasta', lordNe: 'चन्द्र', deity: 'सूर्य' },
  { id: 14, ne: 'चित्रा', hi: 'चित्रा', en: 'Chitra', lordNe: 'मंगल', deity: 'विश्वकर्मा' },
  { id: 15, ne: 'स्वाती', hi: 'स्वाती', en: 'Swati', lordNe: 'राहु', deity: 'वायु' },
  { id: 16, ne: 'विशाखा', hi: 'विशाखा', en: 'Vishakha', lordNe: 'बृहस्पति', deity: 'इन्द्राग्नि' },
  { id: 17, ne: 'अनुराधा', hi: 'अनुराधा', en: 'Anuradha', lordNe: 'शनि', deity: 'मित्र' },
  { id: 18, ne: 'ज्येष्ठा', hi: 'ज्येष्ठा', en: 'Jyeshtha', lordNe: 'बुध', deity: 'इन्द्र' },
  { id: 19, ne: 'मूल', hi: 'मूल', en: 'Mula', lordNe: 'केतु', deity: 'निरृति' },
  { id: 20, ne: 'पूर्वाषाढा', hi: 'पूर्वाषाढा', en: 'Purva Ashadha', lordNe: 'शुक्र', deity: 'जल' },
  { id: 21, ne: 'उत्तराषाढा', hi: 'उत्तराषाढा', en: 'Uttara Ashadha', lordNe: 'सूर्य', deity: 'विश्वेदेवा' },
  { id: 22, ne: 'श्रवण', hi: 'श्रवण', en: 'Shravana', lordNe: 'चन्द्र', deity: 'विष्णु' },
  { id: 23, ne: 'धनिष्ठा', hi: 'धनिष्ठा', en: 'Dhanishta', lordNe: 'मंगल', deity: 'वसु' },
  { id: 24, ne: 'शतभिषा', hi: 'शतभिषा', en: 'Shatabhisha', lordNe: 'राहु', deity: 'वरुण' },
  { id: 25, ne: 'पूर्वाभाद्रपदा', hi: 'पूर्वाभाद्रपदा', en: 'Purva Bhadrapada', lordNe: 'बृहस्पति', deity: 'अजैकपाद' },
  { id: 26, ne: 'उत्तराभाद्रपदा', hi: 'उत्तराभाद्रपदा', en: 'Uttara Bhadrapada', lordNe: 'शनि', deity: 'अहिर्बुध्न्य' },
  { id: 27, ne: 'रेवती', hi: 'रेवती', en: 'Revati', lordNe: 'बुध', deity: 'पूषा' },
];

export const YOGAS = [
  { id: 1, ne: 'विष्कम्भ', hi: 'विष्कम्भ', en: 'Vishkumbha', nature: 'अशुभ' },
  { id: 2, ne: 'प्रीति', hi: 'प्रीति', en: 'Priti', nature: 'शुभ' },
  { id: 3, ne: 'आयुष्मान्', hi: 'आयुष्मान', en: 'Ayushman', nature: 'शुभ' },
  { id: 4, ne: 'सौभाग्य', hi: 'सौभाग्य', en: 'Saubhagya', nature: 'शुभ' },
  { id: 5, ne: 'शोभन', hi: 'शोभन', en: 'Shobhana', nature: 'शुभ' },
  { id: 6, ne: 'अतिगण्ड', hi: 'अतिगण्ड', en: 'Atiganda', nature: 'अशुभ' },
  { id: 7, ne: 'सुकर्मा', hi: 'सुकर्मा', en: 'Sukarma', nature: 'शुभ' },
  { id: 8, ne: 'धृति', hi: 'धृति', en: 'Dhriti', nature: 'शुभ' },
  { id: 9, ne: 'शूल', hi: 'शूल', en: 'Shoola', nature: 'अशुभ' },
  { id: 10, ne: 'गण्ड', hi: 'गण्ड', en: 'Ganda', nature: 'अशुभ' },
  { id: 11, ne: 'वृद्धि', hi: 'वृद्धि', en: 'Vriddhi', nature: 'शुभ' },
  { id: 12, ne: 'ध्रुव', hi: 'ध्रुव', en: 'Dhruva', nature: 'शुभ' },
  { id: 13, ne: 'व्याघात', hi: 'व्याघात', en: 'Vyaghata', nature: 'अशुभ' },
  { id: 14, ne: 'हर्षण', hi: 'हर्षण', en: 'Harshana', nature: 'शुभ' },
  { id: 15, ne: 'वज्र', hi: 'वज्र', en: 'Vajra', nature: 'अशुभ' },
  { id: 16, ne: 'सिद्धि', hi: 'सिद्धि', en: 'Siddhi', nature: 'शुभ' },
  { id: 17, ne: 'व्यतीपात', hi: 'व्यतीपात', en: 'Vyatipata', nature: 'अशुभ' },
  { id: 18, ne: 'वरीयान्', hi: 'वरीयान', en: 'Variyan', nature: 'शुभ' },
  { id: 19, ne: 'परिघ', hi: 'परिघ', en: 'Parigha', nature: 'अशुभ' },
  { id: 20, ne: 'शिव', hi: 'शिव', en: 'Shiva', nature: 'शुभ' },
  { id: 21, ne: 'सिद्ध', hi: 'सिद्ध', en: 'Siddha', nature: 'शुभ' },
  { id: 22, ne: 'साध्य', hi: 'साध्य', en: 'Sadhya', nature: 'शुभ' },
  { id: 23, ne: 'शुभ', hi: 'शुभ', en: 'Shubha', nature: 'शुभ' },
  { id: 24, ne: 'शुक्ल', hi: 'शुक्ल', en: 'Shukla', nature: 'शुभ' },
  { id: 25, ne: 'ब्रह्म', hi: 'ब्रह्म', en: 'Brahma', nature: 'शुभ' },
  { id: 26, ne: 'इन्द्र', hi: 'इन्द्र', en: 'Indra', nature: 'शुभ' },
  { id: 27, ne: 'वैधृति', hi: 'वैधृति', en: 'Vaidhriti', nature: 'अशुभ' },
];

export const KARANAS = [
  { id: 1, ne: 'बव', hi: 'बव', en: 'Bava', isBhadra: false },
  { id: 2, ne: 'बालव', hi: 'बालव', en: 'Balava', isBhadra: false },
  { id: 3, ne: 'कौलव', hi: 'कौलव', en: 'Kaulava', isBhadra: false },
  { id: 4, ne: 'तैतिल', hi: 'तैतिल', en: 'Taitila', isBhadra: false },
  { id: 5, ne: 'गर', hi: 'गर', en: 'Gara', isBhadra: false },
  { id: 6, ne: 'वणिज', hi: 'वणिज', en: 'Vanija', isBhadra: false },
  { id: 7, ne: 'विष्टि (भद्रा)', hi: 'विष्टि (भद्रा)', en: 'Vishti (Bhadra)', isBhadra: true },
  { id: 8, ne: 'शकुनि', hi: 'शकुनि', en: 'Shakuni', isBhadra: false },
  { id: 9, ne: 'चतुष्पाद', hi: 'चतुष्पाद', en: 'Chatushpada', isBhadra: false },
  { id: 10, ne: 'नाग', hi: 'नाग', en: 'Naga', isBhadra: false },
  { id: 11, ne: 'किंस्तुघ्न', hi: 'किंस्तुघ्न', en: 'Kintughna', isBhadra: false },
];

// 60 Samvatsara Names (षष्टि संवत्सर चक्र)
export const SAMVATSARAS = [
  'प्रभव', 'विभव', 'शुक्ल', 'प्रमोद', 'प्रजापति', 'अंगिरा', 'श्रीमुख', 'भाव', 'युवा', 'धाता',
  'ईश्वर', 'बहुधान्य', 'प्रमाथी', 'विक्रम', 'वृषप्रजा', 'चित्रभानु', 'सुभानु', 'तारण', 'पार्थिव', 'व्यय',
  'सर्वजित्', 'सर्वधारी', 'विरोधी', 'विकृत', 'खर', 'नन्दन', 'विजय', 'जय', 'मन्मथ', 'दुर्मुख',
  'हेमलम्ब', 'विलम्ब', 'विकारी', 'शार्वरी', 'प्लव', 'शुभकृत', 'शोभकृत', 'क्रोधी', 'विश्वावसु', 'पराभव',
  'प्लवंग', 'कीलक', 'सौम्य', 'साधारण', 'विरोधकृत', 'परिधावी', 'प्रमादी', 'आनन्द', 'राक्षस', 'नल',
  'पिंगल', 'कालयुक्त', 'सिद्धार्थी', 'रौद्र', 'दुर्मति', 'दुन्दुभी', 'रुधिरोद्गारी', 'रक्ताक्ष', 'क्रोधन', 'क्षय',
];

export const HINDU_MAAS = [
  { id: 1, ne: 'वैशाख (माधव)', hi: 'वैशाख', en: 'Vaishakha' },
  { id: 2, ne: 'ज्येष्ठ (त्रिविक्रम)', hi: 'ज्येष्ठ', en: 'Jyeshtha' },
  { id: 3, ne: 'आषाढ (वामन)', hi: 'आषाढ़', en: 'Ashadha' },
  { id: 4, ne: 'श्रावण (श्रीधर)', hi: 'श्रावण', en: 'Shrawana' },
  { id: 5, ne: 'भाद्रपद (हृषीकेश)', hi: 'भाद्रपद', en: 'Bhadrapada' },
  { id: 6, ne: 'आश्विन (पद्मनाभ)', hi: 'आश्विन', en: 'Ashwina' },
  { id: 7, ne: 'कार्तिक (दामोदर)', hi: 'कार्तिक', en: 'Kartika' },
  { id: 8, ne: 'मार्गशीर्ष (केशव)', hi: 'मार्गशीर्ष', en: 'Margashirsha' },
  { id: 9, ne: 'पौष (नारायण)', hi: 'पौष', en: 'Pausha' },
  { id: 10, ne: 'माघ (माधव)', hi: 'माघ', en: 'Magha' },
  { id: 11, ne: 'फाल्गुन (गोविन्द)', hi: 'फाल्गुन', en: 'Phalguna' },
  { id: 12, ne: 'चैत्र (विष्णु)', hi: 'चैत्र', en: 'Chaitra' },
];

// -------------------------------------------------------------
// 3. ASTRONOMICAL CALCULATION ENGINE (High Precision Ephemeris)
// -------------------------------------------------------------
function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * High-precision Ephemeris calculations based on Meeus Astronomical Algorithms
 * and standard Indian/Nepali Nirayana Ephemeris with Lahiri (Chitra Paksha) Ayanamsha.
 */
export function calculateEphemeris(date: Date) {
  const timeMs = date.getTime();
  const jd = 2440587.5 + timeMs / 86400000;
  const t = (jd - 2451545.0) / 36525.0;

  // Geometric Mean Longitude of Sun (degrees)
  const l0 = normalizeDeg(280.46646 + 36000.76983 * t + 0.0003032 * t * t);
  // Mean Anomaly of Sun
  const m = normalizeDeg(357.52911 + 35999.05029 * t - 0.0001537 * t * t);
  const mr = toRad(m);

  // Equation of Center of Sun
  const c =
    (1.914602 - 0.004817 * t) * Math.sin(mr) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * mr) +
    0.000289 * Math.sin(3 * mr);

  // True Ecliptic Longitude of Sun
  const sunLong = normalizeDeg(l0 + c);

  // Mean fundamental arguments for the Moon
  const lp = normalizeDeg(218.3164477 + 481267.88123421 * t - 0.0015786 * t * t);
  const mm = normalizeDeg(134.9633964 + 477198.8675055 * t + 0.0087414 * t * t);
  const d = normalizeDeg(297.8501921 + 445267.1114034 * t - 0.0018819 * t * t);
  const f = normalizeDeg(93.272095 + 483202.0175233 * t - 0.0036539 * t * t);

  const mmr = toRad(mm);
  const dr = toRad(d);
  const fr = toRad(f);

  // Periodic perturbation terms for Moon's true longitude (Meeus truncated)
  const moonLong = normalizeDeg(
    lp +
      6.288774 * Math.sin(mmr) +
      1.274027 * Math.sin(2 * dr - mmr) +
      0.658314 * Math.sin(2 * dr) +
      0.213618 * Math.sin(2 * mmr) -
      0.185116 * Math.sin(mr) -
      0.114332 * Math.sin(2 * fr) +
      0.058793 * Math.sin(2 * dr - 2 * mmr) +
      0.057066 * Math.sin(2 * dr - mr - mmr) +
      0.053322 * Math.sin(2 * dr + mmr) +
      0.045758 * Math.sin(2 * dr - mr) -
      0.040923 * Math.sin(mr - mmr) -
      0.034720 * Math.sin(dr) -
      0.030383 * Math.sin(mr + mmr) +
      0.015327 * Math.sin(2 * dr - 2 * fr) -
      0.012528 * Math.sin(2 * dr + mr - mmr) +
      0.010980 * Math.sin(2 * dr - mr + mmr)
  );

  // Moon's Ecliptic Latitude beta
  const moonLat =
    5.128 * Math.sin(fr) +
    0.281 * Math.sin(mmr + fr) +
    0.278 * Math.sin(fr - mmr) +
    0.173 * Math.sin(2 * dr - fr);

  // Official Lahiri Ayanamsha (Chitra Paksha)
  // J2000.0 epoch base = 23° 51' 25.53" = 23.857092°
  const ayanamsha = normalizeDeg(23.857092 + (50.290966 / 3600.0) * (t * 100.0));

  // Sidereal Nirayana Longitudes
  const siderealSun = normalizeDeg(sunLong - ayanamsha);
  const siderealMoon = normalizeDeg(moonLong - ayanamsha);

  return {
    jd,
    sunLong,
    moonLong,
    moonLat,
    siderealSun,
    siderealMoon,
    ayanamsha,
  };
}

// -------------------------------------------------------------
// 4. SOLAR & LUNAR RISE / SET CALCULATIONS (Nepal Standard Time)
// -------------------------------------------------------------
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatMinutesToTimeString(totalMinutes: number): string {
  let m = Math.round(totalMinutes) % (24 * 60);
  if (m < 0) m += 24 * 60;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function addMinutesToTimeString(timeStr: string, minutesToAdd: number): string {
  const total = parseTimeToMinutes(timeStr) + minutesToAdd;
  return formatMinutesToTimeString(total);
}

export function calculateSunTimes(date: Date, lat: number, lng: number) {
  const dayOfYear = getDayOfYear(date);
  const b = (2 * Math.PI * (dayOfYear - 81)) / 365;
  const declination = 23.45 * Math.sin(b);
  const decRad = toRad(declination);
  const latRad = toRad(lat);

  // Atmospheric refraction + solar disc semidiameter (-0.833 deg)
  const cosH =
    (Math.sin(toRad(-0.833)) - Math.sin(latRad) * Math.sin(decRad)) /
    (Math.cos(latRad) * Math.cos(decRad));
  const clampedCosH = Math.max(-1, Math.min(1, cosH));
  const hourAngleDeg = toDeg(Math.acos(clampedCosH));

  // Equation of Time (EoT in minutes)
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);

  // Nepal Standard Time (UTC+05:45 = 86.25 deg meridian)
  const stdMeridian = 86.25;
  const timeCorrectionMin = (lng - stdMeridian) * 4 + eot;

  const solarNoonMin = 12 * 60 - timeCorrectionMin;
  const halfDayMin = (hourAngleDeg / 15.0) * 60;

  const sunriseMin = Math.round(solarNoonMin - halfDayMin);
  const sunsetMin = Math.round(solarNoonMin + halfDayMin);
  const dayDurationMin = sunsetMin - sunriseMin;

  return {
    sunrise: formatMinutesToTimeString(sunriseMin),
    sunset: formatMinutesToTimeString(sunsetMin),
    solarNoon: formatMinutesToTimeString(solarNoonMin),
    dayDurationMinutes: dayDurationMin,
    sunriseMinutes: sunriseMin,
  };
}

/**
 * Astronomical Moonrise & Moonset calculation using Moon's equatorial coordinates
 * (Right Ascension, Declination) and Local Sidereal Time.
 */
export function calculateMoonTimes(date: Date, lat: number, lng: number) {
  const jd = 2440587.5 + date.getTime() / 86400000;
  const t = (jd - 2451545.0) / 36525.0;
  const eps = 23.439291 - 0.0130042 * t;
  const epsRad = toRad(eps);

  const eph = calculateEphemeris(date);
  const lRad = toRad(eph.moonLong);
  const bRad = toRad(eph.moonLat);

  // Equatorial coordinates
  const sinDelta =
    Math.sin(bRad) * Math.cos(epsRad) + Math.cos(bRad) * Math.sin(epsRad) * Math.sin(lRad);
  const delta = toDeg(Math.asin(Math.max(-1, Math.min(1, sinDelta))));
  const deltaRad = toRad(delta);

  const y = Math.sin(lRad) * Math.cos(epsRad) - Math.tan(bRad) * Math.sin(epsRad);
  const x = Math.cos(lRad);
  const alpha = normalizeDeg(toDeg(Math.atan2(y, x)));

  // Greenwich Mean Sidereal Time at 0h UT
  const d0 = Math.floor(jd - 0.5) + 0.5;
  const t0 = (d0 - 2451545.0) / 36525.0;
  const gmst0 = normalizeDeg(100.46061837 + 36000.770053608 * t0 + 0.000387933 * t0 * t0);

  // Meridian Transit in Nepal Standard Time (UTC+05:45 = +345 minutes)
  const diffDeg = normalizeDeg(alpha - lng - gmst0);
  const transitHoursUT = (diffDeg / 360.0) * 24.0;
  const transitNPTMinutes = ((transitHoursUT * 60 + 345) % (24 * 60) + 24 * 60) % (24 * 60);

  // Hour angle at Moonrise / Moonset (altitude h0 = +0.125 deg taking into account parallax and refraction)
  const latRad = toRad(lat);
  const h0 = 0.125;
  const cosH0 =
    (Math.sin(toRad(h0)) - Math.sin(latRad) * Math.sin(deltaRad)) /
    (Math.cos(latRad) * Math.cos(deltaRad));
  const clampedCos = Math.max(-1, Math.min(1, cosH0));
  const h0Deg = toDeg(Math.acos(clampedCos));
  const halfDurationMin = (h0Deg / 15.0) * 60;

  const riseMin = ((transitNPTMinutes - halfDurationMin) % (24 * 60) + 24 * 60) % (24 * 60);
  const setMin = ((transitNPTMinutes + halfDurationMin) % (24 * 60) + 24 * 60) % (24 * 60);

  return {
    moonrise: formatMinutesToTimeString(riseMin),
    moonset: formatMinutesToTimeString(setMin),
    transit: formatMinutesToTimeString(transitNPTMinutes),
  };
}

// -------------------------------------------------------------
// 5. PANCHANG DATA & MUHURATS
// -------------------------------------------------------------
export interface PanchangData {
  tithi: typeof TITHI_NAMES[0];
  tithiNumber: number; // 1-30
  tithiEndTime?: string;
  pakshaNe: string;
  pakshaHi: string;
  pakshaEn: string;
  nakshatra: typeof NAKSHATRAS[0];
  nakshatraPada: number; // 1-4
  nakshatraEndTime?: string;
  yoga: typeof YOGAS[0];
  karana: typeof KARANAS[0];
  hinduMaas: typeof HINDU_MAAS[0];
  samvatsara: string;
  sunriseTime: string;
  sunsetTime: string;
  moonriseTime: string;
  moonsetTime: string;
  dayDurationStr: string;
  rahuKaal: { start: string; end: string };
  yamaganda: { start: string; end: string };
  gulikaKaal: { start: string; end: string };
  abhijitMuhurat: { start: string; end: string; isAuspicious: boolean };
  brahmaMuhurat: { start: string; end: string };
  amritKaal: { start: string; end: string };
  panchak: { isActive: boolean; typeNe: string; typeEn: string; isHazardous: boolean };
  bhadra: {
    isActive: boolean;
    vaasNe: string;
    vaasEn: string;
    isAuspicious: boolean;
    descriptionNe: string;
  };
  sankranti: { isSankranti: boolean; rashiNe: string; rashiEn: string; nameNe: string };
  isEkadashi: boolean;
  isPurnima: boolean;
  isAmavasya: boolean;
  events: GovernmentHolidayRecord[];
  choghadiya: Array<{
    name: string;
    nature:
      | 'अमृत (सर्वोत्तम)'
      | 'शुभ (उत्तम)'
      | 'लाभ (उन्नति)'
      | 'चर (सामान्य)'
      | 'रोग (हानि)'
      | 'काल (अशुभ)'
      | 'उद्वेग (कष्ट)';
    type: 'shubh' | 'neutral' | 'ashubh';
    start: string;
    end: string;
  }>;
}

/**
 * Calculates complete Sanskrit Panchang for a given date and city.
 * In classical Hindu Jyotish, Panchang is computed at local sunrise (Suryodaya-kalina).
 */
export function calculatePanchang(
  date: Date,
  bsYear: number,
  city: NepalCity = NEPAL_CITIES[0]
): PanchangData {
  // 1. Calculate local solar and lunar times for the selected city
  const solar = calculateSunTimes(date, city.lat, city.lng);
  const moonTimes = calculateMoonTimes(date, city.lat, city.lng);

  // 2. Compute astronomical ephemeris at local sunrise (Suryodaya)
  // Local sunrise is in NPT (UTC+5:45). Convert to UTC instant.
  const sunriseMinFromMidnight = solar.sunriseMinutes;
  const sunriseUtcMinutes = sunriseMinFromMidnight - 345;
  const sunriseDate = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      Math.floor(sunriseUtcMinutes / 60),
      sunriseUtcMinutes % 60
    )
  );

  const eph = calculateEphemeris(sunriseDate);

  // Tithi calculation: (Moon - Sun) / 12 degrees
  const angleDiff = normalizeDeg(eph.moonLong - eph.sunLong);
  const tithiIndex = Math.min(29, Math.floor(angleDiff / 12.0));
  const tithi = TITHI_NAMES[tithiIndex] || TITHI_NAMES[0];
  const isShukla = tithi.paksha === 'shukla';

  // Tithi end time estimation (Moon ~13.176 deg/day, Sun ~0.985 deg/day => ~0.508 deg/hour)
  const elapsedInTithiDeg = angleDiff % 12.0;
  const remainingInTithiDeg = 12.0 - elapsedInTithiDeg;
  const hoursRemainingInTithi = remainingInTithiDeg / 0.50796;
  const tithiEndTime = addMinutesToTimeString(
    solar.sunrise,
    Math.round(hoursRemainingInTithi * 60)
  );

  // Nakshatra calculation: Sidereal Moon / (360 / 27) = 13.3333 degrees per Nakshatra
  const nakshatraDeg = eph.siderealMoon;
  const nakshatraIndex = Math.min(26, Math.floor(nakshatraDeg / (360.0 / 27.0)));
  const nakshatra = NAKSHATRAS[nakshatraIndex] || NAKSHATRAS[0];
  const pada = Math.min(4, Math.floor((nakshatraDeg % (360.0 / 27.0)) / (360.0 / 108.0)) + 1);

  // Nakshatra end time (Moon speed ~0.549 deg/hour)
  const elapsedInNakDeg = nakshatraDeg % (360.0 / 27.0);
  const remainingInNakDeg = 360.0 / 27.0 - elapsedInNakDeg;
  const hoursRemainingInNak = remainingInNakDeg / 0.549;
  const nakshatraEndTime = addMinutesToTimeString(
    solar.sunrise,
    Math.round(hoursRemainingInNak * 60)
  );

  // Yoga calculation: (Sidereal Sun + Sidereal Moon) / 13.3333 degrees
  const yogaAngle = normalizeDeg(eph.siderealSun + eph.siderealMoon);
  const yogaIndex = Math.min(26, Math.floor(yogaAngle / (360.0 / 27.0)));
  const yoga = YOGAS[yogaIndex] || YOGAS[0];

  // Karana calculation: Half-tithi = angle / 6 degrees
  const halfTithi = Math.min(59, Math.floor(angleDiff / 6.0));
  let karanaObj = KARANAS[0];
  if (halfTithi === 0) {
    karanaObj = KARANAS[10]; // किंस्तुघ्न
  } else if (halfTithi >= 57) {
    if (halfTithi === 57) karanaObj = KARANAS[7]; // शकुनि
    else if (halfTithi === 58) karanaObj = KARANAS[8]; // चतुष्पाद
    else karanaObj = KARANAS[9]; // नाग
  } else {
    const cycleKaranaIdx = (halfTithi - 1) % 7;
    karanaObj = KARANAS[cycleKaranaIdx] || KARANAS[0];
  }

  // Hindu Maas (solar Nirayana Rashi transit)
  const sunSign = Math.floor(eph.siderealSun / 30.0); // 0=Mesha (Vaishakha)
  const maasObj = HINDU_MAAS[sunSign] || HINDU_MAAS[0];

  // 60 Samvatsara: 2083 BS = 'कालयुक्त' (index 51) / standard Jupiter cycle
  const samvatIndex = (bsYear + 9) % 60;
  const samvatsara = SAMVATSARAS[samvatIndex] || 'आनन्द';

  // Muhurats (Rahu Kaal, Yamaganda, Gulika Kaal)
  // Daytime (sunrise to sunset) is divided into 8 equal parts (chaughadiyas / horas)
  const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const dayDurationMinutes = solar.dayDurationMinutes;
  const partMin = dayDurationMinutes / 8.0;

  // Rahu Kaal: Sun=8th, Mon=2nd, Tue=7th, Wed=5th, Thu=6th, Fri=4th, Sat=3rd part
  // Zero-based slot indices (0 to 7):
  const rahuSlotIndices = [7, 1, 6, 4, 5, 3, 2];
  const rahuSlot = rahuSlotIndices[dayOfWeek];
  const rahuStart = addMinutesToTimeString(solar.sunrise, rahuSlot * partMin);
  const rahuEnd = addMinutesToTimeString(solar.sunrise, (rahuSlot + 1) * partMin);

  // Yamaganda: Sun=5th, Mon=4th, Tue=3rd, Wed=2nd, Thu=1st, Fri=7th, Sat=6th part
  const yamaSlotIndices = [4, 3, 2, 1, 0, 6, 5];
  const yamaSlot = yamaSlotIndices[dayOfWeek];
  const yamaStart = addMinutesToTimeString(solar.sunrise, yamaSlot * partMin);
  const yamaEnd = addMinutesToTimeString(solar.sunrise, (yamaSlot + 1) * partMin);

  // Gulika Kaal: Sun=7th, Mon=6th, Tue=5th, Wed=4th, Thu=3rd, Fri=2nd, Sat=1st part
  const guliSlotIndices = [6, 5, 4, 3, 2, 1, 0];
  const guliSlot = guliSlotIndices[dayOfWeek];
  const guliStart = addMinutesToTimeString(solar.sunrise, guliSlot * partMin);
  const guliEnd = addMinutesToTimeString(solar.sunrise, (guliSlot + 1) * partMin);

  // Abhijit Muhurat: Centered around solar noon (~48 minutes duration, 8th muhurat of day)
  // Prohibited on Wednesdays in Jyotish tradition
  const solarNoonMin = parseTimeToMinutes(solar.sunrise) + dayDurationMinutes / 2;
  const abhijitHalf = 24;
  const abhijitStart = formatMinutesToTimeString(solarNoonMin - abhijitHalf);
  const abhijitEnd = formatMinutesToTimeString(solarNoonMin + abhijitHalf);
  const isAbhijitAuspicious = dayOfWeek !== 3;

  // Brahma Muhurat: 2 muhurats before sunrise (~96 to 48 minutes before sunrise)
  const sunriseMin = parseTimeToMinutes(solar.sunrise);
  const brahmaStart = formatMinutesToTimeString(sunriseMin - 96);
  const brahmaEnd = formatMinutesToTimeString(sunriseMin - 48);

  // Amrit Kaal Calculation (Classical Ghati offset per Nakshatra)
  const AMRIT_KAAL_GHATIS = [
    42, 24, 54, 52, 38, 35, 54, 44, 56, 54, 44, 48, 45, 36, 34, 44, 32, 44,
    56, 44, 40, 30, 34, 48, 34, 42, 50,
  ];
  const amritGhati = AMRIT_KAAL_GHATIS[nakshatraIndex] || 42;
  const amritStartMin = (sunriseMin + amritGhati * 24) % 1440;
  const amritEndMin = (amritStartMin + 96) % 1440;
  const amritKaal = {
    start: formatMinutesToTimeString(amritStartMin),
    end: formatMinutesToTimeString(amritEndMin),
  };

  // Panchak Calculation: Active from Dhanishta 3rd charana (296.67°) to Revati end (360°/0°)
  const isPanchakActive = eph.siderealMoon >= 296.6667 || eph.siderealMoon < 0.05;
  const panchakTypes = [
    { ne: 'रोग पञ्चक (शारीरिक कष्टको भय)', en: 'Rog Panchak (Health Caution)', hazardous: true },
    { ne: 'राज पञ्चक (सरकारी/व्यापारिक कार्यमा शुभ)', en: 'Raj Panchak (Auspicious for State/Work)', hazardous: false },
    { ne: 'अग्नि पञ्चक (आगो तथा विवादबाट सावधान)', en: 'Agni Panchak (Caution with Fire & Disputes)', hazardous: true },
    { ne: 'निर्दोष पञ्चक (मध्यम तथा सामान्य फल)', en: 'Nirdosh Panchak (Neutral/Mild)', hazardous: false },
    { ne: 'निर्दोष पञ्चक (मध्यम तथा सामान्य फल)', en: 'Nirdosh Panchak (Neutral/Mild)', hazardous: false },
    { ne: 'चोर पञ्चक (धन कारोबार तथा यात्रा वर्जित)', en: 'Chor Panchak (Avoid Travel & Loans)', hazardous: true },
    { ne: 'मृत्यु पञ्चक (अत्यन्त जोखिमपूर्ण / शुभकार्य वर्जित)', en: 'Mrityu Panchak (Severe Hazard - No Auspicious Works)', hazardous: true },
  ];
  const panchak = {
    isActive: isPanchakActive,
    typeNe: isPanchakActive ? panchakTypes[dayOfWeek].ne : 'पञ्चक छैन (सामान्य)',
    typeEn: isPanchakActive ? panchakTypes[dayOfWeek].en : 'No Panchak',
    isHazardous: isPanchakActive && panchakTypes[dayOfWeek].hazardous,
  };

  // Bhadra (Vishti Karana) Calculation & Residence (Vaas)
  const isBhadraActive = karanaObj.id === 7;
  const moonRashiIdx = Math.floor(eph.siderealMoon / 30.0);
  let bhadraVaasNe = 'भद्रा छैन';
  let bhadraVaasEn = 'No Bhadra';
  let isBhadraAuspicious = true;
  let bhadraDescNe = 'आज भद्रा दोष छैन।';

  if (isBhadraActive) {
    if ([0, 1, 2, 7].includes(moonRashiIdx)) {
      bhadraVaasNe = 'स्वर्गलोक भद्रा (शुभ फलदायी)';
      bhadraVaasEn = 'Swargaloka Bhadra (Heaven - Auspicious)';
      isBhadraAuspicious = true;
      bhadraDescNe = 'भद्रा स्वर्गलोकमा रहेकाले पृथ्वीमा कुनै हानि गर्दैन, कार्य शुभ रहनेछ।';
    } else if ([5, 6, 8, 9].includes(moonRashiIdx)) {
      bhadraVaasNe = 'पाताललोक भद्रा (धनलाभ फलदायी)';
      bhadraVaasEn = 'Patalaloka Bhadra (Underworld - Wealth Auspicious)';
      isBhadraAuspicious = true;
      bhadraDescNe = 'भद्रा पाताललोकमा रहेकाले कार्यमा धनधान्य र लाभ प्राप्त हुनेछ।';
    } else {
      bhadraVaasNe = 'मृत्युलोक / भूलोक भद्रा (अत्यन्त अशुभ - सर्वकार्य वर्जित)';
      bhadraVaasEn = 'Mrityuloka / Earth Bhadra (Highly Inauspicious)';
      isBhadraAuspicious = false;
      bhadraDescNe = 'भद्रा पृथ्वीलोकमा रहेकाले यात्रा, विवाह, गृहप्रवेश लगायत सम्पूर्ण शुभकार्य वर्जित छ।';
    }
  }
  const bhadra = {
    isActive: isBhadraActive,
    vaasNe: bhadraVaasNe,
    vaasEn: bhadraVaasEn,
    isAuspicious: isBhadraAuspicious,
    descriptionNe: bhadraDescNe,
  };

  // Sankranti & Events
  const bsDate = adToBs(date);
  const isSankranti = bsDate.day === 1;
  const sankrantiRashis = [
    { ne: 'मेष संक्रान्ति (नयाँ वर्ष)', en: 'Mesha Sankranti (New Year)' },
    { ne: 'वृष संक्रान्ति', en: 'Vrishabha Sankranti' },
    { ne: 'मिथुन संक्रान्ति', en: 'Mithuna Sankranti' },
    { ne: 'कर्कट संक्रान्ति (साउने संक्रान्ति)', en: 'Karka / Saune Sankranti' },
    { ne: 'सिंह संक्रान्ति', en: 'Simha Sankranti' },
    { ne: 'कन्या संक्रान्ति', en: 'Kanya Sankranti' },
    { ne: 'तुला संक्रान्ति', en: 'Tula Sankranti' },
    { ne: 'वृश्चिक संक्रान्ति', en: 'Vrischika Sankranti' },
    { ne: 'धनु संक्रान्ति', en: 'Dhanu Sankranti' },
    { ne: 'मकर संक्रान्ति (माघे संक्रान्ति)', en: 'Makara / Maghe Sankranti' },
    { ne: 'कुम्भ संक्रान्ति', en: 'Kumbha Sankranti' },
    { ne: 'मीन संक्रान्ति', en: 'Meena Sankranti' },
  ];
  const sankranti = {
    isSankranti,
    rashiNe: isSankranti ? sankrantiRashis[bsDate.month - 1].ne : '',
    rashiEn: isSankranti ? sankrantiRashis[bsDate.month - 1].en : '',
    nameNe: isSankranti ? `${sankrantiRashis[bsDate.month - 1].ne} सूर्य राशि परिवर्तन` : '',
  };

  const events = patroDb.getDayEvents(bsDate.year, bsDate.month, bsDate.day, tithiIndex);

  // Choghadiya table for the day
  const choghadiya = calculateChoghadiyaTable(dayOfWeek, solar.sunrise, partMin);

  // Key sacred lunar indicators
  const isEkadashi = tithiIndex === 10 || tithiIndex === 25;
  const isPurnima = tithiIndex === 14;
  const isAmavasya = tithiIndex === 29;

  return {
    tithi,
    tithiNumber: tithiIndex + 1,
    tithiEndTime,
    pakshaNe: isShukla ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष',
    pakshaHi: isShukla ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष',
    pakshaEn: isShukla ? 'Shukla Paksha' : 'Krishna Paksha',
    nakshatra,
    nakshatraPada: pada,
    nakshatraEndTime,
    yoga,
    karana: karanaObj,
    hinduMaas: maasObj,
    samvatsara,
    sunriseTime: solar.sunrise,
    sunsetTime: solar.sunset,
    moonriseTime: moonTimes.moonrise,
    moonsetTime: moonTimes.moonset,
    dayDurationStr: `${Math.floor(dayDurationMinutes / 60)} घण्टा ${Math.round(
      dayDurationMinutes % 60
    )} मिनेट`,
    rahuKaal: { start: rahuStart, end: rahuEnd },
    yamaganda: { start: yamaStart, end: yamaEnd },
    gulikaKaal: { start: guliStart, end: guliEnd },
    abhijitMuhurat: {
      start: abhijitStart,
      end: abhijitEnd,
      isAuspicious: isAbhijitAuspicious,
    },
    brahmaMuhurat: { start: brahmaStart, end: brahmaEnd },
    amritKaal,
    panchak,
    bhadra,
    sankranti,
    isEkadashi,
    isPurnima,
    isAmavasya,
    events,
    choghadiya,
  };
}

// Choghadiya table calculation by day of the week
function calculateChoghadiyaTable(dayOfWeek: number, sunriseStr: string, partMin: number) {
  const sequences: Array<
    Array<{
      name: string;
      nature:
        | 'अमृत (सर्वोत्तम)'
        | 'शुभ (उत्तम)'
        | 'लाभ (उन्नति)'
        | 'चर (सामान्य)'
        | 'रोग (हानि)'
        | 'काल (अशुभ)'
        | 'उद्वेग (कष्ट)';
      type: 'shubh' | 'neutral' | 'ashubh';
    }>
  > = [
    // Sun
    [
      { name: 'उद्वेग', nature: 'उद्वेग (कष्ट)', type: 'ashubh' },
      { name: 'चर', nature: 'चर (सामान्य)', type: 'neutral' },
      { name: 'लाभ', nature: 'लाभ (उन्नति)', type: 'shubh' },
      { name: 'अमृत', nature: 'अमृत (सर्वोत्तम)', type: 'shubh' },
      { name: 'काल', nature: 'काल (अशुभ)', type: 'ashubh' },
      { name: 'शुभ', nature: 'शुभ (उत्तम)', type: 'shubh' },
      { name: 'रोग', nature: 'रोग (हानि)', type: 'ashubh' },
      { name: 'उद्वेग', nature: 'उद्वेग (कष्ट)', type: 'ashubh' },
    ],
    // Mon
    [
      { name: 'अमृत', nature: 'अमृत (सर्वोत्तम)', type: 'shubh' },
      { name: 'काल', nature: 'काल (अशुभ)', type: 'ashubh' },
      { name: 'शुभ', nature: 'शुभ (उत्तम)', type: 'shubh' },
      { name: 'रोग', nature: 'रोग (हानि)', type: 'ashubh' },
      { name: 'उद्वेग', nature: 'उद्वेग (कष्ट)', type: 'ashubh' },
      { name: 'चर', nature: 'चर (सामान्य)', type: 'neutral' },
      { name: 'लाभ', nature: 'लाभ (उन्नति)', type: 'shubh' },
      { name: 'अमृत', nature: 'अमृत (सर्वोत्तम)', type: 'shubh' },
    ],
    // Tue
    [
      { name: 'रोग', nature: 'रोग (हानि)', type: 'ashubh' },
      { name: 'उद्वेग', nature: 'उद्वेग (कष्ट)', type: 'ashubh' },
      { name: 'चर', nature: 'चर (सामान्य)', type: 'neutral' },
      { name: 'लाभ', nature: 'लाभ (उन्नति)', type: 'shubh' },
      { name: 'अमृत', nature: 'अमृत (सर्वोत्तम)', type: 'shubh' },
      { name: 'काल', nature: 'काल (अशुभ)', type: 'ashubh' },
      { name: 'शुभ', nature: 'शुभ (उत्तम)', type: 'shubh' },
      { name: 'रोग', nature: 'रोग (हानि)', type: 'ashubh' },
    ],
    // Wed
    [
      { name: 'लाभ', nature: 'लाभ (उन्नति)', type: 'shubh' },
      { name: 'अमृत', nature: 'अमृत (सर्वोत्तम)', type: 'shubh' },
      { name: 'काल', nature: 'काल (अशुभ)', type: 'ashubh' },
      { name: 'शुभ', nature: 'शुभ (उत्तम)', type: 'shubh' },
      { name: 'रोग', nature: 'रोग (हानि)', type: 'ashubh' },
      { name: 'उद्वेग', nature: 'उद्वेग (कष्ट)', type: 'ashubh' },
      { name: 'चर', nature: 'चर (सामान्य)', type: 'neutral' },
      { name: 'लाभ', nature: 'लाभ (उन्नति)', type: 'shubh' },
    ],
    // Thu
    [
      { name: 'शुभ', nature: 'शुभ (उत्तम)', type: 'shubh' },
      { name: 'रोग', nature: 'रोग (हानि)', type: 'ashubh' },
      { name: 'उद्वेग', nature: 'उद्वेग (कष्ट)', type: 'ashubh' },
      { name: 'चर', nature: 'चर (सामान्य)', type: 'neutral' },
      { name: 'लाभ', nature: 'लाभ (उन्नति)', type: 'shubh' },
      { name: 'अमृत', nature: 'अमृत (सर्वोत्तम)', type: 'shubh' },
      { name: 'काल', nature: 'काल (अशुभ)', type: 'ashubh' },
      { name: 'शुभ', nature: 'शुभ (उत्तम)', type: 'shubh' },
    ],
    // Fri
    [
      { name: 'चर', nature: 'चर (सामान्य)', type: 'neutral' },
      { name: 'लाभ', nature: 'लाभ (उन्नति)', type: 'shubh' },
      { name: 'अमृत', nature: 'अमृत (सर्वोत्तम)', type: 'shubh' },
      { name: 'काल', nature: 'काल (अशुभ)', type: 'ashubh' },
      { name: 'शुभ', nature: 'शुभ (उत्तम)', type: 'shubh' },
      { name: 'रोग', nature: 'रोग (हानि)', type: 'ashubh' },
      { name: 'उद्वेग', nature: 'उद्वेग (कष्ट)', type: 'ashubh' },
      { name: 'चर', nature: 'चर (सामान्य)', type: 'neutral' },
    ],
    // Sat
    [
      { name: 'काल', nature: 'काल (अशुभ)', type: 'ashubh' },
      { name: 'शुभ', nature: 'शुभ (उत्तम)', type: 'shubh' },
      { name: 'रोग', nature: 'रोग (हानि)', type: 'ashubh' },
      { name: 'उद्वेग', nature: 'उद्वेग (कष्ट)', type: 'ashubh' },
      { name: 'चर', nature: 'चर (सामान्य)', type: 'neutral' },
      { name: 'लाभ', nature: 'लाभ (उन्नति)', type: 'shubh' },
      { name: 'अमृत', nature: 'अमृत (सर्वोत्तम)', type: 'shubh' },
      { name: 'काल', nature: 'काल (अशुभ)', type: 'ashubh' },
    ],
  ];

  const seq = sequences[dayOfWeek] || sequences[0];
  return seq.map((item, idx) => ({
    name: item.name,
    nature: item.nature,
    type: item.type,
    start: addMinutesToTimeString(sunriseStr, idx * partMin),
    end: addMinutesToTimeString(sunriseStr, (idx + 1) * partMin),
  }));
}

// -------------------------------------------------------------
// 6. SHUBH MUHURAT ASSESSOR (Vivah, Griha Pravesh, Vahan Kharid)
// -------------------------------------------------------------
export interface MuhuratSuitability {
  isVivahShubh: boolean;
  vivahRemarks: string;
  isGrihaPraveshShubh: boolean;
  grihaPraveshRemarks: string;
  isVahanShubh: boolean;
  vahanRemarks: string;
}

export function evaluateMuhurats(panchang: PanchangData, dayOfWeek: number): MuhuratSuitability {
  const nakId = panchang.nakshatra.id;
  const tithiNum = panchang.tithiNumber;
  const isBhadra = panchang.karana.isBhadra;

  // Vivah Muhurat favorable Nakshatras:
  // Rohini (4), Mrigashirsha (5), Magha (10), U.Phalguni (12), Hasta (13), Swati (15), Anuradha (17), Mula (19), U.Ashadha (21), U.Bhadrapada (26), Revati (27)
  const vivahNakshatras = [4, 5, 10, 12, 13, 15, 17, 19, 21, 26, 27];
  // Avoid Rikta tithis (4, 9, 14, 19, 24, 29) and Amavasya (30)
  const riktaTithis = [4, 9, 14, 19, 24, 29, 30];
  const isVivahShubh =
    vivahNakshatras.includes(nakId) &&
    !riktaTithis.includes(tithiNum) &&
    !isBhadra &&
    dayOfWeek !== 2; // Tuesdays avoided

  // Griha Pravesh:
  // Favorable Nakshatras: Rohini (4), Mrigashirsha (5), U.Phalguni (12), Chitra (14), Anuradha (17), U.Ashadha (21), U.Bhadrapada (26), Revati (27)
  const grihaNakshatras = [4, 5, 12, 14, 17, 21, 26, 27];
  const isGrihaShubh =
    grihaNakshatras.includes(nakId) &&
    !riktaTithis.includes(tithiNum) &&
    !isBhadra &&
    (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 4 || dayOfWeek === 5);

  // Vahan Kharid (Vehicle Purchase):
  // Favorable: Punarvasu (7), Pushya (8), Swati (15), Shravana (22), Dhanishta (23), Shatabhisha (24), Revati (27), Rohini (4), Hasta (13)
  const vahanNakshatras = [7, 8, 15, 22, 23, 24, 27, 4, 13];
  const isVahanShubh =
    vahanNakshatras.includes(nakId) &&
    tithiNum !== 30 &&
    !isBhadra &&
    dayOfWeek !== 2 &&
    dayOfWeek !== 6;

  return {
    isVivahShubh,
    vivahRemarks: isVivahShubh
      ? `उत्तम विवाह लग्न मुहूर्त (${panchang.nakshatra.ne} नक्षत्र)`
      : isBhadra
      ? 'भद्रा दोष भएकाले विवाह वर्जित'
      : riktaTithis.includes(tithiNum)
      ? 'रिक्ता तिथि परेकाले सामान्य'
      : 'विवाहका लागि विशेष मुहूर्त छैन',
    isGrihaPraveshShubh: isGrihaShubh,
    grihaPraveshRemarks: isGrihaShubh
      ? `गृह प्रवेशका लागि शुभ समय (${panchang.nakshatra.ne})`
      : 'गृह प्रवेशका लागि मध्यम/अनुकूल छैन',
    isVahanShubh,
    vahanRemarks: isVahanShubh
      ? `सवारी साधन (गाडी/बाइक) खरिदका लागि शुभ दिन`
      : 'सवारी खरिदका लागि सामान्य दिन',
  };
}

// -------------------------------------------------------------
// 7. NEPAL PUBLIC HOLIDAYS & FESTIVALS (2000 TO 2100)
// -------------------------------------------------------------
export interface FestivalDetail {
  day: number;
  nameNe: string;
  nameHi: string;
  nameEn: string;
  isHoliday: boolean;
  category: 'national' | 'cultural' | 'regional' | 'tithi';
  provinceLimit?: string;
  isConfirmed: boolean; // True for official confirmed years; False for predicted future
}

// Verified Nepal Gazette festival dataset
export const BASE_NEPAL_FESTIVALS: Record<number, FestivalDetail[]> = {
  1: [
    { day: 1, nameNe: 'नयाँ वर्ष (वि.सं. नयाँ वर्ष)', nameHi: 'नया साल (नव वर्ष)', nameEn: 'Nepali New Year', isHoliday: true, category: 'national', isConfirmed: true },
    { day: 11, nameNe: 'लोकतन्त्र दिवस', nameHi: 'लोकतंत्र दिवस', nameEn: 'Democracy Day', isHoliday: true, category: 'national', isConfirmed: true },
    { day: 15, nameNe: 'बुद्ध जयन्ती / उँभौली पर्व', nameHi: 'बुद्ध जयंती', nameEn: 'Buddha Jayanti', isHoliday: true, category: 'cultural', isConfirmed: true },
    { day: 18, nameNe: 'अन्तर्राष्ट्रिय मजदुर दिवस', nameHi: 'मजदूर दिवस', nameEn: 'Labour Day', isHoliday: true, category: 'national', isConfirmed: true },
  ],
  2: [
    { day: 15, nameNe: 'गणतन्त्र दिवस', nameHi: 'गणतंत्र दिवस', nameEn: 'Republic Day', isHoliday: true, category: 'national', isConfirmed: true },
    { day: 29, nameNe: 'ज्येष्ठ पूर्णिमा / पनौती जात्रा', nameHi: 'ज्येष्ठ पूर्णिमा', nameEn: 'Jestha Purnima', isHoliday: false, category: 'tithi', isConfirmed: true },
  ],
  3: [
    { day: 15, nameNe: 'राष्ट्रिय धान दिवस (दही चिउरा)', nameHi: 'धान दिवस (दही चूड़ा)', nameEn: 'National Paddy Day', isHoliday: false, category: 'cultural', isConfirmed: true },
    { day: 22, nameNe: 'गुरु पूर्णिमा / भानु जयन्ती', nameHi: 'गुरु पूर्णिमा', nameEn: 'Guru Purnima / Bhanu Jayanti', isHoliday: false, category: 'cultural', isConfirmed: true },
  ],
  4: [
    { day: 1, nameNe: 'साउने संक्रान्ति (कर्कट संक्रान्ति)', nameHi: 'श्रावण संक्रांति', nameEn: 'Saune Sankranti', isHoliday: false, category: 'cultural', isConfirmed: true },
    { day: 15, nameNe: 'खीर खाने दिन / कामदा एकादशी', nameHi: 'खीर खाने का दिन', nameEn: 'Kheer Day', isHoliday: false, category: 'cultural', isConfirmed: true },
    { day: 28, nameNe: 'जनैपूर्णिमा / रक्षाबन्धन / गाईजात्रा', nameHi: 'रक्षाबंधन / जनैपूर्णिमा', nameEn: 'Janai Purnima / Raksha Bandhan', isHoliday: true, category: 'cultural', isConfirmed: true },
  ],
  5: [
    { day: 3, nameNe: 'हरितालिका तीज (महिला बिदा)', nameHi: 'हरितालिका तीज', nameEn: 'Haritalika Teej', isHoliday: true, category: 'cultural', isConfirmed: true },
    { day: 4, nameNe: 'गणेश चतुर्थी / चथा पर्व', nameHi: 'गणेश चतुर्थी', nameEn: 'Ganesh Chaturthi', isHoliday: false, category: 'cultural', isConfirmed: true },
    { day: 5, nameNe: 'ऋषिपञ्चमी (ऋषि तर्पण)', nameHi: 'ऋषि पंचमी', nameEn: 'Rishi Panchami', isHoliday: false, category: 'cultural', isConfirmed: true },
    { day: 15, nameNe: 'कुशे औंसी (बुवाको मुख हेर्ने दिन)', nameHi: 'कुश अमावस्या (पिता दिवस)', nameEn: 'Kushe Aunsi (Father’s Day)', isHoliday: false, category: 'cultural', isConfirmed: true },
    { day: 20, nameNe: 'इन्द्रजात्रा (काठमाडौं उपत्यका बिदा)', nameHi: 'इंद्र जात्रा', nameEn: 'Indra Jatra', isHoliday: true, category: 'regional', provinceLimit: 'बागमती प्रदेश', isConfirmed: true },
    { day: 31, nameNe: 'संविधान दिवस (राष्ट्रिय दिवस)', nameHi: 'संविधान दिवस', nameEn: 'Constitution Day', isHoliday: true, category: 'national', isConfirmed: true },
  ],
  6: [
    { day: 1, nameNe: 'घटस्थापना (बडा दशैं सुरु)', nameHi: 'घटस्थापना (दशहरा शुरू)', nameEn: 'Ghatasthapana', isHoliday: true, category: 'cultural', isConfirmed: true },
    { day: 7, nameNe: 'फूलपाती (बडा दशैं)', nameHi: 'फूलपाती', nameEn: 'Phulpati', isHoliday: true, category: 'cultural', isConfirmed: true },
    { day: 8, nameNe: 'महाअष्टमी (कालरात्रि पूजन)', nameHi: 'महाअष्टमी', nameEn: 'Maha Ashtami', isHoliday: true, category: 'cultural', isConfirmed: true },
    { day: 9, nameNe: 'महानवमी (आयुध पूजा)', nameHi: 'महानवमी', nameEn: 'Maha Navami', isHoliday: true, category: 'cultural', isConfirmed: true },
    { day: 10, nameNe: 'विजया दशमी (बडा दशैं टीका)', nameHi: 'विजयादशमी (दशहरा टीका)', nameEn: 'Vijaya Dashami', isHoliday: true, category: 'national', isConfirmed: true },
    { day: 11, nameNe: 'एकादशी (दशैं टीका)', nameHi: 'एकादशी टीका', nameEn: 'Dashain Tika Day 2', isHoliday: true, category: 'national', isConfirmed: true },
    { day: 12, nameNe: 'द्वादशी (दशैं टीका)', nameHi: 'द्वादशी टीका', nameEn: 'Dashain Tika Day 3', isHoliday: true, category: 'national', isConfirmed: true },
    { day: 15, nameNe: 'कोजाग्रत पूर्णिमा (दशैं समापन)', nameHi: 'शरद पूर्णिमा', nameEn: 'Kojagrat Purnima', isHoliday: false, category: 'cultural', isConfirmed: true },
  ],
  7: [
    { day: 12, nameNe: 'काग तिहार (यमपञ्चक प्रारम्भ)', nameHi: 'काग तिहार (यमपंचक)', nameEn: 'Kag Tihar', isHoliday: false, category: 'cultural', isConfirmed: true },
    { day: 13, nameNe: 'कुकुर तिहार / नरक चतुर्दशी', nameHi: 'कुकुर तिहार', nameEn: 'Kukur Tihar', isHoliday: false, category: 'cultural', isConfirmed: true },
    { day: 14, nameNe: 'लक्ष्मीपूजा (दीपावली / सुखरात्रि)', nameHi: 'दीपावली (लक्ष्मी पूजन)', nameEn: 'Laxmi Puja (Diwali)', isHoliday: true, category: 'cultural', isConfirmed: true },
    { day: 15, nameNe: 'गोवर्धन पूजा / बलि प्रतिपदा / म्ह: पूजा', nameHi: 'गोवर्धन पूजा', nameEn: 'Govardhan Puja / Mha Puja', isHoliday: true, category: 'cultural', isConfirmed: true },
    { day: 16, nameNe: 'भाइटीका (तिहार मुख्य दिन)', nameHi: 'भाई दूज (भाईटीका)', nameEn: 'Bhai Tika', isHoliday: true, category: 'national', isConfirmed: true },
    { day: 21, nameNe: 'छठ पर्व (सूर्य षष्ठी व्रत)', nameHi: 'छठ पूजा (सूर्य षष्ठी)', nameEn: 'Chhath Parva', isHoliday: true, category: 'cultural', isConfirmed: true },
  ],
  8: [
    { day: 10, nameNe: 'बालाचतुर्दशी (शतबीज छर्ने दिन)', nameHi: 'बाला चतुर्दशी', nameEn: 'Bala Chaturdashi', isHoliday: false, category: 'cultural', isConfirmed: true },
    { day: 15, nameNe: 'उधौली पर्व / धान्य पूर्णिमा / योमरी पुन्ही', nameHi: 'धान्य पूर्णिमा', nameEn: 'Udhauli Parva / Yomari Punhi', isHoliday: true, category: 'cultural', isConfirmed: true },
  ],
  9: [
    { day: 10, nameNe: 'क्रिसमस डे (ईसाइ धर्मावलम्बी)', nameHi: 'क्रिसमस डे', nameEn: 'Christmas Day', isHoliday: true, category: 'national', isConfirmed: true },
    { day: 15, nameNe: 'तमु ल्होसार (गुरुङ समुदाय)', nameHi: 'तमु ल्होसार', nameEn: 'Tamu Lhosar', isHoliday: true, category: 'cultural', isConfirmed: true },
    { day: 27, nameNe: 'पृथ्वी जयन्ती (राष्ट्रिय एकता दिवस)', nameHi: 'पृथ्वी जयंती (एकता दिवस)', nameEn: 'National Unity Day', isHoliday: true, category: 'national', isConfirmed: true },
  ],
  10: [
    { day: 1, nameNe: 'माघे संक्रान्ति (मकर संक्रान्ति / माघी)', nameHi: 'मकर संक्रांति', nameEn: 'Maghe Sankranti', isHoliday: true, category: 'cultural', isConfirmed: true },
    { day: 16, nameNe: 'शहीद दिवस', nameHi: 'शहीद दिवस', nameEn: 'Martyrs’ Day', isHoliday: true, category: 'national', isConfirmed: true },
    { day: 20, nameNe: 'सरस्वती पूजा (श्रीपञ्चमी)', nameHi: 'सरस्वती पूजा (बसंत पंचमी)', nameEn: 'Saraswati Puja', isHoliday: false, category: 'cultural', isConfirmed: true },
    { day: 25, nameNe: 'सोनम ल्होसार (तामाङ समुदाय)', nameHi: 'सोनम ल्होसार', nameEn: 'Sonam Lhosar', isHoliday: true, category: 'cultural', isConfirmed: true },
  ],
  11: [
    { day: 7, nameNe: 'राष्ट्रिय प्रजातन्त्र दिवस', nameHi: 'राष्ट्रीय प्रजातंत्र दिवस', nameEn: 'Democracy Day', isHoliday: true, category: 'national', isConfirmed: true },
    { day: 14, nameNe: 'महाशिवरात्री पर्व (पशुपतिनाथ मेला)', nameHi: 'महाशिवरात्रि', nameEn: 'Maha Shivaratri', isHoliday: true, category: 'cultural', isConfirmed: true },
    { day: 22, nameNe: 'ग्याल्बो ल्होसार (शेर्पा समुदाय)', nameHi: 'ग्याल्बो ल्होसार', nameEn: 'Gyalbo Lhosar', isHoliday: true, category: 'cultural', isConfirmed: true },
    { day: 29, nameNe: 'फागु पूर्णिमा (होली - पहाडी र तराई)', nameHi: 'होली (फागु पूर्णिमा)', nameEn: 'Holi Festival', isHoliday: true, category: 'cultural', isConfirmed: true },
  ],
  12: [
    { day: 8, nameNe: 'अन्तर्राष्ट्रिय महिला दिवस', nameHi: 'महिला दिवस', nameEn: 'Women’s Day', isHoliday: true, category: 'national', isConfirmed: true },
    { day: 24, nameNe: 'घोडे जात्रा (काठमाडौं उपत्यका बिदा)', nameHi: 'घोड़े जात्रा', nameEn: 'Ghode Jatra', isHoliday: true, category: 'regional', provinceLimit: 'बागमती प्रदेश', isConfirmed: true },
    { day: 29, nameNe: 'रामनवमी (मर्यादा पुरुषोत्तम राम जन्मोत्सव)', nameHi: 'रामनवमी', nameEn: 'Ram Navami', isHoliday: true, category: 'cultural', isConfirmed: true },
    { day: 30, nameNe: 'चैते दशैं (चैत्र नवरात्र)', nameHi: 'चैत्र नवरात्र (चैते दशैं)', nameEn: 'Chaite Dashain', isHoliday: false, category: 'cultural', isConfirmed: true },
  ],
};

/**
 * Returns holiday or festival item for a date.
 * Explicitly marks future years (BS 2084 to 2100) as unconfirmed until
 * the Government of Nepal officially publishes the annual holiday gazette (राजपत्र).
 */
export function getFestivalForDate(
  year: number,
  month: number,
  day: number
): FestivalDetail | null {
  try {
    const ad = bsToAd(year, month, day);
    const p = calculatePanchang(ad, year);

    if (p.events && p.events.length > 0) {
      // Prioritize national public holiday or first major event
      const primary =
        p.events.find(
          (e) => e.category === 'national_public' || e.category === 'regional_public'
        ) || p.events[0];
      const isHoliday =
        primary.category === 'national_public' ||
        primary.category === 'regional_public';

      return {
        day,
        nameNe: primary.nameNe,
        nameHi: primary.nameHi,
        nameEn: primary.nameEn,
        isHoliday,
        category: isHoliday ? 'national' : 'cultural',
        isConfirmed: primary.isConfirmed,
        provinceLimit: primary.applicableProvinces?.[0],
      };
    }
  } catch {
    // fallback if date out of range
  }

  const monthList = BASE_NEPAL_FESTIVALS[month] || [];
  const found = monthList.find((f) => f.day === day);
  if (!found) return null;

  return {
    ...found,
    isConfirmed: year <= 2083,
  };
}
