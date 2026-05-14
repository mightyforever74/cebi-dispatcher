# ADR-0004: Database Strategy and Telematics-Agnostic Schema

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Status**        | Accepted                                                               |
| **Version**       | 2 (supersedes v1 dated 2026-05-13)                                     |
| **Date**          | 2026-05-13                                                             |
| **Decision by**   | Cem sahinkaya (Founder / Lead Engineer)                                    |
| **Component**     | TulipFleet Enterprise — Data Layer                                     |
| **Supersedes**    | ADR-0004 v1 (proposed full vehicles/devices ideal model before inspecting production schema) |
| **Related**       | ADR-0002 (VRP solver), ADR-0003 (Server topology), ADR-0007 (Telematics integration strategy) |

---

## 1. Context

TulipFleet's existing data layer is a single PostgreSQL 15 + TimescaleDB instance with 36 tables under `public`, a `company_id` discriminator providing **tenant isolation**, and an existing data model that already includes `public.vehicles`, `public.devices`, `public.locations` (TimescaleDB hypertable), `public.companies`, `public.users`, and related operational tables.

TulipFleet Enterprise Phase 1 introduces new dispatcher-specific concerns:

- **Dispatch tasks** with state machines beyond the current driver task model.
- **Routing jobs** persisted across HERE Tour Planning API submissions.
- **Telematics integration** — per ADR-0007, TulipFleet commits to a Scenario-C posture: TulipFleet's own telematics is the flagship data source, but the dispatcher must be **telematics-agnostic at the data layer** so third-party telematics (Geotab, Verizon Connect, Samsara, etc.) can feed in via customer-funded connectors in Phase 2+.

This v2 of the ADR was written **after** inspecting the production schema and discovering an important reality that v1 did not account for. The migration plan and the naming-debt acknowledgement below are the substantive changes from v1.

## 2. Decision

Adopt **one PostgreSQL instance, two-schema separation, and Phase 1 schema additions only (no modifications to existing `public.*` tables).**

### 2.1 Single instance, two schemas

- One PostgreSQL 15 + TimescaleDB instance (existing `fleet-prod-01` host, port 5433).
- **`public.*`** — existing tables; shared between the mobile driver app, the admin app, and the enterprise dispatcher. **Bootstrap aşamasında (Mayıs 2026 enterprise schema migration ile birlikte) public.* tablolarının yapısı korunur. Bootstrap sonrası Phase 1 development süresince ise dispatcher entegrasyonu için gerekli olan eklemeli (additive) ve geriye dönük uyumlu (nullable veya CHECK constraint genişletmesi) değişikliklere izin verilir. Tüm bu değişiklikler tulipfleet-backend/migrations/ altında yazılır (schema authority değişmez). Bu Phase 1 boyunca planlanan değişiklikler Section 6 (yeni) altında listelenmiştir**
- **`enterprise.*`** — new tables; used only by the enterprise dispatcher backend.

### 2.2 New enterprise tables (schema-only, no behavioral changes to existing system)

```sql
-- Maps each vehicle to one or more telematics sources.
-- Phase 1: backfilled with provider='tulipfleet' for all existing vehicles.
-- Phase 2+: rows for 'geotab', 'verizon', 'samsara', etc.
CREATE TABLE enterprise.telematics_source (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id   uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider     text NOT NULL,
  config       jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON enterprise.telematics_source (vehicle_id, is_active);
CREATE INDEX ON enterprise.telematics_source (company_id, provider);

-- 3rd-party telemetry feeds, ETL'd from external sources.
-- Empty in Phase 1.
CREATE TABLE enterprise.locations_3p (
  vehicle_id   uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  provider     text NOT NULL,
  time         timestamptz NOT NULL,
  latitude     double precision,
  longitude    double precision,
  speed        double precision,
  heading      double precision,
  raw_payload  jsonb NOT NULL,
  company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE
);
SELECT create_hypertable('enterprise.locations_3p', 'time');
CREATE INDEX ON enterprise.locations_3p (vehicle_id, time DESC);

-- VRP solver submissions (HERE Tour Planning per ADR-0002).
CREATE TABLE enterprise.routing_jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider         text NOT NULL DEFAULT 'here',
  provider_job_id  text,
  request_hash     text NOT NULL,
  status           text NOT NULL,
  request_payload  jsonb NOT NULL,
  response_payload jsonb,
  submitted_at     timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz,
  error_message    text
);
CREATE INDEX ON enterprise.routing_jobs (company_id, status);
CREATE UNIQUE INDEX ON enterprise.routing_jobs (request_hash)
  WHERE status = 'completed';

-- Dispatch task state machine (separate from existing public.tasks).
CREATE TABLE enterprise.dispatch_tasks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status              text NOT NULL,
  assigned_vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  assigned_driver_id  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  pickup_location     jsonb NOT NULL,
  dropoff_location    jsonb NOT NULL,
  time_window_start   timestamptz,
  time_window_end     timestamptz,
  capacity_required   jsonb,
  skill_required      text[],
  routing_job_id      uuid REFERENCES enterprise.routing_jobs(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON enterprise.dispatch_tasks (company_id, status);
CREATE INDEX ON enterprise.dispatch_tasks (assigned_vehicle_id, status);
```

