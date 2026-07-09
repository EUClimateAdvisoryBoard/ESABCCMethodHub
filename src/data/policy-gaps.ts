/**
 * Policy-gap tracker — the gaps and inconsistencies identified by the
 * European Scientific Advisory Board on Climate Change (ESABCC) in its
 * report *"Towards EU climate neutrality: Progress, policy gaps and
 * opportunities"* (January 2025).
 *
 * Source PDF (checked into the repo and published by the Board):
 *   https://climate-advisory-board.europa.eu/reports-and-publications/
 *   towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities
 *
 * The report's methodology (Ch. 2) classifies each barrier as one of four
 * types:
 *   • policy gap          – no policy in place to address the required change
 *   • ambition gap        – policies exist but are not ambitious enough
 *   • implementation gap  – policies are not implemented adequately
 *   • inconsistency       – policies provide counter-productive incentives
 *
 * Each entry below reproduces the finding (paraphrased from the report body),
 * the sector/chapter it sits in, the main EU instrument(s) concerned and the
 * Board's recommendation where one is given. `reportStatus` records that the
 * Board judged the gap OPEN at the January-2025 baseline. `currentStatus` and
 * `statusNote` are the *live* assessment — whether the gap still exists —
 * which the Method-Hub UI lets the Secretariat update over time.
 *
 * IMPORTANT: the live status fields are seeded to the report baseline
 * ("open") so that nothing is silently claimed to be solved. They are meant
 * to be revised as new legislation is adopted; the module persists edits and
 * lets analysts add rows for gaps beyond this report.
 */

export type GapType = 'policy' | 'ambition' | 'implementation' | 'inconsistency';

/** Live status of a gap relative to *today* (not the report baseline). */
export type GapStatus = 'open' | 'partially-addressed' | 'addressed' | 'unknown';

export interface PolicyGap {
  id: string;
  /** Report chapter / thematic sector. */
  sector: string;
  type: GapType;
  /** Short headline for the gap. */
  title: string;
  /** The finding, paraphrased from the report body. */
  description: string;
  /** Main EU instrument(s) the gap concerns. */
  instrument: string;
  /** The Board's recommendation to close the gap, where given. */
  recommendation: string;
  /** Report chapter + page for traceability. */
  reference: string;
  /** How the Board judged it at the Jan-2025 baseline (always 'open'). */
  reportStatus: 'open';
  /** Live assessment — does the gap still exist today? Editable in the UI. */
  currentStatus: GapStatus;
  /** Free-text note backing the live status (developments since the report). */
  statusNote: string;
}

export const GAP_TYPE_META: Record<GapType, { label: string; color: string; description: string }> = {
  policy: {
    label: 'Policy gap',
    color: '#B83230',
    description: 'No policy in place to address the required change.',
  },
  ambition: {
    label: 'Ambition gap',
    color: '#FF9933',
    description: 'Policies exist but are not ambitious enough to deliver the change.',
  },
  implementation: {
    label: 'Implementation gap',
    color: '#0065A4',
    description: 'Policies are not implemented adequately.',
  },
  inconsistency: {
    label: 'Inconsistency',
    color: '#A530B8',
    description: 'Policies provide counter-productive incentives.',
  },
};

export const GAP_STATUS_META: Record<GapStatus, { label: string; color: string }> = {
  open: { label: 'Still open', color: '#B83230' },
  'partially-addressed': { label: 'Partially addressed', color: '#FF9933' },
  addressed: { label: 'Addressed', color: '#007B6C' },
  unknown: { label: 'To review', color: '#54728C' },
};

export const GAP_SECTORS = [
  'Energy supply',
  'Industry',
  'Transport',
  'Buildings',
  'Agriculture',
  'LULUCF',
  'Carbon pricing',
  'Whole-of-society',
  'Finance & investment',
  'Innovation',
  'Climate governance',
  'Labour & skills',
] as const;

/**
 * The gaps. Descriptions paraphrase the report; every entry is anchored to a
 * chapter and page. `currentStatus` starts at the report baseline ('open').
 */
