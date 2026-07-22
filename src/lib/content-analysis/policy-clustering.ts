// ---------------------------------------------------------------------------
// Policy clustering — the first step of the policy coherence analysis.
// ---------------------------------------------------------------------------
// Before the coherence analysis proper (see `policy-coherence.ts`) can look
// for gaps, overlaps and conflicts, every EU policy or measure relevant to a
// system needs to be sorted into a structured inventory. This module holds
// that inventory: for each system (energy supply, buildings, agri-food, and
// others to follow), every instrument is classified by the type of governing
// resource it uses — information, law, money, or institutional capacity —
// and tagged for whether it serves mitigation, adaptation, or both.
//
// The four-category framework (originally "NATO": Nodality, Authority,
// Treasure, Organization) is Daniel Henstra's policy-instruments typology:
//   Henstra, D. (2015). The tools of climate adaptation policy: analysing
//   instruments and instrument selection. Climate Policy.
//   doi:10.1080/14693062.2015.1015946
//
// A second, orthogonal dimension sits alongside the category: hierarchy.
// Each system also carries a small set of cross-cutting "framework" acts
// (the European Climate Law, the Green Deal, Fit for 55, and — for
// agri-food — the CAP Strategic Plans Regulation) that set the pathway and
// top-level targets; every item below is either a `sector`-tier policy that
// turns a framework's targets into binding sector obligations, or an
// `instrument`-tier measure that funds, guides, or institutionally supports
// delivery of a sector (or, occasionally, a framework) act directly. The
// `parents` on each item encode that cascade so a "Policy hierarchy" view
// can render it as a tree/DAG, reusing the exact same category colours.
//
// This is a draft working tool — instrument lists and hierarchy links are a
// first pass and should be checked against current legislation before use
// in the final coherence analysis.

/** The four Henstra/NATO instrument categories. */
export type ClusterCategory = 'nodality' | 'authority' | 'treasure' | 'organization';

export const CLUSTER_CATEGORY_IDS: ClusterCategory[] = [
  'nodality',
  'authority',
  'treasure',
  'organization',
];

export const CLUSTER_CATEGORY_LABEL: Record<ClusterCategory, string> = {
  nodality: 'Information/persuasion',
  authority: 'Coercive/legal',
  treasure: 'Financial/economic',
  organization: 'Institutional/governance',
};

export const CLUSTER_CATEGORY_SUBTITLE: Record<ClusterCategory, string> = {
  nodality: 'Nodality',
  authority: 'Authority',
  treasure: 'Treasure',
  organization: 'Organization',
};

export const CLUSTER_CATEGORY_BODY: Record<ClusterCategory, string> = {
  nodality:
    'Use of information dissemination, knowledge generation, and persuasion to inform or motivate action. Assumes targets are willing but lack knowledge — relies on voluntary response.',
  authority:
    'Use of the legitimate power of the state to permit, prohibit, or command action. Assumes targets comply out of respect for legitimacy or fear of penalties — binding and universal.',
  treasure:
    'Use of public funds — spending, grants, subsidies, tax measures, procurement — to produce public goods directly, or to incentivise or disincentivise behaviour financially.',
  organization:
    "Use of government's own institutional resources, personnel and operations — internal mandates, demonstration, procurement practice — to deliver objectives directly rather than through external targets.",
};

/** Colour tokens matching the app's existing hex palette (see
 *  DEFAULT_CODE_COLORS in ContentAnalysisModule / other content-analysis
 *  boards), reused so this lens reads as part of the same visual system. */
export const CLUSTER_CATEGORY_COLOR: Record<ClusterCategory, string> = {
  nodality: '#7C3AED',
  authority: '#B83230',
  treasure: '#00928F',
  organization: '#B87333',
};

/** Whether an instrument serves mitigation, adaptation, or both. */
export type ClusterRelevance = 'M' | 'A' | 'MA';

export const CLUSTER_RELEVANCE_LABEL: Record<ClusterRelevance, string> = {
  M: 'Mitigation',
  A: 'Adaptation',
  MA: 'Both',
};

