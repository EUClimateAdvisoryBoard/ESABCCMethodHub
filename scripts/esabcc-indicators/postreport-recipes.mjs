/**
 * The report's EXACT derivations for the indicators where the live-source
 * recipe in `refresh-from-sources.mjs` is only a year-on-year splice.
 * ---------------------------------------------------------------------------
 * Shared by the calc-row builder and the post-report value fact-check, so both
 * judge those series against the same basis.
 */

/**
 * Recipes that take precedence over `refresh-from-sources.mjs` for the calc
 * rows: the report's EXACT derivations, reverse-engineered from the report
 * workbook and applied to the points by migration 078. The refresh script
 * still carries YoY-splice approximations for these five — 078's own note says
 * the splice is what made them drift — so the calc space documents the exact
 * derivation instead. Each was re-checked against the live inventory here and
 * reproduces the stored point to the last decimal.
 */
export const REPORT_EXACT = {
  'esabcc-o1-ghg-total': {
    kind: 'eurostat', dataset: 'env_air_gge', round: 1,
    sumFilters: ['TOTXMEMO', 'CRF1D1A', 'CRF1D1B'].map(src_crf => (
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf })),
    sourceTitle: 'Eurostat env_air_gge · net total incl. LULUCF (TOTXMEMO) + international aviation (1.D.1.a) + international navigation (1.D.1.b) · EU27_2020',
    note: 'European-Climate-Law scope, the report\'s own basis (migration 078): reproduces the report 2005–2022 within 0.1–1.5 %.',
  },
  'esabcc-t1-transport-ghg': {
    kind: 'eurostat', dataset: 'env_air_gge', round: 1,
    sumFilters: ['CRF1A3', 'CRF1D1A'].map(src_crf => (
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf })),
    sourceTitle: 'Eurostat env_air_gge · domestic transport (CRF 1.A.3) + international aviation (1.D.1.a) · EU27_2020',
    note: 'The report\'s transport scope (migration 078): domestic transport plus international aviation, NO maritime — reproduces the report within 0.1–0.3 %.',
  },
  'esabcc-l7-nonforest-lulucf': {
    kind: 'eurostat', dataset: 'env_air_gge', round: 1,
    sumFilters: ['CRF4B', 'CRF4C', 'CRF4D', 'CRF4E', 'CRF4F'].map(src_crf => (
      { geo: 'EU27_2020', unit: 'MIO_T', freq: 'A', airpol: 'GHG', src_crf })),
    sourceTitle: 'Eurostat env_air_gge · cropland + grassland + wetlands + settlements + other land (CRF 4.B–4.F) · EU27_2020',
    note: 'Migration 078: the non-forest land categories, NOT "CRF 4 minus forest" — that would wrongly pull in harvested wood products.',
  },
  'esabcc-l8-bioenergy-use': {
    kind: 'eurostat', dataset: 'nrg_bal_c', round: 1,
    filters: { geo: 'EU27_2020', unit: 'GWH', freq: 'A', nrg_bal: 'GIC', siec: 'BIOE' },
    toRepo: v => v / 1000,
    sourceTitle: 'Eurostat nrg_bal_c · gross inland consumption of bioenergy (GIC × BIOE) · EU27_2020',
    note: 'Migration 078: GIC × the BIOE aggregate, GWh → TWh. Reproduces the report 2010–2021 within 1.4–3.4 % (vintage drift); the earlier splice ran ~6 % high.',
  },
};
