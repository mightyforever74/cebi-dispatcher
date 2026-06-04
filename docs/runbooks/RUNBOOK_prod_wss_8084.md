# RUNBOOK — Prod WSS for Dispatcher Live Map (EMQX 8084, browser-valid TLS)

| Field | Value |
| --- | --- |
| **Goal** | Make `wss://mqtt.tulipfleet.com:8084/mqtt` reachable from a browser with a valid TLS cert, so the dispatcher live map connects in production (replacing the dev SSH tunnel `ws://localhost:8083`). |
| **Owner** | `tulipfleet-backend` team (fleet-prod-01) — per INTEGRATION_BOUNDARIES §4.1, EMQX config + MQTT ACLs are prod-side owned. |
| **Server** | `fleet-prod-01` (46.224.1.192), EMQX container `66e3aa849d79_fleet-emqx`. |
| **Risk** | MEDIUM. Touches the shared broker the mobile fleet depends on. Follow Altın Kural: prove on a non-disruptive path, back up first, have rollback ready. |
| **Prereq proven (Sıra 4.2)** | WS 8083 + WSS 8084 listeners running; `dispatcher-readonly` (subscribe-only) + `sim-publisher` ACL users exist; payload contract confirmed; live map works over dev tunnel. |

---

## 0. Why this is needed (the proven problem)

From Sıra 4.2 diagnosis (2026-06-04):

- `mqtt.tulipfleet.com` → `46.224.1.192`, **Cloudflare DNS-only** (no proxy). Correct host for WSS. (`enterprise-api.tulipfleet.com` is Cloudflare-**proxied** → port 8084 will NOT pass through; do not use it.)
- The 8084 WSS listener currently presents EMQX's **self-signed dev cert**:
  ```
  subject=C=CN, ST=hangzhou, O=EMQ, CN=Client
  issuer=C=CN, ST=hangzhou, O=EMQ, CN=RootCA
  ```
  A browser WSS connection **rejects** this (untrusted CA + CN mismatch). The ESP32 sidesteps it with `setInsecure()`; browsers cannot.
