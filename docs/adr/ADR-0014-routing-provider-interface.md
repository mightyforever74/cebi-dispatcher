# ADR-0014: IRoutingProvider — Cross-Repo Routing Abstraction Contract

| Field           | Value                                                                       |
| --------------- | --------------------------------------------------------------------------- |
| **Status**      | Proposed (candidate)                                                         |
| **Version**     | 1                                                                           |
| **Date**        | 2026-06-18                                                                  |
| **Decision by** | Cem Bakir (Founder / Lead Engineer)                                         |
| **Component**   | TulipFleet — Routing abstraction across main fleet + enterprise backends    |
| **Related**     | ADR-0002 (HERE solver), ADR-0005 (dispatch workflow), ADR-0012 (NL compliance), FEAT-001/005/008/009/103 |
| **Extends**     | ADR-0002 §4.2, §5, §8 (does not supersede)                                  |
| **Ground truth**| SYSTEM_TOPOLOGY.md (2026-06-18)                                             |

---

## 1. Context

ADR-0002 chose HERE as the routing vendor and promised (in §4.2, §5, §8) an `IRoutingProvider` abstraction to contain HERE lock-in. As of 2026-06-18 the live system state, verified against running code and confirmed in SYSTEM_TOPOLOGY.md, is:

- **HERE Routing API v8 is live and scattered.** The main fleet backend (`tulipfleet-backend`, container `fleet-backend` on fleet-prod-01) calls `router.hereapi.com/v8/routes` directly from two route handlers: `/api/driver/route-traffic` (server.js:6457) and `/api/driver/drive-conditions` (server.js:6674). Both inline `fetch(url)`, read `HERE_API_KEY` in the handler, and duplicate the same HERE block (server.js:6485 and 6696).
- **HERE Tour Planning (VRP solver) does not exist yet.** `tourplanning`, `VRPTW`, `submitPlan`, `IRoutingProvider` appear in no backend (grep empty on server.js and the enterprise container).

So the lock-in ADR-0002 §4.2 warned about has already begun, in the single-route Routing API, before any VRP code is written. An interface scoped only to the future Tour Planning layer would leave the existing scatter unaddressed and the ADR half-done.

Additionally, the two relevant code bases live in separate repos (`tulipfleet-backend`, `tulipfleet-enterprise-backend`) on separate servers. Binding them through a shared npm package would create Phase-1.1 deployment and version-coupling overhead that is not worth paying now.

## 2. Decision

Two decisions.

### 2.1 Scope — one contract over both routing surfaces

`IRoutingProvider` covers **both** routing surfaces under a single contract:

- **Single-route / matrix** (`computeRoute`, `computeMatrix`) — synchronous, the surface HERE Routing API v8 already serves. Consolidates the two scattered live calls.
- **Multi-vehicle optimization** (`solveVrp`, async submit/poll/fetch) — the future HERE Tour Planning surface (ADR-0002 §5).

A provider declares which surface it implements via `capabilities()`. Neither repo must implement both.

### 2.2 Backend strategy — shared contract, separate implementations (cross-contract)

The two backends stay in separate code bases. ADR-0014 declares a **constitutional interface contract** that both repos must conform to, but each repo houses its own implementation:

- `tulipfleet-backend` implements `HereRoutingProvider` (computeRoute/computeMatrix) and migrates the two scattered HERE calls into it. No HERE URL or `HERE_API_KEY` read may remain in a route handler after migration.
- `tulipfleet-enterprise-backend` implements `HereTourPlanningProvider` (solveVrp) when Tour Planning is built, plus a `MockRoutingProvider` for tests/fallback.

The interface contract is duplicated as a small typed file in each repo (or a shared private package later if coupling becomes worth it). No runtime coupling between repos in Phase 1.1.

## 3. Interface Contract

