#!/usr/bin/env node
/**
 * Guard against policy-registry drift.
 *
 * The sectoral overlay (`src/data/sectoral-policies.ts`) bridges its own
 * policy ids to the canonical Policy Navigator registry
 * (`src/data/policies.ts`) through the `SECTOR_TO_VIEWER_ID` map and the
 * `getViewerPolicyId()` helper. Cross-module deep links
 * (`/content-analysis?doc=…`, `/policy-navigator/policy?id=…`) rely on every
 * mapped target actually existing in the canonical registry — otherwise a
 * "read the article" chip silently points at a document that isn't there.
 *
 * This script fails (exit 1) if any `SECTOR_TO_VIEWER_ID` target is missing
 * from the canonical registry, so drift is caught before it ships rather
 * than discovered as a dead link. Run it with `npm run check:policies`.
 *
 * It parses the data files as text on purpose: they are large TypeScript
 * modules with no runtime data dependencies worth importing, and a plain
 * read keeps the check free of a TS toolchain.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const policiesSrc = readFileSync(join(root, 'src/data/policies.ts'), 'utf8');
const sectoralSrc = readFileSync(join(root, 'src/data/sectoral-policies.ts'), 'utf8');

// Canonical Policy ids — top-level `    id: '…',` entries in the policies array.
const canonicalIds = new Set(
  [...policiesSrc.matchAll(/^\s{4}id:\s*'([^']+)'/gm)].map((m) => m[1]),
);

// SECTOR_TO_VIEWER_ID target ids (the right-hand side of each mapping).
const mapBlock = sectoralSrc.slice(
  sectoralSrc.indexOf('SECTOR_TO_VIEWER_ID'),
  sectoralSrc.indexOf('getViewerPolicyId'),
);
const targets = [...mapBlock.matchAll(/:\s*'([^']+)'/g)].map((m) => m[1]);

if (canonicalIds.size === 0 || targets.length === 0) {
  console.error(
    '[check:policies] Could not parse one of the registries — the file ' +
      'format may have changed. Update this script.',
  );
  process.exit(2);
}

const missing = [...new Set(targets)].filter((t) => !canonicalIds.has(t));

if (missing.length > 0) {
  console.error(
    `[check:policies] ${missing.length} SECTOR_TO_VIEWER_ID target(s) do not ` +
      'exist in the canonical policy registry (src/data/policies.ts):',
  );
  for (const id of missing) console.error(`  - '${id}'`);
  console.error(
    '\nEither add the policy to src/data/policies.ts or fix the mapping in ' +
      'src/data/sectoral-policies.ts.',
  );
  process.exit(1);
}

console.log(
  `[check:policies] OK — all ${new Set(targets).size} sectoral→canonical ` +
    `mappings resolve against ${canonicalIds.size} canonical policies.`,
);
