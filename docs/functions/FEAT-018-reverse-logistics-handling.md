# FEAT-018 — Reverse Logistics Handling

| Field | Value |
|---|---|
| **Feature ID** | FEAT-018 |
| **Source** | Wishlist W18 — "Reverse Logistics Handling" |
| **Frequency rating** | Common |
| **Tulipfleet Phase** | Phase 1.1 (A customer pickup + B failed delivery RTS) + Phase 2 (C RMA lifecycle) + Phase 2.5 (D warehouse hierarchy + E CRM/CSAT, customer-funded) |
| **Spec readiness** | v2 (2026-10-13) — akademik yaşam döngüsü (Shipment & Return Lifecycle) terminolojisiyle genişletildi, kural tabanlı durum geçiş matrisi netleştirildi, WMS/CRM/audit-trail prensipleri ayrıştırıldı |
| **Status** | Spec-only — hiçbir satır kod/migration henüz yazılmadı (bkz. §0 gatekeep) |

> **Not (ID tutarsızlığı):** `docs/ROADMAP.md`'nin Wishlist Coverage Matrix tablosu W18'i `FEAT-109` olarak gösteriyor, ama bu spec dosyasının adı ve ROADMAP'in kendi Phase-2-zinciri tablosu (`FEAT-018 Reverse ...`) `FEAT-018` kullanıyor. Bu dosya, dosya adı + ROADMAP'in çoğunluk kullanımıyla tutarlı kalıp `FEAT-018` kullanmayı sürdürüyor. ROADMAP'teki W18 satırının `FEAT-109`'u düzeltilmesi ayrı, küçük bir doküman-hijyen maddesi — bu rewrite'ın kapsamı dışında bırakıldı.

---

## 0. Gatekeep bulguları (bu rewrite'tan önce doğrulanan gerçekler)

Kod/DB'ye bakılmadan devam edilmedi:

1. **Phase 1.1 şeması (`direction`/`parent_task_id`) hiçbir zaman uygulanmadı.** `tulipfleet-backend` ve `tulipfleet-enterprise-backend` migration klasörlerinde bu kolonlara dair hiçbir iz yok. v1'den (2026-05-30) beri bu spec üzerinde hiç kod yazılmamış — bu rewrite da yalnızca spec, implementasyon değil.
2. **v1'in "cross-spec sync TODO" iddiası kısmen YANLIŞ çıktı — düzeltildi:** `returns_pickup_failed` ve `rts_warehouse_unreachable` exception type'ları **zaten canlı** — `tulipfleet-backend migrations/1782800000000_bug1-overlap-foundation.sql`, `enterprise.exception_events.exception_type` CHECK constraint'inde mevcut (muhtemelen başka bir pilot/oturumda toplu eklenmiş, bu spec'in kendi commit'i değil). **Gerçekten açık kalan tek parça:** `FEAT-010-automated-exception-handling.md`'nin kendi Severity Matrix dokümantasyonunda bu 2 değer hâlâ yok — DB'de var, dokümantasyonda yok. §6'da bu netleştirildi.
3. **`public.warehouses` ve `enterprise.customer_feedback` hiçbir repoda yok** — ikisi de bu rewrite'ta sıfırdan tasarlanan, henüz migration'ı yazılmamış yeni tablolar (§3).
4. **`enterprise.exception_events` fiziksel olarak `tulipfleet-backend` repo'sunun migration'larıyla yönetiliyor**, `tulipfleet-enterprise-backend` (Fastify API servisi) değil — Postgres şema adı `enterprise` olsa da, migration sahipliği core backend'de. Referanslarda bu doğru repo adıyla anılıyor.

---

## 1. Genişletilmiş Feature Tanımı ve Akademik Yaşam Döngüsü (Shipment & Return Lifecycle)

### 1.1 Wishlist tanımı

> *"This use case involves managing the complex process of picking up, transporting, and storing customer returns and replacements."*

### 1.2 Akademik aşama ↔ TulipFleet karşılığı — kapsam haritası

Her akademik lojistik aşaması TulipFleet'in gerçek mimarisine (ADR-0002 VRP solver, ADR-0005 Advisory mode, ADR-0011 K/M-segman kapsamı) karşı denetlendi. Bir aşama ürünün gerçek kapsamına uymuyorsa, zorla içeri sokulmadı — gerekçeli olarak kapsam dışı bırakıldı.

