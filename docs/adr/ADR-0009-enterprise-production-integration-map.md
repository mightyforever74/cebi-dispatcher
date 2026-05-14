# ADR-0009: Enterprise ↔ Production Integration Map

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Status**        | Accepted                                                               |
| **Version**       | 1                                                                      |
| **Date**          | 2026-05-14                                                             |
| **Decision by**   | Cem sahinkaya (Founder / Lead Engineer)                                    |
| **Component**     | TulipFleet existing production ↔ TulipFleet Enterprise Dispatcher      |
| **Related**       | ADR-0003 (Server topology), ADR-0004 v2 (Database strategy), ADR-0005 (Dispatch workflow), ADR-0007 (Telematics integration), ADR-0008 (Fastify v4) |

---

## 1. Context

The existing TulipFleet production system serves a mobile driver app, an admin web panel, and ESP32 telematics devices. It runs on Hetzner `fleet-prod-01` with Fastify backend (`api.tulipfleet.com`), PostgreSQL+TimescaleDB, EMQX MQTT broker, and Redis. As of May 2026, it has 9 production vehicles, 4 drivers, and is in active use by paying customers.

The new TulipFleet Enterprise Dispatcher introduces a parallel system:

- New backend (`tulipfleet-enterprise-backend`) serving `enterprise-api.tulipfleet.com` on a separate Hetzner CX32 (per [ADR-0003](ADR-0003-server-topology.md)).
- New dispatcher web UI (`tulipfleet-dispatcher`).
- Shared PostgreSQL with `enterprise.*` schema (per [ADR-0004 v2](ADR-0004-database-strategy.md)).

Multiple discrete decisions about the integration between these two systems have been made across other ADRs, in chat sessions, and during the May 13, 2026 schema migration. **None of them are consolidated in a single integration map.** This creates risk:

- New developers (or future founder revisiting) cannot see the full integration picture without reading every ADR.
- Phase 1 backend skeleton work could miss a constraint that was decided but not surfaced.
- Mobile app team (driver app) does not have a clear statement of what changes / does not change for them.

This ADR is the **consolidated integration map**. It does not introduce new decisions; it surfaces and consolidates existing decisions across ADRs 0003, 0004 v2, 0005, 0007 and confirmed operational realities.

## 2. Decision

**Adopt the integration model documented in this ADR.** Specifically:

1. **Two backends, one database, one MQTT broker, one Redis** — shared infrastructure with role-separated access (per ADR-0003 + 0004).
2. **Schema authority is `tulipfleet-backend`.** All schema migrations live in `tulipfleet-backend/migrations/`. Enterprise backend reads `public.*`, reads + writes `enterprise.*`, but **never writes migrations**.
3. **Mobile driver app does not change in Phase 1.** No new fields surfaced to drivers, no new endpoints called by driver app, no API contract changes.
4. **Dispatcher users are a new role.** New `role = 'dispatcher'` value in `public.users.role` — additive, does not affect existing roles (`super_admin`, `company_admin`, `driver`).
5. **`enterprise.dispatch_tasks` → `public.tasks` is a one-way bridge.** Dispatcher-created and dispatcher-approved plans flow into the driver-facing task model. Driver actions on `public.tasks` are not synced back to `enterprise.dispatch_tasks` in Phase 1 (status mirroring deferred).
6. **MQTT topic structure unchanged in Phase 1.** Existing `fleet/device/+/*` topics are read by both backends; dispatcher backend subscribes read-only.

## 3. Architecture Diagram

```
                  Internet
                     |
        +------------+------------+
        |                         |
        v                         v
   api.tulipfleet.com    enterprise-api.tulipfleet.com
   (existing)            (new, ADR-0003)
        |                         |
        v                         v
   +---------------+      +-----------------------+
   | fleet-backend |      | enterprise-backend    |
   | (Docker,      |      | (Docker or PM2,       |
   |  Fastify v4)  |      |  Fastify v4 — ADR-0008)|
   |               |      |                       |
   | Path:         |      | New server:           |
   | /opt/fleet/   |      | fleet-enterprise-01   |
   | backend/      |      | (Hetzner CX32)        |
   +-------+-------+      +-----------+-----------+
           |                          |
           |    +----------------+    |
           +--->| PostgreSQL +   |<---+
           |    | TimescaleDB    |
           |    | (shared)       |
           |    |                |
           |    | public.*       |
           |    | enterprise.*   |
           |    +----------------+
           |                          |
           |    +----------------+    |
           +--->| EMQX MQTT      |<---+ (subscribe-only in Phase 1)
           |    | (shared)       |
           |    +----------------+
           |                          |
           |    +----------------+    |
           +--->| Redis          |<---+ (separate key prefix)
                | fleet:*  |          |
                | enterprise:*       |
                +----------------+

   Mobile driver app           Dispatcher web UI
   (existing, unchanged)       (new)
        |                            |
        v                            v
   api.tulipfleet.com         enterprise-api.tulipfleet.com
```

