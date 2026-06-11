/**
 * Objective–delivery checklist matrix — corpus-wide heat view.
 * ------------------------------------------------------------
 * Policies × the twelve assessment criteria from the `root-assessment`
 * branch, each cell coloured by verdict (met / partial / not met / n.a.).
 * Built to surface objective–content inconsistencies at a glance:
 *
 *   • rows sort worst-first by default, so the policies least able to
 *     deliver their own objective float to the top;
 *   • clicking a column header re-sorts by that single criterion
 *     (not-met first) — e.g. one click on "Adapt" lists every act that
 *     fails the consistency-for-adaptation check;
 *   • clicking a row expands the full 12-criterion detail with the
 *     evidence-grounded rationales.
 *
 * Reused in two homes: the Policy Navigator (full 97-policy library,
 * scoped to the active sector/code filters) and the Project Workspace's
 * Content Analysis module (scoped to the workspace corpus, with a toggle
 * out to the full library).
 */
'use client';

import { useMemo, useState } from 'react';
import {
  CHECKLIST_CODE_IDS,
  POLICY_OBJECTIVE_CHECKLISTS,
  getPolicyChecklist,
  summarizeChecklist,
  type ChecklistVerdict,
  type PolicyChecklistEntry,
} from '@/lib/content-analysis/policy-objective-checklist';
import { getMasterCode } from '@/lib/content-analysis/master-code-catalog';
import { policies } from '@/data/policies';

const SHORT_TITLE_BY_ID = new Map(policies.map(p => [p.id, p.short_title] as const));

/** Compact column captions; full criterion names live in the header tooltip. */
const COLUMN_LABELS: Record<string, string> = {
  'check-objective': 'Obj',
  'check-target-quant': 'Targets',
  'check-timeline': 'Time',
  'check-instruments': 'Instr',
  'check-coverage': 'Cover',
  'check-monitoring': 'MRV',
  'check-enforcement': 'Enforce',
  'check-financing': 'Fin',
  'check-cons-neutrality': 'Neutral',
  'check-cons-adaptation': 'Adapt',
  'check-just-transition': 'Just',
  'check-review': 'Review',
};

const VERDICT_CELL: Record<ChecklistVerdict, { bg: string; symbol: string; label: string }> = {
  met: { bg: '#16A34A', symbol: '✓', label: 'Met' },
  partial: { bg: '#F59E0B', symbol: '◐', label: 'Partial' },
  'not-met': { bg: '#DC2626', symbol: '✗', label: 'Not met' },
  'not-applicable': { bg: '#D1D5DB', symbol: '—', label: 'N/A' },
};

/** Sort weight: surface real inconsistencies first, park n.a. last. */
const VERDICT_RANK: Record<ChecklistVerdict, number> = {
  'not-met': 0,
  partial: 1,
  met: 2,
  'not-applicable': 3,
};

type SortMode = 'gaps' | 'score' | 'name';

interface Row {
  policyId: string;
  title: string;
  entries: PolicyChecklistEntry[];
  byCode: Map<string, PolicyChecklistEntry>;
  score: number | null;
  notMet: number;
}

interface Props {
  /** Restrict to these policy ids (e.g. a workspace corpus or the navigator's
   *  active filter). Ids without a checklist are silently skipped. */
  scopeIds?: string[];
  /** Label for the scoped set in the scope toggle (e.g. "This workspace"). */
  scopeLabel?: string;
}

