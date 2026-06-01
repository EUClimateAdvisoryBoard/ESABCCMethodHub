/**
 * Lithuania — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const lt: CountryProfile = {
  code: 'LT',
  name: 'Lithuania',
  eurostatCode: 'LT',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 55.1694, lon: 23.8813,
    capital: 'Vilnius',
    populationM: 2.86,
    areaKkm2: 65.3,
    gdpPerCapitaEur: 21000,
    summary:
      'Lithuania is a post-nuclear economy whose decarbonisation arithmetic was reset ' +
      'in 2009 by the closure of the Ignalina nuclear power plant — historically the ' +
      'source of ~70% of Lithuanian electricity. Since then, Lithuania has been a net ' +
      'electricity importer, a position the country is reversing with a major onshore ' +
      'and offshore wind programme. Total greenhouse-gas emissions of ~20 Mt CO2e are ' +
      '~54% below 1990 levels. The February 2025 Baltic desynchronisation from the ' +
      'Russian BRELL grid and synchronisation with the European continental network ' +
      'is the defining electricity-system event of the decade.\n\n' +
      'The 2021 Climate Change Management Law and the 2024 update of the National ' +
      'Energy Independence Strategy set climate neutrality by 2050 and a 90% RES ' +
      'electricity share by 2030. Lithuania is procuring 1.4 GW of offshore wind ' +
      '(two areas) and accelerating PV through net-billing reform. Transport ' +
      'emissions remain the binding non-ETS challenge.',
    highlights: [
      'Climate neutrality by 2050 (Climate Change Management Law, 2021)',
      'Baltic synchronisation with continental European grid completed Feb 2025',
      '1.4 GW offshore-wind tender (first auction concluded 2023)',
      '90% renewable electricity by 2030 target in updated NEIS',
    ],
  },
  ghg: {
    totalLatest: { value: 19.5, unit: 'Mt CO2e', year: 2022, source: 'EEA / UNFCCC', sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/greenhouse-gases-viewer-data-viewers?activeAccordion=&country=LT" },
    total1990: 42.3,
    perCapita: { value: 6.8, unit: 't CO2e/cap', year: 2022, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/total-greenhouse-gas-emission-trends?activeAccordion=546a7c35-9188-4d23-94ee-005d97c26f2b&country=LT" },
    perGdp: { value: 0.30, unit: 'kg CO2e/€', year: 2022, source: 'EEA', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/sdg_13_10/default/table?lang=en&geo=LT" },
    target2030: { value: -21, unit: '%', baseline: '2005', notes: 'ESR 2030 target under Fit-for-55.' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Climate neutrality by 2050 (Climate Change Management Law, 2021).' },
    sectors: [
      { id: 'transport',      label: 'Transport',     share: 31, absolute: 6.0 },
      { id: 'agriculture',    label: 'Agriculture',   share: 22, absolute: 4.3 },
      { id: 'industry',       label: 'Industry',      share: 15, absolute: 2.9 },
      { id: 'power',          label: 'Power & heat',  share: 13, absolute: 2.5 },
      { id: 'buildings',      label: 'Buildings',     share: 13, absolute: 2.5 },
      { id: 'waste',          label: 'Waste & other', share: 6,  absolute: 1.2 },
    ],
    trend: [
      { year: 1990, value: 42.3 }, { year: 1995, value: 19.8 },
      { year: 2000, value: 17.0 }, { year: 2005, value: 20.5 },
      { year: 2010, value: 19.6 }, { year: 2015, value: 19.2 },
      { year: 2019, value: 20.5 }, { year: 2020, value: 19.7 },
      { year: 2021, value: 20.3 }, { year: 2022, value: 19.5 },
      { year: 2023, value: 18.8 },
    ],
    narrative:
      'Emissions have been broadly flat since 2005 at ~19-20 Mt, masking sectoral ' +
      'divergence: power-sector emissions fell sharply after Ignalina closure (but ' +
      'are now rising slightly with peaking gas), transport has grown ~30% since 2005 ' +
      'driven by transit traffic and a high-age vehicle fleet, and agriculture ' +
      'emissions have inched upward with herd expansion. The 2030 ESR target ' +
      'requires a ~3 Mt cut from current levels in the non-ETS sectors.',
    status: 'partial',
  },
  renewables: {
    shareLatest: { value: 28.2, unit: '%', year: 2022, source: 'Eurostat SHARES', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en&geo=LT" },
    share2005: 16.8,
    share2020: 26.8,
    target2030: 55,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 30.0 },
      { id: 'heating',     label: 'Heating & cooling', share: 51.0 },
      { id: 'transport',   label: 'Transport',  share: 6.4 },
    ],
    trend: [
      { year: 2005, value: 16.8 }, { year: 2010, value: 19.6 },
      { year: 2015, value: 25.7 }, { year: 2020, value: 26.8 },
      { year: 2021, value: 28.2 }, { year: 2022, value: 28.2 },
      { year: 2023, value: 31.0 },
    ],
    narrative:
      'Biomass district heating provides the bulk of the RES share. Wind capacity ' +
      'has grown rapidly (~1.5 GW onshore in 2023) and the first offshore tender ' +
      '(700 MW, awarded to Ignitis-Ocean Winds, 2023) targets commissioning 2030. ' +
      'PV deployment surged after the 2019 prosumer reform — small-scale solar passed ' +
      '1 GW in 2023. The 2030 target of 55% is ambitious but supported by ' +
      'declared pipeline.',
    status: 'on-track',
  },
  efficiency: {
    primary: { value: 6.9, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — primary energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=LT" },
    final:   { value: 5.8, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — final energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=LT" },
    intensity: { value: 122, unit: 'kgoe/1000 EUR (2015)', year: 2022, source: "Eurostat (nrg_ind_ei)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ei/default/table?lang=en&geo=LT" },
    target2030: -22,
    narrative:
      'Energy intensity has fallen ~40% since 2005, but final-energy consumption is ' +
      'flat as economic growth absorbs efficiency gains. Building renovation is the ' +
      'priority area — Lithuania\'s multi-apartment renovation programme is a ' +
      'recognised model among CEE member states. Tax incentives for low-emission ' +
      'vehicles are recent additions to the efficiency policy mix.',
    status: 'partial',
  },
  air: {
    pm25: { value: 12.0, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/lithuania-air-pollution-country-fact-sheet-2024" },
    no2:  { value: 13.5, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/lithuania-air-pollution-country-fact-sheet-2024" },
    ozone: { value: 47.0, unit: 'µg/m³ (SOMO35)', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/lithuania-air-pollution-country-fact-sheet-2024" },
    prematureDeaths: { value: 2600, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/publications/health-impacts-of-air-pollution-in-europe-2024" },
    exceedanceShare: { value: 96, unit: '% urban pop > WHO 5 µg/m³', year: 2022, source: "EEA — Exceedance of air quality standards", sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/exceedance-of-air-quality-standards?activeAccordion=&country=LT" },
    narrative:
      'PM2.5 levels are driven by residential biomass combustion and a high-age diesel ' +
      'vehicle fleet, especially in Vilnius and Kaunas. The National Air Pollution ' +
      'Control Programme (2019, updated 2023) targets a 36% reduction in PM2.5 ' +
      'emissions by 2030; the new Ambient Air Quality Directive will require further ' +
      'action.',
    status: 'partial',
  },
  water: {
    surfaceWaterGood: { value: 50, unit: '%', year: 2021, source: 'WISE-WFD', sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/lithuania" },
    groundwaterGood: { value: 92, unit: '%', year: 2021, source: "WISE-WFD country profile", sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/lithuania" },
    bathingWaterExcellent: { value: 76, unit: '%', year: 2023, source: "EEA bathing water reports", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/bathing-water-directive/state-of-bathing-waters?country=LT" },
    drinkingWaterCompliance: { value: 99, unit: '%', year: 2022, source: "EU Drinking Water Directive reporting", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/drinking-water-directive/state-of-drinking-water?country=LT" },
    narrative:
      'Surface waters are pressured by nutrient runoff from intensive agriculture in ' +
      'the central plain. Groundwater status is good. Curonian Lagoon eutrophication ' +
      'and Baltic Sea inputs are key transboundary issues addressed through HELCOM ' +
      'commitments.',
    status: 'partial',
  },
  biodiversity: {
    natura2000Land: { value: 12.8, unit: '% land', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=LT" },
    natura2000Marine: { value: 17.0, unit: '% EEZ', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=LT" },
    threatenedSpecies: { value: 660, unit: 'IUCN red-list', year: 2022, source: "IUCN Red List — national totals", sourceUrl: "https://www.iucnredlist.org/search?searchType=species&landRegions=LT" },
    habitatsFavourable: { value: 34, unit: '%', year: 2019, source: 'Art. 17 reporting', sourceUrl: "https://www.eea.europa.eu/themes/biodiversity/state-of-nature-in-the-eu/article-17-national-summary-dashboards/lithuania" },
    narrative:
      'Natura 2000 terrestrial coverage at ~13% is below the EU average. Forest ' +
      'biodiversity is the priority area, with old-growth stands declining. The ' +
      '2024 forest-management law revision introduced longer rotation periods and ' +
      'strengthened restrictions on clear-cutting in protected areas.',
    status: 'partial',
  },
  circular: {
    municipalRecycling: { value: 43, unit: '%', year: 2022, source: "Eurostat (cei_wm011)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_wm011/default/table?lang=en&geo=LT" },
    circularMaterialUseRate: { value: 4.8, unit: '%', year: 2022, source: "Eurostat (cei_srm030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_srm030/default/table?lang=en&geo=LT" },
    resourceProductivity: { value: 1.0, unit: '€/kg', year: 2022, source: "Eurostat (cei_pc030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_pc030/default/table?lang=en&geo=LT" },
    narrative:
      'Recycling rates have improved from a low base but Lithuania is at risk of ' +
      'missing the 2025 (55%) target. The Deposit Return Scheme launched in 2016 is ' +
      'considered an EU good-practice example, achieving ~92% return rates for ' +
      'beverage packaging.',
    status: 'partial',
  },
  adaptation: {
    strategy: {
      title: 'National Climate Change Management Agenda',
      adoptedYear: 2021,
      lastUpdate: 2023,
      url: 'https://am.lrv.lt/en',
    },
    keyRisks: [
      'Forest fires and pest outbreaks in pine-dominated stands',
      'Coastal erosion of the Curonian Spit (UNESCO site) and Klaipėda area',
      'Flooding (Nemunas basin) and pluvial flooding in urban catchments',
      'Heat-waves and urban heat-island effects in Vilnius, Kaunas, Klaipėda',
      'Drought stress on agriculture in central Lithuania',
    ],
    sectoralPlans: [
      'Agriculture',
      'Water management',
      'Forestry',
      'Spatial planning',
      'Public health',
    ],
    narrative:
      'The integrated Climate Change Management Agenda combines mitigation and ' +
      'adaptation policy in a single framework. The 2023 update strengthens the ' +
      'risk-assessment basis and adds Klaipėda-port resilience as a priority. ' +
      'Curonian Spit erosion is a flagship coastal adaptation programme.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-07',
    finalSubmitted: '2024-09',
    commissionAssessment:
      'The Commission assessment (Dec 2023) judged the Lithuanian NECP partially ' +
      'aligned with Fit-for-55, praising the renewables ambition but flagging gaps ' +
      'in transport policy detail, ambiguous treatment of biomass sustainability and ' +
      'limited industrial decarbonisation measures.',
    esabccCommentary:
      'Lithuania\'s updated NEIS (2024) is one of the most ambitious RES strategies in ' +
      'the EU; ESABCC notes its credibility depends on offshore wind tender ' +
      'execution, transmission build-out and storage to manage post-synchronisation ' +
      'balancing. Transport remains the binding ESR constraint.',
    gaps: [
      'Transport: residual ESR gap of ~1-2 Mt CO2e with announced measures',
      'Biomass sustainability: limited treatment of LULUCF-energy interactions',
      'Industrial decarbonisation: no quantified pathway for energy-intensive sectors',
      'Just-transition: limited measures for Vilnius CHP / district-heating fuel switch',
    ],
    status: 'partial',
  },
  justTransition: {
    jtfAllocationEurM: 249,
    regions: [
      'Klaipėda County',
      'Marijampolė and Tauragė counties',
    ],
    narrative:
      'JTF supports peat-extraction phase-down in southwestern counties and ' +
      'restructuring of energy-intensive industry in the Klaipėda port area. ' +
      'SME diversification and workforce reskilling are the main mechanisms.',
  },
  policies: [
    {
      name: 'Climate Change Management Law',
      year: 2021,
      summary: 'Framework climate law enshrining 2050 net-zero target, MRV obligations and the Climate Change Management Agenda.',
    },
    {
      name: 'National Energy Independence Strategy (NEIS)',
      year: 2018,
      summary: '2024 update sets 90% RES electricity by 2030, climate neutrality by 2050, energy independence and Baltic synchronisation milestones.',
    },
    {
      name: 'Offshore Wind Tender Law',
      year: 2021,
      summary: 'Legal framework for offshore wind energy areas in the Baltic Sea; first 700 MW tender awarded 2023.',
    },
    {
      name: 'Renewable Energy Law amendments (prosumer regime)',
      year: 2019,
      summary: 'Introduces solar PV prosumer net-metering — catalysed rapid growth of distributed PV.',
    },
    {
      name: 'Multi-Apartment Building Renovation Programme',
      year: 2014,
      summary: 'Long-running and well-evaluated retrofit programme; central pillar of building-stock decarbonisation.',
    },
  ],
  watchNotes:
    '• Baltic synchronisation (Feb 2025): completed; focus shifts to balancing-' +
    'reserve adequacy and Harmony Link (Lithuania-Poland) execution.\n' +
    '• Offshore wind tender (round 2, 700 MW) — outcome expected 2026.\n' +
    '• Transport policy mix remains the headline NECP gap and the political ' +
    'priority for 2026-27.',
};

export default lt;
