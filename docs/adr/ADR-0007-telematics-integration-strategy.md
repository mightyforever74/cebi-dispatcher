# ADR-0007: Telematics Integration Strategy — Scenario C with Customer-Funded Connectors

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Status**        | Accepted                                                               |
| **Version**       | 1                                                                      |
| **Date**          | 2026-05-13                                                             |
| **Decision by**   | Cem Bakir (Founder / Lead Engineer)                                    |
| **Component**     | TulipFleet Enterprise — Data Ingestion Strategy                        |
| **Related**       | ADR-0004 (Database, defines the schema this strategy operationalizes)  |

---

## 1. Context

TulipFleet operates its own end-to-end telematics stack: ESP32-based GPS/accelerometer devices, MQTT pipeline through EMQX, geofencing, behavior detection, and OTA updates. This is a real competitive moat.

When designing the TulipFleet Enterprise Dispatcher, an open question is whether the dispatcher should:

- **(A) Only operate on TulipFleet-instrumented vehicles** (single-product positioning).
- **(B) Be a fully telematics-agnostic dispatcher product, independent of TulipFleet hardware** (vendor-neutral positioning).
- **(C) Position TulipFleet's own telematics as the flagship data source while remaining capable of ingesting third-party telematics** (hybrid positioning).

(A) limits addressable market: prospects who already use Geotab, Verizon Connect, Samsara, or other established telematics will not switch hardware to evaluate a dispatcher product. (B) erodes TulipFleet's hardware moat: if the dispatcher works equally well with anything, prospects skip TulipFleet hardware entirely. (C) preserves both market reach and hardware moat — if executed with discipline.

(C) is the strategic positioning chosen. This ADR defines how it is operationalized **safely**, with explicit safeguards against the failure modes that destroy (C) attempts in practice.

## 2. Decision

Adopt **Scenario C** (flagship-plus-open) with the following non-negotiable constraints:

1. The data layer is built **telematics-agnostic from day one** (ADR-0004's `vehicles`/`devices` separation, `enterprise.telematics_source` registry table, and `enterprise.locations_3p` ingestion table).
2. **No third-party connector code is written in Phase 1.** The market posture in Phase 1 is "TulipFleet — works best with TulipFleet."
3. **Connectors are customer-funded.** A new third-party telematics integration is built only when a signed customer contract allocates budget to it.
4. Three phases gate the work: Phase 1 (TulipFleet-only), Phase 2 (per-customer connectors), Phase 3 (framework, if pattern emerges from ≥3 connectors).
5. **A `works better with TulipFleet` feature tiering** ensures TulipFleet hardware retains differentiated value even when the dispatcher is configured against third-party telematics.

The architectural enablers in ADR-0004 (schema separation, `telematics_source` registry) are completed in Phase 1. The third-party connector code path remains dormant until customer demand and budget unlock it.

## 3. Rationale

### 3.1 Why Scenario C over A or B

**Scenario A (TulipFleet-only)** is too restrictive for the mid-market European logistics segment that TulipFleet targets. Companies in the 50-500 vehicle range typically already operate a telematics solution — Geotab, Verizon Connect, Trimble, or local European vendors. Forcing hardware switch as a precondition to dispatcher evaluation eliminates most of the addressable market on day one.

**Scenario B (vendor-neutral)** is a different product. Vendor-neutral dispatch SaaS exists (Onfleet, FarEye, NextBillion.ai) and is a commodity market with strong incumbents. Entering that market without a moat is unlikely to succeed for a single-founder startup. Worse, abandoning TulipFleet's telematics moat sacrifices the unfair advantage that makes a new entrant viable.

**Scenario C** lets TulipFleet sell a flagship integrated product to greenfield prospects (no existing telematics) and an upgrade path to prospects with existing telematics. It preserves the hardware moat because the integrated stack offers measurable advantages over the third-party path (Section 4.4).

### 3.2 Why customer-funded connectors

Every third-party telematics provider's API changes over time. Each connector requires:

- Authentication flow maintenance (OAuth refresh tokens, IP allowlists, API keys).
- Schema mapping maintenance (provider renames fields, adds fields, changes data types).
- Rate-limit handling (each provider has different limits and back-off requirements).
- Connector-specific monitoring and on-call escalation.

For a single connector, this is ongoing engineering load measured in hours per month. For five connectors, it can consume a half-time engineering position with no incremental revenue.

Customer-funded connectors invert this incentive:

- A connector is only built when a paying customer wants it badly enough to fund it.
- The customer's recurring revenue covers the maintenance cost of their connector.
- A connector with no paying customers is **retired**, not maintained out of inertia.

This is not novel; it is standard practice for integration-heavy SaaS in mid-market enterprise. The alternative — speculatively building connectors hoping they unlock sales — is a documented startup graveyard.

### 3.3 Why strict phase gating

Scenario C fails most often not from architectural error but from **scope discipline failure**. A founder builds the agnostic schema, ships Phase 1 with TulipFleet only, and then — under no specific customer pressure — drifts into building a "demo Geotab connector" because it would be cool to show in a sales meeting. The connector is built, no customer materializes, the maintenance cost begins, the founder's attention divides, the flagship product slows down. The startup dies of distraction.

The phase gating in Section 4 and the `telematics_source` registry in ADR-0004 exist explicitly to prevent this drift. Phase advancement is gated on signed customer contracts, not internal enthusiasm. Connectors require a row in a registry table before they can ingest data, which is operational friction that catches well-intentioned drift.

### 3.4 Why the `works better with TulipFleet` tiering matters

If TulipFleet's dispatcher works equally well with Geotab as with TulipFleet hardware, the rational customer evaluation is: "Keep my Geotab and only buy the dispatcher." TulipFleet's hardware revenue erodes; the moat disappears.

The defense is asymmetric capability: the dispatcher does **more** when paired with TulipFleet hardware. The differences are real and stem from TulipFleet's tight integration:

- Sub-second event resolution from MQTT (versus 30-second polling typical of third-party SDKs).
- Edge-detected behavior events (versus cloud-detected, with the inherent latency).
- Real-time coaching push (versus daily summary).
- OBD-II + accelerometer combined predictive maintenance signals.
- Edge-detected geofence events (versus cloud-detected).

Customers who want the full TulipFleet experience are pulled toward TulipFleet hardware. Customers who insist on keeping their existing telematics still get a working dispatcher, just with reduced upper-end features.

## 4. Phase Plan — Strict Enforcement

This section is normative. Phase progression is gated by the explicit criteria below; no phase advances on internal opinion alone.

### Phase 1 — TulipFleet-only (now)

- `enterprise.telematics_source` exists and contains rows only with `provider = 'tulipfleet'`.
- `enterprise.locations_3p` exists but is **empty**.
- The connector framework code path **does not exist**. No `geotab/`, `verizon/`, `samsara/` modules in the codebase.
- Marketing position: "TulipFleet — Hollanda lojistik için end-to-end fleet management." Third-party compatibility is **not** stated on the homepage, the product page, or sales decks.
- Sales position: if a prospect asks "do you work with Geotab?", the answer is: "Today our customers use our integrated hardware. We have architected the platform to support third-party telematics as a customer-funded integration. If your fleet plans to standardize on Geotab and you commit to a contract, we'll deliver that connector as part of onboarding."

### Phase 2 — First customer-funded connector (trigger-driven)

**Phase 2 begins when** a prospective customer:

- Signs a contract for TulipFleet Enterprise.
- Explicitly funds the third-party connector (either as a lump-sum integration fee or as a premium ARR tier that allocates engineering capacity).
- Provides a non-trivial deal size that justifies the ongoing maintenance burden. Threshold to be calibrated; initial target: connector revenue covers 12 months of expected maintenance plus engineering opportunity cost.

**Phase 2 deliverables:**

- One connector for the customer's telematics provider.
- A row in `enterprise.telematics_source` for each of their vehicles.
- ETL worker ingesting their location data into `enterprise.locations_3p`.
- A "Compatible with X" landing page added to the marketing site.

**Phase 2 does NOT yet build:**

- A generic connector framework.
- Self-service connector configuration in the dispatcher UI.
- Additional connectors for other providers (each is its own Phase 2 instance).

### Phase 3 — Framework (when ≥3 connectors exist with paying customers)

**Phase 3 begins when** at least three customer-funded connectors exist and a clear common pattern is visible across them.

**Phase 3 deliverables:**

- A future ADR documenting the connector framework abstractions.
- Refactor of the three existing connectors onto the framework.
- Standard ETL worker pattern, common error handling, common rate-limit pattern.
- Self-service connector configuration **optional**; only if customer demand justifies.
- Marketing position softens to "compatible with the major European fleet telematics providers" if and only if operational maturity supports the claim.

**Phase 3 does NOT permit:**

- Speculative connectors. Even after the framework exists, a new connector requires customer funding.
- Public marketplace claims. The marketing position remains conservative until uptime SLOs across all connectors are stable.

## 5. Architectural Hooks

The architectural enablers below are completed during Phase 1. They are inert (no third-party data flows through them) but their existence prevents future refactoring pain.

### 5.1 ADR-0004 schema

- `public.vehicles` and `public.devices` separated (a vehicle is independent of any device).
- `enterprise.telematics_source` registry table.
- `enterprise.locations_3p` hypertable.

### 5.2 Internal `ITelematicsProvider` interface

A TypeScript interface defining the contract any connector must satisfy:

```typescript
interface ITelematicsProvider {
  readonly id: string;                       // 'tulipfleet' | 'geotab' | ...
  // Subscribe / connect, depending on the provider's model.
  start(config: ProviderConfig): Promise<void>;
  // Yield normalized telemetry events for downstream processing.
  events(): AsyncIterable<NormalizedTelemetry>;
  stop(): Promise<void>;
}
```

In Phase 1, only one implementation exists: `TulipFleetMqttProvider` (subscribing to the existing `fleet/device/+/location` topics). In Phase 2, new connectors implement this interface.

Note: this interface is **not** built in Phase 1 if it would require speculative scaffolding. It is enough to keep the existing TulipFleet MQTT subscription cleanly factored such that introducing the interface in Phase 2 is straightforward.

### 5.3 Normalization layer

All telemetry — TulipFleet or third-party — is normalized to a common internal `NormalizedTelemetry` type before reaching dispatcher business logic. This decouples dispatcher logic from any specific telematics provider's data format.

In Phase 1, the normalization is a trivial identity transform from TulipFleet's MQTT payloads. The presence of the normalization step is what matters for Phase 2 extensibility.

## 6. Known Risks and Mitigations

| Risk                                                              | Mitigation                                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Identity dilution** ("are we a fleet platform or a dispatcher?") | Marketing positions TulipFleet as flagship; third-party compatibility is a sales-conversation answer, not a homepage message. |
| **Connector treadmill** (each provider's API changes break code)  | Customer funding internalizes the cost; connector without paying customer is retired. |
| **"Open" message hurts sales** (perceived as weakness)            | Don't lead with openness; lead with TulipFleet integrated offering.     |
| **Hardware moat erosion** (3rd-party customers don't buy hardware) | Tiered feature differentiation: TulipFleet hardware unlocks features 3rd-party customers cannot get. |
| **Schema sprawl** (`enterprise.locations_3p` grows unbounded)     | TimescaleDB retention policies; per-provider data retention agreements in customer contracts. |
| **Speculative connector building** (founder drift, "demo Geotab") | This ADR's explicit phase gating; periodic founder discipline reviews.  |
| **Phase 2 customer leaves**                                       | Connector is retired, not preserved. Marketing claim about that provider is removed unless another customer is on it. |

## 7. Feature Tiering — Reference for Phase 1+

The tiering below is illustrative for sales-conversation use. Actual feature parity will be refined as Phase 1 features ship.

| Feature                                | TulipFleet hardware | Third-party telematics (Phase 2+) |
| -------------------------------------- | ------------------- | --------------------------------- |
| Live GPS tracking                      | < 5 seconds         | < 30 seconds (vendor-limited)     |
| Behavior scoring resolution            | Per-event           | Per-trip                          |
| Driver coaching                        | Real-time push      | Daily summary                     |
| Predictive maintenance                 | OBD-II + accelerometer combined | Vendor-reported alerts |
| Geofence event latency                 | Edge-detected (<1s) | Cloud-detected (5-30s)            |
| Route optimization (VRP)               | Available           | Available                         |
| Dispatch automation (Mode 1/2/3)       | Available           | Available                         |
| Custom hardware events (e.g., door)    | Available           | Provider-dependent                |
| OTA firmware updates                   | Available           | Not applicable                    |

The "Available" parity on routing and dispatch is intentional: those are dispatcher-software capabilities, not telematics-dependent capabilities, and third-party customers get the full dispatcher value. The asymmetries are concentrated where TulipFleet hardware uniquely earns them.

## 8. Open Questions

- **Connector framework specifics.** Deferred to the Phase 3 ADR. Premature design risks getting the abstraction wrong (and locking in a wrong abstraction is worse than no abstraction).
- **Multi-source vehicles.** Can a single vehicle have both TulipFleet hardware **and** a third-party device? Probably yes; the schema supports it. Operational implications (which source is authoritative for a given event type?) deferred.
- **Outbound integration (writing back to third-party platforms).** Some customers may want TulipFleet dispatch commands to update their existing third-party platform's task list. Defer to Phase 2+ on a per-customer basis.

## 9. References

- ADR-0004 (Database strategy, defines the schema this strategy operationalizes)
- Industry pattern: Stripe's "works with everything but works best with us" model
- Industry pattern: Customer-funded integration model used by mid-market B2B SaaS vendors

---

## 10. Change Log

| Version | Date       | Author    | Change                                                              |
| ------- | ---------- | --------- | ------------------------------------------------------------------- |
| 1       | 2026-05-13 | Cem Bakir | Initial Scenario C strategy with strict phase gating and customer-funded connector rule. |
