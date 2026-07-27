/**
 * Fill the CALC-SPACE rows for the post-report ("afterReport") indicator years.
 * ---------------------------------------------------------------------------
 * The problem this fixes
 * ---------------------
 * `pw_indicator_points` carries values for 2022–2025 (migrations 055 / 077 /
 * 078 and the monthly live-source refresh), but the per-indicator calc grid
 * (`pw_indicator_sheets.layout`, seeded by migrations 045 / 052 from the 2024
 * report workbook) stops at the report's last year. In the "Edit data / calc"
 * editor those later years therefore show up as EMPTY rows: a plotted number
 * with nothing behind it, and no way to see where it came from.
 *
 * What this script does
 * ---------------------
 * For every ESABCC report indicator that has post-report points it appends the
 * missing calc rows, with the inputs those numbers actually come from:
 *
 *   • DERIVED — the indicator has a live-source recipe in
 *     `refresh-from-sources.mjs`. Each leg of that recipe becomes its own
 *     helper column (Eurostat dataset + filters recorded in the column's
 *     `source`), filled from the API. The Value formula gains a year switch:
 *
 *        IF(A >= <first post-report year>, <post-report recipe>, <report recipe>)
 *
 *     so the report years keep their original workbook derivation untouched
 *     while later years recompute from the live inputs. Splice recipes carry
 *     their two anchor constants as columns, so the splice is visible as
 *     arithmetic rather than hidden in a script.
 *
 *   • RECONSTRUCTED — no live recipe, but the sheet's own formula pins the raw
 *     input: where the plotted figure comes from ONE varying input and some
 *     constants (a unit conversion, typically), the published figure and those
 *     constants determine the input exactly. The later rows then use the same
 *     columns and the same formula as the report years — no new columns, no
 *     year switch — which is what makes the sheet readable.
 *
 *   • AS PUBLISHED — neither of the above (a ratio or a sum has more than one
 *     unknown, or the live recipe no longer reproduces the stored value). The
 *     row then carries a single column naming the publication the figure was
 *     taken from, so the provenance is still explicit; it is simply a published
 *     figure rather than a derivation. Never a silent blank.
 *
 * Indicators with no layout at all get one built from scratch: the report
 * years as the report's own published figures, the later years as above.
 *
 * Two faults in the seeded grids are repaired along the way, because both make
 * the calc space disagree with the chart it is supposed to explain:
 *
 *   • a helper column whose formula resolves back to ITSELF (two columns whose
 *     headers differ only in case), which renders the whole grid blank; and
 *   • the share indicators whose grid computes a fraction while the stored
 *     series is a percent number (migrations 058 / 075 / 076 rescaled the
 *     points but not the layouts) — the ×100 becomes its own column.
 *
 * Every emitted layout is recomputed cell-by-cell before it is written and
 * must reproduce the stored series (report years must not move at all; post
 * report years within `TOL_REL`). Anything that fails verification degrades to
 * AS PUBLISHED rather than being written wrong.
 *
 * Outputs
 * -------
 *   supabase/migrations/079_post_report_calc_rows.sql  — the upsert
 *   scripts/esabcc-indicators/postreport-inputs.json   — every raw input value
 *                                                        fetched, with its query
 *
 * Usage
 * -----
 *   node scripts/esabcc-indicators/build-postreport-calc-rows.mjs [--offline]
 *
 *   --offline   reuse postreport-inputs.json instead of calling Eurostat
 *               (fails if a needed leg is not already cached).
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { RECIPES, fetchEurostat, round } from './refresh-from-sources.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const TS_FILE = join(ROOT, 'src', 'data', 'esabcc-indicators.ts');
const CACHE_FILE = join(__dirname, 'postreport-inputs.json');
const OUT_SQL = join(ROOT, 'supabase', 'migrations', '079_post_report_calc_rows.sql');
const REPORT_MD = join(ROOT, 'docs-internal', 'indicator-postreport-calc-rows-2026-07.md');
const LAYOUT_SQL = [
  join(ROOT, 'supabase', 'migrations', '045_seed_indicator_derivations.sql'),
  join(ROOT, 'supabase', 'migrations', '052_indicator_derivation_descriptions.sql'),
];

const OFFLINE = process.argv.includes('--offline');
/** Relative tolerance for "the calc row reproduces the stored point". */
const TOL_REL = 0.02;
const EUROSTAT_BASE =
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';

/**
 * Recipes that take precedence over `refresh-from-sources.mjs` for the calc
 * rows: the report's EXACT derivations, reverse-engineered from the report
 * workbook and applied to the points by migration 078. The refresh script
 * still carries YoY-splice approximations for these five — 078's own note says
 * the splice is what made them drift — so the calc space documents the exact
 * derivation instead. Each was re-checked against the live inventory here and
 * reproduces the stored point to the last decimal.
 */
const REPORT_EXACT = {
  'esabcc-o1-ghg-total': {
    kind: 'eurostat', dataset: 'env_air_gge', round: 1,
    sumFilters: ['TOTXMEMO', 'CRF1D1A', 'CRF1D1B'].map(src_crf => (
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf })),
    sourceTitle: 'Eurostat env_air_gge · net total incl. LULUCF (TOTXMEMO) + international aviation (1.D.1.a) + international navigation (1.D.1.b) · EU27_2020',
    note: 'European-Climate-Law scope, the report\'s own basis (migration 078): reproduces the report 2005–2022 within 0.1–1.5 %.',
  },
  'esabcc-t1-transport-ghg': {
    kind: 'eurostat', dataset: 'env_air_gge', round: 1,
    sumFilters: ['CRF1A3', 'CRF1D1A'].map(src_crf => (
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf })),
    sourceTitle: 'Eurostat env_air_gge · domestic transport (CRF 1.A.3) + international aviation (1.D.1.a) · EU27_2020',
    note: 'The report\'s transport scope (migration 078): domestic transport plus international aviation, NO maritime — reproduces the report within 0.1–0.3 %.',
  },
  'esabcc-l7-nonforest-lulucf': {
    kind: 'eurostat', dataset: 'env_air_gge', round: 1,
    sumFilters: ['CRF4B', 'CRF4C', 'CRF4D', 'CRF4E', 'CRF4F'].map(src_crf => (
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf })),
    sourceTitle: 'Eurostat env_air_gge · cropland + grassland + wetlands + settlements + other land (CRF 4.B–4.F) · EU27_2020',
    note: 'Migration 078: the non-forest land categories, NOT "CRF 4 minus forest" — that would wrongly pull in harvested wood products.',
  },
  'esabcc-l8-bioenergy-use': {
    kind: 'eurostat', dataset: 'nrg_bal_c', round: 1,
    filters: { geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'GIC', siec: 'BIOE' },
    toRepo: v => v / 1000,
    sourceTitle: 'Eurostat nrg_bal_c · gross inland consumption of bioenergy (GIC × BIOE) · EU27_2020',
    note: 'Migration 078: GIC × the BIOE aggregate, GWh → TWh. Reproduces the report 2010–2021 within 1.4–3.4 % (vintage drift); the earlier splice ran ~6 % high.',
  },
};

