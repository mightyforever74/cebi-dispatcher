# Sectoral Patterns Analysis — Bottleneck Solutions (2026-05-30)

| Field | Value |
|---|---|
| **Lokasyon** | `docs/analysis/sectoral-patterns-2026-05-30.md` |
| **Source** | NotebookLM session 2026-05-30 (sectoral pattern extraction) + Claude konsolidasyon |
| **Companion** | `docs/analysis/bottleneck-analysis-2026-05-30.md` (önceki analiz) |
| **Scope** | 4 critical bottleneck + meta-pattern + user behavior reality check |
| **Status** | Strategic guidance — Phase 1.1 sprint öncesi eylemler belirlendi |

---

## Önbilgi — niçin sectoral pattern araştırması

Cem'in net stratejik öngörüsü:

> *"İlk kez biz karşılaşmadık bu belirttiğin bottleneck'lerle. Dünyada ne karmaşık projeler var ve hayata geçmiş durumda."*

Uber, DoorDash, Onfleet, Bringg, Stripe, Netflix, Shopify, Postgres ekibi — hepsi benzer mimari sorunlarla karşılaştı ve çözdü. **Pattern transfer** sıfırdan icat etmekten daha verimli.

**Önemli not:** NotebookLM URL link'leri placeholder olarak verdi (gerçek doğrulanmış URL'ler değil). Pattern isimleri ve sektörel kaynaklar güvenilir, specific URL'ler Cem'in manuel doğrulamasına bırakıldı.

---

## 1. FN-016 buildHereProblem — imza karmaşıklığı çözümleri

**Risk:** 8 parametre = "telescoping constructor" anti-pattern.

| Source | Pattern Adı | TulipFleet için uyarlama |
|---|---|---|
| Refactoring.Guru | **Parameter Object** | Mevcut 8 parametre `HereProblemOptions` interface içine alınmalıdır |
| Uber Engineering | **Builder Pattern** | Chained metodlar (`.withTolls()`, `.withEV()`) ile kademeli inşa |
| Stripe Engineering | **Fluent API Design** | Tip-güvenli config objesi |

### Mimari karar — Builder Pattern

> *"Builder Pattern en temiz çözümdür. Mantıksal bağımlılıklar (örn: EV aktifse şarj durakları zorunludur) build() içinde validate edilir."*

**TypeScript önerisi:**

