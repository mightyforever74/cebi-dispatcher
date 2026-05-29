# FEAT-015 — Automated Freight Audit and Payment

| Field | Value |
|---|---|
| **Feature ID** | FEAT-015 |
| **Source** | Wishlist W14 — "Automated Freight Audit and Payment" |
| **Frequency rating** | **Very common** |
| **Tulipfleet Phase** | Phase 2 (customer-funded trigger per ADR-0011 §6) |
| **Spec readiness** | Yorum B kararı, 2026-05-30 — Phase 2 etiketi korunur, spec şimdi yazılır |
| **Status** | Function spec drafted via NotebookLM (1 prompt, 2026-05-30) |
| **Pilot note** | On dördüncü pilot. **9/10** skor (zirve potansiyel). **§number fabrikasyon = 0** ✅ (F8-F10-F17-F14-F18-F15 zinciri stable). **Section misattribution = 0** ✅ **TOPARLAMA** (F14+F18'deki kalıcı hata F15'te tekrarlanmadı — guard rail etkili). Yeni paradigma: **financial audit workflow** — TulipFleet'in ilk finansal feature'ı. |

---

## 1. Feature description

### 1.1 Wishlist tanımı

> *"Software electronically verifies carrier invoices against pre-rated amounts and contract terms to ensure financial accuracy. Estimated frequency: Very common."*

### 1.2 Yeni paradigma — Financial Audit

Önceki 13 FEAT'in tümünden farklı bir alan:

| Önceki 13 FEAT | **FEAT-015** |
|---|---|
| Operational workflow | **Financial workflow** |
| Driver/dispatcher persona | **Finance/accounting persona** |
| Real-time data | **Post-execution invoice processing** |
| HERE/EMQX consumers | **LLM/OCR API consumer + reconciliation engine** |

### 1.3 FEAT-014 ile ilişki — financial closure

FEAT-014 Tender Management'ın **doğal finansal kapanışı:**

```
FEAT-014: Tender → Quote → Award → Execution
                                        │
                                        ▼
                            Carrier invoice gönderir
                                        │
                                        ▼
FEAT-015: Invoice ingestion → Reconciliation → Audit → Export
```

`enterprise.tender_quotes.price_eur` = **pre-rated baseline** (awarded amount). FEAT-015 invoice'ı bu baseline ile reconcile eder.

### 1.4 3 baseline kaynağı (FN-03 getAuditBaselines)

| Baseline | Kaynak | Use case |
|---|---|---|
| **Tender quote** | `enterprise.tender_quotes.price_eur` (awarded) | FEAT-014 spot tender |
| **Carrier contract** | `enterprise.carrier_contracts.rate_value` | FEAT-004 ongoing rate |
| **Toll cost** | `enterprise.nl_vrachtwagenheffing_tariffs` | FEAT-008 Vrachtwagenheffing accessorial |

### 1.5 ML disipline kritik nüans

| Konu | Karar |
|---|---|
| Invoice OCR | ✅ Phase 2 customer-funded **LLM/OCR API consumer** (ADR-0010 §4: *"Using ML-powered APIs (HERE, future map providers, future translation/NLP APIs). Allowed and encouraged."*) |
| Reconciliation engine | ✅ **Rule-based weighted sum** (ADR-0010 §3.4 — no learning) |
| Fraud detection | ❌ Phase 3+ candidate (ADR-0010 §3.5) |
| Carrier dispute prediction | ❌ Phase 3+ |
| Auto-approve policy | ⚠️ Phase 2.5+ Mode 2 (tolerance-based, not ML) |

### 1.6 Kapsam — içeride (Phase 2)

- Invoice ingestion: PDF (LLM/OCR), EDI/XML, email polling, manuel UI upload
- Line item parsing (base rate + accessorial: toll/dwell/demurrage/fuel)
- 3-baseline reconciliation (tender + contract + toll)
- Discrepancy classification (5 type: tolerance/rate_mismatch/accessorial/quantity/unauthorized)
- Audit state machine: pending → reviewing → approved/disputed/escalated
- Mode 1 manuel approve default, Mode 2 auto-approve threshold stub
- Dispute workflow (carrier notification)
- Duplicate invoice detection (FN eklendi)
- Per-task matching (FN eklendi)
- Email polling worker (FN eklendi)
- Export to finance system (forward endpoint, **gerçek payment YOK**)

### 1.7 Kapsam — dışarıda

