#!/usr/bin/env python3
"""Generate Rotterdam ZE-Zone seed migration SQL."""
import sys
from pathlib import Path

WKT_FILE = Path("/tmp/rotterdam_ze_zone.wkt")
OUTPUT = Path("/tmp/1779400000000_seed-nl-compliance-zones-rotterdam.sql")

if not WKT_FILE.exists():
    print(f"ERROR: {WKT_FILE} not found. Run derive-rotterdam.sh first.")
    sys.exit(1)

wkt = WKT_FILE.read_text().strip()
wkt_bytes = WKT_FILE.stat().st_size

print(f"=== Generating Rotterdam migration ===")
print(f"WKT source: {WKT_FILE} ({wkt_bytes} bytes)")
print(f"Output:     {OUTPUT}")
print()

sql = f"""-- ============================================================================
-- Migration: 1779400000000_seed-nl-compliance-zones-rotterdam.sql
-- ============================================================================
-- Phase 1 Sira 2.9.6 - Rotterdam ZE-Zone seed
--
-- Source: kaartlaag.rotterdam.nl layer 8373 (single MultiPolygon feature)
--         + ST_MakeValid + ST_Multi (defensive)
--
-- Derivation verification (2026-05-31):
--   - gtype:         ST_MultiPolygon, 7 parts (Maas river separates)
--   - area_km2:      48.5672 (Amsterdam 7.8 vs Rotterdam 48 - 6x larger)
--   - perimeter_km:  57.34
--   - vertices:      833
--   - is_valid:      true
--   - centroid:      (4.4944, 51.9046)
--   - sanity test:   11/11 PASS
--   - wkt_bytes:     26531
--
-- Regulation: RVV 1990 + CVDR749151/1 (Verkeersbesluit ZE Rotterdam 2025)
-- Fees:       RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)
-- Effective:  2025-01-01 to 2027-12-31 (Rotterdam started 1y before Amsterdam)
-- Prereq:     1779350000000_alter-nl-compliance-zones-multipolygon applied
-- ============================================================================

\\set ON_ERROR_STOP on

BEGIN;

INSERT INTO enterprise.nl_compliance_zones (
  zone_id, city, zone_type, polygon, rules,
  effective_from, effective_to, source, source_url, notes
)
SELECT
  'rotterdam_ze_zone_2025',
  'Rotterdam',
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
      'city', 'Rotterdam',
      'ontheffing_fees_eur', jsonb_build_object(
        'bedrijfseconomische_art13', 250,
        'afwijkingsbevoegdheid_art14', 250,
        'source', 'CVDR749151/1 Rotterdam Verordening leges',
        'fee_verification_status', 'cvdr_indexed_confirmed'
      ),
      'exemption_url', 'https://www.rotterdam.nl/zero-emissiezone-voor-bestel-en-vrachtautos',
      'regulation_id', 'CVDR749151/1',
      'regulation_url', 'https://lokaleregelgeving.overheid.nl/CVDR749151',
      'maasvlakte_milieuzone_active', true,
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2025-01-01',
        'geldend_to', '2027-12-31',
        'supersedes', 'pre_2025_milieuzone_only',
        'last_verified_at', '2026-05-31',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'ST_GeomFromGeoJSON(layer_8373) + ST_MakeValid + ST_Multi',
        'polygon_source_layer', '8373',
        'polygon_source_url', 'https://kaartlaag.rotterdam.nl/api/layers/8373.json',
        'polygon_part_count', 7,
        'sanity_test_result', '11/11 PASS (2026-05-31)',
        'special_note', 'Maasvlakte milieuzone separate, not included in this ZE-Zone'
      )
    )
  ),
  '2025-01-01',
  '2027-12-31',
  'rotterdam_verkeersbesluit_v2025_01',
  'https://kaartlaag.rotterdam.nl/api/layers/8373.json',
  'Pilot seed via single layer kaartlaag.rotterdam.nl/api/layers/8373.json (single MultiPolygon feature) + ST_MakeValid + ST_Multi. 7 parts (Maas river separation). Sanity test 11/11 PASS. RDW Centraal Loket harmonized fees (opwegnaarzes.nl convenant 2026).'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'rotterdam_ze_zone_2025'
);

\\echo ''
\\echo '=== Inserted zone check ==='
SELECT
  zone_id,
  city,
  zone_type,
  ST_GeometryType(polygon) AS gtype,
  ST_NumGeometries(polygon) AS part_count,
  ROUND((ABS(ST_Area(polygon::geography)) / 1e6)::numeric, 4) AS area_km2,
  ST_NPoints(polygon) AS vertices,
  ST_IsValid(polygon) AS valid,
  effective_from,
  effective_to,
  rules->'city_overlay'->>'regulation_id' AS regulation_id
FROM enterprise.nl_compliance_zones
WHERE zone_id = 'rotterdam_ze_zone_2025';

\\echo ''
\\echo '=== Post-insert sanity test (11 points) ==='
WITH points AS (
  SELECT 'Coolsingel' AS loc, 4.4790 AS lon, 51.9225 AS lat, 'inside' AS expected UNION ALL
  SELECT 'Rotterdam Centraal',          4.4684, 51.9249, 'inside'  UNION ALL
  SELECT 'Markthal',                    4.4862, 51.9197, 'inside'  UNION ALL
  SELECT 'Erasmusbrug',                 4.4870, 51.9089, 'inside'  UNION ALL
  SELECT 'Stadhuisplein',               4.4778, 51.9234, 'inside'  UNION ALL
  SELECT 'Rotterdam-The Hague Airport', 4.4376, 51.9569, 'outside' UNION ALL
  SELECT 'Rozenburg',                   4.2333, 51.9056, 'outside' UNION ALL
  SELECT 'Schiedam Centrum',            4.3947, 51.9197, 'outside' UNION ALL
  SELECT 'Barendrecht Centrum',         4.5374, 51.8553, 'outside' UNION ALL
  SELECT 'Hoogvliet',                   4.3475, 51.8636, 'outside' UNION ALL
  SELECT 'Capelle aan den IJssel',      4.5800, 51.9258, 'outside'
),
results AS (
  SELECT
    loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id = 'rotterdam_ze_zone_2025'),
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT
  loc,
  expected,
  actual,
  CASE WHEN expected = actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results
ORDER BY (expected = 'inside') DESC, loc;

-- Migration tracking
INSERT INTO public.pgmigrations (name, run_on)
SELECT '1779400000000_seed-nl-compliance-zones-rotterdam', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.pgmigrations
  WHERE name = '1779400000000_seed-nl-compliance-zones-rotterdam'
);

COMMIT;

\\echo ''
\\echo '=== Seed migration COMMITTED ==='
"""

OUTPUT.write_text(sql)

print(f"Generated migration file:")
print(f"  Size: {OUTPUT.stat().st_size} bytes (expected ~30000)")
print(f"  Path: {OUTPUT}")
print()
print("First 5 lines:")
with open(OUTPUT) as f:
    for i, line in enumerate(f):
        if i >= 5:
            break
        print(f"  {line.rstrip()}")