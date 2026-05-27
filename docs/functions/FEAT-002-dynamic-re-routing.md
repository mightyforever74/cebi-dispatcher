# FEAT-002 — Dynamic In-Day Re-routing

| Field | Value |
|---|---|
| **Feature ID** | FEAT-002 |
| **Source** | Feature Wishlist #2 — "Dynamic In-Day Re-routing" |
| **Frequency rating** | Common (industry-wide) |
| **Tulipfleet Phase** | Phase 1 (manuel re-plan) + Phase 2 (FEAT-104 trafik-triggered) |
| **Status** | Function spec drafted via NotebookLM (3 prompt iterations, 2026-05-27) |
| **Pilot note** | İkinci pilot — FEAT-001 ile büyük ölçüde shared infrastructure. 9.5/10 skoruyla kapatıldı. |

---

## 1. Feature description

> *"Dynamic In-Day Re-routing: This use case involves automatic adjustment of live tours and stop sequences to handle sudden disruptions like accidents, road closures, or last-minute customer unavailability."*

Bu feature **FEAT-001'in kardeşi** ama farklı bir kullanım senaryosu:

| Boyut | FEAT-001 | FEAT-002 |
|---|---|---|
| Tetikleyici | Dispatcher butonu (sabah) | Event (traffic, weather, customer cancel) |
| Veri kaynağı | Bütün gün planı | Aktif tour state + live event |
| HERE kullanımı | Full Tour Planning | Partial re-plan (tek vehicle veya bölge) |
| Sürücü etkisi | Yeni gün başlangıcı | Mevcut yolculukta değişiklik |
| Frequency | Plan onayı sırasında | Sürekli, real-time |

**Phase ayrımı (ADR-0011 disiplini):**

