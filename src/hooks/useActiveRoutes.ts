/**
 * useActiveRoutes — hareket eden araçların hedef koordinatları (30 sn polling).
 * Demo turu ihtiyacı (2026-07-31): haritada aracın NEREYE gittiği görünsün.
 * HERE-geometri dilimi (aynı gün, Cem onaylı): backend artık `geometry` alanında
 * GERÇEK yol koordinat dizisi döndürebiliyor — varsa Polyline ona çizilir,
 * yoksa kesikli hedef-yönü fallback (Graceful Degradation).
 */
import { useEffect, useState } from "react";
import { ENTERPRISE_API_URL } from "config/api";
import { useAuthStore } from "store/useAuthStore";

const POLL_MS = 30 * 1000;

interface LatLng {
  lat: number;
  lng: number;
}

export interface ActiveRoute {
  task_no: string;
  pickup: LatLng;
  dropoff: LatLng;
  geometry?: [number, number][];
}

interface ApiRouteRow {
  device_id: string;
  task_no: string;
  pickup_location: { lat?: number | string; lng?: number | string } | null;
  dropoff_location: { lat?: number | string; lng?: number | string } | null;
  geometry?: number[][] | null;
}

function numPair(o: ApiRouteRow["pickup_location"]): LatLng | null {
  if (!o) return null;
  const lat = Number(o.lat);
  const lng = Number(o.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function cleanGeometry(g: ApiRouteRow["geometry"]): [number, number][] | undefined {
  if (!Array.isArray(g)) return undefined;
  const pts = g
    .filter(
      (p) =>
        Array.isArray(p) && p.length >= 2 && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1]))
    )
    .map((p) => [Number(p[0]), Number(p[1])] as [number, number]);
  return pts.length > 1 ? pts : undefined;
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
            next[r.device_id] = {
              task_no: r.task_no,
              pickup,
              dropoff,
              geometry: cleanGeometry(r.geometry),
            };
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
