// ---------------------------------------------------------------------------
// Policy coherence assessment — beta four-step model.
//
// A SYSTEM-level lens over the tracked policy corpus, complementing the
// per-act objective–delivery checklist (policy-objective-checklist.ts):
// where the checklist asks "can this act deliver its own objective?", this
// model asks "does the policy SPACE cohere — with the world, with itself,
// with its means, and with what we can measure?". Four steps:
//
//   1. Ex ante design vs world development — do the assumptions the act was
//      designed on still hold against how the world actually developed?
//      (curated, per policy)
//   2. Coherence across policy goals — do the goals of the policies in the
//      space reinforce or undercut each other? (curated, pairwise)
//   3. Goals vs means of implementation — are the means commensurate with
//      the goals? DERIVED from the objective–delivery checklist verdicts
//      (instruments, coverage, enforcement, financing, timeline) so the two
//      lenses never diverge and nothing is re-assessed twice.
//   4. Policy evaluation — can policy change and policy outcomes be
//      measured, and what do the measurements show? Machinery is DERIVED
//      from the checklist (monitoring, review); observed policy change and
//      outcomes are curated per policy.
//
// Redundancy note (deliberate design decision): steps 3 and 4 reuse the
// (policyId, check-*) verdicts shipped in PR #302's checklist as their
// evidence base instead of duplicating them. Only what the checklist cannot
// express — assumptions vs world (1), cross-policy goal interactions (2)
// and measured outcomes (4b) — is authored here.
//
// Like the master tags and checklist verdicts, every curated entry is an
// AI-assessed baseline (origin 'ai'); prefer re-running the assessment
// agents over hand-editing. Snapshot date for world developments: mid-2026.
// ---------------------------------------------------------------------------

import {
  getPolicyChecklist,
  POLICY_OBJECTIVE_CHECKLISTS,
  type ChecklistVerdict,
  type PolicyChecklistEntry,
} from './policy-objective-checklist';

// ── Model vocabulary ───────────────────────────────────────────────────────

export type CoherenceStepId = 'ex-ante' | 'horizontal' | 'goals-means' | 'evaluation';

/** Unified per-step grade, comparable across all four steps. */
export type CoherenceGrade = 'coherent' | 'partial' | 'incoherent' | 'not-assessed';

export interface CoherenceStepMeta {
  id: CoherenceStepId;
  ordinal: 1 | 2 | 3 | 4;
  /** Master code id under `root-coherence` in seed.ts. */
  codeId: string;
  name: string;
  shortName: string;
  question: string;
  /** Where the evidence comes from — surfaced in the UI for provenance. */
  basis: 'curated' | 'derived from objective–delivery checklist' | 'mixed';
  method: string;
}

export const COHERENCE_STEPS: CoherenceStepMeta[] = [
  {
    id: 'ex-ante',
    ordinal: 1,
    codeId: 'coh-exante',
    name: 'Ex ante design vs world development',
    shortName: 'Ex ante',
    question:
      'Do the assumptions the policy was designed on still hold against how the world actually developed?',
    basis: 'curated',
    method:
      'For each act, the load-bearing design assumption (technology costs, political economy, baseline trends) is stated and confronted with the observed development. Status: holds / drifting / broken.',
  },
  {
    id: 'horizontal',
    ordinal: 2,
    codeId: 'coh-horizontal',
    name: 'Coherence across policy goals',
    shortName: 'Across goals',
    question:
      'Across all policy goals of all policies in the space — do they reinforce or undercut each other?',
    basis: 'curated',
    method:
      'Pairwise screening of goal interactions across the corpus: synergy (goals reinforce), tension (goals compete at the margin), conflict (one goal is served at the direct expense of another).',
  },
  {
    id: 'goals-means',
    ordinal: 3,
    codeId: 'coh-means',
    name: 'Between policy goals and means of implementation',
    shortName: 'Goals ↔ means',
    question:
      'Are the means of implementation — instruments, coverage, enforcement, financing, timeline — commensurate with the stated goals?',
    basis: 'derived from objective–delivery checklist',
    method:
      'Derived, not re-assessed: the five means-side criteria of the objective–delivery checklist (instruments, coverage, enforcement, financing, timeline) are rolled into a means-coherence score per policy.',
  },
  {
    id: 'evaluation',
    ordinal: 4,
    codeId: 'coh-evaluation',
    name: 'Policy evaluation: measuring policy change and policy outcomes',
    shortName: 'Evaluation',
    question:
      'Can policy change and policy outcomes be measured — and what do the measurements show so far?',
    basis: 'mixed',
    method:
      'Evaluation machinery (MRV + review/ratchet) is derived from the checklist; observed policy change (output side) and measured outcomes (impact side) are curated against published indicator data.',
  },
];

export const COHERENCE_STEP_BY_ID: Record<CoherenceStepId, CoherenceStepMeta> =
  Object.fromEntries(COHERENCE_STEPS.map(s => [s.id, s])) as Record<
    CoherenceStepId,
    CoherenceStepMeta
  >;

// ── Step 1 · Ex ante design vs world development ───────────────────────────

export type AssumptionStatus = 'holds' | 'drifting' | 'broken';

export interface ExAnteAssessment {
  policyId: string;
  /** Year the ex-ante design assumptions were fixed (adoption / last recast). */
  designYear: number;
  /** The load-bearing assumption the act was designed on. */
  assumption: string;
  /** How the world actually developed against that assumption. */
  development: string;
  status: AssumptionStatus;
  confidence: number;
}