| Akademik aşama (APICS/CSCMP) | TulipFleet karşılığı | Kapsam kararı |
|---|---|---|
| **Order Initiation & Reservation** | RMA talep girişi (FN-10 `POST /rma/requests`); depo slotu rezervasyonu | RMA: içeride (Faz 2). Slot rezervasyonu: **Faz 2.5**, FEAT-006 dock appointment'ın (zaten var olan) bir uzantısı — yeni kavram değil |
| **Inbound / Warehousing & ASN** | `syncWarehouseReturn` (FN-14) — araç depo geofence'ine girince tetiklenir | **Kısmi.** Gerçek ASN (Advanced Shipping Notice) üretimi/protokolü müşterinin WMS'inin işi (SAP EWM, Manhattan vb.) — TulipFleet bunu **üretmez**, sadece "received" event'ini WMS connector üzerinden **tüketir** (ADR-0007 §3.2 adapter pattern). Kendi ASN şemamızı icat etmek over-engineering olur |
| **Cross-Docking & Sorting** | Yeni: çok-depolu hiyerarşi, `warehouse_type='cross_dock_hub'` ara durak | **Faz 2.5**, opsiyonel — şirket gerçekten birden fazla depo/hub kullanıyorsa devreye girer, kullanmıyorsa `warehouses` tablosu tek satırla (tek merkezi depo) sorunsuz çalışır (additive, geriye dönük nötr) |
| **Line-Haul / Trunking** | — | **KAPSAM DIŞI, gerekçeli.** TulipFleet Advisory-mode VRP ile bölgesel/last-mile dispatch yapan bir ürün (ADR-0002 HERE Tour Planning, ADR-0011 K/M-segman 50–300 araçlık filolar). Uzun-hat ana taşıma (line-haul network optimization, multi-echelon hub-and-spoke) tamamen farklı bir problem sınıfı ve farklı bir ürün kategorisi — mevcut VRP mimarisine zorla eklenmesi yanlış olur. Bir şirketin gerçekten line-haul ihtiyacı çıkarsa bu ayrı bir ADR/feature konusu |
| **Last-Mile Delivery & PoD** | Mevcut — FEAT-011 PoD Capture'a delege | İçeride (delegasyon, v1'den değişmedi) |
| **Reverse Logistics, RMA & RTS** | Spec'in çekirdeği — alt-paradigma A/B/C | İçeride (v1'den korunur, §2'de netleştirildi) |

### 1.3 3 alt-paradigma — kapsam ayrımı (v1'den değişmeden korunur)

| Alt-paradigma | Detay | Phase | Fonksiyon |
|---|---|---|---|
| **A) Customer pickup (return)** | Driver müşteri adresine gidip return alır. HERE Tour Planning mixed pickup/delivery (ADR-0002 §3.2 native). | 1.1 | FN-01, FN-02, FN-04, FN-05, FN-07, FN-09 |
| **B) Failed delivery → return-to-sender (RTS)** | Teslim edilemeyen paket otomatik warehouse'a döner. FEAT-017 locker reverse paralel pattern. | 1.1 | FN-03, FN-06, FN-08 |
| **C) RMA lifecycle** | Customer return talebi → schedule → pickup → warehouse → processed → replacement (opsiyonel). State machine. | 2 | FN-10, FN-11, FN-12, FN-13, FN-14, FN-15, FN-16 |
| **D) Depo hiyerarşisi (yeni, v2)** | Çok-depolu/multi-hub yapı, cross-dock ara durak | 2.5 | FN-17 |
| **E) CRM/CSAT/SLA geri bildirimi (yeni, v2)** | İade sonrası müşteri memnuniyeti + şikayet + SLA ihlali kaydı | 2.5 | FN-18, FN-19 |

### 1.4 Önceki FEAT'lerle delegasyon (v1'den korunur)

