# How to access the Eurostat & EEA data

A practical guide to pulling the **primary source data** behind the
Indicator Database — the Eurostat dissemination API and the EEA
greenhouse-gas data viewer. This is what you need to fill the indicators
that the automated update **could not** retrieve (see
`docs/Indicator-Database-Post-Report-Update.pdf`), because those exact,
scope-matched figures live only in these two services.

> **Why the automated run came up short.** In the Claude Code web
> sandbox, outbound requests to `ec.europa.eu` and `eea.europa.eu` are
> blocked by the environment's network allowlist (they return
> `HTTP 403` / `Host not in allowlist`). The recipes below work from any
> **unrestricted machine**, from the **deployed app server**, or once
> those hosts are **added to the environment's allowlist**
> (see <https://code.claude.com/docs/en/claude-code-on-the-web>).

---

## 1. Eurostat — dissemination API (JSON-stat)

Eurostat publishes a free, key-less REST API returning JSON-stat 2.0.
This repo already speaks it in
`src/lib/project-workspace/eurostat.ts`.

**Base URL**
```
https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/<DATASET>
```

**Query pattern** — pin every dimension except `time` to a single code,
and the response collapses to a clean year→value series:
```
?format=JSON&lang=EN&geo=EU27_2020&<dim>=<code>&<dim>=<code>...
```

**Example — renewable energy share (`nrg_ind_ren`):**
```bash
curl -s 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nrg_ind_ren?format=JSON&geo=EU27_2020&nrg_bal=REN&unit=PC'
```

**Reading the response.** The interesting parts are
`dimension.time.category.index` (maps year → flat index) and `value`
(the numbers). If you pinned all other dimensions to one code each, the
series is one-dimensional and `value["0"], value["1"], …` line up with
the sorted years. The repo's `parseSeries()` in `eurostat.ts` does
exactly this — reuse it, or in Python:

```python
import requests
ds, filt = "nrg_ind_ren", {"geo":"EU27_2020","nrg_bal":"REN","unit":"PC"}
url = f"https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{ds}"
j = requests.get(url, params={"format":"JSON","lang":"EN", **filt}, timeout=30).json()
idx = j["dimension"]["time"]["category"]["index"]      # {"2010":0, ...}
val = j["value"]                                        # {"0":12.5, ...}
series = {int(y): val.get(str(i)) for y,i in idx.items() if val.get(str(i)) is not None}
print(sorted(series.items()))
```

**Finding dataset codes & dimension values**
- Data browser (human UI, shows the code in the URL):
  <https://ec.europa.eu/eurostat/databrowser/>
- Append `?format=JSON` and omit a dimension to see its allowed codes in
  the returned `dimension.<dim>.category` block.
- Units: `PC` = percent, `MTOE`, `GWH`, `TJ`, `THS_T`, etc. Convert to
  this repo's units (Mtoe×11.63 → TWh; PJ÷3.6 → TWh; shares stored as
  **fractions**, e.g. 0.42 not 42).
- Geo: always `EU27_2020` for the EU-27 aggregate used here.

**Bulk alternative.** For whole datasets use the bulk-download/SDMX
service linked from the data browser, or
`.../sdmx/2.1/data/<DATASET>/...`.

---

## 2. EEA — greenhouse-gas data viewer (the GHG inventory)

The headline emission indicators (O1, E1, E6, I1, T1, B1, A1, L1 and the
LULUCF sub-lines) come from the **EU GHG inventory**, exposed via the EEA
"greenhouse gases — data viewer". This repo pulls it in
`fetchEeaInventory()` (`src/lib/project-workspace/live-sources.ts`).

**Stable CSV download URL** (one row per year × sector × gas × country):
```
https://www.eea.europa.eu/en/datahub/datahubitem-view/3b7fe76c-524a-439a-bfd2-a6e4046302a2/download?format=csv&country=EU27
```

**How to slice it**
- Filter rows by **CRF sector code** (`sector_code`/`crf_code` column),
  matching a code *or* any of its sub-codes (`"1.A.1"` matches `1.A.1.a`…).
- Filter the **gas** column (`All greenhouse gases - (CO2 equivalent)`
  for CO₂-eq totals; or `CH4`, `N2O` for single gases).
- Sum the `emissions`/`value` column per year. For sinks, the value is
  already negative (apply `scale = -1` only if a registry entry says so).

**Browser/data-viewer UI** (to eyeball values & confirm vintage):
<https://www.eea.europa.eu/en/analysis/maps-and-charts/greenhouse-gases-viewer-data-viewers>

---

## 3. Other primary sources (no open API)

