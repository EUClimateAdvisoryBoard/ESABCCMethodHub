/**
 * Overview Industry — Clean Tech, Side 2: the EXTERNAL role (data).
 * ------------------------------------------------------------------
 * The complement of `cleantech-catalogue.ts` (Side 1). Side 1 maps the
 * emissions of the manufacturing subsectors we ALREADY have and the levers
 * that remove them. This file maps the NEW manufacturing industries — solar
 * PV, wind turbines, batteries, electric vehicles, electrolysers, heat pumps
 * — and their EXTERNAL role: how their products decarbonise the OTHER
 * sectors (power, transport, buildings, other industry, agriculture).
 *
 * Four data blocks:
 *   • DEMAND_SECTORS         — the sectors being decarbonised;
 *   • CLEANTECH_INDUSTRIES   — each clean-tech industry: NACE mapping, the
 *                              sectors it supports (with mechanism + source),
 *                              sourced mitigation potentials, sourced
 *                              deployment levels in robust 2040 modelling,
 *                              and the EU manufacturing position;
 *   • SECTOR_PATHWAYS        — the sectoral emission reductions modelled in
 *                              the European Commission's 2040-target impact
 *                              assessment (SWD(2024) 63), linking each
 *                              sector's cut to its clean-tech drivers;
 *   • EXTERNAL_PRIORITIES    — an EDITORIAL priority & competitiveness read
 *                              (flagged, like the clean/old overlay).
 *
 * SOURCING RULE (hard, same as Side 1): every data point carries a `source`
 * with a real, working link — nothing is invented. Scenario figures are
 * study- and assumption-dependent; each is attributed to the specific source
 * it came from and should be read as "as reported by <source>". The ONLY
 * non-sourced layer is EXTERNAL_PRIORITIES, which is an analytical judgement
 * by MethodHub, clearly flagged in the UI and the export.
 */

import type { Source, Sourced } from './cleantech-catalogue';

/* ------------------------------------------------------------ shared srcs */

