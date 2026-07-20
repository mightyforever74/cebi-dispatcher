/**
 * Haversine — kus ucusu mesafe (km). Spatial/Temporal scorer'larin ortak
 * yardimcisi. HERE Matrix Routing (ADR-0014) frontend'e baglandiginda
 * scorer'lar gercek surus mesafesine gececek; bu dosya o gun de fallback
 * olarak kalir (telemetri var ama Matrix cevap vermiyorsa).
 */

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

/** "3 dk once" tarzi insan-okur yas etiketi (Karar Notu icin). */
export function frameAgeLabel(isoTimestamp: string | null): string {
  if (!isoTimestamp) return "sinyal yok";
  const ageMs = Date.now() - new Date(isoTimestamp).getTime();
  if (Number.isNaN(ageMs)) return "sinyal yok";
  const min = Math.round(ageMs / 60000);
  if (min < 1) return "az once";
  if (min < 60) return `${min} dk once`;
  const h = Math.round(min / 60);
  return `${h} sa once`;
}
