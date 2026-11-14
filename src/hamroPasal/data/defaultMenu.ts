/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Business category options for Hamro Pasal
 */

import { BusinessType } from '../types';

export const BUSINESS_TYPE_OPTIONS: {
  id: BusinessType;
  titleNe: string;
  titleHi: string;
  titleBho: string;
  titleMai: string;
  titleEn: string;
  icon: string;
  description: string;
  descHi: string;
  descBho: string;
  descMai: string;
  descEn: string;
}[] = [
  {
    id: 'hotel_restaurant',
    titleNe: 'होटल / रेस्टुरेन्ट / खाजा घर',
    titleHi: 'होटल / रेस्टोरेंट / ढाबा',
    titleBho: 'होटल / रेस्टुरेन्ट / नास्ता दोकान',
    titleMai: 'होटल / रेस्टुरेन्ट / नास्ता दोकान',
    titleEn: 'Hotel / Restaurant / Cafe',
    icon: '🍲',
    description: 'खाना मेनु, टेबल अर्डर, डाइन-इन, टेकअवे र ग्राहकको उधारो हिसाब',
    descHi: 'खाना मेन्यू, टेबल ऑर्डर, डाइन-इन, टेकअवे और ग्राहक उधार हिसाब',
    descBho: 'खाना मेनु, टेबल ऑर्डर, आ ग्राहक के उधार हिसाब',
    descMai: 'खाना मेनु, टेबल ऑर्डर आ ग्राहकक उधार हिसाब',
    descEn: 'Food menu, table orders, dine-in, takeaway and customer credit ledger',
  },
  {
    id: 'grocery_kirana',
    titleNe: 'किराना / जनरल स्टोर',
    titleHi: 'किराना / जनरल स्टोर',
    titleBho: 'किराना / जनरल दोकान',
    titleMai: 'किराना / जनरल दोकान',
    titleEn: 'Grocery / Kirana Store',
    icon: '🛒',
    description: 'सामान स्टक, तौल हिसाब (केजी/ग्राम), बारकोड र ग्राहक खाता',
    descHi: 'सामान स्टॉक, वजन हिसाब (किग्रा/ग्राम), बारकोड और ग्राहक खाता',
    descBho: 'सामान स्टॉक, तौल हिसाब (किलो/ग्राम), बारकोड आ ग्राहक खाता',
    descMai: 'सामान स्टॉक, तौल हिसाब (किलो/ग्राम), बारकोड आ ग्राहक खाता',
    descEn: 'Item stock, weight billing (kg/g), barcode and customer khata',
  },
  {
    id: 'clothing_garment',
    titleNe: 'कपडा तथा गार्मेन्ट पसल',
    titleHi: 'कपड़ा व गारमेंट दुकान',
    titleBho: 'कपड़ा आ गार्मेन्ट दोकान',
    titleMai: 'कपड़ा आ गार्मेन्ट दोकान',
    titleEn: 'Clothing & Garments',
    icon: '👕',
    description: 'साइज (S/M/L/XL), कलर भेरियन्ट र कपडा बिलिङ',
    descHi: 'साइज (S/M/L/XL), कलर और कपड़ा बिलिंग',
    descBho: 'साइज (S/M/L/XL), रंग आ कपड़ा बिलिंग',
    descMai: 'साइज (S/M/L/XL), रंग आ कपड़ा बिलिंग',
    descEn: 'Sizes (S/M/L/XL), color variants and garment billing',
  },
  {
    id: 'mobile_electronics',
    titleNe: 'मोबाइल तथा इलेक्ट्रोनिक्स',
    titleHi: 'मोबाइल व इलेक्ट्रॉनिक्स',
    titleBho: 'मोबाइल आ इलेक्ट्रॉनिक्स',
    titleMai: 'मोबाइल आ इलेक्ट्रॉनिक्स',
    titleEn: 'Mobile & Electronics',
    icon: '📱',
    description: 'IMEI/Serial नम्बर, वारेन्टी र रिपेयर ट्र्याकिङ',
    descHi: 'IMEI/सीरियल नंबर, वारंटी और रिपेयर ट्रैकिंग',
    descBho: 'IMEI/सीरियल नम्बर, वारंटी आ मरम्मत हिसाब',
    descMai: 'IMEI/सीरियल नम्बर, वारंटी आ मरम्मत हिसाब',
    descEn: 'IMEI/Serial numbers, warranty and repair tracking',
  },
  {
    id: 'hardware_store',
    titleNe: 'हार्डवेयर तथा निर्माण सामग्री',
    titleHi: 'हार्डवेयर स्टोर',
    titleBho: 'हार्डवेयर आ घर बनावे के सामान',
    titleMai: 'हार्डवेयर आ निर्माण सामग्री',
    titleEn: 'Hardware & Sanitary',
    icon: '🔧',
    description: 'पिस, मिटर, बन्डल, केजी नाप र सप्लायर खाता',
    descHi: 'पीस, मीटर, बंडल, किलो माप और सप्लायर खाता',
    descBho: 'पीस, मीटर, बन्डल, किलो तौल आ सप्लायर खाता',
    descMai: 'पीस, मीटर, बन्डल, किलो माप आ सप्लायर खाता',
    descEn: 'Pieces, meters, bundles, kg weights and supplier ledger',
  },
  {
    id: 'cosmetics_beauty',
    titleNe: 'कस्मेटिक्स तथा ब्युटी सप',
    titleHi: 'कॉस्मेटिक्स दुकान',
    titleBho: 'कस्मेटिक्स आ ब्युटी दोकान',
    titleMai: 'कस्मेटिक्स आ ब्युटी दोकान',
    titleEn: 'Cosmetics & Beauty',
    icon: '💄',
    description: 'ब्रान्ड, एक्सपायरी र बिलिङ व्यवस्थापन',
    descHi: 'ब्रांड, एक्सपायरी और बिलिंग प्रबंधन',
    descBho: 'ब्रान्ड, एक्सपायरी आ बिलिंग व्यवस्था',
    descMai: 'ब्रान्ड, एक्सपायरी आ बिलिंग व्यवस्था',
    descEn: 'Brands, expiry tracking and billing management',
  },
  {
    id: 'footwear_shoes',
    titleNe: 'जुत्ता तथा चप्पल पसल',
    titleHi: 'जूता चप्पल की दुकान',
    titleBho: 'जूता आ चप्पल दोकान',
    titleMai: 'जूता आ चप्पल दोकान',
    titleEn: 'Footwear & Shoes',
    icon: '👟',
    description: 'साइज नम्बर, स्टक र बिलिङ',
    descHi: 'साइज नंबर, स्टॉक और बिलिंग',
    descBho: 'साइज नम्बर, स्टॉक आ बिलिंग',
    descMai: 'साइज नम्बर, स्टॉक आ बिलिंग',
    descEn: 'Size numbers, stock and billing',
  },
  {
    id: 'stationery_book',
    titleNe: 'स्टेशनरी तथा पुस्तक पसल',
    titleHi: 'स्टेशनरी व बुक स्टोर',
    titleBho: 'स्टेशनरी आ किताब दोकान',
    titleMai: 'स्टेशनरी आ पुस्तक दोकान',
    titleEn: 'Stationery & Books',
    icon: '📚',
    description: 'कपी, कलम, किताब र थोक बिलिङ',
    descHi: 'कॉपी, पेन, किताब और थोक बिलिंग',
    descBho: 'कॉपी, कलम, किताब आ थोक बिलिंग',
    descMai: 'कॉपी, कलम, किताब आ थोक बिलिंग',
    descEn: 'Notebooks, pens, books and wholesale billing',
  },
  {
    id: 'wholesale_distributor',
    titleNe: 'थोक तथा डिस्ट्रिब्युटर',
    titleHi: 'थोक व डिस्ट्रीब्यूटर',
    titleBho: 'थोक आ डिस्ट्रिब्युटर',
    titleMai: 'थोक आ डिस्ट्रिब्युटर',
    titleEn: 'Wholesale & Distribution',
    icon: '📦',
    description: 'कार्टुन, बक्स, होलसेल दर र उधारो खाता',
    descHi: 'कार्टन, बॉक्स, होलसेल दर और उधार खाता',
    descBho: 'कार्टन, बक्सा, थोक भाव आ उधार खाता',
    descMai: 'कार्टन, बक्स, थोक भाव आ उधार खाता',
    descEn: 'Cartons, boxes, wholesale rates and credit ledger',
  },
  {
    id: 'custom_other',
    titleNe: 'अन्य कुनै पनि व्यवसाय',
    titleHi: 'अन्य कोई भी व्यवसाय',
    titleBho: 'कवनो अउर कारोबार',
    titleMai: 'अन्य कोनो व्यवसाय',
    titleEn: 'Custom / Other Business',
    icon: '🏪',
    description: 'सबै किसिमका पसलहरूको सजिलो हिसाब-किताब',
    descHi: 'सभी प्रकार की दुकानों का आसान हिसाब-किताब',
    descBho: 'सब तरह के दोकान के आसान हिसाब-किताब',
    descMai: 'सभ तरहक दोकानक आसान हिसाब-किताब',
    descEn: 'Simple accounting for every type of shop',
  },
];
