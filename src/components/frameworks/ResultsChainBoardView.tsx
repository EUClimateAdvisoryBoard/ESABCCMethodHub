/**
 * Advanced version 2 — results-chain board view.
 *
 * The container for the results-chain flow chart (ResultsChainFlow): the intro
 * blurb, the six-rung board, and the shared indicator data drawer. Unlike the
 * sector boards this is a computed, read-only analytical view — the whole
 * indicator catalogue re-clustered along the M&E results chain — so it carries
 * no edit mode; clicking a chip opens its data, and "Open in indicator list"
 * hands the id back to the parent module.
 */
'use client';
import { useCallback, useMemo, useState } from 'react';
import type { Indicator } from '@/data/ecno-indicators';
import { FRAMEWORK_INDICATOR_INDEX } from '@/data/sector-frameworks';
import { defaultResultsChainBoardV2 } from '@/data/results-chain-v2';
import ResultsChainFlow from './ResultsChainFlow';
import IndicatorDetail from './IndicatorDetail';
import type { OpenIndicatorPayload } from './SectorFlow';

interface Props {
  allIndicators: Indicator[];
  onOpenInList?: (id: string) => void;
}

export default function ResultsChainBoardView({ allIndicators, onOpenInList }: Props) {
  const board = useMemo(() => defaultResultsChainBoardV2(), []);
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
        <span className="text-tertiary-light">across 6 results-chain groups</span>
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
