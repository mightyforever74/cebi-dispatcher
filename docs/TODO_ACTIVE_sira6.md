# TODO_ACTIVE — Sıra 6 sonrası (20.06.2026)

## Sıra 6 — TAMAMLANDI ✓ (TODO'dan çıkarıldı)
Hibrit Köprü API + Plan Onay Akışı. Commit'ler SESSION_NOTES'ta.

## BEKLEYEN — yüksek öncelik

### 1. GÜVENLİK: Şifre rotasyonu (sohbetlerde sızdı)
- `enterprise_backend` DB şifresi → ALTER ROLE + .env.local + iki sunucu güncelle
- `fleetadmin` DB şifresi → ALTER ROLE + backend .env (prod+staging) + docker-compose.yml
- Eski classic PAT (`tulipfleet-deploy-2026-05`) ZATEN SİLİNDİ ✓, yeni PAT üretildi, staging remote güncellendi
- UFW 5433'ü koruyor (public DENY), meantime risk düşük ama rotate edilmeli
- NOT (25.06.2026): rotasyon ileriye alındı. Çok adımlı, production kesinti riski (fleetadmin tüm .env/docker-compose/batch/PM2'de). Tam kapsam çıkarılıp acelesiz, planlı pencerede yapılacak. Telaşla yapılmayacak.

### 2. Sıra 6 PRODUCTION DEPLOY (köprü staging→production)
- Köprü şu an SADECE staging'de (`/opt/fleet/backend-staging`), kanıtlandı
- Production (`/opt/fleet/backend`, Docker fleet-backend, 5 hafta uptime) köprüyü BİLMİYOR
- WORKING_RULES deploy: production backup → staging→production kopya → sürüm no güncelle → health → release commit
- DİKKAT: production container, "sadece docker restart deploy YASAK (.env yansımaz)" — düzgün rebuild/deploy gerekir
- INTERNAL_BRIDGE_TOKEN production .env'ine de eklenmeli (fail-closed)

**GÜNCELLEME (25.06.2026) — kısmi deploy yapıldı + köprü kodu BİLİNÇLİ bekletildi:**
- ✅ MIGRATION production'a UYGULANDI: `public.tasks.enterprise_dispatch_task_id` (uuid, nullable) + FK `enterprise.dispatch_tasks(id) ON DELETE SET NULL`. `\d public.tasks` ile doğrulandı. Additive, transaction'lı, idempotent. FK hedefi kanıtlandı (production fleet_tracking içinde enterprise.dispatch_tasks VAR).
- ✅ INTERNAL_BRIDGE_TOKEN production .env'de ZATEN VAR (`grep -c` → 1). Önceden eklenmiş.
- ⏸️ KÖPRÜ KODU production `server.js`'te HÂLÂ YOK (`grep internal/bridge` boş) ve DEPLOY EDİLMEDİ.
- BEKLETME GEREKÇESİ (kanıt): production `enterprise.dispatch_tasks` = **0 SATIR**. Dispatcher production'da gerçek görev ONAYLAMIYOR (henüz demo/geliştirme fazı; Sıra 6.5 demo seed bekliyor). Köprünün taşıyacağı onaylı görev YOK.
- KARAR: köprü kodu rebuild'i (5 hafta uptime production container, kesinti riski) ancak dispatcher production'da GERÇEK görev onaylamaya başlayınca yapılacak. O ana kadar migration + token hazır bekler; production container'a DOKUNULMAYACAK. (İlke: entegrasyon deploy'undan önce hedef tablonun gerçek veri ürettiği kanıtlanır — "We verify, no assumptions".)

### 3. Staging test verisi temizliği (opsiyonel)
- public.tasks'ta TLP-26-00001 (izole test) + TLP-26-00002 (uçtan uca) — test verisi
- Demo seed öncesi silinebilir, ama staging, zarar yok

## BEKLEYEN — Sıra 6.5: DEMO SEED ("Zamanı 6 Ay Geriye Bükme")

İki katman (ayrı roller):
- Dispatcher tarafı (enterprise_backend): dispatch_tasks, routing_jobs — approve zaten üretiyor
- Admin app tarafı (fleetadmin): fuel_records (0→zengin), alerts (1→zengin), tasks (2→zengin)

Zaman boyutu (geçmişe yayma):
- `tasks.scheduled_start` → Mart 2026'dan Haziran'a, son 6 aya homojen dağıt
- `fuel_records.record_date` → geçmişe yay (idx_fuel_date), consumption_per_100km + cost_per_km matematiksel tutarlı
- `locations.timestamp` → ESP32 device_id eşleşmeli keepalive zaman serisi (fleet-sim PM2 daemon var, şu an stopped)

