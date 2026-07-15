/**
 * Overview Industry — Industry report: objectives & evidence base.
 * ---------------------------------------------------------------------------
 * Data behind `beta/modules/overview-industry/report-objectives/page.tsx`:
 *
 *   • OBJECTIVES   — what the next report's industry work sets out to do.
 *   • SOURCES      — the source register (peer-reviewed papers, scenario
 *                    databases, agency/industry roadmaps, EU policy docs),
 *                    each with a stable id and an exact link (DOI preferred).
 *   • ROADMAPS     — the synthesis layer: one entry per roadmap/study with
 *                    its core finding, levers, investment timeline, milestones.
 *   • DATA_POINTS  — every extracted number, each keyed to a source id so the
 *                    UI and the Excel export can attach the exact source link.
 *   • TRAJECTORIES / ELECTRIFICATION_BENCHMARKS / INVESTMENT_ESTIMATES —
 *                    the series behind the three overview figures.
 *
 * PROVENANCE: every value was extracted from the cited source and each source
 * URL was checked when this file was compiled (see IR_META.compiledOn). The
 * selection of sources and the synthesis wording are AI-compiled working
 * judgements pending sector-lead sign-off. Nothing here is a Board position.
 */

export type IrSourceType =
  | 'peer-reviewed'
  | 'scenario database'
  | 'IPCC assessment'
  | 'agency roadmap'
  | 'industry roadmap'
  | 'think-tank study'
  | 'EU policy / advice';

export interface IrSource {
  id: string;
  type: IrSourceType;
  /** Short label used for inline links ("Rissman et al. 2020"). */
  short: string;
  /** Full human-readable citation. */
  cite: string;
  /** Exact link — DOI link where one exists. */
  url: string;
  doi?: string;
}

export interface IrObjective {
  id: string;
  title: string;
  description: string;
  deliverables: string[];
}

export type IrTheme = 'pathways' | 'cleantech';

export interface IrRoadmap {
  id: string;
  theme: IrTheme;
  name: string;
  publisher: string;
  year: number;
  region: string;
  sourceId: string;
  /** 2–4 sentence synthesis of what the roadmap/study finds. */
  summary: string;
  levers: string[];
  /** The roadmap's investment-timeline logic, with numbers where it has them. */
  investmentTimeline: string;
  milestones: { period: string; milestone: string }[];
}

export type IrTopic = 'pathways' | 'cleantech' | 'scenarios' | 'investment';

export interface IrDataPoint {
  id: string;
  topic: IrTopic;
  variable: string;
  /** Kept as string so ranges ("70–91") and medians survive verbatim. */
  value: string;
  unit: string;
  region: string;
  scenario: string;
  year: string;
  note?: string;
  sourceId: string;
}

export interface IrTrajectory {
  label: string;
  scenario: string;
  scope: string;
  unit: string;
  sourceId: string;
  series: { year: number; value: number }[];
}

export interface IrFigureBar {
  label: string;
  /** A single value, or a [low, high] range drawn as a floating bar. */
  value: number | [number, number];
  unit: string;
  note?: string;
  sourceId: string;
}

export const IR_META = {
  title: 'Industry report — objectives & evidence base',
  compiledOn: 'July 2026',
};

export const TOPIC_META: Record<IrTopic, { label: string; color: string }> = {
  pathways: { label: 'Pathways & roadmaps', color: '#2E5FCC' },
  scenarios: { label: 'Scenario ensembles', color: '#7367C9' },
  cleantech: { label: 'Clean-tech role', color: '#00976B' },
  investment: { label: 'Investment', color: '#E08020' },
};

/* ── 1 · Objectives ─────────────────────────────────────────────────── */

