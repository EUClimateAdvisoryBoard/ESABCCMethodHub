/**
 * Scenario database — Industry project tab.
 * ---------------------------------------------------------------------------
 * The 1,008 EU industry emission pathways from ten scenario pools, the
 * 289-run REMIND-EU ensemble and the reference sheets behind the EEA deck
 * "EU industry emission pathways in scenario databases: screening against the
 * ESABCC criteria" (EEA for the ESABCC Secretariat, 18 November 2026), with
 * the deck's screening funnel made interactive:
 *
 *   database → net zero 2050 → 85–95 % by 2040 → ESABCC filter → risk levels
 *
 * Every view state (pool, period, stage, search, risk levels, selection, sort)
 * lives in the URL. The risk-level sliders re-run the workbook's sensitivity
 * criterion live; the presets reproduce sheet Sensitivity rows A–D.
 *
 * Data: src/data/industry-scenario-screening.generated.ts (regenerate with
 * `python3 scripts/build-industry-scenario-screening.py`). Visual language:
 * the deck's teal/orange palette (palette.ts).
 *
 * AI-compiled — pending human verification. The workbook marks Scenario
 * Compass data as under manuscript embargo (internal use only).
 */
'use client';

import { useMemo, useState } from 'react';
import ModeSwitcher from '@/components/ui/ModeSwitcher';
import { FilterPill } from '@/components/ui/FilterPill';
import { EmptyState, PartialState } from '@/components/ui/StateView';
import { useUrlState, codecs } from '@/lib/useUrlState';
import {
  ASSUMPTIONS,
  CMIP7,
  CMIP7_TITLE,
  CMIP7_YEARS,
  ESABCC_2040,
  ESABCC_2040_TITLE,
  INVENTORY,
  INVENTORY_TITLE,
  POOLS,
  README,
  SENSITIVITY,
  SENSITIVITY_NOTE,
  UBA,
  UBA_TITLE,
} from '@/data/industry-scenario-screening.generated';
import {
  ADVICE_RISK_LEVELS,
  PATHWAYS,
  REMIND_RUNS,
  STAGES,
  checkAgainstWorkbook,
  fmt,
  passesWithRisk,
  quantiles,
  remindPassesWithRisk,
  remindStage,
  stageUnder,
  type Pathway,
  type RemindRun,
  type RiskLevels,
} from '@/lib/industry-scenario-screening/model';
import PathwayChart, { ChartLegend, type ChartLine } from './PathwayChart';
import { DECK } from './palette';

const WORKBOOK_URL = '/data/industry-scenario-screening/Scenario_database.xlsx';

const SOURCES: { label: string; url: string }[] = [
  { label: 'IIASA Scenario Compass and ixmp4 platforms (scenariocompass, ngfs_phase_4/5, ecemf, deeds, navigate, shape)', url: 'https://data.ece.iiasa.ac.at/' },
  { label: 'ESABCC (2023) Scientific advice for the determination of an EU-wide 2040 climate target', url: 'https://climate-advisory-board.europa.eu/reports-and-publications/scientific-advice-for-the-determination-of-an-eu-wide-2040' },
  { label: 'Rodrigues et al. (2026), Nature Communications 17:3417 — data, Zenodo 10.5281/zenodo.18661988', url: 'https://doi.org/10.5281/zenodo.18661988' },
  { label: 'UBA / Fraunhofer ISI (2026), Climate Change 18/2026 — doi 10.60810/openumwelt-8104', url: 'https://doi.org/10.60810/openumwelt-8104' },
  { label: 'EEA (2026) GHG inventory and Member States’ projections (WEM/WAM)', url: 'https://www.eea.europa.eu/en/datahub' },
  { label: 'JRC (2025) POTEnCIA CETO 2025 (JRC143969); JRC (2026) GECO 2025 (JRC145985)', url: 'https://publications.jrc.ec.europa.eu/repository/' },
  { label: 'Ember (2026) European Electricity Review', url: 'https://ember-energy.org/' },
];

const OPEN_QUESTIONS: [string, string][] = [
  ['Which benchmark for industry?', 'The 7 ESABCC 2023 runs, the 2 JRC pathways, NGFS Low demand, or a range across them?'],
  ['How much weight on one model?', '7 of the 8 passing pathways and all 150 REMIND-EU runs come from the REMIND family.'],
  ['Do we update the 2023 limits?', 'Capture could go up to about 450 Mt; the land sink and hydrogen checks point down.'],
  ['Which land-sink assumption for 2050?', 'Passing pathways assume 310–360 Mt, UBA 414–500 Mt, against 261 Mt today and 183–233 Mt projected for 2030.'],
  ['How do we treat pathways that miss net zero?', 'Exclude them, including IPCC AR7, or show them as context?'],
  ['Do we need new EU modelling?', 'Starting from 2024 data, today’s land sink and the adopted 2040 target.'],
];

type View = 'screen' | 'sensitivity' | 'remind' | 'assumptions' | 'reference';
const MODES: { id: View; label: string; subtitle: string }[] = [
  { id: 'screen', label: 'Screen pathways', subtitle: '1,008 pathways, 10 pools' },
  { id: 'sensitivity', label: 'Test risk levels', subtitle: 'Sensitivity A–D, live' },
  { id: 'remind', label: 'Explore REMIND-EU', subtitle: '289-run ensemble' },
  { id: 'assumptions', label: 'Compare assumptions', subtitle: 'Pathways vs today' },
  { id: 'reference', label: 'Read reference data', subtitle: 'ESABCC · CMIP7 · UBA · EEA' },
];

const SCHEMA = {
  sd_view: codecs.string('screen'),
  sd_pool: codecs.csv([]),
  sd_period: codecs.string(''),
  sd_stage: codecs.number(0),
  sd_cmip: codecs.string(''),
  sd_q: codecs.string(''),
  sd_cap: codecs.number(ADVICE_RISK_LEVELS.capture),
  sd_bio: codecs.number(ADVICE_RISK_LEVELS.biomass),
  sd_land: codecs.number(ADVICE_RISK_LEVELS.landSink),
  sd_sort: codecs.string('stage'),
  sd_dir: codecs.string('desc'),
  sd_sel: codecs.string(''),
  sd_page: codecs.number(0),
  sd_rf: codecs.csv([]),
};

const PAGE = 50;

/* ── Shared deck-style building blocks ─────────────────────────────────── */

function SectionHead({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-xl font-bold leading-tight" style={{ color: DECK.teal }}>{title}</h2>
      {lead && <p className="mt-1 text-sm leading-relaxed" style={{ color: DECK.ink2 }}>{lead}</p>}
    </div>
  );
}

function Note({ children, accent = DECK.teal }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="px-4 py-3 text-sm leading-relaxed" style={{ background: DECK.tealXL, borderLeft: `6px solid ${accent}`, color: DECK.ink2 }}>
      {children}
    </div>
  );
}

