# Lavadero — Phase 0

This repository contains the Phase 0 skeleton for the Lavadero Operations Platform.

Structure

- /api — Spring Boot 3 backend (Java 21)
- /web — Vite + React 18 + TypeScript frontend
- docker-compose.yml — Postgres database for local development

Local setup

Requirements
- Java 21
- Maven (or use the included mvnw)
- Node 18+ & npm/yarn (for frontend)
- Docker (for Postgres and tests)

Start Postgres:
```bash
docker compose up -d
```

Run backend (in repo root):
```bash
chmod +x ./mvnw
SPRING_PROFILES_ACTIVE=local ./mvnw spring-boot:run
```

Build & run frontend (from `/web`):
```bash
cd web
npm install
npm run dev
```

Health check
- Backend: GET /api/v1/health -> { "status": "ok" }
- Frontend home page calls that endpoint and displays the status.

Phase 1 foundational domain

Backend source lives in `/api`. The Phase 1 modules are:
- `employees`
- `service_types`
- `vehicle_sizes`
- `service_prices`
- `business_days`
- `shifts`

Schema summary

- `employees`: washer/operator catalog. Uses `active=false` for soft delete.
- `service_types`: wash/detail service catalog.
- `vehicle_sizes`: vehicle size catalog used for pricing.
- `service_prices`: effective-dated price rows by service type and vehicle size.
- `business_days`: one operational day per date. Status: `OPEN`, `CLOSED`, `LOCKED`.
- `shifts`: one `MATUTINO` or `VESPERTINO` shift per business day.

All Phase 1 domain tables include `tenant_id BIGINT NOT NULL DEFAULT 1`, `created_at`, and `updated_at`.

Validation rules

- Employee `fullName` is required, max 120 chars. `phone` max 40 chars.
- Service type `code` is required, max 40 chars, uppercase `A-Z`, numbers, or `_`. `name` is required, max 120 chars.
- Vehicle size `code` follows the same rule as service type. `name` is required. `sortOrder` must be >= 0.
- Service price requires `serviceTypeId`, `vehicleSizeId`, `amount > 0`, `effectiveFrom`, optional `effectiveTo`, and 3-letter uppercase currency. Effective ranges cannot overlap for the same service type and vehicle size.
- Business day open request requires `businessDate`.
- Shift open request requires `businessDayId` and `shiftType`; the business day must be `OPEN`.

Endpoint examples

```bash
# Employees
curl -X POST localhost:8080/api/v1/employees \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Juan Perez","phone":"899-555-0100"}'

curl localhost:8080/api/v1/employees?active=true
curl localhost:8080/api/v1/employees/1

curl -X PATCH localhost:8080/api/v1/employees/1 \
  -H 'Content-Type: application/json' \
  -d '{"phone":"899-555-0101"}'

curl -X DELETE localhost:8080/api/v1/employees/1

# Service types
curl -X POST localhost:8080/api/v1/service-types \
  -H 'Content-Type: application/json' \
  -d '{"code":"LAVADO_BASICO","name":"Lavado basico","description":"Lavado exterior basico"}'

curl localhost:8080/api/v1/service-types

# Vehicle sizes
curl -X POST localhost:8080/api/v1/vehicle-sizes \
  -H 'Content-Type: application/json' \
  -d '{"code":"MEDIANO","name":"Mediano","sortOrder":1}'

curl localhost:8080/api/v1/vehicle-sizes

# Service prices
curl -X POST localhost:8080/api/v1/service-prices \
  -H 'Content-Type: application/json' \
  -d '{"serviceTypeId":1,"vehicleSizeId":1,"amount":120.00,"currency":"MXN","effectiveFrom":"2026-05-01"}'

curl localhost:8080/api/v1/service-prices?effective_on=2026-05-02

# Business days
curl -X POST localhost:8080/api/v1/business-days/open \
  -H 'Content-Type: application/json' \
  -d '{"businessDate":"2026-05-02"}'

curl 'localhost:8080/api/v1/business-days?from=2026-05-01&to=2026-05-03'
curl localhost:8080/api/v1/business-days/1

# Shifts
curl -X POST localhost:8080/api/v1/shifts/open \
  -H 'Content-Type: application/json' \
  -d '{"businessDayId":1,"shiftType":"MATUTINO"}'

curl 'localhost:8080/api/v1/shifts?business_day_id=1'
```

