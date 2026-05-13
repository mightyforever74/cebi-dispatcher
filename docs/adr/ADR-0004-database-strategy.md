# ADR-0004: Database Strategy and Telematics-Agnostic Schema

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Status**        | Accepted                                                               |
| **Version**       | 1                                                                      |
| **Date**          | 2026-05-13                                                             |
| **Decision by**   | Cem Bakir (Founder / Lead Engineer)                                    |
| **Component**     | TulipFleet Enterprise — Data Layer                                     |
| **Related**       | ADR-0002 (VRP solver), ADR-0003 (Server topology), ADR-0007 (Telematics integration strategy) |

---

## 1. Context

TulipFleet's existing data layer is a single PostgreSQL 15 + TimescaleDB instance with ~14 tables, hypertables for location data, and a `company_id` discriminator providing **tenant isolation** for the multi-tenant SaaS model.

TulipFleet Enterprise Phase 1 introduces new dispatcher-specific concerns:

- **Dispatch tasks** with state machines beyond the current driver task model.
- **Routing jobs** persisted across HERE Tour Planning API submissions.
- **Telematics integration** — the strategic decision documented in ADR-0007 commits TulipFleet to a Scenario-C posture: TulipFleet's own telematics is the flagship data source, but the dispatcher must be **telematics-agnostic at the data layer** so third-party telematics (Geotab, Verizon Connect, Samsara, etc.) can feed in via customer-funded connectors in Phase 2+.

The third concern is the most strategically important. If the database schema today models vehicles as "TulipFleet IoT assets" rather than as "operational business assets that may receive telemetry from one or more sources," then adding Geotab support in Phase 2 becomes a **core schema refactor** with production migration risk and backward-compatibility breakage.

This ADR establishes the schema separation strategy and the telematics-agnostic data model that future Phases depend on.

## 2. Decision

Adopt **one PostgreSQL instance, two-schema separation, telematics-agnostic core entities, and per-vehicle telematics source mapping**.

### 2.1 Single instance, two schemas

- One PostgreSQL 15 + TimescaleDB instance (existing `fleet-prod-01` host).
- **`public.*`** — existing tables; shared between the mobile driver app, the admin app, and the enterprise dispatcher.
- **`enterprise.*`** — new tables; used only by the enterprise dispatcher backend.

### 2.2 Telematics-agnostic core entities

The conceptual separation that all schema changes must respect:

```
vehicles  = the operational asset (a truck, a van, a trailer)
            -- exists regardless of any telematics device
devices   = a telemetry-producing thing (TulipFleet ESP32, Geotab GO9, ...)
            -- belongs to a vehicle; a vehicle may have zero, one, or many
```

A vehicle is a real-world business asset. A device is one telematics provider's representation of how it observes that asset. The current `devices` table already encodes this for TulipFleet hardware; this ADR generalizes the model to admit non-TulipFleet devices in Phase 2 without core refactor.

### 2.3 New enterprise tables

