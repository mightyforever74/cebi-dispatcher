# TulipFleet Enterprise — Roadmap

A high-level summary of the architectural and product decisions that govern the TulipFleet Enterprise Dispatcher. Each decision has a detailed Architecture Decision Record (ADR) in [`docs/adr/`](docs/adr/). This roadmap is the index and the executive view.

> **Status as of 2026-05-13:** Phase 1 (Architecture + Bootstrap) — **schema layer complete**. Dispatcher repo bootstrapped, ADRs 0001–0007 accepted, enterprise schema migration applied to staging and production with zero downtime. Backend skeleton, server provisioning, and UI work are next.

---

## Strategic Positioning

**TulipFleet Enterprise Dispatcher** is the dispatch-and-routing layer of the TulipFleet fleet management platform. Its strategic position is:

- **Flagship integrated product** for prospects who have not yet committed to a telematics vendor — TulipFleet hardware + dispatcher + mobile app as a single platform.
- **Open ingestion layer** for prospects with existing third-party telematics (Geotab, Verizon Connect, Samsara, etc.) — onboarded via customer-funded connectors per [ADR-0007](docs/adr/ADR-0007-telematics-integration-strategy.md).
- **Vertical focus:** Dutch and broader European mid-market logistics (fleets of 50–500 vehicles).

The product is positioned **"TulipFleet — works best with TulipFleet"** in marketing and sales. Third-party compatibility is a sales-conversation answer, not a homepage message.

---

## Decision Summary

| Area              | Decision                                                     | ADR                                                       |
| ----------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| **Dispatcher UI** | Material Dashboard 2 PRO React TS (Creative Tim, Company License) + MD3 PRO React reference | [ADR-0001](docs/adr/ADR-0001-dispatcher-ui-stack.md)       |
| **VRP Solver**    | HERE Tour Planning API (managed), OR-Tools deferred as escape hatch | [ADR-0002](docs/adr/ADR-0002-vrp-solver.md)                |
| **Server Topology** | Hetzner CX32 + `enterprise-api.tulipfleet.com` subdomain   | [ADR-0003](docs/adr/ADR-0003-server-topology.md)           |
| **Database**      | Shared PostgreSQL, `public.*` / `enterprise.*` schema split, telematics-agnostic core | [ADR-0004](docs/adr/ADR-0004-database-strategy.md) (v2)    |
| **Dispatch Workflow** | Three-mode maturity model (Advisory → Exception-based → Agentic); Phase 1 ships Advisory only | [ADR-0005](docs/adr/ADR-0005-dispatch-workflow.md)         |
| **Map Widget**    | Leaflet + react-leaflet, Mapbox GL JS retained as upgrade option | [ADR-0006](docs/adr/ADR-0006-map-widget.md)                |
| **Telematics Integration** | Scenario C (flagship + open), customer-funded connectors only, strict phase gating | [ADR-0007](docs/adr/ADR-0007-telematics-integration-strategy.md) |

---

## Phase Plan

### Phase 1 — Architecture & Bootstrap (in progress)

**Goal:** Ship a working Advisory-mode dispatcher for the first paying customer using TulipFleet's own telematics.

#### Completed (as of 2026-05-13)

- ✅ **Dispatcher web app repository bootstrapped** — `tulipfleet-dispatcher` repo on GitHub, Material Dashboard 2 PRO React TS template imported, local dev environment verified.
- ✅ **Architectural decisions documented** — ADRs 0001–0007 written, reviewed, committed.
- ✅ **ADR-0004 revised to v2** — after inspecting production schema, decision adjusted to additive-only migration with documented `esp32_device_id` naming debt.
- ✅ **External Migration Tool pattern adopted** — `node-pg-migrate` installed globally on host (local + server), backend repo (`tulipfleet-backend`) `package.json` untouched; migration tool decoupled from runtime.
- ✅ **Enterprise schema migration applied to staging** (`fleet_tracking_staging`) — 10 vehicles backfilled with `provider='tulipfleet'`.
- ✅ **Enterprise schema migration applied to production** (`fleet_tracking`) — 9 vehicles backfilled, zero downtime, fresh backup taken pre-migration.
- ✅ **Schema enforcement in place:**
  - 4 enterprise tables (`telematics_source`, `locations_3p`, `routing_jobs`, `dispatch_tasks`)
  - `locations_3p` is a TimescaleDB hypertable (empty in Phase 1)
  - CHECK constraints on `dispatch_tasks.status` and `routing_jobs.status` (state machine, defense in depth)
  - Composite PRIMARY KEY on `locations_3p` for ETL idempotency
  - `update_timestamp()` triggers on tables with `updated_at`
- ✅ **Migration tracking active** — `pgmigrations` table records `1778687553584_enterprise-schema-init` on both staging and production.
- ✅ **May 11 production-only feature work preserved** — Vehicle DELETE protection (`DEVICE_ATTACHED` 409 response) and `company_name` in reports endpoints, both developed and deployed to production server on May 11 but never pushed, were rescued via feature branches (`feature/may11-prod-retroactive`) and merged into `main` during migration work. No regression to live service.

