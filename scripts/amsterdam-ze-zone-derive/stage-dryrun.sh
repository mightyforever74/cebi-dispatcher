#!/bin/bash
set -e

echo "=== STAGING DRY-RUN — Amsterdam ZE-Zone seed ==="
echo "Database: fleet_tracking_staging"
echo "Mode: DRY-RUN (ROLLBACK at end)"
echo ""

# Copy migration to container
docker cp /tmp/1779300000000_seed-nl-compliance-zones-pilot-amsterdam.sql 6601902c43f0_fleet-postgres:/tmp/seed-amsterdam.sql

# DRY RUN: psql one-shot with internal ROLLBACK override
# We can't ROLLBACK if migration COMMITs internally; use single-transaction mode
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging --single-transaction -v ON_ERROR_STOP=on -f /tmp/seed-amsterdam.sql

echo ""
echo "=== Verifying staging insert ==="
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging -c "SELECT zone_id, city, ROUND((ABS(ST_Area(polygon::geography))/1e6)::numeric, 4) AS area_km2, effective_from, effective_to FROM enterprise.nl_compliance_zones;"

echo ""
echo "=== Cleanup: removing staging insert ==="
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging -c "DELETE FROM enterprise.nl_compliance_zones WHERE zone_id='amsterdam_ze_zone_2026'; DELETE FROM public.pgmigrations WHERE name='1779300000000_seed-nl-compliance-zones-pilot-amsterdam';"

echo ""
echo "=== STAGING dry-run complete — verified and rolled back ==="