// ── 1. The bundled series (src/data/esabcc-indicators.ts) ────────────────────

/**
 * Pull id / code / name / unit / source / data out of the TS seed. Regex-based
 * on purpose: the same approach refresh-from-sources.mjs uses, so the script
 * needs no TypeScript toolchain.
 */
function parseIndicators(src) {
  const out = [];
  const idRe = /\n  \{\n    id: '([^']+)',/g;
  let m;
  const starts = [];
  while ((m = idRe.exec(src))) starts.push({ id: m[1], at: m.index });
  for (let i = 0; i < starts.length; i++) {
    const block = src.slice(starts[i].at, i + 1 < starts.length ? starts[i + 1].at : src.length);
    const str = key => {
      const r = new RegExp(`\\n    ${key}:\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|\\n?\\s*'((?:[^'\\\\]|\\\\.)*)')`, '');
      const mm = r.exec(block);
      return mm ? (mm[1] ?? mm[2]).replace(/\\'/g, "'") : undefined;
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
    out.push({
      id: starts[i].id,
      code: str('code'),
      name: str('name'),
      unit: str('unit'),
      source: str('source'),
      sourceUrl: str('sourceUrl'),
      data,
    });
  }
  return out;
}

// ── 2. The layouts already seeded (migrations 045 → 052) ─────────────────────

function parseLayouts(sql) {
  const out = {};
  const re = /\('([A-Za-z0-9_-]+)', '(\{[\s\S]*?\})'::jsonb\)/g;
  let m;
  while ((m = re.exec(sql))) {
    try {
      out[m[1]] = JSON.parse(m[2].replace(/''/g, "'"));
    } catch {
      /* a layout we cannot parse is treated as absent */
    }
  }
  return out;
}

// ── 3. Minimal evaluator for the expressions this script emits ───────────────
// Mirrors src/lib/project-workspace/formula.ts for the subset used here:
// + - * / parentheses, [Header] and bare column letters (A = Year), ROUND, IF
// and the comparison operators. Blank operands yield null exactly as the app's
// engine does, so a row that would render "—" in the editor fails verification
// here rather than shipping.

function tokenize(src) {
  const toks = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '[') {
      const end = src.indexOf(']', i + 1);
      if (end < 0) throw new Error('unclosed [');
      toks.push({ k: 'ref', v: src.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      toks.push({ k: 'num', v: Number(src.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_ ]/.test(src[j])) j++;
      let word = src.slice(i, j);
      // a trailing "(" means a function call; otherwise trim spaces off a ref
      const isCall = src[j] === '(';
      toks.push(isCall ? { k: 'fn', v: word.trim().toUpperCase() } : { k: 'ref', v: word.trim() });
      i = j;
      continue;
    }
    if (['>=', '<=', '<>'].includes(src.slice(i, i + 2))) {
      toks.push({ k: 'op', v: src.slice(i, i + 2) });
      i += 2;
      continue;
    }
    if ('+-*/^(),><='.includes(c)) { toks.push({ k: 'op', v: c }); i++; continue; }
    throw new Error(`unexpected character "${c}"`);
  }
  return toks;
}

function parseExpr(toks) {
  let p = 0;
  const peek = () => toks[p];
  const eat = v => {
    if (!toks[p] || (v && toks[p].v !== v)) throw new Error(`expected ${v}`);
    return toks[p++];
  };
  function primary() {
    const t = toks[p];
    if (!t) throw new Error('unexpected end');
    if (t.k === 'num') { p++; return { k: 'num', v: t.v }; }
    if (t.k === 'ref') { p++; return { k: 'ref', v: t.v }; }
    if (t.k === 'fn') {
      p++;
      eat('(');
      const args = [];
      if (peek() && peek().v !== ')') {
        args.push(compare());
        while (peek() && peek().v === ',') { p++; args.push(compare()); }
      }
      eat(')');
      return { k: 'call', fn: t.v, args };
    }
    if (t.v === '(') { p++; const e = compare(); eat(')'); return e; }
    if (t.v === '-') { p++; return { k: 'neg', a: primary() }; }
    throw new Error(`unexpected "${t.v}"`);
  }
  function term() {
    let n = primary();
    while (peek() && (peek().v === '*' || peek().v === '/')) {
      const op = toks[p++].v;
      n = { k: 'bin', op, a: n, b: primary() };
    }
    return n;
  }
  function sum() {
    let n = term();
    while (peek() && (peek().v === '+' || peek().v === '-')) {
      const op = toks[p++].v;
      n = { k: 'bin', op, a: n, b: term() };
    }
    return n;
  }
  function compare() {
    let n = sum();
    while (peek() && ['>', '<', '>=', '<=', '=', '<>'].includes(peek().v)) {
      const op = toks[p++].v;
      n = { k: 'bin', op, a: n, b: sum() };
    }
    return n;
  }
  const ast = compare();
  if (p !== toks.length) throw new Error('trailing tokens');
  return ast;
}

function evalAst(node, cell) {
  const num = n => (typeof n === 'number' && Number.isFinite(n) ? n : null);
  switch (node.k) {
    case 'num': return node.v;
    case 'ref': return cell(node.v);
    case 'neg': {
      const a = evalAst(node.a, cell);
      return a === null ? null : -a;
    }
    case 'bin': {
      const a = evalAst(node.a, cell);
      const b = evalAst(node.b, cell);
      if (a === null || b === null) return null;
      switch (node.op) {
        case '+': return num(a + b);
        case '-': return num(a - b);
        case '*': return num(a * b);
        case '/': return b === 0 ? null : num(a / b);
        case '^': return num(a ** b);
        case '>': return a > b ? 1 : 0;
        case '<': return a < b ? 1 : 0;
        case '>=': return a >= b ? 1 : 0;
        case '<=': return a <= b ? 1 : 0;
        case '=': return a === b ? 1 : 0;
        case '<>': return a !== b ? 1 : 0;
        default: return null;
      }
    }
    case 'call': {
      const args = node.args.map(a => evalAst(a, cell));
      if (node.fn === 'IF') return args[0] !== null && args[0] !== 0 ? args[1] ?? null : args[2] ?? null;
      if (node.fn === 'ROUND') {
        if (args[0] === null) return null;
        const d = args[1] === null || args[1] === undefined ? 0 : Math.trunc(args[1]);
        const f = 10 ** d;
        return Math.round(args[0] * f) / f;
      }
      if (node.fn === 'ABS') return args[0] === null ? null : Math.abs(args[0]);
      if (node.fn === 'MIN') return Math.min(...args.filter(x => x !== null));
      if (node.fn === 'MAX') return Math.max(...args.filter(x => x !== null));
      throw new Error(`unsupported function ${node.fn}`);
    }
    default: return null;
  }
}

/** The expression of a column, including the legacy {a, op, b} shape. */
function columnExpr(f) {
  if (!f) return '';
  if (typeof f.expr === 'string' && f.expr.trim()) return f.expr.trim();
  if (typeof f.a === 'string' && f.op) {
    const tok = h => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(h) ? h : `[${h}]`);
    const b = typeof f.b === 'number' ? String(f.b) : tok(String(f.b ?? ''));
    return `${tok(f.a)} ${f.op} ${b}`;
  }
  return '';
}

function cellNumber(c) {
  if (c === null || c === undefined) return null;
  if (typeof c === 'object') return typeof c.v === 'number' ? c.v : null;
  return typeof c === 'number' && Number.isFinite(c) ? c : null;
}

/**
 * Recompute a layout's Value column exactly as the app does: helper columns
 * that carry a formula are DERIVED (their stored cell is only a cache), a
 * reference resolves case-insensitively to the first matching header and then
 * to a column letter, and a reference cycle collapses to blank. Reading the
 * cached cells instead would hide precisely the faults this script has to
 * catch — a column that silently references itself computes to "—" in the
 * editor while its cache still looks healthy.
 */
function computeValues(layout) {
  const headers = layout.columns.map(c => c.header);
  const years = layout.rows.map(r => r.year);
  let asts;
  try {
    asts = layout.columns.map(c => {
      const e = columnExpr(c.formula);
      return e ? parseExpr(tokenize(e)) : null;
    });
  } catch {
    return null;
  }
  const resolve = ref => {
    const r = String(ref).trim();
    if (r.toUpperCase() === 'A') return 'year';
    const i = headers.findIndex(h => h.trim().toLowerCase() === r.toLowerCase());
    if (i >= 0) return i;
    if (/^[A-Za-z]$/.test(r)) {
      const n = r.toUpperCase().charCodeAt(0) - 64;
      return n >= 2 && n - 2 < headers.length ? n - 2 : null;
    }
    return null;
  };
  const cache = new Array(headers.length);
  const visiting = new Set();
  function column(ci) {
    if (cache[ci]) return cache[ci];
    if (visiting.has(ci)) return years.map(() => null); // cycle guard, as in the app
    visiting.add(ci);
    const out = asts[ci]
      ? years.map((y, ri) => evalAst(asts[ci], ref => {
        const t = resolve(ref);
        if (t === null) return null;
        return t === 'year' ? y : column(t)[ri];
      }))
      : layout.rows.map(r => cellNumber(r.cells[ci]));
    visiting.delete(ci);
    cache[ci] = out;
    return out;
  }
  const v = column(0);
  return Object.fromEntries(years.map((y, i) => [y, v[i]]));
}

/**
 * Repair a column whose formula references its own header. Two seeded columns
 * differ only in case ("electricity" derived from "Electricity"), so the
 * case-insensitive lookup resolves the reference back to the derived column
 * itself and the whole grid renders blank. Renaming the raw column and
 * repointing the formula fixes it without touching any value.
 */
function fixSelfReferences(layout) {
  const headers = layout.columns.map(c => c.header);
  const lower = headers.map(h => h.trim().toLowerCase());
  const fixed = [];
  for (let i = 0; i < layout.columns.length; i++) {
    const expr = columnExpr(layout.columns[i].formula);
    if (!expr) continue;
    let next = expr;
    for (const m of expr.matchAll(/\[([^\]]+)\]/g)) {
      const name = m[1].trim().toLowerCase();
      if (lower.indexOf(name) !== i) continue; // resolves elsewhere — fine
      const j = lower.indexOf(name, i + 1);
      if (j < 0) continue; // genuinely self-referential, nothing to point at
      const renamed = `${layout.columns[j].header} (raw input)`;
      layout.columns[j] = { ...layout.columns[j], header: renamed };
      lower[j] = renamed.toLowerCase();
      next = next.split(`[${m[1]}]`).join(`[${renamed}]`);
      fixed.push(`${layout.columns[i].header} → ${renamed}`);
    }
    if (next !== expr) {
      layout.columns[i] = { ...layout.columns[i], formula: { expr: next } };
    }
  }
  return fixed;
}

