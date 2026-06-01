/**
 * Recommendations from the ESABCC report
 * "Towards EU climate neutrality: progress, policy gaps and opportunities"
 * (January 2024).
 * https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities
 *
 * Each recommendation gets a tracker so users can record uptake events
 * (e.g. "2040 target picked up into legislation" → Regulation (EU) 2026/667).
 *
 * Statuses are interpreted as:
 *   - not-addressed:  no visible follow-up in EU legislation or strategy
 *   - in-progress:    referenced in Commission proposals / political agreement reached
 *   - addressed:      enacted in EU law or fully reflected in adopted strategy
 *   - partially:      partially reflected (e.g. weaker target, narrower scope)
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
    id: 'rec-2040-target',
    area: '2040 target',
    title: 'Adopt a 2040 EU climate target of –90 to –95% net GHG vs. 1990',
    summary:
      'Set a science-based 2040 target in the EU Climate Law in the range of ' +
      '–90% to –95% net GHG emissions versus 1990, with a domestic component ' +
      'and limits on the role of removals.',
    status: 'addressed',
    uptakeEvents: [
      {
        date: '2024-02-06',
        note:
          'Commission Communication on the 2040 target: COM(2024) 63 final ' +
          'proposed a –90% target.',
        sourceUrl:
          'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52024DC0063',
      },
      {
        date: '2026-04-07',
        note:
          'Regulation (EU) 2026/667 amending the European Climate Law ' +
          'entered into force, enshrining the –90% 2040 target with an ' +
          '–85% domestic floor and up to 5% from removals/international credits.',
      },
    ],
  },
  {
    id: 'rec-fossil-subsidies',
    area: 'Cross-cutting',
    title: 'Phase out fossil-fuel subsidies on a clear EU-wide timeline',
    summary:
      'Agree a Council/Commission timeline for phasing out direct and indirect ' +
      'fossil-fuel subsidies, starting with those without a social-mitigation ' +
      'rationale, and report transparently against it.',
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
    id: 'rec-carbon-pricing-extension',
    area: 'Carbon pricing',
    title: 'Strengthen and extend carbon pricing across all sectors',
    summary:
      'Ensure effective and rising carbon prices across all sectors, including ' +
      'agriculture and the remaining fossil uses, with predictable trajectories ' +
      'and revenue recycling that protects vulnerable households.',
    status: 'partially',
    uptakeEvents: [
      {
        date: '2023-05-16',
        note: 'ETS2 entered into force, covering road transport & buildings from 2027.',
      },
    ],
  },
  {
    id: 'rec-removal-targets',
    area: 'Carbon removals',
    title: 'Set separate targets for permanent and land-based removals',
    summary:
      'Adopt distinct, additional targets for permanent (geological) and ' +
      'land-based carbon removals, avoiding substitution of mitigation by removals.',
    status: 'in-progress',
    uptakeEvents: [
      {
        date: '2024-12-09',
        note:
          'Carbon Removals and Carbon Farming (CRCF) Regulation (EU) 2024/3012 ' +
          'establishes a certification framework but does not set quantitative targets.',
      },
    ],
  },
  {
    id: 'rec-lulucf-restoration',
    area: 'LULUCF',
    title: 'Reverse the declining LULUCF sink and align with Nature Restoration goals',
    summary:
      'Implement measures to reverse the decline of the EU land sink and ' +
      'align the LULUCF Regulation with the Nature Restoration Regulation.',
    status: 'partially',
    uptakeEvents: [
      {
        date: '2024-08-18',
        note: 'Nature Restoration Regulation (EU) 2024/1991 entered into force.',
      },
    ],
  },
  {
    id: 'rec-fairness-package',
    area: 'Fairness',
    title: 'Integrate distributional impact assessment into all climate files',
    summary:
      'Systematically assess and report distributional impacts of climate ' +
      'policies on households, regions and workers, and design compensating ' +
      'measures using ETS / ETS2 revenues.',
    status: 'in-progress',
    uptakeEvents: [
      {
        date: '2024-06-27',
        note: 'Social Climate Fund Regulation in force; Member State plans due 30 June 2025.',
      },
    ],
  },
  {
    id: 'rec-industrial-policy',
    area: 'Industry',
    title: 'Align EU industrial policy with the 2040 trajectory',
    summary:
      'Use the Net-Zero Industry Act, CBAM and state-aid framework to ' +
      'accelerate decarbonisation of energy-intensive industry and lock in ' +
      'lead-market demand for clean products.',
    status: 'in-progress',
    uptakeEvents: [
      {
        date: '2024-06-29',
        note: 'Net-Zero Industry Act (Regulation (EU) 2024/1735) entered into force.',
      },
    ],
  },
  {
    id: 'rec-buildings-renovation',
    area: 'Buildings',
    title: 'Front-load building renovations and electrification of heat',
    summary:
      'Accelerate deep renovation of the worst-performing building stock, ' +
      'expand heat-pump deployment, and ensure dedicated finance for ' +
      'low-income households.',
    status: 'partially',
    uptakeEvents: [
      {
        date: '2024-05-28',
        note: 'EPBD recast (Directive (EU) 2024/1275) entered into force.',
      },
    ],
  },
  {
    id: 'rec-transport-demand',
    area: 'Transport',
    title: 'Strengthen demand-side measures in transport',
    summary:
      'Complement vehicle-CO₂ standards with policies that reduce transport ' +
      'demand and shift to active and public modes, including a binding modal-shift ' +
      'objective.',
    status: 'not-addressed',
    uptakeEvents: [],
  },
  {
    id: 'rec-agri-emissions',
    area: 'Agriculture',
    title: 'Bring agricultural non-CO₂ emissions under a clear policy framework',
    summary:
      'Set a sectoral pathway for agricultural CH₄ and N₂O, accompany the ' +
      'CAP with binding instruments and provide a fair-transition package for farmers.',
    status: 'not-addressed',
    uptakeEvents: [],
  },
  {
    id: 'rec-adaptation-mainstreaming',
    area: 'Adaptation',
    title: 'Mainstream adaptation across all EU funds and policies',
    summary:
      'Require systematic climate-risk and resilience assessments for EU funds ' +
      'and major infrastructure, and operationalise the European Climate Risk ' +
      'Assessment recommendations.',
    status: 'in-progress',
    uptakeEvents: [
      {
        date: '2024-03-12',
        note: 'European Climate Risk Assessment (EUCRA) published by EEA.',
      },
    ],
  },
  {
    id: 'rec-finance-private',
    area: 'Finance',
    title: 'Mobilise private investment consistent with the 2040 pathway',
    summary:
      'Close the climate-investment gap by aligning sustainable-finance rules, ' +
      'EIB lending and InvestEU with the 2040 pathway; phase down financing of ' +
      'fossil assets.',
    status: 'in-progress',
    uptakeEvents: [],
  },
  {
    id: 'rec-governance-implementation',
    area: 'Governance',
    title: 'Strengthen implementation and monitoring under the Governance Regulation',
    summary:
      'Improve the quality, comparability and transparency of NECPs, with ' +
      'stronger Commission guidance, public participation and corrective ' +
      'mechanisms when collective progress is insufficient.',
    status: 'partially',
    uptakeEvents: [
      {
        date: '2024-10-30',
        note:
          'Commission assessment of draft updated NECPs published, identifying ' +
          'significant gaps versus the 2030 collective targets.',
      },
    ],
  },
];
