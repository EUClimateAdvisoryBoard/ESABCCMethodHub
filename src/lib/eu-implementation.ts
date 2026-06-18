/**
 * EU policy → national implementation tracker for the National Level Climate
 * Policies beta module. An update to the Policy Gap report focused on the
 * question Member States are actually judged on: **how are the EU climate
 * policies that require national implementation being implemented, and which
 * member states are lagging behind?**
 *
 * The idea
 * --------
 * A large part of EU climate law only bites once member states act on it —
 * directives have to be transposed, the Effort Sharing Regulation sets binding
 * national targets, the Governance Regulation requires national plans, and so
 * on. This module goes through the EU instruments that require national
 * implementation and, for each one, reads the **national policy catalogue**
 * (Climate Change Laws of the World) to gauge how far each member state has
 * built a corresponding national response — then flags the laggards and
 * surfaces **best practices** from the leaders that the laggards could copy.
 *
 * How it works (transparent & defendable)
 * ---------------------------------------
 *  - From the 40 EU instruments tracked by the Policy Navigator
 *    (`src/data/sectoral-policies.ts`) we select those that genuinely require
 *    *national* implementation/transposition and are observable in the
 *    catalogue. Centrally-operated instruments (EU ETS, CBAM) and acts too
 *    recent to appear in the snapshot (e.g. the Nature Restoration Law) are
 *    deliberately left out — see `analysis/POLICY-MONITORING.md`.
 *  - Each EU policy carries an explicit, published **matcher** over the
 *    national catalogue (sector + keyword/text signals). A national instrument
 *    "implements" an EU policy when it matches — this is a *proxy* for a
 *    national response in that policy area, computed live and reproducibly.
 *  - Each member state is rated 0–3 on each EU policy from its matching
 *    instruments (count + whether any is a Law). Levels ≤ 1 are "lagging".
 *  - Best practices = the actual national instruments of the strongest
 *    implementers, linked so a laggard (and a reviewer) can open them.
 *
 * IMPORTANT — what this is NOT. Matching the catalogue is **not** verified
 * legal transposition and **not** a compliance check against ESR/NECP targets.
 * A "Strong" rating means "the catalogue records a substantive national
 * response in this policy area", and "Not evident" can mean "not in this
 * snapshot" rather than "nothing exists". Read alongside the official
 * transposition/compliance trackers, not instead of them.
 *
 * Keep this file free of server-only imports — it is bundled into the client.
 */

import type { ClimatePolicy } from './climate-laws-types';
import { EU_MEMBER_STATES } from '@/data/eu-member-states';

const eurlex = (celex: string) =>
  `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${celex}`;

function combinedText(p: ClimatePolicy): string {
  return [p.title, p.summary, ...p.keywords, ...p.instruments, ...p.sectors]
    .join(' ')
    .toLowerCase();
}
const hasSector = (p: ClimatePolicy, ...s: string[]) =>
  p.sectors.some((x) => s.includes(x));

// ───────────────────────────────────────────────────────────────────────────
// The EU instruments that require national implementation
// ───────────────────────────────────────────────────────────────────────────

export interface EuImplementationPolicy {
  id: string;
  shortName: string;
  fullName: string;
  acronym?: string;
  eurlexUrl: string;
  /** Year of adoption (most recent revision), for context. */
  adopted: string;
  /** One-line summary of what national implementation has to deliver. */
  requires: string;
  /** True for national instruments that respond to this EU policy. */
  match: (p: ClimatePolicy) => boolean;
}

