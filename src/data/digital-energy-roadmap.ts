/**
 * Coherence check of the European Commission's
 *   "Strategic Roadmap for Digitalisation and AI in the Energy Sector"
 *   — COM(2026) 501 final, Brussels, 3.6.2026
 * against
 *   • the European Scientific Advisory Board on Climate Change (ESABCC)
 *     recommendations (primarily "Towards EU climate neutrality", Jan 2024,
 *     plus the June 2023 2040-target advice), and
 *   • the EU's binding climate and energy goals.
 *
 * This is a *structured reading* of the Roadmap, not an automated extraction.
 * Every roadmap fact below carries a short, near-verbatim quote and the page
 * of the source PDF it is taken from; every finding cites the specific ESABCC
 * recommendation id (matching `ESABCC_2024_RECOMMENDATIONS` /
 * `ESABCC_2023_2040_TARGET_ADVICE` in `esabcc-recommendations.ts`) and/or the
 * EU goal it pulls against, and prints a numbered reasoning chain.
 *
 * The lens is deliberately even-handed: the Roadmap contains real
 * climate-positive measures (smart grids, flexibility, curtailment reduction),
 * recorded here as `alignment` findings, as well as the tensions and
 * contradictions that are the point of the exercise.
 *
 * Compiled: 2026-06-23. Source PDF: COM(2026) 501 final, part 1.
 */

export const ROADMAP_META = {
  title: 'Strategic Roadmap for Digitalisation and AI in the Energy Sector',
  celex: 'COM(2026) 501 final',
  date: '2026-06-03',
  dateLabel: 'Brussels, 3 June 2026',
  publisher: 'European Commission',
  sourceLabel: 'COM(2026) 501 final — part 1',
  pillars: [
    {
      id: 'P1',
      name: 'Pillar I — Energy for AI',
      gist: 'Sustainable integration of data centres into the energy system (security of supply, competitiveness, clean-energy objectives).',
    },
    {
      id: 'P2',
      name: 'Pillar II — Digitalisation and AI for the energy system',
      gist: 'Deploy digital and AI solutions across the value chain: smarter grids, smart meters, AI foundation models for grid management.',
    },
    {
      id: 'P3',
      name: 'Pillar III — Data for AI and the energy system',
      gist: 'A framework for trusted, cross-border energy-data exchange and interoperability (primary and secondary use of energy data).',
    },
    {
      id: 'X',
      name: 'Cross-cutting + implementation',
      gist: 'Trust, cybersecurity & hybrid threats, skills, international cooperation; an annual Energy Digitalisation Forum and indicative targets to 2030.',
    },
  ],
  flagships: [
    { id: 'FA1', pillar: 'P1', name: 'Model tripartite agreement for sustainable data-centre integration', timing: 'Declaration of intent now; model agreement H2 2026' },
    { id: 'FA2', pillar: 'P1', name: 'EU rating scheme for data centres + launch of minimum energy-performance standards', timing: 'Rating scheme 2026; first labels 2027; MEPS needs-assessment by 2027' },
    { id: 'FA3', pillar: 'P2', name: 'EU KPIs for smart grids + accelerate smart-meter rollout', timing: 'Indicator catalogue mid-2026; smart-meter law 2026' },
    { id: 'FA4', pillar: 'P2', name: 'AI models across the energy value chain', timing: 'Horizon calls 2026–27; first operational models end-2027' },
    { id: 'FA5', pillar: 'P3', name: 'EU framework for simplified cross-border energy-data exchange', timing: 'Assessment 2026; development from 2027' },
    { id: 'FA6', pillar: 'X', name: 'Strengthen AI safety + cybersecurity of critical devices', timing: 'Solar-risk assessment 2026; supply-security review 2026' },
    { id: 'FA7', pillar: 'X', name: 'Track digitalisation progress + improve energy-data availability', timing: 'Annual Forum from 2026; Better Energy Data initiative Q4 2026' },
  ],
} as const;

export type GoalKind = 'emissions' | 'energy-demand' | 'principle' | 'consistency';

export interface EuClimateGoal {
  id: string;
  short: string;
  label: string;
  detail: string;
  instrument: string;
  kind: GoalKind;
}

