/**
 * ZAMAN (Temporal Window) scorer — AKTIF (tahmini ETA seviyesinde).
 *
 * Phase 1 gercegi (durustluk): optimize draft task'inda scheduled_start/end
 * alani YOK (form toplamiyor, poll sonucu icermiyor — useTaskOptimization.ts
 * OptimizeResultTask'tan kanitli). Bu yuzden "yasal suruc/mola penceresine
 * yetisme" analizi HENUZ yapilamaz. Bugun yapilabilen en durust siralama:
 * "pickup'a en erken varmasi beklenen arac en uste" — sabit 60 km/h ortalama
 * hiz varsayimiyla kus ucusu ETA. Varsayim memo'da kullaniciya ACIKCA yazilir.
 *
 * scheduled_start draft'a girdiginde ve HERE Matrix (ADR-0014) baglandiginda
 * bu scorer gercek surus suresi + yasal pencere kontrolune yukseltilecek —
 * arayuz sozlesmesi (ScoreDetail) degismeden.
 */

import { ActiveScorer, ScoreDetail, ScoringTask, ScoringVehicleSnapshot } from "../types";
import { frameAgeLabel, haversineKm } from "../geo";

const ASSUMED_AVG_SPEED_KMH = 60;
// 30 dk ETA'da skor ~0.5.
const HALF_SCORE_ETA_MIN = 30;

function score(vehicle: ScoringVehicleSnapshot, task: ScoringTask): ScoreDetail {
  if (vehicle.latitude === null || vehicle.longitude === null) {
    return {
      value: 0,
      memo: `${vehicle.plate}: canli konum verisi yok — ETA hesaplanamadi.`,
    };
  }

  const km = haversineKm(
    vehicle.latitude,
    vehicle.longitude,
    task.pickup.lat,
    task.pickup.lng
  );
  const etaMin = (km / ASSUMED_AVG_SPEED_KMH) * 60;
  const statusNote =
    vehicle.movementStatus === "moving"
      ? `su an hareket halinde (${Math.round(vehicle.speedKmh ?? 0)} km/h)`
      : `su an ${vehicle.movementStatus ?? "durum bilinmiyor"}`;

  return {
    value: 1 / (1 + etaMin / HALF_SCORE_ETA_MIN),
    memo:
      `${vehicle.plate}: pickup'a tahmini ${Math.round(etaMin)} dk ` +
      `(${ASSUMED_AVG_SPEED_KMH} km/h ortalama varsayimi, kus ucusu ${km.toFixed(1)} km; ` +
      `${statusNote}, son sinyal ${frameAgeLabel(vehicle.lastUpdate)}). ` +
      `Gercek surus suresi + yasal suruc/mola penceresi analizi, HERE Matrix (ADR-0014) ` +
      `ve task zamanlama alanlari draft akisina eklendiginde devreye girecek.`,
  };
}

export const temporalScorer: ActiveScorer = {
  id: "temporal",
  label: "Zaman",
  available: true,
  score,
};
