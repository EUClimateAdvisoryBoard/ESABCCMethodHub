/**
 * Recommendations from the ESABCC report
 * "Towards EU climate neutrality: progress, policy gaps and opportunities"
 * (January 2024).
 * https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities
 *
 * The seed below encodes the full recommendation set the report puts forward:
 *   • the **13 Key recommendations** (KR1–KR13) from the executive summary, and
 *   • all **55 detailed sectoral recommendations** (E1–S2), coded by chapter
 *     (E energy supply, I industry, T transport, B buildings, A agriculture &
 *     food, L LULUCF & adaptation, C pricing & removals, W fairness/wellbeing,
 *     F investment & finance, G governance, S labour/skills/just transition).
 *
 * That is **68 recommendations** in total. They are exported as three arrays —
 * `ESABCC_2024_KEY_RECOMMENDATIONS`, `ESABCC_2024_SECTORAL_RECOMMENDATIONS` and
 * the combined `ESABCC_2024_RECOMMENDATIONS` (key + sectoral) used to seed the
 * tracker. The separate June 2023 2040-target advice is exported below as
 * `ESABCC_2023_2040_TARGET_ADVICE`.
 *
 * Source markdown used to compile this seed:
 *   esabcc-reports/2024-01-18-towards-eu-climate-neutrality-tracker-source.md
 *
 * Status assessment date: 2026-06-01.
 *
 * Status semantics:
 *   - not-addressed:  no EU legislative response (or proposal blocked/withdrawn)
 *   - in-progress:    proposals / processes underway, not yet concluded
 *   - partially:      core elements legislated, material gaps remain
 *   - addressed:      recommendation substantively enacted in binding EU law
 *
 * "uptakeEvents" is intentionally a free-form list of dated text notes so
 * Secretariat users can record updates without schema changes.
 */

export type RecommendationStatus =
  | 'not-addressed'
  | 'in-progress'
  | 'partially'
  | 'addressed';

export interface UptakeEvent {
  /** Present when the event was loaded from the database. Seed events have none. */
  id?: string;
  date: string;       // ISO date
  note: string;
  sourceUrl?: string;
}

/** Source ESABCC report a recommendation is drawn from (rendered as a label). */
export interface RecommendationReport {
  /** Stable slug identifying the report. */
  id: string;
  /** Short chip label, e.g. "Towards EU climate neutrality (Jan 2024)". */
  label: string;
  /** Canonical URL for the report. */
  url: string;
}

/**
 * Known ESABCC reports recommendations are tagged with. Keyed by report id so
 * seeds and the UI share one source of truth; add an entry here when tracking
 * advice from a new publication.
 */
export const RECOMMENDATION_REPORTS = {
  'acer-energy-infrastructure-2022': {
    id: 'acer-energy-infrastructure-2022',
    label: 'Recommendations to ACER on energy infrastructure (Nov 2022)',
    url: 'https://climate-advisory-board.europa.eu/reports-and-publications/towards-a-climate-neutral-and-climate-resilient-eu-energy-infrastructure-recommendations-to-acer',
  },
  'scenario-guidelines-2022': {
    id: 'scenario-guidelines-2022',
    label: 'Advice on TEN-E scenario guidelines (Nov 2022)',
    url: 'https://climate-advisory-board.europa.eu/reports-and-publications',
  },
  'climate-targets-2023': {
    id: 'climate-targets-2023',
    label: 'Initial advice on climate targets (Jan 2023)',
    url: 'https://climate-advisory-board.europa.eu/reports-and-publications/setting-climate-targets-based-on-scientific-evidence-and-eu-values-initial-recommendations-to-the-european-commission',
  },
  'energy-crisis-2023': {
    id: 'energy-crisis-2023',
    label: 'Energy-crisis policy responses (Feb 2023)',
    url: 'https://climate-advisory-board.europa.eu/reports-and-publications/addressing-the-energy-crisis-while-delivering-on-eus-climate-objectives-recommendations-to-policy-makers',
  },
  'decarbonised-energy-infrastructure-2023': {
    id: 'decarbonised-energy-infrastructure-2023',
    label: 'Energy infrastructure CBA advice (Mar 2023)',
    url: 'https://climate-advisory-board.europa.eu/reports-and-publications/towards-a-decarbonised-and-climate-resilient-eu-energy-infrastructure-recommendations-on-an-energy-system-wide-cost-benefit-analysis',
  },
  '2040-target-advice-2023': {
    id: '2040-target-advice-2023',
    label: 'Scientific advice on the EU 2040 climate target (June 2023)',
    url: 'https://climate-advisory-board.europa.eu/reports-and-publications/scientific-advice-for-the-determination-of-an-eu-wide-2040',
  },
  'towards-eu-climate-neutrality-2024': {
    id: 'towards-eu-climate-neutrality-2024',
    label: 'Towards EU climate neutrality (Jan 2024)',
    url: 'https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities',
  },
  'ten-e-draft-scenarios-2024': {
    id: 'ten-e-draft-scenarios-2024',
    label: 'TEN-E draft scenarios advice (Jun 2024)',
    url: 'https://climate-advisory-board.europa.eu/reports-and-publications/towards-climate-neutral-and-resilient-energy-networks-across-europe-advice-on-draft-scenarios-under-the-eu-regulation-on-trans-european-energy-networks',
  },
  'carbon-removals-2025': {
    id: 'carbon-removals-2025',
    label: 'Scaling up carbon dioxide removals (Feb 2025)',
    url: 'https://climate-advisory-board.europa.eu/reports-and-publications/scaling-up-carbon-dioxide-removals-recommendations-for-navigating-opportunities-and-risks-in-the-eu',
  },
  'climate-law-amendment-2025': {
    id: 'climate-law-amendment-2025',
    label: 'Advice on amending the European Climate Law (Jun 2025)',
    url: 'https://climate-advisory-board.europa.eu/reports-and-publications',
  },
  'adaptation-2026': {
    id: 'adaptation-2026',
    label: 'EU adaptation policy framework (Feb 2026)',
    url: 'https://climate-advisory-board.europa.eu/reports-and-publications',
  },
  'agri-food-2026': {
    id: 'agri-food-2026',
    label: 'Agri-food system recommendations (Mar 2026)',
    url: 'https://climate-advisory-board.europa.eu/reports-and-publications/climate-adaptation-and-mitigation-in-the-agri-food-system-recommendations-for-coherent-eu-policies',
  },
} as const satisfies Record<string, RecommendationReport>;

/**
 * Cross-cutting sector tags layered on top of the source-report label.
 * Unlike `area` (the report's own chapter coding) these are workspace tags the
 * Secretariat applies so a recommendation can surface in a sector-focused
 * project (e.g. the Industry Project) regardless of which chapter it sits in.
 * The list is a suggestion set for the tag picker — tags are stored free-form.
 */
export const RECOMMENDATION_TAG_OPTIONS = [
  'industry',
  'energy-supply',
  'transport',
  'buildings',
  'agriculture',
  'lulucf',
  'carbon-pricing',
  'finance',
  'governance',
  'fairness',
] as const;
export type RecommendationTag = (typeof RECOMMENDATION_TAG_OPTIONS)[number];

export interface PastRecommendation {
  id: string;
  /** Chapter / area of the 2024 report. */
  area: string;
  title: string;
  summary: string;
  status: RecommendationStatus;
  uptakeEvents: UptakeEvent[];
  /** Source report the recommendation comes from. Optional for legacy rows. */
  report?: RecommendationReport;
  /**
   * Workspace sector tags (free-form). Used to surface a recommendation in a
   * sector-focused project — e.g. the Industry Project tracks every
   * recommendation tagged `industry`. Empty / absent on untagged rows.
   */
  tags?: string[];
}

/**
 * Industry-sector tags applied to the 2024 recommendations, keyed by id.
 * Taken in the *wider* sense of industrial decarbonisation: the Industry
 * chapter (I1–I3) plus the cross-chapter recommendations that drive it —
 * carbon pricing / leakage protection (ETS, CBAM, free allocation), hydrogen
 * and CCU/CCS for industry, clean-tech R&D and value chains, and material
 * demand / circular economy. Edit here (or via the tracker UI) to retag.
 */
const RECOMMENDATION_TAGS: Record<string, RecommendationTag[]> = {
  // Key recommendations touching industrial decarbonisation
  'kr3-renewables-investment-outlook': ['industry', 'energy-supply'],
  'kr7-ets-fit-for-net-zero': ['industry', 'carbon-pricing'],
  'kr10-target-ccs-hydrogen-bioenergy': ['industry', 'energy-supply'],
  'kr12-energy-material-demand-reduction': ['industry'],
  // Energy-supply chapter recommendations with an industrial end use
  'e6-hydrogen-targeting': ['industry', 'energy-supply'],
  'e7-ccus-targeting': ['industry', 'energy-supply'],
  'e8-rd-allocation-review': ['industry', 'energy-supply'],
  // Industry chapter (I1–I3)
  'i1-circular-economy-ceap2': ['industry'],
  'i2-carbon-leakage-alternatives': ['industry', 'carbon-pricing'],
  'i3-low-emission-industrial-tech': ['industry'],
  // Pricing & removals — carbon-leakage protection / CBAM revenue
  'c2-free-allocation-alternatives': ['industry', 'carbon-pricing'],
  'c6-expand-climate-revenue': ['industry', 'carbon-pricing'],
};

const ESABCC_2024_KEY_RECOMMENDATIONS_BASE: PastRecommendation[] = [
  {
    id: 'kr1-necps-implementation',
    area: 'KR1 · 2030 target',
    title:
      'Member States adopt and implement strong national measures (NECPs); ' +
      'Commission to enforce Governance Regulation compliance',
    summary:
      'Close the gap to the −55% 2030 target through final NECPs (due 30 June 2024) ' +
      'and rigorous Commission follow-up under the Governance Regulation. ' +
      'Primary instruments: Governance Reg (EU) 2018/1999; ESR amendment 2023/857; ' +
      'LULUCF amendment 2023/839; RED III 2023/2413; EED recast 2023/1791.',
    status: 'in-progress',
    uptakeEvents: [
      {
        date: '2023-12-18',
        note:
          'Commission EU-wide assessment of the draft updated NECPs published, ' +
          'identifying significant gaps versus the 2030 collective targets. ' +
          '(EU-wide assessment of the final NECPs followed on 28 May 2025.)',
      },
      {
        date: '2024-06-30',
        note:
          'Final updated NECPs deadline under Governance Reg (EU) 2018/1999; ' +
          'submissions late and uneven across Member States.',
        sourceUrl:
          'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018R1999',
      },
    ],
  },
  {
    id: 'kr2-adopt-pending-greendeal',
    area: 'KR2 · 2030 target',
    title: 'Adopt the pending Green Deal legislation, especially the Energy Taxation Directive',
    summary:
      'Most Fit-for-55 files have been adopted, but the Energy Taxation Directive ' +
      'revision (COM(2021) 563) is still pending and remains the single unadopted ' +
      'FF55 proposal. Without it, aviation/maritime/commercial fuel-tax exemptions ' +
      'persist and price signals stay misaligned with climate goals.',
    status: 'partially',
    uptakeEvents: [
      {
        date: '2024-05-13',
        note: 'CO₂ standards for heavy-duty vehicles adopted: Regulation (EU) 2024/1610.',
        sourceUrl:
          'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1610',
      },
      {
        date: '2025-11-13',
        note:
          'ECOFIN failed to reach unanimity on the ETD revision; Council compromise ' +
          'rejected. The ETD remains blocked.',
      },
    ],
  },
  {
    id: 'kr3-renewables-investment-outlook',
    area: 'KR3 · 2030 target',
    title: 'Provide a stable investment outlook for renewables through legislation and implementation',
    summary:
      'Deliver the Electricity Market Design reform, Net-Zero Industry Act and ' +
      'Critical Raw Materials Act, and implement RED III + REPowerEU. Named files ' +
      'are now adopted; permitting and grid build-out remain the binding constraints. ' +
      'Map: Reg (EU) 2024/1747 + Dir 2024/1711 (EMD); Reg 2024/1735 (NZIA); ' +
      'Reg 2024/1252 (CRMA); Dir (EU) 2023/2413 (RED III).',
    status: 'partially',
    uptakeEvents: [
      {
        date: '2024-06-13',
        note: 'Net-Zero Industry Act adopted: Regulation (EU) 2024/1735.',
        sourceUrl:
          'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1735',
      },
      {
        date: '2024-06-13',
        note: 'Electricity Market Design reform adopted: Reg (EU) 2024/1747 and Dir (EU) 2024/1711.',
      },
      {
        date: '2024-04-11',
        note: 'Critical Raw Materials Act adopted: Regulation (EU) 2024/1252.',
        sourceUrl:
          'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1252',
      },
    ],
  },
  {
    id: 'kr4-phase-out-ff-subsidies',
    area: 'KR4 · 2030 target',
    title: 'Phase out fossil-fuel subsidies in line with existing commitments',
    summary:
      'Few Member States have set firm phase-out trajectories; fossil-fuel subsidies ' +
      'persisted or rebounded during the 2022–24 energy crisis. No EU-wide deadline ' +
      'has been enacted. NECP obligation (Governance Reg Art. 25) underused.',
    status: 'in-progress',
    uptakeEvents: [
      {
        date: '2024-09-15',
        note:
          'State of the Energy Union 2024 report reiterates phase-out objective ' +
          'but without binding timeline.',
      },
    ],
  },
  {
    id: 'kr5-policy-consistency-climate-neutrality',
    area: 'KR5 · Climate neutrality',
    title: 'Make EU policies fully consistent with climate-neutrality and a fossil-fuel phase-out',
    summary:
      'Article 6(4) Climate Law consistency checks are not yet systematic across ' +
      'delegated/implementing acts, TEN-E project lists, the EU Taxonomy, the ' +
      'Industrial Emissions Directive and State-aid frameworks. Inconsistent signals ' +
      'remain (e.g. continued gas-infra eligibility in some contexts).',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'kr6-strengthen-governance',
    area: 'KR6 · Governance',
    title: 'Strengthen climate governance and compliance frameworks',
    summary:
      'Move toward iterative review of long-term strategies, mandatory national ' +
      'climate advisory bodies, and stronger ESR/LULUCF compliance mechanisms. ' +
      'These changes require revisions to the Governance Regulation and the ' +
      'European Climate Law that have not yet been legislated.',
    status: 'partially',
    uptakeEvents: [],
  },
  {
    id: 'kr7-ets-fit-for-net-zero',
    area: 'KR7 · Carbon pricing',
    title: 'Make the two emissions trading systems fit for net zero',
    summary:
      'Develop a cap → zero strategy for ETS1, control ETS2 prices around the €45 ' +
      'reference, plan ETS1/ETS2 convergence, and replace free allocation with ' +
      'alternative carbon-leakage protection beyond CBAM. The 2026 ETS review is ' +
      'the next decision point. Map: Dir (EU) 2023/959; Reg (EU) 2023/956 (CBAM).',
    status: 'partially',
    uptakeEvents: [
      {
        date: '2023-06-05',
        note:
          'ETS revision entered into force, creating ETS2 for road transport and ' +
          'buildings (originally operational 2027): Dir (EU) 2023/959.',
        sourceUrl:
          'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L0959',
      },
      {
        date: '2025-11-13',
        note:
          'ETS2 start postponed from 2027 to 2028 (Environment Council 5 Nov ' +
          '2025; Parliament agreed 13 Nov 2025), alongside the 2040 climate-' +
          'target deal.',
        sourceUrl:
          'https://climate.ec.europa.eu/eu-action/carbon-markets/ets2-buildings-road-transport-and-additional-sectors_en',
      },
    ],
  },
  {
    id: 'kr8-impact-assessment-just-transition',
    area: 'KR8 · Fairness',
    title:
      'Base policies on systematic impact assessment and ex-post evaluation, ' +
      'with a just-transition lens',
    summary:
      'Embed distributional analysis (households, regions, workers) in every climate ' +
      'file, with transparent methodology and public consultation. The Social Climate ' +
      'Fund and Just Transition Fund are in place, but systematic distributional IA ' +
      'is not yet standard across the Fit-for-55 and post-2030 packages.',
    status: 'in-progress',
    uptakeEvents: [
      {
        date: '2023-06-05',
        note:
          'Social Climate Fund Regulation (EU) 2023/955 entered into force; ' +
          'Member State plans due 30 June 2025; fund operational from 2026.',
        sourceUrl:
          'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0955',
      },
    ],
  },
  {
    id: 'kr9-agriculture-food-incentives',
    area: 'KR9 · Agriculture',
    title: 'Provide stronger incentives for agriculture and food, including via CAP revision',
    summary:
      'Add a standalone emission-reduction objective to the CAP, prepare a pricing ' +
      'instrument for agricultural emissions at source, and incentivise healthier/ ' +
      'plant-based diets. The post-2027 CAP proposal is in negotiation but contains ' +
      'no standalone agri emission target and no agri pricing instrument.',
    status: 'not-addressed',
    uptakeEvents: [],
  },
  {
    id: 'kr10-target-ccs-hydrogen-bioenergy',
    area: 'KR10 · Removals & fuels',
    title: 'Target CCU/CCS, hydrogen and bioenergy at no- or limited-alternative uses',
    summary:
      'The Industrial Carbon Management Strategy (COM(2024) 62) sets the direction, ' +
      'but binding rules that channel CCU/CCS, hydrogen and bioenergy to genuinely ' +
      'hard-to-abate uses remain partial across RED III and end-use legislation.',
    status: 'in-progress',
    uptakeEvents: [
      {
        date: '2024-02-06',
        note: 'Industrial Carbon Management Strategy published: COM(2024) 62 final.',
        sourceUrl:
          'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52024DC0062',
      },
    ],
  },
  {
    id: 'kr11-scale-climate-investment',
    area: 'KR11 · Finance',
    title: 'Scale public and private climate investment',
    summary:
      'Close the climate-investment gap by reforming MFF tracking, considering a ' +
      'continuation of the RRF common-debt approach beyond 2026, and aligning the ' +
      'EU Taxonomy with the 2040 pathway. The RRF ends 2026 and no successor ' +
      'common-debt instrument has been confirmed; post-2027 MFF in negotiation.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'kr12-energy-material-demand-reduction',
    area: 'KR12 · Demand-side',
    title: 'Pursue more ambitious energy- and material-demand reduction',
    summary:
      'Strengthen the Energy Efficiency Directive in practice, deliver the Circular ' +
      'Economy Action Plan 2 in full, and address transport demand and food-system ' +
      'sufficiency. Demand-side and sufficiency policy remains the weakest area; ' +
      'many initiatives are voluntary or unproposed.',
    status: 'not-addressed',
    uptakeEvents: [],
  },
  {
    id: 'kr13-expand-ghg-pricing-and-removal-incentives',
    area: 'KR13 · Pricing & removals',
    title:
      'Expand GHG pricing to all major sectors and create EU-level incentives ' +
      'for removals',
    summary:
      'Extend pricing to agriculture/food, LULUCF and upstream fossil emissions, ' +
      'and create EU-level incentives for permanent and land-based removals. The ' +
      'Carbon Removals Certification Framework (Reg (EU) 2024/3012) addresses the ' +
      'certification leg only; no GHG pricing for agri/LULUCF and no upstream-fossil ' +
      'border adjustment have been proposed.',
    status: 'partially',
    uptakeEvents: [
      {
        date: '2024-12-26',
        note:
          'Carbon Removals and Carbon Farming Regulation (EU) 2024/3012 in force; ' +
          'methodologies via delegated acts; registry by 2028.',
        sourceUrl:
          'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R3012',
      },
      {
        date: '2024-08-04',
        note:
          'EU Methane Regulation (EU) 2024/1787 entered into force (OJ ' +
          'publication 15 July 2024); implementing acts pending.',
        sourceUrl:
          'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1787',
      },
    ],
  },
];

