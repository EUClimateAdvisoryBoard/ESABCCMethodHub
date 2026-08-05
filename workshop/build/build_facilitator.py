"""Build the facilitator guide PDF."""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from docstyle import (  # noqa: E402
    make_doc, cover, rule, callout, styled_table,
    body, body_small, bullet, h1, h2, h3, caption,
    Paragraph, Spacer, KeepTogether, PageBreak, PAGE_W, MARGIN, mm,
)

OUT = os.path.join(os.path.dirname(__file__), "..", "materials",
                   "facilitator-guide.pdf")

story = []

cover(
    story,
    kicker="Facilitator guide · confidential to the delivery team",
    title="The EU Climate Machine",
    subtitle="Run-of-show, talking points, exercise answer keys and the numbers "
             "to have at your fingertips.",
    meta_lines=[
        "Companion documents: slide deck (28 slides) · participant workbook · overview prospectus",
        "Edition: August 2026 — refresh after every major EU policy event",
    ],
)

# ── Principles ──────────────────────────────────────────────────────────────
story.append(Paragraph("How to run this day", h1))
rule(story)
for t, d in [
    ("Models first, slides second.",
     "The deck exists to frame the models, not the reverse. Whenever a "
     "discussion catches fire in front of a live model, let the slides wait. "
     "Every module survives losing a third of its slides; none survives "
     "losing its exercise."),
    ("Predict before you run.",
     "Each exercise forces a written prediction before touching a slider. "
     "This is deliberate: the learning is in the gap between prediction and "
     "output. Do not let teams skip to the model."),
    ("Honesty is the brand.",
     "Every model is a stylised teaching instrument, and the deck says so. "
     "When a participant catches a simplification — the ETS model ignoring "
     "free allocation, the merit order having no grid — agree enthusiastically "
     "and name what the full model adds. Never defend a toy as if it were the "
     "real thing; the epistemic labels are a feature to point at, not a "
     "weakness to hide."),
    ("Watch the clock at the module level, not the slide level.",
     "Hard rails: exercises start no later than 40 minutes into each module. "
     "The synthesis session is protected — never sacrifice the watchlist "
     "exercise to overrun."),
    ("No affiliation claims, ever.",
     "The workshop is independently produced. If asked about ESABCC, EEA or "
     "Commission views, distinguish clearly between published positions "
     "(citable) and your own reading (yours)."),
]:
    story.append(Paragraph(f"<b>{t}</b> {d}", bullet, bulletText="•"))

story.append(Paragraph("Setup checklist", h2))
for x in [
    "Room in islands of 3–4; projector + flipchart per island if possible.",
    "Models preloaded and tested on the venue network <b>before</b> participants arrive; offline fallback: facilitator's laptop drives, teams call out settings.",
    "Print per participant: workbook. Print per team: parameter cards (workbook pp. 4, 6, 10).",
    "Timer visible to you; phone timers for exercise blocks.",
    "Half-day variant: run Modules 1 and 3 plus a 20-minute synthesis; lift the merit-order formula from Module 2 into Module 3's introduction (10 minutes, one slide).",
]:
    story.append(Paragraph(x, bullet, bulletText="•"))

# ── Module 1 ────────────────────────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("Module 1 · The carbon pricing endgame (09:30–11:00)", h1))
rule(story)
story.append(Paragraph("Timing", h2))
story.append(styled_table([
    ["Block", "Minutes", "What happens"],
    ["Mechanism", "20", "Cumulative budget → Hotelling → MACC → endgame spike (slides 5–6). Check-question: “if the 2035 cap tightens, why does TODAY's price move?”"],
    ["Safety valve + reality", "15", "Three-way minimum, sequencing stages, pipeline reality check (slides 7–8)."],
    ["Exercise 1", "25", "Price the July 2026 package (slide 9; workbook pp. 3–5)."],
    ["Debrief", "20", "Teams report predictions vs runs; land the five-worldviews point."],
    ["Buffer", "10", "Questions; spillover."],
], [30 * mm, 18 * mm, PAGE_W - 2 * MARGIN - 48 * mm], small=True))
story.append(Spacer(1, 6))