How to test each module

```bash
cd api
mvn test
```

The integration tests start PostgreSQL with Testcontainers, run Flyway migrations, and call the REST endpoints through MockMvc.

Manual test checklist

1. Start Postgres with `docker compose up -d`.
2. Run the backend from `/api` with `mvn spring-boot:run`.
3. Create employees.
4. Create service types.
5. Create vehicle sizes.
6. Create service prices.
7. Open today’s business day.
8. Open the `MATUTINO` shift.
9. Confirm data appears in Postgres:

```bash
docker exec -it lavadero-postgres psql -U lavadero -d lavadero
\dt
select * from employees;
select * from service_types;
select * from vehicle_sizes;
select * from service_prices;
select * from business_days;
select * from shifts;
```

Phase 2 ticket MVP

Tickets are the first operational workflow. A ticket belongs to one business day and one shift, references a service type and vehicle size, snapshots the backend-calculated price, and can be assigned to one or more lavadores.

Schema summary

- `tickets`
  - `business_day_id`, `shift_id`
  - `service_type_id`, `vehicle_size_id`
  - `daily_seq`: server-assigned sequence unique per business day
  - `nota_number`: server-assigned v1 receipt number, e.g. `20260701-0001`
  - `price_amount`, `currency`: price snapshot; voided tickets stay stored but should not count as revenue
  - `courtesy`, `courtesy_reason`
  - `status`: `ACTIVE` or `VOIDED`
  - `void_reason`, `voided_at`
- `ticket_assignments`
  - `ticket_id`
  - `employee_id`
  - `share_pct`

Validation and business rules

- Ticket creation requires `businessDayId`, `shiftId`, `serviceTypeId`, `vehicleSizeId`, `currency`, and at least one `employeeId`.
- `currency` must be `MXN` or `USD`.
- `businessDayId` must be `OPEN`.
- `shiftId` must belong to the same business day and must be `OPEN`.
- Non-courtesy ticket price is calculated by the backend from `service_prices` using service type, vehicle size, currency, and business date.
- Ticket stores snapshot `priceAmount` and `currency`.
- Courtesy tickets get `priceAmount=0.00` and require `courtesyReason`.
- Multiple lavadores are supported through `ticket_assignments`.
- When multiple employees are selected, `sharePct` defaults to an equal split. Remainder cents go to the last assignment, e.g. `33.33`, `33.33`, `33.34`.
- Duplicate employee IDs are rejected.
- Inactive employees are rejected.
- `PATCH /api/v1/tickets/{id}` is allowed only while the ticket’s shift is `OPEN`.
- `POST /api/v1/tickets/{id}/void` keeps the ticket row and requires a reason.
- Default ticket list returns only `ACTIVE` tickets. Use `status=VOIDED` to inspect voided tickets.

Ticket endpoint examples

