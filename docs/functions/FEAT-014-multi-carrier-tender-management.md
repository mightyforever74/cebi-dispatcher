# FEAT-014 — Multi-carrier Tender Management

| Field | Value |
|---|---|
| **Feature ID** | FEAT-014 |
| **Source** | Wishlist W13 — "Multi-carrier Tender Management" |
| **Frequency rating** | Common |
| **Tulipfleet Phase** | Phase 2 (customer-funded trigger per ADR-0011 §6) |
| **Spec readiness** | Phase 2 etiketi korunur, spec şimdi yazılır (Yorum B kararı, 2026-05-30) |
| **Status** | Function spec drafted via NotebookLM (1 prompt, 2026-05-30) |
| **Pilot note** | On ikinci pilot. **8.5/10** skor, tek iterasyon. **§number fabrikasyon = 0** ✅ (F8-F10-F17-F14 zinciri), ama yeni hata sınıfı: **section misattribution** (FN-07 ADR-0005 §4.1 → §2). Yeni paradigma: **external carrier ecosystem** — TulipFleet'in ilk dış oyuncu içeren feature'ı. |

---

## 1. Feature description

### 1.1 Wishlist tanımı

> *"Multi-carrier Tender Management: This use case automates the process of requesting and evaluating freight quotes from multiple carriers to secure optimal rates. Estimated frequency: Common."*

### 1.2 Yeni paradigma — External Carrier Ecosystem

TulipFleet'in önceki 11 FEAT'inden **temelden farklı** alan:

| Önceki FEAT'ler | **FEAT-014** |
|---|---|
| Kendi araç filomuzu yönetir | **Dış taşıyıcı** ekosistemine talep gönderir |
| Driver TulipFleet kullanıcısı | Carrier ayrı şirket, kendi sistemi var |
| Hardware (ESP32) odaklı | Purely commercial workflow |
| public.* + enterprise.* schema yeterli | Dış API kontratları, Quote/Bid lifecycle |
| Internal data | **Public endpoint** (carrier portal alternative) |

### 1.3 FEAT-004 ile ilişki — kritik ayrım

| Boyut | **FEAT-004 Hybrid Fleet** | **FEAT-014 Tender** |
|---|---|---|
| Pattern | Ongoing carrier contract | Spot-based tender |
| Rate | Pre-negotiated (carrier_contracts) | Per-job quote |
| Decision | Assignment | Award |
| Carrier data | enterprise.carriers (mevcut FEAT-004) | Aynı tablo + yeni tender_* tabloları |
| Trigger | Daily planning | Specific job opportunity |

FEAT-014, **FEAT-004 schema'sını yeniden kullanır** (carriers + carrier_contracts) ama farklı bir lifecycle ekler.

### 1.4 3PL/gig out-of-scope sınırı — ADR-0011 §7 OUT-002

> *"SiLK federated load pooling — separate product, not in dispatcher scope."*

**FEAT-014 NEDIR DEĞIL:**
- ❌ Federated load pooling (multi-tenant cross-company visibility)
- ❌ Gig worker matching (Uber Freight style)
- ❌ Real-time carrier telematics (FEAT-102+ connector işi)

**FEAT-014 NEDIR:**
- ✅ Single-tenant tender (tek bir TulipFleet customer kendi carrier ağına invitation gönderir)
- ✅ Spot-based quote collection (per-job)
- ✅ Composite score-based award (manuel veya policy-based)

### 1.5 İş mantığı

```
1. Dispatcher görev verir, içeride yapılamıyor
   (kapasite yok / uzak bölge / özel ekipman gerek)

2. createTender (FN-01) — yük detayı + pickup/delivery + window + reqs

3. Carrier seçimi: enterprise.carriers'tan filtreli liste
   (FEAT-004 schema, equipment match, region filter)

4. broadcastTenderInvitations (FN-02) — email + carrier API

5. Quote collection (deadline'a kadar):
   - Portal sahibi carrier: kendi sistemden POST
   - Email link sahibi carrier: public endpoint (token) (FN-03)
   - Partner API entegrasyonu olan: webhook (Phase 2.5+)

6. monitorTenderDeadlines (FN-04) — cron:
   - Deadline geçti, quote yok → FEAT-010 exception
   - Deadline geçti, quotes var → status: pending_award

7. evaluateTenderAutoAward (FN-06) — policy check:
   - Mode 1 (default): manuel award
   - Mode 2 (low-value threshold altı): auto award lowest score

8. Award:
   - POST /award (FN-07) — dispatcher manuel veya auto
   - notifyTenderResult (FN-08) — awarded carrier confirmation,
     non-awarded carriers rejection email

9. Withdrawal (yeni FN-13): awarded carrier görevden çekilirse
   - FEAT-010 exception event
   - Tender re-open veya alternative carrier seç

10. Job completion sonrası:
    - rateCarrier (yeni FN-14) — dispatcher 1-5 yıldız feedback
    - enterprise.carriers.metadata.rating UPDATE
```

### 1.6 Kapsam — içeride (Phase 2)

- Tender lifecycle: draft → broadcast → quotes_collected → evaluating → awarded → closed
- Quote/Bid model (price + ETA + carrier_rating composite)
- Multi-channel invitation (email + carrier API)
- Public endpoint with token (FEAT-005:FN-09 pattern)
- Deadline monitoring + auto-exception (FEAT-010 entegrasyonu)
- Manual award + auto-award policy stub (Phase 2.5 trigger)
- Tender withdrawal flow (carrier görevden çekilirse)
- Equipment matching (refrigerated, laadkraan, vb.)
- Carrier rating UPDATE (dispatcher manuel feedback)