story.append(Paragraph("Numbers at your fingertips", h2))
story.append(styled_table([
    ["Quantity", "Value"],
    ["Model base case price path (with CDR)", "€148 (2025) · €195 (2030) · €256 (2035) · €336 (2040) · €580 (2050)"],
    ["Cap-only path", "€178 · €234 · €308 · €404 · €696"],
    ["Published anchors it reproduces", "≈€203 (2030), ≈€353 (2040) — PIK/LIMES-EU"],
    ["Key defaults", "cap 1,340 Mt (2025) → 0 in 2040 · bank 1,500 Mt · r 5.6%/yr · φmax 0.81 · CDR floor €70/t · admitted 90 Mt/yr max · haircut 10%"],
    ["CDR at defaults", "0 (2030) → 43 Mt (2040) → 90 Mt/yr (2050); 900 Mt cumulative"],
    ["Removal costs", "BECCS ≈€61–86/t · DACCS ≈€109–155/t (optimistic)"],
    ["Pipeline (mid-2026)", "0.2 Mt/yr operational · 1.4 Mt/yr FID · 5.8 Mt/yr announced · need 68–86 Mt/yr → ≈54×"],
], [55 * mm, PAGE_W - 2 * MARGIN - 55 * mm], small=True))
story.append(Spacer(1, 6))

story.append(Paragraph("Exercise 1 answer key", h2))
for x in [
    "<b>Mapping (step 1):</b> slower LRF → later net-zero year / higher cap "
    "level (price falls); 250 Mt Removals Authority → admitted volume ~25 "
    "Mt/yr from 2031, BUT on top of the cap — model it as extra admitted "
    "volume plus a small cap increase, not as in-cap substitution; MSR "
    "halving → higher effective bank; 2033 credits review → scenario "
    "branch, not a dial.",
    "<b>Expected direction (step 3):</b> every element is price-softening; "
    "the interesting finding is magnitude ordering — the cap/LRF change "
    "dominates, removals matter mostly after 2035, the MSR change is "
    "second-order in this model.",
    "<b>Common error to catch:</b> teams treating the 250 Mt as inside the "
    "cap. Art. 9c lifts the cap by 250 Mt and the Commission buys removals "
    "with the auction revenue — a Removals Authority, not an "
    "emitter-to-supplier market.",
    "<b>Discussion lever if fast:</b> whose worldview is each preset? "
    "Cautious sequencing = the Joule paper's own proposal; aggressive = "
    "parts of industry; no-CDR = several NGOs (~12% of consultation "
    "respondents oppose integration outright).",
]:
    story.append(Paragraph(x, bullet, bulletText="•"))

story.append(Paragraph("Questions you will get", h2))
for q, a in [
    ("“Isn't the EUA price just speculation?”",
     "Speculators trade the path, not the destination: the cumulative cap "
     "pins total supply, and banking connects every year to every other. "
     "Positioning moves prices weeks; the budget moves them decades."),
    ("“Why not just cancel the surplus / tighten the MSR instead?”",
     "Same identity, opposite sign — that IS a cap-side tightening, and the "
     "model prices it. Have a team run it live if the question lands mid-"
     "exercise."),
    ("“Is €580/t in 2050 politically survivable?”",
     "Exactly the right question — that is why the valve exists, and why its "
     "credibility (the 54× pipeline gap) is the load-bearing uncertainty of "
     "the entire endgame. Park it visibly for Module 4."),
]:
    story.append(KeepTogether([
        Paragraph(q, h3),
        Paragraph(a, body_small),
    ]))

# ── Module 2 ────────────────────────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("Module 2 · Why European electricity costs what it costs (11:15–12:45)", h1))
rule(story)
story.append(Paragraph("Timing", h2))
story.append(styled_table([
    ["Block", "Minutes", "What happens"],
    ["Mechanism", "20", "Uniform-price auction; MC formula; draw the staircase on a flipchart (slide 11)."],
    ["The comparison", "20", "Same machine, three fuel bills; decade of history; retail stack (slides 12–14)."],
    ["Exercise 2", "25", "Paper merit order, then the model (slide 15; workbook pp. 6–8)."],
    ["Debrief", "15", "The 30-second CEO answer, three volunteers deliver it."],
    ["Buffer", "10", "Bridge to lunch."],
], [30 * mm, 18 * mm, PAGE_W - 2 * MARGIN - 48 * mm], small=True))
story.append(Spacer(1, 6))

