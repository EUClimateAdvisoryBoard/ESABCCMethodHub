/**
 * Summer Prep · Optimization — Biomass evidence pack.
 * ----------------------------------------------------
 * Sourced context data for the "Biomass — a scarce resource?" section of the
 * optimization module: EU biomass supply for energy, imports/exports, and the
 * competing sectoral claims on the same resource, against which the model's
 * industrial-biomass ceiling (constraints.csv, biomass_pj_max) is judged.
 *
 * SOURCING RULE (house style): every figure carries a real source with a
 * working URL. Ranges are given as [low, high] where the literature disagrees.
 * This file is data + drafted interpretation only — rendered by page.tsx.
 *
 * STATUS: populated by the biomass evidence agent (2026-07-24). Several
 * figures are derived (percentage shares, energy-content conversions, implied
 * feedstock throughput for CO2-removal targets) rather than lifted verbatim
 * from a single table — each derivation is spelled out in the figure's
 * `note` field. Treat this as an AI-compiled working analysis pending expert
 * verification, not a validated statistical release.
 */

export interface BiomassSource {
  org: string;
  title: string;
  url: string;
  year?: string;
}

export interface BiomassFigure {
  /** Short display label, e.g. "Forestry biomass (domestic)". */
  label: string;
  /** PJ/yr — a central value or a [low, high] range. */
  value_pj: number | [number, number];
  /** Reference year or period of the figure, e.g. "2021". */
  year?: string;
  /** Qualifier / derivation note shown in the UI tooltip. */
  note?: string;
  source: BiomassSource;
}

// --- Reusable sources ---------------------------------------------------

const SRC_IEA_BIOENERGY_EU27: BiomassSource = {
  org: 'IEA Bioenergy',
  title: 'Implementation of Bioenergy in the European Union — Country Report, 2024 update',
  url: 'https://www.ieabioenergy.com/wp-content/uploads/2025/01/CountryReport2024_EU27_final_v2.pdf',
  year: '2024',
};

const SRC_EC_SOTEU_BIOENERGY: BiomassSource = {
  org: 'European Commission (DG ENER)',
  title: 'State of the Energy Union 2023 — bioenergy sustainability reporting',
  url: 'https://energy.ec.europa.eu/news/bioenergy-report-outlines-progress-being-made-across-eu-2023-10-27_en',
  year: '2023',
};

const SRC_JRC_BIOMASS_BRIEF: BiomassSource = {
  org: 'JRC (European Commission)',
  title: 'Brief on biomass for energy in the European Union',
  url: 'https://publications.jrc.ec.europa.eu/repository/handle/JRC109354',
  year: '2019',
};

const SRC_PELLET_IMPORTS: BiomassSource = {
  org: 'Bioenergy Insight Magazine (citing USDA FAS trade data)',
  title: 'EU wood pellet production reached record 24.8 MMT in 2022',
  url: 'https://www.bioenergy-news.com/news/eu-wood-pellet-production-reached-record-24-8-mmt-in-2022/',
  year: '2023',
};

const SRC_PELLET_EXPORTS_UK: BiomassSource = {
  org: 'Forest Research / Forestry Journal (UK)',
  title: "Forestry: the UK imported 9.3m tonnes of wood pellets last year (Forestry Statistics 2023, trade)",
  url: 'https://www.forestryjournal.co.uk/news/25203795.forestry-uk-imported-9-3m-tonnes-wood-pellets-last-year/',
  year: '2023',
};

const SRC_MATERIAL_ECONOMICS_BIOMASS: BiomassSource = {
  org: 'Material Economics / Energy Transitions Commission',
  title: 'EU Biomass Use in a Net-Zero Economy: A course correction for EU biomass (executive summary)',
  url: 'https://www.linkedin.com/pulse/eu-biomass-use-net-zero-economy-executive-summary-johan-haeger-',
  year: '2021',
};

const SRC_SAF_POLICY: BiomassSource = {
  org: 'Climate Catalyst',
  title: 'Sustainable aviation fuel policy in the European Union',
  url: 'https://climatecatalyst.org/wp-content/uploads/2025/03/Sustainable-aviation-fuel-policy-in-the-European-Union.pdf',
  year: '2025',
};

