import { Chip, Tab, Tabs } from "@mui/material";
import DataState, { dataStateOf, isDataStale } from "components/DataState";
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

function TasksLayout(): JSX.Element {
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TaskFilter>("all");
  const { data: tasks = [], isLoading, isError, error, dataUpdatedAt, refetch } = useTasks(filter);
  const { data: drivers = [] } = useDrivers();
  const { data: vehicles = [] } = useVehicles();

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
      const taskInfo = (
        <MDBox display="flex" flexDirection="column" title={taskTitle ? `${taskNo} — ${taskTitle}` : taskNo}>
          <MDTypography variant="body2" fontWeight="medium" noWrap>
            {taskNo}
          </MDTypography>
          {taskTitle ? (
            <MDTypography variant="caption" color="dark" noWrap>
              {taskTitle}
            </MDTypography>
          ) : null}
        </MDBox>
      );

      const routeInfo = (
        <MDBox display="flex" flexDirection="column" title={`${task.start_location || "—"} → ${task.end_location || "—"}`}>
          <MDTypography variant="caption" noWrap>
            {task.start_location || "—"}
          </MDTypography>
          <MDTypography variant="caption" color="dark" noWrap>
            → {task.end_location || "—"}
          </MDTypography>
        </MDBox>
      );

      const driverName = task.driver_id ? driverNameById.get(task.driver_id) ?? "—" : "—";
      const plate = task.vehicle_id ? plateById.get(task.vehicle_id) ?? null : null;
      const driverVehicle = (
        <MDBox display="flex" flexDirection="column" gap={0.5}>
          <MDTypography variant="body2" noWrap>
            {driverName}
          </MDTypography>
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
          <MDTypography variant="caption">{formatDateTime(task.scheduled_start, lang)}</MDTypography>
          {task.scheduled_end ? (
            <MDTypography variant="caption" color="dark">
              {formatDateTime(task.scheduled_end, lang)}
            </MDTypography>
          ) : null}
        </MDBox>
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

  const status = dataStateOf({
    isLoading,
    isError,
    isEmpty: !isLoading && !isError && tasks.length === 0,
  });

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox p={3}>
        <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <MDTypography variant="h5" gutterBottom>
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
          errorMessage={error ? t("common.errorWithMessage", { message: error.message }) : undefined}
        >
          <DataTable
            table={table}
            canSearch
            loading={isLoading}
            ariaLabel={t("tasks.title")}
            entriesPerPage={{ defaultValue: 10, entries: [5, 10, 25, 50] }}
          />
        </DataState>
      </MDBox>
    </DashboardLayout>
  );
}

export default TasksLayout;
