CLAUDE.md — Lavadero Operations Platform
This file is the project's operating manual for Claude Code. Read it fully every session.


Project
Lavadero Operations Platform — operations system of record for a single-location car wash in Reynosa, MX (family business). Replaces a legacy Excel + paper workflow. Single-tenant in v1, but every table carries tenant_id so multi-location SaaS is a refactor, not a rewrite.

Owner / sole engineer: Brandon (backend + frontend implementation). Cousin handles UI/UX design only — wireframes and Figma, no code.

This is also Brandon's primary portfolio piece for Java backend SE I/II job applications. Code quality and architecture choices should reflect senior-flavored engineering, not student-project shortcuts.


Read these before making decisions
Don't relitigate things already decided. Pull these in when relevant:

@docs/DESIGN.md — system design, bounded contexts, full data model, endpoint list, architectural decisions and their rationale. Read before any architectural change or any new entity / endpoint design.
@docs/SETUP.md — project setup, pom.xml additions, application.yml profiles, Docker Compose, first migration. Read for build / config / environment questions.
@docs/UX_PLAYBOOK.md — frontend / UX direction. Read before working on web/.

If a question is answered in one of these docs, follow the doc. Don't reinvent.


Repository map
lavadero-api/

├── CLAUDE.md                  ← this file

├── README.md                  ← human-facing project intro

├── docker-compose.yml         ← Postgres locally (Kafka in v2)

├── docs/

│   ├── DESIGN.md

│   ├── SETUP.md

│   └── UX_PLAYBOOK.md

├── api/                       ← Spring Boot 3 / Java 21 backend

│   ├── pom.xml

│   ├── src/main/java/com/lavadero/api/

│   │   ├── catalog/           ← service types, vehicle sizes, prices, products, employees

│   │   ├── operations/        ← business day, shifts, tickets, cash, expenses, advances

│   │   ├── inventory/         ← misc product movements, stock derivation

│   │   ├── payroll/           ← weekly periods, entries, debt ledger

│   │   ├── reporting/         ← read-only aggregations / dashboards

│   │   ├── common/            ← cross-cutting: auth, audit, exceptions, tenant context

│   │   └── LavaderoApiApplication.java

│   └── src/main/resources/

│       ├── application.yml, application-local.yml, application-test.yml

│       └── db/migration/      ← Flyway forward-only migrations

└── web/                       ← React 18 + TS + Tailwind + shadcn/ui (added later)

Each bounded-context package is internally split into domain/ (entities), repository/, service/, web/ (controllers + DTOs), mapper/ (MapStruct interfaces). Package-by-feature, not by-layer.


Tech stack (locked-in)
Java 21, Spring Boot 3.x, Maven (use ./mvnw)
Spring Web, Spring Data JPA, Spring Security, Bean Validation
PostgreSQL 16, Flyway (forward-only migrations)
MapStruct (entity↔DTO), Lombok, JJWT (auth), Springdoc OpenAPI
Testcontainers + JUnit 5 + Mockito (test pyramid heavy on integration)
Frontend: React 18 + TypeScript + Vite + Tailwind + shadcn/ui + TanStack Query
Deploy: Docker Compose locally, AWS EC2 + RDS for prod
Observability: Prometheus + Grafana (v2)
Kafka: deferred to v2; v1 is synchronous monolith


Commands
Run from lavadero-api/ unless noted.

Quick start (minimal steps to run locally)
1. Start Postgres (from repository root: lavadero-api/):
   # run these from the repo root (lavadero-api/)
   docker compose up -d
   docker compose ps   # wait until "healthy"

2. Build & validate migrations (from backend folder: lavadero-api/api/):
   # switch to the api/ directory (inside lavadero-api/)
   cd api
   ./mvnw clean compile   # runs Flyway-validate

3. Run the backend (from lavadero-api/api/):
   # still in api/
   ./mvnw spring-boot:run   # runs on :8080, profile = local

4. Verify the app (run from your host machine; no special directory):
   curl localhost:8080/actuator/health   # expect {"status":"UP"}
   open  localhost:8080/swagger-ui.html  # OpenAPI UI

Run (local) — full commands
# From repo root (lavadero-api/)
docker compose up -d
docker compose ps