/** Where an item sits in the overarching → sector → instrument cascade.
 *  Framework acts (see `ClusterFramework`) are the implicit tier above
 *  `sector` and are not part of this union — they carry no category and no
 *  parents of their own. */
export type ClusterTier = 'sector' | 'instrument';

export const CLUSTER_TIER_LABEL: Record<ClusterTier, string> = {
  sector: 'Sector-specific policy',
  instrument: 'Implementation instrument',
};

/** A cross-cutting, overarching act that sets the pathway and top-level
 *  targets a system's sector policies cascade from. Not itself categorised
 *  by instrument type — it sits a level above the Henstra/NATO typology. */
export interface ClusterFramework {
  id: string;
  name: string;
  /** Short descriptor shown under the name (e.g. the targets it sets). */
  sub: string;
  desc: string;
}

export interface ClusterItem {
  /** Stable id, referenced by other items' `parents` and by frameworks. */
  id: string;
  /** Instrument / measure name. */
  name: string;
  category: ClusterCategory;
  relevance: ClusterRelevance;
  desc: string;
  /** Hierarchy tier: does this item set a binding sector-level target
   *  itself, or does it implement/support one (or a framework) below it? */
  tier: ClusterTier;
  /** Ids of the framework(s) and/or sector items this one derives from or
   *  supports. Every non-framework item has at least one. */
  parents: string[];
}

export interface ClusterSystem {
  id: string;
  label: string;
  /** The system's overarching framework acts — the top of the cascade. */
  frameworks: ClusterFramework[];
  items: ClusterItem[];
}

const FW_CLIMATE_LAW: ClusterFramework = {
  id: 'fw-climate-law',
  name: 'European Climate Law',
  sub: '2030 −55% · 2040 · 2050 net-zero',
  desc: "Sets the binding EU-wide emissions targets every sector policy has to add up to, and the review mechanism that checks whether they still do.",
};
const FW_GREEN_DEAL: ClusterFramework = {
  id: 'fw-green-deal',
  name: 'European Green Deal',
  sub: 'Overarching strategy',
  desc: 'The growth strategy that sets direction — clean energy, resilience, just transition, a circular economy — for every sector package below it.',
};
const FW_FIT_FOR_55: ClusterFramework = {
  id: 'fw-fit-for-55',
  name: 'Fit for 55 package',
  sub: '2021 legislative package',
  desc: "Translated the Climate Law's 2030 target into the sector-specific directives and regulations below.",
};

