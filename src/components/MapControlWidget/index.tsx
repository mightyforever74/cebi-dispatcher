/**
 * MapControlWidget — BUG-4 v2 Floating Map Control Widget (2026-08-02).
 * D3: palet `tokens.ts` `map.*` (cam yok, opak).
 */
import { useState } from "react";

import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Switch from "@mui/material/Switch";

import { map as mapTokens } from "assets/theme/tokens";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useMaterialUIController } from "context";
import { useDriverIndex } from "hooks/useDriverIndex";
import { useT } from "i18n";
import { mapChrome } from "layouts/live-fleet-map/mapChrome";
import { useRouteLayerStore } from "store/useRouteLayerStore";
import { useVehicleStore } from "store/useVehicleStore";

function MapControlWidget({ offsetRight = 16 }: { offsetRight?: number }): JSX.Element {
  const { t } = useT();
  const [controller] = useMaterialUIController();
  const chrome = mapChrome(Boolean(controller.darkMode));
  const vehicles = useVehicleStore((s) => s.vehicles);
  const {
    showAllRoutes,
    selectedRouteVehicleIds,
    toggleShowAll,
    toggleRouteVehicle,
    clearRouteSelection,
    setHoveredVehicle,
  } = useRouteLayerStore();
  const drivers = useDriverIndex();

  const [open, setOpen] = useState(true);

  const vehicleList = Object.values(vehicles);
  const selectedCount = Object.keys(selectedRouteVehicleIds).length;

  const handleDriverPick = (deviceId: string) => {
    if (deviceId) toggleRouteVehicle(deviceId);
  };

  if (!open) {
    return (
      <Paper
        elevation={0}
        onClick={() => setOpen(true)}
        sx={{
          position: "absolute",
          top: 16,
          right: offsetRight,
          zIndex: 1000,
          p: 1,
          bgcolor: chrome.sidebarBg,
          borderRadius: "8px",
          border: `1px solid ${chrome.border}`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          "&:hover": { borderColor: mapTokens.selected },
        }}
      >
        <Icon sx={{ color: mapTokens.selected }} fontSize="small">
          layers
        </Icon>
        <MDTypography variant="caption" fontWeight="bold" sx={{ color: chrome.text }}>
          {t("map.routes")} {showAllRoutes ? t("map.bulletAll") : selectedCount > 0 ? t("map.bulletCount", { n: selectedCount }) : ""}
        </MDTypography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        position: "absolute",
        top: 16,
        right: offsetRight,
        zIndex: 1000,
        p: 1.5,
        width: 232,
        bgcolor: chrome.sidebarBg,
        borderRadius: "8px",
        border: `1px solid ${chrome.border}`,
      }}
    >
      <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <MDTypography
          variant="caption"
          fontWeight="bold"
          sx={{ display: "flex", alignItems: "center", gap: 0.75, color: chrome.text }}
        >
          <Icon sx={{ color: mapTokens.selected }} fontSize="small">
            layers
          </Icon>
          {t("map.routeLayers")}
        </MDTypography>
        <MDBox
          component="button"
          type="button"
          aria-label={t("map.collapsePanel")}
          onClick={() => setOpen(false)}
          sx={{
            border: "none",
            background: "transparent",
            color: chrome.textMuted,
            cursor: "pointer",
            lineHeight: 0,
            p: 0.25,
            "&:hover": { color: chrome.text },
          }}
        >
          <Icon fontSize="small">expand_less</Icon>
        </MDBox>
      </MDBox>

      <MDBox display="flex" justifyContent="space-between" alignItems="center">
        <MDTypography variant="caption" sx={{ color: chrome.text }}>
          {t("map.showAllRoutes")}
        </MDTypography>
        <Switch
          checked={showAllRoutes}
          onChange={toggleShowAll}
          size="small"
          inputProps={{ "aria-label": t("map.showAllRoutes") }}
        />
      </MDBox>

      <Divider sx={{ my: 1, borderColor: chrome.border }} />

      <Select
        fullWidth
        size="small"
        displayEmpty
        value=""
        onChange={(e) => handleDriverPick(e.target.value as string)}
        inputProps={{ "aria-label": t("map.selectDriver") }}
        renderValue={() => (
          <span style={{ color: chrome.textFaint, fontSize: "12px" }}>{t("map.selectDriver")}</span>
        )}
        MenuProps={{
          PaperProps: {
            sx: { bgcolor: chrome.panelBg, border: `1px solid ${chrome.border}`, color: chrome.text },
          },
        }}
        sx={{
          mb: 1,
          color: chrome.text,
          bgcolor: chrome.inputBg,
          fontSize: "12px",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: chrome.border },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: mapTokens.selected },
          "& .MuiSelect-icon": { color: chrome.textMuted },
        }}
      >
        {drivers.length === 0 && (
          <MenuItem disabled value="">
            <MDTypography variant="caption" sx={{ color: chrome.textFaint }}>
              {t("map.noDriverData")}
            </MDTypography>
          </MenuItem>
        )}
        {drivers.map((d) => (
          <MenuItem
            key={d.driverId}
            value={d.deviceId ?? ""}
            disabled={!d.deviceId}
            sx={{ fontSize: "12px", color: d.deviceId ? chrome.text : chrome.textFaint }}
          >
            {d.name}
            {d.deviceId ? ` — ${d.plate}` : t("map.unassigned")}
            {d.deviceId && selectedRouteVehicleIds[d.deviceId] ? " ✓" : ""}
          </MenuItem>
        ))}
      </Select>

      <MDBox
        sx={{
          maxHeight: 168,
          overflowY: "auto",
          pr: 0.25,
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-thumb": { bgcolor: chrome.border, borderRadius: "4px" },
        }}
      >
        {vehicleList.map((v) => (
          <MDBox
            key={v.id}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            onMouseEnter={() => setHoveredVehicle(v.id)}
            onMouseLeave={() => setHoveredVehicle(null)}
            sx={{ borderRadius: "6px", px: 0.5, "&:hover": { bgcolor: chrome.panelBg } }}
          >
            <MDTypography variant="caption" sx={{ fontFamily: "monospace", color: chrome.text }}>
              {v.plate}
            </MDTypography>
            <Checkbox
              size="small"
              checked={showAllRoutes || !!selectedRouteVehicleIds[v.id]}
              disabled={showAllRoutes}
              onChange={() => toggleRouteVehicle(v.id)}
              inputProps={{ "aria-label": v.plate }}
              sx={{
                color: chrome.textMuted,
                p: 0.5,
                "&.Mui-checked": { color: mapTokens.selected },
                "&.Mui-disabled": { color: chrome.textFaint },
              }}
            />
          </MDBox>
        ))}
      </MDBox>

      {selectedCount > 0 && !showAllRoutes && (
        <MDBox mt={0.75} textAlign="right">
          <MDTypography
            component="button"
            type="button"
            variant="caption"
            onClick={clearRouteSelection}
            sx={{
              border: "none",
              background: "transparent",
              color: chrome.textMuted,
              cursor: "pointer",
              "&:hover": { color: chrome.text },
            }}
          >
            {t("map.clearSelection", { count: selectedCount })}
          </MDTypography>
        </MDBox>
      )}
    </Paper>
  );
}

export default MapControlWidget;
