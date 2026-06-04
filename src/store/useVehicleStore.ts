import { create } from "zustand";

/**
 * Live Fleet Map — vehicle telemetry store (Sıra 4.1).
 *
 * Phase 4.1: seeded with mock NL-corridor vehicles so the map renders standalone.
 * Phase 4.2: setVehicles / updateVehicleLocation will be driven by the EMQX
 *   MQTT-over-WSS stream (topic fleet/device/+/location) per ADR-0006 §4.
 * Phase 4.3: initial snapshot from GET /api/locations/latest (enterprise backend).
 */

export interface VehicleTelemetry {
  id: string;
  plate: string;
  vehicle_weight_class: "12_18t" | "18_32t" | "32_plus_t";
  emission_class: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading: number;
  status: "moving" | "idle" | "stopped";
  last_update: string;
}

interface VehicleStoreState {
  vehicles: Record<string, VehicleTelemetry>;
  selectedVehicleId: string | null;
  setVehicles: (vehicles: Record<string, VehicleTelemetry>) => void;
  updateVehicleLocation: (id: string, lat: number, lng: number, speed: number) => void;
  selectVehicle: (id: string | null) => void;
}

// Mock NL logistics-corridor vehicles (Rotterdam port / Amsterdam) for 4.1 standalone render.
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
};

export const useVehicleStore = create<VehicleStoreState>((set) => ({
  vehicles: initialMockVehicles,
  selectedVehicleId: null,
  setVehicles: (vehicles) => set({ vehicles }),
  updateVehicleLocation: (id, lat, lng, speed) =>
    set((state) => {
      if (!state.vehicles[id]) return state;
      return {
        vehicles: {
          ...state.vehicles,
          [id]: {
            ...state.vehicles[id],
            latitude: lat,
            longitude: lng,
            speed_kmh: speed,
            status: speed > 5 ? "moving" : speed > 0 ? "idle" : "stopped",
            last_update: new Date().toISOString(),
          },
        },
      };
    }),
  selectVehicle: (id) => set({ selectedVehicleId: id }),
}));
