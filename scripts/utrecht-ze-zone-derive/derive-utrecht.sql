\set ON_ERROR_STOP on
BEGIN;

-- Load Utrecht GeoJSON (single Polygon feature)
CREATE TEMP TABLE tmp_utrecht (
  geom geometry(Geometry, 4326)
);

INSERT INTO tmp_utrecht (geom)
SELECT ST_MakeValid(ST_GeomFromGeoJSON(
  (pg_read_file('/tmp/utrecht_ze_zone_features.geojson')::jsonb->'features'->0->>'geometry')
));

\echo ''
\echo '=== Utrecht raw geometry ==='
\echo 'Expected: ZE-Zone for vrachtauto/bestelauto (RDW harmonized 2025-01-01)'
SELECT
  ST_GeometryType(geom) AS gtype,
  ST_NumGeometries(geom) AS parts,
  ROUND((ABS(ST_Area(geom::geography)) / 1e6)::numeric, 4) AS area_km2,
  ROUND((ST_Perimeter(geom::geography) / 1000)::numeric, 2) AS perimeter_km,
  ST_NPoints(geom) AS vertices,
  ST_IsValid(geom) AS valid,
  ROUND(ST_X(ST_Centroid(geom))::numeric, 4) AS centroid_lon,
  ROUND(ST_Y(ST_Centroid(geom))::numeric, 4) AS centroid_lat
FROM tmp_utrecht;

\echo ''
\echo '=== Bounding box ==='
SELECT
  ROUND(ST_XMin(geom)::numeric, 4) AS xmin_lon,
  ROUND(ST_YMin(geom)::numeric, 4) AS ymin_lat,
  ROUND(ST_XMax(geom)::numeric, 4) AS xmax_lon,
  ROUND(ST_YMax(geom)::numeric, 4) AS ymax_lat
FROM tmp_utrecht;

\echo ''
\echo '=== 11-point sanity test (Utrecht landmarks) ==='
WITH points AS (
  SELECT 'Domtoren' AS loc, 5.1213 AS lon, 52.0907 AS lat, 'inside' AS expected UNION ALL
  SELECT 'Stadhuis',                 5.1215, 52.0900, 'inside'  UNION ALL
  SELECT 'Neude',                    5.1184, 52.0923, 'inside'  UNION ALL
  SELECT 'TivoliVredenburg',         5.1136, 52.0921, 'inside'  UNION ALL
  SELECT 'Utrecht Centraal',         5.1101, 52.0894, 'inside'  UNION ALL
  SELECT 'Science Park (Uithof)',    5.1768, 52.0834, 'outside' UNION ALL
  SELECT 'Maarssen',                 5.0367, 52.1395, 'outside' UNION ALL
  SELECT 'Nieuwegein Centrum',       5.0892, 52.0292, 'outside' UNION ALL
  SELECT 'Houten',                   5.1683, 52.0334, 'outside' UNION ALL
  SELECT 'Leidsche Rijn',            5.0511, 52.0921, 'outside' UNION ALL
  SELECT 'Zuilen',                   5.0895, 52.1154, 'outside'
),
results AS (
  SELECT
    loc, expected,
    CASE WHEN ST_Contains(
      (SELECT geom FROM tmp_utrecht),
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
FROM tmp_utrecht;

\echo ''
\echo '=== Writing WKT to /tmp/utrecht_ze_zone.wkt ==='
COPY (SELECT ST_AsText(geom) FROM tmp_utrecht) TO '/tmp/utrecht_ze_zone.wkt';

ROLLBACK;

\echo ''
\echo '=== DRY RUN COMPLETE - ROLLBACK executed ==='
