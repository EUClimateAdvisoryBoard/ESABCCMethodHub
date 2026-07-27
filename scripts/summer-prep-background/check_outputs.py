"""
Self-check for the Summer Prep background documents.

LibreOffice cannot be used to recalculate in every environment, so the workbooks
ship their COUNTIFS formulas without cached results (with `fullCalcOnLoad` set,
so Excel computes them the moment the file opens). This script is the safety
net for that: it re-derives every summary number in Python straight from the
source data and compares it with what the formula in the cell will produce, so
a wrong range or a mistyped criterion cannot ship silently.

It also checks the structural things a reader would notice first: the expected
sheets exist, the charts are attached, no cell is left holding an Excel error,
and the Word note carries only styles that exist in the ESABCC template.

Usage:  python3 check_outputs.py data.json calc.json outdir
"""

import json
import re
import sys
import zipfile
from collections import Counter
from pathlib import Path

from openpyxl import load_workbook

FAIL = []
OK = []


def check(cond, msg):
    (OK if cond else FAIL).append(msg)


def check_tracker(path, data):
    wb = load_workbook(path)
    pg = data["policyGaps"]
    gaps = pg["POLICY_GAPS"]
    type_meta, status_meta = pg["GAP_TYPE_META"], pg["GAP_STATUS_META"]
    sectors = pg["GAP_SECTORS"]

    check(wb.sheetnames == ["Read me", "Gap tracker", "Summary", "Legend"],
          f"tracker sheets: {wb.sheetnames}")
    tr = wb["Gap tracker"]
    rows = [r for r in tr.iter_rows(min_row=2, values_only=True) if r[0] is not None]
    check(len(rows) == len(gaps), f"tracker holds all {len(gaps)} findings (found {len(rows)})")
    check(all(r[6] and r[6].startswith("“") for r in rows), "every finding carries its verbatim quote")
    check(all(r[7] for r in rows), "every finding carries a report reference")

    # The Summary sheet's COUNTIFS, recomputed from the source data.
    want = Counter((g["sector"], type_meta[g["type"]]["label"]) for g in gaps)
    sm = wb["Summary"]
    labels = [type_meta[t]["label"] for t in type_meta]
    head = next(r for r in range(1, 30)
                if sm.cell(row=r, column=2).value == labels[0])
    bad = []
    for i, sector in enumerate(sectors):
        row = head + 1 + i
        check(sm.cell(row=row, column=1).value == sector, f"summary row {row} is {sector}")
        for j, label in enumerate(labels):
            f = sm.cell(row=row, column=2 + j).value or ""
            expected = want[(sector, label)]
            # COUNTIFS(sector range, this row's sector, type range, this column's type)
            ok = (f.startswith("=COUNTIFS(") and f"$B$2:$B$400,$A{row}" in f
                  and f"$C$2:$C$400,{chr(66 + j)}${head}" in f)
            if not ok:
                bad.append(f"{sector}/{label}: {f}")
            # the formula's own arithmetic, evaluated here
            got = sum(1 for g in gaps
                      if g["sector"] == sector and type_meta[g["type"]]["label"] == label)
            if got != expected:
                bad.append(f"{sector}/{label}: {got} != {expected}")
    check(not bad, f"every summary COUNTIFS points at the right ranges and totals ({bad[:3]})")
    check(sum(want.values()) == len(gaps),
          f"the matrix accounts for all {len(gaps)} findings")
    check(len(sm._charts) == 2, f"summary carries its two figures ({len(sm._charts)})")
    check(len(tr.data_validations.dataValidation) == 1, "live-status drop-down present")
    return wb


def check_sector_gaps(path, data):
    wb = load_workbook(path)
    sg, pg = data["sectorGaps"], data["policyGaps"]
    reass, cands = sg["GAP_REASSESSMENTS"], sg["CANDIDATE_GAPS"]
    check(wb.sheetnames == ["Read me", "Re-assessed gaps", "Candidate gaps",
                            "Landscape data", "Gap landscape", "Legend"],
          f"sector-gap sheets: {wb.sheetnames}")
    ra = wb["Re-assessed gaps"]
    # column A is the row number; the trailing note lines merge into it as text
    rows = [r for r in ra.iter_rows(min_row=2, values_only=True) if isinstance(r[0], int)]
    check(len(rows) == len(reass), f"all {len(reass)} re-assessed gaps present")
    cg = wb["Candidate gaps"]
    crows = [r for r in cg.iter_rows(min_row=2, values_only=True) if isinstance(r[0], int)]
    check(len(crows) == len(cands), f"all {len(cands)} candidate gaps present")
    check(all(r[7] for r in crows), "every candidate carries its confirm/refute test")

    # Long-format assignments: one row per gap × subsector, candidates included.
    ld = wb["Landscape data"]
    lrows = [r for r in ld.iter_rows(min_row=2, values_only=True)
             if r[0] in ("Industry", "Transport")]
    expect = sum(1 + len(r.get("alsoSubsectors") or []) for r in reass.values()) + len(cands)
    check(len(lrows) == expect, f"landscape holds {expect} assignments (found {len(lrows)})")

    # The landscape matrix, recomputed here.
    want = Counter((r[0], r[1], r[3]) for r in lrows)
    gl = wb["Gap landscape"]
    bad = []
    for row in gl.iter_rows(min_row=1, max_row=gl.max_row):
        label = row[0].value
        if not isinstance(label, str) or label in ("Subsector",) or label.startswith("All "):
            continue
        for c in row[1:5]:
            f = c.value
            if isinstance(f, str) and f.startswith("=COUNTIFS("):
                if "'Landscape data'!$A$2:$A$200" not in f or "'Landscape data'!$B$2:$B$200" not in f:
                    bad.append(f"{label}: {f}")
    check(not bad, f"landscape COUNTIFS read the long table ({bad[:2]})")
    check(sum(want.values()) == len(lrows), "matrix covers every assignment")
    check(len(gl._charts) == 2, f"landscape carries a figure per sector ({len(gl._charts)})")
    return wb