/** The binding EU climate / energy goals the Roadmap must stay consistent with. */
export const EU_CLIMATE_GOALS: EuClimateGoal[] = [
  {
    id: 'g-2030',
    short: '−55% by 2030',
    label: 'Net GHG −55% by 2030 vs 1990',
    detail:
      'The headline 2030 milestone of the European Climate Law. The EU-wide ' +
      'assessment of the final NECPs (May 2025) still projected only ~−54%, i.e. ' +
      'the EU is already short of this target before new electricity demand is added.',
    instrument: 'European Climate Law, Reg (EU) 2021/1119',
    kind: 'emissions',
  },
  {
    id: 'g-2040',
    short: '−90% by 2040',
    label: 'Net GHG −90% by 2040 vs 1990',
    detail:
      'Binding 2040 target (Reg (EU) 2026/667). Implies a near-complete ' +
      'decarbonisation of power and heat well before 2050; new firm electricity ' +
      'load must therefore be matched by clean supply, not fossil back-up.',
    instrument: 'European Climate Law amendment, Reg (EU) 2026/667',
    kind: 'emissions',
  },
  {
    id: 'g-neutrality',
    short: 'Neutrality 2050',
    label: 'Climate neutrality by 2050',
    detail: 'The legal end-point; every Union measure must be consistent with reaching it.',
    instrument: 'European Climate Law, Reg (EU) 2021/1119, Art 2',
    kind: 'emissions',
  },
  {
    id: 'g-eed',
    short: 'EED −11.7% final energy',
    label: 'Binding −11.7% EU final energy consumption by 2030',
    detail:
      'The recast Energy Efficiency Directive sets a binding EU target to cut ' +
      'final energy consumption to 763 Mtoe by 2030 (−11.7% vs the 2020 baseline ' +
      'projection). This is an ABSOLUTE reduction in energy demand — the metric a ' +
      'deliberate tripling of data-centre capacity works directly against.',
    instrument: 'Energy Efficiency Directive recast, Dir (EU) 2023/1791',
    kind: 'energy-demand',
  },
  {
    id: 'g-eef',
    short: 'Efficiency first',
    label: '"Energy efficiency first" principle',
    detail:
      'Energy-efficiency and demand-side resources are to be prioritised in ' +
      'planning and investment decisions before new supply or network capacity.',
    instrument: 'Energy Efficiency Directive recast, Dir (EU) 2023/1791, Art 3',
    kind: 'principle',
  },
  {
    id: 'g-art6',
    short: 'Art 6(4) consistency',
    label: 'Consistency of all Union measures with the climate objectives',
    detail:
      'The Climate Law requires the Commission to assess the consistency of Union ' +
      'measures with the climate-neutrality objective and the need to ensure ' +
      'adaptation. A roadmap that grows electricity demand should carry such a check.',
    instrument: 'European Climate Law, Reg (EU) 2021/1119, Art 6(4)',
    kind: 'consistency',
  },
];

export interface RoadmapMeasure {
  id: string;
  pillar: string;
  title: string;
  /** Near-verbatim quote(s) from the Roadmap. */
  quote: string;
  page: number;
}

