/**
 * Seed indicators for the Project Workspace "Indicator Database" module.
 * ----------------------------------------------------------------------
 * Built around the ECNO (European Climate Neutrality Observatory) progress
 * tracker framework. ECNO groups its work into 13 "building blocks"
 * (Mobility, Buildings, Industry, Electricity, Agrifood, Carbon Dioxide
 * Removal, Clean Technologies, Finance, Governance, Lifestyles, Adaptation,
 * External Action, Just & Fair Transition). We map each ECNO indicator we
 * track to the closest existing local sector so the workspace UI stays
 * consistent — the original ECNO block is recorded in each entry's
 * `description` and `source` fields for traceability.
 *
 * Wording note: indicator names and descriptions are paraphrased; numeric
 * values, units, target levels and source URLs come from the underlying
 * primary publishers (Eurostat, EEA, EAFO, IRENA, EHPA, JRC, …). The ECNO
 * tracker itself is only used as a navigational index — we do not reuse
 * its prose or its packaged dataset.
 *
 * Primary sources:
 *   • Eurostat dissemination API  — https://ec.europa.eu/eurostat
 *   • EEA datahub                 — https://www.eea.europa.eu/en/datahub
 *   • EAFO                        — https://alternative-fuels-observatory.ec.europa.eu
 *   • IRENA / IRENASTAT           — https://www.irena.org/Data
 *   • EHPA Market Report          — https://www.ehpa.org/market-data
 *   • ECNO tracker (index only)   — https://climateobservatory.eu/progress-tracker
 */

export type IndicatorCategory =
  | 'emissions'
  | 'energy-supply'
  | 'energy-demand'
  | 'transport'
  | 'buildings'
  | 'industry'
  | 'agriculture'
  | 'lulucf'
  | 'finance'
  | 'fairness';

export interface IndicatorDataPoint {
  year: number;
  value: number;
}

export interface Indicator {
  id: string;
  name: string;
  category: IndicatorCategory;
  unit: string;
  description: string;
  source: string;
  sourceUrl: string;
  /** Target value at the target year (if defined by EU law or strategy). */
  targetValue?: number;
  targetYear?: number;
  /** Direction of progress: "down" means lower-is-better. */
  direction: 'up' | 'down';
  data: IndicatorDataPoint[];
  /** True for ECNO/seed indicators; user-added ones are false. */
  isSeed: boolean;
}

