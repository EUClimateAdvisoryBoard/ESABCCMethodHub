/**
 * Solver adapter: turns the solver-agnostic `LPProblem` (see types.ts) into HiGHS's CPLEX
 * .lp text format, solves it with the `highs` package (a WASM build of the same open-source
 * HiGHS solver the Julia reference model uses via JuMP), and normalizes the result.
 *
 * The HiGHS WASM module is loaded once (module-level cache) and reused for every solve — the
 * loader itself is the slow part (~one-off WASM instantiation); each individual `solve()` call
 * on this LP's size (~450 variables, ~700 rows) is fast (see the parity-test timing).
 */

import type { LPConstraint, LPProblem, LPTerm, SolveOutcome } from './types';

type HighsInstance = {
  solve(problem: string, options?: Record<string, unknown>): {
    Status: string;
    ObjectiveValue: number;
    Columns: Record<string, { Primal: number }>;
  };
};

let highsInstancePromise: Promise<HighsInstance> | null = null;

function loadHighs(): Promise<HighsInstance> {
  if (!highsInstancePromise) {
    highsInstancePromise = (async () => {
      const mod = await import('highs');
      const highsLoader = mod.default as (opts?: { locateFile?: (f: string) => string }) => Promise<HighsInstance>;
      const isBrowser = typeof window !== 'undefined';
      return highsLoader(
        isBrowser
          ? {
              // highs.wasm is copied to /public/highs.wasm (see scripts/copy-highs-wasm.mjs) so it
              // is served from the site's own origin, same-origin under the site's CSP.
              locateFile: (file: string) => `/${file}`,
            }
          : undefined,
      );
    })();
  }
  return highsInstancePromise;
}

function fmtNum(x: number): string {
  if (!Number.isFinite(x)) throw new Error(`Non-finite LP coefficient/RHS: ${x}`);
  const v = Object.is(x, -0) ? 0 : x;
  return String(v);
}

function termsToLp(terms: LPTerm[]): string {
  const nonZero = terms.filter((t) => t.coef !== 0);
  if (nonZero.length === 0) return '0 __zero_dummy__';
  return nonZero
    .map(({ coef, v }) => {
      const sign = coef < 0 ? '-' : '+';
      const abs = Math.abs(coef);
      const coefStr = abs === 1 ? '' : `${fmtNum(abs)} `;
      return `${sign} ${coefStr}${v}`;
    })
    .join(' ');
}

function constraintToLp(c: LPConstraint): string {
  return ` ${c.name}: ${termsToLp(c.terms)} ${c.sense} ${fmtNum(c.rhs)}`;
}

export function buildLpText(problem: LPProblem): string {
  const lines: string[] = [];
  lines.push('Minimize');
  lines.push(` obj: ${termsToLp(problem.objective)}`);
  lines.push('Subject To');
  for (const c of problem.constraints) {
    if (c.terms.length === 0) continue;
    lines.push(constraintToLp(c));
  }
  if (problem.fixedZero.length > 0) {
    lines.push('Bounds');
    for (const v of problem.fixedZero) lines.push(` ${v} = 0`);
  }
  lines.push('End');
  return lines.join('\n');
}

const OPTIMAL = 'Optimal';
const INFEASIBLE_STATUSES = new Set(['Infeasible', 'Primal infeasible or unbounded']);

export async function solveLP(problem: LPProblem): Promise<SolveOutcome> {
  const highs = await loadHighs();
  const lpText = buildLpText(problem);
  const sol = highs.solve(lpText, { presolve: 'on', output_flag: false, log_to_console: false });

  if (sol.Status === OPTIMAL) {
    const values: Record<string, number> = {};
    for (const name of Object.keys(sol.Columns)) values[name] = sol.Columns[name].Primal;
    return { status: 'optimal', objective: sol.ObjectiveValue, values, solverName: 'highs-wasm' };
  }
  if (INFEASIBLE_STATUSES.has(sol.Status)) {
    return { status: 'infeasible', objective: NaN, values: {}, solverName: 'highs-wasm', message: `HiGHS status: ${sol.Status}` };
  }
  return { status: 'error', objective: NaN, values: {}, solverName: 'highs-wasm', message: `HiGHS status: ${sol.Status}` };
}
