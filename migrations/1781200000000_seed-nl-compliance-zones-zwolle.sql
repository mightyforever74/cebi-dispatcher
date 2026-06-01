-- ============================================================================
-- Migration: 1781200000000_seed-nl-compliance-zones-zwolle.sql
-- ============================================================================
-- Phase 1 Batch (NDW harmonized) - Zwolle ZE-Zone seed
--
-- Source: NDW Open Data DATEX II (Bron NDW) https://opendata.ndw.nu/emissiezones.xml.gz
--         cz:urbanVehicleAccessRegulation name="ZE Zwolle"  id=NDW11_6447dfa9-d5ca-41f4-994d-53a85a14f69d
--         gmlMultiPolygon posList WGS84 (lat lon) -> GeoJSON (lon lat) + ST_MakeValid + ST_Multi
--
-- Derivation verification (2026-06-01):
--   gtype ST_MultiPolygon | parts 1 | area_km2 0.6032 | perimeter_km 3.38
--   vertices 35 | is_valid true | rep_point (6.0940,52.5127)
--   bbox [6.08633,52.50857]-[6.10178,52.51697]
--   sanity 11/11 PASS (5 interior + 6 exterior geometric points; NDW pipeline
--          landmark-validated on Leiden 2.9.11)
--   wkt_bytes 702
--
-- Regulation: RVV 1990 + verkeersbesluit gmb-2024-415263
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
  'zwolle_ze_zone_2025',
  'Zwolle',
  'ze_zone',
  ST_Multi(ST_MakeValid(ST_GeomFromText('MULTIPOLYGON (((6.10123 52.513126, 6.100562 52.513319, 6.10178 52.514672, 6.101476 52.514908, 6.099148 52.515191, 6.09873 52.516101, 6.098509 52.516187, 6.097436 52.516284, 6.095378 52.516968, 6.093787 52.516016, 6.09344 52.515973, 6.092511 52.515852, 6.09178 52.515348, 6.089383 52.5157, 6.089006 52.51463, 6.088597 52.514028, 6.087466 52.513458, 6.0876 52.51222, 6.087118 52.51173, 6.086428 52.510993, 6.086327 52.510582, 6.089419 52.510303, 6.090148 52.509893, 6.09112 52.508566, 6.092464 52.508901, 6.094099 52.509364, 6.095066 52.509219, 6.095909 52.509015, 6.097226 52.508886, 6.097425 52.50954, 6.097754 52.510146, 6.099809 52.510707, 6.099504 52.511752, 6.099726 52.512171, 6.10123 52.513126)))', 4326)))::geometry(MultiPolygon, 4326),
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
      'city', 'Zwolle',
      'gemeente', 'Zwolle',
      'regulation_id', 'gmb-2024-415263',
      'info_url', 'https://www.zwolle.nl/invoering-zero-emissiezone-in-2025',
      'transition_period_end', '2030-01-01',
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2025-01-01',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'NDW DATEX II Open Data (emissiezones.xml) gmlMultiPolygon WGS84 lat/lon -> GeoJSON lon/lat + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://opendata.ndw.nu/emissiezones.xml.gz',
        'ndw_zone_id', 'NDW11_6447dfa9-d5ca-41f4-994d-53a85a14f69d',
        'ndw_file_publication', '2026-05-31T06:00:00Z',
        'polygon_parts', 1,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'batch', 'phase1_ndw_batch_2026-06-01'
      )
    )
  ),
  '2025-01-01',
  '2027-12-31',
  'zwolle_verkeersbesluit_gmb_2024_415263',
  'https://www.zwolle.nl/invoering-zero-emissiezone-in-2025',
  'Batch seed via NDW DATEX II Open Data (harmonized national source, Bron NDW). Sanity 11/11 PASS. RDW Centraal Loket harmonized fees. Overgangsregeling until 2030.'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'zwolle_ze_zone_2025'
);

\echo ''
\echo '=== zwolle_ze_zone_2025: inserted zone check ==='
SELECT zone_id, city, zone_type, ST_GeometryType(polygon) AS gtype,
  ST_NumGeometries(polygon) AS part_count,
  ROUND((ABS(ST_Area(polygon::geography))/1e6)::numeric,4) AS area_km2,
  ST_NPoints(polygon) AS vertices, ST_IsValid(polygon) AS valid,
  effective_from, effective_to
FROM enterprise.nl_compliance_zones WHERE zone_id = 'zwolle_ze_zone_2025';

\echo ''
\echo '=== zwolle_ze_zone_2025: sanity (11 points) ==='
WITH points AS (
  SELECT 'interior_rep' AS loc, 6.094034 AS lon, 52.512673 AS lat, 'inside' AS expected UNION ALL
  SELECT 'interior_2', 6.097681, 52.512917, 'inside' UNION ALL
  SELECT 'interior_3', 6.097347, 52.513014, 'inside' UNION ALL
  SELECT 'interior_4', 6.097956, 52.513690, 'inside' UNION ALL
  SELECT 'interior_5', 6.097804, 52.513808, 'inside' UNION ALL
  SELECT 'exterior_NW', 6.074327, 52.528968, 'outside' UNION ALL
  SELECT 'exterior_NE', 6.113780, 52.528968, 'outside' UNION ALL
  SELECT 'exterior_SW', 6.074327, 52.496566, 'outside' UNION ALL
  SELECT 'exterior_SE', 6.113780, 52.496566, 'outside' UNION ALL
  SELECT 'exterior_N', 6.094053, 52.528968, 'outside' UNION ALL
  SELECT 'exterior_S', 6.094053, 52.496566, 'outside'
),
results AS (
  SELECT loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id='zwolle_ze_zone_2025'),
      ST_SetSRID(ST_MakePoint(lon,lat),4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected=actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results ORDER BY (expected='inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1781200000000_seed-nl-compliance-zones-zwolle', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pgmigrations WHERE name='1781200000000_seed-nl-compliance-zones-zwolle');

COMMIT;
\echo '=== zwolle_ze_zone_2025 COMMITTED ==='
