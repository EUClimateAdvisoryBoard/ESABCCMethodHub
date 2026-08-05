/**
 * Wildfires & the Land Sink — live 2026 season data layer.
 *
 * Everything on the live parts of the page flows through this file. It owns:
 *
 *   1. The types for the live-season payload served by `/api/effis`, which
 *      proxies the Copernicus EFFIS statistics API
 *      (api2.effis.emergency.copernicus.eu) with server-side caching.
 *   2. A client fetch helper with a hard fallback: if the API route or the
 *      upstream service is down, the page falls back to an embedded snapshot
 *      of the same payload (taken on FALLBACK_SEASON.fetchedAt) and says so.
 *   3. The season projection: given burnt area to date and the 2006-25
 *      cumulative seasonal envelope, what does full-year 2026 plausibly land
 *      at? Four estimates, from "the rest of the season is historically quiet"
 *      to "2026 keeps tracking at its current multiple of the seasonal norm".
 *   4. The carbon consequence of that projection, using the SAME per-hectare
 *      assumptions as the interactive model (`model.ts` Params), so the live
 *      section and the sliders can never drift apart.
 *
 * Sources: EFFIS weekly statistics (burnt area, number of fires) and CAMS
 * wildfire emissions, both Copernicus. EFFIS maps fires above roughly 30 ha,
 * so in-year totals are revised as new fires are mapped; `estimatedTotalHa`
 * is EFFIS's own rapid-damage-assessment estimate including fires not yet
 * fully mapped.
 */

import type { Params } from './model';

/* ═══════════════════════════════════════════════════════════ 1. PAYLOAD */

/** One week of the cumulative season track, with the 2006-25 envelope. */
export type LiveWeekRow = {
  week: number;
  /** ISO date of the week's reference day, e.g. '2026-07-29'. */
  date: string;
  /** Cumulative fires in the live year; null for weeks with no data yet. */
  events: number | null;
  /** Cumulative burnt area in the live year, ha; null when not yet observed. */
  areaHa: number | null;
  /** Cumulative 2006-25 envelope at the same week, ha. */
  areaMinHa: number;
  areaAvgHa: number;
  areaMaxHa: number;
  /** Cumulative 2006-25 average number of fires at the same week. */
  eventsAvg: number;
};

/** The whole live-season payload as served by `GET /api/effis?q=season`. */
export type LiveSeasonPayload = {
  year: number;
  /** ISO timestamp at which the upstream data was fetched. */
  fetchedAt: string;
  /** Date of the most recent week with observed data, ISO. */
  lastDataDate: string | null;
  lastWeek: number | null;
  /** 52 rows, weeks 1-52 — the seasonal trend chart's data. */
  cumulative: LiveWeekRow[];

  /* headline numbers, all cumulative to `lastWeek` */
  baToDateHa: number | null;
  baAvgToDateHa: number | null;
  baMaxToDateHa: number | null;
  firesToDate: number | null;
  firesAvgToDate: number | null;
  /** EFFIS rapid-damage-assessment estimate incl. fires not yet mapped, ha. */
  estimatedTotalHa: number | null;

  /* CAMS wildfire CO2, cumulative, MtCO2 */
  co2ToDateMt: number | null;
  co2AvgToDateMt: number | null;
  co2MaxToDateMt: number | null;
  co2AvgAnnualMt: number | null;

  /* full-year (week-52) historical envelope, ha */
  baMinAnnualHa: number | null;
  baAvgAnnualHa: number | null;
  baMaxAnnualHa: number | null;
};

export type LiveSeasonResult = {
  season: LiveSeasonPayload;
  /** False when the embedded fallback snapshot is being shown. */
  live: boolean;
};

/* ═══════════════════════════════════════════════ 2. FETCH WITH FALLBACK */

/**
 * Fetch the live season from our API route. Never throws: on any failure it
 * resolves to the embedded snapshot with `live: false`, so the page always
 * renders and always says which of the two it is showing.
 */
