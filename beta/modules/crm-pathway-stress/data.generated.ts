/**
 * Critical Raw Materials × 2040 Pathway Stress Test (beta module M · 48) —
 * compiled data records.
 *
 * AI-COMPILED — PENDING SECRETARIAT VERIFICATION. Compiled 2026-08 from
 * model knowledge of the public sources named on each record; no live pull
 * was possible from this environment (Eurostat/EEA/EUR-Lex hosts are
 * blocked from the sandbox). Every figure below must be re-checked against
 * its named source before any use beyond internal method discussion.
 *
 * PROVENANCE AND COMPILATION RULES
 *
 *   · Material-intensity coefficients are RANGES, spanning the published
 *     spread across chemistries, turbine drive-trains and vintages. They
 *     vary by a factor of 2–3 across sources (the reason this module is
 *     beta); the range endpoints are kept and never averaged. Principal
 *     sources: JRC foresight study (Carrara et al. 2023, "Supply chain
 *     analysis and material demand forecast in strategic technologies and
 *     sectors in the EU", EUR 31437 EN), the SCRREEN 2023 CRM factsheets
 *     behind the EC criticality assessment, IEA "The Role of Critical
 *     Minerals in Clean Energy Transitions" (2021, material-intensity
 *     annex) and the IEA Global Critical Minerals Outlook (2024/2025).
 *   · Deployment rates are stylised ANNUALISED additions consistent with
 *     the advised −90 % 2040 pathway (ESABCC 2040 advice; Commission 2040
 *     Target impact assessment SWD(2024) 63; EU 2040 Climate Target
 *     Regulation), rounded to round numbers — they are the demand-side
 *     lever of the model, not a scenario extraction with locators, and are
 *     labelled as such in the UI.
 *   · Current EU shares (extraction / processing / recycling, % of EU
 *     annual consumption) and top-supplier shares follow the EC/JRC RMIS
 *     material profiles, the SCRREEN factsheets, the Eurostat CRM trade
 *     article and the IEA PV supply-chain report. Values the compiler
 *     could not pin to a specific published table carry `uncertain: true`
 *     and are rendered with "≈" and an explicit flag — uncertain values
 *     are flagged, never silently dropped or asserted.
 *   · CRMA benchmark levels (10 % extraction, 40 % processing, 25 %
 *     recycling, ≤ 65 % single-third-country share, by 2030) are from
 *     Regulation (EU) 2024/1252, Article 5(1), points (a) and (b)
 *     (CELEX 32024R1252). The quoted fragments ("at least 10 %", "at
 *     least 40 %", "at least 25 %", "not more than 65 %") are the only
 *     verbatim text carried; everything else is paraphrase with locator.
 *   · Coverage gaps accepted rather than filled: grid-network copper
 *     (transmission/distribution build-out), heat pumps, platinum-group
 *     metals for electrolysers, and steel-route manganese are all OUT of
 *     the demand model — listed in the UI caveats.
 */

/* ---------------------------------------------------------------- types */

export type SourceRef = {
  label: string;
  url: string;
  /** Page / table / article locator where the compiler is confident; otherwise the section concept. */
  locator?: string;
};

export type Range = { lo: number; hi: number };

export type TechKey =
  | 'solarPV'
  | 'windOnshore'
  | 'windOffshore'
  | 'evBattery'
  | 'gridStorage'
  | 'electrolyser';

export type TechDeployment = {
  key: TechKey;
  label: string;
  unit: 'GW/yr' | 'GWh/yr';
  /** Stylised annualised EU-27 additions around 2030 / 2040, advised (−90 %) pathway. */
  rate2030: number;
  rate2040: number;
  note: string;
  source: SourceRef;
};

export type IntensityCoefficient = {
  tech: TechKey;
  /** t/MW for GW-denominated technologies; t/GWh for GWh-denominated ones. */
  range: Range;
  unit: 't/MW' | 't/GWh';
  /** What the lo–hi spread physically spans. */
  basis: string;
  source: SourceRef;
  /** Compiler's confidence in the RANGE (not in any midpoint). */
  confidence: 'medium' | 'low';
};

