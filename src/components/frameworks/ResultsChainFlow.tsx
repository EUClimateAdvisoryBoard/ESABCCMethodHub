/**
 * Advanced version 2 — the results-chain flow chart.
 *
 * Renders the whole indicator catalogue re-clustered along the six rungs of a
 * monitoring-&-evaluation results chain (Input → Process → Output → Outcome →
 * Impact, with Context & Environmental as a cross-cutting base band). Each rung
 * is a numbered band split into two tracks — mitigation and adaptation — so
 * every group (and every outcome especially) pairs mitigation indicators with
 * adaptation & resilience indicators of equal standing.
 *
 * Chips link straight into the project's indicator database; clicking one opens
 * the shared data drawer, exactly like the other flow charts.
 */
'use client';
import { useMemo } from 'react';
import type { Indicator } from '@/data/ecno-indicators';
import type {
  ResultsChainBoard,
  ResultsChainItem,
  ResultsGroup,
  ResultsTrack,
} from '@/data/results-chain-v2';
import * as rcEdit from '@/data/results-chain-edit';
import type { OpenIndicatorPayload } from './SectorFlow';
import { AddIndicatorControl, DeleteButton, InlineInput } from './BoardEditControls';
import { Tooltip } from '@/components/ui/Tooltip';

interface Props {
  board: ResultsChainBoard;
  allIndicators: Indicator[];
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
  /** When true, groups and chips can be relabelled, added, deleted and re-tracked. */
  editing?: boolean;
  /** Receives the next board after any structural edit. Required for editing. */
  onChange?: (board: ResultsChainBoard) => void;
}

const MIT_BG = '#9E4A46';
const ADAPT_BG = '#2E7D74';

/** An indicator is "original report data" only when its group is `esabcc`. */
function isOriginalReportIndicator(ind?: Indicator): boolean {
  if (!ind) return false;
  const group = ind.group ?? (ind.beta ? 'beta' : ind.id.startsWith('esabcc-') ? 'esabcc' : 'additional');
  return group === 'esabcc';
}

export default function ResultsChainFlow({
  board,
  allIndicators,
  onOpenIndicator,
  editing = false,
  onChange,
}: Props) {
  const lookup = useMemo(() => {
    const m = new Map<string, Indicator>();
    for (const i of allIndicators) m.set(i.id, i);
    return m;
  }, [allIndicators]);

  const edit = editing && !!onChange;
  const emit = (next: ResultsChainBoard) => onChange?.(next);

  return (
    <div className="text-[11px] space-y-3">
      {board.groups.map((group, i) => (
        <div key={group.id} className="relative">
          <GroupBand
            group={group}
            lookup={lookup}
            onOpenIndicator={onOpenIndicator}
            editing={edit}
            allIndicators={allIndicators}
            onUpdateGroup={(patch) => emit(rcEdit.updateGroup(board, group.id, patch))}
            onDeleteGroup={() => emit(rcEdit.deleteGroup(board, group.id))}
            onAddItem={(track, ind) => emit(rcEdit.addItem(board, group.id, track, ind))}
            onDeleteItem={(refId) => emit(rcEdit.deleteItem(board, refId))}
            onUpdateItem={(refId, patch) => emit(rcEdit.updateItem(board, refId, patch))}
          />
          {i < board.groups.length - 1 && (
            <div className="flex justify-center py-0.5" aria-hidden="true">
              <span className="text-tertiary-light text-base leading-none">↓</span>
            </div>
          )}
        </div>
      ))}
      {edit && (
        <button
          onClick={() => emit(rcEdit.addGroup(board))}
          className="text-xs font-semibold px-3 py-1.5 rounded-md border border-dashed border-grey-300 text-tertiary hover:bg-grey-50"
        >
          + add group
        </button>
      )}
    </div>
  );
}

