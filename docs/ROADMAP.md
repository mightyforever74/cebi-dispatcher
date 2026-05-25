# TulipFleet Enterprise — Roadmap

A high-level summary of the architectural and product decisions that govern the TulipFleet Enterprise Dispatcher. Each decision has a detailed Architecture Decision Record (ADR) in [`docs/adr/`](docs/adr/). This roadmap is the index and the executive view.

> **Status as of 2026-05-25:** Phase 1 (Architecture + Bootstrap) — **Sıra 2 complete**. `fleet-enterprise-01` (CPX 32, Falkenstein) is provisioned and serving `https://enterprise-api.tulipfleet.com` with a valid Let's Encrypt certificate via Caddy. Hetzner private network `tulipfleet-internal` (10.0.0.0/16) joins both servers (`fleet-prod-01` at `10.0.0.2`, `fleet-enterprise-01` at `10.0.0.3`); enterprise backend reaches PostgreSQL over the private network with the `enterprise_backend` role. `tulipfleet-enterprise-backend` is deployed as a Docker container behind Caddy (commit `c125f4c`). End-to-end smoke verified: JWT issued by `api.tulipfleet.com` validates on `enterprise-api.tulipfleet.com`, `GET /api/dispatcher/vehicles` returns company-scoped data. Operational documentation created (`ENTERPRISE_INFRASTRUCTURE.md`, `INTEGRATION_BOUNDARIES.md`); ADR-0003 carries Implementation Notes (Section 10) for realized state. Next: Sıra 2.9 — NL Compliance Layer seed (ADR-0012) → Sıra 3 — HERE Tour Planning sandbox.

---

## Strategic Positioning

**TulipFleet Enterprise Dispatcher** is the dispatch-and-routing layer of the TulipFleet fleet management platform. Its strategic position is:

- **Flagship integrated product** for prospects who have not yet committed to a telematics vendor — TulipFleet hardware + dispatcher + mobile app as a single platform.
- **Open ingestion layer** for prospects with existing third-party telematics (Geotab, Verizon Connect, Samsara, etc.) — onboarded via customer-funded connectors per [ADR-0007](docs/adr/ADR-0007-telematics-integration-strategy.md).
- **NL-specialized compliance moat** for the regulatory environment forming around Vrachtwagenheffing (Temmuz 2026) and Zero-Emission Zones (18 cities, 2025–2026 rollout) — see [ADR-0012](docs/adr/ADR-0012-nl-compliance-layer.md) for the 3-phase Internal → Premium → Standalone evolution.
- **Vertical focus:** Dutch and broader European mid-market logistics — **K/M-segment 3PLs with 50–300 vehicles** per the Top 100 Logistiek Dienstverleners 2025 segmentation (e.g., Dobbe Transport, TMA Logistics, De Dekker, Deudekom). G-segment (Neele-Vat, 1000+ employees) is a telemetry data customer, not a dispatcher target.

The product is positioned **"TulipFleet — works best with TulipFleet"** in marketing and sales. Third-party compatibility is a sales-conversation answer, not a homepage message. NL compliance is positioned as **operational necessity for the Dutch market**, not a marketing differentiator — until the standalone Compliance-as-a-Service product is launched in Phase 3.

### Strategic insights guiding Phase 2 prioritization (per ADR-0011 §10)

- **KOBİ digital readiness gap.** evofenedex research: 80% of Dutch SMEs are not "digital ready." Competitors (Routific, OptimoRoute) avoid this segment due to complexity. TulipFleet's integrated single-vendor onboarding (hardware + mobile + dispatcher) reduces the barrier — this is a differentiator, not a problem.
- **Ketenregie gap.** Sector sources (TLN, evofenedex) identify supply chain orchestration ("ketenregie") as the underserved capability in the SME segment. Large 3PLs have in-house systems; SMEs have none. Dispatcher's Mode 1 (Advisory) + Mode 2 (Exception-based) maturity model from [ADR-0005](docs/adr/ADR-0005-dispatch-workflow.md) is purpose-built for this gap.
- **Compliance moat.** No consolidated "single data point" exists in the Netherlands for ZE-Zone, ontheffing, or Vrachtwagenheffing rules. TulipFleet's Phase 1 internal compliance layer becomes the seed for a Phase 3 standalone B2B data product (per ADR-0012).

---

## Decision Summary

| Area              | Decision                                                     | ADR                                                       |
| ----------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| **Dispatcher UI** | Material Dashboard 2 PRO React TS (Creative Tim, Company License) + MD3 PRO React reference | [ADR-0001](docs/adr/ADR-0001-dispatcher-ui-stack.md)       |
| **VRP Solver**    | HERE Tour Planning API (managed), OR-Tools deferred as escape hatch | [ADR-0002](docs/adr/ADR-0002-vrp-solver.md)                |
| **Server Topology** | Hetzner CX32 + `enterprise-api.tulipfleet.com` subdomain   | [ADR-0003](docs/adr/ADR-0003-server-topology.md)           |
| **Database**      | Shared PostgreSQL, `public.*` / `enterprise.*` schema split, telematics-agnostic core, **Phase 1 additive `public.*` changes legalized** | [ADR-0004 v3](docs/adr/ADR-0004-database-strategy.md)      |
| **Dispatch Workflow** | Three-mode maturity model (Advisory → Exception-based → Agentic); Phase 1 ships Advisory only | [ADR-0005](docs/adr/ADR-0005-dispatch-workflow.md)         |
| **Map Widget**    | Leaflet + react-leaflet, Mapbox GL JS retained as upgrade option | [ADR-0006](docs/adr/ADR-0006-map-widget.md)                |
| **Telematics Integration** | Scenario C (flagship + open), customer-funded connectors only, strict phase gating | [ADR-0007](docs/adr/ADR-0007-telematics-integration-strategy.md) |
| **Backend Stack** | Fastify v4 for enterprise backend (alignment with existing) | [ADR-0008](docs/adr/ADR-0008-fastify-v4.md)                |
| **Integration Map** | Production ↔ Enterprise topology, task lifecycle, schema authority, **Compliance Engine inheritance (§4.5.1)** | [ADR-0009](docs/adr/ADR-0009-enterprise-production-integration-map.md) |
| **ML Strategy**   | No in-house ML in Phase 1-2; ML consumer relationship with HERE; customer-funded ML in Phase 3+ | [ADR-0010](docs/adr/ADR-0010-ml-strategy.md)               |
| **Use Case Scope**| 7 Phase 1 MVP use cases, 10 Phase 2 trigger-based, 8 out-of-scope; HERE coverage matrix; target segment K/M-50–300 vehicles | [ADR-0011](docs/adr/ADR-0011-dispatcher-use-case-scope.md) |
| **NL Compliance Layer** | 3-phase strategy: Internal use (Phase 1) → Premium tier (Phase 2) → Standalone CaaS product (Phase 3); PostGIS adoption | [ADR-0012](docs/adr/ADR-0012-nl-compliance-layer.md)       |

