/**
 * Recommendations from the ESABCC report
 * "Towards EU climate neutrality: progress, policy gaps and opportunities"
 * (January 2024).
 * https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities
 *
 * The seed below encodes the report's **13 Key recommendations** (KR1–KR13)
 * from the executive summary. Sectoral recommendations (E1–S2) and any
 * supplementary advice (e.g. the June 2023 2040-target advice) are tracked
 * separately and can be added through the tracker UI.
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

export const ESABCC_2024_RECOMMENDATIONS: PastRecommendation[] = [
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
