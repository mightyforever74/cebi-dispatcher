/**
 * REGULASYON (Compliance Priority) scorer — INACTIVE (Phase 1.1).
 *
 * Onayli karar (2026-07-20): nl_compliance_zones (enterprise semasi, 21 satir/
 * 20 sehir prod'da mevcut) verisini frontend'e aciga cikaran genel bir
 * endpoint henuz yok — FEAT-001 §7 Standalone API kurgusu geregi uyumluluk
 * katmani bagimsiz modul olarak gelecek. Veri akisi kurulana kadar bu scorer
 * available:false kalir ve UI'da kilitli filtre olarak gorunur. Sahte ZE-zone
 * karari URETILMEZ.
 */

import { InactiveScorer } from "../types";

export const complianceScorer: InactiveScorer = {
  id: "compliance",
  label: "Regulasyon",
  available: false,
  reason:
    "Vehicle capacity and compliance layers are scheduled for Phase 1.1 database migration. " +
    "ZE-zone (nl_compliance_zones) verisi frontend'e Standalone Compliance API uzerinden " +
    "aciga cikinca bu filtre aktiflesecek.",
};
