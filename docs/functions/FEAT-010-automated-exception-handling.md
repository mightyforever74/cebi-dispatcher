# FEAT-010 — Automated Exception Handling

| Field | Value |
|---|---|
| **Feature ID** | FEAT-010 |
| **Source** | Wishlist W8 — "Automated Exception Handling" (atlanmıştı, ROADMAP Coverage Matrix 2026-05-30 güncellemesi sonrası önceliklendirildi) |
| **Frequency rating** | Common |
| **Cem note** | — (wishlist'te ek not yok) |
| **Tulipfleet Phase** | Phase 1 (rule-based detection + Mode 1 Advisory notification) + Phase 2 (FEAT-101 Mode 2 Exception-based auto-action) |
| **Status** | Function spec drafted via NotebookLM (1 prompt, 2026-05-30); **v1.3'te Cem'in mühendislik incelemesiyle 3 fonksiyon eklendi/genişletildi (2026-07-18)** |
| **Pilot note** | Onuncu pilot. Tek iterasyonda **9/10** skor. **§number fabrikasyon = 0** ✅ (F9'daki §188 hatası tekrarlanmadı). Yeni paradigma: **"orkestratör feature"** — 4-5 FEAT'in detection'ını consume edip action'ına route ediyor. |

---

## 1. Feature description

### 1.1 Wishlist tanımı

> *"AI agents detect delays or issues and autonomously contact carriers or reschedule dependent activities. Estimated frequency: Common."*

### 1.2 ML disipline kritik nüans

Wishlist "AI agents" diyor — bu **TulipFleet için yanıltıcı okuma.** ADR-0010 disiplini:

| ADR ref | Anlam |
|---|---|
| ADR-0010 §3.3 | Driver behavior anomaly detection **Phase 3 candidate** — Phase 1-2'de ML yok |
| ADR-0010 §3.4 | *"'Reward function' in conversation → in implementation, it is a weighted sum of constraint penalties in HERE's `objective`. No learning."* |
| ADR-0010 §4 | LLM/ML API consumer pattern — consume yes, build no |

**FEAT-010 yaklaşımı:**
- **Phase 1:** Rule-based detection (eşik tabanlı, anomaly detection değil)
- **Phase 1:** Dispatcher notification (Mode 1 Advisory — ADR-0005)
- **Phase 2 (FEAT-101):** Otomatik action (Mode 2 Exception-based — ADR-0005 §5.3)
- **Phase 3:** AI/ML decision-making (Mode 3 Agentic — ayrı ADR pending)

**v1.3 mühendislik incelemesi doğrulaması (2026-07-18):** Cem'in sorduğu "AI tabanlı yapmamakla hata mı ettik?" sorusuna spec'in kendi cevabı: **hayır.** Aşağıdaki üç ekleme (FN-16 sürücüye soru sorma, FN-03 iki-senaryo ayrımı, FN-17 şablon hazırlama) **hiçbiri ML/AI kullanmaz** — hepsi deterministic kural + insan (sürücü veya dispatcher) girdisi ile çözülür. Bu, ADR-0010 disiplininin doğru uygulandığının somut kanıtı: "akıllı" davranış, tahmin motorundan değil, doğru anda doğru insana doğru soruyu sormaktan geliyor.

### 1.3 İş mantığı

```
5 paralel detection monitor (Phase 1):
   1. ETA deviation (FEAT-005:FN-04 üzerine) — trafik varsa alternatif rota,
      yoksa sürücüye sebep sorulur (FN-16, v1.3 EKLENDİ)
   2. Traffic impact (FEAT-002:FN-10 trafficTriggerDetector)
   3. Driver no-show (v1.3'te iki alt-senaryoya ayrıldı: offline vs location-mismatch)
   4. Dock appointment slip (FEAT-006:FN-03 conflict) — v1.3'te otomatik
      şablon hazırlama eklendi (FN-17, gönderim hâlâ Phase 2)
   5. Compliance zone breach imminent (ADR-0012 §4 — KONSOLIDASYONDA EKLENDİ;
      v1.3'te planlama-aşaması önceliği netleştirildi, bkz. §1.6)
        │
        ▼ Threshold karşılanırsa
   logExceptionEvent (FN-06) → enterprise.exception_events INSERT
        │
        ▼
   deduplicateException (FN-07)
   - Cooldown window 10 dakika (FEAT-007 paterniyle)
        │
        ▼
   evaluateExceptionPolicy (FN-08)
   - Phase 1: stub mode (her zaman "advisory" döner — ADR-0005 §7)
   - Phase 2: policy module karar (auto-action eşiği)
        │
        ├─── "advisory" ───▶ notifyDispatcherException (FN-09)
        │                    + <ExceptionToast /> (FN-12)
        │                    + <ExceptionStatusPanel /> (FN-13)
        │                    + <ResolutionActionPanel /> (FN-14)
        │                    + Dispatcher resolves via FN-11
        │
        └─── "auto" (Phase 2) ─▶ executeAutoResolution (FN-15)
                                  + FEAT-002:FN-02 POST /replan call
                                  + Grace period revert (5-30 dk)
```

### 1.4 Kapsam — içeride

- 5 detection monitor (Phase 1, rule-based)
- `enterprise.exception_events` TimescaleDB hypertable (yeni)
- Severity classification (low/medium/high/critical) — UNCERTAINTIES #4
- Dedup/cooldown (FEAT-007 paterniyle)
- Phase 1: Dispatcher notification (MQTT/banner/toast)
- Phase 1: Dispatcher resolve endpoint + UI
- **Phase 1 (v1.3 EKLENDİ): Sürücüye gecikme sebebi sorma** (önlenemez durum tespit edilince, push/modal ile)
- **Phase 1 (v1.3 EKLENDİ): Sürücü çevrimdışı / konum-uyumsuz ayrımı** (iki farklı exception tipi)
- **Phase 1 (v1.3 EKLENDİ): Dock çakışması için otomatik bildirim şablonu hazırlama** (gönderim değil, dispatcher onayına sunma)
- Phase 2: Policy-based auto-action (Mode 2 Exception)
- Phase 2: Grace period revert window
- Audit trail (resolved_at, resolved_by, resolution_type, comment)

### 1.5 Kapsam — dışarıda

- **ML-based anomaly detection** — Phase 3+ (ADR-0010 §3.3, §3.5)
- **"AI agent" carrier contact (LLM-driven outreach)** — Phase 3+
- **Mode 3 Agentic auto-decision** — Phase 3 ADR pending
- **Predictive failure detection** — FEAT-024 Phase 2 (ayrı feature, ML-bazlı)
- **Email/SMS otomatik GÖNDERİMİ** — Phase 2+ (mevcut backend pattern yok, UNCERTAINTIES #6). **v1.3 netleştirmesi:** Şablon **hazırlama** ve dispatcher panelinde **gösterme** Phase 1'de var (FN-17) — dispatcher'ın "onayla ve gönder" dediği an gerçekleşecek otomatik gönderim altyapısı (SendGrid/Mailgun entegrasyonu) hâlâ Phase 2'de.
- **Hava durumu tabanlı otomatik ETA ayarlaması (FEAT-005-EXT)** — ayrı spec yazılana kadar kapsam dışı. **v1.3 kısmi çözüm:** FN-16 ile sürücüye doğrudan sorularak bu boşluk Phase 1'de dolduruluyor (otomatik hava verisi entegrasyonu değil, insan girdisiyle).

### 1.6 Mimari netleştirme — planlama vs canlı izleme sorumluluk ayrımı (v1.3 EKLENDİ, 2026-07-18)

Cem'in mühendislik incelemesi kritik bir mimari netleştirme sağladı: **FEAT-010'daki 5 monitörün ikisi (ETA, compliance) aslında iki farklı "an"da çalışan, farklı sorumlulukları olan mekanizmalardır — bunları karıştırmamak gerekir.**

- **Compliance zone breach (FN-05):** Asıl önleme **planlama aşamasında** olur — `FEAT-001:FN-012 checkCompliance`, VRP rotası oluşturulurken muafiyeti olmayan araçlar için ZE-Zone'ları HERE'nin `avoid areas` listesine ekler, rota **zaten oradan geçmeyecek şekilde** çizilir. FEAT-010:FN-05, bunun üzerine binen bir **ek güvenlik katmanı** — sadece sürücü planlanan rotadan kendi kararıyla saparsa diye. Dispatcher'ın (masa başında, canlı yayında) fiziksel olarak aracı durduramayacağı gerçeği kabul edilir — bu yüzden critical severity'de bildirim **dispatcher'a değil, doğrudan sürücünün telefonuna** gider (bkz. §4 Severity tablosu, zaten mevcuttu, v1.3 bu tasarımın *neden* doğru olduğunu belgeliyor).
- **ETA deviation (FN-01):** Asıl "önleme" burada mümkün değil (gecikme zaten oluşmuş) — bu yüzden FEAT-010'un görevi önlemek değil, **doğru bilgiyi doğru hızda toplamak.** v1.3, bunu iki dala ayırarak netleştiriyor: makine tespit edebildiğini (trafik) otomatik çözer, tespit edemediğini (arıza, hava) insana (sürücüye) sorar — bkz. §1.7.

### 1.7 ETA gecikme sebebi ayrımı (v1.3 EKLENDİ, 2026-07-18)

Cem'in sorusu: *"30 dakikalık gecikme var, sebebi nasıl anlaşılır — AI tabanlı yapmamakla hata mı ettik?"*

**Cevap: Hayır, hata değil.** Çözüm iki dallı, deterministic bir akış:

```
FN-01 monitorEtaViolations tespit eder: ETA sapması > eşik
        │
        ▼
HERE Routing API'ye sorulur: bu rotada trafik yoğunluğu var mı?
        │
        ├─── EVET (trafik tespit edildi) ──▶ Bu zaten FN-02 monitorTrafficImpacts'ın
        │                                     kapsamı — FEAT-002 alternatif rota önerir,
        │                                     dispatcher'a "Trafik Sebebiyle Alternatif
        │                                     Rota Önerisi" bildirimi gider.
        │
        └─── HAYIR (yol temiz görünüyor) ──▶ Sistem bunu "önlenemez durum" (arıza,
                                              kaza, hava şartı) olarak sınıflandırır.
                                              FN-16 requestDelayReasonFromDriver
                                              tetiklenir (bkz. §2 fonksiyon kataloğu).
```

Bu, **AI kullanmadan** "akıllı" görünen bir davranış üretir: sistem kendi bilmediği şeyi (neden gecikti) tahmin etmeye çalışmaz, bilen kişiye (sürücüye) basit bir seçmeli soru sorar. Lojistikte bu, deterministic + insan-girdili tasarımın ML tahmininden daha güvenilir olduğu bir örnektir.

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Phase | Shared with FEAT-001..9 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FEAT-010-FN-01 | worker | `monitorEtaViolations` | taskId, threshold | Exception? | enterprise.dispatch_tasks | enterprise.exception_events | HERE Routing | ADR-0005 §5.2 — "Exception types: No match / Ambiguous match / Rule violation / High-impact event" (4 tip enum) | 1 | **FEAT-005:FN-04** calculateEtaDeviation |
| 2 | FEAT-010-FN-02 | worker | `monitorTrafficImpacts` | routeId | Exception? | enterprise.routing_jobs | enterprise.exception_events | HERE Traffic | ADR-0011 §6 — FEAT-104 (Trafik-triggered re-routing) | 1 | **FEAT-002:FN-10** trafficTriggerDetector |
| 3 | FEAT-010-FN-03 | worker | `monitorDriverPresence` (**v1.3'te iki alt-mantığa ayrıldı, bkz. §3.3**) | driverId, taskId | Exception? (`driver_offline` \| `driver_location_mismatch`) | public.locations, enterprise.dispatch_tasks, MQTT son telemetri zaman damgası | enterprise.exception_events | — | UNCERTAINTIES #1 (v1.3'te cevaplandı — bkz. §8) | 1 | — |
| 4 | FEAT-010-FN-04 | worker | `monitorDockConflicts` | facilityId, window | Exception? | enterprise.dock_appointments | enterprise.exception_events | — | ADR-belirsiz (dock slip warning — UNCERTAINTIES #2) | 1 | **FEAT-006:FN-03** refreshTaskEtas |
| 5 | FEAT-010-FN-05 | worker | `monitorComplianceZones` (**KONSOLIDASYONDA EKLENDİ**) | vehicleId, currentLocation | Exception? | enterprise.nl_compliance_zones, public.locations | enterprise.exception_events | HERE Routing (predicted path) | ADR-0012 §4 — zone breach prediction discipline | 1 | **FEAT-001:FN-012** compliance check (asıl önleme burada — bkz. §1.6) |
| 6 | FEAT-010-FN-06 | backend | `logExceptionEvent` | eventData | { eventId } | — | enterprise.exception_events | — | ADR-0005 §5.3 — "If rules trigger an exception, system marks the task `needs_dispatcher` and notifies the dispatcher." | 1 | **FEAT-014** (FN-04, FN-13), **FEAT-015** (FN-05, FN-08), **FEAT-017** (FN-12), **FEAT-018** (FN-08, FN-13), **FEAT-019** (FN-07, FN-12), **FEAT-103** (FN-07), **FEAT-106** (FN-05) — 7 spec consumer, mega cross-spec sync 2026-05-30 |
| 7 | FEAT-010-FN-07 | shared_library | `deduplicateException` (**KONSOLIDASYONDA EKLENDİ**) | rawException, cooldownMinutes | Exception? | enterprise.exception_events (son 10 dk) | — | — | FEAT-007:FN-11 deduplicateBehaviorEvents paterni | 1 | **FEAT-007:FN-11** (dedup pattern) |
| 8 | FEAT-010-FN-08 | backend | `evaluateExceptionPolicy` | exceptionId | Decision | public.companies (dispatch_mode), enterprise.exception_events | — | — | ADR-0005 §7 — "policy module structure in the enterprise backend (`src/dispatch/policy.ts`) that reads the mode and currently always returns 'advisory'." | 1 (stub) | **FEAT-003:FN-08** policyModule |
| 9 | FEAT-010-FN-09 | backend | `notifyDispatcherException` | exceptionId | void | enterprise.exception_events | — | EMQX MQTT | ADR-0009 §8 — "MQTT publish from enterprise backend — for direct vehicle commands in Mode 2/3 dispatch (per ADR-0005)." | 1 | — |
| 10 | FEAT-010-FN-10 | backend | `GET /api/dispatcher/exceptions` | company_id, status, severity? | Exception[] | enterprise.exception_events | — | — | ADR-0011 §9.5 — "Phase 1 endpoint patterns" | 1 | — |
| 11 | FEAT-010-FN-11 | backend | `POST /api/dispatcher/exceptions/:id/resolve` | id, action, comment, **resolved_by (JWT.user_id)** | Success | enterprise.exception_events | enterprise.exception_events (audit fields), public.tasks (optional) | — | ADR-0005 §4.1 — "Modify one or more assignments (drag-and-drop in the Kanban view; reorder visits in the timeline)." | 1 | **FEAT-001:FN-013** approve pattern |
| 12 | FEAT-010-FN-12 | frontend | `<ExceptionToast />` | alertData | UI Component | — | — | — | ADR-0001 §3.6 — "Notistack — Lightweight Snackbar for non-blocking alerts" | 1 | — |
| 13 | FEAT-010-FN-13 | frontend | `<ExceptionStatusPanel />` | filterStatus | UI Component | enterprise.exception_events | — | — | ADR-0001 §3.6 — "React Table — Vehicle / driver / task lists with sort, filter, paging" | 1 | — |
| 14 | FEAT-010-FN-14 | frontend | `<ResolutionActionPanel />` (**v1.3: FN-17 şablon çıktısını gösterecek şekilde genişletildi**) | exceptionId | UI Component | enterprise.exception_events.detection_payload (şablon varsa) | — | — | ADR-0001 §3.6 — "Forms, modals, navigation, layout primitives" | 1 | — |
| 15 | FEAT-010-FN-15 | worker | `executeAutoResolution` | exceptionId | Result | enterprise.exception_events | enterprise.dispatch_tasks, enterprise.exception_events (status=auto_handled) | HERE Tour Planning | ADR-0005 §5.3 — "If rules permit, system auto-assigns and dispatches." | 2 | **FEAT-002:FN-02** POST /replan |
| 16 | FEAT-010-FN-16 | backend + frontend (mobile) | `requestDelayReasonFromDriver` (**v1.3 EKLENDİ, 2026-07-18**) | taskId, driverId, delayMinutes | void (push gönderir) | enterprise.exception_events | enterprise.exception_events.detection_payload (driver_response) | Expo Push API (bkz. §3.4 — Faz 4 `internalBridge.js:sendPushNotification` deseniyle aynı) | Bu spec'in kendi kararı (§1.7) — dış ADR referansı yok, tulipfleet-backend'de zaten çalışan push deseni referans alınıyor | 1 | `tulipfleet-backend/routes/internalBridge.js:sendPushNotification` (Faz 4, `f4536a7`) — aynı Expo Push API çağrı deseni |
| 17 | FEAT-010-FN-17 | backend | `prepareDockNotificationTemplate` (**v1.3 EKLENDİ, 2026-07-18**) | exceptionId, delayMinutes, dockContactInfo | { template: string } | enterprise.dispatch_tasks, enterprise.dock_appointments | enterprise.exception_events.detection_payload (template) | — | Bu spec'in kendi kararı (§3.5) — Mode 1 Advisory ile tutarlı: sistem hazırlar, dispatcher onaylar | 1 (hazırlama) / 2 (otomatik gönderim — bkz. §1.5) | — |

**Konsolidasyon notları (NotebookLM çıktısına göre düzeltmeler):**

| # | NotebookLM dedi | Düzeltme |
|---|---|---|
| FN-01 ADR-0005 §5.2 | Parafraz birleşim: *"dispatcher notified of exceptions: rule violations, ambiguous matches, high-value tasks, customer-specific escalation patterns"* — **birleştirilmiş cümle**, gerçek metinde 4 alt-başlık var | ✅ Düzeltildi: §5.2 "Exception types"a daha sadık alıntı — 4 tip enum (No match / Ambiguous match / Rule violation / High-impact event) |
| **5. compliance monitor** | NotebookLM 4 detection monitor önerdi (ETA/traffic/no-show/dock) | ✅ **EKLENDİ FN-05** — `monitorComplianceZones` (ADR-0012 §4 zone breach prediction). FEAT-010 5 detection monitor'a tamamlandı. |
| **Dedup pattern** | NotebookLM dedup'tan bahsetmedi | ✅ **EKLENDİ FN-07** — `deduplicateException` (FEAT-007:FN-11 paterniyle, 10 dk cooldown window). Aynı task için tekrarlı exception engellenir. |
| **FN-11 audit trail eksik** | NotebookLM `action, comment` parametreleri | ✅ **GENİŞLETİLDİ** — `resolved_by (JWT.user_id)` eklendi. Writes to: `enterprise.exception_events` audit fields (resolved_at, resolved_by, resolution_type, comment) belirlendi. |
| FN numaralandırma | NotebookLM 13 fonksiyon | ✅ Konsolidasyonda 2 yeni fonksiyon eklendi (FN-05 + FN-07) → toplam 15 fonksiyon. **v1.3'te 2 yeni fonksiyon eklendi (FN-16 + FN-17) → toplam 17 fonksiyon.** |
| FN-09 ADR-0009 §8 alıntı | ✅ Birebir cümle (FEAT-005/007 cross-spec sync sonrası) | — Korundu |
| FN-08 ADR-0005 §7 | ✅ Birebir cümle | — Korundu |
| FN-11 ADR-0005 §4.1 | ✅ Birebir cümle | — Korundu |
| **v1.3 — FN-01 tek yönlü tespit** | Orijinal FN-01 sadece "eşik aşıldı mı" kontrolü yapıyordu, sebep ayrımı yoktu | ✅ **GENİŞLETİLDİ** — §1.7'de belgelenen iki-dallı akış (trafik var/yok) FN-01'in HERE sorgusuna eklendi, trafik yoksa FN-16 tetiklenir. |
| **v1.3 — FN-03 tek exception tipi** | Orijinal FN-03 "driver_no_show" tek tipiyle hem "app kapalı" hem "yanlış yerde" durumlarını karıştırıyordu | ✅ **AYRIŞTIRILDI** — iki exception_type (`driver_offline`, `driver_location_mismatch`), bkz. §3.3 ve §6.1 schema. |
| **v1.3 — FN-04 aksiyon eksikliği** | Orijinal FN-04 sadece tespit ediyordu, "ne yapılacağı" belirtilmemişti (Cem'in doğru tespiti) | ✅ **FN-17 EKLENDİ** — otomatik şablon hazırlama, dispatcher onayına sunma. Gönderim altyapısı hâlâ Phase 2 (§1.5'teki kapsam dışı kararına saygı gösterilerek). |

---

## 3. Exception event pipeline — uçtan uca

### 3.1 Detection → Notification akışı (Phase 1, Mode 1 Advisory)

```
5 paralel monitor (5-15 saniye polling veya event-driven)
   │
   ├── FN-01 monitorEtaViolations
   │   Trigger: FEAT-005:FN-04 deviation > 30 dk
   │   v1.3: HERE trafik sorgusu → trafik yoksa FN-16 (sürücüye sor)
   │
   ├── FN-02 monitorTrafficImpacts
   │   Trigger: FEAT-002:FN-10 HERE Traffic alert
   │
   ├── FN-03 monitorDriverPresence (v1.3: iki alt-dal, bkz. §3.3)
   │   Trigger A: MQTT telemetri sessizliği 15 dk → driver_offline
   │   Trigger B: telemetri akıyor ama geofence dışı → driver_location_mismatch
   │
   ├── FN-04 monitorDockConflicts
   │   Trigger: FEAT-006:FN-03 conflict + ETA-dock_window > 0
   │   v1.3: tetiklenince FN-17 şablon hazırlar
   │
   └── FN-05 monitorComplianceZones (KONSOLIDASYONDA EKLENDİ)
       Trigger: ADR-0012 §4 — predicted path next 30 dk zone breach
       v1.3: bu sadece "sürücü rotadan saptı" yedek katmanı — asıl önleme
             planlama aşamasında (FEAT-001:FN-012), bkz. §1.6
        │
        ▼ Detection threshold karşılanırsa
   logExceptionEvent (FN-06)
   - severity hesapla (Bkz. §4 Severity matrix)
   - INSERT enterprise.exception_events
        │
        ▼
   deduplicateException (FN-07)
   - Son 10 dk içinde aynı (taskId, type) varsa → skip
   - Cooldown window FEAT-007 ALERT_COOLDOWN paterniyle
        │
        ▼
   evaluateExceptionPolicy (FN-08)
   - public.companies.dispatch_mode lookup
   - Phase 1: Stub mode — her zaman { decision: "advisory" } döner
        │
        ▼ ("advisory" karar)
   notifyDispatcherException (FN-09)
   - MQTT publish: enterprise/dispatcher/{company_id}/exception
   - Dispatcher web app subscribe → ExceptionToast (FN-12) gösterir
        │
        ▼
   ExceptionStatusPanel (FN-13) listede gösterir
   Dispatcher inceler → ResolutionActionPanel (FN-14)
   (v1.3: dock çakışmasıysa burada FN-17'nin hazırladığı şablon da görünür)
        │
        ▼
   POST /api/dispatcher/exceptions/:id/resolve (FN-11)
   - Action: "acknowledge" | "manual_replan" | "manual_reassign" | "dismiss" | "send_template" (v1.3 EKLENDİ)
   - Audit: resolved_at, resolved_by, resolution_type, comment
   - status: open → resolved
```

### 3.2 Phase 2 — Auto-resolution akışı (Mode 2 Exception-based)

```
Detection + logExceptionEvent + deduplicateException (Phase 1 ile aynı)
        │
        ▼
   evaluateExceptionPolicy (FN-08, Phase 2 aktive)
   - public.companies.dispatch_mode = 'exception'
   - Policy module decision:
     - ADR-0005 §5.1 rule sets (task value, distance, driver constraint,
       time window, customer override)
     - Eşik karşılanırsa: { decision: "auto", action: "replan|reassign" }
     - Karşılanmazsa: { decision: "advisory" } (Phase 1 path)
        │
        ▼ ("auto" karar)
   executeAutoResolution (FN-15)
   - FEAT-002:FN-02 POST /replan call (action="replan" ise)
   - veya FEAT-003 reassign call (action="reassign" ise)
   - enterprise.exception_events UPDATE: status=auto_handled
   - resolution_type = "auto"
        │
        ▼ Grace period 5-30 dk (ADR-0005 §5.3.5)
   Dispatcher revert edebilir → POST /resolve action="revert"
   - Otomatik aksiyonu geri al (orijinal task state restore)
```

### 3.3 FN-03 monitorDriverPresence — iki alt-senaryo (v1.3 EKLENDİ, 2026-07-18)

Cem'in sorusu: *"Bunu nasıl anlayacak? Hareket saatinde sistemin açılmamış olması durumunda bunu sürücü gelmedi diye mi anlayacağız?"*

Orijinal spec (§8 UNCERTAINTIES #1) tek bir geofence-mesafe kontrolü öneriyordu, ama bu iki farklı gerçek durumu ayırt edemiyordu: sürücünün uygulamayı hiç açmamış olması ile uygulaması açık ama fiziksel olarak yanlış yerde olması **aynı "no-show" etiketi altında** karışıyordu. v1.3 bunu iki ayrı, kendi mantığıyla çalışan dala ayırıyor:

```
Görev başlama saati geldi (task.scheduled_start)
        │
        ├─── Durum A: MQTT/telemetri sessizliği ───────────────────────┐
        │    Son 15 dakikadır public.locations'a hiç veri düşmemiş     │
        │    (sürücünün mobil app'i MQTT'ye telemetri göndermiyor)     │
        │    → exception_type: 'driver_offline'                       │
        │    → Yorum: "Sürücü uygulamayı açmamış veya cihaz kapalı"    │
        │                                                               │
        └─── Durum B: Telemetri akıyor, konum uyumsuz ─────────────────┤
             MQTT üzerinden konum verisi geliyor (app açık, cihaz      │
             çevrimiçi), AMA görevin depo/pickup geofence'ine          │
             uzaklığı eşik değerini (varsayılan 100m) aşıyor           │
             → exception_type: 'driver_location_mismatch'              │
             → Yorum: "Sürücü hazır ama beklenen yerde değil"          │
                                                                        │
        Her iki durumda da severity aynı eşiklerle hesaplanır          │
        (bkz. §4 Severity matrix — "Driver no-show" satırı artık       │
        her iki exception_type için de geçerli, aynı zaman eşikleri)   │
```

**Neden bu ayrım önemli:** Dispatcher'a gelen bildirim farklı bir aksiyon gerektirir — "offline" durumunda dispatcher sürücüyü telefonla aramayı düşünebilir (uygulama açık değilse push bildirimi de ulaşmayabilir); "location_mismatch" durumunda sürücüye doğrudan bir push/mesaj göndermek (FN-16'nın kullandığı aynı Expo Push mekanizmasıyla) daha etkili olur çünkü uygulama zaten aktif.

### 3.4 FN-16 requestDelayReasonFromDriver — akış detayı (v1.3 EKLENDİ, 2026-07-18)

```
FN-01, "önlenemez durum" tespit etti (§1.7)
        │
        ▼
FN-16 requestDelayReasonFromDriver çağrılır
        │
        ├─ enterprise.exception_events.detection_payload güncellenir:
        │  { "delay_reason_requested_at": "...", "delay_minutes": 30 }
        │
        ▼
Expo Push API'ye istek (tulipfleet-backend'in mevcut deseni — bkz. §7 shared infrastructure)
        │
        ▼
Sürücünün mobil uygulamasında push/modal görünür:
  "Rota üzerinde trafik görünmüyor ancak 30 dk gecikme tespit edildi.
   Durum nedir?  [Arıza]  [Kaza]  [Hava Şartları]  [Diğer]"
        │
        ▼ Sürücü bir seçenek seçer
PUT /api/driver/exceptions/:id/reason  (yeni endpoint, mobil app tarafında)
        │
        ▼
enterprise.exception_events.detection_payload güncellenir:
  { ..., "driver_response": "arıza", "driver_response_at": "..." }
        │
        ▼
Dispatcher'ın ExceptionStatusPanel'i (FN-13) artık sebebi gösterir —
toast/bildirim güncellenmez (spam önleme), ama panel açıldığında görünür.
```

**Not — bu bir zorunluluk değil, en-iyi-çaba (best-effort) mekanizmadır:** Sürücü cevap vermezse (örn. gerçekten arızalanmışsa telefonla ilgilenemeyebilir), `driver_response` alanı `null` kalır, dispatcher'a "sebep bilinmiyor, sürücüden yanıt alınamadı" olarak gösterilir. Bu senaryo sistemi bloke etmez.

### 3.5 FN-17 prepareDockNotificationTemplate — akış detayı (v1.3 EKLENDİ, 2026-07-18)

Cem'in sorusu: *"Ne yapılacak belli edilmeli."* Orijinal spec dock çakışmasını tespit ediyordu ama hiçbir aksiyon tanımlamıyordu.

```
FN-04 monitorDockConflicts tetiklendi (dock randevusu kaçırılacak)
        │
        ▼
FN-17 prepareDockNotificationTemplate çağrılır
        │
        ├─ Task + dock appointment bilgisinden bir metin şablonu üretir:
        │  "TulipFleet aracı [plaka] trafik/gecikme sebebiyle [dock adı]
        │   randevusuna yaklaşık [X] dk geç kalacaktır."
        │
        ▼
enterprise.exception_events.detection_payload'a yazılır:
  { "dock_template": "...", "dock_contact": "..." }
        │
        ▼
ResolutionActionPanel (FN-14) bu şablonu gösterir, dispatcher'a iki seçenek sunar:
  1. "Şablonu onayla ve gönder" → action="send_template"
     (v1.3: gönderim altyapısı Phase 2'de kurulana kadar bu buton
      "panoya kopyala" davranışına düşer — dispatcher kendi email/telefon
      aracıyla gönderir. Phase 2'de gerçek otomatik gönderime bağlanır.)
  2. "Randevuyu yeniden planla" → mevcut manual_replan akışına yönlendirir
```

**Tasarım gerekçesi:** Bu, Mode 1 Advisory disiplinine (ADR-0005) tam uyumlu — sistem **hazırlar**, insan **onaylar ve gönderir**. §1.5'teki "email/SMS otomatik gönderimi Phase 2+" kararına dokunulmuyor; sadece şablon hazırlama ve gösterme (metin üretimi, gerçek gönderim değil) Phase 1'e alınıyor.

---

## 4. Severity classification matrix (**KONSOLIDASYONDA EKLENDİ, v1.3'te driver no-show satırları güncellendi**)

UNCERTAINTIES #4'te belirsizdi — konsolidasyonda netleştirildi:

| Detection | Eşik | Severity |
|---|---|---|
| **ETA delay** | 15-30 dk | medium |
| **ETA delay** | 30-60 dk | high |
| **ETA delay** | > 60 dk veya customer SLA breach imminent | critical |
| **Traffic impact** | route delay > 20% | medium |
| **Traffic impact** | route blocked / closure | high |
| **Driver offline** (v1.3: eski "driver no-show" ikiye ayrıldı) | 0-15 dk grace | low (warning) |
| **Driver offline** | 15-30 dk | medium |
| **Driver offline** | > 30 dk veya driver_assigned_at + 60dk | high |
| **Driver location mismatch** (v1.3 YENİ) | 0-15 dk grace | low (warning) |
| **Driver location mismatch** | 15-30 dk | medium |
| **Driver location mismatch** | > 30 dk | high |
| **Dock conflict** | 60-30 dk lead time | medium |
| **Dock conflict** | 30-0 dk lead time | high |
| **Dock conflict** | dock window kaçırıldı | critical |
| **Compliance breach imminent** | 30-15 dk önceden | medium |
| **Compliance breach imminent** | 15-0 dk önceden | high |
| **Compliance breach** | araç ZE-zone'a hatalı emission ile girdi | critical |
| **Locker pickup expired** | 72 saat geçti, customer paketi almadı | medium |
| **Locker pickup expired** | + customer SLA breach | high |
| **Tender withdrawn** | awarded carrier çekildi | high |
| **Tender no quotes** | deadline geçti, hiç quote yok | medium |
| **Returns pickup failed** | RMA SLA breach (approve→pickup 48h) | medium |
| **Returns pickup failed** | RMA in_transit > 7 gün | high |
| **RTS warehouse unreachable** | failed delivery, RTS destination resolution failed | high |
| **Invoice discrepancy** | within tolerance | low |
| **Invoice discrepancy** | rate_mismatch / quantity / unauthorized | medium-high |
| **Invoice audit deadline expired** | dispute response > 7 gün | medium |
| **Rest violation** | EU 561 daily/continuous limit imminent (30dk buffer) | high |
| **Rest violation** | EU 561 limit aşıldı | critical |
| **Border crossing compliance breach** | predicted zone breach | high |
| **Border crossing compliance breach** | araç zone'a yanlış emission ile girdi | critical |
| **Range anxiety breach** | SoC < min_soc_at_destination | medium |
| **Range anxiety breach** | SoC < emergency_reserve_percent | critical |
| **CSRD data quality breach** | completeness < %95 | medium |
| **CSRD data quality breach** | outlier or missing baseline | high |

**Karar mantığı:** Severity hesaplama deterministic, threshold-based (ML değil). Severity → notification channel mapping:

| Severity | Phase 1 Notification |
|---|---|
| low | Sadece exception panel'de görünür (no toast) |
| medium | Toast + panel |
| high | Toast + panel + banner |
| critical | Toast + panel + banner + Phase 2: MQTT push to driver mobile (FN-09 ADR-0009 §8 pattern) |

Per-company override: `public.companies.settings.exception_thresholds` JSONB key (UNCERTAINTIES #5).

---

## 5. Dedup / cooldown discipline (**KONSOLIDASYONDA EKLENDİ**)

FN-07 `deduplicateException` — FEAT-007 behavior_events paterniyle aynı pattern:

```typescript
// Cooldown window: 10 dakika (configurable per company)
const recent = await db.query(`
  SELECT id FROM enterprise.exception_events
  WHERE task_id = $1
    AND exception_type = $2
    AND occurred_at > NOW() - INTERVAL '10 minutes'
    AND status IN ('open', 'acknowledged')
  LIMIT 1
`, [taskId, type]);

if (recent.length > 0) {
  // Skip — aynı task için aktif exception zaten var
  return null;
}
// Devam et: logExceptionEvent
```

**Mantık:**
- Aynı `(task_id, exception_type)` 10 dk içinde tekrar tetiklenirse skip
- "Resolved" durumdaki eski exception sayılmaz — yeni instance açılabilir
- Spam'i önler (örn. ETA 30 dk sınırında osilasyon → tek alert)
- Cooldown window per-company config (UNCERTAINTIES #5)
- **v1.3 notu:** `driver_offline` ve `driver_location_mismatch` **ayrı exception_type** oldukları için birbirlerini dedup etmezler — bir görev önce "offline" sonra "location_mismatch" durumuna geçerse (örn. sürücü uygulamayı geç açtı ama yanlış yerdeyse), bu iki ayrı, meşru exception olarak kaydedilir.

**Trade-off:** 10 dk içinde durum **kötüleşirse** (örn. ETA 30 → 60 dk) → severity UPDATE mu yeni event mi? **Önerim:** UPDATE (aynı event'in severity'si artar). UNCERTAINTIES #7.

---

## 6. Database — `enterprise.exception_events`

### 6.1 Schema (TimescaleDB hypertable) — v1.3: exception_type enum'a 2 yeni değer eklendi

```sql
CREATE TABLE enterprise.exception_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    task_id             UUID REFERENCES enterprise.dispatch_tasks(id),
    vehicle_id          UUID REFERENCES public.vehicles(id),
    driver_id           UUID REFERENCES public.drivers(id),

    -- Exception classification
   exception_type      TEXT NOT NULL
                    CHECK (exception_type IN (
                      'eta_delay',
                      'traffic_impact',
                      -- v1.3 (2026-07-18): 'driver_no_show' ikiye ayrıldı, bkz. §3.3
                      'driver_offline',                -- FN-03 dal A: MQTT sessizliği
                      'driver_location_mismatch',      -- FN-03 dal B: konum uyumsuzluğu
                      'dock_conflict',
                      'compliance_zone_breach',
                      -- Cross-spec sync (2026-05-30 sabah): FEAT-014, 017, 018 entegrasyonu
                      'locker_pickup_expired',         -- FEAT-017:FN-12
                      'tender_withdrawn',              -- FEAT-014:FN-13
                      'tender_no_quotes',              -- FEAT-014:FN-04
                      'returns_pickup_failed',         -- FEAT-018:FN-13 (RMA SLA)
                      'rts_warehouse_unreachable',     -- FEAT-018:FN-08 (RTS destination)
                      -- Mega cross-spec sync (2026-05-30 akşam): FEAT-015, 019, 103, 106 entegrasyonu
                      'invoice_discrepancy',           -- FEAT-015:FN-05 (audit reconciliation)
                      'invoice_audit_deadline_expired',-- FEAT-015:FN-08 (audit SLA)
                      'rest_violation',                -- FEAT-019:FN-07 (EU 561/2006 breach)
                      'border_crossing_compliance_breach', -- FEAT-019:FN-12 (multi-country zone)
                      'range_anxiety_breach',          -- FEAT-103:FN-07 (EV SoC critical)
                      'csrd_data_quality_breach'       -- FEAT-106:FN-05 (CSRD report validation)
                    )),
    severity            TEXT NOT NULL
                        CHECK (severity IN ('low','medium','high','critical')),
    status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','acknowledged','resolved','auto_handled')),

    -- Detection payload
    detection_payload   JSONB NOT NULL,  -- per-monitor specific data
    -- Örnek (eta_delay, önlenemez durum, v1.3): { "eta_deviation_minutes": 30,
    --   "here_traffic_detected": false, "delay_reason_requested_at": "...",
    --   "driver_response": "arıza", "driver_response_at": "..." }
    -- Örnek (dock_conflict, v1.3): { "eta_deviation_minutes": 40,
    --   "dock_template": "TulipFleet aracı ... 40 dk geç kalacaktır.",
    --   "dock_contact": "dock@customer.nl" }

    -- Resolution audit (Phase 1: manuel; Phase 2: auto da eklenir)
    resolution_type     TEXT CHECK (resolution_type IN ('manual','auto')),
    resolution_action   TEXT,  -- "acknowledge|manual_replan|manual_reassign|dismiss|send_template|auto_replan|auto_reassign|revert"
    resolved_at         TIMESTAMPTZ,
    resolved_by         UUID REFERENCES public.users(id),
    resolution_comment  TEXT,
    grace_period_ends_at TIMESTAMPTZ,  -- Phase 2 auto-action için revert window

    occurred_at         TIMESTAMPTZ NOT NULL,  -- detection time
    received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, occurred_at)
);

-- TimescaleDB hypertable (FEAT-007:behavior_events paterni)
SELECT create_hypertable('enterprise.exception_events', 'occurred_at',
                         chunk_time_interval => INTERVAL '7 days');

-- Retention policy (UNCERTAINTIES #8 — 90 gün default, audit için yeterli)
SELECT add_retention_policy('enterprise.exception_events', INTERVAL '90 days');

-- Indexes
CREATE INDEX idx_exception_events_open ON enterprise.exception_events
  (company_id, status, occurred_at DESC)
  WHERE status IN ('open', 'acknowledged');

CREATE INDEX idx_exception_events_task ON enterprise.exception_events
  (task_id, occurred_at DESC);

CREATE INDEX idx_exception_events_dedup ON enterprise.exception_events
  (task_id, exception_type, occurred_at DESC)
  WHERE status IN ('open', 'acknowledged');
```

### 6.2 Karar — neden TimescaleDB hypertable

- Zaman bazlı sorgu hâkim (aktif son N saat exception listesi)
- FEAT-007:behavior_events paterniyle simetrik (mimari tutarlılık)
- Retention policy (90 gün) audit için yeterli, eski exception'lar `driver_scores` benzeri aggregate olarak gerekirse Phase 2'de eklenir
- Chunk interval 7 gün — exception volume'ı low (50 araç × ~10 exception/gün = 500 row/gün × 7 = 3500 row/chunk)

### 6.3 `public.companies.settings` — exception_thresholds JSONB

```jsonc
{
  "exception_thresholds": {
    "eta_delay_minutes": 30,        // default 30
    "no_show_grace_minutes": 15,
    "dock_slip_lead_minutes": 60,
    "compliance_breach_lead_minutes": 30,
    "dedup_cooldown_minutes": 10
  }
}
```

Per-company override mantığı (UNCERTAINTIES #5).

---

## 7. Shared infrastructure with previous FEAT'leri

| FEAT-010 fonksiyon | Shared with | Paylaşım türü |
|---|---|---|
| FN-01 monitorEtaViolations | **FEAT-005:FN-04** calculateEtaDeviation | Detection source (FEAT-005'in çıktısını consume eder) |
| FN-02 monitorTrafficImpacts | **FEAT-002:FN-10** trafficTriggerDetector | Detection source |
| FN-04 monitorDockConflicts | **FEAT-006:FN-03** refreshTaskEtas | Detection source (dock conflict check) |
| FN-05 monitorComplianceZones | **FEAT-001:FN-012** compliance check | Detection source (compliance verify üzerine prediction — asıl önleme planlamada, bkz. §1.6) |
| FN-07 deduplicateException | **FEAT-007:FN-11** deduplicateBehaviorEvents | Dedup pattern (cooldown window) |
| FN-08 evaluateExceptionPolicy | **FEAT-003:FN-08** policyModule | Phase 1 stub (ADR-0005 §7), Phase 2 decision engine |
| FN-09 notifyDispatcherException | **FEAT-005:FN-08** broadcastEtaToDriver | MQTT publish from enterprise pattern (ADR-0009 §8) |
| FN-11 POST /resolve | **FEAT-001:FN-013** approve pattern | Approve pattern |
| FN-15 executeAutoResolution | **FEAT-002:FN-02** POST /replan | Action target (Phase 2) |
| **FN-16 requestDelayReasonFromDriver (v1.3)** | **`tulipfleet-backend/routes/internalBridge.js:sendPushNotification`** (Faz 4, commit `f4536a7`, `ARCHITECTURE_DECISION_task-management-api-driven.md`) | Aynı Expo Push API çağrı deseni — `users.expo_push_token` okuma, best-effort/no-throw gönderim. FEAT-010 implementasyonu bu fonksiyonu tekrar yazmak yerine paylaşılan bir helper'a çıkarmalı (implementation backlog notu, §10.2). |

**Cross-spec sync TODO (potansiyel):**
- FEAT-002 spec'ine FN-02 "consumed by FEAT-010:FN-15" notu eklenebilir mi? Genelde caller yazılır, target reverse yazılmaz. **Karar: reverse yazma yapılmayacak** — FEAT-010 spec'i shared kolonu zaten yansıtıyor.

**Yeni paradigma — Orkestratör Feature:**
FEAT-010 4 farklı FEAT'ten detection consume eder ve 2 farklı FEAT'in action'ını trigger eder. Phase 1'de **observer**, Phase 2'de **executor** rolü. Bu pattern ileride başka FEAT'ler için şablon olabilir (örn. FEAT-024 Predictive Failure Detection benzer orkestratör).

**v1.3 gözlemi:** FN-16'nın Faz 4'te zaten production'da çalışan bir push mekanizmasını referans alması, "orkestratör feature" paradigmasının sadece detection/action FEAT'lerini değil, **mevcut altyapı desenlerini de** yeniden kullanabileceğini gösteriyor — sıfırdan push altyapısı tasarlamak yerine, kanıtlanmış bir deseni tekrar kullanmak.

---

## 8. UNCERTAINTIES (Cem onayı bekleyen)

### NotebookLM'in tespit ettikleri

1. **Driver no-show detection (FN-03):** ~~"Driver hareket etmezse" mantığı — kaç metre/saniye threshold?~~ **✅ v1.3'te CEVAPLANDI (2026-07-18):** Tek bir geofence kontrolü yetersizdi. Cem'in mühendislik incelemesiyle iki ayrı dal netleştirildi: (A) MQTT telemetri sessizliği 15 dk → `driver_offline`, (B) telemetri akıyor ama geofence'e uzaklık > 100m → `driver_location_mismatch`. Detay §3.3.

2. **Dock conflict warning lead time (FN-04):** 60 dk önceden uyar mı, daha erken/geç?
   - **Önerim:** 60 dk default (Cem onayı). Eşik karşılanırsa medium, 30 dk içinde high, dock window kaçırıldıysa critical.
   - **v1.3 eklemesi:** "Ne yapılacak" sorusu da cevaplandı — FN-17 otomatik şablon hazırlıyor, dispatcher onaylıyor. Bkz. §3.5.

3. **Weather-based exception (FEAT-005-EXT):** Ağır hava koşulları (örn. %20 ek sürüş süresi) exception trigger mı?
   - **Karar:** FEAT-005-EXT spec'i yazılana kadar **kapsam dışı** (otomatik hava API entegrasyonu anlamında). **v1.3 kısmi çözüm:** FN-16 ile bu boşluk insan-girdili olarak dolduruluyor — sistem hava durumunu otomatik algılamıyor ama sürücüye sorarak aynı bilgiye (gecikme sebebi hava mıydı) ulaşıyor. FEAT-005-EXT yazıldığında bu, otomatik ön-tahminle **desteklenebilir**, ama FN-16 zaten çalışan bir fallback olarak kalır.

4. **Severity mapping deterministic mi olsun:** Eşikler statik mi yoksa per-company configurable mı?
   - **Karar:** §4 matrix default, per-company override `public.companies.settings.exception_thresholds` JSONB.

5. **Per-company override JSONB struktür:** Tek key (`exception_thresholds`) altında tüm threshold'lar mı, ayrı key'ler mi?
   - **Karar:** Tek key (§6.3 örnek). Daha kolay query, daha az JSONB path complexity.

### Konsolidasyonda eklenen

6. **Driver mobile reject Phase 2 (Mode 2 auto-assign):** Sürücünün auto-assigned task'ı reddetmesi:
   - **High Impact Exception** olarak mı işlenir (ADR-0005 §5.2 "High-impact event")
   - Veya **No Match** exception olarak yeni dispatcher decision tetikler (§5.2 "No match")?
   - **Önerim:** Daha basit "No match" yeniden — driver reject = mevcut driver-task pair geçersiz, yeni atama gerek. UNCERTAINTIES'te ADR-0005 §9 ile birlikte değerlendirilmeli.

7. **Severity kötüleşme — UPDATE vs new event:** 10 dk dedup window içinde durum kötüleşirse (örn. ETA 30 → 60 dk):
   - **Önerim:** UPDATE — aynı `exception_events` row'un severity'sini yükselt, `detection_payload` JSONB'ye history ekle (`escalation_history: [{from: "medium", to: "high", at: "..."}]`)
   - Alternatif: Yeni event aç — dedup window'u kötüleşme için bypass et
   - Karar UI/UX tarafından gelmeli — dispatcher tek exception görmek mi ister, escalation history mi?

8. **Retention policy 90 gün doğru mu:** TimescaleDB retention default önerildi.
   - 50 araç × ~10 exception/gün × 90 gün = 45K row → küçük lookup
   - Audit için 90 gün yeterli (Phase 2'de daha uzun arşivleme `enterprise.exception_aggregate` ile)
   - **Karar:** 90 gün ✅

9. **Resolution sorumluluğu:** Bir exception "acknowledge" edildiğinde, o aracın planlamadan geçici olarak çıkarılıp çıkarılmayacağı (NotebookLM UNCERTAINTIES #3)
   - **Önerim:** **HAYIR** — "acknowledge" sadece dispatcher gördü demektir, status `open → acknowledged`, task hala aktif. Eğer manuel re-plan veya reassign yapılırsa zaten ayrı action.

10. **Email/SMS notification Phase 2+:**
    - **Karar:** Phase 1 sadece MQTT + UI + (v1.3) hazır şablon gösterimi. Gerçek otomatik email/SMS gönderimi Phase 2+ FEAT-101 ile beraber gelir.
    - Mevcut backend pattern: SendGrid/Mailgun entegrasyonu yok (UNCERTAINTIES #6).

### v1.3'te yeni açılan (Cem onayı bekleyen)

11. **FN-16 sürücü cevap vermezse ne olur (timeout)?** Şu an spec bir timeout tanımlamıyor — `driver_response` süresiz `null` kalabilir. **Öneri:** 30 dakika içinde cevap gelmezse `detection_payload.driver_response_timeout = true` işaretlenip dispatcher'a "sürücüden yanıt alınamadı" olarak gösterilsin. Cem kararı bekliyor.

12. **FN-17 şablon dili / çok-dillilik:** Dock iletişim şablonu hangi dilde üretilecek — task'ın/şirketin dili mi, yoksa her zaman İngilizce/Hollandaca mı? Mevcut i18n altyapısı (7 dil, mobil app'te kanıtlı) referans alınabilir. Cem kararı bekliyor.

13. **`driver_offline` ile gerçek push bildirimi çelişkisi:** FN-03 dal A ("driver_offline") tetiklendiğinde, sürücünün uygulaması zaten kapalı/telemetri göndermiyor demektir — bu durumda FN-16 (push bildirimi) de muhtemelen ulaşmayacaktır (push token geçerli olsa bile cihaz/app offline ise teslim gecikebilir). **Öneri:** `driver_offline` exception'ında dispatcher'a "push bildirimi de ulaşmayabilir, telefonla arama düşünün" notu eklensin. Cem kararı bekliyor.

---

## 9. Pilot süreç notları

### 9.1 Pilot akışı (2026-05-30)

Tek prompt + 0 follow-up. Cem prompt'u kısalttı (token limiti) — ML disipline uyarısı, ÇIKTI FORMATI, EK ÇIKTI 6 başlık korundu. Sonuç: kısaltma kalitede düşüşe neden olmadı.

### 9.2 Alıntı doğrulama — §number fabrikasyon stop devam

| # | NotebookLM | Gerçek | Durum |
|---|---|---|---|
| FN-01 ADR-0005 §5.2 | Parafraz birleşim | §5.2 mevcut, ama alıntı 4 başlığı tek cümleye birleştirmiş | ⚠️ Düzeltildi — daha sadık alıntı |
| FN-02 ADR-0011 §6 FEAT-104 | ✅ Doğru | — | ✅ |
| FN-06 ADR-0005 §5.3 | ✅ Birebir cümle | — | ✅ |
| FN-08 ADR-0005 §7 | ✅ Birebir cümle | — | ✅ |
| FN-09 ADR-0009 §8 | ✅ Birebir cümle (sync sonrası) | — | ✅ |
| FN-10 ADR-0011 §9.5 | ✅ Doğru | — | ✅ |
| FN-11 ADR-0005 §4.1 | ✅ Birebir cümle | — | ✅ |
| FN-12, FN-13, FN-14 ADR-0001 §3.6 | ✅ Doğru | — | ✅ |
| FN-15 ADR-0005 §5.3 | ✅ Birebir cümle | — | ✅ |

**§number fabrikasyon: 0** ✅ (F9'daki §188 hatası tekrarlanmadı)
**Toplam alıntı düzeltmesi: 1** (FN-01 parafraz birleşimi — minor)

### 9.3 10 pilot karşılaştırma — F10 zirveye yakın

| Boyut | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 | F9 | **F10** |
|---|---|---|---|---|---|---|---|---|---|---|
| Skor | 9 | 9.5 | 9 | 9 | 8.5 | 9 | 8.5 | 9.5 | 8.5 | **9** |
| İterasyon | 5 | 3 | 2 | 1+1 | 1+3 | 1 | 1+1 | 1 | 1 | **1** |
| Fonksiyon (final) | 16 | 16 | 16 | 12 | 12 | 10 | 14 | 9 | 7 | **17 (v1.3 sonrası)** |
| Alıntı hatası | 1 | 1 | 1 | 0 | 1 | 1 | 6 | 1 | 2 | **1** |
| §number fabrikasyon | 1 | 1 | 1 | 0 | 1 | 1 | 1 | 0 | 1 | **0** ✅ |
| Yeni paradigma | VRP | Re-route | Dispatch | Multi-actor | HERE consume | Task duration | Coaching | Toll | Carbon | **Orchestrator** |

**F10 gözlemleri:**
- **§number fabrikasyon stop devam** — F9'daki §188 hatası bir sapmaydı, F8 ve F10'da 0
- Kısaltılmış prompt kaliteyi etkilemedi
- Konsolidasyonda 2 yeni fonksiyon eklendi (FN-05 compliance monitor + FN-07 dedup) — NotebookLM'in **kaçırdığı disipline noktaları**
- Yeni paradigma: **Orkestratör feature** — multi-source consumer + multi-target action router
- **v1.3 (2026-07-18) — insan mühendislik incelemesi katmanı:** NotebookLM'in ilk taslağından farklı olarak, bu güncelleme bir AI pilot çıktısı değil, Cem'in fonksiyon fonksiyon okuyup 3 gerçek eksiği (sebep tespiti, no-show ayrımı, dock aksiyonu) tespit etmesiyle geldi. Bu, spec'in "AI üretti, insan onayladı" modelinden "insan AI çıktısını sorguladı, gerçek boşlukları buldu" modeline geçtiğinin kanıtı.

### 9.4 NotebookLM trend yorumu

F8-F9-F10 mini-trend:
- F8 zirve (9.5/10, 0 fab) — Vrachtwagenheffing stratejik feature
- F9 hafif düşüş (8.5/10, 1 fab) — Carbon "rutin" feature
- F10 toparlama (9/10, 0 fab) — Exception handling stratejik orkestratör

Hipotez: **NotebookLM stratejik öneme sahip feature'larda daha dikkatli** — Vrachtwagenheffing (production-blocking regulatory), Exception Handling (Mode 1→2 bridge) = yüksek dikkat; Carbon "rutin display" = odak gevşemesi.

**Sonraki pilotlar için:** "ADR-XXXX §3.4'ten yüksek section YOK" guard rail prompt'ta korunmalı (F10'da işe yaradı).

---

## 10. Next steps

### 10.1 Cross-spec sync — yok (ilk kez)

F1 (v3), F5 (v2), F7 (v3) cross-spec sync yapıldı. **FEAT-010 bu commit'te cross-spec sync GEREKTİRMİYOR:**
- FN-01 FEAT-005:FN-04 consume eder — FEAT-005 spec'inde değişiklik yok (caller direction)
- FN-02 FEAT-002:FN-10 consume eder — aynı şekilde
- FN-15 FEAT-002:FN-02 trigger eder Phase 2'de — aynı şekilde

Genelde **caller spec'i** consumer'ı belgelemekle yetinir. Target spec'lerinde reverse note eklemek gereksiz (önceki cross-spec sync'lerde de yapılmadı).

**v1.3 notu:** FN-16'nın referans aldığı `internalBridge.js:sendPushNotification` `tulipfleet-backend` reposunda, `docs/functions/` altında değil — bu bir "spec-to-spec" değil "spec-to-production-code" cross-referansı, farklı bir kategori. Cross-spec sync TODO listesine eklenmiyor.

### 10.2 Phase 1 implementation backlog

ROADMAP Phase 1.1'de (FEAT-010 sıralanan ilk pilot):

- [ ] Schema migration: `enterprise.exception_events` TimescaleDB hypertable (v1.3: `driver_offline` + `driver_location_mismatch` enum değerleriyle)
- [ ] `public.companies.settings.exception_thresholds` JSONB default values
- [ ] FN-01..FN-05 5 detection monitor (paralel worker'lar) — FN-01 v1.3 iki-dallı HERE trafik kontrolüyle, FN-03 v1.3 iki alt-mantıkla
- [ ] FN-06 logExceptionEvent + severity hesabı (§4 matrix)
- [ ] FN-07 deduplicateException (10 dk cooldown)
- [ ] FN-08 evaluateExceptionPolicy stub (advisory döner)
- [ ] FN-09 notifyDispatcherException (MQTT publish)
- [ ] FN-10 GET /api/dispatcher/exceptions
- [ ] FN-11 POST /api/dispatcher/exceptions/:id/resolve + audit fields (v1.3: "send_template" action eklendi)
- [ ] FN-12 `<ExceptionToast />` (Notistack)
- [ ] FN-13 `<ExceptionStatusPanel />` (React Table)
- [ ] FN-14 `<ResolutionActionPanel />` (form modal, v1.3: FN-17 şablon gösterimi eklendi)
- [ ] **FN-16 requestDelayReasonFromDriver (v1.3 YENİ)** — `internalBridge.js:sendPushNotification` deseni referans alınarak, backend'de paylaşılan bir push helper'a çıkarılması önerilir
- [ ] **FN-16 mobil taraf (v1.3 YENİ)** — sürücü uygulamasında "Gecikme Sebebi" modal/ekranı + `PUT /api/driver/exceptions/:id/reason` endpoint'i
- [ ] **FN-17 prepareDockNotificationTemplate (v1.3 YENİ)** — şablon metni üretimi, panoya kopyalama davranışı (gerçek gönderim Phase 2)

### 10.3 Phase 2 implementation backlog (FEAT-101 customer trigger)

- [ ] FN-08 evaluateExceptionPolicy production logic (ADR-0005 §5.1 rule sets)
- [ ] FN-15 executeAutoResolution (FEAT-002:FN-02 POST /replan caller)
- [ ] Grace period revert window (5-30 dk, ADR-0005 §5.3.5)
- [ ] POST /api/dispatcher/exceptions/:id/resolve action="revert" desteği
- [ ] MQTT push to driver mobile (ADR-0009 §8) critical severity için
- [ ] Email/SMS notification entegrasyonu (SendGrid/Mailgun) — **v1.3: FN-17'nin hazırladığı şablonları otomatik gönderecek altyapı**

### 10.4 Sıradaki pilot

ROADMAP pilot pipeline #2: **FEAT-011 PoD Capture (W9)**. Cem notu "last priority" ama Very common.

Alternatifler:
- **FEAT-012** Refrigerated Container Monitoring (W11, menu/skeleton paterni — ilginç mimari)
- **FEAT-013** Hazmat Routing (W12, ADR-0012 ile sinerjili)
- **FEAT-016** Cost-to-Serve Modeling (W15)

Cem kararı.

---

## 11. References

- ADR-0001 §3.6 (UI primitives — Notistack, React Table, Forms)
- **ADR-0005 §4.1** (Mode 1 dispatcher modify), **§5.2** (Exception types), **§5.3** (Auto-dispatch loop), **§7** (Policy module stub)
- ADR-0009 §8 (MQTT publish from enterprise pattern)
- **ADR-0010 §3.3** (anomaly detection Phase 3), **§3.4** (no learning), **§4** (API consumer)
- ADR-0011 §6 (FEAT-104 trafik-triggered), §9.5 (endpoint patterns)
- ADR-0012 §4 (NL Compliance zone breach prediction — FN-05 detection source)
- FEAT-001 spec v3 (FN-012 checkCompliance — planlama aşaması önleme, FN-013 approve pattern)
- FEAT-002 spec (FN-02 POST /replan action target, FN-10 trafficTriggerDetector detection source)
- FEAT-003 spec (FN-08 policyModule Phase 2 decision)
- FEAT-005 spec v2 (FN-04 calculateEtaDeviation detection source, FN-08 MQTT publish pattern)
- FEAT-006 spec (FN-03 dock conflict detection source)
- FEAT-007 spec v3 (FN-11 deduplicateBehaviorEvents — dedup pattern)
- ROADMAP Phase 1.1 + Feature Wishlist Coverage Matrix (FEAT-010 sıradaki pilot işaretlemesi)
- NotebookLM session 2026-05-30 (1 prompt, 9/10 skor, prompt kısaltılmış)
- **v1.3 kaynağı:** `tulipfleet-dispatcher/docs/ARCHITECTURE_DECISION_task-management-api-driven.md` (Faz 4, `internalBridge.js:sendPushNotification` deseni, commit `f4536a7`, 2026-07-18)

---

## 12. Change Log

| Version | Date | Author | Change |
|---|---|---|---|
| 1 | 2026-05-30 | Cem Sahinkaya (with Claude + NotebookLM cowork) | İlk konsolide function spec. Onuncu pilot — automated exception handling, wishlist W8 (atlanmıştı, ROADMAP Coverage Matrix güncellemesi sonrası sıraya alındı). **Yeni paradigma: Orkestratör feature** — 4-5 FEAT'in detection'ını consume edip action'ına route ediyor. 15 fonksiyon (FN-01..FN-15), Phase 1: 14, Phase 2: 1 (executeAutoResolution Mode 2 trigger). ML disipline check ADR-0010 §3.3 + §3.4 + §4 birebir uyumlu — "AI agent" terminolojisi sızmadı, rule-based detection Phase 1, policy-based action Phase 2, anomaly detection Phase 3+. Konsolidasyon eklemeleri: (a) FN-05 monitorComplianceZones (ADR-0012 §4 zone breach prediction — 5. detection monitor), (b) FN-07 deduplicateException (FEAT-007:FN-11 paterni, 10 dk cooldown), (c) §4 Severity classification matrix (deterministic, threshold-based — ML değil), (d) FN-11 audit trail fields detaylandı (resolved_at, resolved_by, resolution_type, resolution_action, resolution_comment). FN-01 alıntı düzeltmesi — ADR-0005 §5.2 parafraz birleşimi → 4 tip enum (No match / Ambiguous match / Rule violation / High-impact event). Schema kararı: `enterprise.exception_events` TimescaleDB hypertable (FEAT-007:behavior_events paterniyle simetrik), 90 gün retention, dedup index. Per-company override: `public.companies.settings.exception_thresholds` JSONB. NotebookLM kalite trend: §number fabrikasyon = 0 ✅ (F9 §188 hatasından toparlandı). Kısaltılmış prompt kaliteyi etkilemedi — temel disiplinler (ML, ADR ref, Phase ayrımı) korundu. |
| 1.1 (cross-spec sync) | 2026-05-30 | Cem Bakir + Claude | Cross-spec sync — 5 yeni exception_type enum (`locker_pickup_expired` FEAT-017:FN-12, `tender_withdrawn` FEAT-014:FN-13, `tender_no_quotes` FEAT-014:FN-04, `returns_pickup_failed` FEAT-018:FN-13, `rts_warehouse_unreachable` FEAT-018:FN-08). §4 Severity matrix 5 yeni entry. §2 FN-06 logExceptionEvent shared kolonuna FEAT-014, 017, 018 eklendi. Schema değişikliği additive (CHECK constraint ALTER) — Phase 1 production deployment için forward-compatible (eski 5 enum aynen kalır). FEAT-017 + FEAT-014 + FEAT-018 spec'lerindeki cross-spec sync TODO'lar kapatıldı. |
| 1.2 (mega cross-spec sync) | 2026-05-30 | Cem Bakir + Claude | **Mega cross-spec sync — 6 yeni exception_type enum** (`invoice_discrepancy` FEAT-015:FN-05, `invoice_audit_deadline_expired` FEAT-015:FN-08, `rest_violation` FEAT-019:FN-07, `border_crossing_compliance_breach` FEAT-019:FN-12, `range_anxiety_breach` FEAT-103:FN-07, `csrd_data_quality_breach` FEAT-106:FN-05). §4 Severity matrix +11 yeni entry (bazı exception type'lar 2 severity seviye için). §2 FN-06 logExceptionEvent shared kolonu güncellendi (7 spec consumer: F014/015/017/018/019/103/106). Toplu commit önceki sync üstüne kümülatif — exception_type CHECK constraint mevcut 10 enum'a +6 (toplam 16). Schema değişikliği additive, forward-compatible. F015+F019+F103+F106 cross-spec TODO'lar kapatıldı. 17 pilot toplam, 11+ cross-spec sync tamamlandı. |
| **1.3 (Cem'in mühendislik incelemesi)** | **2026-07-18** | **Cem Sahinkaya + Claude** | **Cem'in 5 gözcüyü tek tek eleştirel okuyup 3 gerçek boşluk tespit etmesi üzerine 2 yeni fonksiyon + 1 mevcut fonksiyonun ayrıştırılması.** (1) **FN-16 requestDelayReasonFromDriver (YENİ):** ETA gecikmesi tespit edilip HERE trafik verisi temizse ("önlenemez durum"), sürücüye push/modal ile sebep sorulur (Arıza/Kaza/Hava Şartları/Diğer) — `tulipfleet-backend/routes/internalBridge.js:sendPushNotification` (Faz 4, `f4536a7`) deseniyle aynı Expo Push mekanizması kullanılır. §1.7'de "AI kullanmadan akıllı davranış" prensibi belgelendi. (2) **FN-03 monitorDriverPresence iki alt-senaryoya ayrıldı:** `driver_offline` (MQTT telemetri sessizliği — uygulama hiç açılmamış) vs `driver_location_mismatch` (telemetri akıyor ama konum geofence dışı — uygulama açık, yanlış yerde). Önceki tek "driver_no_show" etiketinin bu iki farklı gerçek durumu ayırt edemediği tespit edildi (§3.3). exception_type CHECK constraint'e 2 yeni değer eklendi (schema additive, forward-compatible). (3) **FN-17 prepareDockNotificationTemplate (YENİ):** Dock çakışması tespit edilince otomatik bildirim şablonu hazırlanır, dispatcher'a "onayla ve gönder" seçeneği ResolutionActionPanel'de sunulur (Mode 1 Advisory disiplinine uygun — sistem hazırlar, insan onaylar). Gerçek otomatik gönderim altyapısı (SendGrid/Mailgun) hâlâ Phase 2'de — §1.5'teki mevcut kapsam-dışı kararına dokunulmadı, sadece şablon üretimi Phase 1'e alındı. **Yeni §1.6** planlama-vs-canlı-izleme sorumluluk ayrımını belgeliyor (Cem'in ZE-Zone tespiti: asıl önleme FEAT-001:FN-012'de planlama aşamasında, FN-05 sadece yedek katman — mimari zaten bu şekilde kuruluydu, v1.3 *neden* doğru olduğunu açıklığa kavuşturdu). UNCERTAINTIES #1 kapatıldı, #2 kısmen genişletildi (aksiyon tanımlandı), #3 kısmen çözüldü (insan-girdili fallback). 3 yeni UNCERTAINTIES açıldı (#11 FN-16 timeout, #12 FN-17 çok-dillilik, #13 driver_offline+push çelişkisi). Toplam fonksiyon: 15 → **17**. Bu revizyon bir NotebookLM pilotu değil — Cem'in fonksiyon fonksiyon eleştirel okumasıyla üretildi, §9.3'e bu model farkı not düşüldü. |
