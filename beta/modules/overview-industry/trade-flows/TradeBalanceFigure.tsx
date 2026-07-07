'use client';

/**
 * Overview Industry — Trade flows — the balance & exposure figure.
 * ----------------------------------------------------------------
 * A diverging bar chart of all 24 NACE Section C divisions: extra-EU imports
 * (left, red) vs extra-EU exports (right, colour by branch), sorted by net
 * balance, with the intra-EU flows drawn faintly behind for context. Every
 * value is REAL Eurostat data (ext_tec01, EU-27) for the selected year.
 * Click a division to drive the detail panel in the parent explorer.
 */

import { DIVISION_TRADE, TRADE_BRANCH_COLORS, type DivisionTrade, type TecYear } from './trade-data';

const fmt = (v: number) => (v >= 100 ? v.toFixed(0) : v.toFixed(1));

export default function TradeBalanceFigure({
  selected,
  onSelect,
  showIntra,
  year,
}: {
  selected: string | null;
  onSelect: (code: string) => void;
  showIntra: boolean;
  year: TecYear;
}) {
  const rows = [...DIVISION_TRADE].sort(
    (a, b) => b.flows[year].expExt - b.flows[year].impExt - (a.flows[year].expExt - a.flows[year].impExt),
  );

  // Symmetric axis: widest single bar on either side sets the scale.
  const maxSide = Math.max(
    ...DIVISION_TRADE.flatMap((d) => {
      const f = d.flows[year];
      return showIntra ? [f.impExt + f.impInt, f.expExt + f.expInt] : [f.impExt, f.expExt];
    }),
  );

  const ROW_H = 26;
  const GAP = 4;
  const LABEL_W = 190;
  const HALF = 330; // px per side for the bars
  const width = LABEL_W + HALF * 2 + 8;
  const height = rows.length * (ROW_H + GAP) + 34;
  const scale = (v: number) => (v / maxSide) * HALF;
  const mid = LABEL_W + HALF;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ minWidth: 720 }}
        role="img"
        aria-label={`EU-27 manufacturing extra-EU imports versus exports by NACE division, ${year}`}
      >
        {/* column headers */}
        <text x={mid - 8} y={14} textAnchor="end" className="fill-accent-red" fontSize={11} fontWeight={700}>
          ◄ Imports (extra-EU)
        </text>
        <text x={mid + 8} y={14} textAnchor="start" className="fill-secondary" fontSize={11} fontWeight={700}>
          Exports (extra-EU) ►
        </text>
        {/* centre line */}
        <line x1={mid} y1={22} x2={mid} y2={height - 6} stroke="#DCDDDE" strokeWidth={1} />

        {rows.map((d, i) => {
          const f = d.flows[year];
          const y = 28 + i * (ROW_H + GAP);
          const isSel = selected === d.code;
          const color = TRADE_BRANCH_COLORS[d.branch];
          const impW = scale(f.impExt);
          const expW = scale(f.expExt);
          const impIntW = scale(f.impInt);
          const expIntW = scale(f.expInt);
          const net = f.expExt - f.impExt;
          return (
            <g
              key={d.code}
              onClick={() => onSelect(d.code)}
              style={{ cursor: 'pointer' }}
              opacity={selected && !isSel ? 0.5 : 1}
            >
              <rect
                x={2}
                y={y - 2}
                width={width - 4}
                height={ROW_H}
                rx={4}
                fill={isSel ? '#F2F6F8' : 'transparent'}
                stroke={isSel ? color : 'transparent'}
                strokeWidth={1}
              />
              {/* label */}
              <text x={LABEL_W - 8} y={y + ROW_H / 2 - 4} textAnchor="end" fontSize={11} fontWeight={600} className="fill-grey-900">
                {d.label.length > 26 ? d.label.slice(0, 25) + '…' : d.label}
              </text>
              <text x={LABEL_W - 8} y={y + ROW_H / 2 + 7} textAnchor="end" fontSize={9} className="fill-grey-500">
                {d.code} · {net >= 0 ? '+' : ''}€{fmt(net)}bn net
              </text>

              {/* intra-EU context (faint, behind) */}
              {showIntra && (
                <>
                  <rect x={mid - impW - impIntW} y={y + 2} width={impIntW} height={ROW_H - 8} fill="#B83230" opacity={0.18} />
                  <rect x={mid + expW} y={y + 2} width={expIntW} height={ROW_H - 8} fill="#007B6C" opacity={0.18} />
                </>
              )}

              {/* extra-EU imports (left) */}
              <rect x={mid - impW} y={y} width={impW} height={ROW_H - 4} rx={2} fill="#B83230" />
              {/* extra-EU exports (right) */}
              <rect x={mid} y={y} width={expW} height={ROW_H - 4} rx={2} fill={color} opacity={0.92} />

              {/* value labels for the big ones */}
              {f.impExt > maxSide * 0.08 && (
                <text x={mid - impW + 4} y={y + ROW_H / 2 + 1} fontSize={9} fontWeight={700} fill="#fff">
                  {fmt(f.impExt)}
                </text>
              )}
              {f.expExt > maxSide * 0.08 && (
                <text x={mid + expW - 4} y={y + ROW_H / 2 + 1} textAnchor="end" fontSize={9} fontWeight={700} fill="#fff">
                  {fmt(f.expExt)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export type { DivisionTrade };
