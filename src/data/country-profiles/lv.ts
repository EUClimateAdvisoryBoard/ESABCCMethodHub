/**
 * Latvia — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const lv: CountryProfile = {
  code: 'LV',
  name: 'Latvia',
  eurostatCode: 'LV',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 56.8796, lon: 24.6032,
    capital: 'Riga',
    populationM: 1.88,
    areaKkm2: 64.6,
    gdpPerCapitaEur: 18000,
    summary:
      'Latvia is among the EU\'s greenest economies on a per-capita basis: ~52% of ' +
      'territory is forested, the renewable-energy share is above 40% (the third-' +
      'highest in the EU after Sweden and Finland), and total greenhouse-gas ' +
      'emissions of ~11 Mt CO2e have fallen ~57% from 1990 levels. The LULUCF sink ' +
      'historically offset ~50% of gross emissions, although the sink has weakened ' +
      'markedly in recent inventories as a result of harvesting and stand age.\n\n' +
      'Latvia adopted a 2050 climate-neutrality strategy in 2020 and updated its ' +
      'NECP in 2024. The energy system is dominated by large hydro on the Daugava ' +
      'and by biomass district heating; the Baltic-region desynchronisation from the ' +
      'Russian BRELL grid and synchronisation with the European continental network ' +
      '(completed February 2025) reshapes electricity-market design. Latvia\'s ' +
      'climate vulnerability concentrates on forest health and Baltic-coast exposure.',
    highlights: [
      'Renewable share above 40% — third-highest in the EU',
      'Climate neutrality by 2050 strategy (LRDS 2020)',
      'Forests cover ~52% of land — LULUCF sink central to net-balance',
      'Baltic synchronisation with continental European grid completed Feb 2025',
    ],
  },
  ghg: {
    totalLatest: { value: 10.9, unit: 'Mt CO2e', year: 2022, source: 'EEA / UNFCCC', sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/greenhouse-gases-viewer-data-viewers?activeAccordion=&country=LV" },
    total1990: 25.4,
    perCapita: { value: 5.8, unit: 't CO2e/cap', year: 2022, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/total-greenhouse-gas-emission-trends?activeAccordion=546a7c35-9188-4d23-94ee-005d97c26f2b&country=LV" },
    perGdp: { value: 0.32, unit: 'kg CO2e/€', year: 2022, source: 'EEA', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/sdg_13_10/default/table?lang=en&geo=LV" },
    target2030: { value: -17, unit: '%', baseline: '2005', notes: 'ESR 2030 target under Fit-for-55.' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Climate neutrality by 2050 (LRDS 2020).' },
    sectors: [
      { id: 'transport',      label: 'Transport',     share: 30, absolute: 3.3 },
      { id: 'agriculture',    label: 'Agriculture',   share: 24, absolute: 2.6 },
      { id: 'power',          label: 'Power & heat',  share: 16, absolute: 1.7 },
      { id: 'buildings',      label: 'Buildings',     share: 12, absolute: 1.3 },
      { id: 'industry',       label: 'Industry',      share: 12, absolute: 1.3 },
      { id: 'waste',          label: 'Waste & other', share: 6,  absolute: 0.7 },
    ],
    trend: [
      { year: 1990, value: 25.4 }, { year: 1995, value: 12.2 },
      { year: 2000, value: 10.4 }, { year: 2005, value: 11.0 },
      { year: 2010, value: 12.0 }, { year: 2015, value: 11.5 },
      { year: 2019, value: 11.6 }, { year: 2020, value: 10.9 },
      { year: 2021, value: 11.2 }, { year: 2022, value: 10.9 },
      { year: 2023, value: 10.4 },
    ],
    narrative:
      'Headline emissions have been broadly stable since 2005 around the 11 Mt level. ' +
      'Transport — high in fuel-imports from neighbouring countries and high in ' +
      'vehicle age — is the single largest sector and the binding constraint on ESR ' +
      'compliance. Agriculture (extensive livestock and peatland soils) is the ' +
      'second-largest source. The LULUCF sink has shrunk from ~−9 Mt CO2e in 2010 to ' +
      '~−5 Mt in 2022, complicating the net-zero trajectory.',
    status: 'partial',
  },
  renewables: {
    shareLatest: { value: 43.3, unit: '%', year: 2022, source: 'Eurostat SHARES', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en&geo=LV" },
    share2005: 32.2,
    share2020: 42.1,
    target2030: 57,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 53.0 },
      { id: 'heating',     label: 'Heating & cooling', share: 57.4 },
      { id: 'transport',   label: 'Transport',  share: 7.1 },
    ],
    trend: [
      { year: 2005, value: 32.2 }, { year: 2010, value: 30.4 },
      { year: 2015, value: 37.5 }, { year: 2020, value: 42.1 },
      { year: 2021, value: 42.1 }, { year: 2022, value: 43.3 },
      { year: 2023, value: 43.7 },
    ],
    narrative:
      'Hydropower (Pļaviņas, Ķegums, Rīga on the Daugava) and biomass-CHP underpin a ' +
      'consistently high RES share. The 2030 target of 57% requires substantial ' +
      'expansion of wind (onshore corridor in Kurzeme, offshore Elwind project with ' +
      'Estonia) and PV; permitting reform in 2023 unlocked ~1 GW of solar PV in ' +
      'preparation.',
    status: 'on-track',
  },
  efficiency: {
    primary: { value: 4.8, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — primary energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=LV" },
    final:   { value: 4.4, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — final energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=LV" },
    intensity: { value: 146, unit: 'kgoe/1000 EUR (2015)', year: 2022, source: "Eurostat (nrg_ind_ei)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ei/default/table?lang=en&geo=LV" },
    target2030: -18,
    narrative:
      'Final energy use has been broadly flat since 2010 despite GDP growth. The ' +
      'building stock (Soviet-era multi-apartment housing) is the principal target ' +
      'for efficiency investment; the RRP earmarks ~€230m for renovations. Heat ' +
      'losses in district-heating networks remain high in older municipalities.',
    status: 'partial',
  },
  air: {
    pm25: { value: 11.2, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/latvia-air-pollution-country-fact-sheet-2024" },
    no2:  { value: 12.5, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/latvia-air-pollution-country-fact-sheet-2024" },
    ozone: { value: 41.8, unit: 'µg/m³ (SOMO35)', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/latvia-air-pollution-country-fact-sheet-2024" },
    prematureDeaths: { value: 1300, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/publications/health-impacts-of-air-pollution-in-europe-2024" },
    exceedanceShare: { value: 91, unit: '% urban pop > WHO 5 µg/m³', year: 2022, source: "EEA — Exceedance of air quality standards", sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/exceedance-of-air-quality-standards?activeAccordion=&country=LV" },
    narrative:
      'PM2.5 exposure is driven primarily by residential biomass and waste burning, ' +
      'especially in rural areas and small towns. Riga\'s air quality has improved ' +
      'with diesel-vehicle retirement, but most urban populations remain above the ' +
      'WHO guideline. The Air Pollution Reduction Action Plan 2020-2030 sets NEC ' +
      'Directive-compliant trajectories.',
    status: 'partial',
  },
  water: {
    surfaceWaterGood: { value: 41, unit: '%', year: 2021, source: 'WISE-WFD', sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/latvia" },
    groundwaterGood: { value: 100, unit: '%', year: 2021, source: "WISE-WFD country profile", sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/latvia" },
    bathingWaterExcellent: { value: 73, unit: '%', year: 2023, source: "EEA bathing water reports", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/bathing-water-directive/state-of-bathing-waters?country=LV" },
    drinkingWaterCompliance: { value: 98, unit: '%', year: 2022, source: "EU Drinking Water Directive reporting", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/drinking-water-directive/state-of-drinking-water?country=LV" },
    narrative:
      'Surface waters are pressured by diffuse agricultural pollution and ' +
      'hydromorphological alterations of the Daugava cascade. Groundwater status is ' +
      'excellent. The third-cycle River Basin Management Plan (2022-27) identifies ' +
      'nitrogen reduction in the Lielupe basin as the priority intervention.',
    status: 'partial',
  },
  biodiversity: {
    natura2000Land: { value: 11.5, unit: '% land', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=LV" },
    natura2000Marine: { value: 16.0, unit: '% EEZ', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=LV" },
    threatenedSpecies: { value: 580, unit: 'IUCN red-list', year: 2022, source: "IUCN Red List — national totals", sourceUrl: "https://www.iucnredlist.org/search?searchType=species&landRegions=LV" },
    habitatsFavourable: { value: 30, unit: '%', year: 2019, source: 'Art. 17 reporting', sourceUrl: "https://www.eea.europa.eu/themes/biodiversity/state-of-nature-in-the-eu/article-17-national-summary-dashboards/latvia" },
    narrative:
      'Natura 2000 terrestrial coverage at ~11.5% is below the EU average and well ' +
      'below the 30% by 2030 EU Biodiversity Strategy target. Forest age and ' +
      'harvesting pressure are dominant biodiversity issues, with the LULUCF debate ' +
      'closely intertwined. The Latgale wetland system is internationally significant.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 44, unit: '%', year: 2022, source: "Eurostat (cei_wm011)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_wm011/default/table?lang=en&geo=LV" },
    circularMaterialUseRate: { value: 4.8, unit: '%', year: 2022, source: "Eurostat (cei_srm030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_srm030/default/table?lang=en&geo=LV" },
    resourceProductivity: { value: 0.6, unit: '€/kg', year: 2022, source: "Eurostat (cei_pc030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_pc030/default/table?lang=en&geo=LV" },
    narrative:
      'Recycling has improved rapidly from a low base, but Latvia remains at risk of ' +
      'missing the 2025 (55%) target. The Circular Economy Strategy (2023) sets ' +
      'priorities in construction-and-demolition waste, biomass and food waste.',
    status: 'partial',
  },
  adaptation: {
    strategy: {
      title: 'National Climate Change Adaptation Plan 2019-2030',
      adoptedYear: 2019,
      lastUpdate: 2023,
      url: 'https://www.varam.gov.lv/en',
    },
    keyRisks: [
      'Forest pest outbreaks and bark beetle infestations',
      'Coastal erosion of the Gulf of Riga and western Baltic coast',
      'Flooding (pluvial and river — Daugava, Gauja) in urban catchments',
      'Heatwaves with elevated mortality in Riga and Daugavpils',
      'Storm-felling events in production forests',
    ],
    sectoralPlans: [
      'Forestry',
      'Water management',
      'Spatial planning',
      'Health',
      'Civil protection',
    ],
    narrative:
      'The 2019 Adaptation Plan is under revision in 2024-25 to integrate physical-' +
      'risk findings from the 2023 national risk assessment. Storm Mateusz (Jan 2022) ' +
      'caused €100m+ in forest damage and reset attention to wind-storm exposure.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-07',
    finalSubmitted: '2024-08',
    commissionAssessment:
      'The Commission assessment (Dec 2023) judged the Latvian NECP partially aligned ' +
      'with Fit-for-55, with positive marks on renewables ambition and concerns about ' +
      'the LULUCF sink trajectory, transport decarbonisation and policy detail in ' +
      'agriculture.',
    esabccCommentary:
      'Latvia\'s decarbonisation arithmetic depends heavily on LULUCF removals that ' +
      'are declining. ESABCC notes the 2030 ESR target is not currently met with ' +
      'announced measures, and that announcing a long-term forest-management strategy ' +
      'aligned with the LULUCF Regulation should be a priority.',
    gaps: [
      'LULUCF: declining sink trajectory inconsistent with LULUCF Regulation requirements',
      'Transport: gap of ~1.5 Mt CO2e against ESR 2030 cap with announced measures',
      'Agriculture: limited policy mix for organic-soil rewetting and livestock methane',
      'Limited quantitative ambition in industrial energy efficiency',
    ],
    status: 'partial',
  },
  justTransition: {
    jtfAllocationEurM: 192,
    regions: [
      'Latgale region (peat extraction)',
      'Kurzeme region (Liepāja energy-intensive industry)',
    ],
    narrative:
      'Latvia\'s JTF allocation supports diversification away from peat extraction in ' +
      'Latgale and energy-intensive industry restructuring in Kurzeme. SME ' +
      'diversification and workforce reskilling are the main intervention logics.',
  },
  policies: [
    {
      name: 'Climate Law (Klimata likums) — under preparation',
      year: 2025,
      summary: 'Framework climate law to provide statutory basis for 2050 net-zero, MRV and adaptation; legislative process advanced 2024-25.',
    },
    {
      name: 'Long-term Climate Strategy "Strategy of Latvia for the Achievement of Climate Neutrality by 2050"',
      year: 2020,
      summary: 'Sets the 2050 climate-neutrality objective and sectoral decarbonisation pathways.',
    },
    {
      name: 'National Climate Change Adaptation Plan 2019-2030',
      year: 2019,
      summary: 'National adaptation framework with cross-sectoral and sectoral measures.',
    },
    {
      name: 'Electricity Market Law (Baltic synchronisation amendments)',
      year: 2023,
      summary: 'Legal framework for synchronisation with the European continental electricity network; entered into force in line with February 2025 desynchronisation from BRELL.',
    },
    {
      name: 'Renewable Energy Sources Law amendments',
      year: 2023,
      summary: 'Simplified permitting for solar PV under 5 MW; net-metering reform; market premium mechanism for wind auctions.',
    },
  ],
  watchNotes:
    '• LULUCF sink dynamics are the central technical issue in Latvia\'s climate ' +
    'accounting — the 2024 inventory revision will be decisive.\n' +
    '• Baltic synchronisation (Feb 2025): completed; focus shifts to capacity adequacy ' +
    'and cross-border interconnection (Estlink, Latvia-Lithuania).\n' +
    '• Climate Law parliamentary progression and the next NECP iteration (2027) will ' +
    'be aligned.',
};

export default lv;
