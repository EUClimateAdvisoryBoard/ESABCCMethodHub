/**
 * Hungary — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const hu: CountryProfile = {
  code: 'HU',
  name: 'Hungary',
  eurostatCode: 'HU',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 47.1625, lon: 19.5033,
    capital: 'Budapest',
    populationM: 9.6,
    areaKkm2: 93.0,
    gdpPerCapitaEur: 17800,
    summary:
      'Hungary has cut greenhouse-gas emissions by roughly a third from 1990 levels, ' +
      'largely through the post-1990 industrial collapse and the build-out of low-carbon ' +
      'electricity anchored on the four-unit Paks nuclear power plant (~50% of generation). ' +
      'The 2020 Climate Protection Act writes a 2050 climate-neutrality goal into statute ' +
      'and a 2030 −40% target vs 1990, with policy headlines dominated by the Paks II ' +
      'expansion (two new Rosatom-built VVER-1200 reactors planned post-2030) and a slow ' +
      'but accelerating PV roll-out that now accounts for around 16% of generation.\n\n' +
      'The political context is challenging: the EU has frozen roughly €22bn in cohesion ' +
      'and RRF funds over rule-of-law conditionality, limiting investment capacity for ' +
      'building renovation, transport electrification and grid expansion. The NECP update ' +
      'and the 2024 climate strategy refresh have been criticised by the Commission and ' +
      'civil society for thin policy detail in transport, heating and industry, while ' +
      'Prime Minister Orbán has publicly contested aspects of the Fit for 55 package.',
    highlights: [
      'Climate Protection Act (2020): −40% by 2030 vs 1990, net-zero by 2050',
      'Paks nuclear plant supplies ~50% of electricity; Paks II expansion underway',
      'Solar PV >6 GW installed by 2024 — fastest-growing RES segment',
      '~€22bn EU funds frozen under rule-of-law conditionality, constraining green investment',
      'Buildings and transport are the principal NECP delivery gaps',
    ],
  },
  ghg: {
    totalLatest: { value: 60, unit: 'Mt CO2e', year: 2022, source: 'UNFCCC / EEA' },
    total1990: 94,
    perCapita: { value: 6.3, unit: 't CO2e/cap', year: 2022, source: 'EEA' },
    perGdp: { value: 0.34, unit: 'kg CO2e/€', year: 2022, source: 'EEA' },
    target2030: { value: -40, unit: '%', baseline: '1990', notes: 'Climate Protection Act (Act XLIV of 2020); aligns with ESR effort-sharing share.' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Climate neutrality by 2050 enshrined in the Climate Protection Act.' },
    sectors: [
      { id: 'power',       label: 'Power & heat',  share: 25, absolute: 15 },
      { id: 'transport',   label: 'Transport',     share: 22, absolute: 13 },
      { id: 'industry',    label: 'Industry',      share: 19, absolute: 11 },
      { id: 'buildings',   label: 'Buildings',     share: 16, absolute: 10 },
      { id: 'agriculture', label: 'Agriculture',   share: 13, absolute: 8 },
      { id: 'waste',       label: 'Waste & other', share: 5,  absolute: 3 },
    ],
    trend: [
      { year: 1990, value: 94 }, { year: 1995, value: 76 },
      { year: 2000, value: 73 }, { year: 2005, value: 76 },
      { year: 2010, value: 65 }, { year: 2015, value: 60 },
      { year: 2019, value: 64 }, { year: 2020, value: 61 },
      { year: 2021, value: 64 }, { year: 2022, value: 60 },
      { year: 2023, value: 58 },
    ],
    narrative:
      'Total emissions are down ~37% on 1990, but the trajectory has been broadly flat ' +
      'since 2014. The ESR-sectors gap (buildings, transport, agriculture, small industry) ' +
      'is wide: transport emissions are 50% above 1990 due to a rapidly motorising fleet ' +
      'and a high share of imported second-hand diesel vehicles. Annual reductions of ' +
      '~2.5 Mt CO2e are required through 2030 to meet the −40% goal, against an average ' +
      'of <1 Mt achieved over the last decade.',
    status: 'off-track',
  },
  renewables: {
    shareLatest: { value: 15.2, unit: '%', year: 2022, source: 'Eurostat SHARES' },
    share2005: 6.9,
    share2020: 13.9,
    target2030: 29,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 16.5 },
      { id: 'heating',     label: 'Heating & cooling', share: 18.7 },
      { id: 'transport',   label: 'Transport',  share: 11.6 },
    ],
    trend: [
      { year: 2005, value: 6.9 }, { year: 2010, value: 12.7 },
      { year: 2015, value: 14.5 }, { year: 2020, value: 13.9 },
      { year: 2021, value: 14.1 }, { year: 2022, value: 15.2 },
    ],
    narrative:
      'Hungary just met its binding 2020 RES target (13%) but progress slowed after 2015 ' +
      'and the 29% 2030 target — already lower than what the Commission considered ' +
      'fair-share — is at significant delivery risk. Solar PV is the bright spot, ' +
      'crossing 6 GW installed in 2024 and 4 GW of which is rooftop, driven by net ' +
      'metering (now closing) and KEHOP residential subsidies. Wind has been effectively ' +
      'blocked since the 2016 setback rules; the heating mix remains dominated by gas and ' +
      'biomass with limited heat-pump deployment.',
    status: 'off-track',
  },
  efficiency: {
    primary: { value: 24.5, unit: 'Mtoe', year: 2022 },
    final:   { value: 18.6, unit: 'Mtoe', year: 2022 },
    intensity: { value: 196, unit: 'kgoe/1000 EUR (2015)', year: 2022 },
    target2030: -8,
    narrative:
      'Energy intensity remains roughly twice the EU-27 average reflecting the ' +
      'industrial structure and an ageing, poorly-insulated building stock — over 70% ' +
      'of dwellings are pre-1990 and energy-class D or worse. The "Otthonfelújítási" ' +
      'home-renovation programme was scaled back in 2022 and the EU-funded Building ' +
      'Long-term Renovation Strategy implementation is slow. Industrial efficiency ' +
      'covered by ETS and EED Article 8 audits.',
    status: 'off-track',
  },
  air: {
    pm25: { value: 13.2, unit: 'µg/m³', year: 2022 },
    no2:  { value: 17.5, unit: 'µg/m³', year: 2022 },
    ozone: { value: 65.3, unit: 'µg/m³ (SOMO35)', year: 2022 },
    prematureDeaths: { value: 11500, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA' },
    exceedanceShare: { value: 99, unit: '% urban pop > WHO 5 µg/m³', year: 2022 },
    narrative:
      'PM2.5 concentrations are well above the WHO guideline value across all urban ' +
      'agglomerations, with domestic solid-fuel heating (firewood and lignite) the ' +
      'dominant winter source — particularly in rural communities and the north-east. ' +
      'NO₂ exceedances persist on Budapest arterials. Hungary was referred to the CJEU ' +
      'over PM10 limit-value breaches; the new Ambient Air Quality Directive will ' +
      'tighten targets further and require a stronger clean-air policy mix.',
    status: 'concern',
  },
  water: {
    surfaceWaterGood: { value: 9, unit: '%', year: 2021, source: 'WISE-WFD' },
    groundwaterGood: { value: 73, unit: '%', year: 2021 },
    bathingWaterExcellent: { value: 75, unit: '%', year: 2023 },
    drinkingWaterCompliance: { value: 98, unit: '%', year: 2022 },
    narrative:
      'Hungary sits at the downstream end of nearly all its major river basins, making ' +
      'it highly dependent on transboundary water quality. Only ~9% of surface waters ' +
      'reach "good ecological status" — nutrient pollution from intensive agriculture ' +
      'is the dominant pressure. Drought stress on the Great Plain is a growing concern ' +
      'and the 2022 Tisza fish-kill highlighted vulnerability to upstream pollution events.',
    status: 'concern',
  },
  biodiversity: {
    natura2000Land: { value: 21.4, unit: '% land', year: 2023 },
    threatenedSpecies: { value: 410, unit: 'IUCN red-list', year: 2022 },
    habitatsFavourable: { value: 16, unit: '%', year: 2019, source: 'Art. 17 reporting' },
    protectedAreas: { value: 22.5, unit: '% land', year: 2023 },
    narrative:
      'Natura 2000 land coverage at ~21% is in line with the EU-27 average and includes ' +
      'iconic puszta grasslands of Hortobágy and Kiskunság national parks. However, only ' +
      '~16% of habitat assessments are favourable, with grasslands and wetlands ' +
      'particularly poor. Agricultural intensification, drainage and climate-driven ' +
      'aridification of the Great Plain remain the key pressures.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 32, unit: '%', year: 2022 },
    circularMaterialUseRate: { value: 6.8, unit: '%', year: 2022 },
    resourceProductivity: { value: 1.1, unit: '€/kg', year: 2022 },
    narrative:
      'Hungary lags the EU-27 average on every major circular-economy indicator. ' +
      'Municipal recycling at ~32% is well below the 2025 EU target (55%) and the ' +
      'sector was disrupted by the 2023 nationalisation of waste collection under MOHU. ' +
      'The 2023 DRS deposit-return scheme for beverage packaging is a notable bright ' +
      'spot, reaching ~80% return rates in its first year.',
    status: 'off-track',
  },
  adaptation: {
    strategy: {
      title: 'National Climate Change Strategy (NÉS-2)',
      adoptedYear: 2018,
      lastUpdate: 2023,
      url: 'https://kormany.hu/dokumentumtar/nemzeti-eghajlatvaltozasi-strategia',
    },
    keyRisks: [
      'Aridification and water stress on the Great Plain (Alföld)',
      'Summer heatwaves and excess mortality in Budapest and other cities',
      'Flash flooding and pluvial events in northern and Transdanubian hills',
      'Forest dieback (oak, beech) under combined heat-drought-pest stress',
      'Agricultural yield losses and rural depopulation pressure',
    ],
    sectoralPlans: [
      'Water management',
      'Agriculture',
      'Forestry',
      'Public health',
      'Disaster management',
    ],
    narrative:
      'The Great Plain — historically a major grain belt — is exposed to severe ' +
      'aridification, with mean groundwater levels falling >1 m over recent decades. ' +
      'The NÉS-2 strategy identifies water scarcity as the principal long-term risk ' +
      'but implementation funding is limited. The 2022 drought caused €2bn+ in ' +
      'agricultural losses, prompting a national water-retention programme that remains ' +
      'in early-stage rollout.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-11',
    finalSubmitted: '2024-10',
    commissionAssessment:
      'Commission assessment (Dec 2023) found the draft Hungarian NECP partially aligned ' +
      'with the 2030 EU framework: the renewables 2030 target (29%) was judged below ' +
      'fair share, energy efficiency ambition insufficient, and policy detail in ' +
      'transport, buildings and agriculture too thin to evidence the −18.7% ESR target.',
    esabccCommentary:
      'ESABCC notes the Climate Protection Act provides the legal architecture but the ' +
      'NECP lacks credible sectoral pathways, particularly in transport (where ' +
      'emissions are 50% above 1990) and buildings (where the renovation programme has ' +
      'been scaled back). Frozen EU funds create a binding constraint on near-term ' +
      'investment in grid, rail and building renovation.',
    gaps: [
      'Renewables 2030 target (29%) below Commission fair-share assessment',
      'Transport decarbonisation: no credible policy mix; EV uptake remains <5% of new registrations',
      'Building renovation rate stalled at ~1%/yr; deep-renovation funding limited',
      'Wind-power 2016 setback rules effectively block onshore deployment',
      'Limited treatment of LULUCF risks from forest dieback',
    ],
    status: 'off-track',
  },
  justTransition: {
    jtfAllocationEurM: 260,
    regions: [
      'Borsod-Abaúj-Zemplén (Mátra coal/industrial)',
      'Heves (Mátra lignite mine and Visonta power plant)',
      'Baranya (Pécs coal legacy)',
    ],
    narrative:
      'Hungary\'s JTF allocation (~€260m) is modest, reflecting a smaller coal sector ' +
      'than Poland or Czechia. The Mátra power plant (operator MVM) is converting from ' +
      'lignite to gas and renewables, with biomass and PV co-located on the Visonta mine ' +
      'site. Coal phase-out is targeted for 2025 but operational dates have slipped.',
  },
  policies: [
    {
      name: 'Climate Protection Act (Act XLIV of 2020)',
      year: 2020,
      summary: 'Statutory 2030 (−40% vs 1990) and 2050 (net-zero) GHG targets; framework for sectoral implementing measures.',
    },
    {
      name: 'National Energy Strategy 2030 (with 2040 outlook)',
      year: 2020,
      summary: 'Strategic framework targeting 90% carbon-free electricity by 2030 anchored on nuclear (Paks I + II) and solar PV; phases out coal-fired generation.',
    },
    {
      name: 'Paks II Government Decree',
      year: 2014,
      summary: 'Intergovernmental agreement with Russia (Rosatom) for two VVER-1200 reactors at Paks; under sanctions-related construction review since 2022.',
    },
    {
      name: 'Wind energy 12-km setback rules (Decree 277/2016)',
      year: 2016,
      summary: 'Restrictive zoning rules that effectively halt new onshore wind development; partially relaxed in 2023 but still binding in practice.',
    },
    {
      name: 'Deposit-Return Scheme (DRS) for beverage packaging',
      year: 2023,
      summary: 'Mandatory take-back system operated by MOHU; achieved ~80% return rate in first year of operation.',
    },
    {
      name: 'Otthonfelújítási Programme',
      year: 2021,
      summary: 'Subsidised loan and grant scheme for residential renovation, partly conditional on energy efficiency improvements; scaled back from 2022.',
    },
    {
      name: 'National Adaptation Strategy (NÉS-2)',
      year: 2018,
      summary: 'Cross-sectoral adaptation framework with water-retention focus; statutory review every five years.',
    },
  ],
  watchNotes:
    '• Rule-of-law conditionality: ~€22bn of cohesion / RRF funds remain frozen, with ' +
    'partial unlocks tied to judicial reforms — the binding investment constraint on the NECP.\n' +
    '• Paks II construction: Rosatom contract under sanctions review; any cancellation or ' +
    'major delay would force a fundamental re-think of the 2030 power mix.\n' +
    '• Wind setback rules: full repeal would unlock 1-2 GW of stalled onshore wind by 2030.\n' +
    '• 2026 elections may reshape climate policy salience; the National Climate Council ' +
    'is the main domestic advisory body but has limited statutory weight.',
};

export default hu;
