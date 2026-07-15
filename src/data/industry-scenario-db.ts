/**
 * Overview Industry — WHOLE-INDUSTRY SCENARIO DATABASE + NACE-C SUBSECTOR LAYER.
 * ---------------------------------------------------------------------------
 * The evidence base behind the multi-scenario industry figure and the
 * subsector drill-down on
 * `beta/modules/overview-industry/report-objectives/page.tsx`.
 *
 * WHAT THIS ADDS beyond `industry-report-objectives.ts`:
 *   • SCENARIOS      — a wide, sourced ensemble of industry emission pathways
 *                      (global and EU) from the IIASA-hosted AR6 database, PIK
 *                      (REMIND / Ariadne), the European Commission's 2040
 *                      Impact-Assessment scenarios (S1/S2/S3/LIFE — flagged as
 *                      special), IEA, ECEMF/ENGAGE and the ESABCC's own work.
 *                      Each carries a characterisation ("what defines it") and a
 *                      contrast note ("how it differs"), plus a pathway series.
 *   • INDUSTRY_HISTORY — the EU-27 industry GHG series (EEA / ESABCC progress
 *                      report, 2005–2022) and the report's benchmark markers.
 *   • SUBSECTORS     — the NACE Rev. 2.1 Section-C manufacturing subsectors,
 *                      each with its 2019 emissions profile (reconciled to the
 *                      EEA inventory), a decarbonisation characterisation and,
 *                      where the literature supports it, its own indexed
 *                      emission pathway — so the area under the whole-industry
 *                      curve can be clicked open into its subsector detail.
 *
 * PROVENANCE (hard rule, identical to the rest of the module): every value
 * carries a `sourceId` resolving to a real, linked source. Historical and
 * benchmark figures come from the Board's own Ch.5 Industry workbook (EEA GHG
 * data viewer / EU ETS data viewer); scenario pathways are extracted from the
 * cited databases and papers. Global and EU pathways have different scopes and
 * absolute levels — they are shown indexed to a common base so the PACE is
 * comparable, never summed. Scenario selection and characterisation wording are
 * AI-compiled working judgements pending sector-lead sign-off; nothing here is
 * a Board position.
 */

/* ── Source register (extends the report-objectives register) ───────────── */

export interface ScenarioSource {
  id: string;
  short: string;
  cite: string;
  url: string;
  doi?: string;
  /** Publisher family, used for grouping/among-scenario colouring. */
  family:
    | 'IIASA / AR6'
    | 'PIK'
    | 'European Commission'
    | 'IEA'
    | 'ESABCC'
    | 'ECEMF / ENGAGE'
    | 'Sector roadmap'
    | 'EEA / Eurostat'
    | 'Think-tank';
}

/** How warm the world stays / how ambitious — used to order and colour rings. */
export type ScenarioClass =
  | 'historical'
  | '1.5C'
  | '1.5C-OS' // 1.5 °C with overshoot
  | 'below-2C'
  | 'EU-netzero'
  | 'benchmark';

/** Scope of the emissions the pathway reports (levels are NOT comparable). */
export type ScenarioScope =
  | 'EU industry (energy + process, GHG)'
  | 'EU industry (CO2)'
  | 'EU industrial process CO2'
  | 'Global industry (direct CO2)'
  | 'Global industry (direct + indirect GHG)'
  | 'Global energy & industrial-process CO2';

export interface ScenarioPoint {
  year: number;
  /** Value in the pathway's own unit (see `unit`). */
  value: number;
}

export interface IndustryScenario {
  id: string;
  /** Display label. */
  label: string;
  /** Ensemble / study this scenario belongs to. */
  ensemble: string;
  sourceId: string;
  scenarioClass: ScenarioClass;
  scope: ScenarioScope;
  unit: string;
  /** What the scenario is characterised by — its defining assumptions. */
  characterisedBy: string;
  /** How it differs from the others in one line. */
  differsBy: string;
  /**
   * Flag the EC 2040 Impact-Assessment scenarios (and the recommended target)
   * so the figure can highlight them as special.
   */
  highlight?: boolean;
  /** The emission pathway (own units). */
  series: ScenarioPoint[];
  /** Optional: net-GHG reduction vs 1990 this scenario reaches by 2040 (%). */
  net2040?: string;
}

/* ── EU-27 industry history & the report's benchmark markers ────────────── */

export interface HistoryPoint {
  year: number;
  ghg: number; // Mt CO2e (all gases)
  co2?: number; // Mt CO2 (CO2 only)
}

/**
 * EU-27 industry (energy-related + industrial-process + product-use) GHG,
 * EEA GHG data viewer as compiled in the Board's Ch.5 Industry workbook.
 */
export const INDUSTRY_HISTORY: HistoryPoint[] = [
  { year: 2005, ghg: 981.3, co2: 846.2 },
  { year: 2006, ghg: 973.8, co2: 841.9 },
  { year: 2007, ghg: 995.6, co2: 858.4 },
  { year: 2008, ghg: 952.3, co2: 819.5 },
  { year: 2009, ghg: 789.4, co2: 664.8 },
  { year: 2010, ghg: 838.8, co2: 719.6 },
  { year: 2011, ghg: 826.2, co2: 707.4 },
  { year: 2012, ghg: 795.7, co2: 676.1 },
  { year: 2013, ghg: 775.5, co2: 655.9 },
  { year: 2014, ghg: 769.2, co2: 648.5 },
  { year: 2015, ghg: 768.8, co2: 655.9 },
  { year: 2016, ghg: 776.2, co2: 660.5 },
  { year: 2017, ghg: 791.0, co2: 673.4 },
  { year: 2018, ghg: 785.3, co2: 664.5 },
  { year: 2019, ghg: 760.1, co2: 656.6 },
  { year: 2020, ghg: 719.6, co2: 623.8 },
  { year: 2021, ghg: 757.5, co2: 657.9 },
  { year: 2022, ghg: 691.3, co2: 605.6 },
];

export interface BenchmarkMarker {
  id: string;
  label: string;
  year: number;
  ghg?: number;
  co2?: number;
  note: string;
  sourceId: string;
}

/**
 * The benchmark/anchor points the Board's industry chapter plots against the
 * historical curve — the Fit-for-55 MIX 2030 point, the Climate Target Plan
 * 2050 residual, and the 2040-advice industry-CO2 range.
 */
export const INDUSTRY_BENCHMARKS: BenchmarkMarker[] = [
  {
    id: 'bm-ff55-2030',
    label: '2030 benchmark (Fit-for-55 MIX)',
    year: 2030,
    ghg: 496.4,
    co2: 473.9,
    note: 'EU industry GHG consistent with the −55% net 2030 target (MIX scenario), as plotted in the ESABCC Ch.5 Industry workbook.',
    sourceId: 'esabcc-progress-2024',
  },
  {
    id: 'bm-advice-2040',
    label: '2040 advice — industry CO2 range',
    year: 2040,
    co2: 129,
    note: 'Industry CO2 (energy + process) across the ESABCC 2040-advice scenarios: 89 (min) to 129 (max) Mt CO2 — an ~80–86% cut vs 2019 CO2.',
    sourceId: 'esabcc-2040-2023',
  },
  {
    id: 'bm-ctp-2050',
    label: '2050 benchmark (Climate Target Plan)',
    year: 2050,
    ghg: 77.5,
    co2: 67.5,
    note: 'Residual EU industry GHG at climate neutrality in the Commission Climate Target Plan, as plotted in the ESABCC Ch.5 Industry workbook.',
    sourceId: 'esabcc-progress-2024',
  },
];

