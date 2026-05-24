# Turbo Lavado — Operations Platform

A full-stack business operations system built for a family-owned car wash in Reynosa, Mexico. Replaces a legacy paper + Excel workflow with a production-deployed web app covering daily ticketing, shift cash management, weekly payroll, inventory, reporting, an AI command center, and an anti-theft oversight dashboard.

**Live on AWS** — EC2 + RDS PostgreSQL, deployed via GitHub Actions CI/CD on every push to `main`.

> **At a glance**
>
> | | |
> |---|---|
> | **Stack** | Java 21 · Spring Boot 3.4 · PostgreSQL 16 · React 19 · TypeScript |
> | **Code** | 42 Flyway migrations · 139 integration tests · 19 bounded contexts · 146 commits |
> | **Auth** | JWT (HMAC-SHA256) · refresh-token rotation · 3-tier role hierarchy (`OPERADOR < GERENTE < DUEÑO`) |
> | **AI** | Daily brief, watchdog alerts, free-form chat, traceable agent investigations — strictly advisory (read-only) |
> | **Built by** | One engineer, ~3 weeks, real production traffic |

---

## The Problem

The business tracked everything manually: handwritten tickets, daily Excel sheets per shift, a separate payroll spreadsheet, and no visibility unless the owner physically drove to the location. Errors in cash counts had no audit trail. Employee advances were tracked informally and often missed in payroll.

This platform replaces all of it with a role-gated web app the owner can check from his phone — plus an AI layer that flags anomalies the human eye would miss.

---

## Architecture

```
┌─────────────────┐     HTTPS      ┌──────────────────────┐
│  React 19 / TS  │ ─────────────► │  Spring Boot 3.4     │
│  Vite + Tailwind│                │  Java 21 REST API    │
│  TanStack Query │ ◄───────────── │  Spring Security 6   │
└─────────────────┘    JSON / JWT  └──────────┬───────────┘
                                              │ JPA
                                   ┌──────────▼───────────┐
                                   │  PostgreSQL 16 (RDS)  │
                                   │  Flyway migrations    │
                                   └───────────────────────┘
```

**Backend** — Package-by-feature monolith. No Lombok, no MapStruct. DTOs are Java records. `@Transactional` on service methods only. Controllers return DTOs, never entities. Money is `BigDecimal`, currency is a separate enum column on every amount.

**Frontend** — Single `App.tsx` (8k LoC) + a small `components/` set. TanStack Query for server state, React Hook Form + Zod for validation. No UI component library — bespoke design system on raw Tailwind + a small CSS layer of design tokens.

**Auth** — Symmetric HMAC-SHA256 JWT with opaque refresh-token rotation. Role hierarchy enforced in Spring Security: `OPERADOR < GERENTE < DUEÑO`, with `@PreAuthorize` on every endpoint that touches money or correction flows.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Java 21 |
| Framework | Spring Boot 3.4 |
| Security | Spring Security 6 + OAuth2 Resource Server (JWT) |
| Persistence | Spring Data JPA + PostgreSQL 16 |
| Migrations | Flyway (42 forward-only migrations, never edited after applied) |
| Validation | Bean Validation (`@NotNull`, `@DecimalMin`, `@Pattern`) |
| Excel | Apache POI 5.3 (8-sheet workbook exports) |
| AI | OpenAI-compatible provider + deterministic local fallback for tests/CI |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| State | TanStack Query v5 + React Hook Form + Zod |
| Testing | JUnit 5 + Testcontainers + Spring Boot Test (139 tests, real Postgres) |
| Containers | Docker multi-stage builds (Java JRE-alpine runtime, Nginx for web) |
| Infra | AWS EC2 t3.micro + RDS db.t3.micro |
| CI/CD | GitHub Actions → GHCR images → SSH deploy to EC2 |
| Observability | Spring Boot Actuator (`/actuator/health`) |

---

## Key Features

### Ticketing
Tickets capture service, vehicle (auto / camioneta / moto / RAZR / company fleet — grouped by category in the UI), payment method, optional courtesy, and assigned washer(s). Price is **server-resolved** from an effective-dated `service_prices` catalog and snapshotted onto the ticket — clients never supply a price. Sequential nota numbers are generated per business day (e.g., `20260504-0001`). A per-ticket "Cargo extra" field with reason handles the "exceso de lodo" case (extra muddy car) cleanly without abusing price-override.

