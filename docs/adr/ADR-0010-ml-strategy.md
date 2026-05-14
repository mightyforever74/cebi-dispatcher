# ADR-0010: AI/ML Strategy and Boundaries

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Status**        | Accepted                                                               |
| **Version**       | 1                                                                      |
| **Date**          | 2026-05-14                                                             |
| **Decision by**   | Cem Bakir (Founder / Lead Engineer)                                    |
| **Component**     | TulipFleet Enterprise — entire stack                                   |
| **Related**       | ADR-0002 (VRP solver), ADR-0005 (Dispatch workflow), ADR-0007 (Telematics integration) |

---

## 1. Context

The TulipFleet Enterprise Dispatcher will solve problems that, on the surface, look like they call for machine learning: routing optimization, dynamic re-planning, auto-dispatch decisions, multi-destination cost trade-offs, and fuel/traffic-aware scheduling.

A real risk for a single-founder, mid-market vertical SaaS is **premature ML adoption**: building or training models before there is sufficient production data, before there is operational MLOps capacity, and before the use case is large enough to dominate alternative solutions.

The opposite risk also exists: **dismissing ML entirely** and missing genuinely high-value use cases that emerge in Phase 2+ (demand forecasting, anomaly detection, predictive maintenance).

This ADR draws a clear line between **what TulipFleet builds with ML**, **what TulipFleet consumes from ML-powered third parties**, and **what triggers a Phase 3 ML capability investment**.

## 2. Decision

**TulipFleet Enterprise does not train, host, or operate its own ML models in Phase 1 or Phase 2.** ML/optimization capabilities are accessed via third-party APIs that already use ML internally (HERE Tour Planning, HERE Traffic, HERE Eco Routing). Phase 3 may introduce TulipFleet-trained ML, but only under specific, contracted triggers.

This decision establishes four boundaries:

1. **TulipFleet is an ML consumer, not an ML producer, in Phase 1 and Phase 2.**
2. **Cost functions are not ML.** Tunable objective weights (fuel, time, late penalty, capacity utilization) are configuration, not learned behavior.
3. **"Reward function," "agent," "intelligent dispatch" terminology in early sprints does not imply ML.** These are descriptive names for rule-based or optimization-based systems.
4. **Customer-funded ML pattern.** When ML becomes warranted, the development is funded by a paying customer with a signed contract — same discipline as third-party telematics connectors (ADR-0007).

## 3. Rationale

### 3.1 Mid-market logistics problems are predominantly combinatorial, not predictive

The four core dispatcher capabilities — single-vehicle routing, multi-vehicle VRP, dynamic re-optimization, auto-dispatch — are classes of **combinatorial optimization** with well-understood non-ML solutions:

- **VRP, VRPTW, CVRP, pickup-and-delivery** — solved by industry-standard solvers (HERE Tour Planning, OR-Tools, gurobi). Performance is governed by problem size and constraint count, not by training data quantity.
- **Capacity packing** — bin packing, knapsack variants — classic combinatorial.
- **Schedule optimization with traffic** — HERE Traffic API provides time-varying travel times; the optimization itself is deterministic given those inputs.
- **Auto-dispatch decision rules** — boolean conditions on capacity, distance, time windows, skills, customer-specific overrides.

For these problems, **a well-tuned objective function with a managed solver outperforms a custom ML model** in every dimension that matters: development time, accuracy, explainability, debugging cost, operational reliability.

### 3.2 HERE already does the ML work that matters

The strategic decision in [ADR-0002](ADR-0002-vrp-solver.md) — adopting HERE Tour Planning — means TulipFleet **already benefits from ML** without owning the burden:

- **Traffic prediction** — HERE Real-Time Traffic uses ML on historic and live probe data; we consume its `traffic_aware = true` flag.
- **ETA estimation** — HERE's `etr` (estimated time of arrival) is ML-derived; we consume it.
- **Eco routing** — HERE's fuel-optimal routing uses vehicle profiles and elevation-aware models; we consume `routing_mode = eco`.
- **Tour planning heuristics** — HERE's solver uses meta-heuristics and likely ML-tuned search strategies; we consume the result.

This is a **consumer relationship with ML**. We benefit from ML quality, but we don't pay the cost of training, hosting, retraining, drift monitoring, MLOps infrastructure, or data labeling.

### 3.3 Premature ML is a documented startup graveyard

Multiple recent industry reports (Gartner ML adoption surveys, McKinsey AI in SCM analysis) consistently find:

- 70–80% of ML projects in mid-market companies fail to reach production.
- Failure causes are heavily weighted toward **data scarcity, MLOps complexity, and lack of clear ROI** — not algorithm choice.
- Companies that succeed typically have **12+ months of clean production data** before training their first model.

TulipFleet has been collecting telemetry data for under 12 months and has not yet established the labeling, feature engineering, or model evaluation pipelines that ML production requires. Building those pipelines now, in parallel with shipping the dispatcher, would consume the engineering capacity needed to ship the dispatcher.

### 3.4 Avoiding terminology drift

