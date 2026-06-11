/**
 * Objective–delivery checklist for the EU Policy Navigator.
 * ----------------------------------------------------------
 * Shown inside an expanded SectorPolicyCard, below the master-code chips.
 * Renders the policy's twelve assessment-criterion verdicts (from
 * POLICY_OBJECTIVE_CHECKLISTS): can this act deliver its own stated
 * objective, and is it consistent with the Climate Law (neutrality +
 * adaptation)? Criteria judged `not-met` are the objective–content
 * inconsistencies the checklist exists to surface, so they are pulled
 * into a callout above the list.
 *
 * Each verdict carries the same AI/human provenance flow as the master
 * tags: verdicts ship as an AI baseline and a signed-in reviewer can
 * confirm one to promote it to a human assessment (useMasterTagStatus —
 * the (policyId, codeId) key space is shared, `check-*` ids don't collide
 * with thematic `code-*` ids).
 */
'use client';

import { useState } from 'react';
import {
  getPolicyChecklist,
  summarizeChecklist,
  type ChecklistVerdict,
} from '@/lib/content-analysis/policy-objective-checklist';
import { getMasterCode } from '@/lib/content-analysis/master-code-catalog';
import { useMasterTagStatus, tagKey } from '@/lib/content-analysis/useMasterTagStatus';
import TagOriginBadge from '@/components/content-analysis/TagOriginBadge';

const VERDICT_STYLE: Record<
  ChecklistVerdict,
  { label: string; symbol: string; chip: string; dot: string }
> = {
  met: {
    label: 'Met',
    symbol: '✓',
    chip: 'bg-green-50 text-green-800 border-green-200',
    dot: 'bg-green-600',
  },
  partial: {
    label: 'Partial',
    symbol: '◐',
    chip: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  'not-met': {
    label: 'Not met',
    symbol: '✗',
    chip: 'bg-red-50 text-red-800 border-red-200',
    dot: 'bg-red-600',
  },
  'not-applicable': {
    label: 'N/A',
    symbol: '—',
    chip: 'bg-grey-50 text-tertiary border-grey-200',
    dot: 'bg-grey-400',
  },
};

export default function NavigatorObjectiveChecklist({ policyId }: { policyId: string }) {
  const entries = getPolicyChecklist(policyId);
  const [open, setOpen] = useState(false);
  const { isConfirmed, confirm, revert, isSignedIn, busyKey, confirmed } =
    useMasterTagStatus(policyId);

  if (entries.length === 0) return null;

  const summary = summarizeChecklist(entries);
  const gaps = entries.filter(e => e.verdict === 'not-met');
  const humanCount = entries.filter(e => isConfirmed(policyId, e.codeId)).length;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-bold">
          Objective–delivery checklist
          <span className="ml-1.5 font-medium normal-case text-tertiary-light">
            · {humanCount}/{entries.length} confirmed
          </span>
        </p>
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-semibold text-green-700">{summary.met} met</span>
          {summary.partial > 0 && (
            <span className="text-[10px] font-semibold text-amber-600">
              {summary.partial} partial
            </span>
          )}
          {summary.notMet > 0 && (
            <span className="text-[10px] font-semibold text-red-700">
              {summary.notMet} not met
            </span>
          )}
          {summary.score !== null && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-grey-200 bg-white text-tertiary-dark"
              title="Deliverability score: met + ½·partial over applicable criteria"
            >
              {Math.round(summary.score * 100)}%
            </span>
          )}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-tertiary transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {gaps.length > 0 && (
        <div className="mt-1.5 rounded border border-red-200 bg-red-50 px-2.5 py-1.5">
          <p className="text-[10px] font-bold text-red-800 uppercase tracking-wide mb-0.5">
            Objective–content inconsistencies
          </p>
          <p className="text-[10px] text-red-800 leading-relaxed">
            {gaps
              .map(g => getMasterCode(g.codeId)?.name ?? g.codeId)
              .join(' · ')}
          </p>
        </div>
      )}

      {open && (
        <ul className="mt-2 space-y-1">
          {entries.map(e => {
            const code = getMasterCode(e.codeId);
            const v = VERDICT_STYLE[e.verdict];
            const human = isConfirmed(policyId, e.codeId);
            const key = tagKey(policyId, e.codeId);
            const conf = confirmed.get(key);
            return (
              <li
                key={e.codeId}
                className="flex items-start gap-2 rounded border border-grey-100 bg-white px-2 py-1.5"
              >
                <span
                  className={`mt-px inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-bold shrink-0 ${v.chip}`}
                  title={code?.description ?? ''}
                >
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${v.dot}`} />
                  {v.symbol} {v.label}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold text-tertiary-dark">
                    {code?.name ?? e.codeId}
                  </span>
                  <span className="block text-[10px] text-tertiary leading-relaxed">
                    {e.rationale}
                  </span>
                </span>
                <span className="mt-px shrink-0">
                  <TagOriginBadge
                    origin={human ? 'human' : 'ai'}
                    canEdit={isSignedIn}
                    busy={busyKey === key}
                    confirmedByName={conf?.confirmedByName}
                    onConfirm={() => confirm(policyId, e.codeId)}
                    onRevert={() => revert(policyId, e.codeId)}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