- **Phase 1 (MVP):** Manuel re-plan — dispatcher butonu, tek tour yeniden hesaplama (ADR-0011 §9.5 `POST /api/dispatcher/plans/:id/replan` zaten endpoint'i tanımlı)
- **Phase 2 (Customer-funded trigger):** **FEAT-104 — "Trafik-triggered automatic re-routing"** (ADR-0011 §6) — event-driven otomatik re-plan, ADR-0007 connector pattern. Phase 1'de **schema-ready/forward-compatible** olarak hazırlanır, kod path'i kapalı kalır.

**Kapsam — içeride:**
- `tulipfleet-enterprise-backend` (Fastify v4) endpoint + worker
- `tulipfleet-dispatcher` React UI bileşenleri
- `enterprise.routing_jobs` (mevcut), `enterprise.dispatch_tasks` (mevcut)
- EMQX MQTT subscriber (`fleet/device/+/location`)
- HERE Tour Planning re-plan + HERE Traffic API (Phase 2)

**Kapsam — dışarıda:**
- Driver mobile app (mevcut task pickup akışı kullanılır)
- Yeni MQTT broker konfigürasyonu (ADR-0009 §4.2 mevcut topic'ler yeterli)
- ESP32 firmware değişikliği (telemetri tarafı dokunulmaz)

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Phase | Shared with FEAT-001? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FEAT-002-FN-01 | frontend | `<ReplanButton />` | planId: UUID | UI Component | — | — | — | ADR-0011 §9.5 — "POST /api/dispatcher/plans/:id/replan — FEAT-004 manuel re-plan" | 1 | — |
| 2 | FEAT-002-FN-02 | backend | `POST /api/dispatcher/plans/:id/replan` | id, (JWT.company_id) | { jobId } | public.vehicles | enterprise.routing_jobs | — | ADR-0011 §9.5 — "POST /api/dispatcher/plans/:id/replan — FEAT-004 manuel re-plan" | 1 | — |
| 3 | FEAT-002-FN-03 | backend | `getCurrentVehicleContext` | vehicleId | CurrentContext | public.locations | — | — | ADR-0007 §5.3 — "In Phase 1, the normalization is a trivial identity transform from TulipFleet's MQTT payloads." | 1 | — |
| 4 | FEAT-002-FN-04 | backend | `MatrixCache.get` | locations: LatLng[] | Matrix | Redis | Redis | HERE Matrix | ADR-0002 §5 — "MatrixCache — caches Distance Matrix responses (Redis, 24-hour TTL) to control per-request cost." | 1 | **FN-008** |
| 5 | FEAT-002-FN-05 | backend | `checkCompliance` | route, (JWT.company_id) | CompResult | enterprise.nl_compliance_zones | — | — | ADR-0012 §3.1 — "Plan generation sırasında compliance check otomatik tetiklenir" | 1 | **FN-012** |
| 6 | FEAT-002-FN-06 | backend | `buildHereReplanProblem` | liveData, tasks, complianceZones | HERE_JSON | public.vehicles, enterprise.dispatch_tasks | — | — | ADR-0002 §3.4 — "Hard constraints (HERE will not produce a route violating these): Vehicle capacity... Driver shift hours... Avoidance areas" | 1 | partial: FN-016 (farklı problem semantiği) |
| 7 | FEAT-002-FN-07 | shared_library | `IRoutingProvider.submitPlan` | problem: JSON | { jobId } | — | — | HERE Tour Planning | ADR-0002 §5 — "internal TypeScript interface defining submitPlan(input), pollStatus(jobId), fetchResult(jobId)." | 1 | **FN-007** |
| 8 | FEAT-002-FN-08 | worker | `pollRoutingJobStatus` | jobId | void | enterprise.routing_jobs | enterprise.routing_jobs | HERE Tour Planning | ADR-0002 §6 — "Poll status from a worker, not from the request thread." | 1 | **FN-010** |
| 9 | FEAT-002-FN-09 | worker | `onLiveLocationUpdate` | MQTT_Payload | void | — | public.locations | EMQX | ADR-0009 §4.2 — "Existing fleet/device/+/location... topics are read by both backends" | 1 | — |
| 10 | FEAT-002-FN-10 | worker | `trafficTriggerDetector` | LiveTrafficData | Alert | — | — | HERE Traffic | ADR-0011 §6 — "FEAT-104 'Trafik-triggered automatic re-routing'" | **2** | — |
| 11 | FEAT-002-FN-11 | backend | `calculateEtaDeviation` | actual, planned | Deviation | enterprise.dispatch_tasks | — | — | ADR-0011 §5 — "FEAT-003 — Predictive ETA with Live Traffic" | 1 | — |
| 12 | FEAT-002-FN-12 | backend | `GET /api/dispatcher/alerts` | (JWT.company_id) | Alert[] | enterprise.routing_jobs | — | — | ADR-0005 §5.2 — "The dispatcher is notified of exceptions: rule violations, ambiguous matches, high-value tasks..." | **2** | — |
| 13 | FEAT-002-FN-13 | frontend | `<NotificationToast />` | alertId | UI Component | — | — | — | ADR-0005 §5.2 — "The dispatcher is notified of exceptions: rule violations, ambiguous matches, high-value tasks..." | **2** | — |
| 14 | FEAT-002-FN-14 | shared_library | `upsertRoutingJob` | jobData: JSON | Row | — | enterprise.routing_jobs | — | ADR-0002 §6 — "Persist job_id to enterprise.routing_jobs immediately on submission." | 1 | **FN-011** |
| 15 | FEAT-002-FN-15 | shared_library | `POST /api/dispatcher/plans/:id/approve` | jobId, (JWT.company_id) | Success | enterprise.routing_jobs | public.tasks | — | ADR-0005 §7 — "POST /api/dispatcher/plans/:id/approve — commit approved plan to dispatch tasks." | 1 | **FN-013** (FEAT-001'in approve endpoint'i yeniden kullanılır) |
| 16 | FEAT-002-FN-16 | backend | `MatrixCache.invalidate` | area: Polygon | void | — | Redis | — | ADR-belirsiz (yol kapaması durumunda cache temizliği için yeni gereksinim) | 1 | — |

**Konsolidasyon notu — FN-15:** Bu endpoint FEAT-001'in FN-013'üyle **aynı endpoint**. FEAT-002 spec'inde listelenmesi dokümantasyon kolaylığı için (re-plan akışının approve adımı görünür olsun). Implementation tek bir endpoint — FEAT-001 spec'i ana referans.

---

## 3. Re-plan trigger chain (Phase 1 manuel)

Dispatcher manuel "Replan Now" butonuna bastığında akış:

```
<ReplanButton />                            (FN-01)
        ↓
POST /api/dispatcher/plans/:id/replan       (FN-02)
        ↓
getCurrentVehicleContext                    (FN-03)
   └─ Live position from public.locations
        ↓
calculateEtaDeviation                       (FN-11)
   └─ Mevcut tour'un ETA sapmasi
        ↓
checkCompliance                             (FN-05) [FRESH check — see §4]
   └─ Reads enterprise.nl_compliance_zones (güncel polygonlar)
   └─ Per-vehicle avoidance decision
        ↓
MatrixCache.get                             (FN-04)
   └─ Redis 24h TTL (FEAT-001 FN-008 ile shared)
        ↓
buildHereReplanProblem                      (FN-06)
   └─ Reads public.vehicles + enterprise.dispatch_tasks
   └─ Injects avoidAreas + liveData + remaining tasks
        ↓
IRoutingProvider.submitPlan                 (FN-07) [FEAT-001 FN-007 shared]
        ↓
upsertRoutingJob                            (FN-14) [FEAT-001 FN-011 shared]
        ↓
pollRoutingJobStatus                        (FN-08) [FEAT-001 FN-010 shared, async worker]
        ↓
        (status: completed)
        ↓
Dispatcher reviews replan proposal (UI)
        ↓
POST /api/dispatcher/plans/:id/approve      (FN-15) [FEAT-001 FN-013 shared endpoint]
        ↓
enterprise.dispatch_tasks updated + public.tasks bridge
```

**Phase 1 zincirinin 9 adımından 6'sı FEAT-001 ile shared infrastructure.** Re-plan kendi başına yeni mantık değil — mevcut routing pipeline'ın **partial trigger**'ı.

---

## 4. Compliance chain delta (FEAT-001 → FEAT-002)

ADR-0012 §3.1 + bizim §3.1 addendum'umuza göre compliance check **request time'da, fresh** çalışır. FEAT-001'den farkı:

| Aşama | FEAT-001 | FEAT-002 |
|---|---|---|
| Tetik zamanı | Plan generation (sabah, statik) | Re-plan (gün içi, dinamik) |
| Vehicle position | Depot başlangıç | **Live** (FN-03 getCurrentVehicleContext) |
| Tasks | Tüm günlük task listesi | **Remaining tasks** (tamamlananlar dışlanmış) |
| Compliance polygon kaynak | enterprise.nl_compliance_zones | **Aynı tablo, taze read** (cached değil) |
| Avoidance area decision | Per-vehicle, plan başında | **Per-vehicle, live position bazlı** |

**Karar:** Re-plan sırasında `checkCompliance` **her zaman fresh** çalışır — cached compliance kararı yeniden kullanılmaz. Sebep: dispatcher yolda iken bir ZE-zone aktif olmuş olabilir (effective_from geçmiş), veya ontheffing süresi bitmiş olabilir.

> Bu karar **ADR-0012'de explicit yazılı değil**, ancak ADR-0012 §3.1 addendum'umuzdaki *"request time'da üretir; worker time'da değil"* kuralının doğal sonucu.

---

## 5. Event trigger sources

### Phase 1 (Manuel) — MVP

Tek tetikleyici: Dispatcher React UI üzerindeki **"Replan Now"** butonu (`<ReplanButton />`). Endpoint: `POST /api/dispatcher/plans/:id/replan` (ADR-0011 §9.5'te zaten tanımlı, FEAT-004 manuel re-plan).

### Phase 2 (Otomatik — FEAT-104 customer-funded)

Schema-ready ama kod path'i kapalı. Aktive olunca üç event source:

1. **MQTT (Live Location):** Araç lokasyonunun planlanan rotadan **%X sapması**
   - Subscriber: `onLiveLocationUpdate` (FN-09)
   - Eşik %X dispatcher konfigürasyonu (Phase 2 müşteri demand'ına göre)

2. **HERE Traffic API:** Rota üzerindeki kaza/kapanma **delay flag** eşik aşımı
   - Detector: `trafficTriggerDetector` (FN-10)
   - Polling veya webhook (HERE Traffic API capability'sine bağlı)

3. **Customer webhook:** Son dakika sipariş iptali / müşteri uygunsuzluğu
   - Webhook endpoint: Phase 2'de eklenecek (`POST /api/webhooks/customer-cancel`)
   - Authentication: HMAC signature veya API key (ADR-0012 §4 auth abstraction)

**Eşik mantığı (Phase 2 default'lar — Cem onayı bekliyor):**
- Location sapması: ≥%15 deviation veya >5 dk delay
- HERE traffic delay: >10 dk delay flag
- Customer cancel: anlık tetik

---

## 6. Database tables — yeterli mi?

ADR-0011 §9.3 ve ADR-0004 v2'nin sağladığı mevcut tablolar **Phase 1 + Phase 2 için yeterli**:

| Tablo | Kullanım | Yeterli mi? |
|---|---|---|
| `enterprise.routing_jobs` | Re-plan job state + result | ✅ `request_payload` jsonb + `source` jsonb esnek |
| `enterprise.dispatch_tasks` | Aktif tour state + remaining tasks | ✅ |
| `enterprise.nl_compliance_zones` | Fresh compliance check | ✅ Sıra 2.9.2'de production'a uygulandı |
| `public.locations` | Live vehicle position | ✅ Mevcut TimescaleDB hypertable |
| `public.vehicles` | Vehicle profile + capacity | ✅ Phase 1.1 capacity columns gelecek (ADR-0004 v3 §6.4) |

### Phase 2 önerisi (eklenebilir)

Phase 2 müşteri trigger edildiğinde:
```sql
-- Opsiyonel, FEAT-104 aktive olunca değerlendirilir
CREATE TABLE enterprise.replan_alerts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    UUID NOT NULL REFERENCES public.companies(id),
    tour_id       UUID NOT NULL,
    trigger_type  TEXT NOT NULL CHECK (trigger_type IN ('mqtt_deviation', 'traffic_delay', 'customer_cancel')),
    trigger_data  JSONB NOT NULL,
    routing_job_id UUID REFERENCES enterprise.routing_jobs(id),
    severity      TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES public.users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

ADR-0012 §1.6 audit log niyetiyle paralel pattern. **Şu an gerek yok**, Phase 2 trigger geldiğinde değerlendirilir.

---

## 7. Shared infrastructure with FEAT-001

| FEAT-002 fonksiyon | FEAT-001 fonksiyon | Paylaşım türü |
|---|---|---|
| FN-04 MatrixCache.get | FN-008 MatrixCache.get | **Birebir** (aynı kod) |
| FN-05 checkCompliance | FN-012 checkCompliance | **Birebir** |
| FN-06 buildHereReplanProblem | FN-016 buildHereProblem | **Partial** — re-plan farklı problem semantiği (remaining tasks vs full task list) |
| FN-07 submitPlan | FN-007 submitPlan | **Birebir** (IRoutingProvider interface) |
| FN-08 pollRoutingJobStatus | FN-010 pollRoutingJobStatus | **Birebir** (worker pattern) |
| FN-14 upsertRoutingJob | FN-011 upsertRoutingJob | **Birebir** |
| FN-15 approve endpoint | FN-013 approve endpoint | **Birebir** (aynı endpoint) |

**Sonuç:** FEAT-002'nin 16 fonksiyonundan **7'si FEAT-001 ile birebir veya partial shared**. Yeni geliştirme sadece **9 fonksiyon** (FN-01, FN-02, FN-03, FN-06 partial, FN-09, FN-10, FN-11, FN-12, FN-13, FN-16). Implementation effort tahmini: FEAT-001'in **~%55-65'i**.

---

## 8. UNCERTAINTIES (Cem onayı bekleyen)

### NotebookLM çıktısından

1. **HERE Avoidance Area Limit:** Re-plan sırasında dinamik eklenen "avoidance area" poligonlarının HERE Tour Planning tarafındaki **sayısal limiti** ve performans etkisi? Çok sayıda küçük polygon (5+ ZE-zone + 2-3 trafik bölgesi) tek request'te kabul ediliyor mu?
2. **Re-routing Onay Penceresi:** Phase 2'de (FEAT-104 otomatik atanan) bir rotanın dispatcher tarafından geri alınabilmesi için **revert grace period** (örn: 5-30 dk?). ADR-0005 §5.3'te bahsedilir ama default değer yok.
3. **Sürücü Etkileşimi:** Re-plan onaylandığında sürücünün değişikliği **reddetme yetkisi** var mı? Mola yönetimi kuralları otomatik mi hesaplanır?

### Pilot süreçte tespit edilen

4. **MatrixCache invalidation strategy:** FN-16 `MatrixCache.invalidate(area: Polygon)` — ADR-0002 §5 cache TTL diyor ama **invalidation triggers** yok. Yol kapamasında o bölgenin matrix değerleri eskiyor — manual mi triggered mi belirsiz.
5. **Customer webhook authentication:** Phase 2 customer cancel webhook'unun nasıl auth edileceği belirsiz. ADR-0012 §4 auth abstraction kullanılır ama spesifik şema yok.
6. **Live position deviation threshold:** Phase 2'de "%X sapması" trigger'ı — X kaç olmalı? Dispatcher konfigürasyonu mu, global default mu?

---

## 9. Pilot süreç notları

### 9.1 Pilot akışı (2026-05-27)

3 NotebookLM iterasyonu:
1. **İlk çıktı:** 16 fonksiyon, alıntı disiplini uygulanmış, Phase 1/2 ayrımı doğru, FEAT-001 shared kolonu doldurulmuş. 4 küçük eksiklik (FN-06 reads from boş, FN-03 EMQX yanlış, FN-15 redundant, FN-11 ADR ref). Skor 9/10.
2. **v2 düzeltme prompt:** FN-06 reads from + FN-11 §5'e taşıma yapıldı. FN-03 EMQX hâlâ duruyor. Skor 9.2/10.
3. **v3 final:** FN-03 EMQX temizlendi, FN-06 reads from `public.vehicles, enterprise.dispatch_tasks` tam doldu. Skor 9.5/10.

### 9.2 Alıntı doğrulama (spot check)

| Reference | Test sonucu |
|---|---|
| ADR-0011 §9.5 (replan endpoint) | ✅ Birebir doğrulandı |
| ADR-0007 §5.3 (trivial identity transform) | ✅ Birebir doğrulandı |
| ADR-0002 §3.4 (Hard constraints) | ✅ **Bu bizim 2026-05-27 addendum'umuz!** NotebookLM yakaladı ve doğru alıntıladı — addendum'un işe yaradığının kanıtı |
| ADR-0009 §4.2 (MQTT topic access) | ⚠️ Hafif parafraz (tablo metni cümleye dönüştürülmüş, anlam doğru) |
| ADR-0011 §6 (FEAT-104) | ✅ Doğru kategori |
| ADR-0005 §5.2 (exception notifications) | ⚠️ Doğrulanmadı, alıntı plausible |
| ADR-0005 §7 (approve endpoint) | ✅ Önceki turlarda doğrulandı |

7'den 5 doğrulandı, 2 hafif şüpheli. **Fabrikasyon yok**, alıntı disiplini stabil.

### 9.3 FEAT-001 + FEAT-002 cross-feature learning

FEAT-002 pilotu **FEAT-001'in addendum'larından besleniyor:**
- ADR-0002 §3.4 (dün yazıldı) FN-06'da alıntılandı
- ADR-0012 §3.1 (compliance check trigger) §3.1 addendum'umuzla uyumlu kullanıldı

Bu, ADR addendum'larının **karşılıklı feature spec'leri zenginleştirdiğini** gösteriyor. Gelecek FEAT-003..FEAT-031 için her yeni FEAT'in ADR'lere **mini bir feedback loop** sağlaması beklenir.

---

## 10. Next steps

### 10.1 FEAT-002 implementation öncesi

- [ ] FEAT-001 implementation tamamlanmadan başlanmamalı (shared infrastructure %44 oranında)
- [ ] HERE per-vehicle avoidance docs research (ADR-0012 §9 Open Question — FEAT-001 ile ortak)
- [ ] HERE avoidance area numeric limit araştırması (yeni Open Question — UNCERTAINTIES #1)

### 10.2 FEAT-002 implementation backlog (Phase 1)

ROADMAP Sıra 6 dispatcher endpoints kapsamında:
- FN-01 `<ReplanButton />`, FN-13 `<NotificationToast />` (Phase 2)
- FN-02 `POST /api/dispatcher/plans/:id/replan`
- FN-03 getCurrentVehicleContext
- FN-06 buildHereReplanProblem
- FN-09 onLiveLocationUpdate (worker — EMQX subscriber)
- FN-11 calculateEtaDeviation
- FN-16 MatrixCache.invalidate

### 10.3 Phase 2 forward-compatibility kontrol listesi

Phase 1 implementation sırasında **kod path'i kapalı ama schema açık** olarak hazırlanacaklar:
- `enterprise.replan_alerts` tablosu — DDL hazırlanır ama migration apply edilmez (FEAT-104 trigger'da)
- `trafficTriggerDetector` worker — interface tanımlanır, instantiate edilmez
- `GET /api/dispatcher/alerts` endpoint — şema route registered ama 501 Not Implemented döner

### 10.4 FEAT-003 pipeline

FEAT-003 = "Smart Auto-Dispatch" (wishlist #3) — FEAT-001 ve FEAT-002'den **ayrı paradigma** (on-demand order matching). Bir sonraki pilot bunu işler.

---

## 11. References

- ADR-0001 (Dispatcher UI Stack)
- ADR-0002 §3.4 (Constraint hierarchy — bizim 2026-05-27 addendum'umuz)
- ADR-0005 (Dispatch workflow — Mode 1 Advisory)
- ADR-0007 (Telematics integration — MQTT normalization pattern)
- ADR-0009 §4.2 (MQTT topic access — dispatcher read-only)
- ADR-0011 §6 (FEAT-104 trafik-triggered Phase 2)
- ADR-0011 §9.5 (POST /api/dispatcher/plans/:id/replan)
- ADR-0012 §3.1 (Compliance check trigger + bizim addendum)
- FEAT-001 spec (docs/functions/FEAT-001-multi-vehicle-vrp.md) — shared infrastructure source
- NotebookLM 3-iteration session (2026-05-27)

---

## 12. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-27 | Cem Bakir (with Claude + NotebookLM cowork) | İlk konsolide function spec. İkinci pilot — FEAT-001 ile shared infrastructure %44 oranında. Phase 1 (manuel re-plan) + Phase 2 (FEAT-104 forward-compatible). 16 fonksiyon (FN-01..FN-16). |
