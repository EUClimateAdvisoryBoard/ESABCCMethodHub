// ---------------------------------------------------------------------------
// Policy coherence assessment — beta four-step model.
//
// A SYSTEM-level lens over the tracked policy corpus, complementing the
// per-act objective–delivery checklist (policy-objective-checklist.ts):
// where the checklist asks "can this act deliver its own objective?", this
// model asks "does the policy SPACE cohere — with the world, with itself,
// with its means, and with what we can measure?".
//
// Methodological design: every grade follows MECHANICALLY from a declared
// rule applied to citable evidence. The analyst's judgment lives in the
// ex-ante rule declarations (criteria, scales, thresholds — all printed in
// this file and in the UI), never in per-entry vibes. The four steps each
// borrow an established framework:
//
//   1. Ex ante design vs world development — Assumption-Based Planning
//      (Dewar et al., RAND 1993): each load-bearing assumption is stated as
//      a falsifiable proposition with a named SIGNPOST indicator and an
//      explicit VIOLATION CRITERION; status (valid / under pressure /
//      violated) is the criterion applied to a sourced observation.
//   2. Coherence across policy goals — the seven-point goal-interaction
//      scale of Nilsson, Griggs & Visbeck (2016, Nature 534:320) with the
//      ICSU (2017) decision rules: −3 cancelling … +3 indivisible. Each
//      score names the interaction mechanism and cites the legal provisions
//      that create it.
//   3. Goals vs means of implementation — goals/means congruence in the
//      policy-mix sense (Howlett & Rayner 2007), DERIVED from the
//      objective–delivery checklist's five means-side criteria
//      (instruments, coverage, enforcement, financing, timeline). Nothing
//      is re-assessed; the two lenses cannot diverge.
//   4. Policy evaluation — the distance-to-target method used in the EEA
//      Trends & Projections reports: required pace to target vs observed
//      recent pace, computed in code with declared thresholds. Evaluation
//      MACHINERY (MRV + review) is derived from the checklist; the
//      measurements are sourced data points, the reading is arithmetic.
//
// Evidence quality uses a GRADE-style tier instead of pseudo-confidences:
//   A — official statistics / registries / legal acts (Eurostat, EEA
//       inventory, ETS Union Registry, OJ).
//   B — official assessments (Commission, EEA, EMSA, EASA reports).
//   C — secondary sources (industry trackers, NGO monitors).
//
// Redundancy note (deliberate design decision): steps 3 and 4 reuse the
// (policyId, check-*) verdicts shipped in PR #302's checklist as their
// evidence base instead of duplicating them. Only what the checklist cannot
// express — assumption audits (1), cross-policy interactions (2) and
// outcome measurements (4) — is authored here. Observation snapshot:
// mid-2026; observations carry their sources so each can be re-verified.
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

/** GRADE-style evidence-quality tier (see header). */
export type EvidenceTier = 'A' | 'B' | 'C';

export const EVIDENCE_TIER_LABEL: Record<EvidenceTier, string> = {
  A: 'Official statistics / legal acts',
  B: 'Official assessments',
  C: 'Secondary sources',
};

export interface CoherenceStepMeta {
  id: CoherenceStepId;
  ordinal: 1 | 2 | 3 | 4;
  /** Master code id under `root-coherence` in seed.ts. */
  codeId: string;
  name: string;
  shortName: string;
  question: string;
  /** The published framework the step borrows. */
  framework: string;
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
    framework: 'Assumption-Based Planning (Dewar et al., RAND 1993)',
    basis: 'curated',
    method:
      'Each load-bearing assumption is stated as a falsifiable proposition with a signpost indicator and an explicit violation criterion. Status = the criterion applied to a sourced observation: valid / under pressure / violated.',
  },
  {
    id: 'horizontal',
    ordinal: 2,
    codeId: 'coh-horizontal',
    name: 'Coherence across policy goals',
    shortName: 'Across goals',
    question:
      'Across all policy goals of all policies in the space — do they reinforce or undercut each other?',
    framework: 'Seven-point goal-interaction scale (Nilsson et al. 2016; ICSU 2017)',
    basis: 'curated',
    method:
      'Pairwise goal interactions scored −3 (cancelling) to +3 (indivisible), each with a named mechanism and the legal provisions that create the interaction.',
  },
  {
    id: 'goals-means',
    ordinal: 3,
    codeId: 'coh-means',
    name: 'Between policy goals and means of implementation',
    shortName: 'Goals ↔ means',
    question:
      'Are the means of implementation — instruments, coverage, enforcement, financing, timeline — commensurate with the stated goals?',
    framework: 'Goals/means congruence in policy mixes (Howlett & Rayner 2007)',
    basis: 'derived from objective–delivery checklist',
    method:
      'Derived, not re-assessed: the five means-side criteria of the objective–delivery checklist are rolled into a means-coherence score per policy (met = 1, partial = ½, not-met = 0, over applicable criteria).',
  },
  {
    id: 'evaluation',
    ordinal: 4,
    codeId: 'coh-evaluation',
    name: 'Policy evaluation: measuring policy change and policy outcomes',
    shortName: 'Evaluation',
    question:
      'Can policy change and policy outcomes be measured — and what does the measured pace say against the target?',
    framework: 'Distance-to-target pace ratio (EEA Trends & Projections method)',
    basis: 'mixed',
    method:
      'Evaluation machinery (MRV + review) is derived from the checklist. Outcomes: observed recent pace ÷ required pace to target, computed in code. Thresholds: ≥ 1.0 on track · ≥ 0.5 lagging · < 0.5 (or wrong direction) off track.',
  },
];

export const COHERENCE_STEP_BY_ID: Record<CoherenceStepId, CoherenceStepMeta> =
  Object.fromEntries(COHERENCE_STEPS.map(s => [s.id, s])) as Record<
    CoherenceStepId,
    CoherenceStepMeta
  >;

// ── Step 1 · Ex ante design vs world development (Assumption-Based Planning)

export type AssumptionStatus = 'valid' | 'under-pressure' | 'violated';

export interface ExAnteAssessment {
  policyId: string;
  /** Year the ex-ante design assumptions were fixed (adoption / last recast). */
  designYear: number;
  /** The load-bearing assumption, stated as a falsifiable proposition. */
  assumption: string;
  /** The signpost indicator monitored to test the assumption (ABP term). */
  signpost: string;
  /** Explicit rule: what observation falsifies the assumption ("violated"),
   *  and — where useful — what counts as the intermediate band ("under
   *  pressure"). The status below must follow from applying THIS rule to
   *  the observation; reviewers audit the application, not a vibe. */
  violationCriterion: string;
  /** What the signpost currently shows, with figures where available. */
  observation: string;
  /** Citable source of the observation. */
  source: string;
  tier: EvidenceTier;
  /** = violationCriterion applied to observation. */
  status: AssumptionStatus;
}