/** The roadmap commitments / facts the findings below reason over. */
export const ROADMAP_MEASURES: RoadmapMeasure[] = [
  {
    id: 'r-triple',
    pillar: 'P1',
    title: 'Triple EU data-centre capacity in 5–7 years',
    quote:
      '"The EU aims to triple its data centre capacity within 5-7 years." Installed ' +
      'capacity is "expected to grow from approximately 12 GW in 2025 to around 28 GW ' +
      'by 2030"; data centres "currently account for around 2.5% of EU electricity ' +
      'consumption, and their demand is expected to raise substantially."',
    page: 2,
  },
  {
    id: 'r-demand-risk',
    pillar: 'P1',
    title: 'Acknowledged grid-congestion and price risk for other consumers',
    quote:
      'Unmanaged growth "could … undermine the security and sustainability of the ' +
      'energy supply, exacerbate grid congestion and drive-up electricity prices, … ' +
      'compete with other energy consumers for access to energy."',
    page: 2,
  },
  {
    id: 'r-tripartite',
    pillar: 'P1',
    title: 'Voluntary model tripartite agreement; legislation only "if necessary"',
    quote:
      'A "declaration of intent" and a "model tripartite agreement" between data-centre ' +
      'operators, energy parties and public authorities. "If necessary, the Commission ' +
      'will consider putting forward a legislative proposal to ensure the sustainable ' +
      'integration of data centres."',
    page: 5,
  },
  {
    id: 'r-rating-meps',
    pillar: 'P1',
    title: 'Rating scheme now; minimum performance standards deferred',
    quote:
      'A Delegated Act for an EU rating scheme plus "the launch of a public consultation ' +
      'for minimum performance standards." Timing: "minimum EU energy performance ' +
      'standards needs assessment by 2027."',
    page: 4,
  },
  {
    id: 'r-cogen-ppa',
    pillar: 'P1',
    title: 'Clean co-located generation, PPAs, waste-heat reuse, flexibility',
    quote:
      '"clean co-located generation in proximity to data centres", "improved use of ' +
      'PPAs and delivering additional generation of clean energy", waste-heat recovery, ' +
      'and "data centre flexibility (through market-based instruments)".',
    page: 5,
  },
  {
    id: 'r-complementary-supply',
    pillar: 'P1',
    title: 'Regions may need "complementary approaches to energy supply"',
    quote:
      '"In certain regions, the scale and pace of projected demand growth may also ' +
      'require complementary approaches to energy supply and system integration, ' +
      'alongside timely grid reinforcement."',
    page: 2,
  },
  {
    id: 'r-water',
    pillar: 'P1',
    title: 'Water–energy nexus pressure',
    quote:
      '"This goes along with an increasing pressure on water resources as recognised ' +
      'in the EU Water Resilience Strategy." Water issues handled "in line with the ' +
      'development of the EU rating scheme for data centres."',
    page: 1,
  },
  {
    id: 'r-smartgrid',
    pillar: 'P2',
    title: 'Smart grids, smart meters, grid-enhancing technologies',
    quote:
      'Smart grids "increase the uptake of renewables", reduce curtailment and unlock ' +
      'flexibility; grid-enhancing technologies "can expand network capacity by up to ' +
      '40% and reduce conventional grid expansion costs by as much as 35%." A ' +
      'legislative proposal to accelerate the smart-meter rollout.',
    page: 6,
  },
  {
    id: 'r-flexibility',
    pillar: 'P3',
    title: '≈230 GW of flexibility from better energy-data exchange',
    quote:
      'Better data exchange can activate flexibility "from electric vehicles, heat ' +
      'pumps, batteries and controllable demand, with digital-enabled solutions ' +
      'potentially unlocking around 230 GW of flexibility by 2030 and reducing system ' +
      'costs for consumers."',
    page: 9,
  },
  {
    id: 'r-ai-grids',
    pillar: 'P2',
    title: 'AI foundation models for grid forecasting, congestion, curtailment',
    quote:
      'AI models "could significantly improve grid functions such as forecasting, ' +
      'congestion management, fault detection and investment planning" and "reduce ' +
      'curtailment", supporting renewable integration.',
    page: 7,
  },
  {
    id: 'r-cyber',
    pillar: 'X',
    title: 'AI safety + cybersecurity of critical energy devices',
    quote:
      'A European AI-energy safety transformation group; risk assessment of solar/wind ' +
      'installations; power to "ban the use of inverters from high-risk suppliers."',
    page: 10,
  },
  {
    id: 'r-governance',
    pillar: 'X',
    title: 'Soft delivery: annual Forum, "indicative targets"',
    quote:
      'Delivery via an annual "Energy Digitalisation Forum" and "concrete objectives ' +
      'and indicative targets" developed with Member States; objectives "should be ' +
      'based on existing monitoring frameworks."',
    page: 11,
  },
  {
    id: 'r-data',
    pillar: 'X',
    title: 'Better Energy Data initiative + improved statistics',
    quote:
      'A "Better Energy Data initiative … mapping and addressing gaps in energy data ' +
      'availability", strengthening "the monitoring of EU energy policy targets."',
    page: 12,
  },
];

export type FindingKind = 'contradiction' | 'tension' | 'ambition-gap' | 'alignment';
export type FindingSeverity = 'high' | 'medium' | 'low';

export const FINDING_KIND_META: Record<
  FindingKind,
  { name: string; color: string; definition: string }
