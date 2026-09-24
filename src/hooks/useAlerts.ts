import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AUTH_API_URL } from "config/api";
import { useAuthStore } from "store/useAuthStore";
import { EMPTY_OBJECT } from "utils/empty";

// Desen: src/hooks/useTasks.ts'ten kanitli (fetch + Authorization header).
// Ana backend'e (api.tulipfleet.com) DOGRUDAN baglanir - enterprise-api'ye degil.
// Karar (ARCHITECTURE_DECISION.md SS3): CORS acik oldugu kanitlandigi icin
// (curl testi: Access-Control-Allow-Origin: *) dogrudan baglanti secildi,
// proxy zorunlu degil, ve BasicInfo/ChangePassword/DeleteAccount'taki
// desenle tutarli.
//
// Endpoint'ler mobil src/services/api.js alertsAPI'den birebir kanitli:
//   GET    /api/alerts                 -> alertsAPI.getAll({status, severity})
//   PUT    /api/alerts/:id/resolve     -> alertsAPI.resolve(id, resolution) body:{resolution}
// Response sekli mobil AdminAlerts.js'ten kanitli (defensive):
//   res.alerts || (Array.isArray(res) ? res : [])


export interface Alert {
  id: string;
  alert_type?: string;
  type?: string;
  severity?: string;
  title?: string;
  description?: string;
  is_resolved: boolean;
  vehicle_plate?: string;
  created_at?: string;
  [key: string]: unknown;
}

export const EMPTY_ALERTS: Alert[] = [];

function authHeaders(token: string | null) {
  return {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };
}

// -- GET /api/alerts ------------------------------------------------------
export function useAlerts() {
  const token = useAuthStore((s) => s.token);
  return useQuery<Alert[], Error>({
    queryKey: ["alerts"],
    queryFn: async () => {
      const res = await fetch(`${AUTH_API_URL}/api/alerts`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Alerts fetch failed: ${res.status} ${text}`);
      }
      const body = await res.json();
      return body.alerts || (Array.isArray(body) ? body : EMPTY_ALERTS);
    },
    enabled: !!token,
    staleTime: 1000 * 30,
    retry: 1,
    refetchInterval: 1000 * 60, // 1 dk - "sicak uyari" hissi icin periyodik yenileme
    placeholderData: EMPTY_ALERTS,
  });
}

// -- PUT /api/alerts/:id/resolve -------------------------------------------
export function useResolveAlert() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, { id: string; resolution?: string }>({
    mutationFn: async ({ id, resolution }) => {
      const res = await fetch(`${AUTH_API_URL}/api/alerts/${id}/resolve`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify({ resolution: resolution || "" }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Alert resolve failed: ${res.status} ${text}`);
      }
      return res.json().catch(() => EMPTY_OBJECT);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}