# Backend (from lavadero-api/api/)
cd api
./mvnw clean compile        # compile + Flyway validate
./mvnw spring-boot:run      # runs on http://localhost:8080 (profile=local)
# Run tests (heavy; uses Testcontainers)
./mvnw verify

# Frontend (optional, from lavadero-api/web/)
cd ../web
npm install
npm run dev                 # Vite dev server, default http://localhost:5173

# Troubleshooting / DB shell (from host)
docker exec -it lavadero-postgres psql -U lavadero -d lavadero
\dt
SELECT * FROM flyway_schema_history;

Always run ./mvnw verify before declaring a task done. If any test fails, fix it — don't disable.


Conventions — ALWAYS
Package-by-feature. A new entity belongs inside its bounded context, not in a global entities/ package.
Forward-only Flyway migrations. Each new migration is V{N}__{description}.sql. Never edit a merged migration. If you need to change a deployed schema, write V{N+1}__alter_X.sql.
Every table gets tenant_id BIGINT NOT NULL + created_at TIMESTAMPTZ + updated_at TIMESTAMPTZ. Soft-delete with deleted_at instead of physical DELETE.
@Transactional lives on service methods. Never on controllers, never on repositories.
Controllers return DTOs, never JPA entities. Use MapStruct for the conversion.
Use Java records for DTOs (public record TicketResponse(Long id, ...)).
Bean Validation on request DTOs. @NotNull, @Size, @Positive, etc.
@PreAuthorize("hasRole('GERENTE')") on controllers/methods that need RBAC. Three roles: OPERADOR, GERENTE, DUENO.
Prices on tickets are server-resolved from service_prices (effective-dated) and snapshotted into the ticket row. Never trust a client-supplied price.
All tickets get an idempotency key. Idempotency-Key header → checked against idempotency_keys table before insert.
Tests use Testcontainers, not H2. Spring Boot 3.1+ @ServiceConnection makes this clean.
Test names use should_{behavior}_when_{condition}. Example: should_return_404_when_ticket_not_found.
Spanish UI copy stays in i18n/ resource bundles; English in code: identifiers, comments, log messages, exception messages, enum values.
Money is BigDecimal, never double. Currency stored alongside as a separate column.
Timestamps are TIMESTAMPTZ in SQL, Instant in Java, UTC throughout. UI converts to America/Monterrey at the edge.


Anti-patterns — NEVER
❌ Don't add Kafka, Redis, or microservices to v1. Synchronous monolith is the chosen architecture. v2 introduces Kafka with the outbox pattern. See @docs/DESIGN.md §4 if tempted.
❌ Don't store current_stock as a column on products. Stock is derived from append-only product_movements. This is the auditability story.
❌ Don't store total_paid / total_advances etc. as columns. Compute from the source ledger tables (payroll_entries, employee_advances, debt_ledger). Premature denormalization is harder to fix than a slow query.
❌ Don't put business logic in controllers. Controllers parse, validate, delegate, return. Logic is in services.
❌ Don't return entities from controllers. Always DTOs.
❌ Don't use @Data from Lombok on JPA entities — generates equals/hashCode that explode on lazy collections. Use @Getter @Setter + custom equals/hashCode on the ID.
❌ Don't write seed data via CommandLineRunner. Reference data goes in Flyway migrations (V{N}__seed_X.sql). User/operational data goes through proper API endpoints.
❌ Don't add verbose comments. Names should explain themselves. Comment only the why, never the what.
❌ Don't downgrade tenant_id to nullable to "simplify" — the multi-tenant story is non-negotiable from day 1.
❌ Don't use ñ or other non-ASCII in enum values, table names, or column names. Display labels in UI can have them; code stays ASCII to avoid encoding pain across tooling.
❌ Don't auto-format/lint changes in unrelated files when touching one file. Keep PRs surgical.


Architectural decisions already made
If you're considering one of these, they're decided — see @docs/DESIGN.md for rationale:

Decision
Choice
Why
Kafka in v1?
No
Sync monolith. Kafka in v2 with outbox pattern.
Auth
In-house JWT (jjwt)
Better portfolio depth than Cognito.
Repo layout
Monorepo (/api, /web)
Single-developer simplicity.
Hosting
EC2 + RDS Postgres
Cheap, fits the AWS bullet on resume.
Photos per ticket
Deferred to v2
Keep v1 small.
Multi-tenant
Yes, single tenant for now
tenant_id on every table.
Pricing model
Effective-dated service_prices
Historical reports stay accurate when prices change.
Inventory model
Append-only product_movements, derived stock
Audit + time-travel queries.
Payroll model
Recomputable projection over operational tables
Source-of-truth is tickets + advances + schedule.



