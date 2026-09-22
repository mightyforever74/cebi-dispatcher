import { Marker, Tooltip } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { map as mapTokens } from "assets/theme/tokens";
import type { VehicleTelemetry } from "store/useVehicleStore";
import { createClusterIcon, createVehicleSvgIcon } from "./mapChrome";

interface VehicleMarkersProps {
  vehicles: VehicleTelemetry[];
  selectedVehicleId: string | null;
  now: number;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function VehicleMarkerList({
  vehicles,
  selectedVehicleId,
  now,
  onSelect,
  onHover,
}: VehicleMarkersProps): JSX.Element {
  return (
    <>
      {vehicles.map((truck) => (
        <Marker
          key={truck.id}
          position={[truck.latitude, truck.longitude]}
          icon={createVehicleSvgIcon(truck, selectedVehicleId === truck.id, now)}
          title={truck.plate}
          alt={truck.plate}
          eventHandlers={{
            click: () => onSelect(truck.id),
            mouseover: () => onHover(truck.id),
            mouseout: () => onHover(null),
          }}
        >
          <Tooltip direction="top" offset={[0, -18]} opacity={1}>
            {truck.plate}
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}

function VehicleMarkers(props: VehicleMarkersProps): JSX.Element {
  const clustered = props.vehicles.length >= mapTokens.clusterMinVehicles;
  if (!clustered) {
    return <VehicleMarkerList {...props} />;
  }
  return (
    <MarkerClusterGroup
      chunkedLoading
      showCoverageOnHover={false}
      disableClusteringAtZoom={mapTokens.clusterDisableZoom}
      iconCreateFunction={createClusterIcon}
    >
      <VehicleMarkerList {...props} />
    </MarkerClusterGroup>
  );
}

export default VehicleMarkers;
