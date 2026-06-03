#!/usr/bin/env node
/**
 * Re-tag every policy's master codes with a fleet of analysis agents.
 * ------------------------------------------------------------------
 * Regenerates src/lib/content-analysis/policy-master-tags.ts from scratch:
 * every assignment is rebuilt by AI against the full master taxonomy and
 * shipped as an "AI tag" (origin: 'ai'), which humans later confirm in the UI.
 *
 * The LLM tagging itself is done by Claude agents (one per batch), so this is
 * a two-phase, human-in-the-loop pipeline:
 *
 *   1) PREPARE  — build the inputs the agents read.
 *        node scripts/retag-policies.mjs prepare [--batches=6]
 *      Writes, under .retag/:
 *        - catalog.json   the full master code taxonomy (valid code ids)
 *        - policies.json  the policy inventory
 *        - batch-N.json   policies split into N batches, each with the
 *                         summary + shipped full_text excerpt (and, where the
 *                         network policy allows it, prefetched EUR-Lex bodies
 *                         from public/content-analysis/policy-bodies.json)
 *
 *   2) (agents) — point one Claude agent at each batch. Each reads
 *        .retag/catalog.json + .retag/batch-N.json and writes
 *        .retag/result-N.json of shape:
 *          { "<policy-id>": [ { codeId, confidence, rationale }, ... ], ... }
 *      Rules the agents follow: only ids from catalog.json; >=1 root-* code
 *      per policy; include the matching domain-<domain> code; 3-6 codes;
 *      precision over recall.
 *
 *   3) COMPILE  — validate the agent output and rewrite the data file.
 *        node scripts/retag-policies.mjs compile
 *      Validates coverage (every policy present), that every codeId exists in
 *      the catalog, and that every policy has a root code; dedupes, caps at 6
 *      (roots kept), then regenerates policy-master-tags.ts.
 *
 * For full-text fidelity, run `npm run prefetch-policy-bodies` first (needs an
 * environment whose network policy allows eur-lex.europa.eu /
 * publications.europa.eu). Without it, agents tag from shipped full_text +
 * summaries, which is the current baseline.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORK = path.join(ROOT, '.retag');
const SEED = path.join(ROOT, 'src/lib/content-analysis/seed.ts');
const POLICIES = path.join(ROOT, 'src/data/policies.ts');
const BODIES = path.join(ROOT, 'public/content-analysis/policy-bodies.json');
const OUT = path.join(ROOT, 'src/lib/content-analysis/policy-master-tags.ts');

function read(p) {
  return fs.readFileSync(p, 'utf8');
}
function ensureWork() {
  fs.mkdirSync(WORK, { recursive: true });
}

// ── Parse the master code taxonomy from seed.ts ──────────────────────────────
function parseCatalog(domains) {
  const seed = read(SEED);
  const codes = [];
  const seen = new Set();
  for (const line of seed.split(/\n/)) {
    const idM = line.match(/id:\s*'([^']+)'/);
    const nameM = line.match(/name:\s*'([^']*)'/);
    const descM = line.match(/description:\s*'([^']*)'/);
    const parentM = line.match(/parentId:\s*'([^']*)'/);
    if (idM && nameM && (idM[1].startsWith('code-') || idM[1].startsWith('root-'))) {
      if (seen.has(idM[1])) continue;
      seen.add(idM[1]);
      codes.push({
        id: idM[1],
        name: nameM[1],
        description: descM ? descM[1] : '',
        parentId: parentM ? parentM[1] : null,
      });
    }
  }
  // domain-<x> codes are derived per policy.domain in seed.ts.
  for (const d of domains) {
    const did = 'domain-' + d;
    if (!seen.has(did)) {
      codes.push({
        id: did,
        name: d.charAt(0).toUpperCase() + d.slice(1),
        description: `Policies tagged with domain "${d}".`,
        parentId: null,
      });
    }
  }
  return codes;
}

// ── Parse the policy inventory (+ full_text) from policies.ts ─────────────────
function parsePolicies() {
  const pol = read(POLICIES);
  const chunks = pol.split(/\n {4}id: /);
  const policies = [];
  for (let i = 1; i < chunks.length; i++) {
    const chunk = 'id: ' + chunks[i].slice(0, 8000);
    const id = (chunk.match(/^id: '([^']+)'/) || [])[1];
    if (!id) continue;
    const f = (re) => (chunk.match(re) || [])[1] || '';
    policies.push({
      id,
      short_title: f(/short_title:\s*'([^']*)'/),
      domain: f(/domain:\s*'([^']*)'/),
      document_type: f(/document_type:\s*'([^']*)'/),
      celex_number: f(/celex_number:\s*'([^']*)'/) || null,
      eurlex_url: f(/eurlex_url:\s*'([^']*)'/),
      summary: (chunk.match(/summary:\s*'((?:[^'\\]|\\.)*)'/) || [])[1] || '',
    });
  }
  return policies;
}

function fullTextFor(id) {
  const pol = read(POLICIES);
  const anchor = pol.indexOf("\n    id: '" + id + "'");
  if (anchor < 0) return '';
  const next = pol.indexOf("\n    id: '", anchor + 5);
  const region = pol.slice(anchor, next < 0 ? undefined : next);
  const start = region.indexOf('full_text: `');
  if (start < 0) return '';
  const after = region.slice(start + 'full_text: `'.length);
  const end = after.indexOf('`');
  return end < 0 ? after : after.slice(0, end);
}

function prefetchedBodies() {
  try {
    return JSON.parse(read(BODIES));
  } catch {
    return {};
  }
}

// ── PREPARE ──────────────────────────────────────────────────────────────────
function prepare(batches) {
  ensureWork();
  const policies = parsePolicies();
  const domains = [...new Set(policies.map((p) => p.domain).filter(Boolean))];
  const catalog = parseCatalog(domains);
  const bodies = prefetchedBodies();

  fs.writeFileSync(path.join(WORK, 'catalog.json'), JSON.stringify(catalog, null, 1));
  fs.writeFileSync(path.join(WORK, 'policies.json'), JSON.stringify(policies, null, 1));

  const evidence = policies.map((p) => {
    // Prefer prefetched EUR-Lex body, then shipped full_text, then nothing.
    const body =
      (bodies[p.id] && (bodies[p.id].text || bodies[p.id])) || fullTextFor(p.id) || '';
    const text = typeof body === 'string' ? body : '';
    return {
      id: p.id,
      short_title: p.short_title,
      domain: p.domain,
      document_type: p.document_type,
      celex_number: p.celex_number,
      eurlex_url: p.eurlex_url,
      summary: p.summary,
      full_text_excerpt: text ? text.slice(0, 5000) : '',
      has_full_text: !!text,
    };
  });

  const buckets = Array.from({ length: batches }, () => []);
  evidence.forEach((e, i) => buckets[i % batches].push(e));
  buckets.forEach((b, i) =>
    fs.writeFileSync(path.join(WORK, `batch-${i + 1}.json`), JSON.stringify(b, null, 1))
  );

  console.log(`Prepared ${policies.length} policies, ${catalog.length} codes, ${batches} batches in .retag/`);
  console.log(`  with full text: ${evidence.filter((e) => e.has_full_text).length}`);
  console.log('\nNext: run one Claude agent per .retag/batch-N.json (see the header of');
  console.log('this script for the prompt rules), writing .retag/result-N.json, then:');
  console.log('  node scripts/retag-policies.mjs compile');
}

// ── COMPILE ──────────────────────────────────────────────────────────────────
function compile() {
  const catalog = JSON.parse(read(path.join(WORK, 'catalog.json')));
  const policies = JSON.parse(read(path.join(WORK, 'policies.json')));
  const catalogIds = new Set(catalog.map((c) => c.id));
  const roots = new Set(catalog.filter((c) => c.id.startsWith('root-')).map((c) => c.id));
  const policyIds = new Set(policies.map((p) => p.id));
  const shortById = Object.fromEntries(policies.map((p) => [p.id, p.short_title || p.id]));

  const merged = {};
  const resultFiles = fs
    .readdirSync(WORK)
    .filter((f) => /^result-\d+\.json$/.test(f))
    .sort();
  if (resultFiles.length === 0) {
    console.error('No .retag/result-*.json files found. Run the agents first.');
    process.exit(1);
  }
  for (const f of resultFiles) {
    const r = JSON.parse(read(path.join(WORK, f)));
    for (const [pid, assigns] of Object.entries(r)) {
      if (merged[pid]) throw new Error('duplicate policy across batches: ' + pid);
      merged[pid] = assigns;
    }
  }

  const problems = [];
  for (const p of policies) if (!merged[p.id]) problems.push('MISSING policy: ' + p.id);
  for (const pid of Object.keys(merged)) if (!policyIds.has(pid)) problems.push('EXTRA policy: ' + pid);

  const clean = {};
  for (const [pid, assignsRaw] of Object.entries(merged)) {
    const byCode = new Map();
    for (const a of assignsRaw) {
      if (!a || typeof a.codeId !== 'string') {
        problems.push(`${pid}: malformed assignment`);
        continue;
      }
      if (!catalogIds.has(a.codeId)) {
        problems.push(`${pid}: invalid codeId ${a.codeId}`);
        continue;
      }
      const conf =
        typeof a.confidence === 'number' ? Math.max(0, Math.min(1, a.confidence)) : 0.7;
      const rationale = (a.rationale || '').toString().slice(0, 200);
      const prev = byCode.get(a.codeId);
      if (!prev || conf > prev.confidence) {
        byCode.set(a.codeId, {
          codeId: a.codeId,
          origin: 'ai',
          confidence: Math.round(conf * 100) / 100,
          rationale,
        });
      }
    }
    let list = [...byCode.values()];
    if (!list.some((a) => roots.has(a.codeId))) problems.push(`${pid}: no root code`);
    list.sort((a, b) => b.confidence - a.confidence);
    if (list.length > 6) {
      const rootsIn = list.filter((a) => roots.has(a.codeId));
      const rest = list.filter((a) => !roots.has(a.codeId));
      list = [...rootsIn, ...rest].slice(0, 6);
    }
    list.sort((a, b) => a.codeId.localeCompare(b.codeId));
    clean[pid] = list;
  }

  if (problems.length) {
    console.error(`Validation FAILED (${problems.length}):`);
    console.error(problems.slice(0, 50).join('\n'));
    process.exit(1);
  }

  writeDataFile(clean, policies.map((p) => p.id), shortById);
  const total = Object.values(clean).reduce((n, l) => n + l.length, 0);
  console.log(`Wrote ${OUT}`);
  console.log(`  ${Object.keys(clean).length} policies, ${total} assignments, avg ${(total / Object.keys(clean).length).toFixed(2)}`);
}

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function writeDataFile(compiled, order, shortById) {
  const L = [];
  L.push('// ---------------------------------------------------------------------------');
  L.push('// Per-policy master-code assignments — AI-generated baseline.');
  L.push('//');
  L.push('// Regenerated by scripts/retag-policies.mjs: a fleet of analysis agents read');
  L.push("// each policy's title, summary and (where available) full legal text and");
  L.push('// assigned codes from the master taxonomy (see `buildSeedSnapshot` in');
  L.push('// ./seed.ts for the catalog). EVERY assignment starts life tagged as an');
  L.push("// \"AI tag\" (`origin: 'ai'`). When a human reviews a policy in the Policy");
  L.push('// Navigator or the workspace and agrees with a tag, they "confirm" it, which');
  L.push("// promotes that (policy, code) pair to a human tag (`origin: 'human'`).");
  L.push('// Confirmations are persisted server-side (content_analysis_master_tag_status)');
  L.push('// and merged over this baseline at runtime — see useMasterTagStatus.ts.');
  L.push('//');
  L.push('// Do not hand-edit the assignment block below — re-run the pipeline:');
  L.push('//   node scripts/retag-policies.mjs prepare   (then run the agents)');
  L.push('//   node scripts/retag-policies.mjs compile');
  L.push('// ---------------------------------------------------------------------------');
  L.push('');
  L.push('/** Who put a tag on a policy: an AI agent, or a human who confirmed it. */');
  L.push("export type TagOrigin = 'ai' | 'human';");
  L.push('');
  L.push('/** A single master-code assignment on a policy, with provenance. */');
  L.push('export interface PolicyTagAssignment {');
  L.push('  /** Master-code id from the seeded taxonomy (e.g. `code-ets`). */');
  L.push('  codeId: string;');
  L.push("  /** `'ai'` for the generated baseline; `'human'` once confirmed. */");
  L.push('  origin: TagOrigin;');
  L.push('  /** Model confidence in [0, 1] for AI tags. */');
  L.push('  confidence?: number;');
  L.push('  /** One-line, evidence-grounded justification from the tagging agent. */');
  L.push('  rationale?: string;');
  L.push('}');
  L.push('');
  L.push('/** Keys are Policy.id values from `@/data/policies`. Values are the');
  L.push(" *  AI-generated tag assignments for that policy (all `origin: 'ai'`). */");
  L.push('export const POLICY_TAG_ASSIGNMENTS: Record<string, PolicyTagAssignment[]> = {');
  for (const pid of order) {
    const list = compiled[pid];
    if (!list) continue;
    L.push(`  // ${shortById[pid]}`);
    L.push(`  '${esc(pid)}': [`);
    for (const a of list) {
      const conf = typeof a.confidence === 'number' ? a.confidence : 0.7;
      L.push(
        `    { codeId: '${esc(a.codeId)}', origin: 'ai', confidence: ${conf}, rationale: '${esc(a.rationale || '')}' },`
      );
    }
    L.push('  ],');
  }
  L.push('};');
  L.push('');
  L.push('/** Back-compat flat view: policy id → array of code ids. Derived from');
  L.push(' *  POLICY_TAG_ASSIGNMENTS so existing consumers (seed, navigator chips,');
  L.push(' *  policy-codes API, coherence matrix) keep working unchanged. */');
  L.push('export const POLICY_MASTER_TAGS: Record<string, string[]> = Object.fromEntries(');
  L.push('  Object.entries(POLICY_TAG_ASSIGNMENTS).map(([policyId, assignments]) => [');
  L.push('    policyId,');
  L.push('    assignments.map(a => a.codeId),');
  L.push('  ])');
  L.push(');');
  L.push('');
  L.push('/** The AI-generated assignments for one policy (empty array if none). */');
  L.push('export function getPolicyTagAssignments(policyId: string): PolicyTagAssignment[] {');
  L.push('  return POLICY_TAG_ASSIGNMENTS[policyId] ?? [];');
  L.push('}');
  L.push('');
  fs.writeFileSync(OUT, L.join('\n'));
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const cmd = process.argv[2];
const batchesArg = (process.argv.find((a) => a.startsWith('--batches=')) || '').split('=')[1];
if (cmd === 'prepare') {
  prepare(Math.max(1, parseInt(batchesArg || '6', 10)));
} else if (cmd === 'compile') {
  compile();
} else {
  console.log('Usage:');
  console.log('  node scripts/retag-policies.mjs prepare [--batches=6]');
  console.log('  node scripts/retag-policies.mjs compile');
  process.exit(cmd ? 1 : 0);
}
