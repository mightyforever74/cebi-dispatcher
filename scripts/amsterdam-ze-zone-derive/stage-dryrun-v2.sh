#!/bin/bash
set -e

echo "=== STAGING DRY-RUN v2 — Amsterdam ZE-Zone seed ==="
echo "Database: fleet_tracking_staging"
echo "Mode: COMMIT then DELETE cleanup"
echo ""

# Copy migration to container
docker cp /tmp/1779300000000_seed-nl-compliance-zones-pilot-amsterdam.sql 6601902c43f0_fleet-postgres:/tmp/seed-amsterdam.sql

# Apply migration (it has its own BEGIN/COMMIT)
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging -v ON_ERROR_STOP=on -f /tmp/seed-amsterdam.sql

echo ""
echo "=== Verifying staging insert ==="
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging -c "SELECT zone_id, city, ROUND((ABS(ST_Area(polygon::geography))/1e6)::numeric, 4) AS area_km2, effective_from, effective_to FROM enterprise.nl_compliance_zones;"

echo ""
echo "=== Verifying pgmigrations entry ==="
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging -c "SELECT id, name, run_on FROM public.pgmigrations WHERE name LIKE '%amsterdam%';"

echo ""
echo "=== Cleanup: removing staging insert (dry-run only) ==="
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging -c "DELETE FROM enterprise.nl_compliance_zones WHERE zone_id='amsterdam_ze_zone_2026'; DELETE FROM public.pgmigrations WHERE name='1779300000000_seed-nl-compliance-zones-pilot-amsterdam';"

echo ""
echo "=== Verifying cleanup ==="
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging -c "SELECT COUNT(*) AS zone_count FROM enterprise.nl_compliance_zones WHERE zone_id='amsterdam_ze_zone_2026';"

echo ""
echo "=== STAGING dry-run v2 complete — verified and cleaned up ==="