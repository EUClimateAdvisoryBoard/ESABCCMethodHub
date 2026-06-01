/**
 * Spreadsheet expression engine for the Indicator Database calc mode.
 * -------------------------------------------------------------------
 * Pure and client-safe (no exceljs, no DOM). Powers the "real Excel-like"
 * derived columns: a column can carry a free-form formula referencing other
 * columns — e.g.
 *
 *     = [Raw] * [Multiplier]
 *     = (B - C) / B * 100
 *     = ROUND([GDP] / [Population], 2)
 *     = SUM(C) / COUNT(C)
 *
 * References
 * ----------
 *   • [Header name]    — a column by its (case-insensitive) header. Brackets
 *                        let headers contain spaces / punctuation.
 *   • A B C …          — a column by its spreadsheet letter. A is always the
 *                        Year column, B the first data column ("Value"), C the
 *                        next helper column, and so on (matches the Excel
 *                        round-trip layout exactly).
 *   • bare words       — resolved as a header first, then as a column letter.
 *
 * Operators:  + - * / ^   unary -   comparisons > < >= <= = <>  (for IF).
 * Functions:  ABS MIN MAX ROUND SQRT POW MOD IF
 *             SUM AVG/AVERAGE COUNT MEDIAN MINCOL MAXCOL  (column aggregates).
 *
 * The engine never throws on bad input: parse() returns a diagnostic and
 * evaluate() yields `null` for anything undefined (blank inputs, /0, NaN …),
 * which the grid renders as "—" and excludes from the plotted series.
 */

// ── Tokens ───────────────────────────────────────────────────────────────────
type TokKind = 'num' | 'ref' | 'ident' | 'op' | 'lparen' | 'rparen' | 'comma';
interface Tok {
  kind: TokKind;
  value: string;
  pos: number;
}

const OP_CHARS = new Set(['+', '-', '*', '/', '^', '(', ')', ',', '>', '<', '=']);

function tokenize(src: string): { tokens: Tok[]; error?: string } {
  const tokens: Tok[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }
    // Bracketed column reference: [Some header]
    if (ch === '[') {
      const end = src.indexOf(']', i + 1);
      if (end === -1) return { tokens, error: 'Unclosed “[” in column reference.' };
      tokens.push({ kind: 'ref', value: src.slice(i + 1, end).trim(), pos: i });
      i = end + 1;
      continue;
    }
    // Number (supports 1, 1.5, .5, 1e3, 1.2E-4)
    if (ch >= '0' && ch <= '9') {
      let j = i + 1;
      while (j < n && /[0-9.]/.test(src[j])) j++;
      if (j < n && (src[j] === 'e' || src[j] === 'E')) {
        j++;
        if (j < n && (src[j] === '+' || src[j] === '-')) j++;
        while (j < n && src[j] >= '0' && src[j] <= '9') j++;
      }
      tokens.push({ kind: 'num', value: src.slice(i, j), pos: i });
      i = j;
      continue;
    }
    // Identifier — a bare word (column letter, header, or function name).
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_.]/.test(src[j])) j++;
      tokens.push({ kind: 'ident', value: src.slice(i, j), pos: i });
      i = j;
      continue;
    }
    // Multi-char comparison operators.
    if (ch === '>' || ch === '<') {
      if (src[i + 1] === '=') {
        tokens.push({ kind: 'op', value: ch + '=', pos: i });
        i += 2;
        continue;
      }
      if (ch === '<' && src[i + 1] === '>') {
        tokens.push({ kind: 'op', value: '<>', pos: i });
        i += 2;
        continue;
      }
    }
    if (OP_CHARS.has(ch)) {
      const kind: TokKind =
        ch === '(' ? 'lparen' : ch === ')' ? 'rparen' : ch === ',' ? 'comma' : 'op';
      tokens.push({ kind, value: ch, pos: i });
      i++;
      continue;
    }
    return { tokens, error: `Unexpected character “${ch}”.` };
  }
  return { tokens };
}

// ── AST ──────────────────────────────────────────────────────────────────────
export type Node =
  | { k: 'num'; v: number }
  | { k: 'ref'; name: string }
  | { k: 'unary'; op: '-' | '+'; e: Node }
  | { k: 'bin'; op: string; a: Node; b: Node }
  | { k: 'call'; name: string; args: Node[] };

export interface ParsedFormula {
  ast: Node | null;
  error?: string;
  /** Distinct column references used (header text or letter, as written). */
  refs: string[];
}

