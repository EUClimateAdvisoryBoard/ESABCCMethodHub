# `beta/` — experimental modules (not shipped in v1.0)

This folder is a **deliberate parking lot**. It contains the Next.js page
folders for the modules that are *not* part of the v1.0 handoff to EEA IT.

The production deployment ships the **eight stable modules** under
[`src/app/`](../src/app). Nothing in this folder is routed by the live app:
the files live outside the Next.js `app/` tree, so the build simply ignores
them. Dropping a folder back into `src/app/` re-activates its route — that is
the whole migration path for promoting a beta module.

## Why this separation exists

When EEA IT, or any reviewer from outside CCE5, opens the repository they
should see the **working scope** without having to guess which surfaces are
production and which are still prototypes. The file system itself communicates
that:

```
src/app/           ← production routes (the eight modules + utilities)
beta/modules/      ← experimental prototypes, unrouted
```

The eight production modules have been hardened: schema migrations, RLS
policies, GDPR retention, data-pipeline tests, IT handoff scripts. The beta
modules are useful demos of *where this platform can go* — energy-system
optimisation, climate-risk chains, media monitoring — but they are not yet at
the quality bar we ship to the Secretariat. (The Project Workspace and
Recommendations modules made exactly this journey: they were promoted out of
`beta/` into the core once hardened.)

## What is in here

