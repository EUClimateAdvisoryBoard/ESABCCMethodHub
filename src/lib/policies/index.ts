/**
 * Canonical policy type vocabulary — the single import surface for "what
 * is a policy" across the modules that touch one (Policy Navigator,
 * Content Analysis, News Feed / Policy Clock, Reference Manager,
 * Recommendations and the Project Workspace).
 *
 * The Secretariat tracks policies at three different granularities, each
 * sourced from a different place and therefore a genuinely different shape:
 *
 *   - `Policy`        — a tracked EU legal act (the ~50 acts that form the
 *                       Policy Navigator network graph). Lives in
 *                       `src/data/policies.ts`, typed in `src/lib/types.ts`.
 *   - `SectorPolicy`  — a sector-grouped overlay used by the sectoral view,
 *                       gap explorer and milestone map. Lives in
 *                       `src/data/sectoral-policies.ts`. Its id maps to a
 *                       `Policy` id via `SECTOR_TO_VIEWER_ID`.
 *   - `ClimatePolicy` — a national law/policy from the external Climate
 *                       Change Laws of the World dataset (national module).
 *                       Typed in `src/lib/climate-laws-types.ts`.
 *
 * This module deliberately re-exports those types **type-only** (no runtime
 * import), so any file — including client components — can pull the
 * vocabulary from one place without dragging the 400 kB `policies.ts` data
 * blob into its bundle. Import the *data* from `@/data/policies` /
 * `@/data/sectoral-policies` as before; import the *types* from here.
 *
 * Registry drift (a `SECTOR_TO_VIEWER_ID` target that no longer resolves to
 * a real `Policy`) is guarded by `scripts/check-policy-registries.mjs`
 * (`npm run check:policies`).
 */

// ── EU legal acts (Policy Navigator) ─────────────────────────────────────────
export type {
  Policy,
  PolicyConnection,
  Citation,
  Annotation,
  TagDef,
  GraphNode,
  GraphLink,
} from '@/lib/types';

// ── Sector-grouped overlay (sectoral view / gap explorer) ────────────────────
export type { SectorPolicy, SectorId, Sector } from '@/data/sectoral-policies';

// ── National policies (Climate Change Laws of the World) ─────────────────────
export type { ClimatePolicy, PolicyDataset } from '@/lib/climate-laws-types';

/**
 * A stable, cross-module policy identifier. The same string is used as the
 * Policy Navigator card / graph-node id, the Content Analysis
 * `AnalysisDocument.id`, the optional `policyId` on Policy Clock events, and
 * the synthetic policy-citation reference id in the Reference Manager. The
 * URL contract that stitches the modules together lives in
 * `@/lib/cross-module-links`.
 */
export type UniversalPolicyId = string;
