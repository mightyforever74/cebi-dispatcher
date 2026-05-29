# FEAT-018 — Reverse Logistics Handling

| Field | Value |
|---|---|
| **Feature ID** | FEAT-018 |
| **Source** | Wishlist W18 — "Reverse Logistics Handling" |
| **Frequency rating** | Common |
| **Tulipfleet Phase** | Phase 1.1 (A customer pickup + B failed delivery RTS) + Phase 2 (C RMA lifecycle, customer-funded trigger) |
| **Spec readiness** | Yorum B kararı, 2026-05-30 — Phase 2 etiketi korunur, spec şimdi yazılır |
| **Status** | Function spec drafted via NotebookLM (1 prompt, 2026-05-30) |
| **Pilot note** | On üçüncü pilot. **8.5/10** skor, tek iterasyon. **§number fabrikasyon = 0** ✅ (F8-F10-F17-F14-F18 zinciri stable), **section misattribution = 1** ⚠️ (F14'teki AYNI hata tekrarlandı — yeni hata sınıfı KALICI). Yeni paradigma: **multi-flow reverse logistics** — 3 alt-paradigma (A/B/C) tek spec'te. |

---

## 1. Feature description

### 1.1 Wishlist tanımı

> *"This use case involves managing the complex process of picking up, transporting, and storing customer returns and replacements."*

### 1.2 3 alt-paradigma — kapsam ayrımı

| Alt-paradigma | Detay | Phase | Fonksiyon |
|---|---|---|---|
| **A) Customer pickup (return)** | Driver müşteri adresine gidip return alır. HERE Tour Planning mixed pickup/delivery (ADR-0002 §3.2 native). | 1.1 | FN-01, FN-02, FN-04, FN-05, FN-07 (5 fn) |
| **B) Failed delivery → return-to-sender (RTS)** | Teslim edilemeyen paket otomatik warehouse'a döner. FEAT-017 locker reverse paralel pattern. | 1.1 | FN-03, FN-06, FN-08, FN-09 (4 fn, **konsolidasyonda +2**) |
| **C) RMA lifecycle** | Customer return talebi → schedule → pickup → warehouse → processed → replacement (opsiyonel). State machine. | 2 (customer-funded) | FN-10, FN-11, FN-12, FN-13, FN-14, FN-15 (6 fn) |

### 1.3 Önceki FEAT'lerle delegasyon

| Önceki | Delegasyon noktası |
|---|---|
| **FEAT-017:FN-11** `onCustomerLockerDropoff` | `locker_return` türü FEAT-017'ye delege edilir, FEAT-018 yeniden yazmaz |
| **FEAT-001:FN-016** `buildHereProblem` | Mixed pickup/delivery extension burada (FN-07 buildHereProblemWithMixedLoads) |
| **FEAT-002:FN-02** `POST /replan` | RTS sırasında failed delivery re-plan tetikler |
| **FEAT-009 carbon** | Return loads emission tracking — mevcut `carbon_footprint_kg` infrastructure |
| **FEAT-010:FN-06** `logExceptionEvent` | `returns_pickup_failed`, `rts_warehouse_unreachable` exception types |
| **FEAT-006:FN-08** dock appointment | Warehouse return arrival appointment (Phase 2) |

### 1.4 ML disipline kritik nüans

| Konu | Karar |
|---|---|
| Return reason prediction | ❌ Phase 3+ candidate (ADR-0010 §3.5) |
| Pickup time optimization | ✅ Weighted sum (ADR-0010 §3.4 — FN-04 calculateReturnPriority) |
| Replacement product matching | ❌ E-commerce SKU işi, KAPSAM DIŞI |
| Return condition AI inspection | ❌ Phase 3+ |
| Auto-acceptance of returns | ⚠️ Policy-based stub (Mode 1 advisory, Mode 2 customer-funded) |

### 1.5 Kapsam — içeride

- 3 alt-paradigma (A, B, C) tek spec
- HERE Tour Planning mixed pickup/delivery native kullanımı
- `enterprise.dispatch_tasks.direction` enum + `parent_task_id` schema
- `enterprise.rma_requests` yeni tablo (Phase 2)
- State machine RMA lifecycle (Phase 2)
- Cross-spec entegrasyon: FEAT-001, 002, 009, 010, 017
- WMS connector Phase 2 (FEAT-108)

### 1.6 Kapsam — dışarıda

