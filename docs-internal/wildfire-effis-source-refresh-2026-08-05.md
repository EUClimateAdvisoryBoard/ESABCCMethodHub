# Wildfires & the Land Sink (M·41) — EFFIS source refresh (5 August 2026)

Refresh of every 2026-season figure in the wildfire module against the live
Copernicus EFFIS API, and the addition of a script so the refresh is
reproducible rather than hand-applied. **No modelled value, parameter or
methodological choice was changed** — this pass only re-pulls observed data
that EFFIS has since revised.

Two artefacts carry 2026 numbers, fed by different endpoints, and both were
stale:

| Artefact | Was | Now |
|---|---|---|
| `beta/modules/wildfire-sink-risk/live.ts` — `FALLBACK_SEASON` | fetched 2026-07-30 | fetched 2026-08-05 |
| `beta/modules/wildfire-sink-risk/analyses/data.ts` — per-country `fires` | fetched 2026-08-04 | fetched 2026-08-05 |

## 1. The season is still anchored on week 30

EFFIS had not published week 31 at the time of the pull — week 31 closes on
2026-08-05, the refresh date itself. So `lastWeek` (30) and `lastDataDate`
(2026-07-29) are unchanged. **This refresh adds no new week; it carries
revisions to weeks already published.** That distinction matters for anyone
reading the season tracker: the season did not advance, the record of it did.

## 2. What EFFIS revised — five weeks, in both directions

| Week | Date | Was (ha) | Now (ha) | Δ |
|---|---|---|---|---|
| 26 | 2026-07-01 | 126,829 | 126,831 | +2 |
| 27 | 2026-07-08 | 165,311 | 165,317 | +6 |
| 28 | 2026-07-15 | 199,039 | **197,680** | −1,359 |
| 29 | 2026-07-22 | 386,840 | **383,607** | −3,233 |
| 30 | 2026-07-29 | 434,976 | **463,669** | **+28,693** |

Fire count at week 30: 1,407 → **1,443**. Weeks 1–25 and the unobserved
weeks 31–52 are unchanged, as is the whole 2006–25 min/avg/max envelope.

Two weeks were revised **down**. This is the documented behaviour of the
product — EFFIS maps fires above roughly 30 ha and re-attributes perimeters
between weeks as mapping completes — and it is worth recording explicitly
because a monotonically-rising correction would have been the easier story to
assume. The net effect on the season to date is +28,693 ha (+6.6%).

Headline figures moved with it:

- Rapid-damage-assessment estimate (`rda-stats`, includes fires not yet fully
  mapped): 521,353 → **568,355 ha**
- Cumulative CAMS wildfire CO₂: 17.98 → **18.37 MtCO₂**

## 3. Consequence for the year-end projection

The projection is computed, not stored, so it moves on its own. Recorded here
so the change is legible:

| Estimate | Was (ha) | Now (ha) |
|---|---|---|
| Season to date vs 2006–25 norm | 2.53× | **2.69×** |
| low (quietest remainder on record) | 480,562 | 509,255 |
| central (average remainder) | 651,414 | 680,107 |
| high (worst remainder on record) | 875,415 | 904,108 |
| proportional (keeps running at current multiple) | 981,741 | **1,046,501** |

The `proportional` estimate now crosses 1 Mha, i.e. it lands just above the
2025 EFFIS record (1,034,552 ha in this product). **That is a projection
crossing a threshold, not an observation**, and it should not be reported as
"2026 is on track to beat 2025" without the qualifier: it is the harshest of
the four estimates by construction, and the season's peak weeks are still
ahead.

## 4. Per-country 2026 rows

Nine of 27 Member States moved. All 2006–2025 rows and the EU-wide
`EU_ANNUAL` series reproduced **byte-identically** from the API, which is the
useful check here: it confirms the new script regenerates the existing file
faithfully, and that the historical series is stable.

