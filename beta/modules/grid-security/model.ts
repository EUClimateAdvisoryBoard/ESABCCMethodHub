/**
 * Grid & Interconnection Security Ledger — deterministic model (beta module M · 50).
 *
 * Everything in this file is either a type contract, a fixed classification
 * vocabulary, or closed-form arithmetic. There is no agent judgement at
 * runtime: asset types and attribution statuses are assigned once, in
 * data.generated.ts, against the written rules below, and every assignment
 * is reproducible by re-reading the cited authority statement against the
 * rule text. Attribution of blame is NEVER made by this module — the
 * `attribution` status only records what an investigating authority has
 * publicly concluded, and the perpetrator field is free text quoting or
 * paraphrasing that authority.
 *
 * Epistemic status: model logic is deterministic; the inputs it runs on
 * (data.generated.ts) are AI-compiled and pending Secretariat verification.
 */

/* ------------------------------------------------------------ uncertainty */

/** Uncertainty flag carried by every AI-compiled figure. */
export type Uncertainty = 'low' | 'medium' | 'high';

/** Map an uncertainty flag onto the ConfidenceDot 0–1 score scale. */
export function confidenceScore(u: Uncertainty): number {
  return u === 'low' ? 0.9 : u === 'medium' ? 0.7 : 0.45;
}

/* --------------------------------------------- panel 1 · interconnection */

/**
 * The 15 %-by-2030 electricity interconnection target, measured as import
 * interconnection capacity over installed generation capacity (the
 * Commission's headline indicator). Origin: European Council conclusions of
 * 23–24 October 2014 (EUCO 169/14, para. 4); carried into Union law as a
 * reporting dimension of the NECPs by Regulation (EU) 2018/1999 (Governance
 * Regulation), Annex I part 1 section A.2.4.1.
 */
export const INTERCONNECTION_TARGET_PCT = 15;
export const INTERCONNECTION_TARGET_YEAR = 2030;

export interface MemberStateRatio {
  /** ISO 3166-1 alpha-2 country code. */
  code: string;
  name: string;
  /**
   * Indicative interconnection level in per cent (import capacity ÷
   * installed generation capacity). Values above 100 are possible for
   * small systems (the denominator is installed generation, not load).
   */
  ratioPct: number;
  /** Year of the underlying reported figure — NOT the current year. */
  basisYear: number;
  uncertainty: Uncertainty;
  /** What has changed since basisYear, or why the figure is fragile. */
  note?: string;
}

/** Percentage points still missing to the 15 % target (0 if at/above). */
export function distanceToTarget(
  ratioPct: number,
  target: number = INTERCONNECTION_TARGET_PCT,
): number {
  return Math.max(0, target - ratioPct);
}

export function countBelowTarget(rows: MemberStateRatio[]): number {
  return rows.filter((r) => r.ratioPct < INTERCONNECTION_TARGET_PCT).length;
}

/* --------------------------------------------- panel 2 · investment pace */

export interface PaceInputs {
  /** Investment need over the period, € billion. */
  needBn: number;
  /** First and last calendar year of the need estimate's period. */
  periodStartYear: number;
  periodEndYear: number;
  /** Realised annual investment estimate, € billion per year (range). */
  realisedAnnualBn: { low: number; central: number; high: number };
}

export interface PaceStats {
  /** Need spread evenly over the period, € bn per year. */
  requiredAnnualBn: number;
  /** realised ÷ required, for the low / central / high realised estimates. */
  ratio: { low: number; central: number; high: number };
  /** Years the whole need would take at the central realised pace. */
  yearsAtRealisedPace: number;
}

/**
 * Simple pace ratio: the need spread evenly over its stated period versus
 * the realised annual investment. Deliberately naive — no discounting, no
 * ramp-up profile, no split of transmission vs distribution — so that what
 * it does and does not show is obvious.
 */
export function paceStats(i: PaceInputs): PaceStats {
  const years = i.periodEndYear - i.periodStartYear + 1;
  const requiredAnnualBn = i.needBn / years;
  const ratio = {
    low: i.realisedAnnualBn.low / requiredAnnualBn,
    central: i.realisedAnnualBn.central / requiredAnnualBn,
    high: i.realisedAnnualBn.high / requiredAnnualBn,
  };
  const yearsAtRealisedPace = i.needBn / i.realisedAnnualBn.central;
  return { requiredAnnualBn, ratio, yearsAtRealisedPace };
}

