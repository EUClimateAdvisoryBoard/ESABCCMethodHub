/**
 * The calc-grid formula engine, shared by the post-report builders.
 *
 * Mirrors src/lib/project-workspace/formula.ts for the subset the seeded grids
 * use: + - * / parentheses, [Header] and column-letter refs (A = Year), ROUND,
 * IF and comparisons — with the app's blank-propagates-to-blank semantics and
 * its cycle guard, so a grid that would render "—" in the editor fails here
 * rather than shipping.
 */

export function tokenize(src) {
  const toks = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '[') {
      const end = src.indexOf(']', i + 1);
      if (end < 0) throw new Error('unclosed [');
      toks.push({ k: 'ref', v: src.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      toks.push({ k: 'num', v: Number(src.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_ ]/.test(src[j])) j++;
      let word = src.slice(i, j);
      // a trailing "(" means a function call; otherwise trim spaces off a ref
      const isCall = src[j] === '(';
      toks.push(isCall ? { k: 'fn', v: word.trim().toUpperCase() } : { k: 'ref', v: word.trim() });
      i = j;
      continue;
    }
    if (['>=', '<=', '<>'].includes(src.slice(i, i + 2))) {
      toks.push({ k: 'op', v: src.slice(i, i + 2) });
      i += 2;
      continue;
    }
    if ('+-*/^(),><='.includes(c)) { toks.push({ k: 'op', v: c }); i++; continue; }
    throw new Error(`unexpected character "${c}"`);
  }
  return toks;
}

export function parseExpr(toks) {
  let p = 0;
  const peek = () => toks[p];
  const eat = v => {
    if (!toks[p] || (v && toks[p].v !== v)) throw new Error(`expected ${v}`);
    return toks[p++];
  };
  function primary() {
    const t = toks[p];
    if (!t) throw new Error('unexpected end');
    if (t.k === 'num') { p++; return { k: 'num', v: t.v }; }
    if (t.k === 'ref') { p++; return { k: 'ref', v: t.v }; }
    if (t.k === 'fn') {
      p++;
      eat('(');
      const args = [];
      if (peek() && peek().v !== ')') {
        args.push(compare());
        while (peek() && peek().v === ',') { p++; args.push(compare()); }
      }
      eat(')');
      return { k: 'call', fn: t.v, args };
    }
    if (t.v === '(') { p++; const e = compare(); eat(')'); return e; }
    if (t.v === '-') { p++; return { k: 'neg', a: primary() }; }
    throw new Error(`unexpected "${t.v}"`);
  }
  function term() {
    let n = primary();
    while (peek() && (peek().v === '*' || peek().v === '/')) {
      const op = toks[p++].v;
      n = { k: 'bin', op, a: n, b: primary() };
    }
    return n;
  }
  function sum() {
    let n = term();
    while (peek() && (peek().v === '+' || peek().v === '-')) {
      const op = toks[p++].v;
      n = { k: 'bin', op, a: n, b: term() };
    }
    return n;
  }
  function compare() {
    let n = sum();
    while (peek() && ['>', '<', '>=', '<=', '=', '<>'].includes(peek().v)) {
      const op = toks[p++].v;
      n = { k: 'bin', op, a: n, b: sum() };
    }
    return n;
  }
  const ast = compare();
  if (p !== toks.length) throw new Error('trailing tokens');
  return ast;
}

export function evalAst(node, cell) {
  const num = n => (typeof n === 'number' && Number.isFinite(n) ? n : null);
  switch (node.k) {
    case 'num': return node.v;
    case 'ref': return cell(node.v);
    case 'neg': {
      const a = evalAst(node.a, cell);
      return a === null ? null : -a;
    }
    case 'bin': {
      const a = evalAst(node.a, cell);
      const b = evalAst(node.b, cell);
      if (a === null || b === null) return null;
      switch (node.op) {
        case '+': return num(a + b);
        case '-': return num(a - b);
        case '*': return num(a * b);
        case '/': return b === 0 ? null : num(a / b);
        case '^': return num(a ** b);
        case '>': return a > b ? 1 : 0;
        case '<': return a < b ? 1 : 0;
        case '>=': return a >= b ? 1 : 0;
        case '<=': return a <= b ? 1 : 0;
        case '=': return a === b ? 1 : 0;
        case '<>': return a !== b ? 1 : 0;
        default: return null;
      }
    }
    case 'call': {
      const args = node.args.map(a => evalAst(a, cell));
      if (node.fn === 'IF') return args[0] !== null && args[0] !== 0 ? args[1] ?? null : args[2] ?? null;
      if (node.fn === 'ROUND') {
        if (args[0] === null) return null;
        const d = args[1] === null || args[1] === undefined ? 0 : Math.trunc(args[1]);
        const f = 10 ** d;
        return Math.round(args[0] * f) / f;
      }
      if (node.fn === 'ABS') return args[0] === null ? null : Math.abs(args[0]);
      if (node.fn === 'MIN') return Math.min(...args.filter(x => x !== null));
      if (node.fn === 'MAX') return Math.max(...args.filter(x => x !== null));
      throw new Error(`unsupported function ${node.fn}`);
    }
    default: return null;
  }
}

/** The expression of a column, including the legacy {a, op, b} shape. */
export function columnExpr(f) {
  if (!f) return '';
  if (typeof f.expr === 'string' && f.expr.trim()) return f.expr.trim();
  if (typeof f.a === 'string' && f.op) {
    const tok = h => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(h) ? h : `[${h}]`);
    const b = typeof f.b === 'number' ? String(f.b) : tok(String(f.b ?? ''));
    return `${tok(f.a)} ${f.op} ${b}`;
  }
  return '';
}