export const EX_ANTE_ASSESSMENTS: Record<string, ExAnteAssessment> = {
  'eu-climate-law': {
    policyId: 'eu-climate-law',
    designYear: 2021,
    assumption:
      'A stable pro-climate legislative majority would translate the 2050 objective into successive ratchets on schedule — starting with a 2040 target proposed by H1 2024 (Art. 4(3)).',
    development:
      'The 2040 proposal slipped past its legal deadline into a contested negotiation (−90% with international-credit and other flexibilities) inside a Commission cycle reframed around competitiveness and simplification.',
    status: 'drifting',
    confidence: 0.8,
  },
  'eu-ets-directive': {
    policyId: 'eu-ets-directive',
    designYear: 2023,
    assumption:
      'A steadily rising carbon price under the tightened cap would drive industrial abatement investment while CBAM enables the free-allocation phase-out.',
    development:
      'The cap mechanics worked — covered emissions kept falling and the MSR absorbed surplus — but part of the recent industrial decline reflects energy-crisis output contraction rather than abatement investment, and prices have ranged €60–90 rather than ratcheting.',
    status: 'holds',
    confidence: 0.75,
  },
  'effort-sharing-regulation': {
    policyId: 'effort-sharing-regulation',
    designYear: 2023,
    assumption:
      'National measures in transport, buildings, agriculture and waste would bend trajectories to the −40% aggregate, with flexibilities as a thin buffer.',
    development:
      'Commission assessments project an aggregate gap to −40%; several Member States are on course to overshoot their annual allocations with the flexibility pools too small to cover everyone who needs them.',
    status: 'drifting',
    confidence: 0.8,
  },
  'lulucf-regulation': {
    policyId: 'lulucf-regulation',
    designYear: 2023,
    assumption:
      'A roughly stable forest sink baseline from which targeted action could lift net removals to 310 Mt CO₂eq by 2030.',
    development:
      'The EU net sink collapsed — from around −310 Mt (2013–2016 average) to roughly −200 Mt — on harvest intensity, bark beetle, drought and fire. The baseline the target was calibrated on no longer exists.',
    status: 'broken',
    confidence: 0.85,
  },
  'renewable-energy-directive': {
    policyId: 'renewable-energy-directive',
    designYear: 2023,
    assumption:
      'Continued cost declines plus permitting acceleration would carry the renewables share to 42.5% by 2030.',
    development:
      'Solar over-delivers on cost and volume, but onshore wind permitting, auction under-subscription and grid-connection queues lag; aggregated NECP trajectories land short of 42.5% without additional measures.',
    status: 'drifting',
    confidence: 0.75,
  },
  'energy-efficiency-directive': {
    policyId: 'energy-efficiency-directive',
    designYear: 2023,
    assumption:
      'Structural efficiency gains would pace final consumption down to the 763 Mtoe cap along the stepped savings obligation.',
    development:
      'The 2022–23 consumption fall was partly crisis demand destruction, not structural; electrification plus data-centre and AI load growth now press the cap from below as demand normalises.',
    status: 'drifting',
    confidence: 0.7,
  },
  'cbam-regulation': {
    policyId: 'cbam-regulation',
    designYear: 2023,
    assumption:
      'Import-side carbon accounting would be administrable across the declarant base and accepted by trading partners as the price of open markets.',
    development:
      'The 2025 simplification raised the de-minimis to 50 t, removing the vast majority of declarants (while keeping ~99% of embedded emissions); the export side remains unsolved and partner-country friction and circumvention risks persist.',
    status: 'drifting',
    confidence: 0.7,
  },
  'co2-cars-regulation': {
    policyId: 'co2-cars-regulation',
    designYear: 2023,
    assumption:
      'EV cost parity and charging build-out would make 100% zero-emission new sales by 2035 a glide path, with 2025 targets as an early forcing point.',
    development:
      'EV uptake stalled in key markets in 2024, the 2025 compliance point was softened into 2025–27 averaging, and the 2035 review was pulled forward — the glide path is being renegotiated in flight.',
    status: 'drifting',
    confidence: 0.75,
  },
  'afir-regulation': {
    policyId: 'afir-regulation',
    designYear: 2023,
    assumption:
      'Fleet-based infrastructure targets would keep public charging ahead of EV uptake along the TEN-T network.',
    development:
      'Public charging growth broadly tracks the fleet-based targets; heavy-duty charging and hydrogen refuelling coverage lag but the light-duty design assumption is performing.',
    status: 'holds',
    confidence: 0.7,
  },
  'epbd-recast': {
    policyId: 'epbd-recast',
    designYear: 2024,
    assumption:
      'Affordable finance and national renovation plans would roughly double the renovation rate, with minimum standards pulling the worst stock first.',
    development:
      'Higher interest rates and political pushback on minimum-performance obligations have kept deep-renovation rates near 1%; the national plans due 2026 will show whether the trajectory can recover.',
    status: 'drifting',
    confidence: 0.7,
  },
  'social-climate-fund': {
    policyId: 'social-climate-fund',
    designYear: 2023,
    assumption:
      'ETS2 launches in 2027 with prices near the €45 soft cap, capitalising the fund at ~€65 bn in time to cushion vulnerable households before carbon costs bite.',
    development:
      'The ETS2 start is politically contested, with delay proposals and price-spike fears; the fund’s revenue base and its sequencing ahead of household carbon costs are both wobbling.',
    status: 'drifting',
    confidence: 0.7,
  },
  'methane-regulation': {
    policyId: 'methane-regulation',
    designYear: 2024,
    assumption:
      'Domestic MRV and LDAR duties first, then import standards by 2030, with exporter compliance commercially rational.',
    development:
      'Implementation proceeds on schedule; the open question is exporter-side compliance (notably US LNG after the 2025 deregulatory turn), which the import-standard design assumed would follow the market.',
    status: 'holds',
    confidence: 0.6,
  },
  'nature-restoration-law': {
    policyId: 'nature-restoration-law',
    designYear: 2024,
    assumption:
      'A durable consensus to restore 20% of EU land and sea by 2030, carried into national restoration plans by mid-2026.',
    development:
      'Adopted by the narrowest of margins after near-collapse; restoration financing is unresolved and several Member States signal minimalist plans — the consensus the timetable assumed is thin.',
    status: 'drifting',
    confidence: 0.75,
  },
  csrd: {
    policyId: 'csrd',
    designYear: 2022,
    assumption:
      'Economy-wide, audited sustainability data arriving in successive waves from FY2024 would become the data backbone for SFDR, the Taxonomy and supervisory practice.',
    development:
      'The 2025 Omnibus removed roughly 80% of originally covered firms (raising thresholds to 1,000+ employees) and delayed later waves by two years — the designed data backbone was cut down mid-construction.',
    status: 'broken',
    confidence: 0.8,
  },
  'fueleu-maritime': {
    policyId: 'fueleu-maritime',
    designYear: 2023,
    assumption:
      'A GHG-intensity standard tightening from 2025 would pull fuel switching, with biofuels and LNG as bridge compliance and e-fuels rewarded later.',
    development:
      'Early compliance is happening via the expected bridge fuels; the e-fuel premium persists, and the IMO net-zero framework now adds a parallel global layer the act anticipated only loosely.',
    status: 'holds',
    confidence: 0.65,
  },
  'refueleu-aviation': {
    policyId: 'refueleu-aviation',
    designYear: 2023,
    assumption:
      'SAF supply would scale to the 6% blend by 2030 including the 1.2% synthetic-fuel sub-mandate.',
    development:
      'The 2% step is being met, but e-SAF projects face FID delays and cancellations; supply for the 2030 synthetic sub-target is genuinely uncertain.',
    status: 'drifting',
    confidence: 0.7,
  },
  'governance-regulation': {
    policyId: 'governance-regulation',
    designYear: 2018,
    assumption:
      'The NECP plan–assess–recommend cycle would discipline national planning enough to close ambition and implementation gaps without hard enforcement.',
    development:
      'Most updated NECPs arrived late; Commission gap assessments keep finding ambition and implementation shortfalls, and the soft-governance design has no further escalation step to deploy.',
    status: 'drifting',
    confidence: 0.75,
  },
  'net-zero-industry-act': {
    policyId: 'net-zero-industry-act',
    designYear: 2024,
    assumption:
      'EU demand-pull (auctions with resilience criteria, permitting speed-ups) could carry domestic cleantech manufacturing toward the 40% benchmark.',
    development:
      'Chinese overcapacity pricing, the US subsidy pull and exits among European solar makers keep several segments far from the benchmark; demand-pull alone is proving too weak a lever.',
    status: 'drifting',
    confidence: 0.7,
  },
  'critical-raw-materials-act': {
    policyId: 'critical-raw-materials-act',
    designYear: 2024,
    assumption:
      'A pipeline of strategic projects could be permitted on the accelerated 27/15-month tracks toward the 2030 extraction, processing and recycling benchmarks.',
    development:
      'Strategic-project designations have proceeded since 2025 broadly on schedule; the extraction benchmark remains the hardest, but the permitting design assumption is so far performing.',
    status: 'holds',
    confidence: 0.6,
  },
  'repowereu-plan': {
    policyId: 'repowereu-plan',
    designYear: 2022,
    assumption:
      'Emergency demand reduction, supplier diversification and an accelerated renewables push could end dependence on Russian fossil gas without rationing.',
    development:
      'The design scenario materialised: Russian pipeline share collapsed from ~40% to under 10%, storage targets were met, and renewables plus LNG filled the gap — at a price cost the plan accepted.',
    status: 'holds',
    confidence: 0.85,
  },
  'eu-green-deal': {
    policyId: 'eu-green-deal',
    designYear: 2019,
    assumption:
      'Climate would remain the organising frame of EU policy across political cycles, letting the growth strategy unfold as one coherent programme.',
    development:
      'The 2024–29 cycle reframed around competitiveness, security and simplification; the Clean Industrial Deal recasts the agenda and Omnibus packages trim several Green Deal instruments.',
    status: 'drifting',
    confidence: 0.8,
  },
  'taxonomy-regulation': {
    policyId: 'taxonomy-regulation',
    designYear: 2020,
    assumption:
      'A single science-based classification would become the market’s common language for sustainable investment, with alignment reporting universal across large firms.',
    development:
      'Usability complaints led the 2025 Omnibus to make significant parts of taxonomy reporting voluntary and cut datapoints; litigation over the gas/nuclear criteria continues to contest the “science-based” core.',
    status: 'drifting',
    confidence: 0.75,
  },
  'farm-to-fork-strategy': {
    policyId: 'farm-to-fork-strategy',
    designYear: 2020,
    assumption:
      'The 2030 pesticide, organic and nutrient targets would be carried into law by a legislative wave — the SUR pesticide regulation and a sustainable food systems framework.',
    development:
      'The SUR was withdrawn in 2024 after farmer protests and the framework law was never tabled; the strategy’s targets are now orphaned aims with no delivery vehicle.',
    status: 'broken',
    confidence: 0.85,
  },
  'cap-strategic-plans': {
    policyId: 'cap-strategic-plans',
    designYear: 2021,
    assumption:
      'The green architecture — GAEC conditionality plus eco-schemes — would hold through the 2023–27 cycle and lift the environmental baseline of farm payments.',
    development:
      'The 2024 protests triggered rapid weakening of GAEC conditionality and new exemptions; the environmental baseline was lowered mid-period, inverting the design’s ratchet direction.',
    status: 'drifting',
    confidence: 0.75,
  },
  'fit-for-55': {
    policyId: 'fit-for-55',
    designYear: 2021,
    assumption:
      'The package would be adopted as an interlocking whole — pricing, targets, standards and funds calibrated together to deliver −55%.',
    development:
      'Essentially all elements were adopted by 2023–24, an unusual legislative success; the interlock exists in law, and delivery risk has migrated into the individual acts and national implementation.',
    status: 'holds',
    confidence: 0.85,
  },
};

