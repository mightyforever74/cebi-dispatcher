-- ============================================================
-- PortXL Rotterdam Demo Seed — STAGING (fleet_tracking_staging)
-- KARAR-2/3a · 31.08.2026 · Şema kanıtı: 31.08 psql \d dökümleri
-- İdempotent: ON CONFLICT DO NOTHING. Dobbe Transport'a dokunmaz.
-- Tüm seed kullanıcı şifreleri: PortXL2026!Rdam
-- ============================================================
BEGIN;

-- 1) COMPANY
INSERT INTO companies (id, name, slug, code, timezone, currency, country, city, status,
  subscription_status, subscription_tier, package_type, per_vehicle_fee, max_vehicles, max_drivers,
  dispatch_mode, email)
VALUES ('cccc0000-0000-4000-8000-000000000001', 'Rotterdam Port Demo B.V.', 'rotterdam-port-demo',
  'RDM', 'Europe/Amsterdam', 'EUR', 'Netherlands', 'Rotterdam', 'active',
  'active', 'professional', 'pro', 25.00, 10, 10, 'advisory', 'rdam.admin@tulipfleet.com')
ON CONFLICT (slug) DO NOTHING;

-- 2) USERS (bcrypt: PortXL2026!Rdam)
INSERT INTO users (id, email, password_hash, role, language, company_id, first_name, last_name) VALUES
('aaaa0000-0000-4000-8000-000000000001','rdam.admin@tulipfleet.com','$2b$10$4jnk2oyh.nNIwglHGdHzs.BKer2KWOQqZnYwwFh2ejjlojl54WHt.','company_admin','en','cccc0000-0000-4000-8000-000000000001','Rotterdam','Admin'),
('aaaa0000-0000-4000-8000-000000000002','rdam.driver1@tulipfleet.com','$2b$10$4jnk2oyh.nNIwglHGdHzs.BKer2KWOQqZnYwwFh2ejjlojl54WHt.','driver','en','cccc0000-0000-4000-8000-000000000001','Jan','de Vries'),
('aaaa0000-0000-4000-8000-000000000003','rdam.driver2@tulipfleet.com','$2b$10$4jnk2oyh.nNIwglHGdHzs.BKer2KWOQqZnYwwFh2ejjlojl54WHt.','driver','en','cccc0000-0000-4000-8000-000000000001','Pieter','Bakker'),
('aaaa0000-0000-4000-8000-000000000004','rdam.driver3@tulipfleet.com','$2b$10$4jnk2oyh.nNIwglHGdHzs.BKer2KWOQqZnYwwFh2ejjlojl54WHt.','driver','nl','cccc0000-0000-4000-8000-000000000001','Sofie','Jansen')
ON CONFLICT (email) DO NOTHING;

-- 3) VEHICLES (esp32_device_id = simülatör device_id = devices.esp_chip_id)
INSERT INTO vehicles (id, plate_no, esp32_device_id, brand, model, year, fuel_type, fuel_capacity,
  current_fuel_level, status, company_id, vehicle_category, emission_class, vehicle_weight_class, color) VALUES
('bbbb0000-0000-4000-8000-000000000001','43-BXK-1','a1b2c3d40001','DAF','XF 480',2023,'diesel',400,310,'available','cccc0000-0000-4000-8000-000000000001','truck_heavy','euro_vi','32_plus_t','White'),
('bbbb0000-0000-4000-8000-000000000002','56-BNT-2','a1b2c3d40002','Volvo','FH 460',2022,'diesel',380,220,'available','cccc0000-0000-4000-8000-000000000001','truck_heavy','euro_vi','32_plus_t','Blue'),
('bbbb0000-0000-4000-8000-000000000003','78-BZL-3','a1b2c3d40003','Scania','R 450',2021,'diesel',400,350,'available','cccc0000-0000-4000-8000-000000000001','truck_heavy','euro_vi','32_plus_t','Red'),
('bbbb0000-0000-4000-8000-000000000004','12-TFE-4','a1b2c3d40004','Volvo','FE Electric',2025,'electric',NULL,NULL,'available','cccc0000-0000-4000-8000-000000000001','truck_medium','zero_emission','12_18t','Green'),
('bbbb0000-0000-4000-8000-000000000005','34-TFE-5','a1b2c3d40005','DAF','LF Electric',2025,'electric',NULL,NULL,'available','cccc0000-0000-4000-8000-000000000001','truck_medium','zero_emission','12_18t','Green')
ON CONFLICT (plate_no) DO NOTHING;

-- 4) DEVICES (backend eşleme kanıtı: server.js:143,188,2077)
INSERT INTO devices (id, device_code, serial, serial_number, esp_chip_id, mac_address, hardware_version,
  firmware_version, chip_model, company_id, vehicle_id, status, owner_type) VALUES
