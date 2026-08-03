/**
 * Why a report indicator carries no data newer than the report.
 * ---------------------------------------------------------------------------
 * The Indicator Check shows all 97 report series. 78 have post-report data,
 * pulled automatically by scripts/esabcc-indicators/refresh-from-sources.mjs.
 * The other 19 do not, and "no data added since the report" on its own is not
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
 * The 'no-public-api' status went the same way on 3 August 2026. It held three
 * indicators — I2 (cement, use), I7b and I7c — on the grounds that their
 * publishers offer no file and no API, so the numbers would have to be read by
 * hand each cycle. All three turned out to be machine-readable without a
 * browser: Cement Europe inlines the cement production/consumption series as a
 * Chart.js dataset in its Key Facts & Figures page and its innovation-projects
 * map as a `var markers` array, and Cefic's map renders from a public WordPress
 * REST collection. Each now has a recipe in refresh-from-sources.mjs, so the
 * bucket is empty and the status is gone. The two project counts carry a
 * caveat that lives in the indicator description rather than here: neither map
 * dates a project by its announcement, so their post-report points are
 * snapshots of the map, not a rebuilt series.
 *
 * Entries can also carry `dataLinks`: the live URLs where the numbers can be
 * read, with what each one holds — kept for the entries where the reason is
 * about the *shape* of a source rather than its absence.
 *
 * Keep this in step with docs-internal/indicator-check-source-refresh-2026-07-30.md,
 * docs-internal/indicator-check-prodcom-unblock-2026-07-30.md,
 * docs-internal/indicator-check-blocker-links-2026-07-30.md and
 * docs-internal/indicator-check-nopublicapi-close-2026-08-03.md.
 */

export type BlockerStatus =
  | 'awaiting-publication'
  | 'source-ended'
  | 'pdf-only'
  | 'subscription'
  | 'never-published'
  | 'unresolved'
  | 'withheld';

/**
 * A live place the data can actually be fetched or read by hand. Kept separate
 * from `sourceUrl` (one canonical landing page) so that a blocked indicator
 * never reads as a dead end: where the numbers exist somewhere but the recipe
 * does not, each link says what you get there and in what form, so a reader can
 * go and take the value without re-deriving the route.
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
export const LAST_REFRESH = '3 August 2026';

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

  // ── Building Stock Observatory: source series has ended (4) ──────────────
  'esabcc-b4-dwellings': { status: 'source-ended', summary: 'BSO now holds only a 2020 snapshot, not the series', detail: BSO, sourceUrl: 'https://building-stock-observatory.energy.ec.europa.eu/database/' },
  'esabcc-b4-floor-area': { status: 'source-ended', summary: 'BSO now holds only a 2020 snapshot, not the series', detail: BSO, sourceUrl: 'https://building-stock-observatory.energy.ec.europa.eu/database/' },
  'esabcc-b4-surface-residential': { status: 'source-ended', summary: 'BSO now holds only a 2020 snapshot, not the series', detail: BSO, sourceUrl: 'https://building-stock-observatory.energy.ec.europa.eu/database/' },
  'esabcc-b4-surface-tertiary': { status: 'source-ended', summary: 'BSO now holds only a 2020 snapshot, not the series', detail: BSO, sourceUrl: 'https://building-stock-observatory.energy.ec.europa.eu/database/' },

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
