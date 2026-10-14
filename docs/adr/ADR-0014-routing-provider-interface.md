# ADR-0014: IRoutingProvider — Cross-Repo Routing Abstraction Contract

| Field           | Value                                                                       |
| --------------- | --------------------------------------------------------------------------- |
| **Status**      | Accepted                                                                    |
| **Version**     | 1.7                                                                        |
| **Date**        | 2026-10-15 (amended)                                                        |
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

A provider declares which surface it implements via the `readonly capabilities` flag-object. Neither repo must implement both.

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
export interface VrpAppointment {
  taskId: string;                 // hangi task'a bağlı (VrpTask.id ile eşleşir)
  serviceDurationSeconds: number; // per-stop dwell/dock süresi (FEAT-006 §7.1)
}

export interface VrpProblem {
  tasks: VrpTask[];
  vehicles: VrpVehicle[];
  complianceZones?: AvoidancePolygon[];   // ADR-0012 ZE-Zone avoidance (per-vehicle)
  appointments?: VrpAppointment[];        // FEAT-006 (service_duration genişleme payı)
  tollCostMatrix?: TollCostMatrix;        // requires capabilities.tollCost  (FEAT-008)
  routingMode?: "fast" | "short" | "eco"; // "eco" requires capabilities.ecoRouting (FEAT-009)
  evConsumption?: EvConsumptionModel;     // requires capabilities.evConsumption (FEAT-103)
}
// CORRECTION (RUNTIME_LAWS.md status authority, 2026-06-27):
// Authoritative job status is the live DB CHECK constraint
// enterprise.routing_jobs.routing_jobs_status_check, verified on staging + prod:
// 'submitted' | 'running' | 'completed' | 'failed'.
// Earlier drafts used 'pending'; that value was never valid in the table.
// Replaced with 'running'. Code follows the table enum, not this type alias.
export type VrpJobStatus = "submitted" | "running" | "completed" | "failed";
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