export const POLICY_GAPS: PolicyGap[] = [
  // ── Energy supply (Ch. 4) ──────────────────────────────────────────────
  {
    id: 'energy-eef-operationalisation',
    sector: 'Energy supply',
    type: 'implementation',
    title: 'Energy-efficiency-first principle not operationalised',
    description:
      'Persistent understanding and guidance issues have led to insufficient operationalisation of the energy-efficiency-first principle across EU decision-making so far.',
    instrument: 'Energy Efficiency Directive (EED), Governance Regulation',
    recommendation:
      'Fully operationalise the energy-efficiency-first principle across planning and investment decisions.',
    reference: 'Ch. 4 Energy supply, p. 55',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'energy-eed-threshold',
    sector: 'Energy supply',
    type: 'ambition',
    title: 'EED cost-benefit threshold exempts most projects',
    description:
      'The EED sets a very high EUR 100 million investment threshold for the energy-efficiency-first cost-benefit test, so many relevant projects are exempted from assessing energy-efficiency solutions.',
    instrument: 'Energy Efficiency Directive (EED)',
    recommendation: 'Lower the assessment threshold so smaller projects also weigh efficiency solutions.',
    reference: 'Ch. 4 Energy supply, p. 55',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'energy-res-value-chain',
    sector: 'Energy supply',
    type: 'policy',
    title: 'Renewables value-chain reinforcement still under negotiation',
    description:
      'While RED III (42.5% renewables target) and the electricity market reform are largely in place, the reinforcement of the renewable-energy value chain is still under negotiation.',
    instrument: 'RED III, Electricity Market Design reform, Net-Zero Industry Act',
    recommendation: 'Conclude the renewable value-chain measures to secure the manufacturing base.',
    reference: 'Ch. 4 Energy supply, p. 56',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'energy-system-integration',
    sector: 'Energy supply',
    type: 'implementation',
    title: 'Energy system not planned and operated as a whole',
    description:
      'Despite endorsing system integration as a strategic direction in 2020, the EU still does not plan and operate the energy system as an integrated whole.',
    instrument: 'EU Energy System Integration Strategy, TEN-E',
    recommendation: 'Plan and operate the energy system as an integrated whole across carriers and sectors.',
    reference: 'Ch. 4 Energy supply, p. 57',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'energy-hydrogen-support',
    sector: 'Energy supply',
    type: 'policy',
    title: 'Hydrogen support ignores techno-economic limits',
    description:
      "The EU's extensive support for the hydrogen value chain does not sufficiently reflect the techno-economic limits of hydrogen or its realistic role in an integrated, decarbonised energy system, risking misallocation to low-value end uses.",
    instrument: 'Hydrogen & Decarbonised Gas package, RED III, IPCEIs',
    recommendation: 'Target hydrogen support to end uses with no or limited alternative mitigation options.',
    reference: 'Ch. 4 Energy supply, p. 66',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'energy-ccs-scope',
    sector: 'Energy supply',
    type: 'policy',
    title: 'No EU definition of legitimate CCS applications',
    description:
      'The applications (e.g. in industry or agriculture) that legitimately motivate the use of carbon capture and storage (CCS) are not defined at EU or Member State level, leaving deployment priorities unclear.',
    instrument: 'Net-Zero Industry Act, CCS Directive, Industrial Carbon Management Strategy',
    recommendation: 'Define at EU level the applications for which CCS is the appropriate mitigation option.',
    reference: 'Ch. 4 Energy supply, p. 50',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'energy-methane-upstream',
    sector: 'Energy supply',
    type: 'policy',
    title: 'Imported upstream methane emissions not priced',
    description:
      'The Methane Regulation does not put a price on leaking upstream (including imported) emissions and is not aligned with comparable international initiatives.',
    instrument: 'EU Methane Regulation',
    recommendation: 'Price upstream methane leakage and align with international monitoring initiatives.',
    reference: 'Ch. 4 Energy supply, p. 72',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },

  // ── Industry (Ch. 5) ───────────────────────────────────────────────────
  {
    id: 'industry-ceap-upstream',
    sector: 'Industry',
    type: 'policy',
    title: 'Circular-economy policy focuses on recycling, not prevention',
    description:
      'The 2015 Circular Economy Action Plan and the plastics strategy mainly targeted recycling, with little focus on solutions higher up the waste hierarchy (prevention, reuse, material sufficiency).',
    instrument: 'Circular Economy Action Plan, Plastics Strategy',
    recommendation: 'Shift circular-economy policy upstream towards material demand reduction and reuse.',
    reference: 'Ch. 5 Industry, p. 88',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'industry-ecodesign-scope',
    sector: 'Industry',
    type: 'policy',
    title: 'Ecodesign circularity scope remained limited',
    description:
      'The Ecodesign framework has focused mainly on energy efficiency; product-circularity requirements were added only recently and their scope remained limited to energy-related products.',
    instrument: 'Ecodesign for Sustainable Products Regulation (ESPR)',
    recommendation: 'Broaden circularity requirements across product groups under the ESPR.',
    reference: 'Ch. 5 Industry, p. 90',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'industry-early-deployment',
    sector: 'Industry',
    type: 'policy',
    title: 'Missing support for early deployment / lead markets',
    description:
      'EU policy supports R&D (Horizon Europe), pilots/demonstration (Innovation Fund) and mature-technology diffusion (EU ETS), but dedicated policies to support early deployment and create lead markets for clean industrial products are missing.',
    instrument: 'Innovation Fund, EU ETS, (future) lead-market instruments',
    recommendation: 'Introduce lead-market instruments (e.g. green public procurement, CCfDs) for early deployment.',
    reference: 'Ch. 5 Industry, p. 94',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },

  // ── Transport (Ch. 6) ──────────────────────────────────────────────────
  {
    id: 'transport-demand-moderation',
    sector: 'Transport',
    type: 'policy',
    title: 'Transport demand moderation not an EU policy option',
    description:
      "Moderation of overall transport demand is not considered as an option in the EU's Sustainable and Smart Mobility Strategy, leaving avoid/shift levers largely unaddressed.",
    instrument: 'Sustainable and Smart Mobility Strategy',
    recommendation: 'Include demand-moderation (avoid/shift) measures in the EU mobility framework.',
    reference: 'Ch. 6 Transport, p. 109',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'transport-modal-shift-freight',
    sector: 'Transport',
    type: 'ambition',
    title: 'Weak framework for rail/intermodal freight shift',
    description:
      'Outdated provisions in the Combined Transport Directive prevent digitalised workflows, the Rail Freight Corridors Regulation lacks adequate delivery mechanisms, and there is no overview of required intermodal-terminal capacities under TEN-T.',
    instrument: 'Combined Transport Directive, Rail Freight Corridors Regulation, TEN-T',
    recommendation: 'Modernise the combined-transport and rail-freight framework to enable modal shift.',
    reference: 'Ch. 6 Transport, p. 103',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'transport-modal-shift-implementation',
    sector: 'Transport',
    type: 'implementation',
    title: 'Heterogeneous Member-State freight-shift implementation',
    description:
      'Implementation of freight modal-shift measures is incomplete and heterogeneous across Member States, undermining the internal market for rail and intermodal freight.',
    instrument: 'Combined Transport Directive, TEN-T',
    recommendation: 'Ensure complete and harmonised implementation across Member States.',
    reference: 'Ch. 6 Transport, p. 103',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'transport-zev-efficiency',
    sector: 'Transport',
    type: 'ambition',
    title: 'CO₂ standards do not reward vehicle efficiency',
    description:
      'While CO₂ standards accelerate zero-emission-vehicle uptake, they do not incentivise efficiency (smaller, lighter, more efficient vehicles) within the ZEV segment.',
    instrument: 'CO₂ emission standards for cars and vans',
    recommendation: 'Add efficiency incentives within the ZEV segment of the CO₂ standards.',
    reference: 'Ch. 6 Transport, p. 116',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'transport-biofuels-indirect',
    sector: 'Transport',
    type: 'ambition',
    title: 'Policies still promote high-indirect-effect biofuels',
    description:
      'EU policies continue to promote biofuels with potentially high indirect effects — crop-based fuels (up to 7%), intermediate crops and certain animal fats — despite land-use and sustainability concerns.',
    instrument: 'RED III, ReFuelEU Aviation, FuelEU Maritime',
    recommendation: 'Phase down support for biofuels with high indirect land-use effects.',
    reference: 'Ch. 6 Transport, p. 104',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'transport-biofuel-fraud',
    sector: 'Transport',
    type: 'implementation',
    title: 'Suspected fraud in biofuel sustainability labelling',
    description:
      'There are well-founded suspicions of fraud in the labelling of biofuels as sustainable, weakening the integrity of renewable-transport-fuel accounting.',
    instrument: 'RED III, Union Database for biofuels',
    recommendation: 'Strengthen certification and traceability to prevent fraudulent sustainability claims.',
    reference: 'Ch. 6 Transport, p. 104',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'transport-extra-eu-exemption',
    sector: 'Transport',
    type: 'policy',
    title: 'Extra-EU aviation and maritime largely exempt from ETS',
    description:
      'Extra-EU aviation and half of extra-EU maritime transport remain exempt from the EU ETS, leaving a large share of international transport emissions unpriced.',
    instrument: 'EU ETS (aviation & maritime)',
    recommendation: 'Extend carbon pricing to extra-EU aviation and maritime as far as feasible.',
    reference: 'Ch. 6 Transport, p. 105',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },

  // ── Buildings (Ch. 7) ──────────────────────────────────────────────────
  {
    id: 'buildings-deep-retrofit',
    sector: 'Buildings',
    type: 'implementation',
    title: 'Barriers to deep energy retrofits not overcome',
    description:
      'EU policies so far have not overcome the barriers to wide-scale, deep energy retrofits of the building stock, keeping renovation rates and depth well below what 2050 requires.',
    instrument: 'Energy Performance of Buildings Directive (EPBD recast)',
    recommendation: 'Strengthen instruments and financing to trigger deep, wide-scale renovation.',
    reference: 'Ch. 7 Buildings, p. 134',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'buildings-renovation-strategies',
    sector: 'Buildings',
    type: 'implementation',
    title: 'Long-term renovation strategies lack quality and ambition',
    description:
      "The quality and ambition of Member States' long-term renovation strategies are insufficient to guide building renovation towards the 2050 climate-neutrality objective.",
    instrument: 'EPBD — National Building Renovation Plans',
    recommendation: 'Raise the quality and ambition of national renovation plans and enforce alignment with 2050.',
    reference: 'Ch. 7 Buildings, p. 137',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'buildings-fossil-gas-subsidy',
    sector: 'Buildings',
    type: 'inconsistency',
    title: 'Fossil-gas subsidies and weak standards cause lock-in',
    description:
      'Subsidies to fossil gas allowed under the Energy Taxation Directive and State-aid rules, combined with insufficiently robust EU standards, drive only incremental efficiency gains and create lock-in effects.',
    instrument: 'Energy Taxation Directive, EU State-aid rules, EPBD',
    recommendation: 'Remove fossil-gas subsidies and tighten standards to avoid carbon lock-in.',
    reference: 'Ch. 7 Buildings, p. 129',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'buildings-spatial-planning',
    sector: 'Buildings',
    type: 'ambition',
    title: 'No EU guidance on sufficiency in spatial planning',
    description:
      'The EU does not prominently guide urban/spatial planning and taxation towards energy and material sufficiency in the built environment.',
    instrument: 'EU spatial-planning / taxation guidance',
    recommendation: 'Guide urban planning and taxation towards energy and material sufficiency.',
    reference: 'Ch. 7 Buildings, p. 138',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'buildings-epc-quality',
    sector: 'Buildings',
    type: 'ambition',
    title: 'Energy Performance Certificates of uneven quality',
    description:
      'Energy Performance Certificate schemes are of uneven quality and limited reliability, as they rely on modelled physical properties rather than measured, occupancy-driven energy demand.',
    instrument: 'EPBD — Energy Performance Certificates',
    recommendation: 'Improve EPC reliability and comparability, including measured-consumption data.',
    reference: 'Ch. 7 Buildings, p. 148',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },

  // ── Agriculture (Ch. 8) ────────────────────────────────────────────────
  {
    id: 'agri-cap-qualitative',
    sector: 'Agriculture',
    type: 'ambition',
    title: 'CAP climate objective is largely qualitative',
    description:
      'Within the CAP, the aim of contributing to climate-change mitigation is largely qualitative and forms only part of a broad set of agri-environmental objectives, weakening its steering effect.',
    instrument: 'Common Agricultural Policy (CAP)',
    recommendation: 'Give the CAP a clear, quantified climate-mitigation objective.',
    reference: 'Ch. 8 Agriculture, p. 162',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'agri-csp-discretionary',
    sector: 'Agriculture',
    type: 'ambition',
    title: 'CAP Strategic Plans leave mitigation discretionary',
    description:
      "The CAP's climate aims are pursued through Member States' CAP Strategic Plans, where the emphasis on mitigation is largely discretionary and difficult to compare or enforce.",
    instrument: 'CAP Strategic Plans',
    recommendation: 'Set common, comparable mitigation requirements for CAP Strategic Plans.',
    reference: 'Ch. 8 Agriculture, p. 163',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'agri-no-pricing',
    sector: 'Agriculture',
    type: 'policy',
    title: 'Agricultural emissions not covered by GHG pricing',
    description:
      'Emissions from agriculture are not covered by any GHG-emission-pricing regime, removing a key incentive to reduce non-CO₂ emissions.',
    instrument: 'EU GHG-pricing framework (ETS family)',
    recommendation: 'Develop a pricing or equivalent incentive mechanism for agricultural emissions.',
    reference: 'Ch. 8 Agriculture, p. 168',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'agri-food-waste-targets',
    sector: 'Agriculture',
    type: 'policy',
    title: 'Key demand-side legislation not yet adopted',
    description:
      'Demand-side legislation such as binding food-waste-reduction targets has been proposed but not yet adopted, leaving consumption-side mitigation levers unused.',
    instrument: 'Waste Framework Directive revision',
    recommendation: 'Adopt binding food-waste and sustainable-consumption measures.',
    reference: 'Ch. 8 Agriculture, p. 172',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },

  // ── LULUCF (Ch. 9) ─────────────────────────────────────────────────────
  {
    id: 'lulucf-wetland-restoration',
    sector: 'LULUCF',
    type: 'implementation',
    title: 'Wetland-restoration eco-schemes barely used',
    description:
      'The CAP allows eco-schemes for wetland restoration, but these are used to only a limited extent by Member States, so peatland/wetland carbon is under-protected.',
    instrument: 'CAP eco-schemes, Nature Restoration Regulation',
    recommendation: 'Scale up uptake of wetland-restoration measures across Member States.',
    reference: 'Ch. 9 LULUCF, p. 190',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'lulucf-farm-to-fork-leakage',
    sector: 'LULUCF',
    type: 'policy',
    title: 'Yield-reducing targets risk production leakage',
    description:
      'Farm-to-Fork objectives to cut fertiliser use (−20%) and expand organic farming (to 20%) have local benefits but risk reducing yields and displacing production (and emissions) abroad without safeguards.',
    instrument: 'Farm to Fork Strategy, CAP',
    recommendation: 'Pair demand-side and productivity measures to avoid production and emissions leakage.',
    reference: 'Ch. 9 LULUCF, p. 183',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'lulucf-food-waste-legal',
    sector: 'LULUCF',
    type: 'ambition',
    title: 'Legal food-waste targets fall short of the 50% aim',
    description:
      'The non-binding aim to halve per-capita food waste by 2030 is not matched by the proposed legal targets under the Waste Framework Directive, which fall short of that ambition.',
    instrument: 'Waste Framework Directive revision',
    recommendation: 'Align binding food-waste targets with the 50% reduction ambition.',
    reference: 'Ch. 9 LULUCF, p. 183',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'lulucf-bioenergy-exemptions',
    sector: 'LULUCF',
    type: 'ambition',
    title: 'Bioenergy sustainability exemptions and compliance gaps',
    description:
      'Specific exemptions in the bioenergy sustainability criteria, together with monitoring and compliance issues (including fraud), weaken safeguards on biomass used for energy.',
    instrument: 'RED III sustainability criteria',
    recommendation: 'Close exemptions and strengthen monitoring and compliance for bioenergy sustainability.',
    reference: 'Ch. 9 LULUCF, p. 183',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'lulucf-bioenergy-supply-info',
    sector: 'LULUCF',
    type: 'implementation',
    title: 'Insufficient data on sustainable biomass supply',
    description:
      'Member States have provided insufficient information for the Commission to assess whether projected bioenergy demand is compatible with sustainably available biomass supply.',
    instrument: 'RED III, Governance Regulation reporting',
    recommendation: 'Require robust reporting on biomass demand versus sustainable supply.',
    reference: 'Ch. 9 LULUCF, p. 183',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'lulucf-biomass-incentives',
    sector: 'LULUCF',
    type: 'policy',
    title: 'Uneven incentives: forest biomass energy vs. carbon sink',
    description:
      'Incentives for using forest biomass for energy versus maximising the LULUCF carbon sink are unevenly distributed, with no financial incentive for land managers to cut emissions and raise removals.',
    instrument: 'RED III, LULUCF Regulation, CAP',
    recommendation: 'Introduce financial incentives that reward removals and balanced biomass use.',
    reference: 'Ch. 9 LULUCF, p. 183',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'lulucf-red-end-use',
    sector: 'LULUCF',
    type: 'policy',
    title: 'RED III does not differentiate bioenergy by end use',
    description:
      'Key policies such as RED III do not differentiate incentives for bioenergy according to the other mitigation options available for each end use, so scarce biomass is not steered to its best uses.',
    instrument: 'RED III',
    recommendation: 'Differentiate bioenergy incentives by end use and alternative-option availability.',
    reference: 'Ch. 9 LULUCF, p. 183',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'lulucf-grassland-gaec1',
    sector: 'LULUCF',
    type: 'ambition',
    title: 'GAEC 1 does not prevent grassland carbon losses',
    description:
      'The mandatory grassland-maintenance requirement (GAEC 1) does not prevent agricultural practices that cause high soil-carbon emissions from grasslands.',
    instrument: 'CAP conditionality (GAEC 1)',
    recommendation: 'Strengthen grassland conditionality to protect soil carbon.',
    reference: 'Ch. 9 LULUCF, p. 193',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'lulucf-carbon-farming-uptake',
    sector: 'LULUCF',
    type: 'implementation',
    title: 'Carbon-farming eco-schemes low in uptake and ambition',
    description:
      'Although most Member States set soil/biomass carbon-storage targets, only eight included voluntary eco-schemes to incentivise carbon farming, often at low ambition and limited scope.',
    instrument: 'CAP eco-schemes, Carbon Removals Certification',
    recommendation: 'Broaden and raise the ambition of carbon-farming support schemes.',
    reference: 'Ch. 9 LULUCF, p. 197',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'lulucf-no-cdr-incentive',
    sector: 'LULUCF',
    type: 'policy',
    title: 'No financial incentive to enhance land-based removals',
    description:
      'Agriculture and LULUCF are excluded from the EU GHG-pricing regime, implying no overall financial incentive for farmers and land managers to enhance carbon removals.',
    instrument: 'EU GHG-pricing framework, Carbon Removals Certification',
    recommendation: 'Create an incentive framework rewarding verified land-based removals.',
    reference: 'Ch. 9 LULUCF, p. 200',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'lulucf-sink-assumptions',
    sector: 'LULUCF',
    type: 'policy',
    title: '2030 LULUCF target ignores climate-driven sink risks',
    description:
      'The assumptions underpinning the 2030 LULUCF target did not account for the uncertain effects of climate change and natural disturbances on the carbon sink, which has been declining.',
    instrument: 'LULUCF Regulation',
    recommendation: 'Revisit the sink target to reflect climate-driven risks to removals.',
    reference: 'Ch. 9 LULUCF, p. 188',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },

  // ── Carbon pricing (Ch. 10) ────────────────────────────────────────────
  {
    id: 'pricing-ets-endgame',
    sector: 'Carbon pricing',
    type: 'policy',
    title: 'No strategy for the ETS cap reaching zero',
    description:
      'There is not yet a clear strategy to prepare the carbon market and covered sectors for the point at which the EU ETS cap reaches zero (before 2040).',
    instrument: 'EU ETS',
    recommendation: 'Set out a strategy for the ETS endgame and the transition beyond a zero cap.',
    reference: 'Ch. 10 Carbon pricing, p. 216',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'pricing-ets2-cap-risk',
    sector: 'Carbon pricing',
    type: 'ambition',
    title: 'ETS2 price-stability measures could weaken the cap',
    description:
      'Provisions that release additional ETS2 allowances to contain prices would de facto weaken the emissions cap and jeopardise achievement of the target.',
    instrument: 'EU ETS 2 (buildings & road transport)',
    recommendation: 'Ensure price-stability mechanisms do not undermine the ETS2 cap.',
    reference: 'Ch. 10 Carbon pricing, p. 219',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'pricing-regime-coverage',
    sector: 'Carbon pricing',
    type: 'policy',
    title: 'A quarter of EU emissions outside any GHG pricing',
    description:
      'Around 26% of EU emissions — chiefly in agriculture and LULUCF — would remain excluded from any EU-wide GHG-pricing regime, a structural coverage gap.',
    instrument: 'EU ETS, ETS2, Effort Sharing Regulation',
    recommendation: 'Extend GHG pricing (or equivalent incentives) towards full economy-wide coverage.',
    reference: 'Ch. 10 Carbon pricing, p. 224',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },

  // ── Whole-of-society (Ch. 11) ──────────────────────────────────────────
  {
    id: 'society-distributional-ia',
    sector: 'Whole-of-society',
    type: 'implementation',
    title: 'Distributional impacts not consistently assessed',
    description:
      'Although the better-regulation toolbox covers distributional and socio-economic impacts, EU climate policies have not always been accompanied by such assessments in practice.',
    instrument: 'Better Regulation toolbox, impact assessments',
    recommendation: 'Systematically assess distributional impacts of EU climate policies.',
    reference: 'Ch. 11 Whole-of-society, p. 229',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'society-narratives',
    sector: 'Whole-of-society',
    type: 'ambition',
    title: 'Narratives neglect co-benefits and local values',
    description:
      'Narratives around climate policy focus on emissions and cost-effectiveness, with insufficient attention to co-benefits, local needs and values that build public support.',
    instrument: 'EU climate communication / just-transition framing',
    recommendation: 'Frame climate policy around co-benefits and local needs and values.',
    reference: 'Ch. 11 Whole-of-society, p. 232',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'society-ex-ante-socioeconomic',
    sector: 'Whole-of-society',
    type: 'policy',
    title: 'Few policies informed by ex-ante socio-economic analysis',
    description:
      'Few EU climate policies are informed by ex-ante assessments of their possible socio-economic impacts, limiting the design of fair, well-targeted measures.',
    instrument: 'Impact-assessment framework',
    recommendation: 'Embed ex-ante socio-economic assessment in climate policy design.',
    reference: 'Ch. 11 Whole-of-society, p. 233',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },

  // ── Finance & investment (Ch. 12) ──────────────────────────────────────
  {
    id: 'finance-needs-methodology',
    sector: 'Finance & investment',
    type: 'policy',
    title: 'No harmonised method to estimate investment needs',
    description:
      'A knowledge gap on climate-related investment needs persists, driven by the lack of a harmonised methodology to identify and estimate them across the EU.',
    instrument: 'EU investment-needs monitoring',
    recommendation: 'Develop a harmonised methodology for estimating climate-investment needs.',
    reference: 'Ch. 12 Finance & investment, p. 240',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'finance-fossil-subsidy-deadline',
    sector: 'Finance & investment',
    type: 'implementation',
    title: 'Few Member States set a fossil-subsidy phase-out date',
    description:
      'The 8th Environment Action Programme requires a deadline for phasing out fossil-fuel subsidies consistent with 1.5 °C, yet so far only a few Member States have set clear plans and timelines.',
    instrument: '8th Environment Action Programme, NECPs',
    recommendation: 'Set and enforce binding phase-out deadlines for fossil-fuel subsidies.',
    reference: 'Ch. 12 Finance & investment, p. 244',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'finance-budget-tracking',
    sector: 'Finance & investment',
    type: 'ambition',
    title: 'Flawed EU-budget climate-spending tracking',
    description:
      "Substantial flaws in the methodology for tracking EU-budget climate spending overestimate the budget's contribution to climate objectives.",
    instrument: 'EU budget (MFF) climate-tracking methodology',
    recommendation: 'Reform climate-tracking to reflect real contributions and prevent overestimation.',
    reference: 'Ch. 12 Finance & investment, p. 245',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'finance-rrf-successor',
    sector: 'Finance & investment',
    type: 'policy',
    title: 'No clear successor to the RRF after 2026',
    description:
      'The Recovery and Resilience Facility is expected to end after 2026 with no clarity on a successor instrument, reflecting a lack of long-termism and undermining investor confidence.',
    instrument: 'Recovery and Resilience Facility (RRF)',
    recommendation: 'Provide a credible, long-term successor to the RRF for climate investment.',
    reference: 'Ch. 12 Finance & investment, p. 237',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'finance-sgp-investment',
    sector: 'Finance & investment',
    type: 'ambition',
    title: 'Reformed fiscal rules lack climate-investment carve-out',
    description:
      'Despite calls for specific treatment of climate-related public investment, the reformed Stability and Growth Pact does not provide dedicated rules to protect such investment.',
    instrument: 'Stability and Growth Pact',
    recommendation: 'Provide fiscal space or rules that safeguard climate-related public investment.',
    reference: 'Ch. 12 Finance & investment, p. 248',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'finance-step-budget',
    sector: 'Finance & investment',
    type: 'ambition',
    title: 'STEP / Sovereignty-Fund budget too limited',
    description:
      'Instruments proposed to close the investment gap — notably the Strategic Technologies for Europe Platform as a first step towards an EU Sovereignty Fund — carry too limited a budget.',
    instrument: 'Strategic Technologies for Europe Platform (STEP)',
    recommendation: 'Scale up funding for strategic clean-technology deployment at EU level.',
    reference: 'Ch. 12 Finance & investment, p. 246',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'finance-green-bonds-alignment',
    sector: 'Finance & investment',
    type: 'ambition',
    title: 'NGEU green bonds not aligned with EU taxonomy/standard',
    description:
      'Green bonds issued under NextGenerationEU are not necessarily aligned with the EU Taxonomy and the EU Green Bond Standard, reducing transparency on use of proceeds.',
    instrument: 'NextGenerationEU green bonds, EU Green Bond Standard',
    recommendation: 'Align public green-bond issuance with the taxonomy and Green Bond Standard.',
    reference: 'Ch. 12 Finance & investment, p. 252',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },

  // ── Innovation (Ch. 13) ────────────────────────────────────────────────
  {
    id: 'innovation-admin-complexity',
    sector: 'Innovation',
    type: 'implementation',
    title: 'Administrative complexity deters private co-investment',
    description:
      'The administrative complexity of key EU climate-innovation instruments hinders the crowding-in of private investment.',
    instrument: 'Horizon Europe, Innovation Fund',
    recommendation: 'Simplify access to innovation funding to crowd in private investment.',
    reference: 'Ch. 13 Innovation, p. 258',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'innovation-monitoring',
    sector: 'Innovation',
    type: 'policy',
    title: 'Innovation progress not monitored beyond early stages',
    description:
      'EU-level monitoring of climate-innovation progress is missing, particularly beyond early-stage research, so bottlenecks along the innovation chain are not tracked.',
    instrument: 'EU innovation monitoring framework',
    recommendation: 'Monitor innovation progress at EU level across the full innovation chain.',
    reference: 'Ch. 13 Innovation, p. 261',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'innovation-scale-up-gap',
    sector: 'Innovation',
    type: 'policy',
    title: 'Funding gap between demonstration and deployment',
    description:
      'The policy mix leaves a funding gap for climate-technology manufacturing and deployment projects moving from piloting/demonstration towards early commercial deployment ("valley of death").',
    instrument: 'Innovation Fund, InvestEU, Net-Zero Industry Act',
    recommendation: 'Bridge the scale-up funding gap between demonstration and deployment.',
    reference: 'Ch. 13 Innovation, p. 262',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'innovation-venture-capital',
    sector: 'Innovation',
    type: 'policy',
    title: 'Weak European venture capital for clean tech',
    description:
      'The scale-up funding gap is widened by the relatively weak European venture-capital market for clean technologies compared with, for example, the United States.',
    instrument: 'EU capital-markets / scale-up finance',
    recommendation: 'Strengthen European venture and growth capital for clean technology.',
    reference: 'Ch. 13 Innovation, p. 262',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'innovation-collaboration',
    sector: 'Innovation',
    type: 'policy',
    title: 'Insufficient public-private research collaboration',
    description:
      'Innovation instruments need to foster stronger collaboration between private and public knowledge organisations, an opportunity currently under-exploited.',
    instrument: 'Horizon Europe, SET Plan',
    recommendation: 'Design instruments that build durable public-private research collaboration.',
    reference: 'Ch. 13 Innovation, p. 263',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'innovation-predictability',
    sector: 'Innovation',
    type: 'ambition',
    title: 'Limited funding predictability beyond 2030',
    description:
      'The EU funding architecture offers limited predictability beyond 2030, increasing uncertainty for long-term clean-innovation projects.',
    instrument: 'Multiannual Financial Framework, Horizon Europe',
    recommendation: 'Provide longer funding horizons and predictability for innovation projects.',
    reference: 'Ch. 13 Innovation, p. 264',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'innovation-nzia-reporting',
    sector: 'Innovation',
    type: 'policy',
    title: 'Weak reporting on Net-Zero Industry Act 40% target',
    description:
      'The Net-Zero Industry Act aims for at least 40% of domestic needs in strategic technologies, but existing reporting mechanisms offer limited ability to track progress.',
    instrument: 'Net-Zero Industry Act',
    recommendation: 'Strengthen monitoring and reporting of manufacturing-capacity progress.',
    reference: 'Ch. 13 Innovation, p. 265',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },

  // ── Climate governance (Ch. 14) ────────────────────────────────────────
  {
    id: 'governance-necp-horizon',
    sector: 'Climate governance',
    type: 'ambition',
    title: 'NECP 10-year horizon too short for 2050 consistency',
    description:
      'The 10-year frame of the NECPs is too short to ensure consistency with 2050 objectives, and the link between NECPs and long-term strategies rests on weak consistency processes.',
    instrument: 'Governance Regulation (NECPs & LTSs)',
    recommendation: 'Strengthen the NECP-LTS link and extend planning horizons towards 2050.',
    reference: 'Ch. 14 Climate governance, p. 269',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'governance-necp-quality',
    sector: 'Climate governance',
    type: 'implementation',
    title: 'NECP milestone information insufficient',
    description:
      "The quality of information on key net-zero milestones in the first NECPs and their updates is insufficient for the Commission to assess Member States' paths.",
    instrument: 'Governance Regulation (NECPs)',
    recommendation: 'Improve the quality and comparability of NECP milestone reporting.',
    reference: 'Ch. 14 Climate governance, p. 269',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'governance-necp-participation',
    sector: 'Climate governance',
    type: 'implementation',
    title: 'Transparency and public-engagement deficits in NECPs',
    description:
      'Deficits in transparency and public engagement are observed in NECP preparation at national level, and multi-level dialogues are often not permanent or aligned with subnational policies.',
    instrument: 'Governance Regulation, Aarhus Convention',
    recommendation: 'Ensure genuine, permanent public and multi-level engagement in NECP processes.',
    reference: 'Ch. 14 Climate governance, p. 273',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'governance-impact-assessments',
    sector: 'Climate governance',
    type: 'implementation',
    title: 'Far-reaching acts lacking climate impact assessments',
    description:
      'Despite improved impact-assessment practice, some far-reaching non-legislative acts (e.g. taxonomy criteria, renewable-fuel definitions) were adopted without appropriate impact assessment, public consultation and climate-neutrality checks.',
    instrument: 'Better Regulation, climate-neutrality checks',
    recommendation: 'Apply impact assessment and climate checks consistently to far-reaching acts.',
    reference: 'Ch. 14 Climate governance, p. 268',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'governance-aarhus',
    sector: 'Climate governance',
    type: 'implementation',
    title: 'EU in breach of the Aarhus Convention',
    description:
      'The EU is in breach of the Aarhus Convention regarding access to justice in State-aid matters and public engagement in the NECP process.',
    instrument: 'Aarhus Convention, State-aid rules',
    recommendation: 'Bring EU procedures into line with the Aarhus Convention.',
    reference: 'Ch. 14 Climate governance, p. 268',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'governance-advisory-bodies',
    sector: 'Climate governance',
    type: 'ambition',
    title: 'National climate advisory bodies not mandatory',
    description:
      'The European Climate Law only encourages Member States to establish national climate advisory bodies, without making them mandatory or linking them to procedural obligations.',
    instrument: 'European Climate Law, Governance Regulation',
    recommendation: 'Make independent national climate advisory bodies mandatory and embedded in the process.',
    reference: 'Ch. 14 Climate governance, p. 275',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },

  // ── Labour & skills (Ch. 15) ───────────────────────────────────────────
  {
    id: 'labour-eu-skills-gap',
    sector: 'Labour & skills',
    type: 'policy',
    title: 'Remaining EU-level gaps on green skills',
    description:
      'Although education and training are mainly a Member-State competence, remaining policy gaps persist at EU level, particularly on anticipating and matching workforce skills for the net-zero transition.',
    instrument: 'EU skills agenda, Just Transition framework',
    recommendation: 'Strengthen EU coordination on green-skills anticipation and provision.',
    reference: 'Ch. 15 Labour & skills, p. 279',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'labour-sector-upskilling',
    sector: 'Labour & skills',
    type: 'implementation',
    title: 'Weak upskilling in key transition sectors',
    description:
      'Limited sector-specific provision (e.g. in buildings and agriculture) constrains opportunities to upskill workers and exchange knowledge relevant to the transition.',
    instrument: 'EU skills / sectoral training instruments',
    recommendation: 'Expand sector-specific upskilling and knowledge exchange.',
    reference: 'Ch. 15 Labour & skills, p. 280',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
  {
    id: 'labour-fossil-gas-transition',
    sector: 'Labour & skills',
    type: 'policy',
    title: 'No EU transition schemes for fossil-gas workers',
    description:
      'Transition schemes for workers in the fossil-gas sector are largely absent at EU level, leaving part of the affected workforce without dedicated support.',
    instrument: 'Just Transition Fund / mechanism',
    recommendation: 'Extend just-transition support to fossil-gas-sector workers.',
    reference: 'Ch. 15 Labour & skills, p. 281',
    reportStatus: 'open',
    currentStatus: 'open',
    statusNote: '',
  },
];

/** The report metadata, surfaced in the UI. */
export const GAP_REPORT_META = {
  title: 'Towards EU climate neutrality: Progress, policy gaps and opportunities',
  author: 'European Scientific Advisory Board on Climate Change (ESABCC)',
  published: 'January 2025',
  url: 'https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities',
};