```sql
-- Maps each vehicle to one or more telematics sources.
-- Phase 1: only 'tulipfleet' rows exist.
-- Phase 2+: rows for 'geotab', 'verizon', 'samsara', etc.
enterprise.telematics_source (
  id           uuid PRIMARY KEY,
  vehicle_id   uuid NOT NULL REFERENCES public.vehicles(id),
  company_id   uuid NOT NULL REFERENCES public.companies(id),
  provider     text NOT NULL,             -- 'tulipfleet' | 'geotab' | 'verizon' | ...
  config       jsonb NOT NULL,            -- auth tokens (encrypted), endpoint, field mapping, polling cursor
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON enterprise.telematics_source (vehicle_id, is_active);
CREATE INDEX ON enterprise.telematics_source (company_id, provider);

-- 3rd-party telemetry feeds, ETL'd from external sources.
-- Empty in Phase 1.
enterprise.locations_3p (
  vehicle_id   uuid NOT NULL REFERENCES public.vehicles(id),
  provider     text NOT NULL,
  time         timestamptz NOT NULL,
  latitude     double precision,
  longitude    double precision,
  speed        double precision,
  heading      double precision,
  raw_payload  jsonb NOT NULL,
  company_id   uuid NOT NULL REFERENCES public.companies(id)
);
SELECT create_hypertable('enterprise.locations_3p', 'time');
CREATE INDEX ON enterprise.locations_3p (vehicle_id, time DESC);

-- Dispatch task state machine (separate from existing public.tasks
-- which represents the driver-facing task model).
enterprise.dispatch_tasks (
  id              uuid PRIMARY KEY,
  company_id      uuid NOT NULL REFERENCES public.companies(id),
  status          text NOT NULL,        -- draft | planned | assigned | in_progress | completed | failed | cancelled
  assigned_vehicle_id uuid REFERENCES public.vehicles(id),
  assigned_driver_id  uuid REFERENCES public.users(id),
  pickup_location jsonb NOT NULL,
  dropoff_location jsonb NOT NULL,
  time_window_start timestamptz,
  time_window_end   timestamptz,
  capacity_required jsonb,              -- weight, volume, count
  skill_required  text[],
  routing_job_id  uuid REFERENCES enterprise.routing_jobs(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON enterprise.dispatch_tasks (company_id, status);
CREATE INDEX ON enterprise.dispatch_tasks (assigned_vehicle_id, status);

-- VRP solver submissions (HERE Tour Planning per ADR-0002).
-- Persists request/response for retry, audit, and caching.
enterprise.routing_jobs (
  id              uuid PRIMARY KEY,
  company_id      uuid NOT NULL REFERENCES public.companies(id),
  provider        text NOT NULL DEFAULT 'here',
  provider_job_id text,                 -- HERE's async job ID
  request_hash    text NOT NULL,        -- for idempotency
  status          text NOT NULL,        -- submitted | running | completed | failed
  request_payload jsonb NOT NULL,
  response_payload jsonb,
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  error_message   text
);
CREATE INDEX ON enterprise.routing_jobs (company_id, status);
CREATE UNIQUE INDEX ON enterprise.routing_jobs (request_hash) WHERE status = 'completed';
```

### 2.4 Tenant isolation continues to apply

Every new `enterprise.*` table includes a non-null `company_id` foreign key. Application-layer guards (existing pattern in the Fastify backend) enforce that every query is scoped to the requester's `company_id`. Row-level security (RLS) is **not** introduced in Phase 1 (the application layer guard is sufficient and already in production) but is a future option.

## 3. Rationale

### 3.1 Why one PostgreSQL instance

- Shared business entities (companies, users, vehicles, drivers) live in `public.*` and are consumed by both the mobile app and the dispatcher. Splitting them across separate instances introduces eventual-consistency problems (driver appears in mobile app but not yet in dispatcher list) that hurt UX.
- Single instance = single backup, single restore procedure, single connection-pool story.
- Hetzner's PostgreSQL on a shared CX31 has plenty of headroom for Phase 1 scale (tens of thousands of rows per table per day).
- PostgreSQL roles + schemas provide clean access separation without needing a second instance.

### 3.2 Why two schemas (not just two table-name prefixes)

- **Access control.** A PostgreSQL role granted access only to the `enterprise` schema cannot read or write `public.*` business data accidentally. This narrows the blast radius of a bug or compromised credential on the enterprise backend.
- **Migration isolation.** Enterprise schema migrations run independently. The existing mobile-app team's deployment cadence is not affected by enterprise schema churn during Phase 1.
- **Documentation clarity.** A developer browsing the database immediately sees what is "core" vs "enterprise-only."

### 3.3 Why telematics-agnostic core

This is the most strategically important decision in this ADR. The reasoning:

- **Scenario C lock-in.** ADR-0007 commits TulipFleet to an architecture where the dispatcher is the flagship of TulipFleet's own telematics **and** capable of consuming third-party telematics. If `vehicles` is modeled today as "a thing with a TulipFleet device," then admitting Geotab tomorrow requires a core schema refactor on a live production database with paying customers — exactly the kind of work that goes wrong.
- **Cost asymmetry.** Designing the right separation today is one tablespace change. Designing it later is a migration project measured in weeks of engineering and customer downtime.
- **Phase 1 has no behavioral cost.** In Phase 1, only `provider = 'tulipfleet'` rows exist in `telematics_source`, and `locations_3p` is empty. The runtime behavior is identical to a TulipFleet-only design. The schema is forward-compatible without being forward-running.

### 3.4 Why `telematics_source` is a "strategic brake"

`enterprise.telematics_source` is not merely a configuration table. It is the **single point of control** that gates third-party telematics ingestion. Implications:

- No connector can begin ingesting data without a corresponding row.
- Customer-funded connector terms (ADR-0007) are physically reflected in this table: no row, no ingestion, no recurring engineering load.
- Auth tokens, polling cursors, and field mappings live here, so each connector ETL is parameterized rather than hard-coded.
- Removing a customer's connector (offboarding, contract end) is a row update (`is_active = false`), not a code deploy.

Without this table, every connector becomes a unique service that is hard to retire. With this table, connectors are uniform and disposable.

### 3.5 Why `dispatch_tasks` is separate from existing `public.tasks`

The existing `public.tasks` table (per backend README) represents the **driver-facing task** model — what the driver sees and acts on in the mobile app. It has its own state machine (`pending_review` → `accepted` → `in_progress` → `completed`).

`enterprise.dispatch_tasks` represents the **dispatcher-facing task** model — what the dispatcher plans, assigns, and re-optimizes. Its state machine is wider (`draft`, `planned`, `assigned`, etc.) and its lifetime starts before a driver is involved.

A dispatch task may produce zero, one, or several driver tasks over its life (e.g., a delivery is reassigned to a different driver mid-day). Conflating the two would make both models ugly. Keeping them separate, with explicit references between them, keeps each one expressive.

## 4. Consequences

### 4.1 Positive

- Mobile app and dispatcher share canonical business entities; data is never out of sync.
- Adding Geotab/Verizon/Samsara support in Phase 2 is **a new connector + ETL job**, not a schema refactor.
- Migration risk in Phase 2+ is minimized; production downtime not expected.
- Existing backend code paths are completely untouched in Phase 1.
- Single backup, single restore, single Postgres instance to operate.

### 4.2 Negative / accepted trade-offs

- **Cross-schema joins.** Dispatcher queries will frequently join `enterprise.dispatch_tasks` with `public.vehicles` and `public.users`. PostgreSQL handles cross-schema joins natively and efficiently; the operational cost is low.
- **Shared instance risk.** A runaway dispatcher query can degrade the production driver app. Mitigation: separate Postgres role with `statement_timeout`, connection pool limits, monitoring on slow-query log.
- **Schema sprawl over time.** Without discipline, `enterprise.*` could grow into dozens of tables that overlap with `public.*`. Mitigation: this ADR explicitly defines what goes where; future ADRs cite it.
- **Single instance = single point of failure.** Acceptable for Phase 1. A streaming replica for the enterprise backend's reads is the obvious next step if contention is measured.

## 5. Phase-Gating — Critical Discipline

This section is non-negotiable. It exists because the strategic value of telematics-agnostic schema is forfeited if Phase 1 is allowed to expand into Phase 2 work.

### Phase 1 (now through first paying customer + N months)

- `enterprise.telematics_source` contains rows only with `provider = 'tulipfleet'`.
- `enterprise.locations_3p` is **empty**.
- **NO third-party connector code is written.** Not as a prototype, not as a hackathon side project, not because "it would be a nice demo."
- The marketing and sales position is **"TulipFleet — works best with TulipFleet hardware."** Third-party compatibility is not mentioned on the homepage. It is a sales-conversation answer when a prospect asks.

