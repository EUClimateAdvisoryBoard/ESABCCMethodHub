/**
 * Figure 1 – EU Member State positions on EU ETS review (as of April 2026).
 * Reproduces the EPRS / Lucille Killmayer dot-matrix graphic used on the
 * Secretariat News Feed.
 *
 * Cell values: 'in' (in favour), 'op' (opposed), '' (missing/not available).
 * Source: compiled from publicly available information, EPRS, April 2026.
 */

type Cell = 'in' | 'op' | '';

const COUNTRIES = [
  'BG', 'CZ', 'DK', 'DE', 'EE', 'EL', 'ES', 'FR', 'HR', 'IT', 'LU',
  'HU', 'NL', 'AT', 'PL', 'PT', 'RO', 'SI', 'SK', 'FI', 'SE',
];

interface Row {
  label: string;
  cells: Cell[];
}

const ROWS: Row[] = [
  // BG  CZ  DK  DE  EE  EL  ES  FR  HR  IT  LU  HU  NL  AT  PL  PT  RO  SI  SK  FI  SE
  { label: 'Carbon Central Bank', cells:
    ['',  '',  '',  '',  '',  '',  '',  '',  '',  '',  '',  '',  '',  '',  'in','',  '',  '',  '',  '',  ''] },
  { label: 'International credits in EU ETS', cells:
    ['',  '',  '',  'op','',  '',  '',  'op','',  '',  'in','',  'op','in','in','',  '',  '',  '',  'op','' ] },
  { label: 'MWI', cells:
    ['',  '',  '',  '',  '',  '',  '',  '',  '',  '',  '',  '',  'in','',  '',  '',  '',  '',  '',  '',  'in'] },
  { label: 'Pause ETS1', cells:
    ['',  'in','op','',  '',  '',  'op','op','',  'in','',  'op','',  '',  'in','',  '',  'op','in','op','op'] },
  { label: 'Postpone ETS2', cells:
    ['',  'in','op','',  '',  '',  'op','op','',  'in','',  'op','op','',  'in','',  '',  'op','in','op','op'] },
  { label: 'Price corridor / cap', cells:
    ['',  'in','',  '',  '',  '',  'in','',  '',  'in','',  '',  '',  '',  'in','',  '',  '',  '',  '',  ''] },
  { label: 'Reduced LRF', cells:
    ['',  '',  '',  'in','',  '',  '',  'in','',  '',  '',  '',  'op','',  '',  '',  '',  '',  '',  '',  ''] },
  { label: 'Slower free allocation phase out', cells:
    ['in','in','',  'in','',  'in','in','',  '',  'in','',  'in','',  '',  'in','in','in','in','in','',  ''] },
  { label: 'Stronger Art. 29a', cells:
    ['',  'in','',  '',  '',  '',  'in','',  '',  '',  '',  '',  '',  '',  '',  '',  '',  '',  '',  '',  ''] },
  { label: 'Stronger MSR', cells:
    ['',  'in','',  'in','',  '',  '',  '',  '',  '',  '',  '',  'in','',  '',  '',  '',  '',  '',  '',  ''] },
  { label: 'Tackle speculation', cells:
    ['',  'in','',  '',  'in','',  '',  '',  '',  'in','',  '',  '',  '',  'in','',  '',  '',  '',  '',  ''] },
];

const COL_W = 34;
const ROW_H = 36;
const LEFT_PAD = 240;
const TOP_PAD = 92;
const RIGHT_PAD = 16;
const BOTTOM_PAD = 52;
const R = 10;

const GREEN = '#1E9E5A';
const RED = '#D8332C';
const EMPTY_FILL = '#FFFFFF';
const EMPTY_STROKE = '#C4C8CC';
const GRID_BG = '#F2F2F2';
const CELL_BG = '#E9EAEB';

export default function EuEtsPositionsFigure() {
  const width = LEFT_PAD + COUNTRIES.length * COL_W + RIGHT_PAD;
  const height = TOP_PAD + ROWS.length * ROW_H + BOTTOM_PAD;

  return (
    <figure className="w-full overflow-x-auto bg-white rounded-md border border-grey-200 p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="EU Member State positions on EU ETS review as of April 2026"
        className="w-full h-auto"
      >
        {/* Title */}
        <text x={10} y={22} fontSize={15} fontWeight={700} fill="#111">
          Figure 1 – EU Member State positions on EU ETS review (as of April 2026)
        </text>

        {/* Legend */}
        <g transform={`translate(${LEFT_PAD}, 46)`} fontSize={12} fill="#222">
          <circle cx={8} cy={6} r={7} fill={GREEN} />
          <text x={22} y={10}>In favour</text>
          <circle cx={110} cy={6} r={7} fill={RED} />
          <text x={124} y={10}>Opposed</text>
          <circle cx={210} cy={6} r={7} fill={EMPTY_FILL} stroke={EMPTY_STROKE} strokeWidth={1.2} />
          <text x={224} y={10}>Missing/Not available</text>
        </g>

        {/* Column headers */}
        {COUNTRIES.map((c, i) => (
          <text
            key={c}
            x={LEFT_PAD + i * COL_W + COL_W / 2}
            y={TOP_PAD - 12}
            fontSize={12}
            fontWeight={700}
            fill="#111"
            textAnchor="middle"
          >
            {c}
          </text>
        ))}

        {/* Grid background strips */}
        {ROWS.map((_, r) => (
          <rect
            key={`bg-${r}`}
            x={LEFT_PAD - 4}
            y={TOP_PAD + r * ROW_H}
            width={COUNTRIES.length * COL_W + 8}
            height={ROW_H - 4}
            fill={r % 2 === 0 ? GRID_BG : '#FFFFFF'}
          />
        ))}

        {/* Dots + row labels */}
        {ROWS.map((row, r) => (
          <g key={row.label}>
            <text
              x={LEFT_PAD - 10}
              y={TOP_PAD + r * ROW_H + ROW_H / 2 + 4}
              fontSize={12.5}
              fill="#222"
              textAnchor="end"
            >
              {row.label}
            </text>
            {row.cells.map((cell, c) => {
              const cx = LEFT_PAD + c * COL_W + COL_W / 2;
              const cy = TOP_PAD + r * ROW_H + ROW_H / 2 - 2;
              if (cell === 'in') {
                return <circle key={c} cx={cx} cy={cy} r={R} fill={GREEN} />;
              }
              if (cell === 'op') {
                return <circle key={c} cx={cx} cy={cy} r={R} fill={RED} />;
              }
              return (
                <circle
                  key={c}
                  cx={cx}
                  cy={cy}
                  r={R}
                  fill={CELL_BG}
                  stroke={EMPTY_STROKE}
                  strokeWidth={1.1}
                />
              );
            })}
          </g>
        ))}

        {/* Source */}
        <text
          x={10}
          y={height - 14}
          fontSize={11}
          fill="#555"
          fontStyle="italic"
        >
          Source: compiled by the author on the basis of publicly available information. Graphic by Lucille Killmayer, EPRS.
        </text>
      </svg>
    </figure>
  );
}
