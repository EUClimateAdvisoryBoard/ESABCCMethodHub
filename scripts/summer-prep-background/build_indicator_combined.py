"""
Combined background document — one workbook for the whole Summer Prep
Indicator module.

Merges the three separate indicator workbooks into a single file:

  * Indicator Check   — Overview, one tab per chapter, Data (long),
                        Where the data comes from  (build_indicator_check.py)
  * New data overview — the one "everything that has moved" figure
                        (build_indicator_overview.build_new_data_overview)
  * Old vs new         — Old vs new, Derivations, Sources
                        (build_indicator_overview.build_old_vs_new)

Each of those builders already knows how to write into a caller-supplied
Workbook instead of creating and saving its own (pass `wb=`); this script is
the caller. Every source builder's own "Read me" sheet is skipped in that
mode — this script writes ONE merged "Read me" that describes every section
and says which sheets belong to it, so the combined book still opens on an
orientation page instead of straight into a table.

The exact-dataset-link column ("Where the data comes from", "Sources") and
the Primary-source hyperlinks ("Overview", "Old vs new") are added inside the
source builders themselves (see dataset_links.py) — they appear here and in
the three standalone workbooks alike, since it is the same code either way.

Two things exist ONLY in this combined workbook, not in the three standalone
ones:

  * A Dashboard — the first content sheet after Read me: a KPI band, the
    largest moves since the report as a diverging bar, chapter coverage,
    four headline trend lines and (where the underlying indicators carry a
    target) a distance-to-target panel. `_build_dashboard` below.

  * Derivation wiring — once every sheet is built, `_wire_to_derivations`
    rewrites every value cell elsewhere in the workbook (chapter tabs,
    Data (long), New data, Old vs new, Overview, the Dashboard's own data
    block) that matches a Derivations block's Value cell for the same
    (indicator, year) as a live cross-sheet formula `='Derivations'!B<row>`
    instead of a literal — so the coordinator's own instruction ("you derive
    it there and only work in the derivation table and then the data
    updates") is literally true in this file: edit an input in Derivations,
    and every table and chart fed from a wired cell recomputes with it.
    A cell is only ever wired if the Derivations value it would point at
    already agrees with the stored data point to within 0.5% — a bigger gap
    is left as a literal and reported, on the view that a genuine
    derivation-vs-data discrepancy should be visible, not silently masked by
    the wiring.

Usage:
  python3 build_indicator_combined.py data.json calc.json calc_excel.json factcheck.json reportway.json out.xlsx

  data.json      — extract.mjs's output (src/data, run live, no cache)
  calc.json      — the calc grid, "Indicator Check" shape (columns[].formula
                   as a string, rows[].cells) — used for "Where the data
                   comes from" / the chapter tabs' method label
  calc_excel.json — the calc grid, "Old vs new" / Derivations shape
                   (columns[].expr, rows[].formulas as ready Excel formula
                   text) — used for the Derivations sheet
  factcheck.json — the 27 July 2026 fact-check results (rows[])
  reportway.json — the report's-own-derivation-continued rows ({"filled": {…}})
"""

import json
import sys
from collections import Counter

from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.chart.marker import DataPoint, Marker
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

import build_indicator_check as check
import build_indicator_overview as overview
import formula_eval as fe
from esabcc_style import (
    ACCENT_ORANGE, BODY_FILL, BODY_FONT, FONT_SEMI, H2_FONT, SMALL_FONT, TEAL, TEAL_PALE, WHITE,
    header_row, note_line, set_widths, sheet_setup, style_chart,
    text_categories, title_block,
)

PREPARED = "27 July 2026"

FC_ORDER = ["CONFIRMED", "NOT CHECKABLE", "NO SOURCE YEAR", "REVISION", "WRONG"]

WIRE_TOLERANCE_PCT = 0.5   # a Derivations value beyond this is left as a literal

# Dashboard: the four headline series for the "Headline trends" grid, and the
# curated small set of indicators to check against their data.json target for
# the "distance to target" panel (built only for whichever of these actually
# carry a targetValue in the extract — silently skipped otherwise).
HEADLINE_GHG = "esabcc-o1-ghg-total"
HEADLINE_RES = "esabcc-e2-res-noBio-power-share"
HEADLINE_PEC = "esabcc-o2-pec"
HEADLINE_FEC = "esabcc-o2-fec"
HEADLINE_TRANSPORT = "esabcc-t1-transport-ghg"
TARGET_CANDIDATES = ["O1", "B6", "T5b", "I3"]


