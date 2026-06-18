/**
 * Member-state policy assessment & best-practice identification for the
 * National Level Climate Policies beta module.
 *
 * Why this exists
 * ---------------
 * Following a bilateral with the Commission (DG CLIMA), the report is asked
 * to look harder at *Member State implementation* and to surface
 * **best practices** — but, realistically, only for a limited set of
 * countries rather than all 27. The defensible way to pick that set, instead
 * of choosing favourites, is a transparent rule: focus on the member states
 * that have an **independent national climate advisory council** — i.e. the
 * ESABCC's natural peers, the bodies it can actually engage with. That set is
 * derived programmatically from the EU Climate Councils dataset
 * (`src/data/climate-councils.ts`, the data behind the `eu-climate-councils`
 * module), so the scope is reproducible and auditable.
 *
 * Everything here is computed **live** from the catalogue (the same
 * `ClimatePolicy[]` that drives the rest of the module) plus the councils
 * dataset — nothing is hand-scored. Each country's score on every dimension
 * is a documented function of its catalogued instruments, and every
 * best-practice claim links back to the specific instrument (or council) that
 * earns it, so a reviewer can verify it. See
 * `analysis/MEMBER-STATE-BEST-PRACTICES.md` for the written methodology.
 *
 * IMPORTANT — what this measures. The assessment scores the *documented
 * policy architecture* (framework laws, instrument mix, sector and
 * adaptation coverage, recency) as recorded in Climate Change Laws of the
 * World. It is NOT a measure of emissions outcomes, real-world ambition, or
 * implementation quality, and the underlying catalogue carries known
 * coverage bias. The scores are a structured, transparent reading of "who
 * has built which governance features", offered as a starting point for
 * peer learning — not a league table of climate performance.
 *
 * Keep this file free of server-only imports — it is bundled into the client
 * page (beta/modules/national-climate-policies).
 */

import type { ClimatePolicy } from './climate-laws-types';
import { EU_MEMBER_STATES } from '@/data/eu-member-states';
import {
  SEED_COUNCILS,
  ClimateCouncil,
  CouncilStatus,
} from '@/data/climate-councils';
import { computeCountryMetrics, CountryPolicyMetrics } from './climate-policy-insights';

// ───────────────────────────────────────────────────────────────────────────
// Scope: which member states have an ESABCC counterpart?
// ───────────────────────────────────────────────────────────────────────────

/**
 * Counterpart tier, in descending order of how closely a national body
 * resembles an independent scientific advisory council like the ESABCC.
 *  - `statutory`   : independent council anchored in primary legislation.
 *  - `independent` : independent advisory body operating without a primary
 *                    statute.
 *  - `proxy`       : inter-ministerial / coordination body or a non-dedicated
 *                    proxy — advisory function exists but is not an
 *                    independent expert council.
 *  - `pending`     : legislated but not yet operational, or dormant.
 *  - `none`        : no national advisory body catalogued.
 */
export type CounterpartTier = 'statutory' | 'independent' | 'proxy' | 'pending' | 'none';

/** Higher = closer to an independent statutory council. */
const STATUS_RANK: Record<CouncilStatus, number> = {
  active_statutory: 6,
  active_no_statute: 5,
  inter_ministerial: 4,
  partial_proxy: 3,
  legislated_not_operational: 2,
  dormant: 2,
  abolished: 1,
  none: 0,
};

function tierForStatus(status: CouncilStatus): CounterpartTier {
  switch (status) {
    case 'active_statutory':
      return 'statutory';
    case 'active_no_statute':
      return 'independent';
    case 'inter_ministerial':
    case 'partial_proxy':
      return 'proxy';
    case 'legislated_not_operational':
    case 'dormant':
      return 'pending';
    default:
      return 'none';
  }
}

export const COUNTERPART_TIER_LABELS: Record<CounterpartTier, string> = {
  statutory: 'Independent council (statutory)',
  independent: 'Independent council (no primary statute)',
  proxy: 'Inter-ministerial / proxy body',
  pending: 'Legislated but not operational',
  none: 'No national advisory body',
};

