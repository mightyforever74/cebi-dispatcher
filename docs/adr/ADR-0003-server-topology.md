# ADR-0003: Server Topology for TulipFleet Enterprise

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Status**        | Accepted                                                               |
| **Version**       | 1                                                                      |
| **Date**          | 2026-05-13                                                             |
| **Decision by**   | Cem Sahinkaya (Founder / Lead Engineer)                                    |
| **Component**     | TulipFleet Enterprise — Infrastructure                                 |
| **Related**       | ADR-0002 (VRP solver), ADR-0004 (Database strategy)                    |

---

## 1. Context

TulipFleet's existing production stack runs on a single Hetzner Cloud server:

- **Host:** `fleet-prod-01` / 46.224.1.192
- **Domain:** `api.tulipfleet.com` (Fastify backend)
- **Components:** PostgreSQL + TimescaleDB, EMQX (MQTT), Redis, Fastify backend, all in Docker Compose
- **Path:** `/opt/fleet/`

Phase 1 of TulipFleet Enterprise introduces:

- A new Dispatcher Web UI (Material Dashboard 2 PRO React TS — ADR-0001).
- A new backend service for dispatcher-specific endpoints (route planning orchestration, telematics integration, dispatch workflow state machine).
- A higher-traffic, longer-running request profile compared to the mobile-driver-focused existing backend.

Since ADR-0002 selected **HERE Tour Planning** as the VRP solver (a managed API), the new backend does **not** need to host a compute-intensive solver process locally. It is primarily an **orchestration and API gateway** layer.

Two main topology options were considered:

1. **Single-server, feature-flag** — extend the existing `fleet-prod-01` with dispatcher endpoints and feature-flag enterprise customers.
2. **Two-server split** — provision a new server and route enterprise traffic to it via a dedicated subdomain.

## 2. Decision

Adopt **two-server split with subdomain routing**.

