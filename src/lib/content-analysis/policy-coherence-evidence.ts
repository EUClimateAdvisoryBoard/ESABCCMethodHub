// ---------------------------------------------------------------------------
// Policy coherence — text evidence layer.
//
// Makes the four-step coherence assessment (policy-coherence.ts) walkable
// back to the WORDS of the acts: every curated grade is grounded in one or
// more verbatim passages from the policy-text library
// (`public/data/policy-texts/<policyId>.txt` — the same texts the Policy
// Navigator serves), each carrying the provision reference, a one-line
// reading (why this passage grounds the assessment), and an honest
// provenance flag:
//
//   quote ≠ null  → the passage is VERBATIM from the shipped text of the act
//                   (whitespace/typographic-quote differences tolerated);
//   quote = null  → the text library lacks the act or ships a pre-amendment
//                   version that does not contain the cited provision; the
//                   `gloss` paraphrases it and `textNote` says why. Nothing
//                   is silently passed off as a quote.
//
// Text-vintage findings surfaced by building this layer (kept as notes on
// the affected anchors): the library ships the ORIGINAL 2003 ETS Directive
// (none of the 2023 revision), the 2018 ESR (pre −40 %), RED II (pre RED III
// 42.5 % / acceleration areas) and the 2019 CO₂-cars Regulation (pre 2035
// step); REPowerEU, Farm to Fork, the Habitats and Air Quality Directives,
// the electricity-market reform, the hydrogen/gas package, the Green Claims
// proposal and the EuGB Regulation are absent altogether.
//
// The same anchors are seeded into the Content Analysis master library as
// coded segments under the four `coh-*` master codes (see
// `buildCoherenceSegmentsFor`), so the tagged corpus doubles as a
// "Policy coherence" master library: open any assessed act in the workbench
// and the coherence evidence shows up as in-text highlights, exactly like
// the objective–delivery checklist annotations. Steps ③ and ④ stay derived:
// their in-text tags are generated from the checklist verdicts, never
// re-authored here.
// ---------------------------------------------------------------------------

import {
  COHERENCE_STEP_BY_ID,
  EX_ANTE_ASSESSMENTS,
  GOAL_INTERACTIONS,
  evaluationCoherence,
  meansCoherence,
  INTERACTION_SCALE,
  type CoherenceStepId,
} from './policy-coherence';
import { policies } from '@/data/policies';
import type { AnalysisDocument, Block, CodedSegment } from './types';

// ── Model ───────────────────────────────────────────────────────────────────

export type EvidenceAssessmentRef =
  /** Grounds the policy's step-① assumption audit. */
  | { kind: 'ex-ante' }
  /** Grounds one side of a step-② goal interaction. */
  | { kind: 'interaction'; interactionId: string }
  /** Grounds the step-④ target-bearing indicator (the in-act target). */
  | { kind: 'outcome' };

export interface PolicyTextEvidence {
  id: string;
  policyId: string;
  stepId: CoherenceStepId;
  assessment: EvidenceAssessmentRef;
  /** Cited provision (e.g. "Art. 4(2)") — also drives the in-text anchor. */
  provision: string;
  /** Verbatim passage from the shipped policy text, or null (see header). */
  quote: string | null;
  /** Paraphrase of the provision — only set when `quote` is null. */
  gloss?: string;
  /** Why this passage grounds the assessment, in one line. */
  reading: string;
  /** Caveat on the shipped text (pre-amendment vintage, missing act…). */
  textNote?: string;
}

/** Master code id for a step (the `coh-*` codes under `root-coherence`). */
export function coherenceCodeId(stepId: CoherenceStepId): string {
  return COHERENCE_STEP_BY_ID[stepId].codeId;
}

const TITLE_BY_ID = new Map(policies.map(p => [p.id, p.short_title] as const));
const titleOf = (id: string) => TITLE_BY_ID.get(id) ?? id;

// Recurring text-vintage notes (see header).
const NOTE_ETS_2003 =
  'The text library ships the original 2003 ETS Directive; the cited provision was introduced by the 2023 revision (Dir. (EU) 2023/959) and is not in the shipped text.';
const NOTE_ESR_2018 =
  'The text library ships the 2018 ESR; Annex I was tightened to deliver −40 % aggregate by Reg. (EU) 2023/857, which is not in the shipped text.';
const NOTE_RED_II =
  'The text library ships RED II (2018, 32 % target); the cited provision was inserted by Dir. (EU) 2023/2413 (RED III) and is not in the shipped text.';
const NOTE_CARS_2019 =
  'The text library ships Reg. (EU) 2019/631 as adopted; the cited provision was inserted by Reg. (EU) 2023/851 and is not in the shipped text.';
const NOTE_NOT_IN_LIBRARY = 'This act is not in the policy-text library.';
const NOTE_EUDR_ORIGINAL =
  'The text library ships the original EUDR; the application date it states was moved to 30 Dec 2025 by Reg. (EU) 2024/3234 and to 30 Dec 2026 by Reg. (EU) 2025/2650 — neither amendment is in the shipped text.';
const NOTE_IED_2010 =
  'The text library ships Dir. 2010/75/EU without the 2024 revision (Dir. (EU) 2024/1785); the cited IED 2.0 provision is not in the shipped text.';
const NOTE_TENT_STUB = 'The text library carries only a page stub for this act, not the legal text.';

// ── Curated anchors ─────────────────────────────────────────────────────────
// Step ① (ex-ante): the provision that fixes the design assumption in law.
// Step ② (horizontal): the provision on each side that CREATES the interaction.
// Step ④ (outcomes): the in-act target the pace ratio is computed against.

