# Turbo Lavado

**A full-stack POS + business-intelligence platform for a real car wash.** Built solo, running in production for a family business in Reynosa, Mexico. Replaces a legacy Excel + paper workflow with a role-gated web app that covers daily ticketing, shift cash management, weekly payroll, inventory, reporting, an owner-only AI command center, and an anti-theft oversight dashboard.

→ **Live demo:** [turbolavado.org](https://turbolavado.org) · log in as 

![Java 21](https://img.shields.io/badge/Java-21-007396) ![Spring Boot 3.4](https://img.shields.io/badge/Spring%20Boot-3.4-6DB33F) ![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-336791) ![React 19](https://img.shields.io/badge/React-19-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6) ![AWS](https://img.shields.io/badge/AWS-EC2%20%2B%20RDS-FF9900)

---

<!-- TODO: drop docs/screenshots/dashboard.png — operator dashboard at start of shift -->
<!-- TODO: drop docs/screenshots/ai-chat.png — owner AI command center mid-conversation -->
<!-- TODO: drop docs/screenshots/vigilancia.png — anti-theft dashboard with red-flag callouts -->
<!-- TODO: drop docs/screenshots/nuevo-ticket.png — ticket-capture form with grouped vehicle dropdown -->

| | |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![AI Command Center](docs/screenshots/ai-chat.png) |
| **Dashboard** — what the cashier sees when a car pulls in: live KPIs, recent tickets, shift status. | **AI Command Center** — owner-only chat grounded in real operational data, with traceable evidence + a watchdog rail of automated alerts. |
| ![Vigilancia](docs/screenshots/vigilancia.png) | ![Nuevo Ticket](docs/screenshots/nuevo-ticket.png) |
| **Vigilancia** — anti-theft dashboard surfacing cortesía concentration, void streaks, cash shortages, and after-hours actions per operator. | **Nuevo Ticket** — capture flow with server-resolved pricing, grouped vehicle types (auto / moto / RAZR / personal), and a dynamic "extra dirty" surcharge. |

---

## What this is

This started as "replace dad's Excel sheet" and grew into a complete operations platform for a one-location car wash. It's live, used daily for real money, and built solo over roughly 3 weeks alongside school. Single-tenant today — but every table carries `tenant_id BIGINT NOT NULL DEFAULT 1`, so going multi-location is a query rewrite, not a schema rewrite.

---

## What this demonstrates

Every claim below points to a real file in the repo. Click any of them to verify.

- **Real production system, not a tutorial clone.** Live URL, RDS-backed PostgreSQL, GitHub Actions CI/CD on every push to `main`, used by an actual business with real cash flowing through it. See [.github/workflows/](.github/workflows/) for the pipeline.

- **Senior-flavored Java/Spring architecture.** Package-by-feature, no Lombok, DTOs are Java records, `@Transactional` on services only, `@PreAuthorize` enforcing a 3-tier role hierarchy. See [api/src/main/java/com/lavadero/api/payroll/service/DebtLedgerService.java](api/src/main/java/com/lavadero/api/payroll/service/DebtLedgerService.java) and [api/src/main/java/com/lavadero/api/cash/service/ShiftCloseService.java](api/src/main/java/com/lavadero/api/cash/service/ShiftCloseService.java).

- **Correct domain modeling for money.** Append-only ledgers for advances, debt, and inventory movements — no `UPDATE` or `DELETE` on financial rows; corrections happen by inserting new entries. Effective-dated service prices snapshotted onto each ticket. Stock is *derived* from movements, never stored. See [api/src/main/java/com/lavadero/api/payroll/domain/DebtLedgerEntry.java](api/src/main/java/com/lavadero/api/payroll/domain/DebtLedgerEntry.java) and [api/src/main/java/com/lavadero/api/inventory/](api/src/main/java/com/lavadero/api/inventory/).

- **Forward-only Flyway, never edited.** 44 migrations, all numbered, all immutable. New schema change = new file. See [api/src/main/resources/db/migration/](api/src/main/resources/db/migration/).

- **Real test discipline.** 139 integration tests across 20 classes, all running against a real PostgreSQL via Testcontainers — no H2, no mocked repositories. See [api/src/test/java/com/lavadero/api/](api/src/test/java/com/lavadero/api/) and especially [ExcelOperationFlowsIntegrationTest.java](api/src/test/java/com/lavadero/api/ExcelOperationFlowsIntegrationTest.java).

- **AI features that aren't gimmicks.** The AI service is wired only to read-only report / cash / payroll / inventory services. There is no code path that lets it write to a financial table — enforced at the DI graph, not in prompt instructions. See [api/src/main/java/com/lavadero/api/ai/service/AiInsightService.java](api/src/main/java/com/lavadero/api/ai/service/AiInsightService.java).

- **Operator-facing UX taken seriously.** Bespoke design system on raw Tailwind (no shadcn). Mobile keyboards correct (`type="tel"`, `inputMode="decimal"`). Shimmer skeletons everywhere data loads. Spanish diacritics + ATS-friendly accessible names. See [web/src/components/ui.tsx](web/src/components/ui.tsx) and [web/src/styles.css](web/src/styles.css).

- **End-to-end ownership.** Wrote the backend, wrote the frontend, wrote the CI/CD, provisioned the AWS infra, sat with the real user, iterated on what hurt. See [scripts/](scripts/).

---

## Stack

| Layer | Choice | Notable detail |
|---|---|---|
| Language | Java 21 | Records for DTOs; no Lombok, no MapStruct |
| Framework | Spring Boot 3.4 + Spring Web MVC | Package-by-feature monolith |
| Security | Spring Security 6 + OAuth2 Resource Server | HMAC-SHA256 JWT, refresh-token rotation, `@PreAuthorize` hierarchy |
| Persistence | Spring Data JPA + PostgreSQL 16 | Append-only ledgers, no denormalized totals |
| Migrations | Flyway | 44 forward-only, never edited |
| Validation | Jakarta Bean Validation | `@NotNull`, `@DecimalMin`, `@Pattern` on every request DTO |
| API docs | Springdoc OpenAPI | `/swagger-ui.html` |
| Excel | Apache POI 5.3 | 8-sheet workbook exports, round-trip tested |
| Tests | JUnit 5 + Testcontainers + Spring Boot Test | Real Postgres, no H2 |
| AI | OpenAI-compatible provider + deterministic local fallback | Tests/CI never depend on a real LLM |
| Frontend | React 19 + TypeScript + Vite + Tailwind | TanStack Query v5, React Hook Form + Zod |
| Containers | Docker multi-stage | `jre-alpine` runtime; Nginx for web |
| Infra | AWS EC2 t3.micro + RDS db.t3.micro | One-shot provisioning scripts in `scripts/` |
| CI/CD | GitHub Actions → GHCR → SSH deploy | Tests, build, push, zero-downtime swap |
| Observability | Spring Boot Actuator | `/actuator/health` |

### By the numbers

- **150 commits** in **~3 weeks** (May 2 → May 23, 2026), solo
- **44 Flyway migrations** (V1 → V44, never edited after applied)
- **139 integration tests** across **20 classes**, all on real Postgres
- **18 bounded contexts** in the API (`ai/`, `attendance/`, `audit/`, `auth/`, `cash/`, `catalog/`, `corrections/`, `customers/`, `inventory/`, `money/`, `operations/`, `oversight/`, `payroll/`, `reports/`, `security/`, …)
- **15 frontend routes**, **9 Playwright e2e specs**
- **~8.1k LoC** in the frontend (single `App.tsx` + small `components/` set)
- **1 live production deployment**, **0 unresolved incidents**

---

## If you have 5 minutes, look at these

The artifacts I'd open first in a code-review interview.

- **[`payroll/service/DebtLedgerService.java`](api/src/main/java/com/lavadero/api/payroll/service/DebtLedgerService.java) + [`payroll/domain/DebtLedgerEntry.java`](api/src/main/java/com/lavadero/api/payroll/domain/DebtLedgerEntry.java)** — the four-enum, append-only debt model (`ADVANCE`, `PAYMENT`, `PAYROLL_DEDUCTION`, `WRITEOFF`). Balance is derived at query time, recompute is idempotent, and lavadores can pay back in cash mid-period without breaking the corte reconciliation.

- **[`ai/service/AiInsightService.java`](api/src/main/java/com/lavadero/api/ai/service/AiInsightService.java)** — the AI firewall by construction. The class only takes read-only summary / cash / payroll / inventory services in its constructor. There is no `TicketRepository` or `ExpenseService` injected. A future contributor would have to add a dependency to break it.

- **[`oversight/service/OversightService.java`](api/src/main/java/com/lavadero/api/oversight/service/OversightService.java) + [`web/src/App.tsx` → `VigilanciaScreen`](web/src/App.tsx)** — the anti-theft pattern dashboard. Business problem ("am I being stolen from?") → SQL aggregation by actor → severity-weighted suspicion score → per-operator drill-down into raw audit events.

- **[`ExcelOperationFlowsIntegrationTest.java`](api/src/test/java/com/lavadero/api/ExcelOperationFlowsIntegrationTest.java)** — end-to-end test that drives a full simulated business day through the public REST API, then opens the generated `.xlsx` with Apache POI and asserts every total matches the live report endpoint. Catches the kind of bug that spreadsheets used to hide.

- **[`cash/service/ShiftCloseService.java`](api/src/main/java/com/lavadero/api/cash/service/ShiftCloseService.java)** — the cash variance formula. `expected = ticket_cash + prepaid_cash + inventory_sales + debt_payments − expenses − withdrawals − advances`. Every term traces back to a ledger row; debt repayments were added in V40 with the cash-variance formula updated in the same commit so corte stays honest.

---

## STAR-format interview talking points

Scripts I can speak to in a behavioral / technical screen. Each ends in a verifiable outcome.

### 1. "Cash kept coming up short and we couldn't explain why"

**Situation.** Pre-app, every shift's cash count was on paper. When the cashier was short, there was no audit trail — just an argument.

**Task.** Build a cash variance system that always knew why the drawer was off.

**Action.** Modeled `shift_close_summaries` with `expected_cash`, `total_counted`, `variance`, and a required `closing_reason` when variance is negative. Backed it with append-only ledgers for every cash event (tickets, expenses, withdrawals, advances). Wired the corte UI to refuse to close a short shift without a typed explanation.

**Result.** Every shortage now has a reason on record, queryable by date / actor. The Vigilancia screen rolls these up per operator so the owner can spot patterns over weeks. See [`ShiftCloseService.java`](api/src/main/java/com/lavadero/api/cash/service/ShiftCloseService.java).

### 2. "The AI should never be able to mutate financial data"

**Situation.** Owner wanted an AI command center: daily brief, anomaly alerts, chat, deep investigations. The risk: an LLM hallucinating a ticket void or a payroll bump.

**Task.** Guarantee — not promise — that the AI can never write to a money-bearing table.

**Action.** Refused the obvious "tell the prompt not to do it" approach. Instead constrained the dependency graph: `AiInsightService` only accepts read-only summary services in its constructor. No `TicketRepository`, no `ExpenseService`, no `PayrollService.create*`. Any future code path that breaks this requires explicit injection of a new dependency — visible in a one-line PR diff.

**Result.** Hard guarantee, type-system-enforced. Trivially auditable. See [`AiInsightService.java`](api/src/main/java/com/lavadero/api/ai/service/AiInsightService.java).

### 3. "Adding cash-payback for préstamos without breaking corte math"

**Situation.** Lavadores receive cash advances (`prestamos`) that are normally deducted from next week's payroll. Owner asked: what if someone wants to pay it back in cash, mid-period?

**Task.** Add the feature without breaking the cash-variance reconciliation at end of shift.

**Action.** Added migration V40 introducing `debt_payments` (the cash side) alongside `debt_ledger.PAYMENT` (the accounting side). Updated `ShiftCloseService.expectedCash` in the same commit to add `debtPaymentsTotal` to the formula. Built the UI on the payroll screen. Wrote integration tests proving a payment increments expected cash *and* drops the lavador's debt balance.

**Result.** Lavadores can repay in cash any time, the corte still ties out to the peso, and the debt balance updates atomically. See migration V40 in [`db/migration/`](api/src/main/resources/db/migration/) and the formula change in [`ShiftCloseService.java`](api/src/main/java/com/lavadero/api/cash/service/ShiftCloseService.java).

### 4. "Replacing the Excel without losing 2024–2025 history"

**Situation.** The business had years of daily numbers in Excel. Going live with an empty database would have killed year-over-year reports.

**Task.** Ship the new system without losing the historical baseline.

**Action.** Built a `historical_daily_snapshots` table (V10), then seeded it from the owner's spreadsheets via Flyway (V11 for 2025 + early 2026, ~493 rows). Wired the reports service to compose live data with seeded history, so any date-range view crosses the cutover seamlessly.

**Result.** Day one in production, the owner could already compare *this Tuesday* to *every previous Tuesday* — which made the rollout feel like an upgrade, not a reset.

### 5. "One CI break cascaded through 9 e2e tests"

**Situation.** Polished Spanish UI copy (`Tamaño`, `Período`, `Categoría`, `Confirmar cancelación`) and the e2e suite went red — Playwright was selecting by accessible name with substring matching, and the renamed labels broke chains.

**Task.** Fix it without giving up the Spanish diacritics or the test coverage.

**Action.** Two changes: (1) made the design-system `slugify` helper diacritic-aware via `NFD` normalization, so `Préstamos → prestamos` slug stays stable; (2) switched ambiguous Playwright lookups from `getByLabel('Vehículo')` (which substring-matched the description field) to `locator('select[name="vehicleSizeId"]')`. Documented the perl-script pitfall (`-CSD` required for UTF-8 reads) that caused two mojibake bugs along the way.

**Result.** Tests green, copy correct, and the slugify change is now a guard rail for future Spanish-accent additions. See [`web/src/components/ui.tsx`](web/src/components/ui.tsx) (slugify).

---

## Try the live app

**URL:** [turbolavado.org](https://turbolavado.org)

**Demo login:** `dueno` / `cambia-esto-123` (DUEÑO role — has access to every screen)

**30-second guided tour:**
1. Land on **Dashboard** — live KPIs for today's tickets, revenue, and shift status.
2. Open **AI** in the sidebar — try the chat (e.g. *"¿cómo fue el día de hoy?"*) and watch the watchdog rail.
3. Open **Vigilancia** — the anti-theft pattern dashboard, with severity-weighted suspicion scores per operator.
4. Open **Nuevo ticket** — note the grouped vehicle dropdown (auto / moto / RAZR / personal), live price preview, and the "Cargo extra" surcharge field.

The deployed system runs the **deterministic AI fallback** for the public demo so it doesn't burn OpenAI tokens. The real production environment uses an OpenAI-compatible LLM. The system is single-instance (one EC2 t3.micro) and recovery is one `docker compose up -d` away — candid engineering reality, not a polished SaaS staging environment.

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

**Backend** — Package-by-feature monolith. DTOs are records, `@Transactional` only on services, controllers return DTOs (never entities). Money is `BigDecimal`; currency is a separate enum column on every amount.

**Frontend** — Single `App.tsx` (8k LoC) plus a small `components/` set. TanStack Query for server state, React Hook Form + Zod for validation. Bespoke design system on raw Tailwind — no UI component library.

**Auth** — HMAC-SHA256 JWT with opaque refresh-token rotation. Three-tier role hierarchy `OPERADOR < GERENTE < DUEÑO`, enforced via `@PreAuthorize` on every controller method that touches money, payroll, audits, or AI.

---

## Run it locally

```bash
docker compose up postgres -d                          # 1. start Postgres
cd api && mvn spring-boot:run                          # 2. backend on :8080
cd web && npm install && npm run dev                   # 3. web on :5173
```

Then visit `http://localhost:5173` and log in as `dueno` / `cambia-esto-123`. API docs at `http://localhost:8080/swagger-ui.html`. For Docker-only setup, AWS provisioning, environment variables, and operational runbooks see [docs/](docs/) and `.env.prod.example`.

---

## Project structure

```
lavadero-api/
├── api/                                  Spring Boot backend
│   ├── src/main/java/com/lavadero/api/   18 bounded-context packages
│   │   ├── ai/                           Owner AI: brief, watchdog, chat, investigation
│   │   ├── attendance/                   Clock-in/out + absence tracking
│   │   ├── audit/                        Audit events + flagged-event drill-down
│   │   ├── auth/                         Login, refresh rotation, bootstrap
│   │   ├── cash/                         Cash counts + shift close summaries
│   │   ├── catalog/                      Employees, services, vehicle taxonomy, prices
│   │   ├── corrections/                  Supervised post-shift corrections
│   │   ├── customers/                    CRM + loyalty passport
│   │   ├── inventory/                    Products + append-only movements
│   │   ├── money/                        Expenses, withdrawals, advances, debt repayments
│   │   ├── operations/                   Business days, shifts, tickets, prepaid packages
│   │   ├── oversight/                    Vigilancia — anti-theft patterns
│   │   ├── payroll/                      Periods, entries, debt ledger
│   │   ├── reports/                      Daily / monthly / historical + Excel export
│   │   └── security/                     SecurityConfig, JwtAuthFilter
│   └── src/main/resources/db/migration/  V1–V44 (forward-only)
├── web/                                  React 19 + TypeScript frontend
│   ├── src/App.tsx                       15 routes, all screens
│   ├── src/components/                   ui.tsx (primitives) + layout.tsx
│   ├── src/styles.css                    Design tokens + utility classes
│   └── tests/e2e/                        9 Playwright specs
├── scripts/                              AWS provisioning + EC2 setup
├── docker-compose.yml                    Local dev (postgres + api + web)
├── docker-compose.prod.yml               Production (RDS-backed)
└── .github/workflows/deploy.yml          Tests → GHCR build → SSH deploy
```

---

## Contact

Built by **Brandon Rubio** — solo engineer · `brandonrubio50@gmail.com` · [github.com/brubiol](https://github.com/brubiol)

Open to backend Java / Spring Boot SE I / II conversations.
