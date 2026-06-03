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
    # Sheet 'A1. GHG+DemandSide' row 3 'Total' is a raw EEA inventory series; it
    # decomposes into rows 4 (enteric fermentation), 5 (manure management),
    # 6 (fertilizer use) and 7 (other = residual) — all EEA GHG data viewer.
    # Build Total as the sum of these four component rows (the deepest raw
    # decomposition the sheet exposes). Components run D(2005)..T(2021); the raw
    # Total has an extra 2022 point with no component breakdown, so this layout
    # covers 2005-2021.
    Va1, _ = lib.grid(CH, 'A1. GHG+DemandSide')
    comps = {'Enteric fermentation': 4, 'Manure management': 5,
             'Fertilizer use': 6, 'Other': 7}
    a1_years = [y for y in range(2005, 2023)
                if all(isinstance(Va1.get((r, 4 + (y - 2005))), (int, float))
                       for r in comps.values())]
    a1_data = {h: {y: Va1.get((r, 4 + (y - 2005))) for y in a1_years}
               for h, r in comps.items()}
    a1_expr = "+".join(f"[{h}]" for h in comps)
    a1, _ = lib.build_layout(
        'Value', 'EEA GHG data viewer', a1_expr,
        [{"header": h, "source": "EEA GHG data viewer"} for h in comps],
        a1_years, lambda h, y: a1_data[h][y])
    out['esabcc-a1-agri-nonco2'] = a1

    # ── A3 — Total fertiliser nitrogen use (Figure 58 / 'Total') ──
    # Sheet row 3 = D4 + D5 = Inorganic + Organic fertiliser (EU CRF tables).
    T = transpose.Transposer(CH, 'A3. Fertilizer New Intensity')
    yc = {2005 + (c - 4): c for c in range(4, 21)}  # D(4)=2005 .. T(20)=2021
    fert, _ = T.expand(3, yc, value_header='Value', value_source='EU CRF tables')
    out['esabcc-a3-fertiliser-use'] = fert

    # ── A3 — Nitrogen Use Efficiency (Figure 58 / 'Nitrogen Use Efficiency') ──
    # NUE is a ratio (N output / N input). This workbook publishes it directly
    # as a FAOSTAT % row (sheet 'A3. Fertilizer New Intensity' row 6) with no
    # in-sheet ratio components, so it is captured as a single raw helper
    # feeding Value. Cols D(2005)..S(2020).
    out['esabcc-a3-nue'] = _raw_passthrough(
        'A3. Fertilizer New Intensity', 6, 4, list(range(2005, 2021)),
        'Nitrogen Use Efficiency', 'FAOSTAT', 'FAOSTAT')

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
