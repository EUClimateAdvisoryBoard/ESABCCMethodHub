# Beta parking lot

**Forty-four** experimental modules sit outside the Next.js route tree at
[`beta/modules/`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/tree/main/beta/modules)
in the repository. They are **intentionally unrouted** — the file-system
location is the feature flag. (Former beta work has graduated before: the
Project Workspace and the Recommendations tracker were promoted to the core as
[M·07](../modules/project-workspace.md) and
[M·08](../modules/recommendations.md), and the Brussels Bulletin pipeline moved
into [Secretariat News](../modules/news-feed.md).)

<figure class="mh-figure mh-figure--wide" markdown>
<img src="../../assets/fig-scope-lock.svg" alt="Scope lock diagram — eight production modules with solid borders in src/app/ vs. the beta modules with dashed borders under beta/modules/. A curved arrow between them is labelled git mv to indicate the single-command promotion path.">
<figcaption><span class="mh-figure__num">Figure 3.</span> The scope lock. Eight production modules live under <code>src/app/</code> with all the production scaffolding; the beta modules sit under <code>beta/modules/</code> outside the Next.js route tree. Promotion in either direction is one <code>git mv</code> — that is exactly how M·07 and M·08 graduated.</figcaption>
</figure>

## What is parked

Numbered M·09–M·53, continuing the sequence after the eight core modules. The
list grows roughly weekly as new prototypes land; the
[`beta/README.md`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/beta/README.md)
table and the home-page module ribbon (`src/app/page.tsx`) are the canonical,
always-current registry — this page mirrors them.

The modules fall into four loose families:

- **Data surfaces awaiting a pipeline or licence** (M·09–M·20) — working UI,
  blocked on a backend service, a procured dataset, or editorial sign-off.
- **Analysis & coherence tools** (M·23, M·25, M·26, M·28, M·29, M·31, M·32,
  M·41, M·43) — faithful, interactive renderings of internal method notes and
  position papers, or transparent what-if / reduced-form accounting models.
- **Narrative & briefing surfaces** (M·21, M·22, M·24, M·27, M·30, M·33,
  M·34) — scrollytelling data essays, sector briefs and explainers built on
  published report content and ESABCC recommendations.
- **Report-preparation working spaces & registers** (M·36–M·40, M·42) —
  working surfaces for the next progress report: verbatim target and policy
  registers, the ETS-review package hub, and structural maps of the acquis.
  (M·35 Summer Prep is retired — its pages moved into the Project Workspace.)

