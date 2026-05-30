# FEAT-106 — CSRD-Compliant Carbon Report Export

| Field | Value |
|---|---|
| **Feature ID** | FEAT-106 |
| **Source** | Wishlist W-A2 (TulipFleet appendix) — CSRD-Compliant Carbon Report Export |
| **Frequency rating** | Large 3PL customer-funded (Heineken/Picnic/Bol.com seviyesi) |
| **Tulipfleet Phase** | Phase 2 (customer-funded trigger per ADR-0011 §6) |
| **Spec readiness** | Yorum B kararı, 2026-05-30 — Phase 2 etiketi korunur, spec şimdi yazılır |
| **Status** | Function spec drafted via NotebookLM (1 prompt, 2026-05-30) |
| **Pilot note** | **🎯 ON YEDİNCİ PILOT — SON.** **9/10** skor (zirve zinciri F15+F19+F103+F106 = 4 üst üste). **§number fabrikasyon = 0** ✅ (9 pilot zinciri: F8-F10-F17-F14-F18-F15-F19-F103-F106). **Section misattribution = 0** ✅ **KALICI DOĞRULANDI** (4 üst üste başarı). Yeni paradigma: **regulatory compliance reporting** — TulipFleet'in en üst kompleksite feature'ı, XBRL filing, external auditor evidence chain. |

---

## 1. Feature description

### 1.1 Wishlist tanımı (TulipFleet appendix)

CSRD-Compliant Carbon Report Export — Cem'in stratejik appendix item'ı. FEAT-009 (Phase 1.1 CSRD-aware) ile başlayan vizyonun tam compliance kapanışı.

### 1.2 FEAT-009 → FEAT-106 evolution path

| Boyut | **FEAT-009** (Phase 1.1) | **FEAT-106** (Phase 2) |
|---|---|---|
| **Pozisyon** | CSRD-**aware** | CSRD-**compliant** |
| **Veri** | HERE Eco Routing CO2 (per-route) | Full ESRS standartlarına uygun aggregated reporting |
| **Format** | UI widget display | **XBRL** (eXtensible Business Reporting Language) |
| **Audit** | Internal disclosure note | **External auditor** evidence chain (KPMG/PwC) |
| **Submission** | Yok | Regulatory body (AFM/ESMA) |
| **Persona** | Operator/dispatcher | **Sustainability officer + finance + external auditor** |
| **Failure mode** | Operational | **Legal/regulatory penalty** |
| **Customer** | All Phase 1.1 customers | Large 3PL CSRD-bound (>500 employees veya >€50M turnover) |

### 1.3 CSRD regulatory bağlam

**CSRD = Corporate Sustainability Reporting Directive (EU 2022/2464):**

| Boyut | Detay |
|---|---|
| Yürürlük | 2024'te başladı (Large EU companies) |
| Standard | **ESRS E1 (Climate Change)** — Scope 1, 2, 3 emissions |
| Format | **XBRL** zorunlu (2025+ filings, ESRS-EFRAG 2024-12 taxonomy) |
| Assurance | External auditor (limited assurance Phase 1, reasonable assurance Phase 2) |
| Retention | 10 yıl audit evidence (NL vergi yasaları + CSRD) |
| TulipFleet rolü | **Veri sağlayıcı** — customer'lar CSRD-bound, TulipFleet kendi değil |

### 1.4 3 Scope ayrımı — kritik

