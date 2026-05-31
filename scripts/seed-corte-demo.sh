#!/usr/bin/env bash
#
# seed-corte-demo.sh — add a known-amount slice of activity to today's open
# shift so you can walk through the Corte screen and see exact numbers.
#
# Why "today" and not a future date: the Corte screen at /corte is hardcoded
# to query business-days WHERE business_date = today (App.tsx:2966). Future-
# dated demo shifts can never appear in the UI, so the only way to visually
# verify the screen is to seed onto the live open shift for today.
#
# Behavior
#   • Finds today's OPEN business day. If none exists, opens one.
#   • Picks the OPEN shift on that day. If none open, opens MATUTINO. If both
#     shifts are already CLOSED, refuses (close = terminal, nothing to demo).
#   • Adds: 2 cash tickets ($100 each), 1 card ticket ($100), $30 gasto,
#     $20 retiro, $10 advance. Isolated catalog with CORTE_<sec> prefix.
#   • Prints the delta the Corte screen should show + the URL.
#
# This DOES touch today's real data. The catalog and movements are tagged so
# you can identify and remove them later. Safe for local dev; do not aim at
# prod unless you mean it.
#
# Tools:   curl, jq
#
# Tunables via env:
#   API_URL          (default: http://localhost:8080)
#   WEB_URL          (default: http://localhost:5173)
#   API_USER         (default: dueno)
#   API_PASS         (default: cambia-esto-123)
#   SCENARIO         (default: balanced; options: balanced | sobrante | faltante)

set -euo pipefail

API_URL="${API_URL:-http://localhost:8080}"
WEB_URL="${WEB_URL:-http://localhost:5173}"
API_USER="${API_USER:-dueno}"
API_PASS="${API_PASS:-cambia-esto-123}"
SCENARIO="${SCENARIO:-balanced}"

for tool in curl jq; do
  command -v "$tool" >/dev/null || { echo "missing tool: $tool" >&2; exit 1; }
done

TODAY=$(date +%Y-%m-%d)
SUFFIX=$(date +%s | tail -c 7)
PREFIX="CORTE_${SUFFIX}"

say() { printf '\033[1;36m▸\033[0m %s\n' "$*"; }
ok()  { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn(){ printf '\033[1;33m!\033[0m %s\n' "$*"; }

say "Logging in as ${API_USER}"
TOKEN=$(curl -fsS -X POST "${API_URL}/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${API_USER}\",\"password\":\"${API_PASS}\"}" \
  | jq -r .accessToken)
[[ -n "$TOKEN" && "$TOKEN" != "null" ]] || { echo "login failed"; exit 1; }
H=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")

say "Finding today's business day (${TODAY})"
DAY_JSON=$(curl -fsS "${API_URL}/api/v1/business-days?from=${TODAY}&to=${TODAY}" "${H[@]}")
DAY_ID=$(echo "$DAY_JSON" | jq '.[] | select(.status=="OPEN") | .id')
if [[ -z "$DAY_ID" ]]; then
  warn "no open business day today, opening one"
  DAY_ID=$(curl -fsS -X POST "${API_URL}/api/v1/business-days/open" "${H[@]}" \
    -d "{\"businessDate\":\"${TODAY}\"}" | jq -r .id)
fi
ok "businessDayId=${DAY_ID}"

say "Finding an OPEN shift on day ${DAY_ID}"
SHIFTS_JSON=$(curl -fsS "${API_URL}/api/v1/shifts?business_day_id=${DAY_ID}" "${H[@]}")
SHIFT_ID=$(echo "$SHIFTS_JSON" | jq '[.[] | select(.status=="OPEN")] | first | .id // empty')
SHIFT_TYPE=$(echo "$SHIFTS_JSON" | jq -r '[.[] | select(.status=="OPEN")] | first | .shiftType // empty')

if [[ -z "$SHIFT_ID" ]]; then
  # Pick whichever shift type isn't already closed; default to MATUTINO.
  HAS_MAT=$(echo "$SHIFTS_JSON" | jq '[.[] | select(.shiftType=="MATUTINO")] | length')
  if [[ "$HAS_MAT" == "0" ]]; then
    NEW_TYPE="MATUTINO"
  else
    HAS_VESP=$(echo "$SHIFTS_JSON" | jq '[.[] | select(.shiftType=="VESPERTINO")] | length')
    if [[ "$HAS_VESP" == "0" ]]; then
      NEW_TYPE="VESPERTINO"
    else
      echo "Both shifts already CLOSED for today. Reopen one via /corte (Reabrir) and re-run."
      exit 1
    fi
  fi
  warn "no open shift today, opening ${NEW_TYPE}"
  SHIFT_ID=$(curl -fsS -X POST "${API_URL}/api/v1/shifts/open" "${H[@]}" \
    -d "{\"businessDayId\":${DAY_ID},\"shiftType\":\"${NEW_TYPE}\"}" | jq -r .id)
  SHIFT_TYPE="$NEW_TYPE"
fi
ok "shiftId=${SHIFT_ID} (${SHIFT_TYPE}, OPEN)"

say "Reading current close-summary to compute the delta"
BEFORE=$(curl -fsS "${API_URL}/api/v1/shifts/${SHIFT_ID}/close-summary" "${H[@]}")
BEFORE_EXPECTED=$(echo "$BEFORE" | jq -r '.expectedCash // "0"')
BEFORE_CASH=$(echo "$BEFORE" | jq -r '.cashRevenue // "0"')

say "Seeding isolated catalog (${PREFIX})"
EMP_ID=$(curl -fsS -X POST "${API_URL}/api/v1/employees" "${H[@]}" \
  -d "{\"fullName\":\"${PREFIX} Lavador\"}" | jq -r .id)
SVC_ID=$(curl -fsS -X POST "${API_URL}/api/v1/service-types" "${H[@]}" \
  -d "{\"code\":\"${PREFIX}_SVC\",\"name\":\"${PREFIX} Servicio\"}" | jq -r .id)
SIZE_ID=$(curl -fsS -X POST "${API_URL}/api/v1/vehicle-sizes" "${H[@]}" \
  -d "{\"code\":\"${PREFIX}_SIZE\",\"name\":\"${PREFIX} Tamano\",\"sortOrder\":50}" | jq -r .id)
curl -fsS -X POST "${API_URL}/api/v1/service-prices" "${H[@]}" \
  -d "{\"serviceTypeId\":${SVC_ID},\"vehicleSizeId\":${SIZE_ID},\"amount\":100,\"currency\":\"MXN\",\"effectiveFrom\":\"2020-01-01\"}" >/dev/null
ok "employee=${EMP_ID} service=${SVC_ID} size=${SIZE_ID} price=\$100"

ticket() {
  local pay="$1" desc="$2"
  curl -fsS -X POST "${API_URL}/api/v1/tickets" "${H[@]}" -d "{
    \"businessDayId\":${DAY_ID},\"shiftId\":${SHIFT_ID},
    \"serviceTypeId\":${SVC_ID},\"vehicleSizeId\":${SIZE_ID},
    \"currency\":\"MXN\",\"paymentMethod\":\"${pay}\",
    \"vehicleDescription\":\"${desc}\",\"employeeIds\":[${EMP_ID}]
  }" >/dev/null
}

