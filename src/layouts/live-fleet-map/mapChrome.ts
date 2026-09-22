import L from "leaflet";
import { map as mapTokens, status, type VehicleConnectivityStatus } from "assets/theme/tokens";
import type { VehicleTelemetry } from "store/useVehicleStore";

export interface MapChrome {
  sidebarBg: string;
  panelBg: string;
  panelBgSel: string;
  border: string;
  inputBg: string;
  text: string;
  textMuted: string;
  textFaint: string;
  leafletBg: string;
  chipBg: string;
}

export function mapChrome(darkMode: boolean): MapChrome {
  return darkMode ? mapTokens.dark : mapTokens.light;
}

export function vehicleConnectivity(
  lastUpdate: string | number | Date | null | undefined,
  now: number = Date.now()
): VehicleConnectivityStatus {
  if (lastUpdate == null) return "offline";
  const t0 = typeof lastUpdate === "number" ? lastUpdate : new Date(lastUpdate).getTime();
  if (!Number.isFinite(t0) || t0 <= 0) return "offline";
  if (now - t0 > mapTokens.staleMs) return "stale";
  return "online";
}

export function connectivityColor(kind: VehicleConnectivityStatus): string {
  return status.vehicle[kind].border;
}

export function createVehicleSvgIcon(
  truck: VehicleTelemetry,
  isSelected: boolean,
  now: number
): L.DivIcon {
  const kind = vehicleConnectivity(truck.last_update, now);
  const color = connectivityColor(kind);
  const stroke = isSelected ? mapTokens.selected : mapTokens.markerStroke;
  const strokeWidth = isSelected ? 3 : 1.5;
  const glow = isSelected ? `filter: drop-shadow(0 0 8px ${mapTokens.selected});` : "";

  const html = `
    <div style="transform: rotate(${truck.heading}deg); width:32px; height:32px; display:flex; align-items:center; justify-content:center; ${glow}">
      <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="15" cy="15" r="13" fill="${color}" fill-opacity="0.22"/>
        <circle cx="15" cy="15" r="8" fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <path d="M15 4 L19 12 L15 10 L11 12 Z" fill="${color}" stroke="${mapTokens.markerStroke}" stroke-width="0.8"/>
      </svg>
    </div>`;

  return L.divIcon({
    html,
    className: "tf-vehicle-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

export function createDestFlagIcon(): L.DivIcon {
  return L.divIcon({
    html: `<svg width="20" height="24" viewBox="0 0 20 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><line x1="3" y1="1" x2="3" y2="23" stroke="${mapTokens.markerStroke}" stroke-width="2"/><path d="M3 2 L17 6 L3 10 Z" fill="${mapTokens.selected}" stroke="${mapTokens.markerStroke}" stroke-width="0.5"/></svg>`,
    className: "tf-dest-flag",
    iconSize: [20, 24],
    iconAnchor: [3, 23],
  });
}

export function createClusterIcon(cluster: { getChildCount: () => number }): L.DivIcon {
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `<div class="tf-map-cluster"><span>${count}</span></div>`,
    className: "tf-map-cluster-wrap",
    iconSize: L.point(40, 40),
  });
}

export type MqttConnState = "connecting" | "connected" | "error" | "closed";
export type SnapshotPhase = "loading" | "ready" | "error";
export type FleetLinkState = "live" | "polling" | "stale" | "offline";

export function deriveFleetLink(args: {
  mqttConfigured: boolean;
  mqttState: MqttConnState;
  lastMqttAt: number | null;
  snapshotPhase: SnapshotPhase;
  lastSnapshotAt: number | null;
  lastVehicleAt: number | null;
  now?: number;
}): FleetLinkState {
  const now = args.now ?? Date.now();
  if (
    args.mqttConfigured &&
    args.mqttState === "connected" &&
    args.lastMqttAt != null &&
    now - args.lastMqttAt < mapTokens.liveMs
  ) {
    return "live";
  }
  const restFresh =
    args.lastSnapshotAt != null && now - args.lastSnapshotAt < mapTokens.restPollMs + 8000;
  if (args.snapshotPhase === "loading" || restFresh) {
    return "polling";
  }
  if (args.lastVehicleAt != null && args.lastVehicleAt > 0) {
    return "stale";
  }
  return "offline";
}

const DEMO_SEED: VehicleTelemetry = {
  id: "cluster-demo-seed",
  plate: "CL-00",
  vehicle_weight_class: "18_32t",
  emission_class: "euro_6",
  latitude: 52.1326,
  longitude: 5.2913,
  speed_kmh: 40,
  heading: 45,
  status: "moving",
  last_update: new Date().toISOString(),
};

/** Local ≥20-vehicle scene for clustering screenshots (`?clusterDemo=1`). */
export function expandClusterDemo(list: VehicleTelemetry[]): VehicleTelemetry[] {
  const out = [...list];
  let i = 0;
  while (out.length < mapTokens.clusterMinVehicles) {
    const src = list.length > 0 ? list[i % list.length] : DEMO_SEED;
    out.push({
      ...src,
      id: `cluster-demo-${i}`,
      plate: `CL-${String(i + 1).padStart(2, "0")}`,
      latitude: src.latitude + ((i % 5) - 2) * 0.06,
      longitude: src.longitude + (Math.floor(i / 5) - 2) * 0.08,
      last_update: new Date().toISOString(),
    });
    i += 1;
  }
  return out;
}
