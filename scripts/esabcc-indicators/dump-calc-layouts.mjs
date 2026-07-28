/**
 * Collapse the calc-grid migrations into the single layout map the workbook
 * builders read.
 * ---------------------------------------------------------------------------
 * An indicator's calc grid is built up across migrations: 045 seeded them, 052
 * added the descriptions, 078 aligned them to the report's derivation, 079
 * filled the post-report rows and 080 replaced 079 for the indicators whose own
 * inputs can still be refreshed. The database ends up with the last write for
 * each indicator, so the builders have to see the same thing — reading only one
 * migration reproduces a grid the Hub stopped showing several migrations ago.
 *
 * Applied in filename order, last write wins, exactly as the database applies
 * them.
 *
 * Usage:  node scripts/esabcc-indicators/dump-calc-layouts.mjs calc.json
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(__dirname, '..', '..', 'supabase', 'migrations');

/**
 * The id character class matters: an id with an uppercase letter
 * (`esabcc-e2-res-noBio-power-share`) was missed by a lowercase-only pattern,
 * and the builder silently substituted a synthesised grid for a real one.
 */
const LAYOUT_RE = /\('([A-Za-z0-9_-]+)',\s*'(\{[\s\S]*?\})'::jsonb\)/g;

const files = (await readdir(MIGRATIONS))
  .filter(f => f.endsWith('.sql'))
  .sort();

const layouts = {};
const provenance = {};
for (const f of files) {
  const sql = await readFile(join(MIGRATIONS, f), 'utf8');
  if (!sql.includes('pw_indicator_sheets')) continue;
  let m, n = 0;
  while ((m = LAYOUT_RE.exec(sql))) {
    try {
      layouts[m[1]] = JSON.parse(m[2].replace(/''/g, "'"));
      provenance[m[1]] = f;
      n++;
    } catch {
      // a layout that will not parse is worse than absent — it would ship a
      // half-read grid — so it is dropped and counted
      console.error(`  ! ${f}: unparseable layout for ${m[1]}`);
    }
  }
  if (n) console.log(`  ${f.padEnd(46)} ${n} layout${n === 1 ? '' : 's'}`);
}

const target = resolve(process.argv[2] ?? 'calc.json');
await writeFile(target, JSON.stringify(layouts, null, 1));

const bySource = {};
for (const f of Object.values(provenance)) bySource[f] = (bySource[f] ?? 0) + 1;
console.log(`\n${Object.keys(layouts).length} layouts → ${target}`);
console.log('effective source per indicator:');
for (const [f, n] of Object.entries(bySource).sort()) console.log(`  ${f.padEnd(46)} ${n}`);
