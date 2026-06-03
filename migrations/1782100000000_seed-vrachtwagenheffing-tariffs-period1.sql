-- ============================================================================
-- Migration: 1782100000000_seed-vrachtwagenheffing-tariffs-period1.sql
-- ============================================================================
-- Seeds the official NL Vrachtwagenheffing per-km tariffs for Period 1
--   (2026-07-01 .. 2026-08-31), the window BEFORE the temporary 22.3% discount
--   that begins 2026-09-01 (Minister Karremans, 22 May 2026).
--
-- Vrachtwagenheffing = NL distance-based HGV charge, live 2026-07-01. The fee is
--   a 3-axis lookup (weight class x emission class x road type) priced in EUR/km.
--   FEAT-008. Table created in Sira 2.9.3; this migration fills it for Period 1.
--
-- Source: vrachtwagenheffing.nl official "Dit gaat u betalen" tariff tables,
--   table "tot 1 september 2026" (browser-verified 2026-06-03).
--   CO2-emissieklasse 1 = euro_0..euro_6 diesel; CO2-emissieklasse 5 = zero_emission.
--
-- Schema mapping (no schema change — prod CHECK constraints respected):
--   - road_type fixed to 'all_other': the NL heffing is road-type independent
--     (the column is retained only for forward-compat; lookups filter all_other).
--   - emission_class uses the existing enum (euro_0..euro_6, zero_emission).
--     CO2-klasse 5 == zero_emission. Only euro_5/euro_6/zero_emission seeded here
--     (the common set); CO2-klasse 2-4 diesel sub-tiers and euro_0..euro_4 are
--     intentionally out of scope for Period 1.
--   - 18_32t zero_emission = 0.0370 (corrected from a 0.038 draft against the
--     official table).
--
-- Idempotent: deletes this exact (period, source) set before inserting, so a
--   re-run is safe. No DOWN file is provided (data-only seed; to revert, run the
--   same DELETE predicate). Matches the project's one-way SQL migration pattern.
--
-- Targets: enterprise.nl_vrachtwagenheffing_tariffs (prod + staging).
-- Schema authority: tulipfleet-backend (ADR-0009). Prod PostgreSQL, enterprise schema.
--
-- OPEN WORK (ROADMAP Phase 1.1 backlog): Period 2 (2026-09-01 .. 2026-12-31),
--   -22.3% temporary discount. A follow-up migration will insert those rows once
--   the official rounded values are read from the "van 1 september 2026 tot
--   1 januari 2027" table (or the RDW PDF). onDate version handling already
--   supports multiple effective windows.
-- ============================================================================

DELETE FROM enterprise.nl_vrachtwagenheffing_tariffs
WHERE effective_from = '2026-07-01' AND source = 'Vrachtwagenheffing.nl Official';

INSERT INTO enterprise.nl_vrachtwagenheffing_tariffs (
    tariff_id, vehicle_weight_class, emission_class, road_type,
    rate_eur_per_km, effective_from, effective_to, source, source_url, notes
) VALUES
-- 12-18 ton
('tar_26_1218_ze_p1', '12_18t',    'zero_emission', 'all_other', 0.0350, '2026-07-01', '2026-08-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 1. CO2-klasse 5 (zero-emission), 12-18t.'),
('tar_26_1218_e6_p1', '12_18t',    'euro_6',        'all_other', 0.1600, '2026-07-01', '2026-08-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 1. CO2-klasse 1 Euro 6, 12-18t.'),
('tar_26_1218_e5_p1', '12_18t',    'euro_5',        'all_other', 0.1860, '2026-07-01', '2026-08-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 1. CO2-klasse 1 Euro 5, 12-18t.'),
-- 18-32 ton
('tar_26_1832_ze_p1', '18_32t',    'zero_emission', 'all_other', 0.0370, '2026-07-01', '2026-08-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 1. CO2-klasse 5 (zero-emission), 18-32t. Corrected to 0.037 via official table.'),
('tar_26_1832_e6_p1', '18_32t',    'euro_6',        'all_other', 0.1820, '2026-07-01', '2026-08-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 1. CO2-klasse 1 Euro 6, 18-32t.'),
('tar_26_1832_e5_p1', '18_32t',    'euro_5',        'all_other', 0.2120, '2026-07-01', '2026-08-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 1. CO2-klasse 1 Euro 5, 18-32t.'),
-- >32 ton
('tar_26_32plus_ze_p1', '32_plus_t', 'zero_emission', 'all_other', 0.0380, '2026-07-01', '2026-08-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 1. CO2-klasse 5 (zero-emission), >32t.'),
('tar_26_32plus_e6_p1', '32_plus_t', 'euro_6',        'all_other', 0.2010, '2026-07-01', '2026-08-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 1. CO2-klasse 1 Euro 6, >32t.'),
('tar_26_32plus_e5_p1', '32_plus_t', 'euro_5',        'all_other', 0.2360, '2026-07-01', '2026-08-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 1. CO2-klasse 1 Euro 5, >32t.');
