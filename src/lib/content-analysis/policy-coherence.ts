// ---------------------------------------------------------------------------
// Policy coherence assessment — ESABCC method (Moure logic).
//
// A SYSTEM-level lens over the tracked policy corpus, complementing the
// per-act objective–delivery checklist (policy-objective-checklist.ts). It
// follows the Advisory Board's worked coherence method (Mar Moure): every
// act is read against the EU's two OVERARCHING AMBITIONS — climate
// neutrality by 2050 and a climate-resilient society by 2050 — then
// DECOMPOSED into its policy objectives (visions, targets, objectives,
// goals) and its policy measures (regulations, plans/programmes,
// information, taxes, organisational committees). The decomposition is then
// run through a COHERENCE CHECK across three climate dimensions —
// mitigation, adaptation, and the mitigation–adaptation interface ("are
// these aligned? do they conflict?") — and finally a CRITICAL ASSESSMENT:
// why, are these ambitious enough (fit for purpose), and what is the effect
// of enablers and barriers?
//
// The method is laid out as FOUR LENSES (the analytical pipeline):
//
//   1. Overarching ambitions — does the act's design serve the two 2050
//      ambitions, and do the load-bearing assumptions it was designed on
//      still hold against how the world actually developed? Tested with
//      Assumption-Based Planning (Dewar et al., RAND 1993): each assumption
//      is a falsifiable proposition with a signpost indicator and an
//      explicit violation criterion.
//   2. Objectives & measures (decomposition) — the act's policy objectives
//      and policy measures, each tagged to a climate dimension, and whether
//      the measures are commensurate with the objectives (goals/means
//      congruence, Howlett & Rayner 2007, derived from the objective–
//      delivery checklist's five means-side criteria).
//   3. Coherence check — across mitigation / adaptation / mitigation–
//      adaptation: are the objectives and measures aligned, or do they
//      conflict? Cross-policy conflicts are scored on the seven-point
//      goal-interaction scale of Nilsson, Griggs & Visbeck (2016, Nature
//      534:320) with the ICSU (2017) rules, each carrying the interaction
//      mechanism, climate dimension, and the legal provisions that create it.
//   4. Critical assessment — fit for purpose: are the objectives ambitious
//      enough against the 2050 ambitions, and what is the effect of the
//      enablers and barriers? Anchored in the EEA distance-to-target pace
//      ratio (observed recent pace ÷ required pace) plus named enablers and
//      barriers.
//
// Evidence quality uses a GRADE-style tier instead of pseudo-confidences:
//   A — official statistics / registries / legal acts (Eurostat, EEA
//       inventory, ETS Union Registry, OJ).
//   B — official assessments (Commission, EEA, EMSA, EASA reports).
//   C — secondary sources (industry trackers, NGO monitors).
//
// Redundancy note (deliberate design decision): the decomposition's
// measures-side congruence and the critical assessment's machinery reuse
// the (policyId, check-*) verdicts shipped in the objective–delivery
// checklist as their evidence base instead of duplicating them. Only what
// the checklist cannot express — assumption audits, the objectives/measures
// decomposition, cross-policy interactions and outcome measurements — is
// authored here. Observation snapshot: June 2026, refreshed in a
// web-verified research pass (key vintage points: Reg. (EU) 2026/667
// adopting the 2040 target and delaying ETS2 to 2028; Omnibus I Dir. (EU)
// 2026/470; the second EUDR postponement 2025/2650; the batteries
// stop-the-clock 2025/1561). Observations carry their sources so each can
// be re-verified. Cross-cutting pattern the audits surface: post-adoption
// softening — scope cuts, date slips and step-averaging after first contact
// with compliance costs — is systemic across the 2025–26 simplification
// wave, not act-specific noise.
// ---------------------------------------------------------------------------

import {
  getPolicyChecklist,
  POLICY_OBJECTIVE_CHECKLISTS,
  type ChecklistVerdict,
  type PolicyChecklistEntry,
} from './policy-objective-checklist';

// ── Model vocabulary ───────────────────────────────────────────────────────

/** The four analytical lenses of the ESABCC coherence method, in order. */
export type CoherenceLensId = 'ambitions' | 'decomposition' | 'coherence' | 'critical';

/** Deprecated alias — the lenses were once called "steps". Kept so older
 *  importers compile; new code should use {@link CoherenceLensId}. */
export type CoherenceStepId = CoherenceLensId;

/** Unified per-lens grade, comparable across all four lenses. */
export type CoherenceGrade = 'coherent' | 'partial' | 'incoherent' | 'not-assessed';

/** GRADE-style evidence-quality tier (see header). */
export type EvidenceTier = 'A' | 'B' | 'C';

export const EVIDENCE_TIER_LABEL: Record<EvidenceTier, string> = {
  A: 'Official statistics / legal acts',
  B: 'Official assessments',
  C: 'Secondary sources',
};

// ── Climate dimensions (the coherence-check axis) ───────────────────────────
// The three lenses of the coherence check, straight from the worked example:
// is the act coherent on mitigation, on adaptation, and across the
// mitigation–adaptation interface?

export type ClimateDimension = 'mitigation' | 'adaptation' | 'mitigation-adaptation';

export interface ClimateDimensionMeta {
  id: ClimateDimension;
  /** Label as printed on the coherence-check panel. */
  label: string;
  shortLabel: string;
  description: string;
  color: string;
}

export const CLIMATE_DIMENSIONS: ClimateDimensionMeta[] = [
  {
    id: 'mitigation',
    label: 'Mitigation',
    shortLabel: 'Mit.',
    description:
      'Reducing greenhouse-gas emissions and increasing removals — the act works towards climate neutrality by 2050.',
    color: '#0065A4',
  },
  {
    id: 'adaptation',
    label: 'Adaptation',
    shortLabel: 'Adapt.',
    description:
      'Building resilience to climate impacts — the act works towards a climate-resilient society by 2050.',
    color: '#0E7C7B',
  },
  {
    id: 'mitigation-adaptation',
    label: 'Mitigation – Adaptation',
    shortLabel: 'Mit.–Adapt.',
    description:
      'The interface: objectives or measures that bear on both ambitions at once (e.g. sustainable land management), where synergies and trade-offs between the two live.',
    color: '#7C3AED',
  },
];

export const CLIMATE_DIMENSION_BY_ID: Record<ClimateDimension, ClimateDimensionMeta> =
  Object.fromEntries(CLIMATE_DIMENSIONS.map(d => [d.id, d])) as Record<
    ClimateDimension,
    ClimateDimensionMeta
  >;

// ── Overarching ambitions (the anchor) ──────────────────────────────────────
// Every act is read against these two: the coherence question is always
// "does this serve them, and is it coherent with the rest of the space in
// doing so?".

export type OverarchingAmbitionId = 'neutrality-2050' | 'resilience-2050';

export interface OverarchingAmbition {
  id: OverarchingAmbitionId;
  label: string;
  dimension: ClimateDimension;
  /** The legal/strategic anchor that fixes the ambition. */
  basis: string;
}

export const OVERARCHING_AMBITIONS: OverarchingAmbition[] = [
  {
    id: 'neutrality-2050',
    label: 'Climate neutrality by 2050',
    dimension: 'mitigation',
    basis: 'Regulation (EU) 2021/1119 (European Climate Law), Art. 2(1).',
  },
  {
    id: 'resilience-2050',
    label: 'A climate-resilient society by 2050',
    dimension: 'adaptation',
    basis:
      'European Climate Law Art. 5 (adaptation); EU Strategy on Adaptation to Climate Change (COM/2021/82).',
  },
];

export const OVERARCHING_AMBITION_BY_ID: Record<OverarchingAmbitionId, OverarchingAmbition> =
  Object.fromEntries(OVERARCHING_AMBITIONS.map(a => [a.id, a])) as Record<
    OverarchingAmbitionId,
    OverarchingAmbition
  >;

// ── The four lenses ─────────────────────────────────────────────────────────

