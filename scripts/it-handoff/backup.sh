#!/usr/bin/env bash
# ============================================================================
# backup.sh — Nightly logical backup of eu_climate.
#
# Meets the spec:
#   * nightly full dump (this script)
#   * 30-day point-in-time recovery (from WAL archiving — configured in
#     postgresql.conf.recommended, NOT in this script)
#   * 12-month retention, 90-day hot tier
#
# Cron (run as postgres user):
#   15 2 * * *  /opt/method-hub/backup.sh >> /var/log/method-hub/backup.log 2>&1
#
# Env:
#   BACKUP_DIR   target directory on the hot tier (default /var/backups/eu_climate)
#   COLD_DIR     target directory on the cold tier (optional; files > 90 days
#                are moved here). If unset, files just stay in BACKUP_DIR.
#   PGSERVICE    entry in ~/.pg_service.conf (recommended over inline URL)
#   DATABASE_URL alternative to PGSERVICE
# ============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/eu_climate}"
COLD_DIR="${COLD_DIR:-}"
HOT_DAYS="${HOT_DAYS:-90}"
KEEP_DAYS="${KEEP_DAYS:-365}"

mkdir -p "${BACKUP_DIR}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BACKUP_DIR}/eu_climate-${STAMP}.dump"

echo "[$(date -u +%FT%TZ)] starting pg_dump → ${OUT}"

# Custom format (-Fc) is compressed and supports parallel restore.
if [[ -n "${PGSERVICE:-}" ]]; then
  pg_dump --format=custom --compress=9 --file="${OUT}" "service=${PGSERVICE}"
elif [[ -n "${DATABASE_URL:-}" ]]; then
  pg_dump --format=custom --compress=9 --file="${OUT}" "${DATABASE_URL}"
else
  echo "ERROR: set PGSERVICE or DATABASE_URL" >&2
  exit 1
fi

# Checksum for integrity verification on restore
sha256sum "${OUT}" > "${OUT}.sha256"

# Rotate: move hot → cold after HOT_DAYS
if [[ -n "${COLD_DIR}" ]]; then
  mkdir -p "${COLD_DIR}"
  find "${BACKUP_DIR}" -type f -name 'eu_climate-*.dump*' -mtime +"${HOT_DAYS}" \
    -exec mv {} "${COLD_DIR}/" \;
  # Expire cold beyond KEEP_DAYS
  find "${COLD_DIR}" -type f -name 'eu_climate-*.dump*' -mtime +"${KEEP_DAYS}" -delete
else
  find "${BACKUP_DIR}" -type f -name 'eu_climate-*.dump*' -mtime +"${KEEP_DAYS}" -delete
fi

echo "[$(date -u +%FT%TZ)] backup complete: $(du -h "${OUT}" | cut -f1)"
