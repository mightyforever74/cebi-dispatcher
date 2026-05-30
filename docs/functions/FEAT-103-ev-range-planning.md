# FEAT-103 — Electric Vehicle (EV) Range Planning

| Field | Value |
|---|---|
| **Feature ID** | FEAT-103 |
| **Source** | Wishlist W16 — "Electric Vehicle (EV) Range Planning" |
| **Frequency rating** | Common |
| **Tulipfleet Phase** | Phase 2 (customer-funded trigger per ADR-0011 §6 — EV customer signal) |
| **Spec readiness** | Yorum B kararı, 2026-05-30 — Phase 2 etiketi korunur, spec şimdi yazılır |
| **Status** | Function spec drafted via NotebookLM (1 prompt, 2026-05-30) |
| **Pilot note** | On altıncı pilot. **9/10** skor (zirve zinciri F15+F19+F103). **§number fabrikasyon = 0** ✅ (8 pilot zinciri: F8-F10-F17-F14-F18-F15-F19-F103). **Section misattribution = 0** ✅ **KALICI TOPARLAMA** (F15+F19+F103 üst üste, 3 başarı). Yeni paradigma: **EV-specific routing constraints** — battery SoC + charging + HERE consumptionModel consumer. |

---

## 1. Feature description

### 1.1 Wishlist tanımı

> *"Software incorporates state-of-charge tracking, charging station availability, and range calculations into route optimization."*

### 1.2 Yeni paradigma — EV-specific Constraints

Önceki 15 FEAT ICE (Diesel) odaklıydı. FEAT-103 elektrikli araç vertikalini ekliyor:

| Boyut | ICE FEAT'ler | **FEAT-103 EV** |
|---|---|---|
| Range constraint | Yakıt deposu (manuel) | **Battery SoC + consumptionModel** |
| Refueling | Fuel station (kısa) | **Charging session** (15dk-8h) |
| Cost | Diesel EUR/liter | **kWh EUR + time-of-use tariff** |
| Toll | NL Vrachtwagenheffing tam | **Muafiyet potansiyeli (zero-emission)** |
| Emission | FEAT-009 CO2 tracking | **Zero direct + well-to-wheel** |

### 1.3 HERE EV routing consumer

FEAT-103 **HERE'nin ML-powered consumptionModel** parametresini consume eder (ADR-0010 §4 — *"Using ML-powered APIs ... Allowed and encouraged"*). TulipFleet **kendi ML modelini eğitmez** — battery degradation Phase 3+ candidate (ADR-0010 §3.5).

### 1.4 FEAT-001 cross-spec sync — FN-016 5. parametre

FEAT-001:FN-016 `buildHereProblem` imza evrimi devam ediyor (FEAT-006 + 008 + 009 + 019 paterni):

```typescript
buildHereProblem(
  tasks,
  vehicles,
  appointments?,           // FEAT-006
  tollCostMatrix?,         // FEAT-008
  routingMode?,            // FEAT-009
  daysHorizon?,            // FEAT-019
  driverRules?,            // FEAT-019
  evMode?                  // FEAT-103 YENİ — EV-specific routing
)
```

`evMode?` parametre içeriği:
```typescript
evMode?: {
  enabled: boolean,
  consumptionModel: {                    // HERE-specific
    ascent: number,                      // Wh/m elevation gain
    descent: number,                     // Wh/m recovery
    freeFlowSpeedTable: {speed_kmh: number, energy_wh_km: number}[],
    auxiliaryConsumption: number,        // Wh/h (heating, AC)
  },
  initialSoc: number,                    // %
  minSoc: number,                        // % (range anxiety buffer)
  chargingStations: Geofence[],          // available stops
  preferredConnectorTypes: string[]      // ['CCS2', 'CHAdeMO']
}
```

### 1.5 ML disipline kritik nüans

| Konu | Karar |
|---|---|
| Range estimation | ✅ HERE consumptionModel consumer (no learning) |
| Charging station selection | ✅ PostGIS + weighted scoring (geometric) |
| Battery degradation prediction | ❌ Phase 3+ candidate (ADR-0010 §3.5) |
| Charging behavior learning | ❌ Phase 3+ |
| Charging price forecasting | ❌ Phase 3+ |
| Range anxiety buffer | ✅ Rule-based threshold (%20 default) |

### 1.6 Kapsam — içeride (Phase 2)

- HERE EV routing mode consumer (consumptionModel parameter)
- Battery SoC MQTT subscriber (EV manufacturer API priority, OBD-II fallback)
- Charging station selection (PostGIS + real-time availability via OCPI)
- Charging session planning (DC fast vs AC)
- Energy cost calculation (time-of-use grid tariff)
- Range anxiety buffer policy (per-company configurable %)
- Vrachtwagenheffing EV muafiyet handling (cross-spec FEAT-008)
- EV-specific KPI (kWh/km, charging sessions, energy cost EUR)
- Geofence type `'charging_station'` (FEAT-017 cross-spec sync)

### 1.7 Kapsam — dışarıda