story.append(Paragraph("Numbers at your fingertips", h2))
story.append(styled_table([
    ["Quantity", "Value"],
    ["MC formula", "fuel/η + (EF/η)·CO<sub>2</sub> + O&M — EF gas 0.202, coal 0.34, lignite 0.40 tCO<sub>2</sub>/MWhth"],
    ["The three bills (2025)", "EU CCGT ≈€95 (67.9 fuel + 25.3 carbon + 2) · US CCGT ≈€22 · China coal ≈€36"],
    ["The gap", "≈€73/MWh EU–US ≈ €48 fuel + €25 carbon"],
    ["Gas price-setting share", "≈55–65% of EU hours (JRC 2019–22) with <20% of EU generation"],
    ["TTF vs Henry Hub", "structural 3–5× since 2022 (≈€34 vs €7/MWhth in 2024); LNG wedge ≈$3.3–5.6/MMBtu"],
    ["Crisis pass-through", "2019 gas €14→power €38 · 2022 gas €123→€235 · 2025 gas €38→€89"],
    ["Retail household 2024", "EU-27 28.7 ¢/kWh (49/27/24 split) · DE 39.4 ¢ · US 15.2 ¢ · CN 6.8 ¢ (industry 7.9 — inverse of EU)"],
    ["Grid carbon intensity", "China ≈550–600 gCO<sub>2</sub>/kWh · EU ≈230"],
], [55 * mm, PAGE_W - 2 * MARGIN - 55 * mm], small=True))
story.append(Spacer(1, 6))

story.append(Paragraph("Exercise 2 answer key (paper stage)", h2))
story.append(Paragraph(
    "With the workbook parameter card (gas €38/MWhth, coal €13, lignite €5, "
    "CO<sub>2</sub> €70/t):", body_small))
story.append(styled_table([
    ["Plant", "Computation", "MC €/MWh"],
    ["Nuclear (78 GW)", "fuel + O&M", "≈12"],
    ["Hard coal (38 GW, η 0.42, EF 0.34)", "13/0.42 + (0.34/0.42)·70 + 3", "≈90.6"],
    ["Lignite (28 GW, η 0.40, EF 0.40)", "5/0.40 + (0.40/0.40)·70 + 12", "≈94.5"],
    ["CCGT (145 GW, η 0.56, EF 0.202)", "38/0.56 + (0.202/0.56)·70 + 2", "≈95.1"],
    ["OCGT (45 GW, η 0.38)", "38/0.38 + (0.202/0.38)·70 + 3", "≈140.2"],
], [52 * mm, 70 * mm, PAGE_W - 2 * MARGIN - 122 * mm], small=True))
story.append(Paragraph(
    "Stack at 350 GW demand with 105 GW VRE running: VRE 105 → +nuclear 78 "
    "(183) → +coal 38 (221) → +lignite 28 (249) → +CCGT 145 (394 ≥ 350). "
    "<b>CCGT is marginal; the price is ≈€95/MWh</b> — and note the "
    "coal/lignite/CCGT cluster sits within €5 of each other, which is why "
    "small fuel moves re-order the middle of the stack. August 2022 re-run: "
    "gas 235/0.56 + 25.3 + 2 ≈ <b>€447/MWh</b> for the marginal CCGT alone. "
    "US flip: 11/0.56 + 0 + 2 ≈ <b>€22</b>.", body_small))
story.append(Paragraph(
    "The 30-second CEO answer to listen for: “price is set hour-by-hour by "
    "the last plant needed; that plant is usually gas; our renewables lower "
    "the price when they run but cannot set it; the durable fix is less gas "
    "at the margin.”", body_small))