export async function fetchLiveSeason(): Promise<LiveSeasonResult> {
  try {
    const res = await fetch('/api/effis?q=season', { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { ok: boolean; season?: LiveSeasonPayload };
    if (!body.ok || !body.season || !Array.isArray(body.season.cumulative)) {
      throw new Error('bad payload');
    }
    return { season: body.season, live: true };
  } catch {
    return { season: FALLBACK_SEASON, live: false };
  }
}

/* ═══════════════════════════════════════════════════ 3. SEASON PROJECTION */

export type SeasonProjection = {
  /** Week the projection is anchored on (last week with data). */
  asOfWeek: number;
  asOfDate: string;
  /** Burnt area observed so far, ha. */
  toDateHa: number;
  /** 2026 to date as a multiple of the 2006-25 average at the same week. */
  ratioToAvg: number;
  /**
   * Full-year estimates, ha:
   *  - low:          rest of season matches the QUIETEST remainder on record
   *  - central:      rest of season adds the AVERAGE remainder
   *  - high:         rest of season adds the WORST remainder on record
   *  - proportional: the season keeps running at `ratioToAvg` times the norm
   */
  lowHa: number;
  centralHa: number;
  highHa: number;
  proportionalHa: number;
};

/**
 * Project full-year burnt area from the season so far.
 *
 * The remainder estimates use the historical cumulative envelope directly:
 * (envelope at week 52) minus (envelope at the current week) is what the
 * remaining weeks added in the quietest / average / worst year on record.
 * That makes `low`-`high` a spread of *historical remainders* stacked on this
 * year's head start — not a statistical interval. `proportional` is the
 * harsher reading: 2026 has run at `ratioToAvg` times the seasonal norm so
 * far, and simply keeps doing so.
 *
 * Returns null when the payload has no observed data at all.
 */
export function projectSeason(s: LiveSeasonPayload): SeasonProjection | null {
  if (
    s.lastWeek === null || s.baToDateHa === null || s.baAvgToDateHa === null ||
    !s.baAvgToDateHa || s.baAvgAnnualHa === null || s.baMaxAnnualHa === null ||
    s.baMinAnnualHa === null || s.baMaxToDateHa === null
  ) {
    return null;
  }
  const row = s.cumulative.find((r) => r.week === s.lastWeek);
  if (!row) return null;

  const toDate = s.baToDateHa;
  const ratio = toDate / s.baAvgToDateHa;
  const avgRemainder = Math.max(0, s.baAvgAnnualHa - s.baAvgToDateHa);
  const minRemainder = Math.max(0, s.baMinAnnualHa - (row.areaMinHa ?? 0));
  const maxRemainder = Math.max(0, s.baMaxAnnualHa - s.baMaxToDateHa);

  return {
    asOfWeek: s.lastWeek,
    asOfDate: s.lastDataDate ?? row.date,
    toDateHa: toDate,
    ratioToAvg: ratio,
    lowHa: toDate + minRemainder,
    centralHa: toDate + avgRemainder,
    highHa: toDate + maxRemainder,
    proportionalHa: (toDate * s.baAvgAnnualHa) / s.baAvgToDateHa,
  };
}

/* ═══════════════════════════════════ 4. CARBON CONSEQUENCE OF THE SEASON */

export type SeasonImpact = {
  /** Hectares above the fire load already embedded in projections. */
  excessHa: number;
  /** Direct combustion emissions from the excess, MtCO2e (released in-year). */
  combustionMt: number;
  /** Decomposition of fire-killed biomass, MtCO2e, spread over decompYears. */
  decompCommittedMt: number;
  /**
   * All removals the burnt forest will fail to deliver while it recovers,
   * MtCO2e, integrated over the whole linear recovery ramp — i.e. the
   * committed foregone-removals bill of this one season.
   */
  foregoneCommittedMt: number;
  /** Total eventual cost of this one season's excess fire, MtCO2e. */
  totalCommittedMt: number;
  /** The part of that felt in the season year itself, MtCO2e. */
  inYearMt: number;
};

/**
 * What one season's burnt area does to the sink, using the same per-hectare
 * assumptions as the interactive model. Only area ABOVE `p.embeddedHa` counts,
 * for the same double-counting reason as everywhere else in the module.
 *
 * The foregone-removals integral: a cohort's deficit share runs 1, 1-1/R, …
 * down to 0 over recoveryYears R, which sums to (R+1)/2 full-deficit years.
 */
export function seasonSinkImpact(totalHa: number, p: Params): SeasonImpact {
  const excessHa = Math.max(0, totalHa - p.embeddedHa);
  const combustionMt = (excessHa * p.fuelLoad) / 1e6;
  const decompCommittedMt = combustionMt * p.decompShare;
  const foregoneCommittedMt =
    (excessHa * p.forestShare * p.seqRate * (Math.max(1, p.recoveryYears) + 1)) / 2 / 1e6;
  const inYearMt =
    combustionMt +
    decompCommittedMt / Math.max(1, p.decompYears) +
    (excessHa * p.forestShare * p.seqRate) / 1e6;
  return {
    excessHa,
    combustionMt,
    decompCommittedMt,
    foregoneCommittedMt,
    totalCommittedMt: combustionMt + decompCommittedMt + foregoneCommittedMt,
    inYearMt,
  };
}

/* ══════════════════════════════════════════════ 5. EMBEDDED FALLBACK DATA */

/**
 * Snapshot of the real `/api/effis?q=season` payload, taken 2026-08-05 from
 * the live EFFIS statistics API. Shown — clearly labelled — whenever the live
 * fetch fails, so the page never renders an empty live section.
 *
 * Refreshed 2026-08-05 from the previous 2026-07-30 snapshot. The season is
 * still anchored on week 30 (data date 2026-07-29) — week 31 closes on the
 * refresh date itself and EFFIS had not yet published it — but EFFIS has since
 * remapped five of the already-published weeks, which is exactly the in-season
 * revision behaviour the module warns about:
 *
 *   week 26  126,829 →   126,831 ha
 *   week 27  165,311 →   165,317 ha
 *   week 28  199,039 →   197,680 ha   (revised down)
 *   week 29  386,840 →   383,607 ha   (revised down)
 *   week 30  434,976 →   463,669 ha   (+28,693; fires 1,407 → 1,443)
 *
 * The rapid-damage-assessment estimate moved with it (521,353 → 568,355 ha),
 * as did cumulative CAMS wildfire CO2 (17.98 → 18.37 MtCO2). The 2006-25
 * envelope and the unobserved weeks 31-52 are unchanged.
 */
export const FALLBACK_SEASON: LiveSeasonPayload = {
  year: 2026,
  fetchedAt: '2026-08-05T14:21:00Z',
  lastDataDate: '2026-07-29',
  lastWeek: 30,
  baToDateHa: 463_669,
  baAvgToDateHa: 172_186,
  baMaxToDateHa: 594_113,
  firesToDate: 1_443,
  firesAvgToDate: 632,
  estimatedTotalHa: 568_355,
  co2ToDateMt: 18.37,
  co2AvgToDateMt: 10.26,
  co2MaxToDateMt: 21.52,
  co2AvgAnnualMt: 23.91,
  baMinAnnualHa: 79_041,
  baAvgAnnualHa: 388_624,
  baMaxAnnualHa: 1_034_552,
  cumulative: [
  { week: 1, date: '2026-01-07', events: 3, areaHa: 259, areaMinHa: 0, areaAvgHa: 1236, areaMaxHa: 10970, eventsAvg: 9.2 },
  { week: 2, date: '2026-01-14', events: 4, areaHa: 295, areaMinHa: 0, areaAvgHa: 1592, areaMaxHa: 11356, eventsAvg: 12.5 },
  { week: 3, date: '2026-01-21', events: 6, areaHa: 406, areaMinHa: 0, areaAvgHa: 3064, areaMaxHa: 24928, eventsAvg: 18.6 },
  { week: 4, date: '2026-01-28', events: 7, areaHa: 446, areaMinHa: 0, areaAvgHa: 5466, areaMaxHa: 34808, eventsAvg: 27.6 },
  { week: 5, date: '2026-02-04', events: 9, areaHa: 518, areaMinHa: 0, areaAvgHa: 6822, areaMaxHa: 41724, eventsAvg: 40.9 },
  { week: 6, date: '2026-02-11', events: 10, areaHa: 1012, areaMinHa: 0, areaAvgHa: 8630, areaMaxHa: 49617, eventsAvg: 56.8 },
  { week: 7, date: '2026-02-18', events: 12, areaHa: 1092, areaMinHa: 0, areaAvgHa: 14391, areaMaxHa: 54122, eventsAvg: 85.2 },
  { week: 8, date: '2026-02-25', events: 185, areaHa: 27500, areaMinHa: 0, areaAvgHa: 19777, areaMaxHa: 78603, eventsAvg: 120.9 },
  { week: 9, date: '2026-03-04', events: 309, areaHa: 38087, areaMinHa: 0, areaAvgHa: 24458, areaMaxHa: 112104, eventsAvg: 154.1 },
  { week: 10, date: '2026-03-11', events: 381, areaHa: 46932, areaMinHa: 0, areaAvgHa: 30502, areaMaxHa: 132871, eventsAvg: 188.4 },
  { week: 11, date: '2026-03-18', events: 457, areaHa: 53031, areaMinHa: 0, areaAvgHa: 35168, areaMaxHa: 143096, eventsAvg: 213.6 },
  { week: 12, date: '2026-03-25', events: 563, areaHa: 60288, areaMinHa: 0, areaAvgHa: 42874, areaMaxHa: 179987, eventsAvg: 257.9 },
  { week: 13, date: '2026-04-01', events: 612, areaHa: 66778, areaMinHa: 0, areaAvgHa: 51485, areaMaxHa: 225545, eventsAvg: 310.4 },
  { week: 14, date: '2026-04-08', events: 716, areaHa: 78898, areaMinHa: 45, areaAvgHa: 55434, areaMaxHa: 230194, eventsAvg: 332.4 },
  { week: 15, date: '2026-04-15', events: 740, areaHa: 80441, areaMinHa: 45, areaAvgHa: 57623, areaMaxHa: 237021, eventsAvg: 344.8 },
  { week: 16, date: '2026-04-22', events: 755, areaHa: 81242, areaMinHa: 45, areaAvgHa: 59495, areaMaxHa: 237703, eventsAvg: 354.6 },
  { week: 17, date: '2026-04-29', events: 782, areaHa: 84022, areaMinHa: 416, areaAvgHa: 60235, areaMaxHa: 238571, eventsAvg: 359.9 },
  { week: 18, date: '2026-05-06', events: 801, areaHa: 87018, areaMinHa: 416, areaAvgHa: 61627, areaMaxHa: 239289, eventsAvg: 364.6 },
  { week: 19, date: '2026-05-13', events: 801, areaHa: 87018, areaMinHa: 539, areaAvgHa: 62193, areaMaxHa: 239984, eventsAvg: 368.1 },
  { week: 20, date: '2026-05-20', events: 804, areaHa: 87147, areaMinHa: 607, areaAvgHa: 63967, areaMaxHa: 240192, eventsAvg: 372.2 },
  { week: 21, date: '2026-05-27', events: 823, areaHa: 89797, areaMinHa: 662, areaAvgHa: 64548, areaMaxHa: 241716, eventsAvg: 376.9 },
  { week: 22, date: '2026-06-03', events: 858, areaHa: 94742, areaMinHa: 662, areaAvgHa: 65425, areaMaxHa: 242231, eventsAvg: 383.1 },
  { week: 23, date: '2026-06-10', events: 881, areaHa: 103021, areaMinHa: 745, areaAvgHa: 66903, areaMaxHa: 248584, eventsAvg: 390.1 },
  { week: 24, date: '2026-06-17', events: 911, areaHa: 107296, areaMinHa: 1053, areaAvgHa: 72677, areaMaxHa: 288230, eventsAvg: 401.8 },
  { week: 25, date: '2026-06-24', events: 950, areaHa: 111754, areaMinHa: 4290, areaAvgHa: 78466, areaMaxHa: 315852, eventsAvg: 419.4 },
  { week: 26, date: '2026-07-01', events: 994, areaHa: 126831, areaMinHa: 7542, areaAvgHa: 88440, areaMaxHa: 323958, eventsAvg: 446.0 },
  { week: 27, date: '2026-07-08', events: 1102, areaHa: 165317, areaMinHa: 9545, areaAvgHa: 98442, areaMaxHa: 363930, eventsAvg: 476.0 },
  { week: 28, date: '2026-07-15', events: 1175, areaHa: 197680, areaMinHa: 10440, areaAvgHa: 112078, areaMaxHa: 457448, eventsAvg: 516.1 },
  { week: 29, date: '2026-07-22', events: 1348, areaHa: 383607, areaMinHa: 18896, areaAvgHa: 138242, areaMaxHa: 560877, eventsAvg: 569.0 },
  { week: 30, date: '2026-07-29', events: 1443, areaHa: 463669, areaMinHa: 33455, areaAvgHa: 172186, areaMaxHa: 594113, eventsAvg: 631.5 },
  { week: 31, date: '2026-08-05', events: null, areaHa: null, areaMinHa: 36745, areaAvgHa: 197347, areaMaxHa: 611945, eventsAvg: 685.8 },
  { week: 32, date: '2026-08-12', events: null, areaHa: null, areaMinHa: 47275, areaAvgHa: 243189, areaMaxHa: 713870, eventsAvg: 766.0 },
  { week: 33, date: '2026-08-19', events: null, areaHa: null, areaMinHa: 58322, areaAvgHa: 280045, areaMaxHa: 964680, eventsAvg: 822.7 },
  { week: 34, date: '2026-08-26', events: null, areaHa: null, areaMinHa: 62829, areaAvgHa: 313246, areaMaxHa: 983367, eventsAvg: 881.1 },
  { week: 35, date: '2026-09-02', events: null, areaHa: null, areaMinHa: 67938, areaAvgHa: 328010, areaMaxHa: 994419, eventsAvg: 929.5 },
  { week: 36, date: '2026-09-09', events: null, areaHa: null, areaMinHa: 72439, areaAvgHa: 338163, areaMaxHa: 1003182, eventsAvg: 966.8 },
  { week: 37, date: '2026-09-16', events: null, areaHa: null, areaMinHa: 76544, areaAvgHa: 346567, areaMaxHa: 1009828, eventsAvg: 996.0 },
  { week: 38, date: '2026-09-23', events: null, areaHa: null, areaMinHa: 77529, areaAvgHa: 355397, areaMaxHa: 1026104, eventsAvg: 1022.1 },
  { week: 39, date: '2026-09-30', events: null, areaHa: null, areaMinHa: 77871, areaAvgHa: 358346, areaMaxHa: 1027351, eventsAvg: 1034.3 },
  { week: 40, date: '2026-10-07', events: null, areaHa: null, areaMinHa: 78721, areaAvgHa: 360510, areaMaxHa: 1028701, eventsAvg: 1048.3 },
  { week: 41, date: '2026-10-14', events: null, areaHa: null, areaMinHa: 79041, areaAvgHa: 369707, areaMaxHa: 1030778, eventsAvg: 1066.8 },
  { week: 42, date: '2026-10-21', events: null, areaHa: null, areaMinHa: 79041, areaAvgHa: 384333, areaMaxHa: 1031643, eventsAvg: 1086.6 },
  { week: 43, date: '2026-10-28', events: null, areaHa: null, areaMinHa: 79041, areaAvgHa: 385656, areaMaxHa: 1032128, eventsAvg: 1093.3 },
  { week: 44, date: '2026-11-04', events: null, areaHa: null, areaMinHa: 79041, areaAvgHa: 386483, areaMaxHa: 1032700, eventsAvg: 1098.5 },
  { week: 45, date: '2026-11-11', events: null, areaHa: null, areaMinHa: 79041, areaAvgHa: 387014, areaMaxHa: 1033401, eventsAvg: 1103.0 },
  { week: 46, date: '2026-11-18', events: null, areaHa: null, areaMinHa: 79041, areaAvgHa: 387506, areaMaxHa: 1033895, eventsAvg: 1106.2 },
  { week: 47, date: '2026-11-25', events: null, areaHa: null, areaMinHa: 79041, areaAvgHa: 387718, areaMaxHa: 1034229, eventsAvg: 1108.7 },
  { week: 48, date: '2026-12-02', events: null, areaHa: null, areaMinHa: 79041, areaAvgHa: 387801, areaMaxHa: 1034229, eventsAvg: 1109.4 },
  { week: 49, date: '2026-12-09', events: null, areaHa: null, areaMinHa: 79041, areaAvgHa: 387898, areaMaxHa: 1034305, eventsAvg: 1110.4 },
  { week: 50, date: '2026-12-16', events: null, areaHa: null, areaMinHa: 79041, areaAvgHa: 387995, areaMaxHa: 1034377, eventsAvg: 1111.3 },
  { week: 51, date: '2026-12-23', events: null, areaHa: null, areaMinHa: 79041, areaAvgHa: 388195, areaMaxHa: 1034377, eventsAvg: 1113.0 },
  { week: 52, date: '2026-12-30', events: null, areaHa: null, areaMinHa: 79041, areaAvgHa: 388624, areaMaxHa: 1034552, eventsAvg: 1117.1 },
],
};
