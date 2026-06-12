# Reference Manager — metadata audit, June 2026

A full review of the custom / live reference stack
(`public/data/custom-references.json`, mirrored by
`scripts/seed-custom-references.sql`). Every entry was checked against the
published record (publisher pages, repositories, indexes — via web search;
the dev sandbox cannot reach Crossref directly). Corrections were applied to
both in-repo files in the same commit as this report.

> **Live database note.** The production store is the Supabase
> `custom_references` table. The seed SQL only affects fresh environments
> (`on conflict do nothing`), so the corrections below still need to be
> applied to production — either by re-saving the affected entries in the
> UI, or with a one-off `update` against the table. The corrected JSON in
> this commit is the authoritative source for that sync.

## Structural fixes

- **Duplicate row removed** — `doi-10.1038-s41558-026-02602-3`
  (Van de Ven et al.) appeared twice with the same id in both the JSON
  store and the seed SQL. The store is keyed by id, so the duplicate row
  double-counted the reference everywhere the file is consumed
  (classification batch, EU-funding tagger, the API fallback). 31 → 30
  entries.
- **HTML entity decoded** — `Nature Reviews Earth &amp;amp; Environment` →
  `Nature Reviews Earth & Environment` (Deng et al. 2026, journal +
  full citation).

## Records upgraded from preprint / pasted citation to the published version

| Entry | Before | After |
|-------|--------|-------|
| `ref-1961` | SSRN preprint 10.2139/ssrn.4422845 (2023) | **FinanzArchiv / Public Finance Analysis 80(1), 70–110 (2024), DOI 10.1628/fa-2023-0012** — Edenhofer, Franks, Kalkuhl, Runge-Metzger, "On the Governance of Carbon Dioxide Removal" |
| `ref-1330` | Whole citation pasted into the title field; no authors, no venue, no DOI | **Perspektiven der Wirtschaftspolitik 25(3-4), 172–182 (2024), DOI 10.1515/pwp-2024-0028** (CC BY 4.0) — Edenhofer & Kalkuhl, "Planetarische Müllabfuhr – Gamechanger der Klimapolitik?" |
| `ref-568` | Whole citation pasted into the title field; SSRN DOI buried in the title text | **Joule, art. 102395 (2026), DOI 10.1016/j.joule.2026.102395** (CC BY 4.0) — Sultani et al. Published under the new title "How the EU can utilize its carbon market to scale up carbon dioxide removal" (preprint title was "Sequencing Carbon Dioxide Removal into the EU ETS", SSRN 10.2139/ssrn.4875550) |

## Fields filled / corrected

| Entry | Correction |
|-------|------------|
| Waisman et al., Climate Policy | volume 26, issue 5 added; online-first pagination "1-8" dropped (superseded by issue assignment, final range unconfirmed); authors expanded from initials to full given names |
| Mehnert et al., Env. Res.: Energy | volume 3, issue 2, article 025002 filled |
| Scheifinger et al., npj Clim. Action | article number 39 filled |
| Biesbroek et al., npj Clim. Action | article number 71 filled |
| Van de Ven et al., Nat. Clim. Change | volume 16, pages 540–549 filled; authors expanded from initials to full given names (incl. "Van de Ven, D." → "Van de Ven, Dirk-Jan") |
| Rodrigues et al., Nat. Commun. | article number 3417 filled; authors expanded from initials to full given names |
| Jakhmola et al., Nat. Energy | volume 11, pages 743–755 filled. An **author correction** exists: DOI 10.1038/s41560-026-02064-z |
| Hoehnke et al., Nat. Rev. Clean Technol. | volume 2, pages 327–347 filled |
| Deng et al., Nat. Rev. Earth Environ. | volume 7, pages 274–276 filled (5-author list confirmed complete for the 2026 edition) |
| Garschagen et al., Clim. Risk Manag. | authors expanded to full given names ("James, H." kept as initial — given name could not be confirmed; do not guess) |
| Padullés et al., Energy Convers. Manag. | authors expanded from initials to full given names (DTU/DLR group confirmed) |
| Ayers, Glob. Environ. Polit. | author expanded to "Ayers, Jessica" |
| Franz et al. / Tomlinson et al. / Huang et al. / Ceyhun et al. | empty `fullCitation` filled from verified fields |
| EPRS reading-list stub | year 2026 filled from its own title |

All other entries (Chen & Liu; Dass et al.; Zhang et al.; Bolson et al.;
Shi & Moutzouris; Gjedde et al.; both Monaco et al. papers; van Vuuren et
al.) verified clean — no changes.

## Flags for manual follow-up

- **`doi-10.1016/j.tre.2026.104820`** (Zhao et al., Transp. Res. E) — the
  DOI and title are not indexed anywhere findable (DOI search, title
  search, author search). The author group is real and publishes in this
  exact subfield, so it may simply be a very fresh in-press article, but
  the record could not be verified at all. Check the DOI resolves before
  citing.
- **Ceyhun et al.** — full given names (likely Gökçe Çiçek Ceyhun, Hilal
  Yıldırır Keser, Savaş Tarkun) could only be reconstructed from a garbled
  search snippet; initials kept in the store until someone confirms on the
  article page.
- **EPRS reading-list stub** — the most likely underlying document is EPRS
  briefing **PE 785.707**, "Update of the EU emissions trading system for
  stationary installations, aviation, and maritime transport" (April
  2026), PDF at
  `https://www.europarl.europa.eu/RegData/etudes/BRIE/2026/785707/EPRS_BRI(2026)785707_EN.pdf`
  — but whether it contains the Member-State-positions figure is
  unconfirmed, so the URL was *not* written into the record.

## PDFs

Open-access PDF locations were verified for **18 of 30** entries and
recorded in `scripts/data/reference-pdf-sources.json`. The companion
workflow (`.github/workflows/fetch-reference-pdfs.yml` →
`scripts/fetch-reference-pdfs.mjs`) downloads and attaches them (it
validates every download by PDF magic bytes, so a paywall page can never
be attached).

**Outcome of the first runs (11 June 2026): 10 of 30 entries now carry a
PDF** — 7 fetched and committed under `public/reference-pdfs/`
(all Nature-family and IOP gold-OA articles, including the Van de Ven
Nature Climate Change paper) plus the 3 pre-existing user uploads in the
Supabase bucket. The remaining verified-OA copies (ScienceDirect, Taylor
& Francis, Cell Press, De Gruyter, CESifo) are bot-blocked from GitHub
runners (HTTP 403 / HTML interstitials); they are listed with reasons in
the generated [attach report](reference-pdfs.md). For those, use the
Reference Manager's own *fetch PDF* button (the in-app proxy runs from a
different network and often succeeds) or upload manually. Paywalled
entries (Dass et al.; Zhang et al.; Eiar/Zhao et al.; Ayers — Project
MUSE/MIT Press; Monaco et al. 2023; the FinanzArchiv version of
Edenhofer et al.) need a licensed copy uploaded by hand.
