\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE tmp_maastricht (
  geom geometry(Geometry, 4326)
);

-- Maastricht GeoJSON is already a single MultiPolygon feature
INSERT INTO tmp_maastricht (geom)
SELECT ST_MakeValid(ST_GeomFromGeoJSON(
  (pg_read_file('/tmp/maastricht_ze_zone_features.geojson')::jsonb->'features'->0->>'geometry')
));

\echo ''
\echo '=== Maastricht raw geometry ==='
\echo 'Expected: ZE-Zone binnenstad ~3-5 km2 (small medieval center)'
SELECT
  ST_GeometryType(geom) AS gtype,
  ST_NumGeometries(geom) AS parts,
  ROUND((ABS(ST_Area(geom::geography)) / 1e6)::numeric, 4) AS area_km2,
  ROUND((ST_Perimeter(geom::geography) / 1000)::numeric, 2) AS perimeter_km,
  ST_NPoints(geom) AS vertices,
  ST_IsValid(geom) AS valid,
  ROUND(ST_X(ST_Centroid(geom))::numeric, 4) AS centroid_lon,
  ROUND(ST_Y(ST_Centroid(geom))::numeric, 4) AS centroid_lat
FROM tmp_maastricht;

\echo ''
\echo '=== Bounding box ==='
SELECT
  ROUND(ST_XMin(geom)::numeric, 4) AS xmin_lon,
  ROUND(ST_YMin(geom)::numeric, 4) AS ymin_lat,
  ROUND(ST_XMax(geom)::numeric, 4) AS xmax_lon,
  ROUND(ST_YMax(geom)::numeric, 4) AS ymax_lat
FROM tmp_maastricht;

\echo ''
\echo '=== 11-point sanity test (Maastricht landmarks) ==='
WITH points AS (
  SELECT 'Vrijthof'          AS loc, 5.6886 AS lon, 50.8492 AS lat, 'inside' AS expected UNION ALL
  SELECT 'Markt',                    5.6914, 50.8514, 'inside'  UNION ALL
  SELECT 'Sint Servaasbrug',         5.6961, 50.8489, 'inside'  UNION ALL
  SELECT 'Sint-Janskerk',            5.6881, 50.8489, 'inside'  UNION ALL
  SELECT 'Stokstraat',               5.6917, 50.8497, 'inside'  UNION ALL
  SELECT 'Maastricht CS',            5.7050, 50.8500, 'outside' UNION ALL
  SELECT 'MECC',                     5.7139, 50.8358, 'outside' UNION ALL
  SELECT 'Fort St. Pieter',          5.6836, 50.8375, 'outside' UNION ALL
  SELECT 'Valkenburg',               5.8311, 50.8647, 'outside' UNION ALL
  SELECT 'Geleen',                   5.8283, 50.9658, 'outside' UNION ALL
  SELECT 'Eijsden',                  5.7033, 50.7767, 'outside'
),
results AS (
  SELECT
    loc, expected,
    CASE WHEN ST_Contains(
      (SELECT geom FROM tmp_maastricht),
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
FROM tmp_maastricht;

\echo ''
\echo '=== Writing WKT to /tmp/maastricht_ze_zone.wkt ==='
COPY (SELECT ST_AsText(geom) FROM tmp_maastricht) TO '/tmp/maastricht_ze_zone.wkt';

ROLLBACK;

\echo ''
\echo '=== DRY RUN COMPLETE - ROLLBACK executed ==='
