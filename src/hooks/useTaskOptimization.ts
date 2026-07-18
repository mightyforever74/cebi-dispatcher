import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "store/useAuthStore";

// Desen: src/hooks/useTasks.ts / useVehicles.ts'ten kanitli (fetch + Authorization,
// enterprise-api.tulipfleet.com base URL). DIKKAT: routes/tasks.js'te path'ler
// tutarsiz - GET /api/dispatcher/tasks (api onekli) ama optimize/poll/approve
// route'lari /api ONEKI OLMADAN tanimli (/dispatcher/tasks/optimize,
// /dispatcher/tasks/optimize/poll/:id, /dispatcher/tasks/optimize/approve).
// Bu, koddan (routes/tasks.js) dogrudan kanitlandi, varsayilmadi.
//
// Response sekilleri (routes/tasks.js + lib/routing/MockRoutingProvider.js'ten kanitli):
//   POST optimize        -> {message, jobId, status} (202) veya {message, jobId, status:"completed"} (200, dedup)
//   GET  poll/:id         -> {jobId, status, result?} veya {jobId, status, error?}
//     result (completed): {solver, summary:{total_distance_meters, total_duration_seconds},
//                           available_vehicles:[...], tasks:[{id, pickup_location, dropoff_location}]}
//     FIX (2026-07-18): "tasks" alani eklendi - Kanban UI (Plan Review, Secenek B)
//     kartlari icin gercek dispatch_tasks.id lazimdi, oncesinde poll bunu hic dondurmuyordu.
//   POST approve          -> {success, message, pushed, tasks:[...]}
//     FIX (2026-07-18): body'ye opsiyonel "vehicle_assignments" eklendi -
//     dispatcher'in Kanban UI'da surukle-birak ile yaptigi manuel atamalar.
//     Yoksa (undefined), backend eski round-robin davranisina duser (geriye donuk uyumlu).
//
// ONEMLI: Su an ROUTING_PROVIDER=mock (lib/routing/factory.js'te HERE entegrasyonu
// yorum satirinda, Temmuz 2026 icin planli ama henuz yazilmadi). Mock, "vehicles"
// body alanini fiilen KULLANMAZ - approve asamasinda round-robin (ya da Kanban'dan
// gelen manuel atama varsa onu) sabit 4 test araci (Dobbe Transport filosu)
// arasinda uygular. Bu davranis kullaniciya UI'da acikca gosterilmeli.

const ENTERPRISE_API_URL = "https://enterprise-api.tulipfleet.com";

export interface OptimizeTaskInput {
  pickup_location: { lat: number; lng: number; address?: string };
  dropoff_location: { lat: number; lng: number; address?: string };
  capacity_required?: Record<string, unknown>;
  skill_required?: string[];
}

export interface OptimizeSubmitPayload {
  tasks: OptimizeTaskInput[];
  vehicles: string[];
  routingMode?: string;
  appointments?: unknown;
  evConsumption?: unknown;
}

export interface OptimizeSubmitResponse {
  message: string;
  jobId: string;
  status: string;
}

// FIX (2026-07-18): draft task'in Kanban karti icin gereken minimum sekli.
export interface OptimizeResultTask {
  id: string;
  pickup_location: { lat: number; lng: number; address?: string };
  dropoff_location: { lat: number; lng: number; address?: string };
}

export interface OptimizePollResult {
  solver: string;
  summary: { total_distance_meters: number; total_duration_seconds: number };
  available_vehicles: string[];
  tasks?: OptimizeResultTask[]; // FIX (2026-07-18): opsiyonel - eski job'larda (bu koddan once tamamlanmis) olmayabilir
}

export interface OptimizePollResponse {
  jobId: string;
  status: "submitted" | "running" | "completed" | string;
  result?: OptimizePollResult;
  error?: string | null;
}

export interface ApproveResponse {
  success: boolean;
  message: string;
  pushed: number;
  tasks?: string[];
}

// FIX (2026-07-18): dispatcher'in Kanban UI'da yaptigi manuel atama.
export interface VehicleAssignment {
  taskId: string;
  vehicleId: string;
}

export interface ApprovePayload {
  routing_job_id: string;
  vehicle_assignments?: VehicleAssignment[]; // FIX (2026-07-18): opsiyonel, verilmezse backend round-robin'e duser
}

function authHeaders(token: string | null) {
  return {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };
}

// -- POST /dispatcher/tasks/optimize (dikkat: /api oneki YOK) -------------
export function useSubmitOptimization() {
  const token = useAuthStore((s) => s.token);
  return useMutation<OptimizeSubmitResponse, Error, OptimizeSubmitPayload>({
    mutationFn: async (payload) => {
      const res = await fetch(`${ENTERPRISE_API_URL}/dispatcher/tasks/optimize`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Optimize submit failed: ${res.status} ${text}`);
      }
      return res.json();
    },
  });
}

// -- GET /dispatcher/tasks/optimize/poll/:id (dikkat: /api oneki YOK) -----
// enabled + refetchInterval ile otomatik polling: "completed"/"failed"
// olunca durur. Mock ~6sn surer (3sn submitted->running, 3sn running->completed).
export function usePollOptimization(jobId: string | null) {
  const token = useAuthStore((s) => s.token);
  return useQuery<OptimizePollResponse, Error>({
    queryKey: ["optimize-poll", jobId],
    queryFn: async () => {
      const res = await fetch(`${ENTERPRISE_API_URL}/dispatcher/tasks/optimize/poll/${jobId}`, {
        headers: authHeaders(token),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Optimize poll failed: ${res.status} ${text}`);
      }
      return res.json();
    },
    enabled: !!token && !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 2000; // 2 saniyede bir - mock ~6sn surdugu icin makul
    },
    retry: 1,
  });
}

// -- POST /dispatcher/tasks/optimize/approve (dikkat: /api oneki YOK) -----
export function useApproveOptimization() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  return useMutation<ApproveResponse, Error, ApprovePayload>({
    mutationFn: async (payload) => {
      const res = await fetch(`${ENTERPRISE_API_URL}/dispatcher/tasks/optimize/approve`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Optimize approve failed: ${res.status} ${text}`);
      }
      return res.json();
    },
    onSuccess: () => {
      // Onaylanan gorevler public.tasks'a dustugu icin liste yenilensin
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
