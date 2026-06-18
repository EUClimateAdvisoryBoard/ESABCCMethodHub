# Member-state policy monitoring & best-practice identification

*Methodology note — National Level Climate Policies beta module (Module 20).
An update to the Policy Gap report's monitoring of Member State implementation.*

This note covers two related deliverables:

- **Part A — EU policy → national implementation tracker** (the primary
  deliverable; subpage `/national-climate-policies/implementation`). For each
  EU policy that requires national implementation, how far has each member
  state built a national response, who is lagging, and which national
  instruments are best practices the laggards could copy.
- **Part B — Member-state policy-architecture monitor** (the at-a-glance
  section on the module page). A complementary read of each state's overall
  policy architecture.

---

## Part A — EU policy → national implementation tracker

### A.1 The question

The Commission judges member states on **implementation** of EU climate law.
Much of that law only bites once a member state acts: directives must be
transposed, the **Effort Sharing Regulation** sets binding national non-ETS
targets, the Governance Regulation requires national plans, and so on. The
tracker asks, for each such instrument: *how far has every member state built a
corresponding national response, who is lagging, and what can the laggards
learn from the leaders?*

### A.2 Which EU policies

From the 40 EU instruments tracked by the Policy Navigator
(`src/data/sectoral-policies.ts`) we include those that **(a)** genuinely
require *national* implementation/transposition and **(b)** are observable in
the national catalogue. Currently **ten**: the **Governance Regulation
(NECPs)**, the **Effort Sharing Regulation**, **Renewable Energy Directive
III**, **Energy Efficiency Directive**, **EPBD**, the **Industrial Emissions
Directive**, **AFIR**, the **LULUCF Regulation**, the **CAP**, and the
**Waste/Landfill directives**.

Deliberately excluded, with reasons:

- **Centrally operated, no national transposition step** — EU ETS, CBAM.
- **Too recent for the 2022 snapshot** — Nature Restoration Law, Methane
  Regulation, Social Climate Fund national plans.
- **National measures sit outside this catalogue** — air-quality programmes
  under the National Emission Ceilings Directive, and road-charging under the
  Eurovignette Directive, are real national-implementation duties but are not
  recorded in a *climate* law database, so including them would manufacture
  false "not implemented" verdicts.

The list lives in `EU_IMPLEMENTATION_POLICIES`.

**Plan-type vs measures-type.** Some duties are discharged by submitting a
single national **plan** (the NECP under the Governance Regulation): having the
plan *is* implementation, so a single document is not "lagging". Others are
discharged through an evolving **body of measures** (RED, EED, EPBD, ESR…),
where depth and statutory anchoring matter. Each EU policy is tagged `plan` or
`measures` and rated accordingly (see A.4).

### A.3 How a national response is detected

Each EU policy carries an explicit, published **matcher** over the national
catalogue — a combination of CCLW sector tags and keyword/text signals (e.g.
RED matches Energy-sector instruments mentioning *renewable / wind / solar /
biofuel / hydrogen …*). A national instrument "implements" an EU policy when it
matches. This is a **proxy for a national response in that policy area** — not
verified legal transposition.

### A.4 Rating (0–3) and who counts as "lagging"

For each member state × EU policy, from the matching instruments:

| Level | Rule | Meaning |
|-------|------|---------|
| **3 Implemented (in law)** | `measures`: ≥ 2 matches **and** ≥ 1 Law · `plan`: the plan exists as a Law | Substantive, statute-anchored response |
| **2 Implemented** | `measures`: ≥ 2 matches, or a single Law · `plan`: the plan exists | Substantive response |
| **1 Partial** | `measures`: exactly 1 soft (non-legislative) match | Thin response — **lagging** |
| **0 Not implemented** | no match in the catalogue | **lagging** |

A member state is **lagging** on a policy when it is at level ≤ 1. The overall
score (0–100) is the mean level across the included policies. (Plan-type
duties never produce level 1: the plan is either present — implemented — or
absent — not implemented.)

### A.5 Best practices for the laggards

For each EU policy, the **best practices** are the actual national instruments
of the **Strong (level 3)** implementers — a recent law preferred — each linked
to its source so a lagging member state (and a reviewer) can open it and adapt
it. This is the point of the exercise: not to rank, but to give the laggards a
short, concrete shortlist of models.

### A.6 What this is NOT

- **Not** verified transposition and **not** a compliance check against ESR /
  NECP / sectoral targets. "Strong" = "the catalogue records a substantive
  national response in this area".
- **"Not evident" ≠ "nothing exists"** — it can mean "not in this 2022
  snapshot". Much Fit-for-55 transposition post-dates the snapshot; refresh the
  catalogue before drawing firm laggard conclusions.
- Catalogue depth carries CCLW coverage bias; a thinly-documented member state
  can look like a laggard on coverage alone.

