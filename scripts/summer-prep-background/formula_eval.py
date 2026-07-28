"""
A small evaluator for the Excel formulas these builders write — into the
Derivations sheet, and the cross-sheet references the combined workbook's
wiring pass points at it from every other sheet.

The workbooks ship with no cached formula results (`fullCalcOnLoad` is set
instead, so Excel computes them the moment the file opens), so this module
is how both the builder (deciding whether a Derivations cell is close enough
to a stored data point to be worth wiring to) and the check suite (verifying
the shipped file, independent of any generator input) re-derive a formula's
value in Python.

Supported grammar — everything the calc-grid-to-Excel translator emits:
  + - * /            arithmetic, left-associative, usual precedence
  >= <= <> = > <     comparisons (used only inside IF conditions here)
  IF(cond, a, b)     lazy — the untaken branch is never evaluated, so a
                     blank cell on the untaken side of a report/live-source
                     split formula does not raise
  ROUND(x, n)        Excel's round-half-away-from-zero, not Python's
                     round-half-to-even
  A1 / AB12          a same-sheet cell reference
  'Sheet name'!A1    a cross-sheet cell reference
No other function names appear in these calc grids; encountering one raises
FormulaError rather than guessing.
"""

import math
import re

from openpyxl.utils import column_index_from_string


class FormulaError(Exception):
    pass


def excel_round(x, n):
    """Excel's ROUND: half away from zero, not Python's half-to-even."""
    n = int(n)
    factor = 10 ** n
    y = math.floor(abs(x) * factor + 0.5) / factor
    return y if x >= 0 else -y


class _Parser:
    """Recursive-descent parser producing an AST — no evaluation here, so
    IF() can be evaluated lazily (its untaken branch may reference blank
    cells that would error if touched)."""

    def __init__(self, s):
        self.s = s
        self.i = 0
        self.n = len(s)

    def _ws(self):
        while self.i < self.n and self.s[self.i].isspace():
            self.i += 1

    def parse(self):
        v = self.expr()
        self._ws()
        if self.i != self.n:
            raise FormulaError(f"trailing input in {self.s!r} at {self.i}")
        return v

    def expr(self):
        v = self.term()
        while True:
            self._ws()
            for op in ("<>", ">=", "<=", "=", ">", "<"):
                if self.s.startswith(op, self.i):
                    self.i += len(op)
                    v = ("cmp", op, v, self.term())
                    break
            else:
                break
        return v

    def term(self):
        v = self.factor()
        while True:
            self._ws()
            if self.i < self.n and self.s[self.i] in "+-":
                op = self.s[self.i]
                self.i += 1
                v = ("bin", op, v, self.factor())
            else:
                break
        return v

    def factor(self):
        v = self.unary()
        while True:
            self._ws()
            if self.i < self.n and self.s[self.i] in "*/":
                op = self.s[self.i]
                self.i += 1
                v = ("bin", op, v, self.unary())
            else:
                break
        return v

    def unary(self):
        self._ws()
        if self.i < self.n and self.s[self.i] == "-":
            self.i += 1
            return ("neg", self.unary())
        return self.atom()

    def atom(self):
        self._ws()
        if self.i >= self.n:
            raise FormulaError(f"unexpected end of formula {self.s!r}")
        c = self.s[self.i]
        if c == "(":
            self.i += 1
            v = self.expr()
            self._ws()
            if self.i >= self.n or self.s[self.i] != ")":
                raise FormulaError(f"expected ) in {self.s!r} at {self.i}")
            self.i += 1
            return v
        if c == "'":
            m = re.match(r"'([^']+)'!([A-Za-z]{1,3})(\d+)", self.s[self.i:])
            if not m:
                raise FormulaError(f"unterminated sheet reference in {self.s!r}")
            self.i += m.end()
            return ("sheetref", m.group(1), m.group(2).upper(), int(m.group(3)))
        m = re.match(r"\d+(?:\.\d+)?", self.s[self.i:])
        if m:
            self.i += m.end()
            return ("num", float(m.group()))
        m = re.match(r"[A-Za-z]+", self.s[self.i:])
        if m:
            name = m.group()
            j = self.i + m.end()
            if j < self.n and self.s[j] == "(":
                self.i = j + 1
                return ("call", name.upper(), self._args())
            mrow = re.match(r"\d+", self.s[j:])
            if not mrow:
                raise FormulaError(f"bad cell reference {name!r} in {self.s!r}")
            self.i = j + mrow.end()
            return ("ref", name.upper(), int(mrow.group()))
        raise FormulaError(f"unexpected character {c!r} in {self.s!r} at {self.i}")

    def _args(self):
        args = []
        self._ws()
        if self.i < self.n and self.s[self.i] == ")":
            self.i += 1
            return args
        while True:
            args.append(self.expr())
            self._ws()
            if self.i < self.n and self.s[self.i] == ",":
                self.i += 1
                continue
            if self.i < self.n and self.s[self.i] == ")":
                self.i += 1
                break
            raise FormulaError(f"expected , or ) in {self.s!r} at {self.i}")
        return args