export const EU_IMPLEMENTATION_POLICIES: EuImplementationPolicy[] = [
  {
    id: 'esr',
    shortName: 'Effort Sharing',
    fullName: 'Effort Sharing Regulation',
    acronym: 'ESR',
    eurlexUrl: eurlex('32018R0842'),
    adopted: '2018, revised 2023',
    requires:
      'Binding national 2030 GHG targets for the non-ETS sectors (transport, ' +
      'buildings, agriculture, small industry, waste) — met through national ' +
      'measures and budgets.',
    match: (p) =>
      (p.category === 'Law' && p.frameworks.includes('Mitigation')) ||
      /effort sharing|non-ets|emission reduction target|carbon budget|climate target|greenhouse gas.*reduction/.test(
        combinedText(p),
      ),
  },
  {
    id: 'red',
    shortName: 'Renewable Energy',
    fullName: 'Renewable Energy Directive III',
    acronym: 'RED III',
    eurlexUrl: eurlex('32023L2413'),
    adopted: '2023',
    requires:
      'A national contribution to the 42.5% EU renewables target, with support ' +
      'schemes, permitting and renewable heating/transport obligations.',
    match: (p) =>
      hasSector(p, 'Energy') &&
      /renewable|wind|solar|photovolta|biofuel|biogas|biomass|hydrogen|geothermal/.test(
        combinedText(p),
      ),
  },
  {
    id: 'eed',
    shortName: 'Energy Efficiency',
    fullName: 'Energy Efficiency Directive (recast)',
    acronym: 'EED',
    eurlexUrl: eurlex('32023L1791'),
    adopted: '2023',
    requires:
      'Annual final-energy-savings obligations, public-sector renovation, and ' +
      'an energy-efficiency-first national framework.',
    match: (p) =>
      /energy efficiency|energy saving|energy demand|efficiency obligation|smart meter|cogeneration/.test(
        combinedText(p),
      ),
  },
  {
    id: 'epbd',
    shortName: 'Buildings (EPBD)',
    fullName: 'Energy Performance of Buildings Directive (recast)',
    acronym: 'EPBD',
    eurlexUrl: eurlex('32024L1275'),
    adopted: '2024',
    requires:
      'Minimum energy-performance standards, national renovation plans, energy ' +
      'performance certificates and a fossil-boiler phase-out path.',
    match: (p) =>
      hasSector(p, 'Buildings', 'Residential and Commercial') ||
      /building|renovation|energy performance|insulation|thermal/.test(combinedText(p)),
  },
  {
    id: 'afir',
    shortName: 'Alt. Fuels Infra.',
    fullName: 'Alternative Fuels Infrastructure Regulation',
    acronym: 'AFIR',
    eurlexUrl: eurlex('32023R1804'),
    adopted: '2023',
    requires:
      'National roll-out of recharging and refuelling infrastructure (EV ' +
      'charging, hydrogen) along the core network and in urban nodes.',
    match: (p) =>
      /charging|recharg|alternative fuel|refuel|electromobility|e-mobility|\bev\b|electric vehicle/.test(
        combinedText(p),
      ),
  },
  {
    id: 'lulucf',
    shortName: 'LULUCF',
    fullName: 'LULUCF Regulation',
    eurlexUrl: eurlex('32018R0841'),
    adopted: '2018, revised 2023',
    requires:
      'A national net-removals target for land use, land-use change and ' +
      'forestry, with accounting and restoration measures.',
    match: (p) =>
      hasSector(p, 'LULUCF') ||
      /forest|land use|afforest|carbon sink|reforest|\bredd/.test(combinedText(p)),
  },
  {
    id: 'cap',
    shortName: 'Agriculture (CAP)',
    fullName: 'Common Agricultural Policy (post-2023)',
    acronym: 'CAP',
    eurlexUrl: eurlex('32021R2115'),
    adopted: '2021',
    requires:
      'A national CAP Strategic Plan channelling support to climate and ' +
      'environmental measures (eco-schemes, conditionality).',
    match: (p) =>
      hasSector(p, 'Agriculture') ||
      /agricultur|rural|farming|livestock|manure/.test(combinedText(p)),
  },
  {
    id: 'waste',
    shortName: 'Waste & Circular',
    fullName: 'Waste Framework & Landfill Directives',
    eurlexUrl: eurlex('32008L0098'),
    adopted: '2008, revised 2018',
    requires:
      'National waste-prevention and management plans, separate collection, ' +
      'recycling targets and landfill diversion.',
    match: (p) =>
      hasSector(p, 'Waste') || /\bwaste\b|recycl|landfill|circular economy/.test(combinedText(p)),
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Rating
// ───────────────────────────────────────────────────────────────────────────

export type ImplementationLevel = 0 | 1 | 2 | 3;

export const LEVEL_LABELS: Record<ImplementationLevel, string> = {
  0: 'Not evident',
  1: 'Emerging',
  2: 'Moderate',
  3: 'Strong',
};

export const LEVEL_COLORS: Record<ImplementationLevel, string> = {
  0: '#E0E0E0', // grey — nothing in the catalogue
  1: '#EF6C00', // orange — single/soft signal (lagging)
  2: '#F9A825', // amber — substantive response
  3: '#1B5E20', // green — strong, statute-anchored response
};

/** Levels at or below this are treated as "lagging behind". */
export const LAGGING_AT_OR_BELOW: ImplementationLevel = 1;

function rate(matches: ClimatePolicy[]): ImplementationLevel {
  const n = matches.length;
  if (n === 0) return 0;
  const hasLaw = matches.some((m) => m.category === 'Law');
  if (n >= 2 && hasLaw) return 3;
  if (n >= 2 || hasLaw) return 2;
  return 1;
}

export interface InstrumentRef {
  id: string;
  title: string;
  category: string;
  year: number | null;
  url: string;
}

export interface CountryImplementation {
  code: string;
  name: string;
  level: ImplementationLevel;
  count: number;
  hasLaw: boolean;
  latestYear: number | null;
  /** The matching instruments (most recent first), for evidence. */
  examples: InstrumentRef[];
}

export interface BestPracticeExample {
  code: string;
  country: string;
  instrument: InstrumentRef;
  note: string;
}

export interface PolicyImplementation {
  policy: EuImplementationPolicy;
  byCountry: CountryImplementation[];
  levelCounts: Record<ImplementationLevel, number>;
  laggards: { code: string; name: string; level: ImplementationLevel }[];
  bestPractices: BestPracticeExample[];
  /** Mean level across the 27, 0–3. */
  meanLevel: number;
}

export interface CountryScoreboard {
  code: string;
  name: string;
  /** Mean implementation level across the EU policies, 0–100. */
  score: number;
  levels: Record<string, ImplementationLevel>;
  /** Number of EU policies on which this member state is lagging. */
  laggingCount: number;
  strongCount: number;
}

export interface ImplementationResult {
  policies: PolicyImplementation[];
  scoreboard: CountryScoreboard[];
  caveats: string[];
}

function toRef(p: ClimatePolicy): InstrumentRef {
  return {
    id: p.id,
    title: p.title,
    category: p.category,
    year: p.year,
    url: p.documentUrl || p.climateLawsUrl,
  };
}
const byYearDesc = (a: InstrumentRef, b: InstrumentRef) => (b.year ?? 0) - (a.year ?? 0);

export function assessImplementation(policies: ClimatePolicy[]): ImplementationResult {
  const states = EU_MEMBER_STATES;

  const perPolicy: PolicyImplementation[] = EU_IMPLEMENTATION_POLICIES.map((eu) => {
    const byCountry: CountryImplementation[] = states.map(({ code, name }) => {
      const matches = policies.filter((p) => p.countryCode === code && eu.match(p));
      const refs = matches.map(toRef).sort(byYearDesc);
      const years = matches.map((m) => m.year).filter((y): y is number => y != null);
      return {
        code,
        name,
        level: rate(matches),
        count: matches.length,
        hasLaw: matches.some((m) => m.category === 'Law'),
        latestYear: years.length ? Math.max(...years) : null,
        examples: refs.slice(0, 4),
      };
    });

    const levelCounts: Record<ImplementationLevel, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    byCountry.forEach((c) => {
      levelCounts[c.level] += 1;
    });

    const laggards = byCountry
      .filter((c) => c.level <= LAGGING_AT_OR_BELOW)
      .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
      .map((c) => ({ code: c.code, name: c.name, level: c.level }));

    // Best practices: one exemplar instrument per strong implementer (prefer a
    // recent Law), most-documented countries first, capped so the laggards get
    // a short, usable shortlist of models rather than a wall of links.
    const strong = byCountry
      .filter((c) => c.level === 3)
      .sort((a, b) => (b.latestYear ?? 0) - (a.latestYear ?? 0) || b.count - a.count);
    const bestPractices: BestPracticeExample[] = strong
      .map((c) => {
        const law = c.examples.find((e) => e.category === 'Law');
        const instrument = law ?? c.examples[0];
        if (!instrument) return null;
        return {
          code: c.code,
          country: c.name,
          instrument,
          note: `${c.count} matching instrument${c.count === 1 ? '' : 's'}${
            c.hasLaw ? ', anchored in law' : ''
          }${c.latestYear ? `; latest ${c.latestYear}` : ''}`,
        };
      })
      .filter((x): x is BestPracticeExample => x !== null)
      .slice(0, 6);

    const meanLevel = byCountry.reduce((s, c) => s + c.level, 0) / byCountry.length;

    return { policy: eu, byCountry, levelCounts, laggards, bestPractices, meanLevel };
  });

  // Country scoreboard across all EU policies.
  const scoreboard: CountryScoreboard[] = states
    .map(({ code, name }) => {
      const levels: Record<string, ImplementationLevel> = {};
      let sum = 0;
      let laggingCount = 0;
      let strongCount = 0;
      perPolicy.forEach((pp) => {
        const c = pp.byCountry.find((x) => x.code === code)!;
        levels[pp.policy.id] = c.level;
        sum += c.level;
        if (c.level <= LAGGING_AT_OR_BELOW) laggingCount += 1;
        if (c.level === 3) strongCount += 1;
      });
      const score = Math.round((sum / (perPolicy.length * 3)) * 100);
      return { code, name, score, levels, laggingCount, strongCount };
    })
    .sort((a, b) => b.score - a.score);

  return {
    policies: perPolicy,
    scoreboard,
    caveats: [
      'Matching the national catalogue is a proxy for a national response in a ' +
        'policy area — not verified legal transposition, and not a compliance ' +
        'check against ESR / NECP / sectoral targets.',
      '"Not evident" can mean "not in this 2022 snapshot" rather than "nothing ' +
        'exists" — much Fit-for-55 transposition post-dates the snapshot. Refresh ' +
        'the catalogue before drawing firm laggard conclusions.',
      'EU instruments that are centrally operated (EU ETS, CBAM) or too recent ' +
        'to appear (e.g. the Nature Restoration Law) are intentionally excluded ' +
        'from this tracker.',
      'Catalogue depth reflects CCLW editorial coverage as well as real activity; ' +
        'a thinly-documented member state can look like a laggard on coverage alone.',
      'Best practices are exemplary national instruments in the policy area; read ' +
        'the linked source to confirm fit before holding one up as a model.',
    ],
  };
}
