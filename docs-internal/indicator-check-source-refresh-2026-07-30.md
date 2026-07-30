# Indicator Check — the "work needed" pile, worked (30 July 2026)

Follow-up to `indicator-check-source-refresh-2026-07-29.md`. That note left
four indicators on the Update-status panel flagged as needing engineering:
**A7** and **I2 (steel, use)** under "Published as PDF only", **F4** and
**I7c** under "Source not yet cracked". This note records what was built for
three of them, and why the fourth moved category instead.

Net effect: **72 of 97** indicators now refresh automatically (was 69), and
the "Source not yet cracked" card is gone from the page.

## 1. F4 — climate-related share of EU patent filings. Automated.

The 29 July note ended with "this needs OECD's patent-specific ENV-Tech
dataset rather than the Green Growth headline flow — a further search, but a
well-defined one". That search is done. The maintained series lives in
`OECD.ENV.EPI DSD_PAT_DEV@DF_PAT_DEV` ("Patents - technology development"):
fractional patent-family counts (family size two+, inventor country, priority
year) by technology, annual to **2023**.

The share is `ENV_PAT ÷ TOT × 100`. Three things worth recording:

- **The EU aggregate is half-published.** The flow carries an `EU27_2020`
  aggregate for `ENV_PAT` but none for `TOT`, so both legs are summed from
  the 27 member states. Fractional counting makes the sum exact — the
  member-state sum of `ENV_PAT` reproduces OECD's own `EU27_2020` aggregate
  to the last decimal in every year 1990-2023.
- **The sibling flow is a dead end.** `DSD_PAT_IND@DF_PAT_IND` publishes this
  exact ratio pre-computed (`PT_TECH`) and matches the report almost exactly
  (2018: 12.90 vs report 12.93) — but only for the retired `EU27`
  composition, frozen at 2018, and its `EU27_2020` rows read 0 for every
  year. It is the frozen upstream of the Green Growth figures the report
  used, not a live source.
- **Splice-only, and why.** The current vintage revises the report's years
  upward — the report's 2019 = 11.94 reads **14.44** in today's data,
  because counts for recent years fill in as families publish. Direct mode
  would step the series +21% at the join. Spliced onto the report's 2019:
  **2020 = 12.32, 2021 = 9.41, 2022 = 6.86, 2023 = 6.75**. The fall is the
  source's own trend (green share of EU filings has declined sharply since
  2021 — total filings held level while environment-related ones dropped);
  the last one-two years will revise on future runs, and the refresh
  regenerates every afterReport point each time, so revisions flow through.

One server quirk cost an hour and is now handled in `fetchOecd`: the SDMX
endpoints return a hard 500 (body `languageTag1`) when `Accept-Language` is
absent or the bare `*` Node's fetch sends by default. Pinning it to `en`
fixes every request; curl "worked" all along only because it sends none.

## 2. I2 (steel, use) — Eurofer PDF. Automated.

Exactly the table extractor the card asked for, with one twist: the numbers
are not in a table. "European Steel in Figures" prints the real-vs-apparent
consumption chart with a **data label for every year**, and pdfjs-dist
(already a dependency) exposes each label with its x/y position. The two
plotted series come back as two rows of thousand-separated numbers aligned
to a row of year labels; '000 t → Mt.

Robustness choices, since the brochure is redesigned freely:

- The newest edition is discovered from the publications listing
  (`european-steel-in-figures-<year>`, take max year), then the PDF href from
  the edition page — no versioned URL to go stale, unlike the LeadIT recipe.
- Which of the two rows is *apparent* consumption is decided by matching
  against the report's own stored 2016-2020 values (mean deviation must be
  <5%), not by legend geometry. The 2026 edition reorders label x-positions
  mid-row (2025's label precedes 2024's in the text stream); mapping each
  label to its nearest year-label x handles that.
- `parseNum` must NOT be used on these labels: it reads `146,784` as a
  European decimal (146.784). The row regex guarantees English thousands
  format, so commas are stripped instead.

The 2026 edition's 2021 anchor reproduces the report at **1.009×**, so this
runs direct — the publisher's own figures are stored: **2022 = 138.4,
2023 = 130.1, 2024 = 128.7, 2025 = 134.4 Mt**.

## 3. A7 — bioenergy feedstock. Automated, but not the way the card said.

The card said "needs a table extractor for the publisher's annual PDF or
annex file". Tested and false on every branch — the JRC medium-term outlook
data is no longer published in any extractable form:

- The **2024-2035 report PDF** prints annex balance tables with a single
  "avg 2022-2024" column plus projection years — no per-year history to
  extract.
