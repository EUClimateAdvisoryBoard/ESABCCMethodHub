#!/usr/bin/env node
/**
 * Refresh the Eurostat-derived series of the Climate Security Ledger (M · 45).
 * ---------------------------------------------------------------------------
 * `beta/modules/climate-security/data.generated.ts` shipped with
 * order-of-magnitude anchors written from the assistant's own knowledge,
 * because Eurostat was believed to be unreachable from the build sandbox. It
 * is reachable — the dissemination API answers plain HTTPS — so those anchors
 * are now replaced by the real series, and this script is the thing that puts
 * them there. Nothing in that file's Eurostat-derived blocks should ever be
 * hand-edited again: change the query here and re-run.
 *
 * What it rewrites, in place, between the `EUROSTAT-BEGIN`/`EUROSTAT-END`
 * markers of that file:
 *
 *   - `DEMAND`          EU-27 fossil demand in natural units per year:
 *                       gas from `nrg_cb_gas` inland consumption in million
 *                       cubic metres (so bcm is the API's own unit, not a
 *                       calorific-value conversion of ours), oil from
 *                       `nrg_cb_oil` gross inland deliveries of oil and
 *                       petroleum products excluding the biofuel portion,
 *                       hard coal from `nrg_cb_sff` inland consumption.
 *   - `IMPORT_SHARE`    gas and oil from the published import-dependency
 *                       indicator `nrg_ind_id`; hard coal DERIVED as imports
 *                       ÷ inland consumption from `nrg_cb_sff`, because the
 *                       published indicator covers all solid fossil fuels
 *                       including lignite and the module is hard-coal only.
 *   - `ACTIVITY`        EU-27 real GDP, chain-linked volumes, `nama_10_gdp`
 *                       index 2015 = 100 (`CLV_I15`) — the API's own rebased
 *                       index, so no arithmetic of ours enters it.
 *   - `GAS_SUPPLIER_MIX`, `RUSSIAN_SHARE_PRE2022`, `RUSSIAN_SHARE_2024`
 *                       supplier shares of EXTRA-EU gas imports from
 *                       `nrg_ti_gas`, and the Russian share of extra-EU hard
 *                       coal from `nrg_ti_sff` and of oil from `nrg_ti_oil`.
 *   - `EU_POPULATION_M` `demo_gind` average population.
 *
 * What it deliberately does NOT touch: border prices (TTF/Brent/API2 are not
 * Eurostat products), the 2030 pathway levels, and the assumed 2030 import
 * shares. Those carry their own source notes and their own review status.
 *
 * Two honesty rules are enforced in code rather than left to the reader:
 *
 *   1. A partner share is computed over EXTRA-EU imports only. The EU-27
 *      aggregate in `nrg_ti_gas` sums member-state imports, so it double
 *      counts gas that lands in one member state and is piped on to another;
 *      leaving intra-EU partners in would deflate every third-country share.
 *   2. An empty `value` object, or a year with no observation, is FATAL. A
 *      200 response carrying nothing is exactly the silent failure that would
 *      otherwise leave stale numbers behind a fresh-looking timestamp.
 *
 * Usage:  node scripts/refresh-climate-security-eurostat.mjs [--dry-run]
 * Source: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/
 *         (open data, no API key) — dataset codes are quoted above and are
 *         reproduced in the rewritten source notes.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_TS = join(ROOT, 'beta/modules/climate-security/data.generated.ts');
const SNAPSHOT_DIR = join(ROOT, 'public/data/climate-security');
const SNAPSHOT_JSON = join(SNAPSHOT_DIR, 'eurostat-snapshot.json');

const API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/';
const DRY_RUN = process.argv.includes('--dry-run');

/** Observation window of the backward-looking leg. Must match YEARS in data.generated.ts. */
const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
/** Supplier-mix comparison years: the last pre-invasion year and the latest complete one. */
const MIX_BEFORE = 2021;
const MIX_AFTER = 2024;

/** EU-27 member codes, used to strip intra-EU partners out of the supplier mix. */
const EU27 = new Set([
  'BE', 'BG', 'CZ', 'DK', 'DE', 'EE', 'IE', 'EL', 'ES', 'FR', 'HR', 'IT', 'CY', 'LV', 'LT', 'LU',
  'HU', 'MT', 'NL', 'AT', 'PL', 'PT', 'RO', 'SI', 'SK', 'FI', 'SE',
]);