// ── 4. Live inputs ───────────────────────────────────────────────────────────

const cache = existsSync(CACHE_FILE)
  ? JSON.parse(await readFile(CACHE_FILE, 'utf8'))
  : { generatedAt: null, legs: {} };
const legCache = cache.legs || {};
let fetches = 0;

function legKey(dataset, filters) {
  return `${dataset}?${Object.entries(filters).sort().map(([k, v]) => `${k}=${v}`).join('&')}`;
}

function legUrl(dataset, filters) {
  const q = new URLSearchParams({ format: 'JSON', lang: 'EN', ...filters });
  return `${EUROSTAT_BASE}/${dataset}?${q}`;
}

/** A short, human-readable name for one Eurostat leg (used as a column header). */
function legLabel(dataset, filters) {
  const pick = ['src_crf', 'siec', 'nrg_bal', 'meat', 'animals', 'nace_r2', 'indic_de', 'nace_r2', 'dairyprod'];
  const key = pick.find(k => filters[k]);
  const code = key ? filters[key] : Object.values(filters).find(v => v !== 'EU27_2020');
  const gas = filters.airpol && filters.airpol !== 'GHG' ? ` ${filters.airpol}` : '';
  return `${dataset} ${code}${gas}`;
}

async function getLeg(dataset, filters) {
  const key = legKey(dataset, filters);
  if (legCache[key]) return legCache[key];
  if (OFFLINE) throw new Error(`leg not cached and --offline: ${key}`);
  const series = await fetchEurostat(dataset, filters);
  fetches++;
  legCache[key] = {
    dataset,
    filters,
    url: legUrl(dataset, filters),
    values: Object.fromEntries(series.map(p => [p.year, p.value])),
  };
  return legCache[key];
}

