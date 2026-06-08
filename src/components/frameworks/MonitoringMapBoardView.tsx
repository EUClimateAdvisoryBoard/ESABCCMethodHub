/**
 * Advanced version 4 — monitoring-map board view (sector-free, thematic).
 *
 * The container for the monitoring-map flow chart: the overarching-goal banner,
 * the intro blurb, the four-layer board and the shared indicator data drawer.
 * Like Advanced version 2 this is a computed, read-only analytical view — the
 * whole catalogue re-clustered, here into four thematic monitoring-map layers
 * (Enablers → Delivery → Outcomes → Risk) with no sector split — so it carries
 * no edit mode; clicking a chip opens its data, and "Open in indicator list"
 * hands the id back to the parent module.
 *
 * It reuses the version-2 ResultsChainFlow renderer because the board shape is
 * identical (numbered layers, each split into a mitigation and an adaptation
 * pillar of equal weight).
 */
'use client';
import { useCallback, useMemo, useState } from 'react';
import type { Indicator } from '@/data/ecno-indicators';
import { FRAMEWORK_INDICATOR_INDEX } from '@/data/sector-frameworks';
import { defaultMonitoringMapBoardV4 } from '@/data/monitoring-map-v4';
import ResultsChainFlow from './ResultsChainFlow';
import IndicatorDetail from './IndicatorDetail';
import type { OpenIndicatorPayload } from './SectorFlow';

interface Props {
  allIndicators: Indicator[];
  onOpenInList?: (id: string) => void;
}

export default function MonitoringMapBoardView({ allIndicators, onOpenInList }: Props) {
  const board = useMemo(() => defaultMonitoringMapBoardV4(), []);
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

  return (
    <div>
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 mb-4">
        <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold mb-0.5">
          One overarching goal · no sectors
        </div>
        <div className="text-base font-bold text-tertiary-dark leading-snug">
          A climate-neutral and climate-resilient EU by 2050
        </div>
        <p className="text-xs text-tertiary mt-1 max-w-3xl">
          Mitigation and adaptation are equal-weight pillars of one goal: cut emissions to net zero, and
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
          <span className="text-tertiary-light self-center">equal-weight pillars of the same goal</span>
        </div>
      </div>

      <p className="text-sm text-tertiary mb-4 max-w-3xl">
        <span className="font-semibold text-indigo-700">Advanced version 4:</span> the whole indicator
        catalogue folded into <span className="font-semibold">four thematic monitoring-map layers</span> —{' '}
        <span className="font-semibold">Enablers &amp; inputs → Delivery on the ground → Outcomes → Risk,
        harm &amp; climate signal</span> — with <span className="font-semibold">no sector split at all</span>.
        Every indicator is placed by <span className="font-semibold">what kind of signal it is</span> rather
        than which sector it sits in, and every layer carries{' '}
        <span className="font-semibold">both pillars of equal weight</span>, so each layer pairs mitigation
        indicators with adaptation &amp; resilience indicators (marked{' '}
        <span className="align-middle inline-flex items-center rounded bg-teal-100 text-teal-800 px-1 text-[10px] font-semibold">
          ⛨ adapt
        </span>
        ).
      </p>
      <p className="text-sm text-tertiary mb-4 max-w-3xl">
        The layered <span className="font-semibold">enabler → delivery → outcome → risk</span> reading is{' '}
        <span className="font-semibold">inspired by</span> the monitoring-map approach national climate
        advisory bodies use to judge progress — are the enablers in place, is delivery following, are the
        outcomes and the residual risk moving? It is an{' '}
        <span className="font-semibold">original synthesis, not a copy</span> of any one body&apos;s
        framework: the layer names, descriptions and indicator placement are our own, and every chip links
        only to indicators already curated in this platform. As in Advanced version 2, the{' '}
        <span className="font-semibold">adaptation pillar leans on policy-process indicators</span> (marked{' '}
        <span className="align-middle inline-flex items-center rounded bg-amber-100 text-amber-800 px-1 text-[10px] font-semibold">
          policy
        </span>
        ) in the early layers, where action is still mostly about building governance and process. Click any
        chip to open the data behind it.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px]">
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
        <span className="text-tertiary-light">across 4 monitoring-map layers</span>
      </div>

      <ResultsChainFlow board={board} allIndicators={allIndicators} onOpenIndicator={setDrawer} />

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
