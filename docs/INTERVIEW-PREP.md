# Interview prep: Turbo Lavado

How to learn this project well enough to defend it in a technical interview. Read [CODEBASE-TOUR.md](CODEBASE-TOUR.md) first for the map; this doc covers what you'll be asked about and how to answer.

**How to use it:** cover each answer and say yours out loud first. Then open the linked file and confirm the code says what you said. Interviewers reward "let me show you the line" far more than polished slogans.

---

## 1. Pitches

**30 seconds**
> "I built the operations system for my family's car wash in Reynosa. It replaces paper and Excel for ticketing, cash counts, weekly payroll and inventory. It's a Spring Boot 3 / Java 21 monolith on PostgreSQL with a React front end. The interesting parts are that every money flow is an append-only ledger, prices and permissions are decided on the server, and the cash count at the end of every shift reconciles to the peso. There are 192 integration tests against real Postgres, and it deploys through GitHub Actions to a free Oracle Cloud VM."

**2 minutes:** add one deep example. Use the **corte**: show the expected-cash formula, the required reason when cash is short, and how Vigilancia rolls shortages up per cashier.

**Status, said honestly:** "It's feature-complete and built with the owner against the business's real 2025–2026 records. We're in the go-live phase at the store now." **Never say it's processing real money daily until it is.**

---

## 2. Numbers to know cold

| | |
|---|---|
| Java / Spring Boot | 21 / 3.4 |
| Backend size | about 15.9k lines of Java, 18 packages |
| Frontend size | about 15.3k lines of TypeScript, 16 routes |
| Migrations | Flyway V1–V62 |
| Tests | 192 integration tests in 30 classes (Testcontainers) + 9 Playwright specs |
| Access / refresh token | 8 hours / 14 days |
| Build time | about 5 weeks, May–June 2026 |
| Hosting cost | $0/month |

---

## 3. Architecture questions

**Why a monolith and not microservices?**
One location, one developer, one database, and transactions span tickets, cash and payroll. A modular monolith (package-by-feature) keeps those transactions local and deploys as one unit. The package boundaries are where I'd split it if scale ever demanded, but nothing about one car wash does.

**What does "package-by-feature" buy you?**
Everything about payroll is in `payroll/`. A change touches one folder, and the dependencies between areas are visible in the imports. Compare that with package-by-layer, where one feature is smeared across `controllers/`, `services/` and `repositories/`.

**Why are DTOs records and entities never returned?**
Records are immutable and concise, and they make the API contract explicit. Returning entities leaks the schema, risks lazy-loading exceptions during serialization, and lets clients mass-assign fields.

**Where does `@Transactional` go, and why?**
Only on service methods. A service method is one business operation, so it should be one transaction. Putting it on controllers mixes HTTP with persistence; on repositories, the boundaries end up too small.

**How would you go multi-tenant?**
Every table already has `tenant_id NOT NULL`, but today it's hardcoded to `1` in `AuditedEntity`. There are two paths:
1. **Today's approach:** one isolated deployment per business (its own database and domain) on the same VM. There's zero risk of data leaking between businesses.
2. **Shared database:** resolve the tenant from the JWT, set it per request, and enforce it with a Hibernate filter or Postgres row-level security. That's a query-layer refactor, not a schema rewrite.

I chose (1) for up to 3 businesses because it's simpler and safer, and I'd move to (2) if it became a real SaaS.

---

## 4. Domain and data-modeling questions

**Why append-only ledgers instead of a balance column?**
A balance column can drift and can't explain itself. With a ledger (`DebtLedgerType`: `ADVANCE`, `PAYMENT`, `PAYROLL_DEDUCTION`, `WRITEOFF`), the balance is a `SUM`. Corrections are new rows, so the history is the audit trail. The cost is computing totals at read time, which is trivial at this scale; I'd add a snapshot or materialized view only if it got slow. See [`DebtLedgerService`](../api/src/main/java/com/lavadero/api/payroll/service/DebtLedgerService.java).

**Why is there no `current_stock` column?**
Same reason: stock = the sum of `product_movements` (sale, purchase, adjustment). A count that doesn't match becomes an *adjustment* row with a reason, rather than an overwritten number.

**How are prices handled?**
`service_prices` is effective-dated by service type, vehicle size and currency. The server resolves the price as of the business date and **snapshots** it onto the ticket, so changing the catalog later never rewrites history. Add-ons are server-priced `ticket_extras` rows, so a ticket can always show base → add-ons → total.
- *Follow-up trap:* "So the client can never set a price?" **Honest answer:** there is a `priceOverride` for genuinely special cases. It's always audited, and the Vigilancia score weights it heavily (5 points each). Know that it exists before they find it in [`TicketService`](../api/src/main/java/com/lavadero/api/operations/service/TicketService.java).

