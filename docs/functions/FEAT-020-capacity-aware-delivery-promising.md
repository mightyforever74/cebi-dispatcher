# FEAT-020 — Capacity-Aware Delivery Promising

| Field | Value |
|---|---|
| **Feature ID** | FEAT-020 |
| **Source** | Wishlist W24 — "base feature of cargo mgmt (kanban approach)" |
| **Frequency rating** | Common |
| **Tulipfleet Phase** | Phase 1.1 (statik veri toplama, **TAMAMLANDI** 2026-10-12) → Phase 1.2 (statik binary-gate matching, **spec yazıldı, implementasyon henüz Cem'in makinesinde çalıştırılmadı**) → Phase 1.3a (tarihsel ledger/BI altyapısı, **TAMAMLANDI 2026-10-13** — migration + worker staging'de E2E doğrulandı, sonra prod'a deploy edildi) → Phase 1.3b (sürücü canlı kapasite bildirimi + configurable toggle, **bu v2.0'da spec'lendi, implementasyon dışı, §6**) |
| **Status** | **v2.0 (2026-10-13, Cem'in genişlettiği vizyon)** — "hızlı çözüm" tek katmanlı yaklaşım yetersiz bulundu; FEAT-020 üç katmanlı mimariye genişletildi: (A) statik binary-gate [v1.0'dan değişmedi, implementasyon Cem'in makinesinde henüz çalıştırılmadı], (B) tarihsel ledger/yield-management verisi [**TAMAMLANDI 2026-10-13** — `enterprise.trip_summaries` genişletmesi, §5], (C) sürücü canlı kapasite bildirimi + configurable toggle [backlog, §6]. Cem'in sıralama kararı: bu turun TDD'si **Katman B (ledger)** ile başladı ve tamamlandı; sıradaki iş Katman A'nın implementasyonunun makinede çalıştırılması |
| **Gatekeep bulgusu** | `docs/adr/ADR-0004-database-strategy.md` §6.4 (v3, 2026-05-14), Phase 1.1 migration'ından ÖNCE şu kolon adlarını onaylamıştı: `capacity_volume_m3`, `capacity_weight_kg`, `vehicle_class`, `hazmat_classes`. Phase 1.1'de gerçekte uygulanan (migration `1783400000000`, tulipfleet-backend) adlar farklı: `cargo_capacity_volume_m3`, `cargo_capacity_weight_kg`, `hazmat_certified_classes` — ve `vehicle_class` hiç eklenmedi. Bu spec gerçekte CANLI olan adları esas alır (aşağıda §2). `vehicle_class`'ın eksikliği bu feature'ı bloke etmez — talep tarafı (`CapacityRequired`) hiç böyle bir alan taşımıyor; ADR'daki `vehicle_class` muhtemelen ayrı bir feature (FEAT-002 HERE Tour Planning truck-aware routing) için düşünülmüştü. **Açık madde:** ADR-0004 §6.4'ün bu gerçek adlarla amendment edilmesi — ayrı, küçük bir doküman işi, Cem'in onayı bekleniyor |

---

## 1. Feature description

### 1.1 Problem

Kanban dispatch board'da (dispatcher `optimize/index.tsx`) her görev için araçlar skorlanıp sıralanıyor (`SCORERS` registry: spatial, temporal, compliance — hepsi `ActiveScorer`). Kargo/kapasite skoru (`cargoScorer`) şimdiye kadar `InactiveScorer` idi çünkü:
- **Talep tarafı** (görevin ne gerektirdiği) zaten vardı: `enterprise.dispatch_tasks.capacity_required` jsonb → dispatcher `StrictTaskConstraints.capacity_required: CapacityRequired = { volume_m3, weight_kg, hazmat_classes }` (`src/types/metadata.ts`).
- **Arz tarafı** (aracın ne taşıyabildiği) yoktu: `public.vehicles`'ta hiç kapasite kolonu yoktu.

Phase 1.1 (2026-10-12) arz tarafını kapattı: `public.vehicles.cargo_capacity_volume_m3/weight_kg` + `hazmat_certified_classes` (nullable/additive, backend validasyonlu, mobil admin ekranlarında girilebilir). Bu doküman, iki tarafı birbirine bağlayan **matching logic**'i tanımlar.

### 1.2 Kapsam kararı (Cem onaylı, 2026-10-12; v2.0'da 2026-10-13'te üç katmana genişletildi — §5/§6)

**Not (2026-10-13):** Bu alt bölüm v1.0'dan kalma iki-katmanlı çerçeveyi anlatıyordu; Cem'in v2.0 genişletmesiyle (bkz. yukarıdaki Status satırı) mimari üç katmana çıktı. Aşağıdaki isimlendirme buna göre düzeltildi (eski metinde "Katman B" diye anılan şey aslında bugünkü **Katman C**'dir):

- **Katman A — statik kapasite ile binary-gate (implementasyon spec'i yazıldı, Cem'in makinesinde henüz çalıştırılmadı — §3 FN-1/FN-2, §7):** `public.vehicles`'taki statik kolonlar kaynak. Veri yoksa feature'ı bloke etmez (graceful degradation).
- **Katman B — tarihsel ledger / yield-management verisi (TAMAMLANDI 2026-10-13 — §5):** `enterprise.trip_summaries` genişletmesi, worker tarafından otomatik doldurulur.
- **Katman C — sürücü canlı kapasite bildirimi + configurable toggle (backlog, Phase 1.3b, implementasyon dışı — §6):** Şirketlerin IoT/dijital olgunluk seviyesi değişken olduğu için kapasite takibi şirket/araç bazında zorunlu veya opsiyonel yapılabilir olmalı; aktifse sürücünün mobil uygulamadan bildirdiği **anlık boş kapasite** statik değerin önüne geçer.

---

## 2. Veri sözleşmesi (Katman A)

### 2.1 Arz (vehicle) — gerçek canlı kolon adları

```
public.vehicles.cargo_capacity_volume_m3   numeric, NULL = veri yok
public.vehicles.cargo_capacity_weight_kg   numeric, NULL = veri yok
public.vehicles.hazmat_certified_classes   text[] NOT NULL DEFAULT '{}'  — boş array = sertifika yok
```

### 2.2 Talep (task) — zaten var, değişmiyor

```ts
interface CapacityRequired {
  volume_m3: number | null;      // null = hacim kısıtı yok
  weight_kg: number | null;      // null = ağırlık kısıtı yok
  hazmat_classes: string[];      // boş array = tehlikeli madde yok
}
```

### 2.3 Dispatcher tarafı eksik bağlantı (Gatekeep bulgusu, açık — bu turun kapsamı DIŞINDA)

`ScoringVehicleSnapshot` (dispatcher `scoring/types.ts`) şu an kargo alanlarını taşımıyor — bu spec'le birlikte eklenecek (bkz. §4.1). Ama bu alanları **gerçek veriyle** dolduracak zincirin bir halkası eksik: dispatcher'ın araç listesi `tulipfleet-enterprise-backend`'in `GET /api/dispatcher/vehicles` route'undan geliyor (`routes/vehicles.js`), ve bu route **açık kolon listesiyle** SELECT yapıyor — `cargo_capacity_*`/`hazmat_certified_classes` bu listede yok (route'un kendi yorumu bunu zaten öngörmüştü: *"Phase 1.1: will add capacity columns... per ADR-0004 v3 §6.4"*, ama hiç yapılmadı). Yani: **cargoScorer'ı bu turda Active yapıp testini geçirsek bile, dispatcher UI'da gerçek veri akana kadar her araç "veri yok" fallback'ine (eligible:true, nötr) düşecek.** Bu ayrı, küçük bir backend değişikliği (`tulipfleet-enterprise-backend`, tek satır SELECT genişletme) — bu dokümanda **FN-3** olarak not edildi, bu turun TDD kapsamına Cem'in net onayı olmadan dahil edilmedi.

---

## 3. Fonksiyon listesi

### FN-1 — `cargoScorer.score(vehicle, task): ScoreDetail` (dispatcher, bu turda implemente edilir)

**Konum:** `src/services/dispatch/scoring/scorers/cargoScorer.ts` (şu an `InactiveScorer` — `ActiveScorer`'a çevrilir)

**Algoritma (binary gate + graceful degradation):**

1. Görevin kısıtı yoksa (`task.constraints?.capacity_required` undefined, veya `volume_m3`/`weight_kg` ikisi de null VE `hazmat_classes` boş) → kısıtsız görev, her araç `eligible: true`, `value: 1.0`, nötr memo.
2. Aracın kargo verisi yoksa (`cargo_capacity_volume_m3` VE `cargo_capacity_weight_kg` ikisi de null — hazmat her zaman dolu array döner, veri eksikliği göstergesi değil) → **fallback (Cem onaylı, 2026-10-12): `eligible: true`, `value: 1.0` (nötr), dürüst memo** ("Kapasite verisi yok — bu araç elenmedi, skorlamaya dahil edilmedi"). Bloklamak yerine geçirmek — Graceful Degradation ilkesiyle (registry.ts header yorumu) birebir aynı desen (compliance scorer'ın "veri yok → 0.5 nötr" davranışına paralel, ama burada nötr değer 1.0 çünkü binary gate'te "veri yoksa engelleme" anlamına geliyor, ortalama değil).
3. **Hazmat kontrolü (binary gate, Cem onaylı — kesin eleme):** `task.capacity_required.hazmat_classes` boş değilse VE bu sınıflardan biri aracın `hazmat_certified_classes`'ında yoksa → `eligible: false`, `value: 0`, memo hangi sınıfın eksik olduğunu söyler. **Bu kontrol, hacim/ağırlık verisi olmasa da HER ZAMAN çalışır** (hazmat sertifikasızlık asla "veri yok" sayılmaz — array her zaman dolu/boş olarak gelir, NULL değil).
4. **Hacim/ağırlık kontrolü (binary gate, Cem onaylı — kesin eleme):** Aracın verisi varsa (adım 2'yi geçtiyse) ve `task.volume_m3` dolu VE `vehicle.cargo_capacity_volume_m3 < task.volume_m3` → `eligible: false`, `value: 0`. Aynı kural `weight_kg` için. İkisi de sığıyorsa → `eligible: true`, `value` doluluk oranına göre (ör. `1 - max(usedVolumeRatio, usedWeightRatio)` — ne kadar boş kapasite kalıyorsa o kadar yüksek skor, diğer araçlar arasında sıralama için).

**Memo dili:** kullanıcı dilinde, teknik detay yok (compliance/cargoScorer'ın mevcut InactiveScorer.reason deseniyle aynı ilke — "UX turu 04.08" yorumunda zaten belirtilmiş).

### FN-2 — Kanban UI kargo-uygunsuzluk rozeti (dispatcher, bu turda implemente edilir)

**Konum:** `src/layouts/dispatcher/tasks/optimize/index.tsx` (badge inşa bloğu, satır ~790-828 — compliance scorer'ın `entryBlocked` rozetiyle AYNI desen)

cargoScorer modu aktifken, `r.detail.eligible === false` olan araçlar için mevcut `ColumnBadge[]` mekanizmasına yeni bir rozet eklenir (`icon: "block"`, `tone: "warn"`, metin memo'dan). Yeni state/mimari gerekmiyor — `ScoreDetail.eligible` alanı zaten bu amaç için `types.ts`'te önceden ayrılmıştı ("Phase 1.1 hazirligi" yorumu).

### FN-3 — Enterprise-backend vehicles route'una kargo kolonlarını ekleme (AYRI MADDE, bu turun TDD kapsamı dışı, ADR amendment'la birlikte ele alınacak)

`tulipfleet-enterprise-backend/routes/vehicles.js`'teki `GET /api/dispatcher/vehicles` SELECT listesine `cargo_capacity_volume_m3, cargo_capacity_weight_kg, hazmat_certified_classes` eklenir. FN-1/FN-2 bu olmadan da test edilebilir/çalışır (unit seviyesinde saf fonksiyon + UI rozet mantığı), ama gerçek üretim verisiyle çalışmaz. **Bu, Cem'in ADR-0004 kararına bağlı — ayrı onay bekliyor.**

---

## 4. Tip değişiklikleri

### 4.1 `ScoringVehicleSnapshot` genişletmesi (`scoring/types.ts`)

```ts
export interface VehicleCargoCapacity {
  volumeM3: number | null;
  weightKg: number | null;
  hazmatCertifiedClasses: string[];
}

export interface ScoringVehicleSnapshot {
  // ...mevcut alanlar değişmez...
  /** Phase 1.1 statik veri. undefined = alan hiç gelmedi (FN-3 kapanmadan hep bu durum); null alanlar = araç kaydında veri yok. */
  cargoCapacity?: VehicleCargoCapacity | null;
}
```

---

## 5. Katman B — Tarihsel Ledger / Yield Management verisi (Phase 1.3a, 2026-10-13, TAMAMLANDI)

### 5.1 Gatekeep bulgusu — sıfırdan tablo kurulmadı

Cem'in istediği "her görev eşleşmesi/tamamlanmasında kalıcı loglama" **zaten var**: `enterprise.trip_summaries` (FEAT-010 FN-19, migration `1782500000000`, worker `tulipfleet-enterprise-backend/plugins/tripSummaryWorker.js`). Worker saatlik çalışır, `status='completed'` olup henüz özetlenmemiş `public.tasks` satırlarını tarar, `public.vehicles`/`public.locations`/`public.alerts` ile zenginleştirip `enterprise.trip_summaries`'e INSERT eder (idempotent, `ON CONFLICT (task_id) DO NOTHING`). Zaten taşıdığı alanlar: `company_id`, `vehicle_id`, `driver_id`, `planned_start/end`, `actual_start/end`, `planned/actual_distance_km`, `eta_deviation_min`, `alert_counts`. Sıfırdan yeni bir ledger tablosu kurmak **duplikasyon** olurdu — bu spec bu tabloyu genişletir.

**Zincir:** dispatcher `enterprise.dispatch_tasks` (pickup_location/dropoff_location/capacity_required'ı taşıyan asıl kayıt) → approve → `public.tasks` (sürücü-facing, `enterprise_dispatch_task_id` FK köprüsü, migration `1782100000000`, nullable — legacy/manuel görevlerde boş) → worker bu köprüden `enterprise.dispatch_tasks`'a geri JOIN olup kargo/rota verisini çeker.

### 5.2 Migration — `enterprise.trip_summaries` genişletmesi (additive, nullable)

```sql
ALTER TABLE enterprise.trip_summaries
  ADD COLUMN IF NOT EXISTS cargo_volume_m3    numeric,
  ADD COLUMN IF NOT EXISTS cargo_weight_kg    numeric,
  ADD COLUMN IF NOT EXISTS hazmat_classes     text[],
  ADD COLUMN IF NOT EXISTS pickup_location    jsonb,
  ADD COLUMN IF NOT EXISTS dropoff_location   jsonb,
  ADD COLUMN IF NOT EXISTS gross_revenue_eur  numeric;
```

Yeni GRANT gerekmiyor — `enterprise_backend` rolü zaten `GRANT ALL ON ALL TABLES IN SCHEMA enterprise` ile bu tabloya tam yetkili (migration `1782000000000`), tablo-seviyesi grant yeni kolonları otomatik kapsar.

**Gatekeep karar — `gross_revenue_eur` (Cem onaylı, 2026-10-13):** Bu kolon **nullable ve bu turda hiçbir worker tarafından yazılmaz** (her zaman NULL kalır). Gerekçe: TulipFleet'in ilk finansal feature'ı olarak ayrılmış `FEAT-015-automated-freight-audit.md` bilerek **Phase 2 / customer-funded trigger** (ADR-0011 §6) etiketiyle geriye bırakılmış — fiyatlandırma/fatura mantığı kurmak o kapıyı erken açar. Bu kolon sadece **şema hazırlığı**: ileride FEAT-015 veya basit bir "sefer ücreti" giriş ekranı bu alanı `UPDATE` ile dolduracak. `cargo_volume_m3`/`cargo_weight_kg`/`hazmat_classes`/`pickup_location`/`dropoff_location` ise worker tarafından HER turda yazılır (kaynak veri varsa).

### 5.3 FN-4 — `tripSummaryWorker.js` SQL genişletmesi

`SUMMARY_SQL`'deki `cand` CTE'sine `LEFT JOIN enterprise.dispatch_tasks dt ON dt.id = t.enterprise_dispatch_task_id` eklenir (köprü nullable — dispatcher'dan gelmeyen görevlerde `dt.*` hep NULL, graceful degradation, worker'ın mevcut felsefesiyle birebir). INSERT'e eklenen kolonlar:

```sql
(dt.capacity_required->>'volume_m3')::numeric       AS cargo_volume_m3,
(dt.capacity_required->>'weight_kg')::numeric        AS cargo_weight_kg,
CASE WHEN dt.capacity_required->'hazmat_classes' IS NOT NULL
     THEN ARRAY(SELECT jsonb_array_elements_text(dt.capacity_required->'hazmat_classes'))
     ELSE NULL END                                   AS hazmat_classes,
dt.pickup_location,
dt.dropoff_location
```

`gross_revenue_eur` INSERT listesine hiç eklenmez (§5.2 kararı — DEFAULT NULL kalır).

### 5.4 Test yaklaşımı — Cem kararı (2026-10-13): Staging E2E

`tripSummaryWorker.js`'nin ilk hali (FEAT-010 FN-19) hiç unit test almadı — tek büyük parametresiz `INSERT...SELECT` CTE'si, bu repoda SQL'i mock'layan/in-memory Postgres çalıştıran bir test altyapısı yok (confirmed: `package.json`'da pg-mem/pglite/testcontainers yok). **Cem kararı: Staging E2E, orijinal FEAT-010 FN-19 presedentiyle aynı** — zayıf/mock'lanmış bir SQL-string contract testi yerine, §5.5'teki 5 adımlı planla staging'de uçtan uca doğrulanır. Bu genişletme için ayrı bir unit test dosyası YAZILMAZ (bilinçli karar, presedent tekrarı).

### 5.5 Test planı (Katman B, staging doğrulaması — TAMAMLANDI, 2026-10-13)

**Gatekeep bulgusu (kritik, 2026-10-13):** Test planı yazılırken `tulipfleet-enterprise-backend`'in gerçek bir staging ortamı olduğu varsayıldı (orijinal FEAT-010 FN-19 presedenti). Gerçekte bu servis **27 Eylül 2026 cutover'ından beri tek bir deployment** olarak çalışıyor (`/opt/enterprise`, `fleet-enterprise-01`) ve **prod DB'sine (`fleet_tracking`) bağlı** — ayrı bir staging bağlantısı yoktu (`docs/ENTERPRISE_INFRASTRUCTURE.md` satır 330). Bu, migration'ı güvenle test etmeden prod'a uygulamayı gerektirecekti.

**Çözüm (uygulandı, kalıcı altyapı):** `fleet-enterprise-01` üzerinde ikinci, izole bir deployment kuruldu — `/opt/enterprise-staging` (container: `tulipfleet-enterprise-backend-staging`, host portu `3002`, `DATABASE_URL` → `fleet_tracking_staging`, ayrı Docker ağı `enterprise-staging-net`). Prod deployment'ına (`/opt/enterprise`, port 3001) hiç dokunulmadı. Bu ikinci deployment artık kalıcı — gelecekteki Katman A/C doğrulamaları da buradan yapılabilir (dispatcher UI henüz buna bağlı değil — "minimal" seviye, Cem onaylı; dispatcher'ı da staging'e bağlamak "tam seviye", backlog).

**Gerçekleşen adımlar ve sonuçlar:**
1. Migration `fleet_tracking_staging`'e uygulandı — `\d enterprise.trip_summaries` ile 6 yeni kolon nullable doğrulandı. ✓
2. Dispatcher UI yerine doğrudan SQL ile simüle edildi (minimal seviye, dispatcher henüz staging'e bağlı değil): `enterprise.dispatch_tasks` + köprülü `public.tasks` (`status='completed'`, gerçek demo kimlikleri — Dobbe Transport / Pieter van den Berg) satırları eklendi.
3. Worker container restart edilip (`boot` tetikleyicisi, 30s) manuel tetiklendi.
4. Sonuç: `enterprise.trip_summaries`'de `cargo_volume_m3=12.5`, `cargo_weight_kg=900`, `hazmat_classes={3,8}`, `pickup_location`/`dropoff_location` dolu, `gross_revenue_eur` NULL — tam beklenen. ✓
5. Köprüsüz (legacy, `enterprise_dispatch_task_id IS NULL`) görev testi: 6 kolon da NULL, worker hatasız çalıştı (graceful degradation doğrulandı). ✓
6. Test verisi `fleet_tracking_staging`'den temizlendi.
7. Migration + worker kodu `fleet_tracking` (prod) ve `/opt/enterprise`'a da deploy edildi — healthcheck `healthy`, DB bağlantısı doğrulandı, hata yok.

---

## 6. Katman C — Backlog taslağı (implementasyon dışı, kayıt amaçlı)

Cem'in 2026-10-12/13 kararları:

1. **Configurable scope (2026-10-13 kesinleşti): şirket seviyesi.** Presedent: `public.companies.dispatch_mode` (ADR-0004 §6.3) ile AYNI desen — yeni bir `public.companies.cargo_capacity_tracking text NOT NULL DEFAULT 'optional' CHECK (IN ('required','optional','off'))` kolonu. Araç seviyesi granülerlik reddedildi (basitlik tercih edildi).
2. **Sürücü girdisi önceliği:** Config `'required'` veya `'optional'` iken, sürücünün mobil uygulamadan bildirdiği anlık boş kapasite, statik `cargo_capacity_*` değerinin ÖNÜNE geçer (compliance scorer'ın `useComplianceAssessment` REST-senkron besleme desenine benzer bir akış gerekir — ama kaynak statik DB değil, sürücü girdisi, `write-back`). Bu canlı bildirim aynı zamanda §5'teki ledger'ı besleyecek (worker'ın hangi veriyi önceliklendireceği — statik mi canlı mı — ayrı bir karar, henüz spec'lenmedi).
3. **Fallback zaten §3 FN-1 adım 2'de Katman A'ya işlendi** — veri yoksa (ne statik ne canlı) `eligible:true` + nötr, hiçbir zaman bloklamaz.

Bu backlog maddesi ayrı bir spec turu gerektirir (mobil ekran tasarımı, yeni endpoint, `companies.cargo_capacity_tracking` migration + backend validasyonu) — bu doküman sadece ilkeyi kayda geçiriyor, tasarlamıyor.

---

## 7. Test planı (Katman A, Phase 1.2 — v1.0'dan değişmedi, implementasyon Cem'in makinesinde henüz çalıştırılmadı)

Dosya: `src/services/dispatch/scoring/scorers/cargoScorer.test.ts` (yeni, RED→GREEN)

1. Görev kısıtsız → her araç eligible:true, value 1.0
2. Araç verisi yok (volume+weight null, hazmat boş array) → eligible:true, value 1.0, fallback memo
3. Hacim yetersiz → eligible:false, value 0
4. Ağırlık yetersiz → eligible:false, value 0
5. Hacim+ağırlık yeterli, hazmat gerektirmiyor → eligible:true, value doluluk oranına göre (0 < value ≤ 1)
6. Hazmat gerekli + araç sertifikasız → eligible:false, value 0 (hacim/ağırlık yeterli olsa da)
7. Hazmat gerekli + araç sertifikalı (tam eşleşme) → eligible:true
8. Hazmat gerekli + araç kısmi sertifikalı (gerekli sınıflardan biri eksik) → eligible:false
9. Araç verisi YOK ama hazmat gerekiyor ve sertifika da yok → **hazmat gate önce çalışır** → eligible:false (adım 2'nin "veri yok" fallback'i hazmat'ı asla ezmez)
10. Registry entegrasyonu: `SCORERS` dizisinde `cargoScorer.available === true` artık
11. Kanban badge: `eligible:false` → `ColumnBadge` listesinde `tone:"warn"` rozeti üretiliyor (optimize/index.tsx birim testi veya mevcut test dosyası varsa oraya ekleme)
