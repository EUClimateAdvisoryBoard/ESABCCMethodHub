#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Re-tag every tracked policy against the master code taxonomy.
//
// Two-phase, agent-in-the-loop workflow:
//
//   1. `node scripts/retag-policies.mjs prepare`
//        Builds a self-contained tagging task for every policy under
//        `.retag/tasks/<id>.json` (policy metadata + best-available body
//        text) plus the full master-code catalog (`.retag/catalog.json`
//        and a human-readable `.retag/catalog.txt`). A fleet of tagging
//        agents then reads each task + the catalog and writes its answer
//        to `.retag/out/<id>.json`.
//
//   2. `node scripts/retag-policies.mjs compile`
//        Reads every `.retag/out/<id>.json`, validates the codeIds against
//        the catalog, and regenerates
//        `src/lib/content-analysis/policy-master-tags.ts` (the
//        `POLICY_TAG_ASSIGNMENTS` baseline, every tag `origin: 'ai'`).
//
// Body-text precedence per policy:
//   prefetched EUR-Lex body (public/content-analysis/policy-bodies.json)
//   → shipped `full_text` in src/data/policies.ts
//   → synthesized stub from title + summary + metadata.
//
// The taxonomy itself is the single source of truth in `seed.ts`
// (ROOT_CODES + per-domain codes + handPicked); this script parses it so
// the catalog the agents tag against can never drift from what the app
// resolves at runtime via `master-code-catalog.ts`.
//
// Agent output contract — `.retag/out/<id>.json`:
//   { "assignments": [
//       { "codeId": "code-ets", "confidence": 0.95,
//         "rationale": "Art.1 establishes the EU Emissions Trading System." },
//       ...
//   ] }
// (A bare top-level array is also accepted.)
// ---------------------------------------------------------------------------

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POLICIES_FILE = path.join(ROOT, 'src/data/policies.ts');
const SEED_FILE = path.join(ROOT, 'src/lib/content-analysis/seed.ts');
const BODIES_FILE = path.join(ROOT, 'public/content-analysis/policy-bodies.json');
const TAGS_FILE = path.join(ROOT, 'src/lib/content-analysis/policy-master-tags.ts');

const WORK = path.join(ROOT, '.retag');
const TASKS_DIR = path.join(WORK, 'tasks');
const OUT_DIR = path.join(WORK, 'out');
const CATALOG_JSON = path.join(WORK, 'catalog.json');
const CATALOG_TXT = path.join(WORK, 'catalog.txt');
const INDEX_JSON = path.join(WORK, 'index.json');

// Cap the body shipped into a tagging task — enough legal text for a
// confident assignment without blowing the agent's context window.
const BODY_CHAR_CAP = 60_000;

// Mirror of DOMAIN_TO_ROOT in seed.ts — used to place the per-domain codes
// under the right root (anything unlisted falls under root-crosscut).
const DOMAIN_TO_ROOT = {
  climate: 'root-mitigation',
  energy: 'root-sector',
  transport: 'root-sector',
  industry: 'root-sector',
  buildings: 'root-sector',
  agriculture: 'root-sector',
  finance: 'root-finance',
  adaptation: 'root-adaptation',
  forest: 'root-sector',
  water: 'root-sector',
};

// ── Generic helpers ────────────────────────────────────────────────────────
function unquote(s) {
  // Reverse the single-quote escaping used in the TS source literals.
  return s.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}
function tsQuote(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}
function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Policy parser (regex over the TS source, no runtime import) ─────────────
async function parsePolicies() {
  const src = await fs.readFile(POLICIES_FILE, 'utf-8');
  const idRe = /^\s*id:\s*'([^']+)',\s*$/gm;
  const marks = [];
  let m;
  while ((m = idRe.exec(src)) != null) marks.push({ id: m[1], start: m.index });
  const policies = [];
  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].start;
    const end = i + 1 < marks.length ? marks[i + 1].start : src.length;
    const entry = src.slice(start, end);
    const field = (name) => {
      const mm = entry.match(new RegExp(`${name}:\\s*'((?:\\\\'|[^'])*)'`));
      return mm ? unquote(mm[1]) : null;
    };
    // full_text is a template literal — capture up to the closing backtick.
    const ftMatch = entry.match(/full_text:\s*`([\s\S]*?)`,\s*\n/);
    policies.push({
      id: marks[i].id,
      title: field('title') ?? marks[i].id,
      short_title: field('short_title') ?? field('title') ?? marks[i].id,
      celex_number: (entry.match(/celex_number:\s*(?:'([^']+)'|null)/) || [])[1] ?? null,
      document_type: field('document_type') ?? 'document',
      domain: field('domain') ?? 'climate',
      status: field('status') ?? '',
      adoption_date: (entry.match(/adoption_date:\s*(?:'([^']+)'|null)/) || [])[1] ?? null,
      summary: field('summary') ?? '',
      full_text: ftMatch ? ftMatch[1] : null,
    });
  }
  return policies;
}

