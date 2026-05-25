# ADR-0012: NL Compliance Layer Strategy

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Status**        | Accepted                                                               |
| **Version**       | 1                                                                      |
| **Date**          | 2026-05-14                                                             |
| **Decision by**   | Cem Bakir (Founder / Lead Engineer)                                    |
| **Component**     | NL Compliance Layer (yeni, ürün-içi modül + potansiyel standalone ürün) |
| **Related**       | ADR-0002 (VRP solver), ADR-0003 (Server topology), ADR-0004 v3 (Database strategy), ADR-0007 (Telematics integration — customer-funded pattern), ADR-0009 (Integration map), ADR-0010 (ML strategy), ADR-0011 (Use case scope) |

---

## 1. Context

Hollanda lojistik pazarı 2026'ya doğru iki büyük regülasyon dalgasıyla karşı karşıya:

**Vrachtwagenheffing (HGV Tolling).** Temmuz 2026 yürürlük. Kilometre bazlı kamyon vergisi; tüm 12+ ton kamyonlar için yeni yapısal maliyet kalemi (structurele kostenpost). Operatörler için rota planlamasında yakıttan sonraki en büyük değişken maliyet.

**ZE-Zones (Sıfır Emisyon Bölgeleri).** 18 Hollanda şehrinde 2025–2026 boyunca aşamalı yürürlük. Belediye düzeyinde dinamik kurallar; "ontheffing" (muafiyet) kriterleri her şehirde farklı, sürekli güncelleniyor. Utrecht örneği: başlangıç tarihini 1 Ocak 2026'dan 1 Mayıs 2026'ya öteledi.

NotebookLM discovery (2026-05-14) bu iki konuda kritik bir bulgu üretti: **Hollanda'da "tek veri noktası" yok**. Veri kaynakları dağınık (`vrachtwagenheffing.nl`, evofenedex, TLN, RDW, 18 belediyenin kendi `toegangsbeleid` sistemleri); KOBİ'lerin %80'i "digital ready" değil; yasal cezalar gerçek ve büyük.

Bu, iki ayrı stratejik fırsat anlamına gelir:

**Stratejik fırsat 1 — Defansif.** TulipFleet dispatcher müşterileri için bu compliance verisini sağlamak Phase 1'de **yasal zorunluluk**. Sağlamazsak, dispatcher kullanılamaz hale gelir Temmuz 2026 sonrası.

**Stratejik fırsat 2 — Offansif.** Eğer compliance verisini sağlama altyapısı bağımsız servis olarak kurulursa, Phase 3'te **standalone product** olarak Geotab/Verizon/Samsara dispatcher müşterilerine de satılabilir. Bu, vertical SaaS'tan B2B data product'a evrim demek; defensible moat kaynağı.

ADR-0012 bu iki fırsatı tek bir 3-aşamalı strateji altında birleştirir. Phase 1'de yapılacak mimari kararlar **her iki yola da hazır** olmalı; aksi halde Phase 3'te yeniden yazma riski doğar.

## 2. Decision

NL Compliance Layer üç aşamalı bir evolution planında geliştirilir:

| Phase | Kapsam | Tetikleyici | Müşteri | Pricing |
| ----- | ------ | ----------- | ------- | ------- |
| **Phase 1: Internal use only** | Manuel seed data, dispatcher-internal API, Vrachtwagenheffing + ZE-Zone basic check | ROADMAP Sıra 1 schema migration | Sadece TulipFleet dispatcher | Dispatcher SaaS pricing'e dahil |
| **Phase 2: Premium tier feature** | RDW + `vrachtwagenheffing.nl` API connectors, real-time updates, ontheffing tracking | Paying customer asks (customer-funded per ADR-0007) | TulipFleet dispatcher customer'ları | +200–500 €/ay "Compliance Pro" tier |
| **Phase 3: Standalone product (CaaS)** | Bağımsız mikro servis, public API, SLA contracts, E&O insurance | 3 trigger conjunction (Section 7) | Geotab/Verizon/Samsara users + direct API consumers | Per-call veya tier-based subscription |

