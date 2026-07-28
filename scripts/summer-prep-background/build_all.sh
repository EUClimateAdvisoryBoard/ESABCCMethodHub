#!/usr/bin/env bash
#
# Rebuild every Summer Prep background document from the Method Hub's own data.
#
# The intermediate JSON files are regenerated on every run and written to a
# temporary directory rather than kept in the tree. That is deliberate: a
# checked-in intermediate went stale once and the builders spent hours
# reproducing documents from a snapshot taken before the corrections, so the
# documents did not contain the fact-check that had supposedly been applied to
# them. Nothing here is cached; `extract.mjs` prints a canary value so a stale
# read is visible in the log.
#
# Usage:  bash scripts/summer-prep-background/build_all.sh [outdir]

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="${1:-$ROOT/project-documents/summer-prep-background}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"
mkdir -p "$OUT"

# The Board's Word template is not in the repository — it is supplied by whoever
# runs the build. Point TEMPLATE at it, or drop it next to the outputs.
TEMPLATE="${TEMPLATE:-$OUT/Advisory_Board_blank_template.dotx}"
if [ ! -f "$TEMPLATE" ]; then
  echo "Word template not found at: $TEMPLATE" >&2
  echo "Set TEMPLATE=/path/to/Advisory_Board_blank_template.dotx and re-run." >&2
  exit 1
fi

echo "== 1/5  extract the Hub's data =="
node --experimental-strip-types scripts/summer-prep-background/extract.mjs "$TMP/data.json"

echo "== 2/5  collapse the calc-grid migrations, translate them to Excel =="
node scripts/esabcc-indicators/dump-calc-layouts.mjs "$TMP/calc.json"
node --experimental-strip-types --import ./scripts/esabcc-indicators/ts-resolve-hook.mjs \
  scripts/esabcc-indicators/export-calc-excel.mjs "$TMP/calc.json" "$TMP/calc_excel.json"

FC="$ROOT/scripts/esabcc-indicators/factcheck-postreport-results.json"
RW="$ROOT/scripts/esabcc-indicators/report-way-rows.json"

echo "== 3/5  build the workbooks =="
python3 scripts/summer-prep-background/build_policy_gap_tracker.py \
  "$TMP/data.json" "$OUT/ESABCC_Policy-Gap-Tracker_2026-07.xlsx"
python3 scripts/summer-prep-background/build_indicator_check.py \
  "$TMP/data.json" "$TMP/calc.json" "$FC" "$OUT/ESABCC_Indicator-Check_2026-07.xlsx"
python3 scripts/summer-prep-background/build_sector_policy_gaps.py \
  "$TMP/data.json" "$OUT/ESABCC_Policy-Gaps_Transport-Industry_2026-07.xlsx"
python3 scripts/summer-prep-background/build_synergies_docx.py \
  "$TMP/data.json" "$TEMPLATE" "$OUT/ESABCC_Synergies-Trade-offs_Industry-Transport_2026-07.docx"

echo "== 4/5  build the two overviews =="
python3 scripts/summer-prep-background/build_indicator_overview.py \
  "$TMP/data.json" "$TMP/calc_excel.json" "$FC" "$RW" "$OUT"

echo "== 5/5  verify =="
python3 scripts/summer-prep-background/check_outputs.py \
  "$TMP/data.json" "$TMP/calc.json" "$OUT" "$TEMPLATE"
node scripts/esabcc-indicators/check-series-continuity.mjs

echo
echo "done → $OUT"
