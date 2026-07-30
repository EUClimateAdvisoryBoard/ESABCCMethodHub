/**
 * Why a report indicator carries no data newer than the report.
 * ---------------------------------------------------------------------------
 * The Indicator Check shows all 97 report series. 75 have post-report data,
 * pulled automatically by scripts/esabcc-indicators/refresh-from-sources.mjs.
 * The other 22 do not, and "no data added since the report" on its own is not
 * a useful thing to tell a reader — the reasons are genuinely different, and
 * so is what it would take to fix each one.
 *
 * Each entry below records the *tested* reason, not an assumption. Where a
 * source was written off in an earlier pass and later turned out to be
 * reachable (FAOSTAT's bulk files, the UNFCCC Data Interface via its Python
 * client, Eurostat's R5280S biofuel code, PRODCOM on the Comext dissemination
 * host, OECD's patent-development dataset for F4, the Eurofer PDF's chart
 * labels for I2 steel use, the OECD-FAO outlook for A7), those indicators
 * were moved onto the automated path and are no longer listed here. The
 * 'not-on-api' status went with them: it existed only for PRODCOM, and
 * PRODCOM turned out to be on an API after all.
 *
 * Entries also carry `dataLinks`: the live URLs where the numbers can be read,
 * with what each one holds. "No public data export" describes the absence of a
 * file or an API, not the absence of a source — every indicator in that bucket
 * has a page a person can open, and the card now says which.
 *
 * Keep this in step with docs-internal/indicator-check-source-refresh-2026-07-30.md,
 * docs-internal/indicator-check-prodcom-unblock-2026-07-30.md and
 * docs-internal/indicator-check-blocker-links-2026-07-30.md.
 */

export type BlockerStatus =
  | 'awaiting-publication'
  | 'source-ended'
  | 'no-public-api'
  | 'pdf-only'
  | 'subscription'
  | 'never-published'
  | 'unresolved'
  | 'withheld';

/**
 * A live place the data can actually be fetched or read by hand. Kept separate
 * from `sourceUrl` (one canonical landing page) because "no public data export"
 * is not the same as "nowhere to look": for every indicator in that bucket
 * there IS a URL that holds the numbers, it just isn't a data API. Each link
 * says what you get there and in what form, so a reader can go and take the
 * value without re-deriving the route.
 *
 * Every URL here was requested successfully on 30 July 2026 (plain HTTPS
 * through the egress proxy, browser User-Agent); `what` records what came back.
 */
export interface BlockerDataLink {
  url: string;
  /** Short human label — publisher plus what the page is. */
  label: string;
  /** What the link holds, and in what form. */
  what: string;
  /** True where the numbers are machine-readable without a browser. */
  machineReadable?: boolean;
}

export interface IndicatorBlocker {
  status: BlockerStatus;
  /** One line, shown on the card. */
  summary: string;
  /** What is specifically missing, and what would unblock it. */
  detail: string;
  /** Where the data would come from, when there is somewhere to point. */
  sourceUrl?: string;
  /**
   * Where the data can be read right now, for the statuses where someone can
   * go and get it. Shown on the card so the reason never reads as a dead end.
   */
  dataLinks?: BlockerDataLink[];
  /**
   * For `withheld` only: what would be wrong with the number if it were
   * published. The status says a value is being held back; this says why
   * publishing it would mislead.
   */
  unreliableBecause?: string;
}

