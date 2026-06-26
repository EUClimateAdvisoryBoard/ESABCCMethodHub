# M · 32 — Ex-Post Policy Assessment

!!! tip "Status"
    Beta · parked under [`beta/modules/ex-post-analysis/`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/tree/main/beta/modules/ex-post-analysis) · route [`/beta/ex-post-analysis`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/app/beta/ex-post-analysis/page.tsx) enabled via a re-export stub; promoted to `src/app/` when hardened.

A faithful, interactive rendering of the internal **"Ex-Post Policy
Assessment — Methods Scoping Note"** — the working brief for **Policy Gap
Report 2.0** — that *also carries out* the analysis the note scopes. Its
central argument: how you assess a policy after the fact is driven by
**counterfactual availability**, not by the mitigation/adaptation split. Where
a clean counterfactual exists you can *attribute* (quantify) the effect; where
it does not, you *reconstruct the theory of change and test each link*
(contribution analysis). The page makes that distinction operational rather
than rhetorical.

## In plain terms

> "Did this policy actually work, and how do we know?" For a carbon price you
> can compare the firms it covered against near-identical firms it didn't, and
> put a number on the emissions avoided. For a flood-adaptation programme there
> is no parallel Europe-without-the-policy to compare against, the baseline
> keeps moving as the climate changes, and the test is a rare event — so a
> single avoided-tonnes number would be a fiction. This module lays out, policy
> by policy, **which question is honestly answerable** and shows the working
> for the ones that are.

## User story

> A Secretariat analyst scoping the methods chapter of *Policy Gap Report 2.0*
> needs to decide, instrument by instrument, whether the report will publish a
> causal *number* or a structured *judgement*. They open
> `/beta/ex-post-analysis`, read the counterfactual design grid to see which
> instruments sit in "clean identification" vs "contribution analysis only",
> drag the Conservative / Central / High band on the ETS attribution to see how
> the published effect sizes flow through to attributed Mt CO₂e, and copy the
> per-instrument method justifications straight into the scoping note.

## What the page argues, section by section

The route is a single long-form analytical page with an on-this-page table of
contents (`TOC_LINKS`). Top to bottom:

| # | Section | What it does |
|---|---------|--------------|
| 1 | **Where identification is possible at all** | The two-axis **design grid** (`GRID`) — *domain* (mitigation/adaptation) × *counterfactual strength* — with a domain filter. Every instrument is placed by how exploitable its counterfactual is, not by its sector. |
| 2 | **One theory of change, two strands, one triangulated judgement** | The method spine: the same theory of change feeds a **quant strand** and a **qual strand** that are triangulated into one judgement. |
| 3 | **Attributing emission reductions to policy** | The mitigation **quant attribution table** (`ATTRIB`): for each instrument with an exploitable counterfactual, the published causal estimate (matched DiD / RD at the 20 MW threshold / bunching / generalised synthetic control) applied to the relevant emission baseline → attributed Mt CO₂e under a Conservative / Central / High band. Cleanliness/confidence ratings shown; the DiD specification is displayed. |
| 4 | **Reconstruct the theory of change, test each link** | The adaptation **intervention logic**: the ToC reconstructed link by link, each link carrying a contribution claim and a **process-tracing evidence test** — *hoop*, *smoking-gun* or *doubly-decisive* (after Beach & Pedersen; Bennett) — and a flag for answerable-now vs deferred. |
| 5 | **Realist CMO configurations** | Context–Mechanism–Outcome rows (`CMO`) showing the same instrument landing differently across hazard/governance contexts. |
| 6 | **The observed series each attribution rests on** | The underlying data series rendered as inline-SVG charts (`ETS_PRICE`/`ETS_OBSERVED`, `CAR_CO2`, `EV_SHARE`, `FGAS`/`FGAS_QUOTA`, `RES_SHARE`, `LULUCF`) with counterfactual overlays. |
| 7 | **Quant strand, qual strand, one integrated judgement** | The integration step (`INTEGRATION_STEPS`, `JOINT_DISPLAY`): per instrument, the quant finding, the qual finding and the **integrated** verdict, with a convergence rating. |
| 8 | **Adaptation quant islands** | The rare cases where adaptation *does* yield numbers (`ADAPT_QUANT`): Floods Directive avoided-damage BCRs (JRC PESETA IV) and EU Solidarity Fund disbursements. |
| 9 | **Five design rules · method references · open scoping checklist** | The `RULES`, per-instrument method justifications, key method `REFERENCES`, and the `OPEN_DECISIONS` checklist still to be resolved before the report. |

## The counterfactual design grid

The organising idea of the whole note. Instruments are sorted by **how clean
the counterfactual is**, which decides the method:

- **Clean identification → quantitative attribution.** ETS (matched DiD;
  regression discontinuity at the 20 MW inclusion threshold), CO₂ car
  standards (bunching at the limit-value), RED scheme-design switches,
  F-gas quota. These get a published effect size and a number.
- **No clean counterfactual → contribution analysis, *not* identification.**
  ESR, LULUCF, the RED headline target, EPBD/EED efficiency gap. These are
  **deliberately not summed into the attributable total** — mixing a causal
  estimate with a contribution narrative would be a category error.
