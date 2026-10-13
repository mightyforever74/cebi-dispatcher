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

import { StrictTaskConstraints } from "types/metadata";

export type RankingMode = "spatial" | "temporal" | "compliance" | "cargo";

export interface TaskPoint {
  lat: number;
  lng: number;
  address?: string;
}

/**
 * Optimize poll sonucundaki draft task'in skorlama icin gereken kesiti.
 *
 * constraints (2026-07-20, Strateji 3): formun urettigi birlesik kisit
 * kontrati. Grup A (kapasite/skills) + Grup B (yon/tip/zaman penceresi) tek
 * yerden gelir. Mock solver bu veriyi poll sonucunda DONMEDIGI icin
 * (id + konum ceker, kanitli), deger FRONTEND-STATE'ten baglanir; scorer
 * bunu poll sonucundan degil buradan okur. undefined ise kisit bilgisi yok
 * demektir — scorer o durumda kisitsiz (eski) davranisina duser.
 */
export interface ScoringTask {
  id: string;
  pickup: TaskPoint;
  dropoff: TaskPoint;
  constraints?: StrictTaskConstraints;
}

/**
 * Skorlanan aracin anlik goruntusu.
 * id = public.vehicles UUID (Kanban kolon id'si, useVehicles'tan).
 * Telemetri alanlari REST snapshot'tan (useDispatchLocationSnapshot)
 * vehicle_id (UUID) ile BIREBIR eslesir. Telemetri yoksa null kalir.
 */
/**
 * Regulasyon scorer'in bekledigi assess satiri — POST /api/compliance/assess
 * (enterprise 63d621a) yanit sozlesmesi birebir. Sayfa katmani doldurur.
 */
export interface ComplianceAssessRow {
  status: string; // compliant | exempt_auto | exempt_granted | needs_exemption | blocked | unknown | no_zone
  reason: string;
  needs_dagontheffing?: boolean;
  dagontheffing?: { used: number; limit: number; remaining: number; year: number };
  heffing?: { rate_per_km: number; total_charge: number; matched: boolean };
}

/**
 * FEAT-020 Phase 1.1/1.2 (2026-10-12): public.vehicles'taki statik kargo
 * kapasite kolonlarinin (migration 1783400000000) snapshot kesiti.
 * undefined = alan hic gelmedi (enterprise-backend /api/dispatcher/vehicles
 * route'u bu kolonlari henuz SELECT etmiyor — FEAT-020 spec FN-3, acik madde);
 * null alanlar = arac kaydinda veri girilmemis. Ikisi de cargoScorer'da ayni
 * "veri yok" fallback'ine duser (eligible:true, notr) — hazmat gate HARIC.
 */
export interface VehicleCargoCapacity {
  volumeM3: number | null;
  weightKg: number | null;
  hazmatCertifiedClasses: string[];
}

export interface ScoringVehicleSnapshot {
  id: string;
  plate: string;
  latitude: number | null;
  longitude: number | null;
  speedKmh: number | null;
  movementStatus: string | null; // deriveStatus ciktisi: moving | idle | stopped
  lastUpdate: string | null;
  /**
   * Regulasyon Scorer'in Uyanisi (04.08): assess sonucu. undefined/null =
   * veri yok — scorer 0.5 notr + durust memo doner, sahte karar uretmez.
   */
  compliance?: ComplianceAssessRow | null;
  /** FEAT-020 Phase 1.2 — bkz. VehicleCargoCapacity yorumu. */
  cargoCapacity?: VehicleCargoCapacity | null;
}

export interface ScoreDetail {
  /** 0..1 normalize skor — yuksek = daha uygun, kolon siralamasi buna gore. */
  value: number;
  /** Akilli Karar Notu — kolon basligindaki Popover'da aynen gosterilir. */
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