const SRC_MARITIME_BIOFUEL: BiomassSource = {
  org: 'ResourceWise',
  title: 'Could Conventional Biofuels See a New Growth Path in Shipping?',
  url: 'https://www.resourcewise.com/blog/could-conventional-biofuels-see-a-new-growth-path-in-shipping',
  year: '2025',
};

const SRC_BECCS: BiomassSource = {
  org: 'Bioenergy Europe',
  title: "How BECCS Can Help Deliver Europe's 2040 Industrial Carbon Removal Targets",
  url: 'https://bioenergyeurope.org/how-beccs-can-help-deliver-europes-2040-industrial-carbon-removal-targets/',
  year: '2025',
};

// --- 1. EU-27 domestic primary biomass supply for energy, by origin ------
// "Origin" is approximated via the EC's bioenergy-type breakdown (primary
// solid biofuels / liquid biofuels / biogas·biomethane / renewable waste),
// applied to IEA Bioenergy's ~6,100 PJ EU-27 total for 2022. Solid biofuels
// are overwhelmingly wood/forestry-derived (a minor share is agricultural
// residue pellets, e.g. straw); liquid biofuels and biogas are overwhelmingly
// agricultural in origin (energy crops, residues, manure, used cooking oil).
export const EU_BIOMASS_SUPPLY: BiomassFigure[] = [
  {
    label: 'Total EU-27 bioenergy supply (all biomass forms)',
    value_pj: 6100,
    year: '2022',
    note:
      "Biomass is the EU's single largest renewable energy source — about 59-60% of renewable energy consumption, more than wind (1.5 EJ), hydropower (1.0 EJ), solar (0.9 EJ) and geothermal (0.3 EJ) combined.",
    source: SRC_IEA_BIOENERGY_EU27,
  },
  {
    label: 'Forestry biomass (roundwood, residues, black liquor, pellets)',
    value_pj: 4290,
    year: '2021-22',
    note:
      "Approximated as the 'primary solid biofuels' share of EU bioenergy (70.3%, EC 2023 State of the Energy Union bioenergy report) applied to the ~6,100 PJ IEA Bioenergy total. This category is dominated by wood (roundwood, forest residues, wood-processing by-products, black liquor, pellets) but also includes a minor share of agricultural-residue solid fuels such as straw pellets.",
    source: SRC_EC_SOTEU_BIOENERGY,
  },
  {
    label: 'Agricultural biomass, residues & energy crops (biogas + liquid-biofuel feedstock)',
    value_pj: 1400,
    year: '2021-22',
    note:
      "Sum of the 'biogas/bio-methane' (10.1%) and 'liquid biofuels' (12.9%) shares of EU bioenergy (EC 2023 report), applied to the ~6,100 PJ total. Feedstock is predominantly agricultural: energy crops, straw, manure and slurry, used cooking oil, and some imported vegetable oils/residues.",
    source: SRC_EC_SOTEU_BIOENERGY,
  },
  {
    label: 'Biowaste (biodegradable municipal & industrial waste)',
    value_pj: 400,
    year: '2021-22',
    note:
      "'Renewable share of municipal waste' (6.6% of EU bioenergy, EC 2023 report) applied to the ~6,100 PJ total.",
    source: SRC_EC_SOTEU_BIOENERGY,
  },
];

