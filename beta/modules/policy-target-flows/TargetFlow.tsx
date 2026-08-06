'use client';
/**
 * One sector column of M·53, drawn as a connected flow chart in the visual
 * language of the Project Workspace's Policy Gap 2.0 boards: a coloured
 * level-label column on the left, one row per level, level-coloured cards, and
 * white indicator boxes beneath each card.
 *
 * Cards are M·36 targets grouped by the act that sets them; connectors run
 * between act groups (second-order → first-order → sector goal), which is what
 * keeps the chart legible with hundreds of targets in a column.
 */
import { useMemo, useState } from 'react';
import { useConnectors, type Edge } from '@/components/frameworks/useConnectors';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  CONFIDENCE_META,
  FAMILY_BY_KEY,
  ROUTE_META,
  RUNG_META,
  type TargetAssessment,
} from '@/data/target-indicators';
import { resolveIndicators, type ActGroup, type FlowChart } from './model';

const CONNECTOR = '#94a3b8';

interface Props {
  chart: FlowChart;
  /** The card the detail panel is showing, if any. */
  selectedId: string | null;
  onSelect: (row: TargetAssessment) => void;
}

/** White indicator box — the report figures' progress-indicator boxes. */
function IndicatorBox({ row }: { row: TargetAssessment }) {
  const indicators = resolveIndicators(row.indicator_ids).slice(0, 2);
  if (row.route === 'series' && indicators.length) {
    return (
      <div className="flex flex-wrap gap-1">
        {indicators.map((ind) => (
          <Tooltip key={ind.id} content={`${ind.name} — ${ind.source}`}>
            <span className="inline-flex items-center gap-1 rounded border border-grey-300 bg-white px-1.5 py-[3px] text-[10px] text-tertiary max-w-[190px]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ROUTE_META.series.color }} />
              <span className="truncate">{ind.name}</span>
              <span className="shrink-0 font-mono tabular-nums text-tertiary-light">{ind.unit}</span>
            </span>
          </Tooltip>
        ))}
        {row.indicator_ids.length > 2 && (
          <span className="rounded border border-grey-300 bg-white px-1.5 py-[3px] text-[10px] text-tertiary-light">
            +{row.indicator_ids.length - 2} more
          </span>
        )}
      </div>
    );
  }
  const family = FAMILY_BY_KEY[row.families[0]];
  const meta = ROUTE_META[row.route];
  return (
    <Tooltip content={family ? `${family.label} — ${family.dataset.name}` : meta.label}>
      <span
        className="inline-flex max-w-full items-center gap-1 rounded border border-dashed px-1.5 py-[3px] text-[10px]"
        style={{ borderColor: meta.color, color: meta.color, background: meta.bg }}
      >
        <span className="truncate">
          {row.route === 'milestone' ? 'Milestone — act’s own deadline' : family?.label ?? 'Indicator to build'}
        </span>
      </span>
    </Tooltip>
  );
}

function TargetCard({
  row, color, selected, onSelect,
}: { row: TargetAssessment; color: string; selected: boolean; onSelect: () => void }) {
  const meta = ROUTE_META[row.route];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`mh-focus w-full rounded-md border bg-white p-2 text-left transition-shadow hover:shadow-sm ${
        selected ? 'border-primary ring-1 ring-primary' : 'border-grey-200'
      }`}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-[9.5px] uppercase tracking-wide text-tertiary-light">
            {row.target.article.split(/\s+—\s+/)[0]}
          </span>
          <span className="block text-[11.5px] font-medium leading-snug text-tertiary-dark">{row.label}</span>
        </span>
        <span
          className="shrink-0 rounded px-1 py-[1px] text-[9.5px] font-semibold uppercase tracking-wide"
          style={{ color: meta.color, background: meta.bg }}
        >
          {meta.short}
        </span>
      </span>
      <span className="mt-1 flex items-center gap-1.5">
        <span className="text-[9.5px] uppercase tracking-wide text-tertiary-light">
          {row.target.timeline || 'No date in the quote'}
        </span>
        {row.confidence === 'weak' && (
          <Tooltip content={CONFIDENCE_META.weak.note}>
            <span className="rounded bg-surface-orange px-1 text-[9.5px] font-semibold text-tertiary-dark">
              check
            </span>
          </Tooltip>
        )}
      </span>
      <span className="mt-1.5 block">
        <IndicatorBox row={row} />
      </span>
    </button>
  );
}

/** How many cards a group shows before it has to be expanded. Without this an
 *  act like AFIR turns one row of the chart into a 24-card tower and the
 *  connectors between rows stop being readable. */
const COLLAPSED_CARDS = 4;

