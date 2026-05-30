# Implementation Bottleneck Analysis — 2026-05-30

| Field | Value |
|---|---|
| **Lokasyon** | `docs/analysis/bottleneck-analysis-2026-05-30.md` |
| **Source** | NotebookLM session 2026-05-30 (1 prompt) + Claude konsolidasyon (sayısal doğrulama) |
| **Scope** | 17 FEAT spec, 12 ADR, ROADMAP, ENTERPRISE_INFRASTRUCTURE — function-level shared infrastructure |
| **Status** | Konsolide analiz, ROADMAP'a entegre özet hazır |
| **Pilot turu sonrası** | 17 pilot + mega cross-spec sync (commit edildi 2026-05-30 akşam) |

---

## Önbilgi — analiz neden gerekti

17 pilot ve 11 cross-spec sync sonrası **implementasyon öncesi** sistemik risk haritası:

- ~250 fonksiyon, ~110 cross-feature reference
- 5 spec atomic sync (FEAT-001 +3 param, FEAT-010 +6 enum, FEAT-017 +7 enum, FEAT-008 +zero_emission, FEAT-009 EV branch)
- Phase 1.1 implementasyon kickoff yaklaşıyor

**Cem'in sorusu:** Bottleneck'leri implementation öncesi görelim — engineering capacity allocation, ADR adayları, risk mitigation.

---

## 1. En çok shared olan altyapı bileşenleri (TOP 10)

| Rank | Bileşen | Tip | Consumer FEAT sayı | Hangi FEAT'ler | Bottleneck riski |
|---|---|---|---|---|---|
| 1 | **FEAT-001:FN-016 buildHereProblem** | FUNCTION | **6** (extension consumer) | F006, F008, F009, F019, F103 (+ F001 self) | HIGH — imza 8 parametreye ulaştı (`tasks, vehicles, appointments?, tollCostMatrix?, routingMode?, daysHorizon?, driverRules?, evMode?`) |
| 2 | **enterprise.dispatch_tasks** | TABLE | 15+ | Tüm operasyonel FEAT'ler | HIGH — schema bloat + tenant scope kilit riski |
| 3 | **HERE Tour Planning API** | EXTERNAL API | ~9 | F001, F002, F004, F005, F006, F008, F009, F019, F103 | CRITICAL — single vendor, ADR-0002 §3.3 kararıyla self-hosted alternatif yok |
| 4 | **FEAT-010:FN-06 logExceptionEvent** | FUNCTION | **7** | F014, F015, F017, F018, F019, F103, F106 | MEDIUM — exception_type enum 16 değer |
| 5 | **MatrixCache (ADR-0002 §5)** | ADR PATTERN | ~6 | F001, F002, F003, F004, F005, F008 (+ F019) | MEDIUM — Redis TTL yönetimi + maliyet |
| 6 | **evaluateDispatchPolicy (ADR-0005 §7)** | FUNCTION (stub) | 5 | F003, F010, F014, F015, F018 | MEDIUM — Mode 1 → Mode 2 geçişinde logic bottleneck |
| 7 | **public.geofences.location_type** | TABLE (enum) | 4 | F017, F019, F103 + (F012 future) | HIGH — 12 farklı değer, query/logic çakışma riski |
| 8 | **Weighted Sum Scoring (ADR-0010 §3.4)** | ADR PATTERN | 6 | F003, F007, F014, F015, F018, F106 | LOW — disiplinli config, per-company explosion riski VAR |
| 9 | **EMQX MQTT Subscriber (ADR-0009 §4.2)** | WORKER | 4 | F005, F007, F017, F103 (+ F019) | MEDIUM — real-time stream yükü |
| 10 | **PostGIS ST_DWithin / ST_Contains** | DB FUNCTION | 4 | F017, F019, F103 + (F012 future) | LOW — native DB performansı |

**Düzeltmeler vs NotebookLM:**
- FN-016 consumer: NotebookLM "8" → düzeltildi **"6 unique extension"** (FN-016 self + F006/008/009/019/103). F017 ve F018 FN-016'yı extend etmedi.
- location_type enum: NotebookLM "18 değer" → düzeltildi **"12 değer"** (1 default + 4 F017 + 6 F019 + 1 F103).
- HERE consumer: NotebookLM "12+" → düzeltildi **"~9 spec"** (sayım aşağıda detaylı).

