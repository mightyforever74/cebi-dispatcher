#!/bin/bash
set -e

echo "=== Maastricht ZE-Zone derivation ==="

docker cp /tmp/maastricht_ze_zone_features.geojson 6601902c43f0_fleet-postgres:/tmp/maastricht_ze_zone_features.geojson
docker cp /tmp/derive-maastricht.sql 6601902c43f0_fleet-postgres:/tmp/derive-maastricht.sql

docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking -f /tmp/derive-maastricht.sql

echo ""
echo "=== WKT file check ==="
docker exec 6601902c43f0_fleet-postgres ls -lh /tmp/maastricht_ze_zone.wkt
docker exec 6601902c43f0_fleet-postgres head -c 200 /tmp/maastricht_ze_zone.wkt
echo ""

docker cp 6601902c43f0_fleet-postgres:/tmp/maastricht_ze_zone.wkt /tmp/maastricht_ze_zone.wkt
echo ""
echo "=== WKT copied to host ==="
ls -lh /tmp/maastricht_ze_zone.wkt
