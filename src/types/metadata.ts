/**
 * StrictTaskConstraints — form <-> scorer arasi TEK gercek (Strateji 3).
 *
 * ONAYLI KARAR (2026-07-20): Grup A alanlari (kapasite + skills) backend'de
 * GERCEK kolonu oldugu icin bugun DB'ye muhurlenir:
 *   - capacity_required -> enterprise.dispatch_tasks.capacity_required (jsonb).
 *     Backend routes/tasks.js taskItem.capacity_required'i JSON.stringify eder
 *     (koddan kanitli). volume_m3 / weight_kg / hazmat_classes bu jsonb'nin
 *     ICINE paketlenir — shield'a gerek yok, kutu zaten var.
 *   - skill_required -> enterprise.dispatch_tasks.skill_required (text[]).
 *     Backend ham array olarak yazar (stringify YOK -> Postgres array kolon).
 *
 * Grup B alanlari (direction / location_type / time_window_*) icin backend'de
 * KOLON YOK ve explicit INSERT ekstra alani sessizce yutar (koddan kanitli).
 * Bu yuzden Grup B DB'ye GONDERILMEZ; yalnizca frontend-state'te tutulup
 * Scorer'a beslenir. Migration/backend ameliyati bu fazda ERTELENDI.
 *
 * KONTRATSIZ COUPLING KORUMASI: form bu tipten yazar, scorer bu tipten okur.
 * "capacityVolumeM3" gibi bir typo derleme hatasi verir — sessiz JSON kaymasi
 * olmaz. services/dispatch/scoring/types.ts ile ayni disiplin.
 */

// ----- Grup A: backend'de gercek kolonu olan, bugun persist olan kisitlar -----

/** enterprise.dispatch_tasks.capacity_required (jsonb) icerigi. */
export interface CapacityRequired {
  volume_m3: number | null;
  weight_kg: number | null;
  hazmat_classes: string[]; // bos array = tehlikeli madde yok
}

/** enterprise.dispatch_tasks.skill_required (text[]). bos array = yetkinlik aranmiyor. */
export type SkillRequired = string[];

// ----- Grup B: kolonu OLMAYAN, yalnizca frontend-state genisletilmis kisitlar -----

export type TaskDirection = "outbound" | "inbound";
export type TaskLocationType = "customer" | "depot" | "locker";

export interface ExtendedConstraints {
  direction: TaskDirection;
  location_type: TaskLocationType;
  time_window_start: string | null; // ISO 8601, VRPTW hard-constraint alt sinir
  time_window_end: string | null; // ISO 8601, ust sinir
}

/** Formun urettigi + Scorer'in okudugu birlesik tek kontrat. */
export interface StrictTaskConstraints {
  capacity_required: CapacityRequired;
  skill_required: SkillRequired;
  extended: ExtendedConstraints;
}

// ----- Form secenek sabitleri (tek kaynak; form + gelecekteki validasyon) -----

export const DIRECTION_OPTIONS: { value: TaskDirection; label: string }[] = [
  { value: "outbound", label: "Teslimat (Outbound)" },
  { value: "inbound", label: "Iade / Toplama (Inbound)" },
];

export const LOCATION_TYPE_OPTIONS: { value: TaskLocationType; label: string }[] = [
  { value: "customer", label: "Musteri" },
  { value: "depot", label: "Depo" },
  { value: "locker", label: "Kargo Otomati (Locker)" },
];

/** ADR tehlikeli madde siniflari (1–9). */
export const HAZMAT_CLASS_OPTIONS: string[] = [
  "Sinif 1",
  "Sinif 2",
  "Sinif 3",
  "Sinif 4",
  "Sinif 5",
  "Sinif 6",
  "Sinif 7",
  "Sinif 8",
  "Sinif 9",
];

/** Yaygin surucu yetkinlikleri (freeSolo ile genisletilebilir). */
export const SKILL_OPTIONS: string[] = [
  "ADR Lisansi",
  "Soguk Zincir Tecrubesi",
  "Vinc / Kaldirma",
  "Tank Konteyner",
];

/** Bos/varsayilan kisit seti (form reset ve ilk deger icin). */
export const EMPTY_CONSTRAINTS: StrictTaskConstraints = {
  capacity_required: { volume_m3: null, weight_kg: null, hazmat_classes: [] },
  skill_required: [],
  extended: {
    direction: "outbound",
    location_type: "customer",
    time_window_start: null,
    time_window_end: null,
  },
};
