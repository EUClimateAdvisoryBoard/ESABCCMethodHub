#!/usr/bin/env node
/**
 * Revalidate every verbatim quote in the Competitiveness Claims Register
 * (M · 47) as an exact substring of its stored source text.
 * ---------------------------------------------------------------------------
 * Ground rule 2 of this repository says quotes are verbatim substrings of the
 * source and are machine-revalidated wherever a build exists. Until now M · 47
 * had no build, and so asserted no quotes at all — every claim was an explicit
 * paraphrase, which was honest but left the module unpublishable. This script
 * is the missing build: it is what lets the module carry quotes.
 *
 * How it works. Each quoted claim names a `sourceFile` under
 * scripts/competitiveness-claims-sources/, which holds a normalised excerpt of
 * the primary document, cut around the quote with roughly 1–2 kB of context on
 * each side so a human can see what surrounds it. The check is a plain
 * substring test after one documented normalisation applied identically to
 * both sides:
 *
 *   - curly quotes and apostrophes folded to straight ones,
 *   - en/em/non-breaking dashes folded to a hyphen,
 *   - non-breaking spaces folded to spaces,
 *   - all runs of whitespace collapsed to a single space.
 *
 * That normalisation exists because PDF text extraction and HTML rendering
 * disagree about exactly these characters and about line breaks, not to give
 * a quote any latitude on its words. Nothing here rewrites a quote: a failure
 * is a failure, and the fix is to re-extract from the source, never to edit
 * the quote text until it passes.
 *
 * Ellipses. A quote may elide with ' … ', in which case each segment either
 * side is checked as a substring independently AND in order, so an ellipsis
 * cannot be used to stitch together text that does not appear in that
 * sequence in the source.
 *
 * Claims with `quote: null` are NOT failures — they are declared coverage
 * gaps and must carry a `quoteStatus` saying why. The script asserts that
 * pairing in both directions: a null quote without a reason fails, and a
 * quote that also carries a gap reason fails.
 *
 * Usage:  node scripts/check-competitiveness-quotes.mjs
 *         npm run check:claims
 * Exit code 1 on any failure, so it can gate CI.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_TS = join(ROOT, 'beta/modules/competitiveness-claims/data.generated.ts');
const SOURCE_DIR = join(ROOT, 'scripts/competitiveness-claims-sources');

/** The one normalisation, applied identically to quote and source. */
function normalise(s) {
  return s
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pull the quote records out of the data file. Parsing the TypeScript source
 * with a regex is deliberate: importing it would need a TS toolchain in the
 * check path, and the shape here is a flat literal that the module's own
 * types already constrain.
 */
function readQuotes(src) {
  const out = [];
  // Anchored on the exact indentation of a CLAIM entry. Proposition entries
  // nest two levels deeper and also carry an `id:`, so an unanchored pattern
  // happily pairs a proposition id with the next claim's quote — which is
  // precisely the kind of silent mis-association this checker exists to stop.
  const re =
    /\n {4}id: '([a-z0-9-]+)',\n(?:(?! {4}id: ')[\s\S])*? {4}quote: (null|\{[\s\S]*?\n {4}\}),\n {4}quoteStatus:\s*(null|'(?:[^'\\]|\\.)*')/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const [, id, quoteBlock, statusRaw] = m;
    if (quoteBlock === 'null') {
      out.push({ id, quote: null, status: statusRaw === 'null' ? null : statusRaw.slice(1, -1) });
      continue;
    }
    // Undo the TypeScript literal's own escaping before comparing. Without
    // this an apostrophe stored as \' is compared as backslash-apostrophe and
    // every quote containing one fails for a reason that has nothing to do
    // with whether the source says it.
    const unescape = (v) => v.replace(/\\(['"\\])/g, '$1');
    const text = /text:\s*\n?\s*(['"])([\s\S]*?)\1,\s*\n\s*locator:/.exec(quoteBlock);
    const file = /sourceFile:\s*'([^']+)'/.exec(quoteBlock);
    const locator = /locator:\s*(['"])([\s\S]*?)\1,/.exec(quoteBlock);
    out.push({
      id,
      quote: text ? unescape(text[2]) : null,
      locator: locator ? unescape(locator[2]) : null,
      sourceFile: file ? file[1] : null,
      status: statusRaw === 'null' ? null : statusRaw.slice(1, -1),
      malformed: !text || !file || !locator,
    });
  }
  return out;
}

function main() {
  if (!existsSync(DATA_TS)) throw new Error(`data file not found: ${DATA_TS}`);
  const src = readFileSync(DATA_TS, 'utf8');
  const records = readQuotes(src);

  if (records.length === 0) {
    process.stderr.write(
      'check:claims found no claim records at all. Either the data file changed shape or the\n' +
        'parser is stale — this is a failure, not a pass, because a checker that silently\n' +
        'checks nothing is worse than no checker.\n',
    );
    process.exit(1);
  }

  const failures = [];
  let checked = 0;
  let gaps = 0;

  for (const r of records) {
    if (r.malformed) {
      failures.push(`${r.id}: quote block is missing text, locator or sourceFile`);
      continue;
    }
    if (r.quote === null) {
      gaps += 1;
      if (!r.status) {
        failures.push(`${r.id}: quote is null but no quoteStatus explains why`);
      }
      continue;
    }
    if (r.status) {
      failures.push(`${r.id}: carries BOTH a quote and a quoteStatus gap reason — pick one`);
    }
    const path = join(SOURCE_DIR, r.sourceFile);
    if (!existsSync(path)) {
      failures.push(`${r.id}: source excerpt not found: scripts/competitiveness-claims-sources/${r.sourceFile}`);
      continue;
    }
    const haystack = normalise(readFileSync(path, 'utf8'));
    const segments = r.quote.split(/\s*[…]\s*|\s*\.\.\.\s*/).map(normalise).filter(Boolean);
    let cursor = 0;
    let ok = true;
    for (const seg of segments) {
      const at = haystack.indexOf(seg, cursor);
      if (at === -1) {
        ok = false;
        failures.push(
          `${r.id}: quote segment not found in ${r.sourceFile}\n      wanted: ${seg.slice(0, 120)}${seg.length > 120 ? '…' : ''}`,
        );
        break;
      }
      cursor = at + seg.length;
    }
    // A quote longer than roughly 60 words is a house-style violation, not a
    // correctness one, so it warns rather than fails.
    const words = r.quote.split(/\s+/).length;
    if (ok && words > 60) {
      process.stdout.write(`  warn ${r.id}: quote is ${words} words, house limit is ~60\n`);
    }
    if (ok) checked += 1;
  }

  // An orphaned excerpt means a quote was deleted without its source; harmless
  // but worth surfacing so the directory does not silently accumulate.
  // An excerpt may back a proposition's evidence rather than a claim-level
  // quote, so "referenced" means named anywhere in the data file, not just in
  // a sourceFile field.
  const orphans = existsSync(SOURCE_DIR)
    ? readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.txt') && !src.includes(f))
    : [];
  for (const o of orphans) process.stdout.write(`  note: unreferenced source excerpt ${o}\n`);

  process.stdout.write(
    `check:claims — ${records.length} claims: ${checked} quotes revalidated, ${gaps} declared gaps.\n`,
  );
  if (failures.length) {
    process.stderr.write(`\n${failures.length} FAILURE(S):\n`);
    for (const f of failures) process.stderr.write(`  - ${f}\n`);
    process.stderr.write(
      '\nFix a failing quote by re-extracting it from the source, never by editing the quote\n' +
        'text until it matches.\n',
    );
    process.exit(1);
  }
}

try {
  main();
} catch (err) {
  process.stderr.write(`check-competitiveness-quotes failed: ${err.message}\n`);
  process.exit(1);
}
