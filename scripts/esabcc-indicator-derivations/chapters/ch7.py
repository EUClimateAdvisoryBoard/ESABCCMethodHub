"""Ch7 — Buildings (B1, B2, B5a, B5b, B6). Each indicator exposes its derivation
as a calc-space layout over the DEEPEST RAW ROWS the chapter workbook provides.

Recipe styles used:
  • transpose: auto-expand a chapter ratio/sum graph to its raw rows (B5a — the
    residential energy-mix block is self-contained in this sheet).
  • hand-built sum / ratio / conversion over captured raw leaf rows (B1, B2, B5b,
    B6). Hand-building is needed where the Transposer would mangle the chapter
    inputs: named-reference conversion factors (EJ2TWh) get garbled by the
    cell-ref regex (B2), and cross-sheet / external-workbook leaf formulas would
    be collapsed to a single year's constant (B1 CRF external links; B5b
    'Energy balances' cross-sheet links). In those cases we capture each raw
    row's published per-year values as leaves so the derivation still recomputes
    year-by-year.

Every layout is verified against the published overview figure (ground_truth.json
/ extract.json) within tol=1.0 before being returned.
"""
import sys
sys.path.insert(0, 'scripts/esabcc-indicator-derivations')
import lib, transpose

CH = 'scratch/ch/Ch7. Buildings - final indicators and graphs.xlsx'
EUROSTAT = 'Eurostat energy balances'
EHPA = 'EHPA annual report'
INVENTORY = 'EEA / UNFCCC inventory CRF Table 1.A(a)s4'


def _raw_rows(sheet, rows, year0_col, year0):
    """Read cached per-year values for `rows` (row->header/source spec).
    Returns (years_with_full_data, value_by_(header,year))."""
    V, _ = lib.grid(CH, sheet)
    def col_of(y):
        return year0_col + (y - year0)
    # determine available years = those where every listed row has a number
    years = []
    y = year0
    while True:
        c = col_of(y)
        vals = [V.get((r, c)) for r in rows]
        if all(isinstance(v, (int, float)) for v in vals):
            years.append(y); y += 1
        else:
            # stop at first gap after data has started
            if years:
                break
            else:
                # no data yet at year0 -> sheet/col mismatch
                break
    data = {}
    for y in years:
        c = col_of(y)
        for r in rows:
            data[(rows[r]["header"], y)] = V.get((r, c))
    return years, data


def _sum_ratio(sheet, value_expr, helper_specs, year0_col, year0, value_source):
    """Build a layout whose Value = `value_expr` over hand-captured raw leaf rows.
    helper_specs: ordered dict row -> {header, source}."""
    years, data = _raw_rows(sheet, helper_specs, year0_col, year0)
    helpers = [{"header": s["header"], "source": s.get("source")}
               for s in helper_specs.values()]
    def raw(h, y):
        return data[(h, y)]
    layout, _ = lib.build_layout('Value', value_source, value_expr, helpers, years, raw)
    return layout