- **Payment execution** — SAP/Xero/Stripe işi
- **Accounting GL posting** — ERP işi
- **Tax/VAT calculation** — accounting team işi (BTW Hollanda KDV)
- **TulipFleet customer invoice generation** — ayrı feature (customer-facing billing)
- **Invoice fraud detection ML** — Phase 3+ (ADR-0010 §3.5)
- **Multi-currency** — Phase 3+ (EUR-only Phase 2)
- **Carrier dispute prediction** — Phase 3+

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Phase | Shared with FEAT-001..10,14,17,18 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FEAT-015-FN-01 | backend | `ingestCarrierInvoice` | file, carrierId, (JWT.user_id) | { invoiceId } | enterprise.carriers | enterprise.invoices | — | ADR-0007 §3.2 — "Every third-party telematics provider's API changes over time." | 2 | **FEAT-004** carriers schema |
| 2 | FEAT-015-FN-02 | backend | `parseInvoiceDocument` | fileBuffer, mimeType | InvoiceJSON | — | — | LLM/OCR API | ADR-0010 §4 — "Using ML-powered APIs (HERE, future map providers, future translation/NLP APIs). Allowed and encouraged." | 2 | **FEAT-006:FN-04** external API pattern |
| 3 | FEAT-015-FN-03 | shared_library | `getAuditBaselines` | taskId | { quote, contract, tolls } | enterprise.tender_quotes, enterprise.carrier_contracts, enterprise.nl_vrachtwagenheffing_tariffs | — | — | ADR-belirsiz (3-baseline matching pattern) | 2 | **FEAT-014, FEAT-004, FEAT-008** baseline reuse |
| 4 | FEAT-015-FN-04 | shared_library | `reconcileInvoice` | invoiceId | ReconciliationResult | enterprise.invoice_line_items | enterprise.invoice_audits | — | ADR-0010 §3.4 — "'Reward function' in conversation → in implementation, it is a weighted sum of constraint penalties in HERE's `objective`. No learning." | 2 | **FEAT-003:FN-06** + **FEAT-014:FN-05** weighted sum pattern |
| 5 | FEAT-015-FN-05 | backend | `classifyAuditDiscrepancy` | diffAmount, type | { category, severity } | public.companies (settings) | enterprise.exception_events | — | ADR-0005 §5.2 — "Exception types: No match / Ambiguous match / Rule violation / High-impact event" | 2 | **FEAT-010:FN-06** logExceptionEvent (new exception_type: 'invoice_discrepancy') |
| 6 | FEAT-015-FN-06 | backend | `POST /api/dispatcher/invoices/:id/audit` | id, action, comment, (JWT.user_id) | Success | enterprise.invoices | enterprise.invoice_audits, enterprise.invoices (status) | — | ADR-0005 §2 — "Mode 1 — Advisory: The system suggests dispatch decisions. The dispatcher approves every action before it takes effect." | 2 | **FEAT-014:FN-07** approve pattern |
| 7 | FEAT-015-FN-07 | backend | `verifyTollAccessorials` | taskId, claimedTolls | { isValid, systemToll, deltaEur } | enterprise.routing_jobs | — | — | ADR-0002 §3.4 — "Vrachtwagenheffing per-km cost (FEAT-008, Phase 1.1): per-km tax weighted against fuel and labor cost." | 2 | **FEAT-008** toll baseline |
| 8 | FEAT-015-FN-08 | worker | `monitorAuditDeadlines` | (cron trigger, daily) | void | enterprise.invoices | enterprise.exception_events | — | ADR-belirsiz (audit deadline pattern — FEAT-014:FN-04 + FEAT-017:FN-12 paterni) | 2 | **FEAT-010:FN-06** + **FEAT-014:FN-04** + **FEAT-017:FN-12** + **FEAT-018:FN-13** deadline monitoring pattern |
| 9 | FEAT-015-FN-09 | backend | `exportToFinanceSystem` | auditId, targetSystem | { status, targetRef } | enterprise.invoice_audits | — | ERP API (SAP/Xero/QuickBooks) | ADR-0007 §3.2 — "Schema mapping maintenance (provider renames fields, adds fields, changes data types)." | 2 | — |
| 10 | FEAT-015-FN-10 | backend | `GET /api/dispatcher/invoices` | company_id, status, period | Invoice[] | enterprise.invoices | — | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 2 | — |
| 11 | FEAT-015-FN-11 | frontend | `<InvoiceAuditPanel />` | filterStatus | UI Component | enterprise.invoices | — | — | ADR-0001 §3.6 — "React Table — Vehicle / driver / task lists with sort, filter, paging" | 2 | — |
| 12 | FEAT-015-FN-12 | frontend | `<LineItemComparison />` | invoiceId | UI Component | enterprise.invoice_line_items | — | — | ADR-0001 §3.6 — "Forms, modals, navigation, layout primitives" | 2 | — |
| 13 | FEAT-015-FN-13 | shared_library | `detectDuplicateInvoice` (**KONSOLIDASYONDA EKLENDİ**) | carrierId, invoiceNumber, totalAmount, dispatchTaskId | { isDuplicate, existingInvoiceId? } | enterprise.invoices | — | — | ADR-belirsiz (duplicate detection pattern — number + fuzzy content match) | 2 | — |
| 14 | FEAT-015-FN-14 | backend | `POST /api/dispatcher/invoices/:id/dispute` (**KONSOLIDASYONDA EKLENDİ**) | id, disputeReason, lineItemIds[], comment, (JWT.user_id) | Success | enterprise.invoices | enterprise.invoice_audits (status=disputed), enterprise.exception_events | Email/Carrier API | ADR-0007 §3.2 — "Every third-party telematics provider's API changes over time." | 2 | **FEAT-014:FN-08** notifyTenderResult pattern (carrier notification) |
| 15 | FEAT-015-FN-15 | worker | `pollInvoiceEmail` (**KONSOLIDASYONDA EKLENDİ**) | (cron trigger, every 15 min) | void | — | enterprise.invoices (via FN-01) | Email IMAP/Graph API | ADR-belirsiz (email polling pattern — Phase 2 customer-funded) | 2 | — |
| 16 | FEAT-015-FN-16 | shared_library | `matchInvoiceToDispatchTask` (**KONSOLIDASYONDA EKLENDİ**) | invoiceData (carrier, period, taskRef?) | { taskId, confidence } | enterprise.dispatch_tasks, enterprise.tender_quotes | — | — | ADR-belirsiz (invoice-task matching pattern — multi-criteria fuzzy match) | 2 | **FEAT-014:FN-05** scoring pattern (multi-criteria match) |

**Konsolidasyon notları (NotebookLM çıktısına göre düzeltmeler):**