export const OBJECTIVES: IrObjective[] = [
  {
    id: 'obj-pathways',
    title: 'Synthesise industrial decarbonisation pathways & roadmaps — including their investment timelines',
    description:
      'Bring the high-quality pathway literature and the sectoral roadmaps (steel, cement, chemicals, cross-cutting) onto one comparable surface: what each pathway relies on, how fast it moves, and when the investment decisions fall — in particular the ~2020s reinvestment window in which most EU primary-materials capacity comes up for renewal.',
    deliverables: [
      'Roadmap synthesis cards with levers, milestones and the investment-timeline logic of each source',
      'Figure 1 — pathway emission trajectories on a common index',
      'Figure 3 — annualised investment estimates across roadmaps',
    ],
  },
  {
    id: 'obj-cleantech',
    title: 'Synthesise the role of the clean-tech industry in economy-wide decarbonisation',
    description:
      'Assess what the evidence says about clean-tech manufacturing as a driver of decarbonisation beyond industry itself — learning-curve cost declines, the scale of the global clean-tech market, EU manufacturing-capacity targets and supply-chain concentration — and what that implies for the EU industrial strategy the report will assess.',
    deliverables: [
      'Clean-tech synthesis cards (learning curves, market scale, EU capacity benchmarks)',
      'Figure 2 — how far industry electrifies across scenario ensembles and technical potentials',
      'Data points on cost declines, market size and manufacturing concentration',
    ],
  },
  {
    id: 'obj-data',
    title: 'Aggregate the data — scenario ensembles included — and make it fully traceable',
    description:
      'Extract the underlying numbers from the papers, the roadmaps and the AR6 scenario ensemble hosted by IIASA (industry-sector variables from 1.5 °C-consistent pathways), aggregate them into key overview figures, and publish the whole extraction as an Excel workbook in which every data point carries the exact link to the scientific paper or database behind it.',
    deliverables: [
      'The full data-point table (section 4), filterable by topic',
      'Excel workbook: objectives · roadmap synthesis · data points · scenario series · source register',
      'A clickable source link (DOI where available) on every data row',
    ],
  },
];

/* ── 2 · Source register ────────────────────────────────────────────── */

export const SOURCES: IrSource[] = [
  {
    id: 'material-economics-2019',
    type: 'think-tank study',
    short: 'Material Economics 2019',
    cite: 'Material Economics (2019). Industrial Transformation 2050 — Pathways to Net-Zero Emissions from EU Heavy Industry. Material Economics / University of Cambridge Institute for Sustainability Leadership (CISL).',
    url: 'https://materialeconomics.com/node/13',
  },
  {
    id: 'rissman-2020',
    type: 'peer-reviewed',
    short: 'Rissman et al. 2020',
    cite: 'Rissman, J., Bataille, C., Masanet, E., et al. (2020). Technologies and policies to decarbonize global industry: Review and assessment of mitigation drivers through 2070. Applied Energy 266: 114848.',
    url: 'https://doi.org/10.1016/j.apenergy.2020.114848',
    doi: '10.1016/j.apenergy.2020.114848',
  },
  {
    id: 'madeddu-2020',
    type: 'peer-reviewed',
    short: 'Madeddu et al. 2020',
    cite: 'Madeddu, S., Ueckerdt, F., Pehl, M., et al. (2020). The CO2 reduction potential for the European industry via direct electrification of heat supply (power-to-heat). Environmental Research Letters 15(12): 124004.',
    url: 'https://doi.org/10.1088/1748-9326/abbd02',
    doi: '10.1088/1748-9326/abbd02',
  },
  {
    id: 'bataille-2018',
    type: 'peer-reviewed',
    short: 'Bataille et al. 2018',
    cite: 'Bataille, C., Åhman, M., Neuhoff, K., et al. (2018). A review of technology and policy deep decarbonization pathway options for making energy-intensive industry production consistent with the Paris Agreement. Journal of Cleaner Production 187: 960–973.',
    url: 'https://doi.org/10.1016/j.jclepro.2018.03.107',
    doi: '10.1016/j.jclepro.2018.03.107',
  },
  {
    id: 'gerres-2019',
    type: 'peer-reviewed',
    short: 'Gerres et al. 2019',
    cite: 'Gerres, T., Chaves Ávila, J.P., Llamas, P.L., Gómez San Román, T. (2019). A review of cross-sector decarbonisation potentials in the European energy intensive industry. Journal of Cleaner Production 210: 585–601.',
    url: 'https://doi.org/10.1016/j.jclepro.2018.11.036',
    doi: '10.1016/j.jclepro.2018.11.036',
  },
];

