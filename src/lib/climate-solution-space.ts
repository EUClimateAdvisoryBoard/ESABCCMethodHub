/**
 * Climate solution space — gap analysis between EU-level and member-state
 * climate policy for the National Level Climate Policies beta module.
 *
 * `SOLUTION_AREAS` spans the climate solution space well beyond what
 * current legislation covers (drawing on the IPCC AR6 mitigation/adaptation
 * option space), precisely so that areas where *nobody* legislates become
 * visible. Each area carries keyword patterns; an instrument "covers" an
 * area when its title / summary / tags match any pattern.
 *
 * Honesty notes, surfaced in the UI:
 *   - "EU silent" means *no tracked EU instrument matches*, computed over
 *     the MethodHub Policy Navigator set plus the supplement in
 *     `eu-climate-policies.ts` — it is a screening result, not a legal
 *     conclusion.
 *   - Member-state coverage is keyword screening of the climate-laws.org
 *     catalogue; a country may act through instruments the catalogue does
 *     not document.
 *   - Some areas sit largely outside EU competence (health systems,
 *     education, taxation requires unanimity…) — flagged per area so a gap
 *     is not automatically read as an EU failure.
 *
 * Keep this file free of server-only imports — it is bundled into the client.
 */

import type { ClimatePolicy } from './climate-laws-types';

export interface SolutionArea {
  id: string;
  label: string;
  group: string;
  description: string;
  /** Case-insensitive regex sources matched against an instrument's text. */
  patterns: string[];
  /** Why an EU gap may be structural rather than negligent. */
  competenceNote?: string;
}

export const SOLUTION_GROUPS = [
  'Energy supply',
  'Buildings & demand',
  'Transport',
  'Industry & materials',
  'Agriculture, food & land',
  'Adaptation & resilience',
  'Cross-cutting & governance',
  'Frontier topics',
] as const;

