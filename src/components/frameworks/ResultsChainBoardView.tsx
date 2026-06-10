/**
 * Advanced version 2 — results-chain board view.
 *
 * The container for the results-chain flow chart (ResultsChainFlow): the intro
 * blurb, the six-rung board, and the shared indicator data drawer. The board is
 * seeded from a computed default — the whole indicator catalogue re-clustered
 * along the M&E results chain — but is then editable and persisted per version
 * (groups and chips can be relabelled, added, deleted and re-tracked), exactly
 * like the sector boards. Clicking a chip opens its data, and "Open in indicator
 * list" hands the id back to the parent module.
 */
'use client';
import { useCallback, useMemo, useState } from 'react';
import type { Indicator } from '@/data/ecno-indicators';
import { FRAMEWORK_INDICATOR_INDEX } from '@/data/sector-frameworks';
import { defaultResultsChainBoardV2, type ResultsChainBoard } from '@/data/results-chain-v2';
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

export default function ResultsChainBoardView({
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
    makeDefault: useCallback(() => defaultResultsChainBoardV2(), []),
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
        <span className="font-semibold text-purple-700">Advanced version 2:</span> the whole indicator
        catalogue re-clustered along a six-rung{' '}
        <span className="font-semibold">monitoring-&amp;-evaluation results chain</span> —{' '}
        <span className="font-semibold">Input → Process → Output → Outcome → Impact</span>, with{' '}
        <span className="font-semibold">Context &amp; Environmental</span> conditions as a cross-cutting
        base. Every rung carries{' '}
        <span className="font-semibold">both a mitigation and an adaptation track of equal weight</span>, so
        each outcome (and each other rung) pairs mitigation indicators with adaptation &amp; resilience
        indicators (marked{' '}
        <span className="align-middle inline-flex items-center rounded bg-teal-100 text-teal-800 px-1 text-[10px] font-semibold">
          ⛨ adapt
        </span>
        ). The clustering follows standard climate M&amp;E results-chain logic (OECD-DAC MEL for climate-risk
        management, IPCC AR6 WGII adaptation M&amp;E, EEA climate-risk indicators, GIZ/UNEP &amp; GEF-STAP
        adaptation M&amp;E): finance, carbon price and laws are Inputs; deployed capacity is Output;
        shares, rates and intensities are Outcomes; realised emissions, sinks, losses and mortality are
        Impacts; and the climate signal itself sits in Context. Click any chip to open the data behind it.
      </p>
      <p className="text-sm text-tertiary mb-4 max-w-3xl">
        Because <span className="font-semibold">adaptation is at an earlier stage than mitigation</span> —
        mitigation already has rich Outcome-level series (shares, rates, intensities), whereas adaptation
        action is still mostly about building the governance and process — the adaptation track is
        deliberately built out on the <span className="font-semibold">early rungs (Input → Process →
        Output)</span> with <span className="font-semibold">policy-process indicators</span> (marked{' '}
        <span className="align-middle inline-flex items-center rounded bg-amber-100 text-amber-800 px-1 text-[10px] font-semibold">
          policy
        </span>
        ): National Adaptation Strategies and Plans adopted, national climate-risk assessments, adaptation
        anchored in climate law, EU Adaptation Strategy actions, Mission-Charter and Covenant-of-Mayors
        uptake, early-warning reach and adaptation finance (EU budget mainstreaming, EIB share). This pairs
        the <span className="font-semibold">quantitative indicator side with the qualitative policy-making
        side</span>, so the chain is tracked end-to-end on both tracks rather than only where the numbers
        are already plentiful.
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
        <span className="text-tertiary-light">across {board.groups.length} results-chain groups</span>
      </div>

      <BoardEditToolbar
        editing={editing}
        onToggleEditing={() => setEditing((e) => !e)}
        onReset={reset}
        builtIn={version.builtIn}
      />
      {editing && (
        <EditModeHint>
          Edit mode: rename groups (and their colour/description), add or delete groups, link new
          indicator chips, relabel chips, move a chip between the mitigation and adaptation tracks
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
