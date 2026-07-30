# Indicator Check — where the blocked data actually is (30 July 2026)

Two cards on the Update-status panel answered the wrong question.

**"No public data export" (3 — I2 cement use, I7b, I7c)** said *"Needs a data
request to the publisher, or manual entry each cycle"* and pointed nowhere. A
reader who wanted the number had no way to go and get it, even though for all
three there is a live page that holds it.

**"Withheld — would be unreliable" (1 — I4 chemicals)** said *"Held back
deliberately. Needs the correct denominator before anything is published"* —
which states that a value is being withheld without ever saying what would be
wrong with it. "Unreliable" was an assertion, not an explanation.

This pass fills both gaps, and the link-checking turned up four things that
were out of date.

## 1. Every link was re-requested, and two were dead

Plain HTTPS through the egress proxy with a browser User-Agent, 30 July 2026.

| URL as recorded | Result |
| --- | --- |
| `http://lowcarboneconomy.cembureau.eu/` (I7b indicator + blocker) | **Dead.** 52-byte nginx page, "Please stand by while configuration is in progress", `last-modified: Thu, 30 Jun 2022`. Every sub-path (`/map`, `/projects`, `/data`) 404s. HTTPS serves the same 52 bytes. |
| `https://www.cembureau.eu/library/reports/` (I2 cement-use blocker) | **Dead as a link.** 301 to the rebranded `cementeurope.eu` — but *not* path-preserving: every cembureau.eu path lands on the new home page, so this read as "200 OK" to any checker that only looks at status codes. |
| `https://cefic.org/wp-json/wp/v2/gips` | Live. 238 projects, `X-WP-Total: 238`. |
| `https://cefic.org/solutions-explained/low-carbon-technologies-projects/` | Live, 217 KB. |
| `https://ec.europa.eu/eurostat/databrowser/view/ds-059359/…` | Live. |
| `https://www.eea.europa.eu/data-and-maps/dashboards/emissions-trading-viewer-1` | Live, 301s to `/en/analysis/maps-and-charts/emissions-trading-viewer-1-dashboards` — the new path is now stored. |

CEMBUREAU is now **Cement Europe** (`cementeurope.eu`). The paths that matter:
`/innovation-projects/` (the map, ex-`lowcarboneconomy`), `/about-us/key-facts-figures/`,
`/resources/reports/` (ex-`/library/reports/`).

## 2. I2 (cement, use) — the publisher now publishes it

The recorded position was "Cembureau supplied the tonnage directly to the
report; there is no public API or recurring data file". Half of that is no
longer true. `cementeurope.eu/about-us/key-facts-figures/` carries a chart
titled **"Cement Production And Consumption EU 27 & Cement Europe, 2000-2024"**,
and its four Chart.js datasets sit inline in the page HTML — no browser, no
request to the association:

```
labels_255356  = ["2000", … "2024"]
CONSUMPTION EU27 = [210941000, 209847572, … 163755000, 150828000, 148091000]
```

`CONSUMPTION EU27` **is this indicator.** It reproduces the stored series to
the tonne on every year the report carries — 2005 = 232,290,000 t against the
report's 232.3 Mt, 2013 = 142.2, 2020 = 159.2, 2021 = 170.5 — and continues:

| year | 2022 | 2023 | 2024 |
| --- | --- | --- | --- |
| EU-27 apparent cement consumption (Mt) | 163.8 | 150.8 | 148.1 |

So the "different definition" worry is gone: this is the report's own series,
extended by its own publisher, not a production-minus-net-trade reconstruction.

**Deliberately not automated in this pass.** The values above are recorded in
the blocker detail so they are not lost, but no recipe was added and no
migration written: that changes the automated count, the seed file and
`pw_indicator_points`, and it deserves its own pass rather than riding along
with a text-and-links change. The extraction itself is the same shape as the
Eurofer chart-label reader built on 29 July — a `data: [...]` array behind a
known chart title — so it is a small job, and it is the highest-yield item left
on the list. The status stays `no-public-api` because what is missing is
genuinely an *export*: a JavaScript array in a page that can be redesigned
without notice is not a data file.

## 3. I7b — the map is not browser-only either

