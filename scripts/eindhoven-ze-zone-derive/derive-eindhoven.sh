#!/bin/bash
set -e

echo "=== Eindhoven ZE-Zone derivation ==="

docker cp /tmp/eindhoven_ze_zone_features.geojson 6601902c43f0_fleet-postgres:/tmp/eindhoven_ze_zone_features.geojson
docker cp /tmp/derive-eindhoven.sql 6601902c43f0_fleet-postgres:/tmp/derive-eindhoven.sql

docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking -f /tmp/derive-eindhoven.sql

echo ""
echo "=== WKT file check ==="
docker exec 6601902c43f0_fleet-postgres ls -lh /tmp/eindhoven_ze_zone.wkt
docker exec 6601902c43f0_fleet-postgres head -c 200 /tmp/eindhoven_ze_zone.wkt
echo ""

docker cp 6601902c43f0_fleet-postgres:/tmp/eindhoven_ze_zone.wkt /tmp/eindhoven_ze_zone.wkt
echo ""
echo "=== WKT copied to host ==="
ls -lh /tmp/eindhoven_ze_zone.wkt
