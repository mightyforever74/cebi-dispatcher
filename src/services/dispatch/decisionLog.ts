/**
 * FEAT-010:FN-18 — Dispatcher karar logu istemcisi (ML-analiz veri temeli).
 * Spec: docs/functions/FEAT-010-automated-exception-handling.md §1.8 + §6.4 (v1.8).
 *
 * BEST-EFFORT SÖZLEŞMESİ: Bu çağrı approve akışını ASLA bloke etmez ve ASLA
 * throw etmez (FN-16 push paterni). Başarısızlık console.warn ile geçilir —
 * loglama, operasyonun önüne geçemez.
 *
 * DİKKAT (path): optimize/poll/approve route'ları /api ÖNEKSİZ, ama FN-18
 * /api/dispatcher/decision-log ÖNEKLİdir (enterprise-backend routes/decisionLog.js,
 * commit b3cdd06 — koddan kanıtlı, varsayılmadı).
 */
import { StrictTaskConstraints } from "types/metadata";

const ENTERPRISE_API_URL = "https://enterprise-api.tulipfleet.com";

// §6.4 / UNCERTAINTIES #20 ONAYLI enum — opsiyonel; boş override da sinyaldir.
export const OVERRIDE_REASON_OPTIONS = [
  { value: "driver_familiarity", label: "Sürücü bölgeyi/müşteriyi tanıyor" },
  { value: "customer_preference", label: "Müşteri tercihi" },
  { value: "vehicle_condition", label: "Araç durumu (bakım/donanım)" },
  { value: "workload_balance", label: "İş yükü dengeleme" },
  { value: "scorer_data_stale", label: "Skor verisi bayat/eksik" },
  { value: "other", label: "Diğer" },
] as const;

export interface ScorerSnapshotEntry {
  vehicle_id: string;
  rank: number;
  score: number;
  memo: string;
  mode: string;
}

export interface DecisionLogPayload {
  routing_job_id: string;
  dispatch_task_id: string;
  scorer_snapshot: ScorerSnapshotEntry[];
  constraints_snapshot: StrictTaskConstraints | null;
  recommended_vehicle_id: string | null;
  chosen_vehicle_id: string;
  override_reason: string | null;
}

export function postDecisionLog(token: string | null, payload: DecisionLogPayload): void {
  fetch(`${ENTERPRISE_API_URL}/api/dispatcher/decision-log`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then((res) => {
      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.warn(`[decision-log] best-effort kayıt başarısız: HTTP ${res.status}`);
      }
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("[decision-log] best-effort kayıt başarısız:", err);
    });
}
