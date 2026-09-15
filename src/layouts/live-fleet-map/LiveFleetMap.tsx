import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// Leaflet & react-leaflet
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";

// MUI
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";

// Material Dashboard 2 PRO React TS
import GlassPanel from "components/GlassPanel";
import MapControlWidget from "components/MapControlWidget";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import Footer from "examples/Footer";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

// Store
import { useVehicleStore, VehicleStatus, VehicleTelemetry } from "store/useVehicleStore";
import { useRouteLayerStore, isRouteVisible } from "store/useRouteLayerStore";

// Leaflet CSS
import { useMqttTelemetry } from "hooks/useMqttTelemetry";
import { useFleetSnapshot } from "hooks/useFleetSnapshot";
import { useActiveRoutes } from "hooks/useActiveRoutes";
import { useT, type TranslationKey } from "i18n";
import "leaflet/dist/leaflet.css";

const STATUS_COLOR: Record<VehicleStatus, string> = {
  moving: "#4caf50",
  idle: "#fb8c00",
  stopped: "#f44336",
};
const C = {
  sidebarBg: "#1a2035",
  panelBg: "#151a30",
  panelBgSel: "#222b45",
  border: "#2c3454",
  accent: "#7C3AED", // brand violet (palette.gradients.brand.main)
  ze: "#00bcd4",
  inputBg: "#131826",
  textMuted: "#8f9bb3",
  textFaint: "#65718c",
};

// NL genel bakış — sayfa ilk yüklendiğindeki sabit kadraj (auto-fit yalnız burada)
const INITIAL_CENTER: [number, number] = [52.1326, 5.2913];

// Weight class display: 32_plus_t -> "32+ t", 12_18t -> "12-18t"
const fmtWeight = (w: string): string => w.replace("_plus_t", "+ t").replace(/_/g, "-");

