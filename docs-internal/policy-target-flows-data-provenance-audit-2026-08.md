# Policy Targets → Indicators (M·53) — data-provenance audit (August 2026)

*Provenance record for the new assessment ledger behind
`/beta/policy-target-flows` (`src/data/target-indicators.generated.ts`,
544 rows). Written at the point the dataset was first built, before any
fact-check pass, so a reviewer knows exactly what was asserted, on what basis,
and what has **not** been checked.*

**Question the module answers:** for every target the M·36 Policy Targets
Register marks relevant to the transition, how is it measured — and where is it
not measured at all?

**What this audit is not:** it is not a fact-check. No row's family assignment
has been verified against the source act by a second pass. The fact-check pass
is the next work item (see *Decisions for the owner* below).

---

## 1. What was built

| Artefact | Role |
|----------|------|
| `scripts/target-indicator-catalogue.mjs` | 85 measurement families + the milestone route. Hand-authored: label, unit, sector, direction, curated indicator ids, the public dataset behind them, and the word-boundary vocabulary that fires each family. |
| `scripts/build-target-indicators.mjs` | Deterministic build. Scores families per target, assigns a route, derives the flow-chart row, applies overrides, validates integrity, writes the dataset. |
| `scripts/target-indicators-overrides.json` | Reviewed corrections, one entry per target id with a required prose reason. **Empty at the time of writing** — nothing has been corrected by hand yet. |
| `src/data/target-indicators.ts` | Typed model, route/confidence/rung metadata, coverage maths, integrity exports. |
| `src/data/target-indicators.generated.ts` | The dataset: 544 rows. |

Reproduce with `npm run build:target-indicators`; verify the committed file
reproduces byte-for-byte with `npm run check:target-indicators`.

## 2. Inputs and their provenance

- **Targets** — `src/data/policy-targets.generated.ts` (M·36), 819 rows, of which
  544 carry `relevant: true`. Every target text is a verbatim substring of the
  enacting terms, validated by the M·36 build and reviewed in the July and
  August 2026 passes. **M·53 adds no legal content**: it does not re-quote,
  re-classify sectors, or re-decide first/second order.
- **Curated indicator ids** — the four sets in `src/data/{ecno,esabcc,advanced,beta}-indicators.ts`
  (217 series). Ids are parsed out of those files at build time and every
  catalogue reference is checked against them; an unresolved id fails the build.
  The *quality* of those series is out of scope here — several are flagged β
  provisional in their own files and the module renders that badge.
- **Datasets behind the families** — named publishers with a dataset code or a
  stable landing URL (Eurostat table codes, EEA datahub items, EAFO, EHPA,
  EU Building Stock Observatory, Copernicus EFFIS/EFAS/C3S, ECDC, JRC RMIS,
  THETIS-MRV, EIOPA, Cohesion Open Data). **No dataset was pulled.** The 'dataset'
  route asserts that a named source exists and would measure the target — not
  that a series has been built or checked.

## 3. Result

```
544 relevant targets · 56 acts · 0 unassessed
route:      series 382 · dataset 152 · milestone 10
flow row:   first-order 159 · second-order 375 · procedural 10
confidence: strong 374 · moderate 137 · weak 33
158 distinct curated series linked · 74 of 85 families in use
```

**What "0 unassessed" proves.** That every relevant target has been assigned a
stated way of being measured, and that the assignment is reproducible from the
committed inputs. The build exits non-zero if a single relevant target ends
without a route, so the claim cannot silently decay.

**What it does not prove.** That the assignment is *correct* for any given
target, that a 'dataset' row can actually be built from the named source at EU-27
resolution, or that a linked series is the best available measure. It also says
nothing about whether any target is on track — the module asserts no values.

## 4. Checks that were run

| Check | Result |
|-------|--------|
| Every catalogue `indicatorIds` entry resolves in the four curated sets | Pass (build gate) |
| Every family carries dataset name + URL | Pass (build gate) |
| Every relevant M·36 target has a route | Pass — 0 unassessed |
| Every override id matches a relevant target | Pass — overrides file is empty |
| Dataset reproduces from source + overrides | Pass (`--check`) |
| `npx tsc --noEmit` | Pass |
| Runtime integrity (orphaned rows / unassessed targets) surfaced in the UI | Present — renders a loud error band rather than a short list |