Early product discussions naturally use ML-adjacent language: "the system learns which driver is best for this task," "we reward dispatchers who approve plans quickly," "smart routing avoids traffic." This language is **acceptable as marketing** but **dangerous as engineering specification**.

Specifically:

- **"Reward function" in conversation** → in implementation, it is a weighted sum of constraint penalties in HERE's `objective`. No learning.
- **"Agent" in conversation** → in implementation, it is a rule-based or HERE-API-backed decision module. No reinforcement learning.
- **"Learns over time" in conversation** → in implementation, it is a configuration that the dispatcher tunes manually based on observed outcomes. No online learning.

This ADR makes the distinction explicit so that engineering decisions are not driven by marketing vocabulary.

### 3.5 Reserving ML investment for Phase 3 high-value use cases

Genuine ML use cases will emerge once production data accumulates and customer demand sharpens. Likely candidates for Phase 3:

- **Demand forecasting** — "How many tasks will arrive in Amsterdam tomorrow?" Useful for fleet sizing, driver shift planning, and pricing tiers. Requires 12+ months of seasonal data per region.
- **Driver behavior anomaly detection** — "This driver's profile deviates from their baseline." Rule-based thresholds (already in `vehicles.threshold_*` columns) are the Phase 1 baseline; ML adds value when baselines become noisy at scale.
- **Predictive maintenance** — "This vehicle has a 35% chance of failure in 14 days." Requires combined telemetry + maintenance history data; meaningful only after 12+ months of telemetry per vehicle.
- **Customer churn prediction** — SaaS metric, not core to dispatcher; addressed at the business level, not in dispatcher product.
- **Agentic dispatch (ADR-0005 Mode 3)** — reinforcement learning may be appropriate when Mode 2 rule sets become too complex to maintain manually. Only after Mode 2 has shipped and accumulated audit data.

None of these are blocked by skipping ML in Phase 1. All of them are **accelerated** by spending Phase 1 engineering capacity on shipping the dispatcher and accumulating clean data.

## 4. What This ADR Does Not Forbid

To prevent misreading:

- **Using ML-powered APIs (HERE, future map providers, future translation/NLP APIs).** Allowed and encouraged.
- **Using ML-derived configuration tools internally for the dev team.** E.g., copilot-style code assistants in development, ChatGPT/Claude for documentation. Allowed.
- **Documenting where ML would be valuable** in future ADRs, so the option is preserved.
- **Building data structures that would later support ML.** E.g., the audit log in `enterprise.dispatch_tasks` is structured so it could become training data for Mode 3 agentic dispatch (per ADR-0005). This is preserving optionality, not implementing ML.

What is forbidden during Phase 1 and Phase 2:

- Training a TulipFleet-owned ML model.
- Hosting a TulipFleet-owned inference endpoint.
- Building MLOps infrastructure (model registry, training pipelines, drift monitors).
- Sales/marketing claims that TulipFleet "uses AI" beyond honest descriptions of HERE's contribution.

## 5. Worked Examples — How Common Requests Map Without ML

These examples come directly from the founder's brainstorming (May 14, 2026) and demonstrate the principle.

### Example 1 — Dynamic task insertion ("can one of our vehicles take this new task?")

