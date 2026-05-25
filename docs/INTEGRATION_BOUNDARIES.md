# Integration Boundaries

The contract between TulipFleet's two production servers: what is shared, what is owned by which side, and how to coordinate change across the boundary.

Last updated: 2026-05-25

---

## 1. Purpose

TulipFleet runs on two servers that are deeply coupled at runtime but loosely coupled in code ownership. Without an explicit boundary contract, this kind of arrangement turns into a slow accumulation of "wait, who handles this?" decisions made twice, made differently, or not made at all.

This document records the boundary as it actually exists today. It complements two other documents but replaces neither:

- `INFRASTRUCTURE.md` (in the `tulipfleet-qa` repository) describes fleet-prod-01 operations.
- `ENTERPRISE_INFRASTRUCTURE.md` (in this repository) describes fleet-enterprise-01 operations.
- This document describes everything that lives *between* them.

If an operational question concerns one server only, it belongs to that server's infrastructure document. If a question concerns both — "can side A change X without breaking side B?" — it belongs here.

---

## 2. System Topology

Two Hetzner servers in Falkenstein, joined by a private network.

| Server | Role | Type | Public IPv4 | Private IPv4 |
|--------|------|------|-------------|--------------|
| `fleet-prod-01` | Mobile + Admin + Driver backend, hosts shared services | CPX 22 | `46.224.1.192` | `10.0.0.2` |
| `fleet-enterprise-01` | Dispatcher backend | CPX 32 | `49.12.246.212` | `10.0.0.3` |

Both servers are members of the Hetzner private network `tulipfleet-internal` (`10.0.0.0/16`, subnet `10.0.0.0/24`, network zone `eu-central`).

Public traffic enters either server through its public IPv4. Private traffic between the two servers travels exclusively over the private network — no public-IP database hop, no internet round-trip.

---

## 3. Shared Resources

These resources are physically hosted on `fleet-prod-01` but consumed by both backends. Each entry records who owns operational responsibility and how the consuming side accesses it.

### 3.1 PostgreSQL

| Aspect | Detail |
|--------|--------|
| Host | `fleet-prod-01`, Docker container `6601902c43f0_fleet-postgres` |
| Image | TimescaleDB HA (with PostGIS) |
| Port (host-side) | `5433` mapped to container `5432` |
| Listen interfaces | `0.0.0.0:5433` (all host interfaces, gated by UFW) |
| Operational owner | `tulipfleet-backend` team (fleet-prod-01) |

#### Database split

| Database | Primary consumer | Notes |
|----------|------------------|-------|
| `fleet_tracking` | `tulipfleet-backend` (production) | Mobile + admin + driver. Includes Timescale hypertables (locations, alerts, etc). |
| `fleet_tracking_staging` | Both backends (staging today, production target for enterprise later) | Phase 1 dispatcher development connects here. Production cutover for enterprise is a separate decision recorded in ROADMAP. |

#### Schema split inside each database (per ADR-0004 v3)

| Schema | Owner | Migrations |
|--------|-------|------------|
| `public.*` | `tulipfleet-backend` | Only `tulipfleet-backend` writes migrations against `public.*`. The enterprise backend never alters this schema. |
| `enterprise.*` | `tulipfleet-enterprise-backend` | Only the enterprise backend writes migrations against `enterprise.*`. The production backend does not read or write here. |

#### Role split (per ADR-0009 §4.1)

| Role | Used by | Privileges |
|------|---------|------------|
| `fleetadmin` | `tulipfleet-backend` | Superuser inside this PostgreSQL. Never used by the enterprise backend. |
| `enterprise_backend` | `tulipfleet-enterprise-backend` | `SELECT` on a narrow set of `public.*` tables (`vehicles`, `companies`, `users`, `drivers`, `tasks`); `ALL` on `enterprise.*`; `statement_timeout = 10s`. |

The enterprise backend never connects with `fleetadmin`. The production backend never connects with `enterprise_backend`. Cross-use is a contract violation, not just a style choice.

