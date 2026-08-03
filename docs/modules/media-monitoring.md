# Media Monitoring

Tracks press coverage of the ESABCC and EU climate policy, and clusters it by
report, board member and country.

## How the data pool works

Everything on the dashboard is a lens over **one pool** of articles. The pool
is fed by three channels:

| Channel | What it reaches | Cadence |
| --- | --- | --- |
| Google News search | Openly syndicated online coverage, searched using the keywords in the Keywords tab | Every run — nothing to set up |
| Alert & RSS feeds | Google Alerts, Talkwalker Alerts, outlet and institution RSS feeds | Every run, once registered |
| Newton Media export | Print, broadcast and paywalled outlets no feed reaches | Weekly manual upload |

The Reports, Board members and Countries tabs are not separate datasets — they
are three groupings of the same pool, recomputed by the clustering pass.

## Setting up alerts

Neither Google Alerts nor Talkwalker Alerts offers an API for **creating**
alerts. Each alert is created once by hand, in your own account, and its RSS
URL is registered in the dashboard. Everything either side of that is
automatic.

1. Open the **Sources** tab. Under *Step 1* you will find alert queries
   generated from your active keywords, grouped by category and language.
   Copy one.
2. **Google Alerts** — go to [google.com/alerts](https://www.google.com/alerts),
   paste the query, open *Show options*, and set **Deliver to** to *RSS feed*.
   Create the alert, then copy the URL behind the orange RSS icon. It looks
   like `https://www.google.com/alerts/feeds/<user id>/<alert id>`.

    !!! warning "Paste the feed URL, not the page URL"
        A common mistake is registering `https://www.google.com/alerts` — the
        management page. That returns HTML, parses to zero articles, and looks
        like an empty feed rather than a wrong URL. The dashboard rejects it
        with a message saying what to paste instead.

3. **Talkwalker Alerts** — go to
   [alerts.talkwalker.com](https://alerts.talkwalker.com), create the alert with
   the same query, and choose **RSS** as the delivery method. Copy the feed URL
   (it contains `/alerts/rss`).
4. Back in *Step 2*, pick the type, give it a name, paste the feed URL, and
   paste the query you used into the *Query used* field. That last part is
   optional but it drives the "not covered by any alert" check.

Adding a keyword later does **not** require touching the alerts. Every item
pulled from every feed is matched against the current keyword list at fetch
time, so new keywords apply to incoming coverage immediately. The alert only
determines what the provider sends you — widen it when the coverage check flags
uncovered keywords.

## Weekly Newton Media upload

Newton Media delivers a `.xlsx` export. In the **Sources** tab, use the
*Newton Media weekly upload* panel to drop the file in. Rows are parsed,
clustered and merged into the pool immediately.

Re-uploading an overlapping export is safe: rows are keyed on Newton's article
code and URL, so the weekly overlap updates existing rows rather than
duplicating them.

The importer locates columns by header name rather than position, so a
reordered export still imports. If Newton changes the header names, the upload
reports which headers it found instead of silently importing nothing.

## Scheduled refresh

`.github/workflows/media-monitoring-daily.yml` runs at 05:15 UTC daily and
does two things: fetches all channels, then re-clusters the pool.

It needs two repository settings:

- `secrets.MEDIA_MONITORING_SECRET` — must equal the deployment's
  `MEDIA_MONITORING_SECRET` environment variable.
- `vars.MEDIA_MONITORING_BASE_URL` — the deployed site origin, no trailing
  slash.

Both can also be triggered by hand: *Actions → Daily Media Monitoring → Run
workflow*, which offers a **full re-cluster** option. Use that after editing
report match terms or the board roster, since a normal run only clusters rows
it has not seen.

## Clustering rules

- **Reports** — matched on each report's `match_terms` in
  `src/data/esabcc-reports.ts`, plus the article's matched keywords.
- **Board members** — matched on the aliases in `src/data/esabcc-board.ts`,
  against the headline, summary and full text. Distinctive surnames match on
  their own; common ones (Nilsson, Persson) only match when the article also
  mentions the advisory board, so an unrelated namesake is not attributed.
- **Countries** — the outlet's country where known, otherwise the Newton topic,
  otherwise the domain's country TLD.

Matching is whole-word, so `ETS` does not match "targets" and `Eory` does not
match "theory".

## Diagnosing an empty dashboard

A run that finds nothing because the upstream returned nothing looks identical,
from outside, to a run where everything was filtered out. The fetch endpoint
returns a `diagnostics` object separating the two: items seen, jobs or feeds
that failed, and drops split by reason (blocked domain, unknown outlet,
no keyword match, too old). Per-feed status is also written back to the
Sources tab, so a feed that has quietly died shows as *Failed* with its error
rather than just contributing zero.
