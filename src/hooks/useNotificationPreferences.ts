import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ENTERPRISE_API_URL } from "config/api";
import { useAuthStore } from "store/useAuthStore";

// Desen: src/hooks/useTasks.ts'ten kanitli (fetch + Authorization header +
// enterprise-api.tulipfleet.com sabit base URL + useAuthStore token).

export type MailClient = "native" | "web";

export interface NotificationPreferences {
  notification_email: string;
  mail_client: MailClient;
  alert_ze_zone: boolean;
  alert_dispatch_delay: boolean;
  alert_device_offline: boolean;
}

const BASE_URL = `${ENTERPRISE_API_URL}/api/dispatcher/notification-preferences`;

export function useNotificationPreferences() {
  const token = useAuthStore((s) => s.token);

  return useQuery<NotificationPreferences | null, Error>({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await fetch(BASE_URL, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Notification preferences fetch failed: ${res.status} ${text}`);
      }
      const body = await res.json();
      return body.preferences ?? null;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
}

export function useSaveNotificationPreferences() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation<NotificationPreferences, Error, NotificationPreferences>({
    mutationFn: async (payload) => {
      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Notification preferences save failed: ${res.status} ${text}`);
      }
      const body = await res.json();
      return body.preferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });
}
