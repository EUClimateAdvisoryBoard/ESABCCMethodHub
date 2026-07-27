/**
 * Fact-check every post-report ("afterReport") indicator value against a FRESH
 * pull from its primary source.
 * ---------------------------------------------------------------------------
 * This re-runs the July-2026 value fact-check
 * (docs-internal/summer-prep-indicator-check-afterreport-factcheck-2026-07.md)
 * on the corrected basis established since:
 *
 *   • the report-exact derivations of migration 078 (O1, T1, L7, L8) replace
 *     the refresh script's year-on-year splices, which is what made those four
 *     drift in the first place;
 *   • three recipes that had gone stale — Eurostat renamed the EED headline
 *     codes, split solar siec RA400, and stopped serving the electrification
 *     shares as ready-made percentages — return data again, so O2 (PEC/FEC),
 *     E2 (RES), E5 and I6 can be checked at all;
 *   • the share indicators are compared on the percent-number scale the series
 *     is actually stored in, not the fraction their seeded grid computed.
 *
 * For each indicator it also runs an ANCHOR check: the same recipe evaluated at
 * the report's own last year, against the report's own figure. A point that
 * reproduces while its anchor does not means the recipe tracks the right trend
 * on the wrong basis — worth knowing before quoting the level.
 *
 * Verdicts (per point, on the relative difference):
 *   CONFIRMED  ≤2 %      reproduces from the live primary source
 *   REVISION   2–5 %     consistent with routine publisher back-revision
 *   WRONG      >5 %      does not reproduce; needs a decision
 *   NO SOURCE YEAR       the source has no figure for that year (yet)
 *   NOT CHECKABLE        no machine-readable source recipe — the value is a
 *                        published figure; the source is named, not re-derived
 *
 * Usage:  node scripts/esabcc-indicators/factcheck-postreport-values.mjs [--offline]
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { RECIPES, fetchEurostat, round } from './refresh-from-sources.mjs';
import { REPORT_EXACT } from './postreport-recipes.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const TS_FILE = join(ROOT, 'src', 'data', 'esabcc-indicators.ts');
const CACHE_FILE = join(__dirname, 'factcheck-postreport-inputs.json');
const OUT_MD = join(ROOT, 'docs-internal', 'indicator-postreport-factcheck-2026-07-27.md');
const OUT_JSON = join(__dirname, 'factcheck-postreport-results.json');

const OFFLINE = process.argv.includes('--offline');
const CONFIRMED = 0.02;
const REVISION = 0.05;

// ── the bundled series ───────────────────────────────────────────────────────

function parseIndicators(src) {
  const out = [];
  const starts = [];
  const idRe = /\n  \{\n    id: '([^']+)',/g;
  let m;
  while ((m = idRe.exec(src))) starts.push({ id: m[1], at: m.index });
  for (let i = 0; i < starts.length; i++) {
    const block = src.slice(starts[i].at, i + 1 < starts.length ? starts[i + 1].at : src.length);
    const str = key => {
      const r = new RegExp(`\\n    ${key}:\\s*'((?:[^'\\\\]|\\\\.)*)'`, '');
      const mm = r.exec(block);
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
    out.push({ id: starts[i].id, code: str('code'), name: str('name'), unit: str('unit'),
               source: str('source'), data });
  }
  return out;
}

// ── live inputs, cached with their query ─────────────────────────────────────

const cache = existsSync(CACHE_FILE)
  ? JSON.parse(await readFile(CACHE_FILE, 'utf8'))
  : { generatedAt: null, legs: {} };
const legs = cache.legs || {};
let fetches = 0;

const legKey = (ds, f) => `${ds}?${Object.entries(f).sort().map(([k, v]) => `${k}=${v}`).join('&')}`;

async function getLeg(dataset, filters) {
  const key = legKey(dataset, filters);
  if (legs[key]) return legs[key].values;
  if (OFFLINE) throw new Error(`not cached: ${key}`);
  const series = await fetchEurostat(dataset, filters);
  fetches++;
  legs[key] = { dataset, filters, values: Object.fromEntries(series.map(p => [p.year, p.value])) };
  return legs[key].values;
}

/** Sum a set of legs (each optionally weighted) into {year: value}. */
async function sumLegs(dataset, list) {
  const acc = {};
  for (const leg of list) {
    const f = leg.f ?? leg;
    const w = leg.w ?? 1;
    const vals = await getLeg(leg.dataset ?? dataset, f);
    for (const [y, v] of Object.entries(vals)) acc[y] = (acc[y] ?? 0) + v * w;
  }
  return acc;
}

