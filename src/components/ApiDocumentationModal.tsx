/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Ghaule Calendar — RESTful API Explorer & Documentation Modal
 * Provides interactive API playground, live schema inspection, curl generation,
 * and rate-limiting details for developers.
 */

import React, { useState } from 'react';
import {
  X,
  Code2,
  Terminal,
  Copy,
  Check,
  Globe,
  Sparkles,
  ShieldCheck,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Language } from '../types';
import { playTapSound, playSuccessSound } from '../utils/audio';

interface ApiDocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

interface EndpointDef {
  method: 'GET' | 'POST';
  path: string;
  title: string;
  desc: string;
  params: Array<{ name: string; type: string; required: boolean; desc: string }>;
  sampleCurl: string;
  sampleResponse: any;
}

const API_ENDPOINTS: EndpointDef[] = [
  {
    method: 'GET',
    path: '/api/v1/calendar/today',
    title: 'Current Date & Quick Panchang',
    desc: 'Returns today’s synchronized Bikram Sambat date, Gregorian AD date, weekday, and quick Panchang highlights.',
    params: [],
    sampleCurl: 'curl -X GET "https://api.ghaulecalc.com/api/v1/calendar/today"',
    sampleResponse: {
      success: true,
      apiVersion: '1.0.0',
      timestamp: '2026-11-07T14:25:00.000Z',
      data: {
        bsDate: {
          year: 2083,
          month: 7,
          day: 22,
          monthName: 'कात्तिक',
          monthNameEn: 'Kartik',
          formatted: '2083-07-22',
        },
        adDate: {
          year: 2026,
          month: 11,
          day: 7,
          formatted: '2026-11-07',
        },
        weekday: {
          index: 6,
          nameNe: 'शनिबार',
          nameEn: 'Saturday',
          isHoliday: true,
        },
        quickPanchang: {
          tithi: 'कृष्ण त्रयोदशी',
          paksha: 'कृष्ण पक्ष',
          nakshatra: 'चित्रा',
          sunrise: '06:18',
          sunset: '17:15',
        },
      },
    },
  },
  {
    method: 'GET',
    path: '/api/v1/calendar/convert',
    title: 'Bi-directional Date Conversion (BS ⇄ AD)',
    desc: 'Accurately converts any date between Bikram Sambat (2060–2085 BS) and Gregorian AD.',
    params: [
      { name: 'from', type: 'string', required: false, desc: "'bs' or 'ad' (default 'bs')" },
      { name: 'year', type: 'number', required: true, desc: 'Target year (e.g. 2084 or 2027)' },
      { name: 'month', type: 'number', required: true, desc: 'Target month (1 to 12)' },
      { name: 'day', type: 'number', required: true, desc: 'Target day (1 to 32)' },
    ],
    sampleCurl: 'curl -X GET "https://api.ghaulecalc.com/api/v1/calendar/convert?from=bs&year=2084&month=7&day=1"',
    sampleResponse: {
      success: true,
      apiVersion: '1.0.0',
      timestamp: '2026-11-07T14:25:00.000Z',
      data: {
        input: { calendar: 'BS', year: 2084, month: 7, day: 1 },
        output: {
          calendar: 'AD',
          year: 2027,
          month: 10,
          day: 17,
          formatted: '2027-10-17',
          weekday: 'Sunday',
          weekdayNe: 'आइतबार',
        },
      },
    },
  },
  {
    method: 'GET',
    path: '/api/v1/calendar/panchang',
    title: 'Sanskrit Panchang & Muhurat',
    desc: 'Computes astronomical Tithi, Nakshatra, Yoga, Karana, Sun/Moon times, and Rahu Kaal for any date.',
    params: [
      { name: 'year', type: 'number', required: true, desc: 'BS Year (2060–2085)' },
      { name: 'month', type: 'number', required: true, desc: 'BS Month (1–12)' },
      { name: 'day', type: 'number', required: true, desc: 'BS Day (1–32)' },
      { name: 'city', type: 'string', required: false, desc: "'kathmandu', 'pokhara', 'biratnagar', etc." },
    ],
    sampleCurl: 'curl -X GET "https://api.ghaulecalc.com/api/v1/calendar/panchang?year=2083&month=6&day=25"',
    sampleResponse: {
      success: true,
      apiVersion: '1.0.0',
      data: {
        location: { city: 'Kathmandu (Capital)', latitude: 27.7172, longitude: 85.324 },
        tithi: { number: 1, nameNe: 'शुक्ल प्रतिपदा', paksha: 'Shukla Paksha', endsAt: '21:22' },
        nakshatra: { nameNe: 'चित्रा', pada: 3, endsAt: '18:45' },
        sunAndMoon: { sunrise: '06:01', sunset: '17:48', dayDuration: '11 घण्टा 47 मिनेट' },
        muhurats: {
          rahuKaal: { start: '16:15', end: '17:48' },
          abhijitMuhurat: { start: '11:30', end: '12:18', isAuspicious: true },
        },
      },
    },
  },
  {
    method: 'GET',
    path: '/api/v1/calendar/hora',
    title: '24 Planetary Hora Timeline',
    desc: 'Returns the 12 daytime and 12 nighttime horas governed by planetary rulers (Sun to Saturn) with auspiciousness ratings.',
    params: [
      { name: 'year', type: 'number', required: true, desc: 'BS Year (2060–2085)' },
      { name: 'month', type: 'number', required: true, desc: 'BS Month (1–12)' },
      { name: 'day', type: 'number', required: true, desc: 'BS Day (1–32)' },
    ],
    sampleCurl: 'curl -X GET "https://api.ghaulecalc.com/api/v1/calendar/hora?year=2083&month=7&day=22"',
    sampleResponse: {
      success: true,
      apiVersion: '1.0.0',
      data: {
        date: '2026-11-07',
        weekday: 'Saturday',
        totalHoras: 24,
        horas: [
          { index: 1, period: 'day', lordNameNe: 'शनि', startTime: '06:18', nature: 'ashubh' },
          { index: 2, period: 'day', lordNameNe: 'बृहस्पति (गुरु)', startTime: '07:13', nature: 'shubh' },
        ],
      },
    },
  },
];

