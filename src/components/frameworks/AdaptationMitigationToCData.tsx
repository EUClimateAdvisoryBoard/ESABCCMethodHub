'use client';

/**
 * Adaptation–Mitigation Theory of Change — with indicator data
 *
 * Builds upon the original Adaptation–Mitigation ToC flow chart (rendered
 * unchanged via <AdaptationMitigationToC />) and backs it with the platform's
 * indicator database:
 *
 *   • a headline strip above the diagrams with the four key figures (E1
 *     supply GHG, E2 fossil share, E4a solar additions, cooling degree days
 *     as the E7 proxy), each with latest value and ten-year trend badge; and
 *   • an "Indicator data behind the framework" panel below the diagrams: one
 *     card per indicator named in the ToC (E1–E6, O2 from the ESABCC report
 *     set), grouped by ToC layer, plus a candidate set of adaptation series
 *     for the proposed E7 resilience indicator — each with latest value,
 *     direction-aware trend, sparkline and primary-source link.
 */
import AdaptationMitigationToC from '@/components/frameworks/AdaptationMitigationToC';
import IndicatorChart from '@/components/frameworks/IndicatorChart';
import type { Indicator } from '@/data/ecno-indicators';
import { ESABCC_REPORT_INDICATORS } from '@/data/esabcc-indicators';
import { BETA_ADAPTATION_INDICATORS } from '@/data/beta-indicators';
import { ADVANCED_ADAPTATION_INDICATORS } from '@/data/advanced-indicators';

const INDICATOR_INDEX = new Map<string, Indicator>(
  [
    ...ESABCC_REPORT_INDICATORS,
    ...BETA_ADAPTATION_INDICATORS,
    ...ADVANCED_ADAPTATION_INDICATORS,
  ].map((i) => [i.id, i]),
);

interface CardSpec {
  indicatorId: string;
  /** Where this series plugs into the ToC diagram above. */
  tocRole: string;
  /** Multiplier applied before display (e.g. fraction-stored share → %). */
  scale?: number;
  decimals?: number;
  caveat?: string;
}

interface LayerSpec {
  title: string;
  blurb: string;
  /** Coral styling for the adaptation track. */
  adaptation?: boolean;
  cards: CardSpec[];
}

const DATA_LAYERS: LayerSpec[] = [
  {
    title: 'Impact — decarbonised EU energy supply',
    blurb: 'The long-run goal of the mitigation chain: energy supply GHG to net zero by 2050.',
    cards: [
      { indicatorId: 'esabcc-e1-energy-supply-ghg', tocRole: 'Impact · E1', decimals: 0 },
    ],
  },
  {
    title: 'Outcomes — lower-carbon supply, lower demand',
    blurb:
      'The intermediate results the levers must deliver. The adaptation-demand pressure box in the diagram bears directly on O2: cooling and desalination push primary and final demand back up.',
    cards: [
      { indicatorId: 'esabcc-e2-fossil-power-share', tocRole: 'Outcome · E2 (fossil)', decimals: 1 },
      { indicatorId: 'esabcc-e2-res-noBio-power-share', tocRole: 'Outcome · E2 (RES)', scale: 100, decimals: 1 },
      { indicatorId: 'esabcc-o2-pec', tocRole: 'Outcome · O2 (primary)', decimals: 0 },
      { indicatorId: 'esabcc-o2-fec', tocRole: 'Outcome · O2 (final)', decimals: 0 },
    ],
  },
  {
    title: 'Outputs — indicator row of the ToC',
    blurb: 'The measurable outputs each mitigation lever feeds, exactly as boxed in the diagram.',
    cards: [
      { indicatorId: 'esabcc-e3-grid-co2-intensity', tocRole: 'Output · E3 grid mix', decimals: 0 },
      { indicatorId: 'esabcc-e4a-solar-pv-add', tocRole: 'Output · E4a RES roll-out', decimals: 1 },
      { indicatorId: 'esabcc-e4b-wind-add', tocRole: 'Output · E4b/c RES roll-out', decimals: 1 },
      { indicatorId: 'esabcc-e5-electrification', tocRole: 'Output · E5 electrification', decimals: 1 },
      { indicatorId: 'esabcc-e6-energy-ch4', tocRole: 'Output · E6 methane', decimals: 1 },
    ],
  },
  {
    title: 'Adaptation track — candidate series for the proposed E7',
    blurb:
      'E7 (climate resilience of energy infrastructure) has no observed series yet — that gap is the point of the coral row. These are the closest live proxies in the indicator database, covering the hazard pathways of the detail diagram.',
    adaptation: true,
    cards: [
      {
        indicatorId: 'adv-adapt-cooling-degree-days',
        tocRole: 'Hazard · heat → cooling demand (↑ O2)',
        decimals: 0,
        caveat: 'Weather-driven and volatile; non-anchor years are interpolated.',
      },
      {
        indicatorId: 'beta-adapt-energy-drought-damage',
        tocRole: 'Impact · drought → hydro + thermal output',
        decimals: 1,
        caveat:
          'JRC PESETA IV scenario baseline (≈€1.4 bn/yr today → ≈€3.3 bn/yr at +3 °C) — not an observed annual series.',
      },
      {
        indicatorId: 'adv-adapt-wei',
        tocRole: 'Risk · cooling water for thermal + CCS (⚠ water risk)',
        decimals: 1,
        caveat: 'EU aggregate masks severe seasonal/basin stress (Cyprus 71%, Malta 34% in 2022).',
      },
      {
        indicatorId: 'adv-adapt-economic-losses',
        tocRole: 'Context · climate extremes → infrastructure damage',
        decimals: 1,
        caveat: 'Decadal averages plotted at mid-decade, plus recent single years.',
      },
    ],
  },
];