export interface CoherenceLensMeta {
  id: CoherenceLensId;
  ordinal: 1 | 2 | 3 | 4;
  /** Master code id under `root-coherence` in seed.ts. Kept stable across the
   *  rename (persisted segment ids depend on these), so the lens ids map onto
   *  the original `coh-*` codes rather than matching their own names. */
  codeId: string;
  name: string;
  shortName: string;
  /** The question this lens asks of every act (from the worked method). */
  question: string;
  /** The published framework the lens borrows. */
  framework: string;
  /** Where the evidence comes from — surfaced in the UI for provenance. */
  basis: 'curated' | 'derived from objective–delivery checklist' | 'mixed';
  method: string;
}

export const COHERENCE_LENSES: CoherenceLensMeta[] = [
  {
    id: 'ambitions',
    ordinal: 1,
    codeId: 'coh-exante',
    name: 'Overarching ambitions',
    shortName: 'Ambitions',
    question:
      'Does the act serve the two 2050 ambitions — climate neutrality and a climate-resilient society — and do the assumptions it was designed on still hold against how the world developed?',
    framework: 'Assumption-Based Planning (Dewar et al., RAND 1993)',
    basis: 'curated',
    method:
      'The act is linked to the overarching ambitions it serves. Each load-bearing design assumption is stated as a falsifiable proposition with a signpost indicator and an explicit violation criterion; status (valid / under pressure / violated) = the criterion applied to a sourced observation.',
  },
  {
    id: 'decomposition',
    ordinal: 2,
    codeId: 'coh-means',
    name: 'Objectives & measures',
    shortName: 'Objectives & measures',
    question:
      'What are the act’s policy objectives (visions, targets, objectives, goals) and its policy measures (regulations, plans, information, taxes, organisational committees) — and are the measures commensurate with the objectives?',
    framework: 'Policy decomposition + goals/means congruence (Howlett & Rayner 2007)',
    basis: 'mixed',
    method:
      'The act is decomposed into objectives and measures, each tagged to a climate dimension. Measures-side congruence is derived, not re-assessed: the five means-side criteria of the objective–delivery checklist (instruments, coverage, enforcement, financing, timeline) roll into one score (met = 1, partial = ½, not-met = 0).',
  },
  {
    id: 'coherence',
    ordinal: 3,
    codeId: 'coh-horizontal',
    name: 'Coherence check',
    shortName: 'Coherence check',
    question:
      'Across mitigation, adaptation and the mitigation–adaptation interface: are the act’s objectives and measures aligned with the ambitions and with the rest of the space, or do they conflict?',
    framework: 'Seven-point goal-interaction scale (Nilsson et al. 2016; ICSU 2017)',
    basis: 'curated',
    method:
      'Per climate dimension: is the act aligned, in tension, or in conflict? Cross-policy interactions are scored −3 (cancelling) to +3 (indivisible), each with a named mechanism, climate dimension, and the legal provisions that create the interaction.',
  },
  {
    id: 'critical',
    ordinal: 4,
    codeId: 'coh-evaluation',
    name: 'Critical assessment',
    shortName: 'Critical assessment',
    question:
      'Why? Are these ambitious enough (fit for purpose), and what is the effect of the enablers and barriers?',
    framework: 'Distance-to-target pace ratio (EEA Trends & Projections) + enablers/barriers',
    basis: 'mixed',
    method:
      'Fit for purpose is read against the 2050 ambitions: observed recent pace ÷ required pace to target, computed in code (≥ 1.0 on track · ≥ 0.5 lagging · < 0.5 off track), alongside named enablers and barriers and the MRV/review machinery derived from the checklist.',
  },
];

export const COHERENCE_LENS_BY_ID: Record<CoherenceLensId, CoherenceLensMeta> =
  Object.fromEntries(COHERENCE_LENSES.map(s => [s.id, s])) as Record<
    CoherenceLensId,
    CoherenceLensMeta
  >;