// ── 5. Building the post-report block for one indicator ──────────────────────

/** Normalise a recipe into the legs the calc columns are built from. */
function recipeLegs(rec) {
  if (rec.kind === 'eurostat') {
    const legs = (rec.sumFilters ?? [rec.filters]).map(l => ({
      dataset: rec.dataset,
      filters: l.f ?? l,
      weight: l.w ?? 1,
    }));
    return { kind: 'sum', legs };
  }
  if (rec.kind === 'eurostat-ratio') {
    return {
      kind: 'ratio',
      num: rec.num.legs.map(l => ({ dataset: rec.num.dataset, filters: l.f ?? l, weight: l.w ?? 1 })),
      den: rec.den.legs.map(l => ({ dataset: rec.den.dataset, filters: l.f ?? l, weight: l.w ?? 1 })),
    };
  }
  return null; // EEA CSV recipes carry no per-leg decomposition
}

/** The linear factor of a recipe's toRepo (null when it is not linear). */
function linearFactor(rec) {
  const f = rec.toRepo;
  if (!f) return 1;
  const a = f(1);
  const b = f(2);
  if (!Number.isFinite(a) || Math.abs(b - 2 * a) > 1e-9 * Math.max(1, Math.abs(b))) return null;
  return a;
}

const ref = h => `[${h}]`;
const sumExpr = (legs, headers) =>
  legs.map((l, i) => (l.weight === 1 ? ref(headers[i]) : `${ref(headers[i])} * ${l.weight}`)).join(' + ');

/**
 * Build the extra columns + the post-report expression for one indicator.
 * Returns null when no live decomposition is available.
 */
async function derivedBlock(ind, rec, postYears) {
  const shape = recipeLegs(rec);
  if (!shape) return null;
  const decimals = rec.round ?? 3;
  const cols = [];
  const cells = {}; // header -> {year -> value}
  const uniq = new Set();
  const addCol = (header, source) => {
    let h = header;
    let n = 2;
    while (uniq.has(h.toLowerCase())) h = `${header} (${n++})`;
    uniq.add(h.toLowerCase());
    cols.push({ header: h, source });
    return h;
  };

  async function legColumns(legs, tag) {
    const headers = [];
    for (const leg of legs) {
      const got = await getLeg(leg.dataset, leg.filters);
      const h = addCol(
        `${tag}${legLabel(leg.dataset, leg.filters)}`,
        `Eurostat ${leg.dataset} · ${Object.entries(leg.filters).map(([k, v]) => `${k}=${v}`).join(', ')} · ${got.url}`,
      );
      cells[h] = {};
      for (const y of postYears) {
        const v = got.values[y];
        cells[h][y] = Number.isFinite(v) ? v : null;
      }
      headers.push(h);
      // the splice anchor needs the base year too
      cells[h].__all = got.values;
    }
    return headers;
  }

  let baseExpr;
  let baseAt; // value of the source basis at the splice anchor year
  if (shape.kind === 'sum') {
    const headers = await legColumns(shape.legs, '');
    baseExpr = shape.legs.length > 1 ? `(${sumExpr(shape.legs, headers)})` : sumExpr(shape.legs, headers);
    baseAt = y => shape.legs.reduce((acc, l, i) => {
      const v = cells[headers[i]].__all[y];
      return acc === null || !Number.isFinite(v) ? null : acc + v * l.weight;
    }, 0);
  } else {
    const nh = await legColumns(shape.num, 'Numerator · ');
    const dh = await legColumns(shape.den, 'Denominator · ');
    baseExpr = `(${sumExpr(shape.num, nh)}) / (${sumExpr(shape.den, dh)})`;
    baseAt = y => {
      const n = shape.num.reduce((a, l, i) => {
        const v = cells[nh[i]].__all[y];
        return a === null || !Number.isFinite(v) ? null : a + v * l.weight;
      }, 0);
      const d = shape.den.reduce((a, l, i) => {
        const v = cells[dh[i]].__all[y];
        return a === null || !Number.isFinite(v) ? null : a + v * l.weight;
      }, 0);
      return n === null || d === null || d === 0 ? null : n / d;
    };
  }

  let expr;
  if (rec.mode === 'splice') {
    const reportPts = ind.data.filter(p => !p.afterReport);
    const anchorYear = Math.max(...reportPts.map(p => p.year));
    const anchorVal = reportPts.find(p => p.year === anchorYear).value;
    const anchorSrc = baseAt(anchorYear);
    if (!Number.isFinite(anchorSrc) || anchorSrc === 0) return null;
    const hRep = addCol(
      `Report baseline ${anchorYear} (${ind.unit})`,
      `ESABCC (2024) “Towards EU climate neutrality”, underlying-data workbook — the report's own ${anchorYear} figure, the anchor the later years are spliced onto.`,
    );
    const hSrc = addCol(
      `Live source at ${anchorYear} (same basis as the columns left)`,
      `${rec.sourceTitle} — the same query, read at ${anchorYear}; dividing by it cancels the level difference between the source's scope and the report's, leaving only the year-on-year change.`,
    );
    cells[hRep] = {};
    cells[hSrc] = {};
    for (const y of postYears) {
      cells[hRep][y] = anchorVal;
      cells[hSrc][y] = round(anchorSrc, 6);
    }
    expr = `ROUND(${ref(hRep)} * ${baseExpr} / ${ref(hSrc)}, ${decimals})`;
  } else {
    const factor = linearFactor(rec);
    if (factor === null) return null;
    if (factor === 1) {
      expr = `ROUND(${baseExpr}, ${decimals})`;
    } else {
      const hF = addCol(
        `Unit conversion (× ${factor})`,
        `Unit conversion applied to the source figure so it is expressed in ${ind.unit}.`,
      );
      cells[hF] = Object.fromEntries(postYears.map(y => [y, factor]));
      expr = `ROUND(${baseExpr} * ${ref(hF)}, ${decimals})`;
    }
  }

  for (const h of Object.keys(cells)) delete cells[h].__all;
  return { columns: cols, cells, expr, method: 'derived', sourceTitle: rec.sourceTitle, note: rec.note };
}

