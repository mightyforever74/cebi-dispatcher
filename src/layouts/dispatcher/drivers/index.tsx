import { Box, Chip, LinearProgress } from "@mui/material";
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

function DriversLayout(): JSX.Element {
  const { data: drivers = [], isLoading, error } = useDrivers();
  const { data: vehicles = [] } = useVehicles(); // YENİ (sadece data, isLoading/error gerekmez)

  // vehicle_id -> plate_no haritası
  const plateByVehicleId = useMemo(() => {
    const m = new Map<string, string>();
    vehicles.forEach((v: any) => {
      if (v?.id && v?.plate_no) m.set(v.id, v.plate_no);
    });
    return m;
  }, [vehicles]);

  // Helper: map status to badge color
  const statusColor = (status?: string): "success" | "info" | "warning" | "error" => {
    switch (status) {
      case "available":
        return "success";
      case "on_task":
        return "info";
      case "task_pending":
        return "warning";
      case "on_leave":
        return "warning";
      case "offline":
        return "error";
      default:
        return "info";
    }
  };

  // Helper: format date (ISO date)
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("nl-NL");
    } catch {
      return "—";
    }
  };

  // Helper: normalize safety_score (default 5.0, range 0-10) to percent for progress bar
  const safetyScorePercent = (score?: number): number => {
    if (score == null) return 0;
    return (score / 10) * 100;
  };

  // Helper: safety score color
  const safetyScoreColor = (
    score?: number
  ): "inherit" | "primary" | "secondary" | "error" | "warning" | "info" | "success" => {
    if (score == null) return "inherit";
    if (score >= 7) return "success";
    if (score >= 5) return "info";
    if (score >= 3) return "warning";
    return "error";
  };

  const table = useMemo(() => {
    const columns = [
      { Header: "Chauffeur", accessor: "driver_name" },
      { Header: "Telefoon / Rijbewijs", accessor: "contact_info" },
      { Header: "Veiligheidsscore", accessor: "safety_score_display" },
      { Header: "Status", accessor: "status_badge" },
      { Header: "Toegewezen voertuig", accessor: "assigned_vehicle_plate" },
    ];

    const rows = drivers.map((d: any) => {
      const fullName = `${d.first_name || ""} ${d.last_name || ""}`.trim() || "N/A";
      const email = d.email || "";

      const driverName = (
        <MDBox>
          <MDTypography variant="body2" fontWeight="medium">
            {fullName}
          </MDTypography>
          {email && (
            <MDTypography variant="caption" color="text.secondary">
              {email}
            </MDTypography>
          )}
        </MDBox>
      );

      const contactInfo = (
        <MDBox display="flex" flexDirection="column" gap={0.5}>
          {d.phone && <MDTypography variant="body2">{d.phone}</MDTypography>}
          {d.license_no && (
            <MDTypography variant="caption" color="text.secondary">
              {d.license_no}
              {d.license_expiry && ` (${formatDate(d.license_expiry)})`}
            </MDTypography>
          )}
        </MDBox>
      );

      // Safety score: numeric(3,2), default 5.0, 0-10 scale
      // Display as progress bar + numeric
      const score = toNum(d.safety_score);
      const safetyScoreDisplay = (
        <MDBox display="flex" alignItems="center" gap={1}>
          <Box sx={{ flex: 1, minWidth: 80 }}>
            <LinearProgress
              variant="determinate"
              value={safetyScorePercent(score)}
              sx={{
                backgroundColor: "rgba(0,0,0,0.1)",
                "& .MuiLinearProgress-bar": {
                  backgroundColor: safetyScoreColor(score),
                },
              }}
            />
          </Box>
          <MDTypography variant="body2" sx={{ minWidth: 40 }}>
            {score != null ? score.toFixed(1) : "—"}
          </MDTypography>
        </MDBox>
      );

      const statusLabel = d.status || "unknown";
      const statusBadge = (
        <MDBadge
          badgeContent={statusLabel}
          color={statusColor(d.status)}
          variant="gradient"
          size="sm"
        />
      );

      // Assigned vehicle: show plate if available
      const plate = d.assigned_vehicle_id
        ? plateByVehicleId.get(d.assigned_vehicle_id) ?? null
        : null;
      const assignedVehiclePlate = plate ? (
        <Chip label={plate} size="small" variant="outlined" />
      ) : (
        <MDTypography variant="caption">—</MDTypography>
      );

      return {
        driver_name: driverName,
        contact_info: contactInfo,
        safety_score_display: safetyScoreDisplay,
        status_badge: statusBadge,
        assigned_vehicle_plate: assignedVehiclePlate,
        id: d.id,
      };
    });

    return { columns, rows };
  }, [drivers, plateByVehicleId]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox p={3}>
        <MDTypography variant="h5" gutterBottom>
          Chauffeurs
        </MDTypography>

        <DataTable
          table={table}
          canSearch
          entriesPerPage={{ defaultValue: 10, entries: [5, 10, 25, 50] }}
        />

        {isLoading && (
          <MDTypography variant="caption" color="text.secondary">
            Chauffeurs laden...
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

export default DriversLayout;
