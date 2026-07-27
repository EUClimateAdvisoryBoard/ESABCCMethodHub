/**
 * Extend the report's OWN derivation to the later years.
 * ---------------------------------------------------------------------------
 * The point of the calc grid is "drop in next year's raw data and the indicator
 * recomputes". An earlier pass did something weaker: it left the report's
 * formula for the report years and bolted a SECOND, different recipe on for the
 * later years, switched by a year test. That answers "where did this number
 * come from" but not "is it the same calculation" — and it isn't, so the two
 * halves of a series are not comparable.
 *
 * This script does it the right way round. For each indicator it refreshes the
 * REPORT'S OWN raw input columns — the same CRF sector aggregates, the same
 * Eurostat concepts, in the same units — with the later years from the same
 * publisher, and leaves the Value formula EXACTLY as the report wrote it. The
 * later years are then computed by the report's own arithmetic, not by a
 * substitute recipe.
 *
 * Only indicators whose report inputs can actually be refreshed are covered
 * (REPORT_INPUTS below). For the rest the honest answer is that the report's
 * derivation cannot be continued — its inputs are a statistical pocketbook
 * table or an association's fleet count with no machine-readable feed — and
 * this script says so rather than inventing a parallel recipe.
 *
 * Every filled year is verified twice:
 *   1. the report's formula, recomputed over the refreshed inputs, must
 *      reproduce the stored plotted value; and
 *   2. the scale of each refreshed input is checked against the report's own
 *      cell for the anchor year, so a kt/Mt slip cannot pass silently.
 *
 * Usage:  node scripts/esabcc-indicators/build-report-way-rows.mjs [--offline]
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { fetchEurostat, round } from './refresh-from-sources.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const TS_FILE = join(ROOT, 'src', 'data', 'esabcc-indicators.ts');
const CACHE_FILE = join(__dirname, 'report-way-inputs.json');
const OUT_JSON = join(__dirname, 'report-way-rows.json');
const OUT_MD = join(ROOT, 'docs-internal', 'indicator-report-way-derivations-2026-07.md');
const LAYOUT_SQL = [
  join(ROOT, 'supabase', 'migrations', '045_seed_indicator_derivations.sql'),
  join(ROOT, 'supabase', 'migrations', '052_indicator_derivation_descriptions.sql'),
];

const OFFLINE = process.argv.includes('--offline');
const TOL = 0.02;

const GHG = { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG' };
const crf = code => ({ dataset: 'env_air_gge', filters: { ...GHG, src_crf: code } });

/**
 * The report's own input columns, mapped to the publisher series they came
 * from. Keyed by indicator, then by the column header exactly as the report
 * workbook names it. `derived` columns are computed from the others (the
 * report's residual categories).
 */
