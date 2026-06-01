-- ============================================================================
-- Migration: 1780800000000_seed-nl-compliance-zones-nijmegen.sql
-- ============================================================================
-- Phase 1 Batch (NDW harmonized) - Nijmegen ZE-Zone seed
--
-- Source: NDW Open Data DATEX II (Bron NDW) https://opendata.ndw.nu/emissiezones.xml.gz
--         cz:urbanVehicleAccessRegulation name="ZE Nijmegen"  id=NDW11_4375e04a-c0d0-40e3-8309-b70657453c57
--         gmlMultiPolygon posList WGS84 (lat lon) -> GeoJSON (lon lat) + ST_MakeValid + ST_Multi
--
-- Derivation verification (2026-06-01):
--   gtype ST_MultiPolygon | parts 3 | area_km2 2.7271 | perimeter_km 11.73
--   vertices 168 | is_valid true | rep_point (5.8648,51.8466)
--   bbox [5.84638,51.81647]-[5.87659,51.86605]
--   sanity 11/11 PASS (5 interior + 6 exterior geometric points; NDW pipeline
--          landmark-validated on Leiden 2.9.11)
--   wkt_bytes 4314
--
-- Regulation: RVV 1990 + verkeersbesluit gmb-2024-400964
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
  'nijmegen_ze_zone_2025',
  'Nijmegen',
  'ze_zone',
  ST_Multi(ST_MakeValid(ST_GeomFromText('MULTIPOLYGON (((5.85958177 51.81650728, 5.86625923 51.81647249, 5.86665665 51.81647344, 5.8667979 51.81655154, 5.86696309 51.81663917, 5.86714764 51.81669622, 5.8673423 51.81673011, 5.86762395 51.81675785, 5.86790491 51.81675744, 5.86973659 51.8167723, 5.86996687 51.81679383, 5.87002927 51.81681413, 5.87006261 51.81683133, 5.87009086 51.81685627, 5.87012341 51.81689595, 5.87093551 51.81792472, 5.87250104 51.81856566, 5.87365847 51.819031, 5.87469092 51.81943776, 5.87536534 51.81970214, 5.87613466 51.81892115, 5.87646358 51.8190428, 5.8765907 51.81925566, 5.8765094 51.81988993, 5.87558714 51.8213838, 5.87424078 51.82268777, 5.86287686 51.82943427, 5.86246346 51.82915848, 5.862162131171581 51.82912347541024, 5.862324909861155 51.827996789890776, 5.862322819654051 51.82717912631517, 5.862412801433174 51.826586141126256, 5.862386278250729 51.825951346677506, 5.8623787279356865 51.8257403211023, 5.861538697153729 51.82576984173247, 5.859605908482528 51.82584197256658, 5.858855093170326 51.825833204547976, 5.858750070282016 51.8258147530243, 5.858652563843548 51.82580094712435, 5.858410365759705 51.82575926777414, 5.858326271806342 51.82568439690586, 5.85792299497995 51.82567915169274, 5.857729918895689 51.82568287636656, 5.857547571648027 51.82569157428781, 5.857512260927714 51.82569096577251, 5.856518414265571 51.82115370249305, 5.855961400496245 51.81881402959604, 5.8555458044319675 51.817449172326555, 5.856156273855482 51.816965244867546, 5.856709729453684 51.81656134841643, 5.85958177 51.81650728)), ((5.85901545 51.85712423, 5.85919204 51.85734703, 5.85940977 51.85793189, 5.85947352 51.85807614, 5.85960095 51.85852844, 5.85965347 51.85884791, 5.85973258 51.85935756, 5.85976767 51.85977225, 5.85974765 51.86079227, 5.85962952 51.86183553, 5.85945049 51.86351839, 5.85881154 51.86355141, 5.85827222 51.8637058, 5.85782015 51.86397402, 5.8576137 51.86421841, 5.8572725 51.86450902, 5.85694335 51.86477674, 5.85643011 51.86507564, 5.85599022 51.86533619, 5.85547633 51.8655742, 5.8548268 51.86577469, 5.85417664 51.86591428, 5.85353837 51.86601577, 5.85255826 51.86605391, 5.85174622 51.86599623, 5.85095869 51.86593084, 5.85019496 51.86578924, 5.84971416 51.86566174, 5.84908505 51.86545871, 5.8486774 51.86527002, 5.84822034 51.8650587, 5.84760284 51.86478711, 5.8473677 51.8646358, 5.84677363 51.86424994, 5.84649986 51.86378272, 5.84638409 51.86341708, 5.84649317 51.86312764, 5.8467142 51.86283005, 5.84741576 51.86204888, 5.84815708 51.86150648, 5.8487755 51.86111869, 5.85017196 51.86013439, 5.85132309 51.85950557, 5.85259889 51.85889936, 5.85394726 51.85809247, 5.85434251 51.85779803, 5.85469792 51.85756347, 5.85510668 51.85737302, 5.85554699 51.85722483, 5.85591929 51.85711929, 5.85642204 51.85699012, 5.85699319 51.85685681, 5.85753041 51.85675254, 5.85825196 51.85671882, 5.85867593 51.85679419, 5.85901545 51.85712423)), ((5.85721824 51.8505486, 5.85621194 51.85071447, 5.85597478 51.85064606, 5.85503419 51.84875386, 5.85648746 51.84849372, 5.85663542 51.84836211, 5.85640718 51.84795454, 5.85624083 51.8475159, 5.85624493 51.84671435, 5.85631533 51.84630559, 5.85643542 51.84588892, 5.8566789 51.84537157, 5.85687142 51.84503939, 5.85706191 51.84481127, 5.85726622 51.84471604, 5.8576633 51.8446104, 5.85803263 51.84423127, 5.85862193 51.84346975, 5.85898098 51.84300203, 5.85915323 51.84281637, 5.8593419 51.84271349, 5.85964322 51.84267374, 5.85983252 51.84263059, 5.85991634 51.84258378, 5.86006465 51.84251983, 5.86020018 51.84239211, 5.86029107 51.84216053, 5.86063367 51.84220154, 5.8610815 51.84219203, 5.86172808 51.84215088, 5.86247484 51.84217098, 5.86355876 51.84230531, 5.86450942 51.84248642, 5.86552918 51.84272889, 5.86636496 51.84292779, 5.86648342 51.84295236, 5.86821429 51.84336724, 5.86880039 51.84348815, 5.86958657 51.84370072, 5.87103478 51.84414948, 5.87269089 51.84483628, 5.87258126 51.84505543, 5.87252773 51.84528397, 5.87305161 51.84583286, 5.87326635 51.8461287, 5.87330664 51.8464031, 5.87321802 51.84683892, 5.87304751 51.84718259, 5.87278848 51.84739465, 5.87246451 51.8479326, 5.87220843 51.8484192, 5.87166929 51.84804378, 5.87165047 51.84860841, 5.8716517 51.84872208, 5.86944087 51.8491204, 5.86812388 51.84931848, 5.86545334 51.84979182, 5.86442212 51.84995016, 5.86158681 51.85014663, 5.85906225 51.85031095, 5.85721824 51.8505486)))', 4326)))::geometry(MultiPolygon, 4326),
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
      'city', 'Nijmegen',
      'gemeente', 'Nijmegen',
      'regulation_id', 'gmb-2024-400964',
      'info_url', 'https://www.nijmegen.nl/over-de-gemeente/plannen/invoering-zero-emissiezones/?featureid=MIL_ZES_ZONE.3',
      'transition_period_end', '2030-01-01',
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2025-01-01',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'NDW DATEX II Open Data (emissiezones.xml) gmlMultiPolygon WGS84 lat/lon -> GeoJSON lon/lat + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://opendata.ndw.nu/emissiezones.xml.gz',
        'ndw_zone_id', 'NDW11_4375e04a-c0d0-40e3-8309-b70657453c57',
        'ndw_file_publication', '2026-05-31T06:00:00Z',
        'polygon_parts', 3,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'batch', 'phase1_ndw_batch_2026-06-01'
      )
    )
  ),
  '2025-01-01',
  '2027-12-31',
  'nijmegen_verkeersbesluit_gmb_2024_400964',
  'https://www.nijmegen.nl/over-de-gemeente/plannen/invoering-zero-emissiezones/?featureid=MIL_ZES_ZONE.3',
  'Batch seed via NDW DATEX II Open Data (harmonized national source, Bron NDW). Sanity 11/11 PASS. RDW Centraal Loket harmonized fees. Overgangsregeling until 2030.'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'nijmegen_ze_zone_2025'
);