def _collapse_factcheck(fcraw):
    """Per indicator: the worst verdict over its points (build_indicator_overview's own rule)."""
    fc = {}
    for row in fcraw.get("rows", []):
        cur = fc.setdefault(row["id"], {"verdict": "CONFIRMED"})
        if FC_ORDER.index(row["verdict"]) > FC_ORDER.index(cur["verdict"]):
            cur["verdict"] = row["verdict"]
    return fc


# ── Dashboard ─────────────────────────────────────────────────────────────

MUTED_SHADE = "DCDCDC"   # a neutral grey, deliberately outside the teal family —
                         # "still at report" is not itself a teal-coded quantity


def _kpi_card(ws, row, col, width, label, value, color=TEAL):
    """One KPI band card: a label row over a big value row, `width` columns wide."""
    lc = ws.cell(row=row, column=col, value=label)
    lc.font = Font(name=FONT_SEMI, size=9, color=WHITE)
    lc.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    vc = ws.cell(row=row + 1, column=col, value=value)
    vc.font = Font(name=FONT_SEMI, size=18, color=WHITE, bold=True)
    vc.alignment = Alignment(horizontal="left", vertical="center")
    for rr in (row, row + 1):
        if width > 1:
            ws.merge_cells(start_row=rr, start_column=col, end_row=rr, end_column=col + width - 1)
        for cc in range(col, col + width):
            ws.cell(row=rr, column=cc).fill = PatternFill("solid", fgColor=color)
    ws.row_dimensions[row].height = 16
    ws.row_dimensions[row + 1].height = 26


