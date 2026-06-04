import { create } from "zustand";

/**
 * Live Fleet Map — vehicle telemetry store (Sıra 4.1 / 4.2).
 *
 * IMPORTANT — `status` is a DERIVED UI value, not a DB column.
 * Verified 2026-06-04 against prod: `public.locations` has `speed` (numeric 6,2)
 * and `heading` (numeric 5,1) but NO status column. Movement state
 * (moving / idle / stopped) is computed on the client from `speed` via
 * deriveStatus(). Do not look for a locations.status field in 4.2/4.3 — it
 * does not exist; derive it here from the speed in each telemetry frame.
 *
 * Phase 4.1: seeded with mock NL-corridor vehicles so the map renders standalone.
 * Phase 4.2: setVehicles / updateVehicleLocation driven by EMQX MQTT-over-WSS
 *   (topic fleet/device/+/location) per ADR-0006 §4.
 * Phase 4.3: initial snapshot from GET /api/locations/latest (to be written).
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
  selectVehicle: (id: string | null) => void;
}

const initialMockVehicles: Record<string, VehicleTelemetry> = {
  "v-truck-001": {
    id: "v-truck-001",
    plate: "GV-082-B",
    vehicle_weight_class: "32_plus_t",
    emission_class: "euro_6",
    latitude: 51.9244, // Rotterdam port area
    longitude: 4.4777,
    speed_kmh: 82,
    heading: 45,
    status: "moving",
    last_update: new Date().toISOString(),
  },
  "v-truck-002": {
    id: "v-truck-002",
    plate: "NL-991-X",
    vehicle_weight_class: "12_18t",
    emission_class: "zero_emission",
    latitude: 52.3676, // Amsterdam
    longitude: 4.9041,
    speed_kmh: 0,
    heading: 180,
    status: "stopped",
    last_update: new Date().toISOString(),
  },
  "v-truck-003": {
    id: "v-truck-003",
    plate: "DH-447-K",
    vehicle_weight_class: "18_32t",
    emission_class: "euro_5",
    latitude: 52.0705, // Den Haag
    longitude: 4.3007,
    speed_kmh: 54,
    heading: 270,
    status: "moving",
    last_update: new Date().toISOString(),
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
    last_update: new Date().toISOString(),
  },
  "v-truck-005": {
    id: "v-truck-005",
    plate: "UT-556-P",
    vehicle_weight_class: "12_18t",
    emission_class: "euro_6",
    latitude: 52.0907, // Utrecht
    longitude: 5.1214,
    speed_kmh: 0,
    heading: 0,
    status: "stopped",
    last_update: new Date().toISOString(),
  },
};

export const useVehicleStore = create<VehicleStoreState>((set) => ({
  vehicles: initialMockVehicles,
  selectedVehicleId: null,
  setVehicles: (vehicles) => set({ vehicles }),
  updateVehicleLocation: (id, lat, lng, speed, heading) =>
    set((state) => {
      // id may be the store key (v-truck-001) OR the plate/chipId (GV-082-B).
      // Resolve: direct key first, else find by plate.
      let key = state.vehicles[id]
        ? id
        : Object.keys(state.vehicles).find((k) => state.vehicles[k].plate === id);
      if (!key) return state;
      return {
        vehicles: {
          ...state.vehicles,
          [key]: {
            ...state.vehicles[key],
            latitude: lat,
            longitude: lng,
            speed_kmh: speed,
            heading: heading ?? state.vehicles[id].heading,
            status: deriveStatus(speed),
            last_update: new Date().toISOString(),
          },
        },
      };
    }),
  selectVehicle: (id) => set({ selectedVehicleId: id }),
}));