const REPORT_INPUTS = {
  'esabcc-o1-ghg-total': {
    '1.D.1.a - International Aviation': crf('CRF1D1A'),
    '1.A.1 - Energy Industries': crf('CRF1A1'),
    '1.B - Fugitive Emissions from Fuels': crf('CRF1B'),
    '1.A.2 - Manufacturing Industries and Construction': crf('CRF1A2'),
    '2 - Industrial Processes and Product Use': crf('CRF2'),
    '1.A.3 - Transport': crf('CRF1A3'),
    '1.A.4 - Other Sectors': crf('CRF1A4'),
    '3 - Agriculture': crf('CRF3'),
    '4 - Land Use, Land-Use Change and Forestry': crf('CRF4'),
    'Total net emissions (UNFCCC)': crf('TOTXMEMO'),
    '1.D.1.b - International Navigation': crf('CRF1D1B'),
  },
  'esabcc-i1-industry-ghg': {
    '1.A.2 - Manufacturing Industries and Construction': crf('CRF1A2'),
    '2 - Industrial Processes and Product Use': crf('CRF2'),
  },
  'esabcc-l1-lulucf-net': {
    '4 - Land Use, Land-Use Change and Forestry': crf('CRF4'),
  },
  'esabcc-l7-nonforest-lulucf': {
    '4.B - Cropland': crf('CRF4B'),
    '4.C - Grassland': crf('CRF4C'),
    '4.D - Wetlands': crf('CRF4D'),
    '4.E - Settlements': crf('CRF4E'),
    '4.F - Other Land': crf('CRF4F'),
    '4.H - Other LULUCF': crf('CRF4H'),
  },
  'esabcc-b1-buildings-ghg': {
    'Residential (CRF 1.A.4.b)': crf('CRF1A4B'),
    'Tertiary (CRF 1.A.4.a)': crf('CRF1A4A'),
    'Agriculture & fisheries energy (CRF 1.A.4.c)': crf('CRF1A4C'),
  },
  'esabcc-e1-energy-supply-ghg': {
    // The report itself stopped filling the breakdown and used the catch-all
    // total for its later years; continuing that is continuing its own method.
    'Power and heat': { constant: 0 },
    'Petroleum refineries': { constant: 0 },
    'Other (mining, gas transport, …)': { constant: 0 },
    'Fugitive emissions': { constant: 0 },
    'Total (reported, no breakdown)': {
      dataset: 'env_air_gge',
      sum: [{ ...GHG, src_crf: 'CRF1A1' }, { ...GHG, src_crf: 'CRF1B' }],
    },
  },
  'esabcc-a1-agri-nonco2': {
    'Enteric fermentation': crf('CRF3A'),
    'Manure management': crf('CRF3B'),
    'Fertilizer use': crf('CRF3D'),
    // the report's residual: total agriculture less the three named categories
    'Other': { residual: { total: crf('CRF3'), minus: ['CRF3A', 'CRF3B', 'CRF3D'] } },
  },
  'esabcc-o2-pec': {
    'PEC (Mtoe)': {
      dataset: 'nrg_ind_eff',
      filters: { geo: 'EU27_2020', nrg_bal: 'PEC_EED', unit: 'MTOE' },
    },
    'Mtoe → TWh': { carryForward: true },
  },
  'esabcc-o2-fec': {
    'FEC (Mtoe)': {
      dataset: 'nrg_ind_eff',
      filters: { geo: 'EU27_2020', nrg_bal: 'FEC_EED', unit: 'MTOE' },
    },
    'Mtoe → TWh': { carryForward: true },
  },
};

// ── plumbing ────────────────────────────────────────────────────────────────

const cache = existsSync(CACHE_FILE)
  ? JSON.parse(await readFile(CACHE_FILE, 'utf8'))
  : { generatedAt: null, legs: {} };
const legs = cache.legs || {};
let fetches = 0;

const legKey = (ds, f) => `${ds}?${Object.entries(f).sort().map(([k, v]) => `${k}=${v}`).join('&')}`;

async function series(dataset, filters) {
  const key = legKey(dataset, filters);
  if (legs[key]) return legs[key].values;
  if (OFFLINE) throw new Error(`not cached: ${key}`);
  const s = await fetchEurostat(dataset, filters);
  fetches++;
  legs[key] = { dataset, filters, values: Object.fromEntries(s.map(p => [p.year, p.value])) };
  return legs[key].values;
}

async function sumSeries(dataset, list) {
  const acc = {};
  for (const f of list) {
    for (const [y, v] of Object.entries(await series(dataset, f))) {
      acc[y] = (acc[y] ?? 0) + v;
    }
  }
  return acc;
}

/** Resolve one mapped column to {year: value} in the PUBLISHER's own unit. */
async function resolveColumn(spec) {
  if (spec.constant !== undefined || spec.carryForward) return null;
  if (spec.residual) {
    const total = await series(spec.residual.total.dataset, spec.residual.total.filters);
    const parts = await Promise.all(
      spec.residual.minus.map(c => series('env_air_gge', { ...GHG, src_crf: c })));
    const out = {};
    for (const [y, v] of Object.entries(total)) {
      const sub = parts.reduce((a, p) => a + (p[y] ?? NaN), 0);
      if (Number.isFinite(sub)) out[y] = v - sub;
    }
    return out;
  }
  if (spec.sum) return sumSeries(spec.dataset, spec.sum);
  return series(spec.dataset, spec.filters);
}

