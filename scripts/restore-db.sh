#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/restore-db.sh backups/lavadero-YYYYmmdd-HHMMSS.dump" >&2
  exit 1
fi

BACKUP_FILE="$1"
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

if [[ -n "${DATABASE_URL:-}" ]]; then
  pg_restore "$BACKUP_FILE" --clean --if-exists --no-owner --no-acl --dbname="$DATABASE_URL"
elif [[ -n "${PGHOST:-}" ]]; then
  pg_restore "$BACKUP_FILE" --clean --if-exists --no-owner --no-acl --dbname="${PGDATABASE:-lavadero}"
else
  cat "$BACKUP_FILE" | docker exec -i lavadero-postgres pg_restore --clean --if-exists --no-owner --no-acl -U lavadero -d lavadero
fi

echo "Restore complete: $BACKUP_FILE"