// ───────────────────────────────────────────────────────────────────────────
// 55 detailed sectoral recommendations (E1–S2)
//
// These are the report's chapter-level recommendations, one block per
// analytical chapter. The operative ask is paraphrased from the report; the
// summary records the primary mapped instrument(s) and the rationale for the
// status assessment (as of 2026-06-01). uptakeEvents are intentionally left
// empty here — the dated legislative milestones live on the Key recommendations
// that aggregate them — and can be appended through the tracker UI.
//
// Status mapping from the source markdown's labels:
//   Addressed → 'addressed' · Partially addressed → 'partially'
//   In progress → 'in-progress' · Not addressed (incl. "blocked", "weak",
//   "post-2030", "undecided") → 'not-addressed'.
// ───────────────────────────────────────────────────────────────────────────

const ESABCC_2024_SECTORAL_RECOMMENDATIONS_BASE: PastRecommendation[] = [
  // ── Energy supply (E) ────────────────────────────────────────────────────
  {
    id: 'e1-net-zero-policy-alignment',
    area: 'E1 · Energy supply',
    title:
      'Align EU policy practice (esp. cross-border infrastructure scenarios) ' +
      'with net-zero pathways; near-full fossil-fuel phase-out from power and ' +
      'heat by 2040',
    summary:
      'Bring TEN-E infrastructure planning, the Industrial Emissions Directive, ' +
      'State-aid rules and the EU Taxonomy into line with net-zero pathways, ' +
      'targeting a near-complete fossil-fuel phase-out from power and heat by ' +
      '2040. Map: TEN-E Reg (EU) 2022/869; IED; State aid; Taxonomy. ' +
      'Scenario/consistency practice is not yet systematically net-zero aligned.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'e2-efficiency-targets-awareness',
    area: 'E2 · Energy supply',
    title:
      'Hit 2030 energy-efficiency targets; raise public awareness and common ' +
      'measurement of energy efficiency',
    summary:
      'Deliver the 2030 efficiency targets and improve common measurement and ' +
      'public awareness of energy efficiency. Map: Energy Efficiency Directive ' +
      'recast Dir (EU) 2023/1791. Directive in force; delivery against targets ' +
      'still maturing.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'e3-efficiency-first-mandatory',
    area: 'E3 · Energy supply',
    title:
      'Make "energy efficiency first" mandatory for infrastructure projects; ' +
      'lower the EED Article 3 investment threshold',
    summary:
      'Require the "energy efficiency first" principle for infrastructure ' +
      'decisions and lower the EED Article 3 investment threshold so it bites. ' +
      'Map: EED recast Dir (EU) 2023/1791. The principle is anchored but its ' +
      'mandatory application to infrastructure remains partial.',
    status: 'partially',
    uptakeEvents: [],
  },
  {
    id: 'e4-renewables-growth-support',
    area: 'E4 · Energy supply',
    title:
      'Adopt and implement renewables-growth policies without delay; provide ' +
      'stable, long-term, balanced support schemes',
    summary:
      'Implement renewables growth with stable, long-term and balanced support. ' +
      'Map: RED III Dir (EU) 2023/2413; Electricity Market Design Reg (EU) ' +
      '2024/1747; Net-Zero Industry Act. Headline files adopted; support-scheme ' +
      'stability and permitting still maturing.',
    status: 'partially',
    uptakeEvents: [],
  },
  {
    id: 'e5-system-integration-flexibility',
    area: 'E5 · Energy supply',
    title:
      'Improve energy-system integration; deliver direct-electrification and ' +
      'non-fossil flexibility policies',
    summary:
      'Advance system integration with direct electrification and non-fossil ' +
      'flexibility. Map: Electricity Market Design Reg (EU) 2024/1747 and Dir ' +
      '(EU) 2024/1711; EU Action Plan for Grids. Framework adopted; grid build-' +
      'out and flexibility delivery underway.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'e6-hydrogen-targeting',
    area: 'E6 · Energy supply',
    title:
      'Better target hydrogen to hard-to-electrify uses (industry, aviation, ' +
      'shipping)',
    summary:
      'Channel hydrogen toward genuinely hard-to-electrify end uses. Map: ' +
      'Hydrogen & decarbonised gas market package; RED III Dir (EU) 2023/2413. ' +
      'Framework emerging; binding end-use targeting still partial.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'e7-ccus-targeting',
    area: 'E7 · Energy supply',
    title: 'Target CCU/CCS at no- or limited-alternative applications',
    summary:
      'Direct carbon capture, use and storage to applications with no or ' +
      'limited low-carbon alternatives. Map: Industrial Carbon Management ' +
      'Strategy COM(2024) 62; Net-Zero Industry Act Reg (EU) 2024/1735. ' +
      'Strategy published; legislative targeting still partial.',
    status: 'in-progress',
    uptakeEvents: [
      {
        date: '2024-02-06',
        note: 'Industrial Carbon Management Strategy published: COM(2024) 62 final.',
        sourceUrl:
          'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52024DC0062',
      },
    ],
  },
  {
    id: 'e8-rd-allocation-review',
    area: 'E8 · Energy supply',
    title:
      'Review R&D allocation across technologies by expected energy-mix ' +
      'contribution; build value chains and skills',
    summary:
      'Align research-and-development funding with each technology’s expected ' +
      'contribution to the future energy mix, and build supporting value chains ' +
      'and skills. Map: Innovation Fund; Horizon Europe. Instruments exist; ' +
      'allocation review not yet systematic.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'e9-upstream-fossil-emissions',
    area: 'E9 · Energy supply',
    title:
      'Address upstream fossil-fuel emissions (domestic and imports); build on ' +
      'the Methane Regulation; consider ETS extension to fugitive emissions and ' +
      'an import border adjustment',
    summary:
      'Tackle upstream fossil emissions for both domestic production and ' +
      'imports, building on the Methane Regulation and considering an ETS ' +
      'extension to fugitive emissions plus an import border adjustment. Map: ' +
      'Methane Reg (EU) 2024/1787. Methane Reg in force; pricing/border-' +
      'adjustment extension not yet proposed.',
    status: 'partially',
    uptakeEvents: [
      {
        date: '2024-08-04',
        note:
          'EU Methane Regulation (EU) 2024/1787 entered into force (OJ ' +
          'publication 15 July 2024); implementing acts pending.',
        sourceUrl:
          'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1787',
      },
    ],
  },

  // ── Industry (I) ─────────────────────────────────────────────────────────
  {
    id: 'i1-circular-economy-ceap2',
    area: 'I1 · Industry',
    title:
      'Complete the CEAP2 legislative actions without weakening, to accelerate ' +
      'the circular economy',
    summary:
      'Finish the second Circular Economy Action Plan agenda without dilution to ' +
      'speed up circularity. Map: CEAP2 files; Ecodesign for Sustainable ' +
      'Products Reg (EU) 2024/1781. Several files adopted; the package is not ' +
      'yet complete.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'i2-carbon-leakage-alternatives',
    area: 'I2 · Industry',
    title:
      'Develop alternatives to free allocation for carbon-leakage protection; ' +
      'monitor and expand the scope of CBAM',
    summary:
      'Replace free allocation over time with alternative carbon-leakage ' +
      'protection, while monitoring and widening CBAM coverage. Map: CBAM Reg ' +
      '(EU) 2023/956; ETS Dir (EU) 2023/959. Transition begun; alternatives and ' +
      'scope expansion still under development.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'i3-low-emission-industrial-tech',
    area: 'I3 · Industry',
    title:
      'Sustain support for low-emission industrial technology at every TRL ' +
      '(Innovation Fund, CEAP2)',
    summary:
      'Maintain continuous support for low-emission industrial technologies ' +
      'across all technology-readiness levels. Map: Innovation Fund; Net-Zero ' +
      'Industry Act Reg (EU) 2024/1735. Instruments in place; sustained, full-' +
      'TRL coverage still developing.',
    status: 'in-progress',
    uptakeEvents: [],
  },

  // ── Transport (T) ────────────────────────────────────────────────────────
  {
    id: 't1-curb-transport-demand',
    area: 'T1 · Transport',
    title: 'Curb overall transport-demand growth (e.g. through spatial planning)',
    summary:
      'Restrain growth in overall transport demand, e.g. via spatial planning. ' +
      'Map: no dedicated EU transport-demand policy. Largely a Member State ' +
      'competence; no EU instrument addresses it.',
    status: 'not-addressed',
    uptakeEvents: [],
  },
  {
    id: 't2-modal-shift',
    area: 'T2 · Transport',
    title:
      'Support modal shift; remove non-market barriers; adopt the rail and ' +
      'combined-transport files',
    summary:
      'Promote modal shift and remove non-market barriers, including adopting ' +
      'the rail-capacity and combined-transport files. Map: Rail Capacity Reg; ' +
      'Combined Transport Directive (pending). Key files not yet adopted.',
    status: 'not-addressed',
    uptakeEvents: [],
  },
  {
    id: 't3-efficient-zev-incentives',
    area: 'T3 · Transport',
    title:
      'Prioritise energy- and resource-efficient zero-emission vehicles in ' +
      'uptake incentives',
    summary:
      'Steer uptake incentives toward the most energy- and resource-efficient ' +
      'zero-emission vehicles. Map: Cars & vans CO₂ standards Reg (EU) ' +
      '2023/851; AFIR Reg (EU) 2023/1804. Core standards in force; efficiency-' +
      'weighted incentives still partial.',
    status: 'partially',
    uptakeEvents: [],
  },
  {
    id: 't4-direct-electrification-fuels',
    area: 'T4 · Transport',
    title:
      'Prioritise direct electrification; reserve sustainable bio/hydrogen ' +
      'fuels for aviation and long-haul shipping',
    summary:
      'Favour direct electrification and reserve scarce sustainable bio- and ' +
      'hydrogen-based fuels for aviation and long-haul shipping. Map: ReFuelEU ' +
      'Aviation Reg (EU) 2023/2405; FuelEU Maritime Reg (EU) 2023/1805. Sectoral ' +
      'mandates in force; cross-modal prioritisation still partial.',
    status: 'partially',
    uptakeEvents: [],
  },
  {
    id: 't5-etd-end-exemptions',
    area: 'T5 · Transport',
    title:
      'Short term: adopt the Energy Taxation Directive revision to end ' +
      'aviation, maritime and commercial-fuel exemptions',
    summary:
      'Adopt the ETD revision to remove aviation, maritime and commercial fuel-' +
      'tax exemptions. Map: ETD revision COM(2021) 563. Blocked — Council ' +
      'compromise failed at ECOFIN on 13 Nov 2025 (no unanimity); not adopted.',
    status: 'not-addressed',
    uptakeEvents: [
      {
        date: '2025-11-13',
        note:
          'ECOFIN failed to reach unanimity on the ETD revision; Council ' +
          'compromise rejected. The ETD remains blocked.',
      },
    ],
  },
  {
    id: 't6-ets-price-convergence',
    area: 'T6 · Transport',
    title: 'Long term (post-2030): converge ETS and ETS2 carbon prices',
    summary:
      'Over the long term, converge the carbon prices of ETS1 and ETS2. Map: ' +
      'ETS Dir (EU) 2023/959. A post-2030 question; no decision taken.',
    status: 'not-addressed',
    uptakeEvents: [],
  },

  // ── Buildings (B) ────────────────────────────────────────────────────────
  {
    id: 'b1-ets2-epbd-implementation',
    area: 'B1 · Buildings',
    title:
      'Pair ETS2 with swift, ambitious implementation of the EPBD recast',
    summary:
      'Combine the new ETS2 price signal with fast, ambitious implementation of ' +
      'the recast Energy Performance of Buildings Directive. Map: EPBD recast ' +
      'Dir (EU) 2024/1275; ETS2 (Dir (EU) 2023/959). EPBD in force; transposition ' +
      'and ETS2 implementation pending — ETS2 start postponed from 2027 to 2028 ' +
      'as part of the 2040 climate-law deal.',
    status: 'partially',
    uptakeEvents: [
      {
        date: '2025-11-13',
        note:
          'ETS2 start postponed from 2027 to 2028 (Environment Council 5 Nov ' +
          '2025; Parliament agreed 13 Nov 2025), agreed alongside the 2040 ' +
          'climate-target deal to allow more preparation time.',
        sourceUrl:
          'https://climate.ec.europa.eu/eu-action/carbon-markets/ets2-buildings-road-transport-and-additional-sectors_en',
      },
    ],
  },
  {
    id: 'b2-renovation-strategies',
    area: 'B2 · Buildings',
    title:
      'Improve long-term renovation strategies; feed them into national long-' +
      'term strategies',
    summary:
      'Strengthen national building-renovation strategies and integrate them ' +
      'into long-term strategies. Map: EPBD recast Dir (EU) 2024/1275; ' +
      'Governance Reg (EU) 2018/1999. Process underway via transposition.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'b3-heat-pumps-district-heating',
    area: 'B3 · Buildings',
    title:
      'Create a conducive framework for heat pumps and clean district heating ' +
      '(pricing, taxation, system integration)',
    summary:
      'Build an enabling framework — pricing, taxation and system ' +
      'integration — for heat pumps and clean district heating. Map: EPBD; ' +
      'EED; ETD (pending). Building rules advancing, but the taxation leg (ETD) ' +
      'is blocked.',
    status: 'partially',
    uptakeEvents: [],
  },
  {
    id: 'b4-buildings-demand-sufficiency',
    area: 'B4 · Buildings',
    title:
      'Encourage energy- and material-demand reduction and sufficiency ' +
      '(planning, building codes, digitalisation)',
    summary:
      'Promote demand reduction and sufficiency in buildings via planning, ' +
      'codes and digital tools. Map: EPBD; CEAP2. Sufficiency policy remains ' +
      'weak and largely unaddressed at EU level.',
    status: 'not-addressed',
    uptakeEvents: [],
  },
  {
    id: 'b5-epc-meps-buildings-data',
    area: 'B5 · Buildings',
    title:
      'Use EPCs and minimum energy-performance standards better; unlock ' +
      'buildings data via the EPBD recast and digitalisation action plan',
    summary:
      'Make better use of energy-performance certificates and minimum standards ' +
      'and open up buildings data. Map: EPBD recast Dir (EU) 2024/1275. ' +
      'Framework adopted; data and MEPS rollout via transposition.',
    status: 'partially',
    uptakeEvents: [],
  },

  // ── Agriculture & food (A) ───────────────────────────────────────────────
  {
    id: 'a1-cap-emission-objective',
    area: 'A1 · Agriculture & food',
    title:
      'Reform the CAP to include a standalone emission-reduction objective',
    summary:
      'Add a dedicated emission-reduction objective to the Common Agricultural ' +
      'Policy. Map: CAP Reg (EU) 2021/2115; post-2027 CAP proposal (COM 2025). ' +
      'Post-2027 CAP in negotiation; no standalone agri emission target proposed.',
    status: 'not-addressed',
    uptakeEvents: [],
  },
  {
    id: 'a2-agri-emissions-pricing',
    area: 'A2 · Agriculture & food',
    title:
      'Introduce a system to estimate and price agricultural emissions at ' +
      'source; improve healthy-food access',
    summary:
      'Build measurement of, and a pricing instrument for, agricultural ' +
      'emissions at source, alongside better access to healthy food. Map: no ' +
      'pricing proposal; CRCF Reg (EU) 2024/3012 (carbon farming only). No agri ' +
      'emissions pricing has been proposed.',
    status: 'not-addressed',
    uptakeEvents: [],
  },
  {
    id: 'a3-healthy-diets-food-waste',
    area: 'A3 · Agriculture & food',
    title:
      'Incentivise healthier and plant-based diets, cut food waste, and foster ' +
      'a sustainable food culture',
    summary:
      'Encourage healthier, more plant-based diets, reduce food waste and ' +
      'support a sustainable food culture. Map: Sustainable Food Systems ' +
      'framework (unproposed). The framework law has not been tabled.',
    status: 'not-addressed',
    uptakeEvents: [],
  },
  {
    id: 'a4-biofuel-support-limits',
    area: 'A4 · Agriculture & food',
    title: 'Limit biofuel support to hard-to-decarbonise areas',
    summary:
      'Restrict support for crop-based biofuels to genuinely hard-to-decarbonise ' +
      'uses. Map: RED III Dir (EU) 2023/2413. RED III narrows but does not fully ' +
      'limit biofuel support.',
    status: 'partially',
    uptakeEvents: [],
  },

  // ── LULUCF & adaptation (L) ──────────────────────────────────────────────
  {
    id: 'l1-forests-wetlands-land',
    area: 'L1 · LULUCF & adaptation',
    title:
      'Reflect the need to maintain and expand forests and wetlands; reform ' +
      'CAP livestock support and biofuels',
    summary:
      'Protect and expand forests and wetlands, cut CAP livestock support and ' +
      'reform biofuels to restore the land sink. Map: LULUCF Reg (EU) 2023/839; ' +
      'Nature Restoration Reg (EU) 2024/1991; CAP. Nature Restoration adopted; ' +
      'CAP/biofuel reform incomplete.',
    status: 'partially',
    uptakeEvents: [],
  },
  {
    id: 'l2-bioenergy-targeting',
    area: 'L2 · LULUCF & adaptation',
    title:
      'Target bioenergy incentives at end uses with limited mitigation options',
    summary:
      'Direct bioenergy incentives toward end uses with few alternative ' +
      'mitigation options. Map: RED III Dir (EU) 2023/2413. RED III tightens ' +
      'sustainability criteria; targeting still maturing.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'l3-lulucf-pricing-instrument',
    area: 'L3 · LULUCF & adaptation',
    title:
      'Prepare a GHG pricing instrument for LULUCF to counter the biomass price ' +
      'bias',
    summary:
      'Develop a GHG pricing instrument for the LULUCF sector to offset the ' +
      'price bias favouring biomass use. Map: no pricing proposal; CRCF Reg ' +
      '(EU) 2024/3012. No LULUCF pricing instrument has been proposed.',
    status: 'not-addressed',
    uptakeEvents: [],
  },
  {
    id: 'l4-land-use-removal-incentives',
    area: 'L4 · LULUCF & adaptation',
    title:
      'Provide stronger incentives for reductions and removals across all land ' +
      'uses (including agricultural soils)',
    summary:
      'Strengthen incentives for emission reductions and removals across all ' +
      'land uses, including agricultural soils. Map: CAP; CRCF Reg (EU) ' +
      '2024/3012; LULUCF Reg (EU) 2023/839. CRCF provides certification; broader ' +
      'incentives partial.',
    status: 'partially',
    uptakeEvents: [
      {
        date: '2024-12-26',
        note:
          'Carbon Removals and Carbon Farming Regulation (EU) 2024/3012 in force; ' +
          'methodologies via delegated acts; registry by 2028.',
        sourceUrl:
          'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R3012',
      },
    ],
  },
  {
    id: 'l5-increase-adaptation',
    area: 'L5 · LULUCF & adaptation',
    title: 'Increase adaptation efforts (EU and Member States)',
    summary:
      'Step up adaptation action at both EU and Member State level. Map: ' +
      'European Climate Law Articles 5 and 7; EU Adaptation Strategy. Strategy ' +
      'in place; effort assessed as insufficient.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'l6-lulucf-sink-contingency',
    area: 'L6 · LULUCF & adaptation',
    title:
      'Develop a LULUCF-sink contingency strategy for climate-change scenarios',
    summary:
      'Prepare a contingency strategy for the land sink under adverse climate-' +
      'change scenarios (e.g. fire, drought, pests). Map: not yet developed. No ' +
      'contingency strategy exists.',
    status: 'not-addressed',
    uptakeEvents: [],
  },

  // ── Pricing emissions & rewarding removals (C) ───────────────────────────
  {
    id: 'c1-ets-cap-to-zero',
    area: 'C1 · Pricing & removals',
    title:
      'Begin urgent discussion on the ETS functioning as a cap heading to zero ' +
      '(including the role of removals)',
    summary:
      'Open the discussion on how ETS1 operates as its cap approaches zero, ' +
      'including the role of removals. Map: ETS Dir (EU) 2023/959; 2026 ETS ' +
      'review. The 2026 review is the decision point; not yet concluded.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'c2-free-allocation-alternatives',
    area: 'C2 · Pricing & removals',
    title:
      'Develop alternatives to free allocation for carbon-leakage protection as ' +
      'the cap falls',
    summary:
      'Design alternatives to free allocation to maintain leakage protection as ' +
      'the ETS cap declines. Map: CBAM Reg (EU) 2023/956; ETS Dir (EU) 2023/959. ' +
      'CBAM phasing in; alternatives still under development.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'c3-ets2-post-2030-reform',
    area: 'C3 · Pricing & removals',
    title:
      'Reform ETS2 post-2030 for price certainty; consider linking ETS1 and ETS2',
    summary:
      'Reform ETS2 after 2030 to provide price certainty and consider linking ' +
      'it with ETS1. Map: ETS Dir (EU) 2023/959. A post-2030 question; no ' +
      'decision taken.',
    status: 'not-addressed',
    uptakeEvents: [],
  },
  {
    id: 'c4-agri-lulucf-pricing',
    area: 'C4 · Pricing & removals',
    title:
      'Prepare pricing instruments for agriculture/food and LULUCF (reductions ' +
      'and removals)',
    summary:
      'Develop pricing instruments covering reductions and removals in ' +
      'agriculture/food and LULUCF. Map: no pricing proposal; CRCF Reg (EU) ' +
      '2024/3012. CRCF addresses certification of removals only; no sectoral ' +
      'pricing proposed.',
    status: 'partially',
    uptakeEvents: [],
  },
  {
    id: 'c5-adopt-etd-reform',
    area: 'C5 · Pricing & removals',
    title: 'Adopt the ETD reform; align taxation and incentives',
    summary:
      'Adopt the Energy Taxation Directive reform and align fuel taxation with ' +
      'climate incentives. Map: ETD revision COM(2021) 563. Blocked at ECOFIN ' +
      'on 13 Nov 2025 (no unanimity); not adopted.',
    status: 'not-addressed',
    uptakeEvents: [
      {
        date: '2025-11-13',
        note:
          'ECOFIN failed to reach unanimity on the ETD revision; Council ' +
          'compromise rejected. The ETD remains blocked.',
      },
    ],
  },
  {
    id: 'c6-expand-climate-revenue',
    area: 'C6 · Pricing & removals',
    title:
      'Expand climate revenue: end free allocation; ring-fence CBAM revenue for ' +
      'climate',
    summary:
      'Grow climate revenue by ending free allocation and earmarking CBAM ' +
      'revenue for climate action. Map: ETS Dir (EU) 2023/959; CBAM Reg (EU) ' +
      '2023/956. Free-allocation phase-down legislated; CBAM revenue ring-' +
      'fencing not secured.',
    status: 'partially',
    uptakeEvents: [],
  },

  // ── Fairness / wellbeing (W) ─────────────────────────────────────────────
  {
    id: 'w1-systematic-impact-assessment',
    area: 'W1 · Fairness / wellbeing',
    title:
      'Apply systematic, context-specific impact assessment and ex-post ' +
      'evaluation — transparent and with public consultation',
    summary:
      'Embed systematic, context-specific impact assessment and ex-post ' +
      'evaluation, conducted transparently and with public consultation. Map: ' +
      'Better Regulation toolbox; Social Climate Fund Reg (EU) 2023/955. Not yet ' +
      'standard across all climate files.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'w2-narratives-local-needs',
    area: 'W2 · Fairness / wellbeing',
    title:
      'Support policies with narratives reflecting local needs and values, ' +
      'informed by cost-benefit data',
    summary:
      'Accompany climate policy with narratives grounded in local needs and ' +
      'values and supported by cost-benefit evidence. Map: soft / non-' +
      'legislative. An ongoing communication and engagement effort.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'w3-social-climate-synergies',
    area: 'W3 · Fairness / wellbeing',
    title:
      'Strengthen social–climate policy synergies; adequately target and ' +
      'resource the SCF and JTF',
    summary:
      'Reinforce synergies between social and climate policy and ensure the ' +
      'Social Climate Fund and Just Transition Fund are well targeted and ' +
      'resourced. Map: SCF Reg (EU) 2023/955; JTF Reg (EU) 2021/1056. Funds ' +
      'exist; targeting and adequacy questioned.',
    status: 'partially',
    uptakeEvents: [],
  },

  // ── Investment & finance (F) ─────────────────────────────────────────────
  {
    id: 'f1-investment-gap-overview',
    area: 'F1 · Investment & finance',
    title:
      'Build a granular, accurate overview of required versus actual climate-' +
      'mitigation investment',
    summary:
      'Establish detailed, accurate monitoring of the gap between needed and ' +
      'actual climate-mitigation investment. Map: monitoring. No comprehensive ' +
      'EU-level overview yet exists.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'f2-necp-subsidy-phase-out',
    area: 'F2 · Investment & finance',
    title:
      'Member States specify in NECPs how and when fossil-fuel subsidies are ' +
      'phased out (clear trajectory and end date); Commission to assess',
    summary:
      'Require Member States to set out fossil-fuel-subsidy phase-out ' +
      'trajectories and end dates in their NECPs, with Commission assessment. ' +
      'Map: Governance Reg (EU) 2018/1999. Obligation under-used; few firm ' +
      'trajectories set.',
    status: 'not-addressed',
    uptakeEvents: [],
  },
  {
    id: 'f3-mff-climate-tracking',
    area: 'F3 · Investment & finance',
    title:
      'Improve MFF climate-spending tracking; flag spending that breaches "do ' +
      'no significant harm"',
    summary:
      'Strengthen climate-spending tracking in the Multiannual Financial ' +
      'Framework and flag DNSH-breaching expenditure. Map: MFF; EU Taxonomy Reg ' +
      '(EU) 2020/852. Post-2027 MFF in negotiation; tracking flaws unresolved.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'f4-rrf-common-debt-continuation',
    area: 'F4 · Investment & finance',
    title:
      'Consider continuing the common-debt RRF approach beyond 2026',
    summary:
      'Weigh continuing the Recovery and Resilience Facility’s common-debt ' +
      'model after it ends in 2026. Map: RRF Reg (EU) 2021/241; post-2027 MFF. No ' +
      'successor common-debt instrument confirmed.',
    status: 'not-addressed',
    uptakeEvents: [],
  },
  {
    id: 'f5-reorient-subsidy-savings',
    area: 'F5 · Investment & finance',
    title:
      'Reorient fossil-fuel-subsidy savings to climate; build common fiscal ' +
      'capacity to reduce fragmentation',
    summary:
      'Redirect savings from phasing out fossil-fuel subsidies into climate ' +
      'action and develop common fiscal capacity to reduce single-market ' +
      'fragmentation. Map: fiscal / political. No EU-level mechanism in place.',
    status: 'not-addressed',
    uptakeEvents: [],
  },
  {
    id: 'f6-taxonomy-tsc-alignment',
    area: 'F6 · Investment & finance',
    title:
      'Update Taxonomy technical screening criteria toward full alignment; treat ' +
      'natural gas as non-sustainable',
    summary:
      'Tighten the EU Taxonomy’s technical screening criteria toward full ' +
      'climate alignment and reclassify natural gas as non-sustainable. Map: EU ' +
      'Taxonomy Reg (EU) 2020/852. Delegated acts evolving; gas still treated as ' +
      'transitional.',
    status: 'partially',
    uptakeEvents: [],
  },
  {
    id: 'f7-green-bond-standard-ngeu',
    area: 'F7 · Investment & finance',
    title:
      'Apply the EU Green Bond Standard to NextGenerationEU bonds for ' +
      'transparency',
    summary:
      'Use the EU Green Bond Standard for NextGenerationEU issuance to improve ' +
      'transparency. Map: EU Green Bond Standard Reg (EU) 2023/2631. Standard in ' +
      'force; application to NGEU bonds not yet realised.',
    status: 'in-progress',
    uptakeEvents: [],
  },

  // ── Climate governance (G) ───────────────────────────────────────────────
  {
    id: 'g1-enforce-governance-lts',
    area: 'G1 · Climate governance',
    title:
      'Rigorously enforce the Governance Regulation; subject long-term ' +
      'strategies to EU review and country-specific recommendations; make LTSs ' +
      'the basis for NECPs',
    summary:
      'Enforce the Governance Regulation rigorously, review national long-term ' +
      'strategies at EU level with country-specific recommendations, and anchor ' +
      'NECPs in them. Map: Governance Reg (EU) 2018/1999 (revision). Requires a ' +
      'revision not yet legislated.',
    status: 'partially',
    uptakeEvents: [],
  },
  {
    id: 'g2-esr-visibility-compliance',
    area: 'G2 · Climate governance',
    title:
      'Make Member State ESR progress more visible; strengthen compliance for ' +
      'non-ETS sectors',
    summary:
      'Increase the visibility of Member States’ Effort Sharing progress and ' +
      'strengthen compliance for non-ETS sectors. Map: ESR Reg (EU) 2018/842 and ' +
      'amendment (EU) 2023/857. Compliance mechanisms exist but are weakly ' +
      'visible/enforced.',
    status: 'partially',
    uptakeEvents: [],
  },
  {
    id: 'g3-transparency-access-to-justice',
    area: 'G3 · Climate governance',
    title:
      'Strengthen transparency and legitimacy; enforce the Climate Law and ' +
      'Governance Regulation; require impact assessment and consultation on far-' +
      'reaching acts; improve access to justice (Aarhus)',
    summary:
      'Improve transparency, legitimacy and access to justice — enforcing ' +
      'the Climate Law and Governance Regulation, requiring impact assessment ' +
      'and consultation on far-reaching acts. Map: European Climate Law Reg (EU) ' +
      '2021/1119; Aarhus Reg (EC) 1367/2006. Partial; practice not yet ' +
      'systematic.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'g4-multilevel-dialogue-advisory-bodies',
    area: 'G4 · Climate governance',
    title:
      'Ensure compliance with Governance Regulation Article 11 (permanent ' +
      'multilevel climate dialogue); encourage mandatory national advisory bodies',
    summary:
      'Secure compliance with the permanent multilevel climate-and-energy ' +
      'dialogue requirement and encourage mandatory national climate advisory ' +
      'bodies. Map: Governance Reg (EU) 2018/1999 Art. 11; European Climate Law ' +
      'Art. 3. Uneven implementation; advisory-body mandate not yet required.',
    status: 'partially',
    uptakeEvents: [],
  },

  // ── Labour, skills & just transition (S) ─────────────────────────────────
  {
    id: 's1-skills-investment',
    area: 'S1 · Labour, skills & just transition',
    title:
      'Target education, training and skills investment (construction, ' +
      'renewables, digital, cross-cutting); use the Technical Support Instrument',
    summary:
      'Direct investment in education, training and skills toward construction, ' +
      'renewables, digital and cross-cutting needs, using instruments such as ' +
      'the Technical Support Instrument. Map: Technical Support Instrument; ' +
      'ESF+. Funding exists; strategic targeting still developing.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 's2-just-transition-programme-design',
    area: 'S2 · Labour, skills & just transition',
    title:
      'Improve just-transition programme design: target the most-at-risk ' +
      'workers and regions, measure outcomes, and raise participation',
    summary:
      'Redesign just-transition programmes to focus on the most-at-risk workers ' +
      'and regions, measure outcomes and increase participation. Map: Just ' +
      'Transition Fund Reg (EU) 2021/1056. Fund operating; design and reach ' +
      'improvements still needed.',
    status: 'in-progress',
    uptakeEvents: [],
  },
];

