"""Build & verify Ch3 (Overall) conversion-type indicators, emit migration 045."""
import json, sys
sys.path.insert(0, 'scripts/esabcc-indicator-derivations')
import lib, emit

CH = 'scratch/ch/Ch3. Overall progress.xlsx'
OVX = json.load(open('scripts/esabcc-indicators/extract.json'))

def ov(fig, label):
    for s in OVX[fig]['series']:
        if s['label'].strip().lower() == label.lower():
            return {p['year']: p['value'] for p in s['data']}
    return {}

def conversion_recipe(sheet, raw_row, year0_col, raw_header, conv, conv_name, src,
                      value_row, years):
    V, _ = lib.grid(CH, sheet)
    def col_of(y): return year0_col + (y - years[0])
    avail = [y for y in years if V.get((raw_row, col_of(y))) is not None]
    raw_vals = {y: V.get((raw_row, col_of(y))) for y in avail}
    def raw(h, y): return conv if h == conv_name else raw_vals[y]
    helpers = [{"header": raw_header, "source": src},
               {"header": conv_name, "source": "IEA unit converter"}]
    expr = f"[{raw_header}] * [{conv_name}]"
    layout, computed = lib.build_layout('Value', src, expr, helpers, avail, raw)
    cached = {y: V.get((value_row, col_of(y))) for y in avail}
    return layout, computed, cached

YEARS = list(range(2005, 2023))
EUROSTAT = 'Eurostat (nrg_bal_c)'
recipes = [
  # id, sheet, raw_row, raw_header, conv, conv_name, value_row, fig, ov_label
  ('esabcc-o2-pec', 'O2. Primary & final energy use', 3, 'PEC (Mtoe)', 11.63, 'Mtoe → TWh', 6, 'Figure 9', 'PEC'),
  ('esabcc-o2-fec', 'O2. Primary & final energy use', 4, 'FEC (Mtoe)', 11.63, 'Mtoe → TWh', 7, 'Figure 9', 'FEC'),
  ('esabcc-o3-gross-inland', 'O3. gross inland consumption', 78, 'Gross inland (ktoe)', 0.01163, 'ktoe → TWh', 3, 'Figure 10', 'Total'),
]
layouts = {}
allok = True
for ind, sheet, rr, rh, conv, cn, vr, fig, lbl in recipes:
    layout, computed, cached = conversion_recipe(sheet, rr, 5, rh, conv, cn, EUROSTAT, vr, YEARS)
    ok1, m1 = lib.verify(f'{ind} vs chapter', computed, {k:v for k,v in cached.items() if v is not None}, tol=0.01)
    ok2, m2 = lib.verify(f'{ind} vs overview', computed, {k:v for k,v in ov(fig, lbl).items() if k in computed}, tol=1.0)
    print('\n'.join(m1)); print('\n'.join(m2)); print()
    allok = allok and ok1 and ok2
    layouts[ind] = layout

n = emit.emit(layouts, 'supabase/migrations/045_seed_indicator_derivations.sql')
print(f"\nEmitted {n} layouts -> migration 045  (all verified: {allok})")