### 2.3 Tenant isolation continues to apply

Every new `enterprise.*` table includes a non-null `company_id` foreign key. Application-layer guards (existing pattern in the Fastify backend) enforce that every query is scoped to the requester's `company_id`. PostgreSQL Row-Level Security (RLS) is **not** introduced in Phase 1 but is a future option.

## 3. Rationale

### 3.1 Why one PostgreSQL instance, two schemas

- Shared business entities (`public.companies`, `public.users`, `public.vehicles`, `public.drivers`) are consumed by both the mobile app and the dispatcher; separate instances would introduce eventual-consistency problems.
- Single instance = single backup, single restore procedure, single connection-pool story.
- PostgreSQL roles + schemas provide clean access separation without a second instance.
- **Migration isolation:** Enterprise schema migrations can run independently. The mobile-app team's deployment cadence is not affected.

### 3.2 Why no changes to existing public.* in Phase 1

Inspection of production revealed that the existing schema is **already telematics-permissive in practice**, even though it appears to be TulipFleet-specific by naming:

- `public.vehicles.esp32_device_id` is `VARCHAR NOT NULL` and currently holds either real ESP32 chip IDs (e.g., `44A37697090`) or placeholder strings (e.g., `DEMO-ESP-004`) for vehicles without a physical device.
- The join `JOIN vehicles v ON l.device_id = v.esp32_device_id` (backend `server.js:1932`) requires this column to be non-null for the dispatcher map to display a vehicle's positions.
- The column is therefore best understood as **"primary telematics identifier"** under a TulipFleet-era name, **not** as a strict ESP32 hardware foreign key.

Given this reality, two facts hold simultaneously:

1. The existing system is already capable of representing non-TulipFleet vehicles by using a placeholder/external-id convention in `esp32_device_id`.
2. The column **name** is misleading and will eventually need to be corrected, but doing so requires updating every reference in the backend and mobile app — a multi-day refactor with non-trivial production risk.

This ADR accepts the existing column as-is for Phase 1 and treats the rename as **documented technical debt** (Section 4).

### 3.3 Why telematics-agnostic enterprise schema regardless

The new `enterprise.*` tables are designed telematics-agnostic from the start. The reasoning is forward-looking, not retrospective:

- `enterprise.telematics_source` maps vehicles to providers and is the registry that gates third-party ingestion per ADR-0007.
- `enterprise.locations_3p` is a separate hypertable for third-party telemetry; it does not pollute the existing `public.locations` hypertable that the mobile app and TulipFleet hardware are tied to.
- Dispatcher logic reads from a normalized abstraction that joins `public.vehicles` with `enterprise.telematics_source` and (in Phase 2+) `enterprise.locations_3p`, never relying on `vehicles.esp32_device_id` semantics directly.

This means: even though the *physical* schema retains the historical TulipFleet-era naming in `public.*`, the *logical* model exposed to the dispatcher business logic is telematics-agnostic.

### 3.4 Why `telematics_source` is a "strategic brake" (unchanged from v1)

`enterprise.telematics_source` is not merely a configuration table. It is the single point of control that gates third-party telematics ingestion:

- No connector can begin ingesting without a corresponding row.
- Customer-funded connector terms (ADR-0007) are physically reflected in this table.
- Auth tokens, polling cursors, and field mappings live here, so each connector ETL is parameterized rather than hard-coded.
- Removing a customer's connector (offboarding, contract end) is `is_active = false`, not a code deploy.

### 3.5 Why `dispatch_tasks` is separate from existing `public.tasks` (unchanged from v1)