---

## Phase Plan

### Phase 1 — Architecture & Bootstrap (in progress)

**Goal:** Ship a working Advisory-mode dispatcher for the first paying customer using TulipFleet's own telematics, with NL-specific compliance support (ZE-Zones, Vrachtwagenheffing-ready) and a forward-compatible architecture for Phase 2 customer-funded expansion.

#### Completed (as of 2026-05-15 evening)

**Strategic layer (ADRs):**

- ✅ **Dispatcher web app repository bootstrapped** — `tulipfleet-dispatcher` repo on GitHub, Material Dashboard 2 PRO React TS template imported, local dev environment verified.
- ✅ **Twelve ADRs accepted (0001–0012)** with one revision (0004 v3) and one addendum (0009 §4.5.1):
  - Foundational decisions (0001–0008): UI stack, VRP solver, server topology, database strategy, workflow modes, map widget, telematics integration, backend stack.
  - Integration and boundaries (0009–0010): production-enterprise integration map, ML strategy.
  - Use case scope and compliance (0011–0012): dispatcher feature scope with HERE coverage matrix, NL compliance layer 3-phase strategy.
- ✅ **External Migration Tool pattern adopted** — `node-pg-migrate` installed globally on host (local + server), backend repo (`tulipfleet-backend`) `package.json` untouched; migration tool decoupled from runtime.

**Schema and data layer:**

- ✅ **Enterprise schema migration applied to staging** (`fleet_tracking_staging`) — 10 vehicles backfilled with `provider='tulipfleet'`.
- ✅ **Enterprise schema migration applied to production** (`fleet_tracking`) — 9 vehicles backfilled, zero downtime, fresh backup taken pre-migration.
- ✅ **PostGIS extension activated** — migration `1778900000000_enable-postgis` applied to staging and production 2026-05-14. PostGIS 3.3.2 co-existence with TimescaleDB verified (alerts, locations_3p, and 5 other production hypertables remain functional). Foundation for `enterprise.nl_compliance_zones` GEOMETRY(POLYGON, 4326) per ADR-0012 §4.7.
- ✅ **`public.users.role` extended with 'dispatcher'** — migration `1778950000000_add-dispatcher-role` applied to staging and production 2026-05-15 (per ADR-0004 v3 §6.1). Existing rows (super_admin, company_admin, driver) unaffected; `users_company_check` unchanged.
- ✅ **`public.companies.dispatch_mode` column added** — migration `1778950000001_add-companies-dispatch-mode` applied to staging and production 2026-05-15. NOT NULL DEFAULT 'advisory', CHECK constraint ('advisory'|'exception'|'agentic') per ADR-0004 v3 §6.3 and ADR-0005. All existing companies automatically defaulted to 'advisory'.
- ✅ **Schema enforcement in place:**
  - 4 enterprise tables (`telematics_source`, `locations_3p`, `routing_jobs`, `dispatch_tasks`)
  - `locations_3p` is a TimescaleDB hypertable (empty in Phase 1)
  - CHECK constraints on `dispatch_tasks.status` and `routing_jobs.status` (state machine, defense in depth)
  - Composite PRIMARY KEY on `locations_3p` for ETL idempotency
  - `update_timestamp()` triggers on tables with `updated_at`
  - PostGIS extension active in `public` schema, available for `enterprise.*` tables
- ✅ **Migration tracking active** — `pgmigrations` table records 4 migrations on both staging and production:
  - `1778687553584_enterprise-schema-init` (2026-05-13)
  - `1778900000000_enable-postgis` (2026-05-14)
  - `1778950000000_add-dispatcher-role` (2026-05-15)
  - `1778950000001_add-companies-dispatch-mode` (2026-05-15)

**Production state:**

- ✅ **May 11 production-only feature work preserved** — Vehicle DELETE protection (`DEVICE_ATTACHED` 409 response) and `company_name` in reports endpoints, both developed and deployed to production server on May 11 but never pushed, were rescued via feature branches (`feature/may11-prod-retroactive`) and merged into `main` during migration work. No regression to live service.
- ✅ **Sıra 0 — Hygiene complete:** 3 `.bak` files removed from production; 2 operational scripts (`seed_demo_data.js`, `simulate_locations_keepalive.js`) committed and pushed; 2 feature branches deleted from GitHub after merge.

**Enterprise backend (Sıra 1 in progress):**

