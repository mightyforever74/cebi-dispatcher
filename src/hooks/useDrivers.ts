import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "store/useAuthStore";

export interface Driver {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  license_no?: string;
  license_expiry?: string;
  phone?: string;
  status?: string;
  total_km_driven?: number;
  safety_score?: number;
  assigned_vehicle_id?: string;
  company_id?: string;
  [key: string]: any;
}

export function useDrivers() {
  const token = useAuthStore((s) => s.token);

  return useQuery<Driver[], Error>({
    queryKey: ["drivers"],
    queryFn: async () => {
      const res = await fetch("https://enterprise-api.tulipfleet.com/api/dispatcher/drivers", {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Drivers fetch failed: ${res.status} ${text}`);
      }

      const body = await res.json();
      // Route returns { drivers: [...], count }. Per routes/drivers.js.
      return Array.isArray(body) ? body : body.drivers || [];
    },
    enabled: Boolean(token),
    staleTime: 1000 * 60 * 2, // 2 dakika
    retry: 1,
  });
}

export default useDrivers;