- `public.tasks` represents the **driver-facing task** model (mobile app), with its own state machine (`pending_review → accepted → in_progress → completed`).
- `enterprise.dispatch_tasks` represents the **dispatcher-facing task** model, with a wider state machine and a lifetime that begins before a driver is involved.
- A dispatch task may produce zero, one, or several driver tasks over its life. Conflating the two would make both models ugly. Keeping them separate, with explicit references between them, keeps each one expressive.

## 4. Known Technical Debt and Naming Reality

This section documents debts that this ADR consciously **does not pay** in Phase 1, so future maintainers understand the gap between the ideal model and the implemented one.

### 4.1 `vehicles.esp32_device_id` is misnamed

The column should be called something like `primary_telematics_id`. Its semantics are not strictly "ESP32 device ID" — production already uses non-ESP32 placeholder strings (`DEMO-ESP-004`, `DEMO-ESP-005`). Calling it `esp32_device_id` perpetuates the implicit assumption that vehicles are TulipFleet-instrumented.

**Cost of fixing today:** Backend code changes (server.js:1932 and likely several other references), mobile app code changes, API contract changes, migration with concurrent application deploy. Estimated 5-10 working days end-to-end, with production risk during the cutover.

**Cost of deferring:** Naming confusion in code. Slight friction when onboarding new developers. No production behavior impact.

**Decision:** Defer the rename. Phase 1 work proceeds against the existing column. When the first non-TulipFleet telematics customer is onboarded in Phase 2 (per ADR-0007), the rename is revisited in a dedicated ADR alongside the connector work for that customer.

### 4.2 `esp32_device_id NOT NULL` constraint

The constraint currently prevents creating a vehicle without an `esp32_device_id` value (even if placeholder). This is acceptable because:

- All Phase 1 vehicles are TulipFleet vehicles and have either real chip IDs or placeholder IDs.
- Backend `locations` ↔ `vehicles` join (server.js:1932) relies on the column being non-null.
- Removing `NOT NULL` would require backend audit to handle NULL-tolerant joins.

**Decision:** Constraint stays. When the rename happens in Phase 2, the nullability decision is re-evaluated at the same time.

### 4.3 Legacy `public.esp32_devices` table

The `esp32_devices` table exists in production but is empty/legacy (current device records live in `public.devices`). It can be dropped in a future cleanup migration but is harmless to leave in place; this ADR does not address it.

### 4.4 `devices_backup_*` snapshot tables

Two backup snapshot tables (`devices_backup_20251231`, `devices_backup_token_migration`) exist from previous migrations. They are safety nets, not active schema. Periodic cleanup is recommended but is operational housekeeping, not a structural concern.

## 5. Consequences

### 5.1 Positive

- Mobile app and dispatcher share canonical business entities; data is never out of sync.
- **Phase 1 ships without touching production `public.*` schema.** Zero risk to mobile app driver flows.
- Adding Geotab/Verizon/Samsara support in Phase 2 is a connector + ETL job using the existing schema's placeholder-string convention; no core refactor required.
- Single backup, single restore, single Postgres instance to operate.
- Migration is **schema-only and additive**, the safest class of migration possible.

### 5.2 Negative / accepted trade-offs

- **`esp32_device_id` naming debt persists.** Documented in Section 4. Acceptable Phase 1 cost.
- **Cross-schema joins.** Dispatcher queries will join `enterprise.dispatch_tasks` with `public.vehicles` and `public.users`. PostgreSQL handles cross-schema joins natively and efficiently.
- **Shared instance risk.** A runaway dispatcher query can degrade the production driver app. Mitigation: separate Postgres role with `statement_timeout`, connection pool limits, monitoring.
- **Single instance = single point of failure.** Acceptable for Phase 1. Streaming replica for the enterprise backend's reads is the obvious next step if contention is measured.

##   ## 6. Phase 1 — Authorized Additive Changes to `public.*`

The following additive changes to `public.*` are pre-approved for Phase 1 development. Each is implemented as a migration in `tulipfleet-backend/migrations/` following standard process. All changes are **non-breaking** and **forward-compatible**.

### 6.1 `public.users.role` — add 'dispatcher' value

**Rationale:** ADR-0009 §5.1 introduces the `dispatcher` user role for the new dispatcher web UI. Existing roles (`super_admin`, `company_admin`, `driver`) are unaffected.

**Migration sketch:**