Domain glossary (Spanish — used in DB tables, business logic, and UI copy)
Spanish
English
Notes
lavadero
car wash
The business itself
lavador
washer (employee)
The workers; tracked per-ticket
turno
shift
MATUTINO (morning), VESPERTINO (afternoon)
nota
receipt number
Sequential printed receipt #, e.g. 41703
auto
vehicle / car
Free-text description on ticket: "CHEYENNE BLANCO"
importe
amount / price
Per-ticket peso (or USD) amount
cortesía
courtesy / comp
Free wash, attributed to a reason
fondo
float / cash fund
Opening cash on hand
corte
cash count / cut
End-of-shift denomination breakdown
morralla
loose change
Coins counted in bulk by total amount, not per coin
retiro
withdrawal
Mid-shift cash removed from drawer
gasto
expense
Operating expense (CFE, TELMEX, basura, material...)
préstamo
employee advance
Cash advance to employee, tracked as debt
deuda
debt
Running employee debt balance
miscelánea
misc inventory
Non-wash items: aroma, soda, chocolate, tapetes...
fiado
sold on credit
Inventory item taken without immediate payment
sobrante
surplus
Cash/inventory over expected (positive variance)
faltante
shortage
Cash/inventory under expected (negative variance)
nómina
payroll
Weekly, Domingo–Sábado
descanso
rest day
Scheduled day off
permiso
excused absence
Approved time off
falta
unexcused absence
Did not show up
bono / comisión
bonus / commission
Extra pay (per-car bonus, polish/wax commissions)
dueño
owner
App role: DUENO (ASCII)
gerente
manager
App role: GERENTE
operador
operator / cashier
App role: OPERADOR



Communication preferences
Be concise. Short answers, no preamble, no "great question." Brandon is a senior-leaning engineer who has been doing this work for years.
Show the diff, not the whole file, when proposing edits to existing code.
Ask before sweeping refactors. Surgical changes only unless explicitly told otherwise.
Push back on bad ideas. If Brandon proposes something that contradicts the design docs or seems wrong, say so with reasoning, don't just comply.
No emoji in code, commit messages, or technical responses. Sparingly OK in casual chat reply.
Conventional commits for git messages: feat:, fix:, chore:, refactor:, test:, docs:. Subject ≤ 72 chars. Body explains why.


Current status (update this as the project moves)
✅ Design docs written (docs/DESIGN.md, docs/SETUP.md, docs/UX_PLAYBOOK.md)
⬜ Spring Boot project scaffolded via Initializr per @docs/SETUP.md
⬜ Docker Compose up, V1 migration applied, /actuator/health returning UP
⬜ Auth implementation (users CRUD, BCrypt, JWT issuance, refresh rotation, Spring Security config)
⬜ Catalog bounded context (service types, vehicle sizes, service prices, products, employees)
⬜ Operations bounded context (business day, shifts, tickets)
⬜ Inventory, payroll, reporting bounded contexts
⬜ Excel importer (Spring Shell command, Apache POI) for historical 2021 data
⬜ Frontend scaffold + auth + ticket entry flow
⬜ Deploy to EC2 + RDS
⬜ Prometheus + Grafana
⬜ Kafka + projections (v2)


Keeping this file fresh
Update CLAUDE.md when:

A new convention is added that affects every session
An anti-pattern bites in real code (add it to the NEVER list)
A bounded context is added or renamed (update the repo map)
An architectural decision is made or reversed (update the decisions table)

Don't update CLAUDE.md for:

Per-task notes (use a scratch doc or commit message)
Things only relevant to one bounded context (consider a api/{context}/CLAUDE.md instead)
Detailed design changes (those go in docs/DESIGN.md)
A bounded context is added or renamed (update the repo map)
An architectural decision is made or reversed (update the decisions table)

Don't update CLAUDE.md for:

Per-task notes (use a scratch doc or commit message)
Things only relevant to one bounded context (consider a api/{context}/CLAUDE.md instead)
Detailed design changes (those go in docs/DESIGN.md)