export type Material = {
  id: string;
  name: string;
  /** Listed as a strategic raw material in CRMA Annex I, Section 1. */
  crmaStrategic: boolean;
  usedFor: string;
  coefficients: IntensityCoefficient[];
  /** Current EU shares, % of EU annual consumption; null = not meaningfully tracked at this stage. */
  shares: {
    extraction: number | null;
    processing: number | null;
    recycling: number | null;
    uncertain: boolean;
    note: string;
    source: SourceRef;
  };
  topSupplier: {
    name: string;
    /** The supply-chain stage at which the concentration bites. */
    stage: string;
    sharePct: number;
    /** Basis of the compiled share — the model converts explicitly (see model.ts). */
    shareBasis: 'eu-supply' | 'eu-imports' | 'global-supply';
    uncertain: boolean;
    note: string;
    source: SourceRef;
  };
};

/* -------------------------------------------------------------- sources */

const JRC_FORESIGHT: SourceRef = {
  label: 'JRC (Carrara et al. 2023) — Supply chain analysis and material demand forecast in strategic technologies and sectors in the EU, EUR 31437 EN',
  url: 'https://publications.jrc.ec.europa.eu/repository/handle/JRC132889',
  locator: 'per-technology material-intensity assumptions and demand scenarios',
};

const IEA_MINERALS_2021: SourceRef = {
  label: 'IEA (2021) — The Role of Critical Minerals in Clean Energy Transitions',
  url: 'https://www.iea.org/reports/the-role-of-critical-minerals-in-clean-energy-transitions',
  locator: 'material-intensity assumptions annex (kg/MW, kg/vehicle by technology)',
};

const IEA_CM_OUTLOOK: SourceRef = {
  label: 'IEA — Global Critical Minerals Outlook 2025',
  url: 'https://www.iea.org/reports/global-critical-minerals-outlook-2025',
  locator: 'supply concentration and refining-share tables',
};

const IEA_PV_SUPPLY: SourceRef = {
  label: 'IEA (2022) — Special Report on Solar PV Global Supply Chains',
  url: 'https://www.iea.org/reports/solar-pv-global-supply-chains',
  locator: 'polysilicon/wafer capacity shares by country',
};

const SCRREEN: SourceRef = {
  label: 'SCRREEN2 (2023) — CRM factsheets underpinning the EC criticality assessment',
  url: 'https://scrreen.eu/crms-2023/',
  locator: 'per-material factsheet: EU supply, end-of-life recycling input rate',
};

const RMIS: SourceRef = {
  label: 'EC/JRC — Raw Materials Information System (RMIS), material profiles',
  url: 'https://rmis.jrc.ec.europa.eu/',
  locator: 'per-material profile: EU sourcing and import reliance',
};

const EUROSTAT_CRM_TRADE: SourceRef = {
  label: 'Eurostat Statistics Explained — International trade in critical raw materials',
  url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=International_trade_in_critical_raw_materials',
  locator: 'EU import partner shares by material',
};

export const CRMA: SourceRef = {
  label: 'Regulation (EU) 2024/1252 (Critical Raw Materials Act)',
  url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1252',
  locator: 'Article 5(1), points (a)(i)–(iii) and (b); Annex I Section 1 (strategic raw materials)',
};

export const BATTERIES_REG: SourceRef = {
  label: 'Regulation (EU) 2023/1542 (Batteries Regulation) — recovery and recycled-content targets',
  url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1542',
  locator: 'Annex XII Part B (material-recovery targets: lithium 50 % by 2027, 80 % by 2031; cobalt/copper/nickel 90 %/95 %)',
};

const IA_2040: SourceRef = {
  label: 'European Commission — Impact assessment for the 2040 climate target, SWD(2024) 63',
  url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52024SC0063',
  locator: 'S3 (−90 %) scenario: power-sector capacity and transport-electrification trajectories',
};

