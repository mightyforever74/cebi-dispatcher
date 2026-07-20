/**
 * Decision Support Engine — scorer plugin sozlesmesi (Phase 1).
 *
 * TASARIM KURALI (onayli plan, 2026-07-20): her scorer "available" bayragi
 * tasir. Veri kaynagi gercek/canli olmayan scorer available:false doner ve
 * ASLA sahte skor uretmez (Graceful Degradation). UI inactive scorer'i kilitli
 * filtre olarak gosterir, reason metnini kullaniciya aynen yansitir.
 *
 * Gelecek moduller (FEAT-103 EV/sarj, FEAT-008 tir vergisi) bu arayuzu
 * implemente eden yeni bir dosya + registry'ye tek satir ekleme ile girer.
 */

export type RankingMode = "spatial" | "temporal" | "compliance" | "cargo";

export interface TaskPoint {
  lat: number;
  lng: number;
  address?: string;
}

/** Optimize poll sonucundaki draft task'in skorlama icin gereken kesiti. */
export interface ScoringTask {
  id: string;
  pickup: TaskPoint;
  dropoff: TaskPoint;
}

/**
 * Skorlanan aracin anlik goruntusu.
 * id = public.vehicles UUID (Kanban kolon id'si, useVehicles'tan).
 * Telemetri alanlari useVehicleStore'dan PLAKA eslemesiyle gelir
 * (store key'leri farkli oldugu icin id ile DEGIL plate ile eslesir —
 * useVehicleStore.resolveKey ile ayni mantik). Telemetri yoksa null kalir.
 */
export interface ScoringVehicleSnapshot {
  id: string;
  plate: string;
  latitude: number | null;
  longitude: number | null;
  speedKmh: number | null;
  movementStatus: string | null; // deriveStatus ciktisi: moving | idle | stopped
  lastUpdate: string | null;
}

export interface ScoreDetail {
  /** 0..1 normalize skor — yuksek = daha uygun, kolon siralamasi buna gore. */
  value: number;
  /** Akilli Karar Notu — kolon basligindaki Tooltip'te aynen gosterilir. */
  memo: string;
  /**
   * Phase 1.1 hazirligi: kargo/uyum verisi geldiginde "bu arac bu task'i
   * HIC alamaz" durumunu isaretlemek icin. Phase 1'de her zaman undefined —
   * pre-drag kolon pasiflestirme gorsellestirmesi bu alan dolana kadar
   * devreye ALINMAZ (uyduruk eligibility uretmemek icin).
   */
  eligible?: boolean;
}

interface ScorerBase {
  id: RankingMode;
  /** Filtre butonunda gorunen etiket. */
  label: string;
}

export interface ActiveScorer extends ScorerBase {
  available: true;
  /** Tek arac x tek task skoru. Coklu task'ta registry ortalama alir. */
  score: (vehicle: ScoringVehicleSnapshot, task: ScoringTask) => ScoreDetail;
}

export interface InactiveScorer extends ScorerBase {
  available: false;
  /** UI'da kullaniciya gosterilen durustluk metni. */
  reason: string;
}

export type VehicleScorer = ActiveScorer | InactiveScorer;

/** registry.rankVehicles ciktisi: skora gore azalan sirali. */
export interface RankedVehicle {
  vehicleId: string;
  detail: ScoreDetail;
}
