/**
 * Member-state policy monitoring & best-practice identification for the
 * National Level Climate Policies beta module.
 *
 * Context — an update to the Policy Gap report
 * --------------------------------------------
 * The Board's policy-gap work (*Towards EU climate neutrality: assessing
 * progress and the policy gaps*) is increasingly expected to look beyond the
 * EU aggregate and **monitor Member State implementation** — and, where it
 * can, surface **best practices** other member states could learn from. This
 * module turns the catalogue of national climate laws and policies into a
 * lightweight **policy-monitoring layer** for that report: a transparent,
 * repeatable read of where each member state's policy architecture stands and
 * which countries set the bar on each monitored dimension.
 *
 * How the scope is drawn (transparent & defendable)
 * -------------------------------------------------
 *  - **Monitoring is comprehensive** — all 27 member states are scored, so
 *    nothing is cherry-picked.
 *  - **Best practices are drawn only from member states with a monitorable
 *    policy base** (at least {@link MONITORABLE_MIN} catalogued instruments —
 *    the same "substantial catalogue" threshold the module's deep-insights use).
 *    A highlight therefore reflects documented policy, not a coverage artefact
 *    of a thinly-catalogued country.
 *
 * Everything here is computed **live** from the catalogue (the same
 * `ClimatePolicy[]` that drives the rest of the module) — nothing is
 * hand-scored. Each country's score on every dimension is a documented
 * function of its catalogued instruments, and every best-practice claim links
 * back to the specific instrument that earns it, so a reviewer can verify it.
 * Written methodology: `analysis/POLICY-MONITORING.md`.
 *
 * IMPORTANT — what this measures. The monitor reads the *documented policy
 * architecture* (framework laws, instrument mix, sector and adaptation
 * coverage, recency) as recorded in Climate Change Laws of the World. It is
 * NOT a measure of emissions outcomes, the size of a member state's gap to
 * its targets, or implementation quality, and the underlying catalogue carries
 * known coverage bias. The scores are a structured, transparent reading of
 * "who has built which policy responses", offered as a monitoring aid and a
 * starting point for peer learning — not a league table of climate performance.
 *
 * Keep this file free of server-only imports — it is bundled into the client
 * page (beta/modules/national-climate-policies).
 */

import type { ClimatePolicy } from './climate-laws-types';
import { EU_MEMBER_STATES } from '@/data/eu-member-states';
import { computeCountryMetrics, CountryPolicyMetrics } from './climate-policy-insights';

// ───────────────────────────────────────────────────────────────────────────
// Monitoring confidence — how well-documented a member state's portfolio is
// ───────────────────────────────────────────────────────────────────────────

/** Minimum catalogued instruments for a country to be a best-practice candidate. */
export const MONITORABLE_MIN = 8;
/** Catalogue depth at or above which monitoring confidence is "high". */
export const HIGH_CONFIDENCE_MIN = 20;

/**
 * How much to trust the monitoring read for a member state, given how deeply
 * its policies are catalogued. This is about *documentation depth*, not about
 * the quality of the policies themselves.
 */
export type MonitoringConfidence = 'high' | 'medium' | 'low';

export const MONITORING_CONFIDENCE_LABELS: Record<MonitoringConfidence, string> = {
  high: 'Well documented',
  medium: 'Partial coverage',
  low: 'Sparse — read with care',
};

function confidenceFor(total: number): MonitoringConfidence {
  if (total >= HIGH_CONFIDENCE_MIN) return 'high';
  if (total >= MONITORABLE_MIN) return 'medium';
  return 'low';
}

// ───────────────────────────────────────────────────────────────────────────
// Monitoring dimensions
// ───────────────────────────────────────────────────────────────────────────

export interface Evidence {
  /** What the link points at, e.g. "Framework climate law". */
  label: string;
  title: string;
  url: string;
  year?: number | null;
}

export interface DimensionScore {
  key: string;
  label: string;
  /** 0–100, higher = stronger documented policy response. */
  score: number;
  detail: string;
  evidence?: Evidence;
}

export interface CountryMonitoring {
  code: string;
  name: string;
  confidence: MonitoringConfidence;
  /** True when total >= MONITORABLE_MIN (eligible for best-practice highlights). */
  monitorable: boolean;
  metrics: CountryPolicyMetrics;
  dimensions: DimensionScore[];
  /** Equal-weighted mean of the scored dimensions, 0–100. */
  composite: number;
}

export interface BestPractice {
  dimensionKey: string;
  dimensionLabel: string;
  code: string;
  country: string;
  score: number;
  rationale: string;
  evidence?: Evidence;
}

export interface MonitoringDimensionMeta {
  key: string;
  label: string;
  description: string;
}

