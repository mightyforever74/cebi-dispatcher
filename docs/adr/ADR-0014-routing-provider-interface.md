# ADR-0014: IRoutingProvider Interface — Routing Vendor Abstraction Layer

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Status**        | Proposed (Candidate)                                                   |
| **Version**       | 1                                                                      |
| **Date**          | 2026-05-30                                                             |
| **Decision by**   | Cem Bakir (Founder / Lead Engineer)                                    |
| **Component**     | Routing layer — `enterprise-backend/src/routing/` (yeni modül)         |
| **Related**       | ADR-0002 (VRP solver — HERE primary, Routific fallback strategy), ADR-0007 (Telematics integration — customer-funded connector pattern), ADR-0010 (ML strategy — API consumer pattern), ADR-0011 (Use case scope — FEAT-001 + 16 spec consumer base) |
| **Triggers**      | 17 FEAT pilot completion (2026-05-30) + Bottleneck analysis (`docs/analysis/bottleneck-analysis-2026-05-30.md`) + Sectoral pattern extraction (`docs/analysis/sectoral-patterns-2026-05-30.md`) — HERE consumer ~9 spec, FN-016 6 extension consumer, business continuity + cost trigger riskleri belgelendi |

---

## 1. Context

TulipFleet Enterprise Dispatcher'ın routing katmanı **HERE Tour Planning API**'sine doğrudan bağımlıdır (ADR-0002 §3). 17 FEAT pilot tamamlandıktan sonra (2026-05-30) yapılan function-level shared infrastructure analizi (`docs/analysis/bottleneck-analysis-2026-05-30.md`) şu durumu ortaya koydu:

**HERE consumer FEAT'leri (~9 spec):**
- FEAT-001 Multi-vehicle VRP (foundation — `buildHereProblem` FN-016)
- FEAT-002 Dynamic re-routing
- FEAT-004 Hybrid fleet assignment
- FEAT-005 Predictive ETA
- FEAT-006 Automated appointment scheduling
- FEAT-008 Vrachtwagenheffing route cost
- FEAT-009 Basic carbon footprint (HERE Eco Routing)
- FEAT-019 Multi-day long-haul planning
- FEAT-103 EV range planning (HERE consumptionModel)

**Risk üçlüsü:**

| Risk | Severity | Tetik |
|---|---|---|
| **Business continuity** — HERE outage = no new plans | CRITICAL | HERE API 500 / network partition / regional outage |
| **Cost trigger** — HERE pricing prohibitive at SMB scale | HIGH | Per-request cost × 50-300 vehicle × Phase 2 customer growth (ADR-0002 §3.3 zaten not etti) |
| **Vendor lock-in** — 9 spec HERE-specific kod | HIGH | Future provider değerlendirme (NextBillion.ai, Google Routes, OR-Tools) imkansız |

**Mevcut durum — ADR-0002 §3 ne diyor:**

