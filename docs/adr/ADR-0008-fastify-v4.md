# ADR-0008: Fastify v4 for Enterprise Backend

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Status**        | Accepted                                                               |
| **Version**       | 1                                                                      |
| **Date**          | 2026-05-13                                                             |
| **Decision by**   | Cem Bakir (Founder / Lead Engineer)                                    |
| **Component**     | `tulipfleet-enterprise-backend` (to be created — ROADMAP Sıra 1)       |
| **Related**       | ADR-0003 (Server topology), ADR-0004 (Database strategy)               |

---

## 1. Context

The `tulipfleet-enterprise-backend` service, planned in [ROADMAP Sıra 1](../ROADMAP.md#pending--execution-order), is a new Fastify backend that will serve `enterprise-api.tulipfleet.com` for the dispatcher web UI.

A decision was required on which Fastify major version to adopt at project bootstrap:

- **Fastify v4** — used by the existing `tulipfleet-backend` (currently pinned at `4.29.1`).
- **Fastify v5** — the current major release as of mid-2026; introduces breaking changes in the plugin API, request lifecycle hooks, and TypeScript types.

The decision matters because the two backends will share infrastructure (PostgreSQL, EMQX, Redis) and may share code (utility libraries, type definitions, middleware patterns) over time.

## 2. Decision

Adopt **Fastify v4** for `tulipfleet-enterprise-backend`.

Match the existing `tulipfleet-backend` plugin versions where possible:

- `fastify@^4.29.1`
- `@fastify/postgres@^5.2.0`
- `@fastify/jwt@^7.2.4`
- `@fastify/cors@^8.5.0`
- `@fastify/redis@^6.1.0` (if Redis is used)

Upgrade to v5 is deferred. A future ADR will document the upgrade decision when triggered (see Section 5).

## 3. Rationale

### 3.1 Same-stack discipline reduces cognitive load

A single-founder team operating two backends benefits from **identical stacks** unless a strong reason exists to diverge. Mental switching cost between v4 and v5 — different plugin APIs, different hook signatures, different TypeScript types — would compound across every debugging session, every feature, every refactor.

The "different code path, same stack" principle means: backends differ in **what they do**, not in **how they're built**.

### 3.2 Plugin compatibility is the dominant practical constraint

The existing backend uses plugins whose v4-compatible versions are battle-tested in production. The corresponding v5-compatible plugins exist but their interaction with `@fastify/postgres`, `@fastify/jwt`, and custom middleware has **not been validated** in TulipFleet's context.

Adopting v5 in the new backend would require:

- Validating each plugin's v5 version against the patterns used in the mobile backend.
- Maintaining two parallel plugin matrices (v4 in `tulipfleet-backend`, v5 in `tulipfleet-enterprise-backend`).
- Resolving any incompatibility when (eventually) the two backends need to share code.

The cost is real, the benefit is theoretical.

### 3.3 No feature in v5 is required for Phase 1

Phase 1 of the enterprise backend is straightforward:

- REST endpoints for the dispatcher UI.
- HERE Tour Planning API client (REST).
- MQTT subscriber for telemetry display.
- PostgreSQL queries against `enterprise.*` schema.

None of these require v5-specific capabilities. v5's improvements (e.g., enhanced TypeScript inference, plugin loading reform) are valuable but not blocking.

### 3.4 Risk asymmetry favors continuity

The risk of "adopt v5 now, discover incompatibility later" is **high and expensive** (refactor under deadline pressure).

The risk of "adopt v4 now, upgrade to v5 later when triggered" is **low and bounded** (planned migration with clear success criteria).

This ADR chooses the bounded-risk path.

### 3.5 Historical pattern from TulipFleet's experience

The Kasım 2024 dependency-conflict experience (see TulipFleet QA `Dependency_Conflict_Dokümantasyonu`) established a working principle in this codebase:

> *"Kurulu ve çalışan dependency'lere dokunma, başka yol bul."*

That principle was applied at the React Native level (chose `legacy-peer-deps` bypass instead of React downgrade). The same principle applies here at the Fastify level: don't introduce a new major version when the existing one works and the alternative offers no required gain.

## 4. Consequences

### 4.1 Positive

- Plugin matrix identical to `tulipfleet-backend`; lessons from production debugging transfer directly.
- New code can be patterned after existing routes (auth flow, error handling, query patterns).
- If a utility module needs to be shared, no version bridge is required.
- Onboarding a future second developer is simpler — one stack to learn.

### 4.2 Negative / accepted trade-offs

- **v5 improvements deferred.** Enhanced TypeScript inference, refined plugin loading, and small performance gains in v5 are not available. Acceptable.
- **v4 EOL clock is ticking.** Fastify v4 reached general availability in 2022; major-version EOL policies vary, but at some point Anthropic-style "support ends in N months" notices will arrive. Mitigation: monitor Fastify release notes; plan the v5 ADR before EOL.
- **Diverging from "latest" can feel like technical debt.** It isn't, but new contributors might perceive it that way. Mitigation: this ADR exists to make the rationale clear.

## 5. Upgrade Triggers — When to Reconsider

This ADR commits to Fastify v4 for the foreseeable future. A future ADR (ADR-00XX) should revisit if **any** of the following becomes true:

- **Monorepo consolidation.** If `tulipfleet-backend` and `tulipfleet-enterprise-backend` are merged into a monorepo or share a meaningful amount of code, alignment on a single Fastify version becomes mandatory. The choice is then v4 (downgrade) vs. v5 (upgrade); v5 is likely the right call at that point.
- **Fastify v4 EOL approaches.** When the official Fastify maintenance policy gives v4 a clear sunset date, plan the upgrade before security updates stop.
- **A required v5 feature emerges.** If a specific v5 capability (e.g., a new schema validator, performance improvement at scale, plugin ecosystem migration) becomes necessary for a Phase 2 feature.
- **Plugin ecosystem fork.** If a key plugin (`@fastify/postgres`, `@fastify/jwt`) drops v4 support and the v5-only replacement is needed for a security or feature reason.

When a trigger fires, the upgrade is **planned in a dedicated ADR** that documents:

- Affected dependencies and their new versions.
- Migration steps and breaking-change handling.
- Rollback plan.
- Staging validation criteria before production deploy.

## 6. Implementation Notes

When bootstrapping `tulipfleet-enterprise-backend` (Sıra 1):

```json
{
  "name": "tulipfleet-enterprise-backend",
  "version": "0.1.0",
  "main": "server.js",
  "dependencies": {
    "fastify": "4.29.1",
    "@fastify/postgres": "^5.2.0",
    "@fastify/jwt": "^7.2.4",
    "@fastify/cors": "^8.5.0",
    "dotenv": "^16.6.1",
    "mqtt": "^5.0.0",
    "fastify-plugin": "^5.1.0"
  }
}
```

The `package.json` mirrors the dependency choices of `tulipfleet-backend@3.1.0`. Additional dependencies for HERE Tour Planning client, MQTT subscriber, and dispatcher-specific logic are added in subsequent commits as features land.

Plugin registration order in the new backend should follow the existing `tulipfleet-backend` `server.js` pattern: postgres → jwt → cors → mqtt → routes. This consistency reduces the risk of plugin-ordering bugs that hurt the team in the past.

## 7. Open Questions

- **`@fastify/postgres` vs. raw `pg.Pool`.** The existing backend uses `@fastify/postgres`. For the enterprise backend, the same plugin is the default choice; revisit only if a specific need emerges (e.g., schema-aware connection pooling).
- **Schema validators.** `@fastify/swagger` or alternatives for OpenAPI generation may be added later; this ADR does not preempt that choice.
- **Hot reload in development.** Not a v4-vs-v5 question; will be addressed in the enterprise-backend README.

## 8. References

- ADR-0003 (Server topology — defines the deployment target for this backend)
- ADR-0004 v2 (Database strategy — defines the schema this backend consumes)
- ROADMAP Sıra 1 (Enterprise backend repository creation)
- Fastify v4 documentation: <https://fastify.dev/docs/v4.x/>
- Fastify v5 migration guide: <https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/>
- TulipFleet QA `Dependency_Conflict_Dokümantasyonu` (Kasım 2024) — establishes the "don't break working dependencies" principle
- `tulipfleet-backend@3.1.0` `package.json` — reference for plugin versions

---

## 9. Change Log

| Version | Date       | Author    | Change                                                    |
| ------- | ---------- | --------- | --------------------------------------------------------- |
| 1       | 2026-05-13 | Cem Bakir | Initial decision: Fastify v4 for enterprise backend.      |
