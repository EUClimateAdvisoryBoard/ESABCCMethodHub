/**
 * Germany — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const de: CountryProfile = {
  code: 'DE',
  name: 'Germany',
  eurostatCode: 'DE',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 51.1657, lon: 10.4515,
    capital: 'Berlin',
    populationM: 83.8,
    areaKkm2: 357.6,
    gdpPerCapitaEur: 46500,
    summary:
      'Germany is the EU\'s largest economy and largest greenhouse-gas emitter, but ' +
      'has cut emissions ~40% from 1990 levels — driven by the 2011 nuclear exit ' +
      'replaced by accelerated wind and solar, decarbonising power, and a coal exit ' +
      'pathway (latest 2038, with political ambition to advance to 2030 in west and ' +
      'east). The Climate Action Law (Bundes-Klimaschutzgesetz) writes climate ' +
      'neutrality by 2045 into statute, ahead of the EU\'s 2050 target, with binding ' +
      'sectoral budgets through 2030. Major implementation risks lie in buildings, ' +
      'transport and industrial decarbonisation, all of which have repeatedly missed ' +
      'their annual budgets.\n\n' +
      'Renewable electricity reached ~52% of gross consumption in 2023, supported by ' +
      'the EEG renewable surcharge mechanism (now general-budget funded), but the ' +
      'shift in industrial demand (steel, chemicals) and the 2022-2023 gas price ' +
      'shock have reshaped the trajectory — Germany is now restructuring its grid, ' +
      'hydrogen backbone and CCS framework simultaneously.',
    highlights: [
      'Net-zero by 2045 written into the Federal Climate Action Law (KSG)',
      '2030 power sector target: 80% renewable electricity',
      'Coal exit by 2038 (statutory) — political ambition to advance to 2030',
      'NECP 2024 assessed by the Commission as broadly aligned, with gaps in buildings/transport',
    ],
  },
  ghg: {
    totalLatest: { value: 673, unit: 'Mt CO2e', year: 2023, source: 'UBA / UNFCCC', sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/greenhouse-gases-viewer-data-viewers?activeAccordion=&country=DE" },
    total1990: 1249,
    perCapita: { value: 8.0, unit: 't CO2e/cap', year: 2023, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/total-greenhouse-gas-emission-trends?activeAccordion=546a7c35-9188-4d23-94ee-005d97c26f2b&country=DE" },
    perGdp: { value: 0.16, unit: 'kg CO2e/€', year: 2023, source: 'EEA', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/sdg_13_10/default/table?lang=en&geo=DE" },
    target2030: { value: -65, unit: '%', baseline: '1990', notes: 'Federal Climate Action Law (KSG); 2030 target tightened in 2021 amendment.' },
    target2050: { value: -100, unit: '%', year: 2045, notes: 'Net-zero by 2045, five years ahead of the EU economy-wide target.' },
    sectors: [
      { id: 'power',          label: 'Power & heat',  share: 32, absolute: 215 },
      { id: 'industry',       label: 'Industry',      share: 23, absolute: 154 },
      { id: 'transport',      label: 'Transport',     share: 22, absolute: 146 },
      { id: 'buildings',      label: 'Buildings',     share: 15, absolute: 102 },
      { id: 'agriculture',    label: 'Agriculture',   share: 8,  absolute: 53 },
      { id: 'waste',          label: 'Waste & other', share: 1,  absolute: 7 },
    ],
    trend: [
      { year: 1990, value: 1249 }, { year: 1995, value: 1129 },
      { year: 2000, value: 1056 }, { year: 2005, value: 1006 },
      { year: 2010, value: 942 },  { year: 2015, value: 909 },
      { year: 2019, value: 810 },  { year: 2020, value: 731 },
      { year: 2021, value: 762 },  { year: 2022, value: 745 },
      { year: 2023, value: 673 },
    ],
    narrative:
      'Headline emissions are on track toward the 2030 −65% goal at the economy-wide ' +
      'level (≈ −46% achieved through 2023). However, the Federal Climate Action Law ' +
      'sets annual sector budgets, and the buildings sector has overshot its annual ' +
      'budget in three of the last four years; transport has overshot in every year ' +
      'since 2018. The 2023 amendment of the KSG softened the annual sectoral ' +
      'budgets to a multi-year average — controversial because the Expert Council ' +
      'flagged a reduced enforceability of the law.',
    status: 'partial',
  },
  renewables: {
    shareLatest: { value: 22.0, unit: '%', year: 2023, source: 'AGEE-Stat', sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table?lang=en&geo=DE" },
    share2005: 6.8,
    share2020: 19.1,
    target2030: 41,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 52.0 },
      { id: 'heating',     label: 'Heating & cooling', share: 18.0 },
      { id: 'transport',   label: 'Transport',  share: 7.3 },
    ],
    trend: [
      { year: 2005, value: 6.8 }, { year: 2010, value: 11.7 },
      { year: 2015, value: 14.9 }, { year: 2020, value: 19.1 },
      { year: 2021, value: 19.4 }, { year: 2022, value: 20.8 },
      { year: 2023, value: 22.0 },
    ],
    narrative:
      'Electricity decarbonisation is the success story: renewables reached ~52% of ' +
      'gross electricity consumption in 2023 (wind onshore 26%, PV 12%, biomass and ' +
      'hydro the remainder). Heating-and-cooling and transport lag — the GEG (Heating ' +
      'Act) was diluted in 2023 and the EV ramp-up stalled after the 2024 subsidy ' +
      'wind-down. The NECP target of 41% gross final RES by 2030 implies a doubling ' +
      'of the deployment rate; the Commission flagged this as the single largest ' +
      'delivery gap in its 2024 assessment.',
    status: 'partial',
  },
  efficiency: {
    primary: { value: 290, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — primary energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=DE" },
    final:   { value: 197, unit: 'Mtoe', year: 2022, source: "Eurostat (nrg_bal_s — final energy)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_s/default/table?lang=en&geo=DE" },
    intensity: { value: 95, unit: 'kgoe/1000 EUR (2015)', year: 2022, source: "Eurostat (nrg_ind_ei)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ei/default/table?lang=en&geo=DE" },
    target2030: -26,
    narrative:
      'Final energy consumption fell ~17% between 2008 and 2022, but industrial ' +
      'electrification, electric mobility and heat-pump deployment push the trajectory ' +
      'flat for the rest of the decade. EED Article 8 enterprise audits and the ' +
      'Energy Efficiency Act (EnEfG, 2023) require ~500 PJ of additional savings ' +
      'by 2030 — implementation gap of ~30% in latest Commission assessment.',
    status: 'partial',
  },
  air: {
    pm25: { value: 11.0, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/germany-air-pollution-country-fact-sheet-2024" },
    no2:  { value: 14.8, unit: 'µg/m³', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/germany-air-pollution-country-fact-sheet-2024" },
    ozone: { value: 50.4, unit: 'µg/m³ (SOMO35)', year: 2022, source: "EEA air pollution country fact sheet", sourceUrl: "https://www.eea.europa.eu/en/topics/in-depth/air-pollution/air-pollution-country-fact-sheets-2024/germany-air-pollution-country-fact-sheet-2024" },
    prematureDeaths: { value: 28900, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA', sourceUrl: "https://www.eea.europa.eu/en/analysis/publications/health-impacts-of-air-pollution-in-europe-2024" },
    exceedanceShare: { value: 96, unit: '% urban pop > WHO 5 µg/m³', year: 2022, source: "EEA — Exceedance of air quality standards", sourceUrl: "https://www.eea.europa.eu/en/analysis/indicators/exceedance-of-air-quality-standards?activeAccordion=&country=DE" },
    narrative:
      'Air quality has improved markedly — PM2.5 fell from ~17 µg/m³ in 2005 to ~11 ' +
      'µg/m³ in 2022 — but almost all urban populations remain above the WHO ' +
      'guideline value of 5 µg/m³. NO₂ exceedances in cities collapsed after the ' +
      'diesel-gate retrofits and the LEZ network. New Ambient Air Quality Directive ' +
      'limits (2030) will require further action in industrial NRW and Saxony.',
    status: 'partial',
  },
  water: {
    surfaceWaterGood: { value: 9, unit: '%', year: 2021, source: 'WISE-WFD', sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/germany" },
    groundwaterGood: { value: 64, unit: '%', year: 2021, source: "WISE-WFD country profile", sourceUrl: "https://water.europa.eu/freshwater/countries/wfd/germany" },
    bathingWaterExcellent: { value: 91, unit: '%', year: 2023, source: "EEA bathing water reports", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/bathing-water-directive/state-of-bathing-waters?country=DE" },
    drinkingWaterCompliance: { value: 99, unit: '%', year: 2022, source: "EU Drinking Water Directive reporting", sourceUrl: "https://water.europa.eu/freshwater/europe-freshwater/drinking-water-directive/state-of-drinking-water?country=DE" },
    narrative:
      'Drinking and bathing-water quality is excellent, but only ~9% of surface ' +
      'water bodies reach "good ecological status" — diffuse agricultural nitrate ' +
      'pollution and morphological alterations of rivers are the dominant pressures. ' +
      'The 3rd River Basin Management Plans (2022-27) acknowledge the Water Framework ' +
      'Directive 2027 deadline will be missed for the great majority of water bodies.',
    status: 'concern',
  },
  biodiversity: {
    natura2000Land: { value: 15.5, unit: '% land', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=DE" },
    natura2000Marine: { value: 45, unit: '% EEZ', year: 2023, source: "EEA Natura 2000 barometer", sourceUrl: "https://www.eea.europa.eu/en/analysis/maps-and-charts/natura-2000-barometer-statistics?country=DE" },
    threatenedSpecies: { value: 1820, unit: 'IUCN red-list', year: 2022, source: "IUCN Red List — national totals", sourceUrl: "https://www.iucnredlist.org/search?searchType=species&landRegions=DE" },
    habitatsFavourable: { value: 25, unit: '%', year: 2019, source: 'Art. 17 reporting', sourceUrl: "https://www.eea.europa.eu/themes/biodiversity/state-of-nature-in-the-eu/article-17-national-summary-dashboards/germany" },
    narrative:
      'Natura 2000 land coverage at ~15.5% is below the EU-27 average; marine ' +
      'coverage is very high (mostly North Sea / Baltic). Only ~25% of habitat ' +
      'assessments returned "favourable" — particularly poor for grasslands, ' +
      'wetlands and forest habitats. The Nature Restoration Regulation will ' +
      'require substantial new restoration commitments in agricultural and ' +
      'peatland landscapes.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 68, unit: '%', year: 2022, source: "Eurostat (cei_wm011)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_wm011/default/table?lang=en&geo=DE" },
    circularMaterialUseRate: { value: 13.4, unit: '%', year: 2022, source: "Eurostat (cei_srm030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_srm030/default/table?lang=en&geo=DE" },
    resourceProductivity: { value: 2.7, unit: '€/kg', year: 2022, source: "Eurostat (cei_pc030)", sourceUrl: "https://ec.europa.eu/eurostat/databrowser/view/cei_pc030/default/table?lang=en&geo=DE" },
    narrative:
      'Municipal recycling at ~68% is the highest in the EU, but the circular ' +
      'material use rate (~13%) has been flat for a decade and resource ' +
      'productivity has stalled. The 2024 ProgRess IV resource-efficiency programme ' +
      'targets 25% CMU by 2030, requiring a step-change in industrial symbiosis ' +
      'and product-as-a-service models.',
    status: 'partial',
  },
  adaptation: {
    strategy: {
      title: 'Deutsche Anpassungsstrategie an den Klimawandel (DAS)',
      adoptedYear: 2008,
      lastUpdate: 2024,
      url: 'https://www.bmuv.de/themen/klimaanpassung',
    },
    keyRisks: [
      'Heat stress and excess mortality in urban areas (notably Berlin, Rhine-Main, Ruhr)',
      'River flooding (Rhine, Elbe, Danube) and pluvial flooding (Ahr 2021 disaster)',
      'Forest dieback and bark-beetle outbreaks across central/eastern Länder',
      'Low-flow events on Rhine constraining inland navigation and industrial cooling',
      'Drought stress on cropland in northeastern Germany',
    ],
    sectoralPlans: [
      'Water',
      'Forestry',
      'Agriculture',
      'Health',
      'Urban planning',
    ],
    narrative:
      'The 2024 Federal Climate Adaptation Act (Bundes-Klimaanpassungsgesetz) puts ' +
      'adaptation on a statutory footing for the first time, requiring federal and ' +
      'Länder governments to set risk-based adaptation strategies on rolling cycles. ' +
      'The 2021 Ahr Valley flooding (€33bn damages, 184 deaths) reset the political ' +
      'salience of physical climate risk; vulnerability and risk assessments are now ' +
      'mainstreamed into the national infrastructure planning framework.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-06',
    finalSubmitted: '2024-09',
    commissionAssessment:
      'Commission assessment (Dec 2023) judged the German NECP largely aligned ' +
      'with the 2030 EU framework, but flagged gaps in the renewables sub-sector ' +
      'mix (heat, transport), insufficient detail on the buildings decarbonisation ' +
      'pathway, and no quantified pathway for industrial CCS uptake.',
    esabccCommentary:
      'Federal Climate Action Law (KSG) provides the architectural backbone but the ' +
      '2023 amendment weakened the sectoral budget mechanism, which the Federal ' +
      'Climate Expert Council has criticised. ESABCC notes Germany meets the EU ' +
      'effort-sharing 2030 trajectory only with substantial LULUCF assumptions that ' +
      'are at risk from forest dieback.',
    gaps: [
      'Buildings sector overshooting annual emission budget; GEG (Heating Act) effects uncertain',
      'Transport sector trajectory: no quantified policy mix bringing emissions below the 2030 sectoral cap',
      'Heating-and-cooling renewables share well below 2030 indicative pathway',
      'Limited treatment of negative emissions / industrial CCS in 2040 outlook',
    ],
    status: 'partial',
  },
  justTransition: {
    jtfAllocationEurM: 2480,
    regions: [
      'Lausitz (BB/SN coal region)',
      'Mitteldeutsches Revier (SN/ST/TH)',
      'Rheinisches Revier (NRW)',
      'Helmstedt (NI)',
    ],
    narrative:
      '€40bn financial framework for coal-region restructuring (Strukturstärkungsgesetz) ' +
      'sits alongside the €2.5bn JTF allocation. Lausitz and the Rhineland account ' +
      'for ~80% of envelope; programme rolled forward to 2038 in line with the ' +
      'statutory coal-exit date.',
  },
  policies: [
    {
      name: 'Federal Climate Action Law (KSG)',
      year: 2019,
      summary: 'Statutory 2030 (−65% vs 1990) and 2045 (net-zero) GHG targets with annual sectoral emission budgets. 2023 amendment shifted enforcement from annual to multi-year average.',
      url: 'https://www.gesetze-im-internet.de/ksg/',
    },
    {
      name: 'Renewable Energy Sources Act (EEG)',
      year: 2000,
      summary: 'Feed-in tariff/auction regime for renewables. 2023 amendment sets 80% renewable electricity share by 2030 in statute.',
    },
    {
      name: 'Building Energy Act (GEG / "Heizungsgesetz")',
      year: 2020,
      summary: 'Energy performance and renewable-heat requirements for buildings; 2023 amendment phases out fossil-only heating in new buildings from 2024.',
    },
    {
      name: 'Coal Phase-out Act (KVBG)',
      year: 2020,
      summary: 'Sets statutory phase-out trajectory for lignite (by 2038) and hard coal, with compensation packages for operators and Länder.',
    },
    {
      name: 'Energy Efficiency Act (EnEfG)',
      year: 2023,
      summary: 'Cross-sectoral primary and final energy consumption caps to 2030; requires public-sector annual energy savings and waste-heat utilisation.',
    },
    {
      name: 'Federal Climate Adaptation Act',
      year: 2024,
      summary: 'Statutory adaptation planning framework for federal and Länder levels; mandates regular risk assessments.',
    },
  ],
  watchNotes:
    '• Constitutional Court 2021 ruling (BVerfG, 1 BvR 2656/18) remains a touchstone: Karlsruhe ' +
    'requires that the climate burden cannot be unduly shifted onto future generations — ' +
    'KSG amendments are tested against this benchmark.\n' +
    '• Federal Expert Council on Climate Change publishes biennial reviews; next major review ' +
    'expected 2026.\n' +
    '• Industrial-decarbonisation pathway (steel, chemicals) depends on hydrogen ramp-up — ' +
    'national hydrogen strategy update due 2026, with €18bn KTF allocation through 2028.',
};

export default de;
