# Member-state policy assessment & best-practice identification

*Methodology note — National Level Climate Policies beta module (Module 20).*

## 1. Why this exists

A bilateral with the Commission (DG CLIMA) flagged a clear expectation: the
report should look harder at **Member State implementation** and **identify
best practices**, while accepting that the Board cannot scrutinise all 27
member states. The suggestion was to focus on a *limited number of countries
where the Board has a climate-council counterpart*.

This note documents how that request is operationalised as an extension of
Module 20, in a way that is **transparent** (every number traces to a rule and
a source) and **defendable** (the country selection is a published rule, not a
hand-picked list, and the limits of the data are stated up front).

## 2. Scope — which member states, and why

We do **not** choose favourite countries. The focus set is derived by a single
rule from the **EU Climate Councils dataset** (`src/data/climate-councils.ts`,
the data behind the `eu-climate-councils` module, sourced from the May 2026
*Mapping of climate advisory councils in Europe*):

> **In scope** = an EU member state with an **independent national climate
> advisory council** — i.e. a body classified `active_statutory`
> (independent council anchored in law) or `active_no_statute` (independent
> council operating without a primary statute).

These are the bodies that function as **ESABCC peers**: independent, expert,
advisory. Countries whose only body is an inter-ministerial coordination group
or a non-dedicated proxy (`proxy`), a council that is legislated but not yet
operational or dormant (`pending`), or that have none (`none`), are classified
and shown for transparency but are **excluded from the peer comparison**.

Counterpart tiers (computed in `member-state-assessment.ts`):

| Tier | Council status | In focus? |
|------|----------------|-----------|
| `statutory`   | `active_statutory` | ✅ |
| `independent` | `active_no_statute` | ✅ |
| `proxy`       | `inter_ministerial`, `partial_proxy` | — |
| `pending`     | `legislated_not_operational`, `dormant` | — |
| `none`        | `abolished`, `none` | — |

Because the rule reads the councils dataset directly, the focus set is
**reproducible** and updates automatically as that catalogue is curated.
Excluding a country is a statement about its *institutions*, not a verdict on
its *policies* — those policies remain fully in the Module 20 catalogue.

## 3. What is assessed

Each focus country is scored 0–100 on five documented dimensions of its
national climate-policy **architecture**, computed live from the catalogued
instruments (the same `CountryPolicyMetrics` that drive the rest of the
module):

| Dimension | Rule (0–100) |
|-----------|--------------|
| **Statutory framework** | Binding framework climate law = 100; executive framework strategy only = 50; none catalogued = 0. |
| **Sectoral breadth** | Distinct sectors covered ÷ broadest portfolio in the focus set, ×100. |
| **Adaptation integration** | Has a framework adaptation instrument (40) + adaptation share of catalogue (up to 60, saturating at a 40% share). |
| **Legislative anchoring** | Share of the catalogue passed by parliament rather than by decree/strategy, ×100. |
| **Policy momentum** | Share of dated instruments adopted in 2016 or later (post-Paris), ×100. |

The **composite** is the equal-weighted mean of the five. Equal weighting is a
deliberate, defensible default — it makes no contestable claim about which
dimension matters most. (Weights live in one place in the code and can be
revisited if the Board agrees a rationale.)

A sixth, **institutional** highlight is reported separately: the longest-standing
*statutory* council in the focus set, as a governance best practice in its own
right.

## 4. How "best practice" is identified

For each dimension, the **best practice** is the focus country with the highest
score, with ties broken deterministically (by catalogue depth, then
alphabetically). Crucially, each best-practice claim **links to the specific
instrument** (framework law, adaptation instrument, most recent instrument) or
**council** that earns it, so a reviewer can open the source and verify the
claim rather than trust a score. This is the core of the "defendable"
requirement: the assessment is an index *into* the evidence, not a substitute
for it.

## 5. What the scores are NOT

This is stated prominently in the UI and repeated here because it is the most
important caveat:

- The assessment scores the **documented policy architecture** in *Climate
  Change Laws of the World* — **not** emissions outcomes, real-world ambition,
  or implementation quality.
- **Catalogue depth reflects CCLW editorial coverage** as well as genuine
  legislative activity. A thin portfolio means "less documented", not
  necessarily "less governed".
- Framework / sector / adaptation **tags are sparse and partly inconsistent**
  in the source; a missing tag may mean "untagged", not "absent".
- The committed snapshot is **2022-11-02** — it pre-dates much Fit-for-55
  transposition and the 2023–25 national updates. Re-run after a catalogue
  refresh (the module supports an in-app refresh from Climate Policy Radar).

Read as a structured, transparent *starting point for peer learning* among the
Board's counterpart councils — not a league table of climate performance.

## 6. Reproducing / extending

The whole computation is the function `assessMemberStates(policies, councils)`
in [`src/lib/member-state-assessment.ts`](../../../../src/lib/member-state-assessment.ts).
It is pure and deterministic: given the committed catalogue snapshot
(`public/data/national-climate-policies.json`) and the councils seed it returns
the same result rendered by `MemberStateAssessmentPanel.tsx`. To change the
scope rule, the dimensions, or the weights, edit that one file; the panel and
this note are downstream of it.
