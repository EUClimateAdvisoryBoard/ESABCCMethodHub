#!/usr/bin/env node
/**
 * Refresh the post-report ("afterReport") data points on the ESABCC report
 * indicators directly from the primary publishers.
 * ---------------------------------------------------------------------------
 * Runs in GitHub Actions (open network egress) — NOT in the Claude Code web
 * sandbox, where ec.europa.eu / eea.europa.eu are blocked by the network
 * allowlist. See docs/how-to-access-eurostat-eea-data.md.
 *
 * Per recipe below it:
 *   1. Pulls the EU-27 series from Eurostat (JSON-stat REST) or the EEA GHG
 *      data-viewer CSV (sliced by CRF sector code / gas).
 *   2. Converts to the unit/scale this repo stores (Mtoe×11.63→TWh, kt→Mt,
 *      percent÷100→fraction, …) and rounds to the stored precision.
 *   3. SANITY-CHECKS the pull against the indicator's own last report value
 *      (the "anchor"): if the freshly-fetched value for that same year is off
 *      by more than 2× (or flips sign for a non-trivial magnitude), the recipe
 *      is treated as a unit/scope mismatch and skipped — never written.
 *   4. Keeps only years AFTER the anchor year, flags them afterReport, and
 *      rewrites src/data/esabcc-indicators.ts (stripping the indicator's
 *      existing afterReport points first, so the script is idempotent and
 *      supersedes earlier hand-sourced estimates with exact API values).
 *   5. Writes scripts/esabcc-indicators/refresh-provenance.json for the PDF.
 *
 * The recipe table mirrors src/lib/project-workspace/{eurostat.ts,live-sources.ts}.
 * A recipe that errors, returns nothing, or fails the anchor check is skipped
 * (logged) — it never writes partial/garbage data. `--dry-run` fetches and
 * reports without touching the TS file.
 *
 * Usage:  node scripts/esabcc-indicators/refresh-from-sources.mjs [--dry-run]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const TS_FILE = join(ROOT, 'src', 'data', 'esabcc-indicators.ts');
const PROV_FILE = join(__dirname, 'refresh-provenance.json');
const DRY = process.argv.includes('--dry-run');

const EUROSTAT_BASE =
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
const EEA_CSV =
  'https://www.eea.europa.eu/en/datahub/datahubitem-view/' +
  '3b7fe76c-524a-439a-bfd2-a6e4046302a2/download?format=csv&country=EU27';

const MTOE_TO_TWH = 11.63; // 1 Mtoe = 1000 ktoe × 0.011630 TWh

/**
 * Recipes keyed by the esabcc-* indicator id. Extend this table to cover more
 * indicators — CI validates new recipes empirically (anchor check) on the
 * next run.
 *
 *  eurostat: { dataset, filters }                → JSON-stat series
 *  eea:      { crfCodes, sumGases? }              → GHG-viewer CSV slice (→Mt)
 *  toRepo:   (v) => v                             → unit conversion
 *  round:    decimals
 *  sourceUrl, sourceTitle, note                   → shown in the PDF
 */
