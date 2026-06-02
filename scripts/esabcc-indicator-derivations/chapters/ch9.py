"""Ch9 — LULUCF (L1, L3, L4, L5, L6, L7, L8). Each indicator is built down to the
deepest raw rows the chapter workbook exposes and verified within tol=1.0
against the published overview figure.

Chapter quirks handled here:
  • Many "raw" rows are external-workbook CRF/energy-balance references
    (e.g. =[2]Table4.1!$B$9). transpose.Transposer mis-parses the [N] workbook
    index, so for those sheets we assemble layouts manually with lib.build_layout,
    treating each external-ref row as a leaf (its cached value is the raw datum).
  • LULUCF values are removals → many series are negative; signs are preserved
    exactly as the overview shows them (deforestation negative, sink negative-as-
    removal but reported positive, etc.).
"""
import sys
sys.path.insert(0, 'scripts/esabcc-indicator-derivations')
import lib

CH = 'scratch/ch/Ch9. LULUCF - final indicators and graphs.xlsx'


def _sum_rows(sheet, rows, year0_col, year0, last_year, value_source,
              header_of, src_of, scale=1.0, sign=1.0, value_header='Value'):
    """Value = sign * (sum of `rows`) * scale, one helper column per raw row.
    `rows` is a list of sheet row numbers; header_of/src_of map row->str."""
    V, _ = lib.grid(CH, sheet)

    def col_of(y):
        return year0_col + (y - year0)

    years = [y for y in range(year0, last_year + 1)
             if all(isinstance(V.get((r, col_of(y))), (int, float)) for r in rows)]
    helpers = [{"header": header_of(r), "source": src_of(r)} for r in rows]
    val_by = {header_of(r): {y: V.get((r, col_of(y))) for y in years} for r in rows}

    def raw(h, y):
        return val_by[h][y]

    inner = "+".join(f"[{header_of(r)}]" for r in rows)
    expr = f"({inner})"
    if scale != 1.0:
        expr = f"{expr} * {scale!r}"
    if sign < 0:
        expr = f"-{expr}"
    layout, _ = lib.build_layout(value_header, value_source, expr, helpers, years, raw)
    return layout


def _l1():
    """L1 — total LULUCF net balance. Raw row 33 (kt CO2e) /1000 → Mt. 2005-2021
    come from the inventory row; 2022 is published only as a literal Mt value in
    the series row, captured here as its raw-equivalent (Mt*1000)."""
    V, F = lib.grid(CH, 'L1. GHG emissions and removals')
    RAW = '4 - Land Use, Land-Use Change and Forestry'
    years = list(range(2005, 2023))
    col_of = lambda y: 4 + (y - 2005)          # D=2005 .. T=2021, U=2022
    raw_kt = {}
    for y in years:
        c = col_of(y)
        v33 = V.get((33, c))
        if isinstance(v33, (int, float)):
            raw_kt[y] = v33
        else:                                   # 2022: series row literal (Mt)
            v3 = V.get((3, c))
            raw_kt[y] = v3 * 1000 if isinstance(v3, (int, float)) else None
    years = [y for y in years if isinstance(raw_kt[y], (int, float))]
    helpers = [{"header": RAW, "source": 'EEA GHG data viewer'}]
    raw = lambda h, y: raw_kt[y]
    layout, _ = lib.build_layout('Value', 'EEA GHG data viewer',
                                 f"[{RAW}] / 1000", helpers, years, raw)
    return layout


