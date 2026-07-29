# Indicator Check — source refresh & unit fix (29 July 2026)

Follow-up to `indicator-check-data-provenance-audit-2026-07.md`. That audit
listed what was wrong and what was stale; this note records what was actually
pulled, how each new value was derived, and what is still blocked.

Scope: the 97 `esabcc-*` report series behind
`/beta/summer-prep/indicator-check` and the Policy Gap 2.0 Indicator Database.

## 1. The confirmed bug: F5 read +6566.7%

The page showed **Cleantech investment: report (2022) 0 → latest (2025) 0.04,
▲ 6566.7%**.

The module was doing its arithmetic correctly. The workspace database was not:
`esabcc-f-cleantech-investment` held its **pre**-report points as fractions
(2022 = `0.0006`) and its **post**-report points as percent-numbers
(2023 = `0.07`). The card compared `0.0006` against `0.04` — two different
units — and rendered the baseline as `0` because the display rounds to two
decimals.

Migrations `058` and `075` had already reconciled this fraction-vs-percent
split for twelve indicators, but both selected on `unit = '%'`. F5's unit
string is `'% of GDP'`, so it was never in either list.

The bundled TS series was correct throughout (`2022 = 0.06`). Only the DB rows
were wrong, which is why the drift was invisible in the repo.

**Fixed** by `082_realign_refreshed_indicator_points.sql`. F5 now reads
**0.06 (2022) → 0.04 (2025), ▼ 33.3%**.

This was the only unit error found. A full point-by-point diff of the live
database against the TS file turned up exactly two discrepancies — F5 and an
O2 (PEC) vintage drift — so nothing else of this kind is outstanding.

## 2. Baselines that are COVID troughs

With F5 corrected, the largest remaining number was **T3b intra-EU aviation at
+258%**. That figure is arithmetically right and still misleading: the last
value the report carried for T3b is **2020 = 177.9 Gpkm**, the lockdown year,
69.6% below 2019. Measuring 2025 against it reports the pandemic rebound, not
the trend.

Two indicators are affected — T3b and T2a (total passenger demand, baseline
2020, −26.0% vs 2019). E4a and E4b/c also have 2021 baselines, but *above*
their 2019 level (renewables additions genuinely grew), so re-basing those
would overstate the move rather than correct it.

The headline arithmetic is unchanged — it is the page's stated method. Cards
whose baseline sits more than 10% below the last pre-2020 reading now also
carry the change against that normal year:

| Code | Change vs report baseline | Change vs last pre-COVID year |
|---|---|---|
| T3b | +258.5% (vs 2020 = 177.9) | **+8.9%** (vs 2019 = 585.5) |
| T2a | +33.7% (vs 2020 = 4435.8) | **−1.0%** (vs 2019 = 5992.2) |

Implemented in `beta/modules/summer-prep/indicator-check/page.tsx`
(`readIndicator` → `preCovid`).

## 3. New data pulled from primary sources — first batch

Eight new recipes in `scripts/esabcc-indicators/refresh-from-sources.mjs`
(section 5 covers a second batch of seven). Every one passes the existing anchor
check — the value the source gives for the report's own last year reproduces the
report's figure.

| Code | Source & derivation | Anchor | Added |
|---|---|---|---|
| **O3** | `nrg_bal_c` GIC / all products, GWh ÷ 1000 → TWh. Direct. | 1.000× | realigned |
| **I5** | `nrg_bal_c` FC_IND_E (excl. non-energy use), GWh → TWh. Direct. | 1.010× | 2024 |
| **B2** | `nrg_bal_c` FC_OTH_HH_E + FC_OTH_CP_E, GWh → TWh. Spliced — the report's buildings boundary is ~7% wider than households + services. | 0.932× | 2024 (2022/23 revised) |
| **B5a** | fossil ÷ total in FC_OTH_HH_E, fossil = G3000 + O4000XBIO + C0000X0350-0370. Reproduces the report series to within 0.1 pp. | 1.001× | 2022, 2024 |
| **B5b** | same definition on FC_OTH_CP_E. | 0.951× | 2022, 2024 |
| **I4 (steel)** | `env_air_gge` CRF 2.C.1 process GHG ÷ `sts_inpr_a` NACE C241 production index. Spliced ratio — Mt ÷ index, so only the trend is used. | — | 2022–2024 |
| **I4 (cement)** | CRF 2.A.1 ÷ NACE C235, same construction. | — | 2022–2024 |
| **T3b** | `avia_paoc` passengers carried, national + intra-EU27 (`schedule=TOT`). | — | 2024, 2025 |

