"""
Wire the combined workbook's figures back to the Derivations sheet.

The combined workbook carries the same number in up to six places: the
Overview table, the chapter tab's series block, Data (long), New data, Old vs
new, and the Dashboard. Written as six pasted literals they drift the moment
anyone edits an input, and the "drop in next year's raw data and the indicator
recomputes" promise of the calc grid stops at the Derivations sheet.

This module makes Derivations the single source of truth instead. Every
builder marks the cells that hold an indicator-year value; the Derivations
builder records which row it put that indicator-year on; and `apply()` then
rewrites each marked cell as `=Derivations!B<row>`.

The guard is the point of the whole thing. A link is only written where the
Derivations block ALREADY agrees with the stored data point (default 0.5 %).
Where the derivation and the plotted figure genuinely disagree — O1's later
years, where the report's own arithmetic gives 3073.6 against a stored 3118 —
the cell stays a plain number, because wiring it over would silently replace
the published series with the derivation and hide a discrepancy that a reader
of these documents needs to see.

Only the combined workbook has a Derivations sheet, so the standalone builders
pass no registry and nothing is rewritten there.
"""

DERIVATIONS_SHEET = "Derivations"
VALUE_COLUMN = "B"
DEFAULT_TOLERANCE = 0.005


class DerivationLinks:
    """Collects the marks, then rewrites them in one pass."""

    def __init__(self, tolerance=DEFAULT_TOLERANCE):
        self.tolerance = tolerance
        self._marks = []      # (worksheet, row, col, indicator id, year)
        self._rows = {}       # (indicator id, year) -> row on the Derivations sheet
        self._values = {}     # (indicator id, year) -> what that row computes
        self.linked = 0
        self.held_back = 0

    # ── recording ───────────────────────────────────────────────────────────
    def mark(self, ws, row, col, indicator_id, year):
        """This cell holds indicator `indicator_id`'s value for `year`."""
        if year is None:
            return
        self._marks.append((ws, row, col, indicator_id, int(year)))

    def derivation(self, indicator_id, year, row, value):
        """The Derivations sheet put `indicator_id`'s `year` on `row`."""
        if year is None or not isinstance(value, (int, float)):
            return
        self._rows[(indicator_id, int(year))] = row
        self._values[(indicator_id, int(year))] = float(value)

    # ── rewriting ───────────────────────────────────────────────────────────
    def agrees(self, derived, stored):
        """Close enough to wire together? Relative, with an exact-zero case."""
        if not isinstance(stored, (int, float)) or not isinstance(derived, (int, float)):
            return False
        if stored == 0:
            return derived == 0
        return abs(derived - stored) / abs(stored) <= self.tolerance

    def apply(self, wb):
        """Rewrite every agreeing marked cell as a live reference. Returns the count."""
        if DERIVATIONS_SHEET not in wb.sheetnames:
            return 0
        for ws, row, col, iid, year in self._marks:
            key = (iid, year)
            target = self._rows.get(key)
            if target is None:
                continue
            cell = ws.cell(row=row, column=col)
            if not isinstance(cell.value, (int, float)):
                continue
            if not self.agrees(self._values.get(key), cell.value):
                self.held_back += 1
                continue
            cell.value = f"={DERIVATIONS_SHEET}!{VALUE_COLUMN}{target}"
            self.linked += 1
        return self.linked

    # ── for the Read me's own description of what it did ────────────────────
    def backed_indicators(self, indicator_ids):
        """How many of `indicator_ids` have a Derivations block at all."""
        have = {iid for iid, _ in self._rows}
        return sum(1 for i in indicator_ids if i in have)
