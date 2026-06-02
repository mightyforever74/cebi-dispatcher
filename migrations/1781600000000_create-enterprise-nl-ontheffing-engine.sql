-- ============================================================================
-- Migration: 1781600000000_create-enterprise-nl-ontheffing-engine.sql
-- ============================================================================
-- Ontheffing Engine (work item B) — dynamic exemption tracking for NL ZE-Zones.
--
-- Context: enterprise.nl_compliance_zones is a STATIC reference table (polygons +
--   rules). It cannot track dynamic exemption state. This migration adds the two
--   transactional tables scoped in ADR-0012 §3.6 (2026-06-02 findings).
--
-- Design decisions (ADR-0012 §3.7 addendum):
--   1. Counter depletion = HYBRID / advisory (ADR-0005 Mode 1): system proposes,
--      dispatcher confirms; on confirm used_count++. No automatic depletion.
--   2. Ontheffing types modelled (Phase 1): dagontheffing + langdurige
--      (netcongestie 2yr, dierenambulance). National cross-zone recognition
--      (Art 17 RVV) deferred to Phase 2.
--   3. Counter granularity = company × zone_id × year. LEGAL BASIS: CVDR752146/1
--      Art 11 (bedrijfsauto) + Art 12 (vrachtauto) define the 12/year limit at the
--      kentekenhouder (vehicle owner / company) + municipality level, NOT per
--      vehicle. zone_id is city-level; a future zone expansion (e.g. Amsterdam
--      S100→A10 in 2028) closes the old zone_id (effective_to) and opens a new
--      zone_id, granting a fresh 12 — which this schema handles naturally.
--
-- Verified NL legal facts (2026-06-02):
--   - dagontheffing: 12 per zone per year (CVDR752146/1 Art 11+12, nationally
--     harmonized across the 20 zones)
--   - netcongestie ontheffing: 2 years, extendable (Art 9, new 2026)
--   - dierenambulance ontheffing (Art 10, new 2026)
--
-- Schema authority: tulipfleet-backend migrations (ADR-0009 §4.5.1). Runs on prod
--   PostgreSQL (fleet_tracking, enterprise.* schema). Read by enterprise-backend
--   via enterprise_backend role; in Phase 3 by compliance_backend role.
--
-- FK targets verified 2026-06-02:
--   public.companies.id = uuid, public.vehicles.id = uuid,
--   enterprise.nl_compliance_zones PK = zone_id (text)
-- Prereq: 1779200000000_create-enterprise-nl-compliance-zones applied.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ---------------------------------------------------------------------------
-- ENUM: ontheffing type (Phase 1 set; extensible later via ALTER TYPE ... ADD VALUE)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                 WHERE t.typname='nl_ontheffing_type' AND n.nspname='enterprise') THEN
    CREATE TYPE enterprise.nl_ontheffing_type AS ENUM (
      'dagontheffing',     -- daily exemption (counts against the 12/zone/year limit)
      'netcongestie',      -- grid-congestion long-term exemption (2yr, Art 9 2026)
      'dierenambulance'    -- animal-ambulance exemption (Art 10 2026)
    );
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- TABLE 1: vehicle ontheffing grants
--   One row per granted exemption. Langdurige (netcongestie/dierenambulance)
--   carry valid_from/valid_to (e.g. netcongestie = valid_from + 2yr). A single
--   dagontheffing day is also representable here (valid_from = valid_to = that day)
--   but day-count budgeting lives in TABLE 2.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enterprise.nl_compliance_vehicle_ontheffings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vehicle_id      uuid NOT NULL REFERENCES public.vehicles(id)  ON DELETE CASCADE,
  zone_id         text NOT NULL REFERENCES enterprise.nl_compliance_zones(zone_id) ON DELETE RESTRICT,
  ontheffing_type enterprise.nl_ontheffing_type NOT NULL,
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','expired','revoked','pending')),
  valid_from      date NOT NULL,
  valid_to        date NOT NULL,
  -- provenance / audit
  reference       text,            -- e.g. municipal ontheffing application id / RDW ref
  source          text,            -- 'manual' | 'rdw_blend' | 'municipal_portal' | ...
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_range_ok CHECK (valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_veh_onth_company  ON enterprise.nl_compliance_vehicle_ontheffings (company_id);
CREATE INDEX IF NOT EXISTS idx_veh_onth_vehicle  ON enterprise.nl_compliance_vehicle_ontheffings (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_veh_onth_zone     ON enterprise.nl_compliance_vehicle_ontheffings (zone_id);
-- fast "is this vehicle exempt in this zone right now?" lookup
CREATE INDEX IF NOT EXISTS idx_veh_onth_active_lookup
  ON enterprise.nl_compliance_vehicle_ontheffings (vehicle_id, zone_id, valid_from, valid_to)
  WHERE status = 'active';

COMMENT ON TABLE enterprise.nl_compliance_vehicle_ontheffings IS
  'Per-vehicle ZE-Zone exemption grants (dagontheffing / netcongestie / dierenambulance). ADR-0012 §3.7.';

-- ---------------------------------------------------------------------------
-- TABLE 2: dagontheffing counters (the 12/zone/year budget)
--   Granularity = company × zone_id × year (legal basis: kentekenhouder-level,
--   CVDR752146/1 Art 11+12). used_count incremented ONLY on dispatcher confirm
--   (hybrid/advisory, ADR-0005 Mode 1). annual_limit defaults 12 but is stored
--   per-row so a future municipal change to the limit is representable without
--   code change.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enterprise.nl_dagontheffing_counters (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  zone_id       text NOT NULL REFERENCES enterprise.nl_compliance_zones(zone_id) ON DELETE RESTRICT,
  year          integer NOT NULL CHECK (year BETWEEN 2024 AND 2100),
  used_count    integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  annual_limit  integer NOT NULL DEFAULT 12 CHECK (annual_limit > 0),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_company_zone_year UNIQUE (company_id, zone_id, year),
  CONSTRAINT used_within_limit CHECK (used_count <= annual_limit)
);

CREATE INDEX IF NOT EXISTS idx_dag_counter_company ON enterprise.nl_dagontheffing_counters (company_id);
CREATE INDEX IF NOT EXISTS idx_dag_counter_zone    ON enterprise.nl_dagontheffing_counters (zone_id);

COMMENT ON TABLE enterprise.nl_dagontheffing_counters IS
  'Per company × zone × year dagontheffing budget (default 12, CVDR752146/1 Art 11+12). Depleted on dispatcher confirm (ADR-0005 Mode 1). ADR-0012 §3.7.';

-- ---------------------------------------------------------------------------
-- Verification output
-- ---------------------------------------------------------------------------
\echo ''
\echo '=== Created tables ==='
SELECT table_name FROM information_schema.tables
WHERE table_schema='enterprise'
  AND table_name IN ('nl_compliance_vehicle_ontheffings','nl_dagontheffing_counters')
ORDER BY table_name;

\echo ''
\echo '=== ENUM values ==='
SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
WHERE t.typname='nl_ontheffing_type' ORDER BY e.enumsortorder;

\echo ''
\echo '=== FK constraints check ==='
SELECT conrelid::regclass AS tbl, conname, confrelid::regclass AS references
FROM pg_constraint
WHERE conrelid IN ('enterprise.nl_compliance_vehicle_ontheffings'::regclass,
                   'enterprise.nl_dagontheffing_counters'::regclass)
  AND contype='f'
ORDER BY tbl, conname;

INSERT INTO public.pgmigrations (name, run_on)
SELECT '1781600000000_create-enterprise-nl-ontheffing-engine', NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.pgmigrations WHERE name='1781600000000_create-enterprise-nl-ontheffing-engine');

COMMIT;
\echo ''
\echo '=== Ontheffing Engine schema COMMITTED ==='
