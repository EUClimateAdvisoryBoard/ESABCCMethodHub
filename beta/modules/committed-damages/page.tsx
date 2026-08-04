'use client';

/**
 * Committed Damages — Damage-Function Lab (beta module M · 43).
 *
 * Interactive rebuild of the damage-projection pipeline of the RETRACTED
 * article Kotz, Levermann & Wenz, "The economic commitment of climate
 * change", Nature 628, 551–557 (2024), doi:10.1038/s41586-024-07219-0 —
 * retracted by the authors on 3 December 2025
 * (doi:10.1038/s41586-025-09726-0), focused on what the method implies for
 * the EU economy.
 *
 * Surfaces:
 *   1. THE METHOD — the paper's pipeline in four steps: five climate
 *      variables (eqs. 1–3), the first-difference distributed-lag panel
 *      regression (eq. 10), CMIP-6 ⊗ coefficients → growth shocks, and the
 *      compounding into income paths (eq. 13).
 *   2. DAMAGE FUNCTIONS — the five channels as moderator-linear cumulative
 *      marginal effects, each a slider, with the EU-27 positioned on every
 *      curve.
 *   3. EU PROJECTION — the Fig.-1 rebuild for the EU-27: committed damages
 *      to 2049, scenario divergence afterwards, the likely band, € cost.
 *   4. WHERE IT LANDS — per-member-state committed damages (the paper's
 *      Fig. 2 north–south gradient, EU edition).
 *   5. DAMAGES VS MITIGATION COSTS and the growth/levels/lags spec
 *      comparison (Extended Data Fig. 3 rebuild).
 *   6. WHY IT WAS RETRACTED — and what a method hub should take from that.
 *
 * All effective sensitivities are calibrated to the paper's PUBLISHED
 * anchors (world −19 %, Europe ≈ −11 % by 2049, …), not taken from its
 * regression tables; the point of the module is to make the machinery —
 * and its fragility — manipulable. Stylised teaching tool, not a citable
 * damage estimate. See model.ts for the full framing.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  ALL_CHANNELS,
  Channels,
  ChannelKey,
  DEFAULTS,
  EU27,
  EU_GDP_2024,
  EU_POP_2024,
  Params,
  Region,
  Scenario,
  Spec,
  T_ONLY,
  WORLD,
  YEARS,
  divergenceYear,
  euSeries,
  euroLoss,
  extremeME,
  meanTempME,
  precipME,
  project,
  variabilityME,
  warming,
  wetDaysME,
} from './model';

/* ------------------------------------------------------------- palette */
// Scenario pair (paper Fig. 1: purple = RCP2.6, orange = RCP8.5); CVD-validated on white.
const SCEN_C: Record<Scenario, string> = { rcp26: '#6667AB', rcp85: '#E0701A' };
// Five damage channels (validated 5-set): T̄ red, T̃ orange, P blue, Pwd green, Pext purple.
const CH_C: Record<ChannelKey, string> = { T: '#B83230', V: '#E0701A', P: '#0065A4', W: '#1F8F63', X: '#A530B8' };
const WORLD_C = '#808285';

const fmt = (n: number, d = 0) =>
  n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v: number, d = 1) => `${v > 0 ? '+' : ''}${fmt(v * 100, d)}%`;

/* ------------------------------------------------------------ UI bits */

function Slider(props: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  std?: number;
  onChange: (v: number) => void;
}) {
  const { label, hint, value, min, max, step, unit, std, onChange } = props;
  const modified = std !== undefined && Math.abs(value - std) > step / 2;
  const stdPct = std !== undefined ? ((std - min) / (max - min)) * 100 : null;
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-tertiary-dark">{label}</span>
        <span className={`font-mono text-[12px] tabular-nums ${modified ? 'text-accent-orange' : 'text-primary'}`}>
          {fmt(value, step < 0.1 ? 2 : step < 1 ? 1 : 0)}
          {unit ? <span className="text-tertiary"> {unit}</span> : null}
        </span>
      </div>
      <div className="relative mt-1.5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
        {stdPct !== null && (
          <span
            aria-hidden
            title={`Calibrated default: ${fmt(std!, 2)}`}
            className="pointer-events-none absolute -bottom-0.5 h-2 w-px bg-tertiary/50"
            style={{ left: `calc(${stdPct}%)` }}
          />
        )}
      </div>
      <div className="mt-0.5 flex items-start justify-between gap-2">
        {hint ? <p className="text-[10.5px] leading-snug text-tertiary">{hint}</p> : <span />}
        {std !== undefined && modified && (
          <button
            type="button"
            onClick={() => onChange(std)}
            className="shrink-0 whitespace-nowrap text-[10px] font-semibold text-accent-orange hover:underline"
          >
            ↺ default {fmt(std, 2)}
          </button>
        )}
      </div>
    </label>
  );
}

function Legend({ items }: { items: { label: string; color: string; dash?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-[11px] text-tertiary">
          <svg width="22" height="8" className="shrink-0" aria-hidden>
            <line x1="0" y1="4" x2="22" y2="4" stroke={it.color} strokeWidth="3" strokeDasharray={it.dash ? '4 3' : undefined} />
          </svg>
          {it.label}
        </span>
      ))}
    </div>
  );
}