### 1.7 Kapsam — dışarıda

- **SiLK federated load pooling** — ADR-0011 §7 OUT-002 (Phase 3+ separate product)
- **AI quote generation** — Phase 3+ ML candidate
- **Carrier portal (web app)** — Phase 3 ADR pending
- **Predictive market rate** — FEAT-025 Freight Spend Benchmarking ile bağlantılı, Phase 3+
- **Customer preference learning** — ADR-0010 §3.5 Phase 3 candidate
- **Real-time carrier telematics** — FEAT-102+ connector (ayrı feature)

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Phase | Shared with FEAT-001..10,17 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FEAT-014-FN-01 | backend | `createTender` | taskId, deadline, requirements | { tenderId } | enterprise.dispatch_tasks | enterprise.tenders | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 2 | **FEAT-001** task model |
| 2 | FEAT-014-FN-02 | backend | `broadcastTenderInvitations` | tenderId, carrierIds | void | enterprise.carriers, enterprise.tenders | enterprise.tender_invitations | Email API / Carrier API | ADR-0007 §3.2 — "Every third-party telematics provider's API changes over time." | 2 | **FEAT-004** carriers schema |
| 3 | FEAT-014-FN-03 | backend | `POST /api/public/tenders/:inviteId/quote` | inviteId, **token (query param)**, price, estimatedEta, carrierRef | Success | enterprise.tender_invitations | enterprise.tender_quotes | — | ADR-0004 v3 §6 — "Additive ve geriye dönük uyumlu... değişikliklere izin verilir." | 2 | **FEAT-005:FN-09** public endpoint token pattern |
| 4 | FEAT-014-FN-04 | worker | `monitorTenderDeadlines` | (cron trigger, hourly) | void | enterprise.tenders | enterprise.exception_events | — | ADR-belirsiz (deadline monitoring pattern — FEAT-017:FN-12 paterni) | 2 | **FEAT-010:FN-06** logExceptionEvent + **FEAT-017:FN-12** pattern |
| 5 | FEAT-014-FN-05 | shared_library | `calculateQuoteScore` | price, eta, carrierRating, weights | score: numeric (0-100) | public.companies (settings) | — | — | ADR-0010 §3.4 — "'Reward function' in conversation → in implementation, it is a weighted sum of constraint penalties in HERE's `objective`. **No learning.**" | 2 | **FEAT-003:FN-06** + **FEAT-007:FN-03** weighted sum pattern |
| 6 | FEAT-014-FN-06 | backend | `evaluateTenderAutoAward` | tenderId | Decision | enterprise.tender_quotes, public.companies (settings) | — | — | ADR-0005 §5.3 — "If rules permit, system auto-assigns and dispatches." | 2 | **FEAT-003:FN-08** + **FEAT-010:FN-08** policy engine pattern |
| 7 | FEAT-014-FN-07 | backend | `POST /api/dispatcher/tenders/:id/award` | id, quoteId, (JWT.user_id) | Success | enterprise.tender_quotes | enterprise.tenders (status=awarded), enterprise.dispatch_tasks (assignment) | — | ADR-0005 §2 — "Mode 1 — Advisory: The system suggests dispatch decisions. The dispatcher approves every action before it takes effect." | 2 | **FEAT-001:FN-013** approve pattern |
| 8 | FEAT-014-FN-08 | backend | `notifyTenderResult` | tenderId | void | enterprise.tender_quotes, enterprise.carriers | — | Carrier API / Email | ADR-0007 §3.2 — "Schema mapping maintenance (provider renames fields, adds fields, changes data types)." | 2 | — |
| 9 | FEAT-014-FN-09 | backend | `GET /api/dispatcher/tenders` | company_id, status, period | Tender[] | enterprise.tenders | — | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 2 | — |
| 10 | FEAT-014-FN-10 | backend | `GET /api/dispatcher/tenders/:id/quotes` | id, (JWT.company_id) | Quote[] | enterprise.tender_quotes | — | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 2 | — |
| 11 | FEAT-014-FN-11 | frontend | `<TenderCreationModal />` | taskId | UI Component | — | — | — | ADR-0001 §3.6 — "Forms, modals, navigation, layout primitives" | 2 | — |
| 12 | FEAT-014-FN-12 | frontend | `<QuoteComparisonView />` | tenderId | UI Component | enterprise.tender_quotes | — | — | ADR-0001 §3.6 — "React Table — Vehicle / driver / task lists with sort, filter, paging" | 2 | — |
| 13 | FEAT-014-FN-13 | backend | `POST /api/dispatcher/tenders/:id/withdraw` (**KONSOLIDASYONDA EKLENDİ**) | id, reason, (JWT.user_id) | Success | enterprise.tenders | enterprise.tenders (status=closed), enterprise.exception_events | — | ADR-belirsiz (carrier withdrawal pattern) | 2 | **FEAT-010:FN-06** logExceptionEvent |
| 14 | FEAT-014-FN-14 | backend | `POST /api/dispatcher/carriers/:id/rate` (**KONSOLIDASYONDA EKLENDİ**) | id, taskId, stars (1-5), comment, (JWT.user_id) | Success | enterprise.dispatch_tasks (status=completed) | enterprise.carriers (metadata.ratings) | — | ADR-0010 §3.4 — "configuration that the dispatcher tunes manually based on observed outcomes. No online learning." | 2 | — |
| 15 | FEAT-014-FN-15 | shared_library | `filterCarriersByEquipment` (**KONSOLIDASYONDA EKLENDİ**) | requirements (refrigerated, hazmat, weight_class, ...) | Carrier[] | enterprise.carriers, enterprise.carrier_contracts | — | — | ADR-0004 v3 §6 — additive equipment metadata | 2 | **FEAT-007:FN-13** getEffectiveThresholds (skills matching pattern) |
| 16 | FEAT-014-FN-16 | shared_library | `generateTenderInviteToken` (**KONSOLIDASYONDA EKLENDİ**) | inviteId, expiryHours | { token, expiresAt } | — | — | — | FEAT-005:FN-09 public token pattern (random URL-safe token, expiresAt) | 2 | **FEAT-005:FN-09** customer token pattern |

