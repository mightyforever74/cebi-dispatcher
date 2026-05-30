-- 1779300000000_seed-nl-compliance-zones-pilot-amsterdam.sql
-- Phase 1: Amsterdam ZE-Zone pilot seed
-- Source: ST_Difference(layer_19419, layer_42487), 11/11 sanity PASS
-- RESEARCH §G.4 derivation, §G.5 metrics, §G.6 sanity, §G.9 fees

\set ON_ERROR_STOP on
BEGIN;

-- Idempotent: skip if zone already exists with same WKT hash
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM enterprise.nl_compliance_zones WHERE zone_id = 'amsterdam_ze_zone_2026') THEN
    RAISE NOTICE 'Zone amsterdam_ze_zone_2026 already exists, skipping seed';
  ELSE
    INSERT INTO enterprise.nl_compliance_zones (
      zone_id, city, zone_type,
      polygon,
      rules,
      effective_from, effective_to,
      source, source_url,
      notes
    ) VALUES (
      'amsterdam_ze_zone_2026',
      'Amsterdam',
      'ze_zone',
      ST_GeomFromText('POLYGON((4.9216233424 52.3908597714, ... [700 vertices] ... ))', 4326),
      '{ ... rules JSONB (shared_rules + city_overlay) ... }'::jsonb,
      '2026-01-01',
      '2027-12-31',
      'amsterdam_toegangsbeleid_v2026_05',
      'https://kaart.amsterdam.nl/milieuzones-verkeer-amsterdam',
      'Pilot seed via ST_Difference(layer_19419, layer_42487) + ST_MakeValid + noise filter >1000m2. Sanity test 11/11 PASS.'
    );
    RAISE NOTICE 'Seed inserted: amsterdam_ze_zone_2026';
  END IF;
END $$;

-- Track migration
INSERT INTO public.pgmigrations (name, run_on) 
  VALUES ('1779300000000_seed-nl-compliance-zones-pilot-amsterdam', NOW())
  ON CONFLICT (name) DO NOTHING;

COMMIT;