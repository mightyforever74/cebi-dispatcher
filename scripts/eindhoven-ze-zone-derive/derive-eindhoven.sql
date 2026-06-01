\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE tmp_eindhoven (
  geom geometry(Geometry, 4326)
);

INSERT INTO tmp_eindhoven (geom)
SELECT ST_MakeValid(ST_GeomFromGeoJSON(
  (pg_read_file('/tmp/eindhoven_ze_zone_features.geojson')::jsonb->'features'->0->>'geometry')
));

\echo ''
\echo '=== Eindhoven raw geometry ==='
\echo 'Expected: ZE-Zone "binnen de Ring" (inside ring road), ~3-7 km2'
SELECT
  ST_GeometryType(geom) AS gtype,
  ST_NumGeometries(geom) AS parts,
  ROUND((ABS(ST_Area(geom::geography)) / 1e6)::numeric, 4) AS area_km2,
  ROUND((ST_Perimeter(geom::geography) / 1000)::numeric, 2) AS perimeter_km,
  ST_NPoints(geom) AS vertices,
  ST_IsValid(geom) AS valid,
  ROUND(ST_X(ST_Centroid(geom))::numeric, 4) AS centroid_lon,
  ROUND(ST_Y(ST_Centroid(geom))::numeric, 4) AS centroid_lat
FROM tmp_eindhoven;

\echo ''
\echo '=== Bounding box ==='
SELECT
  ROUND(ST_XMin(geom)::numeric, 4) AS xmin_lon,
  ROUND(ST_YMin(geom)::numeric, 4) AS ymin_lat,
  ROUND(ST_XMax(geom)::numeric, 4) AS xmax_lon,
  ROUND(ST_YMax(geom)::numeric, 4) AS ymax_lat
FROM tmp_eindhoven;

\echo ''
\echo '=== 11-point sanity test (Eindhoven landmarks) ==='
WITH points AS (
  SELECT 'Stadhuis'           AS loc, 5.4816 AS lon, 51.4363 AS lat, 'inside' AS expected UNION ALL
  SELECT 'Eindhoven CS',              5.4811, 51.4422, 'inside'  UNION ALL
  SELECT 'Philips Museum',            5.4776, 51.4392, 'inside'  UNION ALL
  SELECT 'Piazza Center',             5.4786, 51.4422, 'inside'  UNION ALL
  SELECT 'Stratumseind',              5.4831, 51.4361, 'inside'  UNION ALL
  SELECT 'Eindhoven Airport',         5.3913, 51.4582, 'outside' UNION ALL
  SELECT 'High Tech Campus',          5.4544, 51.4116, 'outside' UNION ALL
  SELECT 'Veldhoven Centrum',         5.4055, 51.4189, 'outside' UNION ALL
  SELECT 'Helmond Centrum',           5.6553, 51.4792, 'outside' UNION ALL
  SELECT 'Best Centrum',              5.3916, 51.5036, 'outside' UNION ALL
  SELECT 'Geldrop Centrum',           5.5583, 51.4231, 'outside'
),
results AS (
  SELECT
    loc, expected,
    CASE WHEN ST_Contains(
      (SELECT geom FROM tmp_eindhoven),
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
FROM tmp_eindhoven;

\echo ''
\echo '=== Writing WKT to /tmp/eindhoven_ze_zone.wkt ==='
COPY (SELECT ST_AsText(geom) FROM tmp_eindhoven) TO '/tmp/eindhoven_ze_zone.wkt';

ROLLBACK;

\echo ''
\echo '=== DRY RUN COMPLETE - ROLLBACK executed ==='