| Source | Used for | How to get it |
| --- | --- | --- |
| **EEA indicators** (`eea.europa.eu/en/analysis/indicators/…`) | E3 electricity GHG intensity; transport/agri/LULUCF narrative series | Indicator pages have a "Data sources / Download" link; otherwise read the figure table. |
| **DG MOVE — EU Transport in Figures (Statistical Pocketbook)** | T2a, T2b, T3a, T3b | Download the Excel: <https://transport.ec.europa.eu/facts-funding/studies-data/eu-transport-figures-statistical-pocketbook_en> |
| **EAFO** | T5a/T5b ZEV, recharging points | CSV via `…/european-union-eu27/electricity/vehicles-and-fleet?format=csv` (see `fetchEafo()`). |
| **IRENASTAT / SolarPower Europe / WindEurope** | E4a/E4b capacity additions | IRENA PXWeb, or the annual market-outlook reports. |
| **EHPA** | B6 heat-pump stock | Annual market report (no public API). |
| **OECD / BloombergNEF / Cleantech for Europe** | F2, F4, F5 | Publication PDFs / OECD.Stat. |

---

## 4. The shortcut: "Refresh from source" inside the app

When MethodHub runs **deployed** (server has open egress), the Indicator
Database has a **Refresh from source** button that performs the pulls
above server-side and upserts the new points — no manual API calls.

- Registered live sources live in
  `src/lib/project-workspace/live-sources.ts` (47 entries: Eurostat, EEA
  CRF slices, EAFO, IRENA, EHPA).
- **Note:** the registry is keyed by the **ECNO** indicator ids
  (`ghg-total-net`, `power-sector-ghg`, …), *not* the `esabcc-*` ids. To
  give an existing ESABCC indicator a refresh button, add an entry under
  its `esabcc-…` id (copy the matching ECNO recipe). The button only
  shows for ids where `hasLiveSource(id)` is true.

---

## 5. Recipes for the indicators left empty

Run these from an unrestricted host (or wire them into the registry).
CRF codes are summed from the **EEA GHG data-viewer CSV** (§2); dataset
codes query the **Eurostat API** (§1).

| Indicator | Source | Recipe |
| --- | --- | --- |
| **O1** Total GHG (Climate-Law scope) | EEA viewer | Total excl. LULUCF (CRF `1`+`2`+`3`+`4`*combustion*+`5`) **plus** memo international aviation + navigation; gas = CO₂-eq. |
| **E1** Energy supply GHG | EEA viewer | CRF `1.A.1` + `1.B`; CO₂-eq. |
| **E6** Energy methane | EEA viewer | CRF `1`; gas = `CH4` (as CO₂-eq). |
| **I1** Industry GHG | EEA viewer | CRF `1.A.2` + `2`; CO₂-eq. |
| **T1** Transport GHG | EEA viewer | CRF `1.A.3`; CO₂-eq. |
| **B1** Buildings GHG | EEA viewer | CRF `1.A.4`; CO₂-eq. |
| **A1** Agriculture non-CO₂ | EEA viewer | CRF `3`; gases `CH4`+`N2O`. |
| **L3/L4/L5** land areas | UNFCCC CRF tables | Activity-data (kha) from CRF Table 4.* — not in the emissions viewer; use the inventory submission tables. |
| **L6** forest biomass sink | EEA viewer | CRF `4.A` living-biomass pool; CO₂-eq. |
| **L7** non-forest LULUCF | EEA viewer | CRF `4` minus `4.A`; CO₂-eq. |
| **E2 (fossil/RES)** electricity mix | Eurostat | `nrg_bal_peh`, `geo=EU27_2020`, `unit=PC`; fossil `siec=CF`, RES from wind/solar/hydro/geo codes. |
| **E3** electricity GHG intensity | EEA | "GHG emission intensity of electricity generation, EU level" indicator. |
| **E5** electrification rate | Eurostat | `nrg_bal_s`, `nrg_bal=FC_E`, `siec=E7000`, `unit=PC` (electricity share of final energy). |
| **T6a** fossil transport share | Eurostat | `nrg_bal_c` transport fuels ÷ total transport energy. |
| **L8** total bioenergy | Eurostat | `nrg_bal_c`, sum of bio SIEC codes (`R5110-5150_W6000RI` etc.). |
| **A3 (use)** fertiliser N | Eurostat | `aei_fm_usefert`, `geo=EU27_2020`, nutrient = N. |
| **T2a/b, T3a/b** transport demand | DG MOVE | Statistical Pocketbook Excel (§3). |
| **T5b** zero-emission lorries | EAFO | vehicles-and-fleet CSV (§3). |
| **B6** heat-pump stock | EHPA | Market report; confirm EU-27 scope (vs 21-country totals). |
| **I4** intensities; **F2/F4/F5** | mixed | Derived ratios / publication PDFs — no open API. |

Once pulled, add points to `src/data/esabcc-indicators.ts` with
`afterReport: true` so they render as the latest (orange) values, and
record the source URL in the verification PDF.

---

*Maintained alongside the MethodHub codebase. The live-source recipes
mirror `src/lib/project-workspace/{eurostat.ts,live-sources.ts}` — keep
them in sync if the adapters change.*
