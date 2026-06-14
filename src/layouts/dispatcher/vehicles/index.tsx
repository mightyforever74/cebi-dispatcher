import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DataTable from "examples/Tables/DataTable";
import useVehicles from "hooks/useVehicles";
import { useMemo } from "react";

function VehiclesLayout(): JSX.Element {
  const { data: vehicles = [], isLoading, error } = useVehicles();

  const table = useMemo(() => {
    const columns = [
      { Header: "Plate", accessor: "plate_no" },
      { Header: "Status", accessor: "status" },
      { Header: "Company", accessor: "company_id" },
      { Header: "Created", accessor: "created_at" },
    ];

    const rows = vehicles.map((v: any) => ({
      plate_no: v.plate_no || v.registration || v.id,
      status: v.status || "unknown",
      company_id: v.company_id || "",
      created_at: v.created_at ? new Date(v.created_at).toLocaleString() : "",
      id: v.id,
    }));

    return { columns, rows };
  }, [vehicles]);

  return (
    <MDBox p={3}>
      <MDTypography variant="h5" gutterBottom>
        Araç Listesi
      </MDTypography>

      {/* Show the DataTable; DataTable handles empty rows gracefully */}
      <DataTable
        table={table}
        canSearch
        entriesPerPage={{ defaultValue: 10, entries: [5, 10, 25, 50] }}
      />

      {isLoading && (
        <MDTypography variant="caption" color="text.secondary">
          Loading vehicles...
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

export default VehiclesLayout;
