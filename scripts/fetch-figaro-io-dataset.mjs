#!/usr/bin/env node
/**
 * Import the FULL Eurostat FIGARO inter-country input–output table into the
 * MethodHub.
 * ---------------------------------------------------------------------------
 * Downloads the complete `naio_10_fcp_ii4` bulk file — the EU inter-country
 * input–output table at basic prices, industry by industry (FIGARO), 2022 and
 * 2023, ~11 million cells: 64 NACE A*64 industries + 6 value-added/adjustment
 * rows × 64 industries + 5 final-demand columns × 50 origin × 50 destination
 * countries — and condenses it into repo-committed JSON so the data lives on
 * the MethodHub itself (served from /data/figaro/) instead of behind an
 * external link:
 *
 *   public/data/figaro/figaro-io-eu27.json
 *     The EU-27 treated as ONE economy: for each year and each ORIGIN
 *     (EU27 = intra-EU/domestic incl. the value-added rows, plus each of the
 *     23 extra-EU partner areas), the full 70×69 matrix of
 *     supplying industry (ind_ava) × using industry / final demand (ind_use),
 *     with all EU-27 destination countries summed. € million, current prices.
 *     This is the complete FIGARO account of the EU economy at full industry
 *     resolution — only the member-state destination detail and the
 *     extra-EU-to-extra-EU flows are collapsed.
 *
 *   public/data/figaro/figaro-global-flows.json
 *     (a) the full 50×50 country-by-country flow matrix (all industries
 *         summed, split intermediate vs final use) — who supplies whom in the
 *         global economy, and
 *     (b) EU-27 exports by supplying industry × extra-EU destination country
 *         (split intermediate vs final use).
 *
 * The raw 61 MB bulk file is cached under .cache/figaro/ (gitignored) — rerun
 * with `--refresh` to force a fresh download.
 *
 * Usage:  node scripts/fetch-figaro-io-dataset.mjs [--refresh]
 * Source: https://ec.europa.eu/eurostat/databrowser/view/naio_10_fcp_ii4/default/table?lang=en
 */

