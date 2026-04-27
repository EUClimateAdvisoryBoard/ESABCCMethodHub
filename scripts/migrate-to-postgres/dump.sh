#!/usr/bin/env bash
# Dump the Supabase-hosted Postgres to a local SQL file.
#
# Usage:
#   SUPABASE_DB_URL="postgres://postgres:<PW>@db.<ref>.supabase.co:5432/postgres" \
#   ./scripts/migrate-to-postgres/dump.sh [output-file]
#
# Find the connection string in Supabase dashboard:
#   Project Settings → Database → Connection string → URI
#
# Notes:
#   --no-owner / --no-privileges strip Supabase-specific role grants so the
#   dump can be restored on a generic Postgres instance.
#   --schema=public excludes Supabase's internal `auth`, `storage`, `realtime`
#   schemas — those need separate handling (Auth migrates to EU Login; Storage
#   to S3/MinIO; Realtime is replaced by Postgres LISTEN/NOTIFY).

set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: SUPABASE_DB_URL is not set." >&2
  echo "Get it from Supabase → Project Settings → Database → Connection string." >&2
  exit 1
fi

OUT="${1:-supabase-dump-$(date +%Y%m%d-%H%M%S).sql}"

echo "Dumping public schema from Supabase to ${OUT}..."
pg_dump \
  --no-owner \
  --no-privileges \
  --schema=public \
  --exclude-schema='auth|storage|realtime|graphql|graphql_public|pgsodium|vault|net|pgbouncer' \
  --file="${OUT}" \
  "${SUPABASE_DB_URL}"

echo "Done. Wrote ${OUT}."
echo "Next: ./scripts/migrate-to-postgres/restore.sh ${OUT}"