| Önceki | Delegasyon noktası |
|---|---|
| **FEAT-017:FN-11** `onCustomerLockerDropoff` | `locker_return` türü FEAT-017'ye delege edilir, FEAT-018 yeniden yazmaz |
| **FEAT-001:FN-016** `buildHereProblem` | Mixed pickup/delivery extension burada (FN-07) |
| **FEAT-002:FN-02** `POST /replan` | RTS sırasında failed delivery re-plan tetikler |
| **FEAT-009 carbon** | Return loads emission tracking |
| **FEAT-010:FN-06** `logExceptionEvent` | `returns_pickup_failed`, `rts_warehouse_unreachable` — **zaten canlı**, bkz. §0.2 |
| **FEAT-006:FN-08** dock appointment | Warehouse return arrival appointment + depo slot rezervasyonu (Faz 2.5 §1.2) |
| **FEAT-011 PoD Capture** | RMA dokümantasyonu (CMR/irsaliye) — FEAT-018 kendi dokümantasyon disiplinini icat etmez |

### 1.5 Kapsam — içeride / dışarıda (güncellendi)

**İçeride:** 3 alt-paradigma (A/B/C) + depo hiyerarşisi (D, Faz 2.5) + CSAT/şikayet/SLA geri bildirimi (E, Faz 2.5) · HERE mixed pickup/delivery · `direction`+`parent_task_id` · `enterprise.rma_requests` · `public.warehouses` (yeni) · `enterprise.customer_feedback` (yeni) · WMS connector'a TEK giriş noktası (FN-14) · cross-spec: FEAT-001/002/006/009/010/011/017

**Dışarıda:** Replacement product catalog (e-ticaret SKU) · Customer-facing return portal UI (Phase 3 ADR) · Refund processing (finance sistemi) · International customs declaration (Phase 3+) · Return condition AI inspection (Phase 3+) · Return reason prediction ML (Phase 3+, ADR-0010 §3.5) · **Line-haul/trunking ağ optimizasyonu** (yeni, §1.2 gerekçeli) · **Genel amaçlı WMS/CRM inşası** — TulipFleet kendi WMS'ini veya CRM'ini yazmaz, sadece adapter/connector noktası sağlar (§5)

---

## 2. Kural Tabanlı Durum Geçiş Engine'i (Automated vs. Dispatcher Approval State Machine)

v1'in state machine'i (rma_requested → approved/rejected → pickup_scheduled → in_transit → warehouse_received → processed → closed) değişmedi — ama hangi geçişin **otomatik** (event/IoT/geofence-tetikli) hangisinin **dispatcher onayı** (Mode 1 Advisory, ADR-0005 §2: *"The system suggests dispatch decisions. The dispatcher approves every action before it takes effect."*) gerektirdiği v1'de örtüktü. v2 bunu açık bir matrise döküyor.

| Geçiş | Tetikleyici | Mod | Mekanizma |
|---|---|---|---|
| `rma_requested` → `approved` / `rejected` | Dispatcher kararı | **Dispatcher onaylı** (Mode 1) | `evaluateRmaDecision` (FN-11) — ADR-0005 §2 |
| `approved` → `pickup_scheduled` | Onay sonrası otomatik | **Otomatik** | `createReturnTask` (FN-01) tetiklenir |
| `pickup_scheduled` → `in_transit` | Driver mobile "pickup completed" | **Otomatik** | Mevcut task completion event akışı |
| `in_transit` → `warehouse_received` | Araç depo geofence'ine girer | **Otomatik, geofence-tetikli** | `syncWarehouseReturn` (FN-14) — 11 Ekim'de kapanan v2-contract `geofenceService.js` paterniyle aynı disiplin (tek yetkili merci, legacy path yok) |
| `warehouse_received` → `{refund_issued \| replacement_dispatched \| disposed}` | Operasyonel karar | **Koşullu** — bkz. aşağıdaki kural | `resolveApprovalRequirement` (FN-16, yeni) |
| Herhangi bir durum → `closed` | Terminal çözüm | **Otomatik** | Audit log'a append + `closed_at` set |

**`resolveApprovalRequirement` (FN-16) kuralı — ne zaman dispatcher onayı şart:**

```
requiresApproval =
    return_type === 'damaged_goods'
    OR estimated_value_eur > company.settings.reverse_logistics_policy.approval_required_above_eur
    OR resolution_type === 'refund'   // finance etkisi her zaman insan onayı ister
```

Aksi halde (düşük değerli `customer_initiated` return, `resolution_type IN ('returned_to_inventory', 'replacement')`) ve şirket `auto_resolve_below_eur` politikasını açmışsa, geçiş otomatik yapılabilir. **Varsayılan: kapalı** — mevcut Mode 1 Advisory disiplinine uygun, hiçbir şirket açıkça izin vermeden otomatik finansal sonuç üretilmez.