- ✅ **Repository created** — `tulipfleet-enterprise-backend` (GitHub private) initialized 2026-05-15.
- ✅ **Fastify v4 skeleton operational (Sıra 1.4)** — `server.js` with plugin matrix per ADR-0008 §6 (sensible → cors → db → auth → routes). Verified locally with `npm start`: database connection to `fleet_tracking_staging` confirmed via `SELECT NOW(), current_user`, server listens on `http://0.0.0.0:3001`. Graceful shutdown handler for SIGINT/SIGTERM in place. Health endpoint (`GET /health`) returns 200 with `{status, timestamp, service, version, uptime, database}` shape.
- ✅ **First protected endpoint working (Sıra 1.5)** — `GET /api/dispatcher/vehicles` returns 200 with vehicles scoped to JWT's `company_id` claim (per ADR-0009 §4.4 tenant isolation). Verified end-to-end: JWT-less request → 401, valid JWT → 200 with real staging data from Demo Fleet company (`00000000-0000-0000-0000-000000000001`). JWT verification uses `fast-jwt@6.2.4` (security-patched per dependency override).
- ✅ **`public.vehicles` schema discovered and recorded** — see "Schema reference" section below. The dispatcher endpoint uses real column names (`plate_no`, `brand`, `model`, `year`, `status`, `vehicle_category`).
- ✅ **Dependency security overrides applied** — `package.json` includes `overrides` block pinning `fast-jwt@^6.2.4` (resolves 6 CVEs including critical auth bypass) and `fast-uri@^3.1.2` (resolves 2 path-traversal/host-confusion CVEs). Fastify core itself retains 3 known CVEs unfixable without v5 upgrade (which would violate ADR-0008); these are accepted as low/moderate risk for Phase 1 because the affected code paths (Web Streams, restrictive trustProxy config, body-validation-as-security) are not used. To be reviewed Phase 2 with a fresh ADR.

#### Schema reference — `public.vehicles` (discovered 2026-05-15)

The `public.vehicles` table in production and staging contains the following columns. This reference is captured here because the dispatcher backend reads (and Phase 1.1 will extend) this table, and surprises in column naming have already caused at least one Sıra 1 incident.

| Column                  | Type                          | Notes                                                              |
| ----------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `id`                    | uuid (PK, default `gen_random_uuid()`) | Vehicle primary key                                       |
| `plate_no`              | varchar(20) NOT NULL UNIQUE   | License plate (Dutch format e.g. `GV-082-B`). **Note: not `license_plate` despite that being a common name elsewhere.** |
| `esp32_device_id`       | varchar(50) NOT NULL UNIQUE   | TulipFleet hardware device identifier; legacy naming, ADR-0009 §5.2 renames deferred to Phase 2 |
| `model`                 | varchar(100)                  | Vehicle model name (e.g. "Actros")                                 |
| `brand`                 | varchar(100)                  | Manufacturer (e.g. "Mercedes-Benz"). **Note: not `make`.**         |
| `year`                  | integer                       | Model year                                                         |
| `fuel_type`             | varchar(20)                   | Diesel/EV/HVO etc. — useful for ADR-0012 ZE-Zone enforcement       |
| `fuel_capacity`         | numeric(5,2)                  | Tank/battery capacity (L or kWh)                                   |
| `current_fuel_level`    | numeric(5,2)                  | Latest reading                                                     |
| `total_km`              | numeric(10,2)                 | Odometer                                                           |
| `last_maintenance_date` | date                          |                                                                    |
| `next_maintenance_km`   | numeric(10,2)                 |                                                                    |
| `status`                | varchar(20) DEFAULT 'available' | CHECK: `available` \| `in_use` \| `maintenance` \| `retired` — **dispatcher visibility filter; only `available` and `in_use` are candidates for new dispatch jobs** |
| `vehicle_category`      | varchar(20) DEFAULT 'truck_heavy' | Used for VRP constraint mapping (HERE truck attributes) per ADR-0011 FEAT-002 |
| `color`                 | varchar(30)                   |                                                                    |
| `company_id`            | uuid FK → `companies(id)` ON DELETE CASCADE | **Tenant isolation key per ADR-0009 §4.4**           |
| `threshold_accel`       | numeric(4,2) DEFAULT 0.25     | Driver behavior detection thresholds (g-force) — for harsh-driving alerts |
| `threshold_brake`       | numeric(4,2) DEFAULT 0.35     |                                                                    |
| `threshold_turn`        | numeric(4,2) DEFAULT 0.30     |                                                                    |
| `threshold_impact`      | numeric(4,2) DEFAULT 2.50     | Collision detection threshold                                       |
| `reprovision_required`  | boolean DEFAULT false         | Hardware provisioning flag, indexed partial                         |
| `last_geofence_id`      | uuid FK → `geofences(id)` ON DELETE SET NULL | Latest geofence interaction                          |
| `last_geofence_event`   | varchar(10)                   | Entry/exit type                                                    |
| `last_geofence_at`      | timestamptz                   |                                                                    |
| `created_at`            | timestamp                     |                                                                    |
| `updated_at`            | timestamp                     |                                                                    |

**Strategic observations about this schema** (recorded for future Phase 2 use case planning):

- **The vehicles table is information-rich beyond what Sıra 1.5 currently exposes.** Phase 2 dispatcher endpoints can surface `status` (available/in-use filter for plan eligibility), `vehicle_category` (HERE truck profile selection per FEAT-002), `fuel_type` (ZE-Zone compatibility check per ADR-0012, EV range optimization per FEAT-103), `total_km` (maintenance scheduling input), and `last_geofence_*` (depot return detection).
- **Driver behavior thresholds (`threshold_accel`, `threshold_brake`, `threshold_turn`, `threshold_impact`) are already per-vehicle configurable.** This is a hardware-side feature, but dispatcher Phase 2 can surface alerts when these are exceeded (FEAT-005 Live Fleet Map extension, or new "Driver behavior" panel).
- **Phase 1.1 migration `vehicles` capacity columns** (per ADR-0004 v3 §6.4 — `capacity_volume_m3`, `capacity_weight_kg`, `vehicle_class`, `hazmat_classes`) will join this rich set. `vehicle_category` already exists but is varchar(20); the new `vehicle_class` may overlap or supersede it — to be reconciled during the §6.4 migration design.
- **Naming convention note for Phase 1.1 and beyond:** The existing schema uses snake_case with terse names (`plate_no`, `brand` rather than `license_plate`, `make`). New columns added in Phase 1.1 and Phase 2 should follow this convention.

#### Architecture (target state)

