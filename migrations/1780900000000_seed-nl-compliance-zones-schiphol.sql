-- ============================================================================
-- Migration: 1780900000000_seed-nl-compliance-zones-schiphol.sql
-- ============================================================================
-- Phase 1 Batch (NDW harmonized) - Schiphol ZE-Zone seed
--
-- Source: NDW Open Data DATEX II (Bron NDW) https://opendata.ndw.nu/emissiezones.xml.gz
--         cz:urbanVehicleAccessRegulation name="ZE Schiphol"  id=NDW11_a072a07b-1043-4da2-aa8f-b083419a1d6a
--         gmlMultiPolygon posList WGS84 (lat lon) -> GeoJSON (lon lat) + ST_MakeValid + ST_Multi
--
-- Derivation verification (2026-06-01):
--   gtype ST_MultiPolygon | parts 1 | area_km2 0.2319 | perimeter_km 2.13
--   vertices 25 | is_valid true | rep_point (4.7590,52.3081)
--   bbox [4.75376,52.30582]-[4.76457,52.31042]
--   sanity 11/11 PASS (5 interior + 6 exterior geometric points; NDW pipeline
--          landmark-validated on Leiden 2.9.11)
--   wkt_bytes 513
--
-- Regulation: RVV 1990 + verkeersbesluit gmb-2025-302529
-- Fees:       RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)
-- Effective:  2026-01-01 (overgangsregeling tot 2030)
-- Prereq:     1779350000000_alter-nl-compliance-zones-multipolygon applied
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

INSERT INTO enterprise.nl_compliance_zones (
  zone_id, city, zone_type, polygon, rules,
  effective_from, effective_to, source, source_url, notes
)
SELECT
  'schiphol_ze_zone_2026',
  'Schiphol',
  'ze_zone',
  ST_Multi(ST_MakeValid(ST_GeomFromText('MULTIPOLYGON (((4.753761 52.307127, 4.753972 52.306671, 4.754369 52.306518, 4.756307 52.306101, 4.756899 52.306064, 4.757178 52.306194, 4.757358 52.30582, 4.760904 52.307052, 4.76207 52.307499, 4.762716 52.306803, 4.763627 52.306771, 4.764572 52.30719, 4.763607 52.308174, 4.763786 52.310049, 4.762549 52.310423, 4.759661 52.310271, 4.759349 52.309937, 4.758111 52.30978, 4.757496 52.309474, 4.756068 52.308932, 4.755473 52.308649, 4.754239 52.308045, 4.754107 52.307895, 4.753831 52.307459, 4.753761 52.307127)))', 4326)))::geometry(MultiPolygon, 4326),
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
      'city', 'Schiphol',
      'gemeente', 'Haarlemmermeer',
      'regulation_id', 'gmb-2025-302529',
      'info_url', 'https://haarlemmermeergemeente.nl/zero-emissiezone-schiphol',
      'transition_period_end', '2030-01-01',
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2026-01-01',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'NDW DATEX II Open Data (emissiezones.xml) gmlMultiPolygon WGS84 lat/lon -> GeoJSON lon/lat + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://opendata.ndw.nu/emissiezones.xml.gz',
        'ndw_zone_id', 'NDW11_a072a07b-1043-4da2-aa8f-b083419a1d6a',
        'ndw_file_publication', '2026-05-31T06:00:00Z',
        'polygon_parts', 1,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'batch', 'phase1_ndw_batch_2026-06-01'
      )
    )
  ),
  '2026-01-01',
  '2027-12-31',
  'schiphol_verkeersbesluit_gmb_2025_302529',
  'https://haarlemmermeergemeente.nl/zero-emissiezone-schiphol',
  'Batch seed via NDW DATEX II Open Data (harmonized national source, Bron NDW). Sanity 11/11 PASS. RDW Centraal Loket harmonized fees. Overgangsregeling until 2030.'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'schiphol_ze_zone_2026'
);

\echo ''
\echo '=== schiphol_ze_zone_2026: inserted zone check ==='
SELECT zone_id, city, zone_type, ST_GeometryType(polygon) AS gtype,
  ST_NumGeometries(polygon) AS part_count,
  ROUND((ABS(ST_Area(polygon::geography))/1e6)::numeric,4) AS area_km2,
  ST_NPoints(polygon) AS vertices, ST_IsValid(polygon) AS valid,
  effective_from, effective_to
FROM enterprise.nl_compliance_zones WHERE zone_id = 'schiphol_ze_zone_2026';

\echo ''
\echo '=== schiphol_ze_zone_2026: sanity (11 points) ==='
WITH points AS (
  SELECT 'interior_rep' AS loc, 4.759021 AS lon, 52.308110 AS lat, 'inside' AS expected UNION ALL
  SELECT 'interior_2', 4.756517, 52.307637, 'inside' UNION ALL
  SELECT 'interior_3', 4.756623, 52.307409, 'inside' UNION ALL
  SELECT 'interior_4', 4.756821, 52.307332, 'inside' UNION ALL
  SELECT 'interior_5', 4.757790, 52.307124, 'inside' UNION ALL
  SELECT 'exterior_NW', 4.741761, 52.322423, 'outside' UNION ALL
  SELECT 'exterior_NE', 4.776572, 52.322423, 'outside' UNION ALL
  SELECT 'exterior_SW', 4.741761, 52.293820, 'outside' UNION ALL
  SELECT 'exterior_SE', 4.776572, 52.293820, 'outside' UNION ALL
  SELECT 'exterior_N', 4.759167, 52.322423, 'outside' UNION ALL
  SELECT 'exterior_S', 4.759167, 52.293820, 'outside'
),
results AS (
  SELECT loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id='schiphol_ze_zone_2026'),
      ST_SetSRID(ST_MakePoint(lon,lat),4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected=actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results ORDER BY (expected='inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1780900000000_seed-nl-compliance-zones-schiphol', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pgmigrations WHERE name='1780900000000_seed-nl-compliance-zones-schiphol');

COMMIT;
\echo '=== schiphol_ze_zone_2026 COMMITTED ==='
