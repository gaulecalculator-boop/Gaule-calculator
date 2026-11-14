import React, { useState } from 'react';
import {
  RotateCcw,
  Copy,
  Save,
  Hammer,
  Box,
  Layers,
  Mountain,
  Grid,
} from 'lucide-react';
import { Language, Currency, CalculatorMeta } from '../../../types';
import { translations } from '../../../data/translations';
import { formatCurrency, toDevanagari } from '../../../utils/nepaliCalendar';
import { playSuccessSound, playTapSound } from '../../../utils/audio';
import { saveCalculationToHistory } from '../../../utils/storage';

interface ConstructionToolsProps {
  tool: CalculatorMeta;
  language: Language;
  currency: Currency;
  showToast: (msg: string) => void;
}

export const ConstructionTools: React.FC<ConstructionToolsProps> = ({
  tool,
  language,
  currency,
  showToast,
}) => {
  const t = translations[language];

  // 1. Land Area State (Nepal Standard)
  const [landRopani, setLandRopani] = useState(1);
  const [landAana, setLandAana] = useState(2);
  const [landPaisa, setLandPaisa] = useState(0);
  const [landDaam, setLandDaam] = useState(0);

  // 2. Brick Calc State
  const [wallLength, setWallLength] = useState(15); // ft
  const [wallHeight, setWallHeight] = useState(10); // ft
  const [wallThickness, setWallThickness] = useState<4 | 9>(9); // 4" or 9"

  // 3. Cement Calc State
  const [cementWorkType, setCementWorkType] = useState<'concrete' | 'plaster' | 'brickwork'>('concrete');
  const [cementAreaVolume, setCementAreaVolume] = useState(100); // 100 sq.ft or 100 cu.ft

  // 4. Sand & Gravel State
  const [sandLength, setSandLength] = useState(20); // ft
  const [sandWidth, setSandWidth] = useState(15); // ft
  const [sandDepth, setSandDepth] = useState(0.5); // ft (e.g. 6 inches = 0.5 ft)

  // 5. Steel Rebar State
  const [rebarDiameter, setRebarDiameter] = useState<number>(12); // mm
  const [rebarLengthMeters, setRebarLengthMeters] = useState<number>(120); // meters (10 rods x 12m)
  const [rebarRatePerKg, setRebarRatePerKg] = useState<number>(115); // Rs/kg

  // 6. Paint Calc State
  const [paintRoomLength, setPaintRoomLength] = useState<number>(14); // ft
  const [paintRoomWidth, setPaintRoomWidth] = useState<number>(12); // ft
  const [paintRoomHeight, setPaintRoomHeight] = useState<number>(10); // ft
  const [paintCoats, setPaintCoats] = useState<number>(2);

  // 7. Tiles & Marble State
  const [tileRoomLength, setTileRoomLength] = useState<number>(16); // ft
  const [tileRoomWidth, setTileRoomWidth] = useState<number>(12); // ft
  const [tileSize, setTileSize] = useState<'2x2' | '1x1' | '1x2' | '2x4'>('2x2');
  const [tileWastage, setTileWastage] = useState<number>(10); // 10% wastage

  // 8. Timber CFT & CBM State
  const [timberType, setTimberType] = useState<'round' | 'sawn'>('round');
  const [logGirth, setLogGirth] = useState<number>(48); // inches
  const [logLength, setLogLength] = useState<number>(12); // ft
  const [sawnWidth, setSawnWidth] = useState<number>(4); // inches
  const [sawnThick, setSawnThick] = useState<number>(3); // inches
  const [sawnLength, setSawnLength] = useState<number>(10); // ft
  const [sawnCount, setSawnCount] = useState<number>(5);
  const [timberRatePerCft, setTimberRatePerCft] = useState<number>(3500); // Sal wood approx rate

  // --- Calculations ---

  // 1. Land Area (Pahadi & Terai)
  // 1 Ropani = 16 Aana = 64 Paisa = 256 Daam = 5476 Sq.Ft
  const landSqFt = Math.round(
    landRopani * 5476 + landAana * 342.25 + landPaisa * 85.56 + landDaam * 21.39
  );
  const landSqMeters = +(landSqFt * 0.092903).toFixed(2);
  const landKattha = +(landSqFt / 3645).toFixed(2);
  const landDhur = +(landSqFt / 182.25).toFixed(2);
  const landBigha = +(landSqFt / 72900).toFixed(3);

  // 2. Brick Calc
  const wallArea = wallLength * wallHeight;
  const bricksNeeded = Math.round(wallArea * (wallThickness === 9 ? 9.5 : 4.8));
  const brickCementBags = +(bricksNeeded / 350).toFixed(1);
  const brickSandCft = Math.round(bricksNeeded * 0.18);

  // 3. Cement Calc
  const calculateCementBags = () => {
    if (cementWorkType === 'concrete') {
      // 100 Cu.Ft M20 (1:1.5:3) requires ~18 bags
      return +((cementAreaVolume / 100) * 18).toFixed(1);
    }
    if (cementWorkType === 'plaster') {
      // 100 Sq.Ft 1:4 (12mm plaster) requires ~1.2 bags
      return +((cementAreaVolume / 100) * 1.25).toFixed(1);
    }
    // Brickwork 100 sq.ft 9" wall
    return +((cementAreaVolume / 100) * 2.8).toFixed(1);
  };
  const totalCementBags = calculateCementBags();

  // 4. Sand & Gravel
  const totalVolumeCft = +(sandLength * sandWidth * sandDepth).toFixed(1);
  const totalVolumeCbm = +(totalVolumeCft * 0.0283168).toFixed(2);
  const miniTipperTrips = +(totalVolumeCft / 100).toFixed(1); // Mini tipper ~ 100 CFT
  const heavyTipperTrips = +(totalVolumeCft / 350).toFixed(1); // 10-wheeler ~ 350 CFT

  // 5. Steel Rebar
  // Weight per meter formula: D^2 / 162.2 kg/m
  const weightPerMeter = +((rebarDiameter * rebarDiameter) / 162.2).toFixed(3);
  const totalSteelWeightKg = Math.round(weightPerMeter * rebarLengthMeters);
  const totalSteelQuintals = +(totalSteelWeightKg / 100).toFixed(2);
  const totalSteelCost = totalSteelWeightKg * rebarRatePerKg;
  const standardRods = +(rebarLengthMeters / 12).toFixed(1); // standard 12m (40ft) rod

  // 6. Paint Calc
  const totalWallArea = Math.round(2 * (paintRoomLength + paintRoomWidth) * paintRoomHeight);
  const paintLitersNeeded = Math.max(
    1,
    +((totalWallArea * paintCoats) / 120).toFixed(1) // 1 liter paints ~120 sq.ft per coat
  );
  const primerLiters = +((totalWallArea * 1) / 140).toFixed(1);

  // 7. Tiles Calc
  const tileRoomArea = tileRoomLength * tileRoomWidth;
  const tileSizesInSqFt: Record<string, number> = {
    '2x2': 4,
    '1x1': 1,
    '1x2': 2,
    '2x4': 8,
  };
  const singleTileSqFt = tileSizesInSqFt[tileSize] || 4;
  const tilesWithoutWastage = Math.ceil(tileRoomArea / singleTileSqFt);
  const totalTilesNeeded = Math.ceil(tilesWithoutWastage * (1 + tileWastage / 100));
  const tilesPerBox = tileSize === '2x2' ? 4 : tileSize === '2x4' ? 2 : 6;
  const tileBoxesNeeded = Math.ceil(totalTilesNeeded / tilesPerBox);

  // 8. Timber CFT & CBM
  // Round log Quarter Girth: (Girth/4)^2 * Length / 144
  const roundLogCft = +(
    Math.pow(logGirth / 4, 2) * (logLength / 144)
  ).toFixed(2);
  // Sawn Timber: (Thickness * Width * Length) / 144 * pieces
  const sawnTimberCft = +(
    ((sawnThick * sawnWidth * sawnLength) / 144) * sawnCount
  ).toFixed(2);
  const activeTimberCft = timberType === 'round' ? roundLogCft : sawnTimberCft;
  const activeTimberCbm = +(activeTimberCft * 0.0283168).toFixed(3);
  const timberTotalCost = Math.round(activeTimberCft * timberRatePerCft);

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

  return (
    <div className="space-y-4 pb-20 select-none">
      {/* Tool Header */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-teal-500 via-emerald-600 to-teal-700 text-white shadow-md flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-extrabold text-white">
              {language === 'ne' ? tool.nameNe : tool.nameEn}
            </h4>
            <span className="bg-white/20 text-white text-[10px] font-black px-1.5 py-0.2 rounded-md">
              Construction & Ghar
            </span>
          </div>
          <p className="text-xs text-teal-100 mt-0.5">
            {language === 'ne' ? tool.descNe : tool.descEn}
          </p>
        </div>
      </div>

      {/* 1. Land Area Measurement (रोपनी / बिघा) */}
      {tool.id === 'land-area' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-3">
            <h5 className="text-xs font-bold text-slate-800">रोपनी - आना - पैसा - दाम (पहाडी प्रणाली)</h5>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">रोपनी</label>
                <input
                  type="number"
                  value={landRopani}
                  onChange={(e) => setLandRopani(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 text-center font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">आना</label>
                <input
                  type="number"
                  value={landAana}
                  onChange={(e) => setLandAana(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 text-center font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">पैसा</label>
                <input
                  type="number"
                  value={landPaisa}
                  onChange={(e) => setLandPaisa(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 text-center font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">दाम</label>
                <input
                  type="number"
                  value={landDaam}
                  onChange={(e) => setLandDaam(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 text-center font-bold outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3.5">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">जम्मा क्षेत्रफल (Total Land Area)</span>
              <div className="text-3xl font-black text-emerald-400 mt-0.5">
                {landSqFt.toLocaleString('en-IN')} वर्ग फिट (Sq.Ft)
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">वर्ग मिटर (m²)</span>
                <p className="font-extrabold text-white text-xs mt-0.5">{landSqMeters} m²</p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">तराई कठ्ठा</span>
                <p className="font-extrabold text-amber-300 text-xs mt-0.5">{landKattha} कठ्ठा</p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">तराई धुर</span>
                <p className="font-extrabold text-sky-300 text-xs mt-0.5">{landDhur} धुर</p>
              </div>
            </div>
            <button
              onClick={() => handleSaveCurrent('Land Area', `${landSqFt} Sq.Ft (${landKattha} Kattha)`, landSqFt)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs"
            >
              हिसाब सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}

      {/* 2. Brick Calculator */}
      {tool.id === 'brick-calc' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">पर्खाल लम्बाइ (फिट):</label>
                <input
                  type="number"
                  value={wallLength}
                  onChange={(e) => setWallLength(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">पर्खाल उचाइ (फिट):</label>
                <input
                  type="number"
                  value={wallHeight}
                  onChange={(e) => setWallHeight(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">गारोको मोटाइ (Wall Thickness):</label>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  onClick={() => { playTapSound(); setWallThickness(4); }}
                  className={`py-2 rounded-xl border transition ${wallThickness === 4 ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700'}`}
                >
                  ४ इन्च गारो (Single Wall)
                </button>
                <button
                  onClick={() => { playTapSound(); setWallThickness(9); }}
                  className={`py-2 rounded-xl border transition ${wallThickness === 9 ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700'}`}
                >
                  ९ इन्च गारो (Double Wall)
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3.5 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">चाहिने इँटाको संख्या (Total Bricks)</span>
            <div className="text-3xl font-black text-rose-400">
              {bricksNeeded.toLocaleString('en-IN')} गोटा इँटा
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">लाग्ने सिमेन्ट</span>
                <p className="font-extrabold text-amber-300 text-xs mt-0.5">लगभग {brickCementBags} बोरा</p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">लाग्ने बालुवा</span>
                <p className="font-extrabold text-sky-300 text-xs mt-0.5">लगभग {brickSandCft} CFT</p>
              </div>
            </div>
            <button
              onClick={() => handleSaveCurrent('Brick Calculation', `${bricksNeeded} Bricks`, bricksNeeded)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs"
            >
              हिसाब सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}

      {/* 3. Cement Calculator */}
      {tool.id === 'cement-calc' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">निर्माण कार्यको प्रकार (Work Type):</label>
              <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
                {[
                  { id: 'concrete', label: 'ढलान (M20)' },
                  { id: 'plaster', label: 'प्लास्टर' },
                  { id: 'brickwork', label: 'गारो मसला' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { playTapSound(); setCementWorkType(item.id as any); }}
                    className={`py-2 px-1 rounded-xl border text-[11px] transition ${cementWorkType === item.id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                {cementWorkType === 'concrete' ? 'ढलानको परिमाण (घन फिट CFT):' : 'क्षेत्रफल (वर्ग फिट Sq.Ft):'}
              </label>
              <input
                type="number"
                value={cementAreaVolume}
                onChange={(e) => setCementAreaVolume(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2 px-3 text-sm font-bold outline-none"
              />
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3.5 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">चाहिने सिमेन्ट (Cement Bags)</span>
            <div className="text-3xl font-black text-amber-400">
              {totalCementBags} बोरा (५० केजी)
            </div>
            <p className="text-xs text-slate-300">
              *५% साइट वेस्टेज र नेपाल स्ट्यान्डर्ड अनुपात सहित
            </p>
            <button
              onClick={() => handleSaveCurrent('Cement Bags', `${totalCementBags} Bags`, totalCementBags)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs"
            >
              हिसाब सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}

      {/* 4. Sand & Gravel Calculator */}
      {tool.id === 'sand-gravel' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">लम्बाइ (फिट):</label>
                <input
                  type="number"
                  value={sandLength}
                  onChange={(e) => setSandLength(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-2 text-xs font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">चौडाइ (फिट):</label>
                <input
                  type="number"
                  value={sandWidth}
                  onChange={(e) => setSandWidth(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-2 text-xs font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">गहिराइ (फिट):</label>
                <input
                  type="number"
                  step="0.1"
                  value={sandDepth}
                  onChange={(e) => setSandDepth(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-2 text-xs font-bold outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3.5 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">जम्मा बालुवा/गिट्टी परिमाण (CFT)</span>
            <div className="text-3xl font-black text-amber-400">
              {totalVolumeCft} CFT ({totalVolumeCbm} m³)
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">मिनी टिप्पर ट्रिप</span>
                <p className="font-extrabold text-white text-xs mt-0.5">लगभग {miniTipperTrips} टिप्पर</p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">ठूलो टिप्पर (१० चक्के)</span>
                <p className="font-extrabold text-sky-300 text-xs mt-0.5">लगभग {heavyTipperTrips} ट्रिप</p>
              </div>
            </div>
            <button
              onClick={() => handleSaveCurrent('Sand & Gravel', `${totalVolumeCft} CFT (${miniTipperTrips} Tipper)`, totalVolumeCft)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs"
            >
              हिसाब सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}

      {/* 5. Steel Rebar Calculator (डन्डी हिसाब) */}
      {tool.id === 'steel-rebar' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">डन्डीको मोटाइ (Diameter in mm):</label>
              <div className="grid grid-cols-5 gap-1.5 text-xs font-bold">
                {[8, 10, 12, 16, 20].map((dia) => (
                  <button
                    key={dia}
                    onClick={() => { playTapSound(); setRebarDiameter(dia); }}
                    className={`py-2 rounded-xl border text-[11px] ${rebarDiameter === dia ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700'}`}
                  >
                    {dia} mm
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">कुल लम्बाइ (मिटर):</label>
                <input
                  type="number"
                  value={rebarLengthMeters}
                  onChange={(e) => setRebarLengthMeters(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">दर प्रति केजी (रु):</label>
                <input
                  type="number"
                  value={rebarRatePerKg}
                  onChange={(e) => setRebarRatePerKg(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3.5 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">कुल डन्डीको तौल (Total Steel Weight)</span>
            <div className="text-3xl font-black text-amber-400">
              {totalSteelWeightKg.toLocaleString('en-IN')} केजी ({totalSteelQuintals} क्विन्टल)
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">१२ मिटर (४० फिट) गोटा</span>
                <p className="font-extrabold text-white text-xs mt-0.5">{standardRods} थान डन्डी</p>
              </div>
              <div className="p-2.5 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-[10px]">कुल रकम (Total Price)</span>
                <p className="font-extrabold text-emerald-400 text-xs mt-0.5">रु {totalSteelCost.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <button
              onClick={() => handleSaveCurrent('Steel Rebar', `${totalSteelWeightKg} kg (रु ${totalSteelCost})`, totalSteelCost)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs"
            >
              हिसाब सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}

      {/* 6. Paint Calculator (पेन्ट हिसाब) */}
      {tool.id === 'paint-calc' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">लम्बाइ (फिट):</label>
                <input
                  type="number"
                  value={paintRoomLength}
                  onChange={(e) => setPaintRoomLength(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-2 text-xs font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">चौडाइ (फिट):</label>
                <input
                  type="number"
                  value={paintRoomWidth}
                  onChange={(e) => setPaintRoomWidth(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-2 text-xs font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">उचाइ (फिट):</label>
                <input
                  type="number"
                  value={paintRoomHeight}
                  onChange={(e) => setPaintRoomHeight(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-2 text-xs font-bold outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3.5 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">चाहिने पेन्ट लिटर ({paintCoats} Coats)</span>
            <div className="text-3xl font-black text-emerald-400">
              {paintLitersNeeded} लिटर रङ (Paint)
            </div>
            <p className="text-xs text-slate-300">
              लाग्ने प्राइमर्स: लगभग {primerLiters} लिटर (पर्खाल क्षेत्रफल: {totalWallArea} Sq.Ft)
            </p>
            <button
              onClick={() => handleSaveCurrent('Paint Calc', `${paintLitersNeeded} Liters for ${totalWallArea} Sq.Ft`, paintLitersNeeded)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs"
            >
              हिसाब सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}

      {/* 7. Tiles & Marble Calculator */}
      {tool.id === 'tiles-calc' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">कोठा लम्बाइ (फिट):</label>
                <input
                  type="number"
                  value={tileRoomLength}
                  onChange={(e) => setTileRoomLength(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">कोठा चौडाइ (फिट):</label>
                <input
                  type="number"
                  value={tileRoomWidth}
                  onChange={(e) => setTileRoomWidth(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">टायलको साइज:</label>
              <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                {[
                  { id: '2x2', label: '2ft x 2ft' },
                  { id: '1x1', label: '1ft x 1ft' },
                  { id: '1x2', label: '1ft x 2ft' },
                  { id: '2x4', label: '2ft x 4ft' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { playTapSound(); setTileSize(s.id as any); }}
                    className={`py-2 rounded-xl border text-[11px] ${tileSize === s.id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3.5 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">चाहिने टायल संख्या (With 10% Cut Wastage)</span>
            <div className="text-3xl font-black text-amber-400">
              {totalTilesNeeded} गोटा टायल ({tileBoxesNeeded} बक्स)
            </div>
            <p className="text-xs text-slate-300">
              भुइँ क्षेत्रफल: {tileRoomArea} वर्ग फिट (Sq.Ft)
            </p>
            <button
              onClick={() => handleSaveCurrent('Tiles Calc', `${totalTilesNeeded} Tiles (${tileBoxesNeeded} Boxes)`, totalTilesNeeded)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs"
            >
              हिसाब सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}

      {/* 8. Timber CFT & CBM Calculator (काठ नाप) */}
      {tool.id === 'cft-cbm' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4.5 shadow-sm border border-slate-200/80 space-y-3">
            <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => { playTapSound(); setTimberType('round'); }}
                className={`flex-1 py-2 rounded-xl transition ${timberType === 'round' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'}`}
              >
                गोलिया काठ (Round Log)
              </button>
              <button
                onClick={() => { playTapSound(); setTimberType('sawn'); }}
                className={`flex-1 py-2 rounded-xl transition ${timberType === 'sawn' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'}`}
              >
                चिरान काठ (Sawn Timber)
              </button>
            </div>

            {timberType === 'round' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">गोलाई (Girth in Inches):</label>
                  <input
                    type="number"
                    value={logGirth}
                    onChange={(e) => setLogGirth(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">लम्बाइ (Length in Feet):</label>
                  <input
                    type="number"
                    value={logLength}
                    onChange={(e) => setLogLength(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">मोटाइ (इन्च):</label>
                    <input
                      type="number"
                      value={sawnThick}
                      onChange={(e) => setSawnThick(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-2 text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">चौडाइ (इन्च):</label>
                    <input
                      type="number"
                      value={sawnWidth}
                      onChange={(e) => setSawnWidth(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-2 text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">लम्बाइ (फिट):</label>
                    <input
                      type="number"
                      value={sawnLength}
                      onChange={(e) => setSawnLength(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-2 text-xs font-bold outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">संख्या (No. of Pieces):</label>
                  <input
                    type="number"
                    value={sawnCount}
                    onChange={(e) => setSawnCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">दर प्रति CFT (रु):</label>
              <input
                type="number"
                value={timberRatePerCft}
                onChange={(e) => setTimberRatePerCft(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold outline-none"
              />
            </div>
          </div>

          <div className="bg-[#0A1128] text-white rounded-3xl p-5 shadow-xl space-y-3.5 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">काठको कुल नाप (CFT & CBM)</span>
            <div className="text-3xl font-black text-amber-400">
              {activeTimberCft} CFT ({activeTimberCbm} m³)
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-xs flex justify-between items-center">
              <span className="text-slate-400">कुल मूल्य (Total Value):</span>
              <span className="font-extrabold text-emerald-400 text-sm">रु {timberTotalCost.toLocaleString('en-IN')}</span>
            </div>
            <button
              onClick={() => handleSaveCurrent('Timber CFT', `${activeTimberCft} CFT (रु ${timberTotalCost})`, timberTotalCost)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xs"
            >
              हिसाब सुरक्षित गर्नुहोस्
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
