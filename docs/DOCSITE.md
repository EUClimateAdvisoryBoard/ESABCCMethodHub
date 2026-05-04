# Documentation site

This repository ships its own **hosted documentation site**, built with
[MkDocs Material](https://squidfunk.github.io/mkdocs-material/) from the
same `docs/` folder that holds the per-subsystem markdown. Since
April 2026 it is published as a sub-path of the main MethodHub Vercel
deployment under [`/docs/`](https://methodhub.vercel.app/docs/).

## How it ships

The Vercel build runs MkDocs as part of `vercel-build`:

```bash
# package.json
"vercel-build": "bash scripts/build-docs.sh && next build"
```

[`scripts/build-docs.sh`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/scripts/build-docs.sh)
installs `mkdocs-material`, `pymdown-extensions`,
`mkdocs-awesome-pages-plugin` and `mkdocs-glightbox` (with
`pip --break-system-packages` because Vercel's build image enforces
PEP 668), then runs:

```bash
mkdocs build --site-dir public/docs
```

That writes the static site straight into the Next.js
`public/` folder, so Next serves the docs as ordinary static assets at
`/docs/*`. There is no separate hosting hop and no separate domain —
the docs travel with the app.

## Access

The published site is **password-gated by the same Edge-middleware
HMAC cookie that gates the rest of the app**. There is no longer a
separate StaticCrypt encryption step or a separate
`DOCS_SITE_PASSWORD` secret.

- **URL.** [`https://methodhub.vercel.app/docs/`](https://methodhub.vercel.app/docs/)
  (or the EEA hostname after the production cutover).
- **Gate.** `src/middleware.ts` matches every path that isn't a Next
  internal or a static asset; it bypasses `/api/*`,
  `/word-addin/*`, `/word-addin-dist/*`, and `/site-login`. The
  docs sub-path is **not** bypassed, so any request without a valid
  `mh_site_auth` cookie is 302'd to `/site-login?next=/docs/…`.
- **Cookie.** HMAC-signed, HttpOnly, SameSite=Lax, 30-day TTL. Issued
  on successful login by `/api/auth/site-login`. Cleared by
  `/api/auth/site-logout`.
- **Rotation.** Change `SITE_PASSWORD` in Vercel; existing cookies
  remain valid until they expire because the HMAC is over the
  expiry, not the password — so password rotation does **not**
  automatically log everyone out. To force re-login, rotate
  `SITE_AUTH_SECRET` instead, which invalidates every existing
  signature.

## Why a server-side HMAC gate (and not StaticCrypt)

The previous setup used StaticCrypt on a GitHub Pages deploy. That had
two failure modes:

1. **Encrypted bundle was downloadable** — anyone could brute-force
   the password offline with a copy of the bundle.
2. **The legacy `PasswordGate` React component on the app side
   shipped the password in the JS bundle**, where it was readable
   via View Source.

Both went away in commit
[`f098e5f`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/commit/f098e5f3bbd4f42ef6e525bef7f8d88a8e71df02):

- `SITE_PASSWORD` is read **on the server** (in the Edge middleware),
  never sent to the client.
- The cookie is HMAC-signed with `SITE_AUTH_SECRET`, so a client
  can't forge one even if it sees a valid cookie value (it has no
  way to mint new signatures).
- The cookie is `HttpOnly`, so it cannot be exfiltrated via XSS to a
  cross-origin script.
- The check runs at the **edge** (Next.js Edge Runtime), so unauthorised
  visitors never reach a Server Component or hit the database.

This is the gate Q14 of the FAQ and the *Access* section of every
page describes.

## Run it locally

```bash
pip install --break-system-packages \
    mkdocs-material pymdown-extensions \
    mkdocs-awesome-pages-plugin mkdocs-glightbox
mkdocs serve        # http://127.0.0.1:8000 — live-reload
mkdocs build        # writes a static site to ./site (default site_dir)

# Or build into the Next public folder, mirroring the Vercel job:
bash scripts/build-docs.sh
```

When running through `next dev`, the middleware is active too —
visit `http://localhost:3000/site-login`, enter `SITE_PASSWORD`, and
the docs become reachable at `http://localhost:3000/docs/`.

## Triggering a redeploy

Any push to `main` triggers a Vercel build, which always re-runs
`mkdocs build`. There is no separate workflow to re-run; the docs
update with the next deploy of the app.

## Structure

```
mkdocs.yml                           Site config (palette, nav, plugins)
docs/
├── index.md                         Landing page with module cards
├── stylesheets/extra.css            ESABCC-palette theme overrides
├── overrides/                       Material theme overrides (empty today)
├── assets/                          Logo, favicon
├── overview/                        Plain-language overview
├── modules/                         Per-module technical deep-dives
├── infrastructure/                  Stewardship · deployment · AI layer · Copilot · GDPR
├── reference/                       API · scripts · design system
└── vision/                          Vision · blueprint · roadmap
```

The narrative reference docs were consolidated into the per-topic
pages under `infrastructure/`, `reference/` and `vision/`; the legacy
flat files at the top of `docs/` have been removed.

## Design

- **Palette.** ESABCC institutional teal (`#00928F`) and dark blue
  (`#3D5265`), layered onto Material's tokens via
  [`docs/stylesheets/extra.css`](stylesheets/extra.css).
- **Typography.** Inter for body, JetBrains Mono for code and small-caps
  labels. Tabular numerics everywhere a number appears.
- **Layout.** Scientific whitespace, bordered tables, admonition cards
  for callouts.
- **Module cards.** Custom `.mh-module` class mirrors the main web
  app's module grid.
- **Lightbox.** `mkdocs-glightbox` provides click-to-zoom on every
  figure, including the SVG diagrams under `assets/`.
