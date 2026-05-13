# ADR-0005: Dispatch Workflow — Maturity Model

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Status**        | Accepted                                                               |
| **Version**       | 1                                                                      |
| **Date**          | 2026-05-13                                                             |
| **Decision by**   | Cem Bakir (Founder / Lead Engineer)                                    |
| **Component**     | TulipFleet Enterprise — Dispatch Logic                                 |
| **Related**       | ADR-0001 (Dispatcher UI), ADR-0002 (VRP solver), ADR-0004 (Database)   |

---

## 1. Context

A core feature of TulipFleet Enterprise is **dispatch** — assigning tasks (deliveries, pickups, service calls) to vehicles and drivers. Across the industry there is a spectrum of automation, from fully manual to fully autonomous "agentic" dispatch (e.g., FarEye's PILOT product launched in 2025-2026).

Two opposing failure modes are well documented:

- **Too much automation, too early.** Customers reject the product because operators are surprised by decisions made on their behalf. Unions, liability concerns, and operational trust make full automation an enterprise-sales blocker for mid-market European logistics customers.
- **Too little automation, ever.** The product never delivers on its "AI fleet" promise, customers churn to platforms that do automate, the SaaS competitive position erodes.

TulipFleet's outreach targets (Dobbe, Deudekom, DAGO, Neele-Vat, etc.) are mid-sized Dutch logistics companies with established dispatcher roles, often unionized drivers, and conservative operational culture. Forcing them onto a Mode-3 agentic flow at first contact would be a sales-killing mistake. Building only Mode 1 and never advancing would be a product-stagnation mistake.

A staged maturity model resolves the tension.

## 2. Decision

Adopt a **three-mode maturity model**. Customers begin in Mode 1; advancement to Mode 2 or Mode 3 requires explicit customer opt-in and is gated by feature flags.

### Mode 1 — Advisory (Phase 1, default for all customers at launch)

- The system **suggests** dispatch decisions.
- The dispatcher **approves every action** before it takes effect.
- No task is auto-assigned to a driver without dispatcher confirmation.

### Mode 2 — Exception-based (Phase 2, customer opt-in)

- The system **auto-assigns** tasks within a customer-configured rule set.
- The dispatcher is notified of exceptions: rule violations, ambiguous matches, high-value tasks, customer-specific escalation patterns.
- The dispatcher intervenes **only on exceptions**, not on routine assignments.

### Mode 3 — Agentic (Phase 3, advanced opt-in)

- The system **acts autonomously** across the full dispatch loop: receives tasks, plans, assigns, dispatches, monitors, re-optimizes, and re-assigns on exceptions.
- The dispatcher **reviews after** (audit and override), rather than approving in advance.
- Reserved for trusted customers with explicit contractual opt-in, documented operational SOPs, and TulipFleet operational maturity to support the liability profile.

Phase 1 ships Mode 1 only. Mode 2's feature-flag infrastructure is planned during Phase 1 implementation; Mode 2 itself is built when a paying customer requests it. Mode 3 is a roadmap item only.

## 3. Rationale

### 3.1 Why staged, not jump-to-Mode-3

- **Trust acquisition.** Mid-market European logistics customers buy from vendors they trust. Trust is earned through visible decisions, not delegated decisions. Mode 1 makes every algorithmic choice visible and reviewable, which builds confidence in the underlying engine.
- **Liability containment.** Dispatch decisions affect driver hours-of-service compliance, customer SLAs, fuel costs, and safety. While the dispatcher is in the loop (Mode 1), the liability for a bad decision is shared with the human. As automation increases, the vendor's liability share grows. Walking up that curve gradually is safer than starting at the top.
- **Union and operator dynamics.** In multiple European logistics markets, dispatchers are themselves union members or have strong informal authority. A product that visibly displaces them at first contact is rejected. A product that augments them, then gradually takes over routine work, is welcomed.
- **Operational debugging.** Bugs in Mode 1 produce a wrong suggestion, which the dispatcher overrides. Bugs in Mode 3 produce a wrong action, which has already happened. Mode 1 is the right environment to find and fix the inevitable early bugs in the routing pipeline (ADR-0002), state-machine logic (ADR-0004), and re-optimization triggers.

### 3.2 Why exactly three modes (not two, not five)

- **Two modes** (manual vs. fully auto) is the typical naïve split. It forces customers to make a binary choice that few are ready for; in practice, customers want graduated trust.
- **Five+ modes** creates a configuration surface no one understands, sales conversations get bogged down explaining tiers, and the engineering cost of supporting variation balloons.
- **Three modes** maps cleanly to industry-recognized automation tiers (suggest, exception-based, agentic) and corresponds to clearly distinguishable engineering investments.

### 3.3 Why feature-flag-driven, not version-driven

A flag-driven implementation means a single codebase supports all three modes simultaneously. A given customer's mode is a setting, not a deployment. Implications:

- A customer can pilot Mode 2 on a subset of their fleet (e.g., regional warehouse) while keeping Mode 1 on the rest.
- Mode rollback is instant: flip a flag, not a deploy.
- Customer-specific behavior (e.g., "auto-assign deliveries under 50 km, suggest everything else") is a rule-set configuration on top of the mode flag, not a custom code branch.

## 4. Mode 1 (Advisory) — Detailed Specification

This section is normative for Phase 1 implementation.

### 4.1 User flow

1. **Plan creation.** Dispatcher selects a planning horizon (today / tomorrow / next 24h). System gathers candidate tasks and available vehicles from `enterprise.dispatch_tasks` and `public.vehicles`.
2. **VRP submission.** System submits the planning problem to HERE Tour Planning (ADR-0002) via `enterprise.routing_jobs`. Dispatcher sees a "planning in progress" indicator.
3. **Proposal display.** When the job completes, the system displays the proposed assignment as a map view, a Gantt-style timeline, and a per-vehicle task list. Each proposal includes:
   - Proposed task-to-vehicle assignment.
   - Proposed visit sequence per vehicle.
   - Confidence score and the constraints that influenced the result.
   - "What changed" summary if this is a re-plan.
4. **Dispatcher review.** The dispatcher can:
   - Approve the entire plan (one click → all dispatches sent).
   - Modify one or more assignments (drag-and-drop in the Kanban view; reorder visits in the timeline).
   - Reject and request a re-plan with different parameters.
5. **Commit.** On approve, the system writes the approved plan back to `enterprise.dispatch_tasks` (status → `assigned`) and pushes the driver-facing task to the existing `public.tasks` table (per ADR-0004 cross-schema reference).
6. **Audit.** Every action (plan submitted, proposal received, dispatcher modification, approve, reject) is logged for later review and Mode 2/3 training data.

### 4.2 Rules (Phase 1 minimum)

- A dispatch task is never sent to a driver without dispatcher approval.
- A reassignment of an already-assigned task always requires dispatcher confirmation, even if a Mode 2 rule would have automated it.
- Driver-side acceptance (the existing `pending_review → accepted` flow) remains in place; the dispatcher's approval and the driver's acceptance are separate gates.

### 4.3 Out of scope for Mode 1

- Automatic re-assignment on driver call-outs or vehicle breakdowns. The system **suggests** a re-assignment; the dispatcher approves.
- Auto-dispatch of newly arrived orders during the day. The dispatcher sees the new order on the dashboard and approves a (suggested) insertion.

## 5. Mode 2 (Exception-based) — Forward Specification

This section is informative for Phase 1 and normative for Phase 2 implementation.

### 5.1 Rule set

Each customer in Mode 2 configures rules along these axes:

- **Task value or volume thresholds.** "Auto-assign deliveries under 1000 EUR / 100 kg; suggest above."
- **Distance thresholds.** "Auto-assign within 50 km of warehouse; suggest beyond."
- **Driver/vehicle constraints.** "Auto-assign only if exactly one driver matches all skill and capacity constraints; suggest otherwise."
- **Time-of-day windows.** "Auto-assign during 08:00-16:00; suggest outside."
- **Customer-specific overrides.** "All tasks for customer X require dispatcher approval regardless of other rules."

### 5.2 Exception types

- **No match.** Zero drivers satisfy all constraints; dispatcher must intervene.
- **Ambiguous match.** More than one driver satisfies all constraints and the cost differences are within tolerance; dispatcher chooses.
- **Rule violation.** Auto-assignment would violate a customer-configured rule; dispatcher decides whether to override.
- **High-impact event.** Driver call-out, vehicle breakdown, or new high-priority task that affects already-assigned tasks; dispatcher reviews the cascade.

### 5.3 Auto-dispatch loop

1. New task or event arrives (MQTT, API webhook, or scheduled plan run).
2. System evaluates rules.
3. If rules permit, system auto-assigns and dispatches.
4. If rules trigger an exception, system marks the task `needs_dispatcher` and notifies the dispatcher.
5. All auto-dispatches are visible in a dispatcher audit feed and can be reverted within a configurable grace period.

## 6. Mode 3 (Agentic) — Roadmap Only

Not specified in this ADR. Implementation requires a future ADR addressing:

- Liability model and customer contractual structure.
- Operational SOPs for when the agent makes a decision the customer disagrees with after the fact.
- Audit and override interface for post-hoc review.
- Reinforcement-learning training data sourcing (presumably from Mode 1 and Mode 2 audit logs).
- Customer pilot program structure.

## 7. Implementation Plan — Phase 1

**Week 1-2 — Data**

1. Apply ADR-0004 schema (`enterprise.dispatch_tasks`, `enterprise.routing_jobs`).
2. Add `dispatch_mode` enum column on `public.companies`: `advisory | exception_based | agentic`. Default `advisory`.

**Week 3-4 — Backend endpoints**

3. `POST /api/dispatcher/plans` — submit a plan to HERE (per ADR-0002).
4. `GET /api/dispatcher/plans/:id` — fetch plan status and result.
5. `POST /api/dispatcher/plans/:id/approve` — commit approved plan to dispatch tasks.
6. `POST /api/dispatcher/plans/:id/modify` — record dispatcher modification before approve.

**Week 5-6 — UI**

7. Plan creation screen (date picker, vehicle/task filters).
8. Plan review screen (map + timeline + Kanban views).
9. Approve / modify / reject controls.

**Week 7+ — Iterate with real data**

10. First customer pilot. Measure: dispatcher approval rate, modification rate, plan-to-execution success rate.
11. Use measurements to set Mode 2 rule defaults when that mode is built.

### Mode 2 feature-flag scaffolding (Phase 1 only the scaffolding)

- Add `dispatch_mode` column (see step 2).
- Add policy module structure in the enterprise backend (`src/dispatch/policy.ts`) that reads the mode and currently always returns "advisory".
- This is small and prevents a refactor when Mode 2 is built.

## 8. Consequences

### 8.1 Positive

- Sales conversation aligns with customer trust level: "We start in advisory mode; you decide when to delegate more."
- The codebase supports all three modes from day one with minimal Phase-1 cost (just the flag + policy module).
- Audit logs from Mode 1 produce the training and validation data needed for safe Mode 2/3 transitions.
- Liability and operational risk are walked up gradually, not jumped into.

### 8.2 Negative / accepted trade-offs

- **UX surface complexity.** Three modes means three slightly different dispatcher experiences. Mitigation: Mode 2 and 3 differ from Mode 1 mostly by what is **not** shown to the dispatcher (auto-dispatched tasks fade into the audit feed). The active-screen UX stays consistent.
- **Sales temptation.** A salesperson under pressure may promise Mode 2 to a customer before it is built. Mitigation: written customer agreement template documents which mode is active and the cost of upgrade.
- **Maturity model assumes engineering discipline.** Skipping Mode 2 and building Mode 3 for a single eager customer would compromise the model. Mitigation: this ADR plus product-management discipline.

## 9. Known Risks and Mitigations

| Risk                                                       | Mitigation                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| Mode 2 demanded before Mode 1 is stable                    | Refuse; cite this ADR and Mode 1 quality metrics            |
| Customer-specific rule complexity in Mode 2                | Standard rule axes + customer-specific JSON overrides only  |
| Auto-dispatch in Mode 2 silently making bad decisions      | Audit feed + revert grace period + on-call dispatcher alert |
| Mode 3 pushed for marketing reasons before SOPs exist      | Explicit future ADR required; contracted customer required  |
| Drivers rejecting auto-assigned tasks in Mode 2            | Existing driver `pending_review` flow remains; not bypassed |

## 10. Open Questions

- **Driver-side opt-out.** Should drivers individually opt out of being auto-assigned, even if the customer is in Mode 2? Likely yes for union-context customers. Defer to driver UX work.
- **Quality metrics.** What is the threshold of dispatcher modification rate above which a customer is "not ready" for Mode 2? Calibrate on Phase 1 data.
- **Multi-mode-per-customer.** Some customers may want Mode 2 only for specific regions or task types. The rule-set already supports this; UX presentation is the open question.

## 11. References

- ADR-0001 (Dispatcher UI — Kanban + Calendar components support all three modes)
- ADR-0002 (VRP solver — HERE Tour Planning produces the proposal Mode 1 reviews)
- ADR-0004 (Database — `dispatch_tasks` and `routing_jobs` state machines)
- Industry context: FarEye PILOT (agentic), Onfleet auto-dispatch, Verizon Connect Reveal.

---

## 12. Change Log

| Version | Date       | Author    | Change                                                       |
| ------- | ---------- | --------- | ------------------------------------------------------------ |
| 1       | 2026-05-13 | Cem Bakir | Initial three-mode maturity model. Phase 1 ships Mode 1 only. |