export const SOLUTION_AREAS: SolutionArea[] = [
  // ── Energy supply ────────────────────────────────────────────────────
  {
    id: 'renewables', label: 'Renewable electricity', group: 'Energy supply',
    description: 'Deployment of solar, wind and other renewable generation.',
    patterns: ['renewable', 'solar', 'wind (?:power|energy|farm|turbine)', 'photovoltaic'],
  },
  {
    id: 'nuclear', label: 'Nuclear energy', group: 'Energy supply',
    description: 'Nuclear new-build, lifetime extension or phase-out decisions.',
    patterns: ['nuclear'],
    competenceNote: 'Energy-mix choices are a member-state prerogative (Art. 194(2) TFEU).',
  },
  {
    id: 'hydrogen', label: 'Hydrogen', group: 'Energy supply',
    description: 'Production, infrastructure and use of (renewable) hydrogen.',
    patterns: ['hydrogen'],
  },
  {
    id: 'grids-storage', label: 'Grids, storage & flexibility', group: 'Energy supply',
    description: 'Electricity networks, interconnection, storage and demand response.',
    patterns: ['\\bgrid', 'interconnect', 'energy storage', 'transmission network', 'electricity market', 'demand response'],
  },
  {
    id: 'ccs', label: 'Carbon capture & storage', group: 'Energy supply',
    description: 'CCS / CCU and geological storage of CO₂.',
    patterns: ['carbon capture', '\\bccs\\b', '\\bccus?\\b', 'geological storage', 'co2 storage'],
  },
  {
    id: 'fossil-phaseout', label: 'Fossil fuel phase-out & subsidies', group: 'Energy supply',
    description: 'Coal/oil/gas exit decisions and fossil-fuel subsidy reform.',
    patterns: ['coal phase', 'phase[- ]?out of coal', 'coal exit', 'fossil fuel subsid', 'exploration ban', 'extraction ban'],
  },

  // ── Buildings & demand ───────────────────────────────────────────────
  {
    id: 'efficiency', label: 'Energy efficiency', group: 'Buildings & demand',
    description: 'Economy-wide energy-efficiency obligations and savings targets.',
    patterns: ['energy efficien', 'energy saving'],
  },
  {
    id: 'renovation', label: 'Building renovation & performance', group: 'Buildings & demand',
    description: 'Renovation of the building stock and minimum energy performance.',
    patterns: ['renovat', 'energy performance of building', 'building stock', 'insulation', 'nearly zero[- ]energy'],
  },
  {
    id: 'heating', label: 'Clean heating & cooling', group: 'Buildings & demand',
    description: 'Heat pumps, district heating decarbonisation, boiler replacement.',
    patterns: ['heat pump', 'district heat', 'heating and cooling', 'geothermal', 'boiler'],
  },
  {
    id: 'sufficiency', label: 'Sufficiency & behaviour change', group: 'Buildings & demand',
    description: 'Demand reduction through behaviour, sufficiency and consumption limits.',
    patterns: ['sufficiency', 'behaviou?r(?:al)? change', 'demand reduction', 'energy sobriety'],
  },

  // ── Transport ────────────────────────────────────────────────────────
  {
    id: 'evs', label: 'Zero-emission vehicles & charging', group: 'Transport',
    description: 'EV purchase rules, CO₂ standards for vehicles and charging infrastructure.',
    patterns: ['electric vehicle', 'zero[- ]emission (?:vehicle|bus)', '\\bev\\b charging', '(?:re)?charging (?:point|station|infrastructure)', 'emission performance standards', 'co₂ emission targets', 'passenger cars', 'electromobility', 'e-mobility'],
  },
  {
    id: 'rail-modal', label: 'Rail & modal shift', group: 'Transport',
    description: 'Shifting passengers and freight to rail and public transport.',
    patterns: ['\\brail', 'public transport', 'modal shift', 'combined transport'],
  },
  {
    id: 'active-mobility', label: 'Active mobility', group: 'Transport',
    description: 'Cycling and walking infrastructure and incentives.',
    patterns: ['cycling', 'bicycle', 'walking', 'active mobility', 'pedestrian'],
    competenceNote: 'Urban mobility is largely a local / member-state competence.',
  },
  {
    id: 'aviation', label: 'Aviation', group: 'Transport',
    description: 'Aviation emissions: pricing, fuels, demand management.',
    patterns: ['aviation', 'aircraft', 'air transport', 'airport', 'kerosene'],
  },
  {
    id: 'shipping', label: 'Maritime & shipping', group: 'Transport',
    description: 'Shipping emissions, port infrastructure and marine fuels.',
    patterns: ['maritime', 'shipping', '\\bports?\\b', 'vessel', 'marine fuel'],
  },

  // ── Industry & materials ─────────────────────────────────────────────
  {
    id: 'industry-decarb', label: 'Industrial decarbonisation', group: 'Industry & materials',
    description: 'Decarbonising steel, cement, chemicals and other heavy industry.',
    patterns: ['\\bsteel', 'cement', 'chemical industry', 'industrial decarboni', 'industrial emissions', 'energy[- ]intensive industr'],
  },
  {
    id: 'circular', label: 'Circular economy & materials', group: 'Industry & materials',
    description: 'Recycling, reuse, material efficiency and product design.',
    patterns: ['circular', 'recycl', 're-?use', 'material efficiency', 'ecodesign', 'repair'],
  },
  {
    id: 'methane', label: 'Methane', group: 'Industry & materials',
    description: 'Methane leakage and emissions from energy, waste and agriculture.',
    patterns: ['methane'],
  },
  {
    id: 'f-gases', label: 'F-gases', group: 'Industry & materials',
    description: 'Fluorinated greenhouse gases (HFCs, SF₆) phase-down.',
    patterns: ['fluorinated', 'f-gas', '\\bhfcs?\\b', 'refrigerant'],
  },
  {
    id: 'cdr', label: 'Carbon dioxide removal', group: 'Industry & materials',
    description: 'Engineered and land-based removals: DACCS, BECCS, biochar, carbon farming.',
    patterns: ['carbon removal', 'carbon dioxide removal', 'direct air capture', 'biochar', 'negative emission', 'carbon farming'],
  },
  {
    id: 'embodied-carbon', label: 'Embodied carbon in construction', group: 'Industry & materials',
    description: 'Whole-life / embodied carbon of buildings and construction products.',
    patterns: ['embodied carbon', 'whole[- ]life carbon', 'construction product', 'life[- ]cycle (?:carbon|emissions|gwp)'],
  },

  // ── Agriculture, food & land ─────────────────────────────────────────
  {
    id: 'livestock', label: 'Livestock emissions', group: 'Agriculture, food & land',
    description: 'Enteric fermentation, manure management and herd policy.',
    patterns: ['livestock', 'cattle', 'manure', 'enteric', 'dairy herd'],
    competenceNote: 'Politically sensitive; mostly addressed indirectly via the CAP.',
  },
  {
    id: 'diets-foodwaste', label: 'Diets & food waste', group: 'Agriculture, food & land',
    description: 'Demand-side food policy: dietary shift, food waste reduction.',
    patterns: ['food waste', 'food loss', 'dietary', 'diet shift', 'plant[- ]based', 'sustainable diet'],
  },
  {
    id: 'soils-peat', label: 'Soils & peatlands', group: 'Agriculture, food & land',
    description: 'Soil carbon, peatland rewetting and wetland protection.',
    patterns: ['\\bsoils?\\b', 'peat', 'wetland', 'rewetting'],
  },
  {
    id: 'forests', label: 'Forests & deforestation', group: 'Agriculture, food & land',
    description: 'Forest management, afforestation and imported deforestation.',
    patterns: ['forest', 'afforestation', 'reforestation', 'deforestation', 'timber'],
  },

  // ── Adaptation & resilience ──────────────────────────────────────────
  {
    id: 'water-security', label: 'Water security & drought', group: 'Adaptation & resilience',
    description: 'Drought management, water scarcity and irrigation efficiency.',
    patterns: ['drought', 'water scarcity', 'water resources? management', 'irrigation', 'water reuse'],
  },
  {
    id: 'floods-coasts', label: 'Floods & coastal protection', group: 'Adaptation & resilience',
    description: 'Flood risk management and coastal / sea-level-rise defence.',
    patterns: ['flood', 'coastal (?:protection|defence|zone|management)', 'sea[- ]level'],
  },
  {
    id: 'health-heat', label: 'Climate & health', group: 'Adaptation & resilience',
    description: 'Heatwave plans, vector-borne disease, health-system resilience.',
    patterns: ['heat[- ]?wave', 'heat stress', 'health'],
    competenceNote: 'Health systems are a member-state competence (Art. 168 TFEU).',
  },
  {
    id: 'disaster-risk', label: 'Disaster risk & early warning', group: 'Adaptation & resilience',
    description: 'Civil protection, emergency preparedness and early-warning systems.',
    patterns: ['civil protection', 'disaster', 'early warning', 'emergency (?:preparedness|management|response)'],
  },
  {
    id: 'risk-finance', label: 'Climate risk insurance', group: 'Adaptation & resilience',
    description: 'Insurance against climate damages and closing the protection gap.',
    patterns: ['insurance', 'reinsurance', 'risk transfer', 'protection gap'],
  },

  // ── Cross-cutting & governance ───────────────────────────────────────
  {
    id: 'carbon-pricing', label: 'Carbon pricing', group: 'Cross-cutting & governance',
    description: 'Emissions trading, carbon taxes and border adjustment.',
    patterns: ['emissions? trading', 'carbon (?:tax|price|pricing|levy)', 'cap[- ]and[- ]trade', '\\bets\\b', 'border adjustment'],
  },
  {
    id: 'green-finance', label: 'Sustainable finance', group: 'Cross-cutting & governance',
    description: 'Taxonomy, green bonds, climate disclosure and green budgeting.',
    patterns: ['taxonomy', 'green bond', 'sustainable finance', 'climate.{0,20}disclosure', 'green budget'],
  },
  {
    id: 'just-transition', label: 'Just transition & skills', group: 'Cross-cutting & governance',
    description: 'Support for workers and regions, reskilling, energy poverty.',
    patterns: ['just transition', 'retraining', 're-?skilling', 'energy poverty', 'coal region', 'social climate'],
  },
  {
    id: 'rd-innovation', label: 'R&D and innovation', group: 'Cross-cutting & governance',
    description: 'Public funding for climate research, demonstration and deployment.',
    patterns: ['research', 'innovation', 'demonstration project', '\\br&d\\b'],
  },
  {
    id: 'education', label: 'Climate education', group: 'Cross-cutting & governance',
    description: 'Climate literacy in curricula and public awareness programmes.',
    patterns: ['education', 'curriculum', 'climate literacy', 'awareness[- ]raising'],
    competenceNote: 'Education is a member-state competence (Art. 165 TFEU).',
  },
  {
    id: 'participation', label: 'Citizen participation', group: 'Cross-cutting & governance',
    description: 'Citizens’ assemblies, participation rights, local climate democracy.',
    patterns: ['citizen', 'participation', 'assembl', 'public consultation'],
  },

  // ── Frontier topics ──────────────────────────────────────────────────
  {
    id: 'consumption-accounting', label: 'Consumption-based emissions', group: 'Frontier topics',
    description: 'Footprint targets and accounting for imported (Scope-3) emissions.',
    patterns: ['consumption[- ]based', 'carbon footprint', 'imported emissions', 'embedded emissions'],
  },
  {
    id: 'climate-migration', label: 'Climate-induced displacement', group: 'Frontier topics',
    description: 'Managed retreat, relocation and climate migration governance.',
    patterns: ['displacement', 'climate (?:migration|migrant)', 'managed retreat', 'relocation', 'resettlement'],
  },
  {
    id: 'military', label: 'Military & defence emissions', group: 'Frontier topics',
    description: 'Reporting and reducing armed-forces emissions (exempt from UNFCCC totals).',
    patterns: ['military', 'defence forces', 'armed forces'],
    competenceNote: 'Defence is a member-state competence; emissions reporting is voluntary.',
  },
  {
    id: 'srm', label: 'Solar radiation modification', group: 'Frontier topics',
    description: 'Governance of SRM / geoengineering research and deployment.',
    patterns: ['solar radiation', 'geoengineering', 'stratospheric aerosol', '\\bsrm\\b'],
  },
];

