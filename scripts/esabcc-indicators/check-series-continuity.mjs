/**
 * Flag indicator series that break at the report boundary.
 * ---------------------------------------------------------------------------
 * The report published each series up to its own last data year; later years
 * were appended afterwards and carry `afterReport: true`. If an appended value
 * was computed on a different basis from the ones before it — a different
 * dataset, a rebased index, a fraction where the series holds a percent, a
 * publisher revision applied to only one end — the series takes a step that
 * has nothing to do with the world.
 *
 * This measures each appended step against the SERIES' OWN normal movement
 * rather than a fixed threshold, because "a big move" means something
 * different for total EU emissions (median 2.4 % a year) than for heat-pump
 * sales (median 50 %). A step many times a series' own median is the signal.
 *
 * It cannot tell a real event from an artefact — 2023 really did see fossil
 * generation fall off a cliff. It tells you WHERE to look, and the
 * accompanying fact-check says which is which. Points already adjudicated as
 * real movements are listed in ACCEPTED so the check stays quiet about them
 * and stays loud about anything new.
 *
 * Usage:
 *   node scripts/esabcc-indicators/check-series-continuity.mjs          # report
 *   node scripts/esabcc-indicators/check-series-continuity.mjs --strict # exit 1 on unaccepted
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TS_FILE = join(__dirname, '..', '..', 'src', 'data', 'esabcc-indicators.ts');

/**
 * Steps adjudicated as REAL by the July-2026 boundary-jump fact-check, with the
 * evidence that settled each one. Anything not in here that trips the threshold
 * is unreviewed and fails --strict.
 */
export const ACCEPTED = {};

const THRESHOLD = 3; // multiples of the series' own median |yoy|

function parse(src) {
  const starts = [];
  const idRe = /\n  \{\n    id: '([^']+)',/g;
  let m;
  while ((m = idRe.exec(src))) starts.push({ id: m[1], at: m.index });
  const out = [];
  for (let i = 0; i < starts.length; i++) {
    const b = src.slice(starts[i].at, i + 1 < starts.length ? starts[i + 1].at : src.length);
    const dm = /\n    data: \[([\s\S]*?)\],\n/.exec(b);
    const data = [];
    if (dm) {
      const p = /\{\s*year:\s*(-?\d+),\s*value:\s*(-?[\d.]+)(,\s*afterReport:\s*true)?\s*\}/g;
      let q;
      while ((q = p.exec(dm[1]))) data.push({ year: +q[1], value: +q[2], after: !!q[3] });
    }
    out.push({
      id: starts[i].id,
      code: /\n    code: '([^']*)'/.exec(b)?.[1],
      unit: /\n    unit: '([^']*)'/.exec(b)?.[1],
      data,
    });
  }
  return out;
}

export function findBreaks(indicators) {
  const breaks = [];
  for (const ind of indicators) {
    const d = ind.data.filter(p => Number.isFinite(p.value)).sort((a, b) => a.year - b.year);
    if (d.length < 4) continue;
    const yoy = [];
    for (let i = 1; i < d.length; i++) {
      const base = Math.abs(d[i - 1].value);
      if (base < 1e-9) continue;
      yoy.push({ year: d[i].year, pct: (d[i].value - d[i - 1].value) / base * 100, after: d[i].after });
    }
    const hist = yoy.filter(x => !x.after).map(x => Math.abs(x.pct)).sort((a, b) => a - b);
    if (!hist.length) continue;
    const med = hist[Math.floor(hist.length / 2)];
    for (const x of yoy.filter(x => x.after)) {
      // a series that never moves would divide by ~0; floor it so a 0.1 % step
      // on a flat series does not read as a hundredfold break
      const ratio = Math.abs(x.pct) / Math.max(med, 0.05);
      if (ratio > THRESHOLD) {
        breaks.push({ code: ind.code, id: ind.id, year: x.year, pct: x.pct, med, ratio,
                      accepted: ACCEPTED[`${ind.code} ${x.year}`] ?? null });
      }
    }
  }
  return breaks.sort((a, b) => b.ratio - a.ratio);
}

const breaks = findBreaks(parse(await readFile(TS_FILE, 'utf8')));
const unreviewed = breaks.filter(b => !b.accepted);

console.log(`${breaks.length} post-report step${breaks.length === 1 ? '' : 's'} exceed ` +
            `${THRESHOLD}x the series' own median movement ` +
            `(${breaks.length - unreviewed.length} adjudicated real, ${unreviewed.length} unreviewed)\n`);
for (const b of breaks) {
  console.log(`  ${b.code.padEnd(28)} ${b.year}  ${b.pct.toFixed(1).padStart(8)}%  ` +
              `${b.ratio.toFixed(1).padStart(5)}x median  ` +
              (b.accepted ? `OK — ${b.accepted}` : 'UNREVIEWED'));
}

if (process.argv.includes('--strict') && unreviewed.length) {
  console.error(`\n${unreviewed.length} unreviewed break(s). Fact-check them, then add the ` +
                `verdict to ACCEPTED in this file.`);
  process.exit(1);
}