export const EX_ANTE_ASSESSMENTS: Record<string, ExAnteAssessment> = {
  'eu-climate-law': {
    policyId: 'eu-climate-law',
    designYear: 2021,
    assumption:
      'The Art. 4(3) ratchet operates on schedule: a 2040 target is proposed by H1 2024 and adopted in time to anchor the post-2030 architecture.',
    signpost: 'Dates of the Commission 2040 proposal and of co-legislator adoption, vs the Art. 4(3) deadline.',
    violationCriterion:
      'Violated if no 2040 target is in force when the post-2030 sectoral proposals are tabled; under pressure if the H1 2024 proposal deadline is missed or adoption stalls.',
    observation:
      'The proposal slipped past the H1 2024 deadline and remains in negotiation (−90% with flexibilities under discussion); no adopted 2040 target; post-2030 sectoral files not yet tabled.',
    source: 'Commission work programmes 2024–26; legislative tracker.',
    tier: 'B',
    status: 'under-pressure',
  },
  'eu-ets-directive': {
    policyId: 'eu-ets-directive',
    designYear: 2023,
    assumption:
      'The tightened cap binds: verified emissions track at or below the cap trajectory and the MSR keeps the allowance surplus inside its band.',
    signpost: 'Verified stationary emissions vs the cap path; total number of allowances in circulation (TNAC) vs the MSR thresholds.',
    violationCriterion:
      'Violated if verified emissions exceed the cap path or TNAC sits outside the MSR band for two consecutive years; under pressure if abatement is shown to be dominated by output loss rather than investment.',
    observation:
      'Stationary verified emissions fell to ~47% below 2005 by 2023, below the cap path; TNAC remains within the MSR band; attribution analyses assign part of the 2022–23 fall to crisis output contraction but investment-driven power-sector abatement dominates.',
    source: 'EEA ETS data viewer; Commission carbon market reports.',
    tier: 'A',
    status: 'valid',
  },
  'effort-sharing-regulation': {
    policyId: 'effort-sharing-regulation',
    designYear: 2023,
    assumption:
      'National measures suffice to keep aggregate ESR emissions within the annual allocations (AEAs) down to −40% by 2030, with flexibilities as a thin buffer.',
    signpost: 'Reported ESR emissions vs AEAs; aggregate WEM/WAM projection gap; number of Member States projecting cumulative deficits.',
    violationCriterion:
      'Violated if aggregate projections show a 2030 gap with the flexibility pools exhausted; under pressure if multiple Member States project AEA deficits.',
    observation:
      'Commission assessments project an aggregate gap to −40%; several Member States (incl. DE, IE, IT) project cumulative deficits exceeding their realistic flexibility access.',
    source: 'Climate Action Progress Report; EEA Trends & Projections.',
    tier: 'B',
    status: 'under-pressure',
  },
  'lulucf-regulation': {
    policyId: 'lulucf-regulation',
    designYear: 2023,
    assumption:
      'The land sink stays near its 2013–2016 reference (~−310 Mt CO₂eq) so that targeted action can add the +42 Mt needed for the 2030 target.',
    signpost: 'Net LULUCF flux in the EU GHG inventory.',
    violationCriterion:
      'Violated if the inventory sink falls more than 50 Mt below the reference for three or more consecutive years.',
    observation:
      'The reported net sink declined to roughly −200 Mt in recent inventory years — ~110 Mt below the reference, persistent across multiple years.',
    source: 'EEA / UNFCCC EU GHG inventory.',
    tier: 'A',
    status: 'violated',
  },
  'renewable-energy-directive': {
    policyId: 'renewable-energy-directive',
    designYear: 2023,
    assumption:
      'Permitting acceleration plus technology cost declines yield additions consistent with a 42.5% renewables share by 2030.',
    signpost: 'RES share (Eurostat SHARES) vs the linear 22.1% → 42.5% path; aggregated NECP contributions.',
    violationCriterion:
      'Violated if the share trails the linear path by more than 3 pp; under pressure if it trails at all or aggregated NECPs land short of 42.5%.',
    observation:
      'Share 24.5% in 2023 vs ~26.2% on the linear path (≈ −1.7 pp); aggregated NECP contributions land roughly 2–3 pp short of 42.5%.',
    source: 'Eurostat SHARES; Commission NECP aggregate assessment.',
    tier: 'A',
    status: 'under-pressure',
  },
  'energy-efficiency-directive': {
    policyId: 'energy-efficiency-directive',
    designYear: 2023,
    assumption:
      'Reductions toward the 763 Mtoe cap are structural (efficiency-driven), not cyclical demand response.',
    signpost: 'Final energy consumption (Eurostat), decomposed for weather and output effects; data-centre electricity demand.',
    violationCriterion:
      'Violated if final consumption rebounds above the linear path to 763 Mtoe for two consecutive years; under pressure if observed cuts are attributed mainly to price-driven demand response.',
    observation:
      'Consumption fell sharply in 2022–23 with official analyses attributing a substantial share to price-driven demand response; electrification and data-centre load growth press upward as prices normalise.',
    source: 'Eurostat energy balances; EEA Trends & Projections.',
    tier: 'B',
    status: 'under-pressure',
  },
  'cbam-regulation': {
    policyId: 'cbam-regulation',
    designYear: 2023,
    assumption:
      'Embedded-emissions accounting is administrable across the full declarant base and the definitive regime starts on schedule in 2026.',
    signpost: 'Share of declarations using default values; legal changes to declarant scope; definitive-regime start date.',
    violationCriterion:
      'Violated if the definitive regime start slips or sectoral scope is cut; under pressure if the declarant base is materially redrawn or default values dominate reporting.',
    observation:
      'The 2025 simplification raised the de-minimis to 50 t, removing ~90% of declarants (while keeping ~99% of embedded emissions); default values dominate transitional reports; the 2026 start date stands.',
    source: 'Omnibus simplification package 2025; Commission CBAM transitional-period reports.',
    tier: 'B',
    status: 'under-pressure',
  },
  'co2-cars-regulation': {
    policyId: 'co2-cars-regulation',
    designYear: 2023,
    assumption:
      'BEV uptake follows a trajectory consistent with the 2030 (−55%) and 2035 (100% ZEV) steps without compliance relief.',
    signpost: 'BEV share of new registrations; amending acts touching compliance timing.',
    violationCriterion:
      'Violated if a compliance step is weakened in law; under pressure if the BEV share stalls below the trajectory the 2030 step implies.',
    observation:
      'BEV share stalled around the mid-teens in 2024; the 2025 step was converted into 2025–27 averaging by amending regulation and the 2035 review was advanced — compliance relief was enacted in law.',
    source: 'ACEA registration statistics; amending regulation (2025, OJ).',
    tier: 'A',
    status: 'violated',
  },
  'afir-regulation': {
    policyId: 'afir-regulation',
    designYear: 2023,
    assumption:
      'Fleet-indexed targets keep public charging at or above 1.3 kW per registered BEV, with TEN-T coverage milestones met in 2025/2027.',
    signpost: 'Installed public charging capacity per registered BEV; TEN-T node and corridor coverage.',
    violationCriterion:
      'Violated if Member States broadly miss the fleet-based capacity formula or the dated TEN-T milestones.',
    observation:
      'Aggregate capacity per BEV exceeds the formula in most Member States and light-duty TEN-T coverage advances on schedule; heavy-duty pools and hydrogen stations lag their later milestones.',
    source: 'European Alternative Fuels Observatory (EAFO).',
    tier: 'B',
    status: 'valid',
  },
  'epbd-recast': {
    policyId: 'epbd-recast',
    designYear: 2024,
    assumption:
      'Financing conditions and national renovation plans support a doubling of deep-renovation rates this decade.',
    signpost: 'Deep-renovation rate; content of national building renovation plans (due 2026).',
    violationCriterion:
      'Violated if the deep-renovation rate remains at or below ~1%/yr after national plans take effect; under pressure while rates stagnate near 1% pre-plan.',
    observation:
      'Deep-renovation rates remain near 1%/yr amid higher financing costs; national plans are not yet due, so the post-plan test has not run.',
    source: 'BPIE renovation monitors; Commission EPBD implementation reports.',
    tier: 'C',
    status: 'under-pressure',
  },
  'social-climate-fund': {
    policyId: 'social-climate-fund',
    designYear: 2023,
    assumption:
      'ETS2 starts in 2027 with prices near the €45 soft cap, capitalising the fund (~€65 bn) before household carbon costs peak.',
    signpost: 'ETS2 start date in law; auction/futures price expectations; Social Climate Plan submissions.',
    violationCriterion:
      'Violated if the ETS2 start is delayed in law or auction yield falls materially below plan; under pressure while delay or softening proposals are live in the legislature.',
    observation:
      'Delay/softening proposals are under active negotiation; price forecasts straddle the soft cap; Social Climate Plans were due 2025–26 with submissions uneven.',
    source: 'Council/EP state of play; Commission SCF guidance.',
    tier: 'B',
    status: 'under-pressure',
  },
  'methane-regulation': {
    policyId: 'methane-regulation',
    designYear: 2024,
    assumption:
      'Exporters comply with MRV-equivalence and the 2030 import intensity standard rather than reroute cargoes.',
    signpost: 'Importer MRV filings; supplier-country equivalence decisions; LNG trade-flow shifts.',
    violationCriterion:
      'Violated if major suppliers refuse equivalence and enforcement is waived; under pressure if supplier data becomes demonstrably unverifiable.',
    observation:
      'Domestic implementation proceeds on schedule; the 2025 US deregulatory turn raises verification questions for one major supplier but no equivalence refusal or enforcement waiver has occurred.',
    source: 'Commission implementation reports.',
    tier: 'B',
    status: 'valid',
  },
  'nature-restoration-law': {
    policyId: 'nature-restoration-law',
    designYear: 2024,
    assumption:
      'Member States submit credible national restoration plans by September 2026 with financing identified.',
    signpost: 'Plan submissions, their area coverage and financing sections.',
    violationCriterion:
      'Violated if plans are missing or facially non-compliant for a majority of Member States after the deadline; under pressure while dedicated financing remains unidentified and pre-submission signals are minimalist.',
    observation:
      'Adopted by the narrowest margin; no dedicated EU restoration fund was created; several Member States signal minimalist plans ahead of the 2026 deadline.',
    source: 'Commission; Environment Council records.',
    tier: 'B',
    status: 'under-pressure',
  },
  csrd: {
    policyId: 'csrd',
    designYear: 2022,
    assumption:
      'The wave-based scope (large + listed undertakings from ≥250 employees) holds, generating economy-wide audited data from FY2024.',
    signpost: 'Legal scope of the reporting obligation; count of in-scope undertakings.',
    violationCriterion:
      'Violated if the legal scope is materially cut or reporting waves are deferred in law.',
    observation:
      'The 2025 Omnibus raised the threshold to 1,000+ employees and deferred later waves by two years — removing ~80% of originally in-scope firms by count.',
    source: 'Omnibus simplification package 2025 (OJ).',
    tier: 'A',
    status: 'violated',
  },
  'fueleu-maritime': {
    policyId: 'fueleu-maritime',
    designYear: 2023,
    assumption:
      'Bridge fuels (bio/LNG) cover the early GHG-intensity steps while the e-fuel cost premium narrows ahead of the 2034 RFNBO review.',
    signpost: 'Fleet compliance balances against the 2025 step; e-fuel offtake contracting.',
    violationCriterion:
      'Violated if fleets fail the 2025 GHG-intensity step at scale; under pressure if the e-fuel premium widens with no offtake pipeline forming.',
    observation:
      'Early compliance proceeds via the expected bridge fuels; an e-fuel premium persists but offtake contracting has begun; the IMO net-zero framework adds a parallel global layer.',
    source: 'EMSA / verifier compliance data.',
    tier: 'B',
    status: 'valid',
  },
  'refueleu-aviation': {
    policyId: 'refueleu-aviation',
    designYear: 2023,
    assumption:
      'SAF supply scales to the 2030 6% blend including the 1.2% synthetic-fuel sub-mandate.',
    signpost: 'SAF production capacity pipeline; e-SAF final investment decisions vs the volume the sub-mandate requires.',
    violationCriterion:
      'Violated if e-SAF capacity available by 2030 remains below the sub-mandate requirement on committed FIDs after 2027; under pressure as FIDs slip or cancel.',
    observation:
      'The 2% step is being met; multiple e-SAF projects have been delayed or cancelled and committed 2030 capacity currently sits below the sub-mandate requirement, with the post-2027 test still open.',
    source: 'EASA SAF reporting; industry project trackers.',
    tier: 'B',
    status: 'under-pressure',
  },
  'governance-regulation': {
    policyId: 'governance-regulation',
    designYear: 2018,
    assumption:
      'The plan–assess–recommend cycle induces timely, gap-closing NECPs without hard enforcement.',
    signpost: 'NECP submission timeliness; assessed ambition and implementation gaps across successive cycles.',
    violationCriterion:
      'Violated if assessed gaps persist across two consecutive planning cycles despite recommendations; under pressure if submissions are broadly late within a single cycle.',
    observation:
      'Most 2023–24 updates were late and the Commission aggregate assessment again finds ambition and implementation gaps — the second consecutive cycle with persistent gaps after recommendations.',
    source: 'Commission NECP assessments (2020 and 2024–25 cycles).',
    tier: 'B',
    status: 'violated',
  },
  'net-zero-industry-act': {
    policyId: 'net-zero-industry-act',
    designYear: 2024,
    assumption:
      'Demand-pull (resilience criteria in auctions, permitting speed-ups) suffices to move strategic-technology manufacturing toward the 40% benchmark without price support.',
    signpost: 'EU manufacturing capacity shares by strategic technology; plant FIDs and exits.',
    violationCriterion:
      'Violated if domestic shares stagnate or fall across flagship segments two years after applicability; under pressure amid exits and persistent import price gaps.',
    observation:
      'Solar module share remains in low single digits with exits among EU makers; batteries mixed; wind holds. The two-year post-applicability test window is still running.',
    source: 'JRC cleantech monitoring; SolarPower Europe.',
    tier: 'B',
    status: 'under-pressure',
  },
  'critical-raw-materials-act': {
    policyId: 'critical-raw-materials-act',
    designYear: 2024,
    assumption:
      'Strategic-project status plus 27/15-month permitting tracks mobilise a project pipeline toward the 2030 extraction, processing and recycling benchmarks.',
    signpost: 'Strategic-project designations; realised permitting durations on designated projects.',
    violationCriterion:
      'Violated if designation rounds stall or realised permitting broadly exceeds the statutory tracks.',
    observation:
      'Designation rounds since 2025 have proceeded broadly on schedule; the statutory permitting clock is not yet tested at scale; the extraction benchmark remains the hardest.',
    source: 'Commission / European Critical Raw Materials Board.',
    tier: 'B',
    status: 'valid',
  },
  'repowereu-plan': {
    policyId: 'repowereu-plan',
    designYear: 2022,
    assumption:
      'Diversification, demand cuts and accelerated renewables can replace Russian fossil gas without rationing.',
    signpost: 'Russian share of EU gas imports; storage-filling targets; gas demand-reduction outturn.',
    violationCriterion:
      'Violated if rationing occurs or the Russian share fails to fall materially below its 2021 level.',
    observation:
      'The Russian share fell from ~45% (2021) to under 20% and falling; storage targets were met every season; voluntary demand-reduction targets were achieved; no rationing occurred.',
    source: 'Eurostat; ACER market monitoring.',
    tier: 'A',
    status: 'valid',
  },
  'eu-green-deal': {
    policyId: 'eu-green-deal',
    designYear: 2019,
    assumption:
      'Climate remains the organising frame across Commission cycles, keeping the announced instrument pipeline intact.',
    signpost: 'Fate of announced Green Deal instruments across the 2024 cycle change; status of the core 2030/2050 targets.',
    violationCriterion:
      'Violated if the core 2030/2050 targets are reopened; under pressure if accompanying instruments are withdrawn or materially weakened.',
    observation:
      'Core targets stand, but the SUR was withdrawn and CSRD, CBAM and Taxonomy reporting were trimmed by Omnibus packages as the agenda was reframed around the Clean Industrial Deal.',
    source: 'Commission work programmes 2024–26.',
    tier: 'B',
    status: 'under-pressure',
  },
  'taxonomy-regulation': {
    policyId: 'taxonomy-regulation',
    designYear: 2020,
    assumption:
      'A stable, science-based classification becomes the market’s common language, with mandatory alignment reporting across large firms.',
    signpost: 'Scope of mandatory Art. 8 reporting; legal challenges to the screening criteria.',
    violationCriterion:
      'Violated if alignment reporting becomes substantially voluntary across the large-firm universe or criteria are annulled; under pressure amid simplification cuts and live litigation.',
    observation:
      'The 2025 Omnibus made taxonomy reporting voluntary below the new 1,000-employee threshold and cut datapoints; reporting remains mandatory for the largest firms; gas/nuclear criteria litigation continues.',
    source: 'Omnibus simplification package 2025; CJEU docket.',
    tier: 'B',
    status: 'under-pressure',
  },
  'farm-to-fork-strategy': {
    policyId: 'farm-to-fork-strategy',
    designYear: 2020,
    assumption:
      'The 2030 pesticide, organic and nutrient targets are carried into binding law via the SUR and a sustainable food systems framework law.',
    signpost: 'Legal status of the SUR proposal and of the framework-law proposal.',
    violationCriterion:
      'Violated if the SUR is withdrawn or the framework law is not tabled within the strategy window.',
    observation: 'The SUR was withdrawn in February 2024; the framework law was never tabled.',
    source: 'Commission work programme 2024.',
    tier: 'A',
    status: 'violated',
  },
  'cap-strategic-plans': {
    policyId: 'cap-strategic-plans',
    designYear: 2021,
    assumption:
      'The green architecture (GAEC conditionality + eco-schemes) holds for 2023–27, raising the environmental baseline of farm payments.',
    signpost: 'Legal status of GAEC standards; eco-scheme budgets in approved plans.',
    violationCriterion: 'Violated if GAEC standards are deleted or relaxed in law mid-period.',
    observation:
      'The 2024 amending regulation relaxed or deleted several GAEC obligations and exempted small farms (<10 ha) from conditionality controls — mid-period, in law.',
    source: 'Reg. (EU) 2024/1468 (OJ).',
    tier: 'A',
    status: 'violated',
  },
  'fit-for-55': {
    policyId: 'fit-for-55',
    designYear: 2021,
    assumption:
      'The package is adopted as an interlocking whole — pricing, targets, standards and funds calibrated together.',
    signpost: 'Adoption status of the package files.',
    violationCriterion: 'Violated if key files fail adoption or are decoupled from the calibration.',
    observation: 'All major files were adopted 2022–24; the interlock exists in law.',
    source: 'Legislative records (OJ).',
    tier: 'A',
    status: 'valid',
  },
};

