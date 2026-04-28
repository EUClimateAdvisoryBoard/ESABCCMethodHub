/**
 * Figure – "One Europe, One Market" roadmap timeline (April 2026).
 * Renders the priority actions agreed by the Council, Parliament and
 * Commission in the joint roadmap, grouped by strategic building block.
 * Each row shows the quarter of proposal (●) and the target quarter for
 * agreement (◆), connected by a bar coloured by building block.
 *
 * Source: One Europe, One Market joint roadmap, signed 24 April 2026.
 */

type Quarter =
  | '2025-Q4' | '2026-Q1' | '2026-Q2' | '2026-Q3' | '2026-Q4'
  | '2027-Q1' | '2027-Q2' | '2027-Q3' | '2027-Q4';

const QUARTERS: Quarter[] = [
  '2025-Q4', '2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4',
  '2027-Q1', '2027-Q2', '2027-Q3', '2027-Q4',
];

interface Action {
  label: string;
  proposal: Quarter;
  agreement: Quarter;
}

interface Block {
  title: string;
  color: string;
  actions: Action[];
}

const BLOCKS: Block[] = [
  {
    title: 'Simplifying rules',
    color: '#6B7280',
    actions: [
      { label: 'Omnibus on energy products', proposal: '2026-Q3', agreement: '2027-Q4' },
    ],
  },
  {
    title: 'A more integrated Single Market',
    color: '#1F6FEB',
    actions: [
      { label: 'EU Inc.', proposal: '2026-Q1', agreement: '2026-Q4' },
      { label: 'Industrial Accelerator Act', proposal: '2026-Q1', agreement: '2026-Q4' },
      { label: 'Public Procurement Act', proposal: '2026-Q2', agreement: '2027-Q4' },
      { label: 'Critical Raw Materials Centre', proposal: '2026-Q2', agreement: '2026-Q4' },
      { label: 'Circular Economy Act', proposal: '2026-Q3', agreement: '2027-Q3' },
    ],
  },
  {
    title: 'Reducing energy prices & decarbonising',
    color: '#1E9E5A',
    actions: [
      { label: 'European Grids package', proposal: '2025-Q4', agreement: '2026-Q3' },
      { label: 'Energy Highways (investment projects)', proposal: '2025-Q4', agreement: '2026-Q2' },
      { label: 'Market Stability Reserve amendment', proposal: '2026-Q2', agreement: '2026-Q4' },
      { label: 'Network charges & taxation', proposal: '2026-Q2', agreement: '2027-Q2' },
      { label: 'Energy security package', proposal: '2026-Q2', agreement: '2027-Q2' },
      { label: 'ETS review', proposal: '2026-Q3', agreement: '2027-Q1' },
      { label: 'Energy efficiency framework', proposal: '2026-Q3', agreement: '2027-Q4' },
      { label: 'Renewable energy framework', proposal: '2026-Q3', agreement: '2027-Q4' },
      { label: 'Energy Union governance update', proposal: '2026-Q4', agreement: '2027-Q4' },
    ],
  },
];

const COL_W = 70;
const ROW_H = 24;
const HEADER_H = 26;
const LEFT_PAD = 280;
const TOP_PAD = 88;
const RIGHT_PAD = 14;
const BOTTOM_PAD = 56;

