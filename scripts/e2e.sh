#!/usr/bin/env bash
#
# e2e.sh — run the Playwright suite against an isolated stack so test residue
# never lands in the dev DB.
#
# Brings up docker-compose.test.yml (postgres-e2e:5433 + api-e2e:8090), starts
# a Vite dev server on :5174 proxied at the test API, runs playwright, then
# tears down the Vite server. The test Docker stack stays up between runs
# (faster); pass --down to wipe it after the run.
#
# Usage:
#   ./scripts/e2e.sh                     # run full suite
#   ./scripts/e2e.sh -- --grep @smoke    # forward args after -- to playwright
#   ./scripts/e2e.sh --down              # tear down test stack after run

set -euo pipefail

cd "$(dirname "$0")/.."

TEAR_DOWN=0
PW_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --down) TEAR_DOWN=1; shift ;;
    --) shift; PW_ARGS=("$@"); break ;;
    *) PW_ARGS+=("$1"); shift ;;
  esac
done

log() { printf '[e2e] %s\n' "$*"; }

# 1. Bring up the isolated stack
log "starting isolated test stack (postgres-e2e:5433 + api-e2e:8090)"
docker compose -f docker-compose.test.yml up -d --build

log "waiting for api-e2e to be healthy"
until curl -fsS http://localhost:8090/actuator/health >/dev/null 2>&1; do
  sleep 2
done
log "  api-e2e is up"

# 2. Start Vite dev server on :5174 pointed at the test API
log "starting vite dev server on :5174 (proxy → http://localhost:8090)"
export VITE_API_PROXY_TARGET=http://localhost:8090
( cd web && npx vite --port 5174 --strictPort ) >/tmp/lavadero-e2e-vite.log 2>&1 &
VITE_PID=$!
trap 'kill "$VITE_PID" 2>/dev/null || true' EXIT INT TERM

until curl -fsS http://localhost:5174 >/dev/null 2>&1; do
  sleep 1
  if ! kill -0 "$VITE_PID" 2>/dev/null; then
    log "vite died — see /tmp/lavadero-e2e-vite.log"
    exit 1
  fi
done
log "  vite ready"

# 3. Run Playwright
export PLAYWRIGHT_BASE_URL=http://localhost:5174
export E2E_CLEANUP_CONTAINER=lavadero-postgres-e2e

log "running playwright"
set +e
( cd web && npx playwright test "${PW_ARGS[@]}" )
EXIT=$?
set -e

# 4. Clean up
kill "$VITE_PID" 2>/dev/null || true

if [[ "$TEAR_DOWN" -eq 1 ]]; then
  log "tearing down test stack (--down)"
  docker compose -f docker-compose.test.yml down -v
else
  log "leaving test stack up (re-run faster). pass --down to wipe it."
fi

exit "$EXIT"