// ───────────────────────────────────────────────────────────────────────────
// Matching & gap computation
// ───────────────────────────────────────────────────────────────────────────

export type AreaStatus = 'blind-spot' | 'eu-silent' | 'ms-sparse' | 'covered';

export const AREA_STATUS_LABELS: Record<AreaStatus, string> = {
  'blind-spot': 'Shared blind spot',
  'eu-silent': 'EU silent',
  'ms-sparse': 'Few member states',
  'covered': 'Covered',
};

export interface AreaCoverage {
  area: SolutionArea;
  euMatches: ClimatePolicy[];
  /** ISO-2 codes of member states with ≥1 matching instrument. */
  msCodes: string[];
  msInstrumentCount: number;
  status: AreaStatus;
}

/** Member states acting in fewer than this many countries counts as sparse. */
const SPARSE_MS_THRESHOLD = 9; // a third of the EU-27

function haystack(p: ClimatePolicy): string {
  return [p.title, p.summary, p.keywords.join(' '), p.sectors.join(' '), p.instruments.join(' ')]
    .join(' ')
    .toLowerCase();
}

export function computeSolutionSpace(
  msPolicies: ClimatePolicy[],
  euPolicies: ClimatePolicy[],
): AreaCoverage[] {
  const ms = msPolicies.map(p => ({ p, text: haystack(p) }));
  const eu = euPolicies.map(p => ({ p, text: haystack(p) }));

  return SOLUTION_AREAS.map(area => {
    const regexes = area.patterns.map(s => new RegExp(s, 'i'));
    const matches = (text: string) => regexes.some(r => r.test(text));

    const euMatches = eu.filter(e => matches(e.text)).map(e => e.p);
    const msMatches = ms.filter(e => matches(e.text)).map(e => e.p);
    const msCodes = Array.from(new Set(msMatches.map(p => p.countryCode))).sort();

    const euSilent = euMatches.length === 0;
    const msSparse = msCodes.length < SPARSE_MS_THRESHOLD;
    const status: AreaStatus =
      euSilent && msSparse ? 'blind-spot'
      : euSilent ? 'eu-silent'
      : msSparse ? 'ms-sparse'
      : 'covered';

    return { area, euMatches, msCodes, msInstrumentCount: msMatches.length, status };
  });
}

export interface SolutionSpaceSummary {
  areas: number;
  euSilent: number;
  blindSpots: number;
  msSparse: number;
  covered: number;
}

export function summarizeSolutionSpace(coverage: AreaCoverage[]): SolutionSpaceSummary {
  return {
    areas: coverage.length,
    euSilent: coverage.filter(c => c.status === 'eu-silent' || c.status === 'blind-spot').length,
    blindSpots: coverage.filter(c => c.status === 'blind-spot').length,
    msSparse: coverage.filter(c => c.status === 'ms-sparse').length,
    covered: coverage.filter(c => c.status === 'covered').length,
  };
}
