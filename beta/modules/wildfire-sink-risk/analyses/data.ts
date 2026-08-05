/**
 * Wildfires & the Land Sink — shared data layer for the `analyses/` sub-modules.
 *
 * GENERATED DATA, DO NOT HAND-EDIT THE NUMBERS. Two sources, both verifiable:
 *
 * 1. EFFIS per-country and EU-wide burnt-area statistics, fetched from the open
 *    Copernicus API (api2.effis.emergency.copernicus.eu) on 2026-08-05:
 *      - per country: `statistics/v2/effis/estimatesbycountry?country=<ISO3>`
 *        (the EFFIS rapid-damage-assessment ANNUAL estimates, 2006-2026)
 *      - EU-wide:     `statistics/v2/effis/weeklyaoi?aoi=EU&year=<Y>`, taking
 *        the week-52 cumulative value (2006-2025)
 *
 *    PRODUCT CAVEAT, stated here because it matters: these API products do not
 *    exactly match the final figures in the JRC annual fire reports that
 *    `../model.ts` uses for its 2021-25 EU series (e.g. 2025: 1,034,552 ha in
 *    the weekly product vs 1,079,538 ha in the JRC report; the 27 country
 *    series sum to within ~5% of the EU-wide product). Each analysis therefore
 *    stays INSIDE one product for any within-product comparison, and the main
 *    module's JRC-based numbers remain the headline series. 2026 values are
 *    the season to date at fetch time and are flagged as provisional.
 *
 * 2. Annex IIa of the LULUCF Regulation — Regulation (EU) 2018/841 as amended
 *    by Regulation (EU) 2023/839 (OJ L 107, 21.4.2023) — copied VERBATIM from
 *    the Official Journal table, in kt CO2 equivalent, negative = net removal:
 *      column B: average greenhouse gas inventory 2016-2018 (2020 submission)
 *      column C: Member State target contribution, 2030
 *      column D: value of net removals in 2030 (columns B+C)
 *    Where B+C differs from D by 1 kt, that rounding is in the OJ itself; the
 *    OJ values are kept untouched.
 */

/** [year, burnt area ha, number of fires]. */
export type FireYear = [number, number, number];

export type CountryFire = {
  iso3: string;
  name: string;
  /** Annex IIa, kt CO2e, negative = net removal (OJ sign convention). */
  annexIIa: { base1618Kt: number; contributionKt: number; target2030Kt: number };
  /**
   * EFFIS rapid-damage-assessment annual estimates, 2006-2026.
   * The 2026 row is the season to date at fetch time (2026-08-05) — provisional.
   */
  fires: FireYear[];
};

/** ISO date on which the EFFIS API snapshots below were taken. */
export const FETCHED_AT = '2026-08-05';

/** Last complete fire year in the snapshots. 2026 rows are season-to-date. */
export const LAST_COMPLETE_YEAR = 2025;

