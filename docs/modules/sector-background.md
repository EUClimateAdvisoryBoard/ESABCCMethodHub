# M · 33 — Sector Background

!!! tip "Status"
    Beta · parked under [`beta/modules/sector-background/`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/tree/main/beta/modules/sector-background) · route [`/beta/sector-background`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/app/beta/sector-background/page.tsx) enabled via a re-export stub; promoted to `src/app/` when hardened.

A structured **background brief** for the two sectors the lead owns in the
Board's sector-responsibility allocation: **Industry** and **Transport**. For
each sector it reuses the Project-Workspace **assessment-framework flow chart**
exactly as the Board draws it, then lays out — on one page — the mitigation
options, adaptation options, the EU policies to look into (each linked to
EUR-Lex), and a curated reading list. It closes by pointing at how the
report methodology itself could be improved.

## In plain terms

> Before writing the Industry or Transport chapter, the lead wants everything
> for that sector in one place: the official "how this sector decarbonises"
> diagram, the levers that bring emissions down, the climate risks the sector
> faces, the EU laws that act on it (with one-click links to the legal text),
> and the handful of papers worth reading first. This module is that single
> briefing page — and it doubles as a demonstration of how the Board's static
> framework figure can grow into an interactive analysis surface.

## User story

> The lead is opening the Industry chapter for Policy Gap Report 2.0. They go
> to `/beta/sector-background`, stay on the **Industry** tab, read the report
> framework flow chart, then flip the toggle to the **Enhanced + adaptation**
> board to see the methodology improvements (filled-in indicator gaps, an
> adaptation track). They scan the mitigation levers and adaptation options,
> click an EU policy through to its EUR-Lex page, skim the curated reading list
> for the steel/cement decarbonisation literature, and read the "how the
> methodology can be improved" notes before drafting.

## What the page lays out, top to bottom

| # | Section | What it shows |
|---|---------|---------------|
| 1 | **Sector ownership** | The Board's sector-responsibility allocation (`SECTOR_OWNERSHIP`) — lead/backup per sector, with the two owned sectors highlighted. |
| 2 | **Sector tabs** | Industry / Transport switch, each with a short framing blurb. |
| 3 | **Assessment-framework flow chart** | The Project-Workspace `SectorFlow` board, with a **Report ⇄ Enhanced + adaptation** toggle (`showEnhanced`). Default is the published report view; the enhanced view shows how the methodology can be improved. Indicator nodes open an `IndicatorDetail` drawer. |
| 4 | **How emissions come down** | Mitigation options derived from the framework **levers** (`betaSector.levers`, non-adaptation). |
| 5 | **Reducing climate risk to the sector** | Adaptation **outcomes** and **levers** from the beta adaptation layer (`track === 'adaptation'`), anchored in EUCRA 2024. |
| 6 | **EU policies to look into** | The relevant EU instruments, **live** from [`src/data/sectoral-policies.ts`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/data/sectoral-policies.ts), each linked to **EUR-Lex** via `getEurLexUrl`. |
| 7 | **A curated reading list** | Influential papers/reports per sector, grouped by lens (mitigation / adaptation / policy / method), each linked to its canonical DOI or institutional source. |
| 8 | **How the methodology can be improved** | "From a static figure to an analysis surface" — the `METHOD_NOTES`, each pointing at an alternative board the MethodHub already prototypes. |

## Reuse: one flow chart, two boards

The module does **not** redraw the framework — it consumes the same data the
Project Workspace uses:

- `defaultFrameworkBoardReport()` → the published report view (default).
- `defaultFrameworkBoardBeta()` → the Enhanced + adaptation board, surfaced by
  the toggle so the methodology improvements are visible side-by-side.

Each sector maps to one framework id (`industry`, `transport`). For policies,
Transport rolls up three sector ids — `transport-road`, `transport-maritime`,
`transport-aviation` — into a single tab. Mitigation vs adaptation is split
purely by each node's `track`, so the same board renders both lenses without
duplicate content.

## The curated reading list

Compiled from a deeper multi-source literature search, the reading list is an
**AI-curated starting point pending final source re-verification by the lead**
— it is **not** report content. Every entry links to a canonical source (DOI
landing page or institutional report) so a human can confirm it before it is
cited. A handful of DOIs could not be live-resolved from the build environment
(the egress proxy blocks some publisher hosts); those are flagged in each
entry's `why` field.

| List | Entries | Examples |
|------|---------|----------|
| `INDUSTRY_REFERENCES` | 18 | Material Economics (2019); IEA steel & cement roadmaps; Richstein & Neuhoff on Carbon Contracts for Difference; Leeson et al. industrial CCS review. |
| `TRANSPORT_REFERENCES` | 18 | Creutzig et al. (Avoid–Shift–Improve); Axsen et al. on integrated policy mixes; Milovanoff et al. ("fleet electrification alone is not enough"); Mattioli et al. on car dependence. |
| `ADAPTATION_REFERENCES` | 12 | Cross-cutting climate-risk and resilience literature anchored in EUCRA 2024. |

