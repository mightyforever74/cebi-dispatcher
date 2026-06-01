#!/bin/bash
set -e

echo "=== STAGING DRY-RUN — Eindhoven ZE-Zone seed ==="

docker cp /tmp/1779700000000_seed-nl-compliance-zones-eindhoven.sql 6601902c43f0_fleet-postgres:/tmp/seed-eindhoven.sql
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging -v ON_ERROR_STOP=on -f /tmp/seed-eindhoven.sql

echo ""
echo "=== Verifying ==="
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging -c "SELECT zone_id, city, ST_GeometryType(polygon) AS gtype, ST_NumGeometries(polygon) AS parts, ROUND((ABS(ST_Area(polygon::geography))/1e6)::numeric, 4) AS area_km2 FROM enterprise.nl_compliance_zones;"

echo ""
echo "=== Cleanup ==="
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging -c "DELETE FROM enterprise.nl_compliance_zones WHERE zone_id='eindhoven_ze_zone_2025'; DELETE FROM public.pgmigrations WHERE name='1779700000000_seed-nl-compliance-zones-eindhoven';"

echo ""
echo "=== Verifying cleanup ==="
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging -c "SELECT COUNT(*) FROM enterprise.nl_compliance_zones WHERE zone_id='eindhoven_ze_zone_2025';"

echo ""
echo "=== STAGING dry-run complete ==="
