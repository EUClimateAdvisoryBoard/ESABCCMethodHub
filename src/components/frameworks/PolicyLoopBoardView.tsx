/**
 * Advanced version 6 — adaptive-policy-loop board view.
 *
 * The container for the policy-loop flow chart (PolicyLoopFlow): the
 * overarching-goal banner, the intro blurb, the "why a loop" rationale box,
 * the loop legend, the per-sector loop cards and the shared indicator data
 * drawer. Like Advanced versions 2/4/5 this is a computed, read-only
 * analytical view — here the synthesis spans three registries at once
 * (scenario benchmarks, sectoral policies and the indicator catalogue) — so
 * it carries no edit mode; clicking an indicator chip opens its data, policy
 * chips deep-link into the Policy Navigator, and "Open in indicator list"
 * hands the id back to the parent module.
 */
'use client';
import { useCallback, useMemo, useState } from 'react';
import type { Indicator } from '@/data/ecno-indicators';
import { FRAMEWORK_INDICATOR_INDEX } from '@/data/sector-frameworks';
import { defaultPolicyLoopBoardV6, LOOP_STATIONS } from '@/data/policy-loop-v6';
import PolicyLoopFlow from './PolicyLoopFlow';
import IndicatorDetail from './IndicatorDetail';
import type { OpenIndicatorPayload } from './SectorFlow';

interface Props {
  allIndicators: Indicator[];
  onOpenInList?: (id: string) => void;
}

export default function PolicyLoopBoardView({ allIndicators, onOpenInList }: Props) {
  const board = useMemo(() => defaultPolicyLoopBoardV6(), []);
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
    const chips = board.sectors.flatMap((s) => [...s.mitigation, ...s.adaptation, ...s.observed]);
    return {
      mitigation: chips.filter((c) => c.track === 'mitigation').length,
      adaptation: chips.filter((c) => c.track === 'adaptation').length,
      policies: board.sectors.reduce((n, s) => n + s.policies.length, 0),
      benchmarks: board.sectors.reduce(
        (n, s) => n + s.corridor.reduce((m, c) => m + c.targets.length, 0),
        0,
      ),
      gaps: board.sectors.filter((s) => s.adaptationGapNote).length,
    };
  }, [board]);

  return (
    <div>
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 mb-4">
        <div className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold mb-0.5">
          One overarching goal · one closed loop per sector
        </div>
        <div className="text-base font-bold text-tertiary-dark leading-snug">
          A climate-neutral and climate-resilient EU by 2050
        </div>
        <p className="text-xs text-tertiary mt-1 max-w-3xl">
          Mitigation and adaptation are equal-weight lanes inside every sector&apos;s loop: cut emissions to
          net zero, and reduce the risk, loss and vulnerability from the warming already locked in — steered
          by the same laws, against the same scenario corridor.
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
        </div>
      </div>

      <p className="text-sm text-tertiary mb-4 max-w-3xl">
        <span className="font-semibold text-rose-700">Advanced version 6</span> changes the geometry: where
        every earlier version is a <span className="font-semibold">chain</span> you read once and stop, this
        board is the <span className="font-semibold">closed control loop</span> that EU climate governance
        legally is. Each sector runs the same five stations —{' '}
        <span className="font-semibold">
          scenario corridor → policy instruments → twin-track delivery → observed results → gap &amp; ratchet
        </span>{' '}
        — and the ratchet feeds the gap back into the instruments. That puts the two missing sides of the
        earlier boards <span className="font-semibold">on the canvas itself</span>:{' '}
        <span className="font-semibold">scenario modelling results</span> open every loop as the corridor the
        sector must travel (the Climate Law and Fit-for-55 MIX benchmarks behind the Policy Gap charts), and{' '}
        <span className="font-semibold">the policy side</span> appears twice — as the upstream instruments
        (real laws, deep-linked into the Policy Navigator, each with the next milestone that bites) and as the
        downstream review mechanism that closes the loop. Click any indicator chip to open its data.
      </p>

      {/* Why a loop, not another chain — the core rationale. */}
      <div className="rounded-xl border border-rose-200 bg-rose-50/40 px-4 py-3 mb-4 max-w-3xl">
        <div className="text-[11px] uppercase tracking-wide text-rose-700 font-semibold mb-2">
          Why a loop, not another chain?
        </div>
        <ul className="list-disc pl-4 space-y-1.5 text-[12px] text-tertiary">
          <li>
            <span className="font-semibold">Monitoring is steering, not scorekeeping.</span> The Climate Law
            (Art. 4 stocktake), the Governance Regulation (NECP updates), the ETS cap reviews and the CO₂
            standard reviews are all <span className="font-semibold">feedback mechanisms</span> — a chain
            cannot show them; the loop makes them station 5 of every sector.
          </li>
          <li>
            <span className="font-semibold">Adaptation is folded into every sector, not parked beside
            them.</span> Each loop pairs the sector&apos;s mitigation drivers with its own climate-risk lane —
            drought damage in energy, rail disruption in transport, heat mortality in buildings, crop loss in
            agriculture, fire in forests. Where no adaptation-delivery indicator exists, the{' '}
            <span className="font-semibold">empty lane is rendered as a stated monitoring gap</span> — the
            absence is itself a finding ({totals.gaps} sectors flagged).
          </li>
          <li>
            <span className="font-semibold">Sinks make the tracks inseparable.</span> The LULUCF loop shows
            why the two tracks must share one canvas: fires and disturbances (adaptation failures) directly
            erode the removals the mitigation corridor counts on.
          </li>
        </ul>
      </div>

      {/* The loop legend — the five stations, read around the cycle. */}
      <div className="rounded-xl border border-grey-200 bg-grey-50 px-3 py-2.5 mb-4">
        <div className="text-[10px] uppercase tracking-wide font-semibold text-tertiary mb-2">
          The five stations of every sector&apos;s loop
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {LOOP_STATIONS.map((s, i) => (
            <span key={s.id} className="inline-flex items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1.5 rounded-md bg-white border border-grey-200 px-2 py-1"
                title={s.blurb}
              >
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white font-bold text-[9px]"
                  style={{ background: s.color }}
                >
                  {s.index}
                </span>
                <span className="font-semibold text-tertiary-dark">{s.name}</span>
              </span>
              {i < LOOP_STATIONS.length - 1 && (
                <span className="text-tertiary-light" aria-hidden="true">
                  →
                </span>
              )}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 text-tertiary-light">
            <span aria-hidden="true">↺</span> back to ②
          </span>
        </div>
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
          <span className="font-semibold text-amber-800">§</span>
          <span className="font-semibold text-tertiary-dark">{totals.policies} policy instruments</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-grey-200 px-2 py-1">
          <span className="font-semibold text-indigo-700">⌖</span>
          <span className="font-semibold text-tertiary-dark">{totals.benchmarks} scenario benchmarks</span>
        </span>
        <span className="text-tertiary-light">across {board.sectors.length} sector loops</span>
      </div>

      <PolicyLoopFlow board={board} onOpenIndicator={setDrawer} />

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
