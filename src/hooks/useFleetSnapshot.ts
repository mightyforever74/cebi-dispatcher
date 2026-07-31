/**
 * Live Fleet Map — Sıra 4.3 REST snapshot bootstrap (FEAT-010 sonrası, 2026-07-31).
 * GÖREV: mock tohumu GERÇEK filoyla değiştirir ve 20 sn'de bir tazeler.
 *  - İlk başarılı fetch: store'u device_id anahtarlı gerçek araç kümesiyle
 *    setVehicles (mock biter). Endpoint company-scoped (tenant izolasyonu).
 *  - Sonraki turlar: bilinen araçlara applyLocationFrame(source:"rest") —
 *    stale-overwrite guard MQTT (Sıra 4.2) ile çakışmayı zaten çözüyor;
 *    yeni görünen araç merge edilir.
 * Eşleme (kanıtlı, 31.07): vehicles'ta weight kolonu YOK; vehicle_category
 * truck_heavy→32_plus_t, van→12_18t, diğer/bilinmeyen→18_32t.
 * emission_class NULL→"n_a" (dürüst rozet — uydurma euro sınıfı yazılmaz).
 */
import { useEffect } from "react";
import { useAuthStore } from "store/useAuthStore";
import {
  useVehicleStore,
  VehicleTelemetry,
  deriveStatus,
} from "store/useVehicleStore";

const ENTERPRISE_API_URL = "https://enterprise-api.tulipfleet.com";
const POLL_MS = 20 * 1000;

interface SnapshotRow {
  device_id: string;
  plate_no: string;
  vehicle_id: string;
  latitude: string | number;
  longitude: string | number;
  speed: string | number | null;
  heading: string | number | null;
  timestamp: string;
  emission_class: string | null;
  vehicle_category: string | null;
}

const CATEGORY_TO_WEIGHT: Record<string, VehicleTelemetry["vehicle_weight_class"]> = {
  truck_heavy: "32_plus_t",
  truck_medium: "18_32t",
  van: "12_18t",
};

function rowToTelemetry(r: SnapshotRow): VehicleTelemetry {
  const speed = Number(r.speed) || 0;
  return {
    id: r.device_id,
    plate: r.plate_no,
    vehicle_weight_class: CATEGORY_TO_WEIGHT[r.vehicle_category || ""] || "18_32t",
    emission_class: r.emission_class || "n_a",
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    speed_kmh: speed,
    heading: Number(r.heading) || 0,
    status: deriveStatus(speed),
    last_update: r.timestamp,
  };
}

export function useFleetSnapshot(): void {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    let stopped = false;
    let bootstrapped = false;

    async function pull(): Promise<void> {
      try {
        const res = await fetch(`${ENTERPRISE_API_URL}/api/dispatcher/locations/latest`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (!res.ok) throw new Error(`snapshot HTTP ${res.status}`);
        const data = await res.json();
        const rows: SnapshotRow[] = data.locations || [];
        if (stopped) return;

        const store = useVehicleStore.getState();
        if (!bootstrapped) {
          const record: Record<string, VehicleTelemetry> = {};
          rows.forEach((r) => {
            record[r.device_id] = rowToTelemetry(r);
          });
          store.setVehicles(record);
          bootstrapped = true;
          return;
        }
        rows.forEach((r) => {
          const known = useVehicleStore.getState().vehicles[r.device_id];
          if (!known) {
            // filoya yeni katılan araç: merge (mock'suz dünyada tek yeni-araç yolu)
            useVehicleStore.getState().setVehicles({
              ...useVehicleStore.getState().vehicles,
              [r.device_id]: rowToTelemetry(r),
            });
            return;
          }
          useVehicleStore.getState().applyLocationFrame({
            device_id: r.device_id,
            plate_no: r.plate_no,
            latitude: Number(r.latitude),
            longitude: Number(r.longitude),
            speed: Number(r.speed) || 0,
            heading: r.heading != null ? Number(r.heading) : undefined,
            timestamp: r.timestamp,
            source: "rest",
          });
        });
      } catch (e) {
        // sessiz düşme yok: konsola dürüst log; UI mevcut son durumla yaşar
        console.error("[fleet-snapshot]", e instanceof Error ? e.message : e);
      }
    }

    pull();
    const iv = setInterval(pull, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(iv);
    };
  }, [token]);
}