#### Architecture (target state)

- Dispatcher web app (Material Dashboard 2 PRO React TS) — repo bootstrapped, branding and screens to follow.
- New backend (`enterprise-api.tulipfleet.com`) on Hetzner CX32 — to be provisioned.
- Shared PostgreSQL with `enterprise.*` schema — **applied**.
- HERE Tour Planning API integration via the `IRoutingProvider` interface — to be built.
- Leaflet-based live fleet map subscribing to existing EMQX MQTT topics — to be built.

#### Pending — execution order

The order below reflects the critical path; later items depend on earlier ones.

**Sıra 0 — Hygiene (immediate)**
- Production untracked files cleanup: `seed_demo_data.js`, `simulate_locations_keepalive.js`, `*.bak` files. Each file either deleted or added to `.gitignore`. Decision per file.
- Two feature branches (now merged into `main`) can be deleted on GitHub: `feature/may11-prod-retroactive`, `feature/vehicle-delete-protection-and-company-name`.

**Sıra 1 — Enterprise backend repository**
- Create `tulipfleet-enterprise-backend` repo (GitHub, private).
- Fastify v4 skeleton (alignment with existing `tulipfleet-backend`, ADR-0008 — to be written).
- Plugins: `@fastify/postgres`, `@fastify/jwt`, MQTT subscriber.
- Connects to `enterprise.*` schema (read-mostly in Phase 1).
- **Does not write migrations** (schema authority remains in `tulipfleet-backend` per ADR-0004).
- First endpoint: `GET /api/dispatcher/vehicles` for connectivity verification.

**Sıra 2 — Hetzner CX32 provision + DNS + TLS**
- Provision `fleet-enterprise-01` (Hetzner CX32, Falkenstein, ~16 EUR/mo) per ADR-0003.
- DNS A record `enterprise-api.tulipfleet.com` → new server IP.
- Caddy or Nginx + Let's Encrypt certificate.
- Postgres `enterprise_backend` role with `SELECT` on `public.vehicles`, `public.companies`, `public.users`, `public.drivers`, `public.tasks`; `ALL` on `enterprise.*`; `statement_timeout = '10s'`.

**Sıra 3 — HERE Tour Planning sandbox**
- Account at developer.here.com.
- Sandbox API key (free tier, 30-day evaluation).
- First Tour Planning REST request from a notebook or curl to validate constraint syntax.
- Store key in `tulipfleet-enterprise-backend/.env`.

**Sıra 4 — Dispatcher UI: Live Fleet Map (first real screen)**
- Replace Material Dashboard 2 PRO placeholder map.
- Leaflet + react-leaflet, MapTiler tile provider (free tier).
- MQTT-over-WSS client connecting to existing EMQX broker.
- Dedicated EMQX user `dispatcher-readonly` (read-only ACL on `fleet/device/+/location`).
- Real-time markers for production vehicles.

**Sıra 5 — Vehicle / Driver / Task list screens**
- Material Dashboard 2 PRO DataTable components fed by enterprise backend `GET /api/dispatcher/*` endpoints.
- Filtering, sorting, pagination.

**Sıra 6 — Plan workflow (Advisory mode)**
- `POST /api/dispatcher/plans` — submit to HERE Tour Planning.
- `GET /api/dispatcher/plans/:id` — fetch status and result.
- `POST /api/dispatcher/plans/:id/approve` — commit plan to `enterprise.dispatch_tasks` and push to existing `public.tasks`.
- Plan review UI: map + timeline + Kanban views.

**Sıra 7 — Pilot customer onboarding**
- TulipFleet brand theming applied to dispatcher UI.
- Production deploy on `fleet-enterprise-01`.
- First customer pilot.

**Indicative timeline:** 6–9 weeks from completion of Sıra 0 to first-customer pilot, assuming single founder/developer pace.

#### Out of scope (explicitly)

- Third-party telematics connectors (Phase 2+).
- Auto-dispatch / exception-based mode (Phase 2).
- Agentic mode (Phase 3, ADR pending).
- Driver drowsiness / DMS computer vision (separate business line; ADR pending).
- Custom VRP engine / OR-Tools (escape hatch only, ADR-0002 §8).
- Mapbox GL JS migration (escape hatch only, ADR-0006 §7).

### Phase 2 — Customer-Driven Expansion