def _build_dashboard(wb, inds, reads, calc_excel, reportway, factcheck, fc, wire_targets):
    """
    The Dashboard sheet — the workbook's first content sheet — and its hidden
    'Dashboard data' companion, which holds every chart's source block so no
    chart ever has to sit over visible dashboard content (`assert_no_chart_
    overlap` only ever sees blank cells under a Dashboard chart's anchor).

    Every data cell this writes that corresponds to an (indicator, year) with
    a Derivations block is also handed to the same wiring pass as every other
    sheet (`wire_targets.append(...)`), so a derivation-backed dashboard
    figure is driven by Derivations exactly like the tables are; indicators
    with no derivation block keep their literal.
    """
    ds = wb.create_sheet("Dashboard", 1)
    sheet_setup(ds, zoom=90)
    set_widths(ds, [13] * 30)

    dd = wb.create_sheet("Dashboard data")
    sheet_setup(dd)
    dd.sheet_state = "hidden"
    set_widths(dd, [34, 13, 13, 13, 13, 13, 13])

    derivation_backed = sorted(set(calc_excel) | set(reportway))
    updated = [i for i in inds if reads[i["id"]]["post"]]
    confirmed_points = sum(1 for r in factcheck.get("rows", []) if r["verdict"] == "CONFIRMED")

    r = title_block(
        ds, "Dashboard — the indicator module at a glance",
        "The same 97 progress indicators as the rest of this workbook, read top-down instead of table-first: "
        "what has moved since the report, by how much, and where the derivation behind a figure is a live "
        "formula rather than a pasted number. Every figure here is drawn from the sheets that follow, or — "
        "where the indicator is derivation-backed — straight from the Derivations sheet.",
        f"Summer Prep · Policy Gap 2.0 Report — prepared {PREPARED}.", width=20,
    )

    # ── KPI band ─────────────────────────────────────────────────────────
    kpis = [
        ("Progress indicators", f"{len(inds)}"),
        ("With post-report data", f"{len(updated)}"),
        ("Share of series moved on", f"{len(updated) / len(inds) * 100:.0f}%"),
        ("Derivation-backed indicators", f"{len(derivation_backed)}"),
        ("Confirmed fact-check points", f"{confirmed_points}"),
        ("Data as of", "2026-07"),
    ]
    kpi_col = 1
    for label, value in kpis:
        _kpi_card(ds, r, kpi_col, 4, label, value, color=TEAL)
        kpi_col += 5
    r += 3

    # ── Panel: largest moves since the report (diverging bar) ────────────
    movers_all = [i for i in updated if reads[i["id"]]["pct"] is not None]
    movers_all.sort(key=lambda i: reads[i["id"]]["pct"])
    decreases = [i for i in movers_all if reads[i["id"]]["pct"] < 0][:8]
    increases = sorted([i for i in movers_all if reads[i["id"]]["pct"] > 0],
                       key=lambda i: reads[i["id"]]["pct"], reverse=True)[:8]
    movers = sorted(decreases + increases, key=lambda i: reads[i["id"]]["pct"])

    panel_row = r
    ds.cell(row=panel_row, column=1, value="Largest moves since the report").font = H2_FONT
    ds.cell(row=panel_row, column=17, value="Chapter coverage").font = H2_FONT

    dd.cell(row=1, column=1, value="Largest moves — code · name").font = SMALL_FONT
    dd.cell(row=1, column=2, value="Change %").font = SMALL_FONT
    for n, ind in enumerate(movers):
        row = 2 + n
        rd = reads[ind["id"]]
        dd.cell(row=row, column=1, value=f"{ind.get('code')} · {ind['name']}")
        vc = dd.cell(row=row, column=2, value=rd["pct"] / 100)
        vc.number_format = "+0.0%;-0.0%;0.0%"
        if wire_targets is not None:
            wire_targets.append({"sheet": dd.title, "row": row, "col": 8,
                                 "id": ind["id"], "year": rd["latest"]["year"]})
            dd.cell(row=row, column=8, value=rd["latest"]["value"])
    m_first, m_last = 2, 2 + len(movers) - 1
    if movers:
        mv_chart = BarChart()
        mv_chart.type = "bar"
        mv_chart.add_data(Reference(dd, min_col=2, min_row=1, max_row=m_last), titles_from_data=True)
        mv_chart.set_categories(Reference(dd, min_col=1, min_row=m_first, max_row=m_last))
        style_chart(mv_chart, "Change vs the report's last figure — top 8 up, top 8 down",
                   height=1.1 * len(movers) + 3, width=21)
        text_categories(mv_chart, dd, 1, m_first, m_last)
        mv_chart.legend = None
        mv_chart.x_axis.numFmt = "0%"
        ser = mv_chart.series[0]
        ser.data_points = [DataPoint(idx=i) for i in range(len(movers))]
        for i, ind in enumerate(movers):
            pct = reads[ind["id"]]["pct"]
            ser.data_points[i].graphicalProperties.solidFill = TEAL if pct > 0 else ACCENT_ORANGE
            ser.data_points[i].graphicalProperties.line.noFill = True
        ser.dLbls = DataLabelList(showVal=True, numFmt="+0.0%;-0.0%", showLegendKey=False,
                                  showCatName=False, showSerName=False, showPercent=False, showBubbleSize=False)
        ds.add_chart(mv_chart, f"A{panel_row + 1}")

    # ── Panel: chapter coverage (stacked) ─────────────────────────────────
    by_cat = {}
    for i in inds:
        by_cat.setdefault(i["category"], [0, 0])
        by_cat[i["category"]][0 if reads[i["id"]]["post"] else 1] += 1
    cats = [c for c in overview.CATEGORY_ORDER if c in by_cat]
    dd.cell(row=1, column=4, value="Chapter").font = SMALL_FONT
    dd.cell(row=1, column=5, value="Moved on").font = SMALL_FONT
    dd.cell(row=1, column=6, value="Still at report").font = SMALL_FONT
    for n, cat in enumerate(cats):
        up, still = by_cat[cat]
        dd.cell(row=2 + n, column=4, value=overview.CATEGORY_LABEL.get(cat, cat))
        dd.cell(row=2 + n, column=5, value=up)
        dd.cell(row=2 + n, column=6, value=still)
    c_first, c_last = 2, 2 + len(cats) - 1
    cov = BarChart()
    cov.type = "col"
    cov.grouping = "stacked"
    cov.overlap = 100
    cov.gapWidth = 40
    cov.add_data(Reference(dd, min_col=5, max_col=6, min_row=1, max_row=c_last), titles_from_data=True)
    cov.set_categories(Reference(dd, min_col=4, min_row=c_first, max_row=c_last))
    style_chart(cov, "Indicators moved on vs still at the report figure, by chapter", height=11, width=19)
    text_categories(cov, dd, 4, c_first, c_last)
    for series, color in zip(cov.series, [TEAL, MUTED_SHADE]):
        series.graphicalProperties.solidFill = color
        series.graphicalProperties.line.noFill = True
    cov.series[0].dLbls = DataLabelList(showVal=True, showLegendKey=False, showCatName=False,
                                        showSerName=False, showPercent=False, showBubbleSize=False)
    cov.legend.position = "b"
    cov.y_axis.title = "Indicators"
    ds.add_chart(cov, f"Q{panel_row + 1}")

    r = panel_row + 1 + max(1.1 * len(movers) + 3, 11) / 0.53 + 4   # cm -> ~row count, plus a clear buffer
    r = int(r) + 2

    # ── Panel: headline trends (2×2 grid) ─────────────────────────────────
    panel4_row = r
    ds.cell(row=panel4_row, column=1, value="Headline trends").font = H2_FONT
    r = panel4_row + 1

    def _write_series_block(col0, ind_id, label_a="In the 2024 report", label_b="Added since the report"):
        ind = next(i for i in inds if i["id"] == ind_id)
        rd = reads[ind_id]
        data_rows = rd["data"]
        dd.cell(row=1, column=col0, value="Year")
        dd.cell(row=1, column=col0 + 1, value=label_a)
        dd.cell(row=1, column=col0 + 2, value=label_b)
        last_pre_idx = None
        for n, d in enumerate(data_rows):
            is_post = bool(d.get("afterReport"))
            row = 2 + n
            if not is_post:
                last_pre_idx = n
            dd.cell(row=row, column=col0, value=d["year"])
            vcell = dd.cell(row=row, column=col0 + 1 if not is_post else col0 + 2, value=d["value"])
            if wire_targets is not None:
                wire_targets.append({"sheet": dd.title, "row": row,
                                     "col": col0 + 1 if not is_post else col0 + 2,
                                     "id": ind_id, "year": d["year"]})
        if last_pre_idx is not None and rd["post"]:
            row = 2 + last_pre_idx
            dd.cell(row=row, column=col0 + 2, value=data_rows[last_pre_idx]["value"])
            if wire_targets is not None:
                wire_targets.append({"sheet": dd.title, "row": row, "col": col0 + 2,
                                     "id": ind_id, "year": data_rows[last_pre_idx]["year"]})
        first, last = 2, 2 + len(data_rows) - 1
        return ind, first, last

    def _trend_chart(anchor, col0, ind_id, title_prefix):
        ind, first, last = _write_series_block(col0, ind_id)
        ch = LineChart()
        ch.add_data(Reference(dd, min_col=col0 + 1, max_col=col0 + 2, min_row=1, max_row=last),
                   titles_from_data=True)
        ch.set_categories(Reference(dd, min_col=col0, min_row=first, max_row=last))
        style_chart(ch, f"{title_prefix} ({ind['unit']})", height=7, width=13.5, y_number_format="#,##0")
        ch.series[0].graphicalProperties.line.solidFill = TEAL
        ch.series[0].graphicalProperties.line.width = 22000
        ch.series[0].smooth = False
        ch.series[0].marker = Marker(symbol="none")
        ch.series[1].graphicalProperties.line.solidFill = ACCENT_ORANGE
        ch.series[1].graphicalProperties.line.width = 22000
        ch.series[1].graphicalProperties.line.dashStyle = "dash"
        ch.series[1].smooth = False
        ch.series[1].marker = Marker(symbol="circle", size=5)
        ch.legend.position = "b"
        ds.add_chart(ch, anchor)

    _trend_chart(f"A{r}", 10, HEADLINE_GHG, "O1 — Total EU GHG emissions")
    _trend_chart(f"I{r}", 13, HEADLINE_RES, "E2 — Non-biomass RES share of electricity")

    # O2: PEC & FEC as two full series on one axis (same unit) rather than a
    # report/post-report split — two genuinely different entities, so a
    # legend earns its place and the report/post-report styling would be
    # ambiguous across two lines at once.
    o2_row2 = r + 15
    pec, fec = (next(i for i in inds if i["id"] == HEADLINE_PEC),
               next(i for i in inds if i["id"] == HEADLINE_FEC))
    dd.cell(row=1, column=16, value="Year")
    dd.cell(row=1, column=17, value="PEC")
    dd.cell(row=1, column=18, value="FEC")
    pec_data = sorted(pec["data"], key=lambda d: d["year"])
    fec_by_year = {d["year"]: d for d in fec["data"]}
    for n, d in enumerate(pec_data):
        row = 2 + n
        dd.cell(row=row, column=16, value=d["year"])
        dd.cell(row=row, column=17, value=d["value"])
        if wire_targets is not None:
            wire_targets.append({"sheet": dd.title, "row": row, "col": 17,
                                 "id": HEADLINE_PEC, "year": d["year"]})
        fd = fec_by_year.get(d["year"])
        if fd is not None:
            dd.cell(row=row, column=18, value=fd["value"])
            if wire_targets is not None:
                wire_targets.append({"sheet": dd.title, "row": row, "col": 18,
                                     "id": HEADLINE_FEC, "year": fd["year"]})
    o2_first, o2_last = 2, 2 + len(pec_data) - 1
    ch = LineChart()
    ch.add_data(Reference(dd, min_col=17, max_col=18, min_row=1, max_row=o2_last), titles_from_data=True)
    ch.set_categories(Reference(dd, min_col=16, min_row=o2_first, max_row=o2_last))
    style_chart(ch, f"O2 — Primary & final energy consumption ({pec['unit']})",
               height=7, width=13.5, y_number_format="#,##0")
    ch.series[0].graphicalProperties.line.solidFill = TEAL
    ch.series[0].graphicalProperties.line.width = 22000
    ch.series[0].smooth = False
    ch.series[0].marker = Marker(symbol="none")
    ch.series[1].graphicalProperties.line.solidFill = "3A6165"
    ch.series[1].graphicalProperties.line.width = 22000
    ch.series[1].smooth = False
    ch.series[1].marker = Marker(symbol="none")
    ch.legend.position = "b"
    ds.add_chart(ch, f"A{o2_row2}")

    _trend_chart(f"I{o2_row2}", 20, HEADLINE_TRANSPORT, "T1 — Transport GHG emissions")

    r = o2_row2 + 16

    # ── Panel: distance to target (optional — skipped if none carry one) ──
    target_inds = [i for i in inds if i.get("code") in TARGET_CANDIDATES and i.get("targetValue") is not None]
    if target_inds:
        ds.cell(row=r, column=1, value="Distance to target").font = H2_FONT
        col0 = 23
        for k, ind in enumerate(target_inds):
            rd = reads[ind["id"]]
            latest = rd["latest"]
            dcol = col0 + k
            dd.cell(row=1, column=dcol, value=f"{ind.get('code')}")
            dd.cell(row=2, column=dcol, value="Latest")
            dd.cell(row=3, column=dcol, value="Target")
            lc = dd.cell(row=2, column=dcol + 20, value=latest["value"] if latest else None)
            tc = dd.cell(row=3, column=dcol + 20, value=ind["targetValue"])
            if wire_targets is not None and latest:
                wire_targets.append({"sheet": dd.title, "row": 2, "col": dcol + 20,
                                     "id": ind["id"], "year": latest["year"]})
            bar = BarChart()
            bar.type = "bar"
            bar.add_data(Reference(dd, min_col=dcol + 20, min_row=2, max_row=3), titles_from_data=False)
            bar.set_categories(Reference(dd, min_col=dcol, min_row=2, max_row=3))
            style_chart(bar, f"{ind.get('code')} · latest vs {ind['targetYear']} target ({ind['unit']})",
                       height=4.6, width=9)
            text_categories(bar, dd, dcol, 2, 3)
            bar.legend = None
            ser = bar.series[0]
            ser.data_points = [DataPoint(idx=0), DataPoint(idx=1)]
            ser.data_points[0].graphicalProperties.solidFill = TEAL
            ser.data_points[1].graphicalProperties.solidFill = ACCENT_ORANGE
            ser.data_points[0].graphicalProperties.line.noFill = True
            ser.data_points[1].graphicalProperties.line.noFill = True
            ser.dLbls = DataLabelList(showVal=True, showLegendKey=False, showCatName=False,
                                      showSerName=False, showPercent=False, showBubbleSize=False)
            ds.add_chart(bar, f"{get_column_letter(1 + k * 8)}{r + 1}")
        r = r + 11

    note_line(ds, r + 1,
             "Notes: “moved on” means the indicator has gained at least one data point since the 2024 report. "
             "Figures fed from a Derivations block are live formulas, exactly as in the rest of this workbook — "
             "edit an input there and this page recomputes with it.", width=20)


