// Build the workshop slide deck: "The EU Climate Machine" (~30 slides, 16:9 wide).
const pptxgen = require("pptxgenjs");

const INK = "1A2E35";
const DARK = "0A3540";
const TEAL = "0F4C5C";
const AMBER = "E36414";
const MUTED = "5C6F76";
const FAINT = "E8EEF0";
const PALE = "F4F7F8";
const WHITE = "FFFFFF";
const ICE = "BFD7DE";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.author = "The EU Climate Machine — executive workshop";
pres.title = "The EU Climate Machine";

const W = 13.33, H = 7.5, M = 0.6;

function contentSlide(kicker, title) {
  const s = pres.addSlide();
  s.background = { color: WHITE };
  s.addShape(pres.ShapeType.ellipse, { x: M, y: 0.42, w: 0.12, h: 0.12, fill: { color: AMBER } });
  s.addText(kicker.toUpperCase(), {
    x: M + 0.22, y: 0.3, w: W - 2 * M - 0.22, h: 0.35, margin: 0,
    fontFace: "Calibri", fontSize: 11, bold: true, color: TEAL, charSpacing: 2,
  });
  s.addText(title, {
    x: M, y: 0.62, w: W - 2 * M, h: 0.75, margin: 0,
    fontFace: "Calibri", fontSize: 30, bold: true, color: INK,
  });
  return s;
}

function divider(moduleLabel, title, question, timeLabel) {
  const s = pres.addSlide();
  s.background = { color: DARK };
  s.addShape(pres.ShapeType.ellipse, { x: M, y: 1.35, w: 0.9, h: 0.9, fill: { color: AMBER } });
  s.addText(moduleLabel.split("·")[0].trim().replace("Module ", ""), {
    x: M, y: 1.35, w: 0.9, h: 0.9, align: "center", valign: "middle", margin: 0,
    fontFace: "Calibri", fontSize: 32, bold: true, color: WHITE,
  });
  s.addText(moduleLabel.toUpperCase(), {
    x: M, y: 2.6, w: W - 2 * M, h: 0.4, margin: 0,
    fontFace: "Calibri", fontSize: 13, bold: true, color: AMBER, charSpacing: 3,
  });
  s.addText(title, {
    x: M, y: 3.0, w: W - 2 * M, h: 1.2, margin: 0,
    fontFace: "Calibri", fontSize: 40, bold: true, color: WHITE,
  });
  s.addText(question, {
    x: M, y: 4.35, w: 9.5, h: 1.0, margin: 0,
    fontFace: "Calibri", fontSize: 18, italic: true, color: ICE,
  });
  s.addText(timeLabel, {
    x: M, y: H - 1.0, w: 6, h: 0.4, margin: 0,
    fontFace: "Calibri", fontSize: 12, color: "9DBEC8",
  });
  return s;
}

function bullets(s, items, opts) {
  const o = Object.assign({ x: M, y: 1.6, w: W - 2 * M, h: 4.8, size: 14 }, opts || {});
  s.addText(
    items.map((t, i) => ({
      text: t,
      options: {
        bullet: { code: "2022", indent: 12 }, breakLine: i < items.length - 1,
        paraSpaceAfter: 8, color: INK, fontSize: o.size, fontFace: "Calibri",
      },
    })),
    { x: o.x, y: o.y, w: o.w, h: o.h, valign: "top", margin: 0 }
  );
}

function statTiles(s, tiles, y, h) {
  const n = tiles.length;
  const gap = 0.25;
  const w = (W - 2 * M - gap * (n - 1)) / n;
  tiles.forEach((t, i) => {
    const x = M + i * (w + gap);
    s.addShape(pres.ShapeType.roundRect, {
      x, y, w, h: h || 1.9, fill: { color: FAINT }, rectRadius: 0.08, line: { type: "none" },
    });
    s.addText(t.value, {
      x: x + 0.15, y: y + 0.12, w: w - 0.3, h: 0.55, margin: 0,
      fontFace: "Calibri", fontSize: t.small ? 20 : 26, bold: true, color: t.color || TEAL,
    });
    s.addText(t.label, {
      x: x + 0.15, y: y + 0.72, w: w - 0.3, h: (h || 1.9) - 0.85, margin: 0,
      fontFace: "Calibri", fontSize: 10, color: MUTED, valign: "top",
    });
  });
}

function tableRows(header, rows) {
  const head = header.map((c) => ({
    text: c, options: { bold: true, color: WHITE, fill: { color: TEAL }, fontFace: "Calibri", fontSize: 11 },
  }));
  const body = rows.map((r, i) =>
    r.map((c) => ({
      text: c,
      options: { color: INK, fontFace: "Calibri", fontSize: 11, fill: { color: i % 2 ? PALE : WHITE } },
    }))
  );
  return [head, ...body];
}

function sourceNote(s, text) {
  s.addText(text, {
    x: M, y: H - 0.55, w: W - 2 * M, h: 0.35, margin: 0,
    fontFace: "Calibri", fontSize: 8.5, italic: true, color: MUTED,
  });
}

// ───────────────────────────── 1 · Title ─────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: DARK };
  s.addText("EXECUTIVE WORKSHOP · ONE DAY", {
    x: M, y: 2.1, w: 10, h: 0.4, margin: 0,
    fontFace: "Calibri", fontSize: 14, bold: true, color: AMBER, charSpacing: 3,
  });
  s.addText("The EU Climate Machine", {
    x: M, y: 2.55, w: 12, h: 1.1, margin: 0,
    fontFace: "Calibri", fontSize: 54, bold: true, color: WHITE,
  });
  s.addText(
    "How carbon pricing, electricity markets and the 2040 framework actually work —\ntaught through interactive economic models, not slideware.",
    { x: M, y: 3.8, w: 11.2, h: 1.0, margin: 0, fontFace: "Calibri", fontSize: 18, color: ICE }
  );
  s.addShape(pres.ShapeType.ellipse, { x: W - 1.4, y: H - 1.4, w: 0.5, h: 0.5, fill: { color: AMBER } });
  s.addText("All models are stylised teaching instruments · every number sourced to public EU documents · independently produced", {
    x: M, y: H - 0.9, w: 10.5, h: 0.4, margin: 0, fontFace: "Calibri", fontSize: 10.5, color: "9DBEC8",
  });
  s.addNotes("Welcome. One promise for the day: by 17:00 every participant can explain — and defend with arithmetic — why the ETS price is what it is, who sets the power price, what the 2040 target actually requires, and where the framework is fragile.");
}

// ───────────────────────────── 2 · Agenda ─────────────────────────────
{
  const s = contentSlide("Today", "Four models, one machine");
  const rows = tableRows(
    ["Time", "Session", "The question you leave with an answer to"],
    [
      ["09:00–09:30", "Welcome & framing — the 2026 moment", "Why do mechanisms beat headlines right now?"],
      ["09:30–11:00", "Module 1 · The carbon pricing endgame", "Why is the ETS price not a market mood?"],
      ["11:15–12:45", "Module 2 · Why European electricity costs what it costs", "Who sets the power price, hour by hour?"],
      ["13:30–15:00", "Module 3 · Electrification and the 2040 framework", "What is the shadow value of demand-side policy?"],
      ["15:15–16:15", "Module 4 · Stress tests — politics and nature", "Where does the framework bend, and where does it break?"],
      ["16:15–17:00", "Synthesis — the five numbers to watch to 2030", "What goes on your monitoring list tomorrow?"],
    ]
  );
  s.addTable(rows, {
    x: M, y: 1.7, w: W - 2 * M, colW: [1.7, 5.6, 4.83],
    border: { type: "solid", color: "D8E2E5", pt: 0.5 }, rowH: 0.55, valign: "middle",
  });
  s.addNotes("Every module: 30–40 min taught mechanism, then a hands-on exercise in teams, then debrief. Laptops out for modules 1–3.");
}

