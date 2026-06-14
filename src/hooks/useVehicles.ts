import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "store/useAuthStore";

export interface Vehicle {
  id: string;
  plate_no?: string;
  status?: string;
  company_id?: string;
  created_at?: string;
  [key: string]: any;
}

export function useVehicles() {
  const token = useAuthStore((s) => s.token);

  return useQuery<Vehicle[], Error>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await fetch("https://enterprise-api.tulipfleet.com/api/dispatcher/vehicles", {
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
      return Array.isArray(body) ? body : body.vehicles || [];
    },
    enabled: Boolean(token),
    staleTime: 1000 * 60 * 2, // 2 dakika
    retry: 1,
  });
}

export default useVehicles;
