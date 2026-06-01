-- ============================================================================
-- Migration: 1780500000000_seed-nl-compliance-zones-gouda.sql
-- ============================================================================
-- Phase 1 Batch (NDW harmonized) - Gouda ZE-Zone seed
--
-- Source: NDW Open Data DATEX II (Bron NDW) https://opendata.ndw.nu/emissiezones.xml.gz
--         cz:urbanVehicleAccessRegulation name="ZE Gouda"  id=NDW11_083e2bb9-4744-4617-9da3-8cb62c3ff298
--         gmlMultiPolygon posList WGS84 (lat lon) -> GeoJSON (lon lat) + ST_MakeValid + ST_Multi
--
-- Derivation verification (2026-06-01):
--   gtype ST_MultiPolygon | parts 1 | area_km2 0.6050 | perimeter_km 2.94
--   vertices 39 | is_valid true | rep_point (4.7093,52.0110)
--   bbox [4.70310,52.00657]-[4.71595,52.01537]
--   sanity 11/11 PASS (5 interior + 6 exterior geometric points; NDW pipeline
--          landmark-validated on Leiden 2.9.11)
--   wkt_bytes 1027
--
-- Regulation: RVV 1990 + verkeersbesluit gmb-2024-260921
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
  'gouda_ze_zone_2025',
  'Gouda',
  'ze_zone',
  ST_Multi(ST_MakeValid(ST_GeomFromText('MULTIPOLYGON (((4.703237 52.009751, 4.703699 52.009232, 4.704772 52.008605, 4.706987 52.007575, 4.708747 52.007069, 4.710753 52.00697, 4.711863 52.006569, 4.712102 52.0068, 4.712909 52.006989, 4.713754 52.007093, 4.714371 52.007172, 4.715946 52.007357, 4.715769 52.00912, 4.715458 52.010338, 4.715007 52.012224, 4.714454 52.012795, 4.713355 52.01396, 4.711697 52.014816, 4.710184 52.015374, 4.709235 52.01537, 4.708312 52.014865, 4.704579 52.012808, 4.703554 52.012031, 4.703708 52.011829, 4.703690360963969 52.01176616849277, 4.703654416129331 52.011728741472645, 4.703620645140161 52.01173095752486, 4.703557135511991 52.0116485170436, 4.703217499423637 52.01145398604015, 4.703102663248296 52.01136935975591, 4.703281486235454 52.01125200258524, 4.703247111897363 52.01106062166344, 4.703201266522446 52.01085383527424, 4.703182536128416 52.0105938230091, 4.70317477638343 52.01012788706734, 4.703166926965071 52.01002969511551, 4.70316710334427 52.00998814910506, 4.703194978245771 52.009892193634755, 4.703237 52.009751)))', 4326)))::geometry(MultiPolygon, 4326),
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
      'city', 'Gouda',
      'gemeente', 'Gouda',
      'regulation_id', 'gmb-2024-260921',
      'info_url', 'https://www.gouda.nl',
      'transition_period_end', '2030-01-01',
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2025-01-01',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'NDW DATEX II Open Data (emissiezones.xml) gmlMultiPolygon WGS84 lat/lon -> GeoJSON lon/lat + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://opendata.ndw.nu/emissiezones.xml.gz',
        'ndw_zone_id', 'NDW11_083e2bb9-4744-4617-9da3-8cb62c3ff298',
        'ndw_file_publication', '2026-05-31T06:00:00Z',
        'polygon_parts', 1,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'batch', 'phase1_ndw_batch_2026-06-01'
      )
    )
  ),
  '2025-01-01',
  '2027-12-31',
  'gouda_verkeersbesluit_gmb_2024_260921',
  'https://www.gouda.nl',
  'Batch seed via NDW DATEX II Open Data (harmonized national source, Bron NDW). Sanity 11/11 PASS. RDW Centraal Loket harmonized fees. Overgangsregeling until 2030.'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'gouda_ze_zone_2025'
);

\echo ''
\echo '=== gouda_ze_zone_2025: inserted zone check ==='
SELECT zone_id, city, zone_type, ST_GeometryType(polygon) AS gtype,
  ST_NumGeometries(polygon) AS part_count,
  ROUND((ABS(ST_Area(polygon::geography))/1e6)::numeric,4) AS area_km2,
  ST_NPoints(polygon) AS vertices, ST_IsValid(polygon) AS valid,
  effective_from, effective_to
FROM enterprise.nl_compliance_zones WHERE zone_id = 'gouda_ze_zone_2025';

\echo ''
\echo '=== gouda_ze_zone_2025: sanity (11 points) ==='
WITH points AS (
  SELECT 'interior_rep' AS loc, 4.709267 AS lon, 52.010957 AS lat, 'inside' AS expected UNION ALL
  SELECT 'interior_2', 4.706535, 52.010245, 'inside' UNION ALL
  SELECT 'interior_3', 4.706766, 52.009986, 'inside' UNION ALL
  SELECT 'interior_4', 4.707302, 52.009672, 'inside' UNION ALL
  SELECT 'interior_5', 4.708410, 52.009157, 'inside' UNION ALL
  SELECT 'exterior_NW', 4.691103, 52.027374, 'outside' UNION ALL
  SELECT 'exterior_NE', 4.727946, 52.027374, 'outside' UNION ALL
  SELECT 'exterior_SW', 4.691103, 51.994569, 'outside' UNION ALL
  SELECT 'exterior_SE', 4.727946, 51.994569, 'outside' UNION ALL
  SELECT 'exterior_N', 4.709524, 52.027374, 'outside' UNION ALL
  SELECT 'exterior_S', 4.709524, 51.994569, 'outside'
),
results AS (
  SELECT loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id='gouda_ze_zone_2025'),
      ST_SetSRID(ST_MakePoint(lon,lat),4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected=actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results ORDER BY (expected='inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1780500000000_seed-nl-compliance-zones-gouda', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pgmigrations WHERE name='1780500000000_seed-nl-compliance-zones-gouda');

COMMIT;
\echo '=== gouda_ze_zone_2025 COMMITTED ==='
