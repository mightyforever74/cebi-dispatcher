import { Chip } from "@mui/material";
import MDBadge from "components/MDBadge";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import DataTable from "examples/Tables/DataTable";
import useDrivers from "hooks/useDrivers";
import useVehicles from "hooks/useVehicles";
import { useMemo } from "react";
import { toNum } from "utils/toNum";

function VehiclesLayout(): JSX.Element {
  const { data: vehicles = [], isLoading, error } = useVehicles();
  const { data: drivers = [] } = useDrivers(); // YENİ

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
      { Header: "Plaat / Model", accessor: "vehicle_info" },
      { Header: "Categorie", accessor: "category_badge" },
      { Header: "Brandstof", accessor: "fuel_type_badge" },
      { Header: "Totaal km", accessor: "total_km_display" },
      { Header: "Onderhoud", accessor: "maintenance_info" },
      { Header: "Emissie", accessor: "emission_badge" },
      { Header: "Status", accessor: "status_badge" },
      { Header: "Chauffeur", accessor: "assigned_driver_name" },
    ];

    const rows = vehicles.map((v: any) => {
      const vehicleInfo = (
        <MDBox display="flex" alignItems="center" gap={1}>
          <MDBox display="flex" flexDirection="column">
            <MDTypography variant="body2" fontWeight="medium">
              {v.plate_no || "—"}
            </MDTypography>
            <MDTypography variant="caption" color="text.secondary">
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

      const fuelTypeBadge = v.fuel_type ? (
        <Chip label={v.fuel_type} size="small" variant="outlined" />
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
            <MDTypography variant="caption" color="text.secondary">
              {toNum(v.next_maintenance_km)!.toLocaleString("nl-NL")} km
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
        fuel_type_badge: fuelTypeBadge,
        total_km_display: totalKmDisplay,
        maintenance_info: maintenanceInfo,
        emission_badge: emissionBadge,
        status_badge: statusBadge,
        assigned_driver_name: assignedDriverName,
        id: v.id,
      };
    });

    return { columns, rows };
  }, [vehicles, driverNameByVehicleId]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox p={3}>
        <MDTypography variant="h5" gutterBottom>
          Voertuigen
        </MDTypography>

        <DataTable
          table={table}
          canSearch
          entriesPerPage={{ defaultValue: 10, entries: [5, 10, 25, 50] }}
        />

        {isLoading && (
          <MDTypography variant="caption" color="text.secondary">
            Voertuigen laden...
          </MDTypography>
        )}

        {error && (
          <MDTypography variant="caption" color="error">
            Fout: {error.message}
          </MDTypography>
        )}
      </MDBox>
    </DashboardLayout>
  );
}

export default VehiclesLayout;