// Every recommendation in this file's two arrays comes from the same report,
// so the report label is attached here rather than repeated on each entry.
const REPORT_2024 = RECOMMENDATION_REPORTS['towards-eu-climate-neutrality-2024'];

export const ESABCC_2024_KEY_RECOMMENDATIONS: PastRecommendation[] =
  ESABCC_2024_KEY_RECOMMENDATIONS_BASE.map(r => ({
    ...r,
    report: REPORT_2024,
    tags: RECOMMENDATION_TAGS[r.id],
  }));

export const ESABCC_2024_SECTORAL_RECOMMENDATIONS: PastRecommendation[] =
  ESABCC_2024_SECTORAL_RECOMMENDATIONS_BASE.map(r => ({
    ...r,
    report: REPORT_2024,
    tags: RECOMMENDATION_TAGS[r.id],
  }));

/**
 * Full Jan 2024 recommendation set used to seed the tracker:
 * the 13 Key recommendations followed by the 55 sectoral recommendations
 * (68 in total), each labelled with its source report.
 */
export const ESABCC_2024_RECOMMENDATIONS: PastRecommendation[] = [
  ...ESABCC_2024_KEY_RECOMMENDATIONS,
  ...ESABCC_2024_SECTORAL_RECOMMENDATIONS,
];