- Dispatcher web app (Material Dashboard 2 PRO React TS) — repo bootstrapped, branding and screens to follow.
- New backend (`enterprise-api.tulipfleet.com`) on Hetzner CX32 — to be provisioned.
- Shared PostgreSQL with `enterprise.*` schema — **applied**; PostGIS extension active.
- HERE Tour Planning API integration via the `IRoutingProvider` interface — to be built.
- Leaflet-based live fleet map subscribing to existing EMQX MQTT topics — to be built.
- NL Compliance Layer as a Fastify plugin within `enterprise-backend`, architecturally microservice-ready for Phase 3 extraction.

#### Pending — execution order

The order below reflects the critical path; later items depend on earlier ones.

**Sıra 1 — Enterprise backend repository (in progress, revised order 2026-05-15)**

- ✅ Create `tulipfleet-enterprise-backend` repo (GitHub, private).
- ✅ Lokal init (`mkdir`, `git init`, `.gitignore`, `.env.example`, `package.json`).
- ✅ Fastify v4 skeleton (alignment with existing `tulipfleet-backend`, per ADR-0008).
- ✅ Plugins: `@fastify/postgres`, `@fastify/jwt`, `@fastify/cors`, `@fastify/sensible` (per ADR-0008 §6 plugin matrix). MQTT subscriber deferred to Sıra 4.
- ✅ Connects to `enterprise.*` schema (read-mostly in Phase 1) and `public.*` (SELECT-only per ADR-0009 §4.1).
- ✅ **Does not write migrations** (schema authority remains in `tulipfleet-backend` per ADR-0004 v3).
- ✅ Health endpoint (`GET /health`) returns DB connectivity status.
- ✅ First protected endpoint: `GET /api/dispatcher/vehicles` returns vehicles scoped to JWT `company_id` claim.
- ✅ **Initial smoke test** with `fleetadmin` superuser passed: 401 without JWT, 200 with valid JWT returning real staging data.
- ✅ **Then create Postgres `enterprise_backend` role** with grants scoped to observed access needs (per ADR-0009 §4.1):
  - `SELECT` on `public.vehicles`, `public.companies`, `public.users`, `public.drivers`, `public.tasks`
  - `ALL` on `enterprise.*`
  - `statement_timeout = '10s'`
  - Default privileges on future `enterprise.*` tables (for ADR-0012 `nl_compliance_zones`, etc.)
- ✅ **Final smoke test** with `enterprise_backend` role to validate production-equivalent access.
- ✅ Commit + push, minimal README.

*Order rationale: defining the role **after** code is written produces a least-privilege grant set based on observed access patterns rather than guesses. Two smoke tests cost ~5 minutes each but eliminate misconfigured role risk on first deploy. Schema-level migrations for `public.users.role` and `public.companies.dispatch_mode` were applied separately during pre-Sıra-1 admin (see Completed list above).*

**Sıra 2 — Hetzner CX32 provision + DNS + TLS (in progress, 4/5 complete 2026-05-25)**

- ✅ **Provisioned `fleet-enterprise-01`** — Hetzner **CPX 32** (4 vCPU AMD, 8 GB RAM, 160 GB NVMe; ~€13.99/mo + €0.50 IPv4) in Falkenstein, Ubuntu 24.04 LTS. Hetzner private network `tulipfleet-internal` (10.0.0.0/16) joins both servers (`fleet-prod-01` 10.0.0.2, `fleet-enterprise-01` 10.0.0.3). ADR-0003 Section 10 (Implementation Notes) records the CX→CPX divergence and private network details. See `ENTERPRISE_INFRASTRUCTURE.md`.
- ✅ **DNS A record** `enterprise-api.tulipfleet.com` → `49.12.246.212` (Cloudflare, DNS only / proxy off so Caddy handles ACME directly).
- ✅ **Caddy + Let's Encrypt** — Caddy chosen over Nginx for automatic ACME issuance and renewal. ECDSA certificate obtained via TLS-ALPN-01 challenge. HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy security headers active; HTTP→HTTPS 308 redirect.
- ✅ **Deployed `tulipfleet-enterprise-backend`** (commit `c125f4c`) as Docker container behind Caddy. End-to-end smoke verified: JWT from `api.tulipfleet.com` validates on `enterprise-api.tulipfleet.com`; `GET /api/dispatcher/vehicles` returns company-scoped data. PostgreSQL access via private network with `enterprise_backend` role (UFW rule `5433/tcp on enp7s0 ALLOW IN 10.0.0.0/16` on fleet-prod-01).
- ⏳ **Sıra 2.9 — Seed initial NL Compliance data** — 18 ZE-Zone city polygons + rules (per ADR-0012 §3.1, as revised by 2026-05-25 addendum). Vrachtwagenheffing static tariff table relocated to Phase 1.1 (FEAT-008) to align with its consumer's phase; the table's schema migration is still authored in Sıra 2.9.1 and applied in Sıra 2.9.2 (low marginal cost), but seed and consuming logic deferred. Deferred to its own session because of dataset preparation scope.

**Sıra 3 — HERE Tour Planning sandbox**

- Account at developer.here.com.
- Sandbox API key (free tier, 30-day evaluation).
- First Tour Planning REST request from a notebook or curl to validate constraint syntax.
- Validate HERE environmental zones coverage for NL ZE-Zones (per ADR-0012 §9 Open Questions).
- Store key in `tulipfleet-enterprise-backend/.env`.

**Sıra 4 — Dispatcher UI: Live Fleet Map (first real screen, FEAT-005)**

- Replace Material Dashboard 2 PRO placeholder map.
- Leaflet + react-leaflet per ADR-0006, MapTiler tile provider (free tier).
- MQTT-over-WSS client connecting to existing EMQX broker.
- Dedicated EMQX user `dispatcher-readonly` (read-only ACL on `fleet/device/+/location`, `fleet/device/+/behavior`, `fleet/device/+/alert` per ADR-0009 §4.2).
- Real-time markers for production vehicles.

**Sıra 5 — Vehicle / Driver / Task list screens**

- Material Dashboard 2 PRO DataTable components fed by enterprise backend `GET /api/dispatcher/*` endpoints.
- Filtering, sorting, pagination.
- Surfaces capacity, skill, and compliance metadata where relevant.

