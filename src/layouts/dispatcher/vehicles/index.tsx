import { Chip } from "@mui/material";
import Grid from "@mui/material/Grid";
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
import useVehicles, { type Vehicle } from "hooks/useVehicles";
import { formatDate, formatNumber, useT } from "i18n";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toNum } from "utils/toNum";

const EMPTY_VEHICLES: Vehicle[] = [];
const EMPTY_DRIVERS: Driver[] = [];
const VEHICLES_PAGE_SIZE = { defaultValue: 10, entries: [5, 10, 25, 50] };

function emissionClassColor(emissionClass?: string): "success" | "info" | "warning" | "error" {
  if (!emissionClass) return "info";
  if (emissionClass === "zero_emission") return "success";
  if (emissionClass.startsWith("euro_6")) return "success";
  if (emissionClass.startsWith("euro_5")) return "info";
  return "warning";
}

function VehiclesLayout(): JSX.Element {
  const { t, lang } = useT();
  const { data, isLoading, isError, isPaused, error, dataUpdatedAt, refetch } = useVehicles();
  const { data: driversData } = useDrivers();
  const vehicles = data ?? EMPTY_VEHICLES;
  const drivers = driversData ?? EMPTY_DRIVERS;
  const navigate = useNavigate();

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
            color: "info.main",
            "&:hover": { textDecoration: v.plate_no ? "underline" : "none" },
          }}
        >
          {vehicleLine}
        </MDTypography>
      );

      const categoryBadge = v.vehicle_category ? (
        <Chip label={enumLabel("vehicle.category", v.vehicle_category, t)} size="small" variant="outlined" />
      ) : (
        "—"
      );

      const ownershipBadge =
        v.ownership_type === "rented" ? (
          <Chip
            label={t("vehicles.rentedOwner", { name: v.owner_name || "—" })}
            size="small"
            color="warning"
            variant="outlined"
          />
        ) : v.ownership_type === "leased" ? (
          <Chip
            label={t("vehicles.leasedOwner", { name: v.owner_name || "—" })}
            size="small"
            color="info"
            variant="outlined"
          />
        ) : (
          <Chip label={t("vehicles.owned")} size="small" color="success" variant="outlined" />
        );

      const fuelTypeBadge = v.fuel_type ? (
        <Chip label={enumLabel("vehicle.fuel", v.fuel_type, t)} size="small" variant="outlined" />
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
          badgeContent={v.emission_class}
          color={emissionClassColor(v.emission_class)}
          variant="gradient"
          size="sm"
        />
      ) : (
        "—"
      );

      const driverName = driverNameByVehicleId.get(v.id) ?? null;

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
        id: v.id,
        _ariaLabel: plate,
      };
    });

    return { columns, rows };
  }, [vehicles, driverNameByVehicleId, navigate, t, lang]);

  const status = listFetchState({
    isLoading,
    isError,
    isPaused,
    data,
    error,
  });

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox p={3}>
        <MDTypography variant="h5" component="h3" gutterBottom>
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
          errorMessage={error ? t("common.errorWithMessage", { message: error.message }) : undefined}
        >
          <DataTable
            table={table}
            canSearch
            loading={isLoading}
            ariaLabel={t("vehicles.title")}
            entriesPerPage={VEHICLES_PAGE_SIZE}
          />
        </DataState>
      </MDBox>
    </DashboardLayout>
  );
}

export default VehiclesLayout;
