#!/usr/bin/env node
/**
 * Refresh the border-price anchors of the Climate Security Ledger (M · 45).
 * ---------------------------------------------------------------------------
 * The companion script `refresh-climate-security-eurostat.mjs` rebuilds the
 * volume side of the module from Eurostat. This one rebuilds the price side,
 * which is not a Eurostat product, from two open and citable series:
 *
 *   - World Bank Commodity Price Data ("the Pink Sheet"), annual and monthly
 *     nominal US-dollar averages for Crude oil (Brent), Natural gas (Europe)
 *     and steam coal (the Australian and South African markers);
 *   - ECB euro reference exchange rates, annual USD/EUR averages, for the
 *     conversion into the euro units the module stores.
 *
 * The original file carried prices recalled from memory and described as
 * "≈ €13–16/MWh"-style order-of-magnitude anchors. Every number this script
 * writes is instead a published annual average, and — this is the point of
 * the exercise — the `lo`/`hi` band around each one is now the range of the
 * MONTHLY averages inside that same year, so the band means something a
 * reader can check rather than expressing the compiler's confidence.
 *
 * Unit conventions, all applied here rather than anywhere downstream:
 *   - gas: $/mmBtu → $/MWh (× 3.412142) → €/MWh (÷ USD-per-EUR) → €m/bcm
 *     (× 10.55 TWh/bcm), so volume in bcm × price is € million;
 *   - oil: $/bbl → $/t (× 7.33 bbl/t, the conventional Brent-grade factor)
 *     → €/t, numerically identical to €m/Mt;
 *   - coal: $/t → €/t directly.
 *
 * Coal is the one place where a judgement is unavoidable and is therefore
 * made explicit: the module's earlier note cited API 2 (CIF ARA), which is
 * the right marker for north-west European delivery but is a proprietary
 * Argus/McCloskey index with no free authoritative annual average. Rather
 * than keep an unverifiable number, the value written here is the midpoint
 * of the two Pink Sheet steam-coal markers, with the markers themselves as
 * the lo/hi band. That is a real published range, and the source note says
 * plainly that it is a proxy for the ARA border price and that API 2 ran
 * above both markers in 2022.
 *
 * The three scenarios are all OBSERVED years, none is a forecast:
 *   avg2019     the last pre-crisis year;
 *   crisis2022  the full-year 2022 average, NOT the August peak;
 *   forward     the latest complete calendar year in the Pink Sheet. The key
 *               is kept as `forward` so model.ts and page.tsx do not have to
 *               change, but the label states the year — the earlier "forward
 *               curve" reading was never sourced and is gone.
 *
 * Usage:  node scripts/refresh-climate-security-prices.mjs [--dry-run]
 * Sources: https://www.worldbank.org/en/research/commodity-markets
 *          https://data-api.ecb.europa.eu/service/data/EXR/A.USD.EUR.SP00.A
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import ExcelJS from 'exceljs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_TS = join(ROOT, 'beta/modules/climate-security/data.generated.ts');
const SNAPSHOT_DIR = join(ROOT, 'public/data/climate-security');
const SNAPSHOT_JSON = join(SNAPSHOT_DIR, 'price-snapshot.json');
const DRY_RUN = process.argv.includes('--dry-run');

const PINK_BASE =
  'https://thedocs.worldbank.org/en/doc/18675f1d1639c7a34d463f59263ba0a2-0050012025/related/';
const PINK_ANNUAL = `${PINK_BASE}CMO-Historical-Data-Annual.xlsx`;
const PINK_MONTHLY = `${PINK_BASE}CMO-Historical-Data-Monthly.xlsx`;
const ECB_EXR =
  'https://data-api.ecb.europa.eu/service/data/EXR/A.USD.EUR.SP00.A?format=csvdata&startPeriod=2015';

const MMBTU_PER_MWH = 3.412142;
const TWH_PER_BCM = 10.55;
const BBL_PER_TONNE = 7.33;

const BASE_YEAR = 2019;
const CRISIS_YEAR = 2022;

async function download(url) {
  let last;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) throw new Error(`suspiciously small body (${buf.length} B) for ${url}`);
      return buf;
    } catch (err) {
      last = err;
      if (attempt < 4) await new Promise((r) => setTimeout(r, 2000 * 2 ** (attempt - 1)));
    }
  }
  throw last;
}

/**
 * Read one Pink Sheet worksheet into {period -> {series -> value}}. The header
 * row is located by looking for the Brent column rather than hard-coding a row
 * number, because the World Bank moves the banner rows between vintages.
 */
