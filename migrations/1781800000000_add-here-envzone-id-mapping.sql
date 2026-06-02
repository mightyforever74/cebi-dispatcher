-- ============================================================================
-- Migration: 1781800000000_add-here-envzone-id-mapping.sql
-- ============================================================================
-- Adds HERE envzone catalog id mapping to each NL ZE-Zone's _meta.
--
-- Context: Sıra 3 / Adım 2 — HERE envzone coverage spike (2026-06-02) verified,
--   via live Routing v8 `routingZones` harvest, which of TulipFleet's 21 seeded
--   zone rows map to a HERE environmental-zone catalog id (here:cm:envzone:NN).
--   This id is the data source for Model 1 `exceptZoneIds` (ADR-0011 §8.6,
--   ADR-0012 §3.6): when an exempt/compliant vehicle may enter a zone, that
--   zone's here_envzone_id is pushed to HERE's avoid.zoneCategories.exceptZoneIds.
--
-- Coverage result: 19/21 rows mapped. 2 rows have NO HERE catalog entry and are
--   marked here_envzone_id = null + here_coverage = 'not_in_catalog_2026-06-02':
--     - dordrecht_ze_zone_2026 (ZE start 2026-01-01; not in HERE catalog yet)
--     - arnhem_ze_zone_2026    (ZE start 2026-06-01 — today; HERE catalog lag)
--   For these two, the Compliance Layer polygon is the sole authority (Layer 2);
--   they are simply never sent to HERE as exceptZoneIds (id is null).
--
-- Note: denhaag_centrum + denhaag_kust BOTH map to here:cm:envzone:636 — HERE
--   treats our temporally-split pair as one environmental zone. Correct for
--   exceptZoneIds (same id grants both); our split remains for compliance/dates.
--
-- Idempotent: jsonb_set on rules->'city_overlay'->'_meta'. Re-runnable (UPDATE by
--   zone_id). Read-modify-write of the JSONB rules column only; geometry untouched.
-- Schema authority: tulipfleet-backend (ADR-0009 §4.5.1). Prod PostgreSQL, enterprise schema.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

\echo ''
\echo '=== BEFORE: rows + current here_envzone_id (expect none yet) ==='
SELECT zone_id, rules->'city_overlay'->'_meta'->>'here_envzone_id' AS here_id
FROM enterprise.nl_compliance_zones ORDER BY zone_id;

-- Helper: set both here_envzone_id and here_coverage in _meta for a zone
-- (inline via repeated UPDATEs — explicit, auditable, no function needed)

-- 19 mapped zones (here:cm:envzone:NN verified via Routing v8 routingZones 2026-06-02)
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:625"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02"') WHERE zone_id='amsterdam_ze_zone_2026';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:631"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02"') WHERE zone_id='assen_ze_zone_2025';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:637"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02"') WHERE zone_id='delft_ze_zone_2025';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:636"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02"') WHERE zone_id='denhaag_centrum_ze_zone_2025';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:636"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02_shared_with_centrum"') WHERE zone_id='denhaag_kust_ze_zone_2026';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:626"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02"') WHERE zone_id='eindhoven_ze_zone_2025';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:697"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02"') WHERE zone_id='enschede_ze_zone_2025';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:633"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02"') WHERE zone_id='gouda_ze_zone_2025';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:698"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02"') WHERE zone_id='groningen_ze_zone_2025';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:397"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02"') WHERE zone_id='haarlem_ze_zone_2025';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:630"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02"') WHERE zone_id='leiden_ze_zone_2025';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:629"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02"') WHERE zone_id='maastricht_ze_zone_2025';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:628"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02_deep_point_retest"') WHERE zone_id='nijmegen_ze_zone_2025';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:632"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02"') WHERE zone_id='rotterdam_ze_zone_2025';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:707"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02"') WHERE zone_id='schiphol_ze_zone_2026';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:699"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02"') WHERE zone_id='shertogenbosch_ze_zone_2025';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:634"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02"') WHERE zone_id='tilburg_ze_zone_2025';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:635"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02"') WHERE zone_id='utrecht_ze_zone_2025';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', '"here:cm:envzone:627"'),
  '{city_overlay,_meta,here_coverage}', '"verified_2026-06-02"') WHERE zone_id='zwolle_ze_zone_2025';

-- 2 zones NOT in HERE catalog (here_envzone_id = null; Layer-2 polygon sole authority)
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', 'null'),
  '{city_overlay,_meta,here_coverage}', '"not_in_catalog_2026-06-02_ze_start_2026-01-01"') WHERE zone_id='dordrecht_ze_zone_2026';
UPDATE enterprise.nl_compliance_zones SET rules = jsonb_set(jsonb_set(rules,
  '{city_overlay,_meta,here_envzone_id}', 'null'),
  '{city_overlay,_meta,here_coverage}', '"not_in_catalog_2026-06-02_ze_start_2026-06-01"') WHERE zone_id='arnhem_ze_zone_2026';

\echo ''
\echo '=== AFTER: full mapping (21 rows, 19 ids + 2 null) ==='
SELECT zone_id,
  rules->'city_overlay'->'_meta'->>'here_envzone_id' AS here_envzone_id,
  rules->'city_overlay'->'_meta'->>'here_coverage'    AS coverage
FROM enterprise.nl_compliance_zones ORDER BY zone_id;

\echo ''
\echo '=== Coverage summary (expect mapped 19, null 2) ==='
SELECT
  count(*) FILTER (WHERE rules->'city_overlay'->'_meta'->>'here_envzone_id' IS NOT NULL
                     AND rules->'city_overlay'->'_meta'->'here_envzone_id' <> 'null'::jsonb) AS mapped,
  count(*) FILTER (WHERE rules->'city_overlay'->'_meta'->'here_envzone_id' = 'null'::jsonb) AS not_in_catalog,
  count(*) AS total
FROM enterprise.nl_compliance_zones;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1781800000000_add-here-envzone-id-mapping', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pgmigrations WHERE name='1781800000000_add-here-envzone-id-mapping');

COMMIT;
\echo ''
\echo '=== HERE envzone id mapping COMMITTED ==='
