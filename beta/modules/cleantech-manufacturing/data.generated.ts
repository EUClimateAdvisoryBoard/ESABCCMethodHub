/**
 * Clean-Tech Manufacturing Scoreboard — curated dataset (beta module M · 46).
 *
 * AI-compiled — pending Secretariat verification. Compiled 2026-08 from
 * published industry and JRC sources; no live pulls were run from this
 * sandbox (Eurostat/EEA hosts are blocked), so the COMEXT figures below are
 * taken from published summaries, not from a committed CN-code pipeline —
 * building that deterministic CN-code list is deferred work, recorded in
 * the module's caveat panel.
 *
 * Provenance and method notes:
 *  - Reference documents: JRC Clean Energy Technology Observatory (CETO)
 *    annual reports 2022–2024; SolarPower Europe EU Market Outlook 2024;
 *    ESMC statements; WindEurope statistics & outlook 2024; T&E battery
 *    risk analyses (2023–2025); Fraunhofer ISI battery capacity mapping;
 *    EHPA market data; Hydrogen Europe Clean Hydrogen Monitor; IEA Global
 *    Hydrogen Review 2023/2024; IEA "Batteries and Secure Energy
 *    Transitions" (2024); European Commission, EU Action Plan for Grids
 *    (COM(2023) 757); REPowerEU (COM(2022) 230).
 *  - Where sources disagree, BOTH estimates are kept as a range with their
 *    own source labels — never silently averaged (mid-points are computed
 *    only in model.ts, and the UI always shows the range).
 *  - Every figure judged not solid enough to assert carries
 *    `uncertain: true` and is rendered with an ≈ prefix and a flag; values
 *    with no defensible source at all are `null` with a prose note —
 *    coverage gaps are acceptable, fabrication is not.
 *  - Percentage shares are stored on the 0–100 scale.
 *  - The announced pipeline column is SOFT everywhere:
 *    announcement-to-FID attrition is severe (Northvolt is the canonical
 *    example) and the flag is structural, not decorative.
 *  - NZIA benchmark values (40 % / ≈15 %) are paraphrased from
 *    Reg. (EU) 2024/1735 (CELEX 32024R1735); verbatim provision text for
 *    the Policy-Targets Register is a separate, pending extraction pass.
 */

export type TechId =
  | 'solar-pv'
  | 'wind'
  | 'batteries'
  | 'heat-pumps'
  | 'electrolysers'
  | 'grid';

/** A single figure with its source label, reference year and honesty flag. */
export interface SourcedFigure {
  value: number;
  /** Source label as shown in the UI, e.g. 'JRC CETO 2023'. */
  source: string;
  /** Year the figure refers to (not the publication year where they differ). */
  year: number;
  /** Flagged in the data, surfaced in the UI — never silently asserted. */
  uncertain?: boolean;
  note?: string;
}

/** Two sources that disagree → keep both ends, never a silent average. */
export interface RangeFigure {
  low: SourcedFigure;
  high: SourcedFigure;
  note?: string;
}

/** Announced pipeline — soft by construction. `value: null` = no defensible
 *  consolidated number exists; the note explains what is known. */
export interface PipelineFigure {
  value: number | null;
  source: string;
  year: number;
  /** e.g. 'announced for 2030' */
  horizon: string;
  /** Mandatory softness note. */
  note: string;
}

export interface SupplierShare {
  name: string;
  /** Share of the stated import basis, 0–100. */
  share: number;
  uncertain?: boolean;
}

