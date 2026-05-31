-- ============================================================================
-- Migration: 1779350000000_alter-nl-compliance-zones-multipolygon.sql
-- ============================================================================
-- Phase 1 Sıra 2.9.6 prerequisite
--
-- Reason: Rotterdam ZE-Zone is genuine MultiPolygon (multi-part geometry).
--         Amsterdam was Polygon (single-part) but schema must accommodate
--         both. Future ZE-Zones (Den Haag, Utrecht, Eindhoven, ...) likely
--         MultiPolygon too. Generalize column type.
--
-- Change: enterprise.nl_compliance_zones.polygon
--         FROM geometry(Polygon, 4326) TO geometry(MultiPolygon, 4326)
--
-- Migration: ST_Multi() promotes single Polygon to single-part MultiPolygon
--            (lossless conversion, no geometry data lost)
--
-- Idempotency: ALTER COLUMN with USING — safe to re-run (Postgres no-ops if
--              already correct type)
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Step 1: Drop GIST index temporarily (will recreate after column alter)
DROP INDEX IF EXISTS enterprise.idx_compliance_zones_polygon;

-- Step 2: Alter column type Polygon → MultiPolygon
ALTER TABLE enterprise.nl_compliance_zones
  ALTER COLUMN polygon TYPE geometry(MultiPolygon, 4326)
  USING ST_Multi(polygon);

-- Step 3: Recreate GIST index
CREATE INDEX idx_compliance_zones_polygon
  ON enterprise.nl_compliance_zones USING GIST(polygon);

-- Step 4: Verify column type
\echo ''
\echo '=== Column type after migration ==='
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'enterprise'
  AND table_name = 'nl_compliance_zones'
  AND column_name = 'polygon';

-- Step 5: Verify all existing zones still valid
\echo ''
\echo '=== Existing zones after migration ==='
SELECT
  zone_id,
  city,
  ST_GeometryType(polygon) AS gtype,
  ST_NumGeometries(polygon) AS part_count,
  ROUND((ABS(ST_Area(polygon::geography)) / 1e6)::numeric, 4) AS area_km2,
  ST_NPoints(polygon) AS vertices,
  ST_IsValid(polygon) AS valid
FROM enterprise.nl_compliance_zones
ORDER BY zone_id;

-- Track migration
INSERT INTO public.pgmigrations (name, run_on)
SELECT '1779350000000_alter-nl-compliance-zones-multipolygon', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.pgmigrations
  WHERE name = '1779350000000_alter-nl-compliance-zones-multipolygon'
);

COMMIT;

\echo ''
\echo '=== Schema migration COMMITTED ==='