def build():
    out = {}

    # ── B1 — Residential + tertiary building GHG (Mt CO2e) ──────────────────
    # Sheet 'B1. GHG emissions' row 3 = Residential(62) + Tertiary energy(63)
    # + Agriculture&fisheries energy(64). Rows 62/63/64 are the deepest rows in
    # this workbook; their cells derive from external CRF workbooks ([1]..[N]),
    # so we capture their published per-year values as raw leaves. (2022 exists
    # only as a published literal at row 3 with no raw inputs, so it is excluded.)
    b1_rows = {
        62: {"header": "Residential (CRF 1.A.4.b)", "source": INVENTORY},
        63: {"header": "Tertiary (CRF 1.A.4.a)", "source": INVENTORY},
        64: {"header": "Agriculture & fisheries energy (CRF 1.A.4.c)", "source": INVENTORY},
    }
    out['esabcc-b1-buildings-ghg'] = _sum_ratio(
        'B1. GHG emissions',
        "[Residential (CRF 1.A.4.b)]+[Tertiary (CRF 1.A.4.a)]"
        "+[Agriculture & fisheries energy (CRF 1.A.4.c)]",
        b1_rows, year0_col=4, year0=2005,
        value_source='EEA GHG data viewer (UNFCCC CRF)')

    # ── B2 — Final energy consumption in buildings (TWh) ────────────────────
    # Sheet 'B2. buildings - energy': Total(16) = Residential(15) + Tertiary(14)
    #   Residential = households(12) * EJ2TWh/1e6
    #   Tertiary    = (commercial(11) + agriculture(13)) * EJ2TWh/1e6
    # Raw rows 11/12/13 are Eurostat energy balances in TJ; EJ2TWh=277.78 is the
    # named conversion factor (hand-built so it is not garbled by the transposer).
    b2_rows = {
        11: {"header": "Tertiary commercial & public services (TJ)", "source": EUROSTAT},
        12: {"header": "Residential households (TJ)", "source": EUROSTAT},
        13: {"header": "Agriculture & forestry (TJ)", "source": EUROSTAT},
    }
    years, data = _raw_rows('B2. buildings - energy', b2_rows, 4, 2005)
    EJ2TWh = 277.78
    helpers = [{"header": b2_rows[r]["header"], "source": b2_rows[r]["source"]}
               for r in (11, 12, 13)]
    helpers.append({"header": "TJ → TWh (EJ2TWh/1e6)", "source": "Named Refs&Conversions"})
    def b2_raw(h, y):
        if h == "TJ → TWh (EJ2TWh/1e6)":
            return EJ2TWh / 1000000.0
        return data[(h, y)]
    b2_expr = ("([Residential households (TJ)]"
               "+[Tertiary commercial & public services (TJ)]"
               "+[Agriculture & forestry (TJ)]) * [TJ → TWh (EJ2TWh/1e6)]")
    b2_layout, _ = lib.build_layout('Value', EUROSTAT, b2_expr, helpers, years, b2_raw)
    out['esabcc-b2-buildings-fec'] = b2_layout

    # ── B5a — Fossil share of residential energy mix (fraction) ─────────────
    # Sheet 'B5a&b energy mix new' row 4 = SUM(fossils 39:41) / Total(38=SUM39:45).
    # Self-contained block of 7 Eurostat ktoe fuel rows -> transpose expand.
    T = transpose.Transposer(CH, 'B5a&b energy mix new')
    yc = {2005 + (c - 4): c for c in range(4, 21)}  # D(4)=2005 .. T(20)=2021
    b5a, _ = T.expand(4, yc, value_header='Value', value_source=EUROSTAT)
    out['esabcc-b5a-residential-fossil-share'] = b5a

    # ── B5b — Fossil share of tertiary energy mix (fraction) ────────────────
    # Same sheet row 63 = SUM(fossils 94:96) / Total(93=SUM94:100). The 7 raw
    # rows 94..100 derive from the 'Energy balances (for buildings)' sheet via
    # cross-sheet refs, so we capture their published per-year ktoe as leaves.
    b5b_rows = {
        94: {"header": "Other fossils (solids/liquid) (tertiary, ktoe)", "source": EUROSTAT},
        95: {"header": "Liquid fossils (tertiary, ktoe)", "source": EUROSTAT},
        96: {"header": "Natural gas (tertiary, ktoe)", "source": EUROSTAT},
        97: {"header": "Electricity (tertiary, ktoe)", "source": EUROSTAT},
        98: {"header": "District heating (tertiary, ktoe)", "source": EUROSTAT},
        99: {"header": "Renewables - bio (tertiary, ktoe)", "source": EUROSTAT},
        100: {"header": "Renewables - other (tertiary, ktoe)", "source": EUROSTAT},
    }
    b5b_expr = ("([Other fossils (solids/liquid) (tertiary, ktoe)]"
                "+[Liquid fossils (tertiary, ktoe)]"
                "+[Natural gas (tertiary, ktoe)])"
                " / ([Other fossils (solids/liquid) (tertiary, ktoe)]"
                "+[Liquid fossils (tertiary, ktoe)]"
                "+[Natural gas (tertiary, ktoe)]"
                "+[Electricity (tertiary, ktoe)]"
                "+[District heating (tertiary, ktoe)]"
                "+[Renewables - bio (tertiary, ktoe)]"
                "+[Renewables - other (tertiary, ktoe)])")
    out['esabcc-b5b-tertiary-fossil-share'] = _sum_ratio(
        'B5a&b energy mix new', b5b_expr, b5b_rows,
        year0_col=4, year0=2005, value_source=EUROSTAT)

    # ── B6 — EU stock of installed heat pumps (million units) ───────────────
    # Sheet 'B6. heat pumps' row 35 = Total stock(19) / 1000. Raw row 19 is the
    # EHPA total-stock series in thousand units. B(2)=2005 .. S(19)=2022.
    b6_rows = {19: {"header": "Total heat-pump stock (thousand units)", "source": EHPA}}
    years, data = _raw_rows('B6. heat pumps', b6_rows, 2, 2005)
    helpers = [{"header": "Total heat-pump stock (thousand units)", "source": EHPA},
               {"header": "thousand → million (/1000)", "source": None}]
    def b6_raw(h, y):
        if h == "thousand → million (/1000)":
            return 0.001
        return data[(h, y)]
    b6_expr = "[Total heat-pump stock (thousand units)] * [thousand → million (/1000)]"
    b6_layout, _ = lib.build_layout('Value', EHPA, b6_expr, helpers, years, b6_raw)
    out['esabcc-b6-heat-pump-stock'] = b6_layout

    return out


if __name__ == '__main__':
    import json
    extract = json.load(open('scripts/esabcc-indicators/extract.json'))
    gt = json.load(open('scripts/esabcc-indicator-derivations/ground_truth.json'))

    def expected_for(ind_id):
        meta = gt[ind_id]
        fig = extract[meta['overview_sheet']]
        for s in fig['series']:
            if s['label'] == meta['overview_series']:
                return {p['year']: p['value'] for p in s['data']}
        return {}

    layouts = build()
    print(f"{'indicator':<38} {'PASS/FAIL':<9} cols  worstΔ")
    print('-' * 70)
    allok = True
    for ind_id, layout in layouts.items():
        computed = lib.recompute_layout(layout)
        exp = expected_for(ind_id)
        ok, msgs = lib.verify(ind_id, computed, exp, tol=1.0)
        ncols = len(layout['columns'])
        worst = 0.0
        common = sorted(set(computed) & set(exp))
        for y in common:
            if computed[y] is not None:
                worst = max(worst, abs(computed[y] - exp[y]))
        print(f"{ind_id:<38} {'PASS' if ok else 'FAIL':<9} {ncols:<5} {worst:.6f}")
        if not ok:
            allok = False
            for m in msgs:
                print('   ', m)
    print('-' * 70)
    print('ALL PASS' if allok else 'SOME FAILED')