**Why `BigDecimal` and a separate currency column?**
`double` can't represent 0.1 exactly, and money errors accumulate. The currency column exists because the store sometimes takes USD; an amount without a currency is ambiguous.

**How do you keep receipt numbers unique?**
`daily_seq = max(daily_seq) + 1` for the business day, with a **unique constraint** on `(tenant_id, business_day_id, daily_seq)` and on `nota_number`. If two cashiers save at the same instant, one insert fails with a 409 instead of creating a duplicate. *Improvement:* catch the conflict and retry, or use a per-day sequence row locked with `SELECT … FOR UPDATE`.

**Walk me through the corte formula.**
```
expected = cash ticket revenue + prepaid cash + inventory sales + debt repayments
         − expenses − withdrawals − advances
```
A negative variance requires a written reason, and the close is audited. When cash debt repayments were added (V40), the formula changed **in the same commit**, so the corte never went out of sync. See [`ShiftCloseService`](../api/src/main/java/com/lavadero/api/cash/service/ShiftCloseService.java).

**How does payroll work?**
Pay is a flat amount **per car**, not a percentage of the sale. The field is called `commissionRate`, which is misleading; know that and say it before they do. A car shared between washers counts as a fraction for each one. Faltas apply a retroactive penalty for the whole week: 2 faltas → $15/car, 3 or more → $10. The owner confirmed this rule is intentional, as a deterrent. Locked periods can't be recomputed. See [`PayrollService`](../api/src/main/java/com/lavadero/api/payroll/service/PayrollService.java).

---

## 5. Security questions

**How does auth work?**
Spring Security 6 as an OAuth2 resource server, with stateless HMAC-SHA256 JWTs. The access token lasts 8 hours. The refresh token is opaque, stored **hashed**, lasts 14 days and is **rotated** on every use, which revokes the old one.

**Where is authorization enforced?**
In one place: URL plus HTTP-method rules in [`SecurityConfig`](../api/src/main/java/com/lavadero/api/security/SecurityConfig.java). For example, `POST /tickets` needs OPERADOR, while `PATCH /tickets/**` or `/void` needs GERENTE.
- *Trap:* older docs said `@PreAuthorize`. **The code has none.** Be ready to compare:
  - **URL rules:** one auditable table of everything, but they can be bypassed if someone adds an endpoint without a rule. `anyRequest().authenticated()` is the fallback.
  - **Method security:** sits next to the code it protects and survives URL changes.
  - A good answer is "I'd add `@PreAuthorize` on sensitive service methods as defense in depth."

**What happens if you fire someone who still has a valid token?**
The JWT converter **re-loads the user from the database on every request** and grants no authorities if the user is inactive or their role changed. Access is revoked on the next request, at the cost of one indexed query per request.

**Weaknesses you should name first:**
- **Tokens live in `localStorage`,** so an XSS bug could steal them. *Fix:* the refresh token in an `HttpOnly`, `SameSite` cookie, with the access token in memory only.
- **The 8-hour access token** is long; it was chosen so a shift never re-logs in. The per-request user check limits the damage.
- **CSRF is disabled.** That's correct for bearer tokens, but it would have to be revisited if auth moved to cookies.

---

## 6. AI questions

**What does the AI do?**
It's owner-only. It writes a daily brief, raises watchdog alerts, answers chat questions and runs multi-step investigations, using an OpenAI-compatible model with a bounded tool-calling loop (a maximum number of iterations per feature). See [`AiInsightService`](../api/src/main/java/com/lavadero/api/ai/service/AiInsightService.java).

**How do you stop it from changing financial data?**
The model can only call the 10 **read-only** tools in [`AiToolRegistry`](../api/src/main/java/com/lavadero/api/ai/tools/AiToolRegistry.java), which wrap report queries. The only row the feature writes is its own `ai_insights` record.
- *Don't overclaim.* The service class does receive services that *have* write methods (`InventoryService`, for example), so the guarantee comes from the tool whitelist, not from the type system.
- *Known risk:* tools register by presence, so any new `AiTool` `@Component` is exposed automatically. *Improvement:* an explicit allowlist, plus a test that fails if any tool can reach a write path.

**What happens when the LLM is down or there's no key?**
`ConfiguredAiProvider` falls back to `DeterministicAiProvider`, which builds template answers from the same data. Tests and CI never call a real LLM.

**How do you avoid hallucinated numbers?**
The answers are built from tool results, and the UI shows the numbers it used. Results are saved as `ai_insights` for review.

