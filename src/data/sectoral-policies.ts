/**
 * Sectoral policy grouping for M·04 Policy Navigator.
 * ---------------------------------------------------
 * Maps every tracked policy to one of ten sectors plus a `cross-cutting`
 * bucket. Drives the sector tabs on the network graph, the sector
 * rows on the gap explorer, and the 2030 / 2040 / 2050 milestone map.
 *
 * The citation-link helpers (`getCitationLinks`) produce the small
 * "read the article" chips next to each policy in the sectoral view —
 * deep-linked into the EUR-Lex consolidated text.
 *
 * Sector IDs are stable wire values; do not rename without updating
 * the references in `src/data/policies.ts` and every chart component
 * that keys off them.
 */

export type SectorId = 'power' | 'industry' | 'buildings' | 'transport-road' | 'transport-maritime' | 'transport-aviation' | 'agriculture' | 'lulucf' | 'waste' | 'cross-cutting';

export interface SectorPolicy {
  id: string;
  name: string;
  acronym?: string;
  sectors: SectorId[];
  instrumentType: 'cap-and-trade' | 'regulation' | 'standard' | 'target' | 'fund' | 'directive' | 'tax' | 'disclosure';
  adopted?: string;
  inForce?: string;
  scope: string;
  meaning: string;
  currentRequirement: string;
  futureRequirement: string;
  keyMilestones: { year: number; requirement: string }[];
  /**
   * EUR-Lex CELEX number (e.g. "32021R1119"). When present, the legal act is
   * addressable via `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:{ceLexId}`.
   */
  ceLexId?: string;
  /**
   * Direct link to the authoritative EUR-Lex record for the legal act. Takes
   * precedence over the CELEX-derived URL — useful for consolidated texts,
   * amending acts, or Commission communications without a regulation number.
   */
  eurlexUrl?: string;
  /**
   * Commission topic / portal page providing context, implementation
   * guidance and plain-language summaries. Kept for readability; the primary
   * citation should be the EUR-Lex record.
   */
  sourceUrl: string;
  /**
   * Precise article-level citations for the key quantitative claims in this
   * entry. Each string references the article/recital/annex in the legal act
   * that underpins a specific claim, enabling bullet-proof verification.
   */
  articleCitations?: string[];
}

/**
 * Resolves the primary EUR-Lex URL for a sector policy. Prefers an explicit
 * `eurlexUrl` (e.g. for consolidated texts or communications), then derives
 * one from the CELEX number. Returns null if neither is available.
 */
export function getEurLexUrl(policy: Pick<SectorPolicy, 'eurlexUrl' | 'ceLexId'>): string | null {
  if (policy.eurlexUrl) return policy.eurlexUrl;
  if (policy.ceLexId) {
    return `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${policy.ceLexId}`;
  }
  return null;
}

export interface Sector {
  id: SectorId;
  name: string;
  description: string;
  sharePercent: number;
  color: string;
  icon: string;
  keyPolicies: string[];
  targetLanguage: string;
}

// sharePercent values: source: 'EEA 2022 EU-27 GHG inventory'
export const SECTORS: Sector[] = [
  {
    id: 'power',
    name: 'Power & Heat',
    description: 'Electricity and heat generation — the fastest decarbonising sector in the EU.',
    sharePercent: 23,
    color: '#0065A4',
    icon: 'bolt',
    keyPolicies: ['eu-ets', 'red-iii', 'eed', 'mdr', 'ten-e'],
    targetLanguage: 'Full decarbonisation of power by 2040; net-zero electricity by 2035-2040.',
  },
  {
    id: 'industry',
    name: 'Industry',
    description: 'Energy-intensive manufacturing: steel, cement, chemicals, aluminium, refining.',
    sharePercent: 22,
    color: '#6667AB',
    icon: 'factory',
    keyPolicies: ['eu-ets', 'cbam', 'ied', 'innovation-fund', 'net-zero-industry-act', 'critical-raw-materials-act'],
    targetLanguage: 'Deep industrial decarbonisation with CBAM protection of competitiveness; EU-wide economy target -90% net GHG by 2040.',
  },
  {
    id: 'buildings',
    name: 'Buildings',
    description: 'Residential and non-residential heating, cooling, lighting and appliances.',
    sharePercent: 14,
    color: '#007B6C',
    icon: 'home',
    keyPolicies: ['epbd', 'eed', 'ets2', 'sclf', 'red-iii', 'ecodesign'],
    targetLanguage: 'Zero-emission building stock by 2050; all new buildings ZEB from 2028/2030.',
  },
  {
    id: 'transport-road',
    name: 'Road Transport',
    description: 'Passenger cars, vans, heavy-duty vehicles, buses. Largest transport sub-sector.',
    sharePercent: 19,
    color: '#D97706',
    icon: 'car',
    keyPolicies: ['co2-cars-vans', 'co2-hdv', 'afir', 'eurovignette', 'ets2', 'red-iii'],
    targetLanguage: '100% zero-emission new cars/vans by 2035; -90% HDV CO2 by 2040.',
  },
  {
    id: 'transport-maritime',
    name: 'Maritime',
    description: 'International and intra-EU shipping, including bunker fuels.',
    sharePercent: 4,
    color: '#1F4E79',
    icon: 'ship',
    keyPolicies: ['fueleu-maritime', 'eu-ets-maritime', 'mrv-maritime', 'afir'],
    targetLanguage: 'FuelEU intensity -2% from 2025 (rising to -6% by 2030) to -80% by 2050; full ETS coverage from 2026.',
  },
  {
    id: 'transport-aviation',
    name: 'Aviation',
    description: 'Intra-EEA and international aviation emissions.',
    sharePercent: 4,
    color: '#4A90C5',
    icon: 'plane',
    keyPolicies: ['refueleu-aviation', 'eu-ets-aviation', 'corsia'],
    targetLanguage: 'SAF blending mandate: 2% 2025 → 70% 2050; full auctioning intra-EEA from 2026.',
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    description: 'Crop and livestock emissions, fertiliser use, manure management.',
    sharePercent: 11,
    color: '#84CC16',
    icon: 'wheat',
    keyPolicies: ['cap', 'esr', 'nec', 'farm-to-fork', 'nature-restoration-law'],
    targetLanguage: 'ESR binding national targets; CAP eco-schemes; methane reduction pathway.',
  },
  {
    id: 'lulucf',
    name: 'LULUCF',
    description: 'Land use, land-use change and forestry — carbon sink.',
    sharePercent: -6,
    color: '#16A34A',
    icon: 'tree',
    keyPolicies: ['lulucf-regulation', 'nature-restoration-law', 'forest-strategy', 'deforestation-regulation'],
    targetLanguage: 'Net removals target -310 MtCO2e by 2030; reverse sink decline.',
  },
  {
    id: 'waste',
    name: 'Waste',
    description: 'Landfill, wastewater and solid waste treatment emissions.',
    sharePercent: 3,
    color: '#9CA3AF',
    icon: 'trash',
    keyPolicies: ['waste-framework-directive', 'landfill-directive', 'methane-regulation', 'esr'],
    targetLanguage: 'Circular economy, landfill cap, methane capture mandate.',
  },
  {
    id: 'cross-cutting',
    name: 'Cross-cutting',
    description: 'Framework legislation covering multiple sectors.',
    sharePercent: 0,
    color: '#404040',
    icon: 'shield',
    keyPolicies: ['climate-law', 'governance-regulation', 'fit-for-55', 'just-transition-fund', 'taxonomy'],
    targetLanguage: '-55% by 2030, -90% by 2040, net-zero by 2050.',
  },
];

