/**
 * Helpers for building deep links into the Content Analysis Module.
 *
 * Superseded by `src/lib/cross-module-links.ts`, which generalises the
 * same contract across Policy Navigator, Policy Clock, and the Reference
 * Manager. Re-exported here so existing call sites keep working.
 */
import {
  linkToContentAnalysis,
  normaliseArticleRef,
  type ContentAnalysisLinkOpts,
} from './cross-module-links';

export type { ContentAnalysisLinkOpts };
export { normaliseArticleRef };

export function buildContentAnalysisUrl(opts: ContentAnalysisLinkOpts): string {
  return linkToContentAnalysis(opts);
}

export const CONTENT_ANALYSIS_QUERY_KEYS = {
  doc: 'doc',
  highlight: 'highlight',
  context: 'context',
} as const;