| Scope | TulipFleet kaynak | Hesaplama |
|---|---|---|
| **Scope 1** (Direct) | FEAT-009 dispatch_tasks.carbon_footprint_kg (ICE fleet) | Activity-based — fuel consumed × DEFRA factor |
| **Scope 2** (Indirect energy) | FEAT-103 charging_sessions.kwh_delivered (EV) | Activity-based — kWh × grid mix factor |
| **Scope 3** (Value chain) | FEAT-014 tender_quotes.awarded (outsourced) | Spend-based VEYA activity-based (UNCERTAINTIES #2) |

### 1.5 ML disipline kritik nüans

| Konu | Karar |
|---|---|
| Emission factor lookup | ✅ Static (GHG Protocol public, no ML) |
| Anomaly detection (data quality) | ✅ Rule-based (ADR-0010 §3.4 weighted sum) |
| Narrative disclosure generation | ✅ LLM API consumer (ADR-0010 §4 "translation/NLP APIs allowed") |
| Carbon offset price prediction | ❌ Phase 3+ KAPSAM DIŞI |
| Auto-narrative full generation | ⚠️ Template + LLM hybrid (no full automation — auditor review zorunlu) |
| Scope 4 (avoided emissions) | ❌ Phase 3+ ML required |

### 1.6 Kapsam — içeride (Phase 2)

- Scope 1 aggregation (FEAT-009 baseline)
- Scope 2 aggregation (FEAT-103 baseline)
- Scope 3 aggregation (FEAT-014 baseline) — spend-based + activity-based seçenek
- Emission factors static lookup (GHG Protocol + DEFRA + NL CO2 emissiefactoren)
- Data quality validation (completeness + outlier detection)
- Audit evidence chain (per-task → aggregated traceability)
- XBRL export (ESRS-EFRAG 2024-12 taxonomy)
- Narrative disclosure templates (LLM-assisted)
- External auditor evidence package (ZIP archive download)
- Regulatory submission (AFM/ESMA filing, manual approve)
- Period-based reporting (monthly/quarterly/annual) — **konsolidasyonda eklendi**
- External assurance workflow — **konsolidasyonda eklendi**
- Report versioning + amendments — **konsolidasyonda eklendi**
- Scope 3 calculation method selection — **konsolidasyonda eklendi**

### 1.7 Kapsam — dışarıda

- **CSRD legal advisory** — accounting/legal team işi
- **Carbon offset purchase** — separate marketplace integration
- **Scope 4 (avoided emissions)** — Phase 3+ ML required
- **Real-time CSRD dashboard** — Phase 3+
- **Multi-jurisdiction reporting beyond NL/EU** — Phase 3+ (US SEC, vb.)
- **Auto-generated final narrative** — LLM Phase 2 sadece template-assisted (auditor review zorunlu)

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Phase | Shared with FEAT-001..103 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FEAT-106-FN-01 | backend | `aggregateScope1Emissions` | companyId, period | EmissionsJSON | enterprise.dispatch_tasks | enterprise.csrd_reports | — | CSRD_COMPLIANCE_ANALYSIS §2 — "Scope 1: Yakıt tüketimi verisi var" (project knowledge doc reference) | 2 | **FEAT-009** carbon_footprint_kg baseline |
| 2 | FEAT-106-FN-02 | backend | `aggregateScope2Emissions` | companyId, period | EmissionsJSON | enterprise.charging_sessions | enterprise.csrd_reports | — | CSRD_COMPLIANCE_ANALYSIS §3 — "Scope 2 — Elektrik / Enerji: EV şarj kayıtları yok" (bu gap FEAT-103 ile kapatıldı) | 2 | **FEAT-103** charging_sessions baseline |
| 3 | FEAT-106-FN-03 | backend | `aggregateScope3Emissions` | companyId, period, method ('spend_based'\|'activity_based') | EmissionsJSON | enterprise.tender_quotes, enterprise.carriers | enterprise.csrd_reports | — | CSRD_COMPLIANCE_ANALYSIS §3 — "Scope 3 — Değer Zinciri: Taşeron taşıma verisi yok" (bu gap FEAT-014 ile kapatıldı) | 2 | **FEAT-014** tender_quotes baseline |
| 4 | FEAT-106-FN-04 | shared_library | `lookupEmissionFactors` | fuelType, energySource, year, country | factor: numeric | enterprise.csrd_emission_factors | — | — | CSRD_COMPLIANCE_ANALYSIS §1 — "Tahmini CO2e hesabı: Yakıt tüketiminden DEFRA katsayılarıyla" | 2 | — |
| 5 | FEAT-106-FN-05 | backend | `validateDataQuality` | reportId | QualityScore | enterprise.csrd_reports, enterprise.csrd_audit_evidence | enterprise.exception_events | — | CSRD_COMPLIANCE_ANALYSIS §3 — "Veri kaynağı güven skoru yok" + ADR-0010 §3.4 weighted sum | 2 | **FEAT-010:FN-06** logExceptionEvent (new: 'csrd_data_quality_breach') |
| 6 | FEAT-106-FN-06 | shared_library | `buildAuditEvidenceChain` | reportId | EvidenceChain | enterprise.dispatch_tasks, public.task_events, enterprise.charging_sessions | enterprise.csrd_audit_evidence | — | CSRD_COMPLIANCE_ANALYSIS §3 — "Audit trail / veri soy ağacı yok" | 2 | — |
| 7 | FEAT-106-FN-07 | backend | `generateXbrlReport` | reportId, taxonomyVersion | XBRL_File | enterprise.csrd_reports | — | — | CSRD_COMPLIANCE_ANALYSIS §3 — "XBRL / dijital disclosure katmanı yok" + ESRS-EFRAG 2024-12 spec | 2 | — |
| 8 | FEAT-106-FN-08 | backend | `generateNarrativeDisclosure` | reportId, contextData | NarrativeText | enterprise.csrd_reports | enterprise.csrd_reports (narrative_disclosure JSONB) | LLM API | ADR-0010 §4 — "Using ML-powered APIs (HERE, future map providers, future translation/NLP APIs). Allowed and encouraged." | 2 | — |
| 9 | FEAT-106-FN-09 | backend | `GET /api/dispatcher/reports/csrd/:id/auditor-package` | id, (JWT.user_id) | ZipArchive | enterprise.csrd_audit_evidence, enterprise.csrd_reports | — | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 2 | — |
| 10 | FEAT-106-FN-10 | backend | `POST /api/dispatcher/reports/csrd/submit` | reportId, (JWT.user_id) | Success | enterprise.csrd_reports | enterprise.csrd_reports (status='submitted') | Regulatory API (AFM/ESMA) | ADR-0005 §2 — "Mode 1 — Advisory: The system suggests dispatch decisions. The dispatcher approves every action before it takes effect." | 2 | — |
| 11 | FEAT-106-FN-11 | frontend | `<CsrdReportBuilder />` | companyId | UI Component | — | — | — | ADR-0001 §3.6 — "Forms, modals, navigation, layout primitives" | 2 | — |
| 12 | FEAT-106-FN-12 | frontend | `<AuditEvidenceViewer />` | evidenceId | UI Component | enterprise.csrd_audit_evidence | — | — | ADR-0006 §3.1 — "Map interactions are inspection-oriented, not action-oriented." | 2 | — |
| 13 | FEAT-106-FN-13 | backend | `requestExternalAssurance` (**KONSOLIDASYONDA EKLENDİ**) | reportId, auditorFirm, assuranceLevel ('limited'\|'reasonable') | { assuranceRequestId } | enterprise.csrd_reports | enterprise.csrd_assurance_workflows | Email/API | ADR-belirsiz (external auditor workflow) | 2 | **FEAT-014:FN-08** carrier notification pattern (auditor invitation) |
| 14 | FEAT-106-FN-14 | shared_library | `computePeriodAggregation` (**KONSOLIDASYONDA EKLENDİ**) | reportId, periodType ('monthly'\|'quarterly'\|'annual'), referenceDate | AggregationResult | enterprise.csrd_reports | — | — | CSRD_COMPLIANCE_ANALYSIS §3 — "rollup mantığı" + ADR-0010 §3.4 | 2 | **FEAT-106:FN-01..03** scope aggregations (rollup orchestrator) |
| 15 | FEAT-106-FN-15 | backend | `selectScope3CalculationMethod` (**KONSOLIDASYONDA EKLENDİ**) | reportId, method ('spend_based'\|'activity_based'\|'hybrid') | Success | enterprise.csrd_reports | enterprise.csrd_reports (scope3_method) | — | CSRD_COMPLIANCE_ANALYSIS §3 — "Taşeron taşıma verisi" GHG Protocol Corporate Value Chain Standard | 2 | **FEAT-014** tender baseline |
| 16 | FEAT-106-FN-16 | backend | `createReportAmendment` (**KONSOLIDASYONDA EKLENDİ**) | originalReportId, amendmentReason, changedFields[] | { amendmentReportId } | enterprise.csrd_reports | enterprise.csrd_reports (new row, parent_report_id set) | — | ADR-0004 v3 §6 — "Additive ve geriye dönük uyumlu" (report versioning pattern) | 2 | — |

**Konsolidasyon notları (NotebookLM çıktısına göre düzeltmeler):**

| # | NotebookLM dedi | Düzeltme |
|---|---|---|
| Alıntılar 1-12 | ✅ Hepsi doğru (FN-10 ADR-0005 §2 doğru section — F15+F19+F103+F106 zincir 4. başarı) | — |
| Project knowledge doc reference | ⚠️ CSRD_COMPLIANCE_ANALYSIS §1-§3 — ADR değil ama project knowledge doc geçerli kaynak (FEAT-009'da paterni kullanılmış) | ✅ Korundu — bu kaynak Cem'in internal compliance analizi |
| **FN-13 External assurance** | KPMG/PwC auditor workflow yok | ✅ **EKLENDİ FN-13** `requestExternalAssurance` — limited/reasonable assurance request flow |
| **FN-14 Period aggregation** | Monthly/quarterly/annual rollup mantığı eksik | ✅ **EKLENDİ FN-14** `computePeriodAggregation` — orchestrator (FN-01..03 çağırır) |
| **FN-15 Scope 3 method selection** | UNCERTAINTIES'te bahsedildi (spend vs activity) ama seçim fonksiyonu yok | ✅ **EKLENDİ FN-15** `selectScope3CalculationMethod` — GHG Protocol Corporate Value Chain Standard |
| **FN-16 Report versioning** | Amendment workflow eksik (submitted report immutable) | ✅ **EKLENDİ FN-16** `createReportAmendment` — parent_report_id linkage |

**Fonksiyon sayısı:** NotebookLM 12 → konsolidasyon **16** (4 yeni eklendi).

---

## 3. CSRD report lifecycle

```
1. Period selection (sustainability officer/finance team)
   - Monthly review (internal)
   - Quarterly CSRD filing
   - Annual report (mandatory submission)
        │
        ▼
2. computePeriodAggregation (FN-14) — orchestrator
   ├── aggregateScope1Emissions (FN-01) — ICE fleet diesel/petrol
   ├── aggregateScope2Emissions (FN-02) — EV electricity (FEAT-103)
   └── aggregateScope3Emissions (FN-03) — outsourced (FEAT-014)
        │
        ▼
3. lookupEmissionFactors (FN-04)
   - GHG Protocol (global)
   - DEFRA (UK) — TulipFleet mevcut baseline
   - NL CO2 emissiefactoren (yerel)
   - Per-fuel-type + per-country + per-year version
        │
        ▼
4. selectScope3CalculationMethod (FN-15)
   - Spend-based: tender_quotes.price_eur × industry intensity factor
   - Activity-based: tender_quotes.distance_km × emission factor
   - Hybrid: large carriers activity, small carriers spend
        │
        ▼
5. validateDataQuality (FN-05)
   - Completeness check (missing dispatch_tasks?)
   - Outlier detection (rule-based, ADR-0010 §3.4)
   - QualityScore 0-100
   - Threshold below → FEAT-010 exception ('csrd_data_quality_breach')
        │
        ▼
6. buildAuditEvidenceChain (FN-06)
   - Per-task traceability (dispatch_task_id → aggregated row)
   - source_data_hash (immutable proof)
   - public.task_events log linkage
        │
        ▼
7. generateNarrativeDisclosure (FN-08)
   - Template-based (ESRS E1 disclosure requirements)
   - LLM-assisted (ADR-0010 §4 consumer)
   - Sustainability officer review zorunlu
        │
        ▼
8. CsrdReportBuilder UI (FN-11) — manual review
   - Sustainability officer approves
   - Status: draft → validated
        │
        ▼
9. requestExternalAssurance (FN-13)
   - KPMG/PwC/Deloitte invitation
   - assurance_level: 'limited' (Phase 1) or 'reasonable' (Phase 2)
   - Auditor accesses GET /auditor-package (FN-09)
        │
        ▼
10. generateXbrlReport (FN-07)
    - ESRS-EFRAG 2024-12 taxonomy
    - XBRL validation (TulipFleet-side basic + external tool)
    - Output: machine-readable filing artifact
        │
        ▼
11. submitToRegulator (FN-10)
    - AFM (NL) or ESMA (EU)
    - Manual approve zorunlu (dispatcher/finance officer)
    - Status: validated → submitted
        │
        ▼
12. Amendment workflow (if needed)
    - createReportAmendment (FN-16)
    - parent_report_id link (audit immutability)
    - Original report immutable, new version with corrections
```

---

## 4. External assurance workflow (FN-13) — yeni

CSRD **external auditor zorunlu** (limited Phase 1, reasonable Phase 2). FEAT-106 auditor evidence package + workflow:

```typescript
async function requestExternalAssurance(reportId, auditorFirm, assuranceLevel) {
  const report = await getCsrdReport(reportId);
  
  if (report.status !== 'validated') {
    throw new Error('Report must be validated before assurance request');
  }
  
  // 1. Create assurance workflow record
  const assuranceRequest = await db.query(`
    INSERT INTO enterprise.csrd_assurance_workflows
      (report_id, auditor_firm, assurance_level, status, requested_at, requested_by)
    VALUES ($1, $2, $3, 'requested', NOW(), $4)
    RETURNING id
  `, [reportId, auditorFirm, assuranceLevel, ctx.user_id]);
  
  // 2. Generate auditor access token (FEAT-014:FN-16 paterni)
  const accessToken = await generateAuditorToken(assuranceRequest.id, 168); // 7 gün
  
  // 3. Notify auditor (email + secure link)
  await sendAuditorInvitation({
    auditorFirm,
    accessLink: `https://api.tulipfleet.com/api/public/csrd-assurance/${assuranceRequest.id}?token=${accessToken}`,
    reportPeriod: report.period_start + ' to ' + report.period_end,
    assuranceLevel
  });
  
  // 4. Audit trail
  await appendAuditLog(reportId, {
    event: 'assurance_requested',
    auditor_firm: auditorFirm,
    level: assuranceLevel,
    timestamp: new Date()
  });
  
  return { assuranceRequestId: assuranceRequest.id };
}
```

**Assurance levels (ESRS):**
- **Limited assurance** (Phase 1 CSRD, 2024-2027): "Nothing came to our attention" — sınırlı inceleme
- **Reasonable assurance** (Phase 2 CSRD, 2028+): "In all material respects" — tam denetim

---

## 5. Period aggregation orchestrator (FN-14) — yeni

```typescript
async function computePeriodAggregation(reportId, periodType, referenceDate) {
  const period = computePeriodBounds(periodType, referenceDate);
  // periodType: 'monthly' | 'quarterly' | 'annual'
  
  const report = await getCsrdReport(reportId);
  
  // Parallel scope aggregation
  const [scope1, scope2, scope3] = await Promise.all([
    aggregateScope1Emissions(report.company_id, period),  // FN-01
    aggregateScope2Emissions(report.company_id, period),  // FN-02
    aggregateScope3Emissions(report.company_id, period,    // FN-03
                              report.scope3_method)
  ]);
  
  // Aggregation totals
  const result = {
    period_start: period.start,
    period_end: period.end,
    period_type: periodType,
    scope1_total_kg_co2e: scope1.total,
    scope2_total_kg_co2e: scope2.total,
    scope3_total_kg_co2e: scope3.total,
    grand_total_kg_co2e: scope1.total + scope2.total + scope3.total,
    breakdown: {
      scope1_by_fuel: scope1.breakdown,
      scope2_by_country: scope2.breakdown,
      scope3_by_carrier: scope3.breakdown
    },
    data_sources: {
      scope1_dispatch_task_count: scope1.task_count,
      scope2_charging_session_count: scope2.session_count,
      scope3_tender_count: scope3.tender_count
    }
  };
  
  // Update report
  await db.query(`
    UPDATE enterprise.csrd_reports
    SET scope1_total = $1, scope2_total = $2, scope3_total = $3,
        aggregation_breakdown = $4,
        last_aggregated_at = NOW()
    WHERE id = $5
  `, [scope1.total, scope2.total, scope3.total, JSON.stringify(result), reportId]);
  
  return result;
}
```

**Period boundary computation:**
- Monthly: 1st of month → last day
- Quarterly: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec)
- Annual: 1 Jan → 31 Dec (calendar year — NL CSRD default)
- Fiscal year override Phase 2.5+ (per-company config)

---

## 6. Scope 3 calculation method (FN-15) — yeni

GHG Protocol Corporate Value Chain (Scope 3) Standard'a göre iki yöntem:

```typescript
async function selectScope3CalculationMethod(reportId, method) {
  // method: 'spend_based' | 'activity_based' | 'hybrid'
  
  if (!['spend_based', 'activity_based', 'hybrid'].includes(method)) {
    throw new Error('Invalid Scope 3 method');
  }
  
  await db.query(`
    UPDATE enterprise.csrd_reports
    SET scope3_method = $1,
        scope3_method_changed_at = NOW(),
        scope3_method_changed_by = $2
    WHERE id = $3
  `, [method, ctx.user_id, reportId]);
  
  // Re-aggregate Scope 3 with new method
  await aggregateScope3Emissions(report.company_id, period, method);
  
  return { success: true, method };
}

