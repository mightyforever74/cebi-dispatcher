-- ============================================================================
-- Migration: 1780000000000_seed-nl-compliance-zones-arnhem.sql
-- ============================================================================
-- Phase 1 Batch (NDW harmonized) - Arnhem ZE-Zone seed
--
-- Source: NDW Open Data DATEX II (Bron NDW) https://opendata.ndw.nu/emissiezones.xml.gz
--         cz:urbanVehicleAccessRegulation name="ZE Arnhem"  id=NDW11_2debbd80-acd8-4c76-bc9e-dfccf1f7238c
--         gmlMultiPolygon posList WGS84 (lat lon) -> GeoJSON (lon lat) + ST_MakeValid + ST_Multi
--
-- Derivation verification (2026-06-01):
--   gtype ST_MultiPolygon | parts 1 | area_km2 0.6982 | perimeter_km 3.55
--   vertices 96 | is_valid true | rep_point (5.9092,51.9807)
--   bbox [5.90165,51.97593]-[5.91636,51.98543]
--   sanity 11/11 PASS (5 interior + 6 exterior geometric points; NDW pipeline
--          landmark-validated on Leiden 2.9.11)
--   wkt_bytes 3588
--
-- Regulation: RVV 1990 + verkeersbesluit onbekend
-- Fees:       RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)
-- Effective:  2026-06-01 (overgangsregeling tot 2030)
-- Prereq:     1779350000000_alter-nl-compliance-zones-multipolygon applied
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

INSERT INTO enterprise.nl_compliance_zones (
  zone_id, city, zone_type, polygon, rules,
  effective_from, effective_to, source, source_url, notes
)
SELECT
  'arnhem_ze_zone_2026',
  'Arnhem',
  'ze_zone',
  ST_Multi(ST_MakeValid(ST_GeomFromText('MULTIPOLYGON (((5.905060570812294 51.98459199838273, 5.906298897265578 51.98476133507491, 5.907705019137116 51.98495131835263, 5.908948976887424 51.985106332406616, 5.910164223319497 51.98527573087748, 5.911055746616131 51.985428721875486, 5.911632445654236 51.9848446893449, 5.911853266560838 51.98465468072764, 5.911873213356778 51.98458182040703, 5.911936967189582 51.98447140372859, 5.912059967897696 51.984350501982625, 5.912180743777052 51.98430358850766, 5.912290133112984 51.984270994725726, 5.912935032105334 51.984086183421034, 5.913366425693892 51.983923727902095, 5.914203265898675 51.98434091715156, 5.914849930498957 51.98332491809921, 5.915160984801411 51.982756328414254, 5.915196341612077 51.98201611405207, 5.915890436714318 51.98073344546946, 5.915922927678145 51.98065917435561, 5.916195378258989 51.97995297200129, 5.916346260615152 51.9790319409455, 5.916362307814678 51.97878263728678, 5.916201235727252 51.978779461936014, 5.915978600413019 51.9788413448839, 5.915762540624912 51.97889742464084, 5.915487024041883 51.97894915290772, 5.915295661365139 51.9789851361724, 5.915105208528528 51.97900026029069, 5.914880056027143 51.97901197233846, 5.914660343045044 51.97899512157386, 5.914382823805834 51.9789749629862, 5.914122383539412 51.97893332328234, 5.91391393141119 51.978891450157995, 5.913751397359141 51.97882439966078, 5.91363457209746 51.978714338251635, 5.913581161047319 51.978593290469824, 5.913568560931647 51.97850416545005, 5.913550227523668 51.978418633562754, 5.913454918301698 51.97817291979501, 5.912996881843215 51.97753642972992, 5.912451212980183 51.97681471536576, 5.911827601377285 51.9768353356918, 5.911641514668528 51.97672914786276, 5.911616533282594 51.976568732875535, 5.911546151795354 51.97634606033926, 5.911451177670463 51.97612769225919, 5.911310263396037 51.97593235925866, 5.910766519022191 51.97606415433636, 5.910293403044803 51.97617660709963, 5.909875400576666 51.976260275006155, 5.909414159941004 51.976334620187906, 5.909186817926877 51.976388900785075, 5.909005595250492 51.97643536586815, 5.908959696688305 51.97646220468323, 5.908624777418116 51.97653788992117, 5.908229759569579 51.976675346817736, 5.907099498258054 51.97702876171356, 5.906956446444465 51.9771146439904, 5.906198269158777 51.97746640584457, 5.904781177495396 51.97801547351875, 5.904579831835596 51.978087704476984, 5.904308664538788 51.97820007665009, 5.903899900528163 51.978402829255316, 5.903239317990535 51.978726782480095, 5.902889939001989 51.97890370539974, 5.902018631591769 51.979323701825905, 5.901654665411684 51.97948879422762, 5.90277692987041 51.980570647705534, 5.902669180560371 51.980633658169374, 5.902527755645693 51.98069349491966, 5.902374622114714 51.98073982659084, 5.902084726948643 51.98077850833833, 5.901787077479665 51.98118808631254, 5.902074174676103 51.98132952033121, 5.902234479428095 51.98147150901584, 5.902319426730071 51.98156731388354, 5.902370783104094 51.98166972665818, 5.90242933790229 51.981846256200576, 5.902499425127861 51.98208019846865, 5.902718337461988 51.98286403343156, 5.902797306707173 51.983200198571566, 5.902879146488474 51.98361839651566, 5.903937603337458 51.983556674642756, 5.904351648556983 51.983557232952776, 5.904646383620334 51.98356544885842, 5.904912550778787 51.983601139478445, 5.905123122250991 51.983658477361615, 5.905334146228643 51.9837550523253, 5.905440964307549 51.98383306146054, 5.905486491575472 51.98393987857075, 5.905474881653407 51.98410164505218, 5.905460699884373 51.984207536131464, 5.905313960342186 51.984341359159345, 5.905060570812294 51.98459199838273)))', 4326)))::geometry(MultiPolygon, 4326),
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
      'city', 'Arnhem',
      'gemeente', 'Arnhem',
      'regulation_id', 'onbekend',
      'info_url', 'https://www.arnhem.nl/stad_en_wijken/Wegen_en_vervoer/Zero_emissiezone',
      'transition_period_end', '2030-01-01',
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2026-06-01',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'NDW DATEX II Open Data (emissiezones.xml) gmlMultiPolygon WGS84 lat/lon -> GeoJSON lon/lat + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://opendata.ndw.nu/emissiezones.xml.gz',
        'ndw_zone_id', 'NDW11_2debbd80-acd8-4c76-bc9e-dfccf1f7238c',
        'ndw_file_publication', '2026-05-31T06:00:00Z',
        'polygon_parts', 1,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'batch', 'phase1_ndw_batch_2026-06-01'
      )
    )
  ),
  '2026-06-01',
  '2027-12-31',
  'arnhem_verkeersbesluit_onbekend',
  'https://www.arnhem.nl/stad_en_wijken/Wegen_en_vervoer/Zero_emissiezone',
  'Batch seed via NDW DATEX II Open Data (harmonized national source, Bron NDW). Sanity 11/11 PASS. RDW Centraal Loket harmonized fees. Overgangsregeling until 2030.'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'arnhem_ze_zone_2026'
);