### Phase 2 (customer-funded triggers)

- A new paying customer with a non-TulipFleet telematics signs a contract that explicitly funds the integration.
- That single connector is built. The customer's row appears in `telematics_source` with their provider.
- A second customer for the same provider can be added without engineering work, only configuration.

### Phase 3 (pattern + framework, when ≥3 connectors exist)

- A second ADR is written documenting the connector framework, common abstractions, and operational SOPs.
- Marketing position can soften to "compatible with the major European fleet telematics providers" if and only if uptime + maintenance budget supports it.

### Enforcement

Phase progression requires an explicit decision and (if needed) a new ADR. Phase advancement is **not** triggered by:

- "It would be cool to have."
- "Customer might want it someday."
- "Other vendors support it."
- Internal engineering enthusiasm.

Phase advancement **is** triggered by:

- A signed customer agreement with budget allocated to the connector work.
- A demonstrated, measured constraint that cannot be addressed inside Phase 1.

## 6. Migration Plan (Phase 1 Bootstrap)

**Week 1**

1. Apply schema migration creating `enterprise` schema and the four new tables.
2. Create Postgres role `enterprise_backend`:
   - `GRANT USAGE ON SCHEMA enterprise TO enterprise_backend;`
   - `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA enterprise TO enterprise_backend;`
   - `GRANT SELECT, INSERT, UPDATE ON public.dispatch_relevant_tables TO enterprise_backend;` (specific, not blanket)
3. Set `statement_timeout = '10s'` on the `enterprise_backend` role to bound runaway query impact.

**Week 2**

4. Backfill `enterprise.telematics_source` with one row per existing vehicle (provider = `'tulipfleet'`, device reference, basic config).
5. Verify enterprise backend can read its tables and join to `public.*` as needed.

**Week 3+**

6. New enterprise endpoints use enterprise schema; no changes to existing mobile-facing endpoints.

## 7. Known Risks and Mitigations

| Risk                                                  | Mitigation                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| Schema sprawl into `enterprise.*` over time           | Future ADRs cite this one; new tables justified case-by-case     |
| Cross-schema query performance                        | Monitor slow query log; add indexes; consider materialized views |
| Phase boundary violation (Phase 2 work in Phase 1)    | Documented in this ADR; founder discipline; periodic review      |
| Tenant isolation bypass via cross-schema join         | Application-layer `company_id` guards enforced in every query    |
| Shared DB resource contention                         | Separate role with `statement_timeout`, future read replica      |
| Telematics provider auth credentials stored unsafely  | Encrypt `config.auth_token` fields at rest; audit access logs    |

## 8. Open Questions

- **PostgreSQL Row-Level Security (RLS).** When the customer count exceeds ~50 and the application-layer guard becomes a maintenance burden, evaluate adopting PostgreSQL RLS as the second layer of tenant isolation.
- **Read replica.** Defer until shared-DB contention is measured. The straightforward path is to add a PostgreSQL streaming replica on `fleet-enterprise-01` and route dispatcher reads to it.
- **Audit log.** Compliance-conscious customers (financial freight, pharma logistics) will eventually want a tamper-evident audit log of dispatch decisions. Defer to a future ADR.

## 9. References

- ADR-0002 (VRP solver, defines `routing_jobs` consumers)
- ADR-0003 (Server topology, defines DB sharing pattern)
- ADR-0007 (Telematics integration strategy, defines the Scenario-C posture this ADR implements)
- Existing TulipFleet backend README (current schema, tenant isolation pattern)

---

## 10. Change Log

| Version | Date       | Author    | Change                                                                                       |
| ------- | ---------- | --------- | -------------------------------------------------------------------------------------------- |
| 1       | 2026-05-13 | Cem Bakir | Initial decision: one Postgres, two-schema, telematics-agnostic core, strict phase-gating.   |