---

## 2. Critical path analysis (FEAT zincirleri)

| Hedef FEAT | Önce gereken (zincir) | Zincir uzunluğu |
|---|---|---|
| **FEAT-106 CSRD** | FEAT-009 (Carbon baseline) + FEAT-103 (EV Scope 2) + FEAT-014 (Tender Scope 3) + FEAT-008 (Distance) | **4** |
| **FEAT-103 EV** | FEAT-001 (VRP foundation) + FEAT-005 (MQTT SoC) + FEAT-017 (geofence ext) + FEAT-009 (carbon paralel) | **3-4** |
| **FEAT-015 Audit** | FEAT-014 (Tender baseline) + FEAT-004 (Carrier contracts) + FEAT-008 (Toll baseline) | **3** |
| **FEAT-019 Long-haul** | FEAT-001 (multi-day VRP ext) + FEAT-008 (cross-border toll) + FEAT-017 (overnight geofence) | **3** |
| **FEAT-018 Reverse** | FEAT-001 (VRP) + FEAT-003 (order ingestion) + FEAT-017 (return points) | **3** |
| **FEAT-014 Tender** | FEAT-004 (Carrier schema) + FEAT-001 (capacity matching) | **2** |
| **FEAT-010 Exception** | FEAT-005 (ETA) + FEAT-002 (Traffic) + FEAT-001 (Compliance) | **3** |

**Strateji:** Phase 2 customer-funded FEAT trigger geldiğinde, kritik path'in **tüm halkalarının production'da** olması gerekir. FEAT-106 en uzun path — minimum 4 önceki FEAT.

---

## 3. Schema bottleneck risk

| Tablo | Consumer FEAT sayı | Schema change frequency | Risk |
|---|---|---|---|
| **enterprise.dispatch_tasks** | 15+ | Her FEAT additive kolon/metadata ekliyor (carbon_footprint_kg, allow_locker_fallback, direction, parent_task_id, ...) | **HIGH** — tenant scope query kilit riski + JSONB metadata explosion |
| **public.geofences** | 4 | location_type enum 3 kez genişledi (5 → 12) | **MEDIUM** — F017→F019→F103 pattern stable, ama her yeni tip için PostGIS query doğrulanmalı |
| **public.vehicles** | 10+ | Capacity, emission, EV, threshold kolonları eklendi | MEDIUM — additive disipline korundu (ADR-0004 v3 §6) |
| **enterprise.exception_events** | 8 (7 writer + 1 self) | 16 farklı exception_type birikti | MEDIUM — aggregation/filtering yükü |
| **enterprise.routing_jobs** | 4-5 | cost_breakdown JSONB tek kolon (FEAT-008+009 ayrı kolonlarla) | LOW — kontrollü |

---

## 4. External API consumer count

| API | Consumer FEAT | Self-hosted alternatif? | Risk |
|---|---|---|---|
| **HERE Tour Planning** | ~9 (F001, F002, F004, F005, F006, F008, F009, F019, F103) | YOK (ADR-0002 §3.3 kararı) | **CRITICAL** — outage = no new plans |
| **EMQX MQTT** | 5 (F005, F007, F017, F019, F103) | ✅ TulipFleet self-hosted | LOW — Docker restart yeterli |
| **LLM API** (OpenAI/Anthropic) | 3 (F015 invoice OCR, F106 narrative disclosure, + F006 doc parsing future) | YOK (ADR-0010 §4 consumer pattern) | MEDIUM — rate limit + cost |
| **OCPI Roaming** (Hubject/Gireve) | 1 (F103) | YOK (third-party charging data) | LOW — Phase 2 only |
| **EU Tachograph data sources** | 1 (F019) | YOK (DDD format public) | LOW |
| **Regulator API** (AFM/ESMA) | 1 (F106) | YOK (regulatory body) | LOW — manual filing Phase 2 |
| **PostgreSQL/PostGIS** | Hepsi | TulipFleet self-hosted | LOW |

---

## 5. Implementation öncelik haritası

Bottleneck'leri minimize eden öncelik sırası — Cem solo dev capacity allocation için:

| Sıra | FEAT | Phase | Neden öncelik | Unblocks |
|---|---|---|---|---|
| **1** | **FEAT-001 buildHereProblem foundation** | 1 | 5 FEAT extension'ı parametre enjekte ediyor + HERE solver core | F006, F008, F009, F019, F103 |
| **2** | **FEAT-005 MQTT subscriber + map widget** | 1 | 4 FEAT subscriber pattern + 4 FEAT map widget reuse | F007, F017, F019, F103 |
| **3** | **FEAT-010 Exception orchestrator** | 1.1 | 7 FEAT'in hata logging merkezi (Phase 1.1 commit kapısı) | F014, F015, F017, F018, F019, F103, F106 |
| **4** | **FEAT-017 Geofence type extension** | 1.1 | location_type hiyerarşisi (Phase 1.1 schema migration) | F019, F103 |
| **5** | **FEAT-008 Vrachtwagenheffing + cross-border baseline** | 1.1 | Toll cost matrix Phase 1.1 + F019 cross-border extension | F019, F015 |
| **6** | **FEAT-009 Carbon baseline** | 1.1 | dispatch_tasks.carbon_footprint_kg Phase 1.1 + FEAT-106 Scope 1 baseline | F106 |
| 7-9 | **FEAT-004, 014, 015** (carrier ecosystem) | 2 | Phase 2 trigger geldiğinde sıra | F015 audit, F106 Scope 3 |
| 10-11 | **FEAT-019, 103** (vertical features) | 2 | Customer-specific trigger | F106 multi-scope |
| **12** | **FEAT-106 CSRD** | 2 | Tüm Scope 1+2+3 baseline production'da olduktan sonra | (terminal) |

---

## 6. Cross-cutting concerns (5 mimari sıcak nokta)

### 6.1 Geofence type extension pattern (F017 → F019 → F103)

```
F017 ekledi: customer_site (default), locker, pudo_point, parcel_shop, return_point (5 değer)
F019 ekledi: truck_parking, secured_parking, hotel, fuel_station, rest_area, border_crossing (+6)
F103 ekledi: charging_station (+1)
Toplam: 12 değer
```

**Pattern stable** ama her yeni tip için **PostGIS query'lerinin yeniden doğrulanması** gerek. Phase 1.1 migration sprint'inde index strategy yeniden değerlendirilmeli.

### 6.2 Cross-spec sync pattern (FN-016 imza evrimi)

```
v1 (F001): tasks, vehicles                                    (2 param)
v2 (F006+F008): + appointments?, tollCostMatrix?              (4 param)
v3 (F009): + routingMode?                                     (5 param)
v3.1 (F019): + daysHorizon?, driverRules?                     (7 param)
v3.1 (F103): + evMode?                                        (8 param)
```

**5 cross-spec sync** — yeni feature eklendiğinde tüm caller FEAT'lerin senkronizasyonu **implementation bottleneck**'i. **Mitigation:** Builder pattern (chained methods) veya options object argümanı düşünülebilir Phase 1.1 implementation'da.

### 6.3 Exception event writer (FEAT-010:FN-06 → 7 FEAT consumer)

```
exception_type enum 16 değer (5 base + 5 sync 1 + 6 mega sync)
```

Her yeni iş birimi buraya enum eklemek zorunda. **Risk:** enum explosion → aggregation logic karmaşıklaşır. **Mitigation:** Severity hierarchy + category prefix (örn. `invoice_*`, `rest_*`, `range_*`) — Phase 2 sprint'inde değerlendirilebilir.

### 6.4 Weighted sum scoring (ADR-0010 §3.4 disiplini)

```
F003 driver-order matching, F007 driver score, F014 carrier ranking,
F015 invoice reconciliation, F018 RTS routing, F106 data quality
```

**6 FEAT** ağırlık (weight) yönetimi yapar. **Per-company configurable** — weight matrisi explosion riski. **Mitigation:** Centralized weight registry + version control (`enterprise.scoring_weights` tablosu Phase 2 candidate).

### 6.5 MQTT subscriber + map widget patterns (Leaflet UI consistency)

```
Map widget: F005:FN-06, F017:FN-09, F019:FN-11, F103:FN-09 — 4 FEAT
MQTT subscriber: F005:FN-02, F007 behavior, F017 (Phase 2), F019, F103 — 5 FEAT
```

