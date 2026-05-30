#!/bin/bash
set -e

echo "=== Amsterdam ZE-Zone derivation ==="

docker cp /tmp/derive.sql 6601902c43f0_fleet-postgres:/tmp/derive.sql

docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking -f /tmp/derive.sql

echo ""
echo "=== WKT file check ==="
docker exec 6601902c43f0_fleet-postgres ls -lh /tmp/amsterdam_ze_zone.wkt
docker exec 6601902c43f0_fleet-postgres head -c 200 /tmp/amsterdam_ze_zone.wkt
echo ""

docker cp 6601902c43f0_fleet-postgres:/tmp/amsterdam_ze_zone.wkt /tmp/amsterdam_ze_zone.wkt
echo ""
echo "=== WKT copied to host ==="
ls -lh /tmp/amsterdam_ze_zone.wkt