/* ── 3 · Roadmap synthesis ──────────────────────────────────────────── */

export const ROADMAPS: IrRoadmap[] = [
  {
    id: 'rm-material-economics',
    theme: 'pathways',
    name: 'Industrial Transformation 2050',
    publisher: 'Material Economics / CISL',
    year: 2019,
    region: 'EU',
    sourceId: 'material-economics-2019',
    summary:
      'Quantifies three pathways to net-zero EU steel, plastics/chemicals, ammonia and cement by 2050 (536 Mt CO2 in 2015, ~14% of EU emissions) while keeping production in Europe: New Processes, Circular Economy and Carbon Capture. All three reach net zero; the cost to consumers stays below 1%, but company-level production costs rise 20–115% and industrial investment must rise 25–60% — so a dedicated net-zero industrial policy agenda is required.',
    levers: [
      'Materials efficiency (58–171 Mt/yr)',
      'Circularity & recirculation (82–183 Mt/yr)',
      'New processes: H2-DRI, electrification, new feedstocks (143–241 Mt/yr)',
      'CCS / CCU (45–235 Mt/yr)',
    ],
    investmentTimeline:
      '"2050 is only one investment cycle away": blast furnaces reinvest on 15–20-year cycles and most EU coke plants, furnaces and steam crackers need major reinvestment within ~15 years — each a lock-in fork. Core-process investment rises from a 4.8–5.4 bn EUR/yr baseline by up to +5.5 bn EUR/yr on average, peaking at 12–14 bn EUR/yr in the 2030s, plus 5–8 bn EUR/yr for industrial power supply.',
    milestones: [
      { period: '2020s', milestone: 'Low-CO2 options must be viable at the reinvestment forks (blast furnaces, coke plants, steam crackers) to avoid 20–50-year lock-in.' },
      { period: '2030s', milestone: 'Investment peak: 12–14 bn EUR/yr in core industrial processes; first H2-DRI and new-cement plants at scale.' },
      { period: '2050', milestone: 'Net zero across the four materials; total additional cost 40–50 bn EUR/yr (~0.2% of projected EU GDP); up to +710 TWh/yr electricity demand.' },
    ],
  },
  {
    id: 'rm-rissman',
    theme: 'pathways',
    name: 'Technologies & policies to decarbonize global industry (through 2070)',
    publisher: 'Applied Energy',
    year: 2020,
    region: 'Global',
    sourceId: 'rissman-2020',
    summary:
      'A c. two-dozen-author expert review assembling the supply-side (efficiency, electrification, hydrogen, CCS, new cement chemistries) and demand-side (material efficiency, substitution, circularity) measures that together can bring global industry — 33% of anthropogenic GHG including indirect emissions — to net zero by 2050–2070, deployed in three technology waves.',
    levers: [
      'Energy & system-level efficiency',
      'Electrification',
      'Zero-carbon hydrogen (heat + feedstock)',
      'Carbon capture',
      'New cement chemistries',
      'Material efficiency & circularity',
      'Carbon pricing + border adjustment, standards, procurement',
    ],
    investmentTimeline:
      'Three deployment waves pace the capital cycle: commercialised efficiency/electrification measures carry the 2020–2035 phase (−20% vs today), structural shifts (CCS, new cement chemistries, alternative materials) carry 2035–2050 (−50%), and nascent technologies — zero-carbon hydrogen at scale — close the gap to net zero over 2050–2070.',
    milestones: [
      { period: '2020–2035', milestone: '−20% vs present: electrification, material efficiency, energy efficiency and re-use/recycling reach materiality.' },
      { period: '2035–2050', milestone: '−50% vs present: CCS deploys rapidly; new cement chemistries and alternative materials scale.' },
      { period: '2050–2070', milestone: '−80–100%: zero-carbon hydrogen scales across heavy industry; industry can reach net zero.' },
    ],
  },
  {
    id: 'rm-bataille',
    theme: 'pathways',
    name: 'Deep decarbonization pathway options for energy-intensive industry',
    publisher: 'Journal of Cleaner Production',
    year: 2018,
    region: 'Global',
    sourceId: 'bataille-2018',
    summary:
      'Review showing Paris-compatible decarbonisation of energy-intensive industry is technically possible with a portfolio of zero-carbon electricity and heat, biomass and CCS — but only with a managed-transition policy strategy (pathway processes, GHG pricing or tradable performance standards with leakage protection, deployment support, procurement) that minimises stranded assets.',
    levers: [
      'Zero-carbon electricity & heat',
      'Biomass',
      'Carbon capture',
      'Tradable performance standards',
      'Guaranteed prices for pilot-plant output',
      'Low-carbon procurement',
    ],
    investmentTimeline:
      'The stock-turnover argument, stated directly: "Given the average economic lifetime of industrial facilities is 20 years or more … all new investment must be net-zero emitting by 2035–2060 or be compensated by negative emissions to guarantee GHG-neutrality."',
    milestones: [
      { period: '2035–2060', milestone: 'Every new industrial investment must be net-zero emitting (or offset by negative emissions), given ≥20-year facility lifetimes.' },
      { period: '2055–2080', milestone: 'Global net-zero — probably net-negative — emissions required for the Paris goals.' },
    ],
  },
  {
    id: 'rm-madeddu',
    theme: 'pathways',
    name: 'Direct electrification of European industrial heat (power-to-heat)',
    publisher: 'Environmental Research Letters',
    year: 2020,
    region: 'Europe',
    sourceId: 'madeddu-2020',
    summary:
      'Bottom-up assessment across 11 industrial sectors covering 92% of Europe’s industrial CO2: 78% of industrial energy demand is electrifiable with already-established technologies and 99% including technologies under development. Combined with decarbonised power (~12 gCO2/kWh), deep electrification cuts the scoped industrial CO2 by ~78%, leaving mainly process emissions.',
    levers: [
      'Electric boilers & industrial heat pumps',
      'Electric furnaces & kilns',
      'Emerging high-temperature electrothermal processes',
      'Power-sector decarbonisation as precondition',
    ],
    investmentTimeline:
      'No explicit capex path; the sequencing implication is that electrification can start now with established technology for most heat demand, while the last ~21 percentage points wait on technologies still under development — and the CO2 benefit scales with grid decarbonisation through 2050.',
    milestones: [
      { period: 'Today', milestone: '78% of industrial energy demand technically electrifiable with established technologies.' },
      { period: '2050', milestone: '99% electrifiable incl. technologies under development; −78% scoped industrial CO2 with ~12 gCO2/kWh power.' },
    ],
  },
  {
    id: 'rm-gerres',
    theme: 'pathways',
    name: 'Cross-sector decarbonisation potentials in EU energy-intensive industry',
    publisher: 'Journal of Cleaner Production',
    year: 2019,
    region: 'EU',
    sourceId: 'gerres-2019',
    summary:
      'Systematic review of the sectoral roadmaps and scientific literature for EU energy-intensive industry (two-thirds of EU industrial CO2), finding limited consensus on deep-decarbonisation options and significant discrepancies between roadmaps’ estimated achievable reductions — a caution for any synthesis that averages across them.',
    levers: [
      'Cross-sector low-temperature heat decarbonisation',
      'Membranes in (petro-)chemicals',
      'Carbon-neutral steelmaking',
      'Alternative cement feedstocks',
      'CCS',
    ],
    investmentTimeline:
      'No single timeline — the review’s finding is precisely that published roadmaps disagree on pace and achievable depth, which is why this synthesis reports each roadmap’s numbers separately rather than a merged trajectory.',
    milestones: [],
  },
];