**Konsolidasyon notları (NotebookLM çıktısına göre düzeltmeler):**

| # | NotebookLM dedi | Düzeltme |
|---|---|---|
| **FN-07 ADR-0005 §4.1** | "The dispatcher approves every action before it takes effect" | 🚨 **Section yanlış** — alıntı gerçek ama §4.1'de DEĞİL, **§2 Mode 1 Advisory tanımı**'nda. ✅ Düzeltildi: ADR-0005 §2 |
| **FN-13 Withdrawal flow** | Bahsedilmedi, UNCERTAINTIES'te tartışıldı | ✅ **EKLENDİ FN-13** `POST /tenders/:id/withdraw` — carrier görevden çekilirse exception flow |
| **FN-14 Carrier rating UPDATE** | UNCERTAINTIES'te bahsedildi ama endpoint yok | ✅ **EKLENDİ FN-14** `POST /carriers/:id/rate` — dispatcher manuel feedback (ADR-0010 §3.4 "configuration not learning") |
| **FN-15 Equipment matching** | Quote evaluation metrics'te listeli ama fonksiyon yok | ✅ **EKLENDİ FN-15** `filterCarriersByEquipment` — invitation öncesi carrier filter |
| **FN-16 Token mekanizması** | UNCERTAINTIES'te öneri var, spec'te yok | ✅ **EKLENDİ FN-16** `generateTenderInviteToken` — FEAT-005:FN-09 random token pattern reuse |
| FN-03 token query param | NotebookLM `carrierRef` parametresi var ama token yok | ✅ **Düzeltildi** — `token` query param eklendi (FN-16 ile üretilen) |
| FN-04 ADR-belirsiz | Doğru işaretleme | ✅ Korundu (FEAT-017:FN-12 paterni belirtildi) |
| Diğer 8 alıntı | ✅ Doğru | — |

**Fonksiyon sayısı:** NotebookLM 12 → konsolidasyon **16** (4 yeni eklendi: FN-13, FN-14, FN-15, FN-16).

---

## 3. Tender lifecycle state machine

```
                  createTender (FN-01)
                          │
                          ▼
                    ┌────────┐
                    │ draft  │
                    └────┬───┘
                         │
              broadcastTenderInvitations (FN-02)
                         │
                         ▼
                    ┌──────────┐
                    │   open   │ ◄── public endpoint quote collection (FN-03)
                    └────┬─────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
   monitorTenderDeadlines (FN-04, hourly cron)
              │          │          │
        deadline +   deadline +    deadline +
        no quotes    quotes >0     withdrawal (FN-13)
              │          │          │
              ▼          ▼          ▼
        ┌─────────┐  ┌──────────────┐  ┌────────┐
        │ closed  │  │pending_award │  │ closed │
        │(no bids)│  └──────┬───────┘  │(withdrew)│
        └─────────┘         │          └────────┘
        FEAT-010             │
        exception           │
                evaluateTenderAutoAward (FN-06)
                            │
                ┌───────────┴───────────┐
                │                       │
            auto (Mode 2)           manual (Mode 1)
                │                       │
                ▼                       ▼
        POST /award (FN-07) ◄── dispatcher decision
                            │
                            ▼
                    ┌────────────┐
                    │  awarded   │
                    └─────┬──────┘
                          │
                notifyTenderResult (FN-08)
                          │
              awarded carrier ◄──── confirmation
              non-awarded ◄──────── rejection
                          │
                          ▼
                    job execution (dış sistem)
                          │
                          ▼
                rateCarrier (FN-14, dispatcher feedback)
                          │
                          ▼
                    ┌──────────┐
                    │  closed  │
                    │ (completed)│
                    └──────────┘
```

**State enum** (`enterprise.tenders.status`):
- `draft` — created, henüz broadcast edilmedi
- `open` — broadcast edildi, quote toplama açık
- `pending_award` — deadline geçti, quotes var, award bekleniyor
- `awarded` — bir quote seçildi
- `closed` — completed, withdrew, expired_no_bids (subtype `closure_reason`)

---

## 4. Public endpoint security (FN-03 + FN-16)

### 4.1 Token mekanizması — FEAT-005:FN-09 pattern reuse

**Problem:** Carrier portal henüz yok (Phase 3 ADR). Email link sahibi carrier'ların quote göndermesi gerek ama JWT yok.

