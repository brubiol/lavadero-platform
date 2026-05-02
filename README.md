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