async function pinkSheet(buf, sheetName) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.getWorksheet(sheetName);
  if (!ws) throw new Error(`Pink Sheet worksheet "${sheetName}" not found`);
  let headerRow = 0;
  let cols = null;
  for (let r = 1; r <= 12 && !cols; r += 1) {
    // ExcelJS returns a SPARSE array whose holes survive `.map`; Array.from
    // materialises them so the header scan cannot read `undefined`.
    const values = Array.from(ws.getRow(r).values ?? [], (v) => (v == null ? '' : String(v).trim()));
    const find = (needle) => values.findIndex((v) => v.startsWith(needle));
    const brent = find('Crude oil, Brent');
    if (brent > 0) {
      headerRow = r;
      cols = {
        brent,
        gasEurope: find('Natural gas, Europe'),
        coalAustralian: find('Coal, Australian'),
        coalSouthAfrican: find('Coal, South African'),
      };
      for (const [k, v] of Object.entries(cols)) {
        if (!(v > 0)) throw new Error(`Pink Sheet column "${k}" not found in ${sheetName}`);
      }
    }
  }
  if (!cols) throw new Error(`Pink Sheet header row not found in ${sheetName}`);

  const out = new Map();
  for (let r = headerRow + 1; r <= ws.rowCount; r += 1) {
    const row = ws.getRow(r);
    const period = row.getCell(1).value;
    if (period == null) continue;
    const key = String(period).trim();
    if (!/^\d{4}(M\d{2})?$/.test(key)) continue;
    const rec = {};
    for (const [name, col] of Object.entries(cols)) {
      const v = row.getCell(col).value;
      if (typeof v === 'number' && Number.isFinite(v)) rec[name] = v;
    }
    if (Object.keys(rec).length) out.set(key, rec);
  }
  if (out.size === 0) throw new Error(`Pink Sheet ${sheetName} parsed to zero rows`);
  return out;
}

async function ecbAnnualUsdPerEur() {
  const csv = (await download(ECB_EXR)).toString('utf8').trim().split('\n');
  const head = csv[0].split(',');
  const iTime = head.indexOf('TIME_PERIOD');
  const iVal = head.indexOf('OBS_VALUE');
  if (iTime < 0 || iVal < 0) throw new Error('ECB CSV is missing TIME_PERIOD/OBS_VALUE');
  const out = new Map();
  for (const line of csv.slice(1)) {
    const parts = line.split(',');
    const v = Number(parts[iVal]);
    if (Number.isFinite(v)) out.set(parts[iTime], v);
  }
  if (out.size === 0) throw new Error('ECB returned no exchange-rate observations');
  return out;
}

const r0 = (x) => Math.round(x);
const r1 = (x) => Math.round(x * 10) / 10;

