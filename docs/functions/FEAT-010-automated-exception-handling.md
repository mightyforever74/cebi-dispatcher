# FEAT-010 — Automated Exception Handling

| Field | Value |
|---|---|
| **Feature ID** | FEAT-010 |
| **Source** | Wishlist W8 — "Automated Exception Handling" (atlanmıştı, ROADMAP Coverage Matrix 2026-05-30 güncellemesi sonrası önceliklendirildi) |
| **Frequency rating** | Common |
| **Cem note** | — (wishlist'te ek not yok) |
| **Tulipfleet Phase** | Phase 1 (rule-based detection + Mode 1 Advisory notification) + Phase 2 (FEAT-101 Mode 2 Exception-based auto-action) |
| **Status** | Function spec drafted via NotebookLM (1 prompt, 2026-05-30); **v1.3'te Cem'in mühendislik incelemesiyle 3 fonksiyon eklendi/genişletildi**; **v1.4'te "sıfır iş gücü" UI davranışları netleştirildi**; **v1.5'te yanlış-pozitif önleme (debounce + GPS tamponu) eklendi (2026-07-18)**; **v1.6'da UNCERTAINTIES #16-18 kapatıldı + iki yeni girdi eklendi: temporal "KAÇIRIR" planlama-anı köprüsü (§1.6) ve tek-aktif-görev 409 hata sözleşmesi (§3.6) (2026-07-28)**; **v1.7'de ML-analiz veri temeli eklendi: karar logu + override nedeni + sefer özetleri (§1.8, §6.4-6.5) (2026-07-29)** |
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

**v1.3 mühendislik incelemesi doğrulaması (2026-07-18):** Cem'in sorduğu "AI tabanlı yapmamakla hata mı ettik?" sorusuna spec'in kendi cevabı: **hayır.** Aşağıdaki üç ekleme (FN-16 sürücüye soru sorma, FN-03 iki-senaryo ayrımı, FN-17 şablon hazırlama) **hiçbiri ML/AI kullanmaz** — hepsi deterministic kural + insan (sürücü veya dispatcher) girdisi ile çözülür.

**v1.4 "sıfır iş gücü" prensibi (2026-07-18):** Sadece exception tipini ayırmak yetmez, her tipin dispatcher'a **hiçbir ekstra manuel adım gerektirmeyen** somut bir aksiyon sunması gerekir. Bkz. §3.3.1.

**v1.5 "yanlış pozitif önleme" prensibi (2026-07-18):** Cem'in üçüncü turdaki gözlemi bir kademe daha derine indi — doğru exception tipini doğru aksiyonla eşleştirmek yetmez, **exception'ın kendisinin gerçek olduğundan emin olunmalı.** Kısa süreli MQTT bağlantı kopmaları (tünel, zayıf şebeke) ve GPS'in doğal ölçüm sapması (jitter), gerçek bir sorun yokken alarm üretip dispatcher'ın ekranını spam'e boğabilir. v1.5, deteksiyonun **kendisine** iki tolerans katmanı ekliyor — bkz. §3.3.2.

### 1.3 İş mantığı

```
5 paralel detection monitor (Phase 1):
   1. ETA deviation (FEAT-005:FN-04 üzerine) — trafik varsa alternatif rota,
      yoksa sürücüye sebep sorulur (FN-16, v1.3 EKLENDİ)
   2. Traffic impact (FEAT-002:FN-10 trafficTriggerDetector)
   3. Driver no-show (v1.3'te iki alt-senaryoya ayrıldı: offline vs location-mismatch;
      v1.4'te her ikisi için de "sıfır iş gücü" dispatcher aksiyonu tanımlandı;
      v1.5'te her ikisine de yanlış-pozitif önleme tamponu eklendi)
   4. Dock appointment slip (FEAT-006:FN-03 conflict) — v1.3'te otomatik
      şablon hazırlama eklendi (FN-17, gönderim hâlâ Phase 2)
   5. Compliance zone breach imminent (ADR-0012 §4 — KONSOLIDASYONDA EKLENDİ;
      v1.3'te planlama-aşaması önceliği netleştirildi, bkz. §1.6)
        │
        ▼ Threshold karşılanırsa (v1.5: debounce/tampon SONRASI)
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
        │                    + <ResolutionActionPanel /> (FN-14, v1.4: exception_type'a
        │                      göre özelleşmiş, "sıfır iş gücü" aksiyon butonları)
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
- **Phase 1 (v1.4 EKLENDİ): Her iki alt-senaryo için "sıfır iş gücü" dispatcher aksiyonu** — `driver_offline` için tek-tık push/arama, `driver_location_mismatch` için mevcut Live Fleet Map'e otomatik odaklanma
- **Phase 1 (v1.5 EKLENDİ): Yanlış-pozitif önleme** — MQTT disconnect debounce'u (kısa şebeke kesintilerini filtreler) + GPS jitter tamponu (konum ölçüm sapmasını filtreler)
- **Phase 1 (v1.3 EKLENDİ): Dock çakışması için otomatik bildirim şablonu hazırlama** (gönderim değil, dispatcher onayına sunma)
- **Phase 1 (v1.6 EKLENDİ): Sürücü-taraflı hata sözleşmesi — tek-aktif-görev 409'u** (bkz. §3.6; 500 yerine anlaşılır 409 Conflict)
- Phase 2: Policy-based auto-action (Mode 2 Exception)
- Phase 2: Grace period revert window
- Audit trail (resolved_at, resolved_by, resolution_type, comment)

### 1.5 Kapsam — dışarıda

- **ML-based anomaly detection** — Phase 3+ (ADR-0010 §3.3, §3.5)
- **"AI agent" carrier contact (LLM-driven outreach)** — Phase 3+
- **Mode 3 Agentic auto-decision** — Phase 3 ADR pending
- **Predictive failure detection** — FEAT-024 Phase 2 (ayrı feature, ML-bazlı)
- **Email/SMS otomatik GÖNDERİMİ** — Phase 2+ (mevcut backend pattern yok, UNCERTAINTIES #6). **v1.3 netleştirmesi:** Şablon **hazırlama** ve dispatcher panelinde **gösterme** Phase 1'de var (FN-17) — dispatcher'ın "onayla ve gönder" dediği an gerçekleşecek otomatik gönderim altyapısı (SendGrid/Mailgun entegrasyonu) hâlâ Phase 2'de.
- **Hava durumu tabanlı otomatik ETA ayarlaması (FEAT-005-EXT)** — ayrı spec yazılana kadar kapsam dışı. **v1.3 kısmi çözüm:** FN-16 ile sürücüye doğrudan sorularak bu boşluk Phase 1'de dolduruluyor.
- **Otomatik telefon araması (gerçek bir çağrı başlatma)** — Phase 1'de sadece `tel:` link, otomatik/sunucu-taraflı çağrı sistemi (Twilio vb.) kapsam dışı (v1.4 EKLENDİ, bkz. §3.3.1).
- **Adaptif/öğrenen debounce ve GPS tamponu** — v1.5'teki eşikler (5 dk, 20m — v1.6'da onaylandı) **statik**, per-company config'ten değiştirilebilir ama sistem kendi kendine öğrenip ayarlamıyor (bu ML olurdu, ADR-0010 disiplinine aykırı). Sabit kurallar, gerekirse Cem manuel ayarlar.

### 1.6 Mimari netleştirme — planlama vs canlı izleme sorumluluk ayrımı (v1.3 EKLENDİ, v1.6'da genişletildi)

Cem'in mühendislik incelemesi kritik bir mimari netleştirme sağladı: **FEAT-010'daki 5 monitörün ikisi (ETA, compliance) aslında iki farklı "an"da çalışan, farklı sorumlulukları olan mekanizmalardır — bunları karıştırmamak gerekir.**

- **Compliance zone breach (FN-05):** Asıl önleme **planlama aşamasında** olur — `FEAT-001:FN-012 checkCompliance`, VRP rotası oluşturulurken muafiyeti olmayan araçlar için ZE-Zone'ları HERE'nin `avoid areas` listesine ekler, rota **zaten oradan geçmeyecek şekilde** çizilir. FEAT-010:FN-05, bunun üzerine binen bir **ek güvenlik katmanı** — sadece sürücü planlanan rotadan kendi kararıyla saparsa diye.
- **ETA deviation (FN-01):** Asıl "önleme" burada mümkün değil (gecikme zaten oluşmuş) — bu yüzden FEAT-010'un görevi önlemek değil, **doğru bilgiyi doğru hızda toplamak.** v1.3, bunu iki dala ayırarak netleştiriyor: makine tespit edebildiğini (trafik) otomatik çözer, tespit edemediğini (arıza, hava) insana (sürücüye) sorar — bkz. §1.7.
- **Temporal "KAÇIRIR" feasibility sinyali (v1.6 EKLENDİ):** Aynı ayrımın üçüncü örneği, **canlıya çıkmış bir proto-exception feed'i.** Karar Destek Motoru'nun `temporalScorer`'ı (dispatcher repo, DSE Phase 1, 2026-07-20 canlı), görev daha **atanmadan** — yani planlama anında — `time_window_end`'e yetişemeyecek araçları tespit edip skor cezası + "KAÇIRIR ~N dk" memo'su üretiyor. Bu, FN-01'in (canlı izleme, gecikme OLUŞTUKTAN sonra) **planlama-aşaması ikizidir**: aynı VRPTW feasibility matematiği, farklı "an". FEAT-010 Phase 1 implementasyonunda FN-01, temporalScorer'ın eşik/ETA mantığını yeniden icat etmek yerine onunla hizalanmalı (bugün haversine+60km/h varsayımı; ADR-0014 gerçek HERE ETA'sı geldiğinde İKİSİ BİRDEN aynı kaynağa geçer). Dispatcher'ın planlama anında görmezden geldiği bir "KAÇIRIR" uyarısı, görev atandıktan sonra FN-01'in ilk adayıdır — iki katman arasındaki bu süreklilik, exception'ın "sürpriz" değil "öngörülmüş risk" olarak ele alınmasını sağlar.

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
        │                                     kapsamı — FEAT-002 alternatif rota önerir.
        │
        └─── HAYIR (yol temiz görünüyor) ──▶ Sistem bunu "önlenemez durum" olarak
                                              sınıflandırır. FN-16 tetiklenir.
```

### 1.8 ML-analiz veri temeli — karar logu, override nedeni, sefer özetleri (v1.7 EKLENDİ, 2026-07-29)

**ADR-0010 disiplini korunuyor:** Bu bölüm spec'e ML EKLEMEZ. ADR-0010 §3.3 uyarınca ML-tabanlı analiz Phase 3 adayıdır ve "consume yes, build no" ilkesi geçerlidir. Buradaki üç kalem, o katmanın (planned-vs-actual analizi, override analizi, feature importance, zorlanılan-senaryo kümeleme) İLERİDE tüketeceği veriyi BUGÜNDEN biriktiren saf loglama/özetleme altyapısıdır. Model eğitimi, anomaly detection, öğrenilmiş ağırlık — hiçbiri bu spec'in kapsamında değildir.

**Neden FEAT-010'da ve neden ŞİMDİ (üç kanıta dayalı gerekçe):**

1. **`public.locations` retention 7 gün** (TimescaleDB `add_retention_policy('locations', '7 days')` — canlı prod politikası). Görev kapanışında sefer özeti mühürlenmezse, FN-01'in kalibre edilmesi için gereken planned-vs-actual verisi kalıcı olarak yok oluyor. Bugün başlamayan birikim, yarın telafi edilemez.
2. **Grup B kısıtları (time_window, direction, location_type) HİÇBİR yerde kalıcı değil** (Strateji 3 — yalnızca frontend-state, DSE session notes kanıtı). Karar logu, bu kısıtların TEK kalıcı kaydı olur; aksi hâlde "dispatcher hangi zaman penceresi bilgisiyle karar verdi" sorusu geriye dönük cevaplanamaz.
3. **Override sinyali bugün doğal üretiliyor ama kaybediliyor:** DSE scorer sıralaması karar destektir, atamayı DEĞİŞTİRMEZ (bilinçli parite). "Scorer #1 önerdi, dispatcher #3'ü seçti" bilgisi her approve'da mevcut — loglanmadığı için buharlaşıyor. Bu sinyal hem FEAT-010'un exception politika kalibrasyonunun hem de Phase 3 ML analizinin ana girdisidir.

**Üç kalem:**

| Kalem | Ne | Nereye | Kim yazar |
|---|---|---|---|
| Karar logu | Approve anında scorer sıralaması + kısıt snapshot'ı + dispatcher'ın gerçek seçimi | `enterprise.dispatch_decision_log` (§6.4) | FN-18 (frontend'den best-effort POST) |
| Override nedeni | `chosen ≠ recommended` ise tek dropdown | Karar logunun `override_reason` kolonu | FN-20 dialog → FN-18 |
| Sefer özetleri | Görev kapanışında planned-vs-actual + ADXL345 olay sayıları, retention'dan ÖNCE | `enterprise.trip_summaries` (§6.5) | FN-19 worker (UNCERTAINTIES #19) |

**"Best-effort" ilkesi (FN-16 push paterniyle aynı):** Karar logu INSERT'i approve akışını ASLA bloke etmez — log başarısız olsa bile approve tamamlanır (no-throw). Loglama, operasyonun önüne geçemez.

---

## 2. Function catalog

| # | Function ID | Layer | Signature / Endpoint | Inputs | Outputs | Reads from | Writes to | External deps | ADR ref (alıntılı) | Phase | Shared with FEAT-001..9 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FEAT-010-FN-01 | worker | `monitorEtaViolations` | taskId, threshold | Exception? | enterprise.dispatch_tasks | enterprise.exception_events | HERE Routing | ADR-0005 §5.2 — "Exception types: No match / Ambiguous match / Rule violation / High-impact event" (4 tip enum) | 1 | **FEAT-005:FN-04** calculateEtaDeviation; **v1.6: DSE temporalScorer (planlama-anı ikizi, §1.6)** |
| 2 | FEAT-010-FN-02 | worker | `monitorTrafficImpacts` | routeId | Exception? | enterprise.routing_jobs | enterprise.exception_events | HERE Traffic | ADR-0011 §6 — FEAT-104 (Trafik-triggered re-routing) | 1 | **FEAT-002:FN-10** trafficTriggerDetector |
| 3 | FEAT-010-FN-03 | worker | `monitorDriverPresence` (**v1.3'te iki alt-mantığa ayrıldı, v1.5'te debounce+GPS tamponu eklendi, bkz. §3.3**) | driverId, taskId | Exception? (`driver_offline` \| `driver_location_mismatch`) | public.locations, enterprise.dispatch_tasks, MQTT son telemetri zaman damgası, MQTT disconnect event | enterprise.exception_events | — | UNCERTAINTIES #1 (v1.3'te cevaplandı — bkz. §8) | 1 | — |
| 4 | FEAT-010-FN-04 | worker | `monitorDockConflicts` | facilityId, window | Exception? | enterprise.dock_appointments | enterprise.exception_events | — | ADR-belirsiz (dock slip warning — UNCERTAINTIES #2) | 1 | **FEAT-006:FN-03** refreshTaskEtas |
| 5 | FEAT-010-FN-05 | worker | `monitorComplianceZones` (**KONSOLIDASYONDA EKLENDİ**) | vehicleId, currentLocation | Exception? | enterprise.nl_compliance_zones, public.locations | enterprise.exception_events | HERE Routing (predicted path) | ADR-0012 §4 — zone breach prediction discipline | 1 | **FEAT-001:FN-012** compliance check (asıl önleme burada — bkz. §1.6) |
| 6 | FEAT-010-FN-06 | backend | `logExceptionEvent` | eventData | { eventId } | — | enterprise.exception_events | — | ADR-0005 §5.3 — "If rules trigger an exception, system marks the task `needs_dispatcher` and notifies the dispatcher." | 1 | **FEAT-014** (FN-04, FN-13), **FEAT-015** (FN-05, FN-08), **FEAT-017** (FN-12), **FEAT-018** (FN-08, FN-13), **FEAT-019** (FN-07, FN-12), **FEAT-103** (FN-07), **FEAT-106** (FN-05) — 7 spec consumer, mega cross-spec sync 2026-05-30 |
| 7 | FEAT-010-FN-07 | shared_library | `deduplicateException` (**KONSOLIDASYONDA EKLENDİ**) | rawException, cooldownMinutes | Exception? | enterprise.exception_events (son 10 dk) | — | — | FEAT-007:FN-11 deduplicateBehaviorEvents paterni | 1 | **FEAT-007:FN-11** (dedup pattern) |
| 8 | FEAT-010-FN-08 | backend | `evaluateExceptionPolicy` | exceptionId | Decision | public.companies (dispatch_mode), enterprise.exception_events | — | — | ADR-0005 §7 | 1 (stub) | **FEAT-003:FN-08** policyModule |
| 9 | FEAT-010-FN-09 | backend | `notifyDispatcherException` | exceptionId | void | enterprise.exception_events | — | EMQX MQTT | ADR-0009 §8 | 1 | — |
| 10 | FEAT-010-FN-10 | backend | `GET /api/dispatcher/exceptions` | company_id, status, severity? | Exception[] | enterprise.exception_events | — | — | ADR-0011 §9.5 | 1 | — |
| 11 | FEAT-010-FN-11 | backend | `POST /api/dispatcher/exceptions/:id/resolve` | id, action, comment, **resolved_by (JWT.user_id)** | Success | enterprise.exception_events | enterprise.exception_events (audit fields), public.tasks (optional) | — | ADR-0005 §4.1 | 1 | **FEAT-001:FN-013** approve pattern |
| 12 | FEAT-010-FN-12 | frontend | `<ExceptionToast />` | alertData | UI Component | — | — | — | ADR-0001 §3.6 — Notistack | 1 | — |
| 13 | FEAT-010-FN-13 | frontend | `<ExceptionStatusPanel />` | filterStatus | UI Component | enterprise.exception_events | — | — | ADR-0001 §3.6 — React Table | 1 | — |
| 14 | FEAT-010-FN-14 | frontend | `<ResolutionActionPanel />` (**v1.3+v1.4 genişletildi, bkz. §3.3.1**) | exceptionId, exceptionType | UI Component | enterprise.exception_events.detection_payload, public.drivers.phone (v1.4) | — | — | ADR-0001 §3.6 | 1 | **v1.4: mevcut Live Fleet Map `focusPlate` mekanizması** |
| 15 | FEAT-010-FN-15 | worker | `executeAutoResolution` | exceptionId | Result | enterprise.exception_events | enterprise.dispatch_tasks, enterprise.exception_events (status=auto_handled) | HERE Tour Planning | ADR-0005 §5.3 | 2 | **FEAT-002:FN-02** POST /replan |
| 16 | FEAT-010-FN-16 | backend + frontend (mobile) | `requestDelayReasonFromDriver` (**v1.3 EKLENDİ**) | taskId, driverId, delayMinutes | void (push gönderir) | enterprise.exception_events | enterprise.exception_events.detection_payload (driver_response) | Expo Push API | Bu spec'in kendi kararı (§1.7) | 1 | `tulipfleet-backend/routes/internalBridge.js:sendPushNotification` (Faz 4, `f4536a7`; **v1.6: A2 `72d21f6` derivedTitle ile aynı köprü — staging'de uçtan uca kanıtlı**) |
| 17 | FEAT-010-FN-17 | backend | `prepareDockNotificationTemplate` (**v1.3 EKLENDİ**) | exceptionId, delayMinutes, dockContactInfo | { template: string } | enterprise.dispatch_tasks, enterprise.dock_appointments | enterprise.exception_events.detection_payload (template) | — | Bu spec'in kendi kararı (§3.5) | 1 (hazırlama) / 2 (gönderim) | — |
| 18 | FEAT-010-FN-18 | backend | `POST /api/dispatcher/decision-log` (**v1.7 EKLENDİ**) | routing_job_id, dispatch_task_id, scorer_snapshot, constraints_snapshot, recommended_vehicle_id, chosen_vehicle_id, override_reason?, **decided_by (JWT.user_id)** | { logId } | — | enterprise.dispatch_decision_log | — | ADR-0010 §3.3 — ML-analiz veri temeli, ML DEĞİL (§1.8) | 1 | **DSE scoring registry** (dispatcher repo, `rankVehicles` çıktısı payload'ın kaynağı); best-effort no-throw paterni FN-16 push ile aynı |
| 19 | FEAT-010-FN-19 | worker | `buildTripSummary` (**v1.7 EKLENDİ**) | taskId | Summary? | public.tasks, public.locations, public.alerts (SELECT-only — rol sınırı korunur) | enterprise.trip_summaries | — | ADR-0010 §3.3 (§1.8); UNCERTAINTIES #19 (yazma sorumluluğu) | 1 | **FEAT-005** planned-vs-actual tüketicisi; **FEAT-007** ADXL345 olay sayıları |
| 20 | FEAT-010-FN-20 | frontend | `<OverrideReasonDialog />` (**v1.7 EKLENDİ**) | recommendedVehicleId, chosenVehicleId | UI Component (reason → FN-18 payload'ına) | — | — | — | ADR-0001 §3.6; UNCERTAINTIES #20 (enum + zorunluluk) | 1 | Approve akışına eklenir (FEAT-001:FN-013 approve pattern) |

**Konsolidasyon notları (özet, tam tarihçe v1.4'te):** FN-05 + FN-07 konsolidasyonda eklendi; FN-16 + FN-17 v1.3'te eklendi; FN-14 v1.4'te "sıfır iş gücü" davranışına genişletildi; **v1.5'te yeni fonksiyon eklenmedi, FN-03'ün iç mantığı (§3.3.2) genişletildi; v1.6'da yeni fonksiyon eklenmedi — FN-01'e temporalScorer hizalaması, FN-16'ya kanıtlı köprü referansı işlendi + §3.6 hata sözleşmesi eklendi; v1.7'de 3 yeni fonksiyon eklendi (FN-18 karar logu, FN-19 sefer özeti worker'ı, FN-20 override nedeni dialogu) — üçü de ML-analiz veri temeli, exception pipeline'ından bağımsız (§1.8).**

---

## 3. Exception event pipeline — uçtan uca

### 3.1 Detection → Notification akışı (Phase 1, Mode 1 Advisory)

```
5 paralel monitor (5-15 saniye polling veya event-driven)
   │
   ├── FN-01 monitorEtaViolations
   ├── FN-02 monitorTrafficImpacts
   ├── FN-03 monitorDriverPresence (v1.3: iki alt-dal; v1.5: debounce+GPS tamponu, bkz. §3.3)
   ├── FN-04 monitorDockConflicts
   └── FN-05 monitorComplianceZones
        │
        ▼ Detection threshold karşılanırsa (v1.5: tampon/debounce SONRASI)
   logExceptionEvent (FN-06) → severity hesapla → INSERT enterprise.exception_events
        │
        ▼
   deduplicateException (FN-07) — 10 dk cooldown
        │
        ▼
   evaluateExceptionPolicy (FN-08) — Phase 1: her zaman "advisory"
        │
        ▼
   notifyDispatcherException (FN-09) → ExceptionToast (FN-12)
        │
        ▼
   ExceptionStatusPanel (FN-13) → ResolutionActionPanel (FN-14)
        │
        ▼
   POST /api/dispatcher/exceptions/:id/resolve (FN-11)
```

### 3.2 Phase 2 — Auto-resolution akışı (Mode 2 Exception-based)

*(v1.4'ten değişmedi, bkz. önceki versiyon — Phase 2 kapsamı)*

### 3.3 FN-03 monitorDriverPresence — iki alt-senaryo (v1.3 EKLENDİ, 2026-07-18)

Orijinal spec tek bir geofence-mesafe kontrolü öneriyordu, ama bu iki farklı gerçek durumu ayırt edemiyordu. v1.3 iki dala ayırdı:

```
Görev başlama saati geldi (task.scheduled_start)
        │
        ├─── Durum A: MQTT/telemetri sessizliği ──▶ exception_type: 'driver_offline'
        └─── Durum B: Telemetri akıyor, konum uyumsuz ──▶ exception_type: 'driver_location_mismatch'
```

#### 3.3.1 "Sıfır iş gücü" dispatcher aksiyonları (v1.4 EKLENDİ, 2026-07-18)

| Exception Tipi | ResolutionActionPanel'de (FN-14) görünen aksiyon |
|---|---|
| `driver_offline` | "Uyandırma Bildirimi Gönder" (FN-16) + `tel:{phone}` linki |
| `driver_location_mismatch` | Focus-on-Map entegrasyonu (Sıra 5.4 deseni) |

*(Tam detay ve gerekçe önceki versiyonda korunuyor.)*

#### 3.3.2 Yanlış-pozitif önleme — debounce ve GPS tamponu (v1.5 EKLENDİ, v1.6'da değerler onaylandı)

**Sorun 1 — MQTT disconnect spam'i:**

Cem'in uyarısı: *"MQTT telemetrisi o an kesildi diye hemen adam çevrimdışı alarmı basma. Kısa süreli şebeke kopmaları yüzünden dispatcher'ın ekranı spam alarm dolmasın."*

Sürücü bir tünele girdiğinde veya zayıf 3G bölgesinde MQTT bağlantısı birkaç saniyeliğine kopabilir. v1.3'ün "15 dakika sessizlik" eşiği bu kısa kesintileri zaten büyük ölçüde filtreliyordu (15 dakika, birkaç saniyelik bir kopmadan çok daha uzun) — **ama v1.5, bunun önüne ayrı, daha erken devreye giren bir katman ekliyor: MQTT'nin kendi "disconnect" event'ine (broker seviyesinde, LWT/Last-Will mekanizmasıyla anlık olarak tetiklenen bir sinyal) karşı bir debounce.**

```
MQTT broker "client disconnected" event'i üretir (ANLIK, saniyeler içinde)
        │
        ▼
Sistem HEMEN exception ÜRETMEZ — bir "debounce timer" başlatır
(5 dakika — v1.6'da ONAYLANDI, eski UNCERTAINTIES #16)
        │
        ├─── Timer süresi İÇİNDE yeni telemetri/reconnect gelirse ──▶ Timer iptal,
        │                                                              hiçbir exception
        │                                                              üretilmez.
        │
        └─── Timer DOLARSA (gerçekten 5 dk boyunca veri gelmezse) ──▶ Bu noktadan
                                                                        itibaren normal
                                                                        §3.3'teki
                                                                        "driver_offline"
                                                                        akışı başlar
                                                                        (15 dk sessizlik
                                                                        eşiği buradan
                                                                        sayılmaya devam
                                                                        eder).
```

**Önemli ayrım — bu, dedup (FN-07) ile karıştırılmamalı:** FN-07 zaten **açık bir exception'ın tekrar tekrar açılmasını** önlüyor (10 dk cooldown). Bu yeni debounce mekanizması ise **exception'ın ilk kez açılmasını** geciktiriyor — farklı bir amaca hizmet eden, ayrı bir katman. İkisi birlikte çalışır: önce debounce (exception hiç açılmasın mı?), sonra dedup (açıldıysa, tekrar tekrar açılmasın).

**Sorun 2 — GPS jitter (ölçüm sapması):**

Cem'in uyarısı: *"GPS cihazları veya telefonlar bazen bulutlu havada veya yüksek binaların arasında konumunu 10-20 metre sapan absürt koordinatlar olarak fırlatır. Sürücü aslında deponun kapısındadır ama GPS bir anlık 30 metre dışarıda gösterdi diye dispatcher'ın önüne alarm düşürme."*

v1.3'ün `driver_location_mismatch` eşiği "geofence yarıçapı 100m" idi — bu, **GPS'in doğal ölçüm hatasını hiç hesaba katmıyordu.** v1.5, geofence yarıçapına bir tolerans tamponu ekliyor:

```
Efektif eşik = geofence_yarıçapı (100m, task/depo bazlı) + gps_tolerans_tamponu (+20m — v1.6'da ONAYLANDI, global)
             = 120m (varsayılan senaryoda)

Sürücünün GPS koordinatı, geofence merkezine olan mesafe:
        │
        ├─── ≤ 120m ──▶ "GPS titremesi" sayılır, alarm ÇALMAZ
        │               (sürücü muhtemelen gerçekten oradadır, GPS yanılıyor)
        │
        └─── > 120m ──▶ Gerçek bir sapma kabul edilir, driver_location_mismatch
                         exception'ı normal şekilde açılır (§4 Severity matrix'teki
                         zaman eşikleri — 0-15/15-30/>30dk — buradan itibaren sayılır)
```

**Not — tampon, geofence yarıçapının yerine geçmiyor, üstüne ekleniyor:** Her task/depo'nun kendi geofence yarıçapı olabilir (100m varsayılan, bazı müşteriler için farklı olabilir) — GPS tamponu bu yarıçapa **ek olarak** uygulanan sabit bir pay, geofence'in kendisini değiştirmiyor.

**Neden bu iki mekanizma önemli:** İkisi de aynı prensibi uyguluyor — ADR-0010'un "no learning, deterministic rules" disiplinine tam uyumlu, basit ama saha gerçeğini yansıtan eşik ayarlamaları. ML veya "akıllı" bir tahmin motoru gerekmiyor, sadece doğru büyüklükte sabit bir tolerans payı.

### 3.4 FN-16 requestDelayReasonFromDriver — akış detayı (v1.3 EKLENDİ)

*(v1.4'ten değişmedi — bkz. önceki versiyon. v1.6 notu: FN-16'nın dayandığı push altyapısı artık varsayım değil — internalBridge.js `sendPushNotification` staging düzleminde uçtan uca fiziksel kanıtlı, A2 kapanışı `72d21f6`, bkz. SESSION_NOTES_decision-support-engine.md.)*

### 3.5 FN-17 prepareDockNotificationTemplate — akış detayı (v1.3 EKLENDİ)

*(v1.4'ten değişmedi — bkz. önceki versiyon)*

### 3.6 Sürücü-taraflı hata sözleşmesi — tek-aktif-görev 409'u (v1.6 EKLENDİ, 2026-07-28)

**Saha bulgusu (A2 test turu, 2026-07-28):** Sürücü, aktif bir `in_progress` görevi varken ikinci bir göreve "Başla" dediğinde backend **500 Internal Server Error** döndürüyor. Oysa bu bir sistem hatası değil, **bilinen bir iş kuralının ihlali** — mobil tarafta kural zaten tanımlı (`DriverTasks.js:803-805`: aynı anda yalnızca 1 `in_progress` olabilir). Cem'in sahada yaşadığı deneyim: "usul hatası yapmışım" — ama sistemin verdiği mesaj "sistem bozuk" diyordu.

**Prensip:** Exception handling yalnızca dispatcher'a olay bildirmek değildir; **hatanın doğasını doğru HTTP semantiğiyle ve anlaşılır dille iletmek** de bu spec'in ruhuna dahildir. Kural ihlali ≠ sunucu çökmesi.

**Sözleşme:**

| Durum | Bugünkü davranış | Hedef davranış |
|---|---|---|
| Aktif `in_progress` görev varken `PUT /api/driver/tasks/:id/start` | 500 Internal Server Error | **409 Conflict** + `{ error: "Conflict", message: "Aktif bir göreviniz var (TLP-XX-XXXXX). Yeni göreve başlamadan önce mevcut görevi tamamlayın veya geri çekin.", active_task_no: "..." }` |

- Mobil taraf 409'u yakalayıp kullanıcıya aktif görev numarasıyla anlaşılır bir uyarı gösterir (mevcut Alert deseni yeterli, yeni UI gerekmiyor).
- **Uygulama yeri:** `tulipfleet-backend` `/api/driver/tasks/:id/start` handler'ı (staging'de doğrulanıp code-freeze penceresinde prod'a). Bu, FEAT-010'un dispatcher-taraflı pipeline'ından bağımsız, küçük ve erken yapılabilir bir kalem — Phase 1 backlog'una eklendi (§10.2).
- **Genelleme notu:** Aynı ilke gelecekte diğer iş-kuralı ihlallerine de uygulanır (örn. tamamlanmış görevi geri çekme) — her biri 4xx + anlaşılır mesaj, asla 500.

---

## 4. Severity classification matrix

**v1.5 notu:** Aşağıdaki zaman eşikleri (örn. "Driver offline 0-15 dk grace"), §3.3.2'deki debounce/tampon mekanizmalarının **sonrasında** sayılmaya başlar — yani "0 dk" noktası, debounce timer'ının dolduğu (gerçek offline'ın teyit edildiği) an, MQTT disconnect event'inin geldiği an değil. Benzer şekilde, `driver_location_mismatch` için "mesafe" artık efektif eşiği (geofence + GPS tamponu) ifade ediyor.

| Detection | Eşik | Severity |
|---|---|---|
| **ETA delay** | 15-30 dk | medium |
| **ETA delay** | 30-60 dk | high |
| **ETA delay** | > 60 dk veya customer SLA breach imminent | critical |
| **Traffic impact** | route delay > 20% | medium |
| **Traffic impact** | route blocked / closure | high |
| **Driver offline** (debounce sonrası sayılır, v1.5) | 0-15 dk grace | low (warning) |
| **Driver offline** | 15-30 dk | medium |
| **Driver offline** | > 30 dk veya driver_assigned_at + 60dk | high |
| **Driver location mismatch** (efektif eşik = geofence+GPS tamponu, v1.5) | 0-15 dk grace | low (warning) |
| **Driver location mismatch** | 15-30 dk | medium |
| **Driver location mismatch** | > 30 dk | high |
| **Dock conflict** | 60-30 dk lead time | medium |
| **Dock conflict** | 30-0 dk lead time | high |
| **Dock conflict** | dock window kaçırıldı | critical |
| **Compliance breach imminent** | 30-15 dk önceden | medium |
| **Compliance breach imminent** | 15-0 dk önceden | high |
| **Compliance breach** | araç ZE-zone'a hatalı emission ile girdi | critical |
| *(diğer satırlar — Locker/Tender/Returns/Invoice/Rest/Border/Range/CSRD — v1.4'ten değişmedi)* | | |

Per-company override: `public.companies.settings.exception_thresholds` JSONB key (bkz. §6.3, v1.6'da değerler onaylandı).

---

## 5. Dedup / cooldown discipline

*(v1.4'ten değişmedi — FN-07, 10 dk cooldown, bkz. önceki versiyon. v1.5'in debounce'u §3.3.2'de ayrı, tamamlayıcı bir katman olarak tanımlı — bkz. o bölümdeki "önemli ayrım" notu.)*

---

## 6. Database — `enterprise.exception_events`

### 6.1 Schema (TimescaleDB hypertable)

*(v1.4'ten değişmedi — schema kolonları aynı, `driver_offline`/`driver_location_mismatch` enum değerleri zaten v1.3'te eklenmişti. v1.5 yeni bir kolon eklemiyor, sadece detection_payload örneklerine debounce/tampon bilgisi ekleniyor:)*

```sql
-- Örnek (driver_offline, v1.5 genişletildi): { "last_telemetry_at": "...",
--   "silence_minutes": 22, "wake_up_push_sent_at": "...",
--   "mqtt_disconnect_at": "...", "debounce_timer_expired_at": "..." }
-- Örnek (driver_location_mismatch, v1.5 genişletildi): { "distance_from_geofence_m": 145,
--   "geofence_radius_m": 100, "gps_buffer_m": 20, "effective_threshold_m": 120,
--   "vehicle_plate": "BX-TR-42" }
```

### 6.2 Karar — neden TimescaleDB hypertable

*(v1.4'ten değişmedi)*

### 6.3 `public.companies.settings` — exception_thresholds JSONB (v1.6'da değerler ONAYLANDI)

```jsonc
{
  "exception_thresholds": {
    "eta_delay_minutes": 30,
    "no_show_grace_minutes": 15,
    "dock_slip_lead_minutes": 60,
    "compliance_breach_lead_minutes": 30,
    "dedup_cooldown_minutes": 10,
    // v1.5 eklendi, v1.6'da ONAYLANDI (Cem, 2026-07-28)
    "offline_debounce_minutes": 5,        // ONAYLI — MQTT disconnect event sonrası bekleme
    "location_gps_buffer_meters": 20      // ONAYLI — global varsayılan; per-bölge ayrım Phase 1.1
  }
}
```

### 6.4 `enterprise.dispatch_decision_log` (v1.7 EKLENDİ)

```sql
CREATE TABLE enterprise.dispatch_decision_log (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             uuid NOT NULL,
  routing_job_id         uuid,              -- enterprise.routing_jobs ref
  dispatch_task_id       uuid,              -- enterprise.dispatch_tasks ref
  decided_at             timestamptz NOT NULL DEFAULT now(),
  decided_by             uuid,              -- JWT.user_id
  scorer_snapshot        jsonb NOT NULL,    -- [{vehicle_id, rank, score, per_scorer:{spatial,temporal,...}, memo, available}]
  constraints_snapshot   jsonb,             -- StrictTaskConstraints — Grup B dahil (TEK kalıcı kayıt, §1.8 gerekçe 2)
  recommended_vehicle_id uuid,              -- scorer sıralamasında #1
  chosen_vehicle_id      uuid,              -- dispatcher'ın gerçek seçimi
  is_override            boolean GENERATED ALWAYS AS
                           (recommended_vehicle_id IS DISTINCT FROM chosen_vehicle_id) STORED,
  override_reason        text,              -- enum — UNCERTAINTIES #20
  override_comment       text
);
CREATE INDEX ON enterprise.dispatch_decision_log (company_id, decided_at DESC);
CREATE INDEX ON enterprise.dispatch_decision_log (company_id, is_override) WHERE is_override;
```

**Karar — neden hypertable DEĞİL:** `exception_events`'in aksine yazma hacmi düşük (approve başına 1 satır). Normal tablo + iki index yeterli; TimescaleDB overhead'i gereksiz. Retention: UNCERTAINTIES #21.

### 6.5 `enterprise.trip_summaries` (v1.7 EKLENDİ)

```sql
CREATE TABLE enterprise.trip_summaries (
  task_id              uuid PRIMARY KEY,   -- public.tasks.id
  company_id           uuid NOT NULL,
  vehicle_id           uuid,
  driver_id            uuid,
  planned_start        timestamptz,        -- public.tasks.scheduled_start (varlık kanıtı ön koşul — §10.2)
  planned_end          timestamptz,
  actual_start         timestamptz,        -- status geçiş zamanları (in_progress / completed)
  actual_end           timestamptz,
  planned_distance_km  numeric,
  actual_distance_km   numeric,            -- public.locations ardışık nokta haversine toplamı
  location_points      int,                -- özet anındaki ham nokta sayısı (veri kalitesi göstergesi)
  eta_deviation_min    numeric,            -- (actual_end - planned_end) dakika
  alert_counts         jsonb,              -- {"hard_brake": 2, "overspeed": 1, ...} sefer penceresi ADXL345/alert sayıları
  summarized_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON enterprise.trip_summaries (company_id, actual_end DESC);
```

**Zamanlama disiplini (retention yarışı):** `locations` retention 7 gün → worker cron'u saatlik "completed VE özetlenmemiş" görevleri tarar; görev kapanışından en geç 24 saat içinde özet mühürlenir (6 günlük emniyet payı). `location_points = 0` olan özet dürüstçe "ham veri yoktu" der — sahte doldurma YOK (Graceful Degradation, DSE ilkesiyle aynı).

**Rol sınırı:** FN-19 enterprise worker'ı yalnızca SELECT yapar (`public.tasks/locations/alerts`) ve yalnızca `enterprise.trip_summaries`'e yazar — `enterprise_backend` rolünün mevcut yetki modeli İHLAL EDİLMEZ, core backend'e dokunulmaz (code-freeze uyumlu). Alternatif (core backend completion handler'ı yazar) UNCERTAINTIES #19'da.

---

## 7. Shared infrastructure with previous FEAT'leri

*(v1.4'ten değişmedi — bkz. önceki versiyon. v1.5 yeni bir shared infrastructure eklemiyor, mevcut FN-03'ün iç mantığını güçlendiriyor. v1.6 eklemesi: DSE temporalScorer [dispatcher repo, services/dispatch/scoring] FN-01'in planlama-anı ikizi olarak §1.6'ya bağlandı; FN-16'nın push altyapısı [internalBridge.js sendPushNotification] artık staging'de uçtan uca kanıtlı.)*

---

## 8. UNCERTAINTIES (Cem onayı bekleyen)

*(#1-15 v1.4'ten değişmedi — bkz. önceki versiyon. UNCERTAINTIES #1 zaten "v1.4'te tamamen kapatıldı" durumundaydı; v1.5 bu kapatılmış maddeyi yeniden açmıyor, üstüne yeni, ayrı bir tolerans katmanı ekliyor.)*

### v1.5'te açılan → v1.6'da KAPATILAN (Cem kararları, 2026-07-28)

16. **`offline_debounce_minutes` = 5 dakika — ✅ KAPANDI.** Cem, spec önerisini (aralığın temkinli üst sınırı: daha az spam riski) onayladı.

17. **`location_gps_buffer_meters` = 20m, tek global varsayılan — ✅ KAPANDI.** Per-bölge (şehir merkezi vs kırsal) farklılaşma Phase 1.1'e ertelendi; Phase 1'de tek değer.

18. **Debounce teknik implementasyonu (EMQX LWT webhook mu, polling mi) — ✅ KAPANDI (devir kararıyla).** Ürün kararı değil, implementasyon kararı olduğu teyit edildi: Phase 1 kodlama aşamasında EMQX'in (Faz 4.2 MQTT altyapısı) webhook/event-bridge "disconnect" event'i verip vermediği canlı olarak doğrulanacak; veriyorsa LWT-event yolu, vermiyorsa mevcut son-telemetri-damgası polling'i debounce'u simüle eder. Ürün tasarımı iki durumda da aynı kalır (§3.3.2 akışı değişmez).

### v1.7'de açılan (Cem onayı bekleyen, 2026-07-29)

19. **`trip_summaries` yazma sorumluluğu.** Seçenek A (ÖNERİ): FN-19 enterprise worker — rol sınırı temiz (SELECT public.* → INSERT enterprise.*), core backend'e ve code-freeze'e dokunmaz. Seçenek B: core backend task-completion handler'ı yazar — daha anlık ama `public` düzlemine kod ekler ve prod deploy penceresi gerektirir.

20. **`override_reason` enum değerleri + zorunluluk.** Öneri enum: `driver_familiarity | customer_preference | vehicle_condition | workload_balance | scorer_data_stale | other`. Öneri zorunluluk: **opsiyonel** — zorunlu kılmak dispatcher'ı ya rastgele neden seçmeye ya da scorer önerisine yapay uymaya iter; boş bırakılan override da başlı başına sinyaldir.

21. **Karar logu + sefer özetleri retention.** Öneri: retention YOK (süresiz) — analiz değeri zamanla artar, hacim düşük (approve başına 1 + görev başına 1 satır). Asgari kabul: 24 ay.

---

## 9. Pilot süreç notları

*(v1.4'ten değişmedi, F10 karşılaştırma tablosu ve NotebookLM trend yorumu korunuyor — bkz. önceki versiyon. v1.5 üçüncü bir insan-mühendislik-incelemesi turu olarak §9.3'e eklenebilir bir gözlem taşıyor: Cem'in üç ardışık turda (v1.3 doğru ayrım, v1.4 somut aksiyon, v1.5 yanlış-pozitif önleme) giderek daha ince taneli, üretim-kalitesi detaylara indiği görülüyor — bu, spec'in olgunlaşma sürecinin doğal bir ilerlemesi. v1.6 dördüncü tur: saha testinden [A2, canlı staging] doğan gerçek kullanıcı deneyimi bulgusunun [500→409] spec'e geri beslenmesi — spec artık yalnızca masa başı incelemeyle değil, çalışan sistemin sahada üretttiği kanıtlarla olgunlaşıyor.)*

---

## 10. Next steps

### 10.2 Phase 1 implementation backlog (v1.5 + v1.6 eklemeleri)

*(v1.4'teki liste geçerliliğini koruyor, ayrıca:)*

- [ ] **v1.5 — MQTT disconnect debounce timer'ı** — FN-03'ün offline dalına, disconnect event'i alındığında hemen exception açmak yerine **5 dakikalık (ONAYLI)** bekleme mekanizması
- [ ] **v1.5 — GPS tolerans tamponu** — FN-03'ün location_mismatch dalına, geofence yarıçapına **+20m (ONAYLI, global)** ekleyen basit bir matematiksel düzeltme
- [ ] **v1.5 — `exception_thresholds` JSONB'ye iki yeni alan** — `offline_debounce_minutes: 5`, `location_gps_buffer_meters: 20` (migration gerektirmez, JSONB additive)
- [ ] **v1.6 YENİ — Tek-aktif-görev 409 sözleşmesi (§3.6)** — `tulipfleet-backend` `/api/driver/tasks/:id/start` handler'ında 500 → 409 Conflict + `active_task_no` içeren anlaşılır mesaj; mobil Alert ile gösterim. Staging'de doğrula, prod'a code-freeze penceresinde. FEAT-010 pipeline'ından bağımsız, erken yapılabilir.
- [ ] **v1.6 YENİ — FN-01 ↔ temporalScorer hizalama kontrolü** — FN-01 implementasyonu başlarken DSE temporalScorer'ın eşik/ETA mantığı okunup aynı feasibility matematiği kullanılmalı (§1.6); ADR-0014 gerçek HERE ETA'sı geldiğinde iki katman birlikte aynı kaynağa geçirilmeli.
- [ ] **v1.6 YENİ — EMQX LWT doğrulaması (eski UNCERTAINTIES #18 devri)** — debounce implementasyonuna başlamadan önce EMQX webhook/event-bridge "disconnect" event'inin varlığı canlı kanıtlanacak.
- [ ] **v1.7 YENİ — `enterprise.dispatch_decision_log` migration + FN-18 endpoint** — pgmig (staging→prod ayna kuralı) + `POST /api/dispatcher/decision-log`; dispatcher approve akışına best-effort (no-throw) çağrı. Exception pipeline'ından BAĞIMSIZ, erken yapılabilir.
- [ ] **v1.7 YENİ — FN-20 `<OverrideReasonDialog />`** — UNCERTAINTIES #20 kararına bağlı (enum + zorunluluk); `chosen ≠ recommended` ise tetiklenir.
- [ ] **v1.7 YENİ — `enterprise.trip_summaries` migration + FN-19 worker** — UNCERTAINTIES #19 kararına bağlı. **Ön koşul (ispat şart):** `public.tasks`'ta `scheduled_start/scheduled_end` kolonlarının ve status geçiş zaman damgalarının varlığı canlı `\d tasks` ile kanıtlanmalı (köprü bulgusu: dispatcher SELECT'i bu kolonları okuyor — güçlü işaret, kanıt değil).

*(§10.1, 10.3, 10.4 v1.4'ten değişmedi.)*

---

## 11. References

*(v1.4'ten değişmedi, ayrıca:)*
- **v1.5 kaynağı:** Cem'in saha deneyimi gözlemi (2026-07-18) — MQTT/GPS yanlış-pozitif önleme, dış referans/ADR yok, bu spec'in kendi kararı.
- **v1.6 kaynağı:** A2 saha test turu (2026-07-28, staging canlı) — 500→409 bulgusu + DSE temporalScorer canlı kanıtı; bkz. `docs/SESSION_NOTES_decision-support-engine.md` (A2 KAPANIŞ bölümü).
- **v1.7 kaynağı:** ML-analiz katmanı planlama oturumu (2026-07-29) — HERE (ML consumer) / dispatcher (optimizasyon) / ML-analiz (karar değerlendirme) üç-katman ayrımı; ADR-0010 §3.3 Phase 3 hazırlığı olarak veri temeli kararı. Retention kanıtı: `add_retention_policy('locations', '7 days')` (canlı prod). Grup B kalıcılık boşluğu kanıtı: `docs/SESSION_NOTES_decision-support-engine.md` (Strateji 3 bölümü).

---

## 12. Change Log

*(v1-1.4 kayıtları korunuyor — bkz. önceki versiyon.)*

| Version | Date | Author | Change |
|---|---|---|---|
| **1.5 (yanlış-pozitif önleme)** | **2026-07-18** | **Cem Sahinkaya + Claude** | **Cem'in üçüncü turdaki gözlemi üzerine FN-03'ün her iki dalına da yanlış-pozitif önleme tamponu eklendi — yeni fonksiyon yok, mevcut FN-03'ün iç mantığı genişletildi.** Yeni **§3.3.2** "Yanlış-pozitif önleme — debounce ve GPS tamponu" eklendi: (1) **MQTT disconnect debounce'u** — broker'ın anlık "disconnect" event'ine karşı, hemen exception açmak yerine 3-5 dakikalık (öneri: 5 dk) bir bekleme süresi; bu süre içinde reconnect olursa exception hiç açılmaz. Bu, FN-07'nin dedup mekanizmasından (açık bir exception'ın tekrarını önler) farklı bir katman (exception'ın ilk kez açılmasını geciktirir) olarak açıkça ayrıştırıldı. (2) **GPS jitter tamponu** — `driver_location_mismatch` eşiğine geofence yarıçapının üstüne +20m (öneri) sabit bir tolerans payı eklendi, efektif eşik 100m→120m; sürücünün gerçekte doğru yerde olduğu ama GPS'in ölçüm hatası yaptığı durumları filtreler. §4 Severity matrix'e, zaman eşiklerinin artık debounce/tampon *sonrasında* sayıldığını netleştiren bir not eklendi. §6.3 `exception_thresholds` JSONB'ye iki yeni alan eklendi (`offline_debounce_minutes`, `location_gps_buffer_meters`) — additive, migration gerektirmiyor. 3 yeni UNCERTAINTIES açıldı (#16 debounce kesin süresi, #17 GPS tamponu bölgesel farklılaşması, #18 debounce'un MQTT LWT event'i mi yoksa polling mi kullanacağı — teknik implementasyon kararı). Bu, Cem'in art arda üçüncü turdaki mühendislik incelemesi — spec'in olgunlaşma sürecinde her turun bir öncekinden daha ince taneli, üretim-kalitesi bir detaya odaklandığı gözlemlendi (v1.3: doğru ayrım, v1.4: somut aksiyon, v1.5: yanlış-pozitif önleme). |
| **1.6 (kararlar + saha geri beslemesi)** | **2026-07-28** | **Cem Sahinkaya + Claude** | **(1) UNCERTAINTIES #16-18 KAPATILDI:** `offline_debounce_minutes = 5` (onaylı), `location_gps_buffer_meters = 20` global (per-bölge Phase 1.1'e ertelendi), #18 implementasyon aşamasına devredildi (EMQX LWT doğrulaması Phase 1 kodlamasında; ürün tasarımı iki durumda da değişmez). §6.3 JSONB değerleri onaylı olarak işaretlendi. **(2) Temporal "KAÇIRIR" planlama-anı köprüsü (§1.6 üçüncü madde):** DSE temporalScorer'ın canlı VRPTW feasibility sinyali FN-01'in planlama-aşaması ikizi olarak tanımlandı — aynı matematik, farklı "an"; FN-01 implementasyonu temporalScorer ile hizalanmalı, ADR-0014 HERE ETA'sı geldiğinde ikisi birlikte geçmeli (backlog maddesi §10.2). **(3) Yeni §3.6 — tek-aktif-görev 409 hata sözleşmesi:** A2 saha testinde (staging canlı) bulunan gerçek UX hatası — iş kuralı ihlali (aktif görev varken ikinci "Başla") 500 dönüyordu; hedef 409 Conflict + `active_task_no` içeren anlaşılır mesaj. Genelleme ilkesi: kural ihlali ≠ sunucu çökmesi, her iş-kuralı ihlali 4xx + anlaşılır mesaj. FN-16'nın push altyapısının artık staging'de uçtan uca kanıtlı olduğu (A2 `72d21f6`) fonksiyon kataloğuna ve §3.4'e not düşüldü. Yeni fonksiyon eklenmedi. |
| **1.7 (ML-analiz veri temeli)** | **2026-07-29** | **Cem Sahinkaya + Claude** | **ML-analiz katmanı hazırlığı — ADR-0010 disiplini KORUNARAK (ML eklenmedi, yalnızca veri temeli).** Üç-katman ayrımı netleştirildi: HERE = ML consumer (ETA/rota), dispatcher = optimizasyon + karar destek, ML-analiz (Phase 3, ADR-0010 §3.3) = karar değerlendirme (override analizi, planned-vs-actual, feature importance). O katmanın veri temeli bugünden kurulmazsa telafi edilemez üç boşluk kanıtlandı: (1) `locations` retention 7 gün — sefer verisi kalıcı değil; (2) Grup B kısıtları yalnızca frontend-state'te yaşıyor — hiçbir kalıcı kayıt yok; (3) scorer-önerisi-vs-dispatcher-seçimi override sinyali her approve'da üretilip kaybediliyor. Yeni **§1.8** (gerekçe + üç kalem + best-effort ilkesi), yeni **§6.4** `enterprise.dispatch_decision_log` (normal tablo, hypertable değil — düşük hacim) + **§6.5** `enterprise.trip_summaries` (saatlik worker, 24h mühürleme, 6 gün emniyet payı, Graceful Degradation), 3 yeni fonksiyon: **FN-18** decision-log endpoint (best-effort no-throw, FN-16 push paterni), **FN-19** buildTripSummary worker (SELECT-only rol sınırı korunur), **FN-20** OverrideReasonDialog. UNCERTAINTIES **#19-21 açıldı** (trip_summaries yazarı, override enum/zorunluluk, retention). §10.2'ye 3 backlog maddesi — üçü de exception pipeline'ından bağımsız, erken yapılabilir; trip_summaries ön koşulu: `scheduled_start/end` canlı `\d` kanıtı. |