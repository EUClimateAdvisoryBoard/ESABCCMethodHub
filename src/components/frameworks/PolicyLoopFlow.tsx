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
 *
 * In edit mode every station is editable: rename / recolour / delete a sector,
 * add or remove benchmarks and policy instruments from the registries, link /
 * relabel / re-track / remove indicator chips on the delivery and observed
 * lanes, and add / edit / remove the named ratchet mechanisms.
 */
'use client';
import Link from 'next/link';
import type { Indicator } from '@/data/ecno-indicators';
import type {
  LoopIndicatorChip,
  LoopPolicyChip,
  LoopBenchmarkChip,
  LoopTrack,
  PolicyLoopBoard,
  PolicyLoopSector,
} from '@/data/policy-loop-v6';
import { LOOP_STATIONS } from '@/data/policy-loop-v6';
import * as plEdit from '@/data/policy-loop-edit';
import type { LoopLane } from '@/data/policy-loop-edit';
import { getViewerPolicyId } from '@/data/sectoral-policies';
import type { OpenIndicatorPayload } from './SectorFlow';
import {
  AddFromListControl,
  AddIndicatorControl,
  DeleteButton,
  InlineInput,
} from './BoardEditControls';
import { Tooltip } from '@/components/ui/Tooltip';

const MIT_BG = '#9E4A46';
const ADAPT_BG = '#2E7D74';

/** Per-sector edit handlers, bound to one sector's key. */
interface SectorEdit {
  editing: boolean;
  allIndicators: Indicator[];
  onUpdateSector: (
    patch: Partial<Pick<PolicyLoopSector, 'label' | 'color' | 'blurb' | 'adaptationGapNote'>>,
  ) => void;
  onDeleteSector: () => void;
  onAddChip: (lane: LoopLane, track: LoopTrack, ind: Indicator) => void;
  onDeleteChip: (refId: string) => void;
  onUpdateChip: (refId: string, patch: Partial<Pick<LoopIndicatorChip, 'label' | 'track'>>) => void;
  onAddPolicy: (policyId: string) => void;
  onDeletePolicy: (policyId: string) => void;
  onAddBenchmark: (gapId: string) => void;
  onDeleteBenchmark: (code: string) => void;
  onAddRatchet: () => void;
  onUpdateRatchet: (index: number, value: string) => void;
  onDeleteRatchet: (index: number) => void;
}

interface Props {
  board: PolicyLoopBoard;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
  /** When true the loop is editable; requires `onChange` and `allIndicators`. */
  editing?: boolean;
  allIndicators?: Indicator[];
  onChange?: (board: PolicyLoopBoard) => void;
}

export default function PolicyLoopFlow({
  board,
  onOpenIndicator,
  editing = false,
  allIndicators = [],
  onChange,
}: Props) {
  const edit = editing && !!onChange;
  const emit = (next: PolicyLoopBoard) => onChange?.(next);

  return (
    <div className="text-[11px] space-y-4">
      {board.sectors.map((sector) => {
        const e: SectorEdit = {
          editing: edit,
          allIndicators,
          onUpdateSector: (patch) => emit(plEdit.updateSector(board, sector.key, patch)),
          onDeleteSector: () => emit(plEdit.deleteSector(board, sector.key)),
          onAddChip: (lane, track, ind) => emit(plEdit.addChip(board, sector.key, lane, track, ind)),
          onDeleteChip: (refId) => emit(plEdit.deleteChip(board, sector.key, refId)),
          onUpdateChip: (refId, patch) => emit(plEdit.updateChip(board, sector.key, refId, patch)),
          onAddPolicy: (id) => emit(plEdit.addPolicy(board, sector.key, id)),
          onDeletePolicy: (id) => emit(plEdit.deletePolicy(board, sector.key, id)),
          onAddBenchmark: (id) => emit(plEdit.addBenchmark(board, sector.key, id)),
          onDeleteBenchmark: (code) => emit(plEdit.deleteBenchmark(board, sector.key, code)),
          onAddRatchet: () => emit(plEdit.addRatchet(board, sector.key)),
          onUpdateRatchet: (i, v) => emit(plEdit.updateRatchet(board, sector.key, i, v)),
          onDeleteRatchet: (i) => emit(plEdit.deleteRatchet(board, sector.key, i)),
        };
        return (
          <SectorLoopCard
            key={sector.key}
            sector={sector}
            onOpenIndicator={onOpenIndicator}
            edit={e}
          />
        );
      })}
      {edit && (
        <button
          onClick={() => emit(plEdit.addSector(board))}
          className="text-xs font-semibold px-3 py-1.5 rounded-md border border-dashed border-grey-300 text-tertiary hover:bg-grey-50"
        >
          + add sector loop
        </button>
      )}
    </div>
  );
}

