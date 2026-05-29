# FEAT-007 — Driver Performance Coaching

| Field | Value |
|---|---|
| **Feature ID** | FEAT-007 |
| **Source** | Feature Wishlist #7 — "Driver Performance Coaching" |
| **Frequency rating** | Common (industry-wide) |
| **Tulipfleet Phase** | Phase 1 (rule-based scoring + dispatcher/admin views) + Phase 2 (driver mobile real-time feedback) |
| **Müşterinin notu** | *"we do this via adxl345"* — mevcut TulipFleet donanımı kullanılır |
| **Status** | Function spec drafted via NotebookLM (1 prompt, 2026-05-29) |
| **Pilot note** | Yedinci pilot. Tek iterasyonda 8.5/10 skor. **5 §number/alıntı düzeltmesi gerekti** (§11 detay). Rule-based ML discipline check geçildi. |

---

## 1. Feature description

> *"Driver Performance Coaching: Real-time feedback and historical insights based on driving behavior (acceleration, braking, harsh turns, idling) — **we do this via adxl345**."*

### 1.1 Müşterinin kritik notu — mevcut donanım

ESP32 + ADXL345 zaten **4 tipte rule-based event** üretiyor (firmware v5.0.4):

| Event tipi | Eşik (default) | Severity |
|---|---|---|
| HARD_BRAKE | 0.40 G | high |
| HARD_ACCEL | 0.30 G | medium |
| HARD_TURN | 0.35 G | medium |
| IMPACT | 2.50 G (vektör) | critical |

Bu event'ler MQTT topic `fleet/device/{device_id}/alert`'e yayılır. FEAT-007:
- **Yeni event detection algoritması YAZMAZ** — firmware'ın ürettiği event'leri tüketir
- **In-house ML eğitmez** — ADR-0010 §3.3 + §3.4 disiplini
- Rule-based threshold count + weighted sum scoring uygular