\echo ''
\echo '=== arnhem_ze_zone_2026: inserted zone check ==='
SELECT zone_id, city, zone_type, ST_GeometryType(polygon) AS gtype,
  ST_NumGeometries(polygon) AS part_count,
  ROUND((ABS(ST_Area(polygon::geography))/1e6)::numeric,4) AS area_km2,
  ST_NPoints(polygon) AS vertices, ST_IsValid(polygon) AS valid,
  effective_from, effective_to
FROM enterprise.nl_compliance_zones WHERE zone_id = 'arnhem_ze_zone_2026';

\echo ''
\echo '=== arnhem_ze_zone_2026: sanity (11 points) ==='
WITH points AS (
  SELECT 'interior_rep' AS loc, 5.909242 AS lon, 51.980676 AS lat, 'inside' AS expected UNION ALL
  SELECT 'interior_2', 5.907077, 51.982730, 'inside' UNION ALL
  SELECT 'interior_3', 5.907696, 51.982814, 'inside' UNION ALL
  SELECT 'interior_4', 5.908399, 51.982909, 'inside' UNION ALL
  SELECT 'interior_5', 5.909021, 51.982987, 'inside' UNION ALL
  SELECT 'exterior_NW', 5.889655, 51.997429, 'outside' UNION ALL
  SELECT 'exterior_NE', 5.928362, 51.997429, 'outside' UNION ALL
  SELECT 'exterior_SW', 5.889655, 51.963932, 'outside' UNION ALL
  SELECT 'exterior_SE', 5.928362, 51.963932, 'outside' UNION ALL
  SELECT 'exterior_N', 5.909008, 51.997429, 'outside' UNION ALL
  SELECT 'exterior_S', 5.909008, 51.963932, 'outside'
),
results AS (
  SELECT loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id='arnhem_ze_zone_2026'),
      ST_SetSRID(ST_MakePoint(lon,lat),4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected=actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results ORDER BY (expected='inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1780000000000_seed-nl-compliance-zones-arnhem', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pgmigrations WHERE name='1780000000000_seed-nl-compliance-zones-arnhem');

COMMIT;
\echo '=== arnhem_ze_zone_2026 COMMITTED ==='