- **Battery degradation ML prediction** — Phase 3+ (ADR-0010 §3.5)
- **Charging behavior learning** — Phase 3+
- **V2G (vehicle-to-grid)** — Phase 3+ separate ADR
- **Battery health diagnostics** — vehicle manufacturer SDK Phase 3+
- **Hydrogen fuel cell vehicles** — separate feature (Phase 3+)
- **Dynamic wholesale energy pricing** — EPEX SPOT integration Phase 3+
- **EV-specific compliance certification** (e.g. battery passport) — Phase 3+

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Phase | Shared with FEAT-001..19 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FEAT-103-FN-01 | worker | `trackVehicleSoC` | MQTT_Payload | void | — | public.vehicles (current_soc_percent) | EMQX | ADR-0009 §4.2 — "Existing `fleet/device/+/*` topics are read by both backends; dispatcher backend subscribes read-only." | 2 | **FEAT-005:FN-02** MQTT subscriber pattern |
| 2 | FEAT-103-FN-02 | backend | `estimateRemainingRange` | vehicleId, route | range_km | public.vehicles | — | HERE Routing | ADR-0010 §4 — "Using ML-powered APIs (HERE, future map providers, future translation/NLP APIs). Allowed and encouraged." | 2 | **FEAT-005:FN-01** HERE consumer pattern |
| 3 | FEAT-103-FN-03 | backend | `findChargingStations` | location, radius, connectorTypes[] | Station[] | public.geofences | — | PostGIS | ADR-0012 §4.7 — "point-in-polygon native query Phase 3 scale için altyapı" | 2 | **FEAT-017:FN-01** findNearbyLockers pattern |
| 4 | FEAT-103-FN-04 | shared_library | `buildHereEvProblem` (extends FEAT-001:FN-016) | tasks, vehicles, **evMode** | HERE_JSON | — | — | HERE Tour Planning | ADR-0002 §3.2 — "HERE Tour Planning natively models constraints (vehicle height, cold chain, driver shift rules, mixed pickup/delivery, refueling stops)" | 2 | **FEAT-001:FN-016** buildHereProblem (cross-spec sync — `evMode?` imza evrimi) |
| 5 | FEAT-103-FN-05 | backend | `evaluateEvPolicy` | vehicleId, taskId | Decision | public.companies (settings) | — | — | ADR-0005 §7 — "Add policy module structure in the enterprise backend (`src/dispatch/policy.ts`) that reads the mode and currently always returns 'advisory'." | 2 | **FEAT-003:FN-08** policy module stub |
| 6 | FEAT-103-FN-06 | shared_library | `calculateEnergyCost` | kwh, timestamp, providerId | cost_eur | enterprise.energy_tariffs | — | — | ADR-0002 §3.4 — "Soft constraints (weighted in the objective function): ... Fuel + labor cost minimization." | 2 | **FEAT-008:FN-03** cost calculation pattern |
| 7 | FEAT-103-FN-07 | worker | `monitorRangeAnxiety` | vehicleId, currentSoC | Exception? | public.vehicles, public.companies | enterprise.exception_events | — | ADR-0005 §5.3 — "If rules trigger an exception, system marks the task `needs_dispatcher` and notifies the dispatcher." | 2 | **FEAT-010:FN-06** logExceptionEvent (new exception_type: `'range_anxiety_breach'`) |
| 8 | FEAT-103-FN-08 | backend | `ingestChargingSession` | sessionData | { sessionId, cost_eur } | enterprise.energy_tariffs | enterprise.charging_sessions | OCPI API | ADR-0007 §3.2 — "Every third-party telematics provider's API changes over time." | 2 | — |
| 9 | FEAT-103-FN-09 | frontend | `<EvRouteMap />` | route, stations | UI Component | — | — | Leaflet | ADR-0006 §3.1 — "Map interactions are inspection-oriented, not action-oriented." | 2 | **FEAT-005:FN-06** + **FEAT-017:FN-09** + **FEAT-019:FN-11** map widget pattern |
| 10 | FEAT-103-FN-10 | frontend | `<ChargingScheduleView />` | tourId | UI Component | enterprise.charging_sessions | — | — | ADR-0005 §4.1 — "Modify one or more assignments (drag-and-drop in the Kanban view; reorder visits in the timeline)." | 2 | **FEAT-019:FN-10** timeline view pattern |
| 11 | FEAT-103-FN-11 | backend | `getEvPowerConsumptionKPI` | vehicleId, period | KPI_JSON | enterprise.charging_sessions, public.vehicles | — | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 2 | **FEAT-009:FN-07** carbon KPI pattern |
| 12 | FEAT-103-FN-12 | shared_library | `getVrachtwagenheffingEvExemption` (**KONSOLIDASYONDA EKLENDİ**) | vehicleId, dateRange | { isExempt, exemptionType, fallbackRate? } | public.vehicles, enterprise.nl_vrachtwagenheffing_tariffs | — | — | ADR-belirsiz (EV zero-emission muafiyet pattern — UNCERTAINTIES #4) | 2 | **FEAT-008:FN-03** toll calculation (EV branch) |
| 13 | FEAT-103-FN-13 | shared_library | `getChargingStationAvailability` (**KONSOLIDASYONDA EKLENDİ**) | stationIds[], cacheTtl=300 | Availability[] | Redis | Redis | OCPI API (Hubject/Gireve) | ADR-0002 §5 — "MatrixCache — caches Distance Matrix responses (Redis, 24-hour TTL) to control per-request cost." (pattern reference) | 2 | **FEAT-017:FN-13** getCachedLockerAvailability pattern |
| 14 | FEAT-103-FN-14 | shared_library | `computeChargingSessionCost` (**KONSOLIDASYONDA EKLENDİ**) | session (start_soc, end_soc, kwh, started_at, finished_at, station_id) | cost_eur | enterprise.energy_tariffs | enterprise.charging_sessions (UPDATE cost_eur) | — | ADR-0002 §3.4 — "Soft constraints (weighted in the objective function): ... Fuel + labor cost minimization." | 2 | **FEAT-103:FN-06** calculateEnergyCost (time-of-use aware) |

**Konsolidasyon notları (NotebookLM çıktısına göre düzeltmeler):**

| # | NotebookLM dedi | Düzeltme |
|---|---|---|
| Alıntılar 1-11 | ✅ Hepsi doğru (FN-10 ADR-0005 §4.1 doğru section — F15+F19+F103 zinciri 0 hata) | — |
| **FN-12 Vrachtwagenheffing EV muafiyet** | UNCERTAINTIES #4'te kritik konu, fonksiyon yok | ✅ **EKLENDİ FN-12** `getVrachtwagenheffingEvExemption` — FEAT-008 EV branch handling |
| **FN-13 Charging availability real-time** | UNCERTAINTIES #2 OCPI integration, fonksiyon yok | ✅ **EKLENDİ FN-13** `getChargingStationAvailability` — Redis cache + OCPI API (FEAT-017:FN-13 paterni) |
| **FN-14 Charging session cost compute** | FN-06 tariff + FN-08 ingest var ama session cost compute timing belirsiz | ✅ **EKLENDİ FN-14** `computeChargingSessionCost` — session finish'inde charging_sessions UPDATE |

**Fonksiyon sayısı:** NotebookLM 11 → konsolidasyon **14** (3 yeni eklendi).

---

## 3. EV routing pipeline

```
1. Vehicle profile: fuel_type='electric'
        │
        ▼
2. trackVehicleSoC (FN-01) — MQTT subscriber
   - EV manufacturer API (Volvo, Mercedes e-Truck): 1-5dk gecikme
   - OBD-II fallback: real-time ama bazı PIDs eksik
   - public.vehicles.current_soc_percent UPDATE
        │
        ▼
3. estimateRemainingRange (FN-02) — HERE consumptionModel
   - Battery_capacity_kwh × current_soc_percent / consumption_kwh_per_100km
   - HERE elevation + speed table dahil
   - Auxiliary consumption (heating, AC) hesabı
        │
        ▼
4. findChargingStations (FN-03) — PostGIS query
   - location_type = 'charging_station'
   - Connector type filter (CCS2/CHAdeMO/Type2)
   - DC fast preference (per-company policy)
        │
        ▼
5. getChargingStationAvailability (FN-13) — real-time check
   - Redis cache (5dk TTL)
   - Cache miss → OCPI API (Hubject/Gireve roaming)
   - Occupied stations filtered out
        │
        ▼
6. evaluateEvPolicy (FN-05) — company policy check
   - range_anxiety_buffer_percent (default 20)
   - min_soc_at_destination (default 15)
   - prefer_fast_chargers flag
        │
        ▼
7. buildHereEvProblem (FN-04) — HERE submission
   - tasks + vehicles + evMode
   - consumptionModel (vehicle-specific)
   - initialSoc + minSoc
   - chargingStations as mandatory waypoints
        │
        ▼
8. HERE Tour Planning solver (native EV mode)
        │
        ▼
9. Validate (Mode 1 Advisory)
        │
        ▼
10. Tour active:
    - monitorRangeAnxiety (FN-07) — continuous SoC monitoring
    - SoC < min_soc threshold → FEAT-010 exception
    - Critical: SoC < emergency_reserve → critical exception
        │
        ▼
11. Charging session:
    - Driver charges at station (manual or auto-start CCS2)
    - OCPI session API → ingestChargingSession (FN-08)
    - On session finish: computeChargingSessionCost (FN-14)
    - charging_sessions.cost_eur UPDATE
    - public.vehicles.current_soc_percent UPDATE (final SoC)
        │
        ▼
12. KPI tracking:
    - getEvPowerConsumptionKPI (FN-11) — kWh/km, EUR/km, sessions count
    - FEAT-009 well-to-wheel emission (electricity grid mix factor)
    - FEAT-008 Vrachtwagenheffing EV muafiyet (FN-12)
```

---

## 4. Vrachtwagenheffing EV Exemption (FN-12) — yeni

### 4.1 NL EV muafiyet bağlamı

Hollanda Vrachtwagenheffing **2026 Temmuz** yürürlüğe girecek. Zero-emission heavy goods vehicles (HGV) için **özel tarife/muafiyet** beklenir (UNCERTAINTIES #4 — kesin oran NL government açıklamasından sonra netleşir).

```typescript
async function getVrachtwagenheffingEvExemption(vehicleId, dateRange) {
  const vehicle = await getVehicle(vehicleId);
  
  // Sadece EV (fuel_type='electric') değerlendirilir
  if (vehicle.fuel_type !== 'electric') {
    return { isExempt: false };
  }
  
  // Emission class check (zero_emission)
  if (vehicle.emission_class !== 'zero_emission') {
    // Hybrid değil, pure EV olmalı
    return { isExempt: false };
  }
  
  // NL Vrachtwagenheffing tariff lookup (effective date için)
  const tariff = await db.query(`
    SELECT * FROM enterprise.nl_vrachtwagenheffing_tariffs
    WHERE emission_class = 'zero_emission'
      AND $1 BETWEEN effective_from AND COALESCE(effective_until, '9999-12-31')
      AND vehicle_class = $2
    ORDER BY effective_from DESC
    LIMIT 1
  `, [dateRange.start, vehicle.vehicle_class]);
  
  if (tariff.length === 0) {
    // Henüz spec yok (NL government 2026 sonu açıklayacak)
    return { 
      isExempt: 'unknown', 
      exemptionType: 'pending_legislation',
      fallbackRate: 0,  // Phase 2 başlangıç: 0 EUR/km varsayım (audit log'da işaretle)
      note: 'NL zero-emission HGV tariff pending — using 0 EUR/km placeholder'
    };
  }
  
  if (tariff[0].rate_eur_per_km === 0) {
    return { 
      isExempt: true, 
      exemptionType: 'zero_emission_full_exemption' 
    };
  }
  
  return { 
    isExempt: false,  // EV ama reduced rate
    exemptionType: 'zero_emission_reduced_rate',
    fallbackRate: tariff[0].rate_eur_per_km
  };
}
```

### 4.2 Cross-spec sync — FEAT-008

FEAT-008 `enterprise.nl_vrachtwagenheffing_tariffs` schema'ya **`emission_class` column** zaten var (FEAT-008:FN-07 `getVehicleHgvProfile` ile uyumlu). Ek olarak:

- **CHECK constraint genişletilmeli**: `emission_class IN ('euro4', 'euro5', 'euro6', 'zero_emission')`
- **Phase 2 trigger:** EV customer geldiğinde `'zero_emission'` rows seed edilir (NL government tariff yayınladıktan sonra)

---

## 5. Charging station real-time availability (FN-13) — yeni

```typescript
async function getChargingStationAvailability(stationIds, cacheTtl = 300) {
  const result = [];
  const cacheMisses = [];
  
  // Layer 1: Redis cache check (5dk TTL default)
  for (const stationId of stationIds) {
    const cacheKey = `enterprise:charging_availability:${stationId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      result.push({
        stationId,
        ...JSON.parse(cached),
        source: 'cache'
      });
    } else {
      cacheMisses.push(stationId);
    }
  }
  
  // Layer 2: OCPI API call for cache misses
  if (cacheMisses.length > 0) {
    // Hubject roaming network (Phase 2 customer-funded connector)
    const ocpiResponse = await ocpiClient.locations.statuses(cacheMisses);
    
    for (const station of ocpiResponse) {
      const availability = {
        stationId: station.id,
        availableConnectors: station.connectors.filter(c => c.status === 'AVAILABLE').length,
        totalConnectors: station.connectors.length,
        connectorDetails: station.connectors.map(c => ({
          type: c.standard,  // 'CCS2', 'CHAdeMO', 'Type2'
          power_kw: c.power_kw,
          status: c.status
        })),
        lastUpdated: new Date().toISOString()
      };
      
      // Cache write (5dk TTL)
      await redis.setex(
        `enterprise:charging_availability:${station.id}`,
        cacheTtl,
        JSON.stringify(availability)
      );
      
      result.push({ ...availability, source: 'ocpi' });
    }
  }
  
  return result;
}
```

**FEAT-017:FN-13 paterni:** `getCachedLockerAvailability` ile aynı disipline. Cost (OCPI API çağrısı) + latency control.

**OCPI provider seçimi (UNCERTAINTIES #2):**
- **Hubject** — Europe'ta en geniş roaming network (CPO ↔ EMP)
- **Gireve** — Fransa odaklı ama EU kapsamı var
- **Karar Phase 2 başlangıç:** Hubject birincil, Gireve fallback. Customer-funded trigger ile seçim.

---

## 6. Charging session cost compute (FN-14) — yeni

```typescript
async function computeChargingSessionCost(session) {
  const {
    start_soc, end_soc, kwh, started_at, finished_at, station_id, vehicle_id
  } = session;
  
  // 1. Tariff lookup — station country + provider
  const station = await getGeofence(station_id);
  const tariff = await getActiveEnergyTariff(
    station.country_code,
    station.partner_provider  // örn. 'ionity', 'allego'
  );
  
  if (!tariff) {
    return { cost_eur: null, warning: 'tariff_not_found' };
  }
  
  // 2. Time-of-use calculation (NL Daltarief / Normaal tarief)
  let totalCost = 0;
  const startHour = new Date(started_at).getUTCHours();
  const finishHour = new Date(finished_at).getUTCHours();
  
  // Simplification: average over session window
  // Phase 2.5+ minute-level granularity
  const isPeakSession = (startHour >= 7 && startHour < 23) || 
                         (finishHour >= 7 && finishHour < 23);
  
  const ratePerKwh = isPeakSession 
    ? tariff.peak_price_per_kwh 
    : tariff.off_peak_price_per_kwh;
  
  totalCost = kwh * ratePerKwh;
  
  // 3. Connection fee (some providers)
  if (tariff.connection_fee_eur) {
    totalCost += tariff.connection_fee_eur;
  }
  
  // 4. Tax (BTW — NL %21 default)
  if (tariff.tax_inclusive === false) {
    totalCost *= (1 + tariff.vat_percent / 100);
  }
  
  // 5. Update charging_sessions row
  await db.query(`
    UPDATE enterprise.charging_sessions
    SET cost_eur = $1,
        cost_breakdown = $2
    WHERE id = $3
  `, [
    totalCost,
    JSON.stringify({
      rate_per_kwh: ratePerKwh,
      kwh,
      is_peak: isPeakSession,
      connection_fee: tariff.connection_fee_eur || 0,
      vat_percent: tariff.vat_percent
    }),
    session.id
  ]);
  
  return { cost_eur: totalCost };
}
```

**Timing:** Session `finished_at` event'inde tetiklenir (FN-08 ingestChargingSession callback'i veya cron sweep).

---

## 7. Database schema (Phase 2 additive)

### 7.1 `public.vehicles` — EV extension (additive)

```sql
ALTER TABLE public.vehicles
  ADD COLUMN battery_capacity_kwh         NUMERIC(6,2),
  ADD COLUMN current_soc_percent          NUMERIC(5,2),
  ADD COLUMN consumption_kwh_per_100km    NUMERIC(5,2),
  ADD COLUMN charging_connector_type      TEXT  -- 'CCS2', 'CHAdeMO', 'Type2'
                                          CHECK (charging_connector_type IS NULL 
                                                 OR charging_connector_type IN ('CCS2','CHAdeMO','Type2','GBT'));

