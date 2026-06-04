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
 * This is the single source of truth shared by BOTH content-analysis
 * surfaces — the standalone `/content-analysis` route and the in-workspace
 * `ContentAnalysisModule` — so the tiers, labels and definitions never drift
 * apart. The scientific/grey split delegates to `isScientificLiterature` so
 * there is exactly one rule for "what counts as peer-reviewed".
 */
import type { AnalysisDocument } from './types';
import { isScientificLiterature } from './useLiveReferences';

export type SourceTier = 'policy' | 'scientific' | 'grey';

/** Classify a document into one of the three source tiers. Documents with no
 *  `sourceKind` default to `policy` (the historical default); references that
 *  aren't peer-reviewed fall through to `grey`, the safer bucket for
 *  non-peer-reviewed material. */
export function sourceTierOf(doc: AnalysisDocument): SourceTier {
  if ((doc.sourceKind ?? 'policy') !== 'reference') return 'policy';
  return isScientificLiterature(doc) ? 'scientific' : 'grey';
}

export interface SourceTierMeta {
  /** Short tab label. */
  label: string;
  /** Title used on the workspace source chooser cards. */
  title: string;
  /** Emoji/glyph used on the workspace source chooser cards. */
  icon: string;
  /** One-liner describing what lives in this tier — used in the guided tour. */
  blurb: string;
  /** Longer description for the workspace source-chooser cards. */
  chooserBlurb: string;
  /** Tooltip / help text for the filter tab. */
  hint: string;
}

export const SOURCE_TIER_META: Record<SourceTier, SourceTierMeta> = {
  policy: {
    label: 'Policy',
    title: 'Policy analysis',
    icon: '§',
    blurb: 'EU policy and legal texts — the acts, strategies and proposals you read for obligations and targets.',
    chooserBlurb:
      'Deep-dive the relevant EU policies. Mark any passage in the legal text and attach tags & codes to the exact wording.',
    hint: 'EU policy / legal texts (EUR-Lex acts, strategies, proposals).',
  },
  scientific: {
    label: 'Scientific',
    title: 'Scientific literature',
    icon: '🎓',
    blurb: 'Peer-reviewed literature — journal articles, books and book chapters you cite as evidence.',
    chooserBlurb:
      'Peer-reviewed references from the reference manager (articles, books, chapters). Upload the paper PDF to code it line by line.',
    hint: 'Peer-reviewed literature: journal articles, books and chapters.',
  },
  grey: {
    label: 'Grey',
    title: 'Grey literature & reports',
    icon: '📄',
    blurb: 'Grey literature — institutional reports, web sources and legislative material that is not peer reviewed.',
    chooserBlurb:
      'Reports, working papers and other grey references from the reference manager. Upload the report PDF to start tagging.',
    hint: 'Grey literature & reports: reports, web pages, legislation.',
  },
};

/** The three tiers in display order — handy for rendering choosers/switchers. */
export const SOURCE_TIERS: readonly SourceTier[] = ['policy', 'scientific', 'grey'];

/** Tabs shown in the standalone source filter, in display order, plus "All". */
export const SOURCE_FILTER_OPTIONS: ReadonlyArray<{ id: SourceTier | 'all'; label: string; hint: string }> = [
  { id: 'policy',     label: SOURCE_TIER_META.policy.label,     hint: SOURCE_TIER_META.policy.hint },
  { id: 'scientific', label: SOURCE_TIER_META.scientific.label, hint: SOURCE_TIER_META.scientific.hint },
  { id: 'grey',       label: SOURCE_TIER_META.grey.label,       hint: SOURCE_TIER_META.grey.hint },
  { id: 'all',        label: 'All',                             hint: 'Show every source tier together.' },
];