/** Deprecated aliases (see {@link CoherenceLensId}). */
export const COHERENCE_STEPS = COHERENCE_LENSES;
export const COHERENCE_STEP_BY_ID = COHERENCE_LENS_BY_ID;
export type CoherenceStepMeta = CoherenceLensMeta;

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
      'The proposal slipped ~20 months past the H1 2024 deadline, but the target is now law: Reg. (EU) 2026/667 (in force 7 Apr 2026) sets −90% net by 2040 (≥85% domestic, ≤5 pp international credits from 2036) — adopted before the post-2030 sectoral files (ETS revision expected Jul 2026, ESR/LULUCF successors Q4 2026).',
    source: 'Reg. (EU) 2026/667 (OJ 18.3.2026); Commission 2026 work programme.',
    tier: 'A',
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
      'Stationary verified emissions fell a further 5.8% in 2024 to ~51% below 2005, below the cap path; TNAC remains within the MSR band; power-sector decarbonisation dominates the decline (2025 Carbon Market Report), with EUA prices ranging ~€60–92 through 2025–H1 2026.',
    source: 'EEA ETS data viewer; Commission 2025 Carbon Market Report (Dec 2025).',
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
      'ESR emissions were −19.8% vs 2005 by 2023 and virtually flat in 2024 — the first year aggregate emissions exceeded the EU-wide limit (+1.6%); projections deliver ~29.7% (existing) / ~38.1% (planned measures) against −40%; six Member States exceeded their 2023 allocations (HR, CY, DK, IE, IT, MT) and AT, EE, DE, IE, MT, SE project 2026–30 excesses, with DE and IE the largest gaps.',
    source: 'Climate Action Progress Report 2025 (COM(2025) 735); EEA Trends & Projections 2025.',
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
      'The reported net sink was −198 Mt in 2023 (2025 inventory submission) with a ~−212 Mt proxy for 2024 — a persistent ~100–112 Mt shortfall against the −310 Mt reference across multiple years; Member State projections indicate the 2030 target will be missed on current and planned measures.',
    source: 'EEA / UNFCCC EU GHG inventory (2025 submission); EEA approximated 2024 inventory.',
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
      'Share 25.2% in 2024, still trailing the linear path; final NECPs aggregate to ~42.6% — nominally meeting the target — but delivery lags: EU-27 wind additions ran ~15 GW in 2025 vs the ~37 GW/yr the NECPs imply, and solar additions declined for the first time since 2016.',
    source: 'Eurostat SHARES (2024); Commission final-NECP assessment (May 2025); WindEurope / SolarPower Europe.',
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
      'Final consumption rebounded in 2024 (+0.7% to 900 Mtoe — 18% above the 763 Mtoe cap) as crisis-era demand response unwound; NECP ambition aggregates to only ~8.1% vs the 11.7% required; data-centre demand (~70 TWh in 2024, ~3% of EU electricity) is projected to grow by roughly two-thirds by 2030 on IEA figures, with market estimates running to a doubling. One more rebound year triggers the violation criterion.',
    source: 'Eurostat energy balances (2024); Commission final-NECP assessment; Commission data-centre focus (Nov 2025).',
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
      'The definitive regime started on schedule on 1 Jan 2026 (first certificate price €75.36/t, Apr 2026); the CBAM Omnibus (Reg. (EU) 2025/2083) raised the de-minimis to 50 t — removing ~90% of declarants while keeping ~99% of embedded emissions; default values dominated transitional reports; a Dec 2025 proposal would extend scope to ~180 downstream products from 2028.',
    source: 'Reg. (EU) 2025/2083 (OJ 17.10.2025); Commission CBAM reports 2025–26.',
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
      'BEV share recovered to 17.4% in 2025 and 19.4% in Q1 2026 — but the 2025 step was converted into 2025–27 averaging (Reg. (EU) 2025/1214) and the advanced review proposed (Dec 2025) cutting the 2035 step from 100% to 90%: compliance relief is enacted in law and deeper relief is on the table.',
    source: 'ACEA registration statistics; Reg. (EU) 2025/1214 (OJ); COM automotive package (Dec 2025).',
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
      'The ETS2 start was postponed to 2028 in law — Reg. (EU) 2026/667 Art. 2 declares the Art. 30k postponement rules applicable, which arguably triggers the Fund’s own fallback clause cutting it to €54.6 bn (legally unsettled; Reg. 2026/667 is silent on the SCF); a Nov 2025 MSR proposal would double price-containment releases at the ~€45 trigger; plan approvals are far behind — Sweden (Dec 2025) and Lithuania (Jun 2026) only.',
    source: 'Reg. (EU) 2026/667 (OJ 18.3.2026); SCF Reg. Art. 10(1); Commission plan endorsements.',
    tier: 'A',
    status: 'violated',
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
      'First importer reports were filed by the 5 May 2025 deadline; sustained US pressure to soften LNG requirements (including unregistered EU–US talks revealed in 2026) has produced no equivalence refusal, waiver or amendment, and the act stayed out of the omnibus packages; the contractual MRV-equivalence cliff arrives 1 Jan 2027.',
    source: 'Commission implementation reports; press investigations (2026).',
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
      'Adopted by the narrowest margin; no dedicated EU restoration fund exists and the proposed 2028–34 MFF ring-fences none; the Dec 2025 mid-term review finds plan preparation “uneven and insufficient” across most Member States, with frontrunners (e.g. the German draft consultation, Apr–Jun 2026) the exception ahead of the 1 Sep 2026 deadline.',
    source: 'Commission; BirdLife/EEB mid-term assessment (Dec 2025).',
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
      'Enacted in two cuts: the “stop-the-clock” directive (Dir. (EU) 2025/794) deferred waves 2–3 by two years, and Omnibus I (Dir. (EU) 2026/470, in force 18 Mar 2026) raised the scope to undertakings with >1,000 employees AND >€450m turnover — removing the large majority of originally in-scope firms; remaining companies first report for FY2027.',
    source: 'Dir. (EU) 2025/794; Dir. (EU) 2026/470 (OJ 26.2.2026).',
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
      'Most 2023–24 updates were late; the final-NECP assessment (May 2025) finds renewables ambition nominally adequate (~42.6%) but an efficiency ambition gap (~8.1% vs 11.7%) and delivery gaps on both — the second consecutive cycle in which recommendations did not close the gaps.',
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
      'The Russian share fell from ~45% (2021) to 19% (2024) and ~13% (2025) after the end of Ukraine transit; storage targets were met every season; no rationing occurred; a stepwise import ban is now law (Reg. (EU) 2026/261: short-term LNG from Apr 2026, long-term contracts from 2027, pipeline by autumn 2027).',
    source: 'Eurostat; Commission REPowerEU roadmap; Reg. (EU) 2026/261 (OJ 2.2.2026).',
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
      'Core targets stand — now extended by the adopted 2040 target (Reg. 2026/667) — but the SUR was withdrawn, CSRD/CBAM/Taxonomy reporting was trimmed by Omnibus packages, EUDR and batteries duties were postponed, and the agenda was reframed around the Clean Industrial Deal and its Industrial Accelerator Act (Mar 2026).',
    source: 'Commission work programmes 2024–26; Omnibus packages 2025–26.',
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
      'The Jul 2025 simplification delegated act (in force since Jan 2026) cut reported datapoints by ~64% for non-financial undertakings (more for banks); separately, the Omnibus level-1 changes to the CSRD scope left alignment reporting voluntary below the new 1,000-employee/€450m threshold — mandatory only for the largest firms; gas/nuclear criteria litigation continues.',
    source: 'Taxonomy disclosures delegated act amendment (OJ 8.1.2026); Dir. (EU) 2026/470; CJEU docket.',
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
      'The 2024 amending regulation relaxed or deleted several GAEC obligations and exempted small farms (<10 ha) from conditionality controls — mid-period, in law; the Jul 2025 post-2027 proposal goes further, replacing GAEC standards with looser “farm stewardship” practices inside merged national plans.',
    source: 'Reg. (EU) 2024/1468 (OJ); COM CAP 2028–34 proposal (Jul 2025).',
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
  'deforestation-regulation': {
    policyId: 'deforestation-regulation',
    designYear: 2023,
    assumption:
      'The Art. 38 application dates hold: operators, the information system and country benchmarking are ready for the 30 December 2024 start.',
    signpost: 'Legal application dates in Art. 38; readiness of the IT system and benchmarking.',
    violationCriterion:
      'Violated if the application date is postponed in law; under pressure while readiness gaps are flagged without a legal change.',
    observation:
      'Postponed twice in law: Reg. (EU) 2024/3234 moved the start to 30 Dec 2025, and Reg. (EU) 2025/2650 (OJ 23.12.2025) to 30 Dec 2026 (micro/small: 30 Jun 2027), adding one-off simplified declarations for small low-risk operators; the proposed “no-risk” country tier was rejected, keeping the three-tier benchmarking.',
    source: 'Reg. (EU) 2024/3234; Reg. (EU) 2025/2650 (OJ).',
    tier: 'A',
    status: 'violated',
  },
  'batteries-regulation': {
    policyId: 'batteries-regulation',
    designYear: 2023,
    assumption:
      'The staged obligations are deliverable on schedule: carbon-footprint delegated acts arrive in time for the Feb 2025 EV-battery declaration, and due-diligence systems (incl. notified bodies) stand up by Aug 2025.',
    signpost: 'Adoption dates of the Art. 7 delegated/implementing acts; legal status of the Art. 48 ff. due-diligence application date.',
    violationCriterion:
      'Violated if obligations are deferred in law or the enabling delegated acts are still missing past the dates they gate; under pressure while individual acts slip.',
    observation:
      'Both failed: Reg. (EU) 2025/1561 (Omnibus IV) postponed due-diligence duties from Aug 2025 to Aug 2027 after ~half of Member States had designated no notified body, and the carbon-footprint methodology acts remained unadopted by mid-2026, de-facto suspending the declaration dates that are defined relative to them.',
    source: 'Reg. (EU) 2025/1561 (OJ 30.7.2025); JRC CFB methodology status.',
    tier: 'A',
    status: 'violated',
  },
  'industrial-emissions-directive': {
    policyId: 'industrial-emissions-directive',
    designYear: 2024,
    assumption:
      'Member States transpose IED 2.0 by 1 July 2026 and permit-writers operationalise the new strictest-end BAT-AEL discipline.',
    signpost: 'National transposition status vs the 1 Jul 2026 deadline; Commission transformation-plan format act (due 30 Jun 2026); INCITE output.',
    violationCriterion:
      'Violated if transposition broadly fails after the deadline; under pressure while national drafts lag pre-deadline.',
    observation:
      'Weeks before the deadline, national transposition is partial (e.g. the German draft has circulated since Nov 2024 without adoption); the Commission’s INCITE innovation centre is operational and published its first techniques report in May 2026; infringements after July 2026 are widely expected.',
    source: 'Commission IED 2.0 implementation page; national legislative trackers.',
    tier: 'B',
    status: 'under-pressure',
  },
  'ten-t-regulation': {
    policyId: 'ten-t-regulation',
    designYear: 2024,
    assumption:
      'The core network — and the ERTMS and alternative-fuels infrastructure indexed to it — is completed by the binding 2030 deadline.',
    signpost: 'ECA / Commission completion assessments; ERTMS deployment share; flagship cross-border project schedules.',
    violationCriterion:
      'Violated if an official audit or assessment concludes the 2030 core-network deadline will not be met, or flagship delays grow rather than shrink.',
    observation:
      'The ECA concluded in Jan 2026 that the 2030 core-network completion “will not be met” — five flagship cross-border projects average 17 years’ delay (up from 11 in 2020) with costs +24% since 2020; ETCS covers only ~10% of the network (end-2024), far behind the deployment targets.',
    source: 'ECA special report (Jan 2026); Third ERTMS Work Plan (Feb 2026).',
    tier: 'B',
    status: 'violated',
  },
  'ecodesign-sustainable-products': {
    policyId: 'ecodesign-sustainable-products',
    designYear: 2024,
    assumption:
      'The delegated-act pipeline and Digital Product Passport infrastructure are delivered on the 2025–2030 working-plan schedule.',
    signpost: 'Working-plan adoption; dates of the first product delegated acts (iron & steel 2026; textiles, tyres, aluminium 2027); DPP registry readiness.',
    violationCriterion:
      'Violated if the working plan is abandoned or first delegated acts are deferred in law; under pressure if they slip past their indicative years.',
    observation:
      'The first working plan was adopted on schedule (Apr 2025: textiles, furniture, mattresses, tyres, iron & steel, aluminium + horizontal repairability/recyclability); the first delegated acts and the DPP (mandatory ≥18 months after each act) are due from 2026–27 — the schedule is intact but the delivery test is still ahead.',
    source: 'ESPR Working Plan 2025–2030 (COM(2025) 187).',
    tier: 'B',
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
  /** Climate dimension the interaction sits on — the coherence-check lens it
   *  belongs to. Optional; defaults via {@link interactionDimension}. */
  dimension?: ClimateDimension;
  /** The goal at stake on each side, stated as the act states it. */
  goalA: string;
  goalB: string;
  /** The legal provisions that CREATE the interaction — the citable basis. */
  legalBasis: string;
  rationale: string;
  tier: EvidenceTier;
}

