# FEAT-017 — Locker and PUDO Management

| Field | Value |
|---|---|
| **Feature ID** | FEAT-017 |
| **Source** | Wishlist W17 — "Locker and PUDO Management" |
| **Frequency rating** | Common |
| **Cem note** | *"we do with geofence"* — mevcut altyapı kullanılıyor |
| **Tulipfleet Phase** | Phase 1.1 (geofence type extension + nearby query + fallback) + Phase 2 (partner API integrations) |
| **Status** | Function spec drafted via NotebookLM (1 prompt + 1 extension round, 2026-05-30) |
| **Pilot note** | On birinci pilot. **8.5/10** skor, 1+1 iterasyon (extension reverse flow + expiry + cache eklenmesi için). **§number fabrikasyon = 0** ✅ (F8, F10, F17 zinciri stable). Yeni paradigma: **mevcut public.* schema extension** — yeni tablo gerek yok. |

---

## 1. Feature description

### 1.1 Wishlist tanımı

> *"Dispatchers orchestrate deliveries and returns through secure self-service lockers or 'pick-up drop-off' points to avoid missed attempts. Estimated frequency: Common."*

### 1.2 Cem'in stratejik içgörüsü — "we do with geofence"

TulipFleet'te zaten **production'da** geofence altyapısı var:

| Mevcut tablo/kolon | Detay |
|---|---|
| `public.geofences` | name, type (circle/polygon), radius, polygon coords, alert_on_entry/exit |
| `public.alerts` | Geofence event log (entry/exit timestamps) |
| `public.geofences.csrd_tracked` | CSRD tracking flag (emission zone'lar için) |
| Mobile app | Geofence event görüntüleme zaten var |
| ADR-0009 §4.1 grants | Dispatcher backend SELECT yetkisi |

Locker ve PUDO noktaları **fiziksel teslimat adreslerinden ziyade** üzerinde kurallar işletilen **dinamik poligonlar/daireler** olarak temsil edilir. Mevcut altyapı extend edilir, yeni tablo gerekmez.

### 1.3 İş mantığı

```
Forward flow (delivery):
1. Dispatcher görev planlar → müşteri evde değil
2. Failed delivery attempt (mevcut driver mobile flow)
3. allow_locker_fallback flag aktif mi? (opt-in kontrolü)
4. findNearbyLockers — 2 km yarıçapta PostGIS ST_DWithin
5. suggestLockerFallback — Mode 1 Advisory önerisi
6. Dispatcher onaylar → POST /reroute-to-locker
7. HERE Tour Planning re-route → driver locker'a gider
8. onLockerGeofenceEntry → public.alerts entry log
9. Customer notification (SMS/email locker code dahil)

Reverse flow (return):
1. Customer paket locker'a bırakır
2. onCustomerLockerDropoff — partner webhook (Phase 2) veya
   dispatcher manuel entry (Phase 1.1)
3. enterprise.dispatch_tasks yeni pickup task oluşur
4. Standard dispatcher planning'e dahil olur

Expiry monitoring:
1. monitorLockerPickupExpiry (saatlik cron)
2. 72 saat sonrası → FEAT-010 exception event
3. Dispatcher "Return to Sender" karar verir
```

### 1.4 Phase ayrımı

| Phase 1.1 (MVP + 1-4 hafta) | Phase 2 (customer-funded trigger) |
|---|---|
| `public.geofences.location_type` extension | Partner API (PostNL, Bpost, Amazon Locker) |
| Nearby locker query (PostGIS ST_DWithin) | Locker availability real-time check |
| Dispatcher fallback önerisi (Mode 1 Advisory) | Locker access code üretimi (partner ref) |
| Reverse flow — manuel dropoff entry | Reverse flow — partner webhook |
| Expiry monitoring (72h default) | Redis availability cache |
| `allow_locker_fallback` opt-in flag | Customer-facing locker code SMS/email |

### 1.5 Kapsam — içeride

- `public.geofences.location_type` enum extension (locker/pudo/parcel_shop/return_point/customer_site)
- PostGIS ST_DWithin nearby locker query
- Dispatcher "fallback to locker" UI önerisi (Mode 1 Advisory)
- Failed delivery → locker re-route flow
- Reverse flow (Phase 1.1 manuel + Phase 2 partner webhook)
- Expiry monitoring (FEAT-010 exception event entegrasyonu)
- Customer opt-in (`enterprise.dispatch_tasks.allow_locker_fallback`)
- Phase 2: Partner API + availability cache

### 1.6 Kapsam — dışarıda

- **Locker hardware/fiziksel kurulum** — Partner'lar yönetir (PostNL, Bpost vb.)
- **Customer-facing locker SDK/widget** — Phase 2 customer-funded
- **Custom AI/ML locker selection** — ADR-0010 §3.5 Phase 3+ candidate (preference learning)
- **PoD entegrasyonu** — FEAT-011 PoD Capture ayrı feature (kesişim UNCERTAINTIES #3)

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Phase | Shared with FEAT-001..10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FEAT-017-FN-01 | backend | `findNearbyLockers` | location, radius, (JWT.company_id) | Geofence[] | public.geofences | — | PostGIS (ST_DWithin) | ADR-0012 §4.7 — "point-in-polygon native query Phase 3 scale için altyapı" | 1.1 | — |
| 2 | FEAT-017-FN-02 | backend | `suggestLockerFallback` | taskId, maxDistance | Suggestion | public.geofences, enterprise.dispatch_tasks | — | — | ADR-0005 §4.1 — "Modify one or more assignments (drag-and-drop in the Kanban view; reorder visits in the timeline)." (Mode 1 dispatcher modify pattern) | 1.1 | **FEAT-003:FN-07** suggestion pattern |
| 3 | FEAT-017-FN-03 | backend | `POST /api/dispatcher/tasks/:id/reroute-to-locker` | taskId, geofenceId | { jobId } | — | enterprise.routing_jobs | HERE Tour Planning | ADR-0011 §9.5 — "POST /api/dispatcher/plans/:id/replan — FEAT-004 manuel re-plan" (re-route endpoint pattern) | 1.1 | **FEAT-002:FN-02** re-route action |
| 4 | FEAT-017-FN-04 | backend | `updateGeofenceLocationType` | geofenceId, type, provider? | Success | — | public.geofences | — | ADR-0004 v3 §6 — "Additive ve geriye dönük uyumlu... değişikliklere izin verilir." | 1.1 | — |
| 5 | FEAT-017-FN-05 | shared_library | `buildHereProblemWithLockers` | tasks, vehicles, lockers | HERE_JSON | public.geofences | — | — | ADR-0002 §3.2 — "HERE Tour Planning natively models constraints (vehicle height, cold chain, driver shift rules, mixed pickup/delivery, refueling stops)" | 1.1 | **FEAT-001:FN-016** buildHereProblem (waypoint extension) |
| 6 | FEAT-017-FN-06 | worker | `onLockerGeofenceEntry` | MQTT_Payload | void | public.geofences | public.alerts | EMQX | ADR-0009 §4.2 — "Existing fleet/device/+/* topics are read by both backends; dispatcher backend subscribes read-only." | 1.1 | **FEAT-005:FN-02** MQTT subscriber pattern |
| 7 | FEAT-017-FN-07 | backend | `fetchPartnerLockerAvailability` | provider, lockerId | Availability | — | — | Partner API (PostNL/Bpost) | ADR-0007 §3.2 — "Every third-party telematics provider's API changes over time." (third-party API consumer pattern) | 2 | — |
| 8 | FEAT-017-FN-08 | backend | `generateLockerAccessCode` | taskId, partnerRef | { code, expiry } | — | enterprise.dispatch_tasks (metadata) | Partner API | ADR-belirsiz (locker code üretim pattern — UNCERTAINTIES #4) | 2 | — |
| 9 | FEAT-017-FN-09 | frontend | `<LockerSelectionMap />` | center, radius | UI Component | — | — | Leaflet | ADR-0006 §3.1 — "Map interactions are inspection-oriented, not action-oriented." | 1.1 | **FEAT-005:FN-06** map widget pattern |
| 10 | FEAT-017-FN-10 | backend | `GET /api/dispatcher/lockers` | company_id, type | Geofence[] | public.geofences | — | — | ADR-0009 §4.1 — "enterprise_backend: SELECT on a narrow set of public.* tables (vehicles, companies, users, drivers, tasks, geofences)" | 1.1 | — |
| 11 | FEAT-017-FN-11 | worker | `onCustomerLockerDropoff` | lockerId, customerRef, partnerRef | void | — | enterprise.dispatch_tasks | Partner API (Phase 2) / manuel entry (Phase 1.1) | ADR-0009 §4.4 — "Dispatcher-created and dispatcher-approved plans flow into the driver-facing task model." | 1.1 (manuel) / 2 (webhook) | **FEAT-003** (yeni order pattern) |
| 12 | FEAT-017-FN-12 | worker | `monitorLockerPickupExpiry` | (cron trigger, hourly) | void | enterprise.dispatch_tasks (locker metadata) | enterprise.exception_events | — | ADR-belirsiz (locker expiry handling pattern — UNCERTAINTIES #5) | 1.1 | **FEAT-010:FN-06** logExceptionEvent |
| 13 | FEAT-017-FN-13 | shared_library | `getCachedLockerAvailability` | provider, lockerId | { available_slots, last_updated } | Redis | Redis | — | ADR-0002 §5 — "MatrixCache — caches Distance Matrix responses (Redis, 24-hour TTL) to control per-request cost." (cache pattern reference) | 2 | **FEAT-001:FN-008** MatrixCache pattern |

**Konsolidasyon notları (NotebookLM çıktılarına göre düzeltmeler):**

| # | NotebookLM dedi | Düzeltme |
|---|---|---|
| FN-02 ADR-0005 §4.1 | "System suggests dispatch decisions" — parafraz | ✅ Düzeltildi: gerçek §4.1 cümlesi "Modify one or more assignments (drag-and-drop in the Kanban view; reorder visits in the timeline)" — Mode 1 dispatcher modify pattern |
| FN-03 ADR-0011 §9.5 alıntı | "POST /api/dispatcher/plans/:id/replan — FEAT-004 manuel re-plan" | ✅ Korundu — ADR-0011 §9.5 metninde FEAT-004 yazılı (eski numaralama uyumsuzluğu, alıntı birebir) |
| **Reverse flow eksikti** | İlk pilot sadece forward delivery | ✅ Extension'da FN-11 onCustomerLockerDropoff eklendi |
| **Expiry handler eksikti** | UNCERTAINTIES'te "72 saat" geçti ama fonksiyon yok | ✅ Extension'da FN-12 monitorLockerPickupExpiry eklendi (FEAT-010 entegrasyonu) |
| **Customer opt-in schema eksikti** | UNCERTAINTIES'te `allow_locker_fallback` flag var ama schema yok | ✅ Extension'da `enterprise.dispatch_tasks.allow_locker_fallback BOOLEAN DEFAULT false` schema eklendi |
| **Locker availability cache eksikti** | Partner API her seferinde mi çağrılır belirsiz | ✅ Extension'da FN-13 getCachedLockerAvailability eklendi (10 dk TTL) |
| FN-01..FN-10 diğer alıntılar | ✅ Doğru | — |

---

## 3. Forward delivery pipeline (Phase 1.1)

```
1. Dispatcher görev planlar (FEAT-001 ile)
        │
        ▼
2. Failed delivery (driver mobile mevcut akışı — task status: failed)
        │
        ▼
3. allow_locker_fallback flag kontrolü
   - enterprise.dispatch_tasks.allow_locker_fallback = true?
   - Hayır → standart failed delivery exception (manuel handling)
   - Evet → 4. adıma devam
        │
        ▼
4. findNearbyLockers (FN-01)
   - PostGIS ST_DWithin (default 2km, company override)
   - Filtre: location_type IN ('locker', 'pudo_point', 'parcel_shop')
   - Phase 2: getCachedLockerAvailability ile doluluk check
        │
        ▼
5. suggestLockerFallback (FN-02)
   - Mode 1 Advisory önerisi
   - En yakın 3 locker'ı dispatcher'a sunar
        │
        ▼
6. Dispatcher onaylar → POST /reroute-to-locker (FN-03)
   - buildHereProblemWithLockers (FN-05) — locker waypoint
   - HERE Tour Planning yeni rota
        │
        ▼
7. Driver locker'a gider → onLockerGeofenceEntry (FN-06)
   - MQTT fleet/device/+/geofence event
   - public.alerts entry log
        │
        ▼
8. Customer notification
   - Phase 1.1: Manuel dispatcher confirmation
   - Phase 2: generateLockerAccessCode (FN-08) + partner SMS/email
```

---

## 4. Reverse flow pipeline (Phase 1.1 manuel + Phase 2 webhook)

```
Phase 1.1 (manuel):
1. Customer locker'a paket bırakır
2. Dispatcher manuel entry: lockerId + customerRef
3. onCustomerLockerDropoff (FN-11)
   - enterprise.dispatch_tasks INSERT (yeni pickup task)
   - status: 'pending' (dispatcher normal planning'e dahil eder)

Phase 2 (otomatik):
1. Customer locker'a paket bırakır
2. Partner webhook → onCustomerLockerDropoff (FN-11)
   - partnerRef ile partner verisi parse
   - Otomatik enterprise.dispatch_tasks INSERT
3. FEAT-003 smart auto-dispatch kuyrukta değerlendirir
4. (Phase 2 Mode 2) En uygun driver'a otomatik atanır
```

---

## 5. Expiry monitoring (Phase 1.1)

`monitorLockerPickupExpiry` (FN-12) saatlik cron:

```sql
SELECT t.id, t.metadata->>'locker_dropoff_at' AS dropoff_time,
       t.metadata->>'pickup_deadline_hours' AS deadline
FROM enterprise.dispatch_tasks t
WHERE t.metadata->>'is_locker_delivery' = 'true'
  AND t.status = 'delivered'
  AND (NOW() - (t.metadata->>'locker_dropoff_at')::timestamptz) >
      INTERVAL '1 hour' * COALESCE((t.metadata->>'pickup_deadline_hours')::int, 72)
  AND NOT EXISTS (
    SELECT 1 FROM enterprise.exception_events e
    WHERE e.task_id = t.id
      AND e.exception_type = 'locker_pickup_expired'
  );
```

Expiry tespit edilirse:
- FEAT-010:FN-06 `logExceptionEvent` çağırılır
- `exception_type`: yeni enum value `'locker_pickup_expired'` (FEAT-010 schema CHECK genişletilmeli)
- Severity: `medium` (default), customer SLA breach varsa `high`
- Resolution: dispatcher "Return to Sender" karar verir

**Cross-spec sync TODO:** FEAT-010 spec'inde `enterprise.exception_events.exception_type` CHECK constraint genişletilmeli:
```sql
CHECK (exception_type IN (
  'eta_delay',
  'traffic_impact',
  'driver_no_show',
  'dock_conflict',
  'compliance_zone_breach',
  'locker_pickup_expired'  -- FEAT-017 entegrasyonu
))
```

---

## 6. Database changes (additive, public.* + enterprise.*)

### 6.1 `public.geofences.location_type` — Phase 1.1 additive

```sql
ALTER TABLE public.geofences
  ADD COLUMN location_type TEXT DEFAULT 'customer_site'
  CHECK (location_type IN (
    'customer_site',         -- default, mevcut davranış
    -- FEAT-017 (Locker/PUDO):
    'locker',
    'pudo_point',
    'parcel_shop',
    'return_point',
    -- FEAT-019 (Multi-Day Long-Haul):
    'truck_parking',         -- standart kamyon park alanı
    'secured_parking',       -- çitli, kameralı (high-value yükler)
    'hotel',                 -- sürücü konaklama
    'fuel_station',          -- akaryakıt istasyonu
    'rest_area',             -- yol kenarı kısa dinlenme
    'border_crossing',       -- ülke sınırı geçiş noktası
    -- FEAT-103 (EV Range):
    'charging_station'       -- EV şarj istasyonu
  ));

-- INDEX update (tüm location_type'lar için)
DROP INDEX IF EXISTS idx_geofences_location_type;
CREATE INDEX idx_geofences_location_type
  ON public.geofences (company_id, location_type)
  WHERE location_type != 'customer_site';

CREATE INDEX idx_geofences_location_type
  ON public.geofences (company_id, location_type)
  WHERE location_type != 'customer_site';
```

ADR-0004 v3 §6 additive pattern. Mevcut geofence'ler otomatik `customer_site` default değer alır, eski davranış bozulmaz.

### 6.2 `public.geofences.partner_provider` — Phase 2 additive

```sql
ALTER TABLE public.geofences
  ADD COLUMN partner_provider TEXT;
-- Örnek values: 'postnl', 'bpost', 'amazon', NULL (TulipFleet kendi)
```

Partner API entegrasyonu Phase 2'de aktive edildiğinde gerekir. Schema şimdi eklenir, forward-compatible.

### 6.3 `enterprise.dispatch_tasks.allow_locker_fallback` — Phase 1.1 additive

```sql
ALTER TABLE enterprise.dispatch_tasks
  ADD COLUMN allow_locker_fallback BOOLEAN NOT NULL DEFAULT false;
```

ADR-0004 v3 §6 enterprise.* additive pattern. **Default false** — customer explicit opt-in gerekir. Dispatcher veya customer onayı olmadan sistem locker önerisi üretmez (compliance + privacy disiplini).

### 6.4 `enterprise.dispatch_tasks.metadata` JSONB — locker payload

Mevcut JSONB kolonu, yeni key'ler additive:

```jsonc
{
  ...
  "is_locker_delivery": true,
  "locker_geofence_id": "uuid",
  "locker_dropoff_at": "2026-05-30T14:30:00Z",
  "pickup_deadline_hours": 72,
  "partner_ref": "PostNL-AB12345" // Phase 2
}
```

### 6.5 `public.companies.settings` — additive JSONB keys

```jsonc
{
  ...
  "locker_fallback": {
    "enabled": true,                    // company-level toggle
    "max_distance_meters": 2000,        // default 2km, override
    "failed_attempts_threshold": 1,     // 1 failed attempt sonrası
    "default_pickup_deadline_hours": 72
  }
}
```

### 6.6 Redis cache key (Phase 2)

```
Key: enterprise:locker_availability:{provider}:{lockerId}
TTL: 10 dakika
Value: { available_slots: integer, last_updated: ISO8601 }
```

ADR-0002 §5 MatrixCache paterniyle aynı disiplin (cost + latency control).

---

## 7. Shared infrastructure with previous FEAT'leri

| FEAT-017 fonksiyon | Shared with | Paylaşım türü |
|---|---|---|
| FN-02 suggestLockerFallback | **FEAT-003:FN-07** GET orders/:id/suggestions | Mode 1 Advisory suggestion pattern |
| FN-03 POST /reroute-to-locker | **FEAT-002:FN-02** POST /replan | Re-route action target |
| FN-05 buildHereProblemWithLockers | **FEAT-001:FN-016** buildHereProblem | Waypoint extension (mevcut imzanın çağrı paterni) |
| FN-06 onLockerGeofenceEntry | **FEAT-005:FN-02** onVehicleLocationUpdate | MQTT subscriber pattern (read-only, ADR-0009 §4.2) |
| FN-09 `<LockerSelectionMap />` | **FEAT-005:FN-06** map widget pattern | Leaflet inspection-oriented |
| FN-11 onCustomerLockerDropoff | **FEAT-003** order ingestion pattern | Yeni task creation flow |
| FN-12 monitorLockerPickupExpiry | **FEAT-010:FN-06** logExceptionEvent | Exception event writer (locker_pickup_expired) |
| FN-13 getCachedLockerAvailability | **FEAT-001:FN-008** MatrixCache pattern | Redis cache (cost+latency control) |

**Yeni cross-feature pattern — Geofence type extension:**

FEAT-017 mevcut `public.geofences` tablosunu **extend ederek** yeni location_type semantiği ekliyor. Bu pattern:
- Yeni tablo oluşturulmaz (schema bloat önler)
- Existing geofence event akışı (public.alerts) yeniden kullanılır
- Mobile app değişikliği gerekmez (location_type opaque kalır)
- ADR-0004 v3 §6 additive disipline uyar

Bu pattern ileride benzer feature'lar için **şablon** olabilir (örn. FEAT-018 Reverse Logistics dropoff zones, FEAT-103 EV charging stations).

**Cross-spec sync TODO:** FEAT-010 spec'inde `exception_type` CHECK constraint'e `'locker_pickup_expired'` eklenmeli (§5 detay).

---

## 8. UNCERTAINTIES (Cem onayı bekleyen)

### NotebookLM'in tespit ettikleri (v1)

1. **Locker kapasite yönetimi (FN-07):** Partner API real-time mi yoksa periodic polling mi?
   - **Karar (extension'da):** Redis cache 10 dk TTL (FN-13). Real-time gerek yok — failed delivery anında zaten dispatcher onay var, cache miss durumunda partner API tetiklenir.
   - ADR-0007 §3.2 third-party API consumer pattern.

2. **Reverse flow tetikleyici (FN-11):** Partner webhook mu yoksa manuel dispatcher entry mi?
   - **Karar:** Phase 1.1 manuel entry, Phase 2 partner webhook. İkisi de aynı `onCustomerLockerDropoff` (FN-11) — caller pattern farklı.

3. **Driver mobile onay (PoD kesişimi):** Sürücü locker'a ulaştığında barkod okutma zorunlu mu?
   - **Karar:** **FEAT-011 PoD Capture spec'ine bırakıldı.** FEAT-017 sadece geofence entry log'lar (FN-06). PoD detayı FEAT-011'de tanımlanır.
   - **Cross-spec dependency:** FEAT-011 yazılırken FEAT-017 entegrasyon noktası eklenmeli.

### Konsolidasyonda eklenenler

4. **Locker access code üretimi (FN-08 Phase 2):** Partner ref ile kendi unique code mu, partner'ın üreteceği code mu?
   - **Önerim:** Partner'ın üreteceği code kullanılır. TulipFleet sadece relay yapar — code lifecycle partner sorumluluğunda.
   - Encryption: `enterprise.dispatch_tasks.metadata` JSONB içinde **PII discipline** uygulanır (Phase 2 customer-funded ADR review gerekebilir).

5. **Pickup expiry deadline default — 72 saat mi?:** Partner verisine göre değişir mi?
   - **Karar:** 72 saat default (industry standard). Per-task override `enterprise.dispatch_tasks.metadata.pickup_deadline_hours`. Partner API döner döner kullanılır.

6. **Failed delivery attempt sayısı — 1 mi 2 mi?:**
   - **Karar:** Default 1 attempt — `public.companies.settings.locker_fallback.failed_attempts_threshold` override.
   - 1 attempt agresif gözükebilir ama opt-in (`allow_locker_fallback=true`) zaten customer onayı demektir.

7. **Locker preference learning (Phase 3+):** Customer geçmiş tercihlerine göre öneri sıralaması?
   - **Karar:** ADR-0010 §3.5 Phase 3 candidate. Phase 1.1'de basit distance-based ranking. Customer feedback toplandıkça Phase 3 ML değerlendirmesi.

8. **Partner provider listesi — hangi öncelik?:**
   - **Karar:** Phase 2 öncelik sırası — PostNL (NL pazar odağı), Bpost (BE), Amazon Locker (sadece customer-funded talep).
   - Yeni partner ADR-0007 customer-funded pattern.

9. **CSRD tracking integration:** Locker delivery emission savings hesaplanır mı?
   - **Karar:** FEAT-009 carbon footprint zaten per-task hesaplıyor — locker delivery automatic dahil. FEAT-009 cross-spec sync gerekmez.

---

## 9. Pilot süreç notları

### 9.1 Pilot akışı (2026-05-30)

İki round NotebookLM cowork:
- **Round 1 (initial):** 10 fonksiyon (forward delivery + geofence extension + partner API skeleton)
- **Round 2 (extension):** 3 fonksiyon eklendi (reverse flow + expiry + cache) + schema detayları

İki round'da da § number fabrikasyon = 0 ✅ (F8-F10-F17 zinciri).

### 9.2 Alıntı doğrulama — F10 trend devam

| # | NotebookLM | Gerçek | Durum |
|---|---|---|---|
| FN-01 ADR-0012 §4.7 | ✅ Doğru (Türkçe karma OK) | — | ✅ |
| FN-02 ADR-0005 §4.1 "System suggests dispatch decisions" | ⚠️ **Parafraz birleşim** — gerçek §4.1 cümlesi farklı | ✅ Düzeltildi: §4.1 dispatcher modify cümlesi |
| FN-03 ADR-0011 §9.5 "FEAT-004 manuel re-plan" | ✅ Birebir (ADR-0011 metninde FEAT-004 yazılı, eski numaralama uyumsuzluğu) | — | ✅ |
| FN-04 ADR-0004 v3 §6 "Additive ve geriye dönük uyumlu" | ✅ Doğru (Türkçe karma OK) | — | ✅ |
| FN-05..FN-10 | ✅ Doğru | — | ✅ |
| FN-11 ADR-0009 §4.4 | ✅ Birebir | — | ✅ |
| FN-13 ADR-0002 §5 (extension) | ✅ Birebir cümle | — | ✅ |

**§number fabrikasyon: 0** ✅ (F8, F10, F17 stable — guard rail prompt korunmalı)
**Toplam alıntı düzeltmesi: 1** (FN-02 parafraz birleşim — minor)

### 9.3 11 pilot karşılaştırma

| Boyut | F8 | F9 | F10 | **F17** |
|---|---|---|---|---|
| Skor | 9.5 | 8.5 | 9 | **8.5** |
| İterasyon | 1 | 1 | 1 | **1+1** (extension reverse flow için) |
| Fonksiyon (final) | 9 | 7 | 15 | **13** (10 + 3 extension) |
| Alıntı hatası | 1 | 2 | 1 | **1** |
| §number fabrikasyon | 0 | 1 | 0 | **0** ✅ |
| Yeni paradigma | Toll | Carbon | Orchestrator | **Geofence type extension** |

**F17 gözlemleri:**
- §number fabrikasyon = 0 zinciri devam (F8-F10-F17)
- Extension round verimli — 3 yeni fonksiyon + schema eklemesi temiz
- Yeni paradigma: **mevcut public.* schema extension** — yeni tablo gerekmedi
- Cem'in "we do with geofence" notu prompt'ta vurgulanması NotebookLM'in altyapıyı doğru kavramasını sağladı

### 9.4 NotebookLM trend yorumu

F8-F17 zincirinde 4 sapma yok:
- F8 (Vrachtwagenheffing): 0 fabrikasyon
- F9 (Carbon): 1 fabrikasyon (§188)
- F10 (Exception): 0 fabrikasyon
- F17 (Locker): 0 fabrikasyon

**Hipotez güçlendi:** F9'un §188 hatası **bir kerelik sapma** idi. Guard rail prompt ("ADR-0010 §3.4'ten yüksek section YOK") sürekli korunmalı.

Sonraki pilotlar (FEAT-014, FEAT-018 ardışık) için aynı disiplin korunacak.

---

## 10. Next steps

### 10.1 Cross-spec sync — FEAT-010 + Mega sync (✅ TAMAMLANDI 2026-05-30)

**1. sync (sabah):** FEAT-017:FN-12 expiry handler FEAT-010 exception_events tablosuna yazar:
- ✅ `exception_type` CHECK constraint'e `'locker_pickup_expired'` eklendi
- ✅ §4 Severity matrix `locker_pickup_expired` 2 entry (medium, high — customer SLA breach)
- ✅ §2 FN-06 logExceptionEvent shared kolonuna FEAT-017 eklendi

**Toplu commit ile birlikte:** FEAT-014 (`tender_withdrawn`, `tender_no_quotes`) + FEAT-018 (`returns_pickup_failed`, `rts_warehouse_unreachable`).

**2. mega sync (akşam):** FEAT-019 + FEAT-103 location_type genişletmesi:
- ✅ `public.geofences.location_type` enum +7 yeni değer (FEAT-019: truck_parking, secured_parking, hotel, fuel_station, rest_area, border_crossing; FEAT-103: charging_station)
- ✅ INDEX güncellendi (tüm location_type'lar için)
- §6.1 schema bloğu güncellendi

**Toplam:** 11 + 7 = 18 değer tablo dahilinde (1 default + 4 FEAT-017 + 6 FEAT-019 + 1 FEAT-103).
- ✅ `exception_type` CHECK constraint'e `'locker_pickup_expired'` eklendi
- ✅ §4 Severity matrix `locker_pickup_expired` 2 entry (medium, high — customer SLA breach)
- ✅ §2 FN-06 logExceptionEvent shared kolonuna FEAT-017 eklendi

**Toplu commit ile birlikte:** FEAT-014 (`tender_withdrawn`, `tender_no_quotes`) + FEAT-018 (`returns_pickup_failed`, `rts_warehouse_unreachable`) — toplam 5 yeni enum value tek commit'te.

### 10.2 Phase 1.1 implementation backlog

- [ ] Schema migration: `public.geofences.location_type` + INDEX
- [ ] Schema migration: `enterprise.dispatch_tasks.allow_locker_fallback`
- [ ] Schema migration: `enterprise.dispatch_tasks.metadata` JSONB key additions
- [ ] FN-01 findNearbyLockers (PostGIS ST_DWithin)
- [ ] FN-02 suggestLockerFallback
- [ ] FN-03 POST /reroute-to-locker
- [ ] FN-04 updateGeofenceLocationType
- [ ] FN-05 buildHereProblemWithLockers (FEAT-001 cross-spec sync)
- [ ] FN-06 onLockerGeofenceEntry (MQTT subscriber)
- [ ] FN-09 `<LockerSelectionMap />` (Leaflet)
- [ ] FN-10 GET /api/dispatcher/lockers
- [ ] FN-11 onCustomerLockerDropoff (manuel entry endpoint)
- [ ] FN-12 monitorLockerPickupExpiry (hourly cron)
- [ ] FEAT-010 cross-spec sync (locker_pickup_expired enum)

### 10.3 Phase 2 implementation backlog (customer-funded trigger)

- [ ] Schema migration: `public.geofences.partner_provider`
- [ ] FN-07 fetchPartnerLockerAvailability
- [ ] FN-08 generateLockerAccessCode
- [ ] FN-13 getCachedLockerAvailability (Redis 10dk TTL)
- [ ] Partner integrations: PostNL Pakketautomaat (priority 1), Bpost (priority 2), Amazon Locker (customer-funded)
- [ ] FN-11 partner webhook variant

### 10.4 Sıradaki pilot

**FEAT-014 W13 Multi-carrier Tender Management** — Cem'in 7 pilot listesinde 2. sırada.

Yeni paradigma: external carrier API tender broadcasting + quote comparison. Phase 2 customer-funded (ADR-0011 §6).

---

## 11. References

- ADR-0001 §3.6 (UI primitives — Forms, modals)
- ADR-0002 §3.2 (HERE native constraint modeling), **§5** (MatrixCache pattern)
- ADR-0004 v3 §6 (additive public.* + enterprise.* changes)
- ADR-0005 §4.1 (Mode 1 dispatcher modify pattern)
- ADR-0006 §3.1 (Map inspection-oriented)
- ADR-0007 §3.2 (third-party API consumer pattern)
- ADR-0009 §4.1 (grants matrix — public.geofences SELECT), §4.2 (MQTT subscribe), §4.4 (dispatcher → driver flow)
- ADR-0011 §9.5 (endpoint patterns)
- ADR-0012 §4.7 (PostGIS Phase 3 scale altyapı)
- FEAT-001 spec v3 (FN-016 buildHereProblem extension)
- FEAT-002 spec (FN-02 POST /replan re-route pattern)
- FEAT-003 spec (FN-07 suggestion pattern, order ingestion)
- FEAT-005 spec v2 (FN-02 MQTT subscriber, FN-06 map widget)
- FEAT-010 spec (FN-06 logExceptionEvent — cross-spec sync TODO for `locker_pickup_expired`)
- **FEAT-011 PoD Capture** (henüz spec yok — UNCERTAINTIES #3 driver barkod onay kesişimi, yazılırken FEAT-017 entegrasyon noktası eklenmeli)
- NotebookLM session 2026-05-30 (1+1 prompt, 8.5/10 skor)

---

## 12. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-30 | Cem Sahinkaya (with Claude + NotebookLM cowork) | İlk konsolide function spec. On birinci pilot — locker/PUDO management, wishlist W17 (Cem notu: "we do with geofence"). 13 fonksiyon (FN-01..FN-13), Phase 1.1: 10, Phase 2: 3. **Yeni paradigma: Geofence type extension** — mevcut `public.geofences` tablosu extend edilir, yeni tablo gerekmez. ADR-0004 v3 §6 additive pattern signature-level uygulaması. Round 1 (10 fn) initial pilot, Round 2 (3 fn) extension — reverse flow (FN-11 onCustomerLockerDropoff), expiry handler (FN-12 monitorLockerPickupExpiry, FEAT-010 entegrasyonu), Redis cache (FN-13 getCachedLockerAvailability). Schema değişiklikleri: `public.geofences.location_type` + `partner_provider`, `enterprise.dispatch_tasks.allow_locker_fallback` (opt-in default false), `enterprise.dispatch_tasks.metadata` JSONB locker payload, `public.companies.settings.locker_fallback` JSONB config. Konsolidasyon düzeltmeleri: FN-02 ADR-0005 §4.1 parafraz birleşim → birebir cümle (dispatcher modify pattern), schema kararları netleştirildi, partner provider Phase 2 ayrımı korundu. Cross-spec sync TODO: FEAT-010 spec'inde `exception_type` enum'a `'locker_pickup_expired'` eklenmeli (§10.1). UNCERTAINTIES: #3 PoD kesişimi FEAT-011 spec'ine bırakıldı (driver barkod onay disiplini). §number fabrikasyon = 0 ✅ (F8-F10-F17 zinciri stable). |
| 1.1 (cross-spec sync close) | 2026-05-30 | Cem Bakir + Claude | §10.1 cross-spec sync TODO kapatıldı — FEAT-010 spec'inde `exception_type='locker_pickup_expired'` enum + §4 Severity matrix + FN-06 shared kolonu eklendi (toplu commit FEAT-014 + FEAT-018 ile birlikte). FEAT-017 spec'inde değişiklik YOK, sadece TODO işaretleme. |
| 1.2 (mega cross-spec sync) | 2026-05-30 | Cem Bakir + Claude | **§6.1 location_type enum +7 yeni değer** — FEAT-019 (truck_parking, secured_parking, hotel, fuel_station, rest_area, border_crossing) + FEAT-103 (charging_station). §10.1 cross-spec sync TODO güncellendi (1. sync + 2. mega sync ayrı belgelendi). Tablo dahilinde 12 location_type değer (1 default + 4 F017 + 6 F019 + 1 F103). Schema değişikliği additive (CHECK constraint genişlemesi), production deployment forward-compatible. FEAT-019 + FEAT-103 spec'leri location_type değerlerini kullanır, FEAT-017 schema sahipliği korunur. Geofence type extension paterni F017→F019→F103 zinciri (mimari tutarlılık). 17 pilot toplam, mega cross-spec sync atomic commit. |
