/**
 * Luxembourg — EU member-state country profile.
 *
 * Figures are drawn from EEA / Eurostat / UNFCCC inventory / EU Commission
 * NECP assessments published 2022-2024 and rounded for headline display.
 * Treat values as best-available baseline data — editors should refine
 * specific numbers against the latest source on a per-indicator basis.
 */
import type { CountryProfile } from './_types';

const lu: CountryProfile = {
  code: 'LU',
  name: 'Luxembourg',
  eurostatCode: 'LU',
  lastReviewed: '2026-05-15',
  hero: {
    lat: 49.8153, lon: 6.1296,
    capital: 'Luxembourg',
    populationM: 0.66,
    areaKkm2: 2.6,
    gdpPerCapitaEur: 95000,
    summary:
      'Luxembourg has the EU\'s highest per-capita greenhouse-gas emissions if road-' +
      'fuel sales are attributed to the seller (UNFCCC accounting). The dominant ' +
      'driver is "fuel tourism": low excise duties draw cross-border refuelling from ' +
      'Belgium, France and Germany, and ~200,000 daily cross-border commuters add a ' +
      'further structural transport-emission layer. Roughly 60% of total national ' +
      'emissions arise from transport — by far the highest share in the EU. Total ' +
      'emissions of ~9 Mt CO2e have fallen ~26% from 1990.\n\n' +
      'Luxembourg adopted a 2050 climate-neutrality target in the 2020 Climate Law ' +
      '(Loi climat), with a binding 2030 target of −55% versus 2005 — one of the most ' +
      'ambitious in the EU on a percentage basis. Carbon-tax introduction (2021) and ' +
      'progressive excise duty alignment with neighbours are the headline policy ' +
      'levers, although the structural cross-border dimension means many emissions ' +
      'shifts are "outsourced" rather than reduced. The 2024 NECP update tightened ' +
      'measures across all sectors.',
    highlights: [
      'Climate neutrality by 2050 in Climate Law (Loi climat, 2020)',
      '2030 target: −55% vs 2005 — among most ambitious in EU',
      'Transport ~60% of national emissions (fuel-tourism driven)',
      'CO2 tax from 2021 — €45/t in 2024, rising to €55/t by 2026',
    ],
  },
  ghg: {
    totalLatest: { value: 8.9, unit: 'Mt CO2e', year: 2022, source: 'EEA / UNFCCC' },
    total1990: 12.0,
    perCapita: { value: 13.5, unit: 't CO2e/cap', year: 2022, source: 'EEA' },
    perGdp: { value: 0.13, unit: 'kg CO2e/€', year: 2022, source: 'EEA' },
    target2030: { value: -55, unit: '%', baseline: '2005', notes: 'Climate Law (2020); among the most ambitious national 2030 targets in the EU.' },
    target2050: { value: -100, unit: '%', year: 2050, notes: 'Net-zero by 2050 (Climate Law, 2020).' },
    sectors: [
      { id: 'transport',      label: 'Transport',     share: 60, absolute: 5.3 },
      { id: 'buildings',      label: 'Buildings',     share: 14, absolute: 1.2 },
      { id: 'industry',       label: 'Industry',      share: 12, absolute: 1.1 },
      { id: 'power',          label: 'Power & heat',  share: 5,  absolute: 0.4 },
      { id: 'agriculture',    label: 'Agriculture',   share: 6,  absolute: 0.6 },
      { id: 'waste',          label: 'Waste & other', share: 3,  absolute: 0.3 },
    ],
    trend: [
      { year: 1990, value: 12.0 }, { year: 1995, value: 9.4 },
      { year: 2000, value: 9.4 },  { year: 2005, value: 12.7 },
      { year: 2010, value: 12.3 }, { year: 2015, value: 10.5 },
      { year: 2019, value: 10.8 }, { year: 2020, value: 9.5 },
      { year: 2021, value: 9.8 },  { year: 2022, value: 8.9 },
      { year: 2023, value: 8.2 },
    ],
    narrative:
      'The transport sector accounts for ~60% of national emissions — uniquely in ' +
      'the EU. Roughly 70% of road-fuel sold in Luxembourg is consumed outside the ' +
      'country, an accounting feature ("fuel exports") that distorts per-capita ' +
      'comparisons. Strictly within national territorial use, per-capita emissions ' +
      'are closer to the EU average. Since the 2021 introduction of the CO2 tax, ' +
      'fuel sales have fallen ~12% (2021-2023) as cross-border price differentials ' +
      'narrowed; transport emissions are accordingly trending down.',
    status: 'partial',
  },
  renewables: {
    shareLatest: { value: 14.4, unit: '%', year: 2022, source: 'Eurostat SHARES' },
    share2005: 1.4,
    share2020: 11.7,
    target2030: 37,
    bySubsector: [
      { id: 'electricity', label: 'Electricity', share: 12.3 },
      { id: 'heating',     label: 'Heating & cooling', share: 11.5 },
      { id: 'transport',   label: 'Transport',  share: 11.2 },
    ],
    trend: [
      { year: 2005, value: 1.4 }, { year: 2010, value: 2.9 },
      { year: 2015, value: 5.0 }, { year: 2020, value: 11.7 },
      { year: 2021, value: 11.7 }, { year: 2022, value: 14.4 },
      { year: 2023, value: 15.1 },
    ],
    narrative:
      'Luxembourg has limited domestic resource potential — minimal hydro, small ' +
      'wind sites, modest solar — but RES share has grown rapidly through PV ' +
      'deployment, biomass district heating and statistical transfers (purchases of ' +
      'RES from Estonia and Lithuania). The 2030 NECP target of 37% is the most ' +
      'difficult arithmetically — the gap is expected to be closed partly through ' +
      'continued statistical transfers and renewable hydrogen imports.',
    status: 'partial',
  },
  efficiency: {
    primary: { value: 3.7, unit: 'Mtoe', year: 2022 },
    final:   { value: 3.4, unit: 'Mtoe', year: 2022 },
    intensity: { value: 53, unit: 'kgoe/1000 EUR (2015)', year: 2022 },
    target2030: -44,
    narrative:
      'Energy intensity per unit GDP is the lowest in the EU thanks to the ' +
      'financial-services-dominated economy. Absolute consumption is heavily ' +
      'transport-driven (fuel-tourism component). Building stock is relatively new ' +
      'and well-insulated by EU standards. NECP 2030 final-energy savings target is ' +
      'ambitious and depends substantially on reducing road-fuel sales to non-' +
      'residents.',
    status: 'partial',
  },
  air: {
    pm25: { value: 9.2, unit: 'µg/m³', year: 2022 },
    no2:  { value: 22.0, unit: 'µg/m³', year: 2022 },
    ozone: { value: 49.0, unit: 'µg/m³ (SOMO35)', year: 2022 },
    prematureDeaths: { value: 240, unit: 'deaths/yr (PM2.5)', year: 2021, source: 'EEA' },
    exceedanceShare: { value: 98, unit: '% urban pop > WHO 5 µg/m³', year: 2022 },
    narrative:
      'NO2 concentrations are above the EU average and reflect the very high road-' +
      'traffic intensity, including diesel commuter and lorry transit. Free public ' +
      'transport (introduced 2020 — first country in the world) and the rapidly ' +
      'electrifying bus fleet support gradual improvements. Compliance with the new ' +
      'Ambient Air Quality Directive NO2 limit (2030) will require additional ' +
      'urban-traffic measures.',
    status: 'partial',
  },
  water: {
    surfaceWaterGood: { value: 4, unit: '%', year: 2021, source: 'WISE-WFD' },
    groundwaterGood: { value: 70, unit: '%', year: 2021 },
    bathingWaterExcellent: { value: 50, unit: '%', year: 2023 },
    drinkingWaterCompliance: { value: 99, unit: '%', year: 2022 },
    narrative:
      'Only ~4% of surface waters reach "good ecological status" — among the lowest ' +
      'in the EU — driven by diffuse agricultural pollution and morphological ' +
      'alterations of small rivers in this densely populated, intensively farmed ' +
      'country. Drinking water compliance is excellent. The 3rd RBMP (2022-27) ' +
      'acknowledges the WFD 2027 deadline will be missed for the great majority of ' +
      'water bodies.',
    status: 'concern',
  },
  biodiversity: {
    natura2000Land: { value: 27.4, unit: '% land', year: 2023 },
    natura2000Marine: { value: 0, unit: '% EEZ', year: 2023 },
    threatenedSpecies: { value: 350, unit: 'IUCN red-list', year: 2022 },
    habitatsFavourable: { value: 22, unit: '%', year: 2019, source: 'Art. 17 reporting' },
    narrative:
      'Natura 2000 terrestrial coverage at ~27% is well above the EU average. ' +
      'However, habitat condition is poor: only ~22% of Habitats Directive ' +
      'assessments are favourable, with grasslands and stream habitats in ' +
      'particularly poor condition. Landscape fragmentation due to urbanisation and ' +
      'roads is the binding pressure.',
    status: 'concern',
  },
  circular: {
    municipalRecycling: { value: 52, unit: '%', year: 2022 },
    circularMaterialUseRate: { value: 11.0, unit: '%', year: 2022 },
    resourceProductivity: { value: 4.4, unit: '€/kg', year: 2022 },
    narrative:
      'Resource productivity is the highest in the EU (financial-services GDP per ' +
      'unit material throughput). Municipal recycling at ~52% is approaching the ' +
      '2025 target. The 2021 Circular Economy Strategy emphasises construction-and-' +
      'demolition waste, food waste and product-as-a-service business models.',
    status: 'on-track',
  },
  adaptation: {
    strategy: {
      title: 'Stratégie nationale d\'adaptation aux effets du changement climatique',
      adoptedYear: 2018,
      lastUpdate: 2023,
      url: 'https://environnement.public.lu/',
    },
    keyRisks: [
      'Urban heat-island effects in Luxembourg City and Esch-sur-Alzette',
      'Low-flow events on the Moselle and Sûre affecting cooling and navigation',
      'Pluvial and flash flooding (notably the July 2021 floods)',
      'Drought stress on vineyards and forestry',
      'Cross-border heatwave-mortality compounded by commuter exposure',
    ],
    sectoralPlans: [
      'Water management',
      'Forestry',
      'Agriculture & viticulture',
      'Spatial planning',
      'Public health',
    ],
    narrative:
      'The 2018 Adaptation Strategy is being updated to integrate the July 2021 ' +
      'flood lessons (which caused €185m in damages). Cross-border coordination with ' +
      'France, Belgium and Germany is a defining feature of adaptation practice — ' +
      'commuter exposure during heatwaves is a notable cross-jurisdictional public-' +
      'health concern.',
    status: 'partial',
  },
  necp: {
    draftSubmitted: '2023-07',
    finalSubmitted: '2024-07',
    commissionAssessment:
      'The Commission assessment (Dec 2023) judged Luxembourg\'s NECP largely aligned ' +
      'with Fit-for-55, praising the 2030 GHG ambition and CO2 tax architecture but ' +
      'flagging the heavy reliance on statistical transfers and uncertain transport-' +
      'sector trajectory.',
    esabccCommentary:
      'Luxembourg\'s 2030 ESR target is the most ambitious among EU member states. ' +
      'Achieving it requires sustained CO2 tax rises and excise alignment with ' +
      'neighbouring countries — politically sensitive given the budget contribution ' +
      'of fuel-tourism receipts. ESABCC notes that "outsourced" emission reductions ' +
      '(fuel sales falling because they happen elsewhere) deliver national ' +
      'compliance but limited EU-wide climate benefit.',
    gaps: [
      'Transport: trajectory depends on continued fuel-tourism erosion and excise alignment',
      'RES 2030 target relies materially on statistical transfers from other member states',
      'Industrial process emissions: limited policy mix beyond ETS price signal',
      'Adaptation: post-2021 flood update not yet operationalised',
    ],
    status: 'partial',
  },
  policies: [
    {
      name: 'Climate Law (Loi climat)',
      year: 2020,
      summary: 'Framework law enshrining 2050 net-zero, the 2030 −55% target vs 2005 and sectoral emissions budgets.',
    },
    {
      name: 'CO2 Tax (Loi modifiée du 22 décembre 2006)',
      year: 2021,
      summary: 'National carbon tax on transport and heating fuels; €20/t in 2021, €45/t in 2024, scheduled to reach €55/t in 2026.',
    },
    {
      name: 'Free Public Transport Law',
      year: 2019,
      summary: 'Made all public transport (bus, rail, tram) free of charge nationwide from 1 March 2020 — first country in the world.',
    },
    {
      name: 'Circular Economy Strategy',
      year: 2021,
      summary: 'Cross-sectoral roadmap with priorities in construction-and-demolition waste, food waste and product-as-a-service.',
    },
    {
      name: 'National Energy Efficiency Action Plan',
      year: 2023,
      summary: 'EED transposition framework with sectoral measures for buildings, transport and industry.',
    },
  ],
  watchNotes:
    '• Fuel-tourism dynamics interact directly with EU ETS-2 (road transport) — ' +
    'the 2027 launch is expected to accelerate excise convergence with neighbours.\n' +
    '• Statistical-transfer pipeline for RES is the load-bearing assumption in 2030 ' +
    'compliance arithmetic.\n' +
    '• Cross-border commuter dynamics (~200k daily) shape both adaptation and ' +
    'transport-decarbonisation planning.',
};

export default lu;
