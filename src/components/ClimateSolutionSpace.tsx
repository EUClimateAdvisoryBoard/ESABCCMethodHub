'use client';

/**
 * ClimateSolutionSpace — EU vs member-state policy gap matrix for the
 * National Level Climate Policies beta module.
 *
 * Renders the solution-space screening from `climate-solution-space.ts`:
 * one row per solution area, showing how many tracked EU instruments touch
 * it and how many member states have at least one matching instrument.
 * Areas with no EU instrument are flagged "EU silent"; areas where both
 * levels are (near-)absent are "shared blind spots".
 *
 * Rows expand to show the matching EU instruments (EUR-Lex links) and the
 * member-state chips (click → filter the catalogue list on the parent page).
 */

import { useMemo, useState } from 'react';
import type { ClimatePolicy } from '@/lib/climate-laws-types';
import {
  AreaCoverage,
  AreaStatus,
  AREA_STATUS_LABELS,
  computeSolutionSpace,
  SOLUTION_GROUPS,
  summarizeSolutionSpace,
} from '@/lib/climate-solution-space';

const STATUS_COLORS: Record<AreaStatus, string> = {
  'blind-spot': '#C62828',
  'eu-silent': '#E65100',
  'ms-sparse': '#F9A825',
  'covered': '#1B5E20',
};

const MS_TOTAL = 27;

interface Props {
  msPolicies: ClimatePolicy[];
  euPolicies: ClimatePolicy[];
  onSelectCountry: (code: string) => void;
}

type StatusFilter = AreaStatus | 'all' | 'gaps';