\echo ''
\echo '=== nijmegen_ze_zone_2025: inserted zone check ==='
SELECT zone_id, city, zone_type, ST_GeometryType(polygon) AS gtype,
  ST_NumGeometries(polygon) AS part_count,
  ROUND((ABS(ST_Area(polygon::geography))/1e6)::numeric,4) AS area_km2,
  ST_NPoints(polygon) AS vertices, ST_IsValid(polygon) AS valid,
  effective_from, effective_to
FROM enterprise.nl_compliance_zones WHERE zone_id = 'nijmegen_ze_zone_2025';

\echo ''
\echo '=== nijmegen_ze_zone_2025: sanity (11 points) ==='
WITH points AS (
  SELECT 'interior_rep' AS loc, 5.864773 AS lon, 51.846559 AS lat, 'inside' AS expected UNION ALL
  SELECT 'interior_part1', 5.864452, 51.824183, 'inside' UNION ALL
  SELECT 'interior_part2', 5.854078, 51.861313, 'inside' UNION ALL
  SELECT 'interior_4', 5.864165, 51.827444, 'inside' UNION ALL
  SELECT 'interior_5', 5.864364, 51.827444, 'inside' UNION ALL
  SELECT 'exterior_NW', 5.834384, 51.878054, 'outside' UNION ALL
  SELECT 'exterior_NE', 5.888591, 51.878054, 'outside' UNION ALL
  SELECT 'exterior_SW', 5.834384, 51.804472, 'outside' UNION ALL
  SELECT 'exterior_SE', 5.888591, 51.804472, 'outside' UNION ALL
  SELECT 'exterior_N', 5.861487, 51.878054, 'outside' UNION ALL
  SELECT 'exterior_S', 5.861487, 51.804472, 'outside'
),
results AS (
  SELECT loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id='nijmegen_ze_zone_2025'),
      ST_SetSRID(ST_MakePoint(lon,lat),4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected=actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results ORDER BY (expected='inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1780800000000_seed-nl-compliance-zones-nijmegen', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pgmigrations WHERE name='1780800000000_seed-nl-compliance-zones-nijmegen');

COMMIT;
\echo '=== nijmegen_ze_zone_2025 COMMITTED ==='