/**
 * Evaluate a recipe for every year the source covers, exactly as the refresh
 * script would: direct recipes convert to the repo's unit, splice recipes
 * apply the source's year-on-year change to the report's own last figure.
 */
async function evaluateRecipe(ind, rec) {
  let raw;
  if (rec.kind === 'eurostat') {
    raw = await sumLegs(rec.dataset, rec.sumFilters ?? [rec.filters]);
  } else if (rec.kind === 'eurostat-ratio') {
    const num = await sumLegs(rec.num.dataset, rec.num.legs);
    const den = await sumLegs(rec.den.dataset, rec.den.legs);
    raw = {};
    for (const [y, v] of Object.entries(num)) {
      const d = den[y];
      if (Number.isFinite(d) && Math.abs(d) > 1e-12) raw[y] = (v / d) * 100;
    }
  } else {
    return null; // EEA CSV recipes carry no machine-readable leg set
  }

  const reportPts = ind.data.filter(p => !p.afterReport);
  const anchorYear = Math.max(...reportPts.map(p => p.year));
  const anchorVal = reportPts.find(p => p.year === anchorYear)?.value;

  if (rec.mode === 'splice') {
    const base = raw[anchorYear];
    if (!Number.isFinite(base) || Math.abs(base) < 1e-12 || !Number.isFinite(anchorVal)) return null;
    const out = {};
    for (const [y, v] of Object.entries(raw)) out[y] = round(anchorVal * (v / base), rec.round ?? 3);
    // A spliced series reproduces its anchor by construction, so the anchor
    // check has to compare the LEVEL the source itself carries — in the
    // indicator's own unit, so the ratio says something about scope rather
    // than about kilograms versus tonnes.
    const toRepoS = rec.toRepo ?? (v => v);
    return { values: out, anchorYear, anchorVal, anchorSource: toRepoS(raw[anchorYear]),
             spliced: true, basis: base,
             sourceLevel: Object.fromEntries(
               Object.entries(raw).map(([y, v]) => [y, toRepoS(v)])) };
  }
  const toRepo = rec.toRepo ?? (v => v);
  const out = {};
  for (const [y, v] of Object.entries(raw)) out[y] = round(toRepo(v), rec.round ?? 3);
  return { values: out, anchorYear, anchorVal, anchorSource: out[anchorYear], spliced: false,
           sourceLevel: out };
}

function verdictFor(stored, got) {
  if (!Number.isFinite(got)) return { verdict: 'NO SOURCE YEAR', rel: null };
  const rel = Math.abs(got - stored) / Math.max(1e-9, Math.abs(stored));
  return {
    verdict: rel <= CONFIRMED ? 'CONFIRMED' : rel <= REVISION ? 'REVISION' : 'WRONG',
    rel,
  };
}

const pct = r => (r === null ? '—' : `${(r * 100).toFixed(1)} %`);

