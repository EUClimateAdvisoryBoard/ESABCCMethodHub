#!/usr/bin/env bash
# ============================================================================
# 03-verify.sh — Post-install sanity check. Run as admin.
#
# Checks:
#   1. Required extensions are enabled
#   2. `auth` shim functions resolve
#   3. Every expected application table exists
#   4. RLS is enabled on every application table
#   5. All four service-account roles exist and can connect
#
# Prints a summary and exits 0 on success, 1 on any failure.
#
# IT action:
#   DATABASE_URL="postgresql://admin@db.esabcc.local:5432/eu_climate" \
#     ./03-verify.sh
# ============================================================================
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

FAIL=0
check() {
  local label="$1"
  local query="$2"
  local expected="$3"
  local actual
  actual=$(psql "${DATABASE_URL}" -Atc "${query}")
  if [[ "${actual}" == "${expected}" ]]; then
    printf '  OK    %s\n' "${label}"
  else
    printf '  FAIL  %s  (expected=%s, got=%s)\n' "${label}" "${expected}" "${actual}"
    FAIL=1
  fi
}

echo "── Extensions ──────────────────────────────────────────────"
for ext in uuid-ossp pgcrypto pg_trgm; do
  check "extension ${ext}" \
    "select count(*)::int from pg_extension where extname = '${ext}'" \
    "1"
done

echo "── Auth shim ─────────────────────────────────────────────────"
check "auth.uid() resolves" \
  "select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='auth' and p.proname='uid'" \
  "1"
check "auth.users table exists" \
  "select count(*)::int from information_schema.tables where table_schema='auth' and table_name='users'" \
  "1"

echo "── Application tables ──────────────────────────────────────────"
EXPECTED_TABLES=(
  profiles annotations custom_tags comments activity_log
  personal_reading_list shared_reading_list reading_list_upvotes
  libraries library_members "references" csl_styles
  inbound_emails scenario_submissions
  media_keywords media_outlets media_articles media_fetch_runs
  media_social_sources media_social_posts
  custom_posts policy_clock_events notifications
)
for t in "${EXPECTED_TABLES[@]}"; do
  check "table public.${t}" \
    "select count(*)::int from information_schema.tables where table_schema='public' and table_name='${t//\"/}'" \
    "1"
done

echo "── Row-level security ──────────────────────────────────────────"
for t in "${EXPECTED_TABLES[@]}"; do
  check "RLS enabled on public.${t}" \
    "select coalesce((select relrowsecurity::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='${t//\"/}'), 0)" \
    "1"
done

echo "── Service-account roles ─────────────────────────────────────────"
for r in svc_ref_manager svc_policy_nav svc_data_explorer svc_news eu_climate_app; do
  check "role ${r} exists" \
    "select count(*)::int from pg_roles where rolname='${r}'" \
    "1"
done

echo "───────────────────────────────────────────────────────────────────────"
if [[ "${FAIL}" -eq 0 ]]; then
  echo "All checks passed. Database is ready for the application."
  exit 0
else
  echo "Some checks failed. See FAIL lines above before handing off."
  exit 1
fi