| Folder                        | Module               | Why it is beta                                                     |
|-------------------------------|----------------------|--------------------------------------------------------------------|
| `climate-adaptation/`         | Climate Adaptation   | CLIMADA + CMIP6 hotspots; needs full impact-chain validation.      |
| `climate-finance/`            | Climate Finance      | NGFS v5 scenarios; EIB green-bond dataset not yet licensed.        |
| `energy-system/`              | Energy System        | PyPSA-style optimisation; requires PyPSA backend service.          |
| `fact-sheets/`                | Fact Sheet Builder   | Drag-and-drop widgets; LaTeX export path not yet validated.        |
| `faq/`                        | FAQ & Prebunking     | Content pipeline; awaiting editorial sign-off.                     |
| `funding-sources/`            | Funding Sources      | Horizon Dashboard + DG DIGIT QlikSense snapshot; scraper pending.  |
| `maritime-aviation/`          | Maritime & Aviation  | SEAMAPS / OAG data requires procurement.                           |
| `media-monitoring/`           | Media Monitoring     | GDELT pipeline works; dashboard UX and consent flow WIP.           |
| `strategy-docs/`              | Strategy & Framework | Documentation overlay for internal strategy and PIRs; files pending upload. |
| `eu-climate-councils/`        | EU Climate Councils  | Leaflet map of ~67 national advisory bodies; mapping being verified. |
| `project-management/`         | Project Management   | Phase / Gantt board against the Project Manual; UX iterating.      |
| `national-climate-policies/`  | National Level Climate Policies | EU-27 laws & policies from climate-laws.org (CC-BY 4.0); in-module refresh via Climate Policy Radar API + Supabase snapshot. Includes an **EU-policy → national implementation tracker** subpage (`/implementation`): for each EU policy requiring national implementation (Effort Sharing, RED, EPBD, AFIR, LULUCF, CAP…) it rates each member state, flags who is lagging, and pulls out best-practice national instruments for the laggards — plus an at-a-glance policy-architecture monitor. See `analysis/POLICY-MONITORING.md`. |
| `transition-panorama/`        | EU Transition Panorama | Panorama-Sweden-style radial explorer of EU emissions vs the AR6-based 2040 advice scenarios; will be re-based on the AR7 scenario database once published. |
| `transition-stories/`         | Transition Stories | Cinematic scroll-driven data essay on real ESABCC report photography: scrollytelling pathway chart, parallax chapters, sector ledger. Imagery sourced from the published report covers. |
| `transition-stories-2/`       | Transition Stories 2 — Mind the Gap | Cinematic, oryzo.ai-inspired scroll experience for the policy gap report (*Towards EU climate neutrality*, 2024): inertia-smoothed scroll-shaded gap chart, clip-path photo reveals, living SVG scenes (water, embers, cattle, cyclist) over real stock photography (Pexels), sector gap ledger, the 13 key recommendations. |
| `policy-coherence/`           | Policy Coherence Assessment | Rule-based four-step coherence model: Assumption-Based Planning audits (RAND), Nilsson et al. (2016) seven-point goal-interaction scores, goals/means congruence derived from the objective–delivery checklist, and EEA-style distance-to-target pace ratios. Observations are AI-collected baselines (snapshot mid-2026) pending source re-verification. |
| `ai-environmental-impact/`    | AI Environmental Impact | Interactive estimator of the GHG footprint of *using* AI (inference): EU vs US grid carbon intensity, energy per token, and token budgets for four reference tasks (a normal question, a short writing task, a deep-research run, writing ~1,000 lines of code), each with a worked example. Compares the result to everyday anchors (web search, kettle, driving 5 km, a beef burger, an hour of flying) and scales one prompt to a planetary query volume to surface the grid-expansion challenge. Adds a macro panel tracking the hyperscalers' rising — and accelerating — electricity-per-dollar-of-revenue from their own CSR/sustainability reports (Microsoft, Google, Meta, 2020–2024), and a self-measurement of the CO₂e cost of building MethodHub itself. Order-of-magnitude reconstruction from public figures (EEA, EPA eGRID, IEA *Energy and AI*, Epoch AI, Google, company sustainability reports), not a measurement; all assumptions are sliders. |
| `ets-wishlist-impact/`        | ETS Wishlist — GHG Impact | Transparent, slider-driven accounting model of the GHG cost of the EPP's ten-point "wishlist" to soften the EU ETS (slower LRF, weaker MSR, removal & international credits, slower CBAM free-allowance phase-out, free allocation beyond 2030, looser benchmarks, conditional free permits, ETS-revenue earmarking, intra-EU-only aviation). Each demand is modelled one-by-one and combined, organised into Conservative/Central/Maximalist scenarios, with the headline net setback expressed as years of EU progress lost and as a share of the ESABCC-advised 2030–2050 carbon budget. Honest core: cap/supply demands (LRF, MSR, offsets) drive real extra cumulative emissions; free-allocation demands are near-neutral on the capped total (modelled as indirect leakage). Every instrument links to the EUR-Lex legislation. Order-of-magnitude reconstruction, not a market simulation. |
| `policy-analysis-cookbook/`   | Policy Analysis Cookbook | One-to-one visualisation of the internal position paper *Suggestion for a policy analysis cookbook*: the three-phase method (prepare → coherence analysis → integration), the sector/system scoping options, the first/second/third-order policy onion, Box 1 theory, Figure 1 (analysis steps matched to the first Policy Gap report gap categories) and Figure 2 (the policy cycle, after Henstra 2015 / Better Regulation toolbox), plus the Step-2 coherence codebook and key questions. Static method walkthrough; content taken verbatim from the paper. |
| `short-formats/`              | Short Formats | Four compact, one-page briefs on **ETS**, **LULUCF**, the **energy crisis** and **flexibilities for international carbon mitigation**, with two views. *Recommendations*: the Board's advice itself, drawn **only** from existing ESABCC recommendations (looked up by id from `src/data/esabcc-recommendations.ts`), each card linking back to its source report — nothing invented. *Political reality*: a Secretariat strategic overlay (grounded in the recorded legislative-tracking events) classifying each recommendation as a **live window** (speak now), an **open gap** (put it on the agenda) or **moved on** (effectively decided/overtaken — reframe rather than restate), so the board can see where its advice can still land and where the discussion has run too far ahead (e.g. the 5% international credits, decided in Reg (EU) 2026/667). The overlay is clearly flagged as editorial, not report content. |
| `ets-cdr-price/`              | ETS Endgame & CDR Safety Valve | Interactive reduced-form reconstruction of the Ariadne dossier *A Safety Valve for the EU ETS Endgame* and the PIK/LIMES-EU Joule paper *Sequencing CDR into the EU ETS* (Sultani, Osorio, Pahle, Edenhofer et al., 2026). Banking/Hotelling allowance-price model with a convex MACC and a price-responsive permanent-CDR backstop; sliders for the cap trajectory, abatement economics, CDR techno-economics and the sequencing policy (admission year, volume, integrity haircut, MSR docking). Stylised teaching/what-if tool, not the original LIMES-EU model; defaults calibrated to the published anchors (≈€203/2030, ≈€353/2040, 68–86 Mt CDR/yr by 2050). Includes a `/status` subpage — a curated snapshot of the real EU CDR pipeline (LULUCF land sink, operational/FID/announced BECCS, DACCS, biochar & enhanced-weathering projects) and the gap to the volumes the valve needs. |

## Promoting a beta module to production

The operation is deliberately mechanical — nothing in `beta/` is structurally
different from `src/app/`:

```bash
# promote the module back into the Next.js app tree
git mv beta/modules/energy-system src/app/energy-system

# re-add the link in the top navigation (SiteHeader.tsx and the home page)
# re-enable the relevant API routes under src/app/api if they were disabled
```

After that, `next build` picks the route back up automatically. No Next.js
config change, no manifest edit, no rewrite. That is the whole point of using
a filesystem-level parking lot instead of feature flags.

## What stays wired up

- **Shared components** (`src/components/ClimadaExplorer.tsx`, `PypsaLeafletMap.tsx`,
  `MediaMonitoringMap.tsx`, …) remain under `src/components/` because they are
  shared with other pages or are imported by beta pages when those pages are
  promoted.
- **API routes** that the beta pages relied on (`src/app/api/climada`,
  `src/app/api/media-monitoring/**`) remain under `src/app/api/` so that they
  can be exercised directly or reactivated without an extra move.
- **Data pipelines** under `scripts/` keep running for every module, beta or
  not; if EEA IT turns a pipeline off, it is a one-line change in the
  scheduler.

This keeps the beta graveyard cheap — promoting a module is a `git mv`, not a
refactor.
