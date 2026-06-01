-- ============================================================================
-- Migration: 1779900000000_seed-nl-compliance-zones-leiden.sql
-- ============================================================================
-- Phase 1 Sira 2.9.11 - Leiden ZE-Zone seed
--
-- Source: NDW (Nationaal Dataportaal Wegverkeer) Open Data - HARMONIZED national source
--         File:   https://opendata.ndw.nu/emissiezones.xml.gz (DATEX II v3, daily)
--         Object: cz:urbanVehicleAccessRegulation name="ZE Leiden"
--                 id=NDW11_95540fca-b1db-4c75-b80d-7652cbf0b9d0
--         Format: loc:gmlMultiPolygon / loc:posList (WGS84, lat lon order)
--                 -> converted to GeoJSON (lon lat) + ST_MakeValid + ST_Multi
--         NOTE:   First city seeded from NDW (methodological shift from per-city
--                 municipal scraping to single harmonized "Bron NDW" source -
--                 same layer the Geodan/Sogelink + opwegnaarzes viewers consume).
--
-- Derivation verification (2026-06-01, NDW file publication 2026-05-31T06:00Z):
--   - gtype:         ST_MultiPolygon
--   - parts:         1 (compact historic core within the singels + Stationsplein)
--   - area_km2:      2.0001
--   - perimeter_km:  6.38
--   - vertices:      50
--   - is_valid:      true
--   - centroid:      (4.4928, 52.1601)
--   - sanity test:   11/11 PASS (Pieterskerk, Hooglandse Kerk, Hortus, Stadhuis/
--                                Breestraat, Leiden Centraal/Stationsplein inside;
--                                Lammenschans, Oegstgeest, De Vink, Merenwijk,
--                                Roomburg, Leiderdorp outside)
--   - wkt_bytes:     1001
--
-- Special notes:
--   - Zone = historische binnenstad binnen de singels + Stationspleingebied.
--   - Stationspleintunnel (onder Stationsplein, part of ringweg) is NOT in zone;
--     captured by the official NDW polygon boundary, not modelled separately.
--   - Single-part polygon (unlike Maastricht/Rotterdam multipart).
--
-- Regulation: RVV 1990 + verkeersbesluit gmb-2024-284202; ontheffing CVDR721849
-- Fees:       RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)
-- Effective:  2025-01-01 to 2027-12-31 (overgangsregeling tot 2030; handhaving sinds 2025-08-01)
-- Prereq:     1779350000000_alter-nl-compliance-zones-multipolygon applied
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