Phase 1'de **mimari kısıt** şudur: Compliance Layer'ın kod ve veri yapısı, **Phase 3 standalone product'a evrilebilir** olmalı. Bu, somut implementation kararlarını şekillendirir (Section 4).

## 3. Three-Phase Strategy Detail

### 3.1 Phase 1 — Internal Use Only (concurrent with MVP launch)

**Kapsam:**

- `enterprise.nl_compliance_zones` tablosu (yeni)
- 18 Hollanda ZE-Zone şehri için **manuel seed** polygon + kural (her belediyenin `toegangsbeleid` dokümanı kaynak alınarak)
- Vrachtwagenheffing **statik tarife tablosu** (Temmuz 2026 yürürlük tarifelerine göre, kullanıcı update'leri manuel)
- Dispatcher backend internal API: `POST /api/dispatcher/compliance/check-access`
- Plan generation sırasında compliance check otomatik tetiklenir (FEAT-002, ADR-0011)
- HERE Tour Planning'e zone'lar **avoidance area** olarak parametre geçilir

**Yapılmayanlar (Phase 1'de bilinçli olarak dışarıda):**

- Real-time API consumption (RDW, belediye CVD)
- Public API exposure
- SLA commitments
- E&O insurance
- Customer-facing compliance UI (sadece dispatcher backend internal)
- Vrachtwagenheffing canlı API consumption (Temmuz 2026 öncesi mümkün değil zaten)

**Effort tahmini:** 1-2 hafta development + 1 hafta veri seed (her şehir için manuel polygon + kural inceleme).

**Mimari kısıt — kritik:** Phase 1 kodu, Phase 3 standalone microservice'e **refactor edilebilir** olmalı. Compliance check endpoint'i:

- `/api/dispatcher/compliance/check-access` değil, **`/api/compliance/check-access`** (dispatcher-specific olmayan path)
- Authentication katmanı dispatcher JWT ve standalone API key arasında **swap edilebilir** olmalı
- Compliance servisi kendi PostgreSQL connection pool'unu kullanmalı (dispatcher backend pool'unu paylaşmamalı)
- Maintenance worker'lar **ayrı process** olarak çalışmalı (ileride ayrı container)

Bu kısıtlar Section 4'te detaylı.

---

**Addendum (2026-05-25 — minor consistency clarification):** Vrachtwagenheffing statik tarife tablosu (`enterprise.nl_vrachtwagenheffing_tariffs`) Phase 1.1 (ROADMAP FEAT-008) altına yeniden sınıflandırıldı.

- **Sebep:** Tablonun tüketicisi olan FEAT-008 (Vrachtwagenheffing route cost optimization) ROADMAP Phase 1.1'de listelenmişti (MVP launch'tan 1–4 hafta sonra). Tablonun Phase 1, tüketicisinin Phase 1.1 olması belge tutarsızlığı yaratıyordu. Bu addendum tutarsızlığı tüketici fazına hizalayarak çözer.
- **Schema migration:** `1779200000001_create-enterprise-nl-vrachtwagenheffing-tariffs` migration dosyası **yine Sıra 2.9.2'de uygulanır** (marjinal maliyet ~0; aynı staging+production migration penceresinde ek tablo yaratmak ileride compliance polygon seed'i sonrası schema-write disruption riskini önler).
- **Ne ertelendi:** Statik tarife seed verisi (Temmuz 2026 yayınlanmış tarifeler) + tablonun consume edilmesi (route cost optimization logic).
- **Pattern:** Bu addendum ADR-0009 §4.5.1 ile aynı pattern — minor consistency clarification, yeni ADR version'ı değil. ADR-0012'nin 3-aşamalı stratejik kararı aynen geçerlidir.

### 3.2 Phase 2 — Premium Tier Feature

**Trigger:** Bir paying dispatcher customer şunlardan birini ister:

- "Vrachtwagenheffing maliyet optimizasyonu için real-time tarife verisi"
- "Belediye ontheffing başvuru durumumu sistemde görmek istiyorum"
- "ZE-Zone kuralları değişince anında bildirim alayım"