Detay: `ADXL345_FIRMWARE_BEHAVIOR_DETECTION.md` (kaynak özet, repo'da).

### 1.2 ML disiplin sınırı

ADR-0010 §3.4'te ("Avoiding terminology drift") çok net:

> *"'Reward function' in conversation → in implementation, it is a weighted sum of constraint penalties in HERE's `objective`. **No learning.**"*

ADR-0010 §3.5'te driver behavior anomaly detection açıkça Phase 3'e atılır:

> *"Driver behavior anomaly detection — 'This driver's profile deviates from their baseline.' **Rule-based thresholds (already in `vehicles.threshold_*` columns) are the Phase 1 baseline; ML adds value when baselines become noisy at scale.'"*

FEAT-007 tam olarak **rule-based threshold + weighted sum** yaklaşımı — ADR Phase 1 baseline tanımıyla birebir uyumlu.

### 1.3 Üç consumer

Wishlist "real-time feedback AND historical insights" diyor — bu iki farklı consumer:

| Consumer | Ne görür | Phase |
|---|---|---|
| **dispatcher** | Live behavior timeline (FEAT-002 alert panel ile birlikte), per-driver detail | 1 |
| **admin / fleet manager** | Leaderboard, fleet avg score, aggregate report, training needs | 1 |
| **driver** | Mobile app real-time feedback (örn. HARD_BRAKE sonrası "Yumuşak frene dikkat") | 2 |

Driver consumer Phase 2 çünkü:
- TulipFleet mobile app değişikliği gerek (`mightyforever74/tulipfleet` repo)
- MQTT enterprise → device push topic'i ADR-0009 §8 Phase Boundaries'e göre Phase 2+ planlanmış
- Driver UX iterasyonu pilot sonrası karara bağlı

### 1.4 Kapsam — içeride

- `enterprise.behavior_events` (TimescaleDB hypertable, Phase 1)
- `enterprise.driver_scores` (pre-aggregated daily/weekly skor, Phase 1)
- MQTT subscriber `fleet/device/+/behavior` (ADR-0009 §4.2 read-only)
- Backend dedup (firmware ALERT_COOLDOWN ile senkron)
- Weighted-sum scoring (configurable weights)
- Per-vehicle threshold override (mevcut `public.vehicles.threshold_*` kullanır)
- Dispatcher behavior timeline UI
- Admin leaderboard + aggregate report
- **HERE-based speed limit violation detection** (Phase 1.1, FN-14)
- **Driver-level threshold override** (Phase 2, FN-12 + FN-13) — `public.drivers.skills` veri olgunluğu trigger
- Driver mobile push (Phase 2, FN-09)

### 1.5 Kapsam — dışarıda

- **In-house ML / anomaly detection** — ADR-0010 §3.3, §3.4, §3.5 yasak
- **Computer vision (DMS / drowsiness)** — ROADMAP'te ayrı business line, ADR pending
- **Predictive risk modeling** — Phase 3+ ML candidate
- **Real-time route deviation detection** — Phase 2, FEAT-002 dynamic re-routing kapsamı

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Phase | Consumer | Shared |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FEAT-007-FN-01 | worker | `onDriverBehaviorUpdate` | MQTT_Payload | void | public.vehicles (threshold override) | enterprise.behavior_events | EMQX | ADR-0009 §4.2 — "Existing fleet/device/+/* topics are read by both backends; dispatcher backend subscribes read-only." | 1 | internal | FEAT-005:FN-02 (pattern) |
| 2 | FEAT-007-FN-02 | backend | `processBehaviorSeverity` | eventData, thresholds | severity, normalizedG | — | — | — | ADXL345_FIRMWARE_BEHAVIOR_DETECTION §5 — "Dispatcher coaching feature'ı bu kolonları okur ve skor hesaplarken event'in gerçekten 'hard' olup olmadığını yeniden değerlendirebilir" | 1 | internal | — |
| 3 | FEAT-007-FN-03 | shared_library | `calculateDriverSafetyScore` | events[], **effectiveThresholds**, weights, period | score: 0-100 | enterprise.behavior_events | — | — | ADR-0010 §3.4 — "'Reward function' in conversation → in implementation, it is a weighted sum of constraint penalties in HERE's `objective`. **No learning.**" | 1 | all | **FEAT-003:FN-06** (weighted sum pattern) |
| 4 | FEAT-007-FN-04 | backend | `GET /api/dispatcher/drivers/:id/behavior` | id, dateRange, (JWT.company_id) | BehaviorProfile | enterprise.behavior_events | — | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 1 | dispatcher | — |
| 5 | FEAT-007-FN-05 | backend | `GET /api/admin/reports/leaderboard` | (JWT.company_id), period | Leaderboard[] | enterprise.driver_scores | — | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 1 | admin | — |
| 6 | FEAT-007-FN-06 | frontend | `<BehaviorTimeline />` | events: JSON | UI Component | — | — | — | ADR-0001 §3.6 — "Forms, modals, navigation, layout primitives" | 1 | dispatcher | — |
| 7 | FEAT-007-FN-07 | frontend | `<SafetyLeaderboard />` | data: JSON | UI Component | — | — | — | ADR-0001 §3.6 — "React Table — Vehicle / driver / task lists with sort, filter, paging" | 1 | admin | — |
| 8 | FEAT-007-FN-08 | backend | `POST /api/dispatcher/vehicles/:id/thresholds` | id, newThresholds, (JWT.company_id) | Success | — | public.vehicles (threshold_*) | — | ADR-0010 §3.4 — "'Learns over time' in conversation → in implementation, it is a configuration that the dispatcher tunes manually based on observed outcomes. **No online learning.**" | 1 | dispatcher | — |
| 9 | FEAT-007-FN-09 | worker | `pushFeedbackToDriver` | driverId, message | void | public.drivers | — | EMQX | ADR-0009 §8 — "MQTT publish from enterprise backend — for direct vehicle commands in Mode 2/3 dispatch (per ADR-0005)." | 2 | driver | — |
| 10 | FEAT-007-FN-10 | backend | `generateAggregateSafetyReport` | company_id, period | ReportJSON | enterprise.behavior_events, enterprise.driver_scores | — | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 1 | admin | — |
| 11 | FEAT-007-FN-11 | shared_library | `deduplicateBehaviorEvents` | rawEvents, windowMs | cleanEvents | — | — | — | ADR-belirsiz (firmware ALERT_COOLDOWN 5s ile senkronizasyon — UNCERTAINTIES #1) | 1 | internal | — |
| 12 | FEAT-007-FN-12 | backend | `POST /api/dispatcher/drivers/:id/thresholds` | id, customThresholds, (JWT.company_id) | Success | — | public.drivers (threshold_*, speed_limit_override) | — | ADR-0010 §3.4 — "'Learns over time' in conversation → in implementation, it is a configuration that the dispatcher tunes manually based on observed outcomes. **No online learning.**" | 2 | dispatcher | — |
| 13 | FEAT-007-FN-13 | shared_library | `getEffectiveThresholds` | driverId, vehicleId | EffectiveThresholds | public.drivers, public.vehicles | — | — | FEAT-007 §1.5 + §7 UNCERTAINTIES #6 — driver override hiyerarşisi Phase 2 trigger | 2 | internal | — |
| 14 | FEAT-007-FN-14 | backend | `checkSpeedLimitViolation` | currentSpeed, location, vehicleProfile | { isViolation, legalLimit, severity } | public.vehicles | enterprise.behavior_events | HERE Routing API (speed limits) | ADR-0010 §4 — "Using ML-powered APIs (HERE, future map providers, future translation/NLP APIs). Allowed and encouraged." | 1.1 | internal | FEAT-005:FN-01 (HERE consumer pattern) |

**Konsolidasyon notları (NotebookLM çıktısına göre düzeltmeler):**

| # | NotebookLM dedi | Gerçek | Aksiyon |
|---|---|---|---|
| FN-03 | ADR-0010 §2 | **§3.4** "Avoiding terminology drift" | ✅ Düzeltildi |
| FN-08 | ADR-0010 §2 | **§3.4** | ✅ Düzeltildi |
| FN-09 | ADR-0009 §8 + parafrazlanmış alıntı | §8 doğru, **alıntı birebir cümleye değişti**: *"MQTT publish from enterprise backend — for direct vehicle commands in Mode 2/3 dispatch (per ADR-0005)."* | ✅ Düzeltildi |
| FN-10 | ADR-0011 §5 FEAT-009 | FEAT-009 ile **bağlantı zayıf**, daha doğru ref: §9.5 endpoint patterns (admin reports). Carbon FEAT-009 farklı domain. | ✅ Düzeltildi (§9.5'e ref) |
| FN-12 (extension prompt) | ADR-0010 §2 | **§3.4** | ✅ Düzeltildi (aynı stabil hata) |
| FN-14 (extension prompt) | Phase 1 işaretli | **Phase 1.1** olmalı — HERE Get Speed Limits commercial API call her location'da maliyetli; ROADMAP Phase 1.1 follow-up'a daha uygun | ✅ Phase 1.1'e taşındı |
| FN-02 ADXL345 §5 | ✅ Doğru | — | — |
| Diğerleri (FN-01, FN-04, FN-05, FN-06, FN-07, FN-11, FN-13) | Doğru | — | — |

**Extension pilot notu (FN-12, FN-13, FN-14):** Cem'in "sürücü bazlı eşik" sorusu üzerine ikinci NotebookLM round'u yapıldı. 3 yeni fonksiyon: driver-level threshold POST (FN-12, Phase 2), effective threshold hierarchy library (FN-13, Phase 2), HERE-based speed limit check (FN-14, Phase 1.1). FN-03 imzası `effectiveThresholds` parametresi alacak şekilde **forward-compatible** olarak genişletildi (breaking change değil).

---

## 3. Behavior event pipeline — uçtan uca

### 3.1 Firmware → Backend akışı

```
ESP32 + ADXL345 (cihazda)
   - Threshold check (HARD_BRAKE 0.40G, HARD_ACCEL 0.30G, HARD_TURN 0.35G, IMPACT 2.50G)
   - Speed gate (>2.5 m/s, IMPACT hariç)
   - 5s ALERT_COOLDOWN
        │
        ▼ MQTT topic: fleet/device/{device_id}/alert
        │
   onDriverBehaviorUpdate (FN-01)
   - Subscribe (ADR-0009 §4.2 read-only)
   - JSON parse + validate
        │
        ▼
   deduplicateBehaviorEvents (FN-11)
   - Backend dedup window (firmware ALERT_COOLDOWN ile senkron, 5s)
   - Aynı (device, type, timestamp ± 1s) → tek event
        │
        ▼
   getEffectiveThresholds (FN-13, Phase 2 activate)
   - Hiyerarşi: Driver override (public.drivers.threshold_*)
                > Vehicle default (public.vehicles.threshold_*)
                > Firmware default (HARD_BRAKE=0.40, vb.)
   - Phase 1'de sadece Vehicle + Firmware default (FN-13 stub döner)
   - Phase 2'de Driver override aktive (skills veri olgunluğu trigger)
        │
        ▼
   processBehaviorSeverity (FN-02)
   - effectiveThresholds ile karşılaştır
   - Net G normalize
   - severity hesapla (low/medium/high/critical)
        │
        ▼ INSERT
   enterprise.behavior_events (TimescaleDB hypertable)
        │
        ▼ (nightly aggregation worker)
   enterprise.driver_scores (pre-aggregated)
        │
        ├──▶ FN-04 dispatcher behavior timeline
        ├──▶ FN-05 admin leaderboard
        └──▶ FN-10 aggregate report
```

### 3.2 Phase 1.1 — Speed limit violation pipeline (FN-14)

ADXL345'ten farklı bir kanal — GPS bazlı, HERE Routing API consumer:

```
GPS location update (firmware MQTT /location topic)
        │
        ▼ (mevcut FEAT-005:FN-02 onVehicleLocationUpdate worker tarafından)
   currentSpeed extracted from payload
        │
        ▼
   checkSpeedLimitViolation (FN-14, Phase 1.1)
   - getEffectiveThresholds → driver.speed_limit_override
                              veya vehicle default veya legal limit
   - HERE Routing API → legal_speed_limit(location)
   - effectiveLimit = COALESCE(driver_override, vehicle_default,
                               legal_limit × policy_multiplier)
   - if (currentSpeed > effectiveLimit) → violation
        │
        ▼ INSERT (synthetic event)
   enterprise.behavior_events (event_type = 'SPEED_VIOLATION')
   - Aynı scoring pipeline'a girer (weight ayrı, UNCERTAINTIES #8)
```

**Önemli karar:** SPEED_VIOLATION **firmware tarafında** üretilmez (ADXL345'in 4 tipinden ayrı). Backend-side synthetic event'tir. `behavior_events.event_type` CHECK constraint genişletilmeli (UNCERTAINTIES #9).

### 3.3 Phase 2 — Driver mobile push (FN-09)

```
Behavior event detected (örn. HARD_BRAKE)
        │
        ▼
   pushFeedbackToDriver (FN-09, Phase 2)
   - Coaching message lookup ("Ani frene dikkat — yolcu konforu ve yakıt verimi")
   - Driver online mı? (public.drivers.last_seen)
        │
        ▼ MQTT publish: fleet/driver/{driver_id}/coaching
        │
        ▼ (Mobile app TulipFleet, ayrı repo)
   Driver receives push notification + in-app banner
```

ADR-0009 §8 Phase Boundaries: *"MQTT publish from enterprise backend — for direct vehicle commands in Mode 2/3 dispatch (per ADR-0005)."* Coaching push bu paterne uyar (Mode 2 sayılabilir), Phase 2'de aktive.

---

## 4. Scoring algorithm — ADR-0010 §3.4 ile uyumlu

### 4.1 Penalty formula (önerilen default)

```
effectiveThresholds = getEffectiveThresholds(driver_id, vehicle_id)
   # Phase 1: vehicle.threshold_* veya firmware default
   # Phase 2: driver.threshold_* override öncelikli

penalty_per_100km =
  count(HARD_BRAKE)       × weight_brake +
  count(HARD_ACCEL)       × weight_accel +
  count(HARD_TURN)        × weight_turn  +
  count(IMPACT)           × weight_impact +
  count(SPEED_VIOLATION)  × weight_speed   # Phase 1.1 (FN-14)

normalized_penalty = (penalty / total_km) × 100   # 100 km bazına çevir

driving_score = max(0, 100 - normalized_penalty)
```

### 4.2 Default ağırlıklar (config'den okunur)

| Event | Weight | Phase | Mantık |
|---|---|---|---|
| HARD_BRAKE | **5** | 1 | Yolcu konforu + yakıt + fren mesafesi |
| HARD_ACCEL | **3** | 1 | Yakıt verimi + lastik aşınması |
| HARD_TURN | **4** | 1 | Yolcu konforu + yük güvenliği + yan devrilme |
| IMPACT | **50** | 1 | Critical — tek event büyük düşüş |
| **SPEED_VIOLATION** | **4** | 1.1 | Yasal sorumluluk + yakıt + güvenlik. Ağırlık tartışmalı (UNCERTAINTIES #8). |

> Ağırlıklar **ADR-0010 §3.4 uyumlu konfigürasyon** — ML değil. Per-company override için Phase 2'de policy module eklenebilir (UNCERTAINTIES #1).

### 4.3 Normalizasyon disiplini

- **Per 100 km basis:** Mutlak event sayısı yanıltıcı (1000 km/5 HARD_BRAKE vs 100 km/3 HARD_BRAKE)
- **Minimum mesafe filtresi:** 10 km altı görevler skor hesaplamasına dahil edilmez (istatistiksel gürültü)
- **Period:** günlük, haftalık, aylık, görev bazlı

### 4.4 Bu neden ML değil — ADR-0010 §3.4 mapping

| Soru | Cevap |
|---|---|
| Data'dan pattern öğreniyor mu? | Hayır. Eşikler firmware sabiti, ağırlıklar config |
| Prediction yapıyor mu? | Hayır. Geçmiş event'lerin toplam ağırlığı, çıkarsama yok |
| Anomaly detection mi? | Hayır. ADR-0010 §3.5 bunu Phase 3 candidate olarak işaretler |
| Hyperparameter tuning gerekir mi? | Hayır. Ağırlıklar business decision, loss minimization değil |

ADR-0010 §3.4 *"No learning. No reinforcement learning. No online learning."* — FEAT-007 üç hattı da geçer.

---

## 5. Database tables — yeni iki tablo (additive, ADR-0004 v3 §6)

### 5.1 `enterprise.behavior_events` (TimescaleDB hypertable)

```sql
CREATE TABLE enterprise.behavior_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    vehicle_id          UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    driver_id           UUID REFERENCES public.drivers(id),  -- NULL if no active task
    dispatch_task_id    UUID REFERENCES enterprise.dispatch_tasks(id),  -- NULL if outside task
    device_id           TEXT NOT NULL,  -- ESP32 chip id from MQTT payload
    event_type          TEXT NOT NULL CHECK (event_type IN ('HARD_BRAKE','HARD_ACCEL','HARD_TURN','IMPACT','SPEED_VIOLATION')),
    severity            TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
    g_force             NUMERIC(5,2) NOT NULL,  -- ham G değeri (örn. 0.48)
    threshold_used      NUMERIC(5,2) NOT NULL,  -- firmware veya per-vehicle override eşiği
    latitude            NUMERIC(10,7),
    longitude           NUMERIC(10,7),
    speed_kmh           NUMERIC(5,2),
    heading             INTEGER,
    hdop                NUMERIC(4,2),  -- GPS quality (UNCERTAINTIES #4)
    metadata            JSONB,  -- ham MQTT payload yedeği
    occurred_at         TIMESTAMPTZ NOT NULL,  -- firmware timestamp
    received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- backend ingest
    PRIMARY KEY (id, occurred_at)
);

-- TimescaleDB hypertable
SELECT create_hypertable('enterprise.behavior_events', 'occurred_at',
                         chunk_time_interval => INTERVAL '7 days');

-- Retention policy (UNCERTAINTIES #3 — 90 gün default)
SELECT add_retention_policy('enterprise.behavior_events', INTERVAL '90 days');

-- Indexes
CREATE INDEX idx_behavior_events_driver ON enterprise.behavior_events (driver_id, occurred_at DESC);
CREATE INDEX idx_behavior_events_vehicle ON enterprise.behavior_events (vehicle_id, occurred_at DESC);
CREATE INDEX idx_behavior_events_company_type ON enterprise.behavior_events (company_id, event_type, occurred_at DESC);
```

**Notlar:**
- TimescaleDB hypertable çünkü zaman bazlı sorgu hâkim (FEAT-004 timeline, FEAT-005 leaderboard period)
- `dispatch_task_id` opsiyonel — driver task dışında da event olabilir (boş yola dönüş vb.)
- `hdop` GPS kalitesi — backend skorlamada güveni ağırlıklandırabilir (UNCERTAINTIES #4)
- 90 gün retention — coaching trend analizi 90 gün yeterli, daha eskisi `driver_scores` aggregate'ında zaten korunuyor

### 5.2 `enterprise.driver_scores` (pre-aggregated)

```sql
CREATE TABLE enterprise.driver_scores (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    driver_id           UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    period_type         TEXT NOT NULL CHECK (period_type IN ('daily','weekly','monthly')),
    period_start        DATE NOT NULL,
    period_end          DATE NOT NULL,
    total_km            NUMERIC(10,2) NOT NULL,
    event_counts        JSONB NOT NULL,  -- { "HARD_BRAKE": 5, "HARD_ACCEL": 2, ... }
    penalty_total       NUMERIC(8,2) NOT NULL,
    score               NUMERIC(5,2) NOT NULL,  -- 0-100
    weights_snapshot    JSONB NOT NULL,  -- skorlama anındaki ağırlıklar (audit trail)
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (driver_id, period_type, period_start)
);

CREATE INDEX idx_driver_scores_leaderboard ON enterprise.driver_scores
    (company_id, period_type, period_start DESC, score DESC);
```

**Notlar:**
- Nightly worker aggregator ile doldurulur (cron veya pg_cron)
- `weights_snapshot` — ağırlıklar değişirse eski skorlar yeniden hesaplanabilir veya audit edilebilir
- `UNIQUE` constraint ile idempotent (worker tekrar çalışırsa overwrite)
- Retention sınırı yok (history korunur, ham event'ler 90 gün sonra silinse de skor kalır)

### 5.3 `public.drivers.threshold_*` (Phase 2 — additive)

**Karar verildi: Seçenek A — additive kolonlar** ✅ (2026-05-29, dispatcher UI'da speed limit gösterilmemesi schema kararını etkilemez — backend mimari kararı).

#### Schema (Phase 2 trigger geldiğinde apply)

```sql
-- ADR-0004 v3 §6 pattern: additive public.* migration
ALTER TABLE public.drivers
  ADD COLUMN threshold_accel       NUMERIC(4,2),  -- NULL = use vehicle default
  ADD COLUMN threshold_brake       NUMERIC(4,2),
  ADD COLUMN threshold_turn        NUMERIC(4,2),
  ADD COLUMN threshold_impact      NUMERIC(4,2),
  ADD COLUMN speed_limit_override  INTEGER;       -- km/h, NULL = use vehicle/HERE default
```

**Karar gerekçeleri:**
- `public.vehicles.threshold_*` paterniyle birebir simetrik — sistemde tutarlılık
- Type-safe, NULL semantics net (NULL = vehicle default'a düş)
- COALESCE ile resolve kolay: `COALESCE(driver.threshold_brake, vehicle.threshold_brake, 0.40)`
- ADR-0004 v3 §6 additive pattern legalize
- `speed_limit_override` kolonu schema'da kalır ama **dispatcher UI'da gösterilmez** — sadece backend skor hesabında ve admin/fleet manager Phase 2 config UI'sında kullanılır

**Yan etki:** ADR-0009 §4.1 grants matrix güncellemesi gerek — dispatcher backend için `public.drivers.threshold_*` SELECT-only (FN-08'in `public.vehicles.threshold_*` UPDATE izniyle birlikte UNCERTAINTIES #5'te birleşir).

#### Reddedilen alternatif — Seçenek B (`skills` JSONB)

`public.drivers.skills` JSONB içinde threshold tutulması değerlendirildi ama reddedildi: JSON path query karmaşıklığı, app-level validation yükü ve `vehicles.threshold_*` simetrisi kaybı, esneklik avantajıyla dengelenmedi.

### 5.4 `public.vehicles.threshold_*` — mevcut kullanılır

Mevcut 4 kolon (zaten production'da):
- `threshold_accel`, `threshold_brake`, `threshold_turn`, `threshold_impact`

FN-02 `processBehaviorSeverity` bu kolonları okur, firmware'in default'larını override eder. FN-08 `POST /api/dispatcher/vehicles/:id/thresholds` dispatcher panel'inden güncelleme yapar.

---

## 6. Shared infrastructure with previous FEAT'leri

| FEAT-007 fonksiyon | Shared with | Paylaşım türü |
|---|---|---|
| FN-01 onDriverBehaviorUpdate | **FEAT-005:FN-02** onVehicleLocationUpdate | Aynı MQTT subscriber pattern, sadece topic farklı (`/behavior` vs `/location`) |
| FN-03 calculateDriverSafetyScore | **FEAT-003:FN-06** calculateMatchingScore | Aynı weighted-sum-of-penalties matematiği (ADR-0010 §3.4 pattern) |
| FN-09 pushFeedbackToDriver | **FEAT-005:FN-08** broadcastEtaToDriver | İkisi de Phase 2, ADR-0009 §8 MQTT publish from enterprise pattern |

**Yeni özellik:** FN-08 dispatcher threshold endpoint — ilk kez dispatcher'a **public.vehicles üzerinde write** yetkisi tanıyor (önceki FEAT'lerde dispatcher sadece `enterprise.*` write, `public.*` SELECT-only idi). Bu **ADR-0009 §4.1 grants matrix**'ine eklenmeli (UNCERTAINTIES #5).

---

## 7. UNCERTAINTIES (Cem onayı bekleyen)

### NotebookLM'in tespit ettikleri

1. **Backend dedup penceresi:** Firmware ALERT_COOLDOWN = 5s. Backend FN-11 dedup window ne olmalı?
   - **Önerilen:** 5s (firmware ile senkron). Daha sıkı (örn. 10s) network gecikmesi pencereyi aşarsa duplicate'i yakalayamaz.
   - **Risk:** MQTT QoS 1 retry → aynı event 2 kez gelirse timestamp ± 1s'lik tolerans yeterli mi?

2. **Severity mapping per vehicle category:** Ham G eşik aşımı "low/medium/high" mapping aynı mı tüm vehicle category'lerde?
   - **Örnek:** Rigid Truck için 0.45G HARD_BRAKE belki "medium" (kütlesi yüksek, 0.45 zor). Van için "high" (daha agresif).
   - **Phase 1:** Statik mapping yeterli (firmware severity field'ı direkt kullanılır).
   - **Phase 2:** Dynamic mapping (vehicle_category bazlı tablo).

3. **Historical retention:** 90 gün TimescaleDB retention default önerildi. Doğru mu?
   - 90 gün → 4 araç × 100 event/gün × 90 = 36.000 row → ufak. Cost minimal.
   - **Alternatif:** 180 gün; sezonsal pattern (kış-yaz fark) analizi için faydalı olur.
   - Aggregate `driver_scores` zaten history korur — ham event 90 gün yeterli.

### Konsolidasyonda eklenen

4. **GPS kalitesi (HDOP) confidence weighting:** GPS_FIRMWARE_BEHAVIOR.md §5'te HDOP > 5 olan pozisyonların "şüpheli" olarak değerlendirilmesi öneriliyor.
   - **Soru:** HARD_BRAKE event'i HDOP > 5 olan bir konumda meydana gelirse:
     - (a) Event tamamen reddedilmeli mi? — Çok agresif, gerçek event'leri kaçırabilir
     - (b) Event severity bir kademe düşürülmeli mi? — "high" → "medium"
     - (c) Sadece raporlamada flag eklenmeli, skor hesabı normal? — En esnek
   - **Önerilen:** (c) — `behavior_events.hdop` field'ı saklanır, dispatcher panel'inde "low GPS quality" flag gösterilir, skor normal hesaplanır.

5. **ADR-0009 §4.1 grants matrix güncelleme:** FN-08 dispatcher'a `public.vehicles.threshold_*` üzerinde UPDATE yetkisi gerektirir.
   - Mevcut ADR-0009 §4.1 dispatcher backend için `public.vehicles SELECT` only.
   - **Aksiyon:** ADR-0009 §4.1'e addendum — `public.vehicles UPDATE (threshold_* columns only)` izni gerekir.
   - Veya: threshold güncellemesi tulipfleet-backend'e proxy edilir (cross-backend API call).
   - Bu **mimari karar** — Cem'in onayı şart.

6. **Driver-level threshold override schema (Phase 2):** Acemi sürücü için hassas eşik vs deneyimli sürücü için gevşek eşik.
   - **Phase 1 kararı:** Per-vehicle yeterli, driver bazlı YAPILMAZ. FN-13 stub mode (vehicle default döner).
   - **Phase 2 trigger:** `public.drivers.skills` veri olgunluğu veya customer talebi.
   - **Schema kararı: Seçenek A** (additive `threshold_*` kolonları) ✅ — vehicles paterniyle simetrik, COALESCE resolution kolay, type-safe.
   - **Hiyerarşi:** `getEffectiveThresholds` (FN-13) hep şu sırayla çözer: `driver.threshold_* > vehicle.threshold_* > firmware default`.

7. **Aggregation worker frequency:** `driver_scores` ne sıklıkta hesaplanır?
   - **Daily:** Her gece 02:00 (mevcut backup cron pencerelerine yakın)
   - **Real-time:** Her event'te incremental update — overkill Phase 1 için
   - **Önerilen:** Daily aggregation + dispatcher panel'i "şimdiye kadar bugün" sayımları için on-demand FN-03 çağırır

8. **Speed limit violation weight (FN-14 Phase 1.1):** SPEED_VIOLATION penalty ağırlığı ne olmalı?
   - **Karar: weight = 4** ✅ (HARD_TURN ile aynı seviye)
   - **Gerekçe:** Dispatcher UI'da speed limit gösterilmediği için event sadece arka planda coaching skoruna katkı verir; sade sabit weight yeterli.
   - **Tiered alternatif (5/10/20 km/h üstü):** Reddedildi — UI consumption yok, gereksiz karmaşıklık.
   - **Per-company override:** Phase 2'de gerekirse policy module ile eklenir.

9. **SPEED_VIOLATION `behavior_events` schema impact:** Yeni event_type firmware tarafından üretilmiyor — backend synthetic event.
   - **CHECK constraint:** `'SPEED_VIOLATION'` eklendi ✅ (§5.1)
   - **Karar: `metadata` JSONB + `g_force = 0`** ✅
   - **Gerekçe:** Dispatcher UI SPEED_VIOLATION detayını göstermez, sadece admin leaderboard/aggregate sayım kullanır. Yeni kolon (`speed_delta_kmh`) gereksiz.
   - **metadata payload:** `{ legal_limit_kmh, actual_speed_kmh, delta_kmh, here_road_segment_id }`
   - **Reddedilen alternatif:** `g_force NUMERIC NOT NULL` constraint relaxation + yeni `speed_delta_kmh` kolonu — UI consumption olmadığı için over-engineering.

10. **HERE Get Speed Limits cost (FN-14):** Her location update'inde HERE API call → maliyet patlaması?
    - **Karar: Redis cache 24h TTL + nightly batch refresh + soft cost ceiling** ✅
    - **Gerekçe:** Dispatcher UI'da speed limit gösterilmediği için real-time accuracy critical değil. 1 günlük cache yeterli.
    - **Cache key:** `enterprise:speed_limit:{road_segment_id}` → `legal_limit_kmh`
    - **Refresh strategy:** Aktif görev olan vehicle'ların güzergahları için nightly batch (FEAT-001 MatrixCache paterniyle paralel)
    - **Fallback (cache miss):** Vehicle default speed limit veya `speed_limit_override` kullan; event üretme (yanlış pozitif önlemek için)
    - **Cost ceiling:** Dispatcher backend HERE budget'ında soft slice (örn. ayda <€50). HERE Routing Sandbox testinde (ROADMAP Sıra 3) tier doğrulanır.

---

## 8. Pilot süreç notları

### 8.1 Pilot akışı (2026-05-29)

Tek prompt + 0 follow-up. NotebookLM'e iki yeni kaynak yüklendi:
- `ADXL345_FIRMWARE_BEHAVIOR_DETECTION.md` (firmware behavior + scoring guidance)
- `GPS_FIRMWARE_BEHAVIOR.md` (location pipeline context)

NotebookLM bu kaynakları **kullanmadı GPS tarafında** — UNCERTAINTIES'e konsolidasyonda elle eklendi (HDOP confidence).

### 8.2 Alıntı doğrulama — 5 sorun

| # | NotebookLM | Gerçek | Sorun |
|---|---|---|---|
| 1 | ADR-0010 §2 (FN-03) | §3.4 | Section yanlış |
| 2 | ADR-0010 §2 (FN-08) | §3.4 | Section yanlış |
| 3 | ADR-0009 §8 (FN-09) | §8 doğru, **alıntı parafrazlanmış** | Cümle birebir değil — "(Phase 2+)" eklenmiş, gerçekte "(per ADR-0005)" |
| 4 | ADR-0011 §5 FEAT-009 (FN-10) | §5'te FEAT-009 var ama alıntı zayıf bağlantı | Daha doğru ref §9.5 (admin endpoint patterns) |
| 5 | ADXL345_FIRMWARE §5 (FN-02) | ✅ Doğru | — |

**Pattern:** NotebookLM ADR-0009 §8'i hem FEAT-005-FN-08'de hem FEAT-007-FN-09'da aynı parafrazlanmış alıntıyla tekrarlamış. **Bu sistemik bir hata** — defterde §8 cümlesi parafraz olarak indekslenmiş olabilir. Cross-spec sync'te FEAT-005 spec'i de düzeltilmeli (yeni TODO).

### 8.3 7 pilot karşılaştırma

| Boyut | F1 | F2 | F3 | F4 | F5 | F6 | **F7** |
|---|---|---|---|---|---|---|---|
| Skor | 9 | 9.5 | 9 | 9 | 8.5 | 9 | **8.5** |
| İterasyon | 5 | 3 | 2 | 1+1 | 1+3 | 1 | **1 + extension (1)** |
| Fonksiyon | 16 | 16 | 16 | 12 | 12 | 10 | **14** (11 base + 3 extension) |
| Alıntı hatası | 1 | 1 | 1 | 0 | 1 | 1 | **6** (5 base + 1 extension) |
| Yeni paradigma | VRP | Re-route | Dispatch | Multi-actor | HERE consume | Task duration | **Rule-based coaching + firmware integration + Driver override hierarchy** |

**Bayrak — alıntı kalitesi düştü.** F7'de yeni kaynak (firmware md) eklendi → NotebookLM dağıldı mı? Hipotez: kaynak sayısı arttıkça ADR section adresleme karışıyor. Sonraki pilotlar için (FEAT-008+) **alıntı kuralını prompt'ta tekrar vurgulamak** gerekebilir.

### 8.4 Cross-spec sync — FEAT-005 yeni TODO

NotebookLM aynı yanlış ADR-0009 §8 alıntısını **iki spec'te** kullanmış. FEAT-005-FN-08 düzeltilmeli:
- **Eski:** `"MQTT publish from enterprise backend — for direct vehicle commands and approved dispatch confirmations (Phase 2+)"`
- **Yeni:** `"MQTT publish from enterprise backend — for direct vehicle commands in Mode 2/3 dispatch (per ADR-0005)."`

### 8.5 Extension pilot notu (driver override + speed limit)

İlk pilot çıktısından sonra Cem'in "sürücü bazlı eşik ve hız limiti" sorusu üzerine **ikinci NotebookLM round'u** yapıldı. Çıktı:

- **FN-12** POST driver thresholds (Phase 2)
- **FN-13** getEffectiveThresholds shared library (Phase 2, hiyerarşi resolver)
- **FN-14** checkSpeedLimitViolation (NotebookLM Phase 1 dedi → **konsolidasyonda Phase 1.1**'e taşındı — HERE Get Speed Limits API cost endişesi)

NotebookLM'in extension çıktısı tek prompt'ta üretildi, kalite ilk pilot ile aynı:
- 1 yeni alıntı hatası (FN-12 ADR-0010 §2 → §3.4) — aynı stabil pattern
- 3 yeni fonksiyon mantıksal olarak yerli yerine oturdu
- FN-03 imza evrimi (effectiveThresholds parametresi eklendi) — breaking change değil, FEAT-006 paterniyle aynı forward-compat

Bu **NotebookLM'in olgunlaşma örneği** — Cem'in sorusunu doğru kapsamda yorumladı, mevcut spec'le uyumlu fonksiyonlar üretti.

---

## 9. Next steps

### 9.1 Cross-spec sync (commit öncesi/sonrası)

- **FEAT-005 spec güncellemesi:** FN-08 ADR-0009 §8 alıntısı birebir cümleye düzeltilmeli
- **FEAT-001 + FEAT-005 FEAT-006 etkileri:** Dünden kalan TODO (FN-016, FN-03 future evolution notları)

### 9.2 Phase 1 implementation backlog

ROADMAP'e Sıra 8+ olarak eklenebilir (Phase 1.x):

- [ ] Schema migration: `enterprise.behavior_events` + `enterprise.driver_scores` (`tulipfleet-backend/migrations/`)
- [ ] FN-01 MQTT subscriber worker (`fleet/device/+/behavior`)
- [ ] FN-02 processBehaviorSeverity utility
- [ ] FN-03 calculateDriverSafetyScore shared library (FEAT-003 ile shared infra, effectiveThresholds parametresiyle)
- [ ] FN-04 GET dispatcher behavior endpoint
- [ ] FN-05 GET admin leaderboard endpoint
- [ ] FN-06 `<BehaviorTimeline />` React component
- [ ] FN-07 `<SafetyLeaderboard />` React component
- [ ] FN-08 POST threshold update endpoint + ADR-0009 §4.1 grants addendum
- [ ] FN-10 generateAggregateSafetyReport
- [ ] FN-11 deduplicateBehaviorEvents utility
- [ ] FN-13 getEffectiveThresholds **stub mode** (vehicle default döner, driver kısmı Phase 2'de aktive)
- [ ] Nightly aggregation worker (driver_scores)

### 9.3 Phase 1.1 implementation (Speed limit)

- [ ] FN-14 checkSpeedLimitViolation
- [ ] HERE Get Speed Limits API entegrasyonu + Redis cache (UNCERTAINTIES #10)
- [ ] `behavior_events.event_type` CHECK constraint genişletme (`SPEED_VIOLATION` ekle)
- [ ] `g_force` → nullable, `speed_delta_kmh` kolonu ekleme (schema kararı UNCERTAINTIES #9)
- [ ] Per-vehicle `speed_limit_override` config

### 9.4 Phase 2 implementation

- [ ] FN-09 pushFeedbackToDriver (Mobile app değişikliği koordineli)
- [ ] **FN-12 POST driver thresholds endpoint**
- [ ] **FN-13 getEffectiveThresholds driver override aktive** (stub'tan production'a)
- [ ] **`public.drivers.threshold_*` + `speed_limit_override` migration** (Schema seçeneği A — UNCERTAINTIES #6 onayı sonrası)
- [ ] Per-company weight configuration (policy module)
- [ ] Severity dynamic mapping (vehicle_category bazlı)

### 9.5 Sıradaki pilot

**FEAT-008 — Vrachtwagenheffing route cost optimization.** ROADMAP Phase 1.1'de zaten listelenmiş. Schema `enterprise.nl_vrachtwagenheffing_tariffs` Sıra 2.9.3'te applied. Temmuz 2026'da Vrachtwagenheffing live olunca activate edilecek. NotebookLM pilot konusu: route cost integration mantığı (FEAT-001 buildHereProblem ile shared, HERE Tour Planning'e tariff cost matrix nasıl enjekte edilir).

---

## 10. References

- ADR-0001 §3.6 (UI primitives — MUI, React Table)
- **ADR-0009 §4.2** (MQTT topic ACL — `fleet/device/+/behavior` read-only)
- **ADR-0009 §8** (Phase Boundaries — Mode 2/3 MQTT publish from enterprise)
- ADR-0010 §3.3 (driver behavior anomaly detection out-of-scope in Phase 1-2)
- **ADR-0010 §3.4** (Avoiding terminology drift — "weighted sum of constraint penalties. No learning.")
- ADR-0010 §3.5 (rule-based thresholds Phase 1 baseline, ML Phase 3 candidate)
- ADR-0011 §9.5 (Phase 1 endpoint patterns)
- FEAT-003 spec (FN-06 weighted sum pattern shared)
- FEAT-005 spec (FN-02 MQTT subscriber pattern shared; FN-08 ADR-0009 §8 alıntısı düzeltme TODO)
- `ADXL345_FIRMWARE_BEHAVIOR_DETECTION.md` (firmware behavior, scoring guidance, ML boundary)
- `GPS_FIRMWARE_BEHAVIOR.md` (location pipeline context, HDOP quality)
- NotebookLM session 2026-05-29 (1 prompt, 8.5/10 skor, 5 alıntı düzeltmesi)

---

## 11. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-29 | Cem Bakir (with Claude + NotebookLM cowork) | İlk konsolide function spec. Yedinci pilot — rule-based driver coaching, firmware (ADXL345) entegrasyonu. 11 fonksiyon (FN-01..FN-11). Phase 1: 10 fonksiyon, Phase 2: 1 fonksiyon (driver mobile push). 5 alıntı düzeltmesi: §2→§3.4 (FN-03), §2→§3.4 (FN-08), §8 alıntı birebir cümleye (FN-09), §5 FEAT-009→§9.5 endpoint patterns (FN-10), ADXL345 §5 doğru (FN-02). Yeni iki tablo (TimescaleDB hypertable): `enterprise.behavior_events`, `enterprise.driver_scores`. Cross-spec sync TODO: FEAT-005-FN-08 ADR-0009 §8 alıntısı aynı şekilde düzeltilmeli. ML disipline check ADR-0010 §3.3 + §3.4 + §3.5 birebir uyumlu. Yeni cross-spec etki: FN-08 dispatcher'a `public.vehicles.threshold_*` UPDATE izni gerek → ADR-0009 §4.1 grants matrix güncellemesi (UNCERTAINTIES #5). |
| 2 | 2026-05-29 | Cem Bakir (with Claude + NotebookLM extension round) | **Driver-level threshold override + speed limit violation eklendi.** 3 yeni fonksiyon: FN-12 POST driver thresholds (Phase 2), FN-13 getEffectiveThresholds shared library (Phase 2, Driver Override > Vehicle Default > Firmware default hiyerarşisi), FN-14 checkSpeedLimitViolation (Phase 1.1, HERE Get Speed Limits consumer). FN-03 calculateDriverSafetyScore imzası `effectiveThresholds` parametresi alacak şekilde forward-compatible olarak genişletildi. Yeni schema (Phase 2): `public.drivers.threshold_*` + `speed_limit_override` additive kolonlar (Seçenek A önerildi, Seçenek B JSONB alternatif). `behavior_events.event_type` CHECK genişletildi (`SPEED_VIOLATION` eklendi). Yeni 4 UNCERTAINTIES (#6 schema seçimi, #8 speed weight, #9 SPEED_VIOLATION schema impact, #10 HERE cost). 6. alıntı düzeltmesi: FN-12 ADR-0010 §2 → §3.4 (aynı stabil hata). Pilot trend: NotebookLM extension round'unda kalite ilk pilot ile aynı, mantıksal entegrasyon temiz. |
| 3 | 2026-05-29 | Cem Bakir | **4 UNCERTAINTIES karara bağlandı.** Cem'in netleştirmesi: "dispatcher kullanımında sürat limitlerinin görünmesine gerek yok". Bu kapsam kararıyla 4 karar verildi: #6 Schema **Seçenek A** (additive `public.drivers.threshold_*` + `speed_limit_override` kolonları); #8 SPEED_VIOLATION **weight = 4 sabit** (tiered scheme reddedildi — UI consumption yok, sade scoring yeterli); #9 SPEED_VIOLATION schema **metadata JSONB + g_force=0** (yeni `speed_delta_kmh` kolonu reddedildi — over-engineering); #10 HERE cost **Redis 24h cache + nightly batch refresh + soft ceiling** (real-time accuracy critical değil çünkü UI'da gösterilmiyor). §5.3 ve §7 ilgili maddeler "karar verildi" notuyla kapatıldı, Seçenek B / tiered weight / yeni kolon alternatifleri reddedilenler olarak kısaca belgelendi. Kalan açık karar: UNCERTAINTIES #5 (ADR-0009 §4.1 grants matrix dispatcher → public.vehicles/drivers UPDATE) — bu hala mimari onay bekliyor. |
