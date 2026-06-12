# Advanced version 8 — the burn map (twin heat maps → one recommendation)

This note documents **"Advanced version 8"**, the headline-figure board in the
Indicator module's *Flow charts* view. It sits alongside the report-faithful
default, the enhanced and beta boards, and Advanced versions 1–7.

Where versions 1–7 each proposed a geometry (chains, maps, loops, the method
matrix), version 8 is built to be the **major figure of a report**: two heat
maps joined per sector, and a single derivation from their hot cells —

> *Where does the monitoring burn, where does the policy analysis burn — and
> what is the one recommendation that tackles the burns?*

## The geometry: two heat maps, one band per sector

| Zone | What | Vocabulary | Source |
|---|---|---|---|
| **A · Progress heat map** | one row per sector (EU economy-wide + the six sectors), four fixed monitoring lenses — *emissions & removals · technology & delivery · demand & activity · investment & enablers* — each cell a reading with its observation and source stated | on track · lagging · off track (the EEA pace trichotomy) | curated readings in `burn-map-v8.ts`, each carrying basis + source; cells with linked indicators open the data drawer |
| **B · Policy-coherence heat map** | the same sector bands, rows = the band's EU acts, columns = the four steps of the **beta policy-coherence model** (PR #306): ex-ante assumptions vs world development · coherence across goals · goals ↔ means · evaluation | coherent · partial · incoherent (the model's grades) | **computed live** by `buildCoherenceProfile` from `src/lib/content-analysis/policy-coherence.ts` — map B cannot drift from the coherence assessment |
| **🔥 Burn ledger** | every hot cell on either map: `off-track` (A) and `incoherent` (B), each chip carrying its evidence line | — | computed by `computeBurnLedger` |
| **⇒ The recommendation** | ONE headline recommendation; its three fronts between them claim every burn | front ① steer the land system · ② regulate demand, not only technology · ③ protect the ratchet | authored headline + fronts; each front backed by ESABCC recommendation chips resolved live from the tracker seed |

The two maps are **physically joined**: each sector band holds its four
progress cells on the left and its acts × four coherence steps on the right,
so monitoring and policy analysis are read in one glance per sector. Every
coherence-assessed act is assigned to exactly one band (its centre of
gravity), so the joined map counts each act once.

## The burn-assignment rule (declared, mechanical)

1. any burn in the **land system** (Agriculture & food, LULUCF & forests)
   → front ① — land burns on *both* maps at once;
2. any remaining **monitoring burn** (map A) → front ② — outside the land
   system, the progress map burns where demand is unregulated (transport
   demand, electrification, sufficiency, the investment gap);
3. any remaining **coherence burn** (map B) → front ③ — outside the land
   system, the coherence map burns where acts were weakened at first contact
   (CO₂-standards averaging, omnibus de-scoping, GAEC relaxation, persistent
   NECP gap cycles).

The asymmetry between the two maps is itself the figure's finding, and the
rule turns it into the structure of the advice: the recommendation covers the
board **by construction**, and the ledger shows every claim.

## What is computed and what is curated

- **Computed**: all of map B (grades, evidence lines, pace ratios — straight
  from the coherence model's mechanistic rules), the burn ledger, the
  front assignment, and the ESABCC recommendation statuses (tracker seed,
  assessed 2026-06).
- **Curated**: map A's readings (each cell states the observation and source
  the reading follows from, mirroring the coherence model's evidence
  discipline) and the recommendation's headline / front actions (grounded in
  the ESABCC recommendations each front cites).

## Where it lives in the code

| Concern | Location |
|---|---|
| Board factory, lenses, map-A readings, sector→acts mapping, burn ledger, the recommendation | `src/data/burn-map-v8.ts` (`defaultBurnMapBoardV8`, `buildBoardProfiles`, `computeBurnLedger`, `BIG_RECOMMENDATION`) |
| Coherence engine (map B) | `src/lib/content-analysis/policy-coherence.ts` (`buildCoherenceProfile`, `COHERENCE_STEPS`) — reused, never re-assessed |
| Other source registries | `FRAMEWORK_INDICATOR_INDEX` (drawer links), `policies` (act titles), `ESABCC_2024_RECOMMENDATIONS` (advice chips) |
| View / rationale / legend UI | `src/components/frameworks/BurnMapBoardView.tsx` |
| Rendering (twin heat maps, band evidence, ledger, recommendation) | `src/components/frameworks/BurnMapFlow.tsx` |
| Version registration | `src/lib/project-workspace/flowchart-versions.ts` (built-in id `advanced-v8`, variant `advanced-v8`) |

Like versions 2/4/5/6/7 it is a computed, read-only analytical view. Map-B
cells and act labels deep-link into the beta Policy Coherence board
(`/beta/policy-coherence`); progress cells with linked indicators open the
shared data drawer; clicking a sector label expands the band's full evidence
(every reading's basis + every act's four-step evidence lines).

## Provenance

The sector set and indicator links follow the platform's existing structures;
map B is the beta four-step coherence model verbatim (Assumption-Based
Planning · Nilsson goal-interaction scale · Howlett & Rayner goals/means ·
EEA distance-to-target); the recommendations and uptake statuses are the
ESABCC's own (January 2024 report, tracker assessment 2026-06). The synthesis
— the joined twin heat maps, the burn ledger and the declared
burn-assignment rule deriving one recommendation — is an **original figure
design, not a reproduction** of any published ESABCC figure.
