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
`95d1891` metadata + Logistics & Constraints (Strateji 3) → `27d6a36` TS2322/TS7006 fix.

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

1. **Mobil beta build (düşük risk):** TestFlight/Expo beta expired. `RD-NL-78` sürücüsünde
   `has_token = f` (token yok). Yeni IPA/APK derle → sürücü login → `usePushNotifications`
   token'ı `POST /api/push/register` ile kaydeder → `has_token = t`. Mobili değiştirmedik;
   build-number bump + expiry yenileme. EAS: proje `ro3Bh1o33z`, bundle `com.tulipfleet.app`,
   iOS Build 32 / Android vCode 28 baz.
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

### Backlog kalemi 1 — Köprü title üretimi (KOLAY, veri köprüde HAZIR)

`AdminTasks.js:212` → `task.title || task.task_no || "-"`. Dispatcher görevlerinde `title` boş
geldiği için sürücü/admin listesinde `TLP-26-000XX` kodu görünüyor (okunabilir başlık değil).
Köprü `start_location_str`/`end_location_str`'i ZATEN alıyor (push body'sinde kullanıyor:
`${task_no}: ${start} → ${end}`). Tek satır: INSERT'te `title` boşsa
`title = \`${start_location_str} → ${end_location_str}\``. Sıfır yeni veri akışı; köprüde 1 satır.

### Backlog kalemi 2 — scheduled_start/end eşlemesi (ZOR: veri 3 katmanda EKSİK)

"15 dk cila" DEĞİL. `time_window_start/end` verisi köprüye HİÇ ULAŞMIYOR:
- Grup B (time_window) `enterprise.dispatch_tasks`'a bile yazılmıyor (Strateji 3, frontend-state).
- Dispatcher approve → köprü çağrısı `time_window` GÖNDERMİYOR (köprü payload'ında yok — kanıtlı).
- Köprü INSERT'i `scheduled_start`/`scheduled_end` kolonlarını HİÇ kullanmıyor.
Düzeltme = 3 katman: (a) dispatcher approve time_window'u köprüye göndersin; (b) köprü payload'ına
+ `scheduled_start/end`; (c) INSERT'e + kolon. 3 dosya, 2 repo. Ön koşul: `public.tasks`'ta
`scheduled_start/end` kolonlarının varlığı canlı `\d tasks` ile doğrulanmalı (mobil gönderiyor ama
köprü kullanmıyor — kolon var mı kanıtlanmadı).

### Backlog kalemi 3 — INFRA-B: iki kanalın ortak task kontratı

Mobil admin görevleri VRP kısıtlarından (hazmat/m³/kg/skill) YOKSUN doğuyor; dispatcher topluyor.
FEAT-020 spec'i yazılırken `StrictTaskConstraints` (src/types/metadata.ts) iki kanal için ortak
kanonik standart yapılmalı — mimari bütünlük. INFRA-B'nin somut gerekçesi.

## Sonraki hamle seçenekleri (karar bekliyor)

- **A) Milestone 0'ı staging'de mühürle + Engel 1 (mobil beta):** demo-ready ol, prod cutover'ı
  mock→HERE ile birlikte ayrı pencereye bırak. (Önerilen.)
- **A2) Köprü cilası (demo sonrası, ~15 dk kısmı):** Backlog #1 (title üretimi) — düşük risk,
  veri hazır, sürücü deneyimini hemen iyileştirir. Backlog #2 (scheduled) ayrı, daha büyük.
- **B) FEAT-010 — Automated Exception Handling:** haftalık trenin ilk vagonu; temporal "KAÇIRIR"
  feasibility sinyali proto-exception feed'i.
- **C) ADR-0014 — Gerçek HERE Routing:** mock solver'ı kapatıp HERE Tour Planning REST API'sini
  production key ile canlı matrise bağlamak (spatial/temporal scorer'lar haversine→gerçek sürüş).
  Production cutover ile aynı pencerede.
- **D) Draft Retention Policy:** yukarıdaki backlog #1'in çözümü.