const RECIPES = {
  // ── Eurostat ──────────────────────────────────────────────────────────
  'esabcc-o2-pec': {
    kind: 'eurostat', dataset: 'nrg_ind_eff',
    filters: { geo: 'EU27_2020', nrg_bal: 'PEC2020-2030', unit: 'MTOE' },
    toRepo: v => v * MTOE_TO_TWH, round: 1,
    sourceUrl: `${EUROSTAT_BASE}/nrg_ind_eff?format=JSON&geo=EU27_2020&nrg_bal=PEC2020-2030&unit=MTOE`,
    sourceTitle: 'Eurostat nrg_ind_eff · primary energy consumption (PEC2020-2030) · EU27_2020',
    note: 'Mtoe×11.63→TWh.',
  },
  'esabcc-o2-fec': {
    kind: 'eurostat', dataset: 'nrg_ind_eff',
    filters: { geo: 'EU27_2020', nrg_bal: 'FEC2020-2030', unit: 'MTOE' },
    toRepo: v => v * MTOE_TO_TWH, round: 1,
    sourceUrl: `${EUROSTAT_BASE}/nrg_ind_eff?format=JSON&geo=EU27_2020&nrg_bal=FEC2020-2030&unit=MTOE`,
    sourceTitle: 'Eurostat nrg_ind_eff · final energy consumption (FEC2020-2030) · EU27_2020',
    note: 'Mtoe×11.63→TWh.',
  },
  'esabcc-e5-electrification': {
    kind: 'eurostat', dataset: 'nrg_bal_s',
    filters: { geo: 'EU27_2020', nrg_bal: 'FC_E', siec: 'E7000', unit: 'PC' },
    toRepo: v => v / 100, round: 4,
    sourceUrl: `${EUROSTAT_BASE}/nrg_bal_s?format=JSON&geo=EU27_2020&nrg_bal=FC_E&siec=E7000&unit=PC`,
    sourceTitle: 'Eurostat nrg_bal_s · electricity share of final energy · EU27_2020',
    note: 'Percent÷100→fraction.',
  },
  'esabcc-i6-industry-electrification': {
    kind: 'eurostat', dataset: 'nrg_bal_s',
    filters: { geo: 'EU27_2020', nrg_bal: 'FC_IND_E', siec: 'E7000', unit: 'PC' },
    toRepo: v => v / 100, round: 4,
    sourceUrl: `${EUROSTAT_BASE}/nrg_bal_s?format=JSON&geo=EU27_2020&nrg_bal=FC_IND_E&siec=E7000&unit=PC`,
    sourceTitle: 'Eurostat nrg_bal_s · industry electricity share · EU27_2020',
    note: 'Percent÷100→fraction.',
  },
  'esabcc-i3-circular-mat-use': {
    kind: 'eurostat', dataset: 'cei_srm030',
    filters: { geo: 'EU27_2020', unit: 'PC' },
    toRepo: v => v / 100, round: 3,
    sourceUrl: `${EUROSTAT_BASE}/cei_srm030?format=JSON&geo=EU27_2020&unit=PC`,
    sourceTitle: 'Eurostat cei_srm030 · circular material use rate · EU27_2020',
    note: 'Percent÷100→fraction.',
  },
  'esabcc-f-gerd': {
    kind: 'eurostat', dataset: 'rd_e_gerdtot',
    filters: { geo: 'EU27_2020', sectperf: 'TOTAL', unit: 'PC_GDP' },
    toRepo: v => v, round: 2,
    sourceUrl: `${EUROSTAT_BASE}/rd_e_gerdtot?format=JSON&geo=EU27_2020&sectperf=TOTAL&unit=PC_GDP`,
    sourceTitle: 'Eurostat rd_e_gerdtot · GERD as % of GDP · EU27_2020',
    note: 'Stored as percent of GDP. Publisher may revise the report’s base year (vintage).',
  },

  // ── EU GHG inventory via Eurostat env_air_gge (CO₂-eq, MIO_T = Mt) ────────
  // The EEA data-viewer "download?format=csv" URL returns HTML, not CSV, so we
  // pull the same inventory from Eurostat's env_air_gge (GHG by CRF source
  // sector) over the proven JSON-stat path. src_crf/airpol codes are
  // best-effort; the anchor check skips any that don't reconcile.
  'esabcc-e1-energy-supply-ghg': {
    kind: 'eurostat', dataset: 'env_air_gge', round: 1,
    sumFilters: [
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF1A1' },
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF1B' },
    ],
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=CRF1A1`,
    sourceTitle: 'Eurostat env_air_gge · CRF 1.A.1 + 1.B (energy supply) · EU27_2020',
    note: 'Public power/heat + fugitive emissions; CO₂-eq (Mt).',
  },
  'esabcc-i1-industry-ghg': {
    kind: 'eurostat', dataset: 'env_air_gge', round: 1,
    sumFilters: [
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF1A2' },
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF2' },
    ],
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=CRF1A2`,
    sourceTitle: 'Eurostat env_air_gge · CRF 1.A.2 + 2 (industry energy + processes) · EU27_2020',
    note: 'CO₂-eq (Mt).',
  },
  'esabcc-t1-transport-ghg': {
    kind: 'eurostat', dataset: 'env_air_gge', round: 1,
    filters: { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF1A3' },
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=CRF1A3`,
    sourceTitle: 'Eurostat env_air_gge · CRF 1.A.3 (domestic transport) · EU27_2020',
    note: 'CO₂-eq (Mt). Excludes international aviation/navigation (memo items).',
  },
  'esabcc-b1-buildings-ghg': {
    kind: 'eurostat', dataset: 'env_air_gge', round: 1,
    filters: { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF1A4' },
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=CRF1A4`,
    sourceTitle: 'Eurostat env_air_gge · CRF 1.A.4 (residential + commercial) · EU27_2020',
    note: 'CO₂-eq (Mt).',
  },
  'esabcc-a1-agri-nonco2': {
    kind: 'eurostat', dataset: 'env_air_gge', round: 1,
    sumFilters: [
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'CH4', src_crf: 'CRF3' },
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'N2O', src_crf: 'CRF3' },
    ],
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=CH4&src_crf=CRF3`,
    sourceTitle: 'Eurostat env_air_gge · CRF 3 (agriculture) CH₄+N₂O · EU27_2020',
    note: 'Sum of CH₄ and N₂O in CO₂-eq (Mt); excludes minor agricultural CO₂ (liming/urea).',
  },
  'esabcc-e6-energy-ch4': {
    kind: 'eurostat', dataset: 'env_air_gge', round: 2,
    filters: { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'CH4', src_crf: 'CRF1' },
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=CH4&src_crf=CRF1`,
    sourceTitle: 'Eurostat env_air_gge · CRF 1 (energy) CH₄ · EU27_2020',
    note: 'Energy-sector methane in CO₂-eq (Mt).',
  },
  'esabcc-l1-lulucf-net': {
    kind: 'eurostat', dataset: 'env_air_gge', round: 1,
    filters: { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF4' },
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=CRF4`,
    sourceTitle: 'Eurostat env_air_gge · CRF 4 (LULUCF) net · EU27_2020',
    note: 'Net sink is negative. Subject to inventory-vintage revision vs the report base year.',
  },
};

// ───────────────────────── helpers ─────────────────────────

/** Parse a number that may use European formatting ("1.234,5" → 1234.5). */
function parseNum(s) {
  if (s == null) return NaN;
  let t = String(s).trim().replace(/\s/g, '');
  if (t === '' || /^[:.\-]$/.test(t)) return NaN;
  if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.');
  else if (t.includes(',')) t = t.replace(',', '.');
  return parseFloat(t);
}

function round(v, d) {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

// ───────────────────────── fetchers ─────────────────────────

async function fetchEurostat(dataset, filters) {
  const params = new URLSearchParams({ format: 'JSON', lang: 'EN', ...filters });
  const url = `${EUROSTAT_BASE}/${encodeURIComponent(dataset)}?${params}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Eurostat ${dataset} → ${res.status} ${res.statusText}`);
  const j = await res.json();
  const idx = j?.dimension?.time?.category?.index;
  if (!idx) throw new Error('no time dimension');
  const val = j.value || {};
  const entries = Array.isArray(idx) ? idx.map((y, i) => [y, i]) : Object.entries(idx);
  const out = [];
  for (const [y, i] of entries) {
    const v = val[String(i)];
    if (v === null || v === undefined) continue;
    out.push({ year: Number(y), value: Number(v) });
  }
  return out.sort((a, b) => a.year - b.year);
}

/** Fetch several Eurostat slices and sum them by year (sector/gas totals). */
async function fetchEurostatSum(dataset, filtersList) {
  const acc = new Map();
  for (const f of filtersList) {
    for (const p of await fetchEurostat(dataset, f)) {
      acc.set(p.year, (acc.get(p.year) ?? 0) + p.value);
    }
  }
  return [...acc.entries()].map(([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year);
}

function detectDelimiter(line) {
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let q = false;
  for (const c of line) {
    if (c === '"') q = !q;
    else if (!q && c in counts) counts[c]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseCsvLine(line, delim) {
  const cells = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { cells.push(cur); cur = ''; }
    else cur += c;
  }
  cells.push(cur);
  return cells;
}

let _eea = null;
async function getEeaRows() {
  if (_eea) return _eea;
  const res = await fetch(EEA_CSV);
  if (!res.ok) throw new Error(`EEA datahub → ${res.status} ${res.statusText}`);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter(l => l.length);
  if (lines.length === 0) throw new Error('EEA CSV empty');
  const delim = detectDelimiter(lines[0]);
  const rows = lines.map(l => parseCsvLine(l, delim));
  const header = rows[0].map(h => h.trim().toLowerCase());
  const find = (...preds) => {
    for (const p of preds) {
      const i = header.findIndex(h => p(h));
      if (i >= 0) return i;
    }
    return -1;
  };
  const col = {
    year: find(h => h === 'year', h => h.includes('year')),
    sector: find(h => h === 'sector_code' || h === 'crf_code',
                 h => h.includes('sector') && h.includes('code'),
                 h => h.includes('crf') || h.includes('sector') || h.includes('category')),
    gas: find(h => h === 'pollutant_name' || h === 'gas' || h === 'pollutant',
              h => h.includes('pollutant') || h.includes('gas')),
    value: find(h => h === 'emissions' || h === 'value',
                h => h.includes('emission') || h.includes('value')),
    unit: find(h => h === 'unit', h => h.includes('unit')),
  };
  if (col.year < 0 || col.sector < 0 || col.value < 0) {
    throw new Error(`EEA CSV columns not recognised (delim="${delim}", header=${header.slice(0, 12).join('|')})`);
  }
  _eea = { rows, col };
  return _eea;
}

/** kt/Gg CO2-eq → Mt; Mt → Mt; t → Mt. Returns a multiplier to reach Mt. */
function unitToMt(u) {
  const s = (u || '').toLowerCase();
  if (/\bmt\b|million|teragram|tg\b/.test(s)) return 1;
  if (/\bkt\b|gigagram|gg\b|kiloton/.test(s)) return 0.001;
  if (/megagram|\bmg\b/.test(s)) return 1e-6;
  if (/tonne|\bt\b/.test(s)) return 1e-6;
  return null; // unknown — let the anchor check guard magnitude
}

async function fetchEea({ crfCodes, sumGases }) {
  const { rows, col } = await getEeaRows();
  const aggMatch = ['all greenhouse gases', 'co2 equivalent', 'co2-eq', 'co2 eq'];
  let factor = 1, factorSeen = false;
  const totals = new Map();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const code = (r[col.sector] ?? '').trim();
    // Match the EXACT aggregate code only — the GHG viewer CSV carries both
    // parent and child rows, so summing children too would double-count.
    if (!crfCodes.some(c => code === c)) continue;
    const gas = col.gas >= 0 ? (r[col.gas] ?? '').trim().toLowerCase() : '';
    if (sumGases) {
      if (!sumGases.some(g => gas.includes(g))) continue;
    } else if (col.gas >= 0) {
      if (!aggMatch.some(g => gas.includes(g))) continue;
    }
    const year = parseInt(r[col.year], 10);
    const v = parseNum(r[col.value]);
    if (!Number.isFinite(year) || !Number.isFinite(v)) continue;
    if (!factorSeen && col.unit >= 0) {
      const f = unitToMt(r[col.unit]);
      if (f != null) { factor = f; factorSeen = true; }
    }
    totals.set(year, (totals.get(year) ?? 0) + v * factor);
  }
  return [...totals.entries()].map(([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year);
}

// ───────────────────────── TS patching ─────────────────────────

function findDataArray(src, id) {
  const m = new RegExp(`id: '${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`).exec(src);
  if (!m) return null;
  const di = src.indexOf('data: [', m.index);
  if (di < 0) return null;
  const open = di + 'data: ['.length - 1;
  const close = src.indexOf(']', open);
  return { open, close, body: src.slice(open + 1, close) };
}

const POINT_RE = /\{\s*year:\s*(-?\d+),\s*value:\s*(-?[\d.]+)(,\s*afterReport:\s*true)?\s*\}/g;

/** Report points = those NOT flagged afterReport. */
function reportPoints(body) {
  const pts = [];
  let m; POINT_RE.lastIndex = 0;
  while ((m = POINT_RE.exec(body))) if (!m[3]) pts.push({ year: Number(m[1]), value: Number(m[2]) });
  return pts;
}

/** Anchor check: fetched value at the report's last year must be within 2×. */
function anchorOk(anchorVal, fetchedAtAnchor) {
  if (!Number.isFinite(fetchedAtAnchor)) return { ok: true, reason: 'no-anchor-year' };
  if (Math.abs(anchorVal) < 1e-9) return { ok: true, reason: 'zero-anchor' };
  const ratio = fetchedAtAnchor / anchorVal;
  if (ratio <= 0) return { ok: false, reason: `sign flip (anchor ${anchorVal}, fetched ${fetchedAtAnchor})` };
  if (ratio < 0.5 || ratio > 2)
    return { ok: false, reason: `${ratio.toFixed(3)}× off anchor (anchor ${anchorVal}, fetched ${round(fetchedAtAnchor, 3)})` };
  return { ok: true, reason: `${ratio.toFixed(3)}× anchor` };
}

async function main() {
  let src = await readFile(TS_FILE, 'utf8');
  const provenance = [];
  const edits = [];

  for (const [id, rec] of Object.entries(RECIPES)) {
    const loc = findDataArray(src, id);
    if (!loc) { console.error(`! ${id}: not found in TS`); continue; }
    const reps = reportPoints(loc.body);
    const baseYear = Math.max(...reps.map(p => p.year));
    const baseVal = reps.find(p => p.year === baseYear)?.value;
    const meta = { id, sourceTitle: rec.sourceTitle, sourceUrl: rec.sourceUrl, note: rec.note };

    let fetched;
    try {
      fetched = rec.kind === 'eurostat'
        ? (rec.sumFilters
            ? await fetchEurostatSum(rec.dataset, rec.sumFilters)
            : await fetchEurostat(rec.dataset, rec.filters))
        : await fetchEea(rec);
    } catch (e) {
      console.error(`! ${id}: fetch failed — ${e.message}`);
      provenance.push({ ...meta, status: 'error', message: e.message });
      continue;
    }

    const toRepo = rec.toRepo || (v => v);
    const conv = fetched.map(p => ({ year: p.year, value: round(toRepo(p.value), rec.round) }));

    // Sanity-check against the report anchor before trusting the series.
    const atAnchor = conv.find(p => p.year === baseYear)?.value;
    const chk = anchorOk(baseVal, atAnchor);
    if (!chk.ok) {
      console.error(`! ${id}: anchor check failed — ${chk.reason}; skipping`);
      provenance.push({ ...meta, status: 'mismatch', message: chk.reason, baseYear });
      continue;
    }

    const newPts = conv.filter(p => p.year > baseYear);
    if (newPts.length === 0) {
      console.log(`= ${id}: no years after ${baseYear} (${chk.reason})`);
      provenance.push({ ...meta, status: 'up-to-date', baseYear, newPoints: [] });
      continue;
    }

    const kept = reps.map(p => `{ year: ${p.year}, value: ${p.value} }`);
    for (const p of newPts) kept.push(`{ year: ${p.year}, value: ${p.value}, afterReport: true }`);
    edits.push({ open: loc.open, close: loc.close, text: `[${kept.join(', ')}]` });

    console.log(`+ ${id}: +${newPts.length} pts (${newPts.map(p => p.year).join(',')}) [${chk.reason}]`);
    provenance.push({ ...meta, status: 'updated', baseYear, newPoints: newPts });
  }

  edits.sort((a, b) => b.open - a.open);
  for (const e of edits) src = src.slice(0, e.open) + e.text + src.slice(e.close + 1);

  if (DRY) {
    console.log('\n[dry-run] no files written');
  } else {
    await writeFile(TS_FILE, src);
    await writeFile(PROV_FILE, JSON.stringify(
      { generatedAt: new Date().toISOString(), indicators: provenance }, null, 2));
    console.log(`\nWrote ${TS_FILE} and ${PROV_FILE}`);
  }
  const by = s => provenance.filter(p => p.status === s).length;
  console.log(`\nSummary: ${by('updated')} updated, ${by('up-to-date')} up-to-date, ` +
              `${by('mismatch')} mismatch, ${by('error')} errored, ${provenance.length} recipes.`);
}

main().catch(e => { console.error(e); process.exit(1); });