## 4. Concrete Integration Points

### 4.1 PostgreSQL — read/write access matrix

| Schema / Table          | `tulipfleet-backend` (existing role: `fleetadmin`) | `enterprise-backend` (new role: `enterprise_backend`) |
| ----------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| `public.companies`      | ALL                                                | SELECT                                                |
| `public.users`          | ALL                                                | SELECT                                                |
| `public.drivers`        | ALL                                                | SELECT                                                |
| `public.vehicles`       | ALL                                                | SELECT                                                |
| `public.tasks`          | ALL                                                | SELECT, **INSERT** (Section 4.4)                      |
| `public.task_events`    | ALL                                                | SELECT                                                |
| `public.locations`      | ALL                                                | SELECT                                                |
| `public.alerts`         | ALL                                                | SELECT                                                |
| `public.devices`        | ALL                                                | SELECT                                                |
| `public.geofences`      | ALL                                                | SELECT                                                |
| `public.*` (other)      | ALL                                                | (no access unless explicitly granted)                 |
| `enterprise.*` (all)    | (no access — schema isolation)                     | ALL                                                   |

Enterprise backend role has `statement_timeout = '10s'` to bound runaway query impact on production driver-facing workload (per ADR-0003 §5.2).

### 4.2 MQTT topic access

| Topic pattern                  | `fleet-backend` | `enterprise-backend`                                                        |
| ------------------------------ | --------------- | --------------------------------------------------------------------------- |
| `fleet/device/+/location`      | subscribe + ack | subscribe (read-only for live map per ROADMAP Sıra 4)                       |
| `fleet/device/+/behavior`      | subscribe + ack | subscribe (read-only for behavior surfacing in dispatcher)                  |
| `fleet/device/+/alert`         | subscribe + ack | subscribe (read-only for dispatcher alerts panel)                           |
| `fleet/truck/+/command`        | publish         | (no access in Phase 1 — dispatcher commands flow via REST, not MQTT)        |
| `enterprise/*` (any)           | (none)          | (reserved for Phase 2+ if direct command publish becomes needed)            |

A dedicated EMQX user `dispatcher-readonly` is created in ROADMAP Sıra 4 with an ACL restricting it to the `subscribe` operation on the above patterns.

### 4.3 Redis key namespace separation

- Existing backend prefix: `fleet:*` (sessions, rate limit counters, MQTT message dedup, etc.)
- Enterprise backend prefix: `enterprise:*` (HERE result cache, dispatcher session, plan computation cache)
- No shared keys. No cross-prefix invalidation.

### 4.4 Task lifecycle — `enterprise.dispatch_tasks` ↔ `public.tasks`

This is the most operationally important integration boundary. The two task models exist for different audiences:

- **`enterprise.dispatch_tasks`** — what the dispatcher sees and plans. States: `draft`, `planned`, `assigned`, `in_progress`, `completed`, `failed`, `cancelled` (CHECK-constrained in migration).
- **`public.tasks`** — what the driver sees and acts on. Existing state machine: `pending_review`, `accepted`, `in_progress`, `completed`, etc.

**Phase 1 flow (one-way, dispatcher to driver):**

```
1. Dispatcher creates plan.
   - enterprise.dispatch_tasks row created (status='draft')
   - enterprise.routing_jobs row created (HERE submission)

2. HERE returns plan; dispatcher reviews.
   - enterprise.dispatch_tasks rows update to status='planned'

3. Dispatcher approves plan.
   - enterprise.dispatch_tasks rows update to status='assigned'
   - Enterprise backend INSERTs corresponding public.tasks rows
     (with linked enterprise_dispatch_task_id metadata, see Section 4.5)
   - public.tasks rows enter the existing driver task flow

4. Driver accepts/works on public.tasks as usual.
   - Existing flow: pending_review → accepted → in_progress → completed
   - No changes to driver app, no new fields shown
```