/* ---------------------------------------------- panel 3 · incident ledger */

/**
 * Deterministic asset-type vocabulary. One label per entry; assigned by the
 * physical asset primarily affected, not by the suspected motive.
 */
export const ASSET_TYPES = {
  'gas-pipeline': {
    label: 'Gas pipeline',
    rule: 'Subsea or onshore gas transmission pipeline.',
  },
  'power-cable': {
    label: 'Power cable',
    rule: 'Subsea electricity interconnector (HVDC or AC).',
  },
  'telecom-cable': {
    label: 'Telecom cable',
    rule: 'Subsea data / telecommunications cable. Included because the incidents cluster with energy-cable incidents and the same vessels and investigations are involved.',
  },
  'grid-substation': {
    label: 'Substation / pylon',
    rule: 'Onshore grid asset — substation, transformer or transmission pylon.',
  },
  'grid-system': {
    label: 'Grid system event',
    rule: 'System-wide electricity event (e.g. a blackout) rather than damage to one asset.',
  },
  'cyber-ot': {
    label: 'Cyber / OT',
    rule: 'Attack on IT or operational-technology systems, without physical damage to the asset.',
  },
  milestone: {
    label: 'Resilience milestone',
    rule: 'A positive resilience event — a completed protection measure, policy instrument or infrastructure milestone — recorded as the counterpart to the incidents (ground rule: steel-man both sides).',
  },
} as const;

export type AssetType = keyof typeof ASSET_TYPES;

/**
 * Deterministic attribution-status vocabulary. The status records ONLY what
 * an investigating authority has publicly concluded — never this module's
 * judgement, and never the identity of a perpetrator (that stays in quoted
 * or paraphrased free text with its source).
 */
export const ATTRIBUTION_STATUSES = {
  'sabotage-confirmed': {
    label: 'Sabotage confirmed',
    rule: 'An investigating authority has publicly concluded the damage was deliberate. Says nothing about who did it.',
  },
  'state-attributed': {
    label: 'State-attributed',
    rule: 'The EU or a Member State government has formally and publicly attributed the act to a named state actor.',
  },
  'investigation-ongoing': {
    label: 'Investigation ongoing',
    rule: 'A criminal or official investigation is (or was at compile time) open, with no published conclusion on intent.',
  },
  'accident-concluded': {
    label: 'Accident concluded',
    rule: 'The investigating authority has publicly concluded the damage was not deliberate.',
  },
  'technical-failure': {
    label: 'Technical failure',
    rule: 'Official investigation concluded a technical cause and found no evidence of hostile action.',
  },
  'not-applicable': {
    label: 'Not applicable',
    rule: 'Resilience milestones — no damage occurred, so attribution does not arise.',
  },
} as const;

export type AttributionStatus = keyof typeof ATTRIBUTION_STATUSES;

/** How the authority's position is rendered: verbatim words or paraphrase. */
export type QuoteKind = 'reported-quote' | 'paraphrase';

export interface LedgerSource {
  label: string;
  url: string;
}

export interface LedgerEntry {
  id: string;
  /** ISO date (YYYY-MM-DD) of the event itself. */
  date: string;
  title: string;
  assetType: AssetType;
  attribution: AttributionStatus;
  /** What happened, factually, without attribution claims. */
  summary: string;
  /**
   * The investigating authority's position on cause/attribution — quoted or
   * paraphrased from that authority, never asserted by the module. Named
   * authority first, then the position.
   */
  authorityPosition: string;
  quoteKind: QuoteKind;
  uncertainty: Uncertainty;
  /** Set when part of the entry could not be confidently sourced. */
  unverifiedNote?: string;
  sources: LedgerSource[];
}

export function ledgerCounts(entries: LedgerEntry[]): Record<AttributionStatus, number> {
  const counts = Object.fromEntries(
    Object.keys(ATTRIBUTION_STATUSES).map((k) => [k, 0]),
  ) as Record<AttributionStatus, number>;
  for (const e of entries) counts[e.attribution] += 1;
  return counts;
}

export function sortLedger(entries: LedgerEntry[]): LedgerEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}
