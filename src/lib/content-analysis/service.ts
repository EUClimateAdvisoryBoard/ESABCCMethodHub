/**
 * Content Analysis — public service surface.
 *
 * The Content Analysis module is embedded by other modules (today the
 * Project Workspace via `components/workspace/ContentAnalysisModule`, and
 * any future host that wants the qualitative-coding workbench). Those hosts
 * should depend on *this* surface — the store hook, the derived-data hooks
 * and the small pure helpers — rather than reaching into individual files
 * under `lib/content-analysis/`, so the module has a stable contract and its
 * internals stay free to move.
 *
 * Everything not re-exported here is an implementation detail of the module.
 * The companion UI surface (embeddable components) lives in
 * `@/components/content-analysis`.
 */

// Store + derived-data hooks ──────────────────────────────────────────────
export { useContentAnalysis } from './store';
export { useLiveReferences, referencePdfCacheKey } from './useLiveReferences';
export { useOverallTags } from './useOverallTags';
export { useReadingAssignments, type ReadingAssignmentsApi } from './useReadingAssignments';
export { useReadStatus, type ReadStatusApi } from './useReadStatus';
export { useGeneralNotes } from './useGeneralNotes';

// Pure helpers ──────────────────────────────────────────────────────────────
export { semanticColorFor, lightenedFromParent } from './semantic-palette';
export { parseCustomTag, resolveOverallTag } from './custom-overall-tags';
export {
  CHAPTER_TAGS,
  isChapterTagId,
  formatChapterTagId,
  chapterTagColor,
  parseChapterTag,
  splitTagIds,
} from './chapter-tags';
export {
  sourceTierOf,
  documentKindLabel,
  SOURCE_TIER_META,
  SOURCE_TIERS,
  type SourceTier,
} from './source-tier';
export { enqueue as enqueueOutbox } from './outbox';

// Core domain types ──────────────────────────────────────────────────────────
export type {
  AnalysisDocument,
  CodeNode,
  CorpusDocMeta,
  DocumentSummary,
  SummaryBlock,
} from './types';