say "Adding to shift ${SHIFT_ID}: 2 cash @ \$100, 1 card @ \$100"
ticket CASH "${PREFIX} cash 1"
ticket CASH "${PREFIX} cash 2"
ticket CARD "${PREFIX} card 1"

say "Adding: 1 expense \$30, 1 withdrawal \$20, 1 advance \$10"
curl -fsS -X POST "${API_URL}/api/v1/expenses" "${H[@]}" -d "{
  \"businessDayId\":${DAY_ID},\"shiftId\":${SHIFT_ID},
  \"expenseDate\":\"${TODAY}\",\"category\":\"MATERIAL\",
  \"amount\":30,\"description\":\"${PREFIX} gasto\"
}" >/dev/null
curl -fsS -X POST "${API_URL}/api/v1/withdrawals" "${H[@]}" -d "{
  \"businessDayId\":${DAY_ID},\"shiftId\":${SHIFT_ID},
  \"withdrawalDate\":\"${TODAY}\",\"amount\":20,\"reason\":\"${PREFIX} retiro\"
}" >/dev/null
curl -fsS -X POST "${API_URL}/api/v1/employee-advances" "${H[@]}" -d "{
  \"businessDayId\":${DAY_ID},\"shiftId\":${SHIFT_ID},
  \"employeeId\":${EMP_ID},\"advanceDate\":\"${TODAY}\",
  \"amount\":10,\"reason\":\"${PREFIX} prestamo\"
}" >/dev/null
ok "movements seeded"

say "Re-reading close-summary to confirm delta"
AFTER=$(curl -fsS "${API_URL}/api/v1/shifts/${SHIFT_ID}/close-summary" "${H[@]}")
AFTER_EXPECTED=$(echo "$AFTER" | jq -r '.expectedCash')
AFTER_CASH=$(echo "$AFTER" | jq -r '.cashRevenue')
DELTA=$(python3 -c "print(f'{float(\"$AFTER_EXPECTED\") - float(\"$BEFORE_EXPECTED\"):.2f}')")

# Demo contribution math (must match ShiftCloseService.summary):
#   demo cashRevenue   = 200   (2 cash tickets)
#   demo expenses      = 30
#   demo withdrawals   = 20
#   demo advances      = 10
#   demo expectedCash  = 200 - 30 - 20 - 10 = 140
# So the running expectedCash should jump by exactly +140.

case "$SCENARIO" in
  balanced)
    TARGET_COUNT=$(python3 -c "print(f'{float(\"$AFTER_EXPECTED\"):.2f}')")
    LABEL="balanced (variance ≈ \$0)"
    ;;
  sobrante)
    TARGET_COUNT=$(python3 -c "print(f'{float(\"$AFTER_EXPECTED\") + 20:.2f}')")
    LABEL="sobrante (variance ≈ +\$20, no reason required)"
    ;;
  faltante)
    TARGET_COUNT=$(python3 -c "print(f'{float(\"$AFTER_EXPECTED\") - 40:.2f}')")
    LABEL="faltante (variance ≈ -\$40, REQUIRES closingReason)"
    ;;
  *) echo "unknown SCENARIO: $SCENARIO"; exit 1 ;;
esac

cat <<EOF

╭─ Corte demo ready ───────────────────────────────────────────────╮
│  Date         ${TODAY}
│  Business day ${DAY_ID}
│  Shift        ${SHIFT_ID} (${SHIFT_TYPE}, OPEN)
│  Scenario     ${LABEL}
│
│  Before this run, expectedCash was: \$${BEFORE_EXPECTED}
│  Demo contribution                : +\$140
│  Now the Corte screen should show : \$${AFTER_EXPECTED}
│
│  Type cash totaling \$${TARGET_COUNT} in the Conteo de efectivo box
│  to land on the ${SCENARIO} variance.
│
│  Open it in the browser:
│    ${WEB_URL}/corte
│
│  The ${SHIFT_TYPE} tab in the top-right should be selected automatically.
│  Anything tagged ${PREFIX} in the database belongs to this run.
╰──────────────────────────────────────────────────────────────────╯

EOF