---

## 7. Testing questions

**Why Testcontainers instead of H2?**
H2 isn't Postgres. Constraints, `TIMESTAMPTZ`, SQL dialect quirks and Flyway migrations behave differently. One real Postgres 16 container is shared per JVM ([`AbstractIntegrationTest`](../api/src/test/java/com/lavadero/api/AbstractIntegrationTest.java)), and Spring's context cache keeps the suite fast.

**What's your favorite test?**
[`ExcelOperationFlowsIntegrationTest`](../api/src/test/java/com/lavadero/api/ExcelOperationFlowsIntegrationTest.java). It drives a full business day over HTTP, exports the Excel workbook, opens it with Apache POI and checks every total against the live report. That catches the "the spreadsheet disagrees with the screen" class of bug.

**Gaps to admit:**
- Most integration tests run with auth **disabled**. RBAC is covered by one dedicated class, `RbacSecurityIntegrationTest`.
- There are no frontend unit tests; Playwright covers the main flows end to end.
- The e2e suite flakes with many workers on a 16 GB laptop, so I run it with `--workers=2`.

---

## 8. Frontend questions

**Why one 14k-line `App.tsx`?**
Speed while the screens were still changing every day with the owner. **Say it's tech debt before they do.** The plan: split it per route into `screens/`, move the `api()` helper and the auth context into their own modules, and lazy-load routes for a smaller first bundle.

**How do you manage server state?**
TanStack Query (caching, invalidation after mutations) for server state, and React Hook Form + Zod for form validation. There's no global store, because server state *is* the state.

---

## 9. DevOps questions

**How is it deployed?**
GitHub Actions runs backend tests and e2e on every PR. On `main` it also builds multi-arch images (amd64 + arm64) to GHCR, deploys over SSH and gates the deploy on container health checks. Production is a free Oracle Cloud ARM VM: Caddy handles TLS and routing, and each business gets an isolated Postgres + API + web stack. Nightly `pg_dump` backups go off-site.

**Why did you leave AWS?**
The free tier ended and RDS + EC2 started billing. For one store, a managed database isn't worth the cost; I traded it for self-hosted Postgres with tested nightly off-site backups.

**What's the single point of failure?**
The VM. There's no high availability. Recovery is: provision a VM, run the setup scripts, restore the last dump. **Recovery point:** up to 24 hours of data, set by the nightly backup. **Recovery time:** about an hour. For a single car wash that's an acceptable, conscious trade-off.

---

## 10. Behavioral stories (STAR)

Have each one ready in under 90 seconds.

1. **"The drawer is short and nobody knows why."** Ledger-backed corte, required reason when short, Vigilancia trends per cashier.
2. **"The AI must never touch money."** Read-only tool whitelist, not a prompt instruction, plus a deterministic fallback.
3. **"Washers want to repay advances in cash."** V40 added `debt_payments`, and the corte formula changed in the same commit, with tests on both sides.
4. **"Don't lose the history."** 493 days of the owner's spreadsheets seeded, so reports compare across the cutover.
5. **"Copy changes broke 9 e2e tests."** Spanish accents broke the accessible-name selectors. The fix was accent-aware slugs plus stable selectors.
6. **"I assumed pay was a percentage. It wasn't."** I verified the payroll model in code instead of trusting a summary, then showed per-car pay on every ticket.
7. **"Hosting started costing money."** Moved to a $0 single VM with per-business isolation and off-site backups, without changing the app's code.

---

## 11. "What would you do differently?" (have three ready)

1. **Split `App.tsx`** into route modules from the start, and add frontend unit tests for the price math.
2. **Method-level security** (`@PreAuthorize`) on sensitive services as a second layer, plus refresh tokens in `HttpOnly` cookies.
3. **An explicit AI tool allowlist,** plus an architecture test (for example, ArchUnit) proving the AI package can't reach write methods.

## 12. Known bugs to be aware of (fix before demos)

- **Corte says "no day open"** even when the Dashboard shows the day open.
- **The AI screen shows a "misconfigured" banner** when the provider is intentionally `deterministic-local`. `ConfiguredAiProvider` treats that value as unsupported.
- **Vigilancia renders** the "Cortes con faltante / Fuera de horario" cards twice.

---

## 13. Practice drill

1. Explain `TicketService.create()` from memory, then compare with the code.
2. Draw the architecture on paper in under 60 seconds.
3. Write the corte formula and the falta rule from memory.
4. Answer each trap question in sections 4–6 in under 45 seconds.
5. Run `./mvnw -f api/pom.xml verify` and explain what `AbstractIntegrationTest` does while it runs.