export const ECNO_INDICATORS: Indicator[] = [
  // ── Emissions ─────────────────────────────────────────────────────────────
  {
    id: 'ghg-total-net',
    name: 'Net GHG emissions (excl. LULUCF)',
    category: 'emissions',
    unit: 'Mt CO₂eq',
    description:
      'Total EU-27 net greenhouse gas emissions excluding LULUCF, ' +
      'reported under the UNFCCC inventory.',
    source: 'EEA GHG inventory',
    sourceUrl: 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
    targetValue: 850,
    targetYear: 2030,
    direction: 'down',
    isSeed: true,
    data: [
      { year: 2018, value: 3893 },
      { year: 2019, value: 3743 },
      { year: 2020, value: 3457 },
      { year: 2021, value: 3635 },
      { year: 2022, value: 3548 },
      { year: 2023, value: 3225 },
    ],
  },

  // ── Energy supply (ECNO: Electricity) ────────────────────────────────────
  {
    id: 'res-share',
    name: 'Renewable energy share in gross final energy consumption',
    category: 'energy-supply',
    unit: '%',
    description:
      'Share of energy from renewable sources in gross final energy ' +
      'consumption (RED III binding 2030 target: 42.5%, indicative 45%).',
    source: 'Eurostat (nrg_ind_ren)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table',
    targetValue: 42.5,
    targetYear: 2030,
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2018, value: 18.0 },
      { year: 2019, value: 19.1 },
      { year: 2020, value: 22.0 },
      { year: 2021, value: 21.9 },
      { year: 2022, value: 23.0 },
      { year: 2023, value: 24.5 },
    ],
  },
  {
    id: 'power-sector-ghg',
    name: 'Power sector GHG emissions',
    category: 'energy-supply',
    unit: 'Mt CO₂eq',
    description:
      'GHG emissions from public electricity and heat production (CRF 1.A.1.a/b/c). ' +
      'ECNO block: Electricity.',
    source: 'EEA GHG inventory (CRF 1.A.1)',
    sourceUrl: 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
    direction: 'down',
    isSeed: true,
    data: [
      { year: 2018, value: 953 },
      { year: 2019, value: 829 },
      { year: 2020, value: 726 },
      { year: 2021, value: 793 },
      { year: 2022, value: 786 },
      { year: 2023, value: 622 },
    ],
  },
  {
    id: 'solar-pv-additions',
    name: 'Annual solar PV capacity additions',
    category: 'energy-supply',
    unit: 'GW/yr',
    description:
      'Net new solar photovoltaic capacity installed each year across the EU-27. ' +
      'ECNO block: Electricity.',
    source: 'IRENA renewable capacity statistics',
    sourceUrl: 'https://www.irena.org/Data/View-data-by-topic/Capacity-and-Generation/Statistics-Time-Series',
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2019, value: 16 },
      { year: 2020, value: 21 },
      { year: 2021, value: 28 },
      { year: 2022, value: 41 },
      { year: 2023, value: 56 },
      { year: 2024, value: 65 },
    ],
  },
  {
    id: 'wind-additions',
    name: 'Annual wind capacity additions',
    category: 'energy-supply',
    unit: 'GW/yr',
    description:
      'Net new onshore and offshore wind capacity commissioned each year in the EU-27. ' +
      'ECNO block: Electricity.',
    source: 'IRENA renewable capacity statistics',
    sourceUrl: 'https://www.irena.org/Data/View-data-by-topic/Capacity-and-Generation/Statistics-Time-Series',
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2019, value: 13 },
      { year: 2020, value: 14 },
      { year: 2021, value: 11 },
      { year: 2022, value: 16 },
      { year: 2023, value: 16 },
      { year: 2024, value: 13 },
    ],
  },
  {
    id: 'battery-storage-capacity',
    name: 'Stationary battery storage capacity',
    category: 'energy-supply',
    unit: 'GW',
    description:
      'Installed stationary battery storage capacity (grid-scale + behind-the-meter) ' +
      'in the EU-27. ECNO block: Electricity.',
    source: 'IRENA renewable capacity statistics',
    sourceUrl: 'https://www.irena.org/Data/View-data-by-topic/Capacity-and-Generation/Statistics-Time-Series',
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2020, value: 2.5 },
      { year: 2021, value: 4.0 },
      { year: 2022, value: 7.5 },
      { year: 2023, value: 14 },
      { year: 2024, value: 25 },
    ],
  },
  {
    id: 'fossil-power-share',
    name: 'Fossil share of electricity generation',
    category: 'energy-supply',
    unit: '%',
    description:
      'Share of gross electricity generation produced from coal, oil and gas in the EU-27. ' +
      'Required to fall sharply to align with the 2040 climate target. ECNO block: Electricity.',
    source: 'Eurostat (nrg_bal_peh)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_peh/default/table',
    direction: 'down',
    isSeed: true,
    data: [
      { year: 2018, value: 42 },
      { year: 2019, value: 38 },
      { year: 2020, value: 35 },
      { year: 2021, value: 37 },
      { year: 2022, value: 38 },
      { year: 2023, value: 32 },
    ],
  },
  {
    id: 'smart-meter-rollout',
    name: 'Electricity smart meter penetration',
    category: 'energy-supply',
    unit: '%',
    description:
      'Share of consumption points equipped with a smart electricity meter. ' +
      'Tracks Electricity-Directive rollout obligations. ECNO block: Electricity.',
    source: 'JRC smart-meter benchmarking',
    sourceUrl: 'https://joint-research-centre.ec.europa.eu/scientific-activities-z/smart-electricity-systems-and-interoperability_en',
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2018, value: 34 },
      { year: 2020, value: 43 },
      { year: 2022, value: 56 },
      { year: 2023, value: 60 },
    ],
  },

  // ── Energy demand ────────────────────────────────────────────────────────
  {
    id: 'final-energy-consumption',
    name: 'Final energy consumption',
    category: 'energy-demand',
    unit: 'Mtoe',
    description:
      'EU final energy consumption. EED 2030 indicative target: 763 Mtoe.',
    source: 'Eurostat (nrg_bal_c)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table',
    targetValue: 763,
    targetYear: 2030,
    direction: 'down',
    isSeed: true,
    data: [
      { year: 2018, value: 1064 },
      { year: 2019, value: 1053 },
      { year: 2020, value: 962 },
      { year: 2021, value: 1018 },
      { year: 2022, value: 977 },
      { year: 2023, value: 940 },
    ],
  },
  {
    id: 'end-use-electrification',
    name: 'Electricity share of final energy demand',
    category: 'energy-demand',
    unit: '%',
    description:
      'Share of final energy consumption supplied as electricity (all sectors). ' +
      'Used as a proxy for end-use electrification progress. ECNO block: Electricity.',
    source: 'Eurostat (nrg_bal_c)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table',
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2018, value: 22.1 },
      { year: 2019, value: 22.4 },
      { year: 2020, value: 22.8 },
      { year: 2021, value: 22.9 },
      { year: 2022, value: 22.9 },
      { year: 2023, value: 23.2 },
    ],
  },

  // ── Transport (ECNO: Mobility) ───────────────────────────────────────────
  {
    id: 'ev-share-new-cars',
    name: 'Battery-electric vehicle share of new car registrations',
    category: 'transport',
    unit: '%',
    description:
      'Share of new passenger car registrations that are battery-electric. ' +
      'Tracks progress towards the CO₂-emission standards for new cars (100% ZEV by 2035).',
    source: 'EEA / ACEA',
    sourceUrl: 'https://www.eea.europa.eu/en/datahub/datahubitem-view/fa8b1229-3db6-495d-b18e-9c9b3267c02b',
    targetValue: 100,
    targetYear: 2035,
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2019, value: 1.9 },
      { year: 2020, value: 6.2 },
      { year: 2021, value: 9.1 },
      { year: 2022, value: 12.1 },
      { year: 2023, value: 14.6 },
      { year: 2024, value: 13.6 },
    ],
  },
  {
    id: 'zev-share-car-stock',
    name: 'Zero-emission share of passenger car stock',
    category: 'transport',
    unit: '%',
    description:
      'Cumulative share of zero-emission vehicles in the on-the-road passenger ' +
      'car fleet across the EU-27. ECNO block: Mobility.',
    source: 'Eurostat road vehicle stock (road_eqs_carpda)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/road_eqs_carpda/default/table',
    targetValue: 93.5,
    targetYear: 2050,
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2019, value: 0.3 },
      { year: 2020, value: 0.6 },
      { year: 2021, value: 1.0 },
      { year: 2022, value: 1.5 },
      { year: 2023, value: 2.3 },
      { year: 2024, value: 2.8 },
    ],
  },
  {
    id: 'zev-charging-points',
    name: 'Public EV charging points deployed',
    category: 'transport',
    unit: 'thousand points',
    description:
      'Cumulative count of publicly accessible alternative-fuel recharging points ' +
      'across the EU-27 (AC + DC). Used to track AFIR rollout. ECNO block: Mobility.',
    source: 'EAFO',
    sourceUrl: 'https://alternative-fuels-observatory.ec.europa.eu/transport-mode/road/european-union-eu27',
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2019, value: 180 },
      { year: 2020, value: 250 },
      { year: 2021, value: 330 },
      { year: 2022, value: 460 },
      { year: 2023, value: 630 },
      { year: 2024, value: 830 },
    ],
  },
  {
    id: 'road-passenger-share',
    name: 'Road share of inland passenger transport',
    category: 'transport',
    unit: '%',
    description:
      'Share of inland passenger transport (passenger-kilometres) carried by ' +
      'cars, buses and coaches. ECNO block: Mobility.',
    source: 'Eurostat (tran_hv_psmod)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/tran_hv_psmod/default/table',
    targetValue: 77.5,
    targetYear: 2050,
    direction: 'down',
    isSeed: true,
    data: [
      { year: 2018, value: 82.7 },
      { year: 2019, value: 82.1 },
      { year: 2020, value: 84.6 },
      { year: 2021, value: 83.5 },
      { year: 2022, value: 81.4 },
      { year: 2023, value: 80.6 },
    ],
  },
  {
    id: 'rail-passenger-share',
    name: 'Rail share of inland passenger transport',
    category: 'transport',
    unit: '%',
    description:
      'Share of inland passenger-kilometres travelled by rail (trains + trams + metros). ' +
      'ECNO block: Mobility.',
    source: 'Eurostat (tran_hv_psmod)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/tran_hv_psmod/default/table',
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2018, value: 7.9 },
      { year: 2019, value: 8.2 },
      { year: 2020, value: 5.7 },
      { year: 2021, value: 6.5 },
      { year: 2022, value: 7.6 },
      { year: 2023, value: 7.8 },
    ],
  },
  {
    id: 'rail-iww-freight-share',
    name: 'Rail and inland waterway share of freight transport',
    category: 'transport',
    unit: '%',
    description:
      'Share of inland tonne-kilometres carried by rail or inland waterways ' +
      '(the rest is hauled by road). ECNO block: Mobility.',
    source: 'Eurostat (tran_hv_frmod)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/tran_hv_frmod/default/table',
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2018, value: 23.7 },
      { year: 2019, value: 23.5 },
      { year: 2020, value: 23.1 },
      { year: 2021, value: 22.9 },
      { year: 2022, value: 22.1 },
      { year: 2023, value: 22.0 },
    ],
  },
  {
    id: 'rail-electrification',
    name: 'Share of electrified railway lines',
    category: 'transport',
    unit: '%',
    description:
      'Share of total operational railway track length that is electrified. ' +
      'ECNO block: Mobility.',
    source: 'Eurostat (rail_if_electri)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/rail_if_electri/default/table',
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2018, value: 55.6 },
      { year: 2019, value: 55.8 },
      { year: 2020, value: 56.1 },
      { year: 2021, value: 56.4 },
      { year: 2022, value: 56.5 },
    ],
  },
  {
    id: 'zev-share-van-stock',
    name: 'Zero-emission share of light commercial vehicle stock',
    category: 'transport',
    unit: '%',
    description:
      'Share of N1 light commercial vehicles in the EU-27 fleet that are zero-emission. ' +
      'Tracks the 2035 zero-emission target for new vans. ECNO block: Mobility.',
    source: 'Eurostat (road_eqs_lormot)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/road_eqs_lormot/default/table',
    targetValue: 100,
    targetYear: 2050,
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2020, value: 0.4 },
      { year: 2021, value: 0.7 },
      { year: 2022, value: 1.1 },
      { year: 2023, value: 1.6 },
    ],
  },
  {
    id: 'zev-share-truck-stock',
    name: 'Zero-emission share of heavy-duty vehicle stock',
    category: 'transport',
    unit: '%',
    description:
      'Share of heavy-duty trucks and buses in the EU-27 fleet that are zero-emission ' +
      '(battery-electric or fuel-cell). ECNO block: Mobility.',
    source: 'Eurostat (road_eqs_lormot)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/road_eqs_lormot/default/table',
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2020, value: 0.1 },
      { year: 2021, value: 0.15 },
      { year: 2022, value: 0.2 },
      { year: 2023, value: 0.3 },
    ],
  },

  // ── Buildings ────────────────────────────────────────────────────────────
  {
    id: 'building-renovation-rate',
    name: 'Energy-related building renovation rate',
    category: 'buildings',
    unit: '%/yr',
    description:
      'Weighted annual energy renovation rate of the EU building stock. ' +
      'EPBD recast (2024) requires Member States to at least double the deep-renovation rate.',
    source: 'JRC / Commission staff working document',
    sourceUrl: 'https://commission.europa.eu/topics/energy-efficiency/energy-efficient-buildings_en',
    targetValue: 2.0,
    targetYear: 2030,
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2018, value: 1.0 },
      { year: 2019, value: 1.0 },
      { year: 2020, value: 1.0 },
      { year: 2021, value: 1.1 },
      { year: 2022, value: 1.2 },
    ],
  },
  {
    id: 'buildings-ghg',
    name: 'Operational GHG emissions from buildings',
    category: 'buildings',
    unit: 'Mt CO₂eq',
    description:
      'Direct GHG emissions from energy use in residential and ' +
      'commercial/institutional buildings (CRF 1.A.4.a/b). ECNO block: Buildings.',
    source: 'EEA GHG inventory (CRF 1.A.4)',
    sourceUrl: 'https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2',
    direction: 'down',
    isSeed: true,
    data: [
      { year: 2018, value: 510 },
      { year: 2019, value: 491 },
      { year: 2020, value: 474 },
      { year: 2021, value: 506 },
      { year: 2022, value: 446 },
      { year: 2023, value: 420 },
    ],
  },
  {
    id: 'heat-pump-stock',
    name: 'Installed heat pump stock',
    category: 'buildings',
    unit: 'million units',
    description:
      'Cumulative installed base of heat pumps for space heating across the EU-27. ' +
      'REPowerEU targets 60 million units by 2030. ECNO block: Buildings.',
    source: 'EHPA Market Report',
    sourceUrl: 'https://www.ehpa.org/market-data/',
    targetValue: 60,
    targetYear: 2030,
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2019, value: 13.5 },
      { year: 2020, value: 15.0 },
      { year: 2021, value: 17.1 },
      { year: 2022, value: 20.0 },
      { year: 2023, value: 22.5 },
      { year: 2024, value: 24.5 },
    ],
  },
  {
    id: 'heat-pump-sales',
    name: 'Annual heat pump sales',
    category: 'buildings',
    unit: 'thousand units',
    description:
      'New heat pump units sold per year across the EU-27 (all heat-pump types). ' +
      'ECNO block: Buildings.',
    source: 'EHPA Market Report',
    sourceUrl: 'https://www.ehpa.org/market-data/',
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2019, value: 1620 },
      { year: 2020, value: 1830 },
      { year: 2021, value: 2180 },
      { year: 2022, value: 3000 },
      { year: 2023, value: 2640 },
      { year: 2024, value: 2100 },
    ],
  },
  {
    id: 'renewable-heating-cooling',
    name: 'Renewable share in heating and cooling',
    category: 'buildings',
    unit: '%',
    description:
      'Share of energy used for heating and cooling that comes from renewable sources. ' +
      'RED III indicative 2030 target: 49% (with annual +1.1pp average increment). ' +
      'ECNO block: Buildings.',
    source: 'Eurostat (nrg_ind_ren, nrg_bal=REN_H_C)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_ren/default/table',
    targetValue: 49,
    targetYear: 2030,
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2018, value: 21.7 },
      { year: 2019, value: 22.5 },
      { year: 2020, value: 23.9 },
      { year: 2021, value: 23.0 },
      { year: 2022, value: 24.8 },
      { year: 2023, value: 26.2 },
    ],
  },
  {
    id: 'floor-space-per-capita',
    name: 'Average residential floor space per resident',
    category: 'buildings',
    unit: 'm²/person',
    description:
      'Average residential floor area per EU resident. A rising trend pushes ' +
      'sectoral energy demand up even if per-m² intensity falls. ECNO block: Buildings.',
    source: 'Eurostat / EU-SILC (ilc_lvho03)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/ilc_lvho03/default/table',
    direction: 'down',
    isSeed: true,
    data: [
      { year: 2018, value: 41.1 },
      { year: 2019, value: 41.4 },
      { year: 2020, value: 42.0 },
      { year: 2021, value: 42.5 },
      { year: 2022, value: 42.9 },
    ],
  },

  // ── Industry ─────────────────────────────────────────────────────────────
  {
    id: 'industry-ghg',
    name: 'Industrial process and energy-use GHG emissions',
    category: 'industry',
    unit: 'Mt CO₂eq',
    description:
      'Combined GHG emissions from industrial energy use (CRF 1.A.2) and ' +
      'industrial processes & product use (CRF 2), EU-27.',
    source: 'EEA GHG inventory',
    sourceUrl: 'https://www.eea.europa.eu/en/datahub',
    direction: 'down',
    isSeed: true,
    data: [
      { year: 2018, value: 813 },
      { year: 2019, value: 793 },
      { year: 2020, value: 740 },
      { year: 2021, value: 775 },
      { year: 2022, value: 728 },
      { year: 2023, value: 670 },
    ],
  },
  {
    id: 'industry-electrification',
    name: 'Electricity share of industrial energy use',
    category: 'industry',
    unit: '%',
    description:
      'Share of final energy used by industry that is supplied as electricity. ' +
      'A key driver of process decarbonisation. ECNO block: Industry.',
    source: 'Eurostat (nrg_bal_c)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table',
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2018, value: 33.0 },
      { year: 2019, value: 33.5 },
      { year: 2020, value: 34.4 },
      { year: 2021, value: 33.4 },
      { year: 2022, value: 33.0 },
      { year: 2023, value: 34.1 },
    ],
  },
  {
    id: 'hydrogen-electrolyser-capacity',
    name: 'Installed electrolyser capacity',
    category: 'industry',
    unit: 'MW',
    description:
      'Cumulative installed water-electrolyser capacity in the EU-27, a proxy ' +
      'for renewable hydrogen ramp-up. REPowerEU 2030 target: 10 Mt RFNBO production. ' +
      'ECNO block: Industry / Clean Technologies.',
    source: 'IEA / Clean Hydrogen Joint Undertaking',
    sourceUrl: 'https://www.clean-hydrogen.europa.eu/knowledge-management/sria-key-performance-indicators-kpis_en',
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2020, value: 60 },
      { year: 2021, value: 100 },
      { year: 2022, value: 170 },
      { year: 2023, value: 260 },
      { year: 2024, value: 440 },
    ],
  },

  // ── Agriculture (ECNO: Agrifood) ─────────────────────────────────────────
  {
    id: 'agri-ghg',
    name: 'Agriculture GHG emissions',
    category: 'agriculture',
    unit: 'Mt CO₂eq',
    description: 'EU-27 agriculture-sector GHG emissions (CRF 3). ECNO block: Agrifood.',
    source: 'EEA GHG inventory',
    sourceUrl: 'https://www.eea.europa.eu/en/datahub',
    direction: 'down',
    isSeed: true,
    data: [
      { year: 2018, value: 387 },
      { year: 2019, value: 386 },
      { year: 2020, value: 383 },
      { year: 2021, value: 378 },
      { year: 2022, value: 372 },
      { year: 2023, value: 367 },
    ],
  },

  // ── LULUCF (ECNO: Carbon Dioxide Removal) ────────────────────────────────
  {
    id: 'lulucf-net-removal',
    name: 'LULUCF net removals',
    category: 'lulucf',
    unit: 'Mt CO₂eq',
    description:
      'Net carbon removals from Land Use, Land-Use Change & Forestry. ' +
      'LULUCF Regulation 2030 target: -310 Mt CO₂eq (i.e. removal of 310 Mt). ' +
      'ECNO block: Carbon Dioxide Removal.',
    source: 'EEA GHG inventory',
    sourceUrl: 'https://www.eea.europa.eu/en/datahub',
    targetValue: -310,
    targetYear: 2030,
    direction: 'down',
    isSeed: true,
    data: [
      { year: 2018, value: -266 },
      { year: 2019, value: -251 },
      { year: 2020, value: -234 },
      { year: 2021, value: -230 },
      { year: 2022, value: -216 },
      { year: 2023, value: -224 },
    ],
  },

  // ── Finance ──────────────────────────────────────────────────────────────
  {
    id: 'clean-tech-investment',
    name: 'Clean-energy investment',
    category: 'finance',
    unit: 'bn EUR',
    description:
      'Annual EU clean-energy investment (renewables, grids, efficiency, ' +
      'electrified transport). Sourced from IEA World Energy Investment.',
    source: 'IEA World Energy Investment',
    sourceUrl: 'https://www.iea.org/reports/world-energy-investment-2024',
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2019, value: 175 },
      { year: 2020, value: 195 },
      { year: 2021, value: 245 },
      { year: 2022, value: 305 },
      { year: 2023, value: 360 },
    ],
  },

  // ── Fairness (ECNO: Just & Fair Transition) ──────────────────────────────
  {
    id: 'energy-poverty-share',
    name: 'Population unable to keep home adequately warm',
    category: 'fairness',
    unit: '%',
    description:
      'Share of EU population reporting inability to keep their home ' +
      'adequately warm — proxy indicator for energy poverty.',
    source: 'Eurostat (ilc_mdes01)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/ilc_mdes01/default/table',
    direction: 'down',
    isSeed: true,
    data: [
      { year: 2018, value: 7.3 },
      { year: 2019, value: 6.9 },
      { year: 2020, value: 7.5 },
      { year: 2021, value: 6.9 },
      { year: 2022, value: 9.3 },
      { year: 2023, value: 10.6 },
    ],
  },
  {
    id: 'environmental-employment',
    name: 'Employment in environmental goods and services',
    category: 'fairness',
    unit: 'million FTE',
    description:
      'Full-time-equivalent employment in the EU environmental goods and ' +
      'services sector. A proxy for green-job creation. ECNO block: Just & Fair Transition.',
    source: 'Eurostat (env_ac_egss1)',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/env_ac_egss1/default/table',
    direction: 'up',
    isSeed: true,
    data: [
      { year: 2018, value: 1.78 },
      { year: 2019, value: 1.83 },
      { year: 2020, value: 1.86 },
      { year: 2021, value: 1.92 },
      { year: 2022, value: 1.98 },
      { year: 2023, value: 2.03 },
    ],
  },
];

