import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "store/useAuthStore";

/**
 * Decision Support Engine icin sayfa-lokal telemetri snapshot'i.
 *
 * NEDEN useLatestLocations DEGIL (bug kaniti, 2026-07-20):
 * useLatestLocations, frame'leri useVehicleStore'a yazar; store'un
 * applyLocationFrame -> resolveKey mantigi YALNIZCA mevcut (mock seed)
 * kayitlari gunceller, eslesmeyen frame'i sessizce ATAR ("if (!key)
 * return state;"). Gercek filo plakalari mock seed'de olmadigi icin
 * skorlar hep 0 kaliyordu ve Mekan/Zaman gecisi listeyi degistirmiyordu.
 *
 * Bu hook store'u bypass eder: GET /api/dispatcher/locations/latest
 * cevabini dogrudan dondurur. Endpoint (routes/locations.js'ten KANITLI)
 * her satirda vehicle_id (public.vehicles.id UUID) icerir - optimize
 * sonucundaki available_vehicles UUID'leriyle BIREBIR eslesir, plaka
 * eslemesine gerek yoktur.
 *
 * pg numeric kolonlar (latitude/longitude/speed/heading) node-postgres'te
 * STRING doner - Number() ile normalize edilir (haversine'e string giderse
 * NaN uretirdi).
 */

const ENTERPRISE_API_URL = "https://enterprise-api.tulipfleet.com";

export interface DispatchLocationFrame {
  device_id: string;
  plate_no: string | null;
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number | null;
  timestamp: string;
}

export function useDispatchLocationSnapshot() {
  const token = useAuthStore((s) => s.token);

  return useQuery<DispatchLocationFrame[], Error>({
    queryKey: ["dispatch-location-snapshot"],
    queryFn: async () => {
      const res = await fetch(`${ENTERPRISE_API_URL}/api/dispatcher/locations/latest`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Locations snapshot fetch failed: ${res.status} ${text}`);
      }
      const body = await res.json();
      const rows = Array.isArray(body?.locations) ? body.locations : [];
      return rows.map((r: any): DispatchLocationFrame => ({
        device_id: String(r.device_id),
        plate_no: r.plate_no ?? null,
        vehicle_id: String(r.vehicle_id),
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        speed: Number(r.speed),
        heading: r.heading === null || r.heading === undefined ? null : Number(r.heading),
        timestamp: String(r.timestamp),
      }));
    },
    enabled: Boolean(token),
    staleTime: 15_000,
    retry: 1,
  });
}

export default useDispatchLocationSnapshot;