export const CLUSTER_SYSTEMS: ClusterSystem[] = [
  {
    id: 'energy',
    label: 'Energy supply',
    frameworks: [FW_CLIMATE_LAW, FW_GREEN_DEAL, FW_FIT_FOR_55],
    items: [
      { id: 'necp-reporting-guidance', name: 'NECP reporting & guidance', category: 'nodality', relevance: 'M', tier: 'instrument', parents: ['governance-regulation'], desc: 'Member States report energy/climate trajectories; Commission assesses and issues country guidance.' },
      { id: 'copernicus-ccs', name: 'Copernicus Climate Change Service', category: 'nodality', relevance: 'A', tier: 'instrument', parents: ['fw-green-deal'], desc: 'EU satellite climate data and risk indicators, e.g. heat/drought impact on hydropower and cooling.' },
      { id: 'primes-potencia-modelling', name: 'PRIMES / POTEnCIA modelling', category: 'nodality', relevance: 'M', tier: 'instrument', parents: ['fw-fit-for-55'], desc: 'Commission scenario tools underpinning Fit for 55 and the 2040 target package.' },
      { id: 'esabcc-advisory-reports', name: 'ESABCC advisory reports', category: 'nodality', relevance: 'MA', tier: 'instrument', parents: ['fw-climate-law'], desc: 'Independent scientific advice on energy-sector emissions trajectories and climate risk.' },
      { id: 'climate-adapt-platform', name: 'Climate-ADAPT platform', category: 'nodality', relevance: 'A', tier: 'instrument', parents: ['fw-green-deal'], desc: 'Knowledge-sharing platform on climate risks to energy infrastructure, tools and case studies.' },
      { id: 'acer-entsoe-adequacy-reporting', name: 'ACER / ENTSO-E adequacy reporting', category: 'nodality', relevance: 'A', tier: 'instrument', parents: ['entsoe-network-codes', 'ten-e-regulation'], desc: 'Reporting on electricity resource adequacy including climate-related stress scenarios.' },
      { id: 'repowereu-communications', name: 'REPowerEU communications', category: 'nodality', relevance: 'M', tier: 'instrument', parents: ['fw-green-deal'], desc: 'Non-binding Commission framing documents shaping Member State action on energy security and renewables.' },
      { id: 'red-iii', name: 'Renewable Energy Directive (RED III)', category: 'authority', relevance: 'M', tier: 'sector', parents: ['fw-fit-for-55', 'fw-climate-law'], desc: 'Binding EU and national renewable energy targets, sub-targets and permitting rules.' },
      { id: 'eed', name: 'Energy Efficiency Directive (EED)', category: 'authority', relevance: 'M', tier: 'sector', parents: ['fw-fit-for-55', 'fw-climate-law'], desc: 'Binding annual consumption-reduction obligations, audits and management systems.' },
      { id: 'eu-ets-1-2', name: 'EU ETS 1 and 2', category: 'authority', relevance: 'M', tier: 'sector', parents: ['fw-fit-for-55', 'fw-climate-law'], desc: 'Cap-and-trade regulation on power, industry, buildings and transport emissions.' },
      { id: 'governance-regulation', name: 'Governance Regulation 2018/1999', category: 'authority', relevance: 'M', tier: 'sector', parents: ['fw-climate-law'], desc: 'Legal requirement for NECPs including energy supply decarbonisation pathways.' },
      { id: 'effort-sharing-regulation', name: 'Effort Sharing Regulation', category: 'authority', relevance: 'M', tier: 'sector', parents: ['fw-fit-for-55', 'fw-climate-law'], desc: 'Binding national emissions targets covering non-ETS energy use.' },
      { id: 'methane-regulation', name: 'Methane Regulation 2024/1787', category: 'authority', relevance: 'M', tier: 'sector', parents: ['fw-fit-for-55'], desc: 'Binding methane monitoring and reduction rules for oil, gas and coal.' },
      { id: 'ten-e-regulation', name: 'TEN-E Regulation', category: 'authority', relevance: 'MA', tier: 'sector', parents: ['fw-green-deal'], desc: 'Permitting framework for Projects of Common Interest, including grid resilience criteria.' },
      { id: 'critical-entities-resilience-directive', name: 'Critical Entities Resilience Directive', category: 'authority', relevance: 'A', tier: 'sector', parents: ['fw-green-deal'], desc: 'Mandates resilience planning for critical infrastructure operators against disruptions.' },
      { id: 'entsoe-network-codes', name: 'ENTSO-E network codes', category: 'authority', relevance: 'A', tier: 'sector', parents: ['fw-green-deal'], desc: 'Binding technical grid rules, increasingly with climate-resilience design standards.' },
      { id: 'state-aid-climate-energy-guidelines', name: 'State Aid Climate & Energy Guidelines', category: 'authority', relevance: 'M', tier: 'instrument', parents: ['red-iii', 'eed'], desc: 'Legal framework constraining Member State subsidies to energy in line with climate goals.' },
      { id: 'innovation-fund', name: 'Innovation Fund', category: 'treasure', relevance: 'M', tier: 'instrument', parents: ['red-iii', 'eed'], desc: 'ETS revenue-financed grants for low-carbon technology demonstration.' },
      { id: 'modernisation-fund', name: 'Modernisation Fund', category: 'treasure', relevance: 'M', tier: 'instrument', parents: ['eed'], desc: 'ETS revenue-financed support for energy system modernisation in lower-income states.' },
      { id: 'cef-energy', name: 'Connecting Europe Facility - Energy', category: 'treasure', relevance: 'MA', tier: 'instrument', parents: ['ten-e-regulation'], desc: 'Co-financing for cross-border energy infrastructure, including resilient grid upgrades.' },
      { id: 'just-transition-fund', name: 'Just Transition Fund', category: 'treasure', relevance: 'M', tier: 'instrument', parents: ['eu-ets-1-2'], desc: 'Support for regions and workers affected by energy-sector decarbonisation.' },
      { id: 'rrf-energy', name: 'Recovery and Resilience Facility', category: 'treasure', relevance: 'MA', tier: 'instrument', parents: ['fw-green-deal'], desc: 'Grants and loans conditional on energy transition and resilience reforms.' },
      { id: 'social-climate-fund', name: 'Social Climate Fund', category: 'treasure', relevance: 'M', tier: 'instrument', parents: ['eu-ets-1-2'], desc: 'ETS2 revenue redistributed to cushion energy costs, funding efficiency and renewables.' },
      { id: 'investeu-sustainable-infrastructure', name: 'InvestEU sustainable infrastructure', category: 'treasure', relevance: 'MA', tier: 'instrument', parents: ['fw-green-deal'], desc: 'EU guarantee mobilising private investment in clean and resilient energy infrastructure.' },
      { id: 'cohesion-policy-funds-energy', name: 'Cohesion Policy Funds', category: 'treasure', relevance: 'MA', tier: 'instrument', parents: ['fw-green-deal'], desc: 'Regional financing for renewables and, in some programmes, climate-proofing.' },
      { id: 'eib-energy-lending-policy', name: 'EIB energy lending policy', category: 'treasure', relevance: 'MA', tier: 'instrument', parents: ['fw-green-deal'], desc: 'Financing criteria excluding fossil fuels, prioritising renewables and grid resilience.' },
      { id: 'renewable-energy-financing-mechanism', name: 'Renewable Energy Financing Mechanism', category: 'treasure', relevance: 'M', tier: 'instrument', parents: ['red-iii'], desc: 'Cross-border pooled financing for renewable projects toward EU targets.' },
      { id: 'entsoe-entsog-coordination', name: 'ENTSO-E / ENTSOG coordination', category: 'organization', relevance: 'MA', tier: 'instrument', parents: ['entsoe-network-codes', 'ten-e-regulation'], desc: 'Ten-year network development planning including climate-resilience elements.' },
      { id: 'acer', name: 'ACER', category: 'organization', relevance: 'M', tier: 'instrument', parents: ['governance-regulation'], desc: 'EU body coordinating national regulators on cross-border energy market and infrastructure issues.' },
      { id: 'cinea', name: 'CINEA', category: 'organization', relevance: 'MA', tier: 'instrument', parents: ['ten-e-regulation', 'red-iii'], desc: 'Implements CEF-Energy and Innovation Fund on behalf of the Commission.' },
      { id: 'climate-mainstreamed-procurement-guidance', name: 'Climate-mainstreamed procurement guidance', category: 'organization', relevance: 'MA', tier: 'instrument', parents: ['fw-green-deal'], desc: 'Integration of mitigation and resilience criteria into EU-funded energy procurement.' },
      { id: 'electricity-gas-coordination-groups', name: 'Electricity & Gas Coordination Groups', category: 'organization', relevance: 'A', tier: 'instrument', parents: ['critical-entities-resilience-directive'], desc: 'Coordination on security-of-supply and crisis preparedness, including climate-driven disruptions.' },
      { id: 'eu-energy-platform', name: 'EU Energy Platform', category: 'organization', relevance: 'M', tier: 'instrument', parents: ['fw-green-deal'], desc: 'Joint gas and hydrogen purchasing mechanism to enhance supply security.' },
    ],
  },
  {
    id: 'buildings',
    label: 'Buildings',
    frameworks: [FW_CLIMATE_LAW, FW_GREEN_DEAL, FW_FIT_FOR_55],
    items: [
      { id: 'eu-building-stock-observatory', name: 'EU Building Stock Observatory', category: 'nodality', relevance: 'M', tier: 'instrument', parents: ['epbd-recast'], desc: 'EU database tracking building energy performance to inform renovation policy.' },
      { id: 'epc-framework', name: 'Energy Performance Certificates (EPC) framework', category: 'nodality', relevance: 'M', tier: 'instrument', parents: ['epbd-recast'], desc: 'Standardised performance labelling and national databases informing owners and buyers.' },
      { id: 'epbd-guidance-annexes', name: 'EPBD implementation guidance annexes (2025)', category: 'nodality', relevance: 'M', tier: 'instrument', parents: ['epbd-recast'], desc: 'Thirteen thematic annexes helping Member States transpose MEPS, renovation trajectories and financing rules.' },
      { id: 'one-stop-shop-guidance', name: 'One-stop-shop guidance (2026)', category: 'nodality', relevance: 'M', tier: 'instrument', parents: ['national-building-renovation-plans'], desc: 'Commission recommendation on setting up advisory hubs to guide households through renovation.' },
      { id: 'climate-adapt-buildings', name: 'Climate-ADAPT buildings sector platform', category: 'nodality', relevance: 'A', tier: 'instrument', parents: ['fw-green-deal'], desc: 'Knowledge base on overheating, flood and resilience risks to the building stock.' },
      { id: 'energy-efficiency-financing-reports', name: 'Energy efficiency financing reports & recommendations', category: 'nodality', relevance: 'M', tier: 'instrument', parents: ['eed'], desc: 'Commission reporting and guidance to unlock private lending for renovation (COM/2026/118 and related).' },
      { id: 'epbd-recast', name: 'Energy Performance of Buildings Directive (EPBD recast)', category: 'authority', relevance: 'MA', tier: 'sector', parents: ['fw-fit-for-55', 'fw-climate-law'], desc: 'Binding minimum energy performance standards, zero-emission building standards from 2028/2030, and requirement to consider climate resilience/overheating in renovation planning.' },
      { id: 'eu-ets2-buildings', name: 'EU ETS2 (buildings & road transport, from 2027)', category: 'authority', relevance: 'M', tier: 'sector', parents: ['fw-fit-for-55', 'fw-climate-law'], desc: 'Binding carbon pricing on heating fuels used in buildings.' },
      { id: 'eed', name: 'Energy Efficiency Directive (EED)', category: 'authority', relevance: 'M', tier: 'sector', parents: ['fw-fit-for-55', 'fw-climate-law'], desc: 'Binding efficiency obligations relevant to building energy consumption and audits.' },
      { id: 'national-building-renovation-plans', name: 'National Building Renovation Plans (mandated)', category: 'authority', relevance: 'M', tier: 'sector', parents: ['epbd-recast'], desc: 'Legal requirement for Member States to submit national decarbonisation strategies for the building stock, due end 2026.' },
      { id: 'construction-products-regulation', name: 'Construction Products Regulation', category: 'authority', relevance: 'A', tier: 'instrument', parents: ['epbd-recast'], desc: 'Sets harmonised rules for construction materials; increasingly referenced for climate-resilient/durable material standards.' },
      { id: 'social-climate-fund-buildings', name: 'Social Climate Fund', category: 'treasure', relevance: 'M', tier: 'instrument', parents: ['eu-ets2-buildings'], desc: '€86.7bn (2026–2032) to help vulnerable households renovate, install clean heating and cope with ETS2 costs.' },
      { id: 'rrf-buildings', name: 'Recovery and Resilience Facility (buildings)', category: 'treasure', relevance: 'M', tier: 'instrument', parents: ['national-building-renovation-plans'], desc: 'Over €80bn of the RRF directed toward renovation and clean heating investment.' },
      { id: 'cohesion-policy-funds-buildings', name: 'Cohesion Policy Funds (buildings)', category: 'treasure', relevance: 'M', tier: 'instrument', parents: ['national-building-renovation-plans'], desc: 'Regional financing supporting renovation, particularly in lower-income Member States.' },
      { id: 'elena-facility', name: 'ELENA facility (EIB)', category: 'treasure', relevance: 'M', tier: 'instrument', parents: ['epbd-recast'], desc: 'Technical assistance grants helping public authorities prepare bankable energy-efficiency investment programmes.' },
      { id: 'investeu-renovation-guarantees', name: 'InvestEU renovation guarantees', category: 'treasure', relevance: 'M', tier: 'instrument', parents: ['epbd-recast'], desc: 'EU guarantee mobilising private lending for building renovation and clean heating.' },
      { id: 'national-renovation-subsidy-tax-schemes', name: 'National renovation subsidy/tax schemes (EU-coordinated)', category: 'treasure', relevance: 'M', tier: 'instrument', parents: ['national-building-renovation-plans'], desc: 'Grants, loans and tax incentives run at Member State level within EU financing frameworks (e.g. co-financed under EPBD Article 17).' },
      { id: 'one-stop-shop-network', name: 'One-stop-shop network', category: 'organization', relevance: 'M', tier: 'instrument', parents: ['one-stop-shop-guidance'], desc: 'Institutional coordination mechanism connecting owners with advice, financing and contractors.' },
      { id: 'eeefc', name: 'European Energy Efficiency Financing Coalition', category: 'organization', relevance: 'M', tier: 'instrument', parents: ['epbd-recast'], desc: 'Institutional platform of financial institutions developing renovation lending products with the Commission.' },
      { id: 'covenant-of-mayors', name: 'Covenant of Mayors for Climate & Energy', category: 'organization', relevance: 'MA', tier: 'instrument', parents: ['fw-green-deal'], desc: 'Voluntary institutional network committing cities to building-sector mitigation and resilience action.' },
    ],
  },
  {
    id: 'agrifood',
    label: 'Agri-food',
    frameworks: [FW_CLIMATE_LAW, FW_GREEN_DEAL, FW_FIT_FOR_55, {
      id: 'fw-cap-strategic-plans',
      name: 'CAP Strategic Plans Regulation',
      sub: '2023–2027 CAP framework',
      desc: "Establishes the Common Agricultural Policy framework and requires each Member State's CAP Strategic Plan — the mechanism most agri-food climate measures below sit inside.",
    }],
    items: [
      { id: 'fsdn', name: 'Farm Sustainability Data Network (FSDN)', category: 'nodality', relevance: 'M', tier: 'instrument', parents: ['fw-cap-strategic-plans'], desc: 'EU-wide farm-level data collection informing climate and sustainability policy design.' },
      { id: 'farm-advisory-system', name: 'Farm Advisory System', category: 'nodality', relevance: 'MA', tier: 'instrument', parents: ['fw-cap-strategic-plans'], desc: 'CAP-funded advisory services helping farmers adopt climate mitigation and resilience practices.' },
      { id: 'drought-observatory-copernicus-land', name: 'European Drought Observatory / Copernicus land services', category: 'nodality', relevance: 'A', tier: 'instrument', parents: ['fw-green-deal'], desc: 'Monitoring and early-warning data on drought and land conditions affecting agriculture.' },
      { id: 'climate-adapt-agriculture', name: 'Climate-ADAPT agriculture sector platform', category: 'nodality', relevance: 'A', tier: 'instrument', parents: ['fw-green-deal'], desc: 'Knowledge base on climate risks to agriculture and adaptation practice examples.' },
      { id: 'eu-soil-observatory', name: 'EU Soil Observatory', category: 'nodality', relevance: 'A', tier: 'instrument', parents: ['lulucf-regulation'], desc: 'Monitoring of soil health, relevant to both carbon sequestration and resilience to drought/erosion.' },
      { id: 'cap-strategic-plans-monitoring', name: 'CAP Strategic Plans monitoring & evaluation', category: 'nodality', relevance: 'M', tier: 'instrument', parents: ['fw-cap-strategic-plans'], desc: 'Formal EU-level reporting mechanism tracking climate mitigation performance of national CAP plans.' },
      { id: 'lulucf-regulation', name: 'LULUCF Regulation', category: 'authority', relevance: 'M', tier: 'sector', parents: ['fw-fit-for-55', 'fw-climate-law'], desc: 'Binding "no debit" rule requiring Member States to maintain net carbon sink from land use, land-use change and forestry.' },
      { id: 'cap-conditionality-gaec', name: 'CAP conditionality (GAEC standards)', category: 'authority', relevance: 'MA', tier: 'sector', parents: ['fw-cap-strategic-plans'], desc: 'Binding baseline standards attached to CAP payments, covering soil, water and landscape features relevant to both mitigation and resilience.' },
      { id: 'effort-sharing-regulation-agri', name: 'Effort Sharing Regulation (agriculture)', category: 'authority', relevance: 'M', tier: 'sector', parents: ['fw-fit-for-55', 'fw-climate-law'], desc: 'Binding national emissions targets incorporating non-ETS agricultural emissions.' },
      { id: 'crcf-regulation', name: 'Carbon Removals and Carbon Farming (CRCF) Regulation', category: 'authority', relevance: 'M', tier: 'instrument', parents: ['lulucf-regulation'], desc: 'EU certification framework for carbon farming and carbon removal activities, under review by mid-2026.' },
      { id: 'eudr', name: 'EU Deforestation Regulation (EUDR)', category: 'authority', relevance: 'M', tier: 'sector', parents: ['fw-green-deal'], desc: 'Binding due-diligence rules restricting import of commodities linked to deforestation.' },
      { id: 'water-framework-directive-agri', name: 'Water Framework Directive (agricultural pressure)', category: 'authority', relevance: 'A', tier: 'instrument', parents: ['cap-conditionality-gaec'], desc: 'Legal requirements on water quality and use that indirectly drive resilience-relevant farming practice.' },
      { id: 'proposed-agricultural-ets', name: 'Proposed agricultural ETS / mandatory climate standard', category: 'authority', relevance: 'M', tier: 'sector', parents: ['fw-fit-for-55'], desc: 'Compliance instruments under consideration to price or mandate agri-food emission reductions.' },
      { id: 'cap-pillar-i-eco-schemes', name: 'CAP Pillar I eco-schemes', category: 'treasure', relevance: 'MA', tier: 'instrument', parents: ['cap-conditionality-gaec'], desc: 'Payments rewarding farmers for practices such as carbon farming, agro-forestry and precision farming, with resilience co-benefits.' },
      { id: 'cap-pillar-ii-agri-environment-climate', name: 'CAP Pillar II agri-environment-climate measures', category: 'treasure', relevance: 'MA', tier: 'instrument', parents: ['fw-cap-strategic-plans'], desc: 'Rural development payments supporting sustainable land management, water retention and climate adaptation practices.' },
      { id: 'life-programme', name: 'LIFE Programme (climate & environment strand)', category: 'treasure', relevance: 'MA', tier: 'instrument', parents: ['fw-green-deal'], desc: '€3.4bn funding stream supporting agri-food climate mitigation and adaptation demonstration projects.' },
      { id: 'carbon-farming-payments', name: 'Carbon farming payments (CAP-linked)', category: 'treasure', relevance: 'M', tier: 'instrument', parents: ['crcf-regulation'], desc: 'Area- or results-based payments rewarding land managers for verified carbon sequestration practices.' },
      { id: 'cap-crisis-reserve', name: 'CAP crisis reserve', category: 'treasure', relevance: 'A', tier: 'instrument', parents: ['fw-cap-strategic-plans'], desc: 'Emergency fund supporting farmers affected by market or climate-related production shocks.' },
      { id: 'cap-strategic-plan-governance', name: 'CAP Strategic Plan governance (paying agencies)', category: 'organization', relevance: 'M', tier: 'instrument', parents: ['fw-cap-strategic-plans'], desc: 'National institutional bodies administering and verifying CAP climate-linked payments.' },
      { id: 'eip-agri', name: 'EIP-AGRI (European Innovation Partnership)', category: 'organization', relevance: 'MA', tier: 'instrument', parents: ['fw-green-deal'], desc: 'Institutional network connecting farmers, researchers and advisors on productivity and sustainability innovation, including resilience.' },
    ],
  },
];