/* ── Source register (this module) ───────────────────────────────────────
   These sources are specific to the scenario database and the subsector
   layer; the page merges them with the report-objectives register so a
   sourceId from either resolves. Every entry has a real, working link. */

export const SCENARIO_SOURCES: ScenarioSource[] = [
  // — scenario ensembles / databases —
  {
    id: 'ar6-db-iiasa',
    short: 'AR6 Scenario DB (IIASA)',
    cite: 'Byers, E., Krey, V., Kriegler, E., Riahi, K., Schaeffer, R., et al. (2022). AR6 Scenarios Database (v1.0, 4 Apr 2022) [Data set]. Zenodo. Hosted by IIASA — 3,131 scenarios, 191 modelling frameworks; 1,202 climate-classified (C1–C8).',
    url: 'https://data.ece.iiasa.ac.at/ar6/',
    doi: '10.5281/zenodo.5886912',
    family: 'IIASA / AR6',
  },
  {
    id: 'engage-2021',
    short: 'ENGAGE (Riahi et al. 2021)',
    cite: 'Riahi, K., Bertram, C., Huppmann, D., et al. (2021). Cost and attainability of meeting stringent climate targets without overshoot. Nature Climate Change 11: 1063–1069. IIASA-coordinated ENGAGE ensemble.',
    url: 'https://www.nature.com/articles/s41558-021-01215-2',
    doi: '10.1038/s41558-021-01215-2',
    family: 'IIASA / AR6',
  },
  {
    id: 'navigate-2023',
    short: 'NAVIGATE',
    cite: 'NAVIGATE — Next generation of Advanced Integrated Assessment Modelling (Horizon 2020, grant 821124). Sector-resolved IAM ensemble; scenario data via the IIASA Scenario Explorer.',
    url: 'https://iiasa.ac.at/projects/navigate',
    family: 'IIASA / AR6',
  },
  {
    id: 'ngfs-v5-2024',
    short: 'NGFS Climate Scenarios v5 (2024)',
    cite: 'Network for Greening the Financial System (2024). NGFS Climate Scenarios, Phase V (v5.0, Nov 2024). Academic consortium incl. IIASA, PIK; models GCAM, MESSAGEix-GLOBIOM, REMIND-MAgPIE.',
    url: 'https://www.ngfs.net/ngfs-scenarios-portal/',
    family: 'IIASA / AR6',
  },
  {
    id: 'scenario-compass-2025',
    short: 'Scenario Compass (2025)',
    cite: 'IIASA & Integrated Assessment Modeling Consortium (2025). Scenario Compass Initiative — a curated ensemble of >1,500 vetted global emission scenarios; the AR6-database successor.',
    url: 'https://scenariocompass.org/about',
    family: 'IIASA / AR6',
  },
  {
    id: 'ipcc-ar6-ch3',
    short: 'IPCC AR6 WGIII Ch.3',
    cite: 'Riahi, K., Schaeffer, R., et al. (2022). Mitigation Pathways Compatible with Long-term Goals. AR6 WGIII Ch.3 (Table 3.4, Fig. 3.26), pp. 295–408. Cambridge University Press.',
    url: 'https://doi.org/10.1017/9781009157926.005',
    doi: '10.1017/9781009157926.005',
    family: 'IIASA / AR6',
  },
  {
    id: 'ipcc-ar6-ch11',
    short: 'IPCC AR6 WGIII Ch.11',
    cite: 'Bashmakov, I.A., Nilsson, L.J., Acquaye, A., et al. (2022). Industry. AR6 WGIII Ch.11, pp. 1161–1243. Cambridge University Press.',
    url: 'https://doi.org/10.1017/9781009157926.013',
    doi: '10.1017/9781009157926.013',
    family: 'IIASA / AR6',
  },
  {
    id: 'iea-nze-2023',
    short: 'IEA NZE 2023',
    cite: 'IEA (2023). Net Zero Roadmap: A Global Pathway to Keep the 1.5 °C Goal in Reach — 2023 Update (Annex A). International Energy Agency, Paris. CC BY 4.0.',
    url: 'https://www.iea.org/reports/net-zero-roadmap-a-global-pathway-to-keep-the-15-c-goal-in-reach',
    family: 'IEA',
  },
  {
    id: 'ec-2040-ia',
    short: 'EC 2040 Impact Assessment',
    cite: 'European Commission (2024). Impact Assessment accompanying "Securing our future — Europe’s 2040 climate target" (SWD(2024) 63 final). Brussels, 6.2.2024.',
    url: 'https://climate.ec.europa.eu/eu-action/climate-strategies-targets/2040-climate-target_en',
    family: 'European Commission',
  },
  {
    id: 'com-2024-63',
    short: 'COM(2024) 63',
    cite: 'European Commission (2024). Securing our future — Europe’s 2040 climate target and path to climate neutrality by 2050. COM(2024) 63 final, Strasbourg, 6.2.2024.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52024DC0063',
    family: 'European Commission',
  },
  {
    id: 'esabcc-2040-2023',
    short: 'ESABCC 2040 advice',
    cite: 'European Scientific Advisory Board on Climate Change (2023). Scientific advice for the determination of an EU-wide 2040 climate target and a greenhouse-gas budget for 2030–2050. doi: 10.2800/609405.',
    url: 'https://climate-advisory-board.europa.eu/reports-and-publications/scientific-advice-for-the-determination-of-an-eu-wide-2040',
    doi: '10.2800/609405',
    family: 'ESABCC',
  },
  {
    id: 'esabcc-progress-2024',
    short: 'ESABCC progress report 2024',
    cite: 'European Scientific Advisory Board on Climate Change (2024). Towards EU climate neutrality: Progress, policy gaps and opportunities (Ch.5 Industry). doi: 10.2800/216446.',
    url: 'https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities',
    doi: '10.2800/216446',
    family: 'ESABCC',
  },
  {
    id: 'material-economics-2019',
    short: 'Material Economics 2019',
    cite: 'Material Economics (2019). Industrial Transformation 2050 — Pathways to Net-Zero Emissions from EU Heavy Industry. Material Economics / CISL.',
    url: 'https://materialeconomics.com/node/13',
    family: 'Think-tank',
  },
  // — PIK / REMIND / Ariadne + EU modelling forums (filled from research) —
  {
    id: 'pik-ariadne-2021',
    short: 'Ariadne scenarios (PIK)',
    cite: 'Luderer, G., Kost, C., Sörgel, D. (eds.) (2021). Deutschland auf dem Weg zur Klimaneutralität 2045 — Szenarien und Pfade (Ariadne-Report). Kopernikus-Projekt Ariadne / PIK.',
    url: 'https://ariadneprojekt.de/publikation/deutschland-auf-dem-weg-zur-klimaneutralitat-2045-szenarienreport/',
    family: 'PIK',
  },
  {
    id: 'ecemf-2025',
    short: 'ECEMF (van der Zwaan et al. 2025)',
    cite: 'van der Zwaan, B., Fattahi, A., Dalla Longa, F., Pietzcker, R., Schreyer, F., et al. (2025). Electricity- and hydrogen-driven energy-system sector-coupling in net-zero CO2 emission pathways. Nature Communications 16. European Climate and Energy Modelling Forum (8-model EU-27 ensemble: NPI, C0-80, C400-lin).',
    url: 'https://www.nature.com/articles/s41467-025-56365-0',
    doi: '10.1038/s41467-025-56365-0',
    family: 'ECEMF / ENGAGE',
  },
  {
    id: 'luderer-2021',
    short: 'Luderer et al. 2021 (REMIND)',
    cite: 'Luderer, G., Madeddu, S., Merfort, L., Ueckerdt, F., Pehl, M., Pietzcker, R., et al. (2021). Impact of declining renewable-energy costs on electrification in low-emission scenarios. Nature Energy 6: 1043–1055. REMIND, global.',
    url: 'https://www.nature.com/articles/s41560-021-00937-z',
    doi: '10.1038/s41560-021-00937-z',
    family: 'PIK',
  },
  {
    id: 'ueckerdt-2021',
    short: 'Ueckerdt et al. 2021 (e-fuels)',
    cite: 'Ueckerdt, F., Bauer, C., Dirnaichner, A., Everall, J., Sacchi, R., Luderer, G. (2021). Potential and risks of hydrogen-based e-fuels in climate-change mitigation. Nature Climate Change 11: 384–393.',
    url: 'https://www.nature.com/articles/s41558-021-01032-7',
    doi: '10.1038/s41558-021-01032-7',
    family: 'PIK',
  },
  {
    id: 'verpoort-2024',
    short: 'Verpoort et al. 2024 (renewables pull)',
    cite: 'Verpoort, P.C., Gast, L., Hofmann, A., Ueckerdt, F. (2024). Impact of global heterogeneity of renewable-energy supply on heavy industrial production and green value chains. Nature Energy 9: 491–503. PIK.',
    url: 'https://www.nature.com/articles/s41560-024-01492-z',
    doi: '10.1038/s41560-024-01492-z',
    family: 'PIK',
  },
  {
    id: 'agora-electrification-2024',
    short: 'Agora/Fraunhofer 2024 (electrification)',
    cite: 'Agora Industry & Fraunhofer ISI (2024). Direct Electrification of Industrial Process Heat — an assessment of technologies, potentials and future prospects for the EU.',
    url: 'https://www.agora-industry.org/publications/direct-electrification-of-industrial-process-heat',
    family: 'Think-tank',
  },
  {
    id: 'jrc-potencia-2024',
    short: 'JRC POTEnCIA CETO 2024',
    cite: 'JRC (2024). The POTEnCIA Central scenario — an EU energy outlook to 2050 (CETO 2024). European Commission Joint Research Centre.',
    url: 'https://publications.jrc.ec.europa.eu/repository/handle/JRC139836',
    family: 'European Commission',
  },
  {
    id: 'ec-icms-2024',
    short: 'EU Industrial Carbon Management Strategy',
    cite: 'European Commission (2024). Towards an ambitious Industrial Carbon Management for the EU. COM(2024) 62 final (capture ≥50 Mt 2030, 280 Mt 2040, ~450 Mt 2050).',
    url: 'https://climate.ec.europa.eu/eu-action/carbon-capture-use-and-storage_en',
    family: 'European Commission',
  },
  // — sector roadmaps for the subsector layer —
  {
    id: 'eurofer-roadmap',
    short: 'EUROFER Low-Carbon Roadmap',
    cite: 'EUROFER (2019). Low-Carbon Roadmap — Pathways to a CO2-neutral European Steel Industry; and the updated map of key low-CO2 steel projects (2022).',
    url: 'https://www.eurofer.eu/issues/climate-and-energy/maps-of-key-low-carbon-steel-projects',
    family: 'Sector roadmap',
  },
  {
    id: 'cembureau-roadmap',
    short: 'CEMBUREAU 2050 Roadmap',
    cite: 'CEMBUREAU (2020/2024). Cementing the European Green Deal — Reaching Climate Neutrality along the Cement & Concrete Value Chain by 2050 (5C roadmap; 2024 update).',
    url: 'https://cembureau.eu/library/reports/2050-carbon-neutrality-roadmap/',
    family: 'Sector roadmap',
  },
  {
    id: 'cepi-roadmap',
    short: 'CEPI 2050 Roadmap',
    cite: 'CEPI — Confederation of European Paper Industries (2017/2020). Unfold the Future — The Forest Fibre Industry 2050 Roadmap.',
    url: 'https://www.cepi.org/wp-content/uploads/2020/08/2050_roadmap_final.pdf',
    family: 'Sector roadmap',
  },
  {
    id: 'cefic-transition',
    short: 'Cefic transition pathway',
    cite: 'Cefic — European Chemical Industry Council. EU Chemical Industry Transition Pathway / Climate portal (GHG −67% 1990→2020; climate-neutral 2050 ambition).',
    url: 'https://transition-pathway.cefic.org/',
    family: 'Sector roadmap',
  },
  {
    id: 'european-aluminium',
    short: 'European Aluminium 2050',
    cite: 'European Aluminium (2019/2024). Vision 2050 — European Aluminium’s contribution to the EU mid-century low-carbon roadmap / Net-zero by 2050.',
    url: 'https://european-aluminium.eu/wp-content/uploads/2024/01/European-Aluminium_Net-zero-by-2050_Executive-Summary.pdf',
    family: 'Sector roadmap',
  },
  {
    id: 'iea-aluminium',
    short: 'IEA Aluminium',
    cite: 'IEA. Aluminium — Energy System / Industry (Net Zero Scenario: 810 Mt 2030 → 53 Mt 2050). International Energy Agency, Paris.',
    url: 'https://www.iea.org/energy-system/industry/aluminium',
    family: 'IEA',
  },
  {
    id: 'iea-steel',
    short: 'IEA Iron & Steel',
    cite: 'IEA. Iron and Steel — Energy System / Industry (NZE: ~−25% by 2030; measure mix). International Energy Agency, Paris.',
    url: 'https://www.iea.org/energy-system/industry/steel',
    family: 'IEA',
  },
  {
    id: 'iea-cement',
    short: 'IEA Cement',
    cite: 'IEA. Cement — Energy System / Industry (NZE: 1.91 Gt 2030; CCUS ~52% of abatement). International Energy Agency, Paris.',
    url: 'https://www.iea.org/energy-system/industry/cement',
    family: 'IEA',
  },
  {
    id: 'iea-chemicals',
    short: 'IEA Chemicals',
    cite: 'IEA. Chemicals / Primary chemicals — Energy System / Industry (NZE: 0.77 Gt 2030; intensity −28% by 2030). International Energy Agency, Paris.',
    url: 'https://www.iea.org/energy-system/industry/chemicals',
    family: 'IEA',
  },
  {
    id: 'fooddrinkeurope',
    short: 'FoodDrinkEurope',
    cite: 'FoodDrinkEurope (2021). Decarbonising the European food and drink manufacturing sector.',
    url: 'https://www.fooddrinkeurope.eu/wp-content/uploads/2021/09/Decarbonising-the-European-food-and-drink-manufacturing-sector_v2.pdf',
    family: 'Sector roadmap',
  },
  {
    id: 'feve-glass',
    short: 'FEVE glass decarbonisation',
    cite: 'FEVE — The European Container Glass Federation. Decarbonisation of glass packaging (Furnace for the Future / hybrid melting).',
    url: 'https://feve.org/decarbonisation-glass-packaging/',
    family: 'Sector roadmap',
  },
  {
    id: 'cerame-unie',
    short: 'Cerame-Unie roadmap',
    cite: 'Cerame-Unie (2021). Ceramic Roadmap to 2050 — Continuing our path towards climate neutrality.',
    url: 'https://www.cerameunie.eu/media/zyqdwwwp/ceramic-roadmap-to-2050.pdf',
    family: 'Sector roadmap',
  },
  {
    id: 'eula-lime',
    short: 'Lime decarbonisation review',
    cite: 'Simoni, M. et al. (2022/2023). Decarbonising the lime industry: state-of-the-art. Renewable and Sustainable Energy Reviews (CCUS >50% of abatement; process CO2 ~65%).',
    url: 'https://www.sciencedirect.com/science/article/pii/S1364032122006505',
    family: 'Sector roadmap',
  },
  {
    id: 'plastics-science-2021',
    short: 'Net-zero plastics (Science 2021)',
    cite: 'Meys, R., Kätelhön, A., Bardow, A., et al. (2021). Achieving net-zero greenhouse-gas emission plastics by a circular carbon economy. Science 374(6563): 71–76.',
    url: 'https://www.science.org/doi/10.1126/science.abg9853',
    doi: '10.1126/science.abg9853',
    family: 'Think-tank',
  },
  {
    id: 'eea-eii',
    short: 'EEA energy-intensive industries',
    cite: 'European Environment Agency (2024). Zero pollution, decarbonisation and circular economy in energy-intensive industries (CRF/ETS mapping).',
    url: 'https://www.eea.europa.eu/en/analysis/publications/zero-pollution-decarbonisation-and-circular-economy-in-energy-intensive-industries',
    family: 'EEA / Eurostat',
  },
  {
    id: 'eea-ghg-viewer',
    short: 'EEA GHG data viewer',
    cite: 'European Environment Agency. GHG data viewer (EU-27 greenhouse-gas inventory by CRF sector); EU ETS data viewer for verified installation emissions.',
    url: 'https://www.eea.europa.eu/en/analysis/maps-and-charts/greenhouse-gases-viewer-data-viewers',
    family: 'EEA / Eurostat',
  },
];

