import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { useT } from "i18n";

function TourPlanningPlaceholder(): JSX.Element {
  const { t } = useT();
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
                {t("tourPlanning.title")}
              </MDTypography>
            </MDBox>
            <MDBox mt={1}>
              <MDTypography variant="body2" color="text">
                {t("tourPlanning.body")}
              </MDTypography>
            </MDBox>
          </MDBox>
        </Card>
      </MDBox>
    </DashboardLayout>
  );
}

export default TourPlanningPlaceholder;