> = {
  contradiction: {
    name: 'Contradiction',
    color: '#EF4444',
    definition:
      'The Roadmap pushes in the opposite direction to an explicit ESABCC ' +
      'recommendation or a binding EU goal — most sharply, growing energy demand ' +
      'where the advice calls for demand reduction.',
  },
  tension: {
    name: 'Tension',
    color: '#F59E0B',
    definition:
      'The Roadmap is not flatly contradictory, but creates a material risk to a ' +
      'climate objective that it does not bindingly safeguard (e.g. additionality, ' +
      'fossil back-up, distributional impact).',
  },
  'ambition-gap': {
    name: 'Ambition gap',
    color: '#38BDF8',
    definition:
      'The Roadmap names the right objective but relies on soft, voluntary or ' +
      'deferred instruments where the advice calls for binding measures.',
  },
  alignment: {
    name: 'Alignment',
    color: '#34D399',
    definition:
      'The Roadmap actively supports an ESABCC recommendation or EU goal — recorded ' +
      'for balance so the assessment is not one-sided.',
  },
};

export interface CoherenceFinding {
  id: string;
  kind: FindingKind;
  severity: FindingSeverity;
  title: string;
  /** Roadmap measures cited. */
  measureIds: string[];
  /** ESABCC recommendation ids (match esabcc-recommendations.ts). */
  esabccRecIds: string[];
  /** EU goal ids (match EU_CLIMATE_GOALS). */
  euGoalIds: string[];
  /** One-line statement of what the ESABCC asks for, in this area. */
  esabccAsk: string;
  /** Numbered reasoning chain, required change → roadmap evidence → conclusion. */
  reasoning: string[];
}

