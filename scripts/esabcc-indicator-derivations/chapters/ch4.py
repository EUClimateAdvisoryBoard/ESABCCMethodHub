"""Ch4 — Energy supply & demand indicators (E1–E6).

Each layout exposes a year-indexed calc grid: Value (col 0) carries the formula
that reproduces the published overview figure from the deepest raw rows the
chapter sheet provides; helper columns hold those raw inputs.

Recipe styles used here:
  • transpose  — auto-expand an in-sheet formula graph to its raw rows
                 (E2 shares, E5 electrification: ratios of TWh/GWh components).
  • manual sum — components captured as raw leaves, Value = their sum
                 (E1 energy-supply GHG, E6 energy methane: stacked CRF rows that
                  are sourced from EXTERNAL workbook links, so the transposer
                  cannot resolve them — their cached values are captured instead).
  • difference — annual capacity additions = cumulative(t) − cumulative(t−1)
                 (E4a solar PV, E4b wind onshore). The transposer cannot follow
                 the prior-year column, so this is hand-built.
  • passthrough — a single raw series feeding Value (E3 grid CO2 intensity).
"""
import sys
sys.path.insert(0, 'scripts/esabcc-indicator-derivations')
import lib, transpose

CH = 'scratch/ch/Ch4. Energy - final indicators and graphs.xlsx'

# Column D (=4) is 2005 on every sheet that runs the year axis from 2005.
def _col_2005(y):
    return 4 + (y - 2005)


def _manual_sum(sheet, comp_rows, value_header, value_source, year0_col=4,
                years=range(2005, 2022), total_row=None, total_years=None):
    """Value = sum of comp_rows (captured as raw-leaf helpers).
    `total_row`/`total_years`: optionally append years where only the published
    aggregate exists (no breakdown) via an additive override helper."""
    V, _ = lib.grid(CH, sheet)
    def col(y): return year0_col + (y - 2005)
    helpers = [{"header": V.get((r, 1)), "source": V.get((r, 2)), "row": r}
               for r in comp_rows]
    headers = [h["header"] for h in helpers]
    override_h = None
    if total_row is not None:
        override_h = "Total (reported, no breakdown)"
    expr = "(" + "+".join(f"[{h}]" for h in headers) + ")"
    if override_h:
        expr = "(" + "+".join(f"[{h}]" for h in headers) + f"+[{override_h}])"

    cols = [{"header": value_header, "source": value_source,
             "formula": {"expr": expr}}]
    for h in helpers:
        c = {"header": h["header"]}
        if h["source"]:
            c["source"] = h["source"]
        cols.append(c)
    if override_h:
        cols.append({"header": override_h, "source": value_source})

    all_years = list(years)
    if total_years:
        all_years = sorted(set(all_years) | set(total_years))
    rows, computed = [], {}
    for y in all_years:
        breakdown = {h["header"]: V.get((h["row"], col(y))) for h in helpers}
        ov = None
        if override_h:
            have_breakdown = all(breakdown[h["header"]] is not None for h in helpers)
            if not have_breakdown and total_years and y in total_years:
                ov = V.get((total_row, col(y)))
                for h in helpers:
                    breakdown[h["header"]] = 0.0
            else:
                ov = 0.0
        valvars = dict(breakdown)
        if override_h:
            valvars[override_h] = ov
        hdr_list = [value_header] + headers + ([override_h] if override_h else [])
        val = lib.eval_expr(expr, hdr_list, valvars)
        computed[y] = val
        cells = [val] + [breakdown[h] for h in headers]
        if override_h:
            cells.append(ov)
        rows.append({"year": y, "cells": cells})
    return {"columns": cols, "rows": rows}, computed


