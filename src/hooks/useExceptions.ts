/**
 * FEAT-010 Dilim 4 - useExceptions hook'u (FN-10 polling + FN-11 resolve istemcisi).
 * Karar: 20 sn polling (FN-09 MQTT push yerine - Cem onayli kapsam karari, Dilim 2 plani).
 * Pattern: decisionLog.ts kardesi (sabit enterprise base + useAuthStore token'i cagirandan).
 */
import { useCallback, useEffect, useRef, useState } from "react";

const ENTERPRISE_API_URL = "https://enterprise-api.tulipfleet.com";
const POLL_MS = 20 * 1000;

export type ExceptionSeverity = "low" | "medium" | "high" | "critical";
export type ExceptionStatus = "open" | "acknowledged" | "resolved" | "auto_handled";
export type ResolveAction = "acknowledge" | "manual_replan" | "manual_reassign" | "dismiss";

export interface ExceptionEvent {
  id: string;
  exception_type: string;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  task_id: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  detection_payload: Record<string, unknown>;
  resolution_type: string | null;
  resolution_action: string | null;
  resolved_at: string | null;
  resolution_comment: string | null;
  occurred_at: string;
}

async function fetchExceptions(token: string | null): Promise<ExceptionEvent[]> {
  const res = await fetch(`${ENTERPRISE_API_URL}/api/dispatcher/exceptions`, {
    headers: { Authorization: token ? `Bearer ${token}` : "" },
  });
  if (!res.ok) throw new Error(`FN-10 HTTP ${res.status}`);
  const data = await res.json();
  return data.exceptions || [];
}

export async function resolveException(
  token: string | null,
  id: string,
  action: ResolveAction,
  comment?: string
): Promise<void> {
  const res = await fetch(`${ENTERPRISE_API_URL}/api/dispatcher/exceptions/${id}/resolve`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, comment: comment || undefined }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `FN-11 HTTP ${res.status}`);
  }
}

export function useExceptions(token: string | null) {
  const [exceptions, setExceptions] = useState<ExceptionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // FN-12 MVP: son gorulen id kumesine gore "yeni olay" tespiti (toast yerine sayfa-ici vurgu)
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const seenRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const rows = await fetchExceptions(token);
      if (!firstLoadRef.current) {
        const fresh = rows.filter((r) => !seenRef.current.has(r.id)).map((r) => r.id);
        if (fresh.length > 0) setNewIds(new Set(fresh));
      }
      rows.forEach((r) => seenRef.current.add(r.id));
      firstLoadRef.current = false;
      setExceptions(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, POLL_MS);
    return () => clearInterval(iv);
  }, [refresh]);

  const resolve = useCallback(
    async (id: string, action: ResolveAction, comment?: string) => {
      await resolveException(token, id, action, comment);
      await refresh();
    },
    [token, refresh]
  );

  return { exceptions, loading, error, newIds, refresh, resolve };
}