ADR-0002 §3.3 "Routific is retained as a fallback if HERE pricing becomes prohibitive at SMB scale" diyor — **stratejik karar var ama kod düzeyinde yok**. Kabaca:
- HERE-specific kod `buildHereProblem` içinde dağılmış
- 9 spec `here.tour.solve()`, `here.matrix.compute()` doğrudan çağırıyor
- Routific'e geçiş = 9 spec rewrite (etki: haftalar-aylar)
- Test edilebilirlik düşük (HERE sandbox quota her unit test'te yakılır)

**Sectoral pattern extraction (2026-05-30) bulgusu:**

`docs/analysis/sectoral-patterns-2026-05-30.md` 6 sectoral kaynaktan benzer pattern'i belgeledi:
- **Martin Fowler refactoring catalog** — Adapter Pattern (vendor abstraction)
- **Onfleet blog** — Multi-Provider Strategy (hot-standby fallback)
- **Netflix Engineering (Hystrix)** — Circuit Breaker (otomatik failover)
- **Stripe Engineering** — payment provider abstraction (industry-proven pattern)

**NotebookLM açık önerisi:** *"ADR-0002 §5'teki IRoutingProvider interface önerisi acilen implement edilmelidir. Bu, TulipFleet'in maliyetler %15 MRR'ı aştığında OR-Tools'a geçmesini sağlar."*

**Karar zamanlaması:** Phase 1.1 sprint öncesi. FEAT-001 implementation **bu pattern'le başlamalı**; sonra refactor etmek 9 spec'i etkiler.

## 2. Decision

TulipFleet routing katmanı `IRoutingProvider` interface'i arkasında **provider-agnostic** olarak yapılandırılır. HERE-specific kod tek bir `HereRoutingProvider` implementation'ında izole edilir. Yeni provider'lar (Routific, OR-Tools, NextBillion.ai, Mock) aynı interface'i implement ederek **drop-in replacement** olarak eklenebilir.

**Mimari prensip:** Routing katmanı **stateless abstraction** olarak hizmet eder; FEAT'ler `IRoutingProvider` interface'i çağırır, **hangi provider'ın aktif olduğunu bilmez**.

**Aktivasyon disipline:** Phase 1'de **`HereRoutingProvider` default**; `RoutificRoutingProvider` ve `MockRoutingProvider` Phase 1.1'de hazır edilir (test + emergency fallback için). `OrToolsRoutingProvider` Phase 2'de customer-funded trigger (ADR-0002 §3.3 cost prohibitive) ile devreye alınır.

**Circuit Breaker:** HERE API outage durumunda otomatik manuel-mode fallback (`MockRoutingProvider` veya cached last-plan). ADR-0005 §2 Mode 1 Advisory disipline korunur — dispatcher manuel approve eder.

## 3. Interface Definition

### 3.1 TypeScript interface

```typescript
// enterprise-backend/src/routing/IRoutingProvider.ts

export interface IRoutingProvider {
  /**
   * Solve a Vehicle Routing Problem (VRP) with constraints.
   * Returns optimized routes for assigned vehicles + unassigned tasks.
   */
  solveVrp(problem: HereProblemOptions): Promise<VrpSolution>;

  /**
   * Compute distance/time matrix between locations.
   * Result format provider-agnostic — caller does not interpret raw payload.
   */
  computeMatrix(
    locations: LatLng[],
    profile: VehicleProfile,
    options?: MatrixOptions
  ): Promise<DistanceMatrix>;

  /**
   * Health probe — used by Circuit Breaker + monitoring dashboards.
   * MUST be cheap (no actual VRP solve, ideally <100ms).
   */
  healthCheck(): Promise<HealthStatus>;

  /**
   * Provider identity — observability, audit log, fallback decisions.
   */
  readonly providerId: 'here' | 'routific' | 'or-tools' | 'nextbillion' | 'mock';

  /**
   * Capability flags — caller queries before using advanced features.
   * Example: Mock provider may not support `evMode`; caller skips that path.
   */
  readonly capabilities: ProviderCapabilities;
}

export type HealthStatus = {
  status: 'ok' | 'degraded' | 'down';
  latency_ms: number;
  last_success_at?: Date;
  consecutive_failures?: number;
};

export type ProviderCapabilities = {
  multi_day: boolean;            // FEAT-019 daysHorizon support
  ev_routing: boolean;           // FEAT-103 evMode support
  eco_routing: boolean;          // FEAT-009 routingMode='eco'
  toll_avoidance: boolean;       // FEAT-008 tollCostMatrix
  driver_shift_rules: boolean;   // FEAT-019 EU 561/2006
  max_tasks_per_solve: number;   // ölçeklendirme sınırı
  max_vehicles_per_solve: number;
};
```

### 3.2 HereProblemOptions — paylaşılan problem schema

`HereProblemOptions`, **FEAT-001 §4.5'te belgelenen FN-016 imza evrimi** ile uyumlu. Builder Pattern üzerinden inşa edilir:

```typescript
const problem = new HereProblemBuilder()
  .withTasks(tasks)
  .withVehicles(vehicles)
  .withAppointments(appointments)        // FEAT-006
  .withTolls(tollCostMatrix)              // FEAT-008
  .withRoutingMode('eco')                 // FEAT-009
  .withDaysHorizon(3)                     // FEAT-019
  .withDriverRules(eu561Rules)            // FEAT-019
  .withEvMode(evConfig)                   // FEAT-103
  .build();

await routingProvider.solveVrp(problem);
```

**Önemli:** `HereProblemOptions` schema'sı **provider-agnostic**. İsim "Here" geçmiş nedenden — schema TulipFleet'in kendi domain model'i, HERE format'ı **değil**. Her implementation kendi `solveVrp()` içinde HereProblemOptions → vendor-specific format çevirisi yapar.

### 3.3 Circuit Breaker decorator

```typescript
// enterprise-backend/src/routing/CircuitBreakerProvider.ts

export class CircuitBreakerProvider implements IRoutingProvider {
  private state: 'closed' | 'open' | 'half_open' = 'closed';
  private consecutiveFailures = 0;
  private lastFailureAt?: Date;

  constructor(
    private primary: IRoutingProvider,
    private fallback: IRoutingProvider,
    private threshold = {
      consecutive_failures: 3,
      cooldown_ms: 30_000,
      half_open_attempts: 1
    }
  ) {}

  async solveVrp(problem: HereProblemOptions): Promise<VrpSolution> {
    if (this.state === 'open') {
      if (this.cooldownElapsed()) {
        this.state = 'half_open';
      } else {
        return this.fallback.solveVrp(problem);
      }
    }

    try {
      const result = await this.primary.solveVrp(problem);
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure(err);
      if (this.shouldOpen()) {
        this.state = 'open';
        return this.fallback.solveVrp(problem);
      }
      throw err;
    }
  }

  // ... computeMatrix, healthCheck similar
}
```

**Fallback behavior:** Primary HERE down → fallback **MockRoutingProvider** (cached last-plan returns) **or** **manual-mode signal** (`solveVrp` throws `ProviderUnavailableError`, dispatcher UI displays "manual planning required" + Mode 1 advisory disipline). ADR-0005 §2 Mode 1 Advisory korunur.

### 3.4 Provider implementations matrix

| Provider | Status | Phase | Use case |
|---|---|---|---|
| **HereRoutingProvider** | Required | Phase 1 | Default primary — production solver |
| **MockRoutingProvider** | Required | Phase 1.1 | Unit tests + local dev + Circuit Breaker fallback |
| **RoutificRoutingProvider** | Phase 1.1 stub, Phase 2 implementation | Phase 1.1 (stub) / Phase 2 (full) | Emergency fallback (HERE outage) + cost-trigger migration target |
| **OrToolsRoutingProvider** | Phase 2 candidate | Phase 2 (customer-funded) | Self-hosted alternative — ADR-0002 §3.3 cost prohibitive trigger |
| **NextBillionRoutingProvider** | Future evaluation | Phase 3 | Comparison study — performance benchmark |

## 4. Architectural Constraints

### 4.1 Stateless requirement

`IRoutingProvider` implementations **stateless** olur. Tüm context (vehicle profile, problem data, vendor credentials) **caller tarafından sağlanır** veya constructor injection ile **immutable** tutulur.

Gerekçe: Multi-tenant safety. Bir provider instance birden fazla company'nin request'ini handle edebilir; per-request state interleaving riski olmamalı.

### 4.2 No vendor-specific types in public interface

Public interface (`IRoutingProvider`, `HereProblemOptions`, `VrpSolution`) **HERE-specific tipler içermez**. Örneğin:

❌ Yanlış: `solution.here_polyline_encoded: string`  
✅ Doğru: `solution.routes[].geometry: GeoJSON.LineString`

Her provider kendi response'unu **TulipFleet domain model'ine** çevirir. Bu kural ihlal edilirse vendor switch dakikalar yerine haftalar sürer (lock-in restorasyonu).

### 4.3 Capability flags zorunlu

Yeni feature eklenmeden önce `ProviderCapabilities` enum genişletilir. Caller MUST check:

```typescript
if (!routingProvider.capabilities.ev_routing && evMode) {
  // graceful degradation veya error
  throw new UnsupportedCapabilityError('ev_routing', routingProvider.providerId);
}
```

Bu Phase 2'de Mock provider'ın eksik capability'lerini gracefully handle etmesini sağlar.

### 4.4 Configuration via environment + factory pattern

Provider selection runtime'da **environment variable** ile yapılır:

```typescript
// enterprise-backend/src/routing/routingProviderFactory.ts

export function createRoutingProvider(env: Env): IRoutingProvider {
  const primary = (() => {
    switch (env.ROUTING_PROVIDER_PRIMARY) {
      case 'here': return new HereRoutingProvider({ apiKey: env.HERE_API_KEY });
      case 'routific': return new RoutificRoutingProvider({ apiKey: env.ROUTIFIC_API_KEY });
      case 'mock': return new MockRoutingProvider();
      default: throw new Error(`Unknown provider: ${env.ROUTING_PROVIDER_PRIMARY}`);
    }
  })();

  if (env.ROUTING_PROVIDER_FALLBACK) {
    const fallback = createFallback(env.ROUTING_PROVIDER_FALLBACK, env);
    return new CircuitBreakerProvider(primary, fallback);
  }

  return primary;
}
```

Test ortamında: `ROUTING_PROVIDER_PRIMARY=mock` — HERE sandbox quota yakılmaz.

### 4.5 Observability requirement

Her `solveVrp` ve `computeMatrix` call **structured log** üretir:

```jsonc
{
  "event": "routing.solve",
  "provider_id": "here",
  "fallback_used": false,
  "task_count": 47,
  "vehicle_count": 12,
  "latency_ms": 1240,
  "success": true,
  "company_id": "...",
  "request_id": "..."
}
```

Bu, ADR-0002 §3.3 cost trigger için **veri kaynağı** olur — provider switch kararı veriye dayanır, his değil.

## 5. Phase 1 → Phase 1.1 → Phase 2 progression

### Phase 1 (MVP — şu an)

- `HereRoutingProvider` only — production solver
- `MockRoutingProvider` test ortamında — unit test infrastructure
- Circuit Breaker **YOK** — Phase 1 outage tolerance low, fallback handcrafted
- `IRoutingProvider` interface mevcut, FEAT-001 başından beri bu pattern kullanır

### Phase 1.1 (Implementation-ready follow-up — 1-4 hafta sonra)

- `RoutificRoutingProvider` **stub** (interface implement edilir, gerçek call'lar henüz yok)
- `CircuitBreakerProvider` operational — HERE outage → manual-mode fallback
- Observability logs production-ready
- `ProviderCapabilities` flag system 17 FEAT'in tümü için validated

### Phase 2 (Customer-funded trigger)

- `RoutificRoutingProvider` **full implementation** — emergency switch saatler içinde
- `OrToolsRoutingProvider` candidate evaluation — ADR-0002 §3.3 cost trigger (MRR%15+ HERE cost)
- Multi-provider hybrid: customer per-company tercihi (config-driven)

### Phase 3 (Maturity)

- `NextBillionRoutingProvider` veya emerging vendor — comparison study
- Provider performance dashboard — latency/cost/accuracy benchmarks
- Possible: HERE → OR-Tools migration tamamlanır (self-hosted, customer cost reduction)

## 6. Consequences

### 6.1 Positive

- **Vendor lock-in çözüldü** — provider switch haftalar değil, saatler-günler içinde
- **Test edilebilirlik** — `MockRoutingProvider` ile 17 FEAT unit test edilebilir, HERE quota yakılmaz
- **Local dev** — HERE API olmadan geliştirme (offline mode)
- **Cost trigger ready** — ADR-0002 §3.3 senaryosu kod düzeyinde hazır
- **Future evaluation kolay** — yeni provider değerlendirme = yeni implementation class, business logic değişmez
- **Business continuity** — HERE outage Circuit Breaker ile graceful manual-mode fallback (ADR-0005 §2 Mode 1 Advisory korunur)
- **FN-016 Builder Pattern ile uyumlu** — sectoral pattern reuse (Refactoring.Guru + Uber Engineering)

### 6.2 Negative / Trade-offs

- **Initial implementation effort** — Phase 1.1 sprint'te ~3-5 günlük work (Interface + HereRoutingProvider + MockRoutingProvider + CircuitBreaker + observability)
- **Abstraction overhead** — `HereProblemOptions` çevirisi her call'da extra mapping (minimal cost, <5ms)
- **Premature optimization riski** — Phase 1'de sadece HERE varken interface fazla mühendislik gibi görünebilir; ancak FEAT-001 sprint öncesi yapılırsa **9 spec retrofit cost'undan** kaçınılır (ADR justification — sectoral validation: Stripe, Onfleet bu pattern'i benzer scale'da uyguladı)
- **Capability flag drift** — yeni feature eklendiğinde `ProviderCapabilities` enum genişletilmeli; unutulursa caller code provider-specific assumption yapar

### 6.3 Neutral

- ADR-0002 değişmez — HERE primary kararı korunur, sadece kod düzeyinde abstraction katmanı eklenir
- ADR-0010 değişmez — ML consumer pattern devam (HERE consumptionModel via interface)

## 7. Open Questions

1. **MockRoutingProvider'ın "deterministic fake plan" döndürme stratejisi:** Phase 1.1'de Mock provider production-grade fake plans (gerçekçi schedule + ETA) mı yoksa "minimal valid response" mu döner? Test'lerin gerçekçiliği için karar gerekir.

2. **Cached-last-plan fallback storage:** Circuit Breaker fallback olarak "son başarılı plan"ı kullanmak için **plan history retention** stratejisi? Redis (24h TTL) veya `enterprise.routing_jobs` (kalıcı, query maliyeti) — Phase 1.1 sprint'inde karar.

3. **Per-company provider preference:** Phase 2'de "customer X HERE kullanır, customer Y Routific kullanır" senaryosu olur mu? Schema: `public.companies.settings.routing_provider`? Karar Phase 2 trigger geldiğinde verilir.

4. **HERE consumptionModel parametresi vendor-agnostic mu?** FEAT-103 EV mode HERE-specific concept (Wh/km elevation tablosu); Routific bu detayı desteklemez. Capability flag yeterli mi yoksa `EvProblemOptions` ayrı schema mı gerekir? UNCERTAINTIES kategorize → Phase 2 EV trigger.

5. **Cost telemetry granularity:** Per-request cost tracking için HERE billing API entegrasyonu gerekir mi (real-time cost vs end-of-month invoice)? Phase 2 cost trigger karar verirken bu veriye ihtiyaç var.

## 8. References

- ADR-0002 (VRP solver — HERE primary, §3.3 Routific fallback decision, §5 MatrixCache pattern)
- ADR-0005 (Dispatch workflow — Mode 1 Advisory disipline, §7 policy module stub)
- ADR-0007 (Telematics integration — customer-funded connector pattern, §3.2 third-party API maintenance)
- ADR-0010 (ML strategy — §4 LLM/ML API consumer pattern, vendor consumer disipline)
- ADR-0011 (Use case scope — FEAT-001 foundation + 16 spec consumer base)
- `docs/analysis/bottleneck-analysis-2026-05-30.md` (Top 5 bottleneck — HERE vendor lock-in CRITICAL, ~9 FEAT consumer)
- `docs/analysis/sectoral-patterns-2026-05-30.md` (§3 HERE Vendor Lock-in — Adapter Pattern + Multi-Provider Strategy + Circuit Breaker; sectoral sources: Martin Fowler, Onfleet, Netflix Engineering, Stripe Engineering)
- ROADMAP §Implementation Bottleneck Analysis (ADR-0014 candidate işareti)
- ROADMAP §Cross-Cutting Disciplines / Bottleneck-aware engineering discipline
- FEAT-001 spec v3 §4.5 (FN-016 buildHereProblem 8 parametre imza evrimi)
- FEAT-001..F010, F014, F015, F017, F018, F019, F103, F106 spec'leri (16 consumer)
- Sectoral kaynaklar (URL doğrulama Cem manuel):
  - Refactoring.Guru — Adapter Pattern, Parameter Object, Builder
  - Martin Fowler refactoring catalog
  - Onfleet engineering blog — Multi-Provider Strategy
  - Netflix Engineering — Hystrix / Circuit Breaker
  - Stripe Engineering — payment provider abstraction
  - Uber Engineering blog — Builder pattern dispatch

## 9. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 (Proposed) | 2026-05-30 | Cem Bakir | İlk ADR draft — IRoutingProvider Interface candidate. 17 FEAT pilot + bottleneck analysis + sectoral pattern extraction sonrası önerildi. NotebookLM açık önerisi: *"acilen implement edilmelidir"*. ADR-0002 §3.3 Routific fallback stratejik kararının **kod düzeyinde implementation pattern'i**. Phase 1.1 sprint öncesi yazılır — FEAT-001 implementation bu pattern'le başlar (9 spec retrofit cost'undan kaçınılır). 3 trigger: business continuity (HERE outage), cost trigger (ADR-0002 §3.3 MRR%15+), vendor lock-in (9 spec HERE-specific). Sectoral validation: Stripe payment providers + Onfleet multi-provider + Netflix Circuit Breaker + Martin Fowler Adapter Pattern. Interface 4 method (solveVrp, computeMatrix, healthCheck, providerId/capabilities) + Circuit Breaker decorator + Factory pattern. Phase 1 HereRoutingProvider only, Phase 1.1 Mock + Routific stub + Circuit Breaker, Phase 2 Routific full + OrTools candidate. 5 open question — MockRoutingProvider determinism, cached-last-plan storage, per-company preference, HERE consumptionModel vendor-agnostic, cost telemetry. Status: **Proposed (Candidate)** — Cem onayı + Phase 1.1 sprint plan ile **Accepted**'a yükseltilir. |