**Sıra 6 — Plan workflow (Advisory mode — FEAT-001 through FEAT-007)**

- `POST /api/dispatcher/plans` — submit to HERE Tour Planning with truck attributes, capacity, skill, time window, and compliance avoidance area constraints.
- `GET /api/dispatcher/plans/:id` — fetch status and result with predicted ETA.
- `POST /api/dispatcher/plans/:id/approve` — commit plan to `enterprise.dispatch_tasks` and push to existing `public.tasks` (one-way per ADR-0009 §4.4).
- `POST /api/dispatcher/plans/:id/replan` — manual "Replan Now" for dynamic re-routing (FEAT-004 per ADR-0011).
- Compliance check endpoint: `POST /api/compliance/check-access` (note: `/api/compliance/*` path naming per ADR-0012 §4.1, not `/api/dispatcher/compliance/*`).
- Apply ADR-0004 v3 §6.2 migration (`public.tasks.enterprise_dispatch_task_id` nullable UUID column).
- Plan review UI: map + timeline + Kanban views.

**Sıra 7 — Pilot customer onboarding**

- TulipFleet brand theming applied to dispatcher UI.
- Production deploy on `fleet-enterprise-01`.
- First customer pilot (target: K/M-segment NL 3PL with 50–300 vehicles per ADR-0011 §4.1).

**Phase 1.1 — Quick follow-up (1–4 weeks after MVP launch)**

These items ship shortly after the Phase 1 MVP launch, not in the MVP itself:

- **FEAT-008 — Vrachtwagenheffing route cost optimization.** Scope: (a) `enterprise.nl_vrachtwagenheffing_tariffs` static tariff seed once Temmuz 2026 published rates are available — schema itself is authored in Sıra 2.9.1 and applied in Sıra 2.9.2 (relocated from Phase 1 per 2026-05-25 addendum to ADR-0012 §3.1); (b) route cost optimization logic in dispatcher backend that joins this table during plan generation. Activated when Temmuz 2026 API goes live; ~3–5 days marginal effort because schema is already in place. Per ADR-0011 and ADR-0012.
- **FEAT-009 — Basic carbon footprint per route.** HERE Eco Routing already returns CO2/fuel data; UI display added. Distinct from Phase 2 CSRD-compliant export (FEAT-106).
- **Apply ADR-0004 v3 §6.4 migration** (`public.vehicles` capacity columns: `capacity_volume_m3`, `capacity_weight_kg`, `vehicle_class`, `hazmat_classes`) — enables FEAT-002 truck-aware routing and FEAT-007 capability matching. Note: existing `vehicle_category` varchar column overlaps semantically with the new `vehicle_class`; reconciliation design needed during §6.4 migration authoring.

**Indicative timeline:** 6–9 weeks from completion of Sıra 1 to first-customer pilot, assuming single founder/developer pace. Phase 1.1 follow-ups extend ship period by ~1–4 weeks.

#### Out of scope (explicitly)

Per ADR-0011 §7, the following are bilinçli olarak Phase 1 dışında:

- Third-party telematics connectors (Phase 2+).
- Auto-dispatch / exception-based mode (Phase 2).
- Agentic mode (Phase 3, ADR pending).
- Driver drowsiness / DMS computer vision (separate business line; ADR pending).
- Custom VRP engine / OR-Tools (escape hatch only, ADR-0002 §8).
- Mapbox GL JS migration (escape hatch only, ADR-0006 §7).
- Multimodal orchestration (rail/sea/road) — Phase 3 ADR.
- SiLK federated load pooling — separate product, not in dispatcher scope.
- In-house ML training/hosting — per ADR-0010.
- Yard/Ramp WMS connector — Phase 2 customer-funded (FEAT-108).
- CSRD-compliant carbon report export — Phase 2 customer-funded (FEAT-106).
- AI agent (PDF/email order parsing) — Phase 2 customer-funded (FEAT-105).
- NL Compliance public API / Standalone product — Phase 3 (per ADR-0012 §7 trigger conjunction).

### Phase 2 — Customer-Driven Expansion

**Triggers (any of the below activates the corresponding work):**