### Shift Close (Corte)
Denomination-level cash count (bills + coins + morralla). Expected cash formula:
```
cash_revenue + prepaid_cash + inventory_sales + debt_repayments
              − expenses − withdrawals − employee_advances
```
Variance (sobrante/faltante) calculated against the physical count. Closing reason is required when cash is short and stored permanently in the audit record. Shifts close one-way; reopening requires a separate corrections endpoint that logs an audit event.

### Weekly Payroll
Sunday–Saturday period with `OPEN → COMPUTED → LOCKED` lifecycle. Each lavador gets a `payroll_entry` row breaking down:
- base salary (for salaried staff) + cars-washed productivity bonus
- commissions per car (for commission lavadores), with absence-aware rate caps (2 absences caps at $15/car, 3+ caps at $10/car)
- manual adjustments (extra, vales, faltas, puntualidad)
- advances deducted (up to gross pay; residual debt carries forward)
- gross and net pay

Employee debt is an append-only **ledger** with four entry types: `ADVANCE`, `PAYMENT` (cash repayment), `PAYROLL_DEDUCTION`, `WRITEOFF`. Lavadores can repay debt in cash mid-period — payments hit `debt_payments` AND the corte's expected cash so the drawer reconciles.

### Inventory
**No `current_stock` column.** Stock is derived from an append-only `product_movements` ledger. Movement types: `PURCHASE`, `SALE`, `FIADO` (sold on credit), `ADJUSTMENT` (requires reason). Adjustments cannot be edited, only added — every correction is its own auditable row.

### Customer CRM + Loyalty
Customer profiles with name, phone, and notes. Tickets attach to customers after creation (optional FK, nullable). A loyalty passport counts every non-courtesy, non-voided wash and awards a milestone reward every 10 washes. The customer profile endpoint computes total visits, total MXN spend, last visit, and reward progress live from the ticket ledger — no denormalized counters.

### Reporting
- Daily summary (cars washed, revenue by payment method, expenses, cash variance)
- Monthly rollup + arbitrary date-range views
- Employee performance: cars and revenue share per employee over any window
- Cash variance report: expected vs counted per shift with reasons
- Historical snapshots seeded from the owner's 2025–2026 Excel data, enabling year-over-year trend comparisons even though the system only went live in May
- **Excel export** (Apache POI): 8-sheet workbook — Summary, Tickets, Expenses, Withdrawals, Advances, Cortes, Inventory, Payroll

### AI Command Center (owner-only)
- **Daily brief** in Spanish: sales vs recent average, cash position, top employees, inventory alerts, action items
- **Watchdog alerts** computed from real data: cash variance spikes, unusual expenses, revenue drops, high courtesy / void rates, low inventory
- **Analyst chat** ("quick mode"): free-form questions answered with the numbers the AI used, plus suggested follow-ups
- **Agent investigations** ("deep mode"): multi-step reasoning with explicit evidence list and confidence rating (HIGH / MEDIUM / LOW)
- All AI output is stored as `ai_insights` rows with a `NEW → REVIEWED / DISMISSED` lifecycle
- **AI is advisory only** — its services consume read-only report/cash/payroll/inventory services. There is no code path that lets the AI write to a financial table; this is enforced at the dependency-graph level, not just in prompt instructions

### Vigilancia — Anti-Theft Oversight (owner-only)
A separate screen surfaces patterns that humans miss:
- Cortesía concentration by operator
- Void / cancellation streaks
- Fast edits after creation (a common theft pattern)
- Cash shortage trends per shift / per cashier
- Out-of-hours actions

Operators each get a "suspicion score" weighted across these signals, with a configurable alert threshold and an audit-event drill-down per operator.

### Attendance
Daily clock-in / clock-out + absence marking, with optional rest-day premium for full-week attendance. Feeds into payroll (absences cap commission rates).

---

## Data Model Highlights