export function cellNumber(c) {
  if (c === null || c === undefined) return null;
  if (typeof c === 'object') return typeof c.v === 'number' ? c.v : null;
  return typeof c === 'number' && Number.isFinite(c) ? c : null;
}

/**
 * Recompute a layout's Value column exactly as the app does: helper columns
 * that carry a formula are DERIVED (their stored cell is only a cache), a
 * reference resolves case-insensitively to the first matching header and then
 * to a column letter, and a reference cycle collapses to blank. Reading the
 * cached cells instead would hide precisely the faults this script has to
 * catch — a column that silently references itself computes to "—" in the
 * editor while its cache still looks healthy.
 */
export function computeValues(layout) {
  const headers = layout.columns.map(c => c.header);
  const years = layout.rows.map(r => r.year);
  let asts;
  try {
    asts = layout.columns.map(c => {
      const e = columnExpr(c.formula);
      return e ? parseExpr(tokenize(e)) : null;
    });
  } catch {
    return null;
  }
  const resolve = ref => {
    const r = String(ref).trim();
    if (r.toUpperCase() === 'A') return 'year';
    const i = headers.findIndex(h => h.trim().toLowerCase() === r.toLowerCase());
    if (i >= 0) return i;
    if (/^[A-Za-z]$/.test(r)) {
      const n = r.toUpperCase().charCodeAt(0) - 64;
      return n >= 2 && n - 2 < headers.length ? n - 2 : null;
    }
    return null;
  };
  const cache = new Array(headers.length);
  const visiting = new Set();
  function column(ci) {
    if (cache[ci]) return cache[ci];
    if (visiting.has(ci)) return years.map(() => null); // cycle guard, as in the app
    visiting.add(ci);
    const out = asts[ci]
      ? years.map((y, ri) => evalAst(asts[ci], ref => {
        const t = resolve(ref);
        if (t === null) return null;
        return t === 'year' ? y : column(t)[ri];
      }))
      : layout.rows.map(r => cellNumber(r.cells[ci]));
    visiting.delete(ci);
    cache[ci] = out;
    return out;
  }
  const v = column(0);
  return Object.fromEntries(years.map((y, i) => [y, v[i]]));
}

