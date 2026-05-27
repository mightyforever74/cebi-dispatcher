# FEAT-003 — Smart Auto-Dispatch

| Field | Value |
|---|---|
| **Feature ID** | FEAT-003 |
| **Source** | Feature Wishlist #3 — "Smart Auto-Dispatch" |
| **Frequency rating** | Common (industry-wide) |
| **Tulipfleet Phase** | Phase 1 (Advisory suggestions) + Phase 2 (FEAT-101 Mode 2 auto-dispatch) |
| **Status** | Function spec drafted via NotebookLM (2 prompt iterations, 2026-05-27) |
| **Pilot note** | Üçüncü pilot. Yeni paradigma (on-demand order matching). Skor 9/10 (§numara fabrikasyonu konsolidasyonda manuel düzeltildi). |

---

## 1. Feature description

> *"Smart Auto-Dispatch: This functionality intelligently matches on-demand orders to the most suitable available driver based on proximity, current capacity, and delivery windows."*

Bu feature **FEAT-001 ve FEAT-002'den farklı paradigma**:

| Boyut | FEAT-001 | FEAT-002 | **FEAT-003** |
|---|---|---|---|
| Tetik | Dispatcher butonu (sabah) | Manuel buton veya event | **Yeni order (API/webhook/manuel)** |
| Veri | Bütün gün planı | Aktif tour + live position | **On-demand single order + available drivers** |
| Karar | Dispatcher onayı | Dispatcher onayı | **Sistem otomatik (Mode 2) veya öneri (Mode 1)** |
| Solver | HERE Tour Planning (full) | HERE Tour Planning (partial) | **In-house scoring (proximity + capacity + time)** |

### Phase ayrımı (ADR-0005 Mode 2 + ADR-0011 §6 FEAT-101)

- **Phase 1 (MVP):** Mode 1 Advisory disiplini geçerli — sistem **öneri üretir**, dispatcher onaylar. Scoring engine + policy module Phase 1'de kurulur ama "policy module structure that currently always returns 'advisory'" (ADR-0005 §7).
- **Phase 2 (FEAT-101 customer-funded):** Otomatik atama aktive olur. Kurallar permit ederse `executeAutoDispatch` çalışır, exception olursa dispatcher'a düşer. Grace period ile geri alınabilir.

**Kapsam — içeride:**
- Order ingestion (manuel form + webhook)
- Driver-order scoring engine (custom, in-house — ADR-0010 §2 "Cost functions are not ML")
- Policy module (`src/dispatch/policy.ts` — ADR-0005 §7)
- Phase 2 forward-compatible: auto-dispatch + grace period monitor + exception notifier

