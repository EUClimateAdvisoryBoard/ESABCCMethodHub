# Summer Prep background documents — content fact-check (27 July 2026)

*Eight parallel checkers over the full content of the four Summer Prep modules: all 66
policy-gap rows against the Board's own report text, all 20 synergy entries against the
literature they cite, all 22 sector-gap claims against EUR-Lex and the Legislative
Observatory, and the metadata of all 97 progress indicators. The numeric values of the
indicators were checked separately — see `indicator-postreport-factcheck-2026-07-27.md`.*

Each checker was told to verify rather than recall: the report was extracted to text page
by page so the quote checks are `grep`-based, DOIs were resolved through Crossref, and the
legislative checkers were told explicitly that their training data is older than today and
to work from primary sources.

## Headline

| Module | Checked | Verdict |
| --- | --- | --- |
| Policy Gap Tracker | 66 rows | **Every quote located in the report, every page reference correct, no gap type mis-tagged.** Nine fixes, all in the surrounding fields. |
| Indicator Check | 97 indicators' metadata | One target factually wrong, two the report carries and the seed dropped, three misattributed, one DOI pointing at an unrelated paper, 32 indicators with a wrong or blanket source label. |
| Synergies & trade-offs | 20 entries | **Every citation exists and matches Crossref.** But several do not support the claim attached to them, and one entry is contradicted by its own source. |
| Policy gaps — transport & industry | 10 re-assessments + 10 candidates | **All 17 statuses correct.** But five claims are materially out of date and three candidate premises have been overtaken by legislation. |

The pattern is worth stating plainly: **the sourcing is sound and the judgements hold; what
fails is the layer in between** — which instrument a finding is attributed to, whether a
cited paper says what it is cited for, and whether a claim written months ago still
describes the law today.

## 1. Policy Gap Tracker — 66 rows

All 66 verbatim quotes were located in the report, all 66 page references are correct, and
no row's gap type contradicts the report's own tag. Fixed:

- **`governance-necp-participation` — the quote was a splice.** Two sentences ~1.5 pages
  apart (pp. 268 and 269) were presented as consecutive prose. Now joined with an explicit
  ellipsis and the reference widened to "pp. 268–269 (two sentences joined)".
- **`lulucf-biomass-incentives` — the quote was truncated**, substituting a full stop for
  the report's closing cross-reference. Restored.
- **Three rows where the report tags TWO barriers in one sentence** and the tracker recorded
  one: `transport-zev-efficiency` (ambition gap *and* policy inconsistency),
  `buildings-fossil-gas-subsidy` (inconsistency *and* policy gap),
  `lulucf-bioenergy-exemptions` (ambition *and* implementation gap). Rather than silently
  pick a tag or split the Board's own sentence, the second tag is now recorded in each
  row's status note.
- **`pricing-regime-coverage`** — the quoted passage carries no inline tag; the "policy gap"
  type comes from Table 16 on p. 227. Now stated in the row.
- **Instrument lists naming things the cited passage does not.** `IPCEIs` was removed from
  the hydrogen row — the string "IPCEI" appears **nowhere in the 360-page report**;
  "Governance Regulation reporting" became "LULUCF Regulation reporting", which is what the
  report attributes the duty to; and the Carbon Removals Certification Framework was removed
  from the carbon-farming row (it belongs to the row two barriers later, where it is already
  correctly listed).
- **Three descriptions claiming more than their quote.** The STEP row said the budget was
  too small "in closing the investment gap"; the report says it is too small to counter the
  risk that relaxed State aid rules **fragment the single market**. The biofuel-fraud row
  said "under RED III" where the report says only "biofuels". The modal-shift row named two
  of three instruments where the report names none.

**Not fixed, and worth knowing:** the `line NN` component of every reference is
**unverifiable** from a text extraction — line breaks do not reproduce the PDF's typeset
lines. Chapter and page are confirmed for all 66; the line numbers are not.

## 2. Indicator Check — metadata of 97 indicators

Verified against the report's own underlying-data workbook (`extract.json`) wherever the
report carries the figure, so these are not judgement calls:

| Fixed | Was | Now |
| --- | --- | --- |
| **B6 heat pumps target** | 60 million by 2030, "REPowerEU" | **41.5 million** — the figure the report's workbook carries, sourced to SWD(2022) 230 final, table 4. The 60 M is a derived total-stock reading, not the Commission objective. |
| **T5b ZEV lorries** | no target | 80 000 by 2030 (COM(2020) 562) — the report carries it; the seed dropped it |
| **A3 fertiliser use** | no target | 12.19 Mt N by 2030 (Farm to Fork) — likewise |
| **A3 (NUE) source link** | DOI `10.1093/jambio/lxac084` → *"Turfgrass-dependent mycotrophic change enhances soil deterioration"* | `10.5194/essd-16-525-2024` — Ludemann et al., the paper actually behind the series |
| **I7b / I7c sources** | "ESABCC project database" (does not exist) | Cembureau map of innovation projects / CEFIC low-carbon projects map |
| **B4 × 5 unit** | `% of 2005` on values of 1.0–1.13 — read as a percent that is a 99 % collapse | `index (2005 = 1.0)` |
| **I4 × 3 unit** | `t CO₂/t` on all-gas intensities | `t CO₂eq/t`, matching the A2 siblings |
| **I2 × 8 sources** | one blanket label crediting Eurofer *and* Cembureau *and* PRODCOM for every commodity | per commodity: Eurofer (steel), Cembureau (cement), Eurostat DS-056120/DS-059268 (chemicals) |
| **T2a/T2b/T3a/T3b** | "Eurostat Statistical Pocketbook" | DG MOVE publishes it, not Eurostat |
| **A4 pig × 3** | pointed at `apro_mt_lscatl`, which Eurostat resolves as **"Bovine population"** | `apro_mt_lspig` (herd) and `apro_mt_pann` (production) |
| **T6b link** | Eurostat SHARES page → **HTTP 404** | `nrg_ind_ren` databrowser |
| **I7a, B6 links** | stale redirects | followed to their current locations |
| **F5 name** | "Cleantech investment in the EU (public + private)" | "Cleantech venture & growth investment" — what the source measures |

**Flagged, not changed** (each is a judgement for the indicator owner):

- **A6 food waste** — the stored 65.5 kg mirrors the report, but the Farm-to-Fork halving it
  comes from applies to **retail and consumer levels only**, while the indicator's total
  includes primary production and processing. It is also superseded by the binding targets
  in Directive (EU) 2025/1892 (−10 % processing, −30 % per capita retail/food service/
  households vs the 2021–2023 average).
- **I3 circular material use** — 23.4 % is the correct CEAP doubling, but the Clean
  Industrial Deal raised it to 24 % by 2030.
- **F1 fossil subsidies** — the 2025 zero date has no Council act behind it; the 8th EAP says
  "without delay", undated, and the report's own figure carries no benchmark at all.
- **F3 GERD** — 3 % is right; the 2030 deadline comes from the 2021 ERA Pact, not the Lisbon
  agenda (whose deadline was 2010).
- **T4 / T5a** — the 2035 targets are in force but under live revision (COM(2025) 995).
- **39 of 97 indicators have no data after 2021**, worst T6b (2015) and two B4 series (2016).

## 3. Synergies & trade-offs — 20 entries

Every citation exists and matches Crossref on authors, journal, volume and DOI. The note's
own claim that citations were source-verified in July 2026 holds **for existence**. What
that pass did not test is whether each source supports the claim attached to it — and
several do not.

**Corrected in the data:**

- **`tr-iww-lowflow` — the entry asserted the opposite of its own source.** It said low
  Rhine water "diverted freight back to road and rail". Ademmer et al. test exactly that and
  find *"no evidence for a considerable increase in road and rail transportation … cannot be
  compensated by a noticeable shift"* — one extra low-water day raises rail transport by
  ~0.07 %. Rewritten around the paper's actual finding, which is stronger for the note's
  purpose: the loss is **not** absorbed by other modes, so it propagates into industrial
  output (−0.034 % per low-water day; ~−1 % in a 30-day low-water month; −1.5 %, ≈ −0.4 % of
  GDP, in November 2018). The 2022 episode is now attributed to EUCRA — Ademmer's sample
  ends in March 2019.
- **`ind-cement-cool-durable` — contradicted by its own citation.** Neither source mentions
  albedo, cool surfaces or urban heat islands; and on durability Habert et al. point the
  *other* way for the climate-exposed case, finding carbonation "deleterious for the
  durability" of reinforced concrete exposed to rain or high humidity. Retagged from
  **synergy to conditional** and rewritten to state both directions.
- **`tr-cars-ev-heat` — the headline mechanism had no cited support.** The full 488-page
  EUCRA text does not mention charging at all. The entry now rests on the mineral supply
  chain, which the sources genuinely support (≈80 % of Chilean copper from arid areas; the
  2022 Sichuan drought cutting lithium output; ~98 % EU rare-earth dependence on China).
- **`tr-aviation-heat-airports` — the European framing was contradicted by its source.**
  Coffel et al. name **London Heathrow and Paris Charles de Gaulle among the airports
  minimally affected**, and the 2015 companion study covers four US airports. Now states the
  real figures and that European exposure runs mainly through coastal siting, on EUCRA.
- **`ind-steel-scrap-circularity`** — the IEA's 2.2 vs 0.3 tCO₂/t pair is **direct + indirect**,
  not direct (direct-only is 1.2 vs 0.04), so "cuts direct CO₂ by 80–90 %" was mislabelled.
  Corrected, with Material Economics' conditionality on decarbonised electricity restored.
  The unsourced claim that EAF is markedly less water-intensive than the integrated route was
  removed — the roadmap gives only a sector-wide average.
