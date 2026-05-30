# FEAT-009 — Basic Carbon Footprint Per Route

| Field | Value |
|---|---|
| **Feature ID** | FEAT-009 |
| **Source** | ROADMAP Phase 1.1 follow-up; ADR-0011 §5 FEAT-009 |
| **Trigger** | MVP launch sonrası 1-4 hafta marginal effort (FEAT-008 ile aynı dönem) |
| **Tulipfleet Phase** | Phase 1 (per-task display) + Phase 1.1 (historical aggregate reports) |
| **Status** | Function spec drafted via NotebookLM (1 prompt, 2026-05-30) |
| **Pilot note** | Dokuzuncu pilot. Tek iterasyonda **8.5/10** skor. F8'deki zirve sonrası geri çekiliş: 1 §number fabrikasyon (§188 → §3.4), CSRD scope niyeti netleştirme gerekti. |
| **CSRD positioning** | **CSRD-aware (Phase 1.1)** — farkında, hazırlık; **CSRD-compliant (Phase 2, FEAT-106)** — formal XBRL/PDF export, audit, customer-funded |

---

## 1. Feature description

### 1.1 İş mantığı

```
1. Dispatcher görev planlarken HERE Tour Planning'e gönderir
2. HERE Eco Routing mode (routingMode: eco) ile plan üretilir
3. HERE response: CO2/fuel data döner (HERE native hesaplama)
4. FEAT-009: HERE data'yı CONSUME eder (TulipFleet hesaplama yapmaz)
5. Per-task carbon footprint enterprise.dispatch_tasks'a yazılır
6. Phase 1: Dispatcher panel per-task widget gösterir
7. Phase 1.1: Historical reports + per-vehicle aggregate + trend chart
8. Phase 2 (FEAT-106): CSRD-compliant XBRL/PDF export — bu spec'in DIŞINDA
```

### 1.2 CSRD-aware vs CSRD-compliant ayrımı (kritik)

CSRD farkındalığı Phase 1.1'de **bilinçli olarak içeride** — `CSRD_COMPLIANCE_ANALYSIS` dokümanı kaynak olarak yüklendi (2026-05-30). Bu yaklaşım:

| Boyut | FEAT-009 (Phase 1.1) "CSRD-aware" | FEAT-106 (Phase 2) "CSRD-compliant" |
|---|---|---|
| Hesaplama | HERE native | HERE + custom logic |
| Methodology disclosure | "DEFRA 2023 GHG Conversion Factors" UI notu | XBRL formal disclosure |
| Aggregation | Per-vehicle aggregate (basit `SUM`) | ESG framework table |
| Audit trail | Yok (HERE response store) | Tam audit, verification |
| Format | UI widget + JSON report | XBRL/PDF formal export |
| Customer | Tüm pilot customer'lar default ON | Large 3PL (Heineken/Picnic level) trigger |
| Trigger | ROADMAP Phase 1.1 marginal effort | ADR-0011 §6 customer-funded |

**FEAT-009 felsefesi:** "CSRD ile uyumlu çalışmayı kolaylaştır, formal compliance yapma." Customer FEAT-106'ya geçmek istediğinde FEAT-009 verisi temel veri seti olur (no breaking change, additive).
**FEAT-106 evolution (cross-spec sync, 2026-05-30 mega sync):** FEAT-106 Phase 2 customer-funded spec yayınlandı. FEAT-009 → FEAT-106 migration path:
- **FEAT-009 dispatch_tasks.carbon_footprint_kg** → FEAT-106 Scope 1 aggregation baseline (FEAT-106:FN-01 reads)
- **FEAT-009 methodology disclaimer (UI)** → FEAT-106 narrative_disclosure JSONB structured (FEAT-106:FN-08)
- **FEAT-009 per-vehicle aggregate** → FEAT-106 audit evidence chain (FEAT-106:FN-06 traceability)

Migration trigger: Large 3PL customer (Heineken/Picnic seviyesi) CSRD-compliance ihtiyacı. FEAT-009 verisi **mevcut kalır**, FEAT-106 üstüne kurulur (no breaking change). Phase 2 implementation backlog FEAT-106 spec §12.2'de.