export const COHERENCE_TEXT_EVIDENCE: PolicyTextEvidence[] = [
  // ═══ Step ① · Ex ante design vs world development ═══════════════════════
  {
    id: 'exante-eu-climate-law',
    policyId: 'eu-climate-law',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 4(3)',
    quote:
      'first global stocktake referred to in Article 14 of the Paris Agreement, the Commission shall make a legislative proposal, as appropriate, based on a detailed impact assessment, to amend this Regulation to include the Union 2040 climate target, taking into account the conclusions of the assessments referred to in Articles 6 and 7 of this Regulation and the outcomes of the global stocktake.',
    reading:
      'The ratchet clause the assumption rests on: a 2040-target proposal was due within six months of the first global stocktake (i.e. H1 2024). The deadline slipped ~20 months, but the clause ultimately delivered — Reg. (EU) 2026/667 enacted the −90% 2040 target in March 2026.',
  },
  {
    id: 'exante-eu-ets-directive',
    policyId: 'eu-ets-directive',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 9 (as amended 2023)',
    quote: null,
    gloss:
      'The Union-wide quantity of allowances declines by a linear reduction factor of 4.3 % from 2024 and 4.4 % from 2028, with one-off cap cuts of 90 million allowances in 2024 and 27 million in 2026.',
    reading:
      'The tightened cap trajectory whose bindingness the assumption asserts — verified emissions and the MSR band are tested against this path.',
    textNote: NOTE_ETS_2003,
  },
  {
    id: 'exante-effort-sharing-regulation',
    policyId: 'effort-sharing-regulation',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 4(1)',
    quote:
      'Each Member State shall, in 2030, limit its greenhouse gas emissions at least by the percentage set for that Member State in Annex I in relation to its greenhouse gas emissions in 2005, determined pursuant to paragraph 3 of this Article.',
    reading:
      'The national-target mechanism the assumption rests on: compliance is per-Member-State against Annex I percentages — which is exactly where the projected deficits (DE, IE, IT) bite.',
    textNote: NOTE_ESR_2018,
  },
  {
    id: 'exante-lulucf-regulation',
    policyId: 'lulucf-regulation',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 4(2)',
    quote:
      'The Union-wide target for net greenhouse gas removals shall be 310 million tonnes of CO2 equivalent as a sum of the Member State targets set out in Annex IIa for the year 2030, based on the average of its greenhouse gas inventory data for the years 2028, 2029 and 2030.',
    reading:
      'The 310 Mt target was calibrated on a ~−310 Mt reference sink; with the inventory sink at ~−200 Mt, the design assumption behind this provision is violated.',
  },
  {
    id: 'exante-renewable-energy-directive',
    policyId: 'renewable-energy-directive',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 3(1) (RED III)',
    quote: null,
    gloss:
      'Member States shall collectively ensure that the share of energy from renewable sources in the Union’s gross final consumption of energy in 2030 is at least 42.5 %, with an indicative additional 2.5 percentage-point top-up.',
    reading:
      'The binding share the permitting-and-cost assumption must deliver; the observed 24.5 % (2023) trails the linear path to it.',
    textNote: NOTE_RED_II,
  },
  {
    id: 'exante-energy-efficiency-directive',
    policyId: 'energy-efficiency-directive',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 4(1)',
    quote:
      'Member States shall collectively ensure a reduction of energy consumption of at least 11,7 % in 2030 compared to the projections of the 2020 EU Reference Scenario so that the Union’s final energy consumption amounts to no more than 763 Mtoe.',
    reading:
      'The 763 Mtoe cap presumes structural, efficiency-driven cuts; the assumption is under pressure because the 2022–23 fall was substantially price-driven demand response.',
  },
  {
    id: 'exante-cbam-regulation-transition',
    policyId: 'cbam-regulation',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 32',
    quote:
      'During the transitional period from 1 October 2023 until 31 December 2025, the obligations of the importer under this Regulation shall be limited to the reporting obligations set out in Articles 33, 34 and 35 of this Regulation.',
    reading:
      'The reporting-only phase in which administrability is being tested — where default values came to dominate declarations.',
  },
  {
    id: 'exante-cbam-regulation-start',
    policyId: 'cbam-regulation',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 36(2)',
    quote:
      'It shall apply from 1 October 2023. However: (a) Articles 5, 10, 14, 16 and 17 shall apply from 31 December 2024; (b) Article 2(2) and Articles 4, 6 to 9, 15 and 19, Article 20(1), (3), (4) and (5), Articles 21 to 27 and 31 shall apply from 1 January 2026.',
    reading:
      'The dated start of the definitive regime — the schedule the assumption tracks; the 2026 date stands while the declarant base was redrawn around it.',
  },
  {
    id: 'exante-co2-cars-regulation',
    policyId: 'co2-cars-regulation',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 1(5a) (2023 amendment)',
    quote: null,
    gloss:
      'From 1 January 2035, the EU fleet-wide target is a 100 % reduction of the 2021 baseline for both new passenger cars and new light commercial vehicles — only zero-emission new vehicles can comply.',
    reading:
      'The 2035 step the BEV-uptake assumption must carry; the 2025 compliance step was averaged out in law, which is what tips the assumption to violated.',
    textNote: NOTE_CARS_2019,
  },
  {
    id: 'exante-afir-regulation',
    policyId: 'afir-regulation',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 3(1)',
    quote:
      'for each light-duty battery electric vehicle registered in their territory, a total power output of at least 1,3 kW is provided through publicly accessible recharging stations',
    reading:
      'The fleet-indexed capacity formula the assumption asserts will keep charging ahead of uptake — currently exceeded in most Member States.',
  },
  {
    id: 'exante-epbd-recast',
    policyId: 'epbd-recast',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 3(1)',
    quote:
      'Each Member State shall establish a national building renovation plan to ensure the renovation of the national stock of residential and non-residential buildings, both public and private, into a highly energy-efficient and decarbonised building stock by 2050, with the objective to transform existing buildings into zero-emission buildings.',
    reading:
      'The national-plan machinery the renovation-doubling assumption depends on; plans are not yet due, so the post-plan test has not run.',
  },
  {
    id: 'exante-social-climate-fund',
    policyId: 'social-climate-fund',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 10(1)',
    quote:
      'A maximum amount of EUR 65 000 000 000 for the period from 1 January 2026 to 31 December 2032 in current prices shall be made available, in accordance with Articles 10a(8b), 30d(3) and 30d(4) of Directive 2003/87/EC, for implementation of the Fund.',
    reading:
      'The fund size is wired to ETS2 auction revenue under Directive 2003/87/EC — which is why the ETS2 postponement to 2028 (Reg. (EU) 2026/667) violates the capitalisation assumption written into this provision.',
  },
  {
    id: 'exante-methane-regulation',
    policyId: 'methane-regulation',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 28(1)',
    quote:
      'From 1 January 2027, importers shall demonstrate, and report in accordance with Article 27(1), to the competent authorities of the Member State in which they are established that the contracts concluded or renewed on or after 4 August 2024 for the supply of crude oil, natural gas or coal produced outside the Union cover only crude oil, natural gas or coal that is subject to monitoring, reporting and verification measures applied at the level of the producer that are equivalent to those set out in this Regulation.',
    reading:
      'The MRV-equivalence duty on importers — the exact compliance the exporter-behaviour assumption asserts, and where supplier-side verifiability is now in question.',
  },
  {
    id: 'exante-nature-restoration-law',
    policyId: 'nature-restoration-law',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 16(1)',
    quote:
      'Each Member State shall submit a draft of the national restoration plan referred to in Articles 14 and 15 to the Commission by 1 September 2026.',
    reading:
      'The plan-submission deadline the credibility assumption is dated to; pre-submission signals from several Member States are minimalist.',
  },
  {
    id: 'exante-csrd',
    policyId: 'csrd',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 5(2)',
    quote:
      'Member States shall apply the measures necessary to comply with Article 1, with the exception of point (14): (a) for financial years starting on or after 1 January 2024: (i) to large undertakings within the meaning of Article 3(4) of Directive 2013/34/EU which are public-interest entities as defined in point (1) of Article 2 of that Directive exceeding on their balance sheet dates the average number of 500 employees during the financial year',
    reading:
      'The wave-based scope as enacted — the design the 2025 Omnibus then cut to 1,000+ employees, violating the assumption that the waves would hold.',
  },
  {
    id: 'exante-fueleu-maritime',
    policyId: 'fueleu-maritime',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 4(2)',
    quote:
      'The limit referred to in paragraph 1 shall be calculated by reducing the reference value of 91,16 grams of CO2 equivalent per MJ by the following percentage: — 2 % from 1 January 2025; — 6 % from 1 January 2030; — 14,5 % from 1 January 2035; — 31 % from 1 January 2040; — 62 % from 1 January 2045; — 80 % from 1 January 2050.',
    reading:
      'The stepped GHG-intensity path whose early rungs the bridge-fuel assumption covers — fleets are currently meeting the 2025 step as assumed.',
  },
  {
    id: 'exante-refueleu-aviation',
    policyId: 'refueleu-aviation',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 4(1) + Annex I',
    quote:
      'Subject to Article 15, aviation fuel suppliers shall ensure that all aviation fuel made available to aircraft operators at each Union airport contains the minimum shares of SAF, including the minimum shares of synthetic aviation fuel in accordance with the values and dates of application set out in Annex I.',
    reading:
      'The blending mandate (Annex I: 6 % SAF incl. 1.2 % synthetic by 2030) whose supply-scaling assumption is under pressure from delayed e-SAF investment decisions.',
  },
  {
    id: 'exante-governance-regulation',
    policyId: 'governance-regulation',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 9(2)',
    quote:
      'The Commission shall assess the draft integrated national energy and climate plans and may issue country-specific recommendations to Member States in accordance with Article 34 no later than six months before the deadline for submitting those integrated national energy and climate plans.',
    reading:
      'The recommend-only lever of the plan–assess–recommend cycle: with gaps persisting across two cycles despite these recommendations, the no-hard-enforcement assumption is violated.',
  },
  {
    id: 'exante-net-zero-industry-act',
    policyId: 'net-zero-industry-act',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 5(1)(a)',
    quote:
      'a benchmark of at least 40 % of the Union’s annual deployment needs for the corresponding technologies necessary to achieve the Union’s 2030 climate and energy targets',
    reading:
      'The manufacturing benchmark the demand-pull assumption must reach without price support — solar is in low single digits against it.',
  },
  {
    id: 'exante-critical-raw-materials-act',
    policyId: 'critical-raw-materials-act',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 11(1)',
    quote:
      'For Strategic Projects in the Union, the permit-granting process shall not exceed: (a) 27 months for Strategic Projects involving extraction; (b) 15 months for Strategic Projects involving only processing or recycling.',
    reading:
      'The statutory permitting clocks the project-pipeline assumption rides on — designations proceed, but the clocks are not yet tested at scale.',
  },
  {
    id: 'exante-repowereu-plan',
    policyId: 'repowereu-plan',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'COM(2022) 230',
    quote: null,
    gloss:
      'REPowerEU set the objective of ending the Union’s dependence on Russian fossil fuels well before 2030 through energy savings, diversification of supplies and an accelerated roll-out of renewables.',
    reading:
      'The replacement-without-rationing objective the assumption states — delivered: the Russian gas share fell from ~45 % to under 20 % with no rationing.',
    textNote: NOTE_NOT_IN_LIBRARY,
  },
  {
    id: 'exante-eu-green-deal',
    policyId: 'eu-green-deal',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'COM(2019) 640, §1',
    quote:
      'It is a new growth strategy that aims to transform the EU into a fair and prosperous society, with a modern, resource-efficient and competitive economy where there are no net emissions of greenhouse gases in 2050 and where economic growth is decoupled from resource use.',
    reading:
      'The organising-frame claim the assumption tests across Commission cycles — the frame survives reframed (Clean Industrial Deal) while accompanying instruments were trimmed.',
  },
  {
    id: 'exante-taxonomy-regulation',
    policyId: 'taxonomy-regulation',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 8(1)',
    quote:
      'Any undertaking which is subject to an obligation to publish non-financial information pursuant to Article 19a or Article 29a of Directive 2013/34/EU shall include in its non-financial statement or consolidated non-financial statement information on how and to what extent the undertaking’s activities are associated with economic activities that qualify as environmentally sustainable under Articles 3 and 9 of this Regulation.',
    reading:
      'Mandatory alignment reporting is defined by reference to the CSRD scope — so the Omnibus scope cut flowed straight through to this provision, pressuring the common-language assumption.',
  },
  {
    id: 'exante-farm-to-fork-strategy',
    policyId: 'farm-to-fork-strategy',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'COM(2020) 381, §2',
    quote: null,
    gloss:
      'The strategy set 2030 targets to reduce the overall use and risk of chemical pesticides by 50 %, reduce nutrient losses by at least 50 %, and reach 25 % of agricultural land under organic farming.',
    reading:
      'Non-binding strategy targets whose path into law (SUR + framework law) the assumption asserted — the SUR was withdrawn and the framework law never tabled.',
    textNote: NOTE_NOT_IN_LIBRARY,
  },
  {
    id: 'exante-cap-strategic-plans',
    policyId: 'cap-strategic-plans',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 12(1)',
    quote:
      'Member States shall include in their CAP Strategic Plans a system of conditionality under which farmers and other beneficiaries receiving direct payments under Chapter II or annual payments under Articles 70, 71 and 72 are subject to an administrative penalty if they do not comply with the statutory management requirements under Union law and the GAEC standards established in the CAP Strategic Plans, as listed in Annex III',
    reading:
      'The conditionality architecture assumed to hold for 2023–27; Reg. (EU) 2024/1468 relaxed or deleted several GAEC standards mid-period — the assumption is violated in law.',
  },
  {
    id: 'exante-fit-for-55',
    policyId: 'fit-for-55',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'COM(2021) 550, §2',
    quote: 'The Fit for 55 Package is a set of interconnected proposals that together deliver our ambition.',
    reading:
      'The interlocking-whole design claim the assumption tests — borne out: all major files were adopted 2022–24 with the calibration intact.',
  },

  {
    id: 'exante-deforestation-regulation',
    policyId: 'deforestation-regulation',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 38(2)',
    quote:
      'Subject to paragraph 3 of this Article, Articles 3 to 13, Articles 16 to 24 and Articles 26, 31 and 32 shall apply from 30 December 2024.',
    reading:
      'The original application date the readiness assumption was fixed to — postponed twice in law (to 30 Dec 2025, then 30 Dec 2026) before the prohibition ever applied.',
    textNote: NOTE_EUDR_ORIGINAL,
  },
  {
    id: 'exante-batteries-regulation',
    policyId: 'batteries-regulation',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 7(1)',
    quote:
      '18 February 2025 or 12 months after the date of entry into force either of the delegated act or of the implementing act respectively referred to in the fourth subparagraph, points (a) and (b), whichever is the latest, for electric vehicle batteries',
    reading:
      'The act gates its own carbon-footprint dates on Commission delegated acts — which had still not been adopted by mid-2026, de-facto suspending the declaration duty this clause schedules.',
  },
  {
    id: 'exante-industrial-emissions-directive',
    policyId: 'industrial-emissions-directive',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 15(3) (IED 2.0) + Art. 26 transposition',
    quote: null,
    gloss:
      'Under the 2024 revision, permits must set emission limit values at the strictest end of the BAT-AEL ranges unless the operator demonstrates that only less strict values are achievable; Member States must transpose by 1 July 2026.',
    reading:
      'The transposition deadline and strictest-end discipline the assumption tests — national drafts were still pending weeks before the deadline.',
    textNote: NOTE_IED_2010,
  },
  {
    id: 'exante-ten-t-regulation',
    policyId: 'ten-t-regulation',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Reg. 2024/1679 (network deadlines)',
    quote: null,
    gloss:
      'The core network must be completed by 31 December 2030, the extended core network by 2040 and the comprehensive network by 2050.',
    reading:
      'The dated completion duty the ECA has now assessed as “will not be met” for 2030 — the audit that flips the assumption to violated.',
    textNote: NOTE_TENT_STUB,
  },
  {
    id: 'exante-ecodesign-sustainable-products',
    policyId: 'ecodesign-sustainable-products',
    stepId: 'ex-ante',
    assessment: { kind: 'ex-ante' },
    provision: 'Art. 1(1)',
    quote:
      'This Regulation also establishes a digital product passport, provides for the setting of mandatory green public procurement requirements and creates a framework to prevent unsold consumer products from being destroyed.',
    reading:
      'The framework machinery (DPP, procurement) whose 2025–30 delegated-act schedule the assumption tracks — the working plan landed on time; the delivery test is ahead.',
  },

  // ═══ Step ② · Coherence across policy goals ═════════════════════════════
  // RED biomass × LULUCF sink
  {
    id: 'int-red-lulucf-a',
    policyId: 'renewable-energy-directive',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-red-lulucf' },
    provision: 'Art. 29(1)',
    quote:
      'Energy from biofuels, bioliquids and biomass fuels shall be taken into account for the purposes referred to in points (a), (b) and (c) of this subparagraph only if they fulfil the sustainability and the greenhouse gas emissions saving criteria laid down in paragraphs 2 to 7 and 10: (a) contributing towards the Union target set in Article 3(1) and the renewable energy shares of Member States',
    reading:
      'Forest biomass that meets these criteria counts toward the renewables target — creating the energy-wood demand that competes with the standing sink.',
  },
  {
    id: 'int-red-lulucf-b',
    policyId: 'lulucf-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-red-lulucf' },
    provision: 'Art. 4(2)',
    quote:
      'The Union-wide target for net greenhouse gas removals shall be 310 million tonnes of CO2 equivalent as a sum of the Member State targets set out in Annex IIa for the year 2030, based on the average of its greenhouse gas inventory data for the years 2028, 2029 and 2030.',
    reading:
      'The removal target debited directly by additional harvest for energy wood that RED rewards as zero-carbon.',
  },
  // ESR flexibility × LULUCF no-debit
  {
    id: 'int-esr-lulucf-a',
    policyId: 'effort-sharing-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-esr-lulucf' },
    provision: 'Art. 7(1)',
    quote:
      'To the extent that a Member State’s greenhouse gas emissions exceed its annual emission allocations for a given year, including any annual emission allocations banked pursuant to Article 5(3) of this Regulation, a quantity up to the sum of total net removals and total net emissions from the combined land accounting categories of afforested land, deforested land, managed cropland, managed grassland and, subject to the delegated acts adopted pursuant to paragraph 2 of this Article, managed forest land and managed wetland, as referred to in points (a) and (b) of Article 2(1) of Regulation (EU) 2018/841, may be taken into account for its compliance under Article 9 of this Regulation for that year',
    reading:
      'The LULUCF flexibility: land credits may substitute for real non-ETS cuts — softening the ESR target exactly when the sink is shrinking.',
  },
  {
    id: 'int-esr-lulucf-b',
    policyId: 'lulucf-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-esr-lulucf' },
    provision: 'Art. 13b(2)',
    quote:
      "Where, during the period from 2026 to 2030, and after exhausting all other flexibilities available pursuant to Article 13, the net greenhouse gas removals of a Member State fall below its target established in Annex IIa, a quantity up to the amount established in column D of Annex IIa for that Member State may be deducted from that Member State's annual emission allocations under Regulation (EU) 2018/842",
    reading:
      'The reverse valve: LULUCF shortfalls are settled out of ESR allocations — the two-way coupling that lets both targets soften together.',
  },
  // ETS free-allocation phase-out × CBAM
  {
    id: 'int-ets-cbam-a',
    policyId: 'eu-ets-directive',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-ets-cbam' },
    provision: 'Art. 10a(1a) (as amended 2023)',
    quote: null,
    gloss:
      'No free allocation is given for the production of CBAM goods from 2026; free allocation for those sectors phases out on a fixed schedule to zero by 2034 as the CBAM phases in.',
    reading:
      'The phase-out leg of the pairing: the ETS can only withdraw free allocation because the border mechanism takes over leakage protection.',
    textNote: NOTE_ETS_2003,
  },
  {
    id: 'int-ets-cbam-b',
    policyId: 'cbam-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-ets-cbam' },
    provision: 'Art. 1(3)',
    quote:
      'The CBAM is set to replace the mechanisms established under Directive 2003/87/EC to prevent the risk of carbon leakage by reflecting the extent to which EU ETS allowances are allocated free of charge in accordance with Article 10a of that Directive.',
    reading:
      'The act states the interaction itself: CBAM is defined as the replacement for ETS free allocation — the legal hinge of the reinforcing pair.',
  },
  // ETS × ESR complementary coverage
  {
    id: 'int-ets-esr-a',
    policyId: 'eu-ets-directive',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-ets-esr' },
    provision: 'Chapter IVa (as amended 2023)',
    quote: null,
    gloss:
      'The 2023 revision adds a separate emissions trading system (ETS2) for fuel combustion in buildings, road transport and additional sectors — originally from 2027, postponed to 2028 by Reg. (EU) 2026/667.',
    reading:
      'ETS2 bridges the buildings/road seam between the two coverage halves — now from 2028.',
    textNote: NOTE_ETS_2003,
  },
  {
    id: 'int-ets-esr-b',
    policyId: 'effort-sharing-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-ets-esr' },
    provision: 'Art. 2(1)',
    quote:
      'This Regulation applies to the greenhouse gas emissions from IPCC source categories of energy, industrial processes and product use, agriculture and waste as determined pursuant to Regulation (EU) No 525/2013, excluding greenhouse gas emissions from the activities listed in Annex I to Directive 2003/87/EC.',
    reading:
      'The ESR scope is defined as everything the ETS does not cover — the partition that makes the two acts complementary halves of −55 %.',
  },
  // CO₂ cars × AFIR
  {
    id: 'int-cars-afir-a',
    policyId: 'co2-cars-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-cars-afir' },
    provision: 'Art. 1(5a) (2023 amendment)',
    quote: null,
    gloss:
      'From 1 January 2035 the EU fleet-wide target is a 100 % reduction — the ZEV mandate that creates the electric fleet AFIR’s formula is indexed to.',
    reading: 'The demand-pull side of the pairing.',
    textNote: NOTE_CARS_2019,
  },
  {
    id: 'int-cars-afir-b',
    policyId: 'afir-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-cars-afir' },
    provision: 'Art. 3(1)',
    quote:
      'Member States shall ensure that, in their territory, publicly accessible recharging stations dedicated to light-duty electric vehicles are deployed in a way that is commensurate with the uptake of light-duty electric vehicles and that they provide sufficient power output for those vehicles.',
    reading:
      'The infrastructure-push side: capacity duties are indexed to the very fleet the CO₂ standards create, so the two ratchet together by construction.',
  },
  // CO₂ cars × Euro 7
  {
    id: 'int-cars-euro7-a',
    policyId: 'co2-cars-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-cars-euro7' },
    provision: 'Art. 1(5a) (2023 amendment)',
    quote: null,
    gloss:
      'The 100 % ZEV step from 2035 steers automotive capital out of combustion platforms over the same window Euro 7 demands fresh ICE engineering.',
    reading: 'The sequencing constraint on the capital-allocation side.',
    textNote: NOTE_CARS_2019,
  },
  {
    id: 'int-cars-euro7-b',
    policyId: 'euro-7-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-cars-euro7' },
    provision: 'Art. 1(1)',
    quote:
      'This Regulation establishes common technical requirements and administrative provisions for the emission type-approval and market surveillance of motor vehicles, systems, components and separate technical units, with regard to their CO2 and pollutant emissions, fuel and electric energy consumption and battery durability.',
    reading:
      'Pollutant-side type-approval duties that oblige continued ICE platform investment in the interim the CO₂ standards are winding down.',
  },
  // CO₂ cars × Air Quality
  {
    id: 'int-cars-aaq-b',
    policyId: 'air-quality-directive',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-cars-aaq' },
    provision: 'Annex I',
    quote: null,
    gloss:
      'The revised AAQD sets WHO-aligned limit values for NO₂ and particulate matter to be met by 2030.',
    reading:
      'Urban NO₂ compliance is the hardest of these limits — and fleet electrification under the CO₂ standards is among its largest single levers.',
    textNote: NOTE_NOT_IN_LIBRARY,
  },
  // SCF × EPBD
  {
    id: 'int-scf-epbd-a',
    policyId: 'social-climate-fund',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-scf-epbd' },
    provision: 'Art. 8(1)(a)',
    quote:
      'support building renovations, in particular for vulnerable households and vulnerable micro-enterprises occupying the worst performing buildings, and including for tenants and people living in social housing',
    reading:
      'The Fund’s eligible measures name the worst-performing stock — precisely the buildings the EPBD obligations bite first.',
  },
  {
    id: 'int-scf-epbd-b',
    policyId: 'epbd-recast',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-scf-epbd' },
    provision: 'Art. 9(1)',
    quote:
      'Each Member State shall set a maximum energy performance threshold to the effect that 16 % of its national non-residential building stock is above that threshold (the ‘16 % threshold’).',
    reading:
      'The worst-stock-first mechanism whose distributional impact the SCF is built to cushion — two sides of one move.',
  },
  // CAP coupled support × Methane scope
  {
    id: 'int-cap-methane-a',
    policyId: 'cap-strategic-plans',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-cap-methane' },
    provision: 'Art. 32(1)',
    quote:
      'Member States may grant coupled income support to active farmers under the conditions set out in this Subsection and as further specified in their CAP Strategic Plans.',
    reading:
      'Coupled support stabilises herd sizes — holding steady the largest EU methane source the Methane Regulation leaves out.',
  },
  {
    id: 'int-cap-methane-b',
    policyId: 'methane-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-cap-methane' },
    provision: 'Art. 1(1)',
    quote:
      'This Regulation lays down rules for the accurate measurement, quantification, monitoring, reporting and verification of methane emissions in the energy sector in the Union, as well as the reduction of those emissions, including through leak detection and repair surveys, repair obligations and restrictions on venting and flaring.',
    reading:
      'The scope clause: energy-sector methane only — agriculture, the largest EU source, is outside the act by these words.',
  },
  // CAP eligible hectare × NRL agri-ecosystems
  {
    id: 'int-cap-nrl-a',
    policyId: 'cap-strategic-plans',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-cap-nrl' },
    provision: 'Art. 4(1)',
    quote:
      'Member States shall provide in their CAP Strategic Plans the definitions of ‘agricultural activity’, ‘agricultural area’, ‘eligible hectare’, ‘active farmer’, ‘young farmer’ and ‘new farmer’, as well as the relevant conditions in accordance with this Article.',
    reading:
      'Payments hang on the “eligible hectare” definition — the productive-area logic restoration measures on farmland run up against.',
  },
  {
    id: 'int-cap-nrl-b',
    policyId: 'nature-restoration-law',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-cap-nrl' },
    provision: 'Art. 11(1)',
    quote:
      'Member States shall put in place the restoration measures necessary to enhance biodiversity in agricultural ecosystems, in addition to the areas that are subject to restoration measures under Article 4(1), (4) and (7), taking into account climate change, the social and economic needs of rural areas and the need to ensure sustainable agricultural production in the Union.',
    reading:
      'Binding restoration duties on agricultural ecosystems (incl. peatland rewetting under Annex IV) that compete for the same hectares CAP pays to keep productive.',
  },
  // F2F targets × CAP plan cycle
  {
    id: 'int-f2f-cap-a',
    policyId: 'farm-to-fork-strategy',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-f2f-cap' },
    provision: 'COM(2020) 381, §2',
    quote: null,
    gloss:
      'The strategy’s 2030 pesticide (−50 %), nutrient (−50 %) and organic-farming (25 %) targets relied on CAP Strategic Plans as the delivery vehicle.',
    reading:
      'Targets without own instruments, dated after the delivery vehicle was already being fixed.',
    textNote: NOTE_NOT_IN_LIBRARY,
  },
  {
    id: 'int-f2f-cap-b',
    policyId: 'cap-strategic-plans',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-f2f-cap' },
    provision: 'Art. 1(1)(c)',
    quote:
      'CAP Strategic Plans, which are to be drawn up by Member States and which set targets, specify conditions for interventions and allocate financial resources, according to the specific objectives and identified needs',
    reading:
      'The plans fix targets and budgets on their own cycle — eco-scheme ambition was locked before any F2F target had legal force.',
  },
  // NRL 20 % × RED acceleration areas
  {
    id: 'int-nrl-red-a',
    policyId: 'nature-restoration-law',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-nrl-red' },
    provision: 'Art. 1(2)',
    quote:
      'This Regulation establishes a framework within which Member States shall put in place effective and area-based restoration measures with the aim to jointly cover, as a Union target, throughout the areas and ecosystems within the scope of this Regulation, at least 20 % of land areas and at least 20 % of sea areas by 2030, and all ecosystems in need of restoration by 2050.',
    reading:
      'An area-based target — restoration needs the same land and sea the accelerated renewables build-out claims.',
  },
  {
    id: 'int-nrl-red-b',
    policyId: 'renewable-energy-directive',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-nrl-red' },
    provision: 'Arts. 15b–16f (RED III)',
    quote: null,
    gloss:
      'RED III requires Member States to designate renewables acceleration areas and presumes renewable energy projects to be of overriding public interest in permitting.',
    reading:
      'The presumption tilts land-use permitting against restoration where the two compete.',
    textNote: NOTE_RED_II,
  },
  // CRMA fast permitting × Habitats assessment
  {
    id: 'int-crma-habitats-a',
    policyId: 'critical-raw-materials-act',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-crma-habitats' },
    provision: 'Art. 10(2)',
    quote:
      'Strategic Projects in the Union shall be considered to be of public interest or serving public health and safety, and may be considered to have an overriding public interest provided that all the conditions set out in those Union legislative acts are fulfilled.',
    reading:
      'Overriding-public-interest status plus the 27-month clock (Art. 11) compress the time the Habitats assessment discipline needs.',
  },
  {
    id: 'int-crma-habitats-b',
    policyId: 'habitats-directive',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-crma-habitats' },
    provision: 'Art. 6(3)–(4)',
    quote: null,
    gloss:
      'Plans or projects likely to affect a Natura 2000 site require an appropriate assessment of the implications for the site; overriding public interest permits derogation only with compensatory measures.',
    reading:
      'The assessment-and-derogation discipline whose scarcest resource — time — the CRMA clock consumes.',
    textNote: NOTE_NOT_IN_LIBRARY,
  },
  // NZIA × CRMA supply chain
  {
    id: 'int-nzia-crma-a',
    policyId: 'net-zero-industry-act',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-nzia-crma' },
    provision: 'Art. 5(1)(a)',
    quote:
      'a benchmark of at least 40 % of the Union’s annual deployment needs for the corresponding technologies necessary to achieve the Union’s 2030 climate and energy targets',
    reading:
      'The downstream manufacturing benchmark — unreachable without the upstream material benchmarks next door.',
  },
  {
    id: 'int-nzia-crma-b',
    policyId: 'critical-raw-materials-act',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-nzia-crma' },
    provision: 'Art. 5(1)(a)(ii)',
    quote:
      'Union processing capacity, including for all intermediate processing steps, is capable of producing at least 40 % of the Union’s annual consumption of strategic raw materials',
    reading:
      'The upstream benchmark whose demand is anchored by NZIA factories — consecutive links of one supply chain.',
  },
  // NZIA × CBAM
  {
    id: 'int-nzia-cbam-a',
    policyId: 'net-zero-industry-act',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-nzia-cbam' },
    provision: 'Art. 1(1)',
    quote:
      'The general objective of this Regulation is to improve the functioning of the internal market by establishing a framework in order to ensure the Union’s access to a secure and sustainable supply of net-zero technologies, including by scaling up the manufacturing capacity of net-zero technologies and their supply chains to safeguard their resilience',
    reading:
      'The reindustrialisation objective that depends on level carbon costs in its energy-intensive upstream.',
  },
  {
    id: 'int-nzia-cbam-b',
    policyId: 'cbam-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-nzia-cbam' },
    provision: 'Art. 1(1)',
    quote:
      'This Regulation establishes a carbon border adjustment mechanism (the ‘CBAM’) to address greenhouse gas emissions embedded in the goods listed in Annex I on their importation into the customs territory of the Union in order to prevent the risk of carbon leakage',
    reading:
      'Border pricing on steel, aluminium and hydrogen (Annex I) — exactly the upstream the NZIA build-out buys from.',
  },
  // ReFuelEU × FuelEU feedstock competition
  {
    id: 'int-refuel-fueleu-a',
    policyId: 'refueleu-aviation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-refuel-fueleu' },
    provision: 'Art. 4(1) + Annex I',
    quote:
      'Subject to Article 15, aviation fuel suppliers shall ensure that all aviation fuel made available to aircraft operators at each Union airport contains the minimum shares of SAF, including the minimum shares of synthetic aviation fuel in accordance with the values and dates of application set out in Annex I.',
    reading:
      'Aviation’s synthetic sub-mandate bids for the same renewable hydrogen and feedstock molecules as shipping’s RFNBO incentive.',
  },
  {
    id: 'int-refuel-fueleu-b',
    policyId: 'fueleu-maritime',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-refuel-fueleu' },
    provision: 'Art. 5(1)',
    quote:
      'For the calculation of the GHG intensity of the energy used on board by a ship, from 1 January 2025 to 31 December 2033 a multiplier of ‘2’ can be used to reward the ship for the use of RFNBO.',
    reading:
      'The RFNBO multiplier — shipping’s bid on the identical constrained molecule pool.',
  },
  // Hydrogen package × RED RFNBO targets
  {
    id: 'int-h2pkg-red-a',
    policyId: 'hydrogen-gas-package',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-h2pkg-red' },
    provision: 'Market & network rules',
    quote: null,
    gloss:
      'The hydrogen and decarbonised gas market package sets the market rules, unbundling and network planning for a dedicated hydrogen infrastructure.',
    reading: 'The rails that need anchor demand to de-risk.',
    textNote: NOTE_NOT_IN_LIBRARY,
  },
  {
    id: 'int-h2pkg-red-b',
    policyId: 'renewable-energy-directive',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-h2pkg-red' },
    provision: 'Arts. 22a, 25 (RED III)',
    quote: null,
    gloss:
      'RED III sets binding RFNBO shares — 42 % of industrial hydrogen by 2030 and a transport RFNBO sub-target — creating the demand the hydrogen market rules monetise.',
    reading: 'The demand anchor of the pairing.',
    textNote: NOTE_RED_II,
  },
  // EED × EPBD shared delivery channel
  {
    id: 'int-eed-epbd-a',
    policyId: 'energy-efficiency-directive',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-eed-epbd' },
    provision: 'Art. 6(1)',
    quote:
      'each Member State shall ensure that at least 3 % of the total floor area of heated and/or cooled buildings that are owned by public bodies is renovated each year to be transformed into at least nearly zero-energy buildings or zero-emission buildings in accordance with Article 9 of Directive 2010/31/EU',
    reading:
      'The EED’s public-renovation duty is defined by direct reference to the EPBD’s building standards — one delivery channel, two acts.',
  },
  {
    id: 'int-eed-epbd-b',
    policyId: 'epbd-recast',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-eed-epbd' },
    provision: 'Art. 3(1)',
    quote:
      'Each Member State shall establish a national building renovation plan to ensure the renovation of the national stock of residential and non-residential buildings, both public and private, into a highly energy-efficient and decarbonised building stock by 2050, with the objective to transform existing buildings into zero-emission buildings.',
    reading:
      'The stock-wide renovation trajectory that is simultaneously the largest single lever under the EED’s 763 Mtoe cap.',
  },
  // CSRD × SFDR data dependency
  {
    id: 'int-csrd-sfdr-a',
    policyId: 'csrd',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-csrd-sfdr' },
    provision: 'Recital 17',
    quote:
      'It is therefore appropriate to require all large undertakings and all undertakings, except micro undertakings, whose securities are admitted to trading on a regulated market in the Union to report sustainability information.',
    reading:
      'The economy-wide reporting base SFDR indicators were designed to be fed from — much smaller after the Omnibus scope cut.',
  },
  {
    id: 'int-csrd-sfdr-b',
    policyId: 'sfdr',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-csrd-sfdr' },
    provision: 'Art. 4(1)(a)',
    quote:
      'where they consider principal adverse impacts of investment decisions on sustainability factors, a statement on due diligence policies with respect to those impacts, taking due account of their size, the nature and scale of their activities and the types of financial products they make available',
    reading:
      'The adverse-impact statement whose data quality rides on investee CSRD reporting; for de-scoped investees it reverts to estimates.',
  },
  // CSRD × Taxonomy Art. 8
  {
    id: 'int-csrd-taxonomy-a',
    policyId: 'csrd',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-csrd-taxonomy' },
    provision: 'Art. 5(2)',
    quote:
      'Member States shall apply the measures necessary to comply with Article 1, with the exception of point (14): (a) for financial years starting on or after 1 January 2024: (i) to large undertakings within the meaning of Article 3(4) of Directive 2013/34/EU which are public-interest entities as defined in point (1) of Article 2 of that Directive exceeding on their balance sheet dates the average number of 500 employees during the financial year',
    reading:
      'The reporting infrastructure (waves, assurance, ESRS) that taxonomy KPIs ride on — one audit trail serving both acts.',
  },
  {
    id: 'int-csrd-taxonomy-b',
    policyId: 'taxonomy-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-csrd-taxonomy' },
    provision: 'Art. 8(2)',
    quote:
      'the proportion of their capital expenditure and the proportion of their operating expenditure related to assets or processes associated with economic activities that qualify as environmentally sustainable under Articles 3 and 9.',
    reading:
      'The turnover/CapEx/OpEx alignment KPIs reported inside the CSRD management report.',
  },
  // Green Claims × CSRD
  {
    id: 'int-claims-csrd-a',
    policyId: 'green-claims-directive',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-claims-csrd' },
    provision: 'Proposal Arts. 3–5',
    quote: null,
    gloss:
      'The proposal requires explicit environmental claims to consumers to be substantiated with verified evidence before being made.',
    reading:
      'Substantiation at the shelf and audited CSRD disclosure at the filing close the greenwashing loop from opposite ends.',
    textNote: NOTE_NOT_IN_LIBRARY,
  },
  // Electricity market reform × RED
  {
    id: 'int-emr-red-a',
    policyId: 'electricity-market-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-emr-red' },
    provision: 'Arts. 19a–19b (2024 reform)',
    quote: null,
    gloss:
      'The reformed market design obliges Member States to facilitate power purchase agreements and channels public support for new renewables and nuclear through two-sided contracts for difference.',
    reading:
      'Revenue stabilisation and PPA access — the financing rails under the renewables target.',
    textNote: NOTE_NOT_IN_LIBRARY,
  },
  {
    id: 'int-emr-red-b',
    policyId: 'renewable-energy-directive',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-emr-red' },
    provision: 'Art. 3(1) (RED III)',
    quote: null,
    gloss:
      'The binding 42.5 % renewables share by 2030 mandates exactly the capital-intensive build-out the reformed market design de-risks.',
    reading: 'The mandated build-out on the other side of the financing rails.',
    textNote: NOTE_RED_II,
  },
  // AI Act × EED
  {
    id: 'int-aiact-eed-a',
    policyId: 'ai-act',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-aiact-eed' },
    provision: 'Art. 95(1)',
    quote:
      'The AI Office and the Member States shall encourage and facilitate the drawing up of codes of conduct, including related governance mechanisms, intended to foster the voluntary application to AI systems, other than high-risk AI systems, of some or all of the requirements set out in Chapter III, Section 2',
    reading:
      'Energy footprint is left to voluntary codes — nothing in the act constrains the compute build-out it legitimises.',
  },
  {
    id: 'int-aiact-eed-b',
    policyId: 'energy-efficiency-directive',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-aiact-eed' },
    provision: 'Art. 12(1)',
    quote:
      'By 15 May 2024 and every year thereafter, Member States shall require owners and operators of data centres in their territory with a power demand of the installed information technology (IT) of at least 500kW, to make the information set out in Annex VII publicly available',
    reading:
      'The EED can only OBSERVE data-centre load (reporting duty) while that load narrows the room under its own 763 Mtoe cap.',
  },
  // F-gas × EPBD heat pumps
  {
    id: 'int-fgas-epbd-a',
    policyId: 'f-gas-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-fgas-epbd' },
    provision: 'Recital (heat pumps)',
    quote:
      'The REPowerEU Plan includes a target to roll out 10 million hydronic heat pumps by 2027 and to double the rate of heat pump deployment by 2030, resulting in a total additional deployment of at least 30 million heat pumps by 2030.',
    reading:
      'The act itself records the tension: the HFC phase-down (Annex VII quota steps, equipment bans) must not outrun the refrigerant transition the heat-pump rollout depends on.',
  },
  {
    id: 'int-fgas-epbd-b',
    policyId: 'epbd-recast',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-fgas-epbd' },
    provision: 'Art. 1(1)',
    quote:
      'This Directive promotes the improvement of the energy performance of buildings and the reduction of greenhouse gas emissions from buildings within the Union, with a view to achieving a zero-emission building stock by 2050',
    reading:
      'The heating-decarbonisation pathway that requires mass heat-pump deployment on the same clock as the quota steps.',
  },
  // EuGB × Taxonomy
  {
    id: 'int-eugb-taxonomy-a',
    policyId: 'green-bonds-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-eugb-taxonomy' },
    provision: 'Arts. 4–8',
    quote: null,
    gloss:
      'Proceeds of bonds using the “European Green Bond” designation must be allocated to taxonomy-aligned economic activities before maturity.',
    reading:
      'The label is DEFINED as taxonomy-aligned use of proceeds — it imports the criteria wholesale, stability included.',
    textNote: NOTE_NOT_IN_LIBRARY,
  },
  {
    id: 'int-eugb-taxonomy-b',
    policyId: 'taxonomy-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-eugb-taxonomy' },
    provision: 'Art. 8(1)',
    quote:
      'Any undertaking which is subject to an obligation to publish non-financial information pursuant to Article 19a or Article 29a of Directive 2013/34/EU shall include in its non-financial statement or consolidated non-financial statement information on how and to what extent the undertaking’s activities are associated with economic activities that qualify as environmentally sustainable under Articles 3 and 9 of this Regulation.',
    reading:
      'The classification-and-disclosure machinery whose credibility the EuGB label rises and falls with.',
  },

  // EUDR prohibition × CAP coupled support
  {
    id: 'int-eudr-cap-a',
    policyId: 'deforestation-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-eudr-cap' },
    provision: 'Art. 3',
    quote:
      'Relevant commodities and relevant products shall not be placed or made available on the market or exported, unless all the following conditions are fulfilled: (a) they are deforestation-free; (b) they have been produced in accordance with the relevant legislation of the country of production; and (c) they are covered by a due diligence statement.',
    reading:
      'The prohibition covers soy and cattle (Annex I) — the imported feed base of the livestock systems CAP coupled support stabilises.',
  },
  {
    id: 'int-eudr-cap-b',
    policyId: 'cap-strategic-plans',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-eudr-cap' },
    provision: 'Art. 32(1)',
    quote:
      'Member States may grant coupled income support to active farmers under the conditions set out in this Subsection and as further specified in their CAP Strategic Plans.',
    reading:
      'The support that holds livestock volumes — and with them, demand for the feed supply chains the EUDR disciplines.',
  },
  // Batteries recycled content × CRMA recycling benchmark
  {
    id: 'int-batt-crma-a',
    policyId: 'batteries-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-batt-crma' },
    provision: 'Art. 8(1)',
    quote:
      'From 18 August 2028 or 24 months after the date of entry into force of the delegated act referred to in the third subparagraph, whichever is the latest, industrial batteries with a capacity greater than 2 kWh, except those with exclusively external storage, electric vehicle batteries and SLI batteries that contain cobalt, lead, lithium or nickel in active materials, shall be accompanied by documentation containing information about the percentage share of cobalt, lithium or nickel that is present in active materials and that has been recovered from battery manufacturing waste',
    reading:
      'The recycled-content documentation duty that disciplines the feedstock loop the CRMA recycling benchmark draws on.',
  },
  {
    id: 'int-batt-crma-b',
    policyId: 'critical-raw-materials-act',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-batt-crma' },
    provision: 'Recital (benchmarks) / Art. 5(1)(a)(iii)',
    quote:
      'Union recycling capacity should therefore be able to produce at least 25 % of the Union’s annual consumption of strategic raw materials and the Union should be able to recycle significantly increasing amounts of each strategic raw material from waste.',
    reading:
      'The 25 % recycling benchmark whose largest single feedstock stream is end-of-life and production-scrap batteries.',
  },
  // CO₂ cars ZEV mandate × Batteries Regulation
  {
    id: 'int-cars-batteries-a',
    policyId: 'co2-cars-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-cars-batteries' },
    provision: 'Art. 1(5a) (2023 amendment)',
    quote: null,
    gloss:
      'The 100 % ZEV step from 2035 creates the EV battery fleet whose footprint, recycled content and supply chains the Batteries Regulation governs.',
    reading: 'The demand side of the clean-battery pairing.',
    textNote: NOTE_CARS_2019,
  },
  {
    id: 'int-cars-batteries-b',
    policyId: 'batteries-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-cars-batteries' },
    provision: 'Art. 7(1)',
    quote:
      '18 February 2025 or 12 months after the date of entry into force either of the delegated act or of the implementing act respectively referred to in the fourth subparagraph, points (a) and (b), whichever is the latest, for electric vehicle batteries',
    reading:
      'The EV-battery carbon-footprint declaration that is supposed to make the mandated electrification clean — still waiting on its delegated acts.',
  },
  // IED ↔ ETS demarcation
  {
    id: 'int-ied-ets-a',
    policyId: 'industrial-emissions-directive',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-ied-ets' },
    provision: 'Art. 9(1)',
    quote:
      'Where emissions of a greenhouse gas from an installation are specified in Annex I to Directive 2003/87/EC in relation to an activity carried out in that installation, the permit shall not include an emission limit value for direct emissions of that gas, unless necessary to ensure that no significant local pollution is caused.',
    reading:
      'The demarcation clause itself: IED permits stand down on ETS-covered greenhouse gases so the carbon price does the GHG work — coherence by design.',
  },
  {
    id: 'int-ied-ets-b',
    policyId: 'eu-ets-directive',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-ied-ets' },
    provision: 'Art. 2(1)',
    quote:
      'This Directive shall apply to emissions from the activities listed in Annex I and greenhouse gases listed in Annex II.',
    reading:
      'The scope the IED demarcation is defined against — the same Annex I activity list partitions the two regimes.',
  },
  // TEN-T network × AFIR coverage
  {
    id: 'int-tent-afir-a',
    policyId: 'ten-t-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-tent-afir' },
    provision: 'Reg. 2024/1679 (network deadlines)',
    quote: null,
    gloss:
      'The TEN-T core network — with its binding 31 December 2030 completion deadline — is the map AFIR’s charging and refuelling targets are written onto.',
    reading: 'The network whose slippage propagates into the fuelling-infrastructure duties.',
    textNote: NOTE_TENT_STUB,
  },
  {
    id: 'int-tent-afir-b',
    policyId: 'afir-regulation',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-tent-afir' },
    provision: 'Art. 3(1)',
    quote:
      'Member States shall ensure that, in their territory, publicly accessible recharging stations dedicated to light-duty electric vehicles are deployed in a way that is commensurate with the uptake of light-duty electric vehicles and that they provide sufficient power output for those vehicles.',
    reading:
      'AFIR’s coverage duties (here the fleet formula; Arts. 3–6 add TEN-T corridor milestones) bind along the network TEN-T defines.',
  },
  // ESPR lead markets × NZIA manufacturing benchmark
  {
    id: 'int-espr-nzia-a',
    policyId: 'ecodesign-sustainable-products',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-espr-nzia' },
    provision: 'Art. 1(1)',
    quote:
      'This Regulation also establishes a digital product passport, provides for the setting of mandatory green public procurement requirements and creates a framework to prevent unsold consumer products from being destroyed.',
    reading:
      'Mandatory green procurement plus the steel/aluminium delegated acts of the 2025–30 working plan build the lead markets for clean EU-made materials.',
  },
  {
    id: 'int-espr-nzia-b',
    policyId: 'net-zero-industry-act',
    stepId: 'horizontal',
    assessment: { kind: 'interaction', interactionId: 'coh-int-espr-nzia' },
    provision: 'Art. 5(1)(a)',
    quote:
      'a benchmark of at least 40 % of the Union’s annual deployment needs for the corresponding technologies necessary to achieve the Union’s 2030 climate and energy targets',
    reading:
      'The supply-side benchmark those demand-side lead markets are meant to underwrite.',
  },

  // ═══ Step ④ · In-act targets behind the measured outcomes ═══════════════
  {
    id: 'outcome-eu-climate-law',
    policyId: 'eu-climate-law',
    stepId: 'evaluation',
    assessment: { kind: 'outcome' },
    provision: 'Art. 4(1)',
    quote:
      'In order to reach the climate-neutrality objective set out in Article 2(1), the binding Union 2030 climate target shall be a domestic reduction of net greenhouse gas emissions (emissions after deduction of removals) by at least 55 % compared to 1990 levels by 2030.',
    reading:
      'The target the pace ratio is computed against (index 45 by 2030 vs 1990 = 100).',
  },
  {
    id: 'outcome-eu-ets-directive',
    policyId: 'eu-ets-directive',
    stepId: 'evaluation',
    assessment: { kind: 'outcome' },
    provision: 'Art. 9 (as amended 2023)',
    quote: null,
    gloss:
      'The cap trajectory under the amended linear reduction factor implies a −62 % reduction of ETS emissions by 2030 vs 2005.',
    reading: 'The implied in-act target behind the verified-emissions pace ratio.',
    textNote: NOTE_ETS_2003,
  },
  {
    id: 'outcome-effort-sharing-regulation',
    policyId: 'effort-sharing-regulation',
    stepId: 'evaluation',
    assessment: { kind: 'outcome' },
    provision: 'Art. 4(1)',
    quote:
      'Each Member State shall, in 2030, limit its greenhouse gas emissions at least by the percentage set for that Member State in Annex I in relation to its greenhouse gas emissions in 2005, determined pursuant to paragraph 3 of this Article.',
    reading:
      'The Annex I percentages (−40 % aggregate after Reg. 2023/857) behind the ESR pace ratio.',
    textNote: NOTE_ESR_2018,
  },
  {
    id: 'outcome-lulucf-regulation',
    policyId: 'lulucf-regulation',
    stepId: 'evaluation',
    assessment: { kind: 'outcome' },
    provision: 'Art. 4(2)',
    quote:
      'The Union-wide target for net greenhouse gas removals shall be 310 million tonnes of CO2 equivalent as a sum of the Member State targets set out in Annex IIa for the year 2030, based on the average of its greenhouse gas inventory data for the years 2028, 2029 and 2030.',
    reading:
      'The −310 Mt target the sink trend is measured against — currently moving in the wrong direction.',
  },
  {
    id: 'outcome-renewable-energy-directive',
    policyId: 'renewable-energy-directive',
    stepId: 'evaluation',
    assessment: { kind: 'outcome' },
    provision: 'Art. 3(1) (RED III)',
    quote: null,
    gloss: 'The binding Union renewables share of at least 42.5 % of gross final energy consumption by 2030.',
    reading: 'The target behind the SHARES pace ratio.',
    textNote: NOTE_RED_II,
  },
  {
    id: 'outcome-energy-efficiency-directive',
    policyId: 'energy-efficiency-directive',
    stepId: 'evaluation',
    assessment: { kind: 'outcome' },
    provision: 'Art. 4(1)',
    quote:
      'Member States shall collectively ensure a reduction of energy consumption of at least 11,7 % in 2030 compared to the projections of the 2020 EU Reference Scenario so that the Union’s final energy consumption amounts to no more than 763 Mtoe.',
    reading: 'The 763 Mtoe cap behind the final-energy pace ratio.',
  },
  {
    id: 'outcome-co2-cars-regulation',
    policyId: 'co2-cars-regulation',
    stepId: 'evaluation',
    assessment: { kind: 'outcome' },
    provision: 'Art. 1(5) (2023 amendment)',
    quote: null,
    gloss:
      'From 2030 the EU fleet-wide target is a 55 % reduction for new passenger cars vs the 2021 baseline (≈ 51 g CO₂/km WLTP), en route to 100 % in 2035.',
    reading: 'The 2030 step behind the fleet-average pace ratio.',
    textNote: NOTE_CARS_2019,
  },
  {
    id: 'outcome-farm-to-fork-strategy',
    policyId: 'farm-to-fork-strategy',
    stepId: 'evaluation',
    assessment: { kind: 'outcome' },
    provision: 'COM(2020) 381, §2',
    quote: null,
    gloss: 'The strategy’s 2030 target of 25 % of the Union’s agricultural land under organic farming.',
    reading: 'The (non-binding) target behind the organic-share pace ratio.',
    textNote: NOTE_NOT_IN_LIBRARY,
  },
  {
    id: 'outcome-repowereu-plan',
    policyId: 'repowereu-plan',
    stepId: 'evaluation',
    assessment: { kind: 'outcome' },
    provision: 'COM(2022) 230',
    quote: null,
    gloss: 'The objective of ending dependence on Russian fossil fuels well before 2030.',
    reading: 'The phase-out objective behind the import-share pace ratio.',
    textNote: NOTE_NOT_IN_LIBRARY,
  },
];