/** True when a relevance filter (or 'all') matches a relevance tag — 'MA'
 *  always counts toward a mitigation-only or adaptation-only filter. */
export function relevanceMatches(relevance: ClusterRelevance, filter: 'all' | ClusterRelevance): boolean {
  if (filter === 'all') return true;
  if (filter === 'MA') return relevance === 'MA';
  return relevance === filter || relevance === 'MA';
}

/** True when a relevance filter (or 'all') matches an item. */
export function clusterItemMatches(item: ClusterItem, filter: 'all' | ClusterRelevance): boolean {
  return relevanceMatches(item.relevance, filter);
}

// ── Hierarchy traversal ──────────────────────────────────────────────────────

/** A framework or item node, normalised for the hierarchy view — frameworks
 *  carry no category/tier/relevance since they sit above the typology. */
export interface HierarchyNode {
  kind: 'framework' | 'item';
  name: string;
  sub?: string;
  desc: string;
  category?: ClusterCategory;
  tier?: ClusterTier;
  relevance?: ClusterRelevance;
}

export interface HierarchyIndex {
  byId: Record<string, HierarchyNode>;
  parentsOf: Record<string, string[]>;
  childrenOf: Record<string, string[]>;
}

/** Builds the lookup + parent/child adjacency for a system's cascade, so the
 *  hierarchy view can render it and trace lineage without re-deriving this
 *  on every render. */
