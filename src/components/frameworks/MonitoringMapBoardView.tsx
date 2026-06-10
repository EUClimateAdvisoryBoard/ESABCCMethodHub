/**
 * Advanced version 4 — monitoring-map board view (sector-free, thematic).
 *
 * The container for the monitoring-map flow chart: the overarching-goal banner,
 * the intro blurb, the four-layer board and the shared indicator data drawer.
 * Like Advanced version 2 the board is seeded from a computed default — the
 * whole catalogue re-clustered into four thematic monitoring-map layers
 * (Enablers → Delivery → Outcomes → Risk) with no sector split — but is then
 * editable and persisted per version; clicking a chip opens its data, and "Open
 * in indicator list" hands the id back to the parent module.
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
import type { ResultsChainBoard } from '@/data/results-chain-v2';
import type { FlowChartVersion } from '@/lib/project-workspace/flowchart-versions';
import { useEditableBoard } from '@/lib/project-workspace/useEditableBoard';
import ResultsChainFlow from './ResultsChainFlow';
import IndicatorDetail from './IndicatorDetail';
import { BoardEditToolbar, EditModeHint } from './BoardEditControls';
import type { OpenIndicatorPayload } from './SectorFlow';

interface Props {
  allIndicators: Indicator[];
  onOpenInList?: (id: string) => void;
  projectId: string;
  version: FlowChartVersion;
  hydrated?: boolean;
}

const isResultsChainBoard = (b: unknown): boolean =>
  !!b && typeof b === 'object' && Array.isArray((b as ResultsChainBoard).groups);

export default function MonitoringMapBoardView({
  allIndicators,
  onOpenInList,
  projectId,
  version,
  hydrated = true,
}: Props) {
  const { board, setBoard, editing, setEditing, reset } = useEditableBoard<ResultsChainBoard>({
    projectId,
    version,
    hydrated,
    makeDefault: useCallback(() => defaultMonitoringMapBoardV4(), []),
    validate: isResultsChainBoard,
  });
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
        The four layers are a <span className="font-semibold">causal pipeline read left-to-right</span>: did
        we set the conditions, did delivery follow, did the outcomes move, and is the harm the system exists
        to reduce actually falling? Every indicator is placed by{' '}
        <span className="font-semibold">what kind of signal it is</span> rather than which sector it sits in,
        and every layer carries <span className="font-semibold">both pillars of equal weight</span>, pairing
        mitigation indicators with adaptation &amp; resilience indicators (marked{' '}
        <span className="align-middle inline-flex items-center rounded bg-teal-100 text-teal-800 px-1 text-[10px] font-semibold">
          ⛨ adapt
        </span>
        ).
      </p>

      {/* Why a monitoring map instead of the sectoral view — the core rationale. */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 px-4 py-3 mb-4 max-w-3xl">
        <div className="text-[11px] uppercase tracking-wide text-indigo-700 font-semibold mb-2">
          Why a monitoring map, not the sectoral view?
        </div>
        <p className="text-[13px] text-tertiary leading-relaxed mb-3">
          The default ESABCC boards read <span className="font-semibold">down a sector</span> (Energy,
          Industry, Transport, …). That mirrors how policy is owned and how the report is written — the
          right lens for a sector lead — but it is a poor lens for judging progress{' '}
          <span className="font-semibold">as a whole system</span>, for three structural reasons. This map
          fixes each one:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5 text-[12px]">
          <div>
            <div className="font-semibold text-tertiary-dark mb-0.5">The sectoral view</div>
            <ul className="list-disc pl-4 space-y-1.5 text-tertiary">
              <li>
                <span className="font-semibold">Hides where progress stalls.</span> Each column mixes
                finance, built capacity, shares and realised emissions together, so you can&apos;t tell if a
                blockage is upstream or down.
              </li>
              <li>
                <span className="font-semibold">No home for cross-cutting signals.</span> Carbon price,
                finance, R&amp;D and almost all of adaptation risk belong to no single sector — so they get
                scattered or dropped.
              </li>
              <li>
                <span className="font-semibold">Adaptation is an afterthought.</span> The columns are built
                around emissions; risk &amp; resilience are bolted on rather than weighed equally.
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-tertiary-dark mb-0.5">This monitoring map</div>
            <ul className="list-disc pl-4 space-y-1.5 text-tertiary">
              <li>
                <span className="font-semibold">Reads the causal chain, not the org chart.</span> A stall
                shows up as a <span className="font-semibold">break in the pipeline</span> — enablers green
                but delivery flat is an implementation gap.
              </li>
              <li>
                <span className="font-semibold">One home for each signal type.</span> Finance, price and law
                sit together in Enablers; the hazard signal and realised harm sit together in Risk —
                whatever sector they touch.
              </li>
              <li>
                <span className="font-semibold">Adaptation is a full, equal pillar</span> in every layer, and
                every chip in a layer is the <span className="font-semibold">same kind of signal</span>, so
                you weigh like with like.
              </li>
            </ul>
          </div>
        </div>
        <p className="text-[11.5px] text-tertiary-light leading-relaxed mt-3">
          So the two are complements, not rivals: keep the sectoral view as the owner&apos;s board, and use
          this as the <span className="font-semibold">board-level &ldquo;are we on track, and where is it
          stuck?&rdquo;</span> view. Read across the layers — a healthy system shows movement propagating
          left&nbsp;→&nbsp;right; the layer where it dies is where to look.
        </p>
      </div>

      <p className="text-sm text-tertiary mb-4 max-w-3xl">
        The layered <span className="font-semibold">enabler → delivery → outcome → risk</span> reading is{' '}
        <span className="font-semibold">inspired by</span> the monitoring-map approach national climate
        advisory bodies use to judge progress. It is an{' '}
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
        <span className="text-tertiary-light">across {board.groups.length} monitoring-map layers</span>
      </div>

      <BoardEditToolbar
        editing={editing}
        onToggleEditing={() => setEditing((e) => !e)}
        onReset={reset}
        builtIn={version.builtIn}
      />
      {editing && (
        <EditModeHint>
          Edit mode: rename layers (and their colour/description), add or delete layers, link new
          indicator chips, relabel chips, move a chip between the mitigation and adaptation pillars
          (↔), or remove a chip (×). Changes are saved to this version automatically.
        </EditModeHint>
      )}

      <ResultsChainFlow
        board={board}
        allIndicators={allIndicators}
        onOpenIndicator={setDrawer}
        editing={editing}
        onChange={setBoard}
      />

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