/** When the automated refresh last ran end to end. */
export const LAST_REFRESH = '30 July 2026';

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
  'pdf-only': {
    effort: 'work',
    action: 'Needs a table extractor for the publisher’s annual PDF or annex file.',
  },
  'no-public-api': {
    effort: 'work',
    action:
      'The publisher offers no data API or download, but the numbers are on a page that can be ' +
      'read — the links below go straight to them. Closing the gap means extracting from those ' +
      'pages, entering the values by hand each cycle, or asking the publisher for a file.',
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
    action:
      'Held back deliberately. A value could be computed today and is not shown, because it would ' +
      'move for the wrong reason:',
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

/**
 * Kept for the entries below that still cite PRODCOM. The access problem it
 * used to describe is SOLVED — see the 30 July 2026 note. PRODCOM is served by
 * a second dissemination stack under /eurostat/api/comext/, which is why every
 * probe of the main /eurostat/api/dissemination/ host (and of the catalogue and
 * bulk-file inventory, which only cover that host) came back empty.
 */
const PRODCOM_SOLVED =
  'PRODCOM itself is no longer a blocker: ds-059358 (sold production and trade) and ds-059359 ' +
  '(total production) answer over the Comext dissemination host, and I2 (chemicals) is refreshed ' +
  'from them. The report’s own dataset codes (DS-056120, DS-059268, DS-056121) have been retired ' +
  'and replaced by these.';

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
    summary: 'Map moved to Cement Europe; project list is in the page, but carries no announcement dates',
    detail:
      'The host the report cited is gone. lowcarboneconomy.cembureau.eu now serves a 52-byte nginx ' +
      'placeholder ("Please stand by while configuration is in progress", last modified June 2022) and ' +
      'every sub-path under it 404s; cembureau.eu itself 301s every path to the rebranded ' +
      'cementeurope.eu home page. The map now lives at cementeurope.eu/innovation-projects/ — and ' +
      'the earlier "needs a headless browser" verdict no longer holds: the whole project database is ' +
      'inlined in that page as a `var markers = [...]` array, so it can be parsed from static HTML. ' +
      'Re-read 30 July 2026: 124 projects, one country tag each, 114 of them EU-27 (the rest UK 6, ' +
      'Norway 3, Switzerland 1), each with technology, 5C category, EU funding programme and a scale ' +
      'status — Desktop/R&D 46, Pilot Plant 50, Commercial/Demo scale 27, the same taxonomy the ' +
      'report’s Figure 30 split (R&D 22, pilot 24, demo 7, full scale 4, unspecified 5) uses. ' +
      'What is still missing is the time dimension, exactly as for I7c: the only year on a record is ' +
      '"Operational Date", the year the plant runs (2007-2030, 6 of them still in the future), not the ' +
      'year the project was announced. A current snapshot (114 EU-27) is trustworthy; the report’s ' +
      '62-in-2023 cannot be reproduced from it, and the difference is part growth and part re-curation ' +
      'of the map. Unblocking the series needs announcement dates or historical snapshots from Cement ' +
      'Europe; unblocking the snapshot is now a parsing job, not a browser one.',
    sourceUrl: 'https://www.cementeurope.eu/innovation-projects/',
    dataLinks: [
      {
        url: 'https://www.cementeurope.eu/innovation-projects/',
        label: 'Cement Europe — Map of Innovation Projects',
        what:
          'The map page. Its HTML carries the full project list inline as a JavaScript `markers` ' +
          'array — 124 projects (114 EU-27) with country, technology, 5C category, EU funding and ' +
          'scale status. No API and no browser needed: fetch the page and parse the array.',
        machineReadable: true,
      },
      {
        url: 'https://www.cementeurope.eu/about-us/key-facts-figures/',
        label: 'Cement Europe — Key Facts & Figures',
        what:
          'Context for the same publisher: sector employees, world production shares and the EU-27 ' +
          'production/consumption series, all as inline chart data.',
        machineReadable: true,
      },
    ],
  },
  'esabcc-i7c-chemicals-projects': {
    status: 'no-public-api',
    summary: 'API is public, but carries no announcement dates',
    detail:
      'The map turned out to be backed by a public WordPress REST API — /wp-json/wp/v2/gips returns all ' +
      '238 projects (215 carrying at least one EU-27 country tag; several are multi-country, which is ' +
      'why the country tags sum to 244) with a country taxonomy, no browser required. The ' +
      'blocker is not access but time: the only date on a project is its website posting date ' +
      '(re-checked 30 July 2026 — the record’s ACF fields are curation metadata, still nothing ' +
      'announcement-dated), and rebuilding the count on that basis gives 135 EU-27 projects at ' +
      'end-2023 against the report’s 171. The map has been re-curated since, so past states cannot be ' +
      'reproduced from the current contents, and a “change since the report” figure derived from it ' +
      'would be measuring Cefic’s editing schedule rather than project announcements. A current ' +
      'snapshot (215) is trustworthy; a series is not. This is a data request, not an engineering ' +
      'task: Cefic supplying an announcement-date field, or their historical snapshots, would settle it.',
    sourceUrl: 'https://cefic.org/low-carbon-projects-map/',
    dataLinks: [
      {
        url: 'https://cefic.org/wp-json/wp/v2/gips?per_page=100',
        label: 'Cefic — WordPress REST endpoint (the map’s own data)',
        what:
          'Every project as JSON, 100 per page over 3 pages; the X-WP-Total response header gives the ' +
          'count directly (238 on 30 July 2026, 215 carrying at least one EU-27 country tag). Country, ' +
          'technology and status come as taxonomies — resolve the term ids against ' +
          '/wp-json/wp/v2/taxonomy-country. The `date` field is the website posting date, not an ' +
          'announcement date, which is why this gives a snapshot and not a series.',
        machineReadable: true,
      },
      {
        url: 'https://cefic.org/solutions-explained/low-carbon-technologies-projects/',
        label: 'Cefic — Low-carbon technologies projects (map page)',
        what:
          'The human-facing page the report cited. The map itself is a React app that renders from the ' +
          'endpoint above, so the page HTML holds no numbers — read it for the taxonomy and framing, ' +
          'take the counts from the API.',
      },
    ],
  },

  // ── No public data export (1) ────────────────────────────────────────────
  'esabcc-i2-cement-use': {
    status: 'no-public-api',
    summary: 'The publisher now charts the series publicly — 2000-2024, but only as chart data, no file',
    detail:
      'Apparent cement consumption came to the report from Cembureau on request, and the recorded ' +
      'position was that there is no public API or recurring data file. Half of that is now out of ' +
      'date. Cembureau has rebranded to Cement Europe (cembureau.eu 301s to cementeurope.eu) and its ' +
      'Key Facts & Figures page publishes "Cement Production And Consumption EU 27 & Cement Europe, ' +
      '2000-2024" as a Chart.js line chart whose four series sit inline in the page HTML. Checked ' +
      '30 July 2026: the CONSUMPTION EU27 array reproduces this indicator’s stored values to the ' +
      'tonne for every year the report carries — 2005 = 232,290,000 t against the report’s 232.3 Mt, ' +
      '2013 = 142.2, 2020 = 159.2, 2021 = 170.5 — and continues 2022 = 163.8, 2023 = 150.8, ' +
      '2024 = 148.1 Mt. So the series is the report’s own, extended, and needs no request and no ' +
      'browser; what is still absent is a data *export* — no CSV, XLSX or API, just a JavaScript ' +
      'array in a page that can be redesigned at any time, which is why this stays a manual or ' +
      'scraped read rather than a refresh recipe. The production-minus-trade route stays closed and ' +
      'is no longer needed: the report’s own workbook shows production minus Cembureau use (7-15 Mt) ' +
      'diverging from the Eurostat trade balance, so the consumption figure was never a ' +
      'production-minus-net-trade identity.',
    sourceUrl: 'https://www.cementeurope.eu/about-us/key-facts-figures/',
    dataLinks: [
      {
        url: 'https://www.cementeurope.eu/about-us/key-facts-figures/',
        label: 'Cement Europe — Key Facts & Figures',
        what:
          'Holds the series itself. The "Cement Production And Consumption EU 27 & Cement Europe ' +
          '2000-2024" chart carries four datasets inline in the page HTML (CONSUMPTION EU27, ' +
          'CONSUMPTION Cement Europe, PRODUCTION EU27, PRODUCTION Cement Europe), in tonnes, one ' +
          'value per year 2000-2024. CONSUMPTION EU27 is this indicator, and it matches the report ' +
          'exactly on the overlapping years.',
        machineReadable: true,
      },
      {
        url: 'https://www.cementeurope.eu/resources/reports/',
        label: 'Cement Europe — Reports (activity reports)',
        what:
          'The rebranded library, replacing the dead cembureau.eu/library/reports/ link. Carries the ' +
          'annual activity report (2025 edition current) for the narrative figures behind the chart.',
      },
      {
        url: 'https://ec.europa.eu/eurostat/databrowser/view/sts_inpr_a/default/table?lang=en',
        label: 'Eurostat — production index sts_inpr_a (NACE C235)',
        what:
          'What cement *production* is already refreshed from, kept here because the two legs are ' +
          'read together. Not a substitute for the consumption series: an index, not tonnes.',
        machineReadable: true,
      },
    ],
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

  // ── Deliberately withheld (1) ────────────────────────────────────────────
  'esabcc-i4-chemicals-ghg-intensity': {
    status: 'withheld',
    summary: 'Derivable, but the scopes do not match',
    detail:
      'Still withheld, but for a smaller reason than before. The CRF 2.B ÷ NACE C201 ratio that was ' +
      'tried is a scope mismatch — whole chemical industry over basic chemicals only — and produces a ' +
      '29% rise in intensity by 2024 that is an artefact. What the report actually did is now legible: ' +
      'emissions from the EU ETS data viewer at activity code 42 (bulk organic chemicals), divided by ' +
      'PRODCOM *total* production (DS-056121, now ds-059359) of ethylene, propylene and aromatics. ' +
      `${PRODCOM_SOLVED} Half the recipe therefore works: ethylene and propylene reproduce the ` +
      'report’s denominator exactly (2013: 16.096 and 12.936 Mt). Two pieces are missing — the ' +
      '“aromatics” line is not any subset of the PRODCOM aromatic codes tried (best fit 6% off, and ' +
      'benzene+toluene+xylenes alone is 22% short), and the ETS activity-code numerator is not yet ' +
      'wired. Until both are settled the series stays at its report value.',
    unreliableBecause:
      'It’s a ratio, and neither available pairing puts the same plants on both sides. The ' +
      'substitute that was tried (CRF 2.B ÷ NACE C201) divides the whole chemical industry’s ' +
      'emissions by basic chemicals output alone — the numerator counts factories the denominator ' +
      'never counts. Since those scopes are drifting apart, the ratio rises 29% by 2024, which ' +
      'reads as the industry getting a third dirtier and is pure artefact. The report’s own recipe ' +
      'is the right pairing and half works — ethylene and propylene reproduce its denominator to ' +
      'three decimals — but the aromatics leg can’t be matched (BTX alone 22% short, best fit ' +
      'still 6% off), and 6% is the same order as the real post-report intensity change, so the ' +
      'error would swamp the signal.',
    sourceUrl: 'https://ec.europa.eu/eurostat/databrowser/view/ds-059359/default/table?lang=en',
    dataLinks: [
      {
        url: 'https://ec.europa.eu/eurostat/databrowser/view/ds-059359/default/table?lang=en',
        label: 'Eurostat PRODCOM ds-059359 — total production (the denominator)',
        what:
          'Replaces the report’s retired DS-056121. Ethylene and propylene reproduce the report’s ' +
          'denominator exactly; the aromatics basket is the open question. Served over the Comext ' +
          'dissemination host, /eurostat/api/comext/, not the main dissemination API.',
        machineReadable: true,
      },
      {
        url: 'https://www.eea.europa.eu/en/analysis/maps-and-charts/emissions-trading-viewer-1-dashboards',
        label: 'EEA — EU ETS data viewer (the numerator)',
        what:
          'Verified emissions by ETS activity code; code 42 is bulk organic chemicals, the numerator ' +
          'the report used. Not yet wired into the refresh.',
      },
    ],
  },
};
