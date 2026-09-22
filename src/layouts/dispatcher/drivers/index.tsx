import { Box, Chip, LinearProgress } from "@mui/material";
import DataState, { dataStateOf, isDataStale } from "components/DataState";
import DataTable, { type DataColumn, type DataRow } from "components/DataTable";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import StatusChip from "components/StatusChip";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import useDrivers, { type Driver } from "hooks/useDrivers";
import useVehicles, { type Vehicle } from "hooks/useVehicles";
import { formatDate, formatNumber, useT } from "i18n";
import { useMemo } from "react";
import { toNum } from "utils/toNum";

function safetyScorePercent(score?: number): number {
  if (score == null) return 0;
  return (score / 10) * 100;
}

function safetyScoreColor(
  score?: number
): "inherit" | "primary" | "secondary" | "error" | "warning" | "info" | "success" {
  if (score == null) return "inherit";
  if (score >= 7) return "success";
  if (score >= 5) return "info";
  if (score >= 3) return "warning";
  return "error";
}

function DriversLayout(): JSX.Element {
  const { t, lang } = useT();
  const { data: drivers = [], isLoading, isError, error, dataUpdatedAt, refetch } = useDrivers();
  const { data: vehicles = [] } = useVehicles();

  const plateByVehicleId = useMemo(() => {
    const m = new Map<string, string>();
    vehicles.forEach((v: Vehicle) => {
      if (v?.id && v?.plate_no) m.set(v.id, v.plate_no);
    });
    return m;
  }, [vehicles]);

  const table = useMemo(() => {
    const columns: DataColumn[] = [
      { Header: t("drivers.colDriver"), accessor: "driver_name", minWidth: 160, flex: 1, truncate: true, primary: true },
      { Header: t("drivers.colContact"), accessor: "contact_info", minWidth: 140, maxWidth: 200, truncate: true },
      { Header: t("drivers.colSafety"), accessor: "safety_score_display", minWidth: 140, numeric: true, primary: true },
      { Header: t("drivers.colStatus"), accessor: "status_badge", minWidth: 110, maxWidth: 140, primary: true },
      { Header: t("drivers.colVehicle"), accessor: "assigned_vehicle_plate", minWidth: 100, maxWidth: 140 },
    ];

    const rows: DataRow[] = drivers.map((d: Driver) => {
      const fullName = `${d.first_name || ""} ${d.last_name || ""}`.trim() || t("drivers.na");
      const email = d.email || "";

      const driverName = (
        <MDBox title={fullName}>
          <MDTypography variant="body2" fontWeight="medium" noWrap>
            {fullName}
          </MDTypography>
          {email ? (
            <MDTypography variant="caption" color="dark" noWrap>
              {email}
            </MDTypography>
          ) : null}
        </MDBox>
      );

      const contactInfo = (
        <MDBox display="flex" flexDirection="column" gap={0.5}>
          {d.phone ? <MDTypography variant="body2">{d.phone}</MDTypography> : null}
          {d.license_no ? (
            <MDTypography variant="caption" color="dark">
              {d.license_expiry
                ? t("drivers.licenseWithExpiry", {
                    license: d.license_no,
                    expiry: formatDate(d.license_expiry, lang),
                  })
                : d.license_no}
            </MDTypography>
          ) : null}
        </MDBox>
      );

      const score = toNum(d.safety_score);
      const safetyScoreDisplay = (
        <MDBox display="flex" alignItems="center" gap={1}>
          <Box sx={{ flex: 1, minWidth: 80 }}>
            <LinearProgress
              variant="determinate"
              value={safetyScorePercent(score ?? undefined)}
              sx={{
                backgroundColor: "action.hover",
                "& .MuiLinearProgress-bar": {
                  backgroundColor: safetyScoreColor(score ?? undefined),
                },
              }}
            />
          </Box>
          <MDTypography variant="body2" sx={{ minWidth: 40, fontVariantNumeric: "tabular-nums" }}>
            {score != null ? formatNumber(score, lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—"}
          </MDTypography>
        </MDBox>
      );

      const plate = d.assigned_vehicle_id ? plateByVehicleId.get(d.assigned_vehicle_id) ?? null : null;

      return {
        driver_name: driverName,
        contact_info: contactInfo,
        safety_score_display: safetyScoreDisplay,
        status_badge: <StatusChip kind="vehicle" value={d.status} />,
        assigned_vehicle_plate: plate ? <Chip label={plate} size="small" variant="outlined" /> : "—",
        id: d.id,
        _ariaLabel: fullName,
      };
    });

    return { columns, rows };
  }, [drivers, plateByVehicleId, t, lang]);

  const status = dataStateOf({
    isLoading,
    isError,
    isEmpty: !isLoading && !isError && drivers.length === 0,
  });

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox p={3}>
        <MDTypography variant="h5" gutterBottom>
          {t("drivers.title")}
        </MDTypography>

        <DataState
          status={status}
          stale={isDataStale(dataUpdatedAt)}
          staleWhen={dataUpdatedAt}
          onRetry={() => {
            void refetch();
          }}
          emptyMessage={t("dataState.emptyDrivers")}
          emptyIcon="badge"
          errorMessage={error ? t("common.errorWithMessage", { message: error.message }) : undefined}
        >
          <DataTable
            table={table}
            canSearch
            loading={isLoading}
            ariaLabel={t("drivers.title")}
            entriesPerPage={{ defaultValue: 10, entries: [5, 10, 25, 50] }}
          />
        </DataState>
      </MDBox>
    </DashboardLayout>
  );
}

export default DriversLayout;
