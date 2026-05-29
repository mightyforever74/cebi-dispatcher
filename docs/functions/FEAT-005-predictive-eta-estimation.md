# FEAT-005 — Predictive ETA Estimation

| Field | Value |
|---|---|
| **Feature ID** | FEAT-005 |
| **Source** | Feature Wishlist #5 — "Predictive ETA Estimation" |
| **Frequency rating** | Very common (industry-wide) |
| **Tulipfleet Phase** | Phase 1 (dispatcher) + Phase 2 (driver push + customer-facing) |
| **HERE coverage** | ADR-0011 §8.1 — **HERE Native** ("Predictive ETA with live traffic — FEAT-003") |
| **Status** | Function spec drafted via NotebookLM (1 prompt + 3 follow-up Q&A, 2026-05-27) |
| **Pilot note** | Beşinci pilot. HERE consumer disiplini test geçti. 12 fonksiyon ana liste; Weather Extension ayrı pilot (FEAT-005-EXT) için ertelendi. Skor 8.5/10 (konsolidasyonda Türkçe/İngilizce karma alıntı disiplin notu eklendi). |

---

## 1. Feature description

> *"Predictive ETA Estimation: Real-time prediction of arrival times that account for traffic, weather, road closures, and vehicle-specific characteristics — surfaced to dispatchers, customers, and drivers."*

### 1.1 HERE Consumer disiplini

ADR-0010 §3.2 net çerçeveler:

> *"ETA estimation — HERE's `etr` (estimated time of arrival) is ML-derived; we consume it."*

TulipFleet ETA hesaplamak için **kendi ML modelini eğitmez veya kendi algoritmasını yazmaz**. HERE Tour Planning + HERE Routing API + HERE Traffic API'den gelen veriyi consume eder, yayar, görselleştirir. Bu disiplin ADR-0010 §2'deki *"TulipFleet is an ML consumer, not an ML producer, in Phase 1 and Phase 2"* kararının doğrudan uygulanışı.

### 1.2 Üç consumer grubu

Wishlist üç consumer söylüyor — TulipFleet bunları farklı Phase'lerde sunar:

| Consumer | Phase | Mekanizma | Notlar |
|---|---|---|---|
| **Dispatcher** | 1 (MVP) | WebSocket / SSE — Live Fleet Map'te her vehicle/task için anlık ETA | ROADMAP Sıra 4 Live Fleet Map ile birlikte gelir |
| **Driver** | 2 | EMQX MQTT push — mobile app navigation screen update | Driver app değişikliği gerek; Phase 2 customer-funded veya scope expansion |
| **Customer** | 2 | REST + public token tracking link | ADR'lerde customer portal yok; token-based geçici link pattern öneriliyor |

### 1.3 Kapsam — içeride

- HERE consume + cache + propagation
- Dispatcher Live Fleet Map ETA gösterimi (Phase 1)
- Driver push notification altyapısı (Phase 2)
- Public customer tracking endpoint + token (Phase 2)
- FEAT-002 ile shared veri akışı (deviation hesabı)

### 1.4 Kapsam — dışarıda

