#!/usr/bin/env node
/**
 * Refresh the post-report ("afterReport") data points on the ESABCC report
 * indicators directly from the primary publishers.
 * ---------------------------------------------------------------------------
 * Runs in GitHub Actions (open network egress) — NOT in the Claude Code web
 * sandbox, where ec.europa.eu / eea.europa.eu are blocked by the network
 * allowlist. See docs/how-to-access-eurostat-eea-data.md.
 *
 * Per recipe below it:
 *   1. Pulls the EU-27 series from Eurostat (JSON-stat REST) or the EEA GHG
 *      data-viewer CSV (sliced by CRF sector code / gas).
 *   2. Converts to the unit/scale this repo stores (Mtoe×11.63→TWh, kt→Mt,
 *      percent÷100→fraction, …) and rounds to the stored precision.
 *   3. SANITY-CHECKS the pull against the indicator's own last report value
 *      (the "anchor"): if the freshly-fetched value for that same year is off
 *      by more than 2× (or flips sign for a non-trivial magnitude), the recipe
 *      is treated as a unit/scope mismatch and skipped — never written.
 *   4. Keeps only years AFTER the anchor year, flags them afterReport, and
 *      rewrites src/data/esabcc-indicators.ts (stripping the indicator's
 *      existing afterReport points first, so the script is idempotent and
 *      supersedes earlier hand-sourced estimates with exact API values).
 *   5. Writes scripts/esabcc-indicators/refresh-provenance.json for the PDF.
 *
 * The recipe table mirrors src/lib/project-workspace/{eurostat.ts,live-sources.ts}.
 * A recipe that errors, returns nothing, or fails the anchor check is skipped
 * (logged) — it never writes partial/garbage data. `--dry-run` fetches and
 * reports without touching the TS file.
 *
 * Usage:  node scripts/esabcc-indicators/refresh-from-sources.mjs [--dry-run]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const TS_FILE = join(ROOT, 'src', 'data', 'esabcc-indicators.ts');
const PROV_FILE = join(__dirname, 'refresh-provenance.json');
const DRY = process.argv.includes('--dry-run');

const EUROSTAT_BASE =
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
const EEA_CSV =
  'https://www.eea.europa.eu/en/datahub/datahubitem-view/' +
  '3b7fe76c-524a-439a-bfd2-a6e4046302a2/download?format=csv&country=EU27';

const MTOE_TO_TWH = 11.63; // 1 Mtoe = 1000 ktoe × 0.011630 TWh

/**
 * Recipes keyed by the esabcc-* indicator id. Extend this table to cover more
 * indicators — CI validates new recipes empirically (anchor check) on the
 * next run.
 *
 *  eurostat: { dataset, filters }                → JSON-stat series
 *  eea:      { crfCodes, sumGases? }              → GHG-viewer CSV slice (→Mt)
 *  toRepo:   (v) => v                             → unit conversion
 *  round:    decimals
 *  sourceUrl, sourceTitle, note                   → shown in the PDF
 */
