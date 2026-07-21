#!/usr/bin/env node
/**
 * Policy Targets Register (M·36) — coverage / scope audit.
 * --------------------------------------------------------
 * Documents *which* acts the register covers, and why, and makes the coverage
 * auditable against any prior list of policies a reviewer already trusts.
 *
 * WHY THIS EXISTS
 * The register does not cover the whole EU acquis. Its scope is the
 * **climate-relevant subset of the Policy Navigator registry** (M·04,
 * src/data/policies.ts): the core climate-architecture acts plus every act in
 * the Fit-for-55 package and the surrounding Green Deal legislation that sets
 * targets bearing on mitigation or adaptation — across energy, transport,
 * industry, circular economy, buildings, land/agriculture, water/marine
 * environment and sustainable finance. Acquis with no direct climate-target
 * content (digital, health, security, migration, justice, consumer, education)
 * is out of scope. The selection tracks the Navigator's own `domain` tags, so
 * it is reproducible rather than hand-picked.
 *
 * WHAT IT REPORTS
 *   1. The covered acts (38) grouped by domain.
 *   2. The not-covered Navigator acts, split by tier:
 *        · candidate gaps  — core climate/energy acts the register does not
 *          (yet) cover (core domains should be near-complete);
 *        · judgment calls  — mixed-domain acts left out, where only the
 *          climate-relevant acts of the domain are pulled in; and
 *        · out of scope    — acts in domains with no climate-target content.
 *   3. (optional) A diff against a reference list — e.g. the policies named in
 *      "PGR 1.0" — so you can confirm everything previously identified is
 *      captured. Pass `--ref <file>`; one policy per line, as a Navigator id
 *      (e.g. `eu-ets-directive`) or free-text name (e.g. `Emissions Trading`).
 *      Lines starting with `#` and blank lines are ignored.
 *
 * Run:
 *   npm run check:policy-targets-coverage
 *   npm run check:policy-targets-coverage -- --ref scripts/data/pgr-1.0-policies.txt
 *
 * Exit code is 0 for a clean report and 1 when a `--ref` entry cannot be
 * matched to any Navigator act (so it can gate CI once a reference list exists).
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

// ── Domain scope model (three tiers) ────────────────────────────────────────
// CORE — climate/energy architecture. The register aims to cover these acts
//   (near-)completely, so a not-covered act here is a genuine *candidate gap*.
const CORE_DOMAINS = new Set([
  'climate', 'energy', 'transport', 'industry', 'circular_economy',
]);
// MIXED — domains where only the climate-relevant acts are pulled in and the
//   rest belong to a different acquis (e.g. prudential finance, trade defence,
//   nature/chemicals law). A not-covered act here is a scope *judgment call*,
//   not necessarily a gap — surfaced for the reviewer to eyeball.
const MIXED_DOMAINS = new Set([
  'environment', 'agriculture', 'finance', 'cross-cutting', 'trade',
]);
// OUT — excluded wholesale; no direct climate-target content.
const OUT_OF_SCOPE_DOMAINS = new Set([
  'digital', 'health', 'security', 'migration', 'justice', 'consumer', 'education',
]);

// ── Parse the Navigator registry (text parse — no TS toolchain needed) ───────
function loadPolicies() {
  const src = readFileSync(join(root, 'src/data/policies.ts'), 'utf8');
  const start = src.indexOf('export const policies');
  const conn = src.indexOf('export const connections');
  const region = src.slice(start, conn > 0 ? conn : undefined);
  const idRe = /\n {4}id: '([^']+)',/g;
  const anchors = [];
  let m;
  while ((m = idRe.exec(region))) anchors.push({ id: m[1], at: m.index });
  const out = new Map();
  for (let i = 0; i < anchors.length; i++) {
    const chunk = region.slice(anchors[i].at, anchors[i + 1]?.at ?? region.length);
    const field = (name) => {
      const r = new RegExp(`\\n {4}${name}: '((?:[^'\\\\]|\\\\.)*)'`).exec(chunk);
      return r ? r[1].replace(/\\'/g, "'") : null;
    };
    out.set(anchors[i].id, {
      id: anchors[i].id,
      title: field('title'),
      short_title: field('short_title'),
      domain: field('domain') || '(none)',
      document_type: field('document_type'),
    });
  }
  return out;
}

// Acts actually present in the generated register.
function loadCovered() {
  const gen = readFileSync(join(root, 'src/data/policy-targets.generated.ts'), 'utf8');
  const counts = new Map();
  for (const m of gen.matchAll(/"policy_id":\s*"([^"]+)"/g)) {
    counts.set(m[1], (counts.get(m[1]) || 0) + 1);
  }
  return counts;
}

function readRefList(file) {
  return readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

// Match a reference entry (id or free-text name) to a Navigator act.
function matchRef(entry, policies) {
  const e = entry.toLowerCase();
  if (policies.has(entry)) return policies.get(entry);
  for (const p of policies.values()) {
    const hay = [p.id, p.short_title, p.title].filter(Boolean).map((s) => s.toLowerCase());
    if (hay.some((h) => h === e || h.includes(e) || e.includes(h))) return p;
  }
  return null;
}

function groupByDomain(ids, policies) {
  const g = {};
  for (const id of ids) {
    const d = policies.get(id)?.domain || '(none)';
    (g[d] ||= []).push(id);
  }
  return g;
}

const nameOf = (p) => `${p.id}  ·  ${p.short_title || p.title || ''}`;

function main() {
  const args = process.argv.slice(2);
  const refIdx = args.indexOf('--ref');
  const refFile = refIdx >= 0 ? args[refIdx + 1] : null;

  const policies = loadPolicies();
  const covered = loadCovered();
  const coveredIds = new Set(covered.keys());
  const notCovered = [...policies.keys()].filter((id) => !coveredIds.has(id));

  console.log('Policy Targets Register — coverage audit');
  console.log('='.repeat(72));
  console.log(
    `Navigator registry: ${policies.size} acts   ·   ` +
      `Register covers: ${coveredIds.size} acts   ·   ` +
      `Not covered: ${notCovered.length} acts`,
  );

  // 1. Covered, by domain.
  console.log(`\n▶ COVERED (${coveredIds.size}) — climate-relevant acquis in the register`);
  const covByDomain = groupByDomain([...coveredIds], policies);
  for (const d of Object.keys(covByDomain).sort()) {
    console.log(`  ${d} (${covByDomain[d].length}): ${covByDomain[d].sort().join(', ')}`);
  }

  // 2. Not covered — split by tier: core gaps > mixed judgment calls > excluded.
  const gaps = notCovered.filter((id) => CORE_DOMAINS.has(policies.get(id)?.domain));
  const borderline = notCovered.filter((id) => MIXED_DOMAINS.has(policies.get(id)?.domain));
  const excluded = notCovered.filter((id) => OUT_OF_SCOPE_DOMAINS.has(policies.get(id)?.domain));

  console.log(
    `\n▶ CANDIDATE GAPS (${gaps.length}) — core climate/energy acts NOT in the register`,
  );
  console.log('  (Core domains should be near-complete; review each: deliberately out, or add.)');
  const gapByDomain = groupByDomain(gaps, policies);
  for (const d of Object.keys(gapByDomain).sort()) {
    console.log(`  ${d}:`);
    for (const id of gapByDomain[d].sort()) console.log(`     - ${nameOf(policies.get(id))}`);
  }

  console.log(
    `\n▶ JUDGMENT CALLS (${borderline.length}) — mixed-domain acts left out (climate-relevant ones cherry-picked)`,
  );
  const bByDomain = groupByDomain(borderline, policies);
  for (const d of Object.keys(bByDomain).sort()) {
    console.log(`  ${d}: ${bByDomain[d].sort().join(', ')}`);
  }

  console.log(
    `\n▶ OUT OF SCOPE (${excluded.length}) — domains with no climate-target content`,
  );
  const exByDomain = groupByDomain(excluded, policies);
  console.log(
    '  ' + Object.entries(exByDomain).sort()
      .map(([d, ids]) => `${d} (${ids.length})`).join(', '),
  );

  // 3. Optional reference-list diff (e.g. PGR 1.0).
  let missing = [];
  if (refFile) {
    console.log(`\n${'='.repeat(72)}`);
    if (!existsSync(refFile)) {
      console.error(`✗ reference list not found: ${refFile}`);
      process.exit(2);
    }
    const entries = readRefList(refFile);
    console.log(`▶ REFERENCE DIFF — ${relative(root, refFile)} (${entries.length} entries)`);
    const unmatched = [];
    const notInRegister = [];
    let ok = 0;
    for (const entry of entries) {
      const p = matchRef(entry, policies);
      if (!p) { unmatched.push(entry); continue; }
      if (coveredIds.has(p.id)) ok++;
      else notInRegister.push({ entry, p });
    }
    console.log(`  ✓ captured in register: ${ok}/${entries.length}`);
    if (notInRegister.length) {
      console.log(`\n  ⚠ in Navigator but NOT in the register (${notInRegister.length}):`);
      for (const { entry, p } of notInRegister) {
        console.log(`     - "${entry}"  →  ${nameOf(p)}  [${p.domain}]`);
      }
    }
    if (unmatched.length) {
      console.log(`\n  ✗ not found in the Navigator registry at all (${unmatched.length}):`);
      for (const entry of unmatched) console.log(`     - "${entry}"`);
    }
    missing = [...notInRegister.map((x) => x.entry), ...unmatched];
    if (!missing.length) console.log('\n  ✔ every reference-list policy is captured.');
  }

  console.log(`\n${'='.repeat(72)}`);
  console.log(
    'Scope = climate-relevant subset of the Navigator registry. ' +
      'Candidate gaps are for review, not errors.',
  );
  process.exit(missing.length ? 1 : 0);
}

main();
