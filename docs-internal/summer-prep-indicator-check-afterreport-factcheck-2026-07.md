# Indicator Check — fact-check of all post-report data points (July 2026)

*Numerical verification of every `afterReport: true` data point served by the
Summer-Prep **Indicator Check** page (`/beta/summer-prep/indicator-check`).
The page reads the Policy Gap 2.0 workspace indicator database; migration
`055_backfill_indicator_points.sql` and the bundled seed
`src/data/esabcc-indicators.ts` were confirmed identical, so the seed file is
the record checked. 151 points across 52 series, verified against live primary
sources on 2026-07-22 (12 parallel verification agents; Eurostat/EEA via API,
non-API sources via web).*

This complements `indicator-check-data-provenance-audit-2026-07.md` (which
audited sources/links/freshness); this audit checks the **values** themselves.

> **Status update 2 (2026-07-23):** the report workbook's exact derivations
> were reverse-engineered (per request) and applied via migration 078:
> **O1** = net incl LULUCF + intl aviation + intl maritime (true ECL scope;
> reproduces the report 2005–2022 within 0.1–1.5 % — the gross basis assumed
> by the fact-check and migration 077 is 3–4 % off pre-2017) → 2023 = 3118.0,
> 2024 = 3043.2. **T1** = CRF1A3 + intl aviation, no maritime (matches report
> to 0.1–0.3 %) → 2023 = 918.4, 2024 = 934.7. **L7** = CRF4B+C+D+E+F, i.e.
> excluding harvested wood products → 121.0 / 135.6 / 123.0. **E6**: the
> report's CO₂e convention runs a *constant* ~9 % above env_air_gge CH4_CO2E —
> a convention difference, not an error; values kept, convention documented.
> **A4 herds**: the workbook's own source column says "EU GHG inventories
> (CRF tables)" — the app's values correctly continue that basis and only the
> source label was wrong (fixed); the earlier "WRONG (−21 %)" verdict is
> retracted. **L8** = GIC × BIOE (nrg_bal_c; reproduces the report 2010–2021
> within 1.4–3.4 %; the sector components are Eurostat's own split — industry
> & other sectors = solid biofuels+charcoal+biogases, transport = full BIOE)
> → 1698.0 / 1664.9 / 1663.5, replacing the ~6 %-high splice values.
> The refresh script's YoY-splice approach
> (scripts/esabcc-indicators/refresh-provenance.json) is what caused
> O1/T1/L7/L8 drift — consider refreshing these series by derivation, not
> splice.
>
> **Status update (same day):** the unambiguous fixes have been applied in
> `src/data/esabcc-indicators.ts` + migration
> `077_fix_factchecked_indicator_points.sql`: O1 2024 → 3017.2, steel 2025 →
> 126.2, cement 2025 removed, F5 rescaled to percent numbers, and the
> E4a/E4b/F1/F2-share source labels corrected. **Not** auto-fixed (need a
> definition decision, not a value overwrite): E6 methane (+10.7 % offset),
> L8 bioenergy (+6 %), bovine/pig herd (−21 %/−4 % vs Eurostat+FAOSTAT),
> L7 2022, T1 scope — see §1.

## Verdict key

- **CONFIRMED** — reproduces from the live primary source (≤2 % / ≤1 pp)
- **REVISION** — 2–5 % off, consistent with routine source back-revision
- **WRONG** — >5 % off, direction inverted, or no source figure exists
- **MISLABELLED** — value correct, but from a different source than the app cites

## Headline

**~85 % of the 151 points reproduce from their primary source, many exactly.**
The page's numbers are broadly trustworthy. The confirmed problems:

1. **O1 2024 (flagship) is wrong** — re-confirmed independently
2. **Bovine herd size is ~21 % below both Eurostat and FAOSTAT** (all 5 new points)
3. **E6 energy methane runs ~10.7 % high** (all 3 new points)
4. **Steel 2025 is a stale carry-forward**, cement 2025 has no published source
5. **F5 cleantech investment has a 100× unit bug** (fraction stored under a "%" label)
6. **E4a/E4b/F1/F2 values are right but the cited source is wrong**

---

## 1. Confirmed-wrong values