const S = {
  /** The 2040-target impact assessment itself (full SWD, all parts). */
  ia: {
    org: 'European Commission',
    title:
      'Impact assessment accompanying "Securing our future — Europe\'s 2040 climate target" (SWD(2024) 63)',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A52024SC0063',
    year: '2024',
  } as Source,
  iaExec: {
    org: 'European Commission',
    title: '2040 Climate Target Impact Assessment — Executive Summary (SWD(2024) 64)',
    url: 'https://climate.ec.europa.eu/document/download/06182e00-03ac-4b6b-a58c-54cb45b080c2_en?filename=2040+Climate+Target+Impact+Assessment+Executive+Summary_en.pdf',
    year: '2024',
  } as Source,
  com2040: {
    org: 'European Commission',
    title:
      'Securing our future — Europe\'s 2040 climate target and path to climate neutrality by 2050 (COM(2024) 63)',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM:2024:63:FIN',
    year: '2024',
  } as Source,
  /** The adopted, legally binding 2040 target — supersedes the IA's range as current law. */
  climateLaw2040: {
    org: 'Council of the EU; European Parliament',
    title:
      'Amended European Climate Law — Regulation (EU) 2026/667: final green light for a legally binding 90% net GHG reduction by 2040 (see also europarl.europa.eu/news/en/press-room/20260205IPR33620)',
    url: 'https://www.consilium.europa.eu/en/press/press-releases/2026/03/05/2040-climate-target-council-gives-final-green-light/',
    year: '2026',
  } as Source,
  ipccCh12: {
    org: 'IPCC',
    title: 'AR6 WGIII, Chapter 12 (Table 12.3: sectoral mitigation potentials in 2030)',
    url: 'https://www.ipcc.ch/report/ar6/wg3/downloads/report/IPCC_AR6_WGIII_Chapter12.pdf',
    year: '2022',
  } as Source,
  ipccSpm: {
    org: 'IPCC',
    title: 'AR6 WGIII, Summary for Policymakers (C.12: options below USD 20/tCO₂)',
    url: 'https://www.ipcc.ch/report/ar6/wg3/downloads/report/IPCC_AR6_WGIII_SPM.pdf',
    year: '2022',
  } as Source,
  ieaGer: {
    org: 'IEA',
    title: 'Global Energy Review 2025 — CO₂ emissions (avoided emissions from five clean technologies)',
    url: 'https://www.iea.org/reports/global-energy-review-2025/co2-emissions',
    year: '2025',
  } as Source,
  ieaEtp24: {
    org: 'IEA',
    title: 'Energy Technology Perspectives 2024 (clean-tech market > USD 2 trillion by 2035)',
    url: 'https://www.iea.org/reports/energy-technology-perspectives-2024',
    year: '2024',
  } as Source,
  ieaElectrolysers: {
    org: 'IEA',
    title: 'Electrolysers (energy-system tracking page)',
    url: 'https://www.iea.org/energy-system/low-emission-fuels/electrolysers',
    year: '2024',
  } as Source,
  draghi: {
    org: 'European Commission (Draghi report)',
    title: 'The future of European competitiveness — Part B, Ch. 5: Clean technologies',
    url: 'https://commission.europa.eu/topics/competitiveness/draghi-report_en',
    year: '2024',
  } as Source,
  nzia: {
    org: 'EU (Regulation (EU) 2024/1735 — Net-Zero Industry Act)',
    title: 'Net-Zero Industry Act: ≥40% of EU deployment needs manufactured domestically by 2030',
    url: 'https://eur-lex.europa.eu/eli/reg/2024/1735/oj',
    year: '2024',
  } as Source,
  nziaSummary: {
    org: 'EUR-Lex (NZIA summary)',
    title: 'Net-Zero Industry Act — aim of 15% of world production in value by 2040',
    url: 'https://eur-lex.europa.eu/EN/legal-content/summary/eu-net-zero-industry-act.html',
    year: '2024',
  } as Source,
  eurostatSolar: {
    org: 'Eurostat',
    title: 'EU imports of green-energy products (98% of 2024 solar-panel imports from China)',
    url: 'https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20251009-2',
    year: '2025',
  } as Source,
  jrcPv: {
    org: 'JRC (Clean Energy Technology Observatory)',
    title: 'CETO: Photovoltaics in the EU — 2024 Status Report (JRC139297)',
    url: 'https://publications.jrc.ec.europa.eu/repository/bitstream/JRC139297/JRC139297_01.pdf',
    year: '2024',
  } as Source,
  windMonthly: {
    org: 'Windpower Monthly (GWEC data)',
    title: 'Analysis: Chinese wind turbine makers increase EU market share',
    url: 'https://www.windpowermonthly.com/article/1869858/analysis-chinese-wind-turbine-makers-increase-eu-market-share',
    year: '2025',
  } as Source,
  ehpaMade: {
    org: 'European Heat Pump Association (EHPA)',
    title: "Europe's heat pumps are mainly 'made in Europe'",
    url: 'https://ehpa.org/news-and-resources/press-releases/heat-pumps-made-in-europe/',
    year: '2024',
  } as Source,
  ehpaRepower: {
    org: 'EHPA',
    title: 'REPowerEU and the EU heat-pump action plan (10 million by 2027, 30 million by 2030)',
    url: 'https://ehpa.org/policy-2/repowereu-and-the-eu-heat-pump-action-plan/',
    year: '2023',
  } as Source,
  heatpumpSalesDrop: {
    org: 'SigmaEarth (EHPA data)',
    title:
      'Heat pump sales in Europe drop 23%, returning to pre-Ukraine-war levels (see also heatpumpswatch.org: "Are the ambitious heat pump targets achievable?")',
    url: 'https://sigmaearth.com/heat-pump-sales-in-europe-drop-23-returning-to-pre-ukraine-war-levels/',
    year: '2025',
  } as Source,
  fertEurope: {
    org: 'Fertilizers Europe',
    title: 'Ammonia Roadmap for the European fertilizer industry',
    url: 'https://www.fertilizerseurope.com/wp-content/uploads/2023/11/Ammonia-Roadmap-Fertilizer-Europe-FINAL-Sept-22-2023.pdf',
    year: '2023',
  } as Source,
  lbnlHeatPump: {
    org: 'LBNL / Global Efficiency Intelligence',
    title: 'Electrification of manufacturing with industrial heat pumps',
    url: 'https://eta-publications.lbl.gov/sites/default/files/us_industrial_heat_pump-final.pdf',
    year: '2024',
  } as Source,
  eeaTrends: {
    org: 'European Environment Agency (EEA)',
    title: 'Trends and Projections 2024 — power emissions down 22% in 2023 on renewables growth',
    url: 'https://www.eea.europa.eu/en/newsroom/news/eea-trends-and-projections',
    year: '2024',
  } as Source,
  /** The Northvolt bankruptcy that undercuts the Draghi "~15%" battery-capacity trajectory. */
  northvoltCollapse: {
    org: 'Eurofound',
    title:
      'Battery manufacturing in the EU: from hope to crisis to hope again (see also EPRS briefing, europarl.europa.eu/RegData/etudes/BRIE/2025/767214)',
    url: 'https://www.eurofound.europa.eu/en/publications/all/battery-manufacturing-in-the-eu-from-hope-to-crisis-to-hope-again',
    year: '2025',
  } as Source,
};

/* -------------------------------------------------------------- sectors */

export type DemandSectorId = 'power' | 'transport' | 'buildings' | 'industry' | 'agriculture';

export interface DemandSector {
  id: DemandSectorId;
  name: string;
  color: string;
  icon: string;
  /** One line: what decarbonising this sector depends on. */
  summary: string;
}