// ── Lookups ─────────────────────────────────────────────────────────────────

export function evidenceForPolicy(policyId: string): PolicyTextEvidence[] {
  return COHERENCE_TEXT_EVIDENCE.filter(e => e.policyId === policyId);
}

export function evidenceForExAnte(policyId: string): PolicyTextEvidence[] {
  return COHERENCE_TEXT_EVIDENCE.filter(
    e => e.policyId === policyId && e.assessment.kind === 'ex-ante',
  );
}

export function evidenceForInteraction(interactionId: string): PolicyTextEvidence[] {
  return COHERENCE_TEXT_EVIDENCE.filter(
    e => e.assessment.kind === 'interaction' && e.assessment.interactionId === interactionId,
  );
}

export function evidenceForOutcome(policyId: string): PolicyTextEvidence[] {
  return COHERENCE_TEXT_EVIDENCE.filter(
    e => e.policyId === policyId && e.assessment.kind === 'outcome',
  );
}

/** Corpus-level provenance stats for the UI. */
export function coherenceEvidenceStats(): { total: number; verbatim: number; glossed: number } {
  const verbatim = COHERENCE_TEXT_EVIDENCE.filter(e => e.quote !== null).length;
  return {
    total: COHERENCE_TEXT_EVIDENCE.length,
    verbatim,
    glossed: COHERENCE_TEXT_EVIDENCE.length - verbatim,
  };
}