export const COUNTRIES: CountryFire[] = [
  { iso3: 'ESP', name: 'Spain', annexIIa: { base1618Kt: -38326, contributionKt: -5309, target2030Kt: -43635 },
    fires: [[2006, 118368, 219], [2007, 56539, 58], [2008, 10073, 33], [2009, 88845, 160], [2010, 19770, 74], [2011, 60060, 288], [2012, 189376, 255], [2013, 37069, 115], [2014, 22001, 60], [2015, 63560, 110], [2016, 52644, 124], [2017, 130925, 317], [2018, 12433, 91], [2019, 63853, 320], [2020, 61099, 250], [2021, 84827, 311], [2022, 306555, 493], [2023, 91220, 371], [2024, 42615, 219], [2025, 393079, 350], [2026, 222404, 388]] },
  { iso3: 'PRT', name: 'Portugal', annexIIa: { base1618Kt: -390, contributionKt: -968, target2030Kt: -1358 },
    fires: [[2006, 56424, 155], [2007, 15650, 68], [2008, 5350, 33], [2009, 74816, 322], [2010, 127560, 292], [2011, 64442, 303], [2012, 101053, 227], [2013, 153408, 326], [2014, 11550, 34], [2015, 47286, 169], [2016, 165853, 312], [2017, 563530, 408], [2018, 37144, 78], [2019, 33451, 172], [2020, 62557, 175], [2021, 25855, 187], [2022, 104379, 258], [2023, 36855, 168], [2024, 143684, 182], [2025, 278917, 200], [2026, 50670, 158]] },
  { iso3: 'ITA', name: 'Italy', annexIIa: { base1618Kt: -32599, contributionKt: -3158, target2030Kt: -35758 },
    fires: [[2006, 9216, 49], [2007, 153481, 451], [2008, 24310, 142], [2009, 54809, 109], [2010, 34280, 160], [2011, 36997, 233], [2012, 82856, 322], [2013, 15776, 66], [2014, 13176, 75], [2015, 7773, 63], [2016, 35246, 143], [2017, 140214, 781], [2018, 14002, 123], [2019, 36887, 336], [2020, 53750, 498], [2021, 150552, 659], [2022, 58751, 481], [2023, 97984, 534], [2024, 40122, 383], [2025, 84348, 612], [2026, 74290, 350]] },
  { iso3: 'GRC', name: 'Greece', annexIIa: { base1618Kt: -3219, contributionKt: -1154, target2030Kt: -4373 },
    fires: [[2006, 16294, 22], [2007, 271715, 139], [2008, 24988, 46], [2009, 42807, 46], [2010, 6472, 21], [2011, 35713, 80], [2012, 52487, 83], [2013, 19762, 32], [2014, 14815, 31], [2015, 11613, 27], [2016, 31707, 52], [2017, 20041, 57], [2018, 12037, 33], [2019, 10736, 53], [2020, 14915, 88], [2021, 130744, 85], [2022, 22480, 66], [2023, 174773, 56], [2024, 41948, 86], [2025, 47819, 69], [2026, 30624, 33]] },
  { iso3: 'ROU', name: 'Romania', annexIIa: { base1618Kt: -23285, contributionKt: -2380, target2030Kt: -25665 },
    fires: [[2006, 0, 0], [2007, 0, 0], [2008, 0, 0], [2009, 0, 0], [2010, 0, 0], [2011, 333, 1], [2012, 3023, 20], [2013, 3101, 7], [2014, 2403, 8], [2015, 7320, 15], [2016, 4368, 11], [2017, 30481, 65], [2018, 3287, 40], [2019, 72666, 211], [2020, 81668, 328], [2021, 20364, 83], [2022, 153207, 719], [2023, 16622, 60], [2024, 36057, 333], [2025, 129443, 491], [2026, 12705, 111]] },
  { iso3: 'FRA', name: 'France', annexIIa: { base1618Kt: -27353, contributionKt: -6693, target2030Kt: -34046 },
    fires: [[2006, 1751, 12], [2007, 2631, 12], [2008, 1694, 8], [2009, 7974, 16], [2010, 4653, 9], [2011, 4831, 23], [2012, 3298, 19], [2013, 891, 9], [2014, 4667, 26], [2015, 2046, 15], [2016, 10767, 27], [2017, 20626, 91], [2018, 2581, 21], [2019, 43602, 304], [2020, 14547, 133], [2021, 30652, 214], [2022, 66337, 290], [2023, 22350, 219], [2024, 12268, 156], [2025, 36951, 257], [2026, 92891, 337]] },
  { iso3: 'BGR', name: 'Bulgaria', annexIIa: { base1618Kt: -8554, contributionKt: -1163, target2030Kt: -9718 },
    fires: [[2006, 1596, 1], [2007, 67598, 67], [2008, 5730, 19], [2009, 1564, 6], [2010, 0, 0], [2011, 11969, 24], [2012, 16928, 31], [2013, 2966, 11], [2014, 0, 0], [2015, 3346, 9], [2016, 11483, 29], [2017, 5214, 17], [2018, 1973, 13], [2019, 15503, 81], [2020, 9179, 38], [2021, 3688, 35], [2022, 14579, 81], [2023, 15845, 73], [2024, 44745, 133], [2025, 32752, 92], [2026, 919, 17]] },
  { iso3: 'HRV', name: 'Croatia', annexIIa: { base1618Kt: -4933, contributionKt: -593, target2030Kt: -5527 },
    fires: [[2006, 2708, 5], [2007, 17189, 31], [2008, 3216, 8], [2009, 2208, 8], [2010, 330, 1], [2011, 15368, 25], [2012, 33056, 55], [2013, 1017, 6], [2014, 304, 2], [2015, 7870, 17], [2016, 9086, 29], [2017, 67666, 108], [2018, 1234, 5], [2019, 11872, 70], [2020, 27477, 79], [2021, 9342, 62], [2022, 32943, 149], [2023, 2768, 13], [2024, 15886, 24], [2025, 3380, 22], [2026, 3402, 35]] },
  { iso3: 'CYP', name: 'Cyprus', annexIIa: { base1618Kt: -289, contributionKt: -63, target2030Kt: -352 },
    fires: [[2006, 291, 1], [2007, 2526, 9], [2008, 1947, 3], [2009, 0, 0], [2010, 1104, 6], [2011, 939, 3], [2012, 2349, 8], [2013, 2834, 7], [2014, 436, 2], [2015, 197, 2], [2016, 2738, 2], [2017, 652, 4], [2018, 417, 6], [2019, 596, 5], [2020, 3421, 19], [2021, 6199, 11], [2022, 2540, 12], [2023, 1919, 9], [2024, 3374, 13], [2025, 13527, 7], [2026, 326, 2]] },
  { iso3: 'IRL', name: 'Ireland', annexIIa: { base1618Kt: 4354, contributionKt: -626, target2030Kt: 3728 },
    fires: [[2006, 0, 0], [2007, 0, 0], [2008, 0, 0], [2009, 0, 0], [2010, 0, 0], [2011, 16724, 16], [2012, 0, 0], [2013, 8211, 10], [2014, 141, 1], [2015, 6807, 27], [2016, 1177, 6], [2017, 7219, 17], [2018, 2840, 28], [2019, 2820, 20], [2020, 3103, 29], [2021, 3189, 18], [2022, 2982, 21], [2023, 4302, 30], [2024, 133, 3], [2025, 4355, 31], [2026, 2574, 15]] },
  { iso3: 'DEU', name: 'Germany', annexIIa: { base1618Kt: -27089, contributionKt: -3751, target2030Kt: -30840 },
    fires: [[2006, 0, 0], [2007, 0, 0], [2008, 0, 0], [2009, 0, 0], [2010, 0, 0], [2011, 0, 0], [2012, 0, 0], [2013, 133, 1], [2014, 0, 0], [2015, 105, 2], [2016, 314, 3], [2017, 57, 1], [2018, 3622, 33], [2019, 2006, 12], [2020, 314, 6], [2021, 121, 3], [2022, 4293, 32], [2023, 975, 7], [2024, 826, 9], [2025, 5475, 38], [2026, 2442, 26]] },
  { iso3: 'HUN', name: 'Hungary', annexIIa: { base1618Kt: -4791, contributionKt: -934, target2030Kt: -5724 },
    fires: [[2006, 0, 0], [2007, 799, 2], [2008, 0, 0], [2009, 0, 0], [2010, 0, 0], [2011, 0, 0], [2012, 960, 2], [2013, 138, 1], [2014, 0, 0], [2015, 1610, 2], [2016, 0, 0], [2017, 458, 3], [2018, 96, 2], [2019, 528, 7], [2020, 265, 4], [2021, 565, 5], [2022, 7287, 44], [2023, 156, 1], [2024, 1141, 4], [2025, 666, 6], [2026, 508, 9]] },
  { iso3: 'SVN', name: 'Slovenia', annexIIa: { base1618Kt: 67, contributionKt: -212, target2030Kt: -146 },
    fires: [[2006, 557, 1], [2007, 0, 0], [2008, 0, 0], [2009, 0, 0], [2010, 0, 0], [2011, 0, 0], [2012, 262, 1], [2013, 0, 0], [2014, 0, 0], [2015, 0, 0], [2016, 321, 3], [2017, 188, 2], [2018, 0, 0], [2019, 80, 1], [2020, 168, 2], [2021, 76, 1], [2022, 4388, 4], [2023, 112, 1], [2024, 76, 1], [2025, 143, 1], [2026, 354, 2]] },
  { iso3: 'FIN', name: 'Finland', annexIIa: { base1618Kt: -14865, contributionKt: -2889, target2030Kt: -17754 },
    fires: [[2006, 0, 0], [2007, 0, 0], [2008, 0, 0], [2009, 0, 0], [2010, 0, 0], [2011, 0, 0], [2012, 0, 0], [2013, 0, 0], [2014, 0, 0], [2015, 0, 0], [2016, 0, 0], [2017, 210, 3], [2018, 303, 7], [2019, 0, 0], [2020, 0, 0], [2021, 2558, 9], [2022, 160, 3], [2023, 205, 4], [2024, 124, 3], [2025, 407, 9], [2026, 66, 2]] },
  { iso3: 'SWE', name: 'Sweden', annexIIa: { base1618Kt: -43366, contributionKt: -3955, target2030Kt: -47321 },
    fires: [[2006, 0, 0], [2007, 0, 0], [2008, 1668, 5], [2009, 716, 5], [2010, 0, 0], [2011, 143, 1], [2012, 0, 0], [2013, 50, 1], [2014, 13633, 12], [2015, 147, 3], [2016, 99, 1], [2017, 732, 8], [2018, 21320, 63], [2019, 485, 8], [2020, 769, 6], [2021, 946, 8], [2022, 266, 5], [2023, 188, 4], [2024, 288, 5], [2025, 1079, 12], [2026, 185, 4]] },
  { iso3: 'BEL', name: 'Belgium', annexIIa: { base1618Kt: -1032, contributionKt: -320, target2030Kt: -1352 },
    fires: [[2006, 0, 0], [2007, 0, 0], [2008, 0, 0], [2009, 0, 0], [2010, 0, 0], [2011, 2180, 3], [2012, 0, 0], [2013, 0, 0], [2014, 0, 0], [2015, 80, 1], [2016, 54, 1], [2017, 0, 0], [2018, 166, 5], [2019, 287, 3], [2020, 0, 0], [2021, 659, 2], [2022, 382, 4], [2023, 240, 2], [2024, 0, 0], [2025, 668, 3], [2026, 299, 4]] },
  { iso3: 'AUT', name: 'Austria', annexIIa: { base1618Kt: -4771, contributionKt: -879, target2030Kt: -5650 },
    fires: [[2006, 0, 0], [2007, 0, 0], [2008, 0, 0], [2009, 0, 0], [2010, 0, 0], [2011, 0, 0], [2012, 0, 0], [2013, 0, 0], [2014, 0, 0], [2015, 0, 0], [2016, 0, 0], [2017, 0, 0], [2018, 0, 0], [2019, 38, 1], [2020, 168, 1], [2021, 72, 1], [2022, 1016, 5], [2023, 398, 5], [2024, 0, 0], [2025, 431, 2], [2026, 273, 3]] },
  { iso3: 'CZE', name: 'Czechia', annexIIa: { base1618Kt: -401, contributionKt: -827, target2030Kt: -1228 },
    fires: [[2006, 0, 0], [2007, 0, 0], [2008, 0, 0], [2009, 0, 0], [2010, 0, 0], [2011, 0, 0], [2012, 0, 0], [2013, 0, 0], [2014, 0, 0], [2015, 0, 0], [2016, 0, 0], [2017, 145, 1], [2018, 0, 0], [2019, 0, 0], [2020, 0, 0], [2021, 0, 0], [2022, 1436, 1], [2023, 0, 0], [2024, 0, 0], [2025, 0, 0], [2026, 41, 1]] },
  { iso3: 'DNK', name: 'Denmark', annexIIa: { base1618Kt: 5779, contributionKt: -441, target2030Kt: 5338 },
    fires: [[2006, 0, 0], [2007, 0, 0], [2008, 0, 0], [2009, 0, 0], [2010, 0, 0], [2011, 0, 0], [2012, 0, 0], [2013, 0, 0], [2014, 0, 0], [2015, 0, 0], [2016, 0, 0], [2017, 131, 2], [2018, 463, 4], [2019, 80, 1], [2020, 0, 0], [2021, 230, 4], [2022, 341, 6], [2023, 134, 2], [2024, 0, 0], [2025, 255, 6], [2026, 70, 2]] },
  { iso3: 'POL', name: 'Poland', annexIIa: { base1618Kt: -34820, contributionKt: -3278, target2030Kt: -38098 },
    fires: [[2006, 0, 0], [2007, 0, 0], [2008, 0, 0], [2009, 0, 0], [2010, 0, 0], [2011, 0, 0], [2012, 0, 0], [2013, 0, 0], [2014, 54, 1], [2015, 560, 2], [2016, 0, 0], [2017, 0, 0], [2018, 345, 3], [2019, 60, 1], [2020, 5383, 3], [2021, 40, 1], [2022, 465, 6], [2023, 47, 1], [2024, 30, 1], [2025, 295, 4], [2026, 1458, 3]] },
  { iso3: 'SVK', name: 'Slovakia', annexIIa: { base1618Kt: -6317, contributionKt: -504, target2030Kt: -6821 },
    fires: [[2006, 0, 0], [2007, 0, 0], [2008, 0, 0], [2009, 0, 0], [2010, 0, 0], [2011, 0, 0], [2012, 0, 0], [2013, 0, 0], [2014, 0, 0], [2015, 0, 0], [2016, 0, 0], [2017, 0, 0], [2018, 0, 0], [2019, 0, 0], [2020, 85, 1], [2021, 115, 1], [2022, 317, 4], [2023, 0, 0], [2024, 0, 0], [2025, 362, 1], [2026, 1112, 5]] },
  { iso3: 'LVA', name: 'Latvia', annexIIa: { base1618Kt: -6, contributionKt: -639, target2030Kt: -644 },
    fires: [[2006, 0, 0], [2007, 0, 0], [2008, 65, 1], [2009, 0, 0], [2010, 0, 0], [2011, 0, 0], [2012, 0, 0], [2013, 0, 0], [2014, 0, 0], [2015, 0, 0], [2016, 0, 0], [2017, 35, 1], [2018, 2493, 6], [2019, 49, 1], [2020, 0, 0], [2021, 251, 2], [2022, 171, 2], [2023, 127, 2], [2024, 0, 0], [2025, 30, 1], [2026, 318, 2]] },
  { iso3: 'NLD', name: 'Netherlands', annexIIa: { base1618Kt: 4958, contributionKt: -435, target2030Kt: 4523 },
    fires: [[2006, 0, 0], [2007, 0, 0], [2008, 0, 0], [2009, 0, 0], [2010, 0, 0], [2011, 148, 1], [2012, 0, 0], [2013, 0, 0], [2014, 396, 1], [2015, 0, 0], [2016, 0, 0], [2017, 0, 0], [2018, 183, 3], [2019, 0, 0], [2020, 822, 2], [2021, 0, 0], [2022, 274, 6], [2023, 31, 1], [2024, 0, 0], [2025, 170, 4], [2026, 547, 2]] },
  { iso3: 'LTU', name: 'Lithuania', annexIIa: { base1618Kt: -3972, contributionKt: -661, target2030Kt: -4633 },
    fires: [[2006, 0, 0], [2007, 0, 0], [2008, 0, 0], [2009, 0, 0], [2010, 0, 0], [2011, 0, 0], [2012, 0, 0], [2013, 0, 0], [2014, 0, 0], [2015, 0, 0], [2016, 0, 0], [2017, 0, 0], [2018, 0, 0], [2019, 236, 4], [2020, 43, 1], [2021, 0, 0], [2022, 0, 0], [2023, 305, 3], [2024, 0, 0], [2025, 0, 0], [2026, 46, 1]] },
  { iso3: 'EST', name: 'Estonia', annexIIa: { base1618Kt: -2112, contributionKt: -434, target2030Kt: -2545 },
    fires: [[2006, 0, 0], [2007, 0, 0], [2008, 0, 0], [2009, 0, 0], [2010, 0, 0], [2011, 0, 0], [2012, 0, 0], [2013, 0, 0], [2014, 0, 0], [2015, 0, 0], [2016, 0, 0], [2017, 0, 0], [2018, 385, 7], [2019, 0, 0], [2020, 0, 0], [2021, 0, 0], [2022, 0, 0], [2023, 173, 3], [2024, 0, 0], [2025, 0, 0], [2026, 299, 2]] },
  { iso3: 'LUX', name: 'Luxembourg', annexIIa: { base1618Kt: -376, contributionKt: -27, target2030Kt: -403 },
    fires: [[2006, 0, 0], [2007, 0, 0], [2008, 0, 0], [2009, 0, 0], [2010, 0, 0], [2011, 0, 0], [2012, 0, 0], [2013, 0, 0], [2014, 0, 0], [2015, 0, 0], [2016, 0, 0], [2017, 0, 0], [2018, 0, 0], [2019, 0, 0], [2020, 0, 0], [2021, 0, 0], [2022, 0, 0], [2023, 0, 0], [2024, 0, 0], [2025, 0, 0], [2026, 0, 0]] },
  { iso3: 'MLT', name: 'Malta', annexIIa: { base1618Kt: 4, contributionKt: -2, target2030Kt: 2 },
    fires: [[2006, 0, 0], [2007, 0, 0], [2008, 0, 0], [2009, 0, 0], [2010, 0, 0], [2011, 0, 0], [2012, 0, 0], [2013, 0, 0], [2014, 0, 0], [2015, 0, 0], [2016, 0, 0], [2017, 0, 0], [2018, 32, 1], [2019, 0, 0], [2020, 34, 1], [2021, 0, 0], [2022, 0, 0], [2023, 0, 0], [2024, 0, 0], [2025, 0, 0], [2026, 0, 0]] },
];

