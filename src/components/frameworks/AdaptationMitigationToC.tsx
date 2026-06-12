'use client';

/**
 * Adaptation–Mitigation Theory of Change — EU Energy Supply Sector
 *
 * Two SVG diagrams adapted from EUCRA Chapter 8 analysis:
 *   1. Full Theory of Change: six-layer policy logic showing how adaptation
 *      considerations (coral) integrate with the existing mitigation framework
 *      (teal) without disrupting the causal chain.
 *   2. Hazard detail: zooms into the Activities row — five climate hazards flow
 *      through seven physical impacts to disrupt specific mitigation levers.
 *
 * The diagrams are backed by the platform's indicator database: a headline
 * strip and a per-layer data panel pull the live series for every indicator
 * named in the ToC (E1–E6, O2 from the ESABCC report set) plus a candidate
 * set of adaptation series for the proposed E7 resilience indicator, each
 * with latest value, ten-year trend and sparkline.
 *
 * Both diagrams use CSS custom properties so they respond to dark mode.
 */
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

export default function AdaptationMitigationToC() {
  return (
    <div className="space-y-6">
      {/* Description */}
      <div className="rounded-xl border border-grey-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-tertiary-dark mb-1">
          Adaptation–Mitigation Theory of Change — EU Energy Supply Sector
        </h2>
        <p className="text-xs text-tertiary max-w-3xl mb-3">
          An integrated framework showing how climate adaptation considerations interact with the
          existing mitigation policy logic. Based on EUCRA Chapter 8 (EEA, 2024) energy system
          climate risk assessment.
        </p>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 border border-teal-200 px-2 py-1 text-teal-800 font-medium">
            Existing mitigation framework
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-50 border border-orange-300 px-2 py-1 text-orange-900 font-medium">
            New adaptation additions
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 border border-red-300 px-2 py-1 text-red-900 font-medium">
            Adaptation risk / pressure
          </span>
        </div>
      </div>

      {/* Headline indicator figures */}
      <HeadlineStrip />

      {/* Diagram 1 */}
      <div className="rounded-xl border border-grey-200 bg-white p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold text-tertiary-dark mb-1">Theory of Change — full policy logic</h3>
        <p className="text-xs text-tertiary mb-4">
          Read bottom-up: enabling conditions → levers → outputs → outcomes → impact. Adaptation is
          integrated at each layer without disrupting the mitigation causal chain.
        </p>
        <style>{tocStyles}</style>
        <svg viewBox="0 0 680 1010" xmlns="http://www.w3.org/2000/svg" className="toc-svg" style={{ display: 'block', width: '100%', minWidth: 640 }} role="img" aria-label="Adaptation-integrated Theory of Change for EU energy supply">
          <defs>
            <marker id="toc-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </marker>
          </defs>

          {/* LEFT RAIL */}
          <g className="toc-c-gray"><rect x="2" y="20" width="82" height="52" rx="6" strokeWidth="0.5"/><text className="toc-th" x="43" y="40" textAnchor="middle" dominantBaseline="central">Impact</text><text className="toc-ts" x="43" y="58" textAnchor="middle" dominantBaseline="central">long-run goal</text></g>
          <g className="toc-c-gray"><rect x="2" y="140" width="82" height="52" rx="6" strokeWidth="0.5"/><text className="toc-th" x="43" y="160" textAnchor="middle" dominantBaseline="central">Outcomes</text><text className="toc-ts" x="43" y="178" textAnchor="middle" dominantBaseline="central">intermediate</text></g>
          <g className="toc-c-gray"><rect x="2" y="310" width="82" height="52" rx="6" strokeWidth="0.5"/><text className="toc-th" x="43" y="330" textAnchor="middle" dominantBaseline="central">Outputs</text><text className="toc-ts" x="43" y="348" textAnchor="middle" dominantBaseline="central">indicators</text></g>
          <g className="toc-c-gray"><rect x="2" y="490" width="82" height="52" rx="6" strokeWidth="0.5"/><text className="toc-th" x="43" y="510" textAnchor="middle" dominantBaseline="central">Activities</text><text className="toc-ts" x="43" y="528" textAnchor="middle" dominantBaseline="central">levers</text></g>
          <g className="toc-c-gray"><rect x="2" y="670" width="82" height="52" rx="6" strokeWidth="0.5"/><text className="toc-th" x="43" y="690" textAnchor="middle" dominantBaseline="central">Inputs</text><text className="toc-ts" x="43" y="708" textAnchor="middle" dominantBaseline="central">enabling</text></g>
          <g className="toc-c-gray"><rect x="2" y="840" width="82" height="66" rx="6" strokeWidth="0.5"/><text className="toc-th" x="43" y="860" textAnchor="middle" dominantBaseline="central">Assump-</text><text className="toc-th" x="43" y="878" textAnchor="middle" dominantBaseline="central">tions</text><text className="toc-ts" x="43" y="896" textAnchor="middle" dominantBaseline="central">explicit</text></g>

          {/* Dividers */}
          <line x1="0" y1="110" x2="680" y2="110" stroke="#d3d1c7" strokeWidth="0.5" strokeDasharray="3 4"/>
          <line x1="0" y1="280" x2="680" y2="280" stroke="#d3d1c7" strokeWidth="0.5" strokeDasharray="3 4"/>
          <line x1="0" y1="460" x2="680" y2="460" stroke="#d3d1c7" strokeWidth="0.5" strokeDasharray="3 4"/>
          <line x1="0" y1="640" x2="680" y2="640" stroke="#d3d1c7" strokeWidth="0.5" strokeDasharray="3 4"/>
          <line x1="0" y1="818" x2="680" y2="818" stroke="#d3d1c7" strokeWidth="0.5" strokeDasharray="3 4"/>
          <line x1="88" y1="0" x2="88" y2="1010" stroke="#d3d1c7" strokeWidth="0.5"/>

          {/* IMPACT */}
          <g className="toc-c-teal"><rect x="96" y="20" width="276" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="234" y="40" textAnchor="middle" dominantBaseline="central">Decarbonised EU energy supply</text><text className="toc-ts" x="234" y="60" textAnchor="middle" dominantBaseline="central">E1: energy supply GHG → net zero by 2050</text></g>
          <g className="toc-c-coral"><rect x="384" y="20" width="288" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="528" y="40" textAnchor="middle" dominantBaseline="central">Climate-resilient energy system</text><text className="toc-ts" x="528" y="60" textAnchor="middle" dominantBaseline="central">New: E7 infrastructure resilience → 2050</text></g>
          <line x1="374" y1="46" x2="386" y2="46" stroke="#d3d1c7" strokeWidth="0.5" strokeDasharray="3 3"/>

          {/* OUTCOMES */}
          <g className="toc-c-teal"><rect x="96" y="140" width="186" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="189" y="160" textAnchor="middle" dominantBaseline="central">↓ GHG from supply</text><text className="toc-ts" x="189" y="178" textAnchor="middle" dominantBaseline="central">E2, E3 indicators</text></g>
          <g className="toc-c-teal"><rect x="292" y="140" width="174" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="379" y="160" textAnchor="middle" dominantBaseline="central">↓ Energy demand</text><text className="toc-ts" x="379" y="178" textAnchor="middle" dominantBaseline="central">O2: final + primary demand</text></g>
          <g className="toc-c-coral"><rect x="476" y="140" width="196" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="574" y="160" textAnchor="middle" dominantBaseline="central">Resilient infrastructure</text><text className="toc-ts" x="574" y="178" textAnchor="middle" dominantBaseline="central">New: E7 adaptive capacity</text></g>
          <line x1="189" y1="140" x2="200" y2="74" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
          <line x1="379" y1="140" x2="270" y2="74" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
          <line x1="574" y1="140" x2="530" y2="74" stroke="#993C1D" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#toc-arrow)"/>

          {/* Adaptation demand pressure */}
          <g className="toc-c-red"><rect x="292" y="202" width="174" height="38" rx="6" strokeWidth="0.5"/><text className="toc-th" x="379" y="218" textAnchor="middle" dominantBaseline="central">⚠ Adaptation demand</text><text className="toc-ts" x="379" y="232" textAnchor="middle" dominantBaseline="central">cooling, desalination ↑ O2</text></g>
          <path d="M379 202 L379 194" stroke="#A32D2D" strokeWidth="0.5" strokeDasharray="3 3" markerEnd="url(#toc-arrow)"/>

          {/* OUTPUTS */}
          <g className="toc-c-purple"><rect x="96" y="300" width="138" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="165" y="320" textAnchor="middle" dominantBaseline="central">E2/E3: grid mix</text><text className="toc-ts" x="165" y="338" textAnchor="middle" dominantBaseline="central">Fossil share + intensity</text></g>
          <g className="toc-c-purple"><rect x="244" y="300" width="126" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="307" y="320" textAnchor="middle" dominantBaseline="central">E4a/b: RES</text><text className="toc-ts" x="307" y="338" textAnchor="middle" dominantBaseline="central">Solar PV + wind cap.</text></g>
          <g className="toc-c-purple"><rect x="380" y="300" width="110" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="435" y="320" textAnchor="middle" dominantBaseline="central">E6: methane</text><text className="toc-ts" x="435" y="338" textAnchor="middle" dominantBaseline="central">Fugitive emissions</text></g>
          <g className="toc-c-purple"><rect x="500" y="300" width="100" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="550" y="320" textAnchor="middle" dominantBaseline="central">E5 + O2</text><text className="toc-ts" x="550" y="338" textAnchor="middle" dominantBaseline="central">Electrif. + demand</text></g>
          <g className="toc-c-coral"><rect x="96" y="364" width="504" height="40" rx="8" strokeWidth="0.5"/><text className="toc-th" x="348" y="381" textAnchor="middle" dominantBaseline="central">New — E7: climate resilience of energy infrastructure</text><text className="toc-ts" x="348" y="396" textAnchor="middle" dominantBaseline="central">Physical risk exposure · adaptive capacity · disruption frequency of grid + generation assets</text></g>
          <line x1="165" y1="300" x2="168" y2="194" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
          <line x1="307" y1="300" x2="220" y2="194" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
          <line x1="435" y1="300" x2="380" y2="194" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
          <line x1="550" y1="300" x2="430" y2="194" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
          <line x1="348" y1="364" x2="548" y2="194" stroke="#993C1D" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#toc-arrow)"/>

          {/* ACTIVITIES / LEVERS */}
          <g className="toc-c-gray"><rect x="96" y="472" width="104" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="148" y="492" textAnchor="middle" dominantBaseline="central">Fossil fuel</text><text className="toc-th" x="148" y="510" textAnchor="middle" dominantBaseline="central">phase-out</text></g>
          <g className="toc-c-gray"><rect x="210" y="472" width="104" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="262" y="492" textAnchor="middle" dominantBaseline="central">Methane</text><text className="toc-th" x="262" y="510" textAnchor="middle" dominantBaseline="central">reduction</text></g>
          <g className="toc-c-gray"><rect x="324" y="472" width="94" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="371" y="492" textAnchor="middle" dominantBaseline="central">Fast RES</text><text className="toc-th" x="371" y="510" textAnchor="middle" dominantBaseline="central">roll-out</text></g>
          <g className="toc-c-teal"><rect x="324" y="530" width="94" height="24" rx="5" strokeWidth="0.5"/><text className="toc-ts" x="371" y="542" textAnchor="middle" dominantBaseline="central">↔ synergy</text></g>
          <g className="toc-c-gray"><rect x="428" y="472" width="92" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="474" y="492" textAnchor="middle" dominantBaseline="central">Targeted</text><text className="toc-th" x="474" y="510" textAnchor="middle" dominantBaseline="central">CCU/CCS</text></g>
          <g className="toc-c-red"><rect x="428" y="530" width="92" height="24" rx="5" strokeWidth="0.5"/><text className="toc-ts" x="474" y="542" textAnchor="middle" dominantBaseline="central">⚠ water risk</text></g>
          <g className="toc-c-gray"><rect x="530" y="472" width="100" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="580" y="492" textAnchor="middle" dominantBaseline="central">System</text><text className="toc-th" x="580" y="510" textAnchor="middle" dominantBaseline="central">integration</text></g>
          <g className="toc-c-teal"><rect x="530" y="530" width="100" height="24" rx="5" strokeWidth="0.5"/><text className="toc-ts" x="580" y="542" textAnchor="middle" dominantBaseline="central">↔ synergy</text></g>
          <g className="toc-c-coral"><rect x="96" y="564" width="504" height="38" rx="8" strokeWidth="0.5"/><text className="toc-th" x="348" y="580" textAnchor="middle" dominantBaseline="central">New lever — Physical resilience of energy infrastructure</text><text className="toc-ts" x="348" y="595" textAnchor="middle" dominantBaseline="central">Hardening assets · redundancy · climate-proofing grid + generation against hazard exposure</text></g>
          <line x1="148" y1="472" x2="155" y2="354" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
          <line x1="262" y1="472" x2="415" y2="354" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
          <line x1="371" y1="472" x2="295" y2="354" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
          <line x1="474" y1="472" x2="542" y2="354" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
          <line x1="580" y1="472" x2="558" y2="354" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
          <line x1="348" y1="564" x2="348" y2="406" stroke="#993C1D" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#toc-arrow)"/>

          {/* INPUTS */}
          <g className="toc-c-amber"><rect x="96" y="652" width="148" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="170" y="671" textAnchor="middle" dominantBaseline="central">Investor certainty</text><text className="toc-ts" x="170" y="689" textAnchor="middle" dominantBaseline="central">Market signals, price</text></g>
          <g className="toc-c-amber"><rect x="254" y="652" width="126" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="317" y="671" textAnchor="middle" dominantBaseline="central">Infrastructure</text><text className="toc-ts" x="317" y="689" textAnchor="middle" dominantBaseline="central">Grid, storage, networks</text></g>
          <g className="toc-c-amber"><rect x="390" y="652" width="210" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="495" y="671" textAnchor="middle" dominantBaseline="central">Cross-cutting conditions</text><text className="toc-ts" x="495" y="689" textAnchor="middle" dominantBaseline="central">Finance · skills · innovation</text></g>
          <g className="toc-c-coral"><rect x="96" y="714" width="504" height="38" rx="8" strokeWidth="0.5"/><text className="toc-th" x="348" y="730" textAnchor="middle" dominantBaseline="central">New — Physical risk assessment + adaptive capacity planning</text><text className="toc-ts" x="348" y="745" textAnchor="middle" dominantBaseline="central">Climate hazard mapping of assets · resilience investment as co-condition alongside decarbonisation finance</text></g>
          <line x1="170" y1="652" x2="180" y2="610" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
          <line x1="317" y1="652" x2="360" y2="610" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
          <line x1="495" y1="652" x2="530" y2="610" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
          <line x1="348" y1="714" x2="348" y2="604" stroke="#993C1D" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#toc-arrow)"/>

          {/* ASSUMPTIONS */}
          <g className="toc-c-gray"><rect x="96" y="826" width="240" height="60" rx="8" strokeWidth="0.5"/><text className="toc-th" x="216" y="847" textAnchor="middle" dominantBaseline="central">Existing (implicit)</text><text className="toc-ts" x="216" y="865" textAnchor="middle" dominantBaseline="central">Demand falls over time;</text><text className="toc-ts" x="216" y="879" textAnchor="middle" dominantBaseline="central">grid stays reliable; levers perform</text></g>
          <g className="toc-c-red"><rect x="346" y="826" width="254" height="60" rx="8" strokeWidth="0.5"/><text className="toc-th" x="473" y="847" textAnchor="middle" dominantBaseline="central">New — explicit risk assumptions</text><text className="toc-ts" x="473" y="865" textAnchor="middle" dominantBaseline="central">Physical risks do not impair lever performance;</text><text className="toc-ts" x="473" y="879" textAnchor="middle" dominantBaseline="central">demand reduction not offset by adaptation needs</text></g>

          {/* LEGEND */}
          <rect x="96" y="910" width="504" height="92" rx="8" fill="none" stroke="#d3d1c7" strokeWidth="0.5"/>
          <text className="toc-th" x="112" y="928" dominantBaseline="central">Legend</text>
          <rect x="112" y="938" width="12" height="12" rx="3" fill="#E1F5EE" stroke="#0F6E56" strokeWidth="0.5"/>
          <text className="toc-ts" x="130" y="948" dominantBaseline="central">Existing mitigation framework</text>
          <rect x="112" y="958" width="12" height="12" rx="3" fill="#FAECE7" stroke="#993C1D" strokeWidth="0.5"/>
          <text className="toc-ts" x="130" y="968" dominantBaseline="central">New adaptation additions</text>
          <rect x="112" y="978" width="12" height="12" rx="3" fill="#FCEBEB" stroke="#A32D2D" strokeWidth="0.5"/>
          <text className="toc-ts" x="130" y="988" dominantBaseline="central">Adaptation risk / pressure</text>
          <rect x="320" y="938" width="12" height="12" rx="3" fill="#EEEDFE" stroke="#534AB7" strokeWidth="0.5"/>
          <text className="toc-ts" x="338" y="948" dominantBaseline="central">Indicators / outputs</text>
          <rect x="320" y="958" width="12" height="12" rx="3" fill="#FAEEDA" stroke="#854F0B" strokeWidth="0.5"/>
          <text className="toc-ts" x="338" y="968" dominantBaseline="central">Enabling conditions</text>
          <rect x="320" y="978" width="12" height="12" rx="3" fill="#F1EFE8" stroke="#5F5E5A" strokeWidth="0.5"/>
          <text className="toc-ts" x="338" y="988" dominantBaseline="central">Mitigation levers</text>
          <text className="toc-ts" x="530" y="948" dominantBaseline="central">↔ = synergy</text>
          <text className="toc-ts" x="530" y="968" dominantBaseline="central">⚠ = risk</text>
          <text className="toc-ts" x="530" y="988" dominantBaseline="central">- - = adaptation link</text>
        </svg>
      </div>

      {/* Diagram 2 */}
      <div className="rounded-xl border border-grey-200 bg-white p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold text-tertiary-dark mb-1">Detail: climate hazard pathways into mitigation levers</h3>
        <p className="text-xs text-tertiary mb-4">
          Zooms into the Activities row of the ToC above. Read bottom-up: climate hazards → physical
          impacts → disruption of specific mitigation levers.
        </p>
        <svg viewBox="0 0 680 530" xmlns="http://www.w3.org/2000/svg" className="toc-svg" style={{ display: 'block', width: '100%', minWidth: 640 }} role="img" aria-label="Climate hazard pathways into energy supply mitigation levers">
          <defs>
            <marker id="hazard-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </marker>
          </defs>

          {/* LEVERS */}
          <g className="toc-c-gray"><rect x="96" y="20" width="98" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="145" y="40" textAnchor="middle" dominantBaseline="central">Fossil fuel</text><text className="toc-th" x="145" y="58" textAnchor="middle" dominantBaseline="central">phase-out</text></g>
          <g className="toc-c-gray"><rect x="206" y="20" width="98" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="255" y="40" textAnchor="middle" dominantBaseline="central">Methane</text><text className="toc-th" x="255" y="58" textAnchor="middle" dominantBaseline="central">reduction</text></g>
          <g className="toc-c-gray"><rect x="316" y="20" width="98" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="365" y="40" textAnchor="middle" dominantBaseline="central">Fast RES</text><text className="toc-th" x="365" y="58" textAnchor="middle" dominantBaseline="central">roll-out</text></g>
          <g className="toc-c-gray"><rect x="426" y="20" width="98" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="475" y="40" textAnchor="middle" dominantBaseline="central">Targeted</text><text className="toc-th" x="475" y="58" textAnchor="middle" dominantBaseline="central">CCU/CCS</text></g>
          <g className="toc-c-gray"><rect x="536" y="20" width="98" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="585" y="40" textAnchor="middle" dominantBaseline="central">System</text><text className="toc-th" x="585" y="58" textAnchor="middle" dominantBaseline="central">integration</text></g>

          {/* Layer label: impacts */}
          <text className="toc-ts" x="52" y="208" textAnchor="middle" dominantBaseline="central" fontWeight="600">Impacts</text>

          {/* IMPACTS */}
          <g className="toc-c-red"><rect x="96" y="178" width="82" height="54" rx="6" strokeWidth="0.5"/><text className="toc-th" x="137" y="196" textAnchor="middle" dominantBaseline="central">↑ cooling</text><text className="toc-ts" x="137" y="212" textAnchor="middle" dominantBaseline="central">demand</text><text className="toc-ts" x="137" y="226" textAnchor="middle" dominantBaseline="central">↑ O2 pressure</text></g>
          <g className="toc-c-red"><rect x="186" y="178" width="82" height="54" rx="6" strokeWidth="0.5"/><text className="toc-th" x="227" y="196" textAnchor="middle" dominantBaseline="central">↓ grid</text><text className="toc-ts" x="227" y="212" textAnchor="middle" dominantBaseline="central">capacity</text><text className="toc-ts" x="227" y="226" textAnchor="middle" dominantBaseline="central">lines/transformers</text></g>
          <g className="toc-c-red"><rect x="276" y="178" width="82" height="54" rx="6" strokeWidth="0.5"/><text className="toc-th" x="317" y="196" textAnchor="middle" dominantBaseline="central">↓ hydro</text><text className="toc-ts" x="317" y="212" textAnchor="middle" dominantBaseline="central">production</text><text className="toc-ts" x="317" y="226" textAnchor="middle" dominantBaseline="central">drought risk</text></g>
          <g className="toc-c-red"><rect x="366" y="178" width="82" height="54" rx="6" strokeWidth="0.5"/><text className="toc-th" x="407" y="196" textAnchor="middle" dominantBaseline="central">↓ thermal</text><text className="toc-ts" x="407" y="212" textAnchor="middle" dominantBaseline="central">production</text><text className="toc-ts" x="407" y="226" textAnchor="middle" dominantBaseline="central">heat stress</text></g>
          <g className="toc-c-red"><rect x="456" y="178" width="82" height="54" rx="6" strokeWidth="0.5"/><text className="toc-th" x="497" y="196" textAnchor="middle" dominantBaseline="central">↑ desalin-</text><text className="toc-th" x="497" y="212" textAnchor="middle" dominantBaseline="central">ation need</text><text className="toc-ts" x="497" y="226" textAnchor="middle" dominantBaseline="central">energy demand</text></g>
          <g className="toc-c-red"><rect x="546" y="178" width="82" height="54" rx="6" strokeWidth="0.5"/><text className="toc-th" x="587" y="192" textAnchor="middle" dominantBaseline="central">Damage:</text><text className="toc-ts" x="587" y="208" textAnchor="middle" dominantBaseline="central">transport +</text><text className="toc-ts" x="587" y="222" textAnchor="middle" dominantBaseline="central">storage infra</text></g>

          {/* Layer label: hazards */}
          <text className="toc-ts" x="52" y="378" textAnchor="middle" dominantBaseline="central" fontWeight="600">Hazards</text>

          {/* HAZARDS */}
          <g className="toc-c-blue"><rect x="96" y="360" width="108" height="36" rx="6" strokeWidth="0.5"/><text className="toc-th" x="150" y="378" textAnchor="middle" dominantBaseline="central">Warming / heatwaves</text></g>
          <g className="toc-c-blue"><rect x="214" y="360" width="108" height="36" rx="6" strokeWidth="0.5"/><text className="toc-th" x="268" y="378" textAnchor="middle" dominantBaseline="central">Drought / ↓ precip.</text></g>
          <g className="toc-c-blue"><rect x="332" y="360" width="88" height="36" rx="6" strokeWidth="0.5"/><text className="toc-th" x="376" y="378" textAnchor="middle" dominantBaseline="central">Wildfires</text></g>
          <g className="toc-c-blue"><rect x="430" y="360" width="108" height="36" rx="6" strokeWidth="0.5"/><text className="toc-th" x="484" y="378" textAnchor="middle" dominantBaseline="central">Floods / landslides</text></g>
          <g className="toc-c-blue"><rect x="548" y="360" width="86" height="36" rx="6" strokeWidth="0.5"/><text className="toc-th" x="591" y="378" textAnchor="middle" dominantBaseline="central">Extreme weather</text></g>

          {/* Hazard → impact arrows */}
          <path d="M150 360 L137 234" fill="none" stroke="#E24B4A" strokeWidth="0.5" markerEnd="url(#hazard-arrow)"/>
          <path d="M150 360 L210 234" fill="none" stroke="#E24B4A" strokeWidth="0.5" markerEnd="url(#hazard-arrow)"/>
          <path d="M150 360 L390 234" fill="none" stroke="#E24B4A" strokeWidth="0.5" markerEnd="url(#hazard-arrow)"/>
          <path d="M268 360 L300 234" fill="none" stroke="#E24B4A" strokeWidth="0.5" markerEnd="url(#hazard-arrow)"/>
          <path d="M268 360 L480 234" fill="none" stroke="#E24B4A" strokeWidth="0.5" markerEnd="url(#hazard-arrow)"/>
          <path d="M376 360 L220 234" fill="none" stroke="#E24B4A" strokeWidth="0.5" markerEnd="url(#hazard-arrow)"/>
          <path d="M376 360 L570 234" fill="none" stroke="#E24B4A" strokeWidth="0.5" markerEnd="url(#hazard-arrow)"/>
          <path d="M484 360 L570 234" fill="none" stroke="#E24B4A" strokeWidth="0.5" markerEnd="url(#hazard-arrow)"/>
          <path d="M591 360 L587 234" fill="none" stroke="#E24B4A" strokeWidth="0.5" markerEnd="url(#hazard-arrow)"/>

          {/* Impact → lever arrows (dashed) */}
          <path d="M137 178 L145 74" fill="none" stroke="#E24B4A" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#hazard-arrow)"/>
          <path d="M227 178 L585 74" fill="none" stroke="#E24B4A" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#hazard-arrow)"/>
          <path d="M317 178 L365 74" fill="none" stroke="#E24B4A" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#hazard-arrow)"/>
          <path d="M407 178 L165 74" fill="none" stroke="#E24B4A" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#hazard-arrow)"/>
          <path d="M497 178 L475 74" fill="none" stroke="#E24B4A" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#hazard-arrow)"/>
          <path d="M587 178 L585 74" fill="none" stroke="#E24B4A" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#hazard-arrow)"/>

          {/* Legend */}
          <rect x="96" y="422" width="504" height="96" rx="8" fill="none" stroke="#d3d1c7" strokeWidth="0.5"/>
          <text className="toc-th" x="112" y="440" dominantBaseline="central">How to read this diagram</text>
          <text className="toc-ts" x="112" y="458" dominantBaseline="central">Solid red lines: hazard causes this impact</text>
          <text className="toc-ts" x="112" y="476" dominantBaseline="central">Dashed red lines: impact undermines this lever</text>
          <text className="toc-ts" x="112" y="494" dominantBaseline="central">This zooms into the activities row of the full ToC above</text>
          <rect x="400" y="446" width="12" height="12" rx="3" fill="#E6F1FB" stroke="#185FA5" strokeWidth="0.5"/>
          <text className="toc-ts" x="418" y="452" dominantBaseline="central">Climate hazards</text>
          <rect x="400" y="466" width="12" height="12" rx="3" fill="#FCEBEB" stroke="#A32D2D" strokeWidth="0.5"/>
          <text className="toc-ts" x="418" y="472" dominantBaseline="central">Climate impacts</text>
          <rect x="400" y="486" width="12" height="12" rx="3" fill="#F1EFE8" stroke="#5F5E5A" strokeWidth="0.5"/>
          <text className="toc-ts" x="418" y="492" dominantBaseline="central">Mitigation levers</text>
        </svg>
      </div>

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
        Source: Advisory Board (2024) assessment framework for the energy supply sector, adapted to
        integrate climate adaptation considerations from the European Climate Risk Assessment (EUCRA,
        EEA 2024). Indicator series: ESABCC report underlying data (E1–E6, O2) with post-report
        refreshes, plus EEA / Eurostat / JRC adaptation series as candidate proxies for the proposed
        E7 resilience indicator.
      </p>
    </div>
  );
}