// ── In-text segment builder (master library) ────────────────────────────────
// Mirrors `buildChecklistSegmentsFor` in seed.ts: pure, anchored against the
// document's CURRENT blocks, deterministic `seg-coh-…` ids so the store can
// backfill and re-anchor them. Verbatim quotes are located exactly (whitespace
// and typographic-quote tolerant); anchors that don't resolve fall back to the
// cited article's block; documents without real legal text get nothing.

/** Whitespace/typography-normalised text plus a map back to raw offsets. */
function normalizeWithMap(raw: string): { norm: string; map: number[] } {
  let norm = '';
  const map: number[] = [];
  let lastWasSpace = true;
  for (let i = 0; i < raw.length; i++) {
    let ch = raw[i];
    if (/\s/.test(ch)) {
      if (lastWasSpace) continue;
      norm += ' ';
      map.push(i);
      lastWasSpace = true;
      continue;
    }
    if (ch === '’' || ch === '‘') ch = "'";
    else if (ch === '“' || ch === '”') ch = '"';
    else if (ch === '–' || ch === '—') ch = '-';
    norm += ch;
    map.push(i);
    lastWasSpace = false;
  }
  return { norm, map };
}

interface QuoteAnchor {
  block: Block;
  startChar: number;
  endChar: number;
  text: string;
}