const SCEN_SOURCE_INDEX = new Map(SCENARIO_SOURCES.map((s) => [s.id, s]));
export function scenarioSourceById(id: string): ScenarioSource | undefined {
  return SCEN_SOURCE_INDEX.get(id);
}

/* ── NACE Section-C manufacturing subsectors ─────────────────────────────── */

export interface SubsectorPathwayPoint {
  year: number;
  /** Indexed to 100 in the base year, so subsectors are pace-comparable. */
  index: number;
}

export interface Subsector {
  id: string;
  label: string;
  /** NACE Rev. 2.1 Section-C divisions this subsector maps to. */
  naceDivisions: string[];
  /** EEA/CRF inventory categories the emissions figure is built from. */
  crfCategories: string;
  /** EU-27 GHG in 2019 (Mt CO2e), reconciled to the industry total. */
  ghg2019: number;
  /** EU-27 GHG in 2021 (Mt CO2e). */
  ghg2021: number;
  /** Share of the emissions that are process (vs energy/heat), where known. */
  processShare?: string;
  /** What decarbonising this subsector is characterised by. */
  characterisedBy: string;
  /** Principal near-zero levers. */
  levers: string[];
  /** Optional subsector-specific emission pathway (indexed, base year noted). */
  pathwayBaseYear?: number;
  pathway?: SubsectorPathwayPoint[];
  pathwayNote?: string;
  sourceId: string;
}