**Çözüm:** FEAT-005:FN-09 customer-facing tracking token paterniyle aynı — random URL-safe token + expiresAt.

```typescript
// FN-16 generateTenderInviteToken
function generateTenderInviteToken(inviteId, expiryHours = 168) {  // 7 gün default
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + expiryHours * 3600 * 1000);
  
  await db.query(`
    UPDATE enterprise.tender_invitations
    SET access_token = $1, token_expires_at = $2
    WHERE id = $3
  `, [token, expiresAt, inviteId]);
  
  return { token, expiresAt };
}
```

**Schema:** `enterprise.tender_invitations` tablosuna `access_token TEXT` + `token_expires_at TIMESTAMPTZ` eklenmeli (§5.2).

**Email link örnek:**
```
https://api.tulipfleet.com/api/public/tenders/[inviteId]/quote?token=[token]
```

### 4.2 Public endpoint authorization (FN-03)

```typescript
// FN-03 POST /api/public/tenders/:inviteId/quote
fastify.post('/api/public/tenders/:inviteId/quote', async (request, reply) => {
  const { inviteId } = request.params;
  const { token } = request.query;
  
  // 1. Token validation
  const invite = await db.query(`
    SELECT id, tender_id, carrier_id, token_expires_at
    FROM enterprise.tender_invitations
    WHERE id = $1 AND access_token = $2
  `, [inviteId, token]);
  
  if (!invite || new Date() > invite.token_expires_at) {
    return reply.code(401).send({ error: 'Invalid or expired token' });
  }
  
  // 2. Tender status check (must be 'open')
  // 3. Quote upsert (idempotent — carrier birden fazla submit edebilir, son geçerli)
  // 4. Audit log
});
```

**Rate limiting:** Aynı token üzerinde 10/dakika (Fastify @fastify/rate-limit plugin). Bu carrier'a güveniliyor ama bot saldırılarına karşı koruma.

### 4.3 ADR-0007 §3.2 kontekst

NotebookLM bu pattern'i ADR-0007 §3.2'ye bağladı:
> *"Every third-party telematics provider's API changes over time."*

Public endpoint + token = TulipFleet'in **carrier-facing API**'sinin bir parçası. ADR-0007 customer-funded connector paterniyle uyumlu — büyük carrier'lar kendi sistem entegrasyonunu yaparken küçük carrier'lar email link kullanır.

---

## 5. Database schema (Phase 2 additive)

### 5.1 `enterprise.tenders` — yeni tablo

```sql
CREATE TABLE enterprise.tenders (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    dispatch_task_id     UUID NOT NULL REFERENCES enterprise.dispatch_tasks(id),
    
    status               TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'open', 'pending_award', 'awarded', 'closed')),
    closure_reason       TEXT  -- 'completed' | 'expired_no_bids' | 'withdrawn' | 'cancelled' (status='closed' iken)
                         CHECK (closure_reason IS NULL OR closure_reason IN 
                                ('completed', 'expired_no_bids', 'withdrawn', 'cancelled')),
    
    requirements         JSONB NOT NULL,  -- equipment, weight, special needs
    -- Örnek: { "vehicle_class": "rigid_truck", "refrigerated": true, "weight_kg": 5000 }
    
    deadline_at          TIMESTAMPTZ NOT NULL,
    awarded_quote_id     UUID,  -- FK to enterprise.tender_quotes (after award)
    auto_award_eligible  BOOLEAN NOT NULL DEFAULT false,
    
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    awarded_at           TIMESTAMPTZ,
    closed_at            TIMESTAMPTZ,
    
    audit_trail          JSONB NOT NULL DEFAULT '[]'::jsonb
    -- Append-only state transitions: [{ from: "draft", to: "open", at: "...", by: "user_id" }]
);

CREATE INDEX idx_tenders_company_status ON enterprise.tenders (company_id, status, deadline_at);
CREATE INDEX idx_tenders_dispatch_task ON enterprise.tenders (dispatch_task_id);
```

### 5.2 `enterprise.tender_invitations` — yeni tablo

```sql
CREATE TABLE enterprise.tender_invitations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id            UUID NOT NULL REFERENCES enterprise.tenders(id) ON DELETE CASCADE,
    carrier_id           UUID NOT NULL REFERENCES enterprise.carriers(id),
    company_id           UUID NOT NULL REFERENCES public.companies(id),  -- denormalized tenant guard
    
    status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'sent', 'delivered', 'responded', 'rejected', 'expired')),
    
    -- Public endpoint token (FN-16, FEAT-005:FN-09 paterni)
    access_token         TEXT UNIQUE,
    token_expires_at     TIMESTAMPTZ,
    
    -- Communication channel
    invitation_channel   TEXT NOT NULL CHECK (invitation_channel IN ('email', 'api', 'portal')),
    notified_at          TIMESTAMPTZ,
    responded_at         TIMESTAMPTZ,
    
    metadata             JSONB,  -- delivery receipts, API response codes, vb.
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (tender_id, carrier_id)
);

CREATE INDEX idx_invitations_tender ON enterprise.tender_invitations (tender_id, status);
CREATE INDEX idx_invitations_token ON enterprise.tender_invitations (access_token) 
  WHERE access_token IS NOT NULL;
```

### 5.3 `enterprise.tender_quotes` — yeni tablo

