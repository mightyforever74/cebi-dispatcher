-- ============================================================================
-- Migration: 1781900000000_add-dagontheffing-idempotency-index.sql
-- ============================================================================
-- Idempotency guard for the Ontheffing Engine consume endpoint (Adım 3).
--
-- Problem: POST /api/dispatcher/compliance/ontheffing/consume increments the
--   dagontheffing counter and inserts a vehicle_ontheffings row. An app-layer
--   guard cannot prevent a double-submit race (two dispatchers, or a double
--   click, confirming the same vehicle+zone+day) — both requests could pass the
--   "remaining > 0" check before either commits, wasting 2 of the 12 grants.
--
-- Solution: a DB-level partial unique index. A second insert for the same
--   (vehicle_id, zone_id, valid_from) where type='dagontheffing' raises a unique
--   violation (SQLSTATE 23505); the app catches it and returns 409 Conflict.
--   The counter is only incremented in the same transaction, so a rejected
--   insert means the counter is not (unfairly) incremented.
--
-- Scope: ONLY dagontheffing (daily, the budgeted 12/zone/year type). Langdurige
--   types (netcongestie, dierenambulance) are long-lived single grants and are
--   NOT covered by this constraint (a vehicle can hold one netcongestie grant
--   with a multi-year range; the partial WHERE excludes them).
--
-- Additive: index only, no data change, no column change. Idempotent (IF NOT EXISTS).
-- Prereq: 1781600000000_create-enterprise-nl-ontheffing-engine.sql applied.
-- Schema authority: tulipfleet-backend (ADR-0009 §4.5.1). Prod PostgreSQL, enterprise schema.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

\echo ''
\echo '=== BEFORE: existing indexes on nl_compliance_vehicle_ontheffings ==='
SELECT indexname FROM pg_indexes
WHERE schemaname='enterprise' AND tablename='nl_compliance_vehicle_ontheffings'
ORDER BY indexname;

-- Partial unique: one dagontheffing per vehicle+zone+day
CREATE UNIQUE INDEX IF NOT EXISTS uidx_vehicle_zone_date_dagontheffing
  ON enterprise.nl_compliance_vehicle_ontheffings (vehicle_id, zone_id, valid_from)
  WHERE ontheffing_type = 'dagontheffing';

COMMENT ON INDEX enterprise.uidx_vehicle_zone_date_dagontheffing IS
  'Idempotency guard: one dagontheffing grant per vehicle+zone+day. Double consume -> 23505 -> app returns 409. ADR-0012 §3.7, blueprint Adım 3.';

\echo ''
\echo '=== AFTER: index present (expect uidx_vehicle_zone_date_dagontheffing) ==='
SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname='enterprise' AND tablename='nl_compliance_vehicle_ontheffings'
  AND indexname='uidx_vehicle_zone_date_dagontheffing';

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1781900000000_add-dagontheffing-idempotency-index', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pgmigrations WHERE name='1781900000000_add-dagontheffing-idempotency-index');

COMMIT;
\echo ''
\echo '=== dagontheffing idempotency index COMMITTED ==='