// ── Parser (recursive descent, standard precedence) ──────────────────────────
function parseTokens(tokens: Tok[]): { ast: Node | null; error?: string } {
  let p = 0;
  const peek = () => tokens[p];
  const eat = () => tokens[p++];

  function parseExpr(): Node {
    return parseComparison();
  }
  function parseComparison(): Node {
    let left = parseAddSub();
    while (peek() && peek().kind === 'op' && ['>', '<', '>=', '<=', '=', '<>'].includes(peek().value)) {
      const op = eat().value;
      const right = parseAddSub();
      left = { k: 'bin', op, a: left, b: right };
    }
    return left;
  }
  function parseAddSub(): Node {
    let left = parseMulDiv();
    while (peek() && peek().kind === 'op' && (peek().value === '+' || peek().value === '-')) {
      const op = eat().value;
      const right = parseMulDiv();
      left = { k: 'bin', op, a: left, b: right };
    }
    return left;
  }
  function parseMulDiv(): Node {
    let left = parsePower();
    while (peek() && peek().kind === 'op' && (peek().value === '*' || peek().value === '/')) {
      const op = eat().value;
      const right = parsePower();
      left = { k: 'bin', op, a: left, b: right };
    }
    return left;
  }
  function parsePower(): Node {
    const left = parseUnary();
    if (peek() && peek().kind === 'op' && peek().value === '^') {
      eat();
      const right = parsePower(); // right-associative
      return { k: 'bin', op: '^', a: left, b: right };
    }
    return left;
  }
  function parseUnary(): Node {
    const t = peek();
    if (t && t.kind === 'op' && (t.value === '-' || t.value === '+')) {
      eat();
      return { k: 'unary', op: t.value as '-' | '+', e: parseUnary() };
    }
    return parsePrimary();
  }
  function parsePrimary(): Node {
    const t = peek();
    if (!t) throw new Error('Unexpected end of formula.');
    if (t.kind === 'num') {
      eat();
      return { k: 'num', v: Number(t.value) };
    }
    if (t.kind === 'ref') {
      eat();
      return { k: 'ref', name: t.value };
    }
    if (t.kind === 'lparen') {
      eat();
      const e = parseExpr();
      if (!peek() || peek().kind !== 'rparen') throw new Error('Missing “)”.');
      eat();
      return e;
    }
    if (t.kind === 'ident') {
      eat();
      // Function call?
      if (peek() && peek().kind === 'lparen') {
        eat();
        const args: Node[] = [];
        if (peek() && peek().kind !== 'rparen') {
          args.push(parseExpr());
          while (peek() && peek().kind === 'comma') {
            eat();
            args.push(parseExpr());
          }
        }
        if (!peek() || peek().kind !== 'rparen') throw new Error(`Missing “)” after ${t.value}(…`);
        eat();
        return { k: 'call', name: t.value.toUpperCase(), args };
      }
      // Bare reference (header or column letter).
      return { k: 'ref', name: t.value };
    }
    throw new Error(`Unexpected “${t.value}”.`);
  }

  try {
    if (tokens.length === 0) return { ast: null, error: 'Empty formula.' };
    const ast = parseExpr();
    if (p < tokens.length) return { ast: null, error: `Unexpected “${tokens[p].value}”.` };
    return { ast };
  } catch (e) {
    return { ast: null, error: (e as Error).message };
  }
}

function collectRefs(node: Node | null, into: Set<string>) {
  if (!node) return;
  switch (node.k) {
    case 'ref':
      into.add(node.name);
      break;
    case 'unary':
      collectRefs(node.e, into);
      break;
    case 'bin':
      collectRefs(node.a, into);
      collectRefs(node.b, into);
      break;
    case 'call':
      node.args.forEach(a => collectRefs(a, into));
      break;
  }
}

/** Strip a leading "=" and parse. Returns the AST plus diagnostics + refs. */
export function parseFormula(input: string): ParsedFormula {
  const src = input.replace(/^\s*=/, '').trim();
  const { tokens, error: tErr } = tokenize(src);
  if (tErr) return { ast: null, error: tErr, refs: [] };
  const { ast, error } = parseTokens(tokens);
  const refs = new Set<string>();
  collectRefs(ast, refs);
  return { ast, error, refs: Array.from(refs) };
}

// ── Evaluation ───────────────────────────────────────────────────────────────
export interface EvalContext {
  /** Value of a referenced column in the current row (null = blank/NA). */
  cell: (ref: string) => number | null;
  /** All values of a referenced column, for aggregate functions. */
  column: (ref: string) => (number | null)[];
}

const AGGREGATES = new Set(['SUM', 'AVG', 'AVERAGE', 'COUNT', 'MEDIAN', 'MINCOL', 'MAXCOL']);

/** Function names this engine understands (for the helper / autocomplete UI). */
export const FUNCTIONS = [
  'ABS',
  'ROUND',
  'SQRT',
  'POW',
  'MOD',
  'MIN',
  'MAX',
  'IF',
  'SUM',
  'AVG',
  'COUNT',
  'MEDIAN',
] as const;

function fin(n: number): number | null {
  return Number.isFinite(n) ? n : null;
}