**Kapsam — dışarıda:**
- AI agent PDF/email order parsing (FEAT-105, Phase 2 ayrı feature)
- Driver mobile app değişikliği (mevcut task pickup akışı kullanılır)

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Phase | Shared with FEAT-001/002? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FEAT-003-FN-01 | frontend | `<OrderEntryForm />` | UI inputs | UI Component | — | — | — | ADR-0001 §3.6 — "Forms, modals, navigation, layout primitives" | 1 | — |
| 2 | FEAT-003-FN-02 | backend | `POST /api/dispatcher/orders` | orderData: JSON, (JWT.company_id) | { orderId } | — | enterprise.dispatch_tasks | — | ADR-0004 §3 — "enterprise.dispatch_tasks represents the dispatcher-facing task model" | 1 | — |
| 3 | FEAT-003-FN-03 | backend | `findCandidateDrivers` | location, (JWT.company_id) | Driver[] | public.drivers, public.locations | — | — | ADR-0005 §4.1 — "System gathers candidate tasks and available vehicles" | 1 | **FEAT-001:FN-005** |
| 4 | FEAT-003-FN-04 | shared_library | `MatrixCache.get` | locations: LatLng[] | Matrix | Redis | Redis | HERE Matrix | ADR-0002 §5 — "MatrixCache — caches Distance Matrix responses (Redis, 24-hour TTL) to control per-request cost." | 1 | **FEAT-001:FN-008** |
| 5 | FEAT-003-FN-05 | shared_library | `checkCompliance` | route, (JWT.company_id) | CompResult | enterprise.nl_compliance_zones | — | — | ADR-0012 §3.1 — "Plan generation sırasında compliance check otomatik tetiklenir" | 1 | **FEAT-001:FN-012** |
| 6 | FEAT-003-FN-06 | backend | `calculateMatchingScore` | driver, order, matrix | Score: numeric | public.vehicles, public.drivers | — | — | ADR-0010 §2 — "Cost functions are not ML. Tunable objective weights (fuel, time, late penalty, capacity utilization) are configuration, not learned behavior." | 1 | — |
| 7 | FEAT-003-FN-07 | backend | `GET /api/dispatcher/orders/:id/suggestions` | id, (JWT.company_id) | Suggestion[] | enterprise.dispatch_tasks | — | — | ADR-0005 §4.1 — "System suggests dispatch decisions." | 1 | — |
| 8 | FEAT-003-FN-08 | backend | `evaluateDispatchPolicy` | order, driver | PolicyResult | public.companies | — | — | ADR-0005 §7 — "Add policy module structure in the enterprise backend (src/dispatch/policy.ts) that reads the mode and currently always returns 'advisory'." | 1 | — |
| 9 | FEAT-003-FN-09 | backend | `POST /api/webhooks/orders/external` | WebhookPayload | 200 OK | — | enterprise.dispatch_tasks | — | ADR-0011 FEAT-105 (Phase 2 AI agent: PDF/email order parsing) | **2** | — |
| 10 | FEAT-003-FN-10 | backend | `executeAutoDispatch` | orderId, driverId | void | — | enterprise.dispatch_tasks | — | ADR-0005 §5.3 — "If rules permit, system auto-assigns and dispatches." | **2** | — |
| 11 | FEAT-003-FN-11 | shared_library | `commitToDriverApp` | dispatchTask | publicTask | — | public.tasks | — | ADR-0009 §4.4 — "Dispatcher-created and dispatcher-approved plans flow into the driver-facing task model." | 1 | **FEAT-001:FN-013** |
| 12 | FEAT-003-FN-12 | backend | `POST /api/dispatcher/orders/:id/approve` | driverId, (JWT.company_id) | Success | — | enterprise.dispatch_tasks | — | ADR-0005 §4.1 — "The dispatcher approves every action before it takes effect." | 1 | — |
| 13 | FEAT-003-FN-13 | worker | `dispatchGracePeriodMonitor` | orderId | void | — | enterprise.dispatch_tasks | — | ADR-0005 §5.3 — "All auto-dispatches are visible in a dispatcher audit feed and can be reverted within a configurable grace period." | **2** | — |
| 14 | FEAT-003-FN-14 | backend | `notifyDispatcherException` | orderId, reason | void | — | — | — | ADR-0005 §5.3 — "If rules trigger an exception, system marks the task `needs_dispatcher` and notifies the dispatcher." | **2** | — |
| 15 | FEAT-003-FN-15 | backend | `validateOrderConstraints` | order, vehicle | isValid | public.vehicles | — | — | ADR-0002 §3.4 — "Hard constraints (HERE will not produce a route violating these): Vehicle capacity... Driver shift hours... Avoidance areas" | 1 | — |
| 16 | FEAT-003-FN-16 | frontend | `<SuggestionList />` | suggestions: JSON | UI Component | — | — | — | ADR-0005 §4.1 — Suggestion display per Mode 1 review pattern | 1 | — |

**Konsolidasyon notları:**
- **FN-01 ADR ref düzeltmesi:** NotebookLM "ADR-0001 §11" demişti; ADR-0001'in §11'i yok. Doğrusu **§3.6** (Bundled libraries) — alıntı içeriği aynı, sadece bölüm numarası düzeltildi.
- **FN-10 ADR ref düzeltmesi:** NotebookLM §5.2 demişti; "If rules permit, system auto-assigns" cümlesi **§5.3 #3** içinde (Auto-dispatch loop). Düzeltildi.
- **FN-14 ADR ref düzeltmesi:** Aynı şekilde §5.2 → §5.3 #4 ("System marks needs_dispatcher and notifies the dispatcher").
- **FN-09 referansı yeniden formatlandı:** "ADR-0011 §6" yerine yapılandırılmış "ADR-0011 FEAT-105" (Phase 2 listede yer).

---

## 3. Order processing chain

