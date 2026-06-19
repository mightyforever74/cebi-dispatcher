import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

function TollAnalyticsPlaceholder(): JSX.Element {
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Card>
          <MDBox p={6} textAlign="center">
            <Icon sx={{ fontSize: "48px !important" }} color="warning">
              euro_symbol
            </Icon>
            <MDBox mt={2}>
              <MDTypography variant="h4" fontWeight="medium">
                Maliyet & Otoban Teftişi (Toll)
              </MDTypography>
            </MDBox>
            <MDBox mt={1}>
              <MDTypography variant="body2" color="text">
                Vrachtwagenheffing yol vergisi ve rota maliyet kırılımları (FEAT-008) Temmuz 2026
                HERE API canlıya geçince aktive edilecek.
              </MDTypography>
            </MDBox>
          </MDBox>
        </Card>
      </MDBox>
    </DashboardLayout>
  );
}

export default TollAnalyticsPlaceholder;
