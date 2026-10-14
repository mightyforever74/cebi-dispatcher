/**
 * Haversine — kus ucusu mesafe (km). Spatial/Temporal scorer'larin ortak
 * yardimcisi. HERE Matrix Routing (ADR-0014) frontend'e baglandiginda
 * scorer'lar gercek surus mesafesine gececek; bu dosya o gun de fallback
 * olarak kalir (telemetri var ama Matrix cevap vermiyorsa).
 */

import { t } from "i18n";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * "3 dk once" tarzi insan-okur yas etiketi (Karar Notu icin). D7-3 (11)
 * (15 Eki 2026): artik aktif dile gore i18n key'inden okunuyor (scorer.signal*).
 */
export function frameAgeLabel(isoTimestamp: string | null): string {
  if (!isoTimestamp) return t("scorer.signalNone");
  const ageMs = Date.now() - new Date(isoTimestamp).getTime();
  if (Number.isNaN(ageMs)) return t("scorer.signalNone");
  const min = Math.round(ageMs / 60000);
  if (min < 1) return t("scorer.signalJustNow");
  if (min < 60) return t("scorer.signalMinutesAgo", { count: min });
  const h = Math.round(min / 60);
  return t("scorer.signalHoursAgo", { count: h });
}