export const COHERENCE_FINDINGS: CoherenceFinding[] = [
  {
    id: 'f-demand-growth',
    kind: 'contradiction',
    severity: 'high',
    title:
      'A plan to grow electricity demand, against the Board\'s call for energy- and ' +
      'material-demand reduction',
    measureIds: ['r-triple'],
    esabccRecIds: [
      'kr12-energy-material-demand-reduction',
      'e2-efficiency-targets-awareness',
      'b4-buildings-demand-sufficiency',
    ],
    euGoalIds: ['g-eed'],
    esabccAsk:
      'KR12: "Pursue more ambitious energy- and material-demand reduction" — ' +
      'sufficiency is named as the weakest area of EU climate policy.',
    reasoning: [
      'The ESABCC\'s 2024 report makes demand reduction and sufficiency a headline ask (KR12), and flags it as the policy area where the EU is doing least.',
      'The binding Energy Efficiency Directive requires an ABSOLUTE cut in EU final energy consumption to 763 Mtoe by 2030 (−11.7% vs the 2020 projection).',
      'The Roadmap\'s anchor objective is the opposite vector: "triple … data centre capacity within 5-7 years", with installed capacity rising 12 GW → 28 GW by 2030 and electricity demand expected to "raise substantially".',
      'No absolute envelope, cap or demand-reduction obligation is placed on the new load; growth is to be "managed", not limited.',
      'Conclusion: the Roadmap is directionally opposed to KR12 and adds to, rather than reduces, the absolute energy demand the EED is trying to bring down.',
    ],
  },
  {
    id: 'f-meps-deferred',
    kind: 'ambition-gap',
    severity: 'high',
    title: 'The one binding efficiency lever — minimum performance standards — is deferred and conditional',
    measureIds: ['r-rating-meps', 'r-tripartite'],
    esabccRecIds: ['e3-efficiency-first-mandatory', 'kr12-energy-material-demand-reduction'],
    euGoalIds: ['g-eef', 'g-eed'],
    esabccAsk:
      'E3: make "energy efficiency first" mandatory for infrastructure projects, with thresholds that bite.',
    reasoning: [
      'ESABCC E3 asks for the "energy efficiency first" principle to be made mandatory for infrastructure, not aspirational.',
      'The Roadmap\'s binding instrument set is thin: a voluntary "declaration of intent", a "model tripartite agreement", and an EU rating scheme that produces labels, not obligations.',
      'Minimum energy-performance standards — the only measure that would force an absolute efficiency floor — are reduced to "the launch of a public consultation" and a "needs assessment by 2027"; even the integration law is only "if necessary".',
      'Conclusion: the Roadmap names efficiency but defers the one lever that would make it binding, an ambition gap against E3 and the efficiency-first principle.',
    ],
  },
  {
    id: 'f-consistency-price',
    kind: 'tension',
    severity: 'high',
    title:
      'Acknowledged price / crowding-out risk for other consumers, with no consistency check or impact assessment',
    measureIds: ['r-demand-risk', 'r-triple'],
    esabccRecIds: [
      'kr5-policy-consistency-climate-neutrality',
      'kr8-impact-assessment-just-transition',
      'w1-systematic-impact-assessment',
    ],
    euGoalIds: ['g-art6'],
    esabccAsk:
      'KR5 + KR8: make EU policies fully consistent with climate-neutrality and base them on systematic, distributional impact assessment.',
    reasoning: [
      'ESABCC KR5 calls for full consistency of EU policies with climate-neutrality, and KR8/W1 for systematic, distributional impact assessment of climate-relevant measures.',
      'The Roadmap itself concedes the risk: unmanaged data-centre growth could "exacerbate grid congestion and drive-up electricity prices" and "compete with other energy consumers for access to energy".',
      'Yet it carries no Article 6(4) consistency assessment against the climate objectives, and no distributional impact assessment of who bears the higher prices (households, industry, energy-poor consumers).',
      'Conclusion: the Roadmap recognises the very harm KR5/KR8 are meant to prevent but does not bind itself to the consistency check or the impact assessment the advice requires.',
    ],
  },
  {
    id: 'f-additionality',
    kind: 'tension',
    severity: 'medium',
    title: 'Clean co-located generation and PPAs without a binding additionality / temporal-matching guarantee',
    measureIds: ['r-cogen-ppa'],
    esabccRecIds: ['kr3-renewables-investment-outlook', 'e4-renewables-growth-support'],
    euGoalIds: ['g-2030', 'g-2040'],
    esabccAsk:
      'KR3 / E4: deliver a stable, real expansion of renewables that decarbonises the system as a whole.',
    reasoning: [
      'ESABCC KR3/E4 want renewables growth that decarbonises the whole system, not capacity reshuffled between users.',
      'The Roadmap promotes "clean co-located generation", "improved use of PPAs" and "additional generation of clean energy" — the right vocabulary.',
      'But it sets no binding additionality or hourly temporal-matching requirement: if data centres contract existing or near-term renewables via PPAs, they can crowd those volumes out of decarbonising the rest of the grid, leaving more residual fossil generation elsewhere.',
      'Conclusion: without a binding additionality rule, the measure risks moving clean electrons rather than adding them — a tension with the net-system decarbonisation KR3/E4 intend.',
    ],
  },
  {
    id: 'f-fossil-backup',
    kind: 'tension',
    severity: 'medium',
    title: 'Large always-on load risks justifying new firm / fossil back-up capacity',
    measureIds: ['r-complementary-supply', 'r-triple'],
    esabccRecIds: ['e1-net-zero-policy-alignment', 'kr4-phase-out-ff-subsidies'],
    euGoalIds: ['g-2040', 'g-neutrality'],
    esabccAsk:
      'E1: align policy with a near-complete fossil-fuel phase-out from power and heat by 2040.',
    reasoning: [
      'ESABCC E1 targets a near-complete fossil-fuel phase-out from power and heat by 2040.',
      'A tripling of always-on data-centre load creates new firm 24/7 demand; the Roadmap concedes some regions "may also require complementary approaches to energy supply".',
      'Although digitalisation can "limit the need for expensive fossil-fired generation", new baseload demand can equally be used to justify gas back-up or delay coal/gas retirement where clean firm supply is not ready.',
      'Conclusion: absent a clean-firm-supply condition on new data-centre load, the demand growth is in tension with the 2040 power-sector phase-out (E1) and risks sustaining fossil assets/subsidies (KR4).',
    ],
  },
  {
    id: 'f-governance',
    kind: 'ambition-gap',
    severity: 'medium',
    title: 'Soft delivery and "indicative targets" where stronger governance is advised',
    measureIds: ['r-governance'],
    esabccRecIds: ['kr6-strengthen-governance'],
    euGoalIds: ['g-art6'],
    esabccAsk:
      'KR6: strengthen climate governance and compliance frameworks.',
    reasoning: [
      'ESABCC KR6 calls for stronger climate governance and compliance, not voluntary review.',
      'The Roadmap delivers through an annual "Energy Digitalisation Forum" and "indicative targets" developed with Member States, based on "existing monitoring frameworks".',
      'There is no binding objective for data-centre energy use, no absolute sectoral ceiling and no compliance mechanism if monitoring shows the growth eroding climate-neutrality consistency.',
      'Conclusion: the governance design is softer than KR6 envisages for a measure of this system-level significance.',
    ],
  },
  {
    id: 'f-water',
    kind: 'tension',
    severity: 'low',
    title: 'Water–energy nexus acknowledged but handled only via a labelling scheme',
    measureIds: ['r-water'],
    esabccRecIds: ['l5-increase-adaptation'],
    euGoalIds: ['g-art6'],
    esabccAsk:
      'L5: increase adaptation efforts at EU and Member State level (water stress / resilience).',
    reasoning: [
      'ESABCC L5 flags adaptation — including water-resource resilience — as insufficiently resourced.',
      'The Roadmap acknowledges "increasing pressure on water resources" from data centres but addresses it only "in line with the development of the EU rating scheme", i.e. through a voluntary label.',
      'Conclusion: the water-stress dimension of new data-centre load is recognised but not bindingly managed, a low-severity tension with the adaptation ask.',
    ],
  },

  // ── Alignments (what the Roadmap gets right) ───────────────────────────────
  {
    id: 'f-a-smartgrid',
    kind: 'alignment',
    severity: 'medium',
    title: 'Smart grids, smart meters and grid-enhancing technologies support system integration',
    measureIds: ['r-smartgrid'],
    esabccRecIds: ['e5-system-integration-flexibility', 'kr3-renewables-investment-outlook'],
    euGoalIds: ['g-2030', 'g-2040'],
    esabccAsk:
      'E5: improve energy-system integration and deliver non-fossil flexibility.',
    reasoning: [
      'ESABCC E5 wants better system integration and non-fossil flexibility; KR3 wants real renewables delivery.',
      'The Roadmap accelerates smart meters, builds EU smart-grid KPIs, and backs grid-enhancing technologies that "expand network capacity by up to 40%" — squeezing more renewables through existing wires.',
      'Conclusion: directly supportive of E5 and the grid build-out KR3 depends on.',
    ],
  },
  {
    id: 'f-a-flexibility',
    kind: 'alignment',
    severity: 'medium',
    title: 'Unlocking ≈230 GW of demand-side flexibility helps integrate renewables',
    measureIds: ['r-flexibility', 'r-ai-grids'],
    esabccRecIds: ['e5-system-integration-flexibility', 'e4-renewables-growth-support'],
    euGoalIds: ['g-2030'],
    esabccAsk:
      'E4 / E5: deliver flexibility and reduce renewable curtailment.',
    reasoning: [
      'ESABCC E4/E5 prioritise flexibility and curtailment reduction as enablers of high renewable shares.',
      'Better data exchange and AI grid models are projected to unlock ~230 GW of flexibility by 2030 and to "reduce curtailment" through better forecasting and congestion management.',
      'Conclusion: a genuine, climate-positive contribution — the same digitalisation that drives the demand problem also supplies part of the flexibility solution.',
    ],
  },
  {
    id: 'f-a-data',
    kind: 'alignment',
    severity: 'low',
    title: 'Better energy data strengthens monitoring of EU climate-policy targets',
    measureIds: ['r-data', 'r-cyber'],
    esabccRecIds: ['kr6-strengthen-governance'],
    euGoalIds: ['g-art6'],
    esabccAsk:
      'KR6: strengthen the evidence base and compliance behind climate governance.',
    reasoning: [
      'ESABCC KR6 and its monitoring logic depend on high-quality, timely energy data.',
      'The "Better Energy Data initiative" and improved statistics explicitly aim to strengthen "the monitoring of EU energy policy targets"; the cybersecurity workstream hardens critical energy infrastructure.',
      'Conclusion: supportive of the evidence and resilience foundations KR6 relies on — though it does not, by itself, supply the binding compliance KR6 also asks for.',
    ],
  },
];

// ── Pre-computed roll-ups (deterministic) ─────────────────────────────────────

export const FINDING_KINDS: FindingKind[] = ['contradiction', 'tension', 'ambition-gap', 'alignment'];

export function countByKind(): Record<FindingKind, number> {
  const out = { contradiction: 0, tension: 0, 'ambition-gap': 0, alignment: 0 } as Record<FindingKind, number>;
  for (const f of COHERENCE_FINDINGS) out[f.kind] += 1;
  return out;
}

export const ROADMAP_HEADLINE_STATS = {
  capacityNowGw: 12,
  capacity2030Gw: 28,
  tripleYears: '5–7',
  shareOfElectricityPct: 2.5,
  flagshipCount: ROADMAP_META.flagships.length,
  pillarCount: 3,
  findingCount: COHERENCE_FINDINGS.length,
  contradictionCount: COHERENCE_FINDINGS.filter(f => f.kind === 'contradiction').length,
  flexibilityGw2030: 230,
} as const;
