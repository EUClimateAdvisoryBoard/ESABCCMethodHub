#!/usr/bin/env node
/**
 * Refresh the EFFIS burnt-area snapshots used by the wildfire-sink-risk module.
 * ---------------------------------------------------------------------------
 * `beta/modules/wildfire-sink-risk/analyses/data.ts` is marked GENERATED DATA,
 * DO NOT HAND-EDIT THE NUMBERS, but until now there was no script to generate
 * it — the arrays had to be refreshed by hand, which is exactly the situation
 * the repository's conventions exist to prevent. This script closes that gap.
 *
 * It rewrites, in place, only the machine-derived parts of that file:
 *
 *   - `FETCHED_AT`            the ISO date of this run
 *   - each country's `fires`  EFFIS rapid-damage-assessment ANNUAL estimates,
 *                             2006 to the current year, from
 *                             `statistics/v2/effis/estimatesbycountry`
 *   - `EU_ANNUAL`             EU-wide burnt area and fire count per complete
 *                             year, from the week-52 cumulative value of
 *                             `statistics/v2/effis/weeklyaoi?aoi=EU&year=<Y>`
 *
 * Everything else is left untouched. In particular the Annex IIa figures are
 * copied verbatim from the Official Journal, not from any API, so this script
 * never writes them; the country list and its ordering are read back out of
 * the file rather than hard-coded here, so adding or removing a Member State
 * is a single edit in `data.ts`.
 *
 * The current year's row is the season TO DATE and is provisional — EFFIS
 * remaps fires continuously, so already-published weeks move in both
 * directions between runs. That is expected, and it is why this is a refresh
 * script rather than a one-off import.
 *
 * The two products do not agree exactly with each other, nor with the JRC
 * annual fire reports that `../model.ts` uses for its headline 2021-25 series
 * (2025: 1,034,552 ha in the weekly product against 1,079,538 ha in the JRC
 * report). That is a genuine product difference, not an error — see the caveat
 * block at the top of `data.ts`. Each analysis stays inside one product.
 *
 * The live 2026-season fallback snapshot in
 * `beta/modules/wildfire-sink-risk/live.ts` is a separate artefact fed by a
 * different endpoint (`weeklyaoi` for the current year, plus CAMS emissions
 * and `rda-stats`); this script does not touch it.
 *
 * Usage:  node scripts/refresh-wildfire-effis-data.mjs [--dry-run]
 * Source: https://api2.effis.emergency.copernicus.eu/ (open Copernicus data,
 *         no API key required) — https://effis.jrc.ec.europa.eu/
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_TS = join(ROOT, 'beta/modules/wildfire-sink-risk/analyses/data.ts');

const EFFIS_BASE = 'https://api2.effis.emergency.copernicus.eu';
const FIRST_YEAR = 2006;
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Fetch JSON from EFFIS, retrying on transport errors. Anything other than a
 * 200 with a JSON body is fatal: a silent fall-through to stale numbers is the
 * failure mode this whole script exists to make impossible.
 */
async function effisJson(path, attempt = 1) {
  try {
    const res = await fetch(EFFIS_BASE + path, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    if (attempt >= 4) throw new Error(`${path}: ${err.message}`);
    await new Promise((r) => setTimeout(r, 2000 * 2 ** (attempt - 1)));
    return effisJson(path, attempt + 1);
  }
}

/** Per-country annual rapid-damage-assessment estimates, FIRST_YEAR..thisYear. */
async function countryFires(iso3, thisYear) {
  const rows = await effisJson(
    `/statistics/v2/effis/estimatesbycountry?country=${iso3}`
  );
  if (!Array.isArray(rows)) throw new Error(`${iso3}: expected an array`);
  const byYear = new Map(rows.map((r) => [r.year, r]));
  const out = [];
  for (let y = FIRST_YEAR; y <= thisYear; y += 1) {
    const r = byYear.get(y);
    // EFFIS omits years in which a country recorded nothing; a missing year is
    // a real zero, not missing data.
    out.push([y, Math.round(r?.ba ?? 0), Math.round(r?.nf ?? 0)]);
  }
  return out;
}

/** EU-wide week-52 cumulative burnt area and fire count for one complete year. */
async function euYear(year) {
  const data = await effisJson(
    `/statistics/v2/effis/weeklyaoi?aoi=EU&year=${year}`
  );
  const rows = data?.banfcumulative;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`EU ${year}: missing banfcumulative rows`);
  }
  let last = null;
  for (const r of rows) if (r.area_ha !== null) last = r;
  if (!last) throw new Error(`EU ${year}: no observed weeks`);
  return [year, Math.round(last.area_ha), Math.round(last.events ?? 0)];
}