---

## 3. Veritabanı Şeması Değişiklikleri

### 3.1 `enterprise.dispatch_tasks.direction` + `parent_task_id` (v1'den değişmedi, Faz 1.1, hâlâ uygulanmadı)

```sql
ALTER TABLE enterprise.dispatch_tasks
  ADD COLUMN direction TEXT NOT NULL DEFAULT 'outbound'
  CHECK (direction IN ('outbound', 'inbound'));

ALTER TABLE enterprise.dispatch_tasks
  ADD COLUMN parent_task_id UUID
  REFERENCES enterprise.dispatch_tasks(id) ON DELETE SET NULL;
```

### 3.2 `enterprise.rma_requests` (v1'den değişmedi, Faz 2, hâlâ uygulanmadı)

v1 §6.2 ile birebir aynı — bkz. Change Log v1 kaydı. Yeni eklenen tek şey: `warehouse_id` nullable FK (§3.3'teki yeni tabloya işaret eder, additive).

```sql
ALTER TABLE enterprise.rma_requests
  ADD COLUMN warehouse_id UUID REFERENCES public.warehouses(id);
```

(Bu satır, §3.3'teki `warehouses` tablosu yaratıldıktan SONRA, ayrı bir additive migration olarak uygulanır — `rma_requests`'in kendisi `warehouses`'tan önce var olabilir, aksi yöne bağımlılık yok.)

### 3.3 `public.warehouses` — YENİ, Faz 2.5

```sql
CREATE TABLE public.warehouses (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

    name                 TEXT NOT NULL,
    warehouse_type       TEXT NOT NULL DEFAULT 'central'
                         CHECK (warehouse_type IN ('central', 'cross_dock_hub', 'partner')),
    parent_warehouse_id  UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,

    address              TEXT,
    latitude             DOUBLE PRECISION,
    longitude            DOUBLE PRECISION,
    geofence_id          UUID REFERENCES public.geofences(id),  -- otomatik "received" tetikleyici için

    is_active            BOOLEAN NOT NULL DEFAULT true,

    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_warehouses_company ON public.warehouses (company_id) WHERE is_active = true;
CREATE INDEX idx_warehouses_parent ON public.warehouses (parent_warehouse_id) WHERE parent_warehouse_id IS NOT NULL;
```

**Tasarım notu — `public` şeması, `enterprise` değil:** `warehouses` fiziksel bir tesis kaydı — `public.companies`/`public.vehicles` gibi telematics-agnostic çekirdek veri, sadece dispatcher'a özel değil (gelecekte mobil app da bir depo listesine ihtiyaç duyabilir — örn. sürücünün "en yakın depo" görmesi). ADR-0004 v3 §6 additive pattern'e uygun. **Açık karar (Cem onayı):** bu şema-yeri tercihinin (public vs enterprise) kabul edilip edilmeyeceği.

Her şirket **tek bir merkezi depo** kullanıyorsa, tablo tek satırla (warehouse_type='central', parent_warehouse_id=NULL) sorunsuz çalışır — hiyerarşi zorunlu değil, opsiyonel genişleme.

### 3.4 `enterprise.customer_feedback` — YENİ, Faz 2.5, customer-funded

```sql
CREATE TABLE enterprise.customer_feedback (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

    task_id              UUID REFERENCES enterprise.dispatch_tasks(id),
    rma_request_id       UUID REFERENCES enterprise.rma_requests(id),

    feedback_type        TEXT NOT NULL CHECK (feedback_type IN ('csat', 'complaint', 'sla_breach_ack')),
    csat_score           SMALLINT CHECK (csat_score BETWEEN 1 AND 5),

    complaint_events      JSONB NOT NULL DEFAULT '[]'::jsonb,  -- append-only, bkz. §5.3
    sla_breach            BOOLEAN NOT NULL DEFAULT false,

    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_feedback_task ON enterprise.customer_feedback (task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_customer_feedback_rma ON enterprise.customer_feedback (rma_request_id) WHERE rma_request_id IS NOT NULL;
CREATE INDEX idx_customer_feedback_breach ON enterprise.customer_feedback (company_id, sla_breach) WHERE sla_breach = true;
```

Bu tablo bir **CRM değildir** — TulipFleet'in kendi CSAT/şikayet özeti, müşteri ilişkisinin tam kaydı değil (§5.2).

---

## 4. Güncellenmiş Fonksiyon Katalogu

FN-01..FN-15 **v1'den değişmedi** (bkz. v1 Change Log, aşağıda korunur) — hepsi hâlâ geçerli, hâlâ implementasyon beklemede. v2 yalnızca 4 yeni fonksiyon ekliyor:

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | Phase | Not |
|---|---|---|---|---|---|---|---|---|---|
| 16 | FEAT-018-FN-16 | shared_library | `resolveApprovalRequirement` | rmaRequest, companyPolicy | `{ requiresApproval, reason }` | enterprise.rma_requests, public.companies (settings) | — | 2 | §2 kural motoru — saf fonksiyon, side-effect yok |
| 17 | FEAT-018-FN-17 | backend | `POST/PUT /api/dispatcher/warehouses` | warehouseData | `{ warehouseId }` | — | public.warehouses | 2.5 | Basit admin CRUD, karmaşık değil |
| 18 | FEAT-018-FN-18 | backend | `POST /api/public/feedback` (veya dispatcher-authenticated varyant) | taskId/rmaId, csatScore?, complaintText? | `{ feedbackId }` | enterprise.dispatch_tasks, enterprise.rma_requests | enterprise.customer_feedback | 2.5 | Müşteri-tarafı giriş noktası — auth modeli ayrı karar (bkz. §7 açık madde) |
| 19 | FEAT-018-FN-19 | worker | `evaluateSlaBreach` (monitorRmaSla FN-13'ün çıktısını tüketir) | rmaId, breachDetected | Success | enterprise.rma_requests | enterprise.customer_feedback (sla_breach=true) | 2.5 | FN-13'ü yeniden yazmaz, sonucunu `customer_feedback`'e yansıtır |

---

## 5. WMS, CRM & Audit Trail Entegrasyon Prensipleri

### 5.1 WMS — tek giriş noktası, adapter pattern

TulipFleet **genel amaçlı bir WMS yazmaz.** Tek entegrasyon noktası `syncWarehouseReturn` (FN-14): araç depo geofence'ine girdiğinde tetiklenir, gerçek WMS'in (SAP EWM, Manhattan, vb.) API'sine `enterprise.rma_requests.status` güncellemesini bildirir. ADR-0007 §3.2 adapter pattern'i birebir geçerli: *"Every third-party telematics provider's API changes over time"* — aynı disiplin WMS sağlayıcıları için de geçerli, vendor-specific mantık FEAT-108'in (ayrı, customer-funded) adapter katmanında kalır, FEAT-018'in kendisi vendor-agnostic durur.

### 5.2 CRM — sınır net çizilir

`enterprise.customer_feedback` bir CRM değil — CSAT puanı, şikayet metni ve SLA ihlali bayrağının **minimal, dispatcher'ın kendi karar desteği için tuttuğu özeti**. Gerçek müşteri ilişkisi yönetimi (iletişim geçmişi, segment, lead/opportunity) kapsam dışı — bir şirketin gerçek CRM'i varsa (HubSpot, Salesforce vb.) bu tablo o sistemle senkronize edilmez, sadece dispatcher'ın kendi operasyonel görünürlüğü için var olur.

### 5.3 Audit trail — append-only kontrat

`enterprise.rma_requests.audit_log` (v1'den beri var, `JSONB NOT NULL DEFAULT '[]'::jsonb`) ve yeni `enterprise.customer_feedback.complaint_events` için **tek kural:** uygulama katmanı bu JSONB array'lere **sadece ekler, hiçbir zaman var olan elemanı UPDATE/DELETE etmez.** Bu DB seviyesinde bir trigger ile zorlanmıyor (Faz 3+ adayı, şimdi over-engineering) — disiplin, tek bir paylaşılan saf fonksiyonla sağlanıyor:

```typescript
function appendAuditEntry(existingLog: AuditEntry[], entry: AuditEntry): AuditEntry[] {
  return [...existingLog, entry];  // asla mutate etme, asla filter/splice ile eski entry silme
}
```

`evaluateRmaDecision` (FN-11), `syncWarehouseReturn` (FN-14) ve yeni `evaluateSlaBreach` (FN-19) dahil, duruma dokunan HER fonksiyon bu helper'ı kullanır — ayrı ayrı append mantığı yazılmaz.

---

## 6. Cross-Spec Sync ve FEAT-010 / FEAT-017 Bağlantıları

### 6.1 FEAT-010 ile — DÜZELTİLMİŞ durum (bkz. §0.2)

v1'in iddia ettiği gibi `returns_pickup_failed` ve `rts_warehouse_unreachable` **enum değerleri eklenmesi gerekmiyor — zaten canlı.** Gerçekten açık kalan tek parça: `FEAT-010-automated-exception-handling.md`'nin kendi Severity Matrix'inde (§5) bu 2 değerin dokümantasyon satırı yok. **Öneri:** FEAT-018 implementasyonuna geçilmeden önce, FEAT-010 spec'ine 2 satırlık bir doküman-hijyen PR'ı (kod değişikliği yok, sadece tablo satırı).

### 6.2 FEAT-017 ile (v1'den değişmedi)

`destinationType === 'locker'` durumunda FEAT-018 yeni task oluşturmaz — FEAT-017:FN-11 `onCustomerLockerDropoff` tetiklenir, FEAT-017'nin expiry monitoring (FN-12) ve customer notification pipeline'ı geçerli olur. "Bir feature bir paterni sahiplenir, diğerleri delege eder" prensibi korunur.

### 6.3 Yeni (v2) — henüz cross-spec bağlantısı gerektirmeyen parçalar

FN-16/17/18/19 hiçbir mevcut spec'i değiştirmiyor — hepsi FEAT-018'in kendi yeni tablolarına yazıyor. Tek dolaylı bağlantı: FN-14 `syncWarehouseReturn`'ün artık opsiyonel olarak `warehouse_id`'yi set edebilmesi (§3.2) — bu, FN-14'ün v1'deki imzasını bozmaz, sadece bir alan daha doldurur.

---

## 7. Açık kararlar (Cem onayı bekleyen — v2'de yeni eklenenler)

1. **`public.warehouses`'ın şema-yeri:** `public` mi `enterprise` mi? (§3.3 gerekçe verildi, ama nihai karar Cem'in)
2. **`FN-18 submitCustomerFeedback`'in auth modeli:** müşteri kendi (login'siz, token'lı — tracking portal'daki `public_tracking_tokens` paternine benzer) mi girecek, yoksa dispatcher/driver adına mı girilecek? Bu, FEAT-018'in müşteri-tarafı bir yüzeyi olup olmayacağını belirliyor (v1 §1.6'da "customer-facing return portal UI" Phase 3 ADR bekliyor olarak kapsam dışı bırakılmıştı — CSAT formu bu sınırı ihlal ediyor mu, yoksa ayrı/minimal bir şey mi, netleştirilmeli)
3. **`auto_resolve_below_eur` politikasının varsayılan değeri ve üst sınırı** — §2'de "varsayılan kapalı" dendi, ama açıldığında üst limit ne olacak (örn. şirket kendi `approval_required_above_eur`'undan büyük bir otomatik-çözüm limiti koyabilir mi, yoksa ikisi aynı mı olmalı)
4. **Cross-dock hub routing'in VRP'ye etkisi** — bir return, hub'dan geçerken `parent_task_id` zinciri 2 seviyeye çıkıyor (orijinal → hub-leg → final-leg); HERE Tour Planning'in bunu tek problem'de mi yoksa 2 ayrı plan'da mı çözeceği netleştirilmeli (Faz 2.5, implementasyon öncesi karar)