// ── Step 2 · Coherence across policy goals ─────────────────────────────────

export type InteractionKind = 'synergy' | 'tension' | 'conflict';

export interface GoalInteraction {
  id: string;
  /** The two policies whose goals interact (order is presentational only). */
  a: string;
  b: string;
  kind: InteractionKind;
  /** The goal at stake on each side, stated as the act states it. */
  goalA: string;
  goalB: string;
  rationale: string;
  confidence: number;
}

export const GOAL_INTERACTIONS: GoalInteraction[] = [
  {
    id: 'coh-int-red-lulucf',
    a: 'renewable-energy-directive',
    b: 'lulucf-regulation',
    kind: 'conflict',
    goalA: '42.5% renewables by 2030, with forest biomass counted as renewable',
    goalB: '310 Mt CO₂eq net removals by 2030',
    rationale:
      'Energy-wood demand that RED rewards as zero-carbon renewable is harvested out of the very sink LULUCF needs left standing; every additional unit of primary woody biomass burned debits the 310 Mt target directly.',
    confidence: 0.85,
  },
  {
    id: 'coh-int-esr-lulucf',
    a: 'effort-sharing-regulation',
    b: 'lulucf-regulation',
    kind: 'tension',
    goalA: '−40% in non-ETS sectors by 2030',
    goalB: 'No-debit rule and rising net removals',
    rationale:
      'Up to 280 Mt of LULUCF credits may substitute for real non-ETS cuts (ESR Art. 7) while LULUCF shortfalls are added back onto ESR totals — a two-way flexibility that softens both targets exactly when the sink is shrinking.',
    confidence: 0.8,
  },
  {
    id: 'coh-int-ets-cbam',
    a: 'eu-ets-directive',
    b: 'cbam-regulation',
    kind: 'synergy',
    goalA: 'Cost-effective reductions via a declining cap with full carbon pricing',
    goalB: 'Prevent carbon leakage on embedded imports',
    rationale:
      'CBAM is what lets the ETS phase out free allocation without exporting its industrial base — restoring the full marginal price signal the cap-and-trade design always intended.',
    confidence: 0.9,
  },
  {
    id: 'coh-int-ets-esr',
    a: 'eu-ets-directive',
    b: 'effort-sharing-regulation',
    kind: 'synergy',
    goalA: '−62% in ETS sectors by 2030 (vs 2005)',
    goalB: '−40% in non-ETS sectors by 2030 (vs 2005)',
    rationale:
      'Complementary coverage splits the economy into two calibrated halves of the −55% objective, with ETS2 designed to bridge the buildings/road-transport seam between them from 2027.',
    confidence: 0.85,
  },
  {
    id: 'coh-int-cars-afir',
    a: 'co2-cars-regulation',
    b: 'afir-regulation',
    kind: 'synergy',
    goalA: '100% zero-emission new cars by 2035',
    goalB: 'Fleet-paced public charging and refuelling coverage',
    rationale:
      'A textbook demand-pull / infrastructure-push pair: the ZEV mandate creates the fleet AFIR’s fleet-based targets are indexed to, so the two ratchet together by construction.',
    confidence: 0.9,
  },
  {
    id: 'coh-int-cars-euro7',
    a: 'co2-cars-regulation',
    b: 'euro-7-regulation',
    kind: 'tension',
    goalA: 'Steer automotive capital into electrification toward 2035',
    goalB: 'Tighter pollutant limits for combustion vehicles in the interim',
    rationale:
      'Euro 7 obliges continued engineering investment in ICE platforms that the CO₂ standards are simultaneously steering capital away from — a sequencing tension industry exploited in both negotiations.',
    confidence: 0.7,
  },
  {
    id: 'coh-int-cars-aaq',
    a: 'co2-cars-regulation',
    b: 'air-quality-directive',
    kind: 'synergy',
    goalA: 'Fleet electrification via CO₂ standards',
    goalB: 'WHO-aligned air-quality limit values by 2030',
    rationale:
      'Fleet electrification is among the largest single levers for urban NO₂ compliance — the climate standard delivers the health directive’s hardest pollutant largely for free.',
    confidence: 0.85,
  },
  {
    id: 'coh-int-scf-epbd',
    a: 'social-climate-fund',
    b: 'epbd-recast',
    kind: 'synergy',
    goalA: 'Cushion vulnerable households against carbon costs',
    goalB: 'Renovate the worst-performing building stock first',
    rationale:
      'The SCF targets precisely the households the EPBD’s worst-stock obligations would otherwise hit hardest — distributional cushion and renovation obligation are designed as two sides of one move.',
    confidence: 0.8,
  },
  {
    id: 'coh-int-cap-methane',
    a: 'cap-strategic-plans',
    b: 'methane-regulation',
    kind: 'tension',
    goalA: 'Stabilise farm incomes, including livestock',
    goalB: 'Cut methane emissions across the energy chain',
    rationale:
      'The Methane Regulation exempts agriculture — the largest EU methane source — while CAP income support stabilises herd sizes; between them, the goal of cutting EU methane is left structurally unserved on its biggest front.',
    confidence: 0.8,
  },
  {
    id: 'coh-int-cap-nrl',
    a: 'cap-strategic-plans',
    b: 'nature-restoration-law',
    kind: 'conflict',
    goalA: 'Payments tied to productive agricultural area',
    goalB: 'Restore drained peatlands and agricultural ecosystems by 2030–50',
    rationale:
      'NRL restoration targets on agricultural land (rewetting, landscape features) sit directly against CAP’s productive-area payment logic — and the 2024 weakening of GAEC conditionality moved the two further apart.',
    confidence: 0.8,
  },
  {
    id: 'coh-int-f2f-cap',
    a: 'farm-to-fork-strategy',
    b: 'cap-strategic-plans',
    kind: 'tension',
    goalA: '−50% pesticides, 25% organic farming by 2030',
    goalB: 'National CAP plans set before the targets had legal force',
    rationale:
      'The strategy’s 2030 goals depended on CAP strategic plans as the delivery vehicle, but eco-scheme ambition was fixed before any target became binding — and the SUR’s withdrawal removed the legal bridge entirely.',
    confidence: 0.8,
  },
  {
    id: 'coh-int-nrl-red',
    a: 'nature-restoration-law',
    b: 'renewable-energy-directive',
    kind: 'tension',
    goalA: 'Restore 20% of land and sea by 2030',
    goalB: 'Acceleration areas with presumed overriding public interest for renewables',
    rationale:
      'Restoration and renewables build-out compete for the same land and sea; RED’s overriding-public-interest presumption tilts permitting against the restoration goal, with carve-outs only partly reconciling the two.',
    confidence: 0.75,
  },
  {
    id: 'coh-int-crma-habitats',
    a: 'critical-raw-materials-act',
    b: 'habitats-directive',
    kind: 'tension',
    goalA: '27-month permitting for strategic extraction projects',
    goalB: 'Favourable conservation status and strict Natura 2000 assessment',
    rationale:
      'Accelerated mine permitting presses against appropriate-assessment timelines and Art. 6(4) derogation discipline; the CRMA asserts compatibility but the clock it imposes is the Habitats Directive’s scarcest resource.',
    confidence: 0.75,
  },
  {
    id: 'coh-int-nzia-crma',
    a: 'net-zero-industry-act',
    b: 'critical-raw-materials-act',
    kind: 'synergy',
    goalA: '40% domestic cleantech manufacturing by 2030',
    goalB: 'Extraction / processing / recycling benchmarks for strategic raw materials',
    rationale:
      'Consecutive links of one supply chain: NZIA’s manufacturing benchmark is unreachable without CRMA’s upstream material benchmarks, and CRMA demand is anchored by NZIA factories.',
    confidence: 0.85,
  },
  {
    id: 'coh-int-nzia-cbam',
    a: 'net-zero-industry-act',
    b: 'cbam-regulation',
    kind: 'synergy',
    goalA: 'Rebuild energy-intensive cleantech manufacturing in the EU',
    goalB: 'Price embedded carbon at the border',
    rationale:
      'CBAM protects exactly the energy-intensive upstream (steel, aluminium, hydrogen) whose fair carbon pricing the NZIA build-out depends on — leakage protection and reindustrialisation point the same way.',
    confidence: 0.75,
  },
  {
    id: 'coh-int-refuel-fueleu',
    a: 'refueleu-aviation',
    b: 'fueleu-maritime',
    kind: 'tension',
    goalA: 'SAF blending mandate incl. synthetic sub-target',
    goalB: 'Falling GHG-intensity of marine fuels with RFNBO incentives',
    rationale:
      'Both mandates draw on the same constrained pool of sustainable feedstocks and renewable hydrogen; at the margin, aviation’s e-SAF sub-target and shipping’s RFNBO multiplier bid against each other for identical molecules.',
    confidence: 0.75,
  },
  {
    id: 'coh-int-h2pkg-red',
    a: 'hydrogen-gas-package',
    b: 'renewable-energy-directive',
    kind: 'synergy',
    goalA: 'Market rules and infrastructure for a hydrogen economy',
    goalB: 'Binding RFNBO targets in industry and transport',
    rationale:
      'RED’s RFNBO targets create the demand the hydrogen market rules need to de-risk; the residual friction — low-carbon versus renewable hydrogen definitions — is real but second-order to the demand synergy.',
    confidence: 0.7,
  },
  {
    id: 'coh-int-eed-epbd',
    a: 'energy-efficiency-directive',
    b: 'epbd-recast',
    kind: 'synergy',
    goalA: 'Cap final consumption at 763 Mtoe by 2030',
    goalB: 'Zero-emission building stock by 2050, worst stock first',
    rationale:
      'Building renovation is the single largest lever for the EED consumption cap, and EED public-sector renovation duties (Arts. 5–6) operationalise the EPBD’s stock goals — the two acts share one delivery channel.',
    confidence: 0.85,
  },
  {
    id: 'coh-int-csrd-sfdr',
    a: 'csrd',
    b: 'sfdr',
    kind: 'tension',
    goalA: 'Audited sustainability data from the real economy',
    goalB: 'Comparable adverse-impact disclosure by financial market participants',
    rationale:
      'Designed as a synergy — SFDR’s PAI indicators were to be fed by CSRD data — the chain now runs as a tension: the Omnibus scope cut removed most of the reporting universe, leaving SFDR disclosures resting on estimates again.',
    confidence: 0.8,
  },
  {
    id: 'coh-int-csrd-taxonomy',
    a: 'csrd',
    b: 'taxonomy-regulation',
    kind: 'synergy',
    goalA: 'Sustainability reporting under ESRS',
    goalB: 'Taxonomy-alignment KPIs (turnover / CapEx / OpEx)',
    rationale:
      'Taxonomy Art. 8 KPIs ride on CSRD reporting infrastructure — one audit trail serves both acts. The synergy survives the Omnibus but over a much smaller firm universe than designed.',
    confidence: 0.75,
  },
  {
    id: 'coh-int-claims-csrd',
    a: 'green-claims-directive',
    b: 'csrd',
    kind: 'synergy',
    goalA: 'Substantiated, verified environmental claims to consumers',
    goalB: 'Audited corporate sustainability disclosure to markets',
    rationale:
      'The two close the greenwashing loop from opposite ends — claim substantiation at the shelf, audited reporting at the filing — with shared evidence standards making each cheaper to enforce.',
    confidence: 0.7,
  },
  {
    id: 'coh-int-emr-red',
    a: 'electricity-market-regulation',
    b: 'renewable-energy-directive',
    kind: 'synergy',
    goalA: 'Two-sided CfDs and PPA facilitation in market design',
    goalB: '42.5% renewables by 2030',
    rationale:
      'The reformed market design de-risks exactly the capital-intensive build-out RED mandates: CfD revenue stabilisation and PPA access are the financing rails under the renewables target.',
    confidence: 0.8,
  },
  {
    id: 'coh-int-aiact-eed',
    a: 'ai-act',
    b: 'energy-efficiency-directive',
    kind: 'tension',
    goalA: 'Trustworthy-AI rules silent on compute energy demand',
    goalB: 'Cap final energy consumption at 763 Mtoe',
    rationale:
      'Nothing in the AI Act constrains the energy footprint of the compute build-out it legitimises; data-centre load growth presses against the EED cap, which can only observe it through reporting (EED Art. 12).',
    confidence: 0.7,
  },
  {
    id: 'coh-int-fgas-epbd',
    a: 'f-gas-regulation',
    b: 'epbd-recast',
    kind: 'tension',
    goalA: 'Accelerated HFC phase-down',
    goalB: 'Mass heat-pump deployment for building decarbonisation',
    rationale:
      'The HFC phase-down restricts the refrigerants most current heat pumps use just as the EPBD pathway requires their mass rollout — coherence depends on the natural-refrigerant transition outrunning the phase-down schedule.',
    confidence: 0.75,
  },
  {
    id: 'coh-int-eugb-taxonomy',
    a: 'green-bonds-regulation',
    b: 'taxonomy-regulation',
    kind: 'synergy',
    goalA: 'A gold-standard EU green bond label',
    goalB: 'Stable, science-based activity criteria',
    rationale:
      'The EuGB label is defined as taxonomy-aligned use of proceeds — its usability rises and falls with the stability and credibility of the taxonomy criteria it imports wholesale.',
    confidence: 0.75,
  },
];

