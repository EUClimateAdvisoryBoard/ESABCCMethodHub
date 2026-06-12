#!/usr/bin/env python3
"""Generate the one-page Word note on the IAM scenario submission call.

Output: project-documents/2026-06-12 Scenario Submission Call - One-pager.docx
Requires the figure produced by scripts/make-scenario-call-figure.py.
Re-run after editing the content below: python3 scripts/make-scenario-call-onepager.py
"""
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

ACCENT = RGBColor(0x2F, 0x6E, 0x5B)  # MethodHub sector green
GREY = RGBColor(0x55, 0x5B, 0x63)

doc = Document()

# One page: narrow margins, compact base style.
for section in doc.sections:
    section.top_margin = Cm(1.1)
    section.bottom_margin = Cm(1.0)
    section.left_margin = Cm(1.5)
    section.right_margin = Cm(1.5)

style = doc.styles["Normal"]
style.font.name = "Calibri"
style.font.size = Pt(9)
style.paragraph_format.space_after = Pt(2)


def heading(text):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = True
    r.font.size = Pt(10)
    r.font.color.rgb = ACCENT
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(1)
    return p


def para(text, italic=False, size=9, color=None):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.italic = italic
    r.font.size = Pt(size)
    if color:
        r.font.color.rgb = color
    return p


def bullet(lead, text):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(1)
    r = p.add_run(lead + " — " if lead else "")
    r.bold = True
    p.add_run(text)
    for run in p.runs:
        run.font.size = Pt(9)
    return p


# ── Title ────────────────────────────────────────────────────────────────────
t = doc.add_paragraph()
t.alignment = WD_ALIGN_PARAGRAPH.LEFT
r = t.add_run("An open scenario submission call for IAM modellers")
r.bold = True
r.font.size = Pt(15)
r.font.color.rgb = ACCENT
t.paragraph_format.space_after = Pt(1)

s = doc.add_paragraph()
r = s.add_run(
    "Our thinking on scenarios: what we need them for, how to acquire them, "
    "the workflow on our side, and the risks — ESABCC MethodHub, draft for discussion, 12 June 2026"
)
r.italic = True
r.font.size = Pt(9)
r.font.color.rgb = GREY
s.paragraph_format.space_after = Pt(6)

# ── What we need scenarios for ───────────────────────────────────────────────
heading("What do we need scenarios for?")
para(
    "Our monitoring frameworks tell us what to track but not how fast it must move. The board's sector flow charts "
    "carry ~40 progress indicators, today read against observed trends and EC scenarios only. Matched scenario "
    "corridors turn every indicator into a quantified benchmark and keep gap assessments evidence-based as policy "
    "and model vintages evolve."
)

# ── Options ──────────────────────────────────────────────────────────────────
heading("Which options do we have to acquire them?")
bullet("Reuse existing databases", "AR6 / ECEMF snapshots — cheap, but vintages age, EU27 sectoral detail is thin, "
       "and we cannot ask for missing variables.")
bullet("Commission modelling", "Full design control, but slow, costly, few models — weak ensembles, hand-picked look.")
bullet("Open submission call (proposed)", "IAM and sectoral teams submit economy-wide or sectoral EU scenarios "
       "directly to the MethodHub — best breadth and freshness at the lowest cost; the other options stay as "
       "complements.")

# ── Figure ───────────────────────────────────────────────────────────────────
fig_p = doc.add_paragraph()
fig_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
fig_p.paragraph_format.space_before = Pt(3)
fig_p.paragraph_format.space_after = Pt(0)
fig_p.add_run().add_picture("project-documents/assets/scenario-call-logic-figure.png", width=Cm(16.2))
cap = doc.add_paragraph()
cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = cap.add_run(
    "Figure 1 | Current (a) vs new (b) assessment logic (schematic). Shaded band: range across submitted "
    "scenarios; solid line: ensemble median."
)
r.italic = True
r.font.size = Pt(7.5)
r.font.color.rgb = GREY
cap.paragraph_format.space_after = Pt(2)