```typescript
// ── Capabilities (flag-object, explicit boolean matrix) ─────────
// Every provider declares the FULL matrix: each flag true or false,
// no omissions. Compile-time autocomplete + LSP safety.
export interface ProviderCapabilities {
  // Single-route surface (HERE Routing v8 — LIVE in tulipfleet-backend)
  computeRoute: boolean;
  computeMatrix: boolean;
  traffic: boolean;          // live traffic delay + incidents
  // Multi-vehicle surface (HERE Tour Planning — future, enterprise-backend)
  solveVrp: boolean;
  // VRP feature flags (only meaningful when solveVrp is true)
  tollCost: boolean;         // FEAT-008 per-km road tax soft constraint
  ecoRouting: boolean;       // FEAT-009 emission-minimizing mode
  evConsumption: boolean;    // FEAT-103 battery SoC (Phase 2)
}

// ── Single-route / matrix (synchronous) ─────────────────────────
export interface RouteRequest {
  origin: LatLon;
  destination: LatLon;
  transportMode?: "truck" | "car";       // current calls: transportMode=truck
  return?: ("summary" | "incidents")[];  // current calls: summary,incidents
}
export interface RouteResult {
  durationSec: number;
  baseDurationSec: number;
  delayMin: number;                       // max(0,(duration-base)/60), as today
  incidents: { text: string | null; type: string }[];
  raw?: unknown;                          // provider-native payload, audit only
}
export interface MatrixRequest { origins: LatLon[]; destinations: LatLon[]; transportMode?: "truck" | "car"; }
export interface MatrixResult { matrix: number[][]; raw?: unknown; }

// ── Multi-vehicle optimization (async, submit/poll/fetch) ───────
export interface VrpProblem {
  tasks: VrpTask[];
  vehicles: VrpVehicle[];
  complianceZones?: AvoidancePolygon[];   // ADR-0012 ZE-Zone avoidance (per-vehicle)
  tollCostMatrix?: TollCostMatrix;        // requires capabilities.tollCost  (FEAT-008)
  routingMode?: "fast" | "short" | "eco"; // "eco" requires capabilities.ecoRouting (FEAT-009)
  evConsumption?: EvConsumptionModel;     // requires capabilities.evConsumption (FEAT-103)
}
export type VrpJobStatus = "submitted" | "pending" | "completed" | "failed";
export interface VrpResult {
  jobId: string;
  status: "completed";
  assignments: VehicleAssignment[];
  unassigned: TaskRef[];
  raw?: unknown;
}

// ── The contract ────────────────────────────────────────────────
export interface IRoutingProvider {
  /** Full capability matrix. Every flag explicitly true or false. */
  readonly capabilities: ProviderCapabilities;

  // Single-route surface (HereRoutingProvider implements these)
  computeRoute?(req: RouteRequest): Promise<RouteResult>;
  computeMatrix?(req: MatrixRequest): Promise<MatrixResult>;

  // Multi-vehicle surface (HereTourPlanningProvider implements these)
  submitVrp?(problem: VrpProblem): Promise<{ jobId: string }>;
  pollVrp?(jobId: string): Promise<VrpJobStatus>;
  fetchVrp?(jobId: string): Promise<VrpResult>;
}
```

The optional (`?`) methods are how the cross-contract works: a provider only implements its surface, and `capabilities()` tells callers which methods are safe to call. A caller checks `capabilities().has("vrp")` before `submitVrp`, `has("single_route")` before `computeRoute`. Calling an unimplemented method is a programming error the capability check prevents.

## 4. Factory

