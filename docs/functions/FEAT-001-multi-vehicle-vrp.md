# FEAT-001 — Multi-Vehicle VRP with Time Windows (CVRP/VRPTW)

| Field | Value |
|---|---|
| **Feature ID** | FEAT-001 |
| **Source** | Feature Wishlist #1 — "AI-Powered Route Optimization" |
| **Frequency rating** | Very common (industry-wide baseline) |
| **Tulipfleet Phase** | Phase 1 (Sıra 6 — dispatcher backend endpoints) |
| **Status** | Function spec drafted via NotebookLM (5 prompts, 2026-05-27) |
| **Pilot disclaimer** | İlk feature olarak NotebookLM-driven function inventory pilot'u. Gelecek 30 feature için şablon. Doğrulama notları §10'da. |

---

## 1. Feature description

> *"AI-Powered Route Optimization: Dispatchers use automated computation to determine the lowest-cost feasible routes by analyzing hundreds of simultaneous constraints like traffic, weather, and delivery windows."*

TulipFleet Enterprise Dispatcher'da bu feature, **HERE Tour Planning API**'sini ana solver olarak kullanır (ADR-0002). Dispatcher operator bir planlama horizon'u + araç havuzu + atanmamış task listesi seçer; sistem HERE'ye problem JSON gönderir, async polling ile sonucu çeker, dispatcher Mode 1 (Advisory) ile inceleyip onaylar (ADR-0005).

**Kapsam — içeride:**
- `tulipfleet-enterprise-backend` (Fastify v4) endpoint'leri
- `tulipfleet-dispatcher` React UI sayfa + bileşenleri
- `enterprise.routing_jobs`, `enterprise.dispatch_tasks` schema kullanımı
- HERE Tour Planning + HERE Distance Matrix external API integration
- NL compliance check entegrasyonu (ADR-0012 §3.1 zorunluluğu)

**Kapsam — dışarıda:**
- Driver mobile app (task pickup mevcut akışı kullanılır)
- ESP32 firmware (telemetri tarafı ayrı feature)
- Multi-day long-haul (FEAT-110, Phase 2)

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Shared? |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FN-001 | frontend | `<PlanCreatePage />` | props: none | UI Component | public.vehicles, public.tasks | — | — | ADR-0001 §3.6 — "Forms, modals, navigation, layout primitives" | potential: #4 |
| 2 | FN-002 | frontend | `<PlanReviewPage />` | planId: UUID | UI Component | enterprise.routing_jobs | — | — | ADR-0005 §4.1 — "System displays the proposed assignment as a map view, a Gantt-style timeline, and a per-vehicle task list." | potential: #4 |
| 3 | FN-003 | backend | `POST /api/dispatcher/plans` | horizon: DateRange, (JWT.company_id) | { jobId: UUID } | public.vehicles, enterprise.dispatch_tasks | enterprise.routing_jobs | — | ADR-0005 §7 — "POST /api/dispatcher/plans — submit a plan to HERE (per ADR-0002)." | potential: #4 |
| 4 | FN-004 | backend | `GET /api/dispatcher/plans/:id` | jobId: UUID, (JWT.company_id) | { status, result } | enterprise.routing_jobs | — | — | ADR-0005 §7 — "GET /api/dispatcher/plans/:id — fetch plan status and result." | — |
| 5 | FN-005 | backend | `fetchEligibleVehicles` | (JWT.company_id) | Vehicle[] | public.vehicles | — | — | ADR-0005 §4.1 — "System gathers candidate tasks and available vehicles from enterprise.dispatch_tasks and public.vehicles." | potential: #2, #7 |
| 6 | FN-006 | backend | `fetchUnassignedTasks` | (JWT.company_id) | Task[] | enterprise.dispatch_tasks | — | — | ADR-0011 FEAT-001 | potential: #101 |
| 7 | FN-007 | shared_library | `IRoutingProvider.submitPlan` | problem: VRPTWSchema | { jobId } | — | — | HERE Tour Planning | ADR-0002 §5 — "internal TypeScript interface defining submitPlan(input), pollStatus(jobId), fetchResult(jobId)." | potential: #4, #109 |
| 8 | FN-008 | backend | `MatrixCache.get` | locations: LatLng[] | MatrixResponse | Redis | Redis | HERE Distance Matrix | ADR-0002 §5 — "MatrixCache — caches Distance Matrix responses (Redis, 24-hour TTL) to control per-request cost." | potential: #3 |
| 9 | FN-009 | backend | `calculatePlanHash` | payload: JSON | hash: string | — | — | — | ADR-0002 §6 — "Hash the request payload before submission. If the same hash is already in enterprise.routing_jobs with status completed, return the cached result." | potential: #4 |
| 10 | FN-010 | worker | `pollRoutingJobStatus` | jobId: UUID | void (update DB) | enterprise.routing_jobs | enterprise.routing_jobs | HERE Tour Planning | ADR-0002 §6 — "Poll status from a worker, not from the request thread." | potential: #104 |
| 11 | FN-011 | backend | `upsertRoutingJob` | jobData: JSON | Row | — | enterprise.routing_jobs | — | ADR-0002 §6 — "Persist job_id to enterprise.routing_jobs immediately on submission." | — |
| 12 | FN-012 | backend | `checkCompliance` | route, (JWT.company_id) | ComplianceResult | enterprise.nl_compliance_zones | — | — | ADR-0012 §3.1 — "Plan generation sırasında compliance check otomatik tetiklenir" | potential: #2, #103 |
| 13 | FN-013 | backend | `POST /api/dispatcher/plans/:id/approve` | jobId, (JWT.company_id) | { success } | enterprise.routing_jobs | enterprise.dispatch_tasks, public.tasks | — | ADR-0009 §4.4 — Dispatcher approval flow per integration map | potential: #101 |
| 14 | FN-014 | backend | `mapHereErrorsToInternal` | error: HERE_Error | TulipFleetError | — | — | — | ADR-0002 §6 — "Map them to internal error codes so that dispatcher UI can show actionable messages" | potential: ALL |
| 15 | FN-015 | frontend | `useRoutingPoll` | jobId: UUID | { data, status } | — | — | — | ADR-0001 §2 — "TanStack Query (React Query)" | potential: #102 |
| 16 | FN-016 | backend | buildHereProblem(tasks, vehicles, appointments?, tollCostMatrix?, routingMode?, daysHorizon?, driverRules?, evMode?) | (FEAT-009) | HERE_JSON | — | — | — | ADR-0012 §3.1 — Compliance polygons inserted as avoidance areas | potential: #4, **F006, F008, F009** |
| 16 | FEAT-001-FN-016 | shared_library | `buildHereProblem` | tasks, vehicles, **appointments?** (FEAT-006), **tollCostMatrix?** (FEAT-008), **routingMode?** (FEAT-009), **daysHorizon?** (FEAT-019), **driverRules?** (FEAT-019), **evMode?** (FEAT-103) | HERE_JSON | enterprise.dispatch_tasks | — | — | ADR-0002 §3.4 — "Soft constraints (weighted in the objective function): ..." | 1 (base), 1.1 (extensions activate) | **FEAT-006:FN-09**, **FEAT-008:FN-06**, **FEAT-009:FN-03**, **FEAT-019:FN-04**, **FEAT-103:FN-04** — extension functions chain |