**What is NOT synced back to enterprise in Phase 1:**

- Driver's acceptance of `public.tasks` is not mirrored to `enterprise.dispatch_tasks.status`.
- Driver's completion of `public.tasks` is not mirrored to `enterprise.dispatch_tasks.status='completed'`.
- The dispatcher sees `assigned` status persistently after approve; "completion" tracking is a Phase 2 feature.

**Why this asymmetry in Phase 1:**

- Avoids touching the driver mobile app's API contract (Section 4.6).
- Avoids new event publishing infrastructure.
- Dispatcher's "advisory mode" (per ADR-0005 Mode 1) does not need real-time driver feedback to operate.
- Phase 2 will introduce two-way sync via either (a) database triggers or (b) explicit event subscription.

### 4.5 Cross-schema reference convention

To preserve traceability between dispatcher plans and driver tasks:

- `public.tasks` will gain a new **optional nullable column** `enterprise_dispatch_task_id uuid` in a future migration (not in the initial enterprise schema migration; deferred to first dispatcher endpoint development).
- When dispatcher creates a `public.tasks` row, it sets `enterprise_dispatch_task_id` to the corresponding `enterprise.dispatch_tasks.id`.
- Mobile-app-created tasks (existing flow) leave this column NULL.
- Foreign key constraint is **deferred** to avoid blocking driver task creation if enterprise schema is temporarily unavailable; a soft reference instead.

This addition is **a future migration**, not in scope for Phase 1 bootstrap. It will be tracked under ROADMAP Sıra 6.

### 4.5.1 Compliance Engine inheritance (added 2026-05-14)

ADR-0012 introduces the NL Compliance Layer as a Phase 1 internal module evolving toward a Phase 3 standalone product. To preserve architectural integrity, the Compliance Engine inherits the following ADR-0009 disciplines:

**Schema authority.** All Compliance Engine migrations (e.g., `enterprise.nl_compliance_zones`) are written in `tulipfleet-backend/migrations/`. The Compliance module — regardless of which process or future server it runs on — never writes migrations directly. Schema authority remains `tulipfleet-backend` (ADR-0004 v3 §2).

**Database role constraints.** Compliance Engine runs as a Fastify plugin within `enterprise-backend` in Phase 1, using a dedicated connection pool but the same PostgreSQL role (`enterprise_backend`). The role's `statement_timeout = '10s'` constraint (ADR-0003 §5.2) applies to compliance queries. In Phase 3, if Compliance Engine is extracted to a standalone service, it receives its own role `compliance_backend` with the same timeout policy and read-mostly grants on `enterprise.nl_compliance_zones` plus SELECT on `public.vehicles` (for plate lookups).

**Database access matrix extension.** ADR-0009 §4.1 (PostgreSQL read/write access matrix) is extended:

| Schema / Table                     | `enterprise_backend` (Phase 1-2) | `compliance_backend` (Phase 3) |
| ---------------------------------- | -------------------------------- | ------------------------------ |
| `enterprise.nl_compliance_zones`   | ALL                              | ALL (read+write own data)      |
| `public.vehicles`                  | SELECT (already granted)         | SELECT (plate lookup)          |
| `public.companies`                 | SELECT (already granted)         | SELECT (tenant resolution)     |
| All other tables                   | per ADR-0009 §4.1                | (no access unless granted)     |

**MQTT topic access.** Compliance Engine has **no MQTT access** in Phase 1-2. If future use cases require subscription (e.g., real-time vehicle location for live compliance check), the Compliance Engine receives its own `compliance-readonly` EMQX user; cross-cutting access via `enterprise_backend` user is not permitted (separation of concerns).

**Redis key namespace.** Compliance Engine uses prefix `compliance:*` for any cached data (e.g., HERE Tour Planning compliance-aware route cache, ontheffing rule cache). No shared keys with `fleet:*` or `enterprise:*` prefixes.

**Statement timeout discipline.** All compliance queries respect the 10-second statement timeout. Long-running compliance data updates (Phase 2 nightly sync) are implemented as separate worker processes (per ADR-0012 §4.4), not as in-request queries.

