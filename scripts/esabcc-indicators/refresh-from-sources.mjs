#!/usr/bin/env node
/**
 * Refresh the post-report ("afterReport") data points on the ESABCC report
 * indicators directly from the primary publishers.
 * ---------------------------------------------------------------------------
 * Runs in GitHub Actions (open network egress) — NOT in the Claude Code web
 * sandbox, where ec.europa.eu / eea.europa.eu are blocked by the network
 * allowlist. See docs/how-to-access-eurostat-eea-data.md.
 *
 * What it does, per recipe below:
 *   1. Pulls the EU-27 series from Eurostat (JSON-stat REST) or the EEA GHG
 *      data-viewer CSV (sliced by CRF sector code / gas).
 *   2. Converts to the unit/scale this repo stores (Mtoe×11.63→TWh, PJ÷3.6→TWh,
 *      percent÷100→fraction, …) and rounds to the stored precision.
 *   3. Keeps only years AFTER the indicator's last *report* year (the newest
 *      data point that is NOT already flagged afterReport).
 *   4. Rewrites src/data/esabcc-indicators.ts: strips the indicator's existing
 *      `afterReport: true` points and appends the freshly fetched ones. This
 *      makes the script idempotent and lets it supersede earlier hand-sourced
 *      estimates with exact API values.
 *   5. Writes a provenance file (scripts/esabcc-indicators/refresh-provenance.json)
 *      that the PDF generator turns into the source-verification sheet.
 *
 * The recipe table mirrors src/lib/project-workspace/{eurostat.ts,live-sources.ts}.
 * A recipe that errors or returns nothing is skipped (logged) — it never
 * writes partial/garbage data. Use `--dry-run` to fetch and report without
 * touching the TS file.
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
 * Recipes keyed by the esabcc-* indicator id. Each entry carries enough
 * provenance to populate the verification sheet. Extend this table to cover
 * more indicators — CI validates new recipes empirically on the next run.
 *
 *  eurostat: { dataset, filters }                → JSON-stat series
 *  eea:      { crfCodes, gasMatch?, sumGases? }   → GHG-viewer CSV slice
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

  // ── EEA GHG data viewer (CO₂-eq, Mt) ─────────────────────────────────────
  'esabcc-e1-energy-supply-ghg': {
    kind: 'eea', crfCodes: ['1.A.1', '1.B'], round: 1,
    sourceTitle: 'EEA GHG data viewer · CRF 1.A.1 + 1.B (energy supply) · EU27',
    note: 'Sum of public power/heat + fugitive emissions; CO₂-eq.',
  },
  'esabcc-i1-industry-ghg': {
    kind: 'eea', crfCodes: ['1.A.2', '2'], round: 1,
    sourceTitle: 'EEA GHG data viewer · CRF 1.A.2 + 2 (industry energy + processes) · EU27',
    note: 'CO₂-eq.',
  },
  'esabcc-t1-transport-ghg': {
    kind: 'eea', crfCodes: ['1.A.3'], round: 1,
    sourceTitle: 'EEA GHG data viewer · CRF 1.A.3 (domestic transport) · EU27',
    note: 'CO₂-eq. Excludes international aviation/navigation (memo items).',
  },
  'esabcc-b1-buildings-ghg': {
    kind: 'eea', crfCodes: ['1.A.4'], round: 1,
    sourceTitle: 'EEA GHG data viewer · CRF 1.A.4 (residential + commercial) · EU27',
    note: 'CO₂-eq.',
  },
  'esabcc-a1-agri-nonco2': {
    kind: 'eea', crfCodes: ['3'], sumGases: ['ch4', 'methane', 'n2o', 'nitrous'], round: 1,
    sourceTitle: 'EEA GHG data viewer · CRF 3 (agriculture) CH₄+N₂O · EU27',
    note: 'Sum of CH₄ and N₂O in CO₂-eq; excludes minor agricultural CO₂ (liming/urea).',
  },
  'esabcc-e6-energy-ch4': {
    kind: 'eea', crfCodes: ['1'], sumGases: ['ch4', 'methane'], round: 2,
    sourceTitle: 'EEA GHG data viewer · CRF 1 (energy) CH₄ · EU27',
    note: 'Energy-sector methane in CO₂-eq.',
  },
  'esabcc-l1-lulucf-net': {
    kind: 'eea', crfCodes: ['4'], round: 1,
    sourceTitle: 'EEA GHG data viewer · CRF 4 (LULUCF) net · EU27',
    note: 'Net sink is negative. Subject to inventory-vintage revision vs the report base year.',
  },
};

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
  const out = [];
  const entries = Array.isArray(idx)
    ? idx.map((y, i) => [y, i])
    : Object.entries(idx);
  for (const [y, i] of entries) {
    const v = val[String(i)];
    if (v === null || v === undefined) continue;
    out.push({ year: Number(y), value: Number(v) });
  }
  return out.sort((a, b) => a.year - b.year);
}

function parseCsv(text) {
  // Minimal CSV (handles quoted fields with commas).
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const cells = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { cells.push(cur); cur = ''; }
      else cur += c;
    }
    cells.push(cur);
    rows.push(cells);
  }
  return rows;
}

let _eeaCsvCache = null;
async function getEeaRows() {
  if (_eeaCsvCache) return _eeaCsvCache;
  const res = await fetch(EEA_CSV);
  if (!res.ok) throw new Error(`EEA datahub → ${res.status} ${res.statusText}`);
  const rows = parseCsv(await res.text());
  if (rows.length === 0) throw new Error('EEA CSV empty');
  const header = rows[0].map(h => h.trim().toLowerCase());
  const col = {
    year: header.findIndex(h => h === 'year'),
    sector: header.findIndex(h => ['sector_code', 'crf_code', 'sector'].includes(h)),
    gas: header.findIndex(h => ['pollutant_name', 'gas', 'pollutant'].includes(h)),
    value: header.findIndex(h => ['emissions', 'value'].includes(h)),
  };
  if (col.year < 0 || col.sector < 0 || col.value < 0)
    throw new Error('EEA CSV missing expected columns');
  _eeaCsvCache = { rows, col };
  return _eeaCsvCache;
}

async function fetchEea({ crfCodes, gasMatch, sumGases }) {
  const { rows, col } = await getEeaRows();
  // Default: take the single aggregate "all greenhouse gases (CO2 equivalent)"
  // row per sector/year. When sumGases is set, sum those gas rows instead.
  const aggMatch = gasMatch || ['all greenhouse gases', 'co2 equivalent', 'co2-eq', 'co2 eq'];
  const totals = new Map();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const code = (r[col.sector] ?? '').trim();
    if (!crfCodes.some(c => code === c || code.startsWith(c + '.'))) continue;
    const gas = col.gas >= 0 ? (r[col.gas] ?? '').trim().toLowerCase() : '';
    if (sumGases) {
      if (!sumGases.some(g => gas.includes(g))) continue;
    } else if (col.gas >= 0) {
      if (!aggMatch.some(g => gas.includes(g))) continue;
    }
    const year = parseInt(r[col.year], 10);
    const v = parseFloat(r[col.value]);
    if (!Number.isFinite(year) || !Number.isFinite(v)) continue;
    totals.set(year, (totals.get(year) ?? 0) + v);
  }
  return [...totals.entries()]
    .map(([year, value]) => ({ year, value }))
    .sort((a, b) => a.year - b.year);
}

// ───────────────────────── TS patching ─────────────────────────

/** Locate the one-line `data: [ ... ]` array for a given indicator id. */
function findDataArray(src, id) {
  const m = new RegExp(`id: '${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`).exec(src);
  if (!m) return null;
  const di = src.indexOf('data: [', m.index);
  if (di < 0) return null;
  const open = di + 'data: ['.length - 1; // index of '['
  const close = src.indexOf(']', open);
  return { open, close, body: src.slice(open + 1, close) };
}