| #     | Folder                       | Module                | Why it is beta                                                  |
|-------|------------------------------|-----------------------|-----------------------------------------------------------------|
| M·09  | `energy-system/`             | Energy System Modelling | PyPSA-style optimisation; requires the `pypsa-service` backend. |
| M·10  | `climate-adaptation/`        | Climate Adaptation    | CLIMADA + CMIP6 hotspots; needs full impact-chain validation.   |
| M·11  | `maritime-aviation/`         | Maritime & Aviation   | SEAMAPS / OAG data requires procurement.                        |
| M·12  | `climate-finance/`           | Climate Finance       | NGFS v5 scenarios; EIB green-bond dataset not yet licensed.     |
| M·13  | `media-monitoring/`          | Media Monitoring      | GDELT pipeline works; dashboard UX and consent flow WIP.        |
| M·14  | `fact-sheets/`               | Fact Sheet Builder    | Drag-and-drop widgets; LaTeX export path not yet validated.     |
| M·15  | `faq/`                       | FAQ & Prebunking      | Content pipeline; awaiting editorial sign-off.                  |
| M·16  | `funding-sources/`           | [Funding Sources](../modules/funding-sources.md) | Horizon Dashboard + DG DIGIT QlikSense snapshot; scraper pending. |
| M·17  | `strategy-docs/`             | [Strategy & Framework Docs](../modules/strategy-docs.md) | Catalogue surface for internal strategy / project-framework PDFs; entries placeholdered until source files land in `public/strategy-docs/`. |
| M·18  | `eu-climate-councils/`       | EU Climate Councils   | Leaflet map of ~67 national advisory bodies; mapping still being verified. |
| M·19  | `project-management/`        | Project Management    | Phase / Gantt board against the Project Manual; UX iterating.   |
| M·20  | `national-climate-policies/` | National Climate Policies | EU-27 laws & policies from climate-laws.org (CC-BY 4.0); in-module refresh via Climate Policy Radar API + Supabase snapshot. Includes an EU-policy → national-implementation tracker subpage. |
| M·21  | `transition-panorama/`       | EU Transition Panorama | Panorama-Sweden-style radial explorer of EU emissions vs the AR6-based 2040 advice scenarios; to be re-based on the AR7 scenario database once published. |
| M·22  | `transition-stories/`        | Transition Stories    | Cinematic scroll-driven data essay on published ESABCC report photography. |
| M·23  | `policy-coherence/`          | Policy Coherence Assessment | Rule-based four-step coherence model (ABP audits, Nilsson et al. 2016 interaction scores, distance-to-target pace ratios); observations are AI-collected baselines pending re-verification. |
| M·24  | `transition-stories-2/`      | Transition Stories 2 — Mind the Gap | Cinematic scroll experience for the *Towards EU climate neutrality* (2024) policy-gap report; living SVG scenes over stock photography. |
| M·25  | `policy-coherence-2/`        | Policy Coherence 2.0  | Sentence-block coherence review with an ML layer; successor to M·23. |
| M·26  | `ets-cdr-price/`             | ETS Endgame & CDR Safety Valve | Reduced-form Hotelling allowance-price model with a price-responsive CDR backstop (after the Ariadne dossier & PIK/LIMES-EU Joule paper); includes a `/status` CDR-pipeline snapshot. |
| M·27  | `ai-environmental-impact/`   | AI Environmental Impact | Slider-driven estimator of the GHG footprint of *using* AI (inference), EU vs US grid, scaled to planetary query volume; order-of-magnitude reconstruction from public figures. |
| M·28  | `policy-analysis-cookbook/`  | Policy Analysis Cookbook | One-to-one visualisation of the internal *policy analysis cookbook* position paper (three-phase method, policy onion, Step-2 coherence codebook). |
| M·29  | `ets-wishlist-impact/`       | ETS Wishlist — GHG Impact | Transparent accounting model of the GHG cost of the EPP's ten-point ETS-softening "wishlist", expressed as years of EU progress lost; every instrument links to EUR-Lex. |
| M·30  | `short-formats/`             | Short Formats         | Four one-page briefs (ETS, LULUCF, energy crisis, international flexibilities) with a *Recommendations* view (drawn only from existing ESABCC advice) and a *Political reality* overlay. |
| M·31  | `digital-energy-roadmap/`    | Digital & AI Energy Roadmap — Coherence Check | Side-by-side reading of COM(2026) 501 final against ESABCC recommendations and binding EU goals; each commitment classified contradiction / tension / ambition gap / alignment. |
| M·32  | `ex-post-analysis/`          | [Ex-Post Policy Assessment](../modules/ex-post-analysis.md) | Faithful rendering of the internal *Ex-Post Policy Assessment — Methods Scoping Note* (working brief for Policy Gap Report 2.0); counterfactual-availability design grid, quant attribution + qual contribution analysis. |
| M·33  | `sector-background/`         | [Sector Background](../modules/sector-background.md) | Structured background brief for the Industry & Transport sectors; reuses the project-workspace assessment-framework flow chart and layers on mitigation/adaptation options, EU policies (live, EUR-Lex-linked) and a curated reading list. |
| M·34  | `electricity-prices/`        | Electricity Prices    | Merit-order explainer of wholesale electricity price formation, EU vs US vs China. |
| M·36  | `policy-targets/`            | Policy Targets Register | Verbatim quantified targets extracted from EU climate law, with Excel export; human-confirmed entries. |
| M·37  | `ets-review/`                | ETS Review & Electrification | Electrification model and reform overview for the 17 Jul 2026 ETS review package. |
| M·38  | `impact-assessment/`         | Impact Assessment — Modelling Results | 80 key modelling findings from the ETS-review impact assessment SWD(2026) 616, each with verbatim numbers, page reference and source-page screenshot; AI-extracted, pending human verification. |
| M·39  | `eu-green-deal-policies/`    | EU Green Deal Policy Tracker | 93 EGDSF legislative initiatives from ETC CE Report 2024/8 Annex 2, tracked to July 2026 with EUR-Lex/legislative-train links; Figure-1.2-style chart splitting adopted acts into stable vs reopened by the 2025-26 omnibus agenda; AI-researched and AI-fact-checked (act numbers machine-verified), pending human sign-off. |
| M·40  | `necpr-targets/`             | NECPR 2025 — What Actually Compares | Hand-built mapping of the 209 "other national objectives" reported by 22 Member States across NECPR Annexes I/II/IV into 26 target families, plus the EU-27 net LULUCF aggregate, headline-target coverage and ten data-quality flags; extraction reproducible via `scripts/extract-necpr-2025.py`. Family mapping is a manual reading pending Secretariat review. |
| M·41  | `wildfire-sink-risk/`        | Wildfires & the Land Sink | Cohort model converting EFFIS burnt area (2021–25) into a land-sink shortfall and the extra mitigation burden it puts on the 2040 (−90%) and 2050 net-zero targets, with a live 2026 season tracker (Copernicus EFFIS API) and seven deep-dive analyses (member states vs Annex IIa, disturbance flexibility, prevention cost, hindcast, CRCF buffer, Natura 2000, FWI climate scenarios). Full write-up in [`METHODOLOGY.md`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/beta/modules/wildfire-sink-risk/METHODOLOGY.md). Illustrative arithmetic only — not citable as a quantitative finding. |
| M·42  | `policy-hierarchy/`          | [EU Policy Hierarchy](../modules/policy-hierarchy.md) | The EU legal order as one collapsible figure — primary → secondary → tertiary → soft law across all domains, four cross-cutting lenses, Art. 3(2)(b) mandate rings and a "moving now" status layer, every instrument EUR-Lex-linked. Instrument register AI-compiled, pending Secretariat verification. |
| M·43  | `committed-damages/`         | Committed Damages — EU Cost of Climate Change | Interactive, slider-driven rebuild of the damage-projection pipeline of the **retracted** Kotz, Levermann & Wenz (Nature 628, 2024) paper, refocused on the EU-27: five damage channels, switchable persistence logic, per-member-state gradient, and a prominent retraction panel. Stylised teaching reconstruction — explicitly not a citable damage estimate. |
| M·44  | `ets-ia-proposal-mismatch/`  | IA ↔ Proposal Mismatch | Where the ETS Directive proposal COM(2026) 616 departs from its impact assessment SWD(2026) 616 — every divergence with verbatim passages from both documents, passage screenshots, a ranked summary and alignments recorded alongside. AI-compiled, pending human verification. |
| M·45  | `climate-security/`          | Climate Security Ledger | Avoided fossil imports from climate policy: frozen-baseline counterfactual, three price scenarios, supplier decomposition, 2030 exposure stress test. Order-of-magnitude reconstruction, not an attribution study; pending Secretariat verification. |
| M·46  | `cleantech-manufacturing/`   | Clean-Tech Manufacturing Scoreboard | Six technologies vs the NZIA 40 % manufacturing benchmark (Reg. (EU) 2024/1735): capacity/need ranges, pace ratios, import penetration, supplier HHI. Capacity figures industry-reported; pending verification. |
| M·47  | `competitiveness-claims/`    | Competitiveness Claims Register | 14 claims from the competitiveness debate, balanced 7/7 by direction, decomposed into propositions with verdict bands and machine-checked steel-mans. Verdicts AI-drafted and politically sensitive; Secretariat sign-off required. |
| M·48  | `crm-pathway-stress/`        | Critical Raw Materials × 2040 Stress Test | Eight strategic materials: pathway demand (coefficient ranges, thrifting slider) vs CRMA Art. 5(1) benchmarks; months-of-deployment-at-risk exposure metric. Coefficients vary 2–3× across sources; pending human review. |
| M·49  | `cbam-leakage-watch/`        | CBAM & Leakage Watch | Three deterministic leakage indicators with "can/cannot show" panels, the downstream "screws and cars" boundary table, phase-down register and third-country event ledger. Refuses to call leakage on 2026 data by design. |
| M·50  | `grid-security/`             | Grid & Interconnection Security Ledger | The 15 % interconnection target per member state, the grid investment gap with pace ratio, and a sourced incident/milestone ledger (2022–25) where attribution is only ever the investigating authority's conclusion. |
| M·51  | `climate-defence-fiscal/`    | Climate Investment vs Rearmament | The fiscal squeeze: non-comparable need estimates kept visibly apart, committed flows, the Hague defence ramp and a crowd-out slider labelled a political variable. Highest-fabrication-risk topic; fact-check pass required before merge. |
| M·52  | `trade-partner-climate/`     | Trade-Partner Climate & Article 6 Tracker | Eight-partner snapshot register (carbon pricing, NDCs, CBAM stance, linkage) plus plausible Article 6 supply-at-quality vs the ≈260 Mt demand in COM(2026) 616 — issued credits to date cover under 1 % of the bet. Snapshot 2026-08. |
| M·53  | `policy-target-flows/`       | Policy Targets → Indicators | Every relevant, unflagged M·36 target (the reduced set after the August 2026 "revise target" review pass) on a sector flow chart in the Policy Gap 2.0 style, matched to the series, dataset or compliance milestone that measures it — opening on a one-figure overview of all nine sector columns, each expandable into its chart — no target left unassessed, and the measurement gaps ranked by the dataset that would close them. |