v1'in UNCERTAINTIES listesi (§7, eski numaralandırma) **tamamen çözülmüş kalıyor** — bu yeni liste sadece v2'nin eklediği parçalara dair.

---

## 8. Shared infrastructure with previous FEAT'leri (v1'den korunur, değişmedi)

| FEAT-018 fonksiyon | Shared with | Paylaşım türü |
|---|---|---|
| FN-01 createReturnTask | **FEAT-003** order ingestion | Yeni task creation pattern |
| FN-03 validateReversePolicy | **FEAT-003:FN-08** + **FEAT-010:FN-08** + **FEAT-014:FN-06** | Policy engine stub (Mode 1/2) |
| FN-04 calculateReturnPriority | **FEAT-003:FN-06** + **FEAT-014:FN-05** | Weighted sum pattern (ADR-0010 §3.4) |
| FN-05 GET /returns | **FEAT-001:FN-006** | List endpoint pattern |
| FN-06 triggerReturnToSender | **FEAT-017:FN-11** onCustomerLockerDropoff | Reverse flow pattern + delegasyon |
| FN-07 buildHereProblemWithMixedLoads | **FEAT-001:FN-016** buildHereProblem | Mixed pickup/delivery extension |
| FN-08 resolveRtsDestination | **FEAT-017:FN-01** findNearbyLockers | Locker alt-yol seçimi |
| FN-09 processCustomerPickupWindow | **FEAT-006:FN-03** | Time window pattern |
| FN-13 monitorRmaSla | **FEAT-010:FN-06** + **FEAT-014:FN-04** + **FEAT-017:FN-12** | Hourly cron deadline pattern |
| FN-14 syncWarehouseReturn | **FEAT-006:FN-08** | Dock appointment pattern |
| FN-15 broadcastReturnStatus | **FEAT-005:FN-08** | MQTT publish pattern |