-- Mevcut fuel_type kolonu var — emission_class enum'a 'zero_emission' eklenmeli
-- (cross-spec FEAT-008)
ALTER TABLE public.vehicles
  DROP CONSTRAINT IF EXISTS vehicles_emission_class_check,
  ADD CONSTRAINT vehicles_emission_class_check
  CHECK (emission_class IS NULL OR emission_class IN 
    ('euro4', 'euro5', 'euro6', 'zero_emission'));
```

ADR-0004 v3 §6 additive pattern. EV olmayan vehicle'lar için kolonlar NULL kalır.

### 7.2 `enterprise.charging_sessions` — yeni tablo

```sql
CREATE TABLE enterprise.charging_sessions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    vehicle_id           UUID NOT NULL REFERENCES public.vehicles(id),
    geofence_id          UUID REFERENCES public.geofences(id),  -- charging_station
    
    -- Session details
    start_soc            NUMERIC(5,2) NOT NULL,
    end_soc              NUMERIC(5,2) NOT NULL,
    kwh_delivered        NUMERIC(8,2) NOT NULL,
    connector_type       TEXT CHECK (connector_type IN ('CCS2','CHAdeMO','Type2','GBT')),
    peak_power_kw        NUMERIC(6,2),
    
    -- Cost (FN-14 computed)
    cost_eur             NUMERIC(8,2),
    cost_breakdown       JSONB,  -- rate, tax, connection fee details
    
    -- OCPI session reference
    ocpi_session_id      TEXT,
    ocpi_provider        TEXT,
    
    -- Timing
    started_at           TIMESTAMPTZ NOT NULL,
    finished_at          TIMESTAMPTZ,
    duration_sec         INTEGER GENERATED ALWAYS AS 
                         (EXTRACT(EPOCH FROM (finished_at - started_at))::INTEGER) STORED,
    
    -- Audit
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata             JSONB
);