INSERT INTO enterprise.nl_compliance_zones (
  zone_id, city, zone_type, polygon, rules,
  effective_from, effective_to, source, source_url, notes
)
SELECT
  'leiden_ze_zone_2025',
  'Leiden',
  'ze_zone',
  ST_Multi(ST_MakeValid(ST_GeomFromText('MULTIPOLYGON (((4.47769 52.16006, 4.480759 52.160724, 4.480931 52.159796, 4.481735 52.159204, 4.481993 52.158447, 4.483323 52.15561, 4.482797 52.154998, 4.482883 52.154682, 4.48357 52.154307, 4.484879 52.154577, 4.489267 52.153576, 4.490705 52.153445, 4.494857 52.153438, 4.495994 52.152925, 4.497045 52.15332, 4.498183 52.153379, 4.499137 52.153043, 4.500682 52.153418, 4.502785 52.153346, 4.503032 52.15482, 4.504073 52.155202, 4.504255 52.156051, 4.503257 52.156104, 4.504244 52.157262, 4.503965 52.157677, 4.504062 52.158204, 4.505146 52.158816, 4.504534 52.159507, 4.504759 52.160139, 4.505543 52.160731, 4.504995 52.161244, 4.504888 52.161771, 4.5055 52.163021, 4.501905 52.163199, 4.500296 52.163521, 4.499502 52.163778, 4.498698 52.164377, 4.497571 52.163982, 4.49461 52.164318, 4.49388 52.164706, 4.492604 52.165015, 4.491563 52.164561, 4.488055 52.164627, 4.48666 52.16516, 4.48651 52.166003, 4.483838 52.167227, 4.477433 52.162653, 4.47695 52.161942, 4.477068 52.161053, 4.47769 52.16006)))', 4326)))::geometry(MultiPolygon, 4326),
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
      'city', 'Leiden',
      'exemption_url', 'https://gemeente.leiden.nl/projecten/zero-emissiezone/',
      'regulation_id', 'gmb-2024-284202',
      'verkeersbesluit_ref', 'gmb-2024-284202',
      'ontheffingenbeleid_cvdr', 'CVDR721849',
      'ontheffingenbeleid_url', 'https://lokaleregelgeving.overheid.nl/CVDR721849',
      'enforcement_start_date', '2025-08-01',
      'transition_period_end', '2030-01-01',
      'cjib_boete_eur', jsonb_build_object('bestelauto', 130, 'vrachtauto', 320, 'administratiekosten', 9),
      '_meta', jsonb_build_object(
        'regulation_status', 'in_force',
        'geldend_from', '2025-01-01',
        'geldend_to', '2027-12-31',
        'last_verified_at', '2026-06-01',
        'requires_revalidation_before', '2026-12-01',
        'polygon_derivation_method', 'NDW DATEX II Open Data (emissiezones.xml) gmlMultiPolygon WGS84 posList lat/lon -> GeoJSON lon/lat + ST_MakeValid + ST_Multi',
        'polygon_source_url', 'https://opendata.ndw.nu/emissiezones.xml.gz',
        'polygon_source_method', 'NDW controlledZone urbanVehicleAccessRegulation "ZE Leiden" (Bron NDW - same layer as Geodan/Sogelink + opwegnaarzes viewers)',
        'ndw_zone_id', 'NDW11_95540fca-b1db-4c75-b80d-7652cbf0b9d0',
        'ndw_file_publication', '2026-05-31T06:00:00Z',
        'polygon_parts', 1,
        'sanity_test_result', '11/11 PASS (2026-06-01)',
        'special_note', 'Single-part polygon: historische binnenstad binnen de singels + Stationspleingebied. Stationspleintunnel (ringweg) excluded by official NDW boundary. First city seeded from harmonized NDW source instead of per-city municipal scrape.'
      )
    )
  ),
  '2025-01-01',
  '2027-12-31',
  'leiden_verkeersbesluit_gmb_2024_284202',
  'https://gemeente.leiden.nl/projecten/zero-emissiezone/',
  'Seed via NDW DATEX II Open Data (harmonized national source, Bron NDW). Single-part MultiPolygon (binnen de singels + Stationspleingebied). Sanity test 11/11 PASS. RDW Centraal Loket harmonized fees. Overgangsregeling until 2030; handhaving sinds 2025-08-01. First city using NDW source (methodological shift).'
WHERE NOT EXISTS (
  SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'leiden_ze_zone_2025'
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
WHERE zone_id = 'leiden_ze_zone_2025';

\echo ''
\echo '=== Post-insert sanity test (11 points) ==='
WITH points AS (
  SELECT 'Pieterskerk'        AS loc, 4.4855 AS lon, 52.1576 AS lat, 'inside' AS expected UNION ALL
  SELECT 'Hooglandse Kerk',          4.4887, 52.1597, 'inside'  UNION ALL
  SELECT 'Hortus Botanicus',         4.4866, 52.1557, 'inside'  UNION ALL
  SELECT 'Stadhuis/Breestraat',      4.4900, 52.1595, 'inside'  UNION ALL
  SELECT 'Leiden Centraal/Stationsplein', 4.4838, 52.1668, 'inside'  UNION ALL
  SELECT 'Lammenschans station',     4.4936, 52.1466, 'outside' UNION ALL
  SELECT 'Oegstgeest centrum',       4.4720, 52.1790, 'outside' UNION ALL
  SELECT 'De Vink (ZW)',             4.4790, 52.1430, 'outside' UNION ALL
  SELECT 'Merenwijk (N)',            4.4900, 52.1790, 'outside' UNION ALL
  SELECT 'Roomburg (O)',             4.5060, 52.1450, 'outside' UNION ALL
  SELECT 'Leiderdorp (NO)',          4.5400, 52.1620, 'outside'
),
results AS (
  SELECT loc, expected,
    CASE WHEN ST_Contains(
      (SELECT polygon FROM enterprise.nl_compliance_zones WHERE zone_id = 'leiden_ze_zone_2025'),
      ST_SetSRID(ST_MakePoint(lon, lat), 4326)
    ) THEN 'inside' ELSE 'outside' END AS actual
  FROM points
)
SELECT loc, expected, actual,
  CASE WHEN expected = actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM results
ORDER BY (expected = 'inside') DESC, loc;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1779900000000_seed-nl-compliance-zones-leiden', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.pgmigrations
  WHERE name = '1779900000000_seed-nl-compliance-zones-leiden'
);

COMMIT;

\echo ''
\echo '=== Seed migration COMMITTED ==='
