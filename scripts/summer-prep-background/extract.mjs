/**
 * Pull the Summer Prep source data out of the Method Hub's own TypeScript
 * modules into one JSON file, which the four document builders read.
 *
 * Runs the TS DIRECTLY through Node's type stripping — no bundler, no build
 * step, and above all no cached copy that can silently go stale. (An earlier
 * version of this was pre-bundled once and then re-run for hours against that
 * snapshot, so edits to the data files never reached the documents. Reading
 * the modules live is what stops that happening again — and the canary line
 * it prints is there to make a stale read visible immediately.)
 *
 * Usage:
 *   node --experimental-strip-types scripts/summer-prep-background/extract.mjs data.json
 *
 * Requires Node 22+ (type stripping). On older Node, run it through tsx.
 */

import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'data');

const [pg, sg, syn, ind] = await Promise.all([
  import(join(DATA, 'policy-gaps.ts')),
  import(join(DATA, 'summer-prep-sector-gaps.ts')),
  import(join(DATA, 'summer-prep-synergies.ts')),
  import(join(DATA, 'esabcc-indicators.ts')),
]);

const plain = m => Object.fromEntries(
  Object.entries(m).filter(([, v]) => typeof v !== 'function'));

const out = {
  generatedAt: new Date().toISOString(),
  policyGaps: plain(pg),
  sectorGaps: plain(sg),
  synergies: plain(syn),
  indicators: ind.ESABCC_REPORT_INDICATORS,
};

const target = resolve(process.argv[2] ?? 'data.json');
writeFileSync(target, JSON.stringify(out, null, 1));

const b6 = out.indicators.find(i => i.code === 'B6');
console.log(
  `gaps ${out.policyGaps.POLICY_GAPS.length} | synergies ${out.synergies.SYNERGIES.length} | ` +
  `candidates ${out.sectorGaps.CANDIDATE_GAPS.length} | ` +
  `reassessments ${Object.keys(out.sectorGaps.GAP_REASSESSMENTS).length} | ` +
  `indicators ${out.indicators.length}`);
// Canary: a stale read shows up here immediately (this value was corrected
// from 60 to 41.5 in the July-2026 content fact-check).
console.log(`→ ${target}  (canary: B6 target = ${b6?.targetValue})`);