/** The monitored dimensions, in display order, with their documented rule. */
export const MONITORING_DIMENSIONS: MonitoringDimensionMeta[] = [
  {
    key: 'statutoryFramework',
    label: 'Statutory framework',
    description:
      'Is the climate framework anchored in a law passed by parliament (100), ' +
      'an executive strategy only (50), or absent from the catalogue (0)? ' +
      'A binding framework law is the clearest marker of durable, ' +
      'government-proof climate governance — and the backbone of closing the gap.',
  },
  {
    key: 'sectoralBreadth',
    label: 'Sectoral breadth',
    description:
      'How many distinct economic sectors does the national catalogue touch, ' +
      'relative to the broadest portfolio across the 27? Wider coverage means ' +
      'fewer of the report’s gap sectors are left to EU rules alone.',
  },
  {
    key: 'adaptationIntegration',
    label: 'Adaptation integration',
    description:
      'Does the country pair mitigation with adaptation? Combines having a ' +
      'framework-level adaptation instrument (40 pts) with the share of the ' +
      'catalogue that addresses adaptation (up to 60 pts, saturating at 40%).',
  },
  {
    key: 'legislativeAnchoring',
    label: 'Legislative anchoring',
    description:
      'Share of the catalogue passed by parliament rather than adopted by ' +
      'decree or strategy. Statute is harder for a future government to ' +
      'unwind than an executive act.',
  },
  {
    key: 'momentum',
    label: 'Policy momentum',
    description:
      'Share of dated instruments adopted in 2016 or later (post-Paris). ' +
      'A proxy for whether the framework is being actively kept up to date as ' +
      'the gap narrows.',
  },
];

const clamp = (x: number) => Math.max(0, Math.min(100, x));
const round = (x: number) => Math.round(x);

/** Newest dated instrument for a country, for momentum evidence. */
function newestInstrument(list: ClimatePolicy[]): ClimatePolicy | undefined {
  return list
    .filter((p) => p.year != null)
    .sort((a, b) => (b.year as number) - (a.year as number))[0];
}

/** Earliest framework instrument (law preferred) for statutory evidence. */
function frameworkInstrument(list: ClimatePolicy[]): ClimatePolicy | undefined {
  const mitig = list.filter((p) => p.frameworks.includes('Mitigation'));
  const laws = mitig.filter((p) => p.category === 'Law');
  const pool = laws.length ? laws : mitig;
  return (
    pool
      .filter((p) => p.year != null)
      .sort((a, b) => (a.year as number) - (b.year as number))[0] ?? pool[0]
  );
}

/** A representative adaptation instrument for adaptation evidence. */
function adaptationInstrument(list: ClimatePolicy[]): ClimatePolicy | undefined {
  const fw = list.find((p) => p.frameworks.includes('Adaptation'));
  if (fw) return fw;
  return list.find((p) => p.responses.includes('Adaptation'));
}

function evidenceFrom(p: ClimatePolicy | undefined, label: string): Evidence | undefined {
  if (!p) return undefined;
  return {
    label,
    title: p.title,
    url: p.documentUrl || p.climateLawsUrl,
    year: p.year,
  };
}

export interface MonitoringResult {
  /** All 27 member states, scored, sorted by composite. */
  monitoring: CountryMonitoring[];
  /** One exemplar per dimension, drawn from the monitorable set. */
  bestPractices: BestPractice[];
  dimensions: MonitoringDimensionMeta[];
  scope: {
    rule: string;
    monitoredCount: number;
    monitorableCount: number;
    confidence: Record<MonitoringConfidence, number>;
  };
  caveats: string[];
}

/**
 * Full policy-monitoring read of the EU-27 catalogue.
 *
 * @param policies  The live catalogue (member-state instruments only — the
 *                  EU-level layer is excluded; this monitors Member States).
 */