// ── Step 3 · Goals vs means of implementation (derived) ────────────────────

/** Means-side criteria of the objective–delivery checklist (PR: objective–
 *  delivery matrix). These five answer "are the means commensurate with the
 *  goal?" and are reused verbatim — never re-assessed here. */
export const MEANS_CRITERIA = [
  'check-instruments',
  'check-coverage',
  'check-enforcement',
  'check-financing',
  'check-timeline',
] as const;

/** Evaluation-machinery criteria of the checklist, reused for step 4. */
export const EVALUATION_CRITERIA = ['check-monitoring', 'check-review'] as const;

const VERDICT_VALUE: Record<ChecklistVerdict, number | null> = {
  met: 1,
  partial: 0.5,
  'not-met': 0,
  'not-applicable': null,
};

export interface DerivedStepResult {
  /** Mean of applicable criterion values in [0,1]; null when none apply. */
  score: number | null;
  /** The reused checklist entries, for provenance display. */
  entries: PolicyChecklistEntry[];
  grade: CoherenceGrade;
}

function gradeFromScore(score: number | null): CoherenceGrade {
  if (score === null) return 'not-assessed';
  if (score >= 0.75) return 'coherent';
  if (score >= 0.45) return 'partial';
  return 'incoherent';
}

function deriveFromChecklist(
  policyId: string,
  criteria: readonly string[],
): DerivedStepResult {
  const wanted = new Set(criteria);
  const entries = getPolicyChecklist(policyId).filter(e => wanted.has(e.codeId));
  let sum = 0;
  let n = 0;
  for (const e of entries) {
    const v = VERDICT_VALUE[e.verdict];
    if (v !== null) {
      sum += v;
      n += 1;
    }
  }
  const score = n > 0 ? sum / n : null;
  return { score, entries, grade: gradeFromScore(score) };
}