**Tenant isolation.** Compliance Engine respects company-level tenant isolation: when a dispatcher queries "can vehicle X access Amsterdam ZE-zone today," the request includes the requesting company's `company_id` and the response is logged with that ID. In Phase 3 standalone product, the API key authentication maps to a customer ID that plays the same isolation role.

**Audit logging.** Compliance queries (especially Phase 2-3 when external customers depend on them) generate audit log entries in a Phase 2 to-be-defined `enterprise.compliance_query_log` table (deferred — schema decision in ADR-0012 Phase 2 trigger).

This addendum does not alter any other Section of ADR-0009. Schema authority (§7.1), shared infrastructure risks (Section 6), and integration boundaries (§4.4 task lifecycle, §4.6 mobile app no-change) all apply unchanged.

### 4.6 Mobile driver app — Phase 1 scope of changes

**No changes required to the mobile driver app for Phase 1 dispatcher launch.** Specifically:

- No new API endpoints called by the driver app.
- No new fields displayed to the driver in their task list.
- No new authentication or onboarding flow.
- Existing task flow (`pending_review` → `accepted` → `in_progress` → `completed`) continues unchanged.
- ESP32 firmware unchanged.

**Why this matters:** Driver app changes have a long deployment tail (Apple App Store review, Google Play review, driver device update opt-in). Decoupling dispatcher launch from driver app changes shortens Phase 1 time-to-market and reduces the surface area of "what could go wrong."

The dispatcher's value proposition in Phase 1 — Advisory-mode planning, real-time fleet map, plan-and-approve workflow — does not require driver app participation beyond the existing task pickup.

### 4.7 Admin web panel — Phase 1 scope of changes

**No changes required to the admin web panel for Phase 1 dispatcher launch.** Reasoning:

- The admin panel manages company-level configuration (drivers, vehicles, geofences, billing).
- Dispatcher introduces dispatcher-level operations (planning, dispatching).
- A dispatcher is a **new role** with its own UI (the dispatcher web app); not surfaced in admin panel UI.
- Admin panel may eventually grow a "Dispatcher access management" tab to grant/revoke dispatcher role membership, but this is Phase 2+.

## 5. Authentication and Authorization

### 5.1 New role: `dispatcher`

`public.users.role` currently accepts `'super_admin' | 'company_admin' | 'driver'` (per existing schema). Phase 1 adds a fourth value: `'dispatcher'`.

- A new `dispatcher` user is created by `company_admin` of the company.
- `dispatcher` cannot access driver mobile-app features.
- `dispatcher` cannot edit company billing or driver accounts (no overlap with `company_admin`).
- `dispatcher` can: view all vehicles/drivers/tasks of the company, create/approve plans, view enterprise metrics.

**Implementation note:** This requires a small schema modification to `public.users.role` CHECK constraint (or equivalent enum). This is a **future migration** in `tulipfleet-backend/migrations/` and will accompany the first dispatcher-aware endpoint.

### 5.2 Auth flow

The dispatcher web UI authenticates against `enterprise-api.tulipfleet.com` using the **same JWT mechanism** as the mobile app:

- Login: `POST /api/auth/login` (existing endpoint, on `api.tulipfleet.com`) — returns JWT
- JWT signed by the same secret used by mobile + admin backends
- `enterprise-backend` validates the JWT, checks `role = 'dispatcher'`
- 401 if role mismatch

**Why reuse the existing login endpoint:** Single source of truth for user authentication; no parallel auth system; password resets, MFA (when added), and account locking are all centralized.

**Future evolution:** When dispatcher login is fully separated (e.g., SSO/SAML for enterprise customers), a dedicated dispatcher auth flow is introduced in a future ADR. Phase 1 reuses existing.

### 5.3 Tenant isolation

Existing pattern is preserved: every query in `enterprise-backend` enforces `company_id = <requester's company_id>` at the application layer. `enterprise.*` tables have non-null `company_id` FKs to `public.companies(id)`, consistent with the existing pattern in `public.*`.

No row-level security (RLS) in Phase 1; application-layer guards remain authoritative.

## 6. Operational Realities (confirmed during May 13 migration)

These items are not new decisions but operational facts that must be respected during integration work.