```sql
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'company_admin', 'driver', 'dispatcher'));
```

**Timing:** First migration after dispatcher backend skeleton (ROADMAP Sıra 1).

**Compatibility:** Existing rows unaffected. New role value optional.

### 6.2 `public.tasks.enterprise_dispatch_task_id` — add nullable UUID column

**Rationale:** ADR-0009 §4.5 — soft reference linking dispatcher-created tasks to their enterprise schema origin. Mobile-app-created tasks leave this NULL.

**Migration sketch:**

```sql
ALTER TABLE public.tasks
  ADD COLUMN enterprise_dispatch_task_id uuid;

CREATE INDEX idx_tasks_enterprise_dispatch_task_id
  ON public.tasks (enterprise_dispatch_task_id)
  WHERE enterprise_dispatch_task_id IS NOT NULL;
```

**Timing:** When dispatcher's plan-approve endpoint (FEAT-006 per ADR-0011) is implemented — ROADMAP Sıra 6.

**Compatibility:** Nullable, existing rows unaffected. No foreign key constraint in Phase 1 (soft reference per ADR-0009 §4.5); FK considered in Phase 2.

### 6.3 `public.companies.dispatch_mode` — add NOT NULL column with default

**Rationale:** ADR-0005 introduces three workflow modes (Mode 1 Advisory, Mode 2 Exception-based, Mode 3 Agentic). Per-company mode selection allows different customers to operate at different maturity levels simultaneously. Phase 1 default is `'advisory'`; Phase 2 enables `'exception'` for opt-in customers.

**Migration sketch:**

```sql
ALTER TABLE public.companies
  ADD COLUMN dispatch_mode text NOT NULL DEFAULT 'advisory';

ALTER TABLE public.companies
  ADD CONSTRAINT companies_dispatch_mode_check
  CHECK (dispatch_mode IN ('advisory', 'exception', 'agentic'));
```

**Timing:** When dispatcher backend reads company-level configuration — ROADMAP Sıra 1 or shortly after.

**Compatibility:** NOT NULL with default — existing rows automatically get `'advisory'`. No existing code reads this column; safe addition.

### 6.4 `public.vehicles` — add capacity and class columns (Phase 1.1)

**Rationale:** ADR-0011 FEAT-002 (Truck-Aware Routing) and FEAT-007 (Vehicle Capability Matching) require vehicle profile data passed as constraints to HERE Tour Planning.

**Migration sketch:**

```sql
ALTER TABLE public.vehicles
  ADD COLUMN capacity_volume_m3 numeric,
  ADD COLUMN capacity_weight_kg numeric,
  ADD COLUMN vehicle_class text,
  ADD COLUMN hazmat_classes text[];
```

**Timing:** Phase 1.1 — after MVP launch when FEAT-002/007 capacity-aware routing is enabled.

**Compatibility:** All new columns nullable. Existing vehicles continue to function; profile data populated as customers onboard.

### 6.5 Disallowed changes — `public.*` modifications that require a new ADR

These changes are **out of scope** for Phase 1 additive policy. If needed, they require a dedicated ADR:

- Dropping or renaming any existing `public.*` column
- Changing the type of any existing `public.*` column
- Removing or narrowing existing CHECK constraints
- Removing or modifying existing foreign keys
- Schema-level renaming (e.g., `public` → `mobile`)

### 6.6 Migration ordering

The four changes above (6.1–6.4) are independent and can be applied in any order. Recommended sequence aligns with ROADMAP Sıra execution:

1. `public.users.role` enum extension (Sıra 1, dispatcher role for backend skeleton)
2. `public.companies.dispatch_mode` column (Sıra 1, read during backend bootstrap)
3. `public.tasks.enterprise_dispatch_task_id` (Sıra 6, plan-approve endpoint)
4. `public.vehicles` capacity columns (Phase 1.1, when FEAT-002/007 enabled)

Each migration follows standard `node-pg-migrate` process (External Migration Tool pattern per ROADMAP).


## 7. Phase Gating — Critical Discipline (unchanged from v1)

This section is non-negotiable. It exists because the strategic value of telematics-agnostic schema is forfeited if Phase 1 expands into Phase 2 work.

### Phase 1 (now through first paying customer + N months)

- `enterprise.telematics_source` contains rows only with `provider = 'tulipfleet'`.
- `enterprise.locations_3p` is **empty**.
- **No third-party connector code is written.** Not as a prototype, not as a side project, not for demos.
- Marketing and sales position: "TulipFleet — works best with TulipFleet hardware." Third-party compatibility is not on the homepage; it is a sales-conversation answer when a prospect asks.

