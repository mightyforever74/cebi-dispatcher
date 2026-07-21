-- ============================================================================
-- Migration: 1782200000000_seed-vrachtwagenheffing-tariffs-period2.sql
-- ============================================================================
-- Seeds the official NL Vrachtwagenheffing per-km tariffs for Period 2
--   (2026-09-01 .. 2026-12-31): the -22.3% temporary discount window
--   (Minister Karremans, decision to Tweede Kamer 22 May 2026; motions
--   Flach/Eerdmans). Follows Period 1 migration 1782100000000.
--
-- Source: vrachtwagenheffing.nl official "Dit gaat u betalen" tariff tables,
--   table "van 1 september 2026 tot 1 januari 2027" (browser-verified 2026-07-20).
--   Rates are the OFFICIAL ROUNDED discounted values (NOT self-computed from -22.3%).
--
-- SCOPE (Seçenek 2 / Aşamalı — approved 2026-07-20):
--   ONLY the rows that fit the EXISTING emission_class enum with ZERO DDL risk:
--     - CO2-emissieklasse 1  -> euro_0..euro_6 (diesel, by Euro norm)
--     - CO2-emissieklasse 5  -> zero_emission
--   = 3 weight classes x 8 emission values = 24 rows.
--
--   DEFERRED (NOT in this migration): CO2-emissieklasse 2/3/4. Those require a
--   NEW co2_class axis (Yol B) and will ship as ONE unit with INFRA-A:
--     co2_class column + uq_vrachtwagenheffing_lookup drop/recreate +
--     calculateHeffing.js refactor + vehicles.co2_class schema.
--   Reason: calculateHeffing.js matches on (weight, emission_class, road_type,
--   date) only — it has no co2_class axis, and vehicles carry no co2_class yet.
--   Seeding klasse 2/3/4 today would break the UNIQUE index and/or make the
--   engine read the wrong row. Legal coverage today is still 90%+ (fleet is
--   overwhelmingly Euro 6 / zero-emission).
--
-- Schema mapping (mirrors Period 1 exactly, NO schema change):
--   - road_type fixed to 'all_other' (NL heffing is road-type independent;
--     calculateHeffing.js hard-filters road_type='all_other').
--   - emission_class values lowercase (calculateHeffing.js lowercases the vehicle
--     value before matching).
--   - Idempotent: deletes this exact (effective_from, source) set before insert.
--   - No DOWN file (data-only seed; revert = re-run the DELETE predicate).
--   - No collision with Period 1: effective_from differs (2026-09-01 vs 2026-07-01),
--     so uq_vrachtwagenheffing_lookup (weight, emission, road, effective_from) is
--     satisfied without touching the index.
--
-- Targets: enterprise.nl_vrachtwagenheffing_tariffs (prod + staging).
-- Schema authority: table created in tulipfleet-backend
--   (1779200000001_create-enterprise-nl-vrachtwagenheffing-tariffs), seeded from
--   tulipfleet-dispatcher/migrations (Period 1 pattern). Repo-authority reconcile
--   is a separate cleanup item (INTEGRATION_BOUNDARIES §3/§4.2).
-- ============================================================================

DELETE FROM enterprise.nl_vrachtwagenheffing_tariffs
WHERE effective_from = '2026-09-01' AND source = 'Vrachtwagenheffing.nl Official';

INSERT INTO enterprise.nl_vrachtwagenheffing_tariffs (
    tariff_id, vehicle_weight_class, emission_class, road_type,
    rate_eur_per_km, effective_from, effective_to, source, source_url, notes
) VALUES
-- ===== 12-18 ton (official row "12.000 tot 18.000") =====
('tar_26_1218_e0_p2', '12_18t',    'euro_0',        'all_other', 0.3040, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 0, 12-18t.'),
('tar_26_1218_e1_p2', '12_18t',    'euro_1',        'all_other', 0.2440, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 1, 12-18t.'),
('tar_26_1218_e2_p2', '12_18t',    'euro_2',        'all_other', 0.2320, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 2, 12-18t.'),
('tar_26_1218_e3_p2', '12_18t',    'euro_3',        'all_other', 0.2060, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 3, 12-18t.'),
('tar_26_1218_e4_p2', '12_18t',    'euro_4',        'all_other', 0.1780, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 4, 12-18t.'),
('tar_26_1218_e5_p2', '12_18t',    'euro_5',        'all_other', 0.1450, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 5, 12-18t.'),
('tar_26_1218_e6_p2', '12_18t',    'euro_6',        'all_other', 0.1250, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 6, 12-18t.'),
('tar_26_1218_ze_p2', '12_18t',    'zero_emission', 'all_other', 0.0270, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 5 (zero-emission), 12-18t.'),
-- ===== 18-32 ton (official row "18.000 tot en met 32.000") =====
('tar_26_1832_e0_p2', '18_32t',    'euro_0',        'all_other', 0.3370, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 0, 18-32t.'),
('tar_26_1832_e1_p2', '18_32t',    'euro_1',        'all_other', 0.2830, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 1, 18-32t.'),
('tar_26_1832_e2_p2', '18_32t',    'euro_2',        'all_other', 0.2690, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 2, 18-32t.'),
('tar_26_1832_e3_p2', '18_32t',    'euro_3',        'all_other', 0.2390, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 3, 18-32t.'),
('tar_26_1832_e4_p2', '18_32t',    'euro_4',        'all_other', 0.2050, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 4, 18-32t.'),
('tar_26_1832_e5_p2', '18_32t',    'euro_5',        'all_other', 0.1650, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 5, 18-32t.'),
('tar_26_1832_e6_p2', '18_32t',    'euro_6',        'all_other', 0.1410, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 6, 18-32t.'),
('tar_26_1832_ze_p2', '18_32t',    'zero_emission', 'all_other', 0.0280, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 5 (zero-emission), 18-32t.'),
-- ===== >32 ton (official row "Meer dan 32.000") =====
('tar_26_32plus_e0_p2', '32_plus_t', 'euro_0',        'all_other', 0.3790, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 0, >32t.'),
('tar_26_32plus_e1_p2', '32_plus_t', 'euro_1',        'all_other', 0.3180, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 1, >32t.'),
('tar_26_32plus_e2_p2', '32_plus_t', 'euro_2',        'all_other', 0.3050, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 2, >32t.'),
('tar_26_32plus_e3_p2', '32_plus_t', 'euro_3',        'all_other', 0.2710, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 3, >32t.'),
('tar_26_32plus_e4_p2', '32_plus_t', 'euro_4',        'all_other', 0.2310, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 4, >32t.'),
('tar_26_32plus_e5_p2', '32_plus_t', 'euro_5',        'all_other', 0.1830, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 5, >32t.'),
('tar_26_32plus_e6_p2', '32_plus_t', 'euro_6',        'all_other', 0.1560, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 1 Euro 6, >32t.'),
('tar_26_32plus_ze_p2', '32_plus_t', 'zero_emission', 'all_other', 0.0300, '2026-09-01', '2026-12-31', 'Vrachtwagenheffing.nl Official', 'https://www.vrachtwagenheffing.nl/dit-gaat-u-betalen', 'Period 2 (-22.3%). CO2-klasse 5 (zero-emission), >32t.');
