# ADR-0011: Dispatcher Use Case Scope and HERE Coverage

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Status**        | Accepted                                                               |
| **Version**       | 1                                                                      |
| **Date**          | 2026-05-14                                                             |
| **Decision by**   | Cem Bakir (Founder / Lead Engineer)                                    |
| **Component**     | TulipFleet Enterprise Dispatcher — entire feature scope                |
| **Related**       | ADR-0002 (VRP solver), ADR-0005 (Dispatch workflow), ADR-0007 (Telematics integration), ADR-0009 (Integration map), ADR-0010 (ML strategy), ADR-0012 (NL Compliance Layer), ROADMAP |

---

## 1. Context

ADRs 0001–0010 kuruldu — stack, server topolojisi, schema stratejisi, dispatch workflow modes, ML sınırları, hepsi yazılı. Ama **dispatcher ürünü gerçekte hangi use case'leri çözecek?** — yani Phase 1 MVP'nin **kapsam contract'ı** — bir karar olarak sabitlenmedi.

Bu boşluk somut bir engel: `tulipfleet-enterprise-backend` skeleton (ROADMAP Sıra 1) hangi endpoint pattern'lerine hazır olmalı; dispatcher UI hangi ekranları öne çıkarmalı; HERE Tour Planning'in 50+ kısıt tipinden hangileri Phase 1'de kullanılacak; schema (`enterprise.dispatch_tasks.capacity_required jsonb` gibi alanlar) hangi gerçek use case'lere hizmet edecek — bunların hiçbiri kapsam netleşmeden cevaplanamaz.

ADR-0011 bu boşluğu kapatır. Use case discovery NotebookLM ile yapıldı (2026-05-14 ön çalışma): 30+ sektör use case'i tarandı, HERE coverage haritası çıkarıldı, Hollanda pazarına özgü öncelikler belirlendi, Top 100 Logistiek Dienstverleners segmentleri ile hedef müşteri eşleştirildi.

## 2. Decision

TulipFleet Enterprise Dispatcher Phase 1 MVP, aşağıdaki disiplinlere bağlı kalır:

1. **Phase 1 in-scope: 7 core use case.** Hepsi HERE Tour Planning native veya configurable; hepsi 50–300 araç K/M-segment Hollanda mid-market 3PL'leri için Day-1 değer üretir.
2. **Phase 2 trigger-based: 10 use case.** Customer-funded pattern (ADR-0007) ile aktive edilir. Schema ve API forward-compatible olarak Phase 1'de hazırlanır.
3. **Out-of-scope (Phase 3+ veya hiç): 8 use case.** Multimodal, SiLK federated dispatcher, agentic mode — TulipFleet'in core competence'i dışında veya scope creep riski yüksek.
4. **HERE Tour Planning kapsamı tam değerlendirildi:** 14 use case native/configurable/partial olarak destekleniyor, 8 use case "exception" — HERE dışı çözüm planı var.
5. **NL-specific öncelikler vurgulanır:** Vrachtwagenheffing, ZE-Zones, EV charging, CSRD reporting — bu konular **stratejik fark yaratıcı** olarak ele alınır (detay ADR-0012).

## 3. Discovery Methodology

Use case keşfi şu kaynak setine dayanır:

**Competitor product documentation (ürün gerçekliği):**
OptimoRoute, OnFleet, Routific, Samsara, Geotab, HERE Tour Planning, Workwave Route Manager — bu ürünlerin feature listeleri **gerçekte talep edilen** use case'leri ortaya koyar.

**Industry analyst reports (pazar gerçekliği):**
McKinsey logistics outlook, Gartner TMS market guide, Capgemini last-mile reports — ölçek ve trend perspektifi sağlar.

**Dutch/EU-specific sources (vertical odak):**
TLN (Transport en Logistiek Nederland), evofenedex, CBS road freight statistics, vrachtwagenheffing.nl — Hollanda regülasyon ve sektör yapısı.

**Academic foundations (kavramsal çerçeve):**
Toth & Vigo "Vehicle Routing: Problems, Methods, and Applications", VRP variants surveys — use case taxonomy ve algorithmic mapping.

Ayrıca **Top 100 Logistiek Dienstverleners 2025** listesi hedef segment tanımı için referans alındı.

Methodology disclaimer: Bu discovery sektör araştırmasına dayanır, sahada müşteri görüşmesine değil. Phase 1 sonrası ilk paying customer'lardan gelen feedback ile ADR-0011 v2 revize edilebilir.

## 4. Target Customer Segments

Discovery sonrası iki ayrı segment ortaya çıktı:

