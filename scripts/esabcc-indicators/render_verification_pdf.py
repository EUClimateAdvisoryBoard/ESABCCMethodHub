#!/usr/bin/env python3
"""
Render the automated indicator-refresh provenance into a fact-check PDF.

Reads scripts/esabcc-indicators/refresh-provenance.json (written by
refresh-from-sources.mjs) and writes docs/Indicator-Refresh-Report.pdf —
one row per recipe-driven indicator with the new points, the exact source
URL, and a note, plus any fetch errors. This is the artifact reviewers use
to fact-check an automated run before merging the PR.

Usage:  python3 scripts/esabcc-indicators/render_verification_pdf.py
Deps:   pip install reportlab
"""
from __future__ import annotations
import json
from pathlib import Path
from datetime import date

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, HRFlowable)

ROOT = Path(__file__).resolve().parent.parent.parent
PROV = ROOT / "scripts" / "esabcc-indicators" / "refresh-provenance.json"
OUT = ROOT / "docs" / "Indicator-Refresh-Report.pdf"


def esc(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def main() -> None:
    prov = json.loads(PROV.read_text())
    inds = prov.get("indicators", [])
    gen = prov.get("generatedAt", date.today().isoformat())

    ss = getSampleStyleSheet()
    H1 = ParagraphStyle("H1", parent=ss["Title"], fontSize=17, leading=21,
                        textColor=colors.HexColor("#00374f"))
    sub = ParagraphStyle("sub", parent=ss["Heading2"], fontSize=11.5,
                         textColor=colors.HexColor("#55636e"))
    body = ParagraphStyle("body", parent=ss["Normal"], fontSize=9, leading=12.5)
    small = ParagraphStyle("small", parent=ss["Normal"], fontSize=8, leading=10.5)
    cell = ParagraphStyle("cell", parent=ss["Normal"], fontSize=7.4, leading=9.2)
    cellnew = ParagraphStyle("cellnew", parent=cell, textColor=colors.HexColor("#b4530f"))

    el = [
        Paragraph("ESABCC Indicator Database — automated refresh report", H1),
        Paragraph("Eurostat / EEA pull · fact-check before merge", sub),
        Spacer(1, 4),
        HRFlowable(width="100%", color=colors.HexColor("#E8702A"), thickness=1.4),
        Spacer(1, 6),
    ]
    n_upd = sum(1 for i in inds if i.get("status") == "updated")
    n_err = sum(1 for i in inds if i.get("status") == "error")
    n_pts = sum(len(i.get("newPoints", [])) for i in inds)
    el.append(Paragraph(
        f"Generated {esc(gen)} by <i>scripts/esabcc-indicators/refresh-from-sources.mjs</i>. "
        f"<b>{n_pts}</b> data points added/updated across <b>{n_upd}</b> indicators; "
        f"<b>{n_err}</b> recipe(s) errored. Each value below was pulled directly from the "
        "linked Eurostat API / EEA data-viewer endpoint and flagged "
        "<font color='#E8702A'><b>afterReport</b></font> in the data file. "
        "Please confirm each new value against its source before merging.", body))
    el.append(Spacer(1, 6))

    hdr = [Paragraph(f"<b>{h}</b>", cell) for h in
           ["Indicator id", "Status", "New points (year = value)", "Source (click)", "Note"]]
    rows = [hdr]
    new_idx = []
    status_color = {"updated": "#1a7f37", "up-to-date": "#8a95a3",
                    "error": "#b3261e"}
    for i in inds:
        st = i.get("status", "")
        pts = i.get("newPoints", [])
        if pts:
            ptxt = ", ".join(f"<b>{p['year']} = {p['value']}</b>" for p in pts)
            pcell = Paragraph(ptxt, cellnew)
        elif st == "error":
            pcell = Paragraph(f"<font color='#b3261e'>fetch failed: {esc(i.get('message',''))}</font>", cell)
        else:
            pcell = Paragraph("<font color='#8a95a3'>— up to date</font>", cell)
        url = i.get("sourceUrl") or ""
        title = esc(i.get("sourceTitle") or "")
        srccell = Paragraph(
            (f"{title}<br/><link href='{esc(url)}'><font color='#0065A4'>{esc(url)}</font></link>"
             if url else title), cell)
        cc = status_color.get(st, "#000000")
        rows.append([
            Paragraph(f"<b>{esc(i.get('id',''))}</b>", cell),
            Paragraph(f"<font color='{cc}'><b>{esc(st)}</b></font>", cell),
            pcell, srccell, Paragraph(esc(i.get("note", "")), cell),
        ])
        if pts:
            new_idx.append(len(rows) - 1)

    t = Table(rows, colWidths=[40*mm, 18*mm, 34*mm, 50*mm, 36*mm], repeatRows=1)
    sty = [("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d9dde1")),
           ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#00374f")),
           ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
           ("VALIGN", (0, 0), (-1, -1), "TOP"),
           ("TOPPADDING", (0, 0), (-1, -1), 2.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
           ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3)]
    for ri in new_idx:
        sty.append(("BACKGROUND", (0, ri), (-1, ri), colors.HexColor("#fdf1e7")))
    t.setStyle(TableStyle(sty))
    el.append(t)
    el.append(Spacer(1, 8))
    el.append(Paragraph(
        "Indicators not covered by an automated recipe (transport demand, ZEV lorries, "
        "heat pumps, green-bond/cleantech finance, intensity ratios) remain in the curated "
        "sheet <i>Indicator-Database-Post-Report-Update.pdf</i>. Extend the RECIPES table in "
        "refresh-from-sources.mjs to bring more under automation.", small))

    OUT.parent.mkdir(exist_ok=True)
    SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=15*mm, rightMargin=15*mm,
                      topMargin=16*mm, bottomMargin=16*mm,
                      title="ESABCC Indicator Database — automated refresh report").build(el)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