### 1.3 Kapsam — içeride

- HERE Eco Routing mode aktivasyonu (`buildHereProblem` extension)
- HERE response'tan CO2/fuel data extraction
- Per-task `carbon_footprint_kg` + `fuel_consumed_liters` schema persistence
- Dispatcher panel per-task widget (Phase 1)
- Historical report endpoint (Phase 1.1)
- Per-vehicle aggregate trend chart (Phase 1.1)
- DEFRA methodology notu UI disclosure
- Per-company opt-out (`public.companies.settings` JSONB)

### 1.4 Kapsam — dışarıda (FEAT-106 Phase 2)

- **XBRL/PDF formal export** — FEAT-106 işi
- **Audit trail + verification framework** — FEAT-106
- **ESG framework reporting templates** — FEAT-106
- **Scope 1/2/3 ayrımı** — FEAT-106
- **TulipFleet kendi emission factor tablosu** — Hiçbir zaman, HERE consumer pattern
- **Custom CO2 hesaplaması** — ADR-0010 §3.2 + §4 disiplini

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Phase | Shared with FEAT-001..8 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FEAT-009-FN-01 | shared_library | `buildHereProblem` (extends FEAT-001:FN-016) | tasks, vehicles, complianceZones, appointments?, tollCostMatrix?, **routingMode?** | HERE_JSON | — | — | — | ADR-0010 §3.4 — "'Reward function' in conversation → in implementation, it is a weighted sum of constraint penalties in HERE's `objective`. No learning." | 1.1 | **FEAT-001:FN-016 — imza evrimi v3** (FEAT-006 + FEAT-008 + FEAT-009 cross-spec sync) |
| 2 | FEAT-009-FN-02 | backend | `extractCarbonData` | hereResponse: JSON | { co2_kg, fuel_liters, per_segment? } | — | — | — | ADR-0010 §4 — "Using ML-powered APIs (HERE, future map providers, future translation/NLP APIs). Allowed and encouraged." | 1 | **FEAT-005:FN-01** (HERE consumer pattern) |
| 3 | FEAT-009-FN-03 | shared_library | `upsertTaskCarbon` | taskId, co2Kg, fuelLiters | { task_id, carbon_footprint_kg } | — | enterprise.dispatch_tasks (carbon_footprint_kg + fuel_consumed_liters) | — | ADR-0004 v3 §6 — additive enterprise.* schema changes legalize | 1 | — |
| 4 | FEAT-009-FN-04 | backend | `GET /api/dispatcher/reports/carbon` | (JWT.company_id), period, groupBy | CarbonReportJSON | enterprise.dispatch_tasks | — | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 1.1 | **FEAT-008:FN-09** (report endpoint pattern) |
| 5 | FEAT-009-FN-05 | frontend | `<CarbonFootprintWidget />` | routeData: JSON | UI Component | — | — | — | ADR-0001 §3.6 — "Forms, modals, navigation, layout primitives" | 1 | — |
| 6 | FEAT-009-FN-06 | frontend | `<CarbonTrendChart />` | reportData: JSON | UI Component | — | — | — | ADR-0001 §3.6 — "React ChartJS 2 — KPI dashboard, fuel and route trend visualizations" | 1.1 | **FEAT-008:FN-08** (chart widget pattern) |
| 7 | FEAT-009-FN-07 | shared_library | `calculateAggregateCarbon` | vehicleId, dateRange | { total_co2_kg, total_fuel_liters, per_task_breakdown } | enterprise.dispatch_tasks | — | — | CSRD_COMPLIANCE_ANALYSIS §1 — "Araç bazlı kırılım — Araç başına emisyon görünümü" | 1.1 | — |

**Konsolidasyon notları:**

