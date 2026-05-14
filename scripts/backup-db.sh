#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [[ -n "${DATABASE_URL:-}" ]]; then
  OUT="${BACKUP_DIR}/lavadero-${TIMESTAMP}.dump"
  pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file="$OUT"
elif [[ -n "${PGHOST:-}" ]]; then
  OUT="${BACKUP_DIR}/lavadero-${TIMESTAMP}.dump"
  pg_dump --format=custom --no-owner --no-acl --file="$OUT"
else
  OUT="${BACKUP_DIR}/lavadero-${TIMESTAMP}.dump"
  docker exec lavadero-postgres pg_dump -U lavadero -d lavadero --format=custom --no-owner --no-acl > "$OUT"
fi

echo "Backup written: $OUT"
