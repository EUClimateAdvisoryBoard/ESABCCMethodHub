/**
 * Shared source definitions used by more than one data register in the
 * Overview Industry / Industry-report submodules.
 * -----------------------------------------------------------------------
 * Some sources (e.g. the AR6 Scenarios Database) are cited from both
 * `industry-report-objectives.ts` (SOURCES) and `industry-scenario-db.ts`
 * (SCENARIO_SOURCES) — two registers with slightly different shapes
 * (the former tags a `type`, the latter a `family`). Defining the shared
 * fields (id/short/cite/url/doi) once here and spreading them into each
 * register's own entry means a correction to the citation, DOI or URL only
 * has to be made in one place — this exact drift (191→188 modelling
 * frameworks, DOI zenodo.5886911→5886912) had to be fixed in lockstep across
 * both files once already (see PR #406).
 */

export const AR6_DB_IIASA_BASE = {
  id: 'ar6-db-iiasa',
  short: 'AR6 Scenario DB (IIASA)',
  cite: 'Byers, E., Krey, V., Kriegler, E., Riahi, K., Schaeffer, R., et al. (2022). AR6 Scenarios Database (release 1.1, Nov 2022) [Data set]. Zenodo. Hosted by IIASA — 3,131 scenarios, 188 modelling frameworks; 1,202 climate-classified (C1–C8).',
  url: 'https://data.ece.iiasa.ac.at/ar6/',
  doi: '10.5281/zenodo.5886912',
} as const;