**Triggers (any of the below activates the corresponding work):**
- A paying customer signs a contract with budget for a specific third-party telematics connector → that connector is built.
- A paying customer requests Exception-based dispatch mode → Mode 2 rule engine is built.
- HERE Tour Planning cost or capability constraints materialize → escape hatch in [ADR-0002 §8](docs/adr/ADR-0002-vrp-solver.md#8-escape-hatch--when-to-reconsider-or-tools) is invoked.
- Leaflet performance ceiling is reached → Mapbox GL JS migration per [ADR-0006 §7](docs/adr/ADR-0006-map-widget.md#7-escape-hatch--when-to-reconsider-mapbox-gl-js).

**Out of scope:**
- Speculative connectors (no signed customer, no work — see [ADR-0007 §4](docs/adr/ADR-0007-telematics-integration-strategy.md)).
- Mode 3 agentic dispatch (Phase 3).
- Connector framework abstraction (Phase 3, when ≥3 connectors exist).

### Phase 3 — Maturity & Framework

**Triggers:**
- ≥3 customer-funded connectors exist → framework abstraction ADR is written.
- Mode 2 deployment data justifies a Mode 3 pilot with a specific customer → agentic dispatch ADR is written.
- Operational metrics (uptime, dispatch quality, customer satisfaction) support a softer "compatible with major European telematics providers" marketing position.

---

## Non-Goals

What TulipFleet Enterprise will **not** become, by explicit decision:

- **Not a vendor-neutral dispatch SaaS.** That market is commoditized; entering it without a moat is not the chosen path. See [ADR-0007](docs/adr/ADR-0007-telematics-integration-strategy.md).
- **Not a custom-VRP-engine vendor.** TulipFleet does not differentiate by having a better solver than HERE; it differentiates by hardware, MQTT-based event architecture, and vertical focus. See [ADR-0002](docs/adr/ADR-0002-vrp-solver.md).
- **Not a hardware-only product.** The dispatcher software is part of the product, not an add-on; the entire offering is sold as a platform.
- **Not a multi-tenant Mode-3 agentic product on launch.** Liability, trust, and operational maturity all require gradual progression. See [ADR-0005](docs/adr/ADR-0005-dispatch-workflow.md).

---

## Cross-Cutting Disciplines

### Phase gating

Most strategic risk in this product comes from **drift across phases**, not from architectural error. Phase advancement is gated on signed customer contracts, measured needs, and explicit ADR amendments — not internal enthusiasm. This discipline is the most important cross-cutting commitment in this roadmap.

### Customer-funded integration

No third-party connector is built speculatively. The pattern is: customer signs, connector is built, recurring revenue covers maintenance. Speculative connectors are the recurring failure mode of Scenario-C platforms; the registry table `enterprise.telematics_source` exists explicitly to make this discipline visible.

### `Works better with TulipFleet`

Where the dispatcher can do **more** when paired with TulipFleet's own hardware, those asymmetries are preserved and surfaced. This protects the hardware moat even as the dispatcher admits third-party telematics. See feature tiering in [ADR-0007 §7](docs/adr/ADR-0007-telematics-integration-strategy.md#7-feature-tiering--reference-for-phase-1).

### Decision optionality

Every major dependency (VRP solver, map widget, third-party telematics) is wrapped in an internal interface. Switching cost is bounded to weeks, not quarters. The `IRoutingProvider`, `ITelematicsProvider`, and React-Leaflet abstractions are all examples of this principle.

### External Migration Tool

Schema migrations are not a runtime concern. The migration tool (`node-pg-migrate`) lives outside production containers — installed globally on host or invoked from a developer workstation. The `tulipfleet-backend` repo carries migration SQL files but does **not** ship the tool as a runtime dependency. This pattern preserves production container stability and eliminates dependency-conflict regressions in `server.js`.

### Production safety protocol

Production database changes follow a strict sequence: staging-first → smoke test → fresh backup → production → smoke test. No migration runs without an immediate pre-migration backup. Container memory vs. disk synchronization is verified after any disk-level git operation (`git reset`, `git pull`, `git checkout`) on production, because Node.js processes cache `require`'d modules and a disk-level revert can create a silent regression window.

---

## Repository Map

| Repository                | Purpose                                                                       |
| ------------------------- | ----------------------------------------------------------------------------- |
| `tulipfleet-dispatcher`   | This repo. Dispatcher web UI. Material Dashboard 2 PRO React TS based.        |
| `tulipfleet-backend`      | Existing Fastify backend serving `api.tulipfleet.com` (mobile app + admin). **Also schema authority** — owns all migration files (`migrations/`). |
| `tulipfleet-enterprise-backend` | (To be created — Sıra 1.) New Fastify backend serving `enterprise-api.tulipfleet.com`. Consumes `enterprise.*` schema, does not write migrations. |
| `tulipfleet`              | Existing React Native (Expo) driver and admin app.                            |
| `tulipfleet-qa`           | QA documentation (`DEMO_OLUSTURMA.md`, infrastructure notes, schema conventions). |

---

## Document Conventions

- **ADRs** record decisions, with rationale and consequences. They are immutable once accepted; new decisions get new ADRs that supersede older ones (e.g., ADR-0004 v2 supersedes v1).
- **This ROADMAP** is the executive summary. It is updated as the phase status changes or as new ADRs are added.
- **READMEs** in each repo describe how to run that codebase locally.

---

## Change Log

| Date       | Change                                                                      |
| ---------- | --------------------------------------------------------------------------- |
| 2026-05-13 (initial) | Initial roadmap. ADRs 0001–0007 accepted. Phase 1 (Architecture & Bootstrap) in progress. |
| 2026-05-13 (update)  | Schema migration applied to staging and production. ADR-0004 revised to v2. External Migration Tool pattern documented. May 11 production-only feature work rescued via feature branches and merged into `main`. Sıra 0–7 execution order documented. Production safety protocol cross-cutting discipline added. |
