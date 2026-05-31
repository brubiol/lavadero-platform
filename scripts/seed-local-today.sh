#!/usr/bin/env bash
#
# seed-local-today.sh — populate today's activity against a running local API
# so the dashboard isn't blank when you start clicking through the app.
#
# Idempotent: safe to re-run. Each step checks existence first and only creates
# missing data. No Flyway migration — this is local-only and must not bleed into
# prod history.
#
# Prereqs: docker compose up -d   (postgres + api healthy, web optional)
# Tools:   curl, jq
#
# Tunables via env:
#   API_URL          (default: http://localhost:8080)
#   API_USER         (default: dueno)
#   API_PASS         (default: cambia-esto-123)
#   SEED_DATE        (default: today, YYYY-MM-DD)
#   MIN_TICKETS      (default: 8 — if today already has >= this many, skip)

set -euo pipefail

API_URL="${API_URL:-http://localhost:8080}"
API_USER="${API_USER:-dueno}"
API_PASS="${API_PASS:-cambia-esto-123}"
SEED_DATE="${SEED_DATE:-$(date +%Y-%m-%d)}"
MIN_TICKETS="${MIN_TICKETS:-8}"

for tool in curl jq; do
  command -v "$tool" >/dev/null || { echo "missing tool: $tool" >&2; exit 1; }
done

log() { printf '[seed] %s\n' "$*"; }
die() { printf '[seed] ERROR: %s\n' "$*" >&2; exit 1; }

# Fail fast if API isn't reachable.
curl -fsS "$API_URL/actuator/health" >/dev/null \
  || die "API not reachable at $API_URL — run: docker compose up -d"

