/**
 * useActiveRoutes — hareket eden araçların hedef koordinatları (30 sn polling).
 * Demo turu ihtiyacı (2026-07-31): haritada aracın NEREYE gittiği görünsün.
 * DÜRÜSTLÜK: dönen veri "hedef yönü"dür (pickup/dropoff nokta çifti), planlanan
 * yol geometrisi DEĞİL — HERE polyline (ADR-0014) gelince aynı hook gerçek
 * geometri dizisine terfi eder, tüketici bileşen değişmez.
 */
import { useEffect, useState } from "react";
import { useAuthStore } from "store/useAuthStore";

const ENTERPRISE_API_URL = "https://enterprise-api.tulipfleet.com";
const POLL_MS = 30 * 1000;

interface LatLng {
  lat: number;
  lng: number;
}

export interface ActiveRoute {
  task_no: string;
  pickup: LatLng;
  dropoff: LatLng;
}

interface ApiRouteRow {
  device_id: string;
  task_no: string;
  pickup_location: { lat?: number | string; lng?: number | string } | null;
  dropoff_location: { lat?: number | string; lng?: number | string } | null;
}

function numPair(o: ApiRouteRow["pickup_location"]): LatLng | null {
  if (!o) return null;
  const lat = Number(o.lat);
  const lng = Number(o.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export function useActiveRoutes(): Record<string, ActiveRoute> {
  const token = useAuthStore((s) => s.token);
  const [routes, setRoutes] = useState<Record<string, ActiveRoute>>({});

  useEffect(() => {
    let stopped = false;

    async function pull(): Promise<void> {
      try {
        const res = await fetch(`${ENTERPRISE_API_URL}/api/dispatcher/routes/active`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (!res.ok) throw new Error(`active-routes HTTP ${res.status}`);
        const data = await res.json();
        if (stopped) return;
        const next: Record<string, ActiveRoute> = {};
        (data.routes || []).forEach((r: ApiRouteRow) => {
          const pickup = numPair(r.pickup_location);
          const dropoff = numPair(r.dropoff_location);
          if (pickup && dropoff) {
            next[r.device_id] = { task_no: r.task_no, pickup, dropoff };
          }
          // koordinat kanıtsızsa çizgi çizilmez (dürüst SKIP)
        });
        setRoutes(next);
      } catch (e) {
        console.error("[active-routes]", e instanceof Error ? e.message : e);
      }
    }

    pull();
    const iv = setInterval(pull, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(iv);
    };
  }, [token]);

  return routes;
}
