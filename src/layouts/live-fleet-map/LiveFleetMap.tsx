import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import L from "leaflet";
import { MapContainer, Marker, Polyline, useMap } from "react-leaflet";

import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import TextField from "@mui/material/TextField";
import { alpha } from "@mui/material/styles";

import { density, map as mapTokens, prefersReducedMotion, status, type VehicleConnectivityStatus } from "assets/theme/tokens";
import MapControlWidget from "components/MapControlWidget";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useMaterialUIController } from "context";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { useActiveRoutes } from "hooks/useActiveRoutes";
import { useFleetSnapshot } from "hooks/useFleetSnapshot";
import { useMqttTelemetry } from "hooks/useMqttTelemetry";
import { useT, type TranslationKey } from "i18n";
import { useRouteLayerStore, isRouteVisible } from "store/useRouteLayerStore";
import { useVehicleStore } from "store/useVehicleStore";
import "leaflet/dist/leaflet.css";

import ConnectionBadge from "./ConnectionBadge";
import VehicleDetailPanel from "./VehicleDetailPanel";
import VehicleMarkers from "./VehicleMarkers";
import {
  connectivityColor,
  createDestFlagIcon,
  deriveFleetLink,
  expandClusterDemo,
  mapChrome,
  vehicleConnectivity,
} from "./mapChrome";
import { useMapKeyboard } from "./useMapKeyboard";

const INITIAL_CENTER: [number, number] = [52.1326, 5.2913];
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const fmtWeight = (w: string): string => w.replace("_plus_t", "+ t").replace(/_/g, "-");

const CONN_LABEL: Record<Exclude<VehicleConnectivityStatus, "maintenance">, TranslationKey> = {
  online: "map.statusOnline",
  stale: "map.statusStale",
  offline: "map.statusOffline",
};

type StatusFilter = "all" | "moving" | "stopped" | "ze";

interface ViewportCmd {
  kind: "select" | "fitFleet";
  seq: number;
  lat?: number;
  lng?: number;
  bounds?: L.LatLngBoundsExpression;
}