# --- 1. Login -----------------------------------------------------------------
log "logging in as $API_USER"
LOGIN_RESP=$(curl -fsS -X POST "$API_URL/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "$(jq -nc --arg u "$API_USER" --arg p "$API_PASS" '{username:$u,password:$p}')")
TOKEN=$(jq -er '.accessToken' <<<"$LOGIN_RESP") \
  || die "login failed — bad credentials? response: $LOGIN_RESP"
AUTH="Authorization: Bearer $TOKEN"

# Convenience wrappers.
api_get()  { curl -fsS -H "$AUTH" "$API_URL$1"; }
api_post() { curl -fsS -X POST -H "$AUTH" -H 'Content-Type: application/json' -d "$2" "$API_URL$1"; }

# --- 2. Business day ----------------------------------------------------------
log "ensuring business day open for $SEED_DATE"
BDAYS=$(api_get "/api/v1/business-days?from=$SEED_DATE&to=$SEED_DATE")
BDAY_ID=$(jq -r 'first(.[] | select(.businessDate == "'"$SEED_DATE"'")) | .id // empty' <<<"$BDAYS")
if [[ -z "$BDAY_ID" ]]; then
  RESP=$(api_post "/api/v1/business-days/open" "$(jq -nc --arg d "$SEED_DATE" '{businessDate:$d}')")
  BDAY_ID=$(jq -er '.id' <<<"$RESP")
  log "  opened business day id=$BDAY_ID"
else
  log "  business day id=$BDAY_ID already open"
fi

# --- 3. Shifts (MATUTINO + VESPERTINO) ----------------------------------------
ensure_shift() {
  local kind="$1"
  local existing
  existing=$(api_get "/api/v1/shifts?business_day_id=$BDAY_ID" \
    | jq -r 'first(.[] | select(.shiftType == "'"$kind"'")) | .id // empty')
  if [[ -n "$existing" ]]; then
    echo "$existing"
    return
  fi
  local resp
  resp=$(api_post "/api/v1/shifts/open" \
    "$(jq -nc --argjson b "$BDAY_ID" --arg t "$kind" '{businessDayId:$b,shiftType:$t}')")
  jq -er '.id' <<<"$resp"
}

log "ensuring MATUTINO shift open"
MAT_SHIFT_ID=$(ensure_shift MATUTINO)
log "  MATUTINO shift id=$MAT_SHIFT_ID"

log "ensuring VESPERTINO shift open"
VES_SHIFT_ID=$(ensure_shift VESPERTINO)
log "  VESPERTINO shift id=$VES_SHIFT_ID"

# --- 4. Reference data --------------------------------------------------------
log "loading reference catalogs"
EMPLOYEES=$(api_get "/api/v1/employees?active=true")
SERVICES=$(api_get "/api/v1/service-types")
SIZES=$(api_get "/api/v1/vehicle-sizes")

EMP_IDS=($(jq -r '[.[] | select(.active == true) | .id] | .[]' <<<"$EMPLOYEES" | head -n 6))
[[ ${#EMP_IDS[@]} -ge 2 ]] || die "need at least 2 active employees in catalog"

# Prefer standard wash services (LAV_ASPIRADO, LAV_EXTERIOR, ASPIRADO).
SVC_LAV=$(jq -r 'first(.[] | select(.code == "LAV_ASPIRADO")) | .id // empty' <<<"$SERVICES")
SVC_EXT=$(jq -r 'first(.[] | select(.code == "LAV_EXTERIOR")) | .id // empty' <<<"$SERVICES")
SVC_ASP=$(jq -r 'first(.[] | select(.code == "ASPIRADO")) | .id // empty' <<<"$SERVICES")
[[ -n "$SVC_LAV" ]] || die "service LAV_ASPIRADO missing from catalog"

# Vehicle sizes — sort_order ascending, pick small/medium/large.
SZ_IDS=($(jq -r '[.[] | select(.active == true and (.code != "HISTORICO"))] | sort_by(.sortOrder) | .[].id' <<<"$SIZES"))
[[ ${#SZ_IDS[@]} -ge 3 ]] || die "need at least 3 active vehicle sizes"
SZ_CHICO="${SZ_IDS[0]}"
SZ_SEDAN="${SZ_IDS[1]}"
SZ_GRANDE="${SZ_IDS[${#SZ_IDS[@]}-1]}"

# --- 5. Tickets ---------------------------------------------------------------
EXISTING_TICKETS=$(api_get "/api/v1/tickets?business_day_id=$BDAY_ID" | jq 'length')
log "today already has $EXISTING_TICKETS tickets (min $MIN_TICKETS to skip seeding)"

if [[ "$EXISTING_TICKETS" -lt "$MIN_TICKETS" ]]; then
  # Skip MATUTINO if already closed — backend rejects tickets on closed shifts.
  MAT_STATUS_NOW=$(api_get "/api/v1/shifts?business_day_id=$BDAY_ID" \
    | jq -r 'first(.[] | select(.shiftType == "MATUTINO")) | .status')
  log "seeding tickets (MATUTINO status: $MAT_STATUS_NOW)"

  create_ticket() {
    local shift_id="$1" svc="$2" size="$3" emp_json="$4" desc="$5" extra="${6:-}"
    local body
    body=$(jq -nc \
      --argjson b "$BDAY_ID" --argjson s "$shift_id" \
      --argjson svc "$svc" --argjson sz "$size" \
      --argjson emps "$emp_json" --arg desc "$desc" \
      '{businessDayId:$b, shiftId:$s, serviceTypeId:$svc, vehicleSizeId:$sz,
        currency:"MXN", paymentMethod:"CASH", employeeIds:$emps,
        vehicleDescription:$desc}')
    if [[ -n "$extra" ]]; then
      body=$(jq -c ". + $extra" <<<"$body")
    fi
    api_post "/api/v1/tickets" "$body" >/dev/null
  }

  if [[ "$MAT_STATUS_NOW" == "OPEN" ]]; then
    # MATUTINO: 5 tickets, mostly straightforward.
    create_ticket "$MAT_SHIFT_ID" "$SVC_LAV"  "$SZ_SEDAN"  "[${EMP_IDS[0]}]"                  "NISSAN VERSA BLANCO"
    create_ticket "$MAT_SHIFT_ID" "$SVC_LAV"  "$SZ_CHICO"  "[${EMP_IDS[1]}]"                  "CHEVY ROJO"
    create_ticket "$MAT_SHIFT_ID" "$SVC_LAV"  "$SZ_GRANDE" "[${EMP_IDS[0]},${EMP_IDS[2]:-${EMP_IDS[1]}}]" "CHEYENNE NEGRA"
    if [[ -n "$SVC_EXT" ]]; then
      create_ticket "$MAT_SHIFT_ID" "$SVC_EXT" "$SZ_SEDAN"  "[${EMP_IDS[1]}]"                  "JETTA GRIS" '{"paymentMethod":"CARD"}'
    fi
    # Courtesy ticket — owner wash.
    create_ticket "$MAT_SHIFT_ID" "$SVC_LAV"  "$SZ_SEDAN"  "[${EMP_IDS[0]}]"                  "TOYOTA COROLLA - CORTESIA" \
      '{"courtesy":true,"courtesyReason":"Cliente frecuente"}'
  else
    log "  MATUTINO closed — routing extra tickets to VESPERTINO"
    create_ticket "$VES_SHIFT_ID" "$SVC_LAV"  "$SZ_SEDAN"  "[${EMP_IDS[0]}]"                  "NISSAN VERSA BLANCO"
    create_ticket "$VES_SHIFT_ID" "$SVC_LAV"  "$SZ_CHICO"  "[${EMP_IDS[1]}]"                  "CHEVY ROJO"
    create_ticket "$VES_SHIFT_ID" "$SVC_LAV"  "$SZ_GRANDE" "[${EMP_IDS[0]},${EMP_IDS[2]:-${EMP_IDS[1]}}]" "CHEYENNE NEGRA"
    if [[ -n "$SVC_EXT" ]]; then
      create_ticket "$VES_SHIFT_ID" "$SVC_EXT" "$SZ_SEDAN"  "[${EMP_IDS[1]}]"                  "JETTA GRIS" '{"paymentMethod":"CARD"}'
    fi
    create_ticket "$VES_SHIFT_ID" "$SVC_LAV"  "$SZ_SEDAN"  "[${EMP_IDS[0]}]"                  "TOYOTA COROLLA - CORTESIA" \
      '{"courtesy":true,"courtesyReason":"Cliente frecuente"}'
  fi

  # VESPERTINO: 3 tickets, leave shift open for manual exercise.
  create_ticket "$VES_SHIFT_ID" "$SVC_LAV"  "$SZ_SEDAN"  "[${EMP_IDS[1]}]"                  "HONDA CIVIC AZUL"
  create_ticket "$VES_SHIFT_ID" "$SVC_LAV"  "$SZ_GRANDE" "[${EMP_IDS[0]}]"                  "FORD F150 BLANCA" \
    '{"priceOverride":250.00,"discountReason":"Precio negociado"}'
  if [[ -n "$SVC_ASP" ]]; then
    create_ticket "$VES_SHIFT_ID" "$SVC_ASP" "$SZ_CHICO"  "[${EMP_IDS[2]:-${EMP_IDS[1]}}]"   "SPARK BEIGE"
  else
    create_ticket "$VES_SHIFT_ID" "$SVC_LAV" "$SZ_CHICO"  "[${EMP_IDS[2]:-${EMP_IDS[1]}}]"   "SPARK BEIGE"
  fi

  log "  tickets created"

  # Renumber today's API-generated notas to continue the real 6-digit sequence
  # from V12 (real receipts go ~131xxx as of May 2026). The API auto-generates
  # "YYYYMMDD-NNNN" but cashiers type the printed-receipt nota in real life.
  log "  renumbering notas to continue real receipt sequence"
  docker exec -i "${PG_CONTAINER:-lavadero-postgres}" \
    psql -U lavadero -d lavadero -q -v "seed_date=$SEED_DATE" <<'SQL' >/dev/null
WITH last_real AS (
  SELECT COALESCE(MAX((nota_number)::bigint), 131908) AS n
  FROM tickets WHERE nota_number ~ '^[0-9]{6}$'
),
today_tickets AS (
  SELECT t.id, ROW_NUMBER() OVER (ORDER BY t.occurred_at, t.id) AS seq
  FROM tickets t JOIN business_days b ON t.business_day_id = b.id
  WHERE b.business_date = :'seed_date'::date
    AND t.nota_number ~ '^[0-9]{8}-[0-9]{4}$'
)
UPDATE tickets t
SET nota_number = LPAD((last_real.n + today_tickets.seq)::text, 6, '0')
FROM today_tickets, last_real
WHERE t.id = today_tickets.id;
SQL
else
  log "  skipping ticket seed (already enough)"
fi

# --- 6. Money: expense + withdrawal + advance ---------------------------------
ensure_money_row() {
  local label="$1" path="$2" probe_path="$3" body="$4"
  local count
  count=$(api_get "$probe_path" | jq '[.[] | select(.businessDayId == '"$BDAY_ID"')] | length')
  if [[ "$count" -gt 0 ]]; then
    log "  $label already has $count rows for today, skipping"
    return
  fi
  api_post "$path" "$body" >/dev/null
  log "  $label created"
}

log "ensuring expense / withdrawal / advance for today"
ensure_money_row "expense" "/api/v1/expenses" \
  "/api/v1/expenses?from=$SEED_DATE&to=$SEED_DATE" \
  "$(jq -nc --argjson b "$BDAY_ID" --argjson s "$MAT_SHIFT_ID" --arg d "$SEED_DATE" \
      '{businessDayId:$b,shiftId:$s,expenseDate:$d,category:"CFE",amount:850.00,description:"Recibo de luz"}')"

ensure_money_row "withdrawal" "/api/v1/withdrawals" \
  "/api/v1/withdrawals?from=$SEED_DATE&to=$SEED_DATE" \
  "$(jq -nc --argjson b "$BDAY_ID" --argjson s "$MAT_SHIFT_ID" --arg d "$SEED_DATE" \
      '{businessDayId:$b,shiftId:$s,withdrawalDate:$d,amount:500.00,reason:"Cambio para caja"}')"

ensure_money_row "advance" "/api/v1/employee-advances" \
  "/api/v1/employee-advances?from=$SEED_DATE&to=$SEED_DATE" \
  "$(jq -nc --argjson b "$BDAY_ID" --argjson s "$MAT_SHIFT_ID" --argjson e "${EMP_IDS[0]}" --arg d "$SEED_DATE" \
      '{businessDayId:$b,shiftId:$s,employeeId:$e,advanceDate:$d,amount:200.00,reason:"Adelanto solicitado"}')"

# --- 7. Cash count + close MATUTINO -------------------------------------------
MAT_STATUS=$(api_get "/api/v1/shifts?business_day_id=$BDAY_ID" \
  | jq -r 'first(.[] | select(.shiftType == "MATUTINO")) | .status')
if [[ "$MAT_STATUS" == "OPEN" ]]; then
  log "computing expected cash for MATUTINO close"
  SUMMARY=$(api_get "/api/v1/shifts/$MAT_SHIFT_ID/close-summary")
  EXPECTED=$(jq -r '.expectedCash // .expected_cash // 0' <<<"$SUMMARY")
  log "  expected cash: $EXPECTED MXN"

  # Cover expected with bills + a little change so morralla isn't zero.
  CASH_BODY=$(jq -nc --argjson s "$MAT_SHIFT_ID" \
    '{shiftId:$s, currency:"MXN",
      bills500: 2, bills200: 4, bills100: 5, bills50: 4, bills20: 5,
      coins10: 2, coins5: 4, coins1: 5,
      morrallaTotal: 0.00}')
  CC_RESP=$(api_post "/api/v1/cash-counts" "$CASH_BODY")
  CC_ID=$(jq -er '.id' <<<"$CC_RESP")
  log "  cash count id=$CC_ID created"

  api_post "/api/v1/shifts/$MAT_SHIFT_ID/close" \
    "$(jq -nc --argjson c "$CC_ID" '{cashCountId:$c, closingReason:"Cierre demo seed"}')" >/dev/null
  log "  MATUTINO shift closed"
else
  log "MATUTINO already $MAT_STATUS, skipping cash count + close"
fi

# --- 8. Inventory: realistic prices + initial stock --------------------------
log "ensuring inventory has realistic prices + stock"
PRODUCTS=$(api_get "/api/v1/products?active=true")

set_price_if_zero() {
  local sku="$1" price="$2"
  local id cur
  id=$(jq -r "first(.[] | select(.sku == \"$sku\")) | .id // empty" <<<"$PRODUCTS")
  [[ -z "$id" ]] && return
  cur=$(jq -r "first(.[] | select(.sku == \"$sku\")) | .currentUnitPrice" <<<"$PRODUCTS")
  if [[ "$cur" == "0.00" || "$cur" == "0" ]]; then
    api_post "/api/v1/products/$id" "$(jq -nc --argjson p "$price" '{currentUnitPrice:$p}')" >/dev/null 2>&1 \
      || curl -fsS -X PATCH -H "$AUTH" -H 'Content-Type: application/json' \
           -d "$(jq -nc --argjson p "$price" '{currentUnitPrice:$p}')" \
           "$API_URL/api/v1/products/$id" >/dev/null
    log "  set $sku price to \$$price"
  fi
}

set_price_if_zero AROMA 25.00
set_price_if_zero AROMA_PIEL 35.00
set_price_if_zero CARBON_ARPILLA 80.00
set_price_if_zero CARBON_CHICO 40.00
set_price_if_zero CHOCOLATE 25.00
set_price_if_zero CUERO 35.00
set_price_if_zero FILTRO_ASPIRADORA 150.00
set_price_if_zero GLICERINA 45.00
set_price_if_zero PASTA 90.00
set_price_if_zero SHAMPOO 220.00
set_price_if_zero SUERO 40.00
set_price_if_zero TAPETE 80.00

# Stock up products with one initial purchase if quantityOnHand is 0
SNAPSHOT=$(api_get "/api/v1/inventory/snapshot")
stock_if_empty() {
  local sku="$1" qty="$2" unit_cost="$3"
  local id qoh
  id=$(jq -r ".products[] | select(.product.sku == \"$sku\") | .product.id" <<<"$SNAPSHOT")
  [[ -z "$id" ]] && return
  qoh=$(jq -r ".products[] | select(.product.sku == \"$sku\") | .quantityOnHand" <<<"$SNAPSHOT")
  if [[ "$qoh" == "0.00" || "$qoh" == "0" ]]; then
    api_post "/api/v1/inventory/purchases" \
      "$(jq -nc --argjson p "$id" --argjson q "$qty" --argjson c "$unit_cost" \
          '{productId:$p, quantity:$q, unitPrice:$c}')" >/dev/null
    log "  stocked $sku +$qty @ \$$unit_cost"
  fi
}

stock_if_empty AROMA            40 18.00
stock_if_empty AROMA_PIEL       20 22.00
stock_if_empty CARBON_ARPILLA   10 55.00
stock_if_empty CARBON_CHICO     20 28.00
stock_if_empty CHOCOLATE        30 16.00
stock_if_empty CUERO            15 24.00
stock_if_empty FILTRO_ASPIRADORA 4 110.00
stock_if_empty GLICERINA         8 32.00
stock_if_empty PASTA            10 65.00
stock_if_empty SHAMPOO           6 175.00
stock_if_empty SUERO            12 28.00
stock_if_empty TAPETE           25 55.00

# Today's miscelanea sales (only seed if no sales movements exist today)
SALES_TODAY=$(api_get "/api/v1/inventory/snapshot" \
  | jq '[.products[].recentMovements[]? | select(.movementType == "SALE" and (.movementDate | startswith("'"$SEED_DATE"'")))] | length')
if [[ "$SALES_TODAY" -lt 1 ]]; then
  log "seeding today's miscelanea sales"
  sell() {
    local sku="$1" qty="$2"
    local pid; pid=$(jq -r "first(.[] | select(.sku == \"$sku\")) | .id // empty" <<<"$PRODUCTS")
    [[ -z "$pid" ]] && return
    api_post "/api/v1/inventory/sales" \
      "$(jq -nc --argjson p "$pid" --argjson q "$qty" --argjson e "${EMP_IDS[0]}" --argjson s "$MAT_SHIFT_ID" \
          '{productId:$p, quantity:$q, employeeId:$e, shiftId:$s}')" >/dev/null
    log "  sold $qty x $sku"
  }
  sell AROMA 2
  sell CHOCOLATE 3
  sell TAPETE 1
fi

# --- 9. Customers + prepaid package ------------------------------------------
log "ensuring sample customers exist"
EXISTING_CUSTOMERS=$(api_get "/api/v1/customers" | jq 'length')
if [[ "$EXISTING_CUSTOMERS" -lt 3 ]]; then
  for row in \
      'CARLOS MENDOZA|8991234567|Cliente frecuente CHEYENNE blanca' \
      'MARIA HERNANDEZ|8997654321|Paquete prepagado' \
      'JOSE RAMIREZ|8995551122|Trae 2 carros' \
      'LAURA TORRES|8993334455|Cliente nuevo' \
      'PEDRO GUZMAN|8992223344|Empresa - Flotilla'; do
    IFS='|' read -r name phone notes <<<"$row"
    api_post "/api/v1/customers" \
      "$(jq -nc --arg n "$name" --arg p "$phone" --arg note "$notes" \
          '{name:$n, phone:$p, notes:$note}')" >/dev/null
    log "  customer created: $name"
  done
fi

log "ensuring at least one prepaid package for today"
PKG_COUNT=$(api_get "/api/v1/prepaid-packages?business_day_id=$BDAY_ID" | jq 'length')
if [[ "$PKG_COUNT" -lt 1 ]]; then
  api_post "/api/v1/prepaid-packages" \
    "$(jq -nc --argjson b "$BDAY_ID" --argjson s "$MAT_SHIFT_ID" \
        '{businessDayId:$b, shiftId:$s, washesIncluded:5, amount:900.00, currency:"MXN", paymentMethod:"CASH", notes:"Paquete demo seed"}')" >/dev/null
  log "  prepaid package (5 washes / \$900) created"
fi

# --- 10. Attendance for today ------------------------------------------------
log "ensuring attendance records for today"
ATT_TODAY=$(api_get "/api/v1/attendance?date=$SEED_DATE" | jq 'length')
if [[ "$ATT_TODAY" -lt 3 ]]; then
  for eid in "${EMP_IDS[@]:0:4}"; do
    # Idempotency: skip if this employee already has a record today
    exists=$(api_get "/api/v1/attendance?date=$SEED_DATE" \
      | jq "[.[] | select(.employeeId == $eid)] | length")
    [[ "$exists" -gt 0 ]] && continue
    api_post "/api/v1/attendance" \
      "$(jq -nc --argjson e "$eid" --arg d "$SEED_DATE" \
          '{employeeId:$e, workDate:$d, clockIn:($d + "T07:30:00Z"), absence:false}')" >/dev/null
    log "  attendance clocked in: employee $eid"
  done
fi

# --- 11. Payroll period for current week --------------------------------------
log "ensuring payroll period covers current week"
WEEK_START=$(python3 -c "from datetime import date,timedelta;d=date.fromisoformat('$SEED_DATE');print((d-timedelta(days=(d.weekday()+1)%7)).isoformat())" 2>/dev/null \
  || date -v-sun +%Y-%m-%d 2>/dev/null \
  || echo "$SEED_DATE")
PERIODS=$(api_get "/api/v1/payroll/periods?status=OPEN")
HAS_PERIOD=$(jq "[.[] | select(.startDate == \"$WEEK_START\")] | length" <<<"$PERIODS")
if [[ "$HAS_PERIOD" -lt 1 ]]; then
  api_post "/api/v1/payroll/periods" \
    "$(jq -nc --arg d "$WEEK_START" '{startDate:$d}')" >/dev/null \
    && log "  payroll period opened (Dom $WEEK_START)" \
    || log "  payroll period create skipped (likely conflicts with existing)"
else
  log "  payroll period for week of $WEEK_START already open"
fi

# --- 12. Trigger AI insights run (best-effort) --------------------------------
log "kicking AI alerts run for the last 7 days (best effort)"
FROM7=$(python3 -c "from datetime import date,timedelta;print((date.fromisoformat('$SEED_DATE')-timedelta(days=7)).isoformat())" 2>/dev/null || echo "$SEED_DATE")
curl -fsS -X POST -H "$AUTH" \
  "$API_URL/api/v1/ai/alerts/run?from=$FROM7&to=$SEED_DATE" >/dev/null 2>&1 \
  && log "  AI alerts run ok" \
  || log "  AI alerts run skipped (provider may be unavailable, not fatal)"

# --- 13. Summary --------------------------------------------------------------
FINAL=$(api_get "/api/v1/reports/daily-summary?date=$SEED_DATE")
CUST_N=$(api_get "/api/v1/customers" | jq 'length')
PKG_N=$(api_get "/api/v1/prepaid-packages?business_day_id=$BDAY_ID" | jq 'length')
ATT_N=$(api_get "/api/v1/attendance?date=$SEED_DATE" | jq 'length')
PROD_PRICED=$(api_get "/api/v1/products?active=true" | jq '[.[] | select(.currentUnitPrice > 0)] | length')
log ""
log "=== seed complete for $SEED_DATE ==="
log "business day:  id=$BDAY_ID"
log "MATUTINO:      id=$MAT_SHIFT_ID"
log "VESPERTINO:    id=$VES_SHIFT_ID (left open)"
log "customers:     $CUST_N total"
log "packages:      $PKG_N for today"
log "attendance:    $ATT_N clocked-in today"
log "products:      $PROD_PRICED priced"
log "daily summary:"
jq '{cars: .carsWashed, ticketRevenue, cashRevenue, expensesTotal, inventorySalesRevenue, result, courtesyCount, voidedCount}' <<<"$FINAL" | sed 's/^/[seed]   /'
log ""
log "open the app:  http://localhost:5173   (login: $API_USER / $API_PASS)"
