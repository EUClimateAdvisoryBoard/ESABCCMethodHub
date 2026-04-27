/**
 * Cross-module deep-link helpers.
 * --------------------------------
 * Every tracked EU policy already carries a stable string identifier
 * (e.g. `"eu-climate-law"`, `"cbam-regulation"`) defined in
 * `src/data/policies.ts`. That same id is used as:
 *
 *   - the Policy Navigator card / network-graph node id,
 *   - the Content Analysis `AnalysisDocument.id`,
 *   - the optional `policyId` field on Policy Clock events,
 *   - the synthetic policy-citation reference id in the Reference Manager
 *     (see `src/lib/policy-citations.ts`).
 *
 * This file is the single source of truth for the URL contract that
 * stitches those modules together so call sites never hand-roll the
 * strings (which would drift the moment one of the routes changes).
 */
export type UniversalPolicyId = string;

/** Open the Policy Navigator and scroll/pulse the matching card. */
export function linkToPolicyNavigator(policyId: UniversalPolicyId): string {
  return `/policy-navigator?policy=${encodeURIComponent(policyId)}`;
}

/** Open the dedicated Policy Navigator detail page. */
export function linkToPolicyDetail(policyId: UniversalPolicyId): string {
  return `/policy-navigator/policy/?id=${encodeURIComponent(policyId)}`;
}

export interface ContentAnalysisLinkOpts {
  policyId: UniversalPolicyId;
  /** Article / annex / recital reference (e.g. `Art. 9`, `Annex I`). */
  article?: string | null;
  /** Free-text banner explaining why the user landed here. */
  context?: string | null;
}

export function linkToContentAnalysis(opts: ContentAnalysisLinkOpts | UniversalPolicyId): string {
  const o: ContentAnalysisLinkOpts =
    typeof opts === 'string' ? { policyId: opts } : opts;
  const params = new URLSearchParams();
  params.set('doc', o.policyId);
  if (o.article) params.set('highlight', normaliseArticleRef(o.article));
  if (o.context) params.set('context', o.context);
  return `/content-analysis?${params.toString()}`;
}

/** Open the Reference Manager and highlight the policy-citation entry. */
export function linkToReferenceCitation(policyId: UniversalPolicyId): string {
  return `/references?policy=${encodeURIComponent(policyId)}`;
}

/** Open the Policy Clock with the lane filtered to revisions / reviews. */
export function linkToPolicyClock(opts?: { policyId?: UniversalPolicyId; category?: string }): string {
  const params = new URLSearchParams();
  params.set('view', 'policy-clock');
  if (opts?.policyId) params.set('policy', opts.policyId);
  if (opts?.category) params.set('category', opts.category);
  return `/news-feed?${params.toString()}`;
}

export function normaliseArticleRef(raw: string): string {
  const trimmed = raw.trim();
  const artMatch = trimmed.match(/^Art\.?\s*(\d+[a-z]*)/i);
  if (artMatch) return `Article ${artMatch[1]}`;

  const annexMatch = trimmed.match(/^Annex\s+([IVX\d]+[a-z]*)/i);
  if (annexMatch) return `ANNEX ${annexMatch[1].toUpperCase()}`;

  const recitalMatch = trimmed.match(/^Recital\s+(\d+)/i);
  if (recitalMatch) return `(${recitalMatch[1]})`;

  return trimmed;
}

/** Query-param contracts each receiving page reads. */
export const CROSS_MODULE_QUERY_KEYS = {
  policyNavigator: 'policy',
  contentAnalysis: { doc: 'doc', highlight: 'highlight', context: 'context' },
  references: 'policy',
  policyClock: { view: 'view', category: 'category', policy: 'policy' },
} as const;