/** Locate a verbatim quote inside the document's blocks (normalised match). */
function locateQuote(blocks: Block[], quote: string): QuoteAnchor | undefined {
  const q = normalizeWithMap(quote).norm.trim();
  if (q.length < 20) return undefined;
  for (const block of blocks) {
    const { norm, map } = normalizeWithMap(block.text);
    const idx = norm.indexOf(q);
    if (idx === -1) continue;
    const startChar = map[idx];
    const endChar = map[idx + q.length - 1] + 1;
    return { block, startChar, endChar, text: block.text.slice(startChar, endChar) };
  }
  return undefined;
}

/** First article/recital block a provision reference resolves to — the same
 *  heuristic as the checklist anchors in seed.ts. */
function findProvisionBlock(blocks: Block[], provision: string): Block | undefined {
  const substantive = (hit: Block): Block => {
    if (hit.text.length >= 160) return hit;
    const next = blocks.find(b => b.order === hit.order + 1);
    if (next && next.kind !== 'article' && next.kind !== 'heading' && next.text.length > hit.text.length) {
      return next;
    }
    return hit;
  };
  const artRefs = [...provision.matchAll(/Art(?:icle)?s?\.?\s*(\d+[a-z]?)/gi)].map(m =>
    m[1].toLowerCase(),
  );
  for (const ref of artRefs) {
    const re = new RegExp(`^Article\\s+${ref}\\b`, 'i');
    const hit = blocks.find(b => b.kind === 'article' && re.test(b.text));
    if (hit) return substantive(hit);
  }
  const recRefs = [...provision.matchAll(/recitals?\s+(\d+)/gi)].map(m => m[1]);
  for (const ref of recRefs) {
    const hit = blocks.find(b => b.kind === 'recital' && b.text.startsWith(`(${ref})`));
    if (hit) return hit;
  }
  return undefined;
}