### Phase 2 (customer-funded triggers)

- A new paying customer with a non-TulipFleet telematics signs a contract that explicitly funds the integration.
- That single connector is built. The customer's row appears in `telematics_source` with their provider.
- The `esp32_device_id` rename ADR is written and executed in this Phase, alongside the first non-TulipFleet customer's onboarding.

### Phase 3 (pattern + framework, when ≥3 connectors exist)

- A second ADR documents the connector framework abstractions.
- Marketing position can soften to "compatible with major European fleet telematics providers" if and only if operational maturity supports it.

### Enforcement

Phase progression is **not** triggered by:

- "It would be cool to have."
- "Customer might want it someday."
- "Other vendors support it."
- Internal engineering enthusiasm.

Phase progression **is** triggered by:

- A signed customer agreement with budget allocated to the connector work.
- A demonstrated, measured constraint that cannot be addressed inside Phase 1.

## 8. Migration Plan — Phase 1 Bootstrap

All migrations are **schema-only** and **additive**. No existing `public.*` tables are modified. No data is moved. The TimescaleDB hypertable `enterprise.locations_3p` is created empty; no INSERT to any hypertable is performed by this migration set.

### 8.1 Sequence

1. **Apply to staging first.** Target database: `fleet_tracking_staging` (separate database on the same Postgres instance, per DEMO_OLUSTURMA.md §3).
2. **Smoke test on staging.** Verify schemas, tables, indexes, hypertable registration, and backfill row counts (Section 7.3).
3. **Take a fresh production backup** before any production change.
4. **Apply to production.** Target database: `fleet_tracking`.
5. **Verify on production** with the same smoke-test query set.
6. **Commit migration files** to the `tulipfleet-backend` repository under whichever migration tool the backend already uses (to be confirmed). If no migration tool exists, adopt `node-pg-migrate` first.

### 8.2 Files

Three migration files, applied in order:

- `<timestamp>_enterprise_schema_init.sql` — creates `enterprise` schema and grants `USAGE` to roles that need it.
- `<timestamp>_enterprise_tables.sql` — creates `telematics_source`, `locations_3p` (with `create_hypertable`), `routing_jobs`, `dispatch_tasks`. Adds all indexes.
- `<timestamp>_telematics_source_backfill.sql` — inserts one `provider='tulipfleet'` row per existing vehicle, linking to its primary `devices` record where present.

The backfill is the only non-trivial part. Its query joins `public.vehicles` with `public.devices` (where `devices.vehicle_id = vehicles.id`) and emits one `telematics_source` row per vehicle. Vehicles without a device get a row with `config = '{}'`.

### 8.3 Smoke tests

After applying to staging:

```sql
-- Schema exists
SELECT 1 FROM information_schema.schemata WHERE schema_name = 'enterprise';

-- Tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'enterprise'
ORDER BY table_name;
-- Expected: dispatch_tasks, locations_3p, routing_jobs, telematics_source

-- Hypertable registered
SELECT hypertable_name FROM timescaledb_information.hypertables
WHERE hypertable_schema = 'enterprise';
-- Expected: locations_3p

-- Backfill correct
SELECT provider, COUNT(*) FROM enterprise.telematics_source GROUP BY provider;
-- Expected: tulipfleet | <count equal to public.vehicles WHERE company_id IS NOT NULL>

-- No third-party rows
SELECT COUNT(*) FROM enterprise.telematics_source WHERE provider != 'tulipfleet';
-- Expected: 0

-- Locations 3p empty
SELECT COUNT(*) FROM enterprise.locations_3p;
-- Expected: 0
```

### 8.4 Rollback

Each migration file has a corresponding `DROP` block in a `_rollback.sql` companion file. Rollback is fast (no data exists yet in Phase 1) and can be applied without production data loss.

If `node-pg-migrate` is the adopted tool, the `down` migration handles rollback automatically.

### 8.5 Hard rules (production safety)

- **Production backup is mandatory** before any production migration.
- **Staging must pass smoke tests** before production is touched.
- **No INSERTs to TimescaleDB hypertables in migration files.** The DEMO_OLUSTURMA.md §4.5 hypertable INSERT blocker rule applies to migrations too: hypertable seeding (if ever needed) goes through the backend or `seed_locations.js` pattern, not direct migration INSERT.
- **Migration is applied during low-traffic window** (target: outside Dutch business hours; verify with operational schedule).

