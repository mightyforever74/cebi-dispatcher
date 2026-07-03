import { Chip, Tab, Tabs } from "@mui/material";
import MDBadge from "components/MDBadge";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import DataTable from "examples/Tables/DataTable";
import useDrivers from "hooks/useDrivers";
import useTasks, { TaskFilter } from "hooks/useTasks";
import useVehicles from "hooks/useVehicles";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toNum } from "utils/toNum";

type BadgeColor =
  | "primary"
  | "secondary"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "light"
  | "dark";

function TasksLayout(): JSX.Element {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TaskFilter>("all");
  const { data: tasks = [], isLoading, error } = useTasks(filter);
  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();

  // driver_id -> "Ad Soyad" haritası (tasks endpoint JOIN'siz uuid döndürüyor)
  const driverNameById = useMemo(() => {
    const m = new Map<string, string>();
    drivers.forEach((d: any) => {
      if (!d?.id) return;
      const name = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || d.email || "—";
      m.set(d.id, name);
    });
    return m;
  }, [drivers]);

  // vehicle_id -> plate_no haritası
  const plateById = useMemo(() => {
    const m = new Map<string, string>();
    vehicles.forEach((v: any) => {
      if (v?.id && v?.plate_no) m.set(v.id, v.plate_no);
    });
    return m;
  }, [vehicles]);

  // 9 statünün tamamı (canlı \d public.tasks CHECK constraint)
  const statusColor = (status?: string): BadgeColor => {
    switch (status) {
      case "pending":
        return "secondary";
      case "pending_review":
        return "warning";
      case "accepted":
        return "info";
      case "assigned":
        return "info";
      case "in_progress":
        return "primary";
      case "completed":
        return "success";
      case "rejected":
        return "error";
      case "cancelled":
        return "error";
      case "withdrawn":
        return "dark";
      default:
        return "secondary"; // bilinmeyen statü de görünür, white-screen yok
    }
  };

  const priorityColor = (priority?: string): BadgeColor => {
    switch (priority) {
      case "high":
        return "error";
      case "low":
        return "secondary";
      default:
        return "info"; // normal
    }
  };

  const formatDateTime = (s?: string | null): string => {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleString("nl-NL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const table = useMemo(() => {
    const columns = [
      { Header: "Taak", accessor: "task_info" },
      { Header: "Route", accessor: "route_info" },
      { Header: "Chauffeur / Voertuig", accessor: "driver_vehicle" },
      { Header: "Gepland", accessor: "scheduled_info" },
      { Header: "Afstand", accessor: "distance_display" },
      { Header: "Prioriteit", accessor: "priority_badge" },
      { Header: "Status", accessor: "status_badge" },
    ];

    const rows = tasks.map((t: any) => {
      const taskInfo = (
        <MDBox display="flex" flexDirection="column">
          <MDTypography variant="body2" fontWeight="medium">
            {t.task_no || "—"}
          </MDTypography>
          {t.title && (
            <MDTypography variant="caption" color="dark">
              {t.title}
            </MDTypography>
          )}
        </MDBox>
      );

      const routeInfo = (
        <MDBox display="flex" flexDirection="column">
          <MDTypography variant="caption">{t.start_location || "—"}</MDTypography>
          <MDTypography variant="caption" color="dark">
            → {t.end_location || "—"}
          </MDTypography>
        </MDBox>
      );

      const driverName = t.driver_id ? driverNameById.get(t.driver_id) ?? "—" : "—";
      const plate = t.vehicle_id ? plateById.get(t.vehicle_id) ?? null : null;
      const driverVehicle = (
        <MDBox display="flex" flexDirection="column" gap={0.5}>
          <MDTypography variant="body2">{driverName}</MDTypography>
          {plate ? (
            <Chip label={plate} size="small" variant="outlined" />
          ) : (
            <MDTypography variant="caption" color="dark">
              —
            </MDTypography>
          )}
        </MDBox>
      );

      const scheduledInfo = (
        <MDBox display="flex" flexDirection="column">
          <MDTypography variant="caption">{formatDateTime(t.scheduled_start)}</MDTypography>
          {t.scheduled_end && (
            <MDTypography variant="caption" color="dark">
              {formatDateTime(t.scheduled_end)}
            </MDTypography>
          )}
        </MDBox>
      );

      const km = toNum(t.total_distance_km);
      const distanceDisplay =
        km != null ? (
          <MDTypography variant="body2" sx={{ textAlign: "right" }}>
            {km.toLocaleString("nl-NL")} km
          </MDTypography>
        ) : (
          <MDTypography variant="caption">—</MDTypography>
        );

      const priorityBadge = (
        <MDBadge
          badgeContent={t.priority || "normal"}
          color={priorityColor(t.priority)}
          variant="gradient"
          size="sm"
        />
      );

      const statusBadge = (
        <MDBadge
          badgeContent={t.status || "unknown"}
          color={statusColor(t.status)}
          variant="gradient"
          size="sm"
        />
      );

      return {
        task_info: taskInfo,
        route_info: routeInfo,
        driver_vehicle: driverVehicle,
        scheduled_info: scheduledInfo,
        distance_display: distanceDisplay,
        priority_badge: priorityBadge,
        status_badge: statusBadge,
        id: t.id,
      };
    });

    return { columns, rows };
  }, [tasks, driverNameById, plateById]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox p={3}>
        <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <MDTypography variant="h5" gutterBottom>
            Taken
          </MDTypography>
          <MDButton
            variant="gradient"
            color="info"
            size="small"
            onClick={() => navigate("/dispatcher/tasks/optimize")}
          >
            + Nieuwe Taak
          </MDButton>
        </MDBox>

        <MDBox mb={2}>
          <Tabs
            value={filter}
            onChange={(_, v) => setFilter(v as TaskFilter)}
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label="Alle" value="all" />
            <Tab label="Te beoordelen" value="pending_review" />
            <Tab label="Vandaag" value="today" />
            <Tab label="Gepland" value="planned" />
          </Tabs>
        </MDBox>

        <DataTable
          table={table}
          canSearch
          entriesPerPage={{ defaultValue: 10, entries: [5, 10, 25, 50] }}
        />

        {isLoading && (
          <MDTypography variant="caption" color="dark">
            Taken laden...
          </MDTypography>
        )}

        {!isLoading && !error && tasks.length === 0 && (
          <MDBox py={3} textAlign="center">
            <MDTypography variant="body2" color="dark">
              Geen taken in dit filter.
            </MDTypography>
          </MDBox>
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

export default TasksLayout;