/* ── 4 · Data points ────────────────────────────────────────────────── */

export const DATA_POINTS: IrDataPoint[] = [
  // ── Pathways & roadmaps ──
  {
    id: 'dp-me-baseline',
    topic: 'pathways',
    variable: 'EU heavy-industry emissions (steel, plastics/chemicals, ammonia, cement)',
    value: '536',
    unit: 'Mt CO2/yr',
    region: 'EU',
    scenario: 'Historical baseline',
    year: '2015',
    note: '≈14% of total EU emissions; 84% classed hard-to-abate (process emissions, high-temperature heat, end-of-life plastics)',
    sourceId: 'material-economics-2019',
  },
  {
    id: 'dp-me-levers',
    topic: 'pathways',
    variable: 'Abatement potential by strategy in 2050 (materials efficiency / circularity / new processes / CCS-CCU)',
    value: '58–171 / 82–183 / 143–241 / 45–235',
    unit: 'Mt CO2/yr each',
    region: 'EU',
    scenario: 'New Processes · Circular Economy · Carbon Capture pathways',
    year: '2050',
    sourceId: 'material-economics-2019',
  },
  {
    id: 'dp-me-electricity',
    topic: 'pathways',
    variable: 'Additional industrial electricity demand at net zero',
    value: 'up to +710',
    unit: 'TWh/yr',
    region: 'EU',
    scenario: 'Net-zero pathways (highest: New Processes, 965 TWh total)',
    year: '2050',
    note: 'vs ~1,000 TWh EU industry today; circularity saves ~310 TWh, CCS ~275 TWh',
    sourceId: 'material-economics-2019',
  },
  {
    id: 'dp-me-hydrogen',
    topic: 'pathways',
    variable: 'Hydrogen demand of net-zero heavy industry',
    value: '6.8–13.0',
    unit: 'Mt H2/yr',
    region: 'EU',
    scenario: 'Carbon Capture (low) to New Processes (high) pathway',
    year: '2050',
    sourceId: 'material-economics-2019',
  },
  {
    id: 'dp-me-ccs',
    topic: 'pathways',
    variable: 'CO2 captured and stored at net zero',
    value: '45–235',
    unit: 'Mt CO2/yr',
    region: 'EU',
    scenario: 'New Processes (low) to Carbon Capture (high) pathway',
    year: '2050',
    note: 'High case needs ~3,200 Mt cumulative storage capacity',
    sourceId: 'material-economics-2019',
  },
  {
    id: 'dp-rissman-share',
    topic: 'pathways',
    variable: 'Industry share of global anthropogenic GHG emissions (incl. indirect from purchased electricity/heat)',
    value: '33',
    unit: '%',
    region: 'Global',
    scenario: 'Historical',
    year: '2014',
    note: '19% counting direct emissions only; direct industrial emissions grew 65% over 1990–2014',
    sourceId: 'rissman-2020',
  },
  {
    id: 'dp-rissman-waves',
    topic: 'pathways',
    variable: 'Achievable industry emission reductions by technology wave (vs present day)',
    value: '−20 by 2035 / −50 by 2050 / −80 to −100 by 2070',
    unit: '%',
    region: 'Global',
    scenario: 'Three-wave deployment (review synthesis)',
    year: '2035–2070',
    sourceId: 'rissman-2020',
  },
  {
    id: 'dp-madeddu-potential',
    topic: 'pathways',
    variable: 'Share of industrial energy demand technically electrifiable',
    value: '78 (established tech) / 99 (incl. tech under development)',
    unit: '%',
    region: 'Europe',
    scenario: 'Technical potential, 11 sectors = 92% of industrial CO2',
    year: '2020',
    sourceId: 'madeddu-2020',
  },
  {
    id: 'dp-madeddu-co2',
    topic: 'pathways',
    variable: 'Industrial CO2 reduction from deep electrification with decarbonised power (~12 gCO2/kWh)',
    value: '−78',
    unit: '%',
    region: 'Europe',
    scenario: 'Deep-electrification + IEA decarbonised-power scenario',
    year: '2050',
    note: 'Remainder is largely residual process emissions',
    sourceId: 'madeddu-2020',
  },
  {
    id: 'dp-gerres-share',
    topic: 'pathways',
    variable: 'Energy-intensive industry share of EU industrial CO2 emissions',
    value: '≈67 (two-thirds)',
    unit: '%',
    region: 'EU',
    scenario: 'Historical',
    year: '2019 (publication)',
    sourceId: 'gerres-2019',
  },

  // ── Investment ──
  {
    id: 'dp-me-invest-peak',
    topic: 'investment',
    variable: 'Core industrial-process investment at the transition peak',
    value: '12–14',
    unit: 'bn EUR/yr',
    region: 'EU',
    scenario: 'Net-zero pathways (peak, 2030s)',
    year: '2030s',
    note: 'Baseline 4.8–5.4 bn EUR/yr; average additional +3.9 to +5.5 bn EUR/yr; plus 5–8 bn EUR/yr power supply for industry',
    sourceId: 'material-economics-2019',
  },
  {
    id: 'dp-me-invest-uplift',
    topic: 'investment',
    variable: 'Required increase in heavy-industry investment rates',
    value: '+25 to +60',
    unit: '%',
    region: 'EU',
    scenario: 'All three net-zero pathways',
    year: '2020–2050',
    sourceId: 'material-economics-2019',
  },
  {
    id: 'dp-me-cost-2050',
    topic: 'investment',
    variable: 'Total additional cost of net-zero heavy industry',
    value: '40–50',
    unit: 'bn EUR/yr in 2050',
    region: 'EU',
    scenario: 'Net-zero pathways',
    year: '2050',
    note: '≈0.2% of projected EU GDP; consumer price impact <1%; company-level production costs +20–115%',
    sourceId: 'material-economics-2019',
  },
  {
    id: 'dp-bataille-lockin',
    topic: 'investment',
    variable: 'Deadline for all new industrial investment to be net-zero emitting',
    value: '2035–2060',
    unit: 'year range',
    region: 'Global',
    scenario: 'Paris-consistent stock turnover (facility lifetime ≥20 yr)',
    year: '—',
    sourceId: 'bataille-2018',
  },
];

