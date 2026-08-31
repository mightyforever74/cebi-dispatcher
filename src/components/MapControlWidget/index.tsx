/**
 * MapControlWidget — BUG-4 v2 Floating Map Control Widget (2026-08-02).
 *
 * Harita sağ-üstünde yüzen rota-katmanı kontrol paneli. MD2 PRO dark tema
 * disiplini: LiveFleetMap ile AYNI palet sabitleri, 1px border, soft-shadow
 * yasağı — yeni bileşen deseni icat edilmedi (Paper + MUI çekirdek girdiler).
 *
 * İçerik:
 *  A) Global "Tüm Rotalar" Switch — tek tıkla tüm aktif rotalar açılır/kapanır.
 *  B) Plaka bazlı checkbox listesi — işaretlenen aracın rotası + bayrağı belirir.
 *  C) Sürücü adı seçici — sürücü seçilince aracının rotası toggle edilir;
 *     Atanmamış / canlıda aracı olmayan sürücü "(Atanmamış)" ile DISABLE
 *     (Cem düzeltmesi #1 — set'e null sızmaz).
 *
 * 0-delay: tüm girdiler doğrudan useRouteLayerStore aksiyonlarını çağırır;
 * Zustand aboneliği harita Polyline'larını aynı frame'de günceller.
 * Panel daraltılabilir (layers ikonu) — ekranda yer kaplamama şartı.
 */
import { useState } from "react";

import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Switch from "@mui/material/Switch";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import { useDriverIndex } from "hooks/useDriverIndex";
import { useRouteLayerStore } from "store/useRouteLayerStore";
import { useVehicleStore } from "store/useVehicleStore";

// LiveFleetMap C paletiyle birebir aynı (tema bütünlüğü şartı)
const C = {
  sidebarBg: "#1a2035",
  panelBg: "#151a30",
  border: "#2c3454",
  accent: "#7C3AED",
  inputBg: "#131826",
  textMuted: "#8f9bb3",
  textFaint: "#65718c",
};

function MapControlWidget(): JSX.Element {
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
        elevation={2}
        onClick={() => setOpen(true)}
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 1000,
          p: 1,
          bgcolor: C.sidebarBg,
          borderRadius: "8px",
          border: `1px solid ${C.border}`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          "&:hover": { borderColor: C.accent },
        }}
      >
        <Icon sx={{ color: C.accent }} fontSize="small">
          layers
        </Icon>
        <MDTypography variant="caption" color="white" fontWeight="bold">
          Routes {showAllRoutes ? "• All" : selectedCount > 0 ? `• ${selectedCount}` : ""}
        </MDTypography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={2}
      sx={{
        position: "absolute",
        top: 16,
        right: 16,
        zIndex: 1000,
        p: 1.5,
        width: 232,
        bgcolor: C.sidebarBg,
        borderRadius: "8px",
        border: `1px solid ${C.border}`,
      }}
    >
      {/* Başlık + daralt */}
      <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <MDTypography
          variant="caption"
          fontWeight="bold"
          color="white"
          sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
        >
          <Icon sx={{ color: C.accent }} fontSize="small">
            layers
          </Icon>
          Route layers
        </MDTypography>
        <MDBox
          component="button"
          type="button"
          aria-label="Collapse panel"
          onClick={() => setOpen(false)}
          sx={{
            border: "none",
            background: "transparent",
            color: C.textMuted,
            cursor: "pointer",
            lineHeight: 0,
            p: 0.25,
            "&:hover": { color: "#fff" },
          }}
        >
          <Icon fontSize="small">expand_less</Icon>
        </MDBox>
      </MDBox>

      {/* A — Global switch */}
      <MDBox display="flex" justifyContent="space-between" alignItems="center">
        <MDTypography variant="caption" color="white">
          Show all routes
        </MDTypography>
        <Switch checked={showAllRoutes} onChange={toggleShowAll} size="small" />
      </MDBox>

      <Divider sx={{ my: 1, borderColor: C.border }} />

      {/* C — Sürücü adı bazlı seçim */}
      <Select
        fullWidth
        size="small"
        displayEmpty
        value=""
        onChange={(e) => handleDriverPick(e.target.value as string)}
        renderValue={() => (
          <span style={{ color: C.textFaint, fontSize: "12px" }}>Select driver…</span>
        )}
        MenuProps={{
          PaperProps: {
            sx: { bgcolor: C.panelBg, border: `1px solid ${C.border}`, color: "#fff" },
          },
        }}
        sx={{
          mb: 1,
          color: "white",
          bgcolor: C.inputBg,
          fontSize: "12px",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: C.border },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: C.accent },
          "& .MuiSelect-icon": { color: C.textMuted },
        }}
      >
        {drivers.length === 0 && (
          <MenuItem disabled value="">
            <MDTypography variant="caption" sx={{ color: C.textFaint }}>
              No driver data
            </MDTypography>
          </MenuItem>
        )}
        {drivers.map((d) => (
          <MenuItem
            key={d.driverId}
            value={d.deviceId ?? ""}
            disabled={!d.deviceId}
            sx={{ fontSize: "12px", color: d.deviceId ? "#fff" : C.textFaint }}
          >
            {d.name}
            {d.deviceId ? ` — ${d.plate}` : " (Unassigned)"}
            {d.deviceId && selectedRouteVehicleIds[d.deviceId] ? " ✓" : ""}
          </MenuItem>
        ))}
      </Select>

      {/* B — Plaka bazlı checkbox listesi */}
      <MDBox
        sx={{
          maxHeight: 168,
          overflowY: "auto",
          pr: 0.25,
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-thumb": { bgcolor: C.border, borderRadius: "4px" },
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
            sx={{ borderRadius: "6px", px: 0.5, "&:hover": { bgcolor: C.panelBg } }}
          >
            <MDTypography variant="caption" color="white" sx={{ fontFamily: "monospace" }}>
              {v.plate}
            </MDTypography>
            <Checkbox
              size="small"
              checked={showAllRoutes || !!selectedRouteVehicleIds[v.id]}
              disabled={showAllRoutes}
              onChange={() => toggleRouteVehicle(v.id)}
              sx={{
                color: C.textMuted,
                p: 0.5,
                "&.Mui-checked": { color: C.accent },
                "&.Mui-disabled": { color: C.textFaint },
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
              color: C.textMuted,
              cursor: "pointer",
              "&:hover": { color: "#fff" },
            }}
          >
            Clear selection ({selectedCount})
          </MDTypography>
        </MDBox>
      )}
    </Paper>
  );
}

export default MapControlWidget;