/**
 * The NACE Section-C manufacturing subsectors, sized by their 2019 EU-27
 * GHG (reconciled to the industry total of 760 Mt CO2e). Emissions are built
 * from the EEA inventory CRF categories as compiled in the Board's Ch.5
 * Industry workbook. Subsector pathways are INDICATIVE trajectories indexed to
 * 2019 = 100, following the milestones of the cited sector roadmap (the
 * roadmap's own base year is stated in the note); they show each subsector's
 * decarbonisation pace and net-zero timing, not modelled tonnages.
 */
export const SUBSECTORS: Subsector[] = [
  {
    id: 'sub-steel',
    label: 'Iron & steel',
    naceDivisions: ['24'],
    crfCategories: '1.A.2.a (combustion) + 2.C.1 (process)',
    ghg2019: 145.4,
    ghg2021: 147.0,
    processShare: '~45% process (coke as reductant) + energy',
    characterisedBy:
      'The single largest industrial emitter. Coke is both fuel AND chemical reductant in the blast-furnace/BOF route, so this is a process + energy problem — fuel-switching alone cannot solve it. The near-zero route is H2-DRI + scrap-EAF, with CCUS on residual integrated capacity.',
    levers: ['H2-DRI (hydrogen direct reduction)', 'Scrap-based EAF', 'CCUS on BF-BOF', 'Scrap & material efficiency'],
    pathwayBaseYear: 2019,
    pathway: [
      { year: 2019, index: 100 },
      { year: 2030, index: 70 },
      { year: 2040, index: 35 },
      { year: 2050, index: 5 },
    ],
    pathwayNote:
      'EUROFER Low-Carbon Roadmap: ~−30% vs today by 2030 (−55% vs 1990) and net-zero by 2050; IEA NZE requires global steel −25% by 2030. Indexed to 2019 = 100.',
    sourceId: 'eurofer-roadmap',
  },
  {
    id: 'sub-cement-lime',
    label: 'Cement & lime',
    naceDivisions: ['23'],
    crfCategories: '1.A.2.f (part) + 2.A.1 (cement) + 2.A.2 (lime)',
    ghg2019: 145.2,
    ghg2021: 118.8,
    processShare: '~⅔ process (limestone calcination)',
    characterisedBy:
      'Roughly two-thirds of emissions are process CO2 from limestone calcination — chemically unavoidable by fuel switching — which makes CCUS the pivotal lever. Clinker substitution and alternative fuels cut the rest; the value chain can go carbon-negative through recarbonation.',
    levers: ['CCUS (largest post-2030 lever)', 'Clinker substitution (SCMs)', 'Alternative & biomass fuels', 'Material efficiency & recarbonation'],
    pathwayBaseYear: 2019,
    pathway: [
      { year: 2019, index: 100 },
      { year: 2030, index: 74 },
      { year: 2040, index: 35 },
      { year: 2050, index: 6 },
    ],
    pathwayNote:
      'CEMBUREAU 5C roadmap: −37% (cement) / −50% (value chain) by 2030, −78% / −93% by 2040, net-zero 2050 — all vs 1990. Lime CCUS >50% of abatement. Indexed to 2019 = 100.',
    sourceId: 'cembureau-roadmap',
  },
  {
    id: 'sub-chemicals',
    label: 'Chemicals & petrochemicals',
    naceDivisions: ['20', '21'],
    crfCategories: '1.A.2.c (combustion) + 2.B (process, incl. ammonia, nitric/adipic acid, petrochemicals)',
    ghg2019: 121.3,
    ghg2021: 123.9,
    processShare: 'Energy + fossil feedstock (naphtha/gas as carbon input)',
    characterisedBy:
      'Unique in that fossil carbon is both energy AND feedstock — naphtha and gas become the plastics, ammonia and methanol themselves. Decarbonisation therefore needs a feedstock shift (electrolytic H2, circular and bio-carbon) on top of electrification and CCUS on process streams.',
    levers: ['Electrification (e-crackers, electric steam)', 'Green/electrolytic hydrogen (feedstock)', 'CCUS on process CO2', 'Circular & bio feedstock'],
    pathwayBaseYear: 2019,
    pathway: [
      { year: 2019, index: 100 },
      { year: 2030, index: 78 },
      { year: 2040, index: 40 },
      { year: 2050, index: 8 },
    ],
    pathwayNote:
      'Cefic: GHG −67% from 1990 to 2020, climate-neutral 2050 ambition; IEA NZE primary-chemicals intensity −28% by 2030. Indexed to 2019 = 100.',
    sourceId: 'cefic-transition',
  },
  {
    id: 'sub-nonferrous',
    label: 'Non-ferrous metals (incl. aluminium)',
    naceDivisions: ['24'],
    crfCategories: '1.A.2.b (combustion) + 2.C.2–2.C.7 (process, incl. aluminium PFCs)',
    ghg2019: 17.0,
    ghg2021: 16.8,
    processShare: 'Process (electrolysis anode CO2, PFCs) + energy; large indirect (electricity)',
    characterisedBy:
      'Direct emissions are modest but aluminium is highly electricity-intensive, so most of its footprint is indirect and falls with grid decarbonisation. Inert anodes remove the process CO2 of primary smelting; scrap recycling cuts primary demand.',
    levers: ['Inert (non-carbon) anodes', 'Decarbonised electricity', 'Scrap collection & recycling', 'PFC abatement'],
    pathwayBaseYear: 2019,
    pathway: [
      { year: 2019, index: 100 },
      { year: 2030, index: 72 },
      { year: 2040, index: 30 },
      { year: 2050, index: 6 },
    ],
    pathwayNote:
      'IEA NZE global aluminium 810 Mt (2030) → 53 Mt (2050); European Aluminium net-zero by 2050. Indexed to 2019 = 100.',
    sourceId: 'iea-aluminium',
  },
  {
    id: 'sub-glass-ceramics',
    label: 'Glass, ceramics & other minerals',
    naceDivisions: ['23'],
    crfCategories: '1.A.2.f (part) + 2.A.3 (glass) + 2.A.4 (other carbonates)',
    ghg2019: 45.9,
    ghg2021: 69.7,
    processShare: 'Melting/firing energy + some carbonate process CO2',
    characterisedBy:
      'High-temperature melting (glass ~80% of emissions in the furnace) and kiln firing (ceramics ~80% gas). The routes are electric and hybrid melting, hydrogen/biogas co-firing and higher recycled (cullet) content; kiln electrification is still emerging.',
    levers: ['Electric & hybrid melting furnaces', 'Hydrogen / biogas co-firing', 'High cullet / recycled content', 'Decarbonised electricity'],
    pathwayBaseYear: 2019,
    pathway: [
      { year: 2019, index: 100 },
      { year: 2030, index: 80 },
      { year: 2040, index: 42 },
      { year: 2050, index: 8 },
    ],
    pathwayNote:
      'FEVE (glass) and Cerame-Unie (ceramics) target climate neutrality by 2050 via electric/hybrid melting and H2; associations publish target-based roadmaps rather than numeric CO2 trajectories, so this pathway is an indicative net-zero-2050 shape indexed to 2019 = 100.',
    sourceId: 'feve-glass',
  },
  {
    id: 'sub-food',
    label: 'Food, beverages & tobacco',
    naceDivisions: ['10', '11', '12'],
    crfCategories: '1.A.2.e (combustion)',
    ghg2019: 36.3,
    ghg2021: 36.8,
    processShare: 'Almost all energy (low-temperature process heat)',
    characterisedBy:
      'A low-temperature-heat problem — ~97% of heat demand is below the reach of industrial heat pumps and electric boilers — with negligible process CO2. The most electrifiable heavy-ish subsector: electrification can supply >85% of process heat by 2050.',
    levers: ['High-temperature heat pumps', 'Electric boilers', 'Biomass / biogas', 'Energy efficiency'],
    pathwayBaseYear: 2019,
    pathway: [
      { year: 2019, index: 100 },
      { year: 2030, index: 68 },
      { year: 2040, index: 32 },
      { year: 2050, index: 6 },
    ],
    pathwayNote:
      'FoodDrinkEurope: electrification can meet >85% of process heat by 2050; Agora/Fraunhofer: direct electrification can meet 90% of not-yet-electrified industrial energy demand by 2035. Indicative net-zero shape indexed to 2019 = 100.',
    sourceId: 'fooddrinkeurope',
  },
  {
    id: 'sub-paper',
    label: 'Pulp, paper & print',
    naceDivisions: ['17', '18'],
    crfCategories: '1.A.2.d (combustion)',
    ghg2019: 24.7,
    ghg2021: 23.8,
    processShare: 'Energy / process heat; much on-site biomass already',
    characterisedBy:
      'Steam and drying heat dominate, and mills already run substantial biomass CHP, so fossil CO2 is comparatively low and the route is electrification (high-temperature heat pumps) plus more biomass — with a BECCS option that could make the subsector net-negative.',
    levers: ['Biomass CHP', 'High-temperature heat pumps & electrification', 'Energy efficiency', 'BECCS (optional, net-negative)'],
    pathwayBaseYear: 2019,
    pathway: [
      { year: 2019, index: 100 },
      { year: 2030, index: 72 },
      { year: 2040, index: 34 },
      { year: 2050, index: 8 },
    ],
    pathwayNote:
      'CEPI 2050 roadmap: −80% by 2050 (60 Mt CO2 in 1990 → 12 Mt in 2050) while growing sector value +50%. Indexed to 2019 = 100.',
    sourceId: 'cepi-roadmap',
  },
  {
    id: 'sub-fgases',
    label: 'F-gases & product use',
    naceDivisions: ['—'],
    crfCategories: '2.F (product uses as substitutes for ODS — refrigeration, AC, foams)',
    ghg2019: 78.1,
    ghg2021: 70.8,
    processShare: 'Fluorinated-gas emissions from product use (not combustion)',
    characterisedBy:
      'Not a manufacturing-production source but the use-phase leakage of HFCs from refrigeration, air-conditioning and foams — allocated to industry in the inventory. The revised EU F-gas Regulation phases HFCs down to near-zero by 2050; natural refrigerants are the substitute.',
    levers: ['HFC phase-down (F-gas Regulation)', 'Natural refrigerants (CO2, ammonia, propane)', 'Leak-tight equipment & recovery'],
    pathwayBaseYear: 2019,
    pathway: [
      { year: 2019, index: 100 },
      { year: 2030, index: 55 },
      { year: 2040, index: 20 },
      { year: 2050, index: 5 },
    ],
    pathwayNote:
      'Regulation (EU) 2024/573 phases the HFC quota down to ~5% of the 2015 baseline by 2036 and near-zero placing-on-market by 2050. Indicative phase-down shape indexed to 2019 = 100.',
    sourceId: 'eea-eii',
  },
  {
    id: 'sub-other',
    label: 'Other manufacturing',
    naceDivisions: ['13', '14', '15', '16', '22', '25', '26', '27', '28', '29', '30', '31', '32', '33'],
    crfCategories: '1.A.2.g (combustion) + 2.D/2.E/2.G/2.H (non-energy products, electronics, other)',
    ghg2019: 146.3,
    ghg2021: 149.9,
    processShare: 'Predominantly energy/electricity; small F-gas/process (electronics 2.E, SF6 2.G)',
    characterisedBy:
      'The long tail of lighter manufacturing — textiles, wood, plastics converting, machinery, vehicles, electronics, furniture — overwhelmingly electricity- and low-/mid-temperature-heat driven, with little process CO2. The shared route is electrification, heat pumps and efficiency on a decarbonising grid.',
    levers: ['Direct electrification & heat pumps', 'Renewable power', 'Energy & material efficiency', 'F-gas/SF6 abatement (electronics, switchgear)'],
    pathwayBaseYear: 2019,
    pathway: [
      { year: 2019, index: 100 },
      { year: 2030, index: 70 },
      { year: 2040, index: 33 },
      { year: 2050, index: 6 },
    ],
    pathwayNote:
      'Agora/Fraunhofer: direct electrification can meet 90% of not-yet-electrified industrial energy demand by 2035; these subsectors are largely electrifiable low-/mid-temperature users. Indicative net-zero shape indexed to 2019 = 100.',
    sourceId: 'agora-electrification-2024',
  },
];

