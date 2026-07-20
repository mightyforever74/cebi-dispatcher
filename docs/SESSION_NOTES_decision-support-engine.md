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

## Sonraki hamle seçenekleri (karar bekliyor)

- **A) Phase 4 — Driver Push & Mobile Sync:** approve → `public.tasks`'a düşen görevin sürücü
  mobil uygulamasına (WebSocket/MQTT) anlık düşmesi + "Yeni Görev Atandı" bildirimi.
- **B) Draft Retention Policy:** yukarıdaki backlog #1'in çözümü.
- **C) ADR-0014 — Gerçek HERE Routing:** mock solver'ı kapatıp HERE Tour Planning REST API'sini
  production key ile canlı matrise bağlamak (spatial/temporal scorer'lar haversine→gerçek sürüş).
