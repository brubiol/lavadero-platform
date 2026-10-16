#!/usr/bin/env bash
# deploy-host.sh
# Runs ON the VM (CI calls it after copying files to /opt/lavadero/release/).
# Starts/updates the shared Caddy edge and every business instance, then waits
# for each API to report healthy. Exits non-zero if any instance is unhealthy.

set -euo pipefail

ROOT="/opt/lavadero"
RELEASE="$ROOT/release"

docker network inspect lavadero-edge >/dev/null 2>&1 || docker network create lavadero-edge

cp "$RELEASE/docker-compose.edge.yml" "$RELEASE/Caddyfile" "$ROOT/edge/"
docker compose -f "$ROOT/edge/docker-compose.edge.yml" up -d --remove-orphans
# Picks up site files added by setup-secrets.sh without dropping connections.
docker exec lavadero-caddy caddy reload --config /etc/caddy/Caddyfile

shopt -s nullglob
instances=("$ROOT"/instances/*/)
if [[ ${#instances[@]} -eq 0 ]]; then
  echo "No instances under $ROOT/instances. Run setup-secrets.sh first." >&2
  exit 1
fi

for dir in "${instances[@]}"; do
  name="$(basename "$dir")"
  echo "==> Deploying instance: $name"
  cp "$RELEASE/docker-compose.prod.yml" "$dir"
  docker compose -f "$dir/docker-compose.prod.yml" pull
  docker compose -f "$dir/docker-compose.prod.yml" up -d --remove-orphans
done

docker image prune -f

failed=0
for dir in "${instances[@]}"; do
  name="$(basename "$dir")"
  for i in $(seq 1 36); do
    status="$(docker inspect --format '{{.State.Health.Status}}' "$name-api" 2>/dev/null || echo missing)"
    if [[ "$status" == "healthy" ]]; then
      echo "==> $name-api healthy after $((i * 5))s"
      break
    fi
    if [[ $i -eq 36 ]]; then
      echo "==> $name-api NOT healthy (status=$status)" >&2
      docker logs --tail 50 "$name-api" >&2 || true
      failed=1
    fi
    sleep 5
  done
done

exit $failed