Yani: Customer-funded trigger, ADR-0007 connector pattern (Geotab connector'la aynı disiplin).

**Kapsam — eklenenler:**

- `vrachtwagenheffing.nl` API consumer (live tarife verisi, Temmuz 2026 sonrası)
- RDW (Araç Kayıt Kurumu) plaka-based vehicle profile lookup
- Belediye CVD (Centraal Voertuig Dossier) connector — her şehir için ayrı yazılır, ilk müşteri 1-2 şehirle başlar
- evofenedex / TLN kural değişiklik feed monitoring (manuel + scrape hybrid)
- Nightly update worker — `enterprise.nl_compliance_zones` synchronizasyonu
- Webhook: `compliance.rule_changed` — customer dispatcher refresh edebilir
- Dispatcher UI'da compliance status panel (read-only)

**Yapılmayanlar (hâlâ):**

- Public API (sadece TulipFleet dispatcher customer'larına)
- Geotab/Verizon dispatcher customer'larına satış
- SLA contracts (best-effort sağlanır, formal commitment yok)

**Pricing:** Compliance Pro tier — base dispatcher SaaS pricing + 200–500 €/ay/firma. Customer fee, bağlanan kaynak başına marginal cost düşer (Vrachtwagenheffing API tek connector, sonra her belediye CVD ayrı geliştirme).

**Effort tahmini:** İlk müşteri için 4-6 hafta (1 belediye + Vrachtwagenheffing + RDW). Sonraki belediyeler 1-2 hafta marginal.

### 3.3 Phase 3 — Standalone Product (Compliance-as-a-Service / CaaS)

**Trigger:** Üç şartın **conjunction**'ı (hepsi birden):

1. Vrachtwagenheffing **12 aylık operasyonel veri** birikmiş (yani en erken Temmuz 2027)
2. 18 ZE-Zone şehrinin en az 10'unda **doğrulanmış ontheffing başarı verisi** var
3. **10+ paying dispatcher customer**'ı Compliance Pro tier'da aktif

**Kapsam — eklenenler:**

- Public REST API: `compliance.tulipfleet.com` (yeni subdomain, Hetzner CX32 ayrı servis)
- API key authentication (TulipFleet dispatcher JWT'den bağımsız)
- SLA contracts (99.9% uptime, <500ms response, $X penalty for breach)
- E&O insurance (Errors & Omissions — yanlış data müşteriye zarar verirse)
- Public documentation portal (Stripe-style API reference)
- Pricing tiers: per-call (low-volume), monthly subscription (high-volume)
- Marketing positioning: "NL Logistics Compliance API"
- Optional: Belçika ve Almanya LEZ (Low Emission Zone) genişlemesi

**Yapılmayanlar:**

- Hâlâ ML-driven prediction değil (rule-based + curated data)
- Dispatcher functionality not duplicated in CaaS — sadece compliance data + check

**Pricing model outline (Phase 3 launch zamanı netleşir):**

- Free tier: 1.000 calls/month (developer onboarding)
- Starter: 50€/month, 50.000 calls
- Professional: 200€/month, 500.000 calls + SLA
- Enterprise: Custom pricing, dedicated support, custom integrations

**Müşteri kategorileri:**

| Kategori | Açıklama | Örnek |
| -------- | -------- | ----- |
| **Cat 1** | Rakip dispatcher kullanıcıları | Geotab/Verizon/Samsara dispatcher kullanan NL firmaları, compliance verisini bizden alır |
| **Cat 2** | Doğrudan API tüketicileri | TMS/ERP geliştiricileri, sigorta şirketleri, in-house dev ekipleri, belediyeler/yasal kuruluşlar |

**Effort tahmini:** 3-4 ay full-time (developer + part-time legal counsel). Tetikleyici şart şu an karşılanmıyor, plan yaklaşık.

## 4. Architectural Constraints (Phase 1'de uyulması zorunlu)

NotebookLM denetim çıktısının özellikle vurguladığı mimari disiplin: **Phase 1 internal use olsa bile, Phase 3 standalone'a hazır olarak kurgulanmalı.** Aksi halde Phase 3'te yeniden yazma riski büyük olur.

Bu kısıtlar somut implementation kararları olarak yazılır:

### 4.1 URL path naming

Compliance endpoint'leri **dispatcher-specific path** kullanmaz:

- ❌ `/api/dispatcher/check-zone-access`
- ✅ `/api/compliance/check-zone-access`

Phase 3'te bu path bağımsız servise taşınınca **path değişmez** — sadece host değişir (`enterprise-api.tulipfleet.com/api/compliance/*` → `compliance.tulipfleet.com/api/compliance/*`).

### 4.2 Authentication abstraction

Phase 1'de dispatcher JWT kullanılır ama auth katmanı **swap edilebilir** olmalı:

- Bir `authStrategy` interface'i tanımla: `verifyAccess(request) → { allowed, customer_id, tier }`
- Phase 1 implementation: JWT verification, all dispatcher customers = 'internal' tier
- Phase 2 implementation: JWT verification + Compliance Pro tier check
- Phase 3 implementation: API key verification + tier check

Endpoint kodu auth strategy'yi soyut çağırır; concrete implementation environment'a göre wire'lanır.

### 4.3 Database connection pool isolation

Compliance module **kendi connection pool'unu** kullanır:

- `enterprise_backend` rolü ile aynı PostgreSQL'e bağlanır
- Ama Fastify plugin olarak ayrı pool tanımlanır
- Pool size: 5 (conservative, Phase 1 düşük yük)
- Phase 3'te bu pool ayrı servise taşınınca **sadece connection string değişir**

### 4.4 Worker process separation

Compliance veri güncelleme job'ları (Phase 2 nightly sync, scraper'lar) **ayrı process** olarak deploy edilir:

- PM2 process name: `compliance-worker` (dispatcher backend `enterprise-backend` ile aynı sunucuda olsa bile ayrı process)
- Stdout/stderr ayrı log dosyalarına
- Phase 3'te bu worker'lar başka sunucuya taşınır — PM2 config değişir, kod değişmez

### 4.5 Schema authority remains tulipfleet-backend

ADR-0009 §4.5 addendum'u uyarınca: Compliance Layer migration'ları **tulipfleet-backend'in `migrations/` klasöründe** yazılır. Phase 3'te ayrı servis olsa bile schema authority değişmez. Sebep: Tek source-of-truth disiplini, drift önlenir.

### 4.6 Data versioning

`enterprise.nl_compliance_zones` her satır için **versiyonlu**:

- `effective_from date NOT NULL`
- `effective_to date NULL` (NULL = hâlâ geçerli)
- `source text NOT NULL` (örn. "amsterdam_toegangsbeleid_v2026.05")
- `source_url text NULL`
- `last_verified_at timestamptz NOT NULL DEFAULT NOW()`

Audit trail Phase 3'te E&O insurance için kritik (hangi kural ne zaman geçerliydi, hangi kaynaktan geldi). Phase 1'de bu yapı kurulur, kullanım minimal.

### 4.7 PostGIS adoption

PostGIS extension Phase 1'de **aktif edilir** (production'da `postgis 3.3.2` already available, sadece `CREATE EXTENSION` gerekir).

- `enterprise.nl_compliance_zones.polygon` kolonu: `GEOMETRY(POLYGON, 4326)`
- Phase 1'de 18 zone az ama point-in-polygon native query Phase 3 scale için altyapı
- JSONB içinde GeoJSON depolayıp sonra migrate etmek yerine doğrudan doğru tipte başlamak — refactor borcu sıfır

PostGIS aktivasyonu staging'de önce test edilir, sonra production migration. ROADMAP Sıra 1 kapsamında.

## 5. Schema Design (Phase 1)

Tek yeni tablo:

```sql
CREATE TABLE enterprise.nl_compliance_zones (
  zone_id            TEXT PRIMARY KEY,
  city               TEXT NOT NULL,
  zone_type          TEXT NOT NULL
                       CHECK (zone_type IN ('ze_zone', 'weight_restriction',
                                            'time_window', 'tolling_corridor',
                                            'environmental')),
  polygon            GEOMETRY(POLYGON, 4326) NOT NULL,
  rules              JSONB NOT NULL,
  effective_from     DATE NOT NULL,
  effective_to       DATE,
  source             TEXT NOT NULL,
  source_url         TEXT,
  last_verified_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_zones_city ON enterprise.nl_compliance_zones (city);
CREATE INDEX idx_compliance_zones_polygon
  ON enterprise.nl_compliance_zones USING GIST (polygon);
CREATE INDEX idx_compliance_zones_effective
  ON enterprise.nl_compliance_zones (effective_from, effective_to);

CREATE TRIGGER trg_compliance_zones_updated_at
  BEFORE UPDATE ON enterprise.nl_compliance_zones
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
```

`rules` jsonb örneği:

```json
{
  "min_emission_class": "Euro VI",
  "max_weight_kg": 7500,
  "time_windows": [
    {"days": ["mon","tue","wed","thu","fri"], "start": "07:00", "end": "11:00"}
  ],
  "exempt_categories": ["zero_emission_under_4250kg", "essential_services"],
  "exemption_process": "ontheffing_request_required",
  "exemption_url": "https://amsterdam.nl/ontheffing-aanvraag"
}
```

Tablonun **`tulipfleet-backend/migrations/`** klasörüne migration olarak yazılır (ADR-0004 v3 ile uyumlu — `enterprise.*` schema authority orada).

## 6. Risk Management

### 6.1 Yanlış data sorumluluğu

**Risk:** Phase 2-3'te yanlış compliance data → müşteri ceza alır → tazminat talep eder.

**Mitigasyon Phase 1:** Internal use only — yanlış data tek başına TulipFleet kullanılmaz. Dispatcher UI'da disclaimer: "Compliance verisi 2026-05-14 itibariyle manuel olarak girilmiştir; resmi kaynaklara başvurun."

**Mitigasyon Phase 2:** Customer onboarding sözleşmesinde "best-effort" clause; customer kendi resmi doğrulama yapacağını kabul eder.

**Mitigasyon Phase 3:** E&O insurance şart (yıllık ~2.000–5.000 €), SLA contracts liability cap içermeli.

### 6.2 Maintenance burden

**Risk:** 18 belediye + Vrachtwagenheffing + evofenedex/TLN bültenleri sürekli izlenmeli. Tek developer + part-time legal counsel yetmeyebilir.

**Mitigasyon Phase 1-2:** Manuel update, monthly review cycle, dispatcher UI'da "last_verified" gösterimi (eski data uyarısı).

**Mitigasyon Phase 3:** Dedicated part-time researcher (freelance, ~10 saat/hafta); otomatik scraper monitoring; community contribution (eğer kanal açılırsa müşteriler kural değişikliği bildirir).

### 6.3 Yasal pozisyon belirsizliği

**Risk:** "Compliance-as-a-Service" satmak Hollanda'da düzenleyici onay gerektirebilir mi (örn. data protection, professional liability).

**Mitigasyon:** Phase 1'de internal use — yasal mesele yok. Phase 2 öncesi Dutch hukuk firması ile 1-2 saatlik consultation (~300-500 €) ile pozisyon doğrulanmalı. Phase 3 launch öncesi formal legal review (~2.000–5.000 €).

### 6.4 Veri kaynaklarının erişim kesintisi

**Risk:** `vrachtwagenheffing.nl` API down olursa, RDW rate-limit gelirse, belediye CVD endpoint değiştirirse — compliance check broken.

**Mitigasyon:**

- Her connector için **cache** (compliance verisi günlük scale'de değişir, real-time gerekmez)
- Stale data warning UI'da (e.g. "Last update 3 hours ago")
- Fallback to static seed data (Phase 1 manuel seed Phase 2'de fallback olur)
- Health check her connector için, alarm trigger

## 7. Phase 3 Trigger Verification

Phase 3'e geçiş **otomatik** değil; üç şartın aynı anda sağlandığı **kararla** geçilir. Şartlar:

### Trigger 1 — Vrachtwagenheffing veri olgunluğu

**Kriter:** En az 12 aylık aktif Vrachtwagenheffing operasyonel veri birikmiş (gerçek km maliyet, ceza verisi).

**Earliest possible date:** Temmuz 2027 (Vrachtwagenheffing Temmuz 2026 yürürlük + 12 ay).

**Doğrulama:** `enterprise.dispatch_tasks` üzerinden 12+ ay öncesine kadar uzanan Vrachtwagenheffing cost data sorgu ile.

### Trigger 2 — ZE-Zone ontheffing başarı oranı

**Kriter:** 18 Hollanda ZE-Zone şehrinin en az 10'unda ontheffing başvuru-onay başarı oranı doğrulanmış (yani API'mizin önerdiği muafiyet kategorileri **gerçekten** kabul ediliyor).

**Doğrulama:** Phase 2 müşteri feedback + belediye onay statistikleri (manuel olarak toplanır, evofenedex/TLN raporları ile çapraz kontrol).

### Trigger 3 — 10+ paying Compliance Pro customers

**Kriter:** 10 veya daha fazla TulipFleet dispatcher customer'ı **aktif** Compliance Pro tier'da, en az 6 aydır.

**Doğrulama:** Stripe / billing system query.

**Tüm üç şart sağlandığında:** Phase 3 launch ADR'ı (ADR-00XX, ileride numaralanır) yazılır. Bu ADR şunları içerir:

- Pricing tiers
- SLA commitments
- E&O insurance kapsamı ve sigortacı
- Public API documentation strategy
- Marketing launch plan
- Standalone service infrastructure (ayrı subdomain, ayrı server, ayrı monitoring)
- Internal handoff: dispatcher backend dependency'sinin azaltılması (Phase 3 standalone'da dispatcher'a bağımlı olmamalı)

Eğer 3 şartın 2'si sağlanırsa, kalan 1 şart için **bekle**. Erken launch Phase 3'ün katma değerini zayıflatır.

## 8. Consequences

### 8.1 Positive

- **Phase 1'de net minimal scope:** Manuel seed, internal API, 1-2 hafta development + 1 hafta veri. MVP launch'ı geciktirmez.
- **Architectural foresight:** Phase 1 kodu Phase 3 standalone'a refactor edilebilir, **gelecekte yeniden yazma yok**.
- **Defansif değer Day-1:** Temmuz 2026 sonrası Vrachtwagenheffing + ZE-Zones nedeniyle dispatcher müşterileri compliance verisi olmadan ürünü kullanamaz. Bu MVP'nin **olmazsa olmazı**.
- **Stratejik moat hazırlığı:** Phase 3'e geçince Geotab/Verizon dispatcher müşterileri **TulipFleet'in compliance API'sini kullanmak zorunda** kalır. Bu, vertical SaaS'ın B2B data product'a evrim aşaması.
- **Customer-funded discipline:** Phase 2 ve 3 trigger'ları somut, ölçülebilir. Spekülatif development engelleniyor (ADR-0007 ile uyumlu).
- **NL pazar uyumu:** Vrachtwagenheffing + ZE-Zones, NotebookLM discovery'nin işaret ettiği iki en kritik NL pain point. Ürün bu pain point'leri direkt hedefliyor.

### 8.2 Negative / accepted trade-offs

- **PostGIS bağımlılığı eklendi:** Production PostgreSQL'e yeni extension yüklenecek. Test edilmesi gereken bir değişiklik. Staging'de önce, sonra production. ROADMAP Sıra 1 kapsamında küçük overhead.
- **Manuel data maintenance Phase 1-2:** 18 şehir + Vrachtwagenheffing kuralları sürekli güncellenmeli. Tek developer için ek yük (~2-4 saat/ay). Phase 3 öncesi otomasyon zorunlu.
- **Yasal sorumluluk yumağı Phase 3:** E&O insurance, SLA, professional liability — küçük şirket için ciddi yönetim yükü. Phase 3 trigger'ları sıkı tutuldu çünkü bu yük hafife alınamaz.
- **Phase 3 net müşteri kategorisi kestirilemiyor:** Cat 1 (rakip dispatcher kullanıcıları) ve Cat 2 (doğrudan API) Phase 3'te netleşir. Phase 1-2'de specific GTM yapılmaz, sadece architectural readiness korunur.
- **Compliance API rakipleri ortaya çıkabilir:** TulipFleet ilk hareket eden olsa bile, Phase 3'e gelene kadar (2027+) başka oyuncular pazara girebilir. Discovery sonucu "henüz konsolide değil" demek "girilebilir" anlamına da geliyor; ilk hareket avantajı asıl koruma.

## 9. Open Questions

- **HERE Tour Planning'in environmental zones desteği Hollanda ZE-Zone'larını ne kadar kapsıyor?** Eğer HERE bizim seed verimizden daha güncel ZE-Zone polygon'ları sağlıyorsa, Phase 1 effort daha da düşer. HERE dokümantasyonu incelemesi sonraki seansta.
- **Vrachtwagenheffing sandbox / test API var mı?** Temmuz 2026 öncesi geliştirme için. `vrachtwagenheffing.nl` dokümantasyon kontrol edilecek.
- **PostGIS aktivasyonu staging'de test gerekli — TimescaleDB ile uyumluluk doğrulanmalı.** İkisi birlikte production kullanımları yaygın ama edge case'ler var; staging migration sırasında izlenecek.
- **Vrachtwagenheffing tarife tablosu format ne?** PDF, JSON API, CSV download — kaynak format Phase 1 manuel seed sürecini etkiler.
- **Belçika ve Almanya LEZ Phase 3 kapsamı düşünülmeli mi?** Cross-border NL→DE/BE rotalar yaygın. ADR-0012 Phase 3 launch ADR'ında değerlendirilir.
- **Compliance Pro tier 200–500 €/ay pricing range nasıl validate edilir?** Phase 2 ilk müşteri görüşmesinde competitive intelligence ile.
- **Dutch hukuk firması seçimi — kim?** Phase 2 öncesi araştırılacak; logistics/tech specialty olan firmalar tercih.

## 10. References

- ADR-0002 (HERE Tour Planning — VRP solver, environmental zones potential)
- ADR-0003 (Server topology — Phase 3 standalone subdomain hazırlığı)
- ADR-0004 v3 (Database strategy — schema authority disiplini)
- ADR-0007 (Telematics integration — customer-funded pattern source)
- ADR-0009 (Integration map — §4.5 Compliance Engine addendum referansı)
- ADR-0010 (ML strategy — Phase 3 ML capability ayrı bir karardır)
- ADR-0011 (Use case scope — FEAT-008 Vrachtwagenheffing routing)
- NotebookLM Compliance discovery (2026-05-14) — `vrachtwagenheffing.nl`, evofenedex, TLN, RDW veri ekosistemi araştırması
- evofenedex digital readiness research (80% KOBİ not digital-ready)
- Vrachtwagenheffing.nl — official platform (Temmuz 2026 yürürlük)
- ROADMAP (Phase 1 Sıra 1, schema migration kapsamı)

---

## 11. Change Log

| Version | Date       | Author    | Change                                                  |
| ------- | ---------- | --------- | ------------------------------------------------------- |
| 1       | 2026-05-14 | Cem Bakir | Initial decision: 3-phase strategy (Internal → Premium → Standalone). Architectural microservice-ready constraints. PostGIS adoption. Phase 3 trigger conjunction (Vrachtwagenheffing 12-month data + ZE-Zone exemption verification + 10 paying customers). |
| 1 (Addendum) | 2026-05-25 | Cem Bakir | §3.1 Addendum: Vrachtwagenheffing statik tarife tablosu Phase 1'den Phase 1.1'e (FEAT-008) taşındı — tüketici fazına hizalama. Schema migration `1779200000001_create-enterprise-nl-vrachtwagenheffing-tariffs` yine Sıra 2.9.2'de uygulanır; seed verisi ve consuming logic Phase 1.1'e ertelendi. Minor consistency clarification per ADR-0009 §4.5.1 pattern; yeni ADR version'ı değil, stratejik karar değişmedi. |
