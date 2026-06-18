# Member-state policy monitoring & best-practice identification

*Methodology note — National Level Climate Policies beta module (Module 20).
An update to the Policy Gap report's monitoring of Member State implementation.*

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
