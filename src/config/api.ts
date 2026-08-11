/**
 * Tek kaynak API adres konfigurasyonu (11.08.2026 refactor).
 * UC AYRI backend — birlestirilemez:
 *  - AUTH_API_URL: ana fleet (login, superadmin, kullanici)
 *  - ENTERPRISE_API_URL: dispatcher veri duzlemi (gorev/arac/konum/compliance/abonelik)
 *  - SUPERVISOR_API_URL: superadmin abonelik rotalari — Milestone-0 geregi BILINCLI staging;
 *    production cutover'da yalniz asagidaki fallback degisir.
 */
export const AUTH_API_URL = (process.env.REACT_APP_AUTH_API_URL || "https://api.tulipfleet.com").replace(/\/+$/, "");
export const ENTERPRISE_API_URL = (process.env.REACT_APP_ENTERPRISE_API_URL || "https://enterprise-api.tulipfleet.com").replace(/\/+$/, "");
export const SUPERVISOR_API_URL = (process.env.REACT_APP_SUPERVISOR_API_URL || "https://staging-api.tulipfleet.com").replace(/\/+$/, "");