export interface CounterpartInfo {
  code: string;
  name: string;
  tier: CounterpartTier;
  status: CouncilStatus;
  bodyName: string;
  bodyOriginal: string;
  established: string;
  url: string;
  legalBasisUrl: string;
  /** True for tiers `statutory` and `independent` — the in-scope focus set. */
  isCounterpart: boolean;
}

/**
 * For each EU-27 member state, the strongest national advisory body found in
 * the councils dataset. "Strongest" = highest {@link STATUS_RANK}; ties keep
 * the first in catalogue order.
 */
export function counterpartByCountry(
  councils: ClimateCouncil[] = SEED_COUNCILS,
): Map<string, CounterpartInfo> {
  const best = new Map<string, ClimateCouncil>();
  councils
    .filter((c) => c.level === 'national')
    .forEach((c) => {
      const cur = best.get(c.countryCode);
      if (!cur || STATUS_RANK[c.status] > STATUS_RANK[cur.status]) {
        best.set(c.countryCode, c);
      }
    });

  const out = new Map<string, CounterpartInfo>();
  EU_MEMBER_STATES.forEach(({ code, name }) => {
    const c = best.get(code);
    const status: CouncilStatus = c?.status ?? 'none';
    const tier = tierForStatus(status);
    out.set(code, {
      code,
      name,
      tier,
      status,
      bodyName: c?.bodyName ?? '',
      bodyOriginal: c?.bodyOriginal ?? '',
      established: c?.established ?? '',
      url: c?.url ?? '',
      legalBasisUrl: c?.legalBasisUrl ?? '',
      isCounterpart: tier === 'statutory' || tier === 'independent',
    });
  });
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Assessment dimensions
// ───────────────────────────────────────────────────────────────────────────

export interface Evidence {
  /** What the link points at, e.g. "Framework climate law" or "Council". */
  label: string;
  title: string;
  url: string;
  year?: number | null;
}

export interface DimensionScore {
  key: string;
  label: string;
  /** 0–100, higher = stronger documented practice. */
  score: number;
  detail: string;
  evidence?: Evidence;
}

export interface CountryAssessment {
  code: string;
  name: string;
  counterpart: CounterpartInfo;
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

export interface AssessmentDimensionMeta {
  key: string;
  label: string;
  description: string;
}

/** The scored dimensions, in display order, with their documented rule. */
export const ASSESSMENT_DIMENSIONS: AssessmentDimensionMeta[] = [
  {
    key: 'statutoryFramework',
    label: 'Statutory framework',
    description:
      'Is the climate framework anchored in a law passed by parliament (100), ' +
      'an executive strategy only (50), or absent from the catalogue (0)? ' +
      'A binding framework law is the clearest marker of durable, ' +
      'government-proof climate governance.',
  },
  {
    key: 'sectoralBreadth',
    label: 'Sectoral breadth',
    description:
      'How many distinct economic sectors does the national catalogue touch, ' +
      'relative to the broadest portfolio in the focus set? Wider coverage ' +
      'means fewer sectors governed by EU rules alone.',
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
      'A proxy for whether the framework is being actively kept up to date.',
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
  return pool
    .filter((p) => p.year != null)
    .sort((a, b) => (a.year as number) - (b.year as number))[0] ?? pool[0];
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

/**
 * Full assessment of the counterpart focus set.
 *
 * @param policies  The live catalogue (member-state instruments only — the
 *                  EU-level layer is excluded, this is about Member States).
 * @param councils  Councils dataset; defaults to the committed seed.
 */
export interface AssessmentResult {
  focus: CountryAssessment[];
  bestPractices: BestPractice[];
  dimensions: AssessmentDimensionMeta[];
  /** Counterpart classification for ALL 27, for the scope/transparency view. */
  counterparts: CounterpartInfo[];
  scope: {
    rule: string;
    counterpartCount: number;
    statutoryCount: number;
    excluded: { code: string; name: string; tier: CounterpartTier }[];
  };
  caveats: string[];
}

export function assessMemberStates(
  policies: ClimatePolicy[],
  councils: ClimateCouncil[] = SEED_COUNCILS,
): AssessmentResult {
  const counterpartMap = counterpartByCountry(councils);
  const counterparts = Array.from(counterpartMap.values());
  const metricsByCode = new Map(
    computeCountryMetrics(policies).map((m) => [m.code, m]),
  );

  const focusCodes = counterparts.filter((c) => c.isCounterpart).map((c) => c.code);

  // Sectoral breadth is normalised against the broadest portfolio *within the
  // focus set*, so the dimension is relative to peers rather than to a fixed
  // ceiling that no one reaches.
  const maxSectors = Math.max(
    1,
    ...focusCodes.map((code) => metricsByCode.get(code)?.sectorsCovered ?? 0),
  );

  const focus: CountryAssessment[] = focusCodes
    .map((code) => {
      const counterpart = counterpartMap.get(code)!;
      const m = metricsByCode.get(code)!;
      const list = policies.filter((p) => p.countryCode === code);

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
          detail: `${m.sectorsCovered} sectors covered (focus-set max ${maxSectors})`,
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

      const composite =
        dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length;

      return { code, name: counterpart.name, counterpart, metrics: m, dimensions, composite };
    })
    .sort((a, b) => b.composite - a.composite);

  // ── Best practice per dimension: the focus country scoring highest, with
  //    the instrument/council that earns it. Ties resolve by catalogue depth
  //    (more documented evidence) then alphabetically, deterministically.
  const bestPractices: BestPractice[] = ASSESSMENT_DIMENSIONS.map((dim) => {
    const ranked = [...focus].sort((a, b) => {
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

  // ── Institutional highlight: the longest-standing statutory council in the
  //    focus set, as a governance best practice in its own right.
  const statutory = counterparts.filter((c) => c.tier === 'statutory');
  const earliestEstablished = (s: string): number => {
    const m = s.match(/\b(19|20)\d{2}\b/);
    return m ? parseInt(m[0], 10) : Number.POSITIVE_INFINITY;
  };
  const oldestCouncil = [...statutory].sort(
    (a, b) => earliestEstablished(a.established) - earliestEstablished(b.established),
  )[0];
  if (oldestCouncil) {
    bestPractices.unshift({
      dimensionKey: 'independentOversight',
      dimensionLabel: 'Independent oversight',
      code: oldestCouncil.code,
      country: oldestCouncil.name,
      score: 100,
      rationale: `Statutory independent climate advisory council${
        oldestCouncil.established ? ` (established ${oldestCouncil.established})` : ''
      } — ${oldestCouncil.bodyName}`,
      evidence: oldestCouncil.url
        ? { label: 'Council', title: oldestCouncil.bodyName, url: oldestCouncil.url }
        : undefined,
    });
  }

  const excluded = counterparts
    .filter((c) => !c.isCounterpart)
    .map((c) => ({ code: c.code, name: c.name, tier: c.tier }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    focus,
    bestPractices,
    dimensions: ASSESSMENT_DIMENSIONS,
    counterparts: counterparts.sort((a, b) => {
      const order: CounterpartTier[] = ['statutory', 'independent', 'proxy', 'pending', 'none'];
      const d = order.indexOf(a.tier) - order.indexOf(b.tier);
      return d !== 0 ? d : a.name.localeCompare(b.name);
    }),
    scope: {
      rule:
        'In-scope = EU member states with an independent national climate ' +
        'advisory council (tiers "statutory" or "independent" in the EU ' +
        'Climate Councils dataset) — the ESABCC’s peer bodies.',
      counterpartCount: focusCodes.length,
      statutoryCount: statutory.length,
      excluded,
    },
    caveats: [
      'Scores read the documented policy architecture in Climate Change Laws ' +
        'of the World — not emissions outcomes, real ambition, or implementation quality.',
      'Catalogue depth reflects CCLW editorial coverage as well as genuine ' +
        'legislative activity; treat thin portfolios as "less documented", not "less governed".',
      'Framework, sector and adaptation tags are sparse and partly inconsistent ' +
        'in the source; a missing tag can mean "untagged" rather than "absent".',
      'The snapshot pre-dates recent Fit-for-55 transposition and 2023–25 ' +
        'national climate-law updates; re-run after a catalogue refresh.',
      'Scope follows from where independent councils exist; absence from the ' +
        'focus set is not a judgement on a member state’s policies.',
    ],
  };
}