const tocStyles = `
  .toc-svg { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  .toc-th  { font-size: 14px; font-weight: 600; fill: #1a1a18; }
  .toc-ts  { font-size: 12px; font-weight: 400; fill: #5F5E5A; }

  .toc-c-teal   rect { fill: #E1F5EE; stroke: #0F6E56; }
  .toc-c-teal   .toc-th { fill: #085041; }
  .toc-c-teal   .toc-ts { fill: #0F6E56; }

  .toc-c-coral  rect { fill: #FAECE7; stroke: #993C1D; }
  .toc-c-coral  .toc-th { fill: #712B13; }
  .toc-c-coral  .toc-ts { fill: #993C1D; }

  .toc-c-red    rect { fill: #FCEBEB; stroke: #A32D2D; }
  .toc-c-red    .toc-th { fill: #791F1F; }
  .toc-c-red    .toc-ts { fill: #A32D2D; }

  .toc-c-purple rect { fill: #EEEDFE; stroke: #534AB7; }
  .toc-c-purple .toc-th { fill: #3C3489; }
  .toc-c-purple .toc-ts { fill: #534AB7; }

  .toc-c-amber  rect { fill: #FAEEDA; stroke: #854F0B; }
  .toc-c-amber  .toc-th { fill: #633806; }
  .toc-c-amber  .toc-ts { fill: #854F0B; }

  .toc-c-gray   rect { fill: #F1EFE8; stroke: #5F5E5A; }
  .toc-c-gray   .toc-th { fill: #444441; }
  .toc-c-gray   .toc-ts { fill: #5F5E5A; }

  .toc-c-blue   rect { fill: #E6F1FB; stroke: #185FA5; }
  .toc-c-blue   .toc-th { fill: #0C447C; }
  .toc-c-blue   .toc-ts { fill: #185FA5; }

  @media (prefers-color-scheme: dark) {
    .toc-th  { fill: #e8e6de; }
    .toc-ts  { fill: #9c9a92; }

    .toc-c-teal   rect { fill: #085041; stroke: #5DCAA5; }
    .toc-c-teal   .toc-th { fill: #9FE1CB; }
    .toc-c-teal   .toc-ts { fill: #1D9E75; }

    .toc-c-coral  rect { fill: #712B13; stroke: #D85A30; }
    .toc-c-coral  .toc-th { fill: #F5C4B3; }
    .toc-c-coral  .toc-ts { fill: #F0997B; }

    .toc-c-red    rect { fill: #791F1F; stroke: #E24B4A; }
    .toc-c-red    .toc-th { fill: #F7C1C1; }
    .toc-c-red    .toc-ts { fill: #F09595; }

    .toc-c-purple rect { fill: #3C3489; stroke: #7F77DD; }
    .toc-c-purple .toc-th { fill: #CECBF6; }
    .toc-c-purple .toc-ts { fill: #AFA9EC; }

    .toc-c-amber  rect { fill: #633806; stroke: #BA7517; }
    .toc-c-amber  .toc-th { fill: #FAC775; }
    .toc-c-amber  .toc-ts { fill: #EF9F27; }

    .toc-c-gray   rect { fill: #2C2C2A; stroke: #5F5E5A; }
    .toc-c-gray   .toc-th { fill: #D3D1C7; }
    .toc-c-gray   .toc-ts { fill: #B4B2A9; }

    .toc-c-blue   rect { fill: #0C447C; stroke: #378ADD; }
    .toc-c-blue   .toc-th { fill: #B5D4F4; }
    .toc-c-blue   .toc-ts { fill: #85B7EB; }
  }
`;