export const DEMAND_SECTORS: DemandSector[] = [
  {
    id: 'power',
    name: 'Power',
    color: '#0065A4',
    icon: '⚡',
    summary:
      'Electricity supply — the keystone sector: every electrification lever downstream is only as clean as the power behind it.',
  },
  {
    id: 'transport',
    name: 'Transport',
    color: '#B83230',
    icon: '🚗',
    summary:
      'Road transport dominated by oil; decarbonised mainly by battery-electric vehicles on clean power, plus e-fuels for the hard end.',
  },
  {
    id: 'buildings',
    name: 'Buildings',
    color: '#FF9933',
    icon: '🏠',
    summary:
      'Space and water heating on gas and oil boilers; decarbonised mainly by heat pumps, efficiency and district heat.',
  },
  {
    id: 'industry',
    name: 'Other industry',
    color: '#6667AB',
    icon: '🏭',
    summary:
      'The Side-1 subsectors themselves: their electrification, hydrogen and heat-pump levers all consume Side-2 products.',
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    color: '#007B6C',
    icon: '🌾',
    summary:
      'Machinery, heat and fertiliser inputs: electrified equipment, clean heat and green-ammonia fertiliser — the sector these six industries reach least.',
  },
];

/* ---------------------------------------------------- clean-tech industries */

export type SupportRole = 'primary' | 'supporting';

export interface SectorSupport {
  sectorId: DemandSectorId;
  role: SupportRole;
  /** The mechanism: how this industry's products cut that sector's emissions. */
  note: string;
  source: Source;
}

export interface CleanTechIndustry {
  id: string;
  name: string;
  color: string;
  icon: string;
  /** NACE Rev. 2.1 manufacturing codes (Section C) for the industry itself. */
  nace: string[];
  naceNote?: string;
  /** What the industry manufactures. */
  what: string;
  /** The demand sectors its products decarbonise. */
  supports: SectorSupport[];
  /** Sourced mitigation-potential statements. */
  mitigation: Sourced[];
  /** Sourced deployment levels in robust 2040/2050 modelling. */
  scenarioDeployment: Sourced[];
  /** Sourced EU manufacturing / competitiveness position. */
  euPosition: Sourced[];
}