- Therefore the WSS 8084 listener must present a **browser-valid cert for `mqtt.tulipfleet.com`** (Let's Encrypt or an existing valid cert), and **port 8084 must be open in UFW**.

---

## 1. Pre-flight (read-only; safe to run anytime)

Run these first; record outputs. No changes yet.

```bash
# 1a. Confirm the EMQX container name (may have changed)
docker ps | grep -i emqx

# 1b. Confirm both listeners still up
docker exec 66e3aa849d79_fleet-emqx emqx ctl listeners | grep -iA3 "ws:default\|wss:default"

# 1c. What cert is 8084 presenting now (baseline to compare after)
echo | timeout 5 openssl s_client -connect 46.224.1.192:8084 2>/dev/null | openssl x509 -noout -subject -issuer

# 1d. Current UFW state for the relevant ports
ufw status numbered | grep -E "8084|8083|8883|1883"

# 1e. Where are the existing valid certs? (memory note: /opt/fleet-certs)
ls -la /opt/fleet-certs/ 2>/dev/null
ls -la /opt/fleet/certs/ 2>/dev/null

# 1f. Does a valid cert for mqtt.tulipfleet.com already exist anywhere?
#     (8883 TLS-MQTT is documented as cert-valid DNS-only — its cert may be reusable)
echo | timeout 5 openssl s_client -connect 46.224.1.192:8883 -servername mqtt.tulipfleet.com 2>/dev/null | openssl x509 -noout -subject -issuer -dates
```

**Decision point from 1f:** If the **8883** listener already presents a valid `mqtt.tulipfleet.com` cert (e.g. Let's Encrypt), the cleanest fix is to point the **8084 WSS** listener at the *same* cert/key files. No new cert issuance needed. If 8883 is ALSO self-signed, go to §2 (issue a cert first).

---

## 2. Obtain a browser-valid cert (only if §1f shows none exists)

`mqtt.tulipfleet.com` is DNS-only on Cloudflare, so HTTP-01 or DNS-01 both work. DNS-01 avoids opening port 80.

**Option A — reuse existing cert (preferred, no issuance):** skip to §3 with the cert/key paths found in §1e/1f.

**Option B — issue via certbot DNS-01 (Cloudflare):**
```bash
# Only if certbot + cloudflare plugin available; otherwise use webroot/standalone on port 80 briefly.
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials /root/.secrets/cloudflare.ini \
  -d mqtt.tulipfleet.com
# Result: /etc/letsencrypt/live/mqtt.tulipfleet.com/{fullchain.pem,privkey.pem}
```

Whichever path: note the **fullchain** and **privkey** absolute paths for §3. They must be readable by the EMQX container (mount or copy into `/opt/fleet-certs`, `chmod 644` the cert, `600` the key — per memory: certs at `/opt/fleet-certs` must be chmod 644).

---

## 3. BACKUP before any change (Altın Kural)

```bash
TS=$(date +%Y%m%d_%H%M%S)

# 3a. Backup EMQX config (whichever applies to this 5.4 install)
docker exec 66e3aa849d79_fleet-emqx sh -c 'cat /opt/emqx/etc/emqx.conf' > /opt/fleet/backups/emqx.conf.bak.$TS 2>/dev/null
# If the WSS listener is configured via cluster.hocon / overrides:
docker exec 66e3aa849d79_fleet-emqx sh -c 'cat /opt/emqx/data/configs/cluster.hocon' > /opt/fleet/backups/cluster.hocon.bak.$TS 2>/dev/null

# 3b. Backup current cert dir
cp -a /opt/fleet-certs /opt/fleet/backups/fleet-certs.bak.$TS 2>/dev/null

# 3c. Record current listener cert config for rollback reference
docker exec 66e3aa849d79_fleet-emqx emqx ctl conf show listeners.wss.default > /opt/fleet/backups/wss.default.bak.$TS 2>/dev/null

echo "Backups in /opt/fleet/backups/ with suffix $TS"
```

---

## 4. Point the 8084 WSS listener at the valid cert

EMQX 5.4 — the WSS listener's TLS files are set under `listeners.wss.default.ssl_options`. Two ways; **prefer the Dashboard** (matches the "EMQX changes via Dashboard" discipline) but CLI/HOCON is recorded for completeness.

**4a. Via Dashboard (preferred):**
1. `http://46.224.1.192:18083` → **Management → Listeners → `wss:default`**
2. TLS / SSL Options:
   - **Certfile** → path to `fullchain.pem` (e.g. `/opt/fleet-certs/mqtt.tulipfleet.com.fullchain.pem`)
   - **Keyfile** → path to `privkey.pem`
   - **Verify** → `verify_none` (server presents cert; clients don't present one)
3. Save. EMQX reloads the listener.

> The cert/key paths must be the **container's** view of the filesystem. If certs live on the host at `/opt/fleet-certs`, confirm that dir is mounted into the EMQX container (check `docker inspect 66e3aa849d79_fleet-emqx | grep -A3 Mounts`). If not mounted, copy certs to a path that IS mounted, or add a mount and recreate the container (heavier — coordinate a maintenance window).

**4b. Via CLI/HOCON (alternative):** edit the WSS listener `ssl_options.certfile` / `keyfile` in `cluster.hocon`, then `emqx ctl conf reload`.

---

## 5. Open port 8084 in UFW

> This is a firewall change — run it yourself; verify the rule reads as intended before and after.

```bash
# Allow WSS 8084 from anywhere (browsers connect from the public internet)
ufw allow 8084/tcp comment 'EMQX WSS dispatcher live map'
ufw status numbered | grep 8084
```

Note: 8883 (TLS-MQTT) is already reachable per docs; 8083 (plain WS) should remain **closed** to the public (only used via SSH tunnel in dev) — do NOT open 8083.

---

## 6. VERIFY (prove the fix, like every Sıra 4.2 gate)

```bash
# 6a. 8084 now presents the valid cert (compare to §1c baseline)
echo | timeout 5 openssl s_client -connect mqtt.tulipfleet.com:8084 -servername mqtt.tulipfleet.com 2>/dev/null | openssl x509 -noout -subject -issuer -dates
#   EXPECT: subject CN=mqtt.tulipfleet.com, issuer = Let's Encrypt (or your CA), valid dates — NOT CN=Client.

# 6b. WSS handshake from outside (browser-equivalent). From your Windows machine or any host:
#   Using a quick node check or wscat:
#   wscat -c "wss://mqtt.tulipfleet.com:8084/mqtt" --subprotocol mqtt
#   EXPECT: connects without cert error.

# 6c. End-to-end: point a throwaway mqtt.js client at wss and subscribe as dispatcher-readonly.
#   With the sim-publisher running, frames should arrive over WSS exactly as they did over the tunnel.
```

**Browser proof:** flip the dispatcher `.env` to the prod URL and reload the live map (see §7); the connection dot should go green with no tunnel running.

---

## 7. Switch the dispatcher frontend to prod WSS

In `C:\dispatcher\.env`:
```
REACT_APP_MQTT_BROKER_URL=wss://mqtt.tulipfleet.com:8084/mqtt
REACT_APP_MQTT_DISPATCHER_USER=dispatcher-readonly
REACT_APP_MQTT_DISPATCHER_PASS=<dispatcher-readonly password>
```
Restart `npm start` (`.env` is read only at start). The SSH tunnel is no longer needed. `.env` stays git-ignored (secret).

The frontend code (`useMqttTelemetry.ts`) needs **no change** — only the URL differs between dev (`ws://localhost:8083`) and prod (`wss://mqtt.tulipfleet.com:8084`).

---

## 8. ROLLBACK (if anything breaks the broker)

```bash
TS=<the suffix you used in §3>

# 8a. Restore listener cert config (Dashboard: re-point certfile/keyfile back to prior values,
#     OR restore the hocon backup then reload)
# Restore cluster.hocon if used:
docker cp /opt/fleet/backups/cluster.hocon.bak.$TS 66e3aa849d79_fleet-emqx:/opt/emqx/data/configs/cluster.hocon
docker exec 66e3aa849d79_fleet-emqx emqx ctl conf reload

# 8b. Close 8084 again if it caused exposure concern
ufw delete allow 8084/tcp
ufw status numbered | grep 8084

# 8c. Confirm mobile fleet still healthy (the real safety check)
curl -s https://api.tulipfleet.com/health
docker exec 66e3aa849d79_fleet-emqx emqx ctl clients list | grep -c fleet-backend
```

The mobile fleet uses **8883 (TLS) / 1883**, NOT 8084, so changing 8084 should not affect mobile telemetry — but verify `fleet-backend` clients stay connected (§8c) as the canary after every step.

---

## 9. Done-criteria checklist

- [ ] §1 outputs recorded (baseline cert, UFW, listener state)
- [ ] Valid `mqtt.tulipfleet.com` cert located or issued
- [ ] Backups taken (§3) with timestamp noted
- [ ] 8084 listener points at valid cert (§4); EMQX reloaded cleanly
- [ ] UFW allows 8084/tcp (§5); 8083 still closed to public
- [ ] §6a shows valid cert (CN=mqtt.tulipfleet.com), not CN=Client
- [ ] WSS handshake succeeds from outside (§6b)
- [ ] dispatcher live map green dot over `wss://...:8084` with NO tunnel (§7)
- [ ] `fleet-backend` mobile clients still connected; `api.tulipfleet.com/health` OK (§8c)
- [ ] INTEGRATION_BOUNDARIES §3.2 updated to reflect dispatcher MQTT consumption (separate doc task)

---

## 10. Notes / gotchas

- **Container cert mount:** the single most likely snag is the cert path not being visible inside the EMQX container. Resolve with a mount (requires container recreate → maintenance window) or by copying certs into an already-mounted dir.
- **Cert renewal:** if Let's Encrypt, automate renewal + EMQX reload (certbot deploy-hook that runs `emqx ctl conf reload` or restarts the listener). A renewed cert on disk is not picked up until the listener reloads.
- **Cloudflare:** keep `mqtt.tulipfleet.com` DNS-only (grey cloud). If someone flips it to proxied, 8084 breaks again.
- **Staging:** there is no separate staging EMQX (shared broker — known tech debt). So "staging-first" here means: prove with the openssl/wscat checks (§6) and the `fleet-backend` canary (§8c) at each step, rather than on a separate broker.
