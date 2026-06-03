# M · 16 — Funding Sources

!!! tip "Status"
    Beta · parked under [`beta/modules/funding-sources/`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/tree/main/beta/modules/funding-sources) · route only enabled when promoted to `src/app/`

Tracks EU research funding flowing into the topics the Board reports on, drawn
from the Horizon Dashboard and the DG DIGIT QlikSense tender dashboard. Used
to brief DG R&I and to estimate the EU-funded share of the literature cited
in Board reports.

## User story

> A Secretariat analyst is preparing a one-page brief on what the EU is
> already funding in climate-stress-testing of supervised entities. They
> open the Funding Sources module, filter by *Cluster 5 — Climate, Energy
> & Mobility* and the keyword "stress test", export the filtered slice
> to Excel, and walk into the DG R&I meeting with the project portfolio,
> coordinators, EC contributions, and direct CORDIS links already on
> their laptop.

## Where the data comes from

The module is fed by **two upstream systems**, both run by the European
Commission:

| Source ID | System | Publisher | License | Refresh | Per-project URL pattern |
|-----------|--------|-----------|---------|---------|--------------------------|
| `horizon-dashboard` | [Horizon Europe Dashboard](https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/horizon-dashboard) | DG R&I | CC-BY 4.0 | monthly | `https://cordis.europa.eu/project/id/{id}` |
| `qs-digit` | [DG DIGIT — Tender & Contracts (QlikSense)](https://dashboard.tech.ec.europa.eu/qs_digit_dashboard_mt/public/sense/app/3744499f-670f-42f8-9ef3-0d98f6cd586f/sheet/4c9ea8df-f0f9-4c0d-b26b-99fc0218d9d9/state/analysis) | DG DIGIT | EU OpenData | weekly | _no stable per-record URL_ |

Each row in the on-screen Projects table now carries a **direct link** back
to its canonical record:

- Horizon-Europe-funded projects link to their CORDIS project page,
  e.g. PROBIOMASS → <https://cordis.europa.eu/project/id/101081244>.
- DG DIGIT contracts link back to the QlikSense sheet (which is the most
  granular publicly-addressable surface — the dashboard does not mint
  per-record permalinks).

The link target is stored on each project record under `sourceUrl` in
[`public/data/funding-sources.json`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/public/data/funding-sources.json)
and is also written into the **Source URL** column of the Excel export, as a
clickable hyperlink.

## Bulk data — getting at the underlying database

For analyses that need more than the curated snapshot, three official bulk
endpoints are available. They are listed in-app under "Upstream feeds &
bulk downloads" on the module page:

### 1. CORDIS open-data archive (recommended)

The full Horizon Europe project portfolio — projects, organisations,
deliverables, publications, topics — is published as **CSV, Excel, JSON
and XML** on the EU open-data portal:

- **Dataset:** [CORDIS — EU research projects under Horizon Europe (2021–2027)](https://data.europa.eu/data/datasets/cordis-eu-research-projects-under-horizon-europe-2021-2027)
- **Mirror:** <https://cordis.europa.eu/data>
- **Refresh:** weekly
- **License:** CC-BY 4.0

This is the same data that powers the Horizon Dashboard, in raw form. It
is the right starting point for any quantitative analysis and is what the
planned `scripts/fetch-funding-sources.py` scraper will consume.

### 2. Horizon Dashboard — in-page export

Each chart on the [Horizon Europe Dashboard](https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/horizon-dashboard)
has an **Export** affordance (top-right of the chart) that downloads the
currently-filtered slice as `.xlsx` or `.csv`. Useful for one-off pulls
where the dashboard's filter UI is faster than writing the equivalent
query against the open-data archive.

### 3. DG DIGIT QlikSense — sheet-level export

QlikSense tables expose a context-menu **Download as…** entry on every
data table. There is no stable JSON endpoint, which is why the prototype
reads from a curated snapshot for now.

For cross-checking contracted amounts beyond the DIGIT scope, the
**[EU Financial Transparency System (FTS)](https://ec.europa.eu/budget/financial-transparency-system/index.html)**
publishes the authoritative annual beneficiaries CSV across all DGs.

## Data model

The page reads a single JSON snapshot:
[`public/data/funding-sources.json`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/public/data/funding-sources.json).

### Top-level shape

| Field         | Type                | Notes |
|---------------|---------------------|-------|
| `lastUpdated` | ISO date            | Snapshot date shown in the headline tile. |
| `sources[]`   | `FundingSource[]`   | Upstream feed metadata (see below). |
| `projects[]`  | `FundingProject[]`  | One entry per project / contract. |

### `FundingSource`

| Field                  | Type                | Notes |
|------------------------|---------------------|-------|
| `id`                   | string              | Stable key referenced by each project's `source` field. |
| `name`                 | string              | Display name shown under "Upstream feeds". |
| `url`                  | URL                 | Landing page for the dashboard / portal. |
| `publisher`            | string              | DG / agency that owns the data. |
| `license`              | string              | Reuse licence (CC-BY 4.0, EU OpenData, …). |
| `refresh`              | string              | How often upstream refreshes (weekly / monthly). |
| `perProjectUrlPattern` | string \| null      | URL template — `{id}` is substituted at render time when the source does not pre-store a `sourceUrl` on the project. |
| `bulkDownloads[]`      | `BulkDownload[]`    | One or more CSV / Excel / JSON endpoints for the whole feed (see "Bulk data" above). |

### `BulkDownload`

| Field   | Type   | Notes |
|---------|--------|-------|
| `label` | string | Human-readable name shown under the feed. |
| `url`   | URL    | Direct link to the dataset / portal page. |
| `format`| string | Comma-separated formats, e.g. `csv,xlsx,json,xml`. |
| `notes` | string | Optional caveat — refresh cadence, scope, gotchas. |

### `FundingProject`

| Field                 | Type        | Source field on upstream | Notes |
|-----------------------|-------------|--------------------------|-------|
| `id`                  | string      | CORDIS Grant Agreement ID (Horizon) or DG DIGIT contract ID | Used as the React key and to build CORDIS URLs. |
| `source`              | string      | _internal_               | Foreign key into `sources[]`. |
| `sourceUrl`           | URL         | _derived_                | Direct link to the canonical record. CORDIS for Horizon projects; QlikSense sheet for DG DIGIT. |
| `acronym`             | string      | CORDIS `acronym`         | Short project name, displayed in monospace. |
| `title`               | string      | CORDIS `title`           | Full project title. |
| `programme`           | string      | CORDIS `frameworkProgramme` | "Horizon Europe", "Digital Europe Programme", … |
| `pillar`              | string      | CORDIS `legalBasis` group | Pillar I/II/III for Horizon Europe. |
| `cluster`             | string      | CORDIS `legalBasis` cluster | Horizon Europe cluster (e.g. *Cluster 5 — Climate, Energy & Mobility*). |
| `topic`               | string      | CORDIS `topics`          | Call topic ID, e.g. `HORIZON-CL5-2023-D1-02-01`. |
| `coordinator`         | string      | CORDIS `coordinator`     | Coordinating organisation's short name. |
| `country`             | ISO-3166 α2 | CORDIS `coordinatorCountry` | Coordinator country code. |
| `consortiumCountries` | string[]    | CORDIS `participantCountries` | All participating countries. |
| `startDate`           | ISO date    | CORDIS `startDate`       | |
| `endDate`             | ISO date    | CORDIS `endDate`         | |
| `ecContribution`      | number (€)  | CORDIS `ecMaxContribution` | EU contribution in euros (not millions). |
| `totalCost`           | number (€)  | CORDIS `totalCost`       | Includes co-funding. |
| `status`              | enum        | CORDIS `status`          | `ongoing` \| `closing` \| `closed`. |
| `keywords`            | string[]    | CORDIS `keywords` / hand-curated | Used by the on-page search. |
| `callDg`              | string      | CORDIS `fundingScheme`   | Lead DG short code (RTD, ENER, MOVE, AGRI, DIGIT, CLIMA). |

## Code surface

| Path | Role |
|------|------|
| [`beta/modules/funding-sources/page.tsx`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/beta/modules/funding-sources/page.tsx) | Client component: filters, headline tiles, by-DG bar chart, projects table with per-row source links, upstream-feeds panel. |
| [`beta/modules/funding-sources/export.ts`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/beta/modules/funding-sources/export.ts) | ExcelJS workbook with **Projects** + **Summary** sheets; the Summary sheet now also embeds the upstream-feed citation trail and bulk-download URLs as clickable hyperlinks. |
| [`public/data/funding-sources.json`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/public/data/funding-sources.json) | Curated snapshot fed to the page at runtime. |
| [`src/app/beta/funding-sources/page.tsx`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/app/beta/funding-sources/page.tsx) | One-line re-export so the beta page is reachable when manually routed. |

## On-page surfaces

The route renders five sections, top to bottom:

1. **Headline tiles** — number of projects in view, total EC contribution,
   total cost (incl. co-funding), and the snapshot date.
2. **Filter bar** — free-text search (acronym, title, coordinator,
   keywords), Lead DG dropdown, Status dropdown, *Export to Excel* button.
3. **EC contribution by lead DG** — horizontal bar chart, recomputed from
   the filtered set.
4. **Projects table** — Acronym · Title (+ programme & topic) ·
   Coordinator · DG · Period · EC contribution · Status · **Source**
   (direct link to CORDIS / QlikSense).
5. **Upstream feeds & bulk downloads** — for each upstream feed: name
   (linked), publisher, license, refresh cadence, per-project URL pattern,
   and one or more bulk download endpoints with formats and notes.

## Excel export

The *Export to Excel* button (in the filter bar) writes
`esabcc-funding-sources-YYYY-MM-DD.xlsx` with two sheets:

### Projects sheet

19 columns, frozen header, auto-filter, currency formatting on €
columns, ESABCC-navy header band:

```
Acronym | Title | Project ID | Programme | Pillar | Cluster | Topic |
Lead DG | Coordinator | Country | Consortium | Start | End |
EC contribution € | Total cost € | Status | Keywords | Source | Source URL
```

The **Source URL** column is a real Excel hyperlink, so reviewers can click
straight through to CORDIS from inside the workbook.

### Summary sheet

- Snapshot date, filters applied at export, project count, totals.
- Per-DG breakdown table (DG · € · projects).
- **Upstream feeds & bulk downloads** block — same metadata as the
  on-page panel, with CSV / Excel / JSON / XML endpoints rendered as
  clickable hyperlinks. This preserves the citation trail when the
  workbook leaves the application.

## Refresh path (planned)

The current snapshot is curated. The intended automation is documented in
[`beta/README.md`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/beta/README.md):

- `scripts/fetch-funding-sources.py` (TODO) pulls the CORDIS open-data
  CSV bundle weekly, projects it into the `funding-sources.json` shape,
  and commits the snapshot.
- The QlikSense feed remains a manual top-up until DG DIGIT exposes a
  stable JSON endpoint.

## Promoting to production

Same one-command path as every other beta module:

```bash
git mv beta/modules/funding-sources src/app/funding-sources
$EDITOR src/components/SiteHeader.tsx       # add to MODULES nav
$EDITOR src/app/page.tsx                    # add to productionModules tile grid
```

After that, `next build` picks the route up automatically.