## 5. Known weaknesses — ranked

1. **The 33 weak matches** (6 % of rows). These fired only on the provision
   heading or the act's title, not on the target's own wording. They are the
   highest-risk rows and the UI has a dedicated filter for them. Concentrated in
   the Effort Sharing Regulation (article-heading matches) and the Energy
   Efficiency Directive's district-heating thresholds.
2. **Broad families out-scoring specific ones.** Scoring weighs a term found in
   the quote above one found in the title and keeps runners-up within a
   proportional window, which fixed the observed cases (e.g. EPBD renovation
   trajectories now carry both `buildings-ghg` and `renovation`). Cases where a
   third, better family was pushed out of the top three are possible and have
   not been enumerated.
3. **`dataset`-route rows are unproven at EU-27 resolution.** For several
   families — shore-side electricity, SAF share, restoration area, marine GES,
   water reuse/leakage — the named source is a *reporting obligation* rather than
   a published statistical series. Building those indicators may turn out to be
   a data-collection exercise, not a pull. The module's language ("dataset
   named, series to build") is deliberately weaker than "measurable today".
4. **11 families matched nothing.** fossil-subsidies, green-bonds, res-power,
   grid-intensity, energy-intensity, electrification, energy-methane, zev-uptake,
   heating-equipment, heat-health, wildfire, crop-drought-yield. For most this is
   a genuine finding — EU law sets no target on them — but `zev-uptake` firing on
   16 targets and never winning is a scoring artefact worth revisiting, and
   `energy-methane` never winning despite the Methane Regulation being in the
   register suggests the register's coverage of that act is thin.
5. **Sector goal statements are authored prose.** The nine dark-band goals are
   the only sentences in the module not quoted from the register. Each cites the
   provisions it is compiled from; each still needs checking against those
   provisions. The figures they carry (42.5 %, −55 %, −310 Mt, 20 %, 100 % from
   2035, −40 %) are standard headline targets but were written from model
   knowledge, not re-read from the acts in this pass.
6. **Multi-sector double-drawing.** A target in three sectors is drawn in three
   columns. The per-sector coverage bars therefore sum to more than 544; the page
   says so, but a reader skimming the bars could still over-count.

## 6. What this pass deliberately did not cover

- No verification of any family→target assignment against the source act.
- No pull, spot-check or reproduction of any named dataset.
- No assessment of whether the 158 linked series are current, or whether their
  scope (EU-27, sector definition, unit) actually matches the target's scope.
  A series can measure the right *concept* on the wrong *boundary*.
- No review of the 275 peripheral targets. That relevance call is M·36's.
- No attempt to re-open M·36's first/second-order calls, which drive the
  flow-chart rows directly.

## 7. Decisions for the owner (Secretariat / sector leads)

1. **Fact-check pass, sector by sector.** Suggested order by risk: the 33 weak
   rows first, then the `dataset`-route rows in Water, Health and Ecosystems
   (where the sources are reporting obligations rather than series), then the
   high-volume acts (AFIR, F-Gas, Packaging, RED III, EU Adaptation Strategy).
   Corrections land in `scripts/target-indicators-overrides.json` with a
   `[fact-check 2026-NN]` tag, never in the generated file.
2. **Confirm or reject the three-route framing** before the report cites it. The
   defensible sentence is "every relevant target has a stated measurement route",
   not "every relevant target is measured". If the report needs the stronger
   claim, the 152 `dataset` rows are the work programme.
3. **Decide whether the goal band stays.** It is the only authored legal prose in
   the module; the alternative is to derive the goal band purely from first-order
   targets in the register and carry no compiled statement at all.
4. **Rank the measurement gaps for the indicator work programme.** The Close the
   gaps view already orders families by how many targets each would cover — that
   ranking is a ready-made backlog for the indicator database.

## 8. Verified correct — no action

- The M·36 target texts, sector classifications and first/second-order labels
  reproduced into this module are carried through unmodified; the join is by
  stable content-hash id and is checked at runtime.
- The build's integrity gates (indicator ids, dataset provenance, stale
  overrides, unassessed targets) all fail loudly and were each exercised during
  development — the unassessed gate fired on 7 targets on the first run and was
  closed by extending vocabularies, not by loosening the gate.