export const CLEANTECH_INDUSTRIES: CleanTechIndustry[] = [
  /* ------------------------------------------------------------ solar PV */
  {
    id: 'solar',
    name: 'Solar PV',
    color: '#DD8500',
    icon: '☀️',
    nace: ['26.11', '27.90'],
    naceNote:
      'Indicative mapping: PV cells fall under electronic components (26.11); modules, inverters and balance-of-system spread across divisions 26–27.',
    what: 'Polysilicon, wafers, cells, modules and inverters — the manufacturing chain behind photovoltaic electricity.',
    supports: [
      {
        sectorId: 'power',
        role: 'primary',
        note: 'PV is a main pillar of the modelled renewable build-out: renewable generation rises to 3,700–4,540 TWh and 85% of the EU electricity mix by 2040.',
        source: S.ia,
      },
      {
        sectorId: 'industry',
        role: 'supporting',
        note: 'Cheap solar power underwrites the electrification of low- and medium-temperature industrial processes that the IA names as a main driver of rising electricity demand.',
        source: S.ia,
      },
      {
        sectorId: 'agriculture',
        role: 'supporting',
        note: 'Clean power for electrified farm equipment, irrigation and on-site generation — agriculture decarbonises partly through the energy inputs it buys.',
        source: S.ia,
      },
    ],
    mitigation: [
      {
        value: 'Mitigation potential 2.0–7.0 GtCO₂-eq/yr by 2030 (global)',
        note: 'the single largest option in AR6; the majority of the potential at negative net cost',
        source: S.ipccCh12,
      },
      {
        value: 'Solar PV deployed 2019–2024 now avoids ~1.4 GtCO₂/yr globally',
        note: 'the largest avoided-emissions contribution of the five mass-manufactured clean technologies the IEA tracks',
        source: S.ieaGer,
      },
      {
        value: 'Among the largest low-cost options below USD 20/tCO₂',
        note: 'AR6 SPM C.12.1: large contributions under USD 20/t come from solar and wind energy',
        source: S.ipccSpm,
      },
    ],
    scenarioDeployment: [
      {
        value: 'Renewable capacity 1,939–2,298 GW installed by 2040 (EU-27)',
        note: 'IA Table 10; total net capacity 2,181–2,525 GW across S1–S3, fossil capacity falling to 155–170 GW',
        source: S.ia,
      },
      {
        value: 'Renewables reach 85% of EU electricity by 2040, ~90% by 2050',
        note: 'IA Figure 20 (PRIMES); up from 39% in 2021',
        source: S.ia,
      },
    ],
    euPosition: [
      {
        value: 'EU presence in PV manufacturing now "negligible" — ~9 GW/yr of module assembly retained',
        note: 'Chinese module manufacturing costs ~35–65% below the EU (IEA, cited by Draghi)',
        source: S.draghi,
      },
      {
        value: '98% of EU solar-panel imports came from China in 2024 (€10.9 bn)',
        note: 'down from €19.0 bn in 2023 on falling panel prices, not falling volumes',
        source: S.eurostatSolar,
      },
      {
        value: 'EU polysilicon capacity ~28–29 GWp vs ~1,154 GWp of global module capacity (end-2023)',
        note: 'EU imported ~88 GWp of Chinese modules in 2021–22, leaving ~47 GWp warehoused',
        source: S.jrcPv,
      },
    ],
  },

  /* ---------------------------------------------------------------- wind */
  {
    id: 'wind',
    name: 'Wind turbines',
    color: '#2C7DA0',
    icon: '🌀',
    nace: ['28.11', '27.11'],
    naceNote:
      'Indicative mapping: turbines under engines & turbines (28.11); generators and converters under electric motors & generators (27.11).',
    what: 'Onshore and offshore turbines, nacelles, blades, gearboxes, generators and power converters.',
    supports: [
      {
        sectorId: 'power',
        role: 'primary',
        note: 'Wind is the other main pillar of the modelled renewable build-out to 85% renewable electricity in 2040 — the sector the IA takes to zero (net −10 Mt in S3).',
        source: S.ia,
      },
      {
        sectorId: 'industry',
        role: 'supporting',
        note: 'Bulk renewable power is the feedstock of industrial electrification and of the 60–100 Mtoe of hydrogen the IA models for 2040 — most of it electrolytic.',
        source: S.ia,
      },
    ],
    mitigation: [
      {
        value: 'Mitigation potential 2.1–5.6 GtCO₂-eq/yr by 2030 (global)',
        note: 'AR6 Table 12.3; the majority of the potential at negative net cost',
        source: S.ipccCh12,
      },
      {
        value: 'Wind capacity deployed 2019–2024 now avoids ~900 MtCO₂/yr globally',
        source: S.ieaGer,
      },
      {
        value: 'EU power emissions fell 22% in 2023 alone — the largest annual drop in 33 years',
        note: 'EEA attributes it to reduced coal and gas alongside a significant increase in renewables',
        source: S.eeaTrends,
      },
    ],
    scenarioDeployment: [
      {
        value: 'Part of the 1,939–2,298 GW renewable fleet modelled for 2040',
        note: 'IA Table 10 (PRIMES), S1–S3',
        source: S.ia,
      },
      {
        value: 'Renewable generation 3,700–4,540 TWh in 2040 (from 1,125 TWh in 2021)',
        note: 'IA Figure 20',
        source: S.ia,
      },
    ],
    euPosition: [
      {
        value: 'EU turbine industry serves ~85% of domestic demand and is a net exporter',
        note: 'but the EU global market share fell from 58% (2017) to ~30% (2022); EU makes only ~10% of gearboxes and power converters vs China\'s 66–77%',
        source: S.draghi,
      },
      {
        value: 'European suppliers held a 92% share of the European market in 2024',
        note: 'GWEC data; Chinese turbines were ~0.4% of EU capacity installed 2013–2023',
        source: S.windMonthly,
      },
    ],
  },

  /* ------------------------------------------------------------ batteries */
  {
    id: 'batteries',
    name: 'Batteries',
    color: '#6667AB',
    icon: '🔋',
    nace: ['27.20'],
    naceNote: 'Batteries and accumulators (27.20); cathode/anode materials sit upstream in chemicals (Section C, division 20).',
    what: 'Lithium-ion cells, packs and stationary storage systems — the energy carrier of electrified transport and a balancing asset of renewable power.',
    supports: [
      {
        sectorId: 'transport',
        role: 'primary',
        note: 'Batteries are the enabling component of the electric-vehicle fleet that delivers most of the modelled 69–78% transport cut by 2040.',
        source: S.ia,
      },
      {
        sectorId: 'power',
        role: 'supporting',
        note: 'Storage is one of the six mass-manufactured clean technologies (with EVs its twin demand pillar) in the >USD 2 trillion clean-tech market the IEA projects for 2035 — balancing the 85%-renewable system the IA models.',
        source: S.ieaEtp24,
      },
    ],
    mitigation: [
      {
        value: 'Electric light-duty vehicles: 0.5–0.7 GtCO₂-eq/yr potential by 2030 (global)',
        note: 'AR6 Table 12.3, "depending on the carbon intensity of the electricity"; electric heavy-duty vehicles a further ~0.2 Gt',
        source: S.ipccCh12,
      },
      {
        value: 'Electric cars deployed 2019–2024 avoid ~80 MtCO₂/yr globally',
        note: 'battery-enabled; one of the five technologies jointly avoiding ~2.6 Gt/yr',
        source: S.ieaGer,
      },
    ],
    scenarioDeployment: [
      {
        value: 'Battery-electric cars reach 57–58% of the EU car stock in 2040, 79–80% in 2050',
        note: 'IA Figure 67; battery-electric trucks 24–25% of the HGV stock in 2040',
        source: S.ia,
      },
      {
        value: 'Electricity rises above 45% of EU final energy consumption by 2040',
        note: 'IA: driven by EVs, heat pumps and industrial electrification — all battery- or storage-adjacent',
        source: S.ia,
      },
    ],
    euPosition: [
      {
        value: 'EU holds only ~6.5% of global battery-cell production',
        note: 'planned capacity would lift it to ~15%; battery imports grew 7.5× over 2017–2023, >€17 bn from China in 2023',
        source: S.draghi,
      },
      {
        value: 'That "~15%" trajectory predates the Northvolt bankruptcy',
        note: 'Northvolt — the flagship gigafactory behind much of the planned capacity — collapsed in March 2025; Skellefteå output fell from a planned 16 GWh to ~1 GWh before the site was sold to Lyten in Aug 2025. The Draghi projection above has not been revised down for this loss, even as other capacity (e.g. CATL Debrecen) fills part of the gap — see current 2025/26 capacity data before treating ~15% as on track',
        source: S.northvoltCollapse,
      },
      {
        value: '~90% of wafer, anode and cathode manufacturing capacity sits in the Asia-Pacific region',
        note: 'the upstream dependence behind the cell-level numbers',
        source: S.draghi,
      },
    ],
  },

  /* ------------------------------------------------------------------ EVs */
  {
    id: 'ev',
    name: 'Electric vehicles',
    color: '#8C3B4A',
    icon: '🚙',
    nace: ['29.10'],
    naceNote: 'Manufacture of motor vehicles (29.10); traction batteries under 27.20.',
    what: 'Battery-electric passenger cars, vans, trucks and buses — the product that carries clean power into road transport.',
    supports: [
      {
        sectorId: 'transport',
        role: 'primary',
        note: 'The IA attributes the modelled transport cut "primarily [to] large-scale deployment of electric vehicles in road transport"; transport electricity demand rises ~8× from 60 TWh (2021) to 505–510 TWh (2040).',
        source: S.ia,
      },
      {
        sectorId: 'agriculture',
        role: 'supporting',
        note: 'Electrified light vehicles and machinery extend the same drivetrain shift to farm transport as electricity reaches >45% of final energy by 2040.',
        source: S.ia,
      },
    ],
    mitigation: [
      {
        value: 'Electric LDVs: 0.5–0.7 GtCO₂-eq/yr potential by 2030; electric HDVs ~0.2 Gt (global)',
        source: S.ipccCh12,
      },
      {
        value: 'Electric cars already avoid ~80 MtCO₂/yr globally (2019–2024 deployment)',
        source: S.ieaGer,
      },
    ],
    scenarioDeployment: [
      {
        value: 'ICE cars fall from ~100% of the stock (2015) to 26% in 2040 and 2% in 2050',
        note: 'IA Figure 67: BEV 57–58%, plug-in hybrids ~11%, fuel-cell ~5% of the 2040 car stock',
        source: S.ia,
      },
    ],
    euPosition: [
      {
        value: 'The EU is the world\'s second-largest market for EV sales (17–25% global share, with solar and wind)',
        note: 'a demand base the incumbent EU automotive industry can convert — Draghi\'s central competitiveness argument for the sector',
        source: S.draghi,
      },
      {
        value: 'EU clean-tech imports from China reached ~€43 bn in 2023 across solar, wind, batteries and heat pumps',
        note: 'the supply-chain context in which the EU vehicle transition happens',
        source: S.draghi,
      },
    ],
  },

  /* --------------------------------------------------------- electrolysers */
  {
    id: 'electrolysers',
    name: 'Electrolysers',
    color: '#007B6C',
    icon: '⚗️',
    nace: ['28.29'],
    naceNote: 'Indicative mapping: electrolyser stacks and systems under other general-purpose machinery (28.29); no dedicated NACE class exists.',
    what: 'Alkaline, PEM and SOEC electrolysis systems — the machines that turn renewable power into hydrogen for industry, fuels and fertiliser.',
    supports: [
      {
        sectorId: 'industry',
        role: 'primary',
        note: 'Electrolytic hydrogen and RFNBOs cover >10–20% of industrial sectoral demand in the IA\'s S2/S3 by 2040 — the feedstock switch behind green steel, ammonia and chemicals on Side 1.',
        source: S.ia,
      },
      {
        sectorId: 'transport',
        role: 'supporting',
        note: 'E-fuel production scales to 15–37 Mtoe by 2040 in the IA (S1–S3) for aviation, shipping and the hard end of road transport.',
        source: S.ia,
      },
      {
        sectorId: 'agriculture',
        role: 'supporting',
        note: 'Green ammonia decarbonises the nitrogen-fertiliser input: the European fertiliser industry\'s own roadmap runs on electrolytic hydrogen.',
        source: S.fertEurope,
      },
    ],
    mitigation: [
      {
        value: 'EU hydrogen consumption scales to 55–95 Mtoe by 2040 in the IA scenarios',
        note: 'roughly doubling again to ~170–175 Mtoe by 2050; RFNBOs ~5–10% of total final energy in 2040',
        source: S.ia,
      },
    ],
    scenarioDeployment: [
      {
        value: 'Hydrogen production 60 / 76 / 100 Mtoe in 2040 (S1/S2/S3), from 9 Mtoe in 2030',
        note: 'IA Table 10; e-fuels 15–37 Mtoe in 2040',
        source: S.ia,
      },
    ],
    euPosition: [
      {
        value: 'The EU "holds technological leadership in this segment, but … does not yet produce at Giga scale"',
        note: 'Draghi, Part B Ch. 5 — the one mass-manufactured clean tech where the EU still leads on IP',
        source: S.draghi,
      },
      {
        value: 'China holds ~60% of global electrolyser manufacturing capacity; Europe >25% of announced 2030 capacity',
        source: S.ieaElectrolysers,
      },
    ],
  },

  /* ------------------------------------------------------------ heat pumps */
  {
    id: 'heatpumps',
    name: 'Heat pumps',
    color: '#FF9933',
    icon: '♨️',
    nace: ['28.25', '27.51'],
    naceNote:
      'Indicative mapping: non-domestic cooling & ventilation equipment (28.25) and domestic appliances (27.51); compressors under 28.13.',
    what: 'Air- and ground-source heat pumps, domestic to industrial scale — the electrification appliance for heat.',
    supports: [
      {
        sectorId: 'buildings',
        role: 'primary',
        note: 'The IA\'s modelled 77–85% buildings cut is "driven by a sustained deployment of heat pumps and renovation of building envelopes".',
        source: S.ia,
      },
      {
        sectorId: 'industry',
        role: 'supporting',
        note: 'Industrial heat pumps electrify low- and medium-temperature process heat — the cross-cutting lever behind the food, paper and chemicals routes on Side 1.',
        source: S.lbnlHeatPump,
      },
      {
        sectorId: 'agriculture',
        role: 'supporting',
        note: 'Heat pumps supply the low-temperature heat of greenhouses, drying and dairy processes as electricity displaces fuels across final demand.',
        source: S.ia,
      },
    ],
    mitigation: [
      {
        value: 'Heat pumps deployed 2019–2024 avoid ~65 MtCO₂/yr globally',
        note: 'one of the five technologies jointly avoiding ~2.6 Gt/yr (~7% of energy CO₂)',
        source: S.ieaGer,
      },
    ],
    scenarioDeployment: [
      {
        value: 'Residential electricity demand rises 23–25% over 2021–2040 on heat-pump uptake',
        note: 'IA: heat pumps replacing oil- and gas-based heating; ~3 million units installed in the EU in 2022 (EHPA, cited by the IA)',
        source: S.ia,
      },
      {
        value: 'REPowerEU goal: 10 million additional heat pumps by 2027, ~30 million by 2030',
        source: S.ehpaRepower,
      },
      {
        value: '2024–25 sales are running well below that pace',
        note: 'EU heat-pump sales fell ~23% in 2024 (~2.1M units, back to pre-war levels) and only partly recovered in 2025 (~2.3M) — the policy-demand momentum behind the 30-million-by-2030 goal is not yet materialising',
        source: S.heatpumpSalesDrop,
      },
    ],
    euPosition: [
      {
        value: 'EU industry delivers 60–70% of domestic heat-pump demand',
        note: 'but the EU turned net importer in recent years; a large share of compressors and of air-to-air units is imported',
        source: S.draghi,
      },
      {
        value: '80–90% of monobloc air-to-water heat pumps installed in Europe are assembled in Europe',
        note: 'vs ~5–10% in China — the defendable core of the product mix',
        source: S.ehpaMade,
      },
    ],
  },
];

