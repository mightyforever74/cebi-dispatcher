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

import { useState, useEffect } from "react";

// react-router components
import { useLocation, Link } from "react-router-dom";

// @material-ui core components
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import Icon from "@mui/material/Icon";
import Divider from "@mui/material/Divider";

// Material Dashboard 2 PRO React TS components
import MDBox from "components/MDBox";
import MDInput from "components/MDInput";
import MDBadge from "components/MDBadge";
import MDTypography from "components/MDTypography";

// Material Dashboard 2 PRO React TS examples components
import Breadcrumbs from "examples/Breadcrumbs";
import NotificationItem from "examples/Items/NotificationItem";

// Custom styles for DashboardNavbar
import {
  navbar,
  navbarContainer,
  navbarRow,
  navbarIconButton,
  navbarDesktopMenu,
  navbarMobileMenu,
} from "examples/Navbars/DashboardNavbar/styles";

// Material Dashboard 2 PRO React context
import {
  useMaterialUIController,
  setTransparentNavbar,
  setMiniSidenav,
  setOpenConfigurator,
} from "context";

// Real API — GET/PUT /api/alerts (api.tulipfleet.com)
import { useAlerts, useResolveAlert, Alert } from "hooks/useAlerts";
import { useT } from "i18n";
import LanguageSwitcher from "components/LanguageSwitcher";

// Declaring prop types for DashboardNavbar
interface Props {
  absolute?: boolean;
  light?: boolean;
  isMini?: boolean;
}

// ── Alert type dictionary — kanıtlı, AdminAlerts.js ALERT_CONFIG_MAP ile
// birebir eşleşiyor (icon isimleri Ionicons'tan MUI Material Icons'a
// çevrildi, severity/renk eşlemesi aynı kaldı).
type Severity = "critical" | "warning" | "info";

const ALERT_CONFIG: Record<string, { severity: Severity; icon: string }> = {
  HARD_BRAKE: { severity: "critical", icon: "warning" },
  HARD_ACCEL: { severity: "warning", icon: "trending_up" },
  HARD_TURN: { severity: "warning", icon: "turn_right" },
  SHARP_TURN: { severity: "warning", icon: "turn_right" },
  IMPACT: { severity: "critical", icon: "car_crash" },
  OVERSPEED: { severity: "critical", icon: "speed" },
  speed: { severity: "critical", icon: "speed" },
  geofence: { severity: "warning", icon: "location_on" },
  geofence_entry: { severity: "info", icon: "location_on" },
  geofence_exit: { severity: "warning", icon: "location_off" },
  fuel: { severity: "info", icon: "local_gas_station" },
  maintenance: { severity: "warning", icon: "build" },
  battery: { severity: "critical", icon: "battery_alert" },
  idle: { severity: "info", icon: "schedule" },
  sos: { severity: "critical", icon: "sos" },
  default: { severity: "info", icon: "notifications" },
};

const SEVERITY_COLOR: Record<Severity, "error" | "warning" | "info"> = {
  critical: "error",
  warning: "warning",
  info: "info",
};

function getAlertConfig(type: string | undefined) {
  return ALERT_CONFIG[type || "default"] || ALERT_CONFIG.default;
}

