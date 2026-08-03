# Closing the "no public data export" bucket — I2 (cement, use), I7b, I7c

**Date:** 3 August 2026
**Scope:** the three indicators that carried the `no-public-api` blocker status on the
Indicator Check (Summer Prep · Note 1).
**Outcome:** all three now have post-report data and an automated recipe. The status itself
is deleted — the bucket is empty and cannot be repopulated.

Before: 97 report series, 75 with post-report data, 22 without.
After: 97 report series, **78** with post-report data, **19** without.

---

## What the status used to say, and why it was wrong

`no-public-api` meant: *the publisher offers no data API or download, but the numbers are on a
page that can be read — closing the gap means extracting from those pages, entering the values
by hand each cycle, or asking the publisher for a file.*

That was accurate about the absence of a file. It was wrong about the consequence. In all three
cases the numbers are not merely "on a page a person can open" — they are in the page **as
data**, in a form a script reads without a browser. The distinction that mattered was never
API-vs-no-API; it was machine-readable-vs-not.

---

## I2 (cement, use) — EU apparent cement consumption

**Route:** `https://www.cementeurope.eu/about-us/key-facts-figures/`

Cembureau has rebranded to Cement Europe (`cembureau.eu` 301s to `cementeurope.eu`). Its
Key Facts & Figures page carries the chart *"Cement Production And Consumption EU 27 & Cement
Europe, 2000-2024"* as a Chart.js line chart, and the four datasets sit inline in the page HTML,
in tonnes, one value per year:

```
label: 'CONSUMPTION EU27', data: [210941000, 209847572, …, 163755000, 150828000, 148091000]
const labels_176672 = ["2000", "2001", …, "2023", "2024"];
```

**The series is the report's own, extended.** `CONSUMPTION EU27` reproduces every year the
report carries, to the tonne:

| Year | Page (t)    | Report (Mt) |
|-----:|------------:|------------:|
| 2005 | 232,290,000 | 232.3 |
| 2013 | 142,188,000 | 142.2 |
| 2020 | 159,215,000 | 159.2 |
| 2021 | 170,472,000 | 170.5 |

and continues **2022 = 163.8, 2023 = 150.8, 2024 = 148.1 Mt**. The refresh's anchor check
reports `1.000× anchor`.

**Independent confirmation of the last year.** Cement Europe's *Activity Report 2025* (p. 26)
states in prose: *"In 2024, cement production in the Cement Europe area reached 174.5 million
tonnes (-0.5%), while EU27 production stood at 160.8 million tonnes (-0.2%) … Cement consumption
declined to 165.1 million tonnes across Cement Europe members and **148.1 million tonnes in the
EU27**."* Same number, different publication, different form — so the chart parse is not a
single point of failure.

**What is still true.** There is no CSV, no XLSX and no API; the numbers are a JavaScript array
in a page that can be redesigned at any time. The recipe is therefore anchored on the dataset's
`label` rather than its position, and requires the year-label array to have the same length as
the data array — a redesign breaks the recipe loudly instead of silently shifting values onto
the wrong years. The production-minus-trade route stays closed and is no longer needed.

## I7b — low-carbon cement projects (EU)

**Route:** `https://www.cementeurope.eu/innovation-projects/`

The host the report cited (`lowcarboneconomy.cembureau.eu`) is gone. The map now lives at
`cementeurope.eu/innovation-projects/`, and its whole project database is inlined as a
`var markers = [ … ]` array — country, technology, 5C category, EU funding programme and scale
status per project. Static HTML parse; no headless browser.

Read 3 August 2026: **124 projects in 21 countries, of which 114 EU-27** (the other ten are
UK 6, Norway 3, Switzerland 1). By scale: Pilot Plant 50, Desktop/R&D 46, Commercial/Demo 27 —
the same taxonomy the report's Figure 30 split uses. By 5C category: Clinker 97, Cement 12,
Concrete 9, (Re)Carbonation 6, Construction 1.

## I7c — low-carbon chemicals projects (EU)

**Route:** `https://cefic.org/wp-json/wp/v2/gips?per_page=100&page=N`

The map is a React app with no numbers in its HTML, but it renders from a public WordPress REST
collection. `X-WP-Total` gives the count directly; country term ids resolve against
`/wp-json/wp/v2/taxonomy-country`.

Read 3 August 2026: **238 projects across 19 countries, of which 215 carry at least one EU-27
country tag** (the other four are UK 18 and Norway 7; several projects are multi-country, which
is why country tags sum to more than the project count). By technology, over the EU-27 subset:
renewable electricity & PPAs 77, hydrogen 29, chemical recycling 28, efficiency 25,
waste/biomass to energy 18, mechanical recycling 15, biochemicals 13, CCS 8, CCU 8,
e-cracker/electrification 6, feedstock substitution 2, other recycling 1, digitalisation 1.

---

## The caveat that survives, and where it now lives

Neither project map dates a project by its **announcement**.

* The cement map's only year is *Operational Date* — the year the plant runs. Six of the 124 are
  in the future (2028-2030).
* Cefic's only date is the WordPress posting date, and those cluster in the batches the map is
  republished in: 2022-12 (9), 2023-01 (86), 2023-02 (14), 2023-07 (45), 2024-01 (11),
  2024-02 (12), 2024-12 (20), 2025-01 (1), 2025-07 (40). The map's own disclaimer says it is
  updated twice a year. Those dates record Cefic's editing schedule, not project announcements.

So the report's `62` (I7b, 2023) and `171` (I7c, 2023) cannot be reproduced from the current
maps, and the step to `114` and `215` is **part real growth and part re-curation**. This has not
changed since the July pass; what changed is where the caveat lives. Previously it was the
justification for publishing nothing. Now the values are published as what they are — a snapshot
of each map on the day it was read, stamped with the run year — and the caveat sits in each
indicator's description, in the migration, and here.

A genuine *series* still needs announcement dates or historical snapshots from Cement Europe and
Cefic. That is a data request, not an engineering task, and it stays open.

---

## What changed in the repo

| File | Change |
|---|---|
| `scripts/esabcc-indicators/refresh-from-sources.mjs` | Three recipes (`chartjs-series`, `map-marker-count`, `cefic-project-count`) and their fetchers |
| `src/data/esabcc-indicators.ts` | +5 post-report points; source lines and descriptions rewritten, incl. the snapshot caveat |
| `src/data/indicator-blockers.ts` | The three entries and the `no-public-api` status removed |
| `scripts/esabcc-indicators/refresh-provenance.json` | Regenerated for the three ids |
| `supabase/migrations/085_cement_chemicals_project_refresh.sql` | The same points and source lines for the workspace DB |
| `beta/modules/summer-prep/indicator-check/page.tsx` | Provenance copy: the new publishers, and the snapshot caveat |

The Indicator Check's status panel is fully derived from the data, so the "No public data
export" card disappears on its own once the blockers are gone — nothing on the page is
hard-coded to it.

## Re-running

```
node scripts/esabcc-indicators/refresh-from-sources.mjs --dry-run \
  --only=esabcc-i2-cement-use,esabcc-i7b-cement-projects,esabcc-i7c-chemicals-projects
```

Both project-count recipes stamp the run year, so a run in a later year appends a new snapshot
rather than overwriting the old one. All three publisher sites reject the default fetch
User-Agent; the fetchers send a browser one.
