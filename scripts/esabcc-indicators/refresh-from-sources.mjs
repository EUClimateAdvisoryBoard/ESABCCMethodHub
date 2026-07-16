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
import { dirname, join } from 'node:path';

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
const RECIPES = {
  // ── Eurostat ──────────────────────────────────────────────────────────
  'esabcc-o2-pec': {
    kind: 'eurostat', dataset: 'nrg_ind_eff',
    filters: { geo: 'EU27_2020', nrg_bal: 'PEC2020-2030', unit: 'MTOE' },
    toRepo: v => v * MTOE_TO_TWH, round: 1,
    sourceUrl: `${EUROSTAT_BASE}/nrg_ind_eff?format=JSON&geo=EU27_2020&nrg_bal=PEC2020-2030&unit=MTOE`,
    sourceTitle: 'Eurostat nrg_ind_eff · primary energy consumption (PEC2020-2030) · EU27_2020',
    note: 'Mtoe×11.63→TWh.',
  },
  'esabcc-o2-fec': {
    kind: 'eurostat', dataset: 'nrg_ind_eff',
    filters: { geo: 'EU27_2020', nrg_bal: 'FEC2020-2030', unit: 'MTOE' },
    toRepo: v => v * MTOE_TO_TWH, round: 1,
    sourceUrl: `${EUROSTAT_BASE}/nrg_ind_eff?format=JSON&geo=EU27_2020&nrg_bal=FEC2020-2030&unit=MTOE`,
    sourceTitle: 'Eurostat nrg_ind_eff · final energy consumption (FEC2020-2030) · EU27_2020',
    note: 'Mtoe×11.63→TWh.',
  },
  'esabcc-e5-electrification': {
    kind: 'eurostat', dataset: 'nrg_bal_s',
    filters: { geo: 'EU27_2020', nrg_bal: 'FC_E', siec: 'E7000', unit: 'PC' },
    toRepo: v => v, round: 2,
    sourceUrl: `${EUROSTAT_BASE}/nrg_bal_s?format=JSON&geo=EU27_2020&nrg_bal=FC_E&siec=E7000&unit=PC`,
    sourceTitle: 'Eurostat nrg_bal_s · electricity share of final energy · EU27_2020',
    note: 'Stored as percent-number to match ECNO duplicate end-use-electrification.',
  },
  'esabcc-i6-industry-electrification': {
    kind: 'eurostat', dataset: 'nrg_bal_s',
    filters: { geo: 'EU27_2020', nrg_bal: 'FC_IND_E', siec: 'E7000', unit: 'PC' },
    toRepo: v => v, round: 2,
    sourceUrl: `${EUROSTAT_BASE}/nrg_bal_s?format=JSON&geo=EU27_2020&nrg_bal=FC_IND_E&siec=E7000&unit=PC`,
    sourceTitle: 'Eurostat nrg_bal_s · industry electricity share · EU27_2020',
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
    // Report scope = European Climate Law: total GHG excl LULUCF incl intl
    // aviation, plus intl maritime. TOTX4_MEMONIA carries the first part;
    // the intl-navigation memo leg adds maritime. Splice absorbs any
    // remaining scope residual (e.g. NF3 coverage differences).
    kind: 'eurostat', dataset: 'env_air_gge', round: 1, mode: 'splice',
    sumFilters: [
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'TOTX4_MEMONIA' },
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf: 'CRF1D1B' },
    ],
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=TOTX4_MEMONIA`,
    sourceTitle: 'Eurostat env_air_gge · total excl LULUCF incl intl aviation (TOTX4_MEMONIA) + intl maritime (1.D.1.b) · EU27_2020',
    note: 'Spliced: Climate-Law-scope proxy YoY change × report baseline.',
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
      legs: ['RA100', 'RA200', 'RA300', 'RA400'].map(siec => (
        { geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'GEP', siec })),
    },
    den: {
      dataset: 'nrg_bal_peh',
      legs: [{ geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'GEP', siec: 'TOTAL' }],
    },
    sourceUrl: `${EUROSTAT_BASE}/nrg_bal_peh?format=JSON&geo=EU27_2020&unit=GWH&nrg_bal=GEP`,
    sourceTitle: 'Eurostat nrg_bal_peh · (hydro + geothermal + wind + solar) ÷ total gross electricity production · EU27_2020',
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
    kind: 'eurostat', dataset: 'tran_hv_psmod', round: 2, mode: 'splice',
    filters: { geo: 'EU27_2020', unit: 'PC', vehicle: 'CAR_BUS_TOT' },
    sourceUrl: `${EUROSTAT_BASE}/tran_hv_psmod?format=JSON&geo=EU27_2020&unit=PC&vehicle=CAR_BUS_TOT`,
    sourceTitle: 'Eurostat tran_hv_psmod · car+bus share of inland passenger transport · EU27_2020',
    note: 'Spliced: Eurostat modal-split scope (car+bus vs report car+two-wheeler) differs slightly; YoY change × report baseline.',
  },
  'esabcc-t5b-zev-lorries-stock': {
    kind: 'eurostat', dataset: 'road_eqs_lormot', round: 0,
    filters: { geo: 'EU27_2020', unit: 'NR', vehicle: 'LOR_HVY', mot_nrg: 'ELC' },
    sourceUrl: `${EUROSTAT_BASE}/road_eqs_lormot?format=JSON&geo=EU27_2020&unit=NR&vehicle=LOR_HVY&mot_nrg=ELC`,
    sourceTitle: 'Eurostat road_eqs_lormot · battery-electric heavy lorries in the fleet · EU27_2020',
    note: 'Direct count; anchor check guards the EAFO-vs-Eurostat scope (skipped on mismatch).',
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
    kind: 'eurostat', dataset: 'env_air_gge', round: 1, mode: 'splice',
    sumFilters: ['CRF4B', 'CRF4C', 'CRF4D', 'CRF4E'].map(src_crf => (
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf })),
    sourceUrl: `${EUROSTAT_BASE}/env_air_gge?format=JSON&geo=EU27_2020&unit=MIO_T&airpol=GHG&src_crf=CRF4B`,
    sourceTitle: 'Eurostat env_air_gge · CRF 4.B–4.E (cropland, grassland, wetlands, settlements) · EU27_2020',
    note: 'Spliced sum of the non-forest land categories, YoY change × report baseline.',
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

function round(v, d) {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

// ───────────────────────── fetchers ─────────────────────────

async function fetchEurostat(dataset, filters) {
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
  return out.sort((a, b) => a.year - b.year);
}

/**
 * Fetch several Eurostat slices and sum them by year. Each leg may be a plain
 * filter object, or `{ f: filters, w: weight }` to apply a multiplier (e.g. a
 * GWP factor turning a gas mass into CO₂-equivalent). Fault-tolerant: a leg
 * that errors is skipped; throws only if every leg fails.
 */
async function fetchEurostatSum(dataset, legs) {
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
async function fetchEurostatRatio(rec) {
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
    const reps = reportPoints(loc.body);
    const baseYear = Math.max(...reps.map(p => p.year));
    const baseVal = reps.find(p => p.year === baseYear)?.value;
    const meta = { id, sourceTitle: rec.sourceTitle, sourceUrl: rec.sourceUrl, note: rec.note };

    let fetched;
    try {
      fetched = rec.kind === 'eurostat'
        ? (rec.sumFilters
            ? await fetchEurostatSum(rec.dataset, rec.sumFilters)
            : await fetchEurostat(rec.dataset, rec.filters))
        : rec.kind === 'eurostat-ratio'
          ? await fetchEurostatRatio(rec)
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
      chk = { reason: `spliced onto report ${baseYear}=${baseVal}` };
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

    const kept = reps.map(p => `{ year: ${p.year}, value: ${p.value} }`);
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

main().catch(e => { console.error(e); process.exit(1); });