export const RECIPES = {
  // ── Eurostat ──────────────────────────────────────────────────────────
  'esabcc-o2-pec': {
    kind: 'eurostat', dataset: 'nrg_ind_eff',
    // 2026-07: Eurostat renamed the EED headline codes (PEC2020-2030 → PEC_EED,
    // FEC2020-2030 → FEC_EED) with the EED-recast vintage. The old codes still
    // exist as empty dimensions, so the query returned 200-with-no-values and
    // the refresh silently reported "up-to-date" while the series stood still.
    filters: { geo: 'EU27_2020', nrg_bal: 'PEC_EED', unit: 'MTOE' },
    toRepo: v => v * MTOE_TO_TWH, round: 1,
    sourceUrl: `${EUROSTAT_BASE}/nrg_ind_eff?format=JSON&geo=EU27_2020&nrg_bal=PEC_EED&unit=MTOE`,
    sourceTitle: 'Eurostat nrg_ind_eff · primary energy consumption (PEC_EED) · EU27_2020',
    note: 'Mtoe×11.63→TWh.',
  },
  'esabcc-o2-fec': {
    kind: 'eurostat', dataset: 'nrg_ind_eff',
    filters: { geo: 'EU27_2020', nrg_bal: 'FEC_EED', unit: 'MTOE' },
    toRepo: v => v * MTOE_TO_TWH, round: 1,
    sourceUrl: `${EUROSTAT_BASE}/nrg_ind_eff?format=JSON&geo=EU27_2020&nrg_bal=FEC_EED&unit=MTOE`,
    sourceTitle: 'Eurostat nrg_ind_eff · final energy consumption (FEC_EED) · EU27_2020',
    note: 'Mtoe×11.63→TWh.',
  },
  // 2026-07: nrg_bal_s no longer serves these shares as ready-made PC values
  // (the query returns 200 with an empty value set), so both are computed from
  // the nrg_bal_c energy balance itself — electricity over total final energy,
  // in GWh. Ratio recipes run in splice mode: the ×100 and any scope offset
  // cancel in the year-on-year ratio.
  'esabcc-e5-electrification': {
    kind: 'eurostat-ratio', round: 2, mode: 'splice',
    num: {
      dataset: 'nrg_bal_c',
      legs: [{ geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'FC_E', siec: 'E7000' }],
    },
    den: {
      dataset: 'nrg_bal_c',
      legs: [{ geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'FC_E', siec: 'TOTAL' }],
    },
    sourceUrl: `${EUROSTAT_BASE}/nrg_bal_c?format=JSON&geo=EU27_2020&nrg_bal=FC_E&siec=E7000&unit=GWH`,
    sourceTitle: 'Eurostat nrg_bal_c · electricity ÷ total final energy consumption · EU27_2020',
    note: 'Stored as percent-number to match ECNO duplicate end-use-electrification.',
  },
  'esabcc-i6-industry-electrification': {
    kind: 'eurostat-ratio', round: 2, mode: 'splice',
    num: {
      dataset: 'nrg_bal_c',
      legs: [{ geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'FC_IND_E', siec: 'E7000' }],
    },
    den: {
      dataset: 'nrg_bal_c',
      legs: [{ geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'FC_IND_E', siec: 'TOTAL' }],
    },
    sourceUrl: `${EUROSTAT_BASE}/nrg_bal_c?format=JSON&geo=EU27_2020&nrg_bal=FC_IND_E&siec=E7000&unit=GWH`,
    sourceTitle: 'Eurostat nrg_bal_c · industry electricity ÷ industry final energy · EU27_2020',
    note: 'Stored as percent-number to match ECNO duplicate industry-electrification.',
  },
  'esabcc-i3-circular-mat-use': {
    kind: 'eurostat', dataset: 'cei_srm030',
    filters: { geo: 'EU27_2020', unit: 'PC' },
    toRepo: v => v, round: 1,
    sourceUrl: `${EUROSTAT_BASE}/cei_srm030?format=JSON&geo=EU27_2020&unit=PC`,
    sourceTitle: 'Eurostat cei_srm030 · circular material use rate · EU27_2020',
    note: 'Stored as percent-number — the TS series was rescaled ×100 (WP6 unit fix); the old ÷100 recipe failed its anchor check ever since. DB rows realigned by migration 075.',
  },
  'esabcc-f-gerd': {
    kind: 'eurostat', dataset: 'rd_e_gerdtot',
    filters: { geo: 'EU27_2020', sectperf: 'TOTAL', unit: 'PC_GDP' },
    toRepo: v => v, round: 2,
    sourceUrl: `${EUROSTAT_BASE}/rd_e_gerdtot?format=JSON&geo=EU27_2020&sectperf=TOTAL&unit=PC_GDP`,
    sourceTitle: 'Eurostat rd_e_gerdtot · GERD as % of GDP · EU27_2020',
    note: 'Stored as percent of GDP. Publisher may revise the report’s base year (vintage).',
  },

  // ── Energy-balance series that were still frozen at their 2023 vintage
  //    (July 2026 audit §4). All five reconcile against the report anchor
  //    straight out of nrg_bal_c, so they only ever lacked a recipe.
  'esabcc-o3-gross-inland': {
    kind: 'eurostat', dataset: 'nrg_bal_c',
    filters: { geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'GIC', siec: 'TOTAL' },
    toRepo: v => v / 1000, round: 1,
    sourceUrl: `${EUROSTAT_BASE}/nrg_bal_c?format=JSON&geo=EU27_2020&unit=GWH&nrg_bal=GIC&siec=TOTAL`,
    sourceTitle: 'Eurostat nrg_bal_c · gross inland consumption, all products · EU27_2020',
    note: 'GWh→TWh (÷1000). Direct — reproduces the report anchor 2021 at 1.000×.',
  },
  'esabcc-i5-industry-fec': {
    kind: 'eurostat', dataset: 'nrg_bal_c',
    filters: { geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'FC_IND_E', siec: 'TOTAL' },
    toRepo: v => v / 1000, round: 1,
    sourceUrl: `${EUROSTAT_BASE}/nrg_bal_c?format=JSON&geo=EU27_2020&unit=GWH&nrg_bal=FC_IND_E&siec=TOTAL`,
    sourceTitle: 'Eurostat nrg_bal_c · industry final energy consumption (energy use) · EU27_2020',
    note: 'GWh→TWh (÷1000). Direct (anchor 2021 1.010×). FC_IND_E excludes non-energy use, matching the report definition.',
  },
  'esabcc-b2-buildings-fec': {
    kind: 'eurostat', dataset: 'nrg_bal_c', round: 1, mode: 'splice',
    sumFilters: [
      { geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'FC_OTH_HH_E', siec: 'TOTAL' },
      { geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'FC_OTH_CP_E', siec: 'TOTAL' },
    ],
    sourceUrl: `${EUROSTAT_BASE}/nrg_bal_c?format=JSON&geo=EU27_2020&unit=GWH&nrg_bal=FC_OTH_HH_E&siec=TOTAL`,
    sourceTitle: 'Eurostat nrg_bal_c · residential (FC_OTH_HH_E) + services (FC_OTH_CP_E) final energy · EU27_2020',
    note: 'Spliced: the report’s buildings boundary is ~7% wider than households+services alone (anchor 2021 0.932×), so only the year-on-year change is applied to the report baseline.',
  },
  'esabcc-b5a-residential-fossil-share': {
    kind: 'eurostat-ratio', round: 2, mode: 'splice',
    num: {
      dataset: 'nrg_bal_c',
      legs: ['G3000', 'O4000XBIO', 'C0000X0350-0370'].map(siec => (
        { geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'FC_OTH_HH_E', siec })),
    },
    den: {
      dataset: 'nrg_bal_c',
      legs: [{ geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'FC_OTH_HH_E', siec: 'TOTAL' }],
    },
    sourceUrl: `${EUROSTAT_BASE}/nrg_bal_c?format=JSON&geo=EU27_2020&unit=GWH&nrg_bal=FC_OTH_HH_E`,
    sourceTitle: 'Eurostat nrg_bal_c · fossil (gas + oil excl. bio + solid) ÷ total residential final energy · EU27_2020',
    note: 'Fossil = natural gas (G3000) + oil excl. biofuels (O4000XBIO) + solid fossil (C0000X0350-0370). Reproduces the report series to within 0.1 pp (anchor 2021 1.001×); spliced to hold the report baseline exactly.',
  },
  'esabcc-b5b-tertiary-fossil-share': {
    kind: 'eurostat-ratio', round: 2, mode: 'splice',
    num: {
      dataset: 'nrg_bal_c',
      legs: ['G3000', 'O4000XBIO', 'C0000X0350-0370'].map(siec => (
        { geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'FC_OTH_CP_E', siec })),
    },
    den: {
      dataset: 'nrg_bal_c',
      legs: [{ geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'FC_OTH_CP_E', siec: 'TOTAL' }],
    },
    sourceUrl: `${EUROSTAT_BASE}/nrg_bal_c?format=JSON&geo=EU27_2020&unit=GWH&nrg_bal=FC_OTH_CP_E`,
    sourceTitle: 'Eurostat nrg_bal_c · fossil (gas + oil excl. bio + solid) ÷ total services final energy · EU27_2020',
    note: 'Same fossil definition as B5a. The report’s tertiary boundary sits ~1.9 pp above FC_OTH_CP_E (anchor 2021 0.951×), so the trend is spliced onto the report baseline rather than taken as a level.',
  },

  // ── Industry emission intensity = process GHG ÷ production volume. Both
  //    inputs now run to 2024, so I4 no longer has to sit at its 2021 vintage.
  //    Ratio recipes are splice-only by design: the numerator is in Mt CO₂-eq
  //    and the denominator is an index (2021 = 100), so the level is
  //    meaningless and only the year-on-year trend is applied to the report
  //    baseline. The denominators are the same NACE classes the I2 production
  //    recipes above already use.
  //
  //    I4 (chemicals) is deliberately NOT wired: CRF 2.B covers the whole
  //    chemical industry while NACE C201 is basic chemicals only, and that
  //    scope mismatch yields a +29% intensity rise by 2024 that cannot be
  //    validated against the report's own DS-056120 tonnage denominator.
  //    It stays at its 2022 report value until that denominator is sourced.
  'esabcc-i4-steel-ghg-intensity': {
    kind: 'eurostat-ratio', round: 4, mode: 'splice',
    num: {
      dataset: 'env_air_gge',
      legs: [{ geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF2C1' }],
    },
    den: {
      dataset: 'sts_inpr_a',
      legs: [{ geo: 'EU27_2020', indic_bt: 'PRD', s_adj: 'CA', unit: 'I21', nace_r2: 'C241' }],
    },
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=CRF2C1`,
    sourceTitle: 'Eurostat env_air_gge CRF 2.C.1 iron & steel process GHG ÷ sts_inpr_a NACE C241 production index · EU27_2020',
    note: 'Spliced ratio: process-emission intensity trend (2024 ≈ 0.947× the 2021 level) applied to the report baseline. Level is not sourced — Mt ÷ index cancels in the year-on-year ratio.',
  },
  'esabcc-i4-cement-ghg-intensity': {
    kind: 'eurostat-ratio', round: 4, mode: 'splice',
    num: {
      dataset: 'env_air_gge',
      legs: [{ geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF2A1' }],
    },
    den: {
      dataset: 'sts_inpr_a',
      legs: [{ geo: 'EU27_2020', indic_bt: 'PRD', s_adj: 'CA', unit: 'I21', nace_r2: 'C235' }],
    },
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=CRF2A1`,
    sourceTitle: 'Eurostat env_air_gge CRF 2.A.1 cement-production process GHG ÷ sts_inpr_a NACE C235 production index · EU27_2020',
    note: 'Spliced ratio: clinker-process intensity trend (2024 ≈ 0.930× the 2021 level) applied to the report baseline. Same C235 denominator as the I2 cement-production recipe.',
  },

  // ── Transport demand: the report source (DG MOVE statistical pocketbook) has
  //    no API and its published intra-EU passenger-km stop at 2023. Eurostat's
  //    own air-passenger counts run to 2025, so the pocketbook figures are KEPT
  //    and only the two new years are derived from them (`spliceFrom`).
  'esabcc-t3b-air-passenger': {
    kind: 'eurostat', dataset: 'avia_paoc', round: 1, mode: 'splice', spliceFrom: 2023,
    sumFilters: [
      { geo: 'EU27_2020', freq: 'A', unit: 'PAS', tra_meas: 'PAS_CRD', tra_cov: 'NAT', schedule: 'TOT' },
      { geo: 'EU27_2020', freq: 'A', unit: 'PAS', tra_meas: 'PAS_CRD', tra_cov: 'INTL_IEU27_2020', schedule: 'TOT' },
    ],
    sourceUrl: `${EUROSTAT_BASE}/avia_paoc?format=JSON&geo=EU27_2020&unit=PAS&tra_meas=PAS_CRD&tra_cov=INTL_IEU27_2020&schedule=TOT`,
    sourceTitle: 'Eurostat avia_paoc · passengers carried on national + intra-EU27 flights · EU27_2020',
    note: 'Passenger-km proxied by passengers carried: the pocketbook’s published 2022/2023 Gpkm are kept and 2024/2025 derived from the year-on-year change in intra-EU passengers (constant average stage length). Validated on the overlap — passenger growth 2022→2023 (+14.7%) matches the pocketbook’s Gpkm growth (+13.7%) to ~1 pp. Double counting of intra-EU legs is constant and cancels in the ratio.',
  },

  // ── EU GHG inventory via Eurostat env_air_gge (CO₂-eq, MIO_T = Mt) ────────
  // The EEA data-viewer "download?format=csv" URL returns HTML, not CSV, so we
  // pull the same inventory from Eurostat's env_air_gge (GHG by CRF source
  // sector) over the proven JSON-stat path. src_crf/airpol codes are
  // best-effort; the anchor check skips any that don't reconcile.
  'esabcc-e1-energy-supply-ghg': {
    kind: 'eurostat', dataset: 'env_air_gge', round: 1,
    sumFilters: [
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF1A1' },
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF1B' },
    ],
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=CRF1A1`,
    sourceTitle: 'Eurostat env_air_gge · CRF 1.A.1 + 1.B (energy supply) · EU27_2020',
    note: 'Public power/heat + fugitive emissions; CO₂-eq (Mt).',
  },
  'esabcc-i1-industry-ghg': {
    kind: 'eurostat', dataset: 'env_air_gge', round: 1,
    sumFilters: [
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF1A2' },
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF2' },
    ],
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=CRF1A2`,
    sourceTitle: 'Eurostat env_air_gge · CRF 1.A.2 + 2 (industry energy + processes) · EU27_2020',
    note: 'CO₂-eq (Mt).',
  },
  'esabcc-b1-buildings-ghg': {
    kind: 'eurostat', dataset: 'env_air_gge', round: 1,
    filters: { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF1A4' },
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=CRF1A4`,
    sourceTitle: 'Eurostat env_air_gge · CRF 1.A.4 (residential + commercial) · EU27_2020',
    note: 'CO₂-eq (Mt).',
  },
  // These three use SPLICE mode: the live source is on a different scale than
  // the report baseline, so we apply its year-on-year change to the report's
  // absolute value rather than overwriting the level (run #3 showed why).
  'esabcc-t1-transport-ghg': {
    // env_air_gge CRF 1.A.3 (domestic) is ~12% below the report's transport
    // series; splicing its trend onto the report baseline avoids the cliff.
    // Add international aviation/navigation memo legs so the trend captures the
    // aviation rebound (failed legs are skipped automatically).
    kind: 'eurostat', dataset: 'env_air_gge', round: 1, mode: 'splice',
    sumFilters: [
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF1A3' },
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF1D1A' },
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF1D1B' },
    ],
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=CRF1A3`,
    sourceTitle: 'Eurostat env_air_gge · CRF 1.A.3 + intl aviation/navigation (1.D.1.a/b) · EU27_2020',
    note: 'Spliced: report baseline × env_air_gge transport YoY change (report scope includes international transport).',
  },
  'esabcc-a1-agri-nonco2': {
    // env_air_gge airpol=CH4/N2O is gas MASS, not CO₂-eq. GWP-weight the legs
    // (AR5 GWP100: CH₄≈28, N₂O≈265) to get a CO₂-eq-proxy trend, then splice
    // onto the report's CO₂-eq baseline.
    kind: 'eurostat', dataset: 'env_air_gge', round: 1, mode: 'splice',
    sumFilters: [
      { f: { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'CH4', src_crf: 'CRF3' }, w: 28 },
      { f: { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'N2O', src_crf: 'CRF3' }, w: 265 },
    ],
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=CH4&src_crf=CRF3`,
    sourceTitle: 'Eurostat env_air_gge · CRF 3 CH₄+N₂O (GWP-weighted) · EU27_2020',
    note: 'Spliced: GWP-weighted (CH₄×28 + N₂O×265) YoY change × report CO₂-eq baseline.',
  },
  'esabcc-e6-energy-ch4': {
    // CH₄ mass YoY change == CO₂-eq YoY change (constant GWP), so splice the
    // single-gas mass trend onto the report's CO₂-eq baseline.
    kind: 'eurostat', dataset: 'env_air_gge', round: 2, mode: 'splice',
    filters: { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'CH4', src_crf: 'CRF1' },
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=CH4&src_crf=CRF1`,
    sourceTitle: 'Eurostat env_air_gge · CRF 1 energy CH₄ · EU27_2020',
    note: 'Spliced: energy-sector CH₄ mass YoY change × report CO₂-eq baseline.',
  },
  'esabcc-l1-lulucf-net': {
    kind: 'eurostat', dataset: 'env_air_gge', round: 1,
    filters: { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF4' },
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=CRF4`,
    sourceTitle: 'Eurostat env_air_gge · CRF 4 (LULUCF) net · EU27_2020',
    note: 'Net sink is negative. Subject to inventory-vintage revision vs the report base year.',
  },

  // ── Coverage extension (July 2026): previously-stale indicators ─────────
  // All splice-mode unless the source matches the report scope exactly, so a
  // scope/level offset can never step the series — only the source's own
  // year-on-year movement is applied to the report baseline.
  'esabcc-o1-ghg-total': {
    // Report scope = European Climate Law: net total incl LULUCF (TOTXMEMO)
    // plus international aviation (1.D.1.a) and international navigation
    // (1.D.1.b) — the report's own basis (postreport-recipes.mjs
    // REPORT_EXACT, migration 078), a direct sum with NO splice: it
    // reproduces the report 2005-2022 within 0.1-1.5%. The previous
    // src_crf=TOTX4_MEMONIA leg does not exist in env_air_gge (0 values,
    // HTTP 200 — caught by the global empty-fetch guard now), which had
    // silently degraded the old splice to the CRF1D1B (maritime-only) leg.
    kind: 'eurostat', dataset: 'env_air_gge', round: 1,
    sumFilters: ['TOTXMEMO', 'CRF1D1A', 'CRF1D1B'].map(src_crf => (
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf })),
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=TOTXMEMO`,
    sourceTitle: 'Eurostat env_air_gge · net total incl. LULUCF (TOTXMEMO) + international aviation (1.D.1.a) + international navigation (1.D.1.b) · EU27_2020',
    note: 'Direct sum (no splice), reproduces the report 2005-2022 within 0.1-1.5%.',
  },
  'esabcc-e2-fossil-power-share': {
    // Fossil share of gross electricity production: fossil siec legs over
    // TOTAL, both from nrg_bal_peh (GWh). Ratio → percent; spliced.
    kind: 'eurostat-ratio', round: 2, mode: 'splice',
    num: {
      dataset: 'nrg_bal_peh',
      legs: ['C0000X0350-0370', 'P1000', 'S2000', 'O4000XBIO', 'G3000'].map(siec => (
        { geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'GEP', siec })),
    },
    den: {
      dataset: 'nrg_bal_peh',
      legs: [{ geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'GEP', siec: 'TOTAL' }],
    },
    sourceUrl: `${EUROSTAT_BASE}/nrg_bal_peh?format=JSON&geo=EU27_2020&unit=GWH&nrg_bal=GEP`,
    sourceTitle: 'Eurostat nrg_bal_peh · fossil ÷ total gross electricity production · EU27_2020',
    note: 'Spliced ratio: (solid fossil + peat + oil shale + oil + gas) ÷ TOTAL, YoY change × report baseline.',
  },
  'esabcc-e2-res-noBio-power-share': {
    kind: 'eurostat-ratio', round: 2, mode: 'splice',
    num: {
      dataset: 'nrg_bal_peh',
      // 2026-07: siec RA400 (solar, aggregate) is no longer served — Eurostat
      // splits it into RA410 solar thermal / RA420 solar PV. RA500 adds
      // tide/wave, the remaining non-biomass renewable.
      legs: ['RA100', 'RA200', 'RA300', 'RA410', 'RA420', 'RA500'].map(siec => (
        { geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'GEP', siec })),
    },
    den: {
      dataset: 'nrg_bal_peh',
      legs: [{ geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'GEP', siec: 'TOTAL' }],
    },
    sourceUrl: `${EUROSTAT_BASE}/nrg_bal_peh?format=JSON&geo=EU27_2020&unit=GWH&nrg_bal=GEP`,
    sourceTitle: 'Eurostat nrg_bal_peh · (hydro + geothermal + wind + solar thermal + solar PV + tide) ÷ total gross electricity production · EU27_2020',
    note: 'Spliced ratio: non-biomass renewables ÷ TOTAL, YoY change × report baseline.',
  },
  'esabcc-e3-grid-co2-intensity': {
    // Proxy for the EEA electricity-intensity indicator (no API): CRF 1.A.1.a
    // is unavailable at aggregate level, so use CRF 1.A.1 emissions over gross
    // electricity production. The level is NOT g/kWh (includes refineries and
    // heat output) — splice-only, the offset cancels in the YoY ratio.
    kind: 'eurostat-ratio', round: 1, mode: 'splice',
    num: {
      dataset: 'env_air_gge',
      legs: [{ geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF1A1' }],
    },
    den: {
      dataset: 'nrg_bal_peh',
      legs: [{ geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'GEP', siec: 'TOTAL' }],
    },
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=CRF1A1`,
    sourceTitle: 'Eurostat env_air_gge CRF 1.A.1 ÷ nrg_bal_peh gross electricity production · EU27_2020',
    note: 'Spliced trend proxy for the EEA intensity indicator; hand-check against the EEA-published value when available.',
  },
  'esabcc-t3a-road-share-passenger': {
    // 2026-07: Eurostat retired the combined CAR_BUS_TOT vehicle code (query
    // now returns HTTP 200 with an empty `vehicle` dimension — caught by the
    // global empty-fetch guard) and split it into separate CAR / BUS_TOT
    // codes. Sum both legs to reconstruct the old combined series.
    kind: 'eurostat', dataset: 'tran_hv_psmod', round: 2, mode: 'splice',
    sumFilters: ['CAR', 'BUS_TOT'].map(vehicle => (
      { geo: 'EU27_2020', unit: 'PC', vehicle })),
    sourceUrl: `${EUROSTAT_BASE}/tran_hv_psmod?format=JSON&geo=EU27_2020&unit=PC&vehicle=CAR`,
    sourceTitle: 'Eurostat tran_hv_psmod · car + bus/coach share of inland passenger transport (CAR + BUS_TOT) · EU27_2020',
    note: 'Spliced: Eurostat renamed/split the combined CAR_BUS_TOT vehicle code into separate CAR and BUS_TOT codes (2026-07); recipe now sums both legs. Eurostat modal-split scope (car+bus vs report car+two-wheeler) differs slightly; YoY change × report baseline.',
  },
  'esabcc-t5b-zev-lorries-stock': {
    // 2026-07: vehicle code LOR_HVY does not exist in road_eqs_lormot (0
    // values, HTTP 200 — the same silent-empty bug class that broke O1/T3a,
    // now caught by the global empty-fetch guard). The correct code is
    // LOR_GT3P5, but its fetched level (5425 @2022) is 1.43x the report's own
    // 2022 baseline (3794) — a real scope gap (Eurostat's "battery-electric
    // lorries >3.5t" vs the report's broader zero-emission-lorries figure).
    // Direct/anchor-checked mode would accept that 1.43x (within the 2x
    // tolerance) and overwrite the series with the mismatched-scope Eurostat
    // level, so use splice mode instead: trend only, applied to the report
    // baseline.
    kind: 'eurostat', dataset: 'road_eqs_lormot', round: 0, mode: 'splice',
    filters: { geo: 'EU27_2020', unit: 'NR', vehicle: 'LOR_GT3P5', mot_nrg: 'ELC' },
    sourceUrl: `${EUROSTAT_BASE}/road_eqs_lormot?format=JSON&geo=EU27_2020&unit=NR&vehicle=LOR_GT3P5&mot_nrg=ELC`,
    sourceTitle: 'Eurostat road_eqs_lormot · battery-electric lorries >3.5t in the fleet (LOR_GT3P5) · EU27_2020',
    note: 'Spliced: Eurostat vehicle code LOR_HVY no longer exists; corrected code LOR_GT3P5 is on a narrower/different scope than the report\'s zero-emission-lorries figure (2022 Eurostat level 5425 vs report baseline 3794, 1.43x) — trend only, YoY change × report baseline.',
  },
  'esabcc-t6a-fossil-transport-share': {
    kind: 'eurostat-ratio', round: 2, mode: 'splice',
    num: {
      dataset: 'nrg_bal_s',
      legs: ['O4000XBIO', 'G3000', 'C0000X0350-0370'].map(siec => (
        { geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'FC_TRA_E', siec })),
    },
    den: {
      dataset: 'nrg_bal_s',
      legs: [{ geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'FC_TRA_E', siec: 'TOTAL' }],
    },
    sourceUrl: `${EUROSTAT_BASE}/nrg_bal_s?format=JSON&geo=EU27_2020&unit=GWH&nrg_bal=FC_TRA_E`,
    sourceTitle: 'Eurostat nrg_bal_s · fossil ÷ total transport final energy · EU27_2020',
    note: 'Spliced ratio: report scope includes intl bunkers, FC_TRA does not; YoY change × report baseline.',
  },
  'esabcc-l6-forest-sink': {
    kind: 'eurostat', dataset: 'env_air_gge', round: 1, mode: 'splice',
    filters: { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF4A' },
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=CRF4A`,
    sourceTitle: 'Eurostat env_air_gge · CRF 4.A forest land · EU27_2020',
    note: 'Spliced: report stores the sink as a positive magnitude (living biomass only) while CRF 4.A is negative net — the ratio preserves the report convention.',
  },
  'esabcc-l7-nonforest-lulucf': {
    // Migration 078 / postreport-recipes.mjs REPORT_EXACT established that the
    // report's non-forest LULUCF figure is the DIRECT (no splice) sum of all
    // FIVE non-forest categories CRF4.B-4.F (cropland, grassland, wetlands,
    // settlements, AND other land) — not "CRF 4 minus forest" (which would
    // wrongly pull in harvested wood products), and not a 4-category splice.
    // A previous edit here had regressed to CRF4B-4E (dropping 4F) + splice,
    // reintroducing a narrower version of an already-fixed mislabel; this
    // reconciles the two recipes.
    kind: 'eurostat', dataset: 'env_air_gge', round: 1,
    sumFilters: ['CRF4B', 'CRF4C', 'CRF4D', 'CRF4E', 'CRF4F'].map(src_crf => (
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf })),
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=CRF4B`,
    sourceTitle: 'Eurostat env_air_gge · cropland + grassland + wetlands + settlements + other land (CRF 4.B–4.F) · EU27_2020',
    note: 'Direct sum (no splice) of all five non-forest land categories; reproduces the report 2022-2024 figures directly (migration 078).',
  },
  'esabcc-l8-bioenergy-use': {
    kind: 'eurostat', dataset: 'nrg_bal_s', round: 1, mode: 'splice',
    sumFilters: ['R5110-5150_W6000RI', 'R5210B', 'R5300', 'W6100_6220'].map(siec => (
      { geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'GIC', siec })),
    sourceUrl: `${EUROSTAT_BASE}/nrg_bal_s?format=JSON&geo=EU27_2020&unit=GWH&nrg_bal=GIC`,
    sourceTitle: 'Eurostat nrg_bal_s · gross inland consumption of biofuels + renewable waste · EU27_2020',
    note: 'Spliced sum (GWh→TWh); a failed siec leg is skipped, the splice ratio absorbs the level offset.',
  },

  // ── Coverage extension (July 2026, batch 2): agriculture / buildings /
  //    industry-materials indicators wired from the live Eurostat JSON-stat
  //    path after per-indicator API probes. Splice-mode wherever the source
  //    scope/level differs from the report (production-volume indices, memo
  //    aggregates); direct only where the source reproduces the report's own
  //    last value within a few percent.
  'esabcc-a6-food-waste': {
    // Report stores kg of food waste per capita; env_wasfw total (all NACE
    // sectors + households) is on the same unit. Fetched 2020=128 vs report
    // 131.0 (0.98× — a Eurostat vintage revision, within a few %), so direct.
    kind: 'eurostat', dataset: 'env_wasfw', round: 0,
    filters: { geo: 'EU27_2020', nace_r2: 'TOT', unit: 'KG_HAB' },
    toRepo: v => v,
    sourceUrl: `${EUROSTAT_BASE}/env_wasfw?format=JSON&geo=EU27_2020&nace_r2=TOT&unit=KG_HAB`,
    sourceTitle: 'Eurostat env_wasfw · total food waste, kg per capita · EU27_2020',
    note: 'Total food waste per capita (all NACE + households). Same unit as report; direct map.',
  },
  'esabcc-b4-population': {
    // Report stores EU population as an index (2005 = 1.0). demo_gind AVG is
    // absolute average population, so splice: apply its year-on-year change to
    // the report's index baseline — the absolute level cancels in the ratio,
    // no base constant needed.
    kind: 'eurostat', dataset: 'demo_gind', round: 3, mode: 'splice',
    filters: { geo: 'EU27_2020', indic_de: 'AVG' },
    toRepo: v => v,
    sourceUrl: `${EUROSTAT_BASE}/demo_gind?format=JSON&geo=EU27_2020&indic_de=AVG`,
    sourceTitle: 'Eurostat demo_gind · average population (indexed onto report 2005=1.0 baseline) · EU27_2020',
    note: 'Spliced: absolute EU27 average population YoY change × the report’s population index baseline.',
  },
  // Industry material production — PRODCOM absolute tonnage (DS-056120/prom)
  // and Comext trade (DS-045409) are NOT served by the JSON-stat dissemination
  // API (404). The production-volume index sts_inpr_a IS, so splice its YoY
  // change onto each report Mt baseline (splice uses trend only; index base
  // 2021=100 cancels). Apparent-use / trade-balance need Comext flows → not
  // wired (kept as report figures). C235/C201 are the narrowest EU27 proxies.
  'esabcc-i2-steel-production': {
    kind: 'eurostat', dataset: 'sts_inpr_a', round: 1, mode: 'splice',
    filters: { geo: 'EU27_2020', indic_bt: 'PRD', s_adj: 'CA', unit: 'I21', nace_r2: 'C241' },
    toRepo: v => v,
    sourceUrl: `${EUROSTAT_BASE}/sts_inpr_a?format=JSON&geo=EU27_2020&indic_bt=PRD&s_adj=CA&unit=I21&nace_r2=C241`,
    sourceTitle: 'Eurostat sts_inpr_a · production-volume index (2021=100), NACE C241 basic iron & steel · EU27_2020',
    note: 'Spliced: steel production-volume index YoY change × report 2021 baseline (152.8 Mt).',
  },
  'esabcc-i2-cement-production': {
    kind: 'eurostat', dataset: 'sts_inpr_a', round: 1, mode: 'splice',
    filters: { geo: 'EU27_2020', indic_bt: 'PRD', s_adj: 'CA', unit: 'I21', nace_r2: 'C235' },
    toRepo: v => v,
    sourceUrl: `${EUROSTAT_BASE}/sts_inpr_a?format=JSON&geo=EU27_2020&indic_bt=PRD&s_adj=CA&unit=I21&nace_r2=C235`,
    sourceTitle: 'Eurostat sts_inpr_a · production-volume index (2021=100), NACE C235 cement/lime/plaster · EU27_2020',
    note: 'Spliced: cement-dominated NACE C235 production-volume index (cement-only C2351 has no EU27 series) YoY change × report 2021 baseline (182.5 Mt).',
  },
  'esabcc-i2-chemicals-production': {
    kind: 'eurostat', dataset: 'sts_inpr_a', round: 2, mode: 'splice',
    filters: { geo: 'EU27_2020', indic_bt: 'PRD', s_adj: 'CA', unit: 'I21', nace_r2: 'C201' },
    toRepo: v => v,
    sourceUrl: `${EUROSTAT_BASE}/sts_inpr_a?format=JSON&geo=EU27_2020&indic_bt=PRD&s_adj=CA&unit=I21&nace_r2=C201`,
    sourceTitle: 'Eurostat sts_inpr_a · production-volume index (2021=100), NACE C201 basic chemicals · EU27_2020',
    note: 'Spliced: basic-chemicals production-volume index YoY change × report 2021 baseline (26.84 Mt).',
  },

  // ── Agriculture livestock (July 2026, batch 2): meat/milk production,
  //    herd sizes and pig-sector GHG from the live Eurostat animal-production
  //    statistics. Per-species GHG for cattle is NOT wired: env_air_gge splits
  //    agricultural emissions to combined cattle only, not bovine-meat vs
  //    dairy (the report figures are an allocation model), and A4 apparent
  //    consumption needs a net production+imports−exports the engine can't
  //    express — both kept as report figures. `a2-*` and `a4-*` production
  //    share one series (same recipe on both ids).
  'esabcc-a2-bovine-production': {
    kind: 'eurostat', dataset: 'apro_mt_pann', round: 3,
    filters: { geo: 'EU27_2020', meat: 'B1000', meatitem: 'SLAUGHT', unit: 'THS_T' },
    toRepo: v => v / 1000,
    sourceUrl: `${EUROSTAT_BASE}/apro_mt_pann?format=JSON&geo=EU27_2020&meat=B1000&meatitem=SLAUGHT&unit=THS_T`,
    sourceTitle: 'Eurostat apro_mt_pann · bovine meat (B1000) slaughterings · EU27_2020',
    note: 'Slaughterings = production; thousand t → Mt (÷1000). Direct (anchor 2020 0.984×).',
  },
  'esabcc-a4-bovine-production': {
    kind: 'eurostat', dataset: 'apro_mt_pann', round: 3,
    filters: { geo: 'EU27_2020', meat: 'B1000', meatitem: 'SLAUGHT', unit: 'THS_T' },
    toRepo: v => v / 1000,
    sourceUrl: `${EUROSTAT_BASE}/apro_mt_pann?format=JSON&geo=EU27_2020&meat=B1000&meatitem=SLAUGHT&unit=THS_T`,
    sourceTitle: 'Eurostat apro_mt_pann · bovine meat (B1000) slaughterings · EU27_2020',
    note: 'Same series as esabcc-a2-bovine-production.',
  },
  'esabcc-a2-pig-production': {
    kind: 'eurostat', dataset: 'apro_mt_pann', round: 2,
    filters: { geo: 'EU27_2020', meat: 'B3100', meatitem: 'SLAUGHT', unit: 'THS_T' },
    toRepo: v => v / 1000,
    sourceUrl: `${EUROSTAT_BASE}/apro_mt_pann?format=JSON&geo=EU27_2020&meat=B3100&meatitem=SLAUGHT&unit=THS_T`,
    sourceTitle: 'Eurostat apro_mt_pann · pigmeat (B3100) slaughterings · EU27_2020',
    note: 'Pig code B3100 (not B4000 = sheep/goats); thousand t → Mt. Direct (anchor 2020 0.992×).',
  },
  'esabcc-a4-pig-production': {
    kind: 'eurostat', dataset: 'apro_mt_pann', round: 2,
    filters: { geo: 'EU27_2020', meat: 'B3100', meatitem: 'SLAUGHT', unit: 'THS_T' },
    toRepo: v => v / 1000,
    sourceUrl: `${EUROSTAT_BASE}/apro_mt_pann?format=JSON&geo=EU27_2020&meat=B3100&meatitem=SLAUGHT&unit=THS_T`,
    sourceTitle: 'Eurostat apro_mt_pann · pigmeat (B3100) slaughterings · EU27_2020',
    note: 'Same series as esabcc-a2-pig-production.',
  },
  'esabcc-a2-dairy-production': {
    kind: 'eurostat', dataset: 'apro_mk_farm', round: 1, mode: 'splice',
    filters: { geo: 'EU27_2020', dairyprod: 'D1100A', milkitem: 'PRO' },
    toRepo: v => v / 1000,
    sourceUrl: `${EUROSTAT_BASE}/apro_mk_farm?format=JSON&geo=EU27_2020&dairyprod=D1100A&milkitem=PRO`,
    sourceTitle: 'Eurostat apro_mk_farm · raw milk total available on farms · EU27_2020',
    note: 'Spliced: raw-milk-available scope differs slightly from the report dairy-production boundary (anchor 2020 0.983×); 1000 t → Mt.',
  },
  'esabcc-a4-dairy-production': {
    kind: 'eurostat', dataset: 'apro_mk_farm', round: 1, mode: 'splice',
    filters: { geo: 'EU27_2020', dairyprod: 'D1100A', milkitem: 'PRO' },
    toRepo: v => v / 1000,
    sourceUrl: `${EUROSTAT_BASE}/apro_mk_farm?format=JSON&geo=EU27_2020&dairyprod=D1100A&milkitem=PRO`,
    sourceTitle: 'Eurostat apro_mk_farm · raw milk total available on farms · EU27_2020',
    note: 'Same series as esabcc-a2-dairy-production.',
  },
  'esabcc-a4-bovine-herd-size': {
    kind: 'eurostat', dataset: 'apro_mt_lscatl', round: 2, mode: 'splice',
    filters: { geo: 'EU27_2020', animals: 'A2000', month: 'M11_M12', unit: 'THS_HD' },
    toRepo: v => v / 1000,
    sourceUrl: `${EUROSTAT_BASE}/apro_mt_lscatl?format=JSON&geo=EU27_2020&animals=A2000&month=M11_M12&unit=THS_HD`,
    sourceTitle: 'Eurostat apro_mt_lscatl · live bovine animals (A2000), Nov–Dec survey · EU27_2020',
    note: 'Spliced: A2000 total cattle includes dairy, report bovine-meat herd is a subset (anchor 1.272×); thousand head → million head.',
  },
  'esabcc-a4-dairy-herd-size': {
    kind: 'eurostat', dataset: 'apro_mt_lscatl', round: 2,
    filters: { geo: 'EU27_2020', animals: 'A2300F', month: 'M11_M12', unit: 'THS_HD' },
    toRepo: v => v / 1000,
    sourceUrl: `${EUROSTAT_BASE}/apro_mt_lscatl?format=JSON&geo=EU27_2020&animals=A2300F&month=M11_M12&unit=THS_HD`,
    sourceTitle: 'Eurostat apro_mt_lscatl · dairy cows (A2300F), Nov–Dec survey · EU27_2020',
    note: 'Dairy cows; thousand head → million head. Direct (anchor 2020 0.995×).',
  },
  'esabcc-a4-pig-herd-size': {
    kind: 'eurostat', dataset: 'apro_mt_lspig', round: 1, mode: 'splice',
    filters: { geo: 'EU27_2020', animals: 'A3100', month: 'M11_M12', unit: 'THS_HD' },
    toRepo: v => v / 1000,
    sourceUrl: `${EUROSTAT_BASE}/apro_mt_lspig?format=JSON&geo=EU27_2020&animals=A3100&month=M11_M12&unit=THS_HD`,
    sourceTitle: 'Eurostat apro_mt_lspig · live swine (A3100), Nov–Dec survey · EU27_2020',
    note: 'Pig herd code A3100 (not A5000); thousand head → million head. Spliced onto report baseline (anchor 1.042×).',
  },
  'esabcc-a2-pig-ghg': {
    // env_air_gge splits agricultural GHG to combined cattle only, so bovine
    // and dairy GHG are un-sourceable; swine (CRF 3.A.3 enteric + 3.B.3 manure)
    // IS separable → splice the swine on-farm GHG trend onto the report baseline.
    kind: 'eurostat', dataset: 'env_air_gge', round: 2, mode: 'splice',
    sumFilters: [
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF3A3' },
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF3B3' },
    ],
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=CRF3A3`,
    sourceTitle: 'Eurostat env_air_gge · swine enteric (CRF 3.A.3) + manure (CRF 3.B.3) GHG · EU27_2020',
    note: 'Spliced: on-farm swine GHG (CO₂-eq) YoY change × report baseline (anchor 2021 0.929×). Cattle cannot be split into bovine-meat vs dairy in the inventory.',
  },
  'esabcc-a2-pig-ghg-intensity': {
    kind: 'eurostat-ratio', round: 3, mode: 'splice',
    num: {
      dataset: 'env_air_gge',
      legs: [
        { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF3A3' },
        { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF3B3' },
      ],
    },
    den: {
      dataset: 'apro_mt_pann',
      legs: [{ geo: 'EU27_2020', meat: 'B3100', meatitem: 'SLAUGHT', unit: 'THS_T' }],
    },
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=CRF3B3`,
    sourceTitle: 'Eurostat env_air_gge swine GHG (3.A.3 + 3.B.3) ÷ apro_mt_pann pigmeat (B3100) · EU27_2020',
    note: 'Spliced ratio: swine GHG ÷ pig production; num/den unit mix cancels in the YoY ratio, only the trend is applied to the report intensity baseline (conceptual 2020 0.931×).',
  },

  // ── Renewables capacity additions (July 2026): the hand-pasted 2023-2025
  //    afterReport points (SolarPower Europe / WindEurope figures) were not
  //    traceable to the sourceUrl on file (Eurostat nrg_inf_epcrw) and
  //    included a fabricated-looking 2025 forecast point with no published
  //    Eurostat data behind it. Eurostat DOES carry this series — as a
  //    cumulative net-capacity STOCK, not annual additions — so derive the
  //    additions as the stock's year-on-year delta. `eurostat-delta` fetches
  //    the raw stock series and differences consecutive years before the
  //    normal direct-mode toRepo/round/anchor-check pipeline runs.
  'esabcc-e4a-solar-pv-add': {
    kind: 'eurostat-delta', dataset: 'nrg_inf_epcrw', round: 2,
    filters: { geo: 'EU27_2020', unit: 'MW', freq: 'A', plant_tec: 'CAP_NET_ELC', siec: 'RA420' },
    toRepo: v => v / 1000,
    sourceUrl: `${EUROSTAT_BASE}/nrg_inf_epcrw?format=JSON&geo=EU27_2020&unit=MW&plant_tec=CAP_NET_ELC&siec=RA420`,
    sourceTitle: 'Eurostat nrg_inf_epcrw · net electrical capacity, solar photovoltaic (RA420) · EU27_2020',
    note: 'Year-on-year delta of net capacity stock (MW→GW), direct (no splice — reproduces the report anchor within a few %). Eurostat has no 2025 row yet (latest year 2024), so the series stops there; SolarPower Europe/WindEurope market-report figures are a different (gross-installation) basis and are not used.',
  },
  'esabcc-e4b-wind-add': {
    kind: 'eurostat-delta', dataset: 'nrg_inf_epcrw', round: 2,
    filters: { geo: 'EU27_2020', unit: 'MW', freq: 'A', plant_tec: 'CAP_NET_ELC', siec: 'RA300' },
    toRepo: v => v / 1000,
    sourceUrl: `${EUROSTAT_BASE}/nrg_inf_epcrw?format=JSON&geo=EU27_2020&unit=MW&plant_tec=CAP_NET_ELC&siec=RA300`,
    sourceTitle: 'Eurostat nrg_inf_epcrw · net electrical capacity, wind onshore+offshore (RA300) · EU27_2020',
    note: 'Year-on-year delta of net capacity stock (MW→GW), direct (no splice — reproduces the report anchor within a few %). Eurostat has no 2025 row yet (latest year 2024), so the series stops there; WindEurope/SolarPower Europe market-report figures are a different (gross-installation) basis and are not used.',
  },
};

// ───────────────────────── helpers ─────────────────────────

/** Parse a number that may use European formatting ("1.234,5" → 1234.5). */
function parseNum(s) {
  if (s == null) return NaN;
  let t = String(s).trim().replace(/\s/g, '');
  if (t === '' || /^[:.\-]$/.test(t)) return NaN;
  if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.');
  else if (t.includes(',')) t = t.replace(',', '.');
  return parseFloat(t);
}

export function round(v, d) {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

// ───────────────────────── fetchers ─────────────────────────

export async function fetchEurostat(dataset, filters) {
  const params = new URLSearchParams({ format: 'JSON', lang: 'EN', ...filters });
  const url = `${EUROSTAT_BASE}/${encodeURIComponent(dataset)}?${params}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Eurostat ${dataset} → ${res.status} ${res.statusText}`);
  const j = await res.json();
  const idx = j?.dimension?.time?.category?.index;
  if (!idx) throw new Error('no time dimension');
  const val = j.value || {};
  const entries = Array.isArray(idx) ? idx.map((y, i) => [y, i]) : Object.entries(idx);
  const out = [];
  for (const [y, i] of entries) {
    const v = val[String(i)];
    if (v === null || v === undefined) continue;
    out.push({ year: Number(y), value: Number(v) });
  }
  // GLOBAL GUARD: Eurostat happily returns HTTP 200 for a filter combination
  // that matches nothing (e.g. a renamed/retired dimension code) — the
  // dimension comes back with an empty category list and zero values. That
  // must never be read as "success, nothing new" (which upstream would then
  // report as status:"up-to-date" and leave stale/wrong data in place). Treat
  // it as a hard fetch error instead, so the recipe is skipped and logged.
  // This is the exact failure mode that broke O1 (TOTX4_MEMONIA), T3a
  // (CAR_BUS_TOT) and T5b (LOR_HVY).
  if (out.length === 0) {
    throw new Error(`Eurostat ${dataset} → HTTP 200 but 0 values for filters ${JSON.stringify(filters)}`);
  }
  return out.sort((a, b) => a.year - b.year);
}

/**
 * Fetch a single Eurostat series and return its year-on-year delta (this
 * year's value minus last year's), for datasets that publish a cumulative
 * stock (e.g. installed capacity) rather than annual additions. Only
 * consecutive-year pairs are differenced; a gap year is skipped rather than
 * spanning it silently.
 */
export async function fetchEurostatDelta(dataset, filters) {
  const pts = await fetchEurostat(dataset, filters);
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].year === pts[i - 1].year + 1) {
      out.push({ year: pts[i].year, value: pts[i].value - pts[i - 1].value });
    }
  }
  if (out.length === 0) throw new Error(`${dataset}: no consecutive-year pairs to difference`);
  return out;
}

/**
 * Fetch several Eurostat slices and sum them by year. Each leg may be a plain
 * filter object, or `{ f: filters, w: weight }` to apply a multiplier (e.g. a
 * GWP factor turning a gas mass into CO₂-equivalent). Fault-tolerant: a leg
 * that errors is skipped; throws only if every leg fails.
 */
export async function fetchEurostatSum(dataset, legs) {
  const acc = new Map();
  let ok = 0;
  for (const leg of legs) {
    const f = leg.f ?? leg;
    const w = leg.w ?? 1;
    try {
      for (const p of await fetchEurostat(dataset, f)) {
        acc.set(p.year, (acc.get(p.year) ?? 0) + p.value * w);
      }
      ok++;
    } catch (e) {
      console.error(`    (sum leg skipped: ${e.message})`);
    }
  }
  if (ok === 0) throw new Error('all sum legs failed');
  return [...acc.entries()].map(([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year);
}

/**
 * Fetch a numerator and a denominator (each a summed set of Eurostat legs,
 * possibly from different datasets) and return their per-year ratio × 100.
 * Only years present in BOTH sides are kept. Ratio recipes are meant to run
 * in splice mode: any constant scale factor (×100, unit mixes) cancels in the
 * year-on-year ratio, so only the trend is trusted, never the level.
 */
export async function fetchEurostatRatio(rec) {
  const num = await fetchEurostatSum(rec.num.dataset, rec.num.legs);
  const den = await fetchEurostatSum(rec.den.dataset, rec.den.legs);
  const dm = new Map(den.map(p => [p.year, p.value]));
  return num
    .filter(p => Number.isFinite(dm.get(p.year)) && Math.abs(dm.get(p.year)) > 1e-12)
    .map(p => ({ year: p.year, value: (p.value / dm.get(p.year)) * 100 }));
}

function detectDelimiter(line) {
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let q = false;
  for (const c of line) {
    if (c === '"') q = !q;
    else if (!q && c in counts) counts[c]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseCsvLine(line, delim) {
  const cells = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) { cells.push(cur); cur = ''; }
    else cur += c;
  }
  cells.push(cur);
  return cells;
}

let _eea = null;
async function getEeaRows() {
  if (_eea) return _eea;
  const res = await fetch(EEA_CSV);
  if (!res.ok) throw new Error(`EEA datahub → ${res.status} ${res.statusText}`);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter(l => l.length);
  if (lines.length === 0) throw new Error('EEA CSV empty');
  const delim = detectDelimiter(lines[0]);
  const rows = lines.map(l => parseCsvLine(l, delim));
  const header = rows[0].map(h => h.trim().toLowerCase());
  const find = (...preds) => {
    for (const p of preds) {
      const i = header.findIndex(h => p(h));
      if (i >= 0) return i;
    }
    return -1;
  };
  const col = {
    year: find(h => h === 'year', h => h.includes('year')),
    sector: find(h => h === 'sector_code' || h === 'crf_code',
                 h => h.includes('sector') && h.includes('code'),
                 h => h.includes('crf') || h.includes('sector') || h.includes('category')),
    gas: find(h => h === 'pollutant_name' || h === 'gas' || h === 'pollutant',
              h => h.includes('pollutant') || h.includes('gas')),
    value: find(h => h === 'emissions' || h === 'value',
                h => h.includes('emission') || h.includes('value')),
    unit: find(h => h === 'unit', h => h.includes('unit')),
  };
  if (col.year < 0 || col.sector < 0 || col.value < 0) {
    throw new Error(`EEA CSV columns not recognised (delim="${delim}", header=${header.slice(0, 12).join('|')})`);
  }
  _eea = { rows, col };
  return _eea;
}

/** kt/Gg CO2-eq → Mt; Mt → Mt; t → Mt. Returns a multiplier to reach Mt. */
function unitToMt(u) {
  const s = (u || '').toLowerCase();
  if (/\bmt\b|million|teragram|tg\b/.test(s)) return 1;
  if (/\bkt\b|gigagram|gg\b|kiloton/.test(s)) return 0.001;
  if (/megagram|\bmg\b/.test(s)) return 1e-6;
  if (/tonne|\bt\b/.test(s)) return 1e-6;
  return null; // unknown — let the anchor check guard magnitude
}

async function fetchEea({ crfCodes, sumGases }) {
  const { rows, col } = await getEeaRows();
  const aggMatch = ['all greenhouse gases', 'co2 equivalent', 'co2-eq', 'co2 eq'];
  let factor = 1, factorSeen = false;
  const totals = new Map();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const code = (r[col.sector] ?? '').trim();
    // Match the EXACT aggregate code only — the GHG viewer CSV carries both
    // parent and child rows, so summing children too would double-count.
    if (!crfCodes.some(c => code === c)) continue;
    const gas = col.gas >= 0 ? (r[col.gas] ?? '').trim().toLowerCase() : '';
    if (sumGases) {
      if (!sumGases.some(g => gas.includes(g))) continue;
    } else if (col.gas >= 0) {
      if (!aggMatch.some(g => gas.includes(g))) continue;
    }
    const year = parseInt(r[col.year], 10);
    const v = parseNum(r[col.value]);
    if (!Number.isFinite(year) || !Number.isFinite(v)) continue;
    if (!factorSeen && col.unit >= 0) {
      const f = unitToMt(r[col.unit]);
      if (f != null) { factor = f; factorSeen = true; }
    }
    totals.set(year, (totals.get(year) ?? 0) + v * factor);
  }
  if (totals.size === 0) {
    // Same global guard as fetchEurostat: a CRF-code/gas filter that matches
    // no rows must fail loudly, not be read as an empty-but-successful pull.
    throw new Error(`EEA CSV → 0 matching rows for crfCodes=${JSON.stringify(crfCodes)}`);
  }
  return [...totals.entries()].map(([year, value]) => ({ year, value })).sort((a, b) => a.year - b.year);
}

// ───────────────────────── TS patching ─────────────────────────

function findDataArray(src, id) {
  const m = new RegExp(`id: '${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`).exec(src);
  if (!m) return null;
  const di = src.indexOf('data: [', m.index);
  if (di < 0) return null;
  const open = di + 'data: ['.length - 1;
  const close = src.indexOf(']', open);
  return { open, close, body: src.slice(open + 1, close) };
}

const POINT_RE = /\{\s*year:\s*(-?\d+),\s*value:\s*(-?[\d.]+)(,\s*afterReport:\s*true)?\s*\}/g;

/** Report points = those NOT flagged afterReport. */
function reportPoints(body) {
  const pts = [];
  let m; POINT_RE.lastIndex = 0;
  while ((m = POINT_RE.exec(body))) if (!m[3]) pts.push({ year: Number(m[1]), value: Number(m[2]) });
  return pts;
}

/** Every stored point, keeping its afterReport flag. Used by `spliceFrom`. */
function allPoints(body) {
  const pts = [];
  let m; POINT_RE.lastIndex = 0;
  while ((m = POINT_RE.exec(body))) {
    pts.push({ year: Number(m[1]), value: Number(m[2]), afterReport: Boolean(m[3]) });
  }
  return pts.sort((a, b) => a.year - b.year);
}

/** Anchor check: fetched value at the report's last year must be within 2×. */
function anchorOk(anchorVal, fetchedAtAnchor) {
  if (!Number.isFinite(fetchedAtAnchor)) return { ok: true, reason: 'no-anchor-year' };
  if (Math.abs(anchorVal) < 1e-9) return { ok: true, reason: 'zero-anchor' };
  const ratio = fetchedAtAnchor / anchorVal;
  if (ratio <= 0) return { ok: false, reason: `sign flip (anchor ${anchorVal}, fetched ${fetchedAtAnchor})` };
  if (ratio < 0.5 || ratio > 2)
    return { ok: false, reason: `${ratio.toFixed(3)}× off anchor (anchor ${anchorVal}, fetched ${round(fetchedAtAnchor, 3)})` };
  return { ok: true, reason: `${ratio.toFixed(3)}× anchor` };
}

async function main() {
  let src = await readFile(TS_FILE, 'utf8');
  const provenance = [];
  const edits = [];

  for (const [id, rec] of Object.entries(RECIPES)) {
    const loc = findDataArray(src, id);
    if (!loc) { console.error(`! ${id}: not found in TS`); continue; }
    // Default: splice/anchor on the report's own last year, regenerating every
    // afterReport point. `spliceFrom: <year>` instead anchors on an already-stored
    // LATER point and keeps everything up to it — for series whose post-report
    // years are themselves published figures (e.g. the DG MOVE pocketbook) that a
    // proxy source must extend, not overwrite.
    const stored = allPoints(loc.body);
    const reps = rec.spliceFrom
      ? stored.filter(p => p.year <= rec.spliceFrom)
      : reportPoints(loc.body);
    if (reps.length === 0) { console.error(`! ${id}: no stored points at/below anchor`); continue; }
    const baseYear = Math.max(...reps.map(p => p.year));
    const baseVal = reps.find(p => p.year === baseYear)?.value;
    if (rec.spliceFrom && baseYear !== rec.spliceFrom) {
      console.error(`! ${id}: spliceFrom ${rec.spliceFrom} not a stored point; skipping`);
      continue;
    }
    const meta = { id, sourceTitle: rec.sourceTitle, sourceUrl: rec.sourceUrl, note: rec.note };

    let fetched;
    try {
      fetched = rec.kind === 'eurostat'
        ? (rec.sumFilters
            ? await fetchEurostatSum(rec.dataset, rec.sumFilters)
            : await fetchEurostat(rec.dataset, rec.filters))
        : rec.kind === 'eurostat-ratio'
          ? await fetchEurostatRatio(rec)
          : rec.kind === 'eurostat-delta'
            ? await fetchEurostatDelta(rec.dataset, rec.filters)
            : await fetchEea(rec);
    } catch (e) {
      console.error(`! ${id}: fetch failed — ${e.message}`);
      provenance.push({ ...meta, status: 'error', message: e.message });
      continue;
    }

    let newPts, chk;
    if (rec.mode === 'splice') {
      // Chain-splice: keep the report's absolute baseline and apply the live
      // source's year-on-year change. Fixes indicators where the source is on
      // a different scale/scope than the report (gas mass vs CO₂-eq; narrower
      // sector scope) — the ratio cancels the offset, leaving the real trend.
      const base = fetched.find(p => p.year === baseYear)?.value;
      if (!Number.isFinite(base) || Math.abs(base) < 1e-12 || !Number.isFinite(baseVal)) {
        const msg = `splice anchor ${baseYear} missing in source`;
        console.error(`! ${id}: ${msg}; skipping`);
        provenance.push({ ...meta, status: 'mismatch', message: msg, baseYear });
        continue;
      }
      newPts = fetched.filter(p => p.year > baseYear)
        .map(p => ({ year: p.year, value: round(baseVal * (p.value / base), rec.round) }));
      chk = { reason: `spliced onto ${rec.spliceFrom ? 'published' : 'report'} ${baseYear}=${baseVal}` };
    } else {
      const toRepo = rec.toRepo || (v => v);
      const conv = fetched.map(p => ({ year: p.year, value: round(toRepo(p.value), rec.round) }));
      // Sanity-check against the report anchor before trusting the series.
      const atAnchor = conv.find(p => p.year === baseYear)?.value;
      const a = anchorOk(baseVal, atAnchor);
      if (!a.ok) {
        console.error(`! ${id}: anchor check failed — ${a.reason}; skipping`);
        provenance.push({ ...meta, status: 'mismatch', message: a.reason, baseYear });
        continue;
      }
      newPts = conv.filter(p => p.year > baseYear);
      chk = a;
    }

    if (newPts.length === 0) {
      console.log(`= ${id}: no years after ${baseYear} (${chk.reason})`);
      provenance.push({ ...meta, status: 'up-to-date', baseYear, newPoints: [] });
      continue;
    }

    const kept = reps.map(p => (p.afterReport
      ? `{ year: ${p.year}, value: ${p.value}, afterReport: true }`
      : `{ year: ${p.year}, value: ${p.value} }`));
    for (const p of newPts) kept.push(`{ year: ${p.year}, value: ${p.value}, afterReport: true }`);
    edits.push({ open: loc.open, close: loc.close, text: `[${kept.join(', ')}]` });

    console.log(`+ ${id}: +${newPts.length} pts (${newPts.map(p => p.year).join(',')}) [${chk.reason}]`);
    provenance.push({ ...meta, status: 'updated', baseYear, newPoints: newPts });
  }

  edits.sort((a, b) => b.open - a.open);
  for (const e of edits) src = src.slice(0, e.open) + e.text + src.slice(e.close + 1);

  if (DRY) {
    console.log('\n[dry-run] no files written');
  } else {
    await writeFile(TS_FILE, src);
    await writeFile(PROV_FILE, JSON.stringify(
      { generatedAt: new Date().toISOString(), indicators: provenance }, null, 2));
    console.log(`\nWrote ${TS_FILE} and ${PROV_FILE}`);
  }
  const by = s => provenance.filter(p => p.status === s).length;
  console.log(`\nSummary: ${by('updated')} updated, ${by('up-to-date')} up-to-date, ` +
              `${by('mismatch')} mismatch, ${by('error')} errored, ${provenance.length} recipes.`);
}

// Only run the refresh when invoked directly — the recipe table and the
// Eurostat fetchers are imported by build-postreport-calc-rows.mjs.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e); process.exit(1); });
}
