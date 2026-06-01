#!/usr/bin/env python3
"""Generate Eindhoven ZE-Zone seed migration SQL."""
import sys
from pathlib import Path

WKT_FILE = Path("/tmp/eindhoven_ze_zone.wkt")
OUTPUT = Path("/tmp/1779700000000_seed-nl-compliance-zones-eindhoven.sql")

if not WKT_FILE.exists():
    print(f"ERROR: {WKT_FILE} not found.")
    sys.exit(1)

wkt = WKT_FILE.read_text().strip()
wkt_bytes = WKT_FILE.stat().st_size

print(f"=== Generating Eindhoven migration ===")
print(f"WKT source: {WKT_FILE} ({wkt_bytes} bytes)")
print(f"Output:     {OUTPUT}")
print()

sql = f"""-- ============================================================================
-- Migration: 1779700000000_seed-nl-compliance-zones-eindhoven.sql
-- ============================================================================
-- Phase 1 Sira 2.9.9 - Eindhoven ZE-Zone seed
--
-- Source: Eindhoven Open Data portal (OpenDataSoft API)
--         Dataset: emissievrije-zone (FeatureCollection with 2 features)
--         Filtered: naam_zone = "Zero Emissiezone" (single Polygon)
--         + ST_MakeValid + ST_Multi (defensive)
--
-- Derivation verification (2026-06-01):
--   - gtype:         ST_Polygon (promoted to MultiPolygon for schema)
--   - parts:         1
--   - area_km2:      9.4491 ("binnen de Ring" - inside Eindhoven ring road)
--   - perimeter_km:  15.00
--   - vertices:      305
--   - is_valid:      true
--   - centroid:      (5.4773, 51.4390)
--   - sanity test:   11/11 PASS (Stadhuis, Eindhoven CS, Philips Museum,
--                                Piazza Center, Stratumseind inside; Airport,
--                                High Tech Campus, Veldhoven, Helmond, Best,
--                                Geldrop outside)
--   - wkt_bytes:     11015
--
-- Regulation: RVV 1990 + CVDR721321 (Eindhoven verkeersbesluit)
-- Source: gmb-2024-241606 (officielebekendmakingen.nl)
-- Fees:       RDW Centraal Loket harmonized (opwegnaarzes.nl 2026 convenant)
-- Effective:  2025-01-01 to 2027-12-31 (active since 2025-01-01)
-- Future:     2030 binnen de Ring fully emission-free; 2038 entire city
-- Prereq:     1779350000000_alter-nl-compliance-zones-multipolygon applied
-- ============================================================================

\\set ON_ERROR_STOP on

BEGIN;

INSERT INTO enterprise.nl_compliance_zones (
  zone_id, city, zone_type, polygon, rules,
  effective_from, effective_to, source, source_url, notes
)
SELECT
  'eindhoven_ze_zone_2025',
  'Eindhoven',
  'ze_zone',
  ST_Multi(ST_MakeValid(ST_GeomFromText('{wkt}', 4326)))::geometry(MultiPolygon, 4326),
  jsonb_build_object(
    'shared_rules', jsonb_build_object(
      'regulation_basis', 'RVV 1990 + Verkeersbesluit per gemeente',
      'vehicle_classes', jsonb_build_object(
        'bedrijfsauto', 'N1/N2 (bestelauto + lichte vrachtauto)',
        'vrachtauto',   'N2/N3 (vrachtauto + trekker)'