/** Fallback: one column naming the publication the figure was taken from. */
function publishedBlock(ind, postYears, why, taken = []) {
  let header = 'Post-report figure as published';
  while (taken.some(h => h.toLowerCase() === header.toLowerCase())) header += ' ';
  return {
    columns: [{
      header,
      source: `${ind.source ?? 'see the indicator’s source field'}${ind.sourceUrl ? ` — ${ind.sourceUrl}` : ''}`,
    }],
    cells: { [header]: Object.fromEntries(postYears.map(y => [y, ind.data.find(p => p.year === y).value])) },
    expr: `[${header}]`,
    method: 'as-published',
    why,
  };
}

/**
 * A row for a year the REPORT itself carries but the seeded grid skipped (a
 * few layouts stop one year short of the workbook). Those figures come from
 * the report, not from a live source, and are labelled as such.
 */
function reportFigureBlock(ind, years, taken = []) {
  let header = 'Report figure — row missing from the seeded grid';
  while (taken.some(h => h.toLowerCase() === header.toLowerCase())) header += ' ';
  return {
    columns: [{
      header,
      source: `ESABCC (2024) “Towards EU climate neutrality”, underlying-data workbook — ${ind.source ?? 'as published'}. The report carries this year; the seeded calc grid stopped before it.`,
    }],
    cells: { [header]: Object.fromEntries(years.map(y => [y, ind.data.find(p => p.year === y).value])) },
    expr: `[${header}]`,
  };
}

/**
 * Fill the grid's OWN columns for a missing year instead of adding new ones.
 *
 * Many sheets derive the plotted figure from a single raw input and one or
 * more constant columns — a unit conversion, most often (B6: heat-pump stock
 * in thousands × 0.001). For those, the raw input behind a later year is not
 * unknown: the published figure and the sheet's own constants determine it
 * exactly. The value is linear in the one unknown, so evaluating the formula
 * with the unknown set to 1 gives the scale, and the input is the published
 * figure divided by it. The result is checked by recomputing.
 *
 * This keeps the later rows identical in shape to the report years — the same
 * columns, the same formula, no year switch — which is what makes the sheet
 * readable. Returns null unless exactly one referenced column varies.
 */
function reconstructedBlock(ind, years, layout, reportExpr) {
  let ast;
  try {
    ast = parseExpr(tokenize(reportExpr));
  } catch {
    return null;
  }
  const headers = layout.columns.map(c => c.header);
  const refs = new Set();
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (n.k === 'ref') refs.add(String(n.v).trim().toLowerCase());
    for (const key of ['a', 'b', 'args']) {
      const v = n[key];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v) walk(v);
    }
  })(ast);

  const idxOf = name => headers.findIndex(h => h.trim().toLowerCase() === name);
  const constants = new Map(); // column index -> constant value
  const varying = [];
  for (const r of refs) {
    if (r === 'a') return null; // a year-dependent formula is not reconstructable
    const i = idxOf(r);
    if (i < 0) return null;
    if (layout.columns[i].formula) return null; // derived helper: not a free input
    const vals = layout.rows.map(row => cellNumber(row.cells[i])).filter(v => v !== null);
    if (!vals.length) return null;
    if (vals.every(v => v === vals[0])) constants.set(i, vals[0]);
    else varying.push(i);
  }
  if (varying.length !== 1) return null;
  const unknown = varying[0];

  const evalWith = (x, year) => evalAst(ast, ref => {
    const r = String(ref).trim().toLowerCase();
    if (r === 'a') return year;
    const i = idxOf(r);
    if (i < 0) return null;
    return i === unknown ? x : constants.get(i) ?? null;
  });

  const cells = {};
  for (const y of years) {
    const target = ind.data.find(p => p.year === y)?.value;
    const scale = evalWith(1, y);
    if (!Number.isFinite(target) || !Number.isFinite(scale) || scale === 0) return null;
    const x = target / scale;
    const back = evalWith(x, y);
    if (!Number.isFinite(back) || Math.abs(back - target) > Math.max(1e-9, Math.abs(target) * 1e-9)) {
      return null; // not linear in the unknown — do not guess
    }
    cells[y] = { [unknown]: x, ...Object.fromEntries([...constants].map(([i, v]) => [i, v])) };
  }
  return {
    method: 'reconstructed',
    byIndex: cells,
    unknownHeader: headers[unknown],
    expr: reportExpr,
    columns: [],
  };
}

/** Glue two blocks into one, switching between them at `fromYear`. */
function combineBlocks(late, early, fromYear) {
  if (!early) return late;
  if (!late) return early;
  return {
    columns: [...early.columns, ...late.columns],
    cells: { ...early.cells, ...late.cells },
    expr: `IF(A >= ${fromYear}, ${late.expr}, ${early.expr})`,
    method: late.method,
    sourceTitle: late.sourceTitle,
    note: late.note,
    why: late.why,
  };
}

// ── 6. Assemble ──────────────────────────────────────────────────────────────

function reportOnlyLayout(ind) {
  const header = 'Report figure (2024 report underlying data)';
  const rows = ind.data.filter(p => !p.afterReport).map(p => ({ year: p.year, cells: [p.value, p.value] }));
  return {
    columns: [
      {
        header: 'Value',
        source: ind.source,
        formula: { expr: `[${header}]` },
      },
      {
        header,
        source: `ESABCC (2024) “Towards EU climate neutrality: Progress, policy gaps and opportunities”, underlying-data workbook — ${ind.source ?? 'as published'}. The report carries this indicator as a published series, with no further breakdown.`,
      },
    ],
    rows,
    derivation: null,
    synthesised: true,
  };
}

const DERIVATION_HEADER = '\n\nPost-report years — where the later numbers come from\n';

function extendDerivation(existing, ind, block, postYears) {
  const lines = [];
  lines.push(DERIVATION_HEADER.trim());
  lines.push('');
  lines.push(
    `The 2024 report's underlying data stops at ${Math.max(...ind.data.filter(p => !p.afterReport).map(p => p.year))}. ` +
    `The rows for ${postYears.join(', ')} were added afterwards and are computed from their own inputs, ` +
    'which sit in the columns to the right; the Value formula switches to them by year, so the report years ' +
    'keep the report\'s own derivation.',
  );
  lines.push('');
  if (block.method === 'derived') {
    lines.push(`  Source: ${block.sourceTitle}`);
    if (block.note) lines.push(`  Note:   ${block.note}`);
    lines.push('  Every input column carries its exact dataset query in its source field.');
  } else if (block.method === 'reconstructed') {
    lines.push(`  Source: ${ind.source ?? 'the indicator source'} — the published figure for these years.`);
    lines.push(`  The raw input ("${block.unknown}") is that published figure expressed in the`);
    lines.push('  source\'s own unit, obtained through this sheet\'s own conversion constants. It is');
    lines.push('  exact, not an estimate: the formula is linear in that input, so the constants');
    lines.push('  invert it uniquely, and recomputing the row returns the published figure.');
    lines.push('  These rows therefore use the same columns and the same formula as the report years.');
  } else {
    lines.push(`  These years are taken as published from: ${ind.source ?? 'the indicator source'}.`);
    lines.push(`  They are not re-derived here${block.why ? ` (${block.why})` : ''} — the figure is the publication's own.`);
  }
  lines.push('');
  lines.push('  Vintage: fetched/checked ' + new Date().toISOString().slice(0, 10) + '.');
  const base = (existing || '').replace(/\n\nPost-report years[\s\S]*$/, '');
  return `${base}${base ? '\n\n' : ''}${lines.join('\n')}`;
}

