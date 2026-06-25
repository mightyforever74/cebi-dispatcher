# TODO_ACTIVE — Sıra 6 sonrası (20.06.2026)

## Sıra 6 — TAMAMLANDI ✓ (TODO'dan çıkarıldı)
Hibrit Köprü API + Plan Onay Akışı. Commit'ler SESSION_NOTES'ta.

## BEKLEYEN — yüksek öncelik

### 1. GÜVENLİK: Şifre rotasyonu (sohbetlerde sızdı)
- `enterprise_backend` DB şifresi → ALTER ROLE + .env.local + iki sunucu güncelle
- `fleetadmin` DB şifresi → ALTER ROLE + backend .env (prod+staging) + docker-compose.yml
- Eski classic PAT (`tulipfleet-deploy-2026-05`) ZATEN SİLİNDİ ✓, yeni PAT üretildi, staging remote güncellendi
- UFW 5433'ü koruyor (public DENY), meantime risk düşük ama rotate edilmeli

### 2. Sıra 6 PRODUCTION DEPLOY (köprü staging→production)
- Köprü şu an SADECE staging'de (`/opt/fleet/backend-staging`), kanıtlandı
- Production (`/opt/fleet/backend`, Docker fleet-backend, 5 hafta uptime) köprüyü BİLMİYOR
- WORKING_RULES deploy: production backup → staging→production kopya → sürüm no güncelle → health → release commit
- DİKKAT: production container, "sadece docker restart deploy YASAK (.env yansımaz)" — düzgün rebuild/deploy gerekir
- INTERNAL_BRIDGE_TOKEN production .env'ine de eklenmeli (fail-closed)
**GÜNCELLEME (25.06.2026) — kısmi deploy + bekletme kararı:**
- ✅ Migration production'a UYGULANDI: public.tasks.enterprise_dispatch_task_id (uuid, nullable) + FK enterprise.dispatch_tasks(id) ON DELETE SET NULL. Doğrulandı (\d public.tasks). Additive, zararsız.
- ✅ INTERNAL_BRIDGE_TOKEN production .env'de ZATEN VAR (grep -c → 1).
- ⏸️ KÖPRÜ KODU production server.js'te HÂLÂ YOK (grep boş) ve DEPLOY EDİLMEDİ — bilinçli bekletildi.
- GEREKÇE: production enterprise.dispatch_tasks = 0 SATIR. Dispatcher production'da gerçek görev onaylamıyor (henüz demo/geliştirme fazı, Sıra 6.5 demo seed bekliyor). Köprünün taşıyacağı onaylı görev YOK.
- KARAR: köprü kodu rebuild'i (5 hafta uptime production container, kesinti riski) dispatcher production'da GERÇEK görev onaylamaya başlayınca yapılacak. O ana kadar migration + token hazır bekler.
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

## BEKLEYEN — diğer (önceki oturumlardan)
- 5.4 dispatcher polish (Sıra 6.5)
- replan endpoint (FEAT-004)
- compliance check endpoint /api/compliance/check-access (ADR-0012 §4.1)
- Plan review UI (map + timeline + Kanban)
- ROADMAP.md Sıra 6 DONE işaretle
