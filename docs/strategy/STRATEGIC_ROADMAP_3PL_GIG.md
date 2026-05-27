# Strategic Roadmap — 3PL & Gig Worker Orchestration

| Field | Value |
|---|---|
| **Type** | Strategic roadmap (pre-ADR draft material) |
| **Status** | Discovery — not yet a decision |
| **Triggered by** | FEAT-004 (Hybrid Fleet Assignment) scope analysis (2026-05-27) |
| **Target ADR** | ADR-0013 (to be written when trigger conditions met) |
| **Related ADRs** | ADR-0007 (Telematics integration), ADR-0009 (Tenant isolation), ADR-0011 §7 OUT-002 (Out-of-scope), ADR-0012 (3-phase pattern reference) |

---

## 1. Context — neden bu doküman var

FEAT-004 (Hybrid Fleet Assignment) wishlist'inde dört aktör tipi yer aldı:
- Internal drivers
- Contracted carriers
- 3PL partners
- Gig workers

FEAT-004 pilot analizinde **3PL partners** ve **gig workers** **out-of-scope** olarak işaretlendi. Gerekçe ADR-0011 §7 OUT-002:

> *"Multi-tenancy ve cross-company task visibility mimari değişikliği gerektirir; ayrı bir ürün olmalı, dispatcher'a sıkıştırılmamalı."*