The optional (`?`) methods are how the cross-contract works: a provider only implements its surface, and the explicit boolean matrix in `capabilities` tells callers which methods are safe to call. A caller checks `provider.capabilities.solveVrp === true` before calling `submitVrp!`, and `provider.capabilities.computeRoute === true` before `computeRoute!`. Calling an unimplemented method without this flag check is prevented by compilation rules.

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
```

## 5. Migration mandate (tulipfleet-backend, existing live code)

The two scattered HERE calls MUST move behind `HereRoutingProvider`:

- `/api/driver/route-traffic` (server.js:6457) and `/api/driver/drive-conditions` (server.js:6674) currently inline `router.hereapi.com/v8/routes`. After migration both call `provider.computeRoute(...)`; the duplicated HERE block (6485/6696) collapses into one place inside the provider.
- `HERE_API_KEY` is read only inside `HereRoutingProvider`, never in a handler.
- The existing response shape (`status_icon`, `status_code`, `delay_min`, `duration_min`, `incidents`) is preserved; the provider returns `RouteResult` and the handler maps it. No behavior change for the mobile app.

This is the part of the ADR that removes the lock-in already present, not just the part that prevents future lock-in.

### 5.1 Deployment status (2026-06-29)

Phases 1-3 are complete in code only - NOT yet deployed to production. The Status header ("Accepted") and Change Log 1.4 ("completed") both refer to the code layer in tulipfleet-backend, not to a running production deploy. As of 2026-06-29, production /opt/fleet/backend is ~21 commits behind origin/main; on prod, `grep hereapi.com` must return 0 and routingProvider.computeRoute usage must be present before the migration is assumed live. Do not assume "running in prod" in a later session. Deploy steps + verification: TODO_ACTIVE_sira6.md.

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
- Future Tour Planning slots into the same interface; FEAT-005/008/009/103 gate on the `capabilities` flag-object.
- A provider swap (OrTools, Routific, Mock) is a factory line + a new class.

### 8.2 Negative / accepted trade-offs
- Contract duplicated across two repos (no shared package yet). Accepted: avoids version coupling; drift risk mitigated by keeping the interface small and stable.
- Optional methods mean callers must check the `capabilities` flag (e.g. `capabilities.solveVrp`). Mitigation: the check is one property read; skipping it is caught in review and by types (optional method may be undefined).

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
| 1       | 2026-06-18 | Cem Bakir | Initial proposal. Cross-repo contract with capabilities method stub. |
| 1.1     | 2026-06-19 | Cem Bakir | **Accepted.** Refactored capability tracking into an explicit, compile-time flag-object matrix. Approved the cross-contract separation model. Ready for implementation. |
| 1.2     | 2026-06-19 | Cem Bakir | Added `VrpAppointment` interface and `appointments?` optional field to `VrpProblem` as an extension hook for FEAT-006, without breaking the contract signature. FEAT-001 §4.5 buildHereProblem synchronized to this options-object contract. |
| 1.3     | 2026-06-27 | Cem Bakir | Correction. VrpJobStatus aligned to live DB authority (routing_jobs_status_check): pending -> running. Per RUNTIME_LAWS.md status law, verified staging + prod. No code change (VRP status layer follows table enum; grep empty for 'pending' in enterprise lib/routes). |
| 1.4 | 2026-06-28 | Cem Bakir | Migration mandate (§5) completed. Phases 1-3 done: HereRoutingProvider scaffold (services/routing/), route-traffic and drive-conditions handlers migrated behind the provider. Zero hereapi.com / HERE_API_KEY remain in any handler (grep-verified). computeMatrix set false to reflect true boundary (Matrix API deferred to Phase 2). Commits: d2889da, 10a6880, 4847f34, 6ff50b1. |
| 1.5 | 2026-06-29 | Cem Sahinkaya | Added section 5.1 Deployment status: Phases 1-3 are code-layer only, NOT in production (prod ~21 commits behind; verify hereapi.com=0 + routingProvider.computeRoute on prod). Added commit 6ff50b1 (computeMatrix=false) to the 1.4 commit list. Doc-only; no code change. |
| 1.6 | 2026-10-10 | Cem Sahinkaya | Added section 12, Amendment: single routing source. `route_json.public_route` (HERE truck) is now the sole routing source for both the public tracking page and the driver navigation screen; Google Directions removed from `DriverRouteMapScreen.js`. Core `/api/driver/tasks/:id/start` warms the cache fire-and-forget (`warmPublicRoute`); `HereRoutingProvider.computeRoute` fetch bounded by `AbortSignal.timeout` (8000ms default). Commits: tulipfleet-backend `16e3085`, argon `7c248fd` (EAS update `b9489cd1`). |
| 1.7 | 2026-10-15 | Cem Sahinkaya | Added section 13, Amendment: dispatcher decision-support scorers (`spatialScorer.ts`/`temporalScorer.ts`) stay haversine-based. Audited: `computeMatrix` is unimplemented in both backends (`HereRoutingProvider.js:28` explicit `false`, enterprise has no matrix method). Decision: same Phase 2/customer-triggered boundary as `HereTourPlanningProvider` — no `computeMatrix` work scheduled, no scorer architecture change. Closes D7-3 TODO (13). Doc-only; no code change. |

## 12. Amendment 2026-10-10: Single routing source — driver nav consumes `route_json.public_route`

### 12.1 Context

Section 5's "No behavior change for the mobile app" scoped the migration mandate to `/api/driver/route-traffic` and `/api/driver/drive-conditions` only. It said nothing about `DriverRouteMapScreen.js` (argon), which drew the active-task polyline by calling `https://maps.googleapis.com/maps/api/directions/json` directly from the client (`fetchRouteFromGoogle`, `GOOGLE_MAPS_API_KEY`), entirely outside `IRoutingProvider`. That path was a second, unrelated routing source this ADR never covered.

This surfaced as a product problem on 2026-10-07/10: the customer tracking page (`track.tulipfleet.com`, core `routes/publicTrack.js`) caches a HERE truck route under `tasks.route_json.public_route` (`ensureRoadGeometry`, same-task contract documented in qa `TODO_ACTIVE.md` §10). The driver's own navigation screen drew a *different* route (Google, car profile, from the vehicle's live position) for the same task. A customer and a driver looking at the same delivery could see two different roads.

### 12.2 Decision

`route_json.public_route.geometry` (HERE, `transportMode=truck`, written by `ensureRoadGeometry`/`warmPublicRoute` in `publicTrack.js`) becomes the single routing source for both surfaces that show a route for a task: the public tracking page and the driver navigation screen. Google Directions is removed from `DriverRouteMapScreen.js` — no fallback, no re-route call. Consequences:

- **Core (`tulipfleet-backend`):** `POST /api/driver/tasks/:id/start` (server.js) now calls `warmPublicRoute(fastify, taskId, logger)` (exported from `routes/publicTrack.js`) as a fire-and-forget `setImmediate` after `COMMIT` — the HTTP response never waits on HERE. `warmPublicRoute` reuses `ensureRoadGeometry`'s cache/lock/backoff and writes only the `public_route` sub-key, per the existing `route_json` shared-contract rule. `HereRoutingProvider.computeRoute` now bounds the `fetch` with `AbortSignal.timeout(HERE_TIMEOUT_MS)` (default 8000ms, env-overridable) so a hung HERE call cannot pin a pool client, in either the driver-start warm call or the public page's own on-demand call.
- **Mobile (`argon`):** `DriverRouteMapScreen.js` reads `task.route_json.public_route.{geometry,origin,destination,distance_m,duration_s}` and draws it directly; no client-side routing call is made for the active-task polyline. If `public_route` is not yet cached when the driver presses Start, the screen draws a dashed straight connector from the vehicle's live position to the destination (or to the nearest route point once geometry arrives) and retries fetching the task (bounded: `PUBLIC_ROUTE_MAX_RETRIES`) until the backend's warm call lands. `route-traffic` and `drive-conditions` (§5) are unaffected — they still call `provider.computeRoute()` and were already behind `IRoutingProvider`.
- **Scope boundary (§7) unchanged:** `IRoutingProvider` stays routing-only; this amendment does not add a new provider method, it removes a provider-bypassing client call and routes that traffic through the existing `publicTrack.js` cache instead.

