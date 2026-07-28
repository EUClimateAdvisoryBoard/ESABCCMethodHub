/**
 * Advice conflicts — shared data model (beta module M·37, third submodule).
 *
 * Compares the Commission's 17 July 2026 package — the ETS review (COM(2026)
 * 616 + impact assessment SWD(2026) 616, 5 parts) and the Electrification
 * Action Plan (COM(2026) 595) — against the ESABCC's published advice across
 * all of its reports (`esabcc-reports/`), finds where they do not align, and
 * ranks the conflicts by a transparent four-axis severity rubric.
 *
 * Three data layers, each produced by its own work package (see
 * `work-packages/`):
 *   1. `advice-core.ts` / `advice-wider.ts` — AdvicePosition[]: what the Board
 *      has actually said, quoted with report + page.
 *   2. `package-positions.ts` — PackagePosition[]: what the package actually
 *      proposes, quoted with document + locator.
 *   3. `conflicts.ts` — ConflictFinding[]: each finding cites ≥1 position from
 *      each side, is classified, scored on the rubric and ranked.
 *
 * Findings are AI-assembled (Sonnet agents against the source texts) and are
 * pending human verification — the UI must say so.
 */

import { RECOMMENDATION_REPORTS } from '@/data/esabcc-recommendations';

/* ------------------------------------------------------------------ themes */

export type ConflictTheme =
  | 'cap-ambition'          // 2040 ambition level, cap trajectory, LRF
  | 'carbon-budget'         // cumulative 2030–50 budget logic, early vs late action
  | 'removals'              // CDR integration into the ETS, netting, delivery risk
  | 'international-credits' // Article 6 credits inside the cap
  | 'pricing-scope'         // what is priced: free allocation, CBAM, aviation, maritime, waste
  | 'electrification'       // the 46% target, demand-side measures, price reform
  | 'demand-reduction'      // energy/material demand, efficiency first
  | 'investment-revenue'    // IDB, revenue use, investment signals
  | 'governance'            // reviews, conditionality, monitoring, advice uptake
  | 'fairness';             // distributional effects, Social Climate Fund

export const THEME_LABELS: Record<ConflictTheme, string> = {
  'cap-ambition': 'Cap & 2040 ambition',
  'carbon-budget': 'Carbon budget & timing',
  removals: 'Removals in the ETS',
  'international-credits': 'International credits',
  'pricing-scope': 'Pricing scope & free allocation',
  electrification: 'Electrification',
  'demand-reduction': 'Demand reduction & efficiency',
  'investment-revenue': 'Investment & revenue use',
  governance: 'Governance & conditionality',
  fairness: 'Fairness & distribution',
};

/* ------------------------------------------------- ESABCC advice (side A) */

/** Report ids reuse the keys of RECOMMENDATION_REPORTS (esabcc-recommendations.ts). */
export type AdviceReportId = keyof typeof RECOMMENDATION_REPORTS;

/** PDF file (in esabcc-reports/) behind each report id, for citation checking. */
export const ADVICE_REPORT_FILES: Record<AdviceReportId, string> = {
  'acer-energy-infrastructure-2022': '20221114-lettertoacer.pdf',
  'scenario-guidelines-2022': '2022-11-14-adviceontene_scenarioguidelines.pdf',
  'climate-targets-2023': 'setting-climate-targets-based-on.pdf',
  'energy-crisis-2023': '2023-02-07-recommendationspolicyresponsesenergycrisisclimateneutrality.pdf',
  'decarbonised-energy-infrastructure-2023': '2023-03-15-towards-a-decarbonised-and-climate-resilient-eu-energy-infrastructure.pdf',
  '2040-target-advice-2023': 'scientific-advice-for-the-determination-of-an-eu-wide-2040-climate-target-and-a-greenhouse-gas-budget-for-2030-2050.pdf',
  'towards-eu-climate-neutrality-2024': 'esabcc_report_towards-eu-climate-neutrality.pdf',
  'ten-e-draft-scenarios-2024': '20240627advice-on-draft-scenarios-under-ten-e-regulation_for-publication.pdf',
  'carbon-removals-2025': '2025-02-21-scaling-up-carbon-dioxide-removals-recommendations-for-navigating-opportunities-and-risks-in-the-eu.pdf',
  'climate-law-amendment-2025': '20250602_european-climate-law_advice-for-publication.pdf',
  'adaptation-2026': '20260217_adaptation-report.pdf',
  'agri-food-2026': '2026-03-1120260311_eu-agri-food-system-report.pdf',
};