/** Step 3 for one policy: means-coherence derived from the checklist. */
export function meansCoherence(policyId: string): DerivedStepResult {
  return deriveFromChecklist(policyId, MEANS_CRITERIA);
}

// ── Step 4 · Policy evaluation: change + outcomes ──────────────────────────

export type OutcomeReading = 'delivering' | 'mixed' | 'off-track';

export interface OutcomeEvidence {
  policyId: string;
  /** The headline indicator the evaluation hangs on. */
  indicator: string;
  /** Output side — what changed in the policy itself (strengthened, weakened, implemented). */
  policyChange: string;
  /** Impact side — what the measurements show in the world. */
  measuredOutcome: string;
  reading: OutcomeReading;
  /** Data vintage, e.g. '2026-06'. */
  asOf: string;
}

export const OUTCOME_EVIDENCE: Record<string, OutcomeEvidence> = {
  'eu-climate-law': {
    policyId: 'eu-climate-law',
    indicator: 'EU net GHG emissions vs 1990',
    policyChange:
      'The Fit-for-55 acts the law required were essentially all adopted; the mandated 2040-target proposal slipped past its deadline and remains in negotiation.',
    measuredOutcome:
      'Net emissions are down roughly 37% on 1990; Commission projections reach ~−54% by 2030 only with full implementation of adopted measures — a small but closable gap to −55%.',
    reading: 'mixed',
    asOf: '2026-06',
  },
  'eu-ets-directive': {
    policyId: 'eu-ets-directive',
    indicator: 'Verified emissions of stationary ETS installations vs 2005',
    policyChange:
      'The 2023 revision tightened the LRF to 4.3/4.4%, added maritime and locked the free-allocation phase-out to CBAM.',
    measuredOutcome:
      'Stationary verified emissions are down roughly half since 2005, with a record fall in 2023 — ahead of the cap trajectory, though partly on crisis-driven output decline.',
    reading: 'delivering',
    asOf: '2026-06',
  },
  'effort-sharing-regulation': {
    policyId: 'effort-sharing-regulation',
    indicator: 'Aggregate ESR emissions vs annual allocations',
    policyChange: 'Ratcheted from −30% to −40% in 2023; compliance machinery unchanged.',
    measuredOutcome:
      'Reported ESR emissions keep falling but more slowly than the allocation path; projections show an aggregate gap and several Member States heading for deficit positions.',
    reading: 'mixed',
    asOf: '2026-06',
  },
  'lulucf-regulation': {
    policyId: 'lulucf-regulation',
    indicator: 'EU net LULUCF sink (Mt CO₂eq)',
    policyChange: '2023 amendment set the 310 Mt 2030 target with per-MS contributions.',
    measuredOutcome:
      'The net sink has shrunk from ~−310 Mt (2013–2016 average) to roughly −200 Mt and inventories carry large revisions — the measured trend points away from the target.',
    reading: 'off-track',
    asOf: '2026-06',
  },
  'renewable-energy-directive': {
    policyId: 'renewable-energy-directive',
    indicator: 'Renewables share of gross final energy consumption',
    policyChange: 'RED III raised the binding target to 42.5% and added permitting acceleration.',
    measuredOutcome:
      'The share reached ~24.5% in 2023 with record solar additions, but aggregated national trajectories land short of 42.5% — pace is historic yet still below the required slope.',
    reading: 'mixed',
    asOf: '2026-06',
  },
  'energy-efficiency-directive': {
    policyId: 'energy-efficiency-directive',
    indicator: 'EU final energy consumption vs the 763 Mtoe 2030 cap',
    policyChange: 'The 2023 recast made the −11.7% target binding and stepped up savings obligations.',
    measuredOutcome:
      'Consumption fell sharply in 2022–23, flattering the trajectory; how much survives demand normalisation and data-centre growth is the open evaluation question.',
    reading: 'mixed',
    asOf: '2026-06',
  },
  'co2-cars-regulation': {
    policyId: 'co2-cars-regulation',
    indicator: 'New-car fleet CO₂ and battery-electric sales share',
    policyChange:
      'The 2025 compliance point was softened into 2025–27 averaging and the 2035 review pulled forward — the act was weakened, not strengthened, at first contact with the market.',
    measuredOutcome:
      'Fleet CO₂ keeps falling and BEV share sits in the mid-teens, but the 2024 stall shows uptake is not yet self-sustaining at the pace the 2030/2035 steps assume.',
    reading: 'mixed',
    asOf: '2026-06',
  },
  'cbam-regulation': {
    policyId: 'cbam-regulation',
    indicator: 'Transitional-report coverage and data quality',
    policyChange:
      'The 2025 simplification cut the declarant base via the 50 t de-minimis while keeping ~99% of embedded emissions in scope; definitive regime starts 2026.',
    measuredOutcome:
      'Transitional reporting works but default values dominate and data quality is patchy — the mechanism is measurable on paper, unproven as a leakage shield.',
    reading: 'mixed',
    asOf: '2026-06',
  },
  'repowereu-plan': {
    policyId: 'repowereu-plan',
    indicator: 'Russian share of EU gas imports; storage-filling targets',
    policyChange: 'Emergency regulations (storage, demand reduction, permitting) were adopted and largely sunset as designed.',
    measuredOutcome:
      'Russian pipeline share collapsed from ~40% to under 10%, storage targets were met every season, and demand reduction targets were broadly achieved — the plan’s headline outcome materialised.',
    reading: 'delivering',
    asOf: '2026-06',
  },
  'farm-to-fork-strategy': {
    policyId: 'farm-to-fork-strategy',
    indicator: 'Pesticide-risk indicator (HRI 1), organic-farming share',
    policyChange:
      'The SUR was withdrawn and the framework law never tabled — measured policy change is negative: the strategy lost its instruments.',
    measuredOutcome:
      'Organic area sits near 11% against the 25% aim and pesticide-risk reduction rides on a criticised indicator — the 2030 targets are not on any measured path.',
    reading: 'off-track',
    asOf: '2026-06',
  },
  'afir-regulation': {
    policyId: 'afir-regulation',
    indicator: 'Public recharging points and TEN-T coverage',
    policyChange: 'First fleet-based target checkpoints applied from 2025; no weakening to date.',
    measuredOutcome:
      'Public charging keeps roughly tracking the fleet-based formula and TEN-T light-duty coverage advances; heavy-duty and hydrogen coverage lag the dated targets.',
    reading: 'delivering',
    asOf: '2026-06',
  },
  'epbd-recast': {
    policyId: 'epbd-recast',
    indicator: 'Deep-renovation rate; national building renovation plans',
    policyChange: 'Transposition under way; national renovation plans due 2026 will fix trajectories.',
    measuredOutcome:
      'Deep-renovation rates remain near 1% against the ~2% the pathway needs — the measured baseline starts the act in deficit.',
    reading: 'off-track',
    asOf: '2026-06',
  },
  'governance-regulation': {
    policyId: 'governance-regulation',
    indicator: 'NECP timeliness and assessed ambition gap',
    policyChange: 'The plan–assess–recommend cycle ran a full round on the updated NECPs.',
    measuredOutcome:
      'Most updates were late and the Commission’s aggregate assessment keeps finding ambition and implementation gaps — the cycle measures well and corrects weakly.',
    reading: 'mixed',
    asOf: '2026-06',
  },
  'net-zero-industry-act': {
    policyId: 'net-zero-industry-act',
    indicator: 'EU manufacturing share of strategic net-zero technologies',
    policyChange: 'Auction resilience criteria and permitting deadlines in force since 2024.',
    measuredOutcome:
      'Domestic shares in solar PV remain in single digits and several segments saw exits rather than build-out — measured movement toward the 40% benchmark is so far minimal.',
    reading: 'off-track',
    asOf: '2026-06',
  },
};