def _manual_ratio(sheet, num_rows, total_row, value_header, value_source,
                  years, year0_col=4):
    """Value = (sum of num_rows) / total_row, each captured as a per-year raw
    leaf helper. Used for the E2 electricity-mix shares, whose component rows
    are cross-sheet refs (which the transposer would freeze to one constant) but
    whose per-year values are cached in this sheet."""
    V, _ = lib.grid(CH, sheet)
    def col(y): return year0_col + (y - 2005)
    num = [{"header": V.get((r, 1)), "source": V.get((r, 2)), "row": r} for r in num_rows]
    tot = {"header": V.get((total_row, 1)) or "Total", "source": V.get((total_row, 2)),
           "row": total_row}
    nheaders = [h["header"] for h in num]
    expr = "(" + "+".join(f"[{h}]" for h in nheaders) + f") / [{tot['header']}]"
    cols = [{"header": value_header, "source": value_source, "formula": {"expr": expr}}]
    for h in num + [tot]:
        c = {"header": h["header"]}
        if h["source"]:
            c["source"] = h["source"]
        cols.append(c)
    hdr_list = [value_header] + nheaders + [tot["header"]]
    rows, computed = [], {}
    for y in years:
        vals = {h["header"]: V.get((h["row"], col(y))) for h in num}
        vals[tot["header"]] = V.get((tot["row"], col(y)))
        val = lib.eval_expr(expr, hdr_list, vals)
        computed[y] = val
        cells = [val] + [vals[h] for h in hdr_list[1:]]
        rows.append({"year": y, "cells": cells})
    return {"columns": cols, "rows": rows}, computed


def _difference(sheet, cum_row, divisor, value_header, value_source, raw_source,
                cum_header, year0_col=4, years=range(2006, 2022)):
    """Annual additions = (cumulative[t] - cumulative[t-1]) / divisor.
    Two helpers carry the cumulative capacity this year and last year."""
    V, _ = lib.grid(CH, sheet)
    def col(y): return year0_col + (y - 2005)
    prev_header = cum_header + " (previous year)"
    expr = f"([{cum_header}] - [{prev_header}]) / {divisor}"
    cols = [{"header": value_header, "source": value_source,
             "formula": {"expr": expr}},
            {"header": cum_header, "source": raw_source},
            {"header": prev_header, "source": raw_source}]
    rows, computed = [], {}
    for y in years:
        cur = V.get((cum_row, col(y)))
        prev = V.get((cum_row, col(y) - 1))
        val = (cur - prev) / divisor if (cur is not None and prev is not None) else None
        computed[y] = val
        rows.append({"year": y, "cells": [val, cur, prev]})
    return {"columns": cols, "rows": rows}, computed


def _passthrough(sheet, raw_row, value_header, value_source,
                 year0_col=4, years=range(2005, 2023)):
    """A single raw series captured as one helper feeding Value (formula = ref)."""
    V, _ = lib.grid(CH, sheet)
    def col(y): return year0_col + (y - 2005)
    raw_h = V.get((raw_row, 1)) or value_header
    expr = f"[{raw_h}]"
    cols = [{"header": value_header, "source": value_source,
             "formula": {"expr": expr}},
            {"header": raw_h, "source": V.get((raw_row, 2)) or value_source}]
    rows, computed = [], {}
    for y in years:
        v = V.get((raw_row, col(y)))
        if v is None:
            continue
        computed[y] = v
        rows.append({"year": y, "cells": [v, v]})
    return {"columns": cols, "rows": rows}, computed