```
business_days ──< shifts ──< tickets ──< ticket_assignments >── employees
                                │
                                ├──< expenses
                                ├──< withdrawals
                                ├──< employee_advances ──> debt_ledger
                                └──< prepaid_packages

payroll_periods ──< payroll_entries  >── employees
                ──< payroll_days     >── employees
                ──< payroll_adjustments >── employees

employees ──< debt_ledger (ADVANCE | PAYMENT | PAYROLL_DEDUCTION | WRITEOFF)
          ──< debt_payments  (cash repayment journal — also feeds corte)
          ──< attendance_records

products  ──< product_movements (PURCHASE | SALE | FIADO | ADJUSTMENT)

vehicle_sizes (category: AUTO | MOTO | RAZR | PERSONAL) × service_types
        ──< service_prices (effective_from / effective_to)

customers ──< tickets (optional FK, nullable)

audit_events  (every state change on tickets, cash, payroll, inventory,
               + flagged events for the Vigilancia drill-down)
ai_insights   (lifecycle: NEW → REVIEWED / DISMISSED)
```

Every table carries `tenant_id` (default 1) so multi-location is a refactor, not a rewrite.

---

## Engineering Decisions Worth Calling Out

- **Package-by-feature**, not package-by-layer — bounded contexts are immediately visible from the directory tree (`payroll/`, `cash/`, `money/`, `operations/`, …). New entities live in their context, not a global package.
- **Append-only ledgers for money and inventory** — no `UPDATE` or `DELETE` on financial rows. Corrections happen by inserting new entries. Debt balance, current stock, and customer loyalty are computed at query time, never cached as a denormalized column.
- **Effective-dated prices** — service prices carry `effective_from` and an optional `effective_to`. The ticket service picks the row valid on the ticket's business date, not the price valid right now. This keeps historical tickets reproducible when prices change.
- **Forward-only Flyway, no edits ever** — 42 migrations, all numbered, all immutable. Schema changes are always a new file.
- **Role hierarchy with three tiers** — `OPERADOR < GERENTE < DUEÑO`, enforced with `@PreAuthorize` on every controller method that touches money, payroll, audits, or AI. DUEÑO is the only role that can access reports, AI, audit, and Vigilancia.
- **AI firewall by construction** — AI services are wired only to the read-only summary, cash, payroll, inventory, and audit services. There is no `TicketService.create` injected into any AI bean. A future contributor would have to add a dependency to break this, and the dependency graph is small enough to spot.
- **Server-resolved pricing** — clients never POST a price. The backend looks it up. This made the per-ticket "Cargo extra" feature a 30-line change instead of a 200-line refactor.
- **Single-DB, Testcontainers, no H2** — 139 integration tests run against a real PostgreSQL 16 container that boots once per `mvn verify` run. No mocked repositories at the data layer; the tests catch real SQL bugs.

---

## Testing

```bash
cd api
mvn verify
```

139 integration tests across 21 test classes, organized by feature phase (Phase1Domain → Phase15Audit). They share a single Testcontainers PostgreSQL 16 instance via an `AbstractIntegrationTest` base. Phases cover:

- Phase 1: domain setup (business days, shifts)
- Phase 2: tickets (create, edit, void, assignments)
- Phase 4–6: cash flow (expenses, withdrawals, advances, cash count, shift close)
- Phase 7: inventory ledger + fiado
- Phase 8: payroll compute / lock / unlock
- Phase 9: reports + Excel export round-trip
- Phase 10: auth (login, refresh rotation, role enforcement)
- Phase 11: AI insights lifecycle
- Phase 12: prepaid packages + CRM
- Phase 13: small-business readiness (concurrency, edge cases)
- Phase 14: discount math (server-resolved)
- Phase 15: audit event flagging

Plus standalone classes for admin user creation, health endpoint, and an end-to-end `ExcelOperationFlowsIntegrationTest` that simulates a full operational day and reconciles every total against the exported workbook.

---

## Running Locally

**Prerequisites:** Java 21, Docker Desktop, Node 18+

```bash
# 1. Start Postgres
docker compose up postgres -d

# 2. Backend (runs on :8080, profile=local)
cd api
mvn spring-boot:run

# 3. Frontend (runs on :5173, proxies /api/* to :8080)
cd web
npm install
npm run dev
```

Default login: `dueno` / `cambia-esto-123`

- API docs: `http://localhost:8080/swagger-ui.html`
- Web: `http://localhost:5173`

To run the full stack (Postgres + API + web) in Docker instead:
```bash
docker compose up --build -d
```

---

## Production Deployment