- **New server:** Hetzner Cloud CX32 (Shared vCPU, 8 vCPU, 16 GB RAM, ~16 EUR/month) in the same Hetzner Falkenstein region as the existing host.
- **New domain:** `enterprise-api.tulipfleet.com` (separate DNS A record + Let's Encrypt certificate).
- **New backend instance:** `tulipfleet-enterprise-backend` (separate Git repo, separate Docker Compose stack, separate deployment pipeline).
- **Shared database:** Same PostgreSQL instance as production, accessed across the private Hetzner network (ADR-0004 defines schema separation).
- **Shared MQTT broker:** Same EMQX instance; the enterprise backend subscribes to the same `fleet/device/+/*` topics for telemetry.
- **Existing production untouched:** `api.tulipfleet.com` continues serving mobile drivers and admins exactly as today.

## 3. Rationale

### 3.1 Why split, not single-server

A single-server feature-flag approach is faster to start but creates several operational risks that outweigh the savings:

- **Blast radius.** A bug or performance issue in dispatcher code can take down driver-facing operations. Drivers cannot work; revenue stops.
- **Deploy cadence.** Enterprise features will ship rapidly during Phase 1 (multiple times per week). Each deploy of the enterprise backend should not require restarting the mobile-facing backend.
- **Resource contention.** Dispatcher endpoints will issue long-lived HTTP requests to HERE Tour Planning (async polling), hold WebSocket connections to multiple dispatcher clients, and serve heavier API payloads (multi-vehicle route plans can be hundreds of KB). Co-locating with the 200-mobile-user-facing backend invites unpredictable latency.
- **Future scaling.** When the enterprise backend needs horizontal scaling, doing so independently of the mobile backend is materially simpler if they were never coupled in the first place.

The CX32 cost (~16 EUR/month) is negligible compared to the engineering time saved on incident response after a single co-location-caused outage.

### 3.2 Why CX32 (not CX42)

A previous draft of this ADR proposed CX42 (8 vCPU, 16 GB) under the assumption that a local OR-Tools solver process would consume significant CPU. ADR-0002 rejected OR-Tools and selected the managed HERE Tour Planning API. The enterprise backend's actual workload is:

- HTTP request/response handling (Fastify).
- HERE API client (mostly idle, waiting on async polls).
- WebSocket fan-out to dispatcher clients (~5-20 concurrent dispatchers in Phase 1).
- PostgreSQL connection pool to the shared DB.
- MQTT subscription to existing EMQX broker.

This profile is I/O-bound, not CPU-bound. CX32 is appropriately sized; CX42 would be over-provisioned and waste budget that is better spent on HERE API quota.

Hetzner allows in-place server type upgrades, so a future CX42 upgrade is a 5-minute downtime operation if growth demands it.

### 3.3 Why same Hetzner region

- **Database access.** The enterprise backend talks to the production PostgreSQL frequently. Same-region private networking eliminates cross-DC latency.
- **MQTT subscription.** Same-region keeps the EMQX subscriber stable.
- **Operational simplicity.** One Hetzner project, one billing, one console.

### 3.4 Why a subdomain (not a path prefix on api.tulipfleet.com)

- **Independent TLS.** Separate certificate per subdomain isolates rotation incidents.
- **DNS-level routing.** Cleaner separation than path-based routing for monitoring, logging, and CDN/WAF rules.
- **Customer-facing clarity.** Enterprise customers see they are on an enterprise endpoint, useful for support diagnosis.
- **Future independence.** If the enterprise stack ever needs to move to a different cloud or region, the cutover is a DNS change with no impact on `api.tulipfleet.com`.

## 4. Architecture (Production State)

```
                        Internet
                          |
        +-----------------+-----------------+
        |                                   |
        v                                   v
  api.tulipfleet.com           enterprise-api.tulipfleet.com
  (DNS A record A)              (DNS A record B)
        |                                   |
        v                                   v
+------------------+              +-----------------------+
| fleet-prod-01    |              | fleet-enterprise-01   |
| Hetzner CX31 or  |              | Hetzner CX32          |
| current type     |              | (NEW)                 |
|                  |              |                       |
| Docker:          |              | Docker:               |
|  - fleet-backend |              |  - enterprise-backend |
|  - fleet-postgres|<------------>|  (shares DB)          |
|  - fleet-emqx    |<------------>|  (shares MQTT)        |
|  - fleet-redis   |<------------>|  (shares cache)       |
+------------------+              +-----------------------+
        ^                                   ^
        |                                   |
   Mobile app                          Dispatcher Web UI
   (drivers + admins)                  (Material Dashboard 2 PRO TS)
```

Notes on the shared services:

- **PostgreSQL:** Both backends connect to the same Postgres instance on `fleet-prod-01`. Access uses the private Hetzner network (no public exposure). ADR-0004 defines schema separation (`public.*` vs `enterprise.*`).
- **EMQX:** Both backends subscribe to MQTT topics. The enterprise backend is a **read-mostly** subscriber for telemetry; it does not publish device commands today.
- **Redis:** Both backends share Redis but use **separate key prefixes** to prevent collisions (`fleet:*` vs `enterprise:*`).

## 5. Consequences

### 5.1 Positive

- Production driver app is completely insulated from enterprise dispatcher development churn.
- Deployment, rollback, and incident response have a clear blast radius.
- Operational story is consistent: each domain = one server = one stack.
- Future migration of either stack (cloud move, on-prem deployment for a regulated customer) becomes feasible without entangling the other.

### 5.2 Negative / accepted trade-offs

- **Two servers to operate.** Backups, monitoring, OS patches, log aggregation, alerts must cover both. Mitigation: automate via Ansible or similar; both servers run identical Ubuntu + Docker + same base image.
- **Cross-server network calls.** Enterprise backend's DB and MQTT calls cross the local network. Hetzner private networking is fast (<1ms), so the operational impact is negligible, but it is non-zero.
- **Shared DB risk.** A runaway query from the enterprise backend can degrade the production driver app. Mitigation: separate Postgres roles with statement timeouts, connection pool limits per role, read-replica option if contention emerges (deferred).
- **Cost.** ~16 EUR/month additional. Negligible.

## 6. Implementation Plan

**Week 1 — Provisioning**

1. Provision `fleet-enterprise-01` (Hetzner CX32, Ubuntu 24.04 LTS, Falkenstein region).
2. Add to Hetzner private network so it can reach `fleet-prod-01` services privately.
3. Configure Hetzner firewall: 22 (SSH key-only), 80, 443 inbound; egress unrestricted.
4. Install Docker + Docker Compose, copy base config from production-server image.

**Week 1 — DNS + TLS**

5. Add A record `enterprise-api.tulipfleet.com` -> `fleet-enterprise-01`.
6. Install Caddy (or Nginx + Certbot) and obtain Let's Encrypt cert.
7. Verify `https://enterprise-api.tulipfleet.com/health` returns the placeholder health response.

**Week 2 — Backend repo bootstrap**

8. Create new private Git repo: `tulipfleet-enterprise-backend`.
9. Copy minimal Fastify skeleton from the existing `tulipfleet-backend` (auth plugin, DB plugin, MQTT plugin, structure conventions).
10. Configure environment variables: separate `DATABASE_URL`, separate `MQTT_USERNAME` (`enterprise-backend`), separate Redis prefix.
11. Deploy a `/health` endpoint and confirm end-to-end response.

**Week 3 — Database access**

12. Create Postgres role `enterprise_backend` with limited privileges (initially read-only on `public.*`, full on `enterprise.*` after ADR-0004 schema is applied).
13. Update `pg_hba.conf` to allow connections from the enterprise server's private IP.
14. Verify connection from `fleet-enterprise-01` to PostgreSQL.

**Week 3+ — First feature endpoint**

15. Implement first dispatcher endpoint (e.g., `GET /api/dispatcher/vehicles` reading from `public.vehicles` filtered by tenant).
16. Wire dispatcher web UI (`C:\dispatcher` repo) to call this endpoint.

## 7. Operational Notes

- **Backup.** PostgreSQL backups (already daily snapshot on `fleet-prod-01`) cover the enterprise schema automatically. No separate backup needed for the enterprise server beyond config (which lives in Git).
- **Monitoring.** Add `fleet-enterprise-01` to the same monitoring stack as production (Uptime Kuma, health-check endpoints, log forwarder).
- **Deploy.** The enterprise backend uses the same deploy pattern as the production backend: `docker rm -f enterprise-backend && docker compose up -d --no-deps backend`. Document in the enterprise backend README.

## 8. Open Questions

- **Read replica.** If shared-DB contention becomes a problem, add a PostgreSQL streaming replica on `fleet-enterprise-01` for read-heavy dispatcher queries. Defer until measured.
- **Staging.** The existing staging environment (`staging-api.tulipfleet.com` on PM2) does not yet have an enterprise counterpart. Plan: `staging-enterprise-api.tulipfleet.com` on the same `fleet-prod-01` host as the existing staging, using PM2.
- **MQTT publish from enterprise.** When auto-dispatch in Mode 2 (ADR-0005) begins issuing commands to vehicles, the enterprise backend will need MQTT publish privileges. Defer until that milestone.

## 9. References

- ADR-0001 (Dispatcher UI), ADR-0002 (VRP solver), ADR-0004 (Database strategy)
- Hetzner Cloud CX32 spec: <https://www.hetzner.com/cloud>
- TulipFleet backend README (existing infrastructure inventory)

---

## 10. Implementation Notes

These notes record how this ADR was implemented in practice. The decisions in Section 2 stand. The notes document where the realized state diverged from the original wording, and why. No notes below constitute a revised decision.

### 10.1 Server types (Sıra 2.4, 2026-05-25)

The ADR text used "CX31 or current type" for `fleet-prod-01` and "CX32" for the new server. Both labels reference the CX series (Intel shared vCPU). The realized state uses the CPX series (AMD shared vCPU) on both sides:

- `fleet-prod-01` is type **CPX 22** (2 vCPU AMD, 4 GB RAM, 80 GB disk). Provisioned this way before this ADR was written; the ADR's "CX31" was an approximate forward reference. No migration is planned.
- `fleet-enterprise-01` is type **CPX 32** (4 vCPU AMD, 8 GB RAM, 160 GB NVMe disk, ~€13.99/month). Chosen for stack consistency with fleet-prod-01 (AMD/CPX line) and for headroom on Caddy + Node.js + the future MQTT subscriber.

The architectural intent of Section 2 is unchanged: separate servers, shared private database, separate reverse proxy per side.

### 10.2 Private network (Sıra 2.1, 2026-05-25)

Section 4 specifies that PostgreSQL access uses the private Hetzner network. At the time this ADR was written, no private network existed; `fleet-prod-01` was deployed without one. The private network `tulipfleet-internal` was created in Sıra 2.1:

- Range: `10.0.0.0/16`, subnet `10.0.0.0/24`, network zone `eu-central`.
- `fleet-prod-01` attached as `10.0.0.2`.
- `fleet-enterprise-01` attached as `10.0.0.3`.

`pg_hba.conf` on `fleet-prod-01` was not modified; the existing broad rule (`host all all all md5`) already covers the private network. UFW on `fleet-prod-01` was extended with `5433/tcp on enp7s0 ALLOW IN 10.0.0.0/16` so traffic from the private interface reaches PostgreSQL. Narrowing `pg_hba.conf` itself is deferred future hardening; see `ENTERPRISE_INFRASTRUCTURE.md` §9.1.

### 10.3 Reverse proxy choice (Sıra 2.6, 2026-05-25)

Section 6 step 6 listed "Caddy (or Nginx + Certbot)". Caddy was chosen for `fleet-enterprise-01`:

- Automatic Let's Encrypt issuance and renewal (no certbot cron).
- Simpler Caddyfile compared to Nginx config.
- HTTP/2 and HTTP/3 (QUIC) on by default.

`fleet-prod-01` continues to use Nginx + Certbot. The two backends are independent in their reverse-proxy stack, consistent with Section 3.4 ("future independence").

### 10.4 Runtime (Sıra 2.7, 2026-05-25)

Section 7 of the Implementation Plan specifies Docker. The application image is built from a single-stage `node:20-alpine` base. `docker-compose.yml` publishes port 3001 to `127.0.0.1` only, so Caddy is the only path to the container. Details in `ENTERPRISE_INFRASTRUCTURE.md` §5.

### 10.5 Open Questions — status update

- **Read replica (Section 8):** Not yet needed. No measured contention.
- **Staging (Section 8):** Phase 1 development uses `fleet_tracking_staging` database on the shared PostgreSQL. A dedicated `staging-enterprise-api.tulipfleet.com` host has not been created. Open.
- **MQTT publish (Section 8):** Not started. Deferred to Mode 2 (per ADR-0005).

---

## 11. Change Log

| Version | Date       | Author    | Change                                                                                                |
| ------- | ---------- | --------- | ----------------------------------------------------------------------------------------------------- |
| 1       | 2026-05-13 | Cem Sahinkaya | Initial decision: CX32 + subdomain split.                                                             |
| 1.1     | 2026-05-25 | Cem Sahinkaya | Added Implementation Notes (Section 10) capturing realized state. No decision change.                 |