export default function ObjectiveChecklistMatrix({ scopeIds, scopeLabel }: Props) {
  const allIds = useMemo(() => Object.keys(POLICY_OBJECTIVE_CHECKLISTS), []);
  const scopedIds = useMemo(
    () => (scopeIds ? scopeIds.filter(id => id in POLICY_OBJECTIVE_CHECKLISTS) : null),
    [scopeIds],
  );

  // When a scope is supplied but matches no assessed policy (e.g. a corpus of
  // scientific papers), fall back to the full library so the view is never
  // a dead end.
  const scopeUsable = scopedIds !== null && scopedIds.length > 0;
  const [useScope, setUseScope] = useState(true);
  const activeIds = scopeUsable && useScope ? scopedIds : allIds;

  const [sortMode, setSortMode] = useState<SortMode>('gaps');
  /** Column the user clicked to sort by a single criterion (not-met first). */
  const [focusCodeId, setFocusCodeId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    let out = activeIds.map(policyId => {
      const entries = getPolicyChecklist(policyId);
      const summary = summarizeChecklist(entries);
      return {
        policyId,
        title: SHORT_TITLE_BY_ID.get(policyId) ?? policyId,
        entries,
        byCode: new Map(entries.map(e => [e.codeId, e] as const)),
        score: summary.score,
        notMet: summary.notMet,
      };
    });
    if (q) out = out.filter(r => r.title.toLowerCase().includes(q));
    out.sort((a, b) => {
      if (focusCodeId) {
        const ra = VERDICT_RANK[a.byCode.get(focusCodeId)?.verdict ?? 'not-applicable'];
        const rb = VERDICT_RANK[b.byCode.get(focusCodeId)?.verdict ?? 'not-applicable'];
        if (ra !== rb) return ra - rb;
      }
      if (sortMode === 'name') return a.title.localeCompare(b.title);
      const sa = a.score ?? 1.01;
      const sb = b.score ?? 1.01;
      if (sa !== sb) return sortMode === 'gaps' ? sa - sb : sb - sa;
      return a.title.localeCompare(b.title);
    });
    return out;
  }, [activeIds, query, sortMode, focusCodeId]);

  /** Per-criterion not-met counts across the active scope, for the header. */
  const columnGaps = useMemo(() => {
    const m: Record<string, number> = {};
    for (const id of activeIds) {
      for (const e of getPolicyChecklist(id)) {
        if (e.verdict === 'not-met') m[e.codeId] = (m[e.codeId] ?? 0) + 1;
      }
    }
    return m;
  }, [activeIds]);

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search policies…"
          className="px-2.5 py-1.5 border border-grey-200 rounded text-[12px] w-44"
        />
        <select
          value={sortMode}
          onChange={e => setSortMode(e.target.value as SortMode)}
          className="px-2 py-1.5 border border-grey-200 rounded text-[12px] bg-white text-tertiary-dark"
        >
          <option value="gaps">Most gaps first</option>
          <option value="score">Highest score first</option>
          <option value="name">A–Z</option>
        </select>
        {focusCodeId && (
          <button
            type="button"
            onClick={() => setFocusCodeId(null)}
            className="px-2 py-1 rounded-full border border-red-200 bg-red-50 text-red-800 text-[11px] font-medium"
            title="Clear the criterion focus"
          >
            Sorted by: {getMasterCode(focusCodeId)?.name ?? focusCodeId} ✕
          </button>
        )}
        {scopeUsable && (
          <div className="ml-auto flex items-center rounded-full border border-grey-200 overflow-hidden text-[11px]">
            <button
              type="button"
              onClick={() => setUseScope(true)}
              className={`px-2.5 py-1 ${useScope ? 'bg-primary text-white' : 'bg-white text-tertiary'}`}
            >
              {scopeLabel ?? 'In scope'} ({scopedIds!.length})
            </button>
            <button
              type="button"
              onClick={() => setUseScope(false)}
              className={`px-2.5 py-1 ${!useScope ? 'bg-primary text-white' : 'bg-white text-tertiary'}`}
            >
              Full library ({allIds.length})
            </button>
          </div>
        )}
      </div>

      {scopedIds !== null && scopedIds.length === 0 && (
        <p className="text-[11px] text-tertiary">
          No assessed policies in the current scope — showing the full policy library.
          Add policy documents to the corpus to scope the matrix.
        </p>
      )}

      {/* Matrix */}
      <div className="overflow-x-auto border border-grey-200 rounded-lg bg-white">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-grey-50 border-b border-grey-200">
              <th className="text-left px-3 py-2 font-bold text-tertiary-dark sticky left-0 bg-grey-50 min-w-[180px]">
                Policy
              </th>
              <th
                className="px-2 py-2 font-bold text-tertiary-dark text-right whitespace-nowrap"
                title="Deliverability score: met + ½·partial over applicable criteria"
              >
                Score
              </th>
              {CHECKLIST_CODE_IDS.map(codeId => {
                const code = getMasterCode(codeId);
                const gaps = columnGaps[codeId] ?? 0;
                const focused = focusCodeId === codeId;
                return (
                  <th key={codeId} className="px-0.5 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => setFocusCodeId(focused ? null : codeId)}
                      title={`${code?.name ?? codeId}\n${code?.description ?? ''}\n${gaps} not met in scope · click to sort by this criterion`}
                      className={`px-1 py-0.5 rounded text-[10px] font-bold ${
                        focused ? 'bg-primary text-white' : 'text-tertiary hover:text-tertiary-dark'
                      }`}
                    >
                      {COLUMN_LABELS[codeId] ?? codeId}
                      {gaps > 0 && (
                        <span className={`block text-[9px] font-medium ${focused ? 'text-white/80' : 'text-red-700'}`}>
                          {gaps}✗
                        </span>
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const expanded = expandedId === row.policyId;
              return (
                <RowGroup
                  key={row.policyId}
                  row={row}
                  expanded={expanded}
                  onToggle={() => setExpandedId(expanded ? null : row.policyId)}
                />
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={2 + CHECKLIST_CODE_IDS.length} className="px-3 py-6 text-center text-tertiary">
                  No policies match the search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-tertiary">
        {(Object.keys(VERDICT_CELL) as ChecklistVerdict[]).map(v => (
          <span key={v} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: VERDICT_CELL[v].bg }}
            />
            {VERDICT_CELL[v].label}
          </span>
        ))}
        <span className="ml-auto">
          AI-assessed baseline — confirm or revert individual verdicts on each policy card in the
          Policy Navigator. Click a column to rank by that criterion; click a row for the rationale.
        </span>
      </div>
    </div>
  );
}

function RowGroup({
  row,
  expanded,
  onToggle,
}: {
  row: Row;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`border-b border-grey-100 cursor-pointer ${expanded ? 'bg-blue-50/40' : 'hover:bg-grey-50'}`}
        onClick={onToggle}
      >
        <td className="px-3 py-1.5 sticky left-0 bg-inherit">
          <span className="font-medium text-tertiary-dark">{row.title}</span>
          {row.notMet > 0 && (
            <span className="ml-1.5 text-[9px] font-bold text-red-700">{row.notMet}✗</span>
          )}
        </td>
        <td className="px-2 py-1.5 text-right font-bold tabular-nums text-tertiary-dark whitespace-nowrap">
          {row.score !== null ? `${Math.round(row.score * 100)}%` : '—'}
        </td>
        {CHECKLIST_CODE_IDS.map(codeId => {
          const e = row.byCode.get(codeId);
          const v = VERDICT_CELL[e?.verdict ?? 'not-applicable'];
          const code = getMasterCode(codeId);
          return (
            <td key={codeId} className="px-0.5 py-1.5 text-center">
              <span
                className="inline-flex items-center justify-center h-4 w-6 rounded-sm text-[9px] font-bold text-white"
                style={{ backgroundColor: v.bg }}
                title={`${code?.name ?? codeId}: ${v.label}${e?.rationale ? '\n' + e.rationale : ''}`}
              >
                {v.symbol}
              </span>
            </td>
          );
        })}
      </tr>
      {expanded && (
        <tr className="border-b border-grey-200 bg-blue-50/30">
          <td colSpan={2 + CHECKLIST_CODE_IDS.length} className="px-4 py-3">
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {row.entries.map(e => {
                const v = VERDICT_CELL[e.verdict];
                const code = getMasterCode(e.codeId);
                return (
                  <li key={e.codeId} className="flex items-start gap-2 bg-white border border-grey-100 rounded px-2 py-1.5">
                    <span
                      className="mt-px inline-flex items-center justify-center h-4 w-6 rounded-sm text-[9px] font-bold text-white shrink-0"
                      style={{ backgroundColor: v.bg }}
                    >
                      {v.symbol}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold text-tertiary-dark">
                        {code?.name ?? e.codeId}
                        <span className="ml-1 font-medium text-tertiary">· {v.label}</span>
                      </span>
                      <span className="block text-[10px] text-tertiary leading-relaxed">{e.rationale}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}