// --- 2. EU-27 biomass trade: imports and exports (negative = export) -----
export const EU_BIOMASS_TRADE: BiomassFigure[] = [
  {
    label: 'Wood pellet imports (extra-EU)',
    value_pj: 103,
    year: '2022',
    note:
      '5.89 Mt of physical wood-pellet imports (USDA FAS trade data via Bioenergy Insight), converted at ~17.5 GJ/t LHV. About 53% (3.12 Mt) came from the United States after the mid-2022 EU ban on Russian/Belarusian pellets. The EU is simultaneously the world\'s largest wood-pellet importer and its largest producer (24.8 Mt in 2022) — imports plug a gap against fast-growing domestic demand, they do not substitute for a lack of domestic industry.',
    source: SRC_PELLET_IMPORTS,
  },
  {
    label: 'Wood pellet exports (EU-27 → non-EU, mainly UK power stations)',
    value_pj: -20,
    year: '2023',
    note:
      "Baltic states and Portugal alone supply roughly a tenth of the UK's ~6.4 Mt/yr of wood-pellet imports (~0.6-0.7 Mt), converted at ~17.5 GJ/t. A genuine outflow of EU-grown biomass to a non-EU market (chiefly Drax's coal-to-biomass conversion) even as the EU imports far larger volumes from overseas.",
    source: SRC_PELLET_EXPORTS_UK,
  },
  {
    label: 'Net imports, bioenergy & waste (all forms, upper-bound estimate)',
    value_pj: 250,
    year: '2022',
    note:
      "IEA Bioenergy's 2024 country report puts the EU's net import dependency for all bioenergy carriers and waste combined at below 5% (≈250-300 PJ against the ~6,100 PJ total) — far below the EU's fossil-fuel import dependency (95% oil, 88% gas, 53% coal). Import reliance is concentrated in specific traded products (wood pellets) rather than spread across the whole biomass supply.",
    source: SRC_IEA_BIOENERGY_EU27,
  },
];

