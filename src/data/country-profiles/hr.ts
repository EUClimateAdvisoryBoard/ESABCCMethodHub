/**
 * Croatia — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const hr: CountryProfile = {
  code: 'HR',
  name: 'Croatia',
  eurostatCode: 'HR',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 45.1000, lon: 15.2000,
    capital: 'Zagreb',
    populationM: 3.86,
    areaKkm2: 56.6,
    gdpPerCapitaEur: 18500,
    summary:
      'Croatia is a small Adriatic Mediterranean economy whose climate policy is ' +
      'shaped by a tourism-dominant service sector (~20% of GDP), an unusually high ' +
      'share of legacy hydropower in its electricity mix, and acute exposure to ' +
      'coastal and wildfire climate risks along its 6,000 km of Dalmatian coast. ' +
      'Total greenhouse-gas emissions are ~24 Mt CO2e and have fallen ~25% since ' +
      '1990 — driven by deindustrialisation in the 1990s, falling agricultural ' +
      'activity and growing renewable electricity penetration. EU accession in 2013 ' +
      'and euro adoption in 2023 have accelerated alignment of climate, energy and ' +
      'water policy with the EU acquis.\n\n' +
      'The Low-Carbon Development Strategy to 2050 anchors net-zero ambition, but ' +
      'implementation depends overwhelmingly on EU funds: the Recovery and ' +
      'Resilience Plan (€10bn through 2026, ~40% climate-tagged) and Cohesion ' +
      'Policy 2021-27 carry the bulk of decarbonisation investment in buildings, ' +
      'transport and waste. Adaptation is climbing the agenda after repeated wildfire ' +
      'seasons (notably 2017, 2021) and the 2023 Adriatic heat-wave.',
    highlights: [
      'Net-zero by 2050 anchored in the Low-Carbon Development Strategy (2021)',
      'Renewable electricity share ~55% (hydro-dominant) — among EU\'s highest',
      'EU funds (RRP + Cohesion) finance >60% of climate investment to 2030',
      'Adriatic coast and wildfire exposure drive an emerging adaptation agenda',
    ],
  },
  ghg: {
    totalLatest: { value: 23.6, unit: 'Mt CO2e', year: 2022, source: 'EEA / UNFCCC' },
    total1990: 31.5,
    perCapita: { value: 6.1, unit: 't CO2e/cap', year: 2022, source: 'EEA' },
    perGdp: { value: 0.34, unit: 'kg CO2e/€', year: 2022, source: 'EEA' },
    target2030: { value: -16.7, unit: '%', baseline: '2005', notes: 'ESR 2030 target under Fit-for-55; LCDS economy-wide alignment with EU Climate Law.' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Climate neutrality by 2050 (LCDS 2021).' },
    sectors: [
      { id: 'transport',      label: 'Transport',     share: 28, absolute: 6.6 },
      { id: 'power',          label: 'Power & heat',  share: 22, absolute: 5.2 },
      { id: 'industry',       label: 'Industry',      share: 19, absolute: 4.5 },
      { id: 'agriculture',    label: 'Agriculture',   share: 14, absolute: 3.3 },
      { id: 'buildings',      label: 'Buildings',     share: 12, absolute: 2.8 },
      { id: 'waste',          label: 'Waste & other', share: 5,  absolute: 1.2 },
    ],
    trend: [
      { year: 1990, value: 31.5 }, { year: 1995, value: 21.0 },
      { year: 2000, value: 25.5 }, { year: 2005, value: 30.2 },
      { year: 2010, value: 28.1 }, { year: 2015, value: 23.9 },
      { year: 2019, value: 25.3 }, { year: 2020, value: 23.4 },
      { year: 2021, value: 24.5 }, { year: 2022, value: 23.6 },
      { year: 2023, value: 22.4 },
    ],
    narrative:
      'Headline emissions are now ~25% below 1990, but the post-2005 trajectory is ' +
      'mainly flat with cyclical sensitivity to tourism activity and weather-driven ' +
      'hydro output. Transport — dominated by long-distance summer tourism traffic — ' +
      'is the single largest and fastest-growing sector. The Climate Action Law ' +
      '(Zakon o klimatskim promjenama, 2019) sets the framework but lacks binding ' +
      'sectoral budgets; LCDS pathway scenarios show a steep post-2030 deceleration ' +
      'is required to reach the 2050 goal.',
    status: 'partial',
  },
  renewables: {
    shareLatest: { value: 29.4, unit: '%', year: 2022, source: 'Eurostat SHARES' },
    share2005: 14.3,
    share2020: 31.0,
    target2030: 42.5,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 55.5 },
      { id: 'heating',     label: 'Heating & cooling', share: 33.7 },
      { id: 'transport',   label: 'Transport',  share: 6.8 },
    ],
    trend: [
      { year: 2005, value: 14.3 }, { year: 2010, value: 23.5 },
      { year: 2015, value: 29.0 }, { year: 2020, value: 31.0 },
      { year: 2021, value: 31.3 }, { year: 2022, value: 29.4 },
      { year: 2023, value: 30.1 },
    ],
    narrative:
      'Croatia\'s renewable share is among the EU\'s highest, anchored by legacy ' +
      'large hydropower on the Sava and Drava and by biomass-based district heating. ' +
      'Wind has expanded to ~1 GW in coastal Dalmatia; solar PV is the structural ' +
      'growth area for the rest of the decade, with simplified permitting introduced ' +
      'in 2023. The 2022 dry summer exposed hydro variability — water-availability ' +
      'risk now shapes the diversification strategy. The 2030 RES target of 42.5% ' +
      'requires roughly doubling PV capacity from 2023 levels.',
    status: 'on-track',
  },
  efficiency: {
    primary: { value: 8.5, unit: 'Mtoe', year: 2022 },
    final:   { value: 6.9, unit: 'Mtoe', year: 2022 },
    intensity: { value: 137, unit: 'kgoe/1000 EUR (2015)', year: 2022 },
    target2030: -14,
    narrative:
      'Final energy consumption has been broadly flat since 2010 despite GDP growth, ' +
      'reflecting strong gains in services-sector intensity and a shrinking heavy ' +
      'industry base. The deep renovation rate in buildings remains below 1%/yr; ' +
      'RRP-funded retrofit schemes target 200,000 dwellings by 2026. Tourism-sector ' +
      'electricity intensity is a notable structural challenge.',
    status: 'partial',
  },
  air: {
    pm25: { value: 14.5, unit: 'µg/m³', year: 2022 },
    no2:  { value: 16.2, unit: 'µg/m³', year: 2022 },
    ozone: { value: 64.1, unit: 'µg/m³ (SOMO35)', year: 2022 },
    prematureDeaths: { value: 3500, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA' },
    exceedanceShare: { value: 97, unit: '% urban pop > WHO 5 µg/m³', year: 2022 },
    narrative:
      'PM2.5 levels are dominated by residential wood-burning in continental Croatia ' +
      '(Slavonia, Zagreb basin), with ozone the binding summer pollutant on the ' +
      'coast. Almost all urban populations exceed WHO 5 µg/m³. The Air Protection ' +
      'Programme 2023-2027 targets a 20% reduction in PM2.5 emissions; biomass-stove ' +
      'scrappage schemes were launched under the RRP in 2024.',
    status: 'partial',
  },
  water: {
    surfaceWaterGood: { value: 53, unit: '%', year: 2021, source: 'WISE-WFD' },
    groundwaterGood: { value: 88, unit: '%', year: 2021 },
    bathingWaterExcellent: { value: 96, unit: '%', year: 2023 },
    drinkingWaterCompliance: { value: 99, unit: '%', year: 2022 },
    narrative:
      'Croatia has the EU\'s highest share of "excellent" bathing waters — a tourism ' +
      'asset of strategic importance. Surface water status is mid-range; pressures ' +
      'are hydromorphological (Drava/Sava regulation) and from inadequate urban ' +
      'wastewater treatment in coastal municipalities, where compliance with the ' +
      'Urban Waste Water Treatment Directive remains incomplete.',
    status: 'partial',
  },
  biodiversity: {
    natura2000Land: { value: 36.6, unit: '% land', year: 2023 },
    natura2000Marine: { value: 9.3, unit: '% EEZ', year: 2023 },
    threatenedSpecies: { value: 1080, unit: 'IUCN red-list', year: 2022 },
    habitatsFavourable: { value: 35, unit: '%', year: 2019, source: 'Art. 17 reporting' },
    narrative:
      'Natura 2000 terrestrial coverage at ~37% is among the highest in the EU, ' +
      'reflecting Croatia\'s exceptional karst and Dinaric biodiversity. Marine ' +
      'coverage is lower than the EU 30% by 2030 ambition; designation of additional ' +
      'Adriatic sites is in preparation. Pressure from coastal development and ' +
      'illegal hunting remain priority challenges.',
    status: 'partial',
  },
  circular: {
    municipalRecycling: { value: 35, unit: '%', year: 2022 },
    circularMaterialUseRate: { value: 5.4, unit: '%', year: 2022 },
    resourceProductivity: { value: 1.4, unit: '€/kg', year: 2022 },
    narrative:
      'Croatia is at risk of missing the 2025 municipal recycling target (55%). ' +
      'Separate-collection infrastructure is uneven across municipalities and a ' +
      'longstanding reliance on landfilling persists. RRP funding for waste ' +
      'management centres should improve recycling rates, but the circular material ' +
      'use rate is well below the EU average.',
    status: 'off-track',
  },
  adaptation: {
    strategy: {
      title: 'Climate Change Adaptation Strategy to 2040 with a View to 2070',
      adoptedYear: 2020,
      lastUpdate: 2023,
      url: 'https://mingor.gov.hr/',
    },
    keyRisks: [
      'Wildfire across the Dalmatian coast and Mediterranean hinterland',
      'Drought and water-availability stress on agriculture and hydropower',
      'Sea-level rise and storm-surge exposure of low-lying coastal infrastructure',
      'Heat-waves in Adriatic urban areas (Split, Zadar, Dubrovnik)',
      'Karst-aquifer salinisation along the coast',
    ],
    sectoralPlans: [
      'Water',
      'Agriculture',
      'Forestry',
      'Tourism',
      'Coastal zones',
    ],
    narrative:
      'The 2020 Adaptation Strategy is the central planning document, supplemented ' +
      'by sectoral action plans. The 2017 Dalmatia and 2021 Krk fire seasons reset ' +
      'wildfire-risk management priorities, with new investment in early-warning, ' +
      'fuel-management and aerial-firefighting capacity. Coastal-zone planning is ' +
      'incomplete; ICZM Protocol implementation lags.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-09',
    finalSubmitted: '2024-07',
    commissionAssessment:
      'The Commission assessment (Dec 2023) judged the Croatian NECP as broadly ' +
      'consistent with the 2030 Fit-for-55 framework, but flagged limited ambition ' +
      'in transport decarbonisation, weak policy detail for the buildings sector and ' +
      'an absence of quantified support for industrial energy efficiency.',
    esabccCommentary:
      'Croatia\'s NECP relies on EU funds (RRP + Cohesion) for ~60% of additional ' +
      'measures — implementation risk is therefore tightly coupled to absorption ' +
      'capacity. ESABCC notes the LULUCF sink is assumed to remain stable despite ' +
      'rising wildfire frequency.',
    gaps: [
      'Transport: no quantified pathway bringing emissions below ESR sectoral cap',
      'Buildings renovation rate well below the trajectory needed to deliver 2030 savings',
      'Limited treatment of LULUCF wildfire risk in net-removal projections',
      'Industrial decarbonisation: no concrete policy mix for energy-intensive sectors',
    ],
    status: 'partial',
  },
  justTransition: {
    jtfAllocationEurM: 184,
    regions: [
      'Sisak-Moslavina County',
      'Istria County',
    ],
    narrative:
      'JTF supports the closure of the INA Sisak refinery and restructuring of ' +
      'oil-and-gas value chain activity in Sisak-Moslavina, plus the legacy coal ' +
      'and energy-intensive industry in Istria (Plomin power plant transition).',
  },
  policies: [
    {
      name: 'Climate Change Act (Zakon o klimatskim promjenama)',
      year: 2019,
      summary: 'Framework law transposing the EU climate acquis; establishes inventory, monitoring, MRV and the Low-Carbon Development Strategy mechanism.',
    },
    {
      name: 'Low-Carbon Development Strategy to 2050',
      year: 2021,
      summary: 'Long-term decarbonisation pathway with sectoral scenarios to net-zero by 2050.',
    },
    {
      name: 'Renewable Energy Sources and High-Efficiency Cogeneration Act',
      year: 2021,
      summary: 'Support framework for RES; introduces market-premium auctions and simplified permitting for solar PV.',
    },
    {
      name: 'Climate Change Adaptation Strategy to 2040',
      year: 2020,
      summary: 'National adaptation framework with eight priority sectors and a 70-year planning horizon.',
    },
    {
      name: 'Waste Management Plan 2017-2022 (extended)',
      year: 2017,
      summary: 'Sets the pathway to EU recycling targets; supports construction of regional waste-management centres.',
    },
  ],
  watchNotes:
    '• Hydropower variability under climate change is the structural risk to the ' +
    'electricity sector — dry-year output can fall 25-30%.\n' +
    '• Sisak-Moslavina just-transition: INA refinery closure interacts with the 2020 ' +
    'Petrinja earthquake recovery programme.\n' +
    '• Adriatic coast sea-level rise will require updates to the Coastal Zone ' +
    'Management Act through the ICZM Protocol.',
};

export default hr;