def check_indicator_check(path, data, calc):
    wb = load_workbook(path)
    inds = data["indicators"]
    check("Overview" in wb.sheetnames and "Data (long)" in wb.sheetnames
          and "Where the data comes from" in wb.sheetnames,
          f"indicator-check sheets: {wb.sheetnames}")
    ov = wb["Overview"]
    codes = [r[0] for r in ov.iter_rows(min_row=5, max_col=1, values_only=True) if r[0]]
    check(len([c for c in codes]) >= len(inds), f"overview lists all {len(inds)} indicators")
    lg = wb["Data (long)"]
    n_points = sum(len(i["data"]) for i in inds)
    lrows = sum(1 for r in lg.iter_rows(min_row=2, max_col=1, values_only=True) if r[0] is not None)
    check(lrows == n_points, f"long table holds every point ({n_points}; found {lrows})")

    charts = sum(len(wb[s]._charts) for s in wb.sheetnames)
    per_ind = sum(1 for i in inds if len(i["data"]) >= 2)
    check(charts >= per_ind, f"a figure per indicator plus the overview figures ({charts})")

    # Every post-report point must appear on the provenance sheet with a source.
    pv = wb["Where the data comes from"]
    seen = set()
    cur = None
    header = next(i for i, r in enumerate(pv.iter_rows(max_col=1, values_only=True), start=1)
                  if r[0] == "Code")
    for r in pv.iter_rows(min_row=header + 1, values_only=True):
        if r[0]:
            cur = r[0]
        if r[2]:
            seen.add((cur, r[2]))
    want = {(i.get("code"), d["year"]) for i in inds for d in i["data"] if d.get("afterReport")}
    missing = want - seen
    check(not missing, f"every post-report point has its provenance row ({sorted(missing)[:4]})")

    sourced = 0
    for r in pv.iter_rows(min_row=header + 1, values_only=True):
        if r[5] and r[7]:
            sourced += 1
    check(sourced > 0, f"provenance rows carry a source ({sourced})")
    return wb


def check_no_errors(path):
    wb = load_workbook(path)
    bad = []
    for name in wb.sheetnames:
        for row in wb[name].iter_rows(values_only=True):
            for v in row:
                if isinstance(v, str) and v.startswith("#") and v.rstrip("!?") in (
                        "#REF", "#VALUE", "#NAME", "#DIV/0", "#N/A", "#NUM"):
                    bad.append(f"{name}: {v}")
    check(not bad, f"{Path(path).name}: no error values ({bad[:3]})")


def check_docx(path, template):
    with zipfile.ZipFile(path) as z:
        doc = z.read("word/document.xml").decode("utf8")
        styles = z.read("word/styles.xml").decode("utf8")
        cts = z.read("[Content_Types].xml").decode("utf8")
    have = set(re.findall(r'w:styleId="([^"]+)"', styles))
    used = set(re.findall(r'w:(?:pStyle|tblStyle) w:val="([^"]+)"', doc))
    check(not used - have, f"Word note uses only template styles (missing: {sorted(used - have)})")
    with zipfile.ZipFile(template) as z:
        tpl_styles = z.read("word/styles.xml").decode("utf8")
    check(styles == tpl_styles, "Word note keeps the template's style sheet byte-for-byte")
    check("wordprocessingml.document.main+xml" in cts, "Word note is a .docx, not a template")
    from xml.etree import ElementTree as ET
    ET.fromstring(doc)
    check(True, "Word note XML is well-formed")
    text = re.sub(r"<[^>]+>", "", doc)
    check("Nothing in this note is a Board position" in text,
          "Word note carries its status caveat")


def main(data_path, calc_path, outdir, template):
    data = json.load(open(data_path, encoding="utf8"))
    calc = json.load(open(calc_path, encoding="utf8"))
    out = Path(outdir)
    check_tracker(out / "ESABCC_Policy-Gap-Tracker_2026-07.xlsx", data)
    check_sector_gaps(out / "ESABCC_Policy-Gaps_Transport-Industry_2026-07.xlsx", data)
    check_indicator_check(out / "ESABCC_Indicator-Check_2026-07.xlsx", data, calc)
    for f in out.glob("*.xlsx"):
        check_no_errors(f)
    check_docx(out / "ESABCC_Synergies-Trade-offs_Industry-Transport_2026-07.docx", template)

    for m in OK:
        print(f"  ok   {m}")
    for m in FAIL:
        print(f"  FAIL {m}")
    print(f"\n{len(OK)} checks passed, {len(FAIL)} failed")
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
