// ---------------------------------------------------------------------------
// Build the M·53 target → indicator assessment ledger.
//
//   node scripts/build-target-indicators.mjs            (writes the dataset)
//   node scripts/build-target-indicators.mjs --check     (verifies, writes nothing)
//
// Input   src/data/policy-targets.generated.ts  — the M·36 register (819 targets)
//         scripts/target-indicator-catalogue.mjs — measurement families
//         scripts/target-indicators-overrides.json — reviewed corrections
// Output  src/data/target-indicators.generated.ts
//
// One row per RELEVANT, UNFLAGGED M·36 target: the register's own
// transition-relevance lens, minus the rows the August 2026 review pass flagged
// "revise target" (NT-7..NT-15 — likely not targets under the reviewers'
// definition; see docs-internal/policy-targets-human-review-2026-08.md). Both
// calls are inherited from the register, not re-made here. Each row says how
// that target is measured:
//
//   route 'series'    — a curated MethodHub time series already measures it.
//   route 'dataset'   — no curated series yet, but the indicator is specified
//                       against a named public dataset (provider + code + URL).
//   route 'milestone' — the target names no measurable state of the world, so
//                       it is assessed as a compliance milestone against the
//                       act's own deadline and reporting obligation.
//   route 'unassessed'— nothing fired. THIS MUST BE EMPTY: the script exits
//                       non-zero and prints every offending target, because the
//                       whole point of the module is the claim that every
//                       relevant target was assessed. A gap is a build failure,
//                       not a silently missing row.
//
// Nothing here is agent judgement at build time: families fire on word-boundary
// vocabularies with veto phrases (scripts/target-indicator-catalogue.mjs), and
// every row records the exact terms that fired. Reviewed corrections are carried
// in the overrides file — one entry per target id with a prose `reason` — so a
// correction is reversible by deleting one entry and rebuilding.
//
// AI-compiled — pending Secretariat verification.
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILIES, MILESTONE_FAMILY, PROCEDURAL_TERMS, QUANTITY_RE } from './target-indicator-catalogue.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const OUT = path.join(ROOT, 'src/data/target-indicators.generated.ts');
const OVERRIDES_PATH = path.join(ROOT, 'scripts/target-indicators-overrides.json');

const INDICATOR_FILES = [
  'src/data/ecno-indicators.ts',
  'src/data/esabcc-indicators.ts',
  'src/data/advanced-indicators.ts',
  'src/data/beta-indicators.ts',
];

// ─── term matching (same convention as policy-targets-classify.mjs) ──────────
const RE_CACHE = new Map();
function termRe(term) {
  if (!RE_CACHE.has(term)) {
    const stem = term.endsWith('*');
    const body = (stem ? term.slice(0, -1) : term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    RE_CACHE.set(term, new RegExp(`\\b${body}${stem ? '' : '\\b'}`));
  }
  return RE_CACHE.get(term);
}
const hits = (s, words) => (words || []).filter((w) => termRe(w).test(s));

// ─── inputs ─────────────────────────────────────────────────────────────────
function loadTargets() {
  const src = fs.readFileSync(path.join(ROOT, 'src/data/policy-targets.generated.ts'), 'utf8');
  const start = src.indexOf('= [') + 2;
  const end = src.lastIndexOf('];') + 1;
  if (start < 2 || end < start) throw new Error('policy-targets.generated.ts: could not locate the row array');
  const rows = JSON.parse(src.slice(start, end));
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('policy-targets.generated.ts parsed to an empty array');
  return rows;
}

/** Every indicator id the platform actually carries, so a typo in the catalogue
 *  fails the build instead of rendering an empty chip. */
function loadIndicatorIds() {
  const ids = new Set();
  for (const rel of INDICATOR_FILES) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (const m of src.matchAll(/^\s{4}id: '([^']+)',$/gm)) ids.add(m[1]);
  }
  if (ids.size < 100) throw new Error(`only ${ids.size} indicator ids parsed — the extraction regex has drifted`);
  return ids;
}

function loadOverrides() {
  if (!fs.existsSync(OVERRIDES_PATH)) return { entries: [] };
  const parsed = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
  for (const e of parsed.entries || []) {
    if (!e.id || !e.reason) throw new Error(`overrides: entry without an id or a reason: ${JSON.stringify(e)}`);
  }
  return parsed;
}

// ─── classification ─────────────────────────────────────────────────────────
/** Text a family is matched against: the verbatim quote plus its provision
 *  heading, lower-cased. The heading matters — "Article 3(1) — Targets for
 *  recharging infrastructure" names the subject the quote leaves implicit. */