const createVehicleSvgIcon = (truck: VehicleTelemetry, isSelected: boolean) => {
  const color = STATUS_COLOR[truck.status];
  const stroke = isSelected ? C.accent : "#ffffff";
  const strokeWidth = isSelected ? 3 : 1.5;
  const glow = isSelected ? "filter: drop-shadow(0 0 8px rgba(124,58,237,0.9));" : "";

  const html = `
    <div style=\"transform: rotate(${truck.heading}deg); width:32px; height:32px; display:flex; align-items:center; justify-content:center; ${glow}\">
      <svg width=\"30\" height=\"30\" viewBox=\"0 0 30 30\" xmlns=\"http://www.w3.org/2000/svg\">
        <circle cx=\"15\" cy=\"15\" r=\"13\" fill=\"${color}\" fill-opacity=\"0.22\"/>
        <circle cx=\"15\" cy=\"15\" r=\"8\" fill=\"${color}\" stroke=\"${stroke}\" stroke-width=\"${strokeWidth}\"/>
        <path d=\"M15 4 L19 12 L15 10 L11 12 Z\" fill=\"${color}\" stroke=\"#fff\" stroke-width=\"0.8\"/>
      </svg>
    </div>`;

  return L.divIcon({
    html,
    className: "tf-vehicle-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const destFlagIcon = L.divIcon({
  html: '<svg width="20" height="24" viewBox="0 0 20 24" xmlns="http://www.w3.org/2000/svg"><line x1="3" y1="1" x2="3" y2="23" stroke="#ffffff" stroke-width="2"/><path d="M3 2 L17 6 L3 10 Z" fill="#7C3AED" stroke="#fff" stroke-width="0.5"/></svg>',
  className: "tf-dest-flag",
  iconSize: [20, 24],
  iconAnchor: [3, 23],
});

/**
 * ZOOM-LOOP FIX (2026-08-02, saha bulgusu):
 * Eski MapViewController `center` (her render'da YENİ dizi referansı) +
 * hiç false'a dönmeyen `triggerFly` bayrağına bağlıydı → seçili araç hareket
 * ettikçe HER telemetri tikinde flyTo yeniden ateşleniyor, Math.max(zoom,12)
 * kullanıcının manuel zoom-out'unu ezip haritayı ≥12'ye kilitliyordu
 * (sonsuz auto-zoom döngüsü).
 *
 * Yeni sözleşme: flyTo TEK-ATIMLIK bir İSTEKTİR. Yalnız açık kullanıcı
 * aksiyonu (listeden araç tıklama / focusPlate URL'i / "Center on map")
 * monoton `seq` sayacını artırır; effect yalnız seq değişiminde koşar.
 * Telemetri tiki flyTo'yu ASLA tetikleyemez → manuel drag/zoom hiçbir
 * otomatikle yarışmaz (Leaflet, uçuş animasyonunu kullanıcı etkileşiminde
 * zaten iptal eder). Auto-fit yalnız ilk yükleme kadrajıdır (INITIAL_CENTER).
 */
interface FlyRequest {
  center: [number, number];
  seq: number;
}

function MapViewController({ fly }: { fly: FlyRequest | null }): null {
  const map = useMap();
  useEffect(() => {
    if (fly) {
      map.flyTo(fly.center, Math.max(map.getZoom(), 12), { animate: true, duration: 1.0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fly?.seq]);
  return null;
}

const STATUS_LABEL: Record<VehicleStatus, TranslationKey> = {
  moving: "map.statusMoving",
  idle: "map.statusIdle",
  stopped: "map.statusStopped",
};

type StatusFilter = "all" | "moving" | "stopped" | "ze";
function LiveFleetMap(): JSX.Element {
  const { t } = useT();
  const { vehicles, selectedVehicleId, selectVehicle } = useVehicleStore();
  const { state: mqttState } = useMqttTelemetry();
  const activeRoutes = useActiveRoutes(); // hedef-yonu cizgileri (HERE gelince gercek geometri)
  useFleetSnapshot(); // Sıra 4.3: mock→gerçek filo bootstrap + 20sn REST tazeleme
  // BUG-4 v2 — rota katmanı görünürlüğü + çift yönlü hover-sync (0-delay Zustand)
  const { showAllRoutes, selectedRouteVehicleIds, hoveredVehicleId, setHoveredVehicle } =
    useRouteLayerStore();
  const vehicleList = Object.values(vehicles);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  // Zoom-loop fix: bool bayrak yerine tek-atımlık uçuş isteği (seq sayaçlı)
  const [flyReq, setFlyReq] = useState<FlyRequest | null>(null);
  const requestFly = (lat: number, lng: number): void =>
    setFlyReq((prev) => ({ center: [lat, lng], seq: (prev?.seq ?? 0) + 1 }));

  const [searchParams] = useSearchParams();
  // URL'den gelen focusPlate ile listeden gelen araca otomatik odaklan
  useEffect(() => {
    const focusPlate = searchParams.get("focusPlate");
    if (!focusPlate) return;
    const match = vehicleList.find((v) => v.plate.toLowerCase() === focusPlate.toLowerCase());
    if (match) {
      selectVehicle(match.id);
      requestFly(match.latitude, match.longitude);
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

  // BUG-4 v2 tek karar noktası: bu aracın rotası (ve bayrağı) çizilecek mi?
  const routeVisibleFor = (deviceId: string): boolean =>
    isRouteVisible({ showAllRoutes, selectedRouteVehicleIds }, deviceId, selectedVehicleId);

  const selectedVehicle = selectedVehicleId ? vehicles[selectedVehicleId] : null;

  const handleVehicleSelect = (id: string) => {
    selectVehicle(id);
    const v = vehicles[id];
    if (v) requestFly(v.latitude, v.longitude);
  };

  const emissionChip = (e: string) => {
    if (e === "zero_emission") {
      return (
        <Chip
          label={t("map.ze")}
          size="small"
          sx={{
            fontSize: "9px",
            height: "18px",
            bgcolor: "rgba(0,188,212,0.15)",
            color: C.ze,
            border: `1px solid ${C.ze}`,
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
          bgcolor: "#101424",
          color: C.textMuted,
          border: `1px solid ${C.border}`,
        }}
      />
    );
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox my={2}>
        <Grid
          container
          spacing={0}
          sx={{
            height: "calc(100vh - 160px)",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: 3,
          }}
        >
          {/* LEFT: dark fleet sidebar */}
          <Grid
            item
            xs={12}
            md={4}
            lg={3.5}
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              bgcolor: C.sidebarBg,
              p: 2,
              borderRight: `1px solid ${C.border}`,
            }}
          >
            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <MDTypography
                variant="h6"
                fontWeight="bold"
                color="white"
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Icon sx={{ color: C.accent }}>navigation</Icon> {t("map.title")}
              </MDTypography>
              <MDBox display="flex" alignItems="center" gap={0.75}>
                <span
                  title={t("map.mqttTitle", { state: mqttState })}
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor:
                      mqttState === "connected"
                        ? "#4caf50"
                        : mqttState === "connecting"
                        ? "#fb8c00"
                        : "#f44336",
                  }}
                />
                <Chip
                  label={t("map.activeCount", { count: filteredVehicles.length })}
                  size="small"
                  sx={{
                    bgcolor: C.border,
                    color: C.textMuted,
                    fontWeight: "bold",
                    fontSize: "11px",
                  }}
                />
              </MDBox>
            </MDBox>

            <MDBox mb={2}>
              <TextField
                fullWidth
                size="small"
                placeholder={t("map.searchPlate")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Icon style={{ color: C.textMuted }}>search</Icon>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    color: "white",
                    bgcolor: C.inputBg,
                    "& fieldset": { borderColor: C.border },
                    "&:hover fieldset": { borderColor: C.accent },
                    "&.Mui-focused fieldset": { borderColor: C.accent },
                  },
                  "& .MuiInputBase-input::placeholder": { color: C.textFaint, opacity: 1 },
                }}
              />
            </MDBox>

            <MDBox display="flex" gap={0.5} flexWrap="wrap" mb={2}>
              <Chip
                label={t("map.filterAll")}
                size="small"
                onClick={() => setStatusFilter("all")}
                sx={{
                  bgcolor: statusFilter === "all" ? C.accent : C.border,
                  color: "white",
                  cursor: "pointer",
                }}
              />
              <Chip
                label={t("map.filterMoving")}
                size="small"
                onClick={() => setStatusFilter("moving")}
                sx={{
                  bgcolor: statusFilter === "moving" ? STATUS_COLOR.moving : C.border,
                  color: "white",
                  cursor: "pointer",
                }}
              />
              <Chip
                label={t("map.filterStopped")}
                size="small"
                onClick={() => setStatusFilter("stopped")}
                sx={{
                  bgcolor: statusFilter === "stopped" ? STATUS_COLOR.stopped : C.border,
                  color: "white",
                  cursor: "pointer",
                }}
              />
              <Chip
                label={t("map.filterElectric")}
                size="small"
                onClick={() => setStatusFilter("ze")}
                sx={{
                  bgcolor: statusFilter === "ze" ? C.ze : C.border,
                  color: "white",
                  cursor: "pointer",
                }}
              />
            </MDBox>

            <Divider sx={{ my: 1, borderColor: C.border }} />

            <List
              sx={{
                flexGrow: 1,
                overflowY: "auto",
                pr: 0.5,
                "&::-webkit-scrollbar": { width: "4px" },
                "&::-webkit-scrollbar-thumb": { bgcolor: C.border, borderRadius: "4px" },
              }}
            >
              {filteredVehicles.length === 0 && (
                <MDTypography
                  variant="caption"
                  sx={{ color: C.textFaint, display: "block", textAlign: "center", mt: 3 }}
                >
                  {t("map.noMatch")}
                </MDTypography>
              )}
              {filteredVehicles.map((v) => (
                <Paper
                  elevation={0}
                  key={v.id}
                  onMouseEnter={() => setHoveredVehicle(v.id)}
                  onMouseLeave={() => setHoveredVehicle(null)}
                  sx={{
                    mb: 1,
                    borderRadius: "10px",
                    border: "1px solid",
                    // BUG-4 v2 hover-sync (harita→menü): haritada rotaya gelinince
                    // bu kart da accent border + hafif glow ile vurgulanır.
                    borderColor:
                      selectedVehicleId === v.id || hoveredVehicleId === v.id
                        ? C.accent
                        : C.border,
                    backgroundColor: selectedVehicleId === v.id ? C.panelBgSel : C.panelBg,
                    boxShadow:
                      hoveredVehicleId === v.id ? "0 0 10px rgba(124,58,237,0.35)" : "none",
                    transition: "all 0.2s linear",
                  }}
                >
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleVehicleSelect(v.id)}
                      sx={{ p: 1.5, flexDirection: "column", alignItems: "stretch" }}
                    >
                      <MDBox
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={1}
                      >
                        <MDTypography
                          variant="button"
                          fontWeight="bold"
                          color="white"
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: STATUS_COLOR[v.status],
                            }}
                          />
                          {v.plate}
                        </MDTypography>
                        <MDTypography variant="caption" fontWeight="bold" color="white">
                          {v.speed_kmh}{" "}
                          <span style={{ color: C.textFaint, fontSize: "10px" }}>
                            {t("map.kmh")}
                          </span>
                        </MDTypography>
                      </MDBox>
                      <MDBox display="flex" gap={0.5}>
                        <Chip
                          label={fmtWeight(v.vehicle_weight_class)}
                          size="small"
                          sx={{
                            fontSize: "9px",
                            height: "18px",
                            bgcolor: "#101424",
                            color: "#fff",
                            border: `1px solid ${C.border}`,
                          }}
                        />
                        {emissionChip(v.emission_class)}
                      </MDBox>
                    </ListItemButton>
                  </ListItem>
                </Paper>
              ))}
            </List>
          </Grid>

          {/* RIGHT: edge-to-edge dark map */}
          <Grid item xs={12} md={8} lg={8.5} sx={{ height: "100%", position: "relative" }}>
            <MDBox
              width="100%"
              height="100%"
              sx={{
                "& .leaflet-container": {
                  height: "100%",
                  width: "100%",
                  zIndex: 1,
                  bgcolor: "#191a1a",
                },
              }}
            >
              <MapContainer center={INITIAL_CENTER} zoom={8} scrollWheelZoom zoomControl={false}>
                <MapViewController fly={flyReq} />

                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=cb1_2n9e_1_5c749a815246c8c8b2b608b7"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {filteredVehicles.map((truck) => (
                  <Marker
                    key={truck.id}
                    position={[truck.latitude, truck.longitude]}
                    icon={createVehicleSvgIcon(truck, selectedVehicleId === truck.id)}
                    eventHandlers={{
                      // Marker tıklaması SEÇER ama uçurmaz (kullanıcı zaten oradadır);
                      // uçuş yalnız liste/"Center on map" isteğiyle olur.
                      click: () => {
                        selectVehicle(truck.id);
                      },
                      mouseover: () => setHoveredVehicle(truck.id),
                      mouseout: () => setHoveredVehicle(null),
                    }}
                  />
                ))}

                {/* BUG-4 v2 — rota katmanı: yalnız görünürlük koşulunu geçen
                    araçlar çizilir; TEK Polyline / araç, SABİT key (Cem
                    düzeltmesi #2 — unmount/remount YOK, hover stili dinamik
                    pathOptions prop'uyla path-attribute seviyesinde uygulanır,
                    titreme oluşmaz). */}
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
                        // BUG-4 v2 hover-sync (harita→menü)
                        mouseover: () => setHoveredVehicle(truck.id),
                        mouseout: () => setHoveredVehicle(null),
                      }}
                      pathOptions={{
                        color: isHovered ? "#9F67FF" : "#7C3AED",
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
                    <Marker key={`dest-${truck.id}`} position={[r.dropoff.lat, r.dropoff.lng]} icon={destFlagIcon} />
                  );
                })}
              </MapContainer>

              {selectedVehicle && (
                <GlassPanel
                  ownerState={{ tint: "brand", edge: true, darkMode: true }}
                  sx={{
                    position: "absolute",
                    bottom: 16,
                    left: 16,
                    zIndex: 1000,
                    width: 260,
                    p: 2,
                  }}
                >
                  <MDBox
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    mb={1}
                  >
                    <MDBox display="flex" alignItems="center" gap={1}>
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: "50%",
                          backgroundColor: STATUS_COLOR[selectedVehicle.status],
                          boxShadow: `0 0 8px ${STATUS_COLOR[selectedVehicle.status]}`,
                        }}
                      />
                      <MDTypography
                        variant="h6"
                        fontWeight="bold"
                        color="white"
                        sx={{ fontFamily: "monospace", letterSpacing: "0.5px" }}
                      >
                        {selectedVehicle.plate}
                      </MDTypography>
                    </MDBox>
                    <MDBox
                      component="button"
                      type="button"
                      onClick={() => selectVehicle(null)}
                      aria-label={t("map.closeDetail")}
                      sx={{
                        border: "none",
                        background: "transparent",
                        color: C.textMuted,
                        cursor: "pointer",
                        lineHeight: 0,
                        p: 0.5,
                        borderRadius: "8px",
                        "&:hover": { color: "#fff" },
                        "&:focus-visible": { outline: "2px solid rgba(124,58,237,0.6)" },
                      }}
                    >
                      <Icon fontSize="small">close</Icon>
                    </MDBox>
                  </MDBox>

                  <MDBox display="flex" gap={0.5} mb={1.5}>
                    <Chip
                      label={selectedVehicle.status}
                      size="small"
                      sx={{
                        textTransform: "capitalize",
                        fontSize: "10px",
                        height: "20px",
                        color: STATUS_COLOR[selectedVehicle.status],
                        bgcolor: "rgba(255,255,255,0.06)",
                        border: `1px solid ${STATUS_COLOR[selectedVehicle.status]}`,
                      }}
                    />
                    {emissionChip(selectedVehicle.emission_class)}
                  </MDBox>

                  {[
                    { label: t("map.speed"), value: t("map.speedValue", { value: selectedVehicle.speed_kmh }) },
                    {
                      label: t("map.weight"),
                      value: fmtWeight(selectedVehicle.vehicle_weight_class),
                    },
                    {
                      label: t("map.position"),
                      value: `${selectedVehicle.latitude.toFixed(
                        4
                      )}, ${selectedVehicle.longitude.toFixed(4)}`,
                    },
                  ].map((row) => (
                    <MDBox
                      key={row.label}
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mb={0.75}
                    >
                      <MDTypography variant="caption" sx={{ color: C.textMuted }}>
                        {row.label}
                      </MDTypography>
                      <MDTypography
                        variant="caption"
                        fontWeight="bold"
                        color="white"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {row.value}
                      </MDTypography>
                    </MDBox>
                  ))}

                  <Divider sx={{ my: 1, borderColor: "rgba(255,255,255,0.1)" }} />

                  <MDBox
                    component="button"
                    type="button"
                    onClick={() => handleVehicleSelect(selectedVehicle.id)}
                    sx={{
                      width: "100%",
                      border: "none",
                      cursor: "pointer",
                      borderRadius: "10px",
                      py: 1,
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "12.5px",
                      background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
                      boxShadow: "0 6px 18px rgba(124,58,237,0.3)",
                      transition: "transform 0.2s ease",
                      "&:hover": { transform: "translateY(-1px)" },
                      "&:focus-visible": { outline: "2px solid rgba(124,58,237,0.6)" },
                      "@media (prefers-reduced-motion: reduce)": {
                        transition: "none",
                        "&:hover": { transform: "none" },
                      },
                    }}
                  >
                    {t("map.centerOnMap")}
                  </MDBox>
                </GlassPanel>
              )}

              {/* BUG-4 v2 — Floating Map Control Widget (sağ-üst) */}
              <MapControlWidget />

              {/* Durum lejantı — widget sağ-üstü aldığı için sağ-alta taşındı */}
              <Paper
                elevation={2}
                sx={{
                  position: "absolute",
                  bottom: 16,
                  right: 16,
                  zIndex: 1000,
                  p: 1.5,
                  bgcolor: C.sidebarBg,
                  borderRadius: "8px",
                  border: `1px solid ${C.border}`,
                }}
              >
                <MDBox display="flex" flexDirection="column" gap={0.5}>
                  {(["moving", "idle", "stopped"] as VehicleStatus[]).map((s) => (
                    <MDTypography
                      key={s}
                      variant="caption"
                      color="white"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: STATUS_COLOR[s],
                        }}
                      />{" "}
                      {t(STATUS_LABEL[s])}
                    </MDTypography>
                  ))}
                </MDBox>
              </Paper>
            </MDBox>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default LiveFleetMap;