function DashboardNavbar({ absolute, light, isMini }: Props): JSX.Element {
  const { t } = useT();
  const [navbarType, setNavbarType] = useState<
    "fixed" | "absolute" | "relative" | "static" | "sticky"
  >();
  const [controller, dispatch] = useMaterialUIController();
  const { miniSidenav, transparentNavbar, fixedNavbar, openConfigurator, darkMode } = controller;
  const [openMenu, setOpenMenu] = useState<any>(false);
  const route = useLocation().pathname.split("/").slice(1);

  useEffect(() => {
    // Setting the navbar type
    if (fixedNavbar) {
      setNavbarType("sticky");
    } else {
      setNavbarType("static");
    }

    // A function that sets the transparent state of the navbar.
    function handleTransparentNavbar() {
      setTransparentNavbar(dispatch, (fixedNavbar && window.scrollY === 0) || !fixedNavbar);
    }

    /** 
     The event listener that's calling the handleTransparentNavbar function when 
     scrolling the window.
    */
    window.addEventListener("scroll", handleTransparentNavbar);

    // Call the handleTransparentNavbar function to set the state with the initial value.
    handleTransparentNavbar();

    // Remove event listener on cleanup
    return () => window.removeEventListener("scroll", handleTransparentNavbar);
  }, [dispatch, fixedNavbar]);

  const handleMiniSidenav = () => setMiniSidenav(dispatch, !miniSidenav);
  const handleConfiguratorOpen = () => setOpenConfigurator(dispatch, !openConfigurator);
  const handleOpenMenu = (event: any) => setOpenMenu(event.currentTarget);
  const handleCloseMenu = () => setOpenMenu(false);

  // ── TulipFleet Hot Alert Station ────────────────────────────────────────
  // Gercek API'ye baglandi (2026-07-03, Faz 2): GET /api/alerts (api.tulipfleet.com,
  // dogrudan baglanti - CORS acik oldugu curl ile kanitlandi). Bu bir e-posta
  // kutusu DEGIL: sadece kritik operasyonel olaylarin (gercek backend verisi)
  // listesi. Tiklaninca (a) PUT /api/alerts/:id/resolve cagrilir (is_resolved=true)
  // ve (b) mailto: ile mail programi acilir (dispatcher kayit tutabilsin diye).
  const notificationEmail = "dispatcher@tulipfleet.nl";

  const { data: alertsData, isLoading: loadingAlerts } = useAlerts();
  const resolveMutation = useResolveAlert();

  const alerts: Alert[] = alertsData || [];
  const activeAlerts = alerts.filter((a: Alert) => !a.is_resolved).slice(0, 10);
  const unreadCount = activeAlerts.length;

  const buildMailto = (alert: Alert) => {
    const alertType = alert.alert_type || alert.type || t("navbar.alertFallback");
    const subject = alert.vehicle_plate
      ? t("navbar.alertWithPlate", { type: alertType, plate: alert.vehicle_plate })
      : alertType;
    const body = alert.description || alert.title || t("navbar.seeDispatcher");
    return `mailto:${notificationEmail}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  const handleAlertClick = (alert: Alert) => () => {
    resolveMutation.mutate({ id: alert.id });
  };

  // Render the notifications menu ("Hot Alert Station")
  const renderMenu = () => (
    <Menu
      anchorEl={openMenu}
      anchorReference={null}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      open={Boolean(openMenu)}
      onClose={handleCloseMenu}
      sx={{ mt: 2 }}
      PaperProps={{ sx: { width: 320, maxHeight: 420, overflow: "hidden" } }}
    >
      <MDBox px={2} pt={1.5} pb={1}>
        <MDTypography variant="button" fontWeight="bold" color="text">
          {t("navbar.hotAlert")}
        </MDTypography>
        <MDTypography variant="caption" color="text" display="block">
          {t("navbar.hotAlertHint")}
        </MDTypography>
      </MDBox>
      <Divider sx={{ my: 0.5 }} />

      <MDBox sx={{ maxHeight: 260, overflowY: "auto" }}>
        {loadingAlerts && (
          <MDBox px={2} py={2}>
            <MDTypography variant="caption" color="text">
              {t("navbar.loading")}
            </MDTypography>
          </MDBox>
        )}
        {!loadingAlerts && activeAlerts.length === 0 && (
          <MDBox px={2} py={2}>
            <MDTypography variant="caption" color="text">
              {t("navbar.noAlerts")}
            </MDTypography>
          </MDBox>
        )}
        {activeAlerts.map((alert: Alert) => {
          const config = getAlertConfig(alert.alert_type || alert.type);
          const fallbackType = alert.alert_type || alert.type || t("navbar.alertFallback");
          const label =
            alert.title ||
            (alert.vehicle_plate
              ? t("navbar.alertLabelWithPlate", { type: fallbackType, plate: alert.vehicle_plate })
              : fallbackType);
          return (
            <NotificationItem
              key={alert.id}
              icon={
                <Icon color={SEVERITY_COLOR[config.severity]} fontSize="small">
                  {config.icon}
                </Icon>
              }
              title={label}
              component="a"
              href={buildMailto(alert)}
              onClick={handleAlertClick(alert)}
            />
          );
        })}
      </MDBox>

      <Divider sx={{ my: 0.5 }} />
      <NotificationItem
        icon={
          <Icon color="info" fontSize="small">
            settings
          </Icon>
        }
        title={t("navbar.setupMailbox")}
        component={Link}
        to="/system/settings"
        onClick={handleCloseMenu}
      />
    </Menu>
  );

  // Styles for the navbar icons
  const iconsStyle = ({
    palette: { dark, white, text },
    functions: { rgba },
  }: {
    palette: any;
    functions: any;
  }) => ({
    color: () => {
      let colorValue = light || darkMode ? white.main : dark.main;

      if (transparentNavbar && !light) {
        colorValue = darkMode ? rgba(text.main, 0.6) : text.main;
      }

      return colorValue;
    },
  });

  return (
    <AppBar
      position={absolute ? "absolute" : navbarType}
      color="inherit"
      sx={(theme) => navbar(theme, { transparentNavbar, absolute, light, darkMode })}
    >
      <Toolbar sx={navbarContainer}>
        <MDBox color="inherit" mb={{ xs: 1, md: 0 }} sx={(theme) => navbarRow(theme, { isMini })}>
          <Breadcrumbs icon="home" title={route[route.length - 1]} route={route} light={light} />
          <IconButton sx={navbarDesktopMenu} onClick={handleMiniSidenav} size="small" disableRipple>
            <Icon fontSize="medium" sx={iconsStyle}>
              {miniSidenav ? "menu_open" : "menu"}
            </Icon>
          </IconButton>
        </MDBox>
        {isMini ? null : (
          <MDBox sx={(theme) => navbarRow(theme, { isMini })}>
            <MDBox pr={1}>
              <MDInput label={t("navbar.search")} />
            </MDBox>
            <MDBox color={light ? "white" : "inherit"}>
              <LanguageSwitcher variant="navbar" />
              <Link to="/authentication/sign-in/basic">
                <IconButton sx={navbarIconButton} size="small" disableRipple>
                  <Icon sx={iconsStyle}>account_circle</Icon>
                </IconButton>
              </Link>
              <IconButton
                size="small"
                disableRipple
                color="inherit"
                sx={navbarMobileMenu}
                onClick={handleMiniSidenav}
              >
                <Icon sx={iconsStyle} fontSize="medium">
                  {miniSidenav ? "menu_open" : "menu"}
                </Icon>
              </IconButton>
              <IconButton
                size="small"
                disableRipple
                color="inherit"
                sx={navbarIconButton}
                onClick={handleConfiguratorOpen}
              >
                <Icon sx={iconsStyle}>settings</Icon>
              </IconButton>
              <IconButton
                size="small"
                color="inherit"
                sx={navbarIconButton}
                onClick={handleOpenMenu}
              >
                <MDBadge badgeContent={unreadCount} color="error" size="xs" circular>
                  <Icon sx={iconsStyle}>notifications</Icon>
                </MDBadge>
              </IconButton>
              {renderMenu()}
            </MDBox>
          </MDBox>
        )}
      </Toolbar>
    </AppBar>
  );
}

// Declaring default props for DashboardNavbar
DashboardNavbar.defaultProps = {
  absolute: false,
  light: false,
  isMini: false,
};

export default DashboardNavbar;
