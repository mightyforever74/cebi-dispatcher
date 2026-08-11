import { useQuery } from "@tanstack/react-query";
import { ENTERPRISE_API_URL } from "config/api";
import { useAuthStore } from "store/useAuthStore";

export type TaskFilter = "all" | "pending_review" | "today" | "planned";

export interface Task {
  id: string;
  task_no: string;
  title?: string;
  status?: string;
  priority?: string;
  driver_id?: string | null;
  vehicle_id?: string | null;
  start_location?: string;
  end_location?: string;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  total_distance_km?: string | number | null;
  created_at?: string;
  company_id?: string;
  [key: string]: any;
}

export function useTasks(filter: TaskFilter = "all") {
  const token = useAuthStore((s) => s.token);
  return useQuery<Task[], Error>({
    queryKey: ["tasks", filter],
    queryFn: async () => {
      const qs = filter && filter !== "all" ? `?filter=${filter}` : "";
      const res = await fetch(`${ENTERPRISE_API_URL}/api/dispatcher/tasks${qs}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Tasks fetch failed: ${res.status} ${text}`);
      }
      const body = await res.json();
      return Array.isArray(body) ? body : body.tasks || [];
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });
}

export default useTasks;