const ESABCC_2040: SourceRef = {
  label: 'ESABCC (2023) — Scientific advice for the determination of an EU-wide 2040 climate target',
  url: 'https://climate-advisory-board.europa.eu/reports-and-publications/scientific-advice-for-the-determination-of-an-eu-wide-2040',
  locator: '90–95 % reduction range; iterated scenario envelope',
};

const WINDEUROPE: SourceRef = {
  label: 'WindEurope — Wind energy in Europe: 2024 statistics and outlook 2025–2030',
  url: 'https://windeurope.org/intelligence-platform/product/wind-energy-in-europe-2024-statistics-and-the-outlook-for-2025-2030/',
  locator: 'required annual additions vs the 2030 target',
};

const SPE_OUTLOOK: SourceRef = {
  label: 'SolarPower Europe — EU Market Outlook for Solar Power 2024–2028',
  url: 'https://www.solarpowereurope.org/insights/outlooks/eu-market-outlook-for-solar-power-2024-2028',
  locator: 'annual EU installation scenarios',
};

/** Sources used in the UI closing panel, deduplicated. */
export const ALL_SOURCES: SourceRef[] = [
  CRMA,
  BATTERIES_REG,
  JRC_FORESIGHT,
  IEA_MINERALS_2021,
  IEA_CM_OUTLOOK,
  IEA_PV_SUPPLY,
  SCRREEN,
  RMIS,
  EUROSTAT_CRM_TRADE,
  IA_2040,
  ESABCC_2040,
  WINDEUROPE,
  SPE_OUTLOOK,
];

/* ------------------------------------------------- CRMA benchmark cards */

export type CrmaBenchmark = {
  key: 'extraction' | 'processing' | 'recycling' | 'singleSupplier';
  title: string;
  /** Verbatim fragment from Art. 5(1) — kept short so it is checkable as a substring. */
  quotedFragment: string;
  paraphrase: string;
  targetPct: number;
  locator: string;
};

export const CRMA_BENCHMARKS: CrmaBenchmark[] = [
  {
    key: 'extraction',
    title: 'EU extraction',
    quotedFragment: 'at least 10 %',
    paraphrase:
      'Union extraction capacity able to extract the ores, minerals or concentrates needed to produce at least 10 % of the Union’s annual consumption of strategic raw materials, by 2030.',
    targetPct: 10,
    locator: 'Art. 5(1)(a)(i)',
  },
  {
    key: 'processing',
    title: 'EU processing',
    quotedFragment: 'at least 40 %',
    paraphrase:
      'Union processing capacity able to produce at least 40 % of the Union’s annual consumption of strategic raw materials, by 2030.',
    targetPct: 40,
    locator: 'Art. 5(1)(a)(ii)',
  },
  {
    key: 'recycling',
    title: 'EU recycling',
    quotedFragment: 'at least 25 %',
    paraphrase:
      'Union recycling capacity able to produce at least 25 % of the Union’s annual consumption of strategic raw materials, by 2030.',
    targetPct: 25,
    locator: 'Art. 5(1)(a)(iii)',
  },
  {
    key: 'singleSupplier',
    title: 'Single-supplier cap',
    quotedFragment: 'not more than 65 %',
    paraphrase:
      'Not more than 65 % of the Union’s annual consumption of each strategic raw material, at any relevant stage of processing, from a single third country, by 2030.',
    targetPct: 65,
    locator: 'Art. 5(1)(b)',
  },
];

/* ----------------------------------------------------- deployment rates */

