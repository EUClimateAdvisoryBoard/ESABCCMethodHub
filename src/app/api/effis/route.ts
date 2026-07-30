import { NextRequest, NextResponse } from 'next/server';
import type { LiveSeasonPayload, LiveWeekRow } from '../../../../beta/modules/wildfire-sink-risk/live';

/**
 * EFFIS statistics API proxy
 * ─────────────────────────────────────────────────────────────────────
 * EFFIS (the European Forest Fire Information System, run by the Joint
 * Research Centre for Copernicus Emergency Management) publishes weekly
 * burnt-area / fire-count statistics and CAMS wildfire emissions for the
 * current season, plus a rapid-damage-assessment estimate and long-run
 * per-country annual totals. This is free, open Copernicus data — no API
 * key or auth is required for any of the endpoints below.
 *
 *   Project: https://effis.jrc.ec.europa.eu/
 *   API root: https://api2.effis.emergency.copernicus.eu/
 *
 * ═══ USAGE ═══
 * GET /api/effis                        — same as q=season
 * GET /api/effis?q=season                — live 2026-season payload for the
 *                                           wildfire-sink-risk beta module
 *                                           (see beta/modules/wildfire-sink-risk/live.ts)
 * GET /api/effis?q=bycountry&iso3=ESP     — annual burnt-area / fire-count
 *                                           series for one country
 *
 * Upstream endpoints used:
 *   - /statistics/v2/effis/weeklyaoi?aoi=EU&year=<Y>          (burnt area, fires)
 *   - /statistics/v2/emissions/weeklyaoi?aoi=EU&year=<Y>      (CAMS wildfire CO2)
 *   - /rda-stats?year=<Y>                                     (rapid damage assessment)
 *   - /statistics/v2/effis/estimatesbycountry?country=<ISO3>  (per-country annual)
 *
 * Each upstream call is cached for 30 minutes (`next.revalidate`) and bounded
 * by a 12s timeout. This route never throws: on any failure of the essential
 * burnt-area call it returns `{ ok: false, error }` with HTTP 200 — the
 * client (`fetchLiveSeason` in live.ts) has its own embedded fallback
 * snapshot and does not need a non-200 to know something went wrong. The
 * secondary CO2 / rapid-damage-assessment calls degrade independently: if
 * either fails, its fields are simply set to null in an otherwise-ok payload.
 */

const EFFIS_BASE = 'https://api2.effis.emergency.copernicus.eu';

// ── Upstream shapes (only the fields we use) ──────────────────────────
type BanfCumRow = {
  week: number;
  mddate: string;
  events: number | null;
  events_avg: number;
  area_ha: number | null;
  area_ha_min: number;
  area_ha_avg: number;
  area_ha_max: number;
};

type WeeklyAoiResponse = {
  banfcumulative: BanfCumRow[];
};

type EmissionsCumRow = {
  dt: string;
  plt: string;
  curv: number | null;
  minv: number;
  avgv: number;
  maxv: number;
};

type EmissionsWeeklyAoiResponse = {
  emissionsweeklycum: EmissionsCumRow[];
};

type RdaStatsResponse = {
  EU?: { estSumTotal: number };
};

type EstimatesByCountryRow = { year: number; ba: number; nf: number };

// ── Helpers ────────────────────────────────────────────────────────────
async function effisFetch(path: string): Promise<unknown> {
  const res = await fetch(EFFIS_BASE + path, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
    // Cache upstream lookups for 30 minutes — EFFIS updates weekly.
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`EFFIS API ${res.status}: ${res.statusText}`);
  return await res.json();
}

/** 'YYYYMMDD' → 'YYYY-MM-DD'. */
function mddateToIso(mddate: string): string {
  return `${mddate.slice(0, 4)}-${mddate.slice(4, 6)}-${mddate.slice(6, 8)}`;
}

