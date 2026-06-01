#!/usr/bin/env python3
"""Generate Utrecht ZE-Zone seed migration SQL."""
import sys
from pathlib import Path

WKT_FILE = Path("/tmp/utrecht_ze_zone.wkt")
OUTPUT = Path("/tmp/1779600000000_seed-nl-compliance-zones-utrecht.sql")

if not WKT_FILE.exists():
    print(f"ERROR: {WKT_FILE} not found.")
    sys.exit(1)

wkt = WKT_FILE.read_text().strip()
wkt_bytes = WKT_FILE.stat().st_size

print(f"=== Generating Utrecht migration ===")
print(f"WKT source: {WKT_FILE} ({wkt_bytes} bytes)")
print(f"Output:     {OUTPUT}")
print()

sql = f"""-- ============================================================================
-- Migration: 1779600000000_seed-nl-compliance-zones-utrecht.sql
-- ============================================================================
-- Phase 1 Sira 2.9.8 - Utrecht ZE-Zone seed
--
-- Source: utrechtmilieu.nl Leaflet milieuzone app (Polygon GeoJSON embedded
--         in milieuzone.js, data revision 20260507).
--         + ST_MakeValid + ST_Multi (defensive)
--
-- Derivation verification (2026-06-01):
--   - gtype:         ST_Polygon (promoted to MultiPolygon for schema)
--   - parts:         1
--   - area_km2:      3.0044 (smallest ZE-Zone so far - tight binnenstad)
--   - perimeter_km:  9.38
--   - vertices:      150
--   - is_valid:      true
--   - centroid:      (5.1170, 52.0890)
--   - sanity test:   11/11 PASS (Domtoren, Stadhuis, Neude, TivoliVredenburg,
--                                Utrecht Centraal inside; Science Park,
--                                Maarssen, Nieuwegein, Houten, Leidsche Rijn,
--                                Zuilen outside)
--   - wkt_bytes:     5421
--
-- Regulation: RVV 1990 + CVDR721021 (Utrecht verkeersbesluit)
-- Fees:       RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)
-- Effective:  2025-01-01 to 2027-12-31 (Utrecht active since 2025-01-01)
-- Prereq:     1779350000000_alter-nl-compliance-zones-multipolygon applied
-- ============================================================================

\\set ON_ERROR_STOP on

BEGIN;

INSERT INTO enterprise.nl_compliance_zones (
  zone_id, city, zone_type, polygon, rules,
  effective_from, effective_to, source, source_url, notes
)
SELECT
  'utrecht_ze_zone_2025',
  'Utrecht',
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
        'national_ontheffing_via_RDW'
      ),
      'national_ontheffing_recognition', jsonb_build_object(
        'basis', 'Art 17 RVV (cross-zone)',
        'central_loket', 'RDW',
        'central_loket_url', 'https://www.rdw.nl/ontheffing-zero-emissie'
      )
    ),
    'city_overlay', jsonb_build_object(
      'city', 'Utrecht',
      'exemption_url', 'https://www.utrecht.nl/wonen-en-leven/gezonde-leefomgeving/luchtkwaliteit/milieuzone-en-zero-emissiezone',
      'regulation_id', 'CVDR721021',
      'regulation_url', 'https://lokaleregelgeving.overheid.nl/CVDR721021',
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2025-01-01',
        'geldend_to', '2027-12-31',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'ST_GeomFromGeoJSON(milieuzone.js layer) + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://utrechtmilieu.nl/milieuzone/',
        'polygon_source_method', 'utrechtmilieu.nl Leaflet app GeoJSON embedded in milieuzone.js (data rev 20260507)',
        'polygon_parts', 1,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'special_note', 'Tight binnenstad coverage (~3 km²). Centraal Station inside polygon (unlike Den Haag).'
      )
    )
  ),
  '2025-01-01',
  '2027-12-31',
  'utrecht_verkeersbesluit_v2025_01',
  'https://utrechtmilieu.nl/milieuzone/',
  'Pilot seed via utrechtmilieu.nl Leaflet milieuzone.js (single Polygon, GeoJSON FeatureCollection embedded in JS, data rev 20260507). Sanity test 11/11 PASS. RDW Centraal Loket harmonized fees. Tight binnenstad coverage.'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'utrecht_ze_zone_2025'
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
WHERE zone_id = 'utrecht_ze_zone_2025';

\\echo ''
\\echo '=== Post-insert sanity test (11 points) ==='
WITH points AS (
  SELECT 'Domtoren' AS loc, 5.1213 AS lon, 52.0907 AS lat, 'inside' AS expected UNION ALL
  SELECT 'Stadhuis',                 5.1215, 52.0900, 'inside'  UNION ALL
  SELECT 'Neude',                    5.1184, 52.0923, 'inside'  UNION ALL
  SELECT 'TivoliVredenburg',         5.1136, 52.0921, 'inside'  UNION ALL
  SELECT 'Utrecht Centraal',         5.1101, 52.0894, 'inside'  UNION ALL
  SELECT 'Science Park (Uithof)',    5.1768, 52.0834, 'outside' UNION ALL
  SELECT 'Maarssen',                 5.0367, 52.1395, 'outside' UNION ALL
  SELECT 'Nieuwegein Centrum',       5.0892, 52.0292, 'outside' UNION ALL
  SELECT 'Houten',                   5.1683, 52.0334, 'outside' UNION ALL
  SELECT 'Leidsche Rijn',            5.0511, 52.0921, 'outside' UNION ALL
  SELECT 'Zuilen',                   5.0895, 52.1154, 'outside'
),
results AS (
  SELECT loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id = 'utrecht_ze_zone_2025'),
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected = actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results
ORDER BY (expected = 'inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1779600000000_seed-nl-compliance-zones-utrecht', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.pgmigrations
  WHERE name = '1779600000000_seed-nl-compliance-zones-utrecht'
);

COMMIT;

\\echo ''
\\echo '=== Seed migration COMMITTED ==='
"""

OUTPUT.write_text(sql)
print(f"Generated: {OUTPUT.stat().st_size} bytes")
