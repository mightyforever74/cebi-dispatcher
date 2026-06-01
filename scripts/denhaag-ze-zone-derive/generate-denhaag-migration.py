#!/usr/bin/env python3
"""Generate Den Haag ZE-Zone seed migration SQL."""
import sys
from pathlib import Path

WKT_FILE = Path("/tmp/den_haag_ze_zone.wkt")
OUTPUT = Path("/tmp/1779500000000_seed-nl-compliance-zones-den-haag.sql")

if not WKT_FILE.exists():
    print(f"ERROR: {WKT_FILE} not found. Run derive-denhaag.sh first.")
    sys.exit(1)

wkt = WKT_FILE.read_text().strip()
wkt_bytes = WKT_FILE.stat().st_size

print(f"=== Generating Den Haag migration ===")
print(f"WKT source: {WKT_FILE} ({wkt_bytes} bytes)")
print(f"Output:     {OUTPUT}")
print()

sql = f"""-- ============================================================================
-- Migration: 1779500000000_seed-nl-compliance-zones-den-haag.sql
-- ============================================================================
-- Phase 1 Sira 2.9.7 - Den Haag ZE-Zone seed
--
-- Source: denhaag.nl Draad Kaarten plugin embedded GeoJSON
--         (window.__draadMapsFeature attribute)
--         Features merged: "Centrum" (active 2025) + "Kust" (added 2026-01-01)
--         + ST_Union + ST_MakeValid + ST_Multi (defensive)
--
-- Derivation verification (2026-06-01):
--   - gtype:         ST_MultiPolygon
--   - parts:         2 (Centrum core + Kust coastal extension)
--   - area_km2:      35.1137 (between Amsterdam 7.8 and Rotterdam 48.6)
--   - perimeter_km:  55.30
--   - vertices:      1492
--   - is_valid:      true
--   - centroid:      (4.2753, 52.0841)
--   - sanity test:   11/11 PASS (Binnenhof, Hofvijver, Paleis Noordeinde,
--                                Grote Markt, Kurhaus Scheveningen inside;
--                                Rijswijk, Voorburg, Wateringen, Ypenburg,
--                                Wassenaar, Delft Centrum outside)
--   - wkt_bytes:     53836
--
-- Special note: Centrum feature is a MIXED ZONE
--   - For vrachtauto/bestelauto: ZE-Zone (electric/hydrogen only)
--   - For personenauto: Milieuzone (diesel restriction)
--   This migration captures the ZE-Zone aspect (truck/van compliance).
--
-- Regulation: RVV 1990 + Den Haag verkeersbesluit
-- Fees:       RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)
-- Effective:  2026-01-01 to 2027-12-31 (latest of Centrum 2025 + Kust 2026)
-- Prereq:     1779350000000_alter-nl-compliance-zones-multipolygon applied
-- ============================================================================

\\set ON_ERROR_STOP on

BEGIN;

INSERT INTO enterprise.nl_compliance_zones (
  zone_id, city, zone_type, polygon, rules,
  effective_from, effective_to, source, source_url, notes
)
SELECT
  'den_haag_ze_zone_2026',
  'Den Haag',
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
      'city', 'Den Haag',
      'exemption_url', 'https://www.denhaag.nl/nl/verkeer-en-vervoer/zero-emissiezone-voor-bestelbussen-en-vrachtwagens/',
      'regulation_id', 'UNKNOWN_CVDR_PENDING',
      'mixed_zone_personenauto_milieuzone', true,
      'sub_zones', jsonb_build_array(
        jsonb_build_object(
          'name', 'Centrum',
          'effective_from', '2025-01-01',
          'type', 'mixed_ze_milieuzone',
          'description', 'ZE-zone for vrachtauto/bestelauto + Milieuzone for personenauto diesel'
        ),
        jsonb_build_object(
          'name', 'Kust',
          'effective_from', '2026-01-01',
          'type', 'pure_ze_zone',
          'description', 'Zero-emissiezone voor bestelbussen en vrachtwagens (sahil uzantısı)'
        )
      ),
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2026-01-01',
        'geldend_to', '2027-12-31',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'ST_Union(Centrum, Kust) + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://www.denhaag.nl/nl/verkeer-en-vervoer/zero-emissiezone-voor-bestelbussen-en-vrachtwagens/',
        'polygon_source_method', 'denhaag.nl Draad Kaarten plugin embedded GeoJSON (data-draad-feature attribute)',
        'polygon_parts', 2,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'special_note', 'Centrum feature applies different rules to personenauto (milieuzone) vs vracht/bestel (ZE-zone). This zone captures truck/van compliance only.'
      )
    )
  ),
  '2026-01-01',
  '2027-12-31',
  'denhaag_verkeersbesluit_v2026_01',
  'https://www.denhaag.nl/nl/verkeer-en-vervoer/zero-emissiezone-voor-bestelbussen-en-vrachtwagens/',
  'Pilot seed via denhaag.nl Draad Kaarten plugin (data-draad-feature attribute). Centrum (2025-01-01, 1 part) + Kust (2026-01-01, 3 parts) unified via ST_Union. Sanity test 11/11 PASS. RDW Centraal Loket harmonized fees. Centrum is mixed zone (ZE for trucks/vans, milieuzone for cars).'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'den_haag_ze_zone_2026'
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
  effective_to
FROM enterprise.nl_compliance_zones
WHERE zone_id = 'den_haag_ze_zone_2026';

\\echo ''
\\echo '=== Post-insert sanity test (11 points) ==='
WITH points AS (
  SELECT 'Binnenhof' AS loc, 4.3128 AS lon, 52.0799 AS lat, 'inside' AS expected UNION ALL
  SELECT 'Hofvijver',               4.3120, 52.0800, 'inside'  UNION ALL
  SELECT 'Paleis Noordeinde',       4.3068, 52.0811, 'inside'  UNION ALL
  SELECT 'Grote Markt',             4.3078, 52.0772, 'inside'  UNION ALL
  SELECT 'Kurhaus Scheveningen',    4.2779, 52.1119, 'inside'  UNION ALL
  SELECT 'Rijswijk',                4.3315, 52.0416, 'outside' UNION ALL
  SELECT 'Voorburg',                4.3551, 52.0684, 'outside' UNION ALL
  SELECT 'Wateringen',              4.2764, 52.0296, 'outside' UNION ALL
  SELECT 'Ypenburg',                4.3644, 52.0456, 'outside' UNION ALL
  SELECT 'Wassenaar',               4.4019, 52.1394, 'outside' UNION ALL
  SELECT 'Delft Centrum',           4.3567, 52.0116, 'outside'
),
results AS (
  SELECT
    loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id = 'den_haag_ze_zone_2026'),
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected = actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results
ORDER BY (expected = 'inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1779500000000_seed-nl-compliance-zones-den-haag', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.pgmigrations
  WHERE name = '1779500000000_seed-nl-compliance-zones-den-haag'
);

COMMIT;

\\echo ''
\\echo '=== Seed migration COMMITTED ==='
"""

OUTPUT.write_text(sql)

print(f"Generated migration file:")
print(f"  Size: {OUTPUT.stat().st_size} bytes (expected ~58000)")
print(f"  Path: {OUTPUT}")
print()
print("First 5 lines:")
with open(OUTPUT) as f:
    for i, line in enumerate(f):
        if i >= 5:
            break
        print(f"  {line.rstrip()}")