// ── Step 2 · Coherence across policy goals (Nilsson et al. 2016 scale) ─────

/** The seven-point goal-interaction scale of Nilsson, Griggs & Visbeck
 *  (2016, Nature 534:320), definitions per the ICSU (2017) guide. */
export type InteractionScore = -3 | -2 | -1 | 0 | 1 | 2 | 3;

export const INTERACTION_SCALE: Record<
  InteractionScore,
  { name: string; definition: string }
> = {
  3: { name: 'Indivisible', definition: 'Inextricably linked to the achievement of the other goal.' },
  2: { name: 'Reinforcing', definition: 'Aids the achievement of the other goal.' },
  1: { name: 'Enabling', definition: 'Creates conditions that further the other goal.' },
  0: { name: 'Consistent', definition: 'No significant positive or negative interaction.' },
  [-1]: { name: 'Constraining', definition: 'Limits options on the other goal.' },
  [-2]: { name: 'Counteracting', definition: 'Clashes with the other goal.' },
  [-3]: { name: 'Cancelling', definition: 'Makes it impossible to reach the other goal.' },
};

/** The causal channel through which the interaction runs. */
export type InteractionMechanism =
  | 'resource competition'
  | 'land/sea-use competition'
  | 'regulatory dependency'
  | 'data dependency'
  | 'price signal'
  | 'demand pull'
  | 'timing & sequencing'
  | 'distributional';