// --- 3. Competing sectoral claims on EU bioenergy -------------------------
// Figures mix "today" (approximated from the EC 2023 bioenergy-type shares)
// and "2050 claims" compiled across EU strategies by Material Economics/ETC,
// plus policy-specific derivations (aviation, maritime, BECCS) — each spelled
// out in its own note. Overlaps between entries (e.g. buildings heating is a
// subset of total power/heat use, not additional to it) are flagged inline.
export const COMPETING_CLAIMS: BiomassFigure[] = [
  {
    label: 'Electricity & district heat — existing use (largest today)',
    value_pj: [3600, 4000],
    year: '2022',
    note:
      "Most of the EU's ~4,290 PJ/yr of solid biofuels is combusted for power, CHP and district heat; a smaller share already goes to industrial process heat (including outside this model's scope), so the power/heat total sits a little below the full solid-biofuels figure. Includes the residential/buildings heating entry below — not additional to it.",
    source: SRC_EC_SOTEU_BIOENERGY,
  },
  {
    label: 'Residential & buildings heating (mostly firewood & pellets)',
    value_pj: [1500, 2200],
    year: '2022',
    note:
      "JRC's biomass-mandate work identifies household/small-scale heating as one of the largest single end-uses of solid biomass in the EU, especially in central, eastern and Nordic member states. No single EU-wide dataset cleanly separates this from utility-scale power/CHP, so this is an order-of-magnitude share of the power/heat total above, not an independently published statistic.",
    source: SRC_JRC_BIOMASS_BRIEF,
  },
  {
    label: 'Road-transport biofuels — today (RED III)',
    value_pj: 790,
    year: '2022',
    note:
      "'Liquid biofuels' share of EU bioenergy (12.9%, EC 2023 report) applied to the ~6,100 PJ total. RED III raises the transport renewable-energy target to 29% by 2030 with a 5.5% advanced-biofuel/RFNBO sub-target, which will push this figure up over the next decade.",
    source: SRC_EC_SOTEU_BIOENERGY,
  },
  {
    label: 'Road-transport biofuels — 2050 sector claims',
    value_pj: [4000, 5000],
    year: '2050',
    note:
      "Range of road-transport biofuel demand claimed across the EU decarbonisation strategies reviewed by Material Economics/ETC — 5-6x today's liquid-biofuel use.",
    source: SRC_MATERIAL_ECONOMICS_BIOMASS,
  },
  {
    label: 'Biogas & biomethane — today',
    value_pj: 620,
    year: '2022',
    note:
      "'Biogas/bio-methane' share of EU bioenergy (10.1%, EC 2023 report) applied to the ~6,100 PJ total; feeds power generation, gas-grid injection and some transport use.",
    source: SRC_EC_SOTEU_BIOENERGY,
  },
  {
    label: 'Biogas & biomethane — 2050 sector claims',
    value_pj: [5000, 6000],
    year: '2050',
    note:
      "Claimed biogas/biomethane demand across the EU strategies compiled by Material Economics/ETC — roughly 8-10x today's level.",
    source: SRC_MATERIAL_ECONOMICS_BIOMASS,
  },
  {
    label: 'Electricity & district heat — 2050 sector claims',
    value_pj: 7000,
    year: '2050',
    note:
      "Power-sector biomass demand claimed across the EU decarbonisation strategies reviewed by Material Economics/ETC — on its own, more than the EU's entire current bioenergy supply (~6,100 PJ).",
    source: SRC_MATERIAL_ECONOMICS_BIOMASS,
  },
  {
    label: 'Aviation SAF — bio-based share (ReFuelEU Aviation)',
    value_pj: [600, 800],
    year: '2050',
    note:
      'ReFuelEU Aviation requires 70% SAF blending by 2050, of which up to 35 percentage points may be synthetic e-kerosene — leaving roughly 35 percentage points (bio-based SAF) of projected EU+EFTA jet-fuel demand. Jet-fuel demand is approximated at ~1,800-2,200 PJ/yr from EASA-reported 2023 aviation CO2 (133 Mt) at ~3.15 tCO2/t fuel and ~43 GJ/t jet fuel. Almost all current SAF is 2nd-generation (used cooking oil, animal fats) — waste feedstock, not energy crops, but still competing with other waste-oil users.',
    source: SRC_SAF_POLICY,
  },
  {
    label: 'Maritime fuels (FuelEU Maritime)',
    value_pj: [17, 56],
    year: '2025-2030',
    note:
      'European port-side marine-biofuel demand of ~0.4-0.5 Mt/yr today could reach ~1.5 Mt/yr by 2030 under an upper-end FuelEU Maritime compliance scenario (fleet GHG-intensity cut rising from 2% in 2025 to 6% in 2030); converted at ~37 GJ/t.',
    source: SRC_MARITIME_BIOFUEL,
  },
  {
    label: 'BECCS / industrial carbon removal (EU 2040 target)',
    value_pj: [800, 1050],
    year: '2040',
    note:
      "The EU's 2040 climate-target impact assessment envisages ~80 Mt CO2/yr of industrial carbon removal, achievable by retrofitting existing biomass power/heat plant with capture. At ~75-90% capture efficiency and ~95-105 kg CO2 per GJ of biomass combusted, that implies routing on the order of 800-1,050 PJ/yr of biomass through CCS-equipped plant — not new biomass demand, but existing combustion (already counted in the power/heat entries above) that becomes harder to reallocate once the capture capex is committed.",
    source: SRC_BECCS,
  },
  {
    label: 'Chemicals & materials feedstock — 2050 sector claims',
    value_pj: 4000,
    year: '2050',
    note:
      'More than 4 EJ (4,000+ PJ) claimed for chemicals by 2050 across the strategies Material Economics/ETC reviewed — on top of the roughly 4 EJ the EU already uses for wood products, pulp and paper materials (outside energy statistics entirely).',
    source: SRC_MATERIAL_ECONOMICS_BIOMASS,
  },
  {
    label: "Energy-intensive industry (this model's ceiling)",
    value_pj: 300,
    year: '2025-2050',
    note:
      "This model's economy-wide ceiling on industrial biomass use across all in-scope routes (paper_bio, cement_altfuel, hvc_bio — see constraints.csv 'biomass_pj_max'), carried over unchanged from the same JRC (2019) estimate cited there. At 300 PJ it is under 5% of the EU's ~6,100 PJ total bioenergy supply — small in isolation, but drawn from the same pool as every claim above, and the sensitivity control on this page lets a reader tighten it to test how exposed the model's paper and cement pathways are.",
    source: SRC_JRC_BIOMASS_BRIEF,
  },
];

/** The model's own industrial biomass ceiling, PJ/yr (mirrors constraints.csv). */
export const MODEL_CEILING_PJ = 300;