Ama "out-of-scope" iki farklı anlama gelebilir:
- Hiç yapılmaz (TulipFleet bu domain'e girmeyecek)
- Bu üründe yapılmaz (ayrı bir TulipFleet ürünü olabilir)
- Sonra yapılır (Phase 3 ADR ile değerlendirilir)

ADR-0011 §7 OUT-002 *"ayrı bir ürün olmalı"* der. Yani **ayrı ürün** çizgisinde — ama somut yapı belirsiz.

Bu doküman, ADR-0013 yazılana kadar stratejik düşünceyi kayıt altına almak için. **Karar değil, hazırlık.**

---

## 2. Ürün mimarisi — üçüncü mikroservis

3PL/gig orkestrasyonu **bağımsız bir mikroservis** gerektirir. Mevcut iki-sunucu topolojisi (ADR-0003) üçüncü bir halkaya genişler:

```
[fleet-prod-01]            [fleet-enterprise-01]      [fleet-orchestrator-01]
 driver app + admin    →    dispatcher              →   3PL/gig federation
 (kendi tenant'ı)           (kendi tenant'ı)            (cross-company)
 public.* schema            enterprise.* schema         orchestration.* schema
                                                       (veya ayrı DB)
```

### 2.1 Tenant isolation neden bozulamaz

ADR-0009 §5.3 her sorgunun `company_id` filtresinden geçmesini zorunlu kılar. 3PL/gig orkestrasyonu **cross-company visibility** gerektirir (3PL aynı anda 10+ dispatcher'a hizmet sunabilir). Bu mevcut izolasyon modeline doğrudan aykırı.

**Çözüm pattern adayları:**
- (a) Ayrı PostgreSQL instance — federation backend kendi DB'sine sahip
- (b) Ortak DB ama yeni schema (`orchestration.*`) — federation roles ile, dispatcher backend bu schema'ya read-only
- (c) Federated schema layer — dispatcher backend kendi tenant'ında "external resource" olarak görür, federation backend cross-company eşleştirmeyi arka planda yapar

**Tercih:** (c) en mantıklı, çünkü dispatcher backend'in mevcut tenant isolation modeli korunur (FEAT-004'te NotebookLM'in "External Resource" pattern önerisi bu yönde). Federation katmanı **dispatcher'ın görmediği** bir orkestrasyon yapıyor.

### 2.2 Entegrasyon noktası

Dispatcher → Federation:
- `POST /api/federation/dispatch-request` — dispatcher "bu order'ı 3PL'e gönder" der
- `GET /api/federation/carrier-availability` — dispatcher "şu zaman/lokasyonda hangi 3PL kapasitem var?" sorar

Federation → Dispatcher:
- Webhook callback'ler (`POST /api/dispatcher/federation/order-update`)
- `enterprise.dispatch_tasks.source` jsonb'de federation reference

---

## 3. Trigger conditions — ne zaman başlatılır

ADR-0012'nin Phase 3 trigger conjunction pattern'i (12 ay + 10 şehir + 10 paying customer) burada da uygulanabilir.

### 3.1 Önerilen trigger conjunction (üç şart birden)

**Şart 1 — Customer demand:**
≥10 paying dispatcher customer "we need to coordinate with 3PL partner X" der + ≥3'ü aynı 3PL'i adresler (yoğunlaşma sinyali).

**Şart 2 — Market validation:**
Hollanda pazarında 3PL API olgunluğu — Picnic, Bringly, Trunkrs, DHL Express, GLS'den **en az 3'ünün** kurumsal API'si TulipFleet'in K/M segmentine (50-300 araç) uygun erişim sunması.

**Şart 3 — Gig market readiness:**
Stuart veya Wolt Business gibi sağlayıcıların Hollanda'da N2/N3 sınıfı araç operasyonlarına yönelik **resmi kurumsal API** yayınlaması. (Bu şart sadece gig komponenti için zorunlu — 3PL-only ürün gig olmadan da başlatılabilir.)

> **Not — somut sayılar:** 10 customer, 3 yoğunlaşma, 3 API olgunluğu rakamları **NotebookLM önerisi** — ADR-0012'nin pattern'inden esinlenmiş ama henüz validate edilmemiş. ADR-0013 yazılırken Cem'in pazarla doğrulaması gerekli.

### 3.2 Trigger NOT — speculative not allowed

ADR-0007 §2 madde 3 disiplini geçerli: *"A new third-party telematics integration is built only when a signed customer contract allocates budget to it."*

3PL/gig için aynı disiplin — paying customer'sız spekülatif geliştirme yok. Her 3PL connector customer-funded.

---

## 4. ADR mimarisi — yeni ADR-0013 mi, mevcut ADR'ye ek mi?

### Karar: Bağımsız ADR-0013

**Sebep:**
- ADR-0011 §7 OUT-002 kararı zaten net: *"ayrı bir ürün olmalı, dispatcher'a sıkıştırılmamalı"* — bu kararı ADR-0011 §6 (Phase 2 use case) listesine madde eklemek **mevcut karara aykırı**
- 3PL/gig federation **tenant isolation modelinin esnetilmesini** gerektiriyor (ADR-0009 §5.3) — bu ADR-değişiklik seviyesinde mimari karar, addendum değil
- ADR-0012'nin 3-phase strategy pattern'i (Internal → Premium → Standalone) burada da uygulanabilir, ama **farklı domain** (compliance vs orchestration) — ayrı ADR daha temiz

### ADR-0013 içerik iskeleti (öneri)

```
ADR-0013: 3PL & Gig Federation Architecture

1. Context
   - FEAT-004 scope analysis çıktısı
   - ADR-0011 §7 OUT-002 çerçevesi
   - Pazar talebi (referans: triggers satisfied)

2. Decision
   - Three-phase evolution (similar to ADR-0012 pattern):
     Phase 1: Out-of-scope (current state)
     Phase 2: Premium connector tier — single 3PL per customer
     Phase 3: Federation backend — cross-company orchestration

3. Architecture
   - Third microservice (fleet-orchestrator-01)
   - orchestration.* schema (or separate DB)
   - Tenant isolation pattern: "External Resource" model

4. Tenant isolation deviation
   - Where ADR-0009 §5.3 is preserved
   - Where it's bridged (federation layer)
   - Audit logging requirements

5. Business model
   - Per-transaction pricing (not per-vehicle)
   - Enterprise tier mandatory
   - Network effects analysis

6. Connector pattern
   - ADR-0007 customer-funded discipline inherited
   - Per-3PL connector (Picnic, Bringly, DHL...)
   - Standard exchange protocol after 3+ connectors

7. Phase 3 trigger conjunction
   - [Specific numeric thresholds — TBD when ADR-0013 written]

8-12. Standard ADR sections (consequences, risks, open questions, references, change log)
```

---

## 5. Business model — per-transaction pricing zorunluluğu

Mevcut TulipFleet pricing (`Starter €15` / `Professional €25` / `Enterprise €29-35` per vehicle) 3PL/gig için **yapısal olarak uygunsuz**:

| Sebep | Detay |
|---|---|
| Vehicle TulipFleet'te değil | Carrier'ın aracı TulipFleet customer'ının değil — "per-vehicle" sayım yapısı çöker |
| Variable usage | Bir customer ayda 5 dispatch yapabilir, başkası 500 — sabit fee adil değil |
| Network effects | Daha fazla 3PL connector → daha fazla customer değer alır, ama mevcut tier sistemi bunu yansıtmaz |

### Önerilen pricing modeli

**Federation tier** (Enterprise üstü veya Enterprise altında ayrı seçenek):
- Base subscription (per month) — minimum federation altyapı erişimi
- Per-transaction fee (per dispatch) — kullanıma göre değişken
- Connector activation fee (one-time, per 3PL) — customer-funded development pattern

Tam pricing ADR-0013'te detaylandırılır. Şu an **kavramsal yön belirleniyor**.

---

## 6. Connector pattern — ADR-0007 disiplini

Her 3PL ayrı bir connector olarak inşa edilir, ADR-0007 §2 madde 3 customer-funded pattern'iyle:

| 3PL/Gig | Connector geliştirme tetikleyicisi |
|---|---|
| Picnic | İlk dispatcher customer signed contract |
| Bringly | İlk dispatcher customer signed contract |
| Trunkrs | İlk dispatcher customer signed contract |
| DHL Express | İlk dispatcher customer signed contract |
| GLS | İlk dispatcher customer signed contract |
| Stuart | İlk dispatcher customer signed contract (gig pool için) |
| Wolt Business | İlk dispatcher customer signed contract |

**Phase 3 framework yaklaşımı (ADR-0007 §4):**
- İlk 2 connector ad-hoc geliştirilir
- 3. connector öncesi ortak pattern keşfedilir
- 3. connector framework üzerinde inşa edilir
- 4+ connector marginal cost düşer

---

## 7. Strategic Roadmap (5-action checklist)

ADR-0013 yazılana kadar takip edilecek aksiyon listesi:

1. **Scope freeze (immediate):** 3PL/gig özelliklerini mevcut `tulipfleet-enterprise-backend` kod tabanına dahil etme girişimlerini reddet. Customer "we need 3PL integration" derse, "Phase 3 product, customer-funded — let's discuss contract" cevabı.

2. **Market monitoring (ongoing):** En az 10 paying customer'dan somut "3PL partner X" talebi gelene kadar sadece **API dokümantasyonu üzerinden keşif** yap. Picnic/Bringly/Trunkrs/DHL/GLS/Stuart/Wolt API readiness dosyaları derle.

3. **ADR-0013 authoring (when triggers met):** Trigger conjunction satisfied olduğunda ADR-0013'ü yaz. ADR-0009 §5.3 izolasyon kurallarının bu ürün için nasıl esnetileceği bu doc'un merkezinde olur.

4. **Connector discipline (always):** Her 3PL entegrasyonunu ADR-0007 prensipleriyle müşteriye finanse ettir. Customer-funded pattern dışına çıkma.

5. **Pricing pivot (when ADR-0013 written):** "Per-vehicle" modelden çık, "per-transaction" Enterprise+ tier'a konumlandır. Mevcut Starter/Professional değişmez.

---

## 8. Open questions (ADR-0013 öncesi araştırılacak)

1. **Hollanda 3PL API olgunluğu envanteri.** Picnic, Bringly, Trunkrs, DHL Express, GLS, PostNL Business — hangileri kurumsal API'si publish etmiş, hangileri partner-only? Henüz araştırılmadı.

2. **Stuart ve Wolt Business EU genişleme planları.** Bu sağlayıcılar Hollanda'da N2/N3 (vrachtauto) sınıfında aktif mi yoksa sadece bestelauto/scooter mi? Veriye ihtiyaç var.

3. **SiLK pattern revisited.** ADR-0011 §7 OUT-002 SiLK federated load pooling'i bilinçli dışlamıştı. ADR-0013 yazılırken bu kararın gerekçesi tekrar değerlendirilir — federation backend SiLK pattern'i implement eder mi, yoksa bilateral connectors yeterli mi?

4. **Connector framework Phase 3 yaklaşımı (ADR-0007 §4) için precondition.** 3 connector sonrası framework yazılır pattern'i 3PL/gig'e direkt uygulanabilir mi, yoksa orchestration'ın farklı domain özellikleri (örn. gig pool dinamiği) yeni pattern gerektirir mi?

5. **Liability ve sözleşme yapısı.** Dispatcher 3PL'e order atadığında SLA kim sağlar (TulipFleet platform, dispatcher customer, 3PL)? E&O insurance ne aşamada gerekir? Hollanda yasal çerçevesinde araştırma gerek.

---

## 9. Source — NotebookLM session 2026-05-27

Bu doküman NotebookLM cowork çıktısından konsolide edildi:
- FEAT-004 pilot çıktısı (4 aktör scope decision tablosu)
- Stratejik takip sorusu cevabı (5 alt-soru + 5-aksiyon checklist)
- Claude'un alıntı doğrulama analizi (3 §referansın test edilmesi)

Düzeltmeler (NotebookLM çıktısının ötesinde):
- **ADR-0002 §7 bağlam kayması** — vendor maliyeti vs ürün pricing karıştırılması, doc'tan çıkarıldı (Cem onayıyla, 2026-05-27)
- **ADR-0012 §7 atfı** — ROADMAP'teki §7 trigger conjunction referansıyla doğrulandı
- **ADR-0007 §3.2 atfı** — §2 madde 3 (kararı) + §3.2 (rationale) ikisi de geçerli kabul edildi

---

## 10. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-27 | Cem Bakir (with Claude + NotebookLM cowork) | İlk strategic roadmap draft. FEAT-004 pilot scope analysis sonucu — 3PL ve gig için ayrı ürün yaklaşımının kayıt altına alınması. ADR-0013 yazılana kadar referans olur. |