/** Step 4 for one policy: machinery (derived) + outcome evidence (curated). */
export interface EvaluationResult {
  machinery: DerivedStepResult;
  outcome: OutcomeEvidence | null;
  grade: CoherenceGrade;
}

const READING_GRADE: Record<OutcomeReading, CoherenceGrade> = {
  delivering: 'coherent',
  mixed: 'partial',
  'off-track': 'incoherent',
};

export function evaluationCoherence(policyId: string): EvaluationResult {
  const machinery = deriveFromChecklist(policyId, EVALUATION_CRITERIA);
  const outcome = OUTCOME_EVIDENCE[policyId] ?? null;
  // Measured outcomes trump machinery: an act with perfect MRV that is
  // measurably off-track is evaluatively incoherent, and vice versa an act
  // whose outcomes deliver is coherent even with thin review clauses.
  const grade: CoherenceGrade = outcome ? READING_GRADE[outcome.reading] : machinery.grade;
  return { machinery, outcome, grade };
}

// ── Per-policy roll-up + corpus overview ───────────────────────────────────

const STATUS_GRADE: Record<AssumptionStatus, CoherenceGrade> = {
  holds: 'coherent',
  drifting: 'partial',
  broken: 'incoherent',
};

export interface PolicyCoherenceProfile {
  policyId: string;
  exAnte: ExAnteAssessment | null;
  interactions: GoalInteraction[];
  means: DerivedStepResult;
  evaluation: EvaluationResult;
  stepGrades: Record<CoherenceStepId, CoherenceGrade>;
  /** Worst assessed step — coherence is a weakest-link property. */
  overall: CoherenceGrade;
  /** Number of steps with an assessment (0–4). */
  assessedSteps: number;
}

