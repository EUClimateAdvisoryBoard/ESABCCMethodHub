# Chapter derivation agent guide

You are reverse-engineering ESABCC indicator **derivations** from one chapter
workbook into the Indicator Database calc-space, so the published figures can be
reproduced from raw data. Your deliverable is one Python module:
`scripts/esabcc-indicator-derivations/chapters/chN.py` (N = your chapter).

## The goal for each indicator

Produce a `layout` (calc-space grid) where:
- **Value** (column 0) carries a formula documenting the operation that yields
  the published figure (e.g. `[Raw (Mtoe)] * [Mtoe → TWh]`, or a sum/ratio).
- **Helper columns** hold the inputs, expanded to the **DEEPEST RAW ROWS** the
  chapter provides (the underlying Eurostat/EEA line items), each with a
  `source` where the sheet gives one. Every intermediate step should be its own
  column so the whole derivation chain is visible.
- One calc **row per year**.

So that "drop in next year's raw data → the indicator recomputes."

## Tools available (all paths relative to repo root; run Python from repo root)

- `scratch/ch/<your chapter>.xlsx` — your source workbook (already extracted).
- `scratch/survey.py FILE SHEET [maxrow] [maxcol]` — dumps a sheet showing
  formulas `[=..->cachedvalue]` and values. Use it to explore tabs.
- `scripts/esabcc-indicator-derivations/lib.py`:
  - `grid(path, sheet)` → `(V, F)` dicts keyed `(row,col)` (1-based): cached
    values and formulas.
  - `build_layout(value_header, value_source, value_formula, helpers, years, raw)`
    for hand-built simple recipes. `helpers=[{"header","source"}]`,
    `raw(header, year)->number`.
  - `recompute_layout(layout)` → `{year: value}` (recomputes Value from raw
    cells exactly as the app will — use to self-verify).
  - `verify(name, computed, expected, tol)` → `(ok, msgs)`.
- `scripts/esabcc-indicator-derivations/transpose.py`:
  - `T = Transposer(path, sheet)`; `T.expand(value_row, year_cols, value_header='Value', value_source=...)`
    → `(layout, computed)`. `year_cols` is `{year: column_number}`. This
    auto-expands the formula at `value_row` down to raw rows. **Best for
    composites** (sums, ratios, intensities). Column letters→numbers: A=1, B=2…
- `scripts/esabcc-indicator-derivations/ground_truth.json` — per indicator:
  `overview_sheet`, `overview_series`, `unit`. This is your verification target.
- `scripts/esabcc-indicators/extract.json` — the published overview values,
  keyed by figure sheet → `series` (list of `{label, data:[{year,value}]}`).
- `scripts/esabcc-indicator-derivations/chapters/ch3.py` — **reference module**
  (O1 composite via transpose; O2/O3 conversions). Mimic its structure.

## How to do one indicator

1. Find its tab (tabs are usually named by code, e.g. "E1 …"). Survey it.
2. Find the **published series row** = the row whose cached values match the
   overview series (`overview_sheet`/`overview_series` in ground_truth.json,
   values in extract.json). Confirm by eye before trusting it.
3. Find the **year columns** from the header row (e.g. a cell `2005`, `2010`…);
   build `year_cols = {year: colnum}`. Only include years that actually have data.
4. Build the layout:
   - If the published row is a formula over other rows → `Transposer.expand(...)`.
   - If it is a simple raw × factor → use `build_layout` like ch3 `_conversion`.
   - If it is itself a raw series with no derivation → still capture it as a
     single raw helper feeding `Value` (formula `[<raw header>]`), so it's documented.
5. **Verify**: `computed = lib.recompute_layout(layout)`; compare to the overview
   series with `lib.verify(..., tol=1.0)`. Iterate until it passes (worst Δ small).

## Output contract (IMPORTANT)

- Create `chapters/chN.py` exposing `def build() -> dict[indicator_id, layout]`.
- Only return layouts that **verify within tol=1.0** against the overview. If
  one cannot be made to verify, leave it OUT of the returned dict and clearly
  note it in your final report (with what you found and why it failed).
- Add a `if __name__ == '__main__':` block that builds, self-verifies every
  indicator with `lib.recompute_layout` + `lib.verify`, and prints a PASS/FAIL
  table. Run it and make sure your indicators PASS before finishing.
- **Do NOT** run `build_all.py`, edit `supabase/migrations/045_*.sql`, edit other
  chapters' files, or run `git`. Only create your `chapters/chN.py` (and you may
  use scratch files for exploration).

## Final report back to the orchestrator

State, per indicator: PASS/FAIL, the worst Δ vs overview, the number of columns
(derivation depth) and the Value formula, plus any indicator you could not
verify and why. Be specific about chapter quirks you hit.