- **Replacement product catalog** — e-commerce SKU yönetimi
- **Customer-facing return portal UI** — Phase 3 ADR pending
- **Refund processing** — finance system işi
- **International returns customs declaration** — Phase 3+
- **Return condition AI inspection** — Phase 3+
- **Return reason prediction ML** — Phase 3+ (ADR-0010 §3.5)

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Phase | Shared with FEAT-001..10,14,17 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FEAT-018-FN-01 | backend | `createReturnTask` | taskData, direction='inbound' | { taskId } | — | enterprise.dispatch_tasks | — | ADR-0009 §4.4 — "Dispatcher-created and dispatcher-approved plans flow into the driver-facing task model." | 1.1 | **FEAT-003** order ingestion pattern |
| 2 | FEAT-018-FN-02 | backend | `linkParentTask` | returnTaskId, originalTaskId | Success | enterprise.dispatch_tasks | enterprise.dispatch_tasks (parent_task_id) | — | ADR-0004 v3 §6 — "Additive ve geriye dönük uyumlu... değişikliklere izin verilir." | 1.1 | — |
| 3 | FEAT-018-FN-03 | backend | `validateReversePolicy` | taskId, companyId | { allowed, reason? } | public.companies (settings) | — | — | ADR-0005 §7 — "Add policy module structure in the enterprise backend (`src/dispatch/policy.ts`) that reads the mode and currently always returns 'advisory'." | 1.1 | **FEAT-003:FN-08** policy engine pattern |
| 4 | FEAT-018-FN-04 | shared_library | `calculateReturnPriority` | taskId, delayTime, customerSla | score: numeric (0-100) | enterprise.dispatch_tasks | — | — | ADR-0010 §3.4 — "'Reward function' in conversation → in implementation, it is a weighted sum of constraint penalties in HERE's `objective`. **No learning.**" | 1.1 | **FEAT-003:FN-06** + **FEAT-014:FN-05** weighted sum pattern |
| 5 | FEAT-018-FN-05 | backend | `GET /api/dispatcher/returns` | company_id, status, direction | Task[] | enterprise.dispatch_tasks | — | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 1.1 | **FEAT-001:FN-006** list endpoint pattern |
| 6 | FEAT-018-FN-06 | worker | `triggerReturnToSender` | originalTaskId, reason | { returnTaskId } | enterprise.dispatch_tasks | enterprise.dispatch_tasks (new inbound task) | — | ADR-0005 §5.3 — "If rules trigger an exception, system marks the task `needs_dispatcher` and notifies the dispatcher." | 1.1 | **FEAT-017:FN-11** reverse flow pattern |
| 7 | FEAT-018-FN-07 | shared_library | `buildHereProblemWithMixedLoads` | tasks (outbound + inbound), vehicles | HERE_JSON | enterprise.dispatch_tasks | — | HERE Tour Planning | ADR-0002 §3.2 — "HERE Tour Planning natively models constraints (vehicle height, cold chain, driver shift rules, mixed pickup/delivery, refueling stops)" | 1.1 | **FEAT-001:FN-016** buildHereProblem (mixed extension) |
| 8 | FEAT-018-FN-08 | backend | `resolveRtsDestination` (**KONSOLIDASYONDA EKLENDİ**) | originalTaskId, currentLocation | { destinationType, destinationId, reason } | public.companies (settings), public.geofences (locker/pudo), enterprise.dispatch_tasks | — | — | ADR-belirsiz (RTS destination resolution — UNCERTAINTIES #4 cevap) | 1.1 | **FEAT-017:FN-01** findNearbyLockers (locker alt-yol seçimi) |
| 9 | FEAT-018-FN-09 | backend | `processCustomerPickupWindow` (**KONSOLIDASYONDA EKLENDİ**) | taskId, customerWindows | Success | enterprise.dispatch_tasks | enterprise.dispatch_tasks (time_window metadata) | — | ADR-0002 §3.4 — soft constraint time-window (ADR-0002 addendum §3.4 customer time window) | 1.1 | **FEAT-006:FN-03** time window pattern |
| 10 | FEAT-018-FN-10 | backend | `POST /api/dispatcher/rma/requests` | rmaData | { rmaId } | — | enterprise.rma_requests | — | ADR-belirsiz (RMA ingestion pattern) | 2 | — |
| 11 | FEAT-018-FN-11 | backend | `evaluateRmaDecision` | rmaId, action, (JWT.user_id) | Success | enterprise.rma_requests | enterprise.rma_requests (state transition) | — | ADR-0005 §2 — "Mode 1 — Advisory: The system suggests dispatch decisions. The dispatcher approves every action before it takes effect." | 2 | — |
| 12 | FEAT-018-FN-12 | shared_library | `getRmaLifecycleTimeline` | rmaId | Timeline[] | enterprise.rma_requests | — | — | ADR-0005 §4.1 — "Audit. Every action (plan submitted, proposal received, dispatcher modification, approve, reject) is logged for later review and Mode 2/3 training data." | 2 | — |
| 13 | FEAT-018-FN-13 | worker | `monitorRmaSla` | (cron trigger, hourly) | void | enterprise.rma_requests | enterprise.exception_events | — | ADR-0011 §6 — "FEAT-101 Automated Exception-Based Dispatch (Mode 2)" | 2 | **FEAT-010:FN-06** logExceptionEvent + **FEAT-014:FN-04** + **FEAT-017:FN-12** deadline monitoring pattern |
| 14 | FEAT-018-FN-14 | backend | `syncWarehouseReturn` | taskId, wmsRef | Success | — | enterprise.rma_requests, enterprise.dispatch_tasks (status=warehouse_received) | WMS API | ADR-0007 §3.2 — "Every third-party telematics provider's API changes over time." | 2 | **FEAT-006:FN-08** dock appointment pattern |
| 15 | FEAT-018-FN-15 | backend | `broadcastReturnStatus` | taskId, status | void | — | — | EMQX MQTT | ADR-0009 §8 — "MQTT publish from enterprise backend — for direct vehicle commands in Mode 2/3 dispatch (per ADR-0005)." | 2 | **FEAT-005:FN-08** MQTT publish pattern |

**Konsolidasyon notları (NotebookLM çıktısına göre düzeltmeler):**

| # | NotebookLM dedi | Düzeltme |
|---|---|---|
| **Numaralandırma** | FN-08 → FN-10 (FN-09 atlandı) | ✅ Düzeltildi: FN-01..FN-15 ardışık (NotebookLM 13 fn ama FN-09 boştu) |
| **FN-11 (eski FN-09) ADR-0005 §4.1** | "The dispatcher approves every action before it takes effect" | 🚨 **F14'TEKİ AYNI HATA** — section misattribution. Alıntı gerçek ama §2'de (Mode 1 Advisory tanımı), §4.1'de değil. ✅ Düzeltildi: ADR-0005 §2 |
| **FN-12 (eski FN-10) ADR-0005 §4.1** | "Audit. Every action... logged for later review" | ✅ Doğru — §4.1.6 Audit step birebir cümle |
| **B alt-paradigma az fonksiyon (NotebookLM 2 fn)** | RTS destination + customer pickup window eksik | ✅ **EKLENDİ FN-08** `resolveRtsDestination` (UNCERTAINTIES #4 cevap — depo mu locker mu?) + **EKLENDİ FN-09** `processCustomerPickupWindow` (customer availability) |
| **FEAT-017 delegasyon açık değildi** | `locker_return` type'ı sadece taxonomy'de | ✅ §1.3 ve §3'te **açık delegasyon belgelendi** — FEAT-018 locker_return için onCustomerLockerDropoff (FEAT-017:FN-11) tetikler, yeniden yazmaz |
| Diğer 11 alıntı | ✅ Doğru | — |

**Fonksiyon sayısı:** NotebookLM 13 (FN-09 atlanmış) → konsolidasyon **15** (FN-08 + FN-09 eklendi, ardışık numaralandırma).

---

## 3. Alt-paradigma A — Customer pickup (return)

### 3.1 Akış

```
1. Customer return talebi (manuel dispatcher entry veya RMA Phase 2)
        │
        ▼
2. createReturnTask (FN-01) — direction='inbound'
   - enterprise.dispatch_tasks INSERT
   - pickup_location = customer adresi
   - delivery_location = warehouse (default) veya alternatif
        │
        ▼
3. linkParentTask (FN-02) — orijinal outbound task'a referans
   - parent_task_id = original_task_id (RMA durumda)
   - NULL olabilir (independent return)
        │
        ▼
4. validateReversePolicy (FN-03) — public.companies.settings check
   - allow_returns flag
   - max_return_value_eur threshold
   - approval_required flag
        │
        ▼
5. processCustomerPickupWindow (FN-09) — customer müsait pencere
   - customerWindows = [{start, end}] (telefon/email confirmation)
   - enterprise.dispatch_tasks.metadata.time_window UPDATE
   - Soft constraint HERE'ye geçer
        │
        ▼
6. buildHereProblemWithMixedLoads (FN-07) — VRP submission
   - outbound + inbound tasks tek planda
   - HERE Tour Planning native mixed pickup/delivery
   - Mevcut routing pipeline (FEAT-001) reuse
        │
        ▼
7. Standard plan approval (FEAT-001:FN-013)
   - Dispatcher Mode 1 onay
   - Driver mobile receives pickup task
        │
        ▼
8. Driver pickup completion → task status: completed
   - public.task_events log
   - FEAT-005 ETA tracking dahil
```

### 3.2 Mixed pickup/delivery — HERE detayı

ADR-0002 §3.2 *"HERE Tour Planning natively models constraints (vehicle height, cold chain, driver shift rules, mixed pickup/delivery, refueling stops)"* — yani HERE problem JSON'da:

```jsonc
{
  "plan": {
    "tasks": [
      { "id": "T-001", "type": "delivery", "places": [{"location": {...}, "duration": 300}] },
      { "id": "R-001", "type": "pickup",   "places": [{"location": {...}, "duration": 300}],
        "metadata": { "direction": "inbound", "parent_task_id": "T-005" } }
    ]
  }
}
```

HERE solver mixed problem'i otomatik optimize eder — kapasite hesabı, sıralama (LIFO/FIFO), shift constraint dahil (UNCERTAINTIES #2 cevap).

---

## 4. Alt-paradigma B — Failed delivery → Return-to-sender (RTS)

### 4.1 Akış

```
1. Driver mobile: delivery failed (mevcut akış)
   - task status: failed
   - failed_reason: 'customer_not_home' | 'address_invalid' | 'refused' | 'damaged_on_arrival'
        │
        ▼
2. allow_auto_return flag check (public.companies.settings.reverse_logistics_policy)
   - Hayır → standart manuel exception
   - Evet → 3. adıma
        │
        ▼
3. resolveRtsDestination (FN-08) — destination kararı (UNCERTAINTIES #4)
   Karar matrisi:
   - failed_reason='damaged_on_arrival' → warehouse (return for inspection)
   - failed_reason='refused' + customer locker tercihi → FEAT-017 onCustomerLockerDropoff
   - failed_reason='customer_not_home' + nearby locker → FEAT-017 delegate
   - failed_reason='customer_not_home' + locker yok → warehouse RTS
        │
        ▼
4. triggerReturnToSender (FN-06):
   - Eğer locker route: FEAT-017:FN-11 delegate (yeniden yazma)
   - Eğer warehouse RTS: createReturnTask (FN-01) çağır, direction='inbound'
        │
        ▼
5. FEAT-002:FN-02 POST /replan:
   - Mevcut rota güncellenir, warehouse RTS waypoint eklenir
   - Driver mobile yeni rota görür
```

### 4.2 RTS destination karar matrisi (FN-08)

```typescript
function resolveRtsDestination(originalTaskId, currentLocation) {
  const task = await getTask(originalTaskId);
  const company = await getCompanySettings(task.company_id);
  const policy = company.settings.reverse_logistics_policy;
  
  // 1. Damaged goods: always warehouse (inspection)
  if (task.failed_reason === 'damaged_on_arrival') {
    return { destinationType: 'warehouse', destinationId: task.origin_warehouse_id,
             reason: 'damaged_inspection_required' };
  }
  
  // 2. Customer locker preference (refused or not home)
  if (policy.prefer_locker_for_failed && 
      ['refused', 'customer_not_home'].includes(task.failed_reason)) {
    const nearbyLocker = await findNearbyLockers(  // FEAT-017:FN-01 reuse
      currentLocation, policy.max_locker_distance_meters || 2000, task.company_id);
    if (nearbyLocker.length > 0) {
      return { destinationType: 'locker', destinationId: nearbyLocker[0].id,
               reason: 'customer_locker_fallback', delegate_to: 'FEAT-017' };
    }
  }
  
  // 3. Default: warehouse RTS
  return { destinationType: 'warehouse', destinationId: task.origin_warehouse_id,
           reason: 'default_rts' };
}
```

### 4.3 Locker delegasyon — FEAT-017 reuse

`destinationType === 'locker'` durumunda:
- FEAT-018 yeni task **oluşturmaz**
- FEAT-017:FN-11 `onCustomerLockerDropoff` tetiklenir (driver-initiated variant)
- FEAT-017'nin expiry monitoring (FN-12) ve customer notification pipeline'ı geçerli
- Mimari net: **bir feature bir paterni sahiplenir**, diğerleri delege eder

---

## 5. Alt-paradigma C — RMA lifecycle (Phase 2 customer-funded)

### 5.1 State machine

```
                    rma_requested (FN-10)
                          │
                          ▼
              evaluateRmaDecision (FN-11)
                          │
              ┌───────────┴───────────┐
              │                       │
            approve                  reject
              │                       │
              ▼                       ▼
        ┌─────────────────┐     ┌──────────┐
        │pickup_scheduled │     │  closed  │
        │  (createReturnTask FN-01)│   │ (rejected)│
        └────────┬────────┘     └──────────┘
                 │
                 ▼ Driver pickup completed
        ┌────────────┐
        │ in_transit │
        └─────┬──────┘
              │
              ▼ Vehicle warehouse arrival (geofence entry)
              │ syncWarehouseReturn (FN-14)
              ▼
        ┌────────────────────┐
        │ warehouse_received │
        └─────┬──────────────┘
              │
              ▼ Operational processing
              │
              ┌───────────────┬───────────────┐
              │               │               │
        refund_issued   replacement_dispatched  disposed
              │               │               │
              └───────────────┴───────────────┘
                              │
                              ▼
                       ┌────────────┐
                       │ processed  │
                       └────────────┘
```

**State enum** (`enterprise.rma_requests.status`):
- `rma_requested`, `approved`, `rejected`, `pickup_scheduled`, `in_transit`, `warehouse_received`, `processed`, `closed`

### 5.2 SLA monitoring (FN-13)

`monitorRmaSla` (hourly cron):
- RMA `approved` → `pickup_scheduled` deadline 48h
- RMA `pickup_scheduled` → `in_transit` deadline 7 gün
- RMA `in_transit` → `warehouse_received` deadline 24h
- SLA breach → FEAT-010:FN-06 `logExceptionEvent` (exception_type=`returns_pickup_failed`)

### 5.3 Warehouse integration

`syncWarehouseReturn` (FN-14) — WMS connector (Phase 2 FEAT-108):
- Vehicle warehouse geofence entry → otomatik trigger
- WMS API call: SAP EWM, Manhattan, vb. (customer-funded)
- `enterprise.rma_requests.status` UPDATE → `warehouse_received`
- `enterprise.dispatch_tasks.status` UPDATE → `warehouse_received`
- ADR-0007 §3.2 customer-funded connector pattern

---

## 6. Database schema (Phase 1.1 + Phase 2 additive)

### 6.1 `enterprise.dispatch_tasks.direction` + `parent_task_id` — Phase 1.1 additive

```sql
ALTER TABLE enterprise.dispatch_tasks
  ADD COLUMN direction TEXT NOT NULL DEFAULT 'outbound'
  CHECK (direction IN ('outbound', 'inbound'));

ALTER TABLE enterprise.dispatch_tasks
  ADD COLUMN parent_task_id UUID
  REFERENCES enterprise.dispatch_tasks(id) ON DELETE SET NULL;

CREATE INDEX idx_dispatch_tasks_direction ON enterprise.dispatch_tasks (company_id, direction)
  WHERE direction = 'inbound';

CREATE INDEX idx_dispatch_tasks_parent ON enterprise.dispatch_tasks (parent_task_id)
  WHERE parent_task_id IS NOT NULL;
```

ADR-0004 v3 §6 additive pattern. Mevcut task'lar otomatik `direction='outbound'`, eski davranış bozulmaz.

### 6.2 `enterprise.rma_requests` — Phase 2 yeni tablo

```sql
CREATE TABLE enterprise.rma_requests (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Customer reference
    customer_ref         TEXT NOT NULL,  -- customer external ID
    original_task_id     UUID REFERENCES enterprise.dispatch_tasks(id),  -- nullable: customer manuel RMA
    
    -- State machine
    status               TEXT NOT NULL DEFAULT 'rma_requested'
                         CHECK (status IN (
                           'rma_requested', 'approved', 'rejected',
                           'pickup_scheduled', 'in_transit', 'warehouse_received',
                           'processed', 'closed'
                         )),
    
    -- Return classification
    return_type          TEXT NOT NULL
                         CHECK (return_type IN (
                           'customer_initiated', 'failed_delivery',
                           'damaged_goods', 'wrong_item', 'locker_return'
                         )),
    reason_code          TEXT,
    
    -- Linked dispatch task (after approval)
    pickup_task_id       UUID REFERENCES enterprise.dispatch_tasks(id),
    
    -- SLA tracking
    sla_deadline_at      TIMESTAMPTZ,
    
    -- Resolution
    resolution_type      TEXT CHECK (resolution_type IN 
                           ('refund', 'replacement', 'disposal', 'returned_to_inventory')),
    
    metadata             JSONB,
    audit_log            JSONB NOT NULL DEFAULT '[]'::jsonb,  -- state transitions
    
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at          TIMESTAMPTZ,
    processed_at         TIMESTAMPTZ,
    closed_at            TIMESTAMPTZ
);

CREATE INDEX idx_rma_company_status ON enterprise.rma_requests (company_id, status, sla_deadline_at);
CREATE INDEX idx_rma_customer ON enterprise.rma_requests (company_id, customer_ref);
CREATE INDEX idx_rma_original_task ON enterprise.rma_requests (original_task_id) WHERE original_task_id IS NOT NULL;
```

### 6.3 `public.companies.settings.reverse_logistics_policy` — JSONB additive

```jsonc
{
  ...
  "reverse_logistics_policy": {
    "allow_returns": true,
    "auto_rts_on_failed_delivery": true,        // FN-06 trigger flag
    "prefer_locker_for_failed": false,          // FEAT-017 delegate tercihi
    "max_locker_distance_meters": 2000,
    "max_return_value_eur": 5000,
    "approval_required_above_eur": 500,
    "rma_sla_hours": {
      "approval_to_pickup": 48,
      "pickup_to_warehouse": 168,                // 7 gün
      "transit_to_received": 24
    }
  }
}
```

---

## 7. UNCERTAINTIES (Cem onayı bekleyen)

### NotebookLM'in tespit ettikleri

1. **İade ücretlendirme (Vrachtwagenheffing FEAT-008):** Inbound loads outbound ile aynı tariff sınıfında mı?
   - **Karar:** EVET — Vrachtwagenheffing toll **vehicle-bound**, load direction-agnostic. Inbound tasks aynı `vehicle.emission_class` + `weight_class` ile hesaplanır. FEAT-008 cross-spec sync gerekmez.

2. **Araç kapasite dinamiği (LIFO/FIFO):** HERE solver mı yoksa app layer mı?
   - **Karar:** HERE solver native handles (ADR-0002 §3.2 mixed pickup/delivery). App layer ek logic gerek YOK. Tüm capacity-time çakışmaları HERE'nin objective fonksiyonunda.

3. **RMA dokümanları (CMR/İrsaliye):** Driver dijital doküman yükleme zorunlu mu?
   - **Karar:** **FEAT-011 PoD Capture spec'ine bırakıldı.** FEAT-018 sadece RMA state machine'i yönetir. Dokümantasyon discipline FEAT-011'de tanımlanır.

4. **Geri dönüş noktası — depo mu locker mu?**
   - **Karar (konsolidasyonda):** FN-08 `resolveRtsDestination` karar matrisi:
     - Damaged goods → warehouse
     - Customer locker preference + nearby locker → FEAT-017 delegate
     - Default → warehouse RTS
   - Per-company `prefer_locker_for_failed` policy flag

### Konsolidasyonda eklenenler

5. **Replacement coordination — RMA approved sonrası:** Replacement delivery otomatik mi yoksa manuel dispatcher mı?
   - **Karar:** Phase 2 başlangıç **manuel** (Mode 1 Advisory). Dispatcher RMA processed sonrası ayrı outbound task açar. Phase 2.5+ otomatik linking (Mode 2 trigger) — `enterprise.rma_requests.replacement_task_id` UPDATE.

6. **Customer notification — RMA status updates:** SMS/email otomatik mi?
   - **Karar:** Phase 2 yes, FEAT-015 (Tender) FN-08 paterniyle. Notification preference customer-side, RMA platform integration.

7. **Multi-leg international returns:** Hollanda'dan Belçika customer → return Hollanda'ya?
   - **Karar:** Phase 1.1/2 EU intra-community OK (Vrachtwagenheffing dahil), customs declaration Phase 3+ (UNCERTAINTIES kapsam).

8. **Refund processing — finance system entegrasyon:**
   - **Karar:** **KAPSAM DIŞI** — `resolution_type='refund'` sadece flag, gerçek refund finance system (SAP, Stripe vb.) işi. Customer-funded entegrasyon Phase 3+.

9. **Damaged goods inspection workflow:** Warehouse arrival sonrası inspection süresi?
   - **Karar:** `enterprise.rma_requests.metadata.inspection_required BOOLEAN` flag. Default `false` (warehouse otomatik processed). `damaged_goods` type için `true` (manuel inspection step). Detaylı inspection workflow FEAT-108 WMS connector kapsamında.

10. **Wrong_item replacement priority:** Yanlış ürün gönderimi acil mi?
    - **Karar:** FN-04 `calculateReturnPriority` weights `customerSla` parametresi yüksek wrong_item için (örn. weight=0.6). Default policy per-company.

---

## 8. Shared infrastructure with previous FEAT'leri

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

**Cross-spec sync TODO (TOPLU COMMIT için biriken — FEAT-018 sonrası):**

FEAT-010 `exception_type` CHECK constraint genişletme — **5 yeni enum value** birden:
- `'locker_pickup_expired'` (FEAT-017:FN-12)
- `'tender_withdrawn'` (FEAT-014:FN-13)
- `'tender_no_quotes'` (FEAT-014:FN-04)
- `'returns_pickup_failed'` (FEAT-018:FN-13 — RMA SLA breach)
- `'rts_warehouse_unreachable'` (FEAT-018:FN-08 — RTS destination resolution failed)

FEAT-010 §5 Severity matrix entries (5 yeni)
FEAT-010 §2 Function catalog FN-06 shared kolonu — FEAT-014, 017, 018 eklenmeli

**Karar:** FEAT-018 sonrası **TOPLU CROSS-SPEC SYNC** (4 spec değiştirilecek: FEAT-010 + ilgili spec'lerin shared kolonları). Token tasarrufu için ayrı commit.

---

## 9. Pilot süreç notları

### 9.1 Pilot akışı (2026-05-30)

Tek prompt + 0 follow-up. Konsolidasyonda 2 yeni fonksiyon eklendi (FN-08 RTS destination resolution, FN-09 customer pickup window), 1 numaralandırma düzeltmesi (FN-09 atlanmıştı), 1 section misattribution düzeltmesi (FN-11 §4.1 → §2).

### 9.2 Alıntı doğrulama — section misattribution KALICI

| # | NotebookLM | Gerçek | Durum |
|---|---|---|---|
| FN-01..07 (Phase 1.1 base) | ✅ Hepsi doğru | — | ✅ |
| **FN-11 (RMA decision) ADR-0005 §4.1** | "The dispatcher approves every action..." | 🚨 **§2 Mode 1 Advisory** — **F14'TEKİ AYNI HATA** | ⚠️ Düzeltildi |
| FN-12 (timeline) ADR-0005 §4.1 | "Audit. Every action... logged for later review..." | ✅ **§4.1.6 Audit step** birebir cümle | ✅ |
| FN-13 (SLA) ADR-0011 §6 FEAT-101 | ✅ Doğru | — | ✅ |
| FN-14 (warehouse) ADR-0007 §3.2 | ✅ Birebir | — | ✅ |
| FN-15 (MQTT) ADR-0009 §8 | ✅ Birebir | — | ✅ |

**§number fabrikasyon: 0** ✅ (F8-F10-F17-F14-F18 zinciri stable)
**Section misattribution: 1** ⚠️ (F14'teki AYNI hata, KALICI hata sınıfı)
**Numaralandırma anomalisi: 1** ⚠️ (FN-09 atlandı)
**Toplam alıntı düzeltmesi: 1** (FN-11 §4.1 → §2)

### 9.3 Section misattribution analizi — kalıcı pattern

| Pilot | Hata | Source |
|---|---|---|
| F14 | ADR-0005 §4.1 → §2 (Mode 1 Advisory) | NotebookLM kavramsal yakınlık karıştırıyor |
| F18 | **AYNI HATA TEKRARLANDI** — guard rail prompt'a rağmen | Pattern KALICI |

**Sonuç:** Section misattribution F14'ten beri **kalıcı bir hata sınıfı**. Prompt'taki guard rail uyarısı **yeterli değil** — NotebookLM ADR-0005 §2 Mode 1 Advisory cümlesini sürekli §4.1'e atfediyor.

**Önlem (sonraki pilotlar):**
1. Konsolidasyonda **manuel section doğrulama** zorunlu (sadece §4.1 değil, her ADR-0005 §X.Y dikkatli kontrol)
2. Bu hata önemli değildir başlı başına (alıntı gerçek, sadece konum yanlış) — ama disipline kayıt için belgelenmeli

### 9.4 13 pilot karşılaştırma

| Boyut | F8 | F9 | F10 | F17 | F14 | **F18** |
|---|---|---|---|---|---|---|
| Skor | 9.5 | 8.5 | 9 | 8.5 | 8.5 | **8.5** |
| İterasyon | 1 | 1 | 1 | 1+1 | 1 | **1** |
| Fonksiyon (final) | 9 | 7 | 15 | 13 | 16 | **15** |
| §number fabrikasyon | 0 | 1 | 0 | 0 | 0 | **0** ✅ |
| Section misattribution | 0 | 0 | 0 | 0 | 1 | **1** ⚠️ TEKRARLI |
| Numaralandırma anomalisi | 0 | 0 | 0 | 0 | 0 | **1** ⚠️ yeni |
| Yeni paradigma | Toll | Carbon | Orch | Geo ext | Ext eco | **Multi-flow reverse** |

**F18 gözlemleri:**
- §number fabrikasyon zinciri devam (F8-F10-F17-F14-F18: 0)
- Section misattribution **kalıcı** (F14 → F18)
- Yeni hata sınıfı: **numaralandırma anomalisi** (FN-09 atlandı, NotebookLM tablo continuity'sini kaybetti)
- 3 alt-paradigma boundary korundu — F18'in karmaşık scope'una rağmen disipline OK
- FEAT-017 delegasyon paterni konsolidasyonda eklendi (açık belgeleme)

### 9.5 Trend yorumu — guard rail etkinliği

F8'den beri prompt guard rail evolution:
- **F8-F9:** §number fabrikasyon uyarısı eklendi → F10+ stop
- **F14:** Section misattribution yeni hata sınıfı
- **F17 prompt'ta**: section uyarısı yok → section misattribution F17'de görülmedi
- **F14 prompt'ta**: section uyarısı eklendi → ama F14'te yine ortaya çıktı
- **F18 prompt'ta**: section uyarısı korundu → AMA YİNE TEKRARLANDI

**Hipotez:** Section misattribution NotebookLM'in **semantik benzerlik confusion**'ından geliyor (ADR-0005'te dispatcher approval kavramı hem §2 hem §4.1'de geçiyor). Prompt guard rail bu **kavramsal yakınlığı** çözemiyor. Konsolidasyonda **manuel düzeltme zorunlu**.

---

## 10. Next steps

### 10.1 Cross-spec sync TODO — TOPLU COMMIT (FEAT-018 sonrası)

**Mecburi yapılacak iş**, 5 birikmiş cross-spec sync:

| Spec | Değişiklik |
|---|---|
| **FEAT-010** | `exception_type` CHECK + 5 yeni enum (`locker_pickup_expired`, `tender_withdrawn`, `tender_no_quotes`, `returns_pickup_failed`, `rts_warehouse_unreachable`) |
| **FEAT-010 §5** | Severity matrix 5 yeni entry |
| **FEAT-010 §2** | FN-06 logExceptionEvent shared kolonu FEAT-014, 017, 018 eklenmeli |
| **FEAT-017 §10.1** | Cross-spec sync TODO işaretlendi olarak kapanmalı |
| **FEAT-014 §10.1** | Cross-spec sync TODO işaretlendi olarak kapanmalı |

**Karar:** Bu sync FEAT-018 commit'inden **HEMEN SONRA** yapılır — Cem'den onay alınca tek konsolide commit.

### 10.2 Phase 1.1 implementation backlog (A + B)

- [ ] Schema migration: `enterprise.dispatch_tasks.direction` + `parent_task_id` + INDEX
- [ ] FN-01 createReturnTask
- [ ] FN-02 linkParentTask
- [ ] FN-03 validateReversePolicy
- [ ] FN-04 calculateReturnPriority
- [ ] FN-05 GET /api/dispatcher/returns
- [ ] FN-06 triggerReturnToSender (FEAT-017 delegasyon)
- [ ] FN-07 buildHereProblemWithMixedLoads (FEAT-001 cross-spec sync)
- [ ] FN-08 resolveRtsDestination
- [ ] FN-09 processCustomerPickupWindow

### 10.3 Phase 2 implementation backlog (C RMA + customer-funded trigger)

- [ ] Schema migration: `enterprise.rma_requests`
- [ ] FN-10 POST /api/dispatcher/rma/requests
- [ ] FN-11 evaluateRmaDecision
- [ ] FN-12 getRmaLifecycleTimeline
- [ ] FN-13 monitorRmaSla (hourly cron)
- [ ] FN-14 syncWarehouseReturn (WMS connector FEAT-108)
- [ ] FN-15 broadcastReturnStatus (MQTT)
- [ ] FEAT-108 WMS connector spec (ayrı pilot, customer-funded)

### 10.4 Sıradaki pilot

Cem'in 7 pilot listesinde 4. sırada: **FEAT-015 W14 Automated Freight Audit and Payment**

Yeni paradigma: invoice/contract verification, audit trail, financial accuracy. FEAT-014 tender'ın doğal devamı.

---

## 11. References

- ADR-0001 §3.6 (UI primitives)
- **ADR-0002 §3.2** (HERE native mixed pickup/delivery), §3.4 (soft constraint time-window — addendum)
- ADR-0004 v3 §6 (additive schema changes)
- **ADR-0005 §2** (Mode 1 Advisory — "The dispatcher approves every action before it takes effect"), §4.1 (User flow — Audit step), §5.3 (Auto-dispatch loop), §7 (Policy module stub)
- ADR-0007 §3.2 (Third-party API consumer pattern)
- ADR-0009 §4.4 (dispatcher → driver task flow), §8 (MQTT publish from enterprise)
- **ADR-0010 §3.4** (weighted sum, no learning), §3.5 (ML Phase 3 candidate)
- ADR-0011 §6 (FEAT-101 Mode 2 reference), §9.5 (endpoint patterns)
- FEAT-001 spec v3 (FN-016 buildHereProblem mixed extension, FN-006 list pattern, FN-013 approve)
- FEAT-002 spec (FN-02 POST /replan failed delivery)
- FEAT-003 spec (FN-06 weighted sum, FN-08 policy engine)
- FEAT-005 spec v2 (FN-08 MQTT publish)
- FEAT-006 spec (FN-03 time window, FN-08 dock appointment)
- FEAT-009 spec (carbon footprint emission tracking)
- FEAT-010 spec (FN-06 logExceptionEvent — cross-spec sync 5 yeni exception type)
- FEAT-014 spec (FN-04 deadline monitoring, FN-05 weighted sum)
- FEAT-017 spec (FN-01 findNearbyLockers, FN-11 onCustomerLockerDropoff, FN-12 deadline monitoring — **delegasyon noktası**)
- FEAT-108 (Phase 2 customer-funded WMS connector — henüz spec yok)
- NotebookLM session 2026-05-30 (1 prompt, 8.5/10 skor)

---

## 12. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-30 | Cem Bakir (with Claude + NotebookLM cowork) | İlk konsolide function spec. On üçüncü pilot — reverse logistics handling, wishlist W18. Phase 1.1 (A customer pickup + B failed delivery RTS) + Phase 2 (C RMA lifecycle, customer-funded). 15 fonksiyon (FN-01..FN-15), NotebookLM 13 önerdi (FN-09 atlanmış) + konsolidasyonda 2 ek (FN-08 resolveRtsDestination + FN-09 processCustomerPickupWindow) + numaralandırma düzeltmesi. **Yeni paradigma: Multi-flow Reverse Logistics** — 3 alt-paradigma tek spec'te (A/B/C boundary korundu). HERE Tour Planning mixed pickup/delivery native kullanımı (ADR-0002 §3.2). FEAT-017 delegasyon paterni açık belgelendi (locker_return type FEAT-017:FN-11'e delege). Schema değişiklikleri: `enterprise.dispatch_tasks.direction` + `parent_task_id` (Phase 1.1 additive), `enterprise.rma_requests` yeni tablo (Phase 2), `public.companies.settings.reverse_logistics_policy` JSONB. State machine RMA: rma_requested → approved/rejected → pickup_scheduled → in_transit → warehouse_received → processed → closed. ML disipline kusursuz — return reason prediction Phase 3+, weighted sum FN-04, replacement matching KAPSAM DIŞI. Konsolidasyon düzeltmeleri: FN-11 ADR-0005 §4.1 → §2 (section misattribution — F14'TEKİ AYNI HATA TEKRARLANDI, KALICI hata sınıfı). FN-09 numaralandırma anomalisi düzeltildi (NotebookLM atlamış). FN-08 RTS destination karar matrisi (UNCERTAINTIES #4 cevap — depo mu locker mu?), FN-09 customer pickup window (A alt-paradigma eksiği). Cross-spec sync TODO (TOPLU COMMIT FEAT-018 sonrası): FEAT-010 exception_type CHECK 5 yeni enum value (`locker_pickup_expired`, `tender_withdrawn`, `tender_no_quotes`, `returns_pickup_failed`, `rts_warehouse_unreachable`) + Severity matrix 5 yeni entry + shared kolonu güncellemeleri. §number fabrikasyon = 0 ✅ (F8-F10-F17-F14-F18 zinciri stable). Section misattribution KALICI (F14 + F18), prompt guard rail bu kavramsal confusion'ı çözemiyor — konsolidasyonda manuel düzeltme zorunlu. |
