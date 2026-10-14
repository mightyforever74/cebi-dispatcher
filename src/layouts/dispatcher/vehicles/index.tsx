import { Chip, IconButton, TextField } from "@mui/material";
import Icon from "@mui/material/Icon";
import { paletteLight } from "assets/theme/tokens";
import Grid from "@mui/material/Grid";
import ConfirmDialogShell from "components/ConfirmDialogShell";
import { useNotifications } from "components/Notifications";
import DataState, { isDataStale, listFetchState } from "components/DataState";
import DataTable, { type DataColumn, type DataRow } from "components/DataTable";
import FuelGaugeMini from "components/FuelGaugeMini";
import MDBadge from "components/MDBadge";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import StatusChip, { enumLabel } from "components/StatusChip";
import ComplexStatisticsCard from "examples/Cards/StatisticsCards/ComplexStatisticsCard";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import useDrivers, { type Driver } from "hooks/useDrivers";
import useVehicles, { useUpdateVehicleCapacity, type Vehicle } from "hooks/useVehicles";
import { formatDate, formatNumber, useT, type TFunction } from "i18n";
import { HAZMAT_CLASS_OPTIONS } from "types/metadata";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toNum } from "utils/toNum";

const EMPTY_VEHICLES: Vehicle[] = [];
const EMPTY_DRIVERS: Driver[] = [];
const VEHICLES_PAGE_SIZE = { defaultValue: 10, entries: [5, 10, 25, 50] };

// FEAT-013 W12 (2026-10-14): ayni etiketleme deseni optimize/index.tsx
// hazmatLabel'dan kanitli -- ayni i18n key'i (optimize.hazmatClass) paylasir,
// bilerek: tek bir "Sinif N" gosterim sozlesmesi butun dispatcher'da.
function hazmatLabel(cls: string, translate: TFunction): string {
  const n = cls.replace(/\D/g, "");
  return n ? translate("optimize.hazmatClass", { n }) : cls;
}

interface CapacityDraft {
  volumeM3: string;
  weightKg: string;
  hazmatClasses: string[];
}

function toCapacityDraft(v: Vehicle): CapacityDraft {
  return {
    volumeM3: v.cargo_capacity_volume_m3 != null ? String(v.cargo_capacity_volume_m3) : "",
    weightKg: v.cargo_capacity_weight_kg != null ? String(v.cargo_capacity_weight_kg) : "",
    hazmatClasses: Array.isArray(v.hazmat_certified_classes) ? v.hazmat_certified_classes : [],
  };
}

function parseDraftNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function emissionClassColor(emissionClass?: string): "success" | "info" | "warning" | "error" {
  if (!emissionClass) return "info";
  if (emissionClass === "zero_emission") return "success";
  if (emissionClass.startsWith("euro_6")) return "success";
  if (emissionClass.startsWith("euro_5")) return "info";
  return "warning";
}