## 9. Implementation Plan — After Migration Lands

**Week 1**

1. Apply schema migrations to staging, run smoke tests.
2. Take production backup, apply to production, re-run smoke tests on production.

**Week 2**

3. Create Postgres role `enterprise_backend` with limited privileges:
   - `GRANT USAGE ON SCHEMA enterprise TO enterprise_backend;`
   - `GRANT ALL ON ALL TABLES IN SCHEMA enterprise TO enterprise_backend;`
   - `GRANT SELECT ON public.vehicles, public.companies, public.users, public.drivers, public.tasks, public.locations TO enterprise_backend;`
   - `ALTER ROLE enterprise_backend SET statement_timeout = '10s';`
4. Open `pg_hba.conf` entry for connections from the enterprise backend host (per ADR-0003).

**Week 3+**

5. New `tulipfleet-enterprise-backend` Fastify project consumes the schema. **Enterprise backend never writes migrations of its own** — schema authority remains in `tulipfleet-backend` per this ADR.

## 10. Known Risks and Mitigations

| Risk                                                  | Mitigation                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| Backend audit reveals `esp32_device_id` NULL handling gaps | Phase 1 keeps NOT NULL; no audit needed for Phase 1              |
| Schema sprawl into `enterprise.*` over time           | Future ADRs cite this one; new tables justified case-by-case     |
| Cross-schema query performance                        | Monitor slow query log; add indexes; consider materialized views |
| Phase boundary violation (Phase 2 work in Phase 1)    | Documented in Section 6; founder discipline; periodic review     |
| Tenant isolation bypass via cross-schema join         | Application-layer `company_id` guards enforced in every query    |
| Shared DB resource contention                         | Separate role with `statement_timeout`, future read replica      |
| Telematics provider auth credentials stored unsafely  | Encrypt `config.auth_token` fields at rest; audit access logs    |
| `esp32_device_id` naming continues to mislead readers | Documented in Section 4; rename scheduled for Phase 2            |

## 11. Open Questions

- **Migration tool selection.** Pending inspection of the existing `tulipfleet-backend` repo. If no tool is in use, adopt `node-pg-migrate`.
- **PostgreSQL Row-Level Security (RLS).** Evaluate when customer count exceeds ~50 and the application-layer guard becomes a maintenance burden.
- **Read replica for enterprise backend.** Defer until shared-DB contention is measured.
- **Audit log.** Compliance-conscious customers (financial freight, pharma logistics) will eventually want a tamper-evident audit log. Defer to a future ADR.
- **`primary_telematics_id` rename.** Schedule for Phase 2 ADR alongside the first non-TulipFleet connector.

## 12. References

- ADR-0002 (VRP solver, defines `routing_jobs` consumers)
- ADR-0003 (Server topology, defines DB sharing pattern)
- ADR-0007 (Telematics integration strategy, defines the Scenario-C posture this ADR implements)
- Existing TulipFleet backend README (current schema, tenant isolation pattern)
- TulipFleet QA, DEMO_OLUSTURMA.md (production schema reference, hypertable INSERT rules)
- Production schema inspection (2026-05-13) — confirmed `vehicles.esp32_device_id` accepts placeholder strings in addition to real chip IDs.

---

## 13. Change Log

| Version | Date       | Author    | Change                                                                                       |
| ------- | ---------- | --------- | -------------------------------------------------------------------------------------------- |
| 1       | 2026-05-13 | Cem sahinkaya| Initial decision: one Postgres, two-schema, telematics-agnostic core, strict phase-gating.   |
| 2       | 2026-05-13 | Cem sahinkaya | Revised after inspecting production schema. Accepts existing `vehicles.esp32_device_id` as-is (Option A). Documents naming debt in Section 4. Migration plan is schema-only and additive; no changes to `public.*` in Phase 1. |
| v3 (revision) | 2026-05-14 | Cem sahinkaya Clarified bootstrap-vs-Phase-1 distinction for `public.*` modifications. Added Section 6 listing four authorized additive changes (`users.role`, `tasks.enterprise_dispatch_task_id`, `companies.dispatch_mode`, `vehicles` capacity columns). No core decisions changed; schema authority remains in `tulipfleet-backend`. Triggered by NotebookLM consistency audit. |