import { createReadStream, createWriteStream, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE_DIR = join(ROOT, '.cache', 'figaro');
const CACHE_FILE = join(CACHE_DIR, 'naio_10_fcp_ii4.tsv.gz');
const OUT_DIR = join(ROOT, 'public', 'data', 'figaro');

const DATASET = 'naio_10_fcp_ii4';
const BULK_URL = `https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/${DATASET}/?format=TSV&compressed=true`;
const API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';

const YEARS = ['2022', '2023'];

/** EU-27 member-state codes as used by FIGARO (EL = Greece). */
const EU27 = ['BE', 'BG', 'CZ', 'DK', 'DE', 'EE', 'IE', 'EL', 'ES', 'FR', 'HR', 'IT', 'CY', 'LV', 'LT', 'LU', 'HU', 'MT', 'NL', 'AT', 'PL', 'PT', 'RO', 'SI', 'SK', 'FI', 'SE'];
const EU27_SET = new Set(EU27);

/** Extra-EU partner areas, in the dataset's own order. */
const EXTRA = ['NO', 'CH', 'UK', 'ME', 'MK', 'AL', 'RS', 'TR', 'RU', 'ZA', 'CA', 'US', 'MX', 'AR', 'BR', 'CN', 'JP', 'KR', 'IN', 'ID', 'SA', 'AU', 'WRL_REST'];

/** Row axis: 64 A*64 industries + 6 value-added / adjustment rows (c_orig=DOM). */
const IND_AVA = ['A01', 'A02', 'A03', 'B', 'C10-12', 'C13-15', 'C16', 'C17', 'C18', 'C19', 'C20', 'C21', 'C22', 'C23', 'C24', 'C25', 'C26', 'C27', 'C28', 'C29', 'C30', 'C31_32', 'C33', 'D35', 'E36', 'E37-39', 'F', 'G45', 'G46', 'G47', 'H49', 'H50', 'H51', 'H52', 'H53', 'I', 'J58', 'J59_60', 'J61', 'J62_63', 'K64', 'K65', 'K66', 'L', 'M69_70', 'M71', 'M72', 'M73', 'M74_75', 'N77', 'N78', 'N79', 'N80-82', 'O84', 'P85', 'Q86', 'Q87_88', 'R90-92', 'R93', 'S94', 'S95', 'S96', 'T', 'U', 'B2A3G', 'D1', 'D21X31', 'D29X39', 'OP_RES', 'OP_NRES'];
/** Column axis: the same 64 industries + 5 final-demand categories. */
const IND_USE = ['A01', 'A02', 'A03', 'B', 'C10-12', 'C13-15', 'C16', 'C17', 'C18', 'C19', 'C20', 'C21', 'C22', 'C23', 'C24', 'C25', 'C26', 'C27', 'C28', 'C29', 'C30', 'C31_32', 'C33', 'D35', 'E36', 'E37-39', 'F', 'G45', 'G46', 'G47', 'H49', 'H50', 'H51', 'H52', 'H53', 'I', 'J58', 'J59_60', 'J61', 'J62_63', 'K64', 'K65', 'K66', 'L', 'M69_70', 'M71', 'M72', 'M73', 'M74_75', 'N77', 'N78', 'N79', 'N80-82', 'O84', 'P85', 'Q86', 'Q87_88', 'R90-92', 'R93', 'S94', 'S95', 'S96', 'T', 'U', 'P3_S13', 'P3_S14', 'P3_S15', 'P51G', 'P5M'];

const N_INDUSTRIES = 64; // first 64 entries of both axes are industries
const VA_ROWS = new Set(IND_AVA.slice(N_INDUSTRIES));
const FINAL_COLS = new Set(IND_USE.slice(N_INDUSTRIES));

/** Origin groups of the EU-27 matrix file: intra-EU first, then each partner. */
const ORIGINS = ['EU27', ...EXTRA];

const round1 = (v) => Math.round(v * 10) / 10;

async function download(url, dest) {
  console.log(`Downloading ${url} …`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  console.log(`  saved ${(statSync(dest).size / 1e6).toFixed(1)} MB → ${dest}`);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/** Pull authoritative English labels for industries and countries off the API. */
async function fetchLabels() {
  console.log('Fetching label dictionaries from the dissemination API …');
  const indUrl = `${API}/${DATASET}?format=JSON&lang=EN&time=2023&c_orig=DE&c_dest=DE`;
  const geoUrl = `${API}/${DATASET}?format=JSON&lang=EN&time=2023&ind_use=C29&ind_ava=C24`;
  const [ind, geo] = await Promise.all([fetchJson(indUrl), fetchJson(geoUrl)]);
  const industries = { ...ind.dimension.ind_ava.category.label, ...ind.dimension.ind_use.category.label };
  const countries = { ...geo.dimension.c_orig.category.label, ...geo.dimension.c_dest.category.label };
  delete countries.DOM;
  return { industries, countries };
}

async function main() {
  const refresh = process.argv.includes('--refresh');
  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  if (refresh || !existsSync(CACHE_FILE)) await download(BULK_URL, CACHE_FILE);
  else console.log(`Using cached bulk file ${CACHE_FILE}`);

  const { industries, countries } = await fetchLabels();

  // ---- index maps ----------------------------------------------------------
  const avaIdx = new Map(IND_AVA.map((c, i) => [c, i]));
  const useIdx = new Map(IND_USE.map((c, i) => [c, i]));
  const originIdx = new Map(ORIGINS.map((c, i) => [c, i]));
  const ALL_COUNTRIES = [...EU27, ...EXTRA];
  const ctyIdx = new Map(ALL_COUNTRIES.map((c, i) => [c, i]));
  const nCty = ALL_COUNTRIES.length; // 50
  const nExtra = EXTRA.length; // 23

  // ---- accumulators --------------------------------------------------------
  // EU-27 IO matrix: [year][origin] -> Float64Array(70 × 69)
  const matrix = Object.fromEntries(
    YEARS.map((y) => [y, ORIGINS.map(() => new Float64Array(IND_AVA.length * IND_USE.length))]),
  );
  // country × country totals: [year] -> {int, fin} Float64Array(50 × 50)
  const cflow = Object.fromEntries(
    YEARS.map((y) => [y, { int: new Float64Array(nCty * nCty), fin: new Float64Array(nCty * nCty) }]),
  );
  // EU-27 exports by industry × extra-EU destination: [year] -> {int, fin} Float64Array(64 × 23)
  const euX = Object.fromEntries(
    YEARS.map((y) => [y, { int: new Float64Array(N_INDUSTRIES * nExtra), fin: new Float64Array(N_INDUSTRIES * nExtra) }]),
  );

  // ---- stream the 11M-row bulk file ----------------------------------------
  console.log('Aggregating the full inter-country matrix (~11 million rows) …');
  const rl = createInterface({ input: createReadStream(CACHE_FILE).pipe(createGunzip()), crlfDelay: Infinity });
  let n = 0;
  let header = true;
  for await (const line of rl) {
    if (header) { header = false; continue; }
    if (++n % 2_000_000 === 0) console.log(`  … ${n / 1e6}M rows`);

    // A,ind_use,ind_ava,c_dest,MIO_EUR,c_orig \t <2022> \t <2023>
    const t1 = line.indexOf('\t');
    const key = line.slice(0, t1);
    const [, indUse, indAva, cDest, , cOrig] = key.split(',');

    const ai = avaIdx.get(indAva);
    const ui = useIdx.get(indUse);
    if (ai === undefined || ui === undefined) continue;

    const t2 = line.indexOf('\t', t1 + 1);
    const raw22 = parseFloat(line.slice(t1 + 1, t2 === -1 ? undefined : t2));
    const raw23 = t2 === -1 ? NaN : parseFloat(line.slice(t2 + 1));
    // Keep negatives (taxes less subsidies, inventory changes can be < 0);
    // only missing (`:`) and exact zeros are skipped.
    const v22 = Number.isFinite(raw22) ? raw22 : 0;
    const v23 = Number.isFinite(raw23) ? raw23 : 0;
    if (v22 === 0 && v23 === 0) continue;

    const destEU = EU27_SET.has(cDest);
    const isVaRow = VA_ROWS.has(indAva);
    const originGroup = cOrig === 'DOM' || EU27_SET.has(cOrig) ? 'EU27' : cOrig;

    // (1) EU-27 economy matrix: everything the EU-27 uses (destination in EU)
    if (destEU) {
      const oi = originIdx.get(originGroup);
      if (oi !== undefined) {
        const cell = ai * IND_USE.length + ui;
        if (v22 !== 0) matrix['2022'][oi][cell] += v22;
        if (v23 !== 0) matrix['2023'][oi][cell] += v23;
      }
    }

    if (!isVaRow) {
      // (2) country × country totals (industries only)
      const oc = ctyIdx.get(cOrig);
      const dc = ctyIdx.get(cDest);
      if (oc !== undefined && dc !== undefined) {
        const cell = oc * nCty + dc;
        const bucket = FINAL_COLS.has(indUse) ? 'fin' : 'int';
        if (v22 !== 0) cflow['2022'][bucket][cell] += v22;
        if (v23 !== 0) cflow['2023'][bucket][cell] += v23;
      }
      // (3) EU-27 exports by industry × extra-EU destination
      if (!destEU && EU27_SET.has(cOrig) && ai < N_INDUSTRIES) {
        const di = EXTRA.indexOf(cDest);
        if (di !== -1) {
          const cell = ai * nExtra + di;
          const bucket = FINAL_COLS.has(indUse) ? 'fin' : 'int';
          if (v22 !== 0) euX['2022'][bucket][cell] += v22;
          if (v23 !== 0) euX['2023'][bucket][cell] += v23;
        }
      }
    }
  }
  console.log(`  done — ${n} rows read.`);

  // ---- write outputs -------------------------------------------------------
  const generated = new Date().toISOString().slice(0, 10);
  const toRows = (flat, nCols) => {
    const rows = [];
    for (let r = 0; r < flat.length / nCols; r++) {
      rows.push(Array.from(flat.subarray(r * nCols, (r + 1) * nCols), round1));
    }
    return rows;
  };

  const ioOut = {
    meta: {
      dataset: DATASET,
      title: 'EU inter-country input–output table at basic prices, industry by industry (FIGARO)',
      source: `https://ec.europa.eu/eurostat/databrowser/view/${DATASET}/default/table?lang=en`,
      unit: 'MIO_EUR (current prices)',
      years: YEARS,
      generated,
      note:
        'EU-27 treated as one economy: all EU-27 destination countries are summed. ' +
        'Origin EU27 covers intra-EU supply (incl. the value-added and adjustment rows, c_orig=DOM); ' +
        'each other origin is that partner’s exports into EU-27 use. ' +
        'Rows: 64 NACE A*64 industries + B2A3G, D1, D21X31, D29X39, OP_RES, OP_NRES. ' +
        'Columns: 64 industries + P3_S13, P3_S14, P3_S15, P51G, P5M. Values rounded to €0.1 million. ' +
        'Regenerate: node scripts/fetch-figaro-io-dataset.mjs',
    },
    industries,
    countries,
    indAva: IND_AVA,
    indUse: IND_USE,
    nIndustries: N_INDUSTRIES,
    origins: ORIGINS,
    matrix: Object.fromEntries(
      YEARS.map((y) => [y, Object.fromEntries(ORIGINS.map((o, i) => [o, toRows(matrix[y][i], IND_USE.length)]))]),
    ),
  };
  const ioPath = join(OUT_DIR, 'figaro-io-eu27.json');
  writeFileSync(ioPath, JSON.stringify(ioOut));
  console.log(`Wrote ${ioPath} (${(statSync(ioPath).size / 1e6).toFixed(1)} MB)`);

  const globalOut = {
    meta: {
      dataset: DATASET,
      source: `https://ec.europa.eu/eurostat/databrowser/view/${DATASET}/default/table?lang=en`,
      unit: 'MIO_EUR (current prices)',
      years: YEARS,
      generated,
      note:
        'countryFlows: full 50×50 country-by-country supply matrix, all 64 industries summed, ' +
        'split into deliveries to intermediate use (int) and to final demand (fin). ' +
        'euExportsByIndustry: EU-27 (as one economy) exports by supplying industry × extra-EU destination. ' +
        'Values rounded to €0.1 million.',
    },
    countries: ALL_COUNTRIES,
    countryNames: countries,
    euMembers: EU27,
    extra: EXTRA,
    industries: IND_AVA.slice(0, N_INDUSTRIES),
    countryFlows: Object.fromEntries(
      YEARS.map((y) => [y, { int: toRows(cflow[y].int, nCty), fin: toRows(cflow[y].fin, nCty) }]),
    ),
    euExportsByIndustry: Object.fromEntries(
      YEARS.map((y) => [y, { int: toRows(euX[y].int, nExtra), fin: toRows(euX[y].fin, nExtra) }]),
    ),
  };
  const globalPath = join(OUT_DIR, 'figaro-global-flows.json');
  writeFileSync(globalPath, JSON.stringify(globalOut));
  console.log(`Wrote ${globalPath} (${(statSync(globalPath).size / 1e6).toFixed(1)} MB)`);

  // ---- sanity checks -------------------------------------------------------
  const c2423 = ioOut.matrix['2023'].EU27[avaIdx.get('C24')][useIdx.get('C29')];
  console.log(`Check — intra-EU C24→C29 (2023): €${(c2423 / 1000).toFixed(1)} bn`);
  const cnTotal = ioOut.matrix['2023'].CN.reduce((s, r) => s + r.reduce((a, b) => a + b, 0), 0);
  console.log(`Check — total CN→EU27 supply (2023): €${(cnTotal / 1000).toFixed(1)} bn`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
