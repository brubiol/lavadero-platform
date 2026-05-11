# CLAUDE.md — Lavadero Operations Platform

Operating manual for Claude Code. Read fully at the start of every session.

---

## Project

**Turbo Lavado** — daily operations system for a single-location car wash in Reynosa, MX (family business). Replaces a legacy Excel + paper workflow. Single-tenant in v1; every table carries `tenant_id` so multi-location is a refactor, not a rewrite.

Owner / sole engineer: Brandon. This is also Brandon's primary portfolio piece for Java backend SE I/II applications — code quality and architecture should reflect senior-flavored engineering.

---

## Repository layout

```
lavadero-api/
├── CLAUDE.md                        ← this file
├── README.md
├── docker-compose.yml               ← local dev: postgres + api + web
├── docker-compose.prod.yml          ← production: api + web (no postgres, uses RDS)
├── .env.prod.example                ← prod env template (never commit real values)
├── scripts/
│   ├── provision-aws.sh             ← one-shot EC2 + RDS provisioning
│   ├── setup-ec2.sh                 ← EC2 user-data (docker install)
│   └── setup-secrets.sh            ← writes /opt/lavadero/.env on EC2
├── api/                             ← Spring Boot 3 / Java 21 backend
│   ├── Dockerfile                   ← multi-stage: maven builder → jre-alpine runtime
│   ├── pom.xml
│   └── src/main/java/com/lavadero/api/
│       ├── auth/                    ← login, refresh, logout, bootstrap user
│       ├── cash/                    ← cash counts, shift close summaries
│       ├── catalog/                 ← employees, service types, vehicle sizes, service prices
│       ├── common/                  ← shared: AuditedEntity, ApiExceptionHandler
│       ├── controller/              ← HealthController
│       ├── dto/                     ← HealthResponse
│       ├── inventory/               ← products, product movements (append-only stock)
│       ├── money/                   ← expenses, withdrawals, employee advances
│       ├── operations/              ← business days, shifts, tickets, ticket assignments
│       ├── payroll/                 ← payroll periods, entries, days, debt ledger
│       ├── reports/                 ← daily/monthly summaries, cash variance, employee perf, exports
│       ├── security/                ← SecurityConfig, JwtAuthFilter
│       └── ApiApplication.java
│   └── src/main/resources/
│       ├── application.yml          ← base config
│       ├── application-local.yml    ← local dev (connects to localhost:5432)
│       ├── application-docker.yml   ← used inside Docker (connects to postgres:5432)
│       ├── application-test.yml     ← Testcontainers
│       └── db/migration/            ← Flyway V1–V11
└── web/                             ← React 18 + TypeScript + Vite + Tailwind CSS
    ├── Dockerfile                   ← multi-stage: node builder → nginx runtime
    ├── nginx.conf                   ← proxies /api/ → api:8080, SPA fallback
    ├── src/
    │   ├── App.tsx                  ← entire frontend in one file (~3,400 lines)
    │   ├── main.tsx
    │   └── styles.css
    └── public/logo.png
```

---

## Tech stack (locked in)

| Layer | Choice |
|---|---|
| Language | Java 21 |
| Framework | Spring Boot 3.4.5 |
| Build | Maven (`./mvnw` from `api/`) |
| Web | Spring Web MVC |
| Security | Spring Security 6 + OAuth2 Resource Server (JWT via `spring-security-oauth2-jose`) |
| Persistence | Spring Data JPA + PostgreSQL 16 |
| Migrations | Flyway (forward-only, V1–V11) |
| Validation | Bean Validation (`@NotNull`, `@Size`, etc.) |
| API docs | Springdoc OpenAPI (`/v3/api-docs`, `/swagger-ui.html`) |
| Excel | Apache POI 5.3 |
| Tests | JUnit 5 + Testcontainers + Spring Boot Test (no H2) |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS (raw, no shadcn/ui) |
| State | TanStack Query v5 + React Hook Form + Zod |
| Dev infra | Docker Compose (postgres + api + web) |
| Prod infra | AWS EC2 t3.micro + RDS db.t3.micro PostgreSQL 16 |
| CI/CD | GitHub Actions → GHCR images → SSH deploy to EC2 |
| Observability | Spring Boot Actuator (`/actuator/health`); Prometheus/Grafana deferred to v2 |

No Lombok. No MapStruct. DTOs are Java records. No Kafka in v1.

---

## Commands

All backend commands run from `lavadero-api/api/`. Docker commands run from `lavadero-api/`.