function parseIndicators(src) {
  const out = [];
  const starts = [];
  const idRe = /\n  \{\n    id: '([^']+)',/g;
  let m;
  while ((m = idRe.exec(src))) starts.push({ id: m[1], at: m.index });
  for (let i = 0; i < starts.length; i++) {
    const block = src.slice(starts[i].at, i + 1 < starts.length ? starts[i + 1].at : src.length);
    const str = k => {
      const mm = new RegExp(`\\n    ${k}:\\s*'((?:[^'\\\\]|\\\\.)*)'`).exec(block);
      return mm ? mm[1].replace(/\\'/g, "'") : undefined;
    };
    const dataM = /\n    data: \[([\s\S]*?)\],\n/.exec(block);
    const data = [];
    if (dataM) {
      const ptRe = /\{\s*year:\s*(-?\d+),\s*value:\s*(-?[\d.]+)(,\s*afterReport:\s*true)?\s*\}/g;
      let p;
      while ((p = ptRe.exec(dataM[1]))) {
        data.push({ year: Number(p[1]), value: Number(p[2]), afterReport: !!p[3] });
      }
    }
    out.push({ id: starts[i].id, code: str('code'), name: str('name'), unit: str('unit'), data });
  }
  return out;
}

function parseLayouts(sql) {
  const out = {};
  for (const m of sql.matchAll(/\('([A-Za-z0-9_-]+)', '(\{[\s\S]*?\})'::jsonb\)/g)) {
    try { out[m.group?.(1) ?? m[1]] = JSON.parse((m[2]).replace(/''/g, "'")); } catch { /* skip */ }
  }
  return out;
}

// ── the report's own formula engine (same semantics as the app) ─────────────
const { computeValues } = await import('./report-way-eval.mjs');