CREATE INDEX idx_charging_vehicle_time ON enterprise.charging_sessions 
  (vehicle_id, started_at DESC);
CREATE INDEX idx_charging_company_time ON enterprise.charging_sessions 
  (company_id, started_at DESC);
```

### 7.3 `enterprise.energy_tariffs` — yeni tablo

```sql
CREATE TABLE enterprise.energy_tariffs (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code             CHAR(2) NOT NULL,
    provider                 TEXT NOT NULL,  -- 'ionity', 'allego', 'shell_recharge', vb.
    
    -- Pricing (per kWh)
    peak_price_per_kwh       NUMERIC(6,4) NOT NULL,
    off_peak_price_per_kwh   NUMERIC(6,4) NOT NULL,
    currency                 CHAR(3) NOT NULL DEFAULT 'EUR',
    
    -- Optional fees
    connection_fee_eur       NUMERIC(6,2),
    
    -- Tax
    tax_inclusive            BOOLEAN NOT NULL DEFAULT false,
    vat_percent              NUMERIC(5,2) NOT NULL DEFAULT 21.0,  -- NL default
    
    -- Time windows (NL Daltarief example)
    peak_hours               INT4RANGE NOT NULL,  -- [7,23) UTC default
    weekend_off_peak         BOOLEAN NOT NULL DEFAULT true,
    
    -- Validity
    effective_from           DATE NOT NULL,
    effective_until          DATE,
    
    UNIQUE (country_code, provider, effective_from)
);