def _wire_to_derivations(wb, wire_targets, derivation_map, tol_pct=WIRE_TOLERANCE_PCT):
    """
    The single wiring pass Feature 1 is built around: for every recorded
    value cell elsewhere in the workbook, if its (indicator, year) has a
    Derivations block AND that block's Value cell — re-derived here straight
    from the cells the workbook itself now carries, not from calc_excel.json
    — agrees with the literal already sitting in the cell to within
    `tol_pct`, rewrite the cell as `='Derivations'!B<row>`. Otherwise the
    literal is left untouched and the (id, year, delta) is recorded so the
    coordinator can see exactly which figures are a genuine derivation-vs-
    data discrepancy rather than a wiring failure.

    Returns (wired: Counter of sheet -> cell count, skipped: [{"id","code",
    "year","delta_pct"}], errors: [str]).
    """
    wired = Counter()
    skipped = []
    errors = []
    cache = {}
    seen_skips = set()
    for wt in wire_targets:
        key = (wt["id"], wt["year"])
        drow = derivation_map.get(key)
        if drow is None:
            continue
        ws = wb[wt["sheet"]]
        cell = ws.cell(row=wt["row"], column=wt["col"])
        literal = cell.value
        if literal is None or not isinstance(literal, (int, float)):
            continue
        try:
            derived = fe.evaluate_cell(wb, "Derivations", drow, "B", cache)
        except fe.FormulaError as e:
            errors.append(f"{wt['sheet']}!{cell.coordinate} ({wt['id']}/{wt['year']}): {e}")
            continue
        if derived is None or not isinstance(derived, (int, float)):
            errors.append(f"{wt['sheet']}!{cell.coordinate} ({wt['id']}/{wt['year']}): derived {derived!r}")
            continue
        if literal == 0:
            delta_pct = 0.0 if abs(derived) < 1e-9 else 100.0
        else:
            delta_pct = abs(derived - literal) / abs(literal) * 100
        if delta_pct > tol_pct:
            if key not in seen_skips:
                seen_skips.add(key)
                skipped.append({"id": wt["id"], "year": wt["year"], "delta_pct": delta_pct,
                                "derived": derived, "literal": literal})
            continue
        cell.value = f"='Derivations'!B{drow}"
        wired[wt["sheet"]] += 1
    return wired, skipped, errors