/* ----------------------------------------------------- scenario pathways */

export interface PathwayPoint {
  /** Bar label, e.g. "S1" (lower bound) / "S3" (upper bound), both 2040. */
  label: string;
  /** Modelled reduction vs the pathway's base year, as a positive %. */
  pct: number;
}

export interface SectorPathway {
  sectorId: DemandSectorId;
  baseYear: string;
  /** Scenario the points come from. */
  scenario: string;
  points: PathwayPoint[];
  note?: string;
  source: Source;
  /** CleanTechIndustry ids that deliver the modelled cut in this sector. */
  drivenBy: string[];
}

/**
 * Sectoral reductions in 2040 vs 2015 as modelled in the Commission's
 * 2040-target impact assessment (SWD(2024) 63, section 6.1.1 + Table 5,
 * PRIMES/GAINS). Each sector shows the S1 (lower) and S3 (upper) bound of
 * the IA's own stated range; the drivers are the technologies the IA text
 * names for that sector's cut.
 */
export const SECTOR_PATHWAYS: SectorPathway[] = [
  {
    sectorId: 'power',
    baseYear: '2015',
    scenario: 'EC 2040 impact assessment, S1–S3 (2040)',
    points: [
      { label: 'S1', pct: 88 },
      { label: 'S3', pct: 100 },
    ],
    note:
      'S1 derived from IA Table 5 (power & district heating 1,031 → 120 Mt CO₂-eq); the IA text: emissions "get close to zero in S2 … and reach zero in S3" (net −10 Mt with bio-CCS).',
    source: S.ia,
    drivenBy: ['solar', 'wind', 'batteries'],
  },
  {
    sectorId: 'transport',
    baseYear: '2015',
    scenario: 'EC 2040 impact assessment, S1–S3 (2040)',
    points: [
      { label: 'S1', pct: 69 },
      { label: 'S3', pct: 78 },
    ],
    note:
      'IA: "Transport emissions drop by 69-78% compared to 2015, primarily due to large-scale deployment of electric vehicles in road transport."',
    source: S.ia,
    drivenBy: ['ev', 'batteries', 'electrolysers'],
  },
  {
    sectorId: 'buildings',
    baseYear: '2015',
    scenario: 'EC 2040 impact assessment, S1–S3 (2040)',
    points: [
      { label: 'S1', pct: 77 },
      { label: 'S3', pct: 85 },
    ],
    note:
      'IA: "Residential and service emissions decrease by 77-85% compared to 2015 … driven by a sustained deployment of heat pumps and renovation of building envelopes."',
    source: S.ia,
    drivenBy: ['heatpumps', 'solar'],
  },
  {
    sectorId: 'industry',
    baseYear: '2015',
    scenario: 'EC 2040 impact assessment, S1–S3 (2040)',
    points: [
      { label: 'S1', pct: 56 },
      { label: 'S3', pct: 84 },
    ],
    note:
      'IA: "Emissions in industry are cut by 56-84% compared to 2015, due to electrification, implementation of new manufacturing technologies … use of alternative materials or sources such as RFNBOs." This is Side 1 seen from the modelling side.',
    source: S.ia,
    drivenBy: ['electrolysers', 'heatpumps', 'wind', 'solar'],
  },
  {
    sectorId: 'agriculture',
    baseYear: '2015',
    scenario: 'EC 2040 impact assessment, S1–S3 (2040)',
    points: [
      { label: 'S1', pct: 10 },
      { label: 'S3', pct: 30 },
    ],
    note:
      'IA: agriculture GHG "decrease[s] by around 10% compared to 2015 in S1 and by between 22% and 30% in S2 and S3" — mostly non-CO₂ (CH₄/N₂O), the sector these six industries reach least; their entry points are fertiliser (green ammonia) and energy inputs.',
    source: S.ia,
    drivenBy: ['electrolysers', 'ev', 'heatpumps'],
  },
];