function SectorLoopCard({
  sector,
  onOpenIndicator,
  edit,
}: {
  sector: PolicyLoopSector;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
  edit: SectorEdit;
}) {
  return (
    <section
      className="rounded-xl border overflow-hidden bg-white"
      style={{ borderColor: `${sector.color}55` }}
    >
      {/* Sector header */}
      <div className="flex items-start gap-3 px-3 py-2 text-white" style={{ background: sector.color }}>
        <div className="min-w-0 flex-1">
          {edit.editing ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <InlineInput
                  value={sector.label}
                  onChange={(label) => edit.onUpdateSector({ label })}
                  className="font-semibold flex-1"
                />
                <input
                  type="color"
                  value={sector.color}
                  onChange={(e) => edit.onUpdateSector({ color: e.target.value })}
                  className="h-6 w-7 rounded border border-white/40 cursor-pointer shrink-0"
                  title="Sector colour"
                />
                <DeleteButton tone="dark" onClick={edit.onDeleteSector} label="Delete sector loop" />
              </div>
              <InlineInput
                value={sector.blurb}
                onChange={(blurb) => edit.onUpdateSector({ blurb })}
                className="w-full"
                placeholder="Sector loop description"
              />
            </div>
          ) : (
            <>
              <div className="font-semibold text-[13px] leading-tight">{sector.label}</div>
              <p className="text-white/85 text-[10.5px] leading-snug mt-0.5 max-w-3xl">{sector.blurb}</p>
            </>
          )}
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
          <CorridorStation chips={sector.corridor} edit={edit} />
        </Station>
        <Station index={2}>
          <InstrumentsStation chips={sector.policies} edit={edit} />
        </Station>
        <Station index={3}>
          <DeliveryStation sector={sector} onOpenIndicator={onOpenIndicator} edit={edit} />
        </Station>
        <Station index={4}>
          <ObservedStation chips={sector.observed} onOpenIndicator={onOpenIndicator} edit={edit} />
        </Station>
        <Station index={5}>
          <RatchetStation mechanisms={sector.ratchet} edit={edit} />
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

function CorridorStation({ chips, edit }: { chips: LoopBenchmarkChip[]; edit: SectorEdit }) {
  if (chips.length === 0 && !edit.editing) {
    return <p className="text-[10px] text-tertiary-light italic">No benchmark series curated yet.</p>;
  }
  return (
    <div className="space-y-1.5">
      {chips.map((chip) => (
        <div key={chip.code} className="rounded border border-indigo-200 bg-indigo-50/40 px-1.5 py-1">
          <div className="flex items-baseline gap-1 mb-0.5">
            <span className="font-mono font-semibold text-indigo-700 shrink-0">{chip.code}</span>
            <span className="text-[10px] text-tertiary-dark truncate flex-1" title={chip.title}>
              {chip.title}
            </span>
            {edit.editing && (
              <DeleteButton onClick={() => edit.onDeleteBenchmark(chip.code)} label="Remove benchmark" />
            )}
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
      {edit.editing && (
        <AddFromListControl
          options={plEdit.benchmarkOptions()}
          onPick={edit.onAddBenchmark}
          label="+ add benchmark"
        />
      )}
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

function InstrumentsStation({ chips, edit }: { chips: LoopPolicyChip[]; edit: SectorEdit }) {
  if (chips.length === 0 && !edit.editing) {
    return <p className="text-[10px] text-tertiary-light italic">No instruments mapped yet.</p>;
  }
  return (
    <div className="space-y-1">
      {chips.map((p) => (
        <div key={p.id} className="rounded border border-amber-200 bg-amber-50/40 px-1.5 py-1">
          <div className="flex items-baseline gap-1">
            <Link
              href={`/policy-navigator/policy?id=${encodeURIComponent(getViewerPolicyId(p.id))}`}
              className="flex items-baseline gap-1 hover:underline flex-1 min-w-0"
              title={p.name}
            >
              <span className="font-semibold text-amber-800 shrink-0">{p.acronym ?? p.name}</span>
              {p.acronym && <span className="text-[9.5px] text-tertiary truncate">{p.name}</span>}
            </Link>
            {edit.editing && (
              <DeleteButton onClick={() => edit.onDeletePolicy(p.id)} label="Remove instrument" />
            )}
          </div>
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
      {edit.editing && (
        <AddFromListControl
          options={plEdit.policyOptions()}
          onPick={edit.onAddPolicy}
          label="+ add instrument"
        />
      )}
    </div>
  );
}

// ── Stations 3 & 4: indicator chips ──────────────────────────────────────────

function IndicatorChipEl({
  item,
  onOpen,
  edit,
}: {
  item: LoopIndicatorChip;
  onOpen: (p: OpenIndicatorPayload) => void;
  edit: SectorEdit;
}) {
  const linked = item.indicatorIds.length > 0;
  const accent = item.track === 'mitigation' ? MIT_BG : ADAPT_BG;
  if (edit.editing) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] border bg-white"
        style={{ borderColor: `${accent}66` }}
      >
        <span className="font-mono font-semibold shrink-0" style={{ color: accent }}>
          {item.code}
        </span>
        <InlineInput
          value={item.label}
          onChange={(label) => edit.onUpdateChip(item.refId, { label })}
          className="min-w-[80px] max-w-[140px]"
        />
        <button
          onClick={() =>
            edit.onUpdateChip(item.refId, {
              track: item.track === 'mitigation' ? 'adaptation' : 'mitigation',
            })
          }
          className="text-tertiary-light hover:text-tertiary leading-none"
          title="Move to the other track"
          aria-label="Move to the other track"
        >
          ↔
        </button>
        <DeleteButton onClick={() => edit.onDeleteChip(item.refId)} label="Remove chip" />
      </span>
    );
  }
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
  lane,
  items,
  gapNote,
  onOpenIndicator,
  edit,
}: {
  track: 'mitigation' | 'adaptation';
  /** Which sector lane these chips live in (delivery mitigation/adaptation, or observed). */
  lane: LoopLane;
  items: LoopIndicatorChip[];
  gapNote?: string;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
  edit: SectorEdit;
}) {
  const isMit = track === 'mitigation';
  const accent = isMit ? MIT_BG : ADAPT_BG;
  const showGap = !!gapNote;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
        <span className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: accent }}>
          {isMit ? 'Mitigation' : '⛨ Adaptation & resilience'}
        </span>
        <span className="text-[9.5px] text-tertiary-light">· {items.length}</span>
      </div>
      {items.length === 0 && !edit.editing ? (
        showGap ? (
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
              <IndicatorChipEl key={it.refId} item={it} onOpen={onOpenIndicator} edit={edit} />
            ))}
            {edit.editing && (
              <AddIndicatorControl
                allIndicators={edit.allIndicators}
                onAdd={(id) => {
                  const ind = edit.allIndicators.find((i) => i.id === id);
                  if (ind) edit.onAddChip(lane, track, ind);
                }}
              />
            )}
          </div>
          {showGap && !edit.editing && (
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
  edit,
}: {
  sector: PolicyLoopSector;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
  edit: SectorEdit;
}) {
  return (
    <div className="space-y-2">
      <TrackLane
        track="mitigation"
        lane="mitigation"
        items={sector.mitigation}
        onOpenIndicator={onOpenIndicator}
        edit={edit}
      />
      <TrackLane
        track="adaptation"
        lane="adaptation"
        items={sector.adaptation}
        gapNote={sector.adaptationGapNote}
        onOpenIndicator={onOpenIndicator}
        edit={edit}
      />
      {edit.editing && (
        <label className="block text-[9.5px] text-tertiary-light">
          <span className="block mb-0.5">Adaptation monitoring-gap note (shown when the lane is empty)</span>
          <InlineInput
            value={sector.adaptationGapNote ?? ''}
            onChange={(v) => edit.onUpdateSector({ adaptationGapNote: v || undefined })}
            className="w-full"
            placeholder="e.g. No indicator yet tracks adaptation action in this sector."
          />
        </label>
      )}
    </div>
  );
}

function ObservedStation({
  chips,
  onOpenIndicator,
  edit,
}: {
  chips: LoopIndicatorChip[];
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
  edit: SectorEdit;
}) {
  const mitigation = chips.filter((c) => c.track === 'mitigation');
  const adaptation = chips.filter((c) => c.track === 'adaptation');
  return (
    <div className="space-y-2">
      <TrackLane
        track="mitigation"
        lane="observed"
        items={mitigation}
        onOpenIndicator={onOpenIndicator}
        edit={edit}
      />
      <TrackLane
        track="adaptation"
        lane="observed"
        items={adaptation}
        onOpenIndicator={onOpenIndicator}
        edit={edit}
      />
    </div>
  );
}

// ── Station 5: gap & ratchet ─────────────────────────────────────────────────

function RatchetStation({ mechanisms, edit }: { mechanisms: string[]; edit: SectorEdit }) {
  return (
    <ul className="space-y-1">
      {mechanisms.map((m, i) => (
        <li
          key={i}
          className="flex items-start gap-1.5 rounded border border-purple-200 bg-purple-50/40 px-1.5 py-1 text-[10px] text-tertiary-dark leading-snug"
        >
          <span className="text-purple-700 leading-none mt-0.5 shrink-0" aria-hidden="true">
            ↺
          </span>
          {edit.editing ? (
            <>
              <InlineInput
                value={m}
                onChange={(v) => edit.onUpdateRatchet(i, v)}
                className="flex-1"
              />
              <DeleteButton onClick={() => edit.onDeleteRatchet(i)} label="Remove mechanism" />
            </>
          ) : (
            <span>{m}</span>
          )}
        </li>
      ))}
      {edit.editing && (
        <li>
          <button
            onClick={edit.onAddRatchet}
            className="text-[10px] text-purple-700 hover:text-purple-900"
          >
            + add mechanism
          </button>
        </li>
      )}
    </ul>
  );
}
