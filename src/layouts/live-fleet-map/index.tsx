import React, { useEffect } from "react";

// Leaflet & react-leaflet
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";

// Material Dashboard 2 PRO React TS (baseUrl: "src" — no src/ prefix)
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";

// Store
import { useVehicleStore } from "store/useVehicleStore";

// Leaflet CSS (required — without it the map renders broken)
import "leaflet/dist/leaflet.css";

// CRA/Webpack default-marker-icon fix: bundlers break Leaflet's relative icon URLs,
// so point them at the CDN explicitly.
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Recenters the map when the selected vehicle changes.
function ChangeMapView({ center }: { center: [number, number] }): null {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function LiveFleetMap(): JSX.Element {
  const { vehicles, selectedVehicleId, selectVehicle } = useVehicleStore();
  const vehicleList = Object.values(vehicles);

  // Default center: geographic middle of the Netherlands.
  let mapCenter: [number, number] = [52.1326, 5.2913];
  if (selectedVehicleId && vehicles[selectedVehicleId]) {
    mapCenter = [vehicles[selectedVehicleId].latitude, vehicles[selectedVehicleId].longitude];
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox my={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ height: "calc(100vh - 220px)", overflow: "hidden" }}>
              <MDBox p={3} display="flex" justifyContent="space-between" alignItems="center">
                <MDBox>
                  <MDTypography variant="h5" fontWeight="medium">
                    Live Fleet Telemetry Map
                  </MDTypography>
                  <MDTypography variant="button" color="text" fontWeight="regular">
                    Real-time HGV location monitoring via EMQX WSS gateway.
                  </MDTypography>
                </MDBox>
                <MDBox
                  variant="gradient"
                  bgColor="info"
                  color="white"
                  borderRadius="lg"
                  p={1}
                  px={2}
                >
                  <MDTypography variant="caption" color="inherit" fontWeight="bold">
                    Active Assets: {vehicleList.length}
                  </MDTypography>
                </MDBox>
              </MDBox>

              {/* Map layer */}
              <MDBox
                width="100%"
                height="100%"
                position="relative"
                sx={{
                  "& .leaflet-container": { height: "100%", width: "100%", zIndex: 1 },
                }}
              >
                <MapContainer center={mapCenter} zoom={8} scrollWheelZoom>
                  <ChangeMapView center={mapCenter} />

                  {/*
                    Phase 4.1 dev tiles: OpenStreetMap direct (no API key needed).
                    Phase 2 / production: switch to MapTiler per ADR-0006 §3.4
                    (OSM direct is not for heavy commercial traffic).
                  */}
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />

                  <MarkerClusterGroup chunkedLoading>
                    {vehicleList.map((truck) => (
                      <Marker
                        key={truck.id}
                        position={[truck.latitude, truck.longitude]}
                        eventHandlers={{ click: () => selectVehicle(truck.id) }}
                      >
                        <Popup>
                          <MDBox p={1}>
                            <MDTypography variant="subtitle2" fontWeight="bold" color="info">
                              Plate: {truck.plate}
                            </MDTypography>
                            <MDTypography variant="caption" display="block" color="text">
                              Weight Class: <b>{truck.vehicle_weight_class}</b>
                            </MDTypography>
                            <MDTypography variant="caption" display="block" color="text">
                              Emission: <b>{truck.emission_class.toUpperCase()}</b>
                            </MDTypography>
                            <MDTypography variant="caption" display="block" color="text">
                              Speed: <b>{truck.speed_kmh} km/h</b>
                            </MDTypography>
                            <MDTypography
                              variant="caption"
                              display="block"
                              color="dark"
                              sx={{ mt: 1 }}
                            >
                              Last Ping: {new Date(truck.last_update).toLocaleTimeString()}
                            </MDTypography>
                          </MDBox>
                        </Popup>
                      </Marker>
                    ))}
                  </MarkerClusterGroup>
                </MapContainer>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default LiveFleetMap;