// Scope 3 calculation logic:
async function aggregateScope3Emissions(companyId, period, method) {
  if (method === 'spend_based') {
    // tender_quotes.price_eur × industry intensity factor (kg CO2e per EUR)
    return db.query(`
      SELECT SUM(tq.price_eur * iif.kg_co2e_per_eur) as total_kg_co2e
      FROM enterprise.tender_quotes tq
      JOIN enterprise.tenders t ON t.id = tq.tender_id AND t.status = 'awarded' AND t.awarded_quote_id = tq.id
      JOIN enterprise.csrd_emission_factors iif 
        ON iif.activity_type = 'freight_transport_spend' AND iif.year = $2
      WHERE t.company_id = $1 AND t.awarded_at BETWEEN $3 AND $4
    `, [companyId, period.year, period.start, period.end]);
  } else if (method === 'activity_based') {
    // tender_quotes.distance_km × emission factor (kg CO2e per km)
    return db.query(`
      SELECT SUM(tq.metadata->>'distance_km')::numeric * aef.kg_co2e_per_km as total
      FROM enterprise.tender_quotes tq
      ...
    `, [...]);
  } else {
    // Hybrid: large carriers activity, small carriers spend
    const threshold_eur = 10000;  // configurable per-company
    // ... split logic
  }
}
```

**Trade-off (CSRD perspektifi):**
- **Activity-based daha doğru** ama veri gerektiriyor (carrier'dan km bilgisi)
- **Spend-based daha kolay** ama daha az doğru (industry average)
- **Hybrid** — large customers reasonable assurance için zorunlu olabilir

---

## 7. Report versioning + amendments (FN-16) — yeni

**CSRD report submitted olduktan sonra immutable.** Hata bulunursa amendment yapılmalı (yeni version, original'a referans).

```typescript
async function createReportAmendment(originalReportId, amendmentReason, changedFields) {
  const original = await getCsrdReport(originalReportId);
  
  if (original.status !== 'submitted') {
    throw new Error('Only submitted reports can be amended');
  }
  
  // 1. Mark original as superseded
  await db.query(`
    UPDATE enterprise.csrd_reports
    SET status = 'superseded',
        superseded_at = NOW(),
        superseded_by_report_id = NULL  -- will set after insert
    WHERE id = $1
  `, [originalReportId]);
  
  // 2. Create new amendment report (copy original + amendments)
  const amendment = await db.query(`
    INSERT INTO enterprise.csrd_reports (
      company_id, period_start, period_end,
      parent_report_id, version_number, amendment_reason,
      status, scope1_total, scope2_total, scope3_total,
      created_at, created_by
    )
    SELECT 
      company_id, period_start, period_end,
      $1 as parent_report_id,
      (SELECT COALESCE(MAX(version_number), 0) + 1 
       FROM enterprise.csrd_reports 
       WHERE parent_report_id = $1 OR id = $1) as version_number,
      $2 as amendment_reason,
      'draft' as status,
      scope1_total, scope2_total, scope3_total,
      NOW(), $3
    FROM enterprise.csrd_reports
    WHERE id = $1
    RETURNING id
  `, [originalReportId, amendmentReason, ctx.user_id]);
  
  // 3. Link original to new amendment
  await db.query(`
    UPDATE enterprise.csrd_reports
    SET superseded_by_report_id = $1
    WHERE id = $2
  `, [amendment.id, originalReportId]);
  
  // 4. Audit log
  await appendAuditLog(originalReportId, {
    event: 'amended',
    amendment_id: amendment.id,
    reason: amendmentReason,
    changed_fields: changedFields,
    timestamp: new Date()
  });
  
  return { amendmentReportId: amendment.id };
}
```

**Version chain:**
- Original report v1 (submitted, immutable)
- Amendment v2 (submitted, supersedes v1, parent_report_id=v1.id)
- Amendment v3 (submitted, supersedes v2, parent_report_id=v1.id)
- ...

Auditor evidence package (FN-09) **tüm version chain'i** içerir (regulatory audit trail).

---

## 8. Database schema (Phase 2 additive)

### 8.1 `enterprise.csrd_reports` — yeni tablo

```sql
CREATE TABLE enterprise.csrd_reports (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id                  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    -- Reporting period
    period_start                DATE NOT NULL,
    period_end                  DATE NOT NULL,
    period_type                 TEXT NOT NULL CHECK (period_type IN ('monthly','quarterly','annual')),
    
    -- Aggregated totals
    scope1_total                NUMERIC(12,3),  -- kg CO2e
    scope2_total                NUMERIC(12,3),
    scope3_total                NUMERIC(12,3),
    aggregation_breakdown       JSONB,
    
    -- Scope 3 method
    scope3_method               TEXT CHECK (scope3_method IN ('spend_based','activity_based','hybrid')),
    scope3_method_changed_at    TIMESTAMPTZ,
    scope3_method_changed_by    UUID REFERENCES public.users(id),
    
    -- Methodology
    methodology                 TEXT NOT NULL DEFAULT 'DEFRA_2024',
    emission_factors_year       INTEGER NOT NULL,
    
    -- Narrative
    narrative_disclosure        JSONB,
    
    -- Status
    status                      TEXT NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft','validated','submitted','superseded','rejected')),
    
    -- Versioning (FN-16)
    parent_report_id            UUID REFERENCES enterprise.csrd_reports(id),
    version_number              INTEGER NOT NULL DEFAULT 1,
    amendment_reason            TEXT,
    superseded_by_report_id     UUID REFERENCES enterprise.csrd_reports(id),
    superseded_at               TIMESTAMPTZ,
    
    -- Submission
    submitted_at                TIMESTAMPTZ,
    submitted_by                UUID REFERENCES public.users(id),
    regulator_filing_ref        TEXT,
    xbrl_file_url               TEXT,
    
    -- Audit
    last_aggregated_at          TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                  UUID REFERENCES public.users(id),
    audit_log                   JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX idx_csrd_company_period ON enterprise.csrd_reports (company_id, period_start DESC);
CREATE INDEX idx_csrd_status ON enterprise.csrd_reports (status);
CREATE INDEX idx_csrd_parent ON enterprise.csrd_reports (parent_report_id) WHERE parent_report_id IS NOT NULL;
```

### 8.2 `enterprise.csrd_emission_factors` — yeni tablo

```sql
CREATE TABLE enterprise.csrd_emission_factors (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source                      TEXT NOT NULL CHECK (source IN 
                                  ('DEFRA','GHG_PROTOCOL','NL_CO2_EMISSIEFACTOREN','CUSTOM')),
    year                        INTEGER NOT NULL,
    version_tag                 TEXT NOT NULL,  -- e.g. 'DEFRA_2024_v1.0'
    
    activity_type               TEXT NOT NULL,  
    -- Örnek: 'diesel_combustion', 'electricity_nl_grid', 'freight_transport_spend'
    
    unit                        TEXT NOT NULL,  -- 'liter', 'kwh', 'tkm', 'eur'
    kg_co2e_per_unit            NUMERIC(12,6) NOT NULL,
    
    -- Geographic scope
    country_code                CHAR(2),  -- NULL for global
    
    -- Validity
    effective_from              DATE NOT NULL,
    effective_until             DATE,
    
    -- Source URL (audit traceability)
    source_url                  TEXT,
    
    UNIQUE (source, year, version_tag, activity_type, country_code)
);
```

**Phase 2 seed:** DEFRA 2024 + GHG Protocol + NL CO2 emissiefactoren (CBS open data) baseline rows.

### 8.3 `enterprise.csrd_audit_evidence` — yeni tablo (TimescaleDB)

```sql
CREATE TABLE enterprise.csrd_audit_evidence (
    id                          UUID DEFAULT gen_random_uuid(),
    report_id                   UUID NOT NULL REFERENCES enterprise.csrd_reports(id),
    company_id                  UUID NOT NULL REFERENCES public.companies(id),  -- tenant guard
    
    -- Source linkage (traceability)
    source_type                 TEXT NOT NULL CHECK (source_type IN 
                                  ('dispatch_task','charging_session','tender_quote','manual_entry')),
    source_id                   UUID NOT NULL,
    
    -- Evidence
    source_data_hash            TEXT NOT NULL,  -- SHA-256 of source row snapshot
    co2e_contribution_kg        NUMERIC(12,3) NOT NULL,
    scope                       INTEGER NOT NULL CHECK (scope IN (1,2,3)),
    
    -- Verification
    verification_status         TEXT NOT NULL DEFAULT 'unverified'
                                CHECK (verification_status IN 
                                  ('unverified','auto_verified','auditor_verified','rejected')),
    verified_at                 TIMESTAMPTZ,
    verified_by                 UUID,  -- user veya auditor
    
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
);

-- TimescaleDB hypertable (10 yıl retention için)
SELECT create_hypertable('enterprise.csrd_audit_evidence', 'created_at',
                         chunk_time_interval => INTERVAL '30 days');

-- 10 yıl retention (CSRD + NL vergi yasaları)
SELECT add_retention_policy('enterprise.csrd_audit_evidence', INTERVAL '10 years');

CREATE INDEX idx_csrd_evidence_report ON enterprise.csrd_audit_evidence (report_id, scope);
CREATE INDEX idx_csrd_evidence_source ON enterprise.csrd_audit_evidence (source_type, source_id);
```

### 8.4 `enterprise.csrd_assurance_workflows` — yeni tablo

```sql
CREATE TABLE enterprise.csrd_assurance_workflows (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id                   UUID NOT NULL REFERENCES enterprise.csrd_reports(id),
    company_id                  UUID NOT NULL REFERENCES public.companies(id),  -- tenant guard
    
    -- Auditor
    auditor_firm                TEXT NOT NULL,  -- 'KPMG','PwC','Deloitte','EY', or other
    auditor_contact_email       TEXT,
    
    -- Assurance level
    assurance_level             TEXT NOT NULL CHECK (assurance_level IN ('limited','reasonable')),
    
    -- Status
    status                      TEXT NOT NULL DEFAULT 'requested'
                                CHECK (status IN 
                                  ('requested','in_progress','completed','rejected','cancelled')),
    
    -- Access token (FEAT-014:FN-16 paterni)
    access_token                TEXT UNIQUE,
    token_expires_at            TIMESTAMPTZ,
    
    -- Workflow timestamps
    requested_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    requested_by                UUID REFERENCES public.users(id),
    completed_at                TIMESTAMPTZ,
    
    -- Outcome
    auditor_findings            JSONB,
    final_opinion               TEXT,  -- unqualified, qualified, adverse, disclaimer
    
    audit_log                   JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX idx_assurance_report ON enterprise.csrd_assurance_workflows (report_id);
CREATE INDEX idx_assurance_token ON enterprise.csrd_assurance_workflows (access_token) 
  WHERE access_token IS NOT NULL;
```

### 8.5 `public.companies.settings.csrd_policy` — JSONB additive

```jsonc
{
  ...
  "csrd_policy": {
    "enabled": true,
    "methodology": "DEFRA_2024",
    "emission_factors_year": 2024,
    "reporting_currency": "EUR",
    "scope3_calculation_method": "hybrid",  
    "scope3_activity_threshold_eur": 10000,
    "fiscal_year_start": "01-01",  // calendar default
    "preferred_auditor": "KPMG",
    "regulator_target": "AFM",  // NL Authority for Financial Markets
    "auto_generate_narrative": true,
    "narrative_review_required": true  // ALWAYS true (compliance requirement)
  }
}
```

---

## 9. UNCERTAINTIES (Cem onayı bekleyen)

### NotebookLM'in tespit ettikleri

1. **Taşeron veri güvenilirliği (FEAT-014 Scope 3):** Carrier'lardan gelen yakıt/km verisi denetlenebilir mi?
   - **Karar:** **Hybrid yaklaşım** (FN-15 method='hybrid'). Large carrier (>€10k contract): activity-based zorunlu (carrier'dan veri talep). Small carrier: spend-based (industry intensity). Threshold per-company configurable.

2. **XBRL validation:** TulipFleet-side mi external tool mu?
   - **Karar:** **Phase 2 başlangıç basic TulipFleet-side** (XBRL schema validation), external tool (EFRAG validator) zorunlu Phase 2.5+ reasonable assurance için. FN-07 output validation report dahil.

3. **Well-to-Wheel (WTW) Scope 2:** Country + hour bazlı dinamik mi yıllık ortalama mı?
   - **Karar:** **Phase 2 yıllık ortalama** (CO2 emissiefactoren CBS). Hour-based dynamic Phase 3+ (CBS hourly grid mix data var ama implementation karmaşık).

### Konsolidasyonda eklenenler

4. **External auditor access — direct database vs API?**
   - **Karar:** **API-only** (FN-09 GET /auditor-package + assurance workflow token). Auditor never touches database directly. Read-only ZIP package.

5. **Report finalization — sustainability officer vs CFO sign-off?**
   - **Karar:** **Both** (Phase 2). FN-10 submit endpoint dual-approval flow:
     - Sustainability officer approves narrative + scope totals
     - CFO/finance officer approves financial materiality
     - Both signatures required for final submission

6. **Regulator API real integration vs manual filing:**
   - **Karar:** **Phase 2 manual filing** — XBRL file generated, manual upload to AFM portal. Phase 3+ direct API (AFM ESEF Portal API).

7. **Cross-period comparability (year-over-year):**
   - **Karar:** Mandatory CSRD requirement. FN-14 period aggregation always includes prior-period reference. Schema: `csrd_reports.prior_period_report_id` linkage.

8. **Materiality threshold determination:**
   - **Karar:** **Per-company configuration** (`csrd_policy.materiality_threshold_kg_co2e`). Default 1000 kg CO2e (yıllık). Threshold altı detayda gösterilmez, aggregate only.

9. **GDPR — driver-level data in CSRD:**
   - **Karar:** Driver-level **aggregated only**, individual driver IDs NOT in XBRL. Audit evidence (FN-06) internal-only, dispatcher access. Auditor sees vehicle-level breakdown, not driver-level.

10. **Multi-currency Scope 3 spend-based:**
    - **Karar:** **EUR only Phase 2** (NL EUR-zone default). Multi-currency Phase 3+ FEAT-014 paralel evolution (currency snapshot at tender award).

---

## 10. Shared infrastructure with previous FEAT'leri

| FEAT-106 fonksiyon | Shared with | Paylaşım türü |
|---|---|---|
| FN-01 aggregateScope1Emissions | **FEAT-009** carbon_footprint_kg | Baseline data source |
| FN-02 aggregateScope2Emissions | **FEAT-103** charging_sessions | Baseline data source |
| FN-03 aggregateScope3Emissions | **FEAT-014** tender_quotes | Baseline data source |
| FN-05 validateDataQuality | **FEAT-010:FN-06** | Exception event writer (`csrd_data_quality_breach`) |
| FN-13 requestExternalAssurance | **FEAT-014:FN-16** | Token generation pattern (auditor invitation reuse) |
| FN-14 computePeriodAggregation | **FEAT-106:FN-01..03** | Internal orchestrator |
| FN-15 scope3 method | **FEAT-014** | Tender baseline |
| FN-16 createReportAmendment | — | Versioning pattern (parent_report_id) |

**Cross-spec sync TODO (FEAT-106'dan yeni biriken):**

| Spec | Değişiklik | Source |
|---|---|---|
| FEAT-010 | `exception_type` +`'csrd_data_quality_breach'` | F106:FN-05 |
| FEAT-009 | CSRD-aware → CSRD-compliant migration path notu, FEAT-106 link | F106 paralel |
| FEAT-103 | Scope 2 data provider rolü belgelendi | F106 paralel |
| FEAT-014 | Scope 3 data provider rolü belgelendi | F106 paralel |

**TOPLAM CROSS-SPEC SYNC BIRIKIMI: 11+ (F015+F019+F103+F106)** — TOPLU SYNC ZORUNLU bir sonraki adım.

---

## 11. Pilot süreç notları

### 11.1 Pilot akışı (2026-05-30)

🎯 **SON PILOT.** Tek prompt + 0 follow-up. Kısaltılmış prompt (~2200 karakter). Konsolidasyonda 4 yeni fonksiyon eklendi (external assurance, period aggregation, scope 3 method selection, report versioning).

### 11.2 Alıntı doğrulama — KALICI TOPARLAMA 4. DOĞRULAMA

| # | NotebookLM | Gerçek | Durum |
|---|---|---|---|
| FN-01..07 CSRD_COMPLIANCE_ANALYSIS | ✅ Project knowledge doc reference (Cem'in belgesi, FEAT-009 paterni) | — | ✅ |
| FN-08 ADR-0010 §4 | ✅ Birebir | — | ✅ |
| FN-09 ADR-0011 §9.5 | ✅ Doğru | — | ✅ |
| **FN-10 ADR-0005 §2** | ✅ **DOĞRU SECTION!** Mode 1 Advisory tanımı (F15+F19+F103+**F106** 4. başarı) | — | ✅ |
| FN-11 ADR-0001 §3.6 | ✅ Birebir | — | ✅ |
| FN-12 ADR-0006 §3.1 | ✅ Birebir | — | ✅ |

**§number fabrikasyon: 0** ✅ (9 pilot zinciri stable)
**Section misattribution: 0** ✅ **KALICI DOĞRULANDI** (F15+F19+F103+F106 = 4 üst üste)
**Numaralandırma anomalisi: 0** ✅
**Toplam alıntı düzeltmesi: 0**

### 11.3 17 pilot TAM TABLO

| # | Pilot | Skor | İter | Fonksiyon | §nb fab | Sec mis | Paradigma |
|---|---|---|---|---|---|---|---|
| 1 | F1 VRP | 9 | 5 | 16 | 1 | 0 | VRP base |
| 2 | F2 Re-routing | 9.5 | 3 | 16 | 1 | 0 | Re-route |
| 3 | F3 Auto-dispatch | 9 | 2 | 16 | 1 | 0 | Dispatch |
| 4 | F4 Hybrid Fleet | 9 | 1+1 | 12 | 0 | 0 | Multi-actor |
| 5 | F5 Predictive ETA | 8.5 | 1+3 | 12 | 1 | 0 | HERE consume |
| 6 | F6 Appointment | 9 | 1 | 10 | 1 | 0 | Task duration |
| 7 | F7 Coaching | 8.5 | 1+1 | 14 | 1 | 0 | Coaching |
| 8 | F8 Toll | 9.5 | 1 | 9 | 0 | 0 | Toll |
| 9 | F9 Carbon | 8.5 | 1 | 7 | 1 | 0 | Carbon |
| 10 | F10 Exception | 9 | 1 | 15 | 0 | 0 | Orchestrator |
| 11 | F17 Locker | 8.5 | 1+1 | 13 | 0 | 0 | Geofence ext |
| 12 | F14 Tender | 8.5 | 1 | 16 | 0 | 1 | External eco |
| 13 | F18 Reverse | 8.5 | 1 | 15 | 0 | 1 (tekrar) | Multi-flow |
| 14 | F15 Audit | 9 | 1 | 16 | 0 | 0 | Financial |
| 15 | F19 Long-haul | 9 | 1 | 16 | 0 | 0 | Multi-day VRP |
| 16 | F103 EV | 9 | 1 | 14 | 0 | 0 | EV |
| 17 | **F106 CSRD** | **9** | **1** | **16** | **0** | **0** | **Regulatory** |

**Son istatistikler:**
- 🏆 **10 zirve pilot** (9-9.5/10): F1, F2, F3, F4, F8, F10, F15, F19, F103, **F106**
- ✅ **§number fabrikasyon = 0** son 9 pilot
- ✅ **Section misattribution = 0** son 4 pilot (F15+F19+F103+F106)
- ✅ **Tek iterasyon ortalaması** son 8 pilot (F8'den itibaren)
- ✅ **Toplam ~250+ fonksiyon** 17 spec'te belgelendi

### 11.4 NotebookLM cowork başarı analizi — pilot bittiğinde

| Boyut | Sonuç |
|---|---|
| Hata sınıfı evrim | §number fab (F1-7) → toparlama (F8+) → section misattribution (F14, F18) → toparlama (F15+) → KALICI |
| Guard rail prompt | F9'da eklenen §3.4'ten yüksek YOK uyarısı + F18 sonrası §2 vs §4.1 ayrımı **ikisi de etkili** |
| İterasyon trendi | F1-F7 ortalama 2-5 iter → F8+ tek prompt |
| Skor trendi | F1-F9 8.5-9 ortalama → F10+ stabilize 8.5-9, son 4 pilot zirve 9 |

**Sonuç:** **17 pilot disciplined evolution kanıtı.** Tüm wishlist 7-pilot listesi tamamlandı (W17, W13, W18, W14, W19, W16, W-A2). FEAT-008 (W-A1) zaten önceki turdaydı.

---

## 12. Next steps

### 12.1 🚨 CROSS-SPEC SYNC TOPLU COMMIT — ZORUNLU SONRAKİ ADIM

**11+ birikmiş cross-spec sync** — 5 spec etkilenir:

| # | Spec | Değişiklik |
|---|---|---|
| 1 | **FEAT-010** | `exception_type` CHECK +6 yeni enum: `invoice_discrepancy`, `invoice_audit_deadline_expired`, `rest_violation`, `border_crossing_compliance_breach`, `range_anxiety_breach`, `csrd_data_quality_breach` |
| 2 | **FEAT-010 §4** | Severity matrix +6 yeni entry |
| 3 | **FEAT-001** | FN-016 imza +3 param: `daysHorizon?`, `driverRules?`, `evMode?` |
| 4 | **FEAT-017** | `location_type` enum +7 yeni: `truck_parking`, `secured_parking`, `hotel`, `fuel_station`, `rest_area`, `border_crossing`, `charging_station` |
| 5 | **FEAT-008** | `emission_class` enum +`zero_emission` (NL Vrachtwagenheffing EV exemption) |
| 6 | **FEAT-009** | EV well-to-wheel branch (electricity grid mix factor) + FEAT-106 migration path notu |
| 7 | **FEAT-014** | Scope 3 data provider rolü belgelendi (FEAT-106 link) |
| 8 | **FEAT-103** | Scope 2 data provider rolü belgelendi (FEAT-106 link) |

**Atomic commit önerisi:**
```
docs(functions): mega cross-spec sync after FEAT-106

11 birikmiş cross-spec sync — F015+F019+F103+F106 entegrasyonu
[detayl açıklama]
17 pilot, 11 cross-spec sync, 0 schema bloat — disciplined evolution complete.
```

### 12.2 Phase 2 implementation backlog

- [ ] Schema migration: 4 yeni tablo (`csrd_reports`, `csrd_emission_factors`, `csrd_audit_evidence` TimescaleDB, `csrd_assurance_workflows`)
- [ ] Schema migration: `public.companies.settings.csrd_policy` JSONB
- [ ] FN-01..FN-16 implementation (16 fonksiyon)
- [ ] DEFRA + GHG Protocol + NL CO2 emissiefactoren seed data
- [ ] XBRL generator library entegrasyonu (ESRS-EFRAG 2024-12 taxonomy)
- [ ] LLM API connector (narrative disclosure — OpenAI/Anthropic Phase 2 customer-funded)
- [ ] External auditor portal (read-only access)
- [ ] AFM/ESMA regulator integration (manual filing Phase 2, API Phase 3+)
- [ ] FEAT-010 cross-spec sync (csrd_data_quality_breach)

### 12.3 Customer trigger conditions

Phase 2 customer-funded trigger için minimum kriterler:
- Customer CSRD-bound (>500 employees veya >€50M turnover veya listed)
- Customer Large 3PL (Heineken/Picnic/Bol.com seviyesi)
- Customer multi-fleet (ICE + EV + outsourced)
- Customer external auditor relationship (KPMG/PwC/Deloitte/EY)
- Customer NL Authority for Financial Markets (AFM) registration

### 12.4 Pilot pipeline KAPANDI 🎯

| Sıra | Pilot | Skor | Status |
|---|---|---|---|
| 1 | FEAT-017 Locker/PUDO | 8.5 | ✅ |
| 2 | FEAT-014 Multi-carrier | 8.5 | ✅ |
| 3 | FEAT-018 Reverse Logistics | 8.5 | ✅ |
| 4 | FEAT-015 Freight Audit | 9 | ✅ |
| 5 | FEAT-019 Multi-Day Long-Haul | 9 | ✅ |
| 6 | FEAT-103 EV Range | 9 | ✅ |
| 7 | **FEAT-106 CSRD-Compliant Export** | **9** | **✅ SON** |

**7/7 pilot tamamlandı.**

### 12.5 ROADMAP Coverage Matrix güncellemesi

FEAT-106 commit sonrası ROADMAP'taki Coverage Matrix güncellenmeli:

- **Spec ready** sayısı: 9 → **16** (+7 yeni pilot)
- **Coverage:** 27% → **48%+** (önceki 16'lık spec ready toplamı)
- **Spec pending Phase 1/1.1:** 12 → 5 (atlanan F011 PoD, F012 Refrigerated, F013 Hazmat, F016 Cost-to-Serve, F020-22)
- **Phase 2 customer-funded:** 9 → 0 (hepsi spec ready durumuna geçti)

---

## 13. References

- ADR-0001 §3.6 (UI primitives)
- ADR-0004 v3 §6 (additive schema — versioning pattern)
- **ADR-0005 §2** (Mode 1 Advisory — "The dispatcher approves every action before it takes effect.")
- ADR-0006 §3.1 (Map inspection-oriented)
- **ADR-0010 §4** (LLM/ML API consumer — narrative disclosure), §3.4 (weighted sum, no learning), §3.5 (Phase 3+ ML)
- ADR-0011 §6 (Phase 2 customer-funded triggers — Large 3PL), §9.5 (endpoint patterns)
- **CSRD_COMPLIANCE_ANALYSIS** (Cem'in internal compliance analizi, project knowledge doc, FEAT-009'da paterni kullanılmış)
- FEAT-008 spec (distance baseline)
- FEAT-009 spec (CSRD-aware → CSRD-compliant migration path)
- FEAT-010 spec (exception event writer — cross-spec sync `csrd_data_quality_breach`)
- FEAT-014 spec (Scope 3 data source — tender_quotes; FN-16 token pattern)
- FEAT-103 spec (Scope 2 data source — charging_sessions)
- EU Regulation 2022/2464 (CSRD)
- ESRS E1 (Climate Change disclosure standard)
- ESRS-EFRAG 2024-12 XBRL Taxonomy
- GHG Protocol Corporate Standard + Corporate Value Chain (Scope 3) Standard
- DEFRA 2024 GHG Conversion Factors
- NL CO2 Emissiefactoren (CBS)
- NotebookLM session 2026-05-30 (1 prompt, 9/10 skor — SON PILOT zirve zinciri tamamlama)

---

## 14. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-30 | Cem Bakir (with Claude + NotebookLM cowork) | **🎯 SON PILOT — İlk konsolide function spec.** On yedinci pilot — CSRD-Compliant Carbon Report Export, wishlist W-A2 (TulipFleet appendix). Phase 2 customer-funded (Large 3PL trigger). 16 fonksiyon (FN-01..FN-16), NotebookLM 12 önerdi + konsolidasyonda 4 ek (FN-13 external assurance, FN-14 period aggregation, FN-15 scope 3 method selection, FN-16 report versioning). **Yeni paradigma: Regulatory Compliance Reporting** — TulipFleet'in en üst kompleksite feature'ı, XBRL filing (ESRS-EFRAG 2024-12), external auditor evidence chain (KPMG/PwC), 10 yıl retention. FEAT-009 Phase 1.1 CSRD-aware → FEAT-106 Phase 2 CSRD-compliant evolution path. 4 yeni tablo (enterprise.csrd_reports, csrd_emission_factors, csrd_audit_evidence TimescaleDB 10y retention, csrd_assurance_workflows). 3 scope mapping kusursuz: Scope 1 (FEAT-009 ICE), Scope 2 (FEAT-103 EV charging), Scope 3 (FEAT-014 tender carriers spend/activity hybrid). ML disipline kusursuz — emission factors static (GHG Protocol public, no ML), narrative disclosure LLM consumer (ADR-0010 §4), Scope 4 + carbon offset Phase 3+ KAPSAM DIŞI. Project knowledge doc reference (CSRD_COMPLIANCE_ANALYSIS — Cem'in internal compliance analizi) FEAT-009 paterniyle kullanım. **Section misattribution = 0 KALICI DOĞRULANDI** ✅ — F15+F19+F103+F106 üst üste 4 başarı, pattern kesin kalıcı. §number fabrikasyon = 0 ✅ (9 pilot zinciri stable: F8-F10-F17-F14-F18-F15-F19-F103-F106). Alıntı hatası = 0 ✅. 10 zirve pilot toplam (F1, F2, F3, F4, F8, F10, F15, F19, F103, F106). **CROSS-SPEC SYNC ZORUNLU NEXT ADIM**: 11 birikmiş sync (F015+F019+F103+F106), 5 spec etkilenir (FEAT-010 +6 enum, FEAT-001 FN-016 +3 param, FEAT-017 location_type +7, FEAT-008 zero_emission, FEAT-009 EV branch + FEAT-106 link). Cem'in 7-pilot listesi 7/7 TAMAMLANDI. ROADMAP Coverage Matrix güncellemesi gerek. |
