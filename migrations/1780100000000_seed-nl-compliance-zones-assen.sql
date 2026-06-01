-- ============================================================================
-- Migration: 1780100000000_seed-nl-compliance-zones-assen.sql
-- ============================================================================
-- Phase 1 Batch (NDW harmonized) - Assen ZE-Zone seed
--
-- Source: NDW Open Data DATEX II (Bron NDW) https://opendata.ndw.nu/emissiezones.xml.gz
--         cz:urbanVehicleAccessRegulation name="ZE Assen"  id=NDW11_be90b4d7-f5ee-4cee-abbb-f73319e80a0f
--         gmlMultiPolygon posList WGS84 (lat lon) -> GeoJSON (lon lat) + ST_MakeValid + ST_Multi
--
-- Derivation verification (2026-06-01):
--   gtype ST_MultiPolygon | parts 1 | area_km2 0.1094 | perimeter_km 1.95
--   vertices 39 | is_valid true | rep_point (6.5615,52.9951)
--   bbox [6.55872,52.99243]-[6.56475,52.99756]
--   sanity 11/11 PASS (5 interior + 6 exterior geometric points; NDW pipeline
--          landmark-validated on Leiden 2.9.11)
--   wkt_bytes 788
--
-- Regulation: RVV 1990 + verkeersbesluit gmb-2024-471201
-- Fees:       RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)
-- Effective:  2025-01-01 (overgangsregeling tot 2030)
-- Prereq:     1779350000000_alter-nl-compliance-zones-multipolygon applied
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

INSERT INTO enterprise.nl_compliance_zones (
  zone_id, city, zone_type, polygon, rules,
  effective_from, effective_to, source, source_url, notes
)
SELECT
  'assen_ze_zone_2025',
  'Assen',
  'ze_zone',
  ST_Multi(ST_MakeValid(ST_GeomFromText('MULTIPOLYGON (((6.560246 52.992433, 6.560399 52.99253, 6.562625 52.99322, 6.562952 52.993305, 6.563156 52.993178, 6.563776 52.993032, 6.564519 52.993074, 6.564519 52.993223, 6.564428 52.99322, 6.564428 52.993307, 6.564444 52.993559, 6.564749 52.99351, 6.564749 52.993995, 6.563312 52.993998, 6.563382 52.996197, 6.56345 52.996235, 6.563446 52.996318, 6.56269 52.996324, 6.56235 52.996327, 6.561725 52.996096, 6.561665 52.995965, 6.561422 52.995925, 6.561205 52.995966, 6.560552 52.995985, 6.560348 52.996261, 6.560176 52.996678, 6.560482 52.996879, 6.560774 52.996928, 6.560538 52.997391, 6.559525 52.997291, 6.559369 52.997562, 6.55872 52.997417, 6.559525 52.995425, 6.559803 52.994702, 6.559637 52.994614, 6.559702 52.99443, 6.560061 52.994169, 6.559981 52.992577, 6.560246 52.992433)))', 4326)))::geometry(MultiPolygon, 4326),
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
        'dagontheffing', 100, 'kortdurende_ontheffing_1week', 60,
        'maatwerk_ontheffing_1maand', 25, 'verzendkosten', 30, 'bezwaarschrift', 0,
        'source', 'RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)',
        'fee_status', 'rdw_harmonized_confirmed'
      ),
      'exempt_categories', jsonb_build_array(
        'zero_emission','essential_services','emergency_services',
        'national_ontheffing_via_RDW','oldtimer_40plus_years','wheelchair_accessible'
      ),
      'national_ontheffing_recognition', jsonb_build_object(
        'basis', 'Art 17 RVV (cross-zone)', 'central_loket', 'RDW',
        'central_loket_url', 'https://www.rdw.nl/ontheffing-zero-emissie'
      )
    ),
    'city_overlay', jsonb_build_object(
      'city', 'Assen',
      'gemeente', 'Assen',
      'regulation_id', 'gmb-2024-471201',
      'info_url', 'https://www.assen.nl/zero-emissiezone',
      'transition_period_end', '2030-01-01',
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2025-01-01',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'NDW DATEX II Open Data (emissiezones.xml) gmlMultiPolygon WGS84 lat/lon -> GeoJSON lon/lat + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://opendata.ndw.nu/emissiezones.xml.gz',
        'ndw_zone_id', 'NDW11_be90b4d7-f5ee-4cee-abbb-f73319e80a0f',
        'ndw_file_publication', '2026-05-31T06:00:00Z',
        'polygon_parts', 1,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'batch', 'phase1_ndw_batch_2026-06-01'
      )
    )
  ),
  '2025-01-01',
  '2027-12-31',
  'assen_verkeersbesluit_gmb_2024_471201',
  'https://www.assen.nl/zero-emissiezone',
  'Batch seed via NDW DATEX II Open Data (harmonized national source, Bron NDW). Sanity 11/11 PASS. RDW Centraal Loket harmonized fees. Overgangsregeling until 2030.'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'assen_ze_zone_2025'
);

\echo ''
\echo '=== assen_ze_zone_2025: inserted zone check ==='
SELECT zone_id, city, zone_type, ST_GeometryType(polygon) AS gtype,
  ST_NumGeometries(polygon) AS part_count,
  ROUND((ABS(ST_Area(polygon::geography))/1e6)::numeric,4) AS area_km2,
  ST_NPoints(polygon) AS vertices, ST_IsValid(polygon) AS valid,
  effective_from, effective_to
FROM enterprise.nl_compliance_zones WHERE zone_id = 'assen_ze_zone_2025';

\echo ''
\echo '=== assen_ze_zone_2025: sanity (11 points) ==='
WITH points AS (
  SELECT 'interior_rep' AS loc, 6.561505 AS lon, 52.995064 AS lat, 'inside' AS expected UNION ALL
  SELECT 'interior_2', 6.560861, 52.993610, 'inside' UNION ALL
  SELECT 'interior_3', 6.560937, 52.993659, 'inside' UNION ALL
  SELECT 'interior_4', 6.562050, 52.994004, 'inside' UNION ALL
  SELECT 'interior_5', 6.562214, 52.994046, 'inside' UNION ALL
  SELECT 'exterior_NW', 6.546720, 53.009562, 'outside' UNION ALL
  SELECT 'exterior_NE', 6.576749, 53.009562, 'outside' UNION ALL
  SELECT 'exterior_SW', 6.546720, 52.980433, 'outside' UNION ALL
  SELECT 'exterior_SE', 6.576749, 52.980433, 'outside' UNION ALL
  SELECT 'exterior_N', 6.561735, 53.009562, 'outside' UNION ALL
  SELECT 'exterior_S', 6.561735, 52.980433, 'outside'
),
results AS (
  SELECT loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id='assen_ze_zone_2025'),
      ST_SetSRID(ST_MakePoint(lon,lat),4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected=actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results ORDER BY (expected='inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1780100000000_seed-nl-compliance-zones-assen', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pgmigrations WHERE name='1780100000000_seed-nl-compliance-zones-assen');

COMMIT;
\echo '=== assen_ze_zone_2025 COMMITTED ==='
