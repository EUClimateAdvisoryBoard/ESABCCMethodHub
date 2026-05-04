# ESABCC Monitor — LinkedIn Capture

A minimal Edge / Chrome extension that lets you send a LinkedIn post to the
ESABCC media-monitoring dashboard in one click. It runs in your
authenticated LinkedIn tab, so it can read the full post content — something
server-side search backends (Brave, Google) can never do because LinkedIn
blocks them.

## Install in Microsoft Edge

1. Download **esabcc-capture.zip** from the Social Media tab of the
   dashboard and unzip it to a folder you won't delete (e.g.
   `C:\Users\<you>\esabcc-capture`).
2. Open `edge://extensions`.
3. Toggle **Developer mode** on (bottom-left corner).
4. Click **Load unpacked** and select the folder you just unzipped.
5. Pin the extension to the toolbar (optional).

Same procedure in Chrome at `chrome://extensions`.

## Configure

Right-click the extension → **Extension options** (or open it from the
toolbar popup's "Extension settings" link) and set:

- **API base URL** — your deployed dashboard, e.g.
  `https://methodhub.vercel.app`.
- **Shared secret** — only needed if the server has
  `MEDIA_MONITORING_SECRET` set. Paste the same value here.

## Use

- **Right-click** anywhere on a LinkedIn post → **Send to ESABCC monitor**.
- Or click the **toolbar icon** → **Capture now**.
- Or press **Alt + Shift + C**.

A system notification confirms the capture and shows which ESABCC reports
the post was clustered under.

## What gets sent

The extension extracts, from the post you were looking at:

- Canonical post URL (e.g. `https://www.linkedin.com/feed/update/urn:li:activity:...`)
- Visible post text (or your selection if you highlighted something first)
- Author name, handle and profile URL
- `posted_at` timestamp (converted from LinkedIn's "22h" / "3d" style)

No metrics (likes, comments) — those aren't reliably in the DOM.

## Troubleshooting

- **"No API base URL configured"** — open Extension options and set it.
- **`HTTP 401`** — the server has `MEDIA_MONITORING_SECRET` set but the
  extension's secret doesn't match.
- **"Could not find a LinkedIn post on this page"** — navigate to a single
  post's permalink (`linkedin.com/feed/update/...` or
  `linkedin.com/posts/...`) or highlight the post text before capturing.