def parse_formula(formula):
    """Formula text with no leading '=' -> an AST node."""
    return _Parser(formula).parse()


def _compare(op, a, b):
    return {"<>": a != b, ">=": a >= b, "<=": a <= b,
            "=": a == b, ">": a > b, "<": a < b}[op]


def evaluate_ast(node, resolve):
    """
    `resolve(sheet, col_letters, row)` returns the value of a referenced
    cell — `sheet` is None for a bare (same-sheet) reference.
    """
    kind = node[0]
    if kind == "num":
        return node[1]
    if kind == "ref":
        return resolve(None, node[1], node[2])
    if kind == "sheetref":
        return resolve(node[1], node[2], node[3])
    if kind == "neg":
        return -evaluate_ast(node[1], resolve)
    if kind == "bin":
        op, l, r = node[1], node[2], node[3]
        lv, rv = evaluate_ast(l, resolve), evaluate_ast(r, resolve)
        if op == "+": return lv + rv
        if op == "-": return lv - rv
        if op == "*": return lv * rv
        if op == "/": return lv / rv
        raise FormulaError(f"bad operator {op!r}")
    if kind == "cmp":
        op, l, r = node[1], node[2], node[3]
        return _compare(op, evaluate_ast(l, resolve), evaluate_ast(r, resolve))
    if kind == "call":
        name, args = node[1], node[2]
        if name == "IF":
            cond = evaluate_ast(args[0], resolve)
            branch = args[1] if cond else (args[2] if len(args) > 2 else None)
            return evaluate_ast(branch, resolve) if branch is not None else False
        if name == "ROUND":
            return excel_round(evaluate_ast(args[0], resolve), evaluate_ast(args[1], resolve))
        raise FormulaError(f"unsupported function {name}()")
    raise FormulaError(f"bad AST node {node!r}")


def evaluate_formula(formula, resolve):
    """`formula` with no leading '=' -> its computed value, via `resolve`."""
    return evaluate_ast(parse_formula(formula), resolve)


def evaluate_cell(wb, sheet, row, col, cache=None):
    """
    The value cell `col row` of `sheet` in openpyxl Workbook `wb` will carry
    once Excel recalculates it — read straight if it is already a number,
    recursed into if it is one of the formulas this module understands.

    `cache` is an optional dict threaded through recursive calls so a block
    of formulas referencing the same inputs many times (as the Derivations
    sheet's do) is only evaluated once per cell — pass the same dict across
    a batch of `evaluate_cell` calls to share it.
    """
    cache = {} if cache is None else cache
    col_letters = col if isinstance(col, str) else None
    col_num = column_index_from_string(col) if col_letters else col
    key = (sheet, row, col_num)
    if key in cache:
        return cache[key]
    ws = wb[sheet]
    cell = ws.cell(row=row, column=col_num)
    v = cell.value
    if v is None:
        result = None
    elif isinstance(v, bool):
        result = v
    elif isinstance(v, (int, float)):
        result = float(v)
    elif isinstance(v, str) and v.startswith("="):
        def resolve(ref_sheet, ref_col, ref_row):
            return evaluate_cell(wb, ref_sheet or sheet, ref_row, ref_col, cache)
        result = evaluate_formula(v[1:], resolve)
    else:
        result = v
    cache[key] = result
    return result