const EXANTE_STATUS_LABEL: Record<string, string> = {
  valid: 'Valid',
  'under-pressure': 'Under pressure',
  violated: 'Violated',
};

/** Tag-comment text for a curated anchor — step, grade and the reading, so
 *  the workbench shows the full chain: passage → rule → grade. */
function noteFor(ev: PolicyTextEvidence): string {
  const step = COHERENCE_STEP_BY_ID[ev.stepId];
  const head = `${step.name} (step ${step.ordinal})`;
  if (ev.assessment.kind === 'ex-ante') {
    const a = EX_ANTE_ASSESSMENTS[ev.policyId];
    const status = a ? ` — ${EXANTE_STATUS_LABEL[a.status]}` : '';
    const assumption = a ? ` Assumption (${a.designYear}): ${a.assumption}` : '';
    return `${head}${status} · ${ev.provision}. ${ev.reading}${assumption}`;
  }
  if (ev.assessment.kind === 'interaction') {
    const interactionId = ev.assessment.interactionId;
    const i = GOAL_INTERACTIONS.find(x => x.id === interactionId);
    if (i) {
      const other = i.a === ev.policyId ? i.b : i.a;
      const scale = INTERACTION_SCALE[i.score];
      const score = i.score > 0 ? `+${i.score}` : `${i.score}`;
      return `${head} — ${score} ${scale.name} with ${titleOf(other)} via ${i.mechanism} · ${ev.provision}. ${ev.reading}`;
    }
    return `${head} · ${ev.provision}. ${ev.reading}`;
  }
  // outcome
  const evaln = evaluationCoherence(ev.policyId);
  const m = evaln.measurement;
  const pace = m
    ? ` — ${m.pace.reading.replace('-', ' ')} (pace ratio ${m.pace.ratio === null ? '—' : m.pace.ratio.toFixed(2)}; ${m.latest.value} ${m.unit} in ${m.latest.year} vs ${m.target.value} by ${m.target.year})`
    : '';
  return `${head}${pace} · ${ev.provision}. ${ev.reading}`;
}

