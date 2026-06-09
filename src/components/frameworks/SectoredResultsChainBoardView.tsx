/**
 * Advanced version 5 — sectored results-chain board view.
 *
 * The container for the sectored results-chain flow chart
 * (SectoredResultsChainFlow): the intro blurb, the sector-coverage legend, the
 * six-rung board, and the shared indicator data drawer. Like Advanced version 2
 * this is a computed, read-only analytical view — the whole indicator catalogue
 * re-clustered along the M&E results chain — but here every rung/track is also
 * sub-clustered by sector, and the legend reports how many sectors the chain
 * covers. Clicking a chip opens its data; "Open in indicator list" hands the id
 * back to the parent module.
 */
'use client';
import { useCallback, useMemo, useState } from 'react';
import type { Indicator } from '@/data/ecno-indicators';
import { FRAMEWORK_INDICATOR_INDEX } from '@/data/sector-frameworks';
import { defaultResultsChainBoardV5, sectorCoverage } from '@/data/results-chain-v5';
import SectoredResultsChainFlow from './SectoredResultsChainFlow';
import IndicatorDetail from './IndicatorDetail';
import type { OpenIndicatorPayload } from './SectorFlow';

interface Props {
  allIndicators: Indicator[];
  onOpenInList?: (id: string) => void;
}

export default function SectoredResultsChainBoardView({ allIndicators, onOpenInList }: Props) {
  const board = useMemo(() => defaultResultsChainBoardV5(), []);
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
    const all = board.groups.flatMap((g) => g.items);
    return {
      mitigation: all.filter((i) => i.track === 'mitigation').length,
      adaptation: all.filter((i) => i.track === 'adaptation').length,
    };
  }, [board]);

  const coverage = useMemo(() => sectorCoverage(board), [board]);

  return (
    <div>
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 mb-4">
        <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold mb-0.5">
          One overarching goal
        </div>
        <div className="text-base font-bold text-tertiary-dark leading-snug">
          A climate-neutral and climate-resilient EU by 2050
        </div>
        <p className="text-xs text-tertiary mt-1 max-w-3xl">
          Mitigation and adaptation are equal-weight branches of one goal: cut emissions to net zero, and
          reduce the risk, loss and vulnerability from the warming already locked in.
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white border border-grey-200 px-2 py-1">
            <span className="w-2 h-2 rounded-full" style={{ background: '#9E4A46' }} />
            <span className="font-semibold text-tertiary-dark">Mitigation</span>
            <span className="text-tertiary-light">— cut emissions to net zero</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white border border-grey-200 px-2 py-1">
            <span className="w-2 h-2 rounded-full" style={{ background: '#2E7D74' }} />
            <span className="font-semibold text-tertiary-dark">⛨ Adaptation &amp; resilience</span>
            <span className="text-tertiary-light">— reduce risk, loss &amp; vulnerability</span>
          </span>
          <span className="text-tertiary-light self-center">equal-weight branches of the same goal</span>
        </div>
      </div>
      <p className="text-sm text-tertiary mb-4 max-w-3xl">
        <span className="font-semibold text-purple-700">Advanced version 5</span> builds on{' '}
        <span className="font-semibold">Advanced version 2</span>: the same six-rung{' '}
        <span className="font-semibold">monitoring-&amp;-evaluation results chain</span> —{' '}
        <span className="font-semibold">Input → Process → Output → Outcome → Impact</span>, with{' '}
        <span className="font-semibold">Context &amp; Environmental</span> conditions as a cross-cutting
        base — and the same{' '}
        <span className="font-semibold">paired mitigation and adaptation tracks of equal weight</span>. What
        v5 adds is the <span className="font-semibold">sector</span> as a third axis, folded in as a{' '}
        <span className="font-semibold">sub-layer inside every rung and track</span>: each track column is
        clustered into sector groups, the chips are colour-coded by sector, and each rung reports how many
        sectors it covers. So you can read not only{' '}
        <span className="italic">where on the chain</span> and{' '}
        <span className="italic">on which track</span> an indicator sits, but also{' '}
        <span className="font-semibold">which sectors are covered at each step</span>. Click any chip to open
        the data behind it.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px]">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-grey-200 px-2 py-1">
          <span className="w-2 h-2 rounded-full" style={{ background: '#9E4A46' }} />
          <span className="font-semibold text-tertiary-dark">Mitigation</span>
          <span className="text-tertiary-light">· {totals.mitigation} indicators</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-grey-200 px-2 py-1">
          <span className="w-2 h-2 rounded-full" style={{ background: '#2E7D74' }} />
          <span className="font-semibold text-tertiary-dark">⛨ Adaptation &amp; resilience</span>
          <span className="text-tertiary-light">· {totals.adaptation} indicators</span>
        </span>
        <span className="text-tertiary-light">across 6 results-chain groups</span>
      </div>

      {/* Sector-coverage legend — how many sectors the chain covers, and how deeply */}
      <div className="rounded-xl border border-grey-200 bg-grey-50 px-3 py-2.5 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-wide font-semibold text-tertiary">
            Sector coverage
          </span>
          <span className="text-[11px] text-tertiary-light">
            {coverage.length} sector{coverage.length === 1 ? '' : 's'} covered · count = indicators ·{' '}
            <span className="font-mono">/6</span> = rungs of the chain reached
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {coverage.map((c) => (
            <span
              key={c.meta.key}
              className="inline-flex items-center gap-1.5 rounded-md bg-white border px-2 py-1 text-[11px]"
              style={{ borderColor: `${c.meta.color}66` }}
              title={`${c.meta.label}: ${c.count} indicators across ${c.rungs} of 6 results-chain rungs`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.meta.color }} />
              <span className="font-semibold text-tertiary-dark">{c.meta.label}</span>
              <span className="text-tertiary-light">{c.count}</span>
              <span className="font-mono text-[9.5px] text-tertiary-light">· {c.rungs}/6</span>
            </span>
          ))}
        </div>
      </div>

      <SectoredResultsChainFlow board={board} allIndicators={allIndicators} onOpenIndicator={setDrawer} />

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
