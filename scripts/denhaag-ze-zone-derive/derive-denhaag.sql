\set ON_ERROR_STOP on
BEGIN;

-- Load Den Haag GeoJSON FeatureCollection (Centrum + Kust ZE-Zones)
CREATE TEMP TABLE tmp_denhaag_features (
  feature_idx int PRIMARY KEY,
  titel text,
  geom geometry(Geometry, 4326)
);

-- Feature 0: Centrum (active since ~2025)
INSERT INTO tmp_denhaag_features (feature_idx, titel, geom)
SELECT
  0,
  (pg_read_file('/tmp/den_haag_ze_zone_features.geojson')::jsonb->'features'->0->'properties'->>'titel'),
  ST_MakeValid(ST_GeomFromGeoJSON(
    (pg_read_file('/tmp/den_haag_ze_zone_features.geojson')::jsonb->'features'->0->>'geometry')
  ));

-- Feature 1: Kust (added 2026-01-01)
INSERT INTO tmp_denhaag_features (feature_idx, titel, geom)
SELECT
  1,
  (pg_read_file('/tmp/den_haag_ze_zone_features.geojson')::jsonb->'features'->1->'properties'->>'titel'),
  ST_MakeValid(ST_GeomFromGeoJSON(
    (pg_read_file('/tmp/den_haag_ze_zone_features.geojson')::jsonb->'features'->1->>'geometry')
  ));

\echo ''
\echo '=== Individual features ==='
SELECT
  feature_idx,
  titel,
  ST_GeometryType(geom) AS gtype,
  ST_NumGeometries(geom) AS parts,
  ROUND((ABS(ST_Area(geom::geography)) / 1e6)::numeric, 4) AS area_km2,
  ST_NPoints(geom) AS vertices,
  ST_IsValid(geom) AS valid
FROM tmp_denhaag_features
ORDER BY feature_idx;

-- Union the two ZE-Zone features into single MultiPolygon
CREATE TEMP TABLE tmp_denhaag_unified AS
SELECT
  ST_Multi(ST_MakeValid(ST_Union(geom)))::geometry(MultiPolygon, 4326) AS geom
FROM tmp_denhaag_features;

\echo ''
\echo '=== Unified Den Haag ZE-Zone ==='
\echo 'Expected: MultiPolygon, area ~25-40 km2 (Centrum ~10 + Kust ~20-30)'
SELECT
  ST_GeometryType(geom) AS gtype,
  ST_NumGeometries(geom) AS parts,
  ROUND((ABS(ST_Area(geom::geography)) / 1e6)::numeric, 4) AS area_km2,
  ROUND((ST_Perimeter(geom::geography) / 1000)::numeric, 2) AS perimeter_km,
  ST_NPoints(geom) AS vertices,
  ST_IsValid(geom) AS valid,
  ROUND(ST_X(ST_Centroid(geom))::numeric, 4) AS centroid_lon,
  ROUND(ST_Y(ST_Centroid(geom))::numeric, 4) AS centroid_lat
FROM tmp_denhaag_unified;

\echo ''
\echo '=== Bounding box ==='
SELECT
  ROUND(ST_XMin(geom)::numeric, 4) AS xmin_lon,
  ROUND(ST_YMin(geom)::numeric, 4) AS ymin_lat,
  ROUND(ST_XMax(geom)::numeric, 4) AS xmax_lon,
  ROUND(ST_YMax(geom)::numeric, 4) AS ymax_lat
FROM tmp_denhaag_unified;

\echo ''
\echo '=== 11-point sanity test (Den Haag landmarks) ==='
WITH points AS (
  SELECT 'Binnenhof' AS loc, 4.3128 AS lon, 52.0799 AS lat, 'inside' AS expected UNION ALL
  SELECT 'Hofvijver',             4.3120, 52.0800, 'inside'  UNION ALL
  SELECT 'Paleis Noordeinde',     4.3068, 52.0811, 'inside'  UNION ALL
  SELECT 'Grote Markt',           4.3078, 52.0772, 'inside'  UNION ALL
  SELECT 'Kurhaus Scheveningen',   4.2779, 52.1119, 'inside'  UNION ALL
  SELECT 'Rijswijk',              4.3315, 52.0416, 'outside' UNION ALL
  SELECT 'Voorburg',              4.3551, 52.0684, 'outside' UNION ALL
  SELECT 'Wateringen',            4.2764, 52.0296, 'outside' UNION ALL
  SELECT 'Ypenburg',              4.3644, 52.0456, 'outside' UNION ALL
  SELECT 'Wassenaar',             4.4019, 52.1394, 'outside' UNION ALL
  SELECT 'Delft Centrum',         4.3567, 52.0116, 'outside'
),
results AS (
  SELECT
    loc, expected,
    CASE WHEN ST_Contains(
      (SELECT geom FROM tmp_denhaag_unified),
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected = actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results
ORDER BY (expected = 'inside') DESC, loc;

\echo ''
\echo '=== WKT size ==='
SELECT LENGTH(ST_AsText(geom)) AS wkt_bytes,
       ROUND((LENGTH(ST_AsText(geom)) / 1024.0)::numeric, 2) AS wkt_kb
FROM tmp_denhaag_unified;

\echo ''
\echo '=== Writing WKT to /tmp/den_haag_ze_zone.wkt ==='
COPY (SELECT ST_AsText(geom) FROM tmp_denhaag_unified) TO '/tmp/den_haag_ze_zone.wkt';

ROLLBACK;

\echo ''
\echo '=== DRY RUN COMPLETE - ROLLBACK executed ==='
