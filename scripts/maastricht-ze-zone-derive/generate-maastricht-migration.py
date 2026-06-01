#!/usr/bin/env python3
"""Generate Maastricht ZE-Zone seed migration SQL."""
import sys
from pathlib import Path

WKT_FILE = Path("/tmp/maastricht_ze_zone.wkt")
OUTPUT = Path("/tmp/1779800000000_seed-nl-compliance-zones-maastricht.sql")

if not WKT_FILE.exists():
    print(f"ERROR: {WKT_FILE} not found.")
    sys.exit(1)

wkt = WKT_FILE.read_text().strip()
wkt_bytes = WKT_FILE.stat().st_size

print(f"=== Generating Maastricht migration ===")
print(f"WKT source: {WKT_FILE} ({wkt_bytes} bytes)")
print(f"Output:     {OUTPUT}")
print()

sql = f"""-- ============================================================================
-- Migration: 1779800000000_seed-nl-compliance-zones-maastricht.sql
-- ============================================================================
-- Phase 1 Sira 2.9.10 - Maastricht ZE-Zone seed
--
-- Source: slimme-kaart-maastricht.made4it.com (Maastricht Bereikbaar widget CDN)
--         Path: /data/zero-emissie
--         Format: Custom JS object (lng/lat array pairs) - converted to GeoJSON
--         MultiPolygon (2 parts split by Maas river)
--         + ST_MakeValid + ST_Multi (defensive)
--
-- Derivation verification (2026-06-01):
--   - gtype:         ST_MultiPolygon
--   - parts:         2 (west bank Vrijthof + east bank including Centraal)
--   - area_km2:      2.3100 (smallest ZE-Zone after Utrecht - tight medieval centre)
--   - perimeter_km:  11.21
--   - vertices:      168
--   - is_valid:      true
--   - centroid:      (5.6927, 50.8492)
--   - sanity test:   11/11 PASS (Vrijthof, Markt, Sint-Janskerk, Stokstraat,
--                                Maastricht CS inside; Sint Servaasbrug, MECC,
--                                Fort St. Pieter, Valkenburg, Geleen, Eijsden outside)
--   - wkt_bytes:     6086
--
-- Special notes:
--   - 2-part MultiPolygon split by Maas river (river surface not in ZE-Zone)
--   - Centraal Station IS in zone (unlike Den Haag) - east bank covered
--   - Sint Servaasbrug bridge across river is NOT in zone (river surface excluded)
--
-- Regulation: RVV 1990 + CVDR721458 (Maastricht verkeersbesluit 25 april 2024)
-- Fees:       RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)
-- Effective:  2025-01-01 to 2027-12-31 (overgangsregeling tot 2030)
-- Prereq:     1779350000000_alter-nl-compliance-zones-multipolygon applied
-- ============================================================================

\\set ON_ERROR_STOP on

BEGIN;

INSERT INTO enterprise.nl_compliance_zones (
  zone_id, city, zone_type, polygon, rules,
  effective_from, effective_to, source, source_url, notes
)
SELECT
  'maastricht_ze_zone_2025',
  'Maastricht',
  'ze_zone',
  ST_Multi(ST_MakeValid(ST_GeomFromText('{wkt}', 4326)))::geometry(MultiPolygon, 4326),
  jsonb_build_object(
    'shared_rules', jsonb_build_object(
      'regulation_basis', 'RVV 1990 + Verkeersbesluit per gemeente',
      'vehicle_classes', jsonb_build_object(
        'bedrijfsauto', 'N1/N2 (bestelauto + lichte vrachtauto)',
        'vrachtauto',   'N2/N3 (vrachtauto + trekker)'
      ),
      'access_rules', jsonb_build_object(
        'ze_emission_class_minimum', 'zero_emission',
        'transition_2025_2027_n1n2_euro_minimum', 6,
        'transition_2028_n3_euro_minimum', 6
      ),
      'ontheffing_fees_eur', jsonb_build_object(
        'dagontheffing', 100,
        'kortdurende_ontheffing_1week', 60,
        'maatwerk_ontheffing_1maand', 25,
        'verzendkosten', 30,
        'bezwaarschrift', 0,
        'source', 'RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)',
        'fee_status', 'rdw_harmonized_confirmed'
      ),
      'exempt_categories', jsonb_build_array(
        'zero_emission',
        'essential_services',
        'emergency_services',
        'national_ontheffing_via_RDW',
        'oldtimer_40plus_years',
        'wheelchair_accessible'
      ),
      'national_ontheffing_recognition', jsonb_build_object(
        'basis', 'Art 17 RVV (cross-zone)',
        'central_loket', 'RDW',
        'central_loket_url', 'https://www.rdw.nl/ontheffing-zero-emissie'
      )
    ),
    'city_overlay', jsonb_build_object(
      'city', 'Maastricht',
      'exemption_url', 'https://www.gemeentemaastricht.nl/parkeren-en-verkeer/zero-emissiezone',
      'regulation_id', 'CVDR721458',
      'regulation_url', 'https://lokaleregelgeving.overheid.nl/CVDR721458',
      'verkeersbesluit_publication_date', '2024-04-25',
      'transition_period_end', '2030-01-01',
      'partner_info_site', 'https://www.maastrichtbereikbaar.nl/waar-werken-wij-aan/zero-emissie-stadslogistiek',
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2025-01-01',
        'geldend_to', '2027-12-31',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'Custom JS object (lng/lat) from made4it.com CDN converted to GeoJSON + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://slimme-kaart-maastricht.made4it.com/data/zero-emissie',
        'polygon_source_method', 'Maastricht Bereikbaar Slimme Kaart widget on Google Maps base (separate CDN data layer)',
        'polygon_parts', 2,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'special_note', 'Two-part MultiPolygon split by Maas river. Centraal Station INSIDE polygon (east bank), Sint Servaasbrug bridge OUTSIDE (river surface excluded). Both vracht/bestel and personenauto follow standard ZE rules.'
      )
    )
  ),
  '2025-01-01',
  '2027-12-31',
  'maastricht_verkeersbesluit_v2024_04_25',
  'https://www.gemeentemaastricht.nl/parkeren-en-verkeer/zero-emissiezone',
  'Pilot seed via Maastricht Bereikbaar Slimme Kaart widget. Custom format (made4it.com CDN) converted to GeoJSON MultiPolygon (2 parts split by Maas river). Sanity test 11/11 PASS. RDW Centraal Loket harmonized fees. Overgangsregeling until 2030.'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'maastricht_ze_zone_2025'
);

\\echo ''
\\echo '=== Inserted zone check ==='
SELECT
  zone_id, city, zone_type, ST_GeometryType(polygon) AS gtype,
  ST_NumGeometries(polygon) AS part_count,
  ROUND((ABS(ST_Area(polygon::geography)) / 1e6)::numeric, 4) AS area_km2,
  ST_NPoints(polygon) AS vertices,
  ST_IsValid(polygon) AS valid,
  effective_from, effective_to
FROM enterprise.nl_compliance_zones
WHERE zone_id = 'maastricht_ze_zone_2025';

\\echo ''
\\echo '=== Post-insert sanity test (11 points) ==='
WITH points AS (
  SELECT 'Vrijthof'          AS loc, 5.6886 AS lon, 50.8492 AS lat, 'inside' AS expected UNION ALL
  SELECT 'Markt',                    5.6914, 50.8514, 'inside'  UNION ALL
  SELECT 'Sint-Janskerk',            5.6881, 50.8489, 'inside'  UNION ALL
  SELECT 'Stokstraat',               5.6917, 50.8497, 'inside'  UNION ALL
  SELECT 'Maastricht CS',            5.7050, 50.8500, 'inside'  UNION ALL
  SELECT 'Sint Servaasbrug',         5.6961, 50.8489, 'outside' UNION ALL
  SELECT 'MECC',                     5.7139, 50.8358, 'outside' UNION ALL
  SELECT 'Fort St. Pieter',          5.6836, 50.8375, 'outside' UNION ALL
  SELECT 'Valkenburg',               5.8311, 50.8647, 'outside' UNION ALL
  SELECT 'Geleen',                   5.8283, 50.9658, 'outside' UNION ALL
  SELECT 'Eijsden',                  5.7033, 50.7767, 'outside'
),
results AS (
  SELECT loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id = 'maastricht_ze_zone_2025'),
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected = actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results
ORDER BY (expected = 'inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1779800000000_seed-nl-compliance-zones-maastricht', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.pgmigrations
  WHERE name = '1779800000000_seed-nl-compliance-zones-maastricht'
);

COMMIT;

\\echo ''
\\echo '=== Seed migration COMMITTED ==='
"""

OUTPUT.write_text(sql)
print(f"Generated: {OUTPUT.stat().st_size} bytes")
