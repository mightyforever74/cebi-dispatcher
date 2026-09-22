/**
 * FEAT-010:FN-18 — Dispatcher karar logu istemcisi (ML-analiz veri temeli).
 * Spec: docs/functions/FEAT-010-automated-exception-handling.md §1.8 + §6.4 (v1.8).
 *
 * BEST-EFFORT SOZLESMESI: Bu cagri approve akisini ASLA bloke etmez ve ASLA
 * throw etmez (FN-16 push paterni). Basarisizlik console.warn ile gecilir —
 * loglama, operasyonun onune gecemez.
 *
 * DIKKAT (path): optimize/poll/approve route'lari /api ONEKSIZ, ama FN-18
 * /api/dispatcher/decision-log ONEKLIdir (enterprise-backend routes/decisionLog.js,
 * commit b3cdd06 — koddan kanitli, varsayilmadi).
 *
 * BUG-1 Faz C (2026-08-02): opsiyonel conflict_metadata + override_comment.
 * Zaman penceresi cakismasi "Gerekceli Onay" ile gecildiginde koprunun muhru
 * (conflicting_task_no + overlap_minutes) conflict_metadata'ya, serbest metin
 * gerekce override_comment'e yazilir. §6.4 override_reason enum'una DOKUNULMAZ;
 * cakisma override'inin isareti conflict_metadata IS NOT NULL'dur (backend
 * routes/decisionLog.js c478bee + migration 1782900000000 kanitli).
 */
import { ENTERPRISE_API_URL } from "config/api";
import { StrictTaskConstraints } from "types/metadata";


// §6.4 / UNCERTAINTIES #20 ONAYLI enum — opsiyonel; bos override da sinyaldir.
export const OVERRIDE_REASON_OPTIONS = [
  { value: "driver_familiarity" as const },
  { value: "customer_preference" as const },
  { value: "vehicle_condition" as const },
  { value: "workload_balance" as const },
  { value: "scorer_data_stale" as const },
  { value: "other" as const },
];

export interface ScorerSnapshotEntry {
  vehicle_id: string;
  rank: number;
  score: number;
  memo: string;
  mode: string;
}

// BUG-1 Faz C: kopru muhrunun sekli (routes/internalBridge.js kanitli).
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
  // BUG-1 Faz C — cakisma override'i (opsiyonel; normal akista gonderilmez)
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
        console.warn(`[decision-log] best-effort kayit basarisiz: HTTP ${res.status}`);
      }
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("[decision-log] best-effort kayit basarisiz:", err);
    });
}
