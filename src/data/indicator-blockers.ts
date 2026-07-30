/**
 * Why a report indicator carries no data newer than the report.
 * ---------------------------------------------------------------------------
 * The Indicator Check shows all 97 report series. 68 have post-report data,
 * pulled automatically by scripts/esabcc-indicators/refresh-from-sources.mjs.
 * The other 29 do not, and "no data added since the report" on its own is not
 * a useful thing to tell a reader — the reasons are genuinely different, and
 * so is what it would take to fix each one.
 *
 * Each entry below records the *tested* reason, not an assumption. Where a
 * source was written off in an earlier pass and later turned out to be
 * reachable (FAOSTAT's bulk files, the UNFCCC Data Interface via its Python
 * client, Eurostat's R5280S biofuel code), those indicators were moved onto the
 * automated path and are no longer listed here.
 *
 * Keep this in step with docs-internal/indicator-check-source-refresh-2026-07-29.md.
 */

export type BlockerStatus =
  | 'awaiting-publication'
  | 'source-ended'
  | 'no-public-api'
  | 'not-on-api'
  | 'pdf-only'
  | 'subscription'
  | 'never-published'
  | 'unresolved'
  | 'withheld';

export interface IndicatorBlocker {
  status: BlockerStatus;
  /** One line, shown on the card. */
  summary: string;
  /** What is specifically missing, and what would unblock it. */
  detail: string;
  /** Where the data would come from, when there is somewhere to point. */
  sourceUrl?: string;
}

/** When the automated refresh last ran end to end. */
export const LAST_REFRESH = '29 July 2026';

/**
 * What each status actually asks of a reader who wants to close the gap.
 * `effort` drives the grouping on the page: nothing to do, waiting on someone
 * else, or work that needs doing here.
 */
export const STATUS_ACTION: Record<BlockerStatus, { effort: 'none' | 'waiting' | 'work'; action: string }> = {
  'awaiting-publication': {
    effort: 'waiting',
    action: 'Nothing to do. Re-check when the EU’s 2026 CRT submission is published in machine-readable form.',
  },
  unresolved: {
    effort: 'work',
    action: 'A known next step exists but is not built. Highest-yield work on this list.',
  },
  'not-on-api': {
    effort: 'work',
    action: 'Needs the PRODCOM portal driven with a browser, or the figures entered by hand.',
  },
  'pdf-only': {
    effort: 'work',
    action: 'Needs a table extractor for the publisher’s annual PDF or annex file.',
  },
  'no-public-api': {
    effort: 'work',
    action: 'Needs a data request to the publisher, or manual entry each cycle.',
  },
  'source-ended': {
    effort: 'work',
    action:
      'The publisher has stopped carrying the series. Needs a request to them, a re-base onto a ' +
      'source that still publishes it, or a decision to retire the indicator.',
  },
  subscription: {
    effort: 'work',
    action: 'Needs a licence, or a decision to substitute a comparable open source.',
  },
  withheld: {
    effort: 'work',
    action: 'Held back deliberately. Needs the correct denominator before anything is published.',
  },
  'never-published': { effort: 'work', action: 'No route identified.' },
};

/**
 * Display metadata per status. `tone` drives the chip colour: amber where the
 * data is expected to arrive on its own, slate where someone has to do
 * something, red where the number is deliberately not shown.
 */
export const BLOCKER_META: Record<BlockerStatus, { label: string; tone: 'amber' | 'slate' | 'red' }> = {
  'awaiting-publication': { label: 'Not published yet', tone: 'amber' },
  'source-ended': { label: 'Source series ended', tone: 'slate' },
  'no-public-api': { label: 'No public data export', tone: 'slate' },
  'not-on-api': { label: 'Not on the Eurostat API', tone: 'slate' },
  'pdf-only': { label: 'Published as PDF only', tone: 'slate' },
  subscription: { label: 'Subscription source', tone: 'slate' },
  'never-published': { label: 'No published series exists', tone: 'slate' },
  unresolved: { label: 'Source not yet cracked', tone: 'slate' },
  withheld: { label: 'Withheld — would be unreliable', tone: 'red' },
};