const fmtSeries = (rows) =>
  `[${rows.map(([y, ba, nf]) => `[${y}, ${ba}, ${nf}]`).join(', ')}]`;

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const thisYear = Number(today.slice(0, 4));
  // The current season is still running, so the last COMPLETE year is the one
  // before it. EU_ANNUAL carries complete years only.
  const lastComplete = thisYear - 1;

  let src = readFileSync(DATA_TS, 'utf8');

  // Country order and codes come from the file itself, so this script never
  // needs to know the Member State list.
  const iso3s = [...src.matchAll(/iso3: '([A-Z]{3})'/g)].map((m) => m[1]);
  if (iso3s.length === 0) throw new Error('no iso3 entries found in data.ts');
  console.log(`Refreshing ${iso3s.length} countries + EU-wide ${FIRST_YEAR}-${lastComplete}…`);

  // Sequential on purpose: EFFIS is a public service and this is ~50 calls.
  const changes = [];
  for (const iso3 of iso3s) {
    const rows = await countryFires(iso3, thisYear);
    const series = fmtSeries(rows);
    // Replace the `fires:` array belonging to THIS country only — anchored on
    // its iso3 so the entries can never be written to the wrong Member State.
    const re = new RegExp(
      `(iso3: '${iso3}'[\\s\\S]*?fires: )\\[[\\s\\S]*?\\]\\]`
    );
    if (!re.test(src)) throw new Error(`${iso3}: could not locate its fires array`);
    src = src.replace(re, (_m, head) => head + series);
    const cur = rows[rows.length - 1];
    changes.push(`  ${iso3} ${thisYear}: ${cur[1].toLocaleString('en-GB')} ha, ${cur[2]} fires`);
  }

  const euRows = [];
  for (let y = FIRST_YEAR; y <= lastComplete; y += 1) euRows.push(await euYear(y));

  const euRe = /(export const EU_ANNUAL: FireYear\[\] = )\[[\s\S]*?\]\];/;
  if (!euRe.test(src)) throw new Error('could not locate EU_ANNUAL');
  src = src.replace(euRe, (_m, head) => `${head}${fmtSeries(euRows)};`);

  src = src.replace(
    /(export const FETCHED_AT = ')[\d-]+(')/,
    (_m, a, b) => a + today + b
  );
  src = src.replace(
    /(export const LAST_COMPLETE_YEAR = )\d+/,
    (_m, a) => a + lastComplete
  );
  // Keep the two prose mentions of the fetch date in the header in step.
  src = src.replaceAll(/on \d{4}-\d{2}-\d{2}(:|\))/g, `on ${today}$1`);
  src = src.replace(
    /(at fetch time \()\d{4}-\d{2}-\d{2}(\))/,
    (_m, a, b) => a + today + b
  );

  console.log(changes.join('\n'));
  console.log(`  EU-wide ${lastComplete}: ${euRows[euRows.length - 1][1].toLocaleString('en-GB')} ha`);

  if (DRY_RUN) {
    console.log('\n--dry-run: data.ts not written.');
    return;
  }
  writeFileSync(DATA_TS, src);
  console.log(`\nWrote ${DATA_TS} (FETCHED_AT ${today}).`);
}

main().catch((err) => {
  console.error(`refresh-wildfire-effis-data: ${err.message}`);
  process.exit(1);
});
