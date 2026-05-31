SELECT ST_NumGeometries(
  ST_GeomFromGeoJSON(
    (pg_read_file('/tmp/layer_8373.json')::jsonb->'features'->0->>'geometry')
  )
) AS part_count;