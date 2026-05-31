#!/bin/bash
set -e

echo "=== Rotterdam ZE-Zone derivation ==="

# Copy GeoJSON layer into container (host -> container)
docker cp /tmp/layer_8373.json 6601902c43f0_fleet-postgres:/tmp/layer_8373.json

# Copy SQL into container
docker cp /tmp/derive-rotterdam.sql 6601902c43f0_fleet-postgres:/tmp/derive-rotterdam.sql

# Run derivation
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking -f /tmp/derive-rotterdam.sql

echo ""
echo "=== WKT file check ==="
docker exec 6601902c43f0_fleet-postgres ls -lh /tmp/rotterdam_ze_zone.wkt
docker exec 6601902c43f0_fleet-postgres head -c 200 /tmp/rotterdam_ze_zone.wkt
echo ""

docker cp 6601902c43f0_fleet-postgres:/tmp/rotterdam_ze_zone.wkt /tmp/rotterdam_ze_zone.wkt
echo ""
echo "=== WKT copied to host ==="
ls -lh /tmp/rotterdam_ze_zone.wkt