export const TECH_DEPLOYMENT: TechDeployment[] = [
  {
    key: 'solarPV',
    label: 'Solar PV',
    unit: 'GW/yr',
    rate2030: 60,
    rate2040: 80,
    note: 'Stylised additions consistent with ≈750 GWdc installed by 2030 (REPowerEU order of magnitude) rising towards the −90 % pathway’s power-sector build-out.',
    source: SPE_OUTLOOK,
  },
  {
    key: 'windOnshore',
    label: 'Wind — onshore',
    unit: 'GW/yr',
    rate2030: 24,
    rate2040: 26,
    note: 'WindEurope puts required total wind additions near 30 GW/yr for the 2030 target; onshore carries most of it.',
    source: WINDEUROPE,
  },
  {
    key: 'windOffshore',
    label: 'Wind — offshore',
    unit: 'GW/yr',
    rate2030: 6,
    rate2040: 12,
    note: 'Ramp towards the offshore strategy’s mid-century volumes; the NdPr-intensive leg of wind.',
    source: WINDEUROPE,
  },
  {
    key: 'evBattery',
    label: 'EV batteries',
    unit: 'GWh/yr',
    rate2030: 800,
    rate2040: 1200,
    note: 'EU battery demand around 2030 estimated at 700–1,000 GWh/yr across public outlooks; 2040 reflects 100 % ZEV sales from 2035 and fleet turnover.',
    source: JRC_FORESIGHT,
  },
  {
    key: 'gridStorage',
    label: 'Grid-scale storage',
    unit: 'GWh/yr',
    rate2030: 40,
    rate2040: 120,
    note: 'Stationary battery additions supporting the pathway’s renewables share; LFP-dominant chemistry assumed in the coefficient ranges.',
    source: IA_2040,
  },
  {
    key: 'electrolyser',
    label: 'Electrolysers',
    unit: 'GW/yr',
    rate2030: 8,
    rate2040: 15,
    note: 'Annualised rate consistent with the 2030 renewable-hydrogen ambition and the pathway’s industrial-hydrogen leg. Nickel enters via alkaline stacks.',
    source: IA_2040,
  },
];

/* ------------------------------------------------------------ materials */

