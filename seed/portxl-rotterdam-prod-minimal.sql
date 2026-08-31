-- ============================================================
-- PortXL Rotterdam Demo Seed — PROD-MINIMAL (fleet_tracking) — KARAR-3a canlı harita kopyası
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



COMMIT;

-- DOĞRULAMA
SELECT 'companies' t, count(*) FROM companies WHERE slug='rotterdam-port-demo'
UNION ALL SELECT 'users', count(*) FROM users WHERE company_id='cccc0000-0000-4000-8000-000000000001'
UNION ALL SELECT 'vehicles', count(*) FROM vehicles WHERE company_id='cccc0000-0000-4000-8000-000000000001'
UNION ALL SELECT 'devices', count(*) FROM devices WHERE company_id='cccc0000-0000-4000-8000-000000000001'