export const SECTOR_POLICIES: SectorPolicy[] = [
  // ── Cross-cutting framework ────────────────────────────────────────────
  {
    id: 'climate-law',
    name: 'European Climate Law',
    acronym: 'ECL',
    sectors: ['cross-cutting'],
    instrumentType: 'regulation',
    adopted: '2021',
    inForce: '2021',
    scope: 'EU-27',
    meaning: 'Legally binds the EU to climate neutrality by 2050 and enshrines the 2030 target of at least -55% net GHG emissions vs 1990. Establishes a scientific advisory board and a 2040 target process.',
    currentRequirement: 'Net GHG reduction of at least 55% by 2030 (vs 1990), -90% by 2040, climate neutrality by 2050, negative emissions thereafter.',
    futureRequirement: 'The 2040 target of -90% net GHG was enacted as Regulation (EU) 2026/667, which entered into force on 7 April 2026. The -90% target includes a domestic component of -85%, with up to 5% from carbon removals/international credits. Revised sectoral legislation is being aligned.',
    keyMilestones: [
      { year: 2030, requirement: '-55% net GHG vs 1990 (Art. 4(1))' },
      { year: 2040, requirement: '-90% net GHG vs 1990 (Reg. 2026/667)' },
      { year: 2050, requirement: 'Climate neutrality (Art. 2(1))' },
    ],
    ceLexId: '32021R1119',
    sourceUrl: 'https://eur-lex.europa.eu/eli/reg/2021/1119/oj',
    articleCitations: [
      'Art. 2(1): climate neutrality by 2050, negative emissions thereafter',
      'Art. 4(1): binding -55% net GHG by 2030 vs 1990',
      'Art. 5(1): Commission to propose 2040 target by H1 2024',
      'Art. 10: European Scientific Advisory Board on Climate Change (15 members)',
    ],
  },
  {
    id: 'fit-for-55',
    name: 'Fit for 55 package',
    sectors: ['cross-cutting'],
    instrumentType: 'directive',
    adopted: 'proposed 2021; core files adopted 2023-2024',
    inForce: '2023-2024',
    scope: 'EU-27',
    meaning: 'Legislative package of 13 interlinked proposals revising all major climate laws to deliver the -55% 2030 target: ETS reform, ETS2, CBAM, ESR, LULUCF, RED III, EED recast, EPBD recast, FuelEU Maritime, ReFuelEU Aviation, AFIR, CO2 standards, Social Climate Fund.',
    currentRequirement: 'Core files adopted; implementation and transposition under way. Energy Taxation Directive revision still in negotiation.',
    futureRequirement: 'Mid-2020s revision cycle for 2040 alignment.',
    keyMilestones: [
      { year: 2021, requirement: 'Commission tables package' },
      { year: 2023, requirement: 'CBAM transitional reporting phase starts (Oct 2023)' },
      { year: 2024, requirement: 'EU ETS maritime phase-in begins (40% surrender)' },
      { year: 2030, requirement: 'Package delivers -55%' },
    ],
    ceLexId: '52021DC0550',
    eurlexUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52021DC0550',
    sourceUrl: 'https://www.consilium.europa.eu/en/policies/fit-for-55/',
  },
  {
    id: 'governance-regulation',
    name: 'Governance Regulation',
    acronym: 'GovReg',
    sectors: ['cross-cutting'],
    instrumentType: 'regulation',
    adopted: '2018',
    inForce: '2018',
    scope: 'EU-27',
    meaning: 'Sets out the governance of the Energy Union and Climate Action: Member States must submit 10-year National Energy and Climate Plans (NECPs) and biennial progress reports.',
    currentRequirement: 'NECP updates submitted 2024 aligning with -55% 2030 target; biennial tracking.',
    futureRequirement: 'Next NECP cycle 2028-2030 for 2040 target.',
    keyMilestones: [
      { year: 2024, requirement: 'Updated NECPs submitted' },
      { year: 2029, requirement: 'Next full NECP update' },
    ],
    ceLexId: '32018R1999',
    sourceUrl: 'https://eur-lex.europa.eu/eli/reg/2018/1999/oj',
  },
  {
    id: 'taxonomy',
    name: 'EU Taxonomy Regulation',
    sectors: ['cross-cutting'],
    instrumentType: 'disclosure',
    adopted: '2020',
    inForce: '2020',
    scope: 'EU-27',
    meaning: 'Classification system defining which economic activities are environmentally sustainable, used to direct private investment towards the green transition and to underpin the CSRD and SFDR.',
    currentRequirement: 'Climate Delegated Act for mitigation + adaptation applies from 1 January 2022; Environmental Delegated Act (Reg 2023/2486) adopted June 2023 and applicable from 1 January 2024.',
    futureRequirement: 'Expanded screening criteria and alignment reporting for all NFRD/CSRD companies.',
    keyMilestones: [
      { year: 2022, requirement: 'Climate delegated act applies' },
      { year: 2024, requirement: 'Full CSRD alignment reporting' },
    ],
    ceLexId: '32020R0852',
    sourceUrl: 'https://eur-lex.europa.eu/eli/reg/2020/852/oj',
  },
  {
    id: 'just-transition-fund',
    name: 'Just Transition Mechanism / Fund',
    acronym: 'JTF',
    sectors: ['cross-cutting'],
    instrumentType: 'fund',
    adopted: '2021',
    inForce: '2021',
    scope: 'EU-27',
    meaning: 'Three-pillar mechanism to support regions most affected by the transition: JTF (€17.5 bn), InvestEU pillar, public sector loan facility. Funds reskilling, SME diversification and clean infrastructure.',
    currentRequirement: 'Territorial Just Transition Plans approved; disbursement 2021-2027.',
    futureRequirement: 'Successor instrument for 2028+ MFF to support deeper 2040 decarbonisation.',
    keyMilestones: [
      { year: 2027, requirement: 'Current MFF envelope fully committed' },
    ],
    ceLexId: '32021R1056',
    eurlexUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R1056',
    sourceUrl: 'https://commission.europa.eu/strategy-and-policy/priorities-2019-2024/european-green-deal/finance-and-green-deal/just-transition-mechanism_en',
  },

  // ── Power / industry carbon pricing ────────────────────────────────────
  {
    id: 'eu-ets',
    name: 'EU Emissions Trading System (ETS1)',
    acronym: 'EU ETS',
    sectors: ['power', 'industry', 'transport-aviation', 'transport-maritime'],
    instrumentType: 'cap-and-trade',
    adopted: '2003, revised 2023',
    inForce: '2005',
    scope: 'EU-27 + EEA-EFTA',
    meaning: 'Cap-and-trade for ~10,000 installations in power, heavy industry, intra-EEA aviation (since 2012) and maritime (from 2024). Sets an annual cap on emissions that declines linearly, forcing abatement where cheapest.',
    currentRequirement: 'Linear Reduction Factor (LRF) of 4.3% 2024-2027 then 4.4% from 2028 (Art. 9, Directive 2023/959); -62% emissions by 2030 vs 2005 (Recital 31, Directive 2023/959). Free allocation for industry phased out 2026-2034 in parallel with CBAM (Art. 10a(1a)).',
    futureRequirement: 'Cap reaches zero around 2039-2040. MSR withholds excess allowances. Review clause for 2040 target implementation.',
    keyMilestones: [
      { year: 2024, requirement: 'Maritime phase-in begins — 40% of 2024 emissions (surrender obligation in 2025) (Art. 3gb, Directive 2023/959)' },
      { year: 2025, requirement: 'Maritime 70% surrender (Art. 3gb)' },
      { year: 2026, requirement: 'Maritime 100% surrender; non-CO₂ GHGs included; CBAM financial phase starts; free allocation phase-out begins (Art. 3gb, Art. 10a(1a))' },
      { year: 2030, requirement: '-62% vs 2005 (Recital 31, Directive 2023/959)' },
      { year: 2034, requirement: 'Free allocation ends for CBAM sectors (Art. 10a(1a): free allocation = 0%, CBAM = 100% from 2034)' },
      { year: 2040, requirement: 'Cap near zero (if LRF unchanged)' },
    ],
    ceLexId: '32003L0087',
    sourceUrl: 'https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets_en',
    articleCitations: [
      'Art. 9 (as amended by Directive 2023/959): LRF 4.3% (2024-2027), 4.4% (from 2028)',
      'Recital 31 (Directive 2023/959): -62% in ETS sectors by 2030 vs 2005',
      'Art. 3gb (Directive 2023/959): maritime phase-in — 40% (2024), 70% (2025), 100% (2026+); non-CO₂ from 2026',
      'Art. 10a(1a) (Directive 2023/959): free allocation factor — 97.5% (2026), declining to 0% (2034); CBAM obligation rises correspondingly from 2.5% to 100%',
    ],
  },
  {
    id: 'ets2',
    name: 'ETS for buildings, road transport & small industry',
    acronym: 'ETS2',
    sectors: ['buildings', 'transport-road', 'industry'],
    instrumentType: 'cap-and-trade',
    adopted: '2023',
    inForce: '2023 (directive); trading start postponed to 2028',
    scope: 'EU-27',
    meaning: 'Separate upstream ETS covering fuel suppliers who place fuels for road transport, buildings and small industry on the market. Complements ESR by adding a price signal.',
    currentRequirement: 'MRV phase under way; trading start postponed from 2027 to 2028 by EU co-legislators in November 2025. Price Stability Mechanism releases allowances if price exceeds €45/t (2020 prices) (Art. 30h(2)).',
    futureRequirement: '-42% emissions by 2030 vs 2005 in covered sectors (Art. 30d).',
    keyMilestones: [
      { year: 2025, requirement: 'MRV reporting begins (Art. 30b-30f)' },
      { year: 2028, requirement: 'Compliance obligations start (postponed from 2027)' },
      { year: 2030, requirement: '-42% vs 2005 (Art. 30d)' },
    ],
    ceLexId: '32023L0959',
    sourceUrl: 'https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets/ets2-buildings-road-transport-and-additional-sectors_en',
    articleCitations: [
      'Art. 30a & Annex III (Directive 2023/959): ETS2 scope — upstream fuel suppliers for buildings, road transport, small industry',
      'Art. 30d (Directive 2023/959): ETS2 cap — -42% by 2030 vs 2005',
      'Art. 30h(2) (Directive 2023/959): Price Stability Mechanism — 20M allowances released if price >€45/t (2020 prices) for 2 consecutive months',
    ],
  },
  {
    id: 'cbam',
    name: 'Carbon Border Adjustment Mechanism',
    acronym: 'CBAM',
    sectors: ['industry'],
    instrumentType: 'cap-and-trade',
    adopted: '2023',
    inForce: '2023 (transitional); 2026 (financial)',
    scope: 'EU-27 imports',
    meaning: 'Price on embedded emissions of imported cement, iron and steel, aluminium, fertilisers, electricity and hydrogen, mirroring the EU ETS carbon price. Prevents carbon leakage as free allocation is phased out.',
    currentRequirement: 'Quarterly reporting since Oct 2023 (transitional period, Art. 32). Definitive period starts 1 January 2026 (Art. 36); under the CBAM simplification Regulation (EU) 2025/2083, sales of CBAM certificates begin 1 February 2027 with the first surrender deadline by 30 September 2027 for 2026 imports.',
    futureRequirement: 'Review for inclusion of downstream products and potentially other sectors. Export rebate debate ongoing.',
    keyMilestones: [
      { year: 2023, requirement: 'Transitional reporting starts (Art. 32, Reg. 2023/956)' },
      { year: 2026, requirement: 'Definitive period begins (Art. 36, Reg. 2023/956)' },
      { year: 2027, requirement: 'CBAM certificate sales from 1 Feb; first surrender by 30 Sep (Reg. 2025/2083)' },
      { year: 2034, requirement: 'Full ETS free allocation phase-out matches CBAM coverage (Art. 10a(1a), Directive 2023/959)' },
    ],
    ceLexId: '32023R0956',
    sourceUrl: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en',
    articleCitations: [
      'Art. 2 & Annex I (Reg. 2023/956): scope — cement, iron/steel, aluminium, fertilisers, electricity, hydrogen',
      'Art. 32 (Reg. 2023/956): transitional period from 1 October 2023',
      'Art. 36 (Reg. 2023/956): definitive period from 1 January 2026',
      'Reg. (EU) 2025/2083: Omnibus simplification — certificate sales deferred to 1 Feb 2027, first surrender by 30 Sep 2027',
    ],
  },
  {
    id: 'esr',
    name: 'Effort Sharing Regulation',
    acronym: 'ESR',
    sectors: ['buildings', 'transport-road', 'agriculture', 'waste', 'industry'],
    instrumentType: 'regulation',
    adopted: '2018, revised 2023',
    inForce: '2021',
    scope: 'EU-27',
    meaning: 'Sets binding annual emission targets per Member State for sectors not covered by the ETS — buildings, non-ETS transport, agriculture, small industry and waste. Targets range from -10% to -50% by 2030 vs 2005 based on GDP per capita.',
    currentRequirement: 'EU-wide -40% reduction in ESR sectors by 2030 vs 2005 (up from the original -30%, revised by Reg. 2023/857). National AEAs with flexibility via banking, borrowing, LULUCF credits and trading.',
    futureRequirement: '2040 revision to align with 90% target; likely deeper MS-level targets.',
    keyMilestones: [
      { year: 2030, requirement: '-40% vs 2005 at EU level (Reg. 2023/857, amending Annex I)' },
    ],
    ceLexId: '32018R0842',
    sourceUrl: 'https://climate.ec.europa.eu/eu-action/effort-sharing-member-states-emission-targets_en',
    articleCitations: [
      'Annex I (as amended by Reg. 2023/857): national targets -10% (BG) to -50% (DE, DK, FI, LU, SE) by 2030 vs 2005',
      'Art. 4(2) (as amended): aggregate EU-wide -40% by 2030 vs 2005',
    ],
  },

  // ── Renewables, efficiency & grid ──────────────────────────────────────
  {
    id: 'red-iii',
    name: 'Renewable Energy Directive III',
    acronym: 'RED III',
    sectors: ['power', 'buildings', 'industry', 'transport-road'],
    instrumentType: 'directive',
    adopted: '2023',
    inForce: '2023',
    scope: 'EU-27',
    meaning: 'Raises the binding EU-wide renewable energy target to at least 42.5% of gross final consumption by 2030 (aspirational 45%). Sector-specific sub-targets for industry (+1.6 pp/yr RES in industry; 42% RFNBO in H2 use by 2030), transport (14.5% GHG intensity reduction or 29% RES) and buildings. Fast-track permitting in "acceleration areas".',
    currentRequirement: '42.5% RES share by 2030 as binding EU target (Art. 3). Transposition deadline 21 May 2025. NECP updates must show pathway.',
    futureRequirement: '2040 revision expected to align with 90% climate target — share likely 65-75% by 2040.',
    keyMilestones: [
      { year: 2030, requirement: '42.5% RES (binding), 45% aspirational (Art. 3)' },
      { year: 2030, requirement: '42% RFNBO in industrial H2 use (Art. 22a(1))' },
      { year: 2035, requirement: '60% RFNBO in industrial H2 use (Art. 22a(1))' },
    ],
    ceLexId: '32023L2413',
    sourceUrl: 'https://energy.ec.europa.eu/topics/renewable-energy/renewable-energy-directive-targets-and-rules_en',
    articleCitations: [
      'Art. 3: binding EU target ≥42.5% RES by 2030, indicative 45%',
      'Art. 22a(1): 42% RFNBO in industrial H2 by 2030, 60% by 2035',
      'Art. 22a: +1.6 pp/yr renewable energy increase in industry',
      'Art. 23: heating/cooling sub-targets (+0.8 pp/yr 2021-2025, +1.1 pp/yr 2026-2030)',
      'Art. 25: transport — 14.5% GHG intensity reduction or 29% RES share by 2030',
      'Art. 6 (Directive 2023/2413): entry into force 20 November 2023 (20 days after OJ publication 31 October 2023)',
    ],
  },
  {
    id: 'eed',
    name: 'Energy Efficiency Directive (recast)',
    acronym: 'EED',
    sectors: ['power', 'buildings', 'industry', 'cross-cutting'],
    instrumentType: 'directive',
    adopted: '2023',
    inForce: '2023',
    scope: 'EU-27',
    meaning: 'First-time binding EU target for an 11.7% reduction in final energy consumption by 2030 relative to the 2020 EU Reference Scenario projections for 2030. Public sector lead: 1.9%/yr energy consumption cut. Energy-intensive companies must run audits and implement cost-effective measures.',
    currentRequirement: 'EU final energy consumption of max 763 Mtoe (and 992.5 Mtoe primary) by 2030 (Art. 4); annual energy savings obligation raised from 0.8% to 1.3% 2024-2025, 1.5% 2026-2027, 1.9% from 2028 (Art. 8).',
    futureRequirement: 'Review in 2027 for 2040 alignment.',
    keyMilestones: [
      { year: 2030, requirement: '-11.7% final energy consumption vs 2020 reference (Art. 4)' },
      { year: 2030, requirement: 'Public sector -1.9%/yr (Art. 5)' },
    ],
    ceLexId: '32023L1791',
    sourceUrl: 'https://energy.ec.europa.eu/topics/energy-efficiency/energy-efficiency-targets-directive-and-rules/energy-efficiency-directive_en',
    articleCitations: [
      'Art. 4: binding EU target — max 763 Mtoe final / 992.5 Mtoe primary by 2030',
      'Art. 5: public sector -1.9%/yr energy consumption',
      'Art. 8: annual energy savings obligation — 1.3% (2024-25), 1.5% (2026-27), 1.9% (from 2028)',
    ],
  },
  {
    id: 'ten-e',
    name: 'TEN-E Regulation (Trans-European Networks for Energy)',
    acronym: 'TEN-E',
    sectors: ['power', 'industry'],
    instrumentType: 'regulation',
    adopted: '2022',
    inForce: '2022',
    scope: 'EU-27',
    meaning: 'Identifies cross-border energy infrastructure "Projects of Common Interest" (PCIs). Excludes new fossil gas from PCI status; adds hydrogen, electrolysers, smart electricity grids, offshore grids and CO₂ transport networks.',
    currentRequirement: '6th PCI list (adopted Nov 2023, published Apr 2024) includes 166 projects. Financial support via CEF Energy (€5.84 bn 2021-2027).',
    futureRequirement: '7th list in 2025; alignment with priority corridors for offshore wind and hydrogen backbone.',
    keyMilestones: [
      { year: 2025, requirement: 'Next PCI list' },
      { year: 2030, requirement: 'EU Offshore Renewable Strategy target: 60 GW offshore wind' },
      { year: 2050, requirement: 'EU Offshore Renewable Strategy target: 300 GW offshore wind' },
    ],
    ceLexId: '32022R0869',
    sourceUrl: 'https://energy.ec.europa.eu/topics/infrastructure/trans-european-networks-energy_en',
  },
  {
    id: 'mdr',
    name: 'Electricity Market Design Reform',
    sectors: ['power'],
    instrumentType: 'regulation',
    adopted: '2024',
    inForce: '2024',
    scope: 'EU-27',
    meaning: 'Reforms EU electricity market design post-2022 energy crisis. Promotes long-term contracts (PPAs, two-way CfDs for new investments in RES and nuclear), strengthens consumer protection, and enables demand response and storage.',
    currentRequirement: 'Mandatory use of two-way CfDs for public support of new generation from 2027 (five-year transition for offshore hybrids).',
    futureRequirement: 'Next review for further flexibility integration.',
    keyMilestones: [
      { year: 2027, requirement: 'CfD obligation for new public support' },
    ],
    ceLexId: '32024R1747',
    eurlexUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1747',
    sourceUrl: 'https://energy.ec.europa.eu/topics/markets-and-consumers/market-legislation/electricity-market-design_en',
  },

  // ── Industry specific ──────────────────────────────────────────────────
  {
    id: 'ied',
    name: 'Industrial Emissions Directive (revised)',
    acronym: 'IED 2.0',
    sectors: ['industry'],
    instrumentType: 'directive',
    adopted: '2024',
    inForce: '2024',
    scope: 'EU-27',
    meaning: 'Regulates ~75,000 industrial installations and livestock farms to prevent and control pollution. The 2024 revision tightens BAT emission limits, extends coverage to metal mining, battery gigafactories and (progressively) pig and poultry farms, and integrates a new Environmental Management System requirement. Cattle are explicitly excluded from the revised scope; the Commission must assess inclusion by end-2026.',
    currentRequirement: 'BAT Conclusions adopted per sector; emission limit values set at stringent end of BAT-AEL range unless justified.',
    futureRequirement: 'Transformation Plans for 2030 and net-zero pathway by 2050 mandatory from 30 June 2030.',
    keyMilestones: [
      { year: 2026, requirement: 'Commission report on cattle inclusion (by 31 Dec 2026)' },
      { year: 2030, requirement: 'Indicative Transformation Plans mandatory (from 30 June 2030)' },
      { year: 2050, requirement: 'Net-zero, pollution-free goal' },
    ],
    ceLexId: '32024L1785',
    sourceUrl: 'https://environment.ec.europa.eu/topics/industrial-emissions-and-safety_en',
    articleCitations: [
      'Directive 2024/1785: extends IED scope to metal mining and battery gigafactories',
      'Cattle explicitly excluded; Commission assessment by 31 December 2026',
      'Indicative Transformation Plans in EMS from 30 June 2030',
    ],
  },
  {
    id: 'innovation-fund',
    name: 'Innovation Fund',
    sectors: ['industry', 'power'],
    instrumentType: 'fund',
    adopted: '2019',
    inForce: '2019',
    scope: 'EU-27',
    meaning: "One of the world's largest funding programmes for the demonstration of innovative low-carbon technologies. Financed from ETS revenues (530M allowances) — around €40 bn over 2020-2030 (estimate at ~€75/tCO₂). Priority: hydrogen, CCS/CCU, clean steel, cement, batteries.",
    currentRequirement: 'Annual calls; 2024 cycle mobilised around €4.6 bn (€2.4 bn general call + €1.0 bn battery call + €1.2 bn second Hydrogen Bank auction).',
    futureRequirement: 'Scale-up expected in post-2027 MFF.',
    keyMilestones: [
      { year: 2030, requirement: '~€40 bn total disbursed (estimate, price-dependent)' },
    ],
    ceLexId: '32019R0856',
    eurlexUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019R0856',
    sourceUrl: 'https://cinea.ec.europa.eu/programmes/innovation-fund_en',
    articleCitations: [
      'Delegated Reg. 2019/856: operational rules for the Innovation Fund',
      'Art. 10a(8) of Directive 2003/87/EC (as amended): 530M allowances for IF financing',
    ],
  },
  {
    id: 'net-zero-industry-act',
    name: 'Net-Zero Industry Act',
    acronym: 'NZIA',
    sectors: ['industry'],
    instrumentType: 'regulation',
    adopted: '2024',
    inForce: '2024',
    scope: 'EU-27',
    meaning: 'Targets 40% of EU clean-tech needs to be manufactured in the EU by 2030. Fast-tracks permitting for net-zero strategic projects, creates regulatory sandboxes, and supports skills via Net-Zero Industry Academies.',
    currentRequirement: 'Member State list of strategic projects; 12-18 month permit deadlines (Art. 6); 50 Mt/yr CO₂ storage injection capacity target by 2030 (Art. 20).',
    futureRequirement: 'Review 2027.',
    keyMilestones: [
      { year: 2030, requirement: '40% domestic clean-tech manufacturing (Art. 1)' },
      { year: 2030, requirement: '50 Mt/yr CO₂ injection capacity (Art. 20)' },
    ],
    ceLexId: '32024R1735',
    eurlexUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1735',
    sourceUrl: 'https://single-market-economy.ec.europa.eu/industry/sustainability/net-zero-industry-act_en',
    articleCitations: [
      'Art. 1 (Reg. 2024/1735): benchmark ≥40% of EU clean-tech deployment needs manufactured domestically by 2030',
      'Art. 6: permit deadlines 12 months (strategic projects) / 18 months (non-strategic)',
      'Art. 20: EU-wide ≥50 Mt/yr CO₂ injection capacity by 2030',
      'Art. 23: EU oil/gas producers must contribute to CO₂ storage target pro-rata',
    ],
  },
  {
    id: 'critical-raw-materials-act',
    name: 'Critical Raw Materials Act',
    acronym: 'CRMA',
    sectors: ['industry'],
    instrumentType: 'regulation',
    adopted: '2024',
    inForce: '2024',
    scope: 'EU-27',
    meaning: 'Secures EU supply of critical and strategic raw materials for the green and digital transitions. Indicative 2030 benchmarks that EU capacity should approach or reach: 10% extraction, 40% processing, 25% recycling from EU sources; max 65% of annual consumption of any strategic raw material from a single third country at any relevant processing stage.',
    currentRequirement: 'Strategic Projects list; joint purchasing mechanism.',
    futureRequirement: 'Review for alignment with 2040 targets.',
    keyMilestones: [
      { year: 2030, requirement: '10/40/25% indicative EU benchmarks' },
    ],
    ceLexId: '32024R1252',
    sourceUrl: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en',
  },

  // ── Buildings ──────────────────────────────────────────────────────────
  {
    id: 'epbd',
    name: 'Energy Performance of Buildings Directive (recast)',
    acronym: 'EPBD',
    sectors: ['buildings'],
    instrumentType: 'directive',
    adopted: '2024',
    inForce: '2024',
    scope: 'EU-27',
    meaning: 'Sets the pathway for a zero-emission building stock by 2050. All new buildings must be zero-emission from 2028 (public) / 2030 (private). Member States must reduce average primary energy use of residential buildings by 16% by 2030 and 20-22% by 2035.',
    currentRequirement: 'Minimum Energy Performance Standards (MEPS) for worst-performing buildings (Art. 9(1)); phase-out of stand-alone fossil boilers from 2040 (Art. 13); ban on subsidies for stand-alone fossil boilers from 1 Jan 2025 (Art. 17(15)).',
    futureRequirement: 'Full ZEB stock by 2050.',
    keyMilestones: [
      { year: 2025, requirement: 'Subsidies for stand-alone fossil boilers discontinued (Art. 17(15))' },
      { year: 2028, requirement: 'New public buildings must be ZEB (Art. 7)' },
      { year: 2030, requirement: 'All new buildings must be ZEB (Art. 7); -16% residential primary energy (Art. 9(2)); worst 16% non-residential upgraded (Art. 9(1))' },
      { year: 2033, requirement: 'Worst 26% non-residential upgraded (Art. 9(1))' },
      { year: 2035, requirement: '-20-22% residential primary energy vs 2020 (Art. 9(2))' },
      { year: 2040, requirement: 'Fossil boiler phase-out (Art. 13)' },
      { year: 2050, requirement: 'Full ZEB stock' },
    ],
    ceLexId: '32024L1275',
    sourceUrl: 'https://energy.ec.europa.eu/topics/energy-efficiency/energy-efficient-buildings/energy-performance-buildings-directive_en',
    articleCitations: [
      'Art. 7: new public buildings ZEB from 2028; all new buildings ZEB from 2030',
      'Art. 9(1): MEPS — worst 16% non-residential by 2030, worst 26% by 2033',
      'Art. 9(2): residential primary energy — -16% by 2030, -20-22% by 2035 vs 2020',
      'Art. 13 & Annex II: fossil boiler phase-out roadmap, target 2040',
      'Art. 17(15): no new subsidies for stand-alone fossil boilers from 1 January 2025',
    ],
  },
  {
    id: 'sclf',
    name: 'Social Climate Fund',
    acronym: 'SCF',
    sectors: ['buildings', 'transport-road'],
    instrumentType: 'fund',
    adopted: '2023',
    inForce: '2023 (operational from 2026)',
    scope: 'EU-27',
    meaning: 'EU fund supporting vulnerable households, micro-enterprises and transport users affected by the inclusion of buildings and road transport in ETS2. Total resources up to €86.7 bn over 2026-2032 (EU envelope up to €65 bn (Art. 10) plus mandatory 25% national co-financing), financed from ETS2 revenues.',
    currentRequirement: 'Member States must submit Social Climate Plans by 30 June 2025 (Art. 4(1)).',
    futureRequirement: 'Full implementation 2026-2032.',
    keyMilestones: [
      { year: 2025, requirement: 'Social Climate Plans submitted (Art. 4(1))' },
      { year: 2026, requirement: 'Disbursement starts' },
    ],
    ceLexId: '32023R0955',
    sourceUrl: 'https://climate.ec.europa.eu/eu-action/european-green-deal/delivering-european-green-deal/social-climate-fund_en',
    articleCitations: [
      'Art. 10 (Reg. 2023/955): max EU financial allocation €65 bn for 2026-2032',
      'Art. 4(1): Social Climate Plans due by 30 June 2025',
      'Art. 15: Member States must contribute ≥25% of estimated total costs',
    ],
  },
  {
    id: 'ecodesign',
    name: 'Ecodesign for Sustainable Products Regulation',
    acronym: 'ESPR',
    sectors: ['buildings', 'industry', 'cross-cutting'],
    instrumentType: 'regulation',
    adopted: '2024',
    inForce: '2024',
    scope: 'EU-27',
    meaning: 'Replaces the Ecodesign Directive. Extends ecodesign requirements to almost all physical products, sets rules on durability, repairability, recycled content, energy and resource efficiency, and introduces Digital Product Passports.',
    currentRequirement: 'Working Plan 2025-2030 (adopted April 2025); priority final products: textiles/apparel, furniture, mattresses, tyres; priority intermediates: iron and steel, aluminium.',
    futureRequirement: 'Rolling product-group delegated acts through 2030.',
    keyMilestones: [
      { year: 2026, requirement: 'First delegated acts for priority products' },
    ],
    ceLexId: '32024R1781',
    sourceUrl: 'https://commission.europa.eu/energy-climate-change-environment/standards-tools-and-labels/products-labelling-rules-and-requirements/ecodesign-sustainable-products-regulation_en',
  },

  // ── Road transport ─────────────────────────────────────────────────────
  {
    id: 'co2-cars-vans',
    name: 'CO₂ Standards for Cars and Vans',
    sectors: ['transport-road'],
    instrumentType: 'standard',
    adopted: '2023',
    inForce: '2023 (targets apply from 2025)',
    scope: 'EU-27',
    meaning: 'Tightens fleet-wide CO₂ emission targets for new passenger cars and light commercial vehicles. Sets a 100% reduction from 2035, effectively ending sales of new CO₂-emitting cars and vans.',
    currentRequirement: '-55% (cars) and -50% (vans) by 2030 vs 2021 (Art. 1, amending Reg. 2019/631); -100% from 2035. Review by 31 December 2026.',
    futureRequirement: 'Possible review adjusting the 2035 phase-out and adding heavy-duty coverage.',
    keyMilestones: [
      { year: 2030, requirement: '-55% cars / -50% vans (Art. 1, Reg. 2023/851)' },
      { year: 2035, requirement: '-100% (zero tailpipe CO₂) (Art. 1, Reg. 2023/851)' },
    ],
    ceLexId: '32023R0851',
    sourceUrl: 'https://climate.ec.europa.eu/eu-action/transport/road-transport-reducing-co2-emissions-vehicles/co2-emission-performance-standards-cars-and-vans_en',
    articleCitations: [
      'Art. 1 (Reg. 2023/851, amending Reg. 2019/631): -55% cars / -50% vans by 2030 vs 2021; -100% from 2035',
      'Art. 14a (inserted by Reg. 2023/851 into Reg. 2019/631): review by 31 December 2026 for real-world data methodology and technological developments including e-fuels',
    ],
  },
  {
    id: 'co2-hdv',
    name: 'CO₂ Standards for Heavy-Duty Vehicles',
    sectors: ['transport-road'],
    instrumentType: 'standard',
    adopted: '2024',
    inForce: '2024',
    scope: 'EU-27',
    meaning: 'New CO₂ targets for trucks, buses and trailers: -45% 2030, -65% 2035, -90% 2040 vs 2019. All new urban buses must be zero-emission from 2035.',
    currentRequirement: '-45% in 2030 vs 2019 reference (Art. 3a, Reg. 2024/1610 amending Reg. 2019/1242); zero-emission urban buses from 2035.',
    futureRequirement: 'Review 2027 to assess technology readiness.',
    keyMilestones: [
      { year: 2030, requirement: '-45% (Art. 3a, Reg. 2024/1610); 90% zero-emission urban buses' },
      { year: 2035, requirement: '-65%; 100% zero-emission urban buses (Art. 3b)' },
      { year: 2040, requirement: '-90% (Art. 3a)' },
    ],
    ceLexId: '32024R1610',
    sourceUrl: 'https://climate.ec.europa.eu/eu-action/transport/road-transport-reducing-co2-emissions-vehicles/reducing-co2-emissions-heavy-duty-vehicles_en',
    articleCitations: [
      'Art. 3a (Reg. 2024/1610, amending Reg. 2019/1242): -45% (2030), -65% (2035), -90% (2040) vs 2019 reference',
      'Art. 3b: 90% zero-emission urban buses by 2030, 100% from 2035',
    ],
  },
  {
    id: 'afir',
    name: 'Alternative Fuels Infrastructure Regulation',
    acronym: 'AFIR',
    sectors: ['transport-road', 'transport-maritime'],
    instrumentType: 'regulation',
    adopted: '2023',
    inForce: '2024',
    scope: 'EU-27',
    meaning: 'Mandatory deployment targets for EV charging and hydrogen refuelling along the TEN-T core network. Also covers shore-side electricity and LNG in ports.',
    currentRequirement: 'Fast-charging pools every 60 km on TEN-T core by end-2025 (Art. 3); H₂ stations every 200 km on core by 2030 (Art. 6); cold-ironing in major TEN-T ports by 2030.',
    futureRequirement: 'Extension to comprehensive TEN-T by 2035.',
    keyMilestones: [
      { year: 2025, requirement: 'Fast charging every 60 km on core TEN-T (Art. 3, ≥400 kW/pool)' },
      { year: 2030, requirement: 'H₂ every 200 km (Art. 6, ≥1 t/day, 700 bar); ports cold-ironing' },
    ],
    ceLexId: '32023R1804',
    articleCitations: [
      'Art. 3: publicly accessible recharging pools every 60 km on TEN-T core by 31 Dec 2025 (≥400 kW)',
      'Art. 6: H₂ refuelling stations every 200 km on TEN-T core by 31 Dec 2030 (≥1 t/day, ≥700 bar)',
    ],
    sourceUrl: 'https://transport.ec.europa.eu/transport-themes/clean-transport/alternative-fuels-sustainable-mobility-europe/alternative-fuels-infrastructure_en',
  },
  {
    id: 'eurovignette',
    name: 'Eurovignette Directive',
    sectors: ['transport-road'],
    instrumentType: 'directive',
    adopted: '2022',
    inForce: '2022',
    scope: 'EU-27',
    meaning: "Allows and encourages Member States to introduce distance-based road charging for heavy-duty vehicles that differentiates by CO₂ emissions class, internalising both infrastructure and external (climate/air quality) costs.",
    currentRequirement: 'CO₂ differentiation of HDV tolls mandatory from 25 March 2024 for distance-based toll systems; from 25 March 2025 for time-based user charges (LU/NL/SE — Denmark left the Eurovignette system 31 Dec 2024, switching to km-based tolling); transposition deadline 25 March 2024.',
    futureRequirement: 'Phase-out of time-based vignettes on TEN-T core network for HDVs by 2030; extension to vans and passenger cars optional.',
    keyMilestones: [
      { year: 2024, requirement: 'CO₂ differentiation of HDV tolls mandatory' },
      { year: 2030, requirement: 'Vignettes phased out on TEN-T core for HDVs' },
    ],
    ceLexId: '32022L0362',
    sourceUrl: 'https://transport.ec.europa.eu/transport-modes/road/road-charging/eurovignette-directive_en',
    articleCitations: [
      'Art. 7ga (Directive 2022/362): CO₂-based variation of infrastructure charges for HDVs',
      'Art. 7gb: external-cost charging differentiation by CO₂ class',
      'Art. 7da: phase-out of time-based user charges on TEN-T core for HDVs by 25 March 2030',
    ],
  },

  // ── Maritime ───────────────────────────────────────────────────────────
  {
    id: 'fueleu-maritime',
    name: 'FuelEU Maritime Regulation',
    sectors: ['transport-maritime'],
    instrumentType: 'regulation',
    adopted: '2023',
    inForce: '2025',
    scope: 'EU-27; ships > 5,000 GT arriving at or departing from EU ports',
    meaning: 'Sets a lifecycle GHG-intensity limit for energy used on board ships arriving at or departing from EU ports (100% for voyages within EU, 50% for extra-EU). Encourages uptake of sustainable and scalable fuels (bio-LNG, e-methanol, green ammonia, hydrogen) and rewards RFNBO use via a 2x multiplier until 2033.',
    currentRequirement: 'GHG intensity reduction -2% from 2025 vs 2020 reference (91.16 gCO₂e/MJ) (Art. 4(2), Annex II).',
    futureRequirement: 'Steeper reductions: -6% 2030, -14.5% 2035, -31% 2040, -62% 2045, -80% 2050 (Art. 4(2), Annex II).',
    keyMilestones: [
      { year: 2025, requirement: '-2% GHG intensity (Art. 4(2), Annex II)' },
      { year: 2030, requirement: '-6% (Art. 4(2), Annex II)' },
      { year: 2034, requirement: 'RFNBO 2% sub-target applies if 2031 uptake <1% (Art. 5(3))' },
      { year: 2035, requirement: '-14.5% (Art. 4(2), Annex II)' },
      { year: 2040, requirement: '-31% (Art. 4(2), Annex II)' },
      { year: 2050, requirement: '-80% (Art. 4(2), Annex II)' },
    ],
    ceLexId: '32023R1805',
    sourceUrl: 'https://transport.ec.europa.eu/transport-modes/maritime/decarbonising-maritime-transport-fueleu-maritime_en',
    articleCitations: [
      'Art. 4(2) & Annex II: GHG intensity reduction schedule — -2% (2025), -6% (2030), -14.5% (2035), -31% (2040), -62% (2045), -80% (2050) vs reference 91.16 gCO₂e/MJ',
      'Art. 5(3): RFNBO 2% sub-target from 1 Jan 2034 if share <1% in 2031 reporting period',
      'Art. 5(1): RFNBO 2x multiplier until 31 December 2033',
      'Art. 2(1): scope — ships >5,000 GT; 100% intra-EU voyages, 50% extra-EU voyages',
    ],
  },
  {
    id: 'eu-ets-maritime',
    name: 'EU ETS for Maritime',
    sectors: ['transport-maritime'],
    instrumentType: 'cap-and-trade',
    adopted: '2023',
    inForce: '2024',
    scope: 'EU-27; ships > 5,000 GT',
    meaning: 'Extension of the EU ETS to maritime transport. Covers 100% of emissions from intra-EU voyages and 50% of extra-EU voyages arriving at/departing from EU ports. Phased in 2024-2026.',
    currentRequirement: '40% of emissions subject to surrender in 2024, 70% in 2025, 100% from 2026 (Art. 3gb, Directive 2023/959). Non-CO₂ GHGs (CH₄, N₂O) included from 2026.',
    futureRequirement: 'Commission report by 31 December 2026 on feasibility of extending to ships 400-5,000 GT (Art. 3gg(5)).',
    keyMilestones: [
      { year: 2024, requirement: '40% surrender (Art. 3gb)' },
      { year: 2025, requirement: '70% surrender (Art. 3gb)' },
      { year: 2026, requirement: '100% surrender; non-CO₂ GHGs included (Art. 3gb, Recital 28); Commission report on 400-5,000 GT extension (Art. 3gg(5))' },
    ],
    ceLexId: '32023L0959',
    eurlexUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L0959',
    sourceUrl: 'https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets/reducing-emissions-shipping-sector_en',
    articleCitations: [
      'Art. 3gb (Directive 2023/959): maritime phase-in — 40% (2024), 70% (2025), 100% (2026+)',
      'Art. 3ga (Directive 2023/959): scope of application to maritime transport activities',
      'Recital 28 (Directive 2023/959): CH₄ and N₂O from maritime included in ETS from 2026',
      'Art. 3gg(5) (Directive 2023/959): Commission report by 31 Dec 2026 on 400-5,000 GT extension',
    ],
  },
  {
    id: 'mrv-maritime',
    name: 'Maritime MRV Regulation',
    sectors: ['transport-maritime'],
    instrumentType: 'regulation',
    adopted: '2015, revised 2023',
    inForce: '2015 (monitoring obligations from 2018)',
    scope: 'EU-27 + ships > 5,000 GT calling at EU ports',
    meaning: 'Monitoring, Reporting and Verification (MRV) of CO₂, CH₄ and N₂O emissions from large ships. Underpins ETS coverage and FuelEU Maritime.',
    currentRequirement: 'Annual verified emissions reports; CH₄/N₂O monitoring added from 1 Jan 2024; offshore ships (≥ 400 GT) and general cargo ships 400-5,000 GT added from 1 Jan 2025.',
    futureRequirement: 'Review in conjunction with ETS2 maritime extension.',
    keyMilestones: [
      { year: 2024, requirement: 'CH₄ and N₂O monitoring added (Reg. 2023/957)' },
      { year: 2025, requirement: 'Expanded to offshore ships ≥ 400 GT and general cargo 400-5,000 GT' },
    ],
    ceLexId: '32015R0757',
    sourceUrl: 'https://climate.ec.europa.eu/eu-action/transport/reducing-emissions-shipping-sector/monitoring-reporting-and-verification-maritime-transport-emissions_en',
  },

  // ── Aviation ───────────────────────────────────────────────────────────
  {
    id: 'refueleu-aviation',
    name: 'ReFuelEU Aviation',
    sectors: ['transport-aviation'],
    instrumentType: 'regulation',
    adopted: '2023',
    inForce: '2024',
    scope: 'EU-27 airports (≥800k pax or ≥100k t freight); fuel suppliers and aircraft operators (≥500 pax flights or ≥52 cargo flights from EU airports)',
    meaning: 'Blending mandate requiring an increasing share of sustainable aviation fuel (SAF), including a dedicated RFNBO (e-kerosene) sub-target. Also caps tankering and requires SAF to be made available at EU airports. Entered into force November 2023; generally applies from 1 January 2024, with blending obligations from 1 January 2025.',
    currentRequirement: 'From 2025: minimum 2% SAF in all aviation fuel at EU airports (Art. 4(1)(a), Annex I(a)); no RFNBO sub-target until 2030.',
    futureRequirement: 'Steep ramp-up: 6% SAF (avg 1.2% RFNBO, min 0.7%/yr) in 2030, 20% SAF (5% RFNBO) in 2035, 34% (10%) 2040, 42% (15%) 2045, 70% (35%) 2050.',
    keyMilestones: [
      { year: 2025, requirement: '2% SAF (Annex I(a))' },
      { year: 2030, requirement: '6% SAF; avg 1.2% RFNBO over 2030-2031, min 0.7%/yr (Annex I(b)(i))' },
      { year: 2032, requirement: 'Avg 2.0% RFNBO over 2032-2034, min 1.2% in 2032-2033, min 2.0% in 2034 (Annex I(b)(ii))' },
      { year: 2035, requirement: '20% SAF, 5% RFNBO (Annex I(c))' },
      { year: 2040, requirement: '34% SAF, 10% RFNBO (Annex I(d))' },
      { year: 2045, requirement: '42% SAF, 15% RFNBO (Annex I(e))' },
      { year: 2050, requirement: '70% SAF, 35% RFNBO (Annex I(f))' },
    ],
    ceLexId: '32023R2405',
    sourceUrl: 'https://transport.ec.europa.eu/transport-modes/air/environment/refueleu-aviation_en',
    articleCitations: [
      'Art. 4(1) & Annex I: SAF blending mandate schedule — 2% (2025), 6% (2030), 20% (2035), 34% (2040), 42% (2045), 70% (2050)',
      'Annex I(b)(i): synthetic aviation fuel sub-target — avg 1.2% over 2030-2031, annual min 0.7%',
      'Annex I(b)(ii): synthetic aviation fuel sub-target — avg 2.0% over 2032-2034, min 1.2% (2032-33), min 2.0% (2034)',
      'Annex I(c)-(f): RFNBO sub-targets — 5% (2035), 10% (2040), 15% (2045), 35% (2050)',
      'Art. 2(1) & Art. 3(1)(3): scope — Union airports ≥800k pax/≥100k t freight; aircraft operators ≥500 pax flights/≥52 cargo flights',
      'Art. 18: entry into force 20 November 2023; general application from 1 January 2024; Art. 4-6, 8, 10 apply from 1 January 2025',
    ],
  },
  {
    id: 'eu-ets-aviation',
    name: 'EU ETS Aviation',
    sectors: ['transport-aviation'],
    instrumentType: 'cap-and-trade',
    adopted: '2008, revised 2023',
    inForce: '2012',
    scope: 'EU-27 + EEA-EFTA; flights within EEA',
    meaning: 'Covers CO₂ from intra-EEA flights plus EEA-to-UK and EEA-to-Switzerland flights. Free allocation for aviation phased out 2024-2026; non-CO₂ impacts MRV from 2025.',
    currentRequirement: 'Cap tightened under the Fit for 55 LRF; free allocation to aircraft operators phased out 2024-2026 (full auctioning from 2026, with 20 million allowances reserved for SAF support through 2030) (Directive 2023/958, Art. 1).',
    futureRequirement: 'Review 2027 to cover non-CO₂ effects in the ETS.',
    keyMilestones: [
      { year: 2026, requirement: 'End of free allocation (Directive 2023/958, Art. 1)' },
      { year: 2027, requirement: 'Possible non-CO₂ pricing' },
    ],
    ceLexId: '32023L0958',
    eurlexUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L0958',
    sourceUrl: 'https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets/reducing-emissions-aviation-sector_en',
    articleCitations: [
      'Directive 2023/958, Art. 1: aviation free allocation phased out 2024-2026; 20M allowances for SAF through 2030',
    ],
  },
  {
    id: 'corsia',
    name: 'CORSIA (ICAO) Implementation',
    sectors: ['transport-aviation'],
    instrumentType: 'target',
    adopted: '2016',
    inForce: '2021',
    scope: 'ICAO Member States; extra-EEA international flights',
    meaning: "ICAO's Carbon Offsetting and Reduction Scheme for International Aviation caps net CO₂ from international flights at 85% of 2019 levels from 2024. The EU implements CORSIA for extra-EEA flights departing from and arriving at the EEA.",
    currentRequirement: 'First phase 2024-2026: offsetting for growth above 85% of 2019 baseline.',
    futureRequirement: 'Mandatory phase from 2027 for all ICAO states.',
    keyMilestones: [
      { year: 2027, requirement: 'CORSIA mandatory phase' },
      { year: 2035, requirement: 'CORSIA review for post-2035 regime' },
    ],
    ceLexId: '32023L0958',
    eurlexUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L0958',
    sourceUrl: 'https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets/reducing-emissions-aviation-sector/international-carbon-offsetting-and-reduction-scheme-international-aviation-corsia_en',
  },

  // ── Agriculture, LULUCF, nature ────────────────────────────────────────
  {
    id: 'cap',
    name: 'Common Agricultural Policy (post-2023)',
    acronym: 'CAP',
    sectors: ['agriculture', 'lulucf'],
    instrumentType: 'fund',
    adopted: '2021',
    inForce: '2023',
    scope: 'EU-27',
    meaning: 'EU CAP 2023-2027 (≈€307 bn total public expenditure incl. national co-financing) ring-fences 40% of its expenditure for climate-relevant spending. Introduces eco-schemes (Pillar I) and strengthens conditionality: enhanced GAEC including peatland/wetland protection (GAEC 2), minimum soil cover (GAEC 6) and crop rotation (GAEC 7).',
    currentRequirement: 'At least 25% of Pillar I direct payments spent on eco-schemes; good agricultural and environmental condition on all receiving farms.',
    futureRequirement: 'Mid-term review aligning with 2040 climate and nature targets; post-2027 CAP reform.',
    keyMilestones: [
      { year: 2025, requirement: 'CAP mid-term review' },
      { year: 2028, requirement: 'Post-2027 CAP framework adopted' },
    ],
    ceLexId: '32021R2115',
    eurlexUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R2115',
    sourceUrl: 'https://agriculture.ec.europa.eu/common-agricultural-policy/cap-overview/new-cap-2023-27_en',
    articleCitations: [
      'Art. 31 (Reg. 2021/2115): minimum 25% of Pillar I direct payments for eco-schemes',
      'Art. 97(1): at least 35% of EAFRD (Pillar II) for environmental/climate objectives',
      'Annex III: GAEC 2 (peatland/wetland), GAEC 6 (minimum soil cover), GAEC 7 (crop rotation)',
    ],
  },
  {
    id: 'nec',
    name: 'National Emission Ceilings Directive',
    acronym: 'NEC',
    sectors: ['agriculture', 'industry', 'transport-road'],
    instrumentType: 'directive',
    adopted: '2016',
    inForce: '2016',
    scope: 'EU-27',
    meaning: 'Sets binding national emission reduction commitments for five key air pollutants — SO₂, NOₓ, NMVOC, NH₃ and PM2.5 — with agriculture the main source of ammonia.',
    currentRequirement: '2020-2029 reduction commitments; from 2030 more stringent commitments apply.',
    futureRequirement: 'Zero Pollution Action Plan (COM(2021) 400) target: -55% premature deaths from PM2.5 exposure by 2030 vs 2005.',
    keyMilestones: [
      { year: 2030, requirement: 'Stricter national emission commitments' },
    ],
    ceLexId: '32016L2284',
    sourceUrl: 'https://environment.ec.europa.eu/topics/air/reducing-emissions-air-pollutants_en',
    articleCitations: [
      'Art. 4 & Annex II (Directive 2016/2284): national emission reduction commitments for 2020-2029 and from 2030',
      'Art. 6: national air pollution control programmes',
    ],
  },
  {
    id: 'farm-to-fork',
    name: 'Farm to Fork Strategy',
    sectors: ['agriculture'],
    instrumentType: 'target',
    adopted: '2020',
    inForce: '2020',
    scope: 'EU-27',
    meaning: 'Strategy at the heart of the European Green Deal for a fair, healthy and environmentally-friendly food system. Sets 2030 targets for pesticide reduction (-50%), nutrient losses (-50%), fertiliser use (-20%), antimicrobial use (-50%) and organic farming (25% of agricultural area).',
    currentRequirement: 'Legislative proposals ongoing (e.g. Sustainable Use of Pesticides Regulation withdrawn 6 Feb 2024); targets politically committed.',
    futureRequirement: 'Revised roadmap expected in new Commission mandate.',
    keyMilestones: [
      { year: 2030, requirement: '25% organic, -50% pesticides, -50% nutrient losses' },
    ],
    ceLexId: '52020DC0381',
    eurlexUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52020DC0381',
    sourceUrl: 'https://food.ec.europa.eu/horizontal-topics/farm-fork-strategy_en',
  },
  {
    id: 'lulucf-regulation',
    name: 'LULUCF Regulation',
    sectors: ['lulucf'],
    instrumentType: 'regulation',
    adopted: '2018, revised 2023',
    inForce: '2018 (first compliance period from 2021)',
    scope: 'EU-27',
    meaning: 'Sets EU-wide and national targets for net greenhouse gas removals from land use, land-use change and forestry. Ends the "no debit" rule; from 2026 targets become binding absolute removal values.',
    currentRequirement: 'EU target of -310 MtCO₂e net removals by 2030 (Reg. 2023/839, amending Annex IIa). National binding targets from 2026.',
    futureRequirement: 'Review 2025 for 2040 alignment; carbon farming certification scheme under development.',
    keyMilestones: [
      { year: 2026, requirement: 'National binding absolute removal targets begin (Reg. 2023/839)' },
      { year: 2030, requirement: '-310 MtCO₂e EU-wide net removals (Reg. 2023/839, Annex IIa)' },
    ],
    ceLexId: '32018R0841',
    sourceUrl: 'https://climate.ec.europa.eu/eu-action/land-use-sector/land-use-and-forestry-regulation-2021-2030_en',
    articleCitations: [
      'Reg. 2023/839 (amending Reg. 2018/841), Annex IIa: EU-wide -310 MtCO₂e net removals by 2030',
      'Reg. 2023/839: national binding absolute targets from 2026',
    ],
  },
  {
    id: 'nature-restoration-law',
    name: 'Nature Restoration Law',
    sectors: ['lulucf', 'agriculture'],
    instrumentType: 'regulation',
    adopted: '2024',
    inForce: '2024',
    scope: 'EU-27',
    meaning: "First continent-wide law to restore degraded ecosystems. Requires restoration measures covering at least 20% of the EU's land and sea areas by 2030, and all ecosystems in need of restoration by 2050. Includes peatland rewetting, pollinator recovery and urban green targets.",
    currentRequirement: 'Draft National Restoration Plans due by 1 September 2026 (Art. 14-15).',
    futureRequirement: 'For habitat types not in good condition, restoration measures must cover at least 30% by 2030, 60% by 2040 and 90% by 2050 (Art. 4).',
    keyMilestones: [
      { year: 2030, requirement: '20% land/sea restoration measures (Art. 1); 30% of habitats not in good condition (Art. 4)' },
      { year: 2040, requirement: '60% of habitats not in good condition (Art. 4)' },
      { year: 2050, requirement: '90% of habitats not in good condition (Art. 4)' },
    ],
    ceLexId: '32024R1991',
    eurlexUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1991',
    sourceUrl: 'https://environment.ec.europa.eu/topics/nature-and-biodiversity/nature-restoration-law_en',
    articleCitations: [
      'Art. 1: restoration measures covering ≥20% of EU land and ≥20% of sea areas by 2030',
      'Art. 4: habitats not in good condition — 30% by 2030, 60% by 2040, 90% by 2050',
      'Art. 14-15: draft National Restoration Plans due by 1 September 2026',
    ],
  },
  {
    id: 'forest-strategy',
    name: 'EU Forest Strategy for 2030',
    sectors: ['lulucf'],
    instrumentType: 'target',
    adopted: '2021',
    inForce: '2021',
    scope: 'EU-27',
    meaning: 'Strategic framework for sustainable forest management, biodiversity protection and carbon sequestration. Includes a pledge to plant at least 3 billion additional trees across the EU by 2030.',
    currentRequirement: 'Monitoring system under development; 3 billion trees tracker operational.',
    futureRequirement: 'Forest Monitoring Regulation proposal rejected by European Parliament on 21 October 2025; legislative process stalled.',
    keyMilestones: [
      { year: 2030, requirement: '3 billion additional trees' },
    ],
    ceLexId: '52021DC0572',
    eurlexUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52021DC0572',
    sourceUrl: 'https://environment.ec.europa.eu/strategy/forest-strategy_en',
  },
  {
    id: 'deforestation-regulation',
    name: 'Deforestation-free Products Regulation',
    acronym: 'EUDR',
    sectors: ['lulucf', 'agriculture', 'cross-cutting'],
    instrumentType: 'regulation',
    adopted: '2023',
    inForce: '2023; application delayed to 30 Dec 2026 (large operators) / 30 Jun 2027 (SMEs)',
    scope: 'EU-27; placing on market and export of cattle, cocoa, coffee, palm oil, rubber, soya, wood',
    meaning: 'Prohibits placing on the EU market, or exporting from the EU, products linked to deforestation or forest degradation after 31 December 2020. Requires due diligence statements and geolocation of production plots.',
    currentRequirement: 'Application twice postponed: first by Reg. 2024/3234 (to Dec 2025/Jun 2026), then by Reg. 2025/2650 (to 30 Dec 2026 for large operators / 30 Jun 2027 for micro and small enterprises).',
    futureRequirement: 'General review postponed to 30 June 2030 by Reg. 2025/2650; potential extension to other ecosystems (savannahs, peatlands) and additional commodities.',
    keyMilestones: [
      { year: 2026, requirement: 'Compliance for large operators (30 Dec; Reg. 2025/2650)' },
      { year: 2027, requirement: 'Compliance for SMEs (30 Jun; Reg. 2025/2650)' },
      { year: 2030, requirement: 'General review (30 Jun; postponed from 2028 by Reg. 2025/2650)' },
    ],
    ceLexId: '32023R1115',
    sourceUrl: 'https://environment.ec.europa.eu/topics/forests/deforestation/regulation-deforestation-free-products_en',
    articleCitations: [
      'Art. 2(13) (Reg. 2023/1115): deforestation cut-off date 31 December 2020',
      'Art. 4: prohibition on placing deforestation-linked products on EU market',
      'Reg. 2025/2650: second postponement — large operators 30 Dec 2026, SMEs 30 Jun 2027',
    ],
  },

  // ── Waste & methane ────────────────────────────────────────────────────
  {
    id: 'waste-framework-directive',
    name: 'Waste Framework Directive',
    sectors: ['waste', 'cross-cutting'],
    instrumentType: 'directive',
    adopted: '2008, revised 2018 & ongoing',
    inForce: '2008',
    scope: 'EU-27',
    meaning: 'Foundational EU waste law establishing the waste hierarchy (prevention → re-use → recycling → recovery → disposal). Sets recycling targets for municipal (60% 2030, 65% 2035) and packaging waste.',
    currentRequirement: 'Separate collection of bio-waste (from 31 Dec 2023), textiles and hazardous household waste (from 1 Jan 2025). Municipal recycling: 55% by 2025, 60% by 2030, 65% by 2035.',
    futureRequirement: '2023-2024 revision adds food waste and textile-specific EPR schemes.',
    keyMilestones: [
      { year: 2030, requirement: '60% municipal recycling' },
      { year: 2035, requirement: '65% municipal recycling; max 10% landfilling' },
    ],
    ceLexId: '32008L0098',
    sourceUrl: 'https://environment.ec.europa.eu/topics/waste-and-recycling/waste-framework-directive_en',
    articleCitations: [
      'Art. 4 (Directive 2008/98/EC): waste hierarchy — prevention, preparing for re-use, recycling, other recovery, disposal',
      'Art. 11(2) (as amended by Directive 2018/851): municipal recycling — 55% by 2025, 60% by 2030, 65% by 2035',
      'Art. 22: separate bio-waste collection by 31 December 2023',
      'Art. 11(1): separate collection of textiles by 1 January 2025',
    ],
  },
  {
    id: 'landfill-directive',
    name: 'Landfill Directive',
    sectors: ['waste'],
    instrumentType: 'directive',
    adopted: '1999, revised 2018',
    inForce: '1999',
    scope: 'EU-27',
    meaning: 'Strict operational and technical requirements for landfills. Sets a cap of 10% of municipal waste that can be landfilled by 2035.',
    currentRequirement: 'Phased reduction of biodegradable waste to landfill; methane capture mandatory.',
    futureRequirement: 'Alignment with methane reduction pathway.',
    keyMilestones: [
      { year: 2035, requirement: 'Max 10% municipal waste to landfill' },
    ],
    ceLexId: '31999L0031',
    sourceUrl: 'https://environment.ec.europa.eu/topics/waste-and-recycling/landfill-waste_en',
    articleCitations: [
      'Art. 5(5) (as amended by Directive 2018/850): max 10% of total municipal waste to landfill by 2035',
    ],
  },
  {
    id: 'methane-regulation',
    name: 'EU Methane Regulation (energy sector)',
    sectors: ['industry', 'waste', 'cross-cutting'],
    instrumentType: 'regulation',
    adopted: '2024',
    inForce: '2024',
    scope: 'EU-27; oil, gas and coal',
    meaning: 'First EU law targeting methane emissions in the energy sector. Requires measurement, reporting, verification, leak detection and repair, bans routine venting and flaring, and introduces methane-related obligations on imported fossil fuels.',
    currentRequirement: 'LDAR programme submission by 5 May 2025; first MRV annual report by 5 Aug 2025. Oil/gas routine venting and flaring ban from 5 Feb 2025 (existing sites: 5 Feb 2026) (Art. 15-16); coal mine drainage venting ban from 1 Jan 2025 (Art. 22).',
    futureRequirement: 'From 1 January 2027 importers must demonstrate equivalent MRV for producers supplying the EU (contracts concluded or renewed from 4 Aug 2024) (Art. 28); maximum methane intensity values for imports to be set via delegated act.',
    keyMilestones: [
      { year: 2025, requirement: 'LDAR + MRV start; oil/gas venting/flaring ban (Art. 15-16); coal drainage venting ban (Art. 22)' },
      { year: 2027, requirement: 'MRV-equivalence requirement for importers (Art. 28)' },
    ],
    ceLexId: '32024R1787',
    sourceUrl: 'https://energy.ec.europa.eu/topics/oil-gas-and-coal/methane-emissions_en',
    articleCitations: [
      'Art. 15-16 (Reg. 2024/1787): oil/gas routine venting and flaring ban from 5 February 2025 (existing sites: 5 Feb 2026)',
      'Art. 22 (Reg. 2024/1787): coal mine drainage venting ban from 1 January 2025',
      'Art. 28 (Reg. 2024/1787): from 1 Jan 2027, importers must demonstrate MRV equivalence for producers (contracts concluded or renewed from 4 Aug 2024)',
    ],
  },
];