// ───────────────────────────── 3 · Framing ─────────────────────────────
{
  const s = contentSlide("Framing · 09:00", "July 2026: the biggest redesign of EU carbon pricing since 2023");
  const rows = tableRows(
    ["What the ETS review package proposes", "Figure"],
    [
      ["Cap decline (linear reduction factor) slowed from today's 4.3%", "3.7% for 2031–35, then 1.7%"],
      ["Permanent carbon removals bought by a new Removals Authority — on top of the cap", "250 Mt over 2031–40"],
      ["International credits re-admitted from 2036 (2033 availability review; fail ⇒ LRF reverts to 2.7%)", "≈260 Mt cumulative"],
      ["Market Stability Reserve intake rate halved", "24% → 12%"],
      ["Industrial Decarbonisation Bank funded from ETS revenue", "€100 bn"],
      ["CBAM free-allocation phase-out slowed and extended", "2034 → 2038"],
      ["Resulting 2040 cap (vs ≈69 Mt under current law)", "≈330 Mt"],
    ]
  );
  s.addTable(rows, {
    x: M, y: 1.7, w: W - 2 * M, colW: [9.13, 3.0],
    border: { type: "solid", color: "D8E2E5", pt: 0.5 }, rowH: 0.5, valign: "middle",
  });
  s.addText("Every claim in this deck traces to a public document: COM(2026) 616, SWD(2026) 616 (958 pp), EUR-Lex, Eurostat, EEA. Headlines argue about ambition; the machine runs on parameters like these.", {
    x: M, y: 6.35, w: W - 2 * M, h: 0.7, margin: 0, fontFace: "Calibri", fontSize: 12, italic: true, color: MUTED,
  });
  s.addNotes("Ask the room: who can name the current LRF? Usually nobody — yet it is the single most consequential number in EU climate policy. That is the gap this day closes. Commission claims 85–87% by 2040 from this package; Climact estimates ~80%. We will be able to adjudicate that by 15:00.");
}

// ───────────────────────────── 4 · M1 divider ─────────────────────────────
divider("Module 1 · 09:30–11:00", "The carbon pricing endgame",
  "“Why is the EU carbon price not a market mood — and what happens to it as the cap goes to zero?”",
  "Model: stylised Hotelling / MACC reconstruction of PIK's LIMES-EU analyses (Joule 2026, Ariadne)")
  .addNotes("Frame: most commentary treats the EUA price like a share price. It is closer to the shadow price of a fixed budget.");

// ───────────────────────────── 5 · Cumulative budget ─────────────────────────────
{
  const s = contentSlide("Module 1 · Mechanism", "The ETS is a cumulative budget, so the price is intertemporal");
  bullets(s, [
    "A shrinking cap plus banking means firms solve an intertemporal problem: hold an allowance if its price will rise faster than your discount rate.",
    "Arbitrage forces the expected price to rise at roughly the discount rate (~5.6%/yr) for as long as the bank is positive — the Hotelling rule.",
    "So the whole path is pinned by ONE number: the starting price P₀ that makes cumulative emissions 2025–2050 exactly exhaust the cumulative cap plus the bank (~1,500 Mt).",
    "Abatement follows a convex marginal-abatement-cost curve that saturates at φmax ≈ 81% of baseline — the last hard-to-abate tonnes get arbitrarily expensive.",
    "Consequence: as the cap approaches zero, a price-only system produces an endgame spike. That spike, not today's price, is what the 2026 redesign is really about.",
  ], { y: 1.7, size: 15 });
  s.addShape(pres.ShapeType.roundRect, { x: M, y: 5.5, w: W - 2 * M, h: 1.0, fill: { color: FAINT }, rectRadius: 0.08, line: { type: "none" } });
  s.addText([
    { text: "The one-line model:  ", options: { bold: true, color: DARK, fontFace: "Calibri", fontSize: 14 } },
    { text: "price(t) = P₀ · (1 + r)^(t−2025), with P₀ solved so that Σ net emissions = Σ cap + bank", options: { fontFace: "Courier New", fontSize: 14, color: INK } },
  ], { x: M + 0.25, y: 5.5, w: W - 2 * M - 0.5, h: 1.0, valign: "middle", margin: 0 });
  s.addNotes("Check understanding: if the Commission tightens the 2035 cap, why does TODAY's price move? Because the cumulative budget shrank — banking transmits the future into the present. This is why announcement days move the EUA price years ahead of implementation.");
}

// ───────────────────────────── 6 · Price path chart ─────────────────────────────
{
  const s = contentSlide("Module 1 · The model runs", "Two futures for the allowance price — with and without a CDR safety valve");
  s.addChart(pres.ChartType.line, [
    { name: "Cap only (no CDR)", labels: ["2025", "2030", "2035", "2040", "2050"], values: [178, 234, 308, 404, 696] },
    { name: "With CDR safety valve", labels: ["2025", "2030", "2035", "2040", "2050"], values: [148, 195, 256, 336, 580] },
  ], {
    x: M, y: 1.6, w: 7.4, h: 4.6,
    chartColors: [MUTED, AMBER], lineSize: 3, lineSmooth: false,
    showLegend: true, legendPos: "b", legendFontSize: 11,
    catAxisLabelColor: MUTED, valAxisLabelColor: MUTED,
    valAxisTitle: "€/tCO2", showValAxisTitle: true, valAxisTitleColor: MUTED, valAxisTitleFontSize: 11,
    valGridLine: { color: "E3EAEC", size: 0.5 }, catGridLine: { style: "none" },
    showTitle: false, dataLabelColor: INK,
  });
  bullets(s, [
    "Base case lands at €195/t in 2030 and €336/t in 2040 — deliberately a few euros below the published anchors it reproduces (€203 / €353, PIK LIMES-EU).",
    "By 2050 allowances barely trade: the price tracks the marginal cost of removals.",
    "Maximum annual relief from the valve: ≈ €117/t, around 2050.",
    "CDR deployed at defaults: 0 in 2030 → 43 Mt in 2040 → 90 Mt/yr in 2050 (900 Mt cumulative).",
  ], { x: 8.3, y: 1.7, w: W - M - 8.3, h: 4.6, size: 12.5 });
  sourceNote(s, "Stylised reduced-form reconstruction of Sultani et al., “Sequencing Carbon Dioxide Removal into the EU ETS”, Joule (2026) and the Ariadne safety-valve dossier — illustrative, not a forecast.");
  s.addNotes("Walk the amber line first. Then the grey. The €117/t wedge at 2050 is the entire policy argument for integrating removals. But hold the scepticism for two slides — the pipeline reality check is coming.");
}

