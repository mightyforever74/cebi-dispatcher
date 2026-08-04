/**
 * MEKAN (Spatial Matrix) scorer — AKTIF.
 *
 * Veri kaynagi: useVehicleStore canli telemetrisi (REST snapshot Sira 4.3 +
 * MQTT Sira 4.2, her ikisi applyLocationFrame uzerinden). Task pickup
 * koordinati HERE Discover secimiyle (LocationSearchInput) geldigi icin
 * her zaman gercek lat/lng'dir.
 *
 * DURUSTLUK NOTU: mesafe su an KUS UCUSU (haversine); memo yalnizca bu
 * gercegi soyler. Yol haritasi notlari (HERE Matrix / ADR-0014) UI'in degil
 * dokumantasyonun isidir (UX turu 04.08, Cem R1 karari). Telemetrisi olmayan
 * arac 0 skor alir ve memo'da nedeni yazar — sahte konum uretilmez.
 */

import { ActiveScorer, ScoreDetail, ScoringTask, ScoringVehicleSnapshot } from "../types";
import { frameAgeLabel, haversineKm } from "../geo";

// 25 km'de skor ~0.5 olacak sekilde yumusak azalan egri.
const HALF_SCORE_KM = 25;

function score(vehicle: ScoringVehicleSnapshot, task: ScoringTask): ScoreDetail {
  if (vehicle.latitude === null || vehicle.longitude === null) {
    return {
      value: 0,
      memo: `${vehicle.plate}: 📡 Canli konum verisi yok — mesafe hesaplanamadi.`,
    };
  }

  const km = haversineKm(
    vehicle.latitude,
    vehicle.longitude,
    task.pickup.lat,
    task.pickup.lng
  );

  return {
    value: 1 / (1 + km / HALF_SCORE_KM),
    memo: `${vehicle.plate}: 📍 Kus ucusu ${km.toFixed(1)} km · 📡 Son sinyal ${frameAgeLabel(vehicle.lastUpdate)}`,
  };
}

export const spatialScorer: ActiveScorer = {
  id: "spatial",
  label: "Mekan",
  available: true,
  score,
};