### O1 — Total EU GHG emissions, 2024 = 3222.1 ★
Independently re-verified (Eurostat `env_air_gge`, basis `TOTX4_MEMO`, which
matches the app's 2021/2022 baseline): live series is
2022 = 3359.6 → 2023 = 3088.3 → **2024 = 3017.2** — a −2.3 % *decrease*.
The app's 3222.1 is 6.8 % high **and shows an increase where the inventory
shows a decrease**, on every EU-total basis tested. 2023 = 3104.6 is fine
(0.5 %). Fix: 2024 ≈ 3017.

### A4 — Bovine herd size, all five points (2021–2025)
App: 59.5 / 58.79 / 57.97 / 56.5 / 56.26 M head.
Eurostat Dec survey (`apro_mt_lscatl`, A2000) **and** FAOSTAT (identical to
Eurostat): 75.71 / 74.81 / 73.76 / 71.90 / 71.58 M — the app runs a constant
**78.6 %** of the real total-bovine count. No natural subcategory (total cows,
adult cattle, excl-calves…) reproduces it. Note: the prior provenance audit's
"matches FAOSTAT" claim does not hold — FAOSTAT relays the Eurostat aggregate,
and both disagree with the app. Systematic, unexplained; needs a definition
check against the report workbook. (Pig herd shows a smaller constant −4.0 %
offset vs both sources — revision-band, but likely also a definitional slice;
dairy-cow herd matches the Dec survey exactly.)

### E6 — Energy-related methane, all three points (2022–2024)
App 64.46 / 60.05 / 57.77 vs live CRF1 CH₄ (CO₂e) 58.23 / 54.24 / 52.18 —
uniformly **+10.7 %**. Trend correct; pattern consistent with a GWP-vintage
(AR4 vs AR5) or scope mismatch, not a wrong base series. Worth recomputing
from the current inventory vintage.

### L8 — Total bioenergy use, all three points (2022–2024)
App ~6–7 % above live `nrg_bal_c` GIC × BIOE (1811.9/1766.3/1761.2 vs
1698.0/1664.9/1663.5). Direction matches; reads as a scope/vintage offset
(the app's pre-report baseline doesn't cleanly match GIC × BIOE either), but
exceeds revision tolerance — scope should be pinned down and documented.

### I2 steel 2025 = 128.8 — stale carry-forward
Identical to the 2024 value, but worldsteel's Dec-2025 release has EU crude
steel **falling ~2.6 % to ≈126.2 Mt** (Eurofer Mar-2026: ≈125.8 Mt). The
2025 point is a placeholder, not data. Fix: ≈126.2.

### I2 cement 2025 = 157.7 — no published source
No Cembureau/Cement Europe production figure for 2025 exists (latest is
2024 = 160.8 Mt). Directionally plausible, but the point cannot currently be
sourced; should be removed or marked estimated.

### L7 non-forest LULUCF 2022 = 101.2
Live CRF4 − CRF4A gives 84.4 (+16.6 %). 2023/2024 are revision-band
(2.4/3.9 %). The 2022 point looks like a pre-recalculation vintage.

### T1 transport GHG — level unexplained, trend right
2023 = 901.9 / 2024 = 920.0 sits between domestic-only CRF1A3 (~13 % lower)
and the full EEA definition incl. both bunkers (1040.8/1061.8, ~15 % higher);
no natural CRF combination reproduces the level. The 2023→2024 *increase* is
real (EEA: "+0.7 %"). Likely an intermediate scope (e.g. + intl aviation,
− maritime) inherited from the report workbook — verify and document, and
label the scope on the page.

## 2. Unit bug

### F5 — Cleantech investment, unit says "% of GDP"
Stored values 0.0007 / 0.0005 / 0.0004 are the raw *fractions* of GDP
(€11.6bn / €8.7bn / €8.2bn ÷ ~€17tn ≈ 0.07 % / 0.05 % / 0.04 %). Read
against the stated unit, the chart is off by ×100. Store 0.07/0.05/0.04, or
relabel the unit. (Values themselves check out against Cleantech for Europe
annual briefings, incl. full-year 2025.)

## 3. Right values, wrong source label (relabel, don't touch data)

| Series | Values actually from | App label |
|---|---|---|
| E4a solar additions 2023–25 (56 / 65.5 / 65.1 GW) | **SolarPower Europe, EU Market Outlook** (2025 is a reported actual — SPE 11 Dec 2025: "65.1 GW…first annual decline since 2016") | Eurostat (nrg_inf_epcrw) |
| E4b/c wind additions 2023–25 (16.2 / 12.9 / 15.1 GW) | **WindEurope annual statistics** (2025 actual) | Eurostat (nrg_inf_epcrw) |
| F1 fossil subsidies 2023 (€111bn) | **EC 2024 Report on Energy Subsidies in the EU** (COM(2025)17) | Fossil Fuel Subsidy Tracker (has no such EU roll-up) |
| F2 green-bond share 2023–24 (5.3 / 6.9 %) | **EEA "Green bonds in Europe"** (8th EAP indicator) | BloombergNEF |

On E4a/E4b specifically ("can this be true?"): **yes — the magnitudes are
genuine.** The EU really added ~56 GW solar in 2023 and ~65 GW/yr in
2024–2025. But Eurostat cannot be the source: `nrg_inf_epcrw` tops out at
2024 (refresh 2026-07-09), its implied net additions are 7–9 % lower for
solar, and for wind its 2023→2024 direction is *opposite* to
WindEurope/the app (Eurostat net-Δ 12.1→15.3 GW up; app 16.2→12.9 down —
net-of-decommissioning vs gross-installation difference). Relabel the
post-report points. Also reconcile with the separate IRENA-labelled
`solar-pv-additions`/`wind-additions` pair in `ecno-indicators.ts` (the
duplicate the page banner warns about), which carries different values.

## 4. Revision-band drift (acceptable; refresh when convenient)

- **O3** 2022/23 ~3.1 % above current Eurostat (back-revision; live 2024 =
  15 023.9 TWh is available to add)
- **E2 RES** 2024 (41.38 vs 42.75 — Eurostat revised 2024 generation up),
  **E3** 2024 (187.4 vs EEA 183)
- **L6** 2023/24 (~2.6 % vs −CRF4A1 proxy), **L7** 2023/24
- **Dairy production** (+1.7–1.8 % vs `apro_mk_farm` raw milk — consistent
  scope offset), **pig herd** (−4 %, see §1)

## 5. Clean — confirmed against live sources (no action)

O2 PEC & FEC (≤0.7 %), E1 (exact), I1 (exact), E2 fossil, I3 (exact incl.
2024), I5, I6, B2, B5a/B5b, T2a/T2b/T3b (exact), T4 (2023 final; 2024/2025
provisional EEA actuals, not forecasts), T5a (exact ACEA full-year shares
incl. 2025 = 17.4 %), B1 (matches CRF1A4 — note label is narrower than the
CRF1A4 scope), A1, A2 pig GHG + intensity (composite reproduces ≤1 %),
L1 (−215.5/−231.0 **exactly** match final CRF4; EEA's −198/−212 are earlier
proxy estimates — app is right), bovine & pig meat production 2021–2025
(exact, incl. published full-year 2025), dairy herd (exact), A6 food waste
(flat 129×3 is **genuinely** what live `env_wasfw` shows — not an artifact),
B6 heat-pump stock (EHPA 24M/25.5M; note 21→19-country coverage shift between
editions), B4 population index (≤0.003), F3 GERD (exact), I2 steel 2022–24,
I2 cement 2023–24. Chemicals production 2022–25: exact Mt not verifiable
(PRODCOM DS-056120 not on the public API) but the steep decline is
corroborated by Eurostat's chemicals production index (96.2→80.7, 2021=100).

## 6. Newer data now available (add when refreshing)

2024 exists live for: O3 (15 023.9 TWh), I5 (2506.3), I6 (33.31 %),
B2 (4033.9), B5a (~41.8 %), B5b (~31.25 %). Full-year 2025 exists for:
steel (126.2 Mt — replaces the placeholder), chemicals index. Not yet
published anywhere: 2025 for cement, dairy production, food waste,
`nrg_bal_peh` electricity mix, `nrg_inf_epcrw`.
