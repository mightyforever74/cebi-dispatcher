# Enterprise Infrastructure

Operational reference for `fleet-enterprise-01`, the Hetzner server that hosts the TulipFleet Enterprise Dispatcher backend.

Last updated: 2026-05-25 (created at the close of Sıra 2)

---

## 1. Purpose and Scope

This document describes the operational runtime of **fleet-enterprise-01** only:
- Server provisioning, network, firewall, OS-level services
- Caddy reverse proxy and Let's Encrypt TLS
- Docker deployment of `tulipfleet-enterprise-backend`
- Smoke tests, observability, snapshot strategy

This document is **not**:
- A description of fleet-prod-01 operations → see `INFRASTRUCTURE.md` in the `tulipfleet-qa` repository.
- A description of shared services (PostgreSQL host, EMQX, JWT_SECRET ownership, schema split) → see `INTEGRATION_BOUNDARIES.md` in this repository.
- An architectural decision document → see ADRs in `docs/adr/`.

If a question concerns "who owns what between the two servers" it belongs to `INTEGRATION_BOUNDARIES.md`, not here.

---

## 2. Server Overview

| Property | Value |
|----------|-------|
| Hostname | `fleet-enterprise-01` |
| Public IPv4 | `49.12.246.212` |
| Public IPv6 | `2a01:4f8:c013:a79c::1/64` |
| Private IPv4 | `10.0.0.3` (on `tulipfleet-internal` network) |
| Server type | CPX 32 (Shared AMD vCPU, 4 vCPU, 8 GB RAM, 160 GB NVMe) |
| Location | Falkenstein, Germany (`fsn1`) |
| OS | Ubuntu 24.04.4 LTS |
| Cost | €13.99/month (server) + €0.50/month (IPv4) = €14.49/month |
| SSH access | `ssh root@49.12.246.212` (keys: `fleet-admin@company.com`, `might@Home`) |
| Created | 2026-05-25 |
| Initial snapshot | `fleet-enterprise-01-initial-cloudinit-done` |

---

## 3. Network Layer

### 3.1 Public network

Public IPv4 + IPv6 both attached. IPv4 is required (Cloudflare A record points here). IPv6 is enabled but not yet used.

### 3.2 Private network

The server is attached to `tulipfleet-internal` (Hetzner private network, range `10.0.0.0/16`, subnet `10.0.0.0/24`, network zone `eu-central`). Both fleet-prod-01 (`10.0.0.2`) and fleet-enterprise-01 (`10.0.0.3`) are members. All PostgreSQL traffic between the two servers travels over this private network.

### 3.3 Hetzner firewall — `fleet-enterprise-firewall`

Cloud-level firewall, attached to the server. Inbound rules:

| Port | Protocol | Source | Description |
|------|----------|--------|-------------|
| 22 | TCP | Any IPv4 + IPv6 | SSH |
| ICMP | ICMP | Any IPv4 + IPv6 | ICMP ping (monitoring) |
| 80 | TCP | Any IPv4 + IPv6 | HTTP (Caddy + Let's Encrypt) |
| 443 | TCP | Any IPv4 + IPv6 | HTTPS (enterprise-api) |

Outbound: default Hetzner "allow all" (Docker, Caddy, git, apt etc. all need outbound).

### 3.4 UFW (host-level firewall)

UFW mirrors the Hetzner firewall as a second layer (defence in depth). Configured by cloud-init at first boot:
Status: active
Default: deny (incoming), allow (outgoing), deny (routed)
22/tcp    ALLOW IN  Anywhere    # SSH
80/tcp    ALLOW IN  Anywhere    # HTTP
443/tcp   ALLOW IN  Anywhere    # HTTPS
(+ IPv6 mirrors)

### 3.5 fail2ban

Installed and enabled by cloud-init. Default jail set (`sshd`) is active and protects SSH against brute-force attempts. No custom jails added.

---

## 4. Application Stack

### 4.1 Docker runtime

Installed by cloud-init from Docker's official Ubuntu repository.

- Engine: Docker CE 29.5.2
- Compose plugin: included (`docker compose ...`)
- Daemon: managed by systemd (`systemctl status docker`)

### 4.2 Caddy reverse proxy

Installed by cloud-init from Caddy's official Cloudsmith repository.

- Binary: `/usr/bin/caddy`
- Config: `/etc/caddy/Caddyfile`
- systemd unit: `caddy.service` (runs as user `caddy`, not root)
- Hardening: `ProtectSystem=full`, `PrivateTmp=true` in the official unit
- TLS storage: `/var/lib/caddy/.local/share/caddy/certificates/`
- Auto-renewal: Caddy handles ACME renewal on its own (no cron, no certbot)

#### Caddyfile structure
enterprise-api.tulipfleet.com {
reverse_proxy localhost:3001
encode gzip zstd
log {
output stderr
format json
level INFO
}
header {
Strict-Transport-Security "max-age=31536000; includeSubDomains"
X-Content-Type-Options "nosniff"
X-Frame-Options "DENY"
Referrer-Policy "no-referrer-when-downgrade"
-Server
}
}
:80 {
@health {
path /health
}
respond @health "Caddy OK" 200
respond "Not Found" 404
}

The `:80` block exists so domain-less IP-based health probes (uptime monitors, internal checks) get a clean answer instead of being mishandled.

#### Log strategy

Caddy logs to **stderr**, which systemd captures into the journal. View with `journalctl -u caddy -f`. File-based logging into `/var/log/caddy/` was attempted and rejected by Caddy's systemd hardening; deferred as future work (see Section 9).

### 4.3 PostgreSQL client (psql)

Package: `postgresql-client-16`. Installed for operational tasks (debugging, smoke tests). The backend itself does not use this client; it uses `@fastify/postgres` from inside the container.

---

## 5. Deployment — `tulipfleet-enterprise-backend`

### 5.1 Repository

- Local path: `/opt/enterprise`
- Remote: `https://github.com/mightyforever74/tulipfleet-enterprise-backend.git`
- Branch: `main`

### 5.2 Authentication

GitHub no longer accepts passwords for git operations. A Personal Access Token (PAT) with `repo` scope is used.

- Token storage: `/root/.git-credentials` (mode 600, root only)
- Token name on GitHub: `tulipfleet-deploy-2026-05`
- Token expiry: 2026-08-11
- Git config: `git config --global credential.helper 'store --file=/root/.git-credentials'`

When the token expires, regenerate on GitHub, then overwrite `/root/.git-credentials` with the new value.

### 5.3 `.env` structure

The application reads configuration from `/opt/enterprise/.env`. The file is `chmod 600`, owned by root, never committed to git. Keys (values redacted):
NODE_ENV
PORT
HOST
DATABASE_URL
JWT_SECRET
MQTT_URL
MQTT_USERNAME
MQTT_PASSWORD
LOG_LEVEL

Key facts:
- `HOST=0.0.0.0` so the container can bind to all interfaces inside its network namespace; the host then publishes only `127.0.0.1:3001` (see Section 5.4).
- `DATABASE_URL` points to `10.0.0.2:5433` (fleet-prod-01 via private network), uses the `enterprise_backend` role.
- `JWT_SECRET` must match fleet-prod-01's `JWT_SECRET` exactly (per ADR-0009 §4.3). Rotation is owned by the fleet-prod-01 team; see `INTEGRATION_BOUNDARIES.md`.
- MQTT variables are placeholders. Phase 1 does not use MQTT from the enterprise side.

### 5.4 docker-compose.yml

```yaml
services:
  enterprise-backend:
    build: .
    container_name: tulipfleet-enterprise-backend
    restart: unless-stopped
    ports:
      - "127.0.0.1:3001:3001"
    env_file:
      - .env
    networks:
      - default
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ["CMD", "wget", "-q", "-O-", "http://localhost:3001/health"]
      interval: 30s
      timeout: 5s
      start_period: 15s
      retries: 3

networks:
  default:
    name: enterprise-net
    driver: bridge
```

Key facts:
- `127.0.0.1:3001:3001` binds the published port to loopback only. The container is reachable from Caddy (`localhost:3001`), but not from the public network or the private network. Only Caddy can reach it.
- `restart: unless-stopped` survives reboot.
- Logging is capped at 30 MB per container (3 × 10 MB rotation).
- Healthcheck is Docker-level liveness, independent of Caddy.

### 5.5 Deploy procedure

```bash
cd /opt/enterprise
git pull
docker compose up -d --build
docker logs tulipfleet-enterprise-backend --tail 30
curl -i http://localhost:3001/health
curl -i https://enterprise-api.tulipfleet.com/health
```

The build is incremental thanks to Docker layer caching (`package.json` copied separately from source). A typical re-deploy with no `package.json` change takes about 5–10 seconds.

If `.env` changed, `docker compose up -d --force-recreate` is required (a plain restart does not re-read env variables).

### 5.6 Rollback

Two strategies:

**Strategy A — code rollback only:**
```bash
cd /opt/enterprise
git log --oneline -10
git checkout <previous-commit>
docker compose up -d --build
```

**Strategy B — full server rollback (snapshot restore):**

Hetzner Console → Snapshots → select snapshot → Rebuild server from snapshot. This wipes the entire disk back to snapshot state. Use only when Strategy A is insufficient (corrupted system state, OS-level issue). Plan a maintenance window — the server is offline for several minutes during rebuild.

---

## 6. Smoke Tests

### 6.1 Direct backend (port 3001, host)

```bash
curl -i http://localhost:3001/health
```

Expected: `HTTP/1.1 200 OK` and JSON `{"status":"ok","database":"connected",...}`.

### 6.2 Via Caddy (HTTPS, end-to-end)

```bash
curl -i https://enterprise-api.tulipfleet.com/health
```

Expected: `HTTP/2 200`, security headers present (`strict-transport-security`, `x-content-type-options`, `x-frame-options`, `referrer-policy`), `via: 1.1 Caddy` indicating proxy hop, and the same JSON body.

### 6.3 JWT-protected endpoint

Obtain a JWT from fleet-prod-01:

```powershell
$response = Invoke-RestMethod -Uri "https://api.tulipfleet.com/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"admin@fleet.com","password":"test123"}'
$headers = @{ "Authorization" = "Bearer $($response.token)" }
Invoke-RestMethod -Uri "https://enterprise-api.tulipfleet.com/api/dispatcher/vehicles" -Headers $headers
```

Expected: JSON array of vehicles scoped to the token's `company_id` claim.

A request without the `Authorization` header must return `401 Unauthorized` with `{"error":"Unauthorized","message":"No Authorization was found in request.headers"}`. This negative test is as important as the positive one.

### 6.4 Private network database reachability

```bash
PGPASSWORD='...' psql -h 10.0.0.2 -p 5433 -U enterprise_backend -d fleet_tracking_staging -c "SELECT current_user, inet_client_addr();"
```

Expected: `enterprise_backend | 10.0.0.3`. The `inet_client_addr` of `10.0.0.3` confirms the connection travelled over the private network (not the public IP).

---

## 7. Observability

### 7.1 Caddy logs

```bash
journalctl -u caddy -f
journalctl -u caddy --since "1 hour ago"
```

JSON format. Each request, TLS handshake, and ACME event has a structured entry.

### 7.2 Container logs

```bash
docker logs tulipfleet-enterprise-backend --tail 50 -f
```

Fastify writes structured JSON logs (pino format). `level=30` is info, `level=50` is error.

### 7.3 PostgreSQL connections (cross-server)

To see what the enterprise backend is doing on fleet-prod-01's PostgreSQL, query from fleet-prod-01:

```bash
docker exec 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging \
  -c "SELECT pid, usename, client_addr, application_name, state, query_start FROM pg_stat_activity WHERE usename='enterprise_backend';"
```

`client_addr` reports the Docker bridge IP of the PostgreSQL container (e.g. `172.19.0.1`), not the real source IP, because trafffic crosses Docker's NAT layer. Confirming that traffic arrived via the private network is done at the network layer (see §6.4).

---

## 8. Snapshot Strategy

Snapshots are Hetzner-level disk images, taken via Console. They cost €0.0143/GB/month. A 160 GB snapshot costs about €2.29/month.

### When to take a new snapshot

- Before a risky operation (kernel update, Docker daemon upgrade, OS major version upgrade)
- Before pulling a release that involves database migration on the shared PostgreSQL (so a fast rollback is possible)
- Periodically as part of disaster recovery preparation (not yet automated)

### When to delete old snapshots

- After 2–3 successful deploys against a snapshot, that snapshot is usually safe to delete
- Keep at least one snapshot at any time as a last-resort recovery point

### Current snapshots

| Name | Created | Purpose |
|------|---------|---------|
| `fleet-enterprise-01-initial-cloudinit-done` | 2026-05-25 | Cloud-init complete, before application deploy |

---

## 9. Known Technical Debt

These are deliberate deferrals, not oversights. Each is recorded so it is not forgotten.

### 9.1 `pg_hba.conf` is broad

The current rule on fleet-prod-01 is `host all all all md5`, which permits any user from any IP to any database (subject to a valid password). UFW is the actual perimeter (5433 is DENY for everything except `enp7s0` from `10.0.0.0/16`). The result is secure in practice but lax in principle.

Future hardening: narrow `pg_hba.conf` to specific roles, databases, and source CIDRs. Requires a staging dry-run first because fleet-backend's own Docker bridge connections must continue working.

### 9.2 Caddy logs to stderr, not to a file

Attempted `output file /var/log/caddy/enterprise-api.log`, rejected by Caddy's systemd unit hardening (`ProtectSystem=full` plus the package-default AppArmor profile prevent writes outside a narrow set of paths). Resolved by using `output stderr`, which goes to the systemd journal.

Future hardening: configure a writable log path (e.g. `/var/log/caddy/`) by adjusting the systemd unit's `ReadWritePaths`, or override the AppArmor profile. Adds log rotation control and disk-based persistence beyond journald's defaults.

### 9.3 No automated backups

The server has no scheduled snapshot. Manual snapshots are taken before risky changes. fleet-prod-01 has a nightly backup script (`/opt/fleet/backup.sh`); a similar script for fleet-enterprise-01 is not yet written.

The enterprise backend itself is stateless — application data lives in the shared PostgreSQL on fleet-prod-01, which is the system of record. So the missing backups are about the server's local state (`/opt/enterprise/.env`, `/etc/caddy/Caddyfile`, `/root/.git-credentials`) and OS configuration, not application data.

### 9.4 Single-server, no HA

There is one fleet-enterprise-01. If it fails, the dispatcher API is offline. Mobile and admin (on fleet-prod-01) continue to work normally.

Phase 1 scope explicitly accepts this. Phase 2 plans include either a warm standby or migrating to managed Kubernetes; the decision is in ADR-0003 §3.4 and is not in the current sprint.

### 9.5 Hetzner repository delivers Docker 29.x

Docker Engine version 29.5.2 was installed (more recent than the major version expected at this writing). The Docker Compose plugin reports version v5.1.4. Both work; the high numbers are simply Docker's recent release cadence. No action required, recorded here as a "no surprise" reference.

---

## 10. References

| Document | Where | Purpose |
|----------|-------|---------|
| ADR-0003 | `docs/adr/ADR-0003-server-topology.md` | Why a separate server for the dispatcher |
| ADR-0004 v3 | `docs/adr/ADR-0004-database-strategy.md` | Schema split inside one PostgreSQL |
| ADR-0008 | `docs/adr/ADR-0008-fastify-v4.md` | Backend stack choice |
| ADR-0009 | `docs/adr/ADR-0009-enterprise-production-integration-map.md` | Role grants, JWT_SECRET, MQTT topics |
| ADR-0012 | `docs/adr/ADR-0012-nl-compliance-layer.md` | NL Compliance schema and Sıra 2.9 seed |
| INFRASTRUCTURE.md | `tulipfleet-qa` repo | fleet-prod-01 operations (the other server) |
| INTEGRATION_BOUNDARIES.md | this repo, `docs/` | What is shared between the two servers, who owns what |
| ROADMAP.md | this repo, `docs/` | Sıra plan and status |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-05-25 | Document created at the close of Sıra 2. Captures server provisioning, network, Caddy, Docker deployment, and smoke tests as actually performed. |