- A paying customer signs a contract with budget for a specific third-party telematics connector → that connector is built.
- A paying customer requests Exception-based dispatch mode → Mode 2 rule engine is built.
- A paying customer demands NL Compliance Pro tier features (real-time RDW, ontheffing tracking, Vrachtwagenheffing live data) → ADR-0012 Phase 2 activation.
- A paying customer demands AI agent for order parsing → FEAT-105 (third-party LLM API consumer per ADR-0010 §4).
- HERE Tour Planning cost or capability constraints materialize → escape hatch in [ADR-0002 §8](docs/adr/ADR-0002-vrp-solver.md#8-escape-hatch--when-to-reconsider-or-tools) is invoked.
- Leaflet performance ceiling is reached → Mapbox GL JS migration per [ADR-0006 §7](docs/adr/ADR-0006-map-widget.md#7-escape-hatch--when-to-reconsider-mapbox-gl-js).
- **Fastify v4 known CVEs** (sendWebStream DoS, Content-Type tab bypass, X-Forwarded spoofing) require resolution before exposure to untrusted traffic → ADR for Fastify 5 migration vs. mitigation-via-reverse-proxy decision.

**Phase 2 use case catalog:** FEAT-101 through FEAT-110 per [ADR-0011 §6](docs/adr/ADR-0011-dispatcher-use-case-scope.md). Each is forward-compatible with Phase 1 schema (`dispatch_tasks.capacity_required jsonb`, `source jsonb`).

**Out of scope:**

- Speculative connectors (no signed customer, no work — see [ADR-0007 §4](docs/adr/ADR-0007-telematics-integration-strategy.md)).
- Speculative ML training (per ADR-0010).
- Mode 3 agentic dispatch (Phase 3).
- Connector framework abstraction (Phase 3, when ≥3 connectors exist).
- NL Compliance Standalone product launch (Phase 3 trigger conjunction per ADR-0012 §7).

### Phase 3 — Maturity & Framework

**Triggers:**

- ≥3 customer-funded connectors exist → framework abstraction ADR is written.
- Mode 2 deployment data justifies a Mode 3 pilot with a specific customer → agentic dispatch ADR is written.
- Operational metrics (uptime, dispatch quality, customer satisfaction) support a softer "compatible with major European telematics providers" marketing position.
- ADR-0012 trigger conjunction satisfied (12+ months Vrachtwagenheffing data + 10+ ZE-Zone validation + 10+ paying Compliance Pro customers) → NL Compliance-as-a-Service standalone product launch ADR is written.

---

## Non-Goals

What TulipFleet Enterprise will **not** become, by explicit decision:

- **Not a vendor-neutral dispatch SaaS.** That market is commoditized; entering it without a moat is not the chosen path. See [ADR-0007](docs/adr/ADR-0007-telematics-integration-strategy.md).
- **Not a custom-VRP-engine vendor.** TulipFleet does not differentiate by having a better solver than HERE; it differentiates by hardware, MQTT-based event architecture, and vertical focus. See [ADR-0002](docs/adr/ADR-0002-vrp-solver.md).
- **Not an in-house ML / AI training shop.** ML capability is consumed from third-party APIs (HERE today, possibly LLM APIs in Phase 2 for FEAT-105). In-house training is Phase 3+ with customer funding. See [ADR-0010](docs/adr/ADR-0010-ml-strategy.md).
- **Not a hardware-only product.** The dispatcher software is part of the product, not an add-on; the entire offering is sold as a platform.
- **Not a multi-tenant Mode-3 agentic product on launch.** Liability, trust, and operational maturity all require gradual progression. See [ADR-0005](docs/adr/ADR-0005-dispatch-workflow.md).
- **Not a multimodal orchestration platform** (rail/sea/road) in Phase 1-2. Phase 3 ADR may revisit; container drayage with demurrage/detention tracking remains out-of-scope until then. See [ADR-0011 §7](docs/adr/ADR-0011-dispatcher-use-case-scope.md).
- **Not a federated load-pooling marketplace** (SiLK pattern). Separate product category; not appropriate for dispatcher SaaS. See [ADR-0011 §7](docs/adr/ADR-0011-dispatcher-use-case-scope.md).

---

## Cross-Cutting Disciplines

### Phase gating

Most strategic risk in this product comes from **drift across phases**, not from architectural error. Phase advancement is gated on signed customer contracts, measured needs, and explicit ADR amendments — not internal enthusiasm. This discipline is the most important cross-cutting commitment in this roadmap.

### Customer-funded integration and capability development

No third-party connector, ML capability, or compliance integration is built speculatively. The pattern is: customer signs, capability is built, recurring revenue covers maintenance. Speculative work is the recurring failure mode of vertical SaaS products with broad addressable markets; the registry table `enterprise.telematics_source` (ADR-0007) and the Phase 3 trigger conjunction (ADR-0012 §7) exist explicitly to make this discipline visible.

### `Works better with TulipFleet`

Where the dispatcher can do **more** when paired with TulipFleet's own hardware, those asymmetries are preserved and surfaced. This protects the hardware moat even as the dispatcher admits third-party telematics. See feature tiering in [ADR-0007 §7](docs/adr/ADR-0007-telematics-integration-strategy.md#7-feature-tiering--reference-for-phase-1).

### Decision optionality

Every major dependency (VRP solver, map widget, third-party telematics) is wrapped in an internal interface. Switching cost is bounded to weeks, not quarters. The `IRoutingProvider`, `ITelematicsProvider`, and React-Leaflet abstractions are all examples of this principle. The Compliance Engine's microservice-ready architecture (ADR-0012 §4) extends this principle to allow Phase 3 product spin-off without full rewrite.

### External Migration Tool

Schema migrations are not a runtime concern. The migration tool (`node-pg-migrate`) lives outside production containers — installed globally on host or invoked from a developer workstation. The `tulipfleet-backend` repo carries migration SQL files but does **not** ship the tool as a runtime dependency. This pattern preserves production container stability and eliminates dependency-conflict regressions in `server.js`. The Compliance Engine, whether running as a Fastify plugin in Phase 1-2 or as a standalone microservice in Phase 3, never writes migrations directly (ADR-0009 §4.5.1).

### Production safety protocol

Production database changes follow a strict sequence: staging-first → smoke test → fresh backup → production → smoke test. No migration runs without an immediate pre-migration backup. Container memory vs. disk synchronization is verified after any disk-level git operation (`git reset`, `git pull`, `git checkout`) on production, because Node.js processes cache `require`'d modules and a disk-level revert can create a silent regression window. New PostgreSQL extensions (such as PostGIS for ADR-0012) are tested on staging first to validate co-existence with TimescaleDB before production application.

### Migration authoring discipline (added 2026-05-15)

Three failure modes observed during the public.* additive migrations and Sıra 1.5 endpoint development require explicit guardrails:

- **UTF-8 BOM encoding.** PowerShell editors and Out-File default to UTF-8 with BOM on some Windows versions. The PostgreSQL SQL parser rejects the BOM character (`U+FEFF`) with a generic syntax error that is difficult to diagnose. Required practice: SQL migrations created on Windows must be written with `[System.Text.UTF8Encoding]::new($false)` (no BOM), or saved via VS Code with explicit "UTF-8 without BOM" encoding. Verify with `head -c 6 file.sql | xxd` — the first three bytes must NOT be `ef bb bf`. This same discipline applies to all `.js`, `.json`, and `.env` files created via PowerShell heredoc.
- **Pattern-match false positives in constraint discovery.** Using `LIKE '%role%'` (or similarly loose patterns) to find a constraint to drop can match more than one constraint. Combined with `LIMIT 1`, the migration becomes non-deterministic and may drop the wrong constraint. Required practice: when the constraint name is known and stable (e.g., `users_role_check`), use `DROP CONSTRAINT IF EXISTS <exact_name>` directly. Reserve dynamic name discovery only for genuinely unknown schemas, and even then anchor the pattern tightly (e.g., match on constraint definition substring AND constraint name prefix).
- **Schema column names must be inspected, not assumed.** During Sıra 1.5, the first attempt at `GET /api/dispatcher/vehicles` failed with `column "license_plate" does not exist` because the actual column is `plate_no`. The same pattern caught `brand` (not `make`). Required practice: before writing any SQL that touches an existing table, run `\d public.<table>` against the staging database and use the **real** column names. This is especially important for the dispatcher backend (which only reads `public.*`); schema authority remains in `tulipfleet-backend`, so changes to columns are out-of-scope for the dispatcher backend — it must adapt.

### Strategic moat through compliance data

NL Compliance Layer (ADR-0012) starts as an internal Phase 1 module but is architected with Phase 3 standalone-product extraction in mind. The dispersion of NL regulatory data sources (vrachtwagenheffing.nl, evofenedex, TLN, RDW, 18 municipal `toegangsbeleid` systems) creates a defensible position: once TulipFleet consolidates this data and validates it operationally, the moat is hard for competitors to replicate. This is a long-term play — Phase 3 launch is at the earliest Temmuz 2027 — and the architectural disciplines codified in ADR-0012 §4 protect the future optionality without burdening Phase 1 delivery.

### Known vulnerabilities — accepted-risk register

Fastify v4 carries three known unpatched CVEs that the project accepts as low-impact for Phase 1 internal use:

| CVE | Severity | Patched in | Why accepted Phase 1 |
| --- | --- | --- | --- |
| GHSA-mrq3-vjjr-p77c (sendWebStream DoS) | Low (3.7) | Fastify 5.7.3 | Dispatcher backend returns JSON; no Web Streams in any route. |
| GHSA-jx2c-rxcm-jvmq (Content-Type tab bypass) | (moderate range) | Fastify 5.x | No security decision in dispatcher routes derives from body schema validation alone; authentication and tenant isolation are enforced separately. |
| GHSA-444r-cwp2-x5xf (X-Forwarded spoofing) | Moderate (6.1) | Fastify 5.8.3 | Only exploitable with restrictive `trustProxy` config; Phase 1 uses `trustProxy: false` (direct connection). Sıra 2 reverse proxy will use `trustProxy: true` with Caddy/Nginx on a private network, or whitelist the proxy IP explicitly. |

`fast-jwt` (6 CVEs) and `fast-uri` (2 CVEs) are mitigated via npm `overrides` block in `package.json` pinning patched versions while keeping Fastify 4 itself stable. Phase 2 will produce an ADR (revisiting ADR-0008) to decide between Fastify 5 migration and continued v4 use with reverse-proxy-level mitigation.

---

## Repository Map

| Repository                | Purpose                                                                       |
| ------------------------- | ----------------------------------------------------------------------------- |
| `tulipfleet-dispatcher`   | This repo. Dispatcher web UI. Material Dashboard 2 PRO React TS based.        |
| `tulipfleet-backend`      | Existing Fastify backend serving `api.tulipfleet.com` (mobile app + admin). **Also schema authority** — owns all migration files (`migrations/`), including `enterprise.*`, PostGIS extension, and `public.*` additive Phase 1 migrations. |
| `tulipfleet-enterprise-backend` | New Fastify backend serving `enterprise-api.tulipfleet.com`. Consumes `enterprise.*` schema, does not write migrations. Hosts the NL Compliance Engine as a Fastify plugin in Phase 1-2. **Created 2026-05-15, skeleton operational; health and `GET /api/dispatcher/vehicles` endpoints verified locally against staging DB.** |
| `tulipfleet`              | Existing React Native (Expo) driver and admin app. **No changes required in Phase 1** per ADR-0009 §4.6. |
| `tulipfleet-qa`           | QA documentation (`DEMO_OLUSTURMA.md`, infrastructure notes, schema conventions, dependency conflict history). |

---

## Document Conventions

- **ADRs** record decisions, with rationale and consequences. They are immutable once accepted; new decisions get new ADRs that supersede older ones (e.g., ADR-0004 v3 supersedes v2, which superseded v1). Addendums (e.g., ADR-0009 §4.5.1) are minor consistency clarifications and do not constitute new ADRs.
- **This ROADMAP** is the executive summary. It is updated as the phase status changes or as new ADRs are added.
- **READMEs** in each repo describe how to run that codebase locally.
- **Feature specifications** (forthcoming, in `docs/features/`) provide implementation-level Who/What/How/When/Where for each in-scope use case from ADR-0011. These are living documents; ADRs are the decisions, feature specs are the implementations.

---

## Change Log

| Date       | Change                                                                      |
| ---------- | --------------------------------------------------------------------------- |
| 2026-05-13 (initial) | Initial roadmap. ADRs 0001–0007 accepted. Phase 1 (Architecture & Bootstrap) in progress. |
| 2026-05-13 (post-migration) | Schema migration applied to staging and production. ADR-0004 revised to v2. External Migration Tool pattern documented. May 11 production-only feature work rescued via feature branches and merged into `main`. Sıra 0–7 execution order documented. Production safety protocol cross-cutting discipline added. |
| 2026-05-14 (strategic layer complete) | ADRs 0008 (Fastify v4), 0009 (Integration map), 0010 (ML strategy), 0011 (Use case scope + HERE coverage), 0012 (NL Compliance Layer strategy) added. ADR-0004 revised to v3 (Phase 1 additive `public.*` changes legalized in Section 6). ADR-0009 §4.5.1 addendum added (Compliance Engine inheritance). Target customer segment refined to K/M-50–300 vehicles per Top 100 Logistiek Dienstverleners 2025. Strategic positioning enhanced with KOBİ digital readiness, ketenregie, and compliance moat insights. Phase 1.1 follow-ups defined (Vrachtwagenheffing optimization, basic carbon, vehicles capacity migration). PostGIS adoption planned for ADR-0012 compliance polygons. Pre-Sıra-1 preparation step added (revisions + extension test). |
| 2026-05-15 (Sıra 1 in progress) | Three Phase 1 public.* migrations applied to staging and production: PostGIS extension activation (`1778900000000_enable-postgis`), `users.role` 'dispatcher' enum extension (`1778950000000_add-dispatcher-role`), `companies.dispatch_mode` column (`1778950000001_add-companies-dispatch-mode`). All migrations carried zero customer impact (production backend uptime maintained throughout). Sıra 1 order revised: code skeleton → smoke test with `fleetadmin` superuser → `enterprise_backend` role creation based on observed access patterns → final smoke test with production-equivalent role. Role definition moved from Sıra 2 into Sıra 1. New cross-cutting discipline added: "Migration authoring discipline" — codifies UTF-8 BOM avoidance and constraint-name discovery best practices learned from two rollback incidents during the public.* migrations. |
| 2026-05-15 (evening — Sıra 1.4 + 1.5 complete) | `tulipfleet-enterprise-backend` repository created on GitHub (private). Fastify v4 skeleton operational (`server.js`, plugins/{db,auth}, routes/{health,vehicles}). `GET /health` and `GET /api/dispatcher/vehicles` verified locally against staging DB using `fleetadmin` superuser: 401 without JWT, 200 with valid JWT returning real Demo Fleet vehicle data. Dependency security overrides in place for `fast-jwt@^6.2.4` (resolves 6 CVEs) and `fast-uri@^3.1.2` (resolves 2 CVEs); 3 Fastify-core CVEs added to "known vulnerabilities — accepted-risk register" cross-cutting section with rationale. Schema discovery: `public.vehicles` column reference recorded (key naming: `plate_no` not `license_plate`, `brand` not `make`); strategic observations about the schema's information-richness (status, vehicle_category, fuel_type, behavior thresholds, geofence integration) captured for Phase 2 planning. Third migration authoring rule added: "Schema column names must be inspected, not assumed" — triggered by Sıra 1.5 endpoint failure when assumed column names did not match real schema. | 
| 2026-05-24 (Sıra 1 complete) | `enterprise_backend` Postgres role created with least-privilege grants
| 2026-05-25 (Sıra 2 4/5 complete) | `fleet-enterprise-01` provisioned (Hetzner **CPX 32** — note: ADR-0003 v1 said "CX32"; ADR-0003 §10 Implementation Notes records the divergence). Ubuntu 24.04 LTS, cloud-init bootstrapped UFW/fail2ban/Docker/Caddy. Hetzner private network `tulipfleet-internal` (10.0.0.0/16) created and both servers attached (10.0.0.2 + 10.0.0.3). Enterprise backend accesses PostgreSQL over the private network via `enterprise_backend` role (UFW `5433/tcp on enp7s0 ALLOW IN 10.0.0.0/16` on fleet-prod-01). Cloudflare DNS A record (DNS only). Caddy serving `enterprise-api.tulipfleet.com` with Let's Encrypt ECDSA cert. `tulipfleet-enterprise-backend` deployed as Docker container (commit `c125f4c`); end-to-end smoke (login on `api.tulipfleet.com` → JWT-protected call on `enterprise-api.tulipfleet.com`) returns 6 company-scoped vehicles. Operational docs created: `docs/ENTERPRISE_INFRASTRUCTURE.md`, `docs/INTEGRATION_BOUNDARIES.md`. ADR-0003 §10 Implementation Notes added. Initial snapshot: `fleet-enterprise-01-initial-cloudinit-done`. **Sıra 2.5 (NL Compliance seed) deferred to its own session** — Sıra 2 is 4/5 in this entry. Next: Sıra 2.9. |
| 2026-05-25 (Sıra 2.9.1 — migration design complete, scope realignment) | Two `enterprise.*` migration files designed and authored for application in Sıra 2.9.2: `1779200000000_create-enterprise-nl-compliance-zones` (per ADR-0012 §5) and `1779200000001_create-enterprise-nl-vrachtwagenheffing-tariffs` (new schema designed during this session — categorization aligned with EU Eurovignette/Viapass conventions: 3 weight classes `12_18t`/`18_32t`/`32_plus_t`, 8 emission classes `euro_0..6`/`zero_emission`, 3 road types `motorway`/`n_road`/`all_other`; UNIQUE index on `(weight_class, emission_class, road_type, effective_from)` enforces tariff-row uniqueness at DB level). Migration authoring disciplines applied throughout (BOM-free UTF-8, LF line endings, idempotent pre-condition guards for PostGIS / `update_timestamp` / `enterprise` schema, defense-in-depth GRANTs to `enterprise_backend`, human-readable TEXT primary keys per ADR-0012 §4.6 audit trail). **Scope realignment:** the Vrachtwagenheffing tariffs table — originally listed under Sıra 2.9 (per ADR-0012 §3.1) — was reclassified to Phase 1.1 (FEAT-008) during this session. Rationale: the table's only consumer (FEAT-008 — Vrachtwagenheffing route cost optimization) is already Phase 1.1; aligning the data and its consumer in the same phase removes a doc-cross-reference inconsistency. The schema migration file itself still applies in Sıra 2.9.2 (marginal cost ~0; avoids a future schema-write disruption against production once compliance polygons are seeded), but the static tariff seed data and route-cost optimization logic are explicitly deferred to FEAT-008. ROADMAP Sıra 2.9 + Phase 1.1 FEAT-008 descriptions updated; ADR-0012 §3.1 carries a 2026-05-25 Addendum recording the reclassification (per ADR-0009 §4.5.1 minor-clarification pattern, not a new ADR version). Next: Sıra 2.9.2 (apply migrations to staging → smoke → production). |
(`SELECT` on five `public.*` tables, `ALL` on `enterprise.*`, `statement_timeout = '10s'`, default privileges for future `enterprise.*` tables). Final smoke test with production-equivalent role passed against staging DB. `tulipfleet-enterprise-backend` initial commit (`71c5260`) pushed to GitHub `main`: 10 files, 2046 insertions, Fastify v4 skeleton with health and dispatcher/vehicles endpoints. `.env` and `node_modules/` properly excluded via `.gitignore` (verified pre-commit). Sıra 1 closed. Next session: Sıra 2 — Hetzner CX32 provisioning. |