function SourceLine({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[11px] leading-snug" style={{ color: DECK.muted }}>{children}</p>;
}

function StageChip({ stage }: { stage: number }) {
  const s = STAGES[stage];
  const dark = stage === 2 || stage === 4;
  return (
    <span
      className="inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ background: stage === 0 ? '#ececec' : s.colour, color: dark ? '#fff' : DECK.ink }}
      title={s.label}
    >
      {stage} · {s.short}
    </span>
  );
}

function Th({ children, onClick, active, dir, className = '' }: { children: React.ReactNode; onClick?: () => void; active?: boolean; dir?: string; className?: string }) {
  return (
    <th scope="col" className={`whitespace-nowrap px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide ${className}`} style={{ color: DECK.tealD }}>
      {onClick ? (
        <button type="button" onClick={onClick} className="mh-focus inline-flex items-center gap-1 hover:underline">
          {children}
          {active && <span aria-hidden>{dir === 'asc' ? '▲' : '▼'}</span>}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

const num = 'font-mono tabular-nums text-right';

/* ── Main view ─────────────────────────────────────────────────────────── */

export default function ScenarioDatabaseView() {
  const [s, update, reset] = useUrlState(SCHEMA);
  const view = (MODES.some(m => m.id === s.sd_view) ? s.sd_view : 'screen') as View;
  const risk: RiskLevels = { capture: s.sd_cap, biomass: s.sd_bio, landSink: s.sd_land };
  const workbookIssues = useMemo(() => checkAgainstWorkbook(), []);

  const totals = useMemo(() => {
    const st = PATHWAYS.map(p => stageUnder(p, risk));
    return STAGES.map(x => st.filter(v => v >= x.stage).length);
  }, [s.sd_cap, s.sd_bio, s.sd_land]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <header>
        <div className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: DECK.teal }}>
          Industry project · Scenario database · draft of 18 November 2026
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold leading-tight" style={{ color: DECK.ink }}>
          EU industry emission pathways in scenario databases: screening against the ESABCC criteria
        </h1>
        <p className="mt-2 max-w-4xl text-sm sm:text-base leading-relaxed" style={{ color: DECK.ink2 }}>
          1,008 EU industry pathways from 10 scenario pools, one single-model ensemble (REMIND-EU, 289 runs) and one
          national study (UBA 2026), screened step by step: net-zero GHG by 2050, an 85–95 % cut by 2040, the ESABCC
          feasibility filter and the ESABCC risk levels. Filter, test other risk levels and download the workbook.
        </p>
        <div className="mt-3 rounded-lg border border-accent-orange bg-surface-orange px-4 py-3 text-xs leading-relaxed text-tertiary-dark">
          <strong>AI-compiled — pending Secretariat verification.</strong> Data from the EEA scenario workbook prepared
          for the ESABCC Secretariat (draft for internal discussion). <strong>Internal use only: Scenario Compass data
          are under manuscript embargo.</strong> CMIP7 pathways report EU + UK; industry data in scenarios are CO₂ only
          (plus a small harmonised non-CO₂ add-on); the ESABCC filter is applied after the fact, not by the modellers.
        </div>
        {workbookIssues.length > 0 && (
          <div className="mt-3">
            <PartialState
              title="Screening logic no longer matches the workbook"
              summary={workbookIssues.join(' · ')}
              hint="Regenerate with python3 scripts/build-industry-scenario-screening.py and check src/lib/industry-scenario-screening/model.ts."
            />
          </div>
        )}
      </header>

      {/* Stat strip — the deck's funnel */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {STAGES.map((st, i) => (
          <button
            key={st.stage}
            type="button"
            onClick={() => update({ sd_view: 'screen', sd_stage: st.stage, sd_page: 0 })}
            className="mh-focus border border-grey-200 bg-grey-50 px-3 py-2 text-left transition-colors hover:bg-white"
            style={{ borderLeft: `6px solid ${st.stage === 0 ? DECK.teal : st.colour}` }}
            aria-pressed={view === 'screen' && s.sd_stage === st.stage}
          >
            <div className="font-mono text-2xl font-bold tabular-nums" style={{ color: DECK.ink }}>{fmt(totals[i])}</div>
            <div className="text-[11px] leading-snug" style={{ color: DECK.ink2 }}>{st.label}</div>
          </button>
        ))}
      </div>
      {(s.sd_cap !== ADVICE_RISK_LEVELS.capture || s.sd_bio !== ADVICE_RISK_LEVELS.biomass || s.sd_land !== ADVICE_RISK_LEVELS.landSink) && (
        <p className="-mt-4 text-xs" style={{ color: DECK.orange }}>
          Risk levels changed from the 2040 advice (capture {s.sd_cap} Mt, biomass {s.sd_bio} EJ, land sink {s.sd_land} Mt) —
          the last tile and every “risk levels” count follow your setting.{' '}
          <button type="button" className="mh-focus underline" onClick={() => update({ sd_cap: ADVICE_RISK_LEVELS.capture, sd_bio: ADVICE_RISK_LEVELS.biomass, sd_land: ADVICE_RISK_LEVELS.landSink })}>
            Reset to Table 6
          </button>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ModeSwitcher modes={MODES} value={view} onChange={id => update({ sd_view: id })} ariaLabel="Scenario database view" />
        <div className="flex items-center gap-3 text-xs">
          <a
            href={WORKBOOK_URL}
            download
            className="mh-focus rounded border border-grey-300 bg-white px-3 py-1.5 font-semibold text-primary hover:bg-surface-blue"
            title="Scenario database workbook (18 Nov 2026). Tabs: README (method), Pools, All_pathways (1,008), Sensitivity, REMIND_EU (289), Assumptions, ESABCC_2040, CMIP7_VeryLow, UBA_2026, Inventory."
          >
            ↓ Workbook (xlsx, 18 Nov 2026)
          </a>
          <button type="button" onClick={reset} className="mh-focus text-tertiary underline">Reset view</button>
        </div>
      </div>

      {view === 'screen' && <ScreenPanel s={s} update={update} risk={risk} />}
      {view === 'sensitivity' && <SensitivityPanel risk={risk} update={update} />}
      {view === 'remind' && <RemindPanel s={s} update={update} risk={risk} />}
      {view === 'assumptions' && <AssumptionsPanel />}
      {view === 'reference' && <ReferencePanel />}

      {/* Open questions */}
      <section className="border border-grey-200 bg-white p-4">
        <SectionHead title="Open questions" lead="For discussion with the Secretariat and the Board (from the deck)." />
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OPEN_QUESTIONS.map(([q, a], i) => (
            <li key={q} className="flex gap-3">
              <span className="font-mono text-2xl font-bold tabular-nums" style={{ color: DECK.teal }}>{i + 1}</span>
              <div>
                <div className="text-sm font-semibold" style={{ color: DECK.ink }}>{q}</div>
                <div className="text-xs leading-relaxed" style={{ color: DECK.ink2 }}>{a}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Caveats & sources */}
      <section className="border border-grey-200 bg-grey-50 p-4 text-xs leading-relaxed text-tertiary">
        <h2 className="mb-2 text-sm font-bold text-tertiary-dark">Caveats &amp; sources</h2>
        <details className="mb-3">
          <summary className="mh-focus cursor-pointer font-semibold text-tertiary-dark">Method (workbook README)</summary>
          <div className="mt-2 space-y-1.5">
            {README.filter((l): l is string => !!l).map((l, i) => (
              <p key={i} className={/^[A-Z]+$/.test(l) ? 'pt-2 font-semibold text-tertiary-dark' : ''}>{l}</p>
            ))}
          </div>
        </details>
        <ul className="space-y-1">
          {SOURCES.map(src => (
            <li key={src.label}>
              <a href={src.url} target="_blank" rel="noopener noreferrer" className="mh-focus text-primary hover:underline">
                {src.label} ↗
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3">
          Data regenerate from the workbook with <code>python3 scripts/build-industry-scenario-screening.py</code>, which
          recomputes the Pools and Sensitivity sheets and refuses to write if any count differs.
        </p>
      </section>
    </div>
  );
}

type UrlS = ReturnType<typeof useUrlState<typeof SCHEMA>>[0];
type Update = ReturnType<typeof useUrlState<typeof SCHEMA>>[1];

/* ── Screen pathways ───────────────────────────────────────────────────── */

const POOL_NAMES = POOLS.filter(p => !p.separate).map(p => p.pool);

type SortKey = 'stage' | 'pool' | 'model' | 'scenario' | 'year' | 'red2040' | 'i2030' | 'i2040' | 'i2050' | 'cap' | 'bio' | 'land';
const SORTERS: Record<SortKey, (p: Pathway) => string | number | null> = {
  stage: p => p.stage,
  pool: p => p.pool,
  model: p => p.model,
  scenario: p => p.scenario,
  year: p => p.publicationYear,
  red2040: p => p.red2040,
  i2030: p => p.ind[2030],
  i2040: p => p.ind[2040],
  i2050: p => p.ind[2050],
  cap: p => p.cap2050,
  bio: p => p.bio2050EJ,
  land: p => p.landSink2050,
};

function ScreenPanel({ s, update, risk }: { s: UrlS; update: Update; risk: RiskLevels }) {
  const stageOf = useMemo(() => new Map(PATHWAYS.map(p => [p.id, stageUnder(p, risk)])), [risk.capture, risk.biomass, risk.landSink]);

  // Base set: pool / period / CMIP7 / search. The stage filter is applied on
  // top so the funnel can count every stage within the base set.
  const base = useMemo(() => {
    const q = s.sd_q.trim().toLowerCase();
    return PATHWAYS.filter(p => {
      if (s.sd_pool.length && !s.sd_pool.includes(p.pool)) return false;
      if (s.sd_period && p.period !== s.sd_period) return false;
      if (s.sd_cmip === 'only' && !p.isCmip7) return false;
      if (s.sd_cmip === 'exclude' && p.isCmip7) return false;
      if (q && !`${p.model} ${p.scenario} ${p.pool}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [s.sd_pool, s.sd_period, s.sd_cmip, s.sd_q]);

  const funnel = STAGES.map(st => base.filter(p => stageOf.get(p.id)! >= st.stage).length);
  const cmipInBase = base.filter(p => p.isCmip7).length;
  const shown = base.filter(p => stageOf.get(p.id)! >= s.sd_stage);

  const sortKey = (s.sd_sort in SORTERS ? s.sd_sort : 'stage') as SortKey;
  const sorted = useMemo(() => {
    const f = SORTERS[sortKey];
    const dir = s.sd_dir === 'asc' ? 1 : -1;
    return [...shown].sort((a, b) => {
      const va = sortKey === 'stage' ? stageOf.get(a.id)! : f(a);
      const vb = sortKey === 'stage' ? stageOf.get(b.id)! : f(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir || (a.red2040 ?? 0) - (b.red2040 ?? 0);
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [shown, sortKey, s.sd_dir, stageOf]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const page = Math.min(s.sd_page, pages - 1);
  const rows = sorted.slice(page * PAGE, page * PAGE + PAGE);

  const lines: ChartLine[] = useMemo(() => {
    const shownIds = new Set(shown.map(p => p.id));
    return base.map(p => {
      const st = stageOf.get(p.id)!;
      const active = shownIds.has(p.id);
      return {
        id: p.id,
        label: `${p.model} — ${p.scenario}`,
        sublabel: `${p.pool}, ${p.publicationYear} · stage ${st}: ${STAGES[st].label}`,
        points: ([2020, 2030, 2040, 2050] as const).map(y => [y, p.ind[y]] as [number, number]),
        colour: p.isCmip7 && st === 0 ? DECK.orange : st === 0 ? DECK.pathway : STAGES[st].colour,
        muted: !active,
      };
    });
  }, [base, shown, stageOf]);

  function sortBy(k: SortKey) {
    update({ sd_sort: k, sd_dir: s.sd_sort === k && s.sd_dir === 'desc' ? 'asc' : 'desc', sd_page: 0 });
  }

  function downloadCsv() {
    const head = ['pool', 'model', 'scenario', 'publication_year', 'stage', 'red2040_pct', 'ind2020', 'ind2030', 'ind2040', 'ind2050', 'cap2050', 'bio2050_EJ', 'land_sink2050', 'filter_exclusions'];
    const esc = (v: unknown) => {
      const t = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v);
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const body = sorted.map(p =>
      [p.pool, p.model, p.scenario, p.publicationYear, stageOf.get(p.id), p.red2040, p.ind[2020], p.ind[2030], p.ind[2040], p.ind[2050], p.cap2050, p.bio2050EJ, p.landSink2050, p.filterExclusions].map(esc).join(','),
    );
    const blob = new Blob([[head.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'industry-scenario-pathways-filtered.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const selected = PATHWAYS.find(p => p.id === s.sd_sel) ?? null;
  const filtersActive = s.sd_pool.length > 0 || !!s.sd_period || !!s.sd_cmip || !!s.sd_q;

  return (
    <section className="space-y-4">
      <SectionHead
        title={`Screening of ${fmt(base.length)} pathways`}
        lead="EU industry emissions (energy and processes), Mt CO₂e per year: inventory, past trend, Member States’ projections and every scenario pathway, harmonised to the 2020 inventory. Pick a stage to grey out the pathways that drop out."
      />

      {/* Filters */}
      <div className="space-y-2 border border-grey-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-[11px] font-semibold uppercase tracking-wide text-tertiary">Pool</span>
          {POOL_NAMES.map(pool => {
            const on = s.sd_pool.includes(pool);
            return (
              <FilterPill
                key={pool}
                label={pool}
                active={on}
                count={PATHWAYS.filter(p => p.pool === pool).length}
                onClick={() => update({ sd_pool: on ? s.sd_pool.filter(x => x !== pool) : [...s.sd_pool, pool], sd_page: 0 })}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-20 text-[11px] font-semibold uppercase tracking-wide text-tertiary">Published</span>
          {['up to 2024', '2025–2026'].map(per => (
            <FilterPill
              key={per}
              label={per}
              active={s.sd_period === per}
              count={PATHWAYS.filter(p => p.period === per).length}
              onClick={() => update({ sd_period: s.sd_period === per ? '' : per, sd_page: 0 })}
            />
          ))}
          <span className="ml-4 text-[11px] font-semibold uppercase tracking-wide text-tertiary">IPCC AR7 (CMIP7)</span>
          <FilterPill label="Only CMIP7" active={s.sd_cmip === 'only'} onClick={() => update({ sd_cmip: s.sd_cmip === 'only' ? '' : 'only', sd_page: 0 })} />
          <FilterPill label="Exclude CMIP7" active={s.sd_cmip === 'exclude'} onClick={() => update({ sd_cmip: s.sd_cmip === 'exclude' ? '' : 'exclude', sd_page: 0 })} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="sd-q" className="w-20 text-[11px] font-semibold uppercase tracking-wide text-tertiary">Search</label>
          <input
            id="sd-q"
            value={s.sd_q}
            onChange={e => update({ sd_q: e.target.value, sd_page: 0 })}
            placeholder="Model or scenario, e.g. REMIND, Low demand, NetZero"
            className="mh-focus w-full max-w-md rounded border border-grey-300 px-2 py-1 text-sm"
          />
          {filtersActive && (
            <button type="button" className="mh-focus text-xs text-tertiary underline" onClick={() => update({ sd_pool: [], sd_period: '', sd_cmip: '', sd_q: '', sd_page: 0 })}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="border border-grey-200 bg-white p-3">
          {base.length === 0 ? (
            <EmptyState title="No pathways match these filters" body="Clear a pool, period or search term to bring pathways back." />
          ) : (
            <>
              <PathwayChart
                lines={lines}
                selectedId={s.sd_sel || null}
                onSelect={id => update({ sd_sel: id ?? '' })}
                ariaLabel={`EU industry emissions with ${shown.length} of ${base.length} pathways highlighted`}
              />
              <ChartLegend
                items={[
                  { label: 'Inventory (EEA 2026)', colour: DECK.teal, kind: 'bar' },
                  { label: 'Past trend (regression 2005–2024)', colour: DECK.muted, kind: 'dot' },
                  { label: 'Member States WEM', colour: DECK.tealD },
                  { label: 'Member States WAM', colour: DECK.red, kind: 'dash' },
                  { label: 'Scenario pathways', colour: DECK.pathway },
                  { label: 'IPCC AR7 (CMIP7)', colour: DECK.orange },
                ]}
              />
            </>
          )}
        </div>

        {/* Funnel panel, as on the deck's screening slide */}
        <div className="flex flex-col gap-1.5">
          {STAGES.map((st, i) => {
            const cur = s.sd_stage === st.stage;
            const reached = s.sd_stage >= st.stage;
            return (
              <div key={st.stage}>
                <button
                  type="button"
                  onClick={() => update({ sd_stage: st.stage, sd_page: 0 })}
                  aria-pressed={cur}
                  className="mh-focus flex w-full items-center gap-3 px-3 py-2 text-left transition-opacity"
                  style={{
                    background: cur ? (st.stage === 0 ? DECK.teal : st.colour) : DECK.tealXL,
                    color: cur && st.stage !== 1 && st.stage !== 3 ? '#fff' : DECK.ink,
                    opacity: reached ? 1 : 0.45,
                  }}
                >
                  <span className="w-[4.5rem] shrink-0 text-right font-mono text-2xl font-bold tabular-nums">{fmt(funnel[i])}</span>
                  <span className="text-xs leading-snug">{st.label}</span>
                </button>
                {st.stage === 0 && cmipInBase > 0 && (
                  <div className="mt-1.5 flex items-center gap-3 px-3 py-1.5" style={{ background: DECK.tealXL }}>
                    <span className="w-[4.5rem] shrink-0 text-right font-mono text-lg font-bold tabular-nums" style={{ color: DECK.orange }}>{cmipInBase}</span>
                    <span className="text-[11px] leading-snug" style={{ color: DECK.ink2 }}>
                      of which IPCC AR7 (CMIP7, 2026): {base.some(p => p.isCmip7 && p.netZero2050) ? 'some reach' : 'none reaches'} EU net zero
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          <p className="mt-1 text-[11px] leading-snug" style={{ color: DECK.muted }}>
            Risk levels: capture ≤ {risk.capture} Mt, biomass ≤ {risk.biomass} EJ, land sink ≤ {risk.landSink} Mt (2050). Change
            them under “Test risk levels”.
          </p>
        </div>
      </div>

      {selected && <PathwayDetail p={selected} stage={stageOf.get(selected.id)!} onClose={() => update({ sd_sel: '' })} />}

      {/* Table */}
      <div className="border border-grey-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-grey-200 px-3 py-2 text-xs text-tertiary">
          <span>
            <strong className="font-mono tabular-nums text-tertiary-dark">{fmt(shown.length)}</strong> pathways at stage ≥ {s.sd_stage} ({STAGES[s.sd_stage].short})
          </span>
          <button type="button" onClick={downloadCsv} disabled={!shown.length} className="mh-focus rounded border border-grey-300 px-2 py-1 font-semibold text-primary hover:bg-surface-blue disabled:opacity-40">
            ↓ CSV of this selection
          </button>
        </div>
        {shown.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No pathway reaches this stage" body="Lower the stage, widen the filters or relax the risk levels." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead style={{ background: DECK.tealXL }}>
                <tr>
                  <Th onClick={() => sortBy('stage')} active={sortKey === 'stage'} dir={s.sd_dir}>Stage</Th>
                  <Th onClick={() => sortBy('pool')} active={sortKey === 'pool'} dir={s.sd_dir}>Pool</Th>
                  <Th onClick={() => sortBy('model')} active={sortKey === 'model'} dir={s.sd_dir}>Model</Th>
                  <Th onClick={() => sortBy('scenario')} active={sortKey === 'scenario'} dir={s.sd_dir}>Scenario</Th>
                  <Th onClick={() => sortBy('year')} active={sortKey === 'year'} dir={s.sd_dir}>Year</Th>
                  <Th onClick={() => sortBy('red2040')} active={sortKey === 'red2040'} dir={s.sd_dir}>Net GHG cut 2040 %</Th>
                  <Th onClick={() => sortBy('i2030')} active={sortKey === 'i2030'} dir={s.sd_dir}>Ind. 2030</Th>
                  <Th onClick={() => sortBy('i2040')} active={sortKey === 'i2040'} dir={s.sd_dir}>Ind. 2040</Th>
                  <Th onClick={() => sortBy('i2050')} active={sortKey === 'i2050'} dir={s.sd_dir}>Ind. 2050</Th>
                  <Th onClick={() => sortBy('cap')} active={sortKey === 'cap'} dir={s.sd_dir}>Capture 2050 Mt</Th>
                  <Th onClick={() => sortBy('bio')} active={sortKey === 'bio'} dir={s.sd_dir}>Biomass 2050 EJ</Th>
                  <Th onClick={() => sortBy('land')} active={sortKey === 'land'} dir={s.sd_dir}>Land sink 2050 Mt</Th>
                  <Th>Filter exclusions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(p => {
                  const st = stageOf.get(p.id)!;
                  const sel = p.id === s.sd_sel;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => update({ sd_sel: sel ? '' : p.id })}
                      className="cursor-pointer border-t border-grey-100 hover:bg-grey-50"
                      style={sel ? { background: DECK.tealXL } : undefined}
                    >
                      <td className="px-2 py-1.5"><StageChip stage={st} /></td>
                      <td className="px-2 py-1.5 whitespace-nowrap" style={p.isCmip7 ? { color: DECK.orange } : undefined}>{p.pool}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{p.model}</td>
                      <td className="px-2 py-1.5 max-w-[280px] truncate" title={p.scenario}>{p.scenario}</td>
                      <td className={`px-2 py-1.5 ${num}`}>{p.publicationYear}</td>
                      <td className={`px-2 py-1.5 ${num}`}>{fmt(p.red2040, 1)}</td>
                      <td className={`px-2 py-1.5 ${num}`}>{fmt(p.ind[2030])}</td>
                      <td className={`px-2 py-1.5 ${num}`}>{fmt(p.ind[2040])}</td>
                      <td className={`px-2 py-1.5 ${num}`}>{fmt(p.ind[2050])}</td>
                      <td className={`px-2 py-1.5 ${num}`} style={p.cap2050 != null && p.cap2050 > risk.capture ? { color: DECK.red, fontWeight: 600 } : undefined}>{fmt(p.cap2050)}</td>
                      <td className={`px-2 py-1.5 ${num}`} style={p.bio2050EJ != null && p.bio2050EJ > risk.biomass ? { color: DECK.red, fontWeight: 600 } : undefined}>{fmt(p.bio2050EJ, 1)}</td>
                      <td className={`px-2 py-1.5 ${num}`} style={p.landSink2050 != null && p.landSink2050 > risk.landSink ? { color: DECK.red, fontWeight: 600 } : undefined}>{fmt(p.landSink2050)}</td>
                      <td className="px-2 py-1.5 text-[11px] text-tertiary">{p.filterExclusions?.join('; ') || (p.filterPass ? '—' : '')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-grey-200 px-3 py-2 text-xs">
            <button type="button" className="mh-focus rounded border border-grey-300 px-2 py-0.5 disabled:opacity-40" disabled={page === 0} onClick={() => update({ sd_page: page - 1 })}>‹ Prev</button>
            <span className="font-mono tabular-nums text-tertiary">{page + 1} / {pages}</span>
            <button type="button" className="mh-focus rounded border border-grey-300 px-2 py-0.5 disabled:opacity-40" disabled={page >= pages - 1} onClick={() => update({ sd_page: page + 1 })}>Next ›</button>
          </div>
        )}
      </div>
      <SourceLine>
        Inventory: EEA (2026), CRF 1.A.2 excl. 1.A.2.g.iii, g.v, g.vii + 2.A–2.C + 2.E + 2.H. Past trend: least-squares regression
        2005–2024. WEM/WAM: Member States’ projections, EEA (2026). Pathways: Emissions|CO₂|Energy|Demand|Industry + Industrial
        Processes (EU27; EU27+UK where only that exists), ratio-scaled to the 2020 inventory CO₂ (593.2 Mt) plus a non-CO₂ add-on
        (EC 2040 impact-assessment trajectory). 2040 cut on the Board’s harmonised metric for ESABCC runs, otherwise scaled to the
        2015 inventory. Filter: 2040 advice, Table 5; risk levels: Table 6. Values above the current risk level are shown in red.
      </SourceLine>
    </section>
  );
}

function PathwayDetail({ p, stage, onClose }: { p: Pathway; stage: number; onClose: () => void }) {
  const items: [string, string][] = [
    ['Pool', p.pool],
    ['Published', `${p.publicationYear} (${p.period})`],
    ['Net zero 2050', p.netZero2050 ? 'yes' : 'no'],
    ['Net GHG cut 2040 vs 1990', p.red2040 == null ? '—' : `${fmt(p.red2040, 1)} %`],
    ['EU CO₂ captured 2050', p.cap2050 == null ? '—' : `${fmt(p.cap2050, 1)} Mt`],
    ['EU primary biomass 2050', p.bio2050EJ == null ? '—' : `${fmt(p.bio2050EJ, 2)} EJ`],
    ['Net land sink 2050', p.landSink2050 == null ? '—' : `${fmt(p.landSink2050, 1)} Mt`],
    ['Global CO₂ storage 2050', p.globalCcs2050 == null ? '—' : `${fmt(p.globalCcs2050)} Mt`],
    ['Global bioenergy 2050', p.globalBio2050 == null ? '—' : `${fmt(p.globalBio2050, 1)} EJ`],
    ['Electrolytic H₂ 2030', p.h2_2030EJ == null ? '—' : `${fmt(p.h2_2030EJ, 2)} EJ`],
    ['Final energy decline 2020–30', p.feDecline2020_30 == null ? '—' : `${fmt(p.feDecline2020_30, 1)} %`],
    ['Filter exclusions', p.filterExclusions?.join('; ') || '—'],
  ];
  if (p.esabccAdviceSet != null) items.push(['Basis of the 2040 advice', p.esabccAdviceSet ? 'yes' : 'no']);
  return (
    <div className="border border-grey-200 bg-white p-4" style={{ borderLeft: `6px solid ${STAGES[stage].colour}` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: DECK.teal }}>{p.model}</div>
          <div className="text-base font-bold" style={{ color: DECK.ink }}>{p.scenario}</div>
          <div className="mt-1"><StageChip stage={stage} /></div>
        </div>
        <button type="button" onClick={onClose} className="mh-focus text-xs text-tertiary underline">Close</button>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-grey-100 py-1">
            <dt className="text-tertiary">{k}</dt>
            <dd className="text-right font-mono tabular-nums text-tertiary-dark">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-tertiary">
        Industry emissions (harmonised, Mt CO₂e):{' '}
        <span className="font-mono tabular-nums">2020 {fmt(p.ind[2020])} · 2030 {fmt(p.ind[2030])} · 2040 {fmt(p.ind[2040])} · 2050 {fmt(p.ind[2050])}</span>
      </p>
    </div>
  );
}

/* ── Test risk levels ──────────────────────────────────────────────────── */

function Slider({ label, unit, value, min, max, step, advice, onChange }: { label: string; unit: string; value: number; min: number; max: number; step: number; advice: number; onChange: (v: number) => void }) {
  const id = `sd-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-xs font-semibold" style={{ color: DECK.ink }}>{label}</label>
        <span className="font-mono text-lg font-bold tabular-nums" style={{ color: DECK.tealD }}>{value} <small className="text-xs font-normal">{unit}</small></span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="mh-focus w-full" style={{ accentColor: DECK.teal }} />
      <div className="flex justify-between text-[10px]" style={{ color: DECK.muted }}>
        <span>{min}</span>
        <span>2040 advice: {advice}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function SensitivityPanel({ risk, update }: { risk: RiskLevels; update: Update }) {
  const candidates = PATHWAYS.filter(p => passesWithRisk(p, null));
  const remindCandidates = REMIND_RUNS.filter(r => remindPassesWithRisk(r, null));
  const mm = candidates.filter(p => passesWithRisk(p, risk)).length;
  const re = remindCandidates.filter(r => remindPassesWithRisk(r, risk)).length;
  const presetActive = (v: (typeof SENSITIVITY)[number]) =>
    v.captureLimit === risk.capture && v.biomassLimitEJ === risk.biomass && v.landSinkLimit === risk.landSink;

  const ok = (v: number | null, lim: number) => (v == null ? <span className="text-tertiary">blank ✗</span> : v <= lim ? <span style={{ color: DECK.tealD }}>✓</span> : <span style={{ color: DECK.red, fontWeight: 700 }}>✗</span>);

  return (
    <section className="space-y-4">
      <SectionHead
        title="Sensitivity of the screening to the risk levels"
        lead="Pathways with net zero by 2050 and an 85–95 % cut by 2040 that pass the ESABCC filter, and how many remain under each set of risk levels. Move the sliders or pick a variant from the workbook."
      />
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4 border border-grey-200 bg-white p-4">
          <Slider label="EU CO₂ capture 2050" unit="Mt" value={risk.capture} min={200} max={800} step={5} advice={ADVICE_RISK_LEVELS.capture} onChange={v => update({ sd_cap: v })} />
          <Slider label="EU primary biomass 2050" unit="EJ" value={risk.biomass} min={4} max={20} step={0.5} advice={ADVICE_RISK_LEVELS.biomass} onChange={v => update({ sd_bio: v })} />
          <Slider label="Net land sink 2050" unit="Mt" value={risk.landSink} min={100} max={600} step={5} advice={ADVICE_RISK_LEVELS.landSink} onChange={v => update({ sd_land: v })} />
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="px-3 py-2" style={{ background: DECK.tealXL }}>
              <div className="font-mono text-3xl font-bold tabular-nums" style={{ color: mm === 0 ? DECK.red : DECK.tealD }}>{mm}</div>
              <div className="text-[11px]" style={{ color: DECK.ink2 }}>of {candidates.length} multi-model pathways remain</div>
            </div>
            <div className="px-3 py-2" style={{ background: DECK.tealXL }}>
              <div className="font-mono text-3xl font-bold tabular-nums" style={{ color: re === 0 ? DECK.red : '#6a4fb0' }}>{re}</div>
              <div className="text-[11px]" style={{ color: DECK.ink2 }}>of {remindCandidates.length} REMIND-EU runs remain</div>
            </div>
          </div>
        </div>

        <div className="border border-grey-200 bg-white">
          <table className="w-full text-xs">
            <thead style={{ background: DECK.tealXL }}>
              <tr>
                <Th>Variant (sheet Sensitivity)</Th>
                <Th className="text-right">Capture</Th>
                <Th className="text-right">Biomass EJ</Th>
                <Th className="text-right">Land sink</Th>
                <Th className="text-right">Multi-model</Th>
                <Th className="text-right">REMIND-EU</Th>
                <Th>{' '}</Th>
              </tr>
            </thead>
            <tbody>
              {SENSITIVITY.map(v => (
                <tr key={v.variant} className="border-t border-grey-100" style={presetActive(v) ? { background: DECK.tealXL } : undefined}>
                  <td className="px-2 py-2">{v.variant}</td>
                  <td className={`px-2 py-2 ${num}`}>{fmt(v.captureLimit)}</td>
                  <td className={`px-2 py-2 ${num}`}>{fmt(v.biomassLimitEJ)}</td>
                  <td className={`px-2 py-2 ${num}`}>{fmt(v.landSinkLimit)}</td>
                  <td className={`px-2 py-2 ${num} text-base font-bold`} style={{ color: v.multiModelRemaining <= 1 ? DECK.red : DECK.tealD }}>{v.multiModelRemaining}</td>
                  <td className={`px-2 py-2 ${num} text-base font-bold`} style={{ color: v.remindEuRemaining === 0 ? DECK.red : '#6a4fb0' }}>{v.remindEuRemaining}</td>
                  <td className="px-2 py-2 text-right">
                    {v.captureLimit != null && (
                      <button type="button" className="mh-focus rounded border border-grey-300 px-2 py-0.5 text-[11px] hover:bg-surface-blue" onClick={() => update({ sd_cap: v.captureLimit!, sd_bio: v.biomassLimitEJ!, sd_land: v.landSinkLimit! })}>
                        Apply
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-2 p-3">
            <Note accent={DECK.orange}><strong>Capture 500 Mt: no additional pathway.</strong> No excluded pathway is held back by capture alone.</Note>
            <Note accent="#6a4fb0"><strong>Biomass 12 EJ: +8 pathways.</strong> Both JRC pathways and 6 ESABCC REMIND 3.2 runs.</Note>
            <Note accent={DECK.red}><strong>Land sink 310 Mt: 1 pathway remains</strong> (NGFS Low demand, 105 Mt sink). UBA 2026 pathways assume 414–500 Mt; all REMIND-EU runs assume 360 Mt.</Note>
          </div>
        </div>
      </div>

      <div className="border border-grey-200 bg-white">
        <div className="border-b border-grey-200 px-3 py-2 text-xs text-tertiary">
          The {candidates.length} pathways that pass the ESABCC filter, checked against the current risk levels — which limit binds.
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead style={{ background: DECK.tealXL }}>
              <tr>
                <Th>Pool</Th><Th>Model</Th><Th>Scenario</Th>
                <Th className="text-right">Cut 2040 %</Th>
                <Th className="text-right">Capture</Th><Th>≤ {risk.capture}</Th>
                <Th className="text-right">Biomass</Th><Th>≤ {risk.biomass}</Th>
                <Th className="text-right">Land sink</Th><Th>≤ {risk.landSink}</Th>
                <Th>Remains</Th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(p => {
                const pass = passesWithRisk(p, risk);
                return (
                  <tr key={p.id} className="border-t border-grey-100">
                    <td className="px-2 py-1.5 whitespace-nowrap">{p.pool}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{p.model}</td>
                    <td className="px-2 py-1.5">{p.scenario}</td>
                    <td className={`px-2 py-1.5 ${num}`}>{fmt(p.red2040, 1)}</td>
                    <td className={`px-2 py-1.5 ${num}`}>{fmt(p.cap2050)}</td><td className="px-2 py-1.5">{ok(p.cap2050, risk.capture)}</td>
                    <td className={`px-2 py-1.5 ${num}`}>{fmt(p.bio2050EJ, 2)}</td><td className="px-2 py-1.5">{ok(p.bio2050EJ, risk.biomass)}</td>
                    <td className={`px-2 py-1.5 ${num}`}>{fmt(p.landSink2050)}</td><td className="px-2 py-1.5">{ok(p.landSink2050, risk.landSink)}</td>
                    <td className="px-2 py-1.5 font-semibold" style={{ color: pass ? DECK.tealD : DECK.red }}>{pass ? 'yes' : 'no'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <SourceLine>
        {SENSITIVITY_NOTE} A: CO₂ capture 425 Mt, biomass 9 EJ, land sink 400 Mt (ESABCC 2040 advice, Table 6). B: capture 500 Mt.
        C: B plus biomass 12 EJ. D: A with land sink 310 Mt (the 2030 LULUCF target). As in the workbook’s COUNTIFS, a blank value
        does not satisfy a limit.
      </SourceLine>
    </section>
  );
}

/* ── Explore REMIND-EU ─────────────────────────────────────────────────── */

const FACTORS = [
  ['factor_target2050', '2050 target'],
  ['factor_target2030', '2030 target'],
  ['factor_efficiency', 'Efficiency'],
  ['factor_biomass_limit', 'Biomass limit'],
  ['factor_tech_limit', 'Technology limit'],
] as const;

const REMIND_CARDS: { col: keyof RemindRun; label: string; unit: string; digits?: number; context?: string }[] = [
  { col: 'fe_ind_change_2020_40_pct', label: 'industry final energy 2020–2040', unit: '%' },
  { col: 'el_share_2040_pct', label: 'electricity share of industry energy 2040', unit: '%', context: '22 % in 2020' },
  { col: 'fossil_share_2040_pct', label: 'fossil fuel share 2040', unit: '%', context: '62 % in 2020' },
  { col: 'h2_share_2040_pct', label: 'hydrogen share 2040', unit: '%' },
  { col: 'steel_h2_share_2040_pct', label: 'hydrogen share of steel energy 2040', unit: '%' },
  { col: 'ind_ccs_2040', label: 'industry CO₂ captured 2040', unit: 'Mt' },
  { col: 'ind_ccs_2050', label: 'industry CO₂ captured 2050', unit: 'Mt' },
  { col: 'process_co2_2040', label: 'process CO₂ 2040', unit: 'Mt', context: '96 Mt in 2020' },
  { col: 'cp2040_EUR', label: 'carbon price 2040', unit: '€/t' },
  { col: 'cp2050_EUR', label: 'carbon price 2050', unit: '€/t' },
  { col: 'beccs2050', label: 'BECCS 2050 (negative = removal)', unit: 'Mt' },
  { col: 'daccs2050', label: 'direct air capture 2050 (negative = removal)', unit: 'Mt' },
];

function RemindPanel({ s, update, risk }: { s: UrlS; update: Update; risk: RiskLevels }) {
  // sd_rf holds "column=value" pairs.
  const active = new Map<string, Set<string>>();
  for (const pair of s.sd_rf) {
    const [k, v] = pair.split('=');
    if (!active.has(k)) active.set(k, new Set());
    active.get(k)!.add(v);
  }
  const [minStage, setMinStage] = useState(4);

  const base = REMIND_RUNS.filter(r => FACTORS.every(([k]) => !active.has(k) || active.get(k)!.has(String(r[k]))));
  const stageOf = new Map(base.map(r => [r.id, remindStage(r, risk)]));
  const funnel = STAGES.map(st => base.filter(r => stageOf.get(r.id)! >= st.stage).length);
  const shown = base.filter(r => stageOf.get(r.id)! >= minStage);

  function toggle(k: string, v: string) {
    const key = `${k}=${v}`;
    update({ sd_rf: s.sd_rf.includes(key) ? s.sd_rf.filter(x => x !== key) : [...s.sd_rf, key] });
  }

  const lines: ChartLine[] = base.map(r => ({
    id: r.id,
    label: String(r.scenario),
    sublabel: `stage ${stageOf.get(r.id)}: ${STAGES[stageOf.get(r.id)!].label}`,
    points: [
      [2020, r.ind2020_harmonised as number],
      [2030, r.ind2030_harmonised as number],
      [2040, r.ind2040_harmonised as number],
      [2050, r.ind2050_harmonised as number],
    ],
    colour: '#a493cf',
    muted: stageOf.get(r.id)! < minStage,
  }));

  return (
    <section className="space-y-4">
      <SectionHead
        title="REMIND-EU ensemble (Rodrigues et al. 2026): industry results"
        lead={`${fmt(shown.length)} of ${base.length} runs at stage ≥ ${minStage} (${STAGES[minStage].short}). Ranges are min – median – max across those runs.`}
      />
      <div className="space-y-2 border border-grey-200 bg-white p-3">
        {FACTORS.map(([k, label]) => {
          const values = Array.from(new Set(REMIND_RUNS.map(r => String(r[k])))).sort();
          return (
            <div key={k} className="flex flex-wrap items-center gap-2">
              <span className="w-28 text-[11px] font-semibold uppercase tracking-wide text-tertiary">{label}</span>
              {values.map(v => (
                <FilterPill key={v} label={v} active={active.get(k)?.has(v) ?? false} count={REMIND_RUNS.filter(r => String(r[k]) === v).length} onClick={() => toggle(k, v)} />
              ))}
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="border border-grey-200 bg-white p-3">
          {base.length === 0 ? (
            <EmptyState title="No REMIND-EU run matches these factors" body="Clear a factor to bring runs back." />
          ) : (
            <>
              <PathwayChart lines={lines} median ariaLabel={`REMIND-EU industry emissions, ${shown.length} runs highlighted with median`} />
              <ChartLegend items={[
                { label: 'Inventory (EEA 2026)', colour: DECK.teal, kind: 'bar' },
                { label: 'Past trend', colour: DECK.muted, kind: 'dot' },
                { label: 'WEM', colour: DECK.tealD },
                { label: 'WAM', colour: DECK.red, kind: 'dash' },
                { label: 'REMIND-EU runs', colour: '#a493cf' },
                { label: 'Median of highlighted runs', colour: DECK.tealD },
              ]} />
            </>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          {STAGES.map((st, i) => (
            <button
              key={st.stage}
              type="button"
              onClick={() => setMinStage(st.stage)}
              aria-pressed={minStage === st.stage}
              className="mh-focus flex w-full items-center gap-3 px-3 py-2 text-left"
              style={{ background: minStage === st.stage ? (st.stage === 0 ? DECK.teal : st.colour) : DECK.tealXL, color: minStage === st.stage && st.stage !== 1 && st.stage !== 3 ? '#fff' : DECK.ink }}
            >
              <span className="w-[4.5rem] shrink-0 text-right font-mono text-2xl font-bold tabular-nums">{funnel[i]}</span>
              <span className="text-xs leading-snug">{st.stage === 0 ? 'Runs in the ensemble' : st.label}</span>
            </button>
          ))}
          <Note accent={DECK.red}>
            <strong>Caution:</strong> all 289 runs assume the same net land sink of 360 Mt CO₂ in 2050, above the 2030 LULUCF
            target (310 Mt) and the 2024 inventory (261 Mt).
          </Note>
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState title="No run reaches this stage" body="Pick a lower stage or relax the risk levels." />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {REMIND_CARDS.map(c => {
            const q = quantiles(shown.map(r => r[c.col] as number).filter(v => typeof v === 'number'));
            return (
              <div key={c.col} className="px-4 py-3" style={{ background: DECK.tealXL, borderLeft: '6px solid #6a4fb0' }}>
                <div className="font-mono text-xl font-bold tabular-nums leading-tight" style={{ color: '#3b2468' }}>
                  {q ? `${fmt(q.min)} to ${fmt(q.max)}` : '—'} <small className="text-xs font-normal">{c.unit}</small>
                </div>
                <div className="text-xs" style={{ color: DECK.ink2 }}>{c.label}</div>
                <div className="mt-0.5 text-[11px] font-mono tabular-nums" style={{ color: DECK.muted }}>
                  median {q ? fmt(q.median, 1) : '—'}{c.context ? ` · ${c.context}` : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <SourceLine>
        Rodrigues et al. (2026), Nature Communications 17:3417, data Zenodo 10.5281/zenodo.18661988, region EU27, harmonised set.
        One model (REMIND-EU, PIK); modelling from 2023 (submitted August 2023), published 2026. Industry emissions scaled to the 2020
        inventory. Energy shares from FE|Industry variables; carbon price US$2017 converted at 1.13 US$/€. Shares in 2020 as stated
        on the deck slide.
      </SourceLine>
    </section>
  );
}

/* ── Compare assumptions ───────────────────────────────────────────────── */

function AssumptionsPanel() {
  const groups: { indicator: string; unit: string; today: string | null; rows: (typeof ASSUMPTIONS)[number][] }[] = [];
  for (const a of ASSUMPTIONS) {
    let g = groups.find(x => x.indicator === a.indicator);
    if (!g) groups.push((g = { indicator: a.indicator, unit: a.unit, today: a.today, rows: [] }));
    g.rows.push(a);
  }
  return (
    <section className="space-y-4">
      <SectionHead
        title="Assumptions of the pathways that pass the filter, compared with current values"
        lead="Ranges across the pathways that reach net zero, cut 85–95 % by 2040 and pass the ESABCC filter (number of pathways in brackets)."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map(g => {
          const vals = g.rows.flatMap(r => [r.min, r.max, r.median]).filter((v): v is number => typeof v === 'number');
          const lo = Math.min(0, ...vals);
          const hi = Math.max(...vals) * 1.05 || 1;
          const pos = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
          return (
            <div key={g.indicator} className="border border-grey-200 bg-white p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold" style={{ color: DECK.tealD }}>{g.indicator}</h3>
                <span className="text-[11px]" style={{ color: DECK.muted }}>{g.unit}</span>
              </div>
              {g.today && <div className="mt-1 text-xs" style={{ color: DECK.orange }}>Today: {g.today}</div>}
              <div className="mt-3 space-y-2">
                {g.rows.map(r => {
                  const min = r.min as number | null;
                  const max = (r.max ?? r.min) as number | null;
                  return (
                    <div key={r.pathwaySet} className="grid grid-cols-[130px_1fr_110px] items-center gap-2 text-xs">
                      <span style={{ color: DECK.ink2 }}>{r.pathwaySet}</span>
                      <div className="relative h-3 rounded" style={{ background: '#f3f3f3' }}>
                        {min != null && max != null && (
                          <span className="absolute top-0 h-3 rounded" style={{ left: pos(min), width: `max(4px, calc(${pos(max)} - ${pos(min)}))`, background: DECK.teal }} />
                        )}
                        {typeof r.median === 'number' && <span className="absolute -top-0.5 h-4 w-0.5" style={{ left: pos(r.median), background: DECK.ink }} />}
                      </div>
                      <span className="text-right font-mono tabular-nums" style={{ color: DECK.ink }}>
                        {fmt(min, min != null && min < 20 ? 1 : 0)}{r.max != null ? `–${fmt(r.max as number, (r.max as number) < 20 ? 1 : 0)}` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
              {g.rows.some(r => r.sourceNote) && (
                <SourceLine>{g.rows.filter(r => r.sourceNote).map(r => r.sourceNote).join(' · ')}</SourceLine>
              )}
            </div>
          );
        })}
      </div>
      <SourceLine>
        Today: EEA (2026) inventory and Member States’ projections (WAM); EU ETS, ICE December 2026 contract, November 2026; Ember
        (2026); COM(2026) 252. Pathways: ESABCC (2023) database; JRC (2025, 2026); NGFS phase 5 (EU+UK); Rodrigues et al. (2026);
        UBA/Fraunhofer ISI (2026) — not screened (no 2040 industry data). Bars: min–max; tick: median where the workbook gives one.
      </SourceLine>
    </section>
  );
}

/* ── Reference data ────────────────────────────────────────────────────── */

function ReferencePanel() {
  const cmipLines: ChartLine[] = CMIP7.map((c, i) => ({
    id: `c${i}`,
    label: c.pathway,
    points: CMIP7_YEARS.map((y, j) => [y, c.values[j] as number] as [number, number]),
    colour: DECK.orange,
  }));
  return (
    <section className="space-y-6">
      <div className="border border-grey-200 bg-white p-4">
        <SectionHead title="ESABCC 2023: the 16 net-zero pathways" lead={ESABCC_2040_TITLE ?? undefined} />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead style={{ background: DECK.tealXL }}>
              <tr>
                <Th>Scenario</Th><Th className="text-right">Cut 2040 % (Board metric)</Th><Th className="text-right">Capture 2050 Mt</Th>
                <Th className="text-right">Biomass 2050 EJ</Th><Th className="text-right">Land sink 2050 Mt</Th>
                <Th>Env. risk levels</Th><Th>Tech. risk levels</Th><Th>Basis of 2040 advice</Th>
              </tr>
            </thead>
            <tbody>
              {ESABCC_2040.map(r => (
                <tr key={r.scenario} className="border-t border-grey-100">
                  <td className="px-2 py-1.5 font-mono">{r.scenario}</td>
                  <td className={`px-2 py-1.5 ${num}`}>{fmt(r.red2040, 1)}</td>
                  <td className={`px-2 py-1.5 ${num}`}>{fmt(r.cap2050, 1)}</td>
                  <td className={`px-2 py-1.5 ${num}`}>{fmt(r.bio2050EJ, 2)}</td>
                  <td className={`px-2 py-1.5 ${num}`}>{fmt(r.landSink2050, 1)}</td>
                  <td className="px-2 py-1.5">{r.withinEnvRisk ? 'within' : <span style={{ color: DECK.red }}>above</span>}</td>
                  <td className="px-2 py-1.5">{r.withinTechRisk ? 'within' : <span style={{ color: DECK.red }}>above</span>}</td>
                  <td className="px-2 py-1.5 font-semibold" style={{ color: r.basisOfAdvice ? DECK.tealD : DECK.muted }}>{r.basisOfAdvice ? 'yes' : 'no'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-grey-200 bg-white p-4">
        <SectionHead title="ScenarioMIP-CMIP7 (IPCC AR7) pathways: EU net GHG emissions" lead={CMIP7_TITLE ?? undefined} />
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div>
            <CmipChart lines={cmipLines} />
          </div>
          <div className="space-y-2">
            <Note accent={DECK.orange}><strong>Target: global temperature, not EU law.</strong> 1.6–1.7 °C peak warming; EU targets are not an input.</Note>
            <Note accent={DECK.orange}><strong>Regional allocation: least cost.</strong> Reductions are placed where they are cheapest globally.</Note>
            <Note accent={DECK.orange}><strong>EU+UK net zero in 2 of 8 pathways</strong>, in 2059 and 2063; 2040 cut 70–86 % vs 1990.</Note>
            <Note accent={DECK.orange}><strong>2025 starting levels above the inventory:</strong> up to 3,420 Mt in 2025 vs 2,786 Mt emitted in 2024.</Note>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead style={{ background: DECK.tealXL }}>
              <tr><Th>Pathway</Th>{CMIP7_YEARS.map(y => <Th key={y} className="text-right">{y}</Th>)}</tr>
            </thead>
            <tbody>
              {CMIP7.map(c => (
                <tr key={c.pathway} className="border-t border-grey-100">
                  <td className="px-2 py-1.5">{c.pathway}</td>
                  {c.values.map((v, j) => <td key={j} className={`px-2 py-1.5 ${num}`}>{fmt(v as number)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SourceLine>History: EEA (2026), net incl. LULUCF. Targets: European Climate Law (−55 % 2030, net zero 2050) and the proposed −90 % for 2040; 1990 = 4,609 Mt. The net-zero years and 2040 cuts in the notes are from the deck.</SourceLine>
      </div>

      <div className="border border-grey-200 bg-white p-4">
        <SectionHead title="UBA / Fraunhofer ISI (2026) — not screened" lead={UBA_TITLE ?? undefined} />
        <table className="w-full text-xs">
          <thead style={{ background: DECK.tealXL }}>
            <tr><Th>Scenario</Th><Th>Item</Th><Th>Value</Th><Th>Reference</Th></tr>
          </thead>
          <tbody>
            {UBA.map((r, i) => (
              <tr key={i} className="border-t border-grey-100">
                <td className="px-2 py-1.5 whitespace-nowrap">{r.scenario}</td>
                <td className="px-2 py-1.5">{r.item}</td>
                <td className="px-2 py-1.5 font-mono tabular-nums">{r.value}</td>
                <td className="px-2 py-1.5 text-tertiary">{r.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border border-grey-200 bg-white p-4">
        <SectionHead title="EEA inventory, past trend and Member States’ projections" lead={INVENTORY_TITLE ?? undefined} />
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0" style={{ background: DECK.tealXL }}>
              <tr>
                <Th>Year</Th><Th className="text-right">Industry inventory</Th><Th className="text-right">Past trend</Th>
                <Th className="text-right">WEM</Th><Th className="text-right">WAM</Th><Th className="text-right">EU net GHG</Th>
              </tr>
            </thead>
            <tbody>
              {INVENTORY.map(r => (
                <tr key={r.year} className="border-t border-grey-100">
                  <td className="px-2 py-1 font-mono tabular-nums">{r.year}</td>
                  <td className={`px-2 py-1 ${num}`}>{fmt(r.industry as number | null, 1)}</td>
                  <td className={`px-2 py-1 ${num}`}>{fmt(r.pastTrend as number | null, 1)}</td>
                  <td className={`px-2 py-1 ${num}`}>{fmt(r.wem as number | null, 1)}</td>
                  <td className={`px-2 py-1 ${num}`}>{fmt(r.wam as number | null, 1)}</td>
                  <td className={`px-2 py-1 ${num}`}>{fmt(r.euNetGhg as number | null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-grey-200 bg-white p-4">
        <SectionHead title="Scenario pools" lead="Number of pathways per pool and how many pass each screening step (sheet Pools, recomputed)." />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead style={{ background: DECK.tealXL }}>
              <tr>
                <Th>Pool</Th><Th>Published</Th><Th className="text-right">Pathways</Th><Th className="text-right">Net zero 2050</Th>
                <Th className="text-right">85–95 % 2040</Th><Th className="text-right">ESABCC filter</Th><Th className="text-right">Risk levels</Th>
              </tr>
            </thead>
            <tbody>
              {POOLS.map(p => (
                <tr key={p.pool} className="border-t border-grey-100" style={p.separate ? { color: DECK.muted } : undefined}>
                  <td className="px-2 py-1.5">{p.pool}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{p.publicationYears ?? '—'}</td>
                  <td className={`px-2 py-1.5 ${num}`}>{fmt(p.pathways as number | null)}</td>
                  <td className={`px-2 py-1.5 ${num}`}>{fmt(p.netZero2050 as number | null)}</td>
                  <td className={`px-2 py-1.5 ${num}`}>{fmt(p.in8595 as number | null)}</td>
                  <td className={`px-2 py-1.5 ${num}`}>{fmt(p.filterPass as number | null)}</td>
                  <td className={`px-2 py-1.5 ${num} font-bold`}>{fmt(p.withinRisk as number | null)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-grey-300 font-bold">
                <td className="px-2 py-1.5">Total (screened pools)</td><td />
                {(['pathways', 'netZero2050', 'in8595', 'filterPass', 'withinRisk'] as const).map(k => (
                  <td key={k} className={`px-2 py-1.5 ${num}`}>{fmt(POOLS.filter(p => !p.separate).reduce((a, p) => a + ((p[k] as number) ?? 0), 0))}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CmipChart({ lines }: { lines: ChartLine[] }) {
  const W = 700, H = 320, PAD = { l: 52, r: 12, t: 12, b: 28 };
  const x = (yr: number) => PAD.l + ((yr - 1990) / (2060 - 1990)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v + 500) / 5300) * (H - PAD.t - PAD.b);
  const hist = INVENTORY.filter(r => r.euNetGhg != null).map(r => [r.year, r.euNetGhg as number] as [number, number]);
  const d = (pts: [number, number][]) => pts.map(([a, v], i) => `${i ? 'L' : 'M'}${x(a)},${y(v)}`).join('');
  const targets: [number, number, string][] = [[2030, 4609 * 0.45, '−55 %'], [2040, 4609 * 0.1, '−90 %'], [2050, 0, 'net zero']];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="EU+UK net GHG in the eight CMIP7 Very Low pathways against EU history and targets">
      {[0, 1000, 2000, 3000, 4000, 5000].map(t => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={DECK.grid} />
          <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill={DECK.muted}>{t.toLocaleString('en-GB')}</text>
        </g>
      ))}
      {[1990, 2000, 2010, 2020, 2030, 2040, 2050, 2060].map(yr => (
        <text key={yr} x={x(yr)} y={H - 8} textAnchor="middle" fontSize={11} fill={DECK.muted}>{yr}</text>
      ))}
      <circle cx={x(1990)} cy={y(4609)} r={4} fill={DECK.teal}><title>1990: 4,609 Mt (EEA)</title></circle>
      <path d={d(hist)} fill="none" stroke={DECK.teal} strokeWidth={3} />
      {lines.map(l => (
        <path key={l.id} d={d(l.points)} fill="none" stroke={l.colour} strokeWidth={1.5} strokeOpacity={0.85}><title>{l.label}</title></path>
      ))}
      {targets.map(([yr, v, lbl]) => (
        <g key={yr}>
          <rect x={x(yr) - 6} y={y(v) - 6} width={12} height={12} transform={`rotate(45 ${x(yr)} ${y(v)})`} fill={DECK.ink} />
          <text x={x(yr) + 10} y={y(v) - 8} fontSize={11} fill={DECK.ink}>{lbl}</text>
        </g>
      ))}
    </svg>
  );
}
