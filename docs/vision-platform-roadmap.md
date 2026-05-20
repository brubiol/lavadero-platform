# Vision Platform & Smart-System Roadmap

Plan for adding multi-camera computer vision (car counting + customer insight), external signals (weather, calendar), and a multi-agent AI layer to Turbo Lavado.

Status: **planning** — no implementation has started. Phase 0 begins on user approval.

---

## Goals

- Authoritative, real-time count of cars in/out using the existing 8-camera Smart PSS Lite system.
- Variance signal between camera-observed cars and operator-created tickets (fraud / training signal).
- Vehicle classification + dwell time + queue length to make per-employee and per-shift analytics real.
- Returning-customer recognition via hashed license plates (privacy-gated).
- External signals (weather, holidays) feeding a forecasting layer for staffing and inventory.
- Multi-agent AI replacing the current single-shot completions, with auditable tool use.

## Non-goals (v1)

- Replacing operator data entry. CV is advisory; tickets remain the source of truth.
- Real-time face recognition or demographic profiling. Not worth the legal/ethical weight at this scale.
- Cloud GPU inference. Bandwidth + cost don't justify it for 8 fixed cameras at one site.
- Dynamic pricing. Out of scope; that's a business decision, not an ML one.

---

## Architecture

```
  Lavadero LAN                                    AWS
  ┌──────────────────────────────────┐            ┌──────────────────────┐
  │ 8× Dahua cams ─RTSP─▶ Edge box   │  HTTPS     │ EC2 (Spring Boot)    │
  │                      Jetson Orin │  signed    │  /api/v1/vision/*    │
  │                      YOLO11 +    ├───────────▶│  /api/v1/agents/*    │
  │                      tracking +  │  events    │                      │
  │                      plate OCR   │  + S3 clips│  RDS Postgres 16     │
  └──────────────────────────────────┘            │  agents → GPT-5.5    │
                                                  └──────────────────────┘
```

### Inference location: edge

Decision: edge box on the lavadero LAN.

- 8 simultaneous RTSP streams to AWS = ~50–100 Mbps sustained → bandwidth + EC2 bill explodes.
- Edge processing keeps raw video on-prem (privacy + compliance posture).
- Survives internet outages — events buffer locally, drain when connectivity returns.
- One-time hardware cost (~$500–800) beats $400+/mo cloud GPU.
- Only structured events and short clips leave the LAN.

### Edge stack

- **OS:** Ubuntu 22.04 LTS on Jetson Orin Nano Super (67 TOPS, ~$500) or NUC + RTX 4060 (~$800).
- **Runtime:** Python 3.12, `ultralytics` (YOLO11n for detection), `bytetrack` (tracking), `opencv-python` (RTSP ingest), `paddleocr` (plate OCR, Phase 5).
- **Buffering:** local SQLite WAL — events persist if EC2 is unreachable, drained by a background worker.
- **Identity:** each edge box registered as a `vision_device` with HMAC shared secret. All events to API are HMAC-signed.

### Backend layout

New Spring Boot packages, following the existing package-by-feature convention:

```
com.lavadero.api/
├── vision/             ← Phase 1 — devices, cameras, vehicle_events, flow service
├── external/           ← Phase 4 — weather + calendar pulls, external_signals table
├── customers/          ← Phase 5 — hashed-plate customer ledger (privacy-gated)
└── agents/             ← Phase 7 — multi-agent runtime + tool registry
```

### Data model

Flyway migrations, forward-only. Every table carries `tenant_id`, `created_at`, `updated_at`.

| Migration | Adds |
|---|---|
| V16 | `vision_devices`, `camera_streams`, `vehicle_events` |
| V17 | `external_signals` |
| V18 | `agent_runs`, `agent_tool_calls`, `agent_tool_registry` |
| V19 *(gated)* | `customers`, `customer_visits` |
| V20 | `forecasts` |

---

## Phases

