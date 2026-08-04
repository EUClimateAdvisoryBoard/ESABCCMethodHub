/**
 * M·36 Policy Targets — sectoral analysis dataset (v5 Masterfile, Aug 2026).
 * --------------------------------------------------------------------------
 * Typed model over the "Clean targets" tab of the Masterfile
 * (public/data/eu-policy-targets-master.xlsx): objectives and targets still in
 * effect (timeline beyond 2026) that are not duplicates or cross-references,
 * after the August 2026 correction pass. Rows are produced offline by
 * scripts/build-sector-targets.py, which also carries each row's human-authored
 * layman "short version", its temporal encoding for the timeline figures, and
 * the revision note documenting any change made in this iteration.
 *
 * A row flagged `crossRef` is a proposal-stage figure from a Communication that
 * duplicates (or was superseded by) an adopted binding target that is also in
 * the dataset; it stays for traceability but is displayed de-emphasised and is
 * excluded from headline counts.
 */
import { RAW_SECTOR_TARGETS } from './sector-targets.generated';
import type { SectorKey, ClimateRelevance } from './policy-targets';
export { SECTOR_META, CLIMATE_META, OBLIGATION_META } from './policy-targets';
export type { SectorKey, ClimateRelevance } from './policy-targets';

export type TemporalKind = 'by' | 'from' | 'range' | 'stepped' | 'periodic';

export interface SectorTarget {
  /** Stable content hash of (policy name + target #). */
  id: string;
  policy: string;
  policyShort: string;
  docType: string;
  area: string;
  /** Per-policy target number — matches the Masterfile '#' column. */
  num: number;
  /** 1 = header/first-order target, 2 = second-order (dependent/narrowing). */
  order: 1 | 2;
  /** Verbatim target text from the act's enacting terms. */
  text: string;
  /** Human-authored layman's version (Masterfile column 'Short version'). */
  short: string;
  provision: string;
  label: string;
  obligation: string;
  targetType: string;
  timeline: string;
  indicators: string[];
  climate: ClimateRelevance;
  source: string;
  /** Empty = cross-cutting (falls under none of the eight sectors). */
  sectors: SectorKey[];
  climateArgument: string;
  /** Masterfile column 'Revision note (Aug 2026 iteration)' — why this row was
   *  added, corrected or reclassified in this pass. '' when untouched. */
  revisionNote: string;
  /** Proposal-stage duplicate of an adopted target also in the dataset. */
  crossRef: boolean;
  /** Temporal encoding for the timeline figures. `start`/`end` are achievement
   *  years; kind 'by' = deadline, 'from' = applies onward from `start`,
   *  'range' = bounded window, 'stepped' = dated steps between start and end,
   *  'periodic' = recurring obligation (note says the cadence). */
  temporal: { kind: TemporalKind; start: number | null; end: number | null; note: string | null };
}

export const sectorTargets: SectorTarget[] = RAW_SECTOR_TARGETS;

/** Rows counted in summaries — everything except the cross-reference rows. */
export const effectiveTargets: SectorTarget[] = sectorTargets.filter((t) => !t.crossRef);

export function targetsOfSector(key: SectorKey | 'crosscutting'): SectorTarget[] {
  return sectorTargets.filter((t) =>
    key === 'crosscutting' ? t.sectors.length === 0 : t.sectors.includes(key as SectorKey));
}
