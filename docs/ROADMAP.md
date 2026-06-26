# TulipFleet Enterprise — Roadmap

A high-level summary of the architectural and product decisions that govern the TulipFleet Enterprise Dispatcher. Each decision has a detailed Architecture Decision Record (ADR) in [`docs/adr/`](docs/adr/). This roadmap is the index and the executive view.

> **Status as of 2026-06-04:**
> Phase 1 (Architecture + Bootstrap) —
> **Sıra 2 + Sıra 2.9 complete**. `fleet-enterprise-01` (CPX 32, Falkenstein) is provisioned and serving `https://enterprise-api.tulipfleet.com` with a valid Let's Encrypt certificate via Caddy. Hetzner private network `tulipfleet-internal` (10.0.0.0/16) joins both servers (`fleet-prod-01` at `10.0.0.2`, `fleet-enterprise-01` at `10.0.0.3`); enterprise backend reaches PostgreSQL over the private network with the `enterprise_backend` role. End-to-end smoke verified (commit `c125f4c`).
> **Sıra 2.9 — NL Compliance Layer ZE-Zone seed complete.** 20 active Zero-Emission zones are live in production (`enterprise.nl_compliance_zones`, 21 rows — Den Haag is split into Centrum + Kust; 148.8 km² total). Geometry is sourced from the **harmonized NDW DATEX II national open dataset** (`opendata.ndw.nu/emissiezones.xml.gz`), a single authoritative source replacing per-city municipal scraping. Reconciliation B aligned the 6 originally municipal-sourced cities to NDW (Den Haag re-modelled, Utrecht + Eindhoven geometry refreshed; Rotterdam/Amsterdam/Maastricht left as-is after diff showed sub-2% divergence). Each city was verified staging → production with embedded point-in-polygon sanity tests. Next:
> **Sıra 3 complete (2026-06-02)** — HERE Tour Planning verified, ZE-Zone routing Model 1 (HERE-native `exceptZoneIds`) locked, Ontheffing Engine schema + `enterprise_backend` prod grants live.
> **Sıra 3.5 complete (2026-06-03)** — Ontheffing Engine application layer live on `fleet-enterprise-01` (`/api/compliance/*`, 5 endpoints, 38 tests, end-to-end smoke against staging DB returning `compliant` / `needs_exemption` / `exempt_granted`). **FEAT-008 Vrachtwagenheffing Period 1 baseline complete** — official 2026-07-01→08-31 tariffs seeded (prod + staging, 9 rows) + pure `calculateHeffing` engine (date-versioned).
> **Sıra 4.1 complete (2026-06-04)** — Dispatcher UI Live Fleet Map skeleton (commit `404d997`): Leaflet + react-leaflet map with mock-fed Zustand store, registered in the Material Dashboard template. React pinned to 18.2.0 (override) after a React-19 install broke the ecosystem; broken `.eslintrc.json` removed.
> **Sıra 4.2 complete (2026-06-04)** — Live MQTT-over-WSS telemetry wired into the control-tower map (commit `b849e92`; control-tower UI `913a275`). EMQX 5.4.0 broker proven: `dispatcher-readonly` (subscribe-only) + `sim-publisher` (publish-only) users with ACL isolation; 16-column location payload contract verified against prod `public.locations`. Synthetic publisher (5 NL trucks, bounded to NL) streams while the ESP32 fleet is offline. **Production WSS path live:** `wss://mqtt.tulipfleet.com/mqtt` (443) → nginx (Let's Encrypt cert, auto-renew) → EMQX plain-WS `127.0.0.1:8083`; port 8084 closed to the public. The dispatcher is the broker's first browser consumer — runbook `780c857`, INTEGRATION_BOUNDARIES §3.2/§4.1/§7.3 updated. Next: Sıra 4.3 (`GET /api/locations/latest` initial-state snapshot).

---

## Strategic Positioning

**TulipFleet Enterprise Dispatcher** is the dispatch-and-routing layer of the TulipFleet fleet management platform. Its strategic position is:

- **Flagship integrated product** for prospects who have not yet committed to a telematics vendor — TulipFleet hardware + dispatcher + mobile app as a single platform.
- **Open ingestion layer** for prospects with existing third-party telematics (Geotab, Verizon Connect, Samsara, etc.) — onboarded via customer-funded connectors per [ADR-0007](docs/adr/ADR-0007-telematics-integration-strategy.md).
- **NL-specialized compliance moat** for the regulatory environment forming around Vrachtwagenheffing (Temmuz 2026) and Zero-Emission Zones (18 cities, 2025–2026 rollout) — see [ADR-0012](docs/adr/ADR-0012-nl-compliance-layer.md) for the 3-phase Internal → Premium → Standalone evolution.
- **Vertical focus:** Dutch and broader European mid-market logistics — **K/M-segment 3PLs with 50–300 vehicles** per the Top 100 Logistiek Dienstverleners 2025 segmentation (e.g., Dobbe Transport, TMA Logistics, De Dekker, Deudekom). G-segment (Neele-Vat, 1000+ employees) is a telemetry data customer, not a dispatcher target.
- **Workaround-aware design** — Sectoral research (Onfleet, Bringg user adoption blogs, DoorDash dispatcher AI rollout case study) ve TulipFleet dispatcher persona analizi gösteriyor: planner'lar gerçek workflow'da Excel'e döner, telefonla rota değiştirir, AI recommendation'ı ignore eder. TulipFleet bunu bir hata değil, bir **integration scenario** olarak görür. UI/UX disipline'i: (1) Tabular View ağırlıklı bulk editing (Excel-like), (2) her ekranda Manual Override butonu, (3) Export/Import dostu data flow. Tam otonom dispatch (Mode 3) NL sendikaları + dispatcher güveni nedeniyle **explicit out-of-scope** kabul edilir (§Non-Goals).

The product is positioned **"TulipFleet — works best with TulipFleet"** in marketing and sales. Third-party compatibility is a sales-conversation answer, not a homepage message. NL compliance is positioned as **operational necessity for the Dutch market**, not a marketing differentiator — until the standalone Compliance-as-a-Service product is launched in Phase 3.

### Strategic insights guiding Phase 2 prioritization (per ADR-0011 §10)

- **KOBİ digital readiness gap.** evofenedex research: 80% of Dutch SMEs are not "digital ready." Competitors (Routific, OptimoRoute) avoid this segment due to complexity. TulipFleet's integrated single-vendor onboarding (hardware + mobile + dispatcher) reduces the barrier — this is a differentiator, not a problem.
- **Ketenregie gap.** Sector sources (TLN, evofenedex) identify supply chain orchestration ("ketenregie") as the underserved capability in the SME segment. Large 3PLs have in-house systems; SMEs have none. Dispatcher's Mode 1 (Advisory) + Mode 2 (Exception-based) maturity model from [ADR-0005](docs/adr/ADR-0005-dispatch-workflow.md) is purpose-built for this gap.
- **Compliance moat.** No consolidated "single data point" exists in the Netherlands for ZE-Zone, ontheffing, or Vrachtwagenheffing rules. TulipFleet's Phase 1 internal compliance layer becomes the seed for a Phase 3 standalone B2B data product (per ADR-0012).
- **Advisory effort allocation.** Sectoral pattern extraction (2026-05-30) ve dispatcher persona reality check sonrası karar: solo dev engineering effort'unun **%70'i Advisory Mode UI ve Manual Override esnekliğine** yatırılır. Otonomlaştırma (Mode 2/3) yerine **planner'ın elini güçlendiren** araçlar (manual replan, bulk update, override toggle, tabular view) önceliklidir. ADR-0005 Mode 1 → Mode 2 evolution path korunur, ancak runtime effort dağılımı Mode 1 UI olgunluğuna yönelir. Detay: [`docs/analysis/sectoral-patterns-2026-05-30.md`](docs/analysis/sectoral-patterns-2026-05-30.md) §6 (User Behavior Reality Check), §7 (Strategic Synthesis).

---

## Decision Summary

| Area                       | Decision                                                                                                                                 | ADR                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Dispatcher UI**          | Material Dashboard 2 PRO React TS (Creative Tim, Company License) + MD3 PRO React reference                                              | [ADR-0001](docs/adr/ADR-0001-dispatcher-ui-stack.md)                   |
| **VRP Solver**             | HERE Tour Planning API (managed), OR-Tools deferred as escape hatch                                                                      | [ADR-0002](docs/adr/ADR-0002-vrp-solver.md)                            |
| **Server Topology**        | Hetzner CX32 + `enterprise-api.tulipfleet.com` subdomain                                                                                 | [ADR-0003](docs/adr/ADR-0003-server-topology.md)                       |
| **Database**               | Shared PostgreSQL, `public.*` / `enterprise.*` schema split, telematics-agnostic core, **Phase 1 additive `public.*` changes legalized** | [ADR-0004 v3](docs/adr/ADR-0004-database-strategy.md)                  |
| **Dispatch Workflow**      | Three-mode maturity model (Advisory → Exception-based → Agentic); Phase 1 ships Advisory only                                            | [ADR-0005](docs/adr/ADR-0005-dispatch-workflow.md)                     |
| **Map Widget**             | Leaflet + react-leaflet, Mapbox GL JS retained as upgrade option                                                                         | [ADR-0006](docs/adr/ADR-0006-map-widget.md)                            |
| **Telematics Integration** | Scenario C (flagship + open), customer-funded connectors only, strict phase gating                                                       | [ADR-0007](docs/adr/ADR-0007-telematics-integration-strategy.md)       |
| **Backend Stack**          | Fastify v4 for enterprise backend (alignment with existing)                                                                              | [ADR-0008](docs/adr/ADR-0008-fastify-v4.md)                            |
| **Integration Map**        | Production ↔ Enterprise topology, task lifecycle, schema authority, **Compliance Engine inheritance (§4.5.1)**                           | [ADR-0009](docs/adr/ADR-0009-enterprise-production-integration-map.md) |
| **ML Strategy**            | No in-house ML in Phase 1-2; ML consumer relationship with HERE; customer-funded ML in Phase 3+                                          | [ADR-0010](docs/adr/ADR-0010-ml-strategy.md)                           |
| **Use Case Scope**         | 7 Phase 1 MVP use cases, 10 Phase 2 trigger-based, 8 out-of-scope; HERE coverage matrix; target segment K/M-50–300 vehicles              | [ADR-0011](docs/adr/ADR-0011-dispatcher-use-case-scope.md)             |
| **NL Compliance Layer**    | 3-phase strategy: Internal use (Phase 1) → Premium tier (Phase 2) → Standalone CaaS product (Phase 3); PostGIS adoption                  | [ADR-0012](docs/adr/ADR-0012-nl-compliance-layer.md)                   |

---

## Feature Wishlist Coverage Matrix

The dispatcher wishlist (`Ben_bir_advisor_um-1.docx`) catalogs **31 industry use cases** synthesized from competitor product analysis and industry reports. This matrix maps **every wishlist item** to a TulipFleet feature ID, phase placement, and current spec status. Two TulipFleet-specific features (NL compliance trigger) are **added to the wishlist as appendix items** (W-A1, W-A2).

**Legend:**

- ✅ **Spec ready** — function spec authored in `docs/functions/`
- 📋 **Spec pending** — wishlist target, no spec yet, candidate for next pilot
- 🔵 **Phase 2 ADR-0011 §6** — customer-funded trigger required
- 🚫 **Out-of-scope ADR-0011 §7** — explicit non-goal
- 🌱 **TulipFleet-already-doing** — wishlist notes this is existing capability, no new spec needed

### Wishlist coverage table

| W#  | Wishlist feature                     | Frequency   | Cem note                                       | FEAT ID  | Phase                       | Status                                                       |
| --- | ------------------------------------ | ----------- | ---------------------------------------------- | -------- | --------------------------- | ------------------------------------------------------------ |
| W1  | AI-Powered Route Optimization        | Very common | —                                              | FEAT-001 | 1                           | ✅ Spec v3 (FN-016 cross-spec sync hub)                      |
| W2  | Dynamic In-Day Re-routing            | Common      | —                                              | FEAT-002 | 1                           | ✅ Spec v1                                                   |
| W3  | Smart Auto-Dispatch                  | Common      | —                                              | FEAT-003 | 1                           | ✅ Spec v1                                                   |
| W4  | Hybrid Fleet Assignment              | Common      | —                                              | FEAT-004 | 1                           | ✅ Spec v1 (3PL/gig out-of-scope per ADR-0011 §7 OUT-002)    |
| W5  | Predictive ETA Estimation            | Very common | —                                              | FEAT-005 | 1                           | ✅ Spec v2 (FEAT-006 cross-spec sync)                        |
| W6  | Automated Appointment Scheduling     | Common      | drive + dock + rest + buffer                   | FEAT-006 | 1                           | ✅ Spec v1 (FEAT-006⊂FEAT-108 scope)                         |
| W7  | Driver Performance Coaching          | Common      | we do this via adxl345                         | FEAT-007 | 1                           | ✅ Spec v3 (4 UNCERTAINTIES kapatıldı)                       |
| W8  | Automated Exception Handling         | Common      | —                                              | FEAT-010 | 1.1                         | 📋 Spec pending (atlanmış — sıra geldi)                      |
| W9  | Proof of Delivery (PoD) Capture      | Very common | last priority                                  | FEAT-011 | 1                           | 📋 Spec pending                                              |
| W10 | Multimodal Orchestration             | Very common | —                                              | —        | —                           | 🚫 OUT-001 (Phase 3 ADR pending)                             |
| W11 | Refrigerated Container Monitoring    | Common      | menu created, customer activates               | FEAT-012 | 1 (skeleton) + 2 (activate) | 📋 Spec pending (schema forward-compat, kod path kapalı)     |
| W12 | Hazmat & Compliance Routing          | Niche       | expertise feature                              | FEAT-013 | 1.1                         | 📋 Spec pending (ADR-0012 ile uyumlu)                        |
| W13 | Multi-carrier Tender Management      | Common      | —                                              | FEAT-014 | 2                           | 🔵 Customer-funded trigger                                   |
| W14 | Automated Freight Audit and Payment  | Very common | —                                              | FEAT-015 | 2                           | 🔵 Customer-funded trigger                                   |
| W15 | Cost-to-Serve Modeling               | Common      | —                                              | FEAT-016 | 1.1                         | 📋 Spec pending                                              |
| W16 | Electric Vehicle (EV) Range Planning | Common      | —                                              | FEAT-103 | 2                           | 🔵 EV customer trigger (ADR-0011 §6)                         |
| W17 | Locker and PUDO Management           | Common      | we do with geofence                            | FEAT-017 | 1.1                         | 📋 Spec pending (mevcut geofence üzerine)                    |
| W18 | Reverse Logistics Handling           | Common      | —                                              | FEAT-109 | 2                           | 🔵 Retail customer trigger (ADR-0011 §6)                     |
| W19 | Multi-Day Long-Haul Planning         | Niche       | —                                              | FEAT-019 | 2                           | ✅ Spec v1 (Phase 2 customer-funded trigger)                 |
| W20 | Autonomous Vehicle Integration       | Niche       | future, must include                           | —        | 3                           | 🚫 OUT-004 (Phase 3 ADR pending)                             |
| W21 | Carbon Footprint Tracking            | Common      | we have already done but must learn subtleties | FEAT-009 | 1.1                         | ✅ Spec v1 (CSRD-aware, distinct from FEAT-106)              |
| W22 | Driver Electronic Logging (ELD/IFTA) | Very common | decide whether increase db work                | FEAT-018 | 1.1 or 2                    | 📋 Karar bekliyor (NL geçerli mi? Tahograf var)              |
| W24 | Capacity-Aware Delivery Promising    | Common      | base feature of cargo mgmt (kanban approach)   | FEAT-020 | 1.1                         | 📋 Spec pending                                              |
| W25 | Breadcrumbs Trail Analysis           | Common      | —                                              | FEAT-021 | 1.1                         | 📋 Spec pending (planned vs actual route)                    |
| W26 | Workload Balancing                   | Common      | requires deep search                           | FEAT-022 | 1.1 or 2                    | 📋 Karar bekliyor                                            |
| W27 | Cross-Docking Orchestration          | Common      | —                                              | FEAT-023 | 2                           | 🔵 Muhtemelen 3PL customer trigger                           |
| W28 | Predictive Failure Detection         | Common      | —                                              | FEAT-024 | 2                           | 🔵 Customer-funded (ML risk modeling, ADR-0010 §3.5 trigger) |
| W29 | Mobile Status Updates                | Very common | tulipfleet                                     | —        | —                           | 🌱 Already done in TulipFleet mobile app                     |
| W30 | Freight Spend Benchmarking           | Common      | —                                              | FEAT-025 | 2                           | 🔵 Customer-funded (data aggregation feature)                |
| W31 | AI Agent Task Automation             | Niche       | important                                      | FEAT-105 | 2                           | 🔵 Customer-funded LLM consumer (ADR-0010 §4)                |

### TulipFleet-specific appendix (added to wishlist)

| W#   | Feature                                    | Source                                        | FEAT ID  | Phase | Status                                                                           |
| ---- | ------------------------------------------ | --------------------------------------------- | -------- | ----- | -------------------------------------------------------------------------------- |
| W-A1 | Vrachtwagenheffing Route Cost Optimization | NL regulatory trigger (Temmuz 2026), ADR-0012 | FEAT-008 | 1.1   | ✅ Spec v1 (9.5/10 pilot zirvesi); Period-1 tariff seed + engine done (Sıra 3.5) |
| W-A2 | CSRD-Compliant Carbon Report Export        | EU regulatory layer, Large 3PL trigger        | FEAT-106 | 2     | 🔵 Customer-funded (Heineken/Picnic level trigger)                               |

### Coverage summary

| Status                                     | Count  | %        |
| ------------------------------------------ | ------ | -------- |
| ✅ Spec ready (9 FEAT)                     | 9      | 27%      |
| 📋 Spec pending (Phase 1 / 1.1 candidates) | 12     | 36%      |
| 🔵 Phase 2 customer-funded trigger         | 9      | 27%      |
| 🚫 Out-of-scope (Phase 3 ADR pending)      | 2      | 6%       |
| 🌱 TulipFleet-already-doing                | 1      | 3%       |
| **Toplam**                                 | **33** | **100%** |

**Pilot pipeline öncelik sırası:**

1. **FEAT-010** Automated Exception Handling (W8, common, atlanmış) — wishlist sırasını yeniden hizalama
2. **FEAT-011** PoD Capture (W9, Very common, Cem "last priority" demiş — sona kalabilir)
3. **FEAT-012** Refrigerated Container Monitoring (W11, menu/skeleton paterni — ilginç mimari)
4. **FEAT-013** Hazmat & Compliance Routing (W12, ADR-0012 ile sinerjili)
5. **FEAT-016** Cost-to-Serve Modeling (W15, common)
6. **FEAT-017** Locker/PUDO (W17, mevcut geofence üstüne)
7. **FEAT-020** Capacity-Aware Delivery Promising (W24, cargo management base)
8. **FEAT-021** Breadcrumbs Trail Analysis (W25, planned vs actual)
9. **FEAT-022** Workload Balancing (W26, deep search gerek — Cem kararı)
10. **FEAT-018** ELD/IFTA (W22, NL'de gerekli mi? Cem kararı)

Tüm Phase 1 / 1.1 specs tamamlandıktan sonra NotebookLM ilişki haritası çıkarır; **bottleneck önceden görülmesi** bu mimari haritalandırma egzersizinin amacıdır (function-level shared infrastructure analysis).

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

| Column                  | Type                                         | Notes                                                                                                                                                               |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                    | uuid (PK, default `gen_random_uuid()`)       | Vehicle primary key                                                                                                                                                 |
| `plate_no`              | varchar(20) NOT NULL UNIQUE                  | License plate (Dutch format e.g. `GV-082-B`). **Note: not `license_plate` despite that being a common name elsewhere.**                                             |
| `esp32_device_id`       | varchar(50) NOT NULL UNIQUE                  | TulipFleet hardware device identifier; legacy naming, ADR-0009 §5.2 renames deferred to Phase 2                                                                     |
| `model`                 | varchar(100)                                 | Vehicle model name (e.g. "Actros")                                                                                                                                  |
| `brand`                 | varchar(100)                                 | Manufacturer (e.g. "Mercedes-Benz"). **Note: not `make`.**                                                                                                          |
| `year`                  | integer                                      | Model year                                                                                                                                                          |
| `fuel_type`             | varchar(20)                                  | Diesel/EV/HVO etc. — useful for ADR-0012 ZE-Zone enforcement                                                                                                        |
| `fuel_capacity`         | numeric(5,2)                                 | Tank/battery capacity (L or kWh)                                                                                                                                    |
| `current_fuel_level`    | numeric(5,2)                                 | Latest reading                                                                                                                                                      |
| `total_km`              | numeric(10,2)                                | Odometer                                                                                                                                                            |
| `last_maintenance_date` | date                                         |                                                                                                                                                                     |
| `next_maintenance_km`   | numeric(10,2)                                |                                                                                                                                                                     |
| `status`                | varchar(20) DEFAULT 'available'              | CHECK: `available` \| `in_use` \| `maintenance` \| `retired` — **dispatcher visibility filter; only `available` and `in_use` are candidates for new dispatch jobs** |
| `vehicle_category`      | varchar(20) DEFAULT 'truck_heavy'            | Used for VRP constraint mapping (HERE truck attributes) per ADR-0011 FEAT-002                                                                                       |
| `color`                 | varchar(30)                                  |                                                                                                                                                                     |
| `company_id`            | uuid FK → `companies(id)` ON DELETE CASCADE  | **Tenant isolation key per ADR-0009 §4.4**                                                                                                                          |
| `threshold_accel`       | numeric(4,2) DEFAULT 0.25                    | Driver behavior detection thresholds (g-force) — for harsh-driving alerts                                                                                           |
| `threshold_brake`       | numeric(4,2) DEFAULT 0.35                    |                                                                                                                                                                     |
| `threshold_turn`        | numeric(4,2) DEFAULT 0.30                    |                                                                                                                                                                     |
| `threshold_impact`      | numeric(4,2) DEFAULT 2.50                    | Collision detection threshold                                                                                                                                       |
| `reprovision_required`  | boolean DEFAULT false                        | Hardware provisioning flag, indexed partial                                                                                                                         |
| `last_geofence_id`      | uuid FK → `geofences(id)` ON DELETE SET NULL | Latest geofence interaction                                                                                                                                         |
| `last_geofence_event`   | varchar(10)                                  | Entry/exit type                                                                                                                                                     |
| `last_geofence_at`      | timestamptz                                  |                                                                                                                                                                     |
| `created_at`            | timestamp                                    |                                                                                                                                                                     |
| `updated_at`            | timestamp                                    |                                                                                                                                                                     |

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

_Order rationale: defining the role **after** code is written produces a least-privilege grant set based on observed access patterns rather than guesses. Two smoke tests cost ~5 minutes each but eliminate misconfigured role risk on first deploy. Schema-level migrations for `public.users.role` and `public.companies.dispatch_mode` were applied separately during pre-Sıra-1 admin (see Completed list above)._

**Sıra 2 — Hetzner CX32 provision + DNS + TLS (in progress, 4/5 complete 2026-05-25)**

- ✅ **Provisioned `fleet-enterprise-01`** — Hetzner **CPX 32** (4 vCPU AMD, 8 GB RAM, 160 GB NVMe; ~€13.99/mo + €0.50 IPv4) in Falkenstein, Ubuntu 24.04 LTS. Hetzner private network `tulipfleet-internal` (10.0.0.0/16) joins both servers (`fleet-prod-01` 10.0.0.2, `fleet-enterprise-01` 10.0.0.3). ADR-0003 Section 10 (Implementation Notes) records the CX→CPX divergence and private network details. See `ENTERPRISE_INFRASTRUCTURE.md`.
- ✅ **DNS A record** `enterprise-api.tulipfleet.com` → `49.12.246.212` (Cloudflare, DNS only / proxy off so Caddy handles ACME directly).
- ✅ **Caddy + Let's Encrypt** — Caddy chosen over Nginx for automatic ACME issuance and renewal. ECDSA certificate obtained via TLS-ALPN-01 challenge. HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy security headers active; HTTP→HTTPS 308 redirect.
- ✅ **Deployed `tulipfleet-enterprise-backend`** (commit `c125f4c`) as Docker container behind Caddy. End-to-end smoke verified: JWT from `api.tulipfleet.com` validates on `enterprise-api.tulipfleet.com`; `GET /api/dispatcher/vehicles` returns company-scoped data. PostgreSQL access via private network with `enterprise_backend` role (UFW rule `5433/tcp on enp7s0 ALLOW IN 10.0.0.0/16` on fleet-prod-01).
- ✅ **Sıra 2.9 — NL Compliance ZE-Zone seed (complete 2026-06-02)** — 20 active Zero-Emission zones seeded into `enterprise.nl_compliance_zones` (21 rows: Den Haag split into Centrum + Kust; 148.8 km² total). Key outcomes:
  - **Harmonized source discovery (the methodology journey).** The first 6 cities were each derived from a _different_ per-city source, because the national RWS ArcGIS FeatureServer was geo-fenced (timed out from the Hetzner DE server IP) and no consolidated endpoint was known: Amsterdam (two-layer GeoJSON API + `ST_Difference` to subtract the milieuzone ring), Rotterdam (single-layer GeoJSON API), Den Haag (DOM-embedded Draad plugin, Centrum + Kust merged via `ST_Union`), Utrecht (GeoJSON literal embedded in a Leaflet JS bundle), Eindhoven (OpenDataSoft public API), Maastricht (custom made4it CDN, lng/lat arrays). This per-city approach was fragile and labour-intensive. It was then superseded by the discovery of the **NDW DATEX II national open dataset** (`opendata.ndw.nu/emissiezones.xml.gz`, daily-updated, ~42 zones) — the same harmonized "Bron NDW" layer the Geodan/Sogelink and opwegnaarzes viewers consume. NDW is now the single authoritative source for all cities; the fragile per-city scrapers are retired.
  - **Batch seed.** Leiden (first NDW city) + 13 more active in-force cities ('s-Hertogenbosch, Arnhem, Assen, Delft, Dordrecht, Enschede, Gouda, Groningen, Haarlem, Nijmegen [3-part], Schiphol, Tilburg, Zwolle) generated from a single NDW parser + per-city migration, each with embedded 11-point sanity.
  - **Reconciliation B.** Diffed the 6 municipal-sourced cities against NDW (area %, parts, `ST_SymDifference`, Hausdorff). Den Haag re-modelled to NDW's temporal split — `denhaag_centrum_ze_zone_2025` (7.43 km², eff 2025-01-01) + `denhaag_kust_ze_zone_2026` (41.26 km², eff 2026-01-01), replacing a union that was missing 13.6 km² of the official 2026 Kust zone. Utrecht (3.00→3.25) and Eindhoven (9.45→9.78) geometry refreshed in-place via UPDATE. Rotterdam / Amsterdam / Maastricht left unchanged (divergence < 2%, cosmetic part-count differences only).
  - **Schema.** `enterprise.nl_compliance_zones.polygon` evolved `GEOMETRY(POLYGON)` → `geometry(MultiPolygon, 4326)` via ALTER migration `1779350000000` to support multi-part zones (e.g. Rotterdam 8-part, Nijmegen 3-part). Rules stored as JSONB (`shared_rules` harmonized RDW fees + `city_overlay` + `_meta` provenance).
  - **Deferred (P2):** future-dated cities (Alphen 2027, Deventer 2028, Apeldoorn/Ede 2030) and Amersfoort (3 conflicting NDW entries — needs investigation). Vrachtwagenheffing static tariff table (ADR-0012 §3.1) still pending — tracked separately.
  - **Discipline learned:** prove the target `zone_id` via SELECT before any mutation; use UPDATE (not DELETE+INSERT) for same-id geometry refresh to avoid duplicate-row risk.

**Sıra 3 — HERE Tour Planning + NL Compliance application-layer foundation (complete 2026-06-02)**

Started as a HERE sandbox spike; expanded into locking the ZE-Zone routing model and building the full Ontheffing Engine data + permission foundation. Key outcomes:

- ✅ **HERE account + Tour Planning verified.** Single app `TulipFleet` (App ID `KHqTCN74Jxxy41LCtNbc`), freemium. Tour Planning v3 reachable (live `tourplanning.hereapi.com/v3` returns optimized tours). A second API key (`****9xxw`) was created for the enterprise backend and stored in `fleet-enterprise-01:/opt/enterprise/.env` as `HERE_API_KEY`. Prod backend keeps its own key (`****Kmco`, Routing v8) — separate keys, same account.
- ✅ **ZE-Zone routing model LOCKED = Model 1 (HERE-native).** HERE recognizes NL environmental zones natively via `avoid.zoneCategories.categories:["environmental"]` + per-vehicle `exceptZoneIds` (`here:cm:envzone:NN`). TulipFleet does **not** inject its own polygons into HERE (its `avoid.areas` is boundingBox-only — too coarse for irregular NL borders). HERE `avoid` is a _soft_ preference; hard compliance enforcement + CSRD/fine reporting stays in the Compliance Layer. Two-layer architecture. Recorded in ADR-0002 §3.4.1, ADR-0011 §8.6, ADR-0012 §3.6.
- ✅ **HERE envzone catalog coverage spike.** Routing v8 `routingZones` harvest mapped **19 of 21** seeded zones to `here:cm:envzone:NN`, persisted to `_meta.here_envzone_id` (migration `1781800000000`). 2 zones absent from HERE catalog (Dordrecht ZE-start 2026-01-01, Arnhem ZE-start 2026-06-01 = catalog update lag) → `here_envzone_id = null` → Compliance Layer polygon is sole authority for those two. Nijmegen centroid was a false-negative (crescent core), recovered via deep-interior retest (`628`). ADR-0011 §8.6 / ADR-0012 §3.8.
- ✅ **`public.vehicles` compliance columns** (migration `1781700000000`): `emission_class` varchar(20) + CHECK (euro_0..euro_7, euro_vi, zero_emission; NULL ok), `date_first_admission` date (DET — Datum Eerste Toelating), `carrosserie_code` varchar(10) + partial index on (emission_class, date_first_admission) WHERE status IN (available, in_use). Additive, applied staging + prod. _(This supersedes the `emission_class` item previously listed under the §6.4 infrastructure migration.)_
- ✅ **Ontheffing Engine schema** (migration `1781600000000`): `enterprise.nl_compliance_vehicle_ontheffings` + `enterprise.nl_dagontheffing_counters` + enum `nl_ontheffing_type` (dagontheffing | netcongestie | dierenambulance). Design: depletion is hybrid/advisory (dispatcher-confirm, ADR-0005 Mode 1, counter never auto-increments); granularity company × zone_id × year (legal basis CVDR752146/1 Art 11+12 — kentekenhouder-level, 12/zone/year, NOT per-vehicle); Netcongestie 2yr (Art 9) + Dierenambulance (Art 10) modelled. ADR-0012 §3.7.
- ✅ **Idempotency guard** (migration `1781900000000`): partial unique index `uidx_vehicle_zone_date_dagontheffing` on (vehicle_id, zone_id, valid_from) WHERE type='dagontheffing' → double-consume raises 23505 → app returns 409, counter not unfairly incremented.
- ✅ **`enterprise_backend` prod grants corrected** (migration `1782000000000`, schema authority `tulipfleet-backend` per INTEGRATION_BOUNDARIES §5.2): prod was missing schema USAGE on `enterprise`, grants on the new ontheffing tables, and SELECT on `public.{vehicles,companies,users,drivers,tasks}` — staging had them, prod never did. Migration grants USAGE + ALL on enterprise._ + SELECT on the 5 public tables + `ALTER DEFAULT PRIVILEGES` so future enterprise._ tables auto-grant. Verified via `enterprise_backend` role over the private network (SELECT on public.vehicles now returns data; `vehicle_category` ∈ {truck_heavy, van}).
- ⚠️ **Process lesson — "COMMITTED" ≠ applied-to-prod.** During this work we found `1781600000000` had been recorded as committed but was only ever applied to `fleet_tracking_staging`, never to prod — caught when the grant migration's AFTER block failed on a missing table. **New discipline:** after every prod migration, verify with a `pgmigrations` row + object-existence query, not just the psql `COMMITTED` echo. All 5 Sıra-3 migrations (`1781600`–`1782000`) are now confirmed present in prod `pgmigrations`.

**Sıra 3.5 — Ontheffing Engine application layer (complete 2026-06-03)**

- Blueprint: `docs/blueprints/ADIM3_ontheffing_application_layer.md`. Fastify endpoints live on `fleet-enterprise-01`.
- `lib/checkCompliance.js` (pure fn, CVDR matrix, category-based exempt Sets: `van`→bestelauto `{SH}`, `truck_heavy`→vrachtauto `{15,16,19,23,26,27,31,SB,SF}`) — 15/15 Jest. `lib/exceptZoneIds.js` (HERE Model 1 bridge, skips `here_envzone_id=null` zones) — 9/9 Jest.
- `routes/compliance.js` — 5 endpoints under `/api/compliance/*` (per ADR-0012 §4.1): check (batch `{assignments:[...]}`), ontheffing counters, consume (advisory confirm → counter++, 23505→409), vehicle exemptions, routing/except-zone-ids. Decision order: DB grant lookup → `exempt_granted` short-circuit, else `checkCompliance`. 14/14 pg-mem integration tests.
- **Deployed live** (commits `8a3a769`, `1f48d7c`; Dockerfile `COPY lib/` added, server.js registers route). End-to-end smoke with a real JWT against the staging DB confirmed all branches: `unknown` (null emission), `needs_exemption` (euro_6 truck_heavy → dagontheffing 0/12), `exempt_granted` (active grant short-circuit).
- **Engine bug caught + fixed:** `CURRENT_DATE` in grant/exemption lookups replaced with `now()::date` (identical in real PG; `CURRENT_DATE` carried a time component under pg-mem, breaking same-day grant matches).
- Transition cutoffs read from `rules` JSONB (zone-parametric, not hardcoded). Test accounts via prod login (`admin@fleet.com`), company `00000000-0000-0000-0000-000000000001` (Demo Fleet).

**FEAT-008 — Vrachtwagenheffing tariff seed + engine, Period 1 (complete 2026-06-03)**

The API-independent half of FEAT-008: the static tariff table is now populated and a pure cost engine exists. The API/HERE-dependent consuming half stays deferred (see Phase 1.1 below).

- ✅ **Official Period-1 tariffs seeded** (migration `1782100000000`, prod + staging, 9 rows). Window `2026-07-01 → 2026-08-31` (before the temporary 22.3% discount). Source: vrachtwagenheffing.nl "Dit gaat u betalen" table "tot 1 september 2026", browser-verified 2026-06-03. Covers `12_18t`/`18_32t`/`32_plus_t` × `euro_5`/`euro_6`/`zero_emission`.
- ✅ **Schema-preserving mapping (no ALTER):** `road_type` fixed to `all_other` (NL heffing is distance-based, road-type independent); `emission_class` reuses the existing CHECK enum (CO2-klasse 5 == `zero_emission`, CO2-klasse 1 == `euro_*`); composite CO2-strings rejected by the prod CHECK constraint — caught before insert. Prod schema (sealed since Sıra 2.9.3) stays untouched so HERE orchestration is not disturbed.
- ✅ **Data correctness:** `18_32t zero_emission = 0.0370` (a 0.038 draft was corrected against the official table). Verified in both DBs.
- ✅ **`lib/calculateHeffing.js`** (commit `cabc90e`, enterprise repo) — pure fn `calculateHeffing(vehicle, tariffs, distanceInKm, onDate)`, filters `road_type='all_other'` + effective-date window (version handling), returns `{rate_per_km, total_charge, matched}`. 5/5 Jest.
- ✅ **Deploy method noted:** this project applies migrations by direct `docker exec ... psql < file.sql` against `fleet_tracking` + `fleet_tracking_staging`, with the `pgmigrations` row inserted explicitly — `/opt/fleet/backend` git checkout is stale (`05aad6d`) and `npm run migrate` is not the live runner. Period-1 migration confirmed in both DBs' `pgmigrations`.
- ⚠️ **OPEN WORK — Period 2 (2026-09-01 → 2026-12-31), −22.3% temporary discount** (Minister Karremans, 22 May 2026). Read the official rounded values from the vrachtwagenheffing.nl table "van 1 september 2026 tot 1 januari 2027" (or the RDW PDF) and insert rows with `effective_from='2026-09-01'`, `effective_to='2026-12-31'`. `onDate` version handling already supports it. 2027 inflation-adjusted rates publish Oct 2026. Also deferred: `euro_0..euro_4` + CO2-klasse 2-4 sub-tiers (currently `matched:false` for those).
- ⚠️ **Repo placement to reconcile:** the Period-1 migration was committed to `tulipfleet-dispatcher` (`d6d6eb0`), but INTEGRATION_BOUNDARIES §3/§4.2 assigns `enterprise.*` migrations to `tulipfleet-enterprise-backend`. In practice all this session's `enterprise.*` migrations were authored elsewhere and applied by direct psql; the authoritative repo for `enterprise.*` migration files needs a one-time decision.

**Sıra 4 — Dispatcher UI: Live Fleet Map (first real screen, FEAT-005)**

Split into three atomic sub-phases. The dispatcher app is the `tulipfleet-dispatcher` repo (Material Dashboard 2 PRO React TS template, CRA, baseUrl `src`).

_Sıra 4.1 — Frontend skeleton + mock-fed map (complete 2026-06-04, commit `404d997`)_

- ✅ Dependencies injected: `leaflet@^1.9.4`, `react-leaflet@^4.2.1`, `react-leaflet-cluster@^2.1.0`, `zustand@^4.5.2`, `@types/leaflet` (installed with `--legacy-peer-deps` — react-leaflet@4 + CRA 5 peer conflict).
- ✅ **React pinned to 18.2.0** in both `dependencies` and `overrides`. A clean install had pulled React 19 (template's loose `>=16.8.0`), breaking the whole MUI/Kanban/FullCalendar/react-leaflet ecosystem with `Cannot read properties of undefined (reading 'ReactCurrentOwner')` (white screen). The override makes the downgrade permanent.
- ✅ `src/store/useVehicleStore.ts` — Zustand store (`VehicleTelemetry` type; `setVehicles` / `updateVehicleLocation` / `selectVehicle`); seeded with 3 mock NL-corridor vehicles for standalone render.
- ✅ `src/layouts/live-fleet-map/index.tsx` — `<MapContainer>` + OSM-direct dev tiles (no key needed; MapTiler in 4.2/prod per ADR-0006 §3.4) + `<MarkerClusterGroup>` + per-vehicle `<Popup>`. Leaflet CSS imported; CDN marker-icon fix for the CRA/webpack icon-resolution break. Wrapped in template `DashboardLayout`. Registered in `routes.tsx` under Dashboards.
- ✅ Removed a broken `.eslintrc.json` (it had been committed containing `.gitignore` content, not ESLint config); CRA's built-in `react-app` preset (`package.json` `eslintConfig`) now governs lint. Node 24 LTS installed (was absent on the dev machine).

_Sıra 4.2 — EMQX MQTT-over-WSS live telemetry (complete 2026-06-04, commit `b849e92`; control-tower UI `913a275`)_

- ✅ **Broker verified first (no assumptions).** EMQX 5.4.0; WS 8083 + WSS 8084 listeners running; auth = `built_in_database` (password_based); authorization = file ACL (`acl.conf`, `no_match = allow`). ESP32 fleet confirmed offline (only `fleet-backend` connected).
- ✅ **Two ACL-isolated users created (Dashboard, per ADR-0009 §4.2):** `dispatcher-readonly` — subscribe-only on `fleet/device/+/location`, `+/behavior`, `+/alert`; `sim-publisher` — publish-only on `fleet/device/+/location` (dev synthetic source, `superuser=No` on both to preserve ACL). Isolation proven both directions with `mosquitto_sub`/`mosquitto_pub`.
- ✅ **Payload contract proven** against prod `public.locations` (16 columns: `device_id`, `latitude` numeric(10,7), `longitude`, `speed`, `heading`, `altitude`, `satellite_count`, `hdop`, `accel_x/y/z`, `accuracy`, `timestamp`). No `status` column — movement state derived client-side from speed (`deriveStatus`).
- ✅ **Synthetic publisher** (`sim-publisher.js`) — 5 NL trucks, ~3s tick, moving trucks advance along heading with an NL bounding-box reset (no more "trucks sailing into the North Sea"). Runs on the broker network (`mqtt://localhost:1883`), isolated from the WSS edge.
- ✅ **Frontend** `src/hooks/useMqttTelemetry.ts` — `mqtt.js` over WSS as `dispatcher-readonly`, subscribes `fleet/device/+/location`, parses → `updateVehicleLocation` (resolves topic `device_id` to store key, plate-or-chipId). Control-tower map (`LiveFleetMap.tsx`) shows live status-colored rotating markers + connection-state dot (green=connected). No imperative Leaflet manipulation (ADR-0006 §6).
- ✅ **Production WSS via nginx reverse-proxy (Path 1, corporate-standard):** discovered the prod stack already terminates TLS at nginx with valid Let's Encrypt certs (`tulipfleet.com`/`api.tulipfleet.com`), while EMQX/8883/8084 were all self-signed `CN=Client` (which is why ESP32 uses `setInsecure()` and why the self-signed broker was never a prod bug — MQTT was device/backend-only until now). Added `mqtt.tulipfleet.com` server block: certbot `--nginx` issued a Let's Encrypt cert, nginx proxies `wss://mqtt.tulipfleet.com/mqtt` (443) → EMQX plain-WS `127.0.0.1:8083` with WebSocket upgrade headers. Port 8084 closed at UFW (only 443 exposed); cert auto-renews via certbot (EMQX needs zero cert maintenance). Verified end-to-end: valid cert on 443, nginx→EMQX proxy (curl 400 = EMQX reached), browser green dot + moving markers with **no dev tunnel**. Runbook: `docs/runbooks/RUNBOOK_prod_wss_8084.md` (`780c857`).
- ✅ **Docs reconciled:** INTEGRATION_BOUNDARIES §3.2 (dispatcher now consumes MQTT — supersedes "Phase 1 does not consume MQTT"), §4.1 (nginx WSS proxy + dispatcher MQTT users under prod-backend ownership), §7.3 (dispatcher-readonly credential isolation).
- ⏭️ **Dev note:** frontend `.env` uses `wss://mqtt.tulipfleet.com/mqtt` for prod; an SSH tunnel `ws://localhost:8083` was used during build-out and is no longer required. The enterprise _backend_ still does not connect to MQTT (placeholder env only) — the MQTT consumer is the dispatcher _frontend_ (browser).

Sıra 4.3 — REST Initial-State Snapshot: COMPLETE (mekanizma), veri seed bekliyor. JWT-reuse auth (Server 1 login → token → Zustand persist) + CORS (enterprise allowlist localhost:3000, preflight 204, response header'ları kanıtlı) + snapshot GET (/api/dispatcher/locations/latest → 200) + applyLocationFrame besleme (stale-guard + plate/chipId resolve) uçtan uca kanıtlı. Snapshot şu an count: 0 — public.locations hypertable'ı boş; haritadaki 5 araç mock seed + MQTT. REST'in gerçek veri döndürmesi demo company locations seed'ine bağlı (sonraki iş).


Sıra 4.4 — Enterprise Auth Katmanı: COMPLETE. Login → token → gate → dashboard redirect çalışıyor. Şablon Basic sign-in useAuthStore.login'e bağlandı, eski LoginScreen kaldırıldı, ThemeProvider hiyerarşisi düzeltildi (linearGradient hatası çözüldü). Not: Cursor'ın eklediği OAuth/simüle-token kodu güvenlik gerekçesiyle kaldırıldı — sosyal login fonksiyonel değil, görsel bile değil; email/şifre tek auth yolu.
## 📦 Sıra 5 — Araç / Sürücü / Görev Listeleri (ADR-0011 §9.5)

**Sıra Durumu: %100 TAMAMLANDI (Mühürlü & Canlıda Dağıtıldı)**
- **Backend Durumu:** `tulipfleet-enterprise-backend` reposunda `main` dalı üzerinde `1ce898b` karmasıyla (commit) kilitlendi. `/opt/enterprise` dizinine canlı deploy edildi. `INTEGRATION_BOUNDARIES.md §3.1` sınırlarına tam sadık kalarak `fleet_tracking_staging` şemasını okuyor. Üç endpoint de (`vehicles`, `drivers`, `tasks`) geçerli kurumsal JWT ile `curl` üzerinden loopback testlerinden sıfır hatayla geçti.
- **Kimlik Doğrulama:** Sıra 4.3/4.4 kapsamında JWT-reuse katmanı, Zustand persist store ve sign-in gate entegrasyonu tamamlandığından, ön-yüz bağımlılıkları tamamen çözülmüştür. Ön-yüz veri çekme mimarisinde `useLatestLocations` (TanStack Query v5 object-signature) yapısı tüm listeler için ana şablon (template) kabul edilmiştir.

### 🔍 Doğrulanan Yer-Gerçekleri (Ground-Truths via Live DB)
- **K1 (Yetkiler):** `enterprise_backend` veritabanı rolünün `public.drivers`, `public.tasks` ve `public.users` tabloları üzerinde `SELECT` yetkisi olduğu `\z` ile kanıtlandı (`users` tablosu, ad-soyad JOIN'i için zorunludur).
- **K2 (Sürücü Şeması - ADR-0011 §12 Çelişkisi KAPATILDI):** Canlı veritabanı okumasıyla `public.drivers` tablosunda **`skills` kolonunun OLMADIĞI ispat edildi.** Tablonun gerçek kolon yapısı: `id, user_id, license_no, license_expiry, phone, emergency_contact, status, total_km_driven, safety_score, assigned_vehicle_id, company_id` şeklindedir. Sürücü isimleri `user_id` üzerinden `public.users` tablosuna (`first_name`, `last_name`, `email`) `INNER JOIN` yapılarak ön-yüze beslenmektedir.
- **K3 (Görev Şeması & Canlı Statüler):** `public.tasks` tablosunun gerçek kolonları: `task_no, title, status, priority, driver_id, vehicle_id, start_location, end_location, scheduled_start, scheduled_end, planned_start/end, total_distance_km, created_at, company_id`. Staging veritabanında Dobbe lojistik sisteminden gelen aktif statüler: `completed`, `pending_review`, `in_progress`. `scheduled_start` alanı sparse (çoğu boş) ve geçmiş tarihli olduğundan, `today`/`planned` filtrelerinin ekranda 0 sonuç dönmesi bir bug değil, verinin kendi yer-gerçeğidir.

### 📊 Dilim Durumları (Slice Status)

#### 5.1 Araç Yönetimi (Vehicles) — DONE (Commit: `9aaf1fb` / Ön-Yüz: `5f8e12e`)
- **Backend:** `GET /api/dispatcher/vehicles` endpoint'i `{vehicles,count}` dönüyor. Phase 1.1 kapsamında genişletilmiş kurumsal envanter kolonları (`fuel_type`, `total_km`, `last_maintenance_date`, `next_maintenance_km`, `emission_class`) zırhlı SELECT ile koda işlendi.
- **Frontend:** `useVehicles.ts` hook'u (TanStack v5) üzerinden veri çekiliyor. `vehicles/index.tsx` ekranında şablon `DataTable`, `DashboardLayout` kabuğu, client-side sürücü lookup eşleştirmesi ve veri tiplerini koruyan `toNum` tip zırhı entegre edildi. 4 gerçek Dobbe aracı harita entegrasyonuyla render ediliyor.

#### 5.2 Sürücü Yönetimi (Drivers) — DONE (Ön-Yüz Commit: `5f8e12e`)
- **Backend:** `GET /api/dispatcher/drivers` endpoint'i şirket sınırlarına göre (`company-scoped`) veriyi izole edip `public.users` tablosuyla `INNER JOIN` yaparak `{drivers,count}` dönüyor.
- **Frontend:** `useDrivers.ts` kancası yazıldı. `drivers/index.tsx` ekranında `DataTable` üzerinde sürücü bilgileri, `safety_score` için 0-10 ölçekli progress bar (canlı DB verisinde min 4.5 / max 9.2 / avg 5.44 skalası korundu), araç plakası için client-side plaka eşleştirmesi ve 5 canlı statüyü (`available`, `on_task`, `task_pending`, `on_leave`, `offline`) kapsayan Material UI badge tasarımları ayağa kaldırıldı. Sol menüde `people` ikonuyla yerini aldı.

#### 5.3 Görev Yönetimi (Tasks) — DONE (Ön-Yüz Commit: `0b57c5e`)
- **Backend:** `GET /api/dispatcher/tasks?filter=pending_review|today|planned` + filtresiz genel liste mimarisi `{tasks,count,filter}` formatında teslim edildi.
- **Frontend:** `useTasks.ts` kancası query-key bağımlı filtre yapısıyla kodlandı. `tasks/index.tsx` ekranında `DataTable` üzerinde 4'lü MUI Tab yapısı (`Alle` [Varsayılan], `pending_review`, `today`, `planned`) kuruldu. Canlı veritabanındaki 9 statüyü (`pending`, `pending_review`, `accepted`, `assigned`, `rejected`, `in_progress`, `completed`, `cancelled`, `withdrawn`) eksiksiz karşılayan `MDBadge` renk matrisi haritalandı. `ADR-0005 §4.1` gereği satır içi hızlı onay (inline approval) mekanizması gürültüyü önlemek için kaldırıldı. Sol menüde `assignment` ikonuyla kilitlendi.

#### 5.4 UI/UX Cilalama & Ergonomi — ⚠️ PLANLANAN (Sıra 6.5 ile Birlikte Yürütülecek)
- **Özet Kartları (Gradient Stat Cards):** Sürücü ve görev ekranlarının üst kısmına canlı gradyan geçişli operasyonel istatistik kartları eklenecek (Araçlar için: *Total / Moving / Out-of-service*; Görevler için: *Total / Today / Pending-Review*).
- **Haritaya Odaklanma Aksiyonu (Focus-on-Map):** Görev veya araç listesinden bir satıra tıklandığında, Sıra 4.1'den kalan `useVehicleStore.selectedVehicleId` + `selectVehicle` global state'i tetiklenerek uygulamanın otomatik olarak `Live Fleet Map` ekranına yönlenmesi, ilgili araca zoom (yakınlaşma) yapması ve sol menü odağını kaydırması kodlanacak.
- **Ergonomi ve Performans:** Sayfalama için `MDPagination` ve arama kutuları için geciktirmeli (`debounced search`) girdi filtreleri eklenerek sunucu yükü hafifletilecek.

### ⚠️ Kritik Sınırlar ve Operasyonel Notlar (Flags Carried Forward)
1. **Veri Kısıtı:** Staging veritabanında şu an yalnızca 3 görev ve 4 sürücü bulunmaktadır. Daha geniş kapsamlı bir dispatcher demosu için `fleet_tracking_staging` şemasının seed edilmesi bağımsız bir yan görevdir.
2. **Database Fallback Riski:** `plugins/db.js` içindeki veritabanı bağlantı hatası durumunda çökmemeyi sağlayan koruma katmanı `NODE_ENV` bağımlıdır. Canlı ortam `NODE_ENV=production` ile çalıştığı için güvenlidir; ancak sunucuda bu değişkenin yanlışlıkla silinmesi durumunda backend'in sessizce boş sonuçlar dönme riski (foot-gun) not edilmiştir, engelleyici değildir.
3. **Araç İzolasyonu:** Bu dilim içerisindeki hiçbir kod `ecc.tools` veya `Cursor` otomatik yapay zeka kurallarına paslanmamıştır. Sıra 4.4'te temizlemek zorunda kaldığımız o tehlikeli OAuth bypass yamalarının tekrar sızmasını önlemek amacıyla geliştirmeler atomic olarak dosya ismiyle (`git add <file_name>`) repo geçmişine işlenmiştir.
   
**Sıra 6 — Plan workflow (Advisory mode — FEAT-001 through FEAT-007)**

- `POST /api/dispatcher/plans` — submit to HERE Tour Planning with truck attributes, capacity, skill, time window, and compliance avoidance area constraints.
- `GET /api/dispatcher/plans/:id` — fetch status and result with predicted ETA.
- `POST /api/dispatcher/plans/:id/approve` — commit plan to `enterprise.dispatch_tasks` and push to existing `public.tasks` (one-way per ADR-0009 §4.4).
- `POST /api/dispatcher/plans/:id/replan` — manual "Replan Now" for dynamic re-routing (FEAT-004 per ADR-0011).
- Compliance check endpoint: `POST /api/compliance/check` (note: `/api/compliance/*` path naming per ADR-0012 §4.1, not `/api/dispatcher/compliance/*`).
- Apply ADR-0004 v3 §6.2 migration (`public.tasks.enterprise_dispatch_task_id` nullable UUID column).
- Plan review UI: map + timeline + Kanban views.

- **Durum: staging'de TAMAM (25.06.2026).** Hibrit Köprü API + Plan Onay Akışı çalışıyor ve kanıtlı. Production köprü deploy'u bilinçli bekletildi (prod enterprise.dispatch_tasks = 0 satır; migration + INTERNAL_BRIDGE_TOKEN prod'da hazır). Açık kalanlar: replan endpoint (FEAT-004), /api/compliance/check, Plan review UI.

**Sıra 7 — Pilot customer onboarding**

- TulipFleet brand theming applied to dispatcher UI.
- Production deploy on `fleet-enterprise-01`.
- First customer pilot (target: K/M-segment NL 3PL with 50–300 vehicles per ADR-0011 §4.1).

**Phase 1.1 — Quick follow-up (1–4 weeks after MVP launch)**

These items ship shortly after the Phase 1 MVP launch, not in the MVP itself. Detaylı sıralama yukarıda **Feature Wishlist Coverage Matrix**'te.

**Implementation-ready (spec hazır):**

- **FEAT-008 — Vrachtwagenheffing route cost optimization (W-A1).** **Period-1 baseline done in Sıra 3.5** (official tariff seed prod+staging + pure `calculateHeffing` engine). Remaining (API/HERE-dependent, ~3–5 days, activate when Temmuz 2026 API goes live): `syncVrachtwagenheffingTariffs` worker, `fetchRoadSegmentType` (HERE), `buildHereProblem` toll-matrix injection, `GET /api/dispatcher/reports/hgv-toll`, `<CostBreakdownWidget />`, and the `enterprise.routing_jobs.cost_breakdown` JSONB column. Plus Period-2 discount seed (see Sıra 3.5 OPEN WORK). Per ADR-0011 and ADR-0012.
- **FEAT-009 — Basic carbon footprint per route (W21).** HERE Eco Routing already returns CO2/fuel data; UI display added. **CSRD-aware** (FEAT-009) vs **CSRD-compliant** (FEAT-106 Phase 2) ayrımı per FEAT-009 §1.2.

**Spec pending — sıraya alındı (Phase 1.1 hedefi):**

- **FEAT-010 — Automated Exception Handling (W8).** Wishlist'in atlanmış common feature'ı. Detection (FEAT-005 ETA deviation) + decision (ADR-0005 Mode 1 advisory) + action (FEAT-002 re-route, FEAT-003 reassign). Phase 1.1 sıradaki pilot.
- **FEAT-013 — Hazmat & Compliance Routing (W12).** ADR-0012 NL Compliance Layer ile sinerjili — niche ama expertise feature.
- **FEAT-016 — Cost-to-Serve Modeling (W15).** Per-route/driver/address profitability — FEAT-008 cost_breakdown JSONB üstüne.
- **FEAT-017 — Locker/PUDO Management (W17).** Mevcut geofence altyapısı üstüne — Cem notu "we do with geofence".
- **FEAT-020 — Capacity-Aware Delivery Promising (W24).** Cargo management base feature, kanban approach.
- **FEAT-021 — Breadcrumbs Trail Analysis (W25).** Planned vs actual route deviation.

**Spec pending — Cem kararı bekliyor:**

- **FEAT-011 — PoD Capture (W9).** Very common ama Cem "last priority" işaretledi.
- **FEAT-012 — Refrigerated Container Monitoring (W11).** Phase 1: menu/skeleton/schema (kod path kapalı). Customer activation Phase 2.
- **FEAT-018 — Driver ELD/IFTA (W22).** Cem notu "decide whether increase db work, requires db table". NL'de zaten tahograf zorunlu, geçerli mi?
- **FEAT-022 — Workload Balancing (W26).** Cem notu "requires deep search".

**Infrastructure migration:**

- **Apply ADR-0004 v3 §6.4 migration** (`public.vehicles` capacity columns: `capacity_volume_m3`, `capacity_weight_kg`, `vehicle_class`, `hazmat_classes`) — FEAT-002 truck-aware routing, FEAT-007 capability matching, FEAT-008 toll calculation, FEAT-013 hazmat routing ön koşulu. _(Note: `emission_class` already added in Sıra 3 via migration `1781700000000`, along with `date_first_admission` + `carrosserie_code` for NL compliance.)_

**Indicative timeline:** 6–9 weeks from completion of Sıra 1 to first-customer pilot, assuming single founder/developer pace. Phase 1.1 follow-ups extend ship period by ~1–4 weeks.

#### Out of scope (explicitly)

Per ADR-0011 §7, the following are bilinçli olarak Phase 1 dışında:

- Third-party telematics connectors (Phase 2+).
- Auto-dispatch / exception-based mode (Phase 2).
- Agentic mode (Phase 3, ADR pending).
- Driver drowsiness / DMS computer vision (separate business line; ADR pending).
- Custom VRP engine / OR-Tools (escape hatch only, ADR-0002 §8).
- Mapbox GL JS migration (escape hatch only, ADR-0006 §7).
- Multimodal orchestration (rail/sea/road) — Phase 3 ADR. Wishlist W10 (Very common), OUT-001 per ADR-0011 §7.
- **Autonomous Vehicle Integration** — Phase 3 ADR. Wishlist W20 (Niche, "future foreseen"), OUT-004 added 2026-05-30 (per ROADMAP Feature Wishlist Coverage Matrix).
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

**Additional wishlist Phase 2 candidates** (mapped via Feature Wishlist Coverage Matrix above; customer-funded triggers per ADR-0011 §6 pattern):

- **FEAT-014 — Multi-carrier Tender Management (W13).** Freight quote automation across carriers.
- **FEAT-015 — Automated Freight Audit and Payment (W14).** Very common Phase 2 feature, invoice/contract verification.
- **FEAT-019 — Multi-Day Long-Haul Planning (W19).** Multi-day VRP + EU 561/2006 driver hours + cross-border toll (NL Vrachtwagenheffing + BE Viapass + DE Maut + FR péage) + tachograph DDD ingestion. ✅ Spec v1 hazır (16 FN, 4 yeni tablo). Phase 2 trigger: long-haul customer signs contract.
- **FEAT-023 — Cross-Docking Orchestration (W27).** Most likely 3PL customer trigger.
- **FEAT-024 — Predictive Failure Detection (W28).** ML risk modeling — ADR-0010 §3.5 trigger (Phase 3+ ML candidate if baseline noisy).
- **FEAT-025 — Freight Spend Benchmarking (W30).** Cross-customer data aggregation.
- **FEAT-106 — CSRD-Compliant Carbon Report Export (W-A2).** Large 3PL trigger (Heineken/Picnic level); distinct from FEAT-009 Phase 1.1 CSRD-aware display.

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

## Implementation Bottleneck Analysis

**Status as of 2026-05-30 evening:** 17 pilot + mega cross-spec sync sonrası function-level shared infrastructure analizi tamamlandı. Detaylı bulgular: [`docs/analysis/bottleneck-analysis-2026-05-30.md`](docs/analysis/bottleneck-analysis-2026-05-30.md). Aşağıda özet.

### Critical bottleneck'ler (Top 5)

| Bileşen                                 | Tip      | Consumer          | Severity | Mitigation                                              |
| --------------------------------------- | -------- | ----------------- | -------- | ------------------------------------------------------- |
| **FEAT-001:FN-016 buildHereProblem**    | FUNCTION | 6 extension FEAT  | HIGH     | Options object refactor (Phase 1.1 sprint)              |
| **enterprise.dispatch_tasks**           | TABLE    | 15+ FEAT          | HIGH     | Phase 3 table splitting (ADR-0013 candidate)            |
| **HERE Tour Planning API**              | EXTERNAL | ~9 FEAT           | CRITICAL | Internal RoutingProvider interface (ADR-0014 candidate) |
| **FEAT-010:FN-06 logExceptionEvent**    | FUNCTION | 7 FEAT            | MEDIUM   | Exception_type category prefix                          |
| **public.geofences.location_type enum** | TABLE    | 4 FEAT (12 değer) | HIGH     | PostGIS index strategy                                  |

### Critical path (Phase 2 customer-funded FEAT'ler)

Phase 2 customer trigger geldiğinde, **önceki tüm halka production'da olmalı**:

| Hedef FEAT (Phase 2) | Önceki zincir             | Zincir uzunluğu |
| -------------------- | ------------------------- | --------------- |
| FEAT-106 CSRD        | F009 + F103 + F014 + F008 | 4               |
| FEAT-103 EV          | F001 + F005 + F017 + F009 | 4               |
| FEAT-015 Audit       | F014 + F004 + F008        | 3               |
| FEAT-019 Long-haul   | F001 + F008 + F017        | 3               |
| FEAT-018 Reverse     | F001 + F003 + F017        | 3               |
| FEAT-014 Tender      | F004 + F001               | 2               |

### Yeni ADR adayları (NotebookLM stratejik önerileri)

- **ADR-0013** — `enterprise.dispatch_tasks` Phase 3 schema strategy (table splitting + metadata offloading). 15+ consumer = JSONB metadata explosion riski.
- **ADR-0014** — Internal RoutingProvider interface (HERE abstraction layer). Vendor lock-in mitigation, Phase 1.1 sprint öncesi yazılmalı.

### Phase 1.1 sprint foundation öncelik

Phase 1.1 implementation kickoff için **bottleneck-aware** sprint sırası:

1. **FEAT-001'in foundation kısmı (mock-first akış) DONE (commit f968ce8, state machine test edildi); kalan: HereTourPlanningProvider gerçek gövdesi (Temmuz 2026 HERE API).
2. **FEAT-005 base components** — MQTT subscriber + Leaflet map widget shared
3. **FEAT-010 exception orchestrator** — 7 FEAT consumer foundation
4. **FEAT-017 geofence type extension** — PostGIS index strategy (12 enum value)
5. **FEAT-008 Vrachtwagenheffing** — Phase 1.1 toll baseline
6. **FEAT-009 Carbon footprint** — Phase 1.1 baseline + FEAT-106 prerequisite

### Cross-cutting concerns (5 mimari sıcak nokta)

Disciplined evolution kanıtı — 3+ FEAT'in aynı altyapı paterni paylaşması:

- **Geofence type extension** (F017 → F019 → F103) — 12 enum value
- **Cross-spec sync FN-016** (F006+008+009+019+103) — 8 parametre imza
- **Exception event writer** (FEAT-010:FN-06) — 7 FEAT consumer, 16 enum
- **Weighted sum scoring** (ADR-0010 §3.4) — 6 FEAT
- **MQTT subscriber + map widget** (F005:FN-02 + FN-06) — 5+4 consumer

### Strategic insights

NotebookLM 4 prensip + Claude eklemesi:

1. **Disciplined Evolution** — FN-016 8 parametre breaking-change'siz büyüdü (ADR-0004 v3 §6 başarısı)
2. **Pattern Reuse** — ~%40-60 kod tekrarı azalması (NotebookLM tahmini)
3. **ML Discipline** — Vendor consumer, in-house training yok (avantaj + lock-in trade-off)
4. **Schema Stability** — dispatch_tasks Phase 3 risk (ADR-0013 candidate)
5. **Critical Path Awareness** — Phase 2 trigger gelmeden Phase 1.1 foundation tamamlanmalı

### Risk mitigation summary

| Risk                       | Severity | Mitigation timing                              |
| -------------------------- | -------- | ---------------------------------------------- |
| HERE outage                | CRITICAL | ADR-0014 RoutingProvider interface (Phase 1.1) |
| FN-016 imza                | HIGH     | Options object refactor (FEAT-001 sprint)      |
| dispatch_tasks bloat       | HIGH     | ADR-0013 (Phase 3)                             |
| LLM rate limit             | MEDIUM   | Caching + retry exponential (FEAT-015 sprint)  |
| Weighted scoring explosion | MEDIUM   | Centralized weight registry (Phase 2)          |

Detaylı analiz, UNCERTAINTIES kategorize (~80+), aksiyon listesi: [`docs/analysis/bottleneck-analysis-2026-05-30.md`](docs/analysis/bottleneck-analysis-2026-05-30.md).

## Non-Goals

What TulipFleet Enterprise will **not** become, by explicit decision:

- **Not a vendor-neutral dispatch SaaS.** That market is commoditized; entering it without a moat is not the chosen path. See [ADR-0007](docs/adr/ADR-0007-telematics-integration-strategy.md).
- **Not a custom-VRP-engine vendor.** TulipFleet does not differentiate by having a better solver than HERE; it differentiates by hardware, MQTT-based event architecture, and vertical focus. See [ADR-0002](docs/adr/ADR-0002-vrp-solver.md).
- **Not an in-house ML / AI training shop.** ML capability is consumed from third-party APIs (HERE today, possibly LLM APIs in Phase 2 for FEAT-105). In-house training is Phase 3+ with customer funding. See [ADR-0010](docs/adr/ADR-0010-ml-strategy.md).
- **Not a hardware-only product.** The dispatcher software is part of the product, not an add-on; the entire offering is sold as a platform.
- **Not a multi-tenant Mode-3 agentic product on launch.** Liability, trust, and operational maturity all require gradual progression. See [ADR-0005](docs/adr/ADR-0005-dispatch-workflow.md). **Sectoral validation (2026-05-30):** Mode 3 (fully autonomous dispatch) explicit out-of-scope kabul edilir — NL labor union concerns + dispatcher trust gap (DoorDash AI rollout case study) + sectoral user adoption research (Onfleet, Bringg). TulipFleet'in stratejik konumu: **dispatcher'ı kontrol etmez, ona asistanlık yapar** (§Strategic Positioning Workaround-aware design bullet).
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

Three failure modes observed during the public.\* additive migrations and Sıra 1.5 endpoint development require explicit guardrails:

- **UTF-8 BOM encoding.** PowerShell editors and Out-File default to UTF-8 with BOM on some Windows versions. The PostgreSQL SQL parser rejects the BOM character (`U+FEFF`) with a generic syntax error that is difficult to diagnose. Required practice: SQL migrations created on Windows must be written with `[System.Text.UTF8Encoding]::new($false)` (no BOM), or saved via VS Code with explicit "UTF-8 without BOM" encoding. Verify with `head -c 6 file.sql | xxd` — the first three bytes must NOT be `ef bb bf`. This same discipline applies to all `.js`, `.json`, and `.env` files created via PowerShell heredoc.
- **Pattern-match false positives in constraint discovery.** Using `LIKE '%role%'` (or similarly loose patterns) to find a constraint to drop can match more than one constraint. Combined with `LIMIT 1`, the migration becomes non-deterministic and may drop the wrong constraint. Required practice: when the constraint name is known and stable (e.g., `users_role_check`), use `DROP CONSTRAINT IF EXISTS <exact_name>` directly. Reserve dynamic name discovery only for genuinely unknown schemas, and even then anchor the pattern tightly (e.g., match on constraint definition substring AND constraint name prefix).
- **Schema column names must be inspected, not assumed.** During Sıra 1.5, the first attempt at `GET /api/dispatcher/vehicles` failed with `column "license_plate" does not exist` because the actual column is `plate_no`. The same pattern caught `brand` (not `make`). Required practice: before writing any SQL that touches an existing table, run `\d public.<table>` against the staging database and use the **real** column names. This is especially important for the dispatcher backend (which only reads `public.*`); schema authority remains in `tulipfleet-backend`, so changes to columns are out-of-scope for the dispatcher backend — it must adapt.

### Strategic moat through compliance data

NL Compliance Layer (ADR-0012) starts as an internal Phase 1 module but is architected with Phase 3 standalone-product extraction in mind. The dispersion of NL regulatory data sources (vrachtwagenheffing.nl, evofenedex, TLN, RDW, 18 municipal `toegangsbeleid` systems) creates a defensible position: once TulipFleet consolidates this data and validates it operationally, the moat is hard for competitors to replicate. This is a long-term play — Phase 3 launch is at the earliest Temmuz 2027 — and the architectural disciplines codified in ADR-0012 §4 protect the future optionality without burdening Phase 1 delivery.

### Known vulnerabilities — accepted-risk register

Fastify v4 carries three known unpatched CVEs that the project accepts as low-impact for Phase 1 internal use:

| CVE                                           | Severity         | Patched in    | Why accepted Phase 1                                                                                                                                                                                                                       |
| --------------------------------------------- | ---------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GHSA-mrq3-vjjr-p77c (sendWebStream DoS)       | Low (3.7)        | Fastify 5.7.3 | Dispatcher backend returns JSON; no Web Streams in any route.                                                                                                                                                                              |
| GHSA-jx2c-rxcm-jvmq (Content-Type tab bypass) | (moderate range) | Fastify 5.x   | No security decision in dispatcher routes derives from body schema validation alone; authentication and tenant isolation are enforced separately.                                                                                          |
| GHSA-444r-cwp2-x5xf (X-Forwarded spoofing)    | Moderate (6.1)   | Fastify 5.8.3 | Only exploitable with restrictive `trustProxy` config; Phase 1 uses `trustProxy: false` (direct connection). Sıra 2 reverse proxy will use `trustProxy: true` with Caddy/Nginx on a private network, or whitelist the proxy IP explicitly. |

`fast-jwt` (6 CVEs) and `fast-uri` (2 CVEs) are mitigated via npm `overrides` block in `package.json` pinning patched versions while keeping Fastify 4 itself stable. Phase 2 will produce an ADR (revisiting ADR-0008) to decide between Fastify 5 migration and continued v4 use with reverse-proxy-level mitigation.

### Bottleneck-aware engineering discipline (added 2026-05-30)

17 pilot + mega cross-spec sync sonrası function-level shared infrastructure analizi yapıldı (detay: §Implementation Bottleneck Analysis + [`docs/analysis/bottleneck-analysis-2026-05-30.md`](docs/analysis/bottleneck-analysis-2026-05-30.md)). Sectoral pattern extraction ile somut aksiyonlara dönüştürüldü ([`docs/analysis/sectoral-patterns-2026-05-30.md`](docs/analysis/sectoral-patterns-2026-05-30.md)).

**Disipline formülü:**

- **Maintenance maliyeti gerçek + Performance maliyeti hipotetik** → ŞIMDI çöz
- **Maintenance maliyeti düşük + Performance maliyeti ölçümsüz** → BEKLE (production veri sonrası karar)

Bu disiplin §Implementation Bottleneck Analysis'teki **Phase 1.1 sprint foundation öncelik haritası** ile birlikte okunur. Şimdi-çöz aksiyonları: FN-016 Builder Pattern (maintenance carry cost), IRoutingProvider interface (vendor lock-in business continuity), PostGIS partial GIST index. Bekle-aksiyonları: dispatch_tasks table splitting (100k satır trigger), location_type hierarchical migration (20+ tip trigger), LLM API caching (Phase 2 rate limit observation).

**Sectoral pattern reuse:** TulipFleet bu bottleneck'lerle ilk karşılaşan değil. Uber, DoorDash, Onfleet, Stripe, Netflix, Shopify gibi şirketler benzer sorunları çözdü; pattern transfer sıfırdan icat etmekten verimli. Engineering blog'lar + design pattern literatürü (Refactoring.Guru, Martin Fowler) **disipline kaynağı** olarak ROADMAP §Cross-Cutting'in temel parçasıdır. Bu prensip, yeni teknik karar gerektiren her durum için default olarak uygulanır: önce sektörel pratik ara, sonra adapt et.

---

## Repository Map

| Repository                      | Purpose                                                                                                                                                                                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tulipfleet-dispatcher`         | This repo. Dispatcher web UI. Material Dashboard 2 PRO React TS based.                                                                                                                                                                                                                                                          |
| `tulipfleet-backend`            | Existing Fastify backend serving `api.tulipfleet.com` (mobile app + admin). **Also schema authority** — owns all migration files (`migrations/`), including `enterprise.*`, PostGIS extension, and `public.*` additive Phase 1 migrations.                                                                                      |
| `tulipfleet-enterprise-backend` | New Fastify backend serving `enterprise-api.tulipfleet.com`. Consumes `enterprise.*` schema, does not write migrations. Hosts the NL Compliance Engine as a Fastify plugin in Phase 1-2. **Created 2026-05-15, skeleton operational; health and `GET /api/dispatcher/vehicles` endpoints verified locally against staging DB.** |
| `tulipfleet`                    | Existing React Native (Expo) driver and admin app. **No changes required in Phase 1** per ADR-0009 §4.6.                                                                                                                                                                                                                        |
| `tulipfleet-qa`                 | QA documentation (`DEMO_OLUSTURMA.md`, infrastructure notes, schema conventions, dependency conflict history).                                                                                                                                                                                                                  |

---

## Document Conventions

- **ADRs** record decisions, with rationale and consequences. They are immutable once accepted; new decisions get new ADRs that supersede older ones (e.g., ADR-0004 v3 supersedes v2, which superseded v1). Addendums (e.g., ADR-0009 §4.5.1) are minor consistency clarifications and do not constitute new ADRs.
- **This ROADMAP** is the executive summary. It is updated as the phase status changes or as new ADRs are added.
- **READMEs** in each repo describe how to run that codebase locally.
- **Feature specifications** (forthcoming, in `docs/features/`) provide implementation-level Who/What/How/When/Where for each in-scope use case from ADR-0011. These are living documents; ADRs are the decisions, feature specs are the implementations.

---

## Change Log

| Date                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-13 (initial)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Initial roadmap. ADRs 0001–0007 accepted. Phase 1 (Architecture & Bootstrap) in progress.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-05-13 (post-migration)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Schema migration applied to staging and production. ADR-0004 revised to v2. External Migration Tool pattern documented. May 11 production-only feature work rescued via feature branches and merged into `main`. Sıra 0–7 execution order documented. Production safety protocol cross-cutting discipline added.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-05-14 (strategic layer complete)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | ADRs 0008 (Fastify v4), 0009 (Integration map), 0010 (ML strategy), 0011 (Use case scope + HERE coverage), 0012 (NL Compliance Layer strategy) added. ADR-0004 revised to v3 (Phase 1 additive `public.*` changes legalized in Section 6). ADR-0009 §4.5.1 addendum added (Compliance Engine inheritance). Target customer segment refined to K/M-50–300 vehicles per Top 100 Logistiek Dienstverleners 2025. Strategic positioning enhanced with KOBİ digital readiness, ketenregie, and compliance moat insights. Phase 1.1 follow-ups defined (Vrachtwagenheffing optimization, basic carbon, vehicles capacity migration). PostGIS adoption planned for ADR-0012 compliance polygons. Pre-Sıra-1 preparation step added (revisions + extension test).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-05-15 (Sıra 1 in progress)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Three Phase 1 public._ migrations applied to staging and production: PostGIS extension activation (`1778900000000_enable-postgis`), `users.role` 'dispatcher' enum extension (`1778950000000_add-dispatcher-role`), `companies.dispatch_mode` column (`1778950000001_add-companies-dispatch-mode`). All migrations carried zero customer impact (production backend uptime maintained throughout). Sıra 1 order revised: code skeleton → smoke test with `fleetadmin` superuser → `enterprise_backend` role creation based on observed access patterns → final smoke test with production-equivalent role. Role definition moved from Sıra 2 into Sıra 1. New cross-cutting discipline added: "Migration authoring discipline" — codifies UTF-8 BOM avoidance and constraint-name discovery best practices learned from two rollback incidents during the public._ migrations.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-05-15 (evening — Sıra 1.4 + 1.5 complete)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `tulipfleet-enterprise-backend` repository created on GitHub (private). Fastify v4 skeleton operational (`server.js`, plugins/{db,auth}, routes/{health,vehicles}). `GET /health` and `GET /api/dispatcher/vehicles` verified locally against staging DB using `fleetadmin` superuser: 401 without JWT, 200 with valid JWT returning real Demo Fleet vehicle data. Dependency security overrides in place for `fast-jwt@^6.2.4` (resolves 6 CVEs) and `fast-uri@^3.1.2` (resolves 2 CVEs); 3 Fastify-core CVEs added to "known vulnerabilities — accepted-risk register" cross-cutting section with rationale. Schema discovery: `public.vehicles` column reference recorded (key naming: `plate_no` not `license_plate`, `brand` not `make`); strategic observations about the schema's information-richness (status, vehicle_category, fuel_type, behavior thresholds, geofence integration) captured for Phase 2 planning. Third migration authoring rule added: "Schema column names must be inspected, not assumed" — triggered by Sıra 1.5 endpoint failure when assumed column names did not match real schema.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-05-24 (Sıra 1 complete)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `enterprise_backend` Postgres role created with least-privilege grants                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-05-25 (Sıra 2 4/5 complete)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `fleet-enterprise-01` provisioned (Hetzner **CPX 32** — note: ADR-0003 v1 said "CX32"; ADR-0003 §10 Implementation Notes records the divergence). Ubuntu 24.04 LTS, cloud-init bootstrapped UFW/fail2ban/Docker/Caddy. Hetzner private network `tulipfleet-internal` (10.0.0.0/16) created and both servers attached (10.0.0.2 + 10.0.0.3). Enterprise backend accesses PostgreSQL over the private network via `enterprise_backend` role (UFW `5433/tcp on enp7s0 ALLOW IN 10.0.0.0/16` on fleet-prod-01). Cloudflare DNS A record (DNS only). Caddy serving `enterprise-api.tulipfleet.com` with Let's Encrypt ECDSA cert. `tulipfleet-enterprise-backend` deployed as Docker container (commit `c125f4c`); end-to-end smoke (login on `api.tulipfleet.com` → JWT-protected call on `enterprise-api.tulipfleet.com`) returns 6 company-scoped vehicles. Operational docs created: `docs/ENTERPRISE_INFRASTRUCTURE.md`, `docs/INTEGRATION_BOUNDARIES.md`. ADR-0003 §10 Implementation Notes added. Initial snapshot: `fleet-enterprise-01-initial-cloudinit-done`. **Sıra 2.5 (NL Compliance seed) deferred to its own session** — Sıra 2 is 4/5 in this entry. Next: Sıra 2.9.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| (`SELECT` on five `public.*` tables, `ALL` on `enterprise.*`, `statement_timeout = '10s'`, default privileges for future `enterprise.*` tables). Final smoke test with production-equivalent role passed against staging DB. `tulipfleet-enterprise-backend` initial commit (`71c5260`) pushed to GitHub `main`: 10 files, 2046 insertions, Fastify v4 skeleton with health and dispatcher/vehicles endpoints. `.env` and `node_modules/` properly excluded via `.gitignore` (verified pre-commit). Sıra 1 closed. Next session: Sıra 2 — Hetzner CX32 provisioning. |
| 2026-05-30 (Feature Wishlist Coverage Matrix added)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | **New top-level section "Feature Wishlist Coverage Matrix"** added between Decision Summary and Phase Plan. Maps all 31 items of the dispatcher wishlist (`Ben_bir_advisor_um-1.docx`) to FEAT IDs, phase placements, and current spec status. Two TulipFleet-specific features added as appendix items (W-A1 Vrachtwagenheffing FEAT-008, W-A2 CSRD-Compliant FEAT-106). Coverage summary: 9 specs ready (FEAT-001..009, 27%), 12 specs pending (Phase 1/1.1 candidates, 36%), 9 Phase 2 customer-funded triggers (27%), 2 out-of-scope (W10 Multimodal OUT-001, W20 Autonomous Vehicle OUT-004 newly added 6%), 1 TulipFleet-already-doing (W30 Mobile Status Updates 3%). Phase 1.1 section expanded with implementation-ready (FEAT-008, 009) + spec pending sıraya alındı (FEAT-010 Exception Handling, FEAT-013 Hazmat, FEAT-016 Cost-to-Serve, FEAT-017 Locker/PUDO, FEAT-020 Capacity-Aware Delivery, FEAT-021 Breadcrumbs) + Cem decision pending (FEAT-011 PoD, FEAT-012 Refrigerated, FEAT-018 ELD/IFTA, FEAT-022 Workload Balancing). Phase 2 use case catalog expanded with additional wishlist Phase 2 candidates (FEAT-014, 015, 019, 023, 024, 025). Out-of-scope section: W20 Autonomous Vehicle Integration added as OUT-004 (Phase 3 ADR pending). Pilot pipeline öncelik sırası belgelendi — FEAT-010 next. Goal: tüm Phase 1/1.1 spec'leri tamamlandıktan sonra NotebookLM ilişki haritası bottleneck analysis çıkarır (function-level shared infrastructure).                                                                                                                                                                                                                            |
| 2026-05-30 (evening — bottleneck analysis)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | **Implementation Bottleneck Analysis özet bölümü eklendi.** NotebookLM tek prompt + Claude konsolidasyon (sayısal hata düzeltmeleri: FN-016 consumer 8→6, location_type enum 18→12, HERE consumer 12+→~9, UNCERTAINTIES toplam 14→~80). 5 kritik bottleneck belirlendi (FN-016 imza karmaşıklığı, dispatch_tasks schema bloat, HERE vendor lock-in, exception orchestrator, location_type enum). 2 yeni ADR adayı: **ADR-0013** (dispatch_tasks Phase 3 schema strategy — table splitting + metadata offloading) + **ADR-0014** (Internal RoutingProvider interface — HERE abstraction layer, Phase 1.1 sprint öncesi yazılmalı). Phase 1.1 sprint foundation öncelik haritası 6 FEAT belirlendi (F001 foundation, F005 base components, F010 exception orchestrator, F017 geofence, F008 toll, F009 carbon). 5 cross-cutting concern belgelendi (mimari sıcak noktalar). 4 stratejik prensip + 1 Claude eklemesi (Critical Path Awareness). Detaylı analiz `docs/analysis/bottleneck-analysis-2026-05-30.md` ayrı dosyada. NEXT: ADR-0014 RoutingProvider interface candidate yazımı + Phase 1.1 sprint plan.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-05-30 (evening — sectoral pattern integration)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | **§Strategic Positioning + §Strategic insights + §Cross-Cutting Disciplines + §Non-Goals** güncellendi. Sectoral pattern extraction (NotebookLM 2026-05-30) sonrası mimari felsefe netleştirildi. 4 değişiklik: (1) §Strategic Positioning'e **Workaround-aware design** 5. bullet eklendi (Excel/phone integration scenarios, Tabular View + Manual Override UI disipline, Mode 3 out-of-scope referansı). (2) §Strategic insights'a **Advisory effort allocation** 4. bullet eklendi (%70 effort → Mode 1 UI + Manual Override). (3) §Cross-Cutting Disciplines'a **Bottleneck-aware engineering discipline** alt-bölümü eklendi (disipline formülü: maintenance gerçek + performance hipotetik = şimdi; sectoral pattern reuse principle — Uber/DoorDash/Onfleet/Stripe/Netflix/Shopify). (4) §Non-Goals'da Mode 3 bullet'ına **sectoral validation** eklendi (NL labor unions + DoorDash AI rollout case study + Onfleet/Bringg user adoption). Yeni analiz dokümanı: [`docs/analysis/sectoral-patterns-2026-05-30.md`](docs/analysis/sectoral-patterns-2026-05-30.md). Doküman enflasyonu yerine mevcut bölümlerin zenginleştirilmesi disiplini uygulandı. NEXT: ADR-0014 IRoutingProvider candidate yazımı (Phase 1.1 sprint öncesi).                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-06-01 (Sıra 2.9 — NL ZE-Zone seed via NDW)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | **Sıra 2.9 NL Compliance ZE-Zone seeding executed.** Phase A — per-city municipal sources (the national RWS ArcGIS endpoint was geo-fenced from the Hetzner DE IP, so each city was scraped from its own viewer): Amsterdam + Rotterdam (commit `3f82270`, pgmigrations id=7–9), then Den Haag / Utrecht / Eindhoven / Maastricht (commit `92dd6c6`, pgmigrations id=10–13) — six cities, 106.28 km² (6/18 of the official rollout). Each used a distinct extraction pattern (2-layer GeoJSON+ST_Difference, single-layer GeoJSON, DOM Draad plugin+ST_Union, Leaflet JS literal, OpenDataSoft API, custom CDN). Phase B — pivoted to the **harmonized NDW DATEX II national open dataset** (`opendata.ndw.nu/emissiezones.xml.gz`, daily, ~42 zones — the same "Bron NDW" layer behind the Geodan/Sogelink + opwegnaarzes viewers), adopted as the single authoritative source. Leiden (first NDW city, pgmig id=14) + a 13-city batch ('s-Hertogenbosch, Arnhem, Assen, Delft, Dordrecht, Enschede, Gouda, Groningen, Haarlem, Nijmegen [3-part], Schiphol, Tilburg, Zwolle, pgmig id=15–27) generated from one NDW parser + per-city migration, each with embedded 11-point point-in-polygon sanity, verified staging→production. Schema `enterprise.nl_compliance_zones.polygon` evolved `GEOMETRY(POLYGON)` → `geometry(MultiPolygon,4326)` (ALTER `1779350000000`) for multi-part zones. Rules stored as JSONB (harmonized RDW Centraal Loket fees + city_overlay + \_meta provenance). Coverage after batch: 20 active cities. Deferred: future-dated cities (Alphen 2027, Deventer 2028, Apeldoorn/Ede 2030), Amersfoort (3 conflicting NDW entries), Vrachtwagenheffing tariff table (ADR-0012 §3.1). |
| 2026-06-02 (Sıra 2.9 — Reconciliation B)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | **Reconciled the 6 originally municipal-sourced cities against NDW.** Diff harness computed area %, part count, `ST_SymDifference`, divergence ratio, and Hausdorff distance (RD New / EPSG:28992) per city. Decisions: **Den Haag** re-modelled to NDW's temporal split — old union (`den_haag_ze_zone_2026`, 35.11 km², missing 13.6 km² of the official 2026 Kust zone) replaced by `denhaag_centrum_ze_zone_2025` (7.43 km², eff 2025-01-01) + `denhaag_kust_ze_zone_2026` (41.26 km², eff 2026-01-01); **Utrecht** (3.00→3.25 km²) and **Eindhoven** (9.45→9.78 km²) geometry refreshed in-place via UPDATE; **Rotterdam / Amsterdam / Maastricht** left unchanged (divergence < 2%, cosmetic part-count differences). All verified staging→production with embedded sanity (Den Haag 6/6, Utrecht+Eindhoven 16/16). **Final state: 21 rows / 20 cities / 148.8 km².** Process discipline recorded: prove the target `zone_id` via SELECT before mutating (a guessed id in the first Den Haag DELETE was a no-op and required a hotfix), and prefer UPDATE over DELETE+INSERT for same-id geometry refresh to eliminate duplicate-row risk.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-06-04 (Sıra 4.1 + 4.2 — Live Fleet Map)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | **Sıra 4.1** control-tower UI (`913a275`): split-screen dark fleet sidebar (search + status/electric filters + per-vehicle cards) + edge-to-edge CartoDB-dark map + rotating status-colored SVG markers. Resolved a recurring white-screen trap (map code twice pasted into the app entry `src/index.tsx`, destroying `createRoot`) by renaming the map file `index.tsx`→`LiveFleetMap.tsx` so the two can never be confused; React stays pinned 18.2.0. **Sıra 4.2** live telemetry (`b849e92`): EMQX 5.4.0 `dispatcher-readonly`/`sim-publisher` ACL-isolated users, 16-column payload contract proven against prod `public.locations`, synthetic NL-bounded publisher, `useMqttTelemetry` mqtt.js hook → Zustand → live markers. **Production WSS** via nginx reverse-proxy (Path 1): certbot Let's Encrypt cert for `mqtt.tulipfleet.com`, nginx terminates TLS on 443 and proxies WebSocket-upgrade → EMQX `127.0.0.1:8083`; 8084 closed at UFW; cert auto-renews (EMQX cert-free). Discovered+documented that the broker's self-signed certs were never a prod bug (device/backend-only path; ESP32 `setInsecure()`), the dispatcher being the first browser consumer. Runbook `780c857`; INTEGRATION_BOUNDARIES §3.2/§4.1/§7.3 reconciled. Discipline reinforced throughout: prove with evidence (`Get-Content`, `openssl s_client`, `curl`, `mosquitto_sub`, prod schema, `certbot certificates`) before concluding — every white-screen and connection issue was resolved by reading actual state, not guessing. Deferred: enterprise-backend `enterprise_subscriber` role (server-side telemetry, if ever needed); Vrachtwagenheffing Period 2 seed.                                                 |

| 2026-06-26 (Sıra 5+6 + FEAT-007-EXT yakıt) | Sıra 5 (araç/sürücü/görev listeleri) TAMAMLANDI. Sıra 6 (plan workflow + hibrit köprü) staging'de TAMAM, prod köprü deploy bekletildi. FEAT-007-EXT yakıt göstergesi: backend staging'de mühürlü; batch `fuelSnapshotBatch.js` (repo tulipfleet-backend, main, commit `5631a17` — eski "correlationBatch" yanlış isimdi); prod kalıcı yazıcı YOK (dosya prod'da yok, cron/timer/PM2 yok, değerler manuel UPDATE);gösterge 3 yer (3/3 TAMAMLANDI): driver araç ✅ (`7f7ca91`), admin araç mobil ✅ (`FuelGauge showIcon`), dispatcher araç web ✅ (`FuelGaugeMini`, commit `932266a`); FEAT-007-EXT yakıt göstergesi epic KAPANDI.
