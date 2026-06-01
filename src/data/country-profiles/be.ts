/**
 * Belgium — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const be: CountryProfile = {
  code: 'BE',
  name: 'Belgium',
  eurostatCode: 'BE',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 50.5039, lon: 4.4699,
    capital: 'Brussels',
    populationM: 11.7,
    areaKkm2: 30.5,
    gdpPerCapitaEur: 45200,
    summary:
      'Belgium\'s climate policy operates under a uniquely fragmented federal ' +
      'architecture: the three Regions (Flanders, Wallonia, Brussels-Capital) hold ' +
      'most climate competences (energy, transport, buildings, agriculture, ' +
      'industry permitting), while the federal government retains nuclear, offshore ' +
      'wind, product policy and the ETS interface. The 2018 cooperation-agreement ' +
      'framework distributes the national effort but has repeatedly delayed NECP ' +
      'submissions; the 2023 draft NECP was submitted without the federal share ' +
      'agreed between governments.\n\n' +
      'Belgium is heavily industrial — Antwerp port hosts Europe\'s second-largest ' +
      'petrochemical cluster — and the 2003 Nuclear Phase-out Law was partially ' +
      'reversed in 2022 with a 10-year extension of Doel 4 and Tihange 3 to 2035 ' +
      'in response to the gas crisis. Climate ambition has lagged peer Member States, ' +
      'with the Commission flagging Belgium\'s NECP as the EU\'s second-weakest in ' +
      'its 2024 assessment.',
    highlights: [
      '2030 ESR target: −47% non-ETS vs 2005 (one of the steepest in the EU)',
      'Climate neutrality by 2050 (federal goal); Flanders 2050, Wallonia 2050, Brussels 2050',
      'Nuclear phase-out partially reversed: Doel 4 / Tihange 3 extended to 2035',
      'Commission flagged 2023 draft NECP as among the weakest in EU-27',
      'Offshore wind: ~2.3 GW operational; second zone (Princess Elisabeth) to add 3.5 GW',
    ],
  },
  ghg: {
    totalLatest: { value: 108, unit: 'Mt CO2e', year: 2023, source: 'EEA / UNFCCC', sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/greenhouse-gases-viewer-data-viewers?activeAccordion=&country=BE" },
    total1990: 146,
    perCapita: { value: 9.2, unit: 't CO2e/cap', year: 2023, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/total-greenhouse-gas-emission-trends?activeAccordion=546a7c35-9188-4d23-94ee-005d97c26f2b&country=BE" },
    perGdp: { value: 0.20, unit: 'kg CO2e/€', year: 2023, source: 'EEA', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/sdg_13_10/default/table?lang=en&geo=BE" },
    target2030: { value: -47, unit: '%', baseline: '2005 (ESR)', notes: 'EU Effort Sharing Regulation 2030 target; economy-wide goal ~-55% vs 1990 implied.' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Climate neutrality goal stated in federal long-term strategy; not yet in statute.' },
    sectors: [
      { id: 'industry',     label: 'Industry',      share: 30, absolute: 32 },
      { id: 'transport',    label: 'Transport',     share: 22, absolute: 24 },
      { id: 'power',        label: 'Power & heat',  share: 17, absolute: 18 },
      { id: 'buildings',    label: 'Buildings',     share: 18, absolute: 19 },
      { id: 'agriculture',  label: 'Agriculture',   share: 10, absolute: 11 },
      { id: 'waste',        label: 'Waste & other', share: 3,  absolute: 4 },
    ],
    trend: [
      { year: 1990, value: 146 }, { year: 1995, value: 152 },
      { year: 2000, value: 150 }, { year: 2005, value: 144 },
      { year: 2010, value: 131 }, { year: 2015, value: 119 },
      { year: 2019, value: 117 }, { year: 2020, value: 108 },
      { year: 2021, value: 117 }, { year: 2022, value: 113 },
      { year: 2023, value: 108 },
    ],
    narrative:
      'Total emissions are down ~26% from 1990 — well behind the EU-27 average — and ' +
      'have flat-lined for a decade outside crisis-driven dips (COVID 2020, gas price ' +
      'shock 2022-23). The Antwerp petrochemical and refining cluster is the single ' +
      'largest industrial concentration, with major decarbonisation projects (Antwerp@C ' +
      'CCS hub, BASF/INEOS electrification) hinging on hydrogen and CO₂ infrastructure. ' +
      'The ESR sector (non-ETS) faces a particularly steep −47% trajectory.',
    status: 'off-track',
  },
  renewables: {
    shareLatest: { value: 14.7, unit: '%', year: 2023, source: 'Eurostat', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en&geo=BE" },
    share2005: 2.3,
    share2020: 13.0,
    target2030: 21.7,
    bySubsector: [
      { id: 'electricity', label: 'Electricity',       share: 28.0 },
      { id: 'heating',     label: 'Heating & cooling', share: 9.5 },
      { id: 'transport',   label: 'Transport',         share: 11.0 },
    ],
    trend: [
      { year: 2005, value: 2.3 }, { year: 2010, value: 6.0 },
      { year: 2015, value: 8.0 }, { year: 2020, value: 13.0 },
      { year: 2021, value: 13.1 }, { year: 2022, value: 13.8 },
      { year: 2023, value: 14.7 },
    ],
    narrative:
      'Belgium hit its 13% 2020 RES target only with statistical transfers from Denmark ' +
      'and Luxembourg. The 2030 target of 21.7% in the NECP is below the indicative ' +
      'RED III share derived from the EU formula (~33%); the Commission has formally ' +
      'asked Belgium to raise its 2030 ambition. Offshore wind in the North Sea (~2.3 ' +
      'GW) is the success story; the second Princess Elisabeth zone (3.5 GW) will be ' +
      'auctioned 2024-2025 and grid-connected via an offshore energy island.',
    status: 'off-track',
  },
  efficiency: {
    primary: { value: 47, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — primary energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=BE" },
    final:   { value: 35, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — final energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=BE" },
    intensity: { value: 105, unit: 'kgoe/1000 EUR (2015)', year: 2022, source: "Eurostat (nrg_ind_ei)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ei/default/table?lang=en&geo=BE" },
    target2030: -19,
    narrative:
      'Final energy consumption is broadly flat since 2010 despite GDP growth. Building ' +
      'stock is the second-oldest in the EU (much built pre-1945); regional renovation ' +
      'roadmaps (Flanders, Wallonia) target near-zero-energy averages by 2050 but ' +
      'current renovation rates (~1%/yr) fall short. The Federal Energy Vision and ' +
      'regional energy plans target a combined ~19% final-energy reduction by 2030.',
    status: 'off-track',
  },
  air: {
    pm25: { value: 11.6, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/belgium-air-pollution-country-fact-sheet-2024" },
    no2:  { value: 17.5, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/belgium-air-pollution-country-fact-sheet-2024" },
    ozone: { value: 47.0, unit: 'µg/m³ (SOMO35)', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/belgium-air-pollution-country-fact-sheet-2024" },
    prematureDeaths: { value: 6900, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/publications/health-impacts-of-air-pollution-in-europe-2024" },
    exceedanceShare: { value: 98, unit: '% urban pop > WHO 5 µg/m³', year: 2022, source: "EEA — Exceedance of air quality standards", sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/exceedance-of-air-quality-standards?activeAccordion=&country=BE" },
    narrative:
      'High-density population, heavy traffic and intensive livestock farming combine ' +
      'with proximity to the Ruhr / Randstad to give Belgium some of Europe\'s highest ' +
      'population-weighted PM2.5 exposure. Brussels and Antwerp Low Emission Zones have ' +
      'cut urban NO₂ since 2018; the regions are coordinating Air-Quality Action Plans ' +
      'aligned with the new Ambient Air Quality Directive limits.',
    status: 'concern',
  },
  water: {
    surfaceWaterGood: { value: 0, unit: '%', year: 2021, source: 'WISE-WFD', sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/belgium" },
    groundwaterGood: { value: 79, unit: '%', year: 2021, source: "WISE-WFD country profile", sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/belgium" },
    bathingWaterExcellent: { value: 79, unit: '%', year: 2023, source: "EEA bathing water reports", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/bathing-water-directive/state-of-bathing-waters?country=BE" },
    drinkingWaterCompliance: { value: 99, unit: '%', year: 2022, source: "EU Drinking Water Directive reporting", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/drinking-water-directive/state-of-drinking-water?country=BE" },
    narrative:
      'Surface-water ecological status is essentially at zero "good" — the lowest in ' +
      'the EU together with the Netherlands — reflecting nitrate/phosphate pressures, ' +
      'pharmaceutical residues and morphological alterations in a densely-engineered ' +
      'river system. The 3rd River Basin Management Plans acknowledge the 2027 WFD ' +
      'deadline will be missed for almost all water bodies.',
    status: 'concern',
  },
  biodiversity: {
    natura2000Land: { value: 12.7, unit: '% land', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=BE" },
    natura2000Marine: { value: 37, unit: '% EEZ', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=BE" },
    threatenedSpecies: { value: 950, unit: 'IUCN red-list', year: 2022, source: "IUCN Red List — national totals", sourceUrl: "https://www.iucnredlist.org/search?searchType=species&landRegions=BE" },
    habitatsFavourable: { value: 17, unit: '%', year: 2019, source: 'Art. 17 reporting', sourceUrl: "https://www.eea.europa.eu/themes/biodiversity/state-of-nature-in-the-eu/article-17-national-summary-dashboards/belgium" },
    narrative:
      'Natura 2000 land coverage at ~13% is among the lowest in the EU and habitat ' +
      'favourable-status assessments cover only ~17% — pressured by fragmentation, ' +
      'agricultural intensification (especially in Flanders) and nitrogen deposition. ' +
      'A Flemish "PAS" (nitrogen) decree was adopted 2023 with significant farm-buyout ' +
      'instruments around vulnerable Natura 2000 sites.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 55, unit: '%', year: 2022, source: "Eurostat (cei_wm011)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_wm011/default/table?lang=en&geo=BE" },
    circularMaterialUseRate: { value: 22.2, unit: '%', year: 2022, source: "Eurostat (cei_srm030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_srm030/default/table?lang=en&geo=BE" },
    resourceProductivity: { value: 3.3, unit: '€/kg', year: 2022, source: "Eurostat (cei_pc030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_pc030/default/table?lang=en&geo=BE" },
    narrative:
      'Circular material use rate (~22%) is the second-highest in the EU after the ' +
      'Netherlands. Flanders (OVAM) is a long-standing reference for circular-economy ' +
      'governance — its Materials Programme dates to 2012 — with leading regulatory ' +
      'instruments on construction materials, plastics and end-of-life vehicles.',
    status: 'on-track',
  },
  adaptation: {
    strategy: {
      title: 'National Adaptation Plan 2017-2020 (NAP) + regional plans',
      adoptedYear: 2017,
      lastUpdate: 2023,
      url: 'https://climat.be/politique-climatique/belge/adaptation',
    },
    keyRisks: [
      'Coastal flooding and storm surge (Belgian coast, ~67 km)',
      'River and pluvial flooding (Meuse and Vesdre — July 2021 catastrophic floods, 39 deaths)',
      'Urban heat in Brussels, Antwerp and Ghent',
      'Drought stress on cropland and ecosystems (recurrent post-2018)',
      'Forest stress and biodiversity loss in Ardennes',
    ],
    sectoralPlans: [
      'Water management',
      'Spatial planning',
      'Health',
      'Agriculture',
      'Biodiversity',
    ],
    narrative:
      'Belgian adaptation governance is split across federal and three regional ' +
      'plans — coordination is provided by the National Climate Commission. The July ' +
      '2021 Meuse/Vesdre floods (estimated €2.8bn damages, 39 deaths in Wallonia) ' +
      'were a turning point and led to the 2022 Wallonia Reconstruction and Resilience ' +
      'Plan, with €1.5bn for flood-risk infrastructure and risk-zoning reform.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-11',
    finalSubmitted: '2024-09',
    commissionAssessment:
      'Commission assessment (Dec 2023) judged the Belgian draft NECP as among the ' +
      'weakest in the EU: insufficient overall ambition vs the 2030 ESR target, no ' +
      'agreed federal-regional burden-sharing of the −47% effort, renewables target ' +
      'well below the EU formula, and a fragmentary energy-efficiency policy mix.',
    esabccCommentary:
      'The dominant risk is governance: federal-regional cooperation agreements have ' +
      'repeatedly slipped, and the final NECP submitted Sep 2024 still does not ' +
      'allocate the −47% ESR effort across the three Regions. ESR compliance buying ' +
      'flexibilities from over-performing Member States may become necessary.',
    gaps: [
      'No agreed federal-regional burden-sharing for the 2030 ESR target',
      'Renewables 2030 target (21.7%) materially below the EU RED III-derived formula',
      'Industrial decarbonisation pathway depends on Antwerp@C CCS timing and hydrogen import',
      'Transport pathway lacks quantified phase-out of company-car fossil incentives',
      'Buildings-renovation rate well below the 2030 indicative trajectory',
    ],
    status: 'off-track',
  },
  justTransition: {
    jtfAllocationEurM: 167,
    regions: [
      'Hainaut (Wallonia industrial restructuring)',
      'Limburg / Antwerp (Flanders industrial cluster)',
    ],
    narrative:
      'JTF allocation focuses on the historical coal/steel basin in Hainaut (Wallonia) ' +
      'and on the just-transition of the chemical and refining cluster around ' +
      'Antwerp/Limburg. Programme co-funds reskilling for hydrogen and process-' +
      'electrification jobs in the Antwerp@C consortium.',
  },
  policies: [
    {
      name: 'Cooperation Agreement on burden-sharing (2013/2018)',
      year: 2018,
      summary: 'Federal-regional framework distributing climate effort and revenues across the three Regions; renewal under negotiation for 2030 framework.',
    },
    {
      name: 'Federal Long-Term Climate Strategy 2050',
      year: 2020,
      summary: 'Sets indicative climate-neutrality pathway by 2050; not (yet) anchored in federal climate-act statute.',
    },
    {
      name: 'Flemish Climate Plan (Vlaams Klimaatplan 2021-2030)',
      year: 2021,
      summary: 'Regional implementation plan with measures on buildings (EPC obligations), transport (LEV mandates) and agriculture (PAS).',
    },
    {
      name: 'Walloon Air-Climate-Energy Plan (PACE 2030)',
      year: 2023,
      summary: 'Sets Wallonia\'s contribution to 2030 with sectoral measures on heat networks, building renovation and rail freight.',
    },
    {
      name: 'Nuclear Phase-out Amendment Act',
      year: 2022,
      summary: 'Extends operation of Doel 4 and Tihange 3 to 2035, partially reversing the 2003 phase-out law; agreed with Engie in 2023.',
    },
    {
      name: 'Marine Spatial Plan 2020-2026',
      year: 2019,
      summary: 'Designates the Princess Elisabeth offshore wind zone (3.5 GW) and the artificial offshore energy island.',
    },
    {
      name: 'Flanders Nitrogen Decree (PAS)',
      year: 2023,
      summary: 'Regional nitrogen abatement decree with buyout, extensification and permitting measures around Natura 2000 sites.',
    },
  ],
  watchNotes:
    '• Federal-regional cooperation-agreement renewal for the 2030 framework is the single most ' +
    'important governance signal — repeatedly delayed since 2021.\n' +
    '• Klimaatzaak v Belgium (Brussels Court of Appeal, 2023) found the federal state and Flanders/Brussels ' +
    'in breach of climate due-diligence duties; Wallonia found compliant. On further appeal.\n' +
    '• Antwerp@C CCS hub FID and CO₂ export pipelines to Norway (Northern Lights) are central to the ' +
    'industrial-decarbonisation pathway; pilot operations 2026-2027.',
};

export default be;