export const ApiDocumentationModal: React.FC<ApiDocumentationModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);

  if (!isOpen) return null;

  const endpoint = API_ENDPOINTS[selectedIdx] || API_ENDPOINTS[0];

  const handleCopyCurl = () => {
    playSuccessSound();
    navigator.clipboard.writeText(endpoint.sampleCurl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                GHAULE CALENDAR REST API (v1)
              </h3>
              <p className="text-[11px] text-slate-300">
                {language === 'ne' ? 'विकासकर्ता API तथा कागजात' : 'Developer REST API & Schemas'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Architecture Badge */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-2.5 text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Offline & Cloud Ready:</span> The core engine runs 100% offline in client mode, and exposes high-performance Express REST endpoints with 60 req/min rate limiting when deployed on a server.
            </div>
          </div>

          {/* Endpoint Selector Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/60">
            {API_ENDPOINTS.map((ep, idx) => (
              <button
                key={ep.path}
                onClick={() => {
                  playTapSound();
                  setSelectedIdx(idx);
                }}
                className={`py-1.5 px-3 rounded-xl font-bold text-[11px] transition flex items-center gap-1.5 ${
                  selectedIdx === idx
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-black/20 font-mono">
                  {ep.method}
                </span>
                <span>{ep.path.replace('/api/v1/calendar/', '')}</span>
              </button>
            ))}
          </div>

          {/* Active Endpoint Details */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-extrabold text-[11px]">
                  {endpoint.method}
                </span>
                <span className="font-mono font-bold text-slate-800 text-xs">
                  {endpoint.path}
                </span>
              </div>
              <p className="text-slate-600 mt-1">{endpoint.desc}</p>
            </div>

            {/* Query Parameters Table */}
            {endpoint.params.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-3 py-1.5 font-bold text-slate-700 border-b border-slate-200 text-[11px]">
                  Query Parameters
                </div>
                <div className="divide-y divide-slate-100">
                  {endpoint.params.map((p) => (
                    <div key={p.name} className="p-2.5 flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-blue-700">{p.name}</span>
                        <span className="ml-1 text-[10px] text-slate-400 font-mono">({p.type})</span>
                        {p.required && (
                          <span className="ml-1 text-[9px] text-rose-600 font-bold bg-rose-50 px-1 py-0.2 rounded">
                            required
                          </span>
                        )}
                        <p className="text-[11px] text-slate-500 mt-0.5">{p.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Curl Command Example */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 text-[11px]">cURL Request:</span>
                <button
                  onClick={handleCopyCurl}
                  className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-bold"
                >
                  {copiedCurl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy cURL</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800">
                {endpoint.sampleCurl}
              </div>
            </div>

            {/* Sample Response JSON */}
            <div>
              <span className="font-bold text-slate-700 text-[11px] block mb-1">
                Response Payload (JSON 200 OK):
              </span>
              <pre className="bg-slate-950 text-emerald-400 p-3 rounded-xl font-mono text-[10px] overflow-x-auto max-h-48 border border-slate-800 leading-tight">
                {JSON.stringify(endpoint.sampleResponse, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="py-2 px-5 rounded-xl bg-slate-900 text-white font-extrabold text-xs active:scale-95 transition"
          >
            {language === 'ne' ? 'बन्द गर्नुहोस्' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
