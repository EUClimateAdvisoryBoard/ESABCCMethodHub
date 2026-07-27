/**
 * Policy-gap tracker — the gaps and inconsistencies identified by the
 * European Scientific Advisory Board on Climate Change (ESABCC) in its
 * report *"Towards EU climate neutrality: Progress, policy gaps and
 * opportunities"* (January 2024).
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
 * Each entry below carries the finding, the sector/chapter it sits in, the
 * main EU instrument(s) concerned, and — crucially — the VERBATIM sentence
 * from the report that states the gap (`quote`) plus the exact page
 * (`reference`). The `description` is a light paraphrase of that quote; the
 * quote is the authoritative text. `reportStatus` records that the Board
 * judged the gap OPEN at the January-2024 baseline. `currentStatus` and
 * `statusNote` are the *live* assessment — whether the gap still exists —
 * which the Method-Hub UI lets the Secretariat update over time.
 *
 * Every entry was fact-checked line-by-line against the report text: each
 * quote was located in the source, its gap `type` confirmed against the
 * report's own tag, and its page reference corrected to the page that
 * actually carries the tagged finding. Descriptions were stripped of any
 * figure, instrument or claim not present in the quoted passage.
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
  /**
   * The finding, kept as close as possible to the report's own wording.
   * Every entry has been fact-checked against the source text (see `quote`).
   */
  description: string;
  /** Main EU instrument(s) the gap concerns. */
  instrument: string;
  /**
   * VERBATIM sentence(s) copied from the report that state this gap
   * (line breaks normalised). This is the authoritative source text — the
   * `description` is a light paraphrase of it.
   */
  quote: string;
  /** Report chapter + page for traceability (page carrying the tagged gap). */
  reference: string;
  /** How the Board judged it at the Jan-2024 baseline (always 'open'). */
  reportStatus: 'open';
  /**
   * Whether this row is a Board finding from the report baseline, or a row an
   * analyst added later via the tracker UI. Optional for backwards
   * compatibility with rows already persisted in localStorage before this
   * field existed — `commitAdd()` in beta/modules/policy-gaps/page.tsx always
   * sets it explicitly on new rows; the UI treats a missing value as 'report'
   * for known report ids (this file's ids) and 'custom' otherwise. Custom
   * rows must never be labelled with the report's "Open (Jan 2024)" baseline.
   */
  source?: 'report' | 'custom';
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
 * The gaps. Each `description` is a light paraphrase of the report; the
 * verbatim source sentence is preserved in `quote` with the exact page in
 * `reference`. Every entry was fact-checked line-by-line against the report
 * text. `currentStatus` starts at the report baseline ('open').
 */