## How the methodology can be improved (`METHOD_NOTES`)

The closing section turns the brief into a methodology critique, each note
flagged with whether it is already prototyped elsewhere in MethodHub:

- **Close the "no indicator" gaps on mitigation levers** — several report
  levers were drawn without a progress indicator; the Enhanced board fills them
  with provisional β-series. *Prototyped.*
- **Add a first-class adaptation & resilience track** — the published
  frameworks are mitigation-only; the beta board grafts an adaptation layer per
  sector, anchored in EUCRA 2024. *Prototyped.*
- **Tag each node with the EU instrument(s) that act on it** — turning the flow
  chart into a coherence-analysis surface (the "Policy Gap Report 2.0" board).
  *Prototyped.*
- **Bind indicators to scenario reporting variables** — mapping each indicator
  to an IAMC/ISIMIP variable so the framework doubles as the scenario-submission
  template. *Prototyped.*
- **Disaggregate Industry by material value chain** — per-material drill-down
  (steel, cement, chemicals) so demand- vs supply-side levers can be weighted.
- **Make the Transport framework explicitly Avoid–Shift–Improve** — re-labelling
  the outcome rows to align with the dominant transport-mitigation literature.

## Code surface

| Path | Role |
|------|------|
| [`beta/modules/sector-background/page.tsx`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/beta/modules/sector-background/page.tsx) | Client component: sector tabs, the `SectorFlow` board with Report/Enhanced toggle and `IndicatorDetail` drawer, and the mitigation / adaptation / policies / reading-list / method-notes sections. |
| [`beta/modules/sector-background/content.ts`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/beta/modules/sector-background/content.ts) | The bespoke content: `SECTOR_OWNERSHIP`, `INDUSTRY_REFERENCES`, `TRANSPORT_REFERENCES`, `ADAPTATION_REFERENCES`, `METHOD_NOTES` and the `Reference` type. |
| [`src/app/beta/sector-background/page.tsx`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/app/beta/sector-background/page.tsx) | One-line re-export so the route is reachable when manually navigated. |

### Shared surfaces it consumes (not duplicated)

| Import | From | Provides |
|--------|------|----------|
| `SectorFlow`, `IndicatorDetail` | `src/components/frameworks/` | The flow-chart board and the indicator drawer (shared with [M·07 Project Workspace](project-workspace.md)). |
| `defaultFrameworkBoardReport`, `defaultFrameworkBoardBeta`, `resolveIndicators` | [`src/data/sector-frameworks.ts`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/data/sector-frameworks.ts) | The published and enhanced boards, and indicator resolution. |
| `SECTOR_POLICIES`, `getEurLexUrl` | [`src/data/sectoral-policies.ts`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/data/sectoral-policies.ts) | The live EU-policy list and EUR-Lex URL builder. |

Because the boards and policy list are imported live, the brief stays in sync
with the Project Workspace framework and the sectoral-policy registry — there is
no second copy to drift. Only the reading list and method notes are bespoke to
this module. No API route, no database table.

## Relationship to Content Analysis chapter tags

This module is the **sector-facing reading side** of the same sector dimension
that [M·05 Content Analysis](content-analysis.md#chapter-sector-tags) added on
the **coding side**: the chapter-tag namespace (Energy, Industry, Transport,
Buildings, Agriculture, LULUCF, Cross-cutting, Adaptation) lets the lead line
up the papers for a given sector chapter; Sector Background is where that
sector's framework, policies and literature are read together.

## Known limits & roadmap

- **Reading list pending re-verification.** Entries are AI-curated and must be
  human-confirmed before citation; a few DOIs are unresolved from the build
  environment (flagged in `why`).
- **Two sectors only.** Scoped to the lead's owned sectors (Industry,
  Transport). Extending to the other sectors is a matter of adding entries to
  `SECTORS` and the reference lists.
- **Promotion path** — same one-command move as every beta module (see the
  [beta parking lot](../overview/beta.md)):

  ```bash
  git mv beta/modules/sector-background src/app/sector-background
  $EDITOR src/components/SiteHeader.tsx   # add to MODULES nav
  $EDITOR src/app/page.tsx                # add to productionModules tile grid
  ```

## See also

- [M·07 Project Workspace](project-workspace.md) — owns the `SectorFlow`
  assessment-framework board this brief reuses.
- [M·32 Ex-Post Policy Assessment](ex-post-analysis.md) — the companion
  method note feeding Policy Gap Report 2.0.
- [M·05 Content Analysis](content-analysis.md) — the chapter (sector) tag
  dimension on the coding side.
