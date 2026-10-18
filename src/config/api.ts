/**
 * Tek kaynak API adres konfigurasyonu — TulipFleet Customer Edition (Cebi), Faz 4.
 *
 * Ana projeden fork edilirken bu dosya UC AYRI backend varsayıyordu
 * (AUTH/ENTERPRISE/SUPERVISOR, ana projenin core+enterprise ayrımına göre).
 * Faz 3 kararıyla (bkz. FORK_BASELINE.md, ADR-CE-03) Cebi TEK bir konsolide
 * backend kullanıyor (cebi-backend, Modular Monolith) — ayrı bir enterprise
 * servisi yok. Üç değişken de artık AYNI backend'e işaret eder; isimler
 * sadece bu üç ismi ayrı ayrı import eden mevcut ekranlarla geriye uyumluluk
 * için korunmuştur (ileride tek bir CEBI_API_URL'e konsolide edilebilir).
 *
 * ADR-CE-03 "Bağımsız Çalışma Zamanı": hiçbir fallback ana projenin
 * (api.tulipfleet.com / enterprise-api.tulipfleet.com) adreslerine işaret
 * etmez. REACT_APP_CEBI_API_URL tanımlı değilse bu değerler boş kalır ve
 * istekler görünür şekilde başarısız olur — sessizce ana projeye düşülmez.
 */
const CEBI_API_URL = (process.env.REACT_APP_CEBI_API_URL || "").replace(/\/+$/, "");

if (!CEBI_API_URL) {
  // eslint-disable-next-line no-console
  console.error(
    "[Config] REACT_APP_CEBI_API_URL tanımlı değil — cebi-backend adresi olmadan bu uygulama çalışamaz. " +
      "Ana projeye (api.tulipfleet.com / enterprise-api.tulipfleet.com) fallback yapılmıyor (ADR-CE-03)."
  );
}

export const AUTH_API_URL = CEBI_API_URL;
export const ENTERPRISE_API_URL = CEBI_API_URL;
export const SUPERVISOR_API_URL = CEBI_API_URL;
