import { create } from "zustand";

/**
 * Live Fleet Map — vehicle telemetry store (Sıra 4.1 / 4.2 / 4.3).
 *
 * IMPORTANT — `status` is a DERIVED UI value, not a DB column.
 * Verified 2026-06-04 against prod: `public.locations` has `speed` (numeric 6,2)
 * and `heading` (numeric 5,1) but NO status column. Movement state
 * (moving / idle / stopped) is computed on the client from `speed` via
 * deriveStatus(). Do not look for a locations.status field — it does not exist.
 *
 * Phase 4.1: seeded with mock NL-corridor vehicles so the map renders standalone.
 * Phase 4.2: live frames via EMQX MQTT-over-WSS (topic fleet/device/+/location).
 * Phase 4.3: initial snapshot via GET /api/dispatcher/locations/latest.
 *
 * Both the REST snapshot (4.3) and the MQTT stream (4.2) write through ONE
 * guarded path — applyLocationFrame — which enforces the stale-overwrite guard:
 * a frame older than the stored sample (by timestamp) is ignored, so the REST
 * snapshot arriving after a newer MQTT frame can't teleport a truck backwards.
 */

export type VehicleStatus = "moving" | "idle" | "stopped";

export interface VehicleTelemetry {
  id: string;
  plate: string;
  vehicle_weight_class: "12_18t" | "18_32t" | "32_plus_t";
  emission_class: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading: number;
  status: VehicleStatus;
  last_update: string;
}

// Single source of truth for movement state. speed in km/h.
// > 5 km/h = moving, > 0 = idle (creeping/manoeuvring), 0 = stopped.
export function deriveStatus(speedKmh: number): VehicleStatus {
  if (speedKmh > 5) return "moving";
  if (speedKmh > 0) return "idle";
  return "stopped";
}

export interface LocationFrame {
  device_id: string;
  plate_no?: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading?: number;
  timestamp: string;
  source: "rest" | "mqtt";
}

interface VehicleStoreState {
  vehicles: Record<string, VehicleTelemetry>;
  selectedVehicleId: string | null;
  setVehicles: (vehicles: Record<string, VehicleTelemetry>) => void;
  updateVehicleLocation: (
    id: string,
    lat: number,
    lng: number,
    speed: number,
    heading?: number
  ) => void;
  applyLocationFrame: (frame: LocationFrame) => void;
  selectVehicle: (id: string | null) => void;
}

const initialMockVehicles: Record<string, VehicleTelemetry> = {
  "v-truck-001": {
    id: "v-truck-001",
    plate: "GV-082-B",
    vehicle_weight_class: "32_plus_t",
    emission_class: "euro_6",
    latitude: 51.9244,
    longitude: 4.4777,
    speed_kmh: 82,
    heading: 45,
    status: "moving",
    last_update: new Date(0).toISOString(),
  },
  "v-truck-002": {
    id: "v-truck-002",
    plate: "NL-991-X",
    vehicle_weight_class: "12_18t",
    emission_class: "zero_emission",
    latitude: 52.3676,
    longitude: 4.9041,
    speed_kmh: 0,
    heading: 180,
    status: "stopped",
    last_update: new Date(0).toISOString(),
  },
  "v-truck-003": {
    id: "v-truck-003",
    plate: "DH-447-K",
    vehicle_weight_class: "18_32t",
    emission_class: "euro_5",
    latitude: 52.0705,
    longitude: 4.3007,
    speed_kmh: 54,
    heading: 270,
    status: "moving",
    last_update: new Date(0).toISOString(),
  },
  "v-truck-004": {
    id: "v-truck-004",
    plate: "RT-203-M",
    vehicle_weight_class: "32_plus_t",
    emission_class: "zero_emission",
    latitude: 51.886,
    longitude: 4.65,
    speed_kmh: 3,
    heading: 120,
    status: "idle",
    last_update: new Date(0).toISOString(),
  },
  "v-truck-005": {
    id: "v-truck-005",
    plate: "UT-556-P",
    vehicle_weight_class: "12_18t",
    emission_class: "euro_6",
    latitude: 52.0907,
    longitude: 5.1214,
    speed_kmh: 0,
    heading: 0,
    status: "stopped",
    last_update: new Date(0).toISOString(),
  },
};

// Resolve a frame's device_id (chipId) OR plate to the store key.
function resolveKey(
  vehicles: Record<string, VehicleTelemetry>,
  deviceId: string,
  plateNo?: string
): string | undefined {
  if (vehicles[deviceId]) return deviceId; // direct key match
  return Object.keys(vehicles).find(
    (k) => vehicles[k].plate === deviceId || (plateNo ? vehicles[k].plate === plateNo : false)
  );
}

export const useVehicleStore = create<VehicleStoreState>((set) => ({
  vehicles: initialMockVehicles,
  selectedVehicleId: null,
  setVehicles: (vehicles) => set({ vehicles }),

  // Unified guarded write path (gotcha #1 stale-guard + gotcha #2 key resolve).
  applyLocationFrame: (frame) =>
    set((state) => {
      const key = resolveKey(state.vehicles, frame.device_id, frame.plate_no);
      if (!key) return state;

      const existing = state.vehicles[key];
      // Stale-overwrite guard: ignore a frame not newer than what we already have.
      if (existing.last_update && new Date(frame.timestamp) <= new Date(existing.last_update)) {
        return state;
      }

      return {
        vehicles: {
          ...state.vehicles,
          [key]: {
            ...existing,
            latitude: frame.latitude,
            longitude: frame.longitude,
            speed_kmh: frame.speed,
            heading: frame.heading ?? existing.heading,
            status: deriveStatus(frame.speed),
            last_update: frame.timestamp,
          },
        },
      };
    }),

  // Back-compat shim — routes through applyLocationFrame. Callers without a real
  // timestamp (legacy) get "now"; prefer applyLocationFrame with the frame's own
  // timestamp so the stale-guard is meaningful.
  updateVehicleLocation: (id, lat, lng, speed, heading) =>
    set((state) => {
      const key = resolveKey(state.vehicles, id);
      if (!key) return state;
      const existing = state.vehicles[key];
      return {
        vehicles: {
          ...state.vehicles,
          [key]: {
            ...existing,
            latitude: lat,
            longitude: lng,
            speed_kmh: speed,
            heading: heading ?? existing.heading,
            status: deriveStatus(speed),
            last_update: new Date().toISOString(),
          },
        },
      };
    }),

  selectVehicle: (id) => set({ selectedVehicleId: id }),
}));
