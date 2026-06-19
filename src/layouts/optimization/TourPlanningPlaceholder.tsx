import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

function TourPlanningPlaceholder(): JSX.Element {
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Card>
          <MDBox p={6} textAlign="center">
            <Icon sx={{ fontSize: "48px !important" }} color="info">
              insights
            </Icon>
            <MDBox mt={2}>
              <MDTypography variant="h4" fontWeight="medium">
                Akıllı Rota Optimizasyonu (VRP)
              </MDTypography>
            </MDBox>
            <MDBox mt={1}>
              <MDTypography variant="body2" color="text">
                HERE Tour Planning motoru (FEAT-001) Phase 1.1 sprint'inde aktive edilecek. Çoklu
                araç rota dağıtımı, zaman penceresi ve kapasite kısıtları bu ekranda yarı otonom
                çalışacak.
              </MDTypography>
            </MDBox>
          </MDBox>
        </Card>
      </MDBox>
    </DashboardLayout>
  );
}

export default TourPlanningPlaceholder;
