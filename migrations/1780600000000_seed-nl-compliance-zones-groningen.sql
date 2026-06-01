-- ============================================================================
-- Migration: 1780600000000_seed-nl-compliance-zones-groningen.sql
-- ============================================================================
-- Phase 1 Batch (NDW harmonized) - Groningen ZE-Zone seed
--
-- Source: NDW Open Data DATEX II (Bron NDW) https://opendata.ndw.nu/emissiezones.xml.gz
--         cz:urbanVehicleAccessRegulation name="ZE Groningen"  id=NDW11_a038bfee-dbae-4e60-9324-2f3bcc4aa7d6
--         gmlMultiPolygon posList WGS84 (lat lon) -> GeoJSON (lon lat) + ST_MakeValid + ST_Multi
--
-- Derivation verification (2026-06-01):
--   gtype ST_MultiPolygon | parts 1 | area_km2 1.0386 | perimeter_km 4.05
--   vertices 64 | is_valid true | rep_point (6.5653,53.2172)
--   bbox [6.55614,53.21193]-[6.57651,53.22211]
--   sanity 11/11 PASS (5 interior + 6 exterior geometric points; NDW pipeline
--          landmark-validated on Leiden 2.9.11)
--   wkt_bytes 1456
--
-- Regulation: RVV 1990 + verkeersbesluit gmb-2024-500585
-- Fees:       RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)
-- Effective:  2025-04-01 (overgangsregeling tot 2030)
-- Prereq:     1779350000000_alter-nl-compliance-zones-multipolygon applied
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

INSERT INTO enterprise.nl_compliance_zones (
  zone_id, city, zone_type, polygon, rules,
  effective_from, effective_to, source, source_url, notes
)
SELECT
  'groningen_ze_zone_2025',
  'Groningen',
  'ze_zone',
  ST_Multi(ST_MakeValid(ST_GeomFromText('MULTIPOLYGON (((6.557867130677604 53.21891069822816, 6.557955 53.218783, 6.557604 53.218632, 6.557111 53.218441, 6.556445 53.218237, 6.556647 53.217898, 6.557424 53.216742, 6.557722 53.216348, 6.557481 53.21611, 6.557009 53.215976, 6.556848 53.215558, 6.556381 53.214797, 6.55614 53.214206, 6.556236 53.213936, 6.557035 53.213467, 6.558071 53.213206, 6.558833 53.213216, 6.561021 53.212696, 6.56343 53.212108, 6.565404 53.211934, 6.568252 53.212098, 6.572421 53.213113, 6.574845 53.214459, 6.57624 53.215233, 6.576514 53.215841, 6.575441 53.21622, 6.574505 53.216551, 6.574124 53.216822, 6.573764 53.216775, 6.57307 53.217607, 6.572814 53.217912, 6.572422 53.218377, 6.572363 53.218532, 6.572238 53.218776, 6.571912 53.219347, 6.571668 53.219743, 6.571507 53.219894, 6.571218 53.220192, 6.570692 53.220692, 6.570272 53.22112, 6.570052 53.221306, 6.569859 53.221367, 6.569256 53.221553, 6.568431 53.22182, 6.567983 53.221927, 6.567035 53.222108, 6.566638 53.222052, 6.565928 53.221935, 6.565377 53.22181, 6.564551 53.221572, 6.563836 53.221363, 6.562867 53.221083, 6.562279 53.22091, 6.561602 53.220709, 6.560866 53.220496, 6.5607677972813745 53.22063184171256, 6.55963333064373 53.22023149264695, 6.558943421577346 53.219974513143754, 6.558044652945918 53.21963504697328, 6.557418066182974 53.21937683397442, 6.557370743879591 53.219267213455, 6.55760549179481 53.219012306062005, 6.557750584743909 53.21886570189342, 6.557867130677604 53.21891069822816)))', 4326)))::geometry(MultiPolygon, 4326),
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
      'city', 'Groningen',
      'gemeente', 'Groningen',
      'regulation_id', 'gmb-2024-500585',
      'info_url', 'https://groningendoethetzero.nl/',
      'transition_period_end', '2030-01-01',
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2025-04-01',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'NDW DATEX II Open Data (emissiezones.xml) gmlMultiPolygon WGS84 lat/lon -> GeoJSON lon/lat + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://opendata.ndw.nu/emissiezones.xml.gz',
        'ndw_zone_id', 'NDW11_a038bfee-dbae-4e60-9324-2f3bcc4aa7d6',
        'ndw_file_publication', '2026-05-31T06:00:00Z',
        'polygon_parts', 1,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'batch', 'phase1_ndw_batch_2026-06-01'
      )
    )
  ),
  '2025-04-01',
  '2027-12-31',
  'groningen_verkeersbesluit_gmb_2024_500585',
  'https://groningendoethetzero.nl/',
  'Batch seed via NDW DATEX II Open Data (harmonized national source, Bron NDW). Sanity 11/11 PASS. RDW Centraal Loket harmonized fees. Overgangsregeling until 2030.'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'groningen_ze_zone_2025'
);

\echo ''
\echo '=== groningen_ze_zone_2025: inserted zone check ==='
SELECT zone_id, city, zone_type, ST_GeometryType(polygon) AS gtype,
  ST_NumGeometries(polygon) AS part_count,
  ROUND((ABS(ST_Area(polygon::geography))/1e6)::numeric,4) AS area_km2,
  ST_NPoints(polygon) AS vertices, ST_IsValid(polygon) AS valid,
  effective_from, effective_to
FROM enterprise.nl_compliance_zones WHERE zone_id = 'groningen_ze_zone_2025';

\echo ''
\echo '=== groningen_ze_zone_2025: sanity (11 points) ==='
WITH points AS (
  SELECT 'interior_rep' AS loc, 6.565252 AS lon, 53.217214 AS lat, 'inside' AS expected UNION ALL
  SELECT 'interior_2', 6.561730, 53.217770, 'inside' UNION ALL
  SELECT 'interior_3', 6.561774, 53.217707, 'inside' UNION ALL
  SELECT 'interior_4', 6.561598, 53.217631, 'inside' UNION ALL
  SELECT 'interior_5', 6.561352, 53.217536, 'inside' UNION ALL
  SELECT 'exterior_NW', 6.544140, 53.234108, 'outside' UNION ALL
  SELECT 'exterior_NE', 6.588514, 53.234108, 'outside' UNION ALL
  SELECT 'exterior_SW', 6.544140, 53.199934, 'outside' UNION ALL
  SELECT 'exterior_SE', 6.588514, 53.199934, 'outside' UNION ALL
  SELECT 'exterior_N', 6.566327, 53.234108, 'outside' UNION ALL
  SELECT 'exterior_S', 6.566327, 53.199934, 'outside'
),
results AS (
  SELECT loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id='groningen_ze_zone_2025'),
      ST_SetSRID(ST_MakePoint(lon,lat),4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected=actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results ORDER BY (expected='inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1780600000000_seed-nl-compliance-zones-groningen', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pgmigrations WHERE name='1780600000000_seed-nl-compliance-zones-groningen');

COMMIT;
\echo '=== groningen_ze_zone_2025 COMMITTED ==='