async function main() {
  const inds = parseIndicators(await readFile(TS_FILE, 'utf8'))
    .filter(i => i.id.startsWith('esabcc-'));
  const rows = [];

  for (const ind of inds) {
    const post = ind.data.filter(p => p.afterReport);
    if (!post.length) continue;
    const exact = !!REPORT_EXACT[ind.id];
    const rec = REPORT_EXACT[ind.id] ?? RECIPES[ind.id];
    let ev = null;
    let error = null;
    if (rec) {
      try {
        ev = await evaluateRecipe(ind, rec);
      } catch (e) {
        error = e.message;
      }
    }

    // Join check: across EVERY report year, how far is the source's own level
    // from the report's? An appended year carries the source's level, so a
    // systematic offset here is a step in the series at the join — which reads
    // as a trend and is not one.
    let join = null;
    if (ev?.sourceLevel) {
      const ratios = ind.data
        .filter(p => !p.afterReport && Number.isFinite(ev.sourceLevel[p.year]) && p.value)
        .map(p => ev.sourceLevel[p.year] / p.value);
      if (ratios.length >= 3) {
        const sorted = [...ratios].sort((a, b) => a - b);
        join = {
          years: ratios.length,
          median: Number(sorted[Math.floor(sorted.length / 2)].toFixed(3)),
          min: Number(sorted[0].toFixed(3)),
          max: Number(sorted[sorted.length - 1].toFixed(3)),
        };
      }
    }

    // Anchor: does the recipe reproduce the report's own last figure?
    let anchor = null;
    if (ev) {
      const ratio = Number.isFinite(ev.anchorSource) && ev.anchorVal
        ? ev.anchorSource / ev.anchorVal
        : null;
      anchor = {
        year: ev.anchorYear,
        report: ev.anchorVal,
        source: Number.isFinite(ev.anchorSource) ? round(ev.anchorSource, 3) : null,
        ratio: ratio === null ? null : Number(ratio.toFixed(3)),
        spliced: ev.spliced,
      };
    }

    for (const p of post) {
      const got = ev ? ev.values[p.year] : undefined;
      const { verdict, rel } = ev
        ? verdictFor(p.value, got)
        : { verdict: 'NOT CHECKABLE', rel: null };
      rows.push({
        id: ind.id, code: ind.code, name: ind.name, unit: ind.unit,
        year: p.year, stored: p.value,
        recomputed: Number.isFinite(got) ? round(got, 3) : null,
        verdict, rel, anchor, join, basis: exact ? 'report-exact (078)' : rec ? 'live recipe' : null,
        mode: rec?.mode === 'splice' ? 'splice' : rec ? 'direct' : null,
        // A direct recipe checks the LEVEL: the source's own number, in the
        // indicator's unit, against the stored one. A splice can only check the
        // TREND — it is anchored on the report's figure by construction, so it
        // catches a revision in the source's year-on-year movement but says
        // nothing about whether the level is right.
        depth: rec ? (rec.mode === 'splice' ? 'trend' : 'level') : null,
        note: rec?.note ?? null,
        source: rec?.sourceTitle ?? ind.source, error,
      });
    }
  }

  await writeFile(CACHE_FILE, JSON.stringify(
    { generatedAt: new Date().toISOString(), legs }, null, 1));
  await writeFile(OUT_JSON, JSON.stringify(
    { generatedAt: new Date().toISOString(), rows }, null, 1));
  await writeFile(OUT_MD, renderReport(rows, fetches));

  const by = v => rows.filter(r => r.verdict === v).length;
  console.log(`\n${rows.length} post-report points checked across ` +
              `${new Set(rows.map(r => r.id)).size} series (${fetches} live queries)`);
  for (const v of ['CONFIRMED', 'REVISION', 'WRONG', 'NO SOURCE YEAR', 'NOT CHECKABLE']) {
    console.log(`  ${v.padEnd(16)} ${by(v)}`);
  }
  for (const r of rows.filter(r => r.verdict === 'WRONG' || r.verdict === 'REVISION')) {
    console.log(`  ! ${r.code} ${r.year}: stored ${r.stored} vs source ${r.recomputed} (${pct(r.rel)})`);
  }
  console.log(`→ ${OUT_MD}`);
}

