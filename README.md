# Turbo Lavado — Operations Platform

A full-stack business operations system built for a family-owned car wash in Reynosa, Mexico. Replaces a legacy paper + Excel workflow with a production-deployed web application covering daily ticketing, shift cash management, weekly payroll, inventory, reporting, and an AI command center for the owner.

**Live on AWS** — EC2 + RDS PostgreSQL, deployed via GitHub Actions CI/CD.

---

## The Problem

The business tracked everything manually: handwritten tickets, daily Excel sheets per shift, a separate payroll spreadsheet, and no visibility unless the owner drove to the location. Errors in cash counts had no audit trail. Employee advances were tracked informally and often missed in payroll.

This platform replaces all of it with a role-gated web app the owner can check from his phone.

---

## Architecture Overview

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

**Backend:** Package-by-feature monolith. No Lombok, no MapStruct. DTOs are Java records. `@Transactional` on service methods only. Controllers return DTOs, never entities.

**Frontend:** Single `App.tsx` + route-gated screens. TanStack Query for server state, React Hook Form + Zod for validation. No UI component library — raw Tailwind.

**Auth:** Symmetric HMAC-SHA256 JWT with opaque refresh token rotation. Role hierarchy enforced in Spring Security: `OPERADOR → GERENTE → DUENO`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Java 21 |
| Framework | Spring Boot 3.4.5 |
| Security | Spring Security 6 + OAuth2 Resource Server (JWT) |
| Persistence | Spring Data JPA + PostgreSQL 16 |
| Migrations | Flyway (17 forward-only migrations) |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| State | TanStack Query v5 + React Hook Form + Zod |
| Testing | JUnit 5 + Testcontainers + MockMvc (53 integration tests) |
| Excel Export | Apache POI 5.3 |
| AI | OpenAI-compatible provider + deterministic local fallback |
| Containers | Docker multi-stage builds (api + web) |
| Infra | AWS EC2 t3.micro + RDS db.t3.micro |
| CI/CD | GitHub Actions → GHCR → SSH deploy |

---

## Key Features

### Ticketing & Shift Management
- Tickets capture service type, vehicle size, employee assignments, payment method (cash/card), and optional courtesy flag
- Price is **server-resolved** from an effective-dated service price catalog — client never supplies a price
- Sequential nota number auto-generated per business day (e.g., `20260504-0001`)
- Tickets linked to business days and shifts; edits blocked once a shift is closed
- Void workflow with mandatory reason; voided tickets excluded from all revenue calculations

### Shift Close (Corte)
- Denomination-level cash count (bills + coins + morralla)
- Expected cash formula: `cash revenue − expenses − withdrawals − employee advances`
- Variance (sobrante/faltante) calculated against physical count
- Closing reason required when cash is short; stored permanently in the audit record

### Weekly Payroll
- Sunday–Saturday period with OPEN → COMPUTED → LOCKED lifecycle
- Per-employee breakdown: base salary + cars-washed bonus + advances deducted = net pay
- Employee advances tracked via an append-only **debt ledger** with four entry types: `ADVANCE`, `PAYMENT`, `PAYROLL_DEDUCTION`, `WRITEOFF`
- Recompute is safe and idempotent — debt entries deduplicated by unique index
- Payroll periods can be recomputed until locked

### Inventory
- **No `current_stock` column** — stock is derived from an append-only `product_movements` ledger
- Movement types: purchase, sale, fiado (sold on credit), adjustment (requires reason)
- Full audit trail; adjustments can't be edited, only added

### Customer CRM + Loyalty
- Customer profiles with name, phone, and notes (no vehicle tracking by design)
- Tickets can be attached to customers after creation
- Loyalty passport: every non-courtesy, non-voided wash counts; milestone rewards every 10 washes
- Customer profile endpoint computes total visits, total MXN spend, last visit date, and reward progress live from the ticket ledger

### Reporting
- Daily summary: cars washed, revenue, expenses, cash variance
- Monthly rollup and date-range views
- Employee performance: cars washed and revenue share per employee over any period
- Cash variance report: expected vs counted per shift with reasons
- Historical snapshots: seeded from 2025 + Jan–May 2026 Excel data for trend comparison
- **Excel export** (Apache POI): 8-sheet workbook — Summary, Tickets, Expenses, Withdrawals, Advances, Cortes, Inventory, Payroll