('dddd0000-0000-4000-8000-000000000001','TF-RDM-001','TFRDM2026001','TFRDM2026001','a1b2c3d40001','AA:BB:CC:DD:EE:01','S3-N16R8','5.0.4','ESP32-S3','cccc0000-0000-4000-8000-000000000001','bbbb0000-0000-4000-8000-000000000001','ACTIVATED','platform'),
('dddd0000-0000-4000-8000-000000000002','TF-RDM-002','TFRDM2026002','TFRDM2026002','a1b2c3d40002','AA:BB:CC:DD:EE:02','S3-N16R8','5.0.4','ESP32-S3','cccc0000-0000-4000-8000-000000000001','bbbb0000-0000-4000-8000-000000000002','ACTIVATED','platform'),
('dddd0000-0000-4000-8000-000000000003','TF-RDM-003','TFRDM2026003','TFRDM2026003','a1b2c3d40003','AA:BB:CC:DD:EE:03','S3-N16R8','5.0.4','ESP32-S3','cccc0000-0000-4000-8000-000000000001','bbbb0000-0000-4000-8000-000000000003','ACTIVATED','platform'),
('dddd0000-0000-4000-8000-000000000004','TF-RDM-004','TFRDM2026004','TFRDM2026004','a1b2c3d40004','AA:BB:CC:DD:EE:04','S3-N16R8','5.0.4','ESP32-S3','cccc0000-0000-4000-8000-000000000001','bbbb0000-0000-4000-8000-000000000004','ACTIVATED','platform'),
('dddd0000-0000-4000-8000-000000000005','TF-RDM-005','TFRDM2026005','TFRDM2026005','a1b2c3d40005','AA:BB:CC:DD:EE:05','S3-N16R8','5.0.4','ESP32-S3','cccc0000-0000-4000-8000-000000000001','bbbb0000-0000-4000-8000-000000000005','ACTIVATED','platform')
ON CONFLICT (device_code) DO NOTHING;

-- 5) DRIVERS
INSERT INTO drivers (id, user_id, license_no, license_expiry, phone, status, company_id, assigned_vehicle_id, safety_score) VALUES
('eeee0000-0000-4000-8000-000000000001','aaaa0000-0000-4000-8000-000000000002','NL-RDM-2026-01','2029-06-30','+31611000001','available','cccc0000-0000-4000-8000-000000000001','bbbb0000-0000-4000-8000-000000000001',4.8),
('eeee0000-0000-4000-8000-000000000002','aaaa0000-0000-4000-8000-000000000003','NL-RDM-2026-02','2028-11-30','+31611000002','available','cccc0000-0000-4000-8000-000000000001','bbbb0000-0000-4000-8000-000000000002',4.6),
('eeee0000-0000-4000-8000-000000000003','aaaa0000-0000-4000-8000-000000000004','NL-RDM-2026-03','2030-02-28','+31611000003','available','cccc0000-0000-4000-8000-000000000001','bbbb0000-0000-4000-8000-000000000004',4.9)
ON CONFLICT (license_no) DO NOTHING;

-- 6) TASKS (t1 in_progress, t2 assigned, t3-t6 pending — demo sırasında canlı atama için)
-- Zaman pencereleri çakışmaz (idx_tasks_time_overlap kanıtına uygun)
INSERT INTO tasks (id, task_no, company_id, title, description, priority, status,
  driver_id, vehicle_id, start_location, end_location,
  scheduled_start, scheduled_end, actual_start, waypoints) VALUES
('ffff0000-0000-4000-8000-000000000001','RDM-1001','cccc0000-0000-4000-8000-000000000001',
 'Container pickup — ECT Delta Terminal','40ft reefer pickup, ref ECT-88412','high','in_progress',
 'eeee0000-0000-4000-8000-000000000001','bbbb0000-0000-4000-8000-000000000001',
 'ECT Delta Terminal, Maasvlakte','Botlek Tank Terminal',
 '2026-09-02 08:00:00','2026-09-02 11:00:00','2026-09-02 08:05:00',
 '[{"id":"wp1","name":"ECT Delta Terminal","address":"Europaweg, Maasvlakte Rotterdam","latitude":51.9536,"longitude":4.0555,"planned_arrival":"2026-09-02T08:30:00Z","status":"pending"},{"id":"wp2","name":"Botlek Tank Terminal","address":"Botlekweg, Rotterdam-Botlek","latitude":51.8850,"longitude":4.2870,"planned_arrival":"2026-09-02T10:15:00Z","status":"pending"}]'::jsonb),
('ffff0000-0000-4000-8000-000000000002','RDM-1002','cccc0000-0000-4000-8000-000000000001',
 'Empty container return — Euromax','2x20ft empty return, booking EMX-3391','normal','assigned',
 'eeee0000-0000-4000-8000-000000000002','bbbb0000-0000-4000-8000-000000000002',
 'Waalhaven Depot','Euromax Terminal, Maasvlakte',
 '2026-09-02 13:00:00','2026-09-02 16:00:00',NULL,
 '[{"id":"wp1","name":"Waalhaven Depot","address":"Waalhaven Zuidzijde, Rotterdam","latitude":51.8880,"longitude":4.4350,"planned_arrival":"2026-09-02T13:20:00Z","status":"pending"},{"id":"wp2","name":"Euromax Terminal","address":"Maasvlakteweg, Rotterdam","latitude":51.9575,"longitude":4.0958,"planned_arrival":"2026-09-02T15:00:00Z","status":"pending"}]'::jsonb),
