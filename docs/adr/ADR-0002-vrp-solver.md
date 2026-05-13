# ADR-0002: Vehicle Routing Problem (VRP) Solver Selection

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Status**        | Accepted                                                               |
| **Version**       | 1                                                                      |
| **Date**          | 2026-05-13                                                             |
| **Decision by**   | Cem Bakir (Founder / Lead Engineer)                                    |
| **Component**     | TulipFleet Enterprise — Routing / Dispatch backend                     |
| **Related**       | ADR-0001 (Dispatcher UI), ADR-0003 (Server topology), ADR-0005 (Dispatch workflow), ADR-0007 (Telematics integration) |

---

## 1. Context

The TulipFleet Enterprise Dispatcher requires an engine that solves the **Vehicle Routing Problem with Time Windows and Capacity constraints (VRPTW + CVRP)** for fleets of 50 to 500 vehicles, with up to ~1000 daily stops per fleet. The engine must produce:

- Sequenced multi-vehicle routes that respect customer time windows, vehicle capacities, driver shift hours, and skill constraints.
- Suggestions in seconds to minutes, not hours.
- Output usable by the manual-first dispatcher workflow defined in ADR-0005 (advisory mode: system suggests, dispatcher approves).

Three candidate approaches were evaluated:

1. **Google OR-Tools** — self-hosted, open-source (Apache 2.0).
2. **HERE Tour Planning API** — managed SaaS, REST + OAuth 2.0.
3. **Routific API** — managed SaaS, REST, SMB-focused.

Engineering team size at decision time: **1 founder/developer**, with budget for occasional contractor support.

## 2. Decision

Adopt the **HERE Tour Planning API** as the primary VRP solver for TulipFleet Enterprise Phase 1 through 3.

Integration pattern:

- TulipFleet Enterprise backend (Fastify, Node.js) calls HERE Tour Planning over REST + OAuth 2.0.
- For problems above HERE's 250-job synchronous limit, use the asynchronous job-polling pattern (submit, poll status, fetch result).
- HERE Distance Matrix API used for travel-time matrices when needed for ETA prediction and short-horizon advisory features.

OR-Tools is **explicitly rejected for Phase 1-3** but retained as a documented escape hatch (see Section 8).

## 3. Rationale

### 3.1 Why HERE Tour Planning over OR-Tools

The decision is dominated by **integration cost and team size**, not raw solver capability.

OR-Tools has no first-party Node.js binding. It ships as a C++ library with wrappers for Python, Java, and .NET. To use OR-Tools from the existing Fastify backend, TulipFleet would have to:

- Stand up a separate Python (or C++) microservice as a sidecar.
- Define and maintain an internal RPC contract (gRPC or REST) between the Fastify backend and the solver service.
- Operate, monitor, and deploy a second service (logs, metrics, container, secrets, restart policy, version pinning).
- Maintain a Python toolchain alongside the Node.js toolchain on every developer workstation and in CI.

Research (NotebookLM, May 2026) characterizes a custom OR-Tools VRP engine as "typically 3-6 months for specialized teams" and explicitly "risky for 1-2 developers." For TulipFleet's current team size, that engineering cost would consume the entire Phase 1 budget while delivering **no incremental functionality** versus HERE Tour Planning.

HERE Tour Planning by contrast:

- REST API with OAuth 2.0 — direct integration from Fastify using `undici` or `axios`, zero new infrastructure.
- Native support for 50+ constraint types: time windows (hard + soft), capacities, driver skills, vehicle height/weight limits, break times, mixed loads.
- Asynchronous job model handles fleet-scale problems (>250 jobs) reliably.
- TulipFleet's backend `.env` already includes a `HERE_API_KEY` placeholder; the Distance Matrix API is on the roadmap for ETA features anyway, so the vendor relationship is going to exist regardless.

### 3.2 Why HERE Tour Planning over Routific

Routific is excellent for SMB delivery use cases and has a simple REST API, but two factors push the decision toward HERE:

- **Pricing model.** Routific lists ~$49/vehicle/month. For TulipFleet's outreach targets (Dobbe, Deudekom, Neele-Vat — fleets of 100-500 vehicles), this translates to $4,900-$24,500/month in pass-through cost per customer. HERE's per-request/per-task model scales more flexibly at the high end.
- **Constraint depth.** Routific is optimized for "standard delivery logic" and is less customizable. HERE Tour Planning natively models constraints (vehicle height, cold chain, driver shift rules, mixed pickup/delivery, refueling stops) that Dutch logistics customers routinely require.

Routific is retained as a fallback if HERE pricing becomes prohibitive at SMB scale, but is not the primary choice.

### 3.3 Why a managed solver, not a custom one

The strategic position of TulipFleet's competitive moat does **not** rest on having a better VRP solver than HERE, Routific, or NextBillion.ai. It rests on:

- TulipFleet's own telematics hardware and the resulting fast, high-density event stream.
- The MQTT-based event-driven architecture that enables dynamic re-optimization (ADR-0005 Mode 2/3).
- Vertical focus on the Dutch logistics market and the workflows that market demands.
- The integration layer described in ADR-0007 that lets TulipFleet ingest both first-party and third-party telematics.

Building a custom VRP engine would consume the engineering capacity needed to build that moat, in exchange for a capability that an API call already provides.

## 4. Consequences

### 4.1 Positive

- Time-to-first-VRP-output measured in weeks, not quarters.
- No new infrastructure (no Python sidecar, no gRPC, no second container).
- Constraint depth out of the box; "we support time windows, capacity, skills, and 50+ other constraints" is a real sales statement on day one.
- Single vendor relationship (HERE) covers both Tour Planning and Distance Matrix; one API key, one billing relationship, one auth flow.
- Asynchronous job pattern composes naturally with TulipFleet's existing event-driven (MQTT) architecture.