def build(data, calc, calc_excel, factcheck, reportway, out_path=None, wb=None):
    """
    Render the combined workbook. Mirrors the wb=None / wb=<Workbook> contract
    of the three source builders: standalone when `wb` is None (creates,
    writes the merged Read me, saves to `out_path`); embeddable otherwise.
    """
    standalone = wb is None
    inds = data["indicators"]
    fc = _collapse_factcheck(factcheck)
    reads = {i["id"]: overview.read(i) for i in inds}

    # ── merged Read me ───────────────────────────────────────────────────────
    if standalone:
        wb = Workbook()
        ws = wb.active
        ws.title = "Read me"
    else:
        ws = wb.create_sheet("Read me", 0)
    sheet_setup(ws)
    set_widths(ws, [24, 22, 22, 22, 22, 20, 16, 16])
    updated = [i for i in inds if reads[i["id"]]["post"]]
    r = title_block(
        ws,
        "ESABCC Indicators — the combined background workbook",
        f"Every progress indicator of the 2024 ESABCC report in one file: the indicator check (what has moved "
        f"since the report, by chapter), the one figure carrying every move at once, and the report's own "
        f"figures next to the database's latest values with the arithmetic between them written out as a live "
        f"Excel formula. {len(updated)} of the {len(inds)} indicators have gained data since January 2024.",
        f"Background document for the Summer Prep · Policy Gap 2.0 Report module · prepared {PREPARED}. "
        "This merges the three separate indicator workbooks into one — nothing on any sheet has changed by "
        "being combined.",
    )

    ws.cell(row=r, column=1, value="What is in this workbook").font = H2_FONT
    r += 1
    groups = [
        ("Dashboard", "The module at a glance: key figures, the largest moves since the report as a diverging "
                     "bar, chapter coverage, four headline trend lines and — where a target exists — a distance-"
                     "to-target panel. Its source blocks live on the hidden 'Dashboard data' sheet."),
        ("Overview", "All indicators in one table — baseline, latest value, change — plus the two overview "
                     "figures: the largest moves since the report, and how many indicators have new data per "
                     "chapter. Part of the Indicator Check."),
        ("Emissions … Fairness, Adaptation (one tab per chapter)", "The chapter's indicators as a table, then "
                     "every indicator's full series as its own small table and line chart. Part of the "
                     "Indicator Check."),
        ("Data (long)", "Every data point of every indicator in one flat table — the sheet to pivot or filter. "
                     "Part of the Indicator Check."),
        ("Where the data comes from", "For every point added since the report: the calc inputs it is built "
                     "from, the formula, the exact source query — with a DOI link where the dataset has one — "
                     "and the 27 July 2026 fact-check verdict. Part of the Indicator Check."),
        ("New data", "Everything that has moved since the report in one figure, indexed to each indicator's own "
                     "report baseline so indicators in wildly different units are still comparable."),
        ("Old vs new", "One row per indicator: the report's own figure, the database's latest value, the "
                     "change, and how that later figure was obtained — with a Primary source hyperlink where "
                     "the dataset has a DOI."),
        ("Derivations", "The calc grid behind every indicator as LIVE EXCEL FORMULAS — click a Value cell and "
                     "Excel shows the arithmetic over the inputs in the same block."),
        ("Sources", "The exact source query behind every input column in Derivations, with a DOI link where "
                     "the dataset has one."),
    ]
    header_row(ws, r, ["Sheet group", "What it holds", "", "", "", "", "", ""], height=20)
    r += 1
    for i, (name, desc) in enumerate(groups):
        ws.cell(row=r, column=1, value=name).font = Font(name=FONT_SEMI, size=9, color=TEAL)
        ws.cell(row=r, column=1).alignment = Alignment(vertical="top", wrap_text=True)
        c = ws.cell(row=r, column=2, value=desc)
        c.font = BODY_FONT
        c.alignment = Alignment(vertical="top", wrap_text=True)
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=8)
        for col in range(1, 9):
            ws.cell(row=r, column=col).fill = BODY_FILL if i % 2 == 0 else PatternFill("solid", fgColor=TEAL_PALE)
        ws.row_dimensions[r].height = 46
        r += 1
    r += 1

    ws.cell(row=r, column=1, value="How the numbers stay in sync").font = H2_FONT
    r += 1
    for line in [
        "• Derivations is the single source of truth for every derivation-backed indicator (53 of the 97): "
        "edit an input cell there, and every other cell built from it — Overview, the chapter tabs, Data "
        "(long), New data, Old vs new, and the Dashboard — recomputes on the workbook's next recalculation, "
        "because those cells are live formulas pointing at Derivations, not pasted numbers.",
        "• A cell only carries that live link where the Derivations value it points at already agrees with "
        "the stored data point to within 0.5% — a bigger gap is left as a plain number instead of being wired "
        "over silently, on the view that a genuine derivation-vs-data discrepancy should stay visible.",
        "• Indicators with no Derivations block (44 of the 97) keep their figures as plain numbers throughout, "
        "exactly as before this workbook wired the rest together.",
    ]:
        r = note_line(ws, r, line, width=8, font=BODY_FONT)
        ws.row_dimensions[r - 1].height = 34
    r += 1

    ws.cell(row=r, column=1, value="Exact dataset links").font = H2_FONT
    r += 1
    for line in [
        "• Where a source names one of the 17 Eurostat datasets behind these indicators, its cell is a live "
        "hyperlink to that dataset's DOI (https://doi.org/10.2908/<CODE>), which resolves to the Eurostat "
        "databrowser page. Non-Eurostat publishers (EEA, EAFO, IRENA, EHPA, SolarPower Europe, WindEurope, "
        "UNFCCC/CRF, Eurofer, Cembureau, BloombergNEF) do not mint DOIs, so their cell links to the canonical "
        "landing page instead.",
        "• A source that names no recognised dataset or publisher is left as plain text — no link is guessed.",
    ]:
        r = note_line(ws, r, line, width=8, font=BODY_FONT)
        ws.row_dimensions[r - 1].height = 34
    r += 1

    ws.cell(row=r, column=1, value="Source").font = H2_FONT
    r += 1
    for label, value in [
        ("Indicators", "The progress indicators of ESABCC (2024) “Towards EU climate neutrality: Progress, "
                       "policy gaps and opportunities”."),
        ("Data source", "The Policy Gap 2.0 Project Workspace indicator database (src/data/esabcc-indicators.ts "
                        "and the calc grids in supabase/migrations/045, 052, 078, 079, 080)."),
        ("Vintage", f"Compiled {PREPARED}. Source publishers revise: re-check before quoting a figure externally."),
    ]:
        ws.cell(row=r, column=1, value=label).font = Font(name=FONT_SEMI, size=9, color=TEAL)
        c = ws.cell(row=r, column=2, value=value)
        c.font = BODY_FONT
        c.alignment = Alignment(vertical="top", wrap_text=True)
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=8)
        ws.row_dimensions[r].height = 34
        r += 1

    # ── Dashboard — the first content sheet, built before the tables so it
    # lands right after Read me (create_sheet(..., 1) inserts it there; every
    # later create_sheet call below appends after it, not before) ───────────
    wire_targets = []
    derivation_map = {}
    _build_dashboard(wb, inds, reads, calc_excel, reportway, factcheck, fc, wire_targets)

    # ── the three source builders, into the same workbook ───────────────────
    check.build(data, calc, factcheck, wb=wb, wire_targets=wire_targets)
    overview.build_new_data_overview(inds, reads, fc, wb=wb, title="New data", wire_targets=wire_targets)
    overview.build_old_vs_new(inds, reads, calc_excel, fc, reportway, wb=wb,
                              wire_targets=wire_targets, derivation_map=derivation_map)

    # ── Feature 1's wiring pass: now that every sheet (Dashboard included)
    # and the Derivations sheet itself exist, rewrite the value cells that
    # agree with their Derivations block as live cross-sheet formulas ──────
    wired, skipped, errors = _wire_to_derivations(wb, wire_targets, derivation_map)
    total_wired = sum(wired.values())
    print(f"derivation wiring: {total_wired} cells wired across {len(wired)} sheets "
          f"({dict(wired)}); {len(skipped)} (id, year) pairs left as literals "
          f"(>{WIRE_TOLERANCE_PCT}% from Derivations); {len(errors)} evaluation errors")
    for s in sorted(skipped, key=lambda s: -s["delta_pct"])[:20]:
        print(f"  not wired: {s['id']} / {s['year']}: derived {s['derived']:.4g} vs "
              f"stored {s['literal']:.4g} ({s['delta_pct']:.1f}% off)")
    for e in errors[:10]:
        print(f"  eval error: {e}")

    if standalone:
        wb.calculation.fullCalcOnLoad = True
        wb.properties.title = "ESABCC Indicators — combined background workbook"
        wb.properties.subject = "Summer Prep · Policy Gap 2.0 Report — combined background document"
        wb.properties.creator = "ESABCC Method Hub"
        wb.save(out_path)
        print(f"wrote {out_path}: {len(wb.sheetnames)} sheets, {len(inds)} indicators, "
              f"{len(updated)} with new data")
    return wb


def main(data_path, calc_path, calc_excel_path, fc_path, reportway_path, out_path):
    data = json.load(open(data_path, encoding="utf8"))
    calc = json.load(open(calc_path, encoding="utf8"))
    calc_excel = json.load(open(calc_excel_path, encoding="utf8"))
    factcheck = json.load(open(fc_path, encoding="utf8"))
    reportway = json.load(open(reportway_path, encoding="utf8"))["filled"]
    build(data, calc, calc_excel, factcheck, reportway, out_path)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6])
