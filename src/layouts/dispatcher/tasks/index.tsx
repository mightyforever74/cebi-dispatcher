import { Tab, Tabs } from "@mui/material";
import DataState, { isDataStale, listFetchState } from "components/DataState";
import DataTable, { type DataColumn, type DataRow } from "components/DataTable";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import StatusChip, { PriorityChip } from "components/StatusChip";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import useDrivers, { type Driver } from "hooks/useDrivers";
import useTasks, { type Task, type TaskFilter } from "hooks/useTasks";
import useVehicles, { type Vehicle } from "hooks/useVehicles";
import { formatDateTime, formatNumber, useT } from "i18n";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toNum } from "utils/toNum";

const EMPTY_TASKS: Task[] = [];
const EMPTY_DRIVERS: Driver[] = [];
const EMPTY_VEHICLES: Vehicle[] = [];
const TASKS_PAGE_SIZE = { defaultValue: 10, entries: [5, 10, 25, 50] };

function TasksLayout(): JSX.Element {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TaskFilter>("all");
  const {
    data,
    isLoading,
    isError,
    isPaused,
    error,
    dataUpdatedAt,
    refetch,
  } = useTasks(filter);
  const tasks = data ?? EMPTY_TASKS;
  const { data: driversData } = useDrivers();
  const { data: vehiclesData } = useVehicles();
  const drivers = driversData ?? EMPTY_DRIVERS;
  const vehicles = vehiclesData ?? EMPTY_VEHICLES;

  const driverNameById = useMemo(() => {
    const m = new Map<string, string>();
    drivers.forEach((d: Driver) => {
      if (!d?.id) return;
      const name = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || d.email || "—";
      m.set(d.id, name);
    });
    return m;
  }, [drivers]);

  const plateById = useMemo(() => {
    const m = new Map<string, string>();
    vehicles.forEach((v: Vehicle) => {
      if (v?.id && v?.plate_no) m.set(v.id, v.plate_no);
    });
    return m;
  }, [vehicles]);

  const table = useMemo(() => {
    const columns: DataColumn[] = [
      { Header: t("tasks.colTask"), accessor: "task_info", minWidth: 140, flex: 1, truncate: true, primary: true },
      { Header: t("tasks.colRoute"), accessor: "route_info", minWidth: 120, maxWidth: 180, truncate: true, primary: true },
      { Header: t("tasks.colDriverVehicle"), accessor: "driver_vehicle", minWidth: 120, maxWidth: 160, truncate: true },
      { Header: t("tasks.colScheduled"), accessor: "scheduled_info", minWidth: 110, maxWidth: 140 },
      { Header: t("tasks.colDistance"), accessor: "distance_display", minWidth: 72, maxWidth: 88, numeric: true },
      { Header: t("tasks.colPriority"), accessor: "priority_badge", minWidth: 72, maxWidth: 90 },
      { Header: t("tasks.colStatus"), accessor: "status_badge", minWidth: 96, maxWidth: 120, primary: true },
    ];

    const rows: DataRow[] = tasks.map((task: Task) => {
      const taskNo = task.task_no || "—";
      const taskTitle = task.title || "";
      const taskLine = taskTitle ? `${taskNo} — ${taskTitle}` : taskNo;
      const taskInfo = (
        <MDTypography variant="body2" fontWeight="medium" noWrap title={taskLine}>
          {taskLine}
        </MDTypography>
      );

      const routeLine = `${task.start_location || "—"} → ${task.end_location || "—"}`;
      const routeInfo = (
        <MDTypography
          variant="caption"
          noWrap
          title={routeLine}
          sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, maxWidth: "100%" }}
        >
          {routeLine}
        </MDTypography>
      );

      const driverName = task.driver_id ? driverNameById.get(task.driver_id) ?? "—" : "—";
      const plate = task.vehicle_id ? plateById.get(task.vehicle_id) ?? null : null;
      const driverLine = plate ? `${driverName} · ${plate}` : driverName;
      const driverVehicle = (
        <MDTypography variant="body2" noWrap title={driverLine}>
          {driverLine}
        </MDTypography>
      );

      const start = formatDateTime(task.scheduled_start, lang);
      const end = task.scheduled_end ? formatDateTime(task.scheduled_end, lang) : "";
      const scheduledInfo = (
        <MDTypography
          variant="caption"
          noWrap
          title={end ? `${start} – ${end}` : start}
          sx={{ fontVariantNumeric: "tabular-nums" }}
        >
          {start}
        </MDTypography>
      );

      const km = toNum(task.total_distance_km);
      const distanceDisplay =
        km != null ? (
          <MDTypography variant="body2" sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {t("common.distanceKm", { value: formatNumber(km, lang) })}
          </MDTypography>
        ) : (
          "—"
        );

      return {
        task_info: taskInfo,
        route_info: routeInfo,
        driver_vehicle: driverVehicle,
        scheduled_info: scheduledInfo,
        distance_display: distanceDisplay,
        priority_badge: <PriorityChip value={task.priority} />,
        status_badge: <StatusChip kind="task" value={task.status} />,
        id: task.id,
        _ariaLabel: taskNo,
      };
    });

    return { columns, rows };
  }, [tasks, driverNameById, plateById, t, lang]);

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
        <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <MDTypography variant="h5" component="h2" gutterBottom>
            {t("tasks.title")}
          </MDTypography>
          <MDButton
            variant="gradient"
            color="info"
            size="small"
            onClick={() => navigate("/dispatcher/tasks/optimize")}
          >
            {t("tasks.newTask")}
          </MDButton>
        </MDBox>

        <MDBox mb={2}>
          <Tabs
            value={filter}
            onChange={(_, v) => setFilter(v as TaskFilter)}
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label={t("tasks.tabAll")} value="all" />
            <Tab label={t("tasks.tabReview")} value="pending_review" />
            <Tab label={t("tasks.tabToday")} value="today" />
            <Tab label={t("tasks.tabPlanned")} value="planned" />
          </Tabs>
        </MDBox>

        <DataState
          status={status}
          stale={isDataStale(dataUpdatedAt)}
          staleWhen={dataUpdatedAt}
          onRetry={() => {
            void refetch();
          }}
          emptyMessage={t("dataState.emptyTasks")}
          emptyIcon="assignment"
          emptyCtaLabel={t("dataState.emptyTasksCta")}
          emptyCtaTo="/dispatcher/tasks/optimize"
          errorMessage={error?.message}
        >
          <DataTable
            table={table}
            canSearch
            loading={isLoading}
            ariaLabel={t("tasks.title")}
            entriesPerPage={TASKS_PAGE_SIZE}
          />
        </DataState>
      </MDBox>
    </DashboardLayout>
  );
}

export default TasksLayout;