function lit(s) {
  if (s.includes("'") && !s.includes('"')) return `"${s.replace(/\\/g, '\\\\')}"`;
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

async function main() {
  process.stdout.write('Pulling World Bank Pink Sheet and ECB reference rates…\n');
  const [annualBuf, monthlyBuf, fx] = await Promise.all([
    download(PINK_ANNUAL), download(PINK_MONTHLY), ecbAnnualUsdPerEur(),
  ]);
  const annual = await pinkSheet(annualBuf, 'Annual Prices (Nominal)');
  const monthly = await pinkSheet(monthlyBuf, 'Monthly Prices');

  // Latest complete calendar year present in BOTH the annual sheet and the
  // exchange-rate series. Taking the annual sheet's last row on its own would
  // quietly pick up a partial year in a mid-year vintage.
  const completeYears = [...annual.keys()]
    .filter((k) => /^\d{4}$/.test(k) && fx.has(k) && annual.get(k).brent != null)
    .map(Number)
    .sort((a, b) => a - b);
  const RECENT_YEAR = completeYears.at(-1);
  for (const y of [BASE_YEAR, CRISIS_YEAR, RECENT_YEAR]) {
    if (!annual.has(String(y))) throw new Error(`Pink Sheet has no ${y} annual row`);
    if (!fx.has(String(y))) throw new Error(`ECB has no ${y} annual USD/EUR rate`);
  }

  /** Convert one year's dollar markers into the module's euro units. */
  const priced = (rec, year) => {
    const usdPerEur = fx.get(String(year));
    return {
      // €m per bcm
      gas: (rec.gasEurope * MMBTU_PER_MWH * TWH_PER_BCM) / usdPerEur,
      // €/t ≡ €m/Mt
      oil: (rec.brent * BBL_PER_TONNE) / usdPerEur,
      coalAu: rec.coalAustralian / usdPerEur,
      coalZa: rec.coalSouthAfrican / usdPerEur,
    };
  };

  /** Monthly averages inside `year`, priced the same way, for the lo/hi band. */
  const monthsOf = (year) =>
    [...monthly.entries()]
      .filter(([k]) => k.startsWith(`${year}M`))
      .map(([, rec]) => priced(rec, year));

  const scenario = (year) => {
    const yr = priced(annual.get(String(year)), year);
    const ms = monthsOf(year);
    if (ms.length !== 12) {
      throw new Error(`Pink Sheet monthly data for ${year} has ${ms.length} months, expected 12`);
    }
    const band = (pick) => {
      const xs = ms.map(pick).filter(Number.isFinite);
      return { lo: Math.min(...xs), hi: Math.max(...xs) };
    };
    const coalValue = (yr.coalAu + yr.coalZa) / 2;
    return {
      year,
      gas: { value: yr.gas, ...band((m) => m.gas) },
      oil: { value: yr.oil, ...band((m) => m.oil) },
      // The coal band is the spread between the two published markers, not a
      // monthly spread: the marker choice, not within-year timing, is the
      // live uncertainty about an ARA border price.
      coal: { value: coalValue, lo: Math.min(yr.coalAu, yr.coalZa), hi: Math.max(yr.coalAu, yr.coalZa) },
    };
  };

  const scenarios = {
    avg2019: scenario(BASE_YEAR),
    crisis2022: scenario(CRISIS_YEAR),
    forward: scenario(RECENT_YEAR),
  };

  const stamp = new Date().toISOString().slice(0, 10);
  const snapshot = {
    fetchedAt: stamp,
    sources: { pinkSheetAnnual: PINK_ANNUAL, pinkSheetMonthly: PINK_MONTHLY, ecb: ECB_EXR },
    usdPerEur: Object.fromEntries([BASE_YEAR, CRISIS_YEAR, RECENT_YEAR].map((y) => [y, fx.get(String(y))])),
    conversions: { mmbtuPerMwh: MMBTU_PER_MWH, twhPerBcm: TWH_PER_BCM, bblPerTonne: BBL_PER_TONNE },
    scenarios,
  };

  const round = (fuel, x) => (fuel === 'gas' ? r0(x) : r1(x));
  const entry = (fuel, key, note) => {
    const s = scenarios[key][fuel];
    return `    ${key}: {
      value: ${round(fuel, s.value)},
      lo: ${round(fuel, s.lo)},
      hi: ${round(fuel, s.hi)},
      source:
        ${lit(note(scenarios[key].year))},
    },`;
  };

  const gasNote = (y) =>
    `World Bank Commodity Price Data (Pink Sheet), "Natural gas, Europe" ${y} annual average ${annual.get(String(y)).gasEurope.toFixed(2)} $/mmBtu, converted at ${MMBTU_PER_MWH} mmBtu/MWh, ECB ${y} average ${fx.get(String(y)).toFixed(4)} USD/EUR and ${TWH_PER_BCM} TWh/bcm. The lo–hi band is the lowest and highest MONTHLY average inside ${y}, not an estimate of our uncertainty. Live pull ${stamp} via scripts/refresh-climate-security-prices.mjs.`;
  const oilNote = (y) =>
    `World Bank Pink Sheet, "Crude oil, Brent" ${y} annual average ${annual.get(String(y)).brent.toFixed(2)} $/bbl, converted at ${BBL_PER_TONNE} bbl/t and ECB ${y} average ${fx.get(String(y)).toFixed(4)} USD/EUR. The lo–hi band is the lowest and highest monthly average inside ${y}. Live pull ${stamp} via scripts/refresh-climate-security-prices.mjs.`;
  const coalNote = (y) =>
    `World Bank Pink Sheet steam-coal markers, ${y} annual averages ${annual.get(String(y)).coalAustralian.toFixed(2)} $/t (Australian) and ${annual.get(String(y)).coalSouthAfrican.toFixed(2)} $/t (South African), converted at ECB ${y} average ${fx.get(String(y)).toFixed(4)} USD/EUR; the value is the midpoint and the lo–hi band is the two markers. PROXY: the EU border marker is API 2 (CIF ARA), a proprietary Argus/McCloskey index with no free authoritative annual average — in 2022 it ran above both markers used here, so the crisis-year coal bill is if anything understated. Live pull ${stamp} via scripts/refresh-climate-security-prices.mjs.`;

  const block = `/* PRICES-BEGIN — generated by scripts/refresh-climate-security-prices.mjs on ${stamp}.
 * Do not hand-edit: change the script and re-run. All three scenarios are
 * OBSERVED annual averages, none is a forecast, and each lo–hi band is a
 * published range rather than a confidence interval of ours. */

/**
 * Border prices per fuel under the three switchable scenarios, in € million
 * per native volume unit (gas €m/bcm; oil and coal €/t ≡ €m/Mt).
 */
export const PRICES: Record<Fuel, Record<PriceScenario, SourcedRange>> = {
  gas: {
${entry('gas', 'avg2019', gasNote)}
${entry('gas', 'crisis2022', gasNote)}
${entry('gas', 'forward', gasNote)}
  },
  oil: {
${entry('oil', 'avg2019', oilNote)}
${entry('oil', 'crisis2022', oilNote)}
${entry('oil', 'forward', oilNote)}
  },
  coal: {
${entry('coal', 'avg2019', coalNote)}
${entry('coal', 'crisis2022', coalNote)}
${entry('coal', 'forward', coalNote)}
  },
};

export const PRICE_SCENARIO_META: Record<PriceScenario, { label: string; hint: string }> = {
  avg2019: { label: '${BASE_YEAR} average', hint: 'the last pre-crisis year — the conservative valuation' },
  crisis2022: { label: '${CRISIS_YEAR} crisis', hint: 'full-year ${CRISIS_YEAR} averages, not the August peak' },
  forward: { label: '${RECENT_YEAR} average', hint: 'the latest complete calendar year — an observed level, not a forward curve' },
};
/* PRICES-END */`;

  let src = readFileSync(DATA_TS, 'utf8');
  const start = src.indexOf('/* PRICES-BEGIN');
  const end = src.indexOf('/* PRICES-END */');
  if (start === -1 || end === -1) throw new Error(`PRICES markers not found in ${DATA_TS}`);
  src = src.slice(0, start) + block + src.slice(end + '/* PRICES-END */'.length);

  if (DRY_RUN) {
    process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n${block}\n--- dry run ---\n`);
    return;
  }
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  writeFileSync(SNAPSHOT_JSON, `${JSON.stringify(snapshot, null, 2)}\n`);
  writeFileSync(DATA_TS, src);
  process.stdout.write(`Wrote ${SNAPSHOT_JSON}\nWrote ${DATA_TS}\n`);
}

main().catch((err) => {
  process.stderr.write(`refresh-climate-security-prices failed: ${err.message}\n`);
  process.exit(1);
});
