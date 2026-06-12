#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Build `public/content-analysis/policy-bodies.json` from the policy texts
// already shipped in `public/data/policy-texts/*.txt` (the corpus the daily
// `fetch-eurlex-texts.js` workflow maintains and the Policy Navigator serves).
//
// This is the offline complement to `prefetch-eurlex-bodies.mjs`: that script
// needs EUR-Lex network access (often WAF-blocked in CI), while this one only
// repackages texts that are already in the repo. The Content Analysis module
// lazy-fetches the JSON on mount (`applyPolicyBodies`), which swaps each
// policy's 24 kB seed stub for the real legal text, re-derives blocks and
// re-anchors the seeded checklist + coherence annotations — turning the
// coherence evidence into word-exact in-text highlights.
//
// Output discipline:
//   • Annexes are trimmed: text is cut shortly after the enacting-terms
//     signature ("Done at …"), keeping every article (all curated provision
//     anchors live in articles or recitals) while halving the payload.
//   • Per-document hard cap (CAP_CHARS) keeps the largest acts (AI Act,
//     CAP Strategic Plans) bounded.
//   • The JSON is generated at build time (`prebuild`) and gitignored —
//     it duplicates repo content, so committing it would just bloat diffs.
//     For `npm run dev`, run `npm run build:policy-bodies` once by hand.
//
// localStorage stays safe regardless of payload size: the store marks merged
// bodies `staticBody: true` and `persist()` strips them back down to the seed
// cap, because the full body is re-merged from this file on every mount.
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TEXTS_DIR = path.join(ROOT, 'public/data/policy-texts');
const OUTPUT_FILE = path.join(ROOT, 'public/content-analysis/policy-bodies.json');

const CAP_CHARS = 550_000; // hard per-document ceiling (AI Act ≈ 514 kB enacted)
const MIN_CHARS = 400; // skip placeholder/scrape-failure files
const SIGNATURE_TAIL = 2_000; // keep the signature block after "Done at …"

function trimAnnexes(text) {
  const done = text.search(/^Done at /m);
  if (done > 0) return text.slice(0, Math.min(done + SIGNATURE_TAIL, text.length));
  return text;
}

/** Drop EUR-Lex web-page chrome that some scraped files carry at the top
 *  (e.g. cap-strategic-plans.txt starts with site navigation). The legal
 *  text reliably starts at the OJ header or the act title. */
function trimChrome(text) {
  const m = text.search(/^(REGULATION|DIRECTIVE|DECISION|COMMUNICATION|Official Journal)\b/m);
  return m > 0 ? text.slice(m) : text;
}

function main() {
  if (!fs.existsSync(TEXTS_DIR)) {
    console.error(`No policy-texts directory at ${TEXTS_DIR}`);
    process.exit(1);
  }
  const out = {};
  let total = 0;
  for (const file of fs.readdirSync(TEXTS_DIR).sort()) {
    if (!file.endsWith('.txt')) continue;
    const id = file.slice(0, -4);
    const raw = fs.readFileSync(path.join(TEXTS_DIR, file), 'utf8');
    if (raw.trim().length < MIN_CHARS) continue;
    const text = trimAnnexes(trimChrome(raw)).slice(0, CAP_CHARS).trim();
    if (text.length < MIN_CHARS) continue;
    out[id] = { text };
    total += text.length;
  }
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(out));
  console.log(
    `policy-bodies.json: ${Object.keys(out).length} documents, ` +
      `${(total / 1048576).toFixed(1)} MB of text → ${(fs.statSync(OUTPUT_FILE).size / 1048576).toFixed(1)} MB JSON`,
  );
}

main();
