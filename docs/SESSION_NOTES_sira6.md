# SESSION NOTES — Sıra 6: Hibrit Köprü API / Plan Onay Akışı (20.06.2026)

## Sonuç: TAMAMLANDI ✓ (uçtan uca gerçek DB'de kanıtlandı)

Tüm zincir çalışıyor:
optimize → draft dispatch_task + routing_job (completed, available_vehicles)
→ approve (round-robin araç dağıt, araç→sürücü türet, assigned yap)
→ köprüye push (tünel 3010 → prod-01 staging)
→ köprü (user_id→drivers.id çevir, task_no üret, public.tasks yaz)
→ traceability (enterprise_dispatch_task_id bağı)

Mimari sözleşme korundu: enterprise public.tasks'a HİÇ yazmadı (INTEGRATION_BOUNDARIES §5.2).
Köprü üzerinden ana fleet (fleetadmin yetkisi) yazdı.

## Commit'ler

| Repo | Commit | İçerik |
|------|--------|--------|
| enterprise-backend | `95b8af1` | Draft Doğum: optimize transaction-aware, dispatch_tasks draft + routing_jobs atomik, race-safe trigger, jsonb validation |
| enterprise-backend | `1db78c1` | Mock enrichment: available_vehicles gerçek Dobbe araç UUID'leri (FK-uyumlu) |
| enterprise-backend | `43ad4a8` | Approve orchestrator: available_vehicles round-robin + araç→sürücü türetme + köprüye push |
| backend (ana fleet) | `8e89676` | İnce köprü endpoint: fail-closed token + atomik transaction + location_str varchar + company_task_counters task_no |
| backend (ana fleet) | `1f02c88` | Migration ADR-0004 v3 §6.2: public.tasks.enterprise_dispatch_task_id + FK |

## Kanıtlanan DB durumu (staging)

- dispatch_tasks: status=assigned, assigned_vehicle_id=`b1b2...0001`, assigned_driver_id=`a1b2...0001` (user_id)
- public.tasks: task_no=TLP-26-00002, driver_id=`d1d2...0001` (çevrildi), enterprise_dispatch_task_id=dispatch_task.id (traceability)
- Köprü izole test: TLP-26-00001; uçtan uca: TLP-26-00002

## Ground-truth'lar (bu oturumda kanıtlanan)

