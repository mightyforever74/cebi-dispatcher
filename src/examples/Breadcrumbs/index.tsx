/**
=========================================================
* Material Dashboard 2 PRO React TS - v1.0.2
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-2-pro-react-ts
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { ReactNode } from "react";

// react-router-dom components
import { Link } from "react-router-dom";

// @mui material components
import { Breadcrumbs as MuiBreadcrumbs } from "@mui/material";
import Icon from "@mui/material/Icon";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

// Material Dashboard 2 PRO React TS components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useT, type TranslationKey } from "i18n";

// Declaring props types for the Breadcrumbs
interface Props {
  icon: ReactNode;
  title: string;
  route: string | string[];
  light?: boolean;
  [key: string]: any;
}

const SEGMENT_KEY: Record<string, TranslationKey> = {
  dashboards: "crumb.dashboards",
  "live-fleet-map": "nav.liveFleet",
  dispatcher: "crumb.dispatcher",
  tasks: "tasks.title",
  optimize: "crumb.optimize",
  exceptions: "nav.exceptions",
  optimization: "nav.aiOptimization",
  "tour-planning": "nav.smartRoute",
  "toll-analytics": "nav.costToll",
  drivers: "drivers.title",
  vehicles: "vehicles.title",
  system: "nav.system",
  settings: "nav.tenantSettings",
  subscription: "nav.subscription",
  "b2b-api": "crumb.b2bApi",
  admin: "nav.administration",
  supervisor: "nav.supervisor",
  "customer-detail": "crumb.customerDetail",
  authentication: "crumb.authentication",
  "forgot-password": "login.forgotPassword",
  "sign-in": "login.title",
  basic: "crumb.basic",
};

const SHORT_KEY: Record<string, TranslationKey> = {
  "live-fleet-map": "nav.short.liveFleet",
  tasks: "nav.short.tasks",
  exceptions: "nav.short.exceptions",
  drivers: "nav.short.drivers",
  vehicles: "nav.short.vehicles",
  optimize: "nav.short.optimize",
  settings: "nav.short.tenantSettings",
  subscription: "nav.short.subscription",
  supervisor: "nav.short.supervisor",
};

function Breadcrumbs({ icon, title, route, light }: Props): JSX.Element {
  const { t } = useT();
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down("sm"));
  const routes: string[] | any = route.slice(0, -1);
  const labelFor = (segment: string): string => {
    const key = SEGMENT_KEY[segment];
    return key ? t(key) : segment.replace(/-/g, " ");
  };
  const shortKey = SHORT_KEY[title];
  const pageTitle = compact && shortKey ? t(shortKey) : labelFor(title);

  return (
    <MDBox mr={{ xs: 0, xl: 8 }}>
      <MuiBreadcrumbs
        sx={{
          "& .MuiBreadcrumbs-separator": {
            color: ({ palette: { white, grey } }) => (light ? white.main : grey[600]),
          },
        }}
      >
        <Link to="/" aria-label={t("nav.home")}>
          <MDTypography
            component="span"
            variant="body2"
            color={light ? "white" : "dark"}
            opacity={light ? 0.8 : 0.5}
            sx={{ lineHeight: 0 }}
          >
            <Icon aria-hidden>{icon}</Icon>
          </MDTypography>
        </Link>
        {routes.map((el: string) => (
          <Link to={`/${el}`} key={el}>
            <MDTypography
              component="span"
              variant="button"
              fontWeight="regular"
              color={light ? "white" : "dark"}
              opacity={light ? 0.8 : 0.5}
            >
              {labelFor(el)}
            </MDTypography>
          </Link>
        ))}
        <MDTypography variant="button" fontWeight="regular" color={light ? "white" : "dark"}>
          {pageTitle}
        </MDTypography>
      </MuiBreadcrumbs>
        <MDTypography
          component="h1"
          fontWeight="bold"
          variant="h6"
          color={light ? "white" : "dark"}
          noWrap
          sx={{ fontSize: { xs: "1rem", sm: undefined } }}
        >
          {pageTitle}
        </MDTypography>
    </MDBox>
  );
}

// Declaring default props for Breadcrumbs
Breadcrumbs.defaultProps = {
  light: false,
};

export default Breadcrumbs;