### Phase 0 — Discovery & hardware prep (1–2 weeks, no code)

- Confirm NVR model and enable RTSP. Document stream URLs for all 8 channels.
- Map FOV on a site diagram. Mark entry tripwire, exit, each service bay.
- Capture a 1-hour reference clip per camera at peak hour and at night (lighting).
- Order edge box. Verify it can reach NVR (LAN) and EC2 (HTTPS).
- Privacy decision with owner: license plate storage yes/no, signage, retention period.

**Exit criteria:** site map, 8 working RTSP URLs, edge box on hand, written privacy decision.

### Phase 1 — Core CV pipeline + car counting MVP (2–3 weeks)

Edge service:
- Multi-camera ingest. Single-vehicle entity even when seen by multiple cameras (spatial + temporal heuristics; ReID embeddings if needed).
- Tripwire/zone logic for entry and exit detection with direction.
- HMAC-signed `POST /api/v1/vision/events` with `{deviceId, eventType, vehicleId, occurredAt, confidence, frameRef}`.

Backend:
- `V16__vision.sql`: `vision_devices`, `camera_streams`, `vehicle_events` (append-only event log, payload JSONB).
- Controller validates HMAC + Bean Validation. Service writes events transactionally. DTOs as records.
- `VehicleFlowService` derives "cars on-site now," "cars served today," peak hour.
- RBAC: ingest uses device token; read endpoints require `GERENTE+`.

Frontend:
- Dashboard widget: today's detected count and ticket variance.
- Live count card on the operator screen.

**Exit criteria:** events created within 2 s of a real entry. Daily totals match a manual count within ±2 on a calibration day.

### Phase 2 — Operational reconciliation (1–2 weeks)

- Nightly job cross-joins `vehicle_events` (entries) with `tickets` for the same `business_day`.
- Variance > threshold (default 3 cars or 5%) → `ai_insights` row of type `OPERATIONS_VARIANCE`, severity `MEDIUM`.
- Per-shift breakdown so the gap maps to a specific turno.
- "Camera variance" widget in the DUENO daily brief.

This is the single highest-business-value signal in the platform once Phase 1 lands.

### Phase 3 — Smarter vision signals (2–3 weeks)

- **Vehicle classification** at the edge (sedan / SUV / pickup / truck). Cross-check ticket `vehicle_size` → `SIZE_MISMATCH` insight on consistent gap.
- **Bay occupancy and dwell time.** Per-bay zones; average minutes per wash; slowest/fastest washer surfaced per shift.
- **Queue length** at entry → "open a third bay" alerts.

### Phase 4 — External signals: weather + calendar (1 week)

- New `external/` module, `external_signals` table (kind, observed_at, payload JSONB).
- Cron pulls OpenWeather One Call API (free tier, 1000 calls/day) for Reynosa MX. Forecast + observed.
- Mexican holiday calendar (static seed or `holidays-mx`).
- AI brief incorporates weather context; forecast model (Phase 6) consumes it.

### Phase 5 — License plate + customer ledger (2–3 weeks, *gated on Phase 0 privacy decision*)

- Edge plate OCR on entry frame (PaddleOCR + plate detector).
- **Store SHA-256(plate + tenant_salt). Never raw plate text.** Hash is enough to recognize returning customers; not reversible to PII.
- `customers` (plate_hash, first_seen, last_seen, visit_count, lifetime_value) + `customer_visits` (links to tickets).
- Backfill via timestamp matching at shift close.
- Owner UI: "VIP arriving — 47th visit, avg ticket $250."
- Mandatory: entrance signage, retention policy in CLAUDE.md, soft-delete path on `customers`.

### Phase 6 — Predictive layer (3–4 weeks)