- Dobbe araçları (vehicles.id): `b1b2b3b4-...0001` BX-TR-42/DEMO-ESP-002, `...0002` RD-NL-78/DEMO-ESP-003, `...0003` AH-05-KL/DEMO-ESP-004, `...0004`NL-92-VB / DEMO-ESP-005 / vehicle 5ad2dd21 Dobbe'ye AİT DEĞİL, Tulip Lojistik'e ait (company 00000000-...001). Sıra 6'daki "4. Dobbe aracı" kaydı yanlıştı; demo seed'den çıkarıldı. Dobbe = 3 tır (DEMO-ESP-002/003/004).
- Dobbe sürücüleri: driver_id `d1d2...0001-0003`, user_id `a1b2...0001-0003`, drivers.assigned_vehicle_id DOLU (araç→sürücü zinciri çalışıyor)
- ESP32 üçlüsü: vehicles.esp32_device_id (varchar50, NOT NULL UNIQUE) + device_assignments tablosu (driver_id+vehicle_id+device_id NOT NULL, status active/inactive, idx_active_device_assignment UNIQUE WHERE status=active)
- fuel_records: enterprise_backend PERMISSION DENIED (fleetadmin gerekli), Dobbe'de 0 kayıt, tarih kolonu record_date (date, NOT NULL, idx_fuel_date)
- alerts Dobbe kayıt sayısı: Sıra 6'da 1 idi; FEAT-007-EXT Sütun 2 sonrası +3 GPS sapma uyarısı eklendi (staging-only sandbox).
- tasks: Dobbe'de 2 completed + 1 pending_review, hepsi Mart 2026 tarihli
- companies.code Dobbe için BOŞ (köprü "TLP" fallback'e düştü → TLP-26-xxxxx)
- Dobbe Yakıt Yelpazesi (28.06.2026 Manuel Çalışma): fuelSnapshotBatch.js script'i production veritabanı üzerinde tek seferlik manuel tetiklendi. Hedef tablo public.vehicles (companies değildir). 4 Dobbe aracı için current_fuel_level değerleri mühürlendi:
RD-NL-78: %45 (157.25L)
BX-TR-42: %47 (186.61L)
AH-05-KL: %62 (236.25L)
NL-92-VB: %88 (344.73L)
- Veri Bütünlüğü Kalkanı: total_km değerleri bilinçli olarak güncellenmedi ve mevcut değerlerinde sabit bırakıldı. Gerekçe: Cap'li kör mesafe hesaplamasının araç odometre değerlerini saptırmasını engellemek.
- Yakıt staging hizalaması (29.06.2026): yakıt snapshot prod fleet_tracking'e yazılmıştı, ama dispatcher staging (fleet_tracking_staging) okuduğu için ekran eski değerleri (%86/%58/%74/boş) gösteriyordu. Kök sebep: dispatcher -> enterprise-api -> 10.0.0.2:5433/fleet_tracking_staging (ADR-0003 §10.7). Çözüm: 4 Dobbe aracının current_fuel_level'i staging DB'de de aynı değerlere UPDATE edildi (157.25/186.61/236.25/344.73). staging+prod hizalandı.
- Sıra 5.4 dispatcher UI cilası: TAMAMLANDI - stat cards (ComplexStatisticsCard, commit 032a1f6), focus-on-map (?focusPlate -> map.flyTo, /dashboards/live-fleet-map), debounce.

## Dersler (kritik, tekrar etmesin)

1. **Hayalet Docker container'lar**: enterprise (6 gün) + ana fleet (5 hafta production) eski kodu çalıştırıp tüm testleri maskeledi. Lokal node test öncesi `docker stop tulipfleet-enterprise-backend`. Ana fleet production container'a DOKUNMA, staging kullan.
2. **Staging git auth PAT'le**: `/opt/fleet/backend-staging` remote'unda PAT gömülü; süresi dolunca git pull kırılır ("Invalid username or token"). PAT yenile, `git remote set-url` ile güncelle. (cp YASAK, git pull şart — WORKING_RULES.)
3. **Lokal enterprise node → köprü erişimi tünelle**: köprü prod-01 staging'de (localhost:3001 sadece içeriden). Lokal enterprise'dan ulaşmak için `ssh -L 3010:localhost:3001 root@46.224.1.192`, `.env.local`'de INTERNAL_CORE_API_URL=http://localhost:3010/... DİKKAT: localhost:3001 lokal enterprise'ı işaret eder, köprüyü değil.
4. **Pencere disiplini**: SSH penceresi=bash (grep, docker, psql), PowerShell=Windows (Select-String, npm, Invoke-RestMethod). PowerShell komutu bash'e yazılınca "command not found".
5. **approve fonksiyon konumu**: endpoint'ler tasksRoutes(fastify){} İÇİNDE olmalı; kapanış } dışına taşarsa "fastify is not defined".
================================================================================
📜 TULIPFLEET TELEMETRY ANALYTICS - SESSION CLOSURE ARCHIVE
================================================================================

[Mevcut Durum]: Sütun 1 (Şamandıra), Sütun 2 (GPS), Sütun 3 (Regresyon) BACKEND %100 BİTTİ.
[Senkronizasyon]: GitHub, Staging Sunucu ve Lokal Repo tam hizalandı (Kuyruk: 0).

⚠️ CRITICAL STAGING-ONLY CONFIGS (DO NOT DEPLOY TO PRODUCTION)
────────────────────────────────────────────────────────────────────────────────
1. [Trigger Drop]: public.locations ve public.driver_behavior tablolarındaki 
   "ts_insert_blocker" trigger'ları sadece staging seed manipülasyonu için DROP edildi.
   Production'da bu hypertable korumaları kesinlikle aktif kalmalıdır!
2. [Tenant Isolation]: Tulip Lojistik aracı (5ad2dd21) veri tutarsızlığı nedeniyle
   devre dışı. Dobbe tır üçlemesi (DEMO-ESP-002, 003, 004) tek karargahımız.
3. [Sandbox Records]: Sütun 2'nin ürettiği 3 GPS sapma uyarısı (53b04ab7, 082acede,
   279a4315) staging-only verisidir, prod veritabanına taşınmamalıdır.

🚀 PRODUCTION DEPLOYMENT — GERÇEK DURUM (düzeltildi 28.06.2026, DB + kod kanıtıyla)
────────────────────────────────────────────────────────────────────────────────
DÜZELTME NOTU: Aşağıdaki önceki iki madde HATALIYDI; canlı DB ve script kodu
incelenerek düzeltildi. Eski iddialar: (a) "public.companies'e fuel_analytics_snapshot
JSONB kolonu eklenmeli", (b) "nightly cron 02:00 enjekte edilmeli". İkisi de yanlıştı.

GERÇEK (kanıtlı):
1. [Hedef Tablo]: fuelSnapshotBatch.js, public.companies'e DEĞİL, public.vehicles
   tablosuna yazar: UPDATE public.vehicles SET current_fuel_level, total_km, updated_at.
   Bu üç kolon production'da zaten mevcut (numeric). fuel_analytics_snapshot diye
   bir kolon companies'te YOK ve GEREKMİYOR; şema değişikliği iptal.
2. [Çalışma Şekli]: Script kendi header'ında manuel çalıştırma için tasarlanmış
   (cd .../05-integration; node fuelSnapshotBatch.js). Kendi içinde cron/zamanlayıcı YOK.
   Sadece Dobbe (efbaa346-...) için, statik seed verisinden kör-gün mesafesi hesabı.
3. [Production Durumu]: Script production'da HİÇ YOK (sadece backend-staging'de).
   current_fuel_level şu an tek seferlik manuel UPDATE ile dolu. Kalıcı yazıcı
   (taşıma + execution yöntemi: manuel docker exec VEYA nightly cron) BEKLİYOR;
   yöntem kararı ayrıca verilecek. Bkz. TODO_ACTIVE_sira6.md FEAT-007-EXT bölümü.

================================================================================
