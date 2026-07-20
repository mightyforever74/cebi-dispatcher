/**
 * MEKAN (Spatial Matrix) scorer — AKTIF.
 *
 * Veri kaynagi: useVehicleStore canli telemetrisi (REST snapshot Sira 4.3 +
 * MQTT Sira 4.2, her ikisi applyLocationFrame uzerinden). Task pickup
 * koordinati HERE Discover secimiyle (LocationSearchInput) geldigi icin
 * her zaman gercek lat/lng'dir.
 *
 * DURUSTLUK NOTU: mesafe su an KUS UCUSU (haversine). HERE Matrix Routing
 * (ADR-0014) frontend'e baglandiginda gercek surus mesafesine gecilecek;
 * memo bunu kullaniciya acikca soyler. Telemetrisi olmayan arac 0 skor alir
 * ve memo'da nedeni yazar — sahte konum uretilmez.
 */

import { ActiveScorer, ScoreDetail, ScoringTask, ScoringVehicleSnapshot } from "../types";
import { frameAgeLabel, haversineKm } from "../geo";

// 25 km'de skor ~0.5 olacak sekilde yumusak azalan egri.
const HALF_SCORE_KM = 25;

function score(vehicle: ScoringVehicleSnapshot, task: ScoringTask): ScoreDetail {
  if (vehicle.latitude === null || vehicle.longitude === null) {
    return {
      value: 0,
      memo: `${vehicle.plate}: canli konum verisi yok — arac telemetri akisinda gorunmuyor, mesafe hesaplanamadi.`,
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
    memo:
      `${vehicle.plate}: pickup noktasina ${km.toFixed(1)} km (kus ucusu, canli telemetri — ` +
      `son sinyal ${frameAgeLabel(vehicle.lastUpdate)}). ` +
      `HERE Matrix Routing (ADR-0014) devreye girince gercek surus mesafesi kullanilacak.`,
  };
}

export const spatialScorer: ActiveScorer = {
  id: "spatial",
  label: "Mekan",
  available: true,
  score,
};