const UNFCCC_CRT =
  'The UNFCCC Data Interface holds this series and reproduces the report almost exactly, ' +
  'but it stops at 2021: the database was frozen when Parties moved to the ETF/CRT reporting ' +
  'format. Eurostat’s env_air_gge cannot substitute — it publishes CRF emissions only, not the ' +
  'area and activity tables. The 2022-2024 values exist solely inside the EU’s 2026 CRT ' +
  'submission and become available when that is published in machine-readable form. Nothing to ' +
  'search for in the meantime.';

const PRODCOM =
  'The report used Eurostat PRODCOM (DS-056120 sold production, DS-059268 trade). PRODCOM sits ' +
  'outside Eurostat’s entire dissemination infrastructure: it appears neither in the 1.98 MB ' +
  'dissemination catalogue nor in the bulk-file inventory (8,233 datasets, no match under any ' +
  'code), so there is no API address and no bulk file to point a recipe at. Its own database page ' +
  'is a Liferay portal driven by a JavaScript search portlet with no direct download links in the ' +
  'HTML — extracting from it means driving a browser, not fetching a URL.';

const BSO =
  'Extraction is solved and the answer is that the data is not there. ' +
  'scripts/esabcc-indicators/browser-probe.mjs renders the Building Stock Observatory report ' +
  'headlessly and drives its controls, and its Year filter offers a single year — 2020 — for every ' +
  'subject except “Number of dwellings”, which adds 2022. The BSO no longer carries the multi-year ' +
  'series the report was built on. Since the report states these as an index against 2005 and the ' +
  'BSO holds no 2005 base and no year overlapping the report’s own last value, even the 2022 ' +
  'dwellings figure cannot be placed on the report’s basis. Unblocking this needs the historical ' +
  'series from DG ENER, or a decision to re-base the indicator on a source that publishes one.';

