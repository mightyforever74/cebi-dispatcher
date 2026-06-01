-- ============================================================================
-- Migration: 1779800000000_seed-nl-compliance-zones-maastricht.sql
-- ============================================================================
-- Phase 1 Sira 2.9.10 - Maastricht ZE-Zone seed
--
-- Source: slimme-kaart-maastricht.made4it.com (Maastricht Bereikbaar widget CDN)
--         Path: /data/zero-emissie
--         Format: Custom JS object (lng/lat array pairs) - converted to GeoJSON
--         MultiPolygon (2 parts split by Maas river)
--         + ST_MakeValid + ST_Multi (defensive)
--
-- Derivation verification (2026-06-01):
--   - gtype:         ST_MultiPolygon
--   - parts:         2 (west bank Vrijthof + east bank including Centraal)
--   - area_km2:      2.3100 (smallest ZE-Zone after Utrecht - tight medieval centre)
--   - perimeter_km:  11.21
--   - vertices:      168
--   - is_valid:      true
--   - centroid:      (5.6927, 50.8492)
--   - sanity test:   11/11 PASS (Vrijthof, Markt, Sint-Janskerk, Stokstraat,
--                                Maastricht CS inside; Sint Servaasbrug, MECC,
--                                Fort St. Pieter, Valkenburg, Geleen, Eijsden outside)
--   - wkt_bytes:     6086
--
-- Special notes:
--   - 2-part MultiPolygon split by Maas river (river surface not in ZE-Zone)
--   - Centraal Station IS in zone (unlike Den Haag) - east bank covered
--   - Sint Servaasbrug bridge across river is NOT in zone (river surface excluded)
--
-- Regulation: RVV 1990 + CVDR721458 (Maastricht verkeersbesluit 25 april 2024)
-- Fees:       RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)
-- Effective:  2025-01-01 to 2027-12-31 (overgangsregeling tot 2030)
-- Prereq:     1779350000000_alter-nl-compliance-zones-multipolygon applied
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