#### Connection model

The enterprise backend connects via the private network: `10.0.0.2:5433`. Public-IP connections to PostgreSQL from outside the host are blocked by UFW. The enterprise backend cannot reach PostgreSQL through any other path.

`pg_hba.conf` currently permits broad source IPs (`host all all all md5`), but the UFW perimeter narrows this in practice to `enp7s0 from 10.0.0.0/16` for port 5433. Future hardening will narrow `pg_hba.conf` itself; see `ENTERPRISE_INFRASTRUCTURE.md` §9.1.

### 3.2 EMQX MQTT broker

| Aspect | Detail |
|--------|--------|
| Host | `fleet-prod-01`, Docker container `66e3aa849d79_fleet-emqx` |
| Public endpoint | `mqtt.tulipfleet.com:8883` (Cloudflare DNS only, no proxy) |
| TLS | Certificate at `/opt/fleet-certs` on the host |
| Operational owner | `tulipfleet-backend` team |

Phase 1 of the dispatcher does not consume MQTT. The enterprise backend has placeholder `MQTT_*` environment variables in its `.env` but does not connect. Phase 2 plans a read-only `enterprise_subscriber` role for real-time telemetry (per ADR-0009 §4.5.1 addendum). When that work begins, this section will be updated with the role name, ACL, and topic filter.

### 3.3 Redis

| Aspect | Detail |
|--------|--------|
| Host | `fleet-prod-01`, Docker container `c83c97933592_fleet-redis` |
| Operational owner | `tulipfleet-backend` team |

Phase 1 of the dispatcher does not consume Redis. If a future feature requires it, this section will be updated with the access pattern.

### 3.4 JWT_SECRET

The most subtle shared resource: a single string that both backends use to verify the same JWTs.

| Aspect | Detail |
|--------|--------|
| Source of truth | `fleet-prod-01:/opt/fleet/backend/.env` |
| Issued tokens | `POST https://api.tulipfleet.com/api/auth/login` (production backend) |
| Verified tokens | Both backends. The enterprise backend never issues, only verifies. |
| Authority | ADR-0009 §4.3 |

#### Rotation procedure

Because both backends must hold the same secret, rotation is a two-step coordinated change inside a single maintenance window:

1. The `tulipfleet-backend` team generates a new secret value.
2. fleet-prod-01 `.env` is updated; `fleet-backend` container is recreated (a plain restart does not re-read env variables — `docker rm -f` then `docker compose up -d`).
3. fleet-enterprise-01 `.env` is updated with the same value; `tulipfleet-enterprise-backend` container is recreated.
4. Smoke: a fresh login on production, then use that token against an enterprise endpoint. Either both sides accept it or both reject it. There is no "half-rotated" state that works.

All existing JWTs become invalid at rotation; users must re-authenticate. Plan for a low-traffic window.

---

## 4. Boundaries — What Each Side Owns Exclusively

These are the places where the two backends do not overlap. If a change is here, only the owning side acts.

### 4.1 `tulipfleet-backend` (fleet-prod-01) owns

- All migrations against `public.*` and against Timescale hypertables in `fleet_tracking`.
- Operational responsibility for the PostgreSQL container (backup, restore, restart, upgrades).
- EMQX server configuration, ESP32 device credentials, MQTT ACLs.
- The `/api/auth/login` endpoint and all session lifecycle.
- Mobile app APIs (driver, admin, super-admin).
- The nightly backup script (`/opt/fleet/backup.sh`).
- The production domain endpoints (`api.tulipfleet.com`, `staging-api.tulipfleet.com`, `mqtt.tulipfleet.com`).

### 4.2 `tulipfleet-enterprise-backend` (fleet-enterprise-01) owns