```sql
CREATE TABLE enterprise.tender_quotes (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id            UUID NOT NULL REFERENCES enterprise.tender_invitations(id) ON DELETE CASCADE,
    tender_id                UUID NOT NULL REFERENCES enterprise.tenders(id),  -- denormalized
    company_id               UUID NOT NULL REFERENCES public.companies(id),  -- tenant guard
    
    -- Quote details
    price_eur                NUMERIC(10,2) NOT NULL,
    estimated_eta            TIMESTAMPTZ NOT NULL,
    
    -- Snapshot at submission (rating may change later)
    carrier_rating_at_time   NUMERIC(3,2),  -- 1.00-5.00, mevcut rating snapshot
    
    -- Calculated by FN-05
    score                    NUMERIC(5,2),  -- 0-100 composite score
    
    -- Carrier-specific reference
    carrier_quote_ref        TEXT,  -- carrier'ın kendi quote ID'si (opsiyonel)
    
    -- Quote validity (UNCERTAINTIES #1)
    valid_until              TIMESTAMPTZ,  -- carrier'ın belirttiği expiry
    
    metadata                 JSONB,  -- vehicle_assigned, driver_assigned, vb.
    
    submitted_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (invitation_id)  -- her invitation için tek geçerli quote
);

CREATE INDEX idx_quotes_tender_score ON enterprise.tender_quotes (tender_id, score DESC);
```

### 5.4 `public.companies.settings.tender_policy` — JSONB additive

```jsonc
{
  ...
  "tender_policy": {
    "auto_award_enabled": false,           // default Mode 1 Advisory
    "auto_award_threshold_eur": 500,       // bu altı auto-award
    "score_weights": {
      "price": 0.5,                        // %50
      "eta": 0.3,                          // %30
      "rating": 0.2                        // %20
    },
    "default_quote_deadline_hours": 24,    // tender broadcast → deadline
    "invite_token_expiry_hours": 168       // 7 gün default
  }
}
```

### 5.5 `enterprise.carriers.metadata` — rating extension (FN-14)

`enterprise.carriers.metadata` JSONB (mevcut, FEAT-004) içinde:

```jsonc
{
  ...
  "ratings": [
    {
      "task_id": "uuid",
      "stars": 5,
      "comment": "On-time, professional",
      "rated_at": "2026-05-30T14:00:00Z",
      "rated_by": "user_uuid"
    },
    ...
  ],
  "rating_stats": {
    "avg": 4.7,
    "count": 23,
    "last_updated": "2026-05-30T14:00:00Z"
  }
}
```

`rating_stats` FN-14 her UPDATE'te yeniden hesaplanır (trigger veya app-layer).

---

## 6. Composite scoring algorithm (FN-05)

ADR-0010 §3.4 weighted sum pattern:

```typescript
function calculateQuoteScore(quote, weights, marketContext) {
  // 1. Price score (lower is better, normalize 0-100)
  const priceMin = marketContext.lowestPrice;
  const priceMax = marketContext.highestPrice;
  const priceScore = priceMax === priceMin 
    ? 100 
    : 100 * (priceMax - quote.price_eur) / (priceMax - priceMin);
  
  // 2. ETA score (earlier within window is better)
  const etaScore = calculateEtaWindowScore(quote.estimated_eta, marketContext.taskWindow);
  
  // 3. Carrier rating score (1-5 stars → 0-100)
  const ratingScore = quote.carrier_rating_at_time 
    ? (quote.carrier_rating_at_time / 5) * 100
    : 50;  // No rating: neutral
  
  // Composite (ADR-0010 §3.4 — configuration, not learned)
  const score = 
    weights.price * priceScore +
    weights.eta * etaScore +
    weights.rating * ratingScore;
  
  return Math.round(score * 100) / 100;
}
```

**ML disipline:**
- Weights per-company configurable (`tender_policy.score_weights`)
- **No learning** — weights manuel, dispatcher tarafından "tunable"
- ADR-0010 §3.4: *"It is a weighted sum of constraint penalties in HERE's `objective`. No learning."*
- Per-company tweaking expected, ML değil

---

## 7. Withdrawal flow (FN-13) — yeni

```
Awarded carrier görevden çekilir (manuel notification veya carrier API webhook):

1. POST /api/dispatcher/tenders/:id/withdraw (FN-13)
   - id: tender_id
   - reason: 'carrier_unavailable' | 'capacity_exceeded' | 'price_change' | 'other'
   - comment: optional explanation
   
2. enterprise.tenders UPDATE:
   - status: awarded → closed
   - closure_reason: 'withdrawn'
   - audit_trail append: { from: "awarded", to: "closed", reason: "withdrawn", at: "...", by: "..." }

3. FEAT-010:FN-06 logExceptionEvent:
   - exception_type: 'tender_withdrawn' (FEAT-010 schema CHECK genişletilmeli)
   - severity: 'high' (görev planlaması bozuldu)
   - detection_payload: { tender_id, carrier_id, original_quote_id, reason }
   
4. Dispatcher options (Mode 1 Advisory):
   - Re-open tender (yeni FN-01 call)
   - Award to next-best quote (auto-suggestion)
   - Convert to internal task (FEAT-001 normal planning)
   - Cancel job (customer notification)
```