// ── Master-code catalog (parsed from seed.ts) ───────────────────────────────
function sliceArray(src, declRe) {
  const start = src.search(declRe);
  if (start < 0) return '';
  // Anchor on the `=` assignment so a `: CodeNode[]` type annotation's
  // brackets don't get mistaken for the array opener.
  const eq = src.indexOf('=', start);
  const open = src.indexOf('[', eq);
  // Find the matching closing bracket for this top-level array.
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return '';
}

function parseCodeEntries(block, { rootless = false } = {}) {
  // Each entry is a single `{ id: '…', parentId: '…'|null, name: '…',
  //  description: '…', … }` object literal.
  const out = [];
  const objRe = /\{([^{}]*)\}/g;
  let m;
  while ((m = objRe.exec(block)) != null) {
    const body = m[1];
    const id = (body.match(/id:\s*'([^']+)'/) || [])[1];
    if (!id) continue;
    const name = (body.match(/name:\s*'((?:\\'|[^'])*)'/) || [])[1];
    const description = (body.match(/description:\s*'((?:\\'|[^'])*)'/) || [])[1] || '';
    let parentId = null;
    if (!rootless) {
      const pm = body.match(/parentId:\s*(?:'([^']+)'|null)/);
      parentId = pm ? (pm[1] ?? null) : null;
    }
    out.push({ id, parentId, name: unquote(name ?? id), description: unquote(description) });
  }
  return out;
}

async function buildCatalog(policies) {
  const src = await fs.readFile(SEED_FILE, 'utf-8');
  const roots = parseCodeEntries(sliceArray(src, /const ROOT_CODES\b/), { rootless: true });
  const handPicked = parseCodeEntries(sliceArray(src, /const handPicked\b/));

  // Per-domain codes, generated exactly as seed.ts does at runtime.
  const seenDomains = new Set();
  const domainCodes = [];
  for (const p of policies) {
    if (seenDomains.has(p.domain)) continue;
    seenDomains.add(p.domain);
    domainCodes.push({
      id: `domain-${p.domain}`,
      parentId: DOMAIN_TO_ROOT[p.domain] ?? 'root-crosscut',
      name: cap(p.domain),
      description: `Policies tagged with domain "${p.domain}".`,
    });
  }

  const all = [...roots, ...domainCodes, ...handPicked];
  const byId = new Map(all.map((c) => [c.id, c]));
  // Precompute a readable root→leaf path for each code.
  const pathOf = (id) => {
    const parts = [];
    let cur = byId.get(id);
    const guard = new Set();
    while (cur && !guard.has(cur.id)) {
      parts.unshift(cur.name);
      guard.add(cur.id);
      cur = cur.parentId ? byId.get(cur.parentId) : null;
    }
    return parts.join(' › ');
  };
  for (const c of all) c.path = pathOf(c.id);
  return { all, byId };
}

// ── Body text selection ─────────────────────────────────────────────────────
async function loadBodies() {
  try {
    return JSON.parse(await fs.readFile(BODIES_FILE, 'utf-8')) ?? {};
  } catch {
    return {};
  }
}

function synthesizeStub(p) {
  const lines = [
    `${p.document_type.toUpperCase()} — ${p.short_title}`,
    p.title,
    p.adoption_date ? `Adopted: ${p.adoption_date}` : '',
    p.celex_number ? `CELEX: ${p.celex_number}` : '',
    `Domain: ${p.domain}`,
    '',
    'SUMMARY',
    p.summary,
  ];
  return lines.filter(Boolean).join('\n');
}

function selectBody(p, bodies) {
  if (bodies[p.id]?.text && bodies[p.id].text.length >= 400) {
    return { text: bodies[p.id].text, source: bodies[p.id].source || 'eurlex' };
  }
  if (p.full_text && p.full_text.trim().length >= 400) {
    return { text: p.full_text, source: 'shipped-full_text' };
  }
  return { text: synthesizeStub(p), source: 'synthesized-metadata' };
}

// ── prepare ─────────────────────────────────────────────────────────────────
async function prepare() {
  const policies = await parsePolicies();
  const { all: catalog } = await buildCatalog(policies);
  const bodies = await loadBodies();

  await fs.rm(WORK, { recursive: true, force: true });
  await fs.mkdir(TASKS_DIR, { recursive: true });
  await fs.mkdir(OUT_DIR, { recursive: true });

  await fs.writeFile(CATALOG_JSON, JSON.stringify(catalog, null, 2));
  await fs.writeFile(
    CATALOG_TXT,
    [
      `# Master code catalog — ${catalog.length} codes`,
      '# Assign ONLY codeIds from this list. Format: <codeId>\\t<path>\\t— <description>',
      '',
      ...catalog.map((c) => `${c.id}\t${c.path}\t— ${c.description}`),
    ].join('\n'),
  );

  const index = [];
  for (const p of policies) {
    const body = selectBody(p, bodies);
    const text = body.text.length > BODY_CHAR_CAP
      ? body.text.slice(0, BODY_CHAR_CAP) + '\n\n[…truncated for tagging…]'
      : body.text;
    const task = {
      id: p.id,
      short_title: p.short_title,
      title: p.title,
      celex_number: p.celex_number,
      document_type: p.document_type,
      domain: p.domain,
      summary: p.summary,
      bodySource: body.source,
      bodyChars: body.text.length,
      body: text,
    };
    await fs.writeFile(path.join(TASKS_DIR, `${p.id}.json`), JSON.stringify(task, null, 2));
    index.push({
      id: p.id,
      short_title: p.short_title,
      domain: p.domain,
      bodySource: body.source,
      bodyChars: body.text.length,
    });
  }
  await fs.writeFile(INDEX_JSON, JSON.stringify(index, null, 2));

  const bySource = index.reduce((a, e) => ((a[e.bodySource] = (a[e.bodySource] || 0) + 1), a), {});
  console.log(`prepared ${policies.length} tagging tasks → ${path.relative(ROOT, TASKS_DIR)}/`);
  console.log(`catalog: ${catalog.length} master codes → ${path.relative(ROOT, CATALOG_TXT)}`);
  console.log('body sources:', JSON.stringify(bySource));
  console.log(`\nNext: tagging agents write .retag/out/<id>.json, then:`);
  console.log(`  node scripts/retag-policies.mjs compile`);
}

// ── compile ─────────────────────────────────────────────────────────────────
function clampConfidence(v) {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return 0.7;
  return Math.max(0, Math.min(1, Math.round(n * 100) / 100));
}

async function compile() {
  const policies = await parsePolicies();
  const { byId } = await buildCatalog(policies);

  const missing = [];
  const dropped = [];
  const result = new Map(); // policyId → assignments[]

  for (const p of policies) {
    let raw;
    try {
      raw = JSON.parse(await fs.readFile(path.join(OUT_DIR, `${p.id}.json`), 'utf-8'));
    } catch {
      missing.push(p.id);
      continue;
    }
    const list = Array.isArray(raw) ? raw : Array.isArray(raw.assignments) ? raw.assignments : [];
    const seen = new Set();
    const assignments = [];
    for (const a of list) {
      const codeId = a?.codeId;
      if (!codeId || !byId.has(codeId)) {
        if (codeId) dropped.push(`${p.id}:${codeId}`);
        continue;
      }
      if (seen.has(codeId)) continue;
      seen.add(codeId);
      assignments.push({
        codeId,
        origin: 'ai',
        confidence: clampConfidence(a.confidence),
        rationale: (a.rationale ?? '').toString().replace(/\s+/g, ' ').trim().slice(0, 200),
      });
    }
    // Stable, diff-friendly ordering.
    assignments.sort((x, y) => x.codeId.localeCompare(y.codeId));
    if (assignments.length) result.set(p.id, assignments);
    else missing.push(p.id);
  }

  if (missing.length) {
    console.warn(`WARNING: ${missing.length} policies have no usable tags and will be SKIPPED:`);
    console.warn('  ' + missing.join(', '));
  }
  if (dropped.length) {
    console.warn(`WARNING: dropped ${dropped.length} unknown codeIds:`);
    console.warn('  ' + dropped.slice(0, 40).join(', ') + (dropped.length > 40 ? ' …' : ''));
  }
  if (result.size === 0) {
    console.error('No tags compiled — aborting without touching the tags file.');
    process.exit(1);
  }

  await fs.writeFile(TAGS_FILE, renderTagsFile(policies, result));
  let total = 0;
  for (const a of result.values()) total += a.length;
  console.log(`compiled ${result.size}/${policies.length} policies · ${total} tags`);
  console.log(`→ wrote ${path.relative(ROOT, TAGS_FILE)}`);
}

function renderTagsFile(policies, result) {
  const header = `// ---------------------------------------------------------------------------
// Per-policy master-code assignments — AI-generated baseline.
//
// This file was regenerated from scratch by a fleet of analysis agents that
// read each policy's title, summary and (where shipped) full legal text and
// assigned codes from the master taxonomy (see \`buildSeedSnapshot\` in
// ./seed.ts for the catalog). EVERY assignment starts life tagged as an
// "AI tag" (\`origin: 'ai'\`). When a human reviews a policy in the Policy
// Navigator or the workspace and agrees with a tag, they "confirm" it, which
// promotes that (policy, code) pair to a human tag (\`origin: 'human'\`).
// Confirmations are persisted server-side (content_analysis_master_tag_status)
// and merged over this baseline at runtime — see master-tag-status.ts.
//
// This block is machine-generated: prefer re-running the tagging agents over a
// taxonomy snapshot + the policy corpus rather than hand-editing assignments.
// (Live full text is fetched from EUR-Lex where reachable; otherwise the
// shipped full_text / summary is used.)
//
// Regenerate with: node scripts/retag-policies.mjs prepare → tag → compile
// ---------------------------------------------------------------------------

/** Who put a tag on a policy: an AI agent, or a human who confirmed it. */
export type TagOrigin = 'ai' | 'human';

/** A single master-code assignment on a policy, with provenance. */
export interface PolicyTagAssignment {
  /** Master-code id from the seeded taxonomy (e.g. \`code-ets\`). */
  codeId: string;
  /** \`'ai'\` for the generated baseline; \`'human'\` once confirmed. */
  origin: TagOrigin;
  /** Model confidence in [0, 1] for AI tags. */
  confidence?: number;
  /** One-line, evidence-grounded justification from the tagging agent. */
  rationale?: string;
}

/** Keys are Policy.id values from \`@/data/policies\`. Values are the
 *  AI-generated tag assignments for that policy (all \`origin: 'ai'\`). */
export const POLICY_TAG_ASSIGNMENTS: Record<string, PolicyTagAssignment[]> = {
`;

  const blocks = [];
  for (const p of policies) {
    const assignments = result.get(p.id);
    if (!assignments) continue;
    const lines = assignments.map((a) => {
      const parts = [`codeId: ${tsQuote(a.codeId)}`, `origin: 'ai'`, `confidence: ${a.confidence}`];
      if (a.rationale) parts.push(`rationale: ${tsQuote(a.rationale)}`);
      return `    { ${parts.join(', ')} },`;
    });
    blocks.push(`  // ${p.short_title}\n  ${tsQuote(p.id)}: [\n${lines.join('\n')}\n  ],`);
  }

  const footer = `};

/** Back-compat flat view: policy id → array of code ids. Derived from
 *  POLICY_TAG_ASSIGNMENTS so existing consumers (seed, navigator chips,
 *  policy-codes API, coherence matrix) keep working unchanged. */
export const POLICY_MASTER_TAGS: Record<string, string[]> = Object.fromEntries(
  Object.entries(POLICY_TAG_ASSIGNMENTS).map(([policyId, assignments]) => [
    policyId,
    assignments.map(a => a.codeId),
  ])
);

/** The AI-generated assignments for one policy (empty array if none). */
export function getPolicyTagAssignments(policyId: string): PolicyTagAssignment[] {
  return POLICY_TAG_ASSIGNMENTS[policyId] ?? [];
}
`;

  return header + blocks.join('\n') + '\n' + footer;
}

// ── CLI ─────────────────────────────────────────────────────────────────────
const cmd = process.argv[2];
const dispatch = { prepare, compile };
if (!dispatch[cmd]) {
  console.error('Usage: node scripts/retag-policies.mjs <prepare|compile>');
  process.exit(1);
}
dispatch[cmd]().catch((err) => {
  console.error(err);
  process.exit(1);
});
