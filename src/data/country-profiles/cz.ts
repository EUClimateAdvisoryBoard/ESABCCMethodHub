/**
 * Czechia — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const cz: CountryProfile = {
  code: 'CZ',
  name: 'Czechia',
  eurostatCode: 'CZ',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 49.8175, lon: 15.4730,
    capital: 'Prague',
    populationM: 10.9,
    areaKkm2: 78.9,
    gdpPerCapitaEur: 24700,
    summary:
      'Czechia is one of the EU\'s most coal-dependent and energy-intensive ' +
      'economies — lignite still supplied ~38% of electricity in 2023, and the ' +
      'industrial structure (steel, chemicals, automotive, cement) remains ' +
      'highly carbon-intensive. The Coal Commission recommended 2038 as the ' +
      'phase-out date in 2020, but the 2022-2023 energy crisis and ČEZ\'s ' +
      'economic outlook have effectively shifted the de-facto exit toward ' +
      '2033 — the 2024 NECP update reflects this acceleration. Climate ' +
      'neutrality is targeted by 2050 (in line with the EU baseline), with ' +
      'a 2030 reduction trajectory anchored on the ESR and ETS pathways ' +
      'rather than a statutory national law.\n\n' +
      'Nuclear power is the strategic pivot: ~36% of electricity in 2023, ' +
      'with the Dukovany 5 unit award (2024) to KHNP marking the largest ' +
      'energy investment decision in modern Czech history. The Karlovy ' +
      'Vary and Ústí nad Labem regions — covered by the EU\'s largest single ' +
      'Just Transition Fund allocation per capita — are the principal arena ' +
      'for industrial restructuring, with significant social and political ' +
      'dimensions.',
    highlights: [
      'Coal still ~38% of electricity (2023); de-facto exit accelerated toward 2033',
      'Dukovany 5 nuclear award (KHNP, 2024) — €15 bn investment',
      '€1.64 bn Just Transition Fund — among largest in EU',
      'No binding national Climate Law — 2050 neutrality in policy, not statute',
      'Industrial intensity among highest in EU — steel, chemicals, automotive',
    ],
  },
  ghg: {
    totalLatest: { value: 109.5, unit: 'Mt CO2e', year: 2023, source: 'CHMI / UNFCCC', sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/greenhouse-gases-viewer-data-viewers?activeAccordion=&country=CZ" },
    total1990: 199.0,
    perCapita: { value: 10.1, unit: 't CO2e/cap', year: 2023, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/total-greenhouse-gas-emission-trends?activeAccordion=546a7c35-9188-4d23-94ee-005d97c26f2b&country=CZ" },
    perGdp: { value: 0.41, unit: 'kg CO2e/€', year: 2023, source: 'EEA', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/sdg_13_10/default/table?lang=en&geo=CZ" },
    target2030: { value: -55, unit: '%', baseline: '1990', notes: 'Implicit EU Climate Law contribution; not transposed into a binding national law.' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Climate-neutral by 2050; aligned with EU baseline.' },
    sectors: [
      { id: 'power',        label: 'Power & heat',   share: 36, absolute: 39.4 },
      { id: 'industry',     label: 'Industry',       share: 25, absolute: 27.4 },
      { id: 'transport',    label: 'Transport',      share: 16, absolute: 17.5 },
      { id: 'buildings',    label: 'Buildings',      share: 10, absolute: 11.0 },
      { id: 'agriculture',  label: 'Agriculture',    share: 7,  absolute: 7.7 },
      { id: 'waste',        label: 'Waste & other',  share: 6,  absolute: 6.5 },
    ],
    trend: [
      { year: 1990, value: 199.0 }, { year: 1995, value: 154.0 },
      { year: 2000, value: 148.7 }, { year: 2005, value: 145.5 },
      { year: 2010, value: 138.5 }, { year: 2015, value: 124.5 },
      { year: 2019, value: 121.2 }, { year: 2020, value: 113.0 },
      { year: 2021, value: 119.0 }, { year: 2022, value: 114.0 },
      { year: 2023, value: 109.5 },
    ],
    narrative:
      'Czech emissions fell sharply in the 1990s with post-communist economic ' +
      'restructuring and have continued a slower decline since. The 2023 drop ' +
      'reflected reduced lignite generation (high EU ETS prices, lower fleet ' +
      'utilisation) and industrial slowdown. The 2030 trajectory is currently ' +
      'projected by the Commission to fall short of the implicit −55% EU ' +
      'contribution without additional measures.',
    status: 'partial',
  },
  renewables: {
    shareLatest: { value: 18.2, unit: '%', year: 2023, source: 'MPO / Eurostat', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en&geo=CZ" },
    share2005: 7.1,
    share2020: 17.7,
    target2030: 30,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 15.5 },
      { id: 'heating',     label: 'Heating & cooling', share: 25.0 },
      { id: 'transport',   label: 'Transport',  share: 8.5 },
    ],
    trend: [
      { year: 2005, value: 7.1 }, { year: 2010, value: 10.5 },
      { year: 2015, value: 14.8 }, { year: 2020, value: 17.7 },
      { year: 2021, value: 17.7 }, { year: 2022, value: 18.2 },
      { year: 2023, value: 18.2 },
    ],
    narrative:
      'Czechia met its 2020 binding RES target (13% by 2020, 17.7% achieved) ' +
      'comfortably, driven by a 2010 PV deployment wave whose tariff overhang ' +
      'still consumes public funding. Modern Renewable Sources Act (2023) ' +
      'restored support for new PV, wind and biomethane and the household-PV ' +
      'New Green Savings scheme has been heavily subscribed. The 30% 2030 ' +
      'target is below the Commission\'s indicative national contribution.',
    status: 'partial',
  },
  efficiency: {
    primary: { value: 41.4, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — primary energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=CZ" },
    final:   { value: 25.6, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — final energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=CZ" },
    intensity: { value: 195, unit: 'kgoe/1000 EUR (2015)', year: 2022, source: "Eurostat (nrg_ind_ei)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ei/default/table?lang=en&geo=CZ" },
    target2030: -20,
    narrative:
      'Energy intensity of GDP is among the highest in the EU, a legacy of ' +
      'energy-intensive industry (steel, chemicals, automotive) and an aged ' +
      'building stock. Final energy consumption has been broadly flat since ' +
      '2015. The New Green Savings (Nová zelená úsporám) building-renovation ' +
      'programme, supported by RRF and Modernisation Fund, is the principal ' +
      'instrument.',
    status: 'partial',
  },
  air: {
    pm25: { value: 14.1, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/czechia-air-pollution-country-fact-sheet-2024" },
    no2:  { value: 14.7, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/czechia-air-pollution-country-fact-sheet-2024" },
    ozone: { value: 51.0, unit: 'µg/m³ (SOMO35)', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/czechia-air-pollution-country-fact-sheet-2024" },
    prematureDeaths: { value: 8200, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/publications/health-impacts-of-air-pollution-in-europe-2024" },
    exceedanceShare: { value: 99, unit: '% urban pop > WHO 5 µg/m³', year: 2022, source: "EEA — Exceedance of air quality standards", sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/exceedance-of-air-quality-standards?activeAccordion=&country=CZ" },
    narrative:
      'Czechia has some of the EU\'s highest PM2.5 exposures, driven by ' +
      'residential solid-fuel boilers (coal, wet wood) and the Ostrava-' +
      'Karviná-Třinec industrial complex in Moravia-Silesia. The 2022 ' +
      'mandatory replacement of pre-1980 solid-fuel boilers (originally ' +
      '2022, postponed to 2025) and the Clean Air Programme are the lead ' +
      'instruments. Trans-boundary pollution with Poland is a recurring issue.',
    status: 'concern',
  },
  water: {
    surfaceWaterGood: { value: 14, unit: '%', year: 2021, source: 'WISE-WFD', sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/czechia" },
    groundwaterGood: { value: 75, unit: '%', year: 2021, source: "WISE-WFD country profile", sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/czechia" },
    bathingWaterExcellent: { value: 65, unit: '%', year: 2023, source: "EEA bathing water reports", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/bathing-water-directive/state-of-bathing-waters?country=CZ" },
    drinkingWaterCompliance: { value: 99.8, unit: '%', year: 2022, source: "EU Drinking Water Directive reporting", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/drinking-water-directive/state-of-drinking-water?country=CZ" },
    narrative:
      'Czechia sits on the European watershed divide and has no significant ' +
      'transboundary water inflows — water-resource resilience is therefore a ' +
      'central adaptation issue. Surface-water ecological status is poor ' +
      '(~14% good) due to agricultural diffuse pollution (nitrates, pesticides) ' +
      'and morphological alterations. The 2015-19 drought episode reset ' +
      'water-resource planning priorities.',
    status: 'concern',
  },
  biodiversity: {
    natura2000Land: { value: 14.0, unit: '% land', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=CZ" },
    natura2000Marine: { value: 0, unit: '% EEZ', year: 2023, source: 'Landlocked', sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=CZ" },
    threatenedSpecies: { value: 670, unit: 'IUCN red-list', year: 2022, source: "IUCN Red List — national totals", sourceUrl: "https://www.iucnredlist.org/search?searchType=species&landRegions=CZ" },
    habitatsFavourable: { value: 14, unit: '%', year: 2019, source: 'Art. 17 reporting', sourceUrl: "https://www.eea.europa.eu/themes/biodiversity/state-of-nature-in-the-eu/article-17-national-summary-dashboards/czechia" },
    narrative:
      'Natura 2000 land coverage at ~14% is below the EU-27 average; only ~14% ' +
      'of habitats achieve favourable status — the lowest decile in the EU. ' +
      'The 2018-2020 bark-beetle outbreak devastated ~120,000 ha of spruce ' +
      'monocultures, prompting forest-policy reform toward mixed, more ' +
      'resilient stands. Agricultural-intensification pressure on farmland ' +
      'biodiversity remains a leading driver.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 43, unit: '%', year: 2022, source: "Eurostat (cei_wm011)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_wm011/default/table?lang=en&geo=CZ" },
    circularMaterialUseRate: { value: 13.0, unit: '%', year: 2022, source: "Eurostat (cei_srm030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_srm030/default/table?lang=en&geo=CZ" },
    resourceProductivity: { value: 1.5, unit: '€/kg', year: 2022, source: "Eurostat (cei_pc030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_pc030/default/table?lang=en&geo=CZ" },
    narrative:
      'Municipal recycling at ~43% is below the 55% 2025 target; landfill share ' +
      '(~46%) remains high. The 2021 Waste Act (541/2020) sets a landfill ban ' +
      'on recyclable and recoverable waste from 2030 and increases gate fees. ' +
      'The Circular Czechia 2040 strategy (2021) frames the medium-term ambition.',
    status: 'partial',
  },
  adaptation: {
    strategy: {
      title: 'Strategie přizpůsobení se změně klimatu v ČR (National Adaptation Strategy)',
      adoptedYear: 2015,
      lastUpdate: 2021,
      url: 'https://www.mzp.cz/cz/zmena_klimatu_adaptacni_strategie',
    },
    keyRisks: [
      'Drought and water scarcity (Moravian lowlands, Polabí)',
      'Flash flooding and pluvial flooding in urban areas',
      'Forest dieback (spruce bark-beetle, drought) — ongoing reconstruction',
      'Agricultural productivity volatility and soil erosion',
      'Heatwaves and urban heat-island excess mortality (Prague, Brno)',
    ],
    sectoralPlans: [
      'Forestry',
      'Water management',
      'Agriculture',
      'Urban and built environment',
      'Health',
      'Biodiversity and ecosystems',
    ],
    narrative:
      'The 2015 adaptation strategy was updated in 2021 to integrate the ' +
      '2018-2020 drought and bark-beetle outbreak as defining stressors. ' +
      'The strategy emphasises landscape-water-retention measures (small ' +
      'reservoirs, wetland restoration, paludiculture) and mixed-stand forest ' +
      'conversion. The Operational Programme Environment 2021-27 envelope ' +
      'finances most measures.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-11',
    finalSubmitted: '2024-11',
    commissionAssessment:
      'Commission assessment (Dec 2023) found the Czech NECP fell short on ' +
      'renewables ambition (30% target below indicative national contribution), ' +
      'and noted insufficient policy detail on the coal phase-out, transport ' +
      'decarbonisation, and the LULUCF balance post-bark-beetle. The 2040 climate ' +
      'objective treatment was found to be thin.',
    esabccCommentary:
      'Czechia is in the middle of a structural energy-system transition: coal ' +
      'exit (de-facto 2033), nuclear expansion (Dukovany 5, possible Temelín 3/4), ' +
      'and Just Transition restructuring in three north-western regions. ESABCC ' +
      'notes the absence of a binding national Climate Law leaves implementation ' +
      'discretion broad. The LULUCF balance has shifted to a net source as a ' +
      'consequence of the bark-beetle outbreak — material implications for ' +
      'effort-sharing accounting.',
    gaps: [
      'Renewables 2030 target (30%) below Commission indicative national contribution',
      'Coal phase-out date and security-of-supply arrangements not in statute',
      'LULUCF sector net-source position post bark-beetle outbreak',
      'Transport decarbonisation pathway thin — EV deployment lags trajectory',
      'No binding national Climate Law / sectoral budget framework',
    ],
    status: 'off-track',
  },
  justTransition: {
    jtfAllocationEurM: 1640,
    regions: [
      'Karlovy Vary (lignite, ceramics, glass)',
      'Ústí nad Labem (lignite, chemicals, energy)',
      'Moravia-Silesia (hard coal — OKD mining closure, steel restructuring)',
    ],
    narrative:
      'Czechia\'s €1.64 bn Just Transition Fund allocation is among the largest ' +
      'in the EU. The three covered regions account for ~17% of national ' +
      'population and host the bulk of coal mining, lignite power and energy-' +
      'intensive industry. The TJTPs prioritise SME diversification, brownfield ' +
      'remediation, reskilling and renewable / hydrogen pilots. OKD\'s hard-coal ' +
      'mining closure (Ostrava, Karviná) is the politically most sensitive component.',
  },
  policies: [
    {
      name: 'Climate Protection Policy (KOPK)',
      year: 2017,
      summary: 'Strategic framework targeting climate neutrality by 2050; non-binding but anchors sectoral policies.',
    },
    {
      name: 'State Energy Concept (ASEK)',
      year: 2024,
      summary: 'Long-term energy strategy update reflecting coal phase-out acceleration, nuclear new-build (Dukovany 5) and renewable expansion to 2050.',
    },
    {
      name: 'Modern Renewable Sources Act',
      year: 2023,
      summary: 'Reformed support framework for new RES — auctions for wind and large PV, premium tariffs for biomethane, community energy enabling provisions.',
    },
    {
      name: 'New Green Savings (Nová zelená úsporám)',
      year: 2014,
      summary: 'Flagship building renovation and household-PV / heat-pump programme funded from EU ETS / RRF / Modernisation Fund.',
    },
    {
      name: 'Waste Act (541/2020)',
      year: 2020,
      summary: 'Landfill ban on recyclable and recoverable waste from 2030; raised gate fees and producer-responsibility framework.',
    },
    {
      name: 'Air Protection Programme (HOZE)',
      year: 2020,
      summary: 'National air-quality framework including replacement of pre-1980 solid-fuel boilers in households and emission limits for combustion plants.',
    },
    {
      name: 'Circular Czechia 2040',
      year: 2021,
      summary: 'National circular economy strategy with 2030 / 2040 milestones, secondary raw materials, eco-design and product policy actions.',
    },
  ],
  watchNotes:
    '• Dukovany 5 nuclear: KHNP contract execution and financing structure (state guarantee, ' +
    'EU state-aid clearance) remain to be finalised; possible Temelín 3/4 follow-on.\n' +
    '• Coal exit date: implicit 2033 in the 2024 NECP / ASEK but no statutory commitment; ' +
    'depends on ČEZ profitability of remaining lignite fleet under high EU ETS prices.\n' +
    '• Climate Law: no binding national Klimagesetz-equivalent has been tabled; activists ' +
    'and Constitutional Court litigation may shift the position.\n' +
    '• Bark-beetle and LULUCF: net-source position post-2018 outbreak distorts EU ' +
    'effort-sharing accounting; reforestation success critical for 2030 outlook.',
};

export default cz;