interface GroupEditProps {
  editing: boolean;
  allIndicators: Indicator[];
  onUpdateGroup: (patch: Partial<Pick<ResultsGroup, 'name' | 'blurb' | 'color'>>) => void;
  onDeleteGroup: () => void;
  onAddItem: (track: ResultsTrack, ind: Indicator) => void;
  onDeleteItem: (refId: string) => void;
  onUpdateItem: (refId: string, patch: Partial<Pick<ResultsChainItem, 'label' | 'track'>>) => void;
}

function GroupBand({
  group,
  lookup,
  onOpenIndicator,
  editing,
  allIndicators,
  onUpdateGroup,
  onDeleteGroup,
  onAddItem,
  onDeleteItem,
  onUpdateItem,
}: {
  group: ResultsGroup;
  lookup: Map<string, Indicator>;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
} & GroupEditProps) {
  const mitigation = group.items.filter((it) => it.track === 'mitigation');
  const adaptation = group.items.filter((it) => it.track === 'adaptation');

  return (
    <section
      className="rounded-xl border overflow-hidden bg-white"
      style={{ borderColor: `${group.color}55` }}
    >
      {/* Header: number + name + description */}
      <div className="flex items-start gap-3 px-3 py-2 text-white" style={{ background: group.color }}>
        <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/25 font-bold text-[13px]">
          {group.index}
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <InlineInput
                  value={group.name}
                  onChange={(name) => onUpdateGroup({ name })}
                  className="font-semibold flex-1"
                />
                <input
                  type="color"
                  value={group.color}
                  onChange={(e) => onUpdateGroup({ color: e.target.value })}
                  className="h-6 w-7 rounded border border-white/40 cursor-pointer shrink-0"
                  title="Group colour"
                />
              </div>
              <InlineInput
                value={group.blurb}
                onChange={(blurb) => onUpdateGroup({ blurb })}
                className="w-full"
                placeholder="Group description"
              />
            </div>
          ) : (
            <>
              <div className="font-semibold text-[13px] leading-tight">{group.name}</div>
              <p className="text-white/85 text-[10.5px] leading-snug mt-0.5">{group.blurb}</p>
            </>
          )}
        </div>
        <div className="ml-auto shrink-0 flex items-center gap-2 self-center">
          <span className="text-white/80 text-[10px] font-mono">{group.items.length} ind.</span>
          {editing && <DeleteButton tone="dark" onClick={onDeleteGroup} label="Delete group" />}
        </div>
      </div>

      {/* Two tracks side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-grey-100">
        <TrackColumn
          track="mitigation"
          items={mitigation}
          lookup={lookup}
          onOpenIndicator={onOpenIndicator}
          editing={editing}
          allIndicators={allIndicators}
          onAddItem={onAddItem}
          onDeleteItem={onDeleteItem}
          onUpdateItem={onUpdateItem}
        />
        <TrackColumn
          track="adaptation"
          items={adaptation}
          lookup={lookup}
          onOpenIndicator={onOpenIndicator}
          editing={editing}
          allIndicators={allIndicators}
          onAddItem={onAddItem}
          onDeleteItem={onDeleteItem}
          onUpdateItem={onUpdateItem}
        />
      </div>
    </section>
  );
}

function TrackColumn({
  track,
  items,
  lookup,
  onOpenIndicator,
  editing,
  allIndicators,
  onAddItem,
  onDeleteItem,
  onUpdateItem,
}: {
  track: ResultsTrack;
  items: ResultsChainItem[];
  lookup: Map<string, Indicator>;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
  editing: boolean;
  allIndicators: Indicator[];
  onAddItem: (track: ResultsTrack, ind: Indicator) => void;
  onDeleteItem: (refId: string) => void;
  onUpdateItem: (refId: string, patch: Partial<Pick<ResultsChainItem, 'label' | 'track'>>) => void;
}) {
  const isMit = track === 'mitigation';
  const accent = isMit ? MIT_BG : ADAPT_BG;
  return (
    <div className="p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>
          {isMit ? 'Mitigation' : '⛨ Adaptation & resilience'}
        </span>
        <span className="text-[10px] text-tertiary-light">· {items.length}</span>
      </div>
      {items.length === 0 && !editing ? (
        <p className="text-[10px] text-tertiary-light italic">
          No indicator curated at this rung yet.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.map((it) => (
            <Chip
              key={it.refId}
              item={it}
              accent={accent}
              lookup={lookup}
              onOpen={onOpenIndicator}
              editing={editing}
              onDelete={() => onDeleteItem(it.refId)}
              onRelabel={(label) => onUpdateItem(it.refId, { label })}
              onToggleTrack={() =>
                onUpdateItem(it.refId, { track: isMit ? 'adaptation' : 'mitigation' })
              }
            />
          ))}
          {editing && (
            <AddIndicatorControl
              allIndicators={allIndicators}
              onAdd={(id) => {
                const ind = allIndicators.find((i) => i.id === id);
                if (ind) onAddItem(track, ind);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Chip({
  item,
  accent,
  lookup,
  onOpen,
  editing,
  onDelete,
  onRelabel,
  onToggleTrack,
}: {
  item: ResultsChainItem;
  accent: string;
  lookup: Map<string, Indicator>;
  onOpen: (p: OpenIndicatorPayload) => void;
  editing?: boolean;
  onDelete?: () => void;
  onRelabel?: (label: string) => void;
  onToggleTrack?: () => void;
}) {
  const linked = item.indicatorIds.length > 0;
  if (editing) {
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
          onChange={(label) => onRelabel?.(label)}
          className="min-w-[90px] max-w-[150px]"
        />
        <button
          onClick={onToggleTrack}
          className="text-tertiary-light hover:text-tertiary leading-none"
          title="Move to the other track"
          aria-label="Move to the other track"
        >
          ↔
        </button>
        <DeleteButton onClick={() => onDelete?.()} label="Remove chip" />
      </span>
    );
  }
  const isNew =
    linked && item.indicatorIds.every((id) => !isOriginalReportIndicator(lookup.get(id)));
  const storyline = item.indicatorIds
    .map((id) => lookup.get(id)?.storyline)
    .find((s): s is string => !!s);

  return (
    <span
      className={`group/chip inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] border ${
        linked
          ? 'bg-white text-gray-800 cursor-pointer hover:ring-1'
          : 'bg-grey-50 text-tertiary-light border-dashed'
      }`}
      style={{ borderColor: `${accent}66` }}
      onClick={() => linked && onOpen({ title: item.label, code: item.code, indicatorIds: item.indicatorIds })}
      title={item.label}
    >
      <span className="font-mono font-semibold shrink-0" style={{ color: accent }}>
        {item.code}
      </span>
      <span className="max-w-[150px] truncate">{item.label}</span>
      {item.policy && (
        <Tooltip content="Policy-process indicator — tracks the qualitative policy machinery (strategies, plans, coordination, mainstreaming), pairing the quantitative side with the qualitative policy side.">
          <span className="shrink-0 inline-flex items-center rounded bg-amber-100 text-amber-800 px-1 text-[8px] font-bold uppercase tracking-wide">
            policy
          </span>
        </Tooltip>
      )}
      {isNew && (
        <Tooltip content="New indicator — not part of the original ESABCC report's indicator database.">
          <span className="shrink-0 inline-flex items-center rounded bg-emerald-100 text-emerald-700 px-1 text-[8px] font-bold uppercase tracking-wide">
            new
          </span>
        </Tooltip>
      )}
      {storyline && (
        <Tooltip
          content={
            <span className="block">
              <span className="block font-semibold mb-0.5">Why it matters — the storyline</span>
              {storyline}
            </span>
          }
        >
          <span className="text-indigo-600 leading-none" aria-label="Why this indicator matters">
            ⓘ
          </span>
        </Tooltip>
      )}
      {!linked && <span className="italic">no data</span>}
    </span>
  );
}