/** Acts whose objectives bear on the adaptation / resilience ambition, used
 *  to place an interaction (and a policy) on the climate-dimension axis. */
const ADAPTATION_LEANING_POLICIES = new Set<string>([
  'lulucf-regulation',
  'nature-restoration-law',
  'water-framework-directive',
  'marine-strategy-framework-directive',
  'cap-strategic-plans',
  'farm-to-fork-strategy',
  'forest-strategy',
]);

/** The climate dimension a goal interaction sits on (the coherence-check
 *  lens): mitigation by default; the mitigation–adaptation interface when one
 *  side is land/water/nature (where adaptation and mitigation goals meet). */
export function interactionDimension(i: GoalInteraction): ClimateDimension {
  if (i.dimension) return i.dimension;
  if (ADAPTATION_LEANING_POLICIES.has(i.a) || ADAPTATION_LEANING_POLICIES.has(i.b)) {
    return 'mitigation-adaptation';
  }
  return 'mitigation';
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
      'Complementary coverage partitions the economy into two calibrated halves of the −55% objective, with ETS2 designed to bridge the buildings/road seam between them — now from 2028, after Reg. (EU) 2026/667 postponed its start by a year.',
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
    id: 'coh-int-eudr-cap',
    a: 'deforestation-regulation',
    b: 'cap-strategic-plans',
    score: -1,
    mechanism: 'regulatory dependency',
    goalA: 'Deforestation-free supply chains for cattle, soy, cocoa, palm oil, coffee, rubber and wood',
    goalB: 'Stabilise farm incomes, including import-fed livestock systems',
    legalBasis: 'EUDR Arts. 1, 3 + Annex I (soy/cattle in scope); CAP SP Reg. Arts. 32–34 (coupled support); Regs. 2024/3234 + 2025/2650 (postponements).',
    rationale:
      'EU livestock that CAP coupled support stabilises runs on imported feed soy the EUDR disciplines; the tension was resolved twice in agriculture’s favour — both postponements relieved exactly the supply chains the prohibition targets.',
    tier: 'A',
  },
  {
    id: 'coh-int-batt-crma',
    a: 'batteries-regulation',
    b: 'critical-raw-materials-act',
    score: 2,
    mechanism: 'regulatory dependency',
    goalA: 'Recycled-content shares and recycling efficiencies for batteries',
    goalB: '25% of strategic raw-material consumption from Union recycling by 2030',
    legalBasis: 'Batteries Reg. Art. 8 (recycled content) + Annex XII (recycling efficiencies); CRMA Art. 5(1)(a)(iii).',
    rationale:
      'Battery recycled-content duties create the demand and the feedstock discipline the CRMA recycling benchmark needs — one circular loop written across two acts; the batteries-side delays (Reg. 2025/1561) now slow the loop’s front end.',
    tier: 'A',
  },
  {
    id: 'coh-int-cars-batteries',
    a: 'co2-cars-regulation',
    b: 'batteries-regulation',
    score: 1,
    mechanism: 'demand pull',
    goalA: '100% zero-emission new cars by 2035',
    goalB: 'Sustainable, low-carbon batteries with audited supply chains',
    legalBasis: 'CO₂ standards Reg. Art. 1(5a); Batteries Reg. Arts. 7–8 (carbon footprint, recycled content).',
    rationale:
      'The ZEV mandate creates the battery fleet whose footprint and supply chains the Batteries Regulation governs; the pairing only delivers clean electrification if the batteries-side machinery (delegated acts, due diligence) actually arrives.',
    tier: 'B',
  },
  {
    id: 'coh-int-ied-ets',
    a: 'industrial-emissions-directive',
    b: 'eu-ets-directive',
    score: 0,
    mechanism: 'regulatory dependency',
    goalA: 'Integrated prevention of industrial pollution via BAT-based permits',
    goalB: 'Cost-effective GHG abatement via the carbon price',
    legalBasis: 'IED Art. 9(1) (no ELVs for direct GHG emissions of ETS activities); ETS Dir. Annex I.',
    rationale:
      'A deliberate demarcation rather than an interaction: IED permits may not set limit values for ETS-covered greenhouse gases, routing GHG abatement through the price signal while the permit handles pollutants — coherence by design, kept in the 2024 recast.',
    tier: 'A',
  },
  {
    id: 'coh-int-tent-afir',
    a: 'ten-t-regulation',
    b: 'afir-regulation',
    score: 2,
    mechanism: 'regulatory dependency',
    goalA: 'Core transport network completed by 2030',
    goalB: 'Charging and refuelling coverage along that same network',
    legalBasis: 'AFIR Arts. 3–6 (targets defined on the TEN-T core/comprehensive network); TEN-T Reg. 2024/1679 (network definition, 2030 core deadline).',
    rationale:
      'AFIR’s coverage duties are written onto the TEN-T map, so the two ratchet together — and TEN-T slippage (ECA: 2030 core completion will not be met) propagates directly into where and when the charging obligations bind.',
    tier: 'B',
  },
  {
    id: 'coh-int-espr-nzia',
    a: 'ecodesign-sustainable-products',
    b: 'net-zero-industry-act',
    score: 1,
    mechanism: 'demand pull',
    goalA: 'Ecodesign requirements and green public procurement for steel, aluminium and other priority products',
    goalB: '40% domestic cleantech manufacturing by 2030',
    legalBasis: 'ESPR Arts. 1, 4 + Working Plan 2025–30 (iron & steel DA 2026, aluminium 2027); NZIA Art. 5 + Art. 25 (procurement resilience criteria).',
    rationale:
      'ESPR product requirements and mandatory green procurement build the lead markets for exactly the energy-intensive materials and technologies the NZIA wants made in Europe — demand-side conditions for the supply-side benchmark.',
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
    recent: { year: 2018, value: 78 },
    latest: { year: 2024, value: 63 },
    target: { year: 2030, value: 45 },
    policyChange:
      'The Fit-for-55 acts the law required were essentially all adopted; the mandated 2040-target proposal slipped ~20 months past its deadline but was enacted as Reg. (EU) 2026/667 (−90% net by 2040, ≥85% domestic, ≤5 pp international credits from 2036) — a ratchet, late.',
    source: 'EEA GHG inventory; Reg. (EU) 2026/667 (OJ).',
    tier: 'A',
    notes:
      '2024 is provisional (−37.2%, virtually flat vs 2023); recent pace includes the COVID dip and rebound. EEA T&P 2025 projects −47% by 2030 with existing measures, −54% with additional measures — just short of −55%.',
  },
  'eu-ets-directive': {
    policyId: 'eu-ets-directive',
    indicator: 'Verified stationary ETS emissions (index, 2005 = 100)',
    unit: 'index',
    baseline: { year: 2005, value: 100 },
    recent: { year: 2019, value: 65 },
    latest: { year: 2024, value: 49 },
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
    recent: { year: 2019, value: 90 },
    latest: { year: 2024, value: 80 },
    target: { year: 2030, value: 60 },
    policyChange: 'Ratcheted from −30% to −40% by Reg. 2023/857; compliance machinery unchanged.',
    source: 'EEA Trends & Projections 2025; EU GHG inventory.',
    tier: 'A',
    notes: '2024 value is provisional — emissions were virtually flat vs 2023.',
  },
  'lulucf-regulation': {
    policyId: 'lulucf-regulation',
    indicator: 'Net LULUCF sink',
    unit: 'Mt CO₂eq (negative = removals)',
    baseline: { year: 2015, value: -310 },
    recent: { year: 2019, value: -249 },
    latest: { year: 2024, value: -212 },
    target: { year: 2030, value: -310 },
    policyChange: 'The 2023 amendment set the 310 Mt 2030 target with per-MS contributions in Annex IIa.',
    source: 'EEA / UNFCCC EU GHG inventory (2025 submission); EEA approximated 2024 inventory.',
    tier: 'A',
    notes: 'LULUCF inventories carry high uncertainty and recurrent revisions; the 2024 value is the EEA proxy.',
  },
  'renewable-energy-directive': {
    policyId: 'renewable-energy-directive',
    indicator: 'Renewables share of gross final energy consumption',
    unit: '%',
    baseline: { year: 2020, value: 22.1 },
    recent: { year: 2019, value: 19.9 },
    latest: { year: 2024, value: 25.2 },
    target: { year: 2030, value: 42.5 },
    policyChange: 'RED III raised the binding target to 42.5% and added permitting acceleration (2023).',
    source: 'Eurostat SHARES (2024 release).',
    tier: 'A',
  },
  'energy-efficiency-directive': {
    policyId: 'energy-efficiency-directive',
    indicator: 'Final energy consumption',
    unit: 'Mtoe',
    baseline: { year: 2020, value: 907 },
    recent: { year: 2019, value: 984 },
    latest: { year: 2024, value: 900 },
    target: { year: 2030, value: 763 },
    policyChange: 'The 2023 recast made −11.7% binding and stepped up the savings obligation.',
    source: 'Eurostat energy balances (2024); EEA Trends & Projections.',
    tier: 'A',
    notes: 'Consumption rebounded +0.7% in 2024 as crisis-era demand response unwound.',
  },
  'co2-cars-regulation': {
    policyId: 'co2-cars-regulation',
    indicator: 'New-car fleet average CO₂ (WLTP)',
    unit: 'g CO₂/km',
    baseline: { year: 2021, value: 114 },
    recent: { year: 2021, value: 114 },
    latest: { year: 2024, value: 106.8 },
    target: { year: 2030, value: 51 },
    policyChange:
      'The 2025 step was converted into 2025–27 averaging (Reg. 2025/1214) and the advanced review proposed cutting the 2035 step to 90% (Dec 2025, in negotiation) — the act was weakened at first market contact, with deeper relief on the table.',
    source: 'EEA new-vehicle CO₂ monitoring; Reg. (EU) 2025/1214 (OJ).',
    tier: 'A',
    notes:
      'WLTP series starts 2021, so the recent window equals the baseline window; 2024 ticked UP from 106.4 g/km in 2023 — the first reversal of the series.',
  },
  'farm-to-fork-strategy': {
    policyId: 'farm-to-fork-strategy',
    indicator: 'Organic share of utilised agricultural area',
    unit: '%',
    baseline: { year: 2020, value: 9.1 },
    recent: { year: 2018, value: 8.0 },
    latest: { year: 2023, value: 10.8 },
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
    latest: { year: 2025, value: 13 },
    target: { year: 2027, value: 0 },
    policyChange:
      'Emergency regulations (storage, demand reduction, permitting) were adopted and largely sunset as designed; the phase-out is now law — Reg. (EU) 2026/261 bans remaining imports stepwise through 2027.',
    source: 'Eurostat; Commission REPowerEU roadmap; Reg. (EU) 2026/261 (OJ).',
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

// ── Lens 2 · Objectives & measures (the decomposition) ─────────────────────
// Each act is laid out as the worked method does: its policy OBJECTIVES
// (visions / targets / objectives / goals) and its policy MEASURES
// (regulations / plans / information / taxes / organisational committees),
// every item tagged to a climate dimension. The LULUCF entry reproduces the
// worked example exactly.

export type ObjectiveKind = 'vision' | 'target' | 'objective' | 'goal';
export type MeasureKind =
  | 'regulation'
  | 'plan'
  | 'information'
  | 'tax'
  | 'organisational';

export const OBJECTIVE_KIND_LABEL: Record<ObjectiveKind, string> = {
  vision: 'Vision',
  target: 'Target',
  objective: 'Objective',
  goal: 'Goal',
};

export const MEASURE_KIND_LABEL: Record<MeasureKind, string> = {
  regulation: 'Regulation',
  plan: 'Plan / programme',
  information: 'Information',
  tax: 'Tax',
  organisational: 'Organisational committee',
};

export interface PolicyObjective {
  kind: ObjectiveKind;
  text: string;
  dimension: ClimateDimension;
}

export interface PolicyMeasure {
  kind: MeasureKind;
  text: string;
  dimension: ClimateDimension;
}

export interface PolicyDecomposition {
  policyId: string;
  /** Overarching ambitions the act serves. */
  ambitions: OverarchingAmbitionId[];
  objectives: PolicyObjective[];
  measures: PolicyMeasure[];
}

const M: ClimateDimension = 'mitigation';
const A: ClimateDimension = 'adaptation';
const MA: ClimateDimension = 'mitigation-adaptation';

export const POLICY_DECOMPOSITIONS: Record<string, PolicyDecomposition> = {
  // The worked example, verbatim from the method slide.
  'lulucf-regulation': {
    policyId: 'lulucf-regulation',
    ambitions: ['neutrality-2050', 'resilience-2050'],
    objectives: [
      { kind: 'target', text: 'Net carbon-removal targets (310 Mt CO₂eq by 2030)', dimension: M },
      { kind: 'objective', text: 'Emission reduction and the "no-debit rule"', dimension: M },
      { kind: 'objective', text: 'Sustainable land management', dimension: MA },
      { kind: 'objective', text: 'Monitoring, reporting and verification', dimension: M },
      { kind: 'objective', text: 'Flexibility mechanisms', dimension: M },
      { kind: 'goal', text: 'Resilience to natural disturbances', dimension: A },
    ],
    measures: [
      { kind: 'regulation', text: 'Binding national targets', dimension: M },
      { kind: 'regulation', text: 'Flexibility mechanisms', dimension: M },
      { kind: 'information', text: 'Accounting rules (e.g. Union registry)', dimension: M },
      {
        kind: 'organisational',
        text: 'Mandate to integrate national strategic plans under the CAP',
        dimension: MA,
      },
    ],
  },
  'eu-climate-law': {
    policyId: 'eu-climate-law',
    ambitions: ['neutrality-2050', 'resilience-2050'],
    objectives: [
      { kind: 'vision', text: 'Climate neutrality across the Union by 2050', dimension: M },
      { kind: 'target', text: 'Net −55% GHG by 2030; −90% net by 2040', dimension: M },
      { kind: 'goal', text: 'Continuous progress on adaptive capacity and resilience', dimension: A },
      { kind: 'objective', text: 'Negative emissions after 2050', dimension: M },
    ],
    measures: [
      { kind: 'regulation', text: 'Legally binding economy-wide targets and a 2040 ratchet clause', dimension: M },
      { kind: 'organisational', text: 'European Scientific Advisory Board on Climate Change', dimension: MA },
      { kind: 'information', text: 'Five-yearly assessment of progress and of national measures', dimension: MA },
      { kind: 'plan', text: 'Indicative GHG budget for 2030–2050', dimension: M },
    ],
  },
  'eu-ets-directive': {
    policyId: 'eu-ets-directive',
    ambitions: ['neutrality-2050'],
    objectives: [
      { kind: 'target', text: '−62% in ETS sectors by 2030 vs 2005', dimension: M },
      { kind: 'objective', text: 'A declining, economy-wide carbon price signal', dimension: M },
      { kind: 'objective', text: 'Prevent carbon leakage during decarbonisation', dimension: M },
    ],
    measures: [
      { kind: 'regulation', text: 'Cap-and-trade with a linear reduction factor (4.3/4.4%)', dimension: M },
      { kind: 'tax', text: 'Auctioning of allowances; free-allocation phase-out to 2034', dimension: M },
      { kind: 'plan', text: 'Innovation and Modernisation Funds', dimension: M },
      { kind: 'information', text: 'MRV of installation emissions; Union Registry', dimension: M },
    ],
  },
  'effort-sharing-regulation': {
    policyId: 'effort-sharing-regulation',
    ambitions: ['neutrality-2050'],
    objectives: [
      { kind: 'target', text: '−40% in non-ETS sectors by 2030 vs 2005', dimension: M },
      { kind: 'objective', text: 'Binding annual national emission allocations', dimension: M },
    ],
    measures: [
      { kind: 'regulation', text: 'Binding national targets with annual budgets', dimension: M },
      { kind: 'regulation', text: 'Two-way flexibilities (banking, borrowing, LULUCF, ETS)', dimension: M },
      { kind: 'information', text: 'Annual compliance check against allocated budgets', dimension: M },
    ],
  },
  'renewable-energy-directive': {
    policyId: 'renewable-energy-directive',
    ambitions: ['neutrality-2050'],
    objectives: [
      { kind: 'target', text: '42.5% renewables in gross final energy by 2030', dimension: M },
      { kind: 'objective', text: 'Sustainable bioenergy and renewable hydrogen ramp-up', dimension: M },
    ],
    measures: [
      { kind: 'regulation', text: 'Binding Union target with national contributions', dimension: M },
      { kind: 'regulation', text: 'Permitting acceleration and go-to areas', dimension: M },
      { kind: 'information', text: 'Sustainability and GHG-saving criteria for biomass', dimension: MA },
    ],
  },
  'energy-efficiency-directive': {
    policyId: 'energy-efficiency-directive',
    ambitions: ['neutrality-2050'],
    objectives: [
      { kind: 'target', text: '−11.7% final energy consumption by 2030', dimension: M },
      { kind: 'objective', text: 'Energy-efficiency-first across the energy system', dimension: M },
    ],
    measures: [
      { kind: 'regulation', text: 'Binding consumption ceiling and annual savings obligation', dimension: M },
      { kind: 'organisational', text: 'Public-sector renovation and exemplary-role duties', dimension: M },
      { kind: 'information', text: 'Energy audits and management systems', dimension: M },
    ],
  },
  'cbam-regulation': {
    policyId: 'cbam-regulation',
    ambitions: ['neutrality-2050'],
    objectives: [
      { kind: 'objective', text: 'Equalise the carbon price on imports and EU production', dimension: M },
      { kind: 'goal', text: 'Prevent carbon leakage as free allocation phases out', dimension: M },
    ],
    measures: [
      { kind: 'tax', text: 'Carbon border levy on embedded emissions of imports', dimension: M },
      { kind: 'information', text: 'Embedded-emissions reporting and verification', dimension: M },
      { kind: 'organisational', text: 'CBAM authority and registry of declarants', dimension: M },
    ],
  },
  'co2-cars-regulation': {
    policyId: 'co2-cars-regulation',
    ambitions: ['neutrality-2050'],
    objectives: [
      { kind: 'target', text: '100% zero-emission new cars and vans by 2035', dimension: M },
      { kind: 'objective', text: 'Falling fleet-average CO₂ on the way there', dimension: M },
    ],
    measures: [
      { kind: 'regulation', text: 'Binding fleet-average CO₂ standards with penalties', dimension: M },
      { kind: 'information', text: 'Real-world CO₂ and energy-consumption monitoring', dimension: M },
      { kind: 'plan', text: 'Advanced review clause on the 2035 step', dimension: M },
    ],
  },
  'epbd-recast': {
    policyId: 'epbd-recast',
    ambitions: ['neutrality-2050', 'resilience-2050'],
    objectives: [
      { kind: 'vision', text: 'A zero-emission building stock by 2050', dimension: M },
      { kind: 'target', text: 'Zero-emission new buildings; worst-stock renovation', dimension: M },
      { kind: 'goal', text: 'Healthy indoor climate and overheating resilience', dimension: A },
    ],
    measures: [
      { kind: 'regulation', text: 'Minimum energy-performance standards and ZEB definition', dimension: M },
      { kind: 'plan', text: 'National building-renovation plans', dimension: M },
      { kind: 'information', text: 'Energy-performance certificates and renovation passports', dimension: M },
    ],
  },
  'nature-restoration-law': {
    policyId: 'nature-restoration-law',
    ambitions: ['resilience-2050', 'neutrality-2050'],
    objectives: [
      { kind: 'target', text: 'Restoration measures on 20% of land and sea by 2030', dimension: MA },
      { kind: 'goal', text: 'Rewetted peatlands and restored carbon-rich ecosystems', dimension: MA },
      { kind: 'goal', text: 'Ecosystem-based resilience to climate impacts', dimension: A },
    ],
    measures: [
      { kind: 'regulation', text: 'Binding restoration targets per ecosystem type', dimension: MA },
      { kind: 'plan', text: 'National restoration plans', dimension: MA },
      { kind: 'information', text: 'Monitoring of ecosystem condition and trends', dimension: A },
    ],
  },
  'cap-strategic-plans': {
    policyId: 'cap-strategic-plans',
    ambitions: ['neutrality-2050', 'resilience-2050'],
    objectives: [
      { kind: 'objective', text: 'Climate action and sustainable land/natural-resource management', dimension: MA },
      { kind: 'goal', text: 'Resilient farm incomes and landscapes', dimension: A },
    ],
    measures: [
      { kind: 'tax', text: 'Conditionality and eco-scheme payments', dimension: MA },
      { kind: 'plan', text: 'National CAP strategic plans', dimension: MA },
      { kind: 'organisational', text: 'Managing authorities and monitoring committees', dimension: MA },
    ],
  },
};

/** The curated decomposition for an act, or null when none is authored. */
export function decompositionFor(policyId: string): PolicyDecomposition | null {
  return POLICY_DECOMPOSITIONS[policyId] ?? null;
}

/** Climate dimensions an act acts on, taken from its decomposition (falling
 *  back to the dimensions of its scored interactions, else mitigation). */
export function policyDimensions(policyId: string): ClimateDimension[] {
  const d = POLICY_DECOMPOSITIONS[policyId];
  const set = new Set<ClimateDimension>();
  if (d) {
    for (const o of d.objectives) set.add(o.dimension);
    for (const m of d.measures) set.add(m.dimension);
  }
  if (set.size === 0) {
    for (const i of interactionsFor(policyId)) set.add(interactionDimension(i));
  }
  if (set.size === 0) set.add('mitigation');
  return CLIMATE_DIMENSIONS.map(x => x.id).filter(id => set.has(id));
}

// ── Lens 4 · Critical assessment (fit for purpose, enablers, barriers) ─────
// "Why? Are these ambitious enough (fit for purpose)? What is the effect of
// the enablers/barriers?" — a curated reading anchored in the measured pace.

export type FitVerdict = 'fit' | 'partial' | 'unfit' | 'not-assessed';

export const FIT_VERDICT_LABEL: Record<FitVerdict, string> = {
  fit: 'Fit for purpose',
  partial: 'Partly fit',
  unfit: 'Not fit for purpose',
  'not-assessed': 'Not assessed',
};

export interface CriticalAssessment {
  policyId: string;
  /** Ambition / fit-for-purpose verdict against the 2050 ambitions. */
  fit: FitVerdict;
  /** Why — the one-paragraph critical reading. */
  rationale: string;
  /** What helps delivery. */
  enablers: string[];
  /** What blocks delivery. */
  barriers: string[];
}

export const CRITICAL_ASSESSMENTS: Record<string, CriticalAssessment> = {
  'eu-climate-law': {
    policyId: 'eu-climate-law',
    fit: 'partial',
    rationale:
      'The architecture is fit for purpose — binding targets, a ratchet clause, an independent advisory board — but ambition delivery lags: with existing measures the EU tracks to ~−47% by 2030 (EEA T&P 2025), short of −55%, and the 2040-target proposal slipped ~20 months before adoption.',
    enablers: [
      'Independent scientific advisory board (this Board) with a statutory advisory role',
      'Five-yearly progress and consistency assessments that this lens operationalises',
    ],
    barriers: [
      'No binding intermediate enforcement between the 2030 and 2040 milestones',
      'Implementation gap concentrated in transport, buildings and the land sink',
    ],
  },
  'eu-ets-directive': {
    policyId: 'eu-ets-directive',
    fit: 'fit',
    rationale:
      'The strongest single instrument in the space: the cap is on a measured downward trajectory ahead of its 2030 line, the price signal is real, and CBAM lets free allocation phase out without exporting the industrial base.',
    enablers: [
      'A hard, declining cap with auctioning revenues recycled into the Innovation/Modernisation Funds',
      'CBAM closing the leakage flank as free allocation ends',
    ],
    barriers: [
      'Part of the recent fall is crisis-driven output decline, not structural abatement',
      'ETS2 for buildings/road transport postponed to 2028, deferring the price signal where it is hardest',
    ],
  },
  'effort-sharing-regulation': {
    policyId: 'effort-sharing-regulation',
    fit: 'partial',
    rationale:
      'Ambition was ratcheted to −40% but the sectors it governs — transport, buildings, agriculture, small industry — are the slowest-moving, and the LULUCF/ETS flexibilities can let land credits substitute for real non-ETS cuts.',
    enablers: ['Binding annual national budgets with a transparent compliance check'],
    barriers: [
      'Two-way flexibilities soften the effective target',
      'Delivery depends on national measures the ESR itself does not provide',
    ],
  },
  'lulucf-regulation': {
    policyId: 'lulucf-regulation',
    fit: 'unfit',
    rationale:
      'Ambition rose (a 310 Mt sink by 2030) exactly as the measured sink shrank — net removals fell from ~310 Mt (2015) to ~212 Mt (2024). The objectives are sound but the means do not yet bend the trajectory, and bioenergy demand rewarded elsewhere harvests the sink LULUCF needs standing.',
    enablers: [
      'Binding per-Member-State 2030 contributions in Annex IIa',
      'CAP strategic plans as a delivery channel for land measures',
    ],
    barriers: [
      'A declining sink under climate and harvest pressure (the resilience-to-disturbances goal is itself at risk)',
      'RED biomass incentives pulling against the no-debit rule',
      'High inventory uncertainty masking whether measures are working',
    ],
  },
  'renewable-energy-directive': {
    policyId: 'renewable-energy-directive',
    fit: 'fit',
    rationale:
      'Deployment is broadly on pace toward 42.5% and the permitting reforms attack the binding constraint; the main coherence risk is on the bioenergy flank, where the sustainability criteria meet the land sink.',
    enablers: ['Permitting acceleration and go-to areas', 'A binding, ratcheted Union target'],
    barriers: ['Grid and storage build-out lagging deployment', 'Primary-biomass demand in tension with LULUCF'],
  },
  'energy-efficiency-directive': {
    policyId: 'energy-efficiency-directive',
    fit: 'partial',
    rationale:
      'The −11.7% ceiling is now binding, but consumption rebounded in 2024 as crisis-era demand response unwound, so the measured pace is only lagging — the savings obligation has to do more work than it has so far.',
    enablers: ['A binding consumption ceiling and a stepped-up savings obligation'],
    barriers: ['Rebound as energy prices normalise', 'Split incentives in buildings and SMEs'],
  },
  'co2-cars-regulation': {
    policyId: 'co2-cars-regulation',
    fit: 'partial',
    rationale:
      'The 2035 ZEV endpoint is the clearest signal in transport, but the act was weakened at first market contact — the 2025 step became 2025–27 averaging and an advanced review proposes cutting the 2035 step to 90%. Fleet CO₂ even ticked up in 2024.',
    enablers: ['A clear 2035 endpoint paired with AFIR infrastructure roll-out'],
    barriers: ['Post-adoption softening of the interim steps', 'Charging build-out uneven across Member States'],
  },
  'farm-to-fork-strategy': {
    policyId: 'farm-to-fork-strategy',
    fit: 'unfit',
    rationale:
      'Measured policy change is negative: the headline instruments lost their legal vehicles — the SUR was withdrawn and the framework law never tabled — so the 25%-organic and pesticide ambitions now ride on voluntary CAP measures alone.',
    enablers: ['Organic-area momentum where CAP eco-schemes reward it'],
    barriers: ['Withdrawn/parked legislation', 'No binding instrument behind the targets'],
  },
  'repowereu-plan': {
    policyId: 'repowereu-plan',
    fit: 'fit',
    rationale:
      'A crisis plan that delivered: Russian gas fell from ~45% to ~13% of imports and the phase-out is now law (Reg. (EU) 2026/261). Coherence risk is that some emergency supply measures cut against the mitigation pathway.',
    enablers: ['Emergency regulations that largely sunset as designed', 'A binding legal phase-out through 2027'],
    barriers: ['New fossil-import infrastructure with lock-in risk', 'Speed-vs-decarbonisation tension in the response'],
  },
  'epbd-recast': {
    policyId: 'epbd-recast',
    fit: 'partial',
    rationale:
      'The zero-emission-stock vision is right and the instruments exist, but the binding bite was softened toward portfolio averages in negotiation, and renovation rates remain far below what 2050 requires.',
    enablers: ['National renovation plans and EPC infrastructure'],
    barriers: ['Weakened minimum standards', 'Financing and split-incentive barriers in worst-performing stock'],
  },
};

export function criticalAssessmentFor(policyId: string): CriticalAssessment | null {
  return CRITICAL_ASSESSMENTS[policyId] ?? null;
}

// ── Lens 3 · Coherence check (per climate dimension) ───────────────────────

export type CheckVerdict = 'aligned' | 'tension' | 'conflict' | 'not-assessed';

export const CHECK_VERDICT_LABEL: Record<CheckVerdict, string> = {
  aligned: 'Aligned',
  tension: 'In tension',
  conflict: 'Conflicting',
  'not-assessed': 'Not assessed',
};

export interface DimensionCheck {
  dimension: ClimateDimension;
  /** Does the act act on this dimension at all? */
  present: boolean;
  /** Aligned, in tension, or conflicting on this dimension. */
  verdict: CheckVerdict;
  /** Cross-policy interactions on this dimension that touch the act. */
  interactions: GoalInteraction[];
}

/** The coherence check for one act: a verdict per climate dimension. The
 *  worst interaction on a dimension sets its verdict (≤ −2 conflict, −1
 *  tension, ≥ 0 aligned); a dimension the act acts on but has no scored
 *  conflict on reads aligned. */
export function coherenceCheck(policyId: string): DimensionCheck[] {
  const dims = new Set(policyDimensions(policyId));
  const acts = interactionsFor(policyId);
  return CLIMATE_DIMENSIONS.map(meta => {
    const onDim = acts.filter(i => interactionDimension(i) === meta.id);
    const present = dims.has(meta.id) || onDim.length > 0;
    let verdict: CheckVerdict = present ? 'aligned' : 'not-assessed';
    if (onDim.length > 0) {
      const worst = Math.min(...onDim.map(i => i.score));
      verdict = worst <= -2 ? 'conflict' : worst === -1 ? 'tension' : 'aligned';
    }
    return { dimension: meta.id, present, verdict, interactions: onDim };
  });
}

// ── Per-policy roll-up + corpus overview ───────────────────────────────────

const STATUS_GRADE: Record<AssumptionStatus, CoherenceGrade> = {
  valid: 'coherent',
  'under-pressure': 'partial',
  violated: 'incoherent',
};

const FIT_GRADE: Record<FitVerdict, CoherenceGrade> = {
  fit: 'coherent',
  partial: 'partial',
  unfit: 'incoherent',
  'not-assessed': 'not-assessed',
};

export interface PolicyCoherenceProfile {
  policyId: string;
  /** Lens 1 — overarching-ambitions / assumption audit. */
  exAnte: ExAnteAssessment | null;
  ambitions: OverarchingAmbitionId[];
  /** Lens 2 — objectives & measures. */
  decomposition: PolicyDecomposition | null;
  means: DerivedStepResult;
  /** Lens 3 — coherence check. */
  interactions: GoalInteraction[];
  dimensions: DimensionCheck[];
  dimensionSet: ClimateDimension[];
  /** Lens 4 — critical assessment + measured pace. */
  evaluation: EvaluationResult;
  critical: CriticalAssessment | null;
  lensGrades: Record<CoherenceLensId, CoherenceGrade>;
  /** Deprecated alias of {@link lensGrades}. */
  stepGrades: Record<CoherenceLensId, CoherenceGrade>;
  /** Worst assessed lens — coherence is a weakest-link property. */
  overall: CoherenceGrade;
  /** Number of lenses with an assessment (0–4). */
  assessedLenses: number;
  /** Deprecated alias of {@link assessedLenses}. */
  assessedSteps: number;
}

const GRADE_RANK: Record<CoherenceGrade, number> = {
  incoherent: 0,
  partial: 1,
  coherent: 2,
  'not-assessed': 3,
};

/** Coherence-check rollup rule (declared): grade = the policy's worst
 *  interaction score, mapped ≤ −2 → incoherent, −1 → partial, ≥ 0 →
 *  coherent. */
function coherenceGrade(interactions: GoalInteraction[]): CoherenceGrade {
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
  const decomposition = decompositionFor(policyId);
  const interactions = interactionsFor(policyId);
  const means = meansCoherence(policyId);
  const evaluation = evaluationCoherence(policyId);
  const critical = criticalAssessmentFor(policyId);
  const dimensions = coherenceCheck(policyId);

  // Lens 1 (ambitions): the assumption audit when present, else the act's
  // declared ambition links carry a neutral signal.
  const ambitionGrade: CoherenceGrade = exAnte
    ? STATUS_GRADE[exAnte.status]
    : decomposition
      ? 'coherent'
      : 'not-assessed';
  // Lens 4 (critical): the curated fit verdict trumps the bare pace reading
  // when authored; otherwise the measured/derived evaluation grade stands.
  const criticalGrade: CoherenceGrade = critical ? FIT_GRADE[critical.fit] : evaluation.grade;

  const lensGrades: Record<CoherenceLensId, CoherenceGrade> = {
    ambitions: ambitionGrade,
    decomposition: means.grade,
    coherence: coherenceGrade(interactions),
    critical: criticalGrade,
  };

  const assessed = (Object.values(lensGrades) as CoherenceGrade[]).filter(
    g => g !== 'not-assessed',
  );
  const overall: CoherenceGrade =
    assessed.length === 0
      ? 'not-assessed'
      : assessed.reduce((worst, g) => (GRADE_RANK[g] < GRADE_RANK[worst] ? g : worst));

  return {
    policyId,
    exAnte,
    ambitions: decomposition?.ambitions ?? (exAnte ? ['neutrality-2050'] : []),
    decomposition,
    means,
    interactions,
    dimensions,
    dimensionSet: policyDimensions(policyId),
    evaluation,
    critical,
    lensGrades,
    stepGrades: lensGrades,
    overall,
    assessedLenses: assessed.length,
    assessedSteps: assessed.length,
  };
}

/** Policy ids with at least one coherence signal (any step assessed). */
export function coherenceAssessedIds(): string[] {
  const ids = new Set<string>([
    ...Object.keys(EX_ANTE_ASSESSMENTS),
    ...Object.keys(OUTCOME_MEASUREMENTS),
    ...Object.keys(POLICY_DECOMPOSITIONS),
    ...Object.keys(CRITICAL_ASSESSMENTS),
    ...GOAL_INTERACTIONS.flatMap(i => [i.a, i.b]),
  ]);
  // Lenses 2 & 4 derive from the checklist, so every checklisted policy has
  // at least a measures-congruence + machinery assessment.
  for (const id of Object.keys(POLICY_OBJECTIVE_CHECKLISTS)) ids.add(id);
  return Array.from(ids);
}

export interface CoherenceOverview {
  profiles: PolicyCoherenceProfile[];
  /** Per-lens grade tallies across the scope. */
  lensCounts: Record<CoherenceLensId, Record<CoherenceGrade, number>>;
  /** Deprecated alias of {@link lensCounts}. */
  stepCounts: Record<CoherenceLensId, Record<CoherenceGrade, number>>;
  /** Interactions whose BOTH endpoints are in scope. */
  interactions: GoalInteraction[];
  /** Score ≤ −2 (counteracting / cancelling). */
  counteracting: number;
  /** Score = −1 (constraining). */
  constraining: number;
  /** Score ≥ +1 (enabling / reinforcing / indivisible). */
  positive: number;
  violatedAssumptions: number;
  /** Mean measures-congruence score across scope (lens 2); null if none. */
  meanMeansScore: number | null;
  outcomesOffTrack: number;
  /** Acts decomposed into objectives & measures. */
  decomposed: number;
  /** How many scoped acts touch each climate dimension. */
  dimensionCoverage: Record<ClimateDimension, number>;
  /** Conflicting interactions (score ≤ −2) by climate dimension. */
  conflictsByDimension: Record<ClimateDimension, number>;
  /** Acts judged not fit for purpose in the critical assessment. */
  notFitForPurpose: number;
}

export function buildCoherenceOverview(scopeIds?: string[]): CoherenceOverview {
  const ids = scopeIds ?? coherenceAssessedIds();
  const inScope = new Set(ids);
  const profiles = ids
    .map(buildCoherenceProfile)
    .filter(p => p.assessedLenses > 0)
    .sort((a, b) => GRADE_RANK[a.overall] - GRADE_RANK[b.overall]);

  const lensCounts = Object.fromEntries(
    COHERENCE_LENSES.map(s => [
      s.id,
      { coherent: 0, partial: 0, incoherent: 0, 'not-assessed': 0 },
    ]),
  ) as Record<CoherenceLensId, Record<CoherenceGrade, number>>;
  for (const p of profiles) {
    for (const s of COHERENCE_LENSES) lensCounts[s.id][p.lensGrades[s.id]] += 1;
  }

  const interactions = GOAL_INTERACTIONS.filter(i => inScope.has(i.a) && inScope.has(i.b));
  const counteracting = interactions.filter(i => i.score <= -2).length;
  const constraining = interactions.filter(i => i.score === -1).length;
  const positive = interactions.filter(i => i.score >= 1).length;
  const violatedAssumptions = profiles.filter(p => p.exAnte?.status === 'violated').length;
  const outcomesOffTrack = profiles.filter(
    p => p.evaluation.measurement?.pace.reading === 'off-track',
  ).length;
  const decomposed = profiles.filter(p => p.decomposition).length;
  const notFitForPurpose = profiles.filter(p => p.critical?.fit === 'unfit').length;

  const dimensionCoverage = { mitigation: 0, adaptation: 0, 'mitigation-adaptation': 0 } as Record<
    ClimateDimension,
    number
  >;
  for (const p of profiles) for (const d of p.dimensionSet) dimensionCoverage[d] += 1;

  const conflictsByDimension = {
    mitigation: 0,
    adaptation: 0,
    'mitigation-adaptation': 0,
  } as Record<ClimateDimension, number>;
  for (const i of interactions.filter(x => x.score <= -2)) {
    conflictsByDimension[interactionDimension(i)] += 1;
  }

  const meansScores = profiles.map(p => p.means.score).filter((s): s is number => s !== null);
  const meanMeansScore =
    meansScores.length > 0
      ? meansScores.reduce((a, b) => a + b, 0) / meansScores.length
      : null;

  return {
    profiles,
    lensCounts,
    stepCounts: lensCounts,
    interactions,
    counteracting,
    constraining,
    positive,
    violatedAssumptions,
    meanMeansScore,
    outcomesOffTrack,
    decomposed,
    dimensionCoverage,
    conflictsByDimension,
    notFitForPurpose,
  };
}