export default function ClimateSolutionSpace({ msPolicies, euPolicies, onSelectCountry }: Props) {
  const coverage = useMemo(
    () => computeSolutionSpace(msPolicies, euPolicies),
    [msPolicies, euPolicies],
  );
  const summary = useMemo(() => summarizeSolutionSpace(coverage), [coverage]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const visible = coverage.filter(c =>
    statusFilter === 'all' ? true
    : statusFilter === 'gaps' ? c.status !== 'covered'
    : c.status === statusFilter,
  );

  const groups = SOLUTION_GROUPS
    .map(g => [g, visible.filter(c => c.area.group === g)] as const)
    .filter(([, items]) => items.length > 0);

  return (
    <div>
      {/* Summary cards — act as status filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <SummaryCard
          label="Solution areas screened"
          value={`${summary.areas}`}
          sub={`${summary.covered} covered at both levels`}
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <SummaryCard
          label="EU silent"
          value={`${summary.euSilent}`}
          sub="No tracked EU instrument matches"
          color={STATUS_COLORS['eu-silent']}
          active={statusFilter === 'eu-silent'}
          onClick={() => setStatusFilter(statusFilter === 'eu-silent' ? 'all' : 'eu-silent')}
        />
        <SummaryCard
          label="Shared blind spots"
          value={`${summary.blindSpots}`}
          sub="EU silent and < 9 member states act"
          color={STATUS_COLORS['blind-spot']}
          active={statusFilter === 'blind-spot'}
          onClick={() => setStatusFilter(statusFilter === 'blind-spot' ? 'all' : 'blind-spot')}
        />
        <SummaryCard
          label="Few member states"
          value={`${summary.msSparse}`}
          sub="EU acts, < 9 member states do"
          color={STATUS_COLORS['ms-sparse']}
          active={statusFilter === 'ms-sparse'}
          onClick={() => setStatusFilter(statusFilter === 'ms-sparse' ? 'all' : 'ms-sparse')}
        />
      </div>

      {/* Matrix */}
      <div className="bg-white border border-grey-200 rounded-lg overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_120px_220px_130px] gap-2 px-3 py-2 border-b border-grey-200 bg-grey-50 text-[10px] uppercase tracking-wide text-tertiary">
          <span>Solution area</span>
          <span>EU level</span>
          <span>Member states</span>
          <span>Status</span>
        </div>

        {groups.map(([group, items]) => (
          <div key={group}>
            <div className="px-3 py-1.5 bg-grey-50/60 border-b border-grey-100 text-[11px] font-semibold text-tertiary-dark">
              {group}
            </div>
            {items.map(c => (
              <AreaRow
                key={c.area.id}
                coverage={c}
                expanded={expanded === c.area.id}
                onToggle={() => setExpanded(expanded === c.area.id ? null : c.area.id)}
                onSelectCountry={onSelectCountry}
              />
            ))}
          </div>
        ))}

        {visible.length === 0 && (
          <div className="p-6 text-center text-sm text-tertiary">
            No solution areas match this status.
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-tertiary leading-snug">
        <span className="font-medium">How to read this:</span> each area is
        screened by keyword against the member-state catalogue
        (climate-laws.org) and the EU-level layer (MethodHub Policy Navigator
        + supplement). &ldquo;EU silent&rdquo; means <em>no tracked EU
        instrument matches</em> — a screening result, not a legal conclusion;
        a member state may also act through instruments the catalogue does
        not document. Areas marked with ⚖ sit largely outside EU competence,
        so an EU gap there is structural rather than negligent.
      </p>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, color, active, onClick,
}: {
  label: string;
  value: string;
  sub: string;
  color?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left w-full bg-white border border-grey-200 border-l-4 rounded p-3 transition hover:shadow-md ${
        active ? 'ring-2 ring-primary/40' : ''
      }`}
      style={{ borderLeftColor: color ?? '#00928F' }}
    >
      <div className="text-[11px] uppercase tracking-wide text-tertiary">{label}</div>
      <div className="text-2xl font-bold text-tertiary-dark mt-0.5">{value}</div>
      <div className="text-[11px] text-tertiary mt-1 leading-tight">{sub}</div>
    </button>
  );
}

function AreaRow({
  coverage: c, expanded, onToggle, onSelectCountry,
}: {
  coverage: AreaCoverage;
  expanded: boolean;
  onToggle: () => void;
  onSelectCountry: (code: string) => void;
}) {
  const color = STATUS_COLORS[c.status];
  const msShare = c.msCodes.length / MS_TOTAL;

  return (
    <div className="border-b border-grey-100 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full grid grid-cols-1 sm:grid-cols-[1fr_120px_220px_130px] gap-1 sm:gap-2 px-3 py-2 items-center text-left hover:bg-grey-50 transition"
      >
        <span className="text-[13px] text-tertiary-dark font-medium">
          {c.area.label}
          {c.area.competenceNote && (
            <span className="ml-1 text-tertiary" title={c.area.competenceNote}>⚖</span>
          )}
          <span className={`ml-1.5 text-tertiary text-[10px] ${expanded ? '' : 'sm:hidden'}`}>
            {expanded ? '▾' : ''}
          </span>
        </span>

        <span className="text-[12px]">
          {c.euMatches.length > 0 ? (
            <span className="text-tertiary-dark">
              {c.euMatches.length} instrument{c.euMatches.length === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="font-semibold" style={{ color: STATUS_COLORS['eu-silent'] }}>
              silent
            </span>
          )}
        </span>

        <span className="flex items-center gap-2">
          <span className="flex-1 h-2 bg-grey-100 rounded overflow-hidden max-w-[140px]">
            <span
              className="block h-full rounded"
              style={{ width: `${Math.round(msShare * 100)}%`, backgroundColor: color }}
            />
          </span>
          <span className="text-[11px] text-tertiary whitespace-nowrap">
            {c.msCodes.length}/{MS_TOTAL}
            {c.msInstrumentCount > 0 && ` · ${c.msInstrumentCount} instr.`}
          </span>
        </span>

        <span>
          <span
            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
            style={{ backgroundColor: color }}
          >
            {AREA_STATUS_LABELS[c.status]}
          </span>
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 bg-grey-50/50 text-[12px]">
          <p className="text-tertiary mb-2">{c.area.description}</p>
          {c.area.competenceNote && (
            <p className="text-tertiary mb-2">
              <span className="font-medium">⚖ Competence:</span> {c.area.competenceNote}
            </p>
          )}

          <div className="mb-2">
            <span className="font-medium text-tertiary-dark">EU level:</span>{' '}
            {c.euMatches.length === 0 ? (
              <span style={{ color: STATUS_COLORS['eu-silent'] }}>
                no tracked EU instrument addresses this area.
              </span>
            ) : (
              <span className="inline-flex flex-wrap gap-x-3 gap-y-0.5">
                {c.euMatches.map(p => (
                  <a
                    key={p.id}
                    href={p.documentUrl || p.climateLawsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {p.title} ↗
                  </a>
                ))}
              </span>
            )}
          </div>

          <div>
            <span className="font-medium text-tertiary-dark">
              Member states ({c.msCodes.length}/{MS_TOTAL}):
            </span>{' '}
            {c.msCodes.length === 0 ? (
              <span className="text-tertiary">
                no member state has a matching instrument in the catalogue.
              </span>
            ) : (
              <span className="inline-flex flex-wrap gap-1 align-middle">
                {c.msCodes.map(code => (
                  <button
                    key={code}
                    onClick={() => onSelectCountry(code)}
                    title="Filter the catalogue to this member state"
                    className="text-[10px] px-1.5 py-0.5 rounded-full border border-grey-200 text-tertiary hover:border-primary hover:text-primary transition"
                  >
                    {code}
                  </button>
                ))}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