// ───────────────────────────── 7 · Safety valve mechanics ─────────────────────────────
{
  const s = contentSlide("Module 1 · Mechanism", "The safety valve is a three-way minimum, not an open door");
  s.addShape(pres.ShapeType.roundRect, { x: M, y: 1.7, w: W - 2 * M, h: 0.95, fill: { color: FAINT }, rectRadius: 0.08, line: { type: "none" } });
  s.addText([
    { text: "removals(t) = min(  supply at price P,   capacity ramp,   admitted volume  )  ·  (1 − integrity haircut)", options: { fontFace: "Courier New", fontSize: 15, color: INK } },
  ], { x: M + 0.25, y: 1.7, w: W - 2 * M - 0.5, h: 0.95, valign: "middle", margin: 0 });
  const rows = tableRows(
    ["Constraint", "What it represents", "Default"],
    [
      ["Supply curve", "Removals deploy when the allowance price clears their cost (BECCS floor ≈ €70/t; BECCS €61–86, DACCS €109–155)", "qCdr = (P − 70) / slope"],
      ["Capacity ramp", "Physical build-out limit — plants take 3–5 years from FID to operation", "165 Mt/yr ceiling by 2050"],
      ["Admitted volume", "The POLICY lever: how many removal certificates the ETS accepts, docked via the MSR", "0 before 2031, ramp to 90 Mt/yr"],
      ["Integrity haircut", "Discount per certificate for non-permanence / MRV risk", "10%"],
    ]
  );
  s.addTable(rows, { x: M, y: 2.95, w: W - 2 * M, colW: [1.9, 7.53, 2.7], border: { type: "solid", color: "D8E2E5", pt: 0.5 }, rowH: 0.6, valign: "middle" });
  s.addText("The papers' three-stage sequencing: ① prepare & signal (CRCF certification, MRV) → ② limited admission via the MSR → ③ full backstop as the cap reaches zero. The tension: the same removals that contain prices also deter conventional abatement.", {
    x: M, y: 6.15, w: W - 2 * M, h: 0.8, margin: 0, fontFace: "Calibri", fontSize: 12, italic: true, color: MUTED,
  });
  s.addNotes("Emphasise 'admitted volume' as the governable dial — that's what the exercise manipulates. Sudden unlimited opening is what both publications argue AGAINST.");
}

// ───────────────────────────── 8 · Pipeline reality ─────────────────────────────
{
  const s = contentSlide("Module 1 · Reality check", "The pipeline the valve depends on, mid-2026");
  statTiles(s, [
    { value: "0.2 Mt/yr", small: true, label: "Operational novel CDR in Europe today (biochar + DAC pilots + Climeworks Orca/Mammoth)" },
    { value: "1.4 Mt/yr", small: true, label: "With final investment decision: Stockholm Exergi (800 kt BECCS) + Ørsted Kalundborg (430 kt)" },
    { value: "5.8 Mt/yr", small: true, label: "Full announced pipeline including pre-FID projects" },
    { value: "68–86 Mt/yr", small: true, label: "Safety-valve need by 2050 (model / published range)", color: AMBER },
    { value: "≈54×", small: true, label: "Scale-up required from today's FID-backed capacity", color: AMBER },
  ], 1.75, 2.1);
  bullets(s, [
    "A plant takes 3–5 years from FID to operation (Stockholm Exergi: FID 2025 → online 2028). Set the model's availability near today's pipeline and the valve barely bites — the price spikes anyway.",
    "The land sink cannot substitute: it is reversible (a fire releases it) and sits under the separate LULUCF Regulation — it cannot back a tradable allowance.",
    "This is why the 'delayed CDR' preset is the scariest one in the model — and why the 2033 review clause in the real package has teeth.",
  ], { y: 4.25, size: 14 });
  sourceNote(s, "Curated illustrative snapshot, mid-2026; nameplate capacities. LULUCF sink: −198 Mt (2023) vs −310 Mt 2030 target.");
  s.addNotes("The rhetorical pivot of Module 1: the model says the valve works; the pipeline says the valve does not currently exist at scale. Both are true. Policy question: what closes a 54× gap in 24 years? Answer in the real package: a Removals Authority with auction revenue — next slide's exercise probes whether that is credible.");
}

// ───────────────────────────── 9 · Exercise 1 ─────────────────────────────
{
  const s = contentSlide("Module 1 · Exercise · 25 min", "Price the July 2026 package");
  bullets(s, [
    "Teams of 3–4, one laptop per team, model preloaded (workbook page 4 has the parameter map).",
    "Step 1 — Translate: map each element of the real package onto a model dial. Slower LRF → net-zero year & cap; 250 Mt Removals Authority → admitted volume & start year; MSR halving → bank pass-through.",
    "Step 2 — Predict before you run: write down whether the 2030 and 2040 prices rise or fall vs the €195 / €336 base case, and by roughly how much.",
    "Step 3 — Run and reconcile: where were you most wrong? Which dial dominated?",
    "Step 4 — One sentence per team: does the package raise or lower the endgame spike — and who should be nervous about your answer?",
  ], { y: 1.7, size: 15 });
  s.addShape(pres.ShapeType.roundRect, { x: M, y: 5.6, w: W - 2 * M, h: 1.1, fill: { color: DARK }, rectRadius: 0.08, line: { type: "none" } });
  s.addText([
    { text: "Debrief anchor:  ", options: { bold: true, color: AMBER, fontFace: "Calibri", fontSize: 13 } },
    { text: "the five presets (cautious / no-CDR / aggressive / delayed / weak-abatement) are five coherent worldviews, not five parameter sets. Every Brussels position paper you read this autumn is one of them in disguise.", options: { color: WHITE, fontFace: "Calibri", fontSize: 13 } },
  ], { x: M + 0.25, y: 5.6, w: W - 2 * M - 0.5, h: 1.1, valign: "middle", margin: 0 });
  s.addNotes("Facilitator: circulate; the common error is treating the 250 Mt as inside the cap (it is on top, Art. 9c). Teams that catch this get the direction of the price effect right.");
}

// ───────────────────────────── 10 · M2 divider ─────────────────────────────
divider("Module 2 · 11:15–12:45", "Why European electricity costs what it costs",
  "“The same auction mechanism, fed with EU, US or Chinese inputs, produces EU, US or Chinese prices. The gap is an input gap, not a mechanism gap.”",
  "Model: stylised single-node merit-order auction — EU, US and China presets from public fuel, carbon and capacity data")
  .addNotes("Most-requested module in pilots. Promise: after 90 minutes nobody in the room will ever again say 'renewables made power expensive' — or 'the market is broken' — without qualifying it.");

