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
 *
 * BUG-1 Faz C (2026-08-02): opsiyonel conflict_metadata + override_comment.
 * Zaman penceresi çakışması "Gerekçeli Onay" ile geçildiğinde köprünün mührü
 * (conflicting_task_no + overlap_minutes) conflict_metadata'ya, serbest metin
 * gerekçe override_comment'e yazılır. §6.4 override_reason enum'una DOKUNULMAZ;
 * çakışma override'ının işareti conflict_metadata IS NOT NULL'dur (backend
 * routes/decisionLog.js c478bee + migration 1782900000000 kanıtlı).
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

// BUG-1 Faz C: köprü mührünün şekli (routes/internalBridge.js kanıtlı).
export interface ConflictMetadataSeal {
  conflicting_task_no: string;
  overlap_minutes: number;
}

export interface DecisionLogPayload {
  routing_job_id: string;
  dispatch_task_id: string;
  scorer_snapshot: ScorerSnapshotEntry[];
  constraints_snapshot: StrictTaskConstraints | null;
  recommended_vehicle_id: string | null;
  chosen_vehicle_id: string;
  override_reason: string | null;
  // BUG-1 Faz C — çakışma override'ı (opsiyonel; normal akışta gönderilmez)
  override_comment?: string | null;
  conflict_metadata?: ConflictMetadataSeal | null;
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
