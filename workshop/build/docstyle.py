"""Shared layout/style helpers for the workshop document PDFs (A4, reportlab)."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table,
    TableStyle, HRFlowable, KeepTogether, PageBreak, NextPageTemplate,
)

INK = HexColor("#1A2E35")        # near-black body text
PRIMARY = HexColor("#0F4C5C")    # deep teal
PRIMARY_DARK = HexColor("#0A3540")
ACCENT = HexColor("#E36414")     # energy amber
MUTED = HexColor("#5C6F76")
FAINT = HexColor("#E8EEF0")      # light teal-grey fill
RULE = HexColor("#C7D3D7")
WHITE = HexColor("#FFFFFF")

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm

body = ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, leading=13.5,
                      textColor=INK, spaceAfter=6, alignment=TA_LEFT)
body_small = ParagraphStyle("body_small", parent=body, fontSize=8.5, leading=12)
bullet = ParagraphStyle("bullet", parent=body, leftIndent=10, bulletIndent=2,
                        spaceAfter=3)
h1 = ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=15, leading=18,
                    textColor=PRIMARY_DARK, spaceBefore=14, spaceAfter=6)
h2 = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=11.5, leading=14,
                    textColor=PRIMARY, spaceBefore=10, spaceAfter=4)
h3 = ParagraphStyle("h3", fontName="Helvetica-Bold", fontSize=9.5, leading=13,
                    textColor=INK, spaceBefore=6, spaceAfter=2)
caption = ParagraphStyle("caption", parent=body, fontSize=8, leading=11,
                         textColor=MUTED)
cover_title = ParagraphStyle("cover_title", fontName="Helvetica-Bold",
                             fontSize=26, leading=31, textColor=WHITE)
cover_sub = ParagraphStyle("cover_sub", fontName="Helvetica", fontSize=12.5,
                           leading=17, textColor=HexColor("#BFD7DE"))
cover_meta = ParagraphStyle("cover_meta", fontName="Helvetica", fontSize=9.5,
                            leading=14, textColor=HexColor("#9DBEC8"))


def _footer(doc_title):
    def draw(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(MARGIN, 12 * mm, doc_title)
        canvas.drawRightString(PAGE_W - MARGIN, 12 * mm, f"Page {doc.page}")
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN, 15 * mm, PAGE_W - MARGIN, 15 * mm)
        canvas.restoreState()
    return draw


def _cover_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(PRIMARY_DARK)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    canvas.setFillColor(PRIMARY)
    canvas.rect(0, 0, PAGE_W, 70 * mm, stroke=0, fill=1)
    canvas.setFillColor(ACCENT)
    canvas.circle(PAGE_W - 30 * mm, 70 * mm, 5 * mm, stroke=0, fill=1)
    canvas.restoreState()


def make_doc(path, doc_title):
    doc = BaseDocTemplate(path, pagesize=A4,
                          leftMargin=MARGIN, rightMargin=MARGIN,
                          topMargin=MARGIN, bottomMargin=22 * mm,
                          title=doc_title)
    frame = Frame(MARGIN, 22 * mm, PAGE_W - 2 * MARGIN, PAGE_H - MARGIN - 22 * mm,
                  id="main")
    cover_frame = Frame(MARGIN, 30 * mm, PAGE_W - 2 * MARGIN, PAGE_H - 60 * mm,
                        id="cover")
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[cover_frame], onPage=_cover_bg),
        PageTemplate(id="main", frames=[frame], onPage=_footer(doc_title)),
    ])
    return doc


def cover(story, kicker, title, subtitle, meta_lines):
    story.append(Spacer(1, 55 * mm))
    story.append(Paragraph(kicker.upper(), ParagraphStyle(
        "kick", fontName="Helvetica-Bold", fontSize=10, leading=14,
        textColor=ACCENT)))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph(title, cover_title))
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph(subtitle, cover_sub))
    story.append(Spacer(1, 40 * mm))
    for line in meta_lines:
        story.append(Paragraph(line, cover_meta))
    story.append(NextPageTemplate("main"))
    story.append(PageBreak())


def rule(story):
    story.append(HRFlowable(width="100%", thickness=0.6, color=RULE,
                            spaceBefore=2, spaceAfter=8))


def callout(story, title_text, body_text):
    inner = [Paragraph(title_text, ParagraphStyle(
        "co_t", parent=h3, textColor=PRIMARY_DARK, spaceBefore=0)),
        Paragraph(body_text, body_small)]
    t = Table([[inner]], colWidths=[PAGE_W - 2 * MARGIN])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), FAINT),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    story.append(KeepTogether(t))
    story.append(Spacer(1, 6))


def styled_table(data, col_widths, header=True, small=False):
    st = body_small if small else body
    wrapped = []
    for r, row in enumerate(data):
        wrapped.append([
            Paragraph(cell, ParagraphStyle(
                "th", parent=st, fontName="Helvetica-Bold",
                textColor=WHITE if header and r == 0 else INK))
            if header and r == 0 else
            (Paragraph(cell, st) if isinstance(cell, str) else cell)
            for cell in row
        ])
    t = Table(wrapped, colWidths=col_widths, repeatRows=1 if header else 0)
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULE),
    ]
    if header:
        style += [("BACKGROUND", (0, 0), (-1, 0), PRIMARY)]
    for i in range(2, len(data), 2):
        style.append(("BACKGROUND", (0, i), (-1, i), HexColor("#F4F7F8")))
    t.setStyle(TableStyle(style))
    return t
