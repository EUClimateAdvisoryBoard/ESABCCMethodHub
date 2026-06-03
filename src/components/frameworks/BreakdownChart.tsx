/**
 * Stacked bar chart for categorical indicator breakdowns — used to render
 * indicators the report draws as bars (e.g. I7 low-carbon projects by
 * technology group and project scale) the way they appear in the report.
 */
'use client';
import type { IndicatorBreakdown } from '@/data/indicator-breakdowns';

export default function BreakdownChart({ spec, height = 200 }: { spec: IndicatorBreakdown; height?: number }) {
  const { categories, series } = spec;
  const totals = categories.map((_, ci) => series.reduce((s, ser) => s + (ser.values[ci] ?? 0), 0));
  const maxTotal = Math.max(1, ...totals);
  // round axis up to a "nice" tick
  const step = niceStep(maxTotal);
  const axisMax = Math.ceil(maxTotal / step) * step;
  const ticks = Array.from({ length: axisMax / step + 1 }, (_, i) => i * step);

  const W = 340;
  const H = height;
  const padL = 26;
  const padR = 8;
  const padB = 46;
  const padT = 8;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = categories.length;
  const slot = plotW / n;
  const barW = Math.min(34, slot * 0.6);
  const y = (v: number) => padT + plotH * (1 - v / axisMax);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="breakdown chart">
        {/* gridlines + y labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="#ececed" strokeWidth={1} />
            <text x={padL - 4} y={y(t) + 3} textAnchor="end" fontSize={8} fill="#9ca3af">
              {t}
            </text>
          </g>
        ))}

        {/* stacked bars */}
        {categories.map((cat, ci) => {
          const cx = padL + slot * ci + slot / 2;
          let acc = 0;
          return (
            <g key={cat}>
              {series.map((ser) => {
                const v = ser.values[ci] ?? 0;
                if (v <= 0) return null;
                const yTop = y(acc + v);
                const hgt = y(acc) - y(acc + v);
                acc += v;
                return (
                  <rect key={ser.label} x={cx - barW / 2} y={yTop} width={barW} height={hgt} fill={ser.color}>
                    <title>{`${cat} · ${ser.label}: ${v}`}</title>
                  </rect>
                );
              })}
              {/* category label (wrapped) */}
              {wrap(cat, 16).map((line, li) => (
                <text key={li} x={cx} y={H - padB + 12 + li * 8} textAnchor="middle" fontSize={7.5} fill="#6b7280">
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 justify-center">
        {series.map((ser) => (
          <span key={ser.label} className="inline-flex items-center gap-1 text-[10px] text-gray-600">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ser.color }} />
            {ser.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function niceStep(max: number): number {
  const raw = max / 5;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const mult = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return Math.max(1, mult * pow);
}

function wrap(text: string, max: number): string[] {
  const words = text.split(/[\s/]+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}