# ── Module 3 ────────────────────────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("Module 3 · Electrification and the 2040 framework (13:30–15:00)", h1))
rule(story)
story.append(Paragraph("Timing", h2))
story.append(styled_table([
    ["Block", "Minutes", "What happens"],
    ["The target", "15", "46% in context: benchmarks ladder, direct vs indirect, perimeter (slide 17)."],
    ["The model", "20", "Least-cost tranches; €166 vs €55; €45 trigger; the four levers (slides 18–19)."],
    ["The fallacy", "15", "Shrinking denominator; Liebreich's ¾ · 4/5 point (slide 20)."],
    ["Exercise 3", "25", "Iso-target frontier: pick and defend your mix (slide 21; workbook pp. 9–11)."],
    ["Debrief", "15", "Mixes on the flipchart; sales-vs-stock closing point."],
], [30 * mm, 18 * mm, PAGE_W - 2 * MARGIN - 48 * mm], small=True))
story.append(Spacer(1, 6))

story.append(Paragraph("Numbers at your fingertips", h2))
story.append(styled_table([
    ["Quantity", "Value"],
    ["Headline trio", "price-only ≈€166/t · with package ≈€55/t · gap €111/t = shadow value of demand-side policy"],
    ["ETS2 trigger", "€45/t (2020 prices; ≈€55 in 2025 prices); 2026 agreement doubled release volume 20→40 M allowances"],
    ["Physical translation", "46% = +20 pp = ≈1,620 TWh new electricity = ≈870 Mt CO<sub>2</sub>/yr abated"],
    ["Sector delivery (pp, price-only → package)", "buildings 7.3→7.0 · transport 8.8→10.4 · industry 4.0→2.6"],
    ["Published company", "Ariadne price-only 175–350 €/t; PRIMES ETS2-2030 71–261 €/t on companion-policy strength"],
    ["Heat-pump economics", "beats gas boiler when electricity:gas retail ratio <~3, comfortably <~2.5; KPI ≤2.5/≤2 by 2030; only FI & SE below 2 today; NL (1.4) sells ~3× DE/PL/HU (>3)"],
    ["Fallacy anchors", "one boiler + one heat pump = ~23% rate at 50% device share; 46% needs ≈¾ heat pumps + ≈4/5 EV km (other sectors at zero); ~60%/65% with 25% of other fossil switched"],
    ["Sensitivity", "barriers ±25% → price-only 138/199, with package 45/66"],
], [55 * mm, PAGE_W - 2 * MARGIN - 55 * mm], small=True))
story.append(Spacer(1, 6))

story.append(Paragraph("Exercise 3 answer key", h2))
story.append(Paragraph(
    "The workbook's precomputed inversion table (derived from the identity "
    "with COP 3.0, boiler η 0.9, ICE÷EV 3.3, heat 2,500 TWh, cars 1,700 TWh, "
    "total 8,100 TWh):", body_small))
story.append(styled_table([
    ["Heat-pump share", "EV share needed (no other-sector help)", "EV share needed (25% of other fossil switched)"],
    ["50%", ">100% — unreachable on this axis", "≈79%"],
    ["60%", "≈101% — effectively unreachable", "≈63%"],
    ["70%", "≈85%", "≈48%"],
    ["75% (Liebreich)", "≈78%", "≈40%"],
    ["80%", "≈70%", "≈32%"],
    ["90%", "≈54%", "≈16%"],
], [35 * mm, (PAGE_W - 2 * MARGIN - 35 * mm) / 2, (PAGE_W - 2 * MARGIN - 35 * mm) / 2], small=True))
story.append(Paragraph(
    "Debrief moves: (1) most teams pick a mix below the frontier — make the "
    "gap visible, then show how the 'other sectors' slider rescues it; (2) "
    "the fleet-life arithmetic: ~15-year lives mean a 2040 stock target is a "
    "2026 sales target; (3) close on the metric debate — a target can be "
    "right while its metric misleads, and electrification may enter the "
    "target architecture as early as 2027.", body_small))