const GRADE_RANK: Record<CoherenceGrade, number> = {
  incoherent: 0,
  partial: 1,
  coherent: 2,
  'not-assessed': 3,
};

function horizontalGrade(interactions: GoalInteraction[]): CoherenceGrade {
  if (interactions.length === 0) return 'not-assessed';
  if (interactions.some(i => i.kind === 'conflict')) return 'incoherent';
  if (interactions.some(i => i.kind === 'tension')) return 'partial';
  return 'coherent';
}

/** All curated interactions touching one policy. */
export function interactionsFor(policyId: string): GoalInteraction[] {
  return GOAL_INTERACTIONS.filter(i => i.a === policyId || i.b === policyId);
}

export function buildCoherenceProfile(policyId: string): PolicyCoherenceProfile {
  const exAnte = EX_ANTE_ASSESSMENTS[policyId] ?? null;
  const interactions = interactionsFor(policyId);
  const means = meansCoherence(policyId);
  const evaluation = evaluationCoherence(policyId);

  const stepGrades: Record<CoherenceStepId, CoherenceGrade> = {
    'ex-ante': exAnte ? STATUS_GRADE[exAnte.status] : 'not-assessed',
    horizontal: horizontalGrade(interactions),
    'goals-means': means.grade,
    evaluation: evaluation.grade,
  };

  const assessed = (Object.values(stepGrades) as CoherenceGrade[]).filter(
    g => g !== 'not-assessed',
  );
  const overall: CoherenceGrade =
    assessed.length === 0
      ? 'not-assessed'
      : assessed.reduce((worst, g) => (GRADE_RANK[g] < GRADE_RANK[worst] ? g : worst));

  return {
    policyId,
    exAnte,
    interactions,
    means,
    evaluation,
    stepGrades,
    overall,
    assessedSteps: assessed.length,
  };
}