/* ── The scenario ensemble ───────────────────────────────────────────────
   Each pathway is stored in its OWN units (Mt CO2, Gt CO2 or an index). The
   figure indexes every pathway to its base year = 100 so the PACE of decline
   is comparable across scopes that must never be summed. The EC 2040 Impact-
   Assessment scenarios (and the ESABCC 2040-advice range) are flagged
   `highlight` so the figure can single them out. */

export const SCENARIOS: IndustryScenario[] = [
  // ─────────── EU pathways ───────────
  {
    id: 'sc-esabcc-benchmark',
    label: 'EU industry — ESABCC benchmark trajectory',
    ensemble: 'ESABCC progress report (Ch.5 Industry)',
    sourceId: 'esabcc-progress-2024',
    scenarioClass: 'EU-netzero',
    scope: 'EU industry (energy + process, GHG)',
    unit: 'Mt CO2e',
    characterisedBy:
      'The Board’s own reference line: EU industry GHG on a straight glide from the last outturn (691 Mt in 2022) through the Fit-for-55 MIX 2030 benchmark (496 Mt) to the Climate Target Plan 2050 residual (78 Mt).',
    differsBy: 'Not a model scenario but the benchmark trajectory the Board plots industry progress against.',
    series: [
      { year: 2022, value: 691.3 },
      { year: 2025, value: 618.2 },
      { year: 2030, value: 496.4 },
      { year: 2035, value: 391.7 },
      { year: 2040, value: 287.0 },
      { year: 2045, value: 182.2 },
      { year: 2050, value: 77.5 },
    ],
  },
  {
    id: 'sc-ec-ia-s1',
    label: 'EU 2040 IA — S1 (Option 1, −78%)',
    ensemble: 'EC 2040 Impact Assessment (SWD(2024) 63)',
    sourceId: 'ec-2040-ia',
    scenarioClass: 'EU-netzero',
    scope: 'EU industry (energy + process, GHG)',
    unit: 'Mt CO2e',
    highlight: true,
    net2040: '−78% net vs 1990 (economy-wide)',
    characterisedBy:
      'The lowest-ambition modelled pathway (maps to Option 1, ~80% economy-wide). Strengthens existing trends but postpones the novel levers — hydrogen electrolysis, carbon capture and industrial removals — largely to 2041–2050; carbon capture stays below ~100 Mt/yr and fossil-import dependence is highest (34%).',
    differsBy: 'Slowest technology roll-out, highest 2030–2050 GHG budget (21 Gt), most industry abatement left to the final decade — industry at the top of the 25–219 Mt 2040 range.',
    series: [
      { year: 2022, value: 691.3 },
      { year: 2030, value: 496 },
      { year: 2040, value: 219 },
    ],
  },
  {
    id: 'sc-ec-ia-s2',
    label: 'EU 2040 IA — S2 (Option 2, −88%)',
    ensemble: 'EC 2040 Impact Assessment (SWD(2024) 63)',
    sourceId: 'ec-2040-ia',
    scenarioClass: 'EU-netzero',
    scope: 'EU industry (energy + process, GHG)',
    unit: 'Mt CO2e',
    highlight: true,
    net2040: '−88% net vs 1990 (economy-wide)',
    characterisedBy:
      'The IA baseline (Option 2, 85–90%): full deployment of existing solutions — electrification, renewables — plus carbon capture (~220 Mt/yr, ~150 stored), higher e-fuel uptake on fossil-free carbon and further agricultural abatement. Industry energy-related emissions ~120 Mt in 2040.',
    differsBy: 'The reference/continuation pathway — more novel tech than S1, less and later than S3; industry mid-range (~120 Mt) in 2040.',
    series: [
      { year: 2022, value: 691.3 },
      { year: 2030, value: 496 },
      { year: 2040, value: 120 },
    ],
  },
  {
    id: 'sc-ec-ia-s3',
    label: 'EU 2040 IA — S3 (Option 3, −90–92%, preferred)',
    ensemble: 'EC 2040 Impact Assessment (SWD(2024) 63)',
    sourceId: 'ec-2040-ia',
    scenarioClass: 'EU-netzero',
    scope: 'EU industry (energy + process, GHG)',
    unit: 'Mt CO2e',
    highlight: true,
    net2040: '−90 to −92% net vs 1990 (recommended 90%)',
    characterisedBy:
      'The Commission’s preferred pathway (Option 3, 90–95%): earliest and fastest roll-out of hydrogen electrolysis, carbon capture (~350 Mt/yr, ~240 stored) and industrial removals in 2031–2040; renewables + nuclear >90% of electricity, final-energy electrification roughly doubling from ~25% to ~50%. Deepest industry cut — to the low end of the 25–219 Mt 2040 range.',
    differsBy: 'Earliest, deepest cuts, lowest 2030–2050 budget (16 Gt), highest reliance on capture and industrial removals; industry near the bottom of the 25–219 Mt 2040 range.',
    series: [
      { year: 2022, value: 691.3 },
      { year: 2030, value: 496 },
      { year: 2040, value: 30 },
    ],
  },
  {
    id: 'sc-esabcc-2040',
    label: 'EU 2040 — ESABCC advice (industry CO2, max path)',
    ensemble: 'ESABCC 2040 advice (36 filtered 1.5 °C pathways)',
    sourceId: 'esabcc-2040-2023',
    scenarioClass: '1.5C',
    scope: 'EU industry (CO2)',
    unit: 'Mt CO2',
    highlight: true,
    net2040: '−90 to −95% net vs 1990 (recommended)',
    characterisedBy:
      'The Board’s recommended target underpinning −90–95%: 36 scenarios filtered from >1,000 for feasibility and a global 1.5 °C budget, minimising reliance on CO2 removals; industry CO2 falls to 89–129 Mt in 2040 (this line plots the 129 Mt upper path) and 5–22 Mt by 2050.',
    differsBy: 'Stricter 2030–2050 budget (11–14 Gt) than the Commission IA (16 Gt), and explicitly minimises removals.',
    series: [
      { year: 2022, value: 605.6 },
      { year: 2040, value: 129 },
      { year: 2050, value: 21.7 },
    ],
  },
  {
    id: 'sc-material-economics',
    label: 'EU heavy industry — Material Economics net-zero',
    ensemble: 'Material Economics — Industrial Transformation 2050',
    sourceId: 'material-economics-2019',
    scenarioClass: 'EU-netzero',
    scope: 'EU industry (CO2)',
    unit: 'Mt CO2',
    characterisedBy:
      'Three pathways (New Processes, Circular Economy, Carbon Capture) taking EU steel, plastics/chemicals, ammonia and cement (536 Mt in 2015) to net zero by 2050 while keeping production in Europe.',
    differsBy: 'Heavy-industry scope only (four materials); all three variants reach net zero by 2050.',
    series: [
      { year: 2015, value: 536 },
      { year: 2050, value: 0 },
    ],
  },
  // ─────────── EU multi-model ensemble (electrification/H2 characterised) ───────────
  {
    id: 'sc-ecemf-c400',
    label: 'EU — ECEMF C400-lin (net-zero)',
    ensemble: 'ECEMF 8-model EU ensemble (van der Zwaan et al. 2025)',
    sourceId: 'ecemf-2025',
    scenarioClass: 'EU-netzero',
    scope: 'EU industry (energy + process, GHG)',
    unit: 'Mt CO2e (illustrative, indexed)',
    characterisedBy:
      'The net-zero member of an eight-model EU ensemble, driven by a CO2 price rising linearly from $130 (2025) to $580/t (2050). Industry electrifies to ~50% of final energy by 2050 (from ~30% in 2020) with a ~12% hydrogen share; economy-wide electricity reaches ~60%.',
    differsBy: 'Defined by a carbon-price trajectory across 8 models (vs the current-policy NPI and the $80/t C0-80 members); characterises electrification/H2 shares rather than a single CO2 tonnage, so its CO2 line is an illustrative net-zero-by-2050 index.',
    series: [
      { year: 2020, value: 100 },
      { year: 2050, value: 2 },
    ],
  },
  // ─────────── Global pathways ───────────
  {
    id: 'sc-iea-nze',
    label: 'Global industry — IEA NZE 2023',
    ensemble: 'IEA Net Zero Roadmap (2023 update)',
    sourceId: 'iea-nze-2023',
    scenarioClass: '1.5C',
    scope: 'Global industry (direct CO2)',
    unit: 'Mt CO2',
    characterisedBy:
      'The reference global 1.5 °C roadmap: industry direct CO2 from 8,998 Mt (2022) to 440 Mt (2050), with electricity 49% of industrial final energy, hydrogen + CCUS delivering a fifth of 2030–2050 cuts and near-zero routes taking over steel, cement and chemicals.',
    differsBy: 'Global direct-CO2 scope; single normative 1.5 °C pathway (not an ensemble).',
    series: [
      { year: 2022, value: 8998 },
      { year: 2030, value: 7158 },
      { year: 2040, value: 3222 },
      { year: 2050, value: 440 },
    ],
  },
  {
    id: 'sc-ar6-industry',
    label: 'Global industry — AR6 ≤2 °C median',
    ensemble: 'AR6 Scenarios Database (IIASA-hosted)',
    sourceId: 'ipcc-ar6-ch3',
    scenarioClass: '1.5C',
    scope: 'Global industry (direct CO2)',
    unit: 'index (2019 = 100)',
    characterisedBy:
      'The AR6 IAM ensemble’s industry result: across scenarios likely to limit warming to 2 °C and below, industrial CO2 falls a median 70% between 2019 and 2050 (maximum 96%); Chapter 11 puts the sectoral range at 39–94% by mid-century. Plotted as the −70% median (endpoint index 30).',
    differsBy: 'Global direct-CO2 industry median across the full ≤2 °C ensemble (C1–C3 pooled), not a single model run; AR6 publishes it only indexed to 2019, so intermediate years are interpolated.',
    series: [
      { year: 2019, value: 100 },
      { year: 2050, value: 30 },
    ],
  },
  {
    id: 'sc-ar6-c1-intensity',
    label: 'Global — AR6 C1 median (CO2 intensity of primary energy)',
    ensemble: 'AR6 Scenarios Database (IIASA-hosted)',
    sourceId: 'ipcc-ar6-ch3',
    scenarioClass: '1.5C',
    scope: 'Global energy & industrial-process CO2',
    unit: 'index (2020 = 100)',
    characterisedBy:
      'From AR6 Table 3.4: in the C1 category (1.5 °C, no/limited overshoot) the CO2 intensity of primary energy falls to a median 65 (2030) and 8 (2050) on a 2020=100 index (5–95th pct 49–75 and −8–24) — an economy-wide decarbonisation-pace marker.',
    differsBy: 'Economy-wide CO2-intensity index (the closest tabulated, percentile-bearing AR6 series), not an industry-only emissions line.',
    series: [
      { year: 2020, value: 100 },
      { year: 2030, value: 65 },
      { year: 2050, value: 8 },
    ],
  },
  {
    id: 'sc-rissman',
    label: 'Global industry — Rissman et al. (three waves)',
    ensemble: 'Rissman et al. 2020 (review synthesis)',
    sourceId: 'ipcc-ar6-ch11',
    scenarioClass: 'below-2C',
    scope: 'Global industry (direct + indirect GHG)',
    unit: '% of present-day emissions',
    characterisedBy:
      'A three-wave deployment synthesis: commercialised efficiency/electrification to 2035 (−20%), structural shifts — CCS, new cement chemistries — to 2050 (−50%), then zero-carbon hydrogen at scale to 2070 (−80 to −100%).',
    differsBy: 'Global direct+indirect GHG scope; a review-based synthesis rather than a model, reaching net zero later (2070).',
    series: [
      { year: 2020, value: 100 },
      { year: 2035, value: 80 },
      { year: 2050, value: 50 },
      { year: 2070, value: 10 },
    ],
  },
];