- The **2025-2035 report** dropped the statistical annex entirely
  (methodology only).
- The **annex XLSX** catalogued on both the EU Open Data Portal and the JRC
  Data Catalogue (`medium-term-outlook-tables_en.xlsx`) 404s — the
  ec.europa.eu/info path it lived on was decommissioned.
- **DataM**, where the data actually lives, requires a Bearer token issued by
  mail (JRC-DATAM@ec.europa.eu); its dashboards are a PrimeFaces JSF app that
  needs a browser session (see §5).
- The **agri-food data portal API** (api.tech.ec.europa.eu/agrifood) has
  production and price endpoints but no balance sheets.

What does work: the **OECD-FAO Agricultural Outlook** — the same
Aglink-Cosimo model family, EU projections built jointly with DG AGRI/JRC —
publishes the equivalent variables openly on the same SDMX API as F4.
Measure `BF` ("biofuel use") for wheat + maize + other coarse grains +
vegetable oil reproduces the report series to within **~2% over 2010-2019**
(2010: 1.003×, 2019: 1.004×); the report's 2020-2021 sit 4-10% higher (a
JRC-vintage difference on those two years), so the recipe is splice-only.
That tolerance is in line with existing splice recipes (B2 runs at 0.932×,
A5 dairy at 0.765×).

Two guards specific to this source: the dataflow id is versioned per edition
(`DF_OUTLOOK_2026_2035`), so the newest edition is resolved from the
`OECD.TAD.ATM` dataflow catalogue on each run; and the flow carries
projection years with no distinguishing `OBS_STATUS`, so everything from the
id's first year onward is dropped — the series ends at the outlook's
estimate year. Result: **2022 = 25.19, 2023 = 24.56, 2024 = 24.15,
2025 = 24.51 Mt** on the report's basis.

## 4. I7c — reclassified, not cracked, deliberately.

Re-tested the Cefic WordPress API on the chance a date field had appeared:
`/wp-json/wp/v2/gips` still returns every project with only its website
posting date; the ACF fields are curation metadata (`review`,
`do_not_resync`), nothing announcement-dated. The 29 July analysis stands —
a series rebuilt from posting dates measures Cefic's editing schedule, not
project announcements.

So I7c's card was mislabelled rather than unbuilt: "source not yet cracked —
a known next step exists but is not built" implied engineering, but the next
step is **asking Cefic** for an announcement-date field or their historical
snapshots. Moved to `no-public-api` ("needs a data request to the
publisher"), which is what that status text already says. With F4 automated,
the "Source not yet cracked" bucket is now empty and the card disappears.

## 5. Environment note: the sandbox can reach far more than assumed

The 29 July note wrote seven indicators off as "blocked by this build
environment". Re-tested today from the Claude Code web sandbox: **plain
HTTPS via the egress proxy reaches everything this batch needed** —
sdmx.oecd.org, eurofer.eu (both HTML and PDF assets), cefic.org,
agriculture.ec.europa.eu (needs a browser User-Agent or the EC "Sorry" page
intercepts), bulks-faostat.fao.org. Node's fetch needs `NODE_USE_ENV_PROXY=1`
locally; GitHub Actions is unaffected.

Chromium remains genuinely blocked, and the failure mode is now precise:
with `--proxy-server` pointed at the egress proxy, plain-HTTP requests reach
it (its log shows Chromium's `clients2.google.com` chatter) but every HTTPS
`CONNECT` dies with `ERR_CONNECTION_RESET` before reaching the relay, with
or without Playwright. So the B4/I7b browser verdicts stand, but "needs a
headless browser" should not be read as "needs to leave this sandbox" for
anything curl-shaped.

## 6. Files

- `scripts/esabcc-indicators/refresh-from-sources.mjs` — 3 new recipes
  (61 → 64) and 4 new fetchers: `fetchOecd` (retry + Accept-Language guard),
  `fetchOecdCsv`, `fetchOecdPatentShare`, `fetchAglinkBiofuelUse`,
  `fetchEuroferPdfSeries`
- `src/data/esabcc-indicators.ts` — refreshed via the script; 12 new points
  across F4, A7, I2 (steel, use); the other 61 recipes re-ran identical
- `src/data/indicator-blockers.ts` — F4/A7/I2-steel-use entries removed,
  I7c reclassified `unresolved` → `no-public-api`, counts and LAST_REFRESH
  updated
- `supabase/migrations/055_backfill_indicator_points.sql` — regenerated
  (225 points / 72 indicators, was 213/69); `supabase/combined_migrations.sql`
  synced

Migration 055 must be applied for production to show the three new series —
the TS file is the seed and preview fallback; the site reads
`pw_indicator_points`.