/* ------------------------------------------------------------- headlines */

/** Sourced headline facts for the top of Side 2. */
export const EXTERNAL_HEADLINES: Sourced[] = [
  {
    value: '−90% net GHG by 2040 — legally binding',
    note:
      'set by the amended European Climate Law (Regulation (EU) 2026/667, in force since 7 April 2026): a flat 90% cut vs 1990, with at least 85% achieved domestically and up to 5% international credits permitted from 2036 — the economy-wide envelope every sector below fits into',
    source: S.climateLaw2040,
  },
  {
    value: '90–95% net GHG by 2040 (2024 impact-assessment range)',
    note:
      'dated 2024 analytical context, not current law: the preferred option of the Commission\'s 2040-target impact assessment (vs 1990), in line with the ESABCC\'s 2024 advice — this range fed into, and was since narrowed by, the legally binding 90% target above',
    source: S.iaExec,
  },
  {
    value: '~2.6 Gt CO₂/yr already avoided',
    note: 'solar PV, wind, nuclear, electric cars and heat pumps deployed 2019–2024 now prevent ~7% of global energy CO₂ every year — in the EU, >10% of 2024 energy emissions',
    source: S.ieaGer,
  },
  {
    value: 'Clean-tech market > USD 2 trillion by 2035',
    note: 'the six mass-manufactured technologies (solar PV, wind, EVs, batteries, electrolysers, heat pumps) triple from ~USD 700 bn (2023) — the competitiveness stake',
    source: S.ieaEtp24,
  },
  {
    value: 'NZIA: ≥40% by 2030 · 15% of world production by 2040',
    note: 'the EU\'s own manufacturing benchmarks for strategic net-zero technologies — the policy yardstick for the EU-position column below',
    source: S.nzia,
  },
];

