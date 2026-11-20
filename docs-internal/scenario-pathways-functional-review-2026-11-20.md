# Scenarios (M · 55) — functional review, 2026-11-20

Pass: first build of the Scenarios main module (`/scenario-pathways`) from
the EEA export `EU_six_sectors_export.zip` (uploaded to the repository root
on 2026-11-20). AI-compiled — pending Secretariat verification.

## What was checked, and what each check proves

| # | Check | Result | What it proves |
|---|---|---|---|
| 1 | Python re-implementation of `variants.py` vs the export's 12 stage columns (`scripts/build-scenario-pathways.py`, runs on every build) | 15,936 / 15,936 codes match | The screening rules (thresholds, rounding of the window, margin, missing-value rule, JRC fallback) are read correctly from the export. |
| 2 | TypeScript port (`model.ts`) vs the same 12 columns, compiled and run in Node; repeated in the browser on every load | 15,936 / 15,936 | The browser port is equivalent to the Python rules. |
| 3 | Funnel for the advice setting | 1,328 → 1,318 → 131 → 106 → 89 → 64 | Equals `funnel_advice_setting.json` and deck slide 2. |
| 4 | Sector medians, advice setting (2030 / 2040 / 2050, and 2050 25–75 %) | Supply 462 / −47 / −183 (−319 to −110); industry 2050 −10 (−16 to 17); mobility 7 (1 to 19), n = 62; buildings 10 (4 to 19); agri-food 253 (246 to 394), n = 58; ecosystems −240 (−340 to −147), n = 62 | Equal to deck slides 4–9 after rounding to whole Mt; confirms percentile method (numpy linear). |
| 5 | EU net GHG median of the 64 | 2,049 / 437 / 4 (2030 / 2040 / 2050) | Equals deck slide 3. |
| 6 | Pathways per deck setting | 2 / 25 / 25 / 18 / 64 / 64 | Equals the n values of deck slide 12. |
| 7 | 2050 median across the six settings (supply) | −257 to −158 | Equals deck slide 4. |
| 8 | Levers, advice setting | Wind 392 → 3,450 TWh; solar 176 → 2,282 TWh; H₂ 0.06 → 4.3 EJ; mobility FE 14.6 → 6.8 EJ; buildings gas 5.0 → 0.54 EJ; CH₄ 7.9 → 5.8 Mt | Equal to deck slide 10. |
| 9 | Driver chart ranges, supply | CO₂ 2040 −589 to 111; electricity 4,040 to 7,911 TWh (advice setting) | Equal to `drv_supply.png`. |
| 10 | All four views rendered in Chromium with a moved setting (≤ 300 Mt, ≥ 80 %, +10 % margin → 120 pathways) | No console errors | The controls recompute every view; no check of the *content* of non-default settings is implied. |

## Deliberately not covered

- Settings other than the twelve of the export are **not** checked against
  any reference; the page labels them exploratory.
- Threshold **units** in the UI (Mt CO₂, EJ, %) are inferred from the
  variable definitions and data ranges, not from ESABCC (2023) Tables 5 and
  6 directly. The threshold **values** are the export's `TH`. A check of the
  units against the 2023 report is open for the Secretariat.
- Inventory reference lines in the lever charts use the constants of the
  export's `drivers.py` (e.g. 593.2 Mt for industry, CO₂ only), not the
  inventory CSV; not re-derived.
- No source value was edited; nothing here is a correction pass.

## Data handling

The export README marks Scenario Compass v2.0 data as under embargo. The
dataset is served from `public/data/scenario-pathways/`, which the site-auth
middleware gates, and is fetched at runtime rather than bundled into the
ungated `_next/static` JavaScript. The repository itself now holds the zip
and the derived JSON; whether that is compatible with the embargo depends on
the repository's visibility and is a decision for the owner.