### AI Command Center (owner-only)
- Daily brief in Spanish: sales, cash position, employee highlights, inventory alerts, and action items
- Watchdog alerts: cash variance spikes, unusual expenses, revenue drops, high courtesy/void rates, low inventory
- Analyst chat: free-form business questions over real operational data
- Agent investigations: multi-step reasoning with evidence trail and confidence level
- All AI output stored in `ai_insights` with PENDING → REVIEWED / DISMISSED lifecycle
- **AI is advisory only** — it reads data but never writes to financial or operational tables

---

## Data Model Highlights

```
business_days ──< shifts ──< tickets ──< ticket_assignments >── employees
                                │
                                ├──< expenses
                                ├──< withdrawals
                                └──< employee_advances ──> debt_ledger

payroll_periods ──< payroll_entries >── employees
                ──< payroll_days    >── employees

products ──< product_movements

customers ──< tickets (optional FK, nullable)
```

Every table carries `tenant_id` (default 1) so multi-location is a schema refactor, not a rewrite.

---

## Testing

53 integration tests across 12 test classes, organized by feature phase. All tests use a **single shared Testcontainers PostgreSQL 16 container** — no H2, no mocks at the database layer.

```bash
cd api
./mvnw verify
```

Test phases cover: domain setup, tickets, shift close, payroll, inventory, auth, reports, AI insights, CRM, and a full Excel operation flow simulation.

---

## Running Locally

**Prerequisites:** Java 21, Docker Desktop, Node 18+

```bash
# 1. Start Postgres
docker compose up postgres -d

# 2. Backend (runs on :8080)
cd api
./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# 3. Frontend (runs on :5173, proxies /api/ to :8080)
cd web
npm install && npm run dev
```

Default login: `dueno` / `cambia-esto-123`

API docs at `http://localhost:8080/swagger-ui.html`

---

## Production Deployment

```bash
# One-time infra provisioning
./scripts/provision-aws.sh

# Subsequent deploys happen automatically on push to main via GitHub Actions
# Images published to GHCR, pulled and restarted on EC2
```

Required GitHub secrets: `EC2_HOST`, `EC2_SSH_KEY`

Production env vars (stored in `/opt/lavadero/.env` on EC2, mode 600):

```bash
LAVADERO_JWT_SECRET=<32+ byte hex secret>
LAVADERO_BOOTSTRAP_USERNAME=<admin username>
LAVADERO_BOOTSTRAP_PASSWORD=<strong password>
LAVADERO_AI_ENABLED=true
LAVADERO_AI_API_KEY=<OpenAI key>
LAVADERO_AI_MODEL=gpt-5.5
```

---

## Project Structure

```
lavadero-api/
├── api/                          Spring Boot backend
│   ├── src/main/java/com/lavadero/api/
│   │   ├── ai/                   AI insights, provider abstraction, alert/chat/investigation
│   │   ├── auth/                 Login, refresh, logout, bootstrap user
│   │   ├── cash/                 Cash counts, shift close summaries
│   │   ├── catalog/              Employees, service types, vehicle sizes, service prices
│   │   ├── customers/            CRM, loyalty passport
│   │   ├── inventory/            Products, append-only product movements
│   │   ├── money/                Expenses, withdrawals, employee advances
│   │   ├── operations/           Business days, shifts, tickets, ticket assignments
│   │   ├── payroll/              Periods, entries, days, debt ledger
│   │   ├── reports/              Daily/monthly/historical summaries, Excel export
│   │   └── security/             SecurityConfig, JwtService
│   └── src/main/resources/db/migration/   V1–V17 Flyway migrations
├── web/
│   └── src/App.tsx               Full frontend — all 10 routes, all screens
├── scripts/                      AWS provisioning + EC2 setup
├── docker-compose.yml            Local dev stack
└── docker-compose.prod.yml       Production (RDS-backed)
```

---

## Design Decisions Worth Noting

- **Package-by-feature, not package-by-layer** — bounded contexts are immediately obvious from the directory structure
- **Append-only ledgers for money and inventory** — no UPDATE or DELETE on financial rows; correctness through new entries
- **Effective-dated prices** — service prices have an `effective_from` date; the API picks the most recent price valid on the ticket's business date
- **No denormalized totals** — all aggregates computed live from source ledger tables, keeping historical data consistent even when older records are corrected
- **AI firewall** — AI services are wired to read-only report services and cannot inject writes to any financial table; enforced at the service dependency level, not just in prompt instructions
