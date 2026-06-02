-- ============================================================================
-- Migration: 1781400000000_recon-denhaag-drop-stale-union.sql
-- ============================================================================
-- Reconciliation B HOTFIX - remove stale Den Haag union row.
--
-- WHY: 1781300000000_recon-denhaag-split.sql intended to DELETE the old union
--      row, but targeted a guessed zone_id ('denhaag_ze_zone_2025'). The actual
--      id was 'den_haag_ze_zone_2026' (verified from BEFORE output: DELETE 0).
--      Result: split rows were inserted but the old 35.11km2 union remained,
--      leaving 3 rows for Den Haag and inflating total area by 35.11km2.
--
-- ACTION: DELETE the now-confirmed stale id 'den_haag_ze_zone_2026'.
--         Keeps denhaag_centrum_ze_zone_2025 (7.43) + denhaag_kust_ze_zone_2026 (41.26).
--
-- Backup: pre_recon_denhaag_PROD_*.sql.gz already taken before split migration.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

\echo ''
\echo '=== BEFORE fix: Den Haag rows (expect 3: stale union + centrum + kust) ==='
SELECT zone_id, ROUND((ABS(ST_Area(polygon::geography))/1e6)::numeric,4) AS km2,
       ST_NumGeometries(polygon) AS parts, effective_from
FROM enterprise.nl_compliance_zones WHERE city='Den Haag' ORDER BY effective_from, zone_id;

DELETE FROM enterprise.nl_compliance_zones WHERE zone_id = 'den_haag_ze_zone_2026';

\echo ''
\echo '=== AFTER fix: Den Haag rows (expect 2: centrum 7.43 + kust 41.26) ==='
SELECT zone_id, ST_GeometryType(polygon) AS gtype, ST_NumGeometries(polygon) AS parts,
       ROUND((ABS(ST_Area(polygon::geography))/1e6)::numeric,4) AS km2,
       ST_IsValid(polygon) AS valid, effective_from, effective_to
FROM enterprise.nl_compliance_zones WHERE city='Den Haag' ORDER BY effective_from, zone_id;

\echo ''
\echo '=== Global totals (expect satir=21, sehir=20, km2~148.2) ==='
SELECT count(*) AS satir, count(DISTINCT city) AS sehir,
       ROUND(SUM(ABS(ST_Area(polygon::geography))/1e6)::numeric,1) AS toplam_km2
FROM enterprise.nl_compliance_zones;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1781400000000_recon-denhaag-drop-stale-union', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pgmigrations WHERE name='1781400000000_recon-denhaag-drop-stale-union');

COMMIT;
\echo ''
\echo '=== Den Haag stale union dropped - COMMITTED ==='
