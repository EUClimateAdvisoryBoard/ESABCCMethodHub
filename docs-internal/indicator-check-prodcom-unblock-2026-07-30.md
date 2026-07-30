# Indicator Check — PRODCOM is on an API after all (30 July 2026)

Follow-up to `indicator-check-source-refresh-2026-07-29.md`. That note recorded
PRODCOM as the hardest remaining blocker on the Indicator Check: four
indicators marked "not on the Eurostat API", with the suggested fix being to
drive the PRODCOM portal with a browser or type the figures in by hand.

That conclusion was wrong, and this note records why, what the correct access
route is, and the two data findings that came out of using it.

Prompted by a set of PRODCOM CSV exports (ds-059358, ds-059359, ds-059367,
ds-059368) pulled by hand from the Data Browser — proof that the data leaves
Eurostat's servers somehow, which was enough to justify another look at how.

## 1. The access problem, and what was actually wrong with the diagnosis

Everything the July note said about PRODCOM is true and reproducible:

```
GET /eurostat/api/dissemination/statistics/1.0/data/DS-059358
  → 404 "DS-059358 (DATA_FLOW:ALL,1.0) is not available for dissemination"
GET /eurostat/api/dissemination/sdmx/2.1/data/DS-059358/…
  → 404 "DATA_SET:DS-059358 is not available for dissemination"
```

and the dataset appears in neither the dissemination catalogue nor the
bulk-file inventory. The `DS-059358$DEFAULTVIEW` id that the exported CSV
carries in its `DATAFLOW` column 404s at every path shape too.

All of those probes are against the **wrong host**. Eurostat runs a second,
parallel dissemination stack for PRODCOM and Comext:

```
https://ec.europa.eu/eurostat/api/comext/dissemination/sdmx/3.0/data/dataflow/ESTAT/<dataset>/1.0
```

The catalogue and the bulk inventory only describe the *main* host, which is
why the absence of PRODCOM from both looked like proof it was nowhere. It is
also what the Data Browser itself calls — found by loading the ds-059358 page
under Playwright and reading its network traffic (`scripts/…/browser-probe.mjs`
pattern), which turned up a `POST …/api/comext/dissemination/sdmx/3.0/data/…`
in among the ordinary databrowser-backend calls.

Three practical details, all of which look like access denials if you miss them:

- **The Accept header is mandatory.** Without one the host answers `406 Not
  Acceptable`. `application/vnd.sdmx.data+csv;version=1.0.0` gives the same
  column layout as the Data Browser's CSV export;
  `…;version=2.0.0;labels=both` gives code + label in one cell, which is how
  the product codelist was read. `format=csvdata` in the query string does
  nothing.
- **The body is gzipped without a `Content-Encoding` header**, so `fetch()`
  hands back mojibake. `accept-encoding: identity` fixes it. (curl was not
  affected, which briefly made this look like a Node-only network fault.)
- **Only equality filtering is supported.** `c[product]=sw:2014` returns
  `INVALID_OPERATOR_FOR_DIMENSION_FILTERING`, so product baskets have to be
  enumerated. Oversized extractions return a SOAP envelope with HTTP 200, so
  the payload shape has to be checked rather than the status code.

The datasets the report cites — DS-056120 (sold production), DS-059268 (CPA 2.1
trade), DS-056121 (total production) — are all retired. Their live successors:

| Report cites | Live dataset | Contents |
|---|---|---|
| DS-056120 | `ds-059358` | Sold production, exports and imports, to 2024 |
| DS-056121 | `ds-059359` | Total production, to 2024 |
| — | `ds-059367` / `ds-059368` | The same two on the CPA 2.2 list, 2025 |
| DS-059268 | `ds-059366` | International trade by CPA 2.2, to 2025 |

`ds-059358` carries history back to 2003 — further than the report's own series.

## 2. What is now refreshed

Four indicators come off the blocker list. All four are computed the way the
report computed them, not proxied.

