/**
 * Source tiers for the Content Analysis workbench.
 *
 * The corpus mixes three editorially distinct kinds of text, and analysts
 * code each tier differently (a binding legal act is read for obligations;
 * a peer-reviewed paper for evidence; a think-tank report for context). The
 * reference library already preserves the original reference-manager type
 * (see `AnalysisDocument.referenceType`), so we can split it without any new
 * data:
 *
 *   - `policy`     — EU policy / legal texts (`sourceKind === 'policy'`).
 *   - `scientific` — peer-reviewed literature: article / book / chapter.
 *   - `grey`       — grey literature & reports: report / web / legislation.
 *
 * Keeping the mapping in one place means the source filter, the guided tour
 * and any future tier-aware view all agree on what counts as "scientific".
 */
import type { AnalysisDocument } from './types';

export type SourceTier = 'policy' | 'scientific' | 'grey';

/** Reference types that count as peer-reviewed scientific literature. */
const SCIENTIFIC_REFERENCE_TYPES: ReadonlySet<string> = new Set([
  'article',
  'book',
  'chapter',
]);

/** Classify a document into one of the three source tiers. Documents with no
 *  `sourceKind` default to `policy` (the historical default); references with
 *  an unknown / missing `referenceType` fall through to `grey`, which is the
 *  safer bucket for non-peer-reviewed material. */
export function sourceTierOf(doc: Pick<AnalysisDocument, 'sourceKind' | 'referenceType'>): SourceTier {
  if ((doc.sourceKind ?? 'policy') === 'policy') return 'policy';
  return SCIENTIFIC_REFERENCE_TYPES.has(doc.referenceType ?? '') ? 'scientific' : 'grey';
}

export interface SourceTierMeta {
  /** Short tab label. */
  label: string;
  /** Sentence describing what lives in this tier — used in the guided tour. */
  blurb: string;
  /** Tooltip / help text for the filter tab. */
  hint: string;
}

export const SOURCE_TIER_META: Record<SourceTier, SourceTierMeta> = {
  policy: {
    label: 'Policy',
    blurb: 'EU policy and legal texts — the acts, strategies and proposals you read for obligations and targets.',
    hint: 'EU policy / legal texts (EUR-Lex acts, strategies, proposals).',
  },
  scientific: {
    label: 'Scientific',
    blurb: 'Peer-reviewed literature — journal articles, books and book chapters you cite as evidence.',
    hint: 'Peer-reviewed literature: journal articles, books and chapters.',
  },
  grey: {
    label: 'Grey',
    blurb: 'Grey literature — institutional reports, web sources and legislative material that is not peer reviewed.',
    hint: 'Grey literature & reports: reports, web pages, legislation.',
  },
};

/** Tabs shown in the source filter, in display order, plus an "All" option. */
export const SOURCE_FILTER_OPTIONS: ReadonlyArray<{ id: SourceTier | 'all'; label: string; hint: string }> = [
  { id: 'policy',     label: SOURCE_TIER_META.policy.label,     hint: SOURCE_TIER_META.policy.hint },
  { id: 'scientific', label: SOURCE_TIER_META.scientific.label, hint: SOURCE_TIER_META.scientific.hint },
  { id: 'grey',       label: SOURCE_TIER_META.grey.label,       hint: SOURCE_TIER_META.grey.hint },
  { id: 'all',        label: 'All',                             hint: 'Show every source tier together.' },
];
