/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Clean Banking-Grade SVG Charts (Area Growth Chart & Allocation Donut)
 * Zero external chart dependencies, mobile-responsive, tabular-nums legends.
 */

import React from 'react';
import { ChartPoint } from '../calculations';

interface GrowthChartProps {
  data: ChartPoint[];
  investedLabel?: string;
  valueLabel?: string;
  height?: number;
}

export const GrowthChartSVG: React.FC<GrowthChartProps> = ({
  data,
  investedLabel = 'Invested',
  valueLabel = 'Total Value',
  height = 170,
}) => {
  if (!data || data.length === 0) return null;

  const width = 360;
  const padL = 12;
  const padR = 12;
  const padT = 16;
  const padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxVal = Math.max(
    1,
    ...data.map((d) => Math.max(d.invested, d.value))
  );

  const getX = (idx: number) =>
    data.length === 1 ? padL + plotW / 2 : padL + (idx / (data.length - 1)) * plotW;
  const getY = (val: number) => padT + plotH - (Math.max(0, val) / maxVal) * plotH;

  if (data.length <= 3) {
    // Clean grouped comparison bars for compact datasets (e.g., Gold, Net Worth, PnL)
    const barGroupW = plotW / data.length;
    const barW = Math.min(28, barGroupW * 0.28);

    return (
      <div className="w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {[0.25, 0.5, 0.75, 1].map((frac) => {
            const y = padT + plotH * (1 - frac);
            return (
              <line
                key={frac}
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
            );
          })}
          {data.map((pt, idx) => {
            const cx = padL + idx * barGroupW + barGroupW / 2;
            const hInv = (Math.max(0, pt.invested) / maxVal) * plotH;
            const hVal = (Math.max(0, pt.value) / maxVal) * plotH;
            return (
              <g key={pt.label}>
                <rect
                  x={cx - barW - 3}
                  y={padT + plotH - hInv}
                  width={barW}
                  height={Math.max(2, hInv)}
                  rx={4}
                  fill="#94A3B8"
                />
                <rect
                  x={cx + 3}
                  y={padT + plotH - hVal}
                  width={barW}
                  height={Math.max(2, hVal)}
                  rx={4}
                  fill="#1D4ED8"
                />
                <text
                  x={cx}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-semibold"
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="flex items-center justify-center gap-5 text-[11px] font-semibold text-slate-600 mt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 inline-block" />
            {investedLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#1D4ED8] inline-block" />
            {valueLabel}
          </span>
        </div>
      </div>
    );
  }

  const valPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.value).toFixed(1)}`)
    .join(' ');
  const invPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.invested).toFixed(1)}`)
    .join(' ');

  const areaPath = `${valPath} L ${getX(data.length - 1).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${getX(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

  // Pick up to 5 evenly spaced X labels
  const labelIndices = new Set<number>([0, data.length - 1]);
  if (data.length > 4) {
    labelIndices.add(Math.floor(data.length * 0.25));
    labelIndices.add(Math.floor(data.length * 0.5));
    labelIndices.add(Math.floor(data.length * 0.75));
  }

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="bankGrowthArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padT + plotH * (1 - frac);
          return (
            <line
              key={frac}
              x1={padL}
              y1={y}
              x2={width - padR}
              y2={y}
              stroke="#E2E8F0"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          );
        })}

        <path d={areaPath} fill="url(#bankGrowthArea)" />
        <path d={invPath} fill="none" stroke="#64748B" strokeWidth="2" strokeDasharray="4 3" />
        <path d={valPath} fill="none" stroke="#1D4ED8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {data.map((pt, i) => (
          <g key={pt.label}>
            {(i === data.length - 1 || i === 0 || labelIndices.has(i)) && (
              <circle cx={getX(i)} cy={getY(pt.value)} r="3.2" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="1.5" />
            )}
            {labelIndices.has(i) && (
              <text
                x={getX(i)}
                y={height - 6}
                textAnchor="middle"
                className="fill-slate-500 text-[10px] font-semibold"
              >
                {pt.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      <div className="flex items-center justify-center gap-5 text-[11px] font-semibold text-slate-600 mt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-slate-500 inline-block border-t border-dashed border-slate-600" />
          {investedLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#1D4ED8] inline-block" />
          {valueLabel}
        </span>
      </div>
    </div>
  );
};
