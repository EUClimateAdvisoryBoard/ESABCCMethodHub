/**
 * Client hook: fetch promoted "Suggested edit" annotations for a policy and
 * expose them as a field-keyed override map.
 *
 * Used by the EU Policy Navigator's sectoral overview cards so that promoting
 * an edit inside the Project Workspace re-writes what the navigator displays
 * for `meaning`, `currentRequirement` and `futureRequirement` — no manual
 * edit of `SECTOR_POLICIES` needed.
 *
 * Reads `/api/project-workspace/policy-annotations?policyId=…`, then filters
 * client-side for `kind === 'edit'` with a non-null `promotedAt`.
 */
'use client';

import { useEffect, useState } from 'react';

interface Annotation {
  id: string;
  policyId: string;
  kind: string;
  field: string;
  value: string;
  promotedAt: string | null;
  status: string;
}

export interface PromotedEdits {
  meaning?: string;
  currentRequirement?: string;
  futureRequirement?: string;
  /** True while the first fetch is still in flight. */
  loading: boolean;
}

const CACHE = new Map<string, Promise<Annotation[]>>();

function fetchAnnotations(policyId: string): Promise<Annotation[]> {
  let p = CACHE.get(policyId);
  if (!p) {
    p = fetch(
      `/api/project-workspace/policy-annotations?policyId=${encodeURIComponent(policyId)}`
    )
      .then(r => (r.ok ? r.json() : { annotations: [] }))
      .then((d: { annotations?: Annotation[] }) => d.annotations ?? [])
      .catch(() => [] as Annotation[]);
    CACHE.set(policyId, p);
  }
  return p;
}

/** Reset cached annotations for a policy — call after a promote/un-promote. */
export function invalidatePromotedEditsCache(policyId?: string) {
  if (policyId) CACHE.delete(policyId);
  else CACHE.clear();
}

export function usePromotedPolicyEdits(
  policyId: string,
  enabled = true
): PromotedEdits {
  const [state, setState] = useState<PromotedEdits>({ loading: enabled });

  useEffect(() => {
    if (!enabled) {
      setState({ loading: false });
      return;
    }
    let cancelled = false;
    setState(s => ({ ...s, loading: true }));
    fetchAnnotations(policyId).then(items => {
      if (cancelled) return;
      const out: PromotedEdits = { loading: false };
      for (const a of items) {
        if (a.kind !== 'edit' || !a.promotedAt || !a.field) continue;
        if (a.field === 'meaning') out.meaning = a.value;
        else if (a.field === 'currentRequirement') out.currentRequirement = a.value;
        else if (a.field === 'futureRequirement') out.futureRequirement = a.value;
      }
      setState(out);
    });
    return () => {
      cancelled = true;
    };
  }, [policyId, enabled]);

  return state;
}