- **Demand forecast:** daily car count for next 7 days. LightGBM regressor trained nightly. Inputs: `historical_daily_snapshots`, weather forecast, day-of-week, holidays. No deep learning at this scale.
- **Staffing recommendations** from forecast.
- **Inventory exhaustion forecast** from `product_movements` consumption rate × forecasted demand.
- Outputs land in `ai_insights` of type `FORECAST` with severity by deviation magnitude.

### Phase 7 — Multi-agent AI (parallelizable with Phases 3–6)

Replaces the current single-shot completion model in `ai/` with a tool-calling agent runtime.

New package `com.lavadero.api.agents`:

| Agent | Trigger | Tools available | Output |
|---|---|---|---|
| Watchdog | Every 15 min during open hours | reports, vision, money | `ai_insights` (anomalies) |
| Reconciler | Nightly | vision.dailyFlow, tickets.dailySummary | `ai_insights` (variance) |
| Forecaster | Nightly 23:00 CT | history, weather, calendar | `ai_insights` (forecast) |
| Analyst | DUENO chat | All read-only services | Chat reply |
| Investigator | DUENO "look into X" | All read-only services, multi-step | Investigation report |

Implementation:

- `AiTool` interface (`name`, `description`, `inputSchema`, `execute(JsonNode) → JsonNode`). Each tool is a Spring `@Component`. Agents receive a role-filtered tool list.
- OpenAI Chat Completions tool-calling API; `gpt-5.5` handles this natively.
- Hard caps per run: token budget (default 30K), tool-call budget (default 10). Logged in `agent_runs` and `agent_tool_calls`.
- Tools are **read-only**. Any future write tool requires explicit owner confirmation in the UI.
- All write side effects continue to land in `ai_insights` only — the existing audit/advisory invariant is preserved.

---

## Recommended ordering

1. Phase 0 (discovery)
2. Phase 1 (core CV) — biggest unlock
3. Phase 2 (reconciliation) — cheapest, highest business value
4. Phase 7 (multi-agent) — parallel with Phase 3
5. Phase 4 (weather) — small, slot in any time
6. Phase 3 (smarter vision)
7. Phase 6 (forecasting)
8. Phase 5 (plates) — last, gated on privacy decision

## Cost & timeline

| Item | One-time | Monthly |
|---|---|---|
| Edge box (Jetson Orin Nano Super) | $500 | — |
| NVR upgrades if needed | $0–200 | — |
| AWS S3 clip storage | — | $3–10 |
| EC2 ↔ edge bandwidth | — | $5–15 |
| OpenAI GPT-5.5 (multi-agent) | — | $50–150 |
| OpenWeather API | — | $0 (free tier) |
| **Total** | **~$700** | **~$60–175** |

Calendar: ~4–5 months solo for Phases 0–4 + 7 at evening/weekend pace. Phases 5–6 add ~2 months.

---

## Open decisions

1. **Edge vs cloud inference.** Defaulted to edge. Confirm.
2. **License plates yes/no.** Phase 5 gated.
3. **CV signal MVP set.** Defaulted to counts + size mismatch + dwell time. Add/remove.
4. **Camera system confirmation.** Smart PSS Lite / Dahua with RTSP enabled, or does Phase 0 need a discovery task?
5. **Forecast granularity.** Daily counts (simple) vs. per-shift / per-hour (more useful, more work).

---

## Invariants this plan must not break

- AI is advisory. Tools are read-only. No agent ever writes to `tickets`, `expenses`, `payroll`, `inventory`, `prices`, or `users`.
- Every new table has `tenant_id BIGINT NOT NULL DEFAULT 1`, `created_at`, `updated_at`. Soft-delete with `deleted_at`.
- Forward-only Flyway. No edits to applied migrations.
- DTOs are Java records. Controllers return DTOs, not entities.
- Money is `BigDecimal`. Timestamps are `TIMESTAMPTZ` / `Instant` UTC.
- Spanish UI copy, English identifiers. ASCII-only enum values and column names.
- No Kafka, Redis, or microservices in v1. Synchronous monolith stays.