Tutarlılık:
- companies.code Dobbe için set et (örn. "DOB"), task_no gerçekçi olsun (TLP fallback yerine)
- ESP32-araç-sürücü üçlü tutarlılığı korunmalı (device_assignments active)
- carbon: dispatch_tasks ADD COLUMN carbon_footprint_kg NUMERIC(8,3) + fuel_consumed_liters NUMERIC(8,3) (FEAT-009, additive)

## FEAT-007-EXT Virtual Telematics — yakıt göstergesi (durum: 26.06.2026 kanıtlandı)

### Sütun 1 — Sanal Depo Göstergesi: BACKEND MÜHÜRLENDİ (staging)
- 03-logic saf fonksiyon ✓ / 04-tests 8 Jest yeşil ✓ / 05-integration batch ✓ / üç kanal (GitHub + sunucu + lokal) senkron ✓
- Entegrasyon batch dosyası: `fuelSnapshotBatch.js` (DİKKAT: doküman eskiden "correlationBatch" diyordu — YANLIŞ isim, düzeltildi)
  - repo `tulipfleet-backend`, `main`, `FEAT-007-EXT-virtual-telematics/05-integration/fuelSnapshotBatch.js`
  - son commit `5631a17` (24.06, dosyayı `05-integration/` klasörüne taşıyan rename). COMMIT TEYİDİ KAPALI ✓
  - tasarımı: staging yolundan elle çalıştırılan tek seferlik batch (header: `cd /opt/fleet/backend-staging/...; node fuelSnapshotBatch.js`). Kendi içinde cron/zamanlayıcı YOK.

### PRODUCTION KALICI YAZICI: KANITLANDI YOK (26.06.2026)
- `fuelSnapshotBatch.js` production'da HİÇ YOK (`ls /opt/fleet/backend/...` boş; sadece `backend-staging`'de var, 4623B, 24.06 14:50)
- crontab / cron.d / /etc/crontab / systemd-timer / PM2'de fuel|snapshot işi YOK (PM2'de yalnızca `fleet-sim`[stopped], `fleet-staging`[online])
- production `current_fuel_level` (%74 / %86 / %58) = tek seferlik manuel UPDATE. Kalıcı çözüm (production'a batch deploy + zamanlama VEYA endpoint) BEKLİYOR.

### Gösterge yerleştirme — 3 YER (hepsi aynı veriyi gösterir: `current_fuel_level` / `fuel_capacity`)
- ✅ 1. tulipfleet app · driver menü · araç (`DriverVehicle.js`) — dairesel FuelGauge, commit `7f7ca91`, imzalı release APK, simülatörde %74 doğrulandı. KALAN: i18n `vehicle.noRefuelRecord` çevirisi.
- ✅  2. tulipfleet app · admin menü · araç (mobil RN) — yakıt bölümüne aynı FuelGauge eklendi.
- ✅ 3. dispatcher · araç menüsü (web MUI TS, DB olarak tulipfleet'e bağlı) — sanal şamandıra gösterimi eklendi. TEKNİK NOT: RN `FuelGauge.js` (`react-native-svg`) web'de kullanılamaz, MUI/SVG ile ayrı implementasyon gerekir.

### AYRI EPIC (bu 3'e dahil DEĞİL)
- ⏸️ dispatcher canlı filo hover/popup — mikro-etkileşim tasarımı + state yönetimi (hover → plaka → sağ tık → plaka gizleme + navbar satır bazlı popup). Canlı filo izleme / navbar tasarımı epic'ine bağlı, o epic bitince.

### EPIC KAPANIŞI
- 3 yerleştirme bitince FEAT-007-EXT yakıt göstergesi epic'i kapanır → ROADMAP.md güncelle (Sıra 6 + bu epic DONE).

## BEKLEYEN — diğer (önceki oturumlardan)
- 5.4 dispatcher polish (Sıra 6.5)
- replan endpoint (FEAT-004)
- compliance check endpoint /api/compliance/check (ADR-0012 §4.1)
- Plan review UI (map + timeline + Kanban)
- AdminAlerts.js 3 bug (generic "Uyarı"→alert.title; warning severity undefined→"Info"; vehicle_id→plaka/sürücü lookup="Atanmamış")
- ROADMAP.md Sıra 6 DONE işaretle
- ADR-0014 "tamamlandı" mühürlenmiş olsa da bu durum sadece kod katmanı için geçerlidir; production deploy henüz gerçekleştirilmemiştir. Bir sonraki oturumda sistemin "prod'da çalışıyor" olduğu varsayılmamalıdır. Demo Sonrası Aksiyon Planı:
Sunucu üzerindeki untracked FEAT-007-EXT klasörünü host dışına taşıyarak temizle.
git pull ile bekleyen 21+ commit'i production'a çek.
Production server.js dosyasında hereapi.com araması yaparak sonucun 0 olduğunu, routingProvider.computeRoute kullanımının ise 2 olduğunu doğrula.