function VehiclesLayout(): JSX.Element {
  const { t, lang } = useT();
  const {
    data,
    isLoading,
    isPending,
    isSuccess,
    isPlaceholderData,
    isError,
    isPaused,
    error,
    dataUpdatedAt,
    refetch,
  } = useVehicles();
  const { data: driversData } = useDrivers();
  const vehicles = data ?? EMPTY_VEHICLES;
  const drivers = driversData ?? EMPTY_DRIVERS;
  const navigate = useNavigate();
  const { notifyToast } = useNotifications();

  // FEAT-013 W12 (2026-10-14): hazmat veri-girisi UI -- editDraft null degilse
  // dialog acik. editDraft.vehicle ayri tutulur (plaka basligi icin), draft
  // alanlari ayri state (TextField'larin kontrollu olmasi icin string tutulur,
  // sayiya cevirme submit'te yapilir).
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [draft, setDraft] = useState<CapacityDraft>({ volumeM3: "", weightKg: "", hazmatClasses: [] });
  const updateCapacity = useUpdateVehicleCapacity();

  const openCapacityEdit = (v: Vehicle) => {
    setDraft(toCapacityDraft(v));
    setEditVehicle(v);
  };

  const closeCapacityEdit = () => {
    if (updateCapacity.isPending) return;
    setEditVehicle(null);
  };

  const toggleDraftHazmat = (cls: string) => {
    setDraft((prev) => ({
      ...prev,
      hazmatClasses: prev.hazmatClasses.includes(cls)
        ? prev.hazmatClasses.filter((c) => c !== cls)
        : [...prev.hazmatClasses, cls],
    }));
  };

  const saveCapacity = () => {
    if (!editVehicle) return;
    updateCapacity.mutate(
      {
        id: editVehicle.id,
        capacity: {
          cargo_capacity_volume_m3: parseDraftNumber(draft.volumeM3),
          cargo_capacity_weight_kg: parseDraftNumber(draft.weightKg),
          hazmat_certified_classes: draft.hazmatClasses,
        },
      },
      {
        onSuccess: () => {
          notifyToast({ type: "form_ok", titleKey: "notifyForm.saved" });
          setEditVehicle(null);
        },
        onError: () => notifyToast({ type: "form_err", titleKey: "notifyForm.saveFailed", severity: "high" }),
      }
    );
  };

  const driverNameByVehicleId = useMemo(() => {
    const m = new Map<string, string>();
    drivers.forEach((d: Driver) => {
      if (!d?.assigned_vehicle_id) return;
      const name = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || d.email || "—";
      if (!m.has(d.assigned_vehicle_id)) m.set(d.assigned_vehicle_id, name);
    });
    return m;
  }, [drivers]);

  const table = useMemo(() => {
    const columns: DataColumn[] = [
      { Header: t("vehicles.colPlateModel"), accessor: "vehicle_info", minWidth: 140, truncate: true, primary: true },
      { Header: t("vehicles.colCategory"), accessor: "category_badge", minWidth: 88, maxWidth: 120 },
      { Header: t("vehicles.colOwnership"), accessor: "ownership_badge", minWidth: 110, maxWidth: 160, truncate: true },
      { Header: t("vehicles.colFuel"), accessor: "fuel_type_badge", minWidth: 80, maxWidth: 110 },
      { Header: t("vehicles.colFuelLevel"), accessor: "fuel_level_gauge", minWidth: 72, maxWidth: 88 },
      { Header: t("vehicles.colTotalKm"), accessor: "total_km_display", minWidth: 80, maxWidth: 100, numeric: true, primary: true },
      { Header: t("vehicles.colMaintenance"), accessor: "maintenance_info", minWidth: 100, maxWidth: 140 },
      { Header: t("vehicles.colEmission"), accessor: "emission_badge", minWidth: 88, maxWidth: 120 },
      { Header: t("vehicles.colStatus"), accessor: "status_badge", minWidth: 96, maxWidth: 120, primary: true },
      { Header: t("vehicles.colDriver"), accessor: "assigned_driver_name", minWidth: 110, maxWidth: 160, truncate: true },
      { Header: t("vehicles.colCapacity"), accessor: "capacity_cell", minWidth: 150, maxWidth: 220 },
    ];

    const rows: DataRow[] = vehicles.map((v: Vehicle) => {
      const plate = v.plate_no || "—";
      const modelLine = [v.brand, v.model].filter(Boolean).join(" ") || "—";
      const vehicleLine = modelLine !== "—" ? `${plate} · ${modelLine}` : plate;
      const vehicleInfo = (
        <MDTypography
          variant="body2"
          fontWeight="medium"
          noWrap
          title={vehicleLine}
          onClick={() =>
            v.plate_no &&
            navigate(`/dashboards/live-fleet-map?focusPlate=${encodeURIComponent(v.plate_no)}`)
          }
          sx={{
            cursor: v.plate_no ? "pointer" : "default",
            color: "text.main",
            "&:hover": { textDecoration: v.plate_no ? "underline" : "none" },
          }}
        >
          {vehicleLine}
        </MDTypography>
      );

      const categoryBadge = v.vehicle_category ? (
        <Chip
          label={enumLabel("vehicle.category", v.vehicle_category, t)}
          size="small"
          variant="outlined"
          sx={{ color: "text.primary", "& .MuiChip-label": { color: "inherit" } }}
        />
      ) : (
        "—"
      );

      const ownershipBadge =
        v.ownership_type === "rented" ? (
          <Chip
            label={t("vehicles.rentedOwner", { name: v.owner_name || "—" })}
            size="small"
            sx={{
              bgcolor: paletteLight.badgeColors.warning.background,
              color: paletteLight.badgeColors.warning.text,
              "& .MuiChip-label": { color: paletteLight.badgeColors.warning.text, whiteSpace: "nowrap" },
            }}
          />
        ) : v.ownership_type === "leased" ? (
          <Chip
            label={t("vehicles.leasedOwner", { name: v.owner_name || "—" })}
            size="small"
            sx={{
              bgcolor: paletteLight.badgeColors.info.background,
              color: paletteLight.badgeColors.info.text,
              "& .MuiChip-label": { color: paletteLight.badgeColors.info.text, whiteSpace: "nowrap" },
            }}
          />
        ) : (
          <Chip
            label={t("vehicles.owned")}
            size="small"
            sx={{
              bgcolor: paletteLight.badgeColors.success.background,
              color: paletteLight.badgeColors.success.text,
              "& .MuiChip-label": { color: paletteLight.badgeColors.success.text },
            }}
          />
        );

      const fuelTypeBadge = v.fuel_type ? (
        <Chip
          label={enumLabel("vehicle.fuel", v.fuel_type, t)}
          size="small"
          variant="outlined"
          sx={{ color: "text.primary", "& .MuiChip-label": { color: "inherit" } }}
        />
      ) : (
        "—"
      );

      const fuelLevel = toNum(v.current_fuel_level);
      const fuelCap = toNum(v.fuel_capacity);
      const fuelLevelGauge =
        fuelLevel != null && fuelCap != null && fuelCap > 0 ? (
          <MDBox display="flex" justifyContent="center">
            <FuelGaugeMini percent={(fuelLevel / fuelCap) * 100} />
          </MDBox>
        ) : (
          "—"
        );

      const totalKm = toNum(v.total_km);
      const totalKmDisplay =
        totalKm != null ? (
          <MDTypography variant="body2" sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {formatNumber(totalKm, lang)}
          </MDTypography>
        ) : (
          "—"
        );

      const nextKm = toNum(v.next_maintenance_km);
      const maintDate = formatDate(v.last_maintenance_date, lang);
      const maintTitle =
        nextKm != null
          ? `${maintDate} · ${t("common.distanceKm", { value: formatNumber(nextKm, lang) })}`
          : maintDate;
      const maintenanceInfo = (
        <MDTypography variant="caption" noWrap title={maintTitle} sx={{ fontVariantNumeric: "tabular-nums" }}>
          {maintDate}
        </MDTypography>
      );

      const emissionBadge = v.emission_class ? (
        <MDBadge
          badgeContent={enumLabel("vehicle.emission", v.emission_class, t)}
          color={emissionClassColor(v.emission_class)}
          variant="gradient"
          size="sm"
        />
      ) : (
        "—"
      );

      const driverName = driverNameByVehicleId.get(v.id) ?? null;

      const hazmatClasses = Array.isArray(v.hazmat_certified_classes) ? v.hazmat_certified_classes : [];
      const volumeM3 = toNum(v.cargo_capacity_volume_m3);
      const weightKg = toNum(v.cargo_capacity_weight_kg);
      const hasCapacityData = volumeM3 != null || weightKg != null || hazmatClasses.length > 0;
      const capacitySummary = hasCapacityData
        ? [
            volumeM3 != null ? `${formatNumber(volumeM3, lang)} m³` : null,
            weightKg != null ? `${formatNumber(weightKg, lang)} kg` : null,
            hazmatClasses.length > 0 ? t("vehicles.capacityHazmatCount", { count: hazmatClasses.length }) : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : t("vehicles.capacityNone");
      const capacityCell = (
        <MDBox display="flex" alignItems="center" justifyContent="space-between" gap={0.5}>
          <MDTypography variant="caption" noWrap title={capacitySummary} sx={{ color: hasCapacityData ? "text.main" : "text.secondary" }}>
            {capacitySummary}
          </MDTypography>
          <IconButton
            size="small"
            aria-label={t("vehicles.editCapacityAction")}
            title={t("vehicles.editCapacityAction")}
            onClick={() => openCapacityEdit(v)}
          >
            <Icon fontSize="small">edit</Icon>
          </IconButton>
        </MDBox>
      );

      return {
        vehicle_info: vehicleInfo,
        category_badge: categoryBadge,
        ownership_badge: ownershipBadge,
        fuel_type_badge: fuelTypeBadge,
        fuel_level_gauge: fuelLevelGauge,
        total_km_display: totalKmDisplay,
        maintenance_info: maintenanceInfo,
        emission_badge: emissionBadge,
        status_badge: <StatusChip kind="vehicle" value={v.status} />,
        assigned_driver_name: driverName ?? "—",
        capacity_cell: capacityCell,
        id: v.id,
        _ariaLabel: plate,
      };
    });

    return { columns, rows };
  }, [vehicles, driverNameByVehicleId, navigate, t, lang, openCapacityEdit]);

  const status = listFetchState({
    isLoading,
    isPending,
    isSuccess,
    isPlaceholderData,
    isError,
    isPaused,
    data,
    error,
  });

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox p={3}>
        <MDTypography variant="h5" component="h2" gutterBottom>
          {t("vehicles.title")}
        </MDTypography>
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={4}>
            <ComplexStatisticsCard
              color="info"
              icon="local_shipping"
              title={t("vehicles.kpiActive")}
              count={vehicles.length}
              percentage={{ color: "success", amount: t("vehicles.kpiLive"), label: t("vehicles.kpiRealtime") }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <ComplexStatisticsCard
              color="success"
              icon="people"
              title={t("vehicles.kpiDrivers")}
              count={drivers.length}
              percentage={{ color: "success", amount: t("vehicles.kpiActiveAmount"), label: "" }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <ComplexStatisticsCard
              color="warning"
              icon="local_gas_station"
              title={t("vehicles.kpiAvgFuel")}
              count="60%"
              percentage={{ color: "warning", amount: "~", label: t("vehicles.kpiAverage") }}
            />
          </Grid>
        </Grid>
        <DataState
          status={status}
          stale={isDataStale(dataUpdatedAt)}
          staleWhen={dataUpdatedAt}
          onRetry={() => {
            void refetch();
          }}
          emptyMessage={t("dataState.emptyVehicles")}
          emptyIcon="local_shipping"
          errorMessage={error?.message}
        >
          <DataTable
            table={table}
            canSearch
            loading={status === "loading"}
            ariaLabel={t("vehicles.title")}
            entriesPerPage={VEHICLES_PAGE_SIZE}
          />
        </DataState>
      </MDBox>

      <ConfirmDialogShell
        open={editVehicle !== null}
        severity="accent"
        icon="edit"
        title={t("vehicles.editCapacityTitle")}
        subtitle={editVehicle?.plate_no || undefined}
        submitting={updateCapacity.isPending}
        confirmLabel={t("vehicles.editCapacitySave")}
        submittingLabel={t("vehicles.editCapacitySaving")}
        onCancel={closeCapacityEdit}
        onConfirm={saveCapacity}
      >
        <MDBox display="flex" gap={1.5} mb={2}>
          <TextField
            fullWidth
            size="small"
            label={t("vehicles.volumeM3Label")}
            value={draft.volumeM3}
            onChange={(e) => setDraft((prev) => ({ ...prev, volumeM3: e.target.value }))}
            inputProps={{ inputMode: "decimal" }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            size="small"
            label={t("vehicles.weightKgLabel")}
            value={draft.weightKg}
            onChange={(e) => setDraft((prev) => ({ ...prev, weightKg: e.target.value }))}
            inputProps={{ inputMode: "decimal" }}
            InputLabelProps={{ shrink: true }}
          />
        </MDBox>
        <MDTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
          {t("vehicles.hazmatTitle")}
        </MDTypography>
        <MDBox display="flex" flexWrap="wrap" gap={0.75}>
          {HAZMAT_CLASS_OPTIONS.map((cls) => {
            const selected = draft.hazmatClasses.includes(cls);
            return (
              <Chip
                key={cls}
                label={hazmatLabel(cls, t)}
                size="small"
                clickable
                color={selected ? "warning" : "default"}
                variant={selected ? "filled" : "outlined"}
                onClick={() => toggleDraftHazmat(cls)}
              />
            );
          })}
        </MDBox>
      </ConfirmDialogShell>
    </DashboardLayout>
  );
}

export default VehiclesLayout;
