/**
 * EU-level climate policy layer for the National Level Climate Policies
 * beta module.
 *
 * The member-state catalogue comes from climate-laws.org; this file adds
 * the European Union itself as a 28th "geography" so EU instruments sit in
 * the same picture and the solution-space gap analysis can compare the two
 * levels of government.
 *
 * Two sources, both in-repo:
 *   1. `src/data/sectoral-policies.ts` — the 40 EU instruments tracked by
 *      the M·04 Policy Navigator (CELEX-linked, sector-tagged), adapted to
 *      the ClimatePolicy shape.
 *   2. A small curated supplement below covering well-known EU instruments
 *      outside the Policy Navigator's mitigation focus (adaptation, water,
 *      disaster risk, carbon removal, F-gases, research funding) so areas
 *      the EU demonstrably regulates are not falsely reported as silent.
 *
 * Keep this file free of server-only imports — it is bundled into the
 * client page.
 */

import { SECTOR_POLICIES, getEurLexUrl, SectorId } from '@/data/sectoral-policies';
import type { ClimatePolicy } from './climate-laws-types';

export const EU_GEOGRAPHY_CODE = 'EU';
export const EU_GEOGRAPHY_NAME = 'European Union';

// SectorId → the CCLW sector vocabulary used by the member-state catalogue,
// so the sector filter and charts treat both levels uniformly.
const SECTOR_TO_CCLW: Record<SectorId, string[]> = {
  'power': ['Energy'],
  'industry': ['Industry'],
  'buildings': ['Buildings'],
  'transport-road': ['Transportation'],
  'transport-maritime': ['Transportation'],
  'transport-aviation': ['Transportation'],
  'agriculture': ['Agriculture'],
  'lulucf': ['LULUCF'],
  'waste': ['Waste'],
  'cross-cutting': ['Economy-wide'],
};

// Finer-grained tags kept as keywords so the solution-space matcher can
// distinguish e.g. maritime from road transport.
const SECTOR_KEYWORD: Partial<Record<SectorId, string>> = {
  'transport-road': 'Road transport',
  'transport-maritime': 'Maritime / shipping',
  'transport-aviation': 'Aviation',
};

// Aspects of an instrument that its short Policy Navigator summary omits but
// that matter for the solution-space screening. Each annotation is a real,
// verifiable provision of the act (cited next to the keyword).
const EXTRA_KEYWORDS: Record<string, string[]> = {
  // EPBD recast (EU/2024/1275): Art. 7(2) whole-life-cycle GWP for new
  // buildings from 2028/2030; Art. 17(15) ends fossil-fuel boiler subsidies
  // from 2025 with a 2040 phase-out trajectory.
  'epbd': ['fossil fuel boiler phase-out', 'heating', 'whole-life carbon'],
  // RED III (EU/2023/2413): Art. 23 binding annual increase for renewable
  // heating and cooling; Art. 24 district heating provisions.
  'red-iii': ['renewable heating and cooling', 'district heating'],
  // Farm to Fork (COM(2020) 381): commits to halving per-capita food waste
  // by 2030 and to enabling sustainable diets via labelling and procurement.
  'farm-to-fork': ['food waste', 'sustainable diets'],
};

const INSTRUMENT_LABEL: Record<string, string> = {
  'cap-and-trade': 'Emissions trading',
  'regulation': 'Regulatory instrument',
  'standard': 'Standards and obligations',
  'target': 'Targets and planning',
  'fund': 'Public investment / fund',
  'directive': 'Regulatory instrument',
  'tax': 'Taxes and charges',
  'disclosure': 'Disclosure and reporting',
};

/**
 * EU legal acts (regulations 3…R, directives 3…L, decisions 3…D) are passed
 * by the co-legislators — the EU's equivalent of "Law" in the CCLW
 * Legislative/Executive split. Communications and strategies (5…DC) are
 * executive instruments of the Commission.
 */
function categoryFromCelex(celex: string | undefined): 'Law' | 'Policy' {
  return celex && /^3\d{4}[RLD]/.test(celex) ? 'Law' : 'Policy';
}

