/**
 * What the Policy Gap 2.0 indicator database is seeded with — one definition,
 * read by both the workspace itself and the modules that link into it.
 * ---------------------------------------------------------------------------
 * The Project Workspace's "Indicator Database" module (project
 * `policy-gap-2-0`) is Supabase-backed: `ensureSeedDataFor` in
 * `src/lib/project-workspace/db.ts` mirrors the bundled indicator catalogues
 * into `pw_indicators` / `pw_indicator_points`, and the same arrays are the
 * fallback when no Supabase project is configured ("preview mode"). This file
 * holds that catalogue so the list exists once rather than in three places.
 *
 * The second reason it exists: other modules — M·53 Policy Targets →
 * Indicators, the Summer Prep Indicator Check — draw indicator chips from the
 * curated catalogues and want to deep-link the ones the workspace can actually
 * show data for. Guessing invites a dead link, so those modules ask
 * `isSeededIndicator()` instead, which answers from the very list the seeder
 * writes. An indicator counts as seeded only if it also carries at least one
 * data point, because a row with no points opens to an empty chart — which is
 * exactly the silent "looks fine, shows nothing" failure this repository keeps
 * ruling out.
 *
 * Caveat this file does NOT paper over: the check is against the bundled seed
 * catalogue, not a live query. It proves the indicator is in the set the
 * workspace seeds and that the bundled series is non-empty; it cannot prove a
 * given deployment's Supabase has finished seeding. The workspace's own read
 * path is what closes that gap — it re-applies the seed lazily on every read,
 * and an unknown id falls back to the module's default landing rather than
 * erroring.
 */
import { ECNO_INDICATORS, type Indicator } from './ecno-indicators';
import { ESABCC_REPORT_INDICATORS, ECNO_TO_ESABCC_DUPLICATE } from './esabcc-indicators';
import { BETA_INDICATORS, BETA_ADAPTATION_INDICATORS } from './beta-indicators';
import { ADVANCED_INDICATORS, ADVANCED_ADAPTATION_INDICATORS } from './advanced-indicators';
import { BPIE_BUILDINGS_INDICATORS } from './bpie-buildings-indicators';

/** The project whose indicator database holds the curated series. */
export const WORKSPACE_INDICATOR_PROJECT_ID = 'policy-gap-2-0';

/**
 * Every indicator seeded into the Policy Gap 2.0 indicator database, in the
 * order the module lists them, each tagged with the cluster the UI groups it
 * under. `pw_indicators` stores no `group` column — the workspace re-derives it
 * from the bundled metadata on read — so the tags matter for the preview-mode
 * fallback and for anything reading this list directly.
 */
export const POLICY_GAP_SEED_INDICATORS: Indicator[] = [
  ...ESABCC_REPORT_INDICATORS.map(i => ({ ...i, group: 'esabcc' as const })),
  ...ECNO_INDICATORS.map(i => ({
    ...i,
    group: 'additional' as const,
    duplicateOf: i.duplicateOf ?? ECNO_TO_ESABCC_DUPLICATE[i.id],
  })),
  // Beta indicators carry their own group ('beta' / 'beta-adaptation').
  ...BETA_INDICATORS.map(i => ({ ...i, group: 'beta' as const })),
  ...BETA_ADAPTATION_INDICATORS.map(i => ({ ...i, group: 'beta-adaptation' as const })),
  // Advanced indicators carry their own group ('advanced' / 'advanced-adaptation').
  ...ADVANCED_INDICATORS.map(i => ({ ...i, group: 'advanced' as const })),
  ...ADVANCED_ADAPTATION_INDICATORS.map(i => ({ ...i, group: 'advanced-adaptation' as const })),
  // BPIE EU Buildings Climate Tracker indicators — listed with the other
  // "additional" indicators under the Buildings category.
  ...BPIE_BUILDINGS_INDICATORS.map(i => ({ ...i, group: 'additional' as const })),
];

/**
 * Ids of seeded indicators that carry a series — the ones a deep link can
 * actually show data for. Indicators seeded without a single data point are
 * deliberately excluded: linking to a blank chart is worse than not linking.
 */
export const SEEDED_INDICATOR_IDS: ReadonlySet<string> = new Set(
  POLICY_GAP_SEED_INDICATORS.filter(i => i.data.length > 0).map(i => i.id),
);

/** Seeded indicators that carry no data point, i.e. the ones deliberately not
 *  linked. Empty today; exported so the exclusion stays visible rather than
 *  becoming an invisible filter. */
export const SEEDED_INDICATORS_WITHOUT_DATA: string[] = POLICY_GAP_SEED_INDICATORS
  .filter(i => i.data.length === 0)
  .map(i => i.id);

/** Whether the workspace indicator database holds this indicator with a series. */
export function isSeededIndicator(id: string): boolean {
  return SEEDED_INDICATOR_IDS.has(id);
}

/**
 * Deep link into the Policy Gap 2.0 indicator database: opens the Indicator
 * Database module with this indicator pre-selected, on its data view rather
 * than the flow-chart landing (`IndicatorModule` reads `?indicator=`).
 */
export function workspaceIndicatorHref(indicatorId: string): string {
  return `/project-workspace/${WORKSPACE_INDICATOR_PROJECT_ID}?module=indicators`
    + `&indicator=${encodeURIComponent(indicatorId)}`;
}