### 4.1 Dispatcher SaaS primary target — K/M segment, 50–300 araç

Bu, ADR-0011'in Phase 1 hedefinin **tamamıdır**.

| Segment | Ciro | Çalışan | Örnek (Top 100) | TulipFleet rolü |
| --- | --- | --- | --- | --- |
| **K (Küçük/Orta)** | <75M € | 100–300 | Dobbe Transport (74. sıra), De Dekker, Deudekom | Dispatcher SaaS — manuel planlamadan otomatik VRP'ye geçiş |
| **M (Orta)** | 75–200M € | 200–500 | TMA Logistics (72. sıra) | Dispatcher SaaS — karmaşık operasyon yönetimi |

Sweet spot rasyoneli:

- **50–200 araç:** Hollanda 18-şehir ZE-Zone uyumluluğu ve ontheffing belirsizliği yönetimi için VRP solver ihtiyacı yüksek.
- **200–500 araç:** Vrachtwagenheffing (Temmuz 2026 yürürlük) altında her kilometre maliyet optimizasyonu kritik.

Operasyon tipi: **Mix (urban + long-haul)**. Hollanda coğrafyası Venlo–Rotterdam–Amsterdam–DE/BE sınırı geçişleri için iki tarz arası geçişi standart kılıyor; tek-tarz odaklı bir ürün NL pazarında dar kalır.

### 4.2 Stratejik veri/telematics target — G segment

Bu segment **dispatcher SaaS hedefi değildir.**

