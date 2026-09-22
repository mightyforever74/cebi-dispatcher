/**
 * Live Fleet Map — Sira 4.3 REST snapshot bootstrap (FEAT-010 sonrasi, 2026-07-31).
 * GOREV: mock tohumu GERCEK filoyla degistirir ve 20 sn'de bir tazeler.
 *  - Ilk basarili fetch: store'u device_id anahtarli gercek arac kumesiyle
 *    setVehicles (mock biter). Endpoint company-scoped (tenant izolasyonu).
 *  - Sonraki turlar: bilinen araclara applyLocationFrame(source:"rest") —
 *    stale-overwrite guard MQTT (Sira 4.2) ile cakismayi zaten cozuyor;
 *    yeni gorunen arac merge edilir.
 * Esleme (kanitli, 31.07): vehicles'ta weight kolonu YOK; vehicle_category
 * truck_heavy→32_plus_t, van→12_18t, diger/bilinmeyen→18_32t.
 * emission_class NULL→"n_a" (durust rozet — uydurma euro sinifi yazilmaz).
 * BUG-4 v2 (2026-08-02): vehicle_id (public.vehicles.id UUID) artik telemetriye
 * tasinir — surucu→arac rota secimi (Olasilik C) bu alandan eslenir.
 *
 * D3: yukleme/hata/yeniden-dene UI icin phase + lastOkAt + refetch doner.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ENTERPRISE_API_URL } from "config/api";
import { map as mapTokens } from "assets/theme/tokens";
import { useAuthStore } from "store/useAuthStore";
import { EMPTY_ARRAY } from "utils/empty";
import {
  useVehicleStore,
  VehicleTelemetry,
  deriveStatus,
} from "store/useVehicleStore";

export type SnapshotPhase = "loading" | "ready" | "error";

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
    vehicle_id: r.vehicle_id,
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

export function useFleetSnapshot(): {
  phase: SnapshotPhase;
  error: string | null;
  lastOkAt: number | null;
  bootstrapped: boolean;
  refetch: () => void;
} {
  const token = useAuthStore((s) => s.token);
  const [phase, setPhase] = useState<SnapshotPhase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [lastOkAt, setLastOkAt] = useState<number | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const bootRef = useRef(false);
  const stoppedRef = useRef(false);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const pull = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`${ENTERPRISE_API_URL}/api/dispatcher/locations/latest`, {
        headers: { Authorization: tokenRef.current ? `Bearer ${tokenRef.current}` : "" },
      });
      if (!res.ok) throw new Error(`snapshot HTTP ${res.status}`);
      const data = await res.json();
      const rows: SnapshotRow[] = data.locations || EMPTY_ARRAY;
      if (stoppedRef.current) return;

      const store = useVehicleStore.getState();
      if (!bootRef.current) {
        const record: Record<string, VehicleTelemetry> = {};
        rows.forEach((r) => {
          record[r.device_id] = rowToTelemetry(r);
        });
        store.setVehicles(record);
        bootRef.current = true;
        setBootstrapped(true);
      } else {
        rows.forEach((r) => {
          const known = useVehicleStore.getState().vehicles[r.device_id];
          if (!known) {
            useVehicleStore.getState().setVehicles({
              ...useVehicleStore.getState().vehicles,
              [r.device_id]: rowToTelemetry(r),
            });
            return;
          }
          if (!known.vehicle_id && r.vehicle_id) {
            useVehicleStore.getState().setVehicles({
              ...useVehicleStore.getState().vehicles,
              [r.device_id]: { ...known, vehicle_id: r.vehicle_id },
            });
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
      }
      setLastOkAt(Date.now());
      setPhase("ready");
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-console
      console.error("[fleet-snapshot]", message);
      setError(message);
      if (!bootRef.current) setPhase("error");
    }
  }, []);

  useEffect(() => {
    stoppedRef.current = false;
    bootRef.current = false;
    setBootstrapped(false);
    setPhase("loading");
    pull();
    const iv = setInterval(pull, mapTokens.restPollMs);
    return () => {
      stoppedRef.current = true;
      clearInterval(iv);
    };
  }, [token, pull]);

  return { phase, error, lastOkAt, bootstrapped, refetch: pull };
}