export const MATERIALS: Material[] = [
  {
    id: 'lithium',
    name: 'Lithium',
    crmaStrategic: true,
    usedFor: 'EV and grid-storage batteries (all current Li-ion chemistries)',
    coefficients: [
      {
        tech: 'evBattery',
        range: { lo: 90, hi: 170 },
        unit: 't/GWh',
        basis: 'Lithium metal content, ≈0.5–0.9 kg LCE per kWh across LFP → high-nickel NMC chemistries (LCE ÷ 5.32 to metal).',
        source: IEA_MINERALS_2021,
        confidence: 'low',
      },
      {
        tech: 'gridStorage',
        range: { lo: 80, hi: 130 },
        unit: 't/GWh',
        basis: 'LFP-dominant stationary chemistry — lower bound of the Li-ion band.',
        source: JRC_FORESIGHT,
        confidence: 'low',
      },
    ],
    shares: {
      extraction: 0,
      processing: 3,
      recycling: 2,
      uncertain: true,
      note: 'EU mine output ≈0 % of consumption (Portugal <1 %); first EU refining capacity is ramping; closed-loop battery recycling not yet at scale. Processing and recycling shares are order-of-magnitude.',
      source: RMIS,
    },
    topSupplier: {
      name: 'Chile',
      stage: 'refined lithium carbonate imports',
      sharePct: 70,
      shareBasis: 'eu-imports',
      uncertain: false,
      note: '≈70 % of EU lithium carbonate imports; battery-grade hydroxide refining is separately concentrated in China — a second choke point not captured by this single figure.',
      source: EUROSTAT_CRM_TRADE,
    },
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    crmaStrategic: true,
    usedFor: 'NMC/NCA battery cathodes; superalloys (out of model scope)',
    coefficients: [
      {
        tech: 'evBattery',
        range: { lo: 30, hi: 120 },
        unit: 't/GWh',
        basis: 'Fleet-mix dependent: NMC811 ≈0.09 kg/kWh, older NMC622 higher, LFP zero — the range spans plausible 2030s EU chemistry mixes.',
        source: IEA_MINERALS_2021,
        confidence: 'low',
      },
      {
        tech: 'gridStorage',
        range: { lo: 0, hi: 20 },
        unit: 't/GWh',
        basis: 'Mostly LFP (zero cobalt); upper bound admits a residual NMC share.',
        source: JRC_FORESIGHT,
        confidence: 'medium',
      },
    ],
    shares: {
      extraction: 1,
      processing: 15,
      recycling: 22,
      uncertain: true,
      note: 'Finland mines and refines (Kokkola); end-of-life recycling input rate ≈22 % per the criticality assessment. Processing share of EU consumption is order-of-magnitude.',
      source: SCRREEN,
    },
    topSupplier: {
      name: 'DR Congo',
      stage: 'mined supply (global share, proxy for import exposure)',
      sharePct: 63,
      shareBasis: 'global-supply',
      uncertain: true,
      note: '≈63 % of global mine supply; ≈60–75 % of refining sits in China — the exposure has two distinct geographies and this figure carries only the first.',
      source: IEA_CM_OUTLOOK,
    },
  },
  {
    id: 'nickel',
    name: 'Nickel (class 1)',
    crmaStrategic: true,
    usedFor: 'High-nickel battery cathodes; alkaline electrolyser stacks',
    coefficients: [
      {
        tech: 'evBattery',
        range: { lo: 300, hi: 800 },
        unit: 't/GWh',
        basis: 'NMC811 ≈0.75 kg/kWh at the top; LFP share pulls the fleet average down — range spans the chemistry mix.',
        source: IEA_MINERALS_2021,
        confidence: 'medium',
      },
      {
        tech: 'gridStorage',
        range: { lo: 0, hi: 100 },
        unit: 't/GWh',
        basis: 'LFP-dominant; upper bound admits residual nickel chemistries.',
        source: JRC_FORESIGHT,
        confidence: 'medium',
      },
      {
        tech: 'electrolyser',
        range: { lo: 0.2, hi: 1.0 },
        unit: 't/MW',
        basis: 'Alkaline stacks ≈0.8–1 t/MW; PEM near zero — range spans the technology mix.',
        source: JRC_FORESIGHT,
        confidence: 'low',
      },
    ],
    shares: {
      extraction: 4,
      processing: 10,
      recycling: 16,
      uncertain: true,
      note: 'Finland and Greece mine; end-of-life recycling input rate ≈16 %. Battery-grade (class 1) shares are lower than whole-nickel shares — figures are order-of-magnitude.',
      source: SCRREEN,
    },
    topSupplier: {
      name: 'Indonesia',
      stage: 'mined supply (global share, proxy for import exposure)',
      sharePct: 55,
      shareBasis: 'global-supply',
      uncertain: true,
      note: '≈55 % of global mine supply and rising, with Chinese-owned processing dominating conversion to class 1 — again a two-geography exposure.',
      source: IEA_CM_OUTLOOK,
    },
  },
  {
    id: 'graphite',
    name: 'Graphite (battery-grade)',
    crmaStrategic: true,
    usedFor: 'Li-ion anodes (natural + synthetic; every chemistry needs it)',
    coefficients: [
      {
        tech: 'evBattery',
        range: { lo: 900, hi: 1200 },
        unit: 't/GWh',
        basis: '≈0.9–1.2 kg/kWh of anode graphite regardless of cathode chemistry; natural vs synthetic split varies by maker.',
        source: JRC_FORESIGHT,
        confidence: 'medium',
      },
      {
        tech: 'gridStorage',
        range: { lo: 900, hi: 1200 },
        unit: 't/GWh',
        basis: 'Same anode requirement as EV cells.',
        source: JRC_FORESIGHT,
        confidence: 'medium',
      },
    ],
    shares: {
      extraction: 0,
      processing: 1,
      recycling: 1,
      uncertain: true,
      note: 'No EU natural-graphite mining at scale; spherical/coated anode-grade processing essentially absent from the EU. Anode-material recycling is pre-commercial.',
      source: RMIS,
    },
    topSupplier: {
      name: 'China',
      stage: 'anode-grade (spherical/coated) processing',
      sharePct: 90,
      shareBasis: 'eu-supply',
      uncertain: true,
      note: 'China is ≈43 % of EU raw natural-graphite imports but ≈90 %+ of battery-grade anode material — the stress sits at the processing stage, and the 90 % figure is the compiler’s reading of the IEA/RMIS assessments.',
      source: IEA_CM_OUTLOOK,
    },
  },
  {
    id: 'ndpr',
    name: 'Rare earths (NdPr)',
    crmaStrategic: true,
    usedFor: 'NdFeB permanent magnets — offshore wind direct-drive generators, EV traction motors',
    coefficients: [
      {
        tech: 'windOnshore',
        range: { lo: 0.02, hi: 0.06 },
        unit: 't/MW',
        basis: 'Fleet mix of gearbox (low-magnet) and permanent-magnet onshore drive-trains, 20–60 kg NdPr/MW.',
        source: JRC_FORESIGHT,
        confidence: 'low',
      },
      {
        tech: 'windOffshore',
        range: { lo: 0.15, hi: 0.2 },
        unit: 't/MW',
        basis: 'Direct-drive PMSG dominant offshore: ≈150–200 kg NdPr/MW (≈650 kg NdFeB magnet/MW × ≈29 % Nd content).',
        source: JRC_FORESIGHT,
        confidence: 'low',
      },
      {
        tech: 'evBattery',
        range: { lo: 10, hi: 20 },
        unit: 't/GWh',
        basis: 'PROXY: ≈0.6–1.2 kg NdPr per PM traction motor, converted through ≈60 kWh per vehicle pack — a vehicle-linked coefficient routed through battery-GWh for model simplicity; stated in the UI.',
        source: IEA_MINERALS_2021,
        confidence: 'low',
      },
    ],
    shares: {
      extraction: 0,
      processing: 1,
      recycling: 1,
      uncertain: false,
      note: 'No EU mining; separation capacity marginal (Estonia); magnet-to-magnet recycling pre-commercial. The near-zero shares are well documented even if the exact decimals are not.',
      source: RMIS,
    },
    topSupplier: {
      name: 'China',
      stage: 'separated oxides and NdFeB magnets',
      sharePct: 98,
      shareBasis: 'eu-supply',
      uncertain: false,
      note: '≈98–100 % of EU rare-earth supply overall; ≈94 % of global magnet production. The single most concentrated dependency in the set.',
      source: RMIS,
    },
  },
  {
    id: 'copper',
    name: 'Copper',
    crmaStrategic: true,
    usedFor: 'Everything electric: PV, wind, EVs — grid build-out excluded (coverage gap)',
    coefficients: [
      {
        tech: 'solarPV',
        range: { lo: 2.8, hi: 5.0 },
        unit: 't/MW',
        basis: 'Utility-scale ≈2.8 t/MW (IEA) up to ≈5 t/MW in older / distributed estimates.',
        source: IEA_MINERALS_2021,
        confidence: 'medium',
      },
      {
        tech: 'windOnshore',
        range: { lo: 2.9, hi: 4.7 },
        unit: 't/MW',
        basis: 'Turbine plus array cabling, onshore.',
        source: IEA_MINERALS_2021,
        confidence: 'medium',
      },
      {
        tech: 'windOffshore',
        range: { lo: 8.0, hi: 9.6 },
        unit: 't/MW',
        basis: 'Includes export and array cabling — the copper-heavy leg of wind.',
        source: IEA_MINERALS_2021,
        confidence: 'medium',
      },
      {
        tech: 'evBattery',
        range: { lo: 900, hi: 1300 },
        unit: 't/GWh',
        basis: 'PROXY: ≈55–80 kg copper per EV (vs ≈20 kg ICE), converted through ≈60 kWh per pack — vehicle-linked, routed through battery-GWh; stated in the UI.',
        source: IEA_MINERALS_2021,
        confidence: 'low',
      },
    ],
    shares: {
      extraction: 19,
      processing: 60,
      recycling: 50,
      uncertain: true,
      note: 'EU mines ≈0.8 Mt/yr against ≈4 Mt refined use (Poland, Bulgaria, Spain); refined output and a ≈50 % recycling input rate mean copper already clears all three CRMA benchmarks — the even-handed counter-example in this set. Shares are order-of-magnitude.',
      source: SCRREEN,
    },
    topSupplier: {
      name: 'Chile',
      stage: 'ore and concentrate imports',
      sharePct: 35,
      shareBasis: 'eu-imports',
      uncertain: true,
      note: 'Largest single origin of EU concentrate imports at roughly a third; no supplier is near the 65 % cap.',
      source: EUROSTAT_CRM_TRADE,
    },
  },
  {
    id: 'silicon',
    name: 'Silicon (polysilicon/wafers)',
    crmaStrategic: true,
    usedFor: 'Solar PV cells (solar-grade polysilicon → ingots → wafers)',
    coefficients: [
      {
        tech: 'solarPV',
        range: { lo: 2.3, hi: 5.0 },
        unit: 't/MW',
        basis: 'Modern modules ≈2.3 t polysilicon/MW; older vintages up to ≈5 t/MW — the range is the thrifting story to date.',
        source: IEA_PV_SUPPLY,
        confidence: 'medium',
      },
    ],
    shares: {
      extraction: null,
      processing: 15,
      recycling: 0,
      uncertain: true,
      note: 'Extraction (quartz) is not the constraint and is not tracked here (n/a). EU silicon-metal and polysilicon capacity (incl. Wacker) supplies an order-of-magnitude ≈15 % of consumption; solar-grade wafer capacity in the EU is ≈0. No commercial PV-silicon recycling.',
      source: IEA_PV_SUPPLY,
    },
    topSupplier: {
      name: 'China',
      stage: 'solar-grade wafers (global share, proxy for import exposure)',
      sharePct: 97,
      shareBasis: 'global-supply',
      uncertain: false,
      note: '≈97 % of global wafer capacity — the tightest stage of the PV chain; polysilicon ≈79–89 % depending on year.',
      source: IEA_PV_SUPPLY,
    },
  },
  {
    id: 'manganese',
    name: 'Manganese (battery-grade)',
    crmaStrategic: true,
    usedFor: 'NMC cathodes; LMFP next; steel route excluded (coverage gap)',
    coefficients: [
      {
        tech: 'evBattery',
        range: { lo: 50, hi: 200 },
        unit: 't/GWh',
        basis: 'NMC ≈0.15–0.2 kg/kWh, LFP zero, LMFP would raise the floor — range spans the chemistry mix.',
        source: JRC_FORESIGHT,
        confidence: 'low',
      },
      {
        tech: 'gridStorage',
        range: { lo: 0, hi: 150 },
        unit: 't/GWh',
        basis: 'Near zero while LFP dominates; upper bound admits LMFP adoption.',
        source: JRC_FORESIGHT,
        confidence: 'low',
      },
    ],
    shares: {
      extraction: 1,
      processing: 2,
      recycling: 5,
      uncertain: true,
      note: 'Battery-grade focus: EU high-purity manganese sulphate (HPMSM) capacity ≈0; battery-loop recycling negligible. Steel-route manganese (where EU recycling is substantial) is deliberately out of scope.',
      source: RMIS,
    },
    topSupplier: {
      name: 'China',
      stage: 'high-purity manganese sulphate processing (global share, proxy)',
      sharePct: 90,
      shareBasis: 'global-supply',
      uncertain: true,
      note: '≈90 %+ of global HPMSM refining; ore itself is diversified (South Africa ≈ a third of global mine supply) — the concentration is a processing-stage fact.',
      source: IEA_CM_OUTLOOK,
    },
  },
];