| Requirement | Solution | ML? |
| --- | --- | --- |
| Check vehicle capacity vs. task size | Schema query + capacity constraint | No |
| Check waypoint proximity | HERE Distance Matrix | No |
| Check time-window feasibility | HERE Tour Planning insertion request | No |
| Pick best vehicle | HERE returns optimal insertion or "infeasible" | No (HERE's internal) |

### Example 2 — Fuel-saving alternative route

| Requirement | Solution | ML? |
| --- | --- | --- |
| Calculate fuel cost per candidate route | HERE truck routing + vehicle profile | No (HERE's internal) |
| Choose lowest-fuel route | Compare costs, pick minimum | No |
| Suggest alternative to dispatcher | UI presents top-3 routes with fuel/time trade-off | No |

### Example 3 — Delay task start to avoid traffic

| Requirement | Solution | ML? |
| --- | --- | --- |
| Predict traffic at candidate start times | HERE Traffic API (time-bucketed) | No (HERE's internal) |
| Compare "start now" vs. "start in N minutes" costs | Cost function: fuel + time + late_penalty | No |
| Check task time window allows delay | Constraint check on `time_window_end` | No |
| Recommend delay if cost(delay) < cost(now) | Boolean comparison | No |

### Example 4 — Multi-destination optimization

| Requirement | Solution | ML? |
| --- | --- | --- |
| Find optimal sequence of stops | HERE Tour Planning multi-stop | No (HERE's internal) |
| Respect LIFO loading constraints | Pickup-before-delivery constraint to HERE | No |
| Balance fuel, time, and lateness | Objective function with weighted terms | No |
| "Reward" good plans | High weight on preferred outcomes in objective | No (this is cost function, not RL) |

### Example 5 — Capacity-aware planning (volume + weight)

| Requirement | Solution | ML? |
| --- | --- | --- |
| Track per-vehicle capacity | Schema columns `capacity_volume_m3`, `capacity_weight_kg` | No |
| Track per-task cargo size | `dispatch_tasks.capacity_required jsonb` (already in ADR-0004 v2) | No |
| Refuse infeasible assignments | HERE capacity constraint | No |
| Optimize bin packing | Phase 2+: OR-Tools 3D bin packing or driver-manual | No (combinatorial) |

In every example, **the cost function defines the goal**, the **third-party solver finds the answer**, and **the rule layer enforces constraints**. ML appears only inside HERE's API, never inside TulipFleet code.

## 6. Phase Triggers for Re-Evaluating This Decision

This ADR will be re-evaluated if **any** of the following becomes true:

1. **12+ months of production data accumulated**, with a clear ML use case where rule-based / managed-API alternatives demonstrably underperform.
2. **A signed customer contract** funds a specific ML capability (e.g., "we need predictive maintenance for our fleet of 500 trucks, and we're paying for it"). Same pattern as customer-funded telematics connectors in ADR-0007.
3. **Mode 3 (Agentic dispatch) is contractually requested** by a customer per ADR-0005, and rule-based / hybrid approaches are demonstrably insufficient.
4. **A regulatory or competitive driver** requires explainable ML (e.g., insurance industry requires risk-scoring models for premium calculation).
5. **HERE pricing or capability shifts** such that an in-house ML alternative becomes economically rational at TulipFleet's scale.

When any trigger fires, a **dedicated ADR is written** (likely ADR-00XX) that addresses:

- Specific use case and ROI
- Data availability and labeling cost
- MLOps infrastructure plan
- Hiring or contracting plan (data scientist / ML engineer)
- Customer-funding model (per Section 2.4)
- Rollback plan if model underperforms

## 7. Consequences

### 7.1 Positive

- Engineering capacity in Phase 1-2 focuses entirely on **shipping the dispatcher and acquiring customers**.
- No MLOps infrastructure cost (model registry, training compute, drift monitoring, on-call for prediction quality).
- Clear language: "We use HERE's ML" is honest and explainable; "We have proprietary AI" is avoided.
- Customer-funded ML pattern in Section 6 prevents speculative ML investment.
- Avoids the well-documented "ML startup failure mode" of building models without sufficient data, ops, or ROI.

### 7.2 Negative / accepted trade-offs

- **Marketing limitation.** Cannot claim "AI-powered dispatcher" in the same way competitors might. Mitigation: emphasize "vertical focus, integrated hardware, transparent optimization" — concrete differentiators that don't depend on ML claims.
- **Sales objection handling.** Prospects may ask "does your platform use AI?" Mitigation: prepared answer that explains HERE's role, the optimization stack, and the roadmap for future ML where it adds value.
- **Talent attractiveness.** Engineers attracted to "build ML systems" may not find this stack interesting. Mitigation: this is a vertical-SaaS, IoT, dispatcher product — engineering attractiveness is in the integration breadth (firmware, MQTT, geospatial, optimization), not in ML pipelines.

## 8. Known Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Founder enthusiasm leads to speculative ML side projects | This ADR; periodic review; phase-gating discipline (per ADR-0007 §6) |
| Prospect demands "AI" feature without budget | Customer-funded pattern in Section 6; documented in sales playbook |
| Competitor markets "AI dispatcher" effectively | Honest positioning; integrated-platform differentiation; HERE's ML is sufficient and quotable |
| Mode 3 requested before Phase 2 stable | Refused per ADR-0005's strict mode-gating |
| Data labeling / cleanup retroactively expensive | Mitigated by structured schema (ADR-0004 v2) — audit log structure supports later ML |
| ML hype cycle pressure on roadmap | This ADR provides explicit answer; no need to revisit at every sprint |

## 9. Open Questions

- **Sales playbook drafting.** Specific FAQ entries for "does your product use AI?" — written outside of ADR process, but referenced here.
- **Future ML governance.** When Phase 3 ML arrives, will it be reviewed by an external advisor, internal-only, or customer-co-developed? Defer to the ADR that triggers ML adoption.
- **Open-source ML adoption.** If an open-source pretrained model becomes available for a specific use case (e.g., ETA prediction trained on European HGV data), does that change the calculus? Treat as a Phase 3 ADR trigger.

## 10. References

- ADR-0002 (HERE Tour Planning — managed VRP solver, ML-internal)
- ADR-0005 (Dispatch workflow — Mode 3 is the most likely ML trigger point)
- ADR-0007 (Telematics integration — customer-funded pattern adopted here)
- McKinsey, "The state of AI in 2024" — ML adoption failure modes in mid-market
- Gartner, "Hype Cycle for Artificial Intelligence, 2024-2025"
- Founder brainstorming session (2026-05-14) — four worked examples in Section 5

---

## 11. Change Log

| Version | Date       | Author    | Change                                                |
| ------- | ---------- | --------- | ----------------------------------------------------- |
| 1       | 2026-05-14 | Cem Bakir | Initial decision: no in-house ML in Phase 1-2; consumer relationship with HERE; customer-funded ML in Phase 3+. |
