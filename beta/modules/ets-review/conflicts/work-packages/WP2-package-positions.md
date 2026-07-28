# WP2 — Commission package positions

*Read WP0 first. Output: `package-positions.ts` exporting
`PACKAGE_POSITIONS: PackagePosition[]` conforming to `../types.ts`.*

## Goal

Consolidate what the 17 July 2026 package actually proposes, assumes and
admits — one `PackagePosition` per decision-relevant element, quoted, with the
document locator (`sourceRef`) and the in-repo extraction it came from
(`extractedFrom`). The originals are not stored in this repo; the repo's
extractions (which carry document + page locators) are the working source.

## Sources (all in-repo)

1. `beta/modules/ets-review/reform/page.tsx` — `PROPOSED_CHANGES` (10 changes,
   each with quote + source), the numbers section (cap/LRF 3.7%→1.7%, 250 Mt
   Art. 9c removals, ~260 Mt international credits, €100bn IDB, timeline), and
   the 23-entry uncertainty register (ids like `removal-target`,
   `on-top-of-cap`, `credits-2033-review`, `ambition-contested` …) with `src`
   locators into SWD(2026) 616 parts and annexes.
2. `beta/modules/impact-assessment/data.ts` — `IA_FINDINGS` with `part`,
   `pdfPages`, `quote`, `keyNumbers` for the cap trajectories (CAP1–3), MSR
   options, removals cost/delivery, IDB, aviation, macro results.
3. `ets-review/electrification-46-percent.md` — Electrification Action Plan
   COM(2026) 595: the indicative 46%-by-2040 target (direct electrification,
   legislation intended Q4 2026), Pillar 1 electricity-price reform /
   COM(2026) 600, the reliance mix of price vs measures, €260bn/yr import-bill
   claim.
4. `beta/modules/ets-review/page.tsx` + `electrification/page.tsx` +
   `ets-review/README.md` for cross-checked headline numbers.

## Method

- One position per element the Board could have a view on. Required coverage
  (≈22–30 positions):
  - Cap: 2040 ambition level (85–87% claimed; Climact ~80% estimate as a
    *contested-ambition* position), cap trajectory options, LRF backloading
    3.7%→1.7%, carbon budget 5,605–6,295 Mt 2031–40.
  - Removals: 250 Mt permanent removals *on top of* the cap (Art. 9c), netting
    design (CR2/CR3, net-vs-gross ambiguity), revenue-driven delivery (not
    guaranteed), cost uncertainty (DACCS €185–370/t), "may simply not be met".
  - International credits: ~260 Mt 2036–40, 2033 review condition, LRF
    reversion to 2.7% if the review fails.
  - MSR reform, price-path claims, TNAC ratio.
  - Free allocation beyond 2030 / CBAM interaction / 20 MW threshold basis /
    refinery-output assumption.
  - Aviation (+148 Mt cap addition, ≤5,000 km departing flights from 2029,
    2032 CORSIA revert clause), maritime, SAF reserve / SMAP pots.
  - Waste incineration inclusion and its data caveats.
  - IDB €100bn, revenue earmarking, macro results (GEM-E3).
  - Electrification: 46% indicative target (definition: direct only), Q4 2026
    legislation intent, price-reform pillar, demand-side measure families, the
    fact the plan's target sits below Board-scenario ranges (state only the
    package side here — comparison happens in WP3).
  - Evaluation admissions (Annex 15): attribution of past reductions, MSR
    effect not isolable.
- `docId` must be the specific document (`swd-616-p1` … `p5` by part for IA
  material; `com-616` for the directive proposal; `eap` for the Action Plan;
  `qa`/`pr` only when that is genuinely the source).
- `sourceRef`: reuse the locator style already in the repo ('Part 1, p30–31',
  'Annex 8 II, p46', 'Art. 9c', 'Pillar 1').
- `extractedFrom`: repo path + anchor id of the extraction used.

## Definition of done

- Typechecks against `types.ts`; every `docId` valid; no number appears that
  is not present in one of the in-repo sources; header per WP0 convention 6.