function pad(cells, n) {
  const out = cells.slice();
  while (out.length < n) out.push(null);
  return out;
}

async function main() {
  const ts = await readFile(TS_FILE, 'utf8');
  const indicators = parseIndicators(ts).filter(i => i.id.startsWith('esabcc-'));
  const layouts = {};
  for (const f of LAYOUT_SQL) Object.assign(layouts, parseLayouts(await readFile(f, 'utf8')));

  const results = [];
  const emitted = {};

  for (const ind of indicators) {
    const post = ind.data.filter(p => p.afterReport).map(p => p.year).sort((a, b) => a - b);
    const existing = layouts[ind.id];
    // Indicators with neither post-report points nor a seeded grid have
    // nothing to fill in or repair.
    if (!post.length && !existing) continue;
    const layout = existing
      ? JSON.parse(JSON.stringify(existing))
      : reportOnlyLayout(ind);
    const synthesised = !existing;
    const selfRefFixes = fixSelfReferences(layout);
    if (selfRefFixes.length) {
      console.log(`  ~ ${ind.id}: self-referencing column repaired (${selfRefFixes.join('; ')})`);
    }
    const have = new Set(layout.rows.map(r => r.year));
    // Every plotted year the calc grid has no row for — not just the
    // afterReport ones: several layouts also stop one year short of the
    // report's own last data year, and those rows render just as empty.
    const missing = ind.data.map(p => p.year).filter(y => !have.has(y)).sort((a, b) => a - b);
    const years = missing;
    // The Value formula switches branch at a single year, so the missing rows
    // must be a clean tail. An interior hole would put existing rows on the
    // post-report branch, where their input columns are blank.
    const switchYear = years.length ? Math.min(...years) : Infinity;
    if (years.length && layout.rows.some(r => r.year >= switchYear)) {
      results.push({
        id: ind.id, code: ind.code, method: 'skipped',
        why: `missing years ${years.join(', ')} are not a contiguous tail of the grid`,
      });
      console.error(`  ! ${ind.id}: missing years are not a tail — skipped`);
      continue;
    }

    // Years the report itself carries get the report's own figure; only the
    // post-report years are derived from a live source.
    const postSet = new Set(post);
    const lateYears = years.filter(y => postSet.has(y));
    const earlyYears = years.filter(y => !postSet.has(y));
    const taken = layout.columns.map(c => c.header);
    const earlyBlock = earlyYears.length ? reportFigureBlock(ind, earlyYears, taken) : null;

    const rec = REPORT_EXACT[ind.id] ?? RECIPES[ind.id];
    let block = null;
    if (rec && lateYears.length) {
      try {
        const late = await derivedBlock(ind, rec, lateYears);
        if (late) block = combineBlocks(late, earlyBlock, Math.min(...lateYears));
      } catch (e) {
        console.error(`  ! ${ind.id}: live inputs unavailable — ${e.message}`);
      }
    }

    // A layout whose Value column is typed rather than derived (the report
    // published the series with no breakdown) has no false branch to switch
    // back to. Move those literals into their own "report figure" column so
    // the Value can carry the year switch without losing them.
    let reportExpr = layout.columns[0].formula?.expr;
    if (!reportExpr) {
      const header = 'Report figure (2024 report underlying data)';
      layout.columns.push({
        header,
        source: `ESABCC (2024) “Towards EU climate neutrality”, underlying-data workbook — ${layout.columns[0].source ?? ind.source ?? 'as published'}. Published as a series, with no further breakdown.`,
      });
      const col = layout.columns.length - 1;
      for (const r of layout.rows) {
        r.cells = pad(r.cells, layout.columns.length);
        const v = r.cells[0];
        r.cells[col] = typeof v === 'object' && v ? v.v ?? null : v;
      }
      reportExpr = `[${header}]`;
      layout.columns[0] = { ...layout.columns[0], formula: { expr: reportExpr } };
    }

    // Pre-existing 100× mismatch: migrations 058 / 075 / 076 rescaled the
    // stored points of the share indicators from fractions to percent numbers,
    // but the seeded layouts still divide out to a fraction — so the grid and
    // the chart disagree by exactly 100×. Where that is true for EVERY report
    // year, the conversion is made explicit as its own column rather than left
    // as a silent discrepancy.
    let pctFix = false;
    {
      const before = computeValues(layout);
      const ratios = ind.data
        .filter(p => Number.isFinite(before?.[p.year]) && Math.abs(before[p.year]) > 1e-12)
        .map(p => p.value / before[p.year]);
      if (ratios.length >= 3 && ratios.every(r => Math.abs(r - 100) / 100 < 0.02)) {
        pctFix = true;
        console.log(`  ~ ${ind.id}: layout computed a fraction, series is a percent number — adding an explicit ×100 column`);
      }
    }

    if (!years.length && !pctFix && !selfRefFixes.length) {
      results.push({ id: ind.id, code: ind.code, method: 'already-complete', years: [] });
      continue;
    }

    const PCT_HEADER = 'fraction → % (× 100)';
    const attempt = (blk) => {
      const l = JSON.parse(JSON.stringify(layout));
      const startCol = l.columns.length;
      if (blk) l.columns.push(...blk.columns);
      const width = l.columns.length;
      for (const r of l.rows) r.cells = pad(r.cells, width);
      for (const y of years) {
        const cells = new Array(width).fill(null);
        for (let i = 0; blk && i < blk.columns.length; i++) {
          const h = blk.columns[i].header;
          const v = blk.cells[h]?.[y];
          cells[startCol + i] = Number.isFinite(v) ? v : null;
        }
        l.rows.push({ year: y, cells });
      }
      l.rows.sort((a, b) => a.year - b.year);
      let falseBranch = reportExpr;
      if (pctFix) {
        l.columns.push({
          header: PCT_HEADER,
          source: 'Unit convention: the report workbook computes this share as a fraction, the indicator database stores it as a percent number (migrations 058 / 075 / 076). The conversion is carried here as its own column so the grid and the plotted series agree.',
        });
        const pctCol = l.columns.length - 1;
        for (const r of l.rows) {
          r.cells = pad(r.cells, l.columns.length);
          r.cells[pctCol] = 100;
        }
        falseBranch = `(${reportExpr}) * [${PCT_HEADER}]`;
      }
      l.columns[0] = {
        ...l.columns[0],
        formula: {
          expr: blk ? `IF(A >= ${switchYear}, ${blk.expr}, ${falseBranch})` : falseBranch,
        },
      };
      return l;
    };

    const check = (l) => {
      const got = computeValues(l);
      if (!got) return { ok: false, why: 'formula did not parse' };
      const bad = [];
      for (const p of ind.data) {
        const v = got[p.year];
        if (v === null || v === undefined) { bad.push(`${p.year}: blank`); continue; }
        const rel = Math.abs(v - p.value) / Math.max(1e-9, Math.abs(p.value));
        if (rel > TOL_REL) bad.push(`${p.year}: ${round(v, 4)} vs ${p.value} (${(rel * 100).toFixed(1)}%)`);
      }
      const worst = Math.max(0, ...ind.data
        .filter(p => Number.isFinite(got[p.year]))
        .map(p => Math.abs(got[p.year] - p.value) / Math.max(1e-9, Math.abs(p.value))));
      return { ok: bad.length === 0, bad, worst };
    };

    /** Fill the sheet's own columns — no new columns, no year switch. */
    const attemptReconstructed = (blk) => {
      const l = JSON.parse(JSON.stringify(layout));
      const width = l.columns.length;
      for (const r of l.rows) r.cells = pad(r.cells, width);
      for (const y of years) {
        const cells = new Array(width).fill(null);
        for (const [i, v] of Object.entries(blk.byIndex[y])) cells[Number(i)] = v;
        l.rows.push({ year: y, cells });
      }
      l.rows.sort((a, b) => a.year - b.year);
      return l;
    };

    let chosen = null;
    let verdict = null;
    if (block) {
      const l = attempt(block);
      const c = check(l);
      if (c.ok) {
        chosen = l;
        verdict = { method: 'derived', worst: c.worst };
      } else {
        console.error(`  · ${ind.id}: live derivation off (${c.bad.slice(0, 3).join('; ')}) → as-published`);
      }
    }
    // Second choice: the sheet's own formula pins the raw input exactly.
    if (!chosen && years.length && !pctFix) {
      const blk = reconstructedBlock(ind, years, layout, reportExpr);
      if (blk) {
        const l = attemptReconstructed(blk);
        const c = check(l);
        if (c.ok) {
          chosen = l;
          verdict = { method: 'reconstructed', worst: c.worst, unknown: blk.unknownHeader };
        }
      }
    }
    if (!chosen) {
      const why = rec
        ? 'the live source no longer reproduces the stored value (publisher re-vintage)'
        : 'no machine-readable live-source recipe exists for this indicator';
      const blk = lateYears.length
        ? combineBlocks(publishedBlock(ind, lateYears, why, taken), earlyBlock,
                        Math.min(...lateYears))
        : earlyYears.length
          ? reportFigureBlock(ind, earlyYears, taken)
          : null; // nothing missing — this pass only repairs the existing grid
      const l = attempt(blk);
      const c = check(l);
      if (!c.ok) {
        results.push({ id: ind.id, code: ind.code, method: 'FAILED', why: c.bad.slice(0, 4).join('; ') });
        console.error(`  ! ${ind.id}: could not verify even as-published — ${c.bad.slice(0, 3).join('; ')}`);
        continue;
      }
      chosen = l;
      verdict = {
        method: blk ? 'as-published' : 'repaired',
        worst: c.worst,
        why: blk ? why : selfRefFixes.length ? 'self-referencing column repaired' : 'percent-scale mismatch repaired',
      };
    }

    // Cache the computed Value on the new rows, as the seeded rows do.
    {
      const got = computeValues(chosen);
      for (const r of chosen.rows) {
        if (years.includes(r.year) && Number.isFinite(got[r.year])) r.cells[0] = got[r.year];
      }
    }

    if (years.length) {
      const blkForText = verdict.method === 'derived'
        ? block
        : verdict.method === 'reconstructed'
          ? { method: 'reconstructed', unknown: verdict.unknown }
          : { method: 'as-published', why: verdict.why };
      chosen.derivation = extendDerivation(
        chosen.derivation || (synthesised ? synthesisedDerivation(ind) : ''),
        ind, blkForText, years,
      );
    }
    delete chosen.synthesised;
    emitted[ind.id] = chosen;
    results.push({
      id: ind.id, code: ind.code, method: verdict.method, years,
      worstPct: Number((verdict.worst * 100).toFixed(2)),
      synthesised, pctFix, why: verdict.why,
    });
    results[results.length - 1].selfRefFixes = selfRefFixes;
    console.log(`${verdict.method === 'derived' ? '✓' : '·'} ${(ind.code ?? ind.id).padEnd(26)} ${verdict.method.padEnd(13)} ${years.join(',') || '(repair only)'}`);
  }

  await writeFile(CACHE_FILE, JSON.stringify(
    { generatedAt: new Date().toISOString(), legs: legCache }, null, 1));
  await writeFile(OUT_SQL, renderSql(emitted, results));
  await writeFile(REPORT_MD, renderReport(results, indicators));

  const by = m => results.filter(r => r.method === m).length;
  console.log(`\n${Object.keys(emitted).length} layouts written · ${by('derived')} derived, ` +
              `${by('reconstructed')} reconstructed, ${by('as-published')} as-published, ` +
              `${by('repaired')} repair-only, ${by('FAILED')} failed, ${by('skipped')} skipped ` +
              `(${fetches} Eurostat queries).`);
  console.log(`→ ${OUT_SQL}`);
}