// ── Deep-link utilities ─────────────────────────────────────────────────

/**
 * Maps sector-policy IDs (used in SECTOR_POLICIES above) to Content
 * Analysis document IDs (used in `/content-analysis?doc=…`). Only entries
 * that differ are listed — if a sector-policy ID is absent here, it matches
 * the document ID as-is.
 */
export const SECTOR_TO_VIEWER_ID: Record<string, string> = {
  'climate-law': 'eu-climate-law',
  'eu-ets': 'eu-ets-directive',
  'ets2': 'eu-ets-directive',            // ETS2 is part of Directive 2023/959 amending ETS
  'cbam': 'cbam-regulation',
  'esr': 'effort-sharing-regulation',
  'red-iii': 'renewable-energy-directive',
  'eed': 'energy-efficiency-directive',
  'ten-e': 'ten-e-regulation',
  'mdr': 'electricity-market-regulation',
  'ied': 'industrial-emissions-directive',
  'epbd': 'epbd-recast',
  'sclf': 'social-climate-fund',
  'ecodesign': 'ecodesign-sustainable-products',
  'co2-cars-vans': 'co2-cars-regulation',
  'co2-hdv': 'co2-hdv-regulation',
  'afir': 'afir-regulation',
  'taxonomy': 'taxonomy-regulation',
  'eu-ets-maritime': 'eu-ets-directive',
  'eu-ets-aviation': 'eu-ets-directive',
  'cap': 'cap-strategic-plans',
  'farm-to-fork': 'farm-to-fork-strategy',
};