export function monitorMemberStates(policies: ClimatePolicy[]): MonitoringResult {
  const metrics = computeCountryMetrics(policies);

  // Sectoral breadth is normalised against the broadest portfolio across the
  // 27, so the dimension is relative to peers rather than a fixed ceiling.
  const maxSectors = Math.max(1, ...metrics.map((m) => m.sectorsCovered));

  const monitoring: CountryMonitoring[] = metrics
    .map((m) => {
      const list = policies.filter((p) => p.countryCode === m.code);

      const statutoryScore = m.hasMitigationFrameworkLaw
        ? 100
        : m.hasMitigationFramework
        ? 50
        : 0;
      const breadthScore = clamp((m.sectorsCovered / maxSectors) * 100);
      const adaptationScore = clamp(
        (m.hasAdaptationFramework ? 40 : 0) + Math.min(60, (m.adaptationShare / 0.4) * 60),
      );
      const anchoringScore = clamp(m.lawShare * 100);
      const momentumScore = clamp(m.postParisShare * 100);

      const dimensions: DimensionScore[] = [
        {
          key: 'statutoryFramework',
          label: 'Statutory framework',
          score: statutoryScore,
          detail: m.hasMitigationFrameworkLaw
            ? `Binding framework climate law${m.frameworkLawYear ? ` since ${m.frameworkLawYear}` : ''}`
            : m.hasMitigationFramework
            ? 'Framework exists as an executive policy only'
            : 'No framework instrument catalogued',
          evidence: evidenceFrom(frameworkInstrument(list), 'Framework instrument'),
        },
        {
          key: 'sectoralBreadth',
          label: 'Sectoral breadth',
          score: round(breadthScore),
          detail: `${m.sectorsCovered} sectors covered (EU-27 max ${maxSectors})`,
        },
        {
          key: 'adaptationIntegration',
          label: 'Adaptation integration',
          score: round(adaptationScore),
          detail:
            `${Math.round(m.adaptationShare * 100)}% of the catalogue addresses adaptation` +
            (m.hasAdaptationFramework ? '; framework adaptation instrument present' : '; no adaptation framework'),
          evidence: evidenceFrom(adaptationInstrument(list), 'Adaptation instrument'),
        },
        {
          key: 'legislativeAnchoring',
          label: 'Legislative anchoring',
          score: round(anchoringScore),
          detail: `${m.laws} of ${m.total} instruments passed by parliament (${Math.round(m.lawShare * 100)}%)`,
        },
        {
          key: 'momentum',
          label: 'Policy momentum',
          score: round(momentumScore),
          detail:
            `${Math.round(m.postParisShare * 100)}% of dated instruments adopted 2016+` +
            (m.latestYear ? `; latest ${m.latestYear}` : ''),
          evidence: evidenceFrom(newestInstrument(list), 'Most recent instrument'),
        },
      ];

      const composite = dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length;

      return {
        code: m.code,
        name: m.name,
        confidence: confidenceFor(m.total),
        monitorable: m.total >= MONITORABLE_MIN,
        metrics: m,
        dimensions,
        composite,
      };
    })
    .sort((a, b) => b.composite - a.composite);

  const eligible = monitoring.filter((c) => c.monitorable);

  // ── Best practice per dimension: the monitorable member state scoring
  //    highest, with the instrument that earns it. Ties resolve by catalogue
  //    depth (more documented evidence) then alphabetically, deterministically.
  const bestPractices: BestPractice[] = MONITORING_DIMENSIONS.map((dim) => {
    const ranked = [...eligible].sort((a, b) => {
      const da = a.dimensions.find((d) => d.key === dim.key)!;
      const db = b.dimensions.find((d) => d.key === dim.key)!;
      if (db.score !== da.score) return db.score - da.score;
      if (b.metrics.total !== a.metrics.total) return b.metrics.total - a.metrics.total;
      return a.name.localeCompare(b.name);
    });
    const top = ranked[0];
    const d = top.dimensions.find((x) => x.key === dim.key)!;
    return {
      dimensionKey: dim.key,
      dimensionLabel: dim.label,
      code: top.code,
      country: top.name,
      score: d.score,
      rationale: d.detail,
      evidence: d.evidence,
    };
  });

  // ── First-mover highlight: the earliest binding framework climate law in
  //    the catalogue — a policy best practice in its own right.
  const earliestLaw = eligible
    .filter((c) => c.metrics.hasMitigationFrameworkLaw && c.metrics.frameworkLawYear != null)
    .sort((a, b) => (a.metrics.frameworkLawYear as number) - (b.metrics.frameworkLawYear as number))[0];
  if (earliestLaw) {
    const list = policies.filter((p) => p.countryCode === earliestLaw.code);
    bestPractices.unshift({
      dimensionKey: 'firstMover',
      dimensionLabel: 'First mover',
      code: earliestLaw.code,
      country: earliestLaw.name,
      score: 100,
      rationale: `Earliest binding framework climate law in the focus set (${earliestLaw.metrics.frameworkLawYear})`,
      evidence: evidenceFrom(frameworkInstrument(list), 'Framework climate law'),
    });
  }

  const confidence: Record<MonitoringConfidence, number> = { high: 0, medium: 0, low: 0 };
  monitoring.forEach((c) => {
    confidence[c.confidence] += 1;
  });

  return {
    monitoring,
    bestPractices,
    dimensions: MONITORING_DIMENSIONS,
    scope: {
      rule:
        `Monitoring covers all ${monitoring.length} member states. Best practices are ` +
        `drawn only from member states with a monitorable policy base ` +
        `(≥${MONITORABLE_MIN} catalogued instruments) so a highlight reflects ` +
        `documented policy, not a coverage artefact.`,
      monitoredCount: monitoring.length,
      monitorableCount: eligible.length,
      confidence,
    },
    caveats: [
      'Scores read the documented policy architecture in Climate Change Laws ' +
        'of the World — not emissions outcomes, the size of a member state’s ' +
        'gap to its targets, or implementation quality.',
      'Catalogue depth reflects CCLW editorial coverage as well as genuine ' +
        'legislative activity; treat thin portfolios as "less documented", not "less governed". ' +
        'Monitoring confidence flags this per country.',
      'Framework, sector and adaptation tags are sparse and partly inconsistent ' +
        'in the source; a missing tag can mean "untagged" rather than "absent".',
      'The snapshot pre-dates recent Fit-for-55 transposition and 2023–25 ' +
        'national climate-law updates; re-run after a catalogue refresh.',
      'This monitors policy responses, not the gap itself — pair it with the ' +
        'report’s sectoral gap assessment rather than reading it alone.',
    ],
  };
}
