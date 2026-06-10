/**
 * Advanced version 7 — structured-assessment-matrix board view.
 *
 * The container for the assessment-matrix flow chart (AssessmentMatrixFlow):
 * the overarching-goal banner, the intro blurb, the "why a matrix" rationale,
 * the eight-step assessment protocol (the methodology made explicit), the
 * dimension legend with totals, the five-dimension board and the shared
 * indicator data drawer. Like Advanced versions 2/4/5/6 this is a computed,
 * read-only analytical view — clicking an indicator chip opens its data,
 * policy chips deep-link into the Policy Navigator, and "Open in indicator
 * list" hands the id back to the parent module.
 */
'use client';
import { useCallback, useMemo, useState } from 'react';
import type { Indicator } from '@/data/ecno-indicators';
import { FRAMEWORK_INDICATOR_INDEX } from '@/data/sector-frameworks';
import { ASSESSMENT_PROTOCOL, defaultAssessmentMatrixBoardV7 } from '@/data/assessment-matrix-v7';
import AssessmentMatrixFlow from './AssessmentMatrixFlow';
import IndicatorDetail from './IndicatorDetail';
import type { OpenIndicatorPayload } from './SectorFlow';

interface Props {
  allIndicators: Indicator[];
  onOpenInList?: (id: string) => void;
}