# ── Module 4 + synthesis ────────────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("Module 4 · Stress tests (15:15–16:15)", h1))
rule(story)
story.append(Paragraph("Timing", h2))
story.append(styled_table([
    ["Block", "Minutes", "What happens"],
    ["Politics priced", "20", "The identity; the ranked bars; free-allocation teaching point (slide 23)."],
    ["Nature stress-tests back", "20", "Wildfire cohort logic; honest denominators; prevention arbitrage (slide 24)."],
    ["Robust vs fragile", "10", "Two-column synthesis (slide 25)."],
    ["Optional debate", "10", "One demand per team; defend or attack in tonnes only — no adjectives."],
], [30 * mm, 18 * mm, PAGE_W - 2 * MARGIN - 48 * mm], small=True))
story.append(Spacer(1, 6))

story.append(Paragraph("Numbers at your fingertips", h2))
story.append(styled_table([
    ["Quantity", "Value"],
    ["Wishlist scenarios (cumulative to 2040)", "Conservative +627 Mt (≈5.7 yrs) · Central +1,294 Mt (≈11.8 yrs; 10.4% of the 2030–50 budget) · Maximalist +2,860 Mt (≈26 yrs)"],
    ["Central breakdown", "LRF +671 · intl credits +280 (70% non-additionality after Cames et al. 2016) · MSR +162 · aviation +151 · free allocation +145 · CDR integrity +63 · earmark −60"],
    ["Wildfire anchors", "2025 record 1.08 Mha (43% in 22 Iberian fires, <2 weeks) · 5-yr mean 658 kha vs 550 kha embedded in projections"],
    ["Default 2040 damage", "47 Mt/yr = 44% of the planned sink improvement (212→317 Mt) = 10% of allowed 2040 net emissions = 1.0 pp of 1990"],
    ["Range across presets", "7 Mt (fires stop worsening) → 221 Mt (hotter fires, slower recovery) — factor ~30"],
    ["Prevention arbitrage", "≈77.5 tCO<sub>2</sub> lifecycle per avoided hectare → ≈€39/t vs €400/t engineered — ~10×; no EU instrument funds it"],
    ["Member-state skew", "Spain's 2030 fire loss ≈169% of its required sink improvement; 4 countries ≈75% of fire, ≈27% of sink obligation"],
    ["Outer bound (no sink at all)", "2050 net zero → absolute zero; €127 bn/yr engineered replacement"],
], [55 * mm, PAGE_W - 2 * MARGIN - 55 * mm], small=True))
story.append(Spacer(1, 6))

story.append(Paragraph("Facilitation notes", h2))
for x in [
    "Keep the wishlist module scrupulously mechanical: the model prices demands, it does not editorialise about the party making them — and say out loud that the wishlist text is a third-party summary (attribution indicative).",
    "The debate rule (“tonnes only, no adjectives”) is the point of the exercise: it forces the identity to do the arguing. Award the best-argued ATTACK and the best-argued DEFENCE.",
    "On wildfires, pre-empt the fatalism failure mode: the module's own arbitrage (€39 vs €400/t) is an agency argument, not a doom argument.",
]:
    story.append(Paragraph(x, bullet, bulletText="•"))

story.append(Paragraph("Synthesis and watchlist (16:15–17:00)", h1))
rule(story)
for x in [
    "Five numbers slide (26): present as a monitoring discipline, not a summary — each anchor pairs a number with the decision it informs.",
    "Watchlist exercise (20 min): each participant picks three of the five plus two organisation-specific indicators, names the source they will check quarterly, then pairs exchange and challenge (“what would make you act on this?”).",
    "Close with the four ideas (slide 27) — attribute each to the module where the room earned it, then the method note and thanks (slide 28).",
    "Collect one-line feedback cards; offer the 90-minute executive replay.",
]:
    story.append(Paragraph(x, bullet, bulletText="•"))

callout(story, "If you are running long",
        "Sacrifice, in order: the Module 4 debate → slide 14 (retail stack; "
        "fold its one killer fact — half the bill never touches wholesale — "
        "into the debrief) → slide 19's table (teach lever 1 only). Never "
        "sacrifice: any exercise's prediction step, the pipeline reality "
        "check (slide 8), or the watchlist.")

doc = make_doc(os.path.abspath(OUT), "The EU Climate Machine — Facilitator guide")
doc.build(story)
print("Wrote", os.path.abspath(OUT))
