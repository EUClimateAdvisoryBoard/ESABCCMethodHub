/**
 * Advanced version 5 — the results-chain flow chart with SECTORS as a sub-layer.
 *
 * Same six rungs and paired mitigation / adaptation tracks as Advanced version 2
 * (see ResultsChainFlow), but inside every track column the chips are clustered
 * by **sector**: each sector gets a thin colour-coded sub-header (dot + label +
 * count) and its chips are border-tinted to match. The rung header reports how
 * many distinct sectors the rung covers, so the third axis — which sectors are
 * touched at each step of the chain — reads at a glance.
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
import { groupBySector, sectorKeyOf } from '@/data/results-chain-v5';
import type { OpenIndicatorPayload } from './SectorFlow';
import { Tooltip } from '@/components/ui/Tooltip';

interface Props {
  board: ResultsChainBoard;
  allIndicators: Indicator[];
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}

const MIT_BG = '#9E4A46';
const ADAPT_BG = '#2E7D74';

/** An indicator is "original report data" only when its group is `esabcc`. */
function isOriginalReportIndicator(ind?: Indicator): boolean {
  if (!ind) return false;
  const group = ind.group ?? (ind.beta ? 'beta' : ind.id.startsWith('esabcc-') ? 'esabcc' : 'additional');
  return group === 'esabcc';
}

/** Distinct sectors covered by a set of chips. */
function sectorsCovered(items: ResultsChainItem[]): number {
  return new Set(items.map((it) => sectorKeyOf(it))).size;
}

export default function SectoredResultsChainFlow({ board, allIndicators, onOpenIndicator }: Props) {
  const lookup = useMemo(() => {
    const m = new Map<string, Indicator>();
    for (const i of allIndicators) m.set(i.id, i);
    return m;
  }, [allIndicators]);

  return (
    <div className="text-[11px] space-y-3">
      {board.groups.map((group, i) => (
        <div key={group.id} className="relative">
          <GroupBand group={group} lookup={lookup} onOpenIndicator={onOpenIndicator} />
          {i < board.groups.length - 1 && (
            <div className="flex justify-center py-0.5" aria-hidden="true">
              <span className="text-tertiary-light text-base leading-none">↓</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function GroupBand({
  group,
  lookup,
  onOpenIndicator,
}: {
  group: ResultsGroup;
  lookup: Map<string, Indicator>;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}) {
  const mitigation = group.items.filter((it) => it.track === 'mitigation');
  const adaptation = group.items.filter((it) => it.track === 'adaptation');
  const rungSectors = sectorsCovered(group.items);

  return (
    <section
      className="rounded-xl border overflow-hidden bg-white"
      style={{ borderColor: `${group.color}55` }}
    >
      {/* Header: number + name + description + sector coverage */}
      <div className="flex items-start gap-3 px-3 py-2 text-white" style={{ background: group.color }}>
        <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/25 font-bold text-[13px]">
          {group.index}
        </span>
        <div className="min-w-0">
          <div className="font-semibold text-[13px] leading-tight">{group.name}</div>
          <p className="text-white/85 text-[10.5px] leading-snug mt-0.5">{group.blurb}</p>
        </div>
        <div className="ml-auto shrink-0 flex flex-col items-end gap-0.5 self-center">
          <span className="text-white/80 text-[10px] font-mono">{group.items.length} ind.</span>
          <span className="inline-flex items-center rounded bg-white/20 px-1.5 py-0.5 text-[9.5px] font-semibold">
            {rungSectors} sector{rungSectors === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Two tracks side by side, each sub-clustered by sector */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-grey-100">
        <TrackColumn
          track="mitigation"
          items={mitigation}
          lookup={lookup}
          onOpenIndicator={onOpenIndicator}
        />
        <TrackColumn
          track="adaptation"
          items={adaptation}
          lookup={lookup}
          onOpenIndicator={onOpenIndicator}
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
}: {
  track: ResultsTrack;
  items: ResultsChainItem[];
  lookup: Map<string, Indicator>;
  onOpenIndicator: (p: OpenIndicatorPayload) => void;
}) {
  const isMit = track === 'mitigation';
  const accent = isMit ? MIT_BG : ADAPT_BG;
  const buckets = groupBySector(items);

  return (
    <div className="p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>
          {isMit ? 'Mitigation' : '⛨ Adaptation & resilience'}
        </span>
        <span className="text-[10px] text-tertiary-light">
          · {items.length} · {buckets.length} sector{buckets.length === 1 ? '' : 's'}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-[10px] text-tertiary-light italic">
          No indicator curated at this rung yet.
        </p>
      ) : (
        <div className="space-y-2">
          {buckets.map((bucket) => (
            <div key={bucket.meta.key}>
              {/* Sector sub-header */}
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: bucket.meta.color }}
                />
                <span
                  className="text-[9.5px] font-semibold uppercase tracking-wide"
                  style={{ color: bucket.meta.color }}
                >
                  {bucket.meta.label}
                </span>
                <span className="text-[9.5px] text-tertiary-light">· {bucket.items.length}</span>
                <span
                  className="h-px flex-1 ml-1"
                  style={{ background: `${bucket.meta.color}33` }}
                  aria-hidden="true"
                />
              </div>
              {/* Sector chips */}
              <div className="flex flex-wrap gap-1 pl-3">
                {bucket.items.map((it) => (
                  <Chip
                    key={it.refId}
                    item={it}
                    accent={accent}
                    sectorColor={bucket.meta.color}
                    lookup={lookup}
                    onOpen={onOpenIndicator}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  item,
  accent,
  sectorColor,
  lookup,
  onOpen,
}: {
  item: ResultsChainItem;
  accent: string;
  sectorColor: string;
  lookup: Map<string, Indicator>;
  onOpen: (p: OpenIndicatorPayload) => void;
}) {
  const linked = item.indicatorIds.length > 0;
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
      style={{ borderColor: `${sectorColor}88` }}
      onClick={() => linked && onOpen({ title: item.label, code: item.code, indicatorIds: item.indicatorIds })}
      title={item.label}
    >
      {/* Sector colour dot */}
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: sectorColor }}
        aria-hidden="true"
      />
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