/** Annex IIa Union row, kt CO2e — the -310,000 kt (=310 Mt) 2030 target. */
export const ANNEX_IIA_EU = { base1618Kt: -267_704, contributionKt: -42_296, target2030Kt: -310_000 };

/**
 * EU-wide EFFIS burnt area and fire count per year, 2006-2025, from the
 * weekly statistics product (week-52 cumulative). Internally consistent
 * series for the hindcast; see the product caveat in the header.
 */
export const EU_ANNUAL: FireYear[] = [[2006, 207205, 465], [2007, 588128, 837], [2008, 79041, 298], [2009, 273739, 672], [2010, 194169, 563], [2011, 249847, 1001], [2012, 485648, 1023], [2013, 245356, 592], [2014, 83576, 253], [2015, 160320, 464], [2016, 325143, 737], [2017, 988524, 1886], [2018, 116824, 569], [2019, 295794, 1610], [2020, 339767, 1664], [2021, 468310, 1675], [2022, 785497, 2691], [2023, 467729, 1569], [2024, 383317, 1555], [2025, 1034552, 2218]];

/* ── derived helpers ────────────────────────────────────────────────────── */

/** Burnt area for one year of a series, or null when absent. */
export function baIn(fires: FireYear[], year: number): number | null {
  const r = fires.find((f) => f[0] === year);
  return r ? r[1] : null;
}

/** Mean burnt area over complete years [from, to], ha/yr. */
export function meanBa(fires: FireYear[], from: number, to: number): number {
  const rows = fires.filter((f) => f[0] >= from && f[0] <= to);
  return rows.length ? rows.reduce((s, f) => s + f[1], 0) / rows.length : 0;
}

/** 2021-25 mean burnt area, ha/yr — the anchor the projections start from. */
export const recentMean = (c: CountryFire) => meanBa(c.fires, 2021, 2025);

/** 2006-2024 mean burnt area, ha/yr — the load "already in the projections". */
export const longRunMean = (c: CountryFire) => meanBa(c.fires, 2006, 2024);

/** Annex IIa 2030 target as a POSITIVE sink in MtCO2e (sources come out negative). */
export const targetSinkMt = (c: CountryFire) => -c.annexIIa.target2030Kt / 1000;

/** Annex IIa 2016-18 baseline as a POSITIVE sink in MtCO2e. */
export const baseSinkMt = (c: CountryFire) => -c.annexIIa.base1618Kt / 1000;

/** Required sink IMPROVEMENT 2016-18 → 2030, MtCO2e (always positive). */
export const improvementMt = (c: CountryFire) => -c.annexIIa.contributionKt / 1000;
