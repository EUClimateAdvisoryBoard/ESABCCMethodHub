#!/usr/bin/env node
/**
 * Guard the M·36 Policy Targets Register against methodology drift.
 *
 * docs/modules/policy-targets.md states what the register guarantees. This
 * script re-checks those guarantees against the shipped dataset
 * (src/data/policy-targets.generated.ts) and fails (exit 1) when one no longer
 * holds, so a claim in the documentation cannot quietly stop being true.
 *
 * It deliberately re-implements each invariant instead of importing
 * scripts/build-policy-targets.mjs: a check that reuses the builder's own
 * helpers would pass whenever the builder is wrong in a self-consistent way.
 *
 * Invariants checked
 *   1  verbatim        — every target_text is an exact (whitespace-normalised)
 *                        substring of its act's ENACTING TERMS, and the exact
 *                        source characters are re-sliced, so no row is a
 *                        paraphrase.
 *   2  enacting-only   — no row is quoted from the preamble/recitals.
 *   3  stable-id       — id === 'tgt-' + sha1(policy_id::quote).slice(0,8), and
 *                        ids are unique, so human confirmations stay attached.
 *   4  one-row-per-    — no row's quote is the same provision as another's, up
 *      target           to a leading paragraph/point enumerator.
 *   5  soft-law        — communications/strategies are always voluntary
 *                        (column 6 reports the obligation created by the act
 *                        the row belongs to; soft law creates none).
 *   6  best-efforts    — "shall endeavour/aim/strive/seek" and a governing
 *                        "shall make … efforts" are voluntary in binding acts.
 *   7  relevance-lens  — rows follow relevantDefault() unless a reviewer set
 *                        `relevant` explicitly in the overrides.
 *   8  metadata        — policy title / CELEX / EUR-Lex URL / document type
 *                        match the canonical registry (src/data/policies.ts).
 *   9  enums+numbering — column values stay inside their documented domains and
 *                        target_number is 1..n per act.
 *  10  overrides       — every override entry still binds a row, carries a
 *                        reason, and does not smuggle reviewer notes into the
 *                        provision reference.
 *
 * Run with `npm run check:policy-targets` (also chained after
 * `npm run build:policy-targets`).
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..');
const TEXTS_DIR = join(ROOT, 'public/data/policy-texts');

const TAG = '[check:policy-targets]';
const failures = [];
const notes = [];
const fail = (check, detail) => failures.push({ check, detail });

// ─── Load the dataset (JSON array literal inside the generated module) ───────
const genSrc = readFileSync(join(ROOT, 'src/data/policy-targets.generated.ts'), 'utf8');
const at = genSrc.indexOf('= [');
if (at < 0) {
  console.error(`${TAG} Could not find the row array in src/data/policy-targets.generated.ts — regenerate it with \`npm run build:policy-targets\`.`);
  process.exit(2);
}
const rows = JSON.parse(genSrc.slice(at + 2, genSrc.lastIndexOf(']') + 1));
const overrides = new Map(
  JSON.parse(readFileSync(join(ROOT, 'scripts/policy-targets-overrides.json'), 'utf8')).map((o) => [o.id, o]),
);

// ─── Canonical policy metadata (scalar parse of the registry) ───────────────
const policiesSrc = readFileSync(join(ROOT, 'src/data/policies.ts'), 'utf8');
const region = policiesSrc.slice(
  policiesSrc.indexOf('export const policies'),
  policiesSrc.indexOf('export const connections'),
);
const anchors = [];
for (const m of region.matchAll(/\n {4}id: '([^']+)',/g)) anchors.push({ id: m[1], at: m.index });
const meta = new Map();
for (let i = 0; i < anchors.length; i++) {
  const chunk = region.slice(anchors[i].at, anchors[i + 1]?.at ?? region.length);
  const field = (name) => {
    const r = new RegExp(`\\n {4}${name}: '((?:[^'\\\\]|\\\\.)*)'`).exec(chunk);
    return r ? r[1].replace(/\\'/g, "'") : null;
  };
  const ft = /full_text: `([\s\S]*?)`,\n/.exec(chunk);
  meta.set(anchors[i].id, {
    title: field('title'),
    celex_number: field('celex_number'),
    document_type: field('document_type'),
    eurlex_url: field('eurlex_url'),
    full_text: ft ? ft[1] : null,
  });
}
if (rows.length === 0 || meta.size === 0) {
  console.error(`${TAG} Parsed 0 rows or 0 policies — the file format may have changed. Update this script.`);
  process.exit(2);
}

const norm = (s) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const bodies = new Map();
function bodyFor(policyId) {
  if (bodies.has(policyId)) return bodies.get(policyId);
  const file = join(TEXTS_DIR, `${policyId}.txt`);
  let text = null;
  if (existsSync(file) && statSync(file).size > 400) text = readFileSync(file, 'utf8');
  else if ((meta.get(policyId)?.full_text?.length ?? 0) > 400) text = meta.get(policyId).full_text;
  let body = null;
  if (text) {
    const artIdx = text.search(/\n\s*Article\s+1\b/);
    body = {
      enacting: norm(artIdx > 0 ? text.slice(artIdx) : text),
      preamble: artIdx > 0 ? norm(text.slice(0, artIdx)) : '',
      hasArticles: artIdx > 0,
    };
  }
  bodies.set(policyId, body);
  return body;
}

// ─── 1 + 2 · verbatim, enacting terms only ─────────────────────────────────
for (const r of rows) {
  const body = bodyFor(r.policy_id);
  if (!body) { fail('source-text', `${r.id} (${r.policy_id}): no source text to validate the quote against`); continue; }
  const quote = norm(r.target_text);
  if (body.enacting.includes(quote)) continue;
  if (body.preamble.includes(quote)) fail('enacting-terms-only', `${r.id} (${r.policy_id}): quoted from the preamble/recitals`);
  else fail('verbatim', `${r.id} (${r.policy_id}): not a substring of the enacting terms — "${quote.slice(0, 80)}…"`);
}

// ─── 3 · stable, unique content-hash ids ───────────────────────────────────
const idFor = (policyId, text) =>
  'tgt-' + createHash('sha1').update(policyId + '::' + norm(text).toLowerCase()).digest('hex').slice(0, 8);
const idCounts = new Map();
for (const r of rows) {
  if (idFor(r.policy_id, r.target_text) !== r.id) {
    fail('stable-id', `${r.id} (${r.policy_id}): id is not the content hash of its quote (expected ${idFor(r.policy_id, r.target_text)})`);
  }
  idCounts.set(r.id, (idCounts.get(r.id) || 0) + 1);
}
for (const [id, n] of idCounts) if (n > 1) fail('unique-ids', `${id}: ${n} rows share this id`);

// ─── 4 · one row per target (enumerator-insensitive) ───────────────────────
const bare = (s) =>
  norm(s)
    .replace(/^(?:[·•–—-]\s*)?(?:\d{1,3}(?:\.\d{1,3})?\.\s+|\(\d{1,3}[a-z]?\)\s+|\([a-z]\)\s+|\([ivxlc]+\)\s+)/i, '')
    .toLowerCase();
const dedupe = new Map();
for (const r of rows) {
  const key = r.policy_id + '::' + bare(r.target_text).slice(0, 120);
  if (dedupe.has(key)) fail('one-row-per-target', `${r.id} and ${dedupe.get(key)} (${r.policy_id}) quote the same provision`);
  else dedupe.set(key, r.id);
}

// ─── 5 + 6 · obligation rules ─────────────────────────────────────────────
const BINDING = ['regulation', 'directive', 'decision'];
const RE_BEST_EFFORTS_ANY = /\bshall\s+(endeavour|aim|strive|seek)\b/;
const RE_BEST_EFFORTS_GOVERNING = /^(?:make\s+(?:all\s+|every\s+|its\s+|their\s+)?(?:possible\s+|appropriate\s+|reasonable\s+|necessary\s+)?(?:effort|endeavour)s?\b|use\s+(?:its|their)\s+best\b)/;
for (const r of rows) {
  const binding = BINDING.includes(r.document_type);
  if (!binding && r.obligation !== 'voluntary') {
    fail('soft-law-voluntary', `${r.id} (${r.policy_id}, ${r.document_type}) is ${r.obligation} — soft law creates no obligation of its own`);
    continue;
  }
  if (!binding || r.obligation === 'voluntary') continue;
  const lc = r.target_text.toLowerCase();
  const governing = /\bshall\s+([a-z’'\s]{0,40})/.exec(lc);
  if (RE_BEST_EFFORTS_ANY.test(lc) || (governing && RE_BEST_EFFORTS_GOVERNING.test(governing[1]))) {
    fail('best-efforts-voluntary', `${r.id} (${r.policy_id}): best-efforts phrasing typed mandatory`);
  }
}

// ─── 7 · relevance lens follows the documented default ────────────────────
const relevantDefault = (r) =>
  r.climate_relevance !== 'none' ||
  (r.target_type === 'quantitative' && !!r.timeline && (r.target_label === 'target' || r.target_label === 'goal'));
let reviewerFlips = 0;
for (const r of rows) {
  if (Object.prototype.hasOwnProperty.call(overrides.get(r.id)?.set ?? {}, 'relevant')) { reviewerFlips++; continue; }
  if (r.relevant !== relevantDefault(r)) {
    fail('relevance-lens', `${r.id} (${r.policy_id}): relevant=${r.relevant} but the default rule says ${relevantDefault(r)} and no reviewer set it`);
  }
}

// ─── 8 · act metadata matches the canonical registry ──────────────────────
for (const r of rows) {
  const m = meta.get(r.policy_id);
  if (!m) { fail('policy-known', `${r.id}: '${r.policy_id}' is not in src/data/policies.ts`); continue; }
  const overridden = (f) => Object.prototype.hasOwnProperty.call(overrides.get(r.id)?.set ?? {}, f);
  if (r.policy_name !== m.title) fail('metadata', `${r.policy_id}: policy_name differs from the registry title`);
  if (r.celex_number !== m.celex_number) fail('metadata', `${r.policy_id}: CELEX ${r.celex_number} ≠ registry ${m.celex_number}`);
  if (r.eurlex_url !== m.eurlex_url) fail('metadata', `${r.policy_id}: EUR-Lex URL differs from the registry`);
  if (r.document_type !== m.document_type && !overridden('document_type')) {
    fail('metadata', `${r.policy_id}: document_type ${r.document_type} ≠ registry ${m.document_type}`);
  }
}

// ─── 9 · enum domains, quote bounds, per-act numbering ────────────────────
const ENUMS = {
  target_label: ['target', 'goal', 'objective', 'commitment', 'other'],
  obligation: ['mandatory', 'voluntary'],
  target_type: ['quantitative', 'qualitative', 'unspecified'],
  climate_relevance: ['mitigation', 'adaptation', 'both', 'none'],
};
for (const r of rows) {
  for (const [field, allowed] of Object.entries(ENUMS)) {
    if (!allowed.includes(r[field])) fail('enum', `${r.id}: ${field}='${r[field]}' is outside the documented values`);
  }
  const len = norm(r.target_text).length;
  if (len < 30 || len > 900) fail('quote-bounds', `${r.id} (${r.policy_id}): quote is ${len} characters`);
  if (/…\s*$/.test(r.target_text)) fail('quote-not-truncated', `${r.id} (${r.policy_id}): target_text was truncated — column 4 must be the untouched source text`);
  if (typeof r.relevant !== 'boolean') fail('relevance-lens', `${r.id}: relevant is not a boolean`);
}
const perAct = new Map();
for (const r of rows) {
  if (!perAct.has(r.policy_id)) perAct.set(r.policy_id, []);
  perAct.get(r.policy_id).push(r.target_number);
}
for (const [policyId, numbers] of perAct) {
  const expected = numbers.map((_, i) => i + 1).join(',');
  if ([...numbers].sort((a, b) => a - b).join(',') !== expected) {
    fail('numbering', `${policyId}: target_number is not 1..${numbers.length}`);
  }
}

// ─── 10 · overrides stay honest ───────────────────────────────────────────
const liveIds = new Set(rows.map((r) => r.id));
for (const o of overrides.values()) {
  if (!o.reason || !String(o.reason).trim()) fail('override-reason', `${o.id}: override carries no reason`);
  if (!o.drop && !liveIds.has(o.id)) fail('override-stale', `${o.id} (${o.policy_id}): override matches no row — the quote it was written against is gone`);
  if (o.drop && o.set) fail('override-shape', `${o.id}: entry both drops the row and sets fields`);
  const article = o.set?.article;
  if (article && /duplicate of|consider removing|TODO|FIXME|\?\?/i.test(article)) {
    fail('override-note-leak', `${o.id}: a reviewer note is embedded in the provision reference ("${article}") — it would render in the register's Provision column`);
  }
}
notes.push(`${overrides.size} override entries (${[...overrides.values()].filter((o) => o.drop).length} drops), ${reviewerFlips} reviewer-set relevance flips`);

// ─── Report ───────────────────────────────────────────────────────────────
const acts = new Set(rows.map((r) => r.policy_id)).size;
if (failures.length > 0) {
  const byCheck = failures.reduce((m, f) => ((m[f.check] = (m[f.check] || 0) + 1), m), {});
  console.error(`${TAG} ${failures.length} methodology violation(s) across ${rows.length} rows / ${acts} acts:`);
  console.error(`  ${JSON.stringify(byCheck)}`);
  for (const f of failures.slice(0, 60)) console.error(`  - [${f.check}] ${f.detail}`);
  if (failures.length > 60) console.error(`  … and ${failures.length - 60} more`);
  console.error(`\nFix the dataset (or the rule) rather than the check: docs/modules/policy-targets.md describes what each invariant is for.`);
  process.exit(1);
}
console.log(`${TAG} OK — ${rows.length} rows across ${acts} acts hold all 10 documented invariants.`);
console.log(`  ${notes.join(' · ')}`);
console.log(`  relevance lens: ${rows.filter((r) => r.relevant).length} relevant / ${rows.filter((r) => !r.relevant).length} peripheral`);