function StatTile(props: { label: string; value: string; sub?: string; anchor?: string }) {
  return (
    <div className="rounded-lg border border-grey-200 bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">{props.label}</p>
      <p className="mt-1 font-mono text-xl font-bold tabular-nums text-tertiary-dark">{props.value}</p>
      {props.sub && <p className="mt-0.5 text-[10.5px] leading-snug text-tertiary">{props.sub}</p>}
      {props.anchor && (
        <p className="mt-1 inline-block rounded bg-surface-blue px-1.5 py-0.5 text-[10px] text-primary">
          paper anchor: {props.anchor}
        </p>
      )}
    </div>
  );
}

/* ------------------------------- projection chart (Fig. 1 rebuild, EU) */

type ProjSeries = { label: string; color: string; dash?: boolean; values: number[] };

function ProjectionChart(props: {
  series: ProjSeries[];
  band?: { lo: number[]; hi: number[]; color: string };
  yMin: number;
  divergence?: number | null;
  height?: number;
}) {
  const { series, band, yMin, divergence, height = 300 } = props;
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = height;
  const m = { l: 46, r: 12, t: 14, b: 24 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const yMax = 5;
  const sx = (i: number) => m.l + (i / (YEARS.length - 1)) * iw;
  const sy = (v: number) => m.t + ((yMax - Math.max(v * 100, yMin)) / (yMax - yMin)) * ih;

  const gridVals: number[] = [];
  for (let v = yMax; v >= yMin; v -= (yMax - yMin) / 5) gridVals.push(v);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Projected EU income change relative to a baseline without climate impacts"
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * W;
        const i = Math.round(((px - m.l) / iw) * (YEARS.length - 1));
        setHover(i >= 0 && i < YEARS.length ? i : null);
      }}
    >
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={m.l} x2={W - m.r} y1={sy(v / 100)} y2={sy(v / 100)} stroke={v === 0 ? '#BCBEC0' : '#E6E7E8'} strokeWidth={1} />
          <text x={m.l - 6} y={sy(v / 100) + 3} textAnchor="end" className="fill-grey-500" fontSize={10}>
            {fmt(v)}%
          </text>
        </g>
      ))}
      {YEARS.map((yr, i) =>
        yr % 20 === 0 ? (
          <text key={yr} x={sx(i)} y={H - 8} textAnchor="middle" className="fill-grey-500" fontSize={10}>
            {yr}
          </text>
        ) : null,
      )}
      {band && (
        <path
          d={
            band.lo.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ') +
            band.hi
              .map((v, i) => {
                const j = band.hi.length - 1 - i;
                return ` L ${sx(j).toFixed(1)} ${sy(band.hi[j]).toFixed(1)}`;
              })
              .join('') +
            ' Z'
          }
          fill={band.color}
          opacity={0.14}
        />
      )}
      {divergence != null && (
        <g>
          <line
            x1={sx(divergence - YEARS[0])}
            x2={sx(divergence - YEARS[0])}
            y1={m.t}
            y2={m.t + ih}
            stroke="#54728C"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text x={sx(divergence - YEARS[0]) + 4} y={m.t + 10} className="fill-tertiary" fontSize={9.5}>
            scenarios diverge ≈ {divergence}
          </text>
        </g>
      )}
      {series.map((s) => (
        <path
          key={s.label}
          d={s.values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ')}
          fill="none"
          stroke={s.color}
          strokeWidth={2}
          strokeDasharray={s.dash ? '5 4' : undefined}
        />
      ))}
      {hover !== null && (
        <g>
          <line x1={sx(hover)} x2={sx(hover)} y1={m.t} y2={m.t + ih} stroke="#3D5265" strokeWidth={1} opacity={0.35} />
          {(() => {
            const boxW = 150;
            const bx = Math.min(sx(hover) + 8, W - m.r - boxW);
            const by = m.t + 4;
            return (
              <g>
                <rect x={bx} y={by} width={boxW} height={16 + series.length * 13} rx={4} fill="#FFFFFF" stroke="#DCDDDE" />
                <text x={bx + 8} y={by + 12} fontSize={10} fontWeight={700} className="fill-tertiary-dark">
                  {YEARS[hover]}
                </text>
                {series.map((s, k) => (
                  <g key={s.label}>
                    <circle cx={bx + 11} cy={by + 21 + k * 13} r={3} fill={s.color} />
                    <text x={bx + 18} y={by + 24 + k * 13} fontSize={9.5} className="fill-tertiary">
                      {s.label}: {pct(s.values[hover])}
                    </text>
                  </g>
                ))}
              </g>
            );
          })()}
        </g>
      )}
    </svg>
  );
}

/* -------------------------------------- marginal-effect curve per channel */