INSERT INTO enterprise.nl_compliance_zones (
  zone_id, city, zone_type, polygon, rules,
  effective_from, effective_to, source, source_url, notes
)
SELECT
  'maastricht_ze_zone_2025',
  'Maastricht',
  'ze_zone',
  ST_Multi(ST_MakeValid(ST_GeomFromText('MULTIPOLYGON(((5.688209093416034 50.85701329858072,5.688734806382954 50.857379020903075,5.689281327384648 50.85757546579765,5.690085990089115 50.857798960419004,5.690354210990605 50.85785314077199,5.691523654121098 50.857832823147014,5.691641671317753 50.85767028182843,5.691748959678349 50.85750096735251,5.69171677317017 50.85690307687751,5.691663128989872 50.85653735082257,5.691105229514775 50.856557669011984,5.691073043006596 50.85608902408898,5.692092282432255 50.85606870569541,5.692746741431889 50.85605516009476,5.693175894874272 50.85603484168643,5.693589773030458 50.85582631930965,5.694501724095522 50.85612432307721,5.69455536827582 50.85606336791603,5.694845046849428 50.85613786865776,5.695220556111513 50.856117550285454,5.695242013783632 50.85631396084694,5.695166911931215 50.85638168843494,5.695242013783632 50.85643587043453,5.695392217488466 50.8563071880827,5.695252742619692 50.85586695629916,5.695317108843643 50.855844943916665,5.695102362192102 50.85500848191225,5.694943899287943 50.854449978307535,5.694804424419169 50.85392167863088,5.694729322566752 50.85354915603056,5.694589847697977 50.8525060400702,5.694589847697977 50.85226897338258,5.694504017009501 50.85216059963835,5.694493288173441 50.85191675779317,5.69476150907493 50.851835476894834,5.697254140702503 50.851927018248816,5.697260475848477 50.85183867951463,5.696089727787306 50.85183867951463,5.694770080951979 50.851770945329136,5.69448040237837 50.851642250105684,5.694544775394728 50.851186705137465,5.694823725132276 50.85003549842529,5.694931013492872 50.84970358714575,5.694888098148634 50.84961552865477,5.694963200001051 50.849398768584145,5.695167047886183 50.84864445146057,5.695413811115553 50.84835994773877,5.695769735789806 50.847512462197194,5.696220346904308 50.846263831383816,5.6969001249026 50.8452936763514,5.697605567598698 50.84450127144353,5.698156935057428 50.843594956947946,5.698253494581964 50.84326299984275,5.697802883467462 50.84331719708246,5.697491747221735 50.843357844970946,5.697202068648126 50.84319525320455,5.696998220762994 50.8430123367901,5.696536880812433 50.84307330900794,5.696257931074884 50.84296491389894,5.695291639324069 50.84298120596247,5.694411874767185 50.84289313478173,5.692305204662142 50.842455867945944,5.69138252476102 50.842259399025544,5.690180895122348 50.842083253772856,5.689802545033529 50.84199767138276,5.688289779149129 50.84194347261029,5.686568091225221 50.842065419759834,5.685441563438967 50.84230253830487,5.684164831947878 50.842756447587014,5.683565192020685 50.843067963394624,5.683114580906183 50.84333217544808,5.682455018372754 50.84386224786945,5.682004407258252 50.844329690988104,5.68223780136885 50.84472177070937,5.682216343696731 50.84484371059752,5.681422409828323 50.84507404062779,5.680936130533532 50.84560115752692,5.680174383173302 50.8465563267832,5.679368232334498 50.8475805656231,5.67864763884562 50.84846229361465,5.67819978157619 50.849095477884326,5.678156866231952 50.849169989756675,5.678285612264666 50.84937320334905,5.678135408559832 50.84961705849132,5.678124679723773 50.84996929144626,5.679235369319309 50.850703731127965,5.680104405040134 50.851306575714005,5.681098288772248 50.851995635285924,5.682344748791288 50.85286888996196,5.683449818905424 50.85366135512062,5.684207596050617 50.854181239292,5.684951475811566 50.85464222231973,5.685777596188153 50.85526533475503,5.686144216572924 50.85554913869979,5.68722782901494 50.85544754546725,5.688568933522387 50.85531886038834,5.688977569461913 50.855359497820054,5.689024484956562 50.85634280020718,5.687543905580341 50.85643084599798,5.687404430711567 50.8564782552011,5.688209093416034 50.85701329858072)),((5.697151815595047 50.85335386310852,5.697237646283524 50.85446465363094,5.69784863955674 50.85608643262805,5.698568354413491 50.85795753031498,5.698482523725015 50.85849932916958,5.698418150708657 50.85910884535668,5.698868761823159 50.859718353576845,5.699383745954019 50.859935065690735,5.700327883527261 50.86000278801978,5.70034934119938 50.85982670975967,5.699469576642495 50.85970480903626,5.698997507855874 50.85947455124481,5.698761473462564 50.858919218952195,5.698814981322546 50.858535637440895,5.700402849059363 50.858346008705475,5.701896032272118 50.855726055494536,5.702414859126317 50.85479038373326,5.703246182964166 50.85353760935973,5.703946428731537 50.85260630956579,5.70440342498002 50.85176545307058,5.70479800177158 50.85106402960524,5.705194968705785 50.85029184123541,5.705802143363017 50.84954226266826,5.706124587964836 50.84878542790215,5.706237533379777 50.84825697597566,5.706516483117325 50.84767441403591,5.707020738412125 50.84772860615114,5.708297469903214 50.84790473009093,5.709209420968278 50.84806053148339,5.709284522820694 50.847952147961124,5.709008967414961 50.84791827805878,5.708247220054732 50.847803120206834,5.707580116697777 50.84765651083745,5.706711080976952 50.84755490041268,5.70675399632119 50.84717555287136,5.707065132566918 50.846501415060935,5.706593063780296 50.8463320600368,5.705938604780663 50.846230446727226,5.70600297779702 50.8459797996173,5.70600297779702 50.84582071839604,5.705970791288841 50.84565136090087,5.705648926207054 50.84513651034017,5.705391434141624 50.84475060699796,5.704833534666527 50.843869921109345,5.704269441383802 50.84305705202288,5.703797372597181 50.842271181503406,5.703099998253309 50.842250857090235,5.702477725761854 50.8422034334251,5.702310170882483 50.842172136499926,5.702074136489172 50.84320189736483,5.701366033309241 50.84313415063793,5.701065625899573 50.84291736045079,5.700593557112952 50.84289026160657,5.699765366091349 50.844394027470486,5.698828142995338 50.84577163804554,5.698334616536598 50.84627293315549,5.697626513356666 50.84810243873981,5.697497767323951 50.84892885407437,5.697347563619117 50.84902368768454,5.697285430677965 50.849544530904495,5.697371261366442 50.85009997483335,5.697263973005846 50.85178991434702,5.697260475848477 50.85183867951463,5.697441561130812 50.85183867951463,5.697430832294752 50.85193350720908,5.697254140702503 50.851927018248816,5.697151815595047 50.85335386310852)))', 4326)))::geometry(MultiPolygon, 4326),
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
        'dagontheffing', 100,
        'kortdurende_ontheffing_1week', 60,
        'maatwerk_ontheffing_1maand', 25,
        'verzendkosten', 30,
        'bezwaarschrift', 0,
        'source', 'RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)',
        'fee_status', 'rdw_harmonized_confirmed'
      ),
      'exempt_categories', jsonb_build_array(
        'zero_emission',
        'essential_services',
        'emergency_services',
        'national_ontheffing_via_RDW',
        'oldtimer_40plus_years',
        'wheelchair_accessible'
      ),
      'national_ontheffing_recognition', jsonb_build_object(
        'basis', 'Art 17 RVV (cross-zone)',
        'central_loket', 'RDW',
        'central_loket_url', 'https://www.rdw.nl/ontheffing-zero-emissie'
      )
    ),
    'city_overlay', jsonb_build_object(
      'city', 'Maastricht',
      'exemption_url', 'https://www.gemeentemaastricht.nl/parkeren-en-verkeer/zero-emissiezone',
      'regulation_id', 'CVDR721458',
      'regulation_url', 'https://lokaleregelgeving.overheid.nl/CVDR721458',
      'verkeersbesluit_publication_date', '2024-04-25',
      'transition_period_end', '2030-01-01',
      'partner_info_site', 'https://www.maastrichtbereikbaar.nl/waar-werken-wij-aan/zero-emissie-stadslogistiek',
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2025-01-01',
        'geldend_to', '2027-12-31',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'Custom JS object (lng/lat) from made4it.com CDN converted to GeoJSON + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://slimme-kaart-maastricht.made4it.com/data/zero-emissie',
        'polygon_source_method', 'Maastricht Bereikbaar Slimme Kaart widget on Google Maps base (separate CDN data layer)',
        'polygon_parts', 2,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'special_note', 'Two-part MultiPolygon split by Maas river. Centraal Station INSIDE polygon (east bank), Sint Servaasbrug bridge OUTSIDE (river surface excluded). Both vracht/bestel and personenauto follow standard ZE rules.'
      )
    )
  ),
  '2025-01-01',
  '2027-12-31',
  'maastricht_verkeersbesluit_v2024_04_25',
  'https://www.gemeentemaastricht.nl/parkeren-en-verkeer/zero-emissiezone',
  'Pilot seed via Maastricht Bereikbaar Slimme Kaart widget. Custom format (made4it.com CDN) converted to GeoJSON MultiPolygon (2 parts split by Maas river). Sanity test 11/11 PASS. RDW Centraal Loket harmonized fees. Overgangsregeling until 2030.'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'maastricht_ze_zone_2025'
);

