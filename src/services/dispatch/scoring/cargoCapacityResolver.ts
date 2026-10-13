/**
 * cargoCapacityResolver.ts — FEAT-020 Phase 1.3b (Katman C, dispatcher
 * dilimi, 2026-10-13, Cem onayli). Spec §6.
 *
 * Tek bir arac satirindan (enterprise-backend /api/dispatcher/vehicles,
 * FN-3 kapandi — statik + canli kapasite kolonlari artik SELECT ediliyor)
 * cargoScorer'a beslenecek VehicleCargoCapacity'yi uretir. Kaynak secimi
 * (statik mi canli mi) burada, scorer DEGISMEDEN (cargoScorer.ts hangi
 * kaynaktan geldigini bilmiyor/bilmemeli — Katman A'nin kontrati sabit).
 *
 * Kural (Cem onayli, "tek veritabani/ayni satir" ilkesi + spec §6):
 *  - cargo_capacity_tracking === 'off' -> canli veri HER ZAMAN yok sayilir.
 *  - Diger durumlarda (required/optional/alan hic gelmemis — fail-open)
 *    surucu en az bir kez rapor etmisse (live_cargo_reported_at set)
 *    canli veri statigin TAMAMEN ONUNE gecer (karma kaynak yok — canli
 *    rapor geldiyse volumeM3/weightKg ikisi de canliden, partial report'ta
 *    bos alan null kalir, statikten KARISTIRILMAZ).
 *  - hazmat_certified_classes HER ZAMAN statikten gelir — surucu canli
 *    olarak sertifika bildirmiyor.
 *  - Hic statik hic canli veri yoksa -> undefined (Katman A'nin graceful
 *    degradation fallback'i degismedi).
 */
import { VehicleCargoCapacity } from "./types";

export interface VehicleCargoRow {
  cargo_capacity_volume_m3?: number | null;
  cargo_capacity_weight_kg?: number | null;
  hazmat_certified_classes?: string[] | null;
  live_cargo_volume_m3?: number | null;
  live_cargo_weight_kg?: number | null;
  live_cargo_reported_at?: string | null;
  cargo_capacity_tracking?: "required" | "optional" | "off" | null;
}

export function resolveCargoCapacity(row: VehicleCargoRow): VehicleCargoCapacity | undefined {
  const hasStatic =
    row.cargo_capacity_volume_m3 !== undefined ||
    row.cargo_capacity_weight_kg !== undefined ||
    row.hazmat_certified_classes !== undefined;

  const trackingOff = row.cargo_capacity_tracking === "off";
  const hasLiveReport = !trackingOff && row.live_cargo_reported_at !== undefined && row.live_cargo_reported_at !== null;

  const hazmatCertifiedClasses = row.hazmat_certified_classes ?? [];

  if (hasLiveReport) {
    return {
      volumeM3: row.live_cargo_volume_m3 ?? null,
      weightKg: row.live_cargo_weight_kg ?? null,
      hazmatCertifiedClasses,
    };
  }

  if (!hasStatic) {
    return undefined;
  }

  return {
    volumeM3: row.cargo_capacity_volume_m3 ?? null,
    weightKg: row.cargo_capacity_weight_kg ?? null,
    hazmatCertifiedClasses,
  };
}