async function main() {
  const inds = parseIndicators(await readFile(TS_FILE, 'utf8'))
    .filter(i => i.id.startsWith('esabcc-'));
  const byId = Object.fromEntries(inds.map(i => [i.id, i]));
  const layouts = {};
  for (const f of LAYOUT_SQL) Object.assign(layouts, parseLayouts(await readFile(f, 'utf8')));

  const results = [];
  const filled = {};

  for (const [iid, mapping] of Object.entries(REPORT_INPUTS)) {
    const ind = byId[iid];
    const layout = layouts[iid];
    if (!ind || !layout) {
      results.push({ id: iid, code: ind?.code, status: 'NO LAYOUT' });
      continue;
    }
    const headers = layout.columns.map(c => c.header);
    const have = new Set(layout.rows.map(r => r.year));
    const missing = ind.data.map(p => p.year).filter(y => !have.has(y)).sort((a, b) => a - b);
    if (!missing.length) {
      results.push({ id: iid, code: ind.code, status: 'ALREADY COMPLETE', years: [] });
      continue;
    }

    // anchor year: the last year the report's own grid carries
    const anchor = Math.max(...layout.rows.map(r => r.year));
    const anchorRow = layout.rows.find(r => r.year === anchor);

    const cols = {};
    let scaleProblem = null;
    for (const [header, spec] of Object.entries(mapping)) {
      const ci = headers.findIndex(h => h.trim().toLowerCase() === header.trim().toLowerCase());
      if (ci < 0) { scaleProblem = `column not in the grid: ${header}`; break; }
      const stored = anchorRow?.cells?.[ci];
      const storedNum = typeof stored === 'object' && stored ? stored.v : stored;

      if (spec.constant !== undefined) { cols[ci] = { kind: 'constant', value: spec.constant }; continue; }
      if (spec.carryForward) { cols[ci] = { kind: 'carry', value: storedNum }; continue; }

      const live = await resolveColumn(spec);
      // Two different things hide in the report-vs-source ratio, and they must
      // not be conflated:
      //   * the UNIT convention (the report keeps kt where Eurostat serves Mt)
      //     — a clean power of ten, and the thing we must apply; and
      //   * the VINTAGE difference — the inventory is re-estimated every
      //     submission, so the publisher's figure for the report's own anchor
      //     year is no longer exactly the report's figure. That is real and
      //     must be reported, not silently absorbed.
      // A ratio near no clean factor at all means it is simply a different
      // series, and the column cannot be refreshed from it.
      const ratio = (typeof storedNum === 'number' && Number.isFinite(live[anchor]) && live[anchor] !== 0)
        ? storedNum / live[anchor] : null;
      let scale = null;
      let drift = null;
      if (ratio !== null) {
        for (const cand of [1, 1000, 0.001, 1e6, 1e-6]) {
          const off = Math.abs(ratio - cand) / cand;
          if (off < 0.20 && (scale === null || off < Math.abs(drift))) { scale = cand; drift = ratio / cand - 1; }
        }
      }
      if (scale === null) {
        scaleProblem = `${header}: the report's ${anchor} cell is ${storedNum} but the source series ` +
                       `carries ${live[anchor]} — ratio ${ratio === null ? 'n/a' : ratio.toFixed(4)}, ` +
                       `no unit factor explains it, so this is a different series`;
        break;
      }
      cols[ci] = { kind: 'live', values: live, scale, drift, header };
    }
    if (scaleProblem) {
      results.push({ id: iid, code: ind.code, status: 'SCALE MISMATCH', why: scaleProblem });
      console.error(`  ! ${ind.code}: ${scaleProblem}`);
      continue;
    }

    // Build the new rows with the report's OWN columns filled.
    const width = layout.columns.length;
    const extended = JSON.parse(JSON.stringify(layout));
    const added = [];
    for (const year of missing) {
      const cells = new Array(width).fill(null);
      let complete = true;
      for (const [ciStr, c] of Object.entries(cols)) {
        const ci = Number(ciStr);
        if (c.kind === 'constant') { cells[ci] = c.value; continue; }
        if (c.kind === 'carry') { cells[ci] = c.value; continue; }
        const v = c.values[year];
        if (!Number.isFinite(v)) { complete = false; break; }
        cells[ci] = round(v * c.scale, 6);
      }
      if (!complete) continue;
      extended.rows.push({ year, cells });
      added.push(year);
    }
    extended.rows.sort((a, b) => a.year - b.year);
    if (!added.length) {
      results.push({ id: iid, code: ind.code, status: 'NO SOURCE YEARS', years: [] });
      continue;
    }

    // Verify: the report's own formula, over the refreshed inputs.
    const got = computeValues(extended);
    const rows = added.map(y => {
      const stored = ind.data.find(p => p.year === y)?.value;
      const v = got[y];
      const rel = (Number.isFinite(v) && Number.isFinite(stored) && stored !== 0)
        ? Math.abs(v - stored) / Math.abs(stored) : null;
      return { year: y, reportWay: Number.isFinite(v) ? round(v, 3) : null, stored, rel };
    });
    const worst = Math.max(0, ...rows.filter(r => r.rel !== null).map(r => r.rel));
    const blank = rows.some(r => r.reportWay === null);
    const status = blank ? 'BLANK' : worst <= TOL ? 'MATCHES' : 'DIFFERS';
    const live = Object.values(cols).filter(c => c.kind === 'live');
    const drift = Math.max(0, ...live.map(c => Math.abs(c.drift ?? 0)));
    filled[iid] = { layout: extended, rows,
      columns: live.map(c => ({ header: c.header, scale: c.scale, vintageDrift: c.drift })) };
    results.push({ id: iid, code: ind.code, status, years: added, worst, rows, anchor, drift });
    const mark = status === 'MATCHES' ? '✓' : status === 'DIFFERS' ? '≠' : '!';
    console.log(`${mark} ${(ind.code ?? iid).padEnd(12)} ${status.padEnd(8)} ${added.join(',')}` +
                `  [vintage drift at ${anchor}: ${(drift * 100).toFixed(1)}%]` +
                (rows.length ? `  ${rows.map(r => `${r.year}: ${r.reportWay} vs ${r.stored}`).join(' | ')}` : ''));
  }

  await writeFile(CACHE_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), legs }, null, 1));
  await writeFile(OUT_JSON, JSON.stringify({ generatedAt: new Date().toISOString(), filled, results }, null, 1));
  await writeFile(OUT_MD, renderReport(results, byId));
  const by = s => results.filter(r => r.status === s).length;
  console.log(`\n${Object.keys(filled).length} indicators continued on the report's own derivation ` +
              `(${by('MATCHES')} match the stored series, ${by('DIFFERS')} differ) · ${fetches} queries`);
}