export interface GoalInteraction {
  id: string;
  /** The two policies whose goals interact (order is presentational only). */
  a: string;
  b: string;
  /** Nilsson-scale score; the name/definition follow from INTERACTION_SCALE. */
  score: InteractionScore;
  mechanism: InteractionMechanism;
  /** The goal at stake on each side, stated as the act states it. */
  goalA: string;
  goalB: string;
  /** The legal provisions that CREATE the interaction — the citable basis. */
  legalBasis: string;
  rationale: string;
  tier: EvidenceTier;
}

export const GOAL_INTERACTIONS: GoalInteraction[] = [
  {
    id: 'coh-int-red-lulucf',
    a: 'renewable-energy-directive',
    b: 'lulucf-regulation',
    score: -2,
    mechanism: 'resource competition',
    goalA: '42.5% renewables by 2030, with forest biomass counted as renewable',
    goalB: '310 Mt CO₂eq net removals by 2030',
    legalBasis: 'RED Art. 29 + Annex IX (biomass eligibility); LULUCF Reg. Art. 4(2) + Annex IIa.',
    rationale:
      'Energy-wood demand that RED rewards as zero-carbon is harvested out of the sink LULUCF needs left standing; additional primary woody biomass combustion debits the 310 Mt target directly.',
    tier: 'B',
  },
  {
    id: 'coh-int-esr-lulucf',
    a: 'effort-sharing-regulation',
    b: 'lulucf-regulation',
    score: -1,
    mechanism: 'regulatory dependency',
    goalA: '−40% in non-ETS sectors by 2030',
    goalB: 'No-debit rule and rising net removals',
    legalBasis: 'ESR Art. 7 (up to 280 Mt LULUCF flexibility); LULUCF Reg. Art. 13b.',
    rationale:
      'The two-way flexibility lets land credits substitute for real non-ETS cuts and pushes LULUCF shortfalls back onto ESR totals — softening both targets exactly when the sink is shrinking.',
    tier: 'A',
  },
  {
    id: 'coh-int-ets-cbam',
    a: 'eu-ets-directive',
    b: 'cbam-regulation',
    score: 2,
    mechanism: 'price signal',
    goalA: 'Cost-effective reductions via a declining cap with full carbon pricing',
    goalB: 'Prevent carbon leakage on embedded imports',
    legalBasis: 'ETS Dir. Art. 10a(1a) (free-allocation phase-out); CBAM Reg. Arts. 1, 36.',
    rationale:
      'CBAM is what lets the ETS phase out free allocation without exporting its industrial base — restoring the full marginal price signal the cap-and-trade design intends.',
    tier: 'A',
  },
  {
    id: 'coh-int-ets-esr',
    a: 'eu-ets-directive',
    b: 'effort-sharing-regulation',
    score: 1,
    mechanism: 'regulatory dependency',
    goalA: '−62% in ETS sectors by 2030 (vs 2005)',
    goalB: '−40% in non-ETS sectors by 2030 (vs 2005)',
    legalBasis: 'ESR Art. 2(1) (scope defined as non-ETS); ETS Dir. Chapters IVa (ETS2).',
    rationale:
      'Complementary coverage partitions the economy into two calibrated halves of the −55% objective, with ETS2 designed to bridge the buildings/road seam between them from 2027.',
    tier: 'A',
  },
  {
    id: 'coh-int-cars-afir',
    a: 'co2-cars-regulation',
    b: 'afir-regulation',
    score: 2,
    mechanism: 'demand pull',
    goalA: '100% zero-emission new cars by 2035',
    goalB: 'Fleet-paced public charging and refuelling coverage',
    legalBasis: 'CO₂ standards Reg. Art. 1(5a); AFIR Art. 3 (fleet-based capacity formula).',
    rationale:
      'A demand-pull / infrastructure-push pair: the ZEV mandate creates the fleet AFIR’s capacity formula is indexed to, so the two ratchet together by construction.',
    tier: 'A',
  },
  {
    id: 'coh-int-cars-euro7',
    a: 'co2-cars-regulation',
    b: 'euro-7-regulation',
    score: -1,
    mechanism: 'timing & sequencing',
    goalA: 'Steer automotive capital into electrification toward 2035',
    goalB: 'Tighter pollutant limits for combustion vehicles in the interim',
    legalBasis: 'CO₂ standards Reg. Art. 1(5a); Euro 7 Reg. Arts. 1–4 and application dates.',
    rationale:
      'Euro 7 obliges continued engineering investment in ICE platforms that the CO₂ standards simultaneously steer capital away from — a sequencing constraint both negotiations traded on.',
    tier: 'B',
  },
  {
    id: 'coh-int-cars-aaq',
    a: 'co2-cars-regulation',
    b: 'air-quality-directive',
    score: 1,
    mechanism: 'demand pull',
    goalA: 'Fleet electrification via CO₂ standards',
    goalB: 'WHO-aligned air-quality limit values by 2030',
    legalBasis: 'CO₂ standards Reg. Art. 1; AAQD Annex I limit values (NO₂, PM).',
    rationale:
      'Fleet electrification is among the largest single levers for urban NO₂ compliance — the climate standard creates conditions that further the health directive’s hardest pollutant target.',
    tier: 'B',
  },
  {
    id: 'coh-int-scf-epbd',
    a: 'social-climate-fund',
    b: 'epbd-recast',
    score: 2,
    mechanism: 'distributional',
    goalA: 'Cushion vulnerable households against carbon costs',
    goalB: 'Renovate the worst-performing building stock first',
    legalBasis: 'SCF Reg. Arts. 3, 8 (target groups, eligible measures); EPBD Art. 9 (trajectories for worst stock).',
    rationale:
      'The SCF targets precisely the households the EPBD’s worst-stock obligations would otherwise hit hardest — cushion and obligation are designed as two sides of one move.',
    tier: 'A',
  },
  {
    id: 'coh-int-cap-methane',
    a: 'cap-strategic-plans',
    b: 'methane-regulation',
    score: -1,
    mechanism: 'regulatory dependency',
    goalA: 'Stabilise farm incomes, including livestock',
    goalB: 'Cut methane emissions across the energy chain',
    legalBasis: 'Methane Reg. Art. 1 (scope limited to energy); CAP SP Reg. Arts. 32–34 (coupled income support).',
    rationale:
      'The Methane Regulation excludes agriculture — the largest EU methane source — while CAP coupled support stabilises herd sizes; between them, options for cutting EU methane on its biggest front are limited.',
    tier: 'A',
  },
  {
    id: 'coh-int-cap-nrl',
    a: 'cap-strategic-plans',
    b: 'nature-restoration-law',
    score: -2,
    mechanism: 'land/sea-use competition',
    goalA: 'Payments tied to productive agricultural area',
    goalB: 'Restore drained peatlands and agricultural ecosystems by 2030–50',
    legalBasis: 'NRL Arts. 4, 11 (agri-ecosystems, peatland rewetting); CAP SP Reg. Art. 4(4) (eligible hectare); Reg. 2024/1468 (GAEC relaxation).',
    rationale:
      'NRL restoration targets on agricultural land clash with CAP’s productive-area payment logic, and the 2024 weakening of conditionality moved the two acts further apart.',
    tier: 'A',
  },
  {
    id: 'coh-int-f2f-cap',
    a: 'farm-to-fork-strategy',
    b: 'cap-strategic-plans',
    score: -1,
    mechanism: 'timing & sequencing',
    goalA: '−50% pesticides, 25% organic farming by 2030',
    goalB: 'National CAP plans fixed before the targets had legal force',
    legalBasis: 'F2F COM(2020) 381 targets; CAP SP Reg. Art. 105 (plan approval cycle).',
    rationale:
      'The strategy’s 2030 goals depended on CAP strategic plans as delivery vehicle, but eco-scheme ambition was fixed before any target became binding — and the SUR’s withdrawal removed the intended legal bridge.',
    tier: 'B',
  },
  {
    id: 'coh-int-nrl-red',
    a: 'nature-restoration-law',
    b: 'renewable-energy-directive',
    score: -1,
    mechanism: 'land/sea-use competition',
    goalA: 'Restore 20% of land and sea by 2030',
    goalB: 'Acceleration areas with presumed overriding public interest for renewables',
    legalBasis: 'RED Arts. 15b–16f (acceleration areas, overriding public interest); NRL Arts. 4–5.',
    rationale:
      'Restoration and renewables build-out compete for the same land and sea; RED’s overriding-public-interest presumption tilts permitting against restoration, with carve-outs only partly reconciling the two.',
    tier: 'B',
  },
  {
    id: 'coh-int-crma-habitats',
    a: 'critical-raw-materials-act',
    b: 'habitats-directive',
    score: -1,
    mechanism: 'timing & sequencing',
    goalA: '27-month permitting for strategic extraction projects',
    goalB: 'Favourable conservation status and strict Natura 2000 assessment',
    legalBasis: 'CRMA Arts. 10–11 (permitting deadlines); Habitats Dir. Art. 6(3)–(4).',
    rationale:
      'Accelerated mine permitting limits the time available for appropriate assessment and derogation discipline; the CRMA asserts compatibility, but the clock it imposes is the Habitats Directive’s scarcest resource.',
    tier: 'B',
  },
  {
    id: 'coh-int-nzia-crma',
    a: 'net-zero-industry-act',
    b: 'critical-raw-materials-act',
    score: 2,
    mechanism: 'regulatory dependency',
    goalA: '40% domestic cleantech manufacturing by 2030',
    goalB: 'Extraction / processing / recycling benchmarks for strategic raw materials',
    legalBasis: 'NZIA Art. 5 (benchmark); CRMA Art. 5 (benchmarks); shared strategic-project machinery.',
    rationale:
      'Consecutive links of one supply chain: NZIA’s manufacturing benchmark is unreachable without CRMA’s upstream material benchmarks, and CRMA demand is anchored by NZIA factories.',
    tier: 'A',
  },
  {
    id: 'coh-int-nzia-cbam',
    a: 'net-zero-industry-act',
    b: 'cbam-regulation',
    score: 1,
    mechanism: 'price signal',
    goalA: 'Rebuild energy-intensive cleantech manufacturing in the EU',
    goalB: 'Price embedded carbon at the border',
    legalBasis: 'CBAM Reg. Annex I (steel, aluminium, hydrogen); NZIA Annex (strategic technologies).',
    rationale:
      'CBAM levels carbon costs on exactly the energy-intensive upstream the NZIA build-out depends on — leakage protection creates conditions for reindustrialisation, without guaranteeing it.',
    tier: 'B',
  },
  {
    id: 'coh-int-refuel-fueleu',
    a: 'refueleu-aviation',
    b: 'fueleu-maritime',
    score: -1,
    mechanism: 'resource competition',
    goalA: 'SAF blending mandate incl. synthetic sub-target',
    goalB: 'Falling GHG-intensity of marine fuels with RFNBO incentives',
    legalBasis: 'ReFuelEU Annex I (blend shares); FuelEU Arts. 4–5 + Art. 6 (RFNBO multiplier).',
    rationale:
      'Both mandates draw on the same constrained pool of sustainable feedstocks and renewable hydrogen; at the margin, aviation’s e-SAF sub-target and shipping’s RFNBO multiplier bid for identical molecules.',
    tier: 'B',
  },
  {
    id: 'coh-int-h2pkg-red',
    a: 'hydrogen-gas-package',
    b: 'renewable-energy-directive',
    score: 2,
    mechanism: 'demand pull',
    goalA: 'Market rules and infrastructure for a hydrogen economy',
    goalB: 'Binding RFNBO targets in industry and transport',
    legalBasis: 'RED Arts. 22a, 25 (RFNBO targets); Gas/H₂ package market and network rules.',
    rationale:
      'RED’s RFNBO targets create the demand the hydrogen market rules need to de-risk; the residual definitional friction (low-carbon vs renewable hydrogen) is second-order to the demand link.',
    tier: 'B',
  },
  {
    id: 'coh-int-eed-epbd',
    a: 'energy-efficiency-directive',
    b: 'epbd-recast',
    score: 2,
    mechanism: 'regulatory dependency',
    goalA: 'Cap final consumption at 763 Mtoe by 2030',
    goalB: 'Zero-emission building stock by 2050, worst stock first',
    legalBasis: 'EED Arts. 5–6, 8 (public-sector duties, savings obligation); EPBD Art. 9 (stock trajectories).',
    rationale:
      'Building renovation is the largest single lever for the EED cap, and EED public-sector renovation duties operationalise the EPBD’s stock goals — the two acts share one delivery channel.',
    tier: 'A',
  },
  {
    id: 'coh-int-csrd-sfdr',
    a: 'csrd',
    b: 'sfdr',
    score: 1,
    mechanism: 'data dependency',
    goalA: 'Audited sustainability data from the real economy',
    goalB: 'Comparable adverse-impact disclosure by financial market participants',
    legalBasis: 'SFDR Art. 4 + PAI RTS (indicators designed to be fed by CSRD/ESRS datapoints).',
    rationale:
      'CSRD data enables SFDR disclosure quality. The enabling link survives but over a much smaller universe after the Omnibus scope cut — for de-scoped investees, SFDR reverts to estimates.',
    tier: 'B',
  },
  {
    id: 'coh-int-csrd-taxonomy',
    a: 'csrd',
    b: 'taxonomy-regulation',
    score: 2,
    mechanism: 'data dependency',
    goalA: 'Sustainability reporting under ESRS',
    goalB: 'Taxonomy-alignment KPIs (turnover / CapEx / OpEx)',
    legalBasis: 'Taxonomy Reg. Art. 8 + Disclosures Delegated Act (KPIs reported within management reports under CSRD).',
    rationale:
      'Taxonomy Art. 8 KPIs ride on CSRD reporting infrastructure — one audit trail serves both acts, now over the reduced post-Omnibus universe.',
    tier: 'A',
  },
  {
    id: 'coh-int-claims-csrd',
    a: 'green-claims-directive',
    b: 'csrd',
    score: 1,
    mechanism: 'data dependency',
    goalA: 'Substantiated, verified environmental claims to consumers',
    goalB: 'Audited corporate sustainability disclosure to markets',
    legalBasis: 'Green Claims proposal Arts. 3–5 (substantiation); CSRD/ESRS datapoints as evidence base.',
    rationale:
      'Claim substantiation at the shelf and audited reporting at the filing close the greenwashing loop from opposite ends, with shared evidence standards lowering enforcement cost.',
    tier: 'B',
  },
  {
    id: 'coh-int-emr-red',
    a: 'electricity-market-regulation',
    b: 'renewable-energy-directive',
    score: 2,
    mechanism: 'price signal',
    goalA: 'Two-sided CfDs and PPA facilitation in market design',
    goalB: '42.5% renewables by 2030',
    legalBasis: 'EMD reform Arts. 19a–19b (PPAs, two-sided CfDs); RED Art. 3.',
    rationale:
      'The reformed market design de-risks exactly the capital-intensive build-out RED mandates: CfD revenue stabilisation and PPA access are the financing rails under the renewables target.',
    tier: 'A',
  },
  {
    id: 'coh-int-aiact-eed',
    a: 'ai-act',
    b: 'energy-efficiency-directive',
    score: -1,
    mechanism: 'resource competition',
    goalA: 'Trustworthy-AI rules silent on compute energy demand',
    goalB: 'Cap final energy consumption at 763 Mtoe',
    legalBasis: 'AI Act (no energy provisions beyond Art. 95 voluntary codes); EED Art. 12 (data-centre reporting only).',
    rationale:
      'Nothing in the AI Act constrains the energy footprint of the compute build-out it legitimises; data-centre load growth narrows the room under the EED cap, which can only observe it.',
    tier: 'B',
  },
  {
    id: 'coh-int-fgas-epbd',
    a: 'f-gas-regulation',
    b: 'epbd-recast',
    score: -1,
    mechanism: 'timing & sequencing',
    goalA: 'Accelerated HFC phase-down',
    goalB: 'Mass heat-pump deployment for building decarbonisation',
    legalBasis: 'F-gas Reg. Annex VII (quota steps) + heat-pump equipment bans; EPBD heating decarbonisation pathway.',
    rationale:
      'The HFC phase-down restricts refrigerants most current heat pumps use just as the EPBD pathway requires their mass rollout — coherence depends on the natural-refrigerant transition outrunning the quota steps.',
    tier: 'B',
  },
  {
    id: 'coh-int-eugb-taxonomy',
    a: 'green-bonds-regulation',
    b: 'taxonomy-regulation',
    score: 2,
    mechanism: 'regulatory dependency',
    goalA: 'A gold-standard EU green bond label',
    goalB: 'Stable, science-based activity criteria',
    legalBasis: 'EuGB Reg. Arts. 4–8 (taxonomy-aligned use of proceeds).',
    rationale:
      'The EuGB label is defined as taxonomy-aligned use of proceeds — its usability rises and falls with the stability and credibility of the criteria it imports wholesale.',
    tier: 'A',
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

/** Declared thresholds for the derived scores (documented in the UI). */
export const DERIVED_SCORE_THRESHOLDS = { coherent: 0.75, partial: 0.45 } as const;

function gradeFromScore(score: number | null): CoherenceGrade {
  if (score === null) return 'not-assessed';
  if (score >= DERIVED_SCORE_THRESHOLDS.coherent) return 'coherent';
  if (score >= DERIVED_SCORE_THRESHOLDS.partial) return 'partial';
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

// ── Step 4 · Policy evaluation: distance-to-target pace ratio ──────────────

export type OutcomeReading = 'on-track' | 'lagging' | 'off-track';

/** Declared thresholds for the pace ratio (EEA T&P-style trichotomy):
 *  observed recent pace ÷ required pace ≥ 1 → on track; ≥ 0.5 → lagging;
 *  below (or wrong direction) → off track. */
export const PACE_THRESHOLDS = { onTrack: 1.0, lagging: 0.5 } as const;

export interface OutcomeMeasurement {
  policyId: string;
  /** The target-bearing indicator, taken from (or derived for) the act. */
  indicator: string;
  unit: string;
  /** The act's own reference point. */
  baseline: { year: number; value: number };
  /** Start of the recent-pace window (≈ last five years, mirroring the EEA
   *  convention of judging by recent historic pace, not the full record). */
  recent: { year: number; value: number };
  latest: { year: number; value: number };
  target: { year: number; value: number };
  /** Output side of step 4 — what changed in the policy itself (amendments,
   *  withdrawals, ratchets). Legal facts, tier-A by nature. */
  policyChange: string;
  source: string;
  tier: EvidenceTier;
  /** Honest caveats on the data (crisis effects, indicator criticisms…). */
  notes?: string;
}

export const OUTCOME_MEASUREMENTS: Record<string, OutcomeMeasurement> = {
  'eu-climate-law': {
    policyId: 'eu-climate-law',
    indicator: 'EU net GHG emissions (index, 1990 = 100)',
    unit: 'index',
    baseline: { year: 1990, value: 100 },
    recent: { year: 2018, value: 77 },
    latest: { year: 2023, value: 63 },
    target: { year: 2030, value: 45 },
    policyChange:
      'The Fit-for-55 acts the law required were essentially all adopted; the mandated 2040-target proposal slipped past its deadline and remains in negotiation.',
    source: 'EEA GHG inventory; Climate Action Progress Report.',
    tier: 'A',
    notes:
      'Recent pace includes the COVID dip and rebound; Commission projections reach ~−54% by 2030 only with full implementation of adopted measures.',
  },
  'eu-ets-directive': {
    policyId: 'eu-ets-directive',
    indicator: 'Verified stationary ETS emissions (index, 2005 = 100)',
    unit: 'index',
    baseline: { year: 2005, value: 100 },
    recent: { year: 2018, value: 71 },
    latest: { year: 2023, value: 53 },
    target: { year: 2030, value: 38 },
    policyChange:
      'The 2023 revision tightened the LRF to 4.3/4.4%, added maritime and locked the free-allocation phase-out to CBAM — a ratchet, in law.',
    source: 'EEA ETS data viewer (verified emissions).',
    tier: 'A',
    notes: 'Part of the 2022–23 fall reflects crisis-driven output decline in industry.',
  },
  'effort-sharing-regulation': {
    policyId: 'effort-sharing-regulation',
    indicator: 'ESR-sector emissions (index, 2005 = 100)',
    unit: 'index',
    baseline: { year: 2005, value: 100 },
    recent: { year: 2018, value: 89 },
    latest: { year: 2023, value: 82 },
    target: { year: 2030, value: 60 },
    policyChange: 'Ratcheted from −30% to −40% by Reg. 2023/857; compliance machinery unchanged.',
    source: 'EEA Trends & Projections; EU GHG inventory.',
    tier: 'A',
  },
  'lulucf-regulation': {
    policyId: 'lulucf-regulation',
    indicator: 'Net LULUCF sink',
    unit: 'Mt CO₂eq (negative = removals)',
    baseline: { year: 2015, value: -310 },
    recent: { year: 2018, value: -265 },
    latest: { year: 2023, value: -200 },
    target: { year: 2030, value: -310 },
    policyChange: 'The 2023 amendment set the 310 Mt 2030 target with per-MS contributions in Annex IIa.',
    source: 'EEA / UNFCCC EU GHG inventory.',
    tier: 'A',
    notes: 'LULUCF inventories carry high uncertainty and recurrent revisions.',
  },
  'renewable-energy-directive': {
    policyId: 'renewable-energy-directive',
    indicator: 'Renewables share of gross final energy consumption',
    unit: '%',
    baseline: { year: 2020, value: 22.1 },
    recent: { year: 2018, value: 18.0 },
    latest: { year: 2023, value: 24.5 },
    target: { year: 2030, value: 42.5 },
    policyChange: 'RED III raised the binding target to 42.5% and added permitting acceleration (2023).',
    source: 'Eurostat SHARES.',
    tier: 'A',
  },
  'energy-efficiency-directive': {
    policyId: 'energy-efficiency-directive',
    indicator: 'Final energy consumption',
    unit: 'Mtoe',
    baseline: { year: 2020, value: 907 },
    recent: { year: 2018, value: 935 },
    latest: { year: 2023, value: 894 },
    target: { year: 2030, value: 763 },
    policyChange: 'The 2023 recast made −11.7% binding and stepped up the savings obligation.',
    source: 'Eurostat energy balances; EEA Trends & Projections.',
    tier: 'A',
    notes: 'The 2022–23 fall is partly crisis demand response; values are provisional.',
  },
  'co2-cars-regulation': {
    policyId: 'co2-cars-regulation',
    indicator: 'New-car fleet average CO₂ (WLTP)',
    unit: 'g CO₂/km',
    baseline: { year: 2021, value: 114 },
    recent: { year: 2021, value: 114 },
    latest: { year: 2023, value: 107 },
    target: { year: 2030, value: 51 },
    policyChange:
      'The 2025 step was converted into 2025–27 averaging and the 2035 review advanced — the act was weakened, not strengthened, at first market contact.',
    source: 'EEA new-vehicle CO₂ monitoring.',
    tier: 'A',
    notes: 'WLTP series starts 2021, so the recent window equals the baseline window.',
  },
  'farm-to-fork-strategy': {
    policyId: 'farm-to-fork-strategy',
    indicator: 'Organic share of utilised agricultural area',
    unit: '%',
    baseline: { year: 2020, value: 9.1 },
    recent: { year: 2018, value: 8.0 },
    latest: { year: 2022, value: 10.5 },
    target: { year: 2030, value: 25 },
    policyChange:
      'Measured policy change is negative: the SUR was withdrawn (2024) and the framework law never tabled — the targets lost their instruments.',
    source: 'Eurostat organic farming statistics.',
    tier: 'A',
    notes: 'The pesticide target rides on the criticised HRI 1 indicator and is not scored here.',
  },
  'repowereu-plan': {
    policyId: 'repowereu-plan',
    indicator: 'Russian share of EU gas imports',
    unit: '%',
    baseline: { year: 2021, value: 45 },
    recent: { year: 2021, value: 45 },
    latest: { year: 2024, value: 18 },
    target: { year: 2027, value: 0 },
    policyChange:
      'Emergency regulations (storage, demand reduction, permitting) were adopted and largely sunset as designed; a phase-out instrument for remaining imports followed.',
    source: 'Eurostat; ACER market monitoring.',
    tier: 'A',
  },
};

export interface OutcomePace {
  /** (latest − recent) / years — the observed recent pace. */
  observedPerYear: number;
  /** (target − latest) / years — the pace the target requires from here. */
  requiredPerYear: number;
  /** observed ÷ required; negative when moving the wrong way. */
  ratio: number | null;
  reading: OutcomeReading;
}

/** Pure function: the step-4 reading is arithmetic over the measurement. */
export function computePace(m: OutcomeMeasurement): OutcomePace {
  const obsYears = Math.max(1, m.latest.year - m.recent.year);
  const reqYears = Math.max(1, m.target.year - m.latest.year);
  const observedPerYear = (m.latest.value - m.recent.value) / obsYears;
  const requiredPerYear = (m.target.value - m.latest.value) / reqYears;
  // Already at / past target with no required movement → on track.
  if (requiredPerYear === 0) {
    return { observedPerYear, requiredPerYear, ratio: null, reading: 'on-track' };
  }
  const ratio = observedPerYear / requiredPerYear;
  const reading: OutcomeReading =
    ratio >= PACE_THRESHOLDS.onTrack
      ? 'on-track'
      : ratio >= PACE_THRESHOLDS.lagging
        ? 'lagging'
        : 'off-track';
  return { observedPerYear, requiredPerYear, ratio, reading };
}

export interface EvaluationResult {
  /** MRV + review verdicts, reused from the checklist. */
  machinery: DerivedStepResult;
  measurement: (OutcomeMeasurement & { pace: OutcomePace }) | null;
  grade: CoherenceGrade;
}

const READING_GRADE: Record<OutcomeReading, CoherenceGrade> = {
  'on-track': 'coherent',
  lagging: 'partial',
  'off-track': 'incoherent',
};

export function evaluationCoherence(policyId: string): EvaluationResult {
  const machinery = deriveFromChecklist(policyId, EVALUATION_CRITERIA);
  const raw = OUTCOME_MEASUREMENTS[policyId] ?? null;
  const measurement = raw ? { ...raw, pace: computePace(raw) } : null;
  // Measured outcomes trump machinery: an act with perfect MRV that is
  // measurably off track is evaluatively incoherent, and vice versa.
  const grade: CoherenceGrade = measurement
    ? READING_GRADE[measurement.pace.reading]
    : machinery.grade;
  return { machinery, measurement, grade };
}

// ── Per-policy roll-up + corpus overview ───────────────────────────────────

const STATUS_GRADE: Record<AssumptionStatus, CoherenceGrade> = {
  valid: 'coherent',
  'under-pressure': 'partial',
  violated: 'incoherent',
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

/** Step-2 rollup rule (declared): grade = the policy's worst interaction
 *  score, mapped ≤ −2 → incoherent, −1 → partial, ≥ 0 → coherent. */
function horizontalGrade(interactions: GoalInteraction[]): CoherenceGrade {
  if (interactions.length === 0) return 'not-assessed';
  const worst = Math.min(...interactions.map(i => i.score));
  if (worst <= -2) return 'incoherent';
  if (worst === -1) return 'partial';
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
    ...Object.keys(OUTCOME_MEASUREMENTS),
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
  /** Score ≤ −2 (counteracting / cancelling). */
  counteracting: number;
  /** Score = −1 (constraining). */
  constraining: number;
  /** Score ≥ +1 (enabling / reinforcing / indivisible). */
  positive: number;
  violatedAssumptions: number;
  /** Mean means-coherence score across scope (step 3); null if none. */
  meanMeansScore: number | null;
  outcomesOffTrack: number;
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
  const counteracting = interactions.filter(i => i.score <= -2).length;
  const constraining = interactions.filter(i => i.score === -1).length;
  const positive = interactions.filter(i => i.score >= 1).length;
  const violatedAssumptions = profiles.filter(p => p.exAnte?.status === 'violated').length;
  const outcomesOffTrack = profiles.filter(
    p => p.evaluation.measurement?.pace.reading === 'off-track',
  ).length;

  const meansScores = profiles.map(p => p.means.score).filter((s): s is number => s !== null);
  const meanMeansScore =
    meansScores.length > 0
      ? meansScores.reduce((a, b) => a + b, 0) / meansScores.length
      : null;

  return {
    profiles,
    stepCounts,
    interactions,
    counteracting,
    constraining,
    positive,
    violatedAssumptions,
    meanMeansScore,
    outcomesOffTrack,
  };
}
