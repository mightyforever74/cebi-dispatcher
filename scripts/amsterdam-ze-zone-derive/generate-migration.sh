#!/bin/bash
set -e

OUTPUT="/tmp/1779300000000_seed-nl-compliance-zones-pilot-amsterdam.sql"
WKT_FILE="/tmp/amsterdam_ze_zone.wkt"

if [ ! -f "$WKT_FILE" ]; then
  echo "ERROR: $WKT_FILE not found. Run derive.sh first."
  exit 1
fi

WKT=$(cat "$WKT_FILE")
WKT_BYTES=$(wc -c < "$WKT_FILE")

echo "=== Generating migration ==="
echo "WKT source: $WKT_FILE ($WKT_BYTES bytes)"
echo "Output:     $OUTPUT"
echo ""

cat > "$OUTPUT" << SQLEOF
-- ============================================================================
-- Migration: 1779300000000_seed-nl-compliance-zones-pilot-amsterdam.sql
-- ============================================================================
-- Phase 1 Sira 2.9.5 - Amsterdam ZE-Zone pilot seed
--
-- Source: ST_Difference(layer_19419, layer_42487) with ST_MakeValid + noise
--         filter (>1000m2 geography area), RESEARCH section G.4 formula
--
-- Derivation verification (2026-05-30):
--   - geom_type:     ST_Polygon
--   - area_km2:      7.8402 (matches RESEARCH G.5)
--   - perimeter_km:  16.85
--   - vertices:      666
--   - is_valid:      true
--   - centroid:      (4.9005, 52.3715)
--   - sanity test:   11/11 PASS
--   - wkt_bytes:     17860
--
-- Regulation basis: RVV 1990 + CVDR752146/1 (Amsterdam verkeersbesluit)
-- Ontheffing fees:  Landelijk harmonized - Rotterdam CVDR749151/1 proxy
-- Effective:        2026-01-01 to 2027-12-31
--
-- Idempotency:      ON CONFLICT DO NOTHING
-- Tracking:         public.pgmigrations entry on COMMIT
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

INSERT INTO enterprise.nl_compliance_zones (
  zone_id,
  city,
  zone_type,
  polygon,
  rules,
  effective_from,
  effective_to,
  source,
  source_url,
  notes
) VALUES (
  'amsterdam_ze_zone_2026',
  'Amsterdam',
  'ze_zone',
  ST_GeomFromText('${WKT}', 4326),
  jsonb_build_object(
    'shared_rules', jsonb_build_object(
      'regulation_basis', 'RVV 1990 + CVDR752146/1',
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
        'source', 'Rotterdam CVDR749151/1 proxy (landelijk afgestemd)',
        'carrier_regulation_proxy', 'Rotterdam - Amsterdam own CVDR pending'
      ),
      'exempt_categories', jsonb_build_array(
        'zero_emission',
        'essential_services',
        'emergency_services',
        'national_ontheffing_via_RDW'
      ),
      'national_ontheffing_recognition', jsonb_build_object(
        'basis', 'Art 17 RVV (cross-zone)',
        'central_loket', 'RDW'
      )
    ),
    'city_overlay', jsonb_build_object(
      'city', 'Amsterdam',
      'ontheffing_fees_eur', jsonb_build_object(
        'bedrijfseconomische_art13', 250,
        'afwijkingsbevoegdheid_art14', 250,
        'source', 'Rotterdam proxy - Amsterdam own Verordening leges CVDR not yet indexed',
        'fee_verification_status', 'rotterdam_proxy_used',
        'verify_after', '2026-06-15'
      ),
      'exemption_url', 'https://amsterdam.nl/ontheffing-aanvraag',
      'regulation_id', 'CVDR752146/1',
      'regulation_url', 'https://lokaleregelgeving.overheid.nl/CVDR752146',
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2026-01-01',
        'geldend_to', '2027-12-31',
        'supersedes', 'pre_2026_milieuzone_only',
        'decision_date', '2024-06-18',
        'last_verified_at', '2026-05-30',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'ST_Difference(layer_19419, layer_42487) + ST_MakeValid + ABS(ST_Area)>1000m2',
        'polygon_source_layers', jsonb_build_object(
          'layer_19419', 'Milieuzone / uitstootvrije zone (union)',
          'layer_42487', 'Bestel- en vrachtauto milieuzone (ring)'
        ),
        'polygon_source_url', 'https://kaart.amsterdam.nl/milieuzones-verkeer-amsterdam',
        'sanity_test_result', '11/11 PASS (2026-05-30)',
        'fee_verification_status', 'rotterdam_proxy_used'
      )
    )
  ),
  '2026-01-01',
  '2027-12-31',
  'amsterdam_toegangsbeleid_v2026_05',
  'https://kaart.amsterdam.nl/milieuzones-verkeer-amsterdam',
  'Pilot seed via ST_Difference(layer_19419, layer_42487) + ST_MakeValid + noise filter >1000m2. Sanity test 11/11 PASS. See rules.city_overlay._meta for full audit metadata.'
)
ON CONFLICT (zone_id) DO NOTHING;

\echo ''
\echo '=== Inserted zone check ==='
SELECT
  zone_id,
  city,
  zone_type,
  ROUND((ABS(ST_Area(polygon::geography)) / 1e6)::numeric, 4) AS area_km2,
  ST_NPoints(polygon) AS vertices,
  ST_IsValid(polygon) AS valid,
  effective_from,
  effective_to,
  rules->'city_overlay'->>'regulation_id' AS regulation_id
FROM enterprise.nl_compliance_zones
WHERE zone_id = 'amsterdam_ze_zone_2026';

\echo ''
\echo '=== Post-insert sanity test (11 points) ==='
WITH points AS (
  SELECT 'Dam Square' AS loc, 4.8924 AS lon, 52.3731 AS lat, 'inside' AS expected UNION ALL
  SELECT 'Amsterdam Centraal',    4.9008, 52.3791, 'inside'  UNION ALL
  SELECT 'Rembrandtplein',        4.8956, 52.3661, 'inside'  UNION ALL
  SELECT 'Leidseplein',           4.8830, 52.3640, 'inside'  UNION ALL
  SELECT 'Waterlooplein',         4.9020, 52.3667, 'inside'  UNION ALL
  SELECT 'Westerpark',            4.8757, 52.3863, 'outside' UNION ALL
  SELECT 'Vondelpark',            4.8730, 52.3580, 'outside' UNION ALL
  SELECT 'RAI Zuid',              4.8854, 52.3417, 'outside' UNION ALL
  SELECT 'NDSM Noord',            4.8997, 52.4011, 'outside' UNION ALL
  SELECT 'Schiphol',              4.7639, 52.3086, 'outside' UNION ALL
  SELECT 'Haarlem',               4.6379, 52.3812, 'outside'
),
results AS (
  SELECT
    loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id = 'amsterdam_ze_zone_2026'),
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

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1779300000000_seed-nl-compliance-zones-pilot-amsterdam', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.pgmigrations 
  WHERE name = '1779300000000_seed-nl-compliance-zones-pilot-amsterdam'
);

COMMIT;

\echo ''
\echo '=== Seed migration COMMITTED ==='
SQLEOF

echo "Generated migration file:"
ls -lh "$OUTPUT"
echo ""
echo "First 5 lines:"
head -5 "$OUTPUT"
echo ""
echo "File size: $(wc -c < $OUTPUT) bytes (expected ~24000)"