| # | NotebookLM dedi | Düzeltme |
|---|---|---|
| FN-01 | ADR-0010 §188 — "Eco routing — HERE's fuel-optimal routing..." | 🚨 **§188 fabrikasyon** — bölüm yok. ADR-0010'da §3.4 "weighted sum of constraint penalties" pattern doğru ref. Eco routing cümlesi **ROADMAP §Phase 1.1 FEAT-009** entry'sinde geçer ama o ROADMAP, ADR değil. Düzeltildi: ADR-0010 §3.4 (objective function pattern) + ROADMAP Phase 1.1 (FEAT-009 description) çift referans. |
| FN-02 | ADR-0011 §5 FEAT-009 | ✅ Doğru ama daha güçlü ref var: ADR-0010 §4 API consumer pattern (TulipFleet hesaplama yapmaz felsefesi). FN-02 ADR ref'i değişti. |
| FN-03 | ADR-0004 v3 §6 | ✅ Doğru |
| FN-04 | ADR-0011 §9.5 | ✅ Doğru — FEAT-008:FN-09 ile shared pattern eklendi |
| FN-07 | CSRD_COMPLIANCE_ANALYSIS §1 | ✅ Korundu — Cem'in bilinçli yüklediği kaynak |
| Schema | İki ayrı schema gap (cost_breakdown JSONB **AND** dispatch_tasks ek kolon) | ⚠️ Tutarsız — §5'te tek schema kararına netleştirildi: `dispatch_tasks.carbon_footprint_kg + fuel_consumed_liters` (ek kolon, index'lenebilir). `cost_breakdown JSONB carbon section`: REDDEDİLDİ (financial cost ve CO2 farklı boyut). |
| Aggregator tablo | `enterprise.vehicle_emissions` (FEAT-007 paterniyle) | ⚠️ Phase 1.1 için ERTELENDİ — on-demand `SUM` yeterli, 50K row/ay küçük. Phase 2 FEAT-106 trigger geldiğinde aggregator tablosu eklenebilir. UNCERTAINTIES #5'te belgelendi. |

---

## 3. HERE Eco Routing integration

### 3.1 Mode aktivasyon

HERE Tour Planning request'e `routingMode: eco` veya HERE'nin Tour Planning API spec'ine uygun parametre eklenir. Tam parametre ismi sandbox test sonucuna bağlı (UNCERTAINTIES #1).

```typescript
// FEAT-009 FN-01 extension to FEAT-001:FN-016
const hereProblem = buildHereProblem(
  tasks, vehicles, complianceZones,
  appointments,                // FEAT-006
  tollCostMatrix,              // FEAT-008
  "eco"                        // FEAT-009 — YENİ 6. parametre
);

// buildHereProblem internals:
if (routingMode === "eco") {
  hereProblem.objectives.push({
    type: "minimize",
    value: "fuel_consumption",  // veya "co2_emission"
    weight: ecoWeight
  });
}
```

### 3.2 Üç-yönlü gerilim — kritik mimari soru

Phase 1.1'de aynı `buildHereProblem`'da üç optimizasyon hedefi yarışır:

| Optimization | Type | FEAT |
|---|---|---|
| **Time window** (dock appointment) | HARD constraint (FEAT-006) | Görev başarısı |
| **Toll cost** (Vrachtwagenheffing) | SOFT constraint (FEAT-008) | Maliyet |
| **Fuel/CO2** (eco routing) | SOFT objective (FEAT-009) | Yeşil |

**Çelişki senaryosu:**
- Eco mode aktif → daha yavaş rota → dock appointment kaçırılır
- Eco mode aktif → toll'lu motorway terk edilir → daha uzun N-road → daha çok yakıt? (paradoks)

