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

- Dobbe araçları (vehicles.id): `b1b2b3b4-...0001` BX-TR-42/DEMO-ESP-002, `...0002` RD-NL-78/DEMO-ESP-003, `...0003` AH-05-KL/DEMO-ESP-004, `...0004` NL-92-VB/DEMO-ESP-005
- Dobbe sürücüleri: driver_id `d1d2...0001-0003`, user_id `a1b2...0001-0003`, drivers.assigned_vehicle_id DOLU (araç→sürücü zinciri çalışıyor)
- ESP32 üçlüsü: vehicles.esp32_device_id (varchar50, NOT NULL UNIQUE) + device_assignments tablosu (driver_id+vehicle_id+device_id NOT NULL, status active/inactive, idx_active_device_assignment UNIQUE WHERE status=active)
- fuel_records: enterprise_backend PERMISSION DENIED (fleetadmin gerekli), Dobbe'de 0 kayıt, tarih kolonu record_date (date, NOT NULL, idx_fuel_date)
- alerts: enterprise_backend PERMISSION DENIED, Dobbe'de 1 kayıt
- tasks: Dobbe'de 2 completed + 1 pending_review, hepsi Mart 2026 tarihli
- companies.code Dobbe için BOŞ (köprü "TLP" fallback'e düştü → TLP-26-xxxxx)

## Dersler (kritik, tekrar etmesin)

1. **Hayalet Docker container'lar**: enterprise (6 gün) + ana fleet (5 hafta production) eski kodu çalıştırıp tüm testleri maskeledi. Lokal node test öncesi `docker stop tulipfleet-enterprise-backend`. Ana fleet production container'a DOKUNMA, staging kullan.
2. **Staging git auth PAT'le**: `/opt/fleet/backend-staging` remote'unda PAT gömülü; süresi dolunca git pull kırılır ("Invalid username or token"). PAT yenile, `git remote set-url` ile güncelle. (cp YASAK, git pull şart — WORKING_RULES.)
3. **Lokal enterprise node → köprü erişimi tünelle**: köprü prod-01 staging'de (localhost:3001 sadece içeriden). Lokal enterprise'dan ulaşmak için `ssh -L 3010:localhost:3001 root@46.224.1.192`, `.env.local`'de INTERNAL_CORE_API_URL=http://localhost:3010/... DİKKAT: localhost:3001 lokal enterprise'ı işaret eder, köprüyü değil.
4. **Pencere disiplini**: SSH penceresi=bash (grep, docker, psql), PowerShell=Windows (Select-String, npm, Invoke-RestMethod). PowerShell komutu bash'e yazılınca "command not found".
5. **approve fonksiyon konumu**: endpoint'ler tasksRoutes(fastify){} İÇİNDE olmalı; kapanış } dışına taşarsa "fastify is not defined".
