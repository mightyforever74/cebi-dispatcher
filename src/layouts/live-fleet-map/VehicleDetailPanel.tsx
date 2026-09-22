import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import { alpha } from "@mui/material/styles";
import { map as mapTokens, type VehicleConnectivityStatus } from "assets/theme/tokens";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { formatRelative, useT, type TranslationKey } from "i18n";
import type { VehicleStatus, VehicleTelemetry } from "store/useVehicleStore";
import { connectivityColor, type MapChrome, vehicleConnectivity } from "./mapChrome";

const MOVEMENT_LABEL: Record<VehicleStatus, TranslationKey> = {
  moving: "map.statusMoving",
  idle: "map.statusIdle",
  stopped: "map.statusStopped",
};

const CONN_LABEL: Record<VehicleConnectivityStatus, TranslationKey> = {
  online: "map.statusOnline",
  stale: "map.statusStale",
  offline: "map.statusOffline",
  maintenance: "map.statusOffline",
};

const fmtWeight = (w: string): string => w.replace("_plus_t", "+ t").replace(/_/g, "-");

interface VehicleDetailPanelProps {
  vehicle: VehicleTelemetry;
  chrome: MapChrome;
  now: number;
  lang: "en" | "tr" | "nl";
  onClose: () => void;
  onCenter: () => void;
}

function VehicleDetailPanel({
  vehicle,
  chrome,
  now,
  lang,
  onClose,
  onCenter,
}: VehicleDetailPanelProps): JSX.Element {
  const { t } = useT();
  const conn = vehicleConnectivity(vehicle.last_update, now);
  const connColor = connectivityColor(conn);

  return (
    <Paper
      elevation={0}
      role="dialog"
      aria-label={vehicle.plate}
      sx={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        zIndex: 1100,
        width: mapTokens.panelWidthPx,
        maxWidth: "100%",
        p: 2,
        borderRadius: 0,
        bgcolor: chrome.panelBg,
        color: chrome.text,
        borderLeft: `1px solid ${chrome.border}`,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <MDBox display="flex" alignItems="center" gap={1}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              backgroundColor: connColor,
              boxShadow: `0 0 8px ${connColor}`,
            }}
          />
          <MDTypography
            variant="h6"
            fontWeight="bold"
            sx={{ fontFamily: "monospace", letterSpacing: "0.5px", color: chrome.text }}
          >
            {vehicle.plate}
          </MDTypography>
        </MDBox>
        <MDBox
          component="button"
          type="button"
          onClick={onClose}
          aria-label={t("map.closeDetail")}
          sx={{
            border: "none",
            background: "transparent",
            color: chrome.textMuted,
            cursor: "pointer",
            lineHeight: 0,
            p: 0.5,
            borderRadius: "8px",
            "&:hover": { color: chrome.text },
          }}
        >
          <Icon fontSize="small">close</Icon>
        </MDBox>
      </MDBox>

      <MDBox display="flex" gap={0.5} mb={1.5} flexWrap="wrap">
        <Chip
          label={t(CONN_LABEL[conn])}
          size="small"
          sx={{
            fontSize: "10px",
            height: "20px",
            color: connColor,
            bgcolor: alpha(connColor, 0.12),
            border: `1px solid ${connColor}`,
          }}
        />
        <Chip
          label={t(MOVEMENT_LABEL[vehicle.status])}
          size="small"
          sx={{
            fontSize: "10px",
            height: "20px",
            color: chrome.textMuted,
            bgcolor: chrome.chipBg,
            border: `1px solid ${chrome.border}`,
          }}
        />
      </MDBox>

      {[
        { label: t("map.speed"), value: t("map.speedValue", { value: vehicle.speed_kmh }) },
        { label: t("map.weight"), value: fmtWeight(vehicle.vehicle_weight_class) },
        {
          label: t("map.position"),
          value: `${vehicle.latitude.toFixed(4)}, ${vehicle.longitude.toFixed(4)}`,
        },
        {
          label: t("map.lastUpdate"),
          value: formatRelative(vehicle.last_update, now, lang),
        },
      ].map((row) => (
        <MDBox key={row.label} display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
          <MDTypography variant="caption" sx={{ color: chrome.textMuted }}>
            {row.label}
          </MDTypography>
          <MDTypography
            variant="caption"
            fontWeight="bold"
            sx={{ fontFamily: "monospace", color: chrome.text }}
          >
            {row.value}
          </MDTypography>
        </MDBox>
      ))}

      <Divider sx={{ my: 1, borderColor: chrome.border }} />

      <MDBox
        component="button"
        type="button"
        onClick={onCenter}
        sx={{
          width: "100%",
          border: "none",
          cursor: "pointer",
          borderRadius: "10px",
          py: 1,
          color: mapTokens.markerStroke,
          fontWeight: 600,
          fontSize: "12.5px",
          background: `linear-gradient(135deg, ${mapTokens.selected}, ${mapTokens.routeHover})`,
          transition: "transform 0.2s ease",
          "&:hover": { transform: "translateY(-1px)" },
          "@media (prefers-reduced-motion: reduce)": {
            transition: "none",
            "&:hover": { transform: "none" },
          },
        }}
      >
        {t("map.centerOnMap")}
      </MDBox>
    </Paper>
  );
}

export default VehicleDetailPanel;
