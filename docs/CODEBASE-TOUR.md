# Codebase tour

A guided walk through the Turbo Lavado code, in the order you'd want to learn it. Read it with the code open beside it. Every link points to a real file.

**Contents**
1. [The 30-second mental model](#1-the-30-second-mental-model)
2. [Life of a request](#2-life-of-a-request-creating-a-ticket)
3. [The domain, package by package](#3-the-domain-package-by-package)
4. [The money flows](#4-the-money-flows)
5. [Security](#5-security)
6. [The AI subsystem](#6-the-ai-subsystem)
7. [Database and migrations](#7-database-and-migrations)
8. [Frontend](#8-frontend)
9. [Tests](#9-tests)
10. [Build, CI and deploy](#10-build-ci-and-deploy)
11. [Where to start when…](#11-where-to-start-when)

---

## 1. The 30-second mental model

- **One Spring Boot monolith** (`api/`), **one React SPA** (`web/`), **one PostgreSQL database**. They're deployed as Docker containers behind Caddy.
- **Package-by-feature:** each folder under `api/src/main/java/com/lavadero/api/` is a business area (`operations`, `cash`, `payroll`, …) with its own `domain/`, `repository/`, `service/` and `web/` subfolders.
- **Ledgers, not balances.** Money and stock are append-only rows, and every total is computed when it's queried.
- **The server decides prices and permissions.** The client sends IDs, never prices or roles.

```
web (React) ──HTTP/JSON + JWT──► web/ controllers ─► service/ (@Transactional, business rules)
                                                     ─► repository/ (Spring Data JPA) ─► PostgreSQL
                                                     ─► AuditService (who did what)
```

---

## 2. Life of a request: creating a ticket

Follow `POST /api/v1/tickets` end to end. It's the most important write in the system.

1. **Frontend:** `NewTicketScreen` in [`web/src/App.tsx`](../web/src/App.tsx) collects IDs (service type, vehicle size, washers, add-ons) and calls the `api()` helper. That helper attaches `Authorization: Bearer <token>` and transparently refreshes the token on a `401`.
2. **Security:** [`SecurityConfig`](../api/src/main/java/com/lavadero/api/security/SecurityConfig.java) validates the JWT signature.
   - It then **re-loads the user from the database** to confirm they're still active and still hold the role in the token.
   - It checks the rule `POST /api/v1/tickets → OPERADOR`.
3. **Controller:** [`TicketController`](../api/src/main/java/com/lavadero/api/operations/web/TicketController.java) receives a validated `CreateTicketRequest` record from [`TicketDtos`](../api/src/main/java/com/lavadero/api/operations/web/TicketDtos.java) and delegates. There's no logic here.
4. **Service:** `TicketService.create()` in [`TicketService`](../api/src/main/java/com/lavadero/api/operations/service/TicketService.java) does the real work in one transaction:
   - Checks that the business day and shift are open.
   - **Resolves the price** from effective-dated `service_prices`. Courtesy forces it to 0. A prepaid package charges only the size difference, `max(0, catalog − package unit price)`.
   - Allocates the **nota number** as `yyyyMMdd-NNNN` from `max(daily_seq) + 1`. A unique constraint in the database is the safety net if two cashiers save at the same moment.
   - Attaches the washers (`ticket_assignments` with share %) and server-priced add-ons (`ticket_extras`).
   - Writes **audit events**. Courtesies over the daily cap, high discounts and manual price overrides are flagged for the owner.
5. **Response:** the entity is mapped to a response record. Entities never leave the service layer.
6. **Errors:** [`ApiExceptionHandler`](../api/src/main/java/com/lavadero/api/common/web/ApiExceptionHandler.java) maps exceptions to HTTP statuses:

   | Exception | Status |
   |---|---|
   | `EntityNotFoundException` | 404 |
   | `IllegalArgumentException` | 400 |
   | Validation failure | 400 |
   | `BadCredentialsException` | 401 |
   | `DataIntegrityViolationException` | 409 |

Every other write in the app follows this same shape.

---

## 3. The domain, package by package

| Package | What lives there | Key files |
|---|---|---|
| `operations/` | Business days, shifts (`MATUTINO`/`VESPERTINO`), tickets, assignments, add-ons, prepaid redemption | `TicketService`, `ShiftService`, `BusinessDayService` |
| `catalog/` | Employees, service types, vehicle sizes, effective-dated prices, discounts | `domain/`, `service/` |
| `cash/` | Denomination counts and shift close (the *corte*) | [`ShiftCloseService`](../api/src/main/java/com/lavadero/api/cash/service/ShiftCloseService.java), `CashCountService` |
| `money/` | Expenses, withdrawals, employee advances | `ExpenseService`, `WithdrawalService`, `EmployeeAdvanceService` |
| `payroll/` | Weekly periods (Sunday–Saturday), per-car pay, falta penalty, debt ledger | [`PayrollService`](../api/src/main/java/com/lavadero/api/payroll/service/PayrollService.java), [`DebtLedgerService`](../api/src/main/java/com/lavadero/api/payroll/service/DebtLedgerService.java) |
| `inventory/` | Products and the append-only `product_movements` table (stock is derived) | [`InventoryService`](../api/src/main/java/com/lavadero/api/inventory/service/InventoryService.java) |
| `customers/` | CRM, loyalty, car-on-file, prepaid packages | [`CustomerPackageService`](../api/src/main/java/com/lavadero/api/customers/service/CustomerPackageService.java) |
| `attendance/` | Daily attendance codes (falta, clima, descanso, enfermo, permiso) that feed payroll | |
| `reports/` | Daily and monthly summaries, historical merge, Excel export | `DailySummaryService`, `ExcelExportService` |
| `audit/` | The `audit_events` trail written by every sensitive action | [`AuditService`](../api/src/main/java/com/lavadero/api/audit/service/AuditService.java) |
| `oversight/` | Vigilancia: per-user suspicion scores computed from audit events | [`OversightService`](../api/src/main/java/com/lavadero/api/oversight/service/OversightService.java) |
| `corrections/` | Supervised after-the-fact corrections (owner only) | |
| `ai/` | Owner AI: brief, alerts, chat, investigations, forecast, weather and holidays | see section 6 |
| `auth/`, `security/` | Login, refresh tokens, bootstrap users, JWT, URL rules | see section 5 |
| `common/` | `AuditedEntity` base class (`tenant_id`, timestamps) and the global exception handler | |

---

## 4. The money flows

These three are where correctness matters most, so read them closely.

### Shift close (corte)
[`ShiftCloseService`](../api/src/main/java/com/lavadero/api/cash/service/ShiftCloseService.java):

```
expected = cash ticket revenue + prepaid cash + inventory sales + debt repayments
         − expenses − withdrawals − advances
variance = counted − expected
```

If `variance < 0`, a `closingReason` is **required** or the close is rejected. The close writes a `SHIFT_CLOSED` audit event with expected, counted and variance.

### Payroll
`PayrollService.compute()` in [`PayrollService`](../api/src/main/java/com/lavadero/api/payroll/service/PayrollService.java) calculates pay for one weekly period.

- **Commission washers** earn `cars × commissionRate`.
  - Despite its name, `commissionRate` is **pesos per car**, not a percentage.
  - A shared car counts as a fraction for each washer, according to their share.
- **The falta rule:**
  - 2 faltas in the week drop the rate to $15/car.
  - 3 or more drop it to $10/car.
  - The cut applies retroactively to the whole week, and only `falta` counts toward it.
- **Salaried workers** get their base pay plus a per-car productivity bonus.
- Once a period is **locked**, it's final.

### Employee debt
[`DebtLedgerService`](../api/src/main/java/com/lavadero/api/payroll/service/DebtLedgerService.java) is an append-only ledger with four entry types:
- `ADVANCE`
- `PAYMENT`: a cash repayment, which also feeds the corte through `debt_payments`.
- `PAYROLL_DEDUCTION`
- `WRITEOFF`

A washer's balance is the sum of their entries, and it's never stored.

---

## 5. Security

[`SecurityConfig`](../api/src/main/java/com/lavadero/api/security/SecurityConfig.java) and [`JwtService`](../api/src/main/java/com/lavadero/api/security/JwtService.java):

- **The app is stateless.** It acts as an OAuth2 resource server, with HMAC-SHA256 JWTs signed by `LAVADERO_JWT_SECRET`.
- **Access tokens last 8 hours**, a deliberate choice so a whole shift runs without re-login.
- **Refresh tokens:**
  - They last 14 days.
  - They're stored **hashed** in the database.
  - They're **rotated**: every refresh revokes the old token. See [`AuthService`](../api/src/main/java/com/lavadero/api/auth/service/AuthService.java).
- **Authorization is URL plus HTTP-method rules**, all in one place. For example, `POST /tickets` needs `OPERADOR`, while `PATCH /tickets/**` and `/tickets/*/void` need `GERENTE`.
  - Roles nest (`ADMIN > DUENO > GERENTE > OPERADOR`). Each user is granted every authority up to their role.
  - Payroll is gated separately with `PAYROLL_ACCESS`, so a gerente only gets in if the owner enabled it for them.
- **Per-request user check:** the JWT converter re-loads the user on every request, so a deactivated user or a role change takes effect immediately even with a valid token.
- **Actuator** endpoints are open through `EndpointRequest.toAnyEndpoint()`, which is needed for the health checks.

---

## 6. The AI subsystem

Everything lives in `api/src/main/java/com/lavadero/api/ai/` and is available to the **owner only** (`/api/v1/ai/** → DUENO`).

- **Orchestration:** [`AiInsightService`](../api/src/main/java/com/lavadero/api/ai/service/AiInsightService.java) runs four features: the daily brief, watchdog alerts, chat and deep investigation.
  - Each feature calls `aiProvider.completeWithTools(request, tools, maxIterations)`, a bounded tool-calling loop.
  - Every result is saved as an `ai_insights` row for audit and review status.
- **Tools:** [`AiToolRegistry`](../api/src/main/java/com/lavadero/api/ai/tools/AiToolRegistry.java) holds 10 **read-only** tools:
  - daily, monthly and range summaries
  - cash variance
  - employee performance and the employee list
  - debt balance
  - inventory snapshot
  - historical range
  - oversight patterns

  Tools register by presence: any `@Component` that implements `AiTool` is exposed to the model.
- **Providers:**
  - [`ConfiguredAiProvider`](../api/src/main/java/com/lavadero/api/ai/provider/ConfiguredAiProvider.java) calls an OpenAI-compatible HTTP API.
  - [`DeterministicAiProvider`](../api/src/main/java/com/lavadero/api/ai/provider/DeterministicAiProvider.java) is a template-based fallback used when AI is disabled, has no key or fails. Tests and CI never call a real LLM.
- **Extras:** `forecast/`, `weather/` and `calendar/` (holidays) feed demand forecasting.

---

## 7. Database and migrations

- **Migrations:** Flyway files are in [`api/src/main/resources/db/migration/`](../api/src/main/resources/db/migration/), versions V1–V62 (some numbers are intentionally skipped).
  - **Never edit an applied migration.** Add `V63__...` instead.
- **Every table** has `tenant_id NOT NULL DEFAULT 1`, `created_at`, `updated_at` and soft-delete via `deleted_at`. The shared columns come from [`AuditedEntity`](../api/src/main/java/com/lavadero/api/common/domain/AuditedEntity.java).
- **Seeded data:**
  - V10–V11: historical daily snapshots, 493 days from the owner's spreadsheets.
  - V12–V14: operational seed data.
  - Reference data lives in migrations, not in startup code.
- **Database shell:** `docker exec -it lavadero-postgres psql -U lavadero -d lavadero`.

---

## 8. Frontend

`web/src/` holds the frontend:

- [`App.tsx`](../web/src/App.tsx) (about 14k lines) contains the router, every screen, the `api()` fetch helper and the auth context.
  - Tokens are stored in `localStorage`.
  - On a `401`, the helper calls `/auth/refresh` once and retries the request.
- [`components/ui.tsx`](../web/src/components/ui.tsx) has the design-system primitives (buttons, fields, cards, skeletons). [`components/layout.tsx`](../web/src/components/layout.tsx) has the shell and the **role-gated nav**, where each item lists its roles.
- **Libraries:** TanStack Query for server state; React Hook Form + Zod for forms.
- **Development:** `npm run dev` serves on `:5173` and proxies `/api` to `:8080`. In Docker, Nginx serves the build and proxies `/api/` to the API container ([`nginx.conf`](../web/nginx.conf)).

---

## 9. Tests

- **Backend integration tests** extend [`AbstractIntegrationTest`](../api/src/test/java/com/lavadero/api/AbstractIntegrationTest.java). It starts **one real PostgreSQL 16 container** per JVM, and Spring's context cache reuses the application context across test classes.
  - Most tests run with auth **disabled** to focus on business logic.
  - [`RbacSecurityIntegrationTest`](../api/src/test/java/com/lavadero/api/RbacSecurityIntegrationTest.java) turns auth on and uses real JWTs to test the role rules.
  - The test classes are organized by phase (`Phase2TicketIntegrationTest`, `Phase6ShiftCloseIntegrationTest`, …). Names follow `should_{behavior}_when_{condition}`.
  - [`ExcelOperationFlowsIntegrationTest`](../api/src/test/java/com/lavadero/api/ExcelOperationFlowsIntegrationTest.java) simulates a full business day over HTTP, then opens the exported `.xlsx` and checks its totals against the report endpoint.
- **End-to-end:** the Playwright specs are in [`web/tests/e2e/`](../web/tests/e2e/). Always run them through `./scripts/e2e.sh`, which uses an isolated stack on ports 5433/8090 so test data never pollutes the dev database.

```bash
./mvnw -f api/pom.xml verify     # backend
./scripts/e2e.sh                 # e2e
```

---

## 10. Build, CI and deploy

- **Docker images:** both use multi-stage builds. The builder stages run on the CI machine's native architecture, and the images are published for amd64 and arm64.
  - [`api/Dockerfile`](../api/Dockerfile): Maven build, then a JRE runtime.
  - [`web/Dockerfile`](../web/Dockerfile): Node build, then Nginx.
- **CI:** [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) runs backend tests and e2e on every PR. On `main`, it also builds images to GHCR, then deploys over SSH by running [`scripts/deploy-host.sh`](../scripts/deploy-host.sh), which waits for every API container to report healthy.
- **Production:** one free Oracle Cloud ARM VM.
  - A shared Caddy ([`docker-compose.edge.yml`](../docker-compose.edge.yml)) handles HTTPS.
  - Each business runs its own isolated copy ([`docker-compose.prod.yml`](../docker-compose.prod.yml)).
  - The full runbook is in [`DEPLOY.md`](DEPLOY.md).

---

## 11. Where to start when…

| You want to… | Start here |
|---|---|
| Change how a ticket is priced | `TicketService.create()` / `resolvePrice()`, then `service_prices` |
| Change who can do what | `SecurityConfig` URL rules, then `components/layout.tsx` nav roles |
| Change the corte math | `ShiftCloseService`, plus a test in `Phase6ShiftCloseIntegrationTest` |
| Change payroll rules | `PayrollService.compute()`, plus `Phase8PayrollIntegrationTest` |
| Add a table or column | A new `V63__description.sql` migration, then the entity and DTO record |
| Give the AI a new capability | A new read-only `AiTool` `@Component`. Never one that writes. |
| Add a screen | A route in `App.tsx`, plus a nav item with roles in `layout.tsx` |