('ffff0000-0000-4000-8000-000000000003','RDM-1003','cccc0000-0000-4000-8000-000000000001',
 'ZE-zone city delivery — Rotterdam Centrum','Last-mile ZE delivery (electric only), order ZE-1102','high','pending',
 NULL,NULL,'Waalhaven Depot','Rotterdam Centrum (ZE zone)',
 '2026-09-02 09:00:00','2026-09-02 12:00:00',NULL,
 '[{"id":"wp1","name":"Waalhaven Depot","address":"Waalhaven Zuidzijde, Rotterdam","latitude":51.8880,"longitude":4.4350,"planned_arrival":"2026-09-02T09:20:00Z","status":"pending"},{"id":"wp2","name":"Rotterdam Centrum","address":"Coolsingel, Rotterdam","latitude":51.9225,"longitude":4.4792,"planned_arrival":"2026-09-02T10:30:00Z","status":"pending"}]'::jsonb),
('ffff0000-0000-4000-8000-000000000004','RDM-1004','cccc0000-0000-4000-8000-000000000001',
 'Chemical transport — Botlek to Pernis','ADR class 3, shipment BTL-7720','high','pending',
 NULL,NULL,'Botlek Tank Terminal','Shell Pernis Refinery',
 '2026-09-02 12:30:00','2026-09-02 15:00:00',NULL,
 '[{"id":"wp1","name":"Botlek Tank Terminal","address":"Botlekweg, Rotterdam","latitude":51.8850,"longitude":4.2870,"planned_arrival":"2026-09-02T12:50:00Z","status":"pending"},{"id":"wp2","name":"Pernis Refinery","address":"Vondelingenweg, Pernis","latitude":51.8865,"longitude":4.3830,"planned_arrival":"2026-09-02T14:10:00Z","status":"pending"}]'::jsonb),
('ffff0000-0000-4000-8000-000000000005','RDM-1005','cccc0000-0000-4000-8000-000000000001',
 'Container transfer — APM MVII to Waalhaven','45ft HC transfer, ref APM-5518','normal','pending',
 NULL,NULL,'APM Terminals Maasvlakte II','Waalhaven Depot',
 '2026-09-02 14:00:00','2026-09-02 17:30:00',NULL,
 '[{"id":"wp1","name":"APM Terminals MVII","address":"Maasvlakte II, Rotterdam","latitude":51.9515,"longitude":4.0210,"planned_arrival":"2026-09-02T14:30:00Z","status":"pending"},{"id":"wp2","name":"Waalhaven Depot","address":"Waalhaven Zuidzijde, Rotterdam","latitude":51.8880,"longitude":4.4350,"planned_arrival":"2026-09-02T16:45:00Z","status":"pending"}]'::jsonb),
('ffff0000-0000-4000-8000-000000000006','RDM-1006','cccc0000-0000-4000-8000-000000000001',
 'ZE-zone evening delivery — Kralingen','Electric-only city window 18:00-20:00, order ZE-1103','normal','pending',
 NULL,NULL,'Waalhaven Depot','Rotterdam Kralingen (ZE zone)',
 '2026-09-02 18:00:00','2026-09-02 20:00:00',NULL,
 '[{"id":"wp1","name":"Waalhaven Depot","address":"Waalhaven Zuidzijde, Rotterdam","latitude":51.8880,"longitude":4.4350,"planned_arrival":"2026-09-02T18:15:00Z","status":"pending"},{"id":"wp2","name":"Kralingen","address":"Oudedijk, Rotterdam","latitude":51.9260,"longitude":4.5120,"planned_arrival":"2026-09-02T19:10:00Z","status":"pending"}]'::jsonb)
ON CONFLICT (task_no) DO NOTHING;

COMMIT;

-- DOĞRULAMA
SELECT 'companies' t, count(*) FROM companies WHERE slug='rotterdam-port-demo'
UNION ALL SELECT 'users', count(*) FROM users WHERE company_id='cccc0000-0000-4000-8000-000000000001'
UNION ALL SELECT 'vehicles', count(*) FROM vehicles WHERE company_id='cccc0000-0000-4000-8000-000000000001'
UNION ALL SELECT 'devices', count(*) FROM devices WHERE company_id='cccc0000-0000-4000-8000-000000000001'
UNION ALL SELECT 'drivers', count(*) FROM drivers WHERE company_id='cccc0000-0000-4000-8000-000000000001'
UNION ALL SELECT 'tasks', count(*) FROM tasks WHERE company_id='cccc0000-0000-4000-8000-000000000001';