\`\`\`typescript
// Mevcut (anti-pattern):
buildHereProblem(tasks, vehicles, appointments?, tollCostMatrix?, 
                 routingMode?, daysHorizon?, driverRules?, evMode?)

// Refactor — Builder Pattern:
const problem = new HereProblemBuilder()
  .withTasks(tasks)
  .withVehicles(vehicles)
  .withAppointments(appointments)        // F006
  .withTolls(tollCostMatrix)              // F008
  .withRoutingMode('eco')                 // F009
  .withDaysHorizon(3)                     // F019
  .withDriverRules(eu561Rules)            // F019
  .withEvMode(evConfig)                   // F103
  .build();

await routingProvider.solve(problem);
\`\`\`

**Avantajlar:**
- Mantıksal bağımlılıklar build() içinde validate
- Yeni feature = yeni `.withX()` method, breaking change YOK
- Test edilebilirlik: her chain noktası unit test
- Immutable options object

**Timing:** Phase 1.1 sprint öncesi — FEAT-001 implementation bu pattern'le başlamalı.

---

## 2. enterprise.dispatch_tasks — schema bloat çözümleri

**Risk:** 15+ FEAT consumer, "Wide Table" sendromu.

| Source | Pattern Adı | TulipFleet için uyarlama |
|---|---|---|
| DoorDash Engineering | **Entity Schema Evolution** | Core sabit + FEAT JSONB metadata |
| Postgres Wiki | **Vertical Partitioning** | Nadir veri `task_metrics` yan tabloya |
| Shopify Engineering | **Metadata Offloading** | JSONB Phase 3'te problem, sparse kolonlardan kurtulma |

### Mimari karar — BEKLE, ölçümle

> *"100k satır threshold — Postgres rahat handle eder. Premature optimization."*

**Aksiyon:**
- ✅ Şimdi: Additive JSONB devam
- ⏳ Bekle: `pg_stat_user_tables` ölçüm
- 🚦 Trigger: Index>RAM, query latency >200ms
- 📋 ADR-0013 candidate: Trigger geldiğinde `enterprise.task_metrics` split

**100k threshold mantığı:**
- Postgres B-tree 100k row için 10-20 MB
- TulipFleet K/M-50-300 vehicle = yıllık 50k-300k task
- 1 yıl production sonra threshold tetiklenir

---

## 3. HERE Vendor Lock-in — IRoutingProvider interface

**Risk:** ~9 FEAT direkt HERE. Outage = no plans.

| Source | Pattern Adı | TulipFleet için uyarlama |
|---|---|---|
| Martin Fowler | **Adapter Pattern** | `IRoutingProvider` interface |
| Onfleet Blog | **Multi-Provider Strategy** | Routific hot-standby |
| Netflix Engineering | **Circuit Breaker** | HERE 500 → manuel mod |

### Mimari karar — ACILEN

> *"IRoutingProvider interface acilen implement edilmelidir. Maliyetler %15 MRR'ı aştığında OR-Tools'a geçer."*

**TypeScript interface:**

\`\`\`typescript
interface IRoutingProvider {
  solveVrp(problem: HereProblemOptions): Promise<VrpSolution>;
  computeMatrix(locations: LatLng[], profile: VehicleProfile): Promise<DistanceMatrix>;
  healthCheck(): Promise<{ status: 'ok' | 'degraded' | 'down', latency_ms: number }>;
  readonly providerId: 'here' | 'routific' | 'or-tools' | 'mock';
  readonly capabilities: ProviderCapabilities;
}

// Implementations:
class HereRoutingProvider implements IRoutingProvider { ... }
class RoutificRoutingProvider implements IRoutingProvider { ... }
class MockRoutingProvider implements IRoutingProvider { ... }  // testing

// Circuit Breaker wrapper:
class CircuitBreakerProvider implements IRoutingProvider {
  constructor(
    private primary: IRoutingProvider,
    private fallback: IRoutingProvider,
    private threshold: { errorRate: 0.5, timeout: 30_000 }
  ) {}
  
  async solveVrp(problem) {
    if (this.isOpen()) return this.fallback.solveVrp(problem);
    try {
      return await this.primary.solveVrp(problem);
    } catch (err) {
      this.recordFailure(err);
      if (this.shouldOpen()) return this.fallback.solveVrp(problem);
      throw err;
    }
  }
}
\`\`\`

**Avantajlar (outage'dan bağımsız):**
- Test edilebilirlik: MockRoutingProvider
- Local dev: HERE'siz çalış
- Cost trigger: Routific switch saatler içinde
- Future evaluation: NextBillion, Google Routes kolay karşılaştır

**Timing:** Phase 1.1 sprint öncesi — ADR-0014 candidate.

---

## 4. public.geofences.location_type — enum genişleme çözümleri

**Risk:** 12 enum değer, PostGIS query performansı.

| Source | Pattern Adı | TulipFleet için uyarlama |
|---|---|---|
| OpenStreetMap | **Tagging System** | `type` (core) + `tags` (JSONB) |
| Crunchy Data | **Partial Indexing** | Sık tipler için partial GIST |
| ESRI | **Hierarchical Domains** | `location_category` hiyerarşi |

### Mimari karar — Hibrit

**Şimdi (hafif):**

\`\`\`sql
CREATE INDEX idx_geofences_charging ON public.geofences USING GIST(geometry)
  WHERE location_type = 'charging_station';
  
CREATE INDEX idx_geofences_truck_parking ON public.geofences USING GIST(geometry)
  WHERE location_type IN ('truck_parking', 'secured_parking');
  
CREATE INDEX idx_geofences_locker ON public.geofences USING GIST(geometry)
  WHERE location_type IN ('locker', 'pudo_point', 'parcel_shop');
\`\`\`

**Bekle:** 20+ tip threshold → hierarchical migration (ADR-0015 candidate).

---

## 5. Meta-pattern — Premature Optimization Disiplini

> *"Teknik borç, kodun çalışmasını engellemiyorsa ama maintenance maliyetini artırıyorsa şimdi çözülmelidir. Veritabanı splitting ölçümlenmiş performans kaybı olduğunda yapılmalıdır."*

### TulipFleet karar matrisi

| Bottleneck | Maintenance impact | Performance impact | Karar |
|---|---|---|---|
| FN-016 imza | HIGH | YOK | **ŞIMDI** Builder Pattern |
| HERE lock-in | HIGH | LOW | **ŞIMDI** IRoutingProvider |
| dispatch_tasks bloat | LOW | UNKNOWN | **BEKLE** 100k satır |
| location_type enum | LOW | LOW | **BEKLE** 20+ tip |

**Disipline:** Maintenance gerçek + Performance hipotetik = şimdi.

---

## 6. User Behavior Reality Check

| Insight | Source | TulipFleet etkisi |
|---|---|---|
| **Workaround is Feedback** | Interaction Design Foundation | Dispatcher Excel'e dönüyor → **Bulk Update** eksik |
| **Shadow Workflow** | Bringg Blog | Telefonla rota değiştiriyor → **Manual Override** zorunlu |
| **Advisory Trust** | DoorDash AI Rollout | Mode 3 NL sendikaları + güven → **reddedilir** |

### Engineering effort allocation

> *"Solo dev eforunun %70'i Advisory Mode UI ve Manual Override esnekliğine yatırılmalıdır."*

3 mimari konsekans:
1. **Tabular View ağırlıklı UI** — Excel benzeri bulk editing
2. **Manual Override** her ekranda
3. **Export/Import dostu** — Excel "integration scenario"

---

## 7. Strategic Synthesis — Action Plan

### ŞIMDI (Phase 1.1 sprint öncesi)

| # | Aksiyon | Source bottleneck | Effort |
|---|---|---|---|
| 1 | Builder Pattern refactor — FN-016 | FN-016 imza | 1-2 gün |
| 2 | IRoutingProvider interface + Circuit Breaker | HERE lock-in | 3-5 gün |
| 3 | Partial GIST index (charging, truck_parking, locker) | location_type | 2-4 saat |
| 4 | ADR-0014 IRoutingProvider candidate yazımı | Karar belgele | 1 gün |
| 5 | ROADMAP Strategic Positioning patch | Workaround-aware design | 30 dk |

### BEKLE (production veri sonrası)

| # | Aksiyon | Trigger | ADR |
|---|---|---|---|
| 6 | dispatch_tasks splitting | 100k satır, latency>200ms | ADR-0013 |
| 7 | location_type hierarchical migration | 20+ tip | ADR-0015 |
| 8 | LLM API caching/batch | Rate limit observation | ADR-0016 |

### Mimari felsefe değişikliği

| Eski | Yeni |
|---|---|
| "Mode 1 + Mode 2 maturity" | + "**Workaround-aware design**" |
| Phase 1.1 foundation FEAT'ler | + "**Manual Override + Tabular View** %70 effort" |
| Mode 3 future option | "**Tam otonom reddedilir**" (sendikalar + güven) |
| "HERE primary, Routific fallback" | "**Provider-agnostic via IRoutingProvider**" |

---

## 8. NotebookLM kalite değerlendirmesi

| Boyut | Değerlendirme |
|---|---|
| Pattern isimleri | ✅ Doğru (standart) |
| Sectoral kaynaklar | ✅ Gerçek şirketler |
| URL link'leri | ⚠️ Placeholder, manuel doğrula |
| TulipFleet uyarlamaları | ✅ Bağlama dönüştürülmüş |
| Timing kararları | ✅ Disiplinli |
| Specific sayılar (100k, %15 MRR) | ⚠️ Context-dependent |
| **Skor** | **8.5/10** |

---

## 9. Sonraki adımlar

### ROADMAP eklemeleri
3 satır ekleme §Strategic Positioning, §Cross-Cutting, §Non-Goals'a.

### ADR adayları
- **ADR-0014** IRoutingProvider Interface — **şimdi**
- ADR-0013 dispatch_tasks Phase 3 schema — trigger sonrası
- ADR-0015 location_type hierarchical — 20+ tip sonrası

### FEAT-001 implementation prep
1. Builder Pattern refactor önce
2. IRoutingProvider integration parallel
3. Sonra FEAT-001 implementation

---

## 10. References

- NotebookLM session 2026-05-30 evening (sectoral pattern extraction)
- `docs/analysis/bottleneck-analysis-2026-05-30.md`
- ADR-0002 §3.3 (Routific fallback), §5 (MatrixCache + IRoutingProvider notu)
- ADR-0010 §4 (LLM/ML API consumer pattern)
- Cem'in 2026-05-30 stratejik öngörüleri
- Sectoral kaynaklar (URL'ler manuel doğrula):
  - Refactoring.Guru (Parameter Object, Builder)
  - Uber Engineering, DoorDash Engineering, Shopify Engineering
  - Martin Fowler refactoring catalog
  - Onfleet blog, Netflix Engineering (Circuit Breaker/Hystrix)
  - OpenStreetMap wiki, Crunchy Data blog, ESRI documentation
  - Interaction Design Foundation, Bringg blog, DoorDash AI rollout

---

## 11. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-30 | Cem Bakir + Claude (NotebookLM sectoral cowork) | İlk konsolide sectoral pattern analizi. 4 bottleneck + meta-pattern + user behavior reality check + strategic synthesis. NotebookLM 7 görev (8.5/10 — pattern isimleri güvenilir, URL placeholder, specific sayılar doğrulama gerek). Kritik bulgular: (1) FN-016 Builder Pattern **şimdi**, (2) IRoutingProvider **acilen** Phase 1.1 öncesi, (3) dispatch_tasks splitting **bekle** (100k trigger), (4) location_type partial GIST **şimdi**. Mimari felsefe değişikliği: "Workaround-aware design" + "%70 effort → Advisory UI" + Mode 3 reddedildi. Sonraki: ROADMAP patch + ADR-0014. |
