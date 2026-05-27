# FEAT-006 — Automated Appointment Scheduling

| Field | Value |
|---|---|
| **Feature ID** | FEAT-006 |
| **Source** | Feature Wishlist #6 — "Automated Appointment Scheduling" |
| **Frequency rating** | Common (industry-wide) |
| **Tulipfleet Phase** | Phase 1 (data model + manual/suggested scheduling) + Phase 2 (AI parsing + WMS auto-negotiation) |
| **Relation to ADR-0011** | **FEAT-006 ⊂ FEAT-108** — FEAT-006 task duration model + appointment data layer (Phase 1); FEAT-108 WMS connector layer (Phase 2). Detay §1.3. |
| **Status** | Function spec drafted via NotebookLM (1 prompt, 2026-05-27) |
| **Pilot note** | Altıncı pilot. Tek iterasyonda 9/10 skor. **Cross-feature etki yüksek** — FEAT-001 schema genişlemesi + FEAT-005 FN-03 imza evrimi gerekli. |

---

## 1. Feature description

> *"Automated Appointment Scheduling: AI agents manage dock and facility visit times without manual intervention to reduce administrative burden on dispatchers."*

### 1.1 Müşterinin kritik notu — task duration breakdown

Wishlist'te bu feature'ın yanında müşteri (Cem) şu notu eklemiş:

> *"drive time, dock time (check-in/check-out considered as driver wait times), rest time should consider for task time and delivery time"*

Bu not, statik bir `estimated_duration` field'ından dinamik bir **task timeline model**'ine geçişi zorunlu kılar. Detay §4 (Task Duration Model Impact).

### 1.2 Üç komponent

Task süresi üç ana komponentten oluşur:

| Komponent | Kaynak | TulipFleet katmanı |
|---|---|---|
| **Drive time** | HERE Routing API (mevcut, FEAT-005 FN-01) | Consumer |
| **Dock / wait time** | Appointment scheduling sistemi (FEAT-006 yeni) | Owner — facility_metadata + dock_appointments |
| **Rest time** | EU 561/2006 driver shift kuralları | Calculated — FN-05 evaluateRestRequirement |

### 1.3 Kapsam — FEAT-006 vs FEAT-108

ADR-0011 §6 Phase 2 use case listesinde **FEAT-108 "Yard / Ramp appointment integration (WMS connector)"** zaten var. Trigger: *"Large 3PL customer with Manhattan/SAP EWM signs"*.

FEAT-006 wishlist maddesi ile FEAT-108 büyük ölçüde örtüşüyor — ama **birebir aynı değil**. NotebookLM analizi:

| Boyut | FEAT-006 (Wishlist #6) | FEAT-108 (ADR-0011 §6) |
|---|---|---|
| **Scope** | Dock/facility randevu **veri modeli** + **task duration** evrimi + AI parsing | Yard, Ramp ve WMS (SAP EWM / Manhattan) sistemleriyle **derin entegrasyon** |
| **Phase** | Phase 1 (veri modeli + öneri) + Phase 2 (AI agent) | Phase 2 (customer-funded WMS connector) |
| **Trigger** | Statik task duration yetersizliği — Phase 1'de gerekli | Large 3PL customer signed contract |
| **Sonuç** | **FEAT-006 ⊂ FEAT-108** | FEAT-006'nın Phase 2 WMS katmanı = FEAT-108 |

**Karar gerekçesi:**

> Randevu sürelerini hesaba katmadan doğru bir VRP veya ETA üretmek mümkün değildir. Bu nedenle FEAT-006'nın veri modeli ve süre breakdown'u **Phase 1'de kurulmalı**. "AI Agent" ve "Full WMS Integration" kısımları Phase 2'ye (FEAT-108 içeriği) ait.

Bu spec, FEAT-006'nın **Phase 1 + Phase 2 AI/öneri** katmanlarını listeler. Phase 2 WMS deep integration (SAP EWM, Manhattan vb. connector geliştirme) FEAT-108 spec'i yazıldığında detaylanır.

### 1.4 Kapsam — içeride

- `enterprise.dock_appointments` tablosu (Phase 1 yeni)
- `enterprise.facility_metadata` tablosu (Phase 1 schema-ready)
- `enterprise.dispatch_tasks.estimated_duration` field genişlemesi (additive, ADR-0004 v3 §6)
- Task timeline endpoint + UI picker (Phase 1)
- HERE Tour Planning service duration parametre enjeksiyonu (FEAT-001 buildHereProblem güncelleme)
- LLM-based appointment document parsing (Phase 2, ADR-0010 §4 consumer pattern)
- WMS auto-negotiation iskeleti (Phase 2, FEAT-108 implementation'ında doldurulur)

### 1.5 Kapsam — dışarıda

- **Full WMS deep integration** — FEAT-108 domain'i (SAP EWM, Manhattan API connector)
- **In-house ML / AI training** — ADR-0010 §2 yasak (LLM consumer kabul, producer yasak)
- **Driver mobile app onboard appointment management** — sadece backend-driven Phase 1; driver app değişikliği Phase 2 koordinasyonu

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Phase | Shared with FEAT-001/002/003/004/005? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FEAT-006-FN-01 | backend | `calculateTotalTaskDuration` | drive, dock, rest, buffer | totalDuration | — | — | — | ADR-0002 §3.2 — "HERE Tour Planning natively models constraints (vehicle height, cold chain, driver shift rules, mixed pickup/delivery, refueling stops)" | 1 | — |
| 2 | FEAT-006-FN-02 | backend | `POST /api/dispatcher/tasks/:id/appointment` | appointmentData, (JWT.company_id) | Success | — | enterprise.dock_appointments | — | ADR-0004 v3 §6 — Additive enterprise.* schema changes authorized | 1 | — |
| 3 | FEAT-006-FN-03 | backend | (evolves FEAT-005:FN-03 `refreshTaskEtas`) | vehicleId, **context: { appointments, restPlan }** | TaskEtas[] | enterprise.dock_appointments, enterprise.dispatch_tasks | enterprise.dispatch_tasks | HERE Routing | ADR-0011 §8.1 — "Predictive ETA with live traffic — FEAT-003" | 1 | **FEAT-005:FN-03 — imza evrimi**, ayrı fonksiyon değil |
| 4 | FEAT-006-FN-04 | backend | `parseAppointmentDocument` | file / text | AppointmentJSON | — | — | LLM API | ADR-0010 §4 — "Using ML-powered APIs (HERE, future map providers, future translation/NLP APIs). Allowed and encouraged." | 2 | shared with FEAT-105 (AI agent ingestion altyapısı) |
| 5 | FEAT-006-FN-05 | backend | `evaluateRestRequirement` | driverId, tourData | RestInterval[] | public.drivers | — | — | ADR-0002 §3.4 — "Hard constraints (HERE will not produce a route violating these): Vehicle capacity... Driver shift hours: legal max driving hours and mandatory rest periods" | 1 | — |
| 6 | FEAT-006-FN-06 | backend | `suggestAppointmentWindow` | taskId, driverId, (JWT.company_id) | TimeWindow | enterprise.dispatch_tasks, enterprise.facility_metadata | — | — | ADR-0005 §4.1 — "System suggests dispatch decisions." | 1 | — |
| 7 | FEAT-006-FN-07 | shared_library | (extends FEAT-001:FN-016 `buildHereProblem`) | tasks, appointments, vehicles, complianceZones | HERE_JSON | enterprise.dock_appointments | — | — | ADR-0002 §3.2 — "HERE Tour Planning natively models constraints (vehicle height, cold chain, driver shift rules, mixed pickup/delivery, refueling stops)" | 1 | **FEAT-001:FN-016 — service duration parametresi eklenir**, cross-feature schema update |
| 8 | FEAT-006-FN-08 | worker | `appointmentAutoNegotiator` | taskContext | void | enterprise.dispatch_policies | enterprise.dock_appointments | WMS API (via FEAT-108) | ADR-0005 §5.3 — "If rules permit, system auto-assigns and dispatches." | 2 | overlap with FEAT-108 — implementation FEAT-108 spec'inde |
| 9 | FEAT-006-FN-09 | frontend | `<AppointmentPicker />` | taskId | UI Component | — | — | — | ADR-0001 §3.6 — "Forms, modals, navigation, layout primitives" | 1 | — |
| 10 | FEAT-006-FN-10 | backend | `GET /api/dispatcher/tasks/:id/timeline` | id, (JWT.company_id) | TimelineJSON | enterprise.dispatch_tasks, enterprise.dock_appointments | — | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 1 | — |

**Konsolidasyon notları:**
- **FN-01 / FN-07 ADR ref düzeltmesi:** NotebookLM "ADR-0002 §3.1" demişti; gerçek alıntı **§3.2** ("Why HERE Tour Planning over Routific", Constraint depth paragrafı). Düzeltildi.
- **FN-03 evrim notu:** Yeni fonksiyon değil — FEAT-005:FN-03'ün imza genişlemesi. FEAT-005 spec'inde `refreshTaskEtas(vehicleId, currentLocation)` imzası, FEAT-006 implementation'ında `refreshTaskEtas(vehicleId, context)` olarak evrilir. `context` artık `currentLocation + appointments + restPlan`'i içerir. **FEAT-005 spec'inde forward-compatibility notu eklenmeli** (§7 cross-spec sync).
- **FN-07 cross-feature schema update:** FEAT-001:FN-016 `buildHereProblem` Phase 1 implementation'ında `service_duration_seconds` parametresini kabul edecek şekilde yazılmalı. **FEAT-001 spec'inde de bu not eklenmeli.**
- **FN-08 WMS API:** Implementation detayı FEAT-108 spec'inde detaylanır; bu spec sadece signature ve placeholder.

---

## 3. Task scheduling pipeline

### 3.1 Phase 1 (manual / suggested scheduling)

```
Dispatcher creates task
        ↓
suggestAppointmentWindow              (FN-06)
   └─ Reads enterprise.facility_metadata
       (facility default dock duration)
   └─ Reads enterprise.dispatch_tasks
       (existing tour context)
        ↓
Returns proposed time window
        ↓
<AppointmentPicker />                 (FN-09)
   └─ Dispatcher reviews + adjusts
        ↓
POST /api/dispatcher/tasks/:id/appointment  (FN-02)
   └─ Writes enterprise.dock_appointments
       (status='pending')
        ↓
evaluateRestRequirement               (FN-05)
   └─ EU 561/2006 driver shift kuralları
   └─ Reads public.drivers (shift schedule)
   └─ Returns required rest intervals
        ↓
calculateTotalTaskDuration            (FN-01)
   └─ drive (HERE) + dock (appointment)
     + rest (FN-05) + buffer
        ↓
Updates enterprise.dispatch_tasks
   (estimated_duration evrimi — §4)
        ↓
buildHereProblem                      (FN-07, FEAT-001:FN-016 ile shared)
   └─ Service duration injected
   └─ HERE Tour Planning solver
        ↓
GET /api/dispatcher/tasks/:id/timeline  (FN-10)
   └─ Returns: { drive, service, rest, buffer, eta }
   └─ Dispatcher UI'da timeline gösterir
```

### 3.2 Phase 2 delta (AI parsing + WMS auto-negotiation)

```
Customer email / PDF / EDI gelir
        ↓
parseAppointmentDocument              (FN-04, Phase 2)
   └─ LLM API (ADR-0010 §4 consumer pattern)
   └─ Returns: AppointmentJSON
   └─ FEAT-105 (AI agent) ile aynı LLM ingestion
        ↓
appointmentAutoNegotiator             (FN-08, Phase 2)
   └─ Reads enterprise.dispatch_policies (auto-negotiation rules)
   └─ WMS API call (via FEAT-108 connector)
       - SAP EWM, Manhattan, vb.
   └─ Writes enterprise.dock_appointments
       (status='confirmed' or 'pending')
        ↓
[Mode 2 disiplini — exception olursa dispatcher'a düşer]
   └─ FEAT-003 evaluateDispatchPolicy ile uyumlu
        ↓
ETA feedback loop (§6)
   └─ refreshTaskEtas (FN-03) tetiklenir
   └─ Appointment violation → FEAT-002 alert
```

---

## 4. Task duration model impact — kritik mimari karar

Müşterinin notu (*"drive + dock + rest = task time"*) bir **schema evrim** kararı zorunlu kılar. ADR-0004 v3 §6 additive pattern uygulanır.

### 4.1 Mevcut durum (varsayım)

`enterprise.dispatch_tasks` muhtemelen şu an tek field tutuyor:

```sql
estimated_duration_seconds  INTEGER  -- HERE'den gelen drive time only
```

Bu, sadece HERE drive time'ı yansıtıyor. Dock + rest dahil değil — **müşteri notunda belirtilen eksiklik**.

### 4.2 Phase 1 schema genişlemesi (additive)

```sql
-- ADR-0004 v3 §6 additive pattern
ALTER TABLE enterprise.dispatch_tasks
  ADD COLUMN drive_duration_seconds    INTEGER,
  ADD COLUMN service_duration_seconds  INTEGER,  -- dock + check-in/out wait
  ADD COLUMN rest_duration_seconds     INTEGER,  -- EU 561/2006
  ADD COLUMN buffer_duration_seconds   INTEGER DEFAULT 0,  -- operasyonel pay
  ADD COLUMN total_duration_seconds    INTEGER GENERATED ALWAYS AS (
    COALESCE(drive_duration_seconds, 0)
    + COALESCE(service_duration_seconds, 0)
    + COALESCE(rest_duration_seconds, 0)
    + COALESCE(buffer_duration_seconds, 0)
  ) STORED;

-- estimated_duration_seconds eski field'ı korunur (backward compat),
-- generated column ile aynı değeri tutmasını sağlamak için trigger
-- veya migration sırasında veri taşıma kararı verilir.
```

**Migration disiplini:**
- ADR-0004 v3 §2 schema authority — `tulipfleet-backend/migrations/`'da yazılır
- Phase 1 trigger: FEAT-006 implementation öncesi
- Backward compatibility: eski `estimated_duration_seconds` field'ı korunur, generated column ile senkron

### 4.3 calculateTotalTaskDuration (FN-01)

Bu fonksiyon **uygulama katmanında** çalışır (DB'deki GENERATED column DB-level guarantee için ama application-level hesaplama da yapılır):

```typescript
function calculateTotalTaskDuration(
  drive: number,
  dock: number,
  rest: number,
  buffer: number = 0
): number {
  return drive + dock + rest + buffer;
}
```

**Tam toplam, `estimated_arrival_at` (FEAT-005 ETA) hesaplamasına feed edilir** (§6 ETA feedback loop).

### 4.4 Cross-feature etki

Bu schema değişikliği **etkileyen feature'lar**:

| Feature | Etki |
|---|---|
| **FEAT-001** | buildHereProblem (FN-016) `service_duration_seconds` parametresini HERE Tour Planning'e enjekte etmeli |
| **FEAT-002** | calculateEtaDeviation (FN-11) artık 4-komponent breakdown'a karşı sapma ölçer |
| **FEAT-005** | refreshTaskEtas (FN-03) `context: { appointments, restPlan }` alır, 4-komponent toplar |
| **FEAT-003** | calculateMatchingScore — task duration timeWindow score'una etki |

**FEAT-001 ve FEAT-005 spec'lerinde bu schema değişikliği için "future evolution" notu eklenmeli** (§7).

---

## 5. AI agent disiplin check (ADR-0010 §4)

FEAT-006'nın "AI agents manage dock" gereksinimi için **disiplin kontrolü**:

| Yaklaşım | İzin verilir mi? | Gerekçe |
|---|---|---|
| Kendi randevu optimizasyon ML modeli eğitmek | ❌ Yasak | ADR-0010 §2 — Phase 1-2'de in-house ML yok |
| Üçüncü-parti LLM (GPT-4, Claude) API ile e-posta/PDF parsing | ✅ Kabul | ADR-0010 §4 — "Using ML-powered APIs... future translation/NLP APIs. Allowed and encouraged." |
| Rule-based randevu öneri (FN-06 suggestAppointmentWindow) | ✅ Kabul | ADR-0010 §2 — "Cost functions are not ML. Tunable objective weights... are configuration" |
| WMS API'sinden randevu çekme/atama (FN-08) | ✅ Kabul (Phase 2) | ADR-0007 §2 madde 3 — customer-funded connector |

**Sonuç:** FEAT-006 Phase 2 AI komponentleri **LLM API consumer pattern**'ine sıkı sıkıya bağlı kalır. FEAT-105 (AI agent order parsing) ile aynı altyapı (FN-04 birebir paylaşım).

---

## 6. ETA feedback loop (FEAT-005 ile cross-feature)

FEAT-006 randevu değişiklikleri **FEAT-005 ETA pipeline'ını doğrudan etkiler**:

### 6.1 İmza evrimi — FEAT-005:FN-03 `refreshTaskEtas`

**FEAT-005 spec'indeki orijinal imza:**
```typescript
refreshTaskEtas(vehicleId: UUID, currentLocation: LatLng): TaskEta[]
```

**FEAT-006 implementation'ından sonra (Phase 1):**
```typescript
refreshTaskEtas(
  vehicleId: UUID,
  context: {
    currentLocation: LatLng,
    appointments?: Appointment[],
    restPlan?: RestInterval[]
  }
): TaskEta[]
```

**Bu breaking change DEĞİL** — `context` object'i opsiyonel field'larla genişletilir. FEAT-005 Phase 1 implementation'ında bu **forward-compatible** olarak yazılmalı (Cross-spec note §7).

### 6.2 Appointment violation alert

Eğer randevu saati kaçırılırsa (`current_eta > appointment.window_end`):

```
refreshTaskEtas detects violation
        ↓
calculateEtaDeviation (FEAT-002:FN-11)
   └─ Severity = 'critical' (appointment violation)
        ↓
notifyDispatcherException (FEAT-003:FN-14, Phase 2)
   veya direct
GET /api/dispatcher/alerts (FEAT-002:FN-12, Phase 2)
   └─ Alert type: 'appointment_violation'
        ↓
<NotificationToast /> (FEAT-002:FN-13)
   └─ Dispatcher UI'da görünür
```

Bu zincir **5 ayrı feature'dan fonksiyon** çağırıyor — cross-feature integration matürite örneği.

---

## 7. Cross-spec consistency — diğer FEAT dosyaları güncellenmeli

Bu konsolidasyon **3 dosyada güncelleme** gerektiriyor:

### 7.1 FEAT-001 spec güncellemesi

`docs/functions/FEAT-001-multi-vehicle-vrp.md` içinde:
- FN-016 `buildHereProblem` Inputs kolonuna **`appointments?` opsiyonel parametre** eklenmeli
- §X "Future evolution" notu: *"FEAT-006 implementation'ı service_duration_seconds parametresinin HERE Tour Planning request payload'a eklenmesini gerektirecek. Phase 1'de forward-compatible olarak yazılır."*

### 7.2 FEAT-005 spec güncellemesi

`docs/functions/FEAT-005-predictive-eta-estimation.md` içinde:
- FN-03 `refreshTaskEtas` Inputs kolonu güncellenir: `vehicleId, context: { currentLocation, appointments?, restPlan? }`
- §X "Future evolution" notu: *"FEAT-006 implementation'ı context object'i appointments ve restPlan ile genişletecek. Phase 1'de signature forward-compatible olarak yazılır (opsiyonel field'lar)."*

### 7.3 ADR-0004 v3 §6 güncellemesi (opsiyonel — düşük öncelik)

ADR-0004 v3 §6'da listelenen 4 additive Phase 1 değişikliği:
- `users.role`, `tasks.enterprise_dispatch_task_id`, `companies.dispatch_mode`, `vehicles` capacity columns

FEAT-006 Phase 1 implementation **5. additive değişikliği** ekler:
- `dispatch_tasks` duration breakdown columns (4 yeni kolon)

ADR-0004 v3 §6 listesine ekleme yapılabilir veya ADR amendment olarak işlenebilir. **Şu an karar değil** — implementation öncesi Cem değerlendirir.

---

## 8. Database tables

### 8.1 Phase 1 yeni — `enterprise.dock_appointments`

```sql
CREATE TABLE enterprise.dock_appointments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    dispatch_task_id    UUID NOT NULL REFERENCES enterprise.dispatch_tasks(id) ON DELETE CASCADE,
    facility_id         UUID REFERENCES enterprise.facility_metadata(id),
    dock_number         TEXT,
    appointment_start   TIMESTAMPTZ NOT NULL,
    appointment_end     TIMESTAMPTZ NOT NULL,
    status              TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'arrived', 'completed', 'no_show', 'cancelled')) DEFAULT 'pending',
    source              TEXT NOT NULL CHECK (source IN ('manual', 'ai_parsed', 'wms_auto')) DEFAULT 'manual',
    source_metadata     JSONB,  -- LLM parse result, WMS reference ID, etc.
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (appointment_end > appointment_start)
);

CREATE INDEX idx_dock_appointments_task ON enterprise.dock_appointments (dispatch_task_id);
CREATE INDEX idx_dock_appointments_facility ON enterprise.dock_appointments (facility_id, appointment_start);
CREATE INDEX idx_dock_appointments_company ON enterprise.dock_appointments (company_id, status);
```

### 8.2 Phase 1 schema-ready — `enterprise.facility_metadata`

```sql
CREATE TABLE enterprise.facility_metadata (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id                  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    facility_name               TEXT NOT NULL,
    address                     TEXT,
    latitude                    NUMERIC(10, 7),
    longitude                   NUMERIC(10, 7),
    default_dock_duration_min   INTEGER NOT NULL DEFAULT 30,  -- Phase 1 default 30 min
    historical_avg_duration_min INTEGER,  -- Phase 2'de doldurulur (analytics)
    dock_count                  INTEGER,
    operating_hours             JSONB,  -- {"mon": "08:00-18:00", ...}
    wms_provider                TEXT CHECK (wms_provider IN ('sap_ewm', 'manhattan', 'custom', NULL)),
    wms_facility_ref            TEXT,  -- FEAT-108 için
    metadata                    JSONB,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, facility_name)
);

CREATE INDEX idx_facility_metadata_company ON enterprise.facility_metadata (company_id);
```

**Schema-ready not:** Tablo Phase 1'de oluşturulur, ama `historical_avg_duration_min` + `wms_provider` + `wms_facility_ref` field'ları **boş kalır**, Phase 2 (FEAT-108) implementation'da doldurulur.

### 8.3 Phase 1 schema evolution — `enterprise.dispatch_tasks`

§4.2'de detaylanan additive 4-komponent duration breakdown.

---

## 9. Shared infrastructure with previous FEAT'leri

| FEAT-006 fonksiyon | Shared with | Paylaşım türü |
|---|---|---|
| FN-03 refreshTaskEtas | FEAT-005:FN-03 | **İmza evrimi** — aynı fonksiyon, context parametresi genişler |
| FN-04 parseAppointmentDocument | FEAT-105 (Phase 2) | LLM ingestion altyapısı paylaşılır |
| FN-07 buildHereProblem | FEAT-001:FN-016 | **Schema güncelleme** — service_duration parametresi eklenir |
| FN-08 appointmentAutoNegotiator | FEAT-108 (Phase 2) | WMS API katmanı FEAT-108 implementation'da |

**Sonuç:** 4 fonksiyon shared/cross-feature. Yeni geliştirme oranı %60 — Phase 1'de **5 yeni fonksiyon** (FN-01, FN-02, FN-05, FN-06, FN-09, FN-10 = 6), Phase 2'de **2 yeni** (FN-04, FN-08).

Yeni özellik: **cross-feature schema güncellemesi** ilk kez bu kadar belirgin — FEAT-001 ve FEAT-005 spec'lerinde geri dönük güncelleme zorunlu.

---

## 10. UNCERTAINTIES (Cem onayı bekleyen)

### NotebookLM çıktısından

1. **EU 561/2006 rest time hesaplama yeri:** Driver shift hours TulipFleet tarafında (FN-05) mı, HERE solver'a mı bırakılacak? ADR-0002 §3.4 "Driver shift hours: legal max driving hours and mandatory rest periods" demiş — HERE bunu zaten constraint olarak alıyor. Çift hesaplama olmamalı.

2. **Dock duration default değer:** Phase 1'de tesis bazlı sabit (30 dk default) mı, yoksa task type'a göre değişken mi (örn. pickup vs delivery)? Phase 2'de historical average geçilir.

3. **WMS API standartları (Phase 2):** SAP EWM, Manhattan, custom — her biri farklı API. ADR-0007 §5.3 normalization layer pattern bu çeşitliliği nasıl absorbe eder? FEAT-108 spec'inde detaylanır.

### Pilot süreçte tespit edilen

4. **Appointment violation severity:** Geç kaldı (5 dk) vs çok geç kaldı (30 dk) — farklı severity'ler mi? FEAT-002 alert sistemine `appointment_violation_severity` enum eklenmeli mi?

5. **`enterprise.facility_metadata` schema-ready timing:** Phase 1'de tablo oluşturulup boş mu kalır, yoksa Phase 2 trigger'da mı oluşturulur? Schema-ready yaklaşımı ADR-0007 §5 "architectural hooks inert" pattern'iyle uyumlu — Phase 1'de oluşturmak öneriliyor.

6. **AppointmentPicker UI ile manual entry akışı:** Dispatcher randevu girerken HERE Routing API gerçek zamanlı drive time önerisi yapacak mı (FN-06 suggestAppointmentWindow), yoksa sadece statik form mu?

7. **ADR-0004 v3 §6 listesine ekleme:** FEAT-006 4 yeni column ekler — bu ADR-0004 v3 §6 "authorized additive" listesine eklenmeli mi (5. madde) yoksa ADR amendment olarak işlenmeli mi?

---

## 11. Pilot süreç notları

### 11.1 Pilot akışı (2026-05-27)

Tek prompt + 0 follow-up. NotebookLM **tek iterasyonda** 9/10 — verim artışının zirvesi.

**Doğru tespit edilen kritik kararlar:**
- FEAT-006 ⊂ FEAT-108 kapsam disiplini (yeni feature uydurmak yerine mevcut ADR FEAT-108'in alt-kümesi tanımladı)
- Task duration 4-component breakdown (cross-feature schema impact)
- ADR-0010 §4 LLM consumer pattern (in-house ML yasak, LLM API kabul)
- ETA feedback loop FEAT-005 ile entegrasyon

### 11.2 Alıntı doğrulama

| Reference | Test sonucu | Düzeltme |
|---|---|---|
| ADR-0002 §3.1 (HERE natively models) | ❌ §3.1 "Why HERE over OR-Tools", alıntı **§3.2** "Why HERE over Routific" | → §3.2 |
| ADR-0010 §4 (LLM API allowed) | ✅ Birebir doğrulandı | — |
| ADR-0004 v3 §6 (additive) | ✅ Önceki turlarda (FEAT-004'te düzeltildi) | — |
| ADR-0011 §8.1 (FEAT-003 HERE Native) | ✅ FEAT-005'te doğrulandı | — |
| ADR-0002 §3.4 (Hard constraints driver shift) | ✅ Bizim addendum'umuz | — |
| ADR-0005 §4.1 (system suggests) | ✅ Önceki turlarda | — |
| ADR-0005 §5.3 (rules permit auto-assign) | ✅ FEAT-003'te doğrulandı | — |
| ADR-0001 §3.6 | ✅ Önceki turlarda | — |
| ADR-0011 §9.5 | ✅ Önceki turlarda | — |

**1 §numara düzeltmesi (§3.1 → §3.2).** Pattern devam ediyor — alıntı doğru, bölüm yanlış. 6 pilot sonunda **stabil bir uyarı**: section adresleme her konsolidasyonda spot check zorunlu.

### 11.3 6 pilot karşılaştırması

| Boyut | F1 | F2 | F3 | F4 | F5 | **F6** |
|---|---|---|---|---|---|---|
| Skor | 9 | 9.5 | 9 | 9 | 8.5 | **9** |
| İterasyon | 5 | 3 | 2 | 1+1 | 1+3 | **1** |
| Fonksiyon | 16 | 16 | 16 | 12 | 12 | **10** |
| Yeni paradigma | VRP | Re-route | Dispatch | Multi-actor | HERE consume | **Task duration + FEAT-108 ⊂** |
| Cross-feature etki | — | F1 shared | F1 shared | F1/2/3 shared | F2 sibling | **F1+F5 schema/imza update** |

**Verim trendi (iterasyon):** 5 → 3 → 2 → 2 → 4 → **1**. NotebookLM cowork verimliliği zirveye ulaştı.

**Yeni patern — cross-feature implementation impact:** FEAT-006 ilk kez **önceki FEAT'lerin spec'lerine geri dönük güncelleme** zorunlu kılan feature. Bu, feature kataloğunun olgunlaşmasının doğal sonucu.

---

## 12. Next steps

### 12.1 Cross-spec sync (commit öncesi yapılacak)

FEAT-006 commit öncesi/sonrası 2 dosyada güncelleme:

**FEAT-001 spec güncellemesi (`docs/functions/FEAT-001-multi-vehicle-vrp.md`):**
- FN-016 buildHereProblem inputs kolonu güncellenir
- Yeni bölüm: "Future evolution from FEAT-006" — service_duration_seconds notu

**FEAT-005 spec güncellemesi (`docs/functions/FEAT-005-predictive-eta-estimation.md`):**
- FN-03 refreshTaskEtas inputs kolonu güncellenir
- Yeni bölüm: "Future evolution from FEAT-006" — context object genişlemesi

Bu güncellemeler **Phase 1 forward-compatibility** sağlar — FEAT-001 ve FEAT-005 implementation'ları, FEAT-006 geldiğinde **breaking change olmadan** genişleyebilir.

### 12.2 Phase 1 implementation backlog

ROADMAP Sıra 6 dispatcher endpoints kapsamında:
- [ ] Schema migration: `enterprise.dock_appointments` + `enterprise.facility_metadata` + `dispatch_tasks` duration breakdown columns (`tulipfleet-backend/migrations/`)
- [ ] FN-01 calculateTotalTaskDuration utility
- [ ] FN-02 POST appointment endpoint
- [ ] FN-05 evaluateRestRequirement (EU 561/2006)
- [ ] FN-06 suggestAppointmentWindow
- [ ] FN-09 `<AppointmentPicker />` UI
- [ ] FN-10 GET timeline endpoint
- [ ] FN-07 buildHereProblem genişletme (FEAT-001 ile koordine)
- [ ] FN-03 refreshTaskEtas genişletme (FEAT-005 ile koordine)

### 12.3 Phase 2 implementation (customer-funded — FEAT-108 ile birlikte)

- [ ] FN-04 parseAppointmentDocument (LLM API, FEAT-105 ile shared altyapı)
- [ ] FN-08 appointmentAutoNegotiator iskeleti (WMS API katmanı FEAT-108'de)
- [ ] `facility_metadata.wms_provider` + `wms_facility_ref` field'ları doldurulur
- [ ] `dock_appointments.source = 'ai_parsed'` veya `'wms_auto'` akışları aktive olur

### 12.4 FEAT-007 pipeline

FEAT-007 = wishlist #7 — "Driver Performance Coaching". Müşteri notu: *"we do this via adxl345"*. Bu, mevcut TulipFleet hardware (ADXL345 accelerometer) ile telematik veri akışını kullanır — FEAT-001..006'dan farklı domain (driver behavior analytics, ADR-0010 ML disiplini test edilir).

Bir sonraki pilot.

---

## 13. References

- ADR-0001 §3.6 (UI primitives)
- ADR-0002 §3.2 (HERE constraint depth — vehicle height, driver shift rules)
- ADR-0002 §3.4 (Constraint hierarchy — driver shift hours mandatory rest)
- ADR-0004 v3 §6 (Additive enterprise.* schema changes)
- ADR-0005 §4.1 (Mode 1 advisory — system suggests)
- ADR-0005 §5.3 (Mode 2 auto-dispatch — rules permit)
- **ADR-0010 §4** (LLM API consumer pattern — FEAT-006 Phase 2 cornerstone)
- ADR-0011 §6 FEAT-108 (Yard / Ramp WMS connector — FEAT-006 üst-kümesi)
- ADR-0011 §6 FEAT-105 (AI agent — FEAT-006 FN-04 paylaşımı)
- ADR-0011 §8.1 (Predictive ETA HERE Native — FEAT-005:FN-03 atfı)
- ADR-0011 §9.5 (endpoint patterns)
- FEAT-001 spec (FN-016 buildHereProblem cross-spec güncelleme)
- FEAT-002 spec (alert sistemi — appointment violation)
- FEAT-005 spec (FN-03 refreshTaskEtas imza evrimi)
- NotebookLM session 2026-05-27 (1 prompt, 9/10 skor)

---

## 14. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-27 | Cem Bakir (with Claude + NotebookLM cowork) | İlk konsolide function spec. Altıncı pilot — task duration breakdown model + FEAT-108 ⊂ ilişkisi. 10 fonksiyon (FN-01..FN-10). Phase 1: 8 fonksiyon (veri modeli + öneri akışı), Phase 2: 2 fonksiyon (LLM parsing + WMS auto-negotiation). Cross-feature etki yüksek — FEAT-001:FN-016 + FEAT-005:FN-03 imza/schema güncellemeleri gerekli. Konsolidasyon düzeltmeleri: §3.1→§3.2 (FN-01, FN-07 ADR ref), FN-03 imza evrimi açıklaması, FN-07 cross-feature schema update notu, FN-08 FEAT-108 overlap netleştirildi, facility_metadata schema-ready (Phase 1 boş, Phase 2 doldurulur). |
