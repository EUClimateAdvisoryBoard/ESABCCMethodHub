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

export interface PastRecommendation {
  id: string;
  /** Chapter / area of the 2024 report. */
  area: string;
  title: string;
  summary: string;
  status: RecommendationStatus;
  uptakeEvents: UptakeEvent[];
}

export const ESABCC_2024_KEY_RECOMMENDATIONS: PastRecommendation[] = [
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
        date: '2024-10-30',
        note:
          'Commission assessment of draft updated NECPs published, identifying ' +
          'significant gaps versus the 2030 collective targets.',
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
          'buildings (operational 2027): Dir (EU) 2023/959.',
        sourceUrl:
          'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L0959',
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
        date: '2024-06-27',
        note:
          'Social Climate Fund Regulation (EU) 2023/955 in force; Member State ' +
          'plans due 30 June 2025; fund operational from 2026.',
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
        date: '2024-08-15',
        note: 'EU Methane Regulation (EU) 2024/1787 in force; implementing acts pending.',
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

export const ESABCC_2024_SECTORAL_RECOMMENDATIONS: PastRecommendation[] = [
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
        date: '2024-08-15',
        note: 'EU Methane Regulation (EU) 2024/1787 in force; implementing acts pending.',
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
      'and ETS2 (2027) implementation pending.',
    status: 'partially',
    uptakeEvents: [],
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

/**
 * Full Jan 2024 recommendation set used to seed the tracker:
 * the 13 Key recommendations followed by the 55 sectoral recommendations
 * (68 in total).
 */
export const ESABCC_2024_RECOMMENDATIONS: PastRecommendation[] = [
  ...ESABCC_2024_KEY_RECOMMENDATIONS,
  ...ESABCC_2024_SECTORAL_RECOMMENDATIONS,
];

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
