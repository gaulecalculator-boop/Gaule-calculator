/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Hindu Planetary Hora (होरा) Calculation Engine
 * Implements classical Brihat Parashara Hora Shastra rules for 24 horas per solar day:
 * 12 daytime horas from sunrise to sunset, and 12 nighttime horas from sunset to next sunrise.
 * 
 * Ancient Chaldean planetary order:
 * Saturn (शनि) -> Jupiter (बृहस्पति) -> Mars (मङ्गल) -> Sun (सूर्य) ->
 * Venus (शुक्र) -> Mercury (बुध) -> Moon (चन्द्र)
 */

export interface PlanetaryHora {
  index: number; // 1 to 24 (1-12 day, 13-24 night)
  period: 'day' | 'night';
  lordId: 'sun' | 'venus' | 'mercury' | 'moon' | 'saturn' | 'jupiter' | 'mars';
  lordNameNe: string;
  lordNameHi: string;
  lordNameEn: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  nature: 'shubh' | 'neutral' | 'ashubh';
  natureLabelNe: string;
  natureLabelEn: string;
  suitabilityNe: string;
  suitabilityEn: string;
}

// Order of planets in descending planetary sphere (Chaldean Order)
const CHALDEAN_PLANETS = [
  { id: 'saturn', ne: 'शनि', hi: 'शनि', en: 'Saturn', nature: 'ashubh', labelNe: 'सामान्य/अशुभ', labelEn: 'Inauspicious/Labor', suitNe: 'कृषि, फलाम, मजदुरी कार्यका लागि ठीक; नयाँ शुभकार्य वर्जित', suitEn: 'Good for agriculture and labor; avoid festive beginnings' },
  { id: 'jupiter', ne: 'बृहस्पति (गुरु)', hi: 'गुरु', en: 'Jupiter', nature: 'shubh', labelNe: 'सर्वोत्तम शुभ', labelEn: 'Most Auspicious', suitNe: 'विद्या, धर्म, विवाह, आर्थिक कारोबार, मन्दिर दर्शन, नयाँ थालनी', suitEn: 'Best for education, finance, marriage, religious deeds' },
  { id: 'mars', ne: 'मङ्गल', hi: 'मंगल', en: 'Mars', nature: 'ashubh', labelNe: 'उग्र/अशुभ', labelEn: 'Aggressive/Caution', suitNe: 'जग्गाजमिन, खेलकुद, अदालत, साहसको काम; शान्त कार्यमा वर्जित', suitEn: 'Good for land disputes, surgery, sports; avoid peace deeds' },
  { id: 'sun', ne: 'सूर्य', hi: 'सूर्य', en: 'Sun', nature: 'neutral', labelNe: 'मध्यम/तेजस्वी', labelEn: 'Neutral/Power', suitNe: 'सरकारी काम, प्रशासनिक निर्णय, पदभार ग्रहण, स्वास्थ्य उपचार', suitEn: 'Good for government affairs, politics, administrative work' },
  { id: 'venus', ne: 'शुक्र', hi: 'शुक्र', en: 'Venus', nature: 'shubh', labelNe: 'शुभ/आनन्द', labelEn: 'Auspicious/Pleasure', suitNe: 'विवाह, गहना, कला, मनोरञ्जन, नयाँ कपडा, यात्रा, प्रेम', suitEn: 'Auspicious for arts, vehicles, jewelry, travel, relationships' },
  { id: 'mercury', ne: 'बुध', hi: 'बुध', en: 'Mercury', nature: 'shubh', labelNe: 'शुभ/बुद्धि', labelEn: 'Auspicious/Intellect', suitNe: 'व्यापार, बैंकिङ, लेखा, पढाइ, सम्झौता, लेखन, सञ्चार', suitEn: 'Ideal for trade, accounting, communication, negotiations' },
  { id: 'moon', ne: 'चन्द्र', hi: 'चन्द्र', en: 'Moon', nature: 'shubh', labelNe: 'शुभ/सौम्य', labelEn: 'Auspicious/Gentle', suitNe: 'यात्रा, खाद्य सामग्री, जल सम्बन्धी काम, सेवा, शान्ति कार्य', suitEn: 'Favorable for travel, liquids, dairy, public relations' },
] as const;

// Day Lord planetary index in CHALDEAN_PLANETS array for each weekday (0=Sun..6=Sat)
// Sun (3), Mon (6), Tue (2), Wed (5), Thu (1), Fri (4), Sat (0)
const WEEKDAY_FIRST_HORA_INDEX = [3, 6, 2, 5, 1, 4, 0];

function parseMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatMinutes(min: number): string {
  const norm = ((Math.round(min) % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Calculates 24 planetary horas for a solar day.
 * 
 * @param dayOfWeek 0 (Sunday) to 6 (Saturday)
 * @param sunriseStr Sunrise time string "HH:mm"
 * @param sunsetStr Sunset time string "HH:mm"
 * @returns Array of 24 PlanetaryHora items
 */
export function calculate24Horas(
  dayOfWeek: number,
  sunriseStr: string,
  sunsetStr: string
): PlanetaryHora[] {
  const sunriseMin = parseMinutes(sunriseStr);
  const sunsetMin = parseMinutes(sunsetStr);

  const dayDurationMin = ((sunsetMin - sunriseMin + 1440) % 1440) || (12 * 60);
  const nightDurationMin = 1440 - dayDurationMin;

  const dayHoraDuration = dayDurationMin / 12.0;
  const nightHoraDuration = nightDurationMin / 12.0;

  const startPlanetIdx = WEEKDAY_FIRST_HORA_INDEX[dayOfWeek % 7] ?? 3;
  const horas: PlanetaryHora[] = [];

  // 12 Daytime Horas (Sunrise to Sunset)
  for (let i = 0; i < 12; i++) {
    const planetIdx = (startPlanetIdx + i) % 7;
    const p = CHALDEAN_PLANETS[planetIdx];
    const sMin = sunriseMin + i * dayHoraDuration;
    const eMin = sMin + dayHoraDuration;

    horas.push({
      index: i + 1,
      period: 'day',
      lordId: p.id,
      lordNameNe: p.ne,
      lordNameHi: p.hi,
      lordNameEn: p.en,
      startTime: formatMinutes(sMin),
      endTime: formatMinutes(eMin),
      nature: p.nature,
      natureLabelNe: p.labelNe,
      natureLabelEn: p.labelEn,
      suitabilityNe: p.suitNe,
      suitabilityEn: p.suitEn,
    });
  }

  // 12 Nighttime Horas (Sunset to next Sunrise)
  for (let i = 0; i < 12; i++) {
    const planetIdx = (startPlanetIdx + 12 + i) % 7;
    const p = CHALDEAN_PLANETS[planetIdx];
    const sMin = sunsetMin + i * nightHoraDuration;
    const eMin = sMin + nightHoraDuration;

    horas.push({
      index: i + 13,
      period: 'night',
      lordId: p.id,
      lordNameNe: p.ne,
      lordNameHi: p.hi,
      lordNameEn: p.en,
      startTime: formatMinutes(sMin),
      endTime: formatMinutes(eMin),
      nature: p.nature,
      natureLabelNe: p.labelNe,
      natureLabelEn: p.labelEn,
      suitabilityNe: p.suitNe,
      suitabilityEn: p.suitEn,
    });
  }

  return horas;
}
