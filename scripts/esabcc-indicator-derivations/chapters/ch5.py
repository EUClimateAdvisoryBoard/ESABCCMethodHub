"""Ch5 — Industry (I1, I3, I4 steel/cement/chemicals, I5, I6).

Each layout is auto-expanded from the chapter's published-series row down to its
deepest raw rows via transpose.Transposer, then verified against the published
overview figure (extract.json / ground_truth.json) within tol=1.0.

Sheet quirks:
  • I1 'Total' (row3) = (Manufacturing + IPPU)/1000 — raw kt leaves on rows 46,54.
  • I4 intensities = emissions / production. The emissions/production inputs are
    pulled cross-sheet (I1 / I2), so within this sheet the deepest rows are those
    emission & tonnage rows; the chemicals row divides by SUM of 3 feedstock rows.
  • I5 'Total' (row24) = Mtoe (row5) * IEA factor (cross-sheet constant 11.63).
  • I6 '% of electricity' (row33) = electricity(row7) / total(row4), each of which
    chains down to deeper Eurostat balance rows in-sheet.
"""
import sys
sys.path.insert(0, 'scripts/esabcc-indicator-derivations')
import transpose

CH = 'scratch/ch/Ch5. Industry - final indicators and graphs.xlsx'

def _yc(start_year, start_col, end_year):
    """{year: col} for consecutive years from start_col (D=4)."""
    return {start_year + i: start_col + i for i in range(end_year - start_year + 1)}

def build():
    out = {}

    # I1 — Industrial GHG total (Mt CO2eq). Sheet 'I1. GHG emissions', row 3.
    # Year cols D(4)=2005 .. U(21)=2022.
    T = transpose.Transposer(CH, 'I1. GHG emissions')
    yc = _yc(2005, 4, 2022)
    out['esabcc-i1-industry-ghg'], _ = T.expand(
        3, yc, value_header='Value', value_source='EEA GHG data viewer')

    # I3 — Circular material use rate (%). Sheet 'I3. CMUR', row 3 (raw series).
    # Year cols D(4)=2010 .. O(15)=2021.
    T = transpose.Transposer(CH, 'I3. CMUR')
    yc = _yc(2010, 4, 2021)
    out['esabcc-i3-circular-mat-use'], _ = T.expand(
        3, yc, value_header='Value', value_source='Eurostat SDG_12_41')

    # I4 — GHG intensities (t CO2/t). Sheet 'I4. GHG intensity products'.
    T = transpose.Transposer(CH, 'I4. GHG intensity products')
    # Steel: intensity row 5 = emissions(row4) / production(row3). G(7)=2008 .. T(20)=2021.
    out['esabcc-i4-steel-ghg-intensity'], _ = T.expand(
        5, _yc(2008, 7, 2021), value_header='Value', value_source='EEA GHG data viewer / Eurofer')
    # Cement: intensity row 14 = emissions(row13) / production(row12). D(4)=2005 .. T(20)=2021.
    out['esabcc-i4-cement-ghg-intensity'], _ = T.expand(
        14, _yc(2005, 4, 2021), value_header='Value', value_source='EEA EU ETS data viewer / Cembureau')
    # Base organic chemicals: intensity row 25 = emissions(row24) / SUM(rows21:23).
    # L(12)=2013 .. U(21)=2022.
    out['esabcc-i4-chemicals-ghg-intensity'], _ = T.expand(
        25, _yc(2013, 12, 2022), value_header='Value',
        value_source='EEA EU ETS data viewer / Eurostat DS-056121')

    # I5 — Industrial final energy consumption (TWh). Sheet 'I5. Energy use', row 24.
    # = Total Mtoe (row5) * 11.63 (IEA conversion factor). D(4)=2005 .. T(20)=2021.
    T = transpose.Transposer(CH, 'I5. Energy use')
    out['esabcc-i5-industry-fec'], _ = T.expand(
        24, _yc(2005, 4, 2021), value_header='Value', value_source='Eurostat energy balances')

    # I6 — Electricity share of industrial FEC (%). Sheet 'I6. Energy mix', row 33.
    # = electricity(row7) / total energy use(row4). D(4)=2005 .. T(20)=2021.
    T = transpose.Transposer(CH, 'I6. Energy mix')
    out['esabcc-i6-industry-electrification'], _ = T.expand(
        33, _yc(2005, 4, 2021), value_header='Value', value_source='Eurostat energy balances')

    return out


if __name__ == '__main__':
    import json, lib
    extract = json.load(open('scripts/esabcc-indicators/extract.json'))
    gt = json.load(open('scripts/esabcc-indicator-derivations/ground_truth.json'))

    def expected_for(ind_id):
        meta = gt[ind_id]
        obj = extract[meta['overview_sheet']]
        series = obj.get('series') if isinstance(obj, dict) else obj
        for s in series:
            if s['label'] == meta['overview_series']:
                return {p['year']: p['value'] for p in s['data'] if p.get('value') is not None}
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
        print(f"{ind_id:40} {'PASS' if ok else 'FAIL':8} {len(layout['columns']):>5} {worst:.5f}")
        if not ok:
            for m in msgs[1:]:
                print('   ', m)
    print('\nALL PASS' if allok else '\nSOME FAILED')
