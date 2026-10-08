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
 *               assessment framework, each hit tied to a sub-role of the
 *               policy assessment report outline (`SUB_ROLES`).
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
 * vocabularies below (or `REPORT_SECTORS` / `REPORT_ROLE_HITS`) — never a
 * rendered cell.
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

/**
 * The nine EU climate policy roles (Box 1 of the ESABCC assessment framework),
 * in the order and numbering of the policy assessment report outline, so role
 * N's sub-roles are N.1, N.2 … (see `SUB_ROLES`).
 */
export const ROLES = [
  'Direction and goals',
  'Monitoring and enforcement',
  'Regulation and pricing',
  'Coordination and planning',
  'Finance and investment',
  'Implementation',
  'Knowledge and innovation',
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

/** Why a role was assigned: the sub-role a rule maps to and the words it matched. */
export interface RoleHit {
  /** Sub-role number from the report outline, e.g. "3.1". */
  sub: string;
  /** The words in the title that fired the rule, or a report-scope note. */
  evidence: string;
  /** Set for merged headlines: which row the hit came from ("Sub-rec 2"). */
  source?: string;
  /** True when the hit comes from a whole-report rule, not the title. */
  reportRule?: boolean;
}

export interface Classification {
  focus: Focus | null;
  sectors: Sector[];
  roles: Role[];
  /** For every role in `roles`, the rule hits that put it there. */
  roleHits: Partial<Record<Role, RoleHit[]>>;
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
/** Sub-roles from the policy assessment report outline, keyed by number. */
export const SUB_ROLES: Record<string, string> = {
  '1.1': 'Long-term vision and objectives',
  '1.2': 'Intermediate EU targets and milestones',
  '1.3': 'National contributions and burden allocation',
  '1.4': 'Reference scenarios',
  '2.1': 'Common indicators and data quality',
  '2.2': 'Monitoring progress against targets',
  '2.3': 'Monitoring of implementation and expenditure',
  '2.4': 'Compliance mechanisms and enforcement',
  '2.5': 'Adaptation monitoring, evaluation and learning',
  '3.1': 'Carbon pricing and emissions markets',
  '3.2': 'Direct emissions and performance standards',
  '3.3': 'Climate-risk and resilience standards',
  '3.4': 'Disclosure, due diligence and financial regulation',
  '3.5': 'Liability and risk internalisation',
  '4.1': 'EU, national and subnational policy coordination',
  '4.2': 'Cross-border infrastructure and network planning',
  '4.3': 'Management of cascading and transboundary risks',
  '4.4': 'Preparedness, contingency planning and emergency coordination',
  '5.1': 'EU climate-investment needs and gaps',
  '5.2': 'EU budget and public expenditure',
  '5.3': 'Mobilisation of private finance',
  '5.4': 'Insurance, guarantees and risk-sharing',
  '6.1': 'Implementation of EU legislation and programmes',
  '6.2': 'Consistency of legislation, delegated acts, state aid and public investment',
  '6.3': 'Mainstreaming mitigation and adaptation across EU policies',
  '6.4': 'Direct provision of programmes and common services',
  '7.1': 'Research and evidence generation',
  '7.2': 'Climate scenarios and risk assessment',
  '7.3': 'Technology and practice innovation',
  '7.4': 'Demonstration, diffusion and learning',
  '7.5': 'Climate data, services and early warning',
  '8.1': 'Just resilience and unequal vulnerability',
  '8.2': 'Territorial and regional cohesion',
  '8.3': 'Acute disaster relief and civil protection',
  '8.4': 'Long-term distribution of costs, benefits and residual losses',
  '8.5': 'Insurance protection gaps and public risk-sharing',
  '9.1': 'International commitments and EU leadership',
  '9.2': 'International climate finance',
  '9.3': 'International and neighbouring-country coordination',
  '9.4': 'Trade-related regulation and carbon leakage (external dimension)',
};

/** The role a sub-role number belongs to ("3.1" → ROLES[2]). */
const roleOf = (sub: string): Role => ROLES[Number(sub.split('.')[0]) - 1];

interface RoleRule {
  sub: string;
  re: RegExp;
  /** Used only when no other rule of the same role matched the title. */
  fallback?: boolean;
}
const rule = (sub: string, ...alts: string[]): RoleRule => ({ sub, re: re(...alts) });
const fallback = (sub: string, ...alts: string[]): RoleRule => ({ ...rule(sub, ...alts), fallback: true });

// Title-only, one rule per sub-role (plus a few generic fallbacks). "target"
// is matched as a noun only, so the verb in "Target CCU/CCS at
// no-alternative uses" does not read as target-setting. Where the outline
// puts a topic under a specific sub-role (climate risk assessment under 7.2,
// carbon leakage under 9.4), the vocabulary follows the outline.
const ROLE_RULES: RoleRule[] = [
  // 1 Direction and goals
  rule('1.1', 'vision\\b', 'climate[- ]neutrality', 'long-term (?:objectives?|goals?)'),
  rule(
    '1.2',
    '(?:climate|emissions?|legally-binding|EU|20[345]0|adaptation|resilience|removal|separate|efficiency)\\s+(?:sub-)?targets?\\b',
    '(?:sub-)?targets\\b',
  ),
  rule('1.3', 'NECPs?\\b', 'national (?:contributions?|measures)', 'burden[- ]shar\\w*'),
  rule('1.4', 'common reference', 'reference scenarios?', 'planning reference'),
  // 2 Monitoring and enforcement
  rule('2.1', 'indicators?\\b', 'MRV', 'data quality', 'GHG accounting', 'accounting approach', 'measurement'),
  rule('2.2', 'monitor\\w*', 'progress\\b', 'visib\\w*'),
  rule('2.3', 'tracking', 'spending', 'expenditure', 'ex-post evaluation', 'do no significant harm'),
  rule('2.4', 'enforce\\w*', 'compliance (?:frameworks?|mechanisms?|obligations?|for)', 'access to justice'),
  rule('2.5', 'monitoring, evaluation and learning', 'MEL\\b'),
  // 3 Regulation and pricing
  rule(
    '3.1',
    'ETS\\d?\\b', 'emissions trading', 'carbon pric\\w*', 'GHG pricing', 'pric(?:e|ing)\\b', 'tax(?:ation|es)?\\b',
    'ETD\\b', 'free allocation', 'AgETS',
  ),
  rule(
    '3.2',
    '(?:emission|performance|CO2) standards?', 'minimum energy[- ]performance', 'EPBD', 'EPCs?\\b',
    'efficiency first', 'regulatory',
  ),
  rule('3.3', 'methodological standards', 'resilience[- ]by[- ]design', 'climate[- ]proof\\w*', 'mandat\\w* climate risk'),
  rule('3.4', 'disclosure', 'financial supervision', 'corporate reporting', 'taxonomy', 'Green Bond Standard', 'due diligence'),
  rule('3.5', 'liability', 'polluter[- ]pays', 'emitter responsibility'),
  // 4 Coordination and planning
  rule(
    '4.1', 'coordinat\\w*', 'multilevel', 'governance', 'long-term strateg\\w*', 'renovation strateg\\w*',
    'adaptation planning', 'planning across',
  ),
  rule(
    '4.2', 'cross-border', 'TYNDP', 'ENTSO\\w*', 'networks?\\b', 'grids?\\b', 'energy infrastructure',
    'CO2 (?:transport and storage )?infrastructure',
  ),
  rule('4.3', 'cascading', 'transboundary', 'compound\\w*'),
  rule('4.4', 'contingency', 'preparedness', 'crisis response', 'emergency', 'stress[- ]test\\w*'),
  // 5 Finance and investment
  rule('5.1', 'investment (?:gap|needs|outlook)', 'required versus actual'),
  rule(
    '5.2', 'MFF', 'budget', 'public (?:funding|expenditure|investment|finance)', 'subsid\\w*', 'common-debt',
    'fiscal', 'Innovation Fund', 'funds?\\b', 'funding', 'revenue', 'CAP payments', 'support schemes?',
  ),
  rule('5.3', 'private (?:finance|investment|capital)', 'mobilis\\w*', 'bonds?\\b'),
  rule('5.4', 'insurance', 'reinsurance', 'guarantees?', 'risk[- ]sharing'),
  fallback('5.1', 'invest\\w*', 'financ(?:e|ing)\\b'),
  // 6 Implementation
  rule('6.1', 'implement\\w*', 'CAP\\b', 'programmes?\\b', 'Renovation Wave', 'Technical Support Instrument'),
  rule('6.2', 'polic\\w* (?:fully )?consistent', 'policy consisten\\w*', 'state aid', 'delegated acts?', 'coherent (?:EU )?polic\\w*'),
  rule('6.3', 'mainstream\\w*', 'across (?:all )?(?:relevant )?(?:EU )?polic\\w*', 'in all (?:its |EU )?polic\\w*', 'resilience[- ]by[- ]design'),
  rule('6.4', 'Solidarity Fund', 'Civil Protection', 'common services', 'Copernicus'),
  // 7 Knowledge and innovation
  rule('7.1', 'research', 'R&D', 'evidence', 'scien\\w*', 'impact assessments?'),
  rule('7.2', 'climate(?:[- ]change)? (?:risks?|scenarios?|projections?)', 'risk assessments?', 'stress[- ]test\\w*', 'SSP\\d'),
  rule('7.3', 'innovation', 'technolog(?:y|ies)\\b(?!-specific)', 'value chains?'),
  rule('7.4', 'demonstration', 'diffusion', 'skills?\\b', 'training', 'awareness', 'learning'),
  rule('7.5', 'early warning', 'climate services', '(?:climate|buildings) data'),
  // 8 Solidarity and cohesion
  rule('8.1', 'just resilience', 'vulnerable', 'socio-economic vulnerabilit\\w*', 'fairness', 'at-risk', 'equitable'),
  rule('8.2', 'cohesion', 'just[- ]transition', 'territorial', 'regions most'),
  rule('8.3', 'Solidarity Fund', 'Civil Protection', 'crisis response', 'disasters?'),
  rule(
    '8.4', 'distribution\\w*', 'social[–-]climate', 'Social Climate Fund', 'income support', 'households?',
    'affordab\\w*', 'consumers?',
  ),
  rule('8.5', 'protection gap', 'public risk-sharing'),
  // 9 International climate action
  rule('9.1', 'Paris Agreement', 'international (?:commitments?|action|cooperation|support)', 'leadership', 'fair share',
    'global (?:goal|stocktake|action|climate action|emissions)'),
  rule('9.2', 'international (?:climate )?finance'),
  rule('9.3', 'diplomacy', 'partnerships?\\b', 'third countr\\w*', 'neighbour\\w*', 'trade partners?'),
  rule('9.4', 'CBAM', 'carbon[- ]leakage', 'border adjust\\w*'),
];

/** Phrases removed before role matching (a smaller list than `VETOES`). */
const ROLE_VETOES: RegExp[] = [
  /\bbuilding (?:on|blocks?|up)\b/gi,
  /\bbuilding-blocks?\b/gi,
  /public-private partnerships?/gi,
  /\bcap\b/g, // lowercase: an ETS cap, not the Common Agricultural Policy
  /\b(?:GHG|carbon|greenhouse gas|emissions?)[- ]budgets?\b/gi, // not the EU budget
  /\bprice interventions?\b/gi, // crisis price caps, not carbon pricing
  /\bproject implementation\b/gi, // a project's delivery, not EU implementation
  /\bnon-ETS\b/gi, // the sectors outside the ETS, not carbon pricing
];

/**
 * Reports whose whole scope places every recommendation in a sub-role: the
 * four energy-infrastructure advices all concern TEN-E network planning.
 */
const TENE_NOTE = 'TEN-E network-planning advice';
const REPORT_ROLE_HITS: Record<string, RoleHit[]> = {
  'acer-energy-infrastructure-2022': [{ sub: '4.2', evidence: TENE_NOTE, reportRule: true }],
  'scenario-guidelines-2022': [{ sub: '4.2', evidence: TENE_NOTE, reportRule: true }],
  'decarbonised-energy-infrastructure-2023': [{ sub: '4.2', evidence: TENE_NOTE, reportRule: true }],
  'ten-e-draft-scenarios-2024': [{ sub: '4.2', evidence: TENE_NOTE, reportRule: true }],
};

/** Every role rule that fires on the title, plus whole-report rules. */
export function roleHits(input: ClassifyInput): Partial<Record<Role, RoleHit[]>> {
  const title = ROLE_VETOES.reduce((t, v) => t.replace(v, ' '), input.title);
  const out: Partial<Record<Role, RoleHit[]>> = {};
  const add = (h: RoleHit) => {
    const role = roleOf(h.sub);
    const list = (out[role] ??= []);
    if (!list.some(x => x.sub === h.sub)) list.push(h);
  };
  for (const r of ROLE_RULES.filter(r => !r.fallback)) {
    const m = r.re.exec(title);
    if (m) add({ sub: r.sub, evidence: m[0] });
  }
  for (const r of ROLE_RULES.filter(r => r.fallback)) {
    if (out[roleOf(r.sub)]) continue;
    const m = r.re.exec(title);
    if (m) add({ sub: r.sub, evidence: m[0] });
  }
  for (const h of REPORT_ROLE_HITS[input.reportId ?? ''] ?? []) add(h);
  for (const list of Object.values(out)) list?.sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }));
  return out;
}