- All migrations against `enterprise.*`.
- Caddy reverse-proxy configuration on fleet-enterprise-01.
- TLS for `enterprise-api.tulipfleet.com` (Let's Encrypt via Caddy).
- Dispatcher API endpoints (`/api/dispatcher/*`).
- HERE Tour Planning integration (starting at Sıra 3).
- NL Compliance Layer data and endpoints (per ADR-0012; seeded in Sıra 2.9).
- The `/opt/enterprise/.env` file on fleet-enterprise-01 (other than `JWT_SECRET`, which is mirrored from the production side).

---

## 5. Change Protocol

When a change crosses the boundary, follow these patterns. Each pattern names the side that initiates and the side that must be informed.

### 5.1 New column on `public.*`

**Initiator:** `tulipfleet-backend`.

If the enterprise backend has `SELECT` on the affected table and the new column is purely additive, no enterprise-side change is needed; the column simply appears in queries. The production team adds the column on staging first, validates that enterprise smoke tests still pass, then applies to production. If the column will be needed by the enterprise side (e.g. as input to a dispatcher feature), coordinate the rollout with the enterprise side so that consumers go live after the migration.

### 5.2 New grant on `public.*` for `enterprise_backend`

**Initiator:** `tulipfleet-enterprise-backend` (requests).
**Executor:** `tulipfleet-backend` (applies via `GRANT`).

The enterprise side files a request describing the table, the columns or operations needed, and the use case. The production team reviews against the principle of least privilege (`SELECT` only by default; writes to `public.*` from the enterprise side are not granted) and applies the grant. Both sides smoke-test.

### 5.3 New schema or table under `enterprise.*`

**Initiator:** `tulipfleet-enterprise-backend`.
**Executor:** `tulipfleet-enterprise-backend`.

No production-side coordination is required. The enterprise backend owns `enterprise.*` outright. The production side does not read or write this schema; new tables here cannot affect the production backend.

### 5.4 PostgreSQL restart (planned)

**Initiator:** `tulipfleet-backend`.

A planned PostgreSQL restart on fleet-prod-01 will interrupt the enterprise backend's database connection. The enterprise backend's healthcheck will fail, Caddy will return `502` for a few seconds to a minute, then connections re-establish automatically (libpq + the connection pool handle reconnect).

Before a planned restart, notify the enterprise side so an unexplained `502` window is not interpreted as a real incident.

### 5.5 JWT_SECRET rotation

Covered in §3.4. Always coordinated, always within a single window, always followed by a smoke test that exercises both sides.

### 5.6 New `pg_hba.conf` rule

**Initiator:** `tulipfleet-backend`.

Any change to `pg_hba.conf` affects the entire PostgreSQL instance. The production team owns this file. If the enterprise backend's connection pattern changes (e.g. moving to a different source CIDR), the request is filed by the enterprise side and applied by the production side after dry-running on staging.

---

## 6. Operational Cross-Cutting Concerns

### 6.1 Database backups

The nightly backup script on fleet-prod-01 dumps both databases (`fleet_tracking` and `fleet_tracking_staging`) to `/opt/fleet/backups/`. This script is the production team's responsibility. A restore from these backups affects both backends simultaneously: the enterprise backend will lose access to whatever data was written between the dump and the restore point.

The enterprise backend has no application data of its own to back up — it is stateless. Its server-local state (`.env`, Caddyfile, git credentials) is captured by Hetzner snapshots; see `ENTERPRISE_INFRASTRUCTURE.md` §8.

### 6.2 PostgreSQL container restart impact

When the production team restarts the PostgreSQL container (planned upgrades, container recreation after `.env` change, etc), the enterprise backend's connection pool sees connections drop. Pooled clients retry automatically and recover within a few seconds. During the gap, `enterprise-api.tulipfleet.com/health` reports `"database":"disconnected"` briefly and dispatcher endpoints return `503` or `502`.

This is not an outage requiring incident response; it is an expected transient. The mitigation is to schedule restarts during low-traffic windows and to notify the enterprise side in advance.

### 6.3 fleet-prod-01 downtime

If fleet-prod-01 itself goes down (host-level failure, OS reboot for kernel upgrade), the enterprise backend loses both PostgreSQL and JWT issuance:

- New logins fail (no `/api/auth/login` endpoint reachable).
- Existing JWTs cannot be used either, because the dispatcher endpoints cannot reach the database.
- Caddy on fleet-enterprise-01 continues serving; clients see `502` for proxied endpoints and `Caddy OK` for the bare-IP health probe.

Recovery is automatic once fleet-prod-01 returns. No enterprise-side action is required.

### 6.4 fleet-enterprise-01 downtime

If fleet-enterprise-01 goes down, only the dispatcher API is affected. Mobile clients, admin, driver, and SuperAdmin continue working against fleet-prod-01 normally. There is no shared component the enterprise side hosts.

Recovery options: restart from snapshot (last-resort), `systemctl restart docker` (if Docker is the issue), `docker compose up -d --force-recreate` (if the application container is the issue), or rebuild from snapshot (catastrophic loss).

### 6.5 Snapshot policy

Each server takes its own snapshots. Snapshots are independent: a snapshot of fleet-enterprise-01 does not include any state from fleet-prod-01, and vice versa. There is no mechanism for a coordinated, consistent two-server snapshot. Cross-server consistency at restore time is not a guarantee this architecture provides.

---

## 7. Security Boundaries

### 7.1 Network layer

| Path | Status |
|------|--------|
| Public IPv4 → PostgreSQL port 5433 | BLOCKED at UFW (DENY Anywhere) |
| fleet-enterprise-01 (`10.0.0.3`) → PostgreSQL (`10.0.0.2:5433`) | ALLOWED via UFW rule on `enp7s0` |
| Any other source on `10.0.0.0/16` → PostgreSQL | ALLOWED by the same rule (no other tenant exists today) |
| fleet-enterprise-01 → fleet-prod-01 SSH | Not configured (no server-to-server SSH key trust today) |

### 7.2 Application layer

JWT validation is enforced on both backends. The production backend issues tokens with `id`, `email`, `role`, and `company_id` claims. The enterprise backend reads `company_id` and uses it to scope queries; this is the tenant-isolation point (per ADR-0009 §4.4).

A bug on either side that fails to enforce `company_id` scoping is a tenant-isolation breach. The contract is that the production backend issues correct claims and the enterprise backend respects them.

### 7.3 Credential isolation

| Credential | Lives on | Visible elsewhere? |
|------------|----------|--------------------|
| `fleetadmin` password | fleet-prod-01:/opt/fleet/backend/.env | No |
| `enterprise_backend` password | fleet-enterprise-01:/opt/enterprise/.env | No |
| `JWT_SECRET` | Both `.env` files (synchronized) | Yes, intentionally |
| MQTT credentials | fleet-prod-01:/opt/fleet/backend/.env | Not yet on enterprise side |
| GitHub PAT (deploy) | fleet-enterprise-01:/root/.git-credentials | No |

If a leak is suspected on either side, the rotation procedure for that credential is owned by the side that holds it, with the exception of `JWT_SECRET` (always coordinated).

---

## 8. References

| Document | Where | Why look here |
|----------|-------|---------------|
| ADR-0003 | `docs/adr/ADR-0003-server-topology.md` | Why two servers, why private network |
| ADR-0004 v3 | `docs/adr/ADR-0004-database-strategy.md` | Schema and role split inside one PostgreSQL |
| ADR-0009 | `docs/adr/ADR-0009-enterprise-production-integration-map.md` | The architectural source for this entire document |
| INFRASTRUCTURE.md | `tulipfleet-qa` repo | fleet-prod-01 day-to-day operations |
| ENTERPRISE_INFRASTRUCTURE.md | this repo, `docs/` | fleet-enterprise-01 day-to-day operations |
| ROADMAP.md | this repo, `docs/` | Sıra plan and status |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-05-25 | Document created at the close of Sıra 2. Captures the boundary contract as realized in practice — private network, role split, schema split, JWT_SECRET sharing, change protocols. |