/** Resolve the policy-text viewer ID for a given sector-policy. */
export function getViewerPolicyId(sectorPolicyId: string): string {
  return SECTOR_TO_VIEWER_ID[sectorPolicyId] ?? sectorPolicyId;
}

/**
 * Extract a human-readable highlight search term from an article citation
 * string. The returned string is passed as `&highlight=…` to the policy
 * text viewer, which will scroll to and flash-highlight the first match.
 *
 * Examples:
 *   "Art. 4(1): binding -55%…"          → "Article 4"
 *   "Art. 3ga (Directive 2023/959):…"   → "Article 3ga"
 *   "Annex I(b)(i): synthetic…"         → "ANNEX I"
 *   "Recital 31 (Directive 2023/959)…"  → "(31)"
 *   "Directive 2024/1785: extends…"     → null (no specific article)
 */
export function extractHighlightTerm(citation: string): string | null {
  // Match "Art." or "Article" at start, possibly after "& " for combined refs
  // e.g. "Art. 4(1):", "Art. 3ga (Directive…", "Art. 30a & Annex III"
  const artMatch = citation.match(/^Art\.?\s*(\d+[a-z]*)/i);
  if (artMatch) return `Article ${artMatch[1]}`;

  // Match "Annex" at start followed by identifier (Roman numeral or number)
  const annexMatch = citation.match(/^Annex\s+([IVX\d]+)/i);
  if (annexMatch) return `ANNEX ${annexMatch[1].toUpperCase()}`;

  // Match "Recital N" at start
  const recitalMatch = citation.match(/^Recital\s+(\d+)/i);
  if (recitalMatch) return `(${recitalMatch[1]})`;

  // Match "Directive YYYY/NNN" or "Reg." at start, then look for Art. inside
  // e.g. "Directive 2023/958, Art. 1: aviation free allocation…"
  const directiveArtMatch = citation.match(/(?:Directive|Reg\.?(?:ulation)?)[^:]*,?\s*Art\.?\s*(\d+[a-z]*)/i);
  if (directiveArtMatch) return `Article ${directiveArtMatch[1]}`;

  // Match Annex after Reg./Directive prefix
  // e.g. "Reg. 2023/839 (amending Reg. 2018/841), Annex IIa: …"
  const deepAnnexMatch = citation.match(/Annex\s+([IVX\d]+[a-z]*)/i);
  if (deepAnnexMatch) return `ANNEX ${deepAnnexMatch[1].toUpperCase()}`;

  // If starts with "Directive" or "Regulation", link to policy but no highlight
  return null;
}

