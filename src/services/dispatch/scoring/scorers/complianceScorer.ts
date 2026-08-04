/**
 * REGULASYON (Compliance Priority) scorer — AKTIF (04.08.2026,
 * "Regulasyon Scorer'in Uyanisi", Cem onayli skor matrisi).
 *
 * Veri kaynagi: POST /api/compliance/assess (enterprise `63d621a`) —
 * ST_Contains zone cozumu + checkCompliance + dagontheffing sayaci +
 * calculateHeffing. Sayfa katmani (useComplianceAssessment) sonucu
 * ScoringVehicleSnapshot.compliance alanina besler; scorer SENKRON kalir.
 * Veri gelmemisse 0.5 + durust memo — sahte ZE-zone karari URETILMEZ
 * (Graceful Degradation ilkesi aynen korunur).
 */

import { ActiveScorer, ScoreDetail } from "../types";

/** Cem onayli skor matrisi (04.08). */
const STATUS_SCORE: Record<string, number> = {
  compliant: 1.0,
  exempt_auto: 0.9,
  exempt_granted: 0.9,
  no_zone: 0.7,
  needs_exemption: 0.4,
  unknown: 0.3,
  blocked: 0.05,
};

export const complianceScorer: ActiveScorer = {
  id: "compliance",
  label: "Regulasyon",
  available: true,
  score: (vehicle): ScoreDetail => {
    const c = vehicle.compliance;
    if (!c) {
      return {
        value: 0.5,
        memo:
          "Regulasyon verisi yok/yuklenemedi — siralama notr (0.5). " +
          "Sahte ZE-zone karari uretilmez.",
      };
    }
    const value = STATUS_SCORE[c.status] ?? 0.3;
    const parts: string[] = [c.reason];
    if (c.needs_dagontheffing && c.dagontheffing) {
      parts.push(
        `Dagontheffing kalan ${c.dagontheffing.remaining}/${c.dagontheffing.limit} (${c.dagontheffing.year})`
      );
    }
    if (c.heffing && c.heffing.matched) {
      parts.push(
        `Heffing ~€${c.heffing.total_charge.toFixed(2)} (${c.heffing.rate_per_km.toFixed(3)} €/km)`
      );
    }
    return { value, memo: parts.join(" · ") };
  },
};