export function evaluate(ast: Node | null, ctx: EvalContext): number | null {
  if (!ast) return null;
  switch (ast.k) {
    case 'num':
      return fin(ast.v);
    case 'ref':
      return ctx.cell(ast.name);
    case 'unary': {
      const v = evaluate(ast.e, ctx);
      if (v === null) return null;
      return ast.op === '-' ? -v : v;
    }
    case 'bin': {
      const a = evaluate(ast.a, ctx);
      const b = evaluate(ast.b, ctx);
      if (a === null || b === null) return null;
      switch (ast.op) {
        case '+':
          return fin(a + b);
        case '-':
          return fin(a - b);
        case '*':
          return fin(a * b);
        case '/':
          return b === 0 ? null : fin(a / b);
        case '^':
          return fin(Math.pow(a, b));
        case '>':
          return a > b ? 1 : 0;
        case '<':
          return a < b ? 1 : 0;
        case '>=':
          return a >= b ? 1 : 0;
        case '<=':
          return a <= b ? 1 : 0;
        case '=':
          return a === b ? 1 : 0;
        case '<>':
          return a !== b ? 1 : 0;
        default:
          return null;
      }
    }
    case 'call':
      return evalCall(ast, ctx);
  }
}

function evalCall(node: Extract<Node, { k: 'call' }>, ctx: EvalContext): number | null {
  const name = node.name;

  // Aggregates expand any column-reference argument to its whole-column vector.
  if (AGGREGATES.has(name)) {
    const vals: number[] = [];
    for (const arg of node.args) {
      if (arg.k === 'ref') {
        for (const v of ctx.column(arg.name)) if (v !== null) vals.push(v);
      } else {
        const v = evaluate(arg, ctx);
        if (v !== null) vals.push(v);
      }
    }
    if (name === 'COUNT') return vals.length;
    if (vals.length === 0) return null;
    switch (name) {
      case 'SUM':
        return fin(vals.reduce((s, x) => s + x, 0));
      case 'AVG':
      case 'AVERAGE':
        return fin(vals.reduce((s, x) => s + x, 0) / vals.length);
      case 'MINCOL':
        return fin(Math.min(...vals));
      case 'MAXCOL':
        return fin(Math.max(...vals));
      case 'MEDIAN': {
        const s = [...vals].sort((a, b) => a - b);
        const m = Math.floor(s.length / 2);
        return fin(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
      }
    }
  }

  const args = node.args.map(a => evaluate(a, ctx));
  const a0 = args[0];
  const a1 = args[1];
  const a2 = args[2];
  switch (name) {
    case 'ABS':
      return a0 === null ? null : Math.abs(a0);
    case 'SQRT':
      return a0 === null || a0 < 0 ? null : Math.sqrt(a0);
    case 'ROUND': {
      if (a0 === null) return null;
      const d = a1 === null || a1 === undefined ? 0 : Math.trunc(a1);
      const f = Math.pow(10, d);
      return fin(Math.round(a0 * f) / f);
    }
    case 'POW':
      return a0 === null || a1 === null ? null : fin(Math.pow(a0, a1));
    case 'MOD':
      return a0 === null || a1 === null || a1 === 0 ? null : fin(a0 % a1);
    case 'MIN': {
      const xs = args.filter((x): x is number => x !== null);
      return xs.length ? Math.min(...xs) : null;
    }
    case 'MAX': {
      const xs = args.filter((x): x is number => x !== null);
      return xs.length ? Math.max(...xs) : null;
    }
    case 'IF':
      if (a0 === null) return null;
      return a0 !== 0 ? a1 ?? null : a2 ?? null;
    default:
      return null;
  }
}

// ── Excel A1 emission ────────────────────────────────────────────────────────
/**
 * Re-emits a parsed formula as an Excel A1 formula for a specific worksheet
 * row, so the downloaded workbook computes live. `letterOf(ref)` maps a column
 * reference (header or letter, as written) to its Excel column letter; it
 * returns null when the reference can't be resolved. Returns null when the
 * formula uses an aggregate (whose Excel range we don't emit here) or any
 * reference fails to resolve — callers then fall back to a literal value.
 */
export function toExcelFormula(
  ast: Node | null,
  rowNumber: number,
  letterOf: (ref: string) => string | null
): string | null {
  if (!ast) return null;
  let ok = true;
  const emit = (n: Node): string => {
    switch (n.k) {
      case 'num':
        return String(n.v);
      case 'ref': {
        const L = letterOf(n.name);
        if (!L) {
          ok = false;
          return '#REF';
        }
        return `${L}${rowNumber}`;
      }
      case 'unary':
        return `${n.op}${emit(n.e)}`;
      case 'bin': {
        const op = n.op === '<>' ? '<>' : n.op === '=' ? '=' : n.op;
        return `(${emit(n.a)}${op}${emit(n.b)})`;
      }
      case 'call':
        if (AGGREGATES.has(n.name)) {
          ok = false;
          return '';
        }
        return `${n.name === 'AVG' ? 'AVERAGE' : n.name}(${n.args.map(emit).join(',')})`;
    }
  };
  const out = emit(ast);
  return ok ? out : null;
}