```bash
# Start local Postgres only
docker compose up postgres -d
docker compose ps

# Start full stack (postgres + api + web) — all in Docker
docker compose up --build -d

# Run backend on host (faster iteration)
cd api
./mvnw spring-boot:run          # profile=local, connects to localhost:5432 on :8080

# Run tests (Testcontainers, pulls postgres image automatically)
./mvnw verify

# Frontend dev server (connects to api via Vite proxy)
cd web
npm install
npm run dev                     # http://localhost:5173

# DB shell
docker exec -it lavadero-postgres psql -U lavadero -d lavadero
\dt
SELECT * FROM flyway_schema_history ORDER BY installed_rank;

# Check API
curl http://localhost:8080/actuator/health
open http://localhost:8080/swagger-ui.html
```

Always run `./mvnw verify` before calling a task done. Fix failing tests — never skip or disable them.

---

## Conventions — ALWAYS

- **Package-by-feature.** New entity belongs in its bounded context package, not a global package.
- **Forward-only Flyway.** Never edit an applied migration. New schema change = `V{N+1}__description.sql`.
- **Every table:** `tenant_id BIGINT NOT NULL DEFAULT 1`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`. Soft-delete with `deleted_at` instead of physical DELETE.
- **`@Transactional` on service methods only.** Never on controllers, never on repositories.
- **Controllers return DTOs, never entities.** Use Java records for DTOs.
- **Bean Validation on request DTOs.** `@NotNull`, `@Size`, `@Positive`, etc.
- **RBAC with `@PreAuthorize`.** Three roles: `OPERADOR < GERENTE < DUENO` (hierarchical — DUENO has all GERENTE permissions).
- **Prices are server-resolved.** Ticket price comes from `service_prices` (effective-dated) and is snapshotted into the ticket row. Never trust a client-supplied price.
- **Money is `BigDecimal`, never `double`.** Currency stored as a separate enum column alongside every amount.
- **Timestamps are `TIMESTAMPTZ` in SQL, `Instant` in Java, UTC throughout.** UI converts to `America/Monterrey` at the edge.
- **Test names:** `should_{behavior}_when_{condition}`. Example: `should_return_404_when_ticket_not_found`.
- **Language rule:** Spanish for UI copy; English for all code identifiers, comments, log messages, exception messages, enum values.
- **No non-ASCII in enum values, table names, or column names.** `DUENO` not `DUEÑO`.

---

## Anti-patterns — NEVER

- **No Kafka, Redis, or microservices in v1.** Synchronous monolith. Kafka + outbox deferred to v2.
- **No `current_stock` column on products.** Stock is derived from the append-only `product_movements` table — this is the audit story.
- **No denormalized totals.** Compute from source ledger tables (`payroll_entries`, `employee_advances`, `debt_ledger`). Premature totals are harder to fix than a slow query.
- **No business logic in controllers.** Controllers: parse → validate → delegate → return.
- **No entities out of controllers.** Always DTOs.
- **No `@Data` from Lombok on JPA entities** — not applicable since we don't use Lombok, but if added later: `@Data` breaks lazy collections via equals/hashCode.
- **No seed data via `CommandLineRunner`.** Reference data in Flyway; user/operational data through the API.
- **No verbose comments.** Names explain themselves. Comment only the non-obvious *why*.
- **No nullable `tenant_id`.** Multi-tenant story is non-negotiable from day 1.
- **No touching unrelated files.** Keep changes surgical. Don't auto-format files you didn't change.

---

## Auth

Spring Security 6 OAuth2 Resource Server with a symmetric HMAC-SHA256 JWT.

- **JWT secret:** `LAVADERO_JWT_SECRET` env var (32-byte minimum, hex).
- **Bootstrap user:** `LAVADERO_BOOTSTRAP_USERNAME` / `LAVADERO_BOOTSTRAP_PASSWORD` / `LAVADERO_BOOTSTRAP_FULL_NAME` — created on first startup if the user doesn't exist.
- **Token endpoints:** `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`.
- **Actuator:** permitted without auth via `EndpointRequest.toAnyEndpoint()` — do not use string matchers for actuator paths; they don't work with Spring Boot's actuator MVC handler.

---

## Flyway migrations

| Version | Description |
|---|---|
| V1 | Baseline (app_users, refresh_tokens) |
| V2 | Phase 1 foundational domain |
| V3 | Ticket MVP |
| V4 | Expenses, withdrawals, advances |
| V5 | Shift close / corte |
| V6 | Payroll MVP |
| V7 | Inventory MVP |
| V8 | Auth hardening |
| V9 | Payment method |
| V10 | historical_daily_snapshots table |
| V11 | Seed: 2025 + Jan–May 2026 historical daily data (493 rows) |

Next migration: `V12__...`

---

## Current status

Everything in v1 is implemented and working.

- ✅ Spring Boot project + Docker Compose
- ✅ Auth (JWT issuance, refresh rotation, Spring Security 6)
- ✅ Catalog: employees, service types, vehicle sizes, service prices (effective-dated)
- ✅ Operations: business days, shifts, tickets, ticket assignments
- ✅ Money: expenses, withdrawals, employee advances
- ✅ Cash: cash counts, shift close summaries
- ✅ Inventory: products, product movements (append-only stock derivation)
- ✅ Payroll: periods, entries, days, debt ledger
- ✅ Reports: daily/monthly summary, cash variance, employee performance, Excel export
- ✅ Historical data seeded (V11): 2025 full year + 2026 Jan 1–May 8
- ✅ Frontend: all 9 routes, all screens, all modals, role-gated nav
- ✅ Docker multi-stage builds (api + web)
- ✅ Docker Compose: local dev (full stack) + production (RDS-backed)
- ✅ GitHub Actions CI/CD: test → GHCR build → SSH deploy
- ✅ AWS provisioning scripts (EC2 + RDS)
- ✅ Integration tests: Phase1–Phase10 + ExcelOperationFlows (Testcontainers)
- ⬜ Custom domain + TLS (Nginx reverse proxy or ACM)
- ⬜ Prometheus + Grafana (v2)
- ⬜ Kafka + outbox pattern (v2)
- ⬜ Multi-tenant / SaaS mode (v2)

---

## Domain glossary

| Spanish | English | Notes |
|---|---|---|
| lavadero | car wash | The business |
| lavador | washer (employee) | Tracked per-ticket via ticket_assignments |
| turno | shift | `MATUTINO` (morning), `VESPERTINO` (afternoon) |
| nota | receipt number | Sequential printed receipt #, e.g. `41703` |
| auto | vehicle / car | Free-text description: "CHEYENNE BLANCO" |
| importe | amount / price | Per-ticket peso (or USD) amount |
| cortesia | courtesy / comp | Free wash, requires reason |
| fondo | float / cash fund | Opening cash on hand |
| corte | cash count / cut | End-of-shift denomination breakdown |
| morralla | loose change | Coins counted by total, not per denomination |
| retiro | withdrawal | Mid-shift cash removal |
| gasto | expense | CFE, TELMEX, basura, material, etc. |
| prestamo | employee advance | Cash advance, tracked as debt |
| deuda | debt | Running employee debt balance |
| miscelanea | misc inventory | Aroma, soda, tapetes, etc. |
| fiado | sold on credit | Taken without immediate payment |
| sobrante | surplus | Cash over expected (positive variance) |
| faltante | shortage | Cash under expected (negative variance) |
| nomina | payroll | Weekly, Domingo–Sabado |
| dueno | owner | Role: `DUENO` |
| gerente | manager | Role: `GERENTE` |
| operador | operator / cashier | Role: `OPERADOR` |

---

## Production deployment

```bash
# 1. Provision infra (one-time, from local machine with aws configure done)
./scripts/provision-aws.sh

# 2. Wait ~5 min for RDS, then SSH to EC2
ssh -i lavadero-key.pem ec2-user@<EC2_IP>

# 3. On EC2: write secrets
bash setup-secrets.sh   # creates /opt/lavadero/.env (mode 600)

# 4. Deploy
docker compose -f /opt/lavadero/docker-compose.prod.yml up -d

# Subsequent deploys: GitHub Actions handles it on push to main
# Requires repo secrets: EC2_HOST, EC2_SSH_KEY
# Images: ghcr.io/brubiol/lavadero-platform/api:latest
#         ghcr.io/brubiol/lavadero-platform/web:latest
```

---

## Communication preferences

- Concise. No preamble, no "great question."
- Show diffs, not whole files, when proposing edits to existing code.
- Ask before sweeping refactors. Surgical changes only unless explicitly told.
- Push back on bad ideas with reasoning — don't just comply.
- No emoji in code, commits, or technical responses.
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`. Subject ≤ 72 chars. Body explains why.

---

## Updating this file

Update CLAUDE.md when a new convention applies to every session, an anti-pattern bites in real code, a bounded context is added, or a key architectural decision changes.

Do not update for per-task notes, single-context details, or detailed design changes (those go in commit messages or inline comments).