const VERDICT_LABEL: Record<string, string> = {
  met: 'met',
  partial: 'partial',
  'not-met': 'not met',
  'not-applicable': 'n/a',
};

/**
 * Coherence annotations for one policy document, anchored against its CURRENT
 * blocks. Curated steps ① ② ④ come from COHERENCE_TEXT_EVIDENCE (verbatim
 * quotes located exactly, else the cited article block); steps ③ and ④'s
 * machinery are DERIVED from the objective–delivery checklist roll-ups and
 * anchored on the same cited provisions — never re-assessed here.
 */
export function buildCoherenceSegmentsFor(
  doc: AnalysisDocument,
  codeNameById: Map<string, string>,
  now: string,
): CodedSegment[] {
  if (!doc.blocks || doc.blocks.length === 0) return [];
  if (!doc.blocks.some(b => b.kind === 'article')) return [];
  const out: CodedSegment[] = [];

  // Curated anchors (steps ① ② ④).
  for (const ev of evidenceForPolicy(doc.id)) {
    if (ev.quote === null) continue; // not in the shipped text — nothing to pin
    let anchor = locateQuote(doc.blocks, ev.quote);
    if (!anchor) {
      const block = findProvisionBlock(doc.blocks, ev.provision);
      if (!block) continue;
      const text = block.text.length > 600 ? block.text.slice(0, 600) : block.text;
      anchor = { block, startChar: 0, endChar: text.length, text };
    }
    out.push({
      id: `seg-coh-${ev.id}`,
      documentId: doc.id,
      codeId: coherenceCodeId(ev.stepId),
      blockId: anchor.block.id,
      startChar: anchor.startChar,
      endChar: anchor.endChar,
      text: anchor.text,
      note: noteFor(ev),
      noteAuthor: 'Coherence assessment',
      projectId: null,
      createdAt: now,
    });
  }

  // Derived step ③ (goals ↔ means): one roll-up segment per policy, anchored
  // on the provision the instruments criterion (or the first resolvable
  // means criterion) cites in the checklist.
  const means = meansCoherence(doc.id);
  if (means.score !== null && means.entries.length > 0) {
    const anchorEntry =
      means.entries.find(e => e.codeId === 'check-instruments') ?? means.entries[0];
    const block = findProvisionBlock(doc.blocks, anchorEntry.rationale);
    if (block) {
      const text = block.text.length > 600 ? block.text.slice(0, 600) : block.text;
      const verdicts = means.entries
        .map(e => `${codeNameById.get(e.codeId) ?? e.codeId}: ${VERDICT_LABEL[e.verdict]}`)
        .join(' · ');
      out.push({
        id: `seg-coh-${doc.id}-means`,
        documentId: doc.id,
        codeId: 'coh-means',
        blockId: block.id,
        startChar: 0,
        endChar: text.length,
        text,
        note: `Between policy goals and means of implementation (step 3) — ${Math.round(means.score * 100)} % means coherence (${means.grade}). Derived from the objective–delivery checklist, never re-assessed: ${verdicts}.`,
        noteAuthor: 'Coherence assessment',
        projectId: null,
        createdAt: now,
      });
    }
  }

  // Derived step ④ machinery (MRV + review), anchored on the monitoring (or
  // review) provision the checklist cites. The measured outcome itself is
  // covered by the curated `outcome-*` anchors above.
  const evaln = evaluationCoherence(doc.id);
  if (evaln.machinery.entries.length > 0) {
    const anchorEntry =
      evaln.machinery.entries.find(e => e.codeId === 'check-monitoring') ??
      evaln.machinery.entries[0];
    const block = findProvisionBlock(doc.blocks, anchorEntry.rationale);
    if (block) {
      const text = block.text.length > 600 ? block.text.slice(0, 600) : block.text;
      const verdicts = evaln.machinery.entries
        .map(e => `${codeNameById.get(e.codeId) ?? e.codeId}: ${VERDICT_LABEL[e.verdict]}`)
        .join(' · ');
      out.push({
        id: `seg-coh-${doc.id}-machinery`,
        documentId: doc.id,
        codeId: 'coh-evaluation',
        blockId: block.id,
        startChar: 0,
        endChar: text.length,
        text,
        note: `Policy evaluation: measuring policy change and outcomes (step 4) — evaluation machinery, derived from the objective–delivery checklist: ${verdicts}.`,
        noteAuthor: 'Coherence assessment',
        projectId: null,
        createdAt: now,
      });
    }
  }

  return out;
}