const matchText = (t) => `${t.target_text} ${t.article} ${t.policy_name}`.toLowerCase();
/** The quote alone — used where the policy title would otherwise drag every one
 *  of an act's targets into the same family. */
const quoteText = (t) => t.target_text.toLowerCase();

function scoreFamilies(t) {
  const full = matchText(t);
  const quote = quoteText(t);
  const scored = [];
  for (const f of FAMILIES) {
    if (hits(full, f.veto).length) continue;
    const strong = hits(full, f.strong);
    const any = hits(full, f.any);
    if (!strong.length && !any.length) continue;
    // Terms found in the quote itself weigh more than terms that only appear in
    // the act's title, so a Renewable Energy Directive row about permitting is
    // not scored as if it were a renewable-share target.
    const strongInQuote = strong.filter((w) => termRe(w).test(quote));
    const anyInQuote = any.filter((w) => termRe(w).test(quote));
    const score = strong.length * 2 + any.length + strongInQuote.length + anyInQuote.length;
    // How much of the match rests on the target's own wording rather than on the
    // act's title — the single most useful thing for a reviewer triaging rows.
    const confidence = strongInQuote.length ? 'strong' : anyInQuote.length ? 'moderate' : 'weak';
    scored.push({ key: f.key, score, confidence, terms: [...new Set([...strong, ...any])] });
  }
  return scored.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}

const CONFIDENCE_RANK = { strong: 3, moderate: 2, weak: 1 };

const FAMILY_BY_KEY = Object.fromEntries(FAMILIES.map((f) => [f.key, f]));

/** Procedural targets: an action by an institution, with no quantity of their own. */
function isProcedural(t) {
  const quote = quoteText(t);
  if (QUANTITY_RE.test(t.target_text)) return false;
  return hits(quote, PROCEDURAL_TERMS).length > 0;
}

/**
 * Where the target sits on the results chain, mirroring the report's sector
 * figures (goal band → outcomes → levers → enabling band):
 *   'outcome'  — a first-order target: the overall change the act exists to
 *                achieve (M·36 `target_order` 1).
 *   'lever'    — a second-order target that narrows, complements or implements
 *                a headline one and still names a measurable state.
 *   'enabling' — a procedural step; assessed as a milestone, drawn in the
 *                enabling band rather than the causal chain.
 */
function rungOf(t, route) {
  if (route === 'milestone') return 'enabling';
  return t.target_order === 1 ? 'outcome' : 'lever';
}

/** Short card label: the provision heading where the act gives one, else the
 *  opening clause of the verbatim quote. Never paraphrased — only trimmed. */