### 3.1 Phase 1 (Advisory — sistem önerir, dispatcher onaylar)

```
Order ingestion (manuel veya webhook)
        ↓
<OrderEntryForm /> (FN-01) veya POST /api/webhooks/orders/external (FN-09)
        ↓
POST /api/dispatcher/orders             (FN-02)
   └─ Writes enterprise.dispatch_tasks (status='draft')
        ↓
findCandidateDrivers                    (FN-03) [FEAT-001:FN-005 shared logic]
   └─ public.drivers + public.locations
        ↓
For each candidate driver:
   ├─ validateOrderConstraints          (FN-15) [Pre-validation]
   │     └─ Hard constraints: capacity, shift hours
   │     └─ Returns isValid; false → skip this driver
   │
   ├─ MatrixCache.get                   (FN-04) [FEAT-001:FN-008 shared, Redis 24h TTL]
   │     └─ HERE Distance Matrix
   │
   ├─ checkCompliance                   (FN-05) [FEAT-001:FN-012 shared]
   │     └─ enterprise.nl_compliance_zones
   │     └─ ZE-zone access decision
   │
   └─ calculateMatchingScore            (FN-06)
         └─ Weighted sum: 0.4*proximity + 0.3*timeWindow + 0.2*capacity + 0.1*compliance
         └─ Hard constraint fail → score = -1 (infeasible)
        ↓
evaluateDispatchPolicy                  (FN-08)
   └─ Reads public.companies.dispatch_mode
   └─ Phase 1: always returns 'advisory'
        ↓
GET /api/dispatcher/orders/:id/suggestions (FN-07)
        ↓
<SuggestionList />                      (FN-16)
        ↓
Dispatcher reviews → POST /api/dispatcher/orders/:id/approve (FN-12)
        ↓
commitToDriverApp                       (FN-11) [FEAT-001:FN-013 shared]
   └─ public.tasks bridge
```

### 3.2 Phase 2 delta (Mode 2 — sistem otomatik karar verir)

Aynı zincir, ama `evaluateDispatchPolicy`'den sonra:

```
evaluateDispatchPolicy                  (FN-08)
   └─ Phase 2 modu aktif → returns 'auto_eligible' or 'exception'
        ↓
   if (auto_eligible):
       executeAutoDispatch              (FN-10) [Phase 2]
            └─ Writes enterprise.dispatch_tasks (status='assigned')
            ↓
       commitToDriverApp                (FN-11)
            ↓
       dispatchGracePeriodMonitor       (FN-13) [Phase 2 worker]
            └─ Configurable grace period (UNCERTAINTIES #2)
            └─ Within window: dispatcher can revert
   else (exception):
       notifyDispatcherException        (FN-14) [Phase 2]
            └─ enterprise.dispatch_tasks.status = 'needs_dispatcher'
            ↓
       Dispatcher manual review → FN-12 approve flow
```

---

## 4. Scoring algorithm (FN-06 detay)

ADR-0010 §2'ye uygun (ML değil, weighted configuration), ADR-0002 §3.4 constraint hierarchy ile uyumlu.

### 4.1 Pre-validation (hard constraints)

`validateOrderConstraints` (FN-15) ilk önce çalışır:

| Hard constraint | Kontrol |
|---|---|
| Vehicle capacity | `order.required_volume_m3 ≤ vehicle.capacity_volume_m3` |
| Vehicle weight | `order.required_weight_kg ≤ vehicle.capacity_weight_kg` |
| Driver shift hours | Order ETA + return time within driver remaining shift |
| Hazmat compatibility | `order.hazmat_class IN vehicle.hazmat_classes` |

**Sonuç:** Eğer herhangi bir hard constraint fail ederse → score = -1 (infeasible), driver eliminate edilir, scoring devam etmez.

### 4.2 Weighted scoring (soft constraints)

`calculateMatchingScore` (FN-06) ağırlıklı toplam:

```
score = 0.4 * proximity_score   // HERE Distance Matrix'ten süre
      + 0.3 * timeWindow_score  // Order time window'a uyum
      + 0.2 * capacity_score    // Aracın kalan hacim/ağırlık verimliliği
      + 0.1 * compliance_score  // ZE-zone access OK ise 1, ontheffing'siz blocked ise 0
```

