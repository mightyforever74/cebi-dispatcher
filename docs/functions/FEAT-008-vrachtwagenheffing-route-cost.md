# FEAT-008 — Vrachtwagenheffing Route Cost Optimization

| Field | Value |
|---|---|
| **Feature ID** | FEAT-008 |
| **Source** | ROADMAP Phase 1.1 follow-up; ADR-0012 §3.1 (2026-05-25 Addendum ile FEAT-008'e relocate edildi) |
| **Trigger** | **Temmuz 2026** — vrachtwagenheffing.nl resmi API live |
| **Tulipfleet Phase** | Phase 1.1 (MVP launch sonrası 1-4 hafta marginal effort ~3-5 gün, schema in place) |
| **Schema status** | ✅ Production'da (Sıra 2.9.3, 2026-05-26) — `enterprise.nl_vrachtwagenheffing_tariffs` |
| **Status** | Function spec drafted via NotebookLM (1 prompt, 2026-05-29). **Period-1 baseline IMPLEMENTED 2026-06-03** (tariff seed prod+staging + `calculateHeffing` engine) — see §0 Reality Update. |
| **Pilot note** | Sekizinci pilot. Tek iterasyonda **9.5/10** skor. **§number fabrikasyon = 0** ✅ (F7'deki uyarı sonrası kalite zirvesi). Schema-ready disiplini ROADMAP üzerinden doğru kavrandı. |

---

## 0. Reality Update — Period 1 implementation (2026-06-03)

> **Bu blok, resmi tarife tablosu vrachtwagenheffing.nl uzerinden browser ile dogrulandiktan SONRA eklendi. Asagidaki gercekler spec'in bazi varsayimlarini gecersiz kiliyor. Temmuz 2026 consuming-logic'i yazilirken ONCE bu blok okunmalidir.**

**Yapilan (API-bagimsiz yari — COMPLETE):**
- Resmi Period-1 tarifeleri seed edildi: `enterprise.nl_vrachtwagenheffing_tariffs`, prod + staging, 9 satir, migration `1782100000000`. Window `2026-07-01 -> 2026-08-31`. Kaynak: vrachtwagenheffing.nl "Dit gaat u betalen" tablosu "tot 1 september 2026" (browser-verified). Weight `12_18t`/`18_32t`/`32_plus_t` x emission `euro_5`/`euro_6`/`zero_emission`.
- `lib/calculateHeffing.js` (tulipfleet-enterprise-backend, commit `cabc90e`, 5/5 Jest) — pure fn, date-versioned lookup.

**GERCEK 1 — `road_type` 2026 tarifesinde YOK (spec §1.1 3. eksen gecersiz):**
Resmi tarife tablosu IKI eksenli: `vehicle_weight_class` x `CO2-emissieklasse`. Yol tipi (motorway/n_road/all_other) tarifeyi ETKILEMIYOR — heffing distance-based, km basina sabit. Etkilenen fonksiyonlar:

| Spec ogesi | Period-1 gercegine gore |
|---|---|
| **FN-04 `fetchRoadSegmentType`** (HERE polyline -> RoadType[]) | **GEREKSIZ olabilir** — yol tipi tarifeye girmiyor. FN-04 + UNCERTAINTIES #1 (HERE road granularity) dusurelebilir. Ciddi is tasarrufu. |
| **FN-03 `calculateSegmentTollCost(distance_km, roadType, hgvProfile)`** | `roadType` parametresi anlamsiz. `total = sum(km) x rate` yeter. `calculateHeffing.js` bunu `road_type='all_other'` sabitiyle zaten yapiyor. |
| **FN-09 rapor `road_type_breakdown` / `groupBy=road_type`** | Anlamsiz (hepsi `all_other`). Rapor `weight_class`/`emission_class`/`vehicle` bazli olmali. |
| **§5.1 sema `road_type` kolonu** | KALIR (forward-compat). Period-1 verisi hep `'all_other'`. |

**GERCEK 2 — emission_class enum spec'teki §EV-exemption ALTER ile CELISIYOR:**
Spec'in "EV exemption integration (FEAT-103, 2026-05-30)" bolumu su ALTER'i onermisti:
`CHECK (emission_class IN ('euro4','euro5','euro6','zero_emission'))` — 4 deger, alt-cizgisiz.
**Gercek prod semasi (bu oturumda `\d` ile dogrulandi) FARKLI:** `euro_0`..`euro_6` + `zero_emission` (8 deger, alt-CIZGILI `euro_6`). Spec'teki o ALTER ya hic uygulanmadi ya farkli uygulandi. Seed `euro_6` (cizgili) kullandi — prod CHECK boyle. Spec'in §EV bolumu eski/yanlis formatta; consuming-logic gercek enumu (`euro_N`, 8 deger) kullanmali.

**GERCEK 3 — zero_emission "placeholder 0 EUR/km" varsayimi gecersiz:**
Spec §EV-exemption "NL government zero-emission HGV tariff henuz aciklanmadi -> placeholder 0 EUR/km" diyordu. **Resmi tarifeler ACIKLANDI ve seed edildi:** zero_emission 12_18t=0.035, 18_32t=0.037, 32_plus_t=0.038 EUR/km (CO2-klasse 5). Sifir degil. FEAT-103 EV exemption logic'i bu gercek rakamlari kullanmali, 0 placeholder degil.

**OPEN WORK:**
- **Period 2** (`2026-09-01 -> 2026-12-31`, -%22,3 gecici indirim, Minister Karremans 22 May 2026). Resmi "van 1 september 2026 tot 1 januari 2027" tablosundan yuvarlanmis degerler okunup insert edilecek. `onDate` version handling hazir.
- 2027 enflasyon tarifeleri Ekim 2026'da yayimlanir.
- `euro_0..euro_4` + CO2-klasse 2-4 sub-tier'lar deferred (o araclar icin `matched:false`).
- Consuming-logic (FN-05/06 HERE toll injection, FN-08 widget, FN-09 rapor, `routing_jobs.cost_breakdown`) Temmuz 2026 API live olunca — yukaridaki road_type sadelesmesiyle.

---

## 1. Feature description

### 1.1 Vrachtwagenheffing nedir

Hollanda hükümeti tarafından **Temmuz 2026'da** yürürlüğe girecek kilometre-bazlı kamyon yol ücretlendirme sistemi. Ücret hesaplaması üç boyutlu bir lookup table'a dayanır:

| Boyut | Değerler |
|---|---|
| **Weight class** | `12_18t`, `18_32t`, `32_plus_t` (3 sınıf) |
| **Emission class** | `euro_0`...`euro_6`, `zero_emission` (8 sınıf) |
| **Road type** | `motorway`, `n_road`, `all_other` (3 sınıf) |

Tarife birimi: **€/km** (saatlik/günlük değil, gerçek km × tarife).

### 1.2 İş mantığı (Phase 1.1 aktivasyonu)

```
1. Dispatcher görev planlar → HERE Tour Planning'e gönderir
2. HERE birden fazla aday rota döner
   (örn: motorway via A2, N-road via N201)
3. FEAT-008: Her aday rota için Vrachtwagenheffing maliyeti hesaplanır
   - Vehicle profile (weight_class + emission_class) ile
   - Her road segment için tariff lookup
   - Toplam toll cost = Σ (segment_km × tariff_eur_per_km)
4. Total cost = HERE fuel cost + Vrachtwagenheffing cost
5. Dispatcher en düşük TOTAL maliyetli rotayı seçer
   (veya en hızlısını — policy konfigürasyon)
```

### 1.3 Constraint hierarchy — ADR-0002 §3.4 (addendum)

Vrachtwagenheffing **soft constraint** olarak modellenir:

| Constraint type | Tanım | Vrachtwagenheffing |
|---|---|---|
| **Hard** | Violation imkansız (capacity, shift hours, avoidance) | ❌ Değil |
| **Soft** | Weighted in objective function | ✅ EVET — per-km cost penalty |

**Önemli:** Pahalı yol **blocked DEĞİL** — sadece maliyet etkisi. Trade-off açık:
- Vrachtwagenheffing pahalı motorway (hızlı + ücretli)
- vs daha uzun N-road (yavaş + ucuz)

Dispatcher hangi rotayı seçer? → Composite score (time × cost weight) optimization (UNCERTAINTIES #6).

### 1.4 Kapsam — içeride

- `syncVrachtwagenheffingTariffs` worker (vrachtwagenheffing.nl API consumer)
- Vehicle profile → tariff lookup (`getTariffForVehicle`)
- Per-segment toll cost hesaplama (`calculateSegmentTollCost`)
- HERE solver'a cost matrix enjeksiyonu (`buildHereProblem` extension)
- HERE road type → tariff road_type mapping (`fetchRoadSegmentType`)
- MatrixCache extension toll-aware variant
- Dispatcher panel cost breakdown widget
- Admin HGV toll report endpoint

### 1.5 Kapsam — dışarıda

- **Ücret ödemesi / banka entegrasyonu** — vrachtwagenheffing.nl kendi mekanizmasını işletir, TulipFleet sadece **maliyet hesaplama**
- **Real-time tarife streaming** — tarifeler nadir değişir (effective_from bazlı), aylık batch yeterli
- **Vehicle weight_class/emission_class migration** — ADR-0004 v3 §6.4 kapsamında ayrı iş (FEAT-008 ön koşulu, §6 detay)
- **Cross-border toll calculation** (Belgium Viapass, Germany Maut, France Ecotaxe) — gelecek Phase 2+ customer-funded

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Phase | Shared with FEAT-001..7 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FEAT-008-FN-01 | worker | `syncVrachtwagenheffingTariffs` | (cron trigger) | void | — | enterprise.nl_vrachtwagenheffing_tariffs | Vrachtwagenheffing.nl API | ADR-0012 §3.1 (2026-05-25 Addendum) — "seed verisi ve consuming logic Phase 1.1'e ertelendi" | 1.1 | — |
| 2 | FEAT-008-FN-02 | backend | `getTariffForVehicle` | vehicleId, effectiveDate | Tariff[] | enterprise.nl_vrachtwagenheffing_tariffs, public.vehicles (weight_class + emission_class) | — | — | ADR-belirsiz (tariff version handling — UNCERTAINTIES #4) | 1.1 | — |
| 3 | FEAT-008-FN-03 | shared_library | `calculateSegmentTollCost` | distance_km, roadType, hgvProfile | cost: numeric | — | — | — | ADR-0002 §3.4 — "Soft constraints (weighted in the objective function): unassigned-task penalty; time-window violations; **Vrachtwagenheffing per-km cost (FEAT-008, Phase 1.1)**: per-km tax weighted against fuel and labor cost." | 1.1 | — |
| 4 | FEAT-008-FN-04 | backend | `fetchRoadSegmentType` | polyline (lat/lng[]) | RoadType[] | — | Redis (cache) | HERE Routing API | ADR-belirsiz (HERE road_type granularity — UNCERTAINTIES #1) | 1.1 | **FEAT-005:FN-01** (HERE consume pattern) |
| 5 | FEAT-008-FN-05 | shared_library | `MatrixCache.getWithToll` | locations: LatLng[], hgvProfile | MatrixResponse + tollCostMatrix | Redis | Redis | HERE Distance Matrix | ADR-0002 §5 — "MatrixCache — caches Distance Matrix responses (Redis, 24-hour TTL) to control per-request cost." | 1.1 | **FEAT-001:FN-008** (extension) |
| 6 | FEAT-008-FN-06 | shared_library | `buildHereProblem` (extends FEAT-001:FN-016) | tasks, vehicles, **tollCostMatrix**, complianceZones, appointments | HERE_JSON | enterprise.nl_vrachtwagenheffing_tariffs | — | — | ADR-0002 §3.4 — "Soft constraints (weighted in the objective function): ... **Vrachtwagenheffing per-km cost (FEAT-008, Phase 1.1)**: per-km tax weighted against fuel and labor cost." | 1.1 | **FEAT-001:FN-016 — imza evrimi**, cross-spec sync gerekli |
| 7 | FEAT-008-FN-07 | backend | `getVehicleHgvProfile` | vehicleId | { weight_class, emission_class } | public.vehicles | — | — | ADR-0004 v3 §6.4 — additive `public.vehicles` capacity columns (`capacity_volume_m3`, `capacity_weight_kg`, `vehicle_class`, `hazmat_classes`) Phase 1.1 migration | 1.1 | — |
| 8 | FEAT-008-FN-08 | frontend | `<CostBreakdownWidget />` | planId | UI Component | enterprise.routing_jobs (cost_breakdown JSONB) | — | — | ADR-0001 §3.6 — "React ChartJS 2 — KPI dashboard, fuel and route trend visualizations" | 1.1 | — |
| 9 | FEAT-008-FN-09 | backend | `GET /api/dispatcher/reports/hgv-toll` | (JWT.company_id), period, groupBy | TollReportJSON | enterprise.dispatch_tasks, enterprise.routing_jobs | — | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 1.1 | — |

**Konsolidasyon notları:**

| # | NotebookLM dedi | Düzeltme |
|---|---|---|
| FN-01 ADR-0012 §3.1 alıntı | Parafraz ("seed verisi ve consuming logic Phase 1.1'e ertelendi") — gerçek cümleye yakın ama küçük farklı | ✅ Düzeltildi: birebir cümle *"Schema migration ... yine Sıra 2.9.2'de uygulanır; seed verisi ve consuming logic Phase 1.1'e ertelendi."* |
| FN-02 inputs | NotebookLM `vehicleId: UUID` tek parametre | ✅ Eklendi `effectiveDate` — tariff version handling için (UNCERTAINTIES #4) |
| FN-06 inputs | `tollCosts` adı çelişkili | ✅ `tollCostMatrix` netleştirildi (FN-05 ile uyumlu çıktı tipi) |
| FN-09 outputs | "TollReportJSON" şekli açıklanmamış | ✅ §4'te schema detaylandı |
| FN-08 Reads from | `enterprise.routing_jobs` ✓ doğru | — Mevcut tablo, FEAT-001'den miras (cost_breakdown JSONB kolonu eklenmeli — Phase 1.1 prep) |

---

## 3. HERE integration pattern

### 3.1 Soft constraint enjeksiyon mantığı

ADR-0002 §3.4 (bizim addendum'umuz):
> *"Soft constraints (weighted in the objective function): ... Vrachtwagenheffing per-km cost (FEAT-008, Phase 1.1): per-km tax weighted against fuel and labor cost."*

`buildHereProblem` (FN-06) HERE Tour Planning JSON'a şu şekilde enjekte eder:

```typescript
const hereProblem = {
  fleet: { ...vehicles },
  plan: { ...tasks },
  objectives: [
    { type: "minimize", value: "completion_time", weight: timeWeight },
    { type: "minimize", value: "fuel_cost", weight: fuelWeight },
    {
      type: "minimize",
      value: "custom_cost",  // toll cost as custom objective
      weight: tollWeight,
      // FN-05 MatrixCache.getWithToll'dan gelen edge-cost matrisi
      customCostMatrix: tollCostMatrix
    }
  ]
};
```

**Önemli:** Bu **avoidArea** kullanımı DEĞİL (hard constraint = yol blocked) — `customCostMatrix` (soft constraint = yol pahalı). HERE Tour Planning API'nin custom edge weights desteği UNCERTAINTIES #3'te sandbox testine bırakıldı.

### 3.2 Fallback — Post-routing cost overlay

Eğer HERE Tour Planning custom edge weights kabul etmezse (sandbox test sonucuna bağlı), alternatif pattern:

```
1. HERE'a normal sorgu gönder (toll bilgisi olmadan)
2. HERE birden fazla aday rota döner
3. Dispatcher backend her aday için manuel toll hesapla (FN-03)
4. Composite score = time_weight × time + cost_weight × (fuel + toll)
5. En düşük composite score'lu rotayı seç
```

Bu pattern **daha az optimal** (HERE solver toll'u bilmeden optimize eder), ama her durumda fallback olarak çalışır. Karar UNCERTAINTIES #3 sandbox test sonucuna bağlı.

---

## 4. `GET /api/dispatcher/reports/hgv-toll` — endpoint detayı (FN-09)

NotebookLM çıktısında output şekli net değildi. Konsolidasyonda spec edildi:

### 4.1 Request parameters

```
GET /api/dispatcher/reports/hgv-toll
  ?from=2026-07-01           # ISO date
  &to=2026-07-31
  &groupBy=vehicle|driver|day|road_type
  &(JWT.company_id)
```

### 4.2 Response schema

```json
{
  "period": { "from": "2026-07-01", "to": "2026-07-31" },
  "total_toll_eur": 4523.18,
  "total_km": 18421.5,
  "avg_eur_per_km": 0.2456,
  "groupBy": "vehicle",
  "breakdown": [
    {
      "key": "vehicle-uuid-1",
      "label": "GV-082-B (Mercedes Actros)",
      "total_toll_eur": 1245.30,
      "total_km": 5012.0,
      "road_type_breakdown": {
        "motorway": { "km": 4200, "toll_eur": 1100.50 },
        "n_road":   { "km":  650, "toll_eur":  130.20 },
        "all_other":{ "km":  162, "toll_eur":   14.60 }
      }
    },
    ...
  ]
}
```

### 4.3 Use cases

| Consumer | Use case |
|---|---|
| Dispatcher | Aylık toll harcaması monitoring, anomali tespiti |
| Admin | Per-vehicle/per-driver cost allocation (chargeback) |
| Finance | CSRD reporting hazırlığı (FEAT-009 carbon ile beraber kullanılır) |
| Customer | (Phase 2) Müşteri faturasında toll passthrough |

---

## 5. Database — `enterprise.nl_vrachtwagenheffing_tariffs`

### 5.1 Mevcut schema (production'da, Sıra 2.9.3'te applied)

```sql
CREATE TABLE enterprise.nl_vrachtwagenheffing_tariffs (
    id                  TEXT PRIMARY KEY,
    weight_class        TEXT NOT NULL
                        CHECK (weight_class IN ('12_18t','18_32t','32_plus_t')),
    emission_class      TEXT NOT NULL
                        CHECK (emission_class IN ('euro_0','euro_1','euro_2','euro_3','euro_4','euro_5','euro_6','zero_emission')),
    road_type           TEXT NOT NULL
                        CHECK (road_type IN ('motorway','n_road','all_other')),
    tariff_eur_per_km   NUMERIC(6,4) NOT NULL,
    effective_from      DATE NOT NULL,
    effective_to        DATE,
    source_url          TEXT,
    metadata            JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (weight_class, emission_class, road_type, effective_from)
);
```
-- Cross-spec sync (2026-05-30 mega sync, FEAT-103 entegrasyonu):
-- emission_class enum'a 'zero_emission' eklendi (EV exemption handling)
ALTER TABLE enterprise.nl_vrachtwagenheffing_tariffs
  DROP CONSTRAINT IF EXISTS nl_tariff_emission_class_check,
  ADD CONSTRAINT nl_tariff_emission_class_check 
  CHECK (emission_class IN ('euro4', 'euro5', 'euro6', 'zero_emission'));

### EV exemption integration (cross-spec sync, FEAT-103, 2026-05-30 mega sync)

FEAT-103:FN-12 `getVrachtwagenheffingEvExemption` zero-emission HGV muafiyet handling için FEAT-008 schema'sını consume eder:

- **emission_class enum genişletildi** → `'zero_emission'` eklendi
- **FN-12 algoritması:** vehicle `fuel_type='electric'` AND `emission_class='zero_emission'` → tariff lookup
- **Phase 2 başlangıç:** NL government zero-emission HGV tariff henüz açıklanmadı (UNCERTAINTIES #4 FEAT-103). Placeholder 0 EUR/km + audit log warning.
- **2026 Temmuz sonrası seed:** NL tariff yayınlandıktan sonra rows eklenir.

**Karşılık FEAT-103 §4 (Vrachtwagenheffing EV Exemption):** detaylı algoritma + fallback rate handling.

**Schema tutarlılığı:** `public.vehicles.emission_class` constraint da `'zero_emission'` içermeli (FEAT-103 §7.1 ALTER TABLE).
### 5.2 Tariff version handling — UNCERTAINTIES #4

`effective_from` ve `effective_to` ile **tariff version'lanır**. Bir görev tarihindeki geçerli tarife:

```sql
SELECT tariff_eur_per_km
FROM enterprise.nl_vrachtwagenheffing_tariffs
WHERE weight_class = $1
  AND emission_class = $2
  AND road_type = $3
  AND effective_from <= $4::date   -- görev tarihi
  AND (effective_to IS NULL OR effective_to > $4::date)
ORDER BY effective_from DESC
LIMIT 1;
```

**Önemli:** `getTariffForVehicle` (FN-02) hem **şimdiki tarife** hem **gelecekteki tarife** hesaplama için kullanılır. Görev tarihindeki geçerli tarife seçilir, batch planlama 30+ gün ileriye yapılırsa farklı tarife window'larına denk gelebilir.

### 5.3 Schema gap — `public.vehicles.weight_class` + `emission_class`

**Kritik dependency:** FEAT-008 aktivasyonu **ADR-0004 v3 §6.4 migration'ı tamamlanmış olmasını gerektirir.**

ROADMAP Phase 1.1'de iki iş **aynı dönemde** ama §6.4 migration **FEAT-008'in ön koşulu:**

```
ADR-0004 v3 §6.4 migration (Phase 1.1, FEAT-008 ön koşulu)
  ↓
public.vehicles ADD COLUMN:
  - capacity_volume_m3 NUMERIC(8,2)
  - capacity_weight_kg INTEGER       ← FEAT-008 weight_class derive
  - vehicle_class TEXT               ← FEAT-008 weight_class kategorize
  - hazmat_classes JSONB
  - emission_class TEXT              ← FEAT-008 direct lookup
```

**Konsolidasyon karar:** `weight_class` doğrudan kolon mu, yoksa `capacity_weight_kg`'den türetilir mi? UNCERTAINTIES #5.

### 5.4 `enterprise.routing_jobs.cost_breakdown` JSONB (FN-08 için)

`enterprise.routing_jobs` mevcut tablo (FEAT-001'den). FEAT-008 Phase 1.1 implementation'ında additive kolon eklenmeli:

```sql
ALTER TABLE enterprise.routing_jobs
  ADD COLUMN cost_breakdown JSONB;
-- Örnek payload:
-- {
--   "fuel_cost_eur": 45.20,
--   "toll_cost_eur": 12.75,
--   "labor_cost_eur": 89.50,
--   "total_cost_eur": 147.45,
--   "toll_breakdown_by_road_type": {
--     "motorway": 10.50,
--     "n_road": 2.25,
--     "all_other": 0.00
--   }
-- }
```

Bu **additive enterprise.* change** (ADR-0004 v3 §6 pattern). FEAT-008 implementation öncesi yazılır.

---

## 6. Shared infrastructure with previous FEAT'leri

| FEAT-008 fonksiyon | Shared with | Paylaşım türü |
|---|---|---|
| FN-04 fetchRoadSegmentType | **FEAT-005:FN-01** getHereRoutingEta | HERE API consumer pattern (Redis cache + retry pattern) |
| FN-05 MatrixCache.getWithToll | **FEAT-001:FN-008** MatrixCache.get | Cache key extension — toll-aware variant ekler |
| FN-06 buildHereProblem | **FEAT-001:FN-016** buildHereProblem | **İmza evrimi** — tollCostMatrix parametresi eklenir, breaking change DEĞİL |

**Yeni cross-spec sync gereksinimi:** FEAT-001 spec'inde FN-016 buildHereProblem imzasının **forward-compatible** olarak yazıldığını belirten "Future evolution from FEAT-008" notu eklenmeli. Bu, dünden kalan FEAT-006 cross-spec sync TODO'su (FEAT-001:FN-016 service_duration) ile **aynı dosyada** yapılır — tek commit, iki future-evolution notu.

---

## 7. UNCERTAINTIES (Cem onayı bekleyen)

### NotebookLM'in tespit ettikleri

1. **HERE Road Type Granularity (FN-04):** HERE Routing API segment çıktısında `motorway`/`n_road`/`all_other` enum birebir mi, yoksa TulipFleet tarafında mapping katmanı mı?
   - **Test gerek:** ROADMAP Sıra 3 HERE Tour Planning sandbox'ta doğrulanır
   - HERE'nin actual response field'ları: `functional_class` (1-5), `road_class`, `name_attribute` → bu lookup table TulipFleet tarafında olabilir

2. **API Sandbox availability (Temmuz 2026 öncesi):** vrachtwagenheffing.nl üzerinde dev/sandbox API açık mı?
   - ADR-0012 §9 Open Questions ile bağlantılı (Vrachtwagenheffing API olgunluğu trigger conjunction'da kriter)
   - Politik/idari soru — TulipFleet'ten bağımsız

3. **Custom Edge Weights HERE'de var mı (FN-06):** HERE Tour Planning custom edge weights kabul ediyor mu?
   - Kabul ederse → §3.1 optimal pattern
   - Kabul etmezse → §3.2 post-routing fallback (daha az optimal, ama working)
   - Sandbox test sonucuna bağlı

### Konsolidasyonda eklenen

4. **Tariff version handling (FN-02):** Effective_from/effective_to ile tarihsel tarifelerden hangisinin seçileceği belli — ama:
   - **Batch planlama 30+ gün ileriye** yapılırsa yeni tarife window'larına denk gelebilir
   - Görev planlama anındaki tarife mi, görev tarihindeki tarife mi kullanılır?
   - **Önerilen:** Görev tarihindeki tarife (FN-02 effectiveDate parameter alır) — actual cost hesaplaması doğru olur. Plan anındaki tarife sadece UI gösterimi için.
   - **Trade-off:** Tariff Temmuz 2026'da değişirse, planlama Mayıs'ta yapılan görev için bilinen olmayabilir → fallback en yeni tarife (basitleştirme).

5. **Schema gap detail — weight_class derivation (§5.3):** ADR-0004 v3 §6.4 migration'da:
   - **Seçenek A:** `weight_class TEXT` direkt kolon — basit, type-safe
   - **Seçenek B:** `capacity_weight_kg INTEGER` + business logic derives `weight_class`:
     - 12000 ≤ kg < 18000 → `12_18t`
     - 18000 ≤ kg < 32000 → `18_32t`
     - kg ≥ 32000 → `32_plus_t`
   - **Önerilen:** Seçenek B (capacity_weight_kg) + uygulama katmanı derivation. Daha az redundancy, business rule changes API'de kalır.

6. **Cost optimization trade-off (FN-06 weight tuning):** Composite score weights:
   - **Default önerilen:** time_weight = 0.6, fuel_weight = 0.2, toll_weight = 0.2
   - **Per-company override:** Phase 2 policy module
   - **Trade-off senaryosu:** Acil görev (yüksek time_weight) vs maliyet-odaklı (yüksek cost_weight)
   - ADR-0010 §3.4 "configuration, not learned behavior" — manual tuning, ML değil

7. **Tariff sync frequency (FN-01):** Aylık cron yeterli mi?
   - Tarifeler **nadiren** değişir (effective_from bazlı, yılda 1-2 update bekleniyor)
   - **Önerilen:** Monthly cron (her ayın 1'inde) + webhook desteği varsa subscribe
   - Cron job çalıştığında: yeni effective_from tariff varsa INSERT, varolanlar UPDATE değil (immutable history)

8. **FEAT-009 (carbon) ile integration:** ROADMAP Phase 1.1'de iki feature yan yana:
   - FEAT-008 (toll cost)
   - FEAT-009 (carbon footprint via HERE Eco Routing)
   - Aynı HERE sorgusunda her ikisi de gelir mi? — Verim için tek API call'da iki veri çekilebilir
   - FN-09 reports endpoint FEAT-009 ile shared infrastructure olabilir → cross-spec sync FEAT-009 spec yazıldığında

---

## 8. Pilot süreç notları

### 8.1 Pilot akışı (2026-05-29)

Tek prompt + 0 follow-up. NotebookLM defterinde **ROADMAP.md kaynağı** mevcuttu → prompt'ta "ROADMAP'TEN BAĞLAM" ve "SCHEMA HATIRLAT" blokları çıkarıldı. NotebookLM'in kaynak okumasıyla Phase 1.1 timing, schema readiness, FEAT-008 trigger doğru kavrandı.

### 8.2 Alıntı doğrulama — F8 zirve performansı

| # | NotebookLM | Gerçek | Durum |
|---|---|---|---|
| ADR-0012 §3.1 (FN-01) | Parafraz alıntı | Birebir değil ama yakın | ⚠️ Minor — düzeltildi |
| ADR-0002 §3.4 (FN-03, FN-06) | ✅ Doğru | Bizim addendum'umuz, birebir | ✅ |
| ADR-0002 §5 (FN-05) | ✅ Doğru | FEAT-005:FN-11'de doğrulandı | ✅ |
| ADR-0004 v3 §6.4 (FN-07) | ✅ Doğru | ROADMAP'te doğrulandı | ✅ |
| ADR-0001 §3.6 (FN-08) | ✅ Doğru | Önceki turlarda | ✅ |
| ADR-0011 §9.5 (FN-09) | ✅ Doğru | Önceki turlarda | ✅ |

**§number fabrikasyon: 0** ✅
**Toplam alıntı hatası: 1** (FN-01 parafraz, minor)

Bu **F1-F7'nin en temiz alıntı disiplini**. F7'deki §number uyarısı işe yaradı.

### 8.3 8 pilot karşılaştırma

| Boyut | F1 | F2 | F3 | F4 | F5 | F6 | F7 | **F8** |
|---|---|---|---|---|---|---|---|---|
| Skor | 9 | 9.5 | 9 | 9 | 8.5 | 9 | 8.5 | **9.5** |
| İterasyon | 5 | 3 | 2 | 1+1 | 1+3 | 1 | 1+1 | **1** |
| Fonksiyon | 16 | 16 | 16 | 12 | 12 | 10 | 14 | **9** |
| Alıntı hatası | 1 | 1 | 1 | 0 | 1 | 1 | 6 | **1** (minor) |
| §number fabrikasyon | 1 | 1 | 1 | 0 | 1 | 1 | 1 | **0** ✅ |
| Yeni paradigma | VRP | Re-route | Dispatch | Multi-actor | HERE consume | Task duration | Rule-based coaching | **Soft constraint + cost matrix** |

**F8 trendleri:**
- **Verim zirvesi:** Tek iterasyon + 9.5/10 skor + minimal düzeltme
- **§number fabrikasyon stop:** F7 uyarı işe yaradı, F8'de 0 hata
- **Kapsam disiplini mükemmel:** Phase 1.1 timing, schema-ready, soft constraint pattern hepsi doğru
- **ROADMAP kaynak yüklemenin etkisi:** Prompt'ta tekrar gerekli olmadı, NotebookLM Phase 1.1 bağlamını ROADMAP'ten aldı

---

## 9. Next steps

### 9.1 Cross-spec sync (commit öncesi/sonrası)

**FEAT-001 spec güncellemesi (`docs/functions/FEAT-001-multi-vehicle-vrp.md`):**

- FN-016 `buildHereProblem` inputs kolonu güncellenir: `tasks, vehicles, **tollCostMatrix?**, complianceZones, **appointments?**`
- Yeni bölüm "Future evolution from FEAT-006 + FEAT-008":
  - FEAT-006 (service_duration_seconds parametresi)
  - FEAT-008 (tollCostMatrix parametresi)
  - Her ikisi de **forward-compatible** — opsiyonel parametreler

Bu güncelleme **tek commit'te** yapılabilir (dün FEAT-006 cross-spec sync zaten bekliyordu).

### 9.2 Pre-requisite — ADR-0004 v3 §6.4 migration

FEAT-008 implementation **ön koşulu:**
- [ ] `public.vehicles` Phase 1.1 migration (capacity_volume_m3, capacity_weight_kg, vehicle_class, hazmat_classes, emission_class)
- [ ] `enterprise.routing_jobs.cost_breakdown JSONB` additive kolon

Her ikisi de `tulipfleet-backend/migrations/` (schema authority).

### 9.3 Phase 1.1 implementation backlog

FEAT-008 aktivasyon zamanı: **Temmuz 2026** (vrachtwagenheffing.nl live)

- [ ] FN-07 getVehicleHgvProfile (en basit, schema-ready check)
- [ ] FN-02 getTariffForVehicle (tariff lookup with effectiveDate)
- [ ] FN-03 calculateSegmentTollCost shared library
- [ ] FN-04 fetchRoadSegmentType (HERE consumer + Redis cache)
- [ ] FN-05 MatrixCache.getWithToll (FEAT-001:FN-008 extension)
- [ ] FN-06 buildHereProblem extension (FEAT-001:FN-016 cross-feature)
- [ ] FN-01 syncVrachtwagenheffingTariffs worker (monthly cron)
- [ ] FN-09 GET hgv-toll endpoint
- [ ] FN-08 `<CostBreakdownWidget />` React component

### 9.4 Sandbox test priorities (Phase 1.1 öncesi)

ROADMAP Sıra 3 HERE Tour Planning sandbox'ta test edilecek:
- HERE road_type granularity (motorway/n_road/all_other mapping) — UNCERTAINTIES #1
- HERE Tour Planning custom edge weights API support — UNCERTAINTIES #3

Sandbox sonuçlarına göre §3.1 (optimal) veya §3.2 (fallback) pattern seçilir.

### 9.5 Sıradaki pilot

**Kapsam seçenekleri:**
- **FEAT-009** Basic carbon footprint per route (Phase 1.1, HERE Eco Routing consumer)
- **FEAT-101+** Phase 2 use case'lerinden biri (FEAT-103 EV optimization, FEAT-105 AI agent vb.)
- **M1-M7 production sprint** (Amsterdam ZE-Zone polygon seed)

---

## 10. References

- ADR-0001 §3.6 (UI primitives — ChartJS)
- **ADR-0002 §3.4** (Constraint hierarchy — Vrachtwagenheffing soft constraint)
- ADR-0002 §5 (MatrixCache pattern)
- ADR-0004 v3 §6.4 (additive `public.vehicles` capacity columns — FEAT-008 ön koşulu)
- ADR-0010 §4 (LLM/ML API consumer pattern — Vrachtwagenheffing.nl API)
- ADR-0011 §5 (Phase 1.1 follow-ups), §9.5 (endpoint patterns)
- **ADR-0012 §3.1** (NL Compliance Layer, 2026-05-25 Addendum FEAT-008'e relocation)
- FEAT-001 spec (FN-008 MatrixCache shared, FN-016 buildHereProblem cross-spec)
- FEAT-005 spec (FN-01 HERE consumer pattern shared)
- ROADMAP Phase 1.1 (FEAT-008 description, trigger Temmuz 2026)
- NotebookLM session 2026-05-29 (1 prompt, 9.5/10 skor)

---

## 11. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-29 | Cem Bakir (with Claude + NotebookLM cowork) | İlk konsolide function spec. Sekizinci pilot — Vrachtwagenheffing route cost optimization, Phase 1.1 trigger Temmuz 2026. 9 fonksiyon (FN-01..FN-09), hepsi Phase 1.1. **Pilot kalite zirvesi: 9.5/10, tek iterasyon, §number fabrikasyon 0** (F7'deki uyarı işe yaradı). Konsolidasyon düzeltmeleri: FN-01 ADR-0012 §3.1 parafraz → birebir cümle, FN-02 `effectiveDate` parametresi eklendi (tariff version handling), FN-06 inputs `tollCostMatrix` netleştirildi, FN-09 `GET hgv-toll` response schema detaylandı. Cross-spec sync TODO: FEAT-001:FN-016 buildHereProblem imzasına `tollCostMatrix?` opsiyonel parametre + "Future evolution from FEAT-008" notu (dünden kalan FEAT-006 cross-spec ile tek commit). Pre-requisite: ADR-0004 v3 §6.4 migration (`public.vehicles` emission_class + capacity_weight_kg) + `enterprise.routing_jobs.cost_breakdown JSONB` additive kolon. Soft constraint pattern (ADR-0002 §3.4) HERE objective function injection olarak modellenip §3.2 post-routing fallback alternatifi belgelendi (UNCERTAINTIES #3 sandbox test sonucuna bağlı). |
| 1.1 (mega cross-spec sync) | 2026-05-30 | Cem Bakir + Claude | **`enterprise.nl_vrachtwagenheffing_tariffs.emission_class` enum +`'zero_emission'`** — FEAT-103 EV exemption handling (FN-12 `getVrachtwagenheffingEvExemption`). Yeni alt-bölüm "EV exemption integration" eklendi. FEAT-103 algoritma detayları + Phase 2 başlangıç placeholder (NL government 2026 Temmuz tariff yayını sonrası seed). Mega cross-spec sync atomic commit FEAT-010 + FEAT-001 + FEAT-017 + FEAT-009 ile birlikte. Schema değişikliği additive (CHECK constraint genişleme). 17 pilot toplam. |
