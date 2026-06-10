/**
 * Buildings indicators from the BPIE EU Buildings Climate Tracker (3rd edition).
 * -----------------------------------------------------------------------------
 * Sourced from the Buildings Performance Institute Europe (BPIE) report
 * "Transforming buildings, empowering Europe: A pathway to prosperity, equity
 * and resilience" — EU Buildings Climate Tracker, 3rd edition (November 2024).
 *
 * The EU Buildings Climate Tracker (BCT) scores the EU building stock's
 * decarbonisation on a 0–100 index — 0 in the 2015 base year and 100 on the
 * path to climate neutrality in 2050 — built from four key indicators:
 *   1. CO₂ emissions reduction,
 *   2. final energy consumption,
 *   3. renewable energy share, and
 *   4. renovation investment.
 * The 3rd edition finds all four sit over 40% away from the required pathway,
 * and the 2022 decarbonisation gap (distance between actual progress and the
 * neutrality path) has more than doubled since 2016.
 *
 * Like the ECNO seed set (see `ecno-indicators.ts`), indicator names and
 * descriptions are paraphrased and the numeric values come from the primary
 * publisher named in each entry's `source` field. The BCT reports cumulative
 * change against a 2015 baseline rather than full annual series, so several
 * entries carry a 2015 anchor (= 0 change) and the 2022 headline value; these
 * are a starting point for the Secretariat to refine, not an authoritative
 * dataset. Where a value is derived from a stated relationship (e.g. the gap
 * "more than doubled since 2016") it is flagged in the description.
 *
 * Primary source:
 *   • BPIE — EU Buildings Climate Tracker, 3rd edition (Nov 2024)
 *     https://www.bpie.eu/publication/eu-buildings-climate-tracker-3rd-edition/
 */
import type { Indicator } from './ecno-indicators';

const BPIE_SOURCE = 'BPIE — EU Buildings Climate Tracker, 3rd edition (Nov 2024)';
const BPIE_URL = 'https://www.bpie.eu/publication/eu-buildings-climate-tracker-3rd-edition/';

/**
 * BPIE buildings indicators seeded into the Indicator Database (policy-gap-2-0).
 * All carry `group: 'additional'` and `category: 'buildings'`, so they list with
 * the other "New indicators" under the Buildings category in the workspace UI.
 */
export const BPIE_BUILDINGS_INDICATORS: Indicator[] = [
  {
    id: 'bpie-bct-gap',
    name: 'EU Buildings Climate Tracker — decarbonisation gap',
    category: 'buildings',
    unit: 'BCT points (0–100 index)',
    description:
      'Distance between actual progress and the climate-neutral pathway on the '
      + 'BCT composite index (0 in the 2015 base year, 100 on the path to climate '
      + 'neutrality in 2050). In 2022 the gap exceeded 13 points — more than double '
      + 'its 2016 level (~6 points, derived from the report\'s "more than doubled '
      + 'since 2016"). The four key indicators sit over 40% away from the required '
      + 'pathway.',
    source: BPIE_SOURCE,
    sourceUrl: BPIE_URL,
    direction: 'down',
    targetValue: 0,
    targetYear: 2050,
    isSeed: true,
    group: 'additional',
    data: [
      { year: 2016, value: 6 },
      { year: 2022, value: 13 },
    ],
  },
  {
    id: 'bpie-buildings-fec-reduction',
    name: 'Reduction in buildings final energy consumption (since 2015)',
    category: 'buildings',
    unit: '% reduction vs 2015',
    description:
      'Cumulative fall in final energy consumption in EU buildings since the 2015 '
      + 'base year. By 2022 consumption had dropped only 2.8% against the 6.5% '
      + 'reduction the BCT pathway required — less than half the needed pace.',
    source: BPIE_SOURCE,
    sourceUrl: BPIE_URL,
    direction: 'up',
    targetValue: 6.5,
    targetYear: 2022,
    isSeed: true,
    group: 'additional',
    data: [
      { year: 2015, value: 0 },
      { year: 2022, value: 2.8 },
    ],
  },
  {
    id: 'bpie-buildings-res-increase',
    name: 'Increase in renewable energy share in buildings (since 2015)',
    category: 'buildings',
    unit: '% increase vs 2015',
    description:
      'Cumulative increase in the renewable energy share in EU buildings since '
      + '2015. By 2022 it had risen only 6.3% against the 18% increase the BCT '
      + 'pathway required — held back by slow uptake of renewable heating and '
      + 'cooling, which the report says needs to roughly quadruple.',
    source: BPIE_SOURCE,
    sourceUrl: BPIE_URL,
    direction: 'up',
    targetValue: 18,
    targetYear: 2022,
    isSeed: true,
    group: 'additional',
    data: [
      { year: 2015, value: 0 },
      { year: 2022, value: 6.3 },
    ],
  },
  {
    id: 'bpie-buildings-renovation-investment',
    name: 'Building renovation investment delivered vs pathway (2015–2022)',
    category: 'buildings',
    unit: '% of required 2015–2022 investment',
    description:
      'Cumulative investment in building renovation as a share of the level the '
      + 'BCT pathway required over 2015–2022. Investment reached only 60.6% of the '
      + 'target; the shortfall makes future renovation harder and more expensive.',
    source: BPIE_SOURCE,
    sourceUrl: BPIE_URL,
    direction: 'up',
    targetValue: 100,
    targetYear: 2022,
    isSeed: true,
    group: 'additional',
    data: [
      { year: 2022, value: 60.6 },
    ],
  },
  {
    id: 'bpie-buildings-co2-excess',
    name: 'Cumulative excess CO₂ emissions from buildings vs pathway',
    category: 'buildings',
    unit: 'Mt CO₂ (cumulative since 2015)',
    description:
      'Extra CO₂ emitted by EU buildings over 2015–2022 relative to the BCT '
      + 'decarbonisation pathway, because emissions fell too slowly. The shortfall '
      + 'added 367 Mt CO₂ — close to a full year of emissions from the entire EU '
      + 'building stock.',
    source: BPIE_SOURCE,
    sourceUrl: BPIE_URL,
    direction: 'down',
    targetValue: 0,
    targetYear: 2022,
    isSeed: true,
    group: 'additional',
    data: [
      { year: 2022, value: 367 },
    ],
  },
];