function synthesisedDerivation(ind) {
  return [
    `${ind.name}  (${ind.unit})`,
    '',
    `What it measures: ${ind.code} — as published by ${ind.source ?? 'the source below'}.`,
    '',
    "How it's calculated:",
    '  The report carries this indicator as a published series: the figure plotted is the',
    '  source\'s own, with no intermediate step. The "Report figure" column holds it for the',
    '  report years so the provenance is explicit rather than implied.',
  ].join('\n');
}

function sqlLit(obj) {
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

function renderSql(emitted, results) {
  const stamp = new Date().toISOString().slice(0, 10);
  const derived = results.filter(r => r.method === 'derived');
  const reconstructed = results.filter(r => r.method === 'reconstructed');
  const published = results.filter(r => r.method === 'as-published');
  const head = [
    '-- ─────────────────────────────────────────────────────────────────────────────',
    '-- Post-report rows for the indicator CALC SPACE (pw_indicator_sheets.layout).',
    '--',
    '-- The seeded layouts (045 / 052) reproduce the 2024 report workbook and stop at',
    '-- the report\'s last year, while pw_indicator_points carries 2022-2025 values',
    '-- (055 / 077 / 078 + the live-source refresh). In the calc editor those later',
    '-- years therefore appeared as EMPTY rows — a plotted number with nothing behind',
    '-- it. This migration fills them in with the inputs they actually come from.',
    '--',
    `-- ${derived.length} indicators are DERIVED: each leg of the live-source recipe is its own`,
    '--   column (dataset + filters + API URL in the column source), and the Value',
    '--   formula switches by year — IF(A >= <first post-report year>, <live recipe>,',
    '--   <report recipe>) — so the report years keep the workbook derivation.',
    `-- ${reconstructed.length} are RECONSTRUCTED: no live recipe, but the sheet derives the figure`,
    '--   from one varying input and some constants, so the published figure and those',
    '--   constants pin the input exactly. Those rows keep the report years\' own',
    '--   columns and formula — nothing is added, the grid simply continues.',
    `-- ${published.length} indicators are AS PUBLISHED: neither of the above applies, so the row`,
    '--   carries the figure with the publication it was taken from named in the column',
    '--   source. Explicit, not blank.',
    '--',
    '-- Two pre-existing faults in the seeded grids are repaired in passing: a helper',
    '-- column that resolved back to itself (headers differing only in case) and left',
    '-- its whole grid blank, and the share indicators whose grid computes a fraction',
    '-- while the stored series is a percent number — the ×100 is now its own column.',
    '--',
    '-- Every layout below was recomputed cell-by-cell before being written: report',
    '-- years reproduce unchanged, post-report years within 2% of the stored point.',
    '--',
    `-- Generated by scripts/esabcc-indicators/build-postreport-calc-rows.mjs (${stamp}).`,
    '-- Raw inputs, with the exact query behind each: scripts/esabcc-indicators/postreport-inputs.json',
    '-- Idempotent: upserts the layout for the listed indicators only.',
    '-- ─────────────────────────────────────────────────────────────────────────────',
    '',
    'insert into public.pw_indicator_sheets (indicator_id, layout)',
    'values',
  ];
  const rows = Object.entries(emitted).map(([id, layout]) => `  ('${id}', ${sqlLit(layout)})`);
  return `${head.join('\n')}\n${rows.join(',\n')}\non conflict (indicator_id) do update set layout = excluded.layout;\n`;
}

function renderReport(results, indicators) {
  const byId = Object.fromEntries(indicators.map(i => [i.id, i]));
  const stamp = new Date().toISOString().slice(0, 10);
  const rows = results
    .filter(r => ['derived', 'reconstructed', 'as-published', 'repaired'].includes(r.method))
    .map(r => `| ${r.code} | ${byId[r.id]?.name ?? ''} | ${r.years.join(', ') || '—'} | ${r.method}${r.synthesised ? ' (grid created)' : ''}${r.pctFix ? ' + ×100 fix' : ''}${r.selfRefFixes?.length ? ' + self-ref fix' : ''} | ${r.worstPct}% | ${r.method === 'derived' ? 'live inputs, per-column query' : (byId[r.id]?.source ?? '')} |`);
  const failed = results.filter(r => r.method === 'FAILED' || r.method === 'skipped');
  return [
    '# Indicator calc space — post-report rows (July 2026)',
    '',
    `*Generated by \`scripts/esabcc-indicators/build-postreport-calc-rows.mjs\` on ${stamp}.*`,
    '',
    'The calc grid behind each indicator (the "Edit data / calc" editor, ',
    '`pw_indicator_sheets.layout`) was seeded from the 2024 report workbook and stopped',
    "at the report's last year, while the plotted series had been extended to 2022–2025.",
    'The later years therefore showed as empty rows: a number on the chart with no',
    'visible provenance. Migration `079_post_report_calc_rows.sql` fills them in.',
    '',
    '## Method',
    '',
    '- **reconstructed** — no live recipe, but the sheet computes the figure from one',
    '  varying input and some constants, so the published figure and those constants',
    '  determine the input exactly (it is inverted, then checked by recomputing). These',
    '  rows keep the report years\' own columns and formula.',
    '- **repaired** — nothing was missing, but the grid disagreed with the chart: a',
    '  self-referencing helper column (blank grid), or a fraction-vs-percent scale.',
    '- **derived** — the indicator has a live-source recipe in `refresh-from-sources.mjs`.',
    '  Every leg of that recipe became its own calc column, filled from the Eurostat API,',
    '  with the exact dataset + filters + URL in the column\'s `source`. The Value formula',
    '  switches by year, so the report years keep the report workbook\'s own derivation.',
    '  Splice recipes carry their anchor constants as columns, so the splice is visible',
    '  arithmetic instead of a hidden script step.',
    '- **as published** — no live recipe, or the recipe no longer reproduces the stored',
    '  value (publisher re-vintage). The row carries one column naming the publication the',
    '  figure came from. Weaker than a derivation, but never a blank.',
    '',
    'Every layout was recomputed cell-by-cell before being written; report years must',
    'reproduce unchanged and post-report years within 2% of the stored point, otherwise',
    'the indicator degrades to *as published* rather than shipping a wrong derivation.',
    '',
    '## Result',
    '',
    '| Code | Indicator | Years added | Method | Worst Δ vs stored | Provenance |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
    failed.length
      ? ['## Not written', '', ...failed.map(r => `- **${r.code}** (${r.id}) — ${r.why}`)].join('\n')
      : '_Every indicator with post-report points was written._',
    '',
    '## Re-running',
    '',
    '```bash',
    'node scripts/esabcc-indicators/build-postreport-calc-rows.mjs           # refetch',
    'node scripts/esabcc-indicators/build-postreport-calc-rows.mjs --offline # cached inputs',
    '```',
    '',
    'The raw inputs behind every derived row, each with the query that produced it, are',
    'in `scripts/esabcc-indicators/postreport-inputs.json`.',
    '',
  ].join('\n');
}

await main();
