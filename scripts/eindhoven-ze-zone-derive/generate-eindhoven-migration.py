#!/usr/bin/env python3
"""Generate Eindhoven ZE-Zone seed migration SQL."""
import sys
from pathlib import Path

WKT_FILE = Path("/tmp/eindhoven_ze_zone.wkt")
OUTPUT = Path("/tmp/1779700000000_seed-nl-compliance-zones-eindhoven.sql")

if not WKT_FILE.exists():
    print(f"ERROR: {WKT_FILE} not found.")
    sys.exit(1)

wkt = WKT_FILE.read_text().strip()
wkt_bytes = WKT_FILE.stat().st_size

print(f"=== Generating Eindhoven migration ===")
print(f"WKT source: {WKT_FILE} ({wkt_bytes} bytes)")
print(f"Output:     {OUTPUT}")
print()

sql = f"""-- ============================================================================
-- Migration: 1779700000000_seed-nl-compliance-zones-eindhoven.sql
-- ============================================================================
-- Phase 1 Sira 2.9.9 - Eindhoven ZE-Zone seed
--
-- Source: Eindhoven Open Data portal (OpenDataSoft API)
--         Dataset: emissievrije-zone (FeatureCollection with 2 features)
--         Filtered: naam_zone = "Zero Emissiezone" (single Polygon)
--         + ST_MakeValid + ST_Multi (defensive)
--
-- Derivation verification (2026-06-01):
--   - gtype:         ST_Polygon (promoted to MultiPolygon for schema)
--   - parts:         1
--   - area_km2:      9.4491 ("binnen de Ring" - inside Eindhoven ring road)
--   - perimeter_km:  15.00
--   - vertices:      305
--   - is_valid:      true
--   - centroid:      (5.4773, 51.4390)
--   - sanity test:   11/11 PASS (Stadhuis, Eindhoven CS, Philips Museum,
--                                Piazza Center, Stratumseind inside; Airport,
--                                High Tech Campus, Veldhoven, Helmond, Best,
--                                Geldrop outside)
--   - wkt_bytes:     11015
--
-- Regulation: RVV 1990 + CVDR721321 (Eindhoven verkeersbesluit)
-- Source: gmb-2024-241606 (officielebekendmakingen.nl)
-- Fees:       RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)
-- Effective:  2025-01-01 to 2027-12-31 (active since 2025-01-01)
-- Future:     2030 binnen de Ring fully emission-free; 2038 entire city
-- Prereq:     1779350000000_alter-nl-compliance-zones-multipolygon applied
-- ============================================================================

\\set ON_ERROR_STOP on

BEGIN;

INSERT INTO enterprise.nl_compliance_zones (
  zone_id, city, zone_type, polygon, rules,
  effective_from, effective_to, source, source_url, notes
)
SELECT
  'eindhoven_ze_zone_2025',
  'Eindhoven',
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
      'city', 'Eindhoven',
      'exemption_url', 'https://www.eindhoven.nl/stad-en-wonen/verkeer/zero-emissiezone-en-milieuzone',
      'regulation_id', 'CVDR721321',
      'regulation_url', 'https://lokaleregelgeving.overheid.nl/CVDR721321',
      'verkeersbesluit_publication', 'gmb-2024-241606',
      'verkeersbesluit_url', 'https://zoek.officielebekendmakingen.nl/gmb-2024-241606.html',
      'penalties_eur', jsonb_build_object(
        'bestelauto_autobus', 130,
        'vrachtwagen', 320,
        'plus_administratiekosten', true
      ),
      'expansion_plan', jsonb_build_object(
        '2030', 'Binnen de Ring fully emission-free',
        '2038', 'Entire city emission-free'
      ),
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2025-01-01',
        'geldend_to', '2027-12-31',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'ST_GeomFromGeoJSON(OpenDataSoft API filtered naam_zone=Zero Emissiezone) + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://data.eindhoven.nl/api/explore/v2.1/catalog/datasets/emissievrije-zone/exports/geojson',
        'polygon_source_method', 'Eindhoven Open Data portal (OpenDataSoft v2.1 API), dataset emissievrije-zone, filtered by naam_zone property',
        'polygon_parts', 1,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'special_note', 'Binnen de Ring coverage. Dataset includes both milieuzone (legacy) and emissievrije-zone (ZE). Only ZE feature persisted here. Two-step expansion: 2030 ring-internal, 2038 entire city.'
      )
    )
  ),
  '2025-01-01',
  '2027-12-31',
  'eindhoven_verkeersbesluit_v2025_01',
  'https://data.eindhoven.nl/explore/dataset/emissievrije-zone/',
  'Pilot seed via Eindhoven Open Data portal (OpenDataSoft v2.1 API, emissievrije-zone dataset, naam_zone=Zero Emissiezone filter). Single Polygon binnen de Ring. Sanity test 11/11 PASS. RDW Centraal Loket harmonized fees. Expansion roadmap: 2030 ring-internal, 2038 city-wide.'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'eindhoven_ze_zone_2025'
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
WHERE zone_id = 'eindhoven_ze_zone_2025';

\\echo ''
\\echo '=== Post-insert sanity test (11 points) ==='
WITH points AS (
  SELECT 'Stadhuis'           AS loc, 5.4816 AS lon, 51.4363 AS lat, 'inside' AS expected UNION ALL
  SELECT 'Eindhoven CS',              5.4811, 51.4422, 'inside'  UNION ALL
  SELECT 'Philips Museum',            5.4776, 51.4392, 'inside'  UNION ALL
  SELECT 'Piazza Center',             5.4786, 51.4422, 'inside'  UNION ALL
  SELECT 'Stratumseind',              5.4831, 51.4361, 'inside'  UNION ALL
  SELECT 'Eindhoven Airport',         5.3913, 51.4582, 'outside' UNION ALL
  SELECT 'High Tech Campus',          5.4544, 51.4116, 'outside' UNION ALL
  SELECT 'Veldhoven Centrum',         5.4055, 51.4189, 'outside' UNION ALL
  SELECT 'Helmond Centrum',           5.6553, 51.4792, 'outside' UNION ALL
  SELECT 'Best Centrum',              5.3916, 51.5036, 'outside' UNION ALL
  SELECT 'Geldrop Centrum',           5.5583, 51.4231, 'outside'
),
results AS (
  SELECT loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id = 'eindhoven_ze_zone_2025'),
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected = actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results
ORDER BY (expected = 'inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1779700000000_seed-nl-compliance-zones-eindhoven', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.pgmigrations
  WHERE name = '1779700000000_seed-nl-compliance-zones-eindhoven'
);

COMMIT;

\\echo ''
\\echo '=== Seed migration COMMITTED ==='
"""

OUTPUT.write_text(sql)
print(f"Generated: {OUTPUT.stat().st_size} bytes")