/** Policy ids with at least one coherence signal (any step assessed). */
export function coherenceAssessedIds(): string[] {
  const ids = new Set<string>([
    ...Object.keys(EX_ANTE_ASSESSMENTS),
    ...Object.keys(OUTCOME_EVIDENCE),
    ...GOAL_INTERACTIONS.flatMap(i => [i.a, i.b]),
  ]);
  // Steps 3–4 derive from the checklist, so every checklisted policy has at
  // least a means + machinery assessment.
  for (const id of Object.keys(POLICY_OBJECTIVE_CHECKLISTS)) ids.add(id);
  return Array.from(ids);
}

export interface CoherenceOverview {
  profiles: PolicyCoherenceProfile[];
  /** Per-step grade tallies across the scope. */
  stepCounts: Record<CoherenceStepId, Record<CoherenceGrade, number>>;
  /** Interactions whose BOTH endpoints are in scope. */
  interactions: GoalInteraction[];
  conflicts: number;
  tensions: number;
  synergies: number;
  brokenAssumptions: number;
  /** Mean means-coherence score across scope (step 3); null if none. */
  meanMeansScore: number | null;
}

export function buildCoherenceOverview(scopeIds?: string[]): CoherenceOverview {
  const ids = scopeIds ?? coherenceAssessedIds();
  const inScope = new Set(ids);
  const profiles = ids
    .map(buildCoherenceProfile)
    .filter(p => p.assessedSteps > 0)
    .sort((a, b) => GRADE_RANK[a.overall] - GRADE_RANK[b.overall]);

  const stepCounts = Object.fromEntries(
    COHERENCE_STEPS.map(s => [
      s.id,
      { coherent: 0, partial: 0, incoherent: 0, 'not-assessed': 0 },
    ]),
  ) as Record<CoherenceStepId, Record<CoherenceGrade, number>>;
  for (const p of profiles) {
    for (const s of COHERENCE_STEPS) stepCounts[s.id][p.stepGrades[s.id]] += 1;
  }

  const interactions = GOAL_INTERACTIONS.filter(i => inScope.has(i.a) && inScope.has(i.b));
  const conflicts = interactions.filter(i => i.kind === 'conflict').length;
  const tensions = interactions.filter(i => i.kind === 'tension').length;
  const synergies = interactions.filter(i => i.kind === 'synergy').length;
  const brokenAssumptions = profiles.filter(p => p.exAnte?.status === 'broken').length;

  const meansScores = profiles.map(p => p.means.score).filter((s): s is number => s !== null);
  const meanMeansScore =
    meansScores.length > 0
      ? meansScores.reduce((a, b) => a + b, 0) / meansScores.length
      : null;

  return {
    profiles,
    stepCounts,
    interactions,
    conflicts,
    tensions,
    synergies,
    brokenAssumptions,
    meanMeansScore,
  };
}
