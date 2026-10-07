/**
 * Deterministic classification for the "by report" recommendations view.
 * ----------------------------------------------------------------------
 * AI-compiled — pending Secretariat verification.
 *
 * Each recommendation gets three labels, derived only from its stored title
 * and chapter code (`area`), plus a small number of report-level rules:
 *
 *   • focus   — mitigation, adaptation or both;
 *   • sectors — energy supply, industry, buildings, transport, agriculture,
 *               LULUCF & CDR, health, water;
 *   • roles   — the nine EU climate policy roles in Box 1 of the ESABCC
 *               assessment framework.
 *
 * The rules are word-boundary vocabularies with explicit veto phrases for
 * known traps (e.g. "Recovery and Resilience Facility" is not adaptation;
 * "Target CCU/CCS" is a verb, not a target-setting role). They are
 * deliberately conservative: a label is given only where the title or the
 * report's own scope makes it clear, and the cell is otherwise left blank.
 * Body text is not used for sectors or roles, because summaries routinely
 * list hazards or instruments in passing. Focus also reads the summary, up
 * to any "Map:" instrument list, because a title alone rarely says whether
 * advice concerns mitigation or adaptation.
 *
 * The same input always gives the same output. To change a label, edit the
 * vocabularies below (or `REPORT_SECTORS`) — never a rendered cell.
 */

export type Focus = 'mitigation' | 'adaptation' | 'both';

export const SECTORS = [
  'Energy supply',
  'Industry',
  'Buildings',
  'Transport',
  'Agriculture',
  'LULUCF & CDR',
  'Health',
  'Water',
] as const;
export type Sector = (typeof SECTORS)[number];

/** Box 1 of the ESABCC assessment framework: nine EU climate policy roles. */
export const ROLES = [
  'Direction and goals',
  'Regulation and pricing',
  'Coordination and planning',
  'Finance and investment',
  'Implementation',
  'Knowledge and innovation',
  'Monitoring and enforcement',
  'Solidarity and cohesion',
  'International climate action',
] as const;
export type Role = (typeof ROLES)[number];

export interface ClassifyInput {
  title: string;
  /** Chapter code of the source report, e.g. "E1 · Energy supply". */
  area?: string;
  summary?: string;
  reportId?: string;
}

export interface Classification {
  focus: Focus | null;
  sectors: Sector[];
  roles: Role[];
}

const FOCUS_LABEL: Record<Focus, string> = {
  mitigation: 'Mitigation',
  adaptation: 'Adaptation',
  both: 'Both',
};
export const focusLabel = (f: Focus | null): string => (f ? FOCUS_LABEL[f] : '');

/** Word-boundary alternation, case-insensitive. Stems end with `\w*`. */
const re = (...alts: string[]) => new RegExp(`\\b(?:${alts.join('|')})`, 'i');

/* ------------------------------------------------------------- vetoes */
// Phrases removed before any matching, so their words cannot fire a rule.
const VETOES: RegExp[] = [
  /climate-neutral and climate-resilient/gi,
  /recovery and resilience facility/gi,
  /\bRRF\b/g,
  /supply[- ]chain resilience/gi,
  /\bhealthy\b/gi,
  /\bbuilding (?:on|blocks?|up)\b/gi,
  /\bbuilding-blocks?\b/gi,
  /public-private partnerships?/gi,
  /governance regulation/gi,
  /emissions? (?:pathways?|scenarios?)/gi,
  /\bcap\b/g, // lowercase: an ETS cap, not the Common Agricultural Policy
];

const clean = (s: string): string => VETOES.reduce((t, v) => t.replace(v, ' '), s);

/** The summary up to the instrument list, which is status commentary. */
const summaryBody = (s: string): string => s.split(/\bMap:/)[0] ?? s;

