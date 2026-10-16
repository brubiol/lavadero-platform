#!/usr/bin/env bash
# backup-offsite.sh
# Nightly backup of every business instance on the VM:
#   pg_dump (custom format) -> /opt/lavadero/backups/<instance>/ -> S3-compatible bucket
# Local copies are kept 7 days; off-site copies BACKUP_RETENTION_DAYS (default 30).
# Restore with: scripts/restore-db.sh <file>  (instance "lavadero"), or pipe into
#   docker exec -i <instance>-postgres pg_restore --clean --if-exists --no-owner --no-acl -U lavadero -d lavadero
#
# Cron (crontab -e), 3am Monterrey time:
#   CRON_TZ=America/Monterrey
#   0 3 * * * /opt/lavadero/release/scripts/backup-offsite.sh >> /opt/lavadero/backups/backup.log 2>&1

set -euo pipefail

ROOT="/opt/lavadero"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"

# .env values can contain spaces (full names), so read keys instead of sourcing.
env_value() {
  grep -E "^$2=" "$1" | tail -n1 | cut -d= -f2-
}

status=0
for dir in "$ROOT"/instances/*/; do
  [[ -f "$dir/.env" ]] || continue
  name="$(basename "$dir")"
  env_file="$dir/.env"
  db="$(env_value "$env_file" POSTGRES_DB)"
  user="$(env_value "$env_file" POSTGRES_USER)"
  out_dir="$ROOT/backups/$name"
  out="$out_dir/$name-$TIMESTAMP.dump"
  mkdir -p "$out_dir"

  if ! docker exec "$name-postgres" pg_dump -U "${user:-lavadero}" -d "${db:-lavadero}" \
      --format=custom --no-owner --no-acl > "$out"; then
    echo "$(date -u) ERROR: dump failed for $name" >&2
    rm -f "$out"
    status=1
    continue
  fi
  echo "$(date -u) dumped $name -> $out ($(du -h "$out" | cut -f1))"
  find "$out_dir" -name '*.dump' -mtime +7 -delete

  endpoint="$(env_value "$env_file" BACKUP_S3_ENDPOINT)"
  if [[ -z "$endpoint" ]]; then
    echo "$(date -u) WARN: no BACKUP_S3_ENDPOINT for $name; local copy only" >&2
    continue
  fi
  bucket="$(env_value "$env_file" BACKUP_S3_BUCKET)"
  retention="$(env_value "$env_file" BACKUP_RETENTION_DAYS)"

  # rclone runs in a throwaway container so nothing extra is installed on the host.
  rclone() {
    docker run --rm -v "$out_dir:/data:ro" \
      -e RCLONE_CONFIG_OFFSITE_TYPE=s3 \
      -e RCLONE_CONFIG_OFFSITE_PROVIDER=Other \
      -e RCLONE_CONFIG_OFFSITE_ENDPOINT="$endpoint" \
      -e RCLONE_CONFIG_OFFSITE_ACCESS_KEY_ID="$(env_value "$env_file" BACKUP_S3_ACCESS_KEY)" \
      -e RCLONE_CONFIG_OFFSITE_SECRET_ACCESS_KEY="$(env_value "$env_file" BACKUP_S3_SECRET_KEY)" \
      -e RCLONE_S3_NO_CHECK_BUCKET=true \
      rclone/rclone:1.68.2 "$@"
  }

  if rclone copyto "/data/$(basename "$out")" "offsite:${bucket:-lavadero-backups}/$name/$(basename "$out")" \
     && rclone delete --min-age "${retention:-30}d" "offsite:${bucket:-lavadero-backups}/$name/"; then
    echo "$(date -u) uploaded $name off-site"
  else
    echo "$(date -u) ERROR: off-site upload failed for $name" >&2
    status=1
  fi
done

exit $status
