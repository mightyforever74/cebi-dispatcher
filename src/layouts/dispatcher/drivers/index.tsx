import MDBadge from "components/MDBadge";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DataTable from "examples/Tables/DataTable";
import useDrivers from "hooks/useDrivers";
import { useMemo } from "react";

function DriversLayout(): JSX.Element {
  const { data: drivers = [], isLoading, error } = useDrivers();

  const table = useMemo(() => {
    const columns = [
      { Header: "Sürücü", accessor: "driver_name" },
      { Header: "Telefon / Ehliyet", accessor: "contact_info" },
      { Header: "Güvenlik Skoru", accessor: "safety_score" },
      { Header: "Durum", accessor: "status_badge" },
    ];

    const rows = drivers.map((d: any) => {
      const fullName = `${d.first_name || ""} ${d.last_name || ""}`.trim() || "N/A";
      const email = d.email || "";

      let statusColor: "success" | "info" | "warning" | "error" = "warning";
      let statusLabel = d.status || "unknown";
      if (d.status === "available") {
        statusColor = "success";
        statusLabel = "Müsait";
      } else if (d.status === "on_task") {
        statusColor = "info";
        statusLabel = "Görevde";
      }

      return {
        driver_name: (
          <MDBox>
            <MDTypography variant="body2" fontWeight="medium">
              {fullName}
            </MDTypography>
            <MDTypography variant="caption" color="text.secondary">
              {email}
            </MDTypography>
          </MDBox>
        ),
        contact_info: (
          <MDBox>
            <MDTypography variant="body2">{d.phone || "—"}</MDTypography>
            <MDTypography variant="caption" color="text.secondary">
              {d.license_no || "—"}
            </MDTypography>
          </MDBox>
        ),
        safety_score: (
          <MDTypography variant="body2">
            {d.safety_score != null && !isNaN(Number(d.safety_score))
              ? Number(d.safety_score).toFixed(1)
              : "—"}
          </MDTypography>
        ),
        status_badge: (
          <MDBadge badgeContent={statusLabel} color={statusColor} variant="gradient" size="sm" />
        ),
        id: d.id,
      };
    });

    return { columns, rows };
  }, [drivers]);

  return (
    <MDBox p={3}>
      <MDTypography variant="h5" gutterBottom>
        Sürücü Listesi
      </MDTypography>

      <DataTable
        table={table}
        canSearch
        entriesPerPage={{ defaultValue: 10, entries: [5, 10, 25, 50] }}
      />

      {isLoading && (
        <MDTypography variant="caption" color="text.secondary">
          Sürücüler yükleniyor...
        </MDTypography>
      )}

      {error && (
        <MDTypography variant="caption" color="error">
          {error.message}
        </MDTypography>
      )}
    </MDBox>
  );
}

export default DriversLayout;