// ───────────────────────────── 11 · Merit order mechanics ─────────────────────────────
{
  const s = contentSlide("Module 2 · Mechanism", "One formula and one sort: the uniform-price auction");
  s.addShape(pres.ShapeType.roundRect, { x: M, y: 1.7, w: W - 2 * M, h: 0.95, fill: { color: FAINT }, rectRadius: 0.08, line: { type: "none" } });
  s.addText([
    { text: "MC = fuel/η  +  (EF/η)·CO₂ price  +  O&M      ", options: { fontFace: "Courier New", fontSize: 15, color: INK } },
    { text: "(€/MWh; stack cheapest-first; the last plant needed sets the price for ALL)", options: { fontFace: "Calibri", fontSize: 12, italic: true, color: MUTED } },
  ], { x: M + 0.25, y: 1.7, w: W - 2 * M - 0.5, h: 0.95, valign: "middle", margin: 0 });
  bullets(s, [
    "Every plant bids ≈ its short-run marginal cost; bids stack cheapest-first; the marginal plant clears the market and every dispatched plant is paid its price.",
    "Deliberate and efficient: dispatch cost is minimised, and the infra-marginal rent is what finances the cheap plants' capital.",
    "The average cost of the fleet is IRRELEVANT to the price. Only the marginal machine matters.",
    "In Europe that machine is a gas plant in ≈55–65% of hours (JRC 2019–2022) — even though gas supplies under 20% of EU electricity.",
    "Wind and solar bid ≈ €0: they can only displace expensive plants (the merit-order effect lowers prices when they run).",
  ], { y: 2.95, size: 15 });
  sourceNote(s, "JRC134300 (2023); ACER 2021–22 high-energy-prices assessment. Stylised teaching tool — not a dispatch simulation.");
  s.addNotes("Draw the staircase on a flipchart as you talk. Quiz: demand rises 10 GW at 3am vs 6pm — why does the price jump differ? Because the STEP of the staircase you land on differs. That intuition is the whole module.");
}

// ───────────────────────────── 12 · Same machine three bills ─────────────────────────────
{
  const s = contentSlide("Module 2 · The decisive comparison", "Same machine, three fuel bills (2025 inputs)");
  const rows = tableRows(
    ["Marginal generator", "Fuel ÷ η", "Carbon", "O&M", "≈ Clearing price"],
    [
      ["CCGT in the EU  (TTF €38/MWhth, ETS €70/t)", "38/0.56 = €67.9", "(0.202/0.56)·70 = €25.3", "€2", "€95/MWh"],
      ["CCGT in the US  (Henry Hub ≈€11, no carbon price)", "11/0.56 = €19.6", "€0", "€2", "€22/MWh"],
      ["Coal unit in China  (coal €13, ETS ≈0 effective)", "13/0.41 = €31.7", "(0.34/0.41)·2 = €1.7", "€3", "€36/MWh"],
    ]
  );
  s.addTable(rows, { x: M, y: 1.75, w: W - 2 * M, colW: [4.9, 2.5, 2.83, 0.9, 1.0 + 0.0 ], border: { type: "solid", color: "D8E2E5", pt: 0.5 }, rowH: 0.62, valign: "middle" });
  statTiles(s, [
    { value: "≈€73/MWh", label: "EU–US gap at the marginal generator", color: AMBER },
    { value: "≈€48", label: "…of which fuel: the LNG wedge — liquefaction + shipping + regas + Asian JKM competition for the marginal cargo" },
    { value: "≈€25", label: "…of which carbon: the deliberately internalised externality (US: none; China: intensity-based, ≈free at the margin)" },
  ], 4.35, 2.0);
  s.addText("One part geology and logistics, one part deliberate policy. Neither part is “the market is broken.”", {
    x: M, y: 6.5, w: W - 2 * M, h: 0.4, margin: 0, fontFace: "Calibri", fontSize: 13, italic: true, color: MUTED,
  });
  s.addNotes("This is the slide participants photograph. TTF settles at a structural 3–5× Henry Hub (≈€34 vs €7 in 2024). Divided by η≈0.56, the fuel term alone separates EU and US power by €50–60/MWh before carbon enters.");
}

// ───────────────────────────── 13 · History chart ─────────────────────────────
{
  const s = contentSlide("Module 2 · The evidence", "A decade of wholesale prices — the mechanism never changed, the inputs did");
  const years = ["2015","2016","2017","2018","2019","2020","2021","2022","2023","2024","2025"];
  s.addChart(pres.ChartType.line, [
    { name: "EU (German day-ahead)", labels: years, values: [31.6,29.0,34.2,44.5,37.7,30.5,96.8,235.4,95.2,78.5,89.3] },
    { name: "US (major hubs avg)", labels: years, values: [30,24,27,30,24,19,34,59,28,33,36] },
    { name: "China (administered)", labels: years, values: [47,46,47,47,46,45,50,60,58,53,48] },
  ], {
    x: M, y: 1.6, w: 7.6, h: 4.7,
    chartColors: [AMBER, TEAL, "8A9BA3"], lineSize: 2.5, lineSmooth: false,
    showLegend: true, legendPos: "b", legendFontSize: 11,
    catAxisLabelColor: MUTED, valAxisLabelColor: MUTED,
    valAxisTitle: "€/MWh, annual average", showValAxisTitle: true, valAxisTitleColor: MUTED, valAxisTitleFontSize: 11,
    valGridLine: { color: "E3EAEC", size: 0.5 }, catGridLine: { style: "none" },
    showTitle: false,
  });
  bullets(s, [
    "2019: gas €14/MWhth → power ≈€38. 2022: gas €123 → power ≈€235. 2025: gas €38 → power ≈€89. The pass-through check is just fuel ÷ 0.56 + carbon.",
    "The 2021–22 paradox resolved: wind, solar, nuclear and hydro costs were unchanged — the marginal molecule repriced 8-fold.",
    "China's line is flat because it is administered: a coal benchmark ±20%, households cross-subsidised below cost, and a meter price that omits a 550–600 gCO₂/kWh grid (EU: ≈230).",
  ], { x: 8.4, y: 1.7, w: W - M - 8.4, h: 4.8, size: 12 });
  sourceNote(s, "SMARD/EPEX; EIA (0.924 €/$); NDRC schedules (0.128 €/CNY). Order-of-magnitude reconstructions — re-verify against primary sources before external use.");
  s.addNotes("Point at 2022 and ask what changed. Not the mechanism, not renewables — the marginal fuel. Then point at China's flat line: cheap by administration, not by auction, with the externality left off the meter.");
}