---

## 9. Pilot süreç notları (v1, 2026-05-30 — tarihsel kayıt, değiştirilmedi)

### 9.1 Pilot akışı

Tek prompt + 0 follow-up. Konsolidasyonda 2 yeni fonksiyon eklendi (FN-08, FN-09), 1 numaralandırma düzeltmesi, 1 section misattribution düzeltmesi (FN-11 §4.1 → §2).

### 9.2 Alıntı doğrulama özeti

**§number fabrikasyon: 0** ✅ · **Section misattribution: 1** ⚠️ (F14'teki aynı hata tekrarlandı, kalıcı hata sınıfı) · **Numaralandırma anomalisi: 1** ⚠️ (FN-09 atlandı, düzeltildi)

Detaylı tablo ve 13-pilot karşılaştırması için bkz. bu dosyanın v1 commit'i (`git log -p` ile erişilebilir) — v2 rewrite'ı bu tarihsel analizi tekrar etmiyor, sadece referans olarak bırakıyor.

---

## 10. Next steps

### 10.1 Doküman hijyeni (v2'den doğan, küçük)

- [ ] `FEAT-010-automated-exception-handling.md` §5 Severity Matrix'e `returns_pickup_failed` + `rts_warehouse_unreachable` satırları eklenmeli (DB'de zaten var, dokümantasyon eksik — §6.1)
- [ ] `docs/ROADMAP.md` Wishlist Coverage Matrix'teki W18/FEAT-109 ↔ FEAT-018 ID tutarsızlığı düzeltilmeli (ayrı küçük PR)