Read **alongside** the official transposition and ESR-compliance trackers, not
instead of them. The whole computation is `assessImplementation(policies)` in
`src/lib/eu-implementation.ts`.

---

## Part B — Member-state policy-architecture monitor

## 1. Why this exists

The Board's policy-gap work (*Towards EU climate neutrality: assessing
progress and the policy gaps*) is increasingly expected to look beyond the EU
aggregate and **monitor Member State implementation** — and, where it can,
**identify best practices** other member states could learn from.

This note documents how that is operationalised as an extension of Module 20,
in a way that is **transparent** (every number traces to a rule and a source)
and **defendable** (the country coverage is comprehensive, the best-practice
selection is a published rule, and the limits of the data are stated up front).

It is a **policy-monitoring layer**, not a verdict: it reads the documented
*policy architecture* and reports which member states have built which
responses, as an input to the report — to be paired with, not substituted for,
the report's own sectoral gap assessment.

## 2. Scope — comprehensive monitoring, rule-based highlights

We do **not** choose favourite countries, and we do not tie the scope to which
countries have a climate-council counterpart. The rule is:

> **Monitor all 27 member states.** Draw **best practices only from member
> states with a monitorable policy base** — at least **8 catalogued
> instruments**, the same "substantial catalogue" threshold the module's
> deep-insights already use.

Each member state also carries a **monitoring-confidence** flag, about
*documentation depth* (not policy quality):

| Confidence | Rule | Eligible for best-practice highlight? |
|------------|------|----------------------------------------|
| **Well documented** | ≥ 20 catalogued instruments | ✅ |
| **Partial coverage** | 8–19 instruments | ✅ |
| **Sparse** | < 8 instruments | — (monitored, but not ranked) |

A thin portfolio is *monitored but not eligible* for a highlight, because a low
count usually means "less documented" rather than "less governed" — it would be
unfair to rank a member state down on a documentation artefact.

## 3. What is monitored

Each member state is scored 0–100 on five documented dimensions of its national
climate-policy **architecture**, computed live from the catalogued instruments
(the same `CountryPolicyMetrics` that drive the rest of the module):

| Dimension | Rule (0–100) |
|-----------|--------------|
| **Statutory framework** | Binding framework climate law = 100; executive framework strategy only = 50; none catalogued = 0. |
| **Sectoral breadth** | Distinct sectors covered ÷ broadest EU-27 portfolio, ×100. |
| **Adaptation integration** | Has a framework adaptation instrument (40) + adaptation share of catalogue (up to 60, saturating at a 40% share). |
| **Legislative anchoring** | Share of the catalogue passed by parliament rather than by decree/strategy, ×100. |
| **Policy momentum** | Share of dated instruments adopted in 2016 or later (post-Paris), ×100. |

The **composite** is the equal-weighted mean of the five. Equal weighting is a
deliberate, defensible default — it makes no contestable claim about which
dimension matters most. (Weights live in one place in the code and can be
revisited if the Board agrees a rationale.)

A sixth, **first-mover** highlight is reported separately: the earliest binding
framework climate law in the monitorable set.

## 4. How "best practice" is identified

For each dimension, the **best practice** is the monitorable member state with
the highest score, with ties broken deterministically (by catalogue depth, then
alphabetically). Crucially, each best-practice claim **links to the specific
instrument** (framework law, adaptation instrument, most recent instrument)
that earns it, so a reviewer can open the source and verify the claim rather
than trust a score. This is the core of the "defendable" requirement: the
monitor is an index *into* the evidence, not a substitute for it.

## 5. What the scores are NOT

This is stated prominently in the UI and repeated here because it is the most
important caveat:

- The monitor scores the **documented policy architecture** in *Climate Change
  Laws of the World* — **not** emissions outcomes, the size of a member state's
  gap to its targets, or implementation quality.
- **Catalogue depth reflects CCLW editorial coverage** as well as genuine
  legislative activity; the monitoring-confidence flag makes this explicit per
  country.
- Framework / sector / adaptation **tags are sparse and partly inconsistent**
  in the source; a missing tag may mean "untagged", not "absent".
- The committed snapshot is **2022-11-02** — it pre-dates much Fit-for-55
  transposition and the 2023–25 national updates. Re-run after a catalogue
  refresh (the module supports an in-app refresh from Climate Policy Radar).

Read as a structured, transparent monitoring aid and a starting point for peer
learning — **paired with** the report's sectoral gap assessment, not a league
table of climate performance read on its own.

## 6. Reproducing / extending

The whole computation is the function `monitorMemberStates(policies)` in
[`src/lib/policy-monitoring.ts`](../../../../src/lib/policy-monitoring.ts). It
is pure and deterministic: given the committed catalogue snapshot
(`public/data/national-climate-policies.json`) it returns the same result
rendered by `PolicyMonitoringPanel.tsx`. To change the scope thresholds, the
dimensions, or the weights, edit that one file; the panel and this note are
downstream of it.