export const INDICATOR_BLOCKERS: Record<string, IndicatorBlocker> = {
  // ── Waiting on the EU's 2026 CRT submission (10) ─────────────────────────
  'esabcc-l2-forest-area': { status: 'awaiting-publication', summary: 'UNFCCC inventory has it, but only to 2021', detail: UNFCCC_CRT, sourceUrl: 'https://unfccc.int/ghg-inventories-annex-i-parties/2026' },
  'esabcc-l2-cropland-area': { status: 'awaiting-publication', summary: 'UNFCCC inventory has it, but only to 2021', detail: UNFCCC_CRT, sourceUrl: 'https://unfccc.int/ghg-inventories-annex-i-parties/2026' },
  'esabcc-l2-grassland-area': { status: 'awaiting-publication', summary: 'UNFCCC inventory has it, but only to 2021', detail: UNFCCC_CRT, sourceUrl: 'https://unfccc.int/ghg-inventories-annex-i-parties/2026' },
  'esabcc-l2-wetland-area': { status: 'awaiting-publication', summary: 'UNFCCC inventory has it, but only to 2021', detail: UNFCCC_CRT, sourceUrl: 'https://unfccc.int/ghg-inventories-annex-i-parties/2026' },
  'esabcc-l2-settlements-area': { status: 'awaiting-publication', summary: 'UNFCCC inventory has it, but only to 2021', detail: UNFCCC_CRT, sourceUrl: 'https://unfccc.int/ghg-inventories-annex-i-parties/2026' },
  'esabcc-l2-other-area': { status: 'awaiting-publication', summary: 'UNFCCC inventory has it, but only to 2021', detail: UNFCCC_CRT, sourceUrl: 'https://unfccc.int/ghg-inventories-annex-i-parties/2026' },
  'esabcc-l3-afforestation': {
    status: 'awaiting-publication',
    summary: 'UNFCCC inventory has it, but only to 2021',
    detail: `${UNFCCC_CRT} Note also that the interface’s “Land Converted to Forest Land” area is the cumulative area under the 20-year conversion transition, not the annual afforestation rate this indicator needs — a naive read is roughly 20× too high.`,
    sourceUrl: 'https://unfccc.int/ghg-inventories-annex-i-parties/2026',
  },
  'esabcc-l4-deforestation': {
    status: 'awaiting-publication',
    summary: 'UNFCCC inventory has it, but only to 2021',
    detail: `${UNFCCC_CRT} Deforestation additionally has to be summed across the forest-to-cropland, forest-to-grassland and forest-to-settlement conversion tables — there is no single published line for it.`,
    sourceUrl: 'https://unfccc.int/ghg-inventories-annex-i-parties/2026',
  },
  'esabcc-l5-settlement-area': {
    status: 'awaiting-publication',
    summary: 'UNFCCC inventory has it, but only to 2021',
    detail: `${UNFCCC_CRT} Same cumulative-vs-annual caveat as afforestation: the conversion-table area is not the annual rate.`,
    sourceUrl: 'https://unfccc.int/ghg-inventories-annex-i-parties/2026',
  },
  'esabcc-a3-fertiliser-use': {
    status: 'awaiting-publication',
    summary: 'Inventory activity data, published only to 2021',
    detail: `${UNFCCC_CRT} Fertiliser nitrogen applied is a CRF *activity* table (3.D), which is exactly the kind of data env_air_gge omits.`,
    sourceUrl: 'https://unfccc.int/ghg-inventories-annex-i-parties/2026',
  },

  // ── Source series has ended (1) ──────────────────────────────────────────
  'esabcc-a3-nue': {
    status: 'source-ended',
    summary: 'Ludemann et al. dataset stops at 2020',
    detail:
      'The cited dataset ends in 2020 and is not being extended, so there is no newer value to pull. ' +
      'Two problems beyond staleness: the DOI on file (10.1093/jambio/lxac084) resolves to an unrelated ' +
      'turfgrass-microbiology paper — the correct citation is 10.5194/essd-16-525-2024 — and the report’s ' +
      'own Figure 58 derived nitrogen use efficiency from the CRF inventory rather than from Ludemann. ' +
      'Re-deriving it on the report’s actual basis would be the real fix.',
    sourceUrl: 'https://doi.org/10.5194/essd-16-525-2024',
  },

  // ── No public data export (6) ────────────────────────────────────────────
  'esabcc-b4-dwellings': { status: 'source-ended', summary: 'BSO now holds only a 2020 snapshot, not the series', detail: BSO, sourceUrl: 'https://building-stock-observatory.energy.ec.europa.eu/database/' },
  'esabcc-b4-floor-area': { status: 'source-ended', summary: 'BSO now holds only a 2020 snapshot, not the series', detail: BSO, sourceUrl: 'https://building-stock-observatory.energy.ec.europa.eu/database/' },
  'esabcc-b4-surface-residential': { status: 'source-ended', summary: 'BSO now holds only a 2020 snapshot, not the series', detail: BSO, sourceUrl: 'https://building-stock-observatory.energy.ec.europa.eu/database/' },
  'esabcc-b4-surface-tertiary': { status: 'source-ended', summary: 'BSO now holds only a 2020 snapshot, not the series', detail: BSO, sourceUrl: 'https://building-stock-observatory.energy.ec.europa.eu/database/' },
  'esabcc-i7b-cement-projects': {
    status: 'no-public-api',
    summary: 'Cembureau project map publishes no data file',
    detail:
      'The project map exists only as a JavaScript application: its HTML carries no JSON, CSV or XLSX ' +
      'endpoint, unlike the Green Steel Tracker, which does publish its full project database as a ' +
      'spreadsheet. The count exists only inside the running map. The site is also HTTP-only — it has no ' +
      'working HTTPS certificate.',
    sourceUrl: 'http://lowcarboneconomy.cembureau.eu/',
  },
  'esabcc-i7c-chemicals-projects': {
    status: 'unresolved',
    summary: 'Data is reachable, but no comparable time dimension',
    detail:
      'The map turned out to be backed by a public WordPress REST API — /wp-json/wp/v2/gips returns all ' +
      '238 projects (214 of them in the EU-27) with a country taxonomy, no browser required. The ' +
      'blocker is not access but time: the only date on a project is its website posting date, and ' +
      'rebuilding the count on that basis gives 135 EU-27 projects at end-2023 against the report’s ' +
      '171. The map has been re-curated since, so past states cannot be reproduced from the current ' +
      'contents, and a “change since the report” figure derived from it would be measuring Cefic’s ' +
      'editing schedule rather than project announcements. A current snapshot (214) is trustworthy; a ' +
      'series is not. Asking Cefic for an announcement-date field, or for their historical snapshots, ' +
      'would settle it.',
    sourceUrl: 'https://cefic.org/low-carbon-projects-map/',
  },

  // ── Not on the Eurostat dissemination API (4) ────────────────────────────
  'esabcc-i2-chemicals-use': { status: 'not-on-api', summary: 'PRODCOM is not on the Eurostat JSON API', detail: `${PRODCOM} Apparent use also needs the trade legs, so it is blocked twice over.`, sourceUrl: 'https://ec.europa.eu/eurostat/web/prodcom/database' },
  'esabcc-i2-chemicals-trade-balance': { status: 'not-on-api', summary: 'PRODCOM is not on the Eurostat JSON API', detail: PRODCOM, sourceUrl: 'https://ec.europa.eu/eurostat/web/prodcom/database' },
  'esabcc-i2-steel-trade-balance': { status: 'not-on-api', summary: 'Trade legs come from PRODCOM, not the JSON API', detail: PRODCOM, sourceUrl: 'https://ec.europa.eu/eurostat/web/prodcom/database' },
  'esabcc-i2-cement-use': {
    status: 'not-on-api',
    summary: 'Cembureau supplied the tonnage directly to the report',
    detail:
      'Apparent cement consumption came to the report from Cembureau on request; there is no public API ' +
      'or recurring data file. Cement *production* is now refreshed automatically from the Eurostat ' +
      'production index, but consumption additionally needs import and export tonnages, which sit in ' +
      'PRODCOM and are not on the JSON API either.',
    sourceUrl: 'https://www.cembureau.eu/library/reports/',
  },

  // ── Published as PDF only (2) ────────────────────────────────────────────
  'esabcc-i2-steel-use': {
    status: 'pdf-only',
    summary: 'Eurofer publishes apparent steel use in a PDF',
    detail:
      'Steel *production* is refreshed automatically (Eurostat production index for NACE C241), but ' +
      'apparent use is published only in Eurofer’s “European Steel in Figures” brochure. Extracting the ' +
      'table from that PDF each year is feasible and simply has not been built.',
    sourceUrl: 'https://www.eurofer.eu/publications/brochures-booklets-and-factsheets/european-steel-in-figures-2025',
  },
  'esabcc-a7-bioenergy-feedstock': {
    status: 'pdf-only',
    summary: 'JRC outlook is a report plus annex tables',
    detail:
      'The EU Agricultural Outlook publishes its projections as a PDF with annex spreadsheets rather ' +
      'than through an API. The 2025-2035 edition should carry 2023/24 values; wiring it up means ' +
      'locating and parsing the annex file for each edition.',
    sourceUrl: 'https://agriculture.ec.europa.eu/data-and-analysis/markets/outlook/medium-term_en',
  },

  // ── Subscription (1) ─────────────────────────────────────────────────────
  'esabcc-f-green-bonds': {
    status: 'subscription',
    summary: 'BloombergNEF is subscription-only',
    detail:
      'BNEF’s energy-transition investment figures are behind a commercial subscription with no public ' +
      'API. Worth noting a separate problem flagged in the July audit: the sibling green-bond *share* ' +
      'series is labelled BNEF but actually carries EEA/LSEG data — the two are not comparable and one ' +
      'provider should be chosen for both.',
    sourceUrl: 'https://about.bnef.com/energy-transition-investment/',
  },

  // ── No published series exists (2) ───────────────────────────────────────
  'esabcc-b3-residential-renovation-rate': {
    status: 'source-ended',
    summary: 'BSO publishes it, but only for 2020 — the report’s own last year',
    detail:
      'Two corrections to what was recorded here before. First, this is not a series nobody ' +
      'publishes: the Building Stock Observatory carries “Total renovation rate” (and “Deep ' +
      'renovation rate”) as subjects in their own right, selectable by sector, so it never needed ' +
      'reconstructing from the Climate Target Plan impact assessment. Second, that does not help — ' +
      'driving the report’s Year filter shows a single year available, 2020, which is exactly the ' +
      'last year the report already carries. There is no newer value to take. Unblocking this needs ' +
      'DG ENER to publish beyond 2020.',
    sourceUrl: 'https://building-stock-observatory.energy.ec.europa.eu/database/',
  },
  'esabcc-b3-commercial-renovation-rate': {
    status: 'source-ended',
    summary: 'BSO publishes it, but only for 2020 — the report’s own last year',
    detail:
      'As the residential series: “Total renovation rate” is a BSO subject taken with Sector set to ' +
      'Service, but the database offers only 2020, which the report already has.',
    sourceUrl: 'https://building-stock-observatory.energy.ec.europa.eu/database/',
  },

  // ── Source not yet cracked (2) ───────────────────────────────────────────
  'esabcc-f-climate-patents-share': {
    status: 'unresolved',
    summary: 'OECD API now queryable, but this measure is empty for the EU',
    detail:
      'The access problem is solved: OECD’s SDMX data endpoint answers once the dataflow reference is ' +
      'URL-encoded (DSD_GG%40DF_GREEN_GROWTH), carries its version (1.1), and uses an “all” key rather ' +
      'than a positional one. What it does not carry is this indicator. The Green Growth dataflow has ' +
      'no PT_TECH_ENV measure at all — its patent measures are GPAT_DE, GPAT_DE_RTA and TECHPAT_PAT — ' +
      'and for the EU-27 the one matching this concept (environment-related inventions as a share of ' +
      'all domestic inventions, GPAT_DE / PT_INV_D) is present but empty, reading 0 for every year ' +
      'including 2019. The only populated EU series, GPAT_DE / PT_INV_W_ENV at 21.6% in 2019, is a ' +
      'different concept — the EU’s share of *world* green patents rather than the green share of EU ' +
      'filings — and does not reproduce the report’s 11.94%. This needs OECD’s patent-specific ' +
      'ENV-Tech dataset rather than the Green Growth headline flow.',
    sourceUrl: 'https://data-explorer.oecd.org/',
  },

  // ── Deliberately withheld (1) ────────────────────────────────────────────
  'esabcc-i4-chemicals-ghg-intensity': {
    status: 'withheld',
    summary: 'Derivable, but the scopes do not match',
    detail:
      'Unlike the steel and cement intensities — both now refreshed — this one cannot be derived ' +
      'reliably. CRF 2.B covers the whole chemical industry while NACE C201 covers basic chemicals only, ' +
      'and dividing one by the other produces a 29% rise in emission intensity by 2024 that cannot be ' +
      'checked against the report’s own PRODCOM tonnage denominator. Publishing that would look like an ' +
      'update and be an artefact of the mismatch, so the series is held at its report value until the ' +
      'correct denominator is available.',
    sourceUrl: 'https://ec.europa.eu/eurostat/web/prodcom/database',
  },
};
