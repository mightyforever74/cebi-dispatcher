# FEAT-010 — Automated Exception Handling

| Field | Value |
|---|---|
| **Feature ID** | FEAT-010 |
| **Source** | Wishlist W8 — "Automated Exception Handling" (atlanmıştı, ROADMAP Coverage Matrix 2026-05-30 güncellemesi sonrası önceliklendirildi) |
| **Frequency rating** | Common |
| **Cem note** | — (wishlist'te ek not yok) |
| **Tulipfleet Phase** | Phase 1 (rule-based detection + Mode 1 Advisory notification) + Phase 2 (FEAT-101 Mode 2 Exception-based auto-action) |
| **Status** | Function spec drafted via NotebookLM (1 prompt, 2026-05-30) |
| **Pilot note** | Onuncu pilot. Tek iterasyonda **9/10** skor. **§number fabrikasyon = 0** ✅ (F9'daki §188 hatası tekrarlanmadı). Yeni paradigma: **"orkestratör feature"** — 4-5 FEAT'in detection'ını consume edip action'ına route ediyor. |

---

## 1. Feature description

### 1.1 Wishlist tanımı

> *"AI agents detect delays or issues and autonomously contact carriers or reschedule dependent activities. Estimated frequency: Common."*

### 1.2 ML disipline kritik nüans

Wishlist "AI agents" diyor — bu **TulipFleet için yanıltıcı okuma.** ADR-0010 disiplini:

| ADR ref | Anlam |
|---|---|
| ADR-0010 §3.3 | Driver behavior anomaly detection **Phase 3 candidate** — Phase 1-2'de ML yok |
| ADR-0010 §3.4 | *"'Reward function' in conversation → in implementation, it is a weighted sum of constraint penalties in HERE's `objective`. No learning."* |
| ADR-0010 §4 | LLM/ML API consumer pattern — consume yes, build no |

**FEAT-010 yaklaşımı:**
- **Phase 1:** Rule-based detection (eşik tabanlı, anomaly detection değil)
- **Phase 1:** Dispatcher notification (Mode 1 Advisory — ADR-0005)
- **Phase 2 (FEAT-101):** Otomatik action (Mode 2 Exception-based — ADR-0005 §5.3)
- **Phase 3:** AI/ML decision-making (Mode 3 Agentic — ayrı ADR pending)

### 1.3 İş mantığı

```
5 paralel detection monitor (Phase 1):
   1. ETA deviation (FEAT-005:FN-04 üzerine)
   2. Traffic impact (FEAT-002:FN-10 trafficTriggerDetector)
   3. Driver no-show (geofence + task assignment çakışması)
   4. Dock appointment slip (FEAT-006:FN-03 conflict)
   5. Compliance zone breach imminent (ADR-0012 §4 — KONSOLIDASYONDA EKLENDİ)
        │
        ▼ Threshold karşılanırsa
   logExceptionEvent (FN-05) → enterprise.exception_events INSERT
        │
        ▼
   deduplicateException (FN-14, KONSOLIDASYONDA EKLENDİ)
   - Cooldown window 10 dakika (FEAT-007 paterniyle)
        │
        ▼
   evaluateExceptionPolicy (FN-06)
   - Phase 1: stub mode (her zaman "advisory" döner — ADR-0005 §7)
   - Phase 2: policy module karar (auto-action eşiği)
        │
        ├─── "advisory" ───▶ notifyDispatcherException (FN-07)
        │                    + <ExceptionToast /> (FN-10)
        │                    + <ExceptionStatusPanel /> (FN-11)
        │                    + <ResolutionActionPanel /> (FN-12)
        │                    + Dispatcher resolves via FN-09
        │
        └─── "auto" (Phase 2) ─▶ executeAutoResolution (FN-13)
                                  + FEAT-002:FN-02 POST /replan call
                                  + Grace period revert (5-30 dk)
```

### 1.4 Kapsam — içeride

- 5 detection monitor (Phase 1, rule-based)
- `enterprise.exception_events` TimescaleDB hypertable (yeni)
- Severity classification (low/medium/high/critical) — UNCERTAINTIES #4
- Dedup/cooldown (FEAT-007 paterniyle)
- Phase 1: Dispatcher notification (MQTT/banner/toast)
- Phase 1: Dispatcher resolve endpoint + UI
- Phase 2: Policy-based auto-action (Mode 2 Exception)
- Phase 2: Grace period revert window
- Audit trail (resolved_at, resolved_by, resolution_type, comment)

### 1.5 Kapsam — dışarıda

- **ML-based anomaly detection** — Phase 3+ (ADR-0010 §3.3, §3.5)
- **"AI agent" carrier contact (LLM-driven outreach)** — Phase 3+
- **Mode 3 Agentic auto-decision** — Phase 3 ADR pending
- **Predictive failure detection** — FEAT-024 Phase 2 (ayrı feature, ML-bazlı)
- **Email/SMS notification** — Phase 2+ (mevcut backend pattern yok, UNCERTAINTIES #6)

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Phase | Shared with FEAT-001..9 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FEAT-010-FN-01 | worker | `monitorEtaViolations` | taskId, threshold | Exception? | enterprise.dispatch_tasks | enterprise.exception_events | HERE Routing | ADR-0005 §5.2 — "Exception types: No match / Ambiguous match / Rule violation / High-impact event" (4 tip enum) | 1 | **FEAT-005:FN-04** calculateEtaDeviation |
| 2 | FEAT-010-FN-02 | worker | `monitorTrafficImpacts` | routeId | Exception? | enterprise.routing_jobs | enterprise.exception_events | HERE Traffic | ADR-0011 §6 — FEAT-104 (Trafik-triggered re-routing) | 1 | **FEAT-002:FN-10** trafficTriggerDetector |
| 3 | FEAT-010-FN-03 | worker | `monitorDriverPresence` | driverId, taskId | Exception? | public.locations, enterprise.dispatch_tasks | enterprise.exception_events | — | ADR-belirsiz (driver no-show detection — UNCERTAINTIES #1) | 1 | — |
| 4 | FEAT-010-FN-04 | worker | `monitorDockConflicts` | facilityId, window | Exception? | enterprise.dock_appointments | enterprise.exception_events | — | ADR-belirsiz (dock slip warning — UNCERTAINTIES #2) | 1 | **FEAT-006:FN-03** refreshTaskEtas |
| 5 | FEAT-010-FN-05 | worker | `monitorComplianceZones` (**KONSOLIDASYONDA EKLENDİ**) | vehicleId, currentLocation | Exception? | enterprise.nl_compliance_zones, public.locations | enterprise.exception_events | HERE Routing (predicted path) | ADR-0012 §4 — zone breach prediction discipline | 1 | FEAT-001:FN-012 compliance check |
| 6 | FEAT-010-FN-06 | backend | `logExceptionEvent` | eventData | { eventId } | — | enterprise.exception_events | — | ADR-0005 §5.3 — "If rules trigger an exception, system marks the task `needs_dispatcher` and notifies the dispatcher." | 1 | **FEAT-014:FN-04, FN-13** + **FEAT-017:FN-12** + **FEAT-018:FN-08, FN-13** (cross-spec sync 2026-05-30) |
| 7 | FEAT-010-FN-07 | shared_library | `deduplicateException` (**KONSOLIDASYONDA EKLENDİ**) | rawException, cooldownMinutes | Exception? | enterprise.exception_events (son 10 dk) | — | — | FEAT-007:FN-11 deduplicateBehaviorEvents paterni | 1 | **FEAT-007:FN-11** (dedup pattern) |
| 8 | FEAT-010-FN-08 | backend | `evaluateExceptionPolicy` | exceptionId | Decision | public.companies (dispatch_mode), enterprise.exception_events | — | — | ADR-0005 §7 — "policy module structure in the enterprise backend (`src/dispatch/policy.ts`) that reads the mode and currently always returns 'advisory'." | 1 (stub) | **FEAT-003:FN-08** policyModule |
| 9 | FEAT-010-FN-09 | backend | `notifyDispatcherException` | exceptionId | void | enterprise.exception_events | — | EMQX MQTT | ADR-0009 §8 — "MQTT publish from enterprise backend — for direct vehicle commands in Mode 2/3 dispatch (per ADR-0005)." | 1 | — |
| 10 | FEAT-010-FN-10 | backend | `GET /api/dispatcher/exceptions` | company_id, status, severity? | Exception[] | enterprise.exception_events | — | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 1 | — |
| 11 | FEAT-010-FN-11 | backend | `POST /api/dispatcher/exceptions/:id/resolve` | id, action, comment, **resolved_by (JWT.user_id)** | Success | enterprise.exception_events | enterprise.exception_events (audit fields), public.tasks (optional) | — | ADR-0005 §4.1 — "Modify one or more assignments (drag-and-drop in the Kanban view; reorder visits in the timeline)." | 1 | **FEAT-001:FN-013** approve pattern |
| 12 | FEAT-010-FN-12 | frontend | `<ExceptionToast />` | alertData | UI Component | — | — | — | ADR-0001 §3.6 — "Notistack — Lightweight Snackbar for non-blocking alerts" | 1 | — |
| 13 | FEAT-010-FN-13 | frontend | `<ExceptionStatusPanel />` | filterStatus | UI Component | enterprise.exception_events | — | — | ADR-0001 §3.6 — "React Table — Vehicle / driver / task lists with sort, filter, paging" | 1 | — |
| 14 | FEAT-010-FN-14 | frontend | `<ResolutionActionPanel />` | exceptionId | UI Component | — | — | — | ADR-0001 §3.6 — "Forms, modals, navigation, layout primitives" | 1 | — |
| 15 | FEAT-010-FN-15 | worker | `executeAutoResolution` | exceptionId | Result | enterprise.exception_events | enterprise.dispatch_tasks, enterprise.exception_events (status=auto_handled) | HERE Tour Planning | ADR-0005 §5.3 — "If rules permit, system auto-assigns and dispatches." | 2 | **FEAT-002:FN-02** POST /replan |

**Konsolidasyon notları (NotebookLM çıktısına göre düzeltmeler):**

| # | NotebookLM dedi | Düzeltme |
|---|---|---|
| FN-01 ADR-0005 §5.2 | Parafraz birleşim: *"dispatcher notified of exceptions: rule violations, ambiguous matches, high-value tasks, customer-specific escalation patterns"* — **birleştirilmiş cümle**, gerçek metinde 4 alt-başlık var | ✅ Düzeltildi: §5.2 "Exception types"a daha sadık alıntı — 4 tip enum (No match / Ambiguous match / Rule violation / High-impact event) |
| **5. compliance monitor** | NotebookLM 4 detection monitor önerdi (ETA/traffic/no-show/dock) | ✅ **EKLENDİ FN-05** — `monitorComplianceZones` (ADR-0012 §4 zone breach prediction). FEAT-010 5 detection monitor'a tamamlandı. |
| **Dedup pattern** | NotebookLM dedup'tan bahsetmedi | ✅ **EKLENDİ FN-07** — `deduplicateException` (FEAT-007:FN-11 paterniyle, 10 dk cooldown window). Aynı task için tekrarlı exception engellenir. |
| **FN-11 audit trail eksik** | NotebookLM `action, comment` parametreleri | ✅ **GENİŞLETİLDİ** — `resolved_by (JWT.user_id)` eklendi. Writes to: `enterprise.exception_events` audit fields (resolved_at, resolved_by, resolution_type, comment) belirlendi. |
| FN numaralandırma | NotebookLM 13 fonksiyon | ✅ Konsolidasyonda 2 yeni fonksiyon eklendi (FN-05 + FN-07) → toplam **15 fonksiyon**, eski FN'ler kaydırıldı. |
| FN-09 ADR-0009 §8 alıntı | ✅ Birebir cümle (FEAT-005/007 cross-spec sync sonrası) | — Korundu |
| FN-08 ADR-0005 §7 | ✅ Birebir cümle | — Korundu |
| FN-11 ADR-0005 §4.1 | ✅ Birebir cümle | — Korundu |

---

## 3. Exception event pipeline — uçtan uca

### 3.1 Detection → Notification akışı (Phase 1, Mode 1 Advisory)

```
5 paralel monitor (5-15 saniye polling veya event-driven)
   │
   ├── FN-01 monitorEtaViolations
   │   Trigger: FEAT-005:FN-04 deviation > 30 dk
   │
   ├── FN-02 monitorTrafficImpacts
   │   Trigger: FEAT-002:FN-10 HERE Traffic alert
   │
   ├── FN-03 monitorDriverPresence
   │   Trigger: geofence not entered 15 dk grace sonrası
   │
   ├── FN-04 monitorDockConflicts
   │   Trigger: FEAT-006:FN-03 conflict + ETA-dock_window > 0
   │
   └── FN-05 monitorComplianceZones (KONSOLIDASYONDA EKLENDİ)
       Trigger: ADR-0012 §4 — predicted path next 30 dk zone breach
        │
        ▼ Detection threshold karşılanırsa
   logExceptionEvent (FN-06)
   - severity hesapla (Bkz. §4 Severity matrix)
   - INSERT enterprise.exception_events
        │
        ▼
   deduplicateException (FN-07)
   - Son 10 dk içinde aynı (taskId, type) varsa → skip
   - Cooldown window FEAT-007 ALERT_COOLDOWN paterniyle
        │
        ▼
   evaluateExceptionPolicy (FN-08)
   - public.companies.dispatch_mode lookup
   - Phase 1: Stub mode — her zaman { decision: "advisory" } döner
        │
        ▼ ("advisory" karar)
   notifyDispatcherException (FN-09)
   - MQTT publish: enterprise/dispatcher/{company_id}/exception
   - Dispatcher web app subscribe → ExceptionToast (FN-12) gösterir
        │
        ▼
   ExceptionStatusPanel (FN-13) listede gösterir
   Dispatcher inceler → ResolutionActionPanel (FN-14)
        │
        ▼
   POST /api/dispatcher/exceptions/:id/resolve (FN-11)
   - Action: "acknowledge" | "manual_replan" | "manual_reassign" | "dismiss"
   - Audit: resolved_at, resolved_by, resolution_type, comment
   - status: open → resolved
```

### 3.2 Phase 2 — Auto-resolution akışı (Mode 2 Exception-based)

```
Detection + logExceptionEvent + deduplicateException (Phase 1 ile aynı)
        │
        ▼
   evaluateExceptionPolicy (FN-08, Phase 2 aktive)
   - public.companies.dispatch_mode = 'exception'
   - Policy module decision:
     - ADR-0005 §5.1 rule sets (task value, distance, driver constraint,
       time window, customer override)
     - Eşik karşılanırsa: { decision: "auto", action: "replan|reassign" }
     - Karşılanmazsa: { decision: "advisory" } (Phase 1 path)
        │
        ▼ ("auto" karar)
   executeAutoResolution (FN-15)
   - FEAT-002:FN-02 POST /replan call (action="replan" ise)
   - veya FEAT-003 reassign call (action="reassign" ise)
   - enterprise.exception_events UPDATE: status=auto_handled
   - resolution_type = "auto"
        │
        ▼ Grace period 5-30 dk (ADR-0005 §5.3.5)
   Dispatcher revert edebilir → POST /resolve action="revert"
   - Otomatik aksiyonu geri al (orijinal task state restore)
```

---

## 4. Severity classification matrix (**KONSOLIDASYONDA EKLENDİ**)

UNCERTAINTIES #4'te belirsizdi — konsolidasyonda netleştirildi:

| Detection | Eşik | Severity |
|---|---|---|
| **ETA delay** | 15-30 dk | medium |
| **ETA delay** | 30-60 dk | high |
| **ETA delay** | > 60 dk veya customer SLA breach imminent | critical |
| **Traffic impact** | route delay > 20% | medium |
| **Traffic impact** | route blocked / closure | high |
| **Driver no-show** | 0-15 dk grace | low (warning) |
| **Driver no-show** | 15-30 dk | medium |
| **Driver no-show** | > 30 dk veya driver_assigned_at + 60dk | high |
| **Dock conflict** | 60-30 dk lead time | medium |
| **Dock conflict** | 30-0 dk lead time | high |
| **Dock conflict** | dock window kaçırıldı | critical |
| **Compliance breach imminent** | 30-15 dk önceden | medium |
| **Compliance breach imminent** | 15-0 dk önceden | high |
| **Compliance breach** | araç ZE-zone'a hatalı emission ile girdi | critical |
| **Locker pickup expired** | 72 saat geçti, customer paketi almadı | medium |
| **Locker pickup expired** | + customer SLA breach | high |
| **Tender withdrawn** | awarded carrier çekildi | high |
| **Tender no quotes** | deadline geçti, hiç quote yok | medium |
| **Returns pickup failed** | RMA SLA breach (approve→pickup 48h) | medium |
| **Returns pickup failed** | RMA in_transit > 7 gün | high |
| **RTS warehouse unreachable** | failed delivery, RTS destination resolution failed | high |

**Karar mantığı:** Severity hesaplama deterministic, threshold-based (ML değil). Severity → notification channel mapping:

| Severity | Phase 1 Notification |
|---|---|
| low | Sadece exception panel'de görünür (no toast) |
| medium | Toast + panel |
| high | Toast + panel + banner |
| critical | Toast + panel + banner + Phase 2: MQTT push to driver mobile (FN-09 ADR-0009 §8 pattern) |

Per-company override: `public.companies.settings.exception_thresholds` JSONB key (UNCERTAINTIES #5).

---

## 5. Dedup / cooldown discipline (**KONSOLIDASYONDA EKLENDİ**)

FN-07 `deduplicateException` — FEAT-007 behavior_events paterniyle aynı pattern:

```typescript
// Cooldown window: 10 dakika (configurable per company)
const recent = await db.query(`
  SELECT id FROM enterprise.exception_events
  WHERE task_id = $1
    AND exception_type = $2
    AND occurred_at > NOW() - INTERVAL '10 minutes'
    AND status IN ('open', 'acknowledged')
  LIMIT 1
`, [taskId, type]);

if (recent.length > 0) {
  // Skip — aynı task için aktif exception zaten var
  return null;
}
// Devam et: logExceptionEvent
```

**Mantık:**
- Aynı `(task_id, exception_type)` 10 dk içinde tekrar tetiklenirse skip
- "Resolved" durumdaki eski exception sayılmaz — yeni instance açılabilir
- Spam'i önler (örn. ETA 30 dk sınırında osilasyon → tek alert)
- Cooldown window per-company config (UNCERTAINTIES #5)

**Trade-off:** 10 dk içinde durum **kötüleşirse** (örn. ETA 30 → 60 dk) → severity UPDATE mu yeni event mi? **Önerim:** UPDATE (aynı event'in severity'si artar). UNCERTAINTIES #7.

---

## 6. Database — `enterprise.exception_events`

### 6.1 Schema (TimescaleDB hypertable)

```sql
CREATE TABLE enterprise.exception_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    task_id             UUID REFERENCES enterprise.dispatch_tasks(id),
    vehicle_id          UUID REFERENCES public.vehicles(id),
    driver_id           UUID REFERENCES public.drivers(id),

    -- Exception classification
   exception_type      TEXT NOT NULL
                    CHECK (exception_type IN (
                      'eta_delay',
                      'traffic_impact',
                      'driver_no_show',
                      'dock_conflict',
                      'compliance_zone_breach',
                      -- Cross-spec sync (2026-05-30): FEAT-014, 017, 018 entegrasyonu
                      'locker_pickup_expired',         -- FEAT-017:FN-12
                      'tender_withdrawn',              -- FEAT-014:FN-13
                      'tender_no_quotes',              -- FEAT-014:FN-04
                      'returns_pickup_failed',         -- FEAT-018:FN-13 (RMA SLA)
                      'rts_warehouse_unreachable'      -- FEAT-018:FN-08 (RTS destination)
                    )),
    severity            TEXT NOT NULL
                        CHECK (severity IN ('low','medium','high','critical')),
    status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','acknowledged','resolved','auto_handled')),

    -- Detection payload
    detection_payload   JSONB NOT NULL,  -- per-monitor specific data
    -- Örnek: { "eta_deviation_minutes": 45, "planned_arrival": "...", "current_eta": "..." }

    -- Resolution audit (Phase 1: manuel; Phase 2: auto da eklenir)
    resolution_type     TEXT CHECK (resolution_type IN ('manual','auto')),
    resolution_action   TEXT,  -- "acknowledge|manual_replan|manual_reassign|dismiss|auto_replan|auto_reassign|revert"
    resolved_at         TIMESTAMPTZ,
    resolved_by         UUID REFERENCES public.users(id),
    resolution_comment  TEXT,
    grace_period_ends_at TIMESTAMPTZ,  -- Phase 2 auto-action için revert window

    occurred_at         TIMESTAMPTZ NOT NULL,  -- detection time
    received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, occurred_at)
);

-- TimescaleDB hypertable (FEAT-007:behavior_events paterni)
SELECT create_hypertable('enterprise.exception_events', 'occurred_at',
                         chunk_time_interval => INTERVAL '7 days');

-- Retention policy (UNCERTAINTIES #8 — 90 gün default, audit için yeterli)
SELECT add_retention_policy('enterprise.exception_events', INTERVAL '90 days');

-- Indexes
CREATE INDEX idx_exception_events_open ON enterprise.exception_events
  (company_id, status, occurred_at DESC)
  WHERE status IN ('open', 'acknowledged');

CREATE INDEX idx_exception_events_task ON enterprise.exception_events
  (task_id, occurred_at DESC);

CREATE INDEX idx_exception_events_dedup ON enterprise.exception_events
  (task_id, exception_type, occurred_at DESC)
  WHERE status IN ('open', 'acknowledged');
```

### 6.2 Karar — neden TimescaleDB hypertable

- Zaman bazlı sorgu hâkim (aktif son N saat exception listesi)
- FEAT-007:behavior_events paterniyle simetrik (mimari tutarlılık)
- Retention policy (90 gün) audit için yeterli, eski exception'lar `driver_scores` benzeri aggregate olarak gerekirse Phase 2'de eklenir
- Chunk interval 7 gün — exception volume'ı low (50 araç × ~10 exception/gün = 500 row/gün × 7 = 3500 row/chunk)

### 6.3 `public.companies.settings` — exception_thresholds JSONB

```jsonc
{
  "exception_thresholds": {
    "eta_delay_minutes": 30,        // default 30
    "no_show_grace_minutes": 15,
    "dock_slip_lead_minutes": 60,
    "compliance_breach_lead_minutes": 30,
    "dedup_cooldown_minutes": 10
  }
}
```

Per-company override mantığı (UNCERTAINTIES #5).

---

## 7. Shared infrastructure with previous FEAT'leri

| FEAT-010 fonksiyon | Shared with | Paylaşım türü |
|---|---|---|
| FN-01 monitorEtaViolations | **FEAT-005:FN-04** calculateEtaDeviation | Detection source (FEAT-005'in çıktısını consume eder) |
| FN-02 monitorTrafficImpacts | **FEAT-002:FN-10** trafficTriggerDetector | Detection source |
| FN-04 monitorDockConflicts | **FEAT-006:FN-03** refreshTaskEtas | Detection source (dock conflict check) |
| FN-05 monitorComplianceZones | **FEAT-001:FN-012** compliance check | Detection source (compliance verify üzerine prediction) |
| FN-07 deduplicateException | **FEAT-007:FN-11** deduplicateBehaviorEvents | Dedup pattern (cooldown window) |
| FN-08 evaluateExceptionPolicy | **FEAT-003:FN-08** policyModule | Phase 1 stub (ADR-0005 §7), Phase 2 decision engine |
| FN-09 notifyDispatcherException | **FEAT-005:FN-08** broadcastEtaToDriver | MQTT publish from enterprise pattern (ADR-0009 §8) |
| FN-11 POST /resolve | **FEAT-001:FN-013** POST /plans/approve | Approve pattern |
| FN-15 executeAutoResolution | **FEAT-002:FN-02** POST /replan | Action target (Phase 2) |

**Cross-spec sync TODO (potansiyel):**
- FEAT-002 spec'ine FN-02 "consumed by FEAT-010:FN-15" notu eklenebilir mi? Genelde caller yazılır, target reverse yazılmaz. **Karar: reverse yazma yapılmayacak** — FEAT-010 spec'i shared kolonu zaten yansıtıyor.

**Yeni paradigma — Orkestratör Feature:**
FEAT-010 4 farklı FEAT'ten detection consume eder ve 2 farklı FEAT'in action'ını trigger eder. Phase 1'de **observer**, Phase 2'de **executor** rolü. Bu pattern ileride başka FEAT'ler için şablon olabilir (örn. FEAT-024 Predictive Failure Detection benzer orkestratör).

---

## 8. UNCERTAINTIES (Cem onayı bekleyen)

### NotebookLM'in tespit ettikleri

1. **Driver no-show detection (FN-03):** "Driver hareket etmezse" mantığı — kaç metre/saniye threshold?
   - **Önerim:** Task `assigned_at` + 15 dk → geofence (depo veya pickup) ≤ 100m içinde değilse warning. 30 dk → high severity.
   - ADR-belirsiz → bu spec'te tanımlanır.

2. **Dock conflict warning lead time (FN-04):** 60 dk önceden uyar mı, daha erken/geç?
   - **Önerim:** 60 dk default (Cem onayı). Eşik karşılanırsa medium, 30 dk içinde high, dock window kaçırıldıysa critical.

3. **Weather-based exception (FEAT-005-EXT):** Ağır hava koşulları (örn. %20 ek sürüş süresi) exception trigger mı?
   - **Karar:** FEAT-005-EXT spec'i yazılana kadar **kapsam dışı**. FEAT-005-EXT yazıldığında FEAT-010 FN-01 threshold mantığına eklenir (`monitorEtaViolations` weather-aware).

4. **Severity mapping deterministic mi olsun:** Eşikler statik mi yoksa per-company configurable mı?
   - **Karar:** §4 matrix default, per-company override `public.companies.settings.exception_thresholds` JSONB.

5. **Per-company override JSONB struktür:** Tek key (`exception_thresholds`) altında tüm threshold'lar mı, ayrı key'ler mi?
   - **Karar:** Tek key (§6.3 örnek). Daha kolay query, daha az JSONB path complexity.

### Konsolidasyonda eklenen

6. **Driver mobile reject Phase 2 (Mode 2 auto-assign):** Sürücünün auto-assigned task'ı reddetmesi:
   - **High Impact Exception** olarak mı işlenir (ADR-0005 §5.2 "High-impact event")
   - Veya **No Match** exception olarak yeni dispatcher decision tetikler (§5.2 "No match")?
   - **Önerim:** Daha basit "No match" yeniden — driver reject = mevcut driver-task pair geçersiz, yeni atama gerek. UNCERTAINTIES'te ADR-0005 §9 ile birlikte değerlendirilmeli.

7. **Severity kötüleşme — UPDATE vs new event:** 10 dk dedup window içinde durum kötüleşirse (örn. ETA 30 → 60 dk):
   - **Önerim:** UPDATE — aynı `exception_events` row'un severity'sini yükselt, `detection_payload` JSONB'ye history ekle (`escalation_history: [{from: "medium", to: "high", at: "..."}]`)
   - Alternatif: Yeni event aç — dedup window'u kötüleşme için bypass et
   - Karar UI/UX tarafından gelmeli — dispatcher tek exception görmek mi ister, escalation history mi?

8. **Retention policy 90 gün doğru mu:** TimescaleDB retention default önerildi.
   - 50 araç × ~10 exception/gün × 90 gün = 45K row → küçük lookup
   - Audit için 90 gün yeterli (Phase 2'de daha uzun arşivleme `enterprise.exception_aggregate` ile)
   - **Karar:** 90 gün ✅

9. **Resolution sorumluluğu:** Bir exception "acknowledge" edildiğinde, o aracın planlamadan geçici olarak çıkarılıp çıkarılmayacağı (NotebookLM UNCERTAINTIES #3)
   - **Önerim:** **HAYIR** — "acknowledge" sadece dispatcher gördü demektir, status `open → acknowledged`, task hala aktif. Eğer manuel re-plan veya reassign yapılırsa zaten ayrı action.

10. **Email/SMS notification Phase 2+:**
    - **Karar:** Phase 1 sadece MQTT + UI. Email/SMS Phase 2+ FEAT-101 ile beraber gelir gerekirse.
    - Mevcut backend pattern: SendGrid/Mailgun entegrasyonu yok (UNCERTAINTIES #6).

---

## 9. Pilot süreç notları

### 9.1 Pilot akışı (2026-05-30)

Tek prompt + 0 follow-up. Cem prompt'u kısalttı (token limiti) — ML disipline uyarısı, ÇIKTI FORMATI, EK ÇIKTI 6 başlık korundu. Sonuç: kısaltma kalitede düşüşe neden olmadı.

### 9.2 Alıntı doğrulama — §number fabrikasyon stop devam

| # | NotebookLM | Gerçek | Durum |
|---|---|---|---|
| FN-01 ADR-0005 §5.2 | Parafraz birleşim | §5.2 mevcut, ama alıntı 4 başlığı tek cümleye birleştirmiş | ⚠️ Düzeltildi — daha sadık alıntı |
| FN-02 ADR-0011 §6 FEAT-104 | ✅ Doğru | — | ✅ |
| FN-06 ADR-0005 §5.3 | ✅ Birebir cümle | — | ✅ |
| FN-08 ADR-0005 §7 | ✅ Birebir cümle | — | ✅ |
| FN-09 ADR-0009 §8 | ✅ Birebir cümle (sync sonrası) | — | ✅ |
| FN-10 ADR-0011 §9.5 | ✅ Doğru | — | ✅ |
| FN-11 ADR-0005 §4.1 | ✅ Birebir cümle | — | ✅ |
| FN-12, FN-13, FN-14 ADR-0001 §3.6 | ✅ Doğru | — | ✅ |
| FN-15 ADR-0005 §5.3 | ✅ Birebir cümle | — | ✅ |

**§number fabrikasyon: 0** ✅ (F9'daki §188 hatası tekrarlanmadı)
**Toplam alıntı düzeltmesi: 1** (FN-01 parafraz birleşimi — minor)

### 9.3 10 pilot karşılaştırma — F10 zirveye yakın

| Boyut | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 | F9 | **F10** |
|---|---|---|---|---|---|---|---|---|---|---|
| Skor | 9 | 9.5 | 9 | 9 | 8.5 | 9 | 8.5 | 9.5 | 8.5 | **9** |
| İterasyon | 5 | 3 | 2 | 1+1 | 1+3 | 1 | 1+1 | 1 | 1 | **1** |
| Fonksiyon (final) | 16 | 16 | 16 | 12 | 12 | 10 | 14 | 9 | 7 | **15** |
| Alıntı hatası | 1 | 1 | 1 | 0 | 1 | 1 | 6 | 1 | 2 | **1** |
| §number fabrikasyon | 1 | 1 | 1 | 0 | 1 | 1 | 1 | 0 | 1 | **0** ✅ |
| Yeni paradigma | VRP | Re-route | Dispatch | Multi-actor | HERE consume | Task duration | Coaching | Toll | Carbon | **Orchestrator** |

**F10 gözlemleri:**
- **§number fabrikasyon stop devam** — F9'daki §188 hatası bir sapmaydı, F8 ve F10'da 0
- Kısaltılmış prompt kaliteyi etkilemedi
- Konsolidasyonda 2 yeni fonksiyon eklendi (FN-05 compliance monitor + FN-07 dedup) — NotebookLM'in **kaçırdığı disipline noktaları**
- Yeni paradigma: **Orkestratör feature** — multi-source consumer + multi-target action router

### 9.4 NotebookLM trend yorumu

F8-F9-F10 mini-trend:
- F8 zirve (9.5/10, 0 fab) — Vrachtwagenheffing stratejik feature
- F9 hafif düşüş (8.5/10, 1 fab) — Carbon "rutin" feature
- F10 toparlama (9/10, 0 fab) — Exception handling stratejik orkestratör

Hipotez: **NotebookLM stratejik öneme sahip feature'larda daha dikkatli** — Vrachtwagenheffing (production-blocking regulatory), Exception Handling (Mode 1→2 bridge) = yüksek dikkat; Carbon "rutin display" = odak gevşemesi.

**Sonraki pilotlar için:** "ADR-XXXX §3.4'ten yüksek section YOK" guard rail prompt'ta korunmalı (F10'da işe yaradı).

---

## 10. Next steps

### 10.1 Cross-spec sync — yok (ilk kez)

F1 (v3), F5 (v2), F7 (v3) cross-spec sync yapıldı. **FEAT-010 bu commit'te cross-spec sync GEREKTİRMİYOR:**
- FN-01 FEAT-005:FN-04 consume eder — FEAT-005 spec'inde değişiklik yok (caller direction)
- FN-02 FEAT-002:FN-10 consume eder — aynı şekilde
- FN-15 FEAT-002:FN-02 trigger eder Phase 2'de — aynı şekilde

Genelde **caller spec'i** consumer'ı belgelemekle yetinir. Target spec'lerinde reverse note eklemek gereksiz (önceki cross-spec sync'lerde de yapılmadı).

### 10.2 Phase 1 implementation backlog

ROADMAP Phase 1.1'de (FEAT-010 sıralanan ilk pilot):

- [ ] Schema migration: `enterprise.exception_events` TimescaleDB hypertable
- [ ] `public.companies.settings.exception_thresholds` JSONB default values
- [ ] FN-01..FN-05 5 detection monitor (paralel worker'lar)
- [ ] FN-06 logExceptionEvent + severity hesabı (§4 matrix)
- [ ] FN-07 deduplicateException (10 dk cooldown)
- [ ] FN-08 evaluateExceptionPolicy stub (advisory döner)
- [ ] FN-09 notifyDispatcherException (MQTT publish)
- [ ] FN-10 GET /api/dispatcher/exceptions
- [ ] FN-11 POST /api/dispatcher/exceptions/:id/resolve + audit fields
- [ ] FN-12 `<ExceptionToast />` (Notistack)
- [ ] FN-13 `<ExceptionStatusPanel />` (React Table)
- [ ] FN-14 `<ResolutionActionPanel />` (form modal)

### 10.3 Phase 2 implementation backlog (FEAT-101 customer trigger)

- [ ] FN-08 evaluateExceptionPolicy production logic (ADR-0005 §5.1 rule sets)
- [ ] FN-15 executeAutoResolution (FEAT-002:FN-02 POST /replan caller)
- [ ] Grace period revert window (5-30 dk, ADR-0005 §5.3.5)
- [ ] POST /api/dispatcher/exceptions/:id/resolve action="revert" desteği
- [ ] MQTT push to driver mobile (ADR-0009 §8) critical severity için
- [ ] Email/SMS notification entegrasyonu (gerekirse)

### 10.4 Sıradaki pilot

ROADMAP pilot pipeline #2: **FEAT-011 PoD Capture (W9)**. Cem notu "last priority" ama Very common.

Alternatifler:
- **FEAT-012** Refrigerated Container Monitoring (W11, menu/skeleton paterni — ilginç mimari)
- **FEAT-013** Hazmat Routing (W12, ADR-0012 ile sinerjili)
- **FEAT-016** Cost-to-Serve Modeling (W15)

Cem kararı.

---

## 11. References

- ADR-0001 §3.6 (UI primitives — Notistack, React Table, Forms)
- **ADR-0005 §4.1** (Mode 1 dispatcher modify), **§5.2** (Exception types), **§5.3** (Auto-dispatch loop), **§7** (Policy module stub)
- ADR-0009 §8 (MQTT publish from enterprise pattern)
- **ADR-0010 §3.3** (anomaly detection Phase 3), **§3.4** (no learning), **§4** (API consumer)
- ADR-0011 §6 (FEAT-104 trafik-triggered), §9.5 (endpoint patterns)
- ADR-0012 §4 (NL Compliance zone breach prediction — FN-05 detection source)
- FEAT-001 spec v3 (FN-013 approve pattern)
- FEAT-002 spec (FN-02 POST /replan action target, FN-10 trafficTriggerDetector detection source)
- FEAT-003 spec (FN-08 policyModule Phase 2 decision)
- FEAT-005 spec v2 (FN-04 calculateEtaDeviation detection source, FN-08 MQTT publish pattern)
- FEAT-006 spec (FN-03 dock conflict detection source)
- FEAT-007 spec v3 (FN-11 deduplicateBehaviorEvents — dedup pattern)
- ROADMAP Phase 1.1 + Feature Wishlist Coverage Matrix (FEAT-010 sıradaki pilot işaretlemesi)
- NotebookLM session 2026-05-30 (1 prompt, 9/10 skor, prompt kısaltılmış)

---

## 12. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-30 | Cem Sahinkaya (with Claude + NotebookLM cowork) | İlk konsolide function spec. Onuncu pilot — automated exception handling, wishlist W8 (atlanmıştı, ROADMAP Coverage Matrix güncellemesi sonrası sıraya alındı). **Yeni paradigma: Orkestratör feature** — 4-5 FEAT'in detection'ını consume edip action'ına route ediyor. 15 fonksiyon (FN-01..FN-15), Phase 1: 14, Phase 2: 1 (executeAutoResolution Mode 2 trigger). ML disipline check ADR-0010 §3.3 + §3.4 + §4 birebir uyumlu — "AI agent" terminolojisi sızmadı, rule-based detection Phase 1, policy-based action Phase 2, anomaly detection Phase 3+. Konsolidasyon eklemeleri: (a) FN-05 monitorComplianceZones (ADR-0012 §4 zone breach prediction — 5. detection monitor), (b) FN-07 deduplicateException (FEAT-007:FN-11 paterni, 10 dk cooldown), (c) §4 Severity classification matrix (deterministic, threshold-based — ML değil), (d) FN-11 audit trail fields detaylandı (resolved_at, resolved_by, resolution_type, resolution_action, resolution_comment). FN-01 alıntı düzeltmesi — ADR-0005 §5.2 parafraz birleşimi → 4 tip enum (No match / Ambiguous match / Rule violation / High-impact event). Schema kararı: `enterprise.exception_events` TimescaleDB hypertable (FEAT-007:behavior_events paterniyle simetrik), 90 gün retention, dedup index. Per-company override: `public.companies.settings.exception_thresholds` JSONB. NotebookLM kalite trend: §number fabrikasyon = 0 ✅ (F9 §188 hatasından toparlandı). Kısaltılmış prompt kaliteyi etkilemedi — temel disiplinler (ML, ADR ref, Phase ayrımı) korundu. |
| 1.1 (cross-spec sync) | 2026-05-30 | Cem Bakir + Claude | Cross-spec sync — 5 yeni exception_type enum (`locker_pickup_expired` FEAT-017:FN-12, `tender_withdrawn` FEAT-014:FN-13, `tender_no_quotes` FEAT-014:FN-04, `returns_pickup_failed` FEAT-018:FN-13, `rts_warehouse_unreachable` FEAT-018:FN-08). §4 Severity matrix 5 yeni entry. §2 FN-06 logExceptionEvent shared kolonuna FEAT-014, 017, 018 eklendi. Schema değişikliği additive (CHECK constraint ALTER) — Phase 1 production deployment için forward-compatible (eski 5 enum aynen kalır). FEAT-017 + FEAT-014 + FEAT-018 spec'lerindeki cross-spec sync TODO'lar kapatıldı. |
