#!/usr/bin/env bash
# ============================================================================
# 01-apply-schema.sh — Apply the app schema to the freshly-prepared database.
#
# Runs the base schema + every numbered migration in supabase/migrations/ in
# order, inside a single transaction. Every statement is idempotent (all
# tables use CREATE TABLE IF NOT EXISTS, all policies use DROP POLICY IF
# EXISTS), so re-running is safe.
#
# IT action:
#   DATABASE_URL="postgresql://admin@db.internal.example:5432/eu_climate" \
#     ./01-apply-schema.sh
#
# Requires 00-prereqs.sql to have run first (extensions + auth shim).
# ============================================================================
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  echo "Example: DATABASE_URL=postgresql://admin@db.internal.example:5432/eu_climate $0" >&2
  exit 1
fi

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
BASE="${ROOT}/supabase-schema.sql"
MIGRATIONS_DIR="${ROOT}/supabase/migrations"

if [[ ! -f "${BASE}" ]]; then
  echo "ERROR: base schema not found at ${BASE}" >&2
  exit 1
fi

echo "Applying base schema: ${BASE}"
psql "${DATABASE_URL}" \
  --single-transaction \
  --set ON_ERROR_STOP=on \
  --file "${BASE}"

# Apply numbered migrations (001_, 002_, …) in lexical order.
shopt -s nullglob
for sqlfile in "${MIGRATIONS_DIR}"/[0-9]*.sql; do
  echo "Applying migration: $(basename "${sqlfile}")"
  psql "${DATABASE_URL}" \
    --single-transaction \
    --set ON_ERROR_STOP=on \
    --file "${sqlfile}"
done

echo "01-apply-schema.sh complete. Next: run 02-service-accounts.sql"