- **Custom ETA algoritması / ML modeli** — ADR-0010 §3.2 yasak
- **Customer-facing tam portal** — ADR'lerde yok, sadece token-based public link Phase 2
- **Weather API entegrasyonu** — Phase 2 customer-funded; ayrı pilot kapsamında (FEAT-005-EXT, ileride yazılacak)
- **Driver app onboard navigation** — mevcut akış kullanılır, ETA backend'den consume

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Phase | Consumer | Shared with FEAT-001/002/003/004? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FEAT-005-FN-01 | backend | `getHereRoutingEta` | origin, destination, vehicleProfile | { etr: ISO8601 } | public.vehicles | — | HERE Routing API | ADR-0010 §3.2 — "ETA estimation — HERE's `etr` (estimated time of arrival) is ML-derived; we consume it." | 1 | all | — |
| 2 | FEAT-005-FN-02 | worker | `onVehicleLocationUpdate` | MQTT_Payload | void | — | enterprise.dispatch_tasks (eta_updated_at) | EMQX | ADR-0009 §4.2 — "Existing fleet/device/+/* topics are read by both backends; dispatcher backend subscribes read-only." | 1 | internal | **FEAT-002:FN-09** |
| 3 | FEAT-005-FN-03 | backend | `refreshTaskEtas` | vehicleId, **context: { currentLocation, appointments?, restPlan? }** | TaskEtas[] | enterprise.dispatch_tasks, **enterprise.dock_appointments** (FEAT-006) | enterprise.dispatch_tasks (estimated_arrival_at) | HERE Routing | ADR-0011 §8.1 — "Predictive ETA with live traffic — FEAT-003" (HERE Native) | 1 | dispatcher | **FEAT-006:FN-03 — imza evrimi**, aynı fonksiyon, opsiyonel parametrelerle Phase 1'de forward-compatible |
| 4 | FEAT-005-FN-04 | backend | `calculateEtaDeviation` | actual, planned | Deviation | enterprise.dispatch_tasks | — | — | ADR-0011 §6 — "FEAT-104 'Trafik-triggered automatic re-routing'" (FEAT-002 ile ortak veri ihtiyacı) | 1 | dispatcher | **FEAT-002:FN-11** |
| 5 | FEAT-005-FN-05 | backend | `GET /api/dispatcher/tasks/:id/eta` | id, (JWT.company_id) | { currentEta, deviation, lastRefresh } | enterprise.dispatch_tasks | — | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 1 | dispatcher | — |
| 6 | FEAT-005-FN-06 | frontend | `<EtaDisplayWidget />` | taskId | UI Component | — | — | — | ADR-0001 §3.6 — "Forms, modals, navigation, layout primitives" | 1 | dispatcher | — |
| 7 | FEAT-005-FN-07 | backend | `applyWeatherDelayFactor` | baseEta, location | adjustedEta | enterprise.weather_config (Phase 2) | — | — | ADR-belirsiz — Phase 2'de FEAT-005-EXT pilot çıktısıyla doldurulacak | 2 | internal | — |
| 8 | FEAT-005-FN-08 | backend | `broadcastEtaToDriver` | taskId, newEta | void | public.drivers | — | EMQX | ADR-0009 §8 — "MQTT publish from enterprise backend — for direct vehicle commands in Mode 2/3 dispatch (per ADR-0005)." | 2 | driver | — |
| 9 | FEAT-005-FN-09 | backend | `generatePublicTrackingToken` | taskId, (JWT.company_id) | { token, expiresAt } | enterprise.dispatch_tasks | enterprise.tracking_tokens | — | ADR-belirsiz — Phase 2 customer-facing pattern (ADR'lerde explicit customer portal yok) | 2 | customer | — |
| 10 | FEAT-005-FN-10 | backend | `GET /api/public/tracking/:token` | token | PublicEtaData | enterprise.dispatch_tasks, enterprise.tracking_tokens | — | — | ADR-belirsiz — Phase 2 customer-facing pattern | 2 | customer | — |
| 11 | FEAT-005-FN-11 | shared_library | `MatrixCache.get` | locations: LatLng[] | Matrix | Redis | Redis | HERE Matrix | ADR-0002 §5 — "MatrixCache — caches Distance Matrix responses (Redis, 24-hour TTL) to control per-request cost." | 1 | all | **FEAT-001:FN-008** |
| 12 | FEAT-005-FN-12 | worker | `trafficDelayMonitor` | route: Polyline | Alert | — | — | HERE Traffic API | ADR-0011 §6 — "FEAT-104 'Trafik-triggered automatic re-routing'" | 2 | internal | **FEAT-002:FN-10** |

**Konsolidasyon notları:**
- **FN-03 ADR ref düzeltmesi:** NotebookLM "ADR-0011 §5" demişti; gerçek konum **ADR-0011 §8.1 HERE Native coverage matrix** — düzeltildi.
- **FN-04 ADR ref düzeltmesi:** Aynı şekilde §5 → §6 (FEAT-104 trafik trigger atfı; FEAT-002 ile ortaklık).
- **FN-07 isim değişikliği:** NotebookLM `getWeatherDelayFactor` demişti; FEAT-005-EXT pilot çıktısında aynı isim FN-14 olarak tekrar geçti. Çakışmayı önlemek için FN-07 yeniden adlandırıldı: `applyWeatherDelayFactor` (ETA'ya weather etkisi uygulama). Phase 2'de FEAT-005-EXT FN-14 (`getWeatherDelayFactor`) bu fonksiyonun verisini sağlar.
- **FN-09/FN-10 ADR ref:** Customer-facing tracking ADR'lerde explicit yer almıyor. "ADR-belirsiz" işaretlendi; FEAT-005-EXT veya yeni bir mini-ADR ile netleştirilir.
- **2026-05-29 cross-spec sync (FEAT-006 + FEAT-007 sonrası):** İki düzeltme yapıldı: (a) **FN-03 imza evrimi** — `currentLocation` → `context: { currentLocation, appointments?, restPlan? }` (FEAT-006 dock + rest planning enjeksiyonu için forward-compatible). FN-03 aynı fonksiyon, FEAT-006:FN-03 olarak yeniden kullanılır. Reads from genişledi: `enterprise.dock_appointments` eklendi. (b) **FN-08 alıntı düzeltmesi** — NotebookLM FEAT-005 ve FEAT-007 pilotlarında ADR-0009 §8 cümlesini aynı parafrazlanmış halde kullanmıştı (sistemik hata). Birebir cümleye düzeltildi: *"MQTT publish from enterprise backend — for direct vehicle commands in Mode 2/3 dispatch (per ADR-0005)."* — eski parafraz `"... and approved dispatch confirmations (Phase 2+)"` kaldırıldı.

---

## 3. ETA propagation pipeline

### 3.1 Phase 1 (dispatcher) — MVP

```
Vehicle position update (every 30s)
        ↓
EMQX fleet/device/+/location
        ↓
onVehicleLocationUpdate                 (FN-02) [FEAT-002:FN-09 shared]
   └─ Writes enterprise.dispatch_tasks.eta_updated_at
        ↓
refreshTaskEtas                         (FN-03)
   └─ getHereRoutingEta                 (FN-01) [HERE Routing API]
   └─ Updates enterprise.dispatch_tasks.estimated_arrival_at
        ↓
calculateEtaDeviation                   (FN-04) [FEAT-002:FN-11 shared]
   └─ vs original plan estimated time
        ↓
WebSocket push to dispatcher React UI
        ↓
<EtaDisplayWidget />                    (FN-06)
   └─ Live Fleet Map'te araç/task üzerine yansır
```

**Refresh frequency:** UNCERTAINTIES #3'te belirsiz. Öneri: vehicle position update tetikli (her 30s), `MatrixCache` ile maliyet kontrolü. HERE Routing API çağrısı her location update'te yapılmaz; sadece **deviation > eşik** durumunda taze çağrı.

### 3.2 Phase 2 (driver push)

```
refreshTaskEtas çıktısı                 (FN-03)
        ↓
Eğer ETA önemli ölçüde değişti (>5dk)
        ↓
broadcastEtaToDriver                    (FN-08) [Phase 2]
   └─ MQTT publish fleet/driver/{driverId}/eta-update
   └─ Driver mobile app subscribe (Phase 2 driver app değişikliği)
```

**Driver app değişikliği:** ADR-0009 §4.6 *"No changes required to the mobile driver app for Phase 1 dispatcher launch"* diyor. FN-08 Phase 2 driver-side opt-in olur.

### 3.3 Phase 2 (customer-facing)

```
Dispatcher approve plan
        ↓
generatePublicTrackingToken             (FN-09) [Phase 2]
   └─ Random secure token + expiresAt (örn. delivery+24h)
   └─ Writes enterprise.tracking_tokens
        ↓
Customer alır (email, SMS, webhook — TulipFleet'in customer'ı entegre eder)
        ↓
Customer browser → https://track.tulipfleet.com/{token}
        ↓
GET /api/public/tracking/:token         (FN-10) [Phase 2]
   └─ Auth: token validation (rate-limited, no JWT)
   └─ Returns: minimal ETA + vehicle position (lat/lng, no driver PII)
        ↓
Static landing page (no React SPA, lightweight)
```

**Güvenlik:** Token tek-kullanım veya kısa süreli (24-48 saat), rate-limited. Customer PII expose etmez (driver name yok, sadece ETA + vehicle generic icon).

---

## 4. Database — yeni tablolar

### 4.1 Mevcut tablolar yeterli

| Tablo | Phase 1 kullanım |
|---|---|
| `enterprise.dispatch_tasks` | `estimated_arrival_at` + `eta_updated_at` kolonları ETA'yı saklar |
| `enterprise.routing_jobs` | İlk plan HERE submission'da result.etr buradan gelir |
| `public.locations` | Live vehicle position (FEAT-002 ile shared) |

### 4.2 Phase 2 yeni tablo — `enterprise.tracking_tokens`

```sql
CREATE TABLE enterprise.tracking_tokens (
    token            TEXT PRIMARY KEY,  -- 64-char URL-safe random
    company_id       UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    dispatch_task_id UUID NOT NULL REFERENCES enterprise.dispatch_tasks(id) ON DELETE CASCADE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at       TIMESTAMPTZ NOT NULL,
    last_accessed_at TIMESTAMPTZ,
    access_count     INTEGER NOT NULL DEFAULT 0,
    revoked          BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_tracking_tokens_expires ON enterprise.tracking_tokens (expires_at) 
  WHERE revoked = FALSE;
CREATE INDEX idx_tracking_tokens_task ON enterprise.tracking_tokens (dispatch_task_id);
```

**Tasarım kararları:**
- `token TEXT PRIMARY KEY` — URL-safe random (32-64 char). UUID kullanılmaz çünkü guessable.
- `company_id` denormalized — tenant isolation tablodan direkt kontrol edilir (ADR-0009 §5.3)
- `expires_at` zorunlu — kalıcı token yok
- `revoked` flag — dispatcher manuel iptal edebilir
- `last_accessed_at` + `access_count` — abuse detection için audit data
- Cleanup: Cron job `expires_at < NOW() - 7 days` olan kayıtları siler (audit history)

### 4.3 Phase 2 weather config (FEAT-005-EXT'e ertelendi)

`enterprise.weather_config` tablosu FN-07 için referans veriliyor ama bu **FEAT-005-EXT** pilot çıktısının kapsamında. Bu ana spec'te yer almaz; FEAT-005-EXT yazıldığında schema kararı netleşir.

---

## 5. HERE API usage

| HERE endpoint | Kullanım | Phase | FEAT-005 fonksiyonu |
|---|---|---|---|
| **Tour Planning** | İlk plan oluştururken `result.etr` alınır | 1 (FEAT-001'den gelir) | — (FEAT-001 owned) |
| **Routing API** | Vehicle hareket halindeyken canlı ETA recalc | 1 | FN-01, FN-03 |
| **Matrix API** | Distance Matrix cache | 1 | FN-11 (shared) |
| **Traffic API** | Delay flag detection | 2 | FN-12 (FEAT-002 ile shared) |
| **Weather API** | Hava durumu etkisi (Phase 2 extension) | 2 (EXT) | FN-07 placeholder |

### Cost implications (ADR-0002 §7 referans)

ADR-0002 §7 HERE'nin TulipFleet'e olan maliyetini tablolar (Pilot 1500 plan/ay → Growth 30k/ay). FEAT-005 implementation'ı bu maliyet modelini **artırabilir** çünkü:

- Plan oluşturma: 1 HERE call per plan (FEAT-001 mevcut)
- ETA refresh: **N calls per active vehicle per gün** — yeni boyut

**Maliyet kontrol stratejisi:**
1. `MatrixCache` (FN-11, FEAT-001'den shared) — distance matrix cache
2. **Threshold-based refresh** — sadece deviation > eşik durumunda taze HERE call
3. **Batch processing** — birden fazla vehicle aynı bölgede ise tek Routing API call
4. Daily HERE call counter (Redis) + founder alert when spike detected (ADR-0002 §6 "Quotas")

Tam cost re-evaluation FEAT-005 implementation öncesi yapılır (Cem onayı bekliyor — UNCERTAINTIES #3).

---

## 6. Shared infrastructure with previous FEAT'leri

| FEAT-005 fonksiyon | Shared with | Paylaşım türü |
|---|---|---|
| FN-02 onVehicleLocationUpdate | FEAT-002:FN-09 | **Birebir** (aynı MQTT subscriber) |
| FN-04 calculateEtaDeviation | FEAT-002:FN-11 | **Birebir** (FEAT-002 deviation triggerlar, FEAT-005 display) |
| FN-11 MatrixCache.get | FEAT-001:FN-008 / FEAT-002:FN-04 / FEAT-003:FN-04 / FEAT-004:FN-05 | **Birebir** (5 FEAT'le birden shared) |
| FN-12 trafficDelayMonitor | FEAT-002:FN-10 trafficTriggerDetector | **Birebir** (aynı HERE Traffic poller) |

**Sonuç:** FEAT-005'in 12 fonksiyonundan **4'ü birebir shared infrastructure**. Yeni geliştirme oranı %66 — Phase 1'de **3 yeni Phase 1 fonksiyon** (FN-01, FN-03, FN-05, FN-06 = 4 yeni Phase 1), Phase 2'de **5 yeni fonksiyon** (FN-07, FN-08, FN-09, FN-10, FN-12).

Bu, **FEAT-002 ile en yakın akrabalık** ilişkisi — ikisi de live vehicle data + HERE Routing tüketicisi.

---

## 7. Customer-facing scope decision

### Karar: Phase 2 token-based public link

ADR-0011 + ADR-0009 + ADR-0001 incelemesinde **customer-facing portal mimarisi ADR'lerde yer almıyor**. Customer Web Portal, Customer Mobile App veya benzeri bir sub-ürün tanımlı değil.

Bu durum üç olası yorum:
- (a) Customer-facing **out-of-scope**, hiç yapılmaz
- (b) Phase 2'de **token-based hafif çözüm** yeterli (NotebookLM önerisi)
- (c) Phase 3'te full customer portal (yeni ADR-XX gerek)

**Bu spec'te tercih (b)** — wishlist "surfaced to customers" explicit gereksinim, **out-of-scope etiketi sert düşer**. Token-based public link **minimal customer-facing**:
- TulipFleet customer'ı kendi müşterisine link yollar
- TulipFleet tarafında portal yok, sadece public tracking endpoint
- Customer-customer ilişkisi TulipFleet customer'ının sorumluluğunda

**Phase 3'te full portal** ihtiyacı doğarsa ayrı ADR (örn. ADR-0014 Customer Portal) yazılır. Bu spec o ADR'yi presupose etmez.

### Phase 2 trigger

Customer-facing token endpoint Phase 2'de aktive olur şu durumda:
- İlk paying customer "I need to share ETA with my customers" der
- ADR-0007 customer-funded pattern (gerekirse)
- Driver push (FN-08) ile birlikte sıralanabilir veya ayrı sprint

---

## 8. UNCERTAINTIES (Cem onayı bekleyen)

### NotebookLM çıktısından

1. **Weather API sağlayıcısı:** HERE Weather mı, OpenWeatherMap mı, AccuWeather mı? Bu karar **FEAT-005-EXT pilot kapsamında** verilir. Şu an ADR-belirsiz.

2. **Driver app navigasyon kaynağı:** Driver app onboard mu ETA hesaplar (HERE'yi kendi consume ederek), yoksa backend'den push'lanan ETA'yı mı kullanır? Phase 2 implementation kararı.

3. **Refresh frequency:** `refreshTaskEtas` (FN-03) hangi sıklıkta çağrılır?
   - Her location update (~30s) — yüksek maliyet
   - Her 5 dakika — düşük güncellik
   - Threshold-based (deviation > eşik) — denge, önerilen
   ADR-0002 §7 HERE cost model'i etkilenir.

### Pilot süreçte tespit edilen

4. **`enterprise.tracking_tokens` cleanup policy:** Expired token'lar ne kadar süre tutulur? Audit log için 30 gün vs aktif tablo bloat'ı.

5. **Token security:** 64-char URL-safe random yeterli mi, yoksa JWT signed token tercih edilir mi? JWT customer-facing public link için over-engineering olabilir.

6. **Driver push opt-in:** FN-08 driver app değişikliği gerek — Phase 2'de driver opt-in mi (settings'ten on/off), default off mu yoksa driver workflow'a yerleşik mi olur?

---

## 9. Pilot süreç notları

### 9.1 Pilot akışı (2026-05-27)

1 ana prompt + 3 follow-up Q&A:

1. **Ana pilot:** 12 fonksiyon ana liste + Weather Extension (7 ek fonksiyon) — NotebookLM extension'ı önceden çıkardı. Skor 8.5/10.
2. **Follow-up 1 — Weather API providers:** HERE Weather (primary) + 3rd party ADR-belirsiz + customer-funded connector pattern. ✅ Doğru cevap.
3. **Follow-up 2 — ETA deviation thresholds:** Lokasyon ≥%15, Zaman >5dk, HERE traffic >10dk (FEAT-002 spec'imizdeki değerlerle birebir uyumlu). ✅
4. **Follow-up 3 — Weather extension:** FEAT-005-EXT olarak ayrı pilot konusu — bu spec'te ana liste yeterli, extension ileride yazılır.

### 9.2 Alıntı doğrulama (spot check)

| Reference | Test sonucu | Düzeltme |
|---|---|---|
| ADR-0010 §3.2 (ETA ML-derived consume) | ✅ Birebir doğrulandı (FEAT-002'de de aynı alıntı vardı) | — |
| ADR-0009 §4.2 (MQTT topic access) | ✅ Önceki turlarda | — |
| ADR-0001 §3.6 (UI primitives) | ✅ Önceki turlarda | — |
| ADR-0002 §5 (MatrixCache) | ✅ Önceki turlarda | — |
| ADR-0011 §5 (Predictive ETA description) | ❌ NotebookLM bu §'da diyor, doğrusu **§8.1 HERE coverage matrix** | → §8.1 / §6 (FEAT-104 atfı) |
| ADR-0011 §6 (FEAT-104) | ✅ Önceki turlarda | — |
| ADR-0011 §9.5 (endpoint patterns) | ✅ Önceki turlarda | — |
| ADR-0009 §8 (MQTT publish enterprise) | ⚠️ Plausible ama exact §8 doğrulanmadı | korundu |

### 9.3 Karma dil disiplin notu

ADR-0011 **karma dilli** (Türkçe açıklama + İngilizce başlık/teknik terim). NotebookLM Türkçe alıntılar yapmıştı — başlangıçta disiplin ihlali olarak işaretlemiştim, ama ADR-0011'in karma yapısı nedeniyle **Türkçe alıntılar geçerli** (ADR'in kendi dilinden). Diğer İngilizce-only ADR'lerden (ADR-0002, ADR-0007, ADR-0009 v.s.) Türkçe alıntı yapılmamış — disiplin orada korundu.

**Genel kural:** Alıntı kaynağın **kendi dilinde** olur — ADR-0011 için Türkçe veya İngilizce ikisi de kabul, diğer ADR'ler için sadece İngilizce.

### 9.4 5 pilot karşılaştırması

| Boyut | FEAT-001 | FEAT-002 | FEAT-003 | FEAT-004 | FEAT-005 |
|---|---|---|---|---|---|
| Fonksiyon sayısı | 16 | 16 | 16 | 12 (dar) | **12** |
| Phase 1 oranı | 11/16 | 13/16 | 11/16 | 6/12 | **6/12** |
| Iterasyon | 5 | 3 | 2 | 1+1 | **1+3 follow-up** |
| Skor | 9/10 | 9.5/10 | 9/10 | 9/10 | **8.5/10** |
| Yeni paradigma | (baseline) | Re-routing | On-demand scoring | Multi-actor scope | **HERE consumer + 3-consumer broadcast** |
| Shared % | — | 44% | 25% | 50% | **33%** |

**Patern öğrenmesi (5 pilot):**
- HERE consumer disiplini test geçti — prompt'taki ön-uyarı işe yaradı
- Section adresleme regression tekrar oldu (§5 vs §8.1) — gelecek pilotlarda spot check zorunluluğu devam ediyor
- 5. pilotta follow-up sayısı arttı (3 takip Q&A) ama ana iterasyon 1 — verim hâlâ yüksek
- Extension pattern (FEAT-005-EXT) doğru reflex — ana spec sade tutuldu

---

## 10. Next steps

### 10.1 Phase 1 implementation backlog

ROADMAP Sıra 4 (Live Fleet Map) + Sıra 6 (dispatcher endpoints) kapsamında:
- FN-01 getHereRoutingEta (HERE Routing API client)
- FN-02 onVehicleLocationUpdate (FEAT-002 ile ortak worker, bir kez yazılır)
- FN-03 refreshTaskEtas (threshold-based)
- FN-04 calculateEtaDeviation (FEAT-002 ile ortak utility)
- FN-05 GET /api/dispatcher/tasks/:id/eta
- FN-06 `<EtaDisplayWidget />` (Live Fleet Map'in parçası)
- FN-11 MatrixCache.get (FEAT-001 implementation'ında zaten yazılır)

### 10.2 Phase 2 implementation (customer-funded veya scope expansion)

- FN-08 broadcastEtaToDriver — driver app değişikliği koordinasyonu gerek
- FN-09 generatePublicTrackingToken
- FN-10 GET /api/public/tracking/:token
- FN-12 trafficDelayMonitor (FEAT-002 ile ortak, bir kez yazılır)
- `enterprise.tracking_tokens` migration

### 10.3 FEAT-005-EXT — Weather Extension (ileride)

NotebookLM Weather için ek 7 fonksiyon önerdi (FN-13..FN-19). Bu **ayrı bir pilot konusu** — FEAT-005-EXT olarak ileride yazılır. İçerik özet:
- FN-13 fetchHereWeatherAlerts
- FN-14 getWeatherDelayFactor (FEAT-005 FN-07'nin data layer'ı)
- FN-15 weather alerts notification endpoint
- FN-16 weatherTriggerMonitor (FEAT-002 trafficTriggerDetector pattern)
- FN-17 MatrixCache.invalidateByWeather
- FN-18 applyWeatherBiasToEta (isim değişebilir — "bias" terminoloji riski ADR-0010 §3.2 ile çelişebilir)
- FN-19 `<WeatherLayer />` map overlay

Phase 2 customer-funded trigger geldiğinde FEAT-005-EXT pilot prompt yazılır.

### 10.4 FEAT-006 pipeline

FEAT-006 = wishlist #6 — bir sonraki feature. Tipik olarak "Geofence-based automated workflows" veya "Driver shift management" — wishlist'e bakıp seçilir.

---

## 11. References

- ADR-0001 §3.6 (UI primitives)
- ADR-0002 §5 (MatrixCache)
- ADR-0002 §7 (HERE cost model — FEAT-005 cost impact)
- ADR-0009 §4.2 (MQTT topic access — dispatcher read-only)
- ADR-0009 §4.6 (Driver app no-change Phase 1)
- ADR-0009 §8 (MQTT publish from enterprise Phase 2)
- ADR-0010 §2 (ML consumer not producer)
- **ADR-0010 §3.2** (HERE etr consume — FEAT-005 cornerstone)
- ADR-0011 §6 (FEAT-104 trafik-triggered Phase 2)
- ADR-0011 §8.1 (HERE Native coverage — Predictive ETA classification)
- ADR-0011 §9.5 (endpoint patterns)
- FEAT-001 spec (MatrixCache shared)
- FEAT-002 spec (FN-09, FN-10, FN-11 shared)
- NotebookLM session 2026-05-27 (1 prompt + 3 follow-up Q&A)

---

## 12. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-27 | Cem Bakir (with Claude + NotebookLM cowork) | İlk konsolide function spec. Beşinci pilot — HERE consumer paradigması (ADR-0010 §3.2 cornerstone). 12 fonksiyon, 4 shared (FEAT-002 ile en yakın akraba). 3 consumer ayrımı: dispatcher Phase 1, driver Phase 2, customer Phase 2 (token-based public link). Weather Extension ayrı pilot olarak ertelendi (FEAT-005-EXT). Konsolidasyon düzeltmeleri: §5→§8.1, §5→§6 (FN-03, FN-04 ADR ref), FN-07 isim çakışması temizlendi (`applyWeatherDelayFactor`), `enterprise.tracking_tokens` DDL eklendi. Karma dil disiplin notu: ADR-0011 karma yapı nedeniyle Türkçe alıntı geçerli, diğer ADR'ler İngilizce-only kuralı korundu. |
| 2 | 2026-05-29 | Cem Bakir | **Cross-spec sync (FEAT-006 + FEAT-007 sonrası).** İki düzeltme: (a) **FN-03 imza evrimi** — `currentLocation` → `context: { currentLocation, appointments?, restPlan? }`. FEAT-006'da `refreshTaskEtas` aynı fonksiyon olarak yeniden kullanılır (FEAT-006:FN-03), opsiyonel parametrelerle Phase 1'de forward-compatible. Reads from genişletildi: `enterprise.dock_appointments` (FEAT-006 schema). (b) **FN-08 ADR-0009 §8 alıntı düzeltmesi** — NotebookLM hem FEAT-005-FN-08'de hem FEAT-007-FN-09'da aynı parafrazlanmış halde tekrarlamıştı (sistemik hata, FEAT-007 §8.4'te tespit). Birebir cümleye düzeltildi: *"MQTT publish from enterprise backend — for direct vehicle commands in Mode 2/3 dispatch (per ADR-0005)."* — eski parafraz `"... and approved dispatch confirmations (Phase 2+)"` kaldırıldı. Cross-spec sync TODO FEAT-007 v1 §8.4'ten gelmişti, bu commit'le kapatıldı. |
