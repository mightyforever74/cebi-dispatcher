# SESSION NOTES — Decision Support Engine (Kanban Karar Destek Asistanı) — Phase 1

**Tarih:** 2026-07-20
**İş kolu:** `/dispatcher/tasks/optimize` (Seçenek B / Kanban) → Decision Support Engine
**Sonuç:** PHASE 1 TAMAMLANDI ✓ (uçtan uca canlı DB'de kanıtlandı)

> Not: Bu dosya bilinçli olarak `SESSION_NOTES_sira6.md`'den ayrı tutuldu — o dosya
> kapanmış "Sıra 6 (Bridge/Approve)" arşividir; bu iş kolu (Karar Destek Motoru)
> onun üstüne inşa edilen yeni bir katmandır. Arşiv temiz bırakıldı.

---

## Ne yapıldı (özet)

Mevcut Kanban "Plan Review" (Seçenek B, round-robin frontend simülasyonu), sıfırdan
yazılmadan bir **scorer plugin/chain** omurgası üzerine oturan **Karar Destek Asistanına**
yükseltildi. Graceful Degradation ilkesi: veri kaynağı canlı olmayan scorer
`available:false` döner, sahte skor ÜRETMEZ.

- **MEKAN (spatial):** AKTİF — canlı telemetri (REST snapshot) + haversine mesafe.
- **ZAMAN (temporal):** AKTİF — tahmini ETA; `time_window_end` varsa VRPTW feasibility
  (pencereyi kaçıran araç 0.2 ceza + memo'da "KAÇIRIR ~N dk").
- **REGÜLASYON (compliance):** KİLİTLİ (Phase 1.1) — ZE-zone frontend endpoint'i yok.
- **KARGO (cargo):** KİLİTLİ (Phase 1.1) — araç-tarafı kapasite/emisyon kolonları yok.

UI: yatay Kanban → **dikey sıralı araç listesi** (en uygun en üste), Karar Notu
**Popover** (info butonu), flat B2B (soft shadow yasak, 1px border), `ConstraintsSummary`
chip'leri. Round-robin **ilk atama paritesi korundu** — sıralama atamayı DEĞİŞTİRMEZ.

---

## Oluşturulan / değişen dosyalar (tulipfleet-dispatcher)

| Dosya | Durum |
|-------|-------|
| `src/services/dispatch/scoring/types.ts` | yeni — `VehicleScorer` sözleşmesi (ActiveScorer/InactiveScorer), `ScoringTask.constraints` |
| `src/services/dispatch/scoring/geo.ts` | yeni — haversine + sinyal yaşı |
| `src/services/dispatch/scoring/registry.ts` | yeni — `SCORERS` zinciri + `rankVehicles` |
| `src/services/dispatch/scoring/scorers/spatialScorer.ts` | yeni — AKTİF |
| `src/services/dispatch/scoring/scorers/temporalScorer.ts` | yeni — AKTİF (time-window feasibility) |
| `src/services/dispatch/scoring/scorers/complianceScorer.ts` | yeni — INACTIVE |
| `src/services/dispatch/scoring/scorers/cargoScorer.ts` | yeni — INACTIVE |
| `src/hooks/useDispatchLocationSnapshot.ts` | yeni — telemetri store bypass, REST snapshot |
| `src/types/metadata.ts` | yeni — `StrictTaskConstraints` kontratı + form seçenek sabitleri |
| `src/layouts/dispatcher/tasks/optimize/index.tsx` | yükseltildi — Karar Destek UI + Logistics & Constraints formu |
| `src/hooks/useTaskOptimization.ts` | tip sıkılaştırıldı — `capacity_required: CapacityRequired` |

### Commit zinciri (dispatcher)
`42aeffd` scoring modülü → `2bb5f64` Kanban→Karar Destek → `73e8078` TS7006 →
`c772bd2` dikey liste + Popover (UX) → `8da9f75` REST snapshot bypass (Mekan/Zaman fix) →
`95d1891` metadata + Logistics & Constraints (Strateji 3) → `27d6a36` TS2322/TS7006 fix →
`129bedab` Form UX v2 Paket 1 (MDDatePicker+preset, segmented, chip-grid) →
`c13b566` MDDatePicker label shrink fix (flatpickr/MUI çakışması).

---

## Mimari karar: "Strateji 3" (sıfır backend değişikliği)

Kanıt: `enterprise-backend/routes/tasks.js` + `lib/routing/MockRoutingProvider.js` (koddan).

- **Grup A (bugün DB'ye mühürlenir):** `capacity_required` (jsonb: `volume_m3` + `weight_kg`
  + `hazmat_classes`) ve `skill_required` (text[]) — bu kolonlar `enterprise.dispatch_tasks`'ta
  ZATEN VAR ve optimize INSERT'i bunları yazıyor. Backend değişmedi.
- **Grup B (backend'e GÖNDERİLMEZ):** `direction`, `location_type`, `time_window_start/end` —
  bu kolonlar YOK; explicit INSERT ekstra alanı sessizce yutar; optimize route'unda Fastify
  `schema` guard'ı yok (additionalProperties set edilmemiş). Bu alanlar yalnızca frontend-state
  (`submittedConstraints` + `taskConstraintsMap<taskId, StrictTaskConstraints>`).
- **Scorer, kısıtları poll sonucundan DEĞİL frontend-state'ten okur** — mock provider
  `response_payload.tasks`'ı yalnızca `{id, pickup, dropoff}` döndürür (kargo/skill/zaman DÖNMEZ).
- **Tek sözleşme:** `types/metadata.StrictTaskConstraints` — form yazar, scorer okur, typo
  derlemede yakalanır (`tsc`).

---

## Kanıtlanan backend ground-truth'ları (bu iş kolunda okundu)

- `enterprise.dispatch_tasks` kolonları (INSERT/UPDATE'ten): `id, company_id, status,
  pickup_location(jsonb), dropoff_location(jsonb), capacity_required(jsonb),
  skill_required(text[]), routing_job_id, created_at, updated_at, assigned_vehicle_id,
  assigned_driver_id`. `capacity_required` JSON.stringify'lanıyor (jsonb), `skill_required`
  ham array geçiyor (text[]) — kanıt: iki farklı serileştirme.
- `metadata` isimli jsonb kolon HİÇBİR sorguda geçmiyor (kesin yok/var için canlı `\d` gerekir).
- `POST /dispatcher/tasks/optimize` — Fastify route options'ta yalnızca `preHandler`; `schema`
  YOK → `additionalProperties:false` set değil → ekstra alan kapıda reddedilmez, INSERT'te yutulur.
- `MockRoutingProvider`: draft doğum → `routing_jobs` (submitted→running→completed, ~6sn),
  `response_payload.tasks = {id, pickup, dropoff}`. Dedup: `request_payload` SHA-256 hash'i;
  aynı payload'da yeni draft yaratılmaz (ROLLBACK).
- `GET /api/dispatcher/locations/latest` her satırda `vehicle_id` (public.vehicles.id UUID)
  döndürür → optimize `available_vehicles` UUID'leriyle BİREBİR eşleşir (plaka eşlemesi kalktı).

## Kök-neden kaydı: "Mekan/Zaman değişince liste değişmiyordu"

`useVehicleStore.applyLocationFrame → resolveKey` yalnızca MOCK SEED kayıtlarını günceller,
eşleşmeyen gerçek filo frame'lerini sessizce atar (`if (!key) return state;`). Gerçek plakalar
store'a hiç giremeyince tüm skorlar 0 → eşit skor → sıralama sabit. Çözüm: store bypass edildi
(`useDispatchLocationSnapshot`, `vehicle_id` ile birebir eşleşme).

---

## Uçtan uca kanıt (canlı)

Job `3a223c86-3970-462b-b0fb-04d4ed2bfa57`:
optimize → **approve ÖNCESİ** `enterprise.routing_jobs` (completed) + 1 draft
`enterprise.dispatch_tasks` (status=draft, capacity_required/skill_required yazılı) →
Zaman filtresi canlı sıraladı (RD-NL-78 #1 skor 18, AH-05-KL/BX-TR-42 11, NL-92-VB #4 skor 0) →
approve → "1 task pushed to fleet system" → `public.tasks`.

**Not:** NL-92-VB skor 0, çünkü `public.locations`'ta güncel satırı yok (canlı konum yok —
dürüst davranış, motor değil veri akışı meselesi).

---

## Bilinçli kapsam sınırları (Phase 1'de YAPILMADI)

- **Pre-drag kolon eligibility görselleştirmesi** ertelendi — `ScoreDetail.eligible` altyapısı
  hazır ama kargo/uyum verisi olmadan "uygun değil" göstermek uydurma olurdu.
- **HERE Matrix (ADR-0014)** canlı değil — mesafe haversine, ETA 60 km/h varsayımı (memo'da açık).
- Form tek görev (tek pickup/dropoff) topluyor; çoklu görev/waypoint için map yapısı hazır ama
  form o tarafı henüz toplamıyor.

---

## Backlog (bu oturumda doğan)

1. **Draft/routing_job retention & cleanup:** approve edilmeyen her Optimize denemesi
   `enterprise.dispatch_tasks`'ta `status='draft'` + `enterprise.routing_jobs` satırı bırakıyor
   (dedup aynı payload'ı engeller, farklı denemeler birikir). Cron/cleanup politikası gerekli.
   Ölçüm: `SELECT count(*) FROM enterprise.dispatch_tasks WHERE status='draft';`
2. **fleet-sim keepalive beslemesi:** demoda araçların skorlu (yeşil) çıkması için
   `public.locations`'ta güncel satırları olmalı (özellikle NL-92-VB). Motor tarafı sağlam;
   bu tamamen `fleet-sim` MQTT/location keepalive meselesi.

---

## MILESTONE 0 — "Launchable Basic" KAPANIŞI (2026-07-21)

Stratejik pivot ("tam bitir öyle sun" → "TulipFleet app ile uyumlu basic task management sun,
her hafta feature ekle") sonrası Milestone 0 tanımı: **görev oluştur → optimize → ata → onayla
→ sürücünün telefonuna bildirim düşsün.** Bu oturumda zincirin TAMAMI kanıtlandı.

### Phase 4 (Driver Push) — MEMORY DÜZELTMESİ ⚠️

Önceki oturum notları/memory "Phase 4 AÇIK — `internalBridge.js` sadece DB INSERT yapıyor, push
yok" diyordu. **Bu bilgi ESKİMİŞ.** Gerçek kod (koddan kanıtlandı, 2026-07-21 okuması):

- `tulipfleet-enterprise-backend/routes/tasks.js` approve handler (FIX 2026-07-18): draft'ı
  araca atar → **sürücüyü araçtan türetir** (`public.drivers.assigned_vehicle_id → user_id`) →
  köprüye `user_id` dahil POST eder.
- `tulipfleet-backend/routes/internalBridge.js` (FIX 2026-07-18): `sendPushNotification` —
  COMMIT SONRASI, best-effort (no-throw), `users.expo_push_token` okur, Expo Push API'ye
  ("Yeni Görev Atandı") gönderir. Transaction'a dahil değil; push başarısız olsa bile task
  oluşturma geri alınmaz.
- Deploy kanıtı: `grep -c sendPushNotification` = **3** hem `/opt/fleet/backend-staging` hem
  `/opt/fleet/backend` (production Docker). Köprü kodu HER İKİ ortamda deploy'lu.
- **Fiziksel kanıt:** sürücü telefonunda "Yeni Görev Atandı" push'u alındı (Cem fiziksel teyit).

> DÜZELTME: Phase 4 açık DEĞİL. Staging düzleminde uçtan uca çalışıyor ve fiziksel teyit edildi.
> Memory'de "Phase 4 open / internalBridge sadece DB INSERT" ifadesi geçersizdir.

### Hangi DÜZLEMDE çalışıyor — kanıt (env, 2026-07-21)

`fleet-enterprise-01` container `tulipfleet-enterprise-backend` env:
- `DATABASE_URL=...@10.0.0.2:5433/fleet_tracking_staging` → dispatcher **staging DB'ye** yazıyor.
- `INTERNAL_CORE_API_URL=http://10.0.0.2:3001/api/internal/bridge/tasks` → köprü **staging PM2**
  (`:3001`, `/opt/fleet/backend-staging`) hedefliyor.

Sonuç: Milestone 0 zinciri **STAGING düzleminde** uçtan uca çalışıyor. Köprü KODU production'a
da deploy'lu ama enterprise dispatcher hâlâ staging'e bağlı → **production cutover BEKLİYOR**
(bilinçli; INTEGRATION_BOUNDARIES §3.1: "enterprise production cutover ROADMAP'te ayrı karar").
Not: ana fleet backend (mobil/admin/driver, `api.tulipfleet.com`, `fleet_tracking`) zaten
haftalardır canlı — bu ayrı bir düzlem, dispatcher→köprü cutover'ıyla karıştırılmamalı.

### Milestone 0 durum tablosu (kanıta dayalı)

| Katman | Durum | Kanıt |
|--------|-------|-------|
| Mobil push mekanizması | ✅ Çalışıyor | Fiziksel cihaz teyidi |
| Köprü kodu (internalBridge push + sürücü türetme) | ✅ Prod + staging deploy'lu | grep=3 |
| Ana fleet backend | ✅ Production canlı | (haftalardır) |
| Enterprise dispatcher → köprü zinciri | ⚠️ **Staging düzleminde** | env: staging DB + `:3001` |
| Mock → HERE (gerçek VRP, ADR-0014) | ⏸️ Demo sonrası | code-freeze 28.06, 21+ commit backlog |

**KAPANIŞ CÜMLESİ:** Milestone 0 (Launchable Basic) **staging düzleminde uçtan uca kanıtlandı;**
production cutover ve mock→HERE geçişi demo sonrası planlı ("Sürekli Teslimat Döngüsü").

### %100 launchable için kalan 2 somut engel

1. **Mobil beta build (düşük risk):** ✅ ÇÖZÜLDÜ (2026-07-21/28) — staging profili build'leri
   (iOS `661f2e34` sonrası `f1026a5f`, Android `49fd5e76`) + config.js EXPO_PUBLIC_API_URL fix
   ile app staging'e bağlandı; pieter login + push + görev listesi fiziksel kanıtlı (aşağıda A2).
2. **Enterprise prod cutover (yüksek risk — tek satır DEĞİL):** `DATABASE_URL` staging→prod
   TEK BAŞINA yetmez. Koordineli 5 madde: (a) `DATABASE_URL`→`fleet_tracking`; (b)
   `INTERNAL_CORE_API_URL`→production Docker backend (staging `:3001` değil); (c)
   `INTERNAL_BRIDGE_TOKEN` prod backend `.env`'iyle birebir eşleşmeli (fail-closed); (d) prod
   `enterprise.dispatch_tasks`=0 satırdı, ilk gerçek approve prod'a yazacak — demo verisi
   sızmamalı; (e) JWT_SECRET her iki ortamda aynı + container recreate (plain restart env
   okumaz). code-freeze (28.06) + "prod container'a dokunma" ilkesiyle çakışır → mock→HERE
   ile TEK production-launch penceresinde ele alınmalı.

---

## STAGING DEMO ALTYAPISI (2026-07-21) — mobil build + veri düzeltmeleri

Milestone 0'ı staging'de fiziksel demo etmek için yapılan zincir (BUILD.md §17 ile senkron):

- **config.js hardcoded prod URL kaldırıldı:** `src/constants/config.js` `getApiUrl()` artık
  `process.env.EXPO_PUBLIC_API_URL` okuyor (öneksiz `API_URL` bundle'a hiç gömülmüyordu — ölü
  kod, silindi). `eas.json` üç profile de `EXPO_PUBLIC_API_URL` eklendi (staging→staging-api,
  preview/production→api). Commit `97b6a05` (tulipfleet repo).
- **EAS env mapping:** `staging` build profiline `"environment": "preview"` — custom `staging`
  environment plan-kısıtlı (GraphQL hatası). Env'ler preview'dan (Maps key/plist/MQTT), API_URL
  staging profilinden. `build:inspect` ile kanıtlandı.
- **nginx zaten doğru:** `staging-api.tulipfleet.com` → `127.0.0.1:3001` (staging backend). İlk
  "sistem borcu" şüphesi asılsız çıktı; sapma yoktu.
- **fleet-sim:** `pm2 fleet-sim` stopped'tı, restart edildi → 4 aracı 30sn'de besliyor. AMA
  sadece BX-TR-42 taze; 34XYZ456 konumsuz, AH-05-KL/RD-NL-78 bayat (06-23). fleet-sim hedef araç
  listesi ile demo filosu örtüşmüyor → ayrı temizlik kalemi.
- **Demo sürücüsü (staging DB, kanıtlı):** `pieter@tulipfleet.com` / `Demo123` (bcrypt hash
  backend'in kendi bcryptjs'iyle üretildi), araç BX-TR-42, token var, konum taze. `test@tulipfleet.com`
  staging'de YOK (memory yanlıştı). Login handler temiz: `password_hash` + `bcrypt.compare`, ek
  koşul yok.
- **Build:** `staging` profili, iOS `661f2e34` + Android `49fd5e76`, buildNumber autoIncrement.

---

## KÖPRÜ ZENGİNLEŞTİRME BULGULARI (2026-07-21) — mobil vs dispatcher task asimetrisi

Mobil admin task ekranları (`CreateTaskScreen.js`, `AdminTasks.js`) + köprü (`internalBridge.js`)
koddan okundu. Mobil ile dispatcher AYNI `public.tasks`'a FARKLI zenginlikte yazıyor.

**Kanıtlanan `internalBridge.js` payload (köprünün ALDIĞI alanlar):**
`enterprise_dispatch_task_id, company_id, user_id, vehicle_id, title, description,
start_location_str, end_location_str, priority`. INSERT ettiği kolonlar: `task_no, driver_id,
vehicle_id, title, description, start_location, end_location, priority, status='assigned',
company_id, enterprise_dispatch_task_id, distance_source='manual'`.

**Mobil `CreateTaskScreen` payload:** `title (zorunlu), description, priority, driver_id,
vehicle_id, start_location/end_location (düz metin), scheduled_start/scheduled_end (ISO),
waypoints[]`. Kapasite/skill/hazmat YOK.

### Backlog kalemi 1 — Köprü title üretimi ✅ A2 OLARAK KAPANDI (aşağıda)

### Backlog kalemi 2 — scheduled_start/end eşlemesi (ZOR: veri 3 katmanda EKSİK)

"15 dk cila" DEĞİL. `time_window_start/end` verisi köprüye HİÇ ULAŞMIYOR:
- Grup B (time_window) `enterprise.dispatch_tasks`'a bile yazılmıyor (Strateji 3, frontend-state).
- Dispatcher approve → köprü çağrısı `time_window` GÖNDERMİYOR (köprü payload'ında yok — kanıtlı).
- Köprü INSERT'i `scheduled_start`/`scheduled_end` kolonlarını HİÇ kullanmıyor.
Düzeltme = 3 katman: (a) dispatcher approve time_window'u köprüye göndersin; (b) köprü payload'ına
+ `scheduled_start/end`; (c) INSERT'e + kolon. 3 dosya, 2 repo. Ön koşul: `public.tasks`'ta
`scheduled_start/end` kolonlarının varlığı canlı `\d tasks` ile doğrulanmalı (mobil gönderiyor ama
köprü kullanmıyor — kolon var mı kanıtlanmadı). NOT: dispatcher GET /api/dispatcher/tasks sorgusu
`t.scheduled_start, t.scheduled_end` SELECT'liyor — kolonların VARLIĞINA güçlü işaret, yine de \d şart.

### Backlog kalemi 3 — INFRA-B: iki kanalın ortak task kontratı

Mobil admin görevleri VRP kısıtlarından (hazmat/m³/kg/skill) YOKSUN doğuyor; dispatcher topluyor.
FEAT-020 spec'i yazılırken `StrictTaskConstraints` (src/types/metadata.ts) iki kanal için ortak
kanonik standart yapılmalı — mimari bütünlük. INFRA-B'nin somut gerekçesi.

---

## A2 KAPANIŞ — Köprü Title Cilası ✅ (2026-07-28, uçtan uca fiziksel kanıt)

**Sorun:** Dispatcher görevleri mobil listede `TLP-26-XXXXX` / `Sevk Gorevi <hex>` görünüyordu.

**Kök neden (2 katman, ikisi de koddan kanıtlı):**
1. Köprü `title`'ı olduğu gibi basıyordu (fallback yoktu).
2. İlk fix (köprüye fallback) tek başına YETMEDİ — DB kanıtı: yeni görev yine `Sevk Gorevi
   51c79139` çıktı. Çünkü enterprise approve handler'ı `title: \`Sevk Gorevi ${draft.id.slice(0,8)}\``
   şeklinde SENTETİK başlık gönderiyordu → köprü fallback'i hiç tetiklenmiyordu.

**Çözüm (onaylanan mimari: türetme TEK YERDE — köprüde):**
- `tulipfleet-backend/routes/internalBridge.js` commit `72d21f6`: `derivedTitle =
  (title || \`${start_location_str} → ${end_location_str}\`).slice(0,255)` → INSERT'te kullanılır.
  Mobil admin görevlerinde title dolu gelir, fallback devreye girmez.
- `tulipfleet-enterprise-backend/routes/tasks.js` commit `2640342`: sentetik başlık kaldırıldı,
  `title: null` gönderilir.

**Deploy:**
- Staging PM2: `/opt/fleet/backend-staging` git pull + `pm2 restart fleet-staging`, grep
  `derivedTitle` = 3 ✓
- Enterprise Docker: `/opt/enterprise` git pull + `docker compose up -d --build` (build: .
  imajı — bind mount değil, rebuild şart), container içi grep `title: null` = 2 ✓
- Prod core backend'e DOKUNULMADI (code-freeze; `72d21f6` prod'a 21+ commit backlog ile gidecek).

**Uçtan uca kanıt (TLP-26-00010):**
- Push metni: `TLP-26-00010: Utrecht, Nederland → Rotterdam, Zuid-Holland, Nederland` (lockscreen
  ekran görüntüsü) ✓
- Dispatcher listesi: `TLP-26-00010 | Utrecht → Rotterdam | Pieter van den Berg | BX-TR-42 |
  ASSIGNED` ✓
- DB: `driver_id = pieter (d1d2...0001)`, status=assigned, plate=BX-TR-42 ✓
- Telefon (pieter login): görev listede adres başlığıyla görünüyor ✓

**Yol notları (bu testte öğrenilen):**
- "Görev listede görünmüyor" yanlış alarmı: telefonda FARKLI hesapla girişliydi. Push token
  CİHAZA bağlıdır (pieter'in token'ı = bu cihaz) → push, girişli hesaptan bağımsız düşer; liste
  ise `GET /api/driver/tasks` = girişli sürücünün `driver_id` filtresi. İki mekanizma AYRI.
- Mobil liste `assigned`'ı gösteriyor (DriverTasks.js:807 `["pending_review","accepted","pending",
  "assigned"]` — 18.07 fix build'de mevcut).
- **Yeni backlog — 500→409:** aktif `in_progress` görev varken ikinci göreve "Başla" denirse
  backend **Internal Server Error (500)** dönüyor. Tek-aktif-görev kuralı (DriverTasks.js:803)
  ihlali aslında usul hatası → backend **409 Conflict + anlaşılır mesaj** ("önce aktif görevi
  tamamla/geri çek") dönmeli. FEAT-010 (Exception Handling) spec'ine doğal madde.

**Form UX v2 Paket 1 de bu pencerede kapandı** (dispatcher `129bedab` + `c13b566`): MDDatePicker
(flatpickr, SIFIR yeni bağımlılık) + preset chip'ler, ikonlu segmented Yön/Konum Tipi,
hazmat/yetkinlik chip-grid, label-shrink fix. Ekran doğrulaması Cem tarafından yapıldı ("pürüz
kalmadı"). Paket 2 (araç mini kartları + yapışkan özet) backlog'da.

---

## B KAPANIŞ (kısmi) — FEAT-010 Spec v1.7/v1.8 + FN-18 CANLI ✅ (2026-07-29)

**Bağlam:** ML-analiz katmanı planlama oturumu. Üç-katman ayrımı netleşti: **HERE = ML consumer**
(ETA/rota), **dispatcher = optimizasyon + karar destek**, **ML-analiz (Phase 3, ADR-0010 §3.3) =
karar değerlendirme** (override analizi, planned-vs-actual, feature importance). Karar: ML değil,
ML'in İLERİDE tüketeceği **veri temeli** bugünden kurulur — FEAT-010'a işlendi.

### Spec turu (tulipfleet-dispatcher)

- **v1.7** commit `5cae86a`: §1.8 (üç kanıta dayalı gerekçe: locations retention 7 gün / Grup B
  hiçbir yerde kalıcı değil / override sinyali her approve'da üretilip kayboluyor), §6.4
  `dispatch_decision_log` + §6.5 `trip_summaries` şemaları, FN-18/19/20, UNCERTAINTIES #19-21.
- **v1.8** commit `736b381`: #19-21 KAPANDI (Cem onayı) — #19 trip_summaries yazarı = **Seçenek A
  enterprise worker**; #20 override_reason enum sabit (`driver_familiarity|customer_preference|
  vehicle_condition|workload_balance|scorer_data_stale|other`), **opsiyonel**; #21 retention
  **YOK (süresiz)**.

### Migration (staging + prod, ayna kuralı)

`1782300000000_create-enterprise-dispatch-decision-log.sql` — her iki kopya klasörüne
(`/opt/fleet/backend-staging/migrations` + `/opt/fleet/backend/migrations`) yazıldı, hem
`fleet_tracking_staging` hem `fleet_tracking`'e uygulandı. Kanıtlar: `\dt enterprise.*` çakışma
yok (9 tablo), PG 15.2, her iki DB'de INSERT testi `is_override = t` (GENERATED column canlı),
3 index. Yol notu: psql superuser `postgres` DEĞİL — `fleetadmin` (container env'den kanıtlı).

### FN-18 endpoint (tulipfleet-enterprise-backend)

- Commit `b3cdd06`: `routes/decisionLog.js` (yeni) + `server.js` kayıt.
  `POST /api/dispatcher/decision-log` — notificationPreferences pattern'i (`fastify.pg.query`,
  `fastify.authenticate`, id+company_id claim → 403; CORS zaten GET/POST/OPTIONS).
  Validasyon: `scorer_snapshot` zorunlu dizi (400), uuid regex (400), override_reason enum (400).
  `is_override` DB'de GENERATED — backend hesaplamaz. Best-effort/no-throw sorumluluğu ÇAĞIRAN
  frontend'te (FN-16 push paterni).
- Deploy: `/opt/enterprise` git pull + `docker compose up -d --build` ✓ (boot temiz,
  `db_user: enterprise_backend`).

### Duman testi kanıt zinciri (canlı, 2026-07-29)

- JWT: `POST /api/auth/login` (path mobil `api.js`'ten kanıtlı) admin@fleet.com → 299 char token.
- Geçerli istek → `{"success":true,"logId":"3a29093e-...","is_override":true}` ✓
- `{}` → 400 "scorer_snapshot is required and must be an array" ✓
- Geçersiz enum → 400 (6 değer listesiyle) ✓
- DB: satır **staging'de** (`fleet_tracking_staging`, logId birebir, `decided_by` JWT'den dolu),
  **prod DB boş** ✓ — doğru düzlem (Milestone 0 staging, cutover bilinçli beklemede).

### Kalan işler (B'nin devamı)

1. ~~**Frontend entegrasyonu**~~ ✅ KAPANDI (2026-07-29 gece, commit `7fb8f60`):
   `services/dispatch/decisionLog.ts` (FN-18 istemcisi, best-effort no-throw; DİKKAT:
   FN-18 path'i `/api` ÖNEKLİ, optimize route'larının aksine) + `components/
   OverrideReasonDialog.tsx` (FN-20, sebep opsiyonel) + `optimize/index.tsx`
   (lastRankedRef, proceedApprove ayrımı, log approve BAŞARISINDAN sonra atılır).
   `tsc --noEmit` temiz. **Uçtan uca kanıt (22:19:12):** gerçek UI approve →
   `dispatch_decision_log` satırı: has_task=t, has_job=t, is_override=t,
   override_reason=driver_familiarity, snap_n=4, has_constraints=t.
   **Yol bulgusu — varchar(100) bug'ı (§3.6 ailesi):** ilk approve denemeleri köprüde
   PG `22001 value too long` ile 500 patlattı (`internalBridge.js:203`) — kök neden:
   A2 `derivedTitle` `slice(0,255)` yapıyor ama `public.tasks.title` varchar(100) idi;
   Utrecht→Rotterdam (~55 kr) sığmış, Paris/Schiphol tarzı uzun geocode adresi sığmamıştı.
   Çözüm: migration `1782400000000_widen-tasks-title-255.sql` — `title` → varchar(255)
   (start/end_location zaten 255; kod sözleşmesiyle hizalandı), staging+prod ayna
   kuralıyla uygulandı, iki DB'de 255 kanıtlı. Kod değişmedi, restart gerekmedi.
   Not: başarısız denemeler `company_task_counters` sayacında atlama bırakmış olabilir
   (kozmetik; task_no benzersizliği etkilenmez).
2. ~~**FN-19 trip_summaries worker**~~ ✅ KAPANDI (2026-07-29 gece): ön koşullar canlı
   kanıtlandı (`\d tasks`: scheduled_*/actual_* + planned_* + actual_distance_km VAR;
   `\d locations`: device_id anahtarlı, zaman kolonu `"time"` — zincir tasks.vehicle_id →
   vehicles.esp32_device_id → locations.device_id; `\d alerts`: task_id VAR → doğrudan
   task-bazlı sayım). Migration `1782500000000` (tablo + locations/alerts SELECT GRANT,
   staging+prod ayna, has_table_privilege üçlü kanıt). Worker: enterprise-backend
   `plugins/tripSummaryWorker.js` (`d3a468e`) — saatlik + boot'ta bir kez, tek set-based
   SQL (PostGIS ST_DistanceSphere), Graceful Degradation. **Canlı kanıt:** ilk boot turunda
   `count:21` — staging'in 21 completed görevinin TAMAMI mühürlendi; `sapmali=12`
   (planned-vs-actual akıyor), `konumlu=0` DÜRÜST (eski görevlerin ham konumu retention'da
   çoktan silinmişti — worker'ın varlık sebebi tam da bu; bu geceden itibaren yeni
   tamamlanan görevler gerçek pts/km alır).
   **Aktarım-hatası dersi (2 olay, ikisi de dakikalar içinde yakalandı):** (a) `091f387`
   server.js sonuna hatalı artık — `2c7ce38` ile deploy'dan ÖNCE düzeltildi; (b) worker
   yorumundaki yıldız-bölü dizisi blok yorumu erken kapatıp boot'u kırdı (crash-loop,
   ~7 dk) — `d3a468e` ile düzeltildi. YENİ KURAL: MCP ile push'lanan her JS dosyası push
   öncesi sandbox'ta `node --check`'ten geçirilir.
3. ~~**§3.6 tek-aktif-görev 409 sözleşmesi**~~ ✅ STAGING'DE CANLI (2026-07-29 gece):
   `tulipfleet-backend/server.js` start handler'ına (satır ~5144) ön kontrol
   (aktif in_progress varsa 409 + `active_task_no`; istenen görev aktif görevin
   KENDİSİYSE muaf) + catch'e 23505/`uniq_driver_single_in_progress` yarış emniyeti.
   Patch anchor-assert'li script + `node --check` (yeni kural ilk kez uygulandı).
   Staging PM2 deploy; canlı kanıt: pieter (aktif TLP-26-00009) → TLP-26-00011'e
   start → `HTTP 409 {"error":"Conflict","active_task_no":"TLP-26-00009"}`.
   Prod'a DOKUNULMADI (code-freeze — commit 21+ backlog'a katıldı).
   **Kalan mobil cilası (backlog, bir sonraki mobil build'e biner):** `api.js`'te
   mesaj eşlemesi YOK (kanıtlı) → catch'lerdeki `e.message` jenerik axios metni
   gösterir; `DriverRouteMapScreen.js:1380` + `DriverTaskDetail.js` catch'lerine
   `e.response?.data?.message || e.message` eşlemesi eklenmeli ki 409 mesajı
   kullanıcıya aynen ulaşsın.
4. **PLAN GÜNCELLEMESİ (Cem onayı, 2026-07-30):** Pipeline sprint'inden ÖNCE araya
   **fleet-sim v2 (canlı hareket simülatörü)** alındı. Gerekçe — mevcut simülasyon
   envanteri kanıtlandı ve üçüncü mod EKSİK: (1) `pm2 fleet-sim` = statik keepalive
   (araç kımıldamaz, sadece "çevrimiçi" görünür); (2) `FEAT-007-EXT/07-demo/seed.js`
   = 180 günlük TARİHSEL batch jeneratör (dashboard doldurma, canlı değil);
   (3) canlı rota-takip simülatörü YOK. v2'nin dört getirisi: demo'da haritada
   gerçekten hareket eden araç; trip_summaries'e gerçek pts/km (bugünkü dürüst
   sıfırlar dolar — NOT: "veri birikiyor" iddiası düzeltildi, gerçek hareket
   olmadan birikim ~0); FEAT-010 pipeline'ının fiili TEST RIG'i (yavaşlat→FN-01
   ETA sapması, öldür→FN-03 offline debounce, saptır→location mismatch — §3.3.2
   tampon değerleri bununla doğrulanır); breadcrumbs analizi test verisi (QA
   HERE-yetenek dokümanı istisna kalemi). Tasarım: keepalive'ın rota-takip modlu
   v2'si, düz-hat interpolasyon (HERE polyline sonra), pm2. **Güncel sıra:
   1) mobil hata-eşleme cilası → 2) fleet-sim v2 → 3) pipeline sprint'i.**
   → **1 ✅ KAPANDI** (2026-07-30, mobil `791c97f`): 9 catch'te `response.data.message`
   önceliğe alındı (TaskDetail eski eşleme `data.error`'du — 409'da kullanıcıya
   "Conflict" gösterirdi, kanıtlandı ve düzeltildi); `node --check` temiz, sonraki
   EAS build'e biner.
   → **2 ✅ KAPANDI** (2026-07-30, backend `644c0b2`): `simulate_route_movement.js`
   — dürüst fizik (yazılan hız = adım hızı; rampa 12→60 DB'de kanıtlı, 60 km/h×10sn
   =167m ✓), koordinat çözümü route_json(sayısal)→enterprise JOIN→SKIP (sözlük
   BİLİNÇLİ yok; 00009 5.862 km'lik uzak dropoff'u dürüstçe gösterdi), varışta
   hız-0 keepalive, opsiyonel `--complete` gerçek API akışıyla (DB bypass yok).
   pm2: `fleet-sim-route`. **Uçtan uca kanıt:** TLP-26-00010 Utrecht→Rotterdam
   penceresinde sim sürdü, telefonda gerçek complete → worker özeti:
   `pts=5, km=1.40, alert_counts={task_started:1, task_completed:1}` — sistemin
   İLK gerçek-fizik sefer özeti (00009: pts=8, km=0.97). TZ tuzağı YOK kanıtı:
   DB Etc/UTC, now()=localtimestamp → without-tz kolonlar fiilen UTC.
   **Dersler/backlog:** (a) ÇİFT-YAZAR ÇAKIŞMASI — eski `fleet-sim` keepalive
   aynı cihaza sabit konum basıp km'yi şişirir; testte elle durduruldu; v2.1:
   keepalive aktif-seferdeki (in_progress görevli) araçları ATLASIN. (b) Mobil
   RouteMap dispatcher-doğumlu görevde rota çizmiyor (route_json boş, Google
   Directions metin adresle sessiz düşüyor olabilir) — ayrı inceleme kalemi.
   (c) Worker restart'ı /opt/enterprise'ta = fleet-enterprise-01 (prod-01 değil)
   — operasyon notu.
   (d) **fleet-sim v3 "Filo Modu" (Cem fikri, 2026-07-30 kapanış):** real-life
   benzeri çoklu araç + çoklu rota. Tasarım: TEK daemon, iki mod — her tikte
   DB'den keşif: koordinatı çözülebilen her in_progress görev → hareketli araç;
   kalan filo → statik keepalive. Çift-yazar sorunu kökten çözülür (cihaz başına
   tek yazar). Araç başına hız profili (FEAT-007-EXT stilleri), faz kaydırmalı
   tik. HERE polyline + ADXL345 sentezi bilinçli sonraya. SIRA: pipeline
   sprint'i (tek araç rig yeter) → v3 filo modu (FN-04/çoklu-exception + demo
   canlı filo görüntüsü için) → demo.

## PIPELINE SPRINT KAPANIŞI (2026-07-31) — FEAT-010 Phase 1 UÇTAN UCA CANLI ✅
**Dilim 1** `exception_events` hypertable: staging id=5 / prod id=17, retention 90g
(job 1000/1001), 3 index, 18 enum (v1.3 dahil). SPEC DÜZELTMESİ: çift-PK hatası
→ yalnız kompozit PK (id, occurred_at). Migration `1782600000000`, iki DB ayna.
**Dilim 2** `plugins/exceptionMonitors.js` (`fa9bf3b`): FN-01/03/05 aktif,
FN-02/04 guard'lı pasif, FN-06 logger + FN-07 DB-dedup (10dk NOT EXISTS).
Rig kanıtları: driver_offline high ORGANİK (DAGO-0412, sipariş edilmeden!) +
driver_location_mismatch medium (00011, dist=47237m, matris ✓) + eta_delay
critical (dev=697dk, kalan=664.5km, matematik ✓). Dedup canlı kanıtlı (00011
offline'ı araç-bazında yutuldu — doğru davranış).
**Dilim 3** `routes/exceptions.js` (`203a580`): FN-10 (company-scope liste,
filtreler) + FN-11 (acknowledge→acknowledged; manual_replan/reassign/dismiss→
resolved+audit). Durum makinesi 4 yönden kanıtlı (dup-ack 404, kapalıya 404).
**ŞİRKET İZOLASYONU ÇİFT KANITLI:** offline→Tulip Lojistik, mismatch+eta→Dobbe;
admin@fleet.com yalnız Tulip'i, dispatcher UI oturumu yalnız Dobbe'yi gördü.
**Dilim 4** `useExceptions.ts` + `exceptions/index.tsx` (`32d40c4`) + routes
girişi (`4d1b0af`): 20sn polling, severity rozetleri, TR etiketler, payload
özeti, Onayla/Çöz dialogu. UI'dan 2 olay çözüldü → audit: resolved |
manual_replan | has_user=t. **Zincir: monitör→hypertable→API→UI→resolve→audit.**
**DERSLER:** (e) enterprise HOST'ta node YOK — bütünlük kapısı container İÇİNDE
koşulur (`docker compose exec ... node --check`). (f) Notistack kurulu DEĞİL
(yalnız spec/ADR metninde) — FN-12 sayfa-içi vurguyla MVP'lendi, toast cila.
(g) staging kullanıcı evreni ≠ prod (admin@fleet.com=Tulip; Dobbe'nin staging
admin'i YOK — demo hazırlık boşluğu).
**SPRINT SONRASI BACKLOG:** rig temizliği (00011 scheduled_start/end NULL +
görev durumu kararı — Cem); Dobbe staging admin kullanıcısı; DAGO-0412
çapraz-şirket araç bağı; Notistack toast (FN-12 tam); FN-14 tel:/Focus-on-Map;
FN-09 MQTT push; company-bazlı eşik override; köprüye scheduled_start/end
yazımı; keepalive hedef listesi (v3'te kökten çözülür).
**SIRA:** fleet-sim v3 Filo Modu → Demo 🏁 → Pencere.
5. FEAT-010 exception pipeline'ının kendisi (5 monitör + UI) ayrı sprint.

---

## Sonraki hamle sırası (Cem onayı: "hepsini sırayla kabul", 2026-07-28)

- ~~**A2) Köprü title cilası**~~ ✅ KAPANDI (yukarıda).
- **B) FEAT-010 — Automated Exception Handling:** ~~SPEC TURU~~ ✅ v1.8'de KAPANDI + **FN-18
  (karar logu) CANLI** (2026-07-29, yukarıda). Kalan: frontend entegrasyonu (sıradaki iş) →
  FN-19/20 → exception pipeline sprint'i.
- **C) ADR-0014 — Gerçek HERE Routing + production cutover penceresi.** Cem'in zaman-koordinasyon
  fikri (görev süresi + başlangıç → hesaplanan ETA; hedef<ETA = sert bloke "görev süresinden kısa
  olamaz", hedef>ETA = "erken varış, teslim koordinasyonu kurdun mu?" yumuşak uyarı) bu pencereye
  bağlı — gerçek ETA olmadan uyarılar yanıltıcı; (a) form-level "yaklaşık" etiketli validasyon
  erken yapılabilir, (b) gerçek ETA HERE ile.
  **YENİ ürün kararı (Cem, 2026-07-30):** HERE `routingMode: fastest | shortest`
  (Google Maps'teki en-kısa-zaman/en-kısa-mesafe ayrımının karşılığı) — kim seçecek:
  şirket ayarı mı, görev bazlı mı, sabit politika mı? ADR-0014 canlıya alma
  penceresinin karar listesine eklendi; mock bu ayrımı üretemez (yol ağı yok).
- **D) Draft Retention Policy** (backlog #1 çözümü).