/**
 * Advanced version 6 — the adaptive-policy-loop flow chart renderer.
 *
 * One card per sector, each laid out as the five stations of the control loop:
 * scenario corridor → policy instruments → twin-track delivery → observed
 * results → gap & ratchet, with a dashed feedback strip running back from
 * station 5 to station 2 (the ratchet that makes it a loop, not a chain).
 *
 * Station 1 renders benchmark chips from the Policy Gap registry (year →
 * target value), station 2 renders law chips deep-linked into the Policy
 * Navigator with their next biting milestone, stations 3–4 render indicator
 * chips that open the shared data drawer (mitigation and adaptation lanes of
 * equal weight inside every sector), and station 5 lists the named EU review
 * mechanisms. An empty adaptation lane is rendered as a stated monitoring gap.
 */
'use client';
import Link from 'next/link';
import type {
  LoopIndicatorChip,
  LoopPolicyChip,
  LoopBenchmarkChip,
  PolicyLoopBoard,
  PolicyLoopSector,
} from '@/data/policy-loop-v6';
import { LOOP_STATIONS } from '@/data/policy-loop-v6';
import { getViewerPolicyId } from '@/data/sectoral-policies';
import type { OpenIndicatorPayload } from './SectorFlow';
import { Tooltip } from '@/components/ui/Tooltip';

const MIT_BG = '#9E4A46';
const ADAPT_BG = '#2E7D74';

interface Props {
  board: PolicyLoopBoard;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}

export default function PolicyLoopFlow({ board, onOpenIndicator }: Props) {
  return (
    <div className="text-[11px] space-y-4">
      {board.sectors.map((sector) => (
        <SectorLoopCard key={sector.key} sector={sector} onOpenIndicator={onOpenIndicator} />
      ))}
    </div>
  );
}