| Segment | Ciro | Çalışan | Örnek (Top 100) | TulipFleet rolü |
| --- | --- | --- | --- | --- |
| **G (Büyük)** | >200M € | 1.000–2.000+ | Neele-Vat Logistics (12. sıra) | Hardware + telematics data layer (kendi dispatcher'larını kullanırlar) |

G segment için TulipFleet'in dispatcher ürünü ile birincil ilişki kurma hedefi **yoktur**; bu firmalar TulipFleet hardware + raw telemetry data customer'ı olabilir, dispatcher değil. Bu netleştirme ADR-0009 ile uyumludur ("Two backends, one database" mimarisi sayesinde aynı altyapı her iki ürün modeline de hizmet eder).

### 4.3 Out-of-scope segment — DC ve üstü

DHL, DSV, Kuehne+Nagel gibi devler katı BT protokollerine sahip, in-house dispatcher veya kurumsal TMS kullanır. TulipFleet bu segmente Phase 1-2'de girmez.

## 5. Phase 1 In-Scope Use Cases (MVP)

7 use case. Hepsi HERE Tour Planning ile **doğrudan veya minimal entegrasyonla** çözülür. Hepsi 50–300 araç K/M-segment için Day-1 değer üretir.

### FEAT-001 — Multi-Vehicle VRP with Time Windows (CVRP/VRPTW)

Dispatcher günlük plan oluştururken filo + task listesi + zaman pencereleri girer, HERE Tour Planning optimum atama + sıralama döner.

- **HERE coverage:** Native
- **Why MVP:** Discovery'de "very common" işaretli, dispatcher'ın temel görevi
- **Schema:** `enterprise.routing_jobs` (input), `enterprise.dispatch_tasks` (output)
- **NL angle:** Cold chain (Dobbe gibi) için `pickup-before-delivery` ve `mixed-loading` kısıtları kritik

### FEAT-002 — Truck-Aware Routing (Weight, Height, Hazmat)

Plan oluştururken araç profili (ağırlık, yükseklik, ADR sınıfı) HERE'ye iletilir; uygunsuz yollar otomatik elenir.

- **HERE coverage:** Native (truck attributes)
- **Why MVP:** Hollanda urban distribution için zorunlu (Amsterdam/Utrecht kırılgan rıhtım/köprü ağırlık kısıtları)
- **Schema:** `public.vehicles` extension — `capacity_volume_m3`, `capacity_weight_kg`, `vehicle_class`, `hazmat_classes` (ADR-0004 v3 ile additive)
- **NL angle:** Phase 1'de zorunlu, ADR-0012'deki Compliance Layer feature'ı buraya pas verir

### FEAT-003 — Predictive ETA with Live Traffic

Her plan ve canlı tour için varış sürelerinin gerçek zamanlı güncellenmesi; dispatcher ve (Phase 2'de) müşteri tarafından görülebilir.

- **HERE coverage:** Native (traffic_aware = true)
- **Why MVP:** Discovery "very common", dispatcher müşteri iletişiminin temeli
- **Schema:** `enterprise.dispatch_tasks.estimated_arrival_at timestamptz`
- **NL angle:** Rotterdam–Amsterdam koridorunda trafik volatilitesi yüksek

### FEAT-004 — Manual Dynamic Re-Routing ("Replan Now" button)

Dispatcher anlık olarak bir aracı veya tüm planı yeniden hesaplatır; HERE'ye gönderir, sonucu onaylar veya reddeder.

- **HERE coverage:** Native (re-plan request)
- **Why MVP:** Sektör %81 dispatcher tam otonom AI'ye güvenmiyor (Source: evofenedex); "human in the loop" tasarımı pazar uyumunu sağlar
- **Mode:** Mode 1 Advisory (ADR-0005)
- **Schema:** `enterprise.routing_jobs` her tetiklemede yeni satır, audit trail
- **Out of MVP:** Otomatik trafik-triggered re-routing — Phase 2

### FEAT-005 — Live Fleet Map (MQTT subscription)

Dispatcher tüm aktif araçların gerçek zamanlı konumlarını, durumlarını, hızlarını harita üzerinde görür.

- **HERE coverage:** N/A — EMQX MQTT subscription kullanır (ROADMAP Sıra 4)
- **Why MVP:** Dispatcher operational awareness'ın temeli; TulipFleet hardware avantajının görsel ifadesi
- **Mimari:** Leaflet + react-leaflet (ADR-0006), MQTT-over-WSS, `dispatcher-readonly` EMQX user (ADR-0009 §4.2)
- **NL angle:** 50–300 araç tek ekranda yönetim için tasarlanmış

### FEAT-006 — Plan Approve and Dispatch to Drivers

Dispatcher hazırlanan planı onayladığında, görevler `enterprise.dispatch_tasks` → `public.tasks` köprüsü ile sürücü mobil uygulamasına düşer.

- **HERE coverage:** N/A — Internal task lifecycle
- **Why MVP:** Dispatcher ↔ driver akışının tek yönlü köprüsü (ADR-0009 §4.4)
- **Schema:** `public.tasks.enterprise_dispatch_task_id uuid nullable` (ADR-0004 v3 ile additive)
- **Driver app değişikliği:** Yok (ADR-0009 §4.6)

### FEAT-007 — Driver Skill / Vehicle Capability Matching

Plan oluştururken sürücü yetkinlikleri (ADR sertifikası, frigorifik deneyimi, dil) ve araç kapasiteleri (cooling, hazmat-ready) HERE'ye constraint olarak iletilir.

- **HERE coverage:** Native (driver skills, vehicle capabilities)
- **Why MVP:** NL Cold chain ve hazmat operasyonları için zorunlu; "doğru araç doğru göreve" temel ilkesi
- **Schema:** `public.drivers` (skills jsonb — Phase 1 öncesi mevcut yapı yeterli olabilir, doğrulanacak), `public.vehicles` capabilities jsonb (potansiyel ek)

### Phase 1 MVP — Out-of-MVP istisnalar (yine de Phase 1 takvimine girer)

Bu use case'ler Phase 1 MVP launch'undan **kısa süre sonra** (Phase 1.1, ~1-4 hafta sonra) eklenir:

- **FEAT-008 — Vrachtwagenheffing route cost optimization.** Temmuz 2026 yürürlük; API live olur olmaz minimal effort (3-5 gün) ile eklenir. Detay ADR-0012 §3.1.
- **FEAT-009 — Basic carbon footprint per route.** HERE Eco Routing zaten CO2/fuel verisi döner; UI'da gösterim eklenir. Phase 2'deki CSRD-compliant export'tan farklıdır.

## 6. Phase 2 Trigger-Based Use Cases

Bu use case'ler **customer-funded pattern** (ADR-0007) ile aktive olur. Phase 1'de **schema forward-compatible** (özellikle `enterprise.dispatch_tasks.capacity_required jsonb`, `source jsonb`) olarak hazırlanır; kod path'i kapalı kalır.

| # | Use Case | Trigger | HERE coverage | Tahmini effort |
| --- | --- | --- | --- | --- |
| FEAT-101 | Automated Exception-Based Dispatch (Mode 2) | Customer asks for "auto-assign with rules" | Configurable | 4-6 hafta |
| FEAT-102 | 3rd-party telematics connector (1st instance) | Customer signed contract with Geotab/Verizon | N/A | 6-8 hafta per connector (ADR-0007) |
| FEAT-103 | EV range and charging optimization | EV fleet customer signs | Native | 2-3 hafta |
| FEAT-104 | Trafik-triggered automatic re-routing | Customer comfortable with auto-decisions | Native | 2-3 hafta |
| FEAT-105 | AI agent: PDF/email order parsing | KOBİ customer with manual order entry pain | Third-party LLM API (per ADR-0010 §4) | 4-6 hafta |
| FEAT-106 | CSRD-compliant carbon report export | Large 3PL customer (Heineken/Picnic level) demands | Partial (HERE provides data, report generator custom) | 3-4 hafta |
| FEAT-107 | Two-way task lifecycle sync (driver completion mirroring) | Customer asks for real-time completion in dispatcher | N/A — internal | 3-4 hafta |
| FEAT-108 | Yard / Ramp appointment integration (WMS connector) | Large 3PL customer with Manhattan/SAP EWM signs | N/A — custom integration per WMS | 6-10 hafta per WMS |
| FEAT-109 | Reverse logistics (returns optimization) | Retail customer signs | Native | 2-3 hafta |
| FEAT-110 | Multi-day long-haul planning with overnight stops | Long-haul-heavy customer signs | Configurable | 3-4 hafta |

Bu liste **canlı** — pazar feedback'i ile değişir. ADR-0011 sadece **kapsam dışına çıkmayacak konuları** sabitler; Phase 2 use case sırası customer demand'a göre değişir.

## 7. Out-of-Scope Use Cases

Bu use case'ler **bilinçli olarak dışarıda** bırakılır. Phase 3+ ADR ile değerlendirilirler.

| # | Use Case | Why out-of-scope |
| --- | --- | --- |
| OUT-001 | Multimodal orchestration (rail/sea/road) | Core competence dışı; ProRail, Port Community Systems, container drayage demuraj/detention özel domain. Phase 3 ADR ile yeniden değerlendirilir. |
| OUT-002 | SiLK federated load pooling | Multi-tenancy ve cross-company task visibility mimari değişikliği gerektirir; **ayrı bir ürün** olmalı, dispatcher'a sıkıştırılmamalı. |
| OUT-003 | Mode 3 Agentic dispatch | ADR-0005 Phase 3; ADR-0010 ML trigger şartlarına bağlı. |
| OUT-004 | In-house ML (driver behavior, demand forecasting, predictive maintenance) | ADR-0010 kararı — 12+ ay olgun veri + customer-funded trigger gerektirir. |
| OUT-005 | Driver drowsiness / DMS computer vision | TulipFleet hardware'inde kamera yok; ayrı business line. |
| OUT-006 | Field/Yard asset tracking with RFID/RTLS | Hardware ve indoor positioning ayrı domain; TulipFleet outdoor GPS odaklı. |
| OUT-007 | Automated freight audit and payment | Finansal yazılım entegrasyonu domain'i; mevcut TMS/ERP'lerin işi. |
| OUT-008 | Container drayage with demurrage/detention tracking | Port community systems gerektirir; Phase 3'te multimodal ile beraber ele alınır. |

## 8. HERE Tour Planning Coverage Matrix

NotebookLM discovery sonucu, HERE'nin Phase 1 ve Phase 2 use case'lerini ne kadar kapsadığını ortaya koydu. Tablo, hangi feature'ların HERE-native, hangilerinin custom katmanlar gerektirdiğini gösterir.

### 8.1 HERE Native — doğrudan API çağrısı ile çözülür

- AI-powered route optimization (VRP/CVRP) — FEAT-001
- Time window planning (VRPTW) — FEAT-001
- Dynamic intra-day re-routing — FEAT-004, FEAT-104
- Predictive ETA with live traffic — FEAT-003
- Hazmat / regulatory routing — FEAT-002, FEAT-007
- Driver skill matching — FEAT-007
- EV range planning — FEAT-103
- Reverse logistics — FEAT-109
- Workload balancing across drivers — Phase 2 derivative

### 8.2 HERE Configurable — parameter veya objective tuning gerekir

- Smart auto-dispatch (Mode 2) — FEAT-101
- Locker / PUDO management as fixed waypoints — Phase 2 derivative
- Multi-day long-haul planning — FEAT-110
- Autonomous vehicle integration (custom vehicle profiles) — out-of-scope Phase 3
- ZE-Zone avoidance via environmental zones parameters — FEAT-002 (also ADR-0012). **Verified 2026-06-02 — see §8.6 Implementation Findings.**
- Vrachtwagenheffing per-km cost weighting — FEAT-008 (also ADR-0012)

### 8.3 HERE Partial — HERE core sağlar, custom katman gerekir

- Capacity-aware delivery promise — FEAT-001 + custom UI commitment layer
- Carbon footprint tracking — FEAT-009 (data) + Phase 2 reporting layer (FEAT-106)

### 8.4 HERE Exception — HERE kapsamı dışı, custom çözüm gerekir

Bu 8 use case HERE'nin scope'unda değildir. Her biri için Phase 1 / Phase 2 yaklaşımı tablodadır.

| # | Use case | Why outside HERE | Phase 1 / Phase 2 yaklaşımı |
| --- | --- | --- | --- |
| 1 | Real-time driver tracking | HERE telematik servisi sunmuyor | **Phase 1:** TulipFleet ESP32 + MQTT zaten mevcut altyapı (FEAT-005) |
| 2 | Digital Proof of Delivery (PoD) | Sürücü mobil uygulama özelliği | **Phase 2:** Mevcut mobile app extension veya new module |
| 3 | Driver performance coaching | Telematik analitik + AI camera | **Phase 2 / Phase 3:** ADXL345 sensor data + rule-based scoring (ADR-0010 limitler dahilinde) |
| 4 | Cold chain IoT monitoring | Özel sensor donanımı | **Phase 2+:** IoT sensor connector pattern (customer-funded) |
| 5 | Automated freight audit | Financial reconciliation | **Out-of-scope** — TMS/ERP entegrasyonu, dispatcher'ın işi değil |
| 6 | Digital document management (CMR, invoice parsing) | OCR + NLP | **Phase 2:** AI agent feature (FEAT-105) ile birleşik |
| 7 | Yard/Ramp asset tracking | RTLS/RFID indoor | **Out-of-scope OUT-006** |
| 8 | Breadcrumb (GPS trace) analytics vs planned route | GPS log + analitik | **Phase 2:** Internal analytics module |

### 8.6 Implementation Findings — HERE ZE-Zone avoidance (verified 2026-06-02)

Sıra 3 sandbox testing (live `tourplanning.hereapi.com/v3` calls with the production HERE key) resolved the long-standing question of how HERE handles NL Zero-Emission zones. Findings:

1. **HERE recognizes environmental zones natively.** The profile field `avoid.zoneCategories.categories: ["environmental"]` is a valid, accepted schema (no validation error). HERE maintains environmental zones in its own map catalog with identifiers in the form `here:cm:envzone:NN` (e.g. Berlin Umweltzone is `here:cm:envzone:2`). This confirms the §8.2 classification: ZE-Zone avoidance is **Configurable**, not custom-build.

2. **`avoid` is a soft preference, not a hard constraint.** Per HERE's own documentation: the avoid option *prefers* routes outside avoided zones but does not absolutely prevent entry when no alternative exists. ZE-Zone non-compliance carries a CJIB fine (bestelauto €130, vrachtauto €320), so a soft preference alone cannot guarantee compliance.

3. **Categorical avoid makes in-zone deliveries unreachable.** When `environmental` is avoided and a delivery sits *inside* a ZE-Zone (the normal case for city-centre logistics), HERE returns `REACHABLE_CONSTRAINT: location unreachable` for that job. Blanket avoidance is therefore unusable for real urban delivery; per-zone exemption is required.

4. **Exemption mechanism is `exceptZoneIds`.** A ZE-compliant or ontheffing-holding vehicle is granted entry to specific zones by listing their `here:cm:envzone:NN` identifiers under `avoid.zoneCategories.exceptZoneIds`. This supersedes the earlier assumption (ADR-0002 §3.4, ADR-0012 §3.1 addendum) that TulipFleet would inject its own ZE-Zone polygons into HERE as `avoid.areas`.

**Preferred direction — Model 1 (HERE-native zone avoidance).** Routing avoidance uses HERE's own `zoneCategories` + `exceptZoneIds`; TulipFleet does **not** push its `enterprise.nl_compliance_zones` polygons into the HERE payload. The reason is precision: HERE `avoid.areas` accepts only rectangular `boundingBox` regions, which would crudely approximate the irregular, river-split real ZE-Zone borders and cause false positives/negatives. TulipFleet's polygons remain the authority for **hard validation** (is this delivery inside a zone? is this vehicle compliant/exempt? → block or warn) and **CSRD / violation reporting** — work HERE does not perform. This is the two-layer architecture: HERE = routing efficiency (soft avoid); Compliance Layer = compliance correctness (hard validation + reporting).

**Spike RESOLVED 2026-06-02 (ADR-0012 §3.8).** The catalog-coverage spike ran: a Routing v8 `routingZones` harvest through each zone's centroid mapped **19 of 21** seeded rows to `here:cm:envzone:NN` ids, persisted to `_meta.here_envzone_id` (migration `1781800000000`). Two rows — `dordrecht_ze_zone_2026` (ZE start 2026-01-01) and `arnhem_ze_zone_2026` (ZE start 2026-06-01) — are absent from HERE's catalog (update lag, not our error); for these the Compliance Layer polygon is the sole authority (`here_envzone_id = null`). Nijmegen first returned a false-negative at its centroid (crescent-shaped core) and was recovered via a deep-interior retest (`here:cm:envzone:628`). **Model 1 is locked** for the 19 covered zones; the 2 uncovered are Layer-2-only by design. Full coverage map in ADR-0012 §3.8.

## 9. Schema and API Impact Summary

Phase 1 MVP için aşağıdaki schema değişiklikleri planlanır. Detay ve gerekçe ADR-0004 v3 ve ADR-0009'da; burada özet:

### 9.1 `public.*` additive changes (ADR-0004 v3 ile yasallaştırıldı)

- `public.users.role` CHECK constraint: `'dispatcher'` değeri eklenir
- `public.tasks`: `enterprise_dispatch_task_id uuid NULL` kolonu eklenir (soft reference)
- `public.companies`: `dispatch_mode text NOT NULL DEFAULT 'advisory'` kolonu eklenir (CHECK constraint: `'advisory' | 'exception' | 'agentic'`)

### 9.2 `public.vehicles` capacity extension (Phase 1.1, ADR-0004 v3 kapsamında)

FEAT-002 ve FEAT-007 için gerekli alanlar:

- `capacity_volume_m3 numeric NULL`
- `capacity_weight_kg numeric NULL`
- `vehicle_class text NULL` (örn. 'rigid_truck', 'tractor_unit', 'van')
- `hazmat_classes text[] NULL`

Bu eklemeler **nullable** olduğu için mevcut data uyumluluğunu bozmaz.

### 9.3 `enterprise.*` Phase 1'de mevcut tablolar yeterli

ADR-0004 v2 migration ile yaratılan 4 tablo (`telematics_source`, `locations_3p`, `routing_jobs`, `dispatch_tasks`) Phase 1 MVP'ye yeter. `dispatch_tasks.capacity_required jsonb` ve `dispatch_tasks.source jsonb` esnekliği Phase 2 use case'lerine yer açar.

### 9.4 Yeni schema — Phase 1.1 için (ADR-0012 ile bağlantılı)

ADR-0012 NL Compliance Layer için yeni tablolar gerektirir (`enterprise.nl_compliance_zones` vb.). Bu, ayrı bir migration olarak ADR-0012 §5'te detaylandırılır. ADR-0011 burada sadece **scope niyetini** referanslar.

### 9.5 API endpoint families (dispatcher backend)

Phase 1 endpoint patterns:

- `GET /api/dispatcher/vehicles` — listele, filtrele
- `GET /api/dispatcher/drivers` — listele, filtrele
- `GET /api/dispatcher/tasks` — pending review, today, planned
- `POST /api/dispatcher/plans` — yeni plan submission (HERE'ye gönder)
- `GET /api/dispatcher/plans/:id` — plan status + sonuç
- `POST /api/dispatcher/plans/:id/approve` — onayla, `public.tasks`'a düş
- `POST /api/dispatcher/plans/:id/replan` — FEAT-004 manuel re-plan
- `GET /api/dispatcher/map/live` — Live Fleet Map state (FEAT-005)

Detay endpoint spec Feature Spec Catalog'a (gelecek doküman) bırakılır.

## 10. Strategic Positioning Insight

NotebookLM discovery iki güçlü stratejik bulgu üretti. ADR-0011 bunları **kayıt altına** alır; ürün konumlaması ve Phase 2 önceliklendirmesinde referans olarak kullanılır.

### 10.1 The "Digital Readiness Gap" — KOBİ %80 dijitalleşmemiş

evofenedex araştırması: Her 5 Hollanda KOBİ'sinden 4'ü "digital ready" değil. Bu, iki seviyede stratejik yorumlanır:

**Olumsuz okuma:** Hedef segmentin çoğu hazır değil — satış süreci uzun, onboarding ağır, customer success yükü yüksek olabilir.

**Olumlu okuma (TulipFleet için doğru olan):** Rakip dispatcher ürünleri (Routific, OptimoRoute) bu segmenti **karmaşık olduğu için bırakıyor**. TulipFleet'in entegre yaklaşımı (hardware + mobile + dispatcher tek elden) digital-not-ready KOBİ'ye **single-vendor onboarding** sağlıyor; bu rakipten farklılaşma noktası.

Bu insight Phase 2 önceliklendirmesinde rol oynar: KOBİ pain point'lerini **azaltan** feature'lar (FEAT-105 AI order parsing, FEAT-101 auto-dispatch) ROI'si yüksek görünür.

### 10.2 The "Ketenregie" gap — supply chain orchestration boşluğu

Hollanda sektör kaynakları (TLN, evofenedex) "ketenregie" (zincir yönetimi) yetkinliğinin KOBİ segmentinde **eksik** olduğunu vurguluyor. Büyük 3PL'ler kendi sistemlerine sahip; KOBİ'lerin ise zincir-genişliğinde görünürlük + karar verme kapasitesi yok.

TulipFleet Enterprise Dispatcher tam buraya oturuyor. Dispatcher'ın "advisory mode" (Mode 1) — sistem önerir, dispatcher onaylar — ketenregie boşluğunu **insanın kontrolü altında** kapatır. Phase 2 Mode 2 ile dispatcher daha az manuel iş yapar; Phase 3 Mode 3 ile sistem agentic davranır.

Bu, ADR-0005'in mode maturity modelinin **pazar uyumunu** doğrular.

### 10.3 Compliance layer as defensible moat

ADR-0012'de detaylandırıldığı üzere, Hollanda compliance verisi (Vrachtwagenheffing, ZE-Zones, ontheffing kuralları) dağınık ve hızlı değişen bir ekosistemde yer alıyor. **"Tek veri noktası" olmaması** TulipFleet için stratejik fırsat: Phase 1 internal use → Phase 2 premium feature → Phase 3 standalone product evolution mümkün.

Bu insight ADR-0011'de sadece referans olarak yer alır; karar ADR-0012'de tam olarak yazılıdır.

## 11. Consequences

### 11.1 Positive

- Phase 1 MVP kapsamı net: 7 in-scope use case, ne fazla ne eksik. Backend skeleton (ROADMAP Sıra 1) bu use case'lere göre tasarlanır.
- HERE Tour Planning'in kapsamı tam değerlendirildi — "yapamayacağı şeyler" sürpriz değil, planda yer alıyor.
- Phase 2 use case listesi customer demand triggers'a bağlı; spekülatif geliştirme yok (ADR-0007 ile uyumlu).
- Out-of-scope listesi açık — "scope creep" girişimleri bu liste ile reddedilebilir.
- Hedef segment K/M Top 100 firmalarına eşleştirildi; satış outreach buna göre yapılır.
- KOBİ digital readiness gap stratejik fırsat olarak işaretlendi; Phase 2 önceliklendirmede kullanılır.

### 11.2 Negative / accepted trade-offs

- **Phase 1 ship target dar:** 7 use case + 2 Phase 1.1 takip = 9 feature. Bazı potansiyel müşteriler "yard management lazım" diyebilir — onlar Phase 2 trigger'ı olur, anında satılabilir değil.
- **HERE'ye bağımlılık derinleşiyor:** 7 use case'in 5'i HERE-native. ADR-0002'nin escape hatch'i (OR-Tools) ciddiye alınmalı; HERE pricing değişikliğine karşı izleme.
- **NL-specific öncelik ayrı bir ADR (0012) gerektirdi:** Karar yükü ADR sayısını artırdı. Trade-off kabul edildi; compliance ayrı stratejik konu.
- **Discovery sahada doğrulanmadı:** Top 100 listesi ve sektör raporları gerçek müşteri görüşmesi değil. ADR-0011 v2 ile ilk paying customer'lardan sonra revize edilir.

## 12. Open Questions

- **`public.drivers.skills` kolonu mevcut mu, yapısı ne?** FEAT-007 için gerekli — schema audit ile doğrulanacak. Eğer yoksa Phase 1.1 additive migration.
- **HERE Tour Planning environmental zones desteği Hollanda ZE-Zone'larını native olarak içeriyor mu?** ~~ADR-0012 §2 araştırma maddesi.~~ **RESOLVED 2026-06-02 (§8.6):** HERE recognizes `environmental` zone category natively (`avoid.zoneCategories` + `exceptZoneIds`, catalog ids `here:cm:envzone:NN`). Avoid is soft; in-zone deliveries go unreachable under blanket avoid; exemption via `exceptZoneIds`. Model 1 (HERE-native) is the preferred direction.
- **HERE `here:cm:envzone` catalog NL'nin 20 seed'lenmiş ZE-Zone'unun tamamını kapsıyor mu? (spike)** **RESOLVED 2026-06-02 (ADR-0012 §3.8):** 19/21 eşleşti, `_meta.here_envzone_id`'ye yazıldı (migration `1781800000000`). 2 zone (dordrecht 2026-01-01, arnhem 2026-06-01) HERE kataloğunda yok = katalog gecikmesi -> Layer-2 polygon tek otorite. Nijmegen centroid yanlış-negatifi derin-iç-nokta retest ile düzeltildi (628). **Model 1 LOCKED.**
- **Vrachtwagenheffing API sandbox erişimi ne zaman açılır?** Temmuz 2026 yürürlük öncesi test imkanı varsa FEAT-008 Phase 1'e çekilebilir.
- **Müşteri görüşmeleri ne zaman başlar?** Dobbe Transport, TMA, De Dekker, Deudekom — bu firmalardan en az 2'siyle 2026 Haziran sonu öncesi pilot konuşması, ADR-0011 v2 için ham veri toplar.
- **`enterprise.dispatch_tasks.source jsonb` schema tasarımı?** FEAT-105 (AI agent) için forward-compatible — manuel / api / ai_agent ayrımı nasıl encode edilecek?

## 13. References

- ADR-0002 (HERE Tour Planning — VRP solver)
- ADR-0005 (Dispatch workflow modes — Mode 1 Advisory MVP)
- ADR-0007 (Telematics integration — customer-funded pattern)
- ADR-0009 (Integration map — task lifecycle, schema authority)
- ADR-0010 (ML strategy — boundary on in-house ML)
- ADR-0012 (NL Compliance Layer Strategy — sister ADR)
- ADR-0004 v3 (Database strategy — additive Phase 1 changes legalized)
- ROADMAP (Phase 1 Sıra 1–7 execution order)
- NotebookLM discovery output (2026-05-14) — competitor scan, NL-specific use cases, Top 100 Logistiek Dienstverleners 2025
- evofenedex digital readiness research (KOBİ %80 finding)
- TLN supply chain reports (ketenregie gap)
- McKinsey "future of last-mile logistics"
- Gartner Market Guide for Transportation Management Systems
- Toth & Vigo "Vehicle Routing: Problems, Methods, and Applications" (academic foundation)

---

## 14. Change Log

| Version | Date       | Author    | Change                                                    |
| ------- | ---------- | --------- | --------------------------------------------------------- |
| 1       | 2026-05-14 | Cem Bakir | Initial use case scope decision: 7 Phase 1 MVP, 10 Phase 2 trigger-based, 8 out-of-scope. HERE coverage matrix. Target segment K/M-50–300 vehicles. Strategic positioning insight (KOBİ digital readiness gap + ketenregie). |
| 1 (Addendum) | 2026-06-02 | Cem Bakir | §8.6 added — HERE ZE-Zone avoidance Implementation Findings from Sıra 3 live sandbox testing. `avoid.zoneCategories.categories:["environmental"]` valid (Configurable confirmed); avoid is soft; in-zone deliveries unreachable under blanket avoid; exemption via `exceptZoneIds` (`here:cm:envzone:NN`). Preferred direction = Model 1 (HERE-native, no polygon injection) per bounding-box precision argument. §12 open question resolved + new spike question (HERE NL envzone catalog coverage). Minor implementation clarification per ADR-0009 §4.5.1 pattern; no version bump. |
| 1 (Addendum) | 2026-06-02 | Cem Bakir | §8.6 spike RESOLVED — HERE envzone catalog coverage verified (ADR-0012 §3.8). 19/21 seeded zones mapped to here:cm:envzone:NN (migration 1781800000000, _meta.here_envzone_id). 2 zones (dordrecht, arnhem; both 2026 ZE start) absent = catalog lag -> Layer-2 sole authority. Nijmegen false-negative fixed via deep-interior retest. §12 spike question resolved, Model 1 LOCKED. Minor clarification per ADR-0009 §4.5.1; no version bump. |
## Correction (2026-06-18, post-audit)

§FEAT-007 / satır 151 ve 347'de `public.drivers.skills` kolonunun varlığı "doğrulanacak" olarak bırakılmıştı. Canlı şema audit'i (`\d public.drivers`, `fleet_tracking_staging`) tamamlandı: **`skills` kolonu YOK.** `public.drivers`'ın gerçek kolonları id, user_id, license_no, license_expiry, phone, emergency_contact, status, total_km_driven, safety_score, created_at, assigned_vehicle_id, updated_at, company_id'dir.

Yetkinlik (skill) kavramı sürücü tablosunda değil, `enterprise.dispatch_tasks.skill_required text[]` kolonunda tutulur. FEAT-007 sürücü-tarafı yetkinlik-bazlı atama gerektirirse, satır 347'nin öngördüğü gibi Phase 1.1 additive migration gerekir.

Canlı şema otoritesi: `docs/SCHEMA_REFERENCE.md`.