export function buildHierarchyIndex(system: ClusterSystem): HierarchyIndex {
  const byId: Record<string, HierarchyNode> = {};
  const parentsOf: Record<string, string[]> = {};
  const childrenOf: Record<string, string[]> = {};

  for (const fw of system.frameworks) {
    byId[fw.id] = { kind: 'framework', name: fw.name, sub: fw.sub, desc: fw.desc };
    parentsOf[fw.id] = [];
    childrenOf[fw.id] = childrenOf[fw.id] ?? [];
  }
  for (const item of system.items) {
    byId[item.id] = {
      kind: 'item',
      name: item.name,
      desc: item.desc,
      category: item.category,
      tier: item.tier,
      relevance: item.relevance,
    };
    parentsOf[item.id] = item.parents;
    childrenOf[item.id] = childrenOf[item.id] ?? [];
  }
  for (const item of system.items) {
    for (const p of item.parents) {
      childrenOf[p] = childrenOf[p] ?? [];
      childrenOf[p].push(item.id);
    }
  }
  return { byId, parentsOf, childrenOf };
}

/** All ids upstream of `id` (its parents, their parents, …). */
export function ancestorsOf(index: HierarchyIndex, id: string): Set<string> {
  const out = new Set<string>();
  const stack = [...(index.parentsOf[id] ?? [])];
  while (stack.length) {
    const p = stack.pop() as string;
    if (out.has(p)) continue;
    out.add(p);
    stack.push(...(index.parentsOf[p] ?? []));
  }
  return out;
}

/** All ids downstream of `id` (its children, their children, …). */
export function descendantsOf(index: HierarchyIndex, id: string): Set<string> {
  const out = new Set<string>();
  const stack = [...(index.childrenOf[id] ?? [])];
  while (stack.length) {
    const c = stack.pop() as string;
    if (out.has(c)) continue;
    out.add(c);
    stack.push(...(index.childrenOf[c] ?? []));
  }
  return out;
}
