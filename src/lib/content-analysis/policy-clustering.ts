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
// This is a draft working tool — instrument lists are a first pass and
// should be checked against current legislation before use in the final
// coherence analysis.

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

export interface ClusterItem {
  /** Instrument / measure name. */
  name: string;
  category: ClusterCategory;
  relevance: ClusterRelevance;
  desc: string;
}

export interface ClusterSystem {
  id: string;
  label: string;
  items: ClusterItem[];
}

export const CLUSTER_SYSTEMS: ClusterSystem[] = [
  {
    id: 'energy',
    label: 'Energy supply',
    items: [
      { name: 'NECP reporting & guidance', category: 'nodality', relevance: 'M', desc: 'Member States report energy/climate trajectories; Commission assesses and issues country guidance.' },
      { name: 'Copernicus Climate Change Service', category: 'nodality', relevance: 'A', desc: 'EU satellite climate data and risk indicators, e.g. heat/drought impact on hydropower and cooling.' },
      { name: 'PRIMES / POTEnCIA modelling', category: 'nodality', relevance: 'M', desc: 'Commission scenario tools underpinning Fit for 55 and the 2040 target package.' },
      { name: 'ESABCC advisory reports', category: 'nodality', relevance: 'MA', desc: 'Independent scientific advice on energy-sector emissions trajectories and climate risk.' },
      { name: 'Climate-ADAPT platform', category: 'nodality', relevance: 'A', desc: 'Knowledge-sharing platform on climate risks to energy infrastructure, tools and case studies.' },
      { name: 'ACER / ENTSO-E adequacy reporting', category: 'nodality', relevance: 'A', desc: 'Reporting on electricity resource adequacy including climate-related stress scenarios.' },
      { name: 'REPowerEU communications', category: 'nodality', relevance: 'M', desc: 'Non-binding Commission framing documents shaping Member State action on energy security and renewables.' },
      { name: 'Renewable Energy Directive (RED III)', category: 'authority', relevance: 'M', desc: 'Binding EU and national renewable energy targets, sub-targets and permitting rules.' },
      { name: 'Energy Efficiency Directive (EED)', category: 'authority', relevance: 'M', desc: 'Binding annual consumption-reduction obligations, audits and management systems.' },
      { name: 'EU ETS 1 and 2', category: 'authority', relevance: 'M', desc: 'Cap-and-trade regulation on power, industry, buildings and transport emissions.' },
      { name: 'Governance Regulation 2018/1999', category: 'authority', relevance: 'M', desc: 'Legal requirement for NECPs including energy supply decarbonisation pathways.' },
      { name: 'Effort Sharing Regulation', category: 'authority', relevance: 'M', desc: 'Binding national emissions targets covering non-ETS energy use.' },
      { name: 'Methane Regulation 2024/1787', category: 'authority', relevance: 'M', desc: 'Binding methane monitoring and reduction rules for oil, gas and coal.' },
      { name: 'TEN-E Regulation', category: 'authority', relevance: 'MA', desc: 'Permitting framework for Projects of Common Interest, including grid resilience criteria.' },
      { name: 'Critical Entities Resilience Directive', category: 'authority', relevance: 'A', desc: 'Mandates resilience planning for critical infrastructure operators against disruptions.' },
      { name: 'ENTSO-E network codes', category: 'authority', relevance: 'A', desc: 'Binding technical grid rules, increasingly with climate-resilience design standards.' },
      { name: 'State Aid Climate & Energy Guidelines', category: 'authority', relevance: 'M', desc: 'Legal framework constraining Member State subsidies to energy in line with climate goals.' },
      { name: 'Innovation Fund', category: 'treasure', relevance: 'M', desc: 'ETS revenue-financed grants for low-carbon technology demonstration.' },
      { name: 'Modernisation Fund', category: 'treasure', relevance: 'M', desc: 'ETS revenue-financed support for energy system modernisation in lower-income states.' },
      { name: 'Connecting Europe Facility - Energy', category: 'treasure', relevance: 'MA', desc: 'Co-financing for cross-border energy infrastructure, including resilient grid upgrades.' },
      { name: 'Just Transition Fund', category: 'treasure', relevance: 'M', desc: 'Support for regions and workers affected by energy-sector decarbonisation.' },
      { name: 'Recovery and Resilience Facility', category: 'treasure', relevance: 'MA', desc: 'Grants and loans conditional on energy transition and resilience reforms.' },
      { name: 'Social Climate Fund', category: 'treasure', relevance: 'M', desc: 'ETS2 revenue redistributed to cushion energy costs, funding efficiency and renewables.' },
      { name: 'InvestEU sustainable infrastructure', category: 'treasure', relevance: 'MA', desc: 'EU guarantee mobilising private investment in clean and resilient energy infrastructure.' },
      { name: 'Cohesion Policy Funds', category: 'treasure', relevance: 'MA', desc: 'Regional financing for renewables and, in some programmes, climate-proofing.' },
      { name: 'EIB energy lending policy', category: 'treasure', relevance: 'MA', desc: 'Financing criteria excluding fossil fuels, prioritising renewables and grid resilience.' },
      { name: 'Renewable Energy Financing Mechanism', category: 'treasure', relevance: 'M', desc: 'Cross-border pooled financing for renewable projects toward EU targets.' },
      { name: 'ENTSO-E / ENTSOG coordination', category: 'organization', relevance: 'MA', desc: 'Ten-year network development planning including climate-resilience elements.' },
      { name: 'ACER', category: 'organization', relevance: 'M', desc: 'EU body coordinating national regulators on cross-border energy market and infrastructure issues.' },
      { name: 'CINEA', category: 'organization', relevance: 'MA', desc: 'Implements CEF-Energy and Innovation Fund on behalf of the Commission.' },
      { name: 'Climate-mainstreamed procurement guidance', category: 'organization', relevance: 'MA', desc: 'Integration of mitigation and resilience criteria into EU-funded energy procurement.' },
      { name: 'Electricity & Gas Coordination Groups', category: 'organization', relevance: 'A', desc: 'Coordination on security-of-supply and crisis preparedness, including climate-driven disruptions.' },
      { name: 'EU Energy Platform', category: 'organization', relevance: 'M', desc: 'Joint gas and hydrogen purchasing mechanism to enhance supply security.' },
    ],
  },
  {
    id: 'buildings',
    label: 'Buildings',
    items: [
      { name: 'EU Building Stock Observatory', category: 'nodality', relevance: 'M', desc: 'EU database tracking building energy performance to inform renovation policy.' },
      { name: 'Energy Performance Certificates (EPC) framework', category: 'nodality', relevance: 'M', desc: 'Standardised performance labelling and national databases informing owners and buyers.' },
      { name: 'EPBD implementation guidance annexes (2025)', category: 'nodality', relevance: 'M', desc: 'Thirteen thematic annexes helping Member States transpose MEPS, renovation trajectories and financing rules.' },
      { name: 'One-stop-shop guidance (2026)', category: 'nodality', relevance: 'M', desc: 'Commission recommendation on setting up advisory hubs to guide households through renovation.' },
      { name: 'Climate-ADAPT buildings sector platform', category: 'nodality', relevance: 'A', desc: 'Knowledge base on overheating, flood and resilience risks to the building stock.' },
      { name: 'Energy efficiency financing reports & recommendations', category: 'nodality', relevance: 'M', desc: 'Commission reporting and guidance to unlock private lending for renovation (COM/2026/118 and related).' },
      { name: 'Energy Performance of Buildings Directive (EPBD recast)', category: 'authority', relevance: 'MA', desc: 'Binding minimum energy performance standards, zero-emission building standards from 2028/2030, and requirement to consider climate resilience/overheating in renovation planning.' },
      { name: 'EU ETS2 (buildings & road transport, from 2027)', category: 'authority', relevance: 'M', desc: 'Binding carbon pricing on heating fuels used in buildings.' },
      { name: 'Energy Efficiency Directive (EED)', category: 'authority', relevance: 'M', desc: 'Binding efficiency obligations relevant to building energy consumption and audits.' },
      { name: 'National Building Renovation Plans (mandated)', category: 'authority', relevance: 'M', desc: 'Legal requirement for Member States to submit national decarbonisation strategies for the building stock, due end 2026.' },
      { name: 'Construction Products Regulation', category: 'authority', relevance: 'A', desc: 'Sets harmonised rules for construction materials; increasingly referenced for climate-resilient/durable material standards.' },
      { name: 'Social Climate Fund', category: 'treasure', relevance: 'M', desc: '€86.7bn (2026–2032) to help vulnerable households renovate, install clean heating and cope with ETS2 costs.' },
      { name: 'Recovery and Resilience Facility (buildings)', category: 'treasure', relevance: 'M', desc: 'Over €80bn of the RRF directed toward renovation and clean heating investment.' },
      { name: 'Cohesion Policy Funds (buildings)', category: 'treasure', relevance: 'M', desc: 'Regional financing supporting renovation, particularly in lower-income Member States.' },
      { name: 'ELENA facility (EIB)', category: 'treasure', relevance: 'M', desc: 'Technical assistance grants helping public authorities prepare bankable energy-efficiency investment programmes.' },
      { name: 'InvestEU renovation guarantees', category: 'treasure', relevance: 'M', desc: 'EU guarantee mobilising private lending for building renovation and clean heating.' },
      { name: 'National renovation subsidy/tax schemes (EU-coordinated)', category: 'treasure', relevance: 'M', desc: 'Grants, loans and tax incentives run at Member State level within EU financing frameworks (e.g. co-financed under EPBD Article 17).' },
      { name: 'One-stop-shop network', category: 'organization', relevance: 'M', desc: 'Institutional coordination mechanism connecting owners with advice, financing and contractors.' },
      { name: 'European Energy Efficiency Financing Coalition', category: 'organization', relevance: 'M', desc: 'Institutional platform of financial institutions developing renovation lending products with the Commission.' },
      { name: 'Covenant of Mayors for Climate & Energy', category: 'organization', relevance: 'MA', desc: 'Voluntary institutional network committing cities to building-sector mitigation and resilience action.' },
    ],
  },
  {
    id: 'agrifood',
    label: 'Agri-food',
    items: [
      { name: 'Farm Sustainability Data Network (FSDN)', category: 'nodality', relevance: 'M', desc: 'EU-wide farm-level data collection informing climate and sustainability policy design.' },
      { name: 'Farm Advisory System', category: 'nodality', relevance: 'MA', desc: 'CAP-funded advisory services helping farmers adopt climate mitigation and resilience practices.' },
      { name: 'European Drought Observatory / Copernicus land services', category: 'nodality', relevance: 'A', desc: 'Monitoring and early-warning data on drought and land conditions affecting agriculture.' },
      { name: 'Climate-ADAPT agriculture sector platform', category: 'nodality', relevance: 'A', desc: 'Knowledge base on climate risks to agriculture and adaptation practice examples.' },
      { name: 'EU Soil Observatory', category: 'nodality', relevance: 'A', desc: 'Monitoring of soil health, relevant to both carbon sequestration and resilience to drought/erosion.' },
      { name: 'CAP Strategic Plans monitoring & evaluation', category: 'nodality', relevance: 'M', desc: 'Formal EU-level reporting mechanism tracking climate mitigation performance of national CAP plans.' },
      { name: 'LULUCF Regulation', category: 'authority', relevance: 'M', desc: 'Binding "no debit" rule requiring Member States to maintain net carbon sink from land use, land-use change and forestry.' },
      { name: 'CAP conditionality (GAEC standards)', category: 'authority', relevance: 'MA', desc: 'Binding baseline standards attached to CAP payments, covering soil, water and landscape features relevant to both mitigation and resilience.' },
      { name: 'Effort Sharing Regulation (agriculture)', category: 'authority', relevance: 'M', desc: 'Binding national emissions targets incorporating non-ETS agricultural emissions.' },
      { name: 'Carbon Removals and Carbon Farming (CRCF) Regulation', category: 'authority', relevance: 'M', desc: 'EU certification framework for carbon farming and carbon removal activities, under review by mid-2026.' },
      { name: 'EU Deforestation Regulation (EUDR)', category: 'authority', relevance: 'M', desc: 'Binding due-diligence rules restricting import of commodities linked to deforestation.' },
      { name: 'Water Framework Directive (agricultural pressure)', category: 'authority', relevance: 'A', desc: 'Legal requirements on water quality and use that indirectly drive resilience-relevant farming practice.' },
      { name: 'Proposed agricultural ETS / mandatory climate standard', category: 'authority', relevance: 'M', desc: 'Compliance instruments under consideration to price or mandate agri-food emission reductions.' },
      { name: 'CAP Pillar I eco-schemes', category: 'treasure', relevance: 'MA', desc: 'Payments rewarding farmers for practices such as carbon farming, agro-forestry and precision farming, with resilience co-benefits.' },
      { name: 'CAP Pillar II agri-environment-climate measures', category: 'treasure', relevance: 'MA', desc: 'Rural development payments supporting sustainable land management, water retention and climate adaptation practices.' },
      { name: 'LIFE Programme (climate & environment strand)', category: 'treasure', relevance: 'MA', desc: '€3.4bn funding stream supporting agri-food climate mitigation and adaptation demonstration projects.' },
      { name: 'Carbon farming payments (CAP-linked)', category: 'treasure', relevance: 'M', desc: 'Area- or results-based payments rewarding land managers for verified carbon sequestration practices.' },
      { name: 'CAP crisis reserve', category: 'treasure', relevance: 'A', desc: 'Emergency fund supporting farmers affected by market or climate-related production shocks.' },
      { name: 'CAP Strategic Plan governance (paying agencies)', category: 'organization', relevance: 'M', desc: 'National institutional bodies administering and verifying CAP climate-linked payments.' },
      { name: 'EIP-AGRI (European Innovation Partnership)', category: 'organization', relevance: 'MA', desc: 'Institutional network connecting farmers, researchers and advisors on productivity and sustainability innovation, including resilience.' },
    ],
  },
];

/** True when a relevance filter (or 'all') matches an item — 'MA' items
 *  always count toward a mitigation-only or adaptation-only filter. */
export function clusterItemMatches(item: ClusterItem, filter: 'all' | ClusterRelevance): boolean {
  if (filter === 'all') return true;
  if (filter === 'MA') return item.relevance === 'MA';
  return item.relevance === filter || item.relevance === 'MA';
}