Her component normalize: 0 (en kötü) → 1 (en iyi). Total score: 0-1 aralığında.

> **Default ağırlıklar bu spec'te tanımlandı.** ADR-0010 §2 "tunable" diyor — per-company override için Phase 2'de policy module konfigürasyonu eklenebilir (UNCERTAINTIES #1).

### 4.3 Policy decision (FN-08)

`evaluateDispatchPolicy` toplam skoru ve company `dispatch_mode`'unu okur:

| dispatch_mode | Decision |
|---|---|
| `advisory` (Phase 1 default) | Always returns `'suggest'` — dispatcher onayına gönderilir |
| `exception_based` (Phase 2) | Score ≥ threshold + tek uygun driver → `'auto_dispatch'`; çoklu match veya threshold altı → `'exception'` |
| `agentic` (Phase 3) | Future ADR (out-of-scope) |

---

## 5. Database tables — yeterli mi?

ADR-0004 v2 schema'sı **Phase 1 + Phase 2 için yeterli**:

| Tablo | Kullanım | Yeterli mi? |
|---|---|---|
| `enterprise.dispatch_tasks` | Order/task state | ✅ `source jsonb` (origin: manuel/webhook/ai_agent), `capacity_required jsonb` esnek |
| `public.drivers` | Candidate pool | ✅ Mevcut, Phase 1.1'de skills kolonu netleşir (ADR-0011 §12) |
| `public.vehicles` | Capacity validation | ✅ Phase 1.1 capacity columns (ADR-0004 v3 §6.4) |
| `public.locations` | Driver live position | ✅ Mevcut TimescaleDB hypertable |
| `public.companies` | dispatch_mode flag | ✅ ADR-0005 §7 Week 1-2'de eklenecek (`advisory|exception_based|agentic`) |

### Phase 2 önerisi — opsiyonel

```sql
-- Phase 2'de dispatcher'ların scoring weights ve policy rules'u UI'dan yönetmesi gerekirse
CREATE TABLE enterprise.dispatch_policies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL REFERENCES public.companies(id),
    weight_proximity   NUMERIC(3,2) NOT NULL DEFAULT 0.40,
    weight_time_window NUMERIC(3,2) NOT NULL DEFAULT 0.30,
    weight_capacity    NUMERIC(3,2) NOT NULL DEFAULT 0.20,
    weight_compliance  NUMERIC(3,2) NOT NULL DEFAULT 0.10,
    auto_dispatch_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.85,
    grace_period_seconds INTEGER NOT NULL DEFAULT 300,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (weight_proximity + weight_time_window + weight_capacity + weight_compliance = 1.00)
);
```

**Şu an yapma.** Phase 1'de `src/dispatch/policy.ts` config dosyası yeterli (ADR-0005 §7). Phase 2 customer demand'ı geldiğinde değerlendirilir.

---

## 6. Shared infrastructure with FEAT-001 & FEAT-002

| FEAT-003 fonksiyon | Shared with | Paylaşım türü |
|---|---|---|
| FN-03 findCandidateDrivers | FEAT-001:FN-005 fetchEligibleVehicles | **Partial** — benzer pattern (candidate gathering), ama FEAT-001 vehicles, FEAT-003 drivers |
| FN-04 MatrixCache.get | FEAT-001:FN-008 | **Birebir** (aynı kod, Redis cache) |
| FN-05 checkCompliance | FEAT-001:FN-012 | **Birebir** |
| FN-11 commitToDriverApp | FEAT-001:FN-013 approve endpoint logic | **Partial** — approve endpoint'in iç katmanı; FEAT-001'de full plan, FEAT-003'te tek order |

**Sonuç:** FEAT-003'ün 16 fonksiyonundan **4'ü shared infrastructure** (2 birebir + 2 partial). Yeni geliştirme oranı yüksek (~%75) çünkü on-demand paradigma kendine özgü (scoring, policy, order ingestion).

---

## 7. UNCERTAINTIES (Cem onayı bekleyen)

### NotebookLM çıktısından

1. **Confidence Score Eşiği:** Phase 2'de otomatik atama için gerekli minimum score (örn: %85?). Şirket bazlı mı yoksa sistem geneli mi? Default değer kaç?

2. **Sürücü meşguliyet filtresi:** Sürücü halihazırda bir tour içindeyken on-demand görev atanır mı? "Available" status'un kesin tanımı (idle / on_task / break sırasında).

3. **Grace period EMQX senkronizasyonu:** Geri alma süresi içinde dispatcher revert ederse, sürücü mobil uygulamasına "iptal" mesajı nasıl iletilir? MQTT topic var mı yoksa REST polling mi?

4. **Skill-based matching verisi:** `public.drivers.skills` formatı belirsiz (ADR-0011 §12). FEAT-007 için zaten açık soru — FEAT-003 implementation'ı için de kritik.

### Pilot süreçte tespit edilen

5. **Scoring ağırlıklarının per-company override mekanizması:** ADR-0010 §2 "tunable" diyor. Phase 1'de tek global config mi? Phase 2'de DB'ye taşınır mı (§5'deki opsiyonel tablo)?