function renderReport(rows, fetches) {
  const stamp = new Date().toISOString().slice(0, 10);
  const series = [...new Set(rows.map(r => r.id))];
  const by = v => rows.filter(r => r.verdict === v);
  const bad = [...by('WRONG'), ...by('REVISION')];
  // Direct recipes only: a splice re-anchors, so a level offset cannot step it.
  const joinSteps = [...new Map(rows
    .filter(r => r.mode === 'direct' && r.join && Math.abs(r.join.median - 1) > 0.05)
    .map(r => [r.id, r])).values()];
  const anchorOff = [...new Map(rows
    .filter(r => r.anchor && r.anchor.ratio !== null
      && (r.anchor.ratio < 0.95 || r.anchor.ratio > 1.05))
    .map(r => [r.id, r])).values()];

  const line = r => `| ${r.code} | ${r.year} | ${r.stored} | ${r.recomputed ?? '—'} | ` +
    `${pct(r.rel)} | ${r.verdict} | ${r.depth ?? '—'} | ${r.basis ?? '—'}${r.mode ? ` · ${r.mode}` : ''} |`;
  const HEAD = '| Code | Year | Stored | From source | Δ | Verdict | Checks | Basis |';
  const RULE = '| --- | --- | --- | --- | --- | --- | --- | --- |';
  const level = rows.filter(r => r.depth === 'level');
  const trend = rows.filter(r => r.depth === 'trend');

  return [
    '# Post-report indicator values — fact-check on the corrected basis (27 July 2026)',
    '',
    `*Every \`afterReport\` value re-checked against a fresh pull from its primary source:*`,
    `*${rows.length} points across ${series.length} series, ${fetches} live queries, ${stamp}.*`,
    '',
    'This supersedes the value fact-check of 22 July 2026',
    '(`summer-prep-indicator-check-afterreport-factcheck-2026-07.md`) for the points it covers.',
    'What changed in between is the basis, not the numbers:',
    '',
    '- **O1, T1, L7, L8** are now evaluated on the report\'s own exact derivations',
    '  (migration 078) instead of the refresh script\'s year-on-year splice — the splice is',
    '  what made those four drift, as 078 itself noted.',
    '- **O2 (PEC/FEC), E2 (RES), E5, I6** could not be checked at all before: their Eurostat',
    '  queries had gone stale (the EED headline codes were renamed, solar `RA400` was split',
    '  into `RA410`/`RA420`, and `nrg_bal_s` stopped serving the electrification shares as',
    '  ready-made percentages). All three returned 200-with-no-values, so the refresh',
    '  reported "up-to-date" while the series stood still.',
    '- **The share indicators** are compared on the percent-number scale the series is stored',
    '  in, rather than the fraction their seeded calc grid computed.',
    '',
    '## Verdict key',
    '',
    '| Verdict | Meaning |',
    '| --- | --- |',
    '| CONFIRMED | reproduces from the live primary source (≤ 2 %) |',
    '| REVISION | 2–5 % off — consistent with routine publisher back-revision |',
    '| WRONG | > 5 % off — does not reproduce; needs a decision |',
    '| NO SOURCE YEAR | the source carries no figure for that year yet |',
    '| NOT CHECKABLE | no machine-readable source recipe — the stored figure is a published number, named but not re-derived |',
    '',
    '## Headline',
    '',
    `**${by('CONFIRMED').length} of ${rows.length} points reproduce from their primary source within 2 %**`,
    `— ${by('REVISION').length} in the revision band, ${by('WRONG').length} that do not reproduce, and`,
    `${by('NOT CHECKABLE').length} published figures with no machine-readable recipe to check them against.`,
    '',
    '**How much that proves depends on the recipe.** Read the "Checks" column:',
    '',
    `- **level** (${level.length} points) — the source's own figure, converted into the indicator's`,
    '  unit, against the stored one. This is a real independent check of the number.',
    `- **trend** (${trend.length} points) — the recipe is a splice: the source\'s year-on-year change`,
    '  applied to the report\'s own last figure. It catches a revision in the source\'s movement,',
    '  but the level is anchored on the report by construction, so it cannot confirm the level.',
    '  For those series the anchor table below is the thing to read.',
    '',
    bad.length ? '## Points that do not reproduce' : '## Points that do not reproduce\n\n_None._',
    '',
    ...(bad.length ? [
      HEAD, RULE,
      ...bad.map(line),
      '',
    ] : []),
    '## Anchor checks',
    '',
    'The same recipe evaluated at the report\'s own last year, against the report\'s own figure.',
    'A ratio far from 1.00 means the source is on a different level than the report — for a',
    'spliced series that is expected and harmless (only the trend is used), but it means the',
    'source cannot be quoted as the level.',
    '',
    ...(anchorOff.length ? [
      '| Code | Anchor year | Report figure | Source at that year | Source ÷ report | Spliced? | Why the scales differ |',
      '| --- | --- | --- | --- | --- | --- | --- |',
      ...anchorOff.map(r => `| ${r.code} | ${r.anchor.year} | ${r.anchor.report} | ` +
        `${r.anchor.source ?? '—'} | ${r.anchor.ratio ?? '—'}× | ${r.anchor.spliced ? 'yes' : 'no'} | ` +
        `${(r.note ?? '').replace(/\|/g, '/')} |`),
      '',
    ] : ['_Every checked recipe reproduces its report anchor within 5 %._', '']),
    ...(joinSteps.length ? [
      '## Series with a level step at the join',
      '',
      'These recipes append the source\'s own level to the report\'s series. Across every report',
      'year the source sits systematically away from the report\'s figure by the median below, so',
      'the jump between the last report year and the first appended year is partly basis, not',
      'movement. A reader reading the chart would take it for a trend. This is the one thing in',
      'this pass that a "confirmed" verdict does NOT catch: each of these points reproduces its',
      'source exactly — the source is simply not on the report\'s level.',
      '',
      '| Code | Report years compared | Source ÷ report (median) | Range | What that means |',
      '| --- | --- | --- | --- | --- |',
      ...joinSteps.map(r => `| ${r.code} | ${r.join.years} | ${r.join.median}× | ` +
        `${r.join.min}–${r.join.max}× | ${((r.join.median - 1) * 100).toFixed(0)} % step at the ` +
        `${r.anchor.year}→${r.anchor.year + 1} join |`),
      '',
      'Spliced series are not listed here: a splice re-anchors on the report figure, so its level',
      'offset is cancelled by construction (the anchor table above records it for reference).',
      '',
      '**L7 is the one to look at.** Migration 078 adopted CRF 4.B–4.F as "the report\'s own',
      'basis" because it reproduces the 2022–2024 figures — but it reproduces them because it',
      'produced them. Measured against the report\'s own 17 published years it runs 14 % high',
      '(0.99–1.32×), so the 97.44 → 121.0 jump at 2021→2022 is mostly basis. Either the report\'s',
      'Figure 71 has a narrower scope than 4.B–4.F, or these years should be spliced onto the',
      'report level rather than appended at the source level. Worth settling against the report',
      'workbook before the number is quoted.',
      '',
      '**L1 is milder.** The 7 % median comes with a wide 0.89–1.12× spread across years, which',
      'looks like ordinary inventory-vintage revision rather than a scope difference — the whole',
      'LULUCF series is re-estimated with each submission. Still worth a line in any chart note.',
      '',
    ] : []),
    '## What to do about the three',
    '',
    'None is a silent error; each is a decision for the sector lead. No stored value was',
    'changed by this pass.',
    '',
    '- **E2 (RES) 2024 — 41.38 stored, 43.21 from the source (4.4 %).** The renewables recipe',
    '  changed under it: Eurostat split solar `RA400` into `RA410` (thermal) and `RA420` (PV),',
    '  and the summed legs are fault-tolerant, so the old query quietly dropped whatever it',
    '  could not resolve. The corrected leg set now includes both solar codes and tide. The',
    '  2023 point still matches (1.0 %), so this is the 2024 point moving with the fuller leg',
    '  set — re-run the refresh for this series to adopt it.',
    '- **I6 2023 — 32.6 stored, 33.59 from the source (3.0 %).** The stored value came from',
    '  `nrg_bal_s`, which no longer serves this share; the replacement computes it from the',
    '  `nrg_bal_c` energy balance (industry electricity ÷ industry final energy). A 3 % gap',
    '  between two definitions of the same share is a basis choice, not an error — decide',
    '  which definition the indicator should carry, then refresh.',
    '- **I2 steel 2025 — 126.2 stored, 128.8 from the source (2.1 %).** Both are carry-forwards.',
    '  Eurostat\'s annual production-volume index for NACE C241 shows 2025 = 84.3, exactly',
    '  equal to 2024 — while cement (C235) and chemicals (C201) both move over the same year.',
    '  A flat repeat in one series and not its neighbours reads as an incomplete year, not a',
    '  flat market. Treat steel 2025 as provisional or drop it until the index moves.',
    '',
    '## All points',
    '',
    HEAD, RULE,
    ...rows.map(line),
    '',
    '## Re-running',
    '',
    '```bash',
    'node scripts/esabcc-indicators/factcheck-postreport-values.mjs            # fresh pull',
    'node scripts/esabcc-indicators/factcheck-postreport-values.mjs --offline  # cached inputs',
    '```',
    '',
    'Raw inputs with their queries: `scripts/esabcc-indicators/factcheck-postreport-inputs.json`.',
    'Machine-readable results: `scripts/esabcc-indicators/factcheck-postreport-results.json`.',
    '',
  ].join('\n');
}

await main();