/* ------------------------------------------- both-directions register */

export type DirectionEntry = {
  title: string;
  mechanism: string;
  source: SourceRef;
};

/** Where MORE climate ambition REDUCES import dependency. */
export const REDUCES_DEPENDENCY: DirectionEntry[] = [
  {
    title: 'Recycling loops scale with the deployed stock',
    mechanism:
      'Every battery and turbine installed is future secondary supply. The Batteries Regulation’s recovery targets (lithium 50 % by 2027 and 80 % by 2031; cobalt, copper and nickel 90 %/95 %) turn the 2025–2035 import surge into a post-2035 domestic feedstock — the CRMA 25 % recycling benchmark is only reachable because ambition creates the scrap.',
    source: BATTERIES_REG,
  },
  {
    title: 'Fuel-import flows fall as electrification rises',
    mechanism:
      'The EU imports the overwhelming share of its fossil gas and oil, continuously. Each GW of wind or solar displaces a recurring fuel-import flow with a one-off material-import stock: a wind turbine embeds a finite NdPr requirement once, a gas turbine embeds a fuel dependency every year it runs.',
    source: ESABCC_2040,
  },
  {
    title: 'Demand-side measures cut the material bill directly',
    mechanism:
      'Smaller vehicles and batteries, modal shift, sufficiency and chemistry thrifting (the slider in section 1) reduce material demand one-for-one — the advised pathway’s demand-side leg is also a raw-materials policy.',
    source: ESABCC_2040,
  },
];