```typescript
// Her repo kendi factory'sini barındırır.

// tulipfleet-backend/src/routing/factory.ts
export function createRoutingProvider(): IRoutingProvider {
  switch (process.env.ROUTING_PROVIDER ?? "here") {
    case "here": return new HereRoutingProvider(process.env.HERE_API_KEY!);
    default: throw new Error(`Unknown ROUTING_PROVIDER`);
  }
}

// HereRoutingProvider matrisi (tulipfleet-backend)
//   computeRoute: true,  computeMatrix: true,  traffic: true,
//   solveVrp: false, tollCost: false, ecoRouting: false, evConsumption: false

// tulipfleet-enterprise-backend/src/routing/factory.ts
export function createRoutingProvider(): IRoutingProvider {
  switch (process.env.ROUTING_PROVIDER ?? "here-tour") {
    case "here-tour": return new HereTourPlanningProvider(/* OAuth creds */);
    case "mock":      return new MockRoutingProvider();
    default: throw new Error(`Unknown ROUTING_PROVIDER`);
  }
}

// HereTourPlanningProvider matrisi (enterprise-backend)
//   computeRoute: false, computeMatrix: false, traffic: false,
//   solveVrp: true, tollCost: true, ecoRouting: true, evConsumption: false (Phase 2)

## 5. Migration mandate (tulipfleet-backend, existing live code)

The two scattered HERE calls MUST move behind `HereRoutingProvider`:

- `/api/driver/route-traffic` (server.js:6457) and `/api/driver/drive-conditions` (server.js:6674) currently inline `router.hereapi.com/v8/routes`. After migration both call `provider.computeRoute(...)`; the duplicated HERE block (6485/6696) collapses into one place inside the provider.
- `HERE_API_KEY` is read only inside `HereRoutingProvider`, never in a handler.
- The existing response shape (`status_icon`, `status_code`, `delay_min`, `duration_min`, `incidents`) is preserved; the provider returns `RouteResult` and the handler maps it. No behavior change for the mobile app.

This is the part of the ADR that removes the lock-in already present, not just the part that prevents future lock-in.

## 6. Non-Goals (YAGNI)

- No `OrToolsProvider` (ADR-0002 §8 escape hatch; Phase 2, customer-funded).
- No `RoutificProvider` beyond a possible capabilities-only stub.
- No shared npm package binding the two repos in Phase 1.1 (§2.2). Contract is copied per repo; consolidate later only if coupling earns its cost.
- No universal cross-solver constraint DSL.

## 7. Scope boundary

`IRoutingProvider` is routing only. Telematics/GPS, proof of delivery, driver coaching, cold-chain, freight audit, document OCR, yard RTLS, breadcrumb analytics belong to other layers (per HERE capability analysis 2026-06-18). Do not widen the interface to cover them.

## 8. Consequences

### 8.1 Positive
- Existing scattered HERE Routing calls collapse to one provider; the live lock-in is removed, not just prevented.
- Both backends speak the same contract without runtime coupling.
- Future Tour Planning slots into the same interface; FEAT-005/008/009/103 gate on `capabilities()`.
- A provider swap (OrTools, Routific, Mock) is a factory line + a new class.

### 8.2 Negative / accepted trade-offs
- Contract duplicated across two repos (no shared package yet). Accepted: avoids version coupling; drift risk mitigated by keeping the interface small and stable.
- Optional methods mean callers must check `capabilities()`. Mitigation: the check is one call; skipping it is caught in review and by types (optional method may be undefined).

## 9. Open Questions
- When does a shared private package become worth the coupling? Revisit if the contract changes frequently or a third consumer appears.
- Should `computeMatrix` back the enterprise VRP's distance inputs too (cross-surface reuse)? Defer to FEAT-001 implementation.

## 10. References
- ADR-0002 §4.2, §5, §8. SYSTEM_TOPOLOGY.md (2026-06-18). server.js:6457, 6674 (live HERE Routing). FEAT-001/005/008/009/103.
- Live audit 2026-06-18: HERE Routing live (2 endpoints, main fleet); Tour Planning absent (grep empty, both backends).

---

## 11. Change Log
| Version | Date | Author | Change |
| ------- | ---- | ------ | ------ |
| 1 | 2026-06-18 | Cem Bakir | Initial proposal. Cross-repo IRoutingProvider contract covering single-route (live HERE Routing, to be consolidated) + multi-vehicle VRP (future HERE Tour Planning). Separate implementations per repo, no runtime coupling. Migration mandate for the two scattered server.js HERE calls. |
