/**
 * D-S2 — bellek-ici Supervisor oturumu (05.08.2026).
 * Token YALNIZ bellekte tutulur: sayfa yenilemede silinir, gate yeniden
 * re-auth ister (spec D-S2). Superadmin endpoint'leri su an STAGING
 * backend'de (S2-E2) — production cutover'da tek sabit degisir (bilinçli).
 */
export const SUPERVISOR_API_URL = "https://staging-api.tulipfleet.com";

let saToken: string | null = null;

export const getSupervisorToken = (): string | null => saToken;
export const setSupervisorToken = (t: string | null): void => {
  saToken = t;
};