/* ── Median across the ensemble (indexed to each pathway's base year) ─────
   Global and EU pathways have incomparable levels, so the median is computed
   on each pathway's OWN base-year index (base = 100). A pathway contributes to
   a target year only if it has a point there (linear interpolation between its
   own points; no extrapolation beyond its range). */

/** Years at which the median is reported. */
export const MEDIAN_YEARS = [2020, 2025, 2030, 2035, 2040, 2045, 2050] as const;

/** Linear-interpolate a scenario's indexed value at `year`, or null if out of range. */
export function indexedValueAt(sc: IndustryScenario, year: number): number | null {
  const pts = sc.series;
  const base = pts[0].value;
  if (base === 0) return null;
  if (year < pts[0].year || year > pts[pts.length - 1].year) return null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (year >= a.year && year <= b.year) {
      const t = b.year === a.year ? 0 : (year - a.year) / (b.year - a.year);
      const v = a.value + t * (b.value - a.value);
      return (v / base) * 100;
    }
  }
  return null;
}

/** The ensemble median indexed pathway across the given scenarios. */
export function ensembleMedian(
  scenarios: IndustryScenario[] = SCENARIOS,
): { year: number; index: number; n: number }[] {
  return MEDIAN_YEARS.map((year) => {
    const vals = scenarios
      .map((s) => indexedValueAt(s, year))
      .filter((v): v is number => v != null)
      .sort((a, b) => a - b);
    if (vals.length === 0) return { year, index: NaN, n: 0 };
    const mid = Math.floor(vals.length / 2);
    const median = vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
    return { year, index: Math.round(median * 10) / 10, n: vals.length };
  }).filter((p) => p.n > 0);
}

