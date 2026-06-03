"""Generic chapter-sheet → calc-space transposer.

Given a published-series row in a chapter sheet and the year columns, expand the
Excel formula graph (deepest raw rows) and rewrite it into the Indicator
Database calc-space model: every participating chapter ROW becomes a calc
COLUMN (years become rows). Leaf rows (raw numbers) become plain helper columns;
derived rows keep their formula, rewritten to reference columns by header.

Handled formula features: + - * / ( ), numeric literals, SUM(range), relative
same-year cell refs (-> column ref), fixed-column / absolute / cross-sheet refs
(-> constant value). Anything else makes the row a leaf (its cached values are
captured verbatim), so the grid still reproduces but stops documenting deeper.
"""
import re, sys
sys.path.insert(0, 'scripts/esabcc-indicator-derivations')
import lib

CELL = re.compile(r"(?:(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_ ]*?))!)?(\$?)([A-Z]{1,3})(\$?)(\d+)")

def letters_to_num(s):
    n = 0
    for ch in s: n = n*26 + (ord(ch)-64)
    return n

class Transposer:
    def __init__(self, path, sheet):
        self.path = path; self.sheet = sheet
        self.V, self.F = lib.grid(path, sheet)
        self.headers = {}     # row -> unique header
        self.col_formula = {} # row -> rewritten expr (None if leaf)

    def label(self, row):
        for c in (1,2):
            v = self.V.get((row,c))
            if isinstance(v,str) and v.strip(): return v.strip()
        return f"row {row}"

    def header_for(self, row):
        if row in self.headers: return self.headers[row]
        base = self.label(row); h = base; i = 2
        while h in self.headers.values(): h = f"{base} ({i})"; i += 1
        self.headers[row] = h; return h

    def xsheet_val(self, sheetname, col, rownum, year_col):
        try:
            Vx,_ = lib.grid(self.path, sheetname)
            return Vx.get((rownum, letters_to_num(col)))
        except Exception:
            return None

    def rewrite(self, row, year_col, needed):
        """Rewrite row's formula (read at year_col) into a header-ref expr.
        Appends newly-referenced rows to `needed`. Returns expr or None(leaf)."""
        f = self.F.get((row, year_col))
        if not isinstance(f,str) or not f.startswith('='):
            return None  # leaf
        s = f[1:]
        yl = lib.col_letter(year_col)
        # Pass 1: expand SUM(col r1 : col r2). Same-year ranges -> @row@ tokens
        # (purely numeric so the cell-ref pass below can't re-match them).
        def sum_range(m):
            c1,r1,c2,r2 = m.group(1),int(m.group(2)),m.group(3),int(m.group(4))
            if c1==c2==yl:
                parts=[]
                for rr in range(r1,r2+1):
                    needed.append(rr); parts.append(f"@{rr}@")
                return "(" + "+".join(parts) + ")"
            tot=0  # fixed-column range -> constant sum
            for rr in range(r1,r2+1):
                v=self.V.get((rr, letters_to_num(c1)))
                if isinstance(v,(int,float)): tot+=v
            return f"({tot})"
        s = re.sub(r"SUM\(\s*([A-Z]{1,3})(\d+)\s*:\s*([A-Z]{1,3})(\d+)\s*\)", sum_range, s, flags=re.I)
        # Pass 2: individual cell refs.
        def cell(m):
            sh = m.group(1) or m.group(2)
            col, rownum = m.group(4), int(m.group(6))
            if sh:  # cross-sheet -> constant
                v=self.xsheet_val(sh.strip(), col, rownum, year_col)
                return f"({v})" if isinstance(v,(int,float)) else "0"
            if col==yl:  # same-year relative -> @row@ token
                needed.append(rownum); return f"@{rownum}@"
            v=self.V.get((rownum, letters_to_num(col)))  # fixed column -> constant
            return f"({v})" if isinstance(v,(int,float)) else "0"
        s = CELL.sub(cell, s)
        # Pass 3: @row@ tokens -> [header] (headers may contain letters+digits,
        # so this must happen only after all ref matching is done).
        s = re.sub(r"@(\d+)@", lambda m: f"[{self.header_for(int(m.group(1)))}]", s)
        return s

    def expand(self, value_row, year_cols, value_header=None, value_source=None):
        """Build layout from value_row over given (year->col) dict."""
        yc0 = year_cols[sorted(year_cols)[0]]
        needed = [value_row]; seen=set()
        # BFS expand
        order=[]
        while needed:
            r = needed.pop(0)
            if r in seen: continue
            seen.add(r); order.append(r)
            expr = self.rewrite(r, yc0, needed)
            self.col_formula[r]=expr
        # value row first, then others in discovery order
        order = [value_row] + [r for r in order if r!=value_row]
        columns=[]; 
        for r in order:
            hdr = value_header if r==value_row else self.header_for(r)
            if r==value_row: self.headers[r]=hdr
            col={"header":hdr}
            src = self.V.get((r,2))  # col B source
            if r==value_row and value_source: col["source"]=value_source
            elif isinstance(src,str) and src.strip(): col["source"]=src.strip()
            expr=self.col_formula.get(r)
            if expr: col["formula"]={"expr":expr}
            columns.append(col)
        # rows: per year, raw leaf values; computed via lib.eval over the graph
        hdr_of={r:(value_header if r==value_row else self.headers[r]) for r in order}
        years=sorted(year_cols)
        # raw values for leaves
        def leafval(r,y): return self.V.get((r, year_cols[y]))
        # Derived columns resolved by iterative fixpoint over the (acyclic)
        # formula graph — follow each formula's own references only, so there is
        # no exponential re-expansion.
        layout_rows=[]; computed={}
        header_list=[c["header"] for c in columns]
        formula_by_header={c["header"]:c.get("formula",{}).get("expr") for c in columns}
        row_by_header={hdr_of[r]:r for r in order}
        def refs_of(expr):
            rs=set(re.findall(r"\[([^\]]+)\]", expr))
            for h in header_list:  # bare-word headers
                if re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', h) and \
                   re.search(rf'(?<![\[\w]){re.escape(h)}(?![\w\]])', expr):
                    rs.add(h)
            return rs
        ref_cache={h:refs_of(formula_by_header[h]) for h in header_list if formula_by_header[h]}
        for y in years:
            known={h: leafval(row_by_header[h], y)
                   for h in header_list if not formula_by_header[h]}
            pending={h for h in header_list if formula_by_header[h]}
            progress=True
            while pending and progress:
                progress=False
                for h in list(pending):
                    if ref_cache[h] <= set(known):
                        known[h]=lib.eval_expr(formula_by_header[h], header_list, known)
                        pending.discard(h); progress=True
            cells=[known.get(h) for h in header_list]
            layout_rows.append({"year":y,"cells":cells})
            computed[y]=cells[0]
        for c in columns:
            if c.get("source") in (None,""): c.pop("source",None)
        return {"columns":columns,"rows":layout_rows}, computed
