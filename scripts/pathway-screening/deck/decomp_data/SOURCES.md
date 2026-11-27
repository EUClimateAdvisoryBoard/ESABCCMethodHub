# Sources of the decomposition inputs (retrieved 26 Nov 2026)

AI-compiled — pending Secretariat verification. Full source table and audit trail:
`docs-internal/industry-decomposition-audit-2026-11-26.md`.

| File | Source |
|---|---|
| `emis_eurostat.json` | Eurostat `env_air_gge`, EU27_2020, MIO_T, GHG by CRF category: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/env_air_gge?geo=EU27_2020&unit=MIO_T&sinceTimePeriod=2005 (updated 2 Jun 2026; this is the EU 2026 inventory submission) |
| `crt_1A2g_subcategories.json` | EU CRT 2026, Table 1.A(a)s2, 1.A.2.g sub-categories: https://www.eea.europa.eu/en/analysis/publications/annual-european-union-greenhouse-gas-inventory-2026/eua_crt_2026.zip/@@download/file |
| `crt_activity_2005_2024.json` | EU CRT 2026, Table 2(I).A-H activity data (kt), same zip. Member State sums; confidential entries are excluded, so use the series for trends only. |
| `inpr_eurostat.json` | Eurostat `sts_inpr_a`, EU27_2020, I21, calendar adjusted: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_inpr_a |
| `scen_production_ecl.json` | Scenario production and steel/cement emissions for ECL pathways 1266 and 1275 (Schreyer et al. 2025, REMIND-EU, Zenodo 17132530 AllScenarioData.mif) and 2400 (JRC CETO 2024, POTEnCIA summary xlsx). Locators are in the file. |
| `../production_tonnes.json` | Crude steel: worldsteel 2005–2015 (EU28 minus UK) and Eurofer 2016–2024. Cement: CEMBUREAU. |