function labelOf(t) {
  const dash = t.article.split(/\s+—\s+/);
  if (dash.length > 1) {
    const head = dash.slice(1).join(' — ').trim();
    if (head.length >= 6) return head.length > 88 ? `${head.slice(0, 85).trimEnd()}…` : head;
  }
  let s = t.target_text.replace(/^\s*\d+[.)]\s*/, '').replace(/\s+/g, ' ').trim();
  if (s.length <= 88) return s;
  const cut = s.slice(0, 88);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > 40 ? cut.slice(0, sp) : cut).trimEnd()}…`;
}

// ─── build ──────────────────────────────────────────────────────────────────
const targets = loadTargets();
const indicatorIds = loadIndicatorIds();
const overrides = loadOverrides();
const overrideById = new Map((overrides.entries || []).map((e) => [e.id, e]));

// Catalogue integrity — loud, before anything is classified.
const badIds = [];
for (const f of FAMILIES) {
  for (const id of f.indicatorIds) if (!indicatorIds.has(id)) badIds.push(`${f.key} → ${id}`);
  if (!f.dataset || !f.dataset.name || !f.dataset.url) badIds.push(`${f.key} → missing dataset provenance`);
}
if (badIds.length) {
  console.error('Catalogue integrity failure — these entries do not resolve:');
  for (const b of badIds) console.error(`  ${b}`);
  process.exit(1);
}

// The reduced set: relevant under the transition lens AND not flagged "revise
// target" by the August 2026 review pass. Flagged rows are the register's
// candidate list for removal — assessing them here would claim measurement
// coverage for rows the reviewers consider likely not targets at all.
const relevant = targets.filter((t) => t.relevant && !t.revise_flag);
const rows = [];
const unassessed = [];
const overridesUsed = new Set();

for (const t of relevant) {
  const ov = overrideById.get(t.id);
  if (ov) overridesUsed.add(t.id);

  let familyKeys;
  let evidence = {};
  let confidence = 'weak';
  if (ov && Array.isArray(ov.families)) {
    familyKeys = ov.families;
    for (const k of familyKeys) {
      if (k !== MILESTONE_FAMILY.key && !FAMILY_BY_KEY[k]) {
        console.error(`overrides: unknown family "${k}" for ${t.id}`);
        process.exit(1);
      }
      evidence[k] = ['[override]'];
    }
    confidence = 'reviewed';
  } else {
    const scored = scoreFamilies(t);
    // Keep the leading family plus close runners-up, to a maximum of three: a
    // target such as "renewable hydrogen in industry" is genuinely measured by
    // more than one series, and a reviewer would rather see the second-best fit
    // than have it silently dropped.
    // The window is proportional, not absolute: a broad family ("emissions and
    // energy use of buildings") otherwise out-scores the specific one the target
    // is actually about ("renovation rate") purely on term count.
    const top = scored.length ? scored[0].score : 0;
    const kept = scored.filter((s) => s.score >= Math.max(2, Math.ceil(top * 0.55))).slice(0, 3);
    familyKeys = kept.map((s) => s.key);
    evidence = Object.fromEntries(kept.map((s) => [s.key, s.terms]));
    confidence = kept.reduce((best, s) => (CONFIDENCE_RANK[s.confidence] > CONFIDENCE_RANK[best] ? s.confidence : best), 'weak');
  }

  let route;
  const procedural = isProcedural(t);
  if (familyKeys.length && !(confidence === 'weak' && procedural)) {
    // A weak match on a purely procedural target means the topical family was
    // caught from the act's title, not from the target itself. Those are
    // assessed as milestones rather than dressed up as measured.
    route = familyKeys.some((k) => (FAMILY_BY_KEY[k]?.indicatorIds.length ?? 0) > 0) ? 'series' : 'dataset';
  } else if (procedural) {
    route = 'milestone';
    familyKeys = [MILESTONE_FAMILY.key];
    evidence = { [MILESTONE_FAMILY.key]: hits(quoteText(t), PROCEDURAL_TERMS).slice(0, 4) };
    confidence = 'strong';
  } else if (familyKeys.length) {
    route = familyKeys.some((k) => (FAMILY_BY_KEY[k]?.indicatorIds.length ?? 0) > 0) ? 'series' : 'dataset';
  } else {
    route = 'unassessed';
    unassessed.push(t);
  }
  if (ov && ov.route) route = ov.route;

  // Indicator ids, in catalogue order, de-duplicated across families.
  const seen = new Set();
  const indicators = [];
  for (const k of familyKeys) {
    for (const id of FAMILY_BY_KEY[k]?.indicatorIds ?? []) {
      if (!seen.has(id)) { seen.add(id); indicators.push(id); }
    }
  }

  rows.push({
    id: t.id,
    policy_id: t.policy_id,
    label: ov?.label ?? labelOf(t),
    rung: ov?.rung ?? rungOf(t, route),
    route,
    confidence,
    families: familyKeys,
    indicator_ids: indicators,
    evidence,
    override_reason: ov?.reason ?? '',
  });
}

const unknownOverrides = (overrides.entries || []).filter((e) => !overridesUsed.has(e.id));
if (unknownOverrides.length) {
  console.error('Overrides that match no in-scope target (stale ids, or rows now revise-flagged/peripheral in M·36 — fix or delete them):');
  for (const e of unknownOverrides) console.error(`  ${e.id} — ${e.reason}`);
  process.exit(1);
}

// ─── the claim this module makes has to be true, so fail loudly ─────────────
if (unassessed.length) {
  console.error(`\n${unassessed.length} relevant target(s) ended with NO assessment route.`);
  console.error('The module claims every relevant target is measured or explicitly assessed, so this is a build failure.');
  console.error('Fix by extending a family vocabulary in scripts/target-indicator-catalogue.mjs,');
  console.error('or by adding an override with a reason in scripts/target-indicators-overrides.json.\n');
  for (const t of unassessed.slice(0, 40)) {
    console.error(`  ${t.id}  ${t.policy_short}`);
    console.error(`    ${t.target_text.slice(0, 160).replace(/\s+/g, ' ')}`);
  }
  if (unassessed.length > 40) console.error(`  … and ${unassessed.length - 40} more`);
  process.exit(1);
}

// ─── stats for the file header ──────────────────────────────────────────────
const byRoute = rows.reduce((a, r) => ((a[r.route] = (a[r.route] || 0) + 1), a), {});
const byRung = rows.reduce((a, r) => ((a[r.rung] = (a[r.rung] || 0) + 1), a), {});
const byConfidence = rows.reduce((a, r) => ((a[r.confidence] = (a[r.confidence] || 0) + 1), a), {});
const familyUse = {};
for (const r of rows) for (const k of r.families) familyUse[k] = (familyUse[k] || 0) + 1;
const unusedFamilies = FAMILIES.filter((f) => !familyUse[f.key]).map((f) => f.key);
const distinctIndicators = new Set(rows.flatMap((r) => r.indicator_ids));

const stamp = (v) => JSON.stringify(v);
const body = `/**
 * AUTO-GENERATED — do not edit by hand.
 * Produced by scripts/build-target-indicators.mjs (npm run build:target-indicators).
 *
 * The M·53 assessment ledger: one row for every RELEVANT target in the M·36
 * Policy Targets Register that is NOT flagged "revise target" by the August
 * 2026 review pass (the reduced set — both calls inherited from the register),
 * with the route by which that target is measured.
 * Routes: 'series' (a curated MethodHub series measures it), 'dataset' (the
 * indicator is specified against a named public dataset but not yet built here),
 * 'milestone' (no measurable state of the world — assessed as compliance with
 * the act's own deadline). 'unassessed' is a build failure and cannot occur in
 * a committed file.
 *
 * Matching is deterministic: word-boundary vocabularies with veto phrases,
 * defined in scripts/target-indicator-catalogue.mjs. Every row carries the exact
 * terms that fired. Reviewed corrections come from
 * scripts/target-indicators-overrides.json and are reversible one entry at a time.
 *
 * AI-compiled — pending Secretariat verification. The dataset asserts no values:
 * it asserts a MAPPING between a legal target and a way of measuring it, and
 * that mapping is what a reviewer should challenge.
 *
 * ${rows.length} relevant unflagged targets of ${targets.length} in the register, across ${new Set(rows.map((r) => r.policy_id)).size} acts
 * (${targets.filter((t) => t.relevant).length} relevant in total; ${targets.filter((t) => t.relevant && t.revise_flag).length} of those revise-flagged and excluded).
 *   route:   ${stamp(byRoute)}
 *   rung:    ${stamp(byRung)}
 *   match confidence (how much of the match rests on the target's own wording,
 *   not the act's title): ${stamp(byConfidence)}
 *   families in use: ${Object.keys(familyUse).length} of ${FAMILIES.length}${unusedFamilies.length ? ` (unused: ${unusedFamilies.join(', ')})` : ''}
 *   distinct curated indicators linked: ${distinctIndicators.size}
 *   overrides applied: ${overridesUsed.size}
 */
