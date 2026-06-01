-- ============================================================================
-- Migration: 1781000000000_seed-nl-compliance-zones-shertogenbosch.sql
-- ============================================================================
-- Phase 1 Batch (NDW harmonized) - 's-Hertogenbosch ZE-Zone seed
--
-- Source: NDW Open Data DATEX II (Bron NDW) https://opendata.ndw.nu/emissiezones.xml.gz
--         cz:urbanVehicleAccessRegulation name="ZE 's-Hertogenbosch"  id=NDW11_de06481f-e23e-4c9a-987b-978a4b67e0c0
--         gmlMultiPolygon posList WGS84 (lat lon) -> GeoJSON (lon lat) + ST_MakeValid + ST_Multi
--
-- Derivation verification (2026-06-01):
--   gtype ST_MultiPolygon | parts 1 | area_km2 1.7657 | perimeter_km 7.46
--   vertices 132 | is_valid true | rep_point (5.3057,51.6905)
--   bbox [5.29086,51.68239]-[5.31749,51.69830]
--   sanity 11/11 PASS (5 interior + 6 exterior geometric points; NDW pipeline
--          landmark-validated on Leiden 2.9.11)
--   wkt_bytes 3687
--
-- Regulation: RVV 1990 + verkeersbesluit gmb-2024-403036
-- Fees:       RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)
-- Effective:  2025-03-01 (overgangsregeling tot 2030)
-- Prereq:     1779350000000_alter-nl-compliance-zones-multipolygon applied
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

INSERT INTO enterprise.nl_compliance_zones (
  zone_id, city, zone_type, polygon, rules,
  effective_from, effective_to, source, source_url, notes
)
SELECT
  'shertogenbosch_ze_zone_2025',
  '''s-Hertogenbosch',
  'ze_zone',
  ST_Multi(ST_MakeValid(ST_GeomFromText('MULTIPOLYGON (((5.294504572 51.691127953, 5.2935798162 51.6886171294, 5.2928948555 51.6874442351, 5.2923222568 51.6867373725, 5.2920239752 51.6862067599, 5.2916141191 51.6853480644, 5.2912230751 51.6844498378, 5.2908994003 51.6835539914, 5.2908633946 51.6828863462, 5.2917016657 51.6828684221, 5.2920720422 51.6829129214, 5.2924272273 51.6830644108, 5.2925990112 51.6832343612, 5.2926883238 51.6834740298, 5.2927920889 51.6839626124, 5.2927948063 51.6841390984, 5.2927954421 51.6841393075, 5.2927688728 51.6843605479, 5.293068968 51.6844053047, 5.2932072507 51.6844243194, 5.2935381882 51.6842605485, 5.2935381002 51.6842604441, 5.2938676964 51.6840966479, 5.2940493411 51.6839114242, 5.2940378994 51.6837878367, 5.2939683233 51.6835006428, 5.2939979537 51.6833080293, 5.2942029671 51.6831300929, 5.2943840102 51.6829635553, 5.2943839687 51.6829633621, 5.2944043611 51.6829259725, 5.2944295136 51.6828701469, 5.2944250013 51.6827346659, 5.2943703312 51.6825321512, 5.2947511775 51.6825071431, 5.2953525091 51.6824063807, 5.2954650319 51.6824258219, 5.2954938454 51.6823886258, 5.2963097044 51.6827942037, 5.2961483082 51.6832600596, 5.2960433584 51.6834863984, 5.2965911128 51.683667756, 5.2981669285 51.6842694487, 5.3004195148 51.6850409904, 5.3017746378 51.6845030876, 5.3018802618 51.6843881017, 5.3017260999 51.6842298512, 5.302183523 51.6835141541, 5.3033172281 51.6838602636, 5.3053165108 51.6841124679, 5.3067598902 51.684611416, 5.3074205105 51.6846809249, 5.308549167 51.6846053593, 5.3092917088 51.6846422016, 5.3098411113 51.6847843174, 5.3106129603 51.6847811888, 5.3120513651 51.6848002919, 5.3137587655 51.684808643, 5.3137173599 51.6852387941, 5.3139850432 51.6852606669, 5.315016329 51.6857745411, 5.316055325 51.6866528081, 5.3169026697 51.6877805925, 5.3169033505 51.6877808041, 5.3169296262 51.6878269713, 5.3164959436 51.6879177013, 5.3166885553 51.6883058093, 5.3167595823 51.6884489255, 5.3165721386 51.6888292392, 5.3165385353 51.6891987478, 5.3169834425 51.6898456914, 5.3174864352 51.6903181678, 5.3167095239 51.6907590863, 5.3166367075 51.6908004103, 5.3166257214 51.6908007722, 5.3166149953 51.6908022956, 5.3166048459 51.6908049357, 5.3165955728 51.6908086154, 5.3165874479 51.6908132261, 5.3165807117 51.6908186323, 5.316575561 51.6908246748, 5.3165721479 51.6908311759, 5.3165705726 51.6908379433, 5.3164806406 51.6908889816, 5.3168191833 51.6911194084, 5.3159399313 51.6917902241, 5.3155495496 51.6920880539, 5.313114649 51.6909386608, 5.3119585052 51.6914443974, 5.3103841345 51.6921630405, 5.3093306337 51.6926384874, 5.3074298297 51.6934960432, 5.3053680285 51.6944161638, 5.3047815476 51.6946774343, 5.3051160689 51.6950421954, 5.3037843353 51.6961857704, 5.302554195 51.6959590658, 5.3019843889 51.695932991, 5.3017977078 51.6959244483, 5.3016897672 51.6959671648, 5.3018195128 51.696055733, 5.3020756432 51.696164599, 5.3025755142 51.6966056323, 5.3028886404 51.6969869797, 5.3030631579 51.6971865983, 5.3034912379 51.6975948239, 5.3031556593 51.6976898646, 5.3027708783 51.6971878777, 5.3023395579 51.696673111, 5.3021360205 51.6964681105, 5.3018221393 51.696238257, 5.3015189555 51.6960293717, 5.3015181235 51.6960264768, 5.3007296053 51.6956446611, 5.3000914621 51.6968040997, 5.299024658 51.697526964, 5.2977027138 51.6980334861, 5.2975251842 51.6978848023, 5.2965103994 51.6983035588, 5.2964057262 51.6981551013, 5.2964201841 51.6981490443, 5.2973929934 51.6977740888, 5.2973476557 51.6977361181, 5.2959397771 51.6955332527, 5.2952984146 51.6941418842, 5.2950853084 51.693346203, 5.2945485609 51.691342002, 5.2945460003 51.6913423937, 5.2945401269 51.691303476, 5.2933786212 51.6914938034, 5.2933039077 51.691319027, 5.294504572 51.691127953)))', 4326)))::geometry(MultiPolygon, 4326),
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
      'city', '''s-Hertogenbosch',
      'gemeente', '''s-Hertogenbosch',
      'regulation_id', 'gmb-2024-403036',
      'info_url', 'https://www.s-hertogenbosch.nl/ondernemer/milieu-en-afval/milieuzone-zero-emissie-zone/',
      'transition_period_end', '2030-01-01',
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2025-03-01',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'NDW DATEX II Open Data (emissiezones.xml) gmlMultiPolygon WGS84 lat/lon -> GeoJSON lon/lat + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://opendata.ndw.nu/emissiezones.xml.gz',
        'ndw_zone_id', 'NDW11_de06481f-e23e-4c9a-987b-978a4b67e0c0',
        'ndw_file_publication', '2026-05-31T06:00:00Z',
        'polygon_parts', 1,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'batch', 'phase1_ndw_batch_2026-06-01'
      )
    )
  ),
  '2025-03-01',
  '2027-12-31',
  's-hertogenbosch_verkeersbesluit_gmb_2024_403036',
  'https://www.s-hertogenbosch.nl/ondernemer/milieu-en-afval/milieuzone-zero-emissie-zone/',
  'Batch seed via NDW DATEX II Open Data (harmonized national source, Bron NDW). Sanity 11/11 PASS. RDW Centraal Loket harmonized fees. Overgangsregeling until 2030.'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'shertogenbosch_ze_zone_2025'
);

\echo ''
\echo '=== shertogenbosch_ze_zone_2025: inserted zone check ==='
SELECT zone_id, city, zone_type, ST_GeometryType(polygon) AS gtype,
  ST_NumGeometries(polygon) AS part_count,
  ROUND((ABS(ST_Area(polygon::geography))/1e6)::numeric,4) AS area_km2,
  ST_NPoints(polygon) AS vertices, ST_IsValid(polygon) AS valid,
  effective_from, effective_to
FROM enterprise.nl_compliance_zones WHERE zone_id = 'shertogenbosch_ze_zone_2025';

\echo ''
\echo '=== shertogenbosch_ze_zone_2025: sanity (11 points) ==='
WITH points AS (
  SELECT 'interior_rep' AS loc, 5.305693 AS lon, 51.690539 AS lat, 'inside' AS expected UNION ALL
  SELECT 'interior_2', 5.298888, 51.690235, 'inside' UNION ALL
  SELECT 'interior_3', 5.298425, 51.688980, 'inside' UNION ALL
  SELECT 'interior_4', 5.298083, 51.688394, 'inside' UNION ALL
  SELECT 'interior_5', 5.297797, 51.688040, 'inside' UNION ALL
  SELECT 'exterior_NW', 5.278863, 51.710304, 'outside' UNION ALL
  SELECT 'exterior_NE', 5.329486, 51.710304, 'outside' UNION ALL
  SELECT 'exterior_SW', 5.278863, 51.670389, 'outside' UNION ALL
  SELECT 'exterior_SE', 5.329486, 51.670389, 'outside' UNION ALL
  SELECT 'exterior_N', 5.304175, 51.710304, 'outside' UNION ALL
  SELECT 'exterior_S', 5.304175, 51.670389, 'outside'
),
results AS (
  SELECT loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id='shertogenbosch_ze_zone_2025'),
      ST_SetSRID(ST_MakePoint(lon,lat),4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected=actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results ORDER BY (expected='inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1781000000000_seed-nl-compliance-zones-shertogenbosch', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pgmigrations WHERE name='1781000000000_seed-nl-compliance-zones-shertogenbosch');

COMMIT;
\echo '=== shertogenbosch_ze_zone_2025 COMMITTED ==='