export default function AssessmentMatrixBoardView({ allIndicators, onOpenInList }: Props) {
  const board = useMemo(() => defaultAssessmentMatrixBoardV7(), []);
  const [drawer, setDrawer] = useState<OpenIndicatorPayload | null>(null);
  const [protocolOpen, setProtocolOpen] = useState(true);

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
    const areaChips = board.areas.flatMap((a) => [...a.risk, ...a.action]);
    return {
      mitigation: board.sectors.reduce((n, s) => n + s.drivers.length + s.observed.length, 0),
      adaptation:
        areaChips.length + board.climateSignal.length + board.adaptationGovernance.length,
      crosscutting:
        board.themes.reduce((n, t) => n + t.chips.length, 0) +
        board.objectives.reduce((n, o) => n + o.chips.length, 0),
      benchmarks: board.sectors.reduce(
        (n, s) => n + s.corridor.reduce((m, c) => m + c.targets.length, 0),
        0,
      ),
      laws: board.policies.reduce((n, p) => n + p.policies.length, 0),
      gaps:
        board.areas.filter((a) => a.gapNote).length +
        board.themes.filter((t) => t.gapNote).length +
        board.objectives.filter((o) => o.gapNote).length,
    };
  }, [board]);

  return (
    <div>
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 mb-4">
        <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold mb-0.5">
          One overarching goal · five structural dimensions · one published protocol
        </div>
        <div className="text-base font-bold text-tertiary-dark leading-snug">
          A climate-neutral and climate-resilient EU by 2050
        </div>
        <p className="text-xs text-tertiary mt-1 max-w-3xl">
          Mitigation and adaptation are equal-weight pillars with <span className="font-semibold">deliberately
          different structures</span>: mitigation is assessed by emission sector, adaptation by adaptation
          area — because emissions are organised by source while climate risk is organised by what is exposed.
          Policies, crosscutting themes and societal objectives are their own layers, so nothing is forced
          into a structure that distorts it.
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white border border-grey-200 px-2 py-1">
            <span className="w-2 h-2 rounded-full" style={{ background: '#9E4A46' }} />
            <span className="font-semibold text-tertiary-dark">Mitigation</span>
            <span className="text-tertiary-light">— six emission sectors</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white border border-grey-200 px-2 py-1">
            <span className="w-2 h-2 rounded-full" style={{ background: '#2E7D74' }} />
            <span className="font-semibold text-tertiary-dark">⛨ Adaptation &amp; resilience</span>
            <span className="text-tertiary-light">— thirteen adaptation areas</span>
          </span>
        </div>
      </div>

      <p className="text-sm text-tertiary mb-4 max-w-3xl">
        <span className="font-semibold text-emerald-700">Advanced version 7</span> is the{' '}
        <span className="font-semibold">methodology board</span>: where versions 1–6 each proposed a geometry
        (chains, maps, loops), this version fixes the <span className="font-semibold">structural
        distinctions</span> a monitoring-and-progress scientific report must keep apart, and makes the
        assessment method itself transparent. Five dimensions —{' '}
        <span className="font-semibold">
          A&nbsp;emission sectors · B&nbsp;adaptation areas · C&nbsp;main policies · D&nbsp;crosscutting
          themes · E&nbsp;societal objectives
        </span>{' '}
        — assessed by the eight-step protocol below. It builds on the earlier versions: the corridor →
        drivers → observed reading inside each sector comes from the version-6 loop, the pace-not-position
        scoring from the version-2 results chain, and the stated-monitoring-gap rule from versions 4–6.
        Click any indicator chip to open its data.
      </p>

      {/* Why a matrix — the structural rationale. */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3 mb-4 max-w-3xl">
        <div className="text-[11px] uppercase tracking-wide text-emerald-700 font-semibold mb-2">
          Why separate structures for the two pillars?
        </div>
        <ul className="list-disc pl-4 space-y-1.5 text-[12px] text-tertiary">
          <li>
            <span className="font-semibold">Emissions are organised by source; risk is organised by what is
            exposed.</span> Forcing adaptation into the six emission sectors (versions 1, 3, 5, 6) loses
            whole systems — health, water supply, nature, telecoms have no emission sector to live in. The
            thirteen adaptation areas (after the UK CCC&apos;s framework) give every exposed system a home.
          </li>
          <li>
            <span className="font-semibold">Policies and themes are layers, not cells.</span> ETS1 spans two
            sectors; electrification spans four; finance touches everything. Mapping them as their own
            dimensions — with overlaps stated per row — keeps the headline count honest while letting every
            reading happen.
          </li>
          <li>
            <span className="font-semibold">Societal objectives are lenses, not chapters.</span> Cost
            effectiveness, competitiveness, autonomy, just transition and biodiversity are questions asked{' '}
            <span className="font-semibold">of every chapter</span>, so a sector can be on track for
            emissions and off track for fairness — and the report says both.
          </li>
        </ul>
      </div>

      {/* The assessment protocol — the methodology made explicit. */}
      <div className="rounded-xl border border-grey-200 bg-grey-50 px-3 py-2.5 mb-4">
        <button
          type="button"
          onClick={() => setProtocolOpen((o) => !o)}
          className="w-full flex items-center gap-2 text-left"
        >
          <span className="text-[10px] uppercase tracking-wide font-semibold text-tertiary">
            The assessment protocol — eight steps from matrix cell to report finding
          </span>
          <span className="text-tertiary-light text-xs ml-auto">{protocolOpen ? '▾' : '▸'}</span>
        </button>
        {protocolOpen && (
          <ol className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {ASSESSMENT_PROTOCOL.map((step) => (
              <li
                key={step.index}
                className="rounded-lg border border-grey-200 bg-white px-2.5 py-2 flex gap-2"
              >
                <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-700 text-white font-bold text-[10px] mt-0.5">
                  {step.index}
                </span>
                <div className="min-w-0 text-[11px]">
                  <div className="font-semibold text-tertiary-dark">{step.name}</div>
                  <p className="text-tertiary leading-snug mt-0.5">{step.what}</p>
                  <p className="text-[10px] text-emerald-800 leading-snug mt-1">
                    <span className="font-bold uppercase tracking-wide">output</span> — {step.output}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

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
        <span className="inline-flex items-center gap-1.5 rounded-md border border-grey-200 px-2 py-1">
          <span className="w-2 h-2 rounded-full" style={{ background: '#5B5BD6' }} />
          <span className="font-semibold text-tertiary-dark">Themes &amp; lenses</span>
          <span className="text-tertiary-light">· {totals.crosscutting} indicators</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-grey-200 px-2 py-1">
          <span className="font-semibold text-amber-800">§</span>
          <span className="font-semibold text-tertiary-dark">{totals.laws} laws in 7 families</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-grey-200 px-2 py-1">
          <span className="font-semibold text-indigo-700">⌖</span>
          <span className="font-semibold text-tertiary-dark">{totals.benchmarks} scenario benchmarks</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-grey-200 px-2 py-1">
          <span className="font-semibold text-teal-700">▦</span>
          <span className="font-semibold text-tertiary-dark">{totals.gaps} stated monitoring gaps</span>
        </span>
      </div>

      <AssessmentMatrixFlow board={board} onOpenIndicator={setDrawer} />

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