def build():
    out = {}

    # L1 — net LULUCF balance (Mt CO2eq), removals negative.
    out['esabcc-l1-lulucf-net'] = _l1()

    # L3 — afforestation: SUM of land-converted-to-forest rows (kha). CRF tables.
    aff = {45: 'cropland to forest land', 46: 'grassland to forest land',
           47: 'wetland to forest land', 48: 'settlement to forest land',
           49: 'other land to forest land'}
    out['esabcc-l3-afforestation'] = _sum_rows(
        'L3 & L4. A-deforestation', list(aff), 4, 2005, 2021, 'CRF table',
        header_of=lambda r: aff[r], src_of=lambda r: 'CRF table')

    # L4 — deforestation: -SUM of forest-to-other-use rows (kha), reported negative.
    defo = {29: 'forest to cropland', 30: 'forest to grassland',
            31: 'forest to wetland', 32: 'forest to settlement',
            33: 'forest to other land'}
    out['esabcc-l4-deforestation'] = _sum_rows(
        'L3 & L4. A-deforestation', list(defo), 4, 2005, 2021, 'CRF table',
        header_of=lambda r: defo[r], src_of=lambda r: 'CRF table', sign=-1.0)

    # L5 — annual increase in settlement area (kha): year-over-year difference of
    # the settlement-area level (L2 row 44, EU CRF). 2006-2021.
    out['esabcc-l5-settlement-area'] = _l5()

    # L6 — forest living-biomass sink (Mt CO2eq): carbon-stock change in living
    # biomass = gain + loss (kt C) → ×3.664 (C→CO2) → /1000 (kt→Mt).
    bio = {30: 'Carbon stock gain in living biomass',
           31: 'Carbon stock loss in living biomass'}
    out['esabcc-l6-forest-sink'] = _sum_rows(
        'L6. forest living biomass', list(bio), 4, 2005, 2021, 'EU GHG inventory CRF',
        header_of=lambda r: bio[r], src_of=lambda r: 'EU GHG inventory CRF',
        scale=3.664 / 1000.0)

    # L7 — non-forest LULUCF net emissions (Mt CO2eq): Cropland+Grassland+Wetlands+
    # Settlements+Other land+Other LULUCF, raw rows from the L1 inventory sheet
    # (kt CO2e) /1000 → Mt.
    nf = {38: '4.B - Cropland', 42: '4.C - Grassland', 46: '4.D - Wetlands',
          50: '4.E - Settlements', 54: '4.F - Other Land', 59: '4.H - Other LULUCF'}
    out['esabcc-l7-nonforest-lulucf'] = _sum_rows(
        'L1. GHG emissions and removals', list(nf), 4, 2005, 2021,
        'EEA GHG data viewer',
        header_of=lambda r: nf[r], src_of=lambda r: 'EEA GHG data viewer',
        scale=1 / 1000.0)

    # L8 — total bioenergy use (TWh): SUM of all energy-balance bioenergy line
    # items across sectors (GWh) /1000 → TWh. 2005-2021.
    l8 = _l8_headers()
    out['esabcc-l8-bioenergy-use'] = _sum_rows(
        'L8. bioenergy', list(l8), 5, 2005, 2021, 'Eurostat energy balance',
        header_of=lambda r: l8[r], src_of=lambda r: 'energy balance',
        scale=1 / 1000.0)

    return out


def _l5():
    V, _ = lib.grid(CH, 'L2. Areas per land-use category')
    CUR, PREV = 'Settlement area (kha)', 'Settlement area, previous year (kha)'
    col_of = lambda y: 4 + (y - 2005)           # D=2005 .. T=2021 on L2 row 44
    years = [y for y in range(2006, 2022)
             if isinstance(V.get((44, col_of(y))), (int, float))
             and isinstance(V.get((44, col_of(y - 1))), (int, float))]
    cur = {y: V.get((44, col_of(y))) for y in years}
    prev = {y: V.get((44, col_of(y - 1))) for y in years}
    helpers = [{"header": CUR, "source": 'EU CRF'},
               {"header": PREV, "source": 'EU CRF'}]
    raw = lambda h, y: cur[y] if h == CUR else prev[y]
    layout, _ = lib.build_layout('Value', 'EU CRF', f"[{CUR}] - [{PREV}]",
                                 helpers, years, raw)
    return layout


def _l8_headers():
    V, _ = lib.grid(CH, 'L8. bioenergy')

    def sector(a):
        a = (a or '').lower()
        if 'transformation' in a:
            return 'Power and heat'
        if 'industry' in a:
            return 'Industry'
        if 'transport' in a:
            return 'Transport'
        return 'Other sectors'

    out, used = {}, set()
    for r in range(42, 82):
        h = f"{sector(V.get((r, 1)))}: {V.get((r, 2))}"
        base, i = h, 2
        while h in used:
            h = f"{base} ({i})"
            i += 1
        used.add(h)
        out[r] = h
    return out


if __name__ == '__main__':
    import json
    GT = json.load(open('scripts/esabcc-indicator-derivations/ground_truth.json'))
    EX = json.load(open('scripts/esabcc-indicators/extract.json'))

    def expected(ind_id):
        m = GT[ind_id]
        for s in EX[m['overview_sheet']]['series']:
            if s['label'] == m['overview_series']:
                return {p['year']: p['value'] for p in s['data']}
        return {}

    layouts = build()
    print(f"{'indicator':32} {'PASS':5} {'cols':4} worst_d")
    allok = True
    for ind_id, lay in layouts.items():
        comp = lib.recompute_layout(lay)
        exp = expected(ind_id)
        ok, msgs = lib.verify(ind_id, comp, exp, tol=1.0)
        worst = max((abs(comp[y] - exp[y]) for y in (set(comp) & set(exp))
                     if comp[y] is not None), default=float('nan'))
        print(f"{ind_id:32} {'PASS' if ok else 'FAIL':5} "
              f"{len(lay['columns']):4} {worst:.4f}")
        if not ok:
            allok = False
            for m in msgs:
                print('   ', m)
    print('\nALL PASS' if allok else '\nSOME FAILED')
