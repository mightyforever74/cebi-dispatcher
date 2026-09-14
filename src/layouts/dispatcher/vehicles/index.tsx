import { Chip } from "@mui/material";
import Grid from "@mui/material/Grid";
import FuelGaugeMini from "components/FuelGaugeMini";
import MDBadge from "components/MDBadge";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import ComplexStatisticsCard from "examples/Cards/StatisticsCards/ComplexStatisticsCard";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import DataTable from "examples/Tables/DataTable";
import useDrivers from "hooks/useDrivers";
import useVehicles from "hooks/useVehicles";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useT } from "i18n";
import { toNum } from "utils/toNum";

function VehiclesLayout(): JSX.Element {
  const { t } = useT();
  const { data: vehicles = [], isLoading, error } = useVehicles();
  const { data: drivers = [] } = useDrivers(); // YENİ
  const navigate = useNavigate();

  // assigned_vehicle_id -> driver_name ters haritası
  const driverNameByVehicleId = useMemo(() => {
    const m = new Map<string, string>();
    drivers.forEach((d: any) => {
      if (!d?.assigned_vehicle_id) return;
      const name = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || d.email || "—";
      if (!m.has(d.assigned_vehicle_id)) m.set(d.assigned_vehicle_id, name); // ilk eşleşmeyi tut
    });
    return m;
  }, [drivers]);
  // Helper: map emission_class to compliance badge color
  const emissionClassColor = (emissionClass?: string): "success" | "info" | "warning" | "error" => {
    if (!emissionClass) return "info";
    if (emissionClass === "zero_emission") return "success";
    if (emissionClass.startsWith("euro_6")) return "success";
    if (emissionClass.startsWith("euro_5")) return "info";
    return "warning";
  };

  // Helper: map status to badge color
  const statusColor = (status?: string): "success" | "info" | "warning" | "error" => {
    switch (status) {
      case "available":
        return "success";
      case "in_use":
        return "info";
      case "maintenance":
        return "warning";
      case "retired":
        return "error";
      default:
        return "info";
    }
  };

  // Helper: format date
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("nl-NL");
    } catch {
      return "—";
    }
  };

  const table = useMemo(() => {
    const columns = [
      { Header: t("vehicles.colPlateModel"), accessor: "vehicle_info" },
      { Header: t("vehicles.colCategory"), accessor: "category_badge" },
      { Header: t("vehicles.colOwnership"), accessor: "ownership_badge" },
      { Header: t("vehicles.colFuel"), accessor: "fuel_type_badge" },
      { Header: t("vehicles.colFuelLevel"), accessor: "fuel_level_gauge" },
      { Header: t("vehicles.colTotalKm"), accessor: "total_km_display" },
      { Header: t("vehicles.colMaintenance"), accessor: "maintenance_info" },
      { Header: t("vehicles.colEmission"), accessor: "emission_badge" },
      { Header: t("vehicles.colStatus"), accessor: "status_badge" },
      { Header: t("vehicles.colDriver"), accessor: "assigned_driver_name" },
    ];

    const rows = vehicles.map((v: any) => {
      const vehicleInfo = (
        <MDBox
          display="flex"
          alignItems="center"
          gap={1}
          onClick={() =>
            v.plate_no &&
            navigate(`/dashboards/live-fleet-map?focusPlate=${encodeURIComponent(v.plate_no)}`)
          }
          sx={{ cursor: v.plate_no ? "pointer" : "default" }}
        >
          <MDBox display="flex" flexDirection="column">
            <MDTypography
              variant="body2"
              fontWeight="medium"
              sx={{ color: "info.main", "&:hover": { textDecoration: "underline" } }}
            >
              {v.plate_no || "—"}
            </MDTypography>
            <MDTypography variant="caption" color="dark">
              {[v.brand, v.model].filter(Boolean).join(" ") || "—"}
            </MDTypography>
          </MDBox>
        </MDBox>
      );

      const categoryBadge = v.vehicle_category ? (
        <Chip label={v.vehicle_category} size="small" variant="outlined" />
      ) : (
        <MDTypography variant="caption">—</MDTypography>
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
        <Chip label={v.fuel_type} size="small" variant="outlined" />
      ) : (
        <MDTypography variant="caption">—</MDTypography>
      );

      // Yakıt seviyesi göstergesi: current_fuel_level / fuel_capacity -> %
      const fuelLevel = toNum(v.current_fuel_level);
      const fuelCap = toNum(v.fuel_capacity);
      const fuelLevelGauge =
        fuelLevel != null && fuelCap != null && fuelCap > 0 ? (
          <MDBox display="flex" justifyContent="center">
            <FuelGaugeMini percent={(fuelLevel / fuelCap) * 100} />
          </MDBox>
        ) : (
          <MDTypography variant="caption">—</MDTypography>
        );

      const totalKm = toNum(v.total_km);
      const totalKmDisplay =
        totalKm != null ? (
          <MDTypography variant="body2" sx={{ textAlign: "right" }}>
            {totalKm.toLocaleString("nl-NL")}
          </MDTypography>
        ) : (
          <MDTypography variant="caption">—</MDTypography>
        );

      const maintenanceInfo = (
        <MDBox display="flex" flexDirection="column" gap={0.5}>
          <MDTypography variant="caption">
            {v.last_maintenance_date ? formatDate(v.last_maintenance_date) : "—"}
          </MDTypography>
          {toNum(v.next_maintenance_km) != null && (
            <MDTypography variant="caption" color="dark">
              {t("common.distanceKm", {
                value: toNum(v.next_maintenance_km)!.toLocaleString("nl-NL"),
              })}
            </MDTypography>
          )}
        </MDBox>
      );

      const emissionBadge = v.emission_class ? (
        <MDBadge
          badgeContent={v.emission_class}
          color={emissionClassColor(v.emission_class)}
          variant="gradient"
          size="sm"
        />
      ) : (
        <MDTypography variant="caption">—</MDTypography>
      );

      const statusBadge = (
        <MDBadge
          badgeContent={v.status || "unknown"}
          color={statusColor(v.status)}
          variant="gradient"
          size="sm"
        />
      );

      // Assigned driver lookup (denormalized from drivers list would require extra endpoint; for now show ID)
      const driverName = driverNameByVehicleId.get(v.id) ?? null;
      const assignedDriverName = driverName ? (
        <MDTypography variant="body2">{driverName}</MDTypography>
      ) : (
        <MDTypography variant="caption">—</MDTypography>
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
        status_badge: statusBadge,
        assigned_driver_name: assignedDriverName,
        id: v.id,
      };
    });

    return { columns, rows };
  }, [vehicles, driverNameByVehicleId, navigate, t]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox p={3}>
        <MDTypography variant="h5" gutterBottom>
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
        <DataTable
          table={table}
          canSearch
          entriesPerPage={{ defaultValue: 10, entries: [5, 10, 25, 50] }}
        />

        {isLoading && (
          <MDTypography variant="caption" color="dark">
            {t("vehicles.loading")}
          </MDTypography>
        )}

        {error && (
          <MDTypography variant="caption" color="error">
            {t("common.errorWithMessage", { message: error.message })}
          </MDTypography>
        )}
      </MDBox>
    </DashboardLayout>
  );
}

export default VehiclesLayout;