/** Latest 4-digit year in a free-text adoption note ("core files adopted 2023-2024"). */
function latestYear(...texts: (string | undefined)[]): number | null {
  const years = texts
    .flatMap(t => String(t ?? '').match(/(?:19|20)\d{2}/g) ?? [])
    .map(Number);
  return years.length ? Math.max(...years) : null;
}

function fromSectorPolicies(): ClimatePolicy[] {
  return SECTOR_POLICIES.map(p => {
    const year = latestYear(p.adopted, p.inForce);
    const url = getEurLexUrl(p) ?? p.sourceUrl;
    return {
      id: `eu-${p.id}`,
      countryCode: EU_GEOGRAPHY_CODE,
      countryName: EU_GEOGRAPHY_NAME,
      title: p.name,
      summary: p.meaning,
      category: categoryFromCelex(p.ceLexId),
      type: p.instrumentType,
      date: year ? `${year}-01-01` : '',
      year,
      sectors: Array.from(new Set(p.sectors.flatMap(s => SECTOR_TO_CCLW[s]))).sort(),
      instruments: [INSTRUMENT_LABEL[p.instrumentType] ?? p.instrumentType],
      frameworks: p.id === 'climate-law' ? ['Mitigation'] : [],
      responses: ['Mitigation'],
      keywords: [
        ...(p.acronym ? [p.acronym] : []),
        ...p.sectors.map(s => SECTOR_KEYWORD[s]).filter((k): k is string => !!k),
        ...(EXTRA_KEYWORDS[p.id] ?? []),
      ],
      hazards: [],
      language: 'English',
      documentUrl: url,
      climateLawsUrl: url,
    };
  });
}

/**
 * Supplement: EU instruments outside the Policy Navigator's Fit-for-55
 * focus. Hand-verified CELEX references; summaries deliberately short.
 */
