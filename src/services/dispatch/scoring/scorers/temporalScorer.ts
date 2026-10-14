/**
 * ZAMAN (Temporal Window) scorer — AKTIF.
 *
 * Iki katmanli davranis (Strateji 3, 2026-07-20):
 *
 * 1) TEMEL (kisit yoksa): "pickup'a en erken varmasi beklenen arac en uste".
 *    Sabit 60 km/h ortalama + kus ucusu mesafe ile tahmini ETA. Varsayim
 *    memo'da ACIKCA yazilir.
 *
 * 2) VRPTW PENCERESI (task.constraints.extended.time_window_end varsa):
 *    Tahmini varis teslim penceresi bitisine gore degerlendirilir:
 *      - Yetisiyorsa: skor korunur, memo pay (slack) suresini yazar.
 *      - Kaciriyorsa: skor 0.2 ile carpilir ve memo UYARI yazar.
 *
 * UX turu 04.08 (Cem R1): memo'lardan yol-haritasi cumleleri (HERE Matrix /
 * ADR-0014) cikarildi — UI yalnizca o anki gercegi soyler; gelecek notlari
 * dokumantasyonda yasar. Arayuz sozlesmesi (ScoreDetail) degismedi.
 */

import { t } from "i18n";

import { ActiveScorer, ScoreDetail, ScoringTask, ScoringVehicleSnapshot } from "../types";
import { frameAgeLabel, haversineKm } from "../geo";

const ASSUMED_AVG_SPEED_KMH = 60;
// 30 dk ETA'da temel skor ~0.5.
const HALF_SCORE_ETA_MIN = 30;
// Pencereyi kacirmanin feasibility cezasi (skor carpani).
const WINDOW_MISS_PENALTY = 0.2;

/** ISO zamana kadar kalan dakika; gecersiz/bos ise null. */
function minutesUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return (ms - Date.now()) / 60000;
}

function score(vehicle: ScoringVehicleSnapshot, task: ScoringTask): ScoreDetail {
  if (vehicle.latitude === null || vehicle.longitude === null) {
    return {
      value: 0,
      memo: t("scorer.temporalNoLocation", { plate: vehicle.plate }),
    };
  }

  const km = haversineKm(vehicle.latitude, vehicle.longitude, task.pickup.lat, task.pickup.lng);
  const etaMin = (km / ASSUMED_AVG_SPEED_KMH) * 60;
  const baseValue = 1 / (1 + etaMin / HALF_SCORE_ETA_MIN);
  const statusNote =
    vehicle.movementStatus === "moving"
      ? t("scorer.temporalMoving", { speed: Math.round(vehicle.speedKmh ?? 0) })
      : t("scorer.temporalStatus", { status: vehicle.movementStatus ?? t("scorer.statusUnknown") });

  const baseMemo = t("scorer.temporalBase", {
    plate: vehicle.plate,
    eta: Math.round(etaMin),
    km: km.toFixed(1),
    statusNote,
    lastSignal: frameAgeLabel(vehicle.lastUpdate),
  });

  const windowEnd = task.constraints?.extended.time_window_end ?? null;
  const minsToEnd = minutesUntil(windowEnd);

  // Pencere yoksa (ya da gecersizse): temel ETA siralamasi.
  if (minsToEnd === null) {
    return {
      value: baseValue,
      memo: t("scorer.temporalNoWindow", { base: baseMemo }),
    };
  }

  // Pencere var: yetisme feasibility'sine gore degerlendir.
  if (etaMin <= minsToEnd) {
    const slack = Math.round(minsToEnd - etaMin);
    return {
      value: baseValue,
      memo: t("scorer.temporalWindowMet", { base: baseMemo, slack }),
    };
  }

  const late = Math.round(etaMin - minsToEnd);
  return {
    value: baseValue * WINDOW_MISS_PENALTY,
    memo: t("scorer.temporalWindowMissed", { base: baseMemo, late }),
  };
}

export const temporalScorer: ActiveScorer = {
  id: "temporal",
  label: "Zaman",
  available: true,
  score,
};
