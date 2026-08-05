"""Build the participant workbook PDF."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from docstyle import (  # noqa: E402
    make_doc, cover, rule, callout, styled_table,
    body, body_small, bullet, h1, h2, h3, caption,
    Paragraph, Spacer, KeepTogether, PageBreak, PAGE_W, MARGIN, mm,
)
from reportlab.platypus import Table, TableStyle  # noqa: E402
from docstyle import RULE, FAINT, MUTED  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), "..", "materials",
                   "participant-workbook.pdf")

story = []


def write_lines(n, label=None):
    """Ruled writing space."""
    if label:
        story.append(Paragraph(label, h3))
    rows = [[""] for _ in range(n)]
    t = Table(rows, colWidths=[PAGE_W - 2 * MARGIN], rowHeights=[9 * mm] * n)
    t.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, RULE),
    ]))
    story.append(t)
    story.append(Spacer(1, 6))


cover(
    story,
    kicker="Participant workbook",
    title="The EU Climate Machine",
    subtitle="Exercises, worksheets, the formula sheet and an annotated "
             "source list — yours to keep and keep using.",
    meta_lines=[
        "Name: ______________________________    Session date: ______________",
        "Edition: August 2026",
    ],
)

# ── How to use ──────────────────────────────────────────────────────────────
story.append(Paragraph("How to use this workbook", h1))
rule(story)
story.append(Paragraph(
    "Each module has three parts here: a one-paragraph recap of the "
    "mechanism, a worksheet you fill in during the exercise, and space for "
    "your own notes. The rules that make the day work: write your "
    "<b>prediction before you run any model</b> (the learning lives in the "
    "gap between the two), and treat every model as what it is — a stylised "
    "teaching instrument that reproduces the logic and order of magnitude of "
    "published analyses, not a forecast and not a citable source. The "
    "formula sheet and source list at the back are the exception: those are "
    "built for reuse.", body))

story.append(Paragraph("The day at a glance", h2))
story.append(styled_table([
    ["Time", "Session"],
    ["09:00", "Welcome and framing — the July 2026 package"],
    ["09:30", "Module 1 · The carbon pricing endgame"],
    ["11:15", "Module 2 · Why European electricity costs what it costs"],
    ["13:30", "Module 3 · Electrification and the 2040 framework"],
    ["15:15", "Module 4 · Stress tests — politics and nature"],
    ["16:15", "Synthesis — your watchlist"],
], [22 * mm, PAGE_W - 2 * MARGIN - 22 * mm], small=True))

# ── Module 1 ────────────────────────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("Module 1 · The carbon pricing endgame", h1))
rule(story)
story.append(Paragraph(
    "<b>The mechanism in one paragraph.</b> The ETS is a cumulative budget: "
    "a shrinking cap plus banking means the allowance price is set by "
    "intertemporal arbitrage — it rises at roughly the discount rate while "
    "the bank is positive, and the whole path is pinned by the one starting "
    "price that makes cumulative emissions exhaust the cumulative cap plus "
    "the bank. Abatement gets more expensive as the easy tonnes run out "
    "(a convex MACC saturating at ≈81% of baseline), so a price-only system "
    "spikes as the cap approaches zero. Permanent removals act as a "
    "price-responsive backstop — but only up to the volume policy admits.",
    body))

story.append(Paragraph("Exercise 1 · Price the July 2026 package", h2))
story.append(Paragraph("Step 1 — map the real package onto the model's dials:", body_small))
story.append(styled_table([
    ["Package element", "Which dial(s)?", "Direction of price effect?"],
    ["LRF slowed to 3.7% (2031–35), 1.7% (2036–40)", "", ""],
    ["250 Mt permanent removals, on top of the cap (Art. 9c)", "", ""],
    ["MSR intake halved 24% → 12%", "", ""],
    ["≈260 Mt international credits from 2036 (2033 review)", "", ""],
], [62 * mm, 55 * mm, PAGE_W - 2 * MARGIN - 117 * mm], small=True))
story.append(Spacer(1, 4))
story.append(Paragraph(
    "Step 2 — predict before you run (base case: €195 in 2030, €336 in 2040):",
    body_small))
story.append(styled_table([
    ["", "Your predicted 2030 price", "Your predicted 2040 price"],
    ["Prediction", "", ""],
    ["Model output", "", ""],
    ["Why the difference?", "", ""],
], [40 * mm, (PAGE_W - 2 * MARGIN - 40 * mm) / 2, (PAGE_W - 2 * MARGIN - 40 * mm) / 2], small=True))
story.append(Spacer(1, 4))
write_lines(3, "Step 4 — your team's one sentence (who should be nervous, and why):")

story.append(Paragraph("Model reference card", h2))
story.append(styled_table([
    ["Parameter", "Default", "Parameter", "Default"],
    ["Cap 2025 / net-zero year", "1,340 Mt / 2040", "Banked headroom", "1,500 Mt"],
    ["Hotelling rate r", "5.6%/yr", "Abatement ceiling φmax", "0.81"],
    ["CDR floor cost", "€70/t", "CDR admitted (max)", "90 Mt/yr from 2031"],
    ["Integrity haircut", "10%", "Capacity ceiling", "165 Mt/yr by 2050"],
], [48 * mm, 37 * mm, 48 * mm, PAGE_W - 2 * MARGIN - 133 * mm], small=True))

# ── Module 2 ────────────────────────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("Module 2 · Why European electricity costs what it costs", h1))
rule(story)
story.append(Paragraph(
    "<b>The mechanism in one paragraph.</b> Day-ahead markets are "
    "uniform-price auctions: every plant bids ≈ its short-run marginal cost, "
    "bids stack cheapest-first, and the last plant needed sets the price "
    "paid to all. The average cost of the fleet is irrelevant; only the "
    "marginal machine matters — and in Europe that machine is a gas plant "
    "in over half of all hours. Feed the same auction US or Chinese inputs "
    "and it produces US or Chinese prices: the gap is an input gap, not a "
    "mechanism gap.", body))

story.append(Paragraph("Exercise 2 · Build the merit order", h2))
story.append(Paragraph(
    "Parameter card — fuel €/MWh thermal: gas 38 · hard coal 13 · lignite 5. "
    "CO<sub>2</sub>: €70/t. Emission factors (tCO<sub>2</sub>/MWhth): gas 0.202 · coal 0.34 · "
    "lignite 0.40. Formula: <b>MC = fuel/η + (EF/η)·CO<sub>2</sub> + O&M</b>.",
    body_small))
story.append(styled_table([
    ["Plant (capacity)", "η", "O&M", "Your MC computation", "MC €/MWh"],
    ["Nuclear (78 GW)", "—", "≈€12 all-in", "", ""],
    ["Hard coal (38 GW)", "0.42", "€3", "", ""],
    ["Lignite (28 GW)", "0.40", "€12", "", ""],
    ["CCGT gas (145 GW)", "0.56", "€2", "", ""],
    ["OCGT peaker (45 GW)", "0.38", "€3", "", ""],
], [42 * mm, 12 * mm, 24 * mm, 62 * mm, PAGE_W - 2 * MARGIN - 140 * mm], small=True))
story.append(Spacer(1, 4))
story.append(Paragraph(
    "Now stack cheapest-first (wind & solar bid €0: 105 GW running) and "
    "clear the market at <b>350 GW</b> demand. Marginal plant: ________________ "
    "Clearing price: ____________", body_small))
story.append(Spacer(1, 4))
story.append(styled_table([
    ["Re-run", "Marginal plant", "Clearing price"],
    ["August 2022: gas €235/MWhth, nuclear derated", "", ""],
    ["US inputs: gas ≈€11, no carbon price", "", ""],
], [70 * mm, (PAGE_W - 2 * MARGIN - 70 * mm) / 2, (PAGE_W - 2 * MARGIN - 70 * mm) / 2], small=True))
story.append(Spacer(1, 4))
write_lines(3, "Your 30-second answer: “why does a 70%-renewable grid still price at gas?”")

# ── Module 3 ────────────────────────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("Module 3 · Electrification and the 2040 framework", h1))
rule(story)
story.append(Paragraph(
    "<b>The mechanism in one paragraph.</b> Final demand in buildings heat, "
    "road transport and industry heat splits into adoption tranches ordered "
    "by barrier-adjusted switching cost; a carbon price P electrifies every "
    "tranche cheaper than P. Price alone reaches the 46%-by-2040 target at "
    "≈€166/t — 3.7× the €45/t at which ETS2 releases extra allowances, so "
    "that route is institutionally foreclosed. With the demand-side package "
    "(price-ratio reform, building and vehicle standards, CCfDs) the same "
    "target clears at ≈€55/t. The €111/t gap is the shadow value of "
    "demand-side policy. Separately: because electric devices need ~3× less "
    "input energy, every switch shrinks the final-energy denominator — the "
    "46% metric lags real device adoption badly.", body))

story.append(Paragraph("Exercise 3 · Pick your mix on the iso-target frontier", h2))
story.append(Paragraph(
    "Precomputed from the identity (COP 3.0, boiler η 0.9, ICE÷EV 3.3, "
    "heat 2,500 TWh, cars 1,700 TWh, total 8,100 TWh). Today: heat pumps "
    "≈13%, EV ≈4% of car-km.", body_small))
story.append(styled_table([
    ["If heat pumps reach…", "EV share needed (no other help)", "EV share needed (25% of other fossil switched)"],
    ["50%", ">100% — unreachable", "≈79%"],
    ["60%", "≈101% — unreachable", "≈63%"],
    ["70%", "≈85%", "≈48%"],
    ["75% (Liebreich's point)", "≈78%", "≈40%"],
    ["80%", "≈70%", "≈32%"],
    ["90%", "≈54%", "≈16%"],
], [42 * mm, (PAGE_W - 2 * MARGIN - 42 * mm) / 2, (PAGE_W - 2 * MARGIN - 42 * mm) / 2], small=True))
story.append(Spacer(1, 4))
story.append(styled_table([
    ["Your 2040 mix", "Heat-pump share", "EV share", "Other sectors switched", "Clears the frontier?"],
    ["Team consensus", "", "", "", ""],
], [32 * mm, 32 * mm, 25 * mm, 40 * mm, PAGE_W - 2 * MARGIN - 129 * mm], small=True))
story.append(Spacer(1, 4))
write_lines(2, "Which single policy from the package does your mix lean on hardest?")
write_lines(2, "The fleet-life check: what would 2027 sales have to look like for your mix?")

# ── Module 4 ────────────────────────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("Module 4 · Stress tests — politics and nature", h1))
rule(story)
story.append(Paragraph(
    "<b>The two identities.</b> Politics: under a binding banked cap, "
    "cumulative emissions ≈ cumulative cap − final bank — so demands that "
    "move the cap or add fungible supply cost tonnes directly, while free-"
    "allocation demands mostly redistribute rent inside the cap. Nature: "
    "the 2040 target is net, so every tonne the land sink fails to absorb "
    "converts one-for-one into deeper cuts elsewhere; the wildfire cohort "
    "model turns burnt hectares into that shortfall.", body))

story.append(Paragraph("Debate prompt (if run)", h2))
story.append(styled_table([
    ["Your demand", "Cost/gain in the central reading", "Your position (attack / defend)"],
    ["", "", ""],
], [50 * mm, 55 * mm, PAGE_W - 2 * MARGIN - 105 * mm], small=True))
story.append(Spacer(1, 4))
write_lines(4, "Your argument — tonnes only, no adjectives:")

story.append(Paragraph("Synthesis · Your watchlist", h1))
rule(story)
story.append(Paragraph(
    "Pick three of the day's five numbers plus two indicators specific to "
    "your organisation. Name the source you will actually check, and the "
    "threshold that would make you act.", body))
story.append(styled_table([
    ["Indicator", "Source you will check", "Check every", "Act if…"],
    ["1.", "", "", ""],
    ["2.", "", "", ""],
    ["3.", "", "", ""],
    ["4. (yours)", "", "", ""],
    ["5. (yours)", "", "", ""],
], [55 * mm, 45 * mm, 25 * mm, PAGE_W - 2 * MARGIN - 125 * mm], small=True))
story.append(Spacer(1, 4))
story.append(Paragraph(
    "The five candidates: ① EUA price vs the ≈€195-by-2030 anchor · "
    "② your member state's electricity-to-gas retail price ratio vs the "
    "≤2.5 / ≤2 KPI · ③ FID-backed CDR pipeline vs the ~48 Mt/yr 2040 need · "
    "④ LULUCF sink outturn vs 310 Mt by 2030 · ⑤ the 2033 international-"
    "credit review (fail ⇒ LRF reverts to 2.7%).", body_small))

# ── Formula sheet ───────────────────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("The formula sheet", h1))
rule(story)
story.append(styled_table([
    ["Model", "The formula(s)", "Reading"],
    ["ETS price path",
     "price(t) = P<sub>0</sub>·(1+r)^(t−2025); P<sub>0</sub> solves Σ net = Σ cap + bank",
     "One number pins the path; tighten anything cumulative and today's price moves."],
    ["Abatement",
     "aConv(P) = BAU · φmax · P/(P + 235)",
     "Convex MACC saturating at 81% — the endgame spike is the last 19%."],
    ["CDR valve",
     "removals = min(supply(P), capacity, admitted) · (1 − haircut)",
     "Three constraints; the admitted volume is the policy dial."],
    ["Merit order",
     "MC = fuel/η + (EF/η)·CO<sub>2</sub> + O&M; price = MC of last plant needed",
     "Average fleet cost is irrelevant; only the marginal machine matters."],
    ["Electrification LCM",
     "switch_cost(f) = base + spread·f^γ; electrify every tranche < P",
     "Measures shrink the spread and base — that is the €111/t."],
    ["Final-energy identity",
     "rate ≈ (1/COP) ÷ (1/COP + 1/η) in the two-device toy",
     "The denominator shrinks as you succeed; shares lag devices."],
    ["Wishlist accounting",
     "Σ emissions ≈ Σ cap − final bank",
     "Cap/supply demands cost tonnes; free-allocation demands move rent."],
    ["Wildfire cohorts",
     "loss = combustion + decomposition + foregone regrowth − embedded baseline",
     "Only the EXCESS over what projections assume counts against the target."],
], [30 * mm, 75 * mm, PAGE_W - 2 * MARGIN - 105 * mm], small=True))

story.append(Paragraph("The numbers worth memorising", h2))
story.append(styled_table([
    ["≈€73/MWh", "EU–US wholesale gap at the marginal generator: ≈€48 fuel + €25 carbon"],
    ["€166 / €55 / €111", "Price-only vs with-package carbon price for 46% electrification; the gap = shadow value of demand-side policy"],
    ["€45/t", "The ETS2 trigger that forecloses the price-only route"],
    ["≈54×", "Scale-up from today's FID-backed CDR pipeline to the 2050 safety-valve need"],
    ["+1,294 Mt", "Central cost of the ten softening demands to 2040 (≈11.8 years of EU progress)"],
    ["47 Mt = 44%", "Default 2040 wildfire sink loss = share of the planned sink improvement it takes back"],
], [35 * mm, PAGE_W - 2 * MARGIN - 35 * mm], small=True, header=False))

# ── Sources ─────────────────────────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("Annotated source list", h1))
rule(story)
for t, d in [
    ("COM(2026) 616 + SWD(2026) 616 (impact assessment, 5 parts, 958 pp).",
     "The ETS review package and its evidence base — LRF, Removals "
     "Authority, credits, MSR, CBAM timing. The IA's own uncertainty "
     "admissions (e.g. costs and benefits of the preferred option could "
     "not be monetised) are as instructive as its numbers."),
    ("COM(2026) 595 — Electrification Action Plan.",
     "The 46% indicative target, the price-ratio KPI (≤2.5 / ≤2), and the "
     "four pillars; to be enshrined via the post-2030 Energy Union package."),
    ("Sultani et al., “Sequencing Carbon Dioxide Removal into the EU ETS”, "
     "Joule (2026); Ariadne safety-valve dossier (PIK).",
     "The published basis for Module 1: price paths (≈€203/€353), the "
     "68–86 Mt/yr valve, and the three-stage sequencing proposal."),
    ("JRC134300 (2023); ACER market monitoring; Draghi report (2024).",
     "Gas price-setting shares, the 2021–22 crisis anatomy, and the "
     "converging prescription: less gas at the margin, keep marginal "
     "pricing."),
    ("Eurostat nrg_pc_204/205; SMARD/EPEX; EIA.",
     "Retail price stacks and the wholesale history behind Module 2's "
     "charts."),
    ("Günther, Pahle et al., Climate Policy (2025); Ariadne ETS2 analyses.",
     "The published price envelope (71–261 €/t for 2030) that brackets the "
     "workshop's least-cost model."),
    ("Liebreich via Euractiv (July 2026).",
     "The final-energy fallacy argument and the ¾ · 4/5 arithmetic Module 3 "
     "reproduces."),
    ("Copernicus EFFIS annual reports (JRC); Reg. (EU) 2023/839 (LULUCF).",
     "Burnt-area record and the 310 Mt sink target behind Module 4b."),
    ("Cames et al. (2016), “How additional is the CDM?”",
     "The ~85% non-additionality finding behind the international-credit "
     "default in the wishlist model."),
    ("EHPA market reports; JRC144191.",
     "Heat-pump sales collapse of 2024 and the price-ratio evidence behind "
     "the cheapest lever."),
]:
    story.append(KeepTogether([
        Paragraph(t, h3),
        Paragraph(d, body_small),
    ]))

callout(story, "A closing note on epistemics",
        "Everything you ran today was a stylised teaching instrument: built "
        "to reproduce the logic and order of magnitude of the analyses "
        "above, and honest about what it leaves out. Cite the sources, not "
        "the toys — and when someone shows you a single confident number "
        "where you have learned to expect a range, ask to see their "
        "sliders.")

write_lines(8, "Notes")

doc = make_doc(os.path.abspath(OUT), "The EU Climate Machine — Participant workbook")
doc.build(story)
print("Wrote", os.path.abspath(OUT))