/**
 * Indicators with a registered live-source connector (see
 * `src/lib/project-workspace/live-sources.ts`). The UI uses this list to
 * enable the "Refresh from source" button. Keep in sync with the registry
 * — entries missing from one place but present in the other are silently
 * unreachable.
 */
export const LIVE_REFRESHABLE_INDICATORS: ReadonlySet<string> = new Set([
  // Eurostat
  'res-share',
  'final-energy-consumption',
  'end-use-electrification',
  'energy-poverty-share',
  'renewable-heating-cooling',
  'fossil-power-share',
  'road-passenger-share',
  'rail-passenger-share',
  'rail-iww-freight-share',
  'rail-electrification',
  'zev-share-car-stock',
  'zev-share-van-stock',
  'zev-share-truck-stock',
  'floor-space-per-capita',
  'environmental-employment',
  'industry-electrification',
  // EEA GHG inventory CSV
  'ghg-total-net',
  'buildings-ghg',
  'power-sector-ghg',
  'industry-ghg',
  'agri-ghg',
  'lulucf-net-removal',
  // EAFO
  'zev-charging-points',
  'ev-share-new-cars',
  // IRENA
  'solar-pv-additions',
  'wind-additions',
  'battery-storage-capacity',
  // EHPA
  'heat-pump-stock',
  'heat-pump-sales',
]);

