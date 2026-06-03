"""Ch3 — Overall progress (O1, O2, O3). REFERENCE module for the per-chapter
derivation recipes. Each chapter module exposes build() -> {indicator_id: layout}.

Two recipe styles are shown:
  • transpose: auto-expand a chapter formula graph to its deepest raw rows
    (best for composites like O1). See transpose.Transposer.
  • conversion: a simple raw × unit-factor series (O2, O3).

Every layout MUST be verified against the published overview figure
(ground_truth.json) before it is returned; build_all re-verifies centrally.
"""
import sys
sys.path.insert(0, 'scripts/esabcc-indicator-derivations')
import lib, transpose

CH = 'scratch/ch/Ch3. Overall progress.xlsx'

def _conversion(sheet, raw_row, year0_col, years, raw_header, conv, conv_name, src, value_source):
    V, _ = lib.grid(CH, sheet)
    def col_of(y): return year0_col + (y - years[0])
    avail = [y for y in years if isinstance(V.get((raw_row, col_of(y))), (int, float))]
    raw_vals = {y: V.get((raw_row, col_of(y))) for y in avail}
    def raw(h, y): return conv if h == conv_name else raw_vals[y]
    helpers = [{"header": raw_header, "source": src},
               {"header": conv_name, "source": "IEA unit converter"}]
    expr = f"[{raw_header}] * [{conv_name}]"
    layout, _ = lib.build_layout('Value', value_source, expr, helpers, avail, raw)
    return layout

def build():
    EUROSTAT = 'Eurostat (nrg_bal_c)'
    YEARS = list(range(2005, 2023))
    out = {}
    # O1 — composite GHG total: auto-expanded to UNFCCC inventory raw rows.
    T = transpose.Transposer(CH, 'O1 & Fig 2. GHG emissions')
    yc = {2005 + (c - 19): c for c in range(19, 37)}  # S(19)=2005 .. col36=2022
    o1, _ = T.expand(3, yc, value_header='Value', value_source='EEA GHG data viewer')
    out['esabcc-o1-ghg-total'] = o1
    # O2 — PEC / FEC: raw Eurostat Mtoe × 11.63 → TWh.
    out['esabcc-o2-pec'] = _conversion('O2. Primary & final energy use', 3, 5, YEARS,
                                       'PEC (Mtoe)', 11.63, 'Mtoe → TWh', EUROSTAT, EUROSTAT)
    out['esabcc-o2-fec'] = _conversion('O2. Primary & final energy use', 4, 5, YEARS,
                                       'FEC (Mtoe)', 11.63, 'Mtoe → TWh', EUROSTAT, EUROSTAT)
    # O3 — gross inland: raw Eurostat ktoe × 0.01163 → TWh.
    out['esabcc-o3-gross-inland'] = _conversion('O3. gross inland consumption', 78, 5, YEARS,
                                                'Gross inland (ktoe)', 0.01163, 'ktoe → TWh',
                                                EUROSTAT, EUROSTAT)
    return out
