/**
 * Advanced version 8 — steering-panorama board view (the headline figure).
 *
 * The container for the panorama flow chart (HeadlineFigureFlow): the
 * overarching-goal banner, the intro blurb, the "why one figure" rationale,
 * the verdict legend with totals, the three-layer panorama with its expandable
 * sector chains, and the shared indicator data drawer. Like Advanced version 7
 * this is a computed, read-only analytical view — clicking an indicator chip
 * opens its data, instrument chips deep-link into the Policy Navigator, and
 * "Open in indicator list" hands the id back to the parent module.
 */
'use client';
import { useCallback, useMemo, useState } from 'react';
import type { Indicator } from '@/data/ecno-indicators';
import { FRAMEWORK_INDICATOR_INDEX } from '@/data/sector-frameworks';
import {
  CONTRIBUTION_META,
  defaultHeadlineFigureBoardV8,
  PACE_META,
  REC_STATUS_META,
} from '@/data/headline-figure-v8';
import HeadlineFigureFlow from './HeadlineFigureFlow';
import IndicatorDetail from './IndicatorDetail';
import type { OpenIndicatorPayload } from './SectorFlow';

interface Props {
  allIndicators: Indicator[];
  onOpenInList?: (id: string) => void;
}

export default function HeadlineFigureBoardView({ allIndicators, onOpenInList }: Props) {
  const board = useMemo(() => defaultHeadlineFigureBoardV8(), []);
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
    const recs = board.sectors.flatMap((s) => s.recommendations.items);
    return {
      benchmarks: board.sectors.reduce(
        (n, s) => n + s.progress.benchmarks.reduce((m, b) => m + b.targets.length, 0),
        0,
      ),
      indicators: board.sectors.reduce(
        (n, s) => n + s.progress.observed.length + s.progress.drivers.length,
        0,
      ),
      instruments: board.sectors.reduce((n, s) => n + s.policy.instruments.length, 0),
      lagging: board.sectors.reduce(
        (n, s) => n + s.policy.instruments.filter((p) => p.contribution === 'lagging').length,
        0,
      ),
      recommendations: recs.length,
      unaddressed: recs.filter((r) => r.status === 'not-addressed').length,
    };
  }, [board]);

  return (
    <div>
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 mb-4">
        <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold mb-0.5">
          One overarching goal · three layers · one thread per sector
        </div>
        <div className="text-base font-bold text-tertiary-dark leading-snug">
          A climate-neutral and climate-resilient EU by 2050
        </div>
        <p className="text-xs text-tertiary mt-1 max-w-3xl">
          The headline figure connects the three things a progress report must connect:{' '}
          <span className="font-semibold">what the monitoring shows</span> (per-sector pace against the
          scenario corridor), <span className="font-semibold">what the policies deliver</span> (each
          instrument scored for its contribution), and{' '}
          <span className="font-semibold">what the Board therefore recommends</span> (its own advice,
          with live uptake status). Reading any sector top-to-bottom is an argument, not a collage.
        </p>
      </div>

      <p className="text-sm text-tertiary mb-4 max-w-3xl">
        <span className="font-semibold text-sky-700">Advanced version 8</span> is the{' '}
        <span className="font-semibold">steering panorama</span> — built to be the major figure of a
        report. Three stacked layers —{' '}
        <span className="font-semibold">① progress · ② policy · ③ recommendations</span> — are pierced
        by one vertical thread per sector, so the derivation is visible in the geometry itself: the
        measured gap (①) is explained by the instrument mix (②), and the explanation points at the
        advice (③). View it as a 3-D stack or flatten it for print; hover a sector to light its thread;
        click it to expand the full chain. Every chip is live data — indicators open the data drawer,
        instruments deep-link into the Policy Navigator, and recommendation statuses come from the
        tracker, so the figure cannot drift from the registries beneath it.
      </p>

      {/* Why one figure — the rationale. */}
      <div className="rounded-xl border border-sky-200 bg-sky-50/40 px-4 py-3 mb-4 max-w-3xl">
        <div className="text-[11px] uppercase tracking-wide text-sky-700 font-semibold mb-2">
          Why one figure, not three chapters?
        </div>
        <ul className="list-disc pl-4 space-y-1.5 text-[12px] text-tertiary">
          <li>
            <span className="font-semibold">A verdict without an explanation is a scoreboard.</span>{' '}
            Earlier versions show the pace (the chains, the loop) or the structure (the matrix); this
            figure forces every pace verdict to sit directly above the instruments that do — or do not —
            explain it. Transport is the demonstration: strong standards, late prices, off-track line.
          </li>
          <li>
            <span className="font-semibold">An explanation without consequences is a commentary.</span>{' '}
            The third layer is the Board&apos;s own advice, resolved live from the recommendation
            tracker — so where layer ② shows a lagging instrument, layer ③ shows whether the
            corresponding recommendation has been addressed, and the figure exposes the uncomfortable
            pattern: the worst-performing threads carry the most unaddressed advice.
          </li>
          <li>
            <span className="font-semibold">The derivation is stated, not implied.</span> Each
            recommendation chip names the gap it responds to, and each sector chain states its argument
            in one line — gap ⇒ instrument mix ⇒ advice cluster. That is the method of the report,
            drawn as its cover.
          </li>
        </ul>
      </div>

      {/* The verdict legend — the three vocabularies of the figure. */}
      <div className="rounded-xl border border-grey-200 bg-grey-50 px-3 py-2.5 mb-4">
        <div className="text-[10px] uppercase tracking-wide font-semibold text-tertiary mb-2">
          How to read the three layers
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10.5px]">
          <span className="inline-flex items-center gap-1.5">
            <span className="font-semibold text-tertiary-dark">① Pace:</span>
            {(Object.keys(PACE_META) as (keyof typeof PACE_META)[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-0.5" style={{ color: PACE_META[k].color }}>
                {PACE_META[k].glyph} {PACE_META[k].label}
              </span>
            ))}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-semibold text-tertiary-dark">② Contribution:</span>
            {(Object.keys(CONTRIBUTION_META) as (keyof typeof CONTRIBUTION_META)[]).map((k) => (
              <span key={k} style={{ color: CONTRIBUTION_META[k].color }}>
                § {CONTRIBUTION_META[k].label}
              </span>
            ))}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-semibold text-tertiary-dark">③ Uptake:</span>
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
          <span className="font-semibold text-indigo-700">⌖</span>
          <span className="font-semibold text-tertiary-dark">{totals.benchmarks} scenario benchmarks</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-grey-200 px-2 py-1">
          <span className="w-2 h-2 rounded-full" style={{ background: '#9E4A46' }} />
          <span className="font-semibold text-tertiary-dark">{totals.indicators} indicators</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-grey-200 px-2 py-1">
          <span className="font-semibold text-amber-800">§</span>
          <span className="font-semibold text-tertiary-dark">{totals.instruments} instruments</span>
          <span className="text-tertiary-light">· {totals.lagging} lagging</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-grey-200 px-2 py-1">
          <span className="font-semibold text-sky-700">▣</span>
          <span className="font-semibold text-tertiary-dark">
            {totals.recommendations} recommendations
          </span>
          <span className="text-tertiary-light">· {totals.unaddressed} not addressed</span>
        </span>
        <span className="text-tertiary-light">across {board.sectors.length} sector threads</span>
      </div>

      <HeadlineFigureFlow board={board} onOpenIndicator={setDrawer} />

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