-- Seed: 'standard' / 'unknown' tariff fallback (Phase 2)
```

### 7.4 `public.geofences.location_type` enum extension

Cross-spec sync — FEAT-017 + FEAT-019 + FEAT-103 toplu güncelleme:

```sql
ALTER TABLE public.geofences
  DROP CONSTRAINT IF EXISTS geofences_location_type_check,
  ADD CONSTRAINT geofences_location_type_check 
  CHECK (location_type IN (
    'customer_site',                                          -- default
    'locker', 'pudo_point', 'parcel_shop', 'return_point',    -- FEAT-017
    'truck_parking', 'secured_parking', 'hotel',              -- FEAT-019
    'fuel_station', 'rest_area', 'border_crossing',           -- FEAT-019
    'charging_station'                                        -- FEAT-103 YENİ
  ));
```

### 7.5 `public.companies.settings.ev_policy` — JSONB additive

```jsonc
{
  ...
  "ev_policy": {
    "range_anxiety_buffer_percent": 20,
    "min_soc_at_destination": 15,
    "emergency_reserve_percent": 10,  // critical exception threshold
    "prefer_fast_chargers": true,
    "preferred_connector_types": ["CCS2"],
    "preferred_ocpi_providers": ["hubject", "gireve"],
    "max_detour_for_charging_km": 15,
    "charging_session_timeout_sec": 28800  // 8 hours
  }
}
```

### 7.6 `enterprise.nl_vrachtwagenheffing_tariffs` — emission_class enum extension

Cross-spec FEAT-008:

```sql
ALTER TABLE enterprise.nl_vrachtwagenheffing_tariffs
  DROP CONSTRAINT IF EXISTS nl_tariff_emission_class_check,
  ADD CONSTRAINT nl_tariff_emission_class_check 
  CHECK (emission_class IN ('euro4', 'euro5', 'euro6', 'zero_emission'));
