import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ENTERPRISE_API_URL } from "config/api";
import { useAuthStore } from "store/useAuthStore";
// Kisit sozlesmesi (types/metadata): capacity_required/skill_required'in GERCEK
// sekli. Onceden Record<string, unknown> (gevsek jsonb passthrough) idi; strict
// CapacityRequired ona atanamiyordu (TS2322, index signature yok). Tip buraya
// sikilastirilinca form -> hook -> backend zinciri bastan sona typo-korumali olur.
import { CapacityRequired, SkillRequired } from "types/metadata";

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
//   POST approve          -> {success, message, pushed, tasks:[...], overridden_conflicts?}
//     FIX (2026-07-18): body'ye opsiyonel "vehicle_assignments" eklendi -
//     dispatcher'in Kanban UI'da surukle-birak ile yaptigi manuel atamalar.
//     Yoksa (undefined), backend eski round-robin davranisina duser (geriye donuk uyumlu).
//     BUG-1 Faz A/C (2026-08-02): body'ye opsiyonel time_windows
//     ([{taskId, start(ISO)}]), override (bool) ve override_reason (string)
//     eklendi. Backend cakismada HTTP 409 + conflict_metadata doner - hook
//     bunu yapilandirilmis ApproveConflictError olarak firlatir ki UI
//     MD2 PRO sert modali acabilsin (jenerik Error'a EZILMEZ).
//
// ONEMLI: Su an ROUTING_PROVIDER=mock (lib/routing/factory.js'te HERE entegrasyonu
// yorum satirinda, Temmuz 2026 icin planli ama henuz yazilmadi). Mock, "vehicles"
// body alanini fiilen KULLANMAZ - approve asamasinda round-robin (ya da Kanban'dan
// gelen manuel atama varsa onu) sabit 4 test araci (Dobbe Transport filosu)
// arasinda uygular. Bu davranis kullaniciya UI'da acikca gosterilmeli.


export interface OptimizeTaskInput {
  pickup_location: { lat: number; lng: number; address?: string };
  dropoff_location: { lat: number; lng: number; address?: string };
  // GRUP A (Strateji 3): backend routes/tasks.js bunlari GERCEK kolonlara yazar.
  // capacity_required -> dispatch_tasks.capacity_required (jsonb, backend stringify eder).
  // skill_required    -> dispatch_tasks.skill_required (text[], ham array).
  capacity_required?: CapacityRequired;
  skill_required?: SkillRequired;
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

// BUG-1 (2026-08-02): koprunun urettigi cakisma muhru (routes/internalBridge.js kanitli).
export interface ConflictMetadata {
  conflicting_task_no: string;
  overlap_minutes: number;
}

// BUG-1 Faz C: override ile gecilen cakisma kaydi (approve yanitindan).
export interface OverriddenConflict extends ConflictMetadata {
  draft_id: string;
  vehicle_id: string;
}

// BUG-2 (2026-08-03): kismi basarida cakismaya takilan draft kaydi.
// Backend D2 sekli birebir: { draft_id, vehicle_id, conflict_metadata }.
export interface ApproveConflict {
  draft_id: string;
  vehicle_id: string;
  conflict_metadata: ConflictMetadata | null;
}

export interface ApproveResponse {
  success: boolean;
  message: string;
  pushed: number;
  tasks?: string[];
  conflicts?: ApproveConflict[]; // BUG-2: kismi basari — draft kalan gorevler
  overridden_conflicts?: OverriddenConflict[]; // BUG-1 Faz C: FN-18 muhurleme malzemesi
}

// FIX (2026-07-18): dispatcher'in Kanban UI'da yaptigi manuel atama.
export interface VehicleAssignment {
  taskId: string;
  vehicleId: string;
}

// BUG-1 Faz A: gorev basina istenen baslangic penceresi (ISO string).
export interface TimeWindow {
  taskId: string;
  start: string;
}

export interface ApprovePayload {
  routing_job_id: string;
  vehicle_assignments?: VehicleAssignment[]; // FIX (2026-07-18): opsiyonel, verilmezse backend round-robin'e duser
  time_windows?: TimeWindow[]; // BUG-1 Faz A: opsiyonel, verilmezse backend NOW() ile pencereler
  override?: boolean; // BUG-1 Faz C: Mode 1 "Gerekceli Onay" bayragi
  override_reason?: string; // BUG-1 Faz C: serbest metin gerekce (routing_jobs'a muhurlenir)
}

// BUG-1 Faz C: 409 Conflict, jenerik Error yerine yapilandirilmis firlatilir -
// UI instanceof kontrolu ile sert modali acar (conflict_metadata elinde hazir).
export class ApproveConflictError extends Error {
  readonly status = 409;

  readonly conflict_metadata: ConflictMetadata | null;

  readonly conflicting_draft_id?: string;

  readonly pushed_before_conflict?: number;

  // BUG-2: sert 409 (pushed=0) artik tum cakisma listesini de tasir.
  readonly conflicts?: ApproveConflict[];

  constructor(
    message: string,
    meta: ConflictMetadata | null,
    conflictingDraftId?: string,
    pushedBeforeConflict?: number,
    conflicts?: ApproveConflict[]
  ) {
    super(message);
    this.name = "ApproveConflictError";
    this.conflict_metadata = meta;
    this.conflicting_draft_id = conflictingDraftId;
    this.pushed_before_conflict = pushedBeforeConflict;
    this.conflicts = conflicts;
  }
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
      // BUG-1 Faz C: 409 yapilandirilmis firlatilir (jenerik Error'a ezilmez)
      if (res.status === 409) {
        let body: {
          message?: string;
          conflict_metadata?: ConflictMetadata | null;
          conflicting_draft_id?: string;
          pushed_before_conflict?: number;
          conflicts?: ApproveConflict[]; // BUG-2
        } = {};
        try {
          body = await res.json();
        } catch {
          // govde bos olabilir - metadata'siz conflict error firlatilir
        }
        throw new ApproveConflictError(
          body.message || "Bu araca belirtilen aralıkta atanmış görev var.",
          body.conflict_metadata || null,
          body.conflicting_draft_id,
          body.pushed_before_conflict,
          body.conflicts // BUG-2
        );
      }
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