### 4.2 Negative / accepted trade-offs

- **Per-request cost.** HERE charges per optimization request. At 100 vehicles x 1 plan/day = ~3,000 plans/month, costs are tolerable; at 500 vehicles x 5 re-plans/day = ~75,000 plans/month, costs become material. Mitigation: aggressive caching of matrices, batch re-planning windows, and the escape hatch in Section 8.
- **Network dependency.** HERE outage = TulipFleet dispatcher cannot produce new plans. Mitigation: fall back to last known plan with manual dispatcher override; document a degraded-mode SOP; consider cached solver state for short outages.
- **Vendor lock-in on solver semantics.** Constraint syntax is HERE-specific. Mitigation: wrap HERE in an internal `IRoutingProvider` interface so that a future switch to OR-Tools or another provider does not require rewriting business logic — only re-implementing the interface.
- **Data sovereignty.** Customer order data crosses to HERE infrastructure. HERE is European-headquartered and GDPR-compliant, but enterprise customers may ask. Mitigation: include HERE in TulipFleet's sub-processor list, document data flow in the privacy notice.

## 5. Architecture

```
+------------------------------+
|  Dispatcher Web UI (MD2 TS)  |
|  "Plan tomorrow's routes"    |
+--------------+---------------+
               | HTTPS
               v
+------------------------------+
|  Fastify Enterprise Backend  |
|  enterprise-api.tulipfleet   |
|                              |
|  IRoutingProvider interface  |  <-- single point of solver abstraction
|     |                        |
|     +-> HereTourPlanning    |
|         (OAuth 2.0, REST,    |
|          async poll)         |
|                              |
+-----+----------------+-------+
      |                |
      v                v
  PostgreSQL       HERE Cloud
  (jobs, results)  (solver)
```

Key components inside the backend:

- `IRoutingProvider` — internal TypeScript interface defining `submitPlan(input)`, `pollStatus(jobId)`, `fetchResult(jobId)`.
- `HereTourPlanningProvider` — concrete implementation calling HERE's REST endpoints.
- `RoutingJobsRepository` — persists submitted jobs (id, status, request payload hash, result), enables retry and audit.
- `MatrixCache` — caches Distance Matrix responses (Redis, 24-hour TTL) to control per-request cost.

## 6. Implementation Notes

- **Authentication.** Use HERE OAuth 2.0 client credentials flow. Store client ID + secret as environment variables on the enterprise backend; never in the dispatcher frontend.
- **Async pattern.** For any plan with >250 jobs (i.e., almost all real fleet operations), use HERE's async endpoint. Persist `job_id` to `enterprise.routing_jobs` immediately on submission. Poll status from a worker, not from the request thread.
- **Idempotency.** Hash the request payload before submission. If the same hash is already in `enterprise.routing_jobs` with status `completed`, return the cached result. Saves cost and removes user-facing latency on duplicate requests.
- **Error model.** HERE returns structured errors. Map them to internal error codes so that dispatcher UI can show actionable messages ("Driver X has no shift assigned tomorrow" rather than "HTTP 400 invalid_input").
- **Quotas.** Track per-day request counts in a Redis counter. Page the founder if usage suddenly spikes (a runaway re-optimization loop is the cost incident to fear).

## 7. Cost Model (illustrative, validate with HERE sales)

| Scale                    | Plans/month     | Comment                            |
| ------------------------ | --------------- | ---------------------------------- |
| Pilot (1 customer, 50 v) | ~1,500          | Phase 1 launch                     |
| Early (5 customers)      | ~7,500          | First paying cohort                |
| Growth (20 customers)    | ~30,000+        | Trigger to renegotiate with HERE   |
| Scale (50+ customers)    | 100,000+        | Trigger to evaluate Section 8      |

Exact pricing must be confirmed with HERE sales as part of contract negotiation; published rate cards are not authoritative for committed-use tiers.

## 8. Escape Hatch — When to Reconsider OR-Tools

This ADR commits to HERE for Phase 1-3. A future ADR (ADR-00XX) should revisit if **any** of the following becomes true:

- HERE cost exceeds **15% of MRR** for routing alone.
- Engineering team grows to **3+ developers** with availability for an OR-Tools microservice.
- A customer-specific constraint cannot be expressed in HERE's constraint model and is worth >$50k ARR.
- HERE introduces a contractual or pricing change that materially harms TulipFleet's unit economics.
- Latency or availability of HERE Tour Planning falls below TulipFleet's customer-facing SLA.

The `IRoutingProvider` interface (Section 5) is designed so that a future `OrToolsProvider` can be slotted in without rewriting dispatcher business logic. That preserves optionality without paying for it today.

## 9. Open Questions

- **ADR-00XX (future):** Should certain low-complexity single-vehicle routes (TSP) be solved locally using a small in-process heuristic to avoid HERE round-trips for trivial cases?
- **ADR-00XX (future):** Should HERE's Distance Matrix responses be backed by a longer-lived store (PostgreSQL) in addition to the Redis cache, to enable offline analytics?

## 10. References

- HERE Tour Planning API documentation: <https://www.here.com/docs/bundle/tour-planning-api-developer-guide/page/topics/introduction.html>
- Google OR-Tools routing documentation: <https://developers.google.com/optimization/routing>
- Routific API: <https://www.routific.com/>
- NotebookLM research findings (May 2026), TulipFleet Enterprise Features Research notebook, conversation 1eee2b2c-8424-485a-871e-f2f0b979fd8b.

---

## 11. Change Log

| Version | Date       | Author    | Change                              |
| ------- | ---------- | --------- | ----------------------------------- |
| 1       | 2026-05-13 | Cem Bakir | Initial decision: HERE Tour Planning over OR-Tools for Phase 1-3. |