export const INDICATOR_CATEGORIES: { id: IndicatorCategory; label: string }[] = [
  { id: 'emissions',     label: 'Emissions' },
  { id: 'energy-supply', label: 'Energy supply' },
  { id: 'energy-demand', label: 'Energy demand' },
  { id: 'transport',     label: 'Transport' },
  { id: 'buildings',     label: 'Buildings' },
  { id: 'industry',      label: 'Industry' },
  { id: 'agriculture',   label: 'Agriculture' },
  { id: 'lulucf',        label: 'LULUCF' },
  { id: 'finance',       label: 'Finance' },
  { id: 'fairness',      label: 'Fairness & jobs' },
];

/**
 * ── ECNO building blocks not yet seeded ──────────────────────────────────
 *
 * The ECNO progress tracker covers 13 "building blocks". The seed list above
 * fills the ones for which we have a confidently sourced EU-27 series at
 * the time of writing (Mobility, Buildings, Industry, Electricity,
 * Agrifood top-line, CDR top-line, Finance top-line, Just Transition).
 *
 * Still TODO — the per-indicator detail behind each block lives in the
 * ECNO 2025 Flagship chapter PDFs (linked below). Open each, lift the
 * indicator titles, units, primary data publishers and benchmark sources,
 * and add them here against the closest existing local category. Do NOT
 * copy ECNO's prose; cite the primary publisher (Eurostat, EEA, etc.).
 *
 *   - Agrifood   — sub-indicators: livestock GHG, fertiliser N₂O, organic
 *                  area share, food-loss rate. Chapter:
 *                  https://climateobservatory.eu/sites/default/files/2025-08/ECNO-Flagship-Report-2025-Agrifood.pdf
 *   - CDR        — technical removals (DACCS, BECCS, BiCRS), forest sink
 *                  per-hectare, harvested-wood pool. Chapter:
 *                  https://climateobservatory.eu/sites/default/files/2025-08/ECNO-Flagship-Report-2025-CDR.pdf
 *   - Clean Tech — EU manufacturing capacity for batteries, PV, wind,
 *                  electrolysers, heat pumps; NZIA strategic-project pipeline.
 *                  https://climateobservatory.eu/sites/default/files/2025-08/ECNO-Flagship-Report-2025-Clean-Technology.pdf
 *   - Finance    — green-bond issuance, EU ETS price, public R&D budget,
 *                  fossil-fuel subsidies.
 *                  https://climateobservatory.eu/building-block/finance
 *   - Governance — NECP-implementation completeness, climate-law transposition,
 *                  carbon-pricing coverage.
 *                  https://climateobservatory.eu/building-block/governance
 *   - Lifestyles — per-capita meat consumption, flights per capita,
 *                  modal-shift behaviour.
 *                  https://climateobservatory.eu/building-block/lifestyles
 *   - Adaptation — adaptation-strategy adoption, climate-resilient infrastructure
 *                  spend, water-stress index.
 *                  https://climateobservatory.eu/building-block/adaptation
 *   - External   — embodied emissions in imports, climate-finance commitments,
 *                  CBAM coverage.
 *                  https://climateobservatory.eu/building-block/external-action
 *
 * Each new indicator should also be registered in `LIVE_REFRESHABLE_INDICATORS`
 * above and in `REGISTRY` in `live-sources.ts` when an automated source exists.
 */