### 10.2 Phase 1.1 implementation backlog (A + B) — v1'den değişmedi, hâlâ başlanmadı

- [ ] Schema migration: `direction` + `parent_task_id` + INDEX
- [ ] FN-01..FN-09 (A ve B alt-paradigmaları)

### 10.3 Phase 2 implementation backlog (C RMA)

- [ ] Schema migration: `enterprise.rma_requests`
- [ ] FN-10..FN-15 + yeni FN-16 (resolveApprovalRequirement)

### 10.4 Phase 2.5 implementation backlog (D warehouse + E CRM/CSAT) — yeni, v2

- [ ] Schema migration: `public.warehouses`, `enterprise.customer_feedback`
- [ ] FN-17 (warehouse CRUD), FN-18 (feedback intake — §7 madde 2 kararı önce gerekli), FN-19 (SLA breach evaluation)
- [ ] FEAT-108 WMS connector spec (ayrı pilot, customer-funded) — hâlâ yazılmadı

### 10.5 Sıradaki pilot

v1'de "FEAT-015 W14 Automated Freight Audit and Payment" olarak not edilmişti — hâlâ geçerli bir aday, ama bu artık Cem'in güncel pilot sıralamasına (ROADMAP.md "Pilot pipeline öncelik sırası") bağlı, burada sabitlenmiyor.

---

## 11. References

