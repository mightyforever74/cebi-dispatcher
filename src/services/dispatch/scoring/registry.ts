/**
 * Decision Support Engine — scorer registry (plugin chain).
 *
 * Yeni bir siralama kurali eklemek (or. FEAT-103 "bataryasi dolu olani yukari
 * tasi", FEAT-008 "otoyol vergisi az olani one cikar") = yeni scorer dosyasi
 * + asagidaki SCORERS dizisine tek satir. UI bu diziden otomatik beslenir:
 * available:true -> secilebilir filtre, available:false -> kilitli filtre + reason.
 */

import {
  RankedVehicle,
  RankingMode,
  ScoringTask,
  ScoringVehicleSnapshot,
  VehicleScorer,
} from "./types";
import { spatialScorer } from "./scorers/spatialScorer";
import { temporalScorer } from "./scorers/temporalScorer";
import { complianceScorer } from "./scorers/complianceScorer";
import { cargoScorer } from "./scorers/cargoScorer";

/** UI'daki filtre butonu sirasi = bu dizi sirasi. */
export const SCORERS: VehicleScorer[] = [
  spatialScorer,
  temporalScorer,
  complianceScorer,
  cargoScorer,
];

export function getScorer(mode: RankingMode): VehicleScorer | undefined {
  return SCORERS.find((s) => s.id === mode);
}

/**
 * Secili moda gore araclari skorlar ve azalan sirada dondurur.
 * Coklu task'ta arac skoru task skorlarinin ortalamasidir (bugunku formda
 * tek task var; ortalama, coklu task geldiginde davranisi degistirmez).
 * Inactive mode verilirse bos dizi doner — cagiran taraf zaten inactive
 * modda siralama uygulamamali (orijinal available_vehicles sirasi korunur).
 */
export function rankVehicles(
  mode: RankingMode,
  vehicles: ScoringVehicleSnapshot[],
  tasks: ScoringTask[]
): RankedVehicle[] {
  const scorer = getScorer(mode);
  if (!scorer || !scorer.available || tasks.length === 0) return [];

  const ranked: RankedVehicle[] = vehicles.map((vehicle) => {
    const details = tasks.map((task) => scorer.score(vehicle, task));
    const avg = details.reduce((sum, d) => sum + d.value, 0) / details.length;
    // Karar Notu: tek task'ta o task'in memo'su; coklu task'ta ilk memo +
    // kac task uzerinden ortalandigi.
    const memo =
      details.length === 1
        ? details[0].memo
        : `${details[0].memo} (skor ${details.length} task uzerinden ortalama)`;
    return { vehicleId: vehicle.id, detail: { value: avg, memo } };
  });

  ranked.sort((a, b) => b.detail.value - a.detail.value);
  return ranked;
}