```

**Phase 2 trigger:** NL government 2026 sonu zero-emission HGV tariff yayınlayınca seed (UNCERTAINTIES #4).

---

## 8. UNCERTAINTIES (Cem onayı bekleyen)

### NotebookLM'in tespit ettikleri

1. **SoC veri kaynağı:** EV manufacturer API (1-5dk gecikme) vs OBD-II (real-time, eksik PIDs)?
   - **Karar:** **Hibrit** — primer manufacturer API (resmi veri), fallback OBD-II. Driver mobile manual entry son çare. Per-company configurable (`ev_policy.preferred_soc_source`).

2. **OCPI entegrasyonu:** Hubject vs Gireve birincil?
   - **Karar (konsolidasyonda):** **Hubject birincil** (Europe geniş kapsam), Gireve fallback. FR ağırlıklı customer için Gireve birincil. Customer-funded trigger ile config.

3. **Şarj hızı tahmini:** Battery sıcaklığı + istasyon yüküne göre sapma?
   - **Karar:** **Phase 2 başlangıç deterministic** — HERE consumptionModel + manufacturer spec. Phase 3+ ML candidate (ADR-0010 §3.5).

4. **Vrachtwagenheffing EV muafiyet:**
   - **Karar (konsolidasyonda):** **FN-12 getVrachtwagenheffingEvExemption** ile çözüldü. NL government tariff yayınlayınca seed. Şu an placeholder 0 EUR/km + audit log warning.

### Konsolidasyonda eklenenler

5. **Battery degradation real-life tracking:**
   - **Karar:** Phase 2 statik (vehicle spec'inden battery_capacity_kwh + age-based linear degradation %1/yıl heuristic). Phase 3+ ML candidate.

6. **DC fast vs AC charging session cost difference:**
   - **Karar:** Provider-side handle ediliyor (OCPI session response cost_eur döner). TulipFleet **kontrol için** computeChargingSessionCost (FN-14) hesaplar (audit/billing verification).

7. **Cross-country charging tariff complexity:**
   - **Karar:** `enterprise.energy_tariffs.country_code` per-country. NL+BE+DE+FR seed Phase 2 trigger (customer-driven priority). NL ilk.

8. **Charging session duration prediction:**
   - **Karar:** HERE EV routing duration estimation kullanılır. Real-time deviation FEAT-010 exception ile dispatcher'a bildirilir (severity=medium).

9. **EV vehicle without HERE consumptionModel:**
   - **Karar:** Fallback heuristic — `battery_capacity_kwh / consumption_kwh_per_100km * 100` (kaba). Audit log warning ("no HERE consumptionModel available").

10. **V2G (Vehicle-to-Grid) reverse energy flow:**
    - **Karar:** KAPSAM DIŞI Phase 2. Phase 3+ ADR pending — bidirectional energy + grid balancing complex regulatory.

---

## 9. Shared infrastructure with previous FEAT'leri

| FEAT-103 fonksiyon | Shared with | Paylaşım türü |
|---|---|---|
| FN-01 trackVehicleSoC | **FEAT-005:FN-02** onVehicleLocationUpdate | MQTT subscriber pattern (ADR-0009 §4.2) |
| FN-02 estimateRemainingRange | **FEAT-005:FN-01** | HERE consumer pattern |
| FN-03 findChargingStations | **FEAT-017:FN-01** | PostGIS ST_DWithin pattern |
| FN-04 buildHereEvProblem | **FEAT-001:FN-016** | **Cross-spec sync** — `evMode?` imza evrimi (5. parametre) |
| FN-05 evaluateEvPolicy | **FEAT-003:FN-08** | Policy module stub |
| FN-06 calculateEnergyCost | **FEAT-008:FN-03** | Cost calculation pattern |
| FN-07 monitorRangeAnxiety | **FEAT-010:FN-06** | Exception event writer (new `range_anxiety_breach`) |
| FN-09 `<EvRouteMap />` | **FEAT-005:FN-06** + **FEAT-017:FN-09** + **FEAT-019:FN-11** | Leaflet map widget |
| FN-10 `<ChargingScheduleView />` | **FEAT-019:FN-10** | Timeline view pattern |
| FN-11 getEvPowerConsumptionKPI | **FEAT-009:FN-07** | KPI reporting pattern |
| FN-12 EV exemption | **FEAT-008:FN-03** toll calculation | EV branch (zero-emission) |
| FN-13 charging availability | **FEAT-017:FN-13** getCachedLockerAvailability | Redis cache + external API pattern |
| FN-14 charging cost compute | **FEAT-103:FN-06** | Time-of-use tariff |

**Disciplined evolution kanıtı:** 14 fonksiyondan 13'ü mevcut paterne referans. Yalnızca FN-08 (OCPI ingestion) bağımsız.

**Cross-spec sync TODO (yeni biriken — F015+F019+F103):**

| Spec | Değişiklik | Source |
|---|---|---|
| FEAT-010 | `exception_type` +`'range_anxiety_breach'` | F103:FN-07 |
| FEAT-010 §4 | Severity matrix +1 entry | F103:FN-07 |
| FEAT-001 | FN-016 imza `evMode?` parametresi | F103:FN-04 |
| FEAT-017 | `location_type` enum +`'charging_station'` | F103 §7.4 |
| FEAT-008 | `emission_class` enum +`'zero_emission'` (tariffs tablosu) | F103:FN-12 |
| FEAT-009 | EV well-to-wheel branch (electricity grid mix factor) | F103 paralel |

**Toplam birikim:** F015 (2) + F019 (3) + F103 (6) = **11 cross-spec sync**. FEAT-106 sonrası **toplu sync zorunlu** (FEAT-001 + FEAT-010 + FEAT-017 + FEAT-008 + FEAT-009 değişir, 5 spec).

---

## 10. Pilot süreç notları

### 10.1 Pilot akışı (2026-05-30)

Tek prompt + 0 follow-up. Kısaltılmış prompt (~2000 karakter). Konsolidasyonda 3 yeni fonksiyon eklendi (Vrachtwagenheffing EV exemption, charging availability real-time, charging session cost compute).

### 10.2 Alıntı doğrulama — KALICI TOPARLAMA 3. doğrulama

| # | NotebookLM | Gerçek | Durum |
|---|---|---|---|
| FN-01..FN-11 11 alıntı | ✅ Hepsi doğru | — | ✅ |
| **FN-10 ADR-0005 §4.1** | ✅ "reorder visits in the timeline" — User flow doğru section | — | ✅ |
| **FN-05 ADR-0005 §7** | ✅ Policy module stub birebir | — | ✅ |
| FN-02 ADR-0010 §4 | ✅ Birebir | — | ✅ |
| FN-06 ADR-0002 §3.4 | ✅ Birebir (Fuel + labor cost minimization) | — | ✅ |

**§number fabrikasyon: 0** ✅ (8 pilot zinciri: F8-F10-F17-F14-F18-F15-F19-**F103**)
**Section misattribution: 0** ✅ **KALICI TOPARLAMA** (F15+F19+F103, 3 üst üste 0 hata)
**Numaralandırma anomalisi: 0** ✅
**Toplam alıntı düzeltmesi: 0**

### 10.3 Section misattribution analizi — kalıcı doğrulandı

| Pilot | Sonuç | Hipotez |
|---|---|---|
| F14 | Hata | Yeni hata sınıfı |
| F18 | Hata (tekrar) | Belki kalıcı? |
| F15 | Düzeldi | F18 sonrası guard rail etkili |
| F19 | Düzeldi (tekrarlı) | Toparlama KALICI |
| **F103** | **Düzeldi (3. başarı)** | KESINLIKLE KALICI |

**Sonuç:** F14+F18'in özel koşullarıydı (yeni paradigma stress, dispatcher approval kavramı yoğun). F15+F19+F103 zincirinde **3 üst üste 0 hata** — guard rail prompt'a eklenen *"ADR-0005 §2 = Mode 1 Advisory, §4.1 = User flow"* açık ayrım **kesin işe yarıyor**. Sonraki pilotlarda korunmaya devam.

### 10.4 16 pilot karşılaştırma — zirve zincir

| Boyut | F18 | F15 | F19 | **F103** |
|---|---|---|---|---|
| Skor | 8.5 | 9 | 9 | **9** ⬆️ |
| İterasyon | 1 | 1 | 1 | **1** |
| Fonksiyon (final) | 15 | 16 | 16 | **14** |
| Alıntı hatası | 1 | 0 | 0 | **0** ✅ |
| §number fab | 0 | 0 | 0 | **0** ✅ |
| Section misattribution | 1 | 0 | 0 | **0** ✅ KALICI |
| Yeni paradigma | Multi-flow | Financial | Multi-day | **EV** |

**9 zirve pilot (9/10):** F1, F2, F3, F4, F8, F10, F15, F19, **F103**.

**16 pilot toplam:**
- 8 zirve (9-9.5/10) — 50%
- 6 stable (8.5/10) — 37.5%
- 2 toparlanan (F5/F7 final iterasyon sonrası 8.5) — 12.5%
- 0 başarısız

---

## 11. Next steps

### 11.1 Cross-spec sync TODO (11 birikmiş, F106 sonrası toplu)

| Spec | Değişiklik | Source |
|---|---|---|
| FEAT-010 | `exception_type` +`invoice_discrepancy`, +`invoice_audit_deadline_expired` | FEAT-015 |
| FEAT-010 | `exception_type` +`rest_violation`, +`border_crossing_compliance_breach` | FEAT-019 |
| FEAT-010 | `exception_type` +`range_anxiety_breach` | FEAT-103 |
| FEAT-010 §4 | Severity matrix +5 entry | F015+F019+F103 |
| FEAT-001 | FN-016 imza +`daysHorizon?`, +`driverRules?`, +`evMode?` | F019+F103 |
| FEAT-017 | `location_type` enum +`truck_parking`, +`secured_parking`, +`hotel`, +`fuel_station`, +`rest_area`, +`border_crossing`, +`charging_station` (7 yeni) | F019+F103 |
| FEAT-008 | `emission_class` enum +`zero_emission` (tariffs tablosu) | F103 |
| FEAT-009 | EV well-to-wheel branch | F103 |

**Karar:** FEAT-106 (W-A2) sonrası **toplu sync commit** — 5 spec etkilenir, atomic commit.

### 11.2 Phase 2 implementation backlog

- [ ] Schema migration: `public.vehicles` EV kolonlar (4 yeni)
- [ ] Schema migration: `enterprise.charging_sessions` (yeni tablo)
- [ ] Schema migration: `enterprise.energy_tariffs` (yeni tablo)
- [ ] Schema migration: `public.geofences.location_type` enum +`charging_station`
- [ ] Schema migration: `public.companies.settings.ev_policy` JSONB seed
- [ ] FN-01..FN-14 implementation (14 fonksiyon)
- [ ] HERE EV routing mode integration (consumptionModel)
- [ ] OCPI API connector (Hubject primary, Gireve fallback) — customer-funded
- [ ] FEAT-010 cross-spec sync (range_anxiety_breach)
- [ ] FEAT-001 cross-spec sync (FN-016 imza)
- [ ] FEAT-008 cross-spec sync (zero_emission enum)
- [ ] FEAT-017 cross-spec sync (charging_station enum)
- [ ] FEAT-009 cross-spec sync (EV well-to-wheel)

### 11.3 Customer trigger conditions

Phase 2 customer-funded trigger için minimum kriterler:
- Customer fleet ≥3 EV (electric HGV)
- Customer EV routing operasyonel ihtiyaç (range planning)
- Customer OCPI roaming network access (charging coverage)
- Customer Vrachtwagenheffing 2026 sonrası compliance

### 11.4 Sıradaki pilot — SON PILOT

**FEAT-106 W-A2 CSRD-Compliant Carbon Report Export** — Cem'in 7 pilot listesinin **son pilotu**.

Yeni paradigma: FEAT-009 CSRD-aware → FEAT-106 CSRD-compliant. XBRL export, audit trail, regulatory submission format (CSDDD + ESRS standards).

---

## 12. References

- ADR-0001 §3.6 (UI primitives)
- **ADR-0002 §3.2** (HERE native constraints — refueling stops), §3.4 (Soft constraints — fuel/labor cost), §5 (MatrixCache pattern)
- ADR-0004 v3 §6 (additive public.* + enterprise.* schema)
- **ADR-0005 §2** (Mode 1 Advisory tanımı), §4.1 (User flow — "reorder visits in the timeline"), §5.3 (Auto-dispatch loop), §7 (Policy module stub)
- ADR-0006 §3.1 (Map inspection-oriented)
- **ADR-0007 §3.2** (Third-party API consumer pattern)
- ADR-0009 §4.2 (MQTT subscribe read-only)
- **ADR-0010 §4** (LLM/ML API consumer — HERE — "Allowed and encouraged"), §3.4 (weighted sum), §3.5 (Phase 3 ML candidate — battery degradation)
- ADR-0011 §6 (Phase 2 customer-funded triggers — EV signal), §9.5 (endpoint patterns)
- ADR-0012 §4.7 (PostGIS Phase 3)
- FEAT-001 spec v3 (FN-016 buildHereProblem — `evMode?` cross-spec sync)
- FEAT-003 spec (FN-08 policy module)
- FEAT-005 spec v2 (FN-01 HERE consumer, FN-02 MQTT subscriber, FN-06 map widget)
- FEAT-008 spec (Vrachtwagenheffing — `zero_emission` emission_class extension)
- FEAT-009 spec (carbon — EV well-to-wheel branch)
- FEAT-010 spec (FN-06 logExceptionEvent — cross-spec sync `range_anxiety_breach`)
- FEAT-017 spec (FN-01 PostGIS, FN-09 map widget, **FN-13 Redis cache pattern**, location_type enum extension)
- FEAT-019 spec (FN-10 timeline view, FN-11 map widget)
- HERE EV Routing API docs (consumptionModel parameter — Phase 2 implementation)
- OCPI 2.2.1 spec (Open Charge Point Interface — Hubject + Gireve roaming)
- NotebookLM session 2026-05-30 (1 prompt, 9/10 skor — F15+F19+F103 zirve zincirinin 3.'sü)

---

## 13. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-30 | Cem Bakir (with Claude + NotebookLM cowork) | İlk konsolide function spec. On altıncı pilot — EV range planning, wishlist W16 (Common). Phase 2 customer-funded (Yorum B). 14 fonksiyon (FN-01..FN-14), NotebookLM 11 önerdi + konsolidasyonda 3 ek (FN-12 EV Vrachtwagenheffing exemption, FN-13 charging availability real-time, FN-14 charging session cost compute). **Yeni paradigma: EV-specific routing constraints** — HERE consumptionModel consumer, battery SoC MQTT subscriber, OCPI charging station integration, time-of-use energy tariff, range anxiety buffer. 2 yeni tablo (enterprise.charging_sessions, enterprise.energy_tariffs). public.vehicles +4 EV kolonu (battery_capacity_kwh, current_soc_percent, consumption_kwh_per_100km, charging_connector_type). public.geofences.location_type enum +`'charging_station'` (FEAT-017 cross-spec sync 7. değer). FEAT-001:FN-016 imza evrimi +`evMode?` parametresi (FEAT-006+008+009+019 paterni devam, 8. parametre). FEAT-008 `emission_class` enum +`'zero_emission'` (NL Vrachtwagenheffing EV exemption). FEAT-009 EV well-to-wheel branch (electricity grid mix factor). ML disipline kusursuz — HERE consumptionModel consumer (ADR-0010 §4 "Allowed and encouraged"), battery degradation Phase 3+ KAPSAM DIŞI. **Section misattribution = 0 KALICI** ✅ — F15+F19+F103 üst üste 3 başarı, F14+F18'in özel koşulları olduğu kesin doğrulandı, guard rail prompt etkili. §number fabrikasyon = 0 ✅ (8 pilot zinciri: F8-F10-F17-F14-F18-F15-F19-F103). Alıntı hatası = 0 ✅ (F15+F19+F103 mükemmel). Cross-spec sync TODO: 11 birikmiş (FEAT-010 +5 enum, FEAT-001 FN-016 imza, FEAT-017 location_type +7, FEAT-008 emission_class, FEAT-009 EV branch) — F106 sonrası toplu commit. F103 zirve katmanında (9/10) — 9 zirve pilot toplam (F1-4, F8, F10, F15, F19, F103). |