function Basemap({ darkMode }: { darkMode: boolean }): null {
  const leafletMap = useMap();
  const layerRef = useRef<L.TileLayer | null>(null);
  const url = darkMode ? mapTokens.tiles.dark : mapTokens.tiles.light;

  useEffect(() => {
    const layer = L.tileLayer(url, { attribution: TILE_ATTRIBUTION, subdomains: "abcd", maxZoom: 20 });
    layer.addTo(leafletMap);
    layerRef.current = layer;
    return () => {
      layer.remove();
      layerRef.current = null;
    };
    // Mount once — URL swaps go through setUrl.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletMap]);

  useEffect(() => {
    layerRef.current?.setUrl(url);
  }, [url]);

  return null;
}

function MapViewport({
  cmd,
  followLat,
  followLng,
  following,
  panelOpen,
  miniSidenav,
}: {
  cmd: ViewportCmd | null;
  followLat: number | null;
  followLng: number | null;
  following: boolean;
  panelOpen: boolean;
  miniSidenav: boolean;
}): null {
  const leafletMap = useMap();
  const paddingBottomRight: [number, number] = panelOpen ? [mapTokens.panelWidthPx, 0] : [0, 0];
  const paddingTopLeft: [number, number] = [0, 0];

  useEffect(() => {
    const id = window.setTimeout(() => leafletMap.invalidateSize(), 300);
    return () => window.clearTimeout(id);
  }, [leafletMap, miniSidenav]);

  useEffect(() => {
    const onResize = (): void => {
      leafletMap.invalidateSize();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [leafletMap]);

  useEffect(() => {
    if (!cmd) return;
    if (cmd.kind === "fitFleet" && cmd.bounds) {
      leafletMap.fitBounds(cmd.bounds, {
        paddingTopLeft,
        paddingBottomRight,
        maxZoom: 14,
        animate: true,
      });
      return;
    }
    if (cmd.kind === "select" && cmd.lat != null && cmd.lng != null) {
      const bounds = L.latLng(cmd.lat, cmd.lng).toBounds(140);
      leafletMap.fitBounds(bounds, {
        paddingTopLeft,
        paddingBottomRight,
        maxZoom: Math.max(leafletMap.getZoom(), 13),
        animate: true,
      });
    }
    // seq is the one-shot trigger (zoom-loop guard).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmd?.seq]);

  useEffect(() => {
    if (!following || followLat == null || followLng == null) return;
    leafletMap.panTo([followLat, followLng], { animate: true });
  }, [leafletMap, following, followLat, followLng]);

  return null;
}

function LiveFleetMap(): JSX.Element {
  const { t, lang } = useT();
  const [controller] = useMaterialUIController();
  const darkMode = Boolean(controller.darkMode);
  const chrome = mapChrome(darkMode);
  const { vehicles, selectedVehicleId, selectVehicle } = useVehicleStore();
  const { state: mqttState, configured: mqttConfigured, lastMessageAt } = useMqttTelemetry();
  const snapshot = useFleetSnapshot();
  const activeRoutes = useActiveRoutes();
  const { showAllRoutes, selectedRouteVehicleIds, hoveredVehicleId, setHoveredVehicle } =
    useRouteLayerStore();

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewportCmd, setViewportCmd] = useState<ViewportCmd | null>(null);
  const [following, setFollowing] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const destFlagIcon = useMemo(() => createDestFlagIcon(), []);

  const bumpViewport = useCallback((next: Omit<ViewportCmd, "seq">) => {
    setViewportCmd((prev) => ({ ...next, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  const [searchParams] = useSearchParams();
  const clusterDemo = searchParams.get("clusterDemo") === "1";

  const rosterReady = snapshot.bootstrapped || snapshot.phase === "error";
  const vehicleList = useMemo(() => {
    if (!rosterReady) return [];
    const raw = Object.values(vehicles);
    return clusterDemo ? expandClusterDemo(raw) : raw;
  }, [vehicles, rosterReady, clusterDemo]);

  useEffect(() => {
    const focusPlate = searchParams.get("focusPlate");
    if (!focusPlate) return;
    const match = vehicleList.find((v) => v.plate.toLowerCase() === focusPlate.toLowerCase());
    if (match) {
      selectVehicle(match.id);
      bumpViewport({ kind: "select", lat: match.latitude, lng: match.longitude });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, vehicleList.length]);

  const filteredVehicles = vehicleList.filter((v) => {
    const matchesSearch = v.plate.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesFilter = true;
    if (statusFilter === "moving") matchesFilter = v.status === "moving";
    else if (statusFilter === "stopped")
      matchesFilter = v.status === "stopped" || v.status === "idle";
    else if (statusFilter === "ze") matchesFilter = v.emission_class === "zero_emission";
    return matchesSearch && matchesFilter;
  });

  const routeVisibleFor = (deviceId: string): boolean =>
    isRouteVisible({ showAllRoutes, selectedRouteVehicleIds }, deviceId, selectedVehicleId);

  const selectedVehicle = selectedVehicleId ? vehicles[selectedVehicleId] : null;
  const panelOpen = Boolean(selectedVehicle);

  const handleVehicleSelect = (id: string): void => {
    selectVehicle(id);
    const v = vehicles[id] ?? vehicleList.find((item) => item.id === id);
    if (v) bumpViewport({ kind: "select", lat: v.latitude, lng: v.longitude });
  };

  const fitFleet = useCallback(() => {
    if (filteredVehicles.length === 0) return;
    const bounds = L.latLngBounds(
      filteredVehicles.map((v) => [v.latitude, v.longitude] as [number, number])
    );
    bumpViewport({ kind: "fitFleet", bounds });
  }, [filteredVehicles, bumpViewport]);

  const closePanel = useCallback(() => {
    selectVehicle(null);
    setFollowing(false);
  }, [selectVehicle]);

  const toggleFollow = useCallback(() => {
    if (!selectedVehicleId) return;
    setFollowing((prev) => !prev);
  }, [selectedVehicleId]);

  const toggleHelp = useCallback(() => setHelpOpen((prev) => !prev), []);

  useMapKeyboard({
    searchRef,
    panelOpen,
    helpOpen,
    onClosePanel: closePanel,
    onFitFleet: fitFleet,
    onToggleFollow: toggleFollow,
    onToggleHelp: toggleHelp,
  });

  const lastVehicleAt = useMemo(() => {
    let latest = 0;
    vehicleList.forEach((v) => {
      const ts = new Date(v.last_update).getTime();
      if (Number.isFinite(ts) && ts > latest) latest = ts;
    });
    return latest > 0 ? latest : null;
  }, [vehicleList]);

  const link = deriveFleetLink({
    mqttConfigured,
    mqttState,
    lastMqttAt: lastMessageAt,
    snapshotPhase: snapshot.phase,
    lastSnapshotAt: snapshot.lastOkAt,
    lastVehicleAt,
    now,
  });

  const badgeWhen =
    link === "live"
      ? lastMessageAt
      : link === "polling"
      ? snapshot.lastOkAt
      : lastVehicleAt;

  const followLat = following && selectedVehicle ? selectedVehicle.latitude : null;
  const followLng = following && selectedVehicle ? selectedVehicle.longitude : null;

  const emissionChip = (e: string) => {
    if (e === "zero_emission") {
      return (
        <Chip
          label={t("map.ze")}
          size="small"
          sx={{
            fontSize: "9px",
            height: "18px",
            bgcolor: alpha(mapTokens.ze, 0.15),
            color: mapTokens.ze,
            border: `1px solid ${mapTokens.ze}`,
          }}
        />
      );
    }
    return (
      <Chip
        label={e.toUpperCase().replace("_", " ")}
        size="small"
        sx={{
          fontSize: "9px",
          height: "18px",
          bgcolor: chrome.chipBg,
          color: chrome.textMuted,
          border: `1px solid ${chrome.border}`,
        }}
      />
    );
  };

  const listBody = (): JSX.Element => {
    if (snapshot.phase === "loading" && !snapshot.bootstrapped) {
      return (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={64}
              sx={{ mb: 1, bgcolor: alpha(chrome.text, 0.08) }}
            />
          ))}
        </>
      );
    }
    if (snapshot.phase === "error" && !snapshot.bootstrapped) {
      return (
        <MDBox textAlign="center" mt={3} px={1}>
          <MDTypography variant="caption" sx={{ color: chrome.textMuted, display: "block", mb: 1 }}>
            {t("map.error")}
          </MDTypography>
          <MDBox
            component="button"
            type="button"
            onClick={snapshot.refetch}
            sx={{
              border: `1px solid ${chrome.border}`,
              bgcolor: chrome.panelBg,
              color: chrome.text,
              borderRadius: "8px",
              px: 1.5,
              py: 0.75,
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            {t("map.retry")}
          </MDBox>
        </MDBox>
      );
    }
    if (vehicleList.length === 0) {
      return (
        <MDBox textAlign="center" mt={3} px={1}>
          <MDTypography variant="caption" sx={{ color: chrome.textMuted, display: "block", mb: 1 }}>
            {t("map.empty")}
          </MDTypography>
          <MDTypography
            component={Link}
            to="/dispatcher/vehicles"
            variant="caption"
            fontWeight="bold"
            sx={{ color: mapTokens.selected }}
          >
            {t("map.emptyCta")}
          </MDTypography>
        </MDBox>
      );
    }
    if (filteredVehicles.length === 0) {
      return (
        <MDTypography
          variant="caption"
          sx={{ color: chrome.textFaint, display: "block", textAlign: "center", mt: 3 }}
        >
          {t("map.noMatch")}
        </MDTypography>
      );
    }
    return (
      <>
        {filteredVehicles.map((v) => {
          const conn = vehicleConnectivity(v.last_update, now);
          return (
            <Paper
              elevation={0}
              key={v.id}
              onMouseEnter={() => setHoveredVehicle(v.id)}
              onMouseLeave={() => setHoveredVehicle(null)}
              sx={{
                mb: 1,
                borderRadius: "10px",
                border: "1px solid",
                borderColor:
                  selectedVehicleId === v.id || hoveredVehicleId === v.id
                    ? mapTokens.selected
                    : chrome.border,
                backgroundColor: selectedVehicleId === v.id ? chrome.panelBgSel : chrome.panelBg,
                boxShadow:
                  hoveredVehicleId === v.id ? `0 0 10px ${alpha(mapTokens.selected, 0.35)}` : "none",
                transition: "all 0.2s linear",
              }}
            >
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleVehicleSelect(v.id)}
                  sx={{ p: 1.5, flexDirection: "column", alignItems: "stretch" }}
                >
                  <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <MDTypography
                      variant="button"
                      fontWeight="bold"
                      sx={{ display: "flex", alignItems: "center", gap: 1, color: chrome.text }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: connectivityColor(conn),
                        }}
                      />
                      {v.plate}
                    </MDTypography>
                    <MDTypography variant="caption" fontWeight="bold" sx={{ color: chrome.text }}>
                      {v.speed_kmh}{" "}
                      <span style={{ color: chrome.textFaint, fontSize: "10px" }}>{t("map.kmh")}</span>
                    </MDTypography>
                  </MDBox>
                  <MDBox display="flex" gap={0.5}>
                    <Chip
                      label={fmtWeight(v.vehicle_weight_class)}
                      size="small"
                      sx={{
                        fontSize: "9px",
                        height: "18px",
                        bgcolor: chrome.chipBg,
                        color: chrome.text,
                        border: `1px solid ${chrome.border}`,
                      }}
                    />
                    {emissionChip(v.emission_class)}
                  </MDBox>
                </ListItemButton>
              </ListItem>
            </Paper>
          );
        })}
      </>
    );
  };

  return (
    <DashboardLayout>
      <MDBox
        sx={{
          mx: -3,
          mt: -3,
          mb: -3,
          display: "flex",
          flexDirection: "column",
          height: "100dvh",
          maxHeight: "100vh",
        }}
      >
        <DashboardNavbar />
        <Grid
          container
          spacing={0}
          sx={{
            flex: 1,
            minHeight: 0,
            height: `calc(100dvh - ${density.navbar}px)`,
            maxHeight: `calc(100vh - ${density.navbar}px)`,
            overflow: "hidden",
            flexWrap: { xs: "nowrap", md: "wrap" },
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          <Grid
            item
            xs={12}
            md={4}
            lg={3.5}
            sx={{
              height: { xs: "38%", md: "100%" },
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              bgcolor: chrome.sidebarBg,
              p: 2,
              borderRight: `1px solid ${chrome.border}`,
            }}
          >
            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <MDTypography
                variant="h2"
                fontWeight="bold"
                sx={{ display: "flex", alignItems: "center", gap: 1, color: chrome.text, fontSize: "1.15rem" }}
              >
                <Icon sx={{ color: mapTokens.selected }}>navigation</Icon> {t("map.title")}
              </MDTypography>
              <MDBox display="flex" alignItems="center" gap={0.75}>
                <ConnectionBadge link={link} when={badgeWhen} now={now} lang={lang} />
                <Chip
                  label={t("map.activeCount", { count: filteredVehicles.length })}
                  size="small"
                  sx={{
                    bgcolor: chrome.border,
                    color: chrome.textMuted,
                    fontWeight: "bold",
                    fontSize: "11px",
                  }}
                />
              </MDBox>
            </MDBox>

            <MDBox mb={2}>
              <TextField
                inputRef={searchRef}
                fullWidth
                size="small"
                placeholder={t("map.searchPlate")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                inputProps={{ "aria-label": t("map.searchAria") }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Icon style={{ color: chrome.textMuted }}>search</Icon>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: chrome.text,
                    bgcolor: chrome.inputBg,
                    "& fieldset": { borderColor: chrome.border },
                    "&:hover fieldset": { borderColor: mapTokens.selected },
                    "&.Mui-focused fieldset": { borderColor: mapTokens.selected },
                  },
                  "& .MuiInputBase-input::placeholder": { color: chrome.textFaint, opacity: 1 },
                }}
              />
            </MDBox>

            <MDBox display="flex" gap={0.5} flexWrap="wrap" mb={2}>
              <Chip
                label={t("map.filterAll")}
                size="small"
                onClick={() => setStatusFilter("all")}
                sx={{
                  bgcolor: statusFilter === "all" ? mapTokens.selected : chrome.border,
                  color: chrome.text,
                  cursor: "pointer",
                }}
              />
              <Chip
                label={t("map.filterMoving")}
                size="small"
                onClick={() => setStatusFilter("moving")}
                sx={{
                  bgcolor: statusFilter === "moving" ? status.vehicle.online.border : chrome.border,
                  color: chrome.text,
                  cursor: "pointer",
                }}
              />
              <Chip
                label={t("map.filterStopped")}
                size="small"
                onClick={() => setStatusFilter("stopped")}
                sx={{
                  bgcolor: statusFilter === "stopped" ? status.vehicle.offline.border : chrome.border,
                  color: chrome.text,
                  cursor: "pointer",
                }}
              />
              <Chip
                label={t("map.filterElectric")}
                size="small"
                onClick={() => setStatusFilter("ze")}
                sx={{
                  bgcolor: statusFilter === "ze" ? mapTokens.ze : chrome.border,
                  color: chrome.text,
                  cursor: "pointer",
                }}
              />
            </MDBox>

            <Divider sx={{ my: 1, borderColor: chrome.border }} />

            <List
              sx={{
                flexGrow: 1,
                overflowY: "auto",
                pr: 0.5,
                "&::-webkit-scrollbar": { width: "4px" },
                "&::-webkit-scrollbar-thumb": { bgcolor: chrome.border, borderRadius: "4px" },
              }}
            >
              {listBody()}
            </List>
          </Grid>

          <Grid
            item
            xs={12}
            md={8}
            lg={8.5}
            sx={{ height: { xs: "62%", md: "100%" }, minHeight: 0, position: "relative" }}
          >
            <MDBox
              role="region"
              aria-label={t("map.region")}
              width="100%"
              height="100%"
              sx={{
                "& .leaflet-container": {
                  height: "100%",
                  width: "100%",
                  zIndex: 1,
                  bgcolor: chrome.leafletBg,
                },
              }}
            >
              <MapContainer
                center={INITIAL_CENTER}
                zoom={8}
                scrollWheelZoom
                zoomControl={false}
                zoomAnimation={!prefersReducedMotion()}
                markerZoomAnimation={!prefersReducedMotion()}
              >
                <Basemap darkMode={darkMode} />
                <MapViewport
                  cmd={viewportCmd}
                  followLat={followLat}
                  followLng={followLng}
                  following={following}
                  panelOpen={panelOpen}
                  miniSidenav={Boolean(controller.miniSidenav)}
                />

                <VehicleMarkers
                  vehicles={filteredVehicles}
                  selectedVehicleId={selectedVehicleId}
                  now={now}
                  onSelect={(id) => selectVehicle(id)}
                  onHover={setHoveredVehicle}
                />

                {filteredVehicles.map((truck) => {
                  const r = activeRoutes[truck.id];
                  if (!r || !routeVisibleFor(truck.id)) return null;
                  const hasGeo = !!(r.geometry && r.geometry.length > 1);
                  const isHovered = hoveredVehicleId === truck.id;
                  const line: [number, number][] = hasGeo
                    ? (r.geometry as [number, number][])
                    : [
                        [truck.latitude, truck.longitude],
                        [r.dropoff.lat, r.dropoff.lng],
                      ];
                  return (
                    <Polyline
                      key={`route-${truck.id}`}
                      positions={line}
                      eventHandlers={{
                        mouseover: () => setHoveredVehicle(truck.id),
                        mouseout: () => setHoveredVehicle(null),
                      }}
                      pathOptions={{
                        color: isHovered ? mapTokens.routeHover : mapTokens.route,
                        weight: isHovered ? 6 : hasGeo ? 4 : 3,
                        dashArray: hasGeo ? undefined : "8 10",
                        opacity: isHovered ? 1 : 0.85,
                      }}
                    />
                  );
                })}
                {filteredVehicles.map((truck) => {
                  const r = activeRoutes[truck.id];
                  if (!r || !routeVisibleFor(truck.id)) return null;
                  return (
                    <Marker
                      key={`dest-${truck.id}`}
                      position={[r.dropoff.lat, r.dropoff.lng]}
                      icon={destFlagIcon}
                      title={truck.plate}
                      alt={truck.plate}
                    />
                  );
                })}
              </MapContainer>

              {selectedVehicle && (
                <VehicleDetailPanel
                  vehicle={selectedVehicle}
                  chrome={chrome}
                  now={now}
                  lang={lang}
                  onClose={closePanel}
                  onCenter={() =>
                    bumpViewport({
                      kind: "select",
                      lat: selectedVehicle.latitude,
                      lng: selectedVehicle.longitude,
                    })
                  }
                />
              )}

              <MapControlWidget offsetRight={panelOpen ? mapTokens.panelWidthPx + 16 : 16} />

              <Paper
                elevation={0}
                sx={{
                  position: "absolute",
                  bottom: 16,
                  left: 16,
                  zIndex: 1000,
                  p: 1.5,
                  minWidth: 108,
                  bgcolor: chrome.sidebarBg,
                  borderRadius: "8px",
                  border: `1px solid ${chrome.border}`,
                }}
              >
                <MDBox display="flex" flexDirection="column" gap={0.5}>
                  {(["online", "stale", "offline"] as const).map((s) => (
                    <MDTypography
                      key={s}
                      variant="caption"
                      sx={{ display: "flex", alignItems: "center", gap: 1, color: chrome.text }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: connectivityColor(s),
                        }}
                      />{" "}
                      {t(CONN_LABEL[s])}
                    </MDTypography>
                  ))}
                </MDBox>
              </Paper>

              {helpOpen && (
                <Paper
                  elevation={0}
                  role="dialog"
                  aria-label={t("map.shortcutsTitle")}
                  sx={{
                    position: "absolute",
                    bottom: 16,
                    left: 140,
                    zIndex: 1200,
                    p: 1.5,
                    minWidth: 220,
                    bgcolor: chrome.sidebarBg,
                    borderRadius: "8px",
                    border: `1px solid ${chrome.border}`,
                  }}
                >
                  <MDTypography variant="caption" fontWeight="bold" sx={{ color: chrome.text, display: "block", mb: 1 }}>
                    {t("map.shortcutsTitle")}
                  </MDTypography>
                  {(
                    [
                      ["/", "map.shortcutSearch"],
                      ["F", "map.shortcutFit"],
                      ["T", "map.shortcutFollow"],
                      ["Esc", "map.shortcutClose"],
                      ["?", "map.shortcutHelp"],
                    ] as const
                  ).map(([key, label]) => (
                    <MDBox key={key} display="flex" justifyContent="space-between" gap={2} mb={0.5}>
                      <MDTypography variant="caption" sx={{ fontFamily: "monospace", color: mapTokens.selected }}>
                        {key}
                      </MDTypography>
                      <MDTypography variant="caption" sx={{ color: chrome.textMuted }}>
                        {t(label)}
                      </MDTypography>
                    </MDBox>
                  ))}
                </Paper>
              )}
            </MDBox>
          </Grid>
        </Grid>
      </MDBox>
    </DashboardLayout>
  );
}

export default LiveFleetMap;