- **Too new to assess yet.** CBAM, ETS2, the Social Climate Fund.

## The mitigation attribution model (transparent, reproducible)

Each row in the attribution table is a **reduced-form synthesis of the
published causal literature**, not a re-estimation on microdata. The arithmetic
is exposed so a reviewer can check it:

```
attributed Mt CO₂e  =  published effect size (%)  ×  relevant emission baseline (Mt)
```

The **Conservative / Central / High** band (`Scenario`) is drawn from the
confidence ranges in the underlying studies, controlled by sliders (`Params`)
so the reader can see how the band moves. Every figure traces to a cited
source — Bayer & Aklin (2020); Dechezleprêtre, Nachtigall & Venmans (2023);
Colmer, Martin, Muuls & Wagner (2025); Reynaert (2021); Fowlie, Greenstone &
Wolfram (2018); EEA inventories; Eurostat; JRC PESETA IV.

!!! warning "What this is not"
    A reduced-form attribution synthesis, **not** an original econometric
    study. It applies *already-published* effect sizes to public baselines so
    the attribution is transparent and reproducible. Every estimate that lacks
    a clean counterfactual is handled by contribution analysis and is kept out
    of the headline attributable total by design.

## Why quantitative ex-post breaks for adaptation

The note is explicit about the three reasons a single avoided-damage number is
not honest for most adaptation instruments, and the module renders each:

1. **Non-stationary baseline** — the climate (and exposure) keeps moving, so
   there is no fixed "no-policy" world to compare against.
2. **Rare-event tests** — effectiveness reveals itself in tail events that may
   not have occurred in the evaluation window.
3. **No common unit** — adaptation has no tCO₂e to sum; benefits are avoided
   damages, lives, ecosystem services, measured in incommensurable units.

In their place: a **four-layer qualitative construction** — a contribution
analysis spine, realist CMO configurations, process tracing with formal
evidence tests, and hazard-variation case selection — plus the two adaptation
**quant islands** where numbers genuinely exist.

## Code surface

| Path | Role |
|------|------|
| [`beta/modules/ex-post-analysis/page.tsx`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/beta/modules/ex-post-analysis/page.tsx) | The entire module — ~1,500 lines, fully self-contained. Holds the design grid, attribution table, data series, CMO/ToC content, integration display, rules, references and the open checklist as in-file constants, plus the slider-driven attribution model and a set of inline-SVG chart components (`LineChart`, `CounterfactualChart`, `AttributionBars`, `CompareBars`). |
| [`src/app/beta/ex-post-analysis/page.tsx`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/app/beta/ex-post-analysis/page.tsx) | One-line re-export so the route is reachable when manually navigated. |

There is **no API route, no database table and no external fetch** — the module
is a static, source-cited analytical surface. All charts are hand-rendered SVG,
so the page works fully offline behind the StaticCrypt gate.

## Data model (in-file constants)

| Constant | Shape | Holds |
|----------|-------|-------|
| `GRID` | `GridCell[]` | Cells of the domain × counterfactual design grid. |
| `ATTRIB` | `AttribRow[]` | Per-instrument quant attribution rows (effect size, baseline, confidence). |
| `ETS_PRICE` / `ETS_OBSERVED` / `CAR_CO2` / `EV_SHARE` / `FGAS` / `FGAS_QUOTA` / `RES_SHARE` / `LULUCF` | `Pt[]` | The observed series each attribution rests on. |
| `CMO` | context/mechanism/outcome rows | Realist configurations for adaptation. |
| `ADAPT_QUANT` | name/method/figures/source | The adaptation quant islands. |
| `RULES` | numbered head/body | The five design rules. |
| `REFERENCES` | method → refs | Key method references per technique. |
| `OPEN_DECISIONS` | list | The open scoping checklist. |
| `INTEGRATION_STEPS` / `JOINT_DISPLAY` | strand-tagged steps / per-instrument rows | The quant + qual → integrated judgement. |
| `TOC_LINKS` | label/anchor | The on-this-page table of contents. |

## Known limits & roadmap

- **Effect sizes are a literature snapshot.** They are taken verbatim from the
  cited studies; refreshing them when new causal estimates publish is a manual
  edit to `ATTRIB`.
- **Static method walkthrough.** The module renders the scoping note and its
  worked attribution; it is not yet wired to the live indicator database
  ([M·07](project-workspace.md)) or the policy corpus ([M·04](policy-navigator.md)).
- **Promotion path** — the same one-command move as every beta module (see the
  [beta parking lot](../overview/beta.md)):

  ```bash
  git mv beta/modules/ex-post-analysis src/app/ex-post-analysis
  $EDITOR src/components/SiteHeader.tsx   # add to MODULES nav
  $EDITOR src/app/page.tsx                # add to productionModules tile grid
  ```

## See also

- [M·33 Sector Background](sector-background.md) — the companion sector brief
  that reuses the assessment-framework flow chart.
- [M·28 Policy Analysis Cookbook](../overview/beta.md) and
  [M·23 Policy Coherence](../overview/beta.md) — the other method-paper
  renderings feeding Policy Gap Report 2.0.