**Cross-spec sync TODO:** FEAT-010 `exception_type` CHECK'e eklenmeli:
- `'tender_withdrawn'`
- `'tender_no_quotes'` (FN-04 deadline + no quotes)
- `'locker_pickup_expired'` (FEAT-017'den kalan)

---

## 8. Equipment matching (FN-15) — yeni

```typescript
// FN-15 filterCarriersByEquipment
function filterCarriersByEquipment(companyId, requirements) {
  // requirements örnek:
  // { vehicle_class: "rigid_truck", refrigerated: true, weight_kg: 5000, hazmat: false }
  
  return db.query(`
    SELECT c.* FROM enterprise.carriers c
    JOIN enterprise.carrier_contracts cc ON cc.carrier_id = c.id
    WHERE c.company_id = $1
      AND c.status = 'active'
      AND (
        c.metadata->'equipment'->>'vehicle_class' = $2
        OR c.metadata->'equipment'->'vehicle_classes' @> $3::jsonb
      )
      AND (
        $4::boolean IS FALSE  -- refrigerated gerekmiyorsa atla
        OR (c.metadata->'equipment'->>'refrigerated')::boolean = true
      )
      AND (
        $5::integer IS NULL  -- weight constraint yoksa atla
        OR (c.metadata->'equipment'->>'max_weight_kg')::integer >= $5
      )
  `, [companyId, requirements.vehicle_class, JSON.stringify([requirements.vehicle_class]),
      requirements.refrigerated, requirements.weight_kg]);
}
```

**Schema gerek:** `enterprise.carriers.metadata.equipment` JSONB key — FEAT-004 schema'ya additive (Phase 2 trigger'da uygulanır).

**Skills matching paterni:** FEAT-007:FN-13 `getEffectiveThresholds` ile aynı kavram — JSONB key path lookup, COALESCE fallback.

---

## 9. UNCERTAINTIES (Cem onayı bekleyen)

### NotebookLM'in tespit ettikleri

1. **Quote geçerlilik süresi:** Carrier'ın verdiği quote ne kadar geçerli?
   - **Karar:** `enterprise.tender_quotes.valid_until` kolon — carrier kendi expiry'sini belirtir. Default: tender deadline + 24h.
   - Otomatik silme YOK — audit trail için saklanır, ama award sırasında expired ise rejection.

2. **Email link güvenliği:** Token mekanizması nasıl?
   - **Karar:** FEAT-005:FN-09 random URL-safe token paterni (FN-16). 256-bit entropy, default 7 gün expiry. ✅ Konsolidasyonda eklendi.

3. **Sigorta/belge kontrolü:** Dijital doğrulama Phase 2'de mi?
   - **Karar (Phase 2 başlangıç):** YOK — carrier kendi belge yönetiminden sorumlu. `enterprise.carriers.metadata.compliance` JSONB'de manuel dispatcher onayı (verified_at + verified_by + document_urls).
   - **Phase 3+ ADR:** Otomatik KvK/RDW API doğrulama düşünülebilir.

4. **İptal senaryosu:** Awarded carrier çekilirse?
   - **Karar:** FN-13 withdrawal flow + FEAT-010 exception entegrasyonu. ✅ Konsolidasyonda eklendi.

### Konsolidasyonda eklenenler

5. **Multi-currency support:** EUR default ama USD/GBP gerekecek mi?
   - **Karar:** Phase 2 başlangıç EUR-only (NL pazar). Phase 3+'ta currency support gerekirse `tender_quotes.currency` kolonu (default EUR) + exchange rate snapshot (ECB API consumer).

6. **Tender re-opening:** Withdrew sonrası tender yeniden açılabilir mi?
   - **Karar:** **EVET ama yeni tender olarak** (FN-01 yeniden çağrılır). Eski tender immutable kalır (audit trail). Yeni tender_id, eski'ye referans `metadata.previous_tender_id`.

7. **Carrier rating dispute:** Carrier rating'e itiraz ederse?
   - **Karar:** Phase 2 başlangıç YOK. Dispatcher feedback final. Phase 3+ "Carrier portal" gelirse two-way feedback eklenir.

8. **Public endpoint rate limiting:**
   - **Karar:** Token başına 10/dakika (Fastify @fastify/rate-limit). Brute force token tahmini önler.

9. **Auto-award threshold senaryosu:** €500 default ama hangi para birimi base?
   - **Karar:** Per-company override `tender_policy.auto_award_threshold_eur` (EUR sabit Phase 2). Phase 3+ multi-currency gelirse genişler.

10. **Equipment metadata structure:** Standart bir liste mi?
    - **Karar:** Initial liste — `vehicle_class`, `refrigerated`, `hazmat`, `tail_lift`, `crane (laadkraan)`, `max_weight_kg`, `max_volume_m3`. Open extensible JSONB.

---

## 10. Shared infrastructure with previous FEAT'leri

