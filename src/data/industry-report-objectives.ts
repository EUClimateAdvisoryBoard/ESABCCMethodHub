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
  {
    id: 'iea-etp-2023',
    type: 'agency roadmap',
    short: 'IEA ETP 2023',
    cite: 'IEA (2023). Energy Technology Perspectives 2023. International Energy Agency, Paris. Licence: CC BY 4.0.',
    url: 'https://www.iea.org/reports/energy-technology-perspectives-2023',
  },
  {
    id: 'way-2022',
    type: 'peer-reviewed',
    short: 'Way et al. 2022',
    cite: 'Way, R., Ives, M.C., Mealy, P., Farmer, J.D. (2022). Empirically grounded technology forecasts and the energy transition. Joule 6(9): 2057–2082.',
    url: 'https://doi.org/10.1016/j.joule.2022.08.009',
    doi: '10.1016/j.joule.2022.08.009',
  },
  {
    id: 'nzia-2024',
    type: 'EU policy / advice',
    short: 'Net-Zero Industry Act 2024',
    cite: 'Regulation (EU) 2024/1735 of 13 June 2024 establishing a framework of measures for strengthening Europe’s net-zero technology manufacturing ecosystem (Net-Zero Industry Act). OJ L, 2024/1735, 28.6.2024.',
    url: 'https://eur-lex.europa.eu/eli/reg/2024/1735/oj',
  },
  {
    id: 'cid-2025',
    type: 'EU policy / advice',
    short: 'Clean Industrial Deal 2025',
    cite: 'European Commission (2025). The Clean Industrial Deal: A joint roadmap for competitiveness and decarbonisation. COM(2025) 85 final, Brussels, 26.2.2025.',
    url: 'https://commission.europa.eu/topics/eu-competitiveness/clean-industrial-deal_en',
  },
  {
    id: 'draghi-2024',
    type: 'EU policy / advice',
    short: 'Draghi report 2024',
    cite: 'Draghi, M. (2024). The future of European competitiveness — Part A: A competitiveness strategy for Europe. European Commission, September 2024.',
    url: 'https://commission.europa.eu/topics/eu-competitiveness/draghi-report_en',
  },
  {
    id: 'irena-2024',
    type: 'agency roadmap',
    short: 'IRENA 2024',
    cite: 'IRENA (2024). Renewable Power Generation Costs in 2023. International Renewable Energy Agency, Abu Dhabi. ISBN 978-92-9260-621-3.',
    url: 'https://www.irena.org/Publications/2024/Sep/Renewable-Power-Generation-Costs-in-2023',
  },
  {
    id: 'ipcc-ar6-ch11',
    type: 'IPCC assessment',
    short: 'IPCC AR6 WGIII Ch. 11',
    cite: 'Bashmakov, I.A., Nilsson, L.J., Acquaye, A., et al. (2022). Industry. In: Climate Change 2022: Mitigation of Climate Change. AR6 WGIII, Ch. 11, pp. 1161–1243. Cambridge University Press.',
    url: 'https://doi.org/10.1017/9781009157926.013',
    doi: '10.1017/9781009157926.013',
  },
  {
    id: 'ipcc-ar6-ch3',
    type: 'IPCC assessment',
    short: 'IPCC AR6 WGIII Ch. 3',
    cite: 'Riahi, K., Schaeffer, R., et al. (2022). Mitigation Pathways Compatible with Long-term Goals. AR6 WGIII, Ch. 3, pp. 295–408. Cambridge University Press.',
    url: 'https://doi.org/10.1017/9781009157926.005',
    doi: '10.1017/9781009157926.005',
  },
  {
    id: 'ar6-db-iiasa',
    type: 'scenario database',
    short: 'AR6 Scenario DB (IIASA)',
    cite: 'Byers, E., Krey, V., Kriegler, E., Riahi, K., Schaeffer, R., et al. (2022). AR6 Scenarios Database hosted by IIASA (release 1.1, Nov 2022; 3,131 scenarios). International Institute for Applied Systems Analysis.',
    url: 'https://data.ece.iiasa.ac.at/ar6/',
    doi: '10.5281/zenodo.5886911',
  },
  {
    id: 'iea-nze-2023',
    type: 'agency roadmap',
    short: 'IEA NZE 2023',
    cite: 'IEA (2023). Net Zero Roadmap: A Global Pathway to Keep the 1.5 °C Goal in Reach — 2023 Update. International Energy Agency, Paris. Licence: CC BY 4.0.',
    url: 'https://www.iea.org/reports/net-zero-roadmap-a-global-pathway-to-keep-the-15-c-goal-in-reach',
  },
  {
    id: 'esabcc-2040-2023',
    type: 'EU policy / advice',
    short: 'ESABCC 2040 advice 2023',
    cite: 'European Scientific Advisory Board on Climate Change (2023). Scientific advice for the determination of an EU-wide 2040 climate target and a greenhouse gas budget for 2030–2050. Publications Office of the EU. doi: 10.2800/609405.',
    url: 'https://climate-advisory-board.europa.eu/reports-and-publications/scientific-advice-for-the-determination-of-an-eu-wide-2040',
    doi: '10.2800/609405',
  },
  {
    id: 'esabcc-progress-2024',
    type: 'EU policy / advice',
    short: 'ESABCC progress report 2024',
    cite: 'European Scientific Advisory Board on Climate Change (2024). Towards EU climate neutrality: Progress, policy gaps and opportunities. Assessment Report 2024, 18 January 2024. doi: 10.2800/216446.',
    url: 'https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities',
    doi: '10.2800/216446',
  },
  {
    id: 'com-2024-63',
    type: 'EU policy / advice',
    short: 'COM(2024) 63',
    cite: 'European Commission (2024). Securing our future — Europe’s 2040 climate target and path to climate neutrality by 2050. COM(2024) 63 final, Strasbourg, 6.2.2024.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52024DC0063',
  },
  {
    id: 'eurofer-2022',
    type: 'industry roadmap',
    short: 'EUROFER project map',
    cite: 'EUROFER (2022, updated). Map of key low-CO2 emissions projects in the EU steel industry. European Steel Association.',
    url: 'https://www.eurofer.eu/issues/climate-and-energy/maps-of-key-low-carbon-steel-projects',
  },
  {
    id: 'cembureau-2024',
    type: 'industry roadmap',
    short: 'Cement Europe roadmap 2024',
    cite: 'CEMBUREAU / Cement Europe (2024). From Ambition to Deployment — our 2050 Net Zero Roadmap (May 2024 update).',
    url: 'https://www.cementeurope.eu/about-us/our-net-zero-roadmap/',
  },
  {
    id: 'agora-2021',
    type: 'think-tank study',
    short: 'Agora Breakthrough Strategies',
    cite: 'Agora Energiewende & Wuppertal Institute (2020/2021). Breakthrough Strategies for Climate-Neutral Industry in Europe: Policy and technology pathways for raising EU climate ambition.',
    url: 'https://www.agora-industry.org/publications/breakthrough-strategies-for-climate-neutral-industry-in-europe-summary',
  },
  {
    id: 'innovation-fund',
    type: 'EU policy / advice',
    short: 'EU Innovation Fund',
    cite: 'European Commission, DG CLIMA. What is the Innovation Fund? (ETS-revenue-financed fund for first-of-a-kind clean-tech demonstration, 2020–2030).',
    url: 'https://climate.ec.europa.eu/eu-action/eu-funding-climate-action/innovation-fund/what-innovation-fund_en',
  },
  {
    id: 'ipcei-h2',
    type: 'EU policy / advice',
    short: 'Hydrogen IPCEIs',
    cite: 'European Commission, DG COMP. Hydrogen value chain — approved IPCEIs (Hy2Tech 2022, Hy2Use 2022, Hy2Infra 2024, Hy2Move 2024).',
    url: 'https://competition-policy.ec.europa.eu/state-aid/ipcei/approved-ipceis/hydrogen-value-chain_en',
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
  {
    id: 'rm-iea-nze',
    theme: 'pathways',
    name: 'Net Zero Roadmap — 2023 Update (industry milestones)',
    publisher: 'IEA',
    year: 2023,
    region: 'Global',
    sourceId: 'iea-nze-2023',
    summary:
      'The reference global 1.5 °C roadmap: industry CO2 falls from ~9.0 Gt (2022) to 0.44 Gt (2050), with electricity reaching 49% of industrial final energy, hydrogen and CCUS together delivering one-fifth of 2030–2050 reductions, and near-zero routes taking over primary steel, cement and chemicals production.',
    levers: [
      'Electrification (23% → 49% of final energy)',
      'H2-DRI steel & near-zero iron (95% of production by 2050)',
      'CCUS in industry (0.25 Gt 2030 → 2.15 Gt 2050)',
      'Near-zero clinker (93% by 2050)',
      'Material & energy efficiency',
    ],
    investmentTimeline:
      'Economy-wide clean-energy investment rises from USD 1.8 trillion (2023) to ~4.5 trillion per year by the early 2030s. The industry milestones imply the same front-loading: near-zero iron production must reach 8% by 2030 while announced projects cover only ~12% of that need — the investment gap is now, not in the 2040s.',
    milestones: [
      { period: '2030', milestone: 'Industry CO2 −20% vs 2022 (7.2 Gt); near-zero iron 8% of production; 590 GW electrolysis installed; 247 Mt industrial CCUS.' },
      { period: '2040', milestone: 'Industry CO2 3.2 Gt; near-zero routes become the default for new capacity across heavy industry.' },
      { period: '2050', milestone: 'Industry CO2 0.44 Gt (−95% vs 2022); electricity 49% of industrial final energy; near-zero shares: iron 95%, clinker 93%, primary chemicals 93%.' },
    ],
  },
  {
    id: 'rm-esabcc-2040',
    theme: 'pathways',
    name: 'EU 2040 climate-target advice (industry findings)',
    publisher: 'ESABCC',
    year: 2023,
    region: 'EU',
    sourceId: 'esabcc-2040-2023',
    summary:
      'The Board’s scenario-filtering exercise behind the 90–95% recommendation: across the 36 filtered 1.5 °C-compatible pathways, EU industrial-process CO2 falls 56–76% between 2019 and 2040, industry final energy use declines 18–44%, and electricity reaches 33–61% of industrial final energy (from 22% in 2019), with hydrogen at 6–23%.',
    levers: [
      'Electrification (33–61% of final energy by 2040)',
      'Demand reduction & efficiency (−18–44% final energy)',
      'Hydrogen (6–23% of final energy)',
      'Circularity (literature: up to −56% in steel/plastics/cement by 2050)',
    ],
    investmentTimeline:
      'The 2030–2050 GHG budget of 11–14 Gt CO2e implies the current investment cycle must deliver the industrial switch: a 56–76% process-CO2 cut by 2040 leaves no room to defer plant conversions into the 2040s.',
    milestones: [
      { period: '2040', milestone: 'EU net GHG −90–95% vs 1990 (recommended); industrial-process CO2 −56–76% vs 2019.' },
      { period: '2030–2050', milestone: 'Cumulative EU GHG budget of 11–14 Gt CO2e across the filtered pathways.' },
    ],
  },
  {
    id: 'rm-esabcc-progress',
    theme: 'pathways',
    name: 'Towards EU climate neutrality — progress assessment (industry chapter)',
    publisher: 'ESABCC',
    year: 2024,
    region: 'EU',
    sourceId: 'esabcc-progress-2024',
    summary:
      'The Board’s 80+-indicator progress assessment: EU industry cut emissions 30% (−290 Mt CO2e) over 2005–2022 while growing real value added 33% — but the historical pace of −17 Mt CO2e/yr must accelerate to −24 Mt/yr in 2023–2030. Iron & steel, cement and chemicals jointly account for almost half of industrial emissions.',
    levers: [
      'H2-DRI steel',
      'Cement CCS',
      'Chemicals electrification',
      'Early-deployment support (the identified policy gap)',
    ],
    investmentTimeline:
      'The pace argument is an investment argument: moving from −17 to −24 Mt CO2e/yr in 2023–2030 requires the zero-emission reinvestments (H2-DRI, cement CCS, electrified chemistry) to happen in this decade’s capital cycle; pilots exist, but dedicated early-deployment support is the gap the report flags.',
    milestones: [
      { period: '2023–2030', milestone: 'Industry reduction pace must rise to −24 Mt CO2e/yr (from −17 Mt/yr in 2005–2022).' },
      { period: '2031–2050', milestone: '−21 Mt CO2e/yr sustained; industry GHG expected −90–93% vs 2005 by 2050 with 65–95 Mt CO2e residual.' },
    ],
  },
  {
    id: 'rm-eurofer',
    theme: 'pathways',
    name: 'Map of key low-CO2 steel projects',
    publisher: 'EUROFER',
    year: 2022,
    region: 'EU',
    sourceId: 'eurofer-2022',
    summary:
      '60 industrial-scale low-carbon steel projects (H2-DRI, EAF, CCUS), almost all starting before 2030 at TRL ≥ 7, together able to cut 81.5 Mt CO2/yr by 2030 — over a third of the EU steel industry’s direct and indirect emissions.',
    levers: ['H2-DRI', 'Scrap-EAF expansion', 'CCUS', 'Decarbonised electricity supply'],
    investmentTimeline:
      '€85 bn must be committed by 2030 — €31 bn CAPEX plus €54 bn OPEX — contingent on ~165 TWh/yr of decarbonised electricity (75 TWh process + ~90 TWh for electrolytic hydrogen) and ~2.12 Mt/yr of hydrogen being available in the same window.',
    milestones: [
      { period: 'to 2030', milestone: 'All 60 projects start; −81.5 Mt CO2/yr abatement potential; €85 bn CAPEX+OPEX; 165 TWh/yr clean power and 2.12 Mt/yr H2 needed.' },
    ],
  },
  {
    id: 'rm-cembureau',
    theme: 'pathways',
    name: 'From Ambition to Deployment — cement 2050 net-zero roadmap',
    publisher: 'Cement Europe (CEMBUREAU)',
    year: 2024,
    region: 'Europe',
    sourceId: 'cembureau-2024',
    summary:
      'The value-chain (“5C”) waterfall from 804 kg CO2/t cement (1990) to net-zero cement by 2050, with CCUS the largest single lever after 2030. The 2024 update raised the 2030 targets from −30%/−40% to −37% (cement) / −50% (value chain) because the first Innovation-Fund-backed CCS plants are now committed.',
    levers: [
      'CCUS (largest post-2030 lever)',
      'Clinker-to-cement ratio 0.60 by 2050',
      'Alternative fuels 95%',
      'Value-chain measures (concrete, construction, recarbonation)',
    ],
    investmentTimeline:
      'The revision logic is the timeline: “substantial investments” in committed CCS plants (Brevik, Go4Zero, ANRAV, Kodeco) must be operational by 2030; CCUS projects are highly capital-intensive and need de-risked financing and CO2 transport infrastructure now, not after 2030.',
    milestones: [
      { period: '2030', milestone: '−37% CO2 on cement / −50% down the value chain (vs 1990); first large CCS plants operational.' },
      { period: '2040', milestone: '−78% on cement / −93% down the value chain.' },
      { period: '2050', milestone: 'Net-zero cement; potentially carbon-negative value chain; >120 innovation projects under way today.' },
    ],
  },
  {
    id: 'rm-agora',
    theme: 'pathways',
    name: 'Breakthrough Strategies for Climate-Neutral Industry in Europe',
    publisher: 'Agora Energiewende / Wuppertal Institute',
    year: 2021,
    region: 'EU',
    sourceId: 'agora-2021',
    summary:
      'The reference source for the reinvestment-window argument: by 2030, 30–50% of existing EU steel, cement and chemicals assets require major reinvestment. Key low-carbon technologies could abate 145 Mt CO2 by 2030 at costs of 100–170 EUR/t — bankable only with carbon contracts for difference, lead markets and hydrogen infrastructure.',
    levers: [
      'Carbon Contracts for Difference',
      'Lead markets for green materials',
      'Hydrogen infrastructure',
      'H2-DRI, cement CCS, chemicals electrification',
    ],
    investmentTimeline:
      'Policy must make breakthrough technologies bankable before this decade’s reinvestment decisions fall: 30–50% of steel/cement/chemicals assets reach the end of their investment cycle by 2030, and a fossil reinvestment locks in emissions for 20+ years.',
    milestones: [
      { period: 'by 2030', milestone: '30–50% of EU steel, cement and chemicals assets need major reinvestment; 145 Mt CO2/yr abatement available at 100–170 EUR/t.' },
    ],
  },

  // ── Clean-tech industry in economy-wide decarbonisation ──
  {
    id: 'rm-iea-etp',
    theme: 'cleantech',
    name: 'Energy Technology Perspectives 2023 (clean-tech manufacturing)',
    publisher: 'IEA',
    year: 2023,
    region: 'Global',
    sourceId: 'iea-etp-2023',
    summary:
      'Frames the “new global energy economy”: the market for key mass-manufactured clean technologies (solar PV, wind, EV batteries, heat pumps, electrolysers) more than triples to ~USD 650 bn/yr by 2030 under announced pledges, and clean-energy manufacturing jobs double from 6 to ~14 million — while today’s supply chains are dominated by a few countries (top-3 producers ≥ 70% of capacity in every mass-manufactured technology, China dominant in all).',
    levers: [
      'Mass manufacturing & economies of scale',
      'Supply-chain diversification',
      'Manufacturing jobs & industrial strategy',
    ],
    investmentTimeline:
      'The manufacturing build-out is front-loaded: the announced project pipeline to 2030 already concentrates ~85–98% of expansion in China for solar and battery components (electrolysers the exception, ~25% EU), so diversification investment must be decided this decade to change the 2030 map.',
    milestones: [
      { period: '2030', milestone: 'Clean-tech market ~USD 650 bn/yr (>3× today); manufacturing jobs ~14 million (from 6).' },
    ],
  },
  {
    id: 'rm-way',
    theme: 'cleantech',
    name: 'Empirically grounded technology forecasts and the energy transition',
    publisher: 'Joule',
    year: 2022,
    region: 'Global',
    sourceId: 'way-2022',
    summary:
      'Probabilistic cost forecasting (Wright’s-law learning curves, backtested on 50+ technologies) shows solar, wind, batteries and electrolysers have fallen in cost ~10%/yr for decades while fossil prices show no long-run trend. A fast transition is likely cheaper than no transition — expected net present saving ~USD 12 trillion (1.4% discount rate), with ~80% probability the fast path is cheaper than staying fossil.',
    levers: [
      'Learning curves / Wright’s law',
      'Solar PV, wind, batteries, electrolysers',
      'Fast deployment as the economically rational bet',
    ],
    investmentTimeline:
      'The result inverts the cost framing of slow-transition arguments: because clean-tech costs fall with cumulative deployment, delaying investment raises system cost — expected 2050 annual system cost is USD 5.9 trillion (fast transition) vs 6.3 trillion (no transition), before counting climate damages.',
    milestones: [
      { period: 'to 2070', milestone: 'Expected saving of the fast transition: ~USD 12 trillion NPV (range ~5–15 trillion); with climate damages included, USD 31–255 trillion (5% discount).' },
    ],
  },
  {
    id: 'rm-irena',
    theme: 'cleantech',
    name: 'Renewable Power Generation Costs in 2023',
    publisher: 'IRENA',
    year: 2024,
    region: 'Global',
    sourceId: 'irena-2024',
    summary:
      'Documents the manufacturing-driven collapse in renewable power costs — the core mechanism by which the clean-tech industry cheapens economy-wide decarbonisation: utility-scale solar PV LCOE fell 90% (2010–2023) to USD 0.044/kWh (now 56% below the weighted-average fossil option), onshore wind fell 70% to USD 0.033/kWh (67% below fossil).',
    levers: ['Manufacturing scale-up', 'Deployment-driven learning', 'Cheap clean power as industrial feedstock'],
    investmentTimeline:
      'The 2010s cost declines were bought by early deployment investment; the implication for the 2020s is that the same learning mechanism now applies to electrolysers, batteries and heat pumps — early volume purchases buy the later cost floor.',
    milestones: [
      { period: '2010–2023', milestone: 'Solar PV LCOE −90% (0.460 → 0.044 USD/kWh); onshore wind −70% (0.111 → 0.033 USD/kWh).' },
    ],
  },
  {
    id: 'rm-nzia',
    theme: 'cleantech',
    name: 'Net-Zero Industry Act — EU manufacturing benchmarks',
    publisher: 'EU (Regulation 2024/1735)',
    year: 2024,
    region: 'EU',
    sourceId: 'nzia-2024',
    summary:
      'The EU’s legislative answer to concentrated clean-tech supply chains: manufacturing capacity for strategic net-zero technologies should approach or reach at least 40% of the Union’s annual deployment needs by 2030 and 15% of world production (in value) by 2040 — plus the first legally binding CO2-storage target: ≥50 Mt/yr injection capacity by 2030.',
    levers: [
      '40% domestic-manufacturing benchmark (2030)',
      '15%-of-world-production benchmark (2040)',
      'CO2 injection capacity ≥50 Mt/yr (2030)',
      'Permitting acceleration & net-zero valleys',
    ],
    investmentTimeline:
      'Both benchmarks are dated to force the capital decision this decade: manufacturing plants permitted after ~2027 barely produce before 2030, and the 50 Mt storage target (with obligations on oil & gas producers) anchors industrial CCS investment cases now. The Commission estimates the EU could need to capture up to 550 Mt CO2/yr by 2050.',
    milestones: [
      { period: '2030', milestone: '≥40% of EU deployment needs manufactured domestically; ≥50 Mt CO2/yr injection capacity operational.' },
      { period: '2040', milestone: 'EU reaches 15% of world production of net-zero technologies (in value).' },
    ],
  },
  {
    id: 'rm-cid',
    theme: 'cleantech',
    name: 'Clean Industrial Deal',
    publisher: 'European Commission (COM(2025) 85)',
    year: 2025,
    region: 'EU',
    sourceId: 'cid-2025',
    summary:
      'Positions decarbonisation as “a powerful growth driver for European industry”, with the clean-tech sector “at the heart of future competitiveness”. Mobilises over €100 bn for EU-made clean manufacturing, proposes a €100 bn Industrial Decarbonisation Bank, and sets economy-wide KPIs: electrification from 21.3% to 32% of final energy by 2030, 100 GW/yr renewables installation, circular material use from 11.8% to 24%.',
    levers: [
      'Lead markets for EU-made clean tech',
      'Industrial Decarbonisation Bank (€100 bn ambition)',
      'Electrification 21.3% → 32% by 2030',
      'Circularity 11.8% → 24% by 2030',
    ],
    investmentTimeline:
      'Over €100 bn mobilised short-term for EU-made clean manufacturing (incl. €1 bn new guarantees under the current MFF); the Industrial Decarbonisation Bank (proposal targeted 2026) aims for €100 bn from the Innovation Fund, additional ETS revenues and a revised InvestEU.',
    milestones: [
      { period: '2025–2026', milestone: '>€100 bn mobilisation announced; Industrial Decarbonisation Bank proposal.' },
      { period: '2030', milestone: 'Electrification 32% of final energy; 100 GW/yr renewables; circular material use 24%; remanufacturing market €31 bn → €100 bn (+500,000 jobs).' },
    ],
  },
  {
    id: 'rm-draghi',
    theme: 'cleantech',
    name: 'The future of European competitiveness (clean-tech findings)',
    publisher: 'Draghi report / European Commission',
    year: 2024,
    region: 'EU',
    sourceId: 'draghi-2024',
    summary:
      'Treats decarbonisation as an existential competitiveness question: more than one-fifth of clean technologies worldwide are developed in the EU, but Chinese state-backed competition is acute and EU industry pays electricity prices 2–3× and gas prices 4–5× US levels. Turning decarbonisation into growth requires a step change in investment.',
    levers: [
      'Clean-tech innovation leadership (>20% of world development)',
      'Energy-price competitiveness',
      'Scale-up finance & industrial policy',
    ],
    investmentTimeline:
      'A minimum of €750–800 bn/yr additional investment (4.4–4.7% of 2023 EU GDP) across digitalisation, decarbonisation and defence — lifting the EU investment share from ~22% to ~27% of GDP, a sustained effort larger (relative to GDP) than the Marshall Plan.',
    milestones: [
      { period: 'from 2025', milestone: '€750–800 bn/yr additional EU investment; investment share ~22% → ~27% of GDP.' },
    ],
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

  // ── Scenario ensembles (IPCC AR6 / IIASA-hosted database, IEA NZE, ESABCC) ──
  {
    id: 'dp-ar6-industry-2019',
    topic: 'scenarios',
    variable: 'Global industry GHG emissions (direct / incl. indirect from purchased power & heat)',
    value: '14.1 (24% of global) / 20 (34%)',
    unit: 'GtCO2-eq',
    region: 'Global',
    scenario: 'Historical (AR6 Ch. 11 Executive Summary)',
    year: '2019',
    sourceId: 'ipcc-ar6-ch11',
  },
  {
    id: 'dp-ar6-industry-cut',
    topic: 'scenarios',
    variable: 'Industrial CO2 emission reduction 2019 → 2050',
    value: 'median −70, max −96',
    unit: '%',
    region: 'Global',
    scenario: 'AR6 scenarios likely to limit warming to 2 °C (>67%) and below (C1–C3)',
    year: '2050',
    note: 'AR6 WGIII Ch. 3 §3.4.5 (Fig. 3.26); derived from the AR6 Scenarios Database hosted by IIASA',
    sourceId: 'ipcc-ar6-ch3',
  },
  {
    id: 'dp-ar6-eip-index',
    topic: 'scenarios',
    variable: 'Energy & industrial-process CO2, index 2020=100 (median, 5–95th pct)',
    value: '2030: 65 (49–75) · 2050: 8 (−8–24)',
    unit: 'index',
    region: 'Global',
    scenario: 'AR6 C1 (1.5 °C, no/limited overshoot)',
    year: '2030 / 2050',
    note: 'Ch. 3 Table 3.4, from the AR6 Scenarios Database (Byers et al. 2022, release 1.1, 3,131 scenarios)',
    sourceId: 'ipcc-ar6-ch3',
  },
  {
    id: 'dp-ar6-elec-share',
    topic: 'scenarios',
    variable: 'Electricity share of final energy, economy-wide (median, 5–95th pct)',
    value: '2030: 27 (23–35) · 2050: 52 (40–64)',
    unit: '%',
    region: 'Global',
    scenario: 'AR6 C1 (2020 base: 20%)',
    year: '2030 / 2050',
    sourceId: 'ipcc-ar6-ch3',
  },
  {
    id: 'dp-ar6-industry-ccs',
    topic: 'scenarios',
    variable: 'Industrial CCS (combustion + process)',
    value: 'up to ~2 by 2050; >6 by 2100',
    unit: 'GtCO2/yr',
    region: 'Global',
    scenario: 'AR6 Illustrative Mitigation Pathways (upper bounds: IMP-GS 2050, IMP-Neg 2100)',
    year: '2050 / 2100',
    sourceId: 'ipcc-ar6-ch11',
  },
  {
    id: 'dp-ar6-h2-share',
    topic: 'scenarios',
    variable: 'Hydrogen share of industrial final energy',
    value: '~5 by 2050 (IMP-Ren); sectoral studies 5–15',
    unit: '%',
    region: 'Global',
    scenario: 'AR6 IMPs vs sectoral/national studies',
    year: '2050',
    sourceId: 'ipcc-ar6-ch11',
  },
  {
    id: 'dp-ar6-db',
    topic: 'scenarios',
    variable: 'AR6 Scenarios Database ensemble (hosted by IIASA)',
    value: '3,131 scenarios · 188 modelling frameworks',
    unit: 'count',
    region: 'Global',
    scenario: 'Release 1.1 (Nov 2022); vetted subset underlies Figs 3.26 & 11.11–11.12',
    year: '2022',
    note: 'Explore industry variables (e.g. Emissions|CO2|Energy|Demand|Industry, Final Energy|Industry|Electricity) in the Scenario Explorer',
    sourceId: 'ar6-db-iiasa',
  },
  {
    id: 'dp-nze-industry-co2',
    topic: 'scenarios',
    variable: 'Global industry CO2 (direct, incl. process emissions)',
    value: '8,998 → 7,158 → 3,222 → 440',
    unit: 'Mt CO2',
    region: 'Global',
    scenario: 'IEA NZE (2023 update)',
    year: '2022 / 2030 / 2040 / 2050',
    note: 'Subsectors 2022→2050: steel 2,623→233; cement 2,418→79; chemicals 1,330→45 Mt (Annex A, Table A.4)',
    sourceId: 'iea-nze-2023',
  },
  {
    id: 'dp-nze-elec-share',
    topic: 'scenarios',
    variable: 'Electricity share of industrial final energy',
    value: '23 → 30 → 49',
    unit: '%',
    region: 'Global',
    scenario: 'IEA NZE (2023 update)',
    year: '2022 / 2030 / 2050',
    sourceId: 'iea-nze-2023',
  },
  {
    id: 'dp-nze-steel',
    topic: 'scenarios',
    variable: 'Near-zero-emission share of iron production',
    value: '0 → 8 → 95',
    unit: '%',
    region: 'Global',
    scenario: 'IEA NZE (2023 update); of which H2-DRI 44% and CCUS-equipped 37% in 2050',
    year: '2022 / 2030 / 2050',
    note: 'Announced projects meet only ~12% of the 2030 near-zero iron need',
    sourceId: 'iea-nze-2023',
  },
  {
    id: 'dp-nze-cement-chem',
    topic: 'scenarios',
    variable: 'Near-zero share of clinker / primary chemicals production in 2050',
    value: '93 / 93',
    unit: '%',
    region: 'Global',
    scenario: 'IEA NZE (2023 update)',
    year: '2050',
    note: 'Clinker-to-cement ratio 0.71 → 0.57; CO2 captured in cement 1,310 Mt in 2050',
    sourceId: 'iea-nze-2023',
  },
  {
    id: 'dp-nze-ccus-h2',
    topic: 'scenarios',
    variable: 'Industrial CCUS / electrolysis capacity / industrial H2 demand',
    value: 'CCUS 4 → 247 → 2,152 Mt CO2 · electrolysis 1 → 590 → 3,300 GW · industry H2 53 → 71 → 139 Mt',
    unit: 'mixed',
    region: 'Global',
    scenario: 'IEA NZE (2023 update); hydrogen + CCUS deliver ~one-fifth of 2030–2050 reductions',
    year: '2022 / 2030 / 2050',
    sourceId: 'iea-nze-2023',
  },
  {
    id: 'dp-esabcc-industry-2040',
    topic: 'scenarios',
    variable: 'EU industrial-process CO2 reduction 2019 → 2040',
    value: '−56 to −76',
    unit: '%',
    region: 'EU',
    scenario: 'ESABCC 36 filtered 1.5 °C-compatible pathways',
    year: '2040',
    sourceId: 'esabcc-2040-2023',
  },
  {
    id: 'dp-esabcc-elec-2040',
    topic: 'scenarios',
    variable: 'Electricity share of EU industrial final energy',
    value: '22 (2019) → 33–61 (2040)',
    unit: '%',
    region: 'EU',
    scenario: 'ESABCC filtered pathways (iconic: Demand-side 43, High-RE 39, Mixed 34)',
    year: '2040',
    note: 'Hydrogen share 6–23% by 2040; industry final energy −18–44% vs 2019',
    sourceId: 'esabcc-2040-2023',
  },
  {
    id: 'dp-esabcc-pace',
    topic: 'scenarios',
    variable: 'EU industry emission-reduction pace: historical vs required',
    value: '−17 (2005–2022) → −24 (2023–2030) → −21 (2031–2050)',
    unit: 'Mt CO2e/yr',
    region: 'EU-27',
    scenario: 'ESABCC progress assessment 2024',
    year: '2005–2050',
    note: 'Industry −30% (−290 Mt) over 2005–2022 while real value added grew 33%; steel+cement+chemicals ≈ half of industrial emissions',
    sourceId: 'esabcc-progress-2024',
  },
  {
    id: 'dp-esabcc-2050',
    topic: 'scenarios',
    variable: 'Expected EU industrial GHG reduction by 2050',
    value: '−90 to −93 (residual 65–95 Mt CO2e)',
    unit: '% vs 2005',
    region: 'EU',
    scenario: 'EC Climate Target Plan scenarios, as cited by ESABCC 2024',
    year: '2050',
    sourceId: 'esabcc-progress-2024',
  },
  {
    id: 'dp-com63-target',
    topic: 'scenarios',
    variable: 'Recommended EU 2040 climate target',
    value: '−90 (residual gross <850 Mt CO2e; removals up to 400 Mt CO2)',
    unit: '% net vs 1990',
    region: 'EU-27',
    scenario: 'COM(2024) 63 (since adopted as binding: 90%, of which 85% domestic)',
    year: '2040',
    sourceId: 'com-2024-63',
  },

  // ── Clean-tech role ──
  {
    id: 'dp-etp-market',
    topic: 'cleantech',
    variable: 'Global market for key mass-manufactured clean technologies',
    value: '~650 (>3× today)',
    unit: 'bn USD/yr by 2030',
    region: 'Global',
    scenario: 'IEA Announced Pledges (solar PV, wind, EV batteries, heat pumps, electrolysers)',
    year: '2030',
    sourceId: 'iea-etp-2023',
  },
  {
    id: 'dp-etp-jobs',
    topic: 'cleantech',
    variable: 'Clean-energy manufacturing jobs',
    value: '6 → ~14',
    unit: 'million',
    region: 'Global',
    scenario: 'IEA Announced Pledges',
    year: '2023 → 2030',
    sourceId: 'iea-etp-2023',
  },
  {
    id: 'dp-etp-concentration',
    topic: 'cleantech',
    variable: 'Supply-chain concentration: top-3 producer countries’ share of manufacturing capacity',
    value: '≥70 (China dominant in all)',
    unit: '%',
    region: 'Global',
    scenario: 'Mass-manufactured technologies (wind, batteries, electrolysers, solar, heat pumps)',
    year: '2023',
    note: 'China 2021: 75% of EV-battery capacity (685 GWh); ~340 GW/yr PV-module capacity; 80% of polysilicon',
    sourceId: 'iea-etp-2023',
  },
  {
    id: 'dp-way-saving',
    topic: 'cleantech',
    variable: 'Expected net present saving of a fast green transition vs no transition',
    value: '~12 trillion (range ~5–15)',
    unit: 'USD NPV (1.4% discount, to 2070)',
    region: 'Global',
    scenario: 'Fast Transition (empirically grounded probabilistic forecasts)',
    year: 'to 2070',
    note: '~80% probability the fast transition is cheaper than continuing the fossil system',
    sourceId: 'way-2022',
  },
  {
    id: 'dp-way-learning',
    topic: 'cleantech',
    variable: 'Historical cost-decline rate of solar PV, wind and batteries',
    value: '~10',
    unit: '%/yr (roughly exponential, for decades)',
    region: 'Global',
    scenario: 'Historical (vs no long-run trend in real fossil-fuel prices over ~140 yr)',
    year: 'to 2022',
    sourceId: 'way-2022',
  },
  {
    id: 'dp-irena-costs',
    topic: 'cleantech',
    variable: 'Global weighted-average LCOE decline, utility-scale solar PV / onshore wind',
    value: 'PV −90 (0.460 → 0.044 USD/kWh) · wind −70 (0.111 → 0.033)',
    unit: '%',
    region: 'Global',
    scenario: 'Historical (2023 PV 56% below, wind 67% below the weighted-average fossil option)',
    year: '2010–2023',
    sourceId: 'irena-2024',
  },
  {
    id: 'dp-nzia-benchmarks',
    topic: 'cleantech',
    variable: 'EU net-zero-technology manufacturing benchmarks',
    value: '≥40% of EU deployment needs by 2030 · 15% of world production by 2040',
    unit: '—',
    region: 'EU',
    scenario: 'Net-Zero Industry Act, Art. 5(1)',
    year: '2030 / 2040',
    sourceId: 'nzia-2024',
  },
  {
    id: 'dp-nzia-storage',
    topic: 'cleantech',
    variable: 'Binding EU CO2 injection-capacity target',
    value: '≥50',
    unit: 'Mt CO2/yr by 2030',
    region: 'EU',
    scenario: 'Net-Zero Industry Act, Art. 20',
    year: '2030',
    note: 'Commission estimate in the recitals: up to 550 Mt CO2/yr capture needed by 2050',
    sourceId: 'nzia-2024',
  },
  {
    id: 'dp-cid-kpis',
    topic: 'cleantech',
    variable: 'EU economy-wide electrification rate / circular material use rate',
    value: '21.3 → 32 · 11.8 → 24',
    unit: '%',
    region: 'EU',
    scenario: 'Clean Industrial Deal KPIs (plus 100 GW/yr renewables installation to 2030)',
    year: 'today → 2030',
    sourceId: 'cid-2025',
  },
  {
    id: 'dp-draghi-innovation',
    topic: 'cleantech',
    variable: 'EU share of clean and sustainable technologies developed worldwide',
    value: '>20 (more than one-fifth)',
    unit: '%',
    region: 'EU / Global',
    scenario: 'Draghi competitiveness assessment',
    year: '2024',
    note: 'EU industrial energy-price gap: electricity 2–3×, gas 4–5× US levels',
    sourceId: 'draghi-2024',
  },

  // ── Investment (EU roadmaps & funding channels) ──
  {
    id: 'dp-com63-invest',
    topic: 'investment',
    variable: 'EU energy-system investment need (excl. transport)',
    value: '~660/yr on average 2031–2050 (Option 3 front-loads to 710/yr in 2031–2040)',
    unit: 'bn EUR/yr (3.2% of GDP; vs 250 bn/yr in 2011–2020)',
    region: 'EU-27',
    scenario: 'COM(2024) 63 impact assessment',
    year: '2031–2050',
    note: 'Plus ~870 bn EUR/yr transport spending (4.2% of GDP); overall +1.5% of GDP vs the 2011–2020 decade',
    sourceId: 'com-2024-63',
  },
  {
    id: 'dp-draghi-invest',
    topic: 'investment',
    variable: 'Additional annual EU investment need (decarbonisation + digital + defence)',
    value: '750–800',
    unit: 'bn EUR/yr (4.4–4.7% of 2023 GDP)',
    region: 'EU',
    scenario: 'Draghi report (investment share ~22% → ~27% of GDP)',
    year: 'from 2025',
    sourceId: 'draghi-2024',
  },
  {
    id: 'dp-eurofer-invest',
    topic: 'investment',
    variable: 'EU steel decarbonisation investment need to 2030',
    value: '85 (31 CAPEX + 54 OPEX)',
    unit: 'bn EUR',
    region: 'EU',
    scenario: '60 low-CO2 steel projects (TRL ≥7), −81.5 Mt CO2/yr by 2030',
    year: 'to 2030',
    note: 'Requires ~165 TWh/yr decarbonised power and ~2.12 Mt/yr hydrogen',
    sourceId: 'eurofer-2022',
  },
  {
    id: 'dp-agora-window',
    topic: 'investment',
    variable: 'Share of EU steel, cement & chemicals assets needing major reinvestment by 2030',
    value: '30–50',
    unit: '%',
    region: 'EU',
    scenario: 'Reinvestment-window analysis; 145 Mt CO2/yr abatable at 100–170 EUR/t',
    year: 'by 2030',
    sourceId: 'agora-2021',
  },
  {
    id: 'dp-innovation-fund',
    topic: 'investment',
    variable: 'EU Innovation Fund size',
    value: '~40 (at €75/t CO2; 530 million ETS allowances)',
    unit: 'bn EUR, 2020–2030',
    region: 'EU',
    scenario: 'ETS-revenue-financed demonstration funding',
    year: '2020–2030',
    sourceId: 'innovation-fund',
  },
  {
    id: 'dp-ipcei-h2',
    topic: 'investment',
    variable: 'Approved hydrogen IPCEIs: public support (+ expected private)',
    value: '18.9 public (+ ~24.7 private expected)',
    unit: 'bn EUR',
    region: 'EU',
    scenario: 'Hy2Tech 5.4+9 · Hy2Use 5.2+7 · Hy2Infra 6.9+5.4 · Hy2Move 1.4+3.3',
    year: '2022–2024',
    note: 'Sum computed from the per-IPCEI figures on the Commission page',
    sourceId: 'ipcei-h2',
  },
  {
    id: 'dp-cid-invest',
    topic: 'investment',
    variable: 'Clean Industrial Deal mobilisation / Industrial Decarbonisation Bank ambition',
    value: '>100 / 100',
    unit: 'bn EUR',
    region: 'EU',
    scenario: 'COM(2025) 85 (bank proposal targeted 2026, from Innovation Fund + ETS revenues + InvestEU)',
    year: '2025–2030',
    sourceId: 'cid-2025',
  },
  {
    id: 'dp-nze-invest',
    topic: 'investment',
    variable: 'Global clean-energy investment (economy-wide)',
    value: '1.8 → ~4.5',
    unit: 'trillion USD/yr',
    region: 'Global',
    scenario: 'IEA NZE (2023 update)',
    year: '2023 → early 2030s',
    sourceId: 'iea-nze-2023',
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
  {
    label: 'IEA NZE 2023 — global industry CO2',
    scenario: 'Net Zero Emissions by 2050 (2023 update), Annex A Table A.4',
    scope: 'Global industry, direct CO2 incl. process emissions',
    unit: 'Mt CO2/yr',
    sourceId: 'iea-nze-2023',
    series: [
      { year: 2022, value: 8998 },
      { year: 2030, value: 7158 },
      { year: 2040, value: 3222 },
      { year: 2050, value: 440 },
    ],
  },
  {
    label: 'AR6 C1 median — energy & industrial-process CO2',
    scenario: 'AR6 C1 (1.5 °C, no/limited overshoot), median of the IIASA-hosted ensemble; 5–95th pct: 2030 49–75, 2050 −8–24',
    scope: 'Global energy & industrial processes (economy-wide)',
    unit: 'index (2020 = 100)',
    sourceId: 'ipcc-ar6-ch3',
    series: [
      { year: 2020, value: 100 },
      { year: 2030, value: 65 },
      { year: 2050, value: 8 },
    ],
  },
  {
    label: 'ESABCC filtered pathways — EU industrial-process CO2',
    scenario: '36 filtered 1.5 °C-compatible pathways: −56…−76% over 2019–2040 (midpoint −66% plotted)',
    scope: 'EU industrial-process CO2',
    unit: 'index (2019 = 100)',
    sourceId: 'esabcc-2040-2023',
    series: [
      { year: 2019, value: 100 },
      { year: 2040, value: 34 },
    ],
  },
];

export const ELECTRIFICATION_BENCHMARKS: IrFigureBar[] = [
  {
    label: 'Global industry today (2022) — IEA',
    value: 23,
    unit: '% of industrial final energy',
    note: 'IEA NZE 2023, Annex A Table A.2',
    sourceId: 'iea-nze-2023',
  },
  {
    label: 'EU economy-wide 2030 target — Clean Industrial Deal',
    value: 32,
    unit: '% of final energy (economy-wide, from 21.3% today)',
    note: 'Economy-wide KPI, not industry-specific',
    sourceId: 'cid-2025',
  },
  {
    label: 'Global industry 2050 — IEA NZE',
    value: 49,
    unit: '% of industrial final energy',
    sourceId: 'iea-nze-2023',
  },
  {
    label: 'Economy-wide 2050 median — AR6 C1',
    value: 52,
    unit: '% of final energy (economy-wide; 5–95th pct 40–64)',
    note: 'AR6 Ch. 3 Table 3.4, IIASA-hosted ensemble',
    sourceId: 'ipcc-ar6-ch3',
  },
  {
    label: 'EU industry 2040 range — ESABCC filtered pathways',
    value: [33, 61],
    unit: '% of industrial final energy (from 22% in 2019)',
    sourceId: 'esabcc-2040-2023',
  },
  {
    label: 'Technical potential, established tech — Madeddu et al.',
    value: 78,
    unit: '% of industrial energy demand electrifiable',
    sourceId: 'madeddu-2020',
  },
  {
    label: 'Technical potential incl. tech in development — Madeddu et al.',
    value: 99,
    unit: '% of industrial energy demand electrifiable',
    sourceId: 'madeddu-2020',
  },
];

/** Annualised investment estimates, EU heavy-industry scope (bn EUR/yr). */
export const INVESTMENT_INDUSTRY: IrFigureBar[] = [
  {
    label: 'Heavy-industry power supply (additional)',
    value: [5, 8],
    unit: 'bn EUR/yr',
    note: 'Electricity generation for industry, on top of process investment',
    sourceId: 'material-economics-2019',
  },
  {
    label: 'Core industrial processes at the 2030s peak',
    value: [12, 14],
    unit: 'bn EUR/yr',
    note: 'vs 4.8–5.4 bn EUR/yr baseline; average additional +3.9 to +5.5',
    sourceId: 'material-economics-2019',
  },
];

/** Annualised investment estimates, EU economy-wide scope (bn EUR/yr). */
export const INVESTMENT_ECONOMY: IrFigureBar[] = [
  {
    label: 'EU energy system 2031–2050 (COM(2024) 63)',
    value: [660, 710],
    unit: 'bn EUR/yr',
    note: '660 average 2031–2050 (3.2% of GDP); Option 3 front-loads to 710 in 2031–2040; vs 250 in 2011–2020',
    sourceId: 'com-2024-63',
  },
  {
    label: 'Additional EU investment, all objectives (Draghi)',
    value: [750, 800],
    unit: 'bn EUR/yr',
    note: 'Decarbonisation + digital + defence, 4.4–4.7% of 2023 GDP',
    sourceId: 'draghi-2024',
  },
];

/** EU funding channels & sector programmes — totals, bn EUR (not per year). */
export const FUNDING_CHANNELS: IrFigureBar[] = [
  {
    label: 'Hydrogen IPCEIs — public support (2022–2024)',
    value: 18.9,
    unit: 'bn EUR total',
    note: '+ ~24.7 bn expected private; sum of Hy2Tech, Hy2Use, Hy2Infra, Hy2Move',
    sourceId: 'ipcei-h2',
  },
  {
    label: 'Innovation Fund (2020–2030)',
    value: 40,
    unit: 'bn EUR total',
    note: 'At €75/t CO2; financed from 530 million ETS allowances',
    sourceId: 'innovation-fund',
  },
  {
    label: 'EU steel projects need to 2030 (EUROFER)',
    value: 85,
    unit: 'bn EUR total',
    note: '31 CAPEX + 54 OPEX for 60 low-CO2 projects',
    sourceId: 'eurofer-2022',
  },
  {
    label: 'Clean Industrial Deal mobilisation',
    value: 100,
    unit: 'bn EUR total',
    note: '“Over EUR 100 billion” for EU-made clean manufacturing; separate 100 bn Industrial Decarbonisation Bank ambition',
    sourceId: 'cid-2025',
  },
];

const SOURCE_INDEX = new Map(SOURCES.map((s) => [s.id, s]));

export function sourceById(id: string): IrSource | undefined {
  return SOURCE_INDEX.get(id);
}