export interface CitationLink {
  /** The original citation text */
  citation: string;
  /** Deep-link URL to the policy text viewer with highlight */
  url: string;
  /** Whether a specific article/annex was identified (vs. just a policy link) */
  hasHighlight: boolean;
}

/**
 * Sector-policy IDs that do NOT have a corresponding entry in the
 * policy-text viewer (policies.ts). For these, citation links fall
 * back to the EUR-Lex page instead of the in-app viewer.
 */
const NO_VIEWER_IDS = new Set([
  'eurovignette', 'innovation-fund', 'corsia',
  'landfill-directive', 'forest-strategy', 'mrv-maritime', 'nec',
]);

/**
 * Generate deep links for all article citations of a sector policy.
 * Each citation becomes a clickable link into the Content Analysis module
 * with the relevant article or annex flash-highlighted. Falls back to
 * the EUR-Lex page for policies without a matching Content Analysis
 * document.
 */
export function getCitationLinks(policy: SectorPolicy): CitationLink[] {
  if (!policy.articleCitations?.length) return [];

  const viewerId = getViewerPolicyId(policy.id);
  const hasViewer = !NO_VIEWER_IDS.has(policy.id);

  // External fallback → EUR-Lex (used when we have no matching
  // Content Analysis document for the sector policy).
  const eurlexUrl = getEurLexUrl(policy);

  return policy.articleCitations.map(citation => {
    const highlight = extractHighlightTerm(citation);

    let url: string;
    if (hasViewer) {
      // Deep-link into the Content Analysis module, flash-highlighting the
      // cited article/annex and showing the full citation string as context.
      const params = new URLSearchParams();
      params.set('doc', viewerId);
      if (highlight) params.set('highlight', highlight);
      params.set('context', citation);
      url = `/content-analysis?${params.toString()}`;
    } else {
      url = eurlexUrl || '#';
    }

    return {
      citation,
      url,
      hasHighlight: !!highlight && hasViewer,
    };
  });
}