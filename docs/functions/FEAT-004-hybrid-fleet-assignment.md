# FEAT-004 — Hybrid Fleet Assignment

| Field | Value |
|---|---|
| **Feature ID** | FEAT-004 |
| **Source** | Feature Wishlist #4 — "Hybrid Fleet Assignment" |
| **Frequency rating** | Common (industry-wide) |
| **Tulipfleet Phase** | Phase 1 (internal drivers — TulipFleet baseline) + Phase 2 (contracted carriers — customer-funded connector) |
| **Out-of-scope** | 3PL partners + Gig workers — bk. `docs/strategy/STRATEGIC_ROADMAP_3PL_GIG.md` (ADR-0013'e ertelendi) |
| **Status** | Function spec drafted via NotebookLM (1 prompt + 1 strategic follow-up, 2026-05-27) |
| **Pilot note** | Dördüncü pilot. Kapsam disiplini test edildi — NotebookLM 4 aktörden 2'sini out-of-scope etiketleyerek doğru kararı verdi. |

---

## 1. Feature description (kapsamla)

Wishlist'teki orijinal feature dört aktör tipini orkestrasyonu hedefliyordu:

> *"Hybrid Fleet Assignment: Dispatchers manage a combination of internal drivers, contracted carriers, 3PL partners, and gig workers from a single orchestration platform."*

### 1.1 Kapsam kararı (ADR uyumlu)

NotebookLM scope analizi + ADR'ler çerçevesinde:

| Aktör tipi | Phase | Karar gerekçesi |
|---|---|---|
| **Internal drivers** | 1 (MVP) | TulipFleet baseline — mevcut `public.drivers` tablosu, ADR-0011 §5 FEAT-001 ile birebir uyumlu |
| **Contracted carriers** | 2 (Premium connector) | ADR-0007 §2 madde 3 customer-funded pattern — paying customer signed contract gerektirir |
| **3PL partners** | **Out-of-scope (ADR-0013)** | ADR-0011 §7 OUT-002 — *"Multi-tenancy ve cross-company task visibility mimari değişikliği gerektirir; ayrı bir ürün olmalı, dispatcher'a sıkıştırılmamalı"* |
| **Gig workers** | **Out-of-scope (ADR-0013)** | OUT-002 + Mode 1 Advisory akışına aykırı (on-demand freelance) |

### 1.2 Bu spec'in dar kapsamı

Bu doküman sadece **internal drivers (Phase 1)** ve **contracted carriers (Phase 2)** için fonksiyon listesi içerir.

3PL partners + gig workers için ayrı bir strateji yol haritası mevcut:
- `docs/strategy/STRATEGIC_ROADMAP_3PL_GIG.md`
- Trigger conjunction satisfied olduğunda ADR-0013 yazılır

### 1.3 Kritik mimari içgörü — "External Resource" pattern

Contracted carrier'lar sisteme **bağımsız Partner tenant'ı** olarak değil, **dispatcher'ın kendi tenant'ı altında "External Resource"** olarak modellenir. Bu, ADR-0009 §5.3 tenant isolation prensibini korur:

- Carrier metadata `enterprise.carriers` tablosunda **company_id ile scope** edilir
- Bir dispatcher kendi customer'ının carrier'larını görür, başka customer'ın carrier'ını göremez
- Aynı carrier (örn. "Schenker Hollanda") farklı dispatcher tenant'larında ayrı row olarak bulunur
- Cross-company carrier sharing **out-of-scope** (3PL federation domain'i — ADR-0013)

Bu, ADR-0011 §7 OUT-002 *"ayrı bir ürün olmalı, dispatcher'a sıkıştırılmamalı"* kuralının yapısal koruması.

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Phase | Actor | Shared with FEAT-001/002/003? |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FEAT-004-FN-01 | backend | `POST /api/dispatcher/carriers` | carrierData: JSON, (JWT.company_id) | { carrierId } | — | enterprise.carriers | — | ADR-0004 v3 §6 — Additive enterprise.* schema changes authorized | 2 | carrier | — |
| 2 | FEAT-004-FN-02 | backend | `findEligibleResources` | location, skills, (JWT.company_id) | Resource[] | public.drivers, enterprise.carriers | — | — | ADR-0005 §4.1 — "System gathers candidate tasks and available vehicles" | 1 | all | **FEAT-003:FN-03** (partial — drivers + carriers union) |
| 3 | FEAT-004-FN-03 | backend | `calculateCarrierCost` | route, contractData | Cost: numeric | enterprise.carriers, enterprise.carrier_contracts | — | — | ADR-0010 §2 — "Cost functions are not ML. Tunable objective weights... are configuration" | 2 | carrier | — |
| 4 | FEAT-004-FN-04 | shared_library | `checkCompliance` | route, (JWT.company_id) | CompResult | enterprise.nl_compliance_zones | — | — | ADR-0012 §3.1 — "Plan generation sırasında compliance check otomatik tetiklenir" | 1 | all | **FEAT-001:FN-012** |
| 5 | FEAT-004-FN-05 | shared_library | `MatrixCache.get` | locations: LatLng[] | Matrix | Redis | Redis | HERE Matrix | ADR-0002 §5 — "MatrixCache — caches Distance Matrix responses (Redis, 24-hour TTL) to control per-request cost." | 1 | all | **FEAT-001:FN-008** |
| 6 | FEAT-004-FN-06 | backend | `buildHybridHereProblem` | internal, carriers, tasks, complianceZones | HERE_JSON | public.vehicles, enterprise.carriers | — | — | ADR-0002 §3.4 — "Hard constraints (HERE will not produce a route violating these): Vehicle capacity... Driver shift hours... Avoidance areas" | 1 | all | partial: FEAT-001:FN-016 |
| 7 | FEAT-004-FN-07 | shared_library | `IRoutingProvider.submitPlan` | problem: JSON | { jobId } | — | — | HERE Tour Planning | ADR-0002 §5 — "internal TypeScript interface defining submitPlan(input), pollStatus(jobId), fetchResult(jobId)." | 1 | all | **FEAT-001:FN-007** |
| 8 | FEAT-004-FN-08 | backend | `POST /api/dispatcher/orders/:id/assign-carrier` | orderId, carrierId, (JWT.company_id) | Success | — | enterprise.dispatch_tasks | — | ADR-0005 §4.1 — "The dispatcher approves every action before it takes effect." | 2 | carrier | — |
| 9 | FEAT-004-FN-09 | shared_library | `validateTenantIsolation` | companyId, resourceId, (JWT.company_id) | boolean | public.companies | — | — | ADR-0009 §5.3 — "Existing pattern is preserved: every query in `enterprise-backend` enforces `company_id = <requester's company_id>` at the application layer." | 1 | all | — |
| 10 | FEAT-004-FN-10 | worker | `onCarrierTelematicsUpdate` | ExternalPayload | void | enterprise.telematics_source | public.locations | External carrier API | ADR-0007 §3.2 (Why customer-funded connectors) — "Every third-party telematics provider's API changes over time." | 2 | carrier | — |
| 11 | FEAT-004-FN-11 | shared_library | `upsertRoutingJob` | jobData: JSON | Row | — | enterprise.routing_jobs | — | ADR-0002 §6 — "Persist job_id to enterprise.routing_jobs immediately on submission." | 1 | all | **FEAT-001:FN-011** |
| 12 | FEAT-004-FN-12 | frontend | `<CarrierAssignmentModal />` | orderId | UI Component | — | — | — | ADR-0001 §3.6 — "Forms, modals, navigation, layout primitives" | 2 | carrier | — |

**Function list (3PL & Gig actors):** N/A — see `docs/strategy/STRATEGIC_ROADMAP_3PL_GIG.md` for ADR-0013 evolution.

**Konsolidasyon notları:**
- **FN-10 ADR ref:** NotebookLM çıktısında alıntı "Every third-party telematics provider's API changes over time" ADR-0007 §3.2'nin ilk cümlesi (Why customer-funded connectors başlığı altında). Doğru bölüm.
- **FN-01 ADR ref düzeltmesi:** NotebookLM "ADR-0004 v3 §6.0" demişti. ADR-0004 v3'te §6 var ama §6.0 alt-bölümü yok — düzeltildi. Ayrıca NotebookLM Türkçe alıntı yazmıştı (ADR İngilizce); İngilizce orijinaline çevrildi.

---

## 3. Hybrid routing pipeline

### 3.1 Phase 1 (internal drivers only — TulipFleet baseline)

Bu akış FEAT-001 ve FEAT-003 ile büyük ölçüde örtüşür:

```
Order/task creation
        ↓
findEligibleResources                   (FN-02)
   └─ Reads only public.drivers (Phase 1)
   └─ enterprise.carriers tablosu boş (henüz Phase 2 değil)
        ↓
checkCompliance                         (FN-04) [FEAT-001:FN-012 shared]
        ↓
MatrixCache.get                         (FN-05) [FEAT-001:FN-008 shared]
        ↓
buildHybridHereProblem                  (FN-06)
   └─ Sadece internal drivers + compliance zones
        ↓
IRoutingProvider.submitPlan             (FN-07) [FEAT-001:FN-007 shared]
        ↓
upsertRoutingJob                        (FN-11) [FEAT-001:FN-011 shared]
        ↓
Dispatcher approve → enterprise.dispatch_tasks
```

**Phase 1'de "hybrid" boyutu pasif.** Pipeline carrier'ları kabul edebilir hale getirilmiş ama henüz carrier eklenmemiş. ADR-0007 §5 "architectural hooks completed Phase 1, inert" pattern'iyle uyumlu.

### 3.2 Phase 2 delta (contracted carriers eklenir)

İlk paying customer "we have a contract with carrier X, please integrate" der demez aktive olur:

```
POST /api/dispatcher/carriers           (FN-01) [Phase 2 — register carrier]
   └─ Writes enterprise.carriers (company_id scoped)
        ↓
[Customer-funded connector built per ADR-0007 §2 madde 3]
   └─ onCarrierTelematicsUpdate         (FN-10 worker)
   └─ Carrier'ın telematik verisi → enterprise.locations_3p
        ↓
Dispatcher flow:
   findEligibleResources                (FN-02)
      └─ Reads public.drivers + enterprise.carriers (union)
      └─ Returns hybrid resource list
        ↓
   calculateCarrierCost                 (FN-03) [Phase 2 — soft constraint input]
      └─ Reads enterprise.carrier_contracts
      └─ Per-km rate, contract terms
        ↓
   buildHybridHereProblem               (FN-06)
      └─ Internal drivers as TulipFleet resources
      └─ External carriers as vehicles with cost overlay
      └─ HERE solver treats both as candidates
        ↓
   Solver assigns optimal resource
        ↓
   POST /api/dispatcher/orders/:id/assign-carrier (FN-08)
      └─ Writes enterprise.dispatch_tasks.assigned_resource_type = 'carrier'
        ↓
   <CarrierAssignmentModal />           (FN-12)
      └─ Dispatcher confirms assignment (Mode 1 advisory geçerli)
        ↓
   commitToDriverApp behavior:
      - Internal driver → public.tasks bridge (mevcut akış)
      - Carrier → external dispatch notification (carrier-specific connector)
```

**Önemli:** Carrier seçildiğinde **public.tasks bridge çalışmaz**. Carrier kendi sisteminde görevi alır. Bu, ADR-0009 §4.4'teki driver task model akışının dışına çıkar — ama tenant isolation korunduğu için kabul edilebilir.

---

## 4. Tenant isolation analysis (kritik)

ADR-0009 §5.3 prensibi koruma altında. FN-09 `validateTenantIsolation` her endpoint'te explicit çağrılır.

### 4.1 Korunan invariantlar

| Invariant | Koruma mekanizması |
|---|---|
| Dispatcher kendi carrier'ını görür | `enterprise.carriers.company_id = JWT.company_id` filter |
| Dispatcher başka customer'ın carrier'ını göremez | Aynı filter |
| Aynı carrier farklı dispatcher tenant'larında ayrı row | Tablo design — composite uniqueness `(company_id, carrier_name)` |
| Carrier telematik verisi tenant boundary'sini geçmez | `enterprise.locations_3p.company_id` zorunlu |

### 4.2 Cross-company senaryoları (out-of-scope)

Aşağıdaki senaryolar **bu spec'in kapsamı dışındadır** ve ADR-0013'e ertelendi:

- Bir 3PL'in birden fazla dispatcher customer için aynı havuzdan kapasite paylaştırması (federated load pooling — ADR-0011 §7 OUT-002)
- Gig worker'ın birden fazla dispatcher tenant'tan order alması (gig pool dynamics)
- Cross-company task visibility (dispatcher A başka dispatcher'ın atadığı tasks'i görmesi)

Bu senaryolar ADR-0013'te yazılacak federation architecture'da çözülür.

---

## 5. Scoring algorithm — carrier maliyeti

Phase 2'de hybrid scoring, FEAT-003'teki driver-order matching skoruna **carrier cost** ekler:

```
score = 0.4 * proximity_score
      + 0.3 * timeWindow_score
      + 0.15 * capacity_score
      + 0.10 * compliance_score
      + 0.05 * cost_score        // YENİ — carrier kontrat fiyatı vs internal driver cost
```

`cost_score` hesaplaması (FN-03 `calculateCarrierCost`):

- Internal driver: maliyet TulipFleet customer'ının kendi cost modeli (genelde fixed monthly + fuel)
- Carrier: `enterprise.carrier_contracts.rate_per_km × estimated_distance` + Vrachtwagenheffing (Temmuz 2026 sonrası, FEAT-008)

Hard constraint preserved (ADR-0002 §3.4): capacity, shift hours, avoidance areas — bunlar fail ederse score = -1 (infeasible).

> **Default ağırlıklar bu spec'te tanımlandı**, ADR-0010 §2 "tunable" diyor. Per-company override Phase 2 policy module konfigürasyonunda eklenebilir (FEAT-003 §4.3 ile uyumlu).

---

## 6. Database tables

### 6.1 Mevcut tablolar (yeterli)

| Tablo | Phase 1 kullanım | Phase 2 kullanım |
|---|---|---|
| `public.drivers` | Internal driver pool | Aynı |
| `public.vehicles` | Internal vehicle capacity | Aynı |
| `enterprise.dispatch_tasks` | Order/task state | `assigned_resource_type` field eklenir (Phase 2) |
| `enterprise.locations_3p` | (boş Phase 1'de) | Carrier telematik verisi |
| `enterprise.telematics_source` | (boş Phase 1'de) | Carrier provider registry |

### 6.2 Phase 2 için yeni tablolar (additive, ADR-0004 v3 §6)

İlk carrier integration trigger'lendiğinde uygulanır:

```sql
-- Phase 2 migration (customer-funded trigger sonrası)

CREATE TABLE enterprise.carriers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    carrier_name  TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    status        TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'archived')) DEFAULT 'active',
    metadata      JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, carrier_name)  -- tenant isolation — aynı carrier farklı tenant'larda ayrı row
);

CREATE TABLE enterprise.carrier_contracts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carrier_id      UUID NOT NULL REFERENCES enterprise.carriers(id) ON DELETE CASCADE,
    company_id      UUID NOT NULL REFERENCES public.companies(id),  -- denormalized for tenant guard
    contract_type   TEXT NOT NULL CHECK (contract_type IN ('per_km', 'per_dispatch', 'monthly_fixed')),
    rate_value      NUMERIC(10,2) NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'EUR',
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    terms           JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_carriers_company ON enterprise.carriers (company_id, status);
CREATE INDEX idx_carrier_contracts_active 
  ON enterprise.carrier_contracts (carrier_id, effective_from, effective_to);
```

**Schema notları:**
- `enterprise.carriers.company_id` zorunlu — tenant isolation invariant
- `enterprise.carrier_contracts.company_id` denormalized (`UNIQUE` constraint için JOIN'siz tenant guard sağlar)
- ADR-0004 v3 §2 schema authority discipline'a uyumlu — migration `tulipfleet-backend/migrations/`'da yazılır

### 6.3 Migration timing

Phase 2 customer-funded trigger geldiğinde:
1. İlk carrier integration customer signed contract
2. Migration `tulipfleet-backend/migrations/`'da hazırlanır
3. Staging → Production apply (mevcut Sıra disiplini)
4. FN-01 endpoint aktive edilir
5. Customer-specific carrier connector yazılır (ADR-0007 connector pattern)

---

## 7. Shared infrastructure with FEAT-001/002/003

| FEAT-004 fonksiyon | Shared with | Paylaşım türü |
|---|---|---|
| FN-02 findEligibleResources | FEAT-003:FN-03 findCandidateDrivers | **Partial** — drivers + carriers union (FEAT-003 sadece drivers) |
| FN-04 checkCompliance | FEAT-001:FN-012 / FEAT-002:FN-05 / FEAT-003:FN-05 | **Birebir** (üç FEAT'le birden shared) |
| FN-05 MatrixCache.get | FEAT-001:FN-008 / FEAT-002:FN-04 / FEAT-003:FN-04 | **Birebir** |
| FN-06 buildHybridHereProblem | FEAT-001:FN-016 buildHereProblem | **Partial** — hybrid resource pool (FEAT-001 sadece internal) |
| FN-07 IRoutingProvider.submitPlan | FEAT-001:FN-007 / FEAT-002:FN-07 | **Birebir** |
| FN-11 upsertRoutingJob | FEAT-001:FN-011 / FEAT-002:FN-14 | **Birebir** |

**Sonuç:** FEAT-004'ün 12 fonksiyonundan **6'sı shared infrastructure** (4 birebir + 2 partial). Yeni geliştirme oranı %50:
- 6 yeni: FN-01 (carrier register), FN-03 (carrier cost), FN-08 (assign-carrier), FN-09 (tenant guard), FN-10 (carrier telematik worker), FN-12 (UI)
- 6 shared: FN-02, FN-04, FN-05, FN-06, FN-07, FN-11

Phase 1'de yeni kod minimal — sadece FN-09 (tenant guard utility). Phase 2'de carrier-specific 6 fonksiyon gelir.

---

## 8. Business model implications

Mevcut TulipFleet pricing yapısı:
- Starter €15/araç (3-5)
- Professional €25/araç (6-20)
- Enterprise €29-35/araç (20+)

### 8.1 Internal drivers (Phase 1)

Mevcut per-vehicle pricing aynen geçerli. FEAT-004 Phase 1 kapsamı **mevcut tier yapısına dokunmaz**.

### 8.2 Contracted carriers (Phase 2)

Carrier'ın aracı TulipFleet customer'a ait değil — **per-vehicle sayım yapısı çöker**. İki olası model:

| Model | Açıklama |
|---|---|
| **(a) Connector activation fee** | Bir carrier eklemek için bir kerelik fee (ADR-0007 pattern) — €2000-5000 connector development cost'unu cover |
| **(b) Per-dispatch transaction fee** | Dispatcher carrier'a order assign ettiğinde transaction fee (örn. €0.50-2.00 per dispatch) |
| **(c) Hybrid** | Connector activation fee + lower per-dispatch fee |

**Karar (Cem'in onayı bekliyor):** Bu spec'te kavramsal yön — somut pricing FEAT-008 Vrachtwagenheffing modeliyle birlikte değerlendirilebilir, çünkü ikisi de "external cost overlay" karakteri taşıyor.

**Phase 2 tier zorunluluğu:** Carrier integration Enterprise tier'a zorunlu — Starter/Professional bu karmaşıklığı (Mode 1 advisory dışına çıkma potansiyeli) desteklemez.

### 8.3 3PL + gig out-of-scope

`docs/strategy/STRATEGIC_ROADMAP_3PL_GIG.md` §5'te detaylı — per-transaction pricing zorunluluğu ADR-0013'te formalleşir.

---

## 9. UNCERTAINTIES (Cem onayı bekleyen)

### NotebookLM çıktısından

1. **External carrier latency:** Üçüncü parti taşıyıcıların telematik verilerinin HERE'nin "live traffic" ve "predictive ETA" hesaplamalarına olan senkronizasyon gecikmesi. Carrier API'leri 30s-5dk polling olabilir, real-time MQTT değil.

2. **Carrier Proof of Delivery:** Sözleşmeli taşıyıcıların TulipFleet Driver App yerine kendi sistemlerini kullanmaları durumunda PoD verisinin sisteme nasıl döneceği. Wishlist #9 PoD ile ortak nokta — FEAT-009 implementation'ı carrier'a uyarlanmalı mı?

3. **Dynamic costing:** Spot market benzeri değişken carrier maliyetlerinin HERE solver'ın soft constraints katmanında nasıl ağırlıklandırılacağı. Spot rates contract rate'ten farklı.

### Pilot süreçte tespit edilen

4. **Carrier pricing model kesinleştirilmesi:** §8.2'deki (a)/(b)/(c) modellerinden hangisi seçilecek? FEAT-008 Vrachtwagenheffing modeliyle paralel düşünülmeli.

5. **Carrier shift hours management:** Internal driver'ın vardiya saatleri TulipFleet'te yönetilir. Carrier shift hours nereden gelir — carrier API'sinden mi, contract terms'ten mi sabit kabul edilir, yoksa Phase 2'de manuel mi girilir?

6. **`enterprise.dispatch_tasks.assigned_resource_type` enum genişlemesi:** Şu an `assigned_driver_id` ve `assigned_vehicle_id` var (ADR-0004 v2). Carrier için `assigned_carrier_id` ve `assigned_resource_type` discriminator eklenmesi gerekecek — ADR-0004 v3 §6'da additive değişiklik olarak listelenmemiş, Phase 2 trigger'da değerlendirilir.

---

## 10. Pilot süreç notları

### 10.1 Pilot akışı (2026-05-27)

2 NotebookLM exchange:
1. **Ana pilot prompt:** 4 aktör kapsam analizi + fonksiyon listesi. NotebookLM **doğru karar verdi** — 3PL + gig out-of-scope, internal Phase 1, carrier Phase 2. 12 fonksiyon, çoğu shared (önceki FEAT'lerden). Skor 9/10.
2. **Stratejik takip:** "3PL/gig Phase 3'te nasıl ele alınır?" sorusu → ayrı dokümana taşındı (`docs/strategy/STRATEGIC_ROADMAP_3PL_GIG.md`)

### 10.2 Alıntı doğrulama (spot check)

| Reference | Test sonucu | Düzeltme |
|---|---|---|
| ADR-0011 §7 OUT-002 (federated load pooling) | ✅ Birebir doğrulandı | — |
| ADR-0007 §3.2 "Why customer-funded connectors" | ✅ Bölüm var, NotebookLM'in tartışması sonrası kabul edildi — rationale §3.2'de | — |
| ADR-0004 v3 §6 (additive changes) | ⚠️ NotebookLM "§6.0" demişti, §6 doğru | → §6 |
| ADR-0001 §3.6 | ✅ Önceki turlarda | — |
| ADR-0002 §3.4 (constraint hierarchy) | ✅ Bizim addendum'umuz, doğru kullanıldı | — |
| ADR-0002 §5, §6 | ✅ Önceki turlarda | — |
| ADR-0005 §4.1 | ✅ Önceki turlarda | — |
| ADR-0009 §5.3 (tenant isolation) | ✅ Önceki turlarda | — |
| ADR-0010 §2 | ✅ Önceki turlarda | — |
| ADR-0012 §3.1 | ✅ Önceki turlarda | — |

**Türkçe alıntı düzeltmesi:** NotebookLM FN-01'de ADR-0004 v3'ten Türkçe alıntı yapmıştı (*"Additive ve geriye dönük uyumlu... değişikliklere izin verilir."*). ADR İngilizce — alıntı disiplini ihlali. Düzeltildi: English summary ("Additive enterprise.* schema changes authorized").

### 10.3 Dört pilot karşılaştırması

| Boyut | FEAT-001 | FEAT-002 | FEAT-003 | FEAT-004 |
|---|---|---|---|---|
| Fonksiyon sayısı | 16 | 16 | 16 | **12 (dar kapsam)** |
| Phase 1 oranı | 11/16 | 13/16 | 11/16 | 6/12 |
| Iterasyon sayısı | 5 | 3 | 2 | **1 (+1 stratejik takip)** |
| Skor | 9/10 | 9.5/10 | 9/10 | 9/10 |
| Yeni paradigma | (baseline) | Re-routing | On-demand scoring | **Multi-actor kapsam disiplini** |
| FEAT-001 shared | — | 7/16 | 4/16 | 6/12 (50%) |

**Patern öğrenmesi (4 pilot):**
- NotebookLM kapsam kararı verme yeteneği oturmuş (§7 OUT-002 doğru kullandı)
- Alıntı disiplini stabil ama **§numara fabrikasyonu rastgele tekrar edebiliyor** (FEAT-003 §11, FEAT-004 §6.0)
- Konsolidasyonda §numara spot check zorunlu
- 4. pilotta iterasyon sayısı azaldı (1 prompt + 1 takip yetti) — verim artışı

---

## 11. Next steps

### 11.1 Pre-implementation (Phase 1 — internal drivers)

Phase 1 implementation FEAT-001'in implementation'ına gömülü çünkü internal driver akışı zaten orada var. **Ayrı bir FEAT-004 Phase 1 implementation backlog gerekli değil.**

### 11.2 Phase 2 implementation (customer-funded trigger)

Trigger: İlk dispatcher customer "we have a contract with carrier X" der.

Backlog:
- [ ] `enterprise.carriers` + `enterprise.carrier_contracts` migration (`tulipfleet-backend/migrations/`)
- [ ] FN-01 `POST /api/dispatcher/carriers` endpoint
- [ ] FN-03 `calculateCarrierCost`
- [ ] FN-06 buildHybridHereProblem genişletme (carrier resource'larını dahil et)
- [ ] FN-08 assign-carrier endpoint
- [ ] FN-09 validateTenantIsolation utility
- [ ] FN-10 `onCarrierTelematicsUpdate` worker (carrier-specific connector ile)
- [ ] FN-12 `<CarrierAssignmentModal />` UI

Customer-funded connector geliştirme paralel (her carrier ayrı, ADR-0007 §4 pattern).

### 11.3 3PL & Gig federation (Phase 3 — ADR-0013)

`docs/strategy/STRATEGIC_ROADMAP_3PL_GIG.md`'deki 5-action checklist takip edilir. ADR-0013 trigger conjunction satisfied olduğunda yazılır.

### 11.4 FEAT-005 pipeline

FEAT-005 = "Predictive ETA Estimation" (wishlist #5) — frequency "Very common". HERE Native (ADR-0011 §8.1). Sonraki pilot.

---

## 12. References

- ADR-0001 §3.6 (Bundled libraries — UI primitives)
- ADR-0002 §3.4 (Constraint hierarchy — 2026-05-27 addendum)
- ADR-0002 §5, §6 (HERE integration — IRoutingProvider, MatrixCache, idempotency)
- ADR-0004 v3 §6 (Additive enterprise.* schema changes)
- ADR-0005 §4.1 (Mode 1 advisory user flow)
- ADR-0007 §2 madde 3 + §3.2 (Customer-funded connector pattern)
- ADR-0009 §5.3 (Tenant isolation invariant)
- ADR-0010 §2 (Cost functions are not ML)
- ADR-0011 §7 OUT-002 (Federated load pooling out-of-scope — 3PL/gig dayanağı)
- ADR-0012 §3.1 (Compliance check trigger)
- FEAT-001 spec (shared infrastructure source)
- FEAT-002 spec (shared infrastructure source)
- FEAT-003 spec (shared infrastructure source)
- **docs/strategy/STRATEGIC_ROADMAP_3PL_GIG.md** (3PL/gig out-of-scope evolution path)
- NotebookLM session 2026-05-27 (1 prompt + 1 strategic follow-up)

---

## 13. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-27 | Cem Bakir (with Claude + NotebookLM cowork) | İlk konsolide function spec. Dördüncü pilot — multi-actor kapsam disiplini. NotebookLM 4 aktörden 2'sini out-of-scope (3PL + gig) işaretledi, kalan 2 aktör (internal + carrier) için 12 fonksiyon listelendi. 3PL/gig stratejik harita ayrı dokümanda (`docs/strategy/STRATEGIC_ROADMAP_3PL_GIG.md`). Konsolidasyonda §6.0→§6 ve Türkçe alıntı→İngilizce orijinal düzeltmeleri yapıldı. |