- **`ind-cement-ccs-water`** — the 0.74–575 m³/tCO₂ range is driven by **CCS technology type**
  (the upper bound is BECCS including biomass evapotranspiration), not by "capture and
  cooling technology". Corrected, and the transfer of power-sector figures to cement kilns is
  now flagged as an inference.
- **`tr-cars-v2g-flex`** — retagged synergy → conditional, matching the entry's own text
  ("conditional on chargers, market rules and aggregation"); Kempton & Tomić support V2G as a
  grid resource and say nothing about climate stress.

**Flagged, not rewritten:** `tr-aviation-saf-land` cites a study that explicitly designs its
scenarios to *avoid* food competition; `tr-maritime-ports-exposed` cites a global study that
ranks European ports below five other regions; `ind-cement-adaptation-demand` has no
quantitative source for the adaptation-drives-cement-demand link;
`tr-xc-infrastructure-carbon` attributes an embodied-carbon channel to a paper whose stated
channel is operational energy; `ind-xc-electrification-grid` is filed under the circularity
subsector though it concerns electrification, and over-claims transmission-capacity loss from
a study that models plant derating.

## 4. Policy gaps — transport & industry

**All 17 statuses are correct.** What has decayed is the claim text, because the EU
legislated after the note was written:

- **`transport-extra-eu-exemption`** said "the review clauses have not changed the scope".
  On **17 July 2026** the Commission adopted **COM(2026) 616** finding CORSIA states cover
  <70 % of international aviation emissions and proposing to extend the ETS from 2029 to
  flights departing the EEA for aerodromes within 5 000 km of Frankfurt. Rewritten; status
  stays open (it is a proposal, and long-haul stays out). The maritime half was right.
- **`transport-modal-shift-freight`** omitted **Regulation (EU) 2026/1184** (20 May 2026),
  which repeals the Rail Freight Corridors Regulation from December 2030 and answers the
  report's finding head-on; and said the Commission "moved to withdraw" the Combined
  Transport Directive when it announced an *intention* in its 2026 Work Programme — the file
  has never been formally withdrawn. Both corrected, and TEN-T Art. 36(4)'s July-2028
  terminal-analysis deadline named in place of "addresses some ambition weaknesses".
- **`transport-zev-efficiency`** said the 2025/2026 review "is the moment to close it". It
  happened: **COM(2025) 995** of 16 December 2025 proposes super-credits for a "small
  affordable electric car" class — the first size/efficiency lever inside the ZEV segment.
- **`transport-modal-shift-implementation`** said the TEN-T deadlines "are not yet in force".
  The Regulation has **applied since 18 July 2024**; it is its milestones that have not
  fallen due.
- **`industry-ceap-upstream`** said ESPR pushes design and durability upstream "for the first
  time" — CEAP 2 (COM(2020) 98, March 2020) already did. The real reason the gap stays open
  is that the Circular Economy Act has not been tabled and no ESPR product-group delegated
  act has been adopted.
- **`cand-steel-lead-market` — the premise needed re-wording.** The Industrial Accelerator
  Act (COM(2026) 100, tabled 4 March 2026) **already sets binding thresholds** — ≥25 %
  low-carbon steel in publicly supported construction — but never says "near-zero". The
  candidate survives as "binding low-carbon procurement proposed, near-zero still
  unaddressed", not "no binding demand signal".
- **`cand-ind-electrification-enabling` — premise overtaken.** The European Grids Package
  (10 December 2025) and Electrification Action Plan (17 July 2026) address exactly what it
  says is missing. Now framed as a delivery gap to be tested in outcome terms.
- **`cand-rail-adaptation` — premise largely refuted.** Regulation (EU) 2024/1679 makes
  EIA-scope projects of common interest subject to climate proofing. Reframed as an
  implementation gap.
- **`cand-maritime-fueleu-conditions`** — the "~20 % contracted/installed by May 2025" figure
  **is not in the cited source**, which says 51 ports with 309 MW installed against a need to
  triple or quadruple by 2030. Corrected.
- Every other candidate gained the mid-2026 evidence base it was missing.

**Two dead or wrong citations were replaced**: a CER press release dated October 2024 cited
for a mid-2026 Council state, and a vendor blog whose central prediction has since been
falsified.

## What this pass did not settle

- **Line numbers** in the gap tracker's references (all 66) — not checkable from text.
- **Paywalled bodies**: Sharifi 2020 and 2021 were verified from abstracts only.
- **Anti-bot blocks**: EUR-Lex CELEX:52020SC0176, JRC DataM and the OECD indicator page all
  refuse automated clients — recorded as unverified, not as dead.
- The exact date and forum of Parliament's January-2026 rejection of the Combined Transport
  Directive withdrawal; the final article number of the TEN-T climate-proofing provision; and
  whether the July-2026 ETS review touches feedstock carbon.

One checker's finding was **rejected**: it reported that `kind: 'mixed'` is outside the
note's taxonomy. It is not — `mixed` is the stored value whose display label is
"Conditional". No change made.
