-- ============================================================================
-- Migration: 1780300000000_seed-nl-compliance-zones-dordrecht.sql
-- ============================================================================
-- Phase 1 Batch (NDW harmonized) - Dordrecht ZE-Zone seed
--
-- Source: NDW Open Data DATEX II (Bron NDW) https://opendata.ndw.nu/emissiezones.xml.gz
--         cz:urbanVehicleAccessRegulation name="ZE Dordrecht"  id=NDW11_cdfc54b4-103d-4f74-8278-3f21b43084ef
--         gmlMultiPolygon posList WGS84 (lat lon) -> GeoJSON (lon lat) + ST_MakeValid + ST_Multi
--
-- Derivation verification (2026-06-01):
--   gtype ST_MultiPolygon | parts 1 | area_km2 0.8885 | perimeter_km 4.15
--   vertices 27 | is_valid true | rep_point (4.6665,51.8157)
--   bbox [4.65331,51.81141]-[4.67616,51.82022]
--   sanity 11/11 PASS (5 interior + 6 exterior geometric points; NDW pipeline
--          landmark-validated on Leiden 2.9.11)
--   wkt_bytes 552
--
-- Regulation: RVV 1990 + verkeersbesluit onbekend
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
  'dordrecht_ze_zone_2026',
  'Dordrecht',
  'ze_zone',
  ST_Multi(ST_MakeValid(ST_GeomFromText('MULTIPOLYGON (((4.653311 51.811666, 4.654824 51.811746, 4.656197 51.812363, 4.659137 51.812382, 4.660456 51.812422, 4.664093 51.812031, 4.666893 51.811567, 4.668578 51.811414, 4.669447 51.811407, 4.67067 51.81219, 4.671024 51.812309, 4.673245 51.814293, 4.673824 51.815135, 4.674114 51.815268, 4.674779 51.816163, 4.67465 51.816382, 4.674854 51.816879, 4.67508 51.817775, 4.676163 51.818856, 4.676131 51.819393, 4.672751 51.820222, 4.668771 51.82001, 4.663879 51.818677, 4.659694 51.816428, 4.657055 51.814638, 4.653547 51.812051, 4.653311 51.811666)))', 4326)))::geometry(MultiPolygon, 4326),
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
      'city', 'Dordrecht',
      'gemeente', 'Dordrecht',
      'regulation_id', 'onbekend',
      'info_url', 'https://cms.dordrecht.nl/Inwoners/Overzicht_Inwoners/Parkeren_verkeer_en_vervoer/Overige_informatie/Zero_emissiezone_vanaf_2026',
      'transition_period_end', '2030-01-01',
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2026-01-01',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'NDW DATEX II Open Data (emissiezones.xml) gmlMultiPolygon WGS84 lat/lon -> GeoJSON lon/lat + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://opendata.ndw.nu/emissiezones.xml.gz',
        'ndw_zone_id', 'NDW11_cdfc54b4-103d-4f74-8278-3f21b43084ef',
        'ndw_file_publication', '2026-05-31T06:00:00Z',
        'polygon_parts', 1,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'batch', 'phase1_ndw_batch_2026-06-01'
      )
    )
  ),
  '2026-01-01',
  '2027-12-31',
  'dordrecht_verkeersbesluit_onbekend',
  'https://cms.dordrecht.nl/Inwoners/Overzicht_Inwoners/Parkeren_verkeer_en_vervoer/Overige_informatie/Zero_emissiezone_vanaf_2026',
  'Batch seed via NDW DATEX II Open Data (harmonized national source, Bron NDW). Sanity 11/11 PASS. RDW Centraal Loket harmonized fees. Overgangsregeling until 2030.'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'dordrecht_ze_zone_2026'
);

\echo ''
\echo '=== dordrecht_ze_zone_2026: inserted zone check ==='
SELECT zone_id, city, zone_type, ST_GeometryType(polygon) AS gtype,
  ST_NumGeometries(polygon) AS part_count,
  ROUND((ABS(ST_Area(polygon::geography))/1e6)::numeric,4) AS area_km2,
  ST_NPoints(polygon) AS vertices, ST_IsValid(polygon) AS valid,
  effective_from, effective_to
FROM enterprise.nl_compliance_zones WHERE zone_id = 'dordrecht_ze_zone_2026';

\echo ''
\echo '=== dordrecht_ze_zone_2026: sanity (11 points) ==='
WITH points AS (
  SELECT 'interior_rep' AS loc, 4.666545 AS lon, 51.815716 AS lat, 'inside' AS expected UNION ALL
  SELECT 'interior_2', 4.659900, 51.813630, 'inside' UNION ALL
  SELECT 'interior_3', 4.660656, 51.813670, 'inside' UNION ALL
  SELECT 'interior_4', 4.661343, 51.813979, 'inside' UNION ALL
  SELECT 'interior_5', 4.662813, 51.813988, 'inside' UNION ALL
  SELECT 'exterior_NW', 4.641311, 51.832222, 'outside' UNION ALL
  SELECT 'exterior_NE', 4.688163, 51.832222, 'outside' UNION ALL
  SELECT 'exterior_SW', 4.641311, 51.799407, 'outside' UNION ALL
  SELECT 'exterior_SE', 4.688163, 51.799407, 'outside' UNION ALL
  SELECT 'exterior_N', 4.664737, 51.832222, 'outside' UNION ALL
  SELECT 'exterior_S', 4.664737, 51.799407, 'outside'
),
results AS (
  SELECT loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id='dordrecht_ze_zone_2026'),
      ST_SetSRID(ST_MakePoint(lon,lat),4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected=actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results ORDER BY (expected='inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1780300000000_seed-nl-compliance-zones-dordrecht', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pgmigrations WHERE name='1780300000000_seed-nl-compliance-zones-dordrecht');

COMMIT;
\echo '=== dordrecht_ze_zone_2026 COMMITTED ==='