**Not — FN-016:** NotebookLM ilk çıktısında FN-016 olarak vardı, ikinci çıktıda compliance zincirinde adı geçti ama tabloda eksikti. Konsolidasyonda zincir için zorunlu olduğundan FN-016 olarak yeniden eklendi. **2026-05-29 update:** Inputs imzası FEAT-006 ve FEAT-008 forward-compatibility için `appointments?` ve `tollCostMatrix?` opsiyonel parametreleri kabul edecek şekilde genişletildi. **2026-05-30 update:** Aynı pattern ile FEAT-009 için `routingMode?` opsiyonel parametresi eklendi. Detay §4.5 "Future evolution from FEAT-006 + FEAT-008 + FEAT-009".

---

## 3. Compliance trigger chain (ADR-0012 §3.1)

Plan generation sırasında compliance check **otomatik tetiklenir**. Zincir:

```
POST /api/dispatcher/plans          (FN-003)
        ↓
fetchEligibleVehicles               (FN-005)
        ↓
fetchUnassignedTasks                (FN-006)
        ↓
checkCompliance                     (FN-012)
   ├─ Reads enterprise.nl_compliance_zones
   ├─ Per-vehicle decision (DET, emission, ontheffing)
   └─ Returns avoidance_areas: Polygon[]
        ↓
buildHereProblem                    (FN-016)
   └─ Injects avoidance_areas into HERE problem JSON
        ↓
IRoutingProvider.submitPlan         (FN-007)
        ↓
upsertRoutingJob                    (FN-011)   [persist jobId]
        ↓
pollRoutingJobStatus                (FN-010)   [worker, async]
        ↓
        (status: completed)
        ↓
GET /api/dispatcher/plans/:id       (FN-004)
        ↓
<PlanReviewPage />                  (FN-002)
        ↓
POST /api/dispatcher/plans/:id/approve  (FN-013)
        ↓
enterprise.dispatch_tasks + public.tasks bridge
```

**Compliance worker (parallel):** ADR-0012 §4.4 uyarınca `enterprise.nl_compliance_zones` data güncelliği nightly sync worker tarafından sağlanır — request thread içinde DEĞİL.

---

## 4. Architectural decisions for HERE integration

### 4.1 Vehicle-specific avoidance area pattern

Hollanda ZE-zone'ları için **araç bazlı ontheffing** kuralı, HERE'ye `avoid` parametresi üzerinden geçirilir:

- **Muafiyeti VAR olan araç:** Bölge polygon'u o araç için avoid listesine **eklenmez**, HERE rotayı bölge içinden geçirebilir
- **Muafiyeti YOK olan araç:** Bölge polygon'u o araç için avoid listesine **eklenir**, HERE bölgeyi dışından dolaştırır

Bu, **vehicle-specific avoidance** pattern'idir. HERE Tour Planning'in `avoid[areas]` özelliği (ADR-0011 §8.2 HERE Configurable kategorisinde listelenmiş — *"ZE-Zone avoidance via environmental zones parameters"*) bu pattern'in temelidir.

### 4.2 Idempotency via request hash

Aynı problem'in tekrar tekrar HERE'ye gönderilmesini önlemek için ADR-0002 §6 idempotency pattern uygulanır:

```javascript
const hash = calculatePlanHash(payload);
const existing = await db.query(
  'SELECT * FROM enterprise.routing_jobs WHERE request_hash = $1 AND status = $2',
  [hash, 'completed']
);
if (existing) return existing.result;
```

`enterprise.routing_jobs` üzerinde `UNIQUE INDEX (request_hash) WHERE status = 'completed'` mevcut (ADR-0004 v2 schema).

### 4.3 Matrix caching (Redis, 24h TTL)

HERE Distance Matrix sonuçları her plan request'inde tekrar tekrar çekilmesin diye Redis'te 24 saat cache'lenir. Cost control disiplini (ADR-0002 §5 MatrixCache).

### 4.4 Async polling worker pattern

HERE Tour Planning sonuçları 30 saniye-birkaç dakika sürebilir. Request thread'de bloke etmek yerine:

1. FN-003 POST endpoint → 202 Accepted + jobId hemen döner
2. FN-010 worker process polling yapar, sonucu enterprise.routing_jobs'a yazar
3. FN-015 useRoutingPoll hook'u UI'da polling yapar (TanStack Query)

### 4.5 Future evolution from FEAT-006 + FEAT-008 + FEAT-009 + FEAT-019 + FEAT-103 (cross-spec sync, 2026-05-30)

FN-016 `buildHereProblem` imzası 6 yeni optional parametre kabul edecek şekilde forward-compatible şekilde tasarlandı:

| Parametre | Source | Phase | Aktivasyon |
|---|---|---|---|
| `appointments?` | FEAT-006 | 1 | Phase 1 — dock appointment scheduling |
| `tollCostMatrix?` | FEAT-008 | 1.1 | Phase 1.1 — Vrachtwagenheffing aktif |
| `routingMode?` | FEAT-009 | 1.1 | Phase 1.1 — HERE Eco Routing |
| `daysHorizon?` | FEAT-019 | 2 | Phase 2 — multi-day VRP customer-funded |
| `driverRules?` | FEAT-019 | 2 | Phase 2 — EU 561/2006 enforcement |
| `evMode?` | FEAT-103 | 2 | Phase 2 — EV-specific routing customer-funded |

**Tasarım disipline:**
- **Optional parametre paterni** — her parametre kendi feature aktive edilene kadar NULL. Phase 1 FEAT-001 standalone çalışır.
- **Breaking change yok** — yeni parametre eklemek Phase 1 davranışını etkilemez (default behavior değişmez).
- **Multi-way tension** (Time/Toll/Eco/Multi-day/EV) — her parametre kendi tradeoff'unu HERE objective fonksiyonuna eklenir, weighted sum (ADR-0010 §3.4).

**FEAT-001 standalone çalışma:** Phase 1'de tüm yeni parametreler `undefined` — yalnızca `tasks` + `vehicles` core VRP. Yeni feature spec'leri kendi extension'ını ekledikçe FN-016 imza aktive edilir.
```typescript
function buildHereProblem(
  tasks: Task[],
  vehicles: Vehicle[],
  complianceZones: ZoneList,
  appointments?: Appointment[],                            // FEAT-006 implementation
  tollCostMatrix?: TollCostMatrix,                         // FEAT-008 implementation
  routingMode?: "fastest" | "shortest" | "eco"             // FEAT-009 implementation
): HereProblemJSON
```

#### FEAT-006 — Automated Appointment Scheduling (Phase 1)

FEAT-006 implementation'ı `buildHereProblem`'e **service_duration_seconds** parametresini enjekte eder. ADR-0002 §3.2 *"HERE Tour Planning natively models constraints (vehicle height, cold chain, driver shift rules, mixed pickup/delivery, refueling stops)"* — task'a per-stop service duration eklemek native destek.

**Phase 1 hazırlığı:** `appointments?` parametresi opsiyonel olarak imzada yer alır, FEAT-006 spec'inde detaylanan dock + service duration breakdown'u burada HERE solver'a iletir. FEAT-006 dosyasındaki §7.1 ile uyumlu.

#### FEAT-008 — Vrachtwagenheffing Route Cost Optimization (Phase 1.1)