// ───────────────────────────── 14 · Retail stack ─────────────────────────────
{
  const s = contentSlide("Module 2 · The other half of the bill", "Half the EU bill never touches the wholesale market");
  s.addChart(pres.ChartType.bar, [
    { name: "Energy", labels: ["EU-27 household", "Germany", "United States", "China"], values: [49, 50, 55, 60] },
    { name: "Network", labels: ["EU-27 household", "Germany", "United States", "China"], values: [27, 28, 40, 35] },
    { name: "Taxes & levies", labels: ["EU-27 household", "Germany", "United States", "China"], values: [24, 22, 5, 5] },
  ], {
    x: M, y: 1.6, w: 7.2, h: 4.6, barGrouping: "stacked", barDir: "bar",
    chartColors: [TEAL, "8FB3BC", AMBER],
    showLegend: true, legendPos: "b", legendFontSize: 11,
    catAxisLabelColor: MUTED, valAxisLabelColor: MUTED, valAxisMaxVal: 100,
    valGridLine: { color: "E3EAEC", size: 0.5 }, catGridLine: { style: "none" },
    showTitle: false, showValue: true, dataLabelPosition: "ctr", dataLabelColor: WHITE, dataLabelFontSize: 9,
  });
  bullets(s, [
    "Retail 2024, all taxes in (household): EU-27 28.7 ¢/kWh · Germany 39.4 ¢ · US 15.2 ¢ · China 6.8 ¢.",
    "US taxes are typically <5% of the bill, and half the country passes through AVERAGE (not marginal) generation cost via regulated utilities.",
    "China charges industry MORE than households (7.9 vs 6.8 ¢) — the inverse of the EU — an explicit cross-subsidy.",
    "Renewables' costs sit here, not in wholesale: grid capex in network tariffs, legacy support in levies, balancing and backup.",
    "ACER and Draghi converge: the fix is less gas at the margin — clean firm capacity, storage, demand response, interconnection — plus retail and fiscal reform. Not abandoning marginal pricing.",
  ], { x: 8.0, y: 1.7, w: W - M - 8.0, h: 5.0, size: 12 });
  sourceNote(s, "Eurostat nrg_pc_204/205 (H2 2024); EIA 2024; NDRC. Bill shares in % of final household price.");
  s.addNotes("Bridge to lunch: everything so far was diagnosis. This afternoon is prescription — module 3 asks what actually decarbonises demand, and module 4 stress-tests the whole frame.");
}

// ───────────────────────────── 15 · Exercise 2 ─────────────────────────────
{
  const s = contentSlide("Module 2 · Exercise · 25 min", "Build the merit order, then break it");
  bullets(s, [
    "On paper first (workbook pages 6–7): compute MC for five plants — nuclear, lignite, hard coal, CCGT, OCGT — from the parameter card (fuel, η, EF, O&M, CO₂ = €70/t).",
    "Stack them, draw the staircase, and clear the market at 350 GW demand with 105 GW of wind and solar running. Who is marginal? What is the price?",
    "Now re-run August 2022: gas at €235/MWhth, nuclear derated. What clears, and at what price?",
    "Then the model: flip the SAME stack to US inputs (gas ≈11, carbon 0). Watch the clearing price fall to ≈€22 — no European plant got cheaper.",
    "Debrief question: your CEO asks why a 70%-renewable grid still prices at gas. You have 30 seconds and one staircase drawing.",
  ], { y: 1.7, size: 15 });
  s.addShape(pres.ShapeType.roundRect, { x: M, y: 5.85, w: W - 2 * M, h: 0.9, fill: { color: DARK }, rectRadius: 0.08, line: { type: "none" } });
  s.addText([
    { text: "Answer key logic:  ", options: { bold: true, color: AMBER, fontFace: "Calibri", fontSize: 13 } },
    { text: "the price reflects the marginal HOUR, and storage/interconnection/clean-firm shift which machine is marginal — that is where the policy leverage lives.", options: { color: WHITE, fontFace: "Calibri", fontSize: 13 } },
  ], { x: M + 0.25, y: 5.85, w: W - 2 * M - 0.5, h: 0.9, valign: "middle", margin: 0 });
  s.addNotes("Numbers for facilitator: EU 2025 defaults clear at ≈€95 with CCGT marginal. Aug 2022: marginal CCGT alone >€450/MWh. US preset ≈€24, China ≈€36.");
}

// ───────────────────────────── 16 · M3 divider ─────────────────────────────
divider("Module 3 · 13:30–15:00", "Electrification and the 2040 framework",
  "“What carbon price reaches 46% electrification by 2040 on price alone — and what does that number stop being true with?”",
  "Model: least-cost tranche model in numerical parity with the Secretariat-style Python reference; final-energy identity after Liebreich (2026)")
  .addNotes("The quantitative heart of the day. One number to plant: €111/t — the shadow value of demand-side policy.");

// ───────────────────────────── 17 · The 46% target ─────────────────────────────
{
  const s = contentSlide("Module 3 · The target", "46% by 2040: the conservative anchor, not a stretch");
  s.addChart(pres.ChartType.bar, [
    { name: "Electricity share of final energy, 2040 (%)",
      labels: ["Today (stalled since 2005)", "Action Plan target", "EC Impact Assessment", "CLEVER / REMIND (PIK)", "ESABCC advice", "SP90 (Strategic Perspectives)", "PAC 2.0 (CAN Europe)", "Technical ceiling (Eurelectric)"],
      values: [23, 46, 48.5, 51, 52, 57, 70, 60] },
  ], {
    x: M, y: 1.6, w: 7.4, h: 4.8, barDir: "bar",
    chartColors: [TEAL], showLegend: false,
    catAxisLabelColor: MUTED, catAxisLabelFontSize: 10, valAxisLabelColor: MUTED,
    valGridLine: { color: "E3EAEC", size: 0.5 }, catGridLine: { style: "none" },
    showTitle: false, showValue: true, dataLabelPosition: "outEnd", dataLabelColor: INK, dataLabelFontSize: 10,
  });
  bullets(s, [
    "COM(2026) 595 (17 July 2026): indicative 46% electricity share of final energy by 2040 — roughly double today's ~23%, to be enshrined in the post-2030 Energy Union package (Q4 2026).",
    "46% is DIRECT electrification only; hydrogen and e-fuels add ~10–20 points on top → ~55–70% electron-derived.",
    "The Commission pitched the target at the very bottom of what its own models produce; ESABCC advice sits at 50–54%.",
    "It still uses ~¾ of the realistic headroom above today — and the historic share has been flat at 21–23% since 2005.",
    "Watch the perimeter: aviation/shipping and feedstocks in or out of the denominator moves the share 5–15 points. Much of '46 vs 50' is definitional.",
  ], { x: 8.3, y: 1.7, w: W - M - 8.3, h: 5.0, size: 11.5 });
  sourceNote(s, "COM(2026) 595; Eurelectric Decarbonisation Pathways; ESABCC 2040 advice; Eurostat.");
  s.addNotes("Claimed prize: ~€260 bn/yr less fossil imports by 2040. Also flag data centres/AI (+100–300 TWh by 2040): demand growth inflates the ratio without decarbonising anything.");
}

// ───────────────────────────── 18 · The LCM ─────────────────────────────
{
  const s = contentSlide("Module 3 · The model", "Price-only €166/t · with the package €55/t · the €111/t gap is the point");
  statTiles(s, [
    { value: "€166/t", label: "Carbon price to reach 46% on price alone (uniform ETS1+ETS2 price, least-cost tranches)" },
    { value: "€55/t", label: "Carbon price with the demand-side package — standards, subsidies and price reform shrink the non-price barriers" },
    { value: "€111/t", label: "The gap: the shadow value of demand-side policy", color: AMBER },
    { value: "3.7×", label: "Price-only vs the €45/t ETS2 stability trigger — the mechanism fires long before price could do the work", color: AMBER },
  ], 1.7, 2.05);
  bullets(s, [
    "Mechanism: each sector's adoption tranches are ordered by barrier-adjusted switching cost (base + spread·f^γ); a price P electrifies every tranche below P; the package shrinks the spread and shifts the base.",
    "Reaching 46% = +20 pp = ≈1,620 TWh of new electricity and ≈870 Mt CO₂/yr abated.",
    "'Price-only is foreclosed' is institutional, not rhetorical: ETS2 releases extra allowances above €45/t — and the 2026 agreement DOUBLED that release volume (20 → 40 million). The architecture assumes flanking measures by design.",
    "Published company: Ariadne/PIK price-only estimates for these sectors run 175–350 €/t; PRIMES puts ETS2 2030 at 71–261 €/t depending purely on companion-policy strength.",
  ], { y: 4.05, size: 13 });
  sourceNote(s, "Single-snapshot 2040 LP built for this question — treat the gap and the ordering as robust, absolute price levels as indicative.");
  s.addNotes("The ordering to burn in: price-only (€166) ≫ ETS2 trigger (€45) ≫ price-with-measures (€55). Sector shift under the package: transport delivers more (8.8→10.4 pp), industry less (4.0→2.6) — vehicle standards are cheap per tonne, industrial CCfDs are not.");
}

