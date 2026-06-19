SCHEMA_REFERENCE.md

Amaç: public.* ve enterprise.* canlı şema otoritesi. ADR/ROADMAP bir kolon
adı, enum değeri ya da kolon varlığı konusunda çeliştiğinde BU doküman kazanır.
Son doğrulama: 2026-06-18, fleet_tracking_staging, `\d <tablo>` ile.

## public.drivers (13 kolon)
id uuid PK, user_id uuid FK→users, license_no varchar(50) NOT NULL UNIQUE,
license_expiry date NOT NULL, phone varchar(20), emergency_contact varchar(20),
status varchar(20) default 'available', total_km_driven numeric(10,2) default 0,
safety_score numeric(3,2) default 5.0, created_at, assigned_vehicle_id uuid
FK→vehicles, updated_at, company_id uuid FK→companies.
- status CHECK (5): available, on_task, task_pending, on_leave, offline
- safety_score: 0-10 ÖLÇEK (canlı min 4.50 / max 9.20 / avg 5.44). 0-100 DEĞİL.
- skills kolonu YOK (ADR-0011 satır 151/331 geçersiz). Yetkinlik dispatch
  tarafında enterprise.dispatch_tasks.skill_required'da tutulur.
- safety_score 0-10'dur. FEAT-007'nin önerdiği enterprise.driver_scores.score
  (0-100) AYRI bir skordur ve henüz tablo değildir (2026-06-18 itibarıyla yok).
  
## public.vehicles
id, plate_no varchar(20) NOT NULL UNIQUE, esp32_device_id varchar(50) NOT NULL
UNIQUE, model, brand, year, fuel_type, fuel_capacity, current_fuel_level,
total_km numeric(10,2), last_maintenance_date date, next_maintenance_km,
status, ... emission_class, date_first_admission, carrosserie_code, +NL/geofence.
- status CHECK (4): available, in_use, maintenance, retired
- emission_class CHECK: euro_0..euro_6, euro_vi, euro_7, zero_emission
- safety_score / total_km_driven YOK (bunlar driver kolonları). Araçta total_km.
- bakım kolonu adı last_maintenance_date (last_maintenance_at DEĞİL).

## public.tasks (sürücü-tarafı görev)
id, task_no varchar(20) NOT NULL UNIQUE, driver_id FK, vehicle_id FK, title,
status, priority, start_location, end_location, scheduled_start, scheduled_end,
planned_start/end, actual_start/end, total_distance_km, ...
- status CHECK (9): pending, pending_review, accepted, assigned, rejected,
  in_progress, completed, cancelled, withdrawn
- due_date kolonu YOK. today/planned filtresi scheduled_start üzerinden.
- partial unique: uniq_driver_single_in_progress (bir sürücüde tek in_progress)

## enterprise.dispatch_tasks (dispatcher-tarafı plan)
id, company_id, status text NOT NULL, assigned_vehicle_id, assigned_driver_id,
pickup_location jsonb, dropoff_location jsonb, time_window_start/end,
capacity_required jsonb, skill_required text[], routing_job_id, created_at, updated_at.
- status CHECK (7): draft, planned, assigned, in_progress, completed, failed, cancelled
- public.tasks'tan AYRI tablo, AYRI statü kümesi. Onay köprüsü tek yönlü:
  dispatch_tasks → public.tasks (ADR-0009 §4.4, ROADMAP satır 367).

## Güncelleme kuralı
Şema değişince ilgili `\d`'yi yeniden çek, kolonu/enum'u ve "Son doğrulama"
tarihini güncelle. Bu doküman elle değil, canlı `\d` çıktısından beslenir.