export interface Technology {
  id: TechId;
  name: string;
  /** Short label for chips and the selector. */
  short: string;
  /** Native unit for deployment need, capacity and pipeline. */
  unit: string;
  /** How Reg. (EU) 2024/1735 lists the technology family. */
  nziaListing: string;
  /** EU annual deployment need around 2030, native unit. */
  need2030: RangeFigure;
  /** Current EU manufacturing capacity, native unit. `null` = no comparable
   *  published capacity figure (grid equipment) — say so, do not invent. */
  capacity: RangeFigure | null;
  /** Year the capacity range refers to. */
  capacityYear: number;
  /** Capacity ~3 years before capacityYear, for the observed pace trend. */
  capacityPast: SourcedFigure | null;
  pipeline: PipelineFigure;
  /** Share of EU deployment met by imports, 0–100. `null` = not established. */
  importPenetration: SourcedFigure | null;
  /** Import-origin concentration, where a defensible breakdown exists. */
  suppliers: {
    /** What the shares are shares OF — the basis matters. */
    basis: string;
    source: string;
    year: number;
    uncertain?: boolean;
    shares: SupplierShare[];
  } | null;
  /** The dependence headline even where no share table is defensible. */
  topSupplierNote: string;
  /** EU share of world production, 0–100 — the 2040 benchmark axis. */
  worldShare: SourcedFigure | null;
  /** What holds domestic capacity back — short, sourced prose. */
  bottleneck: { text: string; sources: string[] };
}

/** NZIA — Reg. (EU) 2024/1735 (CELEX 32024R1735), OJ L, 28.6.2024.
 *  Benchmarks paraphrased; verbatim extraction to the Policy-Targets
 *  Register is pending. No consolidated version exists yet (act as adopted). */
export const NZIA = {
  celex: '32024R1735',
  url: 'https://eur-lex.europa.eu/eli/reg/2024/1735/oj',
  benchmark2030:
    'Union manufacturing capacity of the listed net-zero technologies approaches or reaches at least 40 % of the Union’s annual deployment needs by 2030 (paraphrase of Reg. (EU) 2024/1735, Art. 1 — verbatim extraction pending).',
  benchmark2040:
    'An increased Union share of world production of those technologies, with a view to reaching around 15 % of world production by 2040 (paraphrase of Reg. (EU) 2024/1735, Art. 1 — verbatim extraction pending).',
} as const;

export const COMPILED = '2026-08' as const;

