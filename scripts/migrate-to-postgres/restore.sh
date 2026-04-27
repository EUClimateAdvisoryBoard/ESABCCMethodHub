#!/usr/bin/env bash
# Restore a Supabase dump into a self-hosted Postgres instance.
#
# Usage:
#   DATABASE_URL="postgresql://user:pw@host:5432/eu_climate" \
#   ./scripts/migrate-to-postgres/restore.sh path/to/dump.sql
#
# Prerequisites on the target DB:
#   create database eu_climate;
#   create extension if not exists "uuid-ossp";
#   create extension if not exists pgcrypto;
#
# This does NOT restore Supabase Auth (auth.users) — that schema is
# replaced by your new auth provider. Expect foreign keys that reference
# auth.users (e.g. profiles.id) to fail; either drop those constraints
# before restore or migrate users separately via scripts/migrate-to-postgres/migrate-users.mjs
# (to be written once the target auth provider is picked).

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set (target Postgres)." >&2
  exit 1
fi

DUMP="${1:-}"
if [[ -z "${DUMP}" || ! -f "${DUMP}" ]]; then
  echo "ERROR: Provide a dump file path. e.g. ./restore.sh supabase-dump-20250101.sql" >&2
  exit 1
fi

echo "Restoring ${DUMP} into ${DATABASE_URL%@*}@..."
psql --single-transaction --set ON_ERROR_STOP=on --file="${DUMP}" "${DATABASE_URL}"

echo "Done. Next: ./scripts/migrate-to-postgres/verify-parity.mjs"
