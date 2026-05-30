# FEAT-019 — Multi-Day Long-Haul Planning

| Field | Value |
|---|---|
| **Feature ID** | FEAT-019 |
| **Source** | Wishlist W19 — "Multi-Day Long-Haul Planning" |
| **Frequency rating** | Niche (yüksek expertise feature) |
| **Tulipfleet Phase** | Phase 2 (customer-funded trigger per ADR-0011 §6) |
| **Spec readiness** | Yorum B kararı, 2026-05-30 — Phase 2 etiketi korunur, spec şimdi yazılır |
| **Status** | Function spec drafted via NotebookLM (1 prompt, 2026-05-30) |
| **Pilot note** | On beşinci pilot. **9/10** skor — zirve zinciri (F15+F19). **§number fabrikasyon = 0** ✅ (F8-F10-F17-F14-F18-F15-F19 zinciri stable, **7 pilot**). **Section misattribution = 0** ✅ **TOPARLAMA KALICI** (F15 başarısı F19'da doğrulandı — kalıcı hata değildi). Yeni paradigma: **multi-day VRP + EU regulatory compliance** (561/2006 driver hours + cross-border). |

---

## 1. Feature description

### 1.1 Wishlist tanımı

> *"Dispatchers optimize routes that span several days and require overnight stays and include stops for short rest before completion."*

### 1.2 Yeni paradigma — Multi-Day VRP + Regulatory Compliance

Önceki 14 FEAT'in tümünden farklı bir alan:

| Önceki FEAT'ler | **FEAT-019** |
|---|---|
| Single-day VRP (FEAT-001) | **Multi-day VRP** (HERE Tour Planning multi-period extension) |
| Driver shift = 1 gün | **Multi-day driver hours compliance** (EU 561/2006) |
| Depot start/end | **Overnight rest stops** (truck-friendly parking + hotel) |
| Local route | **Cross-border** (NL → BE/DE/FR transit) |
| ADR-0012 NL compliance | **Multi-country compliance** (Belgium Viapass, Germany Maut, France péage) |

### 1.3 FEAT-001 VRP ile ilişki — multi-day extension

FEAT-001:FN-016 `buildHereProblem` imzasına **`daysHorizon?`** parametresi eklenir (cross-spec sync — FEAT-006 + FEAT-008 + FEAT-009 paterni devam ediyor).

```typescript
// FEAT-001:FN-016 evrim (cross-spec sync)
buildHereProblem(
  tasks,
  vehicles,
  appointments?,           // FEAT-006
  tollCostMatrix?,         // FEAT-008
  routingMode?,            // FEAT-009
  daysHorizon?,            // FEAT-019 YENİ — multi-day plan horizon
  driverRules?             // FEAT-019 YENİ — EU 561/2006 constraints
)
```

### 1.4 EU 561/2006 disipline (FN-02, FN-05 core)

Driver hours regulation rule-based implementation:

| Kural | Limit | Esneklik |
|---|---|---|
| **Günlük sürüş** | Maks 9 saat | Haftada 2 kez 10h'a çıkabilir |
| **Kesintisiz sürüş** | Maks 4.5 saat | Sonra min 45dk break (veya 15+30 bölünmüş) |
| **Günlük dinlenme** | Min 11 saat kesintisiz | Haftada max 3 kez 9h'a düşürülebilir |
| **Haftalık dinlenme** | Min 45 saat kesintisiz | Bazı koşullarda 24h'a düşürülebilir |

**Rule-based, ML değil** (ADR-0010 §3.4 paterni).

### 1.5 ML disipline kritik nüans

| Konu | Karar |
|---|---|
| Multi-day routing | ✅ HERE Tour Planning native consumer (ADR-0010 §4) |
| EU 561/2006 compliance | ✅ Rule-based (ADR-0010 §3.4) |
| Overnight stop selection | ✅ PostGIS + weighted scoring (geometric, ML değil) |
| Driver fatigue prediction | ❌ Phase 3+ candidate (ADR-0010 §3.5) |
| Tachograph data processing | ✅ DDD format parser (binary), rule-based event classification |
| Auto re-plan on rest violation | ⚠️ Mode 1 Advisory (Mode 2 customer-funded trigger) |

### 1.6 Kapsam — içeride (Phase 2)

- Multi-day HERE Tour Planning (driver shift rules native + cross-border)
- EU 561/2006 driver hours budget computation
- Overnight stop selection (PostGIS + 5-type taxonomy)
- Cross-border toll integration (NL Vrachtwagenheffing + BE Viapass + DE Maut + FR péage)
- Tachograph DDD format ingestion (Phase 2 customer-funded connector)
- Real-time driver hours tracking (MQTT subscriber)
- Rest violation exception (FEAT-010 entegrasyonu)
- Border crossing compliance check (ADR-0012 §4 multi-country extension)
- Long-haul KPI reporting (km/gün, rest compliance %, cross-border breakdown)
- Driver preference (hotel vs cabin) — scoring weight

### 1.7 Kapsam — dışarıda

- **Driver fatigue ML prediction** — Phase 3+ (ADR-0010 §3.5)
- **Custom multi-day VRP solver** — HERE native kullanılır
- **Hotel booking integration** — Phase 3+ partner API
- **Driver salary/per diem calculation** — accounting team işi
- **ELD/IFTA (US-specific)** — wishlist W22 ayrı feature
- **Tachograph hardware integration** — Phase 3+ (sadece data import Phase 2)
- **Real-time secure parking availability** — Phase 3+ partner API (UNCERTAINTIES #2)

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Phase | Shared with FEAT-001..18 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FEAT-019-FN-01 | backend | `createLongHaulTour` | tasks[], driverId, vehicleId | { tourId } | enterprise.dispatch_tasks | enterprise.long_haul_tours | — | ADR-0009 §4.4 — "Dispatcher-created and dispatcher-approved plans flow into the driver-facing task model." | 2 | **FEAT-003** order ingestion pattern |
| 2 | FEAT-019-FN-02 | shared_library | `computeDriverHoursBudget` | driverId, startDate, daysHorizon | BudgetJSON | public.drivers, enterprise.tachograph_records | — | — | ADR-belirsiz (AB 561/2006 hesaplama motoru — UNCERTAINTIES #5) | 2 | — |
| 3 | FEAT-019-FN-03 | backend | `findOvernightStops` | location, radius, stopTypes[] | Stop[] | public.geofences | — | PostGIS | ADR-0012 §4.7 — "point-in-polygon native query Phase 3 scale için altyapı" | 2 | **FEAT-017:FN-01** findNearbyLockers pattern |
| 4 | FEAT-019-FN-04 | shared_library | `buildHereLongHaulProblem` | tourData, driverRules, **daysHorizon** | HERE_JSON | enterprise.long_haul_tours | — | HERE Tour Planning | ADR-0002 §3.2 — "HERE Tour Planning natively models constraints (vehicle height, cold chain, driver shift rules, mixed pickup/delivery, refueling stops)" | 2 | **FEAT-001:FN-016** buildHereProblem (cross-spec sync — daysHorizon imza evrimi) |
| 5 | FEAT-019-FN-05 | backend | `validateRestCompliance` | tourSolution | { isValid, violations[] } | — | — | — | ADR-0005 §2 — "Mode 1 — Advisory: The system suggests dispatch decisions. The dispatcher approves every action before it takes effect." | 2 | — |
| 6 | FEAT-019-FN-06 | worker | `ingestTachographData` | file (DDD binary), driverId | Success | — | enterprise.tachograph_records | DDD parser library | ADR-0007 §3.2 — "Every third-party telematics provider's API changes over time." | 2 | — |
| 7 | FEAT-019-FN-07 | worker | `monitorActiveDriverHours` | MQTT_Payload (vehicle location/state), tourId | void | enterprise.long_haul_tours | enterprise.exception_events | EMQX | ADR-0005 §5.3 — "If rules trigger an exception, system marks the task `needs_dispatcher` and notifies the dispatcher." | 2 | **FEAT-010:FN-06** logExceptionEvent (new exception_type: 'rest_violation') |
| 8 | FEAT-019-FN-08 | backend | `generateLongHaulReport` | company_id, period | KPI_JSON | enterprise.long_haul_tours | — | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 2 | **FEAT-008, FEAT-009** baseline reuse (toll + carbon) |
| 9 | FEAT-019-FN-09 | backend | `GET /api/dispatcher/long-haul/tours` | company_id, status | Tour[] | enterprise.long_haul_tours | — | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 2 | — |
| 10 | FEAT-019-FN-10 | frontend | `<TourTimelineView />` | tourId | UI Component | enterprise.long_haul_tours, enterprise.overnight_stops | — | — | ADR-0005 §4.1 — "Modify one or more assignments (drag-and-drop in the Kanban view; reorder visits in the timeline)." | 2 | — |
| 11 | FEAT-019-FN-11 | frontend | `<RestStopMap />` | stops[] | UI Component | — | — | Leaflet | ADR-0006 §3.1 — "Map interactions are inspection-oriented, not action-oriented." | 2 | **FEAT-005:FN-06** + **FEAT-017:FN-09** map widget pattern |
| 12 | FEAT-019-FN-12 | backend | `evaluateBorderCrossingCompliance` | route, vehicleId | ComplianceResult | enterprise.nl_compliance_zones | — | — | ADR-0012 §4 — zone breach prediction discipline | 2 | **FEAT-001:FN-012** compliance check |
| 13 | FEAT-019-FN-13 | shared_library | `computeMultiCountryTollMatrix` (**KONSOLIDASYONDA EKLENDİ**) | route, vehicleProfile, dateRange | { nl_eur, be_eur, de_eur, fr_eur, breakdown } | enterprise.nl_vrachtwagenheffing_tariffs, enterprise.cross_border_toll_tariffs | — | BE Viapass API, DE Maut API, FR péage API | ADR-0002 §3.4 — "Soft constraints (weighted in the objective function): ... Vrachtwagenheffing per-km cost (FEAT-008, Phase 1.1)..." (extension to multi-country) | 2 | **FEAT-008:FN-05** MatrixCache pattern (cross-border extension) |
| 14 | FEAT-019-FN-14 | backend | `GET /api/dispatcher/drivers/:id/hours-remaining` (**KONSOLIDASYONDA EKLENDİ**) | id, (JWT.company_id) | { dailyRemaining, weeklyRemaining, biweeklyRemaining, nextRestRequiredAt } | enterprise.tachograph_records, enterprise.long_haul_tours | — | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 2 | — |
| 15 | FEAT-019-FN-15 | shared_library | `parseDddTachographFile` (**KONSOLIDASYONDA EKLENDİ**) | fileBuffer (binary) | { activities, vehicleId, driverId, periodStart, periodEnd } | — | — | DDD parser library | ADR-belirsiz (DDD binary format — EU regulation 581/2010 spec) | 2 | — |
| 16 | FEAT-019-FN-16 | shared_library | `scoreDriverRestPreference` (**KONSOLIDASYONDA EKLENDİ**) | stop, driverId | score: numeric (0-100) | public.drivers (preferences JSONB) | — | — | ADR-0010 §3.4 — "'Reward function' in conversation → in implementation, it is a weighted sum of constraint penalties in HERE's `objective`. No learning." | 2 | **FEAT-014:FN-05** + **FEAT-015:FN-04** weighted sum pattern |

**Konsolidasyon notları (NotebookLM çıktısına göre düzeltmeler):**

| # | NotebookLM dedi | Düzeltme |
|---|---|---|
| Alıntılar 1-12 | ✅ Hepsi doğru, FN-05 §2 + FN-10 §4.1 ayrımı net (F15+F19 zinciri) | — |
| **FN-13 Cross-border toll matrix** | UNCERTAINTIES #3'te bahsedildi ama fonksiyon yok | ✅ **EKLENDİ FN-13** `computeMultiCountryTollMatrix` — NL + BE + DE + FR cross-border toll computation |
| **FN-14 Driver hours endpoint** | FN-07 worker MQTT consume ama dashboard endpoint yok | ✅ **EKLENDİ FN-14** `GET /drivers/:id/hours-remaining` — real-time dispatcher view |
| **FN-15 DDD parser detayı** | FN-06 var ama binary DDD format spec belirsiz | ✅ **EKLENDİ FN-15** `parseDddTachographFile` — FN-06'nın çağırdığı binary parser library wrapper |
| **FN-16 Driver preference scoring** | UNCERTAINTIES #4 (hotel vs cabin) ama fonksiyon yok | ✅ **EKLENDİ FN-16** `scoreDriverRestPreference` — weighted sum (ADR-0010 §3.4 paterni) |
| FN-04 daysHorizon imza evrimi | NotebookLM imza belirsiz | ✅ Düzeltildi: FEAT-001:FN-016 `daysHorizon?` parametresi (cross-spec sync) |

**Fonksiyon sayısı:** NotebookLM 12 → konsolidasyon **16** (4 yeni eklendi: FN-13 cross-border toll, FN-14 hours endpoint, FN-15 DDD parser, FN-16 preference scoring).

---

## 3. Multi-day VRP pipeline

```
1. Dispatcher long-haul tasks tanımlar (pickup/delivery > 600km veya > 1 gün)
        │
        ▼
2. createLongHaulTour (FN-01) — multi-day header
        │
        ▼
3. computeDriverHoursBudget (FN-02) — EU 561/2006
   - Driver'ın son 24h, 7gün, 2hafta sürüş geçmişi
   - Mevcut tachograph veri (FN-06 ingested)
   - Remaining budget hesabı
        │
        ▼
4. findOvernightStops (FN-03) — route boyunca candidates
   - PostGIS ST_DWithin (location_type IN truck_parking/secured/hotel)
   - 5-type taxonomy filtre
        │
        ▼
5. scoreDriverRestPreference (FN-16) — preference scoring
   - Driver'ın hotel/cabin tercihi (public.drivers.preferences)
   - Security level (cargo value bazlı)
   - Weighted score 0-100
        │
        ▼
6. computeMultiCountryTollMatrix (FN-13) — cross-border cost
   - NL Vrachtwagenheffing (FEAT-008)
   - BE Viapass + DE Maut + FR péage
   - Per-country breakdown
        │
        ▼
7. buildHereLongHaulProblem (FN-04) — HERE submission
   - tasks + vehicles + driverRules (EU 561/2006)
   - daysHorizon (multi-period)
   - Overnight stops mandatory waypoints
   - Cross-border toll matrix soft constraint
        │
        ▼
8. HERE Tour Planning solver (native multi-day)
        │
        ▼
9. validateRestCompliance (FN-05) — solution check
   - Daily 9h driving max
   - 4.5h continuous max → 45dk break
   - 11h daily rest
   - 45h weekly rest
   - Violations[] varsa → re-plan veya manuel override
        │
        ▼
10. Mode 1 dispatcher approve
        │
        ▼
11. Tour active state:
    - monitorActiveDriverHours (FN-07) MQTT subscriber
    - evaluateBorderCrossingCompliance (FN-12) ZE-zone check
    - Real-time exception events
        │
        ▼
12. Driver hours dashboard:
    - GET /drivers/:id/hours-remaining (FN-14)
    - <TourTimelineView /> (FN-10)
    - <RestStopMap /> (FN-11)
        │
        ▼
13. Tour completion:
    - generateLongHaulReport (FN-08) — KPI export
    - FEAT-008 toll + FEAT-009 carbon baseline reuse
```

---

## 4. EU 561/2006 implementation detail

### 4.1 Driver hours budget computation (FN-02)

```typescript
async function computeDriverHoursBudget(driverId, startDate, daysHorizon) {
  // Son 28 günün tachograph kayıtları (rolling window)
  const tachographHistory = await getTachographHistory(driverId, 28);
  
  // Mevcut kullanılan saat hesabı
  const last24h = sumDriving(tachographHistory, startDate, 1);
  const last7days = sumDriving(tachographHistory, startDate, 7);
  const last2weeks = sumDriving(tachographHistory, startDate, 14);
  
  // Calismakta olan extended day count (10h variant)
  const extendedDayCount = countExtendedDriving(tachographHistory, startDate);
  
  // Reduced daily rest count (9h variant)
  const reducedRestCount = countReducedRest(tachographHistory, startDate);
  
  return {
    dailyRemaining: 9 * 3600 - last24h,             // saniye
    dailyExtended: extendedDayCount < 2,             // bu hafta 10h hakkı var mı
    weeklyRemaining: 56 * 3600 - last7days,
    biweeklyRemaining: 90 * 3600 - last2weeks,
    reducedRestAvailable: reducedRestCount < 3,
    continuousDriving: getCurrentContinuousDriving(tachographHistory),
    breakDueIn: 4.5 * 3600 - getCurrentContinuousDriving(tachographHistory),
    nextRestRequiredAt: computeNextRestTime(tachographHistory)
  };
}
```

### 4.2 Rest violation detection (FN-07 worker)

```typescript
async function monitorActiveDriverHours(mqttPayload, tourId) {
  const tour = await getLongHaulTour(tourId);
  const driverId = tour.driver_id;
  const budget = await computeDriverHoursBudget(driverId, new Date(), 0);
  
  // 30 dakika buffer warning
  if (budget.breakDueIn < 30 * 60) {
    await logExceptionEvent({  // FEAT-010:FN-06
      exception_type: 'rest_violation',  // FEAT-010 cross-spec sync
      severity: 'high',
      tour_id: tourId,
      driver_id: driverId,
      detection_payload: {
        rule: 'continuous_driving_limit',
        current: budget.continuousDriving,
        limit: 4.5 * 3600,
        remaining_sec: budget.breakDueIn
      }
    });
  }
  
  // Daily driving limit
  if (budget.dailyRemaining < 30 * 60) {
    await logExceptionEvent({
      exception_type: 'rest_violation',
      severity: 'high',
      tour_id: tourId,
      driver_id: driverId,
      detection_payload: {
        rule: 'daily_driving_limit',
        current: 9 * 3600 - budget.dailyRemaining,
        limit: 9 * 3600
      }
    });
  }
}
```

---

## 5. Cross-country toll matrix (FN-13) — yeni

```typescript
async function computeMultiCountryTollMatrix(route, vehicleProfile, dateRange) {
  const polyline = route.polyline;  // HERE returned geometry
  
  // Country detection — PostGIS country polygons (Natural Earth dataset)
  const countrySegments = await detectCountrySegments(polyline);
  
  const tollMatrix = {
    nl_eur: 0,
    be_eur: 0,
    de_eur: 0,
    fr_eur: 0,
    breakdown: []
  };
  
  for (const segment of countrySegments) {
    switch (segment.country) {
      case 'NL':
        // FEAT-008 mevcut Vrachtwagenheffing pipeline
        const nlToll = await computeNlVrachtwagenheffing(
          segment, vehicleProfile, dateRange);
        tollMatrix.nl_eur += nlToll.amount;
        tollMatrix.breakdown.push({country: 'NL', km: segment.km, eur: nlToll.amount});
        break;
        
      case 'BE':
        // Belgium Viapass — Satellite Telpost
        const beToll = await computeBeViapass(
          segment, vehicleProfile.weight_class, vehicleProfile.emission_class);
        tollMatrix.be_eur += beToll.amount;
        tollMatrix.breakdown.push({country: 'BE', km: segment.km, eur: beToll.amount});
        break;
        
      case 'DE':
        // Germany Maut — Toll Collect
        const deToll = await computeDeMaut(
          segment, vehicleProfile.weight_class, vehicleProfile.emission_class);
        tollMatrix.de_eur += deToll.amount;
        tollMatrix.breakdown.push({country: 'DE', km: segment.km, eur: deToll.amount});
        break;
        
      case 'FR':
        // France péage — fixed-rate per autoroute
        const frToll = await computeFrPeage(
          segment, vehicleProfile.weight_class);
        tollMatrix.fr_eur += frToll.amount;
        tollMatrix.breakdown.push({country: 'FR', km: segment.km, eur: frToll.amount});
        break;
    }
  }
  
  return tollMatrix;
}
```

**Schema gerek:** `enterprise.cross_border_toll_tariffs` yeni tablo (Phase 2):

```sql
CREATE TABLE enterprise.cross_border_toll_tariffs (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code         CHAR(2) NOT NULL CHECK (country_code IN ('BE', 'DE', 'FR')),
    weight_class         TEXT NOT NULL,  -- '12t_18t' vb.
    emission_class       TEXT NOT NULL,  -- 'euro6' vb.
    road_type            TEXT NOT NULL,  -- 'motorway', 'secondary'
    rate_eur_per_km      NUMERIC(8,4) NOT NULL,
    effective_from       DATE NOT NULL,
    effective_until      DATE,
    source_url           TEXT,
    UNIQUE (country_code, weight_class, emission_class, road_type, effective_from)
);
```

**ADR-0007 §3.2 paterniyle:** BE Viapass + DE Maut + FR péage Phase 2 customer-funded API connectors. NL Vrachtwagenheffing (FEAT-008) zaten Phase 1.1'de.

---

## 6. DDD format parser detail (FN-15) — yeni

**DDD format = Digital Driver Card data** (EU Commission Regulation 581/2010 spec).

```typescript
async function parseDddTachographFile(fileBuffer) {
  // DDD = binary format, signed by digital tachograph
  // EU spec: Annex I, Appendix 1 (Data Dictionary)
  
  // Library tercihi:
  // - tachograph-data-format (npm) — open source DDD parser
  // - veya partner SDK (VDO, Stoneridge) — Phase 3+
  
  const parsed = await dddParser.parse(fileBuffer);
  
  return {
    driverId: parsed.driverIdentification.driverId,
    cardSerialNumber: parsed.driverIdentification.cardNumber,
    activities: parsed.driverActivityData.map(activity => ({
      timestamp: activity.activityChangeTime,
      type: mapActivityType(activity.activity),  // driving|rest|work|available
      vehicleVrn: activity.vehicleRegistration,
      odometer: activity.vehicleOdometer
    })),
    periodStart: parsed.cardDownloadFromTime,
    periodEnd: parsed.cardDownloadToTime,
    crcValid: verifyCrc(fileBuffer)  // signature check
  };
}

function mapActivityType(activity) {
  // EU 561/2006 4 activity type:
  // 0 = REST (kalın dinlenme)
  // 1 = AVAILABILITY (hazır bekleme)
  // 2 = WORK (sürüş dışı iş)
  // 3 = DRIVING (sürüş)
  switch (activity) {
    case 0: return 'rest';
    case 1: return 'available';
    case 2: return 'work';
    case 3: return 'driving';
    default: throw new Error(`Unknown DDD activity: ${activity}`);
  }
}
```

**UNCERTAINTIES #1 (DDD parsing):** Backend direct parsing (FN-15) vs aracı API (VDO/Stoneridge SDK)?
- **Karar:** **Backend direct (Phase 2 başlangıç)** — `tachograph-data-format` library (open source). Aracı SDK Phase 3+ customer-funded (büyük filo).

---

## 7. Driver preference scoring (FN-16) — yeni

```typescript
async function scoreDriverRestPreference(stop, driverId) {
  const driver = await getDriver(driverId);
  const prefs = driver.preferences || {};
  
  // public.drivers.preferences JSONB
  // Örnek: { "rest_type": "hotel"|"cabin", "security": "high"|"medium"|"low" }
  
  let score = 50;  // neutral
  
  // Rest type weight (40% weight)
  if (prefs.rest_type === 'hotel' && stop.type === 'hotel') {
    score += 25;
  } else if (prefs.rest_type === 'cabin' && 
             ['truck_parking', 'secured_parking'].includes(stop.type)) {
    score += 20;
  } else if (prefs.rest_type === 'hotel' && stop.type === 'truck_parking') {
    score -= 15;  // mismatch
  }
  
  // Security level weight (30% weight)
  if (prefs.security === 'high' && stop.type === 'secured_parking') {
    score += 20;
  } else if (prefs.security === 'high' && stop.type === 'truck_parking') {
    score -= 10;
  }
  
  // Amenities (20% weight)
  const wantedAmenities = prefs.amenities || [];
  const matchingAmenities = (stop.amenities || []).filter(a => wantedAmenities.includes(a));
  score += matchingAmenities.length * 3;
  
  // Distance penalty (10% weight) — too far from optimal route
  if (stop.detour_km > 10) {
    score -= Math.min(stop.detour_km, 30);
  }
  
  return Math.max(0, Math.min(100, score));
}
```

**ADR-0010 §3.4 paterni:** Weighted sum, no learning. Weights dispatcher-configurable Phase 2.5+.

---

## 8. Database schema (Phase 2 additive)

### 8.1 `enterprise.long_haul_tours` — yeni tablo

```sql
CREATE TABLE enterprise.long_haul_tours (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id               UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    driver_id                UUID NOT NULL REFERENCES public.drivers(id),
    vehicle_id               UUID NOT NULL REFERENCES public.vehicles(id),
    
    -- Plan
    planned_start_at         TIMESTAMPTZ NOT NULL,
    planned_end_at           TIMESTAMPTZ NOT NULL,
    days_horizon             INTEGER NOT NULL,
    total_distance_km        NUMERIC(8,2),
    
    -- Cross-border breakdown
    countries_transit        TEXT[] NOT NULL DEFAULT '{NL}',  -- ['NL','BE','DE']
    toll_breakdown           JSONB,  -- FN-13 output snapshot
    
    -- Status
    status                   TEXT NOT NULL DEFAULT 'planned'
                             CHECK (status IN ('planned', 'active', 'completed', 'delayed', 'aborted')),
    
    -- Linkage
    dispatch_task_ids        UUID[],  -- linked tasks
    
    -- Audit
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at               TIMESTAMPTZ,
    completed_at             TIMESTAMPTZ,
    audit_trail              JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX idx_tours_company_status ON enterprise.long_haul_tours (company_id, status, planned_start_at DESC);
CREATE INDEX idx_tours_driver ON enterprise.long_haul_tours (driver_id, status);
```

### 8.2 `enterprise.overnight_stops` — yeni tablo

```sql
CREATE TABLE enterprise.overnight_stops (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tour_id                  UUID NOT NULL REFERENCES enterprise.long_haul_tours(id) ON DELETE CASCADE,
    geofence_id              UUID REFERENCES public.geofences(id),  -- linked truck_parking/secured/hotel
    
    -- Plan
    planned_arrival_at       TIMESTAMPTZ NOT NULL,
    planned_departure_at     TIMESTAMPTZ NOT NULL,
    rest_type                TEXT NOT NULL CHECK (rest_type IN ('daily', 'weekly', 'short_break')),
    stop_type                TEXT NOT NULL CHECK (stop_type IN (
                              'truck_parking', 'secured_parking', 'hotel',
                              'fuel_station', 'rest_area'
                             )),
    
    -- Actuals
    actual_arrival_at        TIMESTAMPTZ,
    actual_departure_at      TIMESTAMPTZ,
    
    -- Scoring (FN-16)
    preference_score         NUMERIC(5,2),  -- 0-100
    
    -- Metadata
    amenities                JSONB,  -- {shower, restaurant, wifi, fuel}
    
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_overnight_tour ON enterprise.overnight_stops (tour_id, planned_arrival_at);
```

### 8.3 `enterprise.tachograph_records` — yeni tablo (TimescaleDB)

```sql
CREATE TABLE enterprise.tachograph_records (
    id                       UUID DEFAULT gen_random_uuid(),
    driver_id                UUID NOT NULL REFERENCES public.drivers(id),
    company_id               UUID NOT NULL REFERENCES public.companies(id),  -- tenant guard
    
    recorded_at              TIMESTAMPTZ NOT NULL,
    activity_type            TEXT NOT NULL CHECK (activity_type IN 
                              ('driving', 'rest', 'work', 'available')),
    
    -- Vehicle context
    vehicle_vrn              TEXT,
    odometer_km              INTEGER,
    
    -- Computed (FN-02 budget engine)
    cumulative_daily_driving_sec  INTEGER,
    cumulative_weekly_driving_sec INTEGER,
    
    -- Source
    source                   TEXT NOT NULL CHECK (source IN ('ddd_import', 'mqtt_inferred', 'manual')),
    ddd_file_ref             TEXT,  -- referans original DDD file (audit)
    
    received_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, recorded_at)
);

-- TimescaleDB hypertable (FEAT-007 behavior_events paterni)
SELECT create_hypertable('enterprise.tachograph_records', 'recorded_at',
                         chunk_time_interval => INTERVAL '7 days');

SELECT add_retention_policy('enterprise.tachograph_records', INTERVAL '2 years');
-- 2 yıl audit (EU regulation legal requirement)

CREATE INDEX idx_tacho_driver_time ON enterprise.tachograph_records 
  (driver_id, recorded_at DESC);
```

**Retention 2 yıl:** EU Regulation 165/2014 — tachograph data en az 1 yıl saklanmalı, NL üzerine 2 yıl norm.

### 8.4 `enterprise.cross_border_toll_tariffs` — yeni tablo (Phase 2)

§5'te belirtildi — country_code + weight_class + emission_class + road_type composite key.

### 8.5 `public.geofences.location_type` enum extension

```sql
-- FEAT-017'de eklenenler: customer_site, locker, pudo_point, parcel_shop, return_point
-- FEAT-019 eklenenler:
ALTER TABLE public.geofences
  DROP CONSTRAINT IF EXISTS geofences_location_type_check,
  ADD CONSTRAINT geofences_location_type_check 
  CHECK (location_type IN (
    'customer_site',
    'locker', 'pudo_point', 'parcel_shop', 'return_point',  -- FEAT-017
    'truck_parking', 'secured_parking', 'hotel',             -- FEAT-019 YENİ
    'fuel_station', 'rest_area', 'border_crossing'           -- FEAT-019 YENİ
  ));
```

**Cross-spec sync TODO:** FEAT-017 spec'inde location_type enum'a 6 yeni değer eklenmeli.

### 8.6 `public.drivers.preferences` — JSONB additive

```sql
ALTER TABLE public.drivers
  ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;
```

```jsonc
{
  "rest_type": "hotel",  // veya 'cabin'
  "security": "high",     // 'high', 'medium', 'low'
  "amenities": ["shower", "restaurant"],
  "preferred_chains": ["Truck-Inn"]
}
```

### 8.7 `public.companies.settings.long_haul_policy` — JSONB additive

```jsonc
{
  ...
  "long_haul_policy": {
    "max_driving_per_day_sec": 32400,        // 9 hours default
    "mandatory_daily_rest_sec": 39600,       // 11 hours
    "continuous_driving_limit_sec": 16200,   // 4.5 hours
    "min_break_sec": 2700,                   // 45 minutes
    "preferred_parking_types": ["secured_parking", "hotel"],
    "extended_day_per_week_max": 2,          // 10h instead of 9h
    "reduced_rest_per_week_max": 3,          // 9h instead of 11h
    "tachograph_import_required": true,
    "alert_buffer_sec": 1800                 // 30dk warning before limit
  }
}
```

---

## 9. UNCERTAINTIES (Cem onayı bekleyen)

### NotebookLM'in tespit ettikleri

1. **Takograf dosya formatı:** Backend direct mı yoksa aracı API mı?
   - **Karar (konsolidasyonda):** **Backend direct (Phase 2 başlangıç)** — `tachograph-data-format` open source library. Aracı SDK (VDO, Stoneridge) Phase 3+ customer-funded.

2. **Güvenli park rezervasyonu:** Real-time availability?
   - **Karar:** **Phase 3+** — Phase 2 statik geofence + Cron polling (NotebookLM önerisi). HERE secure parking suggestions baseline + manual dispatcher override.

3. **Ülkeler arası geçiş cezaları:** BE Viapass + DE Maut + FR péage hesap?
   - **Karar (konsolidasyonda):** **FN-13 computeMultiCountryTollMatrix** ile çözüldü. NL Vrachtwagenheffing (FEAT-008) paterniyle 3 ek ülke. Phase 2 customer-funded API connectors.

4. **Sürücü tercihleri:** Hotel vs cabin VRP weight?
   - **Karar (konsolidasyonda):** **FN-16 scoreDriverRestPreference** ile çözüldü. Weighted sum (ADR-0010 §3.4 paterni). `public.drivers.preferences` JSONB schema.

### Konsolidasyonda eklenenler

5. **EU 561/2006 hesaplama motoru ADR-belirsiz:** Bu motor TulipFleet'in kendi implementasyonu mu yoksa external library mı?
   - **Karar:** **TulipFleet kendi implementasyonu** (FN-02). EU regulation public domain, library bağımlılığı gereksiz. ML değil — rule-based time arithmetic.

6. **Tachograph import frequency:** Driver kart end-of-day mi yoksa real-time mı?
   - **Karar:** **End-of-day** (driver shift bitiminde manual upload). Real-time tachograph data MQTT üzerinden FEAT-007 behavior events ile **iddialaştırılmalı mı?** Tartışma noktası — Phase 2.5+ değerlendirme.

7. **Cross-border emission zone integration:** ADR-0012 NL-specific, çoklu ülke için extension?
   - **Karar:** **Phase 2.5+** — ADR-0012 metodolojisi diğer ülkelere extend edilebilir ama her ülke kendi compliance kurallarına sahip. Customer-funded trigger ile genişletilir (örn. BE LEZ Brussel Zone).

8. **Real-time vs end-of-day rest violation:** Driver hala yolda ama limit aşıldı — ne yapılır?
   - **Karar:** **FEAT-010 exception event** (FN-07) + dispatcher Mode 1 Advisory bildirimi. Mode 2 auto-stop YOK — driver guvenliği için sürüş aniden kesilemez (rest area'ya en yakın güvenli yere yönlendirme manuel).

9. **DDD signature verification:** CRC failure varsa ne yapılır?
   - **Karar:** **Strict** — invalid signature DDD reject (potential tampering). FEAT-010 exception event severity=high. Dispatcher driver ile temas.

10. **Multi-day tour cancellation:** Driver hastalandı, mid-tour iptal — re-plan?
    - **Karar:** **Manuel dispatcher** — Phase 2'de otomatik re-plan complex. Tour status='aborted', remaining tasks re-planning kuyruğuna.

---

## 10. Shared infrastructure with previous FEAT'leri

| FEAT-019 fonksiyon | Shared with | Paylaşım türü |
|---|---|---|
| FN-01 createLongHaulTour | **FEAT-003** | Order ingestion pattern |
| FN-03 findOvernightStops | **FEAT-017:FN-01** findNearbyLockers | PostGIS ST_DWithin pattern |
| FN-04 buildHereLongHaulProblem | **FEAT-001:FN-016** | **Cross-spec sync** — `daysHorizon?` + `driverRules?` imza evrimi |
| FN-07 monitorActiveDriverHours | **FEAT-010:FN-06** | Exception event writer (`rest_violation`) |
| FN-08 generateLongHaulReport | **FEAT-008, FEAT-009** | Toll + carbon baseline reuse |
| FN-11 `<RestStopMap />` | **FEAT-005:FN-06** + **FEAT-017:FN-09** | Leaflet map widget pattern |
| FN-12 evaluateBorderCrossingCompliance | **FEAT-001:FN-012** | Compliance check pattern |
| FN-13 computeMultiCountryTollMatrix | **FEAT-008:FN-05** MatrixCache | Cross-border extension |
| FN-16 scoreDriverRestPreference | **FEAT-014:FN-05** + **FEAT-015:FN-04** | Weighted sum pattern |

**Cross-spec sync TODO (yeni biriken):**

| Spec | Değişiklik |
|---|---|
| **FEAT-001** | FN-016 `buildHereProblem` imzasına `daysHorizon?` + `driverRules?` parametreler (FEAT-006+008+009 sync paterni devam) |
| **FEAT-010** | `exception_type` +2: `'rest_violation'` (FN-07), `'border_crossing_compliance_breach'` (FN-12) |
| **FEAT-017** | `public.geofences.location_type` enum +6: `'truck_parking'`, `'secured_parking'`, `'hotel'`, `'fuel_station'`, `'rest_area'`, `'border_crossing'` |

**Karar:** Cross-spec sync biriken **toplam 5** (F015'in 2'si + F019'un 3'ü):
- FEAT-010 +4 enum (`invoice_discrepancy`, `invoice_audit_deadline_expired`, `rest_violation`, `border_crossing_compliance_breach`)
- FEAT-010 §4 Severity matrix +4 entry
- FEAT-001 FN-016 imza evrimi (`daysHorizon?`, `driverRules?`)
- FEAT-017 location_type enum +6 değer

**FEAT-103 + FEAT-106 sonrası toplu sync** — son 2 pilot bittikten sonra (3 ek pilot olmuş olur F015 sonrası, mini-sync hata riskini azaltır).

---

## 11. Pilot süreç notları

### 11.1 Pilot akışı (2026-05-30)

Tek prompt + 0 follow-up. Kısaltılmış prompt (~1800 karakter). Konsolidasyonda 4 yeni fonksiyon eklendi (cross-border toll matrix, driver hours endpoint, DDD parser, preference scoring).

### 11.2 Alıntı doğrulama — F15 toparlama KALICI doğrulandı

| # | NotebookLM | Gerçek | Durum |
|---|---|---|---|
| FN-01..FN-12 12 alıntı | ✅ Hepsi doğru | — | ✅ |
| **FN-05 ADR-0005 §2** | ✅ Mode 1 Advisory tanımı | — | ✅ |
| **FN-10 ADR-0005 §4.1** | ✅ "reorder visits in the timeline" — User flow §4.1 doğru | — | ✅ |
| FN-04 ADR-0002 §3.2 | ✅ Birebir | — | ✅ |
| FN-12 ADR-0012 §4 | ✅ Doğru | — | ✅ |

**§number fabrikasyon: 0** ✅ (7 pilot zinciri: F8-F10-F17-F14-F18-F15-F19)
**Section misattribution: 0** ✅ **KALICI TOPARLAMA** (F15+F19 üst üste, F18 sonrası guard rail etkili)
**Toplam alıntı düzeltmesi: 0**

### 11.3 Section misattribution analizi — KALICI hale geldi

| Pilot | Sonuç | Hipotez |
|---|---|---|
| F14 | Hata | Yeni hata sınıfı |
| F18 | Hata (tekrar) | Belki kalıcı? |
| **F15** | **Düzeldi** | F18 sonrası guard rail etkili oldu |
| **F19** | **Düzeldi (TEKRARLI)** | Toparlama KALICI |

**Sonuç:** F18 sonrası prompt'a eklenen *"ADR-0005 §2 = Mode 1 Advisory, §4.1 = User flow"* açık ayrım **F15+F19 zincirinde başarılı**. Section misattribution F14+F18'in özel koşullarıydı (yeni paradigma stress), **kalıcı pattern değildi**. Guard rail prompt'ta korumaya devam.

### 11.4 15 pilot karşılaştırma

| Boyut | F8 | F9 | F10 | F17 | F14 | F18 | F15 | **F19** |
|---|---|---|---|---|---|---|---|---|
| Skor | 9.5 | 8.5 | 9 | 8.5 | 8.5 | 8.5 | 9 | **9** |
| İterasyon | 1 | 1 | 1 | 1+1 | 1 | 1 | 1 | **1** |
| Fonksiyon (final) | 9 | 7 | 15 | 13 | 16 | 15 | 16 | **16** |
| Alıntı hatası | 1 | 2 | 1 | 1 | 1 | 1 | 0 | **0** |
| §number fab | 0 | 1 | 0 | 0 | 0 | 0 | 0 | **0** ✅ |
| Section misattribution | 0 | 0 | 0 | 0 | 1 | 1 | 0 | **0** ✅ |
| Yeni paradigma | Toll | Carbon | Orch | Geo ext | Ext eco | Multi-flow | Financial | **Multi-day VRP** |

**F19 zirve katmanında (9/10):** F1, F2, F3, F4, F8, F10, F15, **F19** — 8 zirve pilot. 

---

## 12. Next steps

### 12.1 Cross-spec sync TODO (biriktir, 5 total)

| Spec | Değişiklik | Source |
|---|---|---|
| FEAT-010 | `exception_type` +`invoice_discrepancy` | FEAT-015 |
| FEAT-010 | `exception_type` +`invoice_audit_deadline_expired` | FEAT-015 |
| FEAT-010 | `exception_type` +`rest_violation` | FEAT-019:FN-07 |
| FEAT-010 | `exception_type` +`border_crossing_compliance_breach` | FEAT-019:FN-12 |
| FEAT-001 | FN-016 imza `daysHorizon?` + `driverRules?` | FEAT-019:FN-04 |
| FEAT-017 | `location_type` enum +6 | FEAT-019 §8.5 |

**Karar:** FEAT-103 + FEAT-106 sonrası **mini-sync commit**. Önceki sync taze (sabah 2026-05-30 commit).

### 12.2 Phase 2 implementation backlog (customer-funded trigger)

- [ ] Schema migration: `enterprise.long_haul_tours`, `overnight_stops`, `tachograph_records` (3 yeni tablo)
- [ ] Schema migration: `enterprise.cross_border_toll_tariffs`
- [ ] Schema migration: `public.geofences.location_type` enum genişletme (FEAT-017 cross-spec sync)
- [ ] Schema migration: `public.drivers.preferences` JSONB
- [ ] Schema migration: `public.companies.settings.long_haul_policy` JSONB
- [ ] FN-01..FN-16 implementation (16 fonksiyon)
- [ ] DDD parser library entegrasyonu (`tachograph-data-format` npm)
- [ ] BE Viapass + DE Maut + FR péage API connectors (customer-funded per ADR-0007)
- [ ] FEAT-010 cross-spec sync (2 yeni exception type)
- [ ] FEAT-001 cross-spec sync (FN-016 imza)
- [ ] FEAT-017 cross-spec sync (location_type enum)

### 12.3 Customer trigger conditions

Phase 2 customer-funded trigger için minimum kriterler:
- Customer multi-country operasyon (NL → BE/DE/FR transit)
- Customer ≥3 long-haul vehicle (>40t)
- Customer EU 561/2006 compliance enforcement gerek
- Customer tachograph data import workflow var

### 12.4 Sıradaki pilot

**FEAT-103 W16 EV Range Planning** — Cem'in 7 pilot listesinde 6. sırada.

Yeni paradigma: EV range constraint, charging station integration, battery state-of-charge tracking, HERE EV routing.

---

## 13. References

- ADR-0001 §3.6 (UI primitives)
- **ADR-0002 §3.2** (HERE native driver shift rules + mixed pickup/delivery), §3.4 (soft constraint toll extension)
- ADR-0004 v3 §6 (additive schema)
- **ADR-0005 §2** (Mode 1 Advisory — "The dispatcher approves every action before it takes effect."), §4.1 (User flow — "reorder visits in the timeline"), §5.3 (Auto-dispatch loop)
- ADR-0006 §3.1 (Map inspection-oriented)
- ADR-0007 §3.2 (Third-party API consumer pattern)
- ADR-0009 §4.4 (dispatcher → driver task flow)
- **ADR-0010 §3.4** (weighted sum, no learning), §4 (LLM/ML API consumer — HERE), §3.5 (driver fatigue Phase 3 candidate)
- ADR-0011 §6 (Phase 2 customer-funded triggers), §9.5 (endpoint patterns)
- ADR-0012 §4 (zone breach prediction — NL compliance, multi-country extension Phase 2.5+), §4.7 (PostGIS Phase 3)
- FEAT-001 spec v3 (FN-016 buildHereProblem — cross-spec sync `daysHorizon?` + `driverRules?` evrim)
- FEAT-003 spec (order ingestion)
- FEAT-005 spec v2 (FN-06 map widget pattern)
- FEAT-008 spec (Vrachtwagenheffing — cross-border extension paterni)
- FEAT-009 spec (carbon baseline reuse)
- FEAT-010 spec (FN-06 logExceptionEvent — cross-spec sync 2 yeni enum biriken)
- FEAT-014 spec (FN-05 weighted sum scoring)
- FEAT-015 spec (FN-04 weighted sum reconciliation)
- FEAT-017 spec (FN-01 PostGIS pattern, FN-09 map widget, **location_type enum extension cross-spec sync**)
- EU Regulation 561/2006 (driver hours public domain)
- EU Regulation 165/2014 (tachograph data retention 1+ year)
- EU Commission Regulation 581/2010 (DDD format spec)
- NotebookLM session 2026-05-30 (1 prompt, 9/10 skor — F15+F19 zirve zinciri)

---

## 14. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-30 | Cem Bakir (with Claude + NotebookLM cowork) | İlk konsolide function spec. On beşinci pilot — multi-day long-haul planning, wishlist W19 (Niche, yüksek expertise). Phase 2 customer-funded (Yorum B). 16 fonksiyon (FN-01..FN-16), NotebookLM 12 önerdi + konsolidasyonda 4 ek (FN-13 cross-border toll matrix, FN-14 driver hours endpoint, FN-15 DDD parser detay, FN-16 driver preference scoring). **Yeni paradigma: Multi-day VRP + EU regulatory compliance** — HERE Tour Planning multi-period extension, EU 561/2006 driver hours rule-based engine, cross-border toll (NL Vrachtwagenheffing + BE Viapass + DE Maut + FR péage), tachograph DDD ingestion, overnight stop selection. 4 yeni tablo (long_haul_tours, overnight_stops, tachograph_records TimescaleDB, cross_border_toll_tariffs). public.geofences.location_type enum +6 değer (FEAT-017 cross-spec sync gerek). FEAT-001:FN-016 imza evrimi `daysHorizon?` + `driverRules?` (FEAT-006+008+009 cross-spec sync paterni devam). ML disipline kusursuz — EU 561/2006 rule-based, HERE multi-day native consumer, driver fatigue prediction Phase 3+. Section misattribution = 0 ✅ KALICI TOPARLAMA (F15+F19 üst üste başarılı, F14+F18'in özel koşullarıydı, kalıcı pattern değildi). §number fabrikasyon = 0 ✅ (7 pilot zinciri: F8-F10-F17-F14-F18-F15-F19). Alıntı hatası = 0 ✅ (F15 + F19 zincirinde mükemmel). Cross-spec sync TODO: FEAT-010 +2 enum (`rest_violation`, `border_crossing_compliance_breach`), FEAT-001 FN-016 imza, FEAT-017 location_type +6. F103 + F106 sonrası mini-sync commit. F19 zirve katmanında (9/10) — 8 zirve pilot toplam. |
