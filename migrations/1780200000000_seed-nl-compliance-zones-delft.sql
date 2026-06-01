-- ============================================================================
-- Migration: 1780200000000_seed-nl-compliance-zones-delft.sql
-- ============================================================================
-- Phase 1 Batch (NDW harmonized) - Delft ZE-Zone seed
--
-- Source: NDW Open Data DATEX II (Bron NDW) https://opendata.ndw.nu/emissiezones.xml.gz
--         cz:urbanVehicleAccessRegulation name="ZE Delft"  id=NDW11_ee204cc2-24ec-4459-adaa-f31bb142516e
--         gmlMultiPolygon posList WGS84 (lat lon) -> GeoJSON (lon lat) + ST_MakeValid + ST_Multi
--
-- Derivation verification (2026-06-01):
--   gtype ST_MultiPolygon | parts 1 | area_km2 1.0821 | perimeter_km 4.48
--   vertices 31 | is_valid true | rep_point (4.3597,52.0126)
--   bbox [4.35061,52.00536]-[4.36915,52.01966]
--   sanity 11/11 PASS (5 interior + 6 exterior geometric points; NDW pipeline
--          landmark-validated on Leiden 2.9.11)
--   wkt_bytes 628
--
-- Regulation: RVV 1990 + verkeersbesluit gmb-2024-300398
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
  'delft_ze_zone_2025',
  'Delft',
  'ze_zone',
  ST_Multi(ST_MakeValid(ST_GeomFromText('MULTIPOLYGON (((4.366143 52.007816, 4.368632 52.009031, 4.369147 52.009982, 4.368975 52.011448, 4.367473 52.01232, 4.364769 52.013984, 4.358675 52.018355, 4.357334 52.019279, 4.355757 52.019662, 4.352828 52.019616, 4.352936 52.01819, 4.353075 52.017477, 4.352522 52.017021, 4.351283 52.016021, 4.351074 52.015512, 4.350688 52.015304, 4.350613 52.01471, 4.350693 52.01436, 4.352131 52.012884, 4.3541 52.011029, 4.356047 52.009057, 4.358906 52.005699, 4.359142 52.005362, 4.360816 52.00598, 4.362114 52.006495, 4.362726 52.00704, 4.363037 52.007707, 4.364764 52.008542, 4.365279 52.00847, 4.365917 52.007727, 4.366143 52.007816)))', 4326)))::geometry(MultiPolygon, 4326),
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
      'city', 'Delft',
      'gemeente', 'Delft',
      'regulation_id', 'gmb-2024-300398',
      'info_url', 'https://www.delft.nl/nul-emissiezone',
      'transition_period_end', '2030-01-01',
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2025-01-01',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'NDW DATEX II Open Data (emissiezones.xml) gmlMultiPolygon WGS84 lat/lon -> GeoJSON lon/lat + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://opendata.ndw.nu/emissiezones.xml.gz',
        'ndw_zone_id', 'NDW11_ee204cc2-24ec-4459-adaa-f31bb142516e',
        'ndw_file_publication', '2026-05-31T06:00:00Z',
        'polygon_parts', 1,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'batch', 'phase1_ndw_batch_2026-06-01'
      )
    )
  ),
  '2025-01-01',
  '2027-12-31',
  'delft_verkeersbesluit_gmb_2024_300398',
  'https://www.delft.nl/nul-emissiezone',
  'Batch seed via NDW DATEX II Open Data (harmonized national source, Bron NDW). Sanity 11/11 PASS. RDW Centraal Loket harmonized fees. Overgangsregeling until 2030.'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'delft_ze_zone_2025'
);

\echo ''
\echo '=== delft_ze_zone_2025: inserted zone check ==='
SELECT zone_id, city, zone_type, ST_GeometryType(polygon) AS gtype,
  ST_NumGeometries(polygon) AS part_count,
  ROUND((ABS(ST_Area(polygon::geography))/1e6)::numeric,4) AS area_km2,
  ST_NPoints(polygon) AS vertices, ST_IsValid(polygon) AS valid,
  effective_from, effective_to
FROM enterprise.nl_compliance_zones WHERE zone_id = 'delft_ze_zone_2025';

\echo ''
\echo '=== delft_ze_zone_2025: sanity (11 points) ==='
WITH points AS (
  SELECT 'interior_rep' AS loc, 4.359723 AS lon, 52.012602 AS lat, 'inside' AS expected UNION ALL
  SELECT 'interior_2', 4.362742, 52.010223, 'inside' UNION ALL
  SELECT 'interior_3', 4.363987, 52.010831, 'inside' UNION ALL
  SELECT 'interior_4', 4.364244, 52.011306, 'inside' UNION ALL
  SELECT 'interior_5', 4.364158, 52.012039, 'inside' UNION ALL
  SELECT 'exterior_NW', 4.338613, 52.031662, 'outside' UNION ALL
  SELECT 'exterior_NE', 4.381147, 52.031662, 'outside' UNION ALL
  SELECT 'exterior_SW', 4.338613, 51.993362, 'outside' UNION ALL
  SELECT 'exterior_SE', 4.381147, 51.993362, 'outside' UNION ALL
  SELECT 'exterior_N', 4.359880, 52.031662, 'outside' UNION ALL
  SELECT 'exterior_S', 4.359880, 51.993362, 'outside'
),
results AS (
  SELECT loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id='delft_ze_zone_2025'),
      ST_SetSRID(ST_MakePoint(lon,lat),4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected=actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results ORDER BY (expected='inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1780200000000_seed-nl-compliance-zones-delft', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pgmigrations WHERE name='1780200000000_seed-nl-compliance-zones-delft');

COMMIT;
\echo '=== delft_ze_zone_2025 COMMITTED ==='
