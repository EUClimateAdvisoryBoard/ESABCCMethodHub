"""
Background document 4 — Synergies & trade-offs, mitigation ↔ adaptation
(industry and transport).

Renders `src/data/summer-prep-synergies.ts` (Summer Prep, Note 2) as a Word
document built INSIDE the Board's own blank template: the .dotx is unzipped and
only `word/document.xml` is replaced, so every ESABCC style, the numbering, the
theme, the headers and the page set-up come from the template itself rather
than being imitated. Paragraphs use the template's own style ids — Heading 1/2,
"Lead-in text", "Bold sentence", "Table header", "Table text", "caption",
"Source & Notes", "Box text" — and the tables use its "Text-heavy table", "Data table" and "Box"
table styles.

Usage:  python3 build_synergies_docx.py data.json template.dotx out.docx
"""

import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

PREPARED = "27 July 2026"

KIND_LABEL = {"synergy": "Synergy", "trade-off": "Trade-off", "mixed": "Conditional"}
KIND_SYMBOL = {"synergy": "+", "trade-off": "!", "mixed": "~"}
# The template's own palette (theme text2 and the ESABCC accents).
KIND_COLOR = {"synergy": "4D7E83", "trade-off": "B04545", "mixed": "F59E2D"}


# ── OOXML helpers ────────────────────────────────────────────────────────────

def t(text):
    """A <w:t> payload with whitespace preserved."""
    return f'<w:t xml:space="preserve">{escape(text)}</w:t>'


def run(text, *, bold=False, italic=False, color=None, size=None, font=None):
    props = ""
    if font:
        props += f'<w:rFonts w:ascii="{font}" w:hAnsi="{font}"/>'
    if bold:
        props += "<w:b/>"
    if italic:
        props += "<w:i/>"
    if color:
        props += f'<w:color w:val="{color}"/>'
    if size:
        props += f'<w:sz w:val="{size * 2}"/><w:szCs w:val="{size * 2}"/>'
    rpr = f"<w:rPr>{props}</w:rPr>" if props else ""
    return f"<w:r>{rpr}{t(text)}</w:r>"


def para(runs, style=None, *, spacing_after=None, keep_next=False, page_break=False,
         indent=None, jc=None):
    props = ""
    if style:
        props += f'<w:pStyle w:val="{style}"/>'
    if keep_next:
        props += "<w:keepNext/>"
    if page_break:
        props += "<w:pageBreakBefore/>"
    if indent:
        props += f'<w:ind w:left="{indent}"/>'
    if spacing_after is not None:
        props += f'<w:spacing w:after="{spacing_after}"/>'
    if jc:
        props += f'<w:jc w:val="{jc}"/>'
    ppr = f"<w:pPr>{props}</w:pPr>" if props else ""
    body = runs if isinstance(runs, str) else "".join(runs)
    return f"<w:p>{ppr}{body}</w:p>"


def text_para(text, style=None, **kw):
    return para(run(text), style, **kw)


# The template's own solid-black-circle bullet list (numId 3, as used in the
# template's own example list) — not a literal "•".
BULLET_NUM = 3


def bullet(text_runs, level=0, style="ListParagraph"):
    """A bullet in the template's own list style."""
    props = (f'<w:pStyle w:val="{style}"/>'
             f'<w:numPr><w:ilvl w:val="{level}"/><w:numId w:val="{BULLET_NUM}"/></w:numPr>')
    body = text_runs if isinstance(text_runs, str) else "".join(text_runs)
    return f"<w:p><w:pPr>{props}</w:pPr>{body}</w:p>"


def cell(paras, width, *, shade=None, span=None, valign="top"):
    props = f'<w:tcW w:w="{width}" w:type="dxa"/>'
    if span:
        props += f'<w:gridSpan w:val="{span}"/>'
    if shade:
        props += f'<w:shd w:val="clear" w:color="auto" w:fill="{shade}"/>'
    props += f'<w:vAlign w:val="{valign}"/>'
    body = paras if isinstance(paras, str) else "".join(paras)
    return f"<w:tc><w:tcPr>{props}</w:tcPr>{body}</w:tc>"


def table(rows, widths, style="Text-heavytable", header_rows=1):
    grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    look = ('<w:tblLook w:val="0420" w:firstRow="1" w:lastRow="0" w:firstColumn="0" '
            'w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>')
    props = (f'<w:tblPr><w:tblStyle w:val="{style}"/>'
             f'<w:tblW w:w="{sum(widths)}" w:type="dxa"/>{look}</w:tblPr>')
    out = [f"<w:tbl>{props}<w:tblGrid>{grid}</w:tblGrid>"]
    for i, cells in enumerate(rows):
        head = ('<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>'
                if i < header_rows else '<w:trPr><w:cantSplit/></w:trPr>')
        out.append(f"<w:tr>{head}{''.join(cells)}</w:tr>")
    out.append("</w:tbl>")
    return "".join(out)


