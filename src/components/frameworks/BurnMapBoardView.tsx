/**
 * Advanced version 8 — burn-map board view (the headline figure).
 *
 * The container for the burn-map flow chart (BurnMapFlow): the
 * overarching-goal banner, the intro blurb, the "why two heat maps"
 * rationale, the legend with totals, the twin heat maps with the burn ledger
 * and the single recommendation, and the shared indicator data drawer. Like
 * Advanced version 7 this is a computed, read-only analytical view — map B
 * and the burn ledger are computed live from the beta policy-coherence
 * model, progress cells with linked indicators open the data drawer, and
 * "Open in indicator list" hands the id back to the parent module.
 */
'use client';
import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Indicator } from '@/data/ecno-indicators';
import { FRAMEWORK_INDICATOR_INDEX } from '@/data/sector-frameworks';
import {
  buildBoardProfiles,
  computeBurnLedger,
  defaultBurnMapBoardV8,
  GRADE_META,
  READING_META,
  REC_STATUS_META,
} from '@/data/burn-map-v8';
import BurnMapFlow from './BurnMapFlow';
import IndicatorDetail from './IndicatorDetail';
import type { OpenIndicatorPayload } from './SectorFlow';

interface Props {
  allIndicators: Indicator[];
  onOpenInList?: (id: string) => void;
}

