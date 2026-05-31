#!/bin/bash
set -e

echo "=== STAGING DRY-RUN — Rotterdam ZE-Zone seed ==="
echo "Database: fleet_tracking_staging"
echo "Mode: COMMIT then DELETE cleanup"
echo ""

# First ensure staging has the schema migration applied
echo "=== Pre-check: staging schema is MultiPolygon? ==="
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging -c "SELECT column_name, udt_name FROM information_schema.columns WHERE table_schema='enterprise' AND table_name='nl_compliance_zones' AND column_name='polygon';"

# Copy migration to container
docker cp /tmp/1779400000000_seed-nl-compliance-zones-rotterdam.sql 6601902c43f0_fleet-postgres:/tmp/seed-rotterdam.sql

# Apply migration
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging -v ON_ERROR_STOP=on -f /tmp/seed-rotterdam.sql

echo ""
echo "=== Verifying staging insert ==="
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging -c "SELECT zone_id, city, ST_GeometryType(polygon) AS gtype, ROUND((ABS(ST_Area(polygon::geography))/1e6)::numeric, 4) AS area_km2, effective_from FROM enterprise.nl_compliance_zones;"

echo ""
echo "=== Verifying pgmigrations entry ==="
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging -c "SELECT id, name FROM public.pgmigrations WHERE name LIKE '%rotterdam%';"

echo ""
echo "=== Cleanup ==="
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging -c "DELETE FROM enterprise.nl_compliance_zones WHERE zone_id='rotterdam_ze_zone_2025'; DELETE FROM public.pgmigrations WHERE name='1779400000000_seed-nl-compliance-zones-rotterdam';"

echo ""
echo "=== Verifying cleanup ==="
docker exec -i 6601902c43f0_fleet-postgres psql -U fleetadmin -d fleet_tracking_staging -c "SELECT COUNT(*) AS zone_count FROM enterprise.nl_compliance_zones WHERE zone_id='rotterdam_ze_zone_2025';"

echo ""
echo "=== STAGING dry-run complete ==="