function SectorLoopCard({
  sector,
  onOpenIndicator,
}: {
  sector: PolicyLoopSector;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}) {
  return (
    <section
      className="rounded-xl border overflow-hidden bg-white"
      style={{ borderColor: `${sector.color}55` }}
    >
      {/* Sector header */}
      <div className="flex items-start gap-3 px-3 py-2 text-white" style={{ background: sector.color }}>
        <div className="min-w-0">
          <div className="font-semibold text-[13px] leading-tight">{sector.label}</div>
          <p className="text-white/85 text-[10.5px] leading-snug mt-0.5 max-w-3xl">{sector.blurb}</p>
        </div>
        <div className="ml-auto shrink-0 flex flex-col items-end gap-0.5 self-center text-white/80 text-[10px] font-mono">
          <span>{sector.policies.length} laws</span>
          <span>
            {sector.mitigation.length + sector.adaptation.length + sector.observed.length} ind.
          </span>
        </div>
      </div>

      {/* The five stations */}
      <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-grey-100">
        <Station index={1}>
          <CorridorStation chips={sector.corridor} />
        </Station>
        <Station index={2}>
          <InstrumentsStation chips={sector.policies} />
        </Station>
        <Station index={3}>
          <DeliveryStation sector={sector} onOpenIndicator={onOpenIndicator} />
        </Station>
        <Station index={4}>
          <ObservedStation chips={sector.observed} onOpenIndicator={onOpenIndicator} />
        </Station>
        <Station index={5}>
          <RatchetStation mechanisms={sector.ratchet} />
        </Station>
      </div>

      {/* The feedback strip: station 5 ratchets station 2 — what closes the loop. */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 border-t border-dashed"
        style={{ borderColor: `${sector.color}66`, background: `${sector.color}0D` }}
      >
        <span className="text-[13px] leading-none" style={{ color: sector.color }} aria-hidden="true">
          ↺
        </span>
        <span className="text-[10px] text-tertiary">
          <span className="font-semibold" style={{ color: sector.color }}>
            Feedback:
          </span>{' '}
          the gap between <span className="font-semibold">④ observed results</span> and{' '}
          <span className="font-semibold">① the corridor</span> flows through{' '}
          <span className="font-semibold">⑤ the ratchet</span> back into{' '}
          <span className="font-semibold">② the instruments</span> — monitoring as steering, not
          scorekeeping.
        </span>
      </div>
    </section>
  );
}

/** Shared station frame: numbered header + content, with a → connector on large screens. */
function Station({ index, children }: { index: number; children: React.ReactNode }) {
  const meta = LOOP_STATIONS[index - 1];
  return (
    <div className="p-2.5 relative">
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className="shrink-0 inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-white font-bold text-[9.5px]"
          style={{ background: meta.color }}
        >
          {meta.index}
        </span>
        <Tooltip content={meta.blurb}>
          <span
            className="text-[10px] font-bold uppercase tracking-wide cursor-help"
            style={{ color: meta.color }}
          >
            {meta.name}
          </span>
        </Tooltip>
        {index < 5 && (
          <span
            className="hidden lg:block absolute top-1/2 -right-2 z-10 text-tertiary-light text-sm leading-none"
            aria-hidden="true"
          >
            →
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Station 1: scenario corridor ─────────────────────────────────────────────

function CorridorStation({ chips }: { chips: LoopBenchmarkChip[] }) {
  if (chips.length === 0) {
    return <p className="text-[10px] text-tertiary-light italic">No benchmark series curated yet.</p>;
  }
  return (
    <div className="space-y-1.5">
      {chips.map((chip) => (
        <div key={chip.code} className="rounded border border-indigo-200 bg-indigo-50/40 px-1.5 py-1">
          <div className="flex items-baseline gap-1 mb-0.5">
            <span className="font-mono font-semibold text-indigo-700 shrink-0">{chip.code}</span>
            <span className="text-[10px] text-tertiary-dark truncate" title={chip.title}>
              {chip.title}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {chip.targets.map((t) => (
              <Tooltip key={t.year} content={t.label}>
                <span className="inline-flex items-center gap-1 rounded bg-white border border-indigo-200 px-1 py-0.5 text-[9.5px] cursor-help">
                  <span className="font-bold text-indigo-700">{t.year}</span>
                  <span className="text-tertiary-dark font-mono">
                    {t.value.toLocaleString('en-GB')} {chip.unit}
                  </span>
                </span>
              </Tooltip>
            ))}
          </div>
        </div>
      ))}
      <p className="text-[9px] text-tertiary-light leading-snug">
        Climate Law / Fit-for-55 MIX trajectories ·{' '}
        <Link href="/scenarios" className="text-indigo-600 hover:underline">
          open Scenario Explorer →
        </Link>
      </p>
    </div>
  );
}

// ── Station 2: policy instruments ────────────────────────────────────────────

const INSTRUMENT_LABEL: Record<LoopPolicyChip['instrumentType'], string> = {
  'cap-and-trade': 'cap & trade',
  regulation: 'regulation',
  standard: 'standard',
  target: 'target',
  fund: 'fund',
  directive: 'directive',
  tax: 'tax',
  disclosure: 'disclosure',
};

function InstrumentsStation({ chips }: { chips: LoopPolicyChip[] }) {
  if (chips.length === 0) {
    return <p className="text-[10px] text-tertiary-light italic">No instruments mapped yet.</p>;
  }
  return (
    <div className="space-y-1">
      {chips.map((p) => (
        <div key={p.id} className="rounded border border-amber-200 bg-amber-50/40 px-1.5 py-1">
          <Link
            href={`/policy-navigator/policy?id=${encodeURIComponent(getViewerPolicyId(p.id))}`}
            className="flex items-baseline gap-1 hover:underline"
            title={p.name}
          >
            <span className="font-semibold text-amber-800 shrink-0">{p.acronym ?? p.name}</span>
            {p.acronym && <span className="text-[9.5px] text-tertiary truncate">{p.name}</span>}
          </Link>
          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            <span className="inline-flex items-center rounded bg-amber-100 text-amber-800 px-1 text-[8px] font-bold uppercase tracking-wide">
              {INSTRUMENT_LABEL[p.instrumentType]}
            </span>
            {p.nextMilestone && (
              <Tooltip content={p.nextMilestone.requirement}>
                <span className="text-[9px] text-tertiary cursor-help">
                  next bites: <span className="font-bold">{p.nextMilestone.year}</span>
                </span>
              </Tooltip>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Stations 3 & 4: indicator chips ──────────────────────────────────────────

function IndicatorChipEl({
  item,
  onOpen,
}: {
  item: LoopIndicatorChip;
  onOpen: (p: OpenIndicatorPayload) => void;
}) {
  const linked = item.indicatorIds.length > 0;
  const accent = item.track === 'mitigation' ? MIT_BG : ADAPT_BG;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] border ${
        linked
          ? 'bg-white text-gray-800 cursor-pointer hover:ring-1'
          : 'bg-grey-50 text-tertiary-light border-dashed'
      }`}
      style={{ borderColor: `${accent}66` }}
      onClick={() =>
        linked && onOpen({ title: item.label, code: item.code, indicatorIds: item.indicatorIds })
      }
      title={item.label}
    >
      <span className="font-mono font-semibold shrink-0" style={{ color: accent }}>
        {item.code}
      </span>
      <span className="max-w-[140px] truncate">{item.label}</span>
      {item.policy && (
        <Tooltip content="Policy-process indicator — tracks the qualitative policy machinery (strategies, plans, coordination, mainstreaming) rather than a physical quantity.">
          <span className="shrink-0 inline-flex items-center rounded bg-amber-100 text-amber-800 px-1 text-[8px] font-bold uppercase tracking-wide">
            policy
          </span>
        </Tooltip>
      )}
      {!linked && <span className="italic">no data</span>}
    </span>
  );
}

function TrackLane({
  track,
  items,
  gapNote,
  onOpenIndicator,
}: {
  track: 'mitigation' | 'adaptation';
  items: LoopIndicatorChip[];
  gapNote?: string;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}) {
  const isMit = track === 'mitigation';
  const accent = isMit ? MIT_BG : ADAPT_BG;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
        <span className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: accent }}>
          {isMit ? 'Mitigation' : '⛨ Adaptation & resilience'}
        </span>
        <span className="text-[9.5px] text-tertiary-light">· {items.length}</span>
      </div>
      {items.length === 0 ? (
        gapNote ? (
          <p className="rounded border border-dashed border-teal-300 bg-teal-50/40 px-1.5 py-1 text-[9.5px] text-teal-800 leading-snug">
            <span className="font-bold uppercase tracking-wide">monitoring gap</span> — {gapNote}
          </p>
        ) : (
          <p className="text-[10px] text-tertiary-light italic">No indicator curated yet.</p>
        )
      ) : (
        <>
          <div className="flex flex-wrap gap-1">
            {items.map((it) => (
              <IndicatorChipEl key={it.refId} item={it} onOpen={onOpenIndicator} />
            ))}
          </div>
          {gapNote && (
            <p className="mt-1 rounded border border-dashed border-teal-300 bg-teal-50/40 px-1.5 py-1 text-[9.5px] text-teal-800 leading-snug">
              <span className="font-bold uppercase tracking-wide">monitoring gap</span> — {gapNote}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function DeliveryStation({
  sector,
  onOpenIndicator,
}: {
  sector: PolicyLoopSector;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}) {
  return (
    <div className="space-y-2">
      <TrackLane track="mitigation" items={sector.mitigation} onOpenIndicator={onOpenIndicator} />
      <TrackLane
        track="adaptation"
        items={sector.adaptation}
        gapNote={sector.adaptationGapNote}
        onOpenIndicator={onOpenIndicator}
      />
    </div>
  );
}

function ObservedStation({
  chips,
  onOpenIndicator,
}: {
  chips: LoopIndicatorChip[];
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}) {
  const mitigation = chips.filter((c) => c.track === 'mitigation');
  const adaptation = chips.filter((c) => c.track === 'adaptation');
  return (
    <div className="space-y-2">
      <TrackLane track="mitigation" items={mitigation} onOpenIndicator={onOpenIndicator} />
      <TrackLane track="adaptation" items={adaptation} onOpenIndicator={onOpenIndicator} />
    </div>
  );
}

// ── Station 5: gap & ratchet ─────────────────────────────────────────────────

function RatchetStation({ mechanisms }: { mechanisms: string[] }) {
  return (
    <ul className="space-y-1">
      {mechanisms.map((m) => (
        <li
          key={m}
          className="flex items-start gap-1.5 rounded border border-purple-200 bg-purple-50/40 px-1.5 py-1 text-[10px] text-tertiary-dark leading-snug"
        >
          <span className="text-purple-700 leading-none mt-0.5 shrink-0" aria-hidden="true">
            ↺
          </span>
          <span>{m}</span>
        </li>
      ))}
    </ul>
  );
}