| FEAT-014 fonksiyon | Shared with | Paylaşım türü |
|---|---|---|
| FN-01 createTender | **FEAT-001** task model | Tender = dispatch_task externalization |
| FN-02 broadcastTenderInvitations | **FEAT-004** carriers schema | enterprise.carriers + carrier_contracts reuse |
| FN-03 POST /public/quote | **FEAT-005:FN-09** token pattern | Public endpoint + random token + expiry |
| FN-04 monitorTenderDeadlines | **FEAT-010:FN-06** + **FEAT-017:FN-12** | Hourly cron deadline pattern, FEAT-010 exception write |
| FN-05 calculateQuoteScore | **FEAT-003:FN-06** + **FEAT-007:FN-03** | Weighted sum pattern (ADR-0010 §3.4) |
| FN-06 evaluateTenderAutoAward | **FEAT-003:FN-08** + **FEAT-010:FN-08** | Policy engine stub (Mode 1/2 ADR-0005 §7) |
| FN-07 POST /award | **FEAT-001:FN-013** approve pattern | Mode 1 dispatcher approve |
| FN-13 POST /withdraw | **FEAT-010:FN-06** | Exception event writer |
| FN-15 filterCarriersByEquipment | **FEAT-007:FN-13** | Skills matching JSONB lookup pattern |
| FN-16 generateTenderInviteToken | **FEAT-005:FN-09** | Random token + expiry pattern |

**Cross-spec sync TODO (toplu):**
- FEAT-010 `exception_type` CHECK constraint genişletme:
  - `'tender_withdrawn'` (FN-13)
  - `'tender_no_quotes'` (FN-04 deadline + 0 quotes)
  - `'locker_pickup_expired'` (FEAT-017'den kalan)

---

## 11. Pilot süreç notları

### 11.1 Pilot akışı (2026-05-30)

Tek prompt + 0 follow-up. Konsolidasyonda 4 yeni fonksiyon eklendi (NotebookLM kaçırdığı disipline noktaları): withdrawal, rating UPDATE, equipment matching, token generation.

### 11.2 Alıntı doğrulama — yeni hata sınıfı

| # | NotebookLM | Gerçek | Durum |
|---|---|---|---|
| **FN-07 ADR-0005 §4.1** | "The dispatcher approves every action before it takes effect" — gerçek alıntı | 🚨 Gerçek konum **§2 Mode 1 Advisory** | ⚠️ **Section misattribution** — düzeltildi |
| FN-08 ADR-0007 §3.2 (Schema mapping) | ✅ Birebir cümle | — | ✅ |
| FN-05 ADR-0010 §3.4 | ✅ Birebir cümle | — | ✅ |
| FN-06 ADR-0005 §5.3 | ✅ Birebir cümle | — | ✅ |
| Diğer 8 alıntı | ✅ Doğru | — | ✅ |

**§number fabrikasyon: 0** ✅ (F8-F10-F17-F14 zinciri stable)
**Section misattribution: 1** ⚠️ (YENİ HATA SINIFI)
**Toplam alıntı düzeltmesi: 1** (FN-07 §4.1 → §2)

### 11.3 Yeni hata sınıfı analizi

**Section misattribution** (alıntı doğru ama section yanlış):
- F1-F17 zincirinde **görülmedi** (önceki hatalar fabrikasyon veya parafrazdı)
- F14'te ilk kez ortaya çıktı (NotebookLM doğru cümleyi yanlış section'a atfetti)

**Hipotez:** ADR-0005 §4.1 "Mode 1 user flow"'da dispatcher approval kavramı geçer, ama tam cümle §2'de. NotebookLM iki bölümün **semantik yakınlığını** karıştırmış olabilir.

**Önlem (sonraki pilotlar):** Prompt'ta "Section numarasından emin değilsen sadece ADR-XXXX yaz — section misattribution da fabrikasyon kadar ciddi" eklenebilir.

### 11.4 12 pilot karşılaştırma

| Boyut | F8 | F9 | F10 | F17 | **F14** |
|---|---|---|---|---|---|
| Skor | 9.5 | 8.5 | 9 | 8.5 | **8.5** |
| İterasyon | 1 | 1 | 1 | 1+1 | **1** |
| Fonksiyon (final) | 9 | 7 | 15 | 13 | **16** (12 + 4 extension) |
| Alıntı hatası | 1 | 2 | 1 | 1 | **1** |
| §number fabrikasyon | 0 | 1 | 0 | 0 | **0** ✅ |
| Section misattribution | 0 | 0 | 0 | 0 | **1** ⚠️ yeni |
| Yeni paradigma | Toll | Carbon | Orchestrator | Geofence ext | **External ecosystem** |

**F14 gözlemleri:**
- §number fabrikasyon zinciri devam (F8-F10-F17-F14: 0)
- Yeni hata sınıfı: section misattribution (alıntı gerçek ama yanlış section)
- Konsolidasyonda 4 yeni fonksiyon — NotebookLM disipline noktalarını kaçırdı
- Yeni paradigma: external carrier ecosystem (ilk dış oyuncu)

---

## 12. Next steps

### 12.1 Cross-spec sync — toplu commit önerisi

3 birikmiş cross-spec sync:
1. **FEAT-010** `exception_type` CHECK:
   - `'locker_pickup_expired'` (FEAT-017)
   - `'tender_withdrawn'` (FEAT-014:FN-13)
   - `'tender_no_quotes'` (FEAT-014:FN-04)
2. **FEAT-010** §5 Severity matrix entries (3 yeni)
3. **FEAT-010** §2 Function catalog FN-06 shared kolonuna FEAT-017 + FEAT-014 eklenmeli

**Karar:** FEAT-018 commit sonrası **toplu cross-spec sync** (FEAT-018'in muhtemelen 4. exception type'ı olacak — `'returns_pickup_failed'`).

### 12.2 Phase 2 implementation backlog (customer-funded trigger)