function supplement(): ClimatePolicy[] {
  const mk = (
    id: string,
    title: string,
    year: number,
    category: 'Law' | 'Policy',
    summary: string,
    url: string,
    opts: Partial<ClimatePolicy> = {},
  ): ClimatePolicy => ({
    id: `eu-${id}`,
    countryCode: EU_GEOGRAPHY_CODE,
    countryName: EU_GEOGRAPHY_NAME,
    title,
    summary,
    category,
    type: category === 'Law' ? 'Legal act' : 'Strategy',
    date: `${year}-01-01`,
    year,
    sectors: [],
    instruments: [],
    frameworks: [],
    responses: ['Mitigation'],
    keywords: [],
    hazards: [],
    language: 'English',
    documentUrl: url,
    climateLawsUrl: url,
    ...opts,
  });

  return [
    mk(
      'adaptation-strategy',
      'EU Strategy on Adaptation to Climate Change',
      2021,
      'Policy',
      'Forging a climate-resilient Europe: smarter, faster and more systemic adaptation, with international action. Anchored in Article 5 of the European Climate Law.',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52021DC0082',
      { responses: ['Adaptation'], frameworks: ['Adaptation'], sectors: ['Economy-wide'] },
    ),
    mk(
      'floods-directive',
      'Floods Directive (2007/60/EC)',
      2007,
      'Law',
      'Requires member states to assess and map flood risk and to draw up flood risk management plans for all river basins and coastal areas.',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32007L0060',
      { responses: ['Adaptation', 'Disaster Risk Management'], sectors: ['Water'], hazards: ['Flood'] },
    ),
    mk(
      'water-framework-directive',
      'Water Framework Directive (2000/60/EC)',
      2000,
      'Law',
      'Framework for the protection of inland surface waters, groundwater and coastal waters; river basin management planning underpins drought and water-scarcity responses.',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32000L0060',
      { responses: ['Adaptation'], sectors: ['Water'], hazards: ['Drought'] },
    ),
    mk(
      'civil-protection-mechanism',
      'Union Civil Protection Mechanism / rescEU (Decision 1313/2013/EU)',
      2013,
      'Law',
      'EU-level disaster preparedness and response pooling, including the rescEU reserve (firefighting aircraft, medical stockpiles) strengthened in 2021.',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32013D1313',
      { responses: ['Disaster Risk Management'], hazards: ['Wildfire', 'Flood'] },
    ),
    mk(
      'solidarity-fund',
      'EU Solidarity Fund (Council Regulation (EC) 2012/2002)',
      2002,
      'Law',
      'Financial assistance to member states hit by major natural disasters; extended in 2020 to public-health emergencies.',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32002R2012',
      { responses: ['Loss And Damage', 'Disaster Risk Management'] },
    ),
    mk(
      'f-gas-regulation',
      'F-gas Regulation (EU) 2024/573',
      2024,
      'Law',
      'Phases down hydrofluorocarbons to near-zero by 2050 and bans fluorinated gases in most new equipment categories.',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R0573',
      { sectors: ['Industry'], keywords: ['F-gases', 'HFC phase-down'] },
    ),
    mk(
      'carbon-removal-certification',
      'Carbon Removals and Carbon Farming Certification Regulation (EU) 2024/3012',
      2024,
      'Law',
      'First EU-wide certification framework for permanent carbon removals, carbon farming and carbon storage in products.',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R3012',
      { sectors: ['LULUCF'], keywords: ['Carbon removal', 'Carbon farming'] },
    ),
    mk(
      'energy-taxation-directive',
      'Energy Taxation Directive (2003/96/EC)',
      2003,
      'Law',
      'Minimum excise rates for energy products and electricity; the 2021 recast proposal aligning rates with energy content and climate performance remains in negotiation.',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32003L0096',
      { sectors: ['Energy'], instruments: ['Taxes and charges'] },
    ),
    mk(
      'horizon-europe',
      'Horizon Europe (Regulation (EU) 2021/695)',
      2021,
      'Law',
      'The EU research and innovation framework programme, with a 35% climate-expenditure mainstreaming target and dedicated missions on adaptation and climate-neutral cities.',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R0695',
      { keywords: ['Research and innovation'], instruments: ['Public investment / fund'] },
    ),
    mk(
      'ten-t',
      'TEN-T Regulation (EU) 2024/1679',
      2024,
      'Law',
      'Union guidelines for the trans-European transport network: completion of the rail core network, freight modal shift, 431 urban nodes required to adopt sustainable urban mobility plans.',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1679',
      { sectors: ['Transportation'], keywords: ['Rail', 'Modal shift', 'Urban mobility'] },
    ),
    mk(
      'climate-pact',
      'European Climate Pact',
      2020,
      'Policy',
      'Commission initiative inviting citizens, communities and organisations to participate in climate action through pledges, ambassadors and dialogue.',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52020DC0788',
      { keywords: ['Citizen participation', 'Public engagement'] },
    ),
    mk(
      'construction-products-regulation',
      'Construction Products Regulation (EU) 2024/3110',
      2024,
      'Law',
      'Recast CPR requiring environmental sustainability declarations for construction products, including life-cycle global warming potential (embodied carbon).',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R3110',
      { sectors: ['Buildings', 'Industry'], keywords: ['Embodied carbon', 'Whole-life carbon'] },
    ),
    mk(
      'csrd',
      'Corporate Sustainability Reporting Directive (EU) 2022/2464',
      2022,
      'Law',
      'Requires large and listed companies to report climate and sustainability information under the European Sustainability Reporting Standards.',
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2464',
      { instruments: ['Disclosure and reporting'], keywords: ['Sustainable finance'] },
    ),
  ];
}

let cache: ClimatePolicy[] | null = null;

/** The EU-level instrument catalogue (Policy Navigator set + supplement). */
export function euLevelPolicies(): ClimatePolicy[] {
  if (!cache) {
    cache = [...fromSectorPolicies(), ...supplement()].sort(
      (a, b) => (a.date || '0000').localeCompare(b.date || '0000') || a.title.localeCompare(b.title),
    );
  }
  return cache;
}