/** Build the live-season payload for the current year. */
async function buildSeasonPayload(): Promise<LiveSeasonPayload> {
  const year = new Date().getUTCFullYear();

  // (a) Burnt area / fires — the essential call. Let failures here propagate
  // so the caller can return ok:false.
  const banfData = (await effisFetch(
    `/statistics/v2/effis/weeklyaoi?aoi=EU&year=${year}`
  )) as WeeklyAoiResponse;
  const banfRows = banfData?.banfcumulative;
  if (!Array.isArray(banfRows) || banfRows.length === 0) {
    throw new Error('EFFIS weeklyaoi: missing banfcumulative rows');
  }

  const cumulative: LiveWeekRow[] = banfRows.map((r) => ({
    week: r.week,
    date: mddateToIso(r.mddate),
    events: r.events,
    areaHa: r.area_ha,
    areaMinHa: Math.round(r.area_ha_min),
    areaAvgHa: Math.round(r.area_ha_avg),
    areaMaxHa: Math.round(r.area_ha_max),
    eventsAvg: r.events_avg,
  }));

  // Last week with observed burnt-area data.
  let lastRow: BanfCumRow | null = null;
  for (const r of banfRows) {
    if (r.area_ha !== null) lastRow = r;
  }

  const week52 = banfRows.find((r) => r.week === 52) ?? banfRows[banfRows.length - 1];

  // (b) CAMS wildfire CO2 emissions — degrades independently.
  let co2ToDateMt: number | null = null;
  let co2AvgToDateMt: number | null = null;
  let co2MaxToDateMt: number | null = null;
  let co2AvgAnnualMt: number | null = null;
  try {
    const emData = (await effisFetch(
      `/statistics/v2/emissions/weeklyaoi?aoi=EU&year=${year}`
    )) as EmissionsWeeklyAoiResponse;
    const co2Rows = (emData?.emissionsweeklycum ?? []).filter((r) => r.plt === 'CO2');
    let lastCo2: EmissionsCumRow | null = null;
    for (const r of co2Rows) {
      if (r.curv !== null) lastCo2 = r;
    }
    if (lastCo2) {
      co2ToDateMt = Math.round((lastCo2.curv! / 1e6) * 100) / 100;
      co2AvgToDateMt = lastCo2.avgv / 1e6;
      co2MaxToDateMt = lastCo2.maxv / 1e6;
    }
    const lastCo2Row = co2Rows[co2Rows.length - 1];
    if (lastCo2Row) co2AvgAnnualMt = lastCo2Row.avgv / 1e6;
  } catch {
    // leave co2 fields null
  }

  // (c) Rapid-damage-assessment estimate — degrades independently.
  let estimatedTotalHa: number | null = null;
  try {
    const rdaData = (await effisFetch(`/rda-stats?year=${year}`)) as RdaStatsResponse;
    if (rdaData?.EU && typeof rdaData.EU.estSumTotal === 'number') {
      estimatedTotalHa = Math.round(rdaData.EU.estSumTotal);
    }
  } catch {
    // leave estimatedTotalHa null
  }

  return {
    year,
    fetchedAt: new Date().toISOString(),
    lastDataDate: lastRow ? mddateToIso(lastRow.mddate) : null,
    lastWeek: lastRow ? lastRow.week : null,
    cumulative,

    baToDateHa: lastRow ? lastRow.area_ha : null,
    baAvgToDateHa: lastRow ? lastRow.area_ha_avg : null,
    baMaxToDateHa: lastRow ? lastRow.area_ha_max : null,
    firesToDate: lastRow ? lastRow.events : null,
    firesAvgToDate: lastRow ? Math.round(lastRow.events_avg) : null,
    estimatedTotalHa,

    co2ToDateMt,
    co2AvgToDateMt,
    co2MaxToDateMt,
    co2AvgAnnualMt,

    baMinAnnualHa: week52 ? week52.area_ha_min : null,
    baAvgAnnualHa: week52 ? week52.area_ha_avg : null,
    baMaxAnnualHa: week52 ? week52.area_ha_max : null,
  };
}

// ── Route handler ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || 'season';

  try {
    if (q === 'bycountry') {
      const iso3 = (request.nextUrl.searchParams.get('iso3') || '').toUpperCase();
      if (!/^[A-Za-z]{3}$/.test(iso3)) {
        return NextResponse.json(
          { ok: false, error: 'Provide iso3= as a 3-letter ISO3 country code' },
          { status: 400 }
        );
      }
      const data = (await effisFetch(
        `/statistics/v2/effis/estimatesbycountry?country=${iso3}`
      )) as EstimatesByCountryRow[];
      const rows = Array.isArray(data)
        ? data.map((r) => ({ year: r.year, ba: r.ba, nf: r.nf }))
        : [];
      return NextResponse.json({ ok: true, rows });
    }

    // Default: q === 'season' (or missing).
    const season = await buildSeasonPayload();
    return NextResponse.json({ ok: true, season });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