# ── How to read the figure ───────────────────────────────────────────────────
heading("What the figure shows")
bullet("Panel a (today)", "Both forward-looking elements come from official sources only: the Member State "
       "WEM/WAM projections (reported under the Governance Regulation, aggregated by the EEA) answer 'will we meet "
       "the benchmark under current and planned policies?', and the EC-scenario benchmarks set the goal posts. "
       "There is no independent scientific check and no uncertainty range around either.")
bullet("Panel b (with the call)", "Both elements are kept, but the submitted scenario ensemble is added alongside: "
       "the shaded band is the range across all submitted runs, the solid line their median. Where the official "
       "projections and benchmarks sit relative to the band shows at a glance whether they are optimistic or "
       "conservative against the scientific landscape — and the ensemble reveals futures (such as deeper-than-target "
       "cuts) that a single official trajectory never shows.")
bullet("Why it matters", "The same comparison is repeated per indicator on the matched flow chart, giving every "
       "sector benchmark an independent, scientifically robust corridor — and a documented basis for judging whether "
       "EC scenarios are too optimistic or too pessimistic on specific points.")

# ── Workflow ─────────────────────────────────────────────────────────────────
heading("What would the workflow be on our side?")
bullet("Submission infrastructure", "Built on the MethodHub, which already bundles the scenario snapshot and the "
       "indicator database; teams submit IAMC-template files through a portal — no new platform needed.")
bullet("Automated matching", "A prototype flow chart ('Scenario call') already maps every indicator — mitigation and "
       "adaptation — to a template variable and submission track; submitted runs resolve against it automatically.")
bullet("Filtering & analysis", "Vetting, filtering and corridor analysis run in the existing MethodHub pipeline "
       "(harmonisation diagnostics as used for the current snapshot).")
bullet("Distribution", "The main genuine effort. With Keywan Riahi (MESSAGEix-GLOBIOM, IIASA) and Detlef van Vuuren "
       "(IMAGE, PBL) on the board, the call travels through the IAMC, ECEMF and NAVIGATE/ENGAGE networks at "
       "essentially no cost and with high credibility.")

# ── Benefits ─────────────────────────────────────────────────────────────────
heading("Benefits")
bullet("Quantified, independent monitoring", "Every indicator gains a scenario corridor, and EC scenarios can be "
       "assessed against the broader scientific landscape (see figure).")
bullet("Broader, fresher evidence at low cost", "An open multi-team ensemble beats any single study; sectoral "
       "submissions fill IAM blind spots (renovation rates, mode shares, livestock intensities); tooling is an "
       "extension of existing infrastructure.")
bullet("Transparency", "A documented open call with published criteria strengthens the board's independence over "
       "ad-hoc scenario selection.")

# ── Risks ────────────────────────────────────────────────────────────────────
heading("Risks — and why they are manageable")
bullet("Low or skewed response", "The central risk — mitigated by network distribution, a low submission burden "
       "(standard IAMC template), and seeding with the 63 runs already held so the tool works from day one.")
bullet("Quality and comparability", "Automated vetting and harmonisation diagnostics plus published inclusion "
       "criteria; submission does not imply endorsement.")
bullet("Coverage gaps", "Non-standard outputs (circular material use, food waste, renovation equity) are flagged as "
       "requested variables; the sectoral and impact-model tracks recruit the teams that can report them.")

# ── Bottom line ──────────────────────────────────────────────────────────────
heading("Bottom line")
para(
    "Feasible with modest effort: infrastructure and analysis tooling are deliverable on the MethodHub, indicator "
    "matching exists in prototype, and the one real success factor — that teams submit — is where the board is "
    "strongest, through Keywan's and Detlef's networks. We propose preparing a pilot call for autumn 2026."
)

out = "project-documents/2026-06-12 Scenario Submission Call - One-pager.docx"
doc.save(out)
print("wrote", out)
