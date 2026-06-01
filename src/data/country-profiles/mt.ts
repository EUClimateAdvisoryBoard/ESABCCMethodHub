/**
 * Malta — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const mt: CountryProfile = {
  code: 'MT',
  name: 'Malta',
  eurostatCode: 'MT',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 35.9375, lon: 14.3754,
    capital: 'Valletta',
    populationM: 0.55,
    areaKkm2: 0.32,
    gdpPerCapitaEur: 31000,
    summary:
      'Malta is the smallest EU member state by land area and one of the most ' +
      'densely populated countries in the world (~1,700 people/km²). It is also the ' +
      'most fossil-dependent: the renewable-energy share (~13%) is the lowest in the ' +
      'EU, and the electricity system relies on heavy fuel oil and, since 2015, the ' +
      'gas-fired Delimara CCGT plant. The 2015 commissioning of the Malta-Sicily ' +
      'subsea electricity interconnector (200 MW) cut emissions from heavy-fuel oil ' +
      'plants and underpins the 1990-2023 emissions trajectory.\n\n' +
      'Total greenhouse-gas emissions of ~2.0 Mt CO2e have fallen ~13% from 1990 ' +
      'levels, but per-capita emissions remain modest by EU standards (~3.7 t/cap). ' +
      'The 2022 Low-Carbon Development Strategy targets climate neutrality by 2050. ' +
      'The structural challenges are unique among EU members: extreme land scarcity ' +
      'limits ground-mounted PV; no domestic agriculture sink; complete dependence ' +
      'on imported energy; and one of the EU\'s most acute water-scarcity profiles.',
    highlights: [
      'Climate neutrality by 2050 (Low-Carbon Development Strategy, 2022)',
      'Renewables share ~13% — the lowest in the EU',
      'Malta-Sicily interconnector (200 MW, 2015) — single electricity link',
      'Second Malta-Italy interconnector under preparation (commissioning ~2027)',
    ],
  },
  ghg: {
    totalLatest: { value: 2.0, unit: 'Mt CO2e', year: 2022, source: 'EEA / UNFCCC' },
    total1990: 2.3,
    perCapita: { value: 3.7, unit: 't CO2e/cap', year: 2022, source: 'EEA' },
    perGdp: { value: 0.13, unit: 'kg CO2e/€', year: 2022, source: 'EEA' },
    target2030: { value: -19, unit: '%', baseline: '2005', notes: 'ESR 2030 target under Fit-for-55.' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Climate neutrality by 2050 (LCDS 2022).' },
    sectors: [
      { id: 'transport',      label: 'Transport',     share: 33, absolute: 0.66 },
      { id: 'power',          label: 'Power & heat',  share: 25, absolute: 0.50 },
      { id: 'industry',       label: 'Industry',      share: 15, absolute: 0.30 },
      { id: 'waste',          label: 'Waste & other', share: 12, absolute: 0.24 },
      { id: 'buildings',      label: 'Buildings',     share: 9,  absolute: 0.18 },
      { id: 'agriculture',    label: 'Agriculture',   share: 6,  absolute: 0.12 },
    ],
    trend: [
      { year: 1990, value: 2.3 }, { year: 1995, value: 2.5 },
      { year: 2000, value: 2.9 }, { year: 2005, value: 3.3 },
      { year: 2010, value: 3.1 }, { year: 2015, value: 2.0 },
      { year: 2019, value: 2.2 }, { year: 2020, value: 1.9 },
      { year: 2021, value: 2.1 }, { year: 2022, value: 2.0 },
      { year: 2023, value: 2.0 },
    ],
    narrative:
      'The dramatic emissions cut between 2014 and 2015 reflects the Marsa heavy-' +
      'fuel-oil plant decommissioning and Delimara CCGT/interconnector ' +
      'commissioning, dropping power-sector emissions ~60%. Since 2016 the ' +
      'trajectory is flat; transport now dominates and is growing with vehicle-fleet ' +
      'expansion. The 2030 ESR cap requires roughly 0.5 Mt CO2e of further ' +
      'reductions — concentrated in road transport and waste.',
    status: 'partial',
  },
  renewables: {
    shareLatest: { value: 13.4, unit: '%', year: 2022, source: 'Eurostat SHARES' },
    share2005: 0.3,
    share2020: 10.7,
    target2030: 25,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 10.1 },
      { id: 'heating',     label: 'Heating & cooling', share: 25.0 },
      { id: 'transport',   label: 'Transport',  share: 13.3 },
    ],
    trend: [
      { year: 2005, value: 0.3 }, { year: 2010, value: 1.0 },
      { year: 2015, value: 5.0 }, { year: 2020, value: 10.7 },
      { year: 2021, value: 12.2 }, { year: 2022, value: 13.4 },
      { year: 2023, value: 15.1 },
    ],
    narrative:
      'PV is the only meaningful domestic renewable source: rooftop and small-' +
      'ground-mount PV reached ~250 MW in 2023, generating ~10% of electricity. ' +
      'Wind potential is limited by airspace and land-use constraints. The 2030 ' +
      'target of 25% requires near-saturation of rooftop PV plus a planned floating ' +
      'PV pilot and substantial reliance on renewable-electricity imports through ' +
      'the second interconnector. Statistical transfers are likely contributors.',
    status: 'partial',
  },
  efficiency: {
    primary: { value: 0.85, unit: 'Mtoe', year: 2022 },
    final:   { value: 0.62, unit: 'Mtoe', year: 2022 },
    intensity: { value: 53, unit: 'kgoe/1000 EUR (2015)', year: 2022 },
    target2030: -14,
    narrative:
      'Energy intensity is among the lowest in the EU due to the services-dominated ' +
      'economy. Cooling demand is rising rapidly with hotter summers; efficient ' +
      'air-conditioning and building-envelope retrofits are priorities. The very ' +
      'small administrative scale challenges policy implementation capacity.',
    status: 'partial',
  },
  air: {
    pm25: { value: 9.0, unit: 'µg/m³', year: 2022 },
    no2:  { value: 21.0, unit: 'µg/m³', year: 2022 },
    ozone: { value: 65.0, unit: 'µg/m³ (SOMO35)', year: 2022 },
    prematureDeaths: { value: 220, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA' },
    exceedanceShare: { value: 100, unit: '% urban pop > WHO 5 µg/m³', year: 2022 },
    narrative:
      'NO2 concentrations are elevated in Valletta and Sliema due to traffic ' +
      'density. Ozone is high reflecting Mediterranean photochemistry. PM2.5 ' +
      'concentrations carry a substantial Saharan-dust contribution. Cruise-ship ' +
      'and port emissions are a focus area; shore-side power supply is under ' +
      'development in the Grand Harbour.',
    status: 'partial',
  },
  water: {
    surfaceWaterGood: { value: 0, unit: '%', year: 2021, source: 'WISE-WFD' },
    groundwaterGood: { value: 0, unit: '%', year: 2021 },
    bathingWaterExcellent: { value: 96, unit: '%', year: 2023 },
    drinkingWaterCompliance: { value: 99, unit: '%', year: 2022 },
    narrative:
      'Malta is one of the most water-scarce countries in the world (~50 m³/cap/yr ' +
      'natural availability). All groundwater bodies fail "good status" due to ' +
      'over-abstraction and nitrate pollution. Desalination supplies ~60% of public ' +
      'water. Bathing-water quality is excellent — central to the tourism economy.',
    status: 'concern',
  },
  biodiversity: {
    natura2000Land: { value: 13.2, unit: '% land', year: 2023 },
    natura2000Marine: { value: 35.5, unit: '% EEZ', year: 2023 },
    threatenedSpecies: { value: 290, unit: 'IUCN red-list', year: 2022 },
    habitatsFavourable: { value: 25, unit: '%', year: 2019, source: 'Art. 17 reporting' },
    narrative:
      'Marine Natura 2000 coverage is well above the EU 30%-by-2030 target — ' +
      'reflecting major designations in Maltese waters in recent years. Land-based ' +
      'habitats are highly fragmented; coastal-zone development pressure is the ' +
      'binding biodiversity issue. Migratory-bird hunting derogations remain a long-' +
      'standing infringement subject area.',
    status: 'partial',
  },
  circular: {
    municipalRecycling: { value: 12, unit: '%', year: 2022 },
    circularMaterialUseRate: { value: 7.3, unit: '%', year: 2022 },
    resourceProductivity: { value: 2.0, unit: '€/kg', year: 2022 },
    narrative:
      'Malta has the EU\'s lowest municipal recycling rate. The Sant\' Antnin ' +
      'mechanical-biological treatment plant and the 2018 Beverage Container Refund ' +
      'Scheme (launched 2022) have improved performance, but Malta is at acute risk ' +
      'of missing the 2025 (55%) target. Limited domestic processing capacity is ' +
      'the structural constraint.',
    status: 'off-track',
  },
  adaptation: {
    strategy: {
      title: 'National Climate Change Adaptation Strategy',
      adoptedYear: 2012,
      lastUpdate: 2023,
      url: 'https://meae.gov.mt/',
    },
    keyRisks: [
      'Severe water scarcity and groundwater salinisation',
      'Sea-level rise and coastal-infrastructure exposure',
      'Marine heatwaves affecting Mediterranean fisheries',
      'Heat-stress mortality with intensifying heatwaves',
      'Wildfire in maquis and garrigue habitats',
    ],
    sectoralPlans: [
      'Water management',
      'Public health',
      'Coastal & marine',
      'Tourism',
      'Agriculture',
    ],
    narrative:
      'Adaptation governance is highly centralised given the country\'s scale. The ' +
      'updated 2023 Adaptation Strategy concentrates on water security ' +
      '(desalination resilience), coastal protection and public-health early-' +
      'warning systems. The 2023 Mediterranean marine heatwave reset attention to ' +
      'fisheries and ecosystem-services adaptation.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-06',
    finalSubmitted: '2024-07',
    commissionAssessment:
      'The Commission assessment (Dec 2023) judged the Maltese NECP partially aligned ' +
      'with Fit-for-55. RES ambition is below the indicative national contribution; ' +
      'transport decarbonisation policy detail is limited; circular economy targets ' +
      'are below EU averages.',
    esabccCommentary:
      'Malta faces unique constraints: extreme land scarcity, no domestic LULUCF ' +
      'sink, complete energy-import dependence and very small administrative scale. ' +
      'ESABCC notes that statistical transfers and the second Malta-Italy ' +
      'interconnector are central load-bearing assumptions in the 2030 trajectory.',
    gaps: [
      'RES 2030: national contribution below indicative trajectory',
      'Transport: limited policy mix beyond EV incentives',
      'Circular economy: recycling rates well below the 2025 trajectory',
      'Climate-adaptation financing: limited operationalisation of strategy priorities',
    ],
    status: 'partial',
  },
  policies: [
    {
      name: 'Climate Action Act',
      year: 2015,
      summary: 'Framework climate law establishing the Climate Action Board and MRV obligations; basis for the Low-Carbon Development Strategy.',
    },
    {
      name: 'Low-Carbon Development Strategy 2050',
      year: 2022,
      summary: 'Long-term strategy setting climate neutrality by 2050 with sectoral decarbonisation pathways.',
    },
    {
      name: 'Renewable Energy Sources Order (subsidiary legislation)',
      year: 2014,
      summary: 'Support framework for PV and other RES via feed-in tariffs and grants; iteratively updated.',
    },
    {
      name: 'Beverage Container Refund Scheme',
      year: 2022,
      summary: 'Deposit-return scheme for PET bottles, cans and glass beverage containers; central pillar of municipal recycling improvement.',
    },
    {
      name: 'Second Malta-Italy Electricity Interconnector Project',
      year: 2022,
      summary: 'Strategic investment in a second 200 MW HVDC subsea link to Sicily; financial close 2024, commissioning targeted 2027.',
    },
  ],
  watchNotes:
    '• Second Malta-Italy interconnector is the single most important enabling ' +
    'infrastructure for 2030 RES compliance.\n' +
    '• Cruise-ship and port shore-power deployment in the Grand Harbour is the ' +
    'flagship transport-sector decarbonisation programme.\n' +
    '• Statistical transfers will likely close residual RES gaps; partner-country ' +
    'pipeline is the policy indicator to watch.',
};

export default mt;