// ───────────────────────────── 19 · The measures ─────────────────────────────
{
  const s = contentSlide("Module 3 · The package", "Four demand-side levers, ranked by barrier removed per euro");
  const rows = tableRows(
    ["Lever", "The mechanism", "The evidence"],
    [
      ["1 · Electricity-price reform (cheapest lever)", "A heat pump (SPF≈3) beats a gas boiler on running cost only when the electricity-to-gas retail ratio is below ~3, comfortably below ~2.5. Pillar 1 KPI: ratio ≤2.5 households / ≤2 industry by 2030.", "NL (ratio ~1.4) sells ~3× the heat pumps per 1,000 households of DE/PL/HU (ratio >3). Only FI & SE are below 2 today. (JRC144191)"],
      ["2 · Buildings standards + funding", "EPBD 2024/1275: no incentives for stand-alone fossil boilers from 2025, phase-out ~2040; Social Climate Fund €65–87 bn 2026–32.", "Warning: 2024 EU heat-pump sales fell ~22% (DE −48%) despite mandates — subsidy instability and cheap gas dominated."],
      ["3 · Vehicle standards", "Reg. 2023/851: −55% cars by 2030, 100% zero-emission 2035; AFIR charging floors.", "Fuel-price elasticity ≈ −0.02 to −0.34: a fuel tax cuts car CO₂ by ~1–3%. Standards, not price, are the operative lever."],
      ["4 · Industrial CCfDs + grids", "15-year contracts-for-difference de-risk electrification; the binding constraint is grid access (€584 bn this decade).", "Germany's Round 1: €2.8 bn, 15 projects, ~17 Mt over 15 yrs. >3,000 GW stuck in EU connection queues (IEA)."],
    ]
  );
  rows.forEach((r) => r.forEach((c) => { c.options.fontSize = 10; }));
  s.addTable(rows, { x: M, y: 1.62, w: W - 2 * M, colW: [2.4, 5.4, 4.33], border: { type: "solid", color: "D8E2E5", pt: 0.5 }, rowH: 0.88, valign: "middle" });
  s.addText("The economics: a single carbon price is first-best only if carbon is the ONLY market failure. Split incentives, slow stock turnover, credit constraints and near-zero price elasticity are independent failures — Tinbergen: one instrument per failure.", {
    x: M, y: 6.35, w: W - 2 * M, h: 0.6, margin: 0, fontFace: "Calibri", fontSize: 11.5, italic: true, color: MUTED, valign: "top",
  });
  s.addNotes("If time is short, teach lever 1 only — it is the cheapest and least known. In most member states electricity is taxed MORE than gas; that is the single dumbest ratio in EU energy policy and fixing it is Pillar 1 of the Action Plan.");
}

// ───────────────────────────── 20 · Final-energy fallacy ─────────────────────────────
{
  const s = contentSlide("Module 3 · The metric trap", "The final-energy fallacy: the denominator shrinks as you succeed");
  bullets(s, [
    "Electric devices need ~3× less input energy for the same service — so every fossil→electric switch deletes 2–3 kWh of fossil final energy per kWh of electricity added.",
    "A country of one gas boiler and one heat pump delivering the SAME heat has an electrification rate of ~23–25% — from a 50% device share. The share metric lags device adoption badly.",
    "Liebreich (July 2026): hitting 46% with no help from other sectors needs ≈¾ of building heat on heat pumps (13% today) and ≈4 in 5 car-km electric — near-all-electric sales starting now, while the 2035 ICE ban is being reopened.",
    "With a quarter of other fossil use switched, ~60% heat pumps and ~65% EVs suffice — other sectors buy slack.",
    "At the 46% point, EU final energy is ~26% BELOW today with identical heat and mobility. Success looks like shrinking, which most dashboards read as failure.",
  ], { y: 1.7, size: 14.5 });
  s.addShape(pres.ShapeType.roundRect, { x: M, y: 5.55, w: W - 2 * M, h: 1.05, fill: { color: FAINT }, rectRadius: 0.08, line: { type: "none" } });
  s.addText([
    { text: "The identity:  ", options: { bold: true, color: DARK, fontFace: "Calibri", fontSize: 13 } },
    { text: "rate = electric input ÷ (electric + fossil input); toy case = (1/COP) ÷ (1/COP + 1/η) ≈ 23% at COP 3, η 0.9. Exact closed-form iso-target inversions exist — that is Exercise 3.", options: { fontFace: "Calibri", fontSize: 13, color: INK } },
  ], { x: M + 0.25, y: 5.55, w: W - 2 * M - 0.5, h: 1.05, valign: "middle", margin: 0 });
  sourceNote(s, "Device-stock identity (no optimisation) after Liebreich via Euractiv, July 2026. Commission officials split on the metric; electrification may enter the target architecture as early as 2027.");
  s.addNotes("This is a metric critique, not a target critique: the target may be right and the METRIC still misleading. One Commission official: 'further work until the end of this year in terms of analytical basis'. Bruce Douglas' counter: 'best metric we have'.");
}

// ───────────────────────────── 21 · Exercise 3 ─────────────────────────────
{
  const s = contentSlide("Module 3 · Exercise · 25 min", "Pick your mix on the iso-target frontier");
  bullets(s, [
    "The model plots heat-pump share (x) × EV share (y) with the 46% frontier; everything above-right of the curve meets the target. Marked: today (13, 4) and Liebreich's point (75, 80).",
    "Task 1 — Your organisation's world: choose the (heat pump, EV, other-sectors) mix you believe is deliverable by 2040. Read off whether it clears the frontier.",
    "Task 2 — Use the closed-form inversion (workbook page 10) to compute the EV share your heat-pump assumption REQUIRES. Results over 100% mean: unreachable on this axis alone.",
    "Task 3 — Defend your mix in one flipchart line: which single policy from the morning's package does it lean on hardest?",
    "Watch for: teams discovering that modest 'other sectors' help (25% switched) moves the required mix from ¾·⅘ down to ~60%·65% — perimeter and slack matter more than heroism on any one axis.",
  ], { y: 1.7, size: 14.5 });
  s.addShape(pres.ShapeType.roundRect, { x: M, y: 5.85, w: W - 2 * M, h: 0.9, fill: { color: DARK }, rectRadius: 0.08, line: { type: "none" } });
  s.addText([
    { text: "Debrief anchor:  ", options: { bold: true, color: AMBER, fontFace: "Calibri", fontSize: 13 } },
    { text: "with ~15-year fleet lives, a 2040 stock target is a 2026 sales target. Every year of delay moves the frontier out of reach.", options: { color: WHITE, fontFace: "Calibri", fontSize: 13 } },
  ], { x: M + 0.25, y: 5.85, w: W - 2 * M - 0.5, h: 0.9, valign: "middle", margin: 0 });
  s.addNotes("Defaults for facilitator: hp 13%, ev 4%, COP 3.0, boiler η 0.9, ICE÷EV = 3.3, heat 2,500 TWh, cars 1,700 TWh, total 8,100 TWh.");
}

