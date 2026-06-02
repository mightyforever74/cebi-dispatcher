-- ============================================================================
-- Migration: 1781700000000_alter-vehicles-compliance-columns.sql
-- ============================================================================
-- Additive NL ZE-Zone compliance columns on public.vehicles.
--
-- Context: ADR-0012 §3.7 scope note — public.vehicles lacked the attributes needed
--   to evaluate whether a vehicle *needs* a ZE-Zone exemption. checkCompliance
--   (CVDR752146/1) requires emission class, exact first-registration date (DET),
--   and bodywork code for auto-recognized national exemptions.
--
-- Additive policy (ADR-0004 v3 §6.4, FEAT-001 §6.2): all new columns NULLABLE,
--   no default, no backfill — existing rows untouched, read as "unknown" until
--   data entered.
--
-- Columns:
--   1. emission_class (varchar 20) — Euro class / zero-emission. fuel_type alone is
--      insufficient (Diesel may be Euro 5 [access ends 2027] or Euro 6 [2029/2030]).
--      DB-layer CHECK stabilizes values (closed legal set; Euro 7 included proactively
--      for 2025+ registrations). NULL allowed (unknown).
--   2. date_first_admission (date) — DET (Datum Eerste Toelating). NL rules key off
--      DET not model year: e.g. Euro 6 bestelauto DET<2025-01-01 -> rights to 2029;
--      DET>=2025-01-01 fossil/hybrid blocked. Also drives 40yr Oldtimer exemption.
--      Existing `year` (int) lacks day/month precision for cutoffs like 2025-01-01.
--   3. carrosserie_code (varchar 10) — RDW bodywork code for auto-recognized national
--      exemptions (kentekenherkenning, no application): bestelauto 'SH' (wheelchair);
--      vrachtauto 15/16/19/23/26/27/31 + special goals 'SB','SF'.
--
-- status values verified 2026-06-02: 'available', 'in_use' (partial index target).
-- Schema authority: tulipfleet-backend (ADR-0009 §4.5.1). Prod PostgreSQL, public schema.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

\echo ''
\echo '=== BEFORE: vehicles column count ==='
SELECT count(*) AS column_count
FROM information_schema.columns
WHERE table_schema='public' AND table_name='vehicles';

-- Additive nullable columns (no default, no backfill)
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS emission_class       character varying(20),
  ADD COLUMN IF NOT EXISTS date_first_admission date,
  ADD COLUMN IF NOT EXISTS carrosserie_code     character varying(10);

-- Enterprise documentation comments (NL legal bridge)
COMMENT ON COLUMN public.vehicles.emission_class IS
  'Euro emisyon sınıfı standardı (Örn: euro_5, euro_6, zero_emission). NL ZE-Zone checkCompliance için. App-layer + DB CHECK ile stabilize. ADR-0012 §3.7.';
COMMENT ON COLUMN public.vehicles.date_first_admission IS
  'Datum Eerste Toelating (DET) - Aracın kesin ilk tescil/kabul tarihi. Yasal geçiş muafiyet hakları takvimi + 40yıl Oldtimer muafiyeti için kritik. ADR-0012 §3.7.';
COMMENT ON COLUMN public.vehicles.carrosserie_code IS
  'RDW karoser üst yapı kodu (Örn: SH, 15, 16, SB, SF). Otomatik ulusal istisnaların tespiti için. ADR-0012 §3.7.';

-- CHECK constraint: closed legal set of emission classes (NULL allowed = unknown)
-- euro_7 included proactively (EU Euro 7 phase-in for 2025+ registrations)
ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_emission_class_check
  CHECK (emission_class IS NULL OR emission_class IN (
    'euro_0','euro_1','euro_2','euro_3','euro_4','euro_5','euro_6','euro_vi','euro_7','zero_emission'
  ));

-- Partial index: speeds NL compliance planning queries over active fleet only
-- status values verified: 'available', 'in_use'
CREATE INDEX IF NOT EXISTS idx_vehicles_nl_compliance_profile
  ON public.vehicles (emission_class, date_first_admission)
  WHERE status IN ('available', 'in_use');

\echo ''
\echo '=== AFTER: new columns (expect 3, nullable, no default) ==='
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='vehicles'
  AND column_name IN ('emission_class','date_first_admission','carrosserie_code')
ORDER BY column_name;

\echo ''
\echo '=== Constraint + index check ==='
SELECT conname AS constraint FROM pg_constraint
WHERE conrelid='public.vehicles'::regclass AND conname='vehicles_emission_class_check';
SELECT indexname FROM pg_indexes
WHERE schemaname='public' AND tablename='vehicles' AND indexname='idx_vehicles_nl_compliance_profile';

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1781700000000_alter-vehicles-compliance-columns', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pgmigrations WHERE name='1781700000000_alter-vehicles-compliance-columns');

COMMIT;
\echo ''
\echo '=== vehicles compliance columns COMMITTED ==='
