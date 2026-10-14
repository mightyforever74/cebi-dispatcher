import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AUTH_API_URL, ENTERPRISE_API_URL } from "config/api";
import { useAuthStore } from "store/useAuthStore";

export interface Vehicle {
  id: string;
  plate_no?: string;
  status?: string;
  company_id?: string;
  created_at?: string;
  cargo_capacity_volume_m3?: number | null;
  cargo_capacity_weight_kg?: number | null;
  hazmat_certified_classes?: string[] | null;
  [key: string]: any;
}

export const EMPTY_VEHICLES: Vehicle[] = [];

function authHeaders(token: string | null) {
  return {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };
}

export function useVehicles() {
  const token = useAuthStore((s) => s.token);

  return useQuery<Vehicle[], Error>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await fetch(`${ENTERPRISE_API_URL}/api/dispatcher/vehicles`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Vehicles fetch failed: ${res.status} ${text}`);
      }

      const body = await res.json();
      // Route returns { vehicles: [...], count }. Verified against routes/vehicles.js.
      return Array.isArray(body) ? body : body.vehicles || EMPTY_VEHICLES;
    },
    enabled: Boolean(token),
    staleTime: 1000 * 60 * 2, // 2 dakika
    retry: 1,
    networkMode: "always",
    placeholderData: EMPTY_VEHICLES,
  });
}

/**
 * useUpdateVehicleCapacity — FEAT-013 hazmat veri-girisi UI (W12, 2026-10-14
 * ROADMAP karari). Desen: src/hooks/useUserAccount.ts'teki useUpdateUserProfile
 * ile BIREBIR ayni (AUTH_API_URL'e Bearer token ile dogrudan PUT).
 *
 * Gatekeeping bulgusu (2026-10-14): tulipfleet-enterprise-backend/routes/vehicles.js
 * sadece GET icerir ve enterprise_backend Postgres rolu public.vehicles'a
 * SELECT-only (ADR-0009 SS4.1). Bu kasitli bir sinir -- docs/
 * ARCHITECTURE_DECISION_task-management-api-driven.md SS0 "Kilitlenmis Mimari
 * Karar": "Tum dispatcher->ana-sistem yazma islemleri HTTP API cagrisi
 * uzerinden yapilir" (enterprise-backend'e ekstra bir PUT route EKLENMEZ).
 * Bu yuzden burada dogrudan core backend'in (tulipfleet-backend) zaten
 * hazmat_certified_classes/cargo_capacity_* destekleyen
 * PUT /api/vehicles/:id'ine yazilir -- useAlerts.ts/useUserAccount.ts'teki
 * ayni AUTH_API_URL + Bearer deseniyle (CORS acik kanitli, proxy gerekmez).
 *
 * capacity.hazmat_certified_classes KASITLI OLARAK HER ZAMAN gonderilir (bos
 * array dahil): backend COALESCE semantigi alan body'de undefined ise eski
 * degeri korur, ama bu dialog hazmat'i "duzenlenen" tek yer oldugu icin
 * kullanicinin secimi -- bos da olsa -- her zaman yazilmalidir (sessiz
 * "degismeden kalma" davranisi bu ozel form icin yanlis olur).
 */
export interface VehicleCapacityUpdate {
  cargo_capacity_volume_m3: number | null;
  cargo_capacity_weight_kg: number | null;
  hazmat_certified_classes: string[];
}

export function useUpdateVehicleCapacity() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  return useMutation<Vehicle, Error, { id: string; capacity: VehicleCapacityUpdate }>({
    mutationFn: async ({ id, capacity }) => {
      if (!token) throw new Error("No auth token");
      const res = await fetch(`${AUTH_API_URL}/api/vehicles/${id}`, {
        method: "PUT",
        headers: authHeaders(token),
        body: JSON.stringify(capacity),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Vehicle capacity update failed: ${res.status} ${text}`);
      }
      const body = await res.json();
      return body.vehicle ?? body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
}

export default useVehicles;