/* ── Scenario ensembles / families — "what each is & how it differs" ───────
   A characterisation layer covering both the ensembles plotted above and the
   wider scenario infrastructure the report draws on (some not plotted because
   their industry-CO2 pathways are not published as citable numbers). */

export interface EnsembleFamily {
  id: string;
  name: string;
  operator: string;
  scope: 'Global' | 'EU' | 'EU / Global' | 'National (EU)';
  sourceId: string;
  /** What the ensemble is and what it is characterised by. */
  characterisedBy: string;
  /** How its scenarios differ from one another (the axis of variation). */
  differsBy: string;
  plotted: boolean;
}

export const ENSEMBLE_FAMILIES: EnsembleFamily[] = [
  {
    id: 'ef-ar6',
    name: 'AR6 Scenarios Database',
    operator: 'IIASA / IPCC WGIII',
    scope: 'Global',
    sourceId: 'ar6-db-iiasa',
    characterisedBy:
      'The reference IPCC AR6 ensemble: 3,131 scenarios from 191 modelling frameworks, of which 1,202 are climate-classified into categories C1–C8 by peak/2100 warming. Industry CO2 falls a median 70% (max 96%) from 2019 to 2050 in scenarios ≤2 °C.',
    differsBy:
      'Scenarios differ by warming category (C1 = 1.5 °C no/limited overshoot → C8 > 4 °C), by model family and by socio-economic (SSP) assumptions.',
    plotted: true,
  },
  {
    id: 'ef-engage',
    name: 'ENGAGE',
    operator: 'IIASA-coordinated (H2020)',
    scope: 'Global',
    sourceId: 'engage-2021',
    characterisedBy:
      'A global IAM intercomparison built around carbon-budget logic, quantifying the cost and attainability of stringent targets without overshoot.',
    differsBy:
      'Its defining axis is “net-zero budget” (no overshoot, cumulative CO2 capped at net zero) vs “end-of-century budget” (net-negative emissions and temperature overshoot allowed) — the no-overshoot design peaks up to 0.15 °C lower.',
    plotted: false,
  },
  {
    id: 'ef-navigate',
    name: 'NAVIGATE',
    operator: 'IIASA-hosted (H2020)',
    scope: 'Global',
    sourceId: 'navigate-2023',
    characterisedBy:
      'A next-generation IAM programme adding transformative technological change, distributional/heterogeneity detail and improved sector-level (incl. industry) transformation.',
    differsBy:
      'Scenarios differ by the depth of sectoral/technology detail and by distributional assumptions rather than by a single ambition dial.',
    plotted: false,
  },
  {
    id: 'ef-ecemf',
    name: 'ECEMF (European Climate & Energy Modelling Forum)',
    operator: '8-model EU consortium (incl. PIK)',
    scope: 'EU',
    sourceId: 'ecemf-2025',
    characterisedBy:
      'A Horizon-Europe multi-model comparison of EU climate-neutrality-by-2050 pathways (IMAGE, MESSAGEix-GLOBIOM, PRIMES, PROMETHEUS, REMIND, Euro-Calliope, TIAM-ECN, WITCH). In the net-zero member, industry electrifies to ~50% of final energy by 2050 with a ~12% hydrogen share.',
    differsBy:
      'Scenarios differ by carbon-price trajectory (current-policy NPI, $80/t C0-80, $130→$580/t C400-lin) and by model, revealing the cross-model spread around a common target.',
    plotted: true,
  },
  {
    id: 'ef-ariadne',
    name: 'Kopernikus-Projekt Ariadne (2045)',
    operator: 'PIK (REMIND) + sectoral models',
    scope: 'National (EU)',
    sourceId: 'pik-ariadne-2021',
    characterisedBy:
      'A German climate-neutrality-2045 scenario set coupling REMIND (PIK) with bottom-up sectoral models; additional annual system cost €16–26 bn/yr, with ~€11 bn/yr of that in industry fuel-switching/efficiency.',
    differsBy:
      'Six scenarios span the direct-vs-indirect electrification axis (Elec, H2, Mix) and the demand-transformation axis (LowDem, HighDem, ExPol = existing-policies-only, which misses neutrality).',
    plotted: false,
  },
  {
    id: 'ef-ngfs',
    name: 'NGFS Climate Scenarios (Phase V)',
    operator: 'Academic consortium incl. IIASA & PIK',
    scope: 'Global',
    sourceId: 'ngfs-v5-2024',
    characterisedBy:
      'The reference scenarios for financial-sector climate-risk analysis (v5.0, Nov 2024): GCAM, MESSAGEix-GLOBIOM and REMIND-MAgPIE, updated for policies to March 2024. Most Net-Zero-2050 abatement comes from energy supply and industry.',
    differsBy:
      'Seven scenarios differ by orderly/disorderly/hot-house-world narrative and by transition timing and physical-risk assumptions.',
    plotted: false,
  },
  {
    id: 'ef-scenario-compass',
    name: 'Scenario Compass Initiative',
    operator: 'IIASA + IAMC',
    scope: 'Global',
    sourceId: 'scenario-compass-2025',
    characterisedBy:
      'The 2025 successor to the AR6 database: a curated ensemble of >1,500 global emission scenarios vetted against recent trends plus feasibility and sustainability criteria, with open-source vetting code.',
    differsBy:
      'Adds systematic feasibility/sustainability vetting on top of warming classification — a filtered, quality-controlled successor rather than a new modelling axis.',
    plotted: false,
  },
  {
    id: 'ef-ec-2040',
    name: 'European Commission 2040 Impact Assessment',
    operator: 'European Commission (PRIMES/GAINS)',
    scope: 'EU',
    sourceId: 'ec-2040-ia',
    characterisedBy:
      'The modelling behind the EU 2040 target: three energy-system scenarios (S1/S2/S3) mapped to policy options O1/O2/O3 (−80/−85–90/−90–95% net vs 1990), plus a LIFE demand-side sensitivity. Industry GHG lands at 25–219 Mt in 2040 across the set.',
    differsBy:
      'Scenarios differ by the speed of novel-technology roll-out (hydrogen, carbon capture, industrial removals) and by carbon-capture volume (S1 <100, S2 ~220, S3 ~350 Mt/yr); LIFE substitutes behavioural change for some removals.',
    plotted: true,
  },
  {
    id: 'ef-esabcc-2040',
    name: 'ESABCC 2040 advice',
    operator: 'European Scientific Advisory Board on Climate Change',
    scope: 'EU',
    sourceId: 'esabcc-2040-2023',
    characterisedBy:
      '36 scenarios filtered from >1,000 modelled pathways for feasibility and consistency with a global 1.5 °C carbon budget, underpinning the recommended −90 to −95% 2040 target and an 11–14 Gt 2030–2050 GHG budget.',
    differsBy:
      'Filtered pathways minimise reliance on CO2 removals; three “iconic pathways” illustrate societal-choice variation (demand-side, high-renewables, mixed).',
    plotted: true,
  },
];

/** Years the subsector stacked-area / drill-down reports. */
export const SUBSECTOR_YEARS = [2019, 2025, 2030, 2035, 2040, 2045, 2050] as const;

/** Linear-interpolate a subsector's indexed pathway at `year` (100 = base). */
export function subsectorIndexAt(sub: Subsector, year: number): number | null {
  const pts = sub.pathway;
  if (!pts || pts.length === 0) return null;
  if (year <= pts[0].year) return pts[0].index;
  if (year >= pts[pts.length - 1].year) return pts[pts.length - 1].index;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (year >= a.year && year <= b.year) {
      const t = (year - a.year) / (b.year - a.year);
      return a.index + t * (b.index - a.index);
    }
  }
  return null;
}

/** Absolute subsector emissions (Mt CO2e) at `year` = 2019 level × pathway index. */
export function subsectorValueAt(sub: Subsector, year: number): number {
  if (year <= 2019) return sub.ghg2019;
  const idx = subsectorIndexAt(sub, year);
  if (idx == null) return sub.ghg2019;
  return Math.round(((sub.ghg2019 * idx) / 100) * 10) / 10;
}
