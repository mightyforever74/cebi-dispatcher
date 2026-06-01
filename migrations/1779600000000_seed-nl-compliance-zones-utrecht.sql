-- ============================================================================
-- Migration: 1779600000000_seed-nl-compliance-zones-utrecht.sql
-- ============================================================================
-- Phase 1 Sira 2.9.8 - Utrecht ZE-Zone seed
--
-- Source: utrechtmilieu.nl Leaflet milieuzone app (Polygon GeoJSON embedded
--         in milieuzone.js, data revision 20260507).
--         + ST_MakeValid + ST_Multi (defensive)
--
-- Derivation verification (2026-06-01):
--   - gtype:         ST_Polygon (promoted to MultiPolygon for schema)
--   - parts:         1
--   - area_km2:      3.0044 (smallest ZE-Zone so far - tight binnenstad)
--   - perimeter_km:  9.38
--   - vertices:      150
--   - is_valid:      true
--   - centroid:      (5.1170, 52.0890)
--   - sanity test:   11/11 PASS (Domtoren, Stadhuis, Neude, TivoliVredenburg,
--                                Utrecht Centraal inside; Science Park,
--                                Maarssen, Nieuwegein, Houten, Leidsche Rijn,
--                                Zuilen outside)
--   - wkt_bytes:     5421
--
-- Regulation: RVV 1990 + CVDR721021 (Utrecht verkeersbesluit)
-- Fees:       RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)
-- Effective:  2025-01-01 to 2027-12-31 (Utrecht active since 2025-01-01)
-- Prereq:     1779350000000_alter-nl-compliance-zones-multipolygon applied
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

INSERT INTO enterprise.nl_compliance_zones (
  zone_id, city, zone_type, polygon, rules,
  effective_from, effective_to, source, source_url, notes
)
SELECT
  'utrecht_ze_zone_2025',
  'Utrecht',
  'ze_zone',
  ST_Multi(ST_MakeValid(ST_GeomFromText('POLYGON((5.094286012980449 52.08734361278418,5.098401451456334 52.08866105215115,5.098516243129882 52.08869898732938,5.104011332789027 52.09040235954347,5.105050047989418 52.090751217504454,5.105098861202798 52.091083596203354,5.104462823357983 52.092529889786995,5.104472040922095 52.09298667203657,5.104910990236135 52.09314210950101,5.107090232589425 52.09425065601408,5.10868054580353 52.09522947292155,5.108869014646114 52.09538157238771,5.109384449529803 52.09566269574665,5.109650934075892 52.095681965506344,5.112897624394205 52.096686313714756,5.113002420036945 52.09677450593109,5.113001783726261 52.09688063534643,5.112377237689202 52.097582745804665,5.112006217081286 52.09781515505816,5.112493088418429 52.097964397233085,5.114001551464032 52.09847588469372,5.115909252623541 52.09651985660269,5.11615253135852 52.09655195777239,5.117494849997081 52.09657537138844,5.117795792251872 52.09657151249772,5.119859945993451 52.09651827432679,5.120552807166642 52.097166030639954,5.120662641313208 52.097240789548316,5.120963826495297 52.09732982307718,5.121271132412379 52.09733872898345,5.122603182446406 52.09696252573295,5.124308849224859 52.097559711851574,5.124284343173207 52.09766153680262,5.124263518535372 52.09772341789248,5.124702222685882 52.09887077238106,5.126380655271705 52.09932052073924,5.1272923408483 52.09872098917441,5.127525340907981 52.098420668736786,5.127606345390983 52.09814296387973,5.127645186281725 52.09795870802399,5.127380357421317 52.09791003457789,5.127358220770036 52.09763945447528,5.127021694047741 52.09694847780114,5.126710360565595 52.096374335440984,5.126523975299214 52.09609065050943,5.126474766892164 52.09567762151245,5.126635604187422 52.0951934317496,5.126713045559525 52.09495616575464,5.126781846899171 52.0946337366852,5.126891255375865 52.094530031808816,5.127069785373413 52.09444713414479,5.128890440771605 52.09359699871493,5.12902708499286 52.093427210663755,5.128676696092747 52.09327113121826,5.128229008237329 52.09297880344214,5.128163080023139 52.09287549359184,5.128248654361071 52.0928292854985,5.129120810623777 52.09269991181129,5.129685516974249 52.0925352467449,5.130080917465742 52.0923711531268,5.1312438233813 52.09185147190461,5.132437353930699 52.09139436243288,5.132800867083113 52.09122223110644,5.131272525579118 52.090181382568574,5.130236763135509 52.089493643341896,5.129825821328922 52.08917319331436,5.129361252709507 52.08873208659143,5.129712186419638 52.08846251787636,5.130390855183881 52.08825715066823,5.131811342921687 52.08875572482301,5.132096628047843 52.0886773859818,5.130959845601393 52.08698610882955,5.130551985421781 52.08609036974398,5.130440859610071 52.08547085816426,5.130355896227709 52.0853246322375,5.130137754472988 52.08517112697791,5.129891488625415 52.08498920936375,5.129068937881711 52.08457354309727,5.128370783702419 52.08415685923866,5.128024529042193 52.083900350362114,5.127208126498931 52.083047108153984,5.126849742372026 52.08261221815132,5.126403012859786 52.0818129342519,5.126234551171656 52.08151255795492,5.126018366407258 52.0812678282482,5.125856570398127 52.08113057695301,5.126447622282486 52.08089541956011,5.126443104200451 52.08078202468408,5.125657397432947 52.08108749516434,5.125316234195592 52.08101218048285,5.125112878194104 52.08103836874061,5.124614941953658 52.08116062094202,5.124467874953853 52.08115569089525,5.124398432125204 52.081133595940045,5.124256386395216 52.08098918169691,5.124179803365977 52.08090619428551,5.124041868397692 52.08090394457323,5.123941391174766 52.08085550786899,5.123749454904837 52.080899662200466,5.122978223684302 52.07948177952729,5.122099622216773 52.078230256190615,5.120414760514081 52.078885593261354,5.120130440500344 52.07901388341148,5.119700290346547 52.07923510263028,5.118819410994265 52.07981090286714,5.117979492016458 52.08028399036013,5.117526865849833 52.08045965396498,5.116415263844033 52.08064197392241,5.11553793184369 52.080880574581194,5.114262561838074 52.082202357515605,5.113221027660462 52.08253331462287,5.112426090456186 52.08276257858286,5.111605278844999 52.0827607407226,5.111098824397757 52.08261116049066,5.110704251534925 52.082565613838064,5.108706682030653 52.08473705236199,5.108483213362525 52.08464548311416,5.107745934880775 52.08393424311438,5.103508229231656 52.086126560382084,5.103260448385363 52.086025709080275,5.101703666386116 52.08680172950753,5.101727976664722 52.08691349389013,5.101356181740174 52.0871977054215,5.101203845676059 52.08742334902408,5.101174352006531 52.08742402904908,5.10116000285753 52.087425072806354,5.101145824194152 52.08742683602164,5.101131918320158 52.087429291979035,5.101118387424459 52.08743243193848,5.101105304630399 52.0874362291133,5.101092757594219 52.08744066574024,5.101080848620045 52.087445715103485,5.101069621765892 52.08745133236979,5.10105917933614 52.08745749082344,5.101049565331572 52.08746415461907,5.10104086763896 52.087471270041746,5.101033115726541 52.087478792222804,5.101026382833558 52.08748667639986,5.101018465077997 52.08749808751651,5.100323208912331 52.08767407386216,5.100120139614972 52.08729991638902,5.099841471970642 52.086752010811786,5.099698620660837 52.08655849425136,5.099395786947798 52.08624344000975,5.098911798305597 52.085884630874865,5.09863389445515 52.0856822495006,5.098354539784471 52.085499332087565,5.098283752203028 52.08544814623541,5.098134000444738 52.085337764203594,5.094286012980449 52.08734361278418))', 4326)))::geometry(MultiPolygon, 4326),
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
        'national_ontheffing_via_RDW'
      ),
      'national_ontheffing_recognition', jsonb_build_object(
        'basis', 'Art 17 RVV (cross-zone)',
        'central_loket', 'RDW',
        'central_loket_url', 'https://www.rdw.nl/ontheffing-zero-emissie'
      )
    ),
    'city_overlay', jsonb_build_object(
      'city', 'Utrecht',
      'exemption_url', 'https://www.utrecht.nl/wonen-en-leven/gezonde-leefomgeving/luchtkwaliteit/milieuzone-en-zero-emissiezone',
      'regulation_id', 'CVDR721021',
      'regulation_url', 'https://lokaleregelgeving.overheid.nl/CVDR721021',
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2025-01-01',
        'geldend_to', '2027-12-31',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'ST_GeomFromGeoJSON(milieuzone.js layer) + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://utrechtmilieu.nl/milieuzone/',
        'polygon_source_method', 'utrechtmilieu.nl Leaflet app GeoJSON embedded in milieuzone.js (data rev 20260507)',
        'polygon_parts', 1,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'special_note', 'Tight binnenstad coverage (~3 km²). Centraal Station inside polygon (unlike Den Haag).'
      )
    )
  ),
  '2025-01-01',
  '2027-12-31',
  'utrecht_verkeersbesluit_v2025_01',
  'https://utrechtmilieu.nl/milieuzone/',
  'Pilot seed via utrechtmilieu.nl Leaflet milieuzone.js (single Polygon, GeoJSON FeatureCollection embedded in JS, data rev 20260507). Sanity test 11/11 PASS. RDW Centraal Loket harmonized fees. Tight binnenstad coverage.'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'utrecht_ze_zone_2025'
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
WHERE zone_id = 'utrecht_ze_zone_2025';