// ───────────────────────────── 22 · M4 divider ─────────────────────────────
divider("Module 4 · 15:15–16:15", "Stress tests: politics and nature",
  "“Two deliberate attacks on the framework — what ten softening demands cost in tonnes, and what fire does to the sink the targets lean on.”",
  "Models: reduced-form ETS accounting (wishlist) · wildfire cohort model on Copernicus EFFIS data")
  .addNotes("Change of register: modules 1–3 explained the machine working. Module 4 asks what breaks it — from inside (politics) and outside (climate impacts themselves).");

// ───────────────────────────── 23 · Wishlist ─────────────────────────────
{
  const s = contentSlide("Module 4a · Politics priced", "Ten softening demands, one accounting identity");
  s.addChart(pres.ChartType.bar, [
    { name: "Cumulative to 2040, Mt CO₂e (central reading)",
      labels: ["Slower cap decline (LRF)", "International credits", "MSR weakening", "Extra-EU aviation carve-out", "Free-allocation demands (4)", "Removal-credit integrity gap"],
      values: [671, 280, 162, 151, 145, 63] },
  ], {
    x: M, y: 1.6, w: 7.4, h: 4.7, barDir: "bar",
    chartColors: [AMBER], showLegend: false,
    catAxisLabelColor: MUTED, catAxisLabelFontSize: 10, valAxisLabelColor: MUTED,
    valGridLine: { color: "E3EAEC", size: 0.5 }, catGridLine: { style: "none" },
    showTitle: false, showValue: true, dataLabelPosition: "outEnd", dataLabelColor: INK, dataLabelFontSize: 10,
  });
  s.addText("Not charted: the one helpful demand — earmarking ETS revenue for clean investment — offsets ≈ −60 Mt (4.6% of the damage).", {
    x: M, y: 6.35, w: 7.4, h: 0.5, margin: 0, fontFace: "Calibri", fontSize: 10.5, italic: true, color: MUTED, valign: "top",
  });
  bullets(s, [
    "The identity: under a binding banked cap, cumulative emissions ≈ cumulative cap − final bank. Demands that move the CAP or add fungible supply are the big levers.",
    "Central reading: +1,294 Mt cumulative to 2040 ≈ 11.8 years of the EU's recent annual net cut, undone ≈ 10.4% of the ESABCC-advised 2030–2050 budget.",
    "Free allocation is politically loud but carbonically small (+145 Mt, ~11%): inside a fixed cap it is mostly a rent transfer.",
    "Aviation is the exception: extra-EU flights sit OUTSIDE the cap — keeping them out is genuine, uncapped forgone mitigation.",
    "Spread across readings: 627 → 2,860 Mt (×4.6). That spread is why this ships as scenarios, not a number.",
  ], { x: 8.3, y: 1.7, w: W - M - 8.3, h: 5.0, size: 11.5 });
  sourceNote(s, "Stylised reduced-form accounting — not a market model. Wishlist text is a third-party summary of an EPP position; attribution indicative. Credit additionality default after Cames et al. (2016).");
  s.addNotes("Teaching point: the identity sorts lobbying by what actually bites. LRF (+671) > intl credits (+280, at 70% non-additionality) > MSR > aviation > ALL free-allocation asks combined. The one helpful demand — revenue earmarking — offsets 4.6% of the damage.");
}

// ───────────────────────────── 24 · Wildfires ─────────────────────────────
{
  const s = contentSlide("Module 4b · Nature stress-tests back", "Wildfires eat the land sink the 2040 target quietly depends on");
  statTiles(s, [
    { value: "1.08 Mha", label: "2025 burnt area, EU-27 — all-time EFFIS record; 43% of it in 22 Iberian fires in under two weeks" },
    { value: "47 Mt/yr", label: "Sink loss in 2040 at the default 5%/yr growth dial (cohort model: combustion + decomposition + foregone growth)", color: AMBER },
    { value: "44%", label: "…of the ENTIRE planned sink improvement (212 → 317 Mt) taken back by fire", color: AMBER },
    { value: "≈€39/t", label: "Cost of an avoided hectare via prevention — ~10× cheaper than €400/t engineered removals. No EU instrument funds it." },
  ], 1.7, 2.15);
  bullets(s, [
    "The target is NET: sink shortfall converts one-for-one into deeper gross cuts for every other sector. Not a metaphor — subtraction.",
    "Choose an honest denominator: the same 47 Mt is '1.0 pp of the 1990 baseline' (sounds like rounding) or '44% of the planned sink improvement' (sounds like a crisis). Both are true; pick consciously.",
    "Even if fire stops getting worse (0%/yr), the five-year mean already sits above what projections assume — fire only has to STAY where it is to be a problem.",
    "Spain's 2030 fire loss ≈169% of its entire required sink improvement; four countries hold ~75% of the fire and ~27% of the sink obligation.",
  ], { y: 4.15, size: 13 });
  sourceNote(s, "Copernicus EFFIS 2021–25; cohort model, beta — illustrative arithmetic only, not an official position, not citable as a quantitative finding.");
  s.addNotes("The spread is the honest headline: 7 Mt (fires stop worsening) to 221 Mt (hotter fires, slower recovery) — a factor of 30. And the outer bound: with NO land sink, net zero in 2050 is not net zero, it is absolute zero — €127 bn/yr of engineered replacement.");
}