!!! note "Numbering vs. the route map"
    The `M·NN` codes are a **stable presentation index** assigned on the home
    page, not a routing identifier. The live route for any beta module is
    `/beta/<folder>` (e.g. `/beta/ex-post-analysis`), served by a one-line
    re-export stub under `src/app/beta/<folder>/page.tsx` that points at the
    real page in `beta/modules/<folder>/`. Promotion renumbers nothing — it
    just moves the folder into the route tree.

    Two additional folders sit under `beta/modules/` without their own `M·NN`
    entry: `overview-industry/` (ex M·34) and `policy-gaps/` (ex M·36) — their
    routes stay alive as report pages of the Industry Project and Policy Gap
    2.0 projects in the Project Workspace, but they are no longer listed as
    stand-alone modules, and their old numbers were reassigned. **M·35 Summer
    Prep** was dissolved in August 2026: its four pages (Indicator Check,
    Synergies & Trade-offs, Policy Gaps — Transport & Industry, Optimization)
    now live under `/project-workspace/…` and `/beta/summer-prep/*` redirects
    there; the number is not reused.

## Promoting a beta module

The operation is deliberately mechanical — nothing in `beta/` is
structurally different from `src/app/`:

```bash
# 1. promote the module back into the Next.js app tree
git mv beta/modules/energy-system src/app/energy-system

# 2. re-add the link in navigation
$EDITOR src/components/SiteHeader.tsx      # add MODULES entry
$EDITOR src/app/page.tsx                   # add to productionModules

# 3. re-enable related API routes (if they were disabled)
ls src/app/api/               # all API routes are already shipped
```

After `next build` picks up the new route automatically, the module is
a fully-fledged production surface.

## Why parked, not deleted

- **Evidence preservation.** The code represents months of exploration
  and encoded domain knowledge. Throwing it away to satisfy a "clean
  trunk" instinct is false economy.
- **Roadmap visibility.** An EEA IT reviewer who sees `beta/modules/`
  immediately understands what is not production and what is on the
  horizon. Feature flags hidden in config would communicate neither.
- **Reversibility.** If Board priorities shift and one of these modules
  becomes the most important thing in the Secretariat's week, we can
  ship it within days — the data pipelines are already live.