/**
 * The subset of 2024 recommendations carrying the `industry` tag, used to seed
 * the Industry Project's recommendation tracker. Derived from the tags above so
 * adding a tag automatically pulls a recommendation into the Industry Project.
 */
export const ESABCC_INDUSTRY_RECOMMENDATIONS: PastRecommendation[] =
  ESABCC_2024_RECOMMENDATIONS.filter(r => r.tags?.includes('industry'));

// ───────────────────────────────────────────────────────────────────────────
// Supplementary advice — separate June 2023 ESABCC output, included here so
// the tracker can record the headline 2040-target uptake without conflating
// it with the Jan 2024 Key recommendations.
// ───────────────────────────────────────────────────────────────────────────

export const ESABCC_2023_2040_TARGET_ADVICE: PastRecommendation = {
  id: 'advice-2023-2040-target',
  area: 'June 2023 advice · 2040 target',
  title: 'Adopt an EU 2040 climate target of −90 to −95% net GHG vs. 1990',
  summary:
    'From the separate June 2023 ESABCC advice ("Scientific advice for the ' +
    'determination of an EU-wide 2040 climate target and a GHG budget for ' +
    '2030–2050"). Set a science-based 2040 target with a strong domestic ' +
    'component and limits on the role of removals.',
  status: 'addressed',
  report: RECOMMENDATION_REPORTS['2040-target-advice-2023'],
  uptakeEvents: [
    {
      date: '2024-02-06',
      note:
        'Commission Communication COM(2024) 63 final proposed a −90% 2040 target.',
      sourceUrl:
        'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52024DC0063',
    },
    {
      date: '2026-03-11',
      note:
        'Regulation (EU) 2026/667 amending the European Climate Law adopted: ' +
        'binding −90% net GHG by 2040, with up to 5% high-quality international ' +
        'credits from 2036.',
      sourceUrl:
        'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32026R0667',
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// Recommendations from ESABCC's other published outputs.
//
// Each block below seeds one report's recommendations into the tracker so the
// Past recommendations module spans every ESABCC publication, not just the
// Jan 2024 progress report. Operative asks are paraphrased from the source
// documents; summaries record the primary mapped instrument(s) and the
// rationale for the status assessment (as of 2026-06-01). Add an entry to
// RECOMMENDATION_REPORTS above when tracking advice from a new publication.
// ═══════════════════════════════════════════════════════════════════════════

// ── Recommendations to ACER on energy infrastructure (Nov 2022) ─────────────
const REPORT_ACER_2022 = RECOMMENDATION_REPORTS['acer-energy-infrastructure-2022'];
export const ESABCC_2022_ACER_RECOMMENDATIONS: PastRecommendation[] = [
  {
    id: 'acer-2022-target-compliance',
    area: 'TEN-E scenarios · target compliance',
    title:
      'Require ENTSO scenarios to comply with EU climate targets at all times, ' +
      'cover a wide range of climate-neutrality pathways, and avoid fossil lock-ins',
    summary:
      'The letter asks ACER to write framework guidelines so that scenarios are ' +
      'adjusted as soon as intermediate climate targets are adopted, are modelled ' +
      'until at least 2050, and span the full range of climate-neutrality ' +
      'pathways. Maps to TEN-E Reg (EU) 2022/869 Art. 12; ACER framework ' +
      'guidelines on TYNDP scenarios. Partly taken up in ACER\'s Jan 2023 ' +
      'Scenario Guidelines; subsequent ESABCC reviews flag continuing gaps.',
    status: 'partially',
    report: REPORT_ACER_2022,
    uptakeEvents: [
      {
        date: '2023-01-24',
        note:
          'ACER adopted the framework guidelines on TYNDP scenarios under ' +
          'Art. 12 TEN-E Reg (EU) 2022/869.',
      },
    ],
  },
  {
    id: 'acer-2022-resilience-building-blocks',
    area: 'TEN-E scenarios · resilience',
    title:
      'Require scenarios to incorporate climate impacts on energy infrastructure ' +
      'and adopt an integrated building-blocks approach (flexibility, ' +
      'electrification, hydrogen, offshore grids, CDR)',
    summary:
      'Scenarios should reflect projected climate impacts (heat, drought, ' +
      'flooding) on infrastructure resilience and be constructed via integrated ' +
      'building blocks covering flexibility, electrification, hydrogen/e-fuels, ' +
      'offshore grids and CO2 removal — using the most recent forward-looking ' +
      'data. Maps to TEN-E Reg (EU) 2022/869 Annex V and ACER Scenario ' +
      'Guidelines. The 2024 advice on draft TYNDP 2024 scenarios shows ' +
      'building-block integration is still partial.',
    status: 'in-progress',
    report: REPORT_ACER_2022,
    uptakeEvents: [],
  },
  {
    id: 'acer-2022-transparency-experts',
    area: 'TEN-E scenarios · transparency',
    title:
      'Require ENTSOs to publish assumptions, methods and results in detail and ' +
      'consult independent experts early in the scenario-building process',
    summary:
      'Calls for a transparent and inclusive TYNDP scenario process: detailed ' +
      'publication of assumptions, methods and outputs, and early involvement of ' +
      'independent experts and stakeholders. Maps to TEN-E Reg (EU) 2022/869 ' +
      'Art. 12 and the Stakeholder Reference Group set up under the revised ' +
      'TEN-E. The 2024 review found models (Plexos, DFT) still largely closed.',
    status: 'partially',
    report: REPORT_ACER_2022,
    uptakeEvents: [],
  },
];

// ── Advice on TEN-E scenario guidelines (Nov 2022) ──────────────────────────
const REPORT_TENE_GUIDE_2022 = RECOMMENDATION_REPORTS['scenario-guidelines-2022'];
export const ESABCC_2022_TENE_GUIDELINES_RECOMMENDATIONS: PastRecommendation[] = [
  {
    id: 'tene-guide-2022-target-compliance',
    area: 'R1 · Climate-target compliance',
    title:
      'Update scenarios regularly to comply with new or revised EU climate and ' +
      'energy targets, hit target levels within the specified timeframe, and ' +
      'model until at least 2050',
    summary:
      'Scenarios must stay compatible with the 2030 and 2050 targets and be ' +
      'refreshed as new EU targets (a future 2040 GHG target, Fit-for-55, ' +
      'REPowerEU) are adopted, with net-zero by 2050 explicitly demonstrated. ' +
      'Maps to ACER Scenario Guidelines and ENTSO TYNDP "Distributed Energy" / ' +
      '"Global Ambition" scenarios. Adopted in principle; 2024 review found ' +
      'compliance gaps persist.',
    status: 'partially',
    report: REPORT_TENE_GUIDE_2022,
    uptakeEvents: [],
  },
  {
    id: 'tene-guide-2022-policy-inputs',
    area: 'R2 · Policy inputs and NECPs',
    title:
      'Reflect all relevant adopted EU policies (including non-binding ones) up ' +
      'to an agreed cut-off, and complement / update NECP assumptions where ' +
      'needed for target compliance',
    summary:
      'ENTSOs, ACER and the Commission should agree a cut-off date so the ' +
      'latest EU and national policies are reflected, supplementing five-year ' +
      'NECP cycles with NECPRs, Commission assessments and national long-term ' +
      'strategies. Maps to Governance Reg (EU) 2018/1999 and ACER Scenario ' +
      'Guidelines. 2024 cycle still relied on early-2023 data.',
    status: 'partially',
    report: REPORT_TENE_GUIDE_2022,
    uptakeEvents: [],
  },
  {
    id: 'tene-guide-2022-range-pathways',
    area: 'R3 · Range of pathways',
    title:
      'Cover a wide spectrum of climate-neutrality pathways aligned with ' +
      'Commission impact assessments, decreasing fossil-fuel infrastructure and ' +
      'import dependency',
    summary:
      'Scenarios should span the pathway range used in EU impact assessments ' +
      '(PRIMES/GAINS/GLOBIOM, Climate Target Plan, 1.5LIFE/1.5TECH) and avoid ' +
      'infeasible over-reliance on individual options (e.g. unrealistically high ' +
      'CCS or imported hydrogen). 2024 review found DE and GA scenarios ' +
      'insufficiently differentiated.',
    status: 'in-progress',
    report: REPORT_TENE_GUIDE_2022,
    uptakeEvents: [],
  },
  {
    id: 'tene-guide-2022-differentiation',
    area: 'R4 · Differentiation and drivers',
    title:
      'Differentiate scenarios within seven years of the start of the scenario ' +
      'timeframe and base differentiation on the most impactful infrastructure ' +
      'drivers, not GDP alone',
    summary:
      'Because infrastructure decisions are long-lived, scenarios should diverge ' +
      'early — at the latest within 7 years (matching ACER\'s "short term") — ' +
      'on drivers such as decentralisation, technology mix, energy carriers and ' +
      'import dependence, identified via the integrated building-block process. ' +
      '2024 cycle still differentiated mainly post-2030.',
    status: 'in-progress',
    report: REPORT_TENE_GUIDE_2022,
    uptakeEvents: [],
  },
  {
    id: 'tene-guide-2022-benchmarking',
    area: 'R5 · Benchmarking',
    title:
      'Expand benchmarking against Commission modelling to cover short- and ' +
      'medium-term outcomes, key climate-relevant variables, and explicit ' +
      'analysis of deviations',
    summary:
      'Benchmarking should not be limited to 2050 endpoints of two extreme ' +
      'scenarios; it should cover the full timeframe, compare key inputs and ' +
      'outputs, and document/justify deviations from Commission analyses for ' +
      'GHG-relevant variables. Maps to the ACER Scenario Guidelines.',
    status: 'in-progress',
    report: REPORT_TENE_GUIDE_2022,
    uptakeEvents: [],
  },
  {
    id: 'tene-guide-2022-climate-projections',
    area: 'R6 · Climate projections',
    title:
      'Incorporate up-to-date observed regional climate changes and future ' +
      'climate projections into scenarios, and reflect the need for EU energy ' +
      'infrastructure to be climate-resilient',
    summary:
      'Scenarios should use regional climatic data less than ~10 years old, ' +
      'integrate "committed" climate-change effects (heating/cooling degree-day ' +
      'shifts, thermal-plant efficiency, hydropower and wind impacts) and ' +
      'stress-test infrastructure against floods, extreme weather and water ' +
      'scarcity, drawing on the European Climate Risk Assessment and EU ' +
      'Taxonomy adaptation criteria. 2024 cycle still used pre-2010 climate ' +
      'years.',
    status: 'not-addressed',
    report: REPORT_TENE_GUIDE_2022,
    uptakeEvents: [],
  },
  {
    id: 'tene-guide-2022-storyline-blocks',
    area: 'R7 · Building blocks',
    title:
      'Build scenarios through a continuous storyline process underpinned by ' +
      'integrated building blocks: flexibility, electrification, hydrogen/e-fuels, ' +
      'offshore grids and carbon dioxide removal',
    summary:
      'An iterative, stakeholder-inclusive storyline process should set the ' +
      'number and variants of scenarios, with dedicated modelling of demand-' +
      'response/storage/sector coupling, end-use electrification, hydrogen and ' +
      'e-fuels, meshed offshore grids (Art. 14 TEN-E) and CDR (LULUCF, CCS, ' +
      'BECCS, DACS) — including at least one CDR-free scenario. Maps to ACER ' +
      'Scenario Guidelines.',
    status: 'in-progress',
    report: REPORT_TENE_GUIDE_2022,
    uptakeEvents: [],
  },
  {
    id: 'tene-guide-2022-consistency-of-inputs',
    area: 'R8 · Internal consistency',
    title:
      'Require ENTSOs to check and document internal and cross-scenario ' +
      'consistency of inputs and assumptions and explain drivers of ' +
      'differentiation',
    summary:
      'ENTSOs should perform mandatory coherence cross-checks across building ' +
      'blocks, use simplified rules for correlated assumptions where full ' +
      'integration is impossible, document inconsistencies arising from ' +
      'modelling compromises, and explain why scenarios differ.',
    status: 'in-progress',
    report: REPORT_TENE_GUIDE_2022,
    uptakeEvents: [],
  },
  {
    id: 'tene-guide-2022-quality-assumptions',
    area: 'R9 · Quality of assumptions',
    title:
      'Base scenario assumptions on up-to-date, scientifically sound, forward-' +
      'looking and unbiased information, with regional granularity in costs, ' +
      'prices and innovations',
    summary:
      'Inputs should be scrutinised against climate/energy targets and via ' +
      'stakeholder/expert engagement. Country-level treatment of energy delivery ' +
      'costs should be extended to import prices of natural gas, hydrogen and ' +
      'e-fuels, and assumptions should reflect regional differences in discount ' +
      'rates, utilisation rates and market conditions.',
    status: 'in-progress',
    report: REPORT_TENE_GUIDE_2022,
    uptakeEvents: [],
  },
  {
    id: 'tene-guide-2022-infrastructure-lifetimes',
    area: 'R10 · Infrastructure lifetimes',
    title:
      'Align assumed useful life of energy infrastructure with the transition ' +
      'pathway and net-zero objective, accounting for long-term climate effects ' +
      'and lock-in risks',
    summary:
      'Assumptions on lifetimes should reflect that new fossil infrastructure ' +
      'cannot plausibly operate for 25 years under target-compliant scenarios ' +
      '(risk of stranded assets or early retirement) and should consider methane ' +
      'and hydrogen leakage. Electricity and hydrogen network planning should ' +
      'reflect remaining gaps to climate neutrality.',
    status: 'partially',
    report: REPORT_TENE_GUIDE_2022,
    uptakeEvents: [],
  },
  {
    id: 'tene-guide-2022-eu-modelling-alignment',
    area: 'R11 · EU modelling alignment',
    title:
      'Use data sources and modelling tools comparable to those used by EU ' +
      'institutions, and explain any deviations',
    summary:
      'Where possible, ENTSOs should align capex/opex for wind, solar and ' +
      'electrolysers, commodity-price trajectories (gas, CO2, FX) and renewables ' +
      'installation assumptions with the latest Commission and EU-institution ' +
      'publications, consistent with the European Resource Adequacy Assessment ' +
      '(Art. 27 TEN-E). Deviations should be explained and justified.',
    status: 'in-progress',
    report: REPORT_TENE_GUIDE_2022,
    uptakeEvents: [],
  },
  {
    id: 'tene-guide-2022-uncertainty',
    area: 'R12 · Uncertainty analysis',
    title:
      'Require analysis and documentation of uncertainty ranges around all ' +
      'relevant inputs and their impact on scenario outcomes',
    summary:
      'Scenario reports should disclose uncertainty ranges and justifications ' +
      'for chosen input values (growth, prices, technology maturity, policy/' +
      'geopolitical change, raw materials, extreme weather, water scarcity), ' +
      'with a dedicated post-scenario analysis identifying the largest drivers ' +
      'of difference and the robustness of results.',
    status: 'in-progress',
    report: REPORT_TENE_GUIDE_2022,
    uptakeEvents: [],
  },
  {
    id: 'tene-guide-2022-transparency-fair',
    area: 'R13 · Transparency / FAIR',
    title:
      'Publish detailed model and methodology descriptions and all scenario ' +
      'assumptions and data, in line with FAIR principles (Findable, Accessible, ' +
      'Interoperable, Reusable)',
    summary:
      'ENTSOs should publish full model documentation and detailed, machine-' +
      'readable input/output tables with units, sources, metadata and uncertainty ' +
      'ranges, so third parties can reproduce results as required by Art. 12 ' +
      'TEN-E. 2024 review found Plexos and the Demand Forecasting Toolbox still ' +
      'closed-access.',
    status: 'not-addressed',
    report: REPORT_TENE_GUIDE_2022,
    uptakeEvents: [],
  },
  {
    id: 'tene-guide-2022-reporting-content',
    area: 'R14 · Scenario report content',
    title:
      'Mandate minimum contents for the ENTSO scenario report, including ' +
      'compliance with EU climate targets, carbon-budget utilisation and key ' +
      'supply/cost implications',
    summary:
      'The scenario report should include detailed results, uncertainty/' +
      'robustness analysis, explanation of compliance with EU targets, ' +
      'deviations from Commission scenarios, treatment of carbon budgets and ' +
      'cross-border GHG effects, plus transparent description of security-of-' +
      'supply, import dependence and consumer costs.',
    status: 'in-progress',
    report: REPORT_TENE_GUIDE_2022,
    uptakeEvents: [],
  },
  {
    id: 'tene-guide-2022-stakeholder-engagement',
    area: 'R15 · Stakeholder engagement',
    title:
      'Require effective, meaningful and independent stakeholder engagement, ' +
      'with a clearly defined and independent Stakeholder Reference Group',
    summary:
      'Scenario Guidelines should define composition, appointment process, roles ' +
      'and independence of the Stakeholder Reference Group set up under the ' +
      'revised TEN-E Regulation, ensure modellers behind Commission scenarios ' +
      'participate in benchmarking, and require traceable reporting in ' +
      'comparable units.',
    status: 'partially',
    report: REPORT_TENE_GUIDE_2022,
    uptakeEvents: [],
  },
  {
    id: 'tene-guide-2022-independent-experts',
    area: 'R16 · Independent expert engagement',
    title:
      'Establish a systematic expert engagement process that involves independent ' +
      'experts early to scrutinise methodology, assumptions and robustness of ' +
      'results',
    summary:
      'Independent experts should be able to re-model scenarios and test ' +
      'sensitivity to input changes, feeding findings into subsequent TYNDP ' +
      'cycles. Involvement must be systematic and not contingent on stakeholder ' +
      'outcomes; this should be integrated with the continuous storyline process ' +
      'and building-block work.',
    status: 'in-progress',
    report: REPORT_TENE_GUIDE_2022,
    uptakeEvents: [],
  },
];

// ── Initial advice on climate targets (Jan 2023) ────────────────────────────
const REPORT_CT_INIT_2023 = RECOMMENDATION_REPORTS['climate-targets-2023'];
export const ESABCC_2023_CLIMATE_TARGETS_INIT_RECOMMENDATIONS: PastRecommendation[] = [
  {
    id: 'climate-targets-2023-init-context',
    area: 'Initial advice · scientific & legal context',
    title:
      'Ground the EU\'s 2040 climate target proposal in the relevant scientific ' +
      'and legal context, including the Paris Agreement temperature goal and the ' +
      'European Climate Law',
    summary:
      'First of five "key areas" the Board asks the Commission to address ahead ' +
      'of its 2040-target proposal. Maps to European Climate Law Reg (EU) ' +
      '2021/1119. Addressed in substance by the Board\'s own June 2023 ' +
      'quantitative advice and the Commission\'s Feb 2024 communication.',
    status: 'addressed',
    report: REPORT_CT_INIT_2023,
    uptakeEvents: [],
  },
  {
    id: 'climate-targets-2023-init-fair-share',
    area: 'Initial advice · physical limits & fair share',
    title:
      'Anchor the 2040 target and 2030–2050 GHG budget in the physical limits to ' +
      'global emissions and the EU\'s fair share of the remaining global carbon ' +
      'budget',
    summary:
      'Calls for an explicit translation of the Paris temperature goal into a ' +
      'remaining global carbon budget and derivation of the EU fair share so ' +
      'the 2040 milestone and indicative GHG budget align with well-below-2°C ' +
      'and 1.5°C pathways. Reflected in the Board\'s June 2023 quantitative ' +
      'advice.',
    status: 'addressed',
    report: REPORT_CT_INIT_2023,
    uptakeEvents: [],
  },
  {
    id: 'climate-targets-2023-init-transformation',
    area: 'Initial advice · transformation scenarios',
    title:
      'Base the 2040 target on transformation scenarios that credibly reach net-' +
      'zero GHG emissions in the EU by 2050',
    summary:
      'Asks the Commission to use a range of net-zero-by-2050 transformation ' +
      'scenarios for the EU as the basis for selecting the 2040 milestone, ' +
      'rather than a single pathway. Followed by the Board with a published ' +
      'pathway range in H1 2023.',
    status: 'addressed',
    report: REPORT_CT_INIT_2023,
    uptakeEvents: [],
  },
  {
    id: 'climate-targets-2023-init-side-effects',
    area: 'Initial advice · trade-offs',
    title:
      'Assess implications of different pathways in terms of side effects, co-' +
      'benefits, resilience and feasibility before choosing the 2040 target level',
    summary:
      'Recommends that the impact assessment compare pathways not only on ' +
      'emissions but also on co-benefits (air quality, energy security), adverse ' +
      'side effects, resilience to climate impacts and overall feasibility. ' +
      'Partially reflected in the Commission\'s 2040 impact assessment.',
    status: 'partially',
    report: REPORT_CT_INIT_2023,
    uptakeEvents: [],
  },
  {
    id: 'climate-targets-2023-init-value-judgements',
    area: 'Initial advice · value judgements',
    title:
      'Make value judgements explicit and transparent, especially when ' +
      'addressing tensions between different issues and principles',
    summary:
      'Because choosing between pathways involves normative trade-offs (burden ' +
      'sharing, risk tolerance, reliance on removals), the Commission should ' +
      'identify where value judgements enter the analysis and justify them ' +
      'against EU values.',
    status: 'in-progress',
    report: REPORT_CT_INIT_2023,
    uptakeEvents: [],
  },
];

// ── Energy-crisis policy responses (Feb 2023) ───────────────────────────────
const REPORT_EC_2023 = RECOMMENDATION_REPORTS['energy-crisis-2023'];
export const ESABCC_2023_ENERGY_CRISIS_RECOMMENDATIONS: PastRecommendation[] = [
  {
    id: 'energy-crisis-2023-root-causes',
    area: 'EC1 · Root causes',
    title:
      'Tackle the root causes of the energy crisis by rebalancing energy supply ' +
      'and demand, not by subsidising prices',
    summary:
      'Bring affordability back through structural demand reductions and secure, ' +
      'domestic, low-carbon supply rather than ad-hoc price interventions ' +
      '(subsidies, price caps, market interventions) that address only symptoms.',
    status: 'partially',
    report: REPORT_EC_2023,
    uptakeEvents: [],
  },
  {
    id: 'energy-crisis-2023-efficiency',
    area: 'EC2 · Demand',
    title:
      'Save energy through accelerated efficiency improvements and behavioural ' +
      'change, including a fully implemented Renovation Wave',
    summary:
      'Upscale efficiency via the Renovation Wave and national long-term ' +
      'renovation strategies, tighten ETS incentives (e.g. condition free ' +
      'allocations on demand-reduction commitments), sustain behavioural-change ' +
      'campaigns and support low-income households. Maps to EED recast (EU) ' +
      '2023/1791 and EPBD recast (EU) 2024/1275.',
    status: 'partially',
    report: REPORT_EC_2023,
    uptakeEvents: [],
  },
  {
    id: 'energy-crisis-2023-renewables',
    area: 'EC3 · Renewables',
    title:
      'At least double the EU\'s renewable energy investment and deployment rate ' +
      'to deliver the 2030 renewables ambition',
    summary:
      'Calls for a stable investment framework, streamlined permitting with ' +
      'safeguards, stronger grids/flexibility/storage (via a TEN-E Regulation ' +
      'aligned with climate objectives), an electricity-market reform that ' +
      'incentivises investment while letting markets benefit from low-cost ' +
      'electricity, and support for small on-site renewables. Maps to RED III ' +
      '(EU) 2023/2413 and EMD Reg (EU) 2024/1747 / Dir (EU) 2024/1711.',
    status: 'partially',
    report: REPORT_EC_2023,
    uptakeEvents: [],
  },
  {
    id: 'energy-crisis-2023-electrification',
    area: 'EC4 · Electrification',
    title:
      'Boost electrification of end-use sectors — especially heat pumps — and ' +
      'align price signals with decarbonisation',
    summary:
      'Accelerated electrification (heat pumps in buildings and industry) plus ' +
      'aligned price signals via carbon pricing (ETS strengthening, ETS2) and a ' +
      'revised Energy Taxation Directive that shifts the tax burden from ' +
      'electricity to fossil fuels. Grids and charging infrastructure must ' +
      'follow; vulnerable households need upfront-investment support. ETD ' +
      'remains blocked.',
    status: 'partially',
    report: REPORT_EC_2023,
    uptakeEvents: [],
  },
  {
    id: 'energy-crisis-2023-biogas-hydrogen',
    area: 'EC5 · Biogas & green hydrogen',
    title:
      'Scale up biogas and green hydrogen as low-carbon alternatives where direct ' +
      'electrification is not possible, and prioritise their use for hard-to-' +
      'abate sectors',
    summary:
      'Production should be scaled with EU and national support (investment ' +
      'and infrastructure, standards, quotas) and use prioritised for sectors ' +
      'with few alternatives — replacing grey hydrogen and producing steel, ' +
      'chemicals and high-temperature heat. Maps to RED III (EU) 2023/2413 and ' +
      'the hydrogen / decarbonised gas package.',
    status: 'in-progress',
    report: REPORT_EC_2023,
    uptakeEvents: [],
  },
  {
    id: 'energy-crisis-2023-vulnerable-consumers',
    area: 'EC6 · Vulnerable consumers',
    title:
      'Provide targeted, direct income support to vulnerable consumers rather ' +
      'than non-targeted price interventions',
    summary:
      'Member States should shield low-income households via direct income ' +
      'support (preferred, preserves price signals) or, as second-best, semi-' +
      'targeted price reductions (social or block tariffs). Non-targeted price ' +
      'caps and general subsidies should be avoided. Support to non-households ' +
      'should be conditional on efficiency measures; State-aid rules should ' +
      'harmonise.',
    status: 'partially',
    report: REPORT_EC_2023,
    uptakeEvents: [],
  },
  {
    id: 'energy-crisis-2023-gas-diversification',
    area: 'EC7 · Gas diversification',
    title:
      'Ensure efforts to diversify gas supply are compatible with the long-term ' +
      'transition to climate neutrality',
    summary:
      'New gas infrastructure investments and long-term contracts must balance ' +
      'short- to medium-term security of supply against the risk of locking in ' +
      'future gas demand inconsistent with climate neutrality. Preference for ' +
      'sources with the lowest upstream methane impacts.',
    status: 'in-progress',
    report: REPORT_EC_2023,
    uptakeEvents: [],
  },
  {
    id: 'energy-crisis-2023-biomass',
    area: 'EC8 · Biomass',
    title:
      'Ensure a sustainable supply and use of biomass, applying the cascade ' +
      'principle and protecting food production and biodiversity',
    summary:
      'Biomass-for-energy should be limited to sustainable sources, allocated ' +
      'per the cascade principle and prioritised for sectors with few fossil ' +
      'alternatives (some industrial processes, bunker fuels). Sustainable ' +
      'sourcing must be rigorously monitored; biofuels competing with food ' +
      'production should not be incentivised. Maps to RED III (EU) 2023/2413.',
    status: 'partially',
    report: REPORT_EC_2023,
    uptakeEvents: [],
  },
  {
    id: 'energy-crisis-2023-coal-oil',
    area: 'EC9 · Coal and oil',
    title:
      'Do not invest in new coal and oil infrastructure, and ramp down any ' +
      'crisis-driven fossil substitution as soon as possible',
    summary:
      'EU Member States should stop investing in coal and oil infrastructure, ' +
      'including exploration of new deposits, to avoid lock-ins. Any short-term ' +
      'increase in coal/oil use to substitute for gas should be strictly time-' +
      'limited.',
    status: 'partially',
    report: REPORT_EC_2023,
    uptakeEvents: [],
  },
];

// ── Energy infrastructure CBA advice (Mar 2023) ─────────────────────────────
const REPORT_EI_CBA_2023 = RECOMMENDATION_REPORTS['decarbonised-energy-infrastructure-2023'];
export const ESABCC_2023_ENERGY_INFRASTRUCTURE_RECOMMENDATIONS: PastRecommendation[] = [
  {
    id: 'ei-cba-2023-governance',
    area: 'CBA · TYNDP/PCI-PMI governance',
    title:
      'Align all TYNDP and PCI/PMI process steps with EU climate targets and ' +
      'improve coordination, capacity and stakeholder involvement across ENTSO-E, ' +
      'ENTSO-G, the Commission and ACER',
    summary:
      'Scenario development, system-needs assessment, CBA and intermediate steps ' +
      'should be driven by EU 2030/2050 climate targets; mitigation and ' +
      'resilience handled consistently across investment categories; coordination ' +
      'between ENTSO-E, ENTSO-G and the Commission made transparent; and ' +
      'non-incumbents (e.g. EU DSO Entity) proactively involved. Maps to TEN-E ' +
      'Reg (EU) 2022/869 and ACER framework guidelines.',
    status: 'in-progress',
    report: REPORT_EI_CBA_2023,
    uptakeEvents: [],
  },
  {
    id: 'ei-cba-2023-ghg-accounting',
    area: 'CBA · GHG accounting',
    title:
      'Adopt a single, consistent GHG accounting approach across CBA ' +
      'methodologies that captures methane and all non-CO2 gases in CO2-' +
      'equivalents',
    summary:
      'Recommends a uniform counterfactual, emission factors and efficiency ' +
      'coefficients across ENTSO-E, ENTSO-G and JRC CBA methodologies, ' +
      'monetised in CO2-equivalents (IPCC AR5 GWP100 consistent with the Paris ' +
      'Agreement transparency framework). 2022 draft CBA 4.0 omits non-CO2 ' +
      'gases including methane in indicator B2.',
    status: 'in-progress',
    report: REPORT_EI_CBA_2023,
    uptakeEvents: [],
  },
  {
    id: 'ei-cba-2023-cost-of-carbon',
    area: 'CBA · Cost of carbon',
    title:
      'Base the cost of GHG emissions on an EU-wide opportunity-cost approach ' +
      'with annually varying values from a single up-to-date source',
    summary:
      'The social/shadow cost of carbon should reflect EU climate-policy options ' +
      'inside and outside the EU ETS, draw on a single credible source (e.g. the ' +
      'EIB shadow cost rising from €250/tCO2e in 2030 to €800/tCO2e in 2050) and ' +
      'use annual values when computing NPV/BCR. Draft CBA 4.0 still allows ' +
      'project-level choice with only two reference years.',
    status: 'partially',
    report: REPORT_EI_CBA_2023,
    uptakeEvents: [],
  },
  {
    id: 'ei-cba-2023-adaptation-costs',
    area: 'CBA · Adaptation costs',
    title:
      'Require project-specific climate adaptation cost estimates and ' +
      'quantifiable indicators in the CBA, reflecting site-specific climate ' +
      'variables and hazards',
    summary:
      'CBA guidance should describe project-specific adaptation measures tied ' +
      'to climate variables and hazards (per Commission 2016a checklist); ' +
      'include quantifiable, monetised-where-possible indicators on adaptation ' +
      'costs; and reflect insurance, asset lifetimes and climate-sensitive ' +
      'design thresholds. Draft CBA 4.0 currently requires only a narrative ' +
      'statement.',
    status: 'not-addressed',
    report: REPORT_EI_CBA_2023,
    uptakeEvents: [],
  },
  {
    id: 'ei-cba-2023-resilience-benefits',
    area: 'CBA · Resilience benefits',
    title:
      'Add a quantified CBA indicator or BCR component capturing the benefits of ' +
      'climate-resilient infrastructure',
    summary:
      'Benefits from cross-border interconnection and resilient infrastructure ' +
      'under extreme conditions (avoided damage, security of supply) should be ' +
      'reflected via a dedicated indicator or BCR component, going beyond ' +
      'indicator B6 ("adequacy to meet demand") and the immature B8 ("system ' +
      'stability"). Currently missing in ENTSO-E draft CBA 4.0.',
    status: 'not-addressed',
    report: REPORT_EI_CBA_2023,
    uptakeEvents: [],
  },
  {
    id: 'ei-cba-2023-scenarios-only-compliant',
    area: 'CBA · Target-compliant scenarios',
    title:
      'Determine CBA indicators only on climate-target-compliant scenarios and ' +
      'use information from those scenarios up to the year targets are achieved',
    summary:
      'Indicators should be quantified only against scenarios compliant with EU ' +
      '2030 and 2050 climate targets, avoiding misrepresentation of costs/' +
      'benefits and lock-in of carbon-intensive infrastructure. In the 2022 ' +
      'TYNDP cycle indicators were mostly quantified on a non-compliant ' +
      '"National Trends" scenario.',
    status: 'in-progress',
    report: REPORT_EI_CBA_2023,
    uptakeEvents: [],
  },
  {
    id: 'ei-cba-2023-sensitivity-climate-years',
    area: 'CBA · Climate-year sensitivity',
    title:
      'Run systematic sensitivity analysis on recent and projected climate years, ' +
      'including compound events and cascading risks, and feed them into ' +
      'vulnerability and risk assessment',
    summary:
      'Sensitivity analyses should combine historic time series with forward ' +
      'projections to 2050, capture compound events (e.g. concurrent heat-waves/' +
      'droughts) and cascading impacts, and draw on the latest IPCC and EEA ' +
      'evidence. Draft CBA 4.0 only includes climate-year sensitivity for ' +
      'indicator B6.',
    status: 'in-progress',
    report: REPORT_EI_CBA_2023,
    uptakeEvents: [],
  },
  {
    id: 'ei-cba-2023-transparency-fair',
    area: 'CBA · Transparency / FAIR models',
    title:
      'Make sensitivity parameter choices transparent and science-driven, and ' +
      'open market and network models under FAIR principles',
    summary:
      'The choice of sensitivities (fuel/CO2 price, climate year, commissioning ' +
      'years, must-run conditions) and the assessment framework should be ' +
      'transparent and based on the latest science; market and network models ' +
      'should be findable, accessible, interoperable and reusable, including by ' +
      'non-TSO project promoters.',
    status: 'not-addressed',
    report: REPORT_EI_CBA_2023,
    uptakeEvents: [],
  },
  {
    id: 'ei-cba-2023-npv-bcr-granularity',
    area: 'CBA · NPV/BCR granularity',
    title:
      'Use realistic technology-specific project lifetimes and more granular ' +
      'study years and exogenous inputs in NPV/BCR calculations',
    summary:
      'The CBA should replace the uniform 25-year assessment period and zero ' +
      'terminal value with technology-specific lifetimes (submarine cables ≠ ' +
      'transitional fossil-gas projects), include short-, mid- and long-term ' +
      'study years (ideally at 5-year intervals) and use annually varying ' +
      'crucial exogenous inputs like the carbon price.',
    status: 'in-progress',
    report: REPORT_EI_CBA_2023,
    uptakeEvents: [],
  },
  {
    id: 'ei-cba-2023-discount-rate',
    area: 'CBA · Discount rate',
    title:
      'Jointly review the 4% real discount rate used in CBA in light of ' +
      'declining-rate practice and the Commission\'s 3% recommendation',
    summary:
      'Asks the Commission, ENTSO-E and ENTSO-G to revisit the real discount ' +
      'rate, drawing on Member State practice (many below 4%), the literature ' +
      'on declining long-term discount rates and the Commission\'s 3% social ' +
      'discount rate for EU policy analysis (EC 2021c). Draft CBA 4.0 still ' +
      'mandates 4% real.',
    status: 'not-addressed',
    report: REPORT_EI_CBA_2023,
    uptakeEvents: [],
  },
  {
    id: 'ei-cba-2023-project-feasibility',
    area: 'CBA · Project feasibility',
    title:
      'Develop a quantified project-feasibility indicator covering commissioning ' +
      'likelihood, delay impacts and mitigation of environmental/social impacts',
    summary:
      'Decision-makers should consider promoter-submitted commissioning years ' +
      'as part of CBA results; ENTSO-E should expand the commissioning-date ' +
      'assessment into a quantified indicator capturing likelihood of timely ' +
      'delivery and net delay impacts; promoters should address public concern, ' +
      'environmental/social impacts and mitigation plans at the CBA stage. ' +
      'ACER monitoring shows ~40% of PCI commissioning dates slip annually.',
    status: 'in-progress',
    report: REPORT_EI_CBA_2023,
    uptakeEvents: [],
  },
  {
    id: 'ei-cba-2023-renewables-integration',
    area: 'CBA · Renewables integration',
    title:
      'Capture additional RES capacity enabled by projects in indicators B1/B3 ' +
      'and align RES definitions across CBA methodologies with the Renewable ' +
      'Energy Directive',
    summary:
      'The CBA methodology should reflect benefits linked to incremental RES ' +
      'capacities enabled by a project (beyond the reference grid), including ' +
      'avoided curtailment, and align the RES definition under TEN-E Art. 11 ' +
      'with RED III Art. 2 (Dir (EU) 2023/2413). Currently inadequate in ' +
      'ENTSO-E draft CBA 4.0.',
    status: 'in-progress',
    report: REPORT_EI_CBA_2023,
    uptakeEvents: [],
  },
  {
    id: 'ei-cba-2023-sector-coupling',
    area: 'CBA · Sector coupling',
    title:
      'Elaborate and make non-optional the treatment of sector-coupling impacts ' +
      'in the CBA methodology',
    summary:
      'Ways to account for impacts of sector coupling (electricity-gas-hydrogen-' +
      'heat-transport interactions) should be further developed and made ' +
      'mandatory across CBA methodologies, supporting the system-wide ' +
      'assessment required by Art. 11 TEN-E. Currently optional/under-developed.',
    status: 'in-progress',
    report: REPORT_EI_CBA_2023,
    uptakeEvents: [],
  },
];

// ── TEN-E draft scenarios advice (Jun 2024) ─────────────────────────────────
const REPORT_TENE_2024 = RECOMMENDATION_REPORTS['ten-e-draft-scenarios-2024'];
export const ESABCC_2024_TENE_SCENARIOS_RECOMMENDATIONS: PastRecommendation[] = [
  {
    id: 'tene-2024-target-alignment',
    area: 'TYNDP 2024 · climate-target alignment',
    title:
      'Improve TYNDP 2024 joint scenarios so they comply with EU 2030/2050 ' +
      'climate targets and the energy-efficiency-first principle, by updating ' +
      'assumptions and the GHG budget calculation, using the latest national ' +
      'plans and differentiating pathways',
    summary:
      'Update core assumptions (notably CCS/CCU deployment and costs) with the ' +
      'latest scientific and institutional scenarios; improve the GHG budget ' +
      'calculation; rebuild on the most up-to-date NECPs and projections; ' +
      'further differentiate DE and GA scenarios. Maps to TEN-E Reg (EU) ' +
      '2022/869 Art. 12, ACER scenario guidelines, European Climate Law and ' +
      'RED III / EED. Draft DE GHG budget at 15.9 GtCO2e is above the Board\'s ' +
      '11–14 Gt range.',
    status: 'in-progress',
    report: REPORT_TENE_2024,
    uptakeEvents: [],
  },
  {
    id: 'tene-2024-climate-resilience',
    area: 'TYNDP 2024 · resilience',
    title:
      'Factor climate risks systematically into the joint scenarios, including ' +
      'the costs and measures needed to adapt existing and new infrastructure',
    summary:
      'Incorporate up-to-date climate projections, account for risks beyond ' +
      'Dunkelflaute (droughts, floods, heat-waves, water shortages, peak-load ' +
      'shifts, impacts on hydro, thermal and nuclear cooling) and reflect ' +
      'adaptation activities and costs for existing and new infrastructure. ' +
      'Current scenarios rely on pre-2010 climate years.',
    status: 'not-addressed',
    report: REPORT_TENE_2024,
    uptakeEvents: [],
  },
  {
    id: 'tene-2024-transparency-participation',
    area: 'TYNDP 2024 · transparency & participation',
    title:
      'Deliver draft joint scenarios on a timetable that allows meaningful ' +
      'consultation and make the scenario-building process more agile to ' +
      'incorporate new assumptions, plans and sensitivities',
    summary:
      'Submit draft scenarios to ACER, the Commission and the Stakeholder ' +
      'Reference Group in time for input to influence modelling within the same ' +
      'TYNDP cycle, and make the process agile enough to absorb new climate ' +
      'plans, targets and sensitivities. 2024 cycle was delayed; Plexos and ' +
      'Demand Forecasting Toolbox remain restricted-access.',
    status: 'in-progress',
    report: REPORT_TENE_2024,
    uptakeEvents: [],
  },
  {
    id: 'tene-2024-hydrogen-cost-assumptions',
    area: 'TYNDP 2024 · hydrogen assumptions',
    title:
      'Revisit electrolyser capex, hydrogen price-setting and import-price ' +
      'assumptions using up-to-date Commission/IEA values and document compliance ' +
      'with renewable-hydrogen correlation rules',
    summary:
      'Electrolyser capex of €565/kW in 2025 and €366/kW in 2030 is low vs. ' +
      'Commission/IEA values; operation optimisation does not demonstrate ' +
      'compliance with temporal/geographic correlation criteria for renewable ' +
      'hydrogen (Delegated Reg (EU) 2023/1184); constant low/high import-price ' +
      'bands are insufficiently sourced.',
    status: 'in-progress',
    report: REPORT_TENE_2024,
    uptakeEvents: [],
  },
  {
    id: 'tene-2024-res-tech-costs',
    area: 'TYNDP 2024 · RES technology costs',
    title:
      'Broaden the evidence base for renewable energy capex/opex beyond a single ' +
      'Member State source and justify the ±15–20% storyline deviations',
    summary:
      'Extend the cost basis (currently largely from the Danish Energy Agency) ' +
      'to the best up-to-date scientific evidence on future technology costs, ' +
      'and document/justify the unexplained ±15–20% deviations applied in DE ' +
      'and GA storylines.',
    status: 'in-progress',
    report: REPORT_TENE_2024,
    uptakeEvents: [],
  },
  {
    id: 'tene-2024-co2-price',
    area: 'TYNDP 2024 · CO2 price',
    title:
      'Adopt a higher, opportunity-cost-based CO2 price trajectory consistent ' +
      'with EU climate policy for project appraisal',
    summary:
      'CO2 prices of €114/t in 2030 and €168/t in 2050 (US EIA / IEA sources) ' +
      'are well below the EIB-style opportunity-cost trajectory (€250/t in 2030 ' +
      'to €800/t in 2050) recommended in the 2023 CBA advice. Align with an ' +
      'EU-wide opportunity-cost approach.',
    status: 'in-progress',
    report: REPORT_TENE_2024,
    uptakeEvents: [],
  },
  {
    id: 'tene-2024-ccs-cost-coverage',
    area: 'TYNDP 2024 · CCS assumptions',
    title:
      'Include CCS costs in the investment model and justify the assumption that ' +
      'up to 21 Member States will retrofit existing fossil-gas hydrogen ' +
      'production with CCS by 2030',
    summary:
      'Model CCS costs explicitly (currently excluded from the investment ' +
      'model), use realistic capture rates (60–90% rather than a blanket 90%), ' +
      'and clarify/justify the list of countries assumed to retrofit SMR/ATR ' +
      'units with CCS by 2030, with CCS targeted at hard-to-abate uses.',
    status: 'in-progress',
    report: REPORT_TENE_2024,
    uptakeEvents: [],
  },
  {
    id: 'tene-2024-methane-blend-biomethane',
    area: 'TYNDP 2024 · methane / biomethane',
    title:
      'Justify the assumed shift to 100% renewable methane/hydrogen in the gas ' +
      'blend and the massive biomethane scale-up, and address fossil-gas lock-in ' +
      'risks',
    summary:
      'Modelled biomethane supply (379 TWh in 2030, up to 811 TWh in 2050) ' +
      'implies a ~20× scale-up from 2021 (~37.5 TWh) and overshoots the ' +
      'REPowerEU 35 bcm 2030 target; the jump from a 90% fossil-gas share in ' +
      '2030 to 100% renewable gas in modelling needs explicit justification ' +
      'and consideration of fugitive emissions and electrification delays.',
    status: 'in-progress',
    report: REPORT_TENE_2024,
    uptakeEvents: [],
  },
  {
    id: 'tene-2024-hydrogen-methane-buildings',
    area: 'TYNDP 2024 · buildings end-use',
    title:
      'Drop or sharply curtail the assumed role of hydrogen and high methane ' +
      'volumes for heating in residential and tertiary sectors',
    summary:
      'Per IPCC AR6, hydrogen for buildings heating costs much more than heat ' +
      'pumps and plays a very modest role by 2050; the high 2040 methane demand ' +
      'in residential/tertiary (504–601 TWh vs ~287 TWh in Commission S3) ' +
      'should also be reconsidered. Hydrogen should be targeted at uses that ' +
      'cannot be directly electrified.',
    status: 'in-progress',
    report: REPORT_TENE_2024,
    uptakeEvents: [],
  },
  {
    id: 'tene-2024-pathway-range',
    area: 'TYNDP 2024 · pathway range',
    title:
      'Construct a wider and more contrasting range of climate-neutrality ' +
      'pathways and apply the integrated building-block approach (flexibility, ' +
      'electrification, hydrogen/e-fuels, offshore grids, CDR)',
    summary:
      'DE and GA should be differentiated more strongly (and earlier than post-' +
      '2030); scenarios should cover diverse options to reduce fossil-fuel ' +
      'import dependency; the 2022 building-block approach should be properly ' +
      'integrated with transparent dynamic linkages between modules (Plexos, ' +
      'DFT, Energy Transition Model, etc.).',
    status: 'in-progress',
    report: REPORT_TENE_2024,
    uptakeEvents: [],
  },
  {
    id: 'tene-2024-fair-process',
    area: 'TYNDP 2024 · FAIR data & process',
    title:
      'Open up models, data and gap-filling results under FAIR principles and ' +
      'give the Stakeholder Reference Group sufficient time and access in the ' +
      '2026 cycle',
    summary:
      'Plexos, the Demand Forecasting Toolbox and the NT+ FEC gap-filling ' +
      'results (by sector/country) should be findable, accessible, interoperable ' +
      'and reusable; the Stakeholder Reference Group should get timely access ' +
      'to model files in the next TYNDP cycle, addressing the SRG\'s own ' +
      'request after finding inconsistencies in the 2024 data.',
    status: 'not-addressed',
    report: REPORT_TENE_2024,
    uptakeEvents: [],
  },
];

// ── Scaling up carbon dioxide removals (Feb 2025) ───────────────────────────
const REPORT_CDR_2025 = RECOMMENDATION_REPORTS['carbon-removals-2025'];
export const ESABCC_2025_CDR_RECOMMENDATIONS: PastRecommendation[] = [
  {
    id: 'cdr-2025-separate-targets',
    area: 'CDR1 · Separate targets',
    title:
      'Set separate legally-binding EU targets for gross emission reductions, ' +
      'permanent removals and temporary removals across near-, medium- and long-' +
      'term horizons',
    summary:
      'Distinct near-/medium-/long-term targets covering minimum removals and ' +
      'maximum contributions of removals towards net emissions goals, to be set ' +
      'when revising the European Climate Law or developing the post-2030 ' +
      'framework. Also asks for a long-term commitment to protect and enhance ' +
      'EU land sinks in the LULUCF Regulation revision and CCS-specific ' +
      'removal targets. Followed up by the Board\'s June 2025 Climate Law ' +
      'advice; the 2026 Climate Law amendment sets a -90% 2040 target without ' +
      'separate sub-targets.',
    status: 'partially',
    report: REPORT_CDR_2025,
    uptakeEvents: [
      {
        date: '2026-03-11',
        note:
          'Regulation (EU) 2026/667 amending the European Climate Law adopted ' +
          'with a -90% net 2040 target but without statutory separate sub-' +
          'targets for gross reductions, permanent removals and temporary ' +
          'removals.',
        sourceUrl:
          'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32026R0667',
      },
    ],
  },
  {
    id: 'cdr-2025-mrv-quality',
    area: 'CDR2 · MRV and quality',
    title:
      'Build robust activity- and national-level MRV for removals and ensure ' +
      'transparency on their contribution to climate objectives',
    summary:
      'Calls for measurable, binding sustainability safeguards (including ' +
      'climate adaptation) under the Carbon Removals and Carbon Farming Reg ' +
      '(EU) 2024/3012, regular methodology updates and differentiation of CRCF ' +
      'certificates between temporary removals, permanent removals and ' +
      'emission reductions. CRCF data should feed national GHG inventories ' +
      'under the Governance Regulation. Also urges rapid adoption of the ' +
      'Forest Monitoring Law and Soil Monitoring and Resilience Law.',
    status: 'in-progress',
    report: REPORT_CDR_2025,
    uptakeEvents: [],
  },
  {
    id: 'cdr-2025-land-sink-lulucf',
    area: 'CDR3 · Land sink',
    title:
      'Halt and reverse the decline of the EU land sink by integrating land-' +
      'related policies into a coherent framework with sectoral measures',
    summary:
      'Mainstream climate adaptation across policies; adopt the Forest ' +
      'Monitoring and Soil Monitoring laws; create synergies with the Nature ' +
      'Restoration Reg (EU) 2024/1991; align the CAP with net-zero (incentives ' +
      'for adaptation, soil-carbon sequestration, emission reductions, ' +
      'sustainable land management); ensure coherence across RED III, FuelEU ' +
      'Maritime, ReFuelEU Aviation and the CRCF Regulation. EU land sink has ' +
      'declined ~one third over the last decade.',
    status: 'in-progress',
    report: REPORT_CDR_2025,
    uptakeEvents: [],
  },
  {
    id: 'cdr-2025-innovation',
    area: 'CDR4 · Innovation',
    title:
      'Accelerate innovation in diverse removal methods by strengthening ' +
      'regulatory signals, expanding funding across the innovation cycle, ' +
      'prioritising CCS for permanent removals and raising public awareness',
    summary:
      'Increase Horizon Europe and LIFE funding for diverse removal methods; ' +
      'prioritise Innovation Fund support for CCS toward permanent removals ' +
      '(BECCS, DACCS) and for CCS in hard-to-abate activities. Suggests ' +
      'extending the RRF beyond 2026, deeper EIC–EIB/EIF cooperation to de-risk ' +
      'venture capital, and demand-pull instruments such as public procurement.',
    status: 'in-progress',
    report: REPORT_CDR_2025,
    uptakeEvents: [],
  },
  {
    id: 'cdr-2025-co2-infrastructure',
    area: 'CDR5 · CO2 infrastructure',
    title:
      'Coordinate, fund and strategically plan EU CO2 transport and storage ' +
      'infrastructure while ensuring equitable access, just transition and ' +
      'climate resilience',
    summary:
      'Coordinated build-out of CO2 infrastructure for removals (e.g. via the ' +
      'TEN-E Regulation) while restricting fossil-CCS infrastructure access to ' +
      'hard-to-abate activities. Leverage the Net-Zero Industry Act Reg (EU) ' +
      '2024/1735, Connecting Europe Facility and Innovation Fund for ' +
      'BECCS/DACCS accessibility, and close regulatory gaps across the CO2 ' +
      'value chain.',
    status: 'in-progress',
    report: REPORT_CDR_2025,
    uptakeEvents: [],
  },
  {
    id: 'cdr-2025-ets-integration',
    area: 'CDR6 · ETS integration',
    title:
      'Progressively integrate permanent removals into the EU ETS under strict ' +
      'conditions to prevent mitigation deterrence and ensure fairness',
    summary:
      'Use the upcoming EU ETS Directive revision to secure post-2040 viability ' +
      'and prepare for net-zero/net-negative, integrating permanent removals ' +
      'gradually with quantitative and qualitative limits consistent with ' +
      'separate targets. Robust certification (CDR2) must precede market ' +
      'integration. The 2026 ETS review is the next decision point.',
    status: 'not-addressed',
    report: REPORT_CDR_2025,
    uptakeEvents: [],
  },
  {
    id: 'cdr-2025-lulucf-pricing',
    area: 'CDR7 · LULUCF pricing',
    title:
      'Introduce new instruments to price emissions and reward removals in the ' +
      'LULUCF sector, distinct from but coherent with the wider climate policy ' +
      'framework',
    summary:
      'A separate pricing system for land-sector emissions and removals, with ' +
      'possible future integration with other GHG pricing systems under ' +
      'specific conditions. Pricing and long-term monitoring should be ' +
      'reinforced through other land policies (CDR3) to fund land-sink ' +
      'maintenance, ecosystem restoration and adaptive practices.',
    status: 'not-addressed',
    report: REPORT_CDR_2025,
    uptakeEvents: [],
  },
  {
    id: 'cdr-2025-emitter-responsibility',
    area: 'CDR8 · Extended emitter responsibility',
    title:
      'Recognise an extended emitter responsibility requiring today\'s emitters ' +
      'to contribute to future removal of the GHGs they emit',
    summary:
      'Asks the Commission to assess options, governance requirements and a ' +
      'strategy to operationalise extended emitter responsibility supporting ' +
      'net-negative emissions, while ensuring it does not increase the short-' +
      'term GHG budget. Options include allowing emitters to counterbalance with ' +
      'future removals (with budget caps) or requiring payment for both ' +
      'emissions and subsequent removal costs.',
    status: 'not-addressed',
    report: REPORT_CDR_2025,
    uptakeEvents: [],
  },
  {
    id: 'cdr-2025-governance-diplomacy',
    area: 'CDR9 · Governance and diplomacy',
    title:
      'Expand EU climate governance and institutional capacity for removals and ' +
      'reinforce climate diplomacy to reduce leakage and lift global ambition',
    summary:
      'Strengthen the role of removals in the Governance Regulation and ' +
      'European Climate Law with a clear commitment to net-negative emissions; ' +
      'build capacity within existing institutions (and create new ones if ' +
      'needed); and use climate diplomacy and policies that foster financial ' +
      'and technological transfer to reduce carbon leakage and enhance global ' +
      'ambition.',
    status: 'in-progress',
    report: REPORT_CDR_2025,
    uptakeEvents: [],
  },
];

// ── Advice on amending the European Climate Law (Jun 2025) ──────────────────
const REPORT_CL_2025 = RECOMMENDATION_REPORTS['climate-law-amendment-2025'];
export const ESABCC_2025_CLIMATE_LAW_RECOMMENDATIONS: PastRecommendation[] = [
  {
    id: 'climate-law-2025-2040-target',
    area: 'CL1 · 2040 target',
    title:
      'Adopt a binding net domestic greenhouse gas emission reduction target for ' +
      '2040 in the range of −90 to −95% relative to 1990 levels',
    summary:
      'Enshrine a −90 to −95% domestic net cut by 2040 in the amended European ' +
      'Climate Law, met through domestic action with full Fit-for-55 ' +
      'implementation and a reinforced post-2030 framework, supported by ' +
      'emissions trading, innovation, power-infrastructure investment and a ' +
      'just-transition package funded by ETS revenues and redirected fossil ' +
      'subsidies. Adopted in substance as -90% by Regulation (EU) 2026/667, with ' +
      'up to 5% international credits from 2036.',
    status: 'addressed',
    report: REPORT_CL_2025,
    uptakeEvents: [
      {
        date: '2026-03-11',
        note:
          'Regulation (EU) 2026/667 amending the European Climate Law adopted: ' +
          'binding -90% net GHG by 2040.',
        sourceUrl:
          'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32026R0667',
      },
    ],
  },
  {
    id: 'climate-law-2025-three-targets',
    area: 'CL2 · CDR sub-targets',
    title:
      'Set three separate 2040 targets — for gross emission reductions, permanent ' +
      'CO2 removals, and temporary CO2 removals — in the Climate Law or ' +
      'subsequent legislation',
    summary:
      'To prevent mitigation deterrence and avoid investment being diverted ' +
      'from emission cuts to removals, the EU should adopt three distinct ' +
      'sub-targets reflecting the different characteristics of gross ' +
      'reductions, permanent removals and temporary (land-based) removals. ' +
      'These should sit inside a broader EU CDR framework and be backed by ' +
      'pricing tools including gradual integration of permanent removals into ' +
      'the EU ETS and an extended emitter-responsibility mechanism. Not ' +
      'reflected in the adopted Reg (EU) 2026/667.',
    status: 'not-addressed',
    report: REPORT_CL_2025,
    uptakeEvents: [],
  },
  {
    id: 'climate-law-2025-international-action',
    area: 'CL3 · International cooperation',
    title:
      'Strengthen international support, cooperation and partnerships on climate ' +
      'action, without using international credits to meet the EU\'s 2040 or ' +
      '2035 domestic targets',
    summary:
      'Expand external climate action via carbon-pricing alliances, clean-tech ' +
      'investment, technology cooperation and increased climate finance, ' +
      'including Article 6 mechanisms. International credits must not count ' +
      'towards the 2040 or 2035 domestic targets; their potential role in ' +
      'achieving net-negative emissions after climate neutrality (via high-' +
      'quality CDR credits) should be explored. Partly contradicted by Reg ' +
      '(EU) 2026/667 allowing up to 5% international credits from 2036.',
    status: 'partially',
    report: REPORT_CL_2025,
    uptakeEvents: [],
  },
  {
    id: 'climate-law-2025-adaptation',
    area: 'CL4 · Adaptation and resilience',
    title:
      'Strengthen the EU adaptation framework by anchoring a clear 2050 ' +
      'resilience vision, measurable EU-level adaptation targets and indicators, ' +
      'and robust governance in the European Climate Law or subsequent ' +
      'legislation',
    summary:
      'The current adaptation framework lacks a clear vision, measurable ' +
      'objectives and a solid legal basis. The Climate Law (or successor ' +
      'legislation) should embed an operational 2050 adaptation vision aligned ' +
      'with the Paris Agreement Global Goal on Adaptation, set collective EU ' +
      'adaptation targets and indicators, support periodic EU-wide risk ' +
      'assessments and MEL, and clarify roles across EU institutions and ' +
      'Member States.',
    status: 'in-progress',
    report: REPORT_CL_2025,
    uptakeEvents: [],
  },
];

// ── EU adaptation policy framework (Feb 2026) ───────────────────────────────
const REPORT_ADAPT_2026 = RECOMMENDATION_REPORTS['adaptation-2026'];
export const ESABCC_2026_ADAPTATION_RECOMMENDATIONS: PastRecommendation[] = [
  {
    id: 'adaptation-2026-risk-assessment-mandate',
    area: 'A1.1 · Risk assessment',
    title:
      'Mandate climate risk assessments across relevant EU policies and decision-' +
      'making, based on the common reference (with stress-test scenarios), ' +
      'covering physical hazards and socio-economic vulnerabilities and ' +
      'explicitly addressing transboundary, compounding and cascading risks, ' +
      'grounded in regularly updated EUCRA',
    summary:
      'Embeds standardised climate risk assessments into EU policymaking and ' +
      'investment decisions, anchored in common scenarios and updated science. ' +
      'Maps to European Climate Law, Governance Reg (EU) 2018/1999 and the ' +
      'forthcoming European integrated framework for climate resilience. ' +
      'Existing requirements are fragmented and often use historical or ' +
      'optimistic pathways.',
    status: 'not-addressed',
    report: REPORT_ADAPT_2026,
    uptakeEvents: [],
  },
  {
    id: 'adaptation-2026-common-scenarios',
    area: 'A1.2 · Common EU scenarios',
    title:
      'Establish a set of common EU climate scenarios — including a common ' +
      'reference — co-developed with Member States, aligned with IPCC and UNEP, ' +
      'covering seasonal/extreme changes at adequate spatial and temporal ' +
      'resolution',
    summary:
      'Harmonised climate scenarios (via Copernicus C3S and national providers) ' +
      'to underpin coherent risk assessment and adaptation planning. No common ' +
      'reference scenario exists today, leading to inconsistent assessments ' +
      'across EU policies.',
    status: 'not-addressed',
    report: REPORT_ADAPT_2026,
    uptakeEvents: [],
  },
  {
    id: 'adaptation-2026-methodology-standards',
    area: 'A1.3 · Methodology standards',
    title:
      'Establish EU methodological standards for climate risk assessments, ' +
      'defining scenarios, time horizons, sectoral coverage, minimum analytical ' +
      'requirements and update frequencies, including near-term risks for early ' +
      'warning',
    summary:
      'Common parameters and definitions so assessments are comparable across ' +
      'policies and governance levels. Maps to the European integrated framework ' +
      'for climate resilience and Member State adaptation planning under the ' +
      'Governance Regulation. Methodologies currently vary widely in scope and ' +
      'update cycles.',
    status: 'not-addressed',
    report: REPORT_ADAPT_2026,
    uptakeEvents: [],
  },
  {
    id: 'adaptation-2026-planning-pathways',
    area: 'A1.4 · Planning & governance',
    title:
      'Enhance adaptation planning across sectors and governance levels: require ' +
      'Member States to define adaptation pathways from harmonised risk ' +
      'assessments, prioritise the most vulnerable populations/regions/sectors, ' +
      'and strengthen MS reporting on plans and progress',
    summary:
      'Push Member States to translate harmonised risk assessments into binding ' +
      'adaptation pathways and to report transparently, with EU action where ' +
      'gaps appear. Maps to Governance Reg (EU) 2018/1999, NECPs and National ' +
      'Adaptation Strategies.',
    status: 'not-addressed',
    report: REPORT_ADAPT_2026,
    uptakeEvents: [],
  },
  {
    id: 'adaptation-2026-corporate-disclosure',
    area: 'A1.5 · Corporate disclosure',
    title:
      'Fully integrate climate risk management into corporate reporting, ' +
      'disclosure and financial supervision — including extending CSRD\'s ' +
      'geographic and sectoral coverage in future reviews, proportionate to ' +
      'climate-risk exposure and economic significance',
    summary:
      'Make private-sector climate-risk disclosure consistent across EU ' +
      'legislation, with the CSRD as the key instrument. Maps to CSRD, ESRS, ' +
      'EBA/ECB/EIOPA supervisory work and the Sustainable Finance framework. ' +
      'CSRD scope was reduced under Omnibus simplification.',
    status: 'partially',
    report: REPORT_ADAPT_2026,
    uptakeEvents: [],
  },
  {
    id: 'adaptation-2026-planning-baseline',
    area: 'A2.1 · Planning reference',
    title:
      'Adopt a common reference for adaptation planning based on SSP2-4.5, ' +
      'preparing the EU for a pathway to 2.8–3.3°C of global warming by 2100 ' +
      '(with higher regional warming for Europe)',
    summary:
      'Sets a minimum acceptable warming baseline that EU adaptation should ' +
      'plan against, consistent with the precautionary principle and current ' +
      'global policies. Maps to the European integrated framework for climate ' +
      'resilience and the next EU Adaptation Strategy update.',
    status: 'in-progress',
    report: REPORT_ADAPT_2026,
    uptakeEvents: [],
  },
  {
    id: 'adaptation-2026-stress-test',
    area: 'A2.2 · Stress-testing',
    title:
      'Use more adverse emissions pathways (e.g. SSP3-7.0) for stress-testing ' +
      'the robustness of EU policies, investments and adaptation options under ' +
      'higher-risk futures',
    summary:
      'Complements the common reference with high-end stress tests to safeguard ' +
      'against climate-policy delay or reversal. Maps to climate risk ' +
      'assessment guidance, financial supervisory stress tests and ' +
      'infrastructure planning standards.',
    status: 'not-addressed',
    report: REPORT_ADAPT_2026,
    uptakeEvents: [],
  },
  {
    id: 'adaptation-2026-vision-targets',
    area: 'A3.1 · Vision & targets',
    title:
      'Set out a clear vision for a climate-resilient EU by 2050 and the longer ' +
      'term, supported by sectoral strategies and cross-cutting and sector-' +
      'specific adaptation targets (e.g. for 2030 and 2040)',
    summary:
      'A legally anchored long-term vision and measurable adaptation targets, ' +
      'mirroring the EU\'s target-based mitigation framework. Maps to the ' +
      'European Climate Law, the EU Adaptation Strategy and the forthcoming ' +
      'European integrated framework for climate resilience. Existing ' +
      'strategies articulate broad ambitions but lack concrete targets and ' +
      'legal force.',
    status: 'not-addressed',
    report: REPORT_ADAPT_2026,
    uptakeEvents: [],
  },
  {
    id: 'adaptation-2026-science-participation',
    area: 'A3.2 · Process',
    title:
      'Ground the EU climate-resilience vision and targets in science, EU ' +
      'commitments and participation — building on the common reference, ' +
      'aligning with the global goal on adaptation, ensuring inclusive ' +
      'engagement, and periodically reviewing',
    summary:
      'Defines the process by which the EU vision and targets should be set: ' +
      'science-based, value-aligned, participatory and iterative. Maps to the ' +
      'global goal on adaptation under the Paris Agreement (UAE Framework ' +
      'targets) and EU citizen engagement mechanisms.',
    status: 'not-addressed',
    report: REPORT_ADAPT_2026,
    uptakeEvents: [],
  },
  {
    id: 'adaptation-2026-resilience-by-design',
    area: 'A4.1 · Policy mainstreaming',
    title:
      'Apply a "climate resilience by design" principle across all EU policies, ' +
      'programmes and decisions — clarifying EU-level responsibilities for ' +
      'climate risk management and ensuring progress through binding ' +
      'obligations, incentives and capacity-building',
    summary:
      'Embed adaptation systematically into EU policy design and implementation, ' +
      'with explicit accountability. Maps to Better Regulation guidelines, ' +
      'impact assessments, MFF programmes and the European integrated framework ' +
      'for climate resilience.',
    status: 'not-addressed',
    report: REPORT_ADAPT_2026,
    uptakeEvents: [],
  },
  {
    id: 'adaptation-2026-mel-system',
    area: 'A4.2 · Monitoring & learning',
    title:
      'Develop and continuously update an EU monitoring, evaluation and learning ' +
      '(MEL) system for adaptation, covering risks, ecosystem resilience, loss ' +
      'and damage, common indicators linked to EU adaptation targets, ' +
      'effectiveness/maladaptation and links to early warning',
    summary:
      'Provides the feedback loop to track progress towards EU adaptation ' +
      'targets and adjust policies as risks evolve. Maps to EEA Climate-ADAPT, ' +
      'EUCRA, the Governance Regulation reporting cycle and Copernicus. No ' +
      'integrated EU-wide adaptation MEL system currently exists.',
    status: 'not-addressed',
    report: REPORT_ADAPT_2026,
    uptakeEvents: [],
  },
  {
    id: 'adaptation-2026-fairness',
    area: 'A4.3 · Just resilience',
    title:
      'Establish an EU framework for fairness assessments and apply it to ' +
      'relevant EU policies and measures, defining "just resilience", addressing ' +
      'distributional impacts across groups/regions/generations, and embedding ' +
      'it in MEL throughout the policy cycle',
    summary:
      'Goes beyond the narrow "do no significant harm" principle to ' +
      'systematically assess fairness of adaptation outcomes with affected-' +
      'community participation. Maps to the EU Adaptation Strategy\'s just ' +
      'resilience strand, Cohesion Policy and the Social Climate Fund.',
    status: 'not-addressed',
    report: REPORT_ADAPT_2026,
    uptakeEvents: [],
  },
  {
    id: 'adaptation-2026-economic-governance',
    area: 'A5.1 · Economic governance',
    title:
      'Use the EU economic governance framework — European Semester, Technical ' +
      'Support Instrument, Stability and Growth Pact — to embed climate risk ' +
      'management into national economic and fiscal planning, including as a ' +
      'core security concern',
    summary:
      'Treat climate risk as central to fiscal sustainability and security ' +
      'rather than a side issue, to steer national reforms and investments. ' +
      'Maps to the European Semester, Country-Specific Recommendations, SGP ' +
      'and TSI.',
    status: 'not-addressed',
    report: REPORT_ADAPT_2026,
    uptakeEvents: [],
  },
  {
    id: 'adaptation-2026-mff',
    area: 'A5.2 · EU budget (MFF)',
    title:
      'Strengthen the next MFF\'s contribution to climate resilience: apply ' +
      'climate-resilience-by-design across all programmes, improve expenditure ' +
      'tracking, provide targeted capacity-building, and coordinate climate, ' +
      'regional and social policies',
    summary:
      'Make the next MFF a primary lever for adaptation investment and ' +
      'structural risk reduction, including national/regional partnership ' +
      'plans. Maps to the post-2027 MFF, climate mainstreaming targets, ' +
      'Cohesion Policy and Just Transition mechanisms. Direct adaptation ' +
      'investment under the current MFF remains low with weak tracking.',
    status: 'in-progress',
    report: REPORT_ADAPT_2026,
    uptakeEvents: [],
  },
  {
    id: 'adaptation-2026-private-finance',
    area: 'A5.3 · Private finance',
    title:
      'Mobilise and align private finance with climate-resilience objectives, ' +
      'including via the MFF and EIB — using regulatory incentives (product ' +
      'standards, building codes, subsidies, spatial planning) and blended/' +
      'innovative finance to crowd in private adaptation investment',
    summary:
      'Closes the private adaptation finance gap by aligning incentives and ' +
      'de-risking investments. Maps to the Sustainable Finance framework, EU ' +
      'Taxonomy, EIB Climate Bank Roadmap and InvestEU. Private adaptation ' +
      'finance mobilisation is at an early stage.',
    status: 'not-addressed',
    report: REPORT_ADAPT_2026,
    uptakeEvents: [],
  },
  {
    id: 'adaptation-2026-insurance',
    area: 'A5.4 · Insurance',
    title:
      'Address the climate insurance protection gap and strengthen insurance-' +
      'system resilience — including EU-level reinsurance or public-private ' +
      'partnership mechanisms and standards embedding adaptation incentives in ' +
      'insurance product design',
    summary:
      'Tackles the fact that only ~25% of EU climate losses are insured, ' +
      'drawing on ECB/EIOPA proposals and Solvency II / IDD implementation. ' +
      'Maps to Solvency II, IDD, the ECB-EIOPA discussion paper on natural ' +
      'catastrophe insurance and EIOPA risk-dashboard work. No EU-level scheme ' +
      'yet.',
    status: 'not-addressed',
    report: REPORT_ADAPT_2026,
    uptakeEvents: [],
  },
  {
    id: 'adaptation-2026-crisis-response',
    area: 'A5.5 · Crisis response',
    title:
      'Strengthen EU crisis response and recovery instruments (EU Solidarity ' +
      'Fund and Union Civil Protection Mechanism) for more frequent climate ' +
      'disasters, incentivising proactive risk reduction and "build back ' +
      'better" recovery coordinated with insurance systems',
    summary:
      'Updates EU disaster response to reflect rising climate impacts and to ' +
      'drive resilient recovery rather than restoration of the status quo. ' +
      'Maps to the EU Solidarity Fund, UCPM/rescEU and EU disaster resilience ' +
      'goals. Instruments are increasingly strained and do not sufficiently ' +
      'incentivise proactive risk reduction.',
    status: 'not-addressed',
    report: REPORT_ADAPT_2026,
    uptakeEvents: [],
  },
];

// ── Agri-food system recommendations (Mar 2026) ─────────────────────────────
const REPORT_AF_2026 = RECOMMENDATION_REPORTS['agri-food-2026'];
export const ESABCC_2026_AGRI_FOOD_RECOMMENDATIONS: PastRecommendation[] = [
  {
    id: 'agri-food-2026-cap-payments',
    area: 'AF1 · CAP payments',
    title:
      'Gradually remove climate-harmful CAP payments, starting with coupled ' +
      'payments for ruminant livestock and decoupled payments on drained ' +
      'peatlands during the 2028–2034 CAP, and explore alternatives to broader ' +
      'decoupled income support in the longer term',
    summary:
      'Treats coupled livestock payments (~€16bn in 2023–2027, ~95% to ' +
      'ruminants), decoupled payments on drained peatlands (~€2.5bn) and basic ' +
      'decoupled payments (€120bn, 39% of CAP) as climate-harmful subsidies. ' +
      'Phase 1: eliminate the two most harmful streams in the next CAP, paired ' +
      'with transition support and redirection of freed funds. Phase 2: assess ' +
      'alternatives to general decoupled income support. Maps to CAP Strategic ' +
      'Plans Reg (EU) 2021/2115 and the 2028–2034 CAP proposal.',
    status: 'not-addressed',
    report: REPORT_AF_2026,
    uptakeEvents: [],
  },
  {
    id: 'agri-food-2026-ag-ets',
    area: 'AF2 · Carbon pricing',
    title:
      'Introduce a dedicated EU greenhouse gas pricing system for agriculture ' +
      'and land use (an "AgETS") that gradually applies the polluter-pays ' +
      'principle and rewards verified carbon removals across the agri-food ' +
      'value chain',
    summary:
      'Agriculture is ~17% of EU net GHG emissions but unpriced. Proposes a ' +
      'modular framework: (a) energy emissions folded into EU ETS / ETS2; (b) a ' +
      'separate scheme for non-CO2 emissions from livestock and N-fertilised ' +
      'soils; (c) a scheme for land-based agricultural CO2 fluxes. Start with ' +
      'MRV piloting and large entities, transition free allocation to ' +
      'auctioning, expand CRCF Reg (EU) 2024/3012 coverage and consider a ' +
      'border adjustment. No EU-level agri GHG price exists; Denmark\'s ' +
      'national tax is the precedent.',
    status: 'not-addressed',
    report: REPORT_AF_2026,
    uptakeEvents: [],
  },
  {
    id: 'agri-food-2026-transition-support',
    area: 'AF3 · Transition support',
    title:
      'Establish a comprehensive EU transition-support framework combining ' +
      'investment aid, transitional income support, knowledge/innovation ' +
      'support, payments for ecosystem services, and diversification/exit ' +
      'support, prioritising the most GHG-intensive and least climate-resilient ' +
      'farms with limited transition capacity',
    summary:
      'Five pillars: accessible investment finance for climate-friendly tech ' +
      'and farm restructuring; temporary income compensation; advisory ' +
      'services, R&D, demonstration projects and farm-level climate stress ' +
      'tests; payments for ecosystem services complementing carbon pricing; ' +
      'and diversification/exit instruments. Maps to CAP (Pillar I eco-' +
      'schemes, Pillar II rural development, FAS, EIP-AGRI, Horizon Europe) or ' +
      'a new stand-alone fund.',
    status: 'not-addressed',
    report: REPORT_AF_2026,
    uptakeEvents: [],
  },
  {
    id: 'agri-food-2026-adaptation-risk',
    area: 'AF4 · Risk management',
    title:
      'Strengthen EU instruments that help farmers cope with unavoidable climate ' +
      'impacts (acute hazards and slow-onset losses), while preserving ' +
      'incentives for proactive and transformational adaptation',
    summary:
      'Scale up subsidised agro-insurance, mutual funds and the agricultural ' +
      'reserve for disaster relief; update CAP ANC payments to reflect changing ' +
      'climatic conditions; make compensation conditional on minimum adaptation ' +
      'effort to avoid moral hazard and maladaptation; tie post-disaster aid ' +
      'to "build back better"; use ANC payments to support transformational ' +
      'adaptation, including diversification or cessation. Maps to CAP risk ' +
      'management toolbox (Art. 76–78), EU Solidarity Fund and the upcoming ' +
      'EU climate-resilience framework.',
    status: 'not-addressed',
    report: REPORT_AF_2026,
    uptakeEvents: [],
  },
  {
    id: 'agri-food-2026-food-policy',
    area: 'AF5 · Food policy',
    title:
      'Adopt an overarching EU food policy framework that promotes healthy, ' +
      'climate-friendly diets and reduces food waste across the value chain, ' +
      'while safeguarding equitable access to affordable, nutritious food',
    summary:
      'EU diets are too high in red meat and ultra-processed foods, driving ' +
      '~€530bn/yr in health costs and a major share of food-system emissions. ' +
      'The framework should encourage updated dietary guidelines reflecting ' +
      'health and climate science; regulate processors and retailers via ' +
      'marketing, labelling and public-procurement standards; mandate ' +
      'harmonised consumption/waste data; support food poverty, waste ' +
      'reduction and consumer information; and align supply-chain actors. ' +
      'Many Farm to Fork initiatives remain unimplemented.',
    status: 'not-addressed',
    report: REPORT_AF_2026,
    uptakeEvents: [],
  },
  {
    id: 'agri-food-2026-finance',
    area: 'AF6 · Finance',
    title:
      'Ensure sufficient and well-timed public funding for the agri-food ' +
      'transition by reallocating CAP resources towards climate, frontloading ' +
      'auction revenues from a future agri GHG pricing system, and mobilising ' +
      'other EU funds or a dedicated fund',
    summary:
      'Climate-proofing requires tens of billions of euros per year; private ' +
      'finance alone is insufficient. The Board recommends increasing the ' +
      'share of the CAP budget for climate action (reversing the decrease in ' +
      'the Commission\'s 2028–2034 proposal); frontloading auctioning of ' +
      'allowances in a future agri pricing scheme once a legal basis exists ' +
      '(EU ETS2 precedent); and mobilising other EU instruments — next MFF, ' +
      'EIB, national co-financing or a dedicated transition fund.',
    status: 'not-addressed',
    report: REPORT_AF_2026,
    uptakeEvents: [],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Combined export of every ESABCC recommendation across all reports — used
// by the Policy Gap project's seed pass so the Past recommendations tracker
// shows advice from every publication, not just the Jan 2024 progress report.
// ═══════════════════════════════════════════════════════════════════════════
export const ALL_ESABCC_RECOMMENDATIONS: PastRecommendation[] = [
  ...ESABCC_2022_ACER_RECOMMENDATIONS,
  ...ESABCC_2022_TENE_GUIDELINES_RECOMMENDATIONS,
  ...ESABCC_2023_CLIMATE_TARGETS_INIT_RECOMMENDATIONS,
  ...ESABCC_2023_ENERGY_CRISIS_RECOMMENDATIONS,
  ...ESABCC_2023_ENERGY_INFRASTRUCTURE_RECOMMENDATIONS,
  ESABCC_2023_2040_TARGET_ADVICE,
  ...ESABCC_2024_RECOMMENDATIONS,
  ...ESABCC_2024_TENE_SCENARIOS_RECOMMENDATIONS,
  ...ESABCC_2025_CDR_RECOMMENDATIONS,
  ...ESABCC_2025_CLIMATE_LAW_RECOMMENDATIONS,
  ...ESABCC_2026_ADAPTATION_RECOMMENDATIONS,
  ...ESABCC_2026_AGRI_FOOD_RECOMMENDATIONS,
];
