-- ============================================================================
-- Migration: 1780700000000_seed-nl-compliance-zones-haarlem.sql
-- ============================================================================
-- Phase 1 Batch (NDW harmonized) - Haarlem ZE-Zone seed
--
-- Source: NDW Open Data DATEX II (Bron NDW) https://opendata.ndw.nu/emissiezones.xml.gz
--         cz:urbanVehicleAccessRegulation name="ZE Haarlem"  id=NDW11_24e47dbf-8f58-49ba-8765-fce49fb94ac5
--         gmlMultiPolygon posList WGS84 (lat lon) -> GeoJSON (lon lat) + ST_MakeValid + ST_Multi
--
-- Derivation verification (2026-06-01):
--   gtype ST_MultiPolygon | parts 1 | area_km2 7.0142 | perimeter_km 15.46
--   vertices 263 | is_valid true | rep_point (4.6313,52.3831)
--   bbox [4.61043,52.36797]-[4.66077,52.39800]
--   sanity 11/11 PASS (5 interior + 6 exterior geometric points; NDW pipeline
--          landmark-validated on Leiden 2.9.11)
--   wkt_bytes 5226
--
-- Regulation: RVV 1990 + verkeersbesluit gmb-2024-473349
-- Fees:       RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)
-- Effective:  2025-06-01 (overgangsregeling tot 2030)
-- Prereq:     1779350000000_alter-nl-compliance-zones-multipolygon applied
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

INSERT INTO enterprise.nl_compliance_zones (
  zone_id, city, zone_type, polygon, rules,
  effective_from, effective_to, source, source_url, notes
)
SELECT
  'haarlem_ze_zone_2025',
  'Haarlem',
  'ze_zone',
  ST_Multi(ST_MakeValid(ST_GeomFromText('MULTIPOLYGON (((4.650521 52.387318, 4.64918 52.387734, 4.649475 52.388363, 4.64976 52.390537, 4.650307 52.393002, 4.650706 52.395241, 4.650245 52.395296, 4.650224 52.395226, 4.650135 52.395198, 4.650083 52.395201, 4.650051 52.395128, 4.649511 52.395213, 4.649565 52.395388, 4.649529 52.395392, 4.649473 52.395224, 4.649308 52.395255, 4.649344 52.395409, 4.648727 52.395506, 4.648669 52.395395, 4.648621 52.395256, 4.648365 52.395301, 4.648178 52.395327, 4.648099 52.395159, 4.647435 52.39526, 4.647504 52.395412, 4.647148 52.395466, 4.647068 52.395301, 4.646477 52.395391, 4.64632 52.395557, 4.64636 52.395583, 4.645876 52.395652, 4.645764 52.39558, 4.645644 52.395612, 4.645538 52.395669, 4.645582 52.395696, 4.645397 52.395716, 4.6453 52.395643, 4.644968 52.395644, 4.644875 52.395625, 4.644709 52.395726, 4.644826 52.3958, 4.644645 52.395824, 4.644476 52.395704, 4.644217 52.395735, 4.644138 52.395715, 4.643852 52.395796, 4.64342 52.395941, 4.643255 52.395981, 4.643281 52.396048, 4.642367 52.396158, 4.642296 52.396008, 4.64222 52.396022, 4.642208 52.395993, 4.641985 52.396037, 4.642058 52.396205, 4.641421 52.396297, 4.641591 52.396699, 4.641883 52.396957, 4.642764 52.397761, 4.639916 52.398, 4.639626 52.397666, 4.63939 52.396907, 4.638215 52.396999, 4.637636 52.397035, 4.637314 52.395208, 4.63703 52.395247, 4.637191 52.396007, 4.635581 52.396233, 4.635597 52.396318, 4.633564 52.396645, 4.63321 52.396046, 4.631413 52.396419, 4.631553 52.396733, 4.631333 52.396773, 4.631199 52.396495, 4.629493 52.396891, 4.629815 52.397526, 4.629284 52.397647, 4.628769 52.396842, 4.627739 52.397097, 4.627449 52.397437, 4.626939 52.397647, 4.62629 52.397035, 4.625421 52.396406, 4.623399 52.395565, 4.623013 52.393791, 4.623227 52.392678, 4.623742 52.391833, 4.622787 52.389967, 4.621875 52.388533, 4.621328 52.387433, 4.620835 52.38649, 4.620899 52.386464, 4.620899 52.386199, 4.620738 52.386182, 4.620733 52.385708, 4.620982 52.385729, 4.620974 52.385758, 4.621191 52.385765, 4.621199 52.38568, 4.622296 52.385699, 4.621296 52.384989, 4.620636 52.385233, 4.619705 52.3854, 4.619856 52.38574, 4.619405 52.385788, 4.61948 52.385971, 4.619319 52.385966, 4.61926 52.385789, 4.619188 52.385672, 4.618737 52.385691, 4.618714 52.385636, 4.617631 52.385827, 4.617574 52.385758, 4.616931 52.385901, 4.615985 52.384349, 4.614969 52.384517, 4.615044 52.383452, 4.615041 52.382374, 4.61495 52.381464, 4.615009 52.380868, 4.615266 52.38075, 4.614027 52.379404, 4.612568 52.377705, 4.61156 52.376526, 4.611168 52.375642, 4.610884 52.374263, 4.610433 52.372508, 4.610503 52.372383, 4.610755 52.372331, 4.610513 52.371931, 4.611495 52.371761, 4.61164 52.372006, 4.612289 52.371892, 4.612235 52.371744, 4.614102 52.371407, 4.614311 52.371774, 4.614682 52.371912, 4.614971 52.371862, 4.615079 52.371695, 4.614923 52.371351, 4.616935 52.371152, 4.616972 52.371209, 4.617149 52.371201, 4.617165 52.371317, 4.617369 52.371314, 4.617342 52.371216, 4.617617 52.371157, 4.617826 52.371094, 4.617861 52.371142, 4.617898 52.371161, 4.617969 52.371151, 4.618071 52.371279, 4.619074 52.371134, 4.619573 52.371073, 4.61948 52.370707, 4.621583 52.370472, 4.622173 52.370164, 4.622503 52.370226, 4.622589 52.370123, 4.622881 52.370036, 4.62275 52.369894, 4.623176 52.369765, 4.623074 52.369635, 4.623737 52.369306, 4.623911 52.369234, 4.623887 52.3692, 4.623745 52.369095, 4.624252 52.368874, 4.624775 52.369131, 4.625974 52.369268, 4.626848 52.369203, 4.627299 52.369044, 4.627808 52.368646, 4.627307 52.368395, 4.627468 52.368106, 4.62772 52.368014, 4.628291 52.367973, 4.62842 52.368363, 4.628554 52.369319, 4.627961 52.369473, 4.627945 52.369679, 4.628436 52.370814, 4.628801 52.370765, 4.628838 52.370903, 4.628398 52.370962, 4.628592 52.37141, 4.628999 52.371355, 4.629219 52.371777, 4.630083 52.371463, 4.630823 52.371381, 4.631392 52.371391, 4.631488 52.371391, 4.631483 52.371689, 4.632078 52.371708, 4.632679 52.371705, 4.632964 52.371646, 4.632867 52.371401, 4.633146 52.37142, 4.636252 52.370837, 4.636373 52.371016, 4.636764 52.371299, 4.636896 52.371261, 4.637089 52.371417, 4.637392 52.371561, 4.637588 52.371743, 4.638207 52.371944, 4.638344 52.371967, 4.638545 52.371967, 4.639422 52.37193, 4.640093 52.371722, 4.641104 52.371078, 4.642137 52.370608, 4.643143 52.370407, 4.644449 52.370341, 4.648343 52.370325, 4.651787 52.370331, 4.654121 52.370402, 4.654276 52.370855, 4.654928 52.3716, 4.656111 52.373015, 4.6572 52.374329, 4.657643 52.374767, 4.658455 52.375435, 4.658868 52.375999, 4.659206 52.376745, 4.658756 52.376837, 4.659418 52.378271, 4.65989 52.378188, 4.660204 52.378876, 4.660327 52.379237, 4.66011 52.379293, 4.660333 52.380295, 4.660435 52.380739, 4.660681 52.380719, 4.660773 52.381569, 4.660665 52.381621, 4.65901 52.381513, 4.656535 52.381418, 4.654233 52.381294, 4.651267 52.381091, 4.647308 52.380812, 4.647045 52.380793, 4.646836 52.380832, 4.646804 52.380999, 4.646916 52.38171, 4.647093 52.382289, 4.647319 52.382748, 4.647775 52.383497, 4.648064 52.383822, 4.649094 52.38466, 4.649569 52.385009, 4.650658 52.384565, 4.651436 52.384341, 4.652039 52.3842, 4.652136 52.384018, 4.652297 52.384003, 4.652251 52.384116, 4.652683 52.384233, 4.651862 52.385565, 4.651197 52.38666, 4.650865 52.387124, 4.650521 52.387318)))', 4326)))::geometry(MultiPolygon, 4326),
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
      'city', 'Haarlem',
      'gemeente', 'Haarlem',
      'regulation_id', 'gmb-2024-473349',
      'info_url', 'https://haarlem.nl/nul-emissiezone-voor-vracht-en-bestelwagens',
      'transition_period_end', '2030-01-01',
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2025-06-01',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'NDW DATEX II Open Data (emissiezones.xml) gmlMultiPolygon WGS84 lat/lon -> GeoJSON lon/lat + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://opendata.ndw.nu/emissiezones.xml.gz',
        'ndw_zone_id', 'NDW11_24e47dbf-8f58-49ba-8765-fce49fb94ac5',
        'ndw_file_publication', '2026-05-31T06:00:00Z',
        'polygon_parts', 1,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'batch', 'phase1_ndw_batch_2026-06-01'
      )
    )
  ),
  '2025-06-01',
  '2027-12-31',
  'haarlem_verkeersbesluit_gmb_2024_473349',
  'https://haarlem.nl/nul-emissiezone-voor-vracht-en-bestelwagens',
  'Batch seed via NDW DATEX II Open Data (harmonized national source, Bron NDW). Sanity 11/11 PASS. RDW Centraal Loket harmonized fees. Overgangsregeling until 2030.'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'haarlem_ze_zone_2025'
);

\echo ''
\echo '=== haarlem_ze_zone_2025: inserted zone check ==='
SELECT zone_id, city, zone_type, ST_GeometryType(polygon) AS gtype,
  ST_NumGeometries(polygon) AS part_count,
  ROUND((ABS(ST_Area(polygon::geography))/1e6)::numeric,4) AS area_km2,
  ST_NPoints(polygon) AS vertices, ST_IsValid(polygon) AS valid,
  effective_from, effective_to
FROM enterprise.nl_compliance_zones WHERE zone_id = 'haarlem_ze_zone_2025';

\echo ''
\echo '=== haarlem_ze_zone_2025: sanity (11 points) ==='
WITH points AS (
  SELECT 'interior_rep' AS loc, 4.631288 AS lon, 52.383100 AS lat, 'inside' AS expected UNION ALL
  SELECT 'interior_2', 4.642808, 52.384649, 'inside' UNION ALL
  SELECT 'interior_3', 4.642137, 52.384857, 'inside' UNION ALL
  SELECT 'interior_4', 4.642285, 52.385171, 'inside' UNION ALL
  SELECT 'interior_5', 4.642427, 52.386258, 'inside' UNION ALL
  SELECT 'exterior_NW', 4.598433, 52.410000, 'outside' UNION ALL
  SELECT 'exterior_NE', 4.672773, 52.410000, 'outside' UNION ALL
  SELECT 'exterior_SW', 4.598433, 52.355973, 'outside' UNION ALL
  SELECT 'exterior_SE', 4.672773, 52.355973, 'outside' UNION ALL
  SELECT 'exterior_N', 4.635603, 52.410000, 'outside' UNION ALL
  SELECT 'exterior_S', 4.635603, 52.355973, 'outside'
),
results AS (
  SELECT loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id='haarlem_ze_zone_2025'),
      ST_SetSRID(ST_MakePoint(lon,lat),4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected=actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results ORDER BY (expected='inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1780700000000_seed-nl-compliance-zones-haarlem', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pgmigrations WHERE name='1780700000000_seed-nl-compliance-zones-haarlem');

COMMIT;
\echo '=== haarlem_ze_zone_2025 COMMITTED ==='