/**
 * Fetch one Eurostat cube and decode JSON-stat into a map keyed by the tuple
 * of dimension codes. Retries transport errors; a non-200, a non-JSON body or
 * an empty `value` object is fatal rather than an empty result.
 */
async function cube(dataset, params) {
  const qs = new URLSearchParams({ format: 'JSON', ...params }).toString();
  const url = `${API}${dataset}?${qs}`;
  let last;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${dataset} (${qs})`);
      const body = await res.json();
      if (!body?.value || Object.keys(body.value).length === 0) {
        throw new Error(`Eurostat returned 200 with an empty value set for ${dataset} (${qs})`);
      }
      const ids = body.id;
      const size = body.size;
      const decode = {};
      for (const d of ids) {
        decode[d] = Object.fromEntries(
          Object.entries(body.dimension[d].category.index).map(([code, i]) => [i, code]),
        );
      }
      // Cells are keyed by dimension NAME, never by position: the dimension
      // order differs between datasets and positional indexing silently reads
      // the wrong dimension rather than failing.
      const cells = [];
      for (const [flat, value] of Object.entries(body.value)) {
        let rem = Number(flat);
        const coord = [];
        for (let k = size.length - 1; k >= 0; k -= 1) {
          coord[k] = rem % size[k];
          rem = Math.floor(rem / size[k]);
        }
        cells.push({ at: Object.fromEntries(ids.map((d, k) => [d, decode[d][coord[k]]])), value });
      }
      return { cells, updated: body.updated, ids };
    } catch (err) {
      last = err;
      if (attempt < 4) await new Promise((r) => setTimeout(r, 2000 * 2 ** (attempt - 1)));
    }
  }
  throw last;
}

/** Pull a single-cell-per-year series and assert every year in YEARS is present. */
async function yearSeries(dataset, params, label, { scale = 1, years = YEARS } = {}) {
  const c = await cube(dataset, { ...params, geo: 'EU27_2020' });
  const byYear = new Map();
  for (const { at, value } of c.cells) {
    const year = Number(at.time);
    if (Number.isFinite(year)) byYear.set(year, value * scale);
  }
  const series = years.map((y) => {
    const v = byYear.get(y);
    if (v === undefined) throw new Error(`${label}: Eurostat has no ${y} observation (${dataset})`);
    return v;
  });
  return { series, updated: c.updated };
}

/** Extra-EU partner shares of gas imports for one year, percent of the extra-EU total. */
async function gasPartnerShares(year) {
  const c = await cube('nrg_ti_gas', {
    geo: 'EU27_2020', siec: 'G3000', unit: 'MIO_M3', time: String(year),
  });
  const byPartner = new Map();
  for (const { at, value } of c.cells) {
    byPartner.set(at.partner, (byPartner.get(at.partner) ?? 0) + value);
  }
  const extra = [...byPartner].filter(([p]) => p !== 'TOTAL' && !EU27.has(p));
  const total = extra.reduce((a, [, v]) => a + v, 0);
  if (!(total > 0)) throw new Error(`nrg_ti_gas ${year}: extra-EU import total is not positive`);
  const share = (codes) =>
    (100 * extra.filter(([p]) => codes.includes(p)).reduce((a, [, v]) => a + v, 0)) / total;
  return {
    totalBcm: total / 1000,
    russia: share(['RU']),
    norway: share(['NO']),
    unitedStates: share(['US']),
    northAfrica: share(['DZ', 'LY', 'EG']),
    // Everything not named above, so the five rows always sum to exactly 100.
    other: 100 - share(['RU', 'NO', 'US', 'DZ', 'LY', 'EG']),
  };
}

/** Russian share of extra-EU imports of one solid/liquid fuel, percent. */
async function russianShare(dataset, params, year) {
  const c = await cube(dataset, { ...params, geo: 'EU27_2020', time: String(year) });
  const byPartner = new Map();
  for (const { at, value } of c.cells) {
    byPartner.set(at.partner, (byPartner.get(at.partner) ?? 0) + value);
  }
  const extra = [...byPartner].filter(([p]) => p !== 'TOTAL' && !EU27.has(p));
  const total = extra.reduce((a, [, v]) => a + v, 0);
  if (!(total > 0)) throw new Error(`${dataset} ${year}: extra-EU import total is not positive`);
  if (!byPartner.has('RU')) {
    throw new Error(`${dataset} ${year}: no Russia partner cell — check the siec/unit codes`);
  }
  return (100 * byPartner.get('RU')) / total;
}

const r1 = (x) => Math.round(x * 10) / 10;

/**
 * Emit a TypeScript string literal for generated prose. Source notes contain
 * apostrophes ("Russia's share"), which silently produced an unparseable file
 * when they were pasted straight into a single-quoted literal — so quoting is
 * done here rather than trusted to the prose. Double quotes are chosen when
 * the text contains an apostrophe and no double quote, which is what Prettier
 * would settle on anyway, so the generated file survives `npm run lint`.
 */
function lit(s) {
  if (s.includes("'") && !s.includes('"')) return `"${s.replace(/\\/g, '\\\\')}"`;
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

async function main() {
  process.stdout.write('Pulling Eurostat series…\n');

  const [gas, oil, coal, coalImp, gasDep, oilDep, gdp, pop] = await Promise.all([
    yearSeries('nrg_cb_gas', { nrg_bal: 'IC_CAL', siec: 'G3000', unit: 'MIO_M3' }, 'gas demand', { scale: 1e-3 }),
    yearSeries('nrg_cb_oil', { nrg_bal: 'GID_CAL', siec: 'O4000XBIO', unit: 'THS_T' }, 'oil demand', { scale: 1e-3 }),
    yearSeries('nrg_cb_sff', { nrg_bal: 'IC_CAL', siec: 'C0100', unit: 'THS_T' }, 'hard-coal demand', { scale: 1e-3 }),
    yearSeries('nrg_cb_sff', { nrg_bal: 'IMP', siec: 'C0100', unit: 'THS_T' }, 'hard-coal imports', { scale: 1e-3 }),
    yearSeries('nrg_ind_id', { siec: 'G3000', unit: 'PC' }, 'gas import dependency'),
    yearSeries('nrg_ind_id', { siec: 'O4000XBIO', unit: 'PC' }, 'oil import dependency'),
    yearSeries('nama_10_gdp', { na_item: 'B1GQ', unit: 'CLV_I15' }, 'GDP volume index'),
    yearSeries('demo_gind', { indic_de: 'AVG' }, 'population', { scale: 1e-6, years: [MIX_AFTER] }),
  ]);

  const [mixBefore, mixAfter] = await Promise.all([
    gasPartnerShares(MIX_BEFORE), gasPartnerShares(MIX_AFTER),
  ]);
  const [ruOilBefore, ruOilAfter, ruCoalBefore, ruCoalAfter] = await Promise.all([
    russianShare('nrg_ti_oil', { siec: 'O4100_TOT', unit: 'THS_T' }, MIX_BEFORE),
    russianShare('nrg_ti_oil', { siec: 'O4100_TOT', unit: 'THS_T' }, MIX_AFTER),
    russianShare('nrg_ti_sff', { siec: 'C0100', unit: 'THS_T' }, MIX_BEFORE),
    russianShare('nrg_ti_sff', { siec: 'C0100', unit: 'THS_T' }, MIX_AFTER),
  ]);

  // Hard-coal import share is derived, so it is bounded explicitly: a stock
  // draw can push imports above consumption in a single year, and a share
  // over 100 % would silently break the avoided-import arithmetic downstream.
  const coalShare = coal.series.map((c, i) => {
    const s = (100 * coalImp.series[i]) / c;
    if (!(s > 0) || s > 100) {
      throw new Error(`derived hard-coal import share for ${YEARS[i]} is ${s.toFixed(1)} %, outside 0–100`);
    }
    return s;
  });

  const snapshot = {
    fetchedAt: new Date().toISOString().slice(0, 10),
    api: API,
    years: YEARS,
    series: {
      gasDemandBcm: gas.series.map(r1),
      oilDemandMt: oil.series.map(r1),
      hardCoalDemandMt: coal.series.map(r1),
      hardCoalImportsMt: coalImp.series.map(r1),
      gasImportDependencyPc: gasDep.series.map(r1),
      oilImportDependencyPc: oilDep.series.map(r1),
      hardCoalImportSharePc: coalShare.map(r1),
      gdpVolumeIndex2015: gdp.series.map(r1),
    },
    gasSupplierMixExtraEuPc: { [MIX_BEFORE]: mixBefore, [MIX_AFTER]: mixAfter },
    russianSharePc: {
      gas: { [MIX_BEFORE]: r1(mixBefore.russia), [MIX_AFTER]: r1(mixAfter.russia) },
      crudeOil: { [MIX_BEFORE]: r1(ruOilBefore), [MIX_AFTER]: r1(ruOilAfter) },
      hardCoal: { [MIX_BEFORE]: r1(ruCoalBefore), [MIX_AFTER]: r1(ruCoalAfter) },
    },
    populationMillions: r1(pop.series[0]),
    datasetUpdated: {
      nrg_cb_gas: gas.updated, nrg_cb_oil: oil.updated, nrg_cb_sff: coal.updated,
      nrg_ind_id: gasDep.updated, nama_10_gdp: gdp.updated,
    },
  };

  const stamp = snapshot.fetchedAt;
  const cite = (dataset, what) =>
    `Eurostat ${dataset}, ${what}. Live pull ${stamp} via scripts/refresh-climate-security-eurostat.mjs.`;

  const arr = (xs) => `[${xs.map((x) => r1(x).toFixed(1)).join(', ')}]`;

  const block = `/* EUROSTAT-BEGIN — generated by scripts/refresh-climate-security-eurostat.mjs on ${stamp}.
 * Do not hand-edit anything between these markers: change the query in the
 * script and re-run it. Every series below is a live Eurostat observation,
 * not an estimate, so the earlier "± 5 %" compile tolerances are gone —
 * what remains is the definitional caveat stated on each entry. */

/** Observation years of the backward-looking leg. */
export const YEARS: number[] = [${YEARS.join(', ')}];

/**
 * EU-27 fossil demand per year, natural units (gas bcm; oil, coal Mt),
 * straight from Eurostat in each fuel's own reported unit.
 */
export const DEMAND: Record<Fuel, { series: number[]; tolerance: string; source: string }> = {
  gas: {
    //       ${YEARS.join('  ')}
    series: ${arr(gas.series)},
    tolerance: ${lit('Reported values, not estimates. Definitional caveat: inland consumption (calculated), which includes transformation input and own use.')},
    source:
      ${lit(cite('nrg_cb_gas', "EU-27 natural gas inland consumption (calculated), million cubic metres → bcm. Reported in volume by Eurostat, so no calorific-value conversion is applied here"))},
  },
  oil: {
    series: ${arr(oil.series)},
    tolerance: ${lit('Reported values, not estimates. Definitional caveat: gross inland deliveries excluding the biofuel portion; including it raises every year by roughly 15–20 Mt.')},
    source:
      ${lit(cite('nrg_cb_oil', 'EU-27 gross inland deliveries (calculated) of oil and petroleum products excluding the biofuel portion, thousand tonnes → Mt'))},
  },
  coal: {
    series: ${arr(coal.series)},
    tolerance: ${lit('Reported values, not estimates. Definitional caveat: hard coal only; lignite is excluded because it is almost entirely domestic and carries no import bill.')},
    source:
      ${lit(cite('nrg_cb_sff', 'EU-27 hard coal inland consumption (calculated), thousand tonnes → Mt'))},
  },
};

/**
 * Import share of demand per fuel and year, percent (0–100 scale).
 * Gas and oil use Eurostat's published import-dependency indicator, which is
 * net imports over gross available energy and therefore moves with stock
 * changes as well as with trade — it is NOT a smooth trend, and the 2022
 * spike and 2024 fall below are both real.
 */
export const IMPORT_SHARE: Record<Fuel, { series: number[]; tolerance: string; source: string }> = {
  gas: {
    series: ${arr(gasDep.series)},
    tolerance: ${lit('Reported indicator values. Can exceed 100 % in a stock-building year, by construction.')},
    source: ${lit(cite('nrg_ind_id', 'EU-27 natural-gas import dependency, percent'))},
  },
  oil: {
    series: ${arr(oilDep.series)},
    tolerance: ${lit('Reported indicator values.')},
    source: ${lit(cite('nrg_ind_id', 'EU-27 import dependency for oil and petroleum products excluding the biofuel portion, percent'))},
  },
  coal: {
    series: ${arr(coalShare)},
    tolerance: ${lit('Derived quotient of two reported series, so it carries both their definitional caveats; bounded to 0–100 by the generator.')},
    source:
      ${lit(cite('nrg_cb_sff', 'EU-27 hard-coal imports divided by hard-coal inland consumption. The published nrg_ind_id indicator is NOT used for coal because it covers all solid fossil fuels including lignite, which is domestic'))},
  },
};

/**
 * EU-27 activity index (real GDP, chain-linked volumes), 2015 = 100.
 * Used to scale the frozen-intensity counterfactual by actual activity.
 */
export const ACTIVITY: { series: number[]; source: string } = {
  //       ${YEARS.join('   ')}
  series: ${arr(gdp.series)},
  source:
    ${lit(cite('nama_10_gdp', 'EU-27 GDP at market prices, chain-linked volumes, index 2015 = 100 (CLV_I15) — the rebased index published by Eurostat itself'))},
};
/* EUROSTAT-END */`;

  const mixBlock = `/* EUROSTAT-MIX-BEGIN — generated by scripts/refresh-climate-security-eurostat.mjs on ${stamp}. */

/**
 * Russian share of EU-27 EXTRA-EU imports per fuel BEFORE the 2022 invasion
 * (${MIX_BEFORE} reference year), percent. Used to state the "avoided Russian
 * imports at the pre-war mix" line.
 */
export const RUSSIAN_SHARE_PRE2022: Record<Fuel, SourcedRange> = {
  gas: {
    value: ${r1(mixBefore.russia)},
    lo: ${r1(mixBefore.russia - 2)},
    hi: ${r1(mixBefore.russia + 2)},
    source:
      ${lit(cite('nrg_ti_gas', `Russia's share of EU-27 extra-EU natural-gas imports in ${MIX_BEFORE}, million cubic metres. Intra-EU partners are excluded so onward pipeline flows are not double counted; the ± 2 pp band covers the "not specified" partner residual`))},
  },
  oil: {
    value: ${r1(ruOilBefore)},
    lo: ${r1(ruOilBefore - 2)},
    hi: ${r1(ruOilBefore + 2)},
    source: ${lit(cite('nrg_ti_oil', `Russia's share of EU-27 extra-EU CRUDE OIL imports in ${MIX_BEFORE}, thousand tonnes. Refined products are not included in this share`))},
  },
  coal: {
    value: ${r1(ruCoalBefore)},
    lo: ${r1(ruCoalBefore - 2)},
    hi: ${r1(ruCoalBefore + 2)},
    source: ${lit(cite('nrg_ti_sff', `Russia's share of EU-27 extra-EU HARD COAL imports in ${MIX_BEFORE}, thousand tonnes. Embargoed from August 2022 by Council Reg. (EU) 2022/576`))},
  },
};

/**
 * Gas import supplier mix, ${MIX_BEFORE} vs ${MIX_AFTER}, percent of EXTRA-EU gas imports
 * (pipeline + LNG). Recorded in both directions on purpose: the fall of the
 * Russian share and the rise of the US LNG share — a NEW dependency — are
 * the same story told even-handedly.
 */
export const GAS_SUPPLIER_MIX: {
  rows: { name: string; share2021: number; share2024: number }[];
  tolerance: string;
  source: string;
} = {
  rows: [
    { name: 'Russia (pipeline + LNG)', share2021: ${r1(mixBefore.russia)}, share2024: ${r1(mixAfter.russia)} },
    { name: 'Norway', share2021: ${r1(mixBefore.norway)}, share2024: ${r1(mixAfter.norway)} },
    { name: 'United States (LNG)', share2021: ${r1(mixBefore.unitedStates)}, share2024: ${r1(mixAfter.unitedStates)} },
    { name: 'North Africa', share2021: ${r1(mixBefore.northAfrica)}, share2024: ${r1(mixAfter.northAfrica)} },
    { name: 'Other (UK, Azerbaijan, other LNG, not specified)', share2021: ${r1(mixBefore.other)}, share2024: ${r1(mixAfter.other)} },
  ],
  tolerance:
    ${lit(`Reported trade values, but partner attribution is the country of dispatch, not of production — LNG trans-shipment and re-exported pipeline gas can therefore sit under the wrong flag. The "not specified" residual is left inside the Other row rather than redistributed across the named suppliers.`)},
  source:
    ${lit(cite('nrg_ti_gas', `EU-27 imports of natural gas by partner, million cubic metres, ${MIX_BEFORE} and ${MIX_AFTER}; shares computed over extra-EU partners only (extra-EU totals ${r1(mixBefore.totalBcm)} bcm and ${r1(mixAfter.totalBcm)} bcm)`))},
};

/** Russian share in ${MIX_AFTER}, per fuel, percent — the post-sanctions residual. */
export const RUSSIAN_SHARE_2024: Record<Fuel, SourcedRange> = {
  gas: {
    value: ${r1(mixAfter.russia)},
    lo: ${r1(mixAfter.russia - 2)},
    hi: ${r1(mixAfter.russia + 2)},
    source: ${lit(cite('nrg_ti_gas', `Russia's share of EU-27 extra-EU natural-gas imports in ${MIX_AFTER}. Trackers that reallocate LNG trans-shipment report a somewhat higher figure; the difference is a method difference, not an error`))},
  },
  oil: {
    value: ${r1(ruOilAfter)},
    lo: ${r1(Math.max(0, ruOilAfter - 1))},
    hi: ${r1(ruOilAfter + 1)},
    source: ${lit(cite('nrg_ti_oil', `Russia's share of EU-27 extra-EU crude-oil imports in ${MIX_AFTER}, after the December 2022 crude embargo; the residual is the Druzhba pipeline exemption`))},
  },
  coal: {
    value: ${r1(ruCoalAfter)},
    lo: ${r1(Math.max(0, ruCoalAfter - 0.5))},
    hi: ${r1(ruCoalAfter + 0.5)},
    source: ${lit(cite('nrg_ti_sff', `Russia's share of EU-27 extra-EU hard-coal imports in ${MIX_AFTER}, under the full embargo in force since August 2022 (Council Reg. (EU) 2022/576)`))},
  },
};
/* EUROSTAT-MIX-END */`;

  const popBlock = `/* EUROSTAT-POP-BEGIN — generated by scripts/refresh-climate-security-eurostat.mjs on ${stamp}. */
/** EU-27 population, millions, for the €-per-citizen line. */
export const EU_POPULATION_M: { value: number; source: string } = {
  value: ${r1(pop.series[0])},
  source: ${lit(cite('demo_gind', `EU-27 average population in ${MIX_AFTER}, millions`))},
};
/* EUROSTAT-POP-END */`;

  let src = readFileSync(DATA_TS, 'utf8');
  const splice = (text, beginMarker, endMarker, replacement) => {
    const start = text.indexOf(beginMarker);
    const end = text.indexOf(endMarker);
    if (start === -1 || end === -1) {
      throw new Error(`marker pair ${beginMarker}/${endMarker} not found in ${DATA_TS}`);
    }
    return text.slice(0, start) + replacement + text.slice(end + endMarker.length);
  };
  src = splice(src, '/* EUROSTAT-BEGIN', '/* EUROSTAT-END */', block);
  src = splice(src, '/* EUROSTAT-MIX-BEGIN', '/* EUROSTAT-MIX-END */', mixBlock);
  src = splice(src, '/* EUROSTAT-POP-BEGIN', '/* EUROSTAT-POP-END */', popBlock);

  if (DRY_RUN) {
    process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n--- dry run, nothing written ---\n`);
    return;
  }
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  writeFileSync(SNAPSHOT_JSON, `${JSON.stringify(snapshot, null, 2)}\n`);
  writeFileSync(DATA_TS, src);
  process.stdout.write(`Wrote ${SNAPSHOT_JSON}\nWrote ${DATA_TS}\n`);
}

main().catch((err) => {
  process.stderr.write(`refresh-climate-security-eurostat failed: ${err.message}\n`);
  process.exit(1);
});
