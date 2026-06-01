/**
 * Italy — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / ISPRA / EU
 * Commission NECP assessments published 2022-2024 and rounded for headline
 * display. Treat values as best-available baseline data — editors should
 * refine specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const it: CountryProfile = {
  code: 'IT',
  name: 'Italy',
  eurostatCode: 'IT',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 41.8719, lon: 12.5674,
    capital: 'Rome',
    populationM: 58.9,
    areaKkm2: 301.3,
    gdpPerCapitaEur: 33500,
    summary:
      'Italy is the EU\'s third-largest economy and its third-largest emitter, but ' +
      'has cut emissions by ~22% from 1990 levels — a relatively slow decarbonisation ' +
      'compared to France or Germany, anchored in a fossil-gas-dominated electricity ' +
      'and heating mix (~45% of power generation in 2022). The Russian gas-supply ' +
      'shock accelerated diversification (LNG, Algerian and Azerbaijani pipelines) ' +
      'and triggered the 2023-2024 update of the Piano Nazionale Integrato Energia e ' +
      'Clima (PNIEC), which raises 2030 renewables ambition to 39.4% of gross final ' +
      'consumption. The Long-Term Strategy commits to climate neutrality by 2050 in ' +
      'line with the EU framework.\n\n' +
      'Italy has the EU\'s strongest near-term renewables potential — high solar ' +
      'resource, abundant geothermal and hydropower, and an extensive offshore-wind ' +
      'pipeline in the south — but build-out has been bottlenecked by slow ' +
      'permitting at regional/superintendency level. The 2023 "Decreto Bollette" and ' +
      'the 2024 FER-X decree aim to unlock 80 GW of new RES capacity by 2030. The ' +
      'PNRR (Recovery & Resilience Plan) earmarks €60bn+ for green-transition ' +
      'investments to 2026, with mixed implementation.',
    highlights: [
      'Climate neutrality by 2050 (LTS); PNIEC update raises 2030 RES target to 39.4%',
      'Electricity ~45% from fossil gas (2022) — single largest decarbonisation lever',
      'Italy aims for 80 GW of new RES capacity by 2030 (PNIEC, FER-X)',
      'PNRR commits €60bn+ to the green transition through 2026',
    ],
  },
  ghg: {
    totalLatest: { value: 385, unit: 'Mt CO2e', year: 2023, source: 'ISPRA / UNFCCC' },
    total1990: 519,
    perCapita: { value: 6.5, unit: 't CO2e/cap', year: 2023, source: 'EEA' },
    perGdp: { value: 0.20, unit: 'kg CO2e/€', year: 2023, source: 'EEA' },
    target2030: { value: -43.7, unit: '%', baseline: '2005', notes: 'ESR target combined with EU ETS share; PNIEC update aligned with Fit-for-55.' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Long-Term Strategy: climate neutrality by 2050 (EU-aligned).' },
    sectors: [
      { id: 'transport',     label: 'Transport',     share: 28, absolute: 108 },
      { id: 'power',         label: 'Power & heat',  share: 23, absolute: 88 },
      { id: 'industry',      label: 'Industry',      share: 18, absolute: 69 },
      { id: 'buildings',     label: 'Buildings',     share: 16, absolute: 62 },
      { id: 'agriculture',   label: 'Agriculture',   share: 9,  absolute: 35 },
      { id: 'waste',         label: 'Waste & other', share: 6,  absolute: 23 },
    ],
    trend: [
      { year: 1990, value: 519 }, { year: 1995, value: 538 },
      { year: 2000, value: 562 }, { year: 2005, value: 585 },
      { year: 2010, value: 510 }, { year: 2015, value: 437 },
      { year: 2019, value: 426 }, { year: 2020, value: 386 },
      { year: 2021, value: 419 }, { year: 2022, value: 410 },
      { year: 2023, value: 385 },
    ],
    narrative:
      'Italy\'s emissions trajectory is dominated by the post-2008 industrial ' +
      'contraction and gradual decarbonisation of power. The 2022-2023 gas-price ' +
      'shock paradoxically reduced emissions (industrial demand destruction) but the ' +
      'PNIEC update acknowledges that achieving the −43.7% (2005) ESR contribution ' +
      'requires acceleration in transport and buildings. Italy\'s LULUCF sink is ' +
      'declining due to forest fires and ageing forest stands — flagged by ISPRA as ' +
      'a key uncertainty in the 2030 net pathway.',
    status: 'partial',
  },
  renewables: {
    shareLatest: { value: 19.6, unit: '%', year: 2023, source: 'GSE' },
    share2005: 7.5,
    share2020: 20.4,
    target2030: 39.4,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 36.0 },
      { id: 'heating',     label: 'Heating & cooling', share: 19.7 },
      { id: 'transport',   label: 'Transport',  share: 9.8 },
    ],
    trend: [
      { year: 2005, value: 7.5 },  { year: 2010, value: 13.0 },
      { year: 2015, value: 17.5 }, { year: 2020, value: 20.4 },
      { year: 2021, value: 19.0 }, { year: 2022, value: 19.1 },
      { year: 2023, value: 19.6 },
    ],
    narrative:
      'Italy hit its 2020 EU target of 17% comfortably (achieved 20.4%) — partly a ' +
      'denominator effect of the 2020 demand drop. The 2030 PNIEC target of 39.4% ' +
      'implies adding ~80 GW of solar and wind capacity in seven years, against a ' +
      'historic rate of ~2-3 GW/yr. The 2023 FER-X auction framework and 2024 ' +
      '"aree idonee" decree are designed to unblock permitting; first results show ' +
      'auction shortfalls due to grid-connection bottlenecks. Heating-and-cooling ' +
      'RES is buoyed by biomass and heat-pumps; transport remains the weakest ' +
      'sub-sector despite biofuel mandates.',
    status: 'partial',
  },
  efficiency: {
    primary: { value: 145, unit: 'Mtoe', year: 2022 },
    final:   { value: 113, unit: 'Mtoe', year: 2022 },
    intensity: { value: 95, unit: 'kgoe/1000 EUR (2015)', year: 2022 },
    target2030: -24,
    narrative:
      'Final energy consumption has been broadly flat since 2014. The Superbonus 110% ' +
      'residential retrofit scheme drove a major buildings-sector intervention ' +
      '(€100bn+ disbursed 2020-2023) but with limited cost-effectiveness; replaced in ' +
      '2024 by a means-tested ECObonus. Industry energy savings under EED Article 8 ' +
      'audits continue. Commission assessment flagged the PNIEC efficiency target as ' +
      'insufficient to close the EU\'s indicative national contribution.',
    status: 'partial',
  },
  air: {
    pm25: { value: 14.8, unit: 'µg/m³', year: 2022 },
    no2:  { value: 22.5, unit: 'µg/m³', year: 2022 },
    ozone: { value: 58.2, unit: 'µg/m³ (SOMO35)', year: 2022 },
    prematureDeaths: { value: 47000, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA' },
    exceedanceShare: { value: 99, unit: '% urban pop > WHO 5 µg/m³', year: 2022 },
    narrative:
      'The Po Valley is one of Europe\'s most polluted airsheds — orographic and ' +
      'meteorological conditions trap PM2.5, NO₂ and ammonia emissions from intensive ' +
      'agriculture and industry. Italy has been subject to multiple CJEU infringement ' +
      'judgements on PM10 (2020) and NO₂ (2022). The 2024 Po Valley Agreement ' +
      '(Accordo di Bacino Padano) bundles new agricultural ammonia controls, LEZ ' +
      'harmonisation across four regions and biomass heating restrictions.',
    status: 'off-track',
  },
  water: {
    surfaceWaterGood: { value: 41, unit: '%', year: 2021, source: 'WISE-WFD' },
    groundwaterGood: { value: 70, unit: '%', year: 2021 },
    bathingWaterExcellent: { value: 96, unit: '%', year: 2023 },
    drinkingWaterCompliance: { value: 99, unit: '%', year: 2022 },
    narrative:
      'Bathing-water quality is among the EU\'s best (96% excellent), but Italy ' +
      'faces severe and growing drought stress — 2022 was the driest year on record ' +
      'for the Po basin; 2023 saw Sicilian water rationing. The 2023 "Decreto Siccità" ' +
      'appointed an extraordinary Commissioner for water. Distribution-network losses ' +
      'average ~42% (Eurostat) — the highest in the EU — a structural inefficiency the ' +
      'PNRR earmarks €4bn to address.',
    status: 'concern',
  },
  biodiversity: {
    natura2000Land: { value: 19.1, unit: '% land', year: 2023 },
    natura2000Marine: { value: 13, unit: '% EEZ', year: 2023 },
    threatenedSpecies: { value: 2580, unit: 'IUCN red-list', year: 2022 },
    habitatsFavourable: { value: 9, unit: '%', year: 2019, source: 'Art. 17 reporting' },
    narrative:
      'Italy is one of the EU\'s biodiversity-richest countries (Mediterranean and ' +
      'Alpine biogeographical regions) but only ~9% of habitat assessments are ' +
      '"favourable" — among the lowest in the EU. The 2023 National Biodiversity ' +
      'Strategy 2030 commits to 30% protected area coverage by 2030 (currently ~22% ' +
      'including national parks). Wildfire pressure on Mediterranean habitats is ' +
      'rising sharply.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 50, unit: '%', year: 2022 },
    circularMaterialUseRate: { value: 18.7, unit: '%', year: 2022 },
    resourceProductivity: { value: 3.5, unit: '€/kg', year: 2022 },
    narrative:
      'Italy has one of the EU\'s highest circular material use rates (~19%) — ' +
      'a structural feature of a resource-poor, export-oriented manufacturing ' +
      'economy that has long valued secondary materials. Municipal recycling at ' +
      '~50% is on the 2025 (55%) trajectory in north-central regions but lags in ' +
      'the south. The Circular Economy Strategy (2022) and the PNRR\'s €2.1bn ' +
      'waste-infrastructure envelope target southern catch-up.',
    status: 'partial',
  },
  adaptation: {
    strategy: {
      title: 'Piano Nazionale di Adattamento ai Cambiamenti Climatici (PNACC)',
      adoptedYear: 2015,
      lastUpdate: 2023,
      url: 'https://www.mase.gov.it/pagina/piano-nazionale-di-adattamento-ai-cambiamenti-climatici',
    },
    keyRisks: [
      'Drought and water scarcity (Po Valley, southern regions, islands)',
      'Heatwaves and excess mortality (Mediterranean cities)',
      'Coastal erosion and sea-level rise (Venice, Adriatic coast)',
      'Wildfires (Sicily, Sardinia, Calabria, central Apennines)',
      'Hydrogeological instability and landslides in mountain regions',
    ],
    sectoralPlans: [
      'Water',
      'Agriculture',
      'Forestry',
      'Coastal & maritime',
      'Health',
      'Infrastructure',
    ],
    narrative:
      'The PNACC was finally adopted in December 2023 — eight years after the strategy ' +
      'was published. The 2024 floods in Emilia-Romagna (€10bn+ damages) and the 2022 ' +
      'Marmolada glacier collapse highlighted the cascading risks of compound climate ' +
      'events. Implementation depends on regional plans (each region writes its own) ' +
      'and on the operationalisation of the Italia Sicura territorial-risk programme.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-06',
    finalSubmitted: '2024-07',
    commissionAssessment:
      'The Commission\'s December 2023 verdict on the Italian draft was "partially ' +
      'aligned". Three weaknesses dominated the feedback: a renewables share (37% in ' +
      'the draft) too low against the implied EU effort-share, only a sketchy account ' +
      'of how transport emissions would actually be cut, and missing granularity on ' +
      'efficiency sub-targets. In the July 2024 update Rome moved the RES headline to ' +
      '39.4% and, for the first time, set out an explicit timeline for retiring gas ' +
      'boilers from the housing stock.',
    esabccCommentary:
      'On paper the 2024 PNIEC is a meaningful upgrade on the 2019 plan, but in our ' +
      'view the binding constraint is execution rather than ambition. Auctions under ' +
      'FER-1 and FER-X have undershot their volumes repeatedly because permits and ' +
      'grid connections do not arrive on the timescale projected by the plan. We ' +
      'also flag two specific pieces of the modelling that look optimistic: the ' +
      'LULUCF sink trajectory looks fragile against rising wildfire activity, and ' +
      'the southern offshore-wind pipeline — on which the 2030 capacity figures ' +
      'depend — has yet to demonstrate it can clear development risk at scale.',
    gaps: [
      'Permitting bottlenecks for renewables — regional/superintendency veto powers ',
      'Transport sector ESR trajectory not clearly delivered by current policy mix',
      'Buildings: Superbonus replaced without a stable retrofit incentive architecture',
      'Industrial decarbonisation pathway (Ilva/Acciaierie d\'Italia, refineries) under-specified',
    ],
    status: 'partial',
  },
  justTransition: {
    jtfAllocationEurM: 1211,
    regions: [
      'Sulcis-Iglesiente (Sardinia coal/heavy industry region)',
      'Taranto (Ilva steelworks, Apulia)',
    ],
    narrative:
      '€1.2bn JTF envelope (2021-27) focuses on two regions: Sulcis-Iglesiente in ' +
      'south-western Sardinia (legacy coal mining, the Portovesme metallurgy cluster) ' +
      'and Taranto in Apulia (Ilva/Acciaierie d\'Italia steelworks, Europe\'s largest ' +
      'steel plant). The Italian programme links JTF support to the broader PNRR ' +
      'green-transition envelope and Mezzogiorno cohesion programmes.',
  },
  policies: [
    {
      name: 'Long-Term Strategy on Climate (LTS)',
      year: 2021,
      summary: 'Commits Italy to climate neutrality by 2050; sets sectoral milestones and frames the PNIEC.',
      url: 'https://www.mase.gov.it/pagina/strategia-italiana-di-lungo-termine',
    },
    {
      name: 'Piano Nazionale Integrato Energia e Clima (PNIEC)',
      year: 2024,
      summary: 'Updated 2024 NECP: 39.4% RES, −43.7% ESR vs 2005, coal phase-out by 2025 (mainland), gas phase-out from heating by 2040.',
    },
    {
      name: 'Decreto FER-X',
      year: 2024,
      summary: 'New auction framework for renewable-electricity support beyond FER-1; multi-year volumes for solar, wind and revamping.',
    },
    {
      name: 'Decreto "Aree Idonee"',
      year: 2024,
      summary: 'Regional zoning rules for renewables siting — designed to clarify the conflict between landscape-protection veto and RES build-out.',
    },
    {
      name: 'Piano Nazionale di Ripresa e Resilienza (PNRR)',
      year: 2021,
      summary: 'National Recovery & Resilience Plan: €60bn+ for green transition (rail, hydrogen, grid, water, retrofit), to be deployed by 2026.',
    },
    {
      name: 'Climate Change Adaptation Plan (PNACC)',
      year: 2023,
      summary: 'Statutory adaptation plan covering 18 climate-impact areas; mandates regional adaptation plans cascading from the national framework.',
    },
    {
      name: 'Po Valley Air Quality Agreement',
      year: 2024,
      summary: 'Inter-regional protocol (Emilia-Romagna, Lombardy, Piedmont, Veneto) on ammonia, biomass heating, LEZ harmonisation in the Po airshed.',
    },
  ],
  watchNotes:
    '• Coal phase-out by 2025 on the mainland (with Sardinia by 2028) remains on track ' +
    'but creates a system-adequacy challenge if RES build-out lags — Terna\'s adequacy ' +
    'reports flag risk windows from 2026.\n' +
    '• Ilva/Acciaierie d\'Italia restructuring (Taranto steelworks) is the single largest ' +
    'industrial decarbonisation file; DRI-hydrogen route requires public co-financing and ' +
    'a credible green-hydrogen supply.\n' +
    '• Po Valley remains the EU\'s persistent air-quality hotspot — repeated CJEU rulings ' +
    'and the 2030 AAQD revision will keep this in focus.',
};

export default it;