const POINT_RE = /\{\s*year:\s*(-?\d+),\s*value:\s*(-?[\d.]+)(,\s*afterReport:\s*true)?\s*\}/g;

function reportYears(body) {
  const ys = [];
  let m;
  POINT_RE.lastIndex = 0;
  while ((m = POINT_RE.exec(body))) if (!m[3]) ys.push(Number(m[1]));
  return ys;
}

function round(v, d) {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

async function main() {
  let src = await readFile(TS_FILE, 'utf8');
  const provenance = [];
  // Apply edits back-to-front so string offsets stay valid.
  const edits = [];

  for (const [id, rec] of Object.entries(RECIPES)) {
    const loc = findDataArray(src, id);
    if (!loc) { console.error(`! ${id}: not found in TS`); continue; }
    const baseYear = Math.max(...reportYears(loc.body), -Infinity);

    let fetched;
    try {
      fetched = rec.kind === 'eurostat'
        ? await fetchEurostat(rec.dataset, rec.filters)
        : await fetchEea(rec);
    } catch (e) {
      console.error(`! ${id}: fetch failed — ${e.message}`);
      provenance.push({ id, status: 'error', message: e.message,
        sourceTitle: rec.sourceTitle, sourceUrl: rec.sourceUrl, note: rec.note });
      continue;
    }

    const toRepo = rec.toRepo || (v => v);
    const newPts = fetched
      .filter(p => p.year > baseYear)
      .map(p => ({ year: p.year, value: round(toRepo(p.value), rec.round) }));

    if (newPts.length === 0) {
      console.log(`= ${id}: no years after ${baseYear}`);
      provenance.push({ id, status: 'up-to-date', baseYear, newPoints: [],
        sourceTitle: rec.sourceTitle, sourceUrl: rec.sourceUrl, note: rec.note });
      continue;
    }

    // Rebuild the array body: drop old afterReport points, keep report points,
    // append fresh afterReport points (sorted by year).
    const kept = [];
    let m; POINT_RE.lastIndex = 0;
    while ((m = POINT_RE.exec(loc.body))) {
      if (!m[3]) kept.push(`{ year: ${m[1]}, value: ${m[2]} }`);
    }
    for (const p of newPts) kept.push(`{ year: ${p.year}, value: ${p.value}, afterReport: true }`);
    const newBody = kept.join(', ');
    edits.push({ open: loc.open, close: loc.close, text: `[${newBody}]` });

    console.log(`+ ${id}: +${newPts.length} pts (${newPts.map(p => p.year).join(',')})`);
    provenance.push({ id, status: 'updated', baseYear, newPoints: newPts,
      sourceTitle: rec.sourceTitle, sourceUrl: rec.sourceUrl, note: rec.note });
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
  const upd = provenance.filter(p => p.status === 'updated').length;
  const err = provenance.filter(p => p.status === 'error').length;
  console.log(`Summary: ${upd} updated, ${err} errored, ${provenance.length} recipes.`);
}

main().catch(e => { console.error(e); process.exit(1); });