| # | NotebookLM dedi | Düzeltme |
|---|---|---|
| Alıntılar 1-12 | ✅ Hepsi doğru (FN-06 ADR-0005 §2 doğru atfedildi — F18'den sonra section misattribution TOPARLAMA) | — |
| **FN-13 Duplicate detection** | UNCERTAINTIES #3'te bahsedildi ama fonksiyon yok | ✅ **EKLENDİ FN-13** `detectDuplicateInvoice` — invoice_number + fuzzy content match (carrier_id + total_amount + period kombinasyonu) |
| **FN-14 Dispute workflow** | AUDIT_DECISION_LADDER'da bahsedildi ama endpoint yok | ✅ **EKLENDİ FN-14** `POST /invoices/:id/dispute` — carrier notification + exception event |
| **FN-15 Email polling** | INVOICE_INGESTION_CHANNELS'da bahsedildi ama fonksiyon yok | ✅ **EKLENDİ FN-15** `pollInvoiceEmail` — IMAP/Graph API worker, 15dk cron |
| **FN-16 Per-task matching** | Schema'da `dispatch_task_id` var ama matching mantığı eksik | ✅ **EKLENDİ FN-16** `matchInvoiceToDispatchTask` — multi-criteria fuzzy match (FEAT-014:FN-05 scoring paterni) |

**Fonksiyon sayısı:** NotebookLM 12 → konsolidasyon **16** (4 yeni eklendi).

---

## 3. Invoice processing pipeline (Phase 2)

### 3.1 Ingestion → Reconciliation → Audit flow

```
1. Carrier invoice gönderir (4 kanal):
   ├── PDF upload UI (manuel dispatcher)
   ├── EDI/XML carrier API (büyük carrier'lar)
   ├── Email attachment (pollInvoiceEmail FN-15, 15dk cron)
   └── Direct API push (Phase 2.5+)
        │
        ▼
2. ingestCarrierInvoice (FN-01) — common entry point
   - File MIME type detect (pdf/xml/edi/csv)
   - enterprise.invoices INSERT (status='pending')
        │
        ▼
3. detectDuplicateInvoice (FN-13) — guard rail
   - invoice_number + carrier_id exact match
   - total_amount + period fuzzy match (±%0.1)
   - Duplicate ise → status='duplicate', notification
        │
        ▼
4. parseInvoiceDocument (FN-02) — format-specific
   - PDF → LLM/OCR API (Phase 2 customer-funded)
   - EDI/XML → structured parser
   - InvoiceJSON: { header, line_items[] }
   - enterprise.invoice_line_items INSERT
        │
        ▼
5. matchInvoiceToDispatchTask (FN-16) — task linkage
   - dispatch_task_id explicit reference (best case)
   - veya fuzzy match: carrier_id + period + amount
   - Confidence score: high (>0.9), medium (0.7-0.9), low (<0.7)
   - low confidence → manuel review flag
        │
        ▼
6. getAuditBaselines (FN-03) — 3-baseline lookup
   - tender_quotes.price_eur (FEAT-014 awarded)
   - carrier_contracts.rate_value (FEAT-004 ongoing)
   - nl_vrachtwagenheffing_tariffs (FEAT-008 tolls)
        │
        ▼
7. reconcileInvoice (FN-04) — line-by-line diff
   - Her line_item için baseline lookup
   - Diff matrix: amount_carrier vs amount_baseline
   - Tolerance check (per-company)
        │
        ▼
8. verifyTollAccessorials (FN-07) — özel toll verify
   - claimed_toll vs system_toll (FEAT-008 hesaplanmış)
   - Delta belirleme
        │
        ▼
9. classifyAuditDiscrepancy (FN-05) — taxonomy
   - 5 kategori: tolerance / rate_mismatch / accessorial /
     quantity / unauthorized
   - Severity hesabı + FEAT-010 exception event (gerekirse)
        │
        ▼
10. Audit state: status='reviewing'
    - Mode 1 Advisory (default): dispatcher manuel review
    - Mode 2 (Phase 2.5+): auto-approve if within tolerance
        │
        ┌───────────────┼───────────────┐
        │               │               │
   approve (FN-06)   dispute (FN-14)   escalate (FN-06)
        │               │               │
        ▼               ▼               ▼
    status:        status:          status:
    'approved'     'disputed'       'escalated'
        │               │               │
        ▼          carrier notify       company_admin
    exportToFinance  + exception        review
    (FN-09)              │
        │               ▼ resolution
        ▼          re-reconcile
    ERP API
    (SAP/Xero)
```

### 3.2 Audit state machine

```
                ingestCarrierInvoice (FN-01)
                          │
                          ▼
                    ┌─────────┐
                    │ pending │
                    └────┬────┘
                         │
              auto pipeline (FN-02..FN-09)
                         │
                         ▼
                  ┌──────────────┐
                  │  reviewing   │ ◄── manuel dispatcher inceleme
                  └──┬────┬───┬──┘
                     │    │   │
              approve   dispute   escalate
                     │    │   │
                     ▼    ▼   ▼
              ┌─────────┐┌──────────┐┌────────────┐
              │approved ││ disputed ││ escalated  │
              └────┬────┘└────┬─────┘└─────┬──────┘
                   │          │            │
        exportToFinanceSystem  carrier      company_admin
                   │       notification     review
                   ▼          │            │
              ERP API     re-recon  ┌────┴─────┐
                              │     approve  reject
                              ▼     │           │
                          back to reviewing    closed
```

---

## 4. Discrepancy taxonomy (FN-05)

| Kategori | Tanım | Tetik | Severity |
|---|---|---|---|
| **tolerance** | Diff < per-company threshold (default %2 veya 50 EUR) | Auto-pass | — |
| **rate_mismatch** | Birim fiyat baseline'dan farklı | rate_per_km vs contract | medium |
| **accessorial** | Beklenmedik ek ücretler (waiting, cleaning, surcharge) | Sözleşmede yok | medium-high |
| **quantity** | KM / görev sayısı / volume farklı | actual vs claimed | high |
| **unauthorized** | Sistemde kaydı olmayan görev için fatura | dispatch_task_id null + matchInvoiceToDispatchTask low | critical |

**Severity → action mapping:**

| Severity | Mode 1 default | Mode 2 (Phase 2.5+) |
|---|---|---|
| tolerance | Auto-approve | Auto-approve |
| medium | Reviewing → dispatcher | Threshold check |
| high | Reviewing → dispatcher | Manuel zorunlu |
| critical | Reviewing + immediate exception | Manuel zorunlu + alert |

---

## 5. Duplicate invoice detection (FN-13) — yeni

```typescript
// FN-13 detectDuplicateInvoice
async function detectDuplicateInvoice(carrierId, invoiceNumber, totalAmount, dispatchTaskId) {
  // Layer 1: invoice_number exact match (carrier-scoped)
  const exactMatch = await db.query(`
    SELECT id FROM enterprise.invoices
    WHERE carrier_id = $1 
      AND invoice_number = $2
      AND status NOT IN ('rejected', 'closed')
  `, [carrierId, invoiceNumber]);
  
  if (exactMatch.length > 0) {
    return { isDuplicate: true, existingInvoiceId: exactMatch[0].id, matchType: 'exact_number' };
  }
  
  // Layer 2: fuzzy content match (number'ı eksik gönderen carrier'lar için)
  const fuzzyMatch = await db.query(`
    SELECT id FROM enterprise.invoices
    WHERE carrier_id = $1
      AND dispatch_task_id = $2
      AND ABS(total_amount - $3) < 0.01  -- penny precision
      AND created_at > NOW() - INTERVAL '90 days'
      AND status NOT IN ('rejected', 'closed')
  `, [carrierId, dispatchTaskId, totalAmount]);
  
  if (fuzzyMatch.length > 0) {
    return { isDuplicate: true, existingInvoiceId: fuzzyMatch[0].id, matchType: 'content_fuzzy' };
  }
  
  return { isDuplicate: false };
}
```

**Trade-off (UNCERTAINTIES #3):** Exact number match güvenilir ama bazı carrier'lar invoice number ile göndermez. Fuzzy match (carrier + task + amount) %99 doğru ama edge case'lerde yanlış pozitif olabilir.

---

## 6. Dispute workflow (FN-14) — yeni

```
1. Dispatcher dispute decision → POST /invoices/:id/dispute
   - disputeReason: 'rate_mismatch' | 'unauthorized_charge' | 
                    'duplicate_billing' | 'quantity_dispute' | 'other'
   - lineItemIds[]: hangi line item'lar dispute edilir
   - comment: detayli açıklama

2. enterprise.invoice_audits UPDATE:
   - status: reviewing → disputed
   - resolution_type: 'dispute'
   - audit_log append

3. enterprise.exception_events INSERT:
   - exception_type: 'invoice_discrepancy' (FEAT-010 cross-spec sync)
   - severity: high (default)

4. Carrier notification (mevcut FEAT-014:FN-08 paterni):
   - Email/API: dispute reason + line item detayları
   - Beklenen aksiyon: carrier'dan corrected invoice veya kabul

5. Carrier response handling:
   - Corrected invoice gelirse: re-reconcile (FN-04)
   - Kabul ederse: status='resolved', approved amount güncellenir
   - Reddederse: status='escalated', company_admin'e
```

---

## 7. Email polling worker (FN-15) — yeni

```typescript
// FN-15 pollInvoiceEmail
// Cron: every 15 minutes
async function pollInvoiceEmail() {
  const companies = await getCompaniesWithEmailPolling();
  
  for (const company of companies) {
    const config = company.settings.audit_policy.email_polling;
    if (!config?.enabled) continue;
    
    // IMAP veya Microsoft Graph API
    const messages = await fetchEmailsSince(
      config.connection,
      config.filter,        // örn. from:carriers@*, subject:invoice*
      config.lastPolledAt
    );
    
    for (const msg of messages) {
      for (const attachment of msg.attachments) {
        if (['pdf', 'xml', 'edi'].includes(attachment.extension)) {
          // FN-01 entry point reuse
          await ingestCarrierInvoice(
            attachment.buffer,
            inferCarrierFromEmail(msg.from, company.id),
            'system'  // JWT.user_id placeholder
          );
        }
      }
    }
    
    await updateLastPolledAt(company.id);
  }
}
```

**Schema additive:** `public.companies.settings.audit_policy.email_polling`:

```jsonc
{
  "email_polling": {
    "enabled": true,
    "connection": {
      "type": "imap",  // veya 'graph' (Microsoft 365)
      "host": "imap.example.com",
      "port": 993,
      "credentials_ref": "vault:company_X_email"  // secret vault reference
    },
    "filter": {
      "from_pattern": "*@carriers.*",
      "subject_pattern": "*invoice*|*factuur*|*fatura*"
    },
    "last_polled_at": "2026-05-30T14:00:00Z"
  }
}
```

---

## 8. Per-task matching (FN-16) — yeni

```typescript
// FN-16 matchInvoiceToDispatchTask
async function matchInvoiceToDispatchTask(invoiceData) {
  // Layer 1: explicit reference (best case — carrier task_id verir)
  if (invoiceData.taskRef) {
    const exactTask = await getTaskByRef(invoiceData.taskRef);
    if (exactTask) {
      return { taskId: exactTask.id, confidence: 1.0, matchType: 'explicit_ref' };
    }
  }
  
  // Layer 2: tender quote reference (FEAT-014 awarded tender)
  if (invoiceData.tenderRef) {
    const tenderQuote = await getTenderQuoteByRef(invoiceData.tenderRef);
    if (tenderQuote?.awarded) {
      return { 
        taskId: tenderQuote.dispatch_task_id, 
        confidence: 0.95, 
        matchType: 'tender_ref' 
      };
    }
  }
  
  // Layer 3: fuzzy multi-criteria (FEAT-014:FN-05 scoring paterni)
  const candidates = await db.query(`
    SELECT dt.id, dt.completed_at, t.price_eur,
           ABS(EXTRACT(EPOCH FROM (dt.completed_at - $1::timestamptz))) / 86400 AS days_diff
    FROM enterprise.dispatch_tasks dt
    LEFT JOIN enterprise.tender_quotes t ON t.dispatch_task_id = dt.id AND t.awarded = true
    WHERE dt.company_id = $2
      AND dt.status = 'completed'
      AND dt.completed_at BETWEEN $1::timestamptz - INTERVAL '30 days' 
                              AND $1::timestamptz + INTERVAL '7 days'
      AND EXISTS (
        SELECT 1 FROM enterprise.tender_invitations ti
        WHERE ti.tender_id IN (SELECT tender_id FROM enterprise.tender_quotes WHERE dispatch_task_id = dt.id)
          AND ti.carrier_id = $3
      )
    ORDER BY days_diff ASC, ABS(t.price_eur - $4) ASC
    LIMIT 5
  `, [invoiceData.invoiceDate, invoiceData.companyId, invoiceData.carrierId, invoiceData.totalAmount]);
  
  if (candidates.length > 0 && candidates[0].days_diff < 14) {
    const confidence = calculateMatchConfidence(candidates[0], invoiceData);
    return { 
      taskId: candidates[0].id, 
      confidence,
      matchType: 'fuzzy',
      alternatives: candidates.slice(1, 3)  // dispatcher manuel review için
    };
  }
  
  // No match → unauthorized billing exception
  return { taskId: null, confidence: 0, matchType: 'no_match' };
}
```

**Confidence categorization:**
- `>= 0.9`: Auto-link (high confidence)
- `0.7 - 0.9`: Auto-link + flag for review
- `< 0.7`: Manuel review zorunlu
- `0`: Unauthorized billing exception (FEAT-010 critical)

---

## 9. Database schema (Phase 2 additive)

### 9.1 `enterprise.invoices` — yeni tablo

```sql
CREATE TABLE enterprise.invoices (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id               UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    carrier_id               UUID NOT NULL REFERENCES enterprise.carriers(id),
    dispatch_task_id         UUID REFERENCES enterprise.dispatch_tasks(id),  -- nullable (low confidence match)
    tender_quote_id          UUID REFERENCES enterprise.tender_quotes(id),   -- nullable (contract-based)
    
    -- Invoice header
    invoice_number           TEXT NOT NULL,  -- carrier-provided
    total_amount             NUMERIC(10,2) NOT NULL,
    currency                 CHAR(3) NOT NULL DEFAULT 'EUR',
    invoice_date             DATE NOT NULL,
    due_at                   TIMESTAMPTZ,
    
    -- Audit lifecycle
    status                   TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'reviewing', 'approved', 
                                              'disputed', 'escalated', 'duplicate', 'rejected', 'closed')),
    
    -- Ingestion
    ingestion_channel        TEXT NOT NULL CHECK (ingestion_channel IN 
                              ('pdf_upload', 'edi_xml', 'email_polling', 'api_direct')),
    raw_document_url         TEXT,  -- S3/object storage reference
    
    -- Matching
    task_match_confidence    NUMERIC(3,2),  -- 0.00-1.00
    task_match_type          TEXT CHECK (task_match_type IN 
                              ('explicit_ref', 'tender_ref', 'fuzzy', 'no_match')),
    
    -- Audit trail
    audit_trail              JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    audited_at               TIMESTAMPTZ,
    closed_at                TIMESTAMPTZ,
    
    UNIQUE (carrier_id, invoice_number)  -- duplicate guard (FN-13 layer 1)
);

CREATE INDEX idx_invoices_company_status ON enterprise.invoices (company_id, status, invoice_date DESC);
CREATE INDEX idx_invoices_carrier ON enterprise.invoices (carrier_id, invoice_date DESC);
CREATE INDEX idx_invoices_task ON enterprise.invoices (dispatch_task_id) WHERE dispatch_task_id IS NOT NULL;
```

### 9.2 `enterprise.invoice_line_items` — yeni tablo

```sql
CREATE TABLE enterprise.invoice_line_items (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id               UUID NOT NULL REFERENCES enterprise.invoices(id) ON DELETE CASCADE,
    company_id               UUID NOT NULL REFERENCES public.companies(id),  -- tenant guard
    
    line_number              INTEGER NOT NULL,
    description              TEXT,
    
    -- Classification
    line_type                TEXT NOT NULL CHECK (line_type IN (
                              'base_rate', 'toll', 'fuel_surcharge',
                              'dwell_time', 'detention', 'demurrage',
                              'accessorial', 'discount', 'tax', 'other'
                             )),
    
    -- Amounts
    quantity                 NUMERIC(10,2),
    unit_price               NUMERIC(10,2),
    amount                   NUMERIC(10,2) NOT NULL,  -- claimed by carrier
    
    -- Reconciliation
    baseline_amount          NUMERIC(10,2),  -- system-computed (FN-03 baseline)
    diff_amount              NUMERIC(10,2),  -- claimed - baseline
    discrepancy_category     TEXT CHECK (discrepancy_category IN (
                              'tolerance', 'rate_mismatch', 'accessorial',
                              'quantity', 'unauthorized'
                             )),
    
    metadata                 JSONB,
    
    UNIQUE (invoice_id, line_number)
);

CREATE INDEX idx_line_items_invoice ON enterprise.invoice_line_items (invoice_id, line_number);
CREATE INDEX idx_line_items_discrepancy ON enterprise.invoice_line_items (discrepancy_category)
  WHERE discrepancy_category IS NOT NULL;
```

### 9.3 `enterprise.invoice_audits` — yeni tablo

```sql
CREATE TABLE enterprise.invoice_audits (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id               UUID NOT NULL REFERENCES enterprise.invoices(id),
    
    -- Decision
    decision                 TEXT NOT NULL CHECK (decision IN (
                              'approved', 'disputed', 'escalated', 'rejected'
                             )),
    decision_reason          TEXT,
    line_items_disputed      UUID[],  -- referenced line_item IDs
    
    -- Audit metadata
    audited_by               UUID REFERENCES public.users(id),
    audited_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    comments                 TEXT,
    
    -- Export tracking
    export_status            TEXT DEFAULT 'pending'
                             CHECK (export_status IN ('pending', 'exported', 'failed')),
    export_target            TEXT,  -- 'sap', 'xero', 'quickbooks', 'csv', 'webhook'
    export_ref               TEXT,  -- target system ID
    exported_at              TIMESTAMPTZ
);

CREATE INDEX idx_audits_invoice ON enterprise.invoice_audits (invoice_id, audited_at DESC);
CREATE INDEX idx_audits_export ON enterprise.invoice_audits (export_status) WHERE export_status = 'pending';
```

### 9.4 `public.companies.settings.audit_policy` — JSONB additive

```jsonc
{
  ...
  "audit_policy": {
    "tolerance_percent": 2.0,
    "tolerance_max_eur": 50,
    "auto_approve_enabled": false,
    "auto_approve_threshold_eur": 100,
    "audit_sla_hours": 168,
    
    "email_polling": {
      "enabled": false,
      "connection": { /* type, host, credentials_ref */ },
      "filter": { /* from_pattern, subject_pattern */ }
    },
    
    "discrepancy_severity": {
      "rate_mismatch": "medium",
      "accessorial": "medium",
      "quantity": "high",
      "unauthorized": "critical"
    },
    
    "export_target": {
      "type": "sap",
      "endpoint": "https://...",
      "credentials_ref": "vault:erp_X"
    }
  }
}
```

---

## 10. UNCERTAINTIES (Cem onayı bekleyen)

### NotebookLM'in tespit ettikleri

1. **OCR hata payı:** LLM/OCR çıktısında okuma hatası (örn. 8 ↔ B) mali sorumluluk?
   - **Karar:** Carrier'da. TulipFleet OCR output'unu **structured form'da** dispatcher'a sunar (confidence score dahil). Dispatcher review zorunlu (Mode 1 default). Mali sorumluluk audit log'da (audited_by + audited_at) izlenir.

2. **Uluslararası vergi (KDV/BTW/VAT):** AB ülkelerinden gelen invoice'larda VAT hesabı?
   - **Karar:** **KAPSAM DIŞI** — accounting team işi. FEAT-015 sadece line item olarak `line_type='tax'` enum value ile taşır, hesaplama yok.

3. **Tekrarlı invoice tespiti:** Number-based vs content-based fuzzy?
   - **Karar (konsolidasyonda):** **Her ikisi** — FN-13 iki layer. Layer 1: exact number match (carrier-scoped). Layer 2: fuzzy content (carrier + task + amount, 90 gün penceresi).

4. **Fiyat koruma (rate lock):** Tender quote ile invoice arası fuel surcharge değişimi?
   - **Karar:** **Tolerance içinde otomatik** (per-company threshold, default %2). Tolerance dışı → `rate_mismatch` exception. Carrier'ın "fuel surcharge update" iddiası dispute workflow ile incelenir (FN-14).

### Konsolidasyonda eklenenler

5. **Email polling Phase 2 başlangıç mı 2.5 mi?**
   - **Karar:** **Phase 2 başlangıç** — FN-15 customer-funded trigger ile aktif. IMAP basit, Microsoft Graph API daha karmaşık (OAuth + permissions). NL pazarı için Outlook 365 yaygın (Microsoft Graph öncelik).

6. **Per-task matching low confidence (<0.7) ne yapar?**
   - **Karar:** **Manuel review zorunlu** (status='reviewing'), dispatcher alternative candidates'tan seçer (FN-16 alternatives field). Confidence threshold per-company configurable.

7. **Carrier dispute response timeline:** Dispute gönderildikten sonra ne kadar bekle?
   - **Karar:** Default 7 gün (per-company override). Süre sonu → status='escalated' otomatik (FN-08 monitorAuditDeadlines).

8. **Approved invoice export retry strategy:**
   - **Karar:** Exponential backoff (1dk, 5dk, 30dk, 2h, 12h) + manual retry button. ERP API hata = `export_status='failed'`, dispatcher görür.

9. **Multi-currency rezerv mantığı (Phase 3+):**
   - **Karar:** Phase 2 EUR-only. `enterprise.invoices.currency` kolon hazır (Phase 3+ multi-currency için forward-compatible). ECB exchange rate snapshot Phase 3+.

10. **Invoice attachment storage:**
    - **Karar:** `raw_document_url` Hetzner Object Storage (S3-compatible) — Phase 2 implementation backlog. Document retention 7 yıl (NL belasting denetim gereği).

---

## 11. Shared infrastructure with previous FEAT'leri

| FEAT-015 fonksiyon | Shared with | Paylaşım türü |
|---|---|---|
| FN-01 ingestCarrierInvoice | **FEAT-004** carriers schema | Carrier reference |
| FN-02 parseInvoiceDocument | **FEAT-006:FN-04** | External API consumer pattern |
| FN-03 getAuditBaselines | **FEAT-014, FEAT-004, FEAT-008** | 3-baseline reuse |
| FN-04 reconcileInvoice | **FEAT-003:FN-06** + **FEAT-014:FN-05** + **FEAT-018:FN-04** | Weighted sum pattern (ADR-0010 §3.4) |
| FN-05 classifyAuditDiscrepancy | **FEAT-010:FN-06** | Exception event writer |
| FN-06 POST /audit | **FEAT-014:FN-07** | Approve pattern |
| FN-07 verifyTollAccessorials | **FEAT-008** | Toll baseline |
| FN-08 monitorAuditDeadlines | **FEAT-010:FN-06** + **FEAT-014:FN-04** + **FEAT-017:FN-12** + **FEAT-018:FN-13** | Deadline cron pattern |
| FN-14 dispute workflow | **FEAT-014:FN-08** notifyTenderResult | Carrier notification |
| FN-16 matchInvoiceToDispatchTask | **FEAT-014:FN-05** | Multi-criteria scoring |

**Cross-spec sync TODO (yeni biriken):**

| Spec | Değişiklik |
|---|---|
| **FEAT-010** | `exception_type` CHECK'e **+2 yeni enum**: `'invoice_discrepancy'` (FN-05) + `'invoice_audit_deadline_expired'` (FN-08) |
| **FEAT-010 §4** | Severity matrix 2 yeni entry |

**Karar:** Bu sync az sayıda (2 enum). FEAT-019 + FEAT-103 + FEAT-106 sonrası **mini-sync commit** (3 ek pilot daha bekle). Önceki cross-spec sync henüz commit edildi (2026-05-30), kısa sürede 2. sync hata riski yükseltir.

---

## 12. Pilot süreç notları

### 12.1 Pilot akışı (2026-05-30)

Tek prompt + 0 follow-up. Kısaltılmış prompt (1700 karakter). Konsolidasyonda 4 yeni fonksiyon eklendi (duplicate detection, dispute workflow, email polling, per-task matching).

### 12.2 Alıntı doğrulama — F18 sonrası toparlama doğrulandı

| # | NotebookLM | Gerçek | Durum |
|---|---|---|---|
| FN-01..FN-12 12 alıntı | ✅ Hepsi doğru | — | ✅ |
| **FN-06 ADR-0005 §2** | ✅ **DOĞRU SECTION!** F14+F18'deki kalıcı hata F15'te tekrarlanmadı | — | ✅ **TOPARLAMA** |
| FN-04 ADR-0010 §3.4 | ✅ Birebir cümle | — | ✅ |
| FN-02 ADR-0010 §4 | ✅ Birebir cümle | — | ✅ |
| FN-07 ADR-0002 §3.4 | ✅ Birebir (FEAT-008 paterniyle) | — | ✅ |

**§number fabrikasyon: 0** ✅ (zincir devam)
**Section misattribution: 0** ✅ **TOPARLAMA** (F14+F18'deki kalıcı hata F15'te kırıldı)
**Toplam alıntı düzeltmesi: 0**

### 12.3 Section misattribution toparlama analizi

| Pilot | Section Hatası | Hipotez |
|---|---|---|
| F14 | §4.1 → §2 (Mode 1 Advisory) | Kavramsal yakınlık confusion |
| F18 | §4.1 → §2 (AYNI HATA TEKRAR) | Kalıcı pattern? |
| **F15** | **§2 DOĞRU** | F18 sonrası prompt guard rail etkili oldu mu? |

**Yeni hipotez:** F18 sonrası prompt'a eklenen *"ADR-0005 §2 = Mode 1 Advisory tanımı, ADR-0005 §4.1 = User flow"* açık ayrım F15'te işe yaradı. **Belki kalıcı hata değildi**, F14 ve F18'in özel koşulları olmuş olabilir (her ikisinde de yeni paradigma — external ecosystem ve multi-flow). F15'in financial paradigm'i dispatcher approval kavramına daha az değiniyor.

**Sonraki pilotlar için:** Guard rail prompt'ta korunmaya devam edilir, F15 başarısının tekrarlanabilirliği test edilir.

### 12.4 14 pilot karşılaştırma

| Boyut | F14 | F18 | **F15** |
|---|---|---|---|
| Skor | 8.5 | 8.5 | **9** ⬆️ |
| İterasyon | 1 | 1 | **1** |
| Fonksiyon (final) | 16 | 15 | **16** |
| Alıntı hatası | 1 | 1 | **0** ✅ |
| §number fabrikasyon | 0 | 0 | **0** ✅ |
| Section misattribution | 1 | 1 (tekrarlı) | **0** ✅ **TOPARLAMA** |
| Yeni paradigma | Ext eco | Multi-flow reverse | **Financial audit** |

**F15 gözlemleri:**
- F2 dahil 9/10 zirvelerinden (F1 9, F2 9.5, F3 9, F4 9, F8 9.5, F10 9, **F15 9**)
- Section misattribution **kırıldı** (F18 sonrası prompt guard rail etkili)
- Konsolidasyonda 4 yeni fonksiyon — NotebookLM disipline tespit etti ama eksiklikleri atladı
- Yeni paradigma: financial audit — TulipFleet'in ilk finansal feature'ı

---

## 13. Next steps

### 13.1 Cross-spec sync TODO (biriktir)

| Spec | Değişiklik |
|---|---|
| **FEAT-010** | `exception_type` +2 enum: `'invoice_discrepancy'`, `'invoice_audit_deadline_expired'` |
| **FEAT-010 §4** | Severity matrix 2 yeni entry |

**Karar:** Az sayıda — FEAT-019 + FEAT-103 + FEAT-106 sonrası **mini-sync** ile birlikte. Önceki sync taze (2026-05-30 commit), kısa süre sonra 2. sync hata riski.

### 13.2 Phase 2 implementation backlog (customer-funded trigger)

- [ ] Schema migration: `enterprise.invoices`, `invoice_line_items`, `invoice_audits` (3 yeni tablo)
- [ ] Hetzner Object Storage setup (raw document storage)
- [ ] FN-01 ingestCarrierInvoice (4-channel entry)
- [ ] FN-02 parseInvoiceDocument (LLM/OCR API — customer-funded)
- [ ] FN-03 getAuditBaselines (3-baseline lookup)
- [ ] FN-04 reconcileInvoice
- [ ] FN-05 classifyAuditDiscrepancy
- [ ] FN-06 POST /audit
- [ ] FN-07 verifyTollAccessorials (FEAT-008 cross-spec sync)
- [ ] FN-08 monitorAuditDeadlines (daily cron)
- [ ] FN-09 exportToFinanceSystem (SAP/Xero/QuickBooks customer-funded connectors)
- [ ] FN-10, FN-11, FN-12 GET + UI
- [ ] FN-13 detectDuplicateInvoice (2-layer)
- [ ] FN-14 POST /dispute + carrier notification
- [ ] FN-15 pollInvoiceEmail (IMAP/Graph API 15dk cron)
- [ ] FN-16 matchInvoiceToDispatchTask (3-layer fuzzy)
- [ ] FEAT-010 cross-spec sync (2 enum)

### 13.3 Customer trigger conditions

Phase 2 customer-funded trigger için minimum kriterler:
- Customer ≥10 invoice/ay handle ediyor (manuel audit costly)
- Customer SAP/Xero/QuickBooks kullanıyor (export target)
- Customer email-based invoice receipt yaygın (FN-15 değerli)
- Customer FEAT-014 Tender Management aktif kullanıyor (baseline mevcut)

### 13.4 Sıradaki pilot

**FEAT-019 W19 Multi-Day Long-Haul Planning** — Cem'in 7 pilot listesinde 5. sırada.

Yeni paradigma: multi-day VRP, overnight rest stops, driver shift compliance (Tachograph regulations), border crossing.

---

## 14. References

- ADR-0001 §3.6 (UI primitives — React Table, Forms)
- **ADR-0002 §3.4** (Soft constraint — Vrachtwagenheffing per-km cost — FEAT-008 paterni)
- ADR-0004 v3 §6 (additive schema)
- **ADR-0005 §2** (Mode 1 Advisory — "The dispatcher approves every action before it takes effect."), §5.2 (Exception types)
- **ADR-0007 §3.2** (Third-party API consumer + schema mapping maintenance)
- ADR-0009 §4.1 (grants matrix), §4.4 (dispatcher task flow)
- **ADR-0010 §3.4** (weighted sum, no learning), **§4** (LLM/ML API consumer — "Allowed and encouraged"), §3.5 (Phase 3 ML candidate)
- ADR-0011 §6 (Phase 2 customer-funded triggers), §9.5 (endpoint patterns)
- FEAT-003 spec (FN-06 weighted sum)
- FEAT-004 spec (carriers + carrier_contracts baseline)
- FEAT-006 spec (FN-04 external API pattern)
- FEAT-008 spec (Vrachtwagenheffing tariffs baseline)
- FEAT-010 spec (FN-06 logExceptionEvent target — cross-spec sync 2 yeni enum biriken)
- FEAT-014 spec (FN-05 scoring, FN-07 approve, FN-08 carrier notify, awarded_quote_id baseline)
- FEAT-017 spec (FN-12 deadline monitoring pattern)
- FEAT-018 spec (FN-04 weighted sum, FN-13 SLA monitoring)
- NotebookLM session 2026-05-30 (1 prompt, 9/10 skor — zirve potansiyel)

---

## 15. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-30 | Cem Bakir (with Claude + NotebookLM cowork) | İlk konsolide function spec. On dördüncü pilot — automated freight audit and payment, wishlist W14 (Very common). Phase 2 customer-funded (Yorum B: etiket korunur, spec şimdi yazılır). 16 fonksiyon (FN-01..FN-16), NotebookLM 12 önerdi + konsolidasyonda 4 ek (FN-13 detectDuplicateInvoice, FN-14 dispute workflow, FN-15 pollInvoiceEmail, FN-16 matchInvoiceToDispatchTask). **Yeni paradigma: Financial Audit Workflow** — TulipFleet'in ilk finansal feature'ı, önceki 13 FEAT'in tümünden farklı persona (finance/accounting). 3-baseline reconciliation (FEAT-014 tender quote + FEAT-004 carrier contract + FEAT-008 toll). 3 yeni tablo (enterprise.invoices, invoice_line_items, invoice_audits). Audit state machine: pending → reviewing → approved/disputed/escalated. 5-kategori discrepancy taxonomy. 4-kanal ingestion (PDF/EDI/email/API). LLM/OCR Phase 2 customer-funded (ADR-0010 §4 "Allowed and encouraged"). ML disipline kusursuz — reconciliation rule-based (ADR-0010 §3.4 weighted sum), fraud detection Phase 3+. Payment execution KAPSAM DIŞI (sadece export endpoint). **Section misattribution = 0 TOPARLAMA** ✅ — F14+F18'de tekrarlı kalıcı hata F15'te kırıldı (F18 sonrası prompt guard rail etkili). §number fabrikasyon = 0 ✅ (F8-F10-F17-F14-F18-F15 zinciri stable). Cross-spec sync TODO: FEAT-010 +2 enum ('invoice_discrepancy', 'invoice_audit_deadline_expired'), FEAT-019 + FEAT-103 + FEAT-106 sonrası mini-sync ile birlikte. F15 zirve potansiyeli (9/10) — F2, F8 ile birlikte. |
