-- ============================================================================
-- Migration: 1780400000000_seed-nl-compliance-zones-enschede.sql
-- ============================================================================
-- Phase 1 Batch (NDW harmonized) - Enschede ZE-Zone seed
--
-- Source: NDW Open Data DATEX II (Bron NDW) https://opendata.ndw.nu/emissiezones.xml.gz
--         cz:urbanVehicleAccessRegulation name="ZE Enschede"  id=NDW11_537506e7-dc32-453f-af55-6a721bfc7418
--         gmlMultiPolygon posList WGS84 (lat lon) -> GeoJSON (lon lat) + ST_MakeValid + ST_Multi
--
-- Derivation verification (2026-06-01):
--   gtype ST_MultiPolygon | parts 1 | area_km2 0.2890 | perimeter_km 2.48
--   vertices 52 | is_valid true | rep_point (6.8961,52.2194)
--   bbox [6.89134,52.21629]-[6.90016,52.22271]
--   sanity 11/11 PASS (5 interior + 6 exterior geometric points; NDW pipeline
--          landmark-validated on Leiden 2.9.11)
--   wkt_bytes 1504
--
-- Regulation: RVV 1990 + verkeersbesluit gmb-2025-154132
-- Fees:       RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)
-- Effective:  2025-07-01 (overgangsregeling tot 2030)
-- Prereq:     1779350000000_alter-nl-compliance-zones-multipolygon applied
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

INSERT INTO enterprise.nl_compliance_zones (
  zone_id, city, zone_type, polygon, rules,
  effective_from, effective_to, source, source_url, notes
)
SELECT
  'enschede_ze_zone_2025',
  'Enschede',
  'ze_zone',
  ST_Multi(ST_MakeValid(ST_GeomFromText('MULTIPOLYGON (((6.899886 52.216291, 6.900015 52.216373, 6.900111 52.216853, 6.900101 52.216978, 6.90016 52.217556, 6.900047 52.218401, 6.899467445754308 52.218582027730946, 6.899203720057153 52.219279034065124, 6.899755884775934 52.21934074548889, 6.899908 52.219525, 6.899854 52.219834, 6.899961 52.220445, 6.899768 52.220669, 6.899745346391257 52.22082983336023, 6.899383686485802 52.22082960711371, 6.899428319716196 52.22120213428764, 6.899704722561305 52.22121439855762, 6.899822 52.221286, 6.899725 52.221654, 6.899414 52.222187, 6.8981 52.222376, 6.897794 52.222456, 6.896769 52.222507, 6.895404 52.222327, 6.895058 52.222668, 6.893946641314073 52.222709920321726, 6.892908909948304 52.222582894323764, 6.8929702981441405 52.22231990087441, 6.892784954974848 52.22230341258399, 6.8926126863412565 52.22228291966337, 6.8926348804371145 52.22168270968009, 6.892467493763415 52.22167520605386, 6.892237856786018 52.22137486046933, 6.891988608003065 52.22104648017677, 6.8920457782275255 52.2208863179764, 6.8913385801715155 52.22077708612629, 6.891360588322602 52.22047280427262, 6.891566375727236 52.21998127808463, 6.891781774406763 52.219814080646394, 6.892012095976706 52.21974764357252, 6.892092 52.219627, 6.892334532927871 52.21956305518954, 6.89239718496004 52.21908797214579, 6.892710225708992 52.21916337290191, 6.892783724135539 52.21900080065969, 6.892961 52.218923, 6.893411 52.218194, 6.893996 52.218309, 6.894296 52.218053, 6.896667 52.217727, 6.896351 52.216896, 6.899886 52.216291)))', 4326)))::geometry(MultiPolygon, 4326),
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
      'city', 'Enschede',
      'gemeente', 'Enschede',
      'regulation_id', 'gmb-2025-154132',
      'info_url', 'https://www.enschede.nl/zero-emissiezone',
      'transition_period_end', '2030-01-01',
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2025-07-01',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'NDW DATEX II Open Data (emissiezones.xml) gmlMultiPolygon WGS84 lat/lon -> GeoJSON lon/lat + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://opendata.ndw.nu/emissiezones.xml.gz',
        'ndw_zone_id', 'NDW11_537506e7-dc32-453f-af55-6a721bfc7418',
        'ndw_file_publication', '2026-05-31T06:00:00Z',
        'polygon_parts', 1,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'batch', 'phase1_ndw_batch_2026-06-01'
      )
    )
  ),
  '2025-07-01',
  '2027-12-31',
  'enschede_verkeersbesluit_gmb_2025_154132',
  'https://www.enschede.nl/zero-emissiezone',
  'Batch seed via NDW DATEX II Open Data (harmonized national source, Bron NDW). Sanity 11/11 PASS. RDW Centraal Loket harmonized fees. Overgangsregeling until 2030.'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'enschede_ze_zone_2025'
);

\echo ''
\echo '=== enschede_ze_zone_2025: inserted zone check ==='
SELECT zone_id, city, zone_type, ST_GeometryType(polygon) AS gtype,
  ST_NumGeometries(polygon) AS part_count,
  ROUND((ABS(ST_Area(polygon::geography))/1e6)::numeric,4) AS area_km2,
  ST_NPoints(polygon) AS vertices, ST_IsValid(polygon) AS valid,
  effective_from, effective_to
FROM enterprise.nl_compliance_zones WHERE zone_id = 'enschede_ze_zone_2025';

\echo ''
\echo '=== enschede_ze_zone_2025: sanity (11 points) ==='
WITH points AS (
  SELECT 'interior_rep' AS loc, 6.896092 AS lon, 52.219433 AS lat, 'inside' AS expected UNION ALL
  SELECT 'interior_2', 6.898093, 52.218077, 'inside' UNION ALL
  SELECT 'interior_3', 6.898157, 52.218118, 'inside' UNION ALL
  SELECT 'interior_4', 6.898205, 52.218358, 'inside' UNION ALL
  SELECT 'interior_5', 6.898200, 52.218420, 'inside' UNION ALL
  SELECT 'exterior_NW', 6.879339, 52.234710, 'outside' UNION ALL
  SELECT 'exterior_NE', 6.912160, 52.234710, 'outside' UNION ALL
  SELECT 'exterior_SW', 6.879339, 52.204291, 'outside' UNION ALL
  SELECT 'exterior_SE', 6.912160, 52.204291, 'outside' UNION ALL
  SELECT 'exterior_N', 6.895749, 52.234710, 'outside' UNION ALL
  SELECT 'exterior_S', 6.895749, 52.204291, 'outside'
),
results AS (
  SELECT loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id='enschede_ze_zone_2025'),
      ST_SetSRID(ST_MakePoint(lon,lat),4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected=actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results ORDER BY (expected='inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1780400000000_seed-nl-compliance-zones-enschede', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pgmigrations WHERE name='1780400000000_seed-nl-compliance-zones-enschede');

COMMIT;
\echo '=== enschede_ze_zone_2025 COMMITTED ==='