export function classifyRoles(input: ClassifyInput): Role[] {
  const hits = roleHits(input);
  return ROLES.filter(r => hits[r]);
}

export function classify(input: ClassifyInput): Classification {
  const hits = roleHits(input);
  return {
    focus: classifyFocus(input),
    sectors: classifySectors(input),
    roles: ROLES.filter(r => hits[r]),
    roleHits: hits,
  };
}

/**
 * Union of several classifications: every sector and role found in any of
 * them, and "both" when mitigation and adaptation are each found somewhere.
 * Used for a headline recommendation together with its sub-recommendations;
 * `sources[i]` labels where classification `i` came from (e.g. "Sub-rec 2"),
 * and is carried into the role hits.
 */
export function mergeClassifications(cs: Classification[], sources: (string | undefined)[] = []): Classification {
  const foci = new Set(cs.map(c => c.focus).filter((f): f is Focus => f !== null));
  const mit = foci.has('mitigation') || foci.has('both');
  const ada = foci.has('adaptation') || foci.has('both');
  const sectors = new Set(cs.flatMap(c => c.sectors));
  const roleHits: Partial<Record<Role, RoleHit[]>> = {};
  cs.forEach((c, i) => {
    for (const role of ROLES) {
      for (const h of c.roleHits[role] ?? []) {
        const list = (roleHits[role] ??= []);
        // Each sub-role is listed once: from the whole-report rule, else from
        // the first row (headline, then sub-recommendations) that hits it.
        if (list.some(x => x.sub === h.sub)) continue;
        list.push(h.reportRule ? h : { ...h, source: sources[i] });
      }
    }
  });
  for (const list of Object.values(roleHits)) list?.sort((a, b) => a.sub.localeCompare(b.sub, 'en', { numeric: true }));
  return {
    focus: mit && ada ? 'both' : mit ? 'mitigation' : ada ? 'adaptation' : null,
    sectors: SECTORS.filter(s => sectors.has(s)),
    roles: ROLES.filter(r => roleHits[r]),
    roleHits,
  };
}

