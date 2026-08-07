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
import {
  ROUTE_ORDER,
  resolveIndicators,
  routeCounts,
  type ActGroup,
  type FlowChart,
} from './model';

const CONNECTOR = '#94a3b8';

/**
 * How much of each act group is drawn.
 *
 * `compact` is the default: every act group collapses to its header and a route
 * bar, so a whole sector — a dozen acts across three rows — is one figure that
 * fits a screen, and the reader expands the groups they care about. `full`
 * opens every group to the first four cards, which is the older behaviour and
 * the one to use when reading a single act closely.
 */
export type FlowDensity = 'compact' | 'full';

interface Props {
  chart: FlowChart;
  /** The card the detail panel is showing, if any. */
  selectedId: string | null;
  onSelect: (row: TargetAssessment) => void;
  density: FlowDensity;
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

/** How many cards a group shows before it has to be expanded, by density.
 *  Without a cap an act like AFIR turns one row of the chart into a 24-card
 *  tower and the connectors between rows stop being readable; at `compact` the
 *  cap is zero, so the group is a labelled box until the reader opens it. */
const COLLAPSED_CARDS: Record<FlowDensity, number> = { compact: 0, full: 4 };

/** The act group's route mix, drawn as one bar — what a collapsed group still
 *  has to tell the reader: how much of this act is actually measured. */
function RouteBar({ group }: { group: ActGroup }) {
  const counts = routeCounts(group.rows);
  return (
    <Tooltip
      content={ROUTE_ORDER.map((r) => `${counts[r]} ${ROUTE_META[r].short.toLowerCase()}`).join(' · ')}
    >
      <span className="flex h-1.5 w-full overflow-hidden rounded-sm bg-grey-200">
        {ROUTE_ORDER.map((r) => (counts[r] ? (
          <span key={r} style={{ width: `${(counts[r] / counts.total) * 100}%`, background: ROUTE_META[r].color }} />
        ) : null))}
      </span>
    </Tooltip>
  );
}

function GroupBox({
  group, color, register, selectedId, onSelect, density,
}: {
  group: ActGroup;
  color: string;
  register: (id: string) => (el: HTMLElement | null) => void;
  selectedId: string | null;
  onSelect: (row: TargetAssessment) => void;
  density: FlowDensity;
}) {
  const [expanded, setExpanded] = useState(false);
  const cap = COLLAPSED_CARDS[density];
  // A selected card must stay visible even when it sits below the fold.
  const holdsSelection = group.rows.some((r) => r.id === selectedId);
  const showAll = expanded || holdsSelection;
  const shown = showAll ? group.rows : group.rows.slice(0, cap);
  const hidden = group.rows.length - shown.length;
  // Weak matches are the reason to open a group, so a collapsed one still says
  // how many it holds rather than hiding the rows a reviewer is looking for.
  const weak = group.rows.filter((r) => r.confidence === 'weak').length;
  return (
    <div
      ref={register(group.id)}
      className={`${density === 'compact' && !showAll ? 'w-[188px]' : 'w-[268px]'} shrink-0 rounded-lg border border-grey-200 bg-grey-50 p-2`}
    >
      {/* The act header is the expand control: in the compact figure the whole
          box is one click target, so no group needs a separate button row. */}
      <button
        type="button"
        onClick={() => setExpanded(!showAll)}
        aria-expanded={showAll}
        aria-label={`${group.policyName} — ${group.rows.length} target${group.rows.length === 1 ? '' : 's'}, ${showAll ? 'collapse' : 'expand'}`}
        className="mh-focus block w-full text-left"
      >
        <span className="flex items-baseline justify-between gap-1.5">
          <Tooltip content={group.policyName}>
            <span className="truncate text-[11px] font-semibold text-tertiary-dark">{group.policyShort}</span>
          </Tooltip>
          <span className="flex shrink-0 items-baseline gap-1">
            {weak > 0 && (
              <Tooltip content={`${weak} of these ${weak === 1 ? 'targets matches' : 'targets match'} only on the provision heading or the act's title — review first`}>
                <span className="rounded bg-surface-orange px-1 text-[9px] font-semibold text-tertiary-dark">
                  {weak} check
                </span>
              </Tooltip>
            )}
            <span className="font-mono text-[10px] tabular-nums text-tertiary-light">{group.rows.length}</span>
            <span aria-hidden="true" className="text-[9px] text-tertiary-light">{showAll ? '▾' : '▸'}</span>
          </span>
        </span>
        <span className="mt-1 mb-1.5 block" style={{ borderTop: `2px solid ${color}` }}>
          <span className="mt-1 block">
            <RouteBar group={group} />
          </span>
        </span>
      </button>
      {shown.length > 0 && (
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
      )}
      {shown.length > 0 && (hidden > 0 || group.rows.length > cap) && (
        <button
          type="button"
          onClick={() => setExpanded(!showAll)}
          aria-expanded={showAll}
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

export default function TargetFlow({ chart, selectedId, onSelect, density }: Props) {
  const edges = useMemo<Edge[]>(() => chart.edges.map((e) => ({ from: e.from, to: e.to })), [chart]);
  const { containerRef, register, lines, size } = useConnectors(edges, [chart, selectedId, density]);

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
            <div className="flex flex-1 flex-wrap items-start gap-3">
              {chart.outcomes.map((g) => (
                <GroupBox
                  key={`${g.id}:${density}`}
                  group={g}
                  color={RUNG_META.outcome.color}
                  register={register}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  density={density}
                />
              ))}
            </div>
          </div>
        )}

        {chart.levers.length > 0 && (
          <div className="flex gap-3">
            <RowLabel rung="lever" count={leverCount} />
            <div className="flex flex-1 flex-wrap items-start gap-3">
              {chart.levers.map((g) => (
                <GroupBox
                  key={`${g.id}:${density}`}
                  group={g}
                  color={RUNG_META.lever.color}
                  register={register}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  density={density}
                />
              ))}
            </div>
          </div>
        )}

        {chart.enabling.length > 0 && (
          <div className="flex gap-3 rounded-lg" style={{ background: '#FBF8DD' }}>
            <RowLabel rung="enabling" count={enablingCount} />
            <div className="flex flex-1 flex-wrap items-start gap-3 py-2 pr-2">
              {chart.enabling.map((g) => (
                <GroupBox
                  key={`${g.id}:${density}`}
                  group={g}
                  color={RUNG_META.enabling.color}
                  register={register}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  density={density}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-snug text-tertiary-light">
        Each box is an act, on the row its targets belong to; the bar under its name is the mix of
        assessment routes it carries ({ROUTE_ORDER.map((r) => ROUTE_META[r].short.toLowerCase()).join(' · ')}).
        Open a box to read its targets as cards, and the white boxes beneath each card are the indicators
        that measure it. Arrows run from an act&apos;s second-order targets to its first-order targets and
        on to the sector goal. Procedural obligations sit in the band below without a causal arrow — they
        are assessed as milestones, not measured.
      </p>
    </div>
  );
}
