/**
 * Slovenia — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const si: CountryProfile = {
  code: 'SI',
  name: 'Slovenia',
  eurostatCode: 'SI',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 46.1512, lon: 14.9955,
    capital: 'Ljubljana',
    populationM: 2.1,
    areaKkm2: 20.3,
    gdpPerCapitaEur: 24800,
    summary:
      'Slovenia is a small Alpine economy with a strikingly diverse low-carbon power mix — ' +
      'the single-unit Krško nuclear plant supplies ~37% of electricity (jointly owned ' +
      'with Croatia), hydropower from the Drava, Sava and Soča rivers adds another ~30%, ' +
      'and the lignite-fired Šoštanj power plant — long-dominant — is now committed to ' +
      'close by 2033 under the 2022 National Energy and Climate Plan. The Resolution on ' +
      'Long-Term Climate Strategy (2021) writes 2050 climate neutrality into a statutory ' +
      'framework, and Slovenia has set one of the EU\'s most ambitious 2030 trajectories ' +
      'relative to its baseline.\n\n' +
      'Forests cover ~60% of national territory — among the highest shares in Europe — ' +
      'making LULUCF a critical lever, but also a vulnerability: 2014 ice storms and ' +
      'subsequent bark-beetle outbreaks released >10 Mt CO2e of net emissions, ' +
      'collapsing the historical forest sink. The country faces a debate over a planned ' +
      'second Krško reactor (JEK2) — central to the long-term decarbonisation strategy ' +
      'but politically contested with a 2024 referendum.',
    highlights: [
      'Long-Term Climate Strategy (2021): climate neutrality by 2050',
      'Šoštanj lignite plant (~25% of electricity) committed to close by 2033',
      'Krško nuclear ~37% of electricity; JEK2 second-unit decision pending',
      'Forests cover ~60% of territory — large but volatile LULUCF sink',
      'NECP 2024 update assessed by Commission as largely aligned',
    ],
  },
  ghg: {
    totalLatest: { value: 16, unit: 'Mt CO2e', year: 2022, source: 'UNFCCC / EEA' },
    total1990: 18,
    perCapita: { value: 7.5, unit: 't CO2e/cap', year: 2022, source: 'EEA' },
    perGdp: { value: 0.30, unit: 'kg CO2e/€', year: 2022, source: 'EEA' },
    target2030: { value: -45, unit: '%', baseline: '2005', notes: 'NECP 2024; ESR target -27% vs 2005 plus economy-wide ambition.' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Climate neutrality by 2050 (Resolution on Long-Term Climate Strategy 2050, 2021).' },
    sectors: [
      { id: 'transport',   label: 'Transport',     share: 32, absolute: 5 },
      { id: 'power',       label: 'Power & heat',  share: 23, absolute: 4 },
      { id: 'industry',    label: 'Industry',      share: 19, absolute: 3 },
      { id: 'buildings',   label: 'Buildings',     share: 11, absolute: 2 },
      { id: 'agriculture', label: 'Agriculture',   share: 11, absolute: 2 },
      { id: 'waste',       label: 'Waste & other', share: 4,  absolute: 1 },
    ],
    trend: [
      { year: 1990, value: 18 }, { year: 1995, value: 18 },
      { year: 2000, value: 19 }, { year: 2005, value: 20 },
      { year: 2010, value: 19 }, { year: 2015, value: 17 },
      { year: 2019, value: 17 }, { year: 2020, value: 16 },
      { year: 2021, value: 17 }, { year: 2022, value: 16 },
      { year: 2023, value: 15 },
    ],
    narrative:
      'Slovenia\'s emissions peaked around 2008 and have declined ~20% since — modest ' +
      'relative to most EU peers but reflecting a low 1990 baseline. Transport is the ' +
      'dominant sector (~32%) driven by transit road freight on the Ljubljana–Koper ' +
      'corridor and high private-car dependency. Power-sector emissions will fall ' +
      'sharply with the planned Šoštanj closure (2033). The LULUCF sink, historically ' +
      'large, has collapsed since 2014 ice storms and bark-beetle outbreaks and is now ' +
      'near-zero or net-emitting.',
    status: 'partial',
  },
  renewables: {
    shareLatest: { value: 25.0, unit: '%', year: 2022, source: 'Eurostat SHARES' },
    share2005: 16.0,
    share2020: 25.0,
    target2030: 33,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 35.5 },
      { id: 'heating',     label: 'Heating & cooling', share: 36.7 },
      { id: 'transport',   label: 'Transport',  share: 7.8 },
    ],
    trend: [
      { year: 2005, value: 16.0 }, { year: 2010, value: 20.8 },
      { year: 2015, value: 22.9 }, { year: 2020, value: 25.0 },
      { year: 2021, value: 25.0 }, { year: 2022, value: 25.0 },
    ],
    narrative:
      'Slovenia narrowly met its 2020 binding target (25%) but the share has been flat ' +
      'since 2014 — hydropower (the dominant RES) has hit topographic and ' +
      'environmental-impact limits, biomass heating is already mature, and PV deployment ' +
      'collapsed after the 2013 retroactive support cuts. The 2030 target (33%) requires ' +
      'a step-change in solar PV (with ~3 GW of pipeline through 2030) and the lifting of ' +
      'administrative bottlenecks. The Commission flagged the renewables ambition as ' +
      'below fair share in 2023.',
    status: 'partial',
  },
  efficiency: {
    primary: { value: 6.4, unit: 'Mtoe', year: 2022 },
    final:   { value: 5.0, unit: 'Mtoe', year: 2022 },
    intensity: { value: 138, unit: 'kgoe/1000 EUR (2015)', year: 2022 },
    target2030: -10,
    narrative:
      'Energy intensity is roughly 40% above the EU-27 average, reflecting both transit ' +
      'freight and a relatively energy-intensive industrial mix (steel, paper, chemicals). ' +
      'The Long-Term Renovation Strategy targets a near-zero-energy building stock by ' +
      '2050, supported by PNRR-funded renovation grants; deployment is broadly on track ' +
      'in the residential sector but lags in commercial / public buildings.',
    status: 'partial',
  },
  air: {
    pm25: { value: 12.8, unit: 'µg/m³', year: 2022 },
    no2:  { value: 16.4, unit: 'µg/m³', year: 2022 },
    ozone: { value: 70.3, unit: 'µg/m³ (SOMO35)', year: 2022 },
    prematureDeaths: { value: 1500, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA' },
    exceedanceShare: { value: 97, unit: '% urban pop > WHO 5 µg/m³', year: 2022 },
    narrative:
      'PM2.5 levels exceed the WHO guideline across nearly all urban areas, driven by ' +
      'wood biomass heating (the dominant residential heating fuel in much of rural ' +
      'Slovenia) and topographic inversions in Alpine valleys, notably Zasavje (Zagorje, ' +
      'Hrastnik) and the Ljubljana basin. Ozone in summer is among the highest in the EU ' +
      'reflecting Mediterranean precursor inflows and Alpine topography.',
    status: 'partial',
  },
  water: {
    surfaceWaterGood: { value: 60, unit: '%', year: 2021, source: 'WISE-WFD' },
    groundwaterGood: { value: 86, unit: '%', year: 2021 },
    bathingWaterExcellent: { value: 94, unit: '%', year: 2023 },
    drinkingWaterCompliance: { value: 99, unit: '%', year: 2022 },
    narrative:
      'Slovenia\'s mountainous geography, low population density and limited heavy ' +
      'agriculture support relatively good surface and groundwater status. The Adriatic ' +
      'coast at Koper / Piran is a small but important bathing-water and tourism asset. ' +
      'Drinking-water compliance and bathing-water excellent shares are both well above ' +
      'the EU average.',
    status: 'on-track',
  },
  biodiversity: {
    natura2000Land: { value: 37.5, unit: '% land', year: 2023 },
    natura2000Marine: { value: 5, unit: '% territorial waters', year: 2023 },
    threatenedSpecies: { value: 290, unit: 'IUCN red-list', year: 2022 },
    habitatsFavourable: { value: 27, unit: '%', year: 2019, source: 'Art. 17 reporting' },
    narrative:
      'Slovenia has the highest Natura 2000 land coverage in the EU (~37.5%) — Alpine, ' +
      'Dinaric and Mediterranean biogeographical regions all converge in the country. ' +
      'Strong populations of brown bear (~1,000), wolf and lynx (recently reintroduced ' +
      'with the LIFE Lynx project). Pressures include forest dieback from bark-beetle, ' +
      'wetland drainage, and infrastructure encroachment in karst areas.',
    status: 'partial',
  },
  circular: {
    municipalRecycling: { value: 60, unit: '%', year: 2022 },
    circularMaterialUseRate: { value: 9.4, unit: '%', year: 2022 },
    resourceProductivity: { value: 1.5, unit: '€/kg', year: 2022 },
    narrative:
      'Slovenia is a regional circular-economy leader — municipal recycling at ~60% is ' +
      'among the highest in the EU and already exceeds the 2025 target. Ljubljana ' +
      'became the first EU capital to commit to zero waste (>68% separate collection). ' +
      'Circular material use rate at ~9.4% is close to the EU-27 average. The 2018 ' +
      'Roadmap Toward the Circular Economy provides the strategic framework.',
    status: 'on-track',
  },
  adaptation: {
    strategy: {
      title: 'Strategic Framework for Adaptation to Climate Change',
      adoptedYear: 2016,
      lastUpdate: 2024,
      url: 'https://www.gov.si/teme/prilagajanje-podnebnim-spremembam/',
    },
    keyRisks: [
      'Forest dieback (Norway spruce) from bark-beetle and ice-storm cascades',
      'Flash flooding and landslides in Alpine and pre-Alpine valleys (2023 floods)',
      'Drought stress on Karst and Mediterranean Slovenia (Vipava, Primorska)',
      'Heatwaves and urban-heat-island effects in Ljubljana and Maribor',
      'Glacier retreat in Triglav (Slovenia\'s only glacier, near-disappeared)',
    ],
    sectoralPlans: [
      'Forestry',
      'Water and flood management',
      'Agriculture',
      'Health',
      'Tourism',
    ],
    narrative:
      'The 2016 strategic framework was updated in 2024 with a National Adaptation Plan. ' +
      'Slovenia\'s exposure has been brutally demonstrated: 2014 ice storms damaged ' +
      '~50% of forest area, and the August 2023 floods caused €10bn in damages ' +
      '(~16% of GDP) — the worst natural disaster in modern Slovenian history. The ' +
      'Reconstruction Act (2023) and dedicated EU Solidarity Fund support have driven ' +
      'a major reset of flood-risk and resilience policy.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-09',
    finalSubmitted: '2024-06',
    commissionAssessment:
      'Commission assessment (Dec 2023) judged the Slovenian NECP largely aligned with ' +
      'the 2030 EU framework, with gaps in renewables ambition (33% deemed below fair ' +
      'share), transport sector trajectory, and limited treatment of LULUCF risks under ' +
      'forest disturbance pressure.',
    esabccCommentary:
      'ESABCC notes Slovenia is one of the few Member States with a credible coal ' +
      'phase-out (Šoštanj 2033) and a statutory 2050 net-zero pathway. The principal ' +
      'risks lie in (a) the LULUCF sink collapse under forest dieback and (b) the ' +
      'JEK2 decision, which will determine whether the post-2040 power mix is dominated ' +
      'by nuclear-plus-renewables or by an accelerated renewables build-out.',
    gaps: [
      'Renewables 2030 target (33%) below Commission fair-share assessment',
      'Transport sector trajectory not credible without freight modal-shift policy',
      'LULUCF: forest sink projections may be over-optimistic given bark-beetle pressure',
      'JEK2 nuclear decision creates strategic uncertainty for the 2040 outlook',
      'PV deployment remains constrained by administrative bottlenecks and grid permitting',
    ],
    status: 'partial',
  },
  justTransition: {
    jtfAllocationEurM: 250,
    regions: [
      'Savinjsko-Šaleška (Šoštanj lignite + Velenje coal mine)',
      'Zasavje (legacy coal / chemicals — Zagorje, Hrastnik, Trbovlje)',
    ],
    narrative:
      'Slovenia\'s ~€250m JTF allocation covers two regions: the Šaleška valley around ' +
      'Šoštanj and Velenje (~3,500 direct mine + power-plant jobs) and the Zasavje ' +
      'region with legacy coal and chemicals. The Territorial Just Transition Plans ' +
      'target reskilling, site rehabilitation, and new economic activity around RES, ' +
      'circular economy and tourism. The Šoštanj closure date (2033) was confirmed in ' +
      'the 2024 NECP update following years of political contestation.',
  },
  policies: [
    {
      name: 'Resolution on Long-Term Climate Strategy 2050',
      year: 2021,
      summary: 'Parliamentary resolution writing 2050 climate-neutrality into strategic framework; underpins NECP and sectoral planning.',
    },
    {
      name: 'Climate Change Act',
      year: 2024,
      summary: 'Framework climate law (adopted 2024) consolidating monitoring, reporting and sectoral budget mechanisms.',
    },
    {
      name: 'National Energy and Climate Plan (NECP)',
      year: 2020,
      summary: 'Updated 2024; sets 2030 trajectory including Šoštanj closure by 2033 and 33% RES share.',
    },
    {
      name: 'National Recovery and Resilience Plan (PNRR)',
      year: 2021,
      summary: '€2.7bn package (~42% green pillar): grid expansion, RES, building renovation, sustainable mobility, hydrogen pilots.',
    },
    {
      name: 'Coal Exit Strategy (Šoštanj)',
      year: 2022,
      summary: 'Government decision setting Šoštanj lignite plant closure by 2033 (originally 2042); supports Territorial Just Transition Plan.',
    },
    {
      name: 'Reconstruction Act (after August 2023 floods)',
      year: 2023,
      summary: 'Statutory framework and financing mechanism for post-flood reconstruction with climate-resilience requirements.',
    },
    {
      name: 'Roadmap Towards the Circular Economy',
      year: 2018,
      summary: 'Strategic framework for circular economy transition; embedded in industrial and waste policy planning.',
    },
  ],
  watchNotes:
    '• JEK2 (second Krško unit): government referendum on the project was held in 2024; ' +
    'the FID and procurement framework remain unresolved through 2025-26 and will define ' +
    'the post-2040 power mix.\n' +
    '• August 2023 floods: €10bn damages (~16% of GDP); reconstruction is now a major ' +
    'fiscal channel for climate-resilient infrastructure investment.\n' +
    '• LULUCF sink: forest dieback from cumulative bark-beetle pressure has flipped ' +
    'Slovenia\'s land sector toward net-zero or net-emitting; full LULUCF compliance under ' +
    'the LULUCF Regulation is increasingly fragile.\n' +
    '• Šoštanj 2033 closure: a major political marker for the EU coal-region transition ' +
    'and a test of the Just Transition framework in a small Member State.',
};

export default si;