### T3b deserves its own note

DG MOVE's statistical pocketbook — the source the report used — has no API and
its published intra-EU passenger-km stop at 2023. Eurostat's own air-passenger
counts run to 2025, so passenger-km are proxied by **passengers carried**,
holding average stage length constant.

The proxy is validated on the overlap: passengers grew **+14.7%** from 2022 to
2023 where the pocketbook's Gpkm grew **+13.7%** — agreement to about 1 pp.
Double counting of intra-EU legs is constant across years and cancels in the
ratio.

Crucially, the pocketbook's **published 2022 and 2023 figures are kept**; only
2024 and 2025 are derived from them. This required a new `spliceFrom` option in
the refresh script — the default splice re-anchors on the report year and
regenerates every post-report point, which would have overwritten two published
DG MOVE values with proxy estimates ~1% off. `spliceFrom` anchors on a stored
later point and extends from there.

Result: **2024 = 625.9, 2025 = 637.8 Gpkm**.

## 4. Everything else was already current

The 41 pre-existing recipes were all re-run against their live sources. Every
one returned values identical to what the repo already held, so the refresh
changed nothing for them — they were already at the current vintage. The two
values that had drifted (O2 PEC 2023/2024) existed only in the database, not
the TS file, and are corrected by migration 082.

## 5. Second pass — sources that were written off too early

The first pass declared 40 series un-refreshable. Re-testing the *hard* routes
rather than the convenient ones recovered seven of them.

**FAOSTAT (6 indicators: A4 consumption ×3, A5 ×3).** The July audit hit
HTTP 521 on the JSON API at `fenixservices.fao.org` and stopped there. That host
is still down — but the **bulk ZIPs on `bulks-faostat.fao.org` are fine**, 4 MB
each, and carry FBS through 2023. Two wrinkles worth recording:

- FAOSTAT publishes **no EU-27 aggregate** in its regional files, so the EU-27
  is summed from member states here.
- **Cyprus is filed under Asia**, not Europe, so the Asia archive is fetched too.
  Summing only the Europe file silently drops a member state.
- Population is not repeated against each commodity — it sits on its own FBS
  "Population" item — so kcal/capita/day is computed as total EU-27 kcal ÷ total
  EU-27 population ÷ 365, on the aggregate. Averaging national per-capita
  figures would weight Malta like Germany.

**T6b (1 indicator).** Frozen at 2015 since the report because the SHARES
successor code was never pinned down. It is `nrg_ind_urtd`, siec **`R5280S`**
("Sustainable biofuels from food and feed crops"). The RED-II basis only starts
in 2021 so it never meets the 2015 anchor, but the levels agree — report 2015 =
118.1 TWh against source 2021 = 117.4 TWh — so it runs direct.

Routes tested and genuinely closed:

- **UNFCCC DI API** (`di.unfccc.int/api`) — plain `curl` returns HTTP 200 with an
  Imperva bot-protection challenge as the body, which is what this pass tested
  and wrongly concluded from. **Superseded by section 5b**: the Python client
  gets through, and four of the twelve series it covers are now automated.
- **OECD SDMX** (F4) — the structure endpoints work with the right `Accept`
  header, but the data endpoint on `DSD_GG@DF_GREEN_GROWTH` returns nothing
  parseable for any EU geography code tried.
- **PRODCOM** (I2 chemicals use/trade, I4 chemicals) — `ds-056120` is not on
  the JSON-stat dissemination API; it is a separate bulk facility.

## 5b. Third pass — the UNFCCC Data Interface

**My earlier "Imperva blocks it" verdict was wrong.** Plain `curl` against
`di.unfccc.int/api` gets a bot-protection challenge, which is what I tested and
concluded from. The `unfccc_di_api` Python client negotiates the session
properly and works from the same sandbox — 341,861 rows for party `EUA`.
`scripts/esabcc-indicators/pull-unfccc-di.py` reproduces the pull.

What that unlocked, and what it did not:

**A2 cattle ×4 — now automated.** DI carries the split Eurostat does not:
classifications `Dairy Cattle` / `Non-Dairy Cattle` under CRF 3.A and 3.B. On
its own it is not enough — **DI stops at 2021**, frozen when parties moved to the
ETF/CRT format, so it has nothing newer than the report. Combining does work:
take the current all-cattle total from Eurostat (`CRF3A1 + CRF3B1`, to 2024) and
allocate it by `head × emission factor`, with the factor ratio calibrated so 2021
reproduces the inventory's own 49.4% dairy share. Herd composition is what moves
this split, and Eurostat publishes both herds to 2025.

The ratio must be calibrated against **Eurostat** herd numbers, not taken from
DI's implied factors. DI counts 80.2 M cattle in 2021, Eurostat 75.7 M; a factor
derived on one basis does not transfer to the other, and using DI's directly
gives a 0.511 dairy share instead of the correct 0.494.

**L2 ×6, L3, L4, L5, A3 (use) — confirmed blocked, and now for a precise
reason.** DI has all of them, and its land areas reproduce the report to within
0.1% (forest 167.85 vs 167.7 million ha), so DI is definitively the right
source. It simply has no year beyond 2021. These nine are waiting on the EU's
2026 CRT submission being published in a machine-readable form — not on anyone
finding a source. Do not re-test DI for them.

Two caveats recorded for whoever picks this up: DI's `year` column contains the
literal `'Base year'` alongside numeric years, and the "Land Converted to X"
areas are the cumulative area under the 20-year conversion transition, not the
annual conversion rate L3/L4/L5 need — a naive read is ~20-36x too high.

## 6. Still not updatable, and why

29 series carry no post-report point. None is blocked by a missing recipe —
each is blocked by its source.

**No machine-readable source.** BSO / Odyssee-Mure (B4 ×4), BloombergNEF (F2),
Green Steel Tracker (I7a), Cembureau project map (I7b), CEFIC map (I7c),
Cembureau tonnage (I2 cement use), Eurofer tonnage (I2 steel use, steel trade),
JRC medium-term outlook (A7), OECD Green Growth (F4).

**Bulk file, not on the API.** I2 chemicals use and trade (PRODCOM DS-056120 /
DS-059268).

**Source has no newer year.** L2 ×6, L3, L4, L5, A3 (use) — see section 5b.
The UNFCCC DI has them and matches the report, but stops at 2021.

**Source series capped.** A3 (NUE) — Ludemann et al. ends at 2020. The citation
on file is also wrong: DOI `10.1093/jambio/lxac084` resolves to an unrelated
turfgrass-microbiology paper; the correct one is
`10.5194/essd-16-525-2024`. Still open.

**Deliberately not shipped.** I4 (chemicals). The derivation runs — CRF 2.B ÷
NACE C201 — but CRF 2.B covers the whole chemical industry while C201 is basic
chemicals only, and that mismatch produces a **+29% intensity rise by 2024**
that cannot be validated against the report's own DS-056120 tonnage
denominator.

## 7. Net effect on the page

| | Before | After |
|---|---|---|
| Indicators with post-report data | 55 | **68** |
| Series still frozen at their report vintage | 42 | **29** |
| Largest move | F5 +6566.7% (wrong) | T3b +258.5% (flagged, +8.9% vs 2019) |
| Rose / fell | 21 / 34 | 20 / 37 |

## 8. Files

- `scripts/esabcc-indicators/refresh-from-sources.mjs` — 19 new recipes (41 → 60); new `spliceFrom` option and a `faostat` recipe kind reading the FBS bulk ZIPs
- `src/data/esabcc-indicators.ts` — refreshed via the script, not hand-edited
- `supabase/migrations/082_realign_refreshed_indicator_points.sql` — 185 rows, 10 indicators, `do update`
- `supabase/migrations/055_backfill_indicator_points.sql` — regenerated (211 points / 68 indicators)
- `supabase/combined_migrations.sql` — both blocks synced
- `beta/modules/summer-prep/indicator-check/page.tsx` — COVID-baseline flag
- `scripts/esabcc-indicators/refresh-provenance.json` — per-value source URL and derivation

**Migration 082 must be applied for the site to show the corrected F5.** The
TS file is the seed and the preview fallback; production reads
`pw_indicator_points`.