### 6.1 Container vs. disk synchronization

The existing `fleet-backend` container uses a Docker bind mount: `./backend:/app`. Host disk changes are visible to the container, but Node.js process memory caches `require`'d modules at startup. Disk-level git operations (`git pull`, `git reset`, `git checkout`) can create a **silent regression window** where:

- Disk shows old code.
- Container memory runs current code.
- Container restart at this moment loads disk version — regression.

This was experienced during the May 13 migration and is now documented as **Production safety protocol** in ROADMAP. Any future cross-system change that requires disk modification on the production server must:

1. Push the merged code to `origin/main` first.
2. Pull on production after merge is complete.
3. Verify `md5sum` of host and container versions match.
4. Avoid `git reset` against production unless the corresponding `git pull` will follow immediately.

The new `enterprise-backend`, deployed on a separate server, eliminates this specific risk for enterprise code but does not eliminate it for cross-cutting work (e.g., updates to `tulipfleet-backend/migrations/` directory).

### 6.2 Staging database is not a production clone

Per `DEMO_OLUSTURMA.md` and the infrastructure documentation, `fleet_tracking_staging` is **schema-only synced** with production, never data-cloned. TimescaleDB hypertable chunk metadata copying causes INSERT failures.

**Implication for enterprise backend:** Staging-tested enterprise code must not rely on production-data patterns being present. Test data must be seeded explicitly (per existing seed scripts).

### 6.3 Hypertable INSERT discipline

`public.locations`, `public.alerts`, `enterprise.locations_3p` are TimescaleDB hypertables with `ts_insert_blocker` triggers. Direct `psql` INSERT fails. All inserts must go through application code (Fastify routes, ETL workers).

**Implication for enterprise backend:** When Phase 2 third-party telematics ETL is built, the ETL workers must respect hypertable INSERT rules. Direct migration-level INSERT into `enterprise.locations_3p` is forbidden (per ADR-0004 v2 §7.5).

### 6.4 PostgreSQL connection limits

Existing PostgreSQL container has default connection limit (~100). With `tulipfleet-backend` pooling and `enterprise-backend` pooling concurrently, connection pressure is real.

**Implication:** Both backends must use connection pooling (default in `@fastify/postgres`). Pool size for `enterprise-backend` initially set to 10 (conservative); revisit if measured.

## 7. Cross-Cutting Patterns

### 7.1 Schema migration ownership

Single source of truth: `tulipfleet-backend/migrations/`. The enterprise backend repository **does not contain any schema migration files**. All schema changes — even those purely within the `enterprise` schema — are committed to `tulipfleet-backend` and applied via the external `node-pg-migrate` tool (per ROADMAP "External Migration Tool" discipline).

This may feel counter-intuitive ("the enterprise backend should own its enterprise tables"), but the discipline avoids:

- Two repositories independently mutating the same database.
- Migration ordering conflicts.
- Drift between code-deployed-here and schema-deployed-there.

### 7.2 Shared library option (deferred)

If common utility code emerges between the two backends (e.g., JWT validation logic, MQTT subscription scaffolding, error helpers), the options are:

- **A) Copy-paste with discipline** — fine for 2-3 small utilities.
- **B) Shared npm package** — `@tulipfleet/common` or similar, published private.
- **C) Monorepo migration** — combine both into a single repository.

Phase 1: **A**. Phase 2 if 5+ shared utilities emerge: evaluate B. Phase 3 if release coordination becomes painful: evaluate C.

ADR-0008 (Fastify v4) preserves the option for monorepo consolidation by maintaining version alignment.

### 7.3 Observability and monitoring

Both backends emit logs and metrics. Phase 1 approach:

- **Logs:** Both backends log to stdout (Docker captures); Loki or similar log aggregator deferred.
- **Health endpoints:** Both backends expose `/health` returning DB + MQTT + Redis status.
- **Uptime monitoring:** Existing Uptime Kuma (or similar) gets a second target for `enterprise-api.tulipfleet.com/health`.
- **Performance monitoring:** Deferred. APM tooling (Datadog, New Relic) considered Phase 2+.

### 7.4 Deployment coordination

`tulipfleet-backend` and `enterprise-backend` are deployed independently. There is no atomic "deploy both at once" requirement in Phase 1. Integration boundaries (Section 4) are designed so that:

- Updates to `tulipfleet-backend` do not require `enterprise-backend` redeploy (unless they change `public.tasks` schema in a breaking way — handled by versioning).
- Updates to `enterprise-backend` do not require `tulipfleet-backend` redeploy.
- Database migrations affect both, but migrations are additive (per ADR-0004 v2) so live backends gracefully continue running during a migration.

## 8. Phase Boundaries

This map describes **Phase 1**. Phase 2 expansions that are anticipated but deferred:

- **Two-way task lifecycle sync** (Section 4.4) — driver app `public.tasks` status changes mirror to `enterprise.dispatch_tasks`.
- **Cross-schema FK** on `public.tasks.enterprise_dispatch_task_id` — soft reference becomes hard FK once stability is established.
- **MQTT publish** from enterprise backend — for direct vehicle commands in Mode 2/3 dispatch (per ADR-0005).
- **Read replica** for `enterprise-backend` — if contention emerges, a streaming replica on `fleet-enterprise-01`.
- **Shared library extraction** (Section 7.2 Option B) — if utility duplication grows.
- **Dispatcher access management UI** in admin panel — Phase 2 housekeeping.

Each of these has explicit triggers and is **not** built speculatively.

## 9. Consequences

### 9.1 Positive

- Single integration document — onboarding, refresher reading, and external review all benefit.
- Clear answer to "does the mobile app change?" → **no**, removing a class of risk from Phase 1 launch.
- Clear schema authority — no two repos mutating the database.
- Driver experience untouched — existing customer experience preserved.

### 9.2 Negative / accepted trade-offs

- **One-way task sync in Phase 1** means dispatcher does not see "task completed by driver" in real time. Acceptable for Advisory mode; revisited in Phase 2.
- **Shared infrastructure risk** — runaway query, MQTT flood, Redis eviction — affects both backends. Mitigations in Section 6 (statement timeout, key prefix, etc.).
- **No SSO / enterprise auth in Phase 1** — JWT reuse means dispatcher users authenticate against the consumer-style endpoint. Acceptable for the first cohort; SSO is a future ADR.
- **Cross-schema joins** — dispatcher queries traversing `public.*` and `enterprise.*` rely on PostgreSQL's cross-schema performance. Monitored via slow query log; not expected to be a bottleneck at Phase 1 scale.

## 10. Open Questions

- **Dispatcher role permissions detail.** When a `dispatcher` user is created by `company_admin`, what specific UI elements / API endpoints become accessible? To be detailed in dispatcher backend route definitions.
- **Multi-company dispatcher.** Should a dispatcher user be assignable to multiple companies (e.g., a 3PL dispatcher serving several clients)? Defer to Phase 2 customer requirement.
- **API versioning strategy.** Both backends currently expose `/api/*` without explicit versioning. Phase 2 may require `/api/v1/*` and `/api/v2/*` boundaries.
- **Disaster recovery.** Shared infrastructure means a single DB outage takes down both backends. DR plan (backup restoration, RTO/RPO) deferred to operational maturity work.

## 11. References

- ADR-0003 (Server topology — defines two-server split and shared infra)
- ADR-0004 v2 (Database strategy — defines schema authority and split)
- ADR-0005 (Dispatch workflow — defines task state machine)
- ADR-0007 (Telematics integration — defines `enterprise.telematics_source` registry)
- ADR-0008 (Fastify v4 — defines backend stack alignment)
- ROADMAP (defines Sıra 0–7 execution order and External Migration Tool discipline)
- TulipFleet QA `DEMO_OLUSTURMA.md` (operational realities §6)
- Infrastructure documentation (server credentials, deploy procedures, hypertable rules)

---

## 12. Change Log

| Version | Date       | Author    | Change                                                |
| ------- | ---------- | --------- | ----------------------------------------------------- |
| 1       | 2026-05-14 | Cem sahinkaya | Initial integration map consolidating cross-ADR decisions. |
| 1.1 (addendum) | 2026-05-14 | Cem sahinkaya | Added §4.5.1 — Compliance Engine architectural inheritance (per ADR-0012). Schema authority, database role constraints, MQTT access, Redis namespace, statement timeout, tenant isolation, audit logging — all confirmed to apply to Compliance Engine in Phase 1, Phase 2, and Phase 3 standalone product. |