export interface AdvicePosition {
  /** 'ap-<slug>' */
  id: string;
  reportId: AdviceReportId;
  theme: ConflictTheme;
  /** Short statement of the position, e.g. "Achieve 2040 target with domestic reductions only". */
  title: string;
  /** One-paragraph plain-language statement of what the Board asks for. */
  position: string;
  /** Near-verbatim quote from the report (≤ ~60 words, ellipses allowed). */
  quote: string;
  /** PDF page number(s) of the quote (page of the file, not printed page). */
  pages: number[];
  /** Matching recommendation ids in esabcc-recommendations.ts, where they exist. */
  recIds: string[];
}

/* --------------------------------------- Commission package (side B) */

export type PackageDocId =
  | 'com-616'    // ETS Directive proposal COM(2026) 616
  | 'swd-616-p1' // impact assessment part 1 — main report
  | 'swd-616-p2' // part 2 — annexes 1–7
  | 'swd-616-p3' // part 3 — annexes 8–11
  | 'swd-616-p4' // part 4 — annexes 12–14
  | 'swd-616-p5' // part 5 — annex 15 (evaluation)
  | 'eap'        // Electrification Action Plan COM(2026) 595
  | 'qa'         // Q&A QANDA/26/1598
  | 'pr';        // press release IP/26/1596

export const PACKAGE_DOCS: Record<PackageDocId, { label: string; short: string; url: string }> = {
  'com-616': {
    label: 'ETS Directive proposal COM(2026) 616',
    short: 'COM(2026) 616',
    url: 'https://climate.ec.europa.eu/document/download/c0b4ca8e-0e12-4b4e-9976-98c0b4224410_en',
  },
  'swd-616-p1': {
    label: 'Impact assessment SWD(2026) 616 — Part 1, main report',
    short: 'IA Part 1',
    url: 'https://climate.ec.europa.eu/publications/swd2026-616-impact-assessment_en',
  },
  'swd-616-p2': {
    label: 'Impact assessment SWD(2026) 616 — Part 2, Annexes 1–7',
    short: 'IA Part 2',
    url: 'https://climate.ec.europa.eu/publications/swd2026-616-impact-assessment_en',
  },
  'swd-616-p3': {
    label: 'Impact assessment SWD(2026) 616 — Part 3, Annexes 8–11',
    short: 'IA Part 3',
    url: 'https://climate.ec.europa.eu/publications/swd2026-616-impact-assessment_en',
  },
  'swd-616-p4': {
    label: 'Impact assessment SWD(2026) 616 — Part 4, Annexes 12–14',
    short: 'IA Part 4',
    url: 'https://climate.ec.europa.eu/publications/swd2026-616-impact-assessment_en',
  },
  'swd-616-p5': {
    label: 'Impact assessment SWD(2026) 616 — Part 5, Annex 15 (evaluation)',
    short: 'IA Part 5',
    url: 'https://climate.ec.europa.eu/publications/swd2026-616-impact-assessment_en',
  },
  eap: {
    label: 'Electrification Action Plan COM(2026) 595',
    short: 'COM(2026) 595',
    url: 'https://energy.ec.europa.eu/topics/markets-and-consumers/electrification-action-plan_en',
  },
  qa: {
    label: 'Q&A on the ETS review QANDA/26/1598',
    short: 'Q&A',
    url: 'https://ec.europa.eu/commission/presscorner/detail/en/qanda_26_1598',
  },
  pr: {
    label: 'Press release IP/26/1596',
    short: 'Press release',
    url: 'https://ec.europa.eu/commission/presscorner/detail/en/ip_26_1596',
  },
};

export interface PackagePosition {
  /** 'pp-<slug>' */
  id: string;
  docId: PackageDocId;
  theme: ConflictTheme;
  title: string;
  /** One-paragraph plain-language statement of what the package proposes/assumes. */
  position: string;
  /** Near-verbatim quote (≤ ~60 words) from the in-repo extraction of the document. */
  quote: string;
  /**
   * Locator inside the document, e.g. 'Part 1, p30–31', 'Art. 9c',
   * 'Pillar 1'. Use the same locator style as the reform page / IA module.
   */
  sourceRef: string;
  /**
   * Where this position was extracted from in this repo, e.g.
   * 'beta/modules/impact-assessment/data.ts#removal-target' or
   * 'beta/modules/ets-review/reform/page.tsx#removals'.
   */
  extractedFrom: string;
}

/* --------------------------------------------------------- findings */

export type ConflictKind = 'contradiction' | 'tension' | 'ambition-gap' | 'alignment';