**I2 (chemicals) — production, apparent use, trade balance.** The report's
basket is named in the underlying-data workbook: "sum of sold production of
ethylene, propylene, benzene, toluene, o-Xylene, p-Xylene, and m-Xylene and
mixed xylene isomers". Those are PRODCOM `20141130, 20141140, 20141223,
20141225, 20141243, 20141245, 20141247` — identified by matching the report's
own per-product rows, which reproduce to 12 significant digits. The 2025 list
(`ds-059367`) merges the three xylene codes into `20141240 Xylenes`; same
basket, one code fewer. Apparent use = production + imports − exports; trade
balance = exports − imports (negative = net importer), both the report's own
definitions.

Until now these three were either frozen at the report value (use, trade) or
carried a spliced NACE C201 production-*index* proxy (production). They are now
absolute tonnage.

| | report last | 2023 | 2024 | 2025 |
|---|---|---|---|---|
| Production (Mt) | 26.84 (2022) | 23.07 | 24.75 | 21.59 |
| Apparent use (Mt) | 29.11 (2022) | 24.31 | 26.20 | 22.95 |
| Trade balance (Mt) | −2.27 (2022) | −1.24 | −1.46 | −1.36 |

**I2 (steel) — trade balance.** This one never needed PRODCOM at all: the
report took the trade legs from "EU trade since 2002 by CPA 2.1" (DS-059268),
whose successor `ds-059366` is on the same Comext host. Extra-EU27 exports
minus imports of CPA `2410` (basic iron, steel and ferro-alloys) reproduces the
report's whole 2008-2021 series to a mean relative error of 5×10⁻⁵ — so it is
taken directly, not spliced. New: 2022 −26.96, 2023 −23.71, 2024 −23.78,
2025 −30.89 Mt.

The 2025 chemicals figures carry PRODCOM's own estimated/rounded flags (`:E`,
and a round 0.8 Mt for xylenes); they are first-release values and will be
revised. Included because the page already carries 2025 points for the sibling
production series, but worth knowing when reading the last column.

## 3. Finding: the report's Figure 24 chemicals panel is labelled one year early

This came out of the anchor check and is the reason migration 083 rewrites the
chemicals rows instead of upserting them.

The report's Figure 24 places its base-organic-chemicals series at 2005-2021.
PRODCOM places the identical values at 2006-2022 — identical, not similar:
eleven of the seventeen years match to twelve significant digits, and the
remainder differ only where PRODCOM has since revised recent years.

Three independent checks, all saying PRODCOM's labels are the right ones:

1. **The 2009 trough.** PRODCOM's series dips 10% in 2009 and recovers in 2010.
   Under the report's labels that dip lands on 2008. EU petrochemical output
   collapsed in 2009, not 2008 — and the sibling total-production dataset shows
   the same 2009 trough for ethylene independently.
2. **The report's own Figure 26 sheet.** Its chemicals denominator is built
   from PRODCOM total production, and it aligns with `ds-059359` exactly:
   2013 ethylene 16.096 Mt and propylene 12.936 Mt in both. Same report, same
   source family, correctly labelled — so this is not a PRODCOM-wide vintage
   shift.
3. **The steel panel of the same figure.** Its trade balance reproduces from
   `ds-059366` at its stated years to 5×10⁻⁵. One shifted panel, not a
   systematic offset.

The most likely mechanism is mundane: in the underlying-data workbook the steel
panel's values start in the column under 2008 while the chemicals panel's start
in the column under 2005, i.e. the chemicals series was pasted one column too
far left. `extract.py` reads the workbook faithfully; the slip is upstream of
this repo.

**What was done about it.** The three chemicals series keep the report's
values and take PRODCOM's year labels (2006-2022). Doing nothing was not
neutral: appending correctly-labelled 2023+ points to a series whose last point
is a mislabelled 2022 would have produced a chart with the same year in it
twice, one stale vintage and one current. The correction is recorded on each
indicator's `description`, in migration 083, and here.

**This is the one change in this pass that departs from the report as
published, and it should get a human sign-off.** Everything needed to check it
is above; reverting means shifting the three series back by one year in
`src/data/esabcc-indicators.ts` and re-running migration 083's insert block.

**Not checked:** the cement panel of the same figure, whose values start in the
same column as the chemicals panel and may share the slip. It comes from
Cembureau on request, so there is no public series to test it against.

## 4. What is still blocked, more precisely than before

- **I2 (cement, use)** — reclassified from "not on the Eurostat API" to "no
  public data export", which is what it always was. The trade legs are not the
  obstacle (extra-EU cement trade is on the Comext host as CPA 2351); the
  obstacle is that Cembureau's apparent-consumption figure is not a
  production-minus-net-trade identity. The report's own workbook shows
  production minus use running 7-15 Mt while the Eurostat trade balance runs
  the other way entirely, so the series cannot be rebuilt from published
  numbers without changing its definition.
- **I4 (chemicals, GHG intensity)** — still withheld, but the recipe is now
  legible: EU ETS data-viewer emissions at activity code 42 (bulk organic
  chemicals) ÷ PRODCOM *total* production of ethylene + propylene + aromatics.
  The ethylene and propylene legs reproduce exactly from `ds-059359`. Two
  pieces are missing: the "aromatics" line is not any subset of the PRODCOM
  aromatic codes tried (benzene+toluene+xylenes alone is 22% short; the best
  four-code fit is still 6% off), and the ETS activity-code numerator is not
  wired. The CRF 2.B ÷ NACE C201 ratio tried in July remains a scope mismatch
  and should not be revived.
- **I2 (steel, use)** — unchanged, Eurofer PDF only.

## 5. Changes in this pass

- `scripts/esabcc-indicators/refresh-from-sources.mjs` — Comext fetchers
  (`fetchComextCsv`, `fetchProdcom`, `fetchComextTrade`), two new recipe kinds
  (`prodcom`, `comext-trade`), four recipes, and an `--only=<id,…>` flag for
  running a subset without touching the other recipes' provenance.
- `src/data/esabcc-indicators.ts` — the four series above; chemicals year
  labels shifted; source/sourceUrl updated off the retired dataset codes.
- `src/data/indicator-blockers.ts` — three entries removed, cement-use and
  I4-chemicals rewritten, the `not-on-api` status retired (it existed only for
  PRODCOM), `LAST_REFRESH` bumped.
- `supabase/migrations/083_prodcom_i2_refresh.sql` — rewrites the chemicals
  rows, adds the steel trade years.

**Deliberately not done: the calc-space derivation rows.** Migration 079 seeds
`pw_indicator_sheets.layout` for these indicators, and for I2 (chemicals,
production) that layout still describes the superseded method — the spliced
NACE C201 index, on the old year labels. Regenerating it means running
`build-postreport-calc-rows.mjs`, which rewrites migration 079 for *all*
indicators and re-fetches every leg; it also only knows the `eurostat` recipe
kinds, so the four recipes here would degrade to "as published" rather than
showing the PRODCOM arithmetic. Teaching that generator the `prodcom` and
`comext-trade` kinds and re-emitting as a new migration is the follow-up. Until
then the chart and the stored points are right and the derivation panel behind
I2 (chemicals, production) is out of date.

The completeness guard in `fetchProdcomBasketLeg` is worth keeping in mind
when extending this: a year is dropped unless every product in the basket
reports. PRODCOM suppresses individual products when too few member states
report them, and a silently short basket would read as a fall in EU production
rather than as missing data.