/* ── 5 · Figure series ──────────────────────────────────────────────── */

export const TRAJECTORIES: IrTrajectory[] = [
  {
    label: 'Material Economics — EU heavy industry',
    scenario: 'Net-zero pathways (all three variants reach net zero)',
    scope: 'EU steel, plastics/chemicals, ammonia, cement',
    unit: 'Mt CO2/yr',
    sourceId: 'material-economics-2019',
    series: [
      { year: 2015, value: 536 },
      { year: 2050, value: 0 },
    ],
  },
  {
    label: 'Rissman et al. — global industry, three waves',
    scenario: 'Three-wave technology deployment (−20% by 2035, −50% by 2050, −80…−100% by 2070; midpoint plotted for 2070)',
    scope: 'Global industry (direct + indirect GHG)',
    unit: '% of present-day emissions',
    sourceId: 'rissman-2020',
    series: [
      { year: 2020, value: 100 },
      { year: 2035, value: 80 },
      { year: 2050, value: 50 },
      { year: 2070, value: 10 },
    ],
  },
];

export const ELECTRIFICATION_BENCHMARKS: IrFigureBar[] = [];

export const INVESTMENT_ESTIMATES: IrFigureBar[] = [];

const SOURCE_INDEX = new Map(SOURCES.map((s) => [s.id, s]));

export function sourceById(id: string): IrSource | undefined {
  return SOURCE_INDEX.get(id);
}
