#!/bin/bash
set -e

echo "=== Den Haag ZE-Zone derivation ==="

# Copy GeoJSON and SQL into container
docker cp /tmp/den_haag_ze_zone_features.geojson 6601902c43f0_fleet-postgres:/tmp/den_haag_ze_zone_features.geojson
docker cp /tmp/derive-denhaag.sql 6601902c43f0_fleet-postgres:/tmp/derive-denhaag.sql

# Run derivation
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking -f /tmp/derive-denhaag.sql

echo ""
echo "=== WKT file check ==="
docker exec 6601902c43f0_fleet-postgres ls -lh /tmp/den_haag_ze_zone.wkt
docker exec 6601902c43f0_fleet-postgres head -c 200 /tmp/den_haag_ze_zone.wkt
echo ""

docker cp 6601902c43f0_fleet-postgres:/tmp/den_haag_ze_zone.wkt /tmp/den_haag_ze_zone.wkt
echo ""
echo "=== WKT copied to host ==="
ls -lh /tmp/den_haag_ze_zone.wkt