\echo ''
\echo '=== Inserted zone check ==='
SELECT
  zone_id, city, zone_type, ST_GeometryType(polygon) AS gtype,
  ST_NumGeometries(polygon) AS part_count,
  ROUND((ABS(ST_Area(polygon::geography)) / 1e6)::numeric, 4) AS area_km2,
  ST_NPoints(polygon) AS vertices,
  ST_IsValid(polygon) AS valid,
  effective_from, effective_to
FROM enterprise.nl_compliance_zones
WHERE zone_id = 'maastricht_ze_zone_2025';

\echo ''
\echo '=== Post-insert sanity test (11 points) ==='
WITH points AS (
  SELECT 'Vrijthof'          AS loc, 5.6886 AS lon, 50.8492 AS lat, 'inside' AS expected UNION ALL
  SELECT 'Markt',                    5.6914, 50.8514, 'inside'  UNION ALL
  SELECT 'Sint-Janskerk',            5.6881, 50.8489, 'inside'  UNION ALL
  SELECT 'Stokstraat',               5.6917, 50.8497, 'inside'  UNION ALL
  SELECT 'Maastricht CS',            5.7050, 50.8500, 'inside'  UNION ALL
  SELECT 'Sint Servaasbrug',         5.6961, 50.8489, 'outside' UNION ALL
  SELECT 'MECC',                     5.7139, 50.8358, 'outside' UNION ALL
  SELECT 'Fort St. Pieter',          5.6836, 50.8375, 'outside' UNION ALL
  SELECT 'Valkenburg',               5.8311, 50.8647, 'outside' UNION ALL
  SELECT 'Geleen',                   5.8283, 50.9658, 'outside' UNION ALL
  SELECT 'Eijsden',                  5.7033, 50.7767, 'outside'
),
results AS (
  SELECT loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id = 'maastricht_ze_zone_2025'),
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected = actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results
ORDER BY (expected = 'inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1779800000000_seed-nl-compliance-zones-maastricht', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.pgmigrations
  WHERE name = '1779800000000_seed-nl-compliance-zones-maastricht'
);

COMMIT;

\echo ''
\echo '=== Seed migration COMMITTED ==='
