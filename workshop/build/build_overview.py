"""Build the workshop overview / prospectus PDF."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from docstyle import (  # noqa: E402
    make_doc, cover, rule, callout, styled_table,
    body, body_small, bullet, h1, h2, h3, caption,
    Paragraph, Spacer, KeepTogether, PAGE_W, MARGIN, mm,
)

OUT = os.path.join(os.path.dirname(__file__), "..", "materials",
                   "workshop-overview.pdf")

story = []

cover(
    story,
    kicker="Executive workshop · one day",
    title="The EU Climate Machine",
    subtitle="How carbon pricing, electricity markets and the 2040 framework "
             "actually work — taught through interactive economic models, "
             "not slideware.",
    meta_lines=[
        "Format: full-day workshop (half-day variant available)",
        "Audience: public affairs, strategy, energy & finance professionals",
        "Group size: 8–20 participants · Delivered in English",
        "Public sessions and in-house delivery · Brussels or on-site",
    ],
)

# ── Page 2: why / what / who ────────────────────────────────────────────────
story.append(Paragraph("Why this workshop exists", h1))
rule(story)
story.append(Paragraph(
    "EU climate policy has entered its most consequential phase since the "
    "Green Deal was launched. The July 2026 ETS review package, the 2040 "
    "target negotiation, and the omnibus reopening of adopted legislation "
    "will redistribute hundreds of billions of euros across sectors — and "
    "most professionals who need to anticipate these shifts are working from "
    "headlines, not mechanisms.", body))
story.append(Paragraph(
    "The gap shows in predictable ways: teams that treat the carbon price as "
    "a market mood rather than the output of a cap, a banking decision and an "
    "abatement cost curve; strategies that assume electricity prices fall "
    "when renewables grow, without understanding who sets the marginal price; "
    "position papers that argue about the 2040 number while missing that the "
    "demand-side package, not the target, determines the carbon price "
    "everyone will actually pay.", body))
story.append(Paragraph(
    "This workshop closes that gap in one day. Participants leave able to "
    "reason quantitatively about the questions their organisations face — "
    "not because they memorised numbers, but because they have run the "
    "models themselves.", body))

story.append(Paragraph("What makes it different", h1))
rule(story)
for t, d in [
    ("Models, not slides.",
     "Each module is built around a live, interactive economic model that "
     "participants drive from their own laptops — moving the ETS cap and "
     "watching the price path respond, stacking the merit order that sets "
     "their country's power price, trading off heat pumps against EVs on an "
     "iso-target frontier."),
    ("The actual policy machinery.",
     "The content tracks the real instruments — the ETS Directive's linear "
     "reduction factor, the Market Stability Reserve, the LULUCF regulation, "
     "the July 2026 review package — with every number sourced to public EU "
     "documents: impact assessments, EUR-Lex, Eurostat, EEA data."),
    ("Stress-tested, both ways.",
     "The final module deliberately breaks the models: what ten currently "
     "debated political softening demands would cost in tonnes and years, "
     "and what escalating wildfires do to the land sink the targets quietly "
     "depend on. Participants learn where the framework is robust and where "
     "it is fragile."),
    ("Honest about its epistemics.",
     "Every model is labelled for what it is: a stylised teaching instrument "
     "that reproduces the logic and the order of magnitude of the real "
     "analyses, built for insight rather than citation. Participants are told "
     "exactly what each model can and cannot support."),
]:
    story.append(Paragraph(f"<b>{t}</b> {d}", bullet, bulletText="•"))

story.append(Paragraph("Who should attend", h1))
rule(story)
story.append(Paragraph(
    "The workshop is designed for professionals whose work depends on "
    "anticipating EU climate and energy policy, but who are not themselves "
    "modellers:", body))
for x in [
    "<b>Public affairs and government relations</b> teams tracking the ETS "
    "review, the 2040 framework and the omnibus agenda",
    "<b>Corporate strategy and sustainability</b> functions in energy, "
    "industry, transport and buildings value chains",
    "<b>Finance professionals</b> — analysts, investors and risk teams "
    "pricing transition exposure in EU assets",
    "<b>Officials and parliamentary staff</b> who want the economics behind "
    "the files they negotiate",
    "<b>Journalists and researchers</b> covering EU climate policy who want "
    "to interrogate claims quantitatively",
]:
    story.append(Paragraph(x, bullet, bulletText="•"))
story.append(Paragraph(
    "No prior modelling experience is required. Comfort with percentages, "
    "prices and reading a chart is enough; every formula used in the day "
    "fits on one line and is explained from scratch.", body))

# ── Page 3: modules ─────────────────────────────────────────────────────────
story.append(Paragraph("The four modules", h1))
rule(story)

modules = [
    ("Module 1 · The carbon pricing endgame",
     "Why the EU ETS price is not a market mood but the solution to an "
     "intertemporal problem: a shrinking cap, banking behaviour, and a "
     "rising marginal abatement cost curve. Participants run a "
     "Hotelling-style allowance price model, then add the policy levers of "
     "the July 2026 review — a slower cap decline, a smaller Market "
     "Stability Reserve, permanent carbon removals as a safety valve, and "
     "international credits — and watch what each does to the price path "
     "and the cumulative emissions budget."),
    ("Module 2 · Why European electricity costs what it costs",
     "The merit order, taught by building it. Participants assemble a "
     "uniform-price auction from real technology cost parameters — fuel "
     "price over efficiency, plus emissions intensity times the carbon "
     "price — and discover who sets the marginal price hour by hour. The "
     "module then decomposes the wholesale price gap between the EU, the "
     "US and China into its fuel and carbon components, and walks the "
     "retail stack that determines what households and industry finally "
     "pay."),
    ("Module 3 · Electrification and the 2040 framework",
     "The quantitative heart of the day. A least-cost model of the EU "
     "energy system shows what carbon price would be needed to reach the "
     "2040 electrification target on price alone, versus with the "
     "demand-side package — heat pumps, EVs, industrial electrification — "
     "doing part of the work. The gap between those two prices is the "
     "shadow value of demand-side policy: the single most useful number in "
     "the 2040 debate, and one almost nobody in the debate knows."),
    ("Module 4 · Stress tests — politics and nature",
     "Two deliberate attacks on the framework. First, politics: a "
     "transparent accounting model prices ten currently debated ETS "
     "softening demands in tonnes of CO<sub>2</sub> and in years of EU climate "
     "progress. Second, nature: a cohort model converts observed wildfire "
     "burnt area into land-sink shortfall — revealing how much extra "
     "mitigation burden every fire season silently adds to the 2040 and "
     "2050 targets."),
]
for title, desc in modules:
    story.append(KeepTogether([
        Paragraph(title, h2),
        Paragraph(desc, body),
    ]))

story.append(Paragraph("What participants take away", h1))
rule(story)
for x in [
    "A working mental model of the four mechanisms that drive EU climate "
    "economics: cap-and-banking, merit order, least-cost electrification, "
    "and the land sink",
    "The participant workbook: all exercises, reference tables, formula "
    "sheet and an annotated source list for continued use",
    "The full slide deck as a PDF reference",
    "A personal 2026–2030 watchlist, built in the closing session: the "
    "specific decisions, dates and indicators that matter for their "
    "organisation",
]:
    story.append(Paragraph(x, bullet, bulletText="•"))

# ── Page 4: agenda, formats, pricing ────────────────────────────────────────
story.append(Paragraph("Agenda", h1))
rule(story)
agenda = [
    ["Time", "Session"],
    ["09:00–09:30", "<b>Welcome and framing.</b> The 2026 moment: the ETS "
     "review package, the 2040 negotiation, the omnibus agenda — and why "
     "mechanisms beat headlines."],
    ["09:30–11:00", "<b>Module 1 — The carbon pricing endgame.</b> "
     "Interactive allowance-price model; exercise in teams: price the July "
     "2026 reform package."],
    ["11:00–11:15", "Break"],
    ["11:15–12:45", "<b>Module 2 — Why European electricity costs what it "
     "costs.</b> Build-the-merit-order exercise; EU–US–China decomposition; "
     "retail stack."],
    ["12:45–13:30", "Lunch"],
    ["13:30–15:00", "<b>Module 3 — Electrification and the 2040 "
     "framework.</b> Least-cost model; the shadow value of demand-side "
     "policy; iso-target frontier exercise."],
    ["15:00–15:15", "Break"],
    ["15:15–16:15", "<b>Module 4 — Stress tests.</b> Pricing political "
     "softening in tonnes and years; wildfires and the land sink."],
    ["16:15–17:00", "<b>Synthesis and watchlist.</b> The five numbers to "
     "watch to 2030; each participant builds a personal monitoring list; "
     "open questions."],
]
story.append(styled_table(agenda, [28 * mm, PAGE_W - 2 * MARGIN - 28 * mm],
                          small=True))
story.append(Spacer(1, 8))

story.append(Paragraph("Formats and pricing", h1))
rule(story)
pricing = [
    ["Format", "Description", "Price (excl. VAT)"],
    ["Public session (full day)",
     "Open-enrolment day in Brussels, 8–20 participants, lunch included.",
     "€690 per seat"],
    ["In-house (full day)",
     "Delivered at your offices, tailored opening framing for your sector; "
     "up to 20 participants.",
     "€7,500 flat"],
    ["In-house (half day)",
     "Modules 1 and 3 plus synthesis — the carbon price and the 2040 "
     "framework; up to 20 participants.",
     "€4,500 flat"],
    ["Briefing add-on",
     "90-minute executive replay for leadership teams within 4 weeks of an "
     "in-house session.",
     "€1,500"],
]
story.append(styled_table(
    pricing, [40 * mm, PAGE_W - 2 * MARGIN - 40 * mm - 34 * mm, 34 * mm],
    small=True))
story.append(Spacer(1, 4))
story.append(Paragraph(
    "Public-sector, academic and newsroom rates available on request. "
    "Sessions can be delivered in a laptops-optional format where the "
    "facilitator drives the models on screen.", caption))

story.append(Paragraph("Method and sources", h1))
rule(story)
story.append(Paragraph(
    "All models used in the workshop are stylised teaching instruments, "
    "built to reproduce the logic and order of magnitude of published "
    "analyses rather than to replace them. Every empirical claim is sourced "
    "to public materials: European Commission impact assessments, EUR-Lex "
    "legal texts, Eurostat and EEA statistics, and the peer-reviewed "
    "literature on allowance markets and power systems. The workshop is "
    "independently produced and is not affiliated with, or endorsed by, any "
    "EU institution or advisory body.", body_small))

callout(story, "Booking and contact",
        "To book a public seat or request an in-house date, contact the "
        "facilitator. Provisional holds are kept for 10 working days. "
        "Materials are updated after every major EU policy event; "
        "participants receive the edition current at their session date.")

doc = make_doc(os.path.abspath(OUT), "The EU Climate Machine — Workshop overview")
doc.build(story)
print("Wrote", os.path.abspath(OUT))
