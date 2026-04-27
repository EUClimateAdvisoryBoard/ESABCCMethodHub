# Documentation site

This repository ships its own **hosted documentation site**, built with
[MkDocs Material](https://squidfunk.github.io/mkdocs-material/) from the
same `docs/` folder that holds the per-subsystem markdown. It is
published to **GitHub Pages** on every push to `main` by
[`.github/workflows/docs.yml`](https://github.com/SebastianFra/MethodHub/blob/main/.github/workflows/docs.yml),
wrapped in a **password gate** before it goes live.

## Access

The published site is **password-protected**: every page is encrypted
at build time with [StaticCrypt](https://github.com/robinmoisson/staticrypt)
and the browser decrypts it once the user enters the current password.
No account, no OAuth, no per-person provisioning — whoever has the
password gets in.

- **URL.** `https://sebastianfra.github.io/MethodHub/` (note the capital
  `M` — GitHub Pages paths are case-sensitive and match the repo name).
  After a repo transfer this becomes `https://esabcc.github.io/MethodHub/`
  or `https://eea.github.io/MethodHub/`.
- **Ask CCE5** for the current password.
- **Remember-me.** After a successful unlock, StaticCrypt stores a
  hashed token in the browser's localStorage for 30 days. Users on a
  trusted device enter the password once per month.
- **Rotation.** Change the `DOCS_SITE_PASSWORD` repository secret and
  re-run the `docs` workflow — the next deploy supersedes the old
  bundle; localStorage tokens minted against the old password stop
  working on the next page load.

## Why StaticCrypt (and not something heavier)

The threat model is *"not publicly browseable, not indexed by Google"*,
not *"classified"*. StaticCrypt covers that directly, with zero
additional infrastructure and no extra GitHub plan:

- The repo itself stays public (free GitHub Pages, free for peer EEA
  units to see the blueprint).
- The **content** of the docs is only readable after a password unlock.
- Google and other crawlers hit the encrypted shell and a `robots.txt`
  that disallows all indexing, so the site is effectively off the
  search-engine map.

Honest call-outs:

- **StaticCrypt is not SSO.** Anyone with the password has full read
  access until it is rotated.
- **The encrypted bundle is downloadable.** A determined attacker who
  obtains a copy of the bundle could brute-force the password offline,
  so keep it long and rotate it when it leaks.
- **For genuinely restricted content**, the long-term plan is to ship
  the docs from inside the MethodHub app under `/docs`, gated by the
  same OIDC / EU Login that protects the rest of the service. See
  [`vision/index.md`](vision/index.md) and
  [`infrastructure/deployment.md`](infrastructure/deployment.md).

## Enabling the password gate (first-time setup)

The workflow fails fast if the secret is missing, so enabling the gate
is a two-step operation done once:

1. **Pick a password.** Long passphrase, not a single word. Share it
   with the Secretariat + EEA IT reviewers through your usual secure
   channel.
2. **Add it as a repository secret.**
   - Web: `github.com/SebastianFra/MethodHub/settings/secrets/actions`
     → **New repository secret** → name `DOCS_SITE_PASSWORD`, value the
     chosen passphrase.
   - CLI: `gh secret set DOCS_SITE_PASSWORD`.
3. **Re-run the workflow.** Either push a docs change, or use
   `Actions → docs → Run workflow`.

After the run finishes, visiting the Pages URL shows the ESABCC-styled
password prompt.

## Disabling the password gate

If at some point the docs should be fully public (for example because
the repo is moved under `github.com/eea` and the blueprint argument
takes priority over the password wall), delete the secret and remove
the StaticCrypt step from `docs.yml`. The next deploy publishes the
plain MkDocs output.

## Run it locally

```bash
pip install mkdocs-material pymdown-extensions
mkdocs serve        # http://127.0.0.1:8000 — live-reload
mkdocs build        # writes a static site to ./site
```

## Troubleshooting

### `Encrypt site with StaticCrypt` fails in ~0 seconds

That's the guard at the top of the step firing because the
`DOCS_SITE_PASSWORD` repository secret is unset. It is working as
designed — the workflow refuses to publish an unprotected site.

Fix: add the secret (see *Enabling the password gate* above) and
re-run the failed workflow from the **Actions → docs** tab.

### `sebastianfra.github.io/MethodHub/` returns the generic GitHub "404 — There isn't a GitHub Pages site here"

That is Pages telling you it has nothing to serve at that host/path.
Distinct from a 404 inside a working site (which would be our styled
404). Causes, in order of likelihood:

1. Latest `docs` workflow failed at the `build` or `deploy` step, so
   there is no current artifact. **Fix:** re-run from Actions.
2. Pages got toggled off, or the Source reverted from "GitHub
   Actions" to "Deploy from a branch". **Fix:** `Settings → Pages →
   Source → GitHub Actions`.
3. The repository was made private on a free plan, which disables
   Pages immediately. **Fix:** make it public again, upgrade the
   plan, or switch to Cloudflare Pages + Access.
4. Transient Pages flap — wait 2–3 minutes and retry a hard reload.

### A page renders without the password prompt after deploy

The deploy sanity-check counts how many of the generated HTML files
carry the `staticrypt-html` class marker and aborts if any are
missing, so this should never happen on a successful deploy. If it
does, it means StaticCrypt silently skipped a file; check the
`Encrypt site with StaticCrypt` step log, specifically the
`Encrypted $html_gated of $html_total HTML files.` line, to see which
ones were missed.

### The password prompt is styled in green, not teal

That is StaticCrypt's default palette. Check the `docs.yml` step —
the `--template-color-primary` and `--template-color-secondary` flags
set the ESABCC palette. A deploy that happened before those flags
landed still shows the old colours; a fresh re-run fixes it.

### Triggering a redeploy without changing the content

The workflow's path filter only matches pushes that touch `docs/**`,
`mkdocs.yml` or `.github/workflows/docs.yml`. A `git commit --allow-empty`
will **not** trigger it. Use `workflow_dispatch` instead (from the
web UI or the GitHub mobile app: **Actions → docs → Run workflow**),
or push a minor change to one of the filtered paths.

## Structure

```
mkdocs.yml                           Site config (palette, nav, plugins)
docs/
├── index.md                         Landing page with module cards
├── stylesheets/extra.css            ESABCC-palette theme overrides
├── overrides/                       Material theme overrides (empty today)
├── assets/                          Logo, favicon
├── overview/                        Plain-language overview
├── modules/                         Per-module technical deep-dives (5)
├── infrastructure/                  Stewardship · deployment · AI layer · Copilot · GDPR
└── vision/                          Vision · blueprint · roadmap
```

The narrative reference docs were consolidated into the per-topic
pages under `infrastructure/` and `vision/`; the legacy flat files at
the top of `docs/` have been removed.

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