def build():
    EEA = 'EEA / EU GHG inventory (UNFCCC CRF), EU-27'
    ESTAT = 'Eurostat energy balances (EU-27)'
    EPCRW = 'Eurostat NRG_INF_EPCRW (cumulative installed capacity, EU-27)'
    out = {}

    # E1 — Energy-supply GHG (Mt CO2eq). Figure 11/13 'Total'.
    # Total = Power&heat (1.A.1.a) + Refineries (1.A.1.b) + Other energy
    # industries (1.A.1.c) + Fugitive (1.B). Rows 51/7/52/53 are the deepest
    # in-sheet raw rows (each pulled from the external inventory workbook).
    # 2022 carries only the published total (no breakdown) -> override term.
    e1, _ = _manual_sum('E1. Total emissions', [51, 7, 52, 53],
                        'Value', EEA, years=range(2005, 2022),
                        total_row=3, total_years=[2022])
    out['esabcc-e1-energy-supply-ghg'] = e1

    # E2 — Electricity mix shares (fractions; overview is also a fraction).
    # Hand-built ratios: the component rows (3-12) are cross-sheet refs to
    # '4bisElecMixEStat' (the transposer would freeze them to a 2005 constant
    # and flat-line the share), but their per-year values are cached in-sheet.
    # Fossils = (solid 4 + gas 5 + oil&other 6) / total 3.
    EMIX = 'Eurostat energy balances (EU-27 gross electricity generation)'
    e2f, _ = _manual_ratio('E2. Elec mix', [4, 5, 6], 3, 'Value', EMIX,
                           years=range(2005, 2023))
    out['esabcc-e2-fossil-power-share'] = e2f
    # Non-bio renewables = (hydro 8 + solar 9 + wind 10 + other non-bio 11) / total 3.
    e2r, _ = _manual_ratio('E2. Elec mix', [8, 9, 10, 11], 3, 'Value', EMIX,
                           years=range(2005, 2023))
    out['esabcc-e2-res-noBio-power-share'] = e2r

    # E3 — Grid CO2 intensity (g CO2eq/kWh). Raw EEA series, passthrough.
    e3, _ = _passthrough('E3. ElecGridIntensity', 3, 'Value',
                         'EEA: GHG intensity of electricity generation in Europe (EU-27)',
                         years=range(2005, 2023))
    out['esabcc-e3-grid-co2-intensity'] = e3

    # E4a — Annual solar-PV capacity additions (GW/yr) = ΔROW85 cumulative /1000.
    e4a, _ = _difference('E4a,b&c. Power capacity', 85, 1000.0, 'Value',
                         'Eurostat NRG_INF_EPCRW (annual change in cumulative solar-PV capacity)',
                         EPCRW, 'Solar PV cumulative capacity (MW)',
                         years=range(2006, 2022))
    out['esabcc-e4a-solar-pv-add'] = e4a

    # E4b — Annual wind (onshore) capacity additions (GW/yr) = ΔROW81 /1000.
    e4b, _ = _difference('E4a,b&c. Power capacity', 81, 1000.0, 'Value',
                         'Eurostat NRG_INF_EPCRW (annual change in cumulative onshore-wind capacity)',
                         EPCRW, 'Onshore wind cumulative capacity (MW)',
                         years=range(2006, 2022))
    out['esabcc-e4b-wind-add'] = e4b

    # E5 — Electrification rate (fraction) = FEC electricity / FEC total.
    Te = transpose.Transposer(CH, 'E5. Electrification')
    yce = {2005 + (c - 4): c for c in range(4, 21)}  # D..T = 2005..2021
    e5, _ = Te.expand(3, yce, value_header='Value',
                      value_source='Eurostat energy balances (EU-27 final energy consumption)')
    out['esabcc-e5-electrification'] = e5

    # E6 — Energy-related methane (Mt CO2eq) = Fuel combustion + Fugitive solid
    # + Fugitive other (rows 4/5/6, each from the external CRF workbook).
    e6, _ = _manual_sum('E6. Methane', [4, 5, 6], 'Value',
                        'EEA / EU GHG inventory (UNFCCC CRF Table 1s1 & 1s2, CH4), EU-27',
                        years=range(2005, 2022))
    out['esabcc-e6-energy-ch4'] = e6

    return out


if __name__ == '__main__':
    import json
    gt = json.load(open('scripts/esabcc-indicator-derivations/ground_truth.json'))
    ext = json.load(open('scripts/esabcc-indicators/extract.json'))

    def expected(ind):
        meta = gt[ind]
        s = ext[meta['overview_sheet']]
        series = s.get('series', s) if isinstance(s, dict) else s
        for ser in series:
            if ser['label'] == meta['overview_series']:
                return {p['year']: p['value'] for p in ser['data']}
        return {}

    layouts = build()
    print(f"{'indicator':40s} {'result':8s} {'ncols':5s} worstΔ")
    allok = True
    for ind, lay in layouts.items():
        comp = lib.recompute_layout(lay)
        exp = expected(ind)
        ok, msgs = lib.verify(ind, comp, exp, tol=1.0)
        allok &= ok
        common = sorted(set(comp) & set(exp))
        worst = max((abs(comp[y] - exp[y]) for y in common
                     if comp[y] is not None), default=float('nan'))
        print(f"{ind:40s} {'PASS' if ok else 'FAIL':8s} "
              f"{len(lay['columns']):5d} {worst:.5f}")
        if not ok:
            for m in msgs[1:]:
                print('   ', m)
    print('\nALL PASS' if allok else '\nSOME FAILED')