Recorded as "exists only as a JavaScript application… the count exists only
inside the running map… also HTTP-only". The old host is dead (above) and the
new one is not a browser problem: `cementeurope.eu/innovation-projects/`
inlines the whole database as `var markers = [ … ]`, parseable from static
HTML. Re-read on 30 July:

- **124 projects**, one country tag each; **114 EU-27** (rest: UK 6, Norway 3,
  Switzerland 1).
- Scale status: Desktop/R&D 46, Pilot Plant 50, Commercial/Demo scale 27 —
  the taxonomy the report's Figure 30 split uses (R&D 22, pilot 24, demo 7,
  full scale 4, unspecified 5).
- Technology: CCUS 36, low-carbon binders 22, energy/fuel switching 21, CCS 20,
  new processes 18, CCU 15, recycling 13, recarbonation 9.

What is still missing is the same thing missing from I7c: **a date that means
"announced"**. The only year on a record is `Operational Date` — when the plant
runs, spanning 2007-2030, six of them still in the future. So a current
snapshot (114 EU-27) is defensible; the report's 62-in-2023 cannot be
reproduced, and the gap between 62 and 114 is part real growth and part
re-curation of the map. Unblocking the snapshot is now a parsing job;
unblocking the *series* still needs announcement dates or historical snapshots
from Cement Europe.

## 4. I7c — count corrected 214 → 215

Same endpoint, counted with an explicit rule: projects carrying at least one
EU-27 country tag. 215 of 238. Country tags sum to 244 because several
projects are multi-country, which is where the earlier 214 came from. The
substantive finding is unchanged — posting dates only (2022: 9, 2023: 145,
2024: 43, 2025: 41), ACF fields are curation metadata (`review`,
`do_not_resync`, `comments`) — so the snapshot-yes/series-no verdict stands.

## 5. I4 — what "unreliable" actually means

The card now says it, rather than asserting it. This indicator is a ratio —
emissions of bulk organic chemicals over tonnes of bulk organic chemicals — and
a ratio only means something when both legs cover the same plants and products:

- **The substitute that was tried is a scope mismatch.** CRF 2.B over NACE C201
  puts the whole chemical industry's emissions over basic chemicals' output
  alone: the numerator counts factories the denominator never counts. The two
  scopes have been drifting apart, so the ratio rises **29% by 2024** — a
  number that reads as the EU's chemical industry getting a third dirtier and
  is entirely an artefact.
- **The right pairing is half-built.** EU ETS activity code 42 over PRODCOM
  ethylene + propylene + aromatics is what the report did. Ethylene and
  propylene reproduce the report's denominator to three decimals (2013: 16.096
  and 12.936 Mt). The "aromatics" leg does not: no subset of the PRODCOM
  aromatic codes tried matches it (benzene + toluene + xylenes alone is 22%
  short, the best four-code fit still 6% off), and the ETS numerator is not
  wired.
- **Why 6% is not close enough.** Post-report intensity changes are of the same
  order as that error, so a 6%-wrong denominator would swamp the signal and the
  series would report movement that did not happen. Holding the report's last
  value is the honest option.

## 6. Changes

- `src/data/indicator-blockers.ts` — new `BlockerDataLink` type and
  `dataLinks` field (URL, label, what it holds, whether it is parseable without
  a browser) on the four entries that have somewhere to point;
  `unreliableBecause` on I4; `no-public-api` and `withheld` action text
  rewritten so neither reads as a dead end; I7b and I2-cement-use details and
  URLs corrected; I7c count 214 → 215 with the rule stated.
- `src/data/esabcc-indicators.ts` — I7b `sourceUrl` off the dead
  `lowcarboneconomy.cembureau.eu` host and onto the live map;
  `source` renamed to "Cement Europe (formerly Cembureau)".
- `beta/modules/summer-prep/indicator-check/page.tsx` — `DataLinkList`
  component; "Where the data is" block on the status-panel cards (compact, one
  line per link) and inside each indicator card's details (with the full
  what-you-get text); "Why it would be unreliable" block on the withheld card.

No indicator values changed, so no migration and no `LAST_REFRESH` bump: the
automated count is still 75 of 97.