export const TECHNOLOGIES: Technology[] = [
  {
    id: 'solar-pv',
    name: 'Solar PV (modules)',
    short: 'Solar PV',
    unit: 'GW/yr',
    nziaListing: 'Solar technologies (photovoltaic, thermal electric, thermal)',
    need2030: {
      low: {
        value: 60,
        source: 'SolarPower Europe, EU Market Outlook 2024–2028 (medium scenario, additions around 2030)',
        year: 2024,
        uncertain: true,
        note: 'Scenario quantity, not an observation.',
      },
      high: {
        value: 70,
        source: 'REPowerEU / EU Solar Energy Strategy — ~750 GWdc installed by 2030, implied annual additions',
        year: 2022,
        uncertain: true,
      },
    },
    capacity: {
      low: {
        value: 9,
        source: 'ESMC operational-capacity estimate (module assembly, effective)',
        year: 2023,
        uncertain: true,
      },
      high: {
        value: 14.1,
        source: 'JRC CETO 2023 (module assembly, nameplate)',
        year: 2023,
      },
      note: 'Module assembly only. Upstream cell capacity ≈ 2 GW/yr and ingot/wafer ≈ 1–2 GW/yr (JRC CETO 2023) — the chain is hollow below the module step. Post-2023 closures (Meyer Burger Freiberg, ≈1.4 GW) sit below the range shown.',
    },
    capacityYear: 2023,
    capacityPast: {
      value: 7,
      source: 'JRC CETO 2022 series (module nameplate, ~2020)',
      year: 2020,
      uncertain: true,
    },
    pipeline: {
      value: 20,
      source: 'ESMC / SolarPower Europe announcement tracking',
      year: 2023,
      horizon: 'announced for ≈2026',
      note: 'SOFT — largely stalled or cancelled after the 2023–24 module-price collapse; Meyer Burger halted Freiberg module production in March 2024 and redirected investment to the US.',
    },
    importPenetration: {
      value: 95,
      source: 'Eurostat COMEXT (CN 8541 43) vs deployment — published summaries',
      year: 2023,
      uncertain: true,
      note: 'Deployed modules overwhelmingly imported; exact share depends on inventory treatment.',
    },
    suppliers: {
      basis: 'Extra-EU imports of PV modules (CN 8541 43), value share',
      source: 'Eurostat COMEXT, published summaries',
      year: 2023,
      uncertain: true,
      shares: [{ name: 'China', share: 96, uncertain: true }],
    },
    topSupplierNote:
      'China supplies ≈96–98 % of EU module imports; some rerouting via third countries is possible but does not change the order of magnitude.',
    worldShare: {
      value: 1.5,
      source: 'JRC CETO / IEA PVPS — EU ≈1–2 % of world module production',
      year: 2023,
      uncertain: true,
    },
    bottleneck: {
      text:
        'Chinese module spot prices fell below ≈€0.15/W during 2023–24 — beneath European producers’ cash cost — after global capacity outran demand severalfold, and EU importers carried a large module inventory overhang through 2023. Meyer Burger halted its Freiberg module plant in March 2024; most other announced expansions stalled. The chain is also missing upstream: cell, ingot and wafer capacity is a fraction of module assembly, so even surviving assembly runs on imported cells. NZIA resilience criteria in auctions only start to bite from the 2026 procurement rounds.',
      sources: ['SolarPower Europe 2024', 'ESMC 2024', 'JRC CETO 2023'],
    },
  },
  {
    id: 'wind',
    name: 'Wind turbines (nacelle assembly)',
    short: 'Wind',
    unit: 'GW/yr',
    nziaListing: 'Onshore wind and offshore renewable technologies',
    need2030: {
      low: {
        value: 30,
        source: 'European Commission wind power package — ~425 GW installed by 2030, implied average additions',
        year: 2023,
        uncertain: true,
      },
      high: {
        value: 36,
        source: 'WindEurope 2024 — required annual installations 2025–2030 vs the 2030 target',
        year: 2024,
        uncertain: true,
      },
      note: 'Against EU installations of ≈13 GW in 2024 (WindEurope) — the deployment gap is currently larger than the manufacturing gap.',
    },
    capacity: {
      low: {
        value: 20,
        source: 'JRC CETO 2023 (EU nacelle assembly)',
        year: 2023,
        uncertain: true,
      },
      high: {
        value: 27,
        source: 'WindEurope / industry statements (onshore + offshore nacelle assembly)',
        year: 2023,
        uncertain: true,
      },
      note: 'Nacelle assembly; blades and towers are partly sourced outside the EU. The EU remains a net exporter of turbines.',
    },
    capacityYear: 2023,
    capacityPast: {
      value: 22,
      source: 'JRC CETO series — roughly flat through the loss-making 2021–23 period',
      year: 2020,
      uncertain: true,
    },
    pipeline: {
      value: null,
      source: 'no consolidated public tracker',
      year: 2024,
      horizon: 'announced to ≈2027',
      note: 'SOFT and unquantified — offshore nacelle and blade expansions announced on the back of the recovering order book (Vestas, Siemens Gamesa and suppliers), but no defensible consolidated GW/yr number is published; left null rather than invented.',
    },
    importPenetration: {
      value: 5,
      source: 'WindEurope order statistics — non-EU OEM share of EU turbine orders',
      year: 2024,
      uncertain: true,
      note: 'Turbine level only. First Chinese-turbine orders in EU markets landed 2023–24.',
    },
    suppliers: {
      basis: 'Rare-earth permanent magnets for direct-drive generators (component level, not finished turbines)',
      source: 'ETIPWind / JRC critical-raw-material analyses',
      year: 2023,
      uncertain: true,
      shares: [{ name: 'China', share: 90, uncertain: true }],
    },
    topSupplierNote:
      'At turbine level dependence is low; the China exposure sits one tier down — permanent magnets (≈90 % China) and some castings and forgings.',
    worldShare: {
      value: 20,
      source: 'GWEC / JRC — Chinese OEMs supply ≳60 % of global installs; EU OEMs most of the remainder',
      year: 2023,
      uncertain: true,
    },
    bottleneck: {
      text:
        'The binding constraint has been profitability, not tooling: the major European OEMs booked heavy combined losses in 2021–23 on fixed-price backlogs signed before the input-cost shock, and price-only auction design kept margins thin. Chinese entrants offer turbines reported 20–50 % cheaper with deferred-payment financing, winning first orders at the EU periphery. Component dependence (permanent magnets, castings) and slow deployment — ≈13 GW installed in the EU in 2024 against a ≈30 GW/yr need — hold back investment in new EU capacity more than any hard factory limit.',
      sources: ['WindEurope 2024', 'JRC CETO 2023', 'ETIPWind 2023'],
    },
  },
  {
    id: 'batteries',
    name: 'Battery cells (Li-ion)',
    short: 'Batteries',
    unit: 'GWh/yr',
    nziaListing: 'Battery and energy-storage technologies',
    need2030: {
      low: {
        value: 550,
        source: 'T&E demand scenario for EU cell demand in 2030',
        year: 2024,
        uncertain: true,
      },
      high: {
        value: 900,
        source: 'European Commission / European Battery Alliance — EU demand estimate for 2030',
        year: 2023,
        uncertain: true,
      },
    },
    capacity: {
      low: {
        value: 110,
        source: 'T&E — operational output basis',
        year: 2024,
        uncertain: true,
      },
      high: {
        value: 190,
        source: 'Fraunhofer ISI capacity mapping — nameplate incl. plants in ramp-up',
        year: 2024,
        uncertain: true,
      },
      note: 'The gap between the two estimates is mostly definitional (operational output vs nameplate during ramp-up) — both are kept.',
    },
    capacityYear: 2024,
    capacityPast: {
      value: 60,
      source: 'Fraunhofer ISI / T&E series (mostly LG Wrocław, Samsung SDI, SK, early Northvolt)',
      year: 2021,
      uncertain: true,
    },
    pipeline: {
      value: 1200,
      source: 'T&E announcement tracking',
      year: 2025,
      horizon: 'announced for 2030',
      note: 'SOFT — T&E rates roughly half of the announced 2030 capacity at medium or high risk of delay or cancellation; Northvolt, once the flagship ≈150 GWh of it, entered insolvency (Chapter 11 Nov 2024, Swedish bankruptcy Mar 2025).',
    },
    importPenetration: {
      value: 55,
      source: 'Eurostat COMEXT (CN 8507 60) vs demand estimates — published summaries',
      year: 2023,
      uncertain: true,
    },
    suppliers: {
      basis: 'Extra-EU imports of lithium-ion accumulators (CN 8507 60), value share',
      source: 'Eurostat COMEXT, published summaries',
      year: 2023,
      uncertain: true,
      shares: [{ name: 'China', share: 80, uncertain: true }],
    },
    topSupplierNote:
      'China ≈80 % of extra-EU li-ion imports; much "EU" capacity is Asian-owned (LG, Samsung SDI, SK, CATL Erfurt/Debrecen), which the NZIA benchmark counts as Union capacity.',
    worldShare: {
      value: 6,
      source: 'IEA, Batteries and Secure Energy Transitions — Europe ≈6–8 % of global cell manufacturing capacity',
      year: 2023,
      uncertain: true,
    },
    bottleneck: {
      text:
        'Northvolt’s collapse (insolvency filed November 2024; bankruptcy March 2025) removed the flagship European-owned project and chilled financing for the rest of the pipeline. Upstream stays imported — anode graphite and much cathode active material are ≈90 % China-processed — so even EU-located cell plants embed the dependence one tier down. High energy and capex costs, the IRA’s pull on investment decisions, and slower-than-assumed 2024 EV sales did the rest. The observed capacity trend still paces above the 40 % benchmark requirement — but it leans on Asian-owned plants and a soft pipeline.',
      sources: ['T&E 2025', 'IEA 2024', 'Fraunhofer ISI 2024'],
    },
  },
  {
    id: 'heat-pumps',
    name: 'Heat pumps',
    short: 'Heat pumps',
    unit: 'm units/yr',
    nziaListing: 'Heat-pump and geothermal-energy technologies',
    need2030: {
      low: {
        value: 4,
        source: 'REPowerEU / EHPA — 10 m additional hydronic units 2023–27 and ≈60 m installed by 2030, implied annual sales (hydronic focus)',
        year: 2023,
        uncertain: true,
      },
      high: {
        value: 6,
        source: 'EHPA — ≈60 m installed by 2030 incl. air–air, implied annual sales',
        year: 2023,
        uncertain: true,
      },
    },
    capacity: {
      low: {
        value: 3,
        source: 'JRC CETO 2023 — EU production capability (EU production met ≈⅔ of EU sales)',
        year: 2023,
        uncertain: true,
      },
      high: {
        value: 4.5,
        source: 'EHPA — capacity incl. announced 2022–23 factory investments partially built out',
        year: 2023,
        uncertain: true,
      },
      note: 'Actual EU production ≈2.2 m units in 2023 — capacity is part-idle after the 2023–25 sales slump, so the utilisation gap, not the capacity gap, is the story.',
    },
    capacityYear: 2023,
    capacityPast: {
      value: 2.5,
      source: 'JRC CETO / EHPA series',
      year: 2020,
      uncertain: true,
    },
    pipeline: {
      value: null,
      source: 'EHPA investment tracking',
      year: 2023,
      horizon: 'announced for ≈2026–27',
      note: 'SOFT and unquantified — >€7 bn of factory investment was announced in 2022–23, but several expansions have been paused during the sales slump and no consolidated units/yr figure is published; left null rather than invented.',
    },
    importPenetration: {
      value: 35,
      source: 'JRC CETO 2023 — ≈one-third of units sold in the EU are imported',
      year: 2023,
      uncertain: true,
    },
    suppliers: {
      basis: 'Origin of imported units (mostly air–air) and compressors',
      source: 'JRC CETO / COMEXT published summaries',
      year: 2023,
      uncertain: true,
      shares: [{ name: 'China', share: 45, uncertain: true }],
    },
    topSupplierNote:
      'China is the largest origin of imported units and dominant in compressors — including units sold under Japanese and Korean brands.',
    worldShare: null,
    bottleneck: {
      text:
        'Demand, not manufacturing, is the broken leg: EU sales fell ≈6.5 % in 2023 and by roughly a further fifth in 2024 (EHPA), as gas prices normalised against electricity prices and subsidy regimes turned stop-go — the German heating-law dispute, the end of Italy’s superbonus, churn in France’s MaPrimeRénov. Factories built for the 2022 boom are running well below capacity and announced expansions are paused. Component dependence (compressors, and refrigerant transitions under the F-gas Regulation) is the quieter, second-order exposure.',
      sources: ['EHPA 2025', 'JRC CETO 2023'],
    },
  },
  {
    id: 'electrolysers',
    name: 'Electrolysers',
    short: 'Electrolysers',
    unit: 'GW/yr',
    nziaListing: 'Electrolysers and fuel cells',
    need2030: {
      low: {
        value: 12,
        source: 'Implied additions on slower pathways (~65 GW installed by 2030)',
        year: 2023,
        uncertain: true,
      },
      high: {
        value: 20,
        source: 'REPowerEU — ≈100 GW electrolysis installed by 2030 (10 Mt domestic renewable H₂), implied late-decade additions',
        year: 2022,
        uncertain: true,
      },
      note: 'Deployment is far behind either reading: EU installed electrolysis was ≈0.2–0.3 GW in 2024.',
    },
    capacity: {
      low: {
        value: 3.5,
        source: 'JRC CETO 2023 (EU manufacturing capacity)',
        year: 2023,
      },
      high: {
        value: 5,
        source: 'Hydrogen Europe, Clean Hydrogen Monitor 2024',
        year: 2024,
        uncertain: true,
      },
    },
    capacityYear: 2024,
    capacityPast: {
      value: 1.8,
      source: 'IEA Global Hydrogen Review 2022 (Europe, ~2021)',
      year: 2021,
      uncertain: true,
    },
    pipeline: {
      value: 14,
      source: 'Hydrogen Europe / Electrolyser Partnership announcement tracking',
      year: 2024,
      horizon: 'announced for ≈2025–27',
      note: 'SOFT — the May 2022 Electrolyser Partnership declaration targeted 17.5 GW/yr of EU manufacturing capacity by 2025; that date has passed unmet, and announced expansions are FID-contingent on hydrogen offtake that has not materialised.',
    },
    importPenetration: null,
    suppliers: null,
    topSupplierNote:
      'Trade volumes are still too small for a meaningful import share — the exposure is prospective: Chinese alkaline systems are reported at roughly one-third to one-half of European system cost (IEA GHR 2023/24), so the dependence risk arrives with scale-up, not before it.',
    worldShare: {
      value: 25,
      source: 'IEA Global Hydrogen Review — Europe ≈25 % of global electrolyser manufacturing capacity',
      year: 2023,
      uncertain: true,
    },
    bottleneck: {
      text:
        'Manufacturing is not the constraint yet — demand is. EU installed electrolysis (≈0.2–0.3 GW in 2024) is two orders of magnitude below the 2030 ambition, so factories run at low utilisation and expansion FIDs wait on hydrogen offtake that RFNBO rule complexity and the cost gap keep postponing. Meanwhile Chinese alkaline systems at a fraction of EU cost position China to take the market exactly when EU deployment finally scales. The EU’s ≈25 % share of world manufacturing capacity is strong on paper and fragile in practice.',
      sources: ['Hydrogen Europe 2024', 'IEA GHR 2024', 'JRC CETO 2023'],
    },
  },
  {
    id: 'grid',
    name: 'Grid equipment (cables, transformers, HVDC)',
    short: 'Grid',
    unit: '€bn/yr',
    nziaListing: 'Electricity-grid technologies',
    need2030: {
      low: {
        value: 55,
        source: 'EU Action Plan for Grids (COM(2023) 757) — €584 bn grid investment needed this decade, annualised',
        year: 2023,
        uncertain: true,
      },
      high: {
        value: 60,
        source: 'Same source, upper annualisation (front-loaded profile)',
        year: 2023,
        uncertain: true,
      },
      note: 'Investment need, not equipment demand alone — includes installation and civil works. Used as the only consistently published denominator for this family.',
    },
    capacity: null,
    capacityYear: 2024,
    capacityPast: null,
    pipeline: {
      value: null,
      source: 'manufacturer announcements (Prysmian, NKT, Nexans, Siemens Energy, Hitachi Energy)',
      year: 2024,
      horizon: 'announced to ≈2027–28',
      note: 'SOFT and unquantified — major HVDC-cable and transformer capacity expansions are announced and largely pre-sold against framework agreements, but no comparable €bn/yr or GW capacity figure is published; left null rather than invented.',
    },
    importPenetration: null,
    suppliers: null,
    topSupplierNote:
      'The odd one out: EU manufacturers are globally strong in HVDC cables and large transformers and the EU is broadly a net exporter — the binding problem is absolute capacity against surging demand (transformer lead times ≈2–4 years, HVDC cable order books into the late 2020s), not import penetration.',
    worldShare: null,
    bottleneck: {
      text:
        'Order books, not competitors: demand for cables, large power transformers and HVDC converter equipment has outrun global capacity, with transformer lead times stretched to ≈2–4 years and HVDC cable slots booked years ahead. EU suppliers are expanding but rationing output via framework agreements with large TSOs — smaller DSOs and distribution-level projects queue longest. Skilled-labour scarcity (cable jointers, transformer winders) and grid-electrical-steel supply are the quieter constraints. No comparable capacity/need share can honestly be computed, so this row shows no benchmark bar.',
      sources: ['COM(2023) 757', 'T&D Europe / industry statements 2024'],
    },
  },
];
