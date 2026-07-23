'use client';

/**
 * Summer Prep · Industry Report — Optimization.
 * -----------------------------------------------------------
 * Web front-end for the SEAMAPS-style (https://github.com/SebastianFra/SEAMAPS)
 * least-cost technology optimization of EU-27 energy-intensive industry
 * (Julia/JuMP + HiGHS). All data rendered here — the input workbook, the full
 * model source, and the results of all 13 scenarios — comes from
 * `src/data/summer-prep-optimization.ts`, a generated file produced directly
 * from the model's own inputs/outputs (see that file's header comment for the
 * exact source files). Nothing on this page is hand-typed data.
 *
 * The model itself lives at
 * `beta/modules/summer-prep/optimization/model/industry_optimization.jl`
 * and is downloadable in full (code + data + results + README) as a zip.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import {
  INPUT_SHEET_ORDER,
  INPUT_SHEETS,
  JULIA_SOURCE,
  JULIA_SOURCE_LINE_COUNT,
  MODEL_YEARS,
  RESULTS,
  SCENARIO_IDS,
  SCENARIO_META,
  SUBSECTOR_ORDER,
  SUBSECTORS,
  TECHNOLOGIES,
  type CellValue,
} from '@/data/summer-prep-optimization';

/* -------------------------------------------------------------------------
 * Constants / shared styling
 * ---------------------------------------------------------------------- */

const DOWNLOAD_BASE = '/data/summer-prep-optimization';
const XLSX_URL = `${DOWNLOAD_BASE}/industry-optimization-inputs.xlsx`;
const JL_URL = `${DOWNLOAD_BASE}/industry_optimization.jl`;
const ZIP_URL = `${DOWNLOAD_BASE}/industry-optimization-model.zip`;

const ACCENTS = {
  blue: '#004B7F',
  teal: '#00928F',
  purple: '#6667AB',
  amber: '#B87400',
  red: '#B83230',
  green: '#007B6C',
  orange: '#FF9933',
} as const;

/** Technology category -> house-palette color, used consistently across the
 * subsector chips and the tech-mix stacked bars. */
type TechCategory = 'reference' | 'transition' | 'electrification' | 'hydrogen' | 'ccs' | 'recycling' | 'biomass';

const CATEGORY_COLOR: Record<TechCategory, string> = {
  reference: ACCENTS.red,
  transition: ACCENTS.purple,
  electrification: ACCENTS.blue,
  hydrogen: ACCENTS.teal,
  ccs: ACCENTS.amber,
  recycling: ACCENTS.green,
  biomass: ACCENTS.orange,
};

const CATEGORY_LABEL: Record<TechCategory, string> = {
  reference: 'Reference / incumbent',
  transition: 'Transition / efficiency',
  electrification: 'Electrification',
  hydrogen: 'Hydrogen route',
  ccs: 'CCS',
  recycling: 'Recycling / scrap',
  biomass: 'Biomass / alt-fuel',
};

/** Explicit per-technology category, matching the 25 fixed technology IDs. */
const TECH_CATEGORY: Record<string, TechCategory> = {
  steel_bfbof: 'reference',
  steel_bfbof_ccs: 'ccs',
  steel_ngdri_eaf: 'transition',
  steel_h2dri_eaf: 'hydrogen',
  steel_scrap_eaf: 'recycling',
  cement_ref: 'reference',
  cement_clinkersub: 'transition',
  cement_ccs: 'ccs',
  cement_altfuel: 'biomass',
  hvc_ref: 'reference',
  hvc_elec: 'electrification',
  hvc_bio: 'biomass',
  hvc_ccs: 'ccs',
  ammonia_smr: 'reference',
  ammonia_smr_ccs: 'ccs',
  ammonia_h2: 'hydrogen',
  alu_ref: 'reference',
  alu_inert: 'transition',
  alu_sec: 'recycling',
  glass_ng: 'reference',
  glass_elec: 'electrification',
  glass_hybrid: 'transition',
  paper_ref: 'reference',
  paper_elec: 'electrification',
  paper_bio: 'biomass',
};

const CARD_CLASS =
  'rounded-xl border border-[#E6E7E8] bg-white p-4 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]';

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function techName(id: string): string {
  return TECHNOLOGIES[id]?.name ?? id;
}

/* -------------------------------------------------------------------------
 * Section: formulation chips
 * ---------------------------------------------------------------------- */