function MECurve(props: {
  color: string;
  xLabel: string;
  yLabel: string;
  xMin: number;
  xMax: number;
  fn: (x: number) => number;
  dots: { x: number; label: string }[];
  worldX?: number;
  height?: number;
}) {
  const { color, xLabel, yLabel, xMin, xMax, fn, dots, worldX, height = 170 } = props;
  const [hover, setHover] = useState<{ x: number; label: string } | null>(null);
  const W = 340;
  const H = height;
  const m = { l: 40, r: 10, t: 12, b: 26 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const N = 60;
  const ys: number[] = [];
  for (let i = 0; i <= N; i++) ys.push(fn(xMin + ((xMax - xMin) * i) / N));
  const yLo = Math.min(...ys, 0);
  const yHi = Math.max(...ys, 0);
  const pad = (yHi - yLo) * 0.12 + 0.01;
  const sx = (x: number) => m.l + ((x - xMin) / (xMax - xMin)) * iw;
  const sy = (y: number) => m.t + ((yHi + pad - y) / (yHi - yLo + 2 * pad)) * ih;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${yLabel} versus ${xLabel}`} onMouseLeave={() => setHover(null)}>
      <line x1={m.l} x2={W - m.r} y1={sy(0)} y2={sy(0)} stroke="#BCBEC0" strokeWidth={1} />
      <text x={m.l - 4} y={sy(0) + 3} textAnchor="end" className="fill-grey-500" fontSize={9}>
        0
      </text>
      <text x={m.l - 4} y={m.t + 6} textAnchor="end" className="fill-grey-500" fontSize={9}>
        {fmt(yHi, 1)}
      </text>
      <text x={m.l - 4} y={m.t + ih} textAnchor="end" className="fill-grey-500" fontSize={9}>
        {fmt(yLo, 1)}
      </text>
      <text x={m.l} y={m.t - 2} className="fill-tertiary" fontSize={9}>
        {yLabel}
      </text>
      <text x={W - m.r} y={H - 6} textAnchor="end" className="fill-tertiary" fontSize={9}>
        {xLabel}
      </text>
      {[xMin, (xMin + xMax) / 2, xMax].map((x) => (
        <text key={x} x={sx(x)} y={H - 15} textAnchor="middle" className="fill-grey-500" fontSize={9}>
          {fmt(x)}
        </text>
      ))}
      <path
        d={ys.map((y, i) => `${i === 0 ? 'M' : 'L'} ${sx(xMin + ((xMax - xMin) * i) / N).toFixed(1)} ${sy(y).toFixed(1)}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
      />
      {dots.map((d) => (
        <circle
          key={d.label}
          cx={sx(d.x)}
          cy={sy(fn(d.x))}
          r={hover?.label === d.label ? 5 : 3.5}
          fill="#FFFFFF"
          stroke={color}
          strokeWidth={1.6}
          onMouseEnter={() => setHover(d)}
        >
          <title>{`${d.label}: ${fmt(fn(d.x), 2)} at ${fmt(d.x)}`}</title>
        </circle>
      ))}
      {worldX !== undefined && (
        <g>
          <circle cx={sx(worldX)} cy={sy(fn(worldX))} r={4} fill={WORLD_C} />
          <text x={sx(worldX) + 6} y={sy(fn(worldX)) - 5} fontSize={9} className="fill-grey-500">
            world
          </text>
        </g>
      )}
      {hover && (
        <text x={m.l + 4} y={m.t + 10} fontSize={9.5} fontWeight={700} className="fill-tertiary-dark">
          {hover.label}: {fmt(fn(hover.x), 2)} %/unit
        </text>
      )}
    </svg>
  );
}

/* -------------------------------------------------- country bars (2049) */