```bash
# One-time infra provisioning (creates EC2 + RDS + GHCR access)
./scripts/provision-aws.sh

# All subsequent deploys: just push to main.
# GitHub Actions builds + tests + publishes images to GHCR + SSHes to EC2
# and runs docker compose up -d for a zero-downtime swap.
```

Required GitHub secrets: `EC2_HOST`, `EC2_SSH_KEY`.

Production env vars (stored in `/opt/lavadero/.env` on EC2, mode 600):

```bash
LAVADERO_JWT_SECRET=<32+ byte hex secret>
LAVADERO_BOOTSTRAP_USERNAME=<initial admin username>
LAVADERO_BOOTSTRAP_PASSWORD=<initial admin password>
LAVADERO_BOOTSTRAP_FULL_NAME="Owner Name"

LAVADERO_AI_ENABLED=true
LAVADERO_AI_PROVIDER=openai-compatible
LAVADERO_AI_BASE_URL=https://api.openai.com/v1
LAVADERO_AI_API_KEY=<OpenAI key>
LAVADERO_AI_MODEL=gpt-5.5
LAVADERO_AI_TIMEOUT_SECONDS=20
```

Real API keys never live in the repo or in CI logs — they're written once on the EC2 host via `scripts/setup-secrets.sh`. Without `LAVADERO_AI_API_KEY` the system falls back to a deterministic local provider, so tests and local dev never depend on a real LLM.

---

## Project Structure

```
lavadero-api/
├── api/                                  Spring Boot backend
│   ├── src/main/java/com/lavadero/api/
│   │   ├── ai/                           Owner AI: brief, watchdog, chat,
│   │   │                                 investigation, provider abstraction
│   │   ├── attendance/                   Clock-in / clock-out / absences
│   │   ├── audit/                        Audit events + flagged-event drill-down
│   │   ├── auth/                         Login, refresh rotation, bootstrap
│   │   ├── cash/                         Cash counts, shift close summaries
│   │   ├── catalog/                      Employees, service types,
│   │   │                                 vehicle sizes/categories, prices
│   │   ├── corrections/                  Unlocking + supervised reopening
│   │   ├── customers/                    CRM + loyalty passport
│   │   ├── inventory/                    Products + append-only movements
│   │   ├── money/                        Expenses, withdrawals, advances
│   │   ├── operations/                   Business days, shifts, tickets,
│   │   │                                 ticket assignments, prepaid packages
│   │   ├── oversight/                    Vigilancia — anti-theft patterns
│   │   ├── payroll/                      Periods, entries, days,
│   │   │                                 debt ledger, debt repayments
│   │   ├── reports/                      Daily/monthly/historical summaries,
│   │   │                                 cash variance, Excel export
│   │   └── security/                     SecurityConfig, JwtAuthFilter
│   └── src/main/resources/db/migration/  V1–V42 Flyway migrations
├── web/                                  React 19 + TypeScript frontend
│   ├── src/App.tsx                       All 14 routes, all screens
│   ├── src/components/                   ui.tsx (primitives) + layout.tsx
│   ├── src/styles.css                    Design tokens + utility classes
│   └── tests/e2e/                        Playwright E2E (9 spec files)
├── scripts/                              AWS provisioning + EC2 setup
├── docker-compose.yml                    Local dev (postgres + api + web)
├── docker-compose.prod.yml               Production (RDS-backed)
└── .github/workflows/deploy.yml          Tests + GHCR build + SSH deploy
```

---

## What I'd Show in an Interview

- The **debt ledger** as an example of correct domain modeling — four enum entry types, append-only, balance derived at query time, exposed through a single service with safe recompute semantics. Adds up cleanly across payroll runs even when employees pay in cash mid-period.
- The **AI firewall** as an example of using the type system + DI graph to enforce a security boundary instead of relying on prompt discipline.
- The **Vigilancia screen** as an example of turning a business worry ("are we being stolen from?") into a concrete read-only dashboard backed by ad-hoc SQL aggregations, with a per-actor drill-down into raw audit events.
- The **Excel-export round-trip integration test** (`ExcelOperationFlowsIntegrationTest`) — drives a full simulated business day through the public API, then opens the exported `.xlsx` with Apache POI and asserts every total matches the live report endpoint. Catches the kind of bug spreadsheets used to hide.