export const PATHWAY_CAVEAT =
  'Scenario figures are model results, not observations: they come from the impact assessment underpinning the ' +
  'Commission\'s 2040 recommendation (SWD(2024) 63, PRIMES/GAINS modelling) and are assumption-dependent ' +
  '(technology costs, behaviour, carbon removals). Sectoral definitions follow the modelling framework, so they do ' +
  'not align one-to-one with the EU ETS scopes used on Side 1. Bars show the S1 (lower) and S3 (upper) bounds of ' +
  'the IA\'s stated 2040 range per sector. Read each bar as "as modelled by the source", not a settled number.';

/* ------------------------------------------------- editorial priority read */

/**
 * EDITORIAL overlay (like the clean/old classification on Side 1): a ranked
 * read of where mitigation leverage and EU competitiveness meet. NOT a
 * sourced datum — flagged as a MethodHub judgement in the UI and the export.
 */
export interface ExternalPriority {
  techId: string;
  rank: number;
  /** Why this industry ranks where it does on mitigation leverage. */
  rationale: string;
  /** The competitiveness read: where the EU can realistically build strength. */
  competitiveness: string;
}

export const EXTERNAL_PRIORITY_NOTE =
  'This ranking is an analytical judgement by MethodHub, layered on the sourced data above — not an external ' +
  'taxonomy. It weighs two things: (1) mitigation leverage — how much of the modelled economy-wide cut to 2040 the ' +
  'industry\'s products deliver, and how many sectors they serve; (2) competitive defensibility — whether the EU has ' +
  'a manufacturing base worth defending or a realistic path to build one, versus deploying imports. It is a ' +
  'prioritisation for POLICY ATTENTION, not a verdict on which technology matters most for the climate: solar ranks ' +
  'last here precisely because its climate value is best captured by deploying imports fast, not by reshoring the chain.';

