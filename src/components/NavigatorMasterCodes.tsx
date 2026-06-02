/**
 * Master code chips for the EU Policy Navigator.
 * -----------------------------------------------
 * Shown inside an expanded SectorPolicyCard. Renders the policy's master
 * taxonomy codes (from POLICY_MASTER_TAGS) as coloured chips, grouped
 * hierarchically. Clicking a chip tells the navigator to filter the
 * sectoral-overview list to all policies that carry that code (or any
 * descendant of it).
 *
 * Each chip also carries an AI/human provenance badge: the master tags ship
 * as an AI-generated baseline ("AI tag"), and a signed-in reviewer can click
 * the badge to confirm a tag they agree with — promoting it to a "human tag"
 * (persisted via useMasterTagStatus). Clicking a confirmed badge reverts it.
 */
'use client';

import { useMemo } from 'react';
import { POLICY_MASTER_TAGS } from '@/lib/content-analysis/policy-master-tags';
import {
  getMasterCode,
  getMasterCodePath,
} from '@/lib/content-analysis/master-code-catalog';
import { useMasterTagStatus, tagKey } from '@/lib/content-analysis/useMasterTagStatus';
import TagOriginBadge from '@/components/content-analysis/TagOriginBadge';
import type { CodeNode } from '@/lib/content-analysis/types';

interface Props {
  policyId: string;
  /** Currently-active code filter (if any) — used to highlight the chip. */
  activeCodeId: string | null;
  /** Called when the user clicks a chip to set / clear a code filter. */
  onCodeFilter: (codeId: string | null) => void;
}

interface ChipNode {
  code: CodeNode;
  breadcrumb: string;
}

export default function NavigatorMasterCodes({
  policyId,
  activeCodeId,
  onCodeFilter,
}: Props) {
  const tagIds = POLICY_MASTER_TAGS[policyId] ?? [];
  const { isConfirmed, confirm, revert, isSignedIn, busyKey, confirmed } =
    useMasterTagStatus(policyId);

  const chips = useMemo<ChipNode[]>(() => {
    return tagIds
      .map(id => {
        const code = getMasterCode(id);
        if (!code) return null;
        const path = getMasterCodePath(id);
        const breadcrumb =
          path.length > 1
            ? path
                .slice(0, -1)
                .map(c => c.name)
                .join(' › ')
            : '';
        return { code, breadcrumb };
      })
      .filter((c): c is ChipNode => c !== null);
  }, [tagIds]);

  if (chips.length === 0) return null;

  const humanCount = chips.filter(c => isConfirmed(policyId, c.code.id)).length;

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-bold mb-1.5">
        SLR codes (master taxonomy)
        <span className="ml-1.5 font-medium normal-case text-tertiary-light">
          · {humanCount}/{chips.length} confirmed
        </span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map(({ code, breadcrumb }) => {
          const isActive = activeCodeId === code.id;
          const human = isConfirmed(policyId, code.id);
          const key = tagKey(policyId, code.id);
          const conf = confirmed.get(key);
          return (
            <span
              key={code.id}
              className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full border text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-white border-transparent'
                  : 'bg-white text-tertiary-dark border-grey-200'
              }`}
              style={
                isActive
                  ? { backgroundColor: code.color, borderColor: code.color }
                  : undefined
              }
            >
              <button
                type="button"
                onClick={() => onCodeFilter(isActive ? null : code.id)}
                title={
                  breadcrumb
                    ? `${breadcrumb} › ${code.name}${code.description ? '\n' + code.description : ''}`
                    : code.description || code.name
                }
                className="inline-flex items-center gap-1"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: code.color }}
                />
                {code.name}
                {breadcrumb && (
                  <span className="text-[9px] opacity-60 ml-0.5">{breadcrumb}</span>
                )}
              </button>
              <TagOriginBadge
                origin={human ? 'human' : 'ai'}
                canEdit={isSignedIn}
                busy={busyKey === key}
                confirmedByName={conf?.confirmedByName}
                onConfirm={() => confirm(policyId, code.id)}
                onRevert={() => revert(policyId, code.id)}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