| | Was (ha / fires) | Now (ha / fires) |
|---|---|---|
| Spain | 222,297 / 385 | 222,404 / 388 |
| Portugal | 51,909 / 157 | **50,670** / 158 |
| Italy | 73,519 / 341 | 74,290 / 350 |
| Greece | 30,063 / 33 | 30,624 / 33 |
| Romania | 12,344 / 107 | 12,705 / 111 |
| France | 92,793 / 337 | 92,891 / 337 |
| Croatia | 3,401 / 35 | 3,402 / 35 |
| Cyprus | 291 / 1 | 326 / 2 |
| Ireland | 2,541 / 14 | 2,574 / 15 |

Portugal revised down; the rest up.

## 5. Reproducibility — the gap this pass closed

`analyses/data.ts` was headed *GENERATED DATA, DO NOT HAND-EDIT THE NUMBERS*
but no generator existed, so the only way to honour that instruction was to
edit it by hand. Added `scripts/refresh-wildfire-effis-data.mjs`, which
rewrites in place only the machine-derived parts — `FETCHED_AT`,
`LAST_COMPLETE_YEAR`, each country's `fires` array, and `EU_ANNUAL` — and
never touches the Annex IIa figures, which are copied verbatim from the
Official Journal and have no API source. The Member State list is read back
out of the file rather than hard-coded, and each country's array is matched
anchored on its own `iso3` so rows cannot be written to the wrong Member
State. Failures are fatal rather than falling through to stale numbers.

## 6. The two products still disagree, and are still kept apart

Unchanged by this pass, restated because it is the module's main trap:

- JRC annual report (the module's headline 2021–25 series in `model.ts`):
  2025 = **1,079,538 ha**
- EFFIS weekly statistics product (`analyses/data.ts` `EU_ANNUAL`):
  2025 = **1,034,552 ha**

The full API-vs-report comparison, all five years:

| Year | JRC report (`model.ts`) | EFFIS weekly API |
|---|---|---|
| 2021 | 449,342 | 468,310 |
| 2022 | 837,212 | 785,497 |
| 2023 | 504,002 | 467,729 |
| 2024 | 419,298 | 383,317 |
| 2025 | 1,079,538 | 1,034,552 |

These are different products with different aggregation, not an error in
either. `model.ts` was therefore **left untouched**: overwriting the
JRC-report series with API values would silently mix two definitions and
break the sourcing documented in its header. Every within-product comparison
stays inside one product.

## 7. What this pass deliberately did not do

- **Did not add 2026 to `BURNT_AREA` in `model.ts`.** The 2026 season is at
  week 30 of 52 with its peak weeks (August–September) still ahead. Adding a
  part-year to a series of completed years would corrupt the five-year mean,
  the OLS trend and every downstream projection. The module's architecture
  already separates these — completed years in `model.ts`, the running season
  in `live.ts` — and that separation was respected.
- **Did not re-derive `LONG_RUN_MEAN` (550,000 ha).** It is inferred from the
  JRC's "nearly double the 2006–2024 average" phrasing, not published
  directly, and re-deriving it from the API product would import the product
  mismatch of §6 into the baseline subtraction.
- **Did not fact-check the model's parameters or the Annex IIa figures.** Out
  of scope for a source refresh; unchanged since their last pass.
- **Did not verify the 2025 Natura 2000 figure** (39%, 424,023 ha) quoted in
  `model.ts` and `METHODOLOGY.md` §6 — no endpoint in this pass covers it.
- **Did not refresh the WMS fire-map layers**, which are live-rendered and
  carry no stored values.

## 8. Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — **could not run**: no ESLint config is committed, so
  `next lint` drops into its interactive setup prompt. Pre-existing and
  unrelated to this change; CI (`.github/workflows/deploy.yml`) does not run
  lint either.
- Snapshot invariants checked directly: cumulative burnt area and fire count
  both monotone across the 30 observed weeks; headline fields equal to the
  last observed row; RDA estimate ≥ mapped area; season-to-date inside the
  historical annual maximum.
- Script re-run reproduces all 2006–2025 country rows and `EU_ANNUAL`
  unchanged.

**AI-compiled — pending human verification.** All figures are machine-pulled
from the open Copernicus EFFIS API on 2026-08-05; none are hand-entered.
In-season EFFIS values are provisional by nature and will move again.
