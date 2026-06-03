"""Ch6 — Transport (T1, T2a, T2b, T3a, T3b, T4, T5a, T5b, T6a, T6b).

Each layout is built either by:
  • transpose: auto-expand a chapter formula graph down to its deepest raw rows
    (T1, T2a, T2b, T5a, T5b, T6a — composites / sums over Eurostat / EEA / AFO
    line items);
  • a hand-built share recipe (T3a — road share = component / (total − air), with
    the T2a deepest passenger-demand rows as helpers, mirroring the workbook's
    cross-sheet ratio which the transposer would otherwise collapse to constants);
  • a single raw helper feeding Value (T3b air demand, T4 WLTP intensity — series
    the chapter publishes directly with no on-sheet derivation);
  • a raw × unit-factor conversion (T6b — Mtoe → TWh, like ch3 O2/O3).

Every layout is verified against the published overview figure (extract.json /
ground_truth.json) within tol=1.0 before it is returned.
"""
import sys
sys.path.insert(0, 'scripts/esabcc-indicator-derivations')
import lib, transpose

CH = 'scratch/ch/Ch6. Transport - final indicators and graphs.xlsx'


def _transpose(sheet, row, year_cols, value_source=None):
    T = transpose.Transposer(CH, sheet)
    layout, _ = T.expand(row, year_cols, value_header='Value', value_source=value_source)
    return layout


def _coerce_none_to_zero(layout, headers, years=None):
    """Excel treats empty leaf cells as 0 in +; lib.eval propagates None. Replace
    None with 0 in the named leaf columns so sums of partially-populated series
    (e.g. T5b H2, blank in 2015) recompute as the sheet does."""
    cols = [c["header"] for c in layout["columns"]]
    idx = [cols.index(h) for h in headers if h in cols]
    for row in layout["rows"]:
        if years is not None and row["year"] not in years:
            continue
        for i in idx:
            if row["cells"][i] is None:
                row["cells"][i] = 0
    return layout


def _t3a():
    """Road (cars+2W) share of motorised inland passenger transport.
    = (Cars + 2W) / (Cars + 2W + Buses + Rail + Tram&Metro)
    i.e. component over (total − air), expanded to the T2a Eurostat raw rows."""
    V, _ = lib.grid(CH, 'T2a. total demand passenger')
    # T2a raw rows: 23 Passenger Cars, 24 Powered 2-wheelers, 25 Buses & Coaches,
    # 26 Railways, 28 Tram & Metro.  Cols D(4)=2005 .. S(19)=2020.
    rows = {23: 'Passenger Cars', 24: 'Powered 2-wheelers', 25: 'Buses & Coaches',
            26: 'Railways', 28: 'Tram & Metro'}
    year_cols = {2005 + (c - 4): c for c in range(4, 20)}
    years = [y for y in sorted(year_cols)
             if all(isinstance(V.get((r, year_cols[y])), (int, float)) for r in rows)]
    raw_vals = {(r, y): V.get((r, year_cols[y])) for r in rows for y in years}

    def raw(h, y):
        for r, name in rows.items():
            if name == h:
                return raw_vals[(r, y)]
    helpers = [{"header": rows[r], "source": "Eurostat Statistical Pocketbook 2022"}
               for r in (23, 24, 25, 26, 28)]
    expr = ("([Passenger Cars]+[Powered 2-wheelers])/"
            "([Passenger Cars]+[Powered 2-wheelers]+[Buses & Coaches]+[Railways]+[Tram & Metro])")
    layout, _ = lib.build_layout('Value', 'Eurostat Statistical Pocketbook 2022',
                                 expr, helpers, years, raw)
    return layout


def _raw_series(sheet, row, year_cols, raw_header, source):
    """A published series with no on-sheet derivation: capture it as one raw
    helper feeding Value = [raw_header]."""
    V, _ = lib.grid(CH, sheet)
    years = [y for y in sorted(year_cols)
             if isinstance(V.get((row, year_cols[y])), (int, float))]
    vals = {y: V.get((row, year_cols[y])) for y in years}

    def raw(h, y):
        return vals[y]
    layout, _ = lib.build_layout('Value', source, f"[{raw_header}]",
                                 [{"header": raw_header, "source": source}], years, raw)
    return layout


def _t6b():
    """Food-crop biofuels: raw Eurostat/SHARES Mtoe × 11.63 → TWh.
    Workbook cols D..N map to overview years 2005..2015 (header labels offset)."""
    V, _ = lib.grid(CH, 'T6b. conventional biofuels')
    # row 3 = Mtoe.  Cols D(4)..N(14) -> overview years 2005..2015.
    year_cols = {2005 + (c - 4): c for c in range(4, 15)}
    years = [y for y in sorted(year_cols)
             if isinstance(V.get((3, year_cols[y])), (int, float))]
    mtoe = {y: V.get((3, year_cols[y])) for y in years}

    def raw(h, y):
        return 11.63 if h == 'Mtoe → TWh' else mtoe[y]
    helpers = [{"header": 'Biofuels from food crops (Mtoe)', "source": 'SHARES summary sheet'},
               {"header": 'Mtoe → TWh', "source": 'IEA unit converter'}]
    layout, _ = lib.build_layout('Value', 'SHARES summary sheet',
                                 "[Biofuels from food crops (Mtoe)] * [Mtoe → TWh]",
                                 helpers, years, raw)
    return layout