- ADR-0001 §3.6 (UI primitives)
- **ADR-0002 §3.2** (HERE native mixed pickup/delivery), §3.4 (soft constraint time-window)
- ADR-0004 v3 §6 (additive schema changes)
- **ADR-0005 §2** (Mode 1 Advisory), §4.1 (Audit step), §5.3 (Auto-dispatch loop), §7 (Policy module stub)
- ADR-0007 §3.2 (Third-party API adapter pattern — WMS entegrasyonu da bu paterni kullanır, §5.1)
- ADR-0009 §4.4 (dispatcher → driver task flow), §8 (MQTT publish)
- ADR-0010 §3.4 (weighted sum, no learning), §3.5 (ML Phase 3 candidate)
- ADR-0011 §6 (Mode 2 reference, scope gating), §9.5 (endpoint patterns)
- FEAT-001 spec (FN-016 mixed extension, FN-006 list pattern, FN-013 approve)
- FEAT-002 spec (FN-02 POST /replan)
- FEAT-003 spec (FN-06 weighted sum, FN-08 policy engine)
- FEAT-005 spec (FN-08 MQTT publish)
- FEAT-006 spec (FN-03 time window, FN-08 dock appointment)
- FEAT-009 spec (carbon footprint)
- FEAT-010 spec (FN-06 logExceptionEvent; §6.1'de doküman-hijyen bulgusu)
- FEAT-011 spec (PoD Capture — RMA dokümantasyonu delegasyonu)
- FEAT-014 spec (FN-04 deadline monitoring, FN-05 weighted sum)
- FEAT-017 spec (FN-01 findNearbyLockers, FN-11 onCustomerLockerDropoff, FN-12 deadline monitoring)
- FEAT-108 (Phase 2 customer-funded WMS connector — henüz spec yok)
- `tulipfleet-backend migrations/1782800000000_bug1-overlap-foundation.sql` (exception_type canlı değerleri — §0.2 kanıtı)
- NotebookLM session 2026-05-30 (v1, 1 prompt, 8.5/10 skor)

---

## 12. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-30 | Cem Bakir (with Claude + NotebookLM cowork) | İlk konsolide function spec. 15 fonksiyon (FN-01..FN-15), 3 alt-paradigma (A/B/C). Detay: bkz. git history. |
| 2 | 2026-10-13 | Cem Sahinkaya (with Claude, ADR-Grounded Gatekeep SOP) | **Akademik yaşam döngüsü terminolojisi** (APICS/CSCMP: Order Initiation, ASN, Cross-Docking, Last-Mile, RMA/RTS) her aşama TulipFleet'in gerçek mimarisine karşı denetlenip haritalandı; **Line-Haul/Trunking gerekçeli kapsam dışı bırakıldı** (ürün Advisory-mode VRP last-mile/bölgesel dispatch, uzun-hat ağ optimizasyonu değil). **Kural tabanlı durum geçiş matrisi** eklendi (§2) — hangi geçiş otomatik/geofence-tetikli, hangisi dispatcher onaylı, açık tablo + `resolveApprovalRequirement` (FN-16) saf fonksiyonu. **2 yeni tablo tasarlandı** (Faz 2.5, henüz migration yazılmadı): `public.warehouses` (depo hiyerarşisi, self-referencing, additive — tek-depo şirketler için nötr) ve `enterprise.customer_feedback` (CSAT/şikayet/SLA-ihlali — bilinçli olarak CRM DEĞİL, minimal operasyonel özet). **Append-only audit trail kontratı** formalize edildi (§5.3) — DB trigger yerine paylaşılan saf fonksiyon disiplini, over-engineering'den kaçınıldı. **Gatekeep bulgusu (düzeltme):** v1'in "FEAT-010'a 2 yeni exception_type eklenmeli" iddiası yanlış çıktı — `returns_pickup_failed`/`rts_warehouse_unreachable` `tulipfleet-backend migrations/1782800000000` ile zaten canlı; gerçek açık kalan, FEAT-010'un kendi Severity Matrix dokümantasyonundaki eksik 2 satır (§6.1, §10.1). WMS/CRM sınırları netleştirildi (§5) — ikisi de TulipFleet'in inşa ettiği sistemler değil, tek adaptör noktası (FN-14) ve minimal özet tablosu. 4 yeni fonksiyon (FN-16..FN-19), FN-01..FN-15 değişmeden korundu. 4 yeni açık karar (§7) Cem'in onayını bekliyor — implementasyon hiçbiri için başlamadı. |