**Risk:** UI consistency drift (her FEAT kendi Leaflet config'iyle) + MQTT subscriber concurrency. **Mitigation:** Shared `<MapWidget />` base component + EMQX consumer group (Phase 1.1 sprint).

---

## 7. Risk dashboard

| Bottleneck türü | Severity | Etkilenen FEAT sayı | Mitigation strategy |
|---|---|---|---|
| **HERE API outage** | CRITICAL | ~9 spec direct + downstream | Routific fallback (ADR-0002 §3.3 zaten ele alıyor) + **Internal RoutingProvider interface wrapper** ⭐ |
| **FN-016 imza karmaşıklığı** | HIGH | 5 extension consumer | **Options object refactor** (Phase 1.1) veya **Builder pattern** |
| **enterprise.dispatch_tasks schema bloat** | HIGH | 15+ consumer | **Phase 3 table splitting** veya **metadata offloading** ⭐ |
| **public.geofences.location_type explosion** | MEDIUM | 4 consumer (12 enum value) | PostGIS index strategy yeniden değerlendirme |
| **LLM API cost/rate limit** | MEDIUM | 3 (F015, F106 + future) | Caching + batch processing + retry exponential |
| **PostGIS migration risk** | LOW | 4 | Staging dry-run protocol (ROADMAP §Cross-Cutting) |
| **EMQX failure** | MEDIUM | 5 FEAT | Self-hosted, Docker restart, MQTT topic resync |
| **Weighted scoring per-company explosion** | MEDIUM | 6 FEAT | Centralized weight registry (Phase 2) |

⭐ = NotebookLM'in **stratejik yeni önerisi** — daha önce ADR'lerde yoktu, ADR-0013 + ADR-0014 adayı.

---

## 8. UNCERTAINTIES kategorize (17 spec × ortalama 5-10 = ~80+ toplam)

NotebookLM 14 dedi, gerçek ~80+ olmalı. Yaklaşık kategorize:

| Kategori | UNCERTAINTIES sayı (tahmin) | Örnek | Çözüm path |
|---|---|---|---|
| **Customer-driven config** | ~25 | Per-company tolerance threshold (F015), audit policy (F106), driver preferences (F019) | Customer pilot feedback |
| **External API contract** | ~15 | OCPI provider seçimi (F103), HERE Eco Routing parameter ismi (F009), Hubject vs Gireve (F103) | Customer trigger + sandbox test |
| **Regulatory pending** | ~10 | NL Vrachtwagenheffing zero-emission tariff (F103), CSRD ESRS-EFRAG taxonomy update (F106), EU 561 amendments (F019) | Government açıklama |
| **ML scope** | ~10 | Battery degradation prediction (F103), invoice fraud detection (F015), driver fatigue (F019), churn (F003) | Phase 3+ future ADR |
| **Performance** | ~10 | Tachograph DDD parser local vs API (F019), MatrixCache TTL (F001), real-time MQTT throughput (F005) | Production benchmark |
| **Architectural** | ~10 | Table splitting timing (dispatch_tasks), version control schema, multi-currency (F015, F106) | Future ADR |

**Toplam: ~80** — herbirinin **çözüm path'i** var. Hiçbiri "blocker" değil.

---

## 9. Strategic insights

NotebookLM 4 prensip belirledi + Claude konsolidasyon:

### 9.1 Disciplined Evolution (NotebookLM)

FEAT-001:FN-016 imzası 2 → 8 parametre **breaking change olmadan** büyüdü. ADR-0004 v3 §6 "additive only" disipline başarısı. **Korunması gereken:** her yeni cross-spec sync atomic commit + Change Log entry zorunlu.

### 9.2 Pattern Reuse (~%40-60 kod azalması — NotebookLM tahmini)

5 cross-cutting pattern (geofence ext, exception orchestrator, MQTT subscriber, map widget, weighted scoring) **diğer FEAT'lerce miras alınıyor**. **Korunması gereken:** Her yeni FEAT pilot prompt'unda *"Shared with previous FEAT'ler"* zorunlu çıktı (mevcut pratik).

### 9.3 ML Discipline — Vendor Bağımlılığı Trade-off

ADR-0010 §2 + §4 disiplini: TulipFleet **ML consumer**, in-house training yok. **Avantaj:** MLOps yükü yok. **Dezavantaj:** HERE outage = no plans (vendor lock-in max).

**Korunması gereken:** **Internal RoutingProvider interface** (NotebookLM önerisi) — HERE-specific kod abstraction layer arkasında izole edilir. ADR-0014 candidate.

### 9.4 Schema Stability — Phase 3 Risk

`enterprise.dispatch_tasks` 15+ FEAT consumer, **JSONB metadata explosion** riski. **NotebookLM önerisi:** Phase 3'te **table splitting** veya **metadata offloading** (örn. `enterprise.task_metadata` ayrı tablo, JSONB normalize edilebilir kolonlar).

**ADR-0013 candidate** — Phase 3 schema strategy.

### 9.5 Yeni prensip (Claude eklemesi): Critical Path Awareness

Phase 2 customer-funded FEAT trigger geldiğinde, **önceki tüm halka production'da olmalı**. FEAT-106 en uzun path (4 önceki FEAT). **Korunması gereken:** Customer trigger gelmeden önce Phase 1.1 foundation FEAT'leri (FEAT-001, 005, 008, 009, 010, 017) production'da olmalı.

---

## 10. Aksiyon listesi

### 10.1 Yeni ADR adayları

| ADR | Konu | Tetikleyici |
|---|---|---|
| **ADR-0013** | dispatch_tasks Phase 3 schema strategy (table splitting + metadata offloading) | NotebookLM stratejik önerisi |
| **ADR-0014** | Internal RoutingProvider interface (HERE abstraction layer) | NotebookLM stratejik önerisi |
| ADR-0015 (future) | Centralized weight registry pattern | Phase 2 sprint planning |
| ADR-0016 (future) | Disaster recovery + multi-vendor routing fallback | Production incident lessons |

### 10.2 Phase 1.1 sprint öncelikleri (bottleneck'leri foundation hazırlar)

1. **FEAT-001 buildHereProblem foundation** — options object refactor (FN-016 imza karmaşıklığı mitigation)
2. **FEAT-005 MQTT subscriber + map widget** — base component'ler
3. **FEAT-010 Exception orchestrator** — exception_type category prefix kuralı
4. **FEAT-017 geofence type extension** — PostGIS index strategy
5. **FEAT-008 + FEAT-009** — toll/carbon baseline

### 10.3 ROADMAP eklemeleri

- "Implementation Bottleneck Analysis" özet bölümü (Phase Plan altında)
- ADR-0013 + ADR-0014 candidate referansları
- Change Log entry

### 10.4 Sonraki adımlar (analiz sonrası)

- [ ] ROADMAP'a "Implementation Bottleneck Analysis" özet bölümü ekle
- [ ] ADR-0013 candidate yazılır mı? (Phase 3 timing belirsiz)
- [ ] **ADR-0014 candidate** — Phase 1.1 sprint öncesi yazılmalı (FEAT-001 implementation öncesi)
- [ ] FN-016 options object refactor — FEAT-001 implementation sprint'inde
- [ ] Phase 1.1 sprint plan dokümanı (bu analizi base alarak)

---

## 11. References

- 17 FEAT spec dosyaları (docs/functions/)
- 12 ADR dosyaları (docs/adr/)
- ROADMAP.md Phase Plan + Wishlist Coverage Matrix
- ENTERPRISE_INFRASTRUCTURE.md
- NotebookLM session 2026-05-30 evening (1 prompt, 8.5/10 skor — 2 sayısal hata Claude tarafından düzeltildi)
- Mega cross-spec sync commit 2026-05-30 akşam (5 spec atomic)

---

## 12. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-30 | Cem Bakir + Claude (NotebookLM cowork) | İlk konsolide bottleneck analizi. 17 pilot + mega cross-spec sync sonrası. NotebookLM tek prompt'la 9 çıktı tablosunu üretti (skor 8.5/10) — Claude 3 sayısal hata düzeltti (FN-016 consumer 8→6, location_type 18→12, HERE consumer 12+→~9) + UNCERTAINTIES toplam 14→~80. NotebookLM'in 2 yeni stratejik önerisi (Internal RoutingProvider interface + Phase 3 table splitting) ADR-0013 + ADR-0014 adayı olarak işaretlendi. Phase 1.1 sprint öncelik haritası 6 foundation FEAT belirlendi. |