/** Headline figures shown above the diagrams (subset of the layer cards). */
const HEADLINE_IDS: ReadonlyArray<{ indicatorId: string; label: string; scale?: number; decimals?: number }> = [
  { indicatorId: 'esabcc-e1-energy-supply-ghg', label: 'E1 · supply GHG', decimals: 0 },
  { indicatorId: 'esabcc-e2-fossil-power-share', label: 'E2 · fossil share', decimals: 1 },
  { indicatorId: 'esabcc-e4a-solar-pv-add', label: 'E4a · solar additions', decimals: 1 },
  { indicatorId: 'adv-adapt-cooling-degree-days', label: 'E7 proxy · cooling degree days', decimals: 0 },
];

interface Trend {
  baseYear: number;
  pct: number;
  improving: boolean;
}

function fmt(value: number, decimals = 0): string {
  return value.toLocaleString('en-GB', { maximumFractionDigits: decimals });
}

function latestPoint(ind: Indicator) {
  const data = [...ind.data].sort((a, b) => a.year - b.year);
  return data[data.length - 1];
}

/** Change from the closest point ≥10 years before the latest (or the first point). */
function trendFor(ind: Indicator): Trend | null {
  const data = [...ind.data].sort((a, b) => a.year - b.year);
  if (data.length < 2) return null;
  const last = data[data.length - 1];
  const base = [...data].filter((d) => d.year <= last.year - 10).pop() ?? data[0];
  if (base.year === last.year || base.value === 0) return null;
  const pct = ((last.value - base.value) / Math.abs(base.value)) * 100;
  return { baseYear: base.year, pct, improving: ind.direction === 'down' ? pct < 0 : pct > 0 };
}

function TrendBadge({ trend }: { trend: Trend | null }) {
  if (!trend) return <span className="text-[10px] text-tertiary-light">single reference point</span>;
  const cls = trend.improving ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-red-50 text-red-800 border-red-200';
  const arrow = trend.pct < 0 ? '▼' : '▲';
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {arrow} {Math.abs(trend.pct) >= 10 ? Math.round(Math.abs(trend.pct)) : Math.abs(trend.pct).toFixed(1)}%
      <span className="font-normal opacity-75">since {trend.baseYear}</span>
    </span>
  );
}