/** Drafted interpretation rendered under the charts. */
export const BIOMASS_VERDICT: { headline: string; paragraphs: string[] } = {
  headline:
    "Biomass: not scarce for industry today, but heavily oversubscribed for everyone else",
  paragraphs: [
    "AI-compiled working analysis, pending expert verification. The EU produces around 6,100 PJ/yr of bioenergy domestically (IEA Bioenergy, 2024 update) — roughly 70% wood/forestry-derived, the rest split between agricultural residues and energy crops (biogas and liquid biofuels, ~1,400 PJ) and biodegradable waste (~400 PJ). Taken as a whole, the EU is not import-dependent on biomass: net imports of all bioenergy carriers and waste sit below 5% of consumption, far below the EU's fossil-fuel import dependency (95% oil, 88% gas, 53% coal). But that headline number hides a concentrated exception — wood pellets, the industrially tradeable, energy-dense form of solid biomass. The EU is simultaneously the world's largest pellet producer (24.8 Mt in 2022) and its largest importer (5.89 Mt, over half from the United States), while also exporting a smaller volume of Baltic and Portuguese pellets to non-EU buyers such as UK power stations. The industrial biomass this model caps (paper's biomass boilers, cement's alternative fuels) draws on exactly this traded, transatlantic-dependent segment, not on the broader, mostly untraded biomass pool.",
    "Set against that ~6,100 PJ/yr supply, the claims other sectors are making on the same resource by 2050 are large. Compiling the EU decarbonisation strategies reviewed by Material Economics and the Energy Transitions Commission: road-transport biofuels alone could claim 4,000-5,000 PJ/yr, biogas and biomethane 5,000-6,000 PJ/yr, power generation 7,000 PJ/yr, and chemicals feedstock over 4,000 PJ/yr — a compiled total exceeding 20,000 PJ/yr, well above even the European Commission's own 'doubling' roadmap of 11,000-14,000 PJ/yr, and further still above the ~11,000-13,000 PJ/yr that study judges is realistically, sustainably available. On top of those broad sector claims, two newer policy commitments quietly reserve specific slices of the same pool: ReFuelEU Aviation's SAF mandate implies roughly 600-800 PJ/yr of bio-based jet fuel by 2050, and the EU's 2040 industrial carbon-removal target (around 80 Mt CO2/yr) would need on the order of 800-1,050 PJ/yr of biomass routed through capture-equipped power and heat plant — existing combustion that becomes far harder to reallocate once that capital is committed.",
    "Against that backdrop, this model's 300 PJ/yr industrial ceiling is genuinely small — under 5% of today's total EU bioenergy supply, and a rounding error next to the more than 20,000 PJ/yr of 2050 claims compiled above. In that narrow sense, biomass scarcity is not principally an industry problem: paper's and cement's biomass routes bump into this model's own ceiling long before they would meaningfully move the EU-wide balance. Whether 'many sub-industries claiming the same biomass' creates a problem, then, depends much less on heavy industry's own appetite than on how aggressively the power sector, transport-fuel blenders, aviation, shipping and BECCS operators pursue their own, much larger claims on the identical feedstock pool.",
    "Two caveats temper any comfort from the small industrial share. First, biomass is not one fungible commodity — it is a bundle of feedstocks with different logistics and sustainability constraints (forest residues, agricultural residues, biowaste, traded pellets), and the 'eligible' pool keeps narrowing as EU sustainability criteria under RED III tighten, as the EU Deforestation Regulation reshapes import scrutiny for forest-risk products, and as LULUCF sink targets put additional pressure on how much forest biomass can be removed without eroding the carbon sink. Second, power-sector BECCS and aviation have fewer decarbonisation substitutes than heavy industry, which can also electrify or shift to hydrogen — so even without the full 20,000 PJ/yr materialising, sharper competition from those two claims alone could bid up biomass prices or squeeze feedstock availability for paper's and cement's biomass-fired routes well before the aggregate EU numbers look tight.",
    "The practical takeaway for reading this model's results: treat the 300 PJ ceiling as a policy-planning placeholder inherited from a 2019 JRC estimate, not an empirically enforced physical limit that will hold regardless of what the rest of the EU economy does with biomass over the same period. Given how many other 2050 strategies are quietly assuming the same tonnes, using the module's own sensitivity control to tighten the ceiling — and checking how much of the modelled paper and cement pathway depends on biomass staying available at close to today's uncontested price — is a reasonable stress test, not an alarmist one.",
  ],
};