/** Where MORE climate ambition INCREASES import dependency. */
export const INCREASES_DEPENDENCY: DirectionEntry[] = [
  {
    title: 'Battery-grade graphite — every cell, one processor',
    mechanism:
      'Anode graphite is needed by every Li-ion chemistry at ≈1 kg/kWh, and anode-grade processing is ≈90 %+ concentrated in China. Battery ambition scales this dependency linearly until non-Chinese processing or anode recycling exists.',
    source: IEA_CM_OUTLOOK,
  },
  {
    title: 'NdPr magnets — the offshore-wind and EV-motor choke point',
    mechanism:
      'Direct-drive offshore turbines and PM traction motors both draw on separated rare earths and magnets that are ≈98 % Chinese-supplied to the EU. More offshore wind and more EVs mean more NdPr, from effectively one supplier, until alternative separation or magnet-free designs scale.',
    source: RMIS,
  },
  {
    title: 'Lithium and battery-grade manganese — near-total import reliance today',
    mechanism:
      'EU extraction of lithium is ≈0 % and HPMSM capacity ≈0 %: in the 2025–2035 window, before recycling volumes exist, every increment of battery deployment is an increment of import dependency.',
    source: RMIS,
  },
];

/**
 * Headline net-sign statement per pathway. ANALYTICAL JUDGEMENT — this is
 * the compiler's reading of the register above, not a computed quantity and
 * not an ESABCC position; flagged as such in the UI.
 */
export const NET_SIGN_STATEMENTS: { pathway: string; sign: string; statement: string }[] = [
  {
    pathway: 'Advised −90 % by 2040 pathway',
    sign: 'net reduction in flow exposure; transitional increase in stock exposure',
    statement:
      'The pathway converts a permanent, recurring fuel-import exposure into a one-off, stockpilable material-import exposure, while concentrating a transitional (≈2025–2035) dependency in four materials — graphite, NdPr, lithium, battery-grade manganese. If the CRMA benchmarks are met on schedule, the material exposure declines after 2035 as recycling feedstock arrives; the fuel exposure it replaces would not have declined.',
  },
  {
    pathway: 'Lower-ambition counterfactual',
    sign: 'lower stock exposure; permanent flow exposure retained',
    statement:
      'Slower deployment eases the 2020s material squeeze but retains the fuel-import flow — and delays the scrap stream on which the CRMA recycling benchmark depends. Materials exposure is deferred, not avoided, for any pathway that still electrifies eventually.',
  },
];