6. **Webhook authentication:** FN-09 external webhook auth nasıl? HMAC signature, API key, OAuth? ADR'larda explicit yok.

---

## 8. Pilot süreç notları

### 8.1 Pilot akışı (2026-05-27)

2 NotebookLM iterasyonu:

1. **İlk çıktı:** 16 fonksiyon, alıntı disiplini uygulanmış, Phase 1/2 ayrımı doğru, scoring outline değerli. **5 bayrak tespit edildi:** FN-06 reads from boş, FN-15 zincirdeki yeri belirsiz, ADR-0001 §11 fabrikasyon, ADR-0005 §5.2 vs §5.3 karışıklığı, NEW_TABLES policy module konum belirsiz. Skor 8.5/10.

2. **v2 (final NotebookLM):** FN-06 reads from + FN-15 scoring zincirinde pre-validation pozisyonu net çıktı + NEW_TABLES policy module konum açıklığı eklendi. **§numara fabrikasyonları DÜZELTİLMEDİ** — ADR-0001 §11 hâlâ §3.6 yerine. Skor 9/10.

3. **Konsolidasyon (bu dosya):** §numara fabrikasyonları manuel düzeltildi (§11 → §3.6, §5.2 → §5.3), FN-09 referansı yapılandırılmış FEAT-105'e çevrildi. Scoring algorithm bölümü detaylandırıldı.

### 8.2 Alıntı doğrulama (spot check)

| Reference | Test sonucu | Düzeltme |
|---|---|---|
| ADR-0001 §11 (forms layout) | ❌ §11 yok | → §3.6 (gerçek) |
| ADR-0001 §3.6 — "Forms, modals, navigation, layout primitives" | ✅ Birebir | — |
| ADR-0002 §3.4 (Hard constraints) | ✅ Bizim addendum, doğru kullanılmış | — |
| ADR-0002 §5 (MatrixCache) | ✅ Önceki turlarda doğrulandı | — |
| ADR-0004 §3 (dispatch_tasks model) | ⚠️ Doğrulanmadı, plausible | — |
| ADR-0005 §4.1 (system suggests) | ✅ Önceki turlarda doğrulandı | — |
| ADR-0005 §5.2 (rules permit) | ❌ Cümle §5.3 #3'te | → §5.3 (gerçek) |
| ADR-0005 §5.3 (grace period revert) | ✅ Birebir doğrulandı | — |
| ADR-0005 §7 (policy module advisory) | ✅ Birebir doğrulandı | — |
| ADR-0009 §4.4 (driver-facing task model) | ⚠️ Yarı-doğrulanmış (önceki turlarda da) | — |
| ADR-0010 §2 (cost functions not ML) | ✅ Birebir doğrulandı | — |
| ADR-0011 §6 (FEAT-105) | ✅ Phase 2 listesinde | → FEAT-105 yapısal ID |
| ADR-0012 §3.1 | ✅ Önceki turlarda doğrulandı | — |

**Konsolidasyonda 3 §numara hatası düzeltildi.** Geri kalan 10 referansın 8'i tam doğrulandı, 2'si yarı-doğrulanmış (cümle plausible, exact §match doğrulanamadı).

### 8.3 Üç pilot karşılaştırması