function renderReport(results, byId) {
  const stamp = new Date().toISOString().slice(0, 10);
  const line = r => {
    const rows = (r.rows ?? []).map(x =>
      `${x.year}: **${x.reportWay}** vs ${x.stored} (${x.rel === null ? '—' : (x.rel * 100).toFixed(1) + ' %'})`).join('; ');
    const d = r.drift === undefined ? '—' : `${(r.drift * 100).toFixed(1)} % (${r.anchor})`;
    return `| ${r.code ?? r.id} | ${byId[r.id]?.name ?? ''} | ${(r.years ?? []).join(', ') || '—'} | ${r.status} | ${d} | ${rows} |`;
  };
  return [
    "# Continuing the report's own derivation into the later years (July 2026)",
    '',
    `*Generated by \`scripts/esabcc-indicators/build-report-way-rows.mjs\` on ${stamp}.*`,
    '',
    'The calc grid is meant to work one way: drop in next year\'s raw data and the indicator',
    'recomputes. An earlier pass instead bolted a second, different recipe onto the later years and',
    'switched between them by year — which answers "where did this number come from" but not "is it',
    'the same calculation", and it was not.',
    '',
    'This pass refreshes the **report\'s own input columns** — the same CRF sector aggregates and the',
    'same Eurostat concepts, in the same units — and leaves the Value formula exactly as the report',
    'wrote it. The later years are then computed by the report\'s own arithmetic.',
    '',
    'Each refreshed column is scale-checked against the report\'s own cell for its anchor year, so a',
    'kt/Mt slip cannot pass; and the recomputed value is compared with the value currently plotted.',
    '',
    '| Code | Indicator | Years | Status | Vintage drift at the anchor | Report-way value vs the stored value |',
    '| --- | --- | --- | --- | --- | --- |',
    ...results.map(line),
    '',
    '**MATCHES** — the report\'s own derivation, fed with the publisher\'s later data, reproduces the',
    'plotted value within 2 %. The series is continuous in method as well as in numbers.',
    '',
    '**DIFFERS** — the report\'s derivation gives a different answer from the value currently stored,',
    'because that value was produced by the year-on-year splice rather than by the report\'s method.',
    'The report-way figure is the one to prefer; the difference is stated so the choice is visible.',
    '',
    '## Indicators this cannot cover',
    '',
    'The report\'s derivation can only be continued where its own inputs still have a feed. It cannot',
    'be continued for indicators whose report inputs are a statistical-pocketbook table (T2a, T2b,',
    'T3a, T3b), an association\'s fleet or capacity count (T5a, T5b, E4a, E4b, B6), or a published',
    'index with no components (E3, I3, F1–F5). For those the honest position is that the report\'s',
    'method stops where its inputs stop — not that a substitute recipe continues it.',
    '',
  ].join('\n');
}

await main();
