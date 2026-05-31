\set ON_ERROR_STOP on
BEGIN;

-- Load Rotterdam ZE-Zone GeoJSON (single MultiPolygon feature)
CREATE TEMP TABLE tmp_rotterdam (
  geom geometry(Geometry, 4326)
);

INSERT INTO tmp_rotterdam (geom)
SELECT ST_GeomFromGeoJSON(
  (pg_read_file('/tmp/layer_8373.json')::jsonb->'features'->0->>'geometry')
);

-- Fix any invalid geometry (Amsterdam pattern proved this is needed)
UPDATE tmp_rotterdam SET geom = ST_MakeValid(geom);

\echo ''
\echo '=== Rotterdam raw layer 8373 ==='
SELECT
  ST_GeometryType(geom) AS gtype,
  ST_NPoints(geom) AS vertices,
  ST_IsValid(geom) AS valid,
  ROUND((ABS(ST_Area(geom::geography)) / 1e6)::numeric, 4) AS area_km2,
  ROUND((ST_Perimeter(geom::geography) / 1000)::numeric, 2) AS perimeter_km,
  ROUND(ST_X(ST_Centroid(geom))::numeric, 4) AS centroid_lon,
  ROUND(ST_Y(ST_Centroid(geom))::numeric, 4) AS centroid_lat
FROM tmp_rotterdam;

\echo ''
\echo '=== Bounding box ==='
SELECT
  ROUND(ST_XMin(geom)::numeric, 4) AS xmin_lon,
  ROUND(ST_YMin(geom)::numeric, 4) AS ymin_lat,
  ROUND(ST_XMax(geom)::numeric, 4) AS xmax_lon,
  ROUND(ST_YMax(geom)::numeric, 4) AS ymax_lat
FROM tmp_rotterdam;

\echo ''
\echo '=== 11-point sanity test (Rotterdam landmarks) ==='
WITH points AS (
  SELECT 'Coolsingel'              AS loc, 4.4790 AS lon, 51.9225 AS lat, 'inside'  AS expected UNION ALL
  SELECT 'Rotterdam Centraal',          4.4684, 51.9249, 'inside'  UNION ALL
  SELECT 'Markthal',                    4.4862, 51.9197, 'inside'  UNION ALL
  SELECT 'Erasmusbrug',                 4.4870, 51.9089, 'inside'  UNION ALL
  SELECT 'Stadhuisplein',               4.4778, 51.9234, 'inside'  UNION ALL
  SELECT 'Rotterdam-The Hague Airport', 4.4376, 51.9569, 'outside' UNION ALL
  SELECT 'Rozenburg',                   4.2333, 51.9056, 'outside' UNION ALL
  SELECT 'Schiedam Centrum',            4.3947, 51.9197, 'outside' UNION ALL
  SELECT 'Barendrecht Centrum',         4.5374, 51.8553, 'outside' UNION ALL  SELECT 'Hoogvliet',                   4.3475, 51.8636, 'outside' UNION ALL
  SELECT 'Capelle aan den IJssel',      4.5800, 51.9258, 'outside'
),
results AS (
  SELECT
    loc, expected,
    CASE WHEN ST_Contains(
      (SELECT geom FROM tmp_rotterdam),
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
FROM tmp_rotterdam;

\echo ''
\echo '=== Writing WKT to /tmp/rotterdam_ze_zone.wkt ==='
COPY (SELECT ST_AsText(geom) FROM tmp_rotterdam) TO '/tmp/rotterdam_ze_zone.wkt';

ROLLBACK;

\echo ''
\echo '=== DRY RUN COMPLETE - ROLLBACK executed ==='