/* -------------------------------------------------------------- focus */
const MITIGATION = re(
  'emissions?\\b', 'decarboni[sz]\\w*', 'mitigation', 'net[- ]zero', 'climate[- ]neutral\\w*',
  'GHG', 'greenhouse', 'ETS\\d?\\b', 'carbon (?:pric|budget|leakage|capture|dioxide removal)\\w*',
  'CO2\\b', 'CO₂', 'removals?\\b', 'CDR\\b', 'CCU?S\\b', 'CCUS\\b', 'renewables?\\b',
  'hydrogen', 'fossil', 'electrification', 'energy[- ]efficiency', 'efficiency first',
  'LULUCF', 'land sink', 'biofuels?', 'bioenergy', 'heat pumps?', 'zero-emission',
  'low-emission', 'modal shift', 'CBAM', 'free allocation', 'climate targets?',
  '20[345]0 (?:climate )?targets?', 'phase[- ]out',
);
const ADAPTATION = re(
  'adaptation', 'climate[- ]resilien\\w*', 'resilience[- ]by[- ]design', 'climate risks?',
  'climate impacts?', 'physical climate', 'climate scenarios?', 'stress[- ]test\\w*',
  'just resilience', 'protection gap', 'climate hazards?', 'heat\\b', 'drought', 'flood\\w*',
  'sea[- ]level', 'climate projections?', 'climate-resilience', 'SSP\\d',
);

/** Classify advice as mitigation, adaptation or both; null if neither is clear. */
export function classifyFocus(input: ClassifyInput): Focus | null {
  const text = clean(`${input.title}. ${summaryBody(input.summary ?? '')}`);
  const m = MITIGATION.test(text);
  const a = ADAPTATION.test(text);
  if (m && a) return 'both';
  if (m) return 'mitigation';
  if (a) return 'adaptation';
  return null;
}

/* ------------------------------------------------------------ sectors */
const SECTOR_TERMS: Record<Sector, RegExp> = {
  'Energy supply': re(
    'energy supply', 'power sector', 'electricity', 'renewables?\\b', 'solar', 'wind\\b', 'offshore',
    'grids?\\b', 'energy (?:infrastructure|system|networks?|mix)', 'hydrogen', 'gas (?:infrastructure|supply|networks?|diversification)', 'methane', 'TEN-E',
    'ENTSO\\w*', 'TYNDP', 'biogas', 'biomethane', 'bioenergy', 'district heating', 'upstream fossil',
  ),
  Industry: re(
    'industr\\w*', 'steel', 'cement', 'chemicals?\\b', 'carbon leakage', 'CBAM', 'free allocation',
    'circular economy', 'CEAP', 'manufactur\\w*', 'material demand',
  ),
  Buildings: re(
    'buildings\\b', 'building (?:stock|codes?|sector)', 'renovation', 'EPBD', 'heat pumps?', 'residential', 'tertiary', 'EPCs?\\b',
  ),
  Transport: re(
    '(?<!CO2 )transport\\b', 'vehicles?', 'aviation', 'shipping', 'maritime', 'rail\\b', 'modal shift',
    'mobility', 'ZEVs?\\b', 'road\\b', 'long-haul',
  ),
  Agriculture: re(
    'agricultur\\w*', 'agri-food', 'farm\\w*', 'CAP\\b', 'livestock', 'ruminant', 'food\\b',
    'diets?\\b', 'AgETS', 'fertili[sz]er', 'peat',
  ),
  'LULUCF & CDR': re(
    'LULUCF', 'land sink', 'land use', 'land-use', 'forests?\\b', 'wetlands?', 'peat', 'soils?\\b',
    'removals?\\b', 'CDR\\b', 'carbon dioxide removal', 'CO2 transport and storage',
  ),
  Health: re('health\\b', 'healthcare', 'mortality', 'public health'),
  Water: re('water\\b', 'drought', 'flood\\w*', 'river', 'hydrological'),
};

/**
 * Chapter codes (first token of `area`) that are sector chapters in the
 * January 2024 report. The report's own chapter coding is clear evidence.
 */
const CHAPTER_SECTOR: Record<string, Sector> = {
  E: 'Energy supply',
  I: 'Industry',
  T: 'Transport',
  B: 'Buildings',
  A: 'Agriculture',
};
const CHAPTER_REPORT = 'towards-eu-climate-neutrality-2024';

/**
 * Reports whose whole scope is one sector's infrastructure or system, so every
 * recommendation in them is relevant to it.
 */
const REPORT_SECTORS: Record<string, Sector[]> = {
  'acer-energy-infrastructure-2022': ['Energy supply'],
  'scenario-guidelines-2022': ['Energy supply'],
  'decarbonised-energy-infrastructure-2023': ['Energy supply'],
  'ten-e-draft-scenarios-2024': ['Energy supply'],
  'carbon-removals-2025': ['LULUCF & CDR'],
  'agri-food-2026': ['Agriculture'],
};

export function classifySectors(input: ClassifyInput): Sector[] {
  const found = new Set<Sector>(REPORT_SECTORS[input.reportId ?? ''] ?? []);
  const title = clean(input.title);
  for (const s of SECTORS) if (SECTOR_TERMS[s].test(title)) found.add(s);
  if (input.reportId === CHAPTER_REPORT && input.area) {
    const m = /^([A-Z])\d+\s*·/.exec(input.area);
    const chapter = m ? CHAPTER_SECTOR[m[1]] : undefined;
    if (chapter) found.add(chapter);
  }
  return SECTORS.filter(s => found.has(s));
}

/* -------------------------------------------------------------- roles */
// Title-only. "target" is matched as a noun only, so the verb in "Target
// CCU/CCS at no-alternative uses" does not read as target-setting.
const ROLE_TERMS: Record<Role, RegExp> = {
  'Direction and goals': re(
    '(?:climate|emission|legally-binding|EU|20[345]0|adaptation|resilience|removal|separate)\\s+(?:sub-)?targets?\\b',
    '(?:sub-)?targets\\b', 'vision\\b', 'climate neutrality', 'climate-neutrality',
  ),
  'Regulation and pricing': re(
    'ETS\\d?\\b', 'pric(?:e|ing)\\b', 'tax\\w*', 'CBAM', 'free allocation', 'standards?\\b',
    'regulatory', 'mandat\\w*', 'disclosure', 'financial supervision', 'taxonomy',
    'carbon leakage',
  ),
  'Coordination and planning': re(
    'planning', 'coordinat\\w*', 'TYNDP', 'scenarios?\\b', 'risk assessments?', 'climate risks?',
    'long-term strateg\\w*', 'renovation strateg\\w*', 'multilevel', 'infrastructure', 'pathways?\\b',
    'CBA\\b', 'cost-benefit',
  ),
  'Finance and investment': re(
    'invest\\w*', 'financ\\w*', 'funding', 'funds?\\b', 'MFF', 'RRF', 'recovery and resilience',
    'subsid\\w*', 'bonds?\\b', 'revenue', 'Innovation Fund', 'spending', 'SCF', 'JTF',
    'common-debt', 'fiscal', 'CAP payments', 'insurance',
  ),
  Implementation: re(
    'CAP\\b', 'programmes?\\b', 'Solidarity Fund', 'Civil Protection', 'crisis response',
    'Renovation Wave', 'Technical Support Instrument',
  ),
  'Knowledge and innovation': re(
    'innovation', 'R&D', 'research', 'technolog\\w*', 'demonstration', 'value chains?',
  ),
  'Monitoring and enforcement': re(
    'monitor\\w*', 'enforce\\w*', 'compliance', 'MRV', 'tracking', 'evaluation',
    'access to justice',
  ),
  'Solidarity and cohesion': re(
    'just[- ]transition', 'just resilience', 'Social Climate Fund', 'vulnerable', 'fairness',
    'distributional', 'solidarity', 'income support', 'social[–-]climate', 'at-risk',
    'equitable', 'cohesion',
  ),
  'International climate action': re(
    'international', 'diplomacy', 'third countr\\w*', 'trade partners?', 'partnerships?\\b',
  ),
};

export function classifyRoles(input: ClassifyInput): Role[] {
  const title = clean(input.title);
  return ROLES.filter(r => ROLE_TERMS[r].test(title));
}

export function classify(input: ClassifyInput): Classification {
  return {
    focus: classifyFocus(input),
    sectors: classifySectors(input),
    roles: classifyRoles(input),
  };
}

/**
 * Union of several classifications: every sector and role found in any of
 * them, and "both" when mitigation and adaptation are each found somewhere.
 * Used for a headline recommendation together with its sub-recommendations.
 */
export function mergeClassifications(cs: Classification[]): Classification {
  const foci = new Set(cs.map(c => c.focus).filter((f): f is Focus => f !== null));
  const mit = foci.has('mitigation') || foci.has('both');
  const ada = foci.has('adaptation') || foci.has('both');
  const sectors = new Set(cs.flatMap(c => c.sectors));
  const roles = new Set(cs.flatMap(c => c.roles));
  return {
    focus: mit && ada ? 'both' : mit ? 'mitigation' : ada ? 'adaptation' : null,
    sectors: SECTORS.filter(s => sectors.has(s)),
    roles: ROLES.filter(r => roles.has(r)),
  };
}