```bash
# Create a normal ticket. Backend calculates price.
curl -X POST localhost:8080/api/v1/tickets \
  -H 'Content-Type: application/json' \
  -d '{
    "businessDayId": 1,
    "shiftId": 1,
    "serviceTypeId": 1,
    "vehicleSizeId": 1,
    "currency": "MXN",
    "vehicleDescription": "Tsuru rojo",
    "courtesy": false,
    "employeeIds": [1, 2]
  }'

# Example response
{
  "id": 1,
  "businessDayId": 1,
  "shiftId": 1,
  "serviceTypeId": 1,
  "serviceTypeName": "Lavado basico",
  "vehicleSizeId": 1,
  "vehicleSizeName": "Mediano",
  "dailySeq": 1,
  "notaNumber": "20260701-0001",
  "vehicleDescription": "Tsuru rojo",
  "priceAmount": 120.00,
  "currency": "MXN",
  "courtesy": false,
  "courtesyReason": null,
  "status": "ACTIVE",
  "voidReason": null,
  "voidedAt": null,
  "assignments": [
    {"employeeId": 1, "employeeName": "Juan Perez", "sharePct": 50.00},
    {"employeeId": 2, "employeeName": "Luis Lopez", "sharePct": 50.00}
  ]
}

# Create a courtesy ticket
curl -X POST localhost:8080/api/v1/tickets \
  -H 'Content-Type: application/json' \
  -d '{
    "businessDayId": 1,
    "shiftId": 1,
    "serviceTypeId": 1,
    "vehicleSizeId": 1,
    "currency": "MXN",
    "vehicleDescription": "Camioneta blanca",
    "courtesy": true,
    "courtesyReason": "Cliente dueno",
    "employeeIds": [1]
  }'

# List active tickets by business day / shift
curl 'localhost:8080/api/v1/tickets?business_day_id=1&shift_id=1'

# Filter by employee
curl 'localhost:8080/api/v1/tickets?employee_id=1'

# Inspect voided tickets
curl 'localhost:8080/api/v1/tickets?business_day_id=1&status=VOIDED'

# Get one ticket
curl localhost:8080/api/v1/tickets/1

# Patch an active ticket while shift is open
curl -X PATCH localhost:8080/api/v1/tickets/1 \
  -H 'Content-Type: application/json' \
  -d '{
    "vehicleDescription": "Sentra blanco",
    "employeeIds": [1, 2, 3]
  }'

# Void a ticket
curl -X POST localhost:8080/api/v1/tickets/1/void \
  -H 'Content-Type: application/json' \
  -d '{"reason":"Capturado por error"}'
```

Ticket tests

```bash
cd api
../mvnw test
```

The Phase 2 integration tests cover:

- normal ticket creation
- courtesy ticket reason requirement
- backend price calculation from `service_prices`
- multiple lavadores and default shares
- voided tickets excluded from default ticket lists
- edit rejection after shift close

Phase 3 ticket MVP frontend

The frontend now includes a PC-first operations shell with:

- Dashboard
- Nuevo ticket / POS screen
- Tickets browser
- Ticket detail/edit modal
- Void ticket confirmation dialog
- Catalogos setup screen for owners to create lavadores, services, sizes, prices, business days, and shifts

Frontend stack:

- React + TypeScript + Vite
- React Router
- TanStack Query
- React Hook Form
- Zod
- Tailwind

Run the full app locally:

```bash
# Terminal 1 - backend dependencies
cd /Users/brandonrubio/Desktop/Lavado\ AI\ Script/lavadero-api
docker compose up -d

# Terminal 2 - backend
cd /Users/brandonrubio/Desktop/Lavado\ AI\ Script/lavadero-api/api
SPRING_PROFILES_ACTIVE=local ../mvnw spring-boot:run

# Terminal 3 - frontend
cd /Users/brandonrubio/Desktop/Lavado\ AI\ Script/lavadero-api/web
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

Before testing tickets from the UI, open `Catalogos` and create the minimum setup data: lavadores, services, sizes, prices, today’s business day, and a shift.

Manual UI test checklist:

1. Open `http://localhost:5173`.
2. Go to `Nuevo ticket`.
3. Create a normal ticket with one lavador.
4. Create another ticket with multiple lavadores.
5. Create a courtesy ticket and confirm the form requires a reason.
6. Go to `Tickets` and verify the ticket appears in the browser.
7. Open the ticket detail modal and edit the vehicle description.
8. Void a ticket and confirm it moves from `Activos` to `Cancelados`.
9. Ask cousin to review layout.

Frontend build:

```bash
cd web
npm run build
```

Phase 4 daily dashboard v1

The backend exposes a daily summary endpoint for the dashboard:

```bash
curl 'localhost:8080/api/v1/reports/daily-summary?date=2026-03-01'
```

Response fields:

- `date`
- `carsWashed`
- `ticketRevenue`
- `expensesTotal`
- `result`
- `courtesyCount`
- `voidedCount`
- `recentTickets`
- `cashVariance`

Rules:

- Voided tickets do not count toward `carsWashed` or `ticketRevenue`.
- Courtesy tickets count in `courtesyCount` but contribute `0` revenue.
- `expensesTotal` is `0.00` until the expenses module exists.
- `cashVariance` is `null` until shift close/cash count exists.
- `recentTickets` returns the latest tickets for the selected date.

Dashboard UI:

- Shows `Ingresos autos`, `Gastos`, `Resultado`, `Carros lavados`, `Cortesias`, and `Tickets anulados`.
- Shows a recent tickets table.
- Shows a clean empty state when a date has no tickets.

Load MARZO.xlsx sample data locally

Use this only for local testing. It imports rows through the API, not through Flyway, so it will not ship sample business data to production.

```bash
# Backend must be running on localhost:8080 first.
python3 scripts/load_marzo_sample.py --limit 25

# Load all parsed March rows instead of the first 25.
python3 scripts/load_marzo_sample.py --limit 0
```

After loading the sample, open the Dashboard and select `2026-03-01`.

Phase 5 expenses, withdrawals, and employee advances

Phase 5 adds the money-out side of the daily operation:

- `expenses`: categorized business expenses.
- `withdrawals`: cash withdrawals from the register.
- `employee_advances`: loans/advances to lavadores.

Common expense categories:

- `CFE`
- `TELMEX`
- `BASURA`
- `NOMINA`
- `MATERIAL`
- `GARRAFON_DE_AGUA`
- `TAXI`
- `COMISION_DEPOSITO`
- `OTHER`

Endpoint examples:

```bash
# Create expense
curl -X POST localhost:8080/api/v1/expenses \
  -H 'Content-Type: application/json' \
  -d '{
    "businessDayId": 1,
    "shiftId": 1,
    "expenseDate": "2026-05-03",
    "category": "MATERIAL",
    "amount": 250.00,
    "description": "Jabon y aromatizante"
  }'

# List expenses by date/category
curl 'localhost:8080/api/v1/expenses?from=2026-05-01&to=2026-05-03'
curl 'localhost:8080/api/v1/expenses?from=2026-05-01&to=2026-05-03&category=CFE'

# Create withdrawal
curl -X POST localhost:8080/api/v1/withdrawals \
  -H 'Content-Type: application/json' \
  -d '{
    "businessDayId": 1,
    "shiftId": 1,
    "withdrawalDate": "2026-05-03",
    "amount": 500.00,
    "reason": "Retiro del dueno"
  }'

curl 'localhost:8080/api/v1/withdrawals?from=2026-05-01&to=2026-05-03'

# Create employee advance
curl -X POST localhost:8080/api/v1/employee-advances \
  -H 'Content-Type: application/json' \
  -d '{
    "businessDayId": 1,
    "shiftId": 1,
    "employeeId": 1,
    "advanceDate": "2026-05-03",
    "amount": 200.00,
    "reason": "Prestamo semanal"
  }'

curl 'localhost:8080/api/v1/employee-advances?from=2026-05-01&to=2026-05-03'
curl 'localhost:8080/api/v1/employee-advances?employee_id=1&from=2026-05-01&to=2026-05-03'
```

Dashboard update:

- `expensesTotal` now includes expenses, withdrawals, and employee advances for the selected date.
- `result = ticketRevenue - expensesTotal`.

Frontend:

- Open `Gastos` from the sidebar.
- Use `Nuevo gasto`, `Nuevo retiro`, and `Nuevo prestamo`.
- Filter tables by date range and expense category.

Phase 6 shift close / corte v1

Phase 6 adds the first real corte flow without inventory. It stores a cash denomination count, calculates expected cash on the backend, saves the final close summary, and closes the shift.

Formula v1:

```text
expected_cash = ticketRevenue - expenses - withdrawals
variance = total_counted - expected_cash
```

Rules:

- `totalCounted` is calculated by the backend from bills, coins, and `morrallaTotal`.
- Voided tickets and courtesy tickets do not count toward `ticketRevenue`.
- Employee advances are not part of the corte formula yet.
- If `variance` is negative, `closingReason` is required.
- Closing a shift sets the shift to `CLOSED`, stores `closedAt`, and blocks normal ticket edits.

Endpoint examples:

```bash
# Create a cash count for a shift
curl -X POST localhost:8080/api/v1/cash-counts \
  -H 'Content-Type: application/json' \
  -d '{
    "shiftId": 1,
    "currency": "MXN",
    "bills1000": 0,
    "bills500": 0,
    "bills200": 0,
    "bills100": 3,
    "bills50": 1,
    "bills20": 2,
    "coins10": 1,
    "coins5": 0,
    "coins2": 0,
    "coins1": 0,
    "coins05": 0,
    "morrallaTotal": 0
  }'

# Read a cash count
curl localhost:8080/api/v1/cash-counts/1

# Preview close summary
curl localhost:8080/api/v1/shifts/1/close-summary

# Close exact match or sobrante
curl -X POST localhost:8080/api/v1/shifts/1/close \
  -H 'Content-Type: application/json' \
  -d '{"cashCountId": 1}'

# Close faltante with required reason
curl -X POST localhost:8080/api/v1/shifts/1/close \
  -H 'Content-Type: application/json' \
  -d '{
    "cashCountId": 1,
    "closingReason": "Falto cambio en caja"
  }'
```

Frontend:

- Open `Corte` from the sidebar.
- Select the shift.
- Count bills, coins, and morralla.
- Review ingresos, gastos, retiros, esperado, contado, and diferencia.
- If there is faltante, enter the required reason.
- Click `Cerrar turno`.

Manual checklist:

- Exact cash close works.
- Sobrante works without reason.
- Faltante requires reason.
- Closed shift prevents normal ticket edits.
- Dashboard shows `Sobrante/Faltante` after a shift is closed.

Phase 8 payroll MVP

Phase 8 adds weekly payroll. Periods are Sunday to Saturday. The backend computes payroll from ticket assignments, employee advances, employee base weekly salary, and a simple car bonus rate.

Payroll v1 rules:

- Payroll period must start on Sunday; end date is calculated as Saturday.
- Cars washed are computed from `ticket_assignments.share_pct`.
- Example: two lavadores on one ticket each get `0.50` cars.
- Voided tickets do not count.
- Courtesy tickets count as cars washed but not ticket revenue reference.
- `baseWeeklySalary` lives on employees and defaults to `0`.
- `carsBonusRate` defaults to `10.00` MXN per car credit.
- `commissions` and `tipsPoolShare` are stored but default to `0` in v1.
- `netPay = baseSalary + carsBonus + commissions + tipsPoolShare - advancesDeducted`.
- Employee advances create debt ledger `ADVANCE` rows.
- Payroll compute creates `PAYROLL_DEDUCTION` debt ledger rows.
- Locking payroll prevents recompute.

Endpoint examples:

```bash
# Create a weekly payroll period. startDate must be Sunday.
curl -X POST localhost:8080/api/v1/payroll/periods \
  -H 'Content-Type: application/json' \
  -d '{"startDate": "2026-11-01"}'

# List periods
curl localhost:8080/api/v1/payroll/periods
curl 'localhost:8080/api/v1/payroll/periods?status=COMPUTED'

# Get a period with entries and day rows
curl localhost:8080/api/v1/payroll/periods/1

# Compute payroll
curl -X POST localhost:8080/api/v1/payroll/periods/1/compute

# Lock payroll
curl -X POST localhost:8080/api/v1/payroll/periods/1/lock

# Employee debt balance
curl localhost:8080/api/v1/payroll/employees/1/debt-balance

# Optional: set employee base salary from API
curl -X PATCH localhost:8080/api/v1/employees/1 \
  -H 'Content-Type: application/json' \
  -d '{"baseWeeklySalary": 1200.00}'
```

Frontend:

- Open `Nomina` from the sidebar.
- Create a Sunday-start period.
- Click `Recalcular`.
- Review the weekly grid.
- Click a lavador row to see detail and debt balance.
- Click `Bloquear` when the payroll is final.

Open questions before production payroll:

- Exact car bonus rate: fixed per car, tiered, or different by service type?
- Do courtesy cars pay the same car bonus?
- Should ticket revenue affect commission, or is payroll only salary plus car bonus?
- How should tips be captured and split?
- Should employee advances deduct full available gross pay or a fixed weekly amount?
- Should debt ever create negative net pay, or should net pay stop at zero as v1 does?
- Who can unlock a locked payroll period later?
- Should payroll include inactive employees who worked during the period?
- Should USD tickets be converted to MXN for payroll reference?

Manual checklist:

- Create payroll period.
- Compute payroll from ticket assignments.
- Employee advances deduct correctly.
- Debt balance appears.
- Lock payroll.