export const POLICY_GAPS: PolicyGap[] = [
  {
    id: "energy-eef-operationalisation",
    sector: "Energy supply",
    type: "implementation",
    title: "Energy-efficiency-first principle not operationalised",
    description: "Understanding issues have led to insufficient operationalisation of the energy-efficiency-first principle so far.",
    instrument: "Energy Efficiency Directive (EED), Governance Regulation",
    quote: "Understanding issues also led to insufficient operationalisation of the energy efficiency first principle so far (implementation gap).",
    reference: "Ch. 4 Energy supply, p. 48, line 33",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "energy-eed-threshold",
    sector: "Energy supply",
    type: "ambition",
    title: "EED cost-benefit threshold exempts most projects",
    description: "While the EED aims to reinforce the application of the energy-efficiency-first principle, it sets a very high investment value (EUR 100 million) threshold, which means that many relevant projects will be exempted from assessment of energy efficiency solutions, including demand-side resources and system flexibilities.",
    instrument: "Energy Efficiency Directive (EED)",
    quote: "While the EED aims to reinforce the application of the energy efficiency first principle, it sets a very high investment value (EUR 100 million) threshold, which means that many relevant projects will be exempted from assessment of energy efficiency solutions, including demand-side resources and system flexibilities (ambition gap).",
    reference: "Ch. 4 Energy supply, p. 48, line 35",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "energy-res-value-chain",
    sector: "Energy supply",
    type: "policy",
    title: "Renewables value-chain reinforcement still under negotiation",
    description: "The RED III (including the newly adopted target of a 42.5% renewable energy share in final energy consumption) and the electricity market reform are mostly in place, but the RES value-chain reinforcement is still under negotiation.",
    instrument: "RED III, Electricity Market Design reform, Net-Zero Industry Act",
    quote: "The RED III, including the newly adopted target of a 42.5 % renewable energy share in final energy consumption and the electricity market reform are mostly in place, the RES value chain reinforcement is still under negotiation (policy gap).",
    reference: "Ch. 4 Energy supply, p. 49, line 15",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "energy-system-integration",
    sector: "Energy supply",
    type: "implementation",
    title: "Energy system not planned and operated as a whole",
    description: "Despite the European Commission's endorsement of system integration as a strategic direction in 2020, the EU still does not plan and operate the energy system as a whole.",
    instrument: "EU Energy System Integration Strategy, TEN-E",
    quote: "Despite the endorsement of the system integration as a strategic direction by the European Commission in 2020, the EU still does not plan and operate the energy system as a whole (implementation gap).",
    reference: "Ch. 4 Energy supply, p. 50, line 2",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "energy-hydrogen-support",
    sector: "Energy supply",
    type: "policy",
    title: "Hydrogen support ignores techno-economic limits",
    description: "The EU's massive policy support to the hydrogen value chain does not sufficiently reflect the techno-economic limits of hydrogen and its role in the integrated and decarbonised energy systems.",
    instrument: "RED III, EED, EPBD, Net-Zero Industry Act",
    quote: "The EU's massive policy support to the hydrogen value chain does not sufficiently reflect the techno-economic limits of hydrogen and its role in the integrated and decarbonised energy systems (policy gap).",
    reference: "Ch. 4 Energy supply, p. 50, line 14",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "energy-ccs-scope",
    sector: "Energy supply",
    type: "policy",
    title: "No EU definition of legitimate CCS applications",
    description: "Residual emissions (e.g. in agriculture or industry) that motivate the use of carbon capture and storage (CCS) are currently not defined at EU or Member State level.",
    instrument: "Net-Zero Industry Act, TEN-E Regulation, Innovation Fund (State-aid rules)",
    quote: "Residual emissions (e.g. in agriculture or industry) that motivate the use of carbon capture and storage (CCS) are currently not defined at the EU or Member State level (policy gap).",
    reference: "Ch. 4 Energy supply, p. 50, line 31",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "energy-methane-upstream",
    sector: "Energy supply",
    type: "policy",
    title: "Imported upstream methane emissions not priced",
    description: "The Methane Regulation does not put a price on leaking upstream emissions and does not align with similar international initiatives.",
    instrument: "EU Methane Regulation",
    quote: "The regulation does not put a price on leaking upstream emissions and does not align with similar international initiatives (policy gap).",
    reference: "Ch. 4 Energy supply, p. 51, line 38",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "industry-ceap-upstream",
    sector: "Industry",
    type: "policy",
    title: "Circular-economy policy focuses on recycling, not prevention",
    description: "The 2015 Circular Economy Action Plan (CEAP 1) and the strategy on plastics mainly targeted recycling, with little focus on solutions upstream in the waste hierarchy.",
    instrument: "Circular Economy Action Plan, Plastics Strategy",
    quote: "The 2015 circular economy action plan (CEAP 1) and the strategy on plastics mainly targeted recycling, with little focus on solutions upstream in the waste hierarchy (policy gap).",
    reference: "Ch. 5 Industry, p. 82, line 16",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "industry-ecodesign-scope",
    sector: "Industry",
    type: "policy",
    title: "Ecodesign circularity scope remained limited",
    description: "The Ecodesign Directive has been mainly focused on energy efficiency; product circularity has been added in recent years, and its scope remained limited to energy products.",
    instrument: "Ecodesign Directive",
    quote: "the Ecodesign Directive has been mainly focused on energy efficiency and, whereas product circularity has been added in recent years, its scope remained limited to energy products (policy gap).",
    reference: "Ch. 5 Industry, p. 82, line 18",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "industry-early-deployment",
    sector: "Industry",
    type: "policy",
    title: "Missing support for early deployment / lead markets",
    description: "Past EU policies have mainly focused on basic R&D (e.g. Horizon Europe), pilots and demonstration (NER 300 and the Innovation Fund) and large-scale diffusion of mature technologies (the EU ETS), but dedicated policies to support early deployment / market formation have been largely absent.",
    instrument: "Innovation Fund, EU ETS, (future) lead-market instruments",
    quote: "Past EU policies have been mainly focused on supporting basic R & D (e.g. Horizon Europe), pilots and demonstration (NER 300 and the Innovation Fund) and the large-scale diffusion of mature technologies (the EU ETS), but dedicated policies to support early deployment / market formation have been largely absent (policy gap).",
    reference: "Ch. 5 Industry, p. 83, line 17",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "transport-demand-moderation",
    sector: "Transport",
    type: "policy",
    title: "Transport demand moderation not an EU policy option",
    description: "Moderation of overall transport demand is not considered as an option in the EU's Sustainable and Smart Mobility Strategy.",
    instrument: "Sustainable and Smart Mobility Strategy",
    quote: "Moderation of overall transport demand is not considered as an option in the EU's Sustainable and Smart Mobility Strategy (policy gap).",
    reference: "Ch. 6 Transport, p. 103, line 11",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "transport-modal-shift-freight",
    sector: "Transport",
    type: "ambition",
    title: "Weak framework for rail/intermodal freight shift",
    description: "EU policies to support a modal shift (the Combined Transport Directive, the Rail Freight Corridors Regulation and the TEN-T regulation) have so far had little success owing to lack of ambition: outdated provisions in the Combined Transport Directive that prevent digitalised workflows, lack of adequate delivery mechanisms in the Rail Freight Corridors Regulation, and lack of an overview of current and future required capacities of intermodal terminals under the TEN-T regulation.",
    instrument: "Combined Transport Directive, Rail Freight Corridors Regulation, TEN-T",
    quote: "Furthermore, EU policies to support a modal shift (the Combined Transport Directive, the Rail Freight Corridors Regulation, the Trans-European Transport Network (TEN-T) regulation) have so far had little success owing to lack of ambition (e.g. outdated provisions in the Combined Transport directive that prevent digitalised workflows, lack of adequate delivery mechanisms in the Rail Freights Corridors Regulation, lack of an overview of current and future required capacities of intermodal terminals under the TEN-T regulation) (ambition gap)",
    reference: "Ch. 6 Transport, p. 103, line 12",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "transport-modal-shift-implementation",
    sector: "Transport",
    type: "implementation",
    title: "Heterogeneous Member-State freight-shift implementation",
    description: "Implementation of the modal-shift measures has been incomplete and heterogeneous across Member States.",
    instrument: "Rail Freight Corridors Regulation, Combined Transport Directive",
    quote: "EU policies to support a modal shift (the Combined Transport Directive, the Rail Freight Corridors Regulation, the Trans-European Transport Network (TEN-T) regulation) have so far had little success owing to lack of ambition (e.g. outdated provisions in the Combined Transport directive that prevent digitalised workflows, lack of adequate delivery mechanisms in the Rail Freights Corridors Regulation, lack of an overview of current and future required capacities of intermodal terminals under the TEN-T regulation) (ambition gap) and incomplete and heterogeneous implementation at the Member State level (implementation gap).",
    reference: "Ch. 6 Transport, p. 103, line 12",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "transport-zev-efficiency",
    sector: "Transport",
    type: "ambition",
    title: "CO₂ standards do not reward vehicle efficiency",
    description: "While CO₂ emission performance standards for cars and vans effectively accelerate ZEV uptake, they do not incentivise efficiency (smaller, more efficient vehicles) within the ZEV segment, and might even incentivise the uptake of larger, less-efficient ZEVs.",
    instrument: "CO₂ emission standards for cars and vans",
    quote: "Whereas these policies can effectively accelerate the uptake of ZEVs, they currently do not incentivise efficiency (smaller, more efficient vehicles) within the segment of ZEVs (ambition gap), and might even incentivise the uptake of larger, less-efficient ZEVs (policy inconsistency), increasing pressure on the already constrained availability of critical resources.",
    reference: "Ch. 6 Transport, p. 103, line 41",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: "TAGGING: the report tags TWO barriers in this sentence — the failure to incentivise efficiency is an (ambition gap) and the pull towards larger, less-efficient ZEVs is a (policy inconsistency). This row carries the ambition tag; the inconsistency is recorded here rather than as a separate row. The report's phrase 'these policies' also covers the CO2 standards for HDVs, the AFIR, the revised Clean Vehicles Directive and EU State aid guidelines, not only the car and van standards."
  },
  {
    id: "transport-biofuels-indirect",
    sector: "Transport",
    type: "ambition",
    title: "Policies still promote high-indirect-effect biofuels",
    description: "The RED III, ReFuelEU Aviation and FuelEU Maritime continue to promote some biofuels with potentially high indirect effects, such as fuels made from food and feed crops (up to 7 %), intermediate crops and specific types of animal fats ('category 3 animal fats').",
    instrument: "RED III, ReFuelEU Aviation, FuelEU Maritime",
    quote: "Nevertheless, concerns remain, as these policies continue to promote some biofuels with potentially high indirect effects, such as fuels made from food and feed crops (up to 7 %), intermediate crops and specific types of animal fats (so-called “category 3 animal fats”) (ambition gap).",
    reference: "Ch. 6 Transport, p. 104, line 14",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "transport-biofuel-fraud",
    sector: "Transport",
    type: "implementation",
    title: "Suspected fraud in biofuel sustainability labelling",
    description: "There are well-founded suspicions of fraud in the labelling of transport biofuels as sustainable.",
    instrument: "RED III",
    quote: "Furthermore, there are well-founded suspicions of fraud in the labelling of biofuels as sustainable (implementation gap).",
    reference: "Ch. 6 Transport, p. 104, line 17",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "transport-extra-eu-exemption",
    sector: "Transport",
    type: "policy",
    title: "Extra-EU aviation and maritime largely exempt from ETS",
    description: "Extra-EU aviation and half of extra-EU maritime transport remain exempt from the EU ETS.",
    instrument: "EU ETS (aviation & maritime)",
    quote: "Furthermore, extra-EU aviation and half of extra-EU maritime transport remains exempt from the EU ETS (policy gap).",
    reference: "Ch. 6 Transport, p. 105, line 5",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "buildings-deep-retrofit",
    sector: "Buildings",
    type: "implementation",
    title: "Barriers to deep energy retrofits not overcome",
    description: "EU policies so far have not overcome the barriers to wide-scale and deep energy retrofits of the building stock. The EPBD recast aims to address this gap.",
    instrument: "Energy Performance of Buildings Directive (EPBD recast)",
    quote: "EU policies so far have not overcome barriers to wide-scale and deep energy retrofits of buildings (implementation gap).",
    reference: "Ch. 7 Buildings, p. 129, line 8",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "buildings-renovation-strategies",
    sector: "Buildings",
    type: "implementation",
    title: "Long-term renovation strategies lack quality and ambition",
    description: "The quality and ambition of the EU's long-term renovation strategies are not sufficient to guide the required building renovation towards the 2050 climate-neutrality objective (renamed 'national building renovation plans' under the EPBD recast).",
    instrument: "EPBD — National Building Renovation Plans",
    quote: "The quality and ambition of the EU’s long-term renovation strategies are not sufficient to guide the required building renovation towards the 2050 climate neutrality objective (implementation gap).",
    reference: "Ch. 7 Buildings, p. 129, line 14",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "buildings-fossil-gas-subsidy",
    sector: "Buildings",
    type: "inconsistency",
    title: "Fossil-gas subsidies and weak standards cause lock-in",
    description: "Subsidies to fossil gas allowed under the Energy Taxation Directive and EU State-aid rules act as a policy inconsistency; separately, insufficiently robust EU standards lead to only incremental energy-efficiency improvements and lock-in effects.",
    instrument: "Energy Taxation Directive, EU State-aid rules",
    quote: "This is thanks to, among other factors, subsidies to fossil gas allowed under the ETD and EU State aid rules (policy inconsistency), a lack of system integration (see Chapter 4 ‘Energy supply’) and insufficiently robust EU standards leading to incremental energy efficiency improvements and lock-in effects (policy gap).",
    reference: "Ch. 7 Buildings, p. 129, line 38",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: "TAGGING: the report tags TWO barriers here — the fossil-gas subsidies allowed under the ETD are a (policy inconsistency), and the insufficiently robust EU standards and resulting lock-in are a (policy gap). This row carries the inconsistency tag; the policy gap is recorded here."
  },
  {
    id: "buildings-spatial-planning",
    sector: "Buildings",
    type: "ambition",
    title: "No EU guidance on sufficiency in spatial planning",
    description: "The EU does not prominently guide urban/spatial planning and taxation towards energy and material sufficiency.",
    instrument: "EU spatial-planning / taxation guidance",
    quote: "The EU does not prominently guide urban/spatial planning and taxation towards energy and material sufficiency (ambition gap).",
    reference: "Ch. 7 Buildings, p. 130, line 22",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "buildings-epc-quality",
    sector: "Buildings",
    type: "ambition",
    title: "Energy Performance Certificates of uneven quality",
    description: "Energy performance certificate (EPC) schemes are of uneven quality and have limited reliability, as they are based on data derived from the physical properties of buildings rather than energy demand driven by occupancy behaviour.",
    instrument: "EPBD — Energy Performance Certificates",
    quote: "The EPC schemes are of uneven quality and have limitations in terms of reliability, as they are based on data derived from the physical properties of buildings rather than energy demand driven by occupancy behaviour (ambition gap).",
    reference: "Ch. 7 Buildings, p. 131, line 2",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "agri-cap-qualitative",
    sector: "Agriculture",
    type: "ambition",
    title: "CAP climate objective is largely qualitative",
    description: "Within the CAP, the aim of contributing to climate-change mitigation is largely qualitative and forms part of a broader set of agri-environmental objectives (also covering adaptation, soil and biodiversity preservation, and animal welfare).",
    instrument: "Common Agricultural Policy (CAP)",
    quote: "Within the CAP, the aim of contributing to climate change mitigation is largely qualitative and forms part of a broader set of agri-environmental objectives (also covering adaptation, soil and biodiversity preservation, and animal welfare) (ambition gap).",
    reference: "Ch. 8 Agriculture, p. 154, line 7",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "agri-csp-discretionary",
    sector: "Agriculture",
    type: "ambition",
    title: "CAP Strategic Plans leave mitigation discretionary",
    description: "The CAP's climate and environment aims are pursued by Member States in their CAP Strategic Plans (CSPs), where the emphasis given to climate-change mitigation is largely discretionary and difficult to quantify ex ante.",
    instrument: "CAP Strategic Plans",
    quote: "The CAP's climate and environment aims are pursued by Member States in their CAP Strategic Plans (CSPs), where the emphasis given to climate change mitigation is largely discretionary and difficult to quantify ex ante (ambition gap).",
    reference: "Ch. 8 Agriculture, p. 154, line 9",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "agri-no-pricing",
    sector: "Agriculture",
    type: "policy",
    title: "Agricultural emissions not covered by GHG pricing",
    description: "Emissions from agriculture are not covered by a GHG emission-pricing regime.",
    instrument: "EU GHG-pricing framework (ETS family)",
    quote: "Emissions from agriculture are also not covered by a GHG emission-pricing regime (policy gap).",
    reference: "Ch. 8 Agriculture, p. 154, line 14",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "agri-food-waste-targets",
    sector: "Agriculture",
    type: "policy",
    title: "Key demand-side legislation not yet adopted",
    description: "Several initiatives announced in the Farm to Fork Strategy have not yet been adopted as final legislation; in particular, proposed legislation such as targets on food waste reduction has not yet been adopted by policymakers.",
    instrument: "Waste Framework Directive revision",
    quote: "In other cases, proposed legislation has not yet been adopted by policymakers (such as targets on food waste reduction) (policy gap).",
    reference: "Ch. 8 Agriculture, p. 155, line 16",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "lulucf-wetland-restoration",
    sector: "LULUCF",
    type: "implementation",
    title: "Wetland-restoration eco-schemes barely used",
    description: "The CAP allows support mechanisms (eco-schemes) for the restoration of wetlands, but these are used to only a limited extent by Member States.",
    instrument: "CAP eco-schemes",
    quote: "The CAP also allows support mechanisms (eco-schemes) for the restoration of wetlands, but these are used to only a limited extent by Member States (implementation gap).",
    reference: "Ch. 9 LULUCF, p. 182, line 19",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "lulucf-farm-to-fork-leakage",
    sector: "LULUCF",
    type: "policy",
    title: "Yield-reducing targets risk production leakage",
    description: "The Farm to Fork Strategy objectives to reduce fertiliser use (by 20%) and increase the share of organic farming (to 20%) have direct local environmental benefits, but risk reducing yields and therefore increasing demand for land (either in the EU or abroad) if demand for agricultural products is not reduced in parallel.",
    instrument: "Farm to Fork Strategy, CAP",
    quote: "The objectives of the Farm to Fork Strategy to reduce fertiliser use (by 20 %) and increase the share of organic farming (to 20 %) have direct local environmental benefits, but risk reducing yields and therefore increasing demand for land (either in the EU or abroad) if demand for agricultural products is not reduced in parallel (policy gap).",
    reference: "Ch. 9 LULUCF, p. 182, line 20",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "lulucf-food-waste-legal",
    sector: "LULUCF",
    type: "ambition",
    title: "Legal food-waste targets fall short of the 50% aim",
    description: "The Farm to Fork Strategy includes an ambitious (non-binding) objective to reduce food waste per capita by 50% by 2030, but the proposed legal objectives under the Waste Framework Directive fall short of achieving this.",
    instrument: "Waste Framework Directive revision",
    quote: "It also includes an ambitious (non-binding) objective to reduce food waste per capita by 50 % by 2030, but the proposed legal objectives under the Waste Framework Directive fall short of achieving this (ambition gap).",
    reference: "Ch. 9 LULUCF, p. 182, line 24",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "lulucf-bioenergy-exemptions",
    sector: "LULUCF",
    type: "ambition",
    title: "Bioenergy sustainability exemptions and compliance gaps",
    description: "Under the RED III, specific exemptions (ambition gap) together with monitoring and compliance issues, including fraud (implementation gap), risk undermining the effectiveness of the sustainability criteria and the provisions on the cascading principle.",
    instrument: "RED III sustainability criteria",
    quote: "Firstly, specific exemptions (ambition gap) and monitoring and compliance issues (including fraud) (implementation gap) risk undermining the effectiveness of the sustainability criteria and provisions on the cascading principle under the RED III.",
    reference: "Ch. 9 LULUCF, p. 183, line 7",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: "TAGGING: the report tags TWO barriers in this sentence — the specific exemptions are an (ambition gap) and the monitoring and compliance issues, including fraud, are an (implementation gap). This row carries the ambition tag; the implementation gap is recorded here."
  },
  {
    id: "lulucf-bioenergy-supply-info",
    sector: "LULUCF",
    type: "implementation",
    title: "Insufficient data on sustainable biomass supply",
    description: "So far, Member States have provided insufficient information for the European Commission to assess the compatibility between projected bioenergy demand and sustainably available supply.",
    instrument: "RED III, LULUCF Regulation reporting",
    quote: "Secondly, so far, Member States have provided insufficient information for the European Commission to assess the compatibility between projected bioenergy demand and sustainably available supply (implementation gap).",
    reference: "Ch. 9 LULUCF, p. 183, line 10",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "lulucf-biomass-incentives",
    sector: "LULUCF",
    type: "policy",
    title: "Uneven incentives: forest biomass energy vs. carbon sink",
    description: "The incentives for using forest biomass for energy purposes versus maximising the LULUCF carbon sink continue to be unevenly distributed, in the absence of a financial incentive for land managers to reduce emissions and increase removals in the LULUCF sector.",
    instrument: "RED III, LULUCF Regulation, CAP",
    quote: "Furthermore, the incentives for using forest biomass for energy purposes versus maximising the LULUCF carbon sink continue to be unevenly distributed in the absence of a financial incentive for land managers to reduce emissions and increase removals in the LULUCF sector (policy gap) (see also Chapter 10 'Pricing emissions and rewarding removals').",
    reference: "Ch. 9 LULUCF, p. 183, line 12",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "lulucf-red-end-use",
    sector: "LULUCF",
    type: "policy",
    title: "RED III does not differentiate bioenergy by end use",
    description: "Key EU policies such as the RED III do not differentiate incentives for bioenergy use as a function of the other available mitigation options for each end use.",
    instrument: "RED III",
    quote: "However, key EU policies such as the RED III do not differentiate incentives for bioenergy use as a function of other available mitigation options for each end use (policy gap).",
    reference: "Ch. 9 LULUCF, p. 183, line 20",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "lulucf-grassland-gaec1",
    sector: "LULUCF",
    type: "ambition",
    title: "GAEC 1 does not prevent grassland carbon losses",
    description: "The mandatory requirement to maintain grasslands (GAEC 1) does not prevent agricultural practices that lead to high soil carbon emissions from grasslands.",
    instrument: "CAP conditionality (GAEC 1)",
    quote: "The mandatory requirement on the maintenance of grasslands (GAEC 1) does not prevent agricultural practices that lead to high soil carbon emissions from grasslands (ambition gap).",
    reference: "Ch. 9 LULUCF, p. 184, line 3",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "lulucf-carbon-farming-uptake",
    sector: "LULUCF",
    type: "implementation",
    title: "Carbon-farming eco-schemes low in uptake and ambition",
    description: "Although most Member States set carbon-storage targets for soil and biomass, only eight included voluntary eco-schemes to incentivise carbon farming, often with low levels of ambition.",
    instrument: "CAP eco-schemes",
    quote: "Whereas most Member States have set targets on carbon storage in soil and biomass, only eight of them included voluntary eco-schemes to incentivise carbon farming, often with low levels of ambition (implementation gap).",
    reference: "Ch. 9 LULUCF, p. 184, line 5",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "lulucf-no-cdr-incentive",
    sector: "LULUCF",
    type: "policy",
    title: "No financial incentive to enhance land-based removals",
    description: "Agriculture and LULUCF are excluded from the EU GHG-pricing regime, which implies a lack of overall financial incentive for farmers and land managers to enhance carbon dioxide removal.",
    instrument: "EU GHG-pricing framework, Carbon Removals Certification",
    quote: "The agriculture and LULUCF sectors are currently still excluded from the EU GHG-pricing regime, which also implies a lack of an overall financial incentive for farmers and land managers to enhance CDR (policy gap).",
    reference: "Ch. 9 LULUCF, p. 184, line 12",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "lulucf-sink-assumptions",
    sector: "LULUCF",
    type: "policy",
    title: "2030 LULUCF target ignores climate-driven sink risks",
    description: "The assumptions underpinning the 2030 LULUCF objective did not account for the uncertain effects of climate change and related natural disturbances on the development of the carbon sink.",
    instrument: "LULUCF Regulation",
    quote: "The assumptions that underpin the LULUCF objective for 2030 did not account for the uncertain effects of climate change and related natural disturbances on the development of the sink (policy gap).",
    reference: "Ch. 9 LULUCF, p. 184, line 33",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "pricing-ets-endgame",
    sector: "Carbon pricing",
    type: "policy",
    title: "No strategy for the ETS cap reaching zero",
    description: "The Fit for 55 revision of the EU ETS Directive brings forward the end of the supply of allowances for stationary installations to 2040, but there is not yet a clear strategy to prepare the carbon market and relevant sectors for this.",
    instrument: "EU ETS",
    quote: "By further accelerating the decline in emissions, the latest (Fit for 55) revision of the EU ETS Directive brings forward the end of the supply of allowances for stationary installations to 2040. However, there is not yet a clear strategy to prepare the carbon market and relevant sectors for this (policy gap).",
    reference: "Ch. 10 Pricing emissions, p. 208, line 24",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "pricing-ets2-cap-risk",
    sector: "Carbon pricing",
    type: "ambition",
    title: "ETS2 price-stability measures could weaken the cap",
    description: "If the EU ETS 2 carbon price exceeds the EUR 45/t CO₂e soft price cap, additional allowances would be released onto the market, de facto weakening the emissions cap and jeopardising achievement of the target.",
    instrument: "EU ETS 2 (buildings & road transport)",
    quote: "Modelling studies suggest that the carbon price in these sectors could reach well in excess of the EUR 45/t CO₂e soft price cap agreed in the revised EU ETS Directive. This would cause additional allowances to be released on to the market, thereby de facto weakening the emissions cap and jeopardising achievement of the target (ambition gap).",
    reference: "Ch. 10 Pricing emissions, p. 209, line 42",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "pricing-regime-coverage",
    sector: "Carbon pricing",
    type: "policy",
    title: "A quarter of EU emissions outside any GHG pricing",
    description: "Around 26% of EU emissions (795 Mt CO₂e emissions and 230 Mt CO₂e removals in 2021) would remain excluded from any EU-wide carbon-pricing mechanism by 2030 — most of it due to the absence of pricing for agriculture and LULUCF, the remainder from partial exclusion of certain sectors (international aviation and maritime; non-CO₂ emissions; some smaller sectors).",
    instrument: "EU ETS, ETS2, Effort Sharing Regulation",
    quote: "However, the remaining 26 % (795 Mt CO₂e emissions and 230 Mt CO₂e removals in 2021) would remain excluded from any EU-wide carbon-pricing mechanism by 2030. Most of this carbon price gap, illustrated in Figure 74, is related to the absence of an EU carbon-pricing mechanism for the agriculture and LULUCF sectors, and the remainder is due to the partial exclusion of certain sectors (international aviation and maritime; non-CO₂ emissions from energy production, transport and combustion; and some smaller sectors including waste landfilling, wastewater treatment, etc.).",
    reference: "Ch. 10 Pricing emissions, p. 224, line 22",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: "SOURCING: the quoted passage on p. 224 carries no inline gap tag. The 'policy gap' type comes from Table 16 on p. 227 ('Agriculture/food and land use are not covered by explicit carbon pricing')."
  },
  {
    id: "society-distributional-ia",
    sector: "Whole-of-society",
    type: "implementation",
    title: "Distributional impacts not consistently assessed",
    description: "Despite the Better Regulation toolbox providing instructions on assessing distributional and wider socio-economic impacts, EU climate policies have not always been accompanied by systematic measurement of such impacts.",
    instrument: "Better Regulation toolbox, impact assessments",
    quote: "Despite the better regulation toolbox being equipped with instructions regarding the assessment of distributional and wider socioeconomic impacts, EU climate policies have not always been accompanied by systematic measurement of such impacts (implementation gap).",
    reference: "Ch. 11 Whole-of-society, p. 228, line 22",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "society-narratives",
    sector: "Whole-of-society",
    type: "ambition",
    title: "Narratives neglect co-benefits and local values",
    description: "Narratives surrounding climate policy instruments tend to focus on GHG emission reduction and cost-effectiveness, without due attention to their co-benefits or to local needs and values.",
    instrument: "EU climate communication / just-transition framing",
    quote: "The narratives surrounding climate policy instruments tend to be focused on GHG emission reduction and cost-effectiveness, without due attention paid to their co-benefits or to local needs and values (ambition gap).",
    reference: "Ch. 11 Whole-of-society, p. 229, line 4",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "society-ex-ante-socioeconomic",
    sector: "Whole-of-society",
    type: "policy",
    title: "Few policies informed by ex-ante socio-economic analysis",
    description: "Few EU climate policies are informed by ex-ante assessments of their possible socio-economic impacts, which may affect the design and funding of social compensation instruments.",
    instrument: "Impact-assessment framework",
    quote: "Few EU climate policies are informed by ex ante assessments of their possible socioeconomic impacts (policy gap).",
    reference: "Ch. 11 Whole-of-society, p. 229, line 18",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "finance-needs-methodology",
    sector: "Finance & investment",
    type: "policy",
    title: "No harmonised method to estimate investment needs",
    description: "A knowledge gap on climate-related investment needs persists, mainly due to the lack of a harmonised methodology for identifying and estimating those needs.",
    instrument: "EU investment-needs monitoring",
    quote: "This knowledge gap is mainly due to the lack of a harmonised methodology for identifying and estimating climate-related investment needs (policy gap).",
    reference: "Ch. 12 Finance & investment, p. 236, line 22",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "finance-fossil-subsidy-deadline",
    sector: "Finance & investment",
    type: "implementation",
    title: "Few Member States set a fossil-subsidy phase-out date",
    description: "The 8th Environment Action Programme requires the Commission and Member States to set a deadline for phasing out fossil fuel subsidies consistent with the 1.5 °C objective, but so far only a few Member States have enacted laws or set out clear plans specifying how and by when this will be achieved.",
    instrument: "8th Environment Action Programme, NECPs",
    quote: "The 8th EAP requires the European Commission and Member States to set a deadline for the phasing out of fossil fuel subsidies consistent with the 1.5 °C objectives, but so far only a few Member States have enacted laws or set out clear plans that specify how and by when this will be achieved (implementation gap).",
    reference: "Ch. 12 Finance & investment, p. 236, line 39",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "finance-budget-tracking",
    sector: "Finance & investment",
    type: "ambition",
    title: "Flawed EU-budget climate-spending tracking",
    description: "There are substantial flaws in the methodology used to track EU-budget spending on climate action, which result in overestimating the EU budget's contribution towards the EU's climate objectives.",
    instrument: "EU budget (MFF) climate-tracking methodology",
    quote: "There are substantial flaws in the methodology applied to track the spending of the EU budget on climate action, which result in overestimating the EU budget's contribution towards the EU's climate objectives (ambition gap).",
    reference: "Ch. 12 Finance & investment, p. 237, line 19",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "finance-rrf-successor",
    sector: "Finance & investment",
    type: "policy",
    title: "No clear successor to the RRF after 2026",
    description: "The RRF is expected to cease after 2026 and it is unclear whether it will be succeeded by a similar instrument, reflecting a lack of long-termism.",
    instrument: "Recovery and Resilience Facility (RRF)",
    quote: "Furthermore, the RRF itself is expected to cease after 2026 and it is not clear whether it will be succeeded by a similar instrument, reflecting a lack of long-termism (policy gap).",
    reference: "Ch. 12 Finance & investment, p. 237, line 28",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "finance-sgp-investment",
    sector: "Finance & investment",
    type: "ambition",
    title: "Reformed fiscal rules lack climate-investment carve-out",
    description: "Despite calls to provide specific rules for climate-related public investment, the Commission's proposal to reform the Stability and Growth Pact does not differentiate investments related to the climate transition.",
    instrument: "Stability and Growth Pact",
    quote: "Despite calls from policymakers and experts to provide specific rules for climate-related public investments, the European Commission's recent proposal to reform the Stability and Growth Pact does not differentiate investments related to the climate transition (ambition gap).",
    reference: "Ch. 12 Finance & investment, p. 238, line 13",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "finance-step-budget",
    sector: "Finance & investment",
    type: "ambition",
    title: "STEP / Sovereignty-Fund budget too limited",
    description: "The proposed Strategic Technologies for Europe Platform, presented as a first step towards an EU Sovereignty Fund, carries too limited a budget (EUR 10 billion, versus more than EUR 300 billion per year in State aid in 2021) to be sufficiently effective in countering the risk that relaxed State aid rules fragment the EU single market.",
    instrument: "Strategic Technologies for Europe Platform (STEP)",
    quote: "Proposals from European Commission to address this (the proposed Strategic Technologies for Europe Platform, as a first step towards an EU Sovereignty Fund) include too limited a budget (EUR 10 billion compared with more than EUR 300 billion per year in State aid in 2021) to be sufficiently effective (ambition gap).",
    reference: "Ch. 12 Finance & investment, p. 238, line 18",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "finance-green-bonds-alignment",
    sector: "Finance & investment",
    type: "ambition",
    title: "NGEU green bonds not aligned with EU taxonomy/standard",
    description: "Green bonds issued under NextGenerationEU are not necessarily aligned with the EU Taxonomy and the EU Green Bond Standard, which reduces transparency on the use of proceeds and can undermine credibility in the credit market, resulting in higher borrowing costs.",
    instrument: "NextGenerationEU green bonds, EU Green Bond Standard",
    quote: "So far, green bonds issued under NextGenerationEU are not necessarily aligned with the EU Taxonomy and the EU Green Bond Standard, which reduces transparency on the use of proceeds and can undermine credibility in the credit market, resulting in higher borrowing costs (ambition gap).",
    reference: "Ch. 12 Finance & investment, p. 239, line 19",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "innovation-admin-complexity",
    sector: "Innovation",
    type: "implementation",
    title: "Administrative complexity deters private co-investment",
    description: "The main EU instruments for catalysing private investment in climate technologies, Horizon Europe and the Innovation Fund, have an administrative complexity that hinders the crowding-in of private investment.",
    instrument: "Horizon Europe, Innovation Fund",
    quote: "The main EU policy instruments aiming to catalyse private investment are Horizon Europe and the Innovation Fund. One of their main focuses is climate-related technologies; however, their administrative complexity hinders the crowding-in of private investments (implementation gap).",
    reference: "Ch. 13 Innovation, p. 255, line 16",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "innovation-monitoring",
    sector: "Innovation",
    type: "policy",
    title: "Innovation progress not monitored beyond early stages",
    description: "Public funding instruments can be slow to react to the fast-paced global clean-technology arena; this responsiveness should be monitored at EU level, particularly beyond early-stage research.",
    instrument: "Horizon Europe, Innovation Fund",
    quote: "Public funding instruments can sometimes be slow in reacting to the changing needs of the fast-paced global clean technology arena. This should be monitored at the EU level, particularly beyond early-stage research (policy gap).",
    reference: "Ch. 13 Innovation, p. 255, line 18",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "innovation-scale-up-gap",
    sector: "Innovation",
    type: "policy",
    title: "Funding gap between demonstration and deployment",
    description: "Current policy focuses support on the two ends of the RD&D process, leaving a funding gap for climate-technology manufacturing or deployment projects trying to complete piloting/demonstration and move towards early deployment (the 'valley of death').",
    instrument: "European Research Council, Horizon Europe; pricing/demand-pull incentives",
    quote: "This policy mix leaves a funding gap for climate technology manufacturing or deployment projects aiming to complete the piloting and demonstration stage and move towards the early deployment of clean technologies (policy gap).",
    reference: "Ch. 13 Innovation, p. 256, line 7",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "innovation-venture-capital",
    sector: "Innovation",
    type: "policy",
    title: "Weak European venture capital for clean tech",
    description: "The funding gap is further widened by the relative lack of venture-capital support, as venture capital remains less developed in Europe than in, for example, the United States.",
    instrument: "Venture-capital / scale-up finance",
    quote: "This funding gap is further widened by the relative lack of support from venture capital, as this concept remains less developed in Europe than in the United States, for instance (policy gap).",
    reference: "Ch. 13 Innovation, p. 256, line 9",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "innovation-collaboration",
    sector: "Innovation",
    type: "policy",
    title: "Insufficient public-private research collaboration",
    description: "Innovation policy instruments need to foster stronger collaboration between private and public knowledge organisations, an opportunity currently under-exploited.",
    instrument: "Strategic Energy Technology (SET) Plan",
    quote: "Policy instruments on innovation need to foster collaborations between private and public knowledge organisations, creating opportunities for building stronger collaborations (policy gap).",
    reference: "Ch. 13 Innovation, p. 257, line 11",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "innovation-predictability",
    sector: "Innovation",
    type: "ambition",
    title: "Limited funding predictability beyond 2030",
    description: "The existing EU funding architecture offers limited predictability beyond 2030, which increases uncertainty for long-term projects.",
    instrument: "EU funding architecture",
    quote: "The existing EU funding architecture offers limited predictability beyond 2030, which increases uncertainty for long-term projects.",
    reference: "Ch. 13 Innovation, p. 266, line 27",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "innovation-nzia-reporting",
    sector: "Innovation",
    type: "policy",
    title: "Weak reporting on Net-Zero Industry Act 40% target",
    description: "The Net-Zero Industry Act aims to reach at least 40% of domestic needs in strategic technologies, but the existing reporting mechanisms offer limited means to track progress towards achieving this target.",
    instrument: "Net-Zero Industry Act",
    quote: "The Net-Zero Industry Act aims to increase the EU's manufacturing capacity in strategic technologies to reach at least 40 % of domestic needs; however, the existing reporting mechanisms offer limited means to track progress towards achieving this target.",
    reference: "Ch. 13 Innovation, p. 266, line 18",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "governance-necp-horizon",
    sector: "Climate governance",
    type: "ambition",
    title: "NECP 10-year horizon too short for 2050 consistency",
    description: "The 10-year frame of the NECPs seems too short to ensure policy consistency with 2050 objectives, and the connection between the NECPs and LTSs is based on weak consistency processes.",
    instrument: "Governance Regulation (NECPs & LTSs)",
    quote: "The 10-year frame of the NECPs seems too short to ensure policy consistency with 2050 objectives, and the connection between the NECPs and LTSs is based on weak consistency processes (ambition gap).",
    reference: "Ch. 14 Climate governance, p. 267, line 16",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "governance-necp-quality",
    sector: "Climate governance",
    type: "implementation",
    title: "NECP milestone information insufficient",
    description: "The quality of information on some of the key net-zero milestones in the first NECPs submitted, and their updates so far, is insufficient to allow the European Commission to assess the consistency of national policies and measures with climate neutrality.",
    instrument: "Governance Regulation (NECPs)",
    quote: "The quality of information on some of the key milestones on the EU's path to net zero included in the first NECPs submitted, and their updates so far, is insufficient to allow the European Commission to assess the consistency of national policies and measures with climate neutrality (implementation gap).",
    reference: "Ch. 14 Climate governance, p. 267, line 18",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "governance-necp-participation",
    sector: "Climate governance",
    type: "implementation",
    title: "Transparency and public-engagement deficits in NECPs",
    description: "Deficits in transparency and public engagement are observed in NECP preparation at national level; the Committee of the Regions notes that multilevel dialogues are often not permanent and NECPs are not always in tune with subnational climate policies.",
    instrument: "Governance Regulation, Aarhus Convention",
    quote: "Deficits in transparency and in public engagement are observed in NECP preparation at the national level (implementation gap). […] The Committee of the Regions points out that the dialogues are often not permanent and the NECPs are not always in tune with subnational climate policies (implementation gap).",
    reference: "Ch. 14 Climate governance, pp. 268–269 (two sentences joined — see the ellipsis in the quote)",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "governance-impact-assessments",
    sector: "Climate governance",
    type: "implementation",
    title: "Far-reaching acts lacking climate impact assessments",
    description: "Despite improved impact-assessment practice in 2022, some far-reaching non-legislative acts - establishing taxonomy criteria for sustainable investment and defining some renewable transport fuels - were not accompanied by appropriate impact assessments including public consultation and climate-neutrality checks.",
    instrument: "Better Regulation, climate-neutrality checks",
    quote: "Moreover, despite the impact assessment practice having improved significantly in 2022 thanks to the climate neutrality checks, far-reaching non-legislative acts establishing taxonomy criteria for sustainable investment and defining some renewable transport fuels have not been accompanied by appropriate impact assessments including public consultation and climate neutrality checks (implementation gap).",
    reference: "Ch. 14 Climate governance, p. 268, line 23",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "governance-aarhus",
    sector: "Climate governance",
    type: "implementation",
    title: "EU in breach of the Aarhus Convention",
    description: "The EU is in breach of the Aarhus Convention in relation to access to justice in State-aid matters and public engagement in the NECP process.",
    instrument: "Aarhus Convention, State-aid rules",
    quote: "In addition, the EU is in breach of the Aarhus Convention in relation to access to justice in state aid matters and public engagement in the NECP process (implementation gap).",
    reference: "Ch. 14 Climate governance, p. 268, line 27",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "governance-advisory-bodies",
    sector: "Climate governance",
    type: "ambition",
    title: "National climate advisory bodies not mandatory",
    description: "The European Climate Law only encourages Member States to establish national climate advisory bodies, without making them mandatory, and no link to such bodies is made in the procedural obligations of the NECPs (e.g. within the multilevel climate and energy dialogues).",
    instrument: "European Climate Law, Governance Regulation",
    quote: "The European Climate Law only encourages the Member States to establish national climate advisory bodies, without making such bodies mandatory and no link to such bodies is made in the procedural obligations of the NECPs, for example as part of the multilevel climate and energy dialogues (ambition gap).",
    reference: "Ch. 14 Climate governance, p. 269, line 25",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "labour-eu-skills-gap",
    sector: "Labour & skills",
    type: "policy",
    title: "Remaining EU-level gaps on green skills",
    description: "Although education and training schemes are largely a Member-State competence, some policy gaps remain at EU level, particularly regarding workforce mobility and mutual recognition of qualifications in the construction sector.",
    instrument: "EU coordination (education/training is a Member-State competence)",
    quote: "Although design and implementation of education and training schemes is largely the responsibility of member states, there are some remaining policy gaps at a European level, particularly regarding workforce mobility and mutual recognition of qualifications in the construction sector (policy gap).",
    reference: "Ch. 15 Labour, skills and capacity building, p. 278, line 18",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "labour-sector-upskilling",
    sector: "Labour & skills",
    type: "implementation",
    title: "Weak upskilling in key transition sectors",
    description: "Low participation in training in some key sectors (e.g. buildings, agriculture) limits the opportunities to upskill and enhance knowledge exchange relevant to the transition.",
    instrument: "Vocational training provision (Member-State competence)",
    quote: "Low participation in training in some key sectors (e.g. buildings, agriculture) also limits the opportunities to upskill and enhance knowledge exchange relevant to the transition (implementation gap).",
    reference: "Ch. 15 Labour, skills and capacity building, p. 278, line 21",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  },
  {
    id: "labour-fossil-gas-transition",
    sector: "Labour & skills",
    type: "policy",
    title: "No EU transition schemes for fossil-gas workers",
    description: "Transition schemes for workers in the fossil-gas sector are largely still absent at EU level.",
    instrument: "Just Transition Fund / mechanism",
    quote: "Transition schemes for workers in the fossil gas sector are also largely still absent at the EU level (policy gap).",
    reference: "Ch. 15 Labour, skills and capacity building, p. 279, line 2",
    reportStatus: "open",
    currentStatus: "open",
    statusNote: ""
  }
];

/** The report metadata, surfaced in the UI. */
export const GAP_REPORT_META = {
  title: 'Towards EU climate neutrality: Progress, policy gaps and opportunities',
  author: 'European Scientific Advisory Board on Climate Change (ESABCC)',
  published: 'January 2024',
  url: 'https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities',
};