# Page width inside the template's margins: 11906 − 2×1418 = 9070 dxa.
PAGE_W = 9070


def build_body(data):
    syn = data["synergies"]
    entries = syn["SYNERGIES"]
    kind_meta = syn["SYNERGY_KIND_META"]
    order = syn["SUBSECTOR_ORDER"]
    meta = syn["SYNERGY_REPORT_META"]

    def by(sector, subsector):
        return [e for e in entries if e["sector"] == sector and e["subsector"] == subsector]

    xml = []

    # ── Title page ───────────────────────────────────────────────────────────
    xml.append(text_para("Synergies and trade-offs between climate-change mitigation "
                         "and adaptation", "Title"))
    xml.append(text_para("Industry and transport — an internal literature note for the "
                         "Policy Gap 2.0 prep cycle", "AltH2"))
    xml.append(text_para(
        "Where cutting emissions also builds climate resilience, and where it works against it — "
        "mapped subsector by subsector, on the report's own structure.",
        "Lead-intext"))
    xml.append(text_para(
        f"Summer Prep · Policy Gap 2.0 Report · Note 2 — background document, prepared {PREPARED}.",
        "SourceNotes"))

    # Provenance box (single-cell table in the template's "Box" style).
    box_paras = [
        text_para("Status of this note", "Boxtext"),
        text_para(
            "Each entry states a real, literature-grounded interaction and cites the primary work it "
            "rests on (IPCC AR6 WGII/WGIII, the EEA European Climate Risk Assessment, and "
            "peer-reviewed studies). Every citation was source-verified against Crossref and "
            f"publisher records on {meta['citationsVerifiedOn']}.",
            "Boxtext"),
        text_para(
            "The framing, and the assignment of each mechanism to a subsector, are working judgements "
            "compiled for this prep cycle and are pending sector-lead sign-off. Nothing in this note "
            "is a Board position.", "Boxtext"),
    ]
    xml.append(table([[cell(box_paras, PAGE_W)]], [PAGE_W], style="Box", header_rows=0))
    xml.append(text_para("", "SourceNotes"))

    # ── 1. Why this note ─────────────────────────────────────────────────────
    xml.append(text_para("Why this note", "Heading1"))
    xml.append(text_para(
        "Mitigation and adaptation are handled in separate policy tracks, but in industry and "
        "transport they meet in the same assets: the same plant, the same corridor, the same fleet. "
        "This note maps where they reinforce each other and where they pull apart.",
        "Lead-intext"))
    xml.append(text_para("What the note does", "Boldsentence"))
    xml.append(text_para(
        "It takes each subsector of the 2024 progress report's industry (Ch. 5) and transport "
        "(Ch. 6) chapters and asks two questions of the mitigation levers in it: does this lever "
        "also reduce climate vulnerability, and does any adaptation need in this subsector push "
        "emissions the other way? Each interaction is recorded with the mechanism behind it, the "
        "implication for EU policy design, and the literature it rests on."))
    xml.append(text_para("How to read an entry", "Boldsentence"))
    xml.append(text_para(
        "Every entry is one table. It names the mitigation lever and the adaptation dimension it "
        "interacts with, sets out the mechanism connecting them, and closes with what follows for "
        "policy design. The tag in the first row says which of three directions the interaction runs:"))
    for key in ("synergy", "trade-off", "mixed"):
        m = kind_meta[key]
        xml.append(bullet([
            run(f"{KIND_LABEL[key]} — ", bold=True, color=KIND_COLOR[key]),
            run(m["description"]),
        ]))
    xml.append(text_para(
        "The subsector taxonomy deliberately mirrors the report, so this note and the report's own "
        "chapters stay comparable — and so a finding here can be carried straight into the "
        "corresponding chapter section.", ))
    xml.append(text_para("What it is not", "Boldsentence"))
    xml.append(text_para(
        "It is not a quantification: the entries say which way an interaction runs and why, not how "
        "large it is. Where the literature is thin or the sign depends on design choices, the entry "
        "is tagged conditional rather than resolved in one direction. And it is not a Board "
        "position — it is preparatory material for the sector leads."))

    # ── 2. The map at a glance ───────────────────────────────────────────────
    xml.append(text_para("The map at a glance", "Heading1"))
    xml.append(text_para(
        "How the interactions distribute across the two sectors and their subsectors.",
        "Lead-intext"))

    widths = [3400, 1900, 1900, 1870]
    rows = [[
        cell(text_para("Subsector", "Tableheader"), widths[0]),
        cell(text_para("Synergies", "Tableheader"), widths[1]),
        cell(text_para("Trade-offs", "Tableheader"), widths[2]),
        cell(text_para("Conditional", "Tableheader"), widths[3]),
    ]]
    for sector in ("Industry", "Transport"):
        rows.append([cell(para(run(sector, bold=True), "Tabletext"), widths[0]),
                     cell(text_para("", "Tabletext"), widths[1]),
                     cell(text_para("", "Tabletext"), widths[2]),
                     cell(text_para("", "Tabletext"), widths[3])])
        for sub in order[sector]:
            es = by(sector, sub)
            counts = {k: sum(1 for e in es if e["kind"] == k) for k in KIND_LABEL}
            rows.append([
                cell(text_para(sub, "Tabletext"), widths[0]),
                cell(text_para(str(counts["synergy"] or "—"), "Tabletext"), widths[1]),
                cell(text_para(str(counts["trade-off"] or "—"), "Tabletext"), widths[2]),
                cell(text_para(str(counts["mixed"] or "—"), "Tabletext"), widths[3]),
            ])
    total = {k: sum(1 for e in entries if e["kind"] == k) for k in KIND_LABEL}
    rows.append([
        cell(para(run("All subsectors", bold=True), "Tabletext"), widths[0]),
        cell(para(run(str(total["synergy"]), bold=True), "Tabletext"), widths[1]),
        cell(para(run(str(total["trade-off"]), bold=True), "Tabletext"), widths[2]),
        cell(para(run(str(total["mixed"]), bold=True), "Tabletext"), widths[3]),
    ])
    xml.append(text_para("Table 1\tInteractions per subsector and direction", "Caption"))
    xml.append(table(rows, widths, style="Datatable"))
    xml.append(para([run("Notes: ", bold=True),
                     run("counts are entries in this note, not a measure of how important each "
                         "interaction is — a subsector with one well-evidenced trade-off may matter "
                         "more than one with three synergies.")], "SourceNotes"))
    xml.append(para([run("Source: ", bold=True),
                     run("this note; subsector taxonomy from ESABCC (2024) "
                         f"“{meta['reportTitle']}”, {meta['reportPublished']}.")], "SourceNotes"))

    # ── 3–4. The entries, sector by sector ───────────────────────────────────
    n = 0
    for sector in ("Industry", "Transport"):
        xml.append(text_para(f"{sector}", "Heading1"))
        lead = {
            "Industry": "Iron and steel, cement and lime, chemicals, and the circular-economy layer "
                        "that cuts across them — where deep decarbonisation changes an industrial "
                        "site's exposure to climate risk, in both directions.",
            "Transport": "Cars and vans, heavy-duty road freight, rail, aviation, maritime, and the "
                         "demand and modal-shift layer — where the network that has to carry fewer "
                         "emissions also has to withstand more heat, more water and more disruption.",
        }[sector]
        xml.append(text_para(lead, "Lead-intext"))

        for sub in order[sector]:
            es = by(sector, sub)
            if not es:
                continue
            xml.append(text_para(sub, "Heading2"))
            for e in es:
                n += 1
                color = KIND_COLOR[e["kind"]]
                w = [2100, 6970]
                rows = [[
                    cell(para([run(f"{KIND_LABEL[e['kind']]}", bold=True)], "Tableheader"), w[0]),
                    cell(para([run(e["title"], bold=True)], "Tableheader"), w[1]),
                ]]
                for label, value in [
                    ("Mitigation lever", e["mitigation"]),
                    ("Adaptation dimension", e["adaptation"]),
                    ("Mechanism", e["mechanism"]),
                    ("What it implies for policy", e["implication"]),
                ]:
                    rows.append([
                        cell(para(run(label, bold=True, color=color), "Tabletext"), w[0]),
                        cell(text_para(value, "Tabletext"), w[1]),
                    ])
                refs = [text_para("Literature", "Tabletext")]
                ref_cells = []
                for ref in e["references"]:
                    line = ref["cite"] + (f"  {ref['url']}" if ref.get("url") else "")
                    ref_cells.append(bullet(run(line, size=8), style="ListParagraph"))
                rows.append([
                    cell(para(run("Literature", bold=True, color=color), "Tabletext"), w[0]),
                    cell(ref_cells, w[1]),
                ])
                xml.append(text_para(f"Table {n + 1}\t{e['title']}", "Caption"))
                xml.append(table(rows, w))
                xml.append(text_para("", "SourceNotes"))

    # ── 5. Using this note ───────────────────────────────────────────────────
    xml.append(text_para("Taking this forward", "Heading1"))
    xml.append(text_para(
        "Three things this note is ready to be used for in the next report cycle.",
        "Lead-intext"))
    xml.append(text_para("Check a policy proposal against the trade-offs", "Boldsentence"))
    xml.append(text_para(
        "The trade-off entries are the ones with drafting consequences: each names a design choice "
        "that decides whether a mitigation instrument raises or lowers climate vulnerability. Where "
        "a proposal touches one of them — hydrogen siting under water stress, biomass supply under "
        "drought, thermal and hydrological limits on rail and inland waterways — the entry's "
        "“what it implies for policy” row is the test to apply."))
    xml.append(text_para("Feed the conditional entries into the evidence plan", "Boldsentence"))
    xml.append(text_para(
        "A conditional tag means the sign of the interaction depends on design, siting or resource "
        "context, and that the literature does not settle it. Those are the entries worth "
        "commissioning or collecting evidence on before the chapter drafting starts."))
    xml.append(text_para("Carry the subsector structure across", "Boldsentence"))
    xml.append(text_para(
        "Because the subsectors mirror the report's own, an entry can be moved into the "
        "corresponding chapter section without re-cutting the analysis — and it lines up with the "
        "policy-gap note for transport and industry, which uses the same subsector taxonomy."))

    xml.append(text_para("Sources and provenance", "Heading1"))
    xml.append(text_para(
        "What each part of this note rests on, and what still needs a human sign-off.",
        "Lead-intext"))
    xml.append(para([run("Literature. ", bold=True),
                     run("Every entry cites the primary work behind the mechanism it describes. The "
                         "recurring sources are IPCC AR6 WGII (Ch. 13 Europe, Ch. 18) and WGIII "
                         "(Ch. 10 Transport, Ch. 11 Industry), the EEA European Climate Risk "
                         "Assessment (EUCRA, 2024), and the peer-reviewed studies listed per entry.")]))
    xml.append(para([run("Citation check. ", bold=True),
                     run(f"On {meta['citationsVerifiedOn']} every citation was verified against "
                         "Crossref and publisher records — titles, authors, journals, volumes, DOIs, "
                         "and the claim attributed to each source. That pass corrected a wrong DOI, a "
                         "dead publisher link, an incomplete citation and a publication date.")]))
    xml.append(para([run("Pending verification. ", bold=True),
                     run("The framing of each interaction and its assignment to a subsector are "
                         "working judgements compiled for this prep cycle. They need the sector "
                         "lead's sign-off before any of this is used in a Board product.")]))
    xml.append(para([run("Live version. ", bold=True),
                     run("This note is the offline copy of the Method Hub module Summer Prep › "
                         "Policy Gap 2.0 Report › Synergies & Trade-offs, which is generated from "
                         "src/data/summer-prep-synergies.ts. If the two differ, the Hub is the "
                         "current one.")]))
    xml.append(para([run("Report. ", bold=True),
                     run(f"ESABCC (2024) “{meta['reportTitle']}”, {meta['reportPublished']}. "
                         f"{meta['reportUrl']}")], "SourceNotes"))
    return "".join(xml), n