function IndicatorCard({ spec, adaptation }: { spec: CardSpec; adaptation?: boolean }) {
  const ind = INDICATOR_INDEX.get(spec.indicatorId);
  if (!ind) return null;
  const last = latestPoint(ind);
  const trend = trendFor(ind);
  const scale = spec.scale ?? 1;
  const chip = adaptation
    ? 'bg-orange-50 border-orange-300 text-orange-900'
    : 'bg-indigo-50 border-indigo-200 text-indigo-900';
  return (
    <div className="rounded-lg border border-grey-200 bg-white p-3 flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold ${chip}`}>
          {spec.tocRole}
        </span>
        <TrendBadge trend={trend} />
      </div>
      <div className="text-xs font-semibold text-tertiary-dark leading-snug">{ind.name}</div>
      {last && (
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-tertiary-dark">{fmt(last.value * scale, spec.decimals)}</span>
          <span className="text-[10px] text-tertiary">
            {ind.unit} · {last.year}
            {last.estimated ? ' (est.)' : ''}
          </span>
        </div>
      )}
      {ind.data.length >= 4 ? (
        <IndicatorChart indicator={ind} spark height={40} />
      ) : (
        <div className="text-[10px] text-tertiary-light italic">
          Sparse series — {ind.data.length} reference point{ind.data.length === 1 ? '' : 's'}.
        </div>
      )}
      {spec.caveat && <p className="text-[10px] text-tertiary leading-snug">{spec.caveat}</p>}
      <a
        href={ind.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="text-[10px] text-tertiary-light hover:text-tertiary underline decoration-dotted truncate"
        title={ind.source}
      >
        {ind.source}
      </a>
    </div>
  );
}

function HeadlineStrip() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {HEADLINE_IDS.map((h) => {
        const ind = INDICATOR_INDEX.get(h.indicatorId);
        if (!ind) return null;
        const last = latestPoint(ind);
        const trend = trendFor(ind);
        return (
          <div key={h.indicatorId} className="rounded-lg border border-grey-200 bg-white px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold">{h.label}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-tertiary-dark">
                {last ? fmt(last.value * (h.scale ?? 1), h.decimals) : '—'}
              </span>
              <span className="text-[10px] text-tertiary">
                {ind.unit} · {last?.year}
                {last?.estimated ? ' (est.)' : ''}
              </span>
            </div>
            <div className="mt-0.5">
              <TrendBadge trend={trend} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdaptationMitigationToCData() {
  return (
    <div className="space-y-6">
      {/* Headline indicator figures */}
      <HeadlineStrip />

      {/* The original ToC flow chart, unchanged */}
      <AdaptationMitigationToC />

      {/* Indicator data behind the framework */}
      <div className="rounded-xl border border-grey-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-tertiary-dark mb-1">Indicator data behind the framework</h3>
        <p className="text-xs text-tertiary max-w-3xl mb-4">
          Live series from the indicator database for every indicator named in the Theory of Change,
          grouped by ToC layer. Each card shows the latest value, the change over roughly the last
          decade (green = moving in the right direction), a sparkline of the full series, and the
          primary source. Amber points are post-report updates; hollow points are interpolated.
        </p>
        <div className="space-y-5">
          {DATA_LAYERS.map((layer) => (
            <div key={layer.title}>
              <h4
                className={`text-xs font-semibold mb-0.5 ${
                  layer.adaptation ? 'text-orange-900' : 'text-tertiary-dark'
                }`}
              >
                {layer.title}
              </h4>
              <p className="text-[11px] text-tertiary max-w-3xl mb-2">{layer.blurb}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {layer.cards.map((spec) => (
                  <IndicatorCard key={spec.indicatorId} spec={spec} adaptation={layer.adaptation} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-tertiary-light px-1">
        Indicator series: ESABCC report underlying data (E1–E6, O2) with post-report refreshes, plus
        EEA / Eurostat / JRC adaptation series as candidate proxies for the proposed E7 resilience
        indicator.
      </p>
    </div>
  );
}