/**
 * A short reason for one role cell: the first hit in full, e.g.
 * `"ETS" → 3.1 Carbon pricing and emissions markets` (for a merged headline
 * `Sub-rec 2: "MFF" → 5.2 …`), then any other sub-roles by number only
 * ("also 3.2, 3.4") so cells stay short.
 */
export function roleReason(hits: RoleHit[] | undefined): string {
  if (!hits || hits.length === 0) return '';
  const [h, ...rest] = hits;
  const where = h.source && h.source !== 'Headline' ? `${h.source}: ` : '';
  const what = h.reportRule ? h.evidence : `“${h.evidence}”`;
  const also = rest.length > 0 ? `; also ${rest.map(x => x.sub).join(', ')}` : '';
  return `${where}${what} → ${h.sub} ${SUB_ROLES[h.sub]}${also}`;
}

/* -------------------------------------------- matrix sector column */
/**
 * Sectors of the January 2024 report's sector chapters (4–9), with LULUCF
 * broadened to cover permanent removals, for the role matrix's text column.
 */
const MATRIX_SECTOR: Partial<Record<Sector, string>> = {
  'Energy supply': 'Energy supply',
  Industry: 'Industry',
  Transport: 'Transport',
  Buildings: 'Buildings',
  Agriculture: 'Agriculture',
  'LULUCF & CDR': 'LULUCF and permanent removals',
};

/** One sector name when exactly one applies, otherwise "Cross-cutting". */
export function matrixSector(sectors: Sector[]): string {
  const names = [...new Set(sectors.map(s => MATRIX_SECTOR[s]).filter((n): n is string => !!n))];
  return names.length === 1 ? names[0] : 'Cross-cutting';
}