def main(data_path, template_path, out_path):
    data = json.load(open(data_path, encoding="utf8"))
    body_xml, n_entries = build_body(data)

    work = Path(tempfile.mkdtemp())
    with zipfile.ZipFile(template_path) as z:
        z.extractall(work)

    doc_path = work / "word" / "document.xml"
    doc = doc_path.read_text(encoding="utf8")

    # Keep the template's own <w:document …> opening tag, its <w:body> section
    # properties (page size, margins, header references) and everything else;
    # only the body content is replaced.
    head = doc[: doc.index("<w:body>") + len("<w:body>")]
    sect = re.search(r"<w:sectPr[\s\S]*?</w:sectPr>", doc).group(0)
    doc_path.write_text(f"{head}{body_xml}{sect}</w:body></w:document>", encoding="utf8")

    # A .docx, not a template: swap the main-part content type and drop the
    # template-only attached-template relationship.
    ct = work / "[Content_Types].xml"
    ct.write_text(
        ct.read_text(encoding="utf8").replace(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
        ),
        encoding="utf8",
    )

    out = Path(out_path)
    if out.exists():
        out.unlink()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(work.rglob("*")):
            if p.is_file():
                z.write(p, p.relative_to(work).as_posix())
    shutil.rmtree(work)
    print(f"wrote {out_path}: {n_entries} interaction tables")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])