- [ ] Schema migration: 3 yeni tablo (`enterprise.tenders`, `tender_invitations`, `tender_quotes`)
- [ ] Schema migration: `enterprise.carriers.metadata.ratings` + `equipment` JSONB extension
- [ ] FN-01 createTender
- [ ] FN-02 broadcastTenderInvitations (email + API)
- [ ] FN-03 POST /api/public/tenders/:inviteId/quote (token validation)
- [ ] FN-04 monitorTenderDeadlines (hourly cron)
- [ ] FN-05 calculateQuoteScore
- [ ] FN-06 evaluateTenderAutoAward
- [ ] FN-07 POST /award
- [ ] FN-08 notifyTenderResult
- [ ] FN-09, FN-10 GET endpoints
- [ ] FN-11, FN-12 React components
- [ ] FN-13 POST /withdraw
- [ ] FN-14 POST /carriers/:id/rate
- [ ] FN-15 filterCarriersByEquipment
- [ ] FN-16 generateTenderInviteToken
- [ ] FEAT-010 cross-spec sync (exception types)

### 12.3 Customer trigger conditions

Phase 2 customer-funded trigger için minimum kriterler:
- Paying customer signs contract with budget for multi-carrier workflow
- Customer has ≥3 external carriers they already work with
- Customer accepts Mode 1 Advisory pattern (manual award default)

Customer trigger geldiğinde Phase 2 implementation 4-6 hafta tahmini (16 fonksiyon, 3 yeni tablo, email/API entegrasyon).

### 12.4 Sıradaki pilot

**FEAT-018 W18 Reverse Logistics Handling** — Cem'in 7 pilot listesinde 3. sırada.

Yeni paradigma: forward-delivery flow tersine + customer returns + warehouse re-integration. FEAT-001 VRP üstüne reverse flow.

---

## 13. References

- ADR-0001 §3.6 (UI primitives — Forms, modals, React Table)
- ADR-0004 v3 §6 (additive enterprise.* + public.* schema changes)
- **ADR-0005 §2** (Mode 1 Advisory — "The system suggests dispatch decisions. The dispatcher approves every action before it takes effect.")
- ADR-0005 §5.3 (Auto-dispatch loop — Mode 2)
- ADR-0005 §7 (Policy module stub)
- ADR-0007 §3.2 (Third-party API consumer pattern + schema mapping maintenance)
- ADR-0009 §4.1 (grants matrix — enterprise.carriers, dispatch_tasks)
- **ADR-0010 §3.4** (weighted sum, no learning), §3.5 (ML Phase 3 candidate — carrier rating prediction)
- ADR-0011 §6 (Phase 2 customer-funded triggers), §7 OUT-002 (federated load pooling out-of-scope), §9.5 (endpoint patterns)
- FEAT-001 spec v3 (FN-016 buildHereProblem capacity calc)
- FEAT-003 spec (FN-06 weighted sum, FN-08 policy engine)
- FEAT-004 spec (carriers + carrier_contracts schema reuse)
- FEAT-005 spec v2 (FN-09 customer-facing token pattern)
- FEAT-007 spec v3 (FN-13 skills matching JSONB pattern)
- FEAT-010 spec (FN-06 logExceptionEvent target — cross-spec sync 3 yeni exception type)
- FEAT-017 spec (FN-12 deadline monitoring pattern + cross-spec sync grup)
- NotebookLM session 2026-05-30 (1 prompt, 8.5/10 skor)

---

## 14. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-30 | Cem Bakir (with Claude + NotebookLM cowork) | İlk konsolide function spec. On ikinci pilot — multi-carrier tender management, wishlist W13. Phase 2 customer-funded (Yorum B: etiket korunur, spec şimdi yazılır). 16 fonksiyon (FN-01..FN-16), NotebookLM 12 önerdi + konsolidasyonda 4 ek (FN-13 withdrawal, FN-14 rating UPDATE, FN-15 equipment matching, FN-16 token generation). **Yeni paradigma: External Carrier Ecosystem** — TulipFleet'in ilk dış oyuncu içeren feature'ı. FEAT-004 schema yeniden kullanılır (carriers, carrier_contracts), 3 yeni tablo eklenir (tenders, tender_invitations, tender_quotes). State machine: draft → open → pending_award → awarded/closed. Public endpoint + token paterni (FEAT-005:FN-09 reuse). Composite scoring weighted sum (ADR-0010 §3.4 — price/eta/rating konfigürasyon, ML değil). Carrier rating manuel 1-5 yıldız + auto metrics (ML Phase 3+ candidate). ML disipline kusursuz — AI quote generation yok, customer preference learning Phase 3+. 3PL/gig OUT-002 sınırı korundu (federated load pooling kapsam dışı). ADR-0011 §6 customer-funded trigger pattern. Konsolidasyon düzeltmeleri: FN-07 ADR-0005 §4.1 → §2 (section misattribution — yeni hata sınıfı, alıntı gerçek ama §2 Mode 1 Advisory tanımında, §4.1'de değil). Cross-spec sync TODO: FEAT-010 exception_type CHECK genişletilmeli (`tender_withdrawn`, `tender_no_quotes`, `locker_pickup_expired` ile birlikte 3 yeni enum). §number fabrikasyon = 0 ✅ (F8-F10-F17-F14 zinciri stable), ama section misattribution yeni hata sınıfı (F14'te ilk). |