function CountryBars({ rows }: { rows: { name: string; frac: number; eur: number }[] }) {
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.frac)), 0.001);
  return (
    <div className="space-y-1">
      {rows.map((r) => {
        const damage = r.frac < 0;
        return (
          <div key={r.name} className="group flex items-center gap-2" title={`${r.name}: ${pct(r.frac)} · ${fmt(r.eur)} €bn/yr`}>
            <span className="w-24 shrink-0 truncate text-[11px] text-tertiary">{r.name}</span>
            <div className="relative h-4 flex-1">
              <div
                className="absolute inset-y-0 left-0 rounded-r"
                style={{
                  width: `${(Math.abs(r.frac) / maxAbs) * 100}%`,
                  background: damage ? '#B83230' : '#1F8F63',
                  opacity: 0.85,
                }}
              />
            </div>
            <span className="w-14 shrink-0 text-right font-mono text-[11px] tabular-nums text-tertiary-dark">{pct(r.frac)}</span>
            <span className="w-20 shrink-0 text-right font-mono text-[10.5px] tabular-nums text-tertiary">
              {r.eur <= -1 ? `−${fmt(-r.eur)}` : r.eur >= 1 ? `+${fmt(r.eur)}` : '≈0'} bn
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------- static copy */

const CHANNEL_META: {
  key: ChannelKey;
  symbol: string;
  name: string;
  moderator: string;
  unit: string;
  mechanism: string;
}[] = [
  {
    key: 'T',
    symbol: 'ΔT̄',
    name: 'Annual mean temperature',
    moderator: 'baseline mean temperature T̄',
    unit: '% per +1 °C shock',
    mechanism:
      'Labour and agricultural productivity fall as mean temperature rises; the response steepens with the prevailing baseline temperature — the paper’s dominant channel.',
  },
  {
    key: 'V',
    symbol: 'ΔT̃',
    name: 'Day-to-day temperature variability',
    moderator: 'seasonal temperature amplitude T̂',
    unit: '% per +1 °C shock',
    mechanism:
      'Unpredictable daily swings damage agriculture and health; economies used to a large seasonal cycle cope better — so low-seasonality (maritime, low-latitude) regions are hit hardest. The largest add-on channel (+4.9 pp globally).',
  },
  {
    key: 'P',
    symbol: 'ΔP',
    name: 'Total annual precipitation',
    moderator: 'baseline annual precipitation P',
    unit: '% per +10 % shock',
    mechanism:
      'More water generally benefits production, most where water is scarce — so Mediterranean DRYING turns this channel into a damage for southern Europe.',
  },
  {
    key: 'W',
    symbol: 'ΔPwd',
    name: 'Number of wet days',
    moderator: '(folded into the constant)',
    unit: '% per +10 % shock',
    mechanism:
      'More rainy days disrupt labour and logistics — a damage where wet days increase (northern Europe), a benefit where they decrease (the south). Opposes the total-precipitation benefit, as in the paper’s Fig. 2d–e.',
  },
  {
    key: 'X',
    symbol: 'ΔPext',
    name: 'Extreme daily rainfall',
    moderator: 'baseline mean temperature T̄',
    unit: '% per +10 % shock',
    mechanism:
      'Rainfall extremes intensify ≈ 7 %/°C of regional warming (Clausius–Clapeyron) and cause flood damages everywhere — the only channel negative in every region.',
  },
];

const RETRACTION_POINTS = [
  {
    title: 'A data error in one country moved the result',
    body:
      'Post-publication review found inaccuracies in the DOSE sub-national income data for Uzbekistan (1995–1999). The published mid-century estimates proved sensitive to removing that single country — for a global average over 1,660 regions, that is a fragility the review process had not surfaced.',
  },
  {
    title: 'Error structure widened the uncertainty',
    body:
      'Critics argued spatial auto-correlation had to be reflected in the uncertainty ranges. Correcting the data and accounting for it widened the likely range from 11–29 % to 6–31 %, and cut the probability that damages diverge across emission scenarios by 2050 from 99 % to 90 %.',
  },
  {
    title: 'The authors retracted it themselves',
    body:
      'Kotz, Levermann and Wenz judged the changes “too substantial for a correction” and retracted the article on 3 December 2025. The retraction is about the certified magnitudes and their precision — the qualitative claims (damages are large, unequally distributed, and driven by more than mean temperature) remain contested rather than refuted.',
  },
  {
    title: 'What a method hub should take from it',
    body:
      'This is precisely why MethodHub rebuilds methods rather than quoting headline numbers: the pipeline (panel econometrics → CMIP-6 → compounding) is sound science worth understanding, while any single parameterisation is fragile. Here every coefficient is a slider — the honest representation of the post-retraction state of knowledge.',
  },
];

const SOURCES: { label: string; url: string }[] = [
  { label: 'Kotz, Levermann & Wenz (2024) — The economic commitment of climate change, Nature 628 (RETRACTED)', url: 'https://doi.org/10.1038/s41586-024-07219-0' },
  { label: 'Retraction Note (3 Dec 2025), Nature', url: 'https://doi.org/10.1038/s41586-025-09726-0' },
  { label: 'Retraction Watch — Authors retract Nature paper projecting high costs of climate change', url: 'https://retractionwatch.com/2025/12/03/authors-retract-nature-paper-projecting-high-costs-of-climate-change/' },
  { label: 'Replication data & code (Zenodo)', url: 'https://doi.org/10.5281/zenodo.10562951' },
  { label: 'DOSE — global dataset of reported sub-national economic output (Sci. Data 2023)', url: 'https://doi.org/10.1038/s41597-023-02323-8' },
  { label: 'Kotz, Wenz et al. (2021) — Day-to-day temperature variability reduces economic growth, Nat. Clim. Change', url: 'https://doi.org/10.1038/s41558-020-00985-5' },
  { label: 'Kotz, Levermann & Wenz (2022) — The effect of rainfall changes on economic production, Nature 601', url: 'https://doi.org/10.1038/s41586-021-04283-8' },
  { label: 'Kalkuhl & Wenz (2020) — The impact of climate conditions on economic production, JEEM', url: 'https://doi.org/10.1016/j.jeem.2020.102360' },
  { label: 'Burke, Hsiang & Miguel (2015) — Global non-linear effect of temperature on economic production, Nature 527', url: 'https://doi.org/10.1038/nature15725' },
  { label: 'ISIMIP — bias-adjusted CMIP-6 climate projections (W5E5 / ISIMIP3BASD)', url: 'https://www.isimip.org/' },
  { label: 'IPCC AR6 Scenarios Database (mitigation costs)', url: 'https://data.ene.iiasa.ac.at/ar6/' },
  { label: 'EUCRA (2024) — European Climate Risk Assessment (EEA), regional risk context', url: 'https://www.eea.europa.eu/publications/european-climate-risk-assessment' },
];

/* ------------------------------------------------------------------ page */

export default function CommittedDamagesPage() {
  const [params, setParams] = useState<Params>({ ...DEFAULTS });
  const [spec, setSpec] = useState<Spec>('lags');
  const [channels, setChannels] = useState<Channels>({ ...ALL_CHANNELS });
  const [mitCost2050, setMitCost2050] = useState(2.5); // % of GDP by 2050

  const set = (k: keyof Params) => (v: number) => setParams((p) => ({ ...p, [k]: v }));
  const toggleChannel = (k: ChannelKey) => setChannels((c) => ({ ...c, [k]: !c[k] }));
  const resetAll = () => {
    setParams({ ...DEFAULTS });
    setSpec('lags');
    setChannels({ ...ALL_CHANNELS });
    setMitCost2050(2.5);
  };

  /* projections */
  const eu26 = useMemo(() => euSeries(params, 'rcp26', { spec, channels }), [params, spec, channels]);
  const eu85 = useMemo(() => euSeries(params, 'rcp85', { spec, channels }), [params, spec, channels]);
  const eu26lo = useMemo(
    () => euSeries(params, 'rcp26', { spec, channels, scale: 1 - params.uncSpread }),
    [params, spec, channels],
  );
  const eu26hi = useMemo(
    () => euSeries(params, 'rcp26', { spec, channels, scale: 1 + params.uncSpread }),
    [params, spec, channels],
  );
  const euTonly = useMemo(() => euSeries(params, 'rcp26', { spec, channels: T_ONLY }), [params, spec]);
  const world26 = useMemo(() => project(WORLD, params, 'rcp26', { spec, channels }), [params, spec, channels]);
  const world85 = useMemo(() => project(WORLD, params, 'rcp85', { spec, channels }), [params, spec, channels]);

  const specCurves = useMemo(
    () =>
      (['levels', 'lags', 'growth'] as Spec[]).map((s) => ({
        spec: s,
        values: euSeries(params, 'rcp85', { spec: s, channels }),
      })),
    [params, channels],
  );

  const countryRows = useMemo(() => {
    const i2049 = 2049 - YEARS[0];
    return EU27.map((r: Region) => {
      const frac = project(r, params, 'rcp26', { spec, channels })[i2049];
      // € bn/yr against the country's own 2049 baseline (2024 GDP grown 1.4 %/yr):
      return { name: r.name, frac, eur: frac * r.gdp * Math.pow(1.014, 25) };
    }).sort((a, b) => a.frac - b.frac);
  }, [params, spec, channels]);

  const i2049 = 2049 - YEARS[0];
  const i2050 = 2050 - YEARS[0];
  const euCommitted = eu26[i2049];
  const euCommittedEur = euroLoss(euCommitted, 2049);
  const perCapita = (euCommittedEur * 1e9) / (EU_POP_2024 * 1e6);
  const diverge = divergenceYear(eu26, eu85, 0.02);

  /* mitigation comparison at 2050 */
  const mitFrac2050 = mitCost2050 / 100;
  const damageFrac2050 = -eu26[i2050];
  const ratio = mitFrac2050 > 0 ? damageFrac2050 / mitFrac2050 : Infinity;

  const warm26_2049 = warming('rcp26', 2049, params.climateSens);
  const warm85_2100 = warming('rcp85', 2100, params.climateSens);

  const channelCount = Object.values(channels).filter(Boolean).length;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* hero */}
        <section className="mb-5">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module M · 43 · damage-function lab · EU-27 focus · rebuilt from a retracted article
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">
            Committed Damages — the economic cost of climate change for the EU
          </h1>
          <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-tertiary">
            An interactive rebuild of the damage-projection method of Kotz, Levermann &amp; Wenz,{' '}
            <em>The economic commitment of climate change</em> (Nature, 2024) — the paper that put “the world economy
            is committed to an income reduction of 19 % within the next 26 years” on front pages, and that its authors
            retracted in December 2025. The machinery is worth understanding either way. Here it is, EU-sized, with
            every damage function on a slider.
          </p>
          <button
            type="button"
            onClick={resetAll}
            className="mt-3 rounded border border-grey-300 px-2.5 py-1 text-[11px] font-semibold text-tertiary hover:bg-grey-100"
          >
            ↺ reset everything to the calibrated defaults
          </button>
        </section>

        {/* retraction notice */}
        <section className="mb-8 rounded-lg border-2 border-accent-orange/60 bg-surface-orange p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">
            ⚠ Retracted article — read this first
          </p>
          <p className="mt-1.5 max-w-4xl text-[12.5px] leading-relaxed text-tertiary-dark">
            The source article was <strong>retracted by its authors on 3 December 2025</strong> (
            <a href="https://doi.org/10.1038/s41586-025-09726-0" target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
              Retraction Note ↗
            </a>
            ). Inaccuracies in the underlying income data for Uzbekistan (1995–1999) were found post-publication; the
            headline results were sensitive to the removal of that one country, and accounting for spatial
            auto-correlation widened the likely damage range from 11–29 % to 6–31 % and reduced the probability of
            scenario divergence by 2050 from 99 % to 90 % — changes the authors judged “too substantial for a
            correction”. <strong>Nothing on this page is a citable damage estimate.</strong> The module rebuilds the
            <em> method</em> so its structure, assumptions and fragility can be examined — the default sliders are
            calibrated to reproduce the retracted paper’s published anchors, and moving them shows how quickly the
            headline moves with them.
          </p>
        </section>

        {/* 1 — method */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">1 · The method, in four steps</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            The paper’s pipeline runs from 40 years of observed weather and sub-national income to a projected income
            path. Each step below is rebuilt in this module in reduced form.
          </p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">Step 1 · Five climate variables</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-tertiary">
                From daily gridded weather (W5E5/ERA5, 0.5°), five annual measures per region: mean temperature T̄,
                day-to-day variability T̃ (eq. 1: the average within-month standard deviation of daily temperature),
                total precipitation P, wet days Pwd (eq. 2: days &gt; 1 mm) and extreme rainfall Pext (eq. 3: rain
                above the local historical 99.9th percentile). Impacts had been identified separately for each in
                refs. 7–8 of the paper.
              </p>
            </div>
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">Step 2 · Panel regression with lags (eq. 10)</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-tertiary">
                Fixed-effects panel over 1,660 sub-national regions, 1979–2019: the income growth rate Δlgrp on the{' '}
                <em>first differences</em> of the five climate variables, each interacted with a moderator (baseline
                T̄, seasonal amplitude T̂, baseline P…) and entered with up to 8–10 (temperature) or 4 (precipitation)
                annual lags. First-differencing makes “no persistence” the null — so the measured persistence is a{' '}
                <em>lower bound</em>, sitting between pure level effects and pure growth effects.
              </p>
            </div>
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">Step 3 · Empirics ⊗ climate projections</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-tertiary">
                The estimated response functions are evaluated on 21 bias-adjusted CMIP-6 models under SSP2-RCP2.6 and
                SSP5-RCP8.5: year-on-year changes in each variable feed the coefficients; 30-year moving averages
                update the moderators (capped at the historical 95th percentile to avoid extrapolating the response).
                A Monte-Carlo over climate models, lag counts and 1,000 bootstrap coefficient sets gives the
                uncertainty. Here: stylised warming pathways, one moderator cap, and a spread slider standing in for
                the Monte-Carlo.
              </p>
            </div>
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">Step 4 · Compounding into income (eq. 13)</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-tertiary">
                The climate-induced growth impacts δ<sub>r,y</sub> are added to baseline SSP2 growth and compounded:
                GRPpc<sub>r,Y</sub> = GRPpc<sub>r,2020</sub>&nbsp;Π<sub>y</sub>(1 + π<sub>r,y</sub> + δ<sub>r,y</sub>).
                Damages are read as the gap to the no-climate-change baseline — “committed” meaning the gap is
                statistically the same across emission scenarios until mid-century, because near-term warming is
                already locked in by past emissions and socio-economic inertia.
              </p>
            </div>
          </div>
        </section>

        {/* 2 — damage functions */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">2 · The five damage functions — play with them</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            Each channel is a <strong>cumulative marginal effect</strong> (the sum over all lag coefficients — the
            total growth impact of a one-unit shock) that varies linearly with its moderator, as in the paper’s
            interaction terms. Dots mark the EU-27 at their baseline climatologies; the grey dot is the
            population-weighted world. Sliders scale the effective sensitivity; toggles switch a channel off entirely
            ({channelCount}/5 active — the paper’s T̄-only comparison is one click away).
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {CHANNEL_META.map((c) => {
              const p = params;
              const curve =
                c.key === 'T'
                  ? { xMin: 0, xMax: 25, fn: (x: number) => meanTempME(p, x), dots: EU27.map((r) => ({ x: r.tBar, label: r.name })), worldX: WORLD.tBar, xLabel: 'baseline T̄ (°C)' }
                  : c.key === 'V'
                    ? { xMin: 5, xMax: 30, fn: (x: number) => variabilityME(p, x), dots: EU27.map((r) => ({ x: r.tHat, label: r.name })), worldX: WORLD.tHat, xLabel: 'seasonal amplitude T̂ (°C)' }
                    : c.key === 'P'
                      ? { xMin: 300, xMax: 1300, fn: (x: number) => precipME(p, x), dots: EU27.map((r) => ({ x: r.precip, label: r.name })), worldX: WORLD.precip, xLabel: 'baseline precip (mm/yr)' }
                      : c.key === 'W'
                        ? { xMin: 300, xMax: 1300, fn: () => wetDaysME(p), dots: EU27.map((r) => ({ x: r.precip, label: r.name })), worldX: WORLD.precip, xLabel: 'baseline precip (mm/yr)' }
                        : { xMin: 0, xMax: 25, fn: (x: number) => extremeME(p, x), dots: EU27.map((r) => ({ x: r.tBar, label: r.name })), worldX: WORLD.tBar, xLabel: 'baseline T̄ (°C)' };
              const sliderCfg =
                c.key === 'T'
                  ? { value: p.cT, min: 0, max: 3, step: 0.02, std: DEFAULTS.cT, on: set('cT'), label: 'sensitivity slope' }
                  : c.key === 'V'
                    ? { value: p.cV, min: 0, max: 100, step: 1, std: DEFAULTS.cV, on: set('cV'), label: 'sensitivity scale' }
                    : c.key === 'P'
                      ? { value: p.cP, min: 0, max: 4, step: 0.05, std: DEFAULTS.cP, on: set('cP'), label: 'benefit scale' }
                      : c.key === 'W'
                        ? { value: p.cW, min: 0, max: 4, step: 0.05, std: DEFAULTS.cW, on: set('cW'), label: 'damage scale' }
                        : { value: p.cX, min: 0, max: 3, step: 0.05, std: DEFAULTS.cX, on: set('cX'), label: 'damage scale' };
              return (
                <div key={c.key} className={`rounded-lg border bg-white p-4 ${channels[c.key] ? 'border-grey-200' : 'border-grey-200 opacity-55'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-bold text-tertiary-dark">
                      <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: CH_C[c.key] }} />
                      {c.symbol} · {c.name}
                    </p>
                    <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[10.5px] text-tertiary">
                      <input type="checkbox" checked={channels[c.key]} onChange={() => toggleChannel(c.key)} className="accent-primary" />
                      on
                    </label>
                  </div>
                  <MECurve color={CH_C[c.key]} xLabel={curve.xLabel} yLabel={c.unit} xMin={curve.xMin} xMax={curve.xMax} fn={curve.fn} dots={curve.dots} worldX={curve.worldX} />
                  <div className="mt-2">
                    <Slider label={sliderCfg.label} value={sliderCfg.value} min={sliderCfg.min} max={sliderCfg.max} step={sliderCfg.step} std={sliderCfg.std} onChange={sliderCfg.on} />
                  </div>
                  <p className="mt-1.5 text-[10.5px] leading-snug text-tertiary">{c.mechanism}</p>
                </div>
              );
            })}
            <div className="rounded-lg border border-grey-200 bg-surface-blue p-4">
              <p className="text-[12px] font-bold text-tertiary-dark">Persistence — the decisive assumption</p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-tertiary">
                How long does a weather shock keep hitting the <em>growth rate</em>? This choice, not any coefficient,
                is the main driver of long-run damage magnitudes (the growth-vs-levels debate).
              </p>
              <div className="mt-2.5 space-y-1.5">
                {(
                  [
                    ['levels', 'Pure level effects — shock hits once, growth recovers'],
                    ['lags', 'Distributed lags (the paper) — a lower bound on persistence'],
                    ['growth', 'Pure growth effects — the anomaly depresses growth forever'],
                  ] as [Spec, string][]
                ).map(([s, label]) => (
                  <label key={s} className="flex cursor-pointer items-start gap-2 text-[11.5px] text-tertiary-dark">
                    <input type="radio" name="spec" checked={spec === s} onChange={() => setSpec(s)} className="mt-0.5 accent-primary" />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3">
                <Slider
                  label="lag window (years a shock persists)"
                  value={params.nLags}
                  min={1}
                  max={15}
                  step={1}
                  unit="yr"
                  std={DEFAULTS.nLags}
                  onChange={set('nLags')}
                  hint="Paper: significant effects up to 8–10 yr (temperature), 4 yr (precipitation)."
                />
              </div>
            </div>
          </div>
          <p className="mt-2 max-w-4xl text-[10.5px] text-tertiary">
            The curves are <em>effective</em> lag-sum sensitivities calibrated so the defaults reproduce the paper’s
            published headline anchors (world −19 %, Europe ≈ −11 % by 2049; T̄-only ≈ −13 % world; variability the
            largest add-on) — they are not the regression coefficients of its Supplementary Tables 2–4, which the
            retraction put in question. Implied magnitude at the defaults: ≈ −1.4 % of GDP per +1 °C-year shock for
            every 10 °C of baseline temperature — the scale critics attacked as implausibly large.
          </p>
        </section>

        {/* 3 — EU projection */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">3 · The EU projection — committed to 2049, divergent after</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            The paper’s Fig. 1, rebuilt for the EU-27 (GDP-weighted): income per capita relative to a world without
            further climate change, under a 2 °C-compatible pathway (RCP2.6) and a very-high-emission pathway
            (RCP8.5). Until mid-century the two are nearly the same — that is the “commitment”. After it, emissions
            choices dominate.
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_290px]">
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <ProjectionChart
                series={[
                  { label: 'EU · RCP2.6', color: SCEN_C.rcp26, values: eu26 },
                  { label: 'EU · RCP8.5', color: SCEN_C.rcp85, values: eu85 },
                  { label: 'World · RCP2.6', color: WORLD_C, dash: true, values: world26 },
                  { label: 'World · RCP8.5', color: WORLD_C, dash: true, values: world85 },
                ]}
                band={{ lo: eu26lo, hi: eu26hi, color: SCEN_C.rcp26 }}
                yMin={-70}
                divergence={diverge}
              />
              <div className="mt-1 flex items-center justify-between gap-2">
                <Legend
                  items={[
                    { label: 'EU-27, RCP2.6 (with likely band)', color: SCEN_C.rcp26 },
                    { label: 'EU-27, RCP8.5', color: SCEN_C.rcp85 },
                    { label: 'World reference', color: WORLD_C, dash: true },
                  ]}
                />
              </div>
              <p className="mt-2 text-[10.5px] text-tertiary">
                Global warming above 2020 at these settings: ≈ +{fmt(warm26_2049, 1)} °C by 2049 (RCP2.6) · ≈ +
                {fmt(warm85_2100, 1)} °C by 2100 (RCP8.5). Regional warming per country is amplified over land
                (× 1.1–1.7). The shaded band scales the damage sum by ± the spread slider — a stand-in for the paper’s
                Monte-Carlo “likely” range, not a computed one.
              </p>
            </div>
            <div className="space-y-3">
              <StatTile
                label="EU-27 committed income reduction, 2049"
                value={pct(euCommitted)}
                sub={`T̄-only model: ${pct(euTonly[i2049])} — the other four channels do the rest.`}
                anchor="≈ −11 % Europe · −19 % world"
              />
              <StatTile
                label="≈ € cost in 2049"
                value={`${fmt(-euCommittedEur / 1000, 1)} tn €/yr`}
                sub={`≈ €${fmt(-perCapita)} per person per year against a 2049 baseline grown at 1.4 %/yr from €${fmt(EU_GDP_2024 / 1000, 1)} tn (2024). Approximate by construction.`}
              />
              <StatTile
                label="World reference, 2049"
                value={pct(world26[i2049])}
                sub="Population-weighted single-region proxy."
                anchor="−19 % (likely 11–29 %)"
              />
              <div className="rounded-lg border border-grey-200 bg-white p-3 space-y-3">
                <Slider
                  label="climate sensitivity multiplier"
                  value={params.climateSens}
                  min={0.6}
                  max={1.6}
                  step={0.05}
                  unit="×"
                  std={DEFAULTS.climateSens}
                  onChange={set('climateSens')}
                  hint="Scales both warming pathways (CMIP-6 model spread)."
                />
                <Slider
                  label="uncertainty spread (likely band)"
                  value={params.uncSpread}
                  min={0}
                  max={1}
                  step={0.05}
                  unit="±×"
                  std={DEFAULTS.uncSpread}
                  onChange={set('uncSpread')}
                  hint="0.5 ≈ the paper's 11–29 % band around −19 %. The retraction-corrected range (6–31 %) needs ≈ 0.8."
                />
              </div>
            </div>
          </div>
        </section>

        {/* 4 — country distribution */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">4 · Where it lands — the EU’s own north–south gradient</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            The paper’s injustice result (largest damages at lower latitudes, in poorer regions) has an EU-internal
            echo: the Mediterranean members combine warm baselines, strong drying and rising variability; the Nordic
            and Baltic members sit where the damage functions flatten — or flip sign. Committed damages by 2049
            (RCP2.6, current settings), with the € column against each country’s own 2049 baseline GDP.
          </p>
          <div className="mt-3 rounded-lg border border-grey-200 bg-white p-4">
            <CountryBars rows={countryRows} />
            <p className="mt-2 text-[10.5px] text-tertiary">
              Bars: % income reduction vs no-climate-change baseline (red = loss, green = gain). € bn/yr at each
              country’s 2024 GDP grown 1.4 %/yr to 2049. Country climatologies, land-amplification and
              drying/wet-day scalings are order-of-magnitude values (ERA5-era climatology, IPCC/EUCRA regional
              syntheses), not the paper’s sub-national fields — the gradient, not the decimals, is the point.
            </p>
          </div>
        </section>

        {/* 5 — mitigation + spec comparison */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">5 · Two comparisons that carried the paper’s message</h2>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="text-[12px] font-bold text-tertiary-dark">Committed damages vs the cost of mitigation (2050)</p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-tertiary">
                The paper’s sixfold headline: global committed damages in 2050 (38 tn 2005 int-$) against ≈ 6 tn of
                mitigation costs to stay 2 °C-compatible (IPCC AR6 IAMs, SSP2-RCP2.6). Set an EU mitigation-cost
                assumption and compare against the module’s EU damage path:
              </p>
              <div className="mt-3">
                <Slider
                  label="EU mitigation cost in 2050"
                  value={mitCost2050}
                  min={0.5}
                  max={6}
                  step={0.1}
                  unit="% of GDP"
                  std={2.5}
                  onChange={setMitCost2050}
                  hint="AR6-range GDP cost of 2 °C-compatible pathways vs baseline, mid-century."
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <StatTile label="EU damages 2050" value={pct(-damageFrac2050)} sub="committed path, current settings" />
                <StatTile
                  label="damages ÷ mitigation cost"
                  value={ratio === Infinity ? '∞' : `${fmt(ratio, 1)} ×`}
                  anchor="≈ 6 × (global)"
                />
              </div>
              <p className="mt-2 text-[10.5px] text-tertiary">
                Magnitude comparison only — not a cost–benefit analysis: mitigation does not remove committed damages;
                it changes the path after mid-century.
              </p>
            </div>
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="text-[12px] font-bold text-tertiary-dark">
                The growth-vs-levels battleground (Extended Data Fig. 3, EU edition)
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-tertiary">
                Same damage functions, RCP8.5, three persistence assumptions. The paper’s distributed-lag spec was its
                methodological centrepiece: an empirical <em>lower bound</em> on persistence, between the two extremes.
              </p>
              <ProjectionChart
                series={[
                  { label: 'pure level effects', color: '#0065A4', values: specCurves[0].values },
                  { label: 'distributed lags (paper)', color: '#E0701A', values: specCurves[1].values },
                  { label: 'pure growth effects', color: '#A530B8', values: specCurves[2].values },
                ]}
                yMin={-95}
                height={240}
              />
              <Legend
                items={[
                  { label: 'pure level effects', color: '#0065A4' },
                  { label: 'distributed lags (paper spec)', color: '#E0701A' },
                  { label: 'pure growth effects', color: '#A530B8' },
                ]}
              />
            </div>
          </div>
        </section>

        {/* 6 — retraction retrospective */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">6 · Why it was retracted — and what survives</h2>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {RETRACTION_POINTS.map((c, i) => (
              <div key={c.title} className="rounded-lg border border-grey-200 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">
                  {i + 1} · {c.title}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-tertiary">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* caveats + sources */}
        <section className="mb-10 rounded-lg border border-grey-200 bg-surface-blue p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">Caveats &amp; sources</p>
          <p className="mt-1.5 max-w-4xl text-[12px] leading-relaxed text-tertiary">
            This is a stylised, browser-sized reconstruction of a retracted paper’s method, for method discussion
            inside the Secretariat — nothing here is a damage estimate that can be quoted. Reductions relative to the
            original: one pseudo-region per member state instead of 1,660 sub-national units; two closed-form warming
            pathways instead of 21 CMIP-6 models; effective moderator-linear marginal effects calibrated to published
            headline anchors instead of the (retracted) regression tables; a spread slider instead of the Monte-Carlo;
            no spatial spillovers, no sea-level rise, heatwaves, cyclones, tipping points or non-market damages (all
            also outside the original paper’s scope, except spillovers which it tested separately). Baseline
            climatologies, warming amplification, drying trends, GDP and population are rounded public figures. The
            module deliberately keeps the paper’s framing — including its contested magnitudes — inspectable rather
            than endorsed.
          </p>
          <ul className="mt-3 grid gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2">
            {SOURCES.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