export default function OneEuropeOneMarketFigure() {
  let totalRows = 0;
  for (const b of BLOCKS) totalRows += 1 + b.actions.length;

  const width = LEFT_PAD + QUARTERS.length * COL_W + RIGHT_PAD;
  const gridHeight = totalRows * ROW_H;
  const height = TOP_PAD + gridHeight + BOTTOM_PAD;

  const quarterX = (q: Quarter) => {
    const idx = QUARTERS.indexOf(q);
    return LEFT_PAD + idx * COL_W + COL_W / 2;
  };

  let y = TOP_PAD;
  const rendered: React.ReactNode[] = [];

  BLOCKS.forEach((block, bi) => {
    const blockY = y;
    rendered.push(
      <g key={`hdr-${bi}`}>
        <rect
          x={4}
          y={blockY}
          width={width - 8}
          height={HEADER_H - 2}
          fill={block.color}
          opacity={0.12}
          rx={3}
        />
        <rect x={4} y={blockY} width={4} height={HEADER_H - 2} fill={block.color} rx={1} />
        <text
          x={14}
          y={blockY + HEADER_H / 2 + 4}
          fontSize={12}
          fontWeight={700}
          fill={block.color}
        >
          {block.title}
        </text>
      </g>,
    );
    y += HEADER_H;

    block.actions.forEach((a, ai) => {
      const rowY = y;
      const cy = rowY + ROW_H / 2;
      const x1 = quarterX(a.proposal);
      const x2 = quarterX(a.agreement);

      rendered.push(
        <g key={`row-${bi}-${ai}`}>
          {ai % 2 === 0 && (
            <rect
              x={LEFT_PAD - 4}
              y={rowY}
              width={QUARTERS.length * COL_W + 8}
              height={ROW_H}
              fill="#FAFAFA"
            />
          )}
          <text
            x={LEFT_PAD - 12}
            y={cy + 4}
            fontSize={11.5}
            fill="#222"
            textAnchor="end"
          >
            {a.label}
          </text>
          <line
            x1={x1}
            y1={cy}
            x2={x2}
            y2={cy}
            stroke={block.color}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.55}
          />
          <circle cx={x1} cy={cy} r={6.5} fill={block.color} />
          <polygon
            points={`${x2},${cy - 7} ${x2 + 7},${cy} ${x2},${cy + 7} ${x2 - 7},${cy}`}
            fill={block.color}
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
        </g>,
      );
      y += ROW_H;
    });
  });

  return (
    <figure className="w-full overflow-x-auto bg-white rounded-md border border-grey-200 p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="One Europe One Market roadmap timeline of priority actions"
        className="w-full h-auto"
      >
        {/* Title */}
        <text x={10} y={22} fontSize={15} fontWeight={700} fill="#111">
          One Europe, One Market — roadmap of priority actions (signed 24 April 2026)
        </text>

        {/* Legend */}
        <g transform={`translate(${LEFT_PAD}, 44)`} fontSize={11.5} fill="#222">
          <circle cx={8} cy={6} r={6} fill="#333" />
          <text x={20} y={10}>Commission proposal</text>
          <polygon points="158,0 165,7 158,14 151,7" fill="#333" />
          <text x={172} y={10}>Target for agreement</text>
          <line x1={310} y1={7} x2={345} y2={7} stroke="#333" strokeWidth={4} opacity={0.55} strokeLinecap="round" />
          <text x={352} y={10}>Negotiation window</text>
        </g>

        {/* Vertical quarter gridlines + headers */}
        {QUARTERS.map((q, i) => {
          const x = LEFT_PAD + i * COL_W + COL_W / 2;
          return (
            <g key={q}>
              <line
                x1={x}
                y1={TOP_PAD - 4}
                x2={x}
                y2={TOP_PAD + gridHeight}
                stroke="#E5E7EB"
                strokeWidth={1}
              />
              <text
                x={x}
                y={TOP_PAD - 12}
                fontSize={11}
                fontWeight={700}
                fill="#111"
                textAnchor="middle"
              >
                {q.replace('-', ' ')}
              </text>
            </g>
          );
        })}

        {/* Year separator: between 2026-Q4 and 2027-Q1 */}
        <line
          x1={LEFT_PAD + 5 * COL_W}
          y1={TOP_PAD - 18}
          x2={LEFT_PAD + 5 * COL_W}
          y2={TOP_PAD + gridHeight}
          stroke="#9CA3AF"
          strokeWidth={1.2}
          strokeDasharray="3 3"
        />

        {rendered}

        {/* Source */}
        <text
          x={10}
          y={height - 14}
          fontSize={10.5}
          fill="#555"
          fontStyle="italic"
        >
          Source: ESABCC Secretariat, compiled from the One Europe, One Market joint roadmap (Council–Parliament–Commission, 24 April 2026).
        </text>
      </svg>
    </figure>
  );
}