### 12.3 Non-Goals (unchanged by this amendment)

- No client-side re-routing when the driver deviates from the HERE polyline (FEAT-002 dynamic re-routing is Phase 2, dispatcher-side, event-triggered — out of scope for the driver screen per FEAT-002 §1 "Kapsam — dışarıda: Driver mobile app").
- No new HERE call added on the hot path of any mobile screen; the only new HERE call is the existing `ensureRoadGeometry` logic, now also triggered from `/start` instead of solely from the first `/v/:token` open.

### 12.4 References

- qa `TODO_ACTIVE.md` §10 "Rota tutarlılığı borcu" (7 Oct finding), PRE_NL_CHECKLIST.md A2 (10 Oct decision).
- Code: `tulipfleet-backend` commit `16e3085` (`warmPublicRoute`, HERE fetch timeout, `tests/publicTrackWarm.test.js`); `argon` commit `7c248fd` (`DriverRouteMapScreen.js`, EAS update group `b9489cd1`).
- `routes/publicTrack.js` `ensureRoadGeometry`/`cachedGeometry`/`publicRouteCache` (unchanged logic, now also called from core `/start`).

## 13. Amendment 2026-10-15: Dispatcher decision-support scorers stay haversine (Phase 2, customer-triggered)

### 13.1 Context

`tulipfleet-dispatcher`'s `spatialScorer.ts`/`temporalScorer.ts` (Decision Support Engine, Karar Notu Popover — MEKAN/ZAMAN ranking of candidate vehicles against a task) compute distance and ETA via `haversineKm` (kuş uçuşu) and a flat 60 km/h average-speed assumption, not `computeMatrix`. D7-3 TODO (13) flagged this as an open question: should the scorers call HERE Matrix instead?

Audit (2026-10-15): `computeMatrix` is **not implemented in either backend** — `tulipfleet-backend/services/routing/HereRoutingProvider.js:28` sets `computeMatrix: false` with the comment "Phase 2: computeMatrix metodu yazılana kadar false"; `tulipfleet-enterprise-backend` has no matrix method either (only `solveVrp` via `HereTourPlanningProvider`, itself gated behind `ROUTING_PROVIDER=here-tour`, not default). This is not a missing wire-up — the HERE Matrix integration itself does not exist yet.

### 13.2 Decision

Scorers stay haversine-based. This is not a gap to schedule — it falls under the same Phase 2/customer-triggered boundary already governing `HereTourPlanningProvider` (ROADMAP.md "ÜRÜN GERÇEĞİ (6)": HERE Tour Planning is paid, activated only once a paying customer requires it). Switching the scorers to `computeMatrix` would require: (a) implementing `computeMatrix` in `HereRoutingProvider` (a new HERE API integration, not a stub), (b) a dispatcher-facing endpoint for it, (c) converting the scorers from a synchronous pure function to an async call pattern, and (d) absorbing a real, recurring per-call HERE API cost on every ranking recalculation (every task-decision, every Karar Notu Popover open). None of this is justified before a paying customer exists; the honesty discipline already in place (memo text states plainly that the figure is kuş uçuşu / 60 km/h assumption — see `src/i18n` `scorer.spatialBase`/`scorer.temporalBase`, D7-3 (11)) is the correct scope for this phase.

### 13.3 Non-Goals (this amendment)

- No `computeMatrix` implementation scheduled. Revisit only when a paying customer's routing accuracy needs force the same trigger that would activate `HereTourPlanningProvider`.
- No scorer architecture change (stays synchronous, client-side, zero marginal cost per ranking).

### 13.4 References

- qa `TODO_ACTIVE.md` D7-3 (13). ROADMAP.md "ÜRÜN GERÇEĞİ (6)". `tulipfleet-backend/services/routing/HereRoutingProvider.js:28`. `tulipfleet-enterprise-backend/lib/routing/factory.js` (here-tour gating). `src/services/dispatch/scoring/{geo.ts,scorers/spatialScorer.ts,scorers/temporalScorer.ts}`.
