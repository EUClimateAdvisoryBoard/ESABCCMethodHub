/**
 * Scenarios — main module M · 55 (route `/scenario-pathways`).
 *
 * The third main module next to the Reference Manager and the Project
 * Workspace. It loads the EEA export "EU scenario pathways: six sectors,
 * 2040 screening settings" (1,328 pathways; `EU_six_sectors_export.zip`,
 * built by `scripts/build-scenario-pathways.py`) and lets the reader move
 * every screening criterion of the 2040 advice:
 *
 *   0. source databases (pools)
 *   1. EU net GHG in 2050 ≤ tolerance (0 / 150 / 300 Mt or any value)
 *   2. 2040 net GHG cut vs 1990 inside a two-handle window
 *   3. ESABCC filter (feasibility, ESABCC 2023 Table 5) — six thresholds
 *   4. risk levels (sustainability, ESABCC 2023 Table 6) — three thresholds
 *   plus a common margin and the "missing values count as passed" rule,
 *
 * and redraws every chart type of the presented deck for the pathways left.
 * With the defaults it reproduces the deck (64 pathways) and the export's
 * stage columns exactly; the page checks that on load and says so.
 *
 * Epistemic status: data as delivered by the EEA (Scenario Compass v2.0
 * under embargo, internal only); the screening port and the charts are
 * AI-compiled — pending Secretariat verification.
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ModeSwitcher from '@/components/ui/ModeSwitcher';
import { FilterPill } from '@/components/ui/FilterPill';
import { EmptyState, ErrorState, LoadingState, PartialState } from '@/components/ui/StateView';
import Skeleton from '@/components/ui/Skeleton';
import { codecs, useUrlState } from '@/lib/useUrlState';
import {
  ADVICE_SETTINGS, DEFAULT_TH, PRESETS, SECTORS, SECTOR_BY_KEY, SRC_LABEL, STAGE_LABEL, THRESHOLDS, WIN_MIN, WIN_OPEN, YEARS,
  bandStats, checkParity, fmtNum, harmMix, harmonise, harmoniseSector, isExportDefault, matchesPreset, median, netGhgValue, netLabel, parseDataset, presetSettings,
  RATIO_BOUNDS,
  screenAll, sectorMatrix, windowLabel,
  type Dataset, type HarmMethod, type Pathway, type Preset, type RawDataset, type Screened, type SectorDef, type SectorKey, type Settings, type ThresholdKey,
} from '@/lib/scenario-pathways/model';
import {
  DECK, DriverColumnChart, FunnelChart, Legend, SettingsDotPlot, TrajectoryChart,
  type DotRow, type DriverColumn, type DriverRow,
} from './charts';
import { ControlGroup, DualSlider, PresetButtons, SingleSlider, SliderStyles, Toggle } from './controls';

const DATA_URL = '/data/scenario-pathways/pathways.json';
const DECK_URL = '/data/scenario-pathways/EU_six_sectors_2040_settings_deck.html';
const ALL_SECTORS = SECTORS.map((s) => s.key);

const SOURCES: { label: string; url: string }[] = [
  { label: 'EEA for the ESABCC Secretariat (2026) — Six sectors in EU scenario pathways, deck of 20 November 2026 (internal, embargoed data)', url: DECK_URL },
  { label: 'ESABCC (2023) — Scientific advice for the determination of an EU-wide 2040 climate target (Tables 5 and 6)', url: 'https://climate-advisory-board.europa.eu/reports-and-publications/scientific-advice-for-the-determination-of-an-eu-wide-2040' },
  { label: 'IIASA Scenario Explorer — scenario databases (Scenario Compass, NAVIGATE, ECEMF, SHAPE, DEEDS, NGFS …)', url: 'https://data.ece.iiasa.ac.at/' },
  { label: 'EEA — EU greenhouse gas inventory (UNFCCC submission)', url: 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2' },
];

// ── URL state ────────────────────────────────────────────────────────────

const SCHEMA = {
  view: codecs.enum(['overview', 'sectors', 'settings', 'pathways'] as const, 'overview'),
  sec: codecs.csv(ALL_SECTORS),
  pool: codecs.csv([]),
  net: codecs.boolean(true),
  tol: codecs.number(ADVICE_SETTINGS.netTol),
  win: codecs.boolean(true),
  lo: codecs.number(ADVICE_SETTINGS.winLo),
  hi: codecs.number(ADVICE_SETTINGS.winHi),
  f: codecs.boolean(true),
  r: codecs.boolean(true),
  m: codecs.number(0),
  miss: codecs.boolean(true),
  h: codecs.enum(['ratio', 'offset', 'none'] as const, 'ratio'),
  hs: codecs.boolean(false),
  ...(Object.fromEntries(THRESHOLDS.map((t) => [`t_${t.key}`, codecs.number(t.def)])) as Record<`t_${ThresholdKey}`, ReturnType<typeof codecs.number>>),
};

type View = 'overview' | 'sectors' | 'settings' | 'pathways';

// ── data loading (loud on failure, never silently empty) ─────────────────

type Load = { state: 'loading' } | { state: 'error'; message: string; hint?: string } | { state: 'ready'; ds: Dataset };

function useDataset(): [Load, () => void] {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoad({ state: 'loading' });
    (async () => {
      try {
        const res = await fetch(DATA_URL, { credentials: 'same-origin' });
        if (!res.ok) throw Object.assign(new Error(`The dataset request returned HTTP ${res.status}.`), { hint: 'The file is built by scripts/build-scenario-pathways.py; it may be missing from this deployment.' });
        const type = res.headers.get('content-type') ?? '';
        if (!type.includes('json')) {
          throw Object.assign(new Error('The server answered with a web page instead of the dataset.'), {
            hint: 'This usually means the site-login session has expired. Reload the page and sign in again.',
          });
        }
        const raw = (await res.json()) as RawDataset;
        if (!raw?.rows?.length || raw.rows.length !== raw.meta?.n) {
          throw new Error(`The dataset is incomplete: ${raw?.rows?.length ?? 0} rows where the header announces ${raw?.meta?.n ?? '?'}.`);
        }
        const ds = parseDataset(raw);
        if (!cancelled) setLoad({ state: 'ready', ds });
      } catch (e) {
        if (!cancelled) setLoad({ state: 'error', message: (e as Error).message, hint: (e as { hint?: string }).hint });
      }
    })();
    return () => { cancelled = true; };
  }, [nonce]);
  return [load, useCallback(() => setNonce((n) => n + 1), [])];
}

// ── page ─────────────────────────────────────────────────────────────────

export default function ScenarioPathways() {
  const [load, retry] = useDataset();
  return (
    <>
      <SiteHeader />
      <SliderStyles />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        <Hero />
        {load.state === 'loading' && (
          <div className="mt-6 space-y-4">
            <LoadingState label="Loading 1,328 scenario pathways…" />
            <Skeleton.Block />
          </div>
        )}
        {load.state === 'error' && (
          <div className="mt-6">
            <ErrorState
              title="The scenario dataset could not be loaded"
              body={load.message}
              hint={load.hint}
              primaryAction={{ label: 'Retry', onClick: retry }}
            />
          </div>
        )}
        {load.state === 'ready' && <Explorer ds={load.ds} />}
        <SourcesPanel />
      </main>
      <SiteFooter />
    </>
  );
}

function Hero() {
  return (
    <section className="mb-5">
      <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary dark:text-[var(--mh-muted)]">
        Main module · M · 55 · Scenarios · six sectors × 2040 screening settings
      </div>
      <h1 className="text-2xl font-bold text-tertiary-dark dark:text-[var(--mh-fg)] sm:text-3xl">
        Scenarios — EU pathways under the 2040 screening
      </h1>
      <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-tertiary dark:text-[var(--mh-muted)]">
        1,328 EU scenario pathways from the IIASA databases, Schreyer et al., the JRC and the ESABCC&apos;s own 2023 runs,
        screened the way the Board screened them for its 2040 advice — but with every criterion on a slider. Set the 2050
        net-GHG tolerance, the 2040 window, the ESABCC feasibility filter and the risk levels; the funnel, the six sector
        charts, the settings comparison, the levers and the pathway list all recompute for the pathways that are left.
      </p>
      <div className="mt-4 rounded-lg border-2 border-accent-orange/60 bg-surface-orange p-4 dark:bg-[var(--mh-card)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark dark:text-[var(--mh-fg)]">
          Internal — Scenario Compass v2.0 data under embargo · AI-compiled — pending Secretariat verification
        </p>
        <p className="mt-1.5 max-w-4xl text-[12.5px] leading-relaxed text-tertiary-dark dark:text-[var(--mh-fg)]">
          The pathway data are the EEA export as delivered; do not copy them to external services or public
          repositories. The screening and the charts are an AI-compiled port of the export&apos;s Python scripts. With the
          default settings the port reproduces the export&apos;s stage codes and the deck&apos;s figures exactly (checked on every
          load, see the badge below); any other combination of settings is exploratory and has not been reviewed. By
          default all emission results are scaled to the EEA inventory for 2020 (ratio, offset where the ratio is unusable),
          which removes the gap between the models&apos; 2020 and the inventory, including the regional differences (EU27, EU27
          and UK). The deck showed the values as reported; choose “As reported” in the panel to see them.
        </p>
      </div>
    </section>
  );
}

function SourcesPanel() {
  return (
    <section className="mt-10 rounded-lg border border-grey-200 bg-grey-50 p-4 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-tertiary-dark dark:text-[var(--mh-fg)]">Caveats &amp; sources</h2>
      <ul className="mt-2 space-y-1 text-[12px] text-tertiary dark:text-[var(--mh-muted)]">
        <li>Inventory scaling: base year 2020, the correction held constant to 2050 (no convergence back to the reported values). Ratio is used where model and inventory 2020 share a sign and the factor lies within 0.25–4; otherwise an additive offset. Lever indicators are not scaled.</li>
        <li>Missing filter values count as passed by default (the export&apos;s rule); switch this off in the panel to test the opposite.</li>
        <li>2040 cut: ESABCC runs use the Board&apos;s metric; other pathways use net GHG scaled to the 2015 inventory (2020 where 2015 is missing). The window is whole-percent rounded as in the export (lower bound − 0.05, upper bound + 0.5).</li>
        <li>Charts require a pathway to report all of 2020, 2030, 2040 and 2050 for the sector shown; n can therefore be lower than the number of pathways within all criteria.</li>
        <li>Agri-food CO₂e uses AR5 GWPs (CH₄ × 28, N₂O × 265). Reference lines in the lever charts use the inventory values of the export&apos;s drivers.py.</li>
        <li>Rebuild the data with <code className="font-mono">python3 -I scripts/build-scenario-pathways.py</code>; it refuses to write if its own parity check fails.</li>
      </ul>
      <ul className="mt-3 space-y-1 text-[12px]">
        {SOURCES.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer" className="mh-focus text-primary hover:underline dark:text-[#74CBC8]">{s.label} ↗</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── explorer ─────────────────────────────────────────────────────────────

function Explorer({ ds }: { ds: Dataset }) {
  const [u, setU, resetU] = useUrlState(SCHEMA);
  const view = u.view as View;
  const harm = u.h as HarmMethod;
  // EU net GHG scaled to the inventory net total of 2020 (same rule as the sectors).
  const netH = useMemo(() => harmonise(netGhgValue, ds.invNet[2020], harm), [ds, harm]);

  const settings: Settings = useMemo(() => ({
    pools: u.pool,
    netOn: u.net,
    netTol: u.tol,
    winOn: u.win,
    winLo: Math.max(WIN_MIN, Math.min(u.lo, WIN_OPEN)),
    winHi: Math.max(Math.max(WIN_MIN, Math.min(u.lo, WIN_OPEN)), Math.min(u.hi, WIN_OPEN)),
    filterOn: u.f,
    riskOn: u.r,
    th: Object.fromEntries(THRESHOLDS.map((t) => [t.key, u[`t_${t.key}`] as number])) as Record<ThresholdKey, number>,
    margin: u.m,
    missingPass: u.miss,
    netValue: u.hs && u.h !== 'none' ? (p: Pathway) => netH.value(p, 2050) : undefined,
  }), [u, netH]);
  const allSectors = useMemo(() => SECTORS.map((s) => harmoniseSector(s, ds.invSectors[2020], harm)), [ds, harm]);
  const sectors = useMemo(() => allSectors.filter((s) => u.sec.includes(s.key)), [allSectors, u.sec]);

  const parity = useMemo(() => checkParity(ds), [ds]);
  const screened = useMemo(() => screenAll(ds, settings), [ds, settings]);
  const passing = useMemo(() => screened.filter((x) => x.stage === 4).map((x) => x.p), [screened]);
  const presetSets = useMemo(
    () => PRESETS.map((pr) => ({ pr, set: screenAll(ds, presetSettings(settings, pr)).filter((x) => x.stage === 4).map((x) => x.p) })),
    [ds, settings],
  );
  const preset = matchesPreset(settings);
  const isAdvice = !!preset?.advice && isExportDefault(settings);
  const pools = useMemo(() => {
    const c = new Map<string, number>();
    for (const p of ds.pathways) c.set(p.pool, (c.get(p.pool) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [ds]);

  const summary = [
    settings.netOn ? netLabel(settings.netTol) + ' in 2050' : null,
    settings.winOn ? `2040 cut ${windowLabel(settings)}` : null,
    settings.filterOn ? 'ESABCC filter' : null,
    settings.riskOn ? 'risk levels' : null,
    settings.margin ? `+${settings.margin}% margin` : null,
  ].filter(Boolean).join(' · ') || 'no screening step applied';
  const harmText = harm === 'none' ? 'results as reported by the models' : `results scaled to the EEA inventory 2020 (${harm === 'ratio' ? 'ratio, offset where the ratio is unusable' : 'offset'})${u.hs ? '; step 1 on scaled net GHG' : ''}`;

  return (
    <>
      <StatStrip ds={ds} screened={screened} passing={passing} parity={parity} netValue={netH.value} scaled={harm !== 'none'} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[88px] lg:max-h-[calc(100vh-104px)] lg:overflow-y-auto rounded-lg border border-grey-200 bg-white p-4 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]" aria-label="Screening settings">
          <FilterPanel settings={settings} u={u} setU={setU} pools={pools} onReset={resetU} isAdvice={isAdvice && u.h === 'ratio' && !u.hs} />
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="rounded-lg border border-grey-200 bg-grey-50 px-4 py-3 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
            <p className="text-[11px] uppercase tracking-[0.1em] text-tertiary dark:text-[var(--mh-muted)]">Current setting</p>
            <p className="mt-0.5 text-[14px] font-semibold text-tertiary-dark dark:text-[var(--mh-fg)]">
              {summary}
              {isAdvice && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-[#ec621d] px-2 py-0.5 align-middle text-[10.5px] font-bold text-[#ec621d]">
                  ● setting of the 2040 advice
                </span>
              )}
              {!isAdvice && preset && isExportDefault(settings) && (
                <span className="ml-2 rounded-full border border-grey-300 px-2 py-0.5 align-middle text-[10.5px] text-tertiary">deck setting {preset.short}</span>
              )}
            </p>
            <p className="mt-0.5 font-mono text-[12px] tabular-nums text-tertiary dark:text-[var(--mh-muted)]">
              {passing.length.toLocaleString('en-GB')} of {screened.filter((x) => x.stage !== -2).length.toLocaleString('en-GB')} pathways within all criteria · {harmText}
            </p>
          </div>

          <div className="mb-1">
            <p className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-tertiary dark:text-[var(--mh-muted)]">Sectors shown</p>
            <div className="flex flex-wrap gap-1.5">
              {SECTORS.map((s) => {
                const on = u.sec.includes(s.key);
                return (
                  <FilterPill
                    key={s.key}
                    label={s.name}
                    active={on}
                    onClick={() => setU({ sec: on ? u.sec.filter((k) => k !== s.key) : ALL_SECTORS.filter((k) => k === s.key || u.sec.includes(k)) })}
                  />
                );
              })}
              <button type="button" onClick={() => setU({ sec: ALL_SECTORS })} className="mh-focus ml-1 text-[11px] font-semibold text-primary hover:underline dark:text-[#74CBC8]">all six</button>
            </div>
          </div>

          <ModeSwitcher<View>
            ariaLabel="View"
            value={view}
            onChange={(id) => setU({ view: id })}
            modes={[
              { id: 'overview', label: 'Screen', subtitle: 'Funnel and EU net GHG' },
              { id: 'sectors', label: 'Inspect sectors', subtitle: 'Trajectories and levers' },
              { id: 'settings', label: 'Compare settings', subtitle: 'Six deck settings side by side' },
              { id: 'pathways', label: 'Browse pathways', subtitle: 'Every scenario, with reasons' },
            ]}
          />

          {passing.length === 0 && view !== 'pathways' && (
            <EmptyState
              title="No pathway is within all criteria"
              body="Loosen one of the criteria in the panel — for example widen the 2040 window or raise the 2050 tolerance — or open the pathway list to see where each pathway drops out."
              primaryAction={{ label: 'Browse pathways', onClick: () => setU({ view: 'pathways' }) }}
              secondaryActions={[{ label: 'Reset to the 2040 advice', onClick: resetU }]}
            />
          )}

          {view === 'overview' && <OverviewView ds={ds} screened={screened} settings={settings} passing={passing} sectors={sectors} presetSets={presetSets} netValue={netH.value} harm={harm} />}
          {view === 'sectors' && passing.length > 0 && (
            sectors.length ? sectors.map((s) => (
              <SectorCard key={s.key} ds={ds} sector={s} screened={screened} settings={settings} passing={passing} presetSets={presetSets} harm={harm} />
            )) : <EmptyState title="No sector selected" body="Pick at least one sector above." primaryAction={{ label: 'Show all six', onClick: () => setU({ sec: ALL_SECTORS }) }} />
          )}
          {view === 'settings' && <SettingsView ds={ds} sectors={sectors} passing={passing} presetSets={presetSets} settings={settings} />}
          {view === 'pathways' && <PathwayTable screened={screened} sectors={sectors} allSectors={allSectors} summary={summary} harm={harm} netValue={netH.value} />}
        </div>
      </div>
    </>
  );
}

// ── stat strip ───────────────────────────────────────────────────────────

function StatStrip({ ds, screened, passing, parity, netValue, scaled }: {
  ds: Dataset; screened: Screened[]; passing: Pathway[]; parity: { checked: number; mismatches: number };
  netValue: (p: Pathway, y: number) => number | null; scaled: boolean;
}) {
  const net = passing.map((p) => netValue(p, 2050)).filter((v): v is number => v != null);
  const models = new Set(passing.map((p) => p.model)).size;
  const srcs = new Set(passing.map((p) => p.src)).size;
  const tiles = [
    { label: 'Within all criteria', value: passing.length.toLocaleString('en-GB'), sub: `of ${screened.filter((x) => x.stage !== -2).length.toLocaleString('en-GB')} pathways in the selected sources` },
    { label: 'Pathways collected', value: ds.pathways.length.toLocaleString('en-GB'), sub: `${new Set(ds.pathways.map((p) => p.pool)).size} source pools` },
    { label: 'Models · studies left', value: `${models} · ${srcs}`, sub: 'distinct models · source studies' },
    { label: 'EU net GHG 2050', value: net.length ? fmtNum(median(net), 0) : '—', sub: `Mt CO₂e, median of ${net.length} reporting${scaled ? ', scaled to inventory' : ''}` },
  ];
  return (
    <section>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-grey-200 bg-grey-50 p-3 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary dark:text-[var(--mh-muted)]">{t.label}</p>
            <p className="mt-1 font-mono text-xl font-bold tabular-nums text-tertiary-dark dark:text-[var(--mh-fg)]">{t.value}</p>
            <p className="mt-0.5 text-[10.5px] leading-snug text-tertiary dark:text-[var(--mh-muted)]">{t.sub}</p>
          </div>
        ))}
      </div>
      <p
        className={`mt-2 inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-semibold ${parity.mismatches === 0 ? 'bg-surface-green text-secondary' : 'bg-surface-orange text-accent-red'}`}
        role={parity.mismatches ? 'alert' : undefined}
        title="The twelve stage columns nz{0|150}|{85–90%|85–95%|≥ 85%}|m{0|10} of the export, recomputed by this page"
      >
        {parity.mismatches === 0
          ? `✓ Screening port reproduces the export's 12 stage columns (${parity.checked.toLocaleString('en-GB')} of ${parity.checked.toLocaleString('en-GB')} codes)`
          : `⚠ Screening port differs from the export in ${parity.mismatches.toLocaleString('en-GB')} of ${parity.checked.toLocaleString('en-GB')} stage codes — do not use the figures`}
      </p>
    </section>
  );
}

// ── filter panel ─────────────────────────────────────────────────────────

type U = ReturnType<typeof useUrlState<typeof SCHEMA>>[0];
type SetU = ReturnType<typeof useUrlState<typeof SCHEMA>>[1];

function FilterPanel({ settings, u, setU, pools, onReset, isAdvice }: {
  settings: Settings; u: U; setU: SetU; pools: [string, number][]; onReset: () => void; isAdvice: boolean;
}) {
  const winPreset = !settings.winOn ? null
    : settings.winLo === 85 && settings.winHi === 90 ? '85-90'
      : settings.winLo === 85 && settings.winHi === 95 ? '85-95'
        : settings.winLo === 85 && settings.winHi >= WIN_OPEN ? '85+'
          : settings.winLo === 90 && settings.winHi >= WIN_OPEN ? '90+' : null;
  const setTh = (k: ThresholdKey, v: number) => setU({ [`t_${k}`]: v } as Partial<U>);
  const resetFilter = (group: 'filter' | 'risk') =>
    setU(Object.fromEntries(THRESHOLDS.filter((t) => t.group === group).map((t) => [`t_${t.key}`, DEFAULT_TH[t.key]])) as Partial<U>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[14px] font-bold text-tertiary-dark dark:text-[var(--mh-fg)]">Screening settings</h2>
        <button
          type="button"
          onClick={onReset}
          disabled={isAdvice && !u.pool.length}
          className="mh-focus rounded border border-grey-300 px-2 py-1 text-[11px] font-semibold text-tertiary hover:bg-grey-100 disabled:opacity-40 dark:border-[var(--mh-border)] dark:text-[var(--mh-fg)]"
        >
          ↺ 2040 advice
        </button>
      </div>

      <ControlGroup step="Results" title="Scale to the historic inventory"
        summary={u.h === 'none' ? 'off — values as the models report them (the deck)' : 'every pathway\u2019s 2020 value set to the EEA inventory 2020'}>
        <PresetButtons
          value={u.h}
          onPick={(v) => setU({ h: v })}
          options={[
            { label: 'Ratio', value: 'ratio', title: `Multiply each series by inventory 2020 / model 2020; offset where that factor is outside ${RATIO_BOUNDS[0]}–${RATIO_BOUNDS[1]} or the signs differ` },
            { label: 'Offset', value: 'offset', title: 'Add inventory 2020 − model 2020 to every year' },
            { label: 'As reported', value: 'none', title: 'No scaling, as in the deck' },
          ]}
        />
        <p className="mt-1.5 text-[10.5px] leading-snug text-tertiary dark:text-[var(--mh-muted)]">
          Applies to EU net GHG and the six sectors' emissions. Ratio falls back to an offset where it would flip the sign or the factor
          lies outside {RATIO_BOUNDS[0]}–{RATIO_BOUNDS[1]} (most ecosystem pathways). Lever indicators (TWh, EJ, Mha) stay as reported.
        </p>
        <label className={`mt-2.5 flex items-center justify-between gap-2 text-[11.5px] font-semibold text-tertiary-dark dark:text-[var(--mh-fg)] ${u.h === 'none' ? 'opacity-50' : ''}`}>
          Use scaled 2050 net GHG in step 1
          <Toggle checked={u.hs && u.h !== 'none'} onChange={(v) => setU({ hs: v })} label="Use scaled 2050 net GHG in step 1" />
        </label>
        <p className="mt-1 text-[10.5px] leading-snug text-tertiary dark:text-[var(--mh-muted)]">
          Off by default: the 2040 advice screened on the reported values. The 2040 cut is already measured against the inventory.
        </p>
      </ControlGroup>

      <ControlGroup step="Step 0" title="Source databases" summary={u.pool.length ? `${u.pool.length} of ${pools.length} selected` : `all ${pools.length} selected`}>
        <div className="flex max-h-44 flex-wrap gap-1 overflow-y-auto">
          {pools.map(([p, n]) => {
            const on = u.pool.includes(p);
            return <FilterPill key={p} label={p} count={n} active={on} onClick={() => setU({ pool: on ? u.pool.filter((x) => x !== p) : [...u.pool, p] })} />;
          })}
        </div>
        {u.pool.length > 0 && (
          <button type="button" onClick={() => setU({ pool: [] })} className="mh-focus mt-1.5 text-[11px] font-semibold text-primary hover:underline dark:text-[#74CBC8]">clear — use all sources</button>
        )}
      </ControlGroup>

      <ControlGroup step="Step 1" title="EU net GHG in 2050" on={u.net} onToggle={(v) => setU({ net: v })}
        summary={u.net ? `${netLabel(settings.netTol)} CO₂e` : 'step off'}>
        <PresetButtons
          disabled={!u.net}
          value={[0, 150, 300].includes(u.tol) ? u.tol : null}
          onPick={(v) => setU({ tol: v })}
          options={[{ label: '≤ 0', value: 0, title: 'Net zero' }, { label: '≤ 150 Mt', value: 150, title: 'Setting of the 2040 advice' }, { label: '≤ 300 Mt', value: 300 }]}
        />
        <div className="mt-2">
          <SingleSlider label="Tolerance" value={u.tol} min={-300} max={600} step={10} def={150} unit="Mt CO₂e" disabled={!u.net}
            format={(v) => `≤ ${fmtNum(v)}`} onChange={(v) => setU({ tol: v })} />
        </div>
      </ControlGroup>

      <ControlGroup step="Step 2" title="2040 net GHG cut vs 1990" on={u.win} onToggle={(v) => setU({ win: v })}
        summary={u.win ? `window ${windowLabel(settings)} (rounded)` : 'step off'}>
        <PresetButtons
          disabled={!u.win}
          value={winPreset}
          onPick={(v) => {
            const map: Record<string, [number, number]> = { '85-90': [85, 90], '85-95': [85, 95], '85+': [85, WIN_OPEN], '90+': [90, WIN_OPEN] };
            const [lo, hi] = map[v];
            setU({ lo, hi });
          }}
          options={[
            { label: '85–90%', value: '85-90' },
            { label: '85–95%', value: '85-95', title: 'Setting of the 2040 advice' },
            { label: '≥ 85%', value: '85+' },
            { label: '≥ 90%', value: '90+' },
          ]}
        />
        <div className="mt-2">
          <DualSlider label="Window" lo={settings.winLo} hi={settings.winHi} min={WIN_MIN} max={WIN_OPEN} step={1} openAtMax
            marks={[70, 75, 80, 85, 90, 95, 100]} disabled={!u.win} onChange={(lo, hi) => setU({ lo, hi })} />
          <p className="mt-1 text-[10.5px] leading-snug text-tertiary dark:text-[var(--mh-muted)]">Drag the two dots. The right-hand dot at 100 leaves the window open upwards.</p>
        </div>
      </ControlGroup>

      <ControlGroup step="Step 3" title="ESABCC filter — feasibility" on={u.f} onToggle={(v) => setU({ f: v })}
        summary="ESABCC (2023) Table 5 · fails if a value exceeds its limit">
        <div className="space-y-2.5">
          {THRESHOLDS.filter((t) => t.group === 'filter').map((t) => (
            <SingleSlider key={t.key} label={t.label} value={settings.th[t.key]} min={t.min} max={t.max} step={t.step} def={t.def} unit={t.unit}
              disabled={!u.f} onChange={(v) => setTh(t.key, v)} />
          ))}
          <button type="button" onClick={() => resetFilter('filter')} className="mh-focus text-[11px] font-semibold text-primary hover:underline dark:text-[#74CBC8]">reset filter limits</button>
        </div>
      </ControlGroup>

      <ControlGroup step="Step 4" title="Risk levels — sustainability" on={u.r} onToggle={(v) => setU({ r: v })}
        summary="ESABCC (2023) Table 6 · fails if a value exceeds its level">
        <div className="space-y-2.5">
          {THRESHOLDS.filter((t) => t.group === 'risk').map((t) => (
            <SingleSlider key={t.key} label={t.label} value={settings.th[t.key]} min={t.min} max={t.max} step={t.step} def={t.def} unit={t.unit}
              disabled={!u.r} onChange={(v) => setTh(t.key, v)} />
          ))}
          <button type="button" onClick={() => resetFilter('risk')} className="mh-focus text-[11px] font-semibold text-primary hover:underline dark:text-[#74CBC8]">reset risk levels</button>
        </div>
      </ControlGroup>

      <ControlGroup step="Steps 3–4" title="Common rules">
        <SingleSlider label="Margin on all limits" value={u.m} min={0} max={50} step={1} def={0} unit="%" disabled={!u.f && !u.r}
          onChange={(v) => setU({ m: v })} />
        <p className="mt-1 text-[10.5px] text-tertiary dark:text-[var(--mh-muted)]">The export also ran a +10% variant.</p>
        <label className="mt-3 flex items-center justify-between gap-2 text-[11.5px] font-semibold text-tertiary-dark dark:text-[var(--mh-fg)]">
          Missing values count as passed
          <Toggle checked={u.miss} onChange={(v) => setU({ miss: v })} label="Missing values count as passed" />
        </label>
      </ControlGroup>
    </div>
  );
}

// ── overview: funnel + EU net GHG ────────────────────────────────────────

const STEP_LABELS = (s: Settings) => [
  'Pathways collected',
  'With industry data',
  `EU net GHG ≤ ${fmtNum(s.netTol)} Mt CO₂e in 2050`,
  `2040 net GHG cut ${windowLabel(s)} vs 1990`,
  'ESABCC filter (feasibility, Table 5)',
  'Risk levels (sustainability, Table 6)',
];

function OverviewView({ ds, screened, settings, passing, sectors, presetSets, netValue, harm }: {
  ds: Dataset; screened: Screened[]; settings: Settings; passing: Pathway[]; sectors: SectorDef[]; presetSets: { pr: Preset; set: Pathway[] }[];
  netValue: (p: Pathway, y: number) => number | null; harm: HarmMethod;
}) {
  const labels = STEP_LABELS(settings);
  const off = [false, false, !settings.netOn, !settings.winOn, !settings.filterOn, !settings.riskOn];
  // As variants.py: collected, then stage ≥ 0 (industry data), ≥ 1, ≥ 2, ≥ 3, ≥ 4.
  const counts = [screened.filter((x) => x.stage !== -2).length, ...[0, 1, 2, 3, 4].map((k) => screened.filter((x) => x.stage >= k).length)];
  const steps = labels.map((label, i) => ({ label, n: counts[i], off: off[i] }));

  // Medians of EU net GHG for the set left after each step (econ.py).
  const stepSets = [0, 1, 2, 3, 4].map((k) => screened.filter((x) => x.stage >= k).map((x) => x.p));
  const mats = stepSets.map((set) => sectorMatrix(set, netValue));
  const last = bandStats(mats[4]);
  const lineCols = ['#b9c9ce', '#97b4ba', '#608c95', '#3f6670', DECK.purple];
  const invYears = Object.keys(ds.invNet).map(Number).filter((y) => y >= 1990).sort((a, b) => a - b);
  const bySrc = Object.entries(passing.reduce<Record<string, number>>((a, p) => ({ ...a, [p.src]: (a[p.src] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <Card kicker="Economy-wide · screening" title={`From ${steps[0].n.toLocaleString('en-GB')} pathways to ${passing.length.toLocaleString('en-GB')}`}
        lead="Each step applied to the pathways left after the previous one">
        <FunnelChart steps={steps} />
        <p className="mt-2 text-[11.5px] text-tertiary dark:text-[var(--mh-muted)]">
          {passing.length ? <>The {passing.length}: {bySrc.map(([s, n]) => `${SRC_LABEL[s] ?? s} ${n}`).join(', ')}.</> : 'No pathway left.'}{' '}
          Missing values count as {settings.missingPass ? 'passed' : 'failed'}.
        </p>
      </Card>

      <Card kicker="Economy-wide · EU net GHG" title="Median EU net GHG at each screening step"
        lead={`Number of pathways in each median in brackets; the ${passing.length} filtered pathways in purple`}>
        {mats[4].length === 0 ? (
          <PartialState summary="None of the filtered pathways reports EU net GHG for all four years, so only the earlier steps are drawn." />
        ) : null}
        <TrajectoryChart
          ariaLabel="Median EU net GHG at each screening step, with the EEA inventory 1990–2024"
          years={YEARS}
          xDomain={[1988, 2053]}
          xTicks={[1990, 2000, 2010, 2020, 2030, 2040, 2050]}
          yLabel="Mt CO₂e"
          bars={invYears.map((y) => ({ x: y, y: ds.invNet[y] }))}
          barColor={DECK.barPale}
          bands={mats[4].length ? [{ lo: last.q[25], hi: last.q[75], color: DECK.purple, opacity: 0.18, label: '25–75% of the filtered pathways' }] : []}
          lines={mats.map((m, i) => ({ m, i })).filter(({ m }) => m.length).map(({ m, i }) => ({
            ys: bandStats(m).q[50], color: lineCols[i], width: i === 4 ? 4 : 2.5, markers: true, label: `${labels[i + 1]} (${m.length})`,
          }))}
          valueLabels={mats[4].length ? { ys: last.q[50], idx: [1, 2, 3], color: DECK.purple } : undefined}
        />
        <div className="mt-2">
          <Legend items={[
            ...mats.map((m, i) => ({ label: `${labels[i + 1]} (${m.length.toLocaleString('en-GB')}): median`, kind: 'line' as const, color: lineCols[i], width: i === 4 ? 4 : 2.5 })),
            { label: `25–75% of the ${passing.length}`, kind: 'band', color: DECK.purple, opacity: 0.18 },
            { label: 'EEA inventory, EU net GHG 1990–2024', kind: 'bar', color: DECK.barPale },
          ]} />
        </div>
        <p className="mt-2 text-[11px] text-tertiary dark:text-[var(--mh-muted)]">
          Emissions|Kyoto Gases (REMIND-EU: Emi|GHG|LULUCF national accounting); only pathways reporting 2020, 2030, 2040 and 2050.{' '}
          {harm === 'none'
            ? 'As reported. Model regions differ (EU27, EU27 and UK), so 2020 values are above the EU inventory.'
            : `Scaled so that every pathway's 2020 value equals the EEA inventory for 2020 (${fmtNum(ds.invNet[2020], 0)} Mt CO₂e), ${harm === 'ratio' ? 'by ratio (offset where the ratio is unusable)' : 'by offset'}; this also absorbs the regional differences (EU27, EU27 and UK).`}
        </p>
      </Card>

      {passing.length > 0 && sectors.length > 0 && (
        <Card kicker="Six sectors · at a glance" title="Median trajectory per sector" lead={`Filtered pathways${harm === 'none' ? ', as reported' : ', scaled to the 2020 inventory'}: median, 25–75% and 5–95%; bars: EEA inventory 2005–2024. Open “Inspect sectors” for the full charts.`}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sectors.map((s) => {
              const b = bandStats(sectorMatrix(passing, s.value));
              return (
                <div key={s.key}>
                  {b.n === 0 ? (
                    <EmptyState title={s.name} body="No filtered pathway reports this sector for all four years." />
                  ) : (
                    <SectorTrajectory ds={ds} sector={s} b={b} compact title={s.name} corner={`n = ${b.n}`} />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
      <SectorMedianOverview sectors={sectors} passing={passing} presetSets={presetSets} />
    </div>
  );
}

function SectorMedianOverview({ sectors, passing, presetSets }: { sectors: SectorDef[]; passing: Pathway[]; presetSets: { pr: Preset; set: Pathway[] }[] }) {
  if (!sectors.length || !passing.length) return null;
  return (
    <Card kicker="Sector summary" title="2050 sector emissions, current setting vs the six deck settings">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[12px]">
          <thead>
            <tr className="bg-[#608c95] text-left text-white">
              <th className="px-3 py-2 font-semibold">Sector</th>
              <th className="px-3 py-2 font-semibold">Unit</th>
              <th className="px-3 py-2 text-right font-semibold">n</th>
              <th className="px-3 py-2 text-right font-semibold">2040 median</th>
              <th className="px-3 py-2 text-right font-semibold">2050 median</th>
              <th className="px-3 py-2 text-right font-semibold">2050, 25–75%</th>
              <th className="px-3 py-2 text-right font-semibold">2050 median across six settings</th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((s) => {
              const b = bandStats(sectorMatrix(passing, s.value));
              const meds = presetSets.map(({ set }) => bandStats(sectorMatrix(set, s.value))).filter((x) => x.n).map((x) => x.q[50][3]);
              return (
                <tr key={s.key} className="border-b border-grey-200 dark:border-[var(--mh-border)]">
                  <td className="px-3 py-1.5 font-semibold text-tertiary-dark dark:text-[var(--mh-fg)]">{s.name}</td>
                  <td className="px-3 py-1.5 text-tertiary dark:text-[var(--mh-muted)]">{s.unit}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{b.n}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{b.n ? fmtNum(b.q[50][2], 0) : '—'}</td>
                  <td className="px-3 py-1.5 text-right font-mono font-bold tabular-nums text-[#3b2468] dark:text-[var(--mh-fg)]">{b.n ? fmtNum(b.q[50][3], 0) : '—'}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{b.n ? `${fmtNum(b.q[25][3], 0)} to ${fmtNum(b.q[75][3], 0)}` : '—'}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums text-[#ec621d]">{meds.length ? `${fmtNum(Math.min(...meds), 0)} to ${fmtNum(Math.max(...meds), 0)}` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── sector card ──────────────────────────────────────────────────────────

type SectorView = 'main' | 'data' | 'settings' | 'levers';

function invBars(ds: Dataset, key: SectorKey) {
  return Object.keys(ds.invSectors).map(Number).sort((a, b) => a - b).map((y) => ({ x: y, y: ds.invSectors[y][key] }));
}

function SectorTrajectory({ ds, sector, b, compact, title, corner, rangeMarker, framed, titleColor }: {
  ds: Dataset; sector: SectorDef; b: ReturnType<typeof bandStats>; compact?: boolean; title?: string; corner?: string;
  rangeMarker?: { lo: number; hi: number }; framed?: boolean; titleColor?: string;
}) {
  const few = b.n > 0 && b.n < 5;
  return (
    <TrajectoryChart
      ariaLabel={`${sector.name}: ${b.n} pathways${few ? ', single lines' : ', median and percentile bands'}, EEA inventory 2005–2024`}
      years={YEARS}
      compact={compact}
      title={title}
      titleColor={titleColor}
      corner={corner}
      framed={framed}
      xDomain={[2004, compact ? 2054 : 2052]}
      xTicks={compact ? [2010, 2020, 2030, 2040, 2050] : [2005, 2010, 2015, 2020, 2030, 2040, 2050]}
      yLabel={sector.unit}
      yDomain={sector.yl}
      bars={invBars(ds, sector.key)}
      barColor={compact ? DECK.barPale : DECK.bar}
      bands={few || !b.n ? [] : [
        { lo: b.q[5], hi: b.q[95], color: DECK.tealLight, opacity: 0.45, label: '5–95%' },
        { lo: b.q[25], hi: b.q[75], color: DECK.teal, opacity: 0.75, label: '25–75%' },
      ]}
      lines={few ? b.lines.map((ys) => ({ ys, color: DECK.purple, width: 2 })) : b.n ? [{ ys: b.q[50], color: DECK.purple, width: compact ? 3 : 3.5, label: 'median' }] : []}
      valueLabels={!few && b.n ? { ys: b.q[50], idx: compact ? [2, 3] : [1, 2, 3], color: DECK.purple } : undefined}
      rangeMarker={rangeMarker ? { ...rangeMarker, title: '2050 median across the six deck settings' } : undefined}
    />
  );
}

function SectorCard({ ds, sector, screened, settings, passing, presetSets, harm }: {
  ds: Dataset; sector: SectorDef; screened: Screened[]; settings: Settings; passing: Pathway[]; presetSets: { pr: Preset; set: Pathway[] }[]; harm: HarmMethod;
}) {
  const [sv, setSv] = useState<SectorView>('main');
  const idx = SECTORS.findIndex((s) => s.key === sector.key);
  const b = useMemo(() => bandStats(sectorMatrix(passing, sector.value)), [passing, sector]);
  const presetBands = useMemo(() => presetSets.map(({ pr, set }) => ({ pr, b: bandStats(sectorMatrix(set, sector.value)) })), [presetSets, sector]);
  const meds = presetBands.filter((x) => x.b.n).map((x) => x.b.q[50][3]);
  const range = meds.length ? { lo: Math.min(...meds), hi: Math.max(...meds) } : undefined;
  const pool = screened.filter((x) => x.stage !== -2);
  const reporting = pool.filter((x) => x.stage >= -1 && YEARS.every((y) => sector.value(x.p, y) != null)).map((x) => x.p);
  const reported = sector.reported ?? sector.value;
  const m20 = reporting.length ? median(reporting.map((p) => reported(p, 2020) as number)) : NaN;
  const mix = harmMix(passing, sector);
  const inv24 = ds.invSectors[2024]?.[sector.key];
  const inv20 = ds.invSectors[2020]?.[sector.key];
  const missing = passing.length - b.n;

  return (
    <Card
      kicker={`Sector ${idx + 1} of 6`}
      title={sector.name}
      lead={<>Median curve from <b className="text-[#3b2468] dark:text-[var(--mh-fg)]">{b.n} of the {passing.length} filtered pathways</b>{missing > 0 ? ` (${missing} do not report this sector for all four years)` : ''}</>}
    >
      {b.n > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <BigTile value={fmtNum(b.q[50][3], 0)} sub={`${sector.unit} in 2050, median of ${b.n} filtered pathways`} />
          <BigTile value={b.n >= 2 ? `${fmtNum(b.q[25][3], 0)} to ${fmtNum(b.q[75][3], 0)}` : '—'} sub="2050, 25–75% of the filtered pathways" />
          <BigTile value={range ? `${fmtNum(range.lo, 0)} to ${fmtNum(range.hi, 0)}` : '—'} sub="2050 median across the six deck settings" tone="orange" />
          <BigTile value={fmtNum(inv24, 0)} sub={`inventory 2024 · models 2020: ${fmtNum(m20, 0)} vs inventory ${fmtNum(inv20, 0)}`} tone="pale" />
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label={`${sector.name} chart`}>
        {([
          ['main', 'Filtered pathways'],
          ['data', 'All pathways vs net GHG'],
          ['settings', 'Six settings'],
          ['levers', 'Levers by setting'],
        ] as [SectorView, string][]).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={sv === id} onClick={() => setSv(id)}
            className={`mh-focus rounded-full border px-3 py-1 text-[11.5px] font-semibold ${sv === id ? 'border-[#608c95] bg-[#608c95] text-white' : 'border-grey-300 text-tertiary hover:border-[#608c95] dark:border-[var(--mh-border)] dark:text-[var(--mh-fg)]'}`}>
            {label}
          </button>
        ))}
      </div>

      {sv === 'main' && (b.n === 0 ? (
        <EmptyState title="Not reported" body={`None of the ${passing.length} filtered pathways reports ${sector.name.toLowerCase()} for all four years.`} />
      ) : (
        <>
          <SectorTrajectory ds={ds} sector={sector} b={b} rangeMarker={range} />
          <Legend items={[
            { label: '5–95%', kind: 'band', color: DECK.tealLight, opacity: 0.45 },
            { label: '25–75%', kind: 'band', color: DECK.teal, opacity: 0.75 },
            { label: `median of the ${b.n} filtered pathways`, kind: 'line', color: DECK.purple },
            { label: 'EEA inventory 2005–2024', kind: 'bar', color: DECK.bar },
            { label: '2050 median across the six settings', kind: 'range', color: DECK.orange },
          ]} />
        </>
      ))}

      {harm !== 'none' && b.n > 0 && (
        <p className="mb-2 text-[11.5px] text-tertiary dark:text-[var(--mh-muted)]">
          Scaled to the EEA inventory 2020 ({fmtNum(inv20, 0)} {sector.unit.replace(' (negative = sink)', '')}; models reported a median of {fmtNum(m20, 0)}).
          Filtered pathways: {mix.ratio} by ratio, {mix.offset} by offset{mix.missing ? `, ${mix.missing} without a 2020 value (not scaled, left out)` : ''}.
          {sector.key === 'industry' ? ' Industry was already harmonised to the 2020 inventory in the export, so the scaling leaves it unchanged.' : ''}
        </p>
      )}
      {sv === 'data' && <SectorDataChart ds={ds} sector={sector} settings={settings} screened={pool} m20={m20} inv20={inv20} harm={harm} />}

      {sv === 'settings' && (
        <>
          <p className="mb-2 text-[12px] text-tertiary dark:text-[var(--mh-muted)]">
            Pathways within all criteria under each deck setting (your filter, risk and source choices carried over): median, 25–75%, 5–95%;
            orange frame: setting of the 2040 advice. Fewer than five pathways: single lines.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {presetBands.map(({ pr, b: pb }) => (
              <SectorTrajectory key={pr.key} ds={ds} sector={sector} b={pb} compact title={pr.label} corner={`n = ${pb.n}`}
                framed={pr.advice} titleColor={pr.advice ? DECK.orange : DECK.tealDark} />
            ))}
          </div>
        </>
      )}

      {sv === 'levers' && <DriverChart sector={sector} settings={settings} presetSets={presetSets} passing={passing} ds={ds} />}

      <p className="mt-3 text-[11px] text-tertiary dark:text-[var(--mh-muted)]">
        {reporting.length.toLocaleString('en-GB')} pathways report this sector. Variable: {sector.variable}. Inventory: {sector.inventory}.
      </p>
    </Card>
  );
}

function SectorDataChart({ ds, sector, settings, screened, m20, inv20, harm }: {
  ds: Dataset; sector: SectorDef; settings: Settings; screened: Screened[]; m20: number; inv20: number | undefined; harm: HarmMethod;
}) {
  const rep = screened.filter((x) => x.stage >= -1 && x.p.det);
  const all = bandStats(sectorMatrix(rep.map((x) => x.p), sector.value));
  const tolSet = settings.netOn ? rep.filter((x) => x.stage >= 1).map((x) => x.p) : [];
  const nz = bandStats(sectorMatrix(tolSet, sector.value));
  const bands = [];
  const lines = [];
  if (all.n) {
    bands.push({ lo: all.q[5], hi: all.q[95], color: DECK.greyMid, opacity: 0.18 }, { lo: all.q[25], hi: all.q[75], color: DECK.greyMid, opacity: 0.35 });
    lines.push({ ys: all.q[50], color: '#6b6b6b', width: 3, label: 'all pathways reporting: median' });
  }
  if (nz.n) {
    bands.push({ lo: nz.q[5], hi: nz.q[95], color: DECK.teal, opacity: 0.28 }, { lo: nz.q[25], hi: nz.q[75], color: DECK.teal, opacity: 0.55 });
    lines.push({ ys: nz.q[50], color: DECK.teal, width: 3, label: `${netLabel(settings.netTol)}: median` });
  }
  if (!all.n) return <EmptyState title="Not reported" body="No pathway reports this sector for all four years." />;
  return (
    <>
      <TrajectoryChart
        ariaLabel={`${sector.name}: all pathways reporting versus pathways meeting the 2050 net GHG rule`}
        years={YEARS} xDomain={[2004, 2052]} xTicks={[2010, 2020, 2030, 2040, 2050]} yLabel={sector.unit} yDomain={sector.yl}
        bars={invBars(ds, sector.key)} bands={bands} lines={lines}
        diamond={Number.isFinite(m20) && harm === 'none' ? { x: 2020, y: m20, color: DECK.purple, title: `2020 in the models (all): median ${fmtNum(m20)} · inventory ${fmtNum(inv20)}` } : undefined}
      />
      <Legend items={[
        { label: `all pathways reporting (${all.n.toLocaleString('en-GB')}): median, 25–75%, 5–95%`, kind: 'line', color: '#6b6b6b' },
        ...(nz.n ? [{ label: `${netLabel(settings.netTol)} in 2050 (${nz.n}): median, 25–75%, 5–95%`, kind: 'line' as const, color: DECK.teal }] : []),
        ...(harm === 'none'
          ? [{ label: `2020 in the models (all): median ${fmtNum(m20, 0)} · inventory ${fmtNum(inv20, 0)}`, kind: 'diamond' as const, color: DECK.purple }]
          : [{ label: `scaled: 2020 = inventory ${fmtNum(inv20, 0)} (models reported a median of ${fmtNum(m20, 0)})`, kind: 'diamond' as const, color: DECK.purple }]),
        { label: 'EEA inventory', kind: 'bar', color: DECK.bar },
      ]} />
      {!settings.netOn && <p className="mt-1 text-[11px] text-tertiary">The 2050 net-GHG step is off, so only all pathways are drawn.</p>}
    </>
  );
}

function DriverChart({ sector, settings, presetSets, passing, ds }: {
  sector: SectorDef; settings: Settings; presetSets: { pr: Preset; set: Pathway[] }[]; passing: Pathway[]; ds: Dataset;
}) {
  const preset = matchesPreset(settings);
  // Columns that are the sector's own emissions follow the inventory scaling; lever columns stay as reported.
  const getter = (col: string, emYear?: number) => (p: Pathway) => (emYear ? sector.value(p, emYear) : p.v[col]);
  const rowsFor = (get: (p: Pathway) => number | null): DriverRow[] => {
    const vals = (set: Pathway[]) => set.map(get).filter((v): v is number => v != null);
    const rows: DriverRow[] = presetSets.map(({ pr, set }) => ({
      label: `${pr.short} (${set.length})`, values: vals(set), group: pr.netTol === 0 ? 'net0' : 'net150', star: pr.advice,
    }));
    if (!preset || !isExportDefault(settings)) rows.push({ label: `current (${passing.length})`, values: vals(passing), group: 'current' });
    return rows;
  };
  // Dotted grey reference: 2020 median in the models, pathways of the nz0 · ≥ 85% setting (drivers.py).
  const nz0all = presetSets.find((x) => x.pr.key === 'nz0|≥ 85%|m0')?.set ?? [];
  const cols: DriverColumn[] = [
    { label: sector.driver.label, unit: sector.driver.unit, rows: rowsFor(getter(sector.driver.col, sector.driver.emYear)), ref: sector.driver.ref, refStyle: 'inventory' },
    ...sector.driverCols.map((d) => {
      let ref: number | null = null; let refStyle: DriverColumn['refStyle'] = 'inventory';
      if (d.refInv != null) ref = d.refInv;
      else if (d.ref20) {
        const v = nz0all.map((p) => p.v[d.ref20!]).filter((x): x is number => x != null);
        if (v.length) { ref = median(v); refStyle = 'model2020'; }
      }
      return { label: d.label, unit: d.unit, rows: rowsFor(getter(d.col, d.emYear)), ref, refStyle };
    }),
  ];
  void ds;
  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {cols.map((c, i) => (
          <div key={c.label} className={i === 0 ? 'w-[440px] shrink-0' : 'w-[240px] shrink-0'}>
            <DriverColumnChart col={c} strip={i === 0} showLabels={i === 0} />
          </div>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-tertiary dark:text-[var(--mh-muted)]">
        First panel: each dot one pathway within all criteria. Other panels: range (min to max) with the median as a black tick.
        Orange dashed line: inventory reference ({sector.driver.refLabel}); grey dotted line: 2020 median in the models.
        ★ setting of the 2040 advice; purple: net GHG ≤ 0, blue: ≤ 150 Mt{!preset || !isExportDefault(settings) ? ', orange: your current setting' : ''}.
      </p>
    </>
  );
}

// ── settings view ────────────────────────────────────────────────────────

function SettingsView({ ds, sectors, passing, presetSets, settings }: {
  ds: Dataset; sectors: SectorDef[]; passing: Pathway[]; presetSets: { pr: Preset; set: Pathway[] }[]; settings: Settings;
}) {
  const showCurrent = !matchesPreset(settings) || !isExportDefault(settings);
  if (!sectors.length) return <EmptyState title="No sector selected" body="Pick at least one sector above." />;
  return (
    <div className="space-y-6">
      <Card kicker="Open question" title="2050 sector emissions by setting"
        lead="Median of the pathways within all criteria; orange ring: setting of the 2040 advice (net GHG ≤ 150 Mt, 85–95%). Your other choices (sources, filter and risk limits, margin) are carried over to the six settings.">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
          {sectors.map((s) => {
            const rows: DotRow[] = presetSets.map(({ pr, set }) => {
              const b = bandStats(sectorMatrix(set, s.value));
              return { label: pr.short, value: b.n ? b.q[50][3] : null, n: b.n, group: pr.netTol === 0 ? 'net0' : 'net150', advice: pr.advice };
            });
            if (showCurrent) {
              const b = bandStats(sectorMatrix(passing, s.value));
              rows.push({ label: 'current', value: b.n ? b.q[50][3] : null, n: b.n, group: 'current' });
            }
            return <SettingsDotPlot key={s.key} title={s.name} unit={s.unit} rows={rows} />;
          })}
        </div>
        <p className="mt-2 text-[11px] text-tertiary dark:text-[var(--mh-muted)]">
          Where no filtered pathway is above the upper bound, the closed and the open window give the same set (in the deck: 85–95% and ≥ 85%).
          {showCurrent ? ' Open circle: your current setting.' : ''}
        </p>
      </Card>

      <Card kicker="Six settings" title="Number of pathways within all criteria per setting">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[12px]">
            <thead>
              <tr className="bg-[#608c95] text-left text-white">
                <th className="px-3 py-2 font-semibold">Setting</th>
                <th className="px-3 py-2 text-right font-semibold">Pathways</th>
                <th className="px-3 py-2 font-semibold">Sources</th>
              </tr>
            </thead>
            <tbody>
              {presetSets.map(({ pr, set }) => {
                const by = Object.entries(set.reduce<Record<string, number>>((a, p) => ({ ...a, [p.src]: (a[p.src] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
                return (
                  <tr key={pr.key} className={`border-b border-grey-200 dark:border-[var(--mh-border)] ${pr.advice ? 'font-semibold' : ''}`}>
                    <td className={`px-3 py-1.5 ${pr.advice ? 'text-[#ec621d]' : 'text-tertiary-dark dark:text-[var(--mh-fg)]'}`}>{pr.advice ? '★ ' : ''}{pr.label}</td>
                    <td className="px-3 py-1.5 text-right font-mono font-bold tabular-nums text-[#3b2468] dark:text-[var(--mh-fg)]">{set.length}</td>
                    <td className="px-3 py-1.5 text-[11px] text-tertiary dark:text-[var(--mh-muted)]">{by.map(([s, n]) => `${SRC_LABEL[s] ?? s} ${n}`).join(', ') || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <LeversCard sectors={sectors} passing={passing} />
      <MethodCard ds={ds} sectors={sectors} passing={passing} />
    </div>
  );
}

function LeversCard({ sectors, passing }: { sectors: SectorDef[]; passing: Pathway[] }) {
  if (!passing.length) return null;
  return (
    <Card kicker="Levers" title="What changes by 2050 in the filtered pathways"
      lead={`Median of the ${passing.length} filtered pathways, 2020 → 2050 as reported; industry energy only available for 2040`}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sectors.map((s) => {
          const b = bandStats(sectorMatrix(passing, s.value));
          return (
            <div key={s.key} className="border-t-[6px] border-[#608c95] bg-[#eef3f4] px-4 py-3 dark:bg-[var(--mh-bg)]">
              <h3 className="text-[15px] font-bold text-[#3f6670] dark:text-[var(--mh-fg)]">{s.name}</h3>
              <p className="mb-1.5 text-[11.5px] text-grey-500">
                2050 residual, median: <b className="font-mono text-[13px] text-[#3b2468] dark:text-[var(--mh-fg)]">{b.n ? `${fmtNum(b.q[50][3], 0)} ${s.unit.replace(' (negative = sink)', '')}` : '—'}</b>
              </p>
              {s.levers.map((l) => {
                let text = 'not reported'; let n = 0;
                if (l.col) {
                  const v = passing.map((p) => p.v[l.col!]).filter((x): x is number => x != null);
                  n = v.length;
                  if (n) text = `${fmtNum(median(v))} (${l.colYear})`;
                } else if (l.stem) {
                  const a = passing.map((p) => p.v[`${l.stem}_2020`]).filter((x): x is number => x != null);
                  const z = passing.map((p) => p.v[`${l.stem}_2050`]).filter((x): x is number => x != null);
                  n = z.length;
                  if (a.length && z.length) text = `${fmtNum(median(a))} → ${fmtNum(median(z))}`;
                }
                return (
                  <div key={l.label} className="flex items-baseline justify-between gap-2 border-b border-[#d6e2e4] py-1 text-[12px] text-tertiary dark:border-[var(--mh-border)] dark:text-[var(--mh-muted)]">
                    <span>{l.label} <em className="not-italic text-[10.5px] text-grey-500">{l.unit} · n={n}</em></span>
                    <span className="font-mono font-bold tabular-nums text-[#3b2468] dark:text-[var(--mh-fg)]">{text}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-tertiary dark:text-[var(--mh-muted)]">
        Wind and solar: Secondary Energy|Electricity|Wind, |Solar, converted from EJ to TWh (× 277.78). Hydrogen production: Secondary Energy|Hydrogen.
        Mobility and buildings: Final Energy|Transportation, |Residential and Commercial. Industry: Final Energy|Industry|Electricity, |Hydrogen; Carbon Capture|Industry.
        Forest: Land Cover|Forest. Each median is taken over the pathways reporting that year.
      </p>
    </Card>
  );
}

function MethodCard({ ds, sectors, passing }: { ds: Dataset; sectors: SectorDef[]; passing: Pathway[] }) {
  return (
    <Card kicker="Method and data" title="Screening and sector data">
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ['1 · Net GHG 2050', 'EU net GHG ≤ tolerance (deck: ≤ 0 or ≤ 150 Mt CO₂e)'],
          ['2 · 2040 window', 'Net GHG cut vs 1990 (deck: 85–90%, 85–95% or ≥ 85%, rounded)'],
          ['3 · ESABCC filter', 'Feasibility limits, ESABCC (2023) Table 5'],
          ['4 · Risk levels', 'Sustainability limits, ESABCC (2023) Table 6'],
        ].map(([h, p]) => (
          <div key={h} className="border-t-[6px] border-[#608c95] bg-[#eef3f4] px-3 py-2.5 dark:bg-[var(--mh-bg)]">
            <h3 className="text-[13px] font-bold text-[#3f6670] dark:text-[var(--mh-fg)]">{h}</h3>
            <p className="mt-1 text-[11.5px] text-tertiary dark:text-[var(--mh-muted)]">{p}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-[12px]">
          <thead>
            <tr className="bg-[#608c95] text-left text-white">
              <th className="px-3 py-2 font-semibold">Sector</th>
              <th className="px-3 py-2 font-semibold">Scenario variable</th>
              <th className="px-3 py-2 font-semibold">Inventory</th>
              <th className="px-3 py-2 text-right font-semibold">Reporting</th>
              <th className="px-3 py-2 text-right font-semibold">Filtered</th>
              <th className="px-3 py-2 text-right font-semibold">2020 models, as reported (median)</th>
              <th className="px-3 py-2 text-right font-semibold">2020 inventory</th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((s) => {
              const rep = ds.pathways.filter((p) => p.det && YEARS.every((y) => (s.reported ?? s.value)(p, y) != null));
              const filt = sectorMatrix(passing, s.value).length;
              return (
                <tr key={s.key} className="border-b border-grey-200 dark:border-[var(--mh-border)]">
                  <td className="px-3 py-1.5 font-semibold text-tertiary-dark dark:text-[var(--mh-fg)]">{s.name}</td>
                  <td className="px-3 py-1.5 text-[11px] text-tertiary dark:text-[var(--mh-muted)]">{s.variable}</td>
                  <td className="px-3 py-1.5 text-[11px] text-tertiary dark:text-[var(--mh-muted)]">{s.inventory}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{rep.length.toLocaleString('en-GB')}</td>
                  <td className="px-3 py-1.5 text-right font-mono font-bold tabular-nums text-[#3b2468] dark:text-[var(--mh-fg)]">{filt}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{rep.length ? fmtNum(median(rep.map((p) => (s.reported ?? s.value)(p, 2020) as number)), 0) : '—'}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{fmtNum(ds.invSectors[2020]?.[s.key], 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-tertiary dark:text-[var(--mh-muted)]">
        Pathways: IIASA scenario databases (Scenario Compass v2.0, National Scenario Compass, NAVIGATE, ECEMF, CircEUlar, SHAPE, DEEDS, ESABCC 2023,
        NGFS 4 and 5), Schreyer et al. (2025), JRC, POLIZERO. Only industry is harmonised to the inventory. CO₂e with AR5 GWP (CH₄ 28, N₂O 265).
        Inventory: EEA (2026), UNFCCC submission, EU.{' '}
        <a href={DECK_URL} target="_blank" rel="noreferrer" className="mh-focus font-semibold text-primary hover:underline dark:text-[#74CBC8]">Open the original deck ↗</a>
      </p>
    </Card>
  );
}

// ── pathway table ────────────────────────────────────────────────────────

const PAGE = 25;
type SortKey = 'stage' | 'src' | 'model' | 'scenario' | 'net50' | 'red' | `sec:${SectorKey}`;

function PathwayTable({ screened, sectors, allSectors, summary, harm, netValue }: {
  screened: Screened[]; sectors: SectorDef[]; allSectors: SectorDef[]; summary: string; harm: HarmMethod; netValue: (p: Pathway, y: number) => number | null;
}) {
  const [stageFilter, setStageFilter] = useState<number | 'all'>(4);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'stage', dir: -1 });
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [stageFilter, q, sort, screened]);

  const counts = useMemo(() => {
    const c: Record<number, number> = {};
    for (const x of screened) c[x.stage] = (c[x.stage] ?? 0) + 1;
    return c;
  }, [screened]);

  const sortVal = (x: Screened, k: SortKey): number | string => {
    if (k === 'stage') return x.stage;
    if (k === 'src' || k === 'model' || k === 'scenario') return x.p[k].toLowerCase();
    if (k === 'net50' || k === 'red') return x.p.v[k] ?? -Infinity;
    return (allSectors.find((s) => s.key === k.slice(4)) ?? SECTOR_BY_KEY[k.slice(4) as SectorKey]).value(x.p, 2050) ?? -Infinity;
  };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return screened
      .filter((x) => stageFilter === 'all' || x.stage === stageFilter)
      .filter((x) => !needle || `${x.p.model} ${x.p.scenario} ${x.p.pool} ${SRC_LABEL[x.p.src] ?? x.p.src}`.toLowerCase().includes(needle))
      .sort((a, b) => {
        const va = sortVal(a, sort.key), vb = sortVal(b, sort.key);
        return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screened, stageFilter, q, sort, allSectors]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);

  const download = () => {
    const sfx = harm === 'none' ? '' : '_scaled';
    const head = ['source', 'pool', 'model', 'scenario', 'stage', 'stage_label', 'reasons', 'net_ghg_2050_reported', ...(sfx ? [`net_ghg_2050${sfx}`] : []), 'cut_2040_pct', ...allSectors.flatMap((s) => [`${s.key}_2050_reported`, ...(sfx ? [`${s.key}_2050${sfx}`] : [])])];
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      `# Internal: contains Scenario Compass v2.0 data under embargo. Setting: ${summary}. ${harm === 'none' ? 'Values as reported.' : `Scaled columns: 2020 set to the EEA inventory 2020 (${harm === 'ratio' ? 'ratio, offset where the ratio is unusable' : 'offset'}).`}`,
      head.join(','),
      ...rows.map((x) => [
        SRC_LABEL[x.p.src] ?? x.p.src, x.p.pool, x.p.model, x.p.scenario, x.stage, STAGE_LABEL[x.stage], x.reasons.join('; '),
        x.p.v.net50, ...(sfx ? [netValue(x.p, 2050)] : []), x.p.v.red, ...allSectors.flatMap((s) => [(s.reported ?? s.value)(x.p, 2050), ...(sfx ? [s.value(x.p, 2050)] : [])]),
      ].map(esc).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'scenario-pathways-screened.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const Th = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th className={`px-2 py-2 font-semibold ${right ? 'text-right' : 'text-left'}`} aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="mh-focus inline-flex items-center gap-1 hover:underline"
        onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {children}{sort.key === k ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  );

  return (
    <Card kicker="All scenarios" title="Every pathway and where it drops out" lead="Filter by screening outcome, search by model or scenario, sort by any column. The download carries the current setting.">
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <FilterPill label="All" count={screened.length} active={stageFilter === 'all'} onClick={() => setStageFilter('all')} />
        {[4, 3, 2, 1, 0, -1, -2].filter((k) => counts[k]).map((k) => (
          <FilterPill key={k} label={STAGE_LABEL[k]} count={counts[k]} active={stageFilter === k} onClick={() => setStageFilter(k)} />
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search model, scenario or source…"
          aria-label="Search pathways"
          className="mh-focus w-full max-w-sm rounded border border-grey-300 bg-white px-3 py-1.5 text-[12.5px] dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)] dark:text-[var(--mh-fg)]"
        />
        <button type="button" onClick={download} disabled={!rows.length}
          className="mh-focus rounded border border-primary px-3 py-1.5 text-[12px] font-semibold text-primary hover:bg-surface-blue disabled:opacity-40 dark:text-[#74CBC8]">
          ↓ CSV ({rows.length.toLocaleString('en-GB')})
        </button>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No pathway matches" body="Change the outcome filter or the search text." primaryAction={{ label: 'Show all', onClick: () => { setStageFilter('all'); setQ(''); } }} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-[12px]">
              <thead>
                <tr className="bg-[#608c95] text-white">
                  <Th k="src">Source</Th>
                  <Th k="model">Model</Th>
                  <Th k="scenario">Scenario</Th>
                  <Th k="net50" right>Net GHG 2050</Th>
                  <Th k="red" right>2040 cut %</Th>
                  <Th k="stage">Outcome</Th>
                  {sectors.map((s) => <Th key={s.key} k={`sec:${s.key}`} right>{s.name} 2050{harm !== 'none' ? ' (scaled)' : ''}</Th>)}
                </tr>
              </thead>
              <tbody>
                {shown.map((x) => (
                  <tr key={x.p.id} className="border-b border-grey-200 align-top dark:border-[var(--mh-border)]">
                    <td className="px-2 py-1.5 text-tertiary dark:text-[var(--mh-muted)]" title={x.p.pool}>{SRC_LABEL[x.p.src] ?? x.p.src}</td>
                    <td className="px-2 py-1.5 text-tertiary-dark dark:text-[var(--mh-fg)]">{x.p.model}</td>
                    <td className="px-2 py-1.5 font-medium text-tertiary-dark dark:text-[var(--mh-fg)] [overflow-wrap:anywhere] min-w-[180px]">{x.p.scenario}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmtNum(x.p.v.net50, 0)}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmtNum(x.p.v.red, 1)}</td>
                    <td className="px-2 py-1.5"><StageBadge s={x} /></td>
                    {sectors.map((s) => <td key={s.key} className="px-2 py-1.5 text-right font-mono tabular-nums">{fmtNum(s.value(x.p, 2050), 0)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between text-[12px] text-tertiary dark:text-[var(--mh-muted)]">
            <span className="font-mono tabular-nums">{page * PAGE + 1}–{Math.min(rows.length, page * PAGE + PAGE)} of {rows.length.toLocaleString('en-GB')}</span>
            <span className="flex gap-1.5">
              <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="mh-focus rounded border border-grey-300 px-2 py-1 disabled:opacity-40 dark:border-[var(--mh-border)]">← Previous</button>
              <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="mh-focus rounded border border-grey-300 px-2 py-1 disabled:opacity-40 dark:border-[var(--mh-border)]">Next →</button>
            </span>
          </div>
        </>
      )}
    </Card>
  );
}

function StageBadge({ s }: { s: Screened }) {
  const tone = s.stage === 4 ? 'bg-[#3b2468] text-white' : s.stage === 3 ? 'bg-[#eef3f4] text-[#3f6670]' : s.stage === 2 ? 'bg-[#eef3f4] text-[#3f6670]' : 'bg-grey-100 text-grey-500';
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className={`inline-block w-fit whitespace-nowrap rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${tone}`}>{STAGE_LABEL[s.stage]}</span>
      {s.reasons.length > 0 && <span className="text-[10.5px] text-tertiary dark:text-[var(--mh-muted)]">{s.reasons.join(' · ')}</span>}
    </span>
  );
}

// ── shared layout bits ───────────────────────────────────────────────────

function Card({ kicker, title, lead, children }: { kicker: string; title: string; lead?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-grey-200 bg-white p-4 sm:p-5 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#ec621d]">{kicker}</p>
      <h2 className="mt-0.5 text-[20px] font-extrabold leading-tight text-[#608c95] sm:text-[24px]">{title}</h2>
      {lead && <p className="mt-1 text-[13px] text-[#474747] dark:text-[var(--mh-muted)]">{lead}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function BigTile({ value, sub, tone }: { value: string; sub: string; tone?: 'orange' | 'pale' }) {
  const border = tone === 'orange' ? 'border-[#ec621d]' : tone === 'pale' ? 'border-[#97b4ba]' : 'border-[#3b2468]';
  const color = tone === 'orange' ? 'text-[#ec621d]' : tone === 'pale' ? 'text-[#3f6670]' : 'text-[#3b2468]';
  return (
    <div className={`border-l-[6px] ${border} bg-[#eef3f4] px-3 py-2 dark:bg-[var(--mh-bg)]`}>
      <b className={`block font-mono text-[22px] font-extrabold tabular-nums ${color} dark:brightness-150`}>{value}</b>
      <span className="text-[11px] leading-snug text-[#474747] dark:text-[var(--mh-muted)]">{sub}</span>
    </div>
  );
}