**Karar mantığı:**
- Time window: HARD ihlal edilmez
- Toll + CO2 ikisi soft, composite objective function ağırlıklarıyla dengelenir
- Eco mode bir **opt-in toggle** olur, default OFF (UNCERTAINTIES #6)

### 3.3 Veri çekme — per-route vs per-segment

HERE response iki granülarite sunabilir:
- **Per-route özet:** Tek toplam CO2/fuel — basit, yeterli MVP
- **Per-segment:** Her road segment için ayrı CO2/fuel — detaylı, audit trail ön hazırlık

**Phase 1 önerisi:** Per-route özet (basit, hızlı). Phase 1.1'de per-segment opt-in eklenebilir. UNCERTAINTIES #2.

---

## 4. CSRD-aware UI disclosure (Phase 1.1)

### 4.1 Methodology notu — zorunlu disclosure

`<CarbonFootprintWidget />` (FN-05) ve `<CarbonTrendChart />` (FN-06) altında zorunlu metin:

> *"CO2 verileri HERE Eco Routing tarafından DEFRA 2023 GHG Conversion Factors metodolojisi kullanılarak hesaplanmıştır. Bu görünüm CSRD raporlama hazırlığını destekler ancak formal CSRD-compliant export değildir."*

Bu mesaj iki amaca hizmet eder:
1. **Transparency** — hesaplama nasıl yapıldı şeffaf
2. **Scope discipline** — bu Phase 1.1 display, FEAT-106 değil

### 4.2 Birim standartı

| Birim | Kullanım |
|---|---|
| **kg CO2 per route** | Default — per-task display |
| **kg CO2 per vehicle per period** | Aggregate report |
| **g CO2/km** | EU regulatory comparison (vehicles screen) |
| **ton CO2 per fleet per year** | Phase 2 FEAT-106 — export format |

Per-company birim override Phase 2'de FEAT-106 ile gelecek. Phase 1.1'de **fixed kg CO2** sade tutar.

### 4.3 Per-company opt-out

```sql
-- public.companies.settings JSONB (mevcut tablo, additive)
{
  "carbon_display_enabled": true,  -- default ON
  "carbon_methodology_disclaimer": true,  -- default ON, scope discipline için
  ...
}
```

Müşteri customer-facing (driver/customer mobile) carbon görünümünü kapatmak isterse opt-out edebilir. **Dispatcher panel görünümü her zaman ON** — operasyon analizi için.

---

## 5. Database changes (additive)

### 5.1 `enterprise.dispatch_tasks` — iki yeni kolon

```sql
ALTER TABLE enterprise.dispatch_tasks
  ADD COLUMN carbon_footprint_kg    NUMERIC(8,3),  -- HERE response'dan gelen CO2
  ADD COLUMN fuel_consumed_liters   NUMERIC(8,3);  -- HERE response'dan gelen fuel
```

**Index önerisi (Phase 1.1, aggregate query'ler için):**
```sql
CREATE INDEX idx_dispatch_tasks_carbon_period
  ON enterprise.dispatch_tasks (company_id, completed_at DESC)
  WHERE carbon_footprint_kg IS NOT NULL;
```

### 5.2 `enterprise.routing_jobs.cost_breakdown` — FEAT-008 ile NOT shared

FEAT-008'in `cost_breakdown JSONB` kolonu **financial cost** içindir. Carbon CO2 **emission** boyutu, financial değil. **İki kavram ayrı tutulur:**

```jsonc
// FEAT-008 cost_breakdown (financial):
{ "fuel_cost_eur": 45.20, "toll_cost_eur": 12.75, ... }

// FEAT-009 dispatch_tasks dedicated columns (emission):
{ "carbon_footprint_kg": 18.45, "fuel_consumed_liters": 22.30 }
```

**Schema discipline kararı:** İki kavram **ayrı tablolar/kolonlarda** tutulur. JSONB birleştirme cazip ama mantıksız (cost EUR vs emission kg/L farklı domain).

### 5.3 `public.companies.settings` — additive JSONB key

Mevcut JSONB kolonu, yeni key'ler additive:

```jsonc
{
  ...
  "carbon_display_enabled": true,
  "carbon_methodology_disclaimer": true
}
```

### 5.4 Aggregator tablo — ERTELENDİ

`enterprise.vehicle_emissions` aggregator tablosu NotebookLM önerdi (FEAT-007 driver_scores paterniyle). Phase 1.1 için **ertelendi:**

- 50 araç × 30 görev/gün × 30 gün = 45K row/ay — küçük lookup
- On-demand `SUM(carbon_footprint_kg) GROUP BY vehicle_id, period` yeterli
- TimescaleDB hypertable şu an gerekli değil

Phase 2 FEAT-106 trigger geldiğinde (Heineken/Picnic level customer) aggregator tablosu eklenebilir.

---

## 6. Shared infrastructure with previous FEAT'leri

| FEAT-009 fonksiyon | Shared with | Paylaşım türü |
|---|---|---|
| FN-01 buildHereProblem extension | **FEAT-001:FN-016** | **Imza evrimi v3** — 6. parametre `routingMode?` eklenir. FEAT-006 + FEAT-008 ile aynı pattern, forward-compatible. **Cross-spec sync gerekli.** |
| FN-02 extractCarbonData | **FEAT-005:FN-01** getHereRoutingEta | HERE consumer pattern (response parse + Redis cache) |
| FN-04 GET reports/carbon | **FEAT-008:FN-09** GET hgv-toll | Report endpoint pattern (period + groupBy + JSON) |
| FN-06 CarbonTrendChart | **FEAT-008:FN-08** CostBreakdownWidget | ChartJS widget pattern |

**Yeni cross-spec sync TODO (FEAT-001 v3):**
- FN-016 inputs imzası `routingMode?` parametresi eklenir
- §4.5 "Future evolution" bölümünde FEAT-009 entry'si eklenir
- v2 → v3 Change Log

### EV well-to-wheel branch (cross-spec sync, FEAT-103, 2026-05-30 mega sync)

ICE araç (Diesel/Petrol) için FEAT-009 direkt egzoz emisyonu (Scope 1). **EV araç için emisyon hesabı farklı:**

- **Direct emission (Scope 1):** EV için 0 kg CO2 (egzoz yok)
- **Well-to-Wheel (WTW):** Elektrik üretiminden gelen emisyon → **Scope 2** (FEAT-103 charging_sessions baseline)
- **FEAT-009 vehicle.fuel_type='electric' davranışı:** Phase 1.1 carbon_footprint_kg = 0 (direct emission). FEAT-103 ayrı Scope 2 tracking sağlar.

**FEAT-106 entegrasyonu:** CSRD-compliant rapor için:
- Scope 1 total = FEAT-009 ICE vehicles only (EV = 0)
- Scope 2 total = FEAT-103 charging_sessions × electricity_grid_mix_factor
- FEAT-106 ayrı `aggregateScope2Emissions` (FN-02) FEAT-103 kullanır, FEAT-009 değil

**Mimari karar:** FEAT-009 sadece ICE vehicles için aktive. EV detection: `vehicle.fuel_type='electric'` early-exit. Phase 2 FEAT-106 multi-scope aggregation handle eder.

**Schema kontrolü:** `public.vehicles.fuel_type` mevcut kolonu kullanılır (manuel veya OBD-II inferred). Phase 1 EV fleet için NULL fallback (legacy data).
---

## 7. UNCERTAINTIES (Cem onayı bekleyen)

### NotebookLM'in tespit ettikleri

1. **Eco-mode trade-off (FN-01):** `routingMode: eco` VRP solver'ın zaman pencereleri ve mesafe optimizasyonu arasındaki dengeyi etkiler.
   - **Senaryo:** Yakıt tasarrufu için teslimat geciktirilebilir → FEAT-006 dock appointment HARD constraint ihlali
   - **Karar:** Eco mode default OFF, dispatcher per-plan opt-in toggle
   - Phase 1.1 launch sonrası customer feedback'le default değiştirilebilir

2. **Veri granülaritesi (FN-02):** HERE'den CO2 her road segment bazında mı, route özeti bazında mı?
   - **Phase 1 önerisi:** Per-route özet (basit, hızlı)
   - **Phase 1.1 eklenti:** Per-segment opt-in (audit trail hazırlığı)
   - Sandbox test gerek

3. **Birim standardı (UI):** HERE ham veri (gram vs kilogram) → TulipFleet UI standardı
   - **Karar:** kg CO2 fixed Phase 1.1, conversion FN-02 içinde otomatik
   - Per-company override Phase 2 FEAT-106 işi

### Konsolidasyonda eklenen

4. **Schema discipline — cost_breakdown JSONB shared mı?:**
   - **Karar:** SHARED DEĞİL — financial cost (EUR) vs emission (kg CO2) ayrı domain
   - FEAT-009 dedicated columns (`dispatch_tasks.carbon_footprint_kg + fuel_consumed_liters`)
   - JSONB merger reddedildi

5. **Aggregator tablo — `enterprise.vehicle_emissions`:**
   - **Karar:** ERTELENDİ — Phase 2 FEAT-106 trigger'da gerekirse eklenir
   - Phase 1.1'de on-demand `SUM` yeterli (45K row/ay küçük)

6. **Eco mode default toggle:**
   - **Karar:** Default OFF Phase 1.1, dispatcher per-plan opt-in
   - Customer feedback'le 6 ay sonra default ON değerlendirilebilir
   - Per-company override `public.companies.settings.eco_routing_default` JSONB key

7. **CSRD-aware vs CSRD-compliant net iletişim:**
   - **Karar:** UI'da her yerde "DEFRA 2023 GHG Conversion Factors hesaplaması, formal CSRD export için FEAT-106 (Phase 2) bekleniyor" disclaimer
   - Sales material'a aynı dil — premature CSRD pazarlaması yapmamak
   - FEAT-106 trigger Heineken/Picnic level customer geldiğinde aktive

8. **Per-vehicle aggregate query performance:**
   - Phase 1.1 başlangıçta 50 araç × 30 görev/gün × 30 gün = 45K row/ay
   - `SUM(carbon_footprint_kg) GROUP BY vehicle_id` <100ms expected
   - **İzleme:** 200+ araç scale'a ulaştığında re-evaluate (FEAT-106 sırasında)

---

## 8. Pilot süreç notları

### 8.1 Pilot akışı (2026-05-30)

Tek prompt + 0 follow-up. NotebookLM defterinde **ROADMAP + CSRD_COMPLIANCE_ANALYSIS** kaynakları yüklü. Cem bilinçli olarak CSRD farkındalığını feature'a dahil etmek istedi.

### 8.2 Alıntı doğrulama — F8 sonrası gerileme

| # | NotebookLM | Gerçek | Durum |
|---|---|---|---|
| ADR-0010 §188 (FN-01) | "Eco routing — HERE's fuel-optimal..." | 🚨 **§188 fabrikasyon** — bölüm yok | ⚠️ Düzeltildi — ADR-0010 §3.4 + ROADMAP çift ref |
| ADR-0011 §5 FEAT-009 (FN-02) | ✅ Doğru ama ADR-0010 §4 daha güçlü ref | — | ⚠️ Düzeltildi — §4 API consumer pattern |
| CSRD_COMPLIANCE_ANALYSIS §1 (FN-07) | Cem yükledi, meşru kaynak | ✅ Korundu | — |
| ADR-0004 v3 §6 (FN-03) | ✅ Doğru | — | ✅ |
| ADR-0011 §9.5 (FN-04) | ✅ Doğru | — | ✅ |
| ADR-0001 §3.6 (FN-05, FN-06) | ✅ Doğru | — | ✅ |

**§number fabrikasyon: 1** (ADR-0010 §188)
**Toplam alıntı düzeltmesi: 2** (FN-01 §188→§3.4, FN-02 §5→§4 daha güçlü ref)

### 8.3 9 pilot karşılaştırma

| Boyut | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 | **F9** |
|---|---|---|---|---|---|---|---|---|---|
| Skor | 9 | 9.5 | 9 | 9 | 8.5 | 9 | 8.5 | 9.5 | **8.5** |
| İterasyon | 5 | 3 | 2 | 1+1 | 1+3 | 1 | 1+1 | 1 | **1** |
| Fonksiyon | 16 | 16 | 16 | 12 | 12 | 10 | 14 | 9 | **7** |
| Alıntı hatası | 1 | 1 | 1 | 0 | 1 | 1 | 6 | 1 | **2** |
| §number fabrikasyon | 1 | 1 | 1 | 0 | 1 | 1 | 1 | 0 | **1** |
| Yeni paradigma | VRP | Re-route | Dispatch | Multi-actor | HERE consume | Task duration | Coaching | Toll cost | **Carbon + CSRD-aware** |

**F9 gerilemesi gözlemi:**
- F8 sonrası §number fabrikasyon yeniden çıktı (§188 hayali)
- Hata oranı F8 zirvesinden (0) F9'da 1'e döndü — **trend hâlâ sağlıklı** (F1-F7 ortalama 1-2)
- Skor 8.5/10 hâlâ "konsolidasyona değer" eşiğinde
- **CSRD context'ini doğru kavradı** — Phase 1.1 vs Phase 2 ayrımına saygı gösterdi
- **Üç-yönlü gerilim doğru tespit** — eco vs time-window vs toll trade-off

### 8.4 NotebookLM trend yorumu

F8 zirvesi (9.5/10 + §number fab=0) sonrası F9'da bir geri çekiliş — bu **normal varyans** olabilir, **ya da** F8'in stratejik öneminin (Vrachtwagenheffing — gerçek production-blocking issue) NotebookLM'i daha dikkatli kıldığı söylenebilir. F9 daha "rutin" feature olduğu için odak gevşemiş olabilir.

**Sonraki pilotlar (FEAT-010+) için tavsiye:** Prompt'ta "ADR-0010'da §3.4'ten yüksek section numarası YOK" gibi **hard guard rail** eklenebilir. §188 fabrikasyonu defense-in-depth kuralıyla önlenir.

---

## 9. Next steps

### 9.1 Cross-spec sync — FEAT-001 v3 (yeni TODO)

**FEAT-001-multi-vehicle-vrp.md** güncellemesi (dün v2 commit edildi):
- FN-016 inputs imzası: `+ routingMode?` (FEAT-009)
- §4.5 "Future evolution from FEAT-006 + FEAT-008 + FEAT-009" — 3. alt-bölüm eklenir
- Change Log v3 entry

**Karar:** FEAT-009 commit ile **aynı session'da** mı, ayrı mı?
- **Birlikte:** Tek atomik commit, cross-spec discipline temiz
- **Ayrı:** FEAT-009 spec'i standalone değerlendirilir, FEAT-001 v3 ayrı sprint

### 9.2 Phase 1 implementation backlog

Phase 1 (MVP launch ile):
- [ ] Schema migration: `enterprise.dispatch_tasks` carbon_footprint_kg + fuel_consumed_liters kolonları
- [ ] FN-02 extractCarbonData (HERE response parser)
- [ ] FN-03 upsertTaskCarbon (UPSERT pattern)
- [ ] FN-05 `<CarbonFootprintWidget />` per-task display
- [ ] DEFRA methodology disclaimer i18n strings (9 dil)

### 9.3 Phase 1.1 implementation backlog

Phase 1.1 (MVP launch sonrası 1-4 hafta):
- [ ] FN-01 buildHereProblem extension (`routingMode?` parametresi)
- [ ] FEAT-001 v3 cross-spec sync commit
- [ ] FN-04 GET reports/carbon endpoint
- [ ] FN-06 `<CarbonTrendChart />` historical chart
- [ ] FN-07 calculateAggregateCarbon shared library
- [ ] `public.companies.settings.carbon_display_enabled` opt-out toggle
- [ ] Sandbox test: HERE Eco Routing parameter ismi (UNCERTAINTIES #1)

### 9.4 Phase 2 connection (FEAT-106 hazırlık)

FEAT-009 verisi FEAT-106 trigger geldiğinde temel veri seti olur:
- `enterprise.dispatch_tasks.carbon_footprint_kg` zaten history
- Per-vehicle aggregate query çalışıyor
- FEAT-106 üzerine: XBRL export logic, audit trail, customer-facing report templates

**FEAT-009 → FEAT-106 breaking change DEĞİL** — additive evolution. ADR-0004 v3 §6 pattern.

### 9.5 Sıradaki pilot

10 pilot tamamlanıyor. Wishlist'te 21 daha. Kapsam seçenekleri:
- **FEAT-010..** Wishlist'ten sırada bir tanesi
- **FEAT-101+ Phase 2** customer-funded use cases (EV optimization, AI agent, 3PL connector)
- **M1-M7 production sprint** (Amsterdam ZE-Zone polygon seed)

---

## 10. References

- ADR-0001 §3.6 (UI primitives — Forms, ChartJS)
- ADR-0004 v3 §6 (additive enterprise.* schema changes)
- ADR-0010 §3.2 (HERE feature consumer pattern), **§3.4** (no learning, weighted sum), **§4** (LLM/ML API consumer)
- ADR-0011 §5 FEAT-009 (HERE Eco Routing description, scope), §9.5 (endpoint patterns)
- FEAT-001 spec v2 (FN-016 cross-spec sync target, v3'e güncellenecek)
- FEAT-005 spec v2 (FN-01 HERE consumer pattern)
- FEAT-008 spec (FN-08 chart pattern, FN-09 report pattern)
- **CSRD_COMPLIANCE_ANALYSIS** §1 (TulipFleet internal doc — Cem 2026-05-30'da NotebookLM defterine yükledi)
- ROADMAP Phase 1.1 (FEAT-009 description, FEAT-106 ayrımı)
- NotebookLM session 2026-05-30 (1 prompt, 8.5/10 skor)

---

## 11. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-30 | Cem Bakir (with Claude + NotebookLM cowork) | İlk konsolide function spec. Dokuzuncu pilot — basic carbon footprint per route. 7 fonksiyon (FN-01..FN-07), Phase 1: 3, Phase 1.1: 4. **CSRD positioning:** CSRD-aware Phase 1.1 (display + methodology disclosure + aggregate report) vs CSRD-compliant Phase 2 FEAT-106 (XBRL export + audit + customer-funded). Cem CSRD_COMPLIANCE_ANALYSIS dokümanını NotebookLM defterine bilinçli yükledi. ML disipline check ADR-0010 §3.4 + §4 birebir uyumlu — HERE consumer, custom hesaplama yok. Cross-spec sync TODO: FEAT-001 v3 (FN-016 `routingMode?` parametresi + §4.5 üçüncü alt-bölüm). Konsolidasyon düzeltmeleri: FN-01 ADR-0010 §188 fabrikasyon → §3.4 + ROADMAP çift ref, FN-02 ADR-0011 §5 → ADR-0010 §4 (daha güçlü ref), schema kararı netleştirildi (`dispatch_tasks` ek kolon, `cost_breakdown` JSONB merger reddedildi), aggregator tablo (`enterprise.vehicle_emissions`) Phase 2 FEAT-106 trigger'a ertelendi. Üç-yönlü gerilim spec edildi (eco mode vs time-window vs toll). Per-company opt-out `public.companies.settings.carbon_display_enabled` JSONB key. NotebookLM kalitesi F8 zirvesinden geri çekildi (1 §number fabrikasyon vs F8'in 0), trend hâlâ sağlıklı. Sonraki pilotlarda "ADR-0010 §3.4'ten yüksek section yok" hard guard rail önerildi. |
| 1.1 (mega cross-spec sync) | 2026-05-30 | Cem Bakir + Claude | **FEAT-106 migration path belgelendi + EV well-to-wheel branch eklendi**. §1.2 CSRD-aware vs CSRD-compliant ayrım tablosuna FEAT-106 evolution paragrafı eklendi (dispatch_tasks.carbon_footprint_kg → FEAT-106 Scope 1 baseline; methodology disclaimer → narrative_disclosure JSONB structured; per-vehicle aggregate → audit evidence chain). EV well-to-wheel branch alt-bölümü eklendi — ICE direct emission (Scope 1) vs EV WTW (Scope 2 FEAT-103 charging_sessions baseline). FEAT-009 vehicle.fuel_type='electric' davranışı: carbon_footprint_kg=0, Scope 2 FEAT-103 handle eder. Mega cross-spec sync atomic commit FEAT-010 + FEAT-001 + FEAT-017 + FEAT-008 ile birlikte. Schema değişikliği yok (sadece dokumentasyon). 17 pilot toplam. |
