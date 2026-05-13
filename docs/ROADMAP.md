# TulipFleet Enterprise — Roadmap

A high-level summary of the architectural and product decisions that govern the TulipFleet Enterprise Dispatcher. Each decision has a detailed Architecture Decision Record (ADR) in [`docs/adr/`](docs/adr/). This roadmap is the index and the executive view.

> **Status as of 2026-05-13:** Phase 1 (Architecture + Bootstrap) in progress. Dispatcher template imported, ADRs 0001–0007 accepted, server provisioning next.

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
| **Database**      | Shared PostgreSQL, `public.*` / `enterprise.*` schema split, telematics-agnostic core | [ADR-0004](docs/adr/ADR-0004-database-strategy.md)         |
| **Dispatch Workflow** | Three-mode maturity model (Advisory → Exception-based → Agentic); Phase 1 ships Advisory only | [ADR-0005](docs/adr/ADR-0005-dispatch-workflow.md)         |
| **Map Widget**    | Leaflet + react-leaflet, Mapbox GL JS retained as upgrade option | [ADR-0006](docs/adr/ADR-0006-map-widget.md)                |
| **Telematics Integration** | Scenario C (flagship + open), customer-funded connectors only, strict phase gating | [ADR-0007](docs/adr/ADR-0007-telematics-integration-strategy.md) |

---

## Phase Plan

### Phase 1 — Architecture & Bootstrap (current)

**Goal:** Ship a working Advisory-mode dispatcher for the first paying customer using TulipFleet's own telematics.

**Architecture:**
- Dispatcher web app (Material Dashboard 2 PRO React TS) — repo bootstrapped, local dev verified.
- New backend (`enterprise-api.tulipfleet.com`) on Hetzner CX32 — to be provisioned.
- Shared PostgreSQL with new `enterprise.*` schema — schema migration pending.
- HERE Tour Planning API integration via the `IRoutingProvider` interface.
- Leaflet-based live fleet map subscribing to existing EMQX MQTT topics.

**Features:**
- Live Fleet Map screen.
- Vehicle / Driver / Task list pages.
- Plan creation, review (map + timeline + Kanban), approve / modify / reject.
- Advisory-mode dispatch (system suggests, dispatcher approves every action).
- TulipFleet brand theming on the dispatcher UI.

**Out of scope (explicitly):**
- Third-party telematics connectors (Phase 2+).
- Auto-dispatch / exception-based mode (Phase 2).
- Agentic mode (Phase 3, ADR pending).
- Driver drowsiness / DMS computer vision (separate business line; ADR pending).

**Indicative timeline:** 8–12 weeks from server provisioning to first-customer pilot.

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

---

## Repository Map

| Repository                | Purpose                                                                       |
| ------------------------- | ----------------------------------------------------------------------------- |
| `tulipfleet-dispatcher`   | This repo. Dispatcher web UI. Material Dashboard 2 PRO React TS based.        |
| `tulipfleet-backend`      | Existing Fastify backend serving `api.tulipfleet.com` (mobile app + admin).   |
| `tulipfleet-enterprise-backend` | (To be created.) New Fastify backend serving `enterprise-api.tulipfleet.com`. |
| `tulipfleet-mobile`       | Existing React Native (Expo) driver and admin app.                            |
| `tulipfleet-firmware`     | ESP32 firmware repository.                                                    |

---

## Document Conventions

- **ADRs** record decisions, with rationale and consequences. They are immutable once accepted; new decisions get new ADRs that supersede older ones.
- **This ROADMAP** is the executive summary. It is updated as the phase status changes or as new ADRs are added.
- **READMEs** in each repo describe how to run that codebase locally.

---

## Change Log

| Date       | Change                                                                      |
| ---------- | --------------------------------------------------------------------------- |
| 2026-05-13 | Initial roadmap. ADRs 0001–0007 accepted. Phase 1 (Architecture & Bootstrap) in progress. |