| Boyut | FEAT-001 | FEAT-002 | FEAT-003 |
|---|---|---|---|
| Skor (NotebookLM çıktısı) | 9/10 | 9.5/10 | 9/10 |
| Skor (konsolide dosya) | 9/10 | 9.5/10 | 9/10 |
| Prompt iterasyon sayısı | 5 (compliance entegrasyonu geç keşfedildi) | 3 | 2 |
| Alıntı disiplini | Önce zayıf, sonra sıkı | Çok iyi | **§numara fabrikasyon regression** |
| Yeni paradigma | — (baseline) | Re-routing, EMQX | On-demand scoring, policy module |
| FEAT-001 shared | — | 7/16 fonksiyon | 4/16 fonksiyon |

**Patern öğrenmesi:** Alıntı disiplini stabil olsa bile **§numara fabrikasyonu rastgele tekrar edebiliyor**. Her FEAT konsolidasyonunda spot check zorunlu.

---

## 9. Next steps

### 9.1 Pre-implementation

- [ ] Cem onayı: scoring weights default (40/30/20/10) ve grace period default (5 dk?)
- [ ] Cem onayı: webhook auth mekanizması (HMAC vs API key)
- [ ] FEAT-007 (driver skill matching) ile koordinasyon — `public.drivers.skills` schema kararı

### 9.2 Phase 1 implementation backlog

ROADMAP Sıra 6 dispatcher endpoints kapsamında:
- FN-01 `<OrderEntryForm />`, FN-16 `<SuggestionList />`
- FN-02 `POST /api/dispatcher/orders`
- FN-03 findCandidateDrivers
- FN-06 calculateMatchingScore
- FN-07 GET suggestions
- FN-08 evaluateDispatchPolicy (always 'advisory' Phase 1)
- FN-12 approve endpoint
- FN-15 validateOrderConstraints

### 9.3 Phase 2 forward-compatibility (FEAT-101 trigger geldiğinde aktive olur)

Phase 1'de schema-ready ama kod path kapalı:
- FN-09 webhook endpoint (route registered ama 501 döner)
- FN-10 executeAutoDispatch (function exists ama policy 'advisory' iken çağrılmaz)
- FN-13 dispatchGracePeriodMonitor (worker tanımlı ama trigger yok)
- FN-14 notifyDispatcherException (function exists ama Phase 1'de tetiklenmez)
- `enterprise.dispatch_policies` table opsiyonel — sadece DB-driven policy istenirse

### 9.4 FEAT-004 pipeline

FEAT-004 = "Hybrid Fleet Assignment" (wishlist #4) — internal drivers + 3PL + gig workers tek platformda orkestrasyon. Bir sonraki pilot.

---

## 10. References

- ADR-0001 §3.6 (Bundled libraries — Forms, modals UI primitives)
- ADR-0002 §3.4 (Constraint hierarchy — bizim 2026-05-27 addendum'umuz)
- ADR-0002 §5 (MatrixCache)
- ADR-0004 (Database strategy — dispatch_tasks model)
- ADR-0005 §4.1 (Mode 1 advisory user flow)
- ADR-0005 §5.3 (Mode 2 auto-dispatch loop, grace period)
- ADR-0005 §7 (Implementation Plan — policy module always returns 'advisory')
- ADR-0009 §4.4 (Driver task model flow)
- ADR-0010 §2 (Cost functions are not ML — boundary)
- ADR-0011 §6 FEAT-101 (Phase 2 customer-funded auto-dispatch)
- ADR-0011 §6 FEAT-105 (Phase 2 AI agent order parsing)
- ADR-0011 §12 (Open question: driver skills schema)
- ADR-0012 §3.1 (Compliance check trigger)
- FEAT-001 spec (shared infrastructure source)
- FEAT-002 spec (shared infrastructure source)
- NotebookLM 2-iteration session (2026-05-27)

---

## 11. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-27 | Cem Bakir (with Claude + NotebookLM cowork) | İlk konsolide function spec. Üçüncü pilot — on-demand order matching paradigması (FEAT-001/002'den farklı). 16 fonksiyon, 4 shared. Phase 1 advisory, Phase 2 FEAT-101 auto-dispatch forward-compatible. Konsolidasyonda §numara fabrikasyonları düzeltildi: ADR-0001 §11→§3.6, ADR-0005 §5.2→§5.3. Scoring algorithm detaylandırıldı (40/30/20/10 weighted sum, hard pre-validation, three policy outcomes). |
