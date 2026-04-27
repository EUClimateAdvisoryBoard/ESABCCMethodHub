#!/usr/bin/env bash
# Build the MkDocs Material documentation site into ./public/docs so it
# ships under the Next.js app and is served at /docs on Vercel.
#
# Replaces the previous GitHub Pages deployment (.github/workflows/docs.yml,
# now removed). Vercel runs this as part of the build pipeline — see the
# `vercel-build` script in package.json.
#
# Safe to run locally: `bash scripts/build-docs.sh`. Requires Python 3
# with pip available on PATH.
set -euo pipefail

if ! command -v python3 >/dev/null 2>&1; then
  echo "build-docs: python3 is required but was not found on PATH" >&2
  exit 1
fi

PIP="python3 -m pip"

# Vercel's build image ships an "externally-managed" Python (PEP 668)
# managed by uv, which refuses ordinary `pip install` invocations. The
# build VM is ephemeral, so installing into the system site-packages is
# fine — pass --break-system-packages to override the guard. Harmless on
# unmanaged Pythons (the flag is silently accepted).
$PIP install --quiet --disable-pip-version-check --break-system-packages \
  mkdocs-material==9.5.42 \
  pymdown-extensions==10.11.2 \
  mkdocs-awesome-pages-plugin==2.9.3 \
  mkdocs-glightbox==0.4.0

rm -rf public/docs
python3 -m mkdocs build --site-dir public/docs --clean

echo "build-docs: site written to public/docs ($(find public/docs -name '*.html' | wc -l) HTML files)"