\echo ''
\echo '=== Post-insert sanity test (11 points) ==='
WITH points AS (
  SELECT 'Domtoren' AS loc, 5.1213 AS lon, 52.0907 AS lat, 'inside' AS expected UNION ALL
  SELECT 'Stadhuis',                 5.1215, 52.0900, 'inside'  UNION ALL
  SELECT 'Neude',                    5.1184, 52.0923, 'inside'  UNION ALL
  SELECT 'TivoliVredenburg',         5.1136, 52.0921, 'inside'  UNION ALL
  SELECT 'Utrecht Centraal',         5.1101, 52.0894, 'inside'  UNION ALL
  SELECT 'Science Park (Uithof)',    5.1768, 52.0834, 'outside' UNION ALL
  SELECT 'Maarssen',                 5.0367, 52.1395, 'outside' UNION ALL
  SELECT 'Nieuwegein Centrum',       5.0892, 52.0292, 'outside' UNION ALL
  SELECT 'Houten',                   5.1683, 52.0334, 'outside' UNION ALL
  SELECT 'Leidsche Rijn',            5.0511, 52.0921, 'outside' UNION ALL
  SELECT 'Zuilen',                   5.0895, 52.1154, 'outside'
),
results AS (
  SELECT loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id = 'utrecht_ze_zone_2025'),
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected = actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results
ORDER BY (expected = 'inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1779600000000_seed-nl-compliance-zones-utrecht', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.pgmigrations
  WHERE name = '1779600000000_seed-nl-compliance-zones-utrecht'
);

COMMIT;

\echo ''
\echo '=== Seed migration COMMITTED ==='
