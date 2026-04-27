/**
 * Helpers for building deep links into the Content Analysis Module
 * (`/content-analysis`).
 *
 * The Content Analysis Module is MethodHub's MAXQDA-style qualitative
 * coding workbench. Document IDs there map 1:1 to policy IDs from
 * `src/data/policies.ts`, so a connection-level deep link looks like:
 *
 *   /content-analysis?doc=<policyId>&highlight=<article>&context=<free text>
 *
 * The content-analysis page reads these params on mount and:
 *   - opens directly into the workbench (skipping the landing picker);
 *   - selects the matching document;
 *   - scrolls/flashes the passage matching `highlight`;
 *   - shows `context` in the jump banner so the reader knows what the
 *     referring connection was about.
 *
 * This file is the single source of truth for the query-param contract,
 * so call sites never hand-roll URLs (which would drift as the contract
 * evolves).
 */

export interface ContentAnalysisLinkOpts {
  /** Policy ID (== content-analysis document ID). */
  policyId: string;
  /**
   * Optional article/annex reference to flash-highlight on open.
   * Raw form as written in connection data (e.g. `Art. 9`, `Art. 10a`,
   * `Annex I(b)`); we normalise it downstream.
   */
  article?: string | null;
  /**
   * Optional free-text context explaining why the reader is being
   * sent here — shown as a banner above the document.
   */
  context?: string | null;
}

/**
 * Normalise an article reference into a flash-highlight search term
 * the content-analysis viewer can match against block text. Mirrors
 * the logic in `sectoral-policies.ts#extractHighlightTerm` so both
 * entry points behave the same.
 */
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

export function buildContentAnalysisUrl(opts: ContentAnalysisLinkOpts): string {
  const params = new URLSearchParams();
  params.set('doc', opts.policyId);
  if (opts.article) params.set('highlight', normaliseArticleRef(opts.article));
  if (opts.context) params.set('context', opts.context);
  return `/content-analysis?${params.toString()}`;
}

/** Query-param names the content-analysis page listens for. */
export const CONTENT_ANALYSIS_QUERY_KEYS = {
  doc: 'doc',
  highlight: 'highlight',
  context: 'context',
} as const;