export const CONFLICT_KIND_META: Record<ConflictKind, { name: string; color: string; definition: string }> = {
  contradiction: {
    name: 'Contradiction',
    color: '#B83230',
    definition:
      'The package pushes in the opposite direction to explicit ESABCC advice — the Board asked for X and the package does not-X.',
  },
  tension: {
    name: 'Tension',
    color: '#D97706',
    definition:
      'Not flatly contradictory, but the package creates a material risk to something the Board asked for and does not bindingly safeguard it.',
  },
  'ambition-gap': {
    name: 'Ambition gap',
    color: '#2F6FB0',
    definition:
      'The package points in the direction the Board advised, but at a level, pace or bindingness below what the advice calls for.',
  },
  alignment: {
    name: 'Alignment',
    color: '#0D9488',
    definition:
      'The package actively delivers on ESABCC advice — recorded so the assessment is even-handed, and excluded from the conflict ranking.',
  },
};

/** Each rubric axis is scored 0–3 against the anchors below. */
export type AxisScore = 0 | 1 | 2 | 3;

export interface SeverityScores {
  magnitude: AxisScore;
  directness: AxisScore;
  bindingness: AxisScore;
  centrality: AxisScore;
}

export const SEVERITY_AXES: Record<
  keyof SeverityScores,
  { label: string; question: string; anchors: [string, string, string, string] }
> = {
  magnitude: {
    label: 'Magnitude',
    question: 'How large is the climate consequence if the package stands as proposed?',
    anchors: [
      '0 — negligible or presentational; no measurable effect on emissions outcomes.',
      '1 — small: low tens of Mt CO₂e cumulative, or an indirect effect on outcomes.',
      '2 — large: order of 100 Mt CO₂e cumulative, or weakens a core instrument.',
      '3 — very large: several hundred Mt CO₂e or more, or a material share of the 2030–50 EU carbon budget the Board advised.',
    ],
  },
  directness: {
    label: 'Directness',
    question: 'How head-on is the divergence from what the Board wrote?',
    anchors: [
      '0 — advice is silent or only thematically nearby.',
      '1 — divergence by omission: the advice asks for a safeguard the package lacks.',
      '2 — clear divergence from the advised direction, with interpretive room.',
      '3 — explicit opposition: the Board advised against this specific design and the package adopts it.',
    ],
  },
  bindingness: {
    label: 'Bindingness',
    question: 'How locked-in is the conflicting element of the package?',
    anchors: [
      '0 — non-binding narrative or communication text only.',
      '1 — indicative target or declared intention (reversible before adoption).',
      '2 — proposed binding law, but contingent on a future review/condition.',
      '3 — proposed binding law, unconditional once adopted.',
    ],
  },
  centrality: {
    label: 'Centrality of the advice',
    question: 'How central is the crossed advice within the Board’s published corpus?',
    anchors: [
      '0 — peripheral remark in one report.',
      '1 — a detailed sectoral recommendation.',
      '2 — a key recommendation, or advice repeated across reports.',
      '3 — headline advice of a flagship report (e.g. the 2040 target range, the 11–14 Gt budget, domestic-only delivery).',
    ],
  },
};

/** Weights sum to 1. Magnitude and directness dominate deliberately. */
export const SEVERITY_WEIGHTS: Record<keyof SeverityScores, number> = {
  magnitude: 0.35,
  directness: 0.3,
  bindingness: 0.2,
  centrality: 0.15,
};

/** Weighted 0–10 severity score, one decimal. */
export function severityScore(s: SeverityScores): number {
  const raw =
    (s.magnitude * SEVERITY_WEIGHTS.magnitude +
      s.directness * SEVERITY_WEIGHTS.directness +
      s.bindingness * SEVERITY_WEIGHTS.bindingness +
      s.centrality * SEVERITY_WEIGHTS.centrality) /
    3;
  return Math.round(raw * 100) / 10;
}

export type SeverityTier = 'critical' | 'major' | 'moderate' | 'minor';

export function severityTier(score: number): SeverityTier {
  if (score >= 7) return 'critical';
  if (score >= 5) return 'major';
  if (score >= 3) return 'moderate';
  return 'minor';
}

export const SEVERITY_TIER_META: Record<SeverityTier, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#B83230' },
  major: { label: 'Major', color: '#D97706' },
  moderate: { label: 'Moderate', color: '#2F6FB0' },
  minor: { label: 'Minor', color: '#6B7280' },
};

export interface ConflictFinding {
  /** 'cf-<slug>' */
  id: string;
  kind: ConflictKind;
  theme: ConflictTheme;
  /** Plain-language headline, readable on its own. */
  title: string;
  /** ids into PACKAGE_POSITIONS — at least one. */
  packageIds: string[];
  /** ids into the advice corpus — at least one. */
  adviceIds: string[];
  /** One-line statement of what the Board asks for in this area. */
  esabccAsk: string;
  /** One-line statement of what the package does in this area. */
  packageDoes: string;
  scores: SeverityScores;
  /** One sentence per axis justifying the score against the anchors. */
  scoreRationale: Record<keyof SeverityScores, string>;
  /** Numbered reasoning chain: advice → package evidence → why it conflicts (or aligns). */
  reasoning: string[];
}
