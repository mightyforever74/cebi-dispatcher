/**
 * KARGO UYUMU scorer — ACTIVE (FEAT-020 Phase 1.2, Katman A, 2026-10-12).
 *
 * Spec: docs/functions/FEAT-020-capacity-aware-delivery-promising.md §3 FN-1.
 *
 * Onayli karar (2026-10-12, Cem):
 *  - Binary gate: hacim/agirlik yetersizse VEYA hazmat sertifikasi yoksa
 *    arac tamamen elenir (eligible:false, value:0) — ceza puani degil.
 *  - Graceful degradation: aracta kapasite verisi (volume+weight) hic yoksa
 *    (Phase 1.1 kolonlari NULL, ya da enterprise-backend henuz bu kolonlari
 *    SELECT etmiyor — FN-3 acik madde) feature'i BLOKE ETMEZ: eligible:true,
 *    notr skor 1.0, durust memo. Hazmat gate bu fallback'ten BAGIMSIZ her
 *    zaman calisir — "veri yok" asla hazmat sertifikasizligini gizlemez.
 *  - Katman B (surucu canli kapasite bildirimi + configurable toggle) —
 *    backlog, bkz. spec §5. Bu dosya sadece Katman A'yi implemente eder.
 */

import { t } from "i18n";

import { ActiveScorer, ScoreDetail, ScoringTask, ScoringVehicleSnapshot } from "../types";

function hasStaticCapacityData(vehicle: ScoringVehicleSnapshot): boolean {
  const c = vehicle.cargoCapacity;
  if (!c) return false;
  return c.volumeM3 !== null || c.weightKg !== null;
}

function missingHazmatClasses(required: string[], certified: string[]): string[] {
  return required.filter((cls) => !certified.includes(cls));
}

export const cargoScorer: ActiveScorer = {
  id: "cargo",
  label: "Kargo",
  available: true,
  score: (vehicle: ScoringVehicleSnapshot, task: ScoringTask): ScoreDetail => {
    const required = task.constraints?.capacity_required;

    // Gorev kisitsiz -> her arac uygun.
    const noConstraint =
      !required ||
      ((required.volume_m3 === null || required.volume_m3 === undefined) &&
        (required.weight_kg === null || required.weight_kg === undefined) &&
        (!required.hazmat_classes || required.hazmat_classes.length === 0));
    if (noConstraint) {
      return { value: 1.0, memo: t("scorer.cargoNoConstraint"), eligible: true };
    }

    const certifiedClasses = vehicle.cargoCapacity?.hazmatCertifiedClasses ?? [];
    const requiredHazmat = required.hazmat_classes ?? [];

    // Hazmat gate — "veri yok" fallback'inden BAGIMSIZ, her zaman once calisir.
    if (requiredHazmat.length > 0) {
      const missing = missingHazmatClasses(requiredHazmat, certifiedClasses);
      if (missing.length > 0) {
        return {
          value: 0,
          memo: t("scorer.cargoHazmatMissing", { classes: missing.join(", ") }),
          eligible: false,
        };
      }
    }

    // Hacim/agirlik verisi yok -> graceful degradation fallback.
    if (!hasStaticCapacityData(vehicle)) {
      return {
        value: 1.0,
        memo: t("scorer.cargoNoCapacityData"),
        eligible: true,
      };
    }

    const cap = vehicle.cargoCapacity!;
    const volumeNeeded = required.volume_m3 ?? null;
    const weightNeeded = required.weight_kg ?? null;

    if (volumeNeeded !== null && cap.volumeM3 !== null && cap.volumeM3 < volumeNeeded) {
      return {
        value: 0,
        memo: t("scorer.cargoVolumeInsufficient", { available: cap.volumeM3, required: volumeNeeded }),
        eligible: false,
      };
    }
    if (weightNeeded !== null && cap.weightKg !== null && cap.weightKg < weightNeeded) {
      return {
        value: 0,
        memo: t("scorer.cargoWeightInsufficient", { available: cap.weightKg, required: weightNeeded }),
        eligible: false,
      };
    }

    // Sigiyor -> bos kapasite oranina gore skor (diger uygun araclar arasinda siralama icin).
    const volumeRatio =
      volumeNeeded !== null && cap.volumeM3 !== null && cap.volumeM3 > 0
        ? volumeNeeded / cap.volumeM3
        : 0;
    const weightRatio =
      weightNeeded !== null && cap.weightKg !== null && cap.weightKg > 0
        ? weightNeeded / cap.weightKg
        : 0;
    const usedRatio = Math.max(volumeRatio, weightRatio);
    const value = Math.max(0, Math.min(1, 1 - usedRatio));

    return {
      value,
      memo: t("scorer.cargoFits", { percent: Math.round(usedRatio * 100) }),
      eligible: true,
    };
  },
};
