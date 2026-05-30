\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE tmp_layers (
  layer_id text PRIMARY KEY,
  geom geometry(Geometry, 4326)
);

INSERT INTO tmp_layers (layer_id, geom)
SELECT '19419', ST_GeomFromGeoJSON(
  (pg_read_file('/tmp/layer_19419.json')::jsonb->'features'->0->>'geometry')
);

INSERT INTO tmp_layers (layer_id, geom)
SELECT '42487', ST_GeomFromGeoJSON(
  (pg_read_file('/tmp/layer_42487.json')::jsonb->'features'->0->>'geometry')
);



\echo ''

-- Fix any invalid geometries (ring orientation, self-intersection)
UPDATE tmp_layers SET geom = ST_MakeValid(geom);

-- Verify all layers are valid now
\echo ''
\echo '=== After ST_MakeValid ==='
SELECT layer_id, ST_IsValid(geom) AS valid, ST_GeometryType(geom) AS gtype
FROM tmp_layers
ORDER BY layer_id;

\echo '=== Loaded layers ==='
SELECT
  layer_id,
  ST_GeometryType(geom) AS geom_type,
  ST_NPoints(geom) AS vertices,
  ST_IsValid(geom) AS valid,
  ST_IsValidReason(geom) AS validity_reason
FROM tmp_layers
ORDER BY layer_id;

CREATE TEMP TABLE tmp_ze_zone AS
WITH raw_diff AS (
  SELECT ST_Difference(
    (SELECT geom FROM tmp_layers WHERE layer_id='19419'),
    (SELECT geom FROM tmp_layers WHERE layer_id='42487')
  ) AS geom
),
dumped AS (
  SELECT (ST_Dump(geom)).geom AS poly FROM raw_diff
),
filtered AS (
  SELECT poly FROM dumped
  WHERE ABS(ST_Area(poly::geography)) > 1000
)
SELECT ST_Union(poly)::geometry(Geometry, 4326) AS ze_zone_polygon
FROM filtered;

\echo ''
\echo '=== Derived ZE-Zone metrics ==='
\echo 'Expected POLYGON, area near 7.84 km2, valid t'
SELECT
  ST_GeometryType(ze_zone_polygon) AS geom_type,
  ST_NPoints(ze_zone_polygon) AS vertices,
  ROUND((ABS(ST_Area(ze_zone_polygon::geography)) / 1e6)::numeric, 4) AS area_km2,
  ROUND((ST_Perimeter(ze_zone_polygon::geography) / 1000)::numeric, 2) AS perimeter_km,
  ST_IsValid(ze_zone_polygon) AS is_valid,
  ROUND(ST_X(ST_Centroid(ze_zone_polygon))::numeric, 4) AS centroid_lon,
  ROUND(ST_Y(ST_Centroid(ze_zone_polygon))::numeric, 4) AS centroid_lat
FROM tmp_ze_zone;

\echo ''
\echo '=== Bounding box ==='
\echo 'Expected lon 4.83 to 4.98, lat 52.33 to 52.42'
SELECT
  ROUND(ST_XMin(ze_zone_polygon)::numeric, 4) AS xmin_lon,
  ROUND(ST_YMin(ze_zone_polygon)::numeric, 4) AS ymin_lat,
  ROUND(ST_XMax(ze_zone_polygon)::numeric, 4) AS xmax_lon,
  ROUND(ST_YMax(ze_zone_polygon)::numeric, 4) AS ymax_lat
FROM tmp_ze_zone;

\echo ''
\echo '=== 11-point sanity test ==='
WITH points AS (
  SELECT 'Dam Square' AS loc, 4.8924 AS lon, 52.3731 AS lat, 'inside' AS expected UNION ALL
  SELECT 'Amsterdam Centraal',    4.9008, 52.3791, 'inside'  UNION ALL
  SELECT 'Rembrandtplein',        4.8956, 52.3661, 'inside'  UNION ALL
  SELECT 'Leidseplein',           4.8830, 52.3640, 'inside'  UNION ALL
  SELECT 'Waterlooplein',         4.9020, 52.3667, 'inside'  UNION ALL
  SELECT 'Westerpark',            4.8757, 52.3863, 'outside' UNION ALL
  SELECT 'Vondelpark',            4.8730, 52.3580, 'outside' UNION ALL
  SELECT 'RAI Zuid',              4.8854, 52.3417, 'outside' UNION ALL
  SELECT 'NDSM Noord',            4.8997, 52.4011, 'outside' UNION ALL
  SELECT 'Schiphol',              4.7639, 52.3086, 'outside' UNION ALL
  SELECT 'Haarlem',               4.6379, 52.3812, 'outside'
),
results AS (
  SELECT
    loc, expected,
    CASE WHEN ST_Contains(
      (SELECT ze_zone_polygon FROM tmp_ze_zone),
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
SELECT LENGTH(ST_AsText(ze_zone_polygon)) AS wkt_bytes,
       ROUND((LENGTH(ST_AsText(ze_zone_polygon)) / 1024.0)::numeric, 2) AS wkt_kb
FROM tmp_ze_zone;

\echo ''
\echo '=== Writing WKT to /tmp/amsterdam_ze_zone.wkt ==='
COPY (SELECT ST_AsText(ze_zone_polygon) FROM tmp_ze_zone)
  TO '/tmp/amsterdam_ze_zone.wkt';

ROLLBACK;

\echo ''
\echo '=== DRY RUN COMPLETE - ROLLBACK executed ==='