function GroupBox({
  group, color, register, selectedId, onSelect,
}: {
  group: ActGroup;
  color: string;
  register: (id: string) => (el: HTMLElement | null) => void;
  selectedId: string | null;
  onSelect: (row: TargetAssessment) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // A selected card must stay visible even when it sits below the fold.
  const holdsSelection = group.rows.some((r) => r.id === selectedId);
  const showAll = expanded || holdsSelection;
  const shown = showAll ? group.rows : group.rows.slice(0, COLLAPSED_CARDS);
  const hidden = group.rows.length - shown.length;
  return (
    <div
      ref={register(group.id)}
      className="w-[268px] shrink-0 rounded-lg border border-grey-200 bg-grey-50 p-2"
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <Tooltip content={group.policyName}>
          <span className="truncate text-[11px] font-semibold text-tertiary-dark">{group.policyShort}</span>
        </Tooltip>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-tertiary-light">
          {group.rows.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {shown.map((row) => (
          <TargetCard
            key={row.id}
            row={row}
            color={color}
            selected={selectedId === row.id}
            onSelect={() => onSelect(row)}
          />
        ))}
      </div>
      {(hidden > 0 || (showAll && group.rows.length > COLLAPSED_CARDS)) && (
        <button
          type="button"
          onClick={() => setExpanded(!showAll)}
          className="mh-focus mt-1.5 w-full rounded border border-grey-300 bg-white py-1 text-[10.5px] font-semibold text-tertiary hover:bg-grey-100"
        >
          {hidden > 0 ? `Show ${hidden} more target${hidden === 1 ? '' : 's'}` : 'Show fewer'}
        </button>
      )}
    </div>
  );
}

function RowLabel({ rung, count }: { rung: keyof typeof RUNG_META; count: number }) {
  const meta = RUNG_META[rung];
  return (
    <div
      className="flex w-[132px] shrink-0 flex-col justify-center rounded-lg px-2.5 py-3 text-white"
      style={{ background: meta.color }}
    >
      <span className="text-[11.5px] font-semibold leading-tight">{meta.label}</span>
      <span className="mt-1 font-mono text-[11px] tabular-nums opacity-90">{count} targets</span>
    </div>
  );
}

export default function TargetFlow({ chart, selectedId, onSelect }: Props) {
  const edges = useMemo<Edge[]>(() => chart.edges.map((e) => ({ from: e.from, to: e.to })), [chart]);
  const { containerRef, register, lines, size } = useConnectors(edges, [chart, selectedId]);

  const outcomeCount = chart.outcomes.reduce((n, g) => n + g.rows.length, 0);
  const leverCount = chart.levers.reduce((n, g) => n + g.rows.length, 0);
  const enablingCount = chart.enabling.reduce((n, g) => n + g.rows.length, 0);
  const goalIndicators = resolveIndicators(chart.goalIndicatorIds).slice(0, 4);

  const empty = outcomeCount + leverCount + enablingCount === 0;

  return (
    <div ref={containerRef} className="relative overflow-x-auto pb-2">
      <svg
        className="pointer-events-none absolute left-0 top-0"
        width={size.w}
        height={size.h}
        aria-hidden="true"
      >
        {lines.map((l) => (
          <path key={l.id} d={l.d} fill="none" stroke={CONNECTOR} strokeWidth={1.25} />
        ))}
      </svg>

      <div className="relative flex min-w-[900px] flex-col gap-4">
        {/* Sector goal — the dark band at the top of every report figure. */}
        <div className="flex gap-3">
          <div className="w-[132px] shrink-0" />
          {/* Dark goal box as in the report figures; the sector colour is carried
              on the left edge rather than as a fill, so the text stays legible
              on the lighter sector palettes. */}
          <div
            ref={register('goal')}
            className="flex-1 rounded-lg bg-tertiary-dark p-3 text-white"
            style={{ borderLeft: `5px solid ${chart.column.color}` }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-90">
              {chart.column.label} — sector goal
            </p>
            <p className="mt-1 max-w-4xl text-[13px] leading-snug">{chart.column.goal}</p>
            <p className="mt-1 text-[10.5px] opacity-85">Source: {chart.column.goalSource}</p>
            {goalIndicators.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {goalIndicators.map((ind) => (
                  <span
                    key={ind.id}
                    className="rounded border border-white/40 bg-white/15 px-1.5 py-[3px] text-[10px]"
                  >
                    {ind.name} <span className="font-mono tabular-nums opacity-80">{ind.unit}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {empty && (
          <div className="rounded-lg border border-dashed border-grey-300 bg-grey-50 px-4 py-8 text-center text-sm text-tertiary">
            No target in this sector matches the current filters. Clear a filter to bring the chart back.
          </div>
        )}

        {chart.outcomes.length > 0 && (
          <div className="flex gap-3">
            <RowLabel rung="outcome" count={outcomeCount} />
            <div className="flex flex-1 flex-wrap gap-3">
              {chart.outcomes.map((g) => (
                <GroupBox key={g.id} group={g} color={RUNG_META.outcome.color} register={register} selectedId={selectedId} onSelect={onSelect} />
              ))}
            </div>
          </div>
        )}

        {chart.levers.length > 0 && (
          <div className="flex gap-3">
            <RowLabel rung="lever" count={leverCount} />
            <div className="flex flex-1 flex-wrap gap-3">
              {chart.levers.map((g) => (
                <GroupBox key={g.id} group={g} color={RUNG_META.lever.color} register={register} selectedId={selectedId} onSelect={onSelect} />
              ))}
            </div>
          </div>
        )}

        {chart.enabling.length > 0 && (
          <div className="flex gap-3 rounded-lg" style={{ background: '#FBF8DD' }}>
            <RowLabel rung="enabling" count={enablingCount} />
            <div className="flex flex-1 flex-wrap gap-3 py-2 pr-2">
              {chart.enabling.map((g) => (
                <GroupBox key={g.id} group={g} color={RUNG_META.enabling.color} register={register} selectedId={selectedId} onSelect={onSelect} />
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] text-tertiary-light">
        Cards are targets, grouped by the act that sets them; the white boxes beneath each card are the
        indicators that measure it. Arrows run from an act&apos;s second-order targets to its first-order
        targets and on to the sector goal. Procedural obligations sit in the band below without a causal
        arrow — they are assessed as milestones, not measured.
      </p>
    </div>
  );
}