def build():
    out = {}

    # T1 — transport GHG total: composite over EEA UNFCCC inventory raw rows.
    # Row 3 Total = road cars+mc + HDV/buses + LDT + rail/IWW + aviation + other,
    # each /1000 from kt rows.  Cols E(5)=2005 .. U(21)=2021 share one formula;
    # 2022 (col V) uses a different proxy aggregate (only the 1.A.3 total + intl
    # aviation rows exist) so it is left out of the consistent derivation.
    out['esabcc-t1-transport-ghg'] = _transpose(
        'T1. GHG emissions', 3, {2005 + (c - 5): c for c in range(5, 22)},
        value_source='EEA GHG data viewer')

    # T2a — total passenger demand: sum of Eurostat Pocketbook modes (raw rows).
    out['esabcc-t2a-passenger-demand'] = _transpose(
        'T2a. total demand passenger', 3, {2005 + (c - 4): c for c in range(4, 20)})

    # T2b — total freight demand: Road + Rail + IWW (raw Eurostat rows).
    out['esabcc-t2b-freight-demand'] = _transpose(
        'T2b. total demand freight', 3, {2005 + (c - 4): c for c in range(4, 20)})

    # T3a — road share of motorised inland passenger transport (component/total).
    out['esabcc-t3a-road-share-passenger'] = _t3a()

    # T3b — intra-EU air passenger demand: published raw series (T2a Air row).
    out['esabcc-t3b-air-passenger'] = _raw_series(
        'T2a. total demand passenger', 29, {2005 + (c - 4): c for c in range(4, 20)},
        'Air passenger demand (Gpkm)', 'Eurostat Statistical Pocketbook 2022')

    # T4 — new-car CO2 intensity (WLTP): published raw series (EEA), 2020-2022.
    out['esabcc-t4-car-co2-intensity'] = _raw_series(
        'T4. GHG intensity', 4, {2020: 19, 2021: 20, 2022: 21},
        'New-car CO2 intensity WLTP (gCO2/km)', 'EEA')

    # T5a — ZEV share of new car registrations: BEV% + H2% (AFO raw % rows).
    out['esabcc-t5a-zev-share-newcars'] = _transpose(
        'T5a&b. ZEV shares', 25, {2010 + (c - 9): c for c in range(9, 22)})

    # T5b — zero-emission lorries in fleet: BEV + H2 (# in fleet, AFO raw rows).
    t5b = _transpose('T5a&b. ZEV shares', 90, {2015 + (c - 14): c for c in range(14, 22)})
    out['esabcc-t5b-zev-lorries-stock'] = _coerce_none_to_zero(t5b, ['H2'])

    # T6a — fossil share of transport energy use: ratio of sums over Eurostat
    # energy-balance ktoe line items (transport + intl maritime).
    out['esabcc-t6a-fossil-transport-share'] = _transpose(
        'T6a. % of fossil fuels', 3, {2005 + (c - 4): c for c in range(4, 21)})

    # T6b — food-crop biofuels: raw Mtoe × 11.63 → TWh.
    out['esabcc-t6b-foodcrop-biofuels'] = _t6b()

    return out


if __name__ == '__main__':
    import json
    extract = json.load(open('scripts/esabcc-indicators/extract.json'))
    gt = json.load(open('scripts/esabcc-indicator-derivations/ground_truth.json'))

    def expected(ind_id):
        m = gt[ind_id]
        for s in extract[m['overview_sheet']]['series']:
            if s['label'] == m['overview_series']:
                return {x['year']: x['value'] for x in s['data']}
        return {}

    layouts = build()
    print(f"{'indicator':36} {'cols':>4} {'result':>8} {'worstΔ':>10}")
    all_ok = True
    for ind_id, layout in layouts.items():
        computed = lib.recompute_layout(layout)
        exp = expected(ind_id)
        ok, msgs = lib.verify(ind_id, computed, exp, 1.0)
        all_ok = all_ok and ok
        ncols = len(layout['columns'])
        import re
        worst = 0.0
        m = re.search(r'worst Δ([\d.]+)', msgs[0])
        if m:
            worst = float(m.group(1))
        print(f"{ind_id:36} {ncols:>4} {'PASS' if ok else 'FAIL':>8} {worst:>10.4f}")
        if not ok:
            for line in msgs[1:6]:
                print('   ', line)
    print('\nALL PASS' if all_ok else '\nSOME FAILED')