FEAT-008 implementation'ı `buildHereProblem`'e **tollCostMatrix** parametresini enjekte eder. ADR-0002 §3.4 *"Soft constraints (weighted in the objective function): ... Vrachtwagenheffing per-km cost (FEAT-008, Phase 1.1): per-km tax weighted against fuel and labor cost."* — soft constraint pattern.

**HERE pattern seçeneği (FEAT-008 §3 detay):**
- **Optimal:** HERE Tour Planning `customCostMatrix` desteği varsa → objective function'a inject edilir (avoidArea **değil**, edge cost penalty)
- **Fallback:** Custom edge weights desteklenmezse → post-routing cost overlay (HERE birden fazla aday rota döner, dispatcher backend manuel toll + composite score)

Sandbox test sonucuna bağlı (ROADMAP Sıra 3, FEAT-008 UNCERTAINTIES #3).

#### FEAT-009 — Basic Carbon Footprint Per Route (Phase 1.1)

FEAT-009 implementation'ı `buildHereProblem`'e **routingMode** parametresini enjekte eder. ADR-0010 §3.4 *"'Reward function' in conversation → in implementation, it is a weighted sum of constraint penalties in HERE's `objective`. No learning."* — eco routing HERE objective'in bir mode'u, custom hesaplama değil.

**Phase 1.1 davranışı:**
```typescript
if (routingMode === "eco") {
  hereProblem.objectives.push({
    type: "minimize",
    value: "fuel_consumption",   // veya HERE Tour Planning API spec'ine göre "co2_emission"
    weight: ecoWeight
  });
}
```

**Default OFF Phase 1.1** — dispatcher per-plan opt-in toggle. Customer feedback ile 6 ay sonra default ON re-evaluate. Tam parametre ismi sandbox test sonucuna bağlı (FEAT-009 UNCERTAINTIES #1).

#### Üç-yönlü gerilim — kritik mimari nüans (2026-05-30)

Phase 1.1'de aynı `buildHereProblem`'da üç optimizasyon hedefi yarışır:

| Optimization | Type | FEAT |
|---|---|---|
| Time window (dock appointment) | HARD constraint | FEAT-006 |
| Toll cost (Vrachtwagenheffing) | SOFT constraint | FEAT-008 |
| Fuel/CO2 (eco routing) | SOFT objective | FEAT-009 |

**Çelişki senaryoları:**
- Eco mode aktif → daha yavaş rota → dock appointment kaçırılır
- Eco mode aktif → toll'lu motorway terk edilir → daha uzun N-road → daha çok yakıt (paradoks)

**Karar mantığı:**
- Time window HARD ihlal edilmez (FEAT-006 öncelik, ADR-0002 §3.4 hard constraint)
- Toll + CO2 ikisi soft, composite objective ağırlıklarıyla dengelenir
- Eco mode default OFF Phase 1.1, dispatcher opt-in
- Composite scoring weights per-company configurable (Phase 2)

Detay: FEAT-009 §3.2 üç-yönlü gerilim spec'i.

#### Breaking change disiplini

Her üç parametre **opsiyonel** olduğu için Phase 1 FEAT-001 implementation'ı tek başına çalışır — FEAT-006, FEAT-008 ve FEAT-009 implementation'ları zamanı geldiğinde imzayı genişletir, eski caller'lar etkilenmez. Bu, ADR-0004 v3 §6 additive pattern'ın signature-level uygulamasıdır.

---

## 5. Constraint priority hierarchy

Plan generation sırasında HERE'ye geçirilen kısıtlar **hiyerarşik öncelik** taşır:

### 5.1 Hard constraints (ihlal edilemez)

1. **Araç kapasitesi (CVRP)** — m³ hacim, kg ağırlık
2. **Sürücü vardiya saatleri** — yasal max driving hours + zorunlu molalar
3. **Avoidance areas** — compliance layer'dan gelen, aracın giriş yetkisi olmayan ZE-zone polygon'ları

### 5.2 Regulation hierarchy

ZE-zone uyumluluk kuralları **city overlay > national default** sırasıyla uygulanır:

- **City overlay** (örn. Amsterdam Art 14a — bölge içi kayıtlı camper SA otomatik muafiyet)
- **National default** (RVV 1990 + Beleidsregels CVDR752146/1) — şehre özel kural yoksa
- **Cross-zone ontheffing erkenning** (CVDR752146/1 Art 17) — bir şehirden alınan §1 langdurige ontheffing 19 zone'da geçerli

> **Belirsizlik:** "City overlay > national default" sıralaması **JSONB yapısının doğal sonucu** (overlay → default override), ama **explicit ADR kuralı olarak yazılı değil**. M2 (rules JSONB construct) sırasında ADR-0012 §5'e küçük bir ekleme önerilebilir.

### 5.3 Soft constraints (objective function ağırlıkları)

1. **Atanmamış işlerin minimizasyonu** — birinci öncelik: tüm task'ları rotaya yerleştirme
2. **Time window uyumu (VRPTW)** — customer-spesifik teslimat saatleri
3. **Vrachtwagenheffing maliyet optimizasyonu** — km bazlı vergi, Temmuz 2026 sonrası (FEAT-008, Phase 1.1)
4. **Toplam yakıt + sürücü maliyeti**

### 5.4 Human override (Mode 1 Advisory)

Tüm yukarıdaki kısıtlar Mode 1'de **dispatcher'a sunulan öneri**dir; nihai karar dispatcher'ındır. ADR-0005 Mode 1 disiplini: sistem önerir, dispatcher onaylar.

---

## 6. Database tables

### 6.1 Mevcut tablolar (zaten production'da)

| Tablo | Schema | Migration | Durum |
|---|---|---|---|
| `enterprise.routing_jobs` | enterprise | `1778687553584_enterprise-schema-init` | ✅ Production (doğrulama M1-öncesi yapılacak) |
| `enterprise.dispatch_tasks` | enterprise | `1778687553584_enterprise-schema-init` | ✅ Production (doğrulama bekliyor) |
| `enterprise.nl_compliance_zones` | enterprise | `1779200000000_create-enterprise-nl-compliance-zones` | ✅ Production (Sıra 2.9.2) |
| `enterprise.nl_vrachtwagenheffing_tariffs` | enterprise | `1779200000001_create-enterprise-nl-vrachtwagenheffing-tariffs` | ✅ Production (Sıra 2.9.3) |
| `public.vehicles` | public | (mevcut) | ✅ Production |
| `public.tasks` | public | (mevcut) | ✅ Production |

### 6.2 Phase 1.1 additive changes (ADR-0004 v3 §6.4)

`public.vehicles` tablosuna 4 yeni kolon eklenecek (NotebookLM ADR-0004 v3 §6.4'ten birebir alıntıladı):

```sql
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS capacity_volume_m3 numeric NULL,
  ADD COLUMN IF NOT EXISTS capacity_weight_kg numeric NULL,
  ADD COLUMN IF NOT EXISTS vehicle_class text NULL,
  ADD COLUMN IF NOT EXISTS hazmat_classes text[] NULL;
```

Bu migration **Phase 1.1'de** uygulanır, FEAT-001 Phase 1 MVP için bu kolonlar henüz **olmayabilir** (M1 doğrulaması sonrası karar).

### 6.3 Schema kararı düzeltmesi — POLYGON (MULTIPOLYGON DEĞİL)

NotebookLM çıktılarında `enterprise.nl_compliance_zones.polygon` için `GEOMETRY(MULTIPOLYGON, 4326)` yazılmış. **Bu yanlış.** Doğru:

```sql
polygon GEOMETRY(POLYGON, 4326) NOT NULL
```

Kaynak: ADR-0012 §5 schema + Sıra 2.9.2'de uygulanan production migration. Amsterdam pilot polygon recovery'sinde `ST_Difference + ST_Area > 1000m²` filtresinden sonra **tek parça** çıkıyor — POLYGON'a sığar. M1'de WKT olarak insert edilecek.

> **Not — RESEARCH_Q1_Q2_RESULTS.md Section H düzeltmesi:** Aynı belge Section H'de de "MULTIPOLYGON" hatası var (dünkü oturumda Claude tarafından yazılmış). Ayrı bir düzeltme commit'i gerek.

---

## 7. Standalone API readiness (Phase 3 preparation)

ADR-0012 Change Log'una göre Phase 3 (Compliance-as-a-Service / CaaS) trigger conjunction:

1. **Vrachtwagenheffing 12 aylık operasyonel veri** (en erken Temmuz 2027)
2. **18 ZE-zone şehrinin ≥10'unda ontheffing başarı verisi**
3. **≥10 paying dispatcher customer × ≥6 ay Compliance Pro tier kullanımı**

### Phase 1 architectural readiness (FEAT-001 ile birlikte uygulanır)

| Hazırlık | Uygulama |
|---|---|
| **URL pattern** | Compliance endpoint'leri `/api/dispatcher/compliance/...` DEĞİL, doğrudan `/api/compliance/check-access` formatında (ADR-0012 §3.1) |
| **Auth abstraction** | `authStrategy` interface: `verifyAccess(request) → { allowed, customer_id, tier }`. Phase 1'de JWT, Phase 3'te API Key swappable |
| **DB connection pool** | Compliance modülü dispatcher backend pool'unu paylaşmaz, kendi pool'unu kullanır (ADR-0009 §4.5.1) |
| **Worker process** | `nl_compliance_zones` nightly sync worker ayrı process (ADR-0012 §4.4) |

FN-012 `checkCompliance` bu pattern'e uygun yazılmalı.

---

## 8. checkCompliance — RDW data validation flow

### 8.1 Phase 1 (mevcut)

`checkCompliance` plaka bazlı sorgulamayı `public.vehicles` tablosundan yapar:
- DET (Datum Eerste Toelating)
- Emission class
- Fuel type
- Carrosserie code (eğer mevcut kolonda varsa)
- Manuel girilen ontheffing flag'i (eğer varsa)

### 8.2 Phase 2 (ADR-0012 §3.2)

ADR-0012 §3.2'de Phase 2 kapsamında listelenmiş:

> *"RDW (Araç Kayıt Kurumu) plaka-based vehicle profile lookup"*

Live RDW lookup eklenecek. **Önemli not:** RDW'nin official REST API'sinin var olup olmadığı belirsiz — RESEARCH B.4'te sadece `ovi.rdw.nl` web portal URL'i var. Phase 2 araştırması:
- RDW open data API var mı?
- Web scraping mi gerek?
- 3rd party RDW connector'lar (kentekenapi.nl gibi) var mı?

### 8.3 Otomatik muafiyet kontrolleri

`checkCompliance` aşağıdaki otomatik muafiyetleri kontrol eder (kentekenherkenning ile RDW otomatik onaylar):

**Bestelauto için:**
- Oldtimer (≥40 yaş) — DET'den hesaplanır
- Wheelchair adapted: carrosserie code **SH** veya bijzonderheidscode **70, 145, 146, 147, 149**
- Engelli adaptasyonu ≥500€

**Vrachtauto için:**
- Kermis-/circusvoertuig, exceptioneel vervoer, verhuisauto
- Carrosserie code **15, 16, 19, 23, 26, 27, 31**
- Speciale doeleinden **SB, SF**
- Laadkraan ≥35 tonmeter

> **NotebookLM hatası — düzeltildi:** NotebookLM bir cevabında "40+ yaş VE carrosserie 15/16/19" diye iki kategoriyi karıştırarak yazmıştı. Doğrusu: **40+ yaş oldtimer ayrı kategori**, **15/16/19 sadece vrachtauto için (bestelauto için SH + 70/145-149)**. Kaynak: RESEARCH_Q1_Q2_RESULTS.md §B.3.

---

## 9. UNCERTAINTIES (Cem onayı bekleyen)

### 9.1 NotebookLM çıktısından gelen sorular

1. **HERE Tour Planning per-vehicle avoidance area kabul ediyor mu?**
   Vehicle-specific avoidance pattern'in HERE API'nin gerçek özelliğine bağlı olduğu varsayılıyor. HERE docs araştırması M1-M3 öncesi yapılmalı. Eğer HERE per-vehicle değil sadece global avoidance kabul ederse, **iki-pass solve** pattern'i gerekebilir (önce muafiyet'siz araçlar zone'lu, sonra muafiyet'liler zone'suz).

2. **Sürücü mola yönetimi:** HERE Tour Planning'e gönderilecek mola kısıtlarının Hollanda sürüş saatleri yasalarına göre otomatik mi hesaplanacağı yoksa dispatcher tarafından mı girileceği.

3. **Revert grace period default değeri:** ADR-0005 §5.3'te "yapılandırılabilir yetki süresi" bahsediliyor ama default belirtilmemiş. 5 dakika? 30 dakika?

4. **Leaflet tile caching stratejisi:** Çevrimdışı veya kararsız bağlantılar için ADR-belirsiz.

5. **public.drivers.skills şeması:** ADR-0011 §12'de açık soru. jsonb mi ayrı tablo mu? FEAT-007 (driver skill matching) için kritik.

6. **dispatch_tasks.source AI veri bloatı:** PDF/email'den gelen unparsed veri jsonb'de mi yoksa S3 reference mi (FEAT-105 önerisi).

7. **Real-time ontheffing doğrulama TTL:** RDW lookup her route için mi yoksa nightly cache mi?

### 9.2 Pilot sürecinde tespit edilen belirsizlikler

8. **"City overlay > national default" priority** ADR-0012 §5'te explicit kural değil, JSONB pattern'in doğal sonucu. M2 sırasında ADR addendum gerekebilir.

9. **`enterprise.routing_jobs` ve `enterprise.dispatch_tasks` production'da var mı?**
   NotebookLM "Sıra 2 kapsamında applied" diyor (migration `1778687553584`). M1 öncesi `\dt enterprise.*` ile doğrulanmalı (Hetzner bakımı bitince).

10. **RDW REST API'nin var olup olmadığı.** RESEARCH B.4 sadece web portal URL'i veriyor (`ovi.rdw.nl`).

---

## 10. Pilot süreç notları + doğrulama bilgisi

### 10.1 Pilot akışı (2026-05-27)

5 NotebookLM prompt sonucu derlendi:
1. İlk pilot prompt → FN-001..FN-015 listesi, ADR ref boş
2. Düzeltme prompt → ADR ref doldurma + compliance chain + multi-tenancy
3. Yeni revize prompt (alıntı zorunluluğu) → FN-VRP/COMP prefix'li çıktı, Türkçeleştirme fabrikasyonu (atıldı)
4. Tekrar denenmiş prompt → temiz İngilizce alıntılı çıktı, compliance eksikliği
5. Mini düzeltme → FN-012 checkCompliance eklendi, compliance chain tamamlandı

Sonra 5 follow-up cevabı toplandı (ontheffing→HERE, standalone API, polygon→avoidance, RDW validation, priority hierarchy).

### 10.2 Alıntı doğrulama sonuçları

Spot-checked ADR §numaraları:

| Reference | Test sonucu |
|---|---|
| ADR-0001 §3.6 (Bundled libraries) | ✅ Doğru — birebir alıntı |
| ADR-0005 §4.1 (User flow) | ✅ Doğru |
| ADR-0005 §7 (Implementation Plan endpoints) | ✅ Doğru — §7 Phase 1 Week 3-4 listesi |
| ADR-0009 §5.3 (Tenant isolation) | ✅ Doğru — birebir |
| ADR-0009 §4.4 (Approval flow) | ⚠️ Kısmen — content ADR-0009'da var ama farklı §'de olabilir |
| ADR-0011 §8.2 (HERE Configurable, ZE-Zone) | ✅ Doğru |
| ADR-0011 §9.5 (API endpoints) | ✅ Doğru |
| ADR-0011 FEAT-001, FEAT-002, FEAT-008 | ✅ Doğru — gerçek FEAT-ID'ler |
| ADR-0012 §3.1 (Compliance check trigger) | ✅ Doğru |
| ADR-0012 §3.2 (Phase 2 RDW lookup) | ✅ Doğru |
| ADR-0012 §4.4 (Worker pattern) | ✅ Doğru |
| ADR-0002 §5 (IRoutingProvider) | ✅ Doğru |
| ADR-0002 §6 (Idempotency, error mapping) | ✅ Doğru |
| ADR-0001 §2 (TanStack Query) | ⚠️ Doğrulanmadı |

13/14 spot check doğrulandı. Alıntı kuralı (İngilizce tırnak içi metin zorunluluğu) **işe yaradı** — önceki turdaki ~%65 uydurma oranı bu çıktıda ~%5'e düştü.

### 10.3 Tespit edilen hatalar (konsolidasyonda düzeltildi)

| Hata | Kaynak | Düzeltme |
|---|---|---|
| `GEOMETRY(MULTIPOLYGON, 4326)` | NotebookLM çıktısı (her cevapta tutarsız: bazen P, bazen MP) | **POLYGON** doğru (ADR-0012 §5, production schema) |
| `CREATE TABLE enterprise.nl_compliance_zones` NEW_TABLES'da | NotebookLM ROADMAP'i okurken Sıra 2.9.2 done bilgisini atlamış | Tablo zaten var, sadece **INSERT seed** gerek (M1-M3) |
| Carrosserie kod 15/16/19 + 40+ yaş birleştirme | NotebookLM Cevap 4 (RDW validation) | İki ayrı kategori — RESEARCH §B.3'e göre düzeltildi (§8.3) |
| ADR-0001 §3.6 "muhtemelen yok" (Claude dünkü yanılgısı) | Bu pilotun ilk turunda Claude'un hatası | Bu turda §3.6 doğrulandı — gerçek |

### 10.4 Standartlaşmış prompt — gelecek 30 feature için

Bu pilotta elde edilen prompt template (alıntı zorunluluğu kuralı dahil) gelecek FEAT-002..FEAT-031 için **şablon** olarak kullanılır. NotebookLM kotası dolduğunda Claude (project knowledge search ile) aynı işi yapabilir, daha yavaş ama tutarlı.

---

## 11. Next steps

### 11.1 Pre-M1 (Hetzner bakımı sonrası)

- [ ] `\dt enterprise.*` ile production schema doğrulama (routing_jobs, dispatch_tasks var mı?)
- [ ] T3 polygon recovery (ST_Difference + filter, WKT'yi kalıcı dosyaya kaydet)
- [ ] RESEARCH_Q1_Q2_RESULTS.md Section H'deki MULTIPOLYGON → POLYGON düzeltmesi (ayrı commit)

### 11.2 M1-M7 migration sprint (FEAT-001 implementation öncesi)

Bu spec'in M1-M7 backlog'una direkt input'u:
- **M1:** Amsterdam pilot polygon WKT hazırla (POLYGON, 7.84 km²)
- **M2:** `rules` JSONB construct (shared_rules + city_overlay, fee values)
- **M3:** `1779300000000_seed-nl-compliance-zones-pilot-amsterdam.sql` yaz
- **M4-M7:** Staging dry-run → apply → smoke test → production apply

### 11.3 FEAT-001 implementation backlog

M1-M7 bitince bu feature'ın kendisi build edilecek:
- ROADMAP Sıra 6 — dispatcher backend endpoints (FN-003, FN-004, FN-013)
- ROADMAP Sıra 6 — HERE integration (FN-007, FN-008, FN-016)
- ROADMAP Sıra 6 — worker (FN-010)
- ROADMAP Sıra 6 — frontend (FN-001, FN-002, FN-015)
- ROADMAP Sıra 6 — compliance integration (FN-012)

### 11.4 FEAT-002..FEAT-031 pipeline

Bu pilot şablon olarak kullanılır. NotebookLM kotası kontrolüyle:
- 31 feature'dan **Very common + tulipfleet zaten yapıyor** olanlarla başla (~8-10 feature)
- Her feature için aynı prompt + alıntı kuralı
- Her feature için ayrı `docs/functions/FEAT-XXX-...md` dosyası
- Her dosya commit edilince Cem'in onayı + paylaşılan fonksiyonların consolidate edileceği `docs/functions/_shared.md` master dokümanı (ileri)

---

## 12. References

- ADR-0001 (Dispatcher UI Stack)
- ADR-0002 (HERE Tour Planning VRP solver)
- ADR-0004 v3 (Database strategy — schema authority)
- ADR-0005 (Dispatch workflow — Mode 1 Advisory)
- ADR-0009 (Enterprise production integration map — tenant isolation)
- ADR-0011 (Dispatcher use case scope — FEAT-001 source)
- ADR-0012 (NL compliance layer — compliance trigger, Phase 3 trigger conjunction)
- RESEARCH_Q1_Q2_RESULTS.md (Amsterdam pilot research, §B.3 carrosserie codes)
- ROADMAP (Sıra 2.9 done, Sıra 6 dispatcher endpoints pending)
- NotebookLM 5-prompt session (2026-05-27)

---

## 13. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-27 | Cem Bakir (with Claude + NotebookLM cowork) | İlk konsolide function spec. Pilot — gelecek 30 feature için şablon. |
| 2 | 2026-05-29 | Cem Bakir | **Cross-spec sync — FEAT-006 + FEAT-008 future evolution notları eklendi.** FN-016 `buildHereProblem` inputs imzası iki opsiyonel parametre kabul edecek şekilde genişletildi: `appointments?` (FEAT-006 service duration) + `tollCostMatrix?` (FEAT-008 Vrachtwagenheffing). Her iki parametre opsiyonel olduğu için Phase 1 implementation tek başına çalışır — breaking change DEĞİL, ADR-0004 v3 §6 additive pattern signature-level uygulaması. Yeni §4.5 "Future evolution from FEAT-006 + FEAT-008" bölümü eklendi (HERE optimal vs fallback pattern, FEAT-006 dock service duration, FEAT-008 customCostMatrix sandbox dependency). FN-016 not satırı 2026-05-29 update bağlantısı içerir. |
| 3 | 2026-05-30 | Cem Bakir | **Cross-spec sync v3 — FEAT-009 future evolution eklendi.** FN-016 inputs imzasına üçüncü opsiyonel parametre: `routingMode?: "fastest" \| "shortest" \| "eco"` (FEAT-009 Phase 1.1 HERE Eco Routing aktivasyonu). §4.5 başlığı "Future evolution from FEAT-006 + FEAT-008 + FEAT-009" olarak güncellendi, yeni "FEAT-009 — Basic Carbon Footprint Per Route" alt-bölümü eklendi (ADR-0010 §3.4 weighted sum pattern alıntısı, default OFF Phase 1.1 karar). **Yeni "Üç-yönlü gerilim" alt-bölümü** eklendi (kritik mimari nüans): aynı `buildHereProblem`'da Time window (FEAT-006 HARD) vs Toll (FEAT-008 SOFT) vs Eco (FEAT-009 SOFT) yarışır; çelişki senaryoları ve karar mantığı belgelendi. Breaking change disiplini paragrafı 3 parametreli versiyona güncellendi. FN-016 not satırı "2026-05-30 update" satırı içerir. FN-016 Shared kolonu: `F006, F008, F009`. |
| 3.1 (mega cross-spec sync) | 2026-05-30 | Cem Bakir + Claude | **FN-016 buildHereProblem imzası +3 yeni parametre** — `daysHorizon?` (FEAT-019:FN-04 multi-day VRP), `driverRules?` (FEAT-019:FN-04 EU 561/2006), `evMode?` (FEAT-103:FN-04 EV routing). §4.5 başlığı genişletildi (FEAT-006+008+009+019+103 → 6 parametre toplam). Tüm parametreler optional — FEAT-001 standalone Phase 1 davranışı değişmez (breaking change yok, forward-compatible additive evolution pattern). Multi-way tension belgelendi (Time/Toll/Eco/Multi-day/EV weighted sum HERE objective). Mega cross-spec sync FEAT-010 + FEAT-017 + FEAT-008 + FEAT-009 ile birlikte atomic commit. 17 pilot toplam tamamlandı. |