function FormulationChips() {
  const chips = [
    'LP',
    'JuMP + HiGHS',
    '7 subsectors',
    '25 technologies',
    '2025–2050',
    '13 scenarios',
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <span
          key={c}
          className="rounded-full border border-[#D6DAE0] px-3 py-1 text-[11.5px] font-semibold text-[#3D5265] dark:border-[var(--mh-border)] dark:text-[var(--mh-fg)]"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Section: model at a glance — subsector cards
 * ---------------------------------------------------------------------- */

function SubsectorCard({ id }: { id: string }) {
  const s = SUBSECTORS[id];
  const intensity = s.direct_co2_2023_mt / s.production_2023_mt;
  return (
    <article className={CARD_CLASS}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[14px] font-bold leading-snug">{s.name}</h3>
        <span className="whitespace-nowrap rounded-full bg-[#F3F5F7] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3D5265]/70 dark:bg-[var(--mh-bg)] dark:text-[var(--mh-muted)]">
          {s.branch}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <div className="rounded-md bg-[#F3F5F7] px-2.5 py-1.5 dark:bg-[var(--mh-bg)]">
          <div className="text-[9px] font-bold uppercase tracking-wide text-[#004B7F] dark:text-[#5B9BD5]">
            2023 production
          </div>
          <div className="text-[13px] font-semibold">{fmt(s.production_2023_mt, 1)} Mt</div>
        </div>
        <div className="rounded-md bg-[#F3F5F7] px-2.5 py-1.5 dark:bg-[var(--mh-bg)]">
          <div className="text-[9px] font-bold uppercase tracking-wide text-[#B83230] dark:text-[#FF8A80]">
            2023 direct CO2
          </div>
          <div className="text-[13px] font-semibold">{fmt(s.direct_co2_2023_mt, 1)} Mt</div>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] text-[#3D5265]/60 dark:text-[var(--mh-muted)]">
        ≈ {fmt(intensity, 2)} tCO2 / t product · {s.source}
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1">
        {s.techs.map((t) => (
          <span
            key={t}
            title={`${techName(t)} — ${CATEGORY_LABEL[TECH_CATEGORY[t]]}`}
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
            style={{ backgroundColor: CATEGORY_COLOR[TECH_CATEGORY[t]] }}
          >
            {t}
          </span>
        ))}
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------
 * Section: input workbook viewer
 * ---------------------------------------------------------------------- */

const SOURCE_LIKE_COLUMNS = new Set(['source', 'url', 'source_url', 'note', 'source_title', 'description']);

/** Shorten a URL for display: hostname + path, truncated; full URL stays in the title tooltip. */
function shortenUrl(url: string, maxLen = 42): string {
  let display = url;
  try {
    const u = new URL(url);
    display = u.hostname.replace(/^www\./, '') + u.pathname + u.search;
  } catch {
    // not a real URL (e.g. a relative repo path for model-assumption rows) — show as-is
  }
  return display.length > maxLen ? display.slice(0, maxLen - 1) + '…' : display;
}

function isNumericColumn(rows: CellValue[][], colIdx: number): boolean {
  return rows.every((r) => typeof r[colIdx] === 'number');
}

function WorkbookViewer() {
  const tabs = useMemo(() => ['readme', ...INPUT_SHEET_ORDER] as const, []);
  const [tab, setTab] = useState<(typeof tabs)[number]>('readme');

  const sheet = tab === 'readme' ? null : INPUT_SHEETS[tab];
  const numericCols = useMemo(
    () => (sheet ? sheet.columns.map((_, i) => isNumericColumn(sheet.rows, i)) : []),
    [sheet],
  );

  return (
    <div className={CARD_CLASS}>
      <div className="mb-3 flex flex-wrap gap-1.5 border-b border-[#E6E7E8] pb-3 dark:border-[var(--mh-border)]">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`rounded-md px-2.5 py-1 text-[12px] font-semibold transition ${
              tab === t
                ? 'bg-[#003399] text-white'
                : 'text-[#3D5265] hover:bg-[#F3F5F7] dark:text-[var(--mh-fg)] dark:hover:bg-[var(--mh-bg)]'
            }`}
          >
            {t === 'readme' ? 'ReadMe' : INPUT_SHEETS[t].label}
          </button>
        ))}
      </div>

      {tab === 'readme' ? (
        <div className="max-w-2xl space-y-2 text-[12.5px] leading-relaxed text-[#3D5265]/85 dark:text-[var(--mh-muted)]">
          <p>
            This workbook is the exact set of CSV inputs the model reads (
            <span className="font-mono text-[11.5px]">data/*.csv</span> in the model folder),
            mirrored here 1:1, one tab per input table — the same file you can download below as{' '}
            <span className="font-mono text-[11.5px]">industry-optimization-inputs.xlsx</span>.
          </p>
          <p>
            <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">Sectors</span>{' '}
            gives the 7 subsectors and their 2023 baselines;{' '}
            <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">Technologies</span>{' '}
            and <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">Energy use</span>{' '}
            define the 25 candidate technologies (cost, lifetime, availability, build-rate cap,
            CCS capture rate, energy intensity by carrier);{' '}
            <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">Demand</span>,{' '}
            <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">Fuel prices</span>,{' '}
            <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">Carbon price</span>{' '}
            and <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">Emission
            factors</span> drive the 2025-2050 trajectory;{' '}
            <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">Constraints</span>{' '}
            caps scrap availability, biomass and CO2 storage;{' '}
            <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">Scenarios</span>{' '}
            defines the 13 sensitivity runs; and every non-trivial number is keyed back to a real
            source in <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">Sources</span>.
          </p>
          <p>
            The model reads these files once, fails loudly if a file or column is missing, and
            re-solves the whole joint linear program from scratch for each of the 13 scenarios.
          </p>
        </div>
      ) : (
        sheet && (
          <div className="max-h-[420px] overflow-auto rounded-md border border-[#E6E7E8] dark:border-[var(--mh-border)]">
            <table className="w-full min-w-max border-collapse text-[11.5px]">
              <thead className="sticky top-0 z-10 bg-[#F3F5F7] dark:bg-[var(--mh-bg)]">
                <tr>
                  {sheet.columns.map((c, i) => (
                    <th
                      key={c}
                      className={`whitespace-nowrap border-b border-[#E6E7E8] px-2.5 py-1.5 font-bold text-[#3D5265] dark:border-[var(--mh-border)] dark:text-[var(--mh-fg)] ${
                        numericCols[i] ? 'text-right' : 'text-left'
                      }`}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className="border-b border-[#F0F1F2] last:border-0 hover:bg-[#F8F9FA] dark:border-[var(--mh-border)]/40 dark:hover:bg-[var(--mh-bg)]"
                  >
                    {row.map((cell, ci) => {
                      const col = sheet.columns[ci];
                      const isSourceUrl = col === 'source_url' && typeof cell === 'string' && cell.length > 0;
                      const truncate = SOURCE_LIKE_COLUMNS.has(col) && typeof cell === 'string' && cell.length > 40;
                      return (
                        <td
                          key={ci}
                          title={isSourceUrl ? String(cell) : truncate ? String(cell) : undefined}
                          className={`px-2.5 py-1 text-[#3D5265] dark:text-[var(--mh-muted)] ${
                            numericCols[ci] ? 'text-right tabular-nums' : 'text-left'
                          } ${truncate && !isSourceUrl ? 'max-w-[220px] truncate' : 'whitespace-nowrap'}`}
                        >
                          {isSourceUrl ? (
                            (cell as string).startsWith('http') ? (
                              <a
                                href={cell as string}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#004B7F] underline decoration-[#004B7F]/40 underline-offset-2 hover:text-[#00928F] dark:text-[#6FB7E8]"
                              >
                                {shortenUrl(cell as string)}
                              </a>
                            ) : (
                              <span className="text-[#3D5265] dark:text-[var(--mh-muted)]">{cell}</span>
                            )
                          ) : typeof cell === 'number' ? (
                            cell.toLocaleString('en-GB', { maximumFractionDigits: 4 })
                          ) : (
                            cell
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#E6E7E8] pt-3 dark:border-[var(--mh-border)]">
        <p className="text-[11px] text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
          {sheet ? `${sheet.rows.length} row${sheet.rows.length === 1 ? '' : 's'} · ${sheet.columns.length} columns` : '10 sheets'}
        </p>
        <a
          href={XLSX_URL}
          download
          className="inline-flex items-center gap-1.5 rounded-md border border-[#D6DAE0] px-3 py-1.5 text-[12px] font-semibold text-[#3D5265] hover:bg-[#F3F5F7] dark:border-[var(--mh-border)] dark:text-[var(--mh-fg)] dark:hover:bg-[var(--mh-bg)]"
        >
          ⬇ Download inputs (.xlsx, ~29 KB)
        </a>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Section: Julia code viewer
 * ---------------------------------------------------------------------- */

function CodeViewer() {
  const [open, setOpen] = useState(false);
  const lines = useMemo(() => JULIA_SOURCE.split('\n'), []);

  return (
    <div className={CARD_CLASS}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-[13.5px] font-bold text-[#3D5265] dark:text-[var(--mh-fg)]">
          {open ? '▾' : '▸'} Show the full model code — {JULIA_SOURCE_LINE_COUNT} lines
        </span>
        <span className="rounded-full border border-[#D6DAE0] px-2.5 py-1 text-[11px] font-semibold text-[#3D5265] dark:border-[var(--mh-border)] dark:text-[var(--mh-fg)]">
          industry_optimization.jl
        </span>
      </button>

      {open && (
        <div className="mt-3 max-h-[560px] overflow-auto rounded-md border border-[#E6E7E8] bg-[#F8F9FA] dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)]">
          <pre className="min-w-max p-0 text-[12px] leading-[1.5]">
            <code>
              {lines.map((line, i) => (
                <div key={i} className="flex hover:bg-[#EEF0F2] dark:hover:bg-[var(--mh-card)]">
                  <span className="sticky left-0 w-12 flex-none select-none border-r border-[#E6E7E8] bg-[#F3F5F7] px-2 text-right text-[#3D5265]/40 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-muted)]/50">
                    {i + 1}
                  </span>
                  <span className="whitespace-pre px-3 text-[#3D5265] dark:text-[var(--mh-fg)]">
                    {line.length ? line : ' '}
                  </span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#E6E7E8] pt-3 dark:border-[var(--mh-border)]">
        <p className="text-[11px] text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
          Heavily commented — every constraint states in plain language what it enforces and why.
        </p>
        <a
          href={JL_URL}
          download
          className="inline-flex items-center gap-1.5 rounded-md border border-[#D6DAE0] px-3 py-1.5 text-[12px] font-semibold text-[#3D5265] hover:bg-[#F3F5F7] dark:border-[var(--mh-border)] dark:text-[var(--mh-fg)] dark:hover:bg-[var(--mh-bg)]"
        >
          ⬇ Download .jl (~37 KB)
        </a>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Section: results — central scenario tech-mix bars + CO2 trajectory
 * ---------------------------------------------------------------------- */

const MIX_YEARS = [2030, 2040, 2050] as const;

function TechMixBar({ subsector }: { subsector: string }) {
  const central = RESULTS.central.by_subsector[subsector];
  return (
    <div className="space-y-1.5">
      {MIX_YEARS.map((y) => {
        const shares = central.tech_shares[String(y)] ?? {};
        const entries = Object.entries(shares).filter(([, v]) => v > 0);
        return (
          <div key={y} className="flex items-center gap-2">
            <span className="w-10 flex-none text-[11px] font-semibold text-[#3D5265]/70 dark:text-[var(--mh-muted)]">
              {y}
            </span>
            <div
              role="img"
              aria-label={`${SUBSECTORS[subsector].name} production mix in ${y}: ${entries
                .map(([t, v]) => `${techName(t)} ${Math.round(v * 100)}%`)
                .join(', ')}`}
              className="flex h-6 flex-1 overflow-hidden rounded-md border border-[#E6E7E8] dark:border-[var(--mh-border)]"
            >
              {entries.map(([t, v]) => (
                <div
                  key={t}
                  title={`${techName(t)}: ${(v * 100).toFixed(1)}%`}
                  style={{ width: `${v * 100}%`, backgroundColor: CATEGORY_COLOR[TECH_CATEGORY[t]] }}
                  className="flex h-full items-center justify-center overflow-hidden"
                >
                  {v >= 0.09 && (
                    <span className="px-0.5 text-[9px] font-bold text-white">
                      {Math.round(v * 100)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TechMixCard({ subsector }: { subsector: string }) {
  const s = SUBSECTORS[subsector];
  const central = RESULTS.central.by_subsector[subsector];
  return (
    <article className={CARD_CLASS}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[13.5px] font-bold">{s.name}</h3>
        <span className="whitespace-nowrap text-[11px] text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
          2050: {fmt(central.co2_2050_mt, 1)} Mt CO2
        </span>
      </div>
      <TechMixBar subsector={subsector} />
    </article>
  );
}

function CategoryLegend() {
  const cats = Object.keys(CATEGORY_LABEL) as TechCategory[];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {cats.map((c) => (
        <span key={c} className="inline-flex items-center gap-1.5 text-[11px] text-[#3D5265]/75 dark:text-[var(--mh-muted)]">
          <span className="h-2.5 w-2.5 flex-none rounded-sm" style={{ backgroundColor: CATEGORY_COLOR[c] }} />
          {CATEGORY_LABEL[c]}
        </span>
      ))}
    </div>
  );
}

function Co2TrajectoryChart() {
  const co2 = RESULTS.central.co2_by_year;
  const points = MODEL_YEARS.map((y) => ({ y, v: co2[String(y)] }));
  const maxV = Math.max(...points.map((p) => p.v)) * 1.1;
  const W = 640;
  const H = 220;
  const padL = 40;
  const padB = 28;
  const padT = 16;
  const padR = 16;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const x = (i: number) => padL + (i / (points.length - 1)) * plotW;
  const yPos = (v: number) => padT + plotH - (v / maxV) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${yPos(p.v)}`).join(' ');
  const areaPath = `${linePath} L ${x(points.length - 1)} ${padT + plotH} L ${x(0)} ${padT + plotH} Z`;

  const labelIdx = new Set([0, 3, 5]); // 2025, 2040, 2050

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`EU-27 industry direct CO2 emissions, central scenario: ${points
          .map((p) => `${p.y}: ${fmt(p.v, 0)} Mt`)
          .join(', ')}`}
        className="w-full"
      >
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={padL}
            x2={W - padR}
            y1={padT + plotH * (1 - f)}
            y2={padT + plotH * (1 - f)}
            stroke="currentColor"
            className="text-[#E6E7E8] dark:text-[var(--mh-border)]"
            strokeWidth={1}
          />
        ))}
        <path d={areaPath} fill={ACCENTS.teal} opacity={0.12} />
        <path d={linePath} fill="none" stroke={ACCENTS.teal} strokeWidth={2.5} />
        {points.map((p, i) => (
          <g key={p.y}>
            <circle cx={x(i)} cy={yPos(p.v)} r={3.5} fill={ACCENTS.teal} />
            {labelIdx.has(i) && (
              <text
                x={x(i)}
                y={yPos(p.v) - 10}
                textAnchor="middle"
                className="fill-[#3D5265] text-[11px] font-bold dark:fill-[var(--mh-fg)]"
              >
                {fmt(p.v, 0)} Mt
              </text>
            )}
            <text
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-[#3D5265]/60 text-[10px] dark:fill-[var(--mh-muted)]"
            >
              {p.y}
            </text>
          </g>
        ))}
        <text
          x={padL - 8}
          y={padT + 4}
          textAnchor="end"
          className="fill-[#3D5265]/60 text-[9px] dark:fill-[var(--mh-muted)]"
        >
          {fmt(maxV, 0)}
        </text>
        <text
          x={padL - 8}
          y={padT + plotH}
          textAnchor="end"
          className="fill-[#3D5265]/60 text-[9px] dark:fill-[var(--mh-muted)]"
        >
          0
        </text>
      </svg>
      <p className="mt-1 text-center text-[11px] text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
        EU-27 industry direct (scope-1) CO2, central scenario — Mt/yr
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Section: sensitivity tornado
 * ---------------------------------------------------------------------- */

type Metric = 'co2_2040' | 'cost';

const SENSITIVITY_SCENARIOS = SCENARIO_IDS.filter((id) => id !== 'central');

function metricValue(id: (typeof SCENARIO_IDS)[number], metric: Metric): number {
  return metric === 'co2_2040' ? RESULTS[id].co2_by_year['2040'] : RESULTS[id].total_discounted_cost_beur;
}

function TornadoChart({ metric }: { metric: Metric }) {
  const central = metricValue('central', metric);
  const rows = useMemo(() => {
    return SENSITIVITY_SCENARIOS
      .map((id) => {
        const v = metricValue(id, metric);
        const delta = v - central;
        return { id, v, delta };
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [metric, central]);

  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.delta))) * 1.05;
  const unit = metric === 'co2_2040' ? 'Mt CO2 (2040)' : '€bn (discounted, all years)';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[11px] text-[#3D5265]/60 dark:text-[var(--mh-muted)]">
        <span>
          Central = {fmt(central, metric === 'co2_2040' ? 1 : 0)} {unit.replace(' (2040)', '').replace(' (discounted, all years)', '')}
        </span>
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ACCENTS.red }} /> worse than central
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ACCENTS.green }} /> better than central
          </span>
        </span>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const meta = SCENARIO_META[r.id];
          const worse = r.delta > 0;
          const widthPct = (Math.abs(r.delta) / maxAbs) * 50;
          return (
            <div key={r.id} className="flex items-center gap-2">
              <span className="w-40 flex-none truncate text-[11.5px] font-medium text-[#3D5265] dark:text-[var(--mh-fg)]" title={meta.description}>
                {meta.label}
              </span>
              <div
                role="img"
                aria-label={`${meta.label}: ${fmt(r.v, metric === 'co2_2040' ? 1 : 0)} ${unit}, ${worse ? '+' : ''}${fmt(r.delta, metric === 'co2_2040' ? 1 : 0)} vs central`}
                className="relative h-5 flex-1"
              >
                <div className="absolute inset-y-0 left-1/2 w-px bg-[#3D5265]/30 dark:bg-[var(--mh-muted)]/40" />
                <div
                  className="absolute inset-y-0 flex items-center rounded-sm"
                  style={{
                    backgroundColor: worse ? ACCENTS.red : ACCENTS.green,
                    width: `${widthPct}%`,
                    left: worse ? '50%' : `${50 - widthPct}%`,
                  }}
                />
              </div>
              <span
                className="w-24 flex-none text-right text-[11px] font-semibold tabular-nums"
                style={{ color: worse ? ACCENTS.red : ACCENTS.green }}
              >
                {worse ? '+' : ''}
                {fmt(r.delta, metric === 'co2_2040' ? 1 : 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SensitivitySection() {
  const [metric, setMetric] = useState<Metric>('co2_2040');
  return (
    <div className={CARD_CLASS}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[13.5px] font-bold">All 12 sensitivity scenarios vs central</h3>
        <div className="inline-flex rounded-lg border border-[#E6E7E8] p-1 dark:border-[var(--mh-border)]">
          {(
            [
              ['co2_2040', '2040 direct CO2'],
              ['cost', 'Total discounted cost'],
            ] as [Metric, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              aria-pressed={metric === m}
              className={`rounded-md px-3 py-1 text-[12px] font-semibold transition ${
                metric === m
                  ? 'bg-[#003399] text-white'
                  : 'text-[#3D5265] hover:bg-[#F3F5F7] dark:text-[var(--mh-fg)] dark:hover:bg-[var(--mh-bg)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <TornadoChart metric={metric} />
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Section: downloads
 * ---------------------------------------------------------------------- */

function DownloadCard({
  title,
  desc,
  size,
  href,
  accent,
}: {
  title: string;
  desc: string;
  size: string;
  href: string;
  accent: string;
}) {
  return (
    <a
      href={href}
      download
      className="group flex flex-col gap-1.5 rounded-xl border border-[#E6E7E8] bg-white p-4 transition hover:shadow-sm dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]"
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[13.5px] font-bold text-[#3D5265] dark:text-[var(--mh-fg)]">{title}</h3>
        <span className="whitespace-nowrap text-[11px] font-semibold text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
          {size}
        </span>
      </div>
      <p className="text-[12px] leading-relaxed text-[#3D5265]/75 dark:text-[var(--mh-muted)]">{desc}</p>
      <span className="mt-1 text-[12px] font-semibold text-[#00928F] group-hover:underline">⬇ Download</span>
    </a>
  );
}

/* -------------------------------------------------------------------------
 * Page
 * ---------------------------------------------------------------------- */

function OptimizationInner() {
  return (
    <div className="min-h-screen bg-white text-[#3D5265] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)]">
      <SiteHeader />
      <PageHero
        title="Optimization — sector least-cost model"
        subtitle="A SEAMAPS-style least-cost technology optimization of the 7 EU-27 energy-intensive industry subsectors: what would a cost-minimiser build between 2025 and 2050, and how much CO2 would that pathway emit?"
      />

      <main className="mx-auto max-w-[1080px] px-4 py-6 sm:px-6 sm:py-8">
        {/* 1. Intro */}
        <section className="mb-8 space-y-3">
          <p className="text-[13px] leading-relaxed text-[#3D5265]/85 dark:text-[var(--mh-muted)]">
            A <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">least-cost optimization model</span>{' '}
            is a piece of software that is handed a menu of technologies (their capital cost, running
            cost, energy use, and how much CO2 each emits), a demand it must meet every year, and a set
            of physical limits (how fast a technology can realistically be built, how much scrap or
            biomass is available, how much CO2 storage exists) — and it is then asked to pick, mathematically,
            the cheapest possible combination of technologies that meets demand without breaking any
            limit. It is <em>not</em> a forecast of what companies will actually do; it is the answer to
            "if a rational, cost-minimizing planner controlled every investment decision, what would it
            choose, and what would that imply for emissions?" Comparing that answer across a dozen
            different assumptions (cheaper hydrogen, a slower build-out, a higher carbon price, and so on)
            is what the sensitivity analysis further down this page does.
          </p>
          <p className="text-[13px] leading-relaxed text-[#3D5265]/85 dark:text-[var(--mh-muted)]">
            This model is written in the spirit of{' '}
            <a
              href="https://github.com/SebastianFra/SEAMAPS"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-[#00928F] underline-offset-2 hover:text-[#00928F]"
            >
              SEAMAPS
            </a>
            : one readable, heavily-commented Julia file, JuMP for the algebra, the open-source HiGHS
            solver, plain CSV inputs, and a scenario loop for sensitivity testing — no black boxes.
            All 7 subsectors (steel, cement, high-value chemicals, ammonia, aluminium, glass, paper) and
            their 25 candidate technologies are solved <em>together</em> in one joint linear program,
            because they compete for the same shared biomass and CO2 capture/storage ceilings.
          </p>
          <FormulationChips />
          <p className="rounded-lg border border-[#E6E7E8] bg-[#F8F9FA] px-3 py-2.5 text-[12px] leading-relaxed text-[#3D5265]/70 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)] dark:text-[var(--mh-muted)]">
            <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">This is a working
            prototype, not a Board position.</span> Technology costs, energy intensities and constraint
            ceilings are literature-derived central estimates (every non-trivial number is keyed to a
            real source — IEA, JRC, Eurofer, Cembureau, Material Economics, IEAGHG and others — in the
            input workbook's Sources sheet below). It is assembled for illustrative, order-of-magnitude
            sensitivity testing, not for investment decisions. Treat every result on this page as
            directional.
          </p>
        </section>

        {/* 2. Model at a glance */}
        <section className="mb-8">
          <h2 className="mb-3 text-[15px] font-bold text-[#3D5265] dark:text-[var(--mh-fg)]">
            Model at a glance — the 7 subsectors
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SUBSECTOR_ORDER.map((id) => (
              <SubsectorCard key={id} id={id} />
            ))}
          </div>
        </section>

        {/* 3. Input workbook viewer */}
        <section className="mb-8">
          <h2 className="mb-1 text-[15px] font-bold text-[#3D5265] dark:text-[var(--mh-fg)]">
            Input workbook
          </h2>
          <p className="mb-3 text-[12px] text-[#3D5265]/60 dark:text-[var(--mh-muted)]">
            Every table below is rendered directly from the same data the model reads and the
            downloadable .xlsx contains — nothing here is re-typed or summarised.
          </p>
          <WorkbookViewer />
        </section>

        {/* 4. Julia code viewer */}
        <section className="mb-8">
          <h2 className="mb-3 text-[15px] font-bold text-[#3D5265] dark:text-[var(--mh-fg)]">
            The model code
          </h2>
          <CodeViewer />
        </section>

        {/* 5. Results — central scenario */}
        <section className="mb-8">
          <h2 className="mb-3 text-[15px] font-bold text-[#3D5265] dark:text-[var(--mh-fg)]">
            Results — central scenario
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className={CARD_CLASS}>
              <h3 className="mb-1 text-[13.5px] font-bold">EU-27 industry direct CO2, 2025–2050</h3>
              <p className="mb-2 text-[11px] text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
                389 Mt (2025) → 142 Mt (2040) → 98 Mt (2050) under central assumptions.
              </p>
              <Co2TrajectoryChart />
            </div>
            <div className={CARD_CLASS}>
              <h3 className="mb-1 text-[13.5px] font-bold">Total discounted system cost</h3>
              <p className="text-[12px] leading-relaxed text-[#3D5265]/75 dark:text-[var(--mh-muted)]">
                The central pathway's discounted sum of annualised capex, fixed &amp; variable OPEX,
                energy cost and carbon cost across 2025-2050 (7% real discount rate) is{' '}
                <span className="font-bold text-[#3D5265] dark:text-[var(--mh-fg)]">
                  €{fmt(RESULTS.central.total_discounted_cost_beur, 0)} bn
                </span>
                . The sensitivity section below shows how much that moves under each of the 12
                alternative scenarios — the single biggest cost swing is a 20% lower demand path, which
                cuts it by roughly {fmt(
                  100 * (1 - RESULTS.demand_low.total_discounted_cost_beur / RESULTS.central.total_discounted_cost_beur),
                  0,
                )}%.
              </p>
              <p className="mt-3 text-[12px] leading-relaxed text-[#3D5265]/75 dark:text-[var(--mh-muted)]">
                Per-subsector production mixes (right and below) show where that cost and those
                emissions come from: which technologies the model chooses to build, and when.
              </p>
            </div>
          </div>

          <h3 className="mb-2 mt-5 text-[13.5px] font-bold text-[#3D5265] dark:text-[var(--mh-fg)]">
            Production mix by technology, 2030 / 2040 / 2050
          </h3>
          <div className="mb-3">
            <CategoryLegend />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {SUBSECTOR_ORDER.map((id) => (
              <TechMixCard key={id} subsector={id} />
            ))}
          </div>
        </section>

        {/* 6. Sensitivity analysis */}
        <section className="mb-8">
          <h2 className="mb-1 text-[15px] font-bold text-[#3D5265] dark:text-[var(--mh-fg)]">
            Sensitivity analysis
          </h2>
          <p className="mb-3 text-[12px] text-[#3D5265]/60 dark:text-[var(--mh-muted)]">
            Every scenario is a full independent re-solve of the joint linear program (see the
            Scenarios sheet above for exact definitions), sorted here by size of impact vs the central
            case.
          </p>
          <SensitivitySection />

          <ul className="mt-4 space-y-2 text-[12.5px] leading-relaxed text-[#3D5265]/85 dark:text-[var(--mh-muted)]">
            <li>
              <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">Slow_build is the
              single largest downside risk in the whole sensitivity set:</span> halving the maximum
              annual build-rate for new capacity pushes 2040 direct CO2 to{' '}
              {fmt(RESULTS.slow_build.co2_by_year['2040'], 1)} Mt — {fmt(
                RESULTS.slow_build.co2_by_year['2040'] - RESULTS.central.co2_by_year['2040'],
                1,
              )}{' '}
              Mt worse than the {fmt(RESULTS.central.co2_by_year['2040'], 1)} Mt central case, and worse
              than every price scenario tested.
            </li>
            <li>
              <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">Demand reduction is
              the cheapest lever tested:</span> a 20% lower demand path cuts total discounted cost from
              €{fmt(RESULTS.central.total_discounted_cost_beur, 0)}bn to €
              {fmt(RESULTS.demand_low.total_discounted_cost_beur, 0)}bn (≈−
              {fmt(
                100 * (1 - RESULTS.demand_low.total_discounted_cost_beur / RESULTS.central.total_discounted_cost_beur),
                0,
              )}
              %) while also lowering 2040 CO2 to {fmt(RESULTS.demand_low.co2_by_year['2040'], 1)} Mt.
            </li>
            <li>
              <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">Electricity price
              matters more than hydrogen price for 2040 emissions:</span> cheap electricity brings 2040
              CO2 to {fmt(RESULTS.elec_cheap.co2_by_year['2040'], 1)} Mt and expensive electricity to{' '}
              {fmt(RESULTS.elec_exp.co2_by_year['2040'], 1)} Mt, a much wider spread than cheap ({fmt(
                RESULTS.h2_cheap.co2_by_year['2040'],
                1,
              )}{' '}
              Mt) vs expensive ({fmt(RESULTS.h2_exp.co2_by_year['2040'], 1)} Mt) hydrogen — by 2040, most
              clean capacity the model builds is electricity-intensive, not hydrogen-intensive.
            </li>
            <li>
              <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">The carbon price is
              a stronger 2040 lever than clean-tech CAPEX:</span> a high carbon price cuts 2040 CO2 to{' '}
              {fmt(RESULTS.co2_high.co2_by_year['2040'], 1)} Mt, more than 30%-cheaper clean-tech CAPEX
              does ({fmt(RESULTS.capex_low.co2_by_year['2040'], 1)} Mt).
            </li>
            <li>
              <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">Cheap electricity is
              a genuine win-win:</span> elec_cheap lowers both 2040 CO2 ({fmt(RESULTS.elec_cheap.co2_by_year['2040'], 1)}{' '}
              Mt) and total cost (€{fmt(RESULTS.elec_cheap.total_discounted_cost_beur, 0)}bn, ≈−
              {fmt(
                100 * (1 - RESULTS.elec_cheap.total_discounted_cost_beur / RESULTS.central.total_discounted_cost_beur),
                0,
              )}
              %) at once — unlike co2_high, which cuts emissions but raises cost to €
              {fmt(RESULTS.co2_high.total_discounted_cost_beur, 0)}bn.
            </li>
            <li>
              <span className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)]">Hydrogen price is the
              single biggest swing factor for H2-DRI steel:</span> cheap hydrogen lifts hydrogen-based
              steel to {fmt((RESULTS.h2_cheap.by_subsector.steel.tech_shares['2050']?.steel_h2dri_eaf ?? 0) * 100, 0)}%
              of 2050 production (vs {fmt((RESULTS.central.by_subsector.steel.tech_shares['2050']?.steel_h2dri_eaf ?? 0) * 100, 0)}%
              central), while expensive hydrogen pushes it to essentially 0% — see Key findings below.
            </li>
          </ul>
        </section>

        {/* 7. Key findings */}
        <section className="mb-8">
          <h2 className="mb-3 text-[15px] font-bold text-[#3D5265] dark:text-[var(--mh-fg)]">
            Key findings
          </h2>
          <ol className="space-y-3">
            {[
              <>
                The central pathway cuts EU-27 industry direct CO2 by three-quarters by mid-century:{' '}
                {fmt(RESULTS.central.co2_by_year['2025'], 0)} Mt (2025) →{' '}
                {fmt(RESULTS.central.co2_by_year['2040'], 0)} Mt (2040) →{' '}
                {fmt(RESULTS.central.co2_by_year['2050'], 0)} Mt (2050), a{' '}
                {fmt(100 * (1 - RESULTS.central.co2_by_year['2050'] / RESULTS.central.co2_by_year['2025']), 0)}%
                reduction — under the model's cost-minimizing assumptions, not as a forecast of actual
                investment behaviour.
              </>,
              <>
                Steel decarbonizes mostly via scrap recycling and gas-based DRI, not hydrogen, in the
                central case: by 2050 the mix is ≈
                {fmt((RESULTS.central.by_subsector.steel.tech_shares['2050']?.steel_scrap_eaf ?? 0) * 100, 0)}%
                scrap-EAF, ≈
                {fmt((RESULTS.central.by_subsector.steel.tech_shares['2050']?.steel_ngdri_eaf ?? 0) * 100, 0)}%
                NG-DRI+EAF, and only ≈
                {fmt((RESULTS.central.by_subsector.steel.tech_shares['2050']?.steel_h2dri_eaf ?? 0) * 100, 0)}%
                H2-DRI+EAF — natural-gas DRI is the model's least-cost interim bridge, not a truly
                zero-carbon end state.
              </>,
              <>
                Hydrogen-DRI steel only becomes material once hydrogen is cheap: a 40% lower hydrogen
                price lifts H2-DRI to{' '}
                {fmt((RESULTS.h2_cheap.by_subsector.steel.tech_shares['2050']?.steel_h2dri_eaf ?? 0) * 100, 0)}%
                of 2050 steel production (from{' '}
                {fmt((RESULTS.central.by_subsector.steel.tech_shares['2050']?.steel_h2dri_eaf ?? 0) * 100, 0)}%
                central), while a 40% higher hydrogen price pushes it to essentially 0%. The hydrogen
                price, not steel-specific policy, is the single biggest swing factor for green steel in
                this model.
              </>,
              <>
                The build-rate bottleneck — not any single price assumption — is the largest downside
                risk tested: halving the maximum build-rate for new capacity (slow_build) pushes 2040
                direct CO2 to {fmt(RESULTS.slow_build.co2_by_year['2040'], 0)} Mt, {fmt(
                  RESULTS.slow_build.co2_by_year['2040'] - RESULTS.central.co2_by_year['2040'],
                  0,
                )}{' '}
                Mt worse than central and worse than higher demand (+
                {fmt(RESULTS.demand_high.co2_by_year['2040'] - RESULTS.central.co2_by_year['2040'], 0)} Mt)
                or a higher electricity price (+
                {fmt(RESULTS.elec_exp.co2_by_year['2040'] - RESULTS.central.co2_by_year['2040'], 0)} Mt).
                Permitting, supply-chain and grid-connection speed matter more than any single cost
                lever.
              </>,
              <>
                Demand reduction is the cheapest lever tested: a 20% lower demand path (material
                efficiency / circularity) cuts total discounted system cost from €
                {fmt(RESULTS.central.total_discounted_cost_beur, 0)}bn to €
                {fmt(RESULTS.demand_low.total_discounted_cost_beur, 0)}bn (≈−
                {fmt(
                  100 * (1 - RESULTS.demand_low.total_discounted_cost_beur / RESULTS.central.total_discounted_cost_beur),
                  0,
                )}
                %) and lowers 2040 CO2 to {fmt(RESULTS.demand_low.co2_by_year['2040'], 0)} Mt — more
                cost-effective than any supply-side technology scenario in the sensitivity set.
              </>,
              <>
                Electricity-price sensitivity dominates hydrogen-price sensitivity for near-term (2040)
                emissions: cheap electricity reaches {fmt(RESULTS.elec_cheap.co2_by_year['2040'], 0)} Mt
                and expensive electricity {fmt(RESULTS.elec_exp.co2_by_year['2040'], 0)} Mt, a wider
                spread than cheap ({fmt(RESULTS.h2_cheap.co2_by_year['2040'], 0)} Mt) vs expensive (
                {fmt(RESULTS.h2_exp.co2_by_year['2040'], 0)} Mt) hydrogen — because most clean capacity
                added by 2040 (scrap-EAF, all-electric glass/cracking, heat pumps) is electricity-, not
                hydrogen-, intensive.
              </>,
              <>
                Carbon prices need to be near the central path, not the low path, before cement CCS
                saturates the model's CO2-storage ceiling: cement CCS reaches ≈
                {fmt((RESULTS.central.by_subsector.cement.tech_shares['2050']?.cement_ccs ?? 0) * 100, 0)}%
                of 2050 cement production under both central (€80→250/t ETS path) and co2_high, but only
                ≈{fmt((RESULTS.co2_low.by_subsector.cement.tech_shares['2050']?.cement_ccs ?? 0) * 100, 0)}%
                under co2_low (€50→170/t) — suggesting the model's ≈€100-150/t range is roughly where CCS
                becomes economic enough to compete for the scarce, ramp-limited capture/storage capacity
                (100 Mt/yr economy-wide by 2050) rather than being purely capital-constrained.
              </>,
            ].map((node, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ backgroundColor: Object.values(ACCENTS)[i % 7] }}
                >
                  {i + 1}
                </span>
                <p className="text-[12.5px] leading-relaxed text-[#3D5265]/90 dark:text-[var(--mh-fg)]">{node}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 8. Downloads */}
        <section className="mb-8">
          <h2 className="mb-3 text-[15px] font-bold text-[#3D5265] dark:text-[var(--mh-fg)]">
            Downloads
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <DownloadCard
              title="Input workbook"
              desc="All 10 input tables (sectors, demand, technologies, energy use, prices, constraints, scenarios, sources) as one Excel file."
              size="~29 KB"
              href={XLSX_URL}
              accent={ACCENTS.blue}
            />
            <DownloadCard
              title="Model source (.jl)"
              desc="The full, heavily-commented Julia/JuMP model — the same source shown in the code viewer above."
              size="~37 KB"
              href={JL_URL}
              accent={ACCENTS.teal}
            />
            <DownloadCard
              title="Full model package (.zip)"
              desc="Code + data + all 13 results_<scenario>.csv files + results_summary.json + README — everything needed to reproduce and review."
              size="~96 KB"
              href={ZIP_URL}
              accent={ACCENTS.purple}
            />
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-[#3D5265]/60 dark:text-[var(--mh-muted)]">
            Every result on this page is reproducible: with Julia 1.11 and the pinned dependencies in{' '}
            <span className="font-mono text-[11.5px]">Project.toml</span>, run{' '}
            <span className="font-mono text-[11.5px]">julia --project=. industry_optimization.jl</span>{' '}
            from inside the unzipped model folder to re-solve all 13 scenarios and regenerate the result
            CSVs and JSON from scratch.
          </p>
        </section>

        {/* Provenance footer */}
        <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
          Provenance: every non-trivial input number (2023 production &amp; emissions, technology capex/
          OPEX/lifetime/availability, energy intensities, fuel and carbon prices, constraint ceilings) is
          keyed to a real, named source — IEA, JRC, Eurofer, Cembureau, Fertilizers Europe, IAI, FEVE,
          CEPI, Material Economics, IEAGHG, EPRS and others — row by row in the input workbook's Sources
          sheet above. The model, its inputs and this page were AI-assembled as a working prototype for
          the Summer Prep exploration and are pending expert (sector-lead) verification. Nothing here is
          a Board position.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

export default function OptimizationPage() {
  return <OptimizationInner />;
}