export default function BurnMapBoardView({ allIndicators, onOpenInList }: Props) {
  const board = useMemo(() => defaultBurnMapBoardV8(), []);
  const profiles = useMemo(() => buildBoardProfiles(board), [board]);
  const ledger = useMemo(() => computeBurnLedger(board, profiles), [board, profiles]);
  const [drawer, setDrawer] = useState<OpenIndicatorPayload | null>(null);

  const lookup = useMemo(() => {
    const m = new Map<string, Indicator>();
    for (const i of allIndicators) m.set(i.id, i);
    return m;
  }, [allIndicators]);
  const resolve = useCallback(
    (ids: string[]) =>
      ids
        .map((id) => lookup.get(id) ?? FRAMEWORK_INDICATOR_INDEX[id])
        .filter(Boolean) as Indicator[],
    [lookup],
  );
  const drawerIndicators = useMemo(() => (drawer ? resolve(drawer.indicatorIds) : []), [drawer, resolve]);

  const totals = useMemo(() => {
    const acts = new Set(board.sectors.flatMap((s) => s.policyIds)).size;
    return {
      progressCells: board.sectors.reduce((n, s) => n + s.cells.length, 0),
      acts,
      coherenceCells: Array.from(profiles.values()).reduce(
        (n, p) => n + Object.values(p.stepGrades).filter((g) => g !== 'not-assessed').length,
        0,
      ),
      burns: ledger.burns.length,
    };
  }, [board, profiles, ledger]);

  return (
    <div>
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 mb-4">
        <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold mb-0.5">
          Two heat maps · one burn ledger · one recommendation
        </div>
        <div className="text-base font-bold text-tertiary-dark leading-snug">
          A climate-neutral and climate-resilient EU by 2050
        </div>
        <p className="text-xs text-tertiary mt-1 max-w-3xl">
          The headline figure joins <span className="font-semibold">what the monitoring shows</span>{' '}
          (per-sector progress readings) to{' '}
          <span className="font-semibold">what the policy analysis shows</span> (the four-step
          coherence assessment of each sector&apos;s acts) — and derives from their{' '}
          <span className="font-semibold">burns 🔥</span> a single recommendation whose three fronts
          claim every burning cell on the board.
        </p>
      </div>

      <p className="text-sm text-tertiary mb-4 max-w-3xl">
        <span className="font-semibold text-red-700">Advanced version 8</span> is the{' '}
        <span className="font-semibold">burn map</span>. Map A scores every sector on four monitoring
        lenses — emissions &amp; removals, technology &amp; delivery, demand &amp; activity, investment
        &amp; enablers — each reading stated with its observation and source. Map B sits directly
        beside it in the same sector band: the sector&apos;s EU acts scored on the four steps of the{' '}
        <Link href="/beta/policy-coherence" className="text-amber-800 underline hover:no-underline">
          beta policy-coherence model
        </Link>{' '}
        (ex-ante assumptions · goal interactions · goals ↔ means · evaluation), computed live from
        that model so the two boards can never diverge. Cells that burn — off track on map A,
        incoherent on map B — are collected into the burn ledger and assigned to a response front by a
        declared rule; the figure ends in <span className="font-semibold">one recommendation</span>,
        not a list.
      </p>

      {/* Why two heat maps — the rationale. */}
      <div className="rounded-xl border border-red-200 bg-red-50/40 px-4 py-3 mb-4 max-w-3xl">
        <div className="text-[11px] uppercase tracking-wide text-red-700 font-semibold mb-2">
          Why two heat maps and one recommendation?
        </div>
        <ul className="list-disc pl-4 space-y-1.5 text-[12px] text-tertiary">
          <li>
            <span className="font-semibold">A burn on one map is ambiguous; a burn on both is a
            diagnosis.</span> Off-track outcomes under coherent policy point to implementation;
            incoherent policy over on-track outcomes points to luck. The land system is the only part
            of the board burning on both maps at once — which is exactly why it leads the
            recommendation.
          </li>
          <li>
            <span className="font-semibold">The two maps burn in different places — that asymmetry is
            the finding.</span> Outside the land system, the monitoring map burns almost only in
            demand-side cells (transport demand, electrification, diets, investment), and the
            coherence map burns almost only where adopted acts were weakened at first contact (CO₂
            averaging, omnibus de-scoping, GAEC relaxation, persistent NECP gaps).
          </li>
          <li>
            <span className="font-semibold">One recommendation, mechanically derived.</span> Every
            burn is assigned to a front by a declared rule — land burns → front ①, remaining
            monitoring burns → front ②, remaining coherence burns → front ③ — so the advice covers the
            board by construction, and each front is backed by the ESABCC&apos;s own recommendations
            with live uptake status.
          </li>
        </ul>
      </div>

      {/* Legend — the vocabularies of the two maps. */}
      <div className="rounded-xl border border-grey-200 bg-grey-50 px-3 py-2.5 mb-4">
        <div className="text-[10px] uppercase tracking-wide font-semibold text-tertiary mb-2">
          How to read the figure
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10.5px]">
          <span className="inline-flex items-center gap-1.5">
            <span className="font-semibold text-tertiary-dark">Map A readings:</span>
            {(Object.keys(READING_META) as (keyof typeof READING_META)[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: READING_META[k].color }} />
                {READING_META[k].label}
              </span>
            ))}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-semibold text-tertiary-dark">Map B grades:</span>
            {(['coherent', 'partial', 'incoherent', 'not-assessed'] as const).map((k) => (
              <span key={k} className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: GRADE_META[k].color }} />
                {GRADE_META[k].label}
              </span>
            ))}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-semibold text-tertiary-dark">Advice uptake:</span>
            {(Object.keys(REC_STATUS_META) as (keyof typeof REC_STATUS_META)[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-0.5" style={{ color: REC_STATUS_META[k].color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: REC_STATUS_META[k].color }} />
                {REC_STATUS_META[k].label}
              </span>
            ))}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px]">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-grey-200 px-2 py-1">
          <span className="w-2 h-2 rounded-full" style={{ background: '#3D6E8C' }} />
          <span className="font-semibold text-tertiary-dark">
            {totals.progressCells} progress readings
          </span>
          <span className="text-tertiary-light">· {board.sectors.length} sectors × 4 lenses</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-grey-200 px-2 py-1">
          <span className="font-semibold text-amber-800">§</span>
          <span className="font-semibold text-tertiary-dark">
            {totals.acts} acts · {totals.coherenceCells} coherence grades
          </span>
          <span className="text-tertiary-light">· computed live</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2 py-1 bg-red-50/40">
          <span aria-hidden="true">🔥</span>
          <span className="font-semibold text-red-700">{totals.burns} burns</span>
          <span className="text-tertiary-light">
            · {ledger.progressCount} monitoring · {ledger.coherenceCount} coherence
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-grey-200 px-2 py-1">
          <span className="font-semibold text-tertiary-dark">⇒ 1 recommendation</span>
          <span className="text-tertiary-light">· 3 fronts · every burn claimed</span>
        </span>
      </div>

      <BurnMapFlow board={board} profiles={profiles} onOpenIndicator={setDrawer} />

      {drawer && (
        <IndicatorDetail
          title={drawer.title}
          code={drawer.code}
          indicators={drawerIndicators}
          onClose={() => setDrawer(null)}
          onOpenInList={
            onOpenInList
              ? (id) => {
                  onOpenInList(id);
                  setDrawer(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
