"""Ch5 — Industry (I1, I3, I4 steel/cement/chemicals, I5, I6).

Each layout rebuilds the published-series derivation in the Indicator Database
calc-space (Value formula over deepest raw helper columns), then is verified
against the published overview figure (extract.json / ground_truth.json) within
tol=1.0. One calc row per year.

Recipe styles (mirroring ch3):
  • transpose: auto-expand a chapter formula graph to its deepest raw rows.
  • manual ratio: emissions / production where the numerator & denominator rows
    are CROSS-SHEET refs — the transposer can only freeze a cross-sheet cell to a
    single (first-year) constant, so for those we read each row's per-year cached
    values as leaf helpers. This keeps the division and both raw inputs as columns.
  • raw passthrough: a published series that is itself raw.

Sheet quirks:
  • I1 'Total' (row 3) = (Manufacturing 1.A.2 row46 + IPPU 2 row54)/1000 — both
    raw kt CO2e leaves. 2005..2022.
  • I4 steel (row5) / cement (row14): emissions & production rows are cross-sheet
    refs (→ I1 / I2 sheets); captured here as per-year leaves (manual ratio).
    Chemicals (row25): emissions(row24) / SUM(ethylene+propylene+aromatics
    rows21:23) are all raw leaves in-sheet, so transpose expands cleanly.
  • I5 'Total' (row24) = Mtoe (row5) × Mtoe→TWh factor (cross-sheet 11.63 const).
  • I6 '% of electricity' (row33) = electricity(row7) / total(row4); each chains
    down to the deeper raw Eurostat energy-balance rows (131 / 64) in-sheet.
"""
import sys
sys.path.insert(0, 'scripts/esabcc-indicator-derivations')
import lib, transpose

CH = 'scratch/ch/Ch5. Industry - final indicators and graphs.xlsx'


def _yc(start_year, start_col, end_year):
    """{year: col} for consecutive years from start_col (D=4)."""
    return {start_year + i: start_col + i for i in range(end_year - start_year + 1)}


def _ratio(sheet, num_row, den_row, year_cols, num_header, num_source,
           den_header, den_source, value_source):
    """emissions/production ratio with both inputs captured as per-year leaf
    helpers (their sheet rows are cross-sheet refs, so read cached values rather
    than recurse into the other sheet)."""
    V, _ = lib.grid(CH, sheet)
    avail = [y for y, c in year_cols.items()
             if isinstance(V.get((num_row, c)), (int, float))
             and isinstance(V.get((den_row, c)), (int, float))]
    avail.sort()
    num = {y: V.get((num_row, year_cols[y])) for y in avail}
    den = {y: V.get((den_row, year_cols[y])) for y in avail}
    def raw(h, y): return num[y] if h == num_header else den[y]
    helpers = [{"header": num_header, "source": num_source},
               {"header": den_header, "source": den_source}]
    layout, _ = lib.build_layout('Value', value_source,
                                 f"[{num_header}] / [{den_header}]",
                                 helpers, avail, raw)
    return layout


def build():
    out = {}

    # I1 — Industrial GHG total (Mt CO2eq). Sheet 'I1. GHG emissions', row 3.
    # D(4)=2005 .. U(21)=2022.
    T = transpose.Transposer(CH, 'I1. GHG emissions')
    out['esabcc-i1-industry-ghg'], _ = T.expand(
        3, _yc(2005, 4, 2022), value_header='Value',
        value_source='EEA GHG data viewer')

    # I3 — Circular material use rate (%). Sheet 'I3. CMUR', row 3 (raw series).
    # D(4)=2010 .. O(15)=2021.
    T = transpose.Transposer(CH, 'I3. CMUR')
    out['esabcc-i3-circular-mat-use'], _ = T.expand(
        3, _yc(2010, 4, 2021), value_header='Value',
        value_source='Eurostat SDG_12_41')

    # I4 — GHG intensities (t CO2/t) = emissions / production.
    # Steel (row5 = row4/row3): G(7)=2008 .. T(20)=2021.
    out['esabcc-i4-steel-ghg-intensity'] = _ratio(
        'I4. GHG intensity products', 4, 3, _yc(2008, 7, 2021),
        'Total emissions (Mt CO2e)', 'EEA GHG data viewer',
        'Production (Mt)', 'Eurofer data',
        'Calculated: emissions / production')
    # Cement (row14 = row13/row12): D(4)=2005 .. T(20)=2021.
    out['esabcc-i4-cement-ghg-intensity'] = _ratio(
        'I4. GHG intensity products', 13, 12, _yc(2005, 4, 2021),
        'Total emissions (Mt CO2e)', 'EEA EU ETS data viewer',
        'Production (Mt)', 'Cembureau data',
        'Calculated: emissions / production')
    # Base organic chemicals (row25 = row24 / SUM(rows21:23)) — raw leaves
    # in-sheet, so transpose expands to the 3 feedstock rows. L(12)=2013 .. U(21)=2022.
    Tc = transpose.Transposer(CH, 'I4. GHG intensity products')
    out['esabcc-i4-chemicals-ghg-intensity'], _ = Tc.expand(
        25, _yc(2013, 12, 2022), value_header='Value',
        value_source='Calculated: emissions / production')

    # I5 — Industrial final energy consumption (TWh). Sheet 'I5. Energy use',
    # row 24 = Total Mtoe (row5) × 11.63 (Mtoe→TWh). D(4)=2005 .. T(20)=2021.
    T = transpose.Transposer(CH, 'I5. Energy use')
    out['esabcc-i5-industry-fec'], _ = T.expand(
        24, _yc(2005, 4, 2021), value_header='Value',
        value_source='Eurostat energy balances')

    # I6 — Electricity share of industrial FEC (%). Sheet 'I6. Energy mix',
    # row 33 = electricity(row7) / total(row4). D(4)=2005 .. T(20)=2021.
    T = transpose.Transposer(CH, 'I6. Energy mix')
    out['esabcc-i6-industry-electrification'], _ = T.expand(
        33, _yc(2005, 4, 2021), value_header='Value',
        value_source='Eurostat energy balances')

    return out


if __name__ == '__main__':
    import json
    extract = json.load(open('scripts/esabcc-indicators/extract.json'))
    gt = json.load(open('scripts/esabcc-indicator-derivations/ground_truth.json'))

    def expected_for(ind_id):
        meta = gt[ind_id]
        obj = extract[meta['overview_sheet']]
        series = obj.get('series') if isinstance(obj, dict) else obj
        for s in series:
            if s['label'] == meta['overview_series']:
                return {p['year']: p['value'] for p in s['data']
                        if p.get('value') is not None}
        return {}

    layouts = build()
    print(f"{'indicator':40} {'result':8} {'ncols':>5} worstΔ")
    allok = True
    for ind_id, layout in layouts.items():
        computed = lib.recompute_layout(layout)
        expected = expected_for(ind_id)
        ok, msgs = lib.verify(ind_id, computed, expected, tol=1.0)
        allok = allok and ok
        worst = 0.0
        for y in set(computed) & set(expected):
            if computed[y] is not None:
                worst = max(worst, abs(computed[y] - expected[y]))
        print(f"{ind_id:40} {'PASS' if ok else 'FAIL':8} "
              f"{len(layout['columns']):>5} {worst:.5f}")
        if not ok:
            for m in msgs[1:]:
                print('   ', m)
    print('\nALL PASS' if allok else '\nSOME FAILED')