// ───────────────────────────── 25 · Robust vs fragile ─────────────────────────────
{
  const s = contentSlide("Module 4 · Synthesis", "Where the framework is robust — and where it is fragile");
  const colW = (W - 2 * M - 0.3) / 2;
  s.addShape(pres.ShapeType.roundRect, { x: M, y: 1.7, w: colW, h: 4.9, fill: { color: FAINT }, rectRadius: 0.08, line: { type: "none" } });
  s.addShape(pres.ShapeType.roundRect, { x: M + colW + 0.3, y: 1.7, w: colW, h: 4.9, fill: { color: "FBEEE4" }, rectRadius: 0.08, line: { type: "none" } });
  s.addText("ROBUST (survives any reasonable parameters)", { x: M + 0.25, y: 1.9, w: colW - 0.5, h: 0.4, margin: 0, fontFace: "Calibri", fontSize: 13, bold: true, color: TEAL });
  s.addText([
    "The cap-and-bank identity: supply-side softening = extra cumulative tonnes, arithmetically.",
    "Marginal pricing: the last unit sets the price — in power markets and in abatement alike.",
    "The ordering €166 ≫ €45 ≫ €55: price-only electrification is institutionally foreclosed.",
    "Free allocation inside a fixed cap is mostly a rent transfer, not extra emissions.",
  ].map((t, i, a) => ({ text: t, options: { bullet: { code: "2022", indent: 12 }, breakLine: i < a.length - 1, paraSpaceAfter: 10, color: INK, fontSize: 13, fontFace: "Calibri" } })),
    { x: M + 0.25, y: 2.4, w: colW - 0.5, h: 4.0, valign: "top", margin: 0 });
  s.addText("FRAGILE (load-bearing and uncertain)", { x: M + colW + 0.55, y: 1.9, w: colW - 0.5, h: 0.4, margin: 0, fontFace: "Calibri", fontSize: 13, bold: true, color: AMBER });
  s.addText([
    "The CDR pipeline: a 54× scale-up stands between the model's safety valve and reality; DACCS never turns competitive in the IA's own window.",
    "The land sink: reversible by weather, already 100+ Mt below its 2030 target path, and outside the ETS's control entirely.",
    "The 46% metric: perimeter choices move it 5–15 points; the denominator shrinks as you succeed.",
    "International credits: at CDM-era additionality rates, 260 Mt of credits ≈ 180+ Mt of extra emissions. The 2033 review is the safeguard — watch it.",
  ].map((t, i, a) => ({ text: t, options: { bullet: { code: "2022", indent: 12 }, breakLine: i < a.length - 1, paraSpaceAfter: 10, color: INK, fontSize: 13, fontFace: "Calibri" } })),
    { x: M + colW + 0.55, y: 2.4, w: colW - 0.5, h: 4.0, valign: "top", margin: 0 });
  s.addNotes("Optional 15-min debate exercise if running ahead: assign each team one wishlist demand; defend or attack it USING ONLY the accounting identity. Rule: no adjectives, only tonnes.");
}

// ───────────────────────────── 26 · Five numbers ─────────────────────────────
{
  const s = contentSlide("Synthesis · 16:15", "The five numbers to watch to 2030");
  const rows = tableRows(
    ["#", "Watch this", "Against this anchor", "It tells you"],
    [
      ["1", "The EUA price path", "€195/t by 2030 (model base case; published anchor €203)", "Whether the market believes the cap — a price far below says traders expect softening"],
      ["2", "Electricity-to-gas retail price ratio, per MS", "Action Plan KPI: ≤2.5 households / ≤2 industry by 2030", "Whether heat-pump economics work — the cheapest lever in the whole package"],
      ["3", "FID-backed CDR pipeline (Mt/yr)", "Needs ~48 Mt/yr by 2040; today 1.4", "Whether the removals pillar of the 2040 target is real"],
      ["4", "LULUCF sink outturn", "310 Mt by 2030 (2024 estimate: 212)", "Whether the NET in net-zero is holding — and what fire is doing to it"],
      ["5", "The 2033 international-credit review", "Fail ⇒ 2036–40 LRF reverts from 1.7% to 2.7%", "Whether ~260 Mt of credits enter — the single biggest contingency in the package"],
    ]
  );
  s.addTable(rows, { x: M, y: 1.7, w: W - 2 * M, colW: [0.5, 3.4, 4.13, 4.1], border: { type: "solid", color: "D8E2E5", pt: 0.5 }, rowH: 0.85, valign: "middle" });
  s.addNotes("Closing exercise (20 min): each participant writes a personal watchlist — which three of these five, plus two organisation-specific indicators, with the source they will check quarterly. Pairs exchange and challenge.");
}

// ───────────────────────────── 27 · Four threads ─────────────────────────────
{
  const s = contentSlide("Synthesis", "Four ideas you now own");
  const items = [
    ["The last unit sets the price.", "The marginal gas plant prices every MWh; the marginal abatement tranche sets the required carbon price. Same economics, two domains — and most public confusion about both markets is average-cost thinking."],
    ["Choose an honest denominator.", "47 Mt of fire loss is 1.0 pp of 1990 — or 44% of the planned sink improvement. Retail bills are half non-wholesale. Framing is a choice; make yours consciously and spot others' instantly."],
    ["Price alone is foreclosed.", "€166/t would do it; the system releases allowances at €45/t. The architecture ASSUMES flanking policy. Anyone arguing 'just let the carbon price work' is arguing with the Directive, not with economists."],
    ["Net targets lean on a reversible sink.", "Every tonne the land fails to absorb is a tonne someone else must cut. The cheapest hedge (~€39/t prevention) is currently funded by no EU instrument."],
  ];
  items.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cw = (W - 2 * M - 0.3) / 2;
    const x = M + col * (cw + 0.3), y = 1.7 + row * 2.55;
    s.addShape(pres.ShapeType.roundRect, { x, y, w: cw, h: 2.35, fill: { color: i % 2 ? PALE : FAINT }, rectRadius: 0.08, line: { type: "none" } });
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.22, y: y + 0.24, w: 0.42, h: 0.42, fill: { color: AMBER } });
    s.addText(String(i + 1), { x: x + 0.22, y: y + 0.24, w: 0.42, h: 0.42, align: "center", valign: "middle", margin: 0, fontFace: "Calibri", fontSize: 16, bold: true, color: WHITE });
    s.addText(it[0], { x: x + 0.8, y: y + 0.2, w: cw - 1.0, h: 0.5, margin: 0, fontFace: "Calibri", fontSize: 14.5, bold: true, color: DARK });
    s.addText(it[1], { x: x + 0.8, y: y + 0.7, w: cw - 1.05, h: 1.55, margin: 0, fontFace: "Calibri", fontSize: 11, color: INK, valign: "top" });
  });
  s.addNotes("Land each thread with the module it came from. These four are the durable take-home; the numbers will age, the reasoning patterns will not.");
}

// ───────────────────────────── 28 · Close ─────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: DARK };
  s.addText("Thank you", { x: M, y: 2.3, w: 10, h: 0.9, margin: 0, fontFace: "Calibri", fontSize: 44, bold: true, color: WHITE });
  s.addText("Your workbook holds every exercise, the formula sheet and the annotated source list.\nMaterials are refreshed after every major EU policy event.", {
    x: M, y: 3.4, w: 10.5, h: 0.9, margin: 0, fontFace: "Calibri", fontSize: 16, color: ICE,
  });
  s.addText("Method note — all models used today are stylised teaching instruments reproducing the logic and order of magnitude of published analyses (PIK/LIMES-EU, JRC, PRIMES, Copernicus EFFIS, Commission impact assessments). They are built for insight, not citation. Sources: COM(2026) 595/616, SWD(2026) 616, EUR-Lex, Eurostat, EEA, IEA, ACER. This workshop is independently produced and is not affiliated with, or endorsed by, any EU institution or advisory body.", {
    x: M, y: 5.2, w: W - 2 * M, h: 1.4, margin: 0, fontFace: "Calibri", fontSize: 10.5, color: "9DBEC8",
  });
  s.addShape(pres.ShapeType.ellipse, { x: W - 1.4, y: H - 1.4, w: 0.5, h: 0.5, fill: { color: AMBER } });
  s.addNotes("Collect the one-line feedback cards. Offer the 90-minute executive replay for leadership teams.");
}

const OUT = __dirname + "/../materials/workshop-slides.pptx";
pres.writeFile({ fileName: OUT }).then(() => console.log("Wrote", OUT));
