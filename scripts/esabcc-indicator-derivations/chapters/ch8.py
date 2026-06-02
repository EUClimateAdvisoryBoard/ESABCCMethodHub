"""Ch8 — Agriculture (A1 non-CO2 emissions, A3 fertiliser use + NUE, A7
bioenergy feedstock). Each layout reproduces the published overview figure
from the deepest raw rows the chapter provides.

Recipe styles (cf. ch3 reference):
  • transpose: auto-expand a chapter formula to its raw rows (A3 fertiliser
    Total = inorganic + organic; A7 historic total = cereal + oilseed
    feedstock → JRC raw rows). See transpose.Transposer.
  • raw passthrough: a published row that is itself the raw series with no
    in-sheet derivation is captured as a single raw helper feeding Value
    (A1 EEA inventory Total; A3 NUE FAOSTAT %).

All four verify within tol=1.0 against ground_truth/extract overview series.
"""
import sys
sys.path.insert(0, 'scripts/esabcc-indicator-derivations')
import lib, transpose

CH = 'scratch/ch/Ch8. Agriculture - final indicators and graphs.xlsx'


def _raw_passthrough(sheet, row, year0_col, years, header, source, value_source):
    """Capture a published raw row (no in-sheet formula) as one helper -> Value."""
    V, _ = lib.grid(CH, sheet)
    def col_of(y): return year0_col + (y - years[0])
    avail = [y for y in years
             if isinstance(V.get((row, col_of(y))), (int, float))]
    raw_vals = {y: V.get((row, col_of(y))) for y in avail}
    def raw(h, y): return raw_vals[y]
    layout, _ = lib.build_layout('Value', value_source, f"[{header}]",
                                 [{"header": header, "source": source}],
                                 avail, raw)
    return layout


def build():
    out = {}

    # ── A1 — Agricultural non-CO2 emissions (Figure 54 and 56 / 'Total') ──
    # Sheet row 3 'Total' is the raw EEA GHG inventory figure (no in-sheet
    # formula; the component rows 4-6 only run to 2021 while Total runs to
    # 2022), so it is captured as the raw published series.
    out['esabcc-a1-agri-nonco2'] = _raw_passthrough(
        'A1. GHG+DemandSide', 3, 4, list(range(2005, 2023)),
        'Total agriculture emissions (EEA)', 'EEA GHG data viewer',
        'EEA GHG data viewer')

    # ── A3 — Total fertiliser nitrogen use (Figure 58 / 'Total') ──
    # Sheet row 3 = D4 + D5 = Inorganic + Organic fertiliser (EU CRF tables).
    T = transpose.Transposer(CH, 'A3. Fertilizer New Intensity')
    yc = {2005 + (c - 4): c for c in range(4, 21)}  # D(4)=2005 .. T(20)=2021
    fert, _ = T.expand(3, yc, value_header='Value', value_source='EU CRF tables')
    out['esabcc-a3-fertiliser-use'] = fert

    # ── A3 — Nitrogen Use Efficiency (Figure 58 / 'Nitrogen Use Efficiency') ──
    # Sheet row 6 is a published FAOSTAT % with no underlying ratio in this
    # workbook; expand captures it as the raw published row (single column).
    Tn = transpose.Transposer(CH, 'A3. Fertilizer New Intensity')
    ycn = {2005 + (c - 4): c for c in range(4, 20)}  # D(4)=2005 .. S(19)=2020
    nue, _ = Tn.expand(6, ycn, value_header='Value', value_source='FAOSTAT')
    out['esabcc-a3-nue'] = nue

    # ── A7 — Bioenergy feedstock (Figure 62 / 'Historic total') ──
    # Sheet row 23 = row24 + row25 = Cereal crops (=row8) + Oilseed (=row14),
    # expanding to the JRC raw feedstock rows.
    Tb = transpose.Transposer(CH, 'A7. Bioenergy crops')
    yc7 = {2005 + (c - 4): c for c in range(4, 21)}  # D(4)=2005 .. T(20)=2021
    bio, _ = Tb.expand(23, yc7, value_header='Value', value_source='JRC')
    out['esabcc-a7-bioenergy-feedstock'] = bio

    return out


if __name__ == '__main__':
    import json
    ex = json.load(open('scripts/esabcc-indicators/extract.json'))
    gt = json.load(open('scripts/esabcc-indicator-derivations/ground_truth.json'))

    def expected(iid):
        meta = gt[iid]
        for s in ex[meta['overview_sheet']]['series']:
            if s['label'] == meta['overview_series']:
                return {p['year']: p['value'] for p in s['data']}
        return {}

    layouts = build()
    print(f"{'indicator':32} {'result':8} {'cols':5} worst-Δ")
    allok = True
    for iid, layout in layouts.items():
        computed = lib.recompute_layout(layout)
        ok, msgs = lib.verify(iid, computed, expected(iid), tol=1.0)
        allok = allok and ok
        ncols = len(layout['columns'])
        worst = msgs[0].split('worst Δ')[-1].rstrip(')')
        print(f"{iid:32} {'PASS' if ok else 'FAIL':8} {ncols:<5} {worst}")
        if not ok:
            for m in msgs[1:]:
                print('   ', m)
    print('\nALL PASS' if allok else '\nSOME FAILED')