export const EXTERNAL_PRIORITIES: ExternalPriority[] = [
  {
    techId: 'wind',
    rank: 1,
    rationale:
      'Delivers the keystone sector: wind is one of the two pillars taking power to zero by 2040 in the modelling, and every downstream electrification lever inherits that cut. Already avoids ~900 Mt CO₂/yr globally.',
    competitiveness:
      'The strongest defend-and-scale case: the EU still supplies ~85–92% of its own market and exports — but the 58%→30% global-share slide shows the position erodes without lead markets, grid build-out and auction volumes that reward European supply-chain resilience.',
  },
  {
    techId: 'heatpumps',
    rank: 2,
    rationale:
      'The single named driver of the modelled 77–85% buildings cut — the sector where EU emissions meet citizens most directly — plus the industrial low-temperature heat lever on Side 1.',
    competitiveness:
      'A defendable home market: 60–70% of demand is met domestically and 80–90% of air-to-water monoblocs are assembled in Europe. The risk is the compressor and air-to-air import gap; the play is standardisation, installer capacity and stable demand policy rather than reshoring everything.',
  },
  {
    techId: 'electrolysers',
    rank: 3,
    rationale:
      'The unlock for the hardest tonnes: 60–100 Mtoe of modelled 2040 hydrogen feeds the Side-1 subsectors (steel, ammonia, chemicals), e-fuels for transport, and green-ammonia fertiliser for agriculture — three sectors through one machine.',
    competitiveness:
      'The one segment where the EU still holds technological leadership but no Giga-scale production while China already holds ~60% of capacity: the clearest build-now case — scale the pipeline (~25% of announced 2030 capacity is European) before the leadership depreciates.',
  },
  {
    techId: 'batteries',
    rank: 4,
    rationale:
      'The enabling component of the largest modelled demand-side shift (57–58% BEV stock by 2040) and of storage in an 85%-renewable power system — leverage across two sectors.',
    competitiveness:
      'A resilience play more than a leadership play: 6.5% of global cell production, ~90% of upstream anode/cathode capacity in Asia-Pacific, imports up 7.5×. Priority is de-risking (cells + selected upstream steps) to keep the EV transition and the automotive base from full import dependence.',
  },
  {
    techId: 'ev',
    rank: 5,
    rationale:
      'Carries the transport cut (69–78% by 2040) — but the mitigation leverage sits in the vehicle-battery-power system, and the vehicle layer is the one the EU already mass-produces.',
    competitiveness:
      'Convert incumbent strength: the EU is the world\'s second-largest EV market (17–25% of global sales) with a full automotive industrial base — the question is conversion speed of that base, not market access. Losing the transition here would turn a Side-2 opportunity into a Side-1-style legacy problem.',
  },
  {
    techId: 'solar',
    rank: 6,
    rationale:
      'The largest global mitigation option (2.0–7.0 Gt/yr by 2030) and the largest realised avoided emissions (~1.4 Gt/yr) — maximum climate leverage, fastest deployment.',
    competitiveness:
      'Deploy-first, defend-niches: with a negligible EU manufacturing position and 98% of imports from China, the climate value lies in rapid deployment of cheap modules, while industrial policy concentrates on the defensible niches (inverters, polysilicon, integration services) and on diversification rather than full-chain reshoring.',
  },
];