import type { RawTargetAssessment, MeasurementFamily } from './target-indicators';

/** The measurement families, exactly as the build script read them. */
export const RAW_FAMILIES: MeasurementFamily[] = ${JSON.stringify(
  [...FAMILIES, MILESTONE_FAMILY].map((f) => ({
    key: f.key,
    label: f.label,
    unit: f.unit,
    sector: f.sector,
    direction: f.direction,
    indicator_ids: f.indicatorIds,
    dataset: f.dataset,
  })),
  null,
  2,
)};

export const RAW_TARGET_ASSESSMENTS: RawTargetAssessment[] = ${JSON.stringify(rows, null, 2)};
`;

if (CHECK) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (current !== body) {
    console.error('src/data/target-indicators.generated.ts is out of date — run npm run build:target-indicators');
    process.exit(1);
  }
  console.log(`target-indicators: up to date (${rows.length} assessed targets, 0 unassessed)`);
} else {
  fs.writeFileSync(OUT, body);
  console.log(`Wrote ${path.relative(ROOT, OUT)} — ${rows.length} assessed targets, 0 unassessed`);
  console.log(`  route ${stamp(byRoute)}`);
  console.log(`  rung  ${stamp(byRung)}`);
  console.log(`  conf  ${stamp(byConfidence)}`);
  console.log(`  ${distinctIndicators.size} distinct curated indicators linked; ${Object.keys(familyUse).length}/${FAMILIES.length} families in use`);
  if (unusedFamilies.length) console.log(`  unused families: ${unusedFamilies.join(